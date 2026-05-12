import { ContractError } from "../../core/contracts.js";
import {
  summarizeLocalEndpointPolicyStatus,
  summarizeLocalEndpointScope,
} from "../../core/localEndpointPolicy.js";
import { normalizeMediaWatchObservation } from "./mediaWatchAdapter.js";

const FORBIDDEN_MEDIA_BRIDGE_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "canonical",
  "canonical_envelope",
  "intent",
  "conversation_state",
  "action_type",
  "tone",
  "emotion",
  "character_tag",
  "task_type",
  "relation_score",
  "raw_video",
  "raw_audio",
  "video_base64",
  "audio_base64",
  "video_frame_pixels",
  "subtitle_text",
  "subtitles",
  "caption_text",
  "captions",
  "transcript",
  "transcript_text",
  "raw_transcript",
  "dialogue_text",
  "lyrics",
]);

export function createHttpMediaWatchSource({
  endpoint,
  apiKey = "",
  timeoutMs = 5000,
  nowMs = () => Date.now(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!endpoint) {
    throw new ContractError("HTTP media watch endpoint is required");
  }
  if (typeof fetchImpl !== "function") {
    throw new ContractError("HTTP media watch source requires fetch");
  }
  const safeTimeoutMs = clampInteger(timeoutMs, 100, 60_000, 5000);
  const endpointScopeSummary = summarizeLocalEndpointScope(endpoint);
  const localEndpointPolicyStatus = summarizeLocalEndpointPolicyStatus(endpointScopeSummary);

  const bufferedObservations = [];
  const status = {
    source_kind: "http_media_watch_source",
    local_endpoint_policy: "loopback_or_private_network_only",
    local_endpoint_policy_status: localEndpointPolicyStatus,
    bridge_endpoint_scope: endpointScopeSummary.endpoint_scope,
    bridge_endpoint_locality_ok: endpointScopeSummary.local_endpoint_allowed,
    request_count: 0,
    last_item_count: 0,
    last_error: null,
    last_error_at_ms: null,
  };

  async function next() {
    if (bufferedObservations.length > 0) {
      return normalizeMediaWatchObservation(bufferedObservations.shift());
    }

    const observations = await fetchMediaWatchBatch({
      endpoint,
      apiKey,
      timeoutMs: safeTimeoutMs,
      nowMs,
      fetchImpl,
      status,
    });
    bufferedObservations.push(...observations);
    if (bufferedObservations.length === 0) return null;
    return normalizeMediaWatchObservation(bufferedObservations.shift());
  }

  return {
    source_kind: "http_media_watch_source",
    next,
    async nextBatch(limit = 10) {
      const safeLimit = clampInteger(limit, 1, 50, 10);
      const events = [];
      while (events.length < safeLimit && bufferedObservations.length > 0) {
        events.push(normalizeMediaWatchObservation(bufferedObservations.shift()));
      }
      if (events.length >= safeLimit) return events;
      const observations = await fetchMediaWatchBatch({
        endpoint,
        apiKey,
        timeoutMs: safeTimeoutMs,
        nowMs,
        fetchImpl,
        status,
      });
      bufferedObservations.push(...observations);
      while (events.length < safeLimit && bufferedObservations.length > 0) {
        events.push(normalizeMediaWatchObservation(bufferedObservations.shift()));
      }
      return events;
    },
    status() {
      return createPublicStatus(status);
    },
  };
}

function createPublicStatus(status) {
  return {
    schema: "iris_http_media_watch_source_status_v1",
    source_kind: status.source_kind,
    local_endpoint_policy: status.local_endpoint_policy,
    local_endpoint_policy_status: status.local_endpoint_policy_status,
    bridge_endpoint_scope: status.bridge_endpoint_scope,
    bridge_endpoint_locality_ok: status.bridge_endpoint_locality_ok,
    request_count: status.request_count,
    last_item_count: status.last_item_count,
    last_error: status.last_error,
    last_error_at_ms: status.last_error_at_ms,
    boundary_policy: {
      counts_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_payloads: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
}

async function fetchMediaWatchBatch({ endpoint, apiKey, timeoutMs, nowMs, fetchImpl, status }) {
  const endpointScopeSummary = summarizeLocalEndpointScope(endpoint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    status.request_count += 1;
    status.local_endpoint_policy_status =
      summarizeLocalEndpointPolicyStatus(endpointScopeSummary);
    status.bridge_endpoint_scope = endpointScopeSummary.endpoint_scope;
    status.bridge_endpoint_locality_ok = endpointScopeSummary.local_endpoint_allowed;
    if (!endpointScopeSummary.local_endpoint_allowed) {
      throw new ContractError("HTTP media watch source endpoint must be local", {
        error_kind: "local_endpoint_policy_blocked",
        endpoint_scope: endpointScopeSummary.endpoint_scope,
        retryable: false,
        operator_action_required: true,
      });
    }
    const response = await fetchImpl(endpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      signal: controller.signal,
    });
    if (response.status === 204) {
      markMediaWatchSuccess(status, 0);
      return [];
    }
    if (!response.ok) {
      throw new ContractError("HTTP media watch source request failed", {
        status: response.status,
        response_kind: "omitted",
        error_kind: "http_status",
      });
    }
    const responseText = await response.text();
    const parsed = parseJsonResponse(responseText);
    assertReadOnlyMediaBridgePayload(parsed, "HTTP media watch response");
    assertMediaWatchBridgeAccepted(parsed);
    const observations = extractMediaWatchObservations(parsed).map(toMediaWatchInput);
    markMediaWatchSuccess(status, observations.length);
    return observations;
  } catch (error) {
    markMediaWatchFailure(status, classifyMediaWatchSourceError(error), nowMs);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function assertMediaWatchBridgeAccepted(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
  const bridgeStatus = safeText(
    parsed.bridge_status ?? parsed.bridgeStatus ?? parsed.status ?? parsed.state ?? "",
    80
  )
    .toLowerCase()
    .replace(/[\s-]+/gu, "_");
  if (
    parsed.ok === false ||
    parsed.success === false ||
    parsed.accepted === false ||
    ["failed", "rejected", "error", "target_failed", "target_unreachable"].includes(
      bridgeStatus
    )
  ) {
    throw new ContractError("HTTP media watch bridge returned failure", {
      status: 200,
      response_kind: "omitted",
      error_kind: "http_status",
    });
  }
}

function markMediaWatchSuccess(status, count) {
  status.last_item_count = count;
  status.last_error = null;
  status.last_error_at_ms = null;
}

function markMediaWatchFailure(status, errorKind, nowMs) {
  status.last_item_count = 0;
  status.last_error = errorKind;
  status.last_error_at_ms = safeTimestamp(nowMs);
}

function classifyMediaWatchSourceError(error) {
  if (error?.name === "AbortError") return "http_media_watch_timeout";
  if (error instanceof ContractError) {
    if (error.details?.error_kind === "local_endpoint_policy_blocked") {
      return "local_endpoint_policy_blocked";
    }
    if (typeof error.details?.status === "number") return "http_media_watch_http_status";
    if (String(error.message ?? "").includes("requires JSON")) {
      return "http_media_watch_invalid_json";
    }
    if (
      String(error.message ?? "").includes("read-only") ||
      String(error.message ?? "").includes("rights-safe")
    ) {
      return "http_media_watch_unsafe_payload";
    }
    return "http_media_watch_contract_error";
  }
  return "http_media_watch_request_error";
}

function safeTimestamp(nowMs) {
  const value = typeof nowMs === "function" ? Number(nowMs()) : Date.now();
  if (!Number.isFinite(value)) return Date.now();
  return Math.trunc(value);
}

function parseJsonResponse(text) {
  const raw = String(text ?? "");
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new ContractError("HTTP media watch source requires JSON response");
  }
}

function extractMediaWatchObservations(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.observations)) return parsed.observations;
  if (Array.isArray(parsed.media_watch_observations)) return parsed.media_watch_observations;
  if (parsed.observation && typeof parsed.observation === "object") return [parsed.observation];
  if (parsed.media_watch_observation && typeof parsed.media_watch_observation === "object") {
    return [parsed.media_watch_observation];
  }
  return [parsed];
}

function toMediaWatchInput(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ContractError("HTTP media watch item must be an object");
  }
  const observation = {
    trace_id: safeOptionalText(raw.trace_id),
    event_id: safeOptionalText(raw.event_id ?? raw.platform_event_id ?? raw.id),
    timestamp_ms: raw.timestamp_ms,
    media_kind: safeText(raw.media_kind ?? raw.kind ?? "unknown_media", 80),
    media_title: safeText(raw.media_title ?? raw.title ?? "unknown_title", 180),
    creator_or_channel: safeText(
      raw.creator_or_channel ?? raw.channel ?? raw.creator ?? "unknown_creator",
      160
    ),
    platform: safeText(raw.platform ?? "unknown_platform", 80),
    observation_summary: safeText(
      raw.observation_summary ?? raw.summary ?? raw.text ?? "Media is visible.",
      500
    ),
    detected_mood: safeText(raw.detected_mood ?? raw.mood ?? "neutral", 80),
    confidence: raw.confidence ?? 0.5,
    rights_risk_note: safeText(raw.rights_risk_note ?? raw.rights_note ?? "unknown", 220),
  };
  if (!observation.trace_id) delete observation.trace_id;
  if (!observation.event_id) delete observation.event_id;
  if (observation.timestamp_ms === undefined || observation.timestamp_ms === null) {
    delete observation.timestamp_ms;
  }
  return observation;
}

function safeOptionalText(value) {
  if (value === undefined || value === null || value === "") return "";
  return safeText(value, 160);
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function assertReadOnlyMediaBridgePayload(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertReadOnlyMediaBridgePayload(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_MEDIA_BRIDGE_FIELDS.has(field)) {
      throw new ContractError(`${context}: media bridge must be read-only and rights-safe`, {
        field,
        path,
      });
    }
    assertReadOnlyMediaBridgePayload(child, context, `${path}.${field}`);
  }
}
