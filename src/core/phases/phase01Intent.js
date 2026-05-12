import {
  assertNoWorldCommand,
  canonical,
  ContractError,
  requireFields,
  assertCanonicalValue,
} from "../contracts.js";

const UNSAFE_VIEWER_IDENTITY_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url)\b|https?:\/\//i;

export function phase01Intent(event) {
  requireFields(event, ["trace_id", "event_id", "source", "timestamp_ms", "payload"], "Phase01 input");
  assertNoWorldCommand(event, "Phase01 input");

  const text = String(event.payload.text ?? "").trim();
  const authorChannelId = sanitizeAuthorChannelId(event.payload.author_channel_id);
  const displayName = sanitizeDisplayName(event.payload.display_name);
  const payload_kind = event.payload.payload_kind ?? "comment";
  if (payload_kind === "game_observation" && !Array.isArray(event.payload.detected_events)) {
    throw new ContractError("Phase01 game observation: detected events are required");
  }
  const game_context =
    payload_kind === "game_observation"
      ? {
          game_title: event.payload.game_title ?? "unknown_game",
          scene_summary: event.payload.scene_summary ?? "",
          detected_events: event.payload.detected_events,
          player_state: event.payload.player_state ?? "",
          screen_confidence: event.payload.screen_confidence ?? 0.5,
          vision_metadata: event.payload.vision_metadata ?? null,
        }
      : null;
  const donation_context =
    payload_kind === "donation_event"
      ? {
          platform_event_id: event.payload.platform_event_id ?? event.event_id,
          amount_tier: event.payload.amount_tier ?? "unknown",
          amount_source_kind: normalizeAmountSourceKind(event.payload.amount_source_kind),
          currency: event.payload.currency ?? "unknown",
          is_public_event: event.payload.is_public_event !== false,
          support_event_type: event.payload.support_event_type ?? "donation",
          message_text: String(event.payload.message_text ?? text).trim(),
        }
      : null;
  const media_watch_context =
    payload_kind === "media_watch_observation"
      ? {
          media_kind: event.payload.media_kind ?? "unknown_media",
          media_title: event.payload.media_title ?? "unknown_title",
          creator_or_channel: event.payload.creator_or_channel ?? "unknown_creator",
          platform: event.payload.platform ?? "unknown_platform",
          observation_summary: event.payload.observation_summary ?? text,
          detected_mood: event.payload.detected_mood ?? "neutral",
          confidence: event.payload.confidence ?? 0.5,
          rights_risk_note: event.payload.rights_risk_note ?? "unknown",
        }
      : null;
  const external_topic_context =
    payload_kind === "external_topic_observation"
      ? {
          topic_title: event.payload.topic_title ?? "unknown topic",
          topic_summary: event.payload.topic_summary ?? text,
          source_url: event.payload.source_url ?? "",
          retrieved_at_ms: event.payload.retrieved_at_ms ?? event.timestamp_ms,
          freshness_score: event.payload.freshness_score ?? 0.5,
          source_trust_score: event.payload.source_trust_score ?? 0.5,
          risk_category: event.payload.risk_category ?? "general",
        }
      : null;
  const intent =
    payload_kind === "presence_idle"
      ? "ignore"
    : payload_kind === "game_observation"
      ? "observe"
      : payload_kind === "media_watch_observation"
        ? "observe"
        : payload_kind === "external_topic_observation"
          ? "respond"
        : payload_kind === "donation_event"
          ? "respond"
      : text.length === 0
        ? "ignore"
        : /イリス|IRIS/i.test(text)
          ? "respond"
          : "observe";
  assertCanonicalValue("intent", intent, canonical.intents);

  return {
    trace_id: event.trace_id,
    event_id: event.event_id,
    source: event.source,
    intent,
    linked_identity_id: authorChannelId === "unknown" ? null : `viewer:${authorChannelId}`,
    display_name: displayName,
    payload_kind,
    game_context,
    donation_context,
    media_watch_context,
    external_topic_context,
    target_presence_id: event.target_presence_id ?? "presence:main",
    timestamp_ms: event.timestamp_ms,
    normalized_text: text,
  };
}

function sanitizeAuthorChannelId(value) {
  const text = String(value ?? "unknown").trim().slice(0, 160);
  if (!text || UNSAFE_VIEWER_IDENTITY_PATTERN.test(text)) return "unknown";
  const safeId = text.replace(/[^a-zA-Z0-9._:-]/g, "_").replace(/_+/g, "_").slice(0, 160);
  return safeId || "unknown";
}

function sanitizeDisplayName(value) {
  const text = String(value ?? "viewer")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!text || UNSAFE_VIEWER_IDENTITY_PATTERN.test(text)) return "viewer";
  return text;
}

function normalizeAmountSourceKind(value) {
  const text = String(value ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (["micros", "formatted", "tier", "membership_count", "unknown"].includes(text)) {
    return text;
  }
  return "unknown";
}
