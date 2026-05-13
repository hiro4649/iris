import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";

const FORBIDDEN_MOTION_FIELDS = new Set([
  "world_command",
  "obs_command",
  "obs_command_payload",
  "bridge_mutation",
  "bridge_payload",
  "raw_bridge_payload",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "action_type",
  "intent",
]);

export function createMotionCueFromEnvelope(envelope = {}) {
  assertNoWorldCommand(envelope, "Motion cue envelope input");

  const performance = envelope.performance_cue ?? {};
  const affect = envelope.affect_snapshot ?? {};
  const isBigLaugh = performance.style === "big_laugh";
  const isGameFocused = affect.last_trigger === "game_observation";
  const isSilent = envelope.action_type === "NOOP" || envelope.action_type === "WAIT";

  const motionCue = {
    schema: "iris_motion_cue_v1",
    motion_style: isSilent ? "idle_breath" : isBigLaugh ? "laugh_big" : isGameFocused ? "focused_talk" : "talk",
    expression_hint: chooseExpression({ envelope, isBigLaugh, isGameFocused }),
    gaze_hint: isGameFocused ? "screen_focus" : "audience_soft",
    breathing_rate: clamp(0.34 + (affect.energy ?? 0.42) * 0.22 + (isBigLaugh ? 0.18 : 0), 0.2, 0.9),
    blink_rate: clamp(0.28 + (affect.warmth ?? 0.54) * 0.12 - (isGameFocused ? 0.08 : 0), 0.12, 0.55),
    head_motion: isBigLaugh ? "laugh_bounce" : isGameFocused ? "micro_tracking" : "soft_nod",
    body_sway: clamp(0.18 + (affect.energy ?? 0.42) * 0.22 + (isBigLaugh ? 0.24 : 0), 0.08, 0.75),
    gesture_hint: isSilent ? "none" : isBigLaugh ? "cover_mouth_laugh" : "small_hand",
    adapter_validation_required: true,
  };

  assertMotionCueSafe(motionCue, "Motion cue output");
  return motionCue;
}

export function assertMotionCueSafe(motionCue, context = "motion cue") {
  if (!motionCue || typeof motionCue !== "object") {
    throw new ContractError(`${context}: missing motion cue`);
  }
  assertNoWorldCommand(motionCue, context);
  for (const field of Object.keys(motionCue)) {
    if (FORBIDDEN_MOTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: motion cue must not define command or canonical fields`, {
        field,
      });
    }
  }
  if (motionCue.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

function chooseExpression({ envelope, isBigLaugh, isGameFocused }) {
  if (isBigLaugh) return "eyes_smile_open_mouth_laugh";
  if (isGameFocused) return "focused_bright";
  if (envelope.emotion === "happy") return "soft_smile";
  if (envelope.emotion === "surprise") return "wide_eyes";
  return "neutral_warm";
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  if (number < min) return min;
  if (number > max) return max;
  return Number(number.toFixed(4));
}
