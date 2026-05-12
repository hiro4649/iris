import {
  ContractError,
  assertNoWorldCommand,
  normalizeFinalDecision,
} from "../../core/contracts.js";
import { assertGameEmbodimentSafe } from "../game/gameEmbodiment.js";
import { assertDonationReactionSafe } from "../interaction/donationReaction.js";
import { assertMediaWatchReactionSafe } from "../interaction/mediaWatchReaction.js";
import { assertAffectiveContinuitySafe } from "../personality/affectiveContinuity.js";
import { assertPersonalityHabitSafe } from "../personality/personalityHabit.js";

const AUTONOMOUS_STATES = new Set([
  "quiet_presence",
  "latency_bridge",
  "surprise_scream",
  "happy_humming",
  "happy_dance",
  "happy_loud_sing",
  "self_directed_micro_action",
]);

const SCREAM_PROFILES = new Set([
  "none",
  "panic_squeak",
  "surprise_scream",
  "horror_squeal",
  "relief_exhale",
]);

const MICRO_ACTIONS = new Set([
  "none",
  "look_away_then_back",
  "screen_peek",
  "tiny_fidget",
  "topic_murmur",
  "soft_hum",
]);

const FORBIDDEN_AUTONOMOUS_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
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

export function createAutonomousExpression({
  event,
  coreResult,
  affectiveContinuity,
  personalityHabit,
  gameEmbodiment,
  donationReaction = null,
  mediaWatchReaction = null,
  queueSize = 0,
  commentDensity = 0,
  responseLatencyMs = 0,
} = {}) {
  assertNoWorldCommand(event, "Autonomous expression event input");
  assertNoWorldCommand(coreResult, "Autonomous expression core input");
  assertAffectiveContinuitySafe(affectiveContinuity, "Autonomous expression affective input");
  assertPersonalityHabitSafe(personalityHabit, "Autonomous expression habit input");
  assertGameEmbodimentSafe(gameEmbodiment, "Autonomous expression game input");
  if (donationReaction) {
    assertDonationReactionSafe(donationReaction, "Autonomous expression donation input");
  }
  if (mediaWatchReaction) {
    assertMediaWatchReactionSafe(mediaWatchReaction, "Autonomous expression media input");
  }

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const safetyStatus = normalizeSafetyStatus(phase15.final_decision);
  const triggerText = [
    phase01.normalized_text,
    phase01.game_context?.scene_summary,
    phase01.media_watch_context?.observation_summary,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const strongExpressionAllowed =
    safetyStatus !== "reject" &&
    affectiveContinuity.affective_safety_result?.strong_expression_allowed === true;
  const screamProfile = chooseScreamProfile({
    triggerText,
    gameEmbodiment,
    mediaWatchReaction,
    safetyStatus,
  });
  const positiveEnergy = computePositiveEnergy({
    affectiveContinuity,
    donationReaction,
    gameEmbodiment,
  });
  const autonomousState = chooseAutonomousState({
    screamProfile,
    positiveEnergy,
    queueSize,
    commentDensity,
    responseLatencyMs,
    phase01,
    gameEmbodiment,
    safetyStatus,
    strongExpressionAllowed,
  });
  const durationMs = chooseDurationMs({ autonomousState, screamProfile, positiveEnergy });
  const expression = {
    schema: "iris_autonomous_expression_v1",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    autonomous_state_id: autonomousState,
    trigger_summary: buildTriggerSummary({
      phase01,
      screamProfile,
      positiveEnergy,
      queueSize,
      commentDensity,
      responseLatencyMs,
    }),
    duration_ms: durationMs,
    scream_reaction_plan: buildScreamPlan({
      screamProfile,
      durationMs,
      safetyStatus,
    }),
    latency_bridge_plan: buildLatencyBridgePlan({
      autonomousState,
      queueSize,
      commentDensity,
      responseLatencyMs,
      safetyStatus,
    }),
    self_directed_micro_action_plan: buildMicroActionPlan({
      autonomousState,
      phase01,
      positiveEnergy,
      gameEmbodiment,
      safetyStatus,
    }),
    happy_hum_plan: buildHumPlan({ autonomousState, positiveEnergy, safetyStatus }),
    happy_dance_plan: buildDancePlan({ autonomousState, positiveEnergy, safetyStatus }),
    happy_loud_sing_plan: buildLoudSingPlan({
      autonomousState,
      positiveEnergy,
      safetyStatus,
    }),
    safety_guard_result: {
      status: safetyStatus === "reject" ? "suppressed" : "safe",
      no_commands: true,
      no_memory_or_relationship_commit: true,
      no_copyrighted_lyrics_or_existing_melody: true,
      short_duration_required: true,
      adapter_boundary: "tts_and_live2d_visual_guidance_only",
    },
    cooldown_update: {
      cooldown_key: "autonomous_expression",
      min_gap_turns:
        autonomousState === "happy_loud_sing"
          ? 8
          : autonomousState === "happy_dance"
            ? 5
            : screamProfile !== "none"
              ? 4
              : 2,
    },
    adapter_validation_required: true,
  };

  assertAutonomousExpressionSafe(expression, "Autonomous expression output");
  return expression;
}

export function assertAutonomousExpressionSafe(
  autonomousExpression,
  context = "autonomous expression"
) {
  if (!autonomousExpression || typeof autonomousExpression !== "object") {
    throw new ContractError(`${context}: missing autonomous expression export`);
  }
  assertNoWorldCommand(autonomousExpression, context);
  assertNoForbiddenFieldsRecursive(autonomousExpression, context);
  if (autonomousExpression.schema !== "iris_autonomous_expression_v1") {
    throw new ContractError(`${context}: invalid schema`, {
      schema: autonomousExpression.schema,
    });
  }
  if (autonomousExpression.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (autonomousExpression.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!AUTONOMOUS_STATES.has(autonomousExpression.autonomous_state_id)) {
    throw new ContractError(`${context}: unsupported autonomous state`, {
      autonomous_state_id: autonomousExpression.autonomous_state_id,
    });
  }
  if (
    !SCREAM_PROFILES.has(autonomousExpression.scream_reaction_plan?.scream_profile ?? "none")
  ) {
    throw new ContractError(`${context}: unsupported scream profile`, {
      scream_profile: autonomousExpression.scream_reaction_plan?.scream_profile,
    });
  }
  if (
    !MICRO_ACTIONS.has(
      autonomousExpression.self_directed_micro_action_plan?.micro_action_profile ?? "none"
    )
  ) {
    throw new ContractError(`${context}: unsupported micro action profile`, {
      micro_action_profile:
        autonomousExpression.self_directed_micro_action_plan?.micro_action_profile,
    });
  }
  assertDuration("duration_ms", autonomousExpression.duration_ms, 0, 2800, context);
  assertDuration(
    "scream duration",
    autonomousExpression.scream_reaction_plan?.duration_ms ?? 0,
    0,
    1400,
    context
  );
  assertDuration(
    "dance duration",
    autonomousExpression.happy_dance_plan?.duration_ms ?? 0,
    0,
    1800,
    context
  );
  assertDuration(
    "sing duration",
    autonomousExpression.happy_loud_sing_plan?.duration_ms ?? 0,
    0,
    2400,
    context
  );
  if (autonomousExpression.happy_loud_sing_plan?.uses_existing_song === true) {
    throw new ContractError(`${context}: loud sing plan must not use existing songs`);
  }
  if (autonomousExpression.happy_hum_plan?.uses_existing_melody === true) {
    throw new ContractError(`${context}: hum plan must not use existing melodies`);
  }
}

export function sanitizeAutonomousExpressionForPublicState(autonomousExpression) {
  if (!autonomousExpression) return null;
  assertAutonomousExpressionSafe(autonomousExpression, "Autonomous expression public summary");
  return structuredClone(autonomousExpression);
}

function chooseAutonomousState({
  screamProfile,
  positiveEnergy,
  queueSize,
  commentDensity,
  responseLatencyMs,
  phase01,
  gameEmbodiment,
  safetyStatus,
  strongExpressionAllowed,
}) {
  if (safetyStatus === "reject") return "quiet_presence";
  if (screamProfile !== "none") return "surprise_scream";
  if (
    Number(queueSize) >= 5 ||
    Number(commentDensity) >= 0.75 ||
    Number(responseLatencyMs) >= 1200
  ) {
    return "latency_bridge";
  }
  if (positiveEnergy >= 0.82 && strongExpressionAllowed) {
    if (phase01.payload_kind === "donation_event") return "happy_dance";
    if (gameEmbodiment.game_embodied_state === "celebration") return "happy_loud_sing";
  }
  if (phase01.payload_kind === "presence_idle" && positiveEnergy >= 0.58) return "happy_humming";
  if (phase01.payload_kind === "presence_idle") return "self_directed_micro_action";
  if (gameEmbodiment.game_embodied_state === "focused") return "self_directed_micro_action";
  return "quiet_presence";
}

function chooseScreamProfile({ triggerText, gameEmbodiment, mediaWatchReaction, safetyStatus }) {
  if (safetyStatus === "reject") return "none";
  if (gameEmbodiment.game_embodied_state === "panic_light") return "panic_squeak";
  if (mediaWatchReaction?.reaction_mode === "surprised_reaction") return "surprise_scream";
  if (/horror|scary|ghost|jump scare|sudden|びっくり|怖|恐/.test(triggerText)) {
    return "horror_squeal";
  }
  if (/lava|fall|danger|panic|surprise|scream|絶叫|悲鳴/.test(triggerText)) {
    return "surprise_scream";
  }
  return "none";
}

function computePositiveEnergy({ affectiveContinuity, donationReaction, gameEmbodiment }) {
  const affect = affectiveContinuity.affective_state ?? {};
  let score =
    (affect.energy ?? 0.42) * 0.36 +
    (affect.warmth ?? 0.54) * 0.24 +
    (affect.amusement ?? 0.22) * 0.26;
  if (donationReaction?.donation_event_status === "observed") score += 0.12;
  if (gameEmbodiment.game_embodied_state === "celebration") score += 0.18;
  return clamp01(score);
}

function chooseDurationMs({ autonomousState, screamProfile, positiveEnergy }) {
  if (screamProfile !== "none") return screamProfile === "horror_squeal" ? 1180 : 920;
  switch (autonomousState) {
    case "latency_bridge":
      return 900;
    case "happy_humming":
      return 1600;
    case "happy_dance":
      return 1500;
    case "happy_loud_sing":
      return positiveEnergy >= 0.9 ? 2200 : 1700;
    case "self_directed_micro_action":
      return 1100;
    default:
      return 0;
  }
}

function buildTriggerSummary({
  phase01,
  screamProfile,
  positiveEnergy,
  queueSize,
  commentDensity,
  responseLatencyMs,
}) {
  return {
    payload_kind: phase01.payload_kind ?? "unknown",
    scream_profile: screamProfile,
    positive_energy: positiveEnergy,
    queue_pressure: clamp01(Number(queueSize) / 10),
    comment_density: clamp01(commentDensity),
    response_latency_ms: safeLatencyMs(responseLatencyMs),
    latency_pressure: clamp01(Number(responseLatencyMs) / 3000),
  };
}

function buildScreamPlan({ screamProfile, durationMs, safetyStatus }) {
  const active = screamProfile !== "none" && safetyStatus !== "reject";
  return {
    active,
    scream_profile: active ? screamProfile : "none",
    duration_ms: active ? Math.min(durationMs, 1400) : 0,
    voice_profile_hint: active ? "short_girlish_startle_recover" : "none",
    expression_profile_hint: active ? "wide_eyes_short_scream_then_breath" : "none",
    motion_profile_hint: active ? "shoulder_jump_small_retreat_then_return" : "none",
    recovery_pause_ms: active ? 520 : 0,
    safety_note: "short expressive startle only, never distress loop",
  };
}

function buildLatencyBridgePlan({
  autonomousState,
  queueSize,
  commentDensity,
  responseLatencyMs,
  safetyStatus,
}) {
  const active = autonomousState === "latency_bridge" && safetyStatus !== "reject";
  return {
    active,
    bridge_profile: active ? "short_processing_cover" : "none",
    duration_ms: active ? 900 : 0,
    filler_hint: active ? "short wait phrase with eyes moving to screen" : "none",
    visual_hold_hint: active ? "soft_blink_and_screen_glance" : "none",
    queue_pressure: clamp01(Number(queueSize) / 10),
    comment_density: clamp01(commentDensity),
    response_latency_ms: safeLatencyMs(responseLatencyMs),
  };
}

function buildMicroActionPlan({ autonomousState, phase01, positiveEnergy, gameEmbodiment, safetyStatus }) {
  const active = autonomousState === "self_directed_micro_action" && safetyStatus !== "reject";
  let profile = "none";
  if (active && gameEmbodiment.game_embodied_state === "focused") profile = "screen_peek";
  else if (active && phase01.payload_kind === "presence_idle" && positiveEnergy >= 0.5) {
    profile = "topic_murmur";
  } else if (active) {
    profile = "look_away_then_back";
  }
  return {
    active,
    micro_action_profile: profile,
    duration_ms: active ? 1100 : 0,
    attention_policy: "must_not_block_user_response_or_game_safety",
    return_policy: active ? "return_to_audience_or_screen" : "none",
  };
}

function buildHumPlan({ autonomousState, positiveEnergy, safetyStatus }) {
  const active = autonomousState === "happy_humming" && safetyStatus !== "reject";
  return {
    active,
    hum_profile: active ? "short_original_nonverbal_hum" : "none",
    duration_ms: active ? 1600 : 0,
    voice_profile_hint: active ? "soft_closed_mouth_hum" : "none",
    mouth_motion_hint: active ? "small_closed_mouth_smile" : "none",
    positive_energy: clamp01(positiveEnergy),
    uses_existing_melody: false,
  };
}

function buildDancePlan({ autonomousState, positiveEnergy, safetyStatus }) {
  const active = autonomousState === "happy_dance" && safetyStatus !== "reject";
  return {
    active,
    dance_profile: active ? "happy_dance_body" : "none",
    duration_ms: active ? 1500 : 0,
    motion_profile_hint: active ? "small_shoulders_and_tiny_step" : "none",
    screen_safety_policy: "compact_motion_does_not_cover_important_ui",
    positive_energy: clamp01(positiveEnergy),
  };
}

function buildLoudSingPlan({ autonomousState, positiveEnergy, safetyStatus }) {
  const active = autonomousState === "happy_loud_sing" && safetyStatus !== "reject";
  return {
    active,
    sing_profile: active ? "happy_loud_sing_voice" : "none",
    duration_ms: active ? (positiveEnergy >= 0.9 ? 2200 : 1700) : 0,
    voice_profile_hint: active ? "brief_original_vocalise_with_volume_cap" : "none",
    volume_limit: active ? 0.78 : 0,
    lyric_policy: "no_lyrics_only_original_vocalise",
    uses_existing_song: false,
    recovery_pause_ms: active ? 420 : 0,
  };
}

function normalizeSafetyStatus(finalDecision) {
  try {
    return normalizeFinalDecision(finalDecision ?? "allow");
  } catch {
    return "reject";
  }
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
    if (FORBIDDEN_AUTONOMOUS_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: autonomous expression must not define command, commit, candidate, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}

function assertDuration(name, value, min, max, context) {
  if (typeof value !== "number" || Number.isNaN(value) || value < min || value > max) {
    throw new ContractError(`${context}: ${name} out of range`, { name, value, min, max });
  }
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number < 0) return 0;
  if (number > 1) return 1;
  return Number(number.toFixed(4));
}

function safeLatencyMs(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(30_000, Math.trunc(number));
}
