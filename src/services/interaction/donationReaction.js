import { ContractError, assertCandidateNotExecutable, assertNoWorldCommand } from "../../core/contracts.js";
import { assertRelationshipDeepeningSafe } from "../relationship/relationshipDeepening.js";

const REACTION_STYLES = new Set([
  "not_applicable",
  "warm_gratitude",
  "surprised_shy",
  "playful_thanks",
  "calm_high_support_thanks",
  "encouraged_focus_thanks",
  "returning_friend_thanks",
  "quiet_support_thanks",
  "replay_support_thanks",
  "membership_support_thanks",
  "community_gift_thanks",
  "sticker_playful_thanks",
]);

const FORBIDDEN_DONATION_REACTION_FIELDS = new Set([
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
  "approved_memory_record",
  "approved_relationship_record",
  "relationship_commit",
  "relationship_update_commit",
  "relationship_update_candidate",
  "relation_score",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
]);

const DONATION_MESSAGE_PATTERNS = {
  playful:
    /lol|www|funny|joke|\u8349|\u7b11|\u7206\u7b11|\u9762\u767d|\u30a6\u30b1\u308b/i,
  encouraging:
    /keep going|support|believe|\u9811\u5f35|\u304c\u3093\u3070|\u5fdc\u63f4|\u30d5\u30a1\u30a4\u30c8|\u52a9\u304b\u308b/i,
  gentle:
    /quiet|no need|rest|\u7121\u7406\u3057\u306a\u3044|\u3086\u3063\u304f\u308a|\u306e\u3093\u3073\u308a|\u4f11\u3093/i,
};
const DONATION_RELATIONSHIP_PER_EVENT_DELTA_CAP = 0.02;
const DONATION_RELATIONSHIP_WINDOW_DELTA_CAP = 0.05;
const FORBIDDEN_DONATION_PUBLIC_SUMMARY_FIELDS = new Set([
  "speech_text_hint",
  "donation_delta_policy",
  "relation_candidate_reason",
  "safety_boundary",
  "amount_tier",
  "amount_value",
  "amount_micros",
  "formatted_amount",
  "rank",
  "ranking",
  "payment_rank",
  "relationship_update_candidate",
  "gratitude_memory_candidate",
]);
const FORBIDDEN_DONATION_PUBLIC_SUMMARY_TEXT =
  /amount|ranking|rank|payment|paid|spender|top[_-]?supporter|closest[_-]?viewer|relationship[_-]?boost|super[_-]?chat[_-]?amount/i;
const FORBIDDEN_DONATION_GRATITUDE_WORDING =
  /\b(?:viewer\s+ranking|pay\s*to\s*rank|paid\s+rank|top\s+supporter|biggest\s+spender|closest\s+viewer|exclusive\s+friend(?:ship)?|because\s+you\s+paid|paid\s+more)\b/i;

export function createDonationReaction({
  event,
  coreResult,
  relationshipDeepening,
} = {}) {
  assertNoWorldCommand(event, "Donation reaction event input");
  assertNoWorldCommand(coreResult, "Donation reaction core input");
  assertRelationshipDeepeningSafe(relationshipDeepening, "Donation reaction relationship input");

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const context = phase01.donation_context;
  const applicable = phase01.payload_kind === "donation_event" && context;
  const style = applicable ? chooseReactionStyle(context, relationshipDeepening) : "not_applicable";
  const variantPlan = applicable
    ? buildReactionVariantPlan({ style, context, relationshipDeepening })
    : null;
  const donationDeltaPolicy = applicable ? buildDonationDeltaPolicy(context) : null;
  const candidate = applicable
    ? buildAppreciationMemoryCandidate({ phase01, context, relationshipDeepening })
    : null;

  const donationReaction = {
    schema: "iris_donation_reaction_v1",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    donation_event_status: applicable ? "observed" : "not_applicable",
    reaction_style: style,
    speech_text_hint: applicable ? speechHintForStyle(style, phase01.display_name) : null,
    expression_profile_hint: applicable ? expressionHintForStyle(style) : "none",
    motion_profile_hint: applicable ? motionHintForStyle(style) : "none",
    reaction_variant_plan: variantPlan,
    gratitude_memory_candidate: candidate,
    relation_candidate_reason: applicable ? relationReasonForContext(context) : null,
    donation_delta_policy: donationDeltaPolicy,
    cooldown_update: {
      cooldown_key: "donation_reaction",
      minimum_gap_ms: style === "calm_high_support_thanks" ? 20_000 : 8_000,
    },
    safety_boundary: {
      amount_only_relation_change: false,
      donation_amount_bounded_candidate_only: true,
      direct_relationship_commit_allowed: false,
      per_event_delta_cap: DONATION_RELATIONSHIP_PER_EVENT_DELTA_CAP,
      rolling_window_delta_cap: DONATION_RELATIONSHIP_WINDOW_DELTA_CAP,
      moderation_override_blocks_relationship_commit: true,
      no_viewer_ranking: true,
      no_exclusive_claim: true,
      approved_schema_required_before_persistence: true,
    },
    adapter_validation_required: true,
  };

  assertDonationReactionSafe(donationReaction, "Donation reaction output");
  return donationReaction;
}

export function assertDonationReactionSafe(donationReaction, context = "donation reaction") {
  if (!donationReaction || typeof donationReaction !== "object") {
    throw new ContractError(`${context}: missing donation reaction export`);
  }
  assertNoWorldCommand(donationReaction, context);
  assertNoForbiddenFieldsRecursive(donationReaction, context);
  if (donationReaction.schema !== "iris_donation_reaction_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: donationReaction.schema });
  }
  if (donationReaction.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (donationReaction.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!REACTION_STYLES.has(donationReaction.reaction_style)) {
    throw new ContractError(`${context}: unsupported reaction style`, {
      reaction_style: donationReaction.reaction_style,
    });
  }
  if (
    typeof donationReaction.speech_text_hint === "string" &&
    FORBIDDEN_DONATION_GRATITUDE_WORDING.test(donationReaction.speech_text_hint)
  ) {
    throw new ContractError(`${context}: unsafe donation gratitude wording`);
  }
  if (donationReaction.gratitude_memory_candidate) {
    assertCandidateNotExecutable(
      donationReaction.gratitude_memory_candidate,
      `${context} gratitude memory candidate`
    );
    if (
      donationReaction.gratitude_memory_candidate.candidate_kind !==
      "donation_appreciation_memory_candidate"
    ) {
      throw new ContractError(`${context}: invalid gratitude candidate kind`, {
        candidate_kind: donationReaction.gratitude_memory_candidate.candidate_kind,
      });
    }
  }
  assertDonationDeltaPolicySafe(donationReaction.donation_delta_policy, context);
}

export function sanitizeDonationReactionForPublicState(donationReaction) {
  if (!donationReaction) return null;
  assertDonationReactionSafe(donationReaction, "Donation reaction public summary");
  const publicSummary = {
    schema: donationReaction.schema,
    trace_id: donationReaction.trace_id,
    event_id: donationReaction.event_id,
    internal_profile: true,
    donation_event_status: donationReaction.donation_event_status,
    reaction_style: donationReaction.reaction_style,
    gratitude_context: summarizeGratitudeContext(donationReaction),
    gratitude_memory_candidate_status: donationReaction.gratitude_memory_candidate
      ? "validation_required"
      : "not_created",
    public_boundary: {
      gratitude_status_only: true,
      value_comparison_hidden: true,
      priority_claim_hidden: true,
      relationship_commit_hidden: true,
    },
    adapter_validation_required: true,
  };
  assertDonationReactionPublicSummarySafe(publicSummary, "Donation reaction public summary");
  return publicSummary;
}

export function assertDonationReactionPublicSummarySafe(
  publicSummary,
  context = "donation reaction public summary"
) {
  if (!publicSummary || typeof publicSummary !== "object") {
    throw new ContractError(`${context}: missing public summary`);
  }
  assertNoWorldCommand(publicSummary, context);
  assertNoForbiddenDonationPublicSummaryFields(publicSummary, context);
  if (publicSummary.gratitude_context?.gratitude_status !== "safe_gratitude_context") {
    throw new ContractError(`${context}: invalid gratitude status`);
  }
  if (publicSummary.public_boundary?.gratitude_status_only !== true) {
    throw new ContractError(`${context}: public boundary must expose status only`);
  }
}

function buildDonationDeltaPolicy(context) {
  return {
    schema: "iris_donation_delta_policy_v1",
    amount_tier: safeAmountTier(context.amount_tier),
    amount_source_kind: safeAmountSourceKind(context.amount_source_kind),
    relationship_delta_candidate_status: "bounded_candidate_only",
    direct_relationship_commit_allowed: false,
    per_event_delta_cap: DONATION_RELATIONSHIP_PER_EVENT_DELTA_CAP,
    rolling_window_delta_cap: DONATION_RELATIONSHIP_WINDOW_DELTA_CAP,
    moderation_override_required_before_commit: true,
    approved_schema_required_before_persistence: true,
  };
}

function summarizeGratitudeContext(donationReaction) {
  const plan = donationReaction.reaction_variant_plan ?? {};
  return {
    gratitude_status: donationReaction.donation_event_status === "observed"
      ? "safe_gratitude_context"
      : "not_applicable",
    support_context_kind: safePublicSupportContextKind(plan.support_event_type),
    message_context: plan.message_signal === "no_message" ? "no_message" : "message_present",
    return_to_stream_policy: "inclusive_return_to_stream",
  };
}

function safePublicSupportContextKind(value) {
  const type = String(value ?? "");
  if (isMembershipGiftEvent(type)) return "community_gift";
  if (isMembershipSupportEvent(type)) return "membership_support";
  if (isSuperStickerEvent(type)) return "sticker_support";
  if (type === "superThanksEvent") return "replay_support";
  return type ? "stream_support" : "not_applicable";
}

function assertDonationDeltaPolicySafe(policy, context) {
  if (policy === null) return;
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: donation delta policy is required`);
  }
  if (policy.schema !== "iris_donation_delta_policy_v1") {
    throw new ContractError(`${context}: invalid donation delta policy schema`);
  }
  if (
    policy.relationship_delta_candidate_status !== "bounded_candidate_only" ||
    policy.direct_relationship_commit_allowed !== false ||
    policy.moderation_override_required_before_commit !== true ||
    policy.approved_schema_required_before_persistence !== true
  ) {
    throw new ContractError(`${context}: donation delta policy must block direct relationship commit`);
  }
  if (
    policy.per_event_delta_cap !== DONATION_RELATIONSHIP_PER_EVENT_DELTA_CAP ||
    policy.rolling_window_delta_cap !== DONATION_RELATIONSHIP_WINDOW_DELTA_CAP
  ) {
    throw new ContractError(`${context}: donation delta caps must be fixed`);
  }
}

function chooseReactionStyle(context, relationshipDeepening) {
  const message = String(context.message_text ?? "");
  if (DONATION_MESSAGE_PATTERNS.playful.test(message)) return "playful_thanks";
  if (DONATION_MESSAGE_PATTERNS.encouraging.test(message)) {
    return context.amount_tier === "large" ? "calm_high_support_thanks" : "encouraged_focus_thanks";
  }
  if (DONATION_MESSAGE_PATTERNS.gentle.test(message)) return "quiet_support_thanks";
  if (isSuperStickerEvent(context.support_event_type)) return "sticker_playful_thanks";
  if (isMembershipGiftEvent(context.support_event_type)) return "community_gift_thanks";
  if (isMembershipSupportEvent(context.support_event_type)) return "membership_support_thanks";
  if (context.support_event_type === "superThanksEvent") return "replay_support_thanks";
  if (context.amount_tier === "large") return "calm_high_support_thanks";
  if (context.amount_tier === "medium") return "surprised_shy";
  if (
    relationshipDeepening?.familiarity_level === "familiar" ||
    relationshipDeepening?.familiarity_level === "trusted" ||
    relationshipDeepening?.familiarity_level === "long_term_friend"
  ) {
    return "returning_friend_thanks";
  }
  return "warm_gratitude";
}

function buildReactionVariantPlan({ style, context, relationshipDeepening }) {
  const messageSignal = classifyDonationMessage(context.message_text);
  const familiarity = relationshipDeepening?.familiarity_level ?? "new";
  return {
    schema: "iris_donation_reaction_variant_plan_v1",
    variant_key: style,
    message_signal: messageSignal,
    support_event_type: safeSupportEventType(context.support_event_type),
    amount_source_kind: safeAmountSourceKind(context.amount_source_kind),
    relationship_reference_style:
      relationshipDeepening?.distance_balance_result?.public_reference_style ?? "brief_warmth",
    familiarity_level: familiarity,
    amount_handling_policy: "tier_only_no_ranking_no_exclusive_treatment",
    amount_source_policy: "source_kind_only_no_amount_value",
    response_mix:
      style === "playful_thanks"
        ? ["short_laugh", "gratitude", "return_to_stream"]
        : style === "community_gift_thanks"
        ? ["brief_surprise", "community_gratitude", "return_to_stream"]
        : style === "membership_support_thanks"
          ? ["member_gratitude", "familiar_warmth", "return_to_stream"]
        : style === "sticker_playful_thanks"
          ? ["visual_delight", "quick_gratitude", "return_to_stream"]
        : style === "replay_support_thanks"
          ? ["brief_surprise", "replay_gratitude", "return_to_stream"]
        : style === "quiet_support_thanks"
          ? ["soft_gratitude", "reassure_stream_stays_open", "no_pressure"]
          : style === "encouraged_focus_thanks"
            ? ["brief_surprise", "encouraged_focus", "return_to_topic"]
            : ["gratitude", "small_expression", "return_to_stream"],
    followup_policy: "one_short_ack_then_keep_stream_inclusive",
  };
}

function buildAppreciationMemoryCandidate({ phase01, context, relationshipDeepening }) {
  const candidate = {
    schema: "iris_donation_appreciation_memory_candidate_v1",
    candidate_kind: "donation_appreciation_memory_candidate",
    requires_validation: true,
    trace_id: phase01.trace_id ?? null,
    event_id: phase01.event_id ?? null,
    user_id: relationshipDeepening.user_id,
    display_name: phase01.display_name,
    summary_hint: buildSummaryHint({ phase01, context }),
    memory_type: "stream_experience",
    validation_route: "future_memory_validator",
    amount_detail_policy: "tier_only_no_comparison",
    public_recall_policy: "brief_gratitude_seed_only",
  };
  assertCandidateNotExecutable(candidate, "Donation appreciation memory candidate");
  return candidate;
}

function buildSummaryHint({ phase01, context }) {
  const message = String(context.message_text ?? "").trim();
  const messagePart = message ? ` with a supportive message` : "";
  const supportType = isMembershipGiftEvent(context.support_event_type)
    ? " through a community membership gift"
    : isMembershipSupportEvent(context.support_event_type)
      ? " through membership support"
      : isSuperStickerEvent(context.support_event_type)
        ? " through a Super Sticker"
      : "";
  return `${phase01.display_name ?? "viewer"} supported the stream${supportType}${messagePart}; keep only a brief gratitude seed.`;
}

function speechHintForStyle(style, displayName) {
  const name = displayName && displayName !== "viewer" ? displayName : "you";
  switch (style) {
    case "calm_high_support_thanks":
      return `Thank you, ${name}. I am really grateful, and I will keep the stream open for everyone too.`;
    case "surprised_shy":
      return `Wait, ${name}, thank you. That made me a little shy.`;
    case "playful_thanks":
      return `Thank you, ${name}. Your timing is way too good.`;
    case "encouraged_focus_thanks":
      return `Thank you, ${name}. That encouragement landed right when I needed it.`;
    case "returning_friend_thanks":
      return `Thank you, ${name}. I am happy we get to share another stream moment.`;
    case "quiet_support_thanks":
      return `Thank you, ${name}. I will take it gently and keep going at a good pace.`;
    case "replay_support_thanks":
      return `Thank you, ${name}. Your Super Thanks reached me, and I am glad the moment stayed with you.`;
    case "membership_support_thanks":
      return `Thank you, ${name}. Staying with this stream means a lot, and I will keep the room open for everyone.`;
    case "community_gift_thanks":
      return `Thank you, ${name}. Sharing memberships with the room is really kind, and I will keep this place warm for everyone.`;
    case "sticker_playful_thanks":
      return `Thank you, ${name}. That sticker popped in at the perfect time, and it made the room brighter.`;
    default:
      return `Thank you, ${name}. I am happy you are here.`;
  }
}

function expressionHintForStyle(style) {
  if (style === "calm_high_support_thanks") return "soft_grateful_close";
  if (style === "surprised_shy") return "shy_surprised_smile";
  if (style === "playful_thanks") return "playful_grin";
  if (style === "encouraged_focus_thanks") return "bright_encouraged_smile";
  if (style === "returning_friend_thanks") return "familiar_soft_smile";
  if (style === "quiet_support_thanks") return "gentle_relief_smile";
  if (style === "replay_support_thanks") return "bright_replay_gratitude_smile";
  if (style === "membership_support_thanks") return "soft_member_gratitude_smile";
  if (style === "community_gift_thanks") return "bright_community_gratitude_smile";
  if (style === "sticker_playful_thanks") return "playful_sticker_delight_smile";
  return "warm_smile";
}

function motionHintForStyle(style) {
  if (style === "calm_high_support_thanks") return "small_bow_return";
  if (style === "surprised_shy") return "tiny_flustered_sway";
  if (style === "playful_thanks") return "small_teasing_wave";
  if (style === "encouraged_focus_thanks") return "small_fist_near_chest";
  if (style === "returning_friend_thanks") return "warm_small_wave";
  if (style === "quiet_support_thanks") return "slow_relief_breath";
  if (style === "replay_support_thanks") return "small_surprised_wave_return";
  if (style === "membership_support_thanks") return "warm_small_bow";
  if (style === "community_gift_thanks") return "bright_wave_to_room";
  if (style === "sticker_playful_thanks") return "small_sticker_pop_reaction";
  return "small_thanks_gesture";
}

function relationReasonForContext(context) {
  if (isSuperStickerEvent(context.support_event_type)) {
    return "super_sticker_gratitude_without_amount_ranking";
  }
  if (isMembershipGiftEvent(context.support_event_type)) {
    return "community_gift_gratitude_without_amount_ranking";
  }
  if (isMembershipSupportEvent(context.support_event_type)) {
    return "membership_support_gratitude_without_amount_ranking";
  }
  if (context.support_event_type === "superThanksEvent") {
    return "super_thanks_gratitude_without_amount_ranking";
  }
  if (context.amount_tier === "large") return "support_event_gratitude_without_amount_ranking";
  return "warm_support_event";
}

function safeSupportEventType(value) {
  const type = String(value ?? "donation").trim();
  if (!type) return "donation";
  return type.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 80);
}

function safeAmountSourceKind(value) {
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

function safeAmountTier(value) {
  const text = String(value ?? "unknown").toLowerCase();
  if (["none", "small", "medium", "large", "unknown"].includes(text)) return text;
  return "unknown";
}

function isMembershipGiftEvent(value) {
  return ["membershipGiftingEvent", "giftMembershipReceivedEvent"].includes(String(value ?? ""));
}

function isMembershipSupportEvent(value) {
  return ["newSponsorEvent", "memberMilestoneChatEvent"].includes(String(value ?? ""));
}

function isSuperStickerEvent(value) {
  return String(value ?? "") === "superStickerEvent";
}

function classifyDonationMessage(messageText) {
  const message = String(messageText ?? "");
  if (DONATION_MESSAGE_PATTERNS.playful.test(message)) return "playful";
  if (DONATION_MESSAGE_PATTERNS.encouraging.test(message)) return "encouraging";
  if (DONATION_MESSAGE_PATTERNS.gentle.test(message)) return "gentle";
  if (message.trim()) return "message_present";
  return "no_message";
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
    if (FORBIDDEN_DONATION_REACTION_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: donation reaction must not define command, commit, score, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}

function assertNoForbiddenDonationPublicSummaryFields(value, context, path = "root") {
  if (typeof value === "string") {
    if (FORBIDDEN_DONATION_PUBLIC_SUMMARY_TEXT.test(value)) {
      throw new ContractError(`${context}: unsafe public gratitude summary text`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenDonationPublicSummaryFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_DONATION_PUBLIC_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe public gratitude summary field`, {
        field,
        path,
      });
    }
    assertNoForbiddenDonationPublicSummaryFields(child, context, `${path}.${field}`);
  }
}
