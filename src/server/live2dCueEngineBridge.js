import { createServer } from "node:http";
import { ContractError } from "../core/contracts.js";
import {
  summarizeLocalEndpointPolicyStatus,
  summarizeLocalEndpointScope,
} from "../core/localEndpointPolicy.js";

const REQUEST_SCHEMA = "iris_local_live2d_engine_request_v1";
const HEALTH_SCHEMA = "iris_live2d_cue_engine_bridge_health_v1";
const CUE_SCHEMA = "iris_live2d_renderer_cue_v1";
const MAX_REQUEST_BYTES = 128_000;
const MAX_CUE_BYTES = 512_000;
const AUTONOMOUS_CUE_STATES = new Set([
  "quiet_presence",
  "latency_bridge",
  "surprise_scream",
  "happy_humming",
  "happy_dance",
  "happy_loud_sing",
  "self_directed_micro_action",
]);

const SAFE_ERROR_KINDS = new Set([
  "auth_required",
  "invalid_json",
  "request_body_too_large",
  "unsafe_payload",
  "contract_error",
  "bridge_not_ready",
  "renderer_request_failed",
  "renderer_timeout",
  "renderer_invalid_response",
  "local_endpoint_policy_blocked",
  "live2d_bridge_error",
]);

const FORBIDDEN_FIELDS = new Set([
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
  "canonical_envelope",
  "action_type",
  "intent",
  "tone",
  "emotion",
  "character_tag",
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

export function createLive2dCueEngineBridgeServer({
  rendererEndpoint = "",
  rendererHealthEndpoint = "",
  rendererApiKey = "",
  timeoutMs = 5000,
  defaultModelId = "",
  defaultSceneId = "",
  requireRendererEndpoint = false,
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) {
  const config = normalizeBridgeConfig({
    rendererEndpoint,
    rendererHealthEndpoint,
    rendererApiKey,
    timeoutMs,
    defaultModelId,
    defaultSceneId,
    requireRendererEndpoint,
    fetchImpl,
  });

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      if (request.method === "GET" && url.pathname === "/health") {
        const healthCheck = await probeRendererHealth(config);
        const health = createLive2dCueEngineBridgeHealth({ ...config, healthCheck });
        return sendJson(response, health.ok ? 200 : 503, health);
      }
      if (request.method === "POST" && url.pathname === "/live2d-engine") {
        if (!isAuthorizedRequest(request, config.rendererApiKey)) {
          throw bridgeError("auth_required", 401);
        }
        const payload = await readJson(request);
        const live2dRequest = normalizeLive2dEngineRequest(payload);
        const engineResponse = await renderLive2dCue(live2dRequest, config);
        return sendJson(response, 200, engineResponse);
      }
      return sendJson(response, 404, createSafeErrorResponse("live2d_bridge_error"));
    } catch (error) {
      const errorKind = classifyBridgeError(error);
      const statusCode = statusCodeForBridgeError(error, errorKind);
      if (statusCode >= 500) logger.error?.(new Error(`live2d cue bridge ${errorKind}`));
      return sendJson(response, statusCode, createSafeErrorResponse(errorKind));
    }
  });
}

export function createLive2dCueEngineBridgeHealth(configInput = {}) {
  const config = normalizeBridgeConfig(configInput);
  const healthCheck = normalizeHealthCheck(configInput.healthCheck);
  const rendererHealthy = healthCheck.performed
    ? healthCheck.reachable || config.requireRendererEndpoint !== true
    : true;
  const ok = config.ready && rendererHealthy;
  const health = {
    ok,
    schema: HEALTH_SCHEMA,
    service: "live2d_cue_engine_bridge",
    bridge_status: ok ? "ready" : "attention",
    mode: config.rendererEndpoint ? "renderer_http" : "cue_only",
    configured: {
      renderer_target: config.rendererEndpoint !== "",
      renderer_required: config.requireRendererEndpoint === true,
      cue_only_fallback: config.requireRendererEndpoint !== true,
      renderer_health_target: config.rendererHealthEndpoint !== "",
      renderer_auth: config.rendererApiKey !== "",
      timeout_ms: config.timeoutMs,
      model: config.defaultModelId !== "",
      scene: config.defaultSceneId !== "",
      renderer_health_checked: healthCheck.performed,
      renderer_health_reachable: healthCheck.performed ? healthCheck.reachable : null,
    },
    local_endpoint_policy: "loopback_or_private_network_only",
    local_endpoint_policy_status: config.localEndpointPolicyStatus,
    renderer_endpoint_scope: config.rendererEndpointScope.endpoint_scope,
    renderer_endpoint_locality_ok: config.rendererEndpointScope.local_endpoint_allowed,
    renderer_health_endpoint_scope: config.rendererHealthEndpointScope.endpoint_scope,
    renderer_health_endpoint_locality_ok:
      config.rendererHealthEndpointScope.local_endpoint_allowed,
    supported_request_schemas: [REQUEST_SCHEMA],
    supported_response_fields: ["cue", "duration_ms", "bridge_status"],
    supported_cue_schemas: [CUE_SCHEMA],
    cue_capabilities: {
      motion_style: true,
      expression_profile: true,
      body_state: true,
      camera_proximity: true,
      autonomous_state: true,
      autonomous_scream_motion: true,
      happy_hum_dance_motion: true,
      timing_tracks: true,
      renderer_forwarding_optional: true,
    },
    boundary_policy: {
      no_endpoint_values: true,
      no_secret_values: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      cue_payload_validated_before_renderer: true,
      renderer_response_summary_only: true,
    },
    adapter_validation_required: true,
  };
  assertLive2dBridgePublicSafe(health, "Live2D cue bridge health");
  return health;
}

export function assertLive2dBridgePublicSafe(
  value,
  context = "Live2D cue bridge public object"
) {
  assertNoForbiddenFields(value, context, "root");
}

async function renderLive2dCue(request, config) {
  if (config.localEndpointPolicyStatus === "blocked") {
    throw bridgeError("local_endpoint_policy_blocked", 400);
  }
  if (!config.ready) throw bridgeError("bridge_not_ready", 503);
  const cue = createRendererCue(request, config);
  let rendererAccepted = false;
  if (config.rendererEndpoint) {
    try {
      rendererAccepted = await postCueToRenderer(cue, config);
    } catch (error) {
      if (error?.errorKind === "renderer_invalid_response") throw error;
      if (config.requireRendererEndpoint === true) throw error;
    }
  }
  const response = {
    cue: {
      ...cue,
      renderer: {
        attempted: config.rendererEndpoint !== "",
        accepted: rendererAccepted,
        status: config.rendererEndpoint
          ? rendererAccepted
            ? "accepted"
            : "attention"
          : "cue_only",
      },
    },
    duration_ms: cue.timing.duration_ms,
    bridge_status: rendererAccepted
      ? "rendered_with_renderer_ack"
      : config.rendererEndpoint
        ? "renderer_attention"
        : "rendered_cue_only",
  };
  assertLive2dEngineResponseSafe(response, "Live2D cue bridge engine response");
  return response;
}

function createRendererCue(request, config) {
  const durationMs = clampInteger(request.timing.total_duration_ms, 300, 60_000, 1200);
  const trackSummary = summarizeTracks(request.tracks);
  const autonomousState = normalizeAutonomousState(request.autonomous_state_id);
  const motionStyle = resolveMotionStyle(request, autonomousState);
  const cue = {
    schema: CUE_SCHEMA,
    cue_id: `live2d-cue-${safeId(request.job_id)}`,
    model: {
      model_configured:
        request.engine_preferences.model_id !== "" || config.defaultModelId !== "",
      scene_configured:
        request.engine_preferences.scene_id !== "" || config.defaultSceneId !== "",
    },
    motion: {
      style: motionStyle,
      intensity: normalizeIntensity(request.motion_intensity),
      blend_ms: blendMsForMotion(motionStyle),
      track_count: trackSummary.track_count,
      body_motion_hint: resolveBodyMotionHint({ trackSummary, motionStyle, autonomousState }),
      gesture_hint: resolveGestureHint({ trackSummary, motionStyle, autonomousState }),
    },
    expression: {
      profile_id: safeText(request.expression_profile_id, 120),
      expression_key: expressionKeyForRequest(request, autonomousState),
      blink_rate: trackSummary.blink_rate,
      gaze_hint: resolveGazeHint({ trackSummary, motionStyle, autonomousState }),
    },
    body: {
      state_id: safeText(request.body_state_id, 120),
      autonomous_state_id: safeText(request.autonomous_state_id, 120),
      breathing_rate: breathingRateForRequest(request, trackSummary, autonomousState),
      shoulder_motion: shoulderMotionForRequest(request, autonomousState),
    },
    camera: cameraCueForProfile(request.camera_proximity_profile),
    autonomous: {
      state: autonomousState,
      scream_reaction_enabled: autonomousState === "surprise_scream",
      happy_motion_enabled: ["happy_humming", "happy_dance", "happy_loud_sing"].includes(
        autonomousState
      ),
      vocalise_motion_enabled: ["happy_humming", "happy_loud_sing"].includes(autonomousState),
      safety_guard: "visual_expression_only_no_commands",
    },
    timing: {
      duration_ms: durationMs,
      start_delay_ms: clampInteger(request.timing.start_delay_ms, 0, 10_000, 0),
      sync_policy: safeText(request.timing.sync_policy ?? "speech_motion_timeline", 80),
    },
    boundary_policy: {
      renderer_cue_only: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertLive2dBridgePublicSafe(cue, "Live2D renderer cue");
  return cue;
}

function normalizeLive2dEngineRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ContractError("Live2D cue bridge request: object is required");
  }
  assertNoForbiddenFields(payload, "Live2D cue bridge request", "root");
  if (payload.schema !== REQUEST_SCHEMA) {
    throw new ContractError("Live2D cue bridge request: invalid schema");
  }
  return {
    schema: REQUEST_SCHEMA,
    job_id: safeText(payload.job_id, 160),
    event_id: safeText(payload.event_id, 160),
    motion_style: safeText(
      payload.motion_style ?? payload.motionStyle ?? payload.motion_key ?? payload.motionKey ?? payload.gesture,
      80
    ),
    motion_intensity: safeText(payload.motion_intensity ?? payload.motionIntensity ?? payload.intensity, 40),
    body_state_id: safeText(payload.body_state_id ?? payload.bodyStateId ?? payload.body_state ?? payload.bodyState, 120),
    camera_proximity_profile: safeText(
      payload.camera_proximity_profile ?? payload.cameraProximityProfile ?? payload.camera_profile ?? payload.cameraProfile,
      120
    ),
    expression_profile_id: safeText(
      payload.expression_profile_id ??
        payload.expressionProfileId ??
        payload.expression_id ??
        payload.expressionId ??
        payload.facial_expression ??
        payload.facialExpression ??
        payload.emotion,
      120
    ),
    autonomous_state_id: safeText(payload.autonomous_state_id ?? payload.autonomousStateId ?? payload.state_id ?? payload.stateId, 120),
    timing:
      payload.timing && typeof payload.timing === "object" && !Array.isArray(payload.timing)
        ? payload.timing
        : {},
    tracks: Array.isArray(payload.tracks) ? payload.tracks.slice(0, 80) : [],
    engine_preferences:
      payload.engine_preferences && typeof payload.engine_preferences === "object"
        ? payload.engine_preferences
        : {},
  };
}

async function postCueToRenderer(cue, config) {
  const response = await fetchWithTimeout(config.rendererEndpoint, {
    method: "POST",
    apiKey: config.rendererApiKey,
    timeoutMs: config.timeoutMs,
    fetchImpl: config.fetchImpl,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      schema: "iris_live2d_renderer_cue_delivery_v1",
      cue,
      boundary_policy: {
        no_text_payloads: true,
        no_candidates: true,
        no_commands: true,
        no_endpoint_values: true,
        no_secret_values: true,
      },
      adapter_validation_required: true,
    }),
  });
  if (!response?.ok) throw bridgeError("renderer_request_failed", 502);
  await assertRendererResponseSafe(response);
  return true;
}

async function assertRendererResponseSafe(response) {
  const responseText = await response.text();
  if (!responseText.trim()) return;
  if (responseText.length > MAX_CUE_BYTES) throw bridgeError("renderer_invalid_response", 502);
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw bridgeError("renderer_invalid_response", 502);
  }
  try {
    assertNoForbiddenFields(payload, "Live2D renderer response", "root");
  } catch {
    throw bridgeError("renderer_invalid_response", 502);
  }
}

async function probeRendererHealth(config) {
  if (!config.ready || typeof config.fetchImpl !== "function") {
    return { performed: true, reachable: false };
  }
  if (config.localEndpointPolicyStatus === "blocked") {
    return { performed: true, reachable: false };
  }
  if (!config.rendererHealthEndpoint) {
    return { performed: false, reachable: null };
  }
  try {
    const response = await fetchWithTimeout(config.rendererHealthEndpoint, {
      method: "GET",
      apiKey: config.rendererApiKey,
      timeoutMs: Math.min(config.timeoutMs, 1500),
      fetchImpl: config.fetchImpl,
    });
    return { performed: true, reachable: response?.ok === true };
  } catch {
    return { performed: true, reachable: false };
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
    if (error?.name === "AbortError") throw bridgeError("renderer_timeout", 504);
    throw bridgeError("renderer_request_failed", 502);
  } finally {
    clearTimeout(timer);
  }
}

function summarizeTracks(tracks) {
  const safeTracks = Array.isArray(tracks) ? tracks.slice(0, 80) : [];
  const bodyTrack = safeTracks.find((track) => track?.kind === "body_motion") ?? {};
  const expressionTrack = safeTracks.find((track) => track?.kind === "expression") ?? {};
  return {
    track_count: safeTracks.length,
    body_motion_hint: safeText(bodyTrack.head_motion ?? bodyTrack.body_sway ?? "soft_nod", 80),
    gesture_hint: safeText(bodyTrack.gesture_hint ?? "small_hand", 80),
    blink_rate: safeOptionalNumber(expressionTrack.blink_rate),
    gaze_hint: safeText(expressionTrack.gaze_hint ?? "audience_soft", 80),
    breathing_rate: safeOptionalNumber(
      safeTracks.find((track) => track?.kind === "ambient_breath")?.breathing_rate
    ),
  };
}

function cameraCueForProfile(profile) {
  const normalized = safeText(profile, 120).toLowerCase();
  const extreme = normalized.includes("extreme");
  const faceNear = normalized.includes("face") || normalized.includes("near");
  const close =
    normalized.includes("close") ||
    normalized.includes("near") ||
    normalized.includes("approach");
  return {
    proximity_profile: safeText(profile, 120) || "neutral",
    scale: extreme ? 1.22 : faceNear ? 1.16 : close ? 1.08 : 1,
    offset_x: 0,
    offset_y: extreme ? -0.055 : faceNear ? -0.04 : close ? -0.02 : 0,
    face_priority: extreme || faceNear,
    comfort_guard: "bounded_viewer_closeup",
  };
}

function expressionKeyForRequest(request, autonomousState) {
  if (autonomousState === "surprise_scream") return "wide_eyes_short_scream";
  if (autonomousState === "happy_humming") return "closed_mouth_happy_hum";
  if (autonomousState === "happy_dance" || autonomousState === "happy_loud_sing") {
    return "bright_smile_high_energy";
  }
  const style = normalizeMotionStyle(request.motion_style);
  if (style === "laugh_big") return "eyes_smile_open_mouth_laugh";
  if (style === "focused_talk") return "focused_bright";
  if (style === "idle_breath") return "neutral_breath";
  return "soft_smile";
}

function normalizeMotionStyle(value) {
  const style = safeText(value, 80);
  if (
    [
      "talk",
      "focused_talk",
      "laugh_big",
      "idle_breath",
      "surprise_scream",
      "happy_humming",
      "happy_dance",
      "happy_loud_sing",
    ].includes(style)
  ) {
    return style;
  }
  return style || "talk";
}

function normalizeAutonomousState(value) {
  const state = safeText(value, 120);
  return AUTONOMOUS_CUE_STATES.has(state) ? state : "quiet_presence";
}

function resolveMotionStyle(request, autonomousState) {
  if (autonomousState === "surprise_scream") return "surprise_scream";
  if (autonomousState === "happy_humming") return "happy_humming";
  if (autonomousState === "happy_dance") return "happy_dance";
  if (autonomousState === "happy_loud_sing") return "happy_loud_sing";
  return normalizeMotionStyle(request.motion_style);
}

function normalizeIntensity(value) {
  const intensity = safeText(value, 40).toLowerCase();
  if (["low", "medium", "high", "burst"].includes(intensity)) return intensity;
  return "medium";
}

function blendMsForMotion(style) {
  const normalized = normalizeMotionStyle(style);
  if (normalized === "surprise_scream") return 80;
  if (normalized === "happy_dance" || normalized === "happy_loud_sing") return 150;
  if (normalized === "happy_humming") return 260;
  if (normalized === "laugh_big") return 120;
  if (normalized === "idle_breath") return 350;
  return 220;
}

function resolveBodyMotionHint({ trackSummary, motionStyle, autonomousState }) {
  if (autonomousState === "surprise_scream") return "shoulder_jump_small_retreat";
  if (autonomousState === "happy_dance") return "small_shoulders_tiny_step";
  if (autonomousState === "happy_loud_sing") return "bright_open_chest_vocalise";
  if (autonomousState === "happy_humming") return "soft_side_to_side_hum";
  if (motionStyle === "laugh_big") return "laugh_bounce";
  return trackSummary.body_motion_hint;
}

function resolveGestureHint({ trackSummary, motionStyle, autonomousState }) {
  if (autonomousState === "surprise_scream") return "hands_near_chest_startle";
  if (autonomousState === "happy_dance") return "tiny_step_and_hand_sway";
  if (autonomousState === "happy_loud_sing") return "small_open_hand_vocalise";
  if (autonomousState === "happy_humming") return "small_closed_mouth_sway";
  if (motionStyle === "laugh_big") return "cover_mouth_laugh";
  return trackSummary.gesture_hint;
}

function resolveGazeHint({ trackSummary, motionStyle, autonomousState }) {
  if (autonomousState === "surprise_scream") return "snap_to_screen_then_audience";
  if (autonomousState === "happy_dance" || autonomousState === "happy_loud_sing") {
    return "audience_bright";
  }
  if (motionStyle === "focused_talk") return "screen_focus";
  return trackSummary.gaze_hint;
}

function breathingRateForRequest(request, trackSummary, autonomousState) {
  if (trackSummary.breathing_rate !== null) return trackSummary.breathing_rate;
  if (autonomousState === "surprise_scream") return 0.86;
  if (autonomousState === "happy_dance" || autonomousState === "happy_loud_sing") return 0.7;
  if (autonomousState === "happy_humming") return 0.42;
  const style = normalizeMotionStyle(request.motion_style);
  if (style === "laugh_big") return 0.72;
  if (style === "idle_breath") return 0.32;
  return 0.46;
}

function shoulderMotionForRequest(request, autonomousState) {
  if (autonomousState === "surprise_scream") return "short_jump_then_breath_recover";
  if (autonomousState === "happy_dance") return "happy_dance_bounce";
  if (autonomousState === "happy_loud_sing") return "loud_sing_open_bounce";
  if (autonomousState === "happy_humming") return "soft_hum_sway";
  const style = normalizeMotionStyle(request.motion_style);
  if (style === "laugh_big") return "laugh_bounce";
  if (style === "focused_talk") return "micro_tracking";
  if (style === "idle_breath") return "subtle_breath";
  return "soft_sway";
}

function normalizeBridgeConfig({
  rendererEndpoint = "",
  rendererHealthEndpoint = "",
  rendererApiKey = "",
  timeoutMs = 5000,
  defaultModelId = "",
  defaultSceneId = "",
  requireRendererEndpoint = false,
  fetchImpl = globalThis.fetch,
  healthCheck = null,
} = {}) {
  const renderer = safeText(rendererEndpoint, 500);
  const rendererHealth = safeText(rendererHealthEndpoint, 500);
  const rendererEndpointScope = summarizeLocalEndpointScope(renderer);
  const rendererHealthEndpointScope = summarizeLocalEndpointScope(rendererHealth);
  const localEndpointPolicyStatus = summarizeRendererLocalEndpointPolicyStatus({
    rendererEndpoint: renderer,
    rendererEndpointScope,
    rendererHealthEndpoint: rendererHealth,
    rendererHealthEndpointScope,
  });
  return {
    rendererEndpoint: renderer,
    rendererHealthEndpoint: rendererHealth,
    rendererApiKey: safeText(rendererApiKey, 500),
    timeoutMs: clampInteger(timeoutMs, 500, 60_000, 5000),
    defaultModelId: safeText(defaultModelId, 120),
    defaultSceneId: safeText(defaultSceneId, 120),
    requireRendererEndpoint: requireRendererEndpoint === true,
    fetchImpl,
    healthCheck: normalizeHealthCheck(healthCheck),
    rendererEndpointScope,
    rendererHealthEndpointScope,
    localEndpointPolicyStatus,
    ready:
      typeof fetchImpl === "function" &&
      localEndpointPolicyStatus !== "blocked" &&
      (requireRendererEndpoint !== true || renderer !== ""),
  };
}

function summarizeRendererLocalEndpointPolicyStatus({
  rendererEndpoint,
  rendererEndpointScope,
  rendererHealthEndpoint,
  rendererHealthEndpointScope,
}) {
  if (!rendererEndpoint && !rendererHealthEndpoint) return "not_configured";
  if (
    summarizeLocalEndpointPolicyStatus(rendererEndpointScope) === "blocked" ||
    summarizeLocalEndpointPolicyStatus(rendererHealthEndpointScope) === "blocked"
  ) {
    return "blocked";
  }
  return "all_allowed";
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
  const safeErrorKind = SAFE_ERROR_KINDS.has(errorKind) ? errorKind : "live2d_bridge_error";
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
  assertLive2dBridgePublicSafe(response, "Live2D cue bridge error response");
  return response;
}

function classifyBridgeError(error) {
  if (SAFE_ERROR_KINDS.has(error?.errorKind)) return error.errorKind;
  const message = String(error?.message ?? "");
  if (message === "invalid_json") return "invalid_json";
  if (message === "request_body_too_large") return "request_body_too_large";
  if (error instanceof ContractError) {
    const lowered = message.toLowerCase();
    if (lowered.includes("renderer response")) return "renderer_invalid_response";
    if (
      lowered.includes("unsafe field") ||
      lowered.includes("command") ||
      lowered.includes("candidate") ||
      lowered.includes("world_command") ||
      lowered.includes("canonical") ||
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
  return "live2d_bridge_error";
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
  if (errorKind === "renderer_timeout") return 504;
  if (errorKind === "renderer_request_failed" || errorKind === "renderer_invalid_response") {
    return 502;
  }
  const explicit = Number(error?.statusCode);
  if (Number.isFinite(explicit) && explicit >= 400 && explicit < 600) {
    return Math.trunc(explicit);
  }
  return 500;
}

function bridgeError(errorKind, statusCode) {
  const error = new Error(errorKind);
  error.errorKind = errorKind;
  error.statusCode = statusCode;
  return error;
}

function isAuthorizedRequest(request, requiredApiKey) {
  if (!requiredApiKey) return true;
  const authorization = String(request.headers.authorization ?? "");
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/iu)?.[1] ?? "";
  const explicitApiKey = String(request.headers["x-api-key"] ?? "");
  return bearerToken === requiredApiKey || explicitApiKey === requiredApiKey;
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

function assertLive2dEngineResponseSafe(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw bridgeError("renderer_invalid_response", 502);
  }
  assertNoForbiddenFields(value, context, "root");
}

function assertNoForbiddenFields(value, context, path) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenFields(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe field`, { field, path });
    }
    assertNoForbiddenFields(child, context, `${path}.${field}`);
  }
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeId(value) {
  return (
    safeText(value, 120)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "job"
  );
}

function safeOptionalNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}
