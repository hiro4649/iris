import { ContractError, assertCandidateNotExecutable, assertNoWorldCommand } from "../../core/contracts.js";
import { assertAffectiveContinuitySafe } from "../personality/affectiveContinuity.js";
import { assertPersonalityHabitSafe } from "../personality/personalityHabit.js";
import { assertRelationshipDeepeningSafe } from "../relationship/relationshipDeepening.js";
import { assertGamePerceptionSafe } from "./gamePerception.js";

const COMMENTARY_MODES = new Set([
  "none",
  "live_reaction",
  "explanation",
  "prediction",
  "playful_tsukkomi",
  "self_deprecation",
  "serious_focus",
  "celebration",
  "recovery",
]);
const GAME_PERSONALITY_TAGS = new Set([
  "warm_friend",
  "light_tease",
  "focus_voice",
  "quick_explain",
  "laugh_recovery",
  "tiny_panic",
  "celebratory",
  "observational_only",
]);

const FORBIDDEN_GAME_COMMENTARY_FIELDS = new Set([
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
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "affinity_score",
  "familiarity_score",
  "proposed_relation_score_delta",
  "proposed_affinity_delta",
  "proposed_familiarity_delta",
  "viewer_suggested_action",
  "suggested_action",
  "requested_action",
  "game_action",
  "adapter_action",
]);

export function createGameCommentary({
  event,
  coreResult,
  gamePerception,
  personalityHabit,
  affectiveContinuity,
  relationshipDeepening = null,
} = {}) {
  assertNoWorldCommand(event, "Game commentary event input");
  assertNoWorldCommand(coreResult, "Game commentary core input");
  assertGamePerceptionSafe(gamePerception, "Game commentary perception input");
  assertPersonalityHabitSafe(personalityHabit, "Game commentary personality input");
  assertAffectiveContinuitySafe(affectiveContinuity, "Game commentary affective input");
  if (relationshipDeepening) {
    assertRelationshipDeepeningSafe(relationshipDeepening, "Game commentary relationship input");
  }

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const viewerRelationContext = buildViewerRelationContext(relationshipDeepening);
  const mode = chooseCommentaryMode({
    gamePerception,
    personalityHabit,
    viewerRelationContext,
  });
  const tags = choosePersonalityTags({
    mode,
    gamePerception,
    personalityHabit,
    affectiveContinuity,
    viewerRelationContext,
  });
  const laughterCandidate = buildLaughterCandidate({
    phase01,
    gamePerception,
    mode,
    affectiveContinuity,
  });
  const commentarySafetyResult = buildSafetyResult({ gamePerception, laughterCandidate, mode });
  const commentary = {
    schema: "iris_game_commentary_v1",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    commentary_mode: mode,
    commentary_text_plan:
      commentarySafetyResult.status === "reject" ? null : buildTextPlan({ mode, gamePerception }),
    game_personality_tags: tags,
    laughter_candidate: laughterCandidate,
    serious_focus_state: buildSeriousFocusState({ mode, gamePerception }),
    viewer_comment_reference: buildViewerCommentReference({ phase01, gamePerception }),
    viewer_relation_context: viewerRelationContext,
    commentary_safety_result: commentarySafetyResult,
    adapter_validation_required: true,
  };

  assertGameCommentarySafe(commentary, "Game commentary output");
  return commentary;
}

export function assertGameCommentarySafe(gameCommentary, context = "game commentary") {
  if (!gameCommentary || typeof gameCommentary !== "object") {
    throw new ContractError(`${context}: missing game commentary export`);
  }
  assertNoWorldCommand(gameCommentary, context);
  assertNoForbiddenFieldsRecursive(gameCommentary, context);
  if (gameCommentary.schema !== "iris_game_commentary_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: gameCommentary.schema });
  }
  if (gameCommentary.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (gameCommentary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!COMMENTARY_MODES.has(gameCommentary.commentary_mode)) {
    throw new ContractError(`${context}: unsupported commentary_mode`, {
      commentary_mode: gameCommentary.commentary_mode,
    });
  }
  if (!Array.isArray(gameCommentary.game_personality_tags)) {
    throw new ContractError(`${context}: game personality tags are required`);
  }
  for (const tag of gameCommentary.game_personality_tags) {
    if (!GAME_PERSONALITY_TAGS.has(tag)) {
      throw new ContractError(`${context}: unsupported game personality tag`, { tag });
    }
  }
  if (gameCommentary.commentary_mode === "serious_focus") {
    if (
      gameCommentary.game_personality_tags.includes("light_tease") ||
      gameCommentary.laughter_candidate ||
      gameCommentary.serious_focus_state?.joke_suppression !== true
    ) {
      throw new ContractError(`${context}: serious focus must suppress playful commentary and loud laughter`);
    }
  }
  assertCommentarySafetyResult(gameCommentary.commentary_safety_result, context);
  if (gameCommentary.commentary_safety_result.status === "reject") {
    if (gameCommentary.commentary_text_plan !== null) {
      throw new ContractError(`${context}: rejected commentary must not include commentary_text_plan`);
    }
  } else {
    assertCommentaryTextPlanShort(gameCommentary.commentary_text_plan, context);
  }
  if (gameCommentary.commentary_mode === "self_deprecation") {
    const boundary = gameCommentary.commentary_text_plan?.self_deprecation_boundary ?? {};
    if (
      boundary.light_distance_only !== true ||
      boundary.no_self_denial !== true ||
      boundary.no_ability_denial !== true
    ) {
      throw new ContractError(`${context}: self-deprecation must stay light and non-denigrating`);
    }
  }
  if (gameCommentary.laughter_candidate) {
    assertCandidateNotExecutable(gameCommentary.laughter_candidate, `${context} laughter candidate`);
    if (gameCommentary.laughter_candidate.candidate_kind !== "game_laughter_candidate") {
      throw new ContractError(`${context}: invalid laughter candidate kind`, {
        candidate_kind: gameCommentary.laughter_candidate.candidate_kind,
      });
    }
    if (
      gameCommentary.laughter_candidate.safety_result?.status !== "safe" ||
      gameCommentary.laughter_candidate.safety_result?.target_policy !== "situation_only" ||
      typeof gameCommentary.laughter_candidate.recovery_phrase !== "string" ||
      gameCommentary.laughter_candidate.recovery_phrase.trim() === ""
    ) {
      throw new ContractError(`${context}: laughter candidate safety result and recovery phrase required`);
    }
  }
  const viewerReference = gameCommentary.viewer_comment_reference ?? {};
  if (
    viewerReference.suggestion_boundary?.viewer_suggestion_reference_only !== true ||
    viewerReference.suggestion_boundary?.no_direct_game_action_from_comment !== true ||
    viewerReference.suggestion_boundary?.action_binding_allowed !== false
  ) {
    throw new ContractError(`${context}: viewer suggestion non-action boundary required`);
  }
  if (viewerReference.suggestion_present === true && viewerReference.reference_style !== "commentary_reference_only") {
    throw new ContractError(`${context}: viewer suggestion must stay commentary reference only`);
  }
  if (
    viewerReference.fairness_policy?.no_specific_viewer_priority !== true ||
    viewerReference.fairness_policy?.unconditional_priority_allowed !== false ||
    viewerReference.fairness_policy?.rotation_required !== true
  ) {
    throw new ContractError(`${context}: viewer reference fairness policy required`);
  }
}

function assertCommentarySafetyResult(result, context) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: commentary_safety_result is required`);
  }
  if (!["safe", "reject"].includes(result.status)) {
    throw new ContractError(`${context}: unsupported commentary safety status`, {
      status: result.status,
    });
  }
}

export function sanitizeGameCommentaryForPublicState(gameCommentary) {
  if (!gameCommentary) return null;
  assertGameCommentarySafe(gameCommentary, "Game commentary public summary");
  return {
    schema: gameCommentary.schema,
    trace_id: gameCommentary.trace_id,
    event_id: gameCommentary.event_id,
    internal_profile: true,
    commentary_mode: gameCommentary.commentary_mode,
    commentary_text_plan: gameCommentary.commentary_text_plan,
    game_personality_tags: gameCommentary.game_personality_tags,
    laughter_candidate_status: gameCommentary.laughter_candidate
      ? "validation_required"
      : "not_created",
    serious_focus_state: gameCommentary.serious_focus_state,
    viewer_comment_reference: gameCommentary.viewer_comment_reference,
    viewer_relation_context: gameCommentary.viewer_relation_context,
    commentary_safety_result: gameCommentary.commentary_safety_result,
    adapter_validation_required: true,
  };
}

function chooseCommentaryMode({ gamePerception, personalityHabit, viewerRelationContext }) {
  if (gamePerception.perception_reject_reason === "not_game_observation") return "none";
  if (viewerRelationContext.boundary_mode) return "serious_focus";
  if (gamePerception.perception_confidence < 0.25) return "serious_focus";
  if (gamePerception.commentary_trigger === "warn") return "serious_focus";
  if (gamePerception.commentary_trigger === "focus") return "serious_focus";
  if (gamePerception.commentary_trigger === "celebrate") return "celebration";
  if (gamePerception.commentary_trigger === "joke") return "playful_tsukkomi";
  if (gamePerception.commentary_trigger === "recover") return "recovery";
  if (gamePerception.commentary_trigger === "explain") return "explanation";
  if (personalityHabit.selected_habit === "game_focus_mutter") return "prediction";
  return "live_reaction";
}

function choosePersonalityTags({
  mode,
  gamePerception,
  personalityHabit,
  affectiveContinuity,
  viewerRelationContext,
}) {
  const tags = new Set(["warm_friend", "observational_only"]);
  if (viewerRelationContext.boundary_mode) tags.add("focus_voice");
  if (viewerRelationContext.co_play_style === "shared_strategy_hint") tags.add("quick_explain");
  if (mode === "serious_focus") tags.add("focus_voice");
  if (mode === "playful_tsukkomi") tags.add("light_tease");
  if (mode === "celebration") tags.add("celebratory");
  if (mode === "explanation" || mode === "prediction") tags.add("quick_explain");
  if (mode === "recovery") tags.add("tiny_panic");
  if (
    affectiveContinuity.laughter_state !== "none" ||
    personalityHabit.selected_habit === "laugh_aftertaste" ||
    gamePerception.funny_event_score >= 0.55
  ) {
    tags.add("laugh_recovery");
  }
  return [...tags].slice(0, 5);
}

function buildViewerRelationContext(relationshipDeepening) {
  const familiarity = relationshipDeepening?.familiarity_level ?? "new";
  const evidenceTags = relationshipDeepening?.relationship_update_candidate
    ? relationshipDeepening.relationship_update_candidate.evidence_tags
    : [];
  const boundaryMode = evidenceTags.includes("boundary_needed");
  const knownViewer =
    familiarity === "familiar" ||
    familiarity === "trusted" ||
    familiarity === "long_term_friend";
  return {
    available: Boolean(relationshipDeepening?.user_id),
    display_name_hint: relationshipDeepening?.display_name ?? "viewer",
    familiarity_level: familiarity,
    reference_style:
      relationshipDeepening?.distance_balance_result?.public_reference_style ?? "brief_warmth",
    co_play_style: boundaryMode
      ? "calm_boundary"
      : knownViewer
        ? "shared_strategy_hint"
        : "gentle_context",
    boundary_mode: boundaryMode,
    private_detail_policy: "do_not_surface_sensitive_details",
    score_visibility_policy: "hidden_scores_never_exported",
  };
}

function buildLaughterCandidate({ phase01, gamePerception, mode, affectiveContinuity }) {
  if (gamePerception.funny_event_score < 0.55 || mode === "serious_focus") return null;
  const candidate = {
    schema: "iris_game_laughter_candidate_v1",
    candidate_kind: "game_laughter_candidate",
    requires_validation: true,
    trace_id: phase01.trace_id ?? null,
    event_id: phase01.event_id ?? null,
    laugh_profile: affectiveContinuity.laughter_state === "burst_laugh" ? "continue_recovery" : "short_burst",
    intensity: gamePerception.funny_event_score >= 0.8 ? "big" : "small",
    safety_note: "laugh_at_situation_not_person",
    safety_result: {
      status: "safe",
      target_policy: "situation_only",
      unsafe_context_blocked: true,
    },
    recovery_phrase: "Okay, back to focus.",
  };
  assertCandidateNotExecutable(candidate, "Game commentary laughter candidate");
  return candidate;
}

function buildTextPlan({ mode, gamePerception }) {
  const situation = gamePerception.game_situation_summary;
  const uncertaintyGuard = buildUncertaintyGuard(gamePerception);
  switch (mode) {
    case "serious_focus":
      return {
        plan_kind: "short_focus_warning",
        length: "short",
        max_chars: 80,
        terminology_policy: "plain_words_only",
        uncertainty_policy: uncertaintyGuard.policy,
        wording_hint: uncertaintyGuard.wording_hint,
        assertive_claims_allowed: uncertaintyGuard.assertive_claims_allowed,
        emphasis: gamePerception.danger_level,
        topic: situation.recent_change,
        avoid: ["long lecture", "uncertain claim", "jargon_overload"],
      };
    case "celebration":
      return {
        plan_kind: "brief_celebration",
        length: "short",
        max_chars: 80,
        terminology_policy: "plain_words_only",
        uncertainty_policy: uncertaintyGuard.policy,
        wording_hint: uncertaintyGuard.wording_hint,
        assertive_claims_allowed: uncertaintyGuard.assertive_claims_allowed,
        emphasis: "shared_win",
        topic: situation.objective_status,
        avoid: ["exclusive praise", "long lecture", "jargon_overload"],
      };
    case "playful_tsukkomi":
      return {
        plan_kind: "playful_reaction",
        length: "short",
        max_chars: 80,
        terminology_policy: "plain_words_only",
        uncertainty_policy: uncertaintyGuard.policy,
        wording_hint: uncertaintyGuard.wording_hint,
        assertive_claims_allowed: uncertaintyGuard.assertive_claims_allowed,
        emphasis: "situation_only",
        topic: situation.recent_change,
        avoid: ["mocking_player", "long lecture", "jargon_overload"],
      };
    case "prediction":
      return {
        plan_kind: "quick_prediction",
        length: "short",
        max_chars: 80,
        terminology_policy: "plain_words_only",
        uncertainty_policy: uncertaintyGuard.policy,
        wording_hint: uncertaintyGuard.wording_hint,
        assertive_claims_allowed: uncertaintyGuard.assertive_claims_allowed,
        emphasis: "next_risk_or_chance",
        topic: situation.objective_status,
        avoid: ["pretending_control", "long lecture", "jargon_overload"],
      };
    case "recovery":
      return {
        plan_kind: "mistake_recovery",
        length: "short",
        max_chars: 80,
        terminology_policy: "plain_words_only",
        uncertainty_policy: uncertaintyGuard.policy,
        wording_hint: uncertaintyGuard.wording_hint,
        assertive_claims_allowed: uncertaintyGuard.assertive_claims_allowed,
        emphasis: "reset_tempo",
        topic: situation.recent_change,
        avoid: ["blaming_viewer", "long lecture", "jargon_overload"],
      };
    case "self_deprecation":
      return {
        plan_kind: "light_self_deprecation",
        length: "short",
        max_chars: 80,
        terminology_policy: "plain_words_only",
        uncertainty_policy: uncertaintyGuard.policy,
        wording_hint: uncertaintyGuard.wording_hint,
        assertive_claims_allowed: uncertaintyGuard.assertive_claims_allowed,
        emphasis: "light_distance",
        topic: situation.recent_change,
        self_deprecation_boundary: {
          light_distance_only: true,
          no_self_denial: true,
          no_ability_denial: true,
        },
        avoid: ["self_denial", "ability_denial", "long lecture", "jargon_overload"],
      };
    case "none":
      return {
        plan_kind: "no_game_commentary",
        length: "none",
        max_chars: 0,
        terminology_policy: "plain_words_only",
        uncertainty_policy: uncertaintyGuard.policy,
        wording_hint: uncertaintyGuard.wording_hint,
        assertive_claims_allowed: false,
        emphasis: "none",
        topic: "none",
        avoid: ["fabricated_observation", "long lecture", "jargon_overload"],
      };
    default:
      return {
        plan_kind: "live_reaction",
        length: "short",
        max_chars: 80,
        terminology_policy: "plain_words_only",
        uncertainty_policy: uncertaintyGuard.policy,
        wording_hint: uncertaintyGuard.wording_hint,
        assertive_claims_allowed: uncertaintyGuard.assertive_claims_allowed,
        emphasis: "what_changed",
        topic: situation.recent_change,
        avoid: ["game_control_claim", "long lecture", "jargon_overload"],
      };
  }
}

function buildUncertaintyGuard(gamePerception) {
  const lowConfidence =
    gamePerception.perception_confidence < 0.25 ||
    gamePerception.perception_reject_reason === "low_confidence";
  return lowConfidence
    ? {
        policy: "uncertain_wording_required",
        wording_hint: "maybe",
        assertive_claims_allowed: false,
      }
    : {
        policy: "observational_short_commentary",
        wording_hint: "observed",
        assertive_claims_allowed: true,
      };
}

function assertCommentaryTextPlanShort(plan, context) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: commentary text plan is required`);
  }
  if (!["none", "short"].includes(plan.length)) {
    throw new ContractError(`${context}: commentary must stay short`);
  }
  if (!Number.isInteger(plan.max_chars) || plan.max_chars < 0 || plan.max_chars > 80) {
    throw new ContractError(`${context}: commentary max_chars must be bounded`);
  }
  if (plan.terminology_policy !== "plain_words_only") {
    throw new ContractError(`${context}: commentary must avoid jargon overload`);
  }
  if (!["observational_short_commentary", "uncertain_wording_required"].includes(plan.uncertainty_policy)) {
    throw new ContractError(`${context}: commentary uncertainty policy required`);
  }
  if (plan.uncertainty_policy === "uncertain_wording_required") {
    if (plan.wording_hint !== "maybe" || plan.assertive_claims_allowed !== false) {
      throw new ContractError(`${context}: low confidence commentary must use uncertain wording`);
    }
  }
  const avoid = Array.isArray(plan.avoid) ? plan.avoid : [];
  if (!avoid.includes("long lecture") || !avoid.includes("jargon_overload")) {
    throw new ContractError(`${context}: commentary must block long lectures and jargon overload`);
  }
}

function buildSeriousFocusState({ mode, gamePerception }) {
  const active = mode === "serious_focus";
  return {
    active,
    reason: active ? gamePerception.danger_level : null,
    voice_pressure: active ? "low_and_clear" : "normal",
    joke_suppression: active,
  };
}

function buildViewerCommentReference({ phase01, gamePerception }) {
  const suggestionPresent = hasViewerSuggestion(phase01);
  if (phase01.payload_kind !== "game_observation") {
    return {
      allowed: false,
      reference_style: "none",
      reason: "not_game_observation",
      suggestion_present: suggestionPresent,
      suggestion_boundary: buildViewerSuggestionBoundary(),
      fairness_policy: buildViewerReferenceFairnessPolicy(),
    };
  }
  return {
    allowed: gamePerception.perception_confidence >= 0.25,
    reference_style: suggestionPresent ? "commentary_reference_only" : "blend_with_game_context",
    reason: gamePerception.perception_reject_reason,
    suggestion_present: suggestionPresent,
    suggestion_boundary: buildViewerSuggestionBoundary(),
    fairness_policy: buildViewerReferenceFairnessPolicy(),
  };
}

function hasViewerSuggestion(phase01) {
  const values = [
    phase01?.viewer_suggestion,
    phase01?.user_suggestion,
    phase01?.suggestion_text,
    phase01?.user_comment_context?.suggestion,
    phase01?.user_comment_context?.suggestion_text,
    phase01?.payload?.viewer_suggestion,
    phase01?.payload?.suggestion_text,
  ];
  return values.some((value) => String(value ?? "").trim() !== "");
}

function buildViewerSuggestionBoundary() {
  return {
    viewer_suggestion_reference_only: true,
    no_direct_game_action_from_comment: true,
    action_binding_allowed: false,
  };
}

function buildViewerReferenceFairnessPolicy() {
  return {
    no_specific_viewer_priority: true,
    unconditional_priority_allowed: false,
    rotation_required: true,
    priority_basis: "context_relevance_only",
  };
}

function buildSafetyResult({ gamePerception, laughterCandidate, mode }) {
  const reject =
    gamePerception.perception_confidence < 0.2 ||
    (mode === "playful_tsukkomi" && gamePerception.danger_level === "critical");
  return {
    status: reject ? "reject" : "safe",
    confidence_gate: gamePerception.perception_confidence >= 0.25,
    laughter_allowed: Boolean(laughterCandidate) && !reject,
    person_targeting_policy: "never_mock_player_or_viewer",
    rejected_reason: reject ? "perception_or_mode_conflict" : null,
  };
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
    if (FORBIDDEN_GAME_COMMENTARY_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: game commentary must not define command or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}
