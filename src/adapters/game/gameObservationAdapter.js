import { randomUUID } from "node:crypto";
import { assertCandidateNotExecutable, ContractError } from "../../core/contracts.js";

const FORBIDDEN_GAME_COMMAND_FIELDS = [
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
  "raw_frame",
  "raw_image",
  "image_base64",
  "screenshot_base64",
  "frame_pixels",
  "pixel_data",
  "ocr_raw_text",
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
];

export function normalizeGameObservation(raw = {}) {
  assertReadOnlyGameObservation(raw);

  const gameTitle = cleanText(raw.game_title ?? raw.gameTitle ?? raw.title ?? "unknown_game", 120);
  const sceneSummary = cleanText(
    raw.scene_summary ?? raw.sceneSummary ?? raw.summary ?? raw.text ?? "No scene summary.",
    500
  );
  const rawDetectedEvents = raw.detected_events ?? raw.detectedEvents;
  const detectedEvents = Array.isArray(rawDetectedEvents)
    ? rawDetectedEvents.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 8)
    : [];
  const playerState = cleanText(raw.player_state ?? raw.playerState ?? "", 220);
  const screenConfidence = clamp01(Number(raw.screen_confidence ?? raw.screenConfidence ?? raw.confidence ?? 0.5));
  const visionMetadata = buildVisionMetadata(raw);
  const traceId = cleanText(raw.trace_id ?? raw.traceId ?? "", 180);
  const eventId = cleanText(
    raw.event_id ?? raw.eventId ?? raw.platform_event_id ?? raw.platformEventId ?? raw.id ?? "",
    180
  );

  return {
    trace_id: traceId || randomUUID(),
    event_id: eventId || randomUUID(),
    source: "game_observation",
    timestamp_ms: normalizeTimestampMs(
      raw.timestamp_ms ?? raw.timestampMs ?? raw.observed_at_ms ?? raw.observedAtMs ?? raw.observedAt ?? raw.createdAt
    ),
    target_presence_id: "presence:game-main",
    payload: {
      payload_kind: "game_observation",
      text: buildObservationText({ gameTitle, sceneSummary, detectedEvents, playerState }),
      game_title: gameTitle,
      scene_summary: sceneSummary,
      detected_events: detectedEvents,
      player_state: playerState,
      screen_confidence: screenConfidence,
      vision_metadata: visionMetadata,
    },
  };
}

export function createInputActionCandidate({
  observationEvent,
  suggested_action,
  reason,
  confidence = 0.5,
} = {}) {
  if (!observationEvent) {
    throw new ContractError("input action candidate requires an observation event");
  }
  const candidate = {
    candidate_kind: "input_action_candidate",
    requires_validation: true,
    trace_id: observationEvent.trace_id,
    source_event_id: observationEvent.event_id,
    game_title: observationEvent.payload?.game_title ?? "unknown_game",
    suggested_action: cleanText(suggested_action ?? "wait"),
    reason: cleanText(reason ?? "No reason provided."),
    confidence: clamp01(Number(confidence)),
  };
  assertCandidateNotExecutable(candidate, "Game input_action_candidate");
  return candidate;
}

function assertReadOnlyGameObservation(raw, path = "root") {
  if (!raw || typeof raw !== "object") return;
  if (Array.isArray(raw)) {
    raw.forEach((item, index) => assertReadOnlyGameObservation(item, `${path}[${index}]`));
    return;
  }
  for (const field of FORBIDDEN_GAME_COMMAND_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(raw, field)) {
      throw new ContractError("game observation must be read-only", { field, path });
    }
  }
  for (const [field, child] of Object.entries(raw)) {
    assertReadOnlyGameObservation(child, `${path}.${field}`);
  }
}

function buildObservationText({ gameTitle, sceneSummary, detectedEvents, playerState }) {
  const events = detectedEvents.length > 0 ? ` Events: ${detectedEvents.join(", ")}.` : "";
  const player = playerState ? ` Player: ${playerState}.` : "";
  return `Game observation for ${gameTitle}: ${sceneSummary}.${events}${player}`;
}

function buildVisionMetadata(raw) {
  const vision = raw.vision && typeof raw.vision === "object" ? raw.vision : {};
  const frame = raw.frame && typeof raw.frame === "object" ? raw.frame : {};
  const captureRegion =
    raw.capture_region ?? raw.captureRegion ?? vision.capture_region ?? vision.captureRegion ?? frame.capture_region ?? frame.captureRegion;
  const uiFocusAreas =
    raw.ui_focus_areas ?? raw.uiFocusAreas ?? vision.ui_focus_areas ?? vision.uiFocusAreas ?? frame.ui_focus_areas ?? frame.uiFocusAreas;
  return {
    schema: "iris_vision_observation_metadata_v1",
    source_kind: cleanText(raw.vision_source_kind ?? raw.visionSourceKind ?? vision.source_kind ?? vision.sourceKind ?? "unknown_vision_source").slice(0, 80),
    frame_id: cleanText(raw.frame_id ?? raw.frameId ?? vision.frame_id ?? vision.frameId ?? frame.id ?? "").slice(0, 120),
    frame_reference_id: cleanText(
      raw.frame_reference_id ?? raw.frameReferenceId ?? vision.frame_reference_id ?? vision.frameReferenceId ?? frame.reference_id ?? frame.referenceId ?? ""
    ).slice(0, 120),
    frame_timestamp_ms: safeNullableNumber(
      raw.frame_timestamp_ms ?? raw.frameTimestampMs ?? vision.frame_timestamp_ms ?? vision.frameTimestampMs ?? frame.timestamp_ms ?? frame.timestampMs
    ),
    frame_age_ms: safeNullableNumber(raw.frame_age_ms ?? raw.frameAgeMs ?? vision.frame_age_ms ?? vision.frameAgeMs ?? frame.age_ms ?? frame.ageMs),
    capture_region: normalizeCaptureRegion(captureRegion),
    ocr_text_summary: cleanText(
      raw.ocr_text_summary ?? raw.ocrTextSummary ?? vision.ocr_text_summary ?? vision.ocrTextSummary ?? frame.ocr_text_summary ?? frame.ocrTextSummary ?? "",
      220
    ),
    ui_focus_areas: Array.isArray(uiFocusAreas)
      ? uiFocusAreas.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 8)
      : [],
    raw_frame_available:
      raw.raw_frame_available === true ||
      vision.raw_frame_available === true ||
      Object.hasOwn(raw, "raw_frame") ||
      Object.hasOwn(vision, "raw_frame"),
    raw_frame_policy: "raw_frame_not_passed_to_core",
  };
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

function cleanText(value, maxLength = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeNullableNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}

function normalizeTimestampMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function safeRegionNumber(value, { min, max }) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(Math.max(min, Math.min(max, number)).toFixed(4));
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
}
