import { ContractError } from "../core/contracts.js";
import { summarizeLocalEndpointScope } from "../core/localEndpointPolicy.js";
import { assertAdapterPacketSafe } from "./adapterPackets.js";

const SUPPORTED_HTTP_ADAPTER_KINDS = new Set(["tts", "live2d", "subtitle"]);
const TEXT_RESPONSE = Symbol("http_adapter_text_response");
const INVALID_JSON_RESPONSE = Symbol("http_adapter_invalid_json_response");

const FORBIDDEN_RESPONSE_FIELDS = new Set([
  "world_command",
  "obs_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "memory_commit",
  "commit_memory",
  "relationship_commit",
  "relationship_update",
  "relationship_update_candidate",
  "candidate",
  "candidates",
  "selected_memory_ids",
  "canonical",
  "canonical_envelope",
  "action_type",
  "intent",
  "conversation_state",
  "tone",
  "emotion",
  "character_tag",
  "task_type",
  "relation_score",
  "endpoint",
  "endpoint_url",
  "url",
  "api_key",
  "apiKey",
  "api_token",
  "token",
  "secret",
  "authorization",
  "access_token",
  "refresh_token",
  "oauth_token",
  "password",
  "raw_payload",
  "raw_response_body",
  "raw_audio",
  "raw_audio_body",
  "audio_body",
  "raw_phoneme_debug",
  "dataset_path",
  "internal_model_path",
  "model_path",
]);

const UNSAFE_PUBLIC_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|canonical|canonical_envelope)\b|https?:\/\//iu;

export function createHttpPostAdapter({
  adapterKind,
  endpoint,
  apiKey = "",
  timeoutMs = 5000,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!SUPPORTED_HTTP_ADAPTER_KINDS.has(adapterKind)) {
    throw new ContractError("unsupported HTTP adapter kind", { adapterKind });
  }
  if (!endpoint) {
    throw new ContractError("HTTP adapter endpoint is required", { adapterKind });
  }
  if (typeof fetchImpl !== "function") {
    throw new ContractError("HTTP adapter requires fetch");
  }

  const endpointScope = summarizeLocalEndpointScope(endpoint);
  const safeTimeoutMs = clampInteger(timeoutMs, 100, 60_000, 5000);
  const safeApiKey = String(apiKey ?? "").trim();

  async function sendHttpAdapterPacket(packet) {
    assertAdapterPacketSafe(packet, `HTTP ${adapterKind} packet`);
    if (packet.adapter_kind !== adapterKind) {
      throw new ContractError("HTTP adapter received the wrong packet kind", {
        expected: adapterKind,
        actual: packet.adapter_kind,
      });
    }
    if (endpointScope.local_endpoint_allowed !== true) {
      return buildFailedHttpAdapterResult({
        adapterKind,
        status: 0,
        bridgeStatus: "local_endpoint_policy_blocked",
        errorKind: "local_endpoint_policy_blocked",
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), safeTimeoutMs);
    try {
      const headers = {
        "content-type": "application/json",
        accept: "application/json, text/plain;q=0.5",
      };
      if (safeApiKey) {
        headers.authorization = `Bearer ${safeApiKey}`;
        headers["x-api-key"] = safeApiKey;
      }

      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(packet),
        signal: controller.signal,
        redirect: "error",
      });

      if (!response.ok) {
        return buildFailedHttpAdapterResult({
          adapterKind,
          status: safeStatus(response.status),
          bridgeStatus: response.statusText || `http_${safeStatus(response.status)}`,
          errorKind: "http_status",
        });
      }

      const responseText = await response.text();
      const parsed = parseBridgeResponseBody(
        responseText,
        typeof response.headers?.get === "function" ? response.headers.get("content-type") : ""
      );
      if (parsed === INVALID_JSON_RESPONSE) {
        return buildFailedHttpAdapterResult({
          adapterKind,
          status: safeStatus(response.status),
          bridgeStatus: "invalid_json_response",
          errorKind: "invalid_json_response",
        });
      }

      assertNoForbiddenHttpAdapterResponseFields(parsed, `HTTP ${adapterKind} response`);
      const bridgeStatus = readBridgeStatus(parsed, response.statusText);
      const responseAccepted = isHttpAdapterResponseAccepted(parsed, bridgeStatus);
      const explicitOk = parsed && typeof parsed === "object" && parsed.ok === true;
      const responseSummary = summarizeHttpAdapterResponse({
        adapterKind,
        parsed,
        ok: responseAccepted,
        status: safeStatus(response.status),
        statusText: response.statusText,
      });
      const accepted =
        responseAccepted &&
        (explicitOk ||
          responseSummary.artifact_kind !== "" ||
          responseSummary.artifact_url !== "" ||
          isAcceptedBridgeStatus(responseSummary.bridge_status) ||
          parsed === null ||
          parsed === TEXT_RESPONSE);

      return {
        sent: accepted,
        adapter: `http_${adapterKind}`,
        adapter_kind: adapterKind,
        status: safeStatus(response.status),
        response: accepted ? sanitizeHttpAdapterResponse(parsed) : null,
        response_summary: accepted
          ? responseSummary
          : {
              ...responseSummary,
              ok: false,
              error_kind: responseSummary.error_kind || "artifact_unavailable",
              response_omitted: true,
            },
      };
    } catch (error) {
      if (error instanceof ContractError) throw error;
      const errorKind = classifyRequestError(error);
      return buildFailedHttpAdapterResult({
        adapterKind,
        status: 0,
        bridgeStatus: errorKind,
        errorKind,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  sendHttpAdapterPacket.adapterKind = `http_${adapterKind}`;
  return sendHttpAdapterPacket;
}

function buildFailedHttpAdapterResult({ adapterKind, status, bridgeStatus, errorKind }) {
  return {
    sent: false,
    adapter: `http_${adapterKind}`,
    adapter_kind: adapterKind,
    status: safeStatus(status),
    response: null,
    response_summary: {
      status: safeStatus(status),
      ok: false,
      response_kind: "omitted",
      response_omitted: true,
      error_kind: safeErrorKind(errorKind),
      request_id: "",
      request_id_present: false,
      bridge_status: safePublicResponseText(bridgeStatus, "bridge_status_omitted"),
      artifact_url: "",
      artifact_kind: "",
      manifest_id: "",
      manifest_id_present: false,
      event_id: "",
      event_id_present: false,
      duration_ms: null,
      sample_rate_hz: null,
      viseme_count: 0,
    },
  };
}

function parseBridgeResponseBody(text, contentType = "") {
  const raw = String(text ?? "");
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return String(contentType ?? "").toLowerCase().includes("json")
      ? INVALID_JSON_RESPONSE
      : TEXT_RESPONSE;
  }
}

function summarizeHttpAdapterResponse({ adapterKind, parsed, ok, status, statusText }) {
  const responseKind =
    ok === false ? "omitted" : parsed === null ? "empty" : parsed === TEXT_RESPONSE ? "text" : "json";
  const artifactSource = parsed && typeof parsed === "object" ? parsed : {};
  const bridgeStatus = ok === false ? statusText : readBridgeStatus(parsed, statusText);
  const artifactUrl = safeArtifactReference(
    firstDefined(
      artifactSource.artifact_url,
      artifactSource.artifactUrl,
      artifactSource.audio_url,
      artifactSource.audioUrl,
      artifactSource.speech_url,
      artifactSource.speechUrl,
      artifactSource.file_url,
      artifactSource.fileUrl,
      artifactSource.output_url,
      artifactSource.outputUrl,
      artifactSource.subtitle_url,
      artifactSource.subtitleUrl,
      artifactSource.vtt_url,
      artifactSource.vttUrl,
      artifactSource.cue_url,
      artifactSource.cueUrl,
      artifactSource.live2d_cue_url,
      artifactSource.live2dCueUrl,
      artifactSource.artifact?.url,
      artifactSource.artifact?.artifact_url,
      artifactSource.audio?.url,
      artifactSource.audio?.artifact_url,
      artifactSource.subtitle?.url,
      artifactSource.cue?.url,
      artifactSource.live2d_cue?.url
    )
  );
  const explicitArtifactKind = safePublicResponseText(
    firstDefined(
      artifactSource.artifact_kind,
      artifactSource.artifactKind,
      artifactSource.kind,
      artifactSource.type,
      artifactSource.artifact?.kind,
      artifactSource.audio?.kind,
      artifactSource.subtitle?.kind,
      artifactSource.cue?.kind,
      artifactSource.live2d_cue?.kind
    ),
    ""
  );
  const artifactKind =
    canonicalHttpAdapterArtifactKind(adapterKind, explicitArtifactKind) ||
    inferArtifactKindFromUrl(adapterKind, artifactUrl) ||
    inferInlineArtifactKind(adapterKind, artifactSource);

  return {
    status: safeStatus(status),
    ok,
    response_kind: responseKind,
    response_omitted: responseKind !== "json" && responseKind !== "empty",
    error_kind: ok ? null : "request_error",
    request_id: safePublicResponseText(
      firstDefined(artifactSource.request_id, artifactSource.requestId, artifactSource.id),
      ""
    ),
    request_id_present:
      safePublicResponseText(
        firstDefined(artifactSource.request_id, artifactSource.requestId, artifactSource.id),
        ""
      ) !== "",
    bridge_status: safePublicResponseText(bridgeStatus, "bridge_status_omitted"),
    artifact_url: artifactUrl,
    artifact_kind: artifactKind,
    manifest_id: safePublicResponseText(
      firstDefined(artifactSource.manifest_id, artifactSource.manifestId),
      ""
    ),
    manifest_id_present:
      safePublicResponseText(firstDefined(artifactSource.manifest_id, artifactSource.manifestId), "") !== "",
    event_id: safePublicResponseText(firstDefined(artifactSource.event_id, artifactSource.eventId), ""),
    event_id_present:
      safePublicResponseText(firstDefined(artifactSource.event_id, artifactSource.eventId), "") !== "",
    duration_ms: safeDurationMs(artifactSource.duration_ms, artifactSource.duration_seconds),
    sample_rate_hz: safeOptionalNumber(
      firstDefined(artifactSource.sample_rate_hz, artifactSource.sampleRateHz, artifactSource.sample_rate)
    ),
    viseme_count: countVisemes(artifactSource),
  };
}

function sanitizeHttpAdapterResponse(value, depth = 0) {
  if (value === TEXT_RESPONSE) return { response_kind: "text", omitted: true };
  if (value === null || value === undefined) return { response_kind: "empty", omitted: false };
  if (depth > 8) return "[redacted]";
  if (typeof value === "string") return safePublicResponseText(value, "[redacted]", 500);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeHttpAdapterResponse(item, depth + 1));
  if (typeof value !== "object") return "[redacted]";

  const output = {};
  for (const [field, child] of Object.entries(value)) {
    if (isForbiddenResponseField(field) && !isAllowedArtifactResponseUrlField(field)) continue;
    output[field] = sanitizeHttpAdapterResponse(child, depth + 1);
  }
  return output;
}

function assertNoForbiddenHttpAdapterResponseFields(value, context, path = "root") {
  if (value === null || value === undefined || value === TEXT_RESPONSE) return;
  if (typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenHttpAdapterResponseFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (isForbiddenResponseField(field) && !isAllowedArtifactResponseUrlField(field)) {
      throw new ContractError(
        `${context}: response must not echo candidates, commands, commits, or canonical fields`,
        { field, path }
      );
    }
    if (field === "schema" && child === "iris_adapter_packet_v1") {
      throw new ContractError(`${context}: response must not echo runtime schemas`, { path });
    }
    assertNoForbiddenHttpAdapterResponseFields(child, context, `${path}.${field}`);
  }
}

function isForbiddenResponseField(field) {
  const normalized = String(field ?? "").trim();
  const lower = normalized.toLowerCase();
  const snake = lower.replace(/[\s-]+/gu, "_");
  const compact = snake.replace(/_/gu, "");
  for (const forbidden of FORBIDDEN_RESPONSE_FIELDS) {
    const item = forbidden.toLowerCase();
    if (lower === item || snake === item || compact === item.replace(/_/gu, "")) return true;
  }
  return false;
}

function isAllowedArtifactResponseUrlField(field) {
  return field === "artifact_url" || field === "artifactUrl" || field === "audio_url";
}

function readBridgeStatus(parsed, fallback = "") {
  if (!parsed || typeof parsed !== "object" || parsed === TEXT_RESPONSE) return fallback || "accepted";
  return firstDefined(parsed.bridge_status, parsed.bridgeStatus, parsed.status, parsed.state, fallback, "accepted");
}

function isHttpAdapterResponseAccepted(parsed, bridgeStatus) {
  if (parsed && typeof parsed === "object" && parsed.ok === false) return false;
  if (parsed && typeof parsed === "object" && parsed.error) return false;
  if (parsed && typeof parsed === "object" && parsed.ok === true) return true;
  return isAcceptedBridgeStatus(bridgeStatus) || parsed === TEXT_RESPONSE || parsed === null;
}

function isAcceptedBridgeStatus(bridgeStatus) {
  const normalized = String(bridgeStatus ?? "").trim().toLowerCase();
  return [
    "",
    "ok",
    "accepted",
    "queued",
    "enqueued",
    "job_queued",
    "displayed",
    "rendered",
    "sent",
    "completed",
    "dry_run",
    "mock_audio",
    "dry_run_audio",
    "dry_run_live2d_cue",
  ].includes(normalized);
}

function canonicalHttpAdapterArtifactKind(adapterKind, artifactKind) {
  const normalized = String(artifactKind ?? "").trim().toLowerCase();
  if (!normalized) return "";
  if (adapterKind === "tts" && ["audio", "mock_audio", "dry_run_audio", "wav", "mp3"].includes(normalized)) {
    return normalized === "audio" || normalized === "wav" || normalized === "mp3" ? "audio" : normalized;
  }
  if (adapterKind === "subtitle" && ["subtitle", "subtitle_vtt", "vtt", "srt", "subtitle_segments"].includes(normalized)) {
    return normalized === "subtitle" || normalized === "vtt" || normalized === "srt" ? "subtitle" : normalized;
  }
  if (adapterKind === "live2d" && ["live2d_cue", "live2d_cue_json", "cue", "renderer_cue"].includes(normalized)) {
    return normalized === "cue" || normalized === "renderer_cue" ? "live2d_cue" : normalized;
  }
  return safePublicResponseText(normalized, "");
}

function inferArtifactKindFromUrl(adapterKind, artifactUrl) {
  const text = String(artifactUrl ?? "").toLowerCase();
  if (!text) return "";
  if (adapterKind === "tts" && /\.(?:wav|mp3|ogg|m4a)(?:$|[?#])/u.test(text)) return "audio";
  if (adapterKind === "subtitle" && /\.(?:vtt|srt|json)(?:$|[?#])/u.test(text)) return "subtitle";
  if (adapterKind === "live2d" && /\.(?:json)(?:$|[?#])/u.test(text)) return "live2d_cue";
  return "";
}

function inferInlineArtifactKind(adapterKind, source) {
  if (!source || typeof source !== "object") return "";
  if (adapterKind === "tts" && (Array.isArray(source.visemes) || Array.isArray(source.mouth_cues))) return "audio";
  if (adapterKind === "subtitle" && (Array.isArray(source.subtitle_segments) || source.subtitle_text)) return "subtitle_segments";
  if (adapterKind === "live2d" && (source.live2d_cue || source.cue || source.motion)) return "live2d_cue";
  return "";
}

function safeArtifactReference(value) {
  const text = safeText(value, 500);
  if (!text) return "";
  if (text.startsWith("artifact://")) return text;
  if (isAllowedLocalArtifactUrl(text)) return text;
  if (/^[a-z0-9_-]+\/[a-z0-9_.-]+$/iu.test(text)) return `artifact://${text}`;
  if (/^\/event-render-manifests\/[a-z0-9_./?=&-]+$/iu.test(text)) return text;
  return "";
}

function isAllowedLocalArtifactUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^\[|\]$/gu, "").toLowerCase();
    return (
      ["http:", "https:"].includes(url.protocol) &&
      (hostname === "localhost" || hostname === "::1" || hostname.startsWith("127."))
    );
  } catch {
    return false;
  }
}

function countVisemes(source) {
  if (!source || typeof source !== "object") return 0;
  for (const field of ["visemes", "mouth_cues", "mouthCues", "lip_sync_cues", "lipSyncCues"]) {
    if (Array.isArray(source[field])) return source[field].length;
  }
  return 0;
}

function safePublicResponseText(value, fallback, maxLength = 160) {
  const text = safeText(value, maxLength);
  if (!text) return fallback;
  return UNSAFE_PUBLIC_TEXT_PATTERN.test(text) ? fallback : text;
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, maxLength);
}

function safeOptionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(4)) : null;
}

function safeDurationMs(msValue, secondsValue) {
  const milliseconds = safeOptionalNumber(msValue);
  if (milliseconds !== null) return milliseconds;
  const seconds = safeOptionalNumber(secondsValue);
  return seconds === null ? null : Number((seconds * 1000).toFixed(4));
}

function classifyRequestError(error) {
  return error?.name === "AbortError" ? "timeout" : "network_failure";
}

function safeErrorKind(value) {
  const kind = String(value ?? "");
  if (
    [
      "http_status",
      "timeout",
      "network_failure",
      "request_error",
      "invalid_json_response",
      "local_endpoint_policy_blocked",
    ].includes(kind)
  ) {
    return kind;
  }
  return "request_error";
}

function safeStatus(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 599 ? number : 0;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}
