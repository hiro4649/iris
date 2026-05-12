import { ContractError, assertNoWorldCommand, canonical, normalizeFinalDecision } from "../../core/contracts.js";
import { assertBodyContinuitySafe } from "../presence/bodyContinuity.js";
import { assertMotionCueSafe } from "../presence/motionCue.js";
import { assertTurnRhythmSafe } from "../presence/turnRhythm.js";
import { assertSpeechCueSafe } from "../voice/speechCue.js";
import { assertReadOnlyAffectSnapshot } from "./affectState.js";

const LAUGHTER_STATES = new Set(["none", "burst_laugh", "wheeze_laugh", "silent_laugh"]);
const SECONDARY_EMOTIONS = new Set(["none", ...canonical.emotions]);
const REQUIRED_RECOVERY_STEPS = ["breath_stabilize", "voice_soften", "gaze_return", "topic_reconnect"];

const FORBIDDEN_AFFECTIVE_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
]);

export function createAffectiveContinuity({
  finalOutput,
  speechCue,
  motionCue,
  bodyContinuity,
  turnRhythm,
} = {}) {
  assertNoWorldCommand(finalOutput, "Affective continuity final output input");
  assertSpeechCueSafe(speechCue, "Affective continuity speech cue");
  assertMotionCueSafe(motionCue, "Affective continuity motion cue");
  assertBodyContinuitySafe(bodyContinuity, "Affective continuity body continuity");
  assertTurnRhythmSafe(turnRhythm, "Affective continuity turn rhythm");

  const snapshot = finalOutput?.affect_snapshot ?? {};
  assertReadOnlyAffectSnapshot(snapshot, "Affective continuity affect snapshot");

  const safetyStatus = normalizeSafetyStatus(finalOutput?.final_decision);
  const primaryEmotion = normalizePrimaryEmotion(finalOutput?.phase15_continuity_envelope?.emotion);
  const laughterState = chooseLaughterState({ safetyStatus, speechCue, bodyContinuity, turnRhythm });
  const arousal = clamp01(
    (snapshot.energy ?? 0.42) * 0.48 +
      (snapshot.amusement ?? 0.22) * 0.38 +
      (bodyContinuity.body_motion_plan?.motion_load ?? 0.24) * 0.14
  );
  const valence = clamp01((snapshot.warmth ?? 0.54) * 0.54 + (snapshot.amusement ?? 0.22) * 0.46);
  const intensity = clamp01(arousal * 0.58 + valence * 0.22 + (laughterState !== "none" ? 0.2 : 0));
  const recoveryRequired = laughterState !== "none" || bodyContinuity.body_motion_plan?.recovery_state === "recovering";
  const carryoverMs = chooseCarryoverMs({ laughterState, intensity, safetyStatus });
  const now = Date.now();

  const affectiveContinuity = {
    schema: "iris_affective_continuity_v1",
    trace_id: finalOutput?.trace_id ?? null,
    event_id: finalOutput?.event_id ?? null,
    internal_profile: true,
    affective_state_id: chooseAffectiveStateId({
      laughterState,
      primaryEmotion,
      intensity,
      snapshot,
      bodyContinuity,
    }),
    affective_state: {
      primary_emotion: primaryEmotion,
      secondary_emotion: chooseSecondaryEmotion({ laughterState, snapshot }),
      mood_level: chooseMoodLevel({ intensity, valence, snapshot }),
      arousal,
      valence,
      carryover_until_ms: now + carryoverMs,
      decay_rate: chooseDecayRate({ laughterState, intensity }),
      recovery_required: recoveryRequired,
      source_affect_label: snapshot.affect_label ?? "settled",
    },
    emotion_carryover_plan: {
      carryover_ms: carryoverMs,
      decay_curve: laughterState !== "none" ? "laugh_recovery_decay" : "soft_linear_decay",
      can_be_refreshed_by_new_event: safetyStatus === "safe",
      refresh_ceiling: laughterState !== "none" ? "medium" : "weak",
    },
    laughter_state: laughterState,
    voice_affect_plan: {
      voice_profile: laughterState !== "none" ? "laugh_recovery_voice_profile" : "steady_voice_profile",
      breathiness_target: clamp(speechCue.breathiness ?? 0.2, 0.08, laughterState !== "none" ? 0.82 : 0.48),
      pitch_bias: clamp((speechCue.pitch ?? 0.5) - 0.5, -0.22, 0.28),
      volume_bias: clamp((speechCue.volume ?? 0.55) - 0.55, -0.22, 0.3),
      soften_after_ms: recoveryRequired ? 720 : 0,
    },
    breath_recovery_plan: {
      required: recoveryRequired,
      steps: recoveryRequired ? [...REQUIRED_RECOVERY_STEPS] : [],
      recovery_window_ms: recoveryRequired ? Math.max(900, turnRhythm.response_timing_plan.post_response_silence_ms) : 0,
    },
    affective_safety_result: {
      safety_status: safetyStatus,
      strong_expression_allowed: safetyStatus === "safe" && laughterState !== "none",
      rejected_affective_signals: safetyStatus === "reject" && laughterState !== "none" ? ["laughter_blocked_by_safety"] : [],
    },
    phase18_laughter_state_firewall: {
      laughter_state_internal_profile: true,
      no_canonical_emotion_export: true,
    },
    adapter_validation_required: true,
  };

  assertAffectiveContinuitySafe(affectiveContinuity, "Affective continuity output");
  return affectiveContinuity;
}

export function assertAffectiveContinuitySafe(
  affectiveContinuity,
  context = "affective continuity"
) {
  if (!affectiveContinuity || typeof affectiveContinuity !== "object") {
    throw new ContractError(`${context}: missing affective continuity export`);
  }
  assertNoWorldCommand(affectiveContinuity, context);
  assertNoForbiddenFieldsRecursive(affectiveContinuity, context);
  if (affectiveContinuity.schema !== "iris_affective_continuity_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: affectiveContinuity.schema });
  }
  if (affectiveContinuity.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (affectiveContinuity.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (
    affectiveContinuity.phase18_laughter_state_firewall?.laughter_state_internal_profile !== true ||
    affectiveContinuity.phase18_laughter_state_firewall?.no_canonical_emotion_export !== true
  ) {
    throw new ContractError(`${context}: Phase18 laughter_state canonical firewall required`);
  }
  if (!LAUGHTER_STATES.has(affectiveContinuity.laughter_state)) {
    throw new ContractError(`${context}: unsupported laughter_state`, {
      laughter_state: affectiveContinuity.laughter_state,
    });
  }
  const state = affectiveContinuity.affective_state ?? {};
  if (!canonical.emotions.has(state.primary_emotion)) {
    throw new ContractError(`${context}: unsupported primary_emotion`, {
      primary_emotion: state.primary_emotion,
    });
  }
  if (!SECONDARY_EMOTIONS.has(state.secondary_emotion)) {
    throw new ContractError(`${context}: unsupported secondary_emotion`, {
      secondary_emotion: state.secondary_emotion,
    });
  }
  if (
    affectiveContinuity.laughter_state !== "none" &&
    (state.primary_emotion === affectiveContinuity.laughter_state ||
      state.secondary_emotion === affectiveContinuity.laughter_state)
  ) {
    throw new ContractError(`${context}: laughter_state must not become canonical emotion`, {
      laughter_state: affectiveContinuity.laughter_state,
    });
  }
  assertRecoveryPlanSafe(affectiveContinuity, context);
  assertScore("arousal", state.arousal);
  assertScore("valence", state.valence);
}

function assertRecoveryPlanSafe(affectiveContinuity, context) {
  if (affectiveContinuity.affective_state?.recovery_required !== true) return;
  const plan = affectiveContinuity.breath_recovery_plan ?? {};
  if (plan.required !== true) {
    throw new ContractError(`${context}: recovery_required must activate breath recovery plan`);
  }
  const steps = Array.isArray(plan.steps) ? plan.steps : [];
  for (const step of REQUIRED_RECOVERY_STEPS) {
    if (!steps.includes(step)) {
      throw new ContractError(`${context}: recovery_required must include full recovery steps`, { step });
    }
  }
  if (typeof plan.recovery_window_ms !== "number" || plan.recovery_window_ms <= 0) {
    throw new ContractError(`${context}: recovery_required must keep recovery window`);
  }
  if (typeof affectiveContinuity.voice_affect_plan?.soften_after_ms !== "number" || affectiveContinuity.voice_affect_plan.soften_after_ms <= 0) {
    throw new ContractError(`${context}: recovery_required must soften voice`);
  }
}

function chooseLaughterState({ safetyStatus, speechCue, bodyContinuity, turnRhythm }) {
  if (safetyStatus !== "safe") return "none";
  const isLaughBody = bodyContinuity.body_state_id === "body_burst_laugh_recovery";
  if (!isLaughBody || turnRhythm.laughter_recovery_plan?.active !== true) return "none";
  if ((speechCue.breathiness ?? 0) >= 0.74) return "wheeze_laugh";
  if ((speechCue.mouth_cues ?? []).length === 0) return "silent_laugh";
  return "burst_laugh";
}

function chooseAffectiveStateId({ laughterState, primaryEmotion, intensity, snapshot, bodyContinuity }) {
  if (laughterState !== "none") return `affective_${laughterState}_recovery`;
  if (bodyContinuity?.body_state_id === "body_screen_focus_talk" || (snapshot.focus ?? 0) >= 0.62) {
    return "affective_focused_carryover";
  }
  if (intensity >= 0.62) return `affective_${primaryEmotion}_strong_carryover`;
  if (intensity >= 0.42) return `affective_${primaryEmotion}_medium_carryover`;
  return "affective_settled";
}

function chooseSecondaryEmotion({ laughterState, snapshot }) {
  if (laughterState !== "none") return "surprise";
  if ((snapshot.warmth ?? 0) >= 0.64) return "happy";
  return "none";
}

function chooseMoodLevel({ intensity, valence, snapshot }) {
  if ((snapshot.focus ?? 0) >= 0.7) return "focused";
  if (intensity >= 0.7) return "strong";
  if (valence >= 0.58 || intensity >= 0.46) return "medium";
  return "weak";
}

function chooseCarryoverMs({ laughterState, intensity, safetyStatus }) {
  if (safetyStatus === "reject") return 0;
  if (laughterState !== "none") return 12_000;
  if (intensity >= 0.68) return 75_000;
  if (intensity >= 0.46) return 45_000;
  return 18_000;
}

function chooseDecayRate({ laughterState, intensity }) {
  if (laughterState !== "none") return 0.18;
  if (intensity >= 0.68) return 0.035;
  if (intensity >= 0.46) return 0.055;
  return 0.09;
}

function normalizePrimaryEmotion(value) {
  if (!canonical.emotions.has(value)) {
    throw new ContractError("Affective continuity input has unsupported primary emotion", {
      primary_emotion: value,
    });
  }
  return value;
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
    value.forEach((item, index) => assertNoForbiddenFieldsRecursive(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_AFFECTIVE_FIELDS.has(field)) {
      throw new ContractError(`${context}: affective continuity must not define command or canonical fields`, {
        field,
        path,
      });
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}

function assertScore(name, value) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    throw new ContractError("score out of range", { name, value });
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
