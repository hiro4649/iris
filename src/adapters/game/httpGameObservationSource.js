import { ContractError } from "../../core/contracts.js";
import {
  summarizeLocalEndpointPolicyStatus,
  summarizeLocalEndpointScope,
} from "../../core/localEndpointPolicy.js";
import { normalizeGameObservation } from "./gameObservationAdapter.js";

const FORBIDDEN_VISION_BRIDGE_FIELDS = new Set([
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
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "password",
  "authorization",
  "raw_frame",
  "raw_image",
  "image_base64",
  "screenshot_base64",
  "frame_pixels",
  "pixel_data",
  "ocr_raw_text",
]);
const GAME_OBSERVATION_READINESS_STATUSES = new Set([
  "idle",
  "active",
  "retry_backoff",
  "attention",
]);
const LOCAL_ENDPOINT_POLICY_STATUSES = new Set(["all_allowed", "blocked", "not_configured"]);
const VISION_ENDPOINT_SCOPES = new Set([
  "loopback",
  "private_network",
  "external",
  "invalid",
  "not_configured",
]);
const GAME_OBSERVATION_ERROR_KINDS = new Set([
  "http_game_observation_timeout",
  "local_endpoint_policy_blocked",
  "http_game_observation_http_status",
  "http_game_observation_invalid_json",
  "http_game_observation_unsafe_payload",
  "http_game_observation_contract_error",
  "http_game_observation_request_error",
]);
const OBSERVATION_TELEMETRY_COUNT_FIELDS = [
  "observation_count",
  "low_confidence_count",
  "with_frame_age_count",
  "without_frame_age_count",
  "with_frame_reference_count",
  "with_ocr_summary_count",
  "with_ui_focus_areas_count",
  "raw_frame_available_count",
];
const OBSERVATION_TELEMETRY_OPTIONAL_NUMBER_FIELDS = [
  "average_confidence",
  "min_confidence",
  "max_confidence",
  "average_frame_age_ms",
  "min_frame_age_ms",
  "max_frame_age_ms",
];
const STATUS_URL_PATTERN = /https?:\/\//i;

export function createHttpGameObservationSource({
  endpoint,
  apiKey = "",
  timeoutMs = 5000,
  method = "GET",
  captureRequest = null,
  errorBackoffMs = 5000,
  maxErrorBackoffMs = 60_000,
  nowMs = () => Date.now(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!endpoint) {
    throw new ContractError("HTTP game observation endpoint is required");
  }
  if (typeof fetchImpl !== "function") {
    throw new ContractError("HTTP game observation source requires fetch");
  }
  const safeTimeoutMs = clampInteger(timeoutMs, 100, 60_000, 5000);
  const requestMethod = String(method || "GET").toUpperCase();
  if (!["GET", "POST"].includes(requestMethod)) {
    throw new ContractError("HTTP game observation source method must be GET or POST", {
      method,
    });
  }
  const safeCaptureRequest =
    requestMethod === "POST" ? buildCaptureRequest(captureRequest) : null;
  const errorBackoffPolicy = {
    base_backoff_ms: clampInteger(errorBackoffMs, 0, 3_600_000, 5000),
    max_backoff_ms: clampInteger(maxErrorBackoffMs, 0, 24 * 3_600_000, 60_000),
  };
  const endpointScopeSummary = summarizeLocalEndpointScope(endpoint);
  const localEndpointPolicyStatus = summarizeLocalEndpointPolicyStatus(endpointScopeSummary);

  const bufferedObservations = [];
  const status = {
    source_kind: "http_game_observation_source",
    request_method: requestMethod,
    local_endpoint_policy: "loopback_or_private_network_only",
    local_endpoint_policy_status: localEndpointPolicyStatus,
    vision_endpoint_scope: endpointScopeSummary.endpoint_scope,
    vision_endpoint_locality_ok: endpointScopeSummary.local_endpoint_allowed,
    request_count: 0,
    last_observation_count: 0,
    last_observation_telemetry: emptyObservationTelemetry(),
    last_error: null,
    last_error_at_ms: null,
    consecutive_error_count: 0,
    next_retry_after_ms: null,
    error_backoff_policy: errorBackoffPolicy,
    capture_request_summary: safeCaptureRequest
      ? {
          schema: safeCaptureRequest.schema,
          request_kind: safeCaptureRequest.request_kind,
          capture_region_configured:
            safeCaptureRequest.capture_region !== null &&
            safeCaptureRequest.capture_region !== undefined,
          include_ocr_summary: safeCaptureRequest.include_ocr_summary,
          include_ui_focus_areas: safeCaptureRequest.include_ui_focus_areas,
          max_detected_events: safeCaptureRequest.max_detected_events,
          raw_frame_policy: safeCaptureRequest.raw_frame_policy,
        }
      : null,
    boundary_policy: {
      read_only_status: true,
      no_raw_frames: true,
      no_observation_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
  };

  async function next() {
    if (bufferedObservations.length > 0) {
      return normalizeGameObservation(bufferedObservations.shift());
    }
    if (shouldWaitForErrorBackoff({ status, nowMs })) return null;

    const observations = await fetchObservationBatch({
      endpoint,
      apiKey,
      timeoutMs: safeTimeoutMs,
      method: requestMethod,
      captureRequest: safeCaptureRequest,
      fetchImpl,
      status,
      nowMs,
      errorBackoffPolicy,
    });
    bufferedObservations.push(...observations);
    if (bufferedObservations.length === 0) return null;
    return normalizeGameObservation(bufferedObservations.shift());
  }

  return {
    source_kind: "http_game_observation_source",
    next,
    async nextBatch(limit = 10) {
      const events = [];
      const safeLimit = clampInteger(limit, 1, 50);
      while (events.length < safeLimit && bufferedObservations.length > 0) {
        events.push(normalizeGameObservation(bufferedObservations.shift()));
      }
      if (events.length >= safeLimit) return events;
      if (shouldWaitForErrorBackoff({ status, nowMs })) return events;
      const observations = await fetchObservationBatch({
        endpoint,
        apiKey,
        timeoutMs: safeTimeoutMs,
        method: requestMethod,
        captureRequest: safeCaptureRequest,
        fetchImpl,
        status,
        nowMs,
        errorBackoffPolicy,
      });
      bufferedObservations.push(...observations);
      while (events.length < safeLimit && bufferedObservations.length > 0) {
        events.push(normalizeGameObservation(bufferedObservations.shift()));
      }
      return events;
    },
    status() {
      return createPublicStatus(status);
    },
  };
}

function createPublicStatus(status) {
  const publicStatus = {
    ...structuredClone(status),
    ingest_readiness_status: summarizeGameObservationReadiness(status),
    has_retry_backoff: status.next_retry_after_ms !== null,
  };
  assertHttpGameObservationSourceStatusSafe(publicStatus);
  return publicStatus;
}

export function assertHttpGameObservationSourceStatusSafe(
  status,
  context = "HTTP game observation source status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  assertReadOnlyVisionBridgePayload(status, context);
  if (status.source_kind !== "http_game_observation_source") {
    throw new ContractError(`${context}: invalid source kind`, {
      source_kind: status.source_kind,
    });
  }
  if (!["GET", "POST"].includes(status.request_method)) {
    throw new ContractError(`${context}: invalid request method`, {
      request_method: status.request_method,
    });
  }
  if (status.local_endpoint_policy !== "loopback_or_private_network_only") {
    throw new ContractError(`${context}: invalid local endpoint policy`, {
      local_endpoint_policy: status.local_endpoint_policy,
    });
  }
  if (!LOCAL_ENDPOINT_POLICY_STATUSES.has(status.local_endpoint_policy_status)) {
    throw new ContractError(`${context}: invalid local endpoint policy status`, {
      local_endpoint_policy_status: status.local_endpoint_policy_status,
    });
  }
  if (!VISION_ENDPOINT_SCOPES.has(status.vision_endpoint_scope)) {
    throw new ContractError(`${context}: invalid vision endpoint scope`, {
      vision_endpoint_scope: status.vision_endpoint_scope,
    });
  }
  assertBoolean(status.vision_endpoint_locality_ok, `${context}: endpoint locality`, "vision_endpoint_locality_ok");
  for (const field of ["request_count", "last_observation_count", "consecutive_error_count"]) {
    assertNonNegativeInteger(status[field], `${context}: ${field}`, field);
  }
  assertObservationTelemetrySafe(status.last_observation_telemetry, context);
  if (status.last_error !== null && !GAME_OBSERVATION_ERROR_KINDS.has(status.last_error)) {
    throw new ContractError(`${context}: invalid last error`, { last_error: status.last_error });
  }
  assertOptionalNonNegativeNumber(status.last_error_at_ms, `${context}: last_error_at_ms`, "last_error_at_ms");
  assertOptionalNonNegativeNumber(
    status.next_retry_after_ms,
    `${context}: next_retry_after_ms`,
    "next_retry_after_ms"
  );
  assertErrorBackoffPolicySafe(status.error_backoff_policy, context);
  assertCaptureRequestSummarySafe(status.capture_request_summary, context);
  assertBoundaryPolicyFlags(status.boundary_policy, [
    "read_only_status",
    "no_raw_frames",
    "no_observation_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ], context);
  if (!GAME_OBSERVATION_READINESS_STATUSES.has(status.ingest_readiness_status)) {
    throw new ContractError(`${context}: invalid ingest readiness status`, {
      ingest_readiness_status: status.ingest_readiness_status,
    });
  }
  assertBoolean(status.has_retry_backoff, `${context}: retry backoff flag`, "has_retry_backoff");
  if (STATUS_URL_PATTERN.test(JSON.stringify(status))) {
    throw new ContractError(`${context}: status must not expose endpoint values`);
  }
}

function assertObservationTelemetrySafe(telemetry, context) {
  if (!telemetry || typeof telemetry !== "object" || Array.isArray(telemetry)) {
    throw new ContractError(`${context}: observation telemetry must be an object`);
  }
  for (const field of OBSERVATION_TELEMETRY_COUNT_FIELDS) {
    assertNonNegativeInteger(telemetry[field], `${context}: telemetry ${field}`, field);
  }
  for (const field of OBSERVATION_TELEMETRY_OPTIONAL_NUMBER_FIELDS) {
    assertOptionalNonNegativeNumber(telemetry[field], `${context}: telemetry ${field}`, field);
  }
}

function assertErrorBackoffPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: error backoff policy must be an object`);
  }
  assertNonNegativeInteger(policy.base_backoff_ms, `${context}: backoff base`, "base_backoff_ms");
  assertNonNegativeInteger(policy.max_backoff_ms, `${context}: backoff max`, "max_backoff_ms");
  if (policy.base_backoff_ms > policy.max_backoff_ms) {
    throw new ContractError(`${context}: invalid error backoff policy`);
  }
}

function assertCaptureRequestSummarySafe(summary, context) {
  if (summary === null) return;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: capture request summary must be an object`);
  }
  if (summary.schema !== "iris_vision_capture_request_v1") {
    throw new ContractError(`${context}: invalid capture request schema`);
  }
  if (summary.request_kind !== "screen_observation_summary") {
    throw new ContractError(`${context}: invalid capture request kind`);
  }
  for (const field of [
    "capture_region_configured",
    "include_ocr_summary",
    "include_ui_focus_areas",
  ]) {
    assertBoolean(summary[field], `${context}: capture summary ${field}`, field);
  }
  assertNonNegativeInteger(
    summary.max_detected_events,
    `${context}: max detected events`,
    "max_detected_events"
  );
  if (summary.max_detected_events < 1 || summary.max_detected_events > 12) {
    throw new ContractError(`${context}: max detected events out of range`);
  }
  if (summary.raw_frame_policy !== "do_not_return_raw_frame_to_core") {
    throw new ContractError(`${context}: invalid raw frame policy`);
  }
}

function assertBoundaryPolicyFlags(policy, requiredFlags, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy must be an object`);
  }
  const expectedFlags = new Set(requiredFlags);
  for (const flag of Object.keys(policy)) {
    if (!expectedFlags.has(flag)) {
      throw new ContractError(`${context}: unexpected boundary policy flag`, { flag });
    }
  }
  for (const flag of requiredFlags) {
    if (policy[flag] !== true) {
      throw new ContractError(`${context}: boundary policy flag must be true`, { flag });
    }
  }
}

function assertBoolean(value, context, field) {
  if (typeof value !== "boolean") {
    throw new ContractError(context, { field, value });
  }
}

function assertNonNegativeInteger(value, context, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context, { field, value });
  }
}

function assertOptionalNonNegativeNumber(value, context, field) {
  if (value === null || value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ContractError(context, { field, value });
  }
}

function summarizeGameObservationReadiness(status) {
  if (status.next_retry_after_ms) return "retry_backoff";
  if (status.last_error) return "attention";
  if (status.request_count <= 0) return "idle";
  return "active";
}

async function fetchObservationBatch({
  endpoint,
  apiKey,
  timeoutMs,
  method,
  captureRequest,
  fetchImpl,
  status,
  nowMs,
  errorBackoffPolicy,
}) {
  const endpointScopeSummary = summarizeLocalEndpointScope(endpoint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (status) {
      status.request_count += 1;
      status.last_error = null;
      status.local_endpoint_policy_status =
        summarizeLocalEndpointPolicyStatus(endpointScopeSummary);
      status.vision_endpoint_scope = endpointScopeSummary.endpoint_scope;
      status.vision_endpoint_locality_ok = endpointScopeSummary.local_endpoint_allowed;
    }
    if (!endpointScopeSummary.local_endpoint_allowed) {
      throw new ContractError("HTTP game observation source endpoint must be local", {
        error_kind: "local_endpoint_policy_blocked",
        endpoint_scope: endpointScopeSummary.endpoint_scope,
        retryable: false,
        operator_action_required: true,
      });
    }
    const response = await fetchImpl(endpoint, {
      method,
      headers: {
        accept: "application/json",
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify(captureRequest) } : {}),
      signal: controller.signal,
    });
    if (response.status === 204) {
      if (status) {
        status.last_observation_count = 0;
        status.last_observation_telemetry = emptyObservationTelemetry();
        status.last_error = null;
        status.last_error_at_ms = null;
        status.consecutive_error_count = 0;
        status.next_retry_after_ms = null;
      }
      return [];
    }
    if (!response.ok) {
      throw new ContractError("HTTP game observation source request failed", {
        status: response.status,
        response_kind: "omitted",
        error_kind: "http_status",
      });
    }
    const responseText = await response.text();
    const parsed = parseJsonResponse(responseText);
    assertReadOnlyVisionBridgePayload(parsed, "HTTP game observation response");
    assertGameObservationBridgeAccepted(parsed);
    const observations = extractObservations(parsed).map(toGameObservationInput);
    if (status) {
      status.last_observation_count = observations.length;
      status.last_observation_telemetry = createObservationTelemetry(observations);
      status.last_error = null;
      status.last_error_at_ms = null;
      status.consecutive_error_count = 0;
      status.next_retry_after_ms = null;
    }
    return observations;
  } catch (error) {
    if (status) {
      status.last_error = classifyGameObservationError(error);
      status.last_observation_count = 0;
      status.last_observation_telemetry = emptyObservationTelemetry();
      applyErrorBackoff({ status, nowMs, errorBackoffPolicy });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function assertGameObservationBridgeAccepted(parsed) {
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
    throw new ContractError("HTTP game observation bridge returned failure", {
      status: 200,
      response_kind: "omitted",
      error_kind: "http_status",
    });
  }
}

function emptyObservationTelemetry() {
  return {
    observation_count: 0,
    average_confidence: null,
    min_confidence: null,
    max_confidence: null,
    low_confidence_count: 0,
    with_frame_age_count: 0,
    without_frame_age_count: 0,
    average_frame_age_ms: null,
    min_frame_age_ms: null,
    max_frame_age_ms: null,
    with_frame_reference_count: 0,
    with_ocr_summary_count: 0,
    with_ui_focus_areas_count: 0,
    raw_frame_available_count: 0,
  };
}

function createObservationTelemetry(observations) {
  if (!Array.isArray(observations) || observations.length === 0) {
    return emptyObservationTelemetry();
  }
  const confidences = observations
    .map((observation) => Number(observation.screen_confidence))
    .filter((number) => Number.isFinite(number));
  const averageConfidence =
    confidences.length > 0
      ? confidences.reduce((sum, number) => sum + number, 0) / confidences.length
      : null;
  const frameAges = observations
    .map((observation) => Number(observation.frame_age_ms))
    .filter((number) => Number.isFinite(number) && number >= 0);
  const averageFrameAge =
    frameAges.length > 0
      ? frameAges.reduce((sum, number) => sum + number, 0) / frameAges.length
      : null;
  return {
    observation_count: observations.length,
    average_confidence: safeOptionalNumber(averageConfidence),
    min_confidence: confidences.length > 0 ? safeOptionalNumber(Math.min(...confidences)) : null,
    max_confidence: confidences.length > 0 ? safeOptionalNumber(Math.max(...confidences)) : null,
    low_confidence_count: confidences.filter((number) => number < 0.35).length,
    with_frame_age_count: frameAges.length,
    without_frame_age_count: Math.max(0, observations.length - frameAges.length),
    average_frame_age_ms: safeOptionalNumber(averageFrameAge),
    min_frame_age_ms: frameAges.length > 0 ? safeOptionalNumber(Math.min(...frameAges)) : null,
    max_frame_age_ms: frameAges.length > 0 ? safeOptionalNumber(Math.max(...frameAges)) : null,
    with_frame_reference_count: observations.filter(
      (observation) => observation.frame_reference_id || observation.frame_id
    ).length,
    with_ocr_summary_count: observations.filter((observation) => observation.ocr_text_summary)
      .length,
    with_ui_focus_areas_count: observations.filter(
      (observation) =>
        Array.isArray(observation.ui_focus_areas) && observation.ui_focus_areas.length > 0
    ).length,
    raw_frame_available_count: observations.filter(
      (observation) => observation.raw_frame_available === true
    ).length,
  };
}

function classifyGameObservationError(error) {
  if (error?.name === "AbortError") return "http_game_observation_timeout";
  if (error instanceof ContractError) {
    if (error.details?.error_kind === "local_endpoint_policy_blocked") {
      return "local_endpoint_policy_blocked";
    }
    if (typeof error.details?.status === "number") return "http_game_observation_http_status";
    if (String(error.message ?? "").includes("requires JSON")) {
      return "http_game_observation_invalid_json";
    }
    if (String(error.message ?? "").includes("read-only")) {
      return "http_game_observation_unsafe_payload";
    }
    return "http_game_observation_contract_error";
  }
  return "http_game_observation_request_error";
}

function shouldWaitForErrorBackoff({ status, nowMs }) {
  if (!status.next_retry_after_ms) return false;
  return nowMs() < status.next_retry_after_ms;
}

function applyErrorBackoff({ status, nowMs, errorBackoffPolicy }) {
  const failedAtMs = nowMs();
  const nextCount = clampInteger(status.consecutive_error_count + 1, 1, 1000, 1);
  const baseBackoffMs = clampInteger(
    errorBackoffPolicy?.base_backoff_ms ?? 5000,
    0,
    3_600_000,
    5000
  );
  const maxBackoffMs = clampInteger(
    errorBackoffPolicy?.max_backoff_ms ?? baseBackoffMs,
    0,
    24 * 3_600_000,
    baseBackoffMs
  );
  const backoffMs =
    baseBackoffMs <= 0
      ? 0
      : Math.min(maxBackoffMs, baseBackoffMs * 2 ** Math.min(nextCount - 1, 16));
  status.last_error_at_ms = failedAtMs;
  status.consecutive_error_count = nextCount;
  status.next_retry_after_ms = backoffMs > 0 ? failedAtMs + backoffMs : null;
}

function buildCaptureRequest(request) {
  const source = request && typeof request === "object" && !Array.isArray(request) ? request : {};
  const captureRequest = {
    schema: "iris_vision_capture_request_v1",
    request_kind: "screen_observation_summary",
    capture_region: normalizeCaptureRegion(source.capture_region),
    include_ocr_summary: source.include_ocr_summary !== false,
    include_ui_focus_areas: source.include_ui_focus_areas !== false,
    max_detected_events: clampInteger(source.max_detected_events ?? 8, 1, 12, 8),
    raw_frame_policy: "do_not_return_raw_frame_to_core",
  };
  assertReadOnlyVisionBridgePayload(captureRequest, "HTTP game observation capture request");
  return captureRequest;
}

function normalizeCaptureRegion(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    x: safeRegionNumber(value.x, { min: 0, max: 16_384 }),
    y: safeRegionNumber(value.y, { min: 0, max: 16_384 }),
    width: safeRegionNumber(value.width ?? value.w, { min: 1, max: 16_384 }),
    height: safeRegionNumber(value.height ?? value.h, { min: 1, max: 16_384 }),
  };
}

function parseJsonResponse(text) {
  const raw = String(text ?? "");
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new ContractError("HTTP game observation source requires JSON response");
  }
}

function extractObservations(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.observations)) return parsed.observations;
  if (parsed.observation && typeof parsed.observation === "object") return [parsed.observation];
  return [parsed];
}

function toGameObservationInput(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ContractError("HTTP game observation item must be an object");
  }
  const vision = raw.vision && typeof raw.vision === "object" && !Array.isArray(raw.vision)
    ? raw.vision
    : {};
  const frame = raw.frame && typeof raw.frame === "object" && !Array.isArray(raw.frame)
    ? raw.frame
    : {};
  const observation = {
    trace_id: safeOptionalText(raw.trace_id),
    event_id: safeOptionalText(raw.event_id),
    timestamp_ms: raw.timestamp_ms,
    game_title: safeText(raw.game_title ?? raw.title ?? vision.game_title ?? "unknown_game", 120),
    scene_summary: safeText(
      raw.scene_summary ?? raw.summary ?? raw.text ?? vision.scene_summary ?? vision.summary ?? "No scene summary.",
      500
    ),
    detected_events: firstStringList([
      raw.detected_events,
      raw.events,
      raw.labels,
      raw.objects,
      vision.detected_events,
      vision.events,
      vision.labels,
      vision.objects,
    ]),
    player_state: safeText(raw.player_state ?? vision.player_state ?? "", 220),
    screen_confidence: raw.screen_confidence ?? raw.confidence ?? vision.confidence ?? 0.5,
    vision_source_kind: safeText(raw.vision_source_kind ?? raw.source_kind ?? vision.source_kind ?? "", 80),
    frame_id: safeText(raw.frame_id ?? vision.frame_id ?? frame.id ?? "", 120),
    frame_reference_id: safeText(
      raw.frame_reference_id ?? vision.frame_reference_id ?? frame.reference_id ?? "",
      120
    ),
    frame_timestamp_ms: raw.frame_timestamp_ms ?? vision.frame_timestamp_ms ?? frame.timestamp_ms,
    frame_age_ms: raw.frame_age_ms ?? vision.frame_age_ms ?? frame.age_ms,
    capture_region: raw.capture_region ?? vision.capture_region ?? frame.capture_region ?? null,
    ocr_text_summary: safeText(raw.ocr_text_summary ?? vision.ocr_text_summary ?? frame.ocr_text_summary ?? "", 220),
    ui_focus_areas: firstStringList([
      raw.ui_focus_areas,
      raw.focus_areas,
      vision.ui_focus_areas,
      vision.focus_areas,
      frame.ui_focus_areas,
    ]),
    raw_frame_available: Object.hasOwn(raw, "raw_frame"),
  };
  if (!observation.trace_id) delete observation.trace_id;
  if (!observation.event_id) delete observation.event_id;
  if (observation.timestamp_ms === undefined || observation.timestamp_ms === null) {
    delete observation.timestamp_ms;
  }
  return observation;
}

function firstStringList(values) {
  for (const value of values) {
    const list = normalizeStringList(value);
    if (list.length > 0) return list;
  }
  return [];
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      typeof item === "object" && item !== null
        ? item.label ?? item.name ?? item.kind ?? item.id ?? ""
        : item
    )
    .map((item) => safeText(item, 80))
    .filter(Boolean)
    .slice(0, 8);
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

function safeOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}

function safeRegionNumber(value, { min, max }) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(Math.max(min, Math.min(max, number)).toFixed(4));
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function assertReadOnlyVisionBridgePayload(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertReadOnlyVisionBridgePayload(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_VISION_BRIDGE_FIELDS.has(field)) {
      throw new ContractError(`${context}: observation bridge must be read-only`, {
        field,
        path,
      });
    }
    assertReadOnlyVisionBridgePayload(child, context, `${path}.${field}`);
  }
}
