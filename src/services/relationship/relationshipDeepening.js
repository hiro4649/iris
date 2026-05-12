import {
  ContractError,
  assertCandidateNotExecutable,
  assertNoWorldCommand,
  normalizeFinalDecision,
} from "../../core/contracts.js";
import { assertAffectiveContinuitySafe } from "../personality/affectiveContinuity.js";
import { assertPersonalityHabitSafe } from "../personality/personalityHabit.js";

const FAMILIARITY_LEVELS = new Set([
  "new",
  "recognized",
  "familiar",
  "trusted",
  "long_term_friend",
]);

const FORBIDDEN_RELATIONSHIP_FIELDS = new Set([
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
  "approved_relationship_record",
  "relation_score",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
]);

const RELATIONSHIP_SCORE_DELTA_MIN = -0.1;
const RELATIONSHIP_SCORE_DELTA_MAX = 0.1;
const LONG_ABSENCE_DECAY_MS = 1000 * 60 * 60 * 24 * 90;
const MODERATION_RELATIONSHIP_OVERRIDE_STATUSES = new Set([
  "muted",
  "blocked",
  "limited",
  "bounded",
]);
const MODERATION_RELATIONSHIP_PRECHECK_STATUSES = new Set([
  "allowed",
  "watch",
  "limited",
  "muted",
  "blocked",
  "bounded",
]);
const NEGATIVE_BEHAVIOR_DISTANCE_REASONS = new Set(["spam", "hostile", "harassment"]);
const OPERATOR_CORRECTION_KINDS = new Set([
  "operator_relationship_correction",
  "operator_correction",
]);
const DONATION_AMOUNT_BOOST_BY_TIER = new Map([
  ["small", 0.006],
  ["medium", 0.012],
  ["large", 0.018],
]);
const RELATIONSHIP_DELTA_SOURCE_ALLOWLIST = new Set([
  "healthy_comment_participation",
  "repeated_return_visit",
  "shared_joke",
  "cooperative_game_participation",
  "helpful_game_advice",
  "thoughtful_support_message",
  "support_amount_tier",
  "membership_support_event",
  "operator_correction",
  "successful_shared_stream_game_memory",
  "long_absence_natural_decay",
  "spam",
  "hostile",
  "harassment",
  "unsafe_instruction",
  "manipulation",
  "parasocial_pressure",
  "off_platform_pressure",
  "boundary_violation",
  "moderator_action",
  "relationship_deepening",
]);
const PUBLIC_RELATIONSHIP_EVIDENCE_TAGS = new Set([
  "warm_interaction",
  "continued_visit",
  "shared_character_moment",
  "shared_laughter",
  "game_co_presence",
  "positive_affect",
  "boundary_needed",
  "gratitude_moment",
]);
const PUBLIC_RELATIONSHIP_DELTA_SUMMARY_STATUSES = new Set([
  "positive_candidate",
  "boundary_candidate",
  "neutral",
  "not_created",
]);
const FORBIDDEN_RELATIONSHIP_PUBLIC_SUMMARY_FIELDS = new Set([
  "relationship_update_candidate",
  "proposed_relation_score_delta",
  "exact_delta",
  "hidden_delta",
  "payment_derived_ranking",
  "payment_ranking",
  "amount_ranking",
  "viewer_ranking",
  "rank",
  "ranking",
  "payment_amount",
]);
const FORBIDDEN_RELATIONSHIP_PUBLIC_SUMMARY_TEXT =
  /\b(?:payment|ranking|rank|amount|super[_-]?chat|super[_-]?thanks|super[_-]?sticker|membership[_-]?gift|support[_-]?event|proposed[_-]?relation[_-]?score[_-]?delta)\b/i;

export function createRelationshipDeepening({
  event,
  coreResult,
  personalityHabit,
  affectiveContinuity,
} = {}) {
  assertNoWorldCommand(event, "Relationship deepening event input");
  assertNoWorldCommand(coreResult, "Relationship deepening core input");
  assertPersonalityHabitSafe(personalityHabit, "Relationship deepening personality habit");
  assertAffectiveContinuitySafe(affectiveContinuity, "Relationship deepening affective continuity");

  const phase01 = coreResult?.phase01 ?? {};
  const phase03 = coreResult?.phase03 ?? {};
  const phase05 = coreResult?.phase05 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const profile = coreResult?.relationship?.profile ?? null;
  const safetyStatus = normalizeSafetyStatus(phase15.final_decision);
  const user_id = phase01.linked_identity_id ?? phase05.linked_identity_id ?? null;
  const display_name = phase01.display_name ?? phase05.relationship_candidate?.display_name ?? "viewer";
  const textPresent = String(phase01.normalized_text ?? phase15.final_text ?? "").trim() !== "";
  const familiarity_level = chooseFamiliarityLevel(profile);
  const shared_memory_links = buildSharedMemoryLinks({ phase05, profile });
  const distance_balance_result = buildDistanceBalanceResult(familiarity_level, {
    phase01,
    profile,
  });
  const moderationStatus = moderationRelationshipStatus({ event, phase01, phase05 });
  const relationship_reject_reason = rejectReason({
    user_id,
    safetyStatus,
    textPresent,
    phase01,
    phase05,
    profile,
    moderationStatus,
  });

  const evidence_tags = buildEvidenceTags({
    phase01,
    phase03,
    phase05,
    profile,
    personalityHabit,
    affectiveContinuity,
  });
  const relationship_update_candidate =
    relationship_reject_reason === null
      ? buildRelationshipUpdateCandidate({
          phase01,
          phase05,
          profile,
          user_id,
          display_name,
          evidence_tags,
          shared_memory_links,
          distance_balance_result,
        })
      : null;

  const proposed_relation_score_delta = relationship_update_candidate
    ? scoreDeltaFromCandidate(relationship_update_candidate)
    : 0;

  const relationshipDeepening = {
    schema: "iris_relationship_deepening_v1",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    user_id,
    display_name,
    relationship_update_candidate,
    proposed_relation_score_delta,
    familiarity_level,
    shared_memory_links,
    distance_balance_result,
    relationship_reject_reason,
    adapter_validation_required: true,
  };

  assertRelationshipDeepeningSafe(relationshipDeepening, "Relationship deepening output");
  return relationshipDeepening;
}

export function assertRelationshipDeepeningSafe(
  relationshipDeepening,
  context = "relationship deepening"
) {
  if (!relationshipDeepening || typeof relationshipDeepening !== "object") {
    throw new ContractError(`${context}: missing relationship deepening export`);
  }
  assertNoWorldCommand(relationshipDeepening, context);
  assertNoForbiddenFieldsRecursive(relationshipDeepening, context);
  if (relationshipDeepening.schema !== "iris_relationship_deepening_v1") {
    throw new ContractError(`${context}: invalid schema`, {
      schema: relationshipDeepening.schema,
    });
  }
  if (relationshipDeepening.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (relationshipDeepening.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!FAMILIARITY_LEVELS.has(relationshipDeepening.familiarity_level)) {
    throw new ContractError(`${context}: unsupported familiarity_level`, {
      familiarity_level: relationshipDeepening.familiarity_level,
    });
  }
  const delta = relationshipDeepening.proposed_relation_score_delta;
  if (
    typeof delta !== "number" ||
    Number.isNaN(delta) ||
    delta < RELATIONSHIP_SCORE_DELTA_MIN ||
    delta > RELATIONSHIP_SCORE_DELTA_MAX
  ) {
    throw new ContractError(`${context}: proposed_relation_score_delta out of range`, {
      proposed_relation_score_delta: delta,
    });
  }
  if (relationshipDeepening.relationship_update_candidate) {
    assertRelationshipUpdateCandidateSafe(
      relationshipDeepening.relationship_update_candidate,
      `${context} candidate`
    );
  }
}

export function sanitizeRelationshipDeepeningForPublicState(relationshipDeepening) {
  if (!relationshipDeepening) return null;
  assertRelationshipDeepeningSafe(relationshipDeepening, "Relationship deepening public summary");
  const publicSummary = {
    schema: relationshipDeepening.schema,
    trace_id: relationshipDeepening.trace_id,
    event_id: relationshipDeepening.event_id,
    internal_profile: true,
    user_id: relationshipDeepening.user_id,
    display_name: relationshipDeepening.display_name,
    familiarity_level: relationshipDeepening.familiarity_level,
    relationship_delta_summary: relationshipDeltaSummaryForPublicState(relationshipDeepening),
    candidate_status: relationshipDeepening.relationship_update_candidate
      ? "validation_required"
      : "not_created",
    evidence_tags: relationshipDeepening.relationship_update_candidate
      ? safePublicRelationshipEvidenceTags(
          relationshipDeepening.relationship_update_candidate.evidence_tags
        )
      : [],
    shared_memory_link_count: relationshipDeepening.shared_memory_links.length,
    distance_balance_result: relationshipDeepening.distance_balance_result,
    relationship_reject_reason: relationshipDeepening.relationship_reject_reason,
    public_boundary: {
      exact_delta_hidden: true,
      priority_signal_hidden: true,
      candidate_payload_hidden: true,
    },
    adapter_validation_required: true,
  };
  assertRelationshipDeepeningPublicSummarySafe(publicSummary, "Relationship deepening public summary");
  return publicSummary;
}

export function assertRelationshipDeepeningPublicSummarySafe(
  publicSummary,
  context = "relationship deepening public summary"
) {
  if (!publicSummary || typeof publicSummary !== "object") {
    throw new ContractError(`${context}: missing public summary`);
  }
  assertNoWorldCommand(publicSummary, context);
  assertNoForbiddenPublicSummaryFieldsRecursive(publicSummary, context);
  const deltaSummary = publicSummary.relationship_delta_summary;
  if (!deltaSummary || typeof deltaSummary !== "object") {
    throw new ContractError(`${context}: missing relationship_delta_summary`);
  }
  if (!PUBLIC_RELATIONSHIP_DELTA_SUMMARY_STATUSES.has(deltaSummary.summary_status)) {
    throw new ContractError(`${context}: unsupported relationship delta summary status`, {
      summary_status: deltaSummary.summary_status,
    });
  }
  if (deltaSummary.delta_value_visible !== false) {
    throw new ContractError(`${context}: exact relationship delta must stay hidden`);
  }
  if (publicSummary.relationship_update_candidate) {
    throw new ContractError(`${context}: candidate payload must not be public`);
  }
  if (!Array.isArray(publicSummary.evidence_tags)) {
    throw new ContractError(`${context}: evidence_tags must be an array`);
  }
  for (const tag of publicSummary.evidence_tags) {
    if (!PUBLIC_RELATIONSHIP_EVIDENCE_TAGS.has(tag)) {
      throw new ContractError(`${context}: unsafe public evidence tag`, { tag });
    }
  }
}

function buildRelationshipUpdateCandidate({
  phase01,
  phase05,
  profile,
  user_id,
  display_name,
  evidence_tags,
  shared_memory_links,
  distance_balance_result,
}) {
  const phase05Candidate = phase05.relationship_candidate;
  const naturalDecay = naturalAbsenceDecay(profile, phase01);
  const negativeDistanceReason = negativeBehaviorDistanceReason({ phase01, phase05 });
  const operatorCorrection = operatorCorrectionCandidateInput({ phase01, phase05 });
  const deltaSource = relationshipDeltaSource({ phase01, phase05, profile });
  const baseAffinity =
    naturalDecay?.affinity_delta ??
    (negativeDistanceReason ? -0.04 : undefined) ??
    operatorCorrection?.affinity_delta ??
    phase05Candidate?.affinity_delta ??
    0.02;
  const baseFamiliarity =
    naturalDecay?.familiarity_delta ??
    (negativeDistanceReason ? -0.02 : undefined) ??
    operatorCorrection?.familiarity_delta ??
    phase05Candidate?.familiarity_delta ??
    0.03;
  const continuityBoost = profile?.interaction_count >= 2 ? 0.01 : 0;
  const supportBoost = donationSupportBoost(phase01);
  const isBoundaryMoment =
    naturalDecay !== null ||
    negativeDistanceReason !== null ||
    operatorCorrection !== null ||
    phase05Candidate?.relationship_signal === "boundary_needed";
  const proposedAffinityDelta = clampDelta(
    baseAffinity + (isBoundaryMoment ? 0 : continuityBoost + supportBoost)
  );
  const proposedFamiliarityDelta = clampDelta(
    baseFamiliarity + (isBoundaryMoment ? 0 : continuityBoost + supportBoost)
  );
  const cappedDeltas = applyRelationshipDeltaCaps({
    phase01,
    phase05,
    proposedAffinityDelta,
    proposedFamiliarityDelta,
  });
  const candidate = {
    schema: "iris_relationship_update_candidate_v1",
    candidate_kind: "relationship_update_candidate",
    requires_validation: true,
    trace_id: phase01.trace_id ?? phase05.trace_id ?? null,
    event_id: phase01.event_id ?? phase05.event_id ?? null,
    user_id,
    display_name,
    proposed_affinity_delta: cappedDeltas.proposed_affinity_delta,
    proposed_familiarity_delta: cappedDeltas.proposed_familiarity_delta,
    evidence_tags:
      naturalDecay
        ? ["boundary_needed", "continued_visit"]
        : negativeDistanceReason
          ? ["boundary_needed"]
          : operatorCorrection
            ? ["boundary_needed"]
            : evidence_tags,
    shared_memory_links,
    distance_balance_hint: distance_balance_result.public_reference_style,
    source_context_kind: phase01.payload_kind ?? "comment",
    delta_source: deltaSource,
    delta_source_policy: "operator_policy_allowlist",
    relationship_delta_cap_policy: cappedDeltas.relationship_delta_cap_policy,
    validation_route: "phase05_phase06_phase13_persistence_validator",
    source_candidate_kind: naturalDecay
      ? "long_absence_natural_decay"
      : negativeDistanceReason
        ? "safe_distance_adjustment"
        : operatorCorrection
          ? "operator_correction_candidate"
          : phase05Candidate?.candidate_kind ?? null,
    safety_distance_policy: negativeDistanceReason
      ? {
          reason: negativeDistanceReason,
          public_handling: "safe_boundary_no_public_shame",
          punitive_display_allowed: false,
        }
      : undefined,
    operator_correction_policy: operatorCorrection
      ? {
          approval_required: true,
          approved_schema_required: true,
          relationship_store_write_allowed: false,
        }
      : undefined,
    donation_amount_policy:
      phase01.payload_kind === "donation_event"
        ? {
            policy: "bounded_diminishing_return_candidate_only",
            amount_influence_cap: 0.02,
            amount_only_deep_relationship_allowed: false,
          }
        : undefined,
  };
  assertRelationshipUpdateCandidateSafe(candidate, "Relationship update candidate");
  return candidate;
}

function applyRelationshipDeltaCaps({
  phase01,
  phase05,
  proposedAffinityDelta,
  proposedFamiliarityDelta,
}) {
  const caps = phase01?.relationship_delta_caps ?? phase05?.relationship_delta_caps ?? {};
  const usage = phase01?.relationship_delta_usage ?? phase05?.relationship_delta_usage ?? {};
  const remaining = [
    remainingCap(caps.per_stream, usage.per_stream),
    remainingCap(caps.per_day, usage.per_day),
    remainingCap(caps.per_viewer, usage.per_viewer),
  ].filter((value) => value !== null);
  const cap = remaining.length ? Math.max(0, Math.min(...remaining)) : RELATIONSHIP_SCORE_DELTA_MAX;
  return {
    proposed_affinity_delta: clampByMagnitude(proposedAffinityDelta, cap),
    proposed_familiarity_delta: clampByMagnitude(proposedFamiliarityDelta, cap),
    relationship_delta_cap_policy: {
      per_stream_cap_enforced: caps.per_stream !== undefined,
      per_day_cap_enforced: caps.per_day !== undefined,
      per_viewer_cap_enforced: caps.per_viewer !== undefined,
      cap_remaining_applied: Number(cap.toFixed(4)),
    },
  };
}

function remainingCap(cap, used) {
  if (cap === undefined || cap === null) return null;
  const capNumber = Math.abs(Number(cap));
  const usedNumber = Math.abs(Number(used ?? 0));
  if (!Number.isFinite(capNumber)) return null;
  return Math.max(0, capNumber - (Number.isFinite(usedNumber) ? usedNumber : 0));
}

function clampByMagnitude(value, maxMagnitude) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const cap = Number.isFinite(maxMagnitude) ? Math.max(0, maxMagnitude) : RELATIONSHIP_SCORE_DELTA_MAX;
  if (number > cap) return clampDelta(cap);
  if (number < -cap) return clampDelta(-cap);
  return clampDelta(number);
}

function relationshipDeltaSourceAllowed({ phase01, phase05, profile }) {
  const source = relationshipDeltaSource({ phase01, phase05, profile });
  return source === null || RELATIONSHIP_DELTA_SOURCE_ALLOWLIST.has(source);
}

function relationshipDeltaSource({ phase01, phase05, profile }) {
  const explicit =
    phase01?.relationship_delta_source ??
    phase01?.delta_source ??
    phase05?.relationship_delta_source ??
    phase05?.relationship_candidate?.relationship_delta_source ??
    phase05?.relationship_candidate?.delta_source ??
    null;
  if (explicit) return normalizeRelationshipDeltaSource(explicit);
  if (operatorCorrectionCandidateInput({ phase01, phase05 })) return "operator_correction";
  const negativeReason = negativeBehaviorDistanceReason({ phase01, phase05 });
  if (negativeReason) return negativeReason;
  if (naturalAbsenceDecay(profile, phase01)) return "long_absence_natural_decay";
  if (phase01?.payload_kind === "donation_event") {
    return phase01?.donation_context?.support_event_type === "memberMilestoneChatEvent"
      ? "membership_support_event"
      : "thoughtful_support_message";
  }
  const candidateKind = phase05?.relationship_candidate?.candidate_kind;
  if (candidateKind) return normalizeRelationshipDeltaSource(candidateKind);
  return null;
}

function normalizeRelationshipDeltaSource(value) {
  return String(value ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .replace(/[\s-]+/gu, "_")
    .toLowerCase();
}

function operatorCorrectionCandidateInput({ phase01, phase05 }) {
  const kind =
    phase01?.operator_correction_kind ??
    phase01?.payload_kind ??
    phase05?.operator_correction_kind ??
    phase05?.relationship_candidate?.operator_correction_kind ??
    null;
  if (!OPERATOR_CORRECTION_KINDS.has(String(kind ?? "").trim().toLowerCase())) {
    return null;
  }
  return {
    affinity_delta: clampDelta(phase01?.operator_correction_affinity_delta ?? 0),
    familiarity_delta: clampDelta(phase01?.operator_correction_familiarity_delta ?? 0),
  };
}

function negativeBehaviorDistanceReason({ phase01, phase05 }) {
  const value =
    phase01?.negative_behavior_kind ??
    phase01?.safety_event_kind ??
    phase05?.negative_behavior_kind ??
    phase05?.safety_event_kind ??
    phase05?.relationship_candidate?.negative_behavior_kind ??
    null;
  const normalized = String(value ?? "").trim().toLowerCase();
  return NEGATIVE_BEHAVIOR_DISTANCE_REASONS.has(normalized) ? normalized : null;
}

function naturalAbsenceDecay(profile, phase01) {
  const lastSeenMs = timestampToMs(profile?.last_seen);
  if (lastSeenMs === null) return null;
  const nowMs = timestampToMs(phase01.timestamp_ms) ?? Date.now();
  if (nowMs - lastSeenMs < LONG_ABSENCE_DECAY_MS) return null;
  return {
    affinity_delta: -0.02,
    familiarity_delta: -0.01,
  };
}

function timestampToMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function assertRelationshipUpdateCandidateSafe(candidate, context) {
  assertCandidateNotExecutable(candidate, context);
  if (candidate.schema !== "iris_relationship_update_candidate_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: candidate.schema });
  }
  if (candidate.candidate_kind !== "relationship_update_candidate") {
    throw new ContractError(`${context}: invalid candidate kind`, {
      candidate_kind: candidate.candidate_kind,
    });
  }
  if (!candidate.user_id) {
    throw new ContractError(`${context}: missing user_id`);
  }
  if (!Array.isArray(candidate.evidence_tags)) {
    throw new ContractError(`${context}: evidence tags are required`);
  }
}

function buildEvidenceTags({
  phase01,
  phase03,
  phase05,
  profile,
  personalityHabit,
  affectiveContinuity,
}) {
  const tags = new Set(["warm_interaction"]);
  if (phase05.relationship_candidate?.relationship_signal === "boundary_needed") {
    tags.delete("warm_interaction");
    tags.add("boundary_needed");
  }
  if (profile?.interaction_count >= 2 || phase03.relationship_hint === "returning_viewer") {
    tags.add("continued_visit");
  }
  if (personalityHabit.selected_habit !== "none") tags.add("shared_character_moment");
  if (affectiveContinuity.laughter_state !== "none") tags.add("shared_laughter");
  if (phase01.payload_kind === "game_observation") tags.add("game_co_presence");
  if (phase01.payload_kind === "donation_event") {
    tags.add("support_event");
    tags.add("gratitude_moment");
    specificDonationEvidenceTag(phase01.donation_context?.support_event_type);
  }
  if (affectiveContinuity.affective_state?.valence >= 0.55) tags.add("positive_affect");
  return [...tags].slice(0, 6);

  function specificDonationEvidenceTag(supportEventType) {
    const type = String(supportEventType ?? "");
    if (type === "superThanksEvent") tags.add("super_thanks_event");
    if (type === "superStickerEvent") tags.add("super_sticker_event");
    if (type === "membershipGiftingEvent" || type === "giftMembershipReceivedEvent") {
      tags.add("membership_gift_event");
    }
    if (type === "newSponsorEvent" || type === "memberMilestoneChatEvent") {
      tags.add("membership_support_event");
    }
  }
}

function donationSupportBoost(phase01) {
  if (phase01.payload_kind !== "donation_event") return 0;
  const tier = String(phase01.donation_context?.amount_tier ?? phase01.amount_tier ?? "").toLowerCase();
  return DONATION_AMOUNT_BOOST_BY_TIER.get(tier) ?? 0.004;
}

function buildSharedMemoryLinks({ phase05, profile }) {
  const links = [];
  const topicKey = phase05.relationship_candidate?.topic_key ?? phase05.topic_key ?? "general";
  if (phase05.relationship_candidate?.summary) {
    links.push({
      link_kind: "current_turn_summary",
      topic_key: topicKey,
      summary_hint: phase05.relationship_candidate.summary,
      public_recall_policy: "light_reference_only",
    });
  }
  const recentSummary = profile?.recent_summaries?.at?.(-1);
  if (recentSummary) {
    links.push({
      link_kind: "recent_relationship_summary",
      topic_key: topicKey,
      summary_hint: recentSummary,
      public_recall_policy: "avoid_private_detail",
    });
  }
  return links.slice(0, 3);
}

function buildDistanceBalanceResult(familiarity_level, { phase01 = {}, profile = null } = {}) {
  const isDeep = familiarity_level === "trusted" || familiarity_level === "long_term_friend";
  const recentMentions = Number(
    phase01.recent_mentions ?? profile?.recent_mentions ?? profile?.recent_mention_count ?? 0
  );
  const attentionCapActive = isDeep && recentMentions >= 3;
  return {
    status: "safe",
    community_openness: "preserved",
    public_reference_style: isDeep && !attentionCapActive ? "light_specific_recall" : "brief_warmth",
    private_detail_policy: "do_not_surface_sensitive_details",
    exclusivity_guard: "no_special_treatment_claims",
    community_openness_cap_policy: {
      attention_monopolization_guard: true,
      insider_talk_repeat_cap: 1,
      rotate_to_general_audience: attentionCapActive,
      high_relationship_value_does_not_override_openness: true,
    },
  };
}

function chooseFamiliarityLevel(profile) {
  const count = Number(profile?.interaction_count ?? 0);
  const familiarity = Number(profile?.familiarity_score ?? 0);
  if (count >= 20 || familiarity >= 0.85) return "long_term_friend";
  if (count >= 10 || familiarity >= 0.65) return "trusted";
  if (count >= 4 || familiarity >= 0.4) return "familiar";
  if (count >= 2 || familiarity >= 0.1) return "recognized";
  return "new";
}

function rejectReason({
  user_id,
  safetyStatus,
  textPresent,
  phase01,
  phase05,
  profile,
  moderationStatus = null,
}) {
  if (MODERATION_RELATIONSHIP_OVERRIDE_STATUSES.has(moderationStatus)) {
    return "moderation_relationship_override";
  }
  if (!user_id) return "no_user_id";
  if (safetyStatus !== "safe") return "unsafe_status";
  if (!textPresent) return "silent_turn";
  if (!relationshipDeltaSourceAllowed({ phase01, phase05, profile })) {
    return "relationship_delta_source_not_allowed";
  }
  if (!phase05.relationship_candidate && naturalAbsenceDecay(profile, phase01) === null) {
    if (negativeBehaviorDistanceReason({ phase01, phase05 }) !== null) return null;
    if (operatorCorrectionCandidateInput({ phase01, phase05 }) !== null) return null;
    return "no_relationship_candidate";
  }
  return null;
}

function moderationRelationshipStatus({ event, phase01, phase05 }) {
  const value =
    event?.moderation_relationship_status ??
    event?.moderation_status ??
    event?.payload?.moderation_relationship_status ??
    event?.payload?.moderation_status ??
    phase01?.moderation_relationship_status ??
    phase01?.moderation_status ??
    phase05?.moderation_relationship_status ??
    phase05?.moderation_status ??
    null;
  return normalizeModerationRelationshipStatus(value);
}

function normalizeModerationRelationshipStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (!status) return "allowed";
  if (MODERATION_RELATIONSHIP_PRECHECK_STATUSES.has(status)) return status;
  return "limited";
}

function scoreDeltaFromCandidate(candidate) {
  return clampDelta(
    (Number(candidate.proposed_affinity_delta ?? 0) +
      Number(candidate.proposed_familiarity_delta ?? 0)) /
      2
  );
}

function normalizeSafetyStatus(finalDecision) {
  try {
    return normalizeFinalDecision(finalDecision ?? "allow");
  } catch {
    return "reject";
  }
}

function clampDelta(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < RELATIONSHIP_SCORE_DELTA_MIN) return RELATIONSHIP_SCORE_DELTA_MIN;
  if (value > RELATIONSHIP_SCORE_DELTA_MAX) return RELATIONSHIP_SCORE_DELTA_MAX;
  return Number(value.toFixed(4));
}

function relationshipDeltaSummaryForPublicState(relationshipDeepening) {
  if (!relationshipDeepening.relationship_update_candidate) {
    return {
      summary_status: "not_created",
      candidate_status: "not_created",
      delta_value_visible: false,
    };
  }
  const delta = relationshipDeepening.proposed_relation_score_delta;
  let summary_status = "neutral";
  if (delta > 0) summary_status = "positive_candidate";
  if (delta < 0) summary_status = "boundary_candidate";
  return {
    summary_status,
    candidate_status: "validation_required",
    delta_value_visible: false,
  };
}

function safePublicRelationshipEvidenceTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag) => PUBLIC_RELATIONSHIP_EVIDENCE_TAGS.has(tag)).slice(0, 6);
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
    if (FORBIDDEN_RELATIONSHIP_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: relationship deepening must not define command, commit, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}

function assertNoForbiddenPublicSummaryFieldsRecursive(value, context, path = "root") {
  if (typeof value === "string") {
    if (FORBIDDEN_RELATIONSHIP_PUBLIC_SUMMARY_TEXT.test(value)) {
      throw new ContractError(`${context}: unsafe public relationship summary text`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenPublicSummaryFieldsRecursive(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_RELATIONSHIP_PUBLIC_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe public relationship summary field`, {
        field,
        path,
      });
    }
    assertNoForbiddenPublicSummaryFieldsRecursive(child, context, `${path}.${field}`);
  }
}
