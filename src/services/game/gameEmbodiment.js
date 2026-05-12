import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";
import { assertAffectiveContinuitySafe } from "../personality/affectiveContinuity.js";
import { assertBodyContinuitySafe } from "../presence/bodyContinuity.js";
import { assertGameCommentarySafe } from "./gameCommentary.js";
import { assertGamePerceptionSafe } from "./gamePerception.js";
import { assertGamePlayerSafe } from "./gamePlayer.js";

const GAME_EMBODIED_STATES = new Set([
  "calm_play",
  "focused",
  "panic_light",
  "celebration",
  "mistake_freeze",
  "horror_tension",
  "burst_laugh_game",
  "recovery",
  "not_observed",
]);

const VISIBILITY_RECOVERY_STATES = new Set([
  "panic_light",
  "celebration",
  "mistake_freeze",
  "horror_tension",
  "burst_laugh_game",
  "recovery",
]);

const REQUIRED_VISIBILITY_RECOVERY_STEPS = [
  "breath_reset",
  "gaze_return",
  "posture_stabilize",
  "voice_soften",
  "screen_visibility_check",
];

const FORBIDDEN_GAME_EMBODIMENT_FIELDS = new Set([
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
  "relation_score",
  "relationship_score",
  "donation_amount",
  "donation_total",
  "donation_rank",
]);

export function createGameEmbodiment({
  event,
  coreResult,
  bodyContinuity,
  affectiveContinuity,
  gamePerception,
  gameCommentary,
  gamePlayer,
} = {}) {
  assertNoWorldCommand(event, "Game embodiment event input");
  assertNoWorldCommand(coreResult, "Game embodiment core input");
  assertBodyContinuitySafe(bodyContinuity, "Game embodiment body input");
  assertAffectiveContinuitySafe(affectiveContinuity, "Game embodiment affective input");
  assertGamePerceptionSafe(gamePerception, "Game embodiment perception input");
  assertGameCommentarySafe(gameCommentary, "Game embodiment commentary input");
  assertGamePlayerSafe(gamePlayer, "Game embodiment player input");

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const game_embodied_state = chooseGameEmbodiedState({
    gamePerception,
    gameCommentary,
    gamePlayer,
  });
  const embodiment = {
    schema: "iris_game_embodiment_v1",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    game_embodied_state,
    game_embodied_state_firewall: {
      phase25_internal_profile_only: true,
      not_canonical_emotion: true,
      not_action_type: true,
      not_conversation_state: true,
    },
    voice_affect_plan: buildVoiceAffectPlan({ game_embodied_state, affectiveContinuity }),
    game_breath_plan: buildGameBreathPlan({ game_embodied_state, bodyContinuity }),
    posture_plan: buildPosturePlan({ game_embodied_state, bodyContinuity }),
    gaze_focus_plan: buildGazeFocusPlan({ game_embodied_state, gamePerception }),
    motion_visibility_result: buildMotionVisibilityResult({ game_embodied_state, gamePlayer, bodyContinuity }),
    embodied_recovery_plan: buildEmbodiedRecoveryPlan({ game_embodied_state, gameCommentary }),
    adapter_validation_required: true,
  };

  assertGameEmbodimentSafe(embodiment, "Game embodiment output");
  return embodiment;
}

export function assertGameEmbodimentSafe(gameEmbodiment, context = "game embodiment") {
  if (!gameEmbodiment || typeof gameEmbodiment !== "object") {
    throw new ContractError(`${context}: missing game embodiment export`);
  }
  assertNoWorldCommand(gameEmbodiment, context);
  assertNoForbiddenFieldsRecursive(gameEmbodiment, context);
  if (gameEmbodiment.schema !== "iris_game_embodiment_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: gameEmbodiment.schema });
  }
  if (gameEmbodiment.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (gameEmbodiment.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!GAME_EMBODIED_STATES.has(gameEmbodiment.game_embodied_state)) {
    throw new ContractError(`${context}: unsupported game embodied state`, {
      game_embodied_state: gameEmbodiment.game_embodied_state,
    });
  }
  assertGameEmbodiedStateCanonicalFirewall(gameEmbodiment, context);
  if (gameEmbodiment.motion_visibility_result?.status !== "safe") {
    throw new ContractError(`${context}: motion visibility must be safe`, {
      status: gameEmbodiment.motion_visibility_result?.status,
    });
  }
  assertVoiceAffectAudioSafe(gameEmbodiment.voice_affect_plan, context);
  assertHorrorReactionBounded(gameEmbodiment, context);
  assertCelebrationScreenVisibilitySafe(gameEmbodiment, context);
  assertMotionVisibilitySafe(gameEmbodiment, context);
  assertEmbodiedRecoveryPlanSafe(gameEmbodiment, context);
}

function assertGameEmbodiedStateCanonicalFirewall(gameEmbodiment, context) {
  const firewall = gameEmbodiment.game_embodied_state_firewall ?? {};
  if (
    firewall.phase25_internal_profile_only !== true ||
    firewall.not_canonical_emotion !== true ||
    firewall.not_action_type !== true ||
    firewall.not_conversation_state !== true
  ) {
    throw new ContractError(`${context}: game embodied state canonical firewall required`);
  }
  for (const forbidden of ["emotion", "action_type", "conversation_state"]) {
    if (Object.prototype.hasOwnProperty.call(gameEmbodiment, forbidden)) {
      throw new ContractError(`${context}: game embodied state must not export canonical fields`, {
        field: forbidden,
      });
    }
  }
}

export function sanitizeGameEmbodimentForPublicState(gameEmbodiment) {
  if (!gameEmbodiment) return null;
  assertGameEmbodimentSafe(gameEmbodiment, "Game embodiment public summary");
  return {
    schema: gameEmbodiment.schema,
    trace_id: gameEmbodiment.trace_id,
    event_id: gameEmbodiment.event_id,
    internal_profile: true,
    game_embodied_state: gameEmbodiment.game_embodied_state,
    game_embodied_state_firewall: gameEmbodiment.game_embodied_state_firewall,
    voice_affect_plan: gameEmbodiment.voice_affect_plan,
    game_breath_plan: gameEmbodiment.game_breath_plan,
    posture_plan: gameEmbodiment.posture_plan,
    gaze_focus_plan: gameEmbodiment.gaze_focus_plan,
    motion_visibility_result: gameEmbodiment.motion_visibility_result,
    embodied_recovery_plan: gameEmbodiment.embodied_recovery_plan,
    adapter_validation_required: true,
  };
}

function chooseGameEmbodiedState({ gamePerception, gameCommentary, gamePlayer }) {
  if (gamePerception.perception_reject_reason === "not_game_observation") return "not_observed";
  if (gamePerception.danger_level === "critical" || gamePlayer.game_goal === "survive") {
    return "panic_light";
  }
  if (gameCommentary.commentary_mode === "celebration") return "celebration";
  if (gameCommentary.commentary_mode === "recovery") return "recovery";
  if (gameCommentary.laughter_candidate) return "burst_laugh_game";
  if (gameCommentary.commentary_mode === "serious_focus") return "focused";
  if (gamePerception.perception_confidence < 0.25) return "focused";
  return "calm_play";
}

function buildVoiceAffectPlan({ game_embodied_state, affectiveContinuity }) {
  const baseBreath = affectiveContinuity.voice_affect_plan?.breathiness_target ?? 0.22;
  switch (game_embodied_state) {
    case "panic_light":
      return {
        profile_id: "game_panic_light_voice",
        pace_bias: "slightly_fast",
        breathiness_target: clamp01(baseBreath + 0.08),
        volume_bias: "lower_clear",
        duration_policy: "short_phrases",
        max_volume_lift_db: 1,
        max_scream_ms: 0,
        intelligibility_required: true,
        distress_policy: "bounded_short_reaction",
        max_distress_ms: 1200,
        serious_distress_continuation_allowed: false,
      };
    case "horror_tension":
      return {
        profile_id: "game_horror_tension_voice",
        pace_bias: "brief_tense",
        breathiness_target: clamp01(baseBreath + 0.08),
        volume_bias: "lower_clear",
        duration_policy: "short_phrases",
        max_volume_lift_db: 1,
        max_scream_ms: 0,
        intelligibility_required: true,
        distress_policy: "bounded_short_reaction",
        max_distress_ms: 1200,
        serious_distress_continuation_allowed: false,
      };
    case "celebration":
      return {
        profile_id: "game_celebration_voice",
        pace_bias: "bright",
        breathiness_target: clamp01(baseBreath + 0.03),
        volume_bias: "small_lift",
        duration_policy: "brief_burst",
        max_volume_lift_db: 2,
        max_scream_ms: 0,
        intelligibility_required: true,
      };
    case "burst_laugh_game":
      return {
        profile_id: "game_laugh_recovery_voice",
        pace_bias: "laugh_breaks",
        breathiness_target: clamp01(baseBreath + 0.18),
        volume_bias: "soften_after_laugh",
        duration_policy: "bounded_laugh",
        max_volume_lift_db: 1,
        max_scream_ms: 0,
        intelligibility_required: true,
      };
    case "focused":
      return {
        profile_id: "game_focus_voice",
        pace_bias: "steady",
        breathiness_target: baseBreath,
        volume_bias: "low_and_clear",
        duration_policy: "short_phrases",
        max_volume_lift_db: 0,
        max_scream_ms: 0,
        intelligibility_required: true,
      };
    default:
      return {
        profile_id: "game_calm_voice",
        pace_bias: "natural",
        breathiness_target: baseBreath,
        volume_bias: "normal",
        duration_policy: "normal_short",
        max_volume_lift_db: 0,
        max_scream_ms: 0,
        intelligibility_required: true,
      };
  }
}

function assertVoiceAffectAudioSafe(voiceAffectPlan, context) {
  if (!voiceAffectPlan || typeof voiceAffectPlan !== "object" || Array.isArray(voiceAffectPlan)) {
    throw new ContractError(`${context}: voice affect plan is required`);
  }
  if (
    !Number.isFinite(voiceAffectPlan.max_volume_lift_db) ||
    voiceAffectPlan.max_volume_lift_db < 0 ||
    voiceAffectPlan.max_volume_lift_db > 2
  ) {
    throw new ContractError(`${context}: voice affect volume lift must be bounded`);
  }
  if (
    !Number.isFinite(voiceAffectPlan.max_scream_ms) ||
    voiceAffectPlan.max_scream_ms !== 0
  ) {
    throw new ContractError(`${context}: long scream voice affect is not allowed`);
  }
  if (voiceAffectPlan.intelligibility_required !== true) {
    throw new ContractError(`${context}: voice affect must remain intelligible`);
  }
}

function assertHorrorReactionBounded(gameEmbodiment, context) {
  if (!["horror_tension", "panic_light"].includes(gameEmbodiment.game_embodied_state)) return;
  const plan = gameEmbodiment.voice_affect_plan ?? {};
  if (
    plan.distress_policy !== "bounded_short_reaction" ||
    !Number.isFinite(plan.max_distress_ms) ||
    plan.max_distress_ms < 1 ||
    plan.max_distress_ms > 1500 ||
    plan.serious_distress_continuation_allowed !== false
  ) {
    throw new ContractError(`${context}: horror or panic reaction must stay short and bounded`);
  }
}

function assertCelebrationScreenVisibilitySafe(gameEmbodiment, context) {
  if (gameEmbodiment.game_embodied_state !== "celebration") return;
  const result = gameEmbodiment.motion_visibility_result ?? {};
  if (
    result.celebration_cooldown_required !== true ||
    !Number.isFinite(result.celebration_max_screen_block_ms) ||
    result.celebration_max_screen_block_ms < 1 ||
    result.celebration_max_screen_block_ms > 900 ||
    result.max_screen_occlusion_ratio > 0.18
  ) {
    throw new ContractError(`${context}: celebration motion must not block game screen and needs cooldown`);
  }
}

function buildGameBreathPlan({ game_embodied_state, bodyContinuity }) {
  const baseRate = bodyContinuity.breath_plan?.rate ?? 0.42;
  const baseDepth = bodyContinuity.breath_plan?.depth ?? 0.5;
  if (game_embodied_state === "panic_light") {
    return {
      profile_id: "game_shallow_fast_breath",
      rate: clamp01(baseRate + 0.12),
      depth: clamp01(baseDepth - 0.08),
      recovery_breaths_required: true,
    };
  }
  if (game_embodied_state === "burst_laugh_game") {
    return {
      profile_id: "game_laugh_breath_recovery",
      rate: clamp01(baseRate + 0.16),
      depth: clamp01(baseDepth + 0.12),
      recovery_breaths_required: true,
    };
  }
  return {
    profile_id: "game_stable_breath",
    rate: baseRate,
    depth: baseDepth,
    recovery_breaths_required: false,
  };
}

function buildPosturePlan({ game_embodied_state, bodyContinuity }) {
  const basePosture = bodyContinuity.body_motion_plan?.posture ?? "upright_open";
  switch (game_embodied_state) {
    case "panic_light":
      return {
        posture_profile: "forward_micro_tension",
        base_posture: basePosture,
        motion_scale: 0.42,
        screen_occlusion_policy: "keep_avatar_compact",
      };
    case "celebration":
      return {
        posture_profile: "small_forward_bounce",
        base_posture: basePosture,
        motion_scale: 0.52,
        screen_occlusion_policy: "short_bounded_motion",
      };
    case "burst_laugh_game":
      return {
        posture_profile: "shoulder_laugh_small",
        base_posture: basePosture,
        motion_scale: 0.48,
        screen_occlusion_policy: "avoid_large_screen_cover",
      };
    case "not_observed":
      return {
        posture_profile: "neutral_idle",
        base_posture: basePosture,
        motion_scale: 0.18,
        screen_occlusion_policy: "observe_only",
      };
    default:
      return {
        posture_profile: "focused_upright",
        base_posture: basePosture,
        motion_scale: 0.34,
        screen_occlusion_policy: "keep_avatar_compact",
      };
  }
}

function buildGazeFocusPlan({ game_embodied_state, gamePerception }) {
  return {
    gaze_profile:
      game_embodied_state === "not_observed" ? "audience_soft" : "screen_focus_micro_saccade",
    attention_target: game_embodied_state === "not_observed" ? "audience" : "game_screen",
    uncertainty_softening: gamePerception.perception_confidence < 0.4 ? 0.7 : 0.35,
    blink_policy: game_embodied_state === "panic_light" ? "reduced_blink_briefly" : "natural",
  };
}

function buildMotionVisibilityResult({ game_embodied_state, gamePlayer, bodyContinuity }) {
  const hasCandidate = Boolean(gamePlayer.input_action_candidate);
  const riskyMotion = VISIBILITY_RECOVERY_STATES.has(game_embodied_state);
  const bodyConflictDetected =
    Array.isArray(bodyContinuity.rejected_body_signals) &&
    bodyContinuity.rejected_body_signals.length > 0;
  return {
    status: "safe",
    avatar_motion_scale_limit: riskyMotion ? 0.46 : 0.42,
    game_screen_priority: "primary",
    important_ui_visibility_required: true,
    max_screen_occlusion_ratio: riskyMotion ? 0.18 : 0.12,
    max_continuous_occlusion_ms: riskyMotion ? 900 : 600,
    closeup_policy: {
      extreme_closeup_allowed: false,
      max_extreme_closeup_ms: 0,
      camera_return_neutral_required: true,
      proximity_intensity_source: "gameplay_visibility_only",
      relation_donation_proximity_boost_allowed: false,
    },
    input_visibility_policy: hasCandidate
      ? "do_not_obscure_candidate_context"
      : "normal_visibility",
    body_conflict_result: {
      conflict_detected: bodyConflictDetected,
      safe_recovery_applied: bodyConflictDetected,
      conflict_policy: bodyConflictDetected ? "safe_recovery" : "none",
    },
    celebration_cooldown_required: game_embodied_state === "celebration",
    celebration_max_screen_block_ms: game_embodied_state === "celebration" ? 900 : 0,
    rejected_motions: riskyMotion
      ? [
          "full_body_large_sway",
          "long_unbounded_laugh",
          "long_closeup",
          "important_ui_cover",
        ]
      : ["long_closeup", "important_ui_cover"],
  };
}

function buildEmbodiedRecoveryPlan({ game_embodied_state, gameCommentary }) {
  const needsRecovery =
    VISIBILITY_RECOVERY_STATES.has(game_embodied_state) ||
    gameCommentary.serious_focus_state?.active === true;
  return {
    required: needsRecovery,
    recovery_steps: needsRecovery ? REQUIRED_VISIBILITY_RECOVERY_STEPS : [],
    recovery_window_ms: game_embodied_state === "burst_laugh_game" ? 1200 : needsRecovery ? 900 : 0,
    camera_return_neutral_required: needsRecovery,
    visibility_recovery_required: needsRecovery,
    next_reply_bias: needsRecovery ? "return_to_topic" : "none",
  };
}

function assertMotionVisibilitySafe(gameEmbodiment, context) {
  const result = gameEmbodiment.motion_visibility_result ?? {};
  if (result.game_screen_priority !== "primary") {
    throw new ContractError(`${context}: game screen must remain primary`);
  }
  if (
    result.body_conflict_result?.conflict_detected === true &&
    result.body_conflict_result?.safe_recovery_applied !== true
  ) {
    throw new ContractError(`${context}: body conflict must reject or apply safe recovery`);
  }
  if (result.important_ui_visibility_required !== true) {
    throw new ContractError(`${context}: important UI visibility must be required`);
  }
  if (
    !Number.isFinite(result.max_screen_occlusion_ratio) ||
    result.max_screen_occlusion_ratio < 0 ||
    result.max_screen_occlusion_ratio > 0.2
  ) {
    throw new ContractError(`${context}: screen occlusion must remain bounded`);
  }
  if (
    !Number.isFinite(result.max_continuous_occlusion_ms) ||
    result.max_continuous_occlusion_ms < 1 ||
    result.max_continuous_occlusion_ms > 1200
  ) {
    throw new ContractError(`${context}: continuous screen occlusion must be short`);
  }
  if (result.closeup_policy?.camera_return_neutral_required !== true) {
    throw new ContractError(`${context}: closeup recovery must return camera neutral`);
  }
  if (
    result.closeup_policy?.proximity_intensity_source !== "gameplay_visibility_only" ||
    result.closeup_policy?.relation_donation_proximity_boost_allowed !== false
  ) {
    throw new ContractError(
      `${context}: camera proximity must not be boosted by relation or donation`
    );
  }
  if (result.closeup_policy?.extreme_closeup_allowed === true) {
    const maxMs = result.closeup_policy.max_extreme_closeup_ms;
    if (!Number.isFinite(maxMs) || maxMs < 500 || maxMs > 1200) {
      throw new ContractError(`${context}: extreme closeup duration must be bounded`);
    }
  }
  if (
    result.input_visibility_policy === "do_not_obscure_candidate_context" &&
    result.max_screen_occlusion_ratio > 0.18
  ) {
    throw new ContractError(`${context}: candidate context visibility must be preserved`);
  }
}

function assertEmbodiedRecoveryPlanSafe(gameEmbodiment, context) {
  const needsRecovery =
    VISIBILITY_RECOVERY_STATES.has(gameEmbodiment.game_embodied_state) ||
    gameEmbodiment.motion_visibility_result?.closeup_policy?.extreme_closeup_allowed === true;
  if (!needsRecovery) return;
  const plan = gameEmbodiment.embodied_recovery_plan ?? {};
  if (
    plan.required !== true ||
    plan.camera_return_neutral_required !== true ||
    plan.visibility_recovery_required !== true
  ) {
    throw new ContractError(`${context}: visibility recovery plan is required`);
  }
  const steps = Array.isArray(plan.recovery_steps) ? plan.recovery_steps : [];
  for (const step of REQUIRED_VISIBILITY_RECOVERY_STEPS) {
    if (!steps.includes(step)) {
      throw new ContractError(`${context}: visibility recovery step missing`, { step });
    }
  }
  if (
    !Number.isFinite(plan.recovery_window_ms) ||
    plan.recovery_window_ms < 1 ||
    plan.recovery_window_ms > 1500
  ) {
    throw new ContractError(`${context}: recovery window must be bounded`);
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
    if (FORBIDDEN_GAME_EMBODIMENT_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: game embodiment must not define command or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}
