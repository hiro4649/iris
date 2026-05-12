import { randomUUID } from "node:crypto";
import { ContractError } from "../../core/contracts.js";

const FORBIDDEN_MEDIA_FIELDS = new Set([
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

export function normalizeMediaWatchObservation(raw = {}) {
  assertMediaWatchInputSafe(raw);
  const mediaTitle = cleanText(raw.media_title ?? raw.mediaTitle ?? "unknown_title");
  const observationSummary = cleanText(
    raw.observation_summary ?? raw.observationSummary ?? raw.text ?? "Media is visible."
  );
  const detectedMood = cleanText(raw.detected_mood ?? raw.detectedMood ?? "neutral");
  const eventId =
    raw.event_id ?? raw.eventId ?? raw.platform_event_id ?? raw.platformEventId ?? raw.id ?? randomUUID();
  return {
    trace_id: raw.trace_id ?? raw.traceId ?? randomUUID(),
    event_id: eventId,
    source: "media_watch",
    timestamp_ms: normalizeTimestampMs(
      raw.timestamp_ms ?? raw.timestampMs ?? raw.observed_at_ms ?? raw.observedAtMs ?? raw.observedAt ?? raw.createdAt
    ),
    target_presence_id: "presence:media-main",
    payload: {
      payload_kind: "media_watch_observation",
      text: buildMediaText({
        mediaTitle,
        observationSummary,
        detectedMood,
      }),
      media_kind: cleanText(raw.media_kind ?? raw.mediaKind ?? "unknown_media"),
      media_title: mediaTitle,
      creator_or_channel: cleanText(raw.creator_or_channel ?? raw.creatorOrChannel ?? "unknown_creator"),
      platform: cleanText(raw.platform ?? "unknown_platform"),
      observation_summary: observationSummary,
      detected_mood: detectedMood,
      confidence: clamp01(Number(raw.confidence ?? 0.5)),
      rights_risk_note: cleanText(raw.rights_risk_note ?? raw.rightsRiskNote ?? "unknown"),
    },
  };
}

function assertMediaWatchInputSafe(raw) {
  assertNoForbiddenFieldsRecursive(raw, "media watch observation");
}

function assertNoForbiddenFieldsRecursive(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFieldsRecursive(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_MEDIA_FIELDS.has(field)) {
      throw new ContractError(`${context} must be read-only and rights-safe`, { field, path });
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}

function buildMediaText({ mediaTitle, observationSummary, detectedMood }) {
  return `Media watch observation for ${mediaTitle}: ${observationSummary}. Mood: ${detectedMood}.`;
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeTimestampMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
}
