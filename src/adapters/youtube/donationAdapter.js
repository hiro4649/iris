import { randomUUID } from "node:crypto";
import { ContractError } from "../../core/contracts.js";

const FORBIDDEN_DONATION_FIELDS = new Set([
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
const SUPPORT_EVENT_TYPE_ALIASES = new Map([
  ["paidmessageevent", "superChatEvent"],
  ["paidmessage", "superChatEvent"],
  ["paid_message", "superChatEvent"],
  ["superchat", "superChatEvent"],
  ["super_chat", "superChatEvent"],
  ["paidstickerevent", "superStickerEvent"],
  ["paidsticker", "superStickerEvent"],
  ["paid_sticker", "superStickerEvent"],
  ["supersticker", "superStickerEvent"],
  ["super_sticker", "superStickerEvent"],
  ["superthanks", "superThanksEvent"],
  ["super_thanks", "superThanksEvent"],
  ["sponsorevent", "newSponsorEvent"],
  ["sponsor", "newSponsorEvent"],
  ["membership", "newSponsorEvent"],
  ["membershipevent", "newSponsorEvent"],
  ["newmemberevent", "newSponsorEvent"],
  ["newmembershipevent", "newSponsorEvent"],
  ["new_member", "newSponsorEvent"],
  ["new_membership", "newSponsorEvent"],
  ["membermilestoneevent", "memberMilestoneChatEvent"],
  ["membershipmilestoneevent", "memberMilestoneChatEvent"],
  ["member_milestone", "memberMilestoneChatEvent"],
  ["membership_milestone", "memberMilestoneChatEvent"],
  ["membershipgiftevent", "membershipGiftingEvent"],
  ["membershipgift", "membershipGiftingEvent"],
  ["membership_gift", "membershipGiftingEvent"],
  ["membershipgifting", "membershipGiftingEvent"],
  ["giftmembershipevent", "membershipGiftingEvent"],
  ["giftmembershipsevent", "membershipGiftingEvent"],
  ["giftedmembershipevent", "membershipGiftingEvent"],
  ["giftmembershipreceived", "giftMembershipReceivedEvent"],
  ["giftmembershipreceivedevent", "giftMembershipReceivedEvent"],
  ["gift_received_membership", "giftMembershipReceivedEvent"],
  ["receivedmembershipgift", "giftMembershipReceivedEvent"],
  ["normalizedsupportevent", "normalizedSupportEvent"],
  ["supportevent", "normalizedSupportEvent"],
  ["support_event", "normalizedSupportEvent"],
  ["donation", "normalizedSupportEvent"],
]);

export function normalizeYouTubeDonation(raw = {}) {
  assertDonationEventInputSafe(raw);
  const traceId = cleanText(raw.trace_id ?? raw.traceId ?? "", 180);
  const eventId = cleanText(
    raw.event_id ?? raw.eventId ?? raw.platform_event_id ?? raw.platformEventId ?? raw.id ?? "",
    180
  );
  const platformEventId = cleanText(
    raw.platform_event_id ?? raw.platformEventId ?? raw.event_id ?? raw.eventId ?? raw.id ?? "",
    180
  );
  const messageText = cleanText(
    raw.message_text ??
      raw.messageText ??
      raw.displayMessage ??
      raw.textOriginal ??
      raw.textDisplay ??
      raw.text ??
      "",
    500
  );
  return {
    trace_id: traceId || randomUUID(),
    event_id: eventId || randomUUID(),
    source: "youtube_donation",
    timestamp_ms: normalizeTimestampMs(raw.timestamp_ms ?? raw.timestampMs ?? raw.publishedAt ?? raw.createdAt),
    target_presence_id: "presence:youtube-main",
    payload: {
      payload_kind: "donation_event",
      platform_event_id: platformEventId,
      author_channel_id:
        cleanText(raw.author_channel_id ?? raw.authorChannelId ?? "unknown", 160) || "unknown",
      display_name: cleanText(raw.display_name ?? raw.displayName ?? "viewer", 120) || "viewer",
      text: messageText || "Thank you for the support.",
      message_text: messageText,
      amount_tier: normalizeAmountTier(selectAmountTierInput(raw)),
      amount_source_kind: normalizeAmountSourceKind(selectAmountSourceKindInput(raw)),
      currency: cleanText(raw.currency ?? "unknown", 24) || "unknown",
      support_event_type: normalizeSupportEventType(
        raw.support_event_type ?? raw.supportEventType ?? raw.type ?? "donation"
      ),
      is_public_event: raw.is_public_event !== false,
    },
  };
}

function selectAmountSourceKindInput(raw) {
  if (raw.amount_source_kind ?? raw.amountSourceKind) {
    return raw.amount_source_kind ?? raw.amountSourceKind;
  }
  if (raw.amount_micros ?? raw.amountMicros) return "micros";
  if (
    raw.amount_display_string ??
    raw.amountDisplayString ??
    raw.amount_string ??
    raw.amountString ??
    raw.display_amount ??
    raw.formattedAmount ??
    raw.displayAmount
  ) {
    return "formatted";
  }
  if (
    raw.giftMembershipsCount ??
    raw.giftMembershipCount ??
    raw.giftedMembershipCount ??
    raw.gift_memberships_count ??
    raw.gift_membership_count ??
    raw.gift_count ??
    raw.giftCount ??
    raw.memberCount ??
    raw.member_count
  ) {
    return "membership_count";
  }
  if (raw.amount_tier ?? raw.amountTier) return "tier";
  return "unknown";
}

function selectAmountTierInput(raw) {
  return (
    raw.amount_tier ??
    raw.amountTier ??
    raw.amount_micros ??
    raw.amountMicros ??
    raw.amount_display_string ??
    raw.amountDisplayString ??
    raw.amount_string ??
    raw.amountString ??
    raw.display_amount ??
    raw.formattedAmount ??
    raw.displayAmount ??
    raw.giftMembershipsCount ??
    raw.giftMembershipCount ??
    raw.giftedMembershipCount ??
    raw.gift_memberships_count ??
    raw.gift_membership_count ??
    raw.gift_count ??
    raw.giftCount ??
    raw.memberCount ??
    raw.member_count ??
    raw.amount ??
    "unknown"
  );
}

function assertDonationEventInputSafe(raw) {
  assertNoForbiddenFieldsRecursive(raw, "donation event");
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
    if (FORBIDDEN_DONATION_FIELDS.has(field)) {
      throw new ContractError("donation event must not contain command, commit, or score fields", {
        field,
        path,
      });
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}

function normalizeAmountTier(value) {
  const text = String(value ?? "unknown").toLowerCase();
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (numeric >= 10000) return "large";
    if (numeric >= 1000) return "medium";
    if (numeric > 0) return "small";
  }
  const formattedNumeric = Number(text.replace(/[^0-9.]/g, ""));
  if (Number.isFinite(formattedNumeric) && formattedNumeric > 0) {
    if (formattedNumeric >= 10000) return "large";
    if (formattedNumeric >= 1000) return "medium";
    return "small";
  }
  if (["small", "medium", "large", "unknown"].includes(text)) return text;
  if (/large|high|red|big/.test(text)) return "large";
  if (/medium|mid/.test(text)) return "medium";
  if (/small|low/.test(text)) return "small";
  return "unknown";
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

function normalizeSupportEventType(value) {
  const explicit = cleanText(value);
  if (!explicit || explicit === "textMessageEvent") return "normalizedSupportEvent";
  if (SUPPORT_EVENT_TYPES.has(explicit)) return explicit;
  const key = explicit
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return SUPPORT_EVENT_TYPE_ALIASES.get(key) ?? "normalizedSupportEvent";
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
