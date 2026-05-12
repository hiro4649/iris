import { createServer } from "node:http";
import { ContractError } from "../core/contracts.js";
import {
  summarizeLocalEndpointPolicyStatus,
  summarizeLocalEndpointScope,
} from "../core/localEndpointPolicy.js";

const REQUEST_SCHEMA = "iris_local_tts_engine_request_v1";
const SERVICE_SCHEMA = "iris_voicevox_tts_engine_bridge_health_v1";
const MAX_REQUEST_BYTES = 128_000;
const MAX_TTS_TEXT_LENGTH = 4000;
const MAX_AUDIO_BYTES = 50_000_000;

const SAFE_ERROR_KINDS = new Set([
  "auth_required",
  "invalid_json",
  "request_body_too_large",
  "unsafe_payload",
  "contract_error",
  "bridge_not_ready",
  "engine_request_failed",
  "engine_timeout",
  "engine_invalid_response",
  "local_endpoint_policy_blocked",
  "tts_bridge_error",
]);

const FORBIDDEN_PUBLIC_FIELDS = new Set([
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
  "final_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
  "endpoint",
  "url",
  "audio_url",
  "artifact_url",
  "authorization",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
]);

const FORBIDDEN_REQUEST_FIELDS = new Set(
  [...FORBIDDEN_PUBLIC_FIELDS].filter((field) => field !== "text")
);

export function createVoicevoxTtsEngineBridgeServer({
  voicevoxEndpoint = "http://127.0.0.1:50021",
  speakerId = "3",
  timeoutMs = 10_000,
  apiKey = "",
  allowLocalPreviewFallback = true,
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) {
  const config = normalizeBridgeConfig({
    voicevoxEndpoint,
    speakerId,
    timeoutMs,
    apiKey,
    allowLocalPreviewFallback,
    fetchImpl,
  });

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      if (request.method === "GET" && url.pathname === "/health") {
        const healthCheck = await probeVoicevoxTarget(config);
        const health = createVoicevoxTtsEngineBridgeHealth({ ...config, healthCheck });
        return sendJson(response, health.ok ? 200 : 503, health);
      }
      if (request.method === "POST" && url.pathname === "/tts-engine") {
        if (!isAuthorizedRequest(request, config.apiKey)) {
          throw bridgeError("auth_required", 401);
        }
        const payload = await readJson(request);
        const ttsRequest = normalizeTtsEngineRequest(payload);
        const engineResponse = await synthesizeWithVoicevox(ttsRequest, config);
        return sendJson(response, 200, engineResponse);
      }
      return sendJson(response, 404, createSafeErrorResponse("tts_bridge_error"));
    } catch (error) {
      const errorKind = classifyBridgeError(error);
      const statusCode = statusCodeForBridgeError(error, errorKind);
      if (statusCode >= 500) logger.error?.(new Error(`voicevox bridge ${errorKind}`));
      return sendJson(response, statusCode, createSafeErrorResponse(errorKind));
    }
  });
}

export function createVoicevoxTtsEngineBridgeHealth(configInput = {}) {
  const config = normalizeBridgeConfig(configInput);
  const healthCheck = normalizeHealthCheck(configInput.healthCheck);
  const targetHealthy = healthCheck.performed
    ? healthCheck.reachable || config.allowLocalPreviewFallback === true
    : true;
  const ok = config.ready && targetHealthy;
  const health = {
    ok,
    schema: SERVICE_SCHEMA,
    service: "voicevox_tts_engine_bridge",
    bridge_status: ok ? "ready" : "attention",
    configured: {
      engine_target: config.voicevoxEndpoint !== "",
      speaker: config.speakerId !== "",
      auth: config.apiKey !== "",
      timeout_ms: config.timeoutMs,
      engine_health_checked: healthCheck.performed,
      engine_health_reachable: healthCheck.performed ? healthCheck.reachable : null,
      local_preview_fallback: config.allowLocalPreviewFallback === true,
    },
    local_endpoint_policy: "loopback_or_private_network_only",
    local_endpoint_policy_status: config.localEndpointPolicyStatus,
    engine_endpoint_scope: config.engineEndpointScope.endpoint_scope,
    engine_endpoint_locality_ok: config.engineEndpointScope.local_endpoint_allowed,
    supported_request_schemas: [REQUEST_SCHEMA],
    supported_response_fields: [
      "audio_base64",
      "audio_bytes_available",
      "audio_mime",
      "duration_ms",
      "sample_rate_hz",
      "visemes",
      "bridge_status",
    ],
    supported_audio_mimes: ["audio/wav"],
    voice_control: {
      speech_rate_forwarded: true,
      conservative_speed_clamp: true,
      speech_rate_label_supported: true,
      prosody_style_mapping: true,
      pitch_volume_forwarded: true,
      laughter_and_scream_expression_mapping: true,
      configured_speaker_only: true,
    },
    boundary_policy: {
      no_endpoint_values: true,
      no_secret_values: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      internal_engine_payload_only: true,
    },
    adapter_validation_required: true,
  };
  assertVoicevoxBridgePublicSafe(health, "VOICEVOX bridge health");
  return health;
}

export function assertVoicevoxBridgePublicSafe(value, context = "VOICEVOX bridge public object") {
  assertNoForbiddenFields(value, context, "root", FORBIDDEN_PUBLIC_FIELDS);
}

async function synthesizeWithVoicevox(request, config) {
  if (!config.ready) {
    if (config.localEndpointPolicyStatus === "blocked") {
      throw bridgeError("local_endpoint_policy_blocked", 400);
    }
    throw bridgeError("bridge_not_ready", 503);
  }
  if (typeof config.fetchImpl !== "function") {
    throw bridgeError("bridge_not_ready", 503);
  }

  if (!request.text) {
    const durationMs = clampInteger(request.estimated_duration_ms ?? 300, 100, 2000, 300);
    const audioBytes = createPreviewSpeechWav({ durationMs, sampleRate: 48000 });
    const response = {
      audio_base64: audioBytes.toString("base64"),
      audio_bytes_available: audioBytes.length > 0,
      audio_mime: "audio/wav",
      duration_ms: durationMs,
      sample_rate_hz: 48000,
      visemes: [],
      bridge_status: "rendered_silence",
    };
    assertVoicevoxEngineResponseSafe(response, "VOICEVOX bridge engine response");
    return response;
  }

  const speaker = resolveSpeaker(request, config);
  const queryUrl = buildVoicevoxUrl(config.voicevoxEndpoint, "/audio_query", {
    speaker,
    text: request.text,
  });
  let synthesisQuery = null;
  let audioBytes = null;
  let durationMs = safeOptionalNumber(request.estimated_duration_ms);
  try {
    const query = await fetchVoicevoxJson(queryUrl, {
      method: "POST",
      apiKey: config.apiKey,
      timeoutMs: config.timeoutMs,
      fetchImpl: config.fetchImpl,
    });
    synthesisQuery = prepareSynthesisQuery(query, request);
    const synthesisUrl = buildVoicevoxUrl(config.voicevoxEndpoint, "/synthesis", {
      speaker,
    });
    audioBytes = await fetchVoicevoxBytes(synthesisUrl, {
      method: "POST",
      body: JSON.stringify(synthesisQuery),
      headers: { "content-type": "application/json" },
      apiKey: config.apiKey,
      timeoutMs: config.timeoutMs,
      fetchImpl: config.fetchImpl,
    });
  } catch (error) {
    if (config.allowLocalPreviewFallback !== true) throw error;
    durationMs = clampInteger(request.estimated_duration_ms ?? 1200, 300, 10_000, 1200);
    audioBytes = createPreviewSpeechWav({ durationMs, sampleRate: 48000 });
    synthesisQuery = { outputSamplingRate: 48000 };
  }
  if (audioBytes.length < 12 || audioBytes.length > MAX_AUDIO_BYTES) {
    throw bridgeError("engine_invalid_response", 502);
  }

  const response = {
    audio_base64: audioBytes.toString("base64"),
    audio_bytes_available: audioBytes.length > 0,
    audio_mime: "audio/wav",
    duration_ms: durationMs,
    sample_rate_hz: safeOptionalNumber(synthesisQuery.outputSamplingRate),
    visemes: [],
    bridge_status: "rendered",
  };
  assertVoicevoxEngineResponseSafe(response, "VOICEVOX bridge engine response");
  return response;
}

async function probeVoicevoxTarget(config) {
  if (!config.ready || typeof config.fetchImpl !== "function") {
    return { performed: true, reachable: false };
  }
  if (config.localEndpointPolicyStatus !== "all_allowed") {
    return { performed: true, reachable: false };
  }
  try {
    const versionUrl = buildVoicevoxUrl(config.voicevoxEndpoint, "/version", {});
    const response = await fetchWithTimeout(versionUrl, {
      method: "GET",
      apiKey: config.apiKey,
      timeoutMs: Math.min(config.timeoutMs, 1500),
      fetchImpl: config.fetchImpl,
    });
    return { performed: true, reachable: response?.ok === true };
  } catch {
    return { performed: true, reachable: false };
  }
}

function normalizeTtsEngineRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ContractError("VOICEVOX bridge request: object is required");
  }
  assertNoForbiddenFields(payload, "VOICEVOX bridge request", "root", FORBIDDEN_REQUEST_FIELDS);
  if (payload.schema !== REQUEST_SCHEMA) {
    throw new ContractError("VOICEVOX bridge request: invalid schema");
  }
  const text = String(
    payload.text ??
      payload.speech_text ??
      payload.speechText ??
      payload.script_text ??
      payload.scriptText ??
      payload.utterance_text ??
      payload.utteranceText ??
      payload.line_text ??
      payload.lineText ??
      ""
  ).trim();
  if (text.length > MAX_TTS_TEXT_LENGTH) {
    throw new ContractError("VOICEVOX bridge request: invalid speech payload");
  }
  return {
    schema: REQUEST_SCHEMA,
    job_id: safeText(payload.job_id, 160),
    event_id: safeText(payload.event_id, 160),
    text,
    language: safeText(payload.language, 32),
    script_direction: safeText(payload.script_direction, 16),
    prosody_style: safeText(payload.prosody_style, 80),
    speech_rate: normalizeSpeechRate(payload.speech_rate, payload.prosody_style),
    estimated_duration_ms: safeOptionalNumber(payload.estimated_duration_ms),
    mouth_timing: Array.isArray(payload.mouth_timing) ? payload.mouth_timing.slice(0, 120) : [],
    voice_expression:
      payload.voice_expression && typeof payload.voice_expression === "object"
        ? payload.voice_expression
        : {},
    engine_preferences:
      payload.engine_preferences && typeof payload.engine_preferences === "object"
        ? payload.engine_preferences
        : {},
  };
}

function resolveSpeaker(request, config) {
  const requestedVoice = safeText(
    request.engine_preferences?.voice_id ??
      request.engine_preferences?.voiceId ??
      request.engine_preferences?.speaker_id ??
      request.engine_preferences?.speakerId ??
      request.engine_preferences?.voicevox_speaker_id ??
      request.engine_preferences?.voicevoxSpeakerId,
    40
  );
  if (/^\d+$/.test(requestedVoice)) return requestedVoice;
  return config.speakerId;
}

function prepareSynthesisQuery(query, request) {
  if (!query || typeof query !== "object" || Array.isArray(query)) {
    throw bridgeError("engine_invalid_response", 502);
  }
  const safeQuery = structuredClone(query);
  const controls = resolveVoicevoxProsodyControls(request, safeQuery);
  safeQuery.speedScale = controls.speedScale;
  safeQuery.intonationScale = controls.intonationScale;
  safeQuery.pitchScale = controls.pitchScale;
  safeQuery.volumeScale = controls.volumeScale;
  safeQuery.prePhonemeLength = controls.prePhonemeLength;
  safeQuery.postPhonemeLength = controls.postPhonemeLength;
  return safeQuery;
}

function normalizeSpeechRate(value, prosodyStyle = "") {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return clampNumber(numeric, 0.55, 1.75, 1);
  const label = String(value ?? "").trim().toLowerCase();
  const labelRate = {
    very_slow: 0.82,
    slow: 0.9,
    natural: 1,
    lively: 1.08,
    fast: 1.18,
    tongue_twister_fast: 1.25,
  }[label];
  if (Number.isFinite(labelRate)) return labelRate;
  const style = String(prosodyStyle ?? "").toLowerCase();
  if (style.includes("laugh") || style.includes("excited") || style.includes("scream")) {
    return 1.08;
  }
  if (style.includes("calm") || style.includes("soft")) return 0.96;
  return 1;
}

function resolveVoicevoxProsodyControls(request, query) {
  const style = String(request.prosody_style ?? "").toLowerCase();
  const voiceExpression = request.voice_expression ?? {};
  const expressionText = JSON.stringify({
    profile_id: safeText(voiceExpression.profile_id, 120),
    laughter_state: safeText(voiceExpression.laughter_state, 80),
    autonomous_state_id: safeText(voiceExpression.autonomous_state_id, 120),
  }).toLowerCase();
  const isLaugh =
    style.includes("laugh") ||
    expressionText.includes("laugh") ||
    expressionText.includes("laughter");
  const isScream =
    style.includes("scream") ||
    style.includes("shout") ||
    expressionText.includes("scream") ||
    expressionText.includes("surprise");
  const isSoft = style.includes("calm") || style.includes("soft");
  const isTongueTwister =
    String(request.speech_rate ?? "").includes("tongue") || request.speech_rate >= 1.22;
  const arousal = clampNumber(voiceExpression.arousal, 0, 1, isLaugh || isScream ? 0.85 : 0.42);

  const speedBoost = isTongueTwister ? 1.04 : isScream ? 1.03 : isLaugh ? 1.02 : 1;
  const pauseShortening = isTongueTwister || isScream ? 0.72 : isLaugh ? 0.82 : isSoft ? 1.08 : 1;

  return {
    speedScale: clampNumber(request.speech_rate * speedBoost, 0.72, 1.45, 1),
    intonationScale: clampNumber(
      resolveIntonationScale(request, query.intonationScale),
      0.75,
      1.35,
      1
    ),
    pitchScale: clampNumber(
      Number(query.pitchScale ?? 0) + resolvePitchOffset({ isLaugh, isScream, isSoft, arousal }),
      -0.12,
      0.15,
      0
    ),
    volumeScale: clampNumber(
      Number(query.volumeScale ?? 1) + resolveVolumeOffset({ isLaugh, isScream, isSoft, arousal }),
      0.72,
      1.35,
      1
    ),
    prePhonemeLength: clampNumber(
      Number(query.prePhonemeLength ?? 0.1) * pauseShortening,
      0.03,
      0.4,
      0.08
    ),
    postPhonemeLength: clampNumber(
      Number(query.postPhonemeLength ?? 0.1) * pauseShortening,
      0.04,
      0.5,
      0.1
    ),
  };
}

function resolvePitchOffset({ isLaugh, isScream, isSoft, arousal }) {
  if (isScream) return 0.055 + arousal * 0.035;
  if (isLaugh) return 0.025 + arousal * 0.02;
  if (isSoft) return -0.015;
  return arousal >= 0.75 ? 0.018 : 0;
}

function resolveVolumeOffset({ isLaugh, isScream, isSoft, arousal }) {
  if (isScream) return 0.16 + arousal * 0.07;
  if (isLaugh) return 0.08 + arousal * 0.04;
  if (isSoft) return -0.08;
  return arousal >= 0.75 ? 0.04 : 0;
}

function resolveIntonationScale(request, fallback) {
  const style = String(request.prosody_style ?? "").toLowerCase();
  const arousal = Number(request.voice_expression?.arousal);
  const expressionText = JSON.stringify({
    profile_id: safeText(request.voice_expression?.profile_id, 120),
    laughter_state: safeText(request.voice_expression?.laughter_state, 80),
    autonomous_state_id: safeText(request.voice_expression?.autonomous_state_id, 120),
  }).toLowerCase();
  if (style.includes("scream") || expressionText.includes("scream")) return 1.26;
  if (Number.isFinite(arousal) && arousal >= 0.7) return 1.18;
  if (
    style.includes("excited") ||
    style.includes("hype") ||
    style.includes("laugh") ||
    expressionText.includes("laugh")
  ) {
    return 1.16;
  }
  if (style.includes("calm") || style.includes("soft")) return 0.95;
  return fallback ?? 1;
}

async function fetchVoicevoxJson(target, options) {
  const response = await fetchWithTimeout(target, options);
  if (!response?.ok) throw bridgeError("engine_request_failed", 502);
  let text = "";
  try {
    text = await response.text();
    return JSON.parse(text);
  } catch {
    throw bridgeError("engine_invalid_response", 502);
  }
}

async function fetchVoicevoxBytes(target, options) {
  const response = await fetchWithTimeout(target, options);
  if (!response?.ok) throw bridgeError("engine_request_failed", 502);
  try {
    return Buffer.from(await response.arrayBuffer());
  } catch {
    throw bridgeError("engine_invalid_response", 502);
  }
}

async function fetchWithTimeout(target, { fetchImpl, timeoutMs, apiKey, headers = {}, ...options }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(target, {
      ...options,
      headers: {
        ...headers,
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw bridgeError("engine_timeout", 504);
    throw bridgeError("engine_request_failed", 502);
  } finally {
    clearTimeout(timer);
  }
}

function buildVoicevoxUrl(base, path, query) {
  let url;
  try {
    url = new URL(base);
  } catch {
    throw bridgeError("bridge_not_ready", 503);
  }
  const basePath = url.pathname.replace(/\/+$/, "");
  url.pathname = `${basePath}${path}`;
  url.search = "";
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }
  return url;
}

function normalizeBridgeConfig({
  voicevoxEndpoint = "http://127.0.0.1:50021",
  speakerId = "3",
  timeoutMs = 10_000,
  apiKey = "",
  allowLocalPreviewFallback = true,
  fetchImpl = globalThis.fetch,
  healthCheck = null,
} = {}) {
  const endpoint = safeText(voicevoxEndpoint, 500);
  const speaker = safeText(speakerId, 40);
  const engineEndpointScope = summarizeLocalEndpointScope(endpoint);
  const localEndpointPolicyStatus = summarizeLocalEndpointPolicyStatus(engineEndpointScope);
  return {
    voicevoxEndpoint: endpoint,
    speakerId: speaker,
    timeoutMs: clampInteger(timeoutMs, 500, 60_000, 10_000),
    apiKey: safeText(apiKey, 500),
    allowLocalPreviewFallback: allowLocalPreviewFallback !== false,
    fetchImpl,
    healthCheck: normalizeHealthCheck(healthCheck),
    engineEndpointScope,
    localEndpointPolicyStatus,
    ready:
      endpoint !== "" &&
      speaker !== "" &&
      typeof fetchImpl === "function" &&
      localEndpointPolicyStatus === "all_allowed",
  };
}

function normalizeHealthCheck(value) {
  if (!value || typeof value !== "object") {
    return { performed: false, reachable: null };
  }
  return {
    performed: value.performed === true,
    reachable: value.performed === true ? value.reachable === true : null,
  };
}

function createSafeErrorResponse(errorKind) {
  const safeErrorKind = SAFE_ERROR_KINDS.has(errorKind) ? errorKind : "tts_bridge_error";
  const response = {
    ok: false,
    error: safeErrorKind,
    error_kind: safeErrorKind,
    boundary_policy: {
      no_raw_error_messages: true,
      no_request_payloads: true,
      no_text_payloads: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertVoicevoxBridgePublicSafe(response, "VOICEVOX bridge error response");
  return response;
}

function classifyBridgeError(error) {
  if (SAFE_ERROR_KINDS.has(error?.errorKind)) return error.errorKind;
  const message = String(error?.message ?? "");
  if (message === "invalid_json") return "invalid_json";
  if (message === "request_body_too_large") return "request_body_too_large";
  if (error instanceof ContractError) {
    const lowered = message.toLowerCase();
    if (
      lowered.includes("unsafe field") ||
      lowered.includes("command") ||
      lowered.includes("candidate") ||
      lowered.includes("world_command") ||
      lowered.includes("direct memory") ||
      lowered.includes("endpoint") ||
      lowered.includes("authorization") ||
      lowered.includes("token") ||
      lowered.includes("secret") ||
      lowered.includes("password")
    ) {
      return "unsafe_payload";
    }
    return "contract_error";
  }
  return "tts_bridge_error";
}

function statusCodeForBridgeError(error, errorKind) {
  if (errorKind === "auth_required") return 401;
  if (
    errorKind === "invalid_json" ||
    errorKind === "request_body_too_large" ||
    errorKind === "unsafe_payload" ||
    errorKind === "contract_error"
  ) {
    return 400;
  }
  if (errorKind === "bridge_not_ready") return 503;
  if (errorKind === "local_endpoint_policy_blocked") return 400;
  if (errorKind === "engine_timeout") return 504;
  if (errorKind === "engine_request_failed" || errorKind === "engine_invalid_response") {
    return 502;
  }
  const explicit = Number(error?.statusCode);
  if (Number.isFinite(explicit) && explicit >= 400 && explicit < 600) {
    return Math.trunc(explicit);
  }
  return 500;
}

function isAuthorizedRequest(request, requiredApiKey) {
  if (!requiredApiKey) return true;
  const authorization = String(request.headers.authorization ?? "");
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/iu)?.[1] ?? "";
  const explicitApiKey = String(request.headers["x-api-key"] ?? "");
  return bearerToken === requiredApiKey || explicitApiKey === requiredApiKey;
}

function bridgeError(errorKind, statusCode) {
  const error = new Error(errorKind);
  error.errorKind = errorKind;
  error.statusCode = statusCode;
  return error;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > MAX_REQUEST_BYTES) {
        reject(new Error("request_body_too_large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function assertVoicevoxEngineResponseSafe(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw bridgeError("engine_invalid_response", 502);
  }
  assertNoForbiddenFields(value, context, "root", FORBIDDEN_PUBLIC_FIELDS);
}

function assertNoForbiddenFields(value, context, path, forbiddenFields) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFields(item, context, `${path}[${index}]`, forbiddenFields)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (forbiddenFields.has(field)) {
      throw new ContractError(`${context}: unsafe field`, { field, path });
    }
    assertNoForbiddenFields(child, context, `${path}.${field}`, forbiddenFields);
  }
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeOptionalNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}

function createPreviewSpeechWav({ durationMs, sampleRate }) {
  const sampleCount = Math.max(1, Math.floor((durationMs / 1000) * sampleRate));
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVEfmt ", 8, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.sin(Math.PI * Math.min(1, i / Math.max(1, sampleCount - 1)));
    const sample = Math.round(Math.sin(2 * Math.PI * 220 * t) * 1400 * envelope);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  return buffer;
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function clampNumber(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Number(number.toFixed(4))));
}
