import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";
import { assertGameEmbodimentSafe } from "../game/gameEmbodiment.js";
import { assertAffectiveContinuitySafe } from "../personality/affectiveContinuity.js";
import { assertIrisPersonaProfileSafe } from "../personality/irisPersonaProfile.js";
import { assertPersonalityHabitSafe } from "../personality/personalityHabit.js";
import { assertMotionCueSafe } from "../presence/motionCue.js";
import { assertPerformancePlanSafe } from "../presence/performancePlan.js";
import { assertSpeechCueSafe } from "../voice/speechCue.js";

const EXPRESSION_PROFILE_IDS = new Set([
  "expression_steady_talk",
  "expression_big_laugh_recovery",
  "expression_game_laugh_recovery",
  "expression_game_focus",
  "expression_game_tension",
  "expression_game_celebration",
  "expression_idle_breath",
]);

const BREATH_EVENT_KINDS = new Set([
  "ambient_breath_cycle",
  "pre_laugh_inhale",
  "laugh_burst",
  "laugh_wheeze_tail",
  "laugh_recovery_breath",
  "focus_hold",
  "focus_release",
  "idle_soft_breath",
]);

const LAUGH_KINDS = new Set([
  "none",
  "breathy_burst",
  "wheeze_recovery",
  "game_burst",
  "celebration_laugh",
]);

const FORBIDDEN_EXPRESSION_FIELDS = new Set([
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

export function createExpressionProfile({
  finalOutput,
  speechCue,
  motionCue,
  performancePlan,
  affectiveContinuity,
  personalityHabit,
  gameEmbodiment,
  personaProfile = null,
} = {}) {
  assertNoWorldCommand(finalOutput, "Expression profile final output input");
  assertSpeechCueSafe(speechCue, "Expression profile speech cue");
  assertMotionCueSafe(motionCue, "Expression profile motion cue");
  assertPerformancePlanSafe(performancePlan, "Expression profile performance plan");
  assertAffectiveContinuitySafe(affectiveContinuity, "Expression profile affective input");
  assertPersonalityHabitSafe(personalityHabit, "Expression profile habit input");
  assertGameEmbodimentSafe(gameEmbodiment, "Expression profile game embodiment input");
  if (personaProfile) {
    assertIrisPersonaProfileSafe(personaProfile, "Expression profile persona input");
  }

  const profileId = chooseExpressionProfileId({
    speechCue,
    motionCue,
    affectiveContinuity,
    gameEmbodiment,
  });
  const laughKind = chooseLaughKind({ profileId, affectiveContinuity, gameEmbodiment });
  const profile = {
    schema: "iris_expression_profile_v1",
    trace_id: finalOutput?.trace_id ?? speechCue.trace_id ?? null,
    event_id: finalOutput?.event_id ?? speechCue.event_id ?? null,
    internal_profile: true,
    expression_profile_id: profileId,
    expression_intensity: chooseExpressionIntensity({
      profileId,
      speechCue,
      motionCue,
      affectiveContinuity,
      gameEmbodiment,
    }),
    voice_engine_profile: buildVoiceEngineProfile({
      profileId,
      laughKind,
      speechCue,
      affectiveContinuity,
      gameEmbodiment,
    }),
    laugh_expression_profile: buildLaughExpressionProfile({
      laughKind,
      speechCue,
      performancePlan,
      affectiveContinuity,
      personalityHabit,
      personaProfile,
    }),
    breath_event_plan: buildBreathEventPlan({
      profileId,
      laughKind,
      speechCue,
      motionCue,
      performancePlan,
      affectiveContinuity,
      gameEmbodiment,
    }),
    live2d_expression_profile: buildLive2dExpressionProfile({
      profileId,
      laughKind,
      motionCue,
      gameEmbodiment,
      affectiveContinuity,
    }),
    recovery_profile: buildRecoveryProfile({
      profileId,
      laughKind,
      affectiveContinuity,
      gameEmbodiment,
    }),
    source_summary: {
      prosody_style: speechCue.prosody_style ?? "none",
      motion_style: motionCue.motion_style ?? "none",
      laughter_state: affectiveContinuity.laughter_state ?? "none",
      selected_habit: personalityHabit.selected_habit ?? "none",
      game_embodied_state: gameEmbodiment.game_embodied_state ?? "not_observed",
    },
    safety_expression_policy: {
      profile_status: "safe",
      adapter_boundary: "read_only_profile",
      candidate_passthrough_allowed: false,
      strong_expression_allowed:
        affectiveContinuity.affective_safety_result?.strong_expression_allowed === true ||
        gameEmbodiment.game_embodied_state === "celebration",
    },
    adapter_validation_required: true,
  };

  assertExpressionProfileSafe(profile, "Expression profile output");
  return profile;
}

export function assertExpressionProfileSafe(expressionProfile, context = "expression profile") {
  if (!expressionProfile || typeof expressionProfile !== "object") {
    throw new ContractError(`${context}: missing expression profile`);
  }
  assertNoWorldCommand(expressionProfile, context);
  assertNoForbiddenFieldsRecursive(expressionProfile, context);
  if (expressionProfile.schema !== "iris_expression_profile_v1") {
    throw new ContractError(`${context}: invalid schema`, {
      schema: expressionProfile.schema,
    });
  }
  if (expressionProfile.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (expressionProfile.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!EXPRESSION_PROFILE_IDS.has(expressionProfile.expression_profile_id)) {
    throw new ContractError(`${context}: unsupported expression_profile_id`, {
      expression_profile_id: expressionProfile.expression_profile_id,
    });
  }
  assertScore("expression_intensity", expressionProfile.expression_intensity, context);
  const laughKind = expressionProfile.laugh_expression_profile?.laugh_kind;
  if (!LAUGH_KINDS.has(laughKind)) {
    throw new ContractError(`${context}: unsupported laugh kind`, { laugh_kind: laughKind });
  }
  if (!Array.isArray(expressionProfile.breath_event_plan)) {
    throw new ContractError(`${context}: breath event plan is required`);
  }
  for (const breathEvent of expressionProfile.breath_event_plan) {
    if (!BREATH_EVENT_KINDS.has(breathEvent.event_kind)) {
      throw new ContractError(`${context}: unsupported breath event kind`, {
        event_kind: breathEvent.event_kind,
      });
    }
    assertTimelineEvent(breathEvent, context);
    assertScore("breath intensity", breathEvent.intensity, context);
  }
}

export function sanitizeExpressionProfileForPublicState(expressionProfile) {
  if (!expressionProfile) return null;
  assertExpressionProfileSafe(expressionProfile, "Expression profile public summary");
  return structuredClone(expressionProfile);
}

function chooseExpressionProfileId({
  speechCue,
  motionCue,
  affectiveContinuity,
  gameEmbodiment,
}) {
  const laughterActive =
    affectiveContinuity.laughter_state !== "none" ||
    speechCue.prosody_style === "laughing_speech" ||
    motionCue.motion_style === "laugh_big";
  if (laughterActive && gameEmbodiment.game_embodied_state === "burst_laugh_game") {
    return "expression_game_laugh_recovery";
  }
  if (laughterActive) return "expression_big_laugh_recovery";
  if (gameEmbodiment.game_embodied_state === "panic_light") return "expression_game_tension";
  if (gameEmbodiment.game_embodied_state === "celebration") {
    return "expression_game_celebration";
  }
  if (
    gameEmbodiment.game_embodied_state === "focused" ||
    gameEmbodiment.game_embodied_state === "calm_play" ||
    motionCue.motion_style === "focused_talk"
  ) {
    return "expression_game_focus";
  }
  if (motionCue.motion_style === "idle_breath") return "expression_idle_breath";
  return "expression_steady_talk";
}

function chooseLaughKind({ profileId, affectiveContinuity, gameEmbodiment }) {
  if (profileId === "expression_game_laugh_recovery") return "game_burst";
  if (profileId === "expression_game_celebration") return "celebration_laugh";
  if (affectiveContinuity.laughter_state === "wheeze_laugh") return "wheeze_recovery";
  if (profileId === "expression_big_laugh_recovery") return "breathy_burst";
  if (gameEmbodiment.game_embodied_state === "burst_laugh_game") return "game_burst";
  return "none";
}

function chooseExpressionIntensity({
  profileId,
  speechCue,
  motionCue,
  affectiveContinuity,
  gameEmbodiment,
}) {
  const base =
    (speechCue.volume ?? 0.52) * 0.24 +
    (speechCue.breathiness ?? 0.18) * 0.26 +
    (motionCue.body_sway ?? 0.18) * 0.18 +
    (affectiveContinuity.affective_state?.arousal ?? 0.42) * 0.22 +
    (gameEmbodiment.posture_plan?.motion_scale ?? 0.28) * 0.1;
  const boost =
    profileId.includes("laugh") ? 0.22 : profileId === "expression_game_tension" ? 0.12 : 0;
  return clamp01(base + boost);
}

function buildVoiceEngineProfile({
  profileId,
  laughKind,
  speechCue,
  affectiveContinuity,
  gameEmbodiment,
}) {
  const basePace = speechCue.pace ?? 0.94;
  const basePitch = (speechCue.pitch ?? 0.5) - 0.5;
  const baseVolume = (speechCue.volume ?? 0.55) - 0.55;
  const recoveryMs = affectiveContinuity.breath_recovery_plan?.recovery_window_ms ?? 0;
  const gameVoice = gameEmbodiment.voice_affect_plan ?? {};
  if (laughKind !== "none") {
    return {
      voice_profile_id:
        laughKind === "wheeze_recovery" ? "tts_wheeze_laugh_recovery" : "tts_breathy_laugh",
      style_key: laughKind === "game_burst" ? "game_laugh_with_focus_return" : "breathy_laugh",
      pace_multiplier: clamp(basePace - 0.08, 0.72, 1.08),
      pitch_shift: clamp(basePitch + 0.06, -0.18, 0.28),
      volume_gain: clamp(baseVolume + 0.08, -0.16, 0.3),
      breath_mix: clamp(speechCue.breathiness ?? 0.5, 0.32, 0.86),
      laugh_rendering: {
        laugh_kind: laughKind,
        burst_count: laughKind === "wheeze_recovery" ? 4 : 3,
        inhale_before_laugh: true,
        recover_after_ms: Math.max(900, recoveryMs),
        keep_words_understandable: true,
      },
    };
  }
  if (profileId === "expression_game_tension") {
    return {
      voice_profile_id: "tts_game_tension_clear",
      style_key: "low_clear_focus",
      pace_multiplier: clamp(basePace + 0.04, 0.82, 1.16),
      pitch_shift: clamp(basePitch - 0.03, -0.18, 0.16),
      volume_gain: clamp(baseVolume - 0.04, -0.18, 0.18),
      breath_mix: clamp(gameVoice.breathiness_target ?? speechCue.breathiness ?? 0.22, 0.16, 0.52),
      laugh_rendering: {
        laugh_kind: "none",
        burst_count: 0,
        inhale_before_laugh: false,
        recover_after_ms: 0,
        keep_words_understandable: true,
      },
    };
  }
  return {
    voice_profile_id:
      profileId === "expression_idle_breath" ? "tts_quiet_presence" : "tts_natural_iris",
    style_key: profileId === "expression_game_focus" ? "focused_observation" : "natural_warm",
    pace_multiplier: clamp(basePace, 0.78, 1.16),
    pitch_shift: clamp(basePitch, -0.16, 0.2),
    volume_gain: clamp(baseVolume, -0.18, 0.22),
    breath_mix: clamp(speechCue.breathiness ?? 0.18, 0.08, 0.48),
    laugh_rendering: {
      laugh_kind: "none",
      burst_count: 0,
      inhale_before_laugh: false,
      recover_after_ms: 0,
      keep_words_understandable: true,
    },
  };
}

function buildLaughExpressionProfile({
  laughKind,
  speechCue,
  performancePlan,
  affectiveContinuity,
  personalityHabit,
  personaProfile,
}) {
  if (laughKind === "none") {
    return {
      laugh_kind: "none",
      laugh_start_ms: 0,
      laugh_peak_ms: 0,
      laugh_end_ms: 0,
      breathlessness_level: 0,
      aftertaste_hint: personalityHabit.selected_habit === "laugh_aftertaste",
      persona_laugh_hint: personaProfile?.laughter_style ?? null,
    };
  }
  const firstLaugh = speechCue.laugh_breaths?.[0] ?? {
    start_ms: 120,
    end_ms: Math.min(760, performancePlan.total_duration_ms ?? 900),
  };
  const recoveryWindow = affectiveContinuity.breath_recovery_plan?.recovery_window_ms ?? 900;
  const laughEnd = Math.min(
    performancePlan.total_duration_ms ?? firstLaugh.end_ms + recoveryWindow,
    firstLaugh.end_ms + recoveryWindow
  );
  return {
    laugh_kind: laughKind,
    laugh_start_ms: firstLaugh.start_ms,
    laugh_peak_ms: Math.min(firstLaugh.end_ms, firstLaugh.start_ms + 420),
    laugh_end_ms: laughEnd,
    breathlessness_level: laughKind === "wheeze_recovery" ? 0.86 : 0.72,
    aftertaste_hint: true,
    persona_laugh_hint: personaProfile?.laughter_style ?? null,
  };
}

function buildBreathEventPlan({
  profileId,
  laughKind,
  speechCue,
  motionCue,
  performancePlan,
  affectiveContinuity,
  gameEmbodiment,
}) {
  const totalDurationMs = Math.max(900, performancePlan.total_duration_ms ?? 900);
  if (laughKind !== "none") {
    const laugh = speechCue.laugh_breaths?.[0] ?? {
      start_ms: 160,
      end_ms: Math.min(780, totalDurationMs),
      intensity: 0.74,
    };
    const inhaleStart = Math.max(0, laugh.start_ms - 180);
    const laughEnd = Math.max(laugh.end_ms, laugh.start_ms + 360);
    return [
      {
        event_kind: "pre_laugh_inhale",
        start_ms: inhaleStart,
        end_ms: laugh.start_ms,
        intensity: clamp01((laugh.intensity ?? 0.74) - 0.18),
        sync_lane: "voice",
      },
      {
        event_kind: "laugh_burst",
        start_ms: laugh.start_ms,
        end_ms: laughEnd,
        intensity: clamp01(laugh.intensity ?? 0.78),
        sync_lane: "voice_and_face",
      },
      {
        event_kind: "laugh_wheeze_tail",
        start_ms: laughEnd,
        end_ms: Math.min(totalDurationMs, laughEnd + (laughKind === "wheeze_recovery" ? 520 : 280)),
        intensity: laughKind === "wheeze_recovery" ? 0.68 : 0.46,
        sync_lane: "voice",
      },
      {
        event_kind: "laugh_recovery_breath",
        start_ms: Math.min(totalDurationMs, laughEnd + 260),
        end_ms: Math.min(
          totalDurationMs,
          laughEnd + Math.max(900, affectiveContinuity.breath_recovery_plan?.recovery_window_ms ?? 900)
        ),
        intensity: clamp01(0.52 + (motionCue.breathing_rate ?? 0.34) * 0.18),
        sync_lane: "body",
      },
    ];
  }
  if (profileId === "expression_game_tension" || profileId === "expression_game_focus") {
    const holdEnd = Math.min(360, totalDurationMs);
    return [
      {
        event_kind: "focus_hold",
        start_ms: 0,
        end_ms: holdEnd,
        intensity: profileId === "expression_game_tension" ? 0.58 : 0.36,
        sync_lane: "body",
      },
      {
        event_kind: "focus_release",
        start_ms: holdEnd,
        end_ms: Math.min(totalDurationMs, holdEnd + 520),
        intensity: gameEmbodiment.game_breath_plan?.recovery_breaths_required ? 0.48 : 0.32,
        sync_lane: "voice_and_body",
      },
    ];
  }
  if (profileId === "expression_idle_breath") {
    return [
      {
        event_kind: "idle_soft_breath",
        start_ms: 0,
        end_ms: totalDurationMs,
        intensity: clamp01(motionCue.breathing_rate ?? 0.34),
        sync_lane: "body",
      },
    ];
  }
  return [
    {
      event_kind: "ambient_breath_cycle",
      start_ms: 0,
      end_ms: totalDurationMs,
      intensity: clamp01(motionCue.breathing_rate ?? 0.34),
      sync_lane: "body",
    },
  ];
}

function buildLive2dExpressionProfile({ profileId, laughKind, motionCue, gameEmbodiment }) {
  if (laughKind !== "none") {
    return {
      expression_key:
        laughKind === "wheeze_recovery" ? "eyes_squeeze_wheeze_laugh" : "open_mouth_big_laugh",
      gaze_profile: gameEmbodiment.game_embodied_state === "burst_laugh_game" ? "screen_then_audience" : "audience_soft",
      blink_profile: "laugh_squeeze_then_reset",
      head_motion_profile: "small_laugh_bounce",
      body_motion_profile: "shoulder_laugh_with_recovery",
      mouth_profile: "tts_sync_with_laugh_breaks",
      motion_scale_limit: 0.56,
    };
  }
  if (profileId === "expression_game_tension") {
    return {
      expression_key: "focused_small_mouth",
      gaze_profile: "screen_focus_micro_saccade",
      blink_profile: "reduced_blink_brief",
      head_motion_profile: "micro_tracking",
      body_motion_profile: "forward_micro_tension",
      mouth_profile: "short_clear_phrases",
      motion_scale_limit: 0.42,
    };
  }
  if (profileId === "expression_game_focus") {
    return {
      expression_key: "focused_bright",
      gaze_profile: "screen_focus_micro_saccade",
      blink_profile: "natural_focus",
      head_motion_profile: "micro_tracking",
      body_motion_profile: "compact_focus",
      mouth_profile: "short_clear_phrases",
      motion_scale_limit: 0.42,
    };
  }
  if (profileId === "expression_idle_breath") {
    return {
      expression_key: "neutral_warm_idle",
      gaze_profile: "audience_soft",
      blink_profile: "slow_idle",
      head_motion_profile: "barely_there",
      body_motion_profile: "soft_breath_loop",
      mouth_profile: "closed_or_soft_rest",
      motion_scale_limit: 0.24,
    };
  }
  return {
    expression_key: motionCue.expression_hint ?? "neutral_warm",
    gaze_profile: motionCue.gaze_hint ?? "audience_soft",
    blink_profile: "natural",
    head_motion_profile: motionCue.head_motion ?? "soft_nod",
    body_motion_profile: motionCue.gesture_hint ?? "small_hand",
    mouth_profile: "tts_mouth_sync",
    motion_scale_limit: 0.46,
  };
}

function buildRecoveryProfile({ profileId, laughKind, affectiveContinuity, gameEmbodiment }) {
  const needsRecovery =
    laughKind !== "none" ||
    profileId === "expression_game_tension" ||
    gameEmbodiment.embodied_recovery_plan?.required === true ||
    affectiveContinuity.breath_recovery_plan?.required === true;
  return {
    required: needsRecovery,
    recovery_after_ms:
      laughKind !== "none"
        ? Math.max(900, affectiveContinuity.breath_recovery_plan?.recovery_window_ms ?? 900)
        : needsRecovery
          ? 720
          : 0,
    recovery_steps: needsRecovery
      ? ["breath_reset", "gaze_return", "mouth_soften", "delivery_stabilize"]
      : [],
    next_delivery_bias: needsRecovery ? "reconnect_after_expression" : "continue_naturally",
  };
}

function assertTimelineEvent(event, context) {
  if (typeof event.start_ms !== "number" || typeof event.end_ms !== "number") {
    throw new ContractError(`${context}: breath event timing must be numeric`, { event });
  }
  if (event.start_ms < 0 || event.end_ms < event.start_ms) {
    throw new ContractError(`${context}: invalid breath event timing`, { event });
  }
}

function assertScore(name, value, context) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    throw new ContractError(`${context}: score out of range`, { name, value });
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
    if (FORBIDDEN_EXPRESSION_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: expression profile must not define candidate, command, commit, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  if (number < min) return min;
  if (number > max) return max;
  return Number(number.toFixed(4));
}
