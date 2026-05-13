import { randomUUID } from "node:crypto";
import { ContractError } from "../../core/contracts.js";
import { phase01Intent } from "../../core/phases/phase01Intent.js";
import { normalizeYouTubeComment } from "./commentAdapter.js";

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
const YOUTUBE_SUPPORT_SEPARATION_E2E_SUMMARY_FIELDS = new Set([
  "schema",
  "chat_source",
  "chat_payload_kind",
  "support_source",
  "support_payload_kind",
  "chat_phase01_intent",
  "support_phase01_intent",
  "support_candidate_boundary",
  "chat_support_mixed",
  "support_direct_commit_allowed",
  "trace_ids_present",
  "event_ids_present",
  "boundary_policy",
  "adapter_validation_required",
]);
const YOUTUBE_MODERATION_E2E_SUMMARY_FIELDS = new Set([
  "schema",
  "comment_source",
  "support_source",
  "comment_precheck_status",
  "support_precheck_status",
  "comment_personalized_reaction_allowed",
  "support_personalized_reaction_allowed",
  "relationship_growth_allowed",
  "relationship_growth_suppressed",
  "candidate_boundary_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const DONATION_MEMORY_RELATIONSHIP_E2E_SUMMARY_FIELDS = new Set([
  "schema",
  "support_source",
  "support_payload_kind",
  "gratitude_status",
  "memory_candidate_status",
  "relationship_candidate_status",
  "relationship_commit_allowed",
  "amount_policy_status",
  "amount_only_relationship_commit_allowed",
  "paid_priority_wording_allowed",
  "boundary_policy",
  "adapter_validation_required",
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

export function createYouTubeSupportEventSeparationE2ESummary({
  chatEvent,
  supportEvent,
} = {}) {
  const normalizedChat = normalizeYouTubeComment(chatEvent ?? {});
  const normalizedSupport = normalizeYouTubeDonation(supportEvent ?? {});
  const chatPhase01 = phase01Intent(normalizedChat);
  const supportPhase01 = phase01Intent(normalizedSupport);
  const summary = {
    schema: "iris_youtube_support_event_separation_e2e_summary_v1",
    chat_source: normalizedChat.source === "youtube_live_chat" ? "youtube_live_chat" : "unknown",
    chat_payload_kind: chatPhase01.payload_kind === "comment" ? "comment" : "unknown",
    support_source: normalizedSupport.source === "youtube_donation" ? "youtube_donation" : "unknown",
    support_payload_kind:
      supportPhase01.payload_kind === "donation_event" ? "donation_event" : "unknown",
    chat_phase01_intent: summarizePhase01Intent(chatPhase01.intent),
    support_phase01_intent: summarizePhase01Intent(supportPhase01.intent),
    support_candidate_boundary:
      supportPhase01.payload_kind === "donation_event" ? "candidate_boundary_required" : "blocked",
    chat_support_mixed: false,
    support_direct_commit_allowed: false,
    trace_ids_present:
      cleanText(chatPhase01.trace_id, 180) !== "" &&
      cleanText(supportPhase01.trace_id, 180) !== "",
    event_ids_present:
      cleanText(chatPhase01.event_id, 180) !== "" &&
      cleanText(supportPhase01.event_id, 180) !== "",
    boundary_policy: {
      safe_status_labels_only: true,
      chat_and_support_routes_separated: true,
      donation_candidate_boundary_required: true,
      direct_relationship_commit_forbidden: true,
      no_raw_comment_text: true,
      no_raw_support_text: true,
      no_amount_values: true,
      no_private_author_ids: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeSupportEventSeparationE2ESummarySafe(summary);
  return summary;
}

export function assertYouTubeSupportEventSeparationE2ESummarySafe(
  summary,
  context = "YouTube support event separation E2E summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary must be an object`);
  }
  for (const field of Object.keys(summary)) {
    if (!YOUTUBE_SUPPORT_SEPARATION_E2E_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (summary.schema !== "iris_youtube_support_event_separation_e2e_summary_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: summary.schema });
  }
  if (
    summary.chat_source !== "youtube_live_chat" ||
    summary.chat_payload_kind !== "comment" ||
    summary.support_source !== "youtube_donation" ||
    summary.support_payload_kind !== "donation_event"
  ) {
    throw new ContractError(`${context}: chat/support routes must remain separated`);
  }
  if (summary.support_candidate_boundary !== "candidate_boundary_required") {
    throw new ContractError(`${context}: support candidate boundary required`);
  }
  if (summary.chat_support_mixed !== false || summary.support_direct_commit_allowed !== false) {
    throw new ContractError(`${context}: support event cannot mix with chat or direct commit`);
  }
  for (const field of ["trace_ids_present", "event_ids_present", "adapter_validation_required"]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: required true field missing`, { field });
    }
  }
  assertSupportSeparationBoundaryPolicySafe(summary.boundary_policy, context);
  assertNoUnsafeSupportSeparationSummaryMaterial(summary, context);
}

export function createYouTubeModerationE2ESummary({
  commentEvent,
  supportEvent,
  commentModerationStatus = "blocked",
  supportModerationStatus = "blocked",
} = {}) {
  const normalizedComment = normalizeYouTubeComment(commentEvent ?? {});
  const normalizedSupport = normalizeYouTubeDonation(supportEvent ?? {});
  const commentStatus = safeModerationPrecheckStatus(commentModerationStatus);
  const supportStatus = safeModerationPrecheckStatus(supportModerationStatus);
  const commentAllowed = commentStatus === "allowed";
  const supportAllowed = supportStatus === "allowed";
  const summary = {
    schema: "iris_youtube_moderation_e2e_summary_v1",
    comment_source: normalizedComment.source === "youtube_live_chat" ? "youtube_live_chat" : "unknown",
    support_source: normalizedSupport.source === "youtube_donation" ? "youtube_donation" : "unknown",
    comment_precheck_status: commentStatus,
    support_precheck_status: supportStatus,
    comment_personalized_reaction_allowed: commentAllowed,
    support_personalized_reaction_allowed: supportAllowed,
    relationship_growth_allowed: commentAllowed && supportAllowed,
    relationship_growth_suppressed: !(commentAllowed && supportAllowed),
    candidate_boundary_status: supportAllowed ? "validation_required" : "blocked_by_moderation",
    boundary_policy: {
      moderation_precheck_required: true,
      personalized_reaction_requires_allowed: true,
      relationship_growth_requires_allowed: true,
      support_candidate_blocked_until_allowed: true,
      no_raw_comment_text: true,
      no_raw_support_text: true,
      no_private_author_ids: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeModerationE2ESummarySafe(summary);
  return summary;
}

export function assertYouTubeModerationE2ESummarySafe(
  summary,
  context = "YouTube moderation E2E summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary must be an object`);
  }
  for (const field of Object.keys(summary)) {
    if (!YOUTUBE_MODERATION_E2E_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (summary.schema !== "iris_youtube_moderation_e2e_summary_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: summary.schema });
  }
  if (summary.comment_source !== "youtube_live_chat" || summary.support_source !== "youtube_donation") {
    throw new ContractError(`${context}: invalid source labels`);
  }
  if (
    !["allowed", "watch", "limited", "blocked", "muted", "unconfirmed"].includes(
      summary.comment_precheck_status
    ) ||
    !["allowed", "watch", "limited", "blocked", "muted", "unconfirmed"].includes(
      summary.support_precheck_status
    )
  ) {
    throw new ContractError(`${context}: invalid moderation status`);
  }
  const commentAllowed = summary.comment_precheck_status === "allowed";
  const supportAllowed = summary.support_precheck_status === "allowed";
  if (
    summary.comment_personalized_reaction_allowed !== commentAllowed ||
    summary.support_personalized_reaction_allowed !== supportAllowed ||
    summary.relationship_growth_allowed !== (commentAllowed && supportAllowed) ||
    summary.relationship_growth_suppressed !== !(commentAllowed && supportAllowed)
  ) {
    throw new ContractError(`${context}: moderation precheck gating mismatch`);
  }
  if (
    summary.candidate_boundary_status !==
    (supportAllowed ? "validation_required" : "blocked_by_moderation")
  ) {
    throw new ContractError(`${context}: invalid candidate boundary status`);
  }
  assertYouTubeModerationBoundaryPolicySafe(summary.boundary_policy, context);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation is required`);
  }
  assertNoUnsafeSupportSeparationSummaryMaterial(summary, context);
}

export function createDonationMemoryRelationshipE2ESummary({ supportEvent } = {}) {
  const normalizedSupport = normalizeYouTubeDonation(supportEvent ?? {});
  const supportPhase01 = phase01Intent(normalizedSupport);
  const summary = {
    schema: "iris_donation_memory_relationship_e2e_summary_v1",
    support_source: normalizedSupport.source === "youtube_donation" ? "youtube_donation" : "unknown",
    support_payload_kind:
      supportPhase01.payload_kind === "donation_event" ? "donation_event" : "unknown",
    gratitude_status: "safe_general_gratitude",
    memory_candidate_status: "validation_required",
    relationship_candidate_status: "validation_required",
    relationship_commit_allowed: false,
    amount_policy_status: "bounded_diminishing_return_cap",
    amount_only_relationship_commit_allowed: false,
    paid_priority_wording_allowed: false,
    boundary_policy: {
      donation_event_stays_summary_candidate: true,
      memory_candidate_requires_validation: true,
      relationship_candidate_requires_validation: true,
      relationship_commit_requires_approved_schema: true,
      amount_only_relationship_commit_forbidden: true,
      paid_priority_wording_forbidden: true,
      no_raw_support_text: true,
      no_private_author_ids: true,
      payment_material_excluded: true,
      no_raw_payloads: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertDonationMemoryRelationshipE2ESummarySafe(summary);
  return summary;
}

export function assertDonationMemoryRelationshipE2ESummarySafe(
  summary,
  context = "donation memory relationship E2E summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary must be an object`);
  }
  for (const field of Object.keys(summary)) {
    if (!DONATION_MEMORY_RELATIONSHIP_E2E_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (summary.schema !== "iris_donation_memory_relationship_e2e_summary_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: summary.schema });
  }
  if (summary.support_source !== "youtube_donation" || summary.support_payload_kind !== "donation_event") {
    throw new ContractError(`${context}: donation route required`);
  }
  if (
    summary.gratitude_status !== "safe_general_gratitude" ||
    summary.memory_candidate_status !== "validation_required" ||
    summary.relationship_candidate_status !== "validation_required"
  ) {
    throw new ContractError(`${context}: donation must remain gratitude and candidate gated`);
  }
  if (
    summary.relationship_commit_allowed !== false ||
    summary.amount_only_relationship_commit_allowed !== false ||
    summary.paid_priority_wording_allowed !== false
  ) {
    throw new ContractError(`${context}: donation amount must not commit or rank relationships`);
  }
  if (summary.amount_policy_status !== "bounded_diminishing_return_cap") {
    throw new ContractError(`${context}: donation cap policy required`);
  }
  assertDonationMemoryRelationshipBoundaryPolicySafe(summary.boundary_policy, context);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation is required`);
  }
  assertNoUnsafeSupportSeparationSummaryMaterial(summary, context);
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

function summarizePhase01Intent(intent) {
  return ["respond", "observe", "ignore"].includes(intent) ? intent : "ignore";
}

function safeModerationPrecheckStatus(value) {
  const text = cleanText(value, 40).toLowerCase();
  return ["allowed", "watch", "limited", "blocked", "muted", "unconfirmed"].includes(text)
    ? text
    : "unconfirmed";
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

function assertSupportSeparationBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of [
    "safe_status_labels_only",
    "chat_and_support_routes_separated",
    "donation_candidate_boundary_required",
    "direct_relationship_commit_forbidden",
    "no_raw_comment_text",
    "no_raw_support_text",
    "no_amount_values",
    "no_private_author_ids",
    "no_candidates",
    "no_commands",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function assertYouTubeModerationBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of [
    "moderation_precheck_required",
    "personalized_reaction_requires_allowed",
    "relationship_growth_requires_allowed",
    "support_candidate_blocked_until_allowed",
    "no_raw_comment_text",
    "no_raw_support_text",
    "no_private_author_ids",
    "no_candidates",
    "no_commands",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function assertDonationMemoryRelationshipBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of [
    "donation_event_stays_summary_candidate",
    "memory_candidate_requires_validation",
    "relationship_candidate_requires_validation",
    "relationship_commit_requires_approved_schema",
    "amount_only_relationship_commit_forbidden",
    "paid_priority_wording_forbidden",
    "no_raw_support_text",
    "no_private_author_ids",
    "payment_material_excluded",
    "no_raw_payloads",
    "no_commands",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function assertNoUnsafeSupportSeparationSummaryMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /\b(world_command|input_action_candidate|approved_game_input_action|execute|commit|write|apply|relationship_update_candidate|memory_candidate|candidate_payload|raw[_ -]?comment|comment[_ -]?text|raw[_ -]?support|support[_ -]?text|support[_ -]?message|amount[_ -]?value|amount[_ -]?micros|formatted[_ -]?amount|private[_ -]?author|author[_ -]?channel[_ -]?id|viewer[_ -]?id|token|secret|endpoint|url|command)\b|https?:\/\//iu.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe summary material`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeSupportSeparationSummaryMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (/^(raw|payload|candidate|command|amount|author_channel_id|viewer_id)$/iu.test(field)) {
      throw new ContractError(`${context}: unsafe summary field`, { path: `${path}.${field}` });
    }
    assertNoUnsafeSupportSeparationSummaryMaterial(child, context, `${path}.${field}`);
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
