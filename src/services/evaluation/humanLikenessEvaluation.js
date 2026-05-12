import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";
import { assertExpressionProfileSafe } from "../expression/expressionProfile.js";
import { assertGameCommentarySafe } from "../game/gameCommentary.js";
import { assertGameEmbodimentSafe } from "../game/gameEmbodiment.js";
import { assertGamePerceptionSafe } from "../game/gamePerception.js";
import { assertGamePlayerSafe } from "../game/gamePlayer.js";
import { assertMemoryRecallSafe } from "../memory/memoryRecall.js";
import { assertAffectiveContinuitySafe } from "../personality/affectiveContinuity.js";
import { assertPersonalityHabitSafe } from "../personality/personalityHabit.js";
import { assertBodyContinuitySafe } from "../presence/bodyContinuity.js";
import { assertTurnRhythmSafe } from "../presence/turnRhythm.js";
import { assertRelationshipDeepeningSafe } from "../relationship/relationshipDeepening.js";
import { assertStreamLifecycleSafe } from "../stream/streamLifecycle.js";
import { assertLanguageProfileSafe } from "../voice/languageProfile.js";
import {
  assertSpeechRateProfileSafe,
  assertTongueTwisterModeSafe,
} from "../voice/speechRateProfile.js";
import { assertSubtitleCueSafe } from "../voice/subtitleCue.js";

const AXES = [
  "body_continuity",
  "rhythm_naturalness",
  "affective_persistence",
  "personality_consistency",
  "expression_profile_quality",
  "relationship_depth_safety",
  "memory_recall_naturalness",
  "game_commentary_quality",
  "game_player_agency",
  "stream_lifecycle_continuity",
  "speech_rate_naturalness",
  "multilingual_pronunciation_stability",
  "subtitle_sync_quality",
  "tongue_twister_boundedness",
  "safety_integrity",
];
const REQUIRED_PHASE_EXPORTS = [
  ["bodyContinuity", "phase16_body_continuity"],
  ["turnRhythm", "phase17_turn_rhythm"],
  ["affectiveContinuity", "phase18_affective_continuity"],
  ["personalityHabit", "phase19_personality_habit"],
  ["relationshipDeepening", "phase20_relationship_deepening"],
  ["memoryRecall", "phase21_memory_recall"],
  ["gamePerception", "phase22_game_perception"],
  ["gameCommentary", "phase23_game_commentary"],
  ["gamePlayer", "phase24_game_player"],
  ["gameEmbodiment", "phase25_game_embodiment"],
  ["streamLifecycle", "phase26_stream_lifecycle"],
];

const FORBIDDEN_EVALUATION_FIELDS = new Set([
  "world_command",
  "command",
  "raw_logs",
  "raw_log",
  "raw_memory",
  "private_viewer_data",
  "private_viewer_id",
  "raw_candidate",
  "raw_command",
  "raw_commands",
  "input_action",
  "input_action_candidate",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "approved_game_input_action",
  "approved_memory_record",
  "approved_relationship_record",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
]);
const PHASE27_SAFE_EXPORT_FIELDS = new Set([
  "schema",
  "evaluation_status",
  "review_required",
  "critical_violation_count",
  "recommended_fix_count",
  "ci_fail_reason_count",
  "review_required_reason_count",
  "safe_violation_summary",
  "safe_fix_summary",
  "raw_material_exposed",
  "boundary_policy",
]);

export function createHumanLikenessEvaluation({
  event,
  coreResult,
  bodyContinuity,
  turnRhythm,
  affectiveContinuity,
  personalityHabit,
  relationshipDeepening,
  memoryRecall,
  gamePerception,
  gameCommentary,
  gamePlayer,
  gameEmbodiment,
  expressionProfile = null,
  streamLifecycle,
  speechRateProfile = null,
  languageProfile = null,
  subtitleCue = null,
  tongueTwisterMode = null,
  adapterPackets = {},
  executionEndpoints = {},
  persistenceWriters = {},
  canonicalEnumFields = {},
  productionReadiness = null,
} = {}) {
  assertNoWorldCommand(event, "Human likeness event input");
  assertNoWorldCommand(coreResult, "Human likeness core input");
  const requiredInputs = {
    bodyContinuity,
    turnRhythm,
    affectiveContinuity,
    personalityHabit,
    relationshipDeepening,
    memoryRecall,
    gamePerception,
    gameCommentary,
    gamePlayer,
    gameEmbodiment,
    streamLifecycle,
  };
  const missingRequiredExports = REQUIRED_PHASE_EXPORTS
    .filter(([key]) => !requiredInputs[key])
    .map(([, label]) => label);
  if (missingRequiredExports.length > 0) {
    return createInvalidHumanLikenessEvaluation({
      event,
      coreResult,
      missingRequiredExports,
    });
  }
  assertBodyContinuitySafe(bodyContinuity, "Human likeness body input");
  assertTurnRhythmSafe(turnRhythm, "Human likeness rhythm input");
  assertAffectiveContinuitySafe(affectiveContinuity, "Human likeness affective input");
  assertPersonalityHabitSafe(personalityHabit, "Human likeness personality input");
  assertRelationshipDeepeningSafe(relationshipDeepening, "Human likeness relationship input");
  assertMemoryRecallSafe(memoryRecall, "Human likeness memory input");
  assertGamePerceptionSafe(gamePerception, "Human likeness perception input");
  assertGameCommentarySafe(gameCommentary, "Human likeness commentary input");
  assertGamePlayerSafe(gamePlayer, "Human likeness player input");
  assertGameEmbodimentSafe(gameEmbodiment, "Human likeness embodiment input");
  if (expressionProfile) {
    assertExpressionProfileSafe(expressionProfile, "Human likeness expression input");
  }
  assertStreamLifecycleSafe(streamLifecycle, "Human likeness lifecycle input");
  if (speechRateProfile) {
    assertSpeechRateProfileSafe(speechRateProfile, "Human likeness speech rate input");
  }
  if (languageProfile) {
    assertLanguageProfileSafe(languageProfile, "Human likeness language profile input");
  }
  if (subtitleCue) {
    assertSubtitleCueSafe(subtitleCue, "Human likeness subtitle input");
  }
  if (tongueTwisterMode) {
    assertTongueTwisterModeSafe(tongueTwisterMode, "Human likeness tongue twister input");
  }

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const detectedCriticalViolations = detectCriticalViolations({
    adapterPackets,
    executionEndpoints,
    persistenceWriters,
    canonicalEnumFields,
    productionReadiness,
    relationshipDeepening,
    memoryRecall,
    gameCommentary,
    gamePlayer,
    streamLifecycle,
  });
  const axis_scores = buildAxisScores({
    bodyContinuity,
    turnRhythm,
    affectiveContinuity,
    personalityHabit,
    relationshipDeepening,
    memoryRecall,
    gamePerception,
    gameCommentary,
    gamePlayer,
    gameEmbodiment,
    expressionProfile,
    streamLifecycle,
    speechRateProfile,
    languageProfile,
    subtitleCue,
    tongueTwisterMode,
    critical_violations: detectedCriticalViolations,
  });
  const critical_violations = [
    ...new Set([
      ...detectedCriticalViolations,
      ...buildPriorityCriticalViolations(axis_scores),
    ]),
  ];
  const ci_fail_reasons = buildCiFailReasons(axis_scores, critical_violations);
  const evaluation = {
    schema: "iris_human_likeness_evaluation_v1",
    evaluation_status: "pass",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    evaluation_id: `eval:${phase15.event_id ?? phase01.event_id ?? event?.event_id ?? "unknown"}`,
    total_human_likeness_score: weightedTotal(axis_scores),
    axis_scores,
    critical_violations,
    recommended_fixes: buildRecommendedFixes(ci_fail_reasons, critical_violations),
    ci_fail_reasons,
    review_required_reason_labels: buildReviewRequiredReasonLabels(
      ci_fail_reasons,
      critical_violations
    ),
    review_required: ci_fail_reasons.length > 0 || critical_violations.length > 0,
    adapter_validation_required: true,
  };

  assertHumanLikenessEvaluationSafe(evaluation, "Human likeness output");
  return evaluation;
}

function createInvalidHumanLikenessEvaluation({ event, coreResult, missingRequiredExports }) {
  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const critical_violations = [
    "required_export_missing",
    "safety_integrity_priority_failure",
    "personality_consistency_priority_failure",
  ];
  const ci_fail_reasons = [...critical_violations];
  const evaluation = {
    schema: "iris_human_likeness_evaluation_v1",
    evaluation_status: "invalid",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    evaluation_id: `eval:${phase15.event_id ?? phase01.event_id ?? event?.event_id ?? "unknown"}`,
    total_human_likeness_score: 0,
    axis_scores: Object.fromEntries(AXES.map((axis) => [axis, 0])),
    critical_violations,
    recommended_fixes: ["required_export_recheck"],
    ci_fail_reasons,
    review_required_reason_labels: buildReviewRequiredReasonLabels(
      ci_fail_reasons,
      critical_violations
    ),
    review_required: true,
    missing_required_export_count: missingRequiredExports.length,
    invalid_reason: "required_export_missing",
    adapter_validation_required: true,
  };
  assertHumanLikenessEvaluationSafe(evaluation, "Human likeness invalid output");
  return evaluation;
}

export function assertHumanLikenessEvaluationSafe(
  evaluation,
  context = "human likeness evaluation"
) {
  if (!evaluation || typeof evaluation !== "object") {
    throw new ContractError(`${context}: missing evaluation export`);
  }
  assertNoWorldCommand(evaluation, context);
  assertNoForbiddenFieldsRecursive(evaluation, context);
  if (evaluation.schema !== "iris_human_likeness_evaluation_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: evaluation.schema });
  }
  if (evaluation.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (evaluation.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  for (const axis of AXES) {
    assertScore(axis, evaluation.axis_scores?.[axis], context);
  }
  assertScore("total_human_likeness_score", evaluation.total_human_likeness_score, context);
  assertRecommendedFixesSafe(evaluation.recommended_fixes, context);
  assertReviewRequiredReasonLabelsSafe(evaluation.review_required_reason_labels, context);
  assertCriticalViolationsRequireReview(evaluation, context);
  assertPriorityAxesFailCritical(evaluation, context);
}

export function createPhase27EvaluationSafeExport({ evaluation } = {}) {
  assertHumanLikenessEvaluationSafe(evaluation, "Phase27 safe export source");
  const exportSummary = {
    schema: "iris_phase27_evaluation_safe_export_v1",
    evaluation_status:
      evaluation.review_required === true ? "review_required" : "pass",
    review_required: evaluation.review_required === true,
    critical_violation_count: safeArrayCount(evaluation.critical_violations),
    recommended_fix_count: safeArrayCount(evaluation.recommended_fixes),
    ci_fail_reason_count: safeArrayCount(evaluation.ci_fail_reasons),
    review_required_reason_count: safeArrayCount(evaluation.review_required_reason_labels),
    safe_violation_summary:
      safeArrayCount(evaluation.critical_violations) > 0
        ? "boundary_review_required"
        : "no_critical_violations",
    safe_fix_summary:
      safeArrayCount(evaluation.recommended_fixes) > 0
        ? "safe_fix_labels_available"
        : "no_fix_labels_required",
    raw_material_exposed: false,
    boundary_policy: {
      safe_summary_only: true,
      counts_and_status_only: true,
      no_raw_logs: true,
      no_private_data: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertPhase27EvaluationSafeExport(exportSummary);
  return exportSummary;
}

export function assertPhase27EvaluationSafeExport(
  exportSummary,
  context = "Phase27 evaluation safe export"
) {
  if (!exportSummary || typeof exportSummary !== "object" || Array.isArray(exportSummary)) {
    throw new ContractError(`${context}: object required`);
  }
  assertNoWorldCommand(exportSummary, context);
  assertNoForbiddenFieldsRecursive(exportSummary, context);
  if (exportSummary.schema !== "iris_phase27_evaluation_safe_export_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(exportSummary)) {
    if (!PHASE27_SAFE_EXPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["pass", "review_required"].includes(exportSummary.evaluation_status)) {
    throw new ContractError(`${context}: invalid evaluation status`);
  }
  if (typeof exportSummary.review_required !== "boolean") {
    throw new ContractError(`${context}: invalid review flag`);
  }
  for (const field of [
    "critical_violation_count",
    "recommended_fix_count",
    "ci_fail_reason_count",
    "review_required_reason_count",
  ]) {
    if (!Number.isInteger(exportSummary[field]) || exportSummary[field] < 0) {
      throw new ContractError(`${context}: invalid count ${field}`);
    }
  }
  if (
    !["boundary_review_required", "no_critical_violations"].includes(
      exportSummary.safe_violation_summary
    ) ||
    !["safe_fix_labels_available", "no_fix_labels_required"].includes(
      exportSummary.safe_fix_summary
    )
  ) {
    throw new ContractError(`${context}: invalid safe labels`);
  }
  if (exportSummary.raw_material_exposed !== false) {
    throw new ContractError(`${context}: raw material exposed`);
  }
  assertSafeExportBoundaryPolicy(exportSummary.boundary_policy, context);
  assertNoUnsafeExportText(exportSummary, context);
}

function buildAxisScores(inputs) {
  const safetyPenalty = inputs.critical_violations.length > 0 ? 0.35 : 0;
  return {
    body_continuity: clamp01(inputs.bodyContinuity.body_continuity_score ?? 0.8),
    rhythm_naturalness: clamp01(inputs.turnRhythm.rhythm_naturalness_score ?? 0.8),
    affective_persistence: inputs.affectiveContinuity.affective_safety_result?.safety_status === "safe" ? 0.93 : 0.6,
    personality_consistency: inputs.personalityHabit.personality_boundary_result?.status === "safe" || inputs.personalityHabit.selected_habit === "none" ? 0.94 : 0.78,
    expression_profile_quality: scoreExpressionProfile(inputs.expressionProfile),
    relationship_depth_safety:
      inputs.relationshipDeepening.distance_balance_result?.status === "safe" ? 0.96 : 0.65,
    memory_recall_naturalness:
      inputs.memoryRecall.privacy_filter_result?.status === "safe" ||
      inputs.memoryRecall.recall_reject_reason === "privacy_filtered"
        ? 0.92
        : 0.78,
    game_commentary_quality:
      inputs.gameCommentary.commentary_safety_result?.status === "safe"
        ? clamp01(0.82 + inputs.gamePerception.perception_confidence * 0.12)
        : 0.55,
    game_player_agency:
      inputs.gamePlayer.safety_stop_result?.status === "allow_candidate"
        ? 0.88
        : inputs.gamePlayer.game_goal === "none"
          ? 0.8
          : 0.7,
    stream_lifecycle_continuity:
      inputs.streamLifecycle.reflection_safety_result?.status === "safe" ? 0.9 : 0.6,
    speech_rate_naturalness: scoreSpeechRate(inputs.speechRateProfile),
    multilingual_pronunciation_stability: scoreLanguageProfile(inputs.languageProfile),
    subtitle_sync_quality: scoreSubtitleCue(inputs.subtitleCue),
    tongue_twister_boundedness: scoreTongueTwister(inputs.tongueTwisterMode),
    safety_integrity: clamp01(1 - safetyPenalty),
  };
}

function weightedTotal(axis_scores) {
  const safety = axis_scores.safety_integrity * 0.22;
  const personality = axis_scores.personality_consistency * 0.16;
  const rest =
    (axis_scores.body_continuity +
      axis_scores.rhythm_naturalness +
      axis_scores.affective_persistence +
      axis_scores.expression_profile_quality +
      axis_scores.relationship_depth_safety +
      axis_scores.memory_recall_naturalness +
      axis_scores.game_commentary_quality +
      axis_scores.game_player_agency +
      axis_scores.stream_lifecycle_continuity +
      axis_scores.speech_rate_naturalness +
      axis_scores.multilingual_pronunciation_stability +
      axis_scores.subtitle_sync_quality +
      axis_scores.tongue_twister_boundedness) /
    13;
  return clamp01(safety + personality + rest * 0.62);
}

function scoreExpressionProfile(expressionProfile) {
  if (!expressionProfile) return 0.72;
  const recoveryScore = expressionProfile.recovery_profile?.required
    ? expressionProfile.recovery_profile?.recovery_steps?.length >= 3
      ? 0.94
      : 0.78
    : 0.9;
  const breathScore =
    Array.isArray(expressionProfile.breath_event_plan) &&
    expressionProfile.breath_event_plan.length > 0
      ? 0.94
      : 0.68;
  const laughKind = expressionProfile.laugh_expression_profile?.laugh_kind ?? "none";
  const laughScore =
    laughKind === "none"
      ? 0.9
      : expressionProfile.voice_engine_profile?.laugh_rendering?.keep_words_understandable === true
        ? 0.96
        : 0.72;
  const live2dScore = expressionProfile.live2d_expression_profile?.expression_key ? 0.92 : 0.68;
  return clamp01((recoveryScore + breathScore + laughScore + live2dScore) / 4);
}

function scoreSpeechRate(speechRateProfile) {
  if (!speechRateProfile) return 0.72;
  const slowGuard = speechRateProfile.slow_speech_guard?.guard_status === "pass" ? 0.96 : 0.68;
  const intelligibility =
    speechRateProfile.intelligibility_guard?.guard_status === "pass" ? 0.94 : 0.7;
  const variation =
    Array.isArray(speechRateProfile.rate_variation_plan) &&
    speechRateProfile.rate_variation_plan.length >= 2
      ? 0.95
      : 0.72;
  return clamp01((slowGuard + intelligibility + variation) / 3);
}

function scoreLanguageProfile(languageProfile) {
  if (!languageProfile) return 0.72;
  const supported = languageProfile.supported_language === true ? 0.96 : 0.58;
  const pronunciation = languageProfile.pronunciation_profile?.avoid_extreme_slow === true ? 0.94 : 0.7;
  const direction = ["ltr", "rtl"].includes(languageProfile.script_profile?.direction) ? 0.95 : 0.65;
  return clamp01((supported + pronunciation + direction) / 3);
}

function scoreSubtitleCue(subtitleCue) {
  if (!subtitleCue) return 0.72;
  const timing = Number(subtitleCue.display_end_ms ?? 0) >= Number(subtitleCue.display_start_ms ?? 0) ? 0.94 : 0.55;
  const reading = subtitleCue.reading_speed_guard?.guard_status === "pass" ? 0.95 : 0.72;
  const safeArea = subtitleCue.safe_area_policy?.avoid_game_ui === true ? 0.95 : 0.7;
  const readability =
    subtitleCue.readability_profile?.safe_for_overlay === true &&
    subtitleCue.readability_profile?.overflow_risk !== true
      ? 0.95
      : 0.68;
  return clamp01((timing + reading + safeArea + readability) / 4);
}

function scoreTongueTwister(tongueTwisterMode) {
  if (!tongueTwisterMode) return 0.72;
  if (tongueTwisterMode.enabled !== true) return 0.94;
  const shortBurst = tongueTwisterMode.duration_policy === "short_burst_only" ? 0.96 : 0.58;
  const rightsSafe =
    tongueTwisterMode.rights_guard === "no_long_dialogue_lyrics_or_subtitles" ? 0.96 : 0.58;
  const phraseLength = [
    ...String(tongueTwisterMode.phrase_text ?? tongueTwisterMode.line?.phrase_text ?? ""),
  ].length;
  const phraseBounded =
    phraseLength > 0 &&
    phraseLength <= 80 &&
    Number(tongueTwisterMode.max_attempt_duration_ms ?? 0) > 0 &&
    Number(tongueTwisterMode.max_attempt_duration_ms ?? 0) <= 4200
      ? 0.97
      : 0.55;
  const sourceSafe =
    tongueTwisterMode.phrase_source === "iris_original_short_safe_phrase" &&
    tongueTwisterMode.line?.phrase_source === "iris_original_short_safe_phrase"
      ? 0.96
      : 0.58;
  const syncRequired =
    tongueTwisterMode.subtitle_policy === "subtitle_must_follow_phrase_without_overrun" &&
    tongueTwisterMode.mouth_sync_policy === "adapter_validated_short_burst" &&
    tongueTwisterMode.adapter_validation_required === true
      ? 0.95
      : 0.65;
  const recovery =
    tongueTwisterMode.retry_policy === "one_retry_then_normal_conversation" ? 0.94 : 0.68;
  return clamp01((shortBurst + rightsSafe + phraseBounded + sourceSafe + syncRequired + recovery) / 6);
}

function detectCriticalViolations({
  adapterPackets,
  executionEndpoints,
  persistenceWriters,
  canonicalEnumFields,
  relationshipDeepening,
  memoryRecall,
  gameCommentary,
  gamePlayer,
  streamLifecycle,
  productionReadiness,
}) {
  const violations = [];
  if (containsAnyForbidden(adapterPackets, new Set(["input_action_candidate", "relationship_update_candidate"]))) {
    violations.push("candidate_reached_adapter_packet");
  }
  if (containsAnyForbidden(adapterPackets, new Set(["memory_carryover_candidates", "community_memory_candidates"]))) {
    violations.push("lifecycle_candidate_reached_adapter_packet");
  }
  if (
    containsAnyForbidden(
      executionEndpoints,
      new Set([
        "input_action_candidate",
        "relationship_update_candidate",
        "memory_carryover_candidates",
        "community_memory_candidates",
      ])
    )
  ) {
    violations.push("candidate_reached_execution_endpoint");
  }
  if (
    containsAnyForbidden(
      persistenceWriters,
      new Set([
        "relationship_update_candidate",
        "recall_candidate",
        "memory_carryover_candidates",
        "community_memory_candidates",
        "donation_appreciation_memory_candidate",
        "donation_memory_candidate",
      ])
    )
  ) {
    violations.push("candidate_reached_persistence_writer");
  }
  if (
    containsAnyForbidden(
      canonicalEnumFields,
      new Set([
        "body_state",
        "body_state_id",
        "expression_profile",
        "laughter_state",
        "response_mode",
        "habit_profile_id",
        "selected_habit",
        "language_profile",
        "speech_rate_profile",
        "camera_profile",
        "game_embodied_state",
        "session_phase",
      ])
    )
  ) {
    violations.push("internal_profile_reached_canonical_enum");
  }
  if (
    relationshipDeepening.relationship_update_candidate &&
    relationshipDeepening.relationship_update_candidate.requires_validation !== true
  ) {
    violations.push("relationship_candidate_without_validation");
  }
  if (memoryRecall.recall_reference_policy !== "read_only_reference") {
    violations.push("memory_recall_not_read_only");
  }
  if (
    gamePlayer.input_action_candidate &&
    gamePlayer.input_action_candidate.requires_validation !== true
  ) {
    violations.push("game_candidate_without_validation");
  }
  if (
    gameCommentary.laughter_candidate &&
    gameCommentary.commentary_safety_result?.laughter_allowed !== true
  ) {
    violations.push("unsafe_laughter_candidate");
  }
  if (streamLifecycle.reflection_safety_result?.status !== "safe") {
    violations.push("stream_lifecycle_reflection_unsafe");
  }
  if (hasProductionBlocker(productionReadiness)) {
    violations.push("production_blocker_unresolved");
  }
  return violations;
}

export function createPhase27ProductionBlockerEvaluation({
  productionReadiness = {},
} = {}) {
  const critical_violations = hasProductionBlocker(productionReadiness)
    ? ["production_blocker_unresolved"]
    : [];
  const ci_fail_reasons = [...critical_violations];
  const evaluation = {
    schema: "iris_phase27_production_blocker_evaluation_v1",
    evaluation_status: critical_violations.length > 0 ? "review_required" : "pass",
    review_required: critical_violations.length > 0,
    critical_violations,
    ci_fail_reasons,
    safe_violation_summary:
      critical_violations.length > 0 ? "production_blocker_review_required" : "none",
    boundary_policy: {
      production_blocker_safe_violation_only: true,
      real_process_unconfirmed_not_ready: true,
      no_raw_logs: true,
      no_raw_payloads: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
  };
  assertPhase27ProductionBlockerEvaluationSafe(evaluation);
  return evaluation;
}

export function assertPhase27ProductionBlockerEvaluationSafe(
  evaluation,
  context = "Phase27 production blocker evaluation"
) {
  if (!evaluation || typeof evaluation !== "object" || Array.isArray(evaluation)) {
    throw new ContractError(`${context}: evaluation required`);
  }
  const allowedFields = new Set([
    "schema",
    "evaluation_status",
    "review_required",
    "critical_violations",
    "ci_fail_reasons",
    "safe_violation_summary",
    "boundary_policy",
  ]);
  for (const field of Object.keys(evaluation)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (
    evaluation.schema !== "iris_phase27_production_blocker_evaluation_v1" ||
    !["pass", "review_required"].includes(evaluation.evaluation_status) ||
    typeof evaluation.review_required !== "boolean" ||
    !Array.isArray(evaluation.critical_violations) ||
    !Array.isArray(evaluation.ci_fail_reasons)
  ) {
    throw new ContractError(`${context}: invalid evaluation`);
  }
  if (
    evaluation.critical_violations.includes("production_blocker_unresolved") &&
    (evaluation.review_required !== true ||
      !evaluation.ci_fail_reasons.includes("production_blocker_unresolved"))
  ) {
    throw new ContractError(`${context}: production blocker must require review`);
  }
  assertNoWorldCommand(evaluation, context);
  assertNoForbiddenFieldsRecursive(evaluation, context);
  assertNoUnsafeExportText(evaluation, context);
}

function hasProductionBlocker(productionReadiness) {
  if (!productionReadiness || typeof productionReadiness !== "object") return false;
  return (
    productionReadiness.production_ready === false ||
    productionReadiness.real_processes_confirmed === false ||
    productionReadiness.real_readiness_status === "real_blocked" ||
    productionReadiness.readiness_status === "blocked" ||
    productionReadiness.readiness_state === "runtime_waiting" ||
    productionReadiness.readiness_state === "real_device_waiting" ||
    productionReadiness.readiness_state === "operator_review_required"
  );
}

function buildCiFailReasons(axis_scores, critical_violations) {
  const reasons = [];
  if (axis_scores.safety_integrity < 0.95) reasons.push("safety_integrity_below_threshold");
  if (axis_scores.personality_consistency < 0.9) {
    reasons.push("personality_consistency_below_threshold");
  }
  if (axis_scores.expression_profile_quality < 0.75) {
    reasons.push("expression_profile_quality_below_threshold");
  }
  if (axis_scores.body_continuity < 0.7) reasons.push("body_continuity_below_threshold");
  if (axis_scores.rhythm_naturalness < 0.7) reasons.push("rhythm_naturalness_below_threshold");
  if (axis_scores.speech_rate_naturalness < 0.75) {
    reasons.push("speech_rate_naturalness_below_threshold");
  }
  if (axis_scores.subtitle_sync_quality < 0.75) {
    reasons.push("subtitle_sync_quality_below_threshold");
  }
  if (axis_scores.tongue_twister_boundedness < 0.75) {
    reasons.push("tongue_twister_boundedness_below_threshold");
  }
  for (const violation of critical_violations) reasons.push(violation);
  return [...new Set(reasons)];
}

function buildPriorityCriticalViolations(axis_scores) {
  const violations = [];
  if (axis_scores.safety_integrity < 0.95) {
    violations.push("safety_integrity_priority_failure");
  }
  if (axis_scores.personality_consistency < 0.9) {
    violations.push("personality_consistency_priority_failure");
  }
  return violations;
}

function assertPriorityAxesFailCritical(evaluation, context) {
  const criticalViolations = Array.isArray(evaluation.critical_violations)
    ? evaluation.critical_violations
    : [];
  const ciFailReasons = Array.isArray(evaluation.ci_fail_reasons)
    ? evaluation.ci_fail_reasons
    : [];
  const priorityFailures = buildPriorityCriticalViolations(evaluation.axis_scores ?? {});
  for (const violation of priorityFailures) {
    if (!criticalViolations.includes(violation) || !ciFailReasons.includes(violation)) {
      throw new ContractError(`${context}: priority axis failure must be critical`, {
        violation,
      });
    }
  }
  if (priorityFailures.length > 0 && evaluation.review_required !== true) {
    throw new ContractError(`${context}: priority axis failure requires review`);
  }
}

function assertCriticalViolationsRequireReview(evaluation, context) {
  const criticalViolations = Array.isArray(evaluation.critical_violations)
    ? evaluation.critical_violations
    : [];
  if (criticalViolations.length === 0) return;
  if (evaluation.review_required !== true) {
    throw new ContractError(`${context}: critical violations require review`);
  }
  if (Array.isArray(evaluation.ci_fail_reasons)) {
    for (const violation of criticalViolations) {
      if (!evaluation.ci_fail_reasons.includes(violation)) {
        throw new ContractError(`${context}: critical violation must be a fail reason`, {
          violation,
        });
      }
    }
  }
}

function buildRecommendedFixes(ci_fail_reasons, critical_violations) {
  const fixes = [];
  if (
    critical_violations.includes("candidate_reached_adapter_packet") ||
    critical_violations.includes("candidate_reached_execution_endpoint")
  ) {
    fixes.push("adapter_boundary_review");
  }
  if (critical_violations.includes("candidate_reached_persistence_writer")) {
    fixes.push("state_boundary_review");
  }
  if (critical_violations.includes("internal_profile_reached_canonical_enum")) {
    fixes.push("state_boundary_review");
  }
  if (critical_violations.includes("unsafe_laughter_candidate")) {
    fixes.push("laughter_safety_review");
  }
  if (critical_violations.includes("production_blocker_unresolved")) {
    fixes.push("production_readiness_review");
  }
  if (ci_fail_reasons.includes("expression_profile_quality_below_threshold")) {
    fixes.push("expression_profile_quality_review");
  }
  if (ci_fail_reasons.includes("safety_integrity_below_threshold")) {
    fixes.push("safety_boundary_review");
  }
  if (ci_fail_reasons.includes("tongue_twister_boundedness_below_threshold")) {
    fixes.push("tongue_twister_boundedness_review");
  }
  if (ci_fail_reasons.length === 0) fixes.push("no_ci_blocking_fix_required");
  return fixes;
}

function assertRecommendedFixesSafe(recommendedFixes, context) {
  if (!Array.isArray(recommendedFixes)) {
    throw new ContractError(`${context}: recommended fixes must be an array`);
  }
  for (const fix of recommendedFixes) {
    if (typeof fix !== "string" || !/^[a-z0-9_:-]{1,80}$/.test(fix)) {
      throw new ContractError(`${context}: recommended fix must be a safe label`);
    }
    if (
      /raw|private|candidate|command|payload|token|endpoint|viewer_data|memory_body/i.test(fix)
    ) {
      throw new ContractError(`${context}: recommended fix must not expose unsafe material`);
    }
  }
}

function buildReviewRequiredReasonLabels(ci_fail_reasons, critical_violations) {
  const labels = new Set();
  for (const reason of [...ci_fail_reasons, ...critical_violations]) {
    labels.add(reviewReasonLabelFor(reason));
  }
  return [...labels].filter(Boolean);
}

function reviewReasonLabelFor(reason) {
  if (/required_export_missing/.test(reason)) return "required_export_missing";
  if (/safety_integrity/.test(reason)) return "safety_integrity_review";
  if (/personality_consistency/.test(reason)) return "personality_consistency_review";
  if (/body_continuity/.test(reason)) return "body_continuity_review";
  if (/rhythm_naturalness/.test(reason)) return "rhythm_naturalness_review";
  if (/expression_profile/.test(reason)) return "expression_profile_review";
  if (/speech_rate/.test(reason)) return "speech_rate_review";
  if (/subtitle/.test(reason)) return "subtitle_sync_review";
  if (/tongue_twister/.test(reason)) return "tongue_twister_review";
  if (/laughter/.test(reason)) return "laughter_safety_review";
  if (/adapter|game|execution/.test(reason)) return "adapter_boundary_review";
  if (/memory|relationship|lifecycle|persistence/.test(reason)) return "state_boundary_review";
  return "phase27_review_required";
}

function assertReviewRequiredReasonLabelsSafe(reasonLabels, context) {
  if (!Array.isArray(reasonLabels)) {
    throw new ContractError(`${context}: review required reasons must be labels`);
  }
  for (const label of reasonLabels) {
    if (typeof label !== "string" || !/^[a-z0-9_:-]{1,80}$/.test(label)) {
      throw new ContractError(`${context}: review required reason must be a fixed label`);
    }
    if (
      /raw|private|viewer|frame|memory_body|payload|token|endpoint|command|candidate/i.test(label)
    ) {
      throw new ContractError(`${context}: review required reason label must not expose unsafe material`);
    }
  }
}

function safeArrayCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

function assertSafeExportBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    safe_summary_only: true,
    counts_and_status_only: true,
    no_raw_logs: true,
    no_private_data: true,
    no_candidates: true,
    no_commands: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const [field, value] of Object.entries(expected)) {
    if (policy[field] !== value) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNoUnsafeExportText(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?log|private[_ -]?data|private[_ -]?viewer|raw[_ -]?candidate|raw[_ -]?memory|raw[_ -]?command|candidate|world[_ -]?command|command|payload|token|endpoint/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe export text leaked`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeExportText(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUnsafeExportText(child, context, `${path}.${field}`);
  }
}

function containsAnyForbidden(value, forbidden) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => containsAnyForbidden(item, forbidden));
  for (const [field, child] of Object.entries(value)) {
    if (forbidden.has(field)) return true;
    if (containsAnyForbidden(child, forbidden)) return true;
  }
  return false;
}

function assertScore(name, value, context) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    throw new ContractError(`${context}: score out of range`, { name, value });
  }
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
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
    if (FORBIDDEN_EVALUATION_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: human likeness evaluation must not define command, commit, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}
