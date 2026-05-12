import { randomUUID } from "node:crypto";
import { ContractError } from "../../core/contracts.js";

const FORBIDDEN_COMMENT_FIELDS = new Set([
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
]);
const SUPPORT_DETAIL_FIELDS = new Set([
  "superChatDetails",
  "superStickerDetails",
  "superThanksDetails",
  "paidMessageDetails",
  "paidStickerDetails",
  "memberMilestoneChatDetails",
  "newSponsorDetails",
  "sponsorDetails",
  "sponsorshipDetails",
  "membershipDetails",
  "membershipGiftingDetails",
  "giftMembershipReceivedDetails",
  "membershipGiftDetails",
  "giftMembershipDetails",
  "giftDetails",
  "support_details",
  "supportDetails",
]);
const SUPPORT_AMOUNT_FIELDS = new Set([
  "amount_tier",
  "amountTier",
  "tier",
  "amount",
  "amount_micros",
  "amountMicros",
  "amount_display_string",
  "amountDisplayString",
  "formattedAmount",
  "displayAmount",
  "giftMembershipsCount",
  "giftMembershipCount",
  "giftedMembershipCount",
  "gift_memberships_count",
  "gift_membership_count",
  "gift_count",
  "giftCount",
  "memberCount",
  "member_count",
]);
const SUPPORT_TYPE_FIELDS = new Set([
  "type",
  "event_type",
  "eventType",
  "support_event_type",
  "supportEventType",
]);
const SUPPORT_EVENT_TYPES = new Set([
  "superChatEvent",
  "superStickerEvent",
  "superThanksEvent",
  "newSponsorEvent",
  "memberMilestoneChatEvent",
  "membershipGiftingEvent",
  "giftMembershipReceivedEvent",
  "normalizedSupportEvent",
]);
const SUPPORT_EVENT_TYPE_ALIASES = new Set([
  "paidmessageevent",
  "paidmessage",
  "paid_message",
  "superchat",
  "super_chat",
  "paidstickerevent",
  "paidsticker",
  "paid_sticker",
  "supersticker",
  "super_sticker",
  "superthanks",
  "super_thanks",
  "sponsorevent",
  "sponsor",
  "membership",
  "membershipevent",
  "newmemberevent",
  "newmembershipevent",
  "new_member",
  "new_membership",
  "membermilestoneevent",
  "membershipmilestoneevent",
  "member_milestone",
  "membership_milestone",
  "membershipgiftevent",
  "membershipgift",
  "membership_gift",
  "membershipgifting",
  "giftmembershipevent",
  "giftmembershipsevent",
  "giftedmembershipevent",
  "giftmembershipreceived",
  "giftmembershipreceivedevent",
  "gift_received_membership",
  "receivedmembershipgift",
  "normalizedsupportevent",
  "supportevent",
  "support_event",
  "donation",
]);

export function normalizeYouTubeComment(raw) {
  assertCommentInputSafe(raw);
  const eventId = cleanText(
    raw.event_id ?? raw.eventId ?? raw.platform_event_id ?? raw.platformEventId ?? raw.id ?? "",
    180
  );
  const traceId = cleanText(raw.trace_id ?? raw.traceId ?? "", 180);
  return {
    trace_id: traceId || randomUUID(),
    event_id: eventId || randomUUID(),
    source: "youtube_live_chat",
    timestamp_ms: normalizeTimestampMs(raw.timestamp_ms ?? raw.timestampMs ?? raw.publishedAt ?? raw.createdAt),
    target_presence_id: "presence:youtube-main",
    payload: {
      author_channel_id:
        cleanText(raw.author_channel_id ?? raw.authorChannelId ?? "unknown", 160) || "unknown",
      display_name: cleanText(raw.display_name ?? raw.displayName ?? "viewer", 120) || "viewer",
      text: cleanText(
        raw.text ?? raw.message_text ?? raw.messageText ?? raw.textOriginal ?? raw.textDisplay ?? "",
        500
      ),
    },
  };
}

function assertCommentInputSafe(value, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertCommentInputSafe(item, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_COMMENT_FIELDS.has(field)) {
      throw new ContractError("YouTube comment input must be read-only", { field, path });
    }
    if (isStructuredSupportMarker(field, child)) {
      throw new ContractError(
        "YouTube comment input must not contain structured support event fields",
        { field, path }
      );
    }
    assertCommentInputSafe(child, `${path}.${field}`);
  }
}

function isStructuredSupportMarker(field, value) {
  if (SUPPORT_DETAIL_FIELDS.has(field)) return value !== undefined && value !== null;
  if (SUPPORT_AMOUNT_FIELDS.has(field)) return value !== undefined && value !== null && value !== "";
  if (field === "payload_kind" || field === "payloadKind") {
    return normalizeMarker(value) === "donation_event";
  }
  if (field === "kind" || field === "event_kind" || field === "eventKind") {
    return ["donation", "support_event", "youtube_donation"].includes(normalizeMarker(value));
  }
  if (field === "source") {
    return normalizeMarker(value) === "youtube_donation";
  }
  if (SUPPORT_TYPE_FIELDS.has(field)) return isSupportEventType(value);
  return false;
}

function isSupportEventType(value) {
  const text = cleanText(value, 80);
  if (!text || text === "textMessageEvent") return false;
  if (SUPPORT_EVENT_TYPES.has(text)) return true;
  const key = text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return SUPPORT_EVENT_TYPE_ALIASES.has(key);
}

function normalizeMarker(value) {
  return cleanText(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizeTimestampMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function cleanText(value, maxLength = 500) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
