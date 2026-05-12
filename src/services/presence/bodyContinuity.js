import {
  ContractError,
  assertNoWorldCommand,
  normalizeFinalDecision,
} from "../../core/contracts.js";
import { assertMotionCueSafe } from "./motionCue.js";
import { assertPerformancePlanSafe } from "./performancePlan.js";
import { assertSpeechCueSafe } from "../voice/speechCue.js";

const FORBIDDEN_BODY_FIELDS = new Set([
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

export function createBodyContinuity({
  finalOutput,
  speechCue,
  motionCue,
  performancePlan,
} = {}) {
  assertNoWorldCommand(finalOutput, "Body continuity final output input");
  assertSpeechCueSafe(speechCue, "Body continuity speech cue");
  assertMotionCueSafe(motionCue, "Body continuity motion cue");
  assertPerformancePlanSafe(performancePlan, "Body continuity performance plan");

  const safetyStatus = normalizeSafetyStatus(finalOutput?.final_decision);
  const durationMs = Number(performancePlan?.total_duration_ms ?? 900);
  const isBurstLaugh = motionCue.motion_style === "laugh_big";
  const isIdle = motionCue.motion_style === "idle_breath";
  const isFocused = motionCue.motion_style === "focused_talk";
  const unsafeLaughContext = hasUnsafeLaughContext(finalOutput);
  const rejectedBodySignals = [];

  if (safetyStatus === "reject" && isBurstLaugh) {
    rejectedBodySignals.push("strong_motion_rejected_by_safety_status");
  }
  if (isBurstLaugh && unsafeLaughContext) {
    rejectedBodySignals.push("burst_laugh_rejected_by_unsafe_context");
  }
  if (isBurstLaugh && durationMs > 10_000) {
    rejectedBodySignals.push("burst_laugh_duration_limited");
  }

  const forceSafeIdle = safetyStatus === "reject" || rejectedBodySignals.length > 0;
  const bodyProfile = chooseBodyProfile({ forceSafeIdle, isBurstLaugh, isIdle, isFocused });
  const motionLoad = forceSafeIdle
    ? 0.12
    : isBurstLaugh
      ? 0.78
      : isFocused
        ? 0.42
        : isIdle
          ? 0.18
          : 0.34;

  const bodyContinuity = {
    schema: "iris_body_continuity_v1",
    trace_id: finalOutput?.trace_id ?? null,
    event_id: finalOutput?.event_id ?? null,
    internal_profile: true,
    body_state_id: bodyProfile.body_state_id,
    body_motion_plan: {
      posture: bodyProfile.posture,
      head_profile: bodyProfile.head_profile,
      torso_profile: bodyProfile.torso_profile,
      gesture_profile: forceSafeIdle ? "gesture_none_profile" : profileName(motionCue.gesture_hint),
      motion_load: clamp01(motionLoad),
      recovery_state: bodyProfile.recovery_state,
    },
    expression_plan: {
      expression_profile: forceSafeIdle
        ? "expression_neutral_recovery_profile"
        : profileName(motionCue.expression_hint),
      transition_ms: isBurstLaugh ? 420 : isFocused ? 220 : 180,
      recovery_ms: isBurstLaugh ? 900 : 420,
      conflict_policy: "blend_then_recover",
    },
    breath_plan: {
      breath_profile: forceSafeIdle
        ? "breath_safe_idle_profile"
        : isBurstLaugh
          ? "burst_laugh_profile"
          : isIdle
            ? "idle_breath_profile"
            : "stable_speech_profile",
      rate: clamp(motionCue.breathing_rate, 0.16, 0.92),
      depth: clamp(0.36 + motionLoad * 0.46, 0.24, 0.82),
      laugh_recovery_breaths: isBurstLaugh && !forceSafeIdle ? buildLaughRecoveryBreaths(durationMs) : [],
    },
    gaze_plan: {
      gaze_profile: forceSafeIdle
        ? "gaze_safe_soft_profile"
        : motionCue.gaze_hint === "screen_focus"
          ? "screen_focus_profile"
          : "audience_soft_profile",
      attention_target: motionCue.gaze_hint === "screen_focus" && !forceSafeIdle ? "game_screen" : "audience",
      blink_rate: clamp(motionCue.blink_rate, 0.1, 0.58),
      saccade_softening: isFocused ? 0.72 : 0.54,
    },
    physics_plan: {
      physics_profile: isBurstLaugh && !forceSafeIdle ? "laugh_coupled_physics_profile" : "soft_coupled_physics_profile",
      hair_follow: clamp(0.24 + motionLoad * 0.36, 0.18, 0.62),
      cloth_follow: clamp(0.2 + motionLoad * 0.28, 0.14, 0.5),
      damping: isBurstLaugh && !forceSafeIdle ? 0.68 : 0.78,
    },
    continuity_envelope: {
      source_phase: "phase15",
      safety_status: safetyStatus,
      text_present: String(finalOutput?.final_text ?? "").trim() !== "",
      total_duration_ms: durationMs,
      internal_profile: true,
    },
    phase16_internal_profile_firewall: {
      body_state_internal_profile: true,
      expression_profile_internal_profile: true,
      laughter_body_profile_internal_profile: true,
      no_canonical_emotion_export: true,
      no_canonical_action_type_export: true,
      no_canonical_task_type_export: true,
    },
    phase16_burst_laugh_safety: {
      unsafe_context_blocks_burst_laugh: true,
      recovery_state_required: true,
    },
    body_continuity_score: scoreContinuity({
      safetyStatus,
      rejectedBodySignals,
      motionLoad,
      breathRate: motionCue.breathing_rate,
    }),
    rejected_body_signals: rejectedBodySignals,
    adapter_validation_required: true,
  };

  assertBodyContinuitySafe(bodyContinuity, "Body continuity output");
  return bodyContinuity;
}

export function assertBodyContinuitySafe(bodyContinuity, context = "body continuity") {
  if (!bodyContinuity || typeof bodyContinuity !== "object") {
    throw new ContractError(`${context}: missing body continuity export`);
  }
  assertNoWorldCommand(bodyContinuity, context);
  assertNoForbiddenFieldsRecursive(bodyContinuity, context);
  if (bodyContinuity.schema !== "iris_body_continuity_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: bodyContinuity.schema });
  }
  if (bodyContinuity.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (
    bodyContinuity.phase16_internal_profile_firewall?.body_state_internal_profile !== true ||
    bodyContinuity.phase16_internal_profile_firewall?.expression_profile_internal_profile !== true ||
    bodyContinuity.phase16_internal_profile_firewall?.laughter_body_profile_internal_profile !== true ||
    bodyContinuity.phase16_internal_profile_firewall?.no_canonical_emotion_export !== true ||
    bodyContinuity.phase16_internal_profile_firewall?.no_canonical_action_type_export !== true ||
    bodyContinuity.phase16_internal_profile_firewall?.no_canonical_task_type_export !== true
  ) {
    throw new ContractError(`${context}: Phase16 internal profile firewall required`);
  }
  if (
    bodyContinuity.phase16_burst_laugh_safety?.unsafe_context_blocks_burst_laugh !== true ||
    bodyContinuity.phase16_burst_laugh_safety?.recovery_state_required !== true
  ) {
    throw new ContractError(`${context}: burst laugh safety boundary required`);
  }
  if (
    bodyContinuity.rejected_body_signals?.includes("burst_laugh_rejected_by_unsafe_context") &&
    bodyContinuity.body_state_id === "body_burst_laugh_recovery"
  ) {
    throw new ContractError(`${context}: burst laugh must not activate in unsafe context`);
  }
  if (
    bodyContinuity.body_state_id === "body_burst_laugh_recovery" &&
    bodyContinuity.body_motion_plan?.recovery_state !== "recovering"
  ) {
    throw new ContractError(`${context}: burst laugh must require recovery state`);
  }
  if (bodyContinuity.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  const breathRate = bodyContinuity.breath_plan?.rate;
  if (typeof breathRate !== "number" || breathRate <= 0) {
    throw new ContractError(`${context}: breath rate must stay active`, { breathRate });
  }
  assertScore("body_continuity_score", bodyContinuity.body_continuity_score);
}

function chooseBodyProfile({ forceSafeIdle, isBurstLaugh, isIdle, isFocused }) {
  if (forceSafeIdle) {
    return {
      body_state_id: "body_safe_idle",
      posture: "relaxed_upright",
      head_profile: "head_soft_center_profile",
      torso_profile: "torso_idle_breath_profile",
      recovery_state: "stable",
    };
  }
  if (isBurstLaugh) {
    return {
      body_state_id: "body_burst_laugh_recovery",
      posture: "forward_laugh_then_return",
      head_profile: "head_laugh_bounce_profile",
      torso_profile: "torso_shoulder_laugh_profile",
      recovery_state: "recovering",
    };
  }
  if (isFocused) {
    return {
      body_state_id: "body_screen_focus_talk",
      posture: "slight_forward_attention",
      head_profile: "head_micro_tracking_profile",
      torso_profile: "torso_stable_focus_profile",
      recovery_state: "stable",
    };
  }
  if (isIdle) {
    return {
      body_state_id: "body_idle_breathing",
      posture: "relaxed_upright",
      head_profile: "head_soft_idle_profile",
      torso_profile: "torso_idle_breath_profile",
      recovery_state: "stable",
    };
  }
  return {
    body_state_id: "body_soft_talk",
    posture: "upright_open",
    head_profile: "head_soft_nod_profile",
    torso_profile: "torso_soft_sway_profile",
    recovery_state: "stable",
  };
}

function buildLaughRecoveryBreaths(durationMs) {
  const recoveryStart = Math.min(Math.max(520, durationMs - 900), durationMs);
  return [
    {
      kind: "short_recovery_breath",
      start_ms: recoveryStart,
      end_ms: Math.min(durationMs, recoveryStart + 360),
      profile: "post_laugh_recovery_profile",
    },
  ];
}

function scoreContinuity({ safetyStatus, rejectedBodySignals, motionLoad, breathRate }) {
  let score = 0.92;
  if (safetyStatus === "degrade") score -= 0.08;
  if (safetyStatus === "reject") score -= 0.18;
  score -= rejectedBodySignals.length * 0.12;
  if (motionLoad > 0.85) score -= 0.08;
  if (breathRate <= 0.18) score -= 0.16;
  return clamp01(score);
}

function normalizeSafetyStatus(finalDecision) {
  try {
    return normalizeFinalDecision(finalDecision ?? "allow");
  } catch {
    return "reject";
  }
}

function hasUnsafeLaughContext(finalOutput) {
  const labels = [
    finalOutput?.safety_context,
    finalOutput?.moderation_context,
    finalOutput?.context_label,
    finalOutput?.risk_context,
    ...(Array.isArray(finalOutput?.unsafe_context_labels) ? finalOutput.unsafe_context_labels : []),
    ...(Array.isArray(finalOutput?.moderation_labels) ? finalOutput.moderation_labels : []),
  ].map((value) => String(value ?? "").toLowerCase());
  return labels.some((label) =>
    [
      "unsafe",
      "attack",
      "harassment",
      "abuse",
      "incitement",
      "discrimination",
      "hate",
      "flame",
      "炎上",
      "攻撃",
      "煽り",
      "差別",
    ].some((unsafeLabel) => label.includes(unsafeLabel))
  );
}

function profileName(value) {
  const cleaned = String(value ?? "none")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${cleaned || "none"}_profile`;
}

function assertNoForbiddenFieldsRecursive(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenFieldsRecursive(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_BODY_FIELDS.has(field)) {
      throw new ContractError(`${context}: body continuity must not define command or canonical fields`, {
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
