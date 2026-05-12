import { ContractError, assertNoWorldCommand, normalizeFinalDecision } from "../../core/contracts.js";
import { assertBodyContinuitySafe } from "./bodyContinuity.js";
import { assertMotionCueSafe } from "./motionCue.js";
import { assertSpeechCueSafe } from "../voice/speechCue.js";

const FORBIDDEN_RHYTHM_FIELDS = new Set([
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

export function createTurnRhythm({
  finalOutput,
  speechCue,
  motionCue,
  bodyContinuity,
  queueSize = 0,
  commentDensity = 0,
  recentBackchannels = [],
} = {}) {
  assertNoWorldCommand(finalOutput, "Turn rhythm final output input");
  assertSpeechCueSafe(speechCue, "Turn rhythm speech cue");
  assertMotionCueSafe(motionCue, "Turn rhythm motion cue");
  assertBodyContinuitySafe(bodyContinuity, "Turn rhythm body continuity");

  const safetyStatus = normalizeSafetyStatus(finalOutput?.final_decision);
  const text = String(finalOutput?.final_text ?? "").trim();
  const isSilent = !text || motionCue.motion_style === "idle_breath";
  const isLaughRecovery = bodyContinuity.body_state_id === "body_burst_laugh_recovery";
  const isGameFocus = bodyContinuity.body_state_id === "body_screen_focus_talk";
  const isLongReply = text.length >= 130;
  const overload = Number(queueSize) >= 6 || Number(commentDensity) >= 0.75;
  const processingDelayStatus = detectProcessingDelayStatus(finalOutput);
  const backchannelPlan = buildBackchannelPlan({
    allowed: Boolean(text) && !isLaughRecovery && !overload && safetyStatus !== "reject" && !processingDelayStatus,
    isGameFocus,
    overload,
    recentBackchannels: mergeRecentBackchannels(recentBackchannels, finalOutput?.recent_backchannels),
  });
  const responseMode = chooseResponseMode({
    safetyStatus,
    isSilent,
    isLaughRecovery,
    isGameFocus,
    isLongReply,
    overload,
    processingDelayStatus,
  });

  const preDelay = chooseDelayMs({ responseMode, overload, processingDelayStatus });
  const postSilence = isLaughRecovery ? 1380 : isSilent ? 0 : isGameFocus ? 180 : 420;
  const rhythm = {
    schema: "iris_turn_rhythm_v1",
    trace_id: finalOutput?.trace_id ?? null,
    event_id: finalOutput?.event_id ?? null,
    internal_profile: true,
    rhythm_state_id: `${responseMode}_rhythm`,
    response_mode: responseMode,
    response_timing_plan: {
      pre_response_delay_ms: preDelay,
      first_audio_offset_ms: text ? preDelay + 40 : 0,
      post_response_silence_ms: postSilence,
      queue_pressure: clamp01(Number(queueSize) / 10),
      comment_density: clamp01(commentDensity),
      delay_reason: processingDelayStatus ? "technical_processing_status" : "conversation_rhythm",
    },
    phase17_timeout_impersonation_guard: {
      llm_timeout_not_persona_pause: true,
      processing_delay_not_naturalized: true,
      explicit_technical_delay_status: processingDelayStatus,
    },
    backchannel_plan: backchannelPlan,
    repair_plan: {
      allowed: Boolean(text) && safetyStatus !== "reject" && !overload,
      style: isLaughRecovery ? "laugh_recover_then_continue" : "brief_self_repair",
      max_repair_count: isLaughRecovery ? 1 : 2,
    },
    topic_turn_plan: {
      reaction_probability: overload ? 0.86 : isGameFocus ? 0.78 : 0.68,
      expansion_probability: overload ? 0.1 : isLongReply ? 0.26 : 0.22,
      self_talk_probability: overload ? 0.04 : 0.1,
    },
    laughter_recovery_plan: {
      active: isLaughRecovery,
      recovery_pause_ms: isLaughRecovery ? postSilence : 0,
      breath_reset_required: isLaughRecovery,
      next_reply_bias: isLaughRecovery ? "return_to_topic" : "none",
    },
    rhythm_naturalness_score: scoreRhythm({ safetyStatus, overload, isSilent, isLaughRecovery }),
    adapter_validation_required: true,
  };

  assertTurnRhythmSafe(rhythm, "Turn rhythm output");
  return rhythm;
}

export function assertTurnRhythmSafe(turnRhythm, context = "turn rhythm") {
  if (!turnRhythm || typeof turnRhythm !== "object") {
    throw new ContractError(`${context}: missing turn rhythm export`);
  }
  assertNoWorldCommand(turnRhythm, context);
  assertNoForbiddenFieldsRecursive(turnRhythm, context);
  if (turnRhythm.schema !== "iris_turn_rhythm_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: turnRhythm.schema });
  }
  if (turnRhythm.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (turnRhythm.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  assertDelay("pre_response_delay_ms", turnRhythm.response_timing_plan?.pre_response_delay_ms);
  assertDelay("post_response_silence_ms", turnRhythm.response_timing_plan?.post_response_silence_ms);
  assertScore("rhythm_naturalness_score", turnRhythm.rhythm_naturalness_score);
  if (
    turnRhythm.phase17_timeout_impersonation_guard?.llm_timeout_not_persona_pause !== true ||
    turnRhythm.phase17_timeout_impersonation_guard?.processing_delay_not_naturalized !== true
  ) {
    throw new ContractError(`${context}: timeout impersonation guard required`);
  }
  const delayStatus = turnRhythm.phase17_timeout_impersonation_guard?.explicit_technical_delay_status;
  if (delayStatus) {
    if (turnRhythm.response_timing_plan?.delay_reason !== "technical_processing_status") {
      throw new ContractError(`${context}: technical delay must not be naturalized`);
    }
    if (["thoughtful_reply", "playful_reply"].includes(turnRhythm.response_mode)) {
      throw new ContractError(`${context}: technical delay must not impersonate persona rhythm`);
    }
  }
  assertBackchannelPlanSafe(turnRhythm.backchannel_plan, context);
}

function chooseResponseMode({
  safetyStatus,
  isSilent,
  isLaughRecovery,
  isGameFocus,
  isLongReply,
  overload,
  processingDelayStatus,
}) {
  if (processingDelayStatus) return "technical_wait";
  if (safetyStatus === "reject") return "recovery_reply";
  if (isSilent) return "quiet_presence";
  if (overload) return "instant_reaction";
  if (isLaughRecovery) return "playful_reply";
  if (isGameFocus) return "instant_reaction";
  if (isLongReply) return "thoughtful_reply";
  return "normal_reply";
}

function chooseDelayMs({ responseMode, overload, processingDelayStatus }) {
  if (processingDelayStatus) return 0;
  if (overload) return 80;
  switch (responseMode) {
    case "quiet_presence":
      return 0;
    case "instant_reaction":
      return 120;
    case "thoughtful_reply":
      return 860;
    case "playful_reply":
      return 220;
    case "recovery_reply":
      return 520;
    default:
      return 340;
  }
}

function detectProcessingDelayStatus(finalOutput) {
  const values = [
    finalOutput?.llm_status,
    finalOutput?.response_status,
    finalOutput?.response_generator_status,
    finalOutput?.processing_status,
    finalOutput?.error_type,
  ].map((value) => String(value ?? "").toLowerCase());
  if (finalOutput?.llm_timeout === true || values.includes("timeout") || values.includes("llm_timeout")) {
    return "llm_timeout";
  }
  if (
    finalOutput?.processing_delay === true ||
    finalOutput?.processing_delayed === true ||
    values.includes("processing_delay") ||
    values.includes("delayed")
  ) {
    return "processing_delay";
  }
  return null;
}

function buildBackchannelPlan({ allowed, isGameFocus, overload, recentBackchannels }) {
  const preferredStyle = isGameFocus ? "short_focus_ack" : "soft_ack";
  const previousStyle = latestBackchannelStyle(recentBackchannels);
  const alternateStyle = preferredStyle === "short_focus_ack" ? "brief_focus_ack" : "brief_ack";
  const style = allowed && previousStyle === preferredStyle ? alternateStyle : preferredStyle;

  return {
    allowed,
    style,
    min_gap_turns: overload ? 5 : 3,
    max_chars: 12,
    max_duration_ms: 650,
    interrupts_main_speech: false,
    repetition_guard: {
      same_backchannel_consecutive_forbidden: true,
      previous_style: previousStyle,
      switched_from_previous: allowed && previousStyle === preferredStyle,
    },
  };
}

function mergeRecentBackchannels(primary, secondary) {
  const merged = [];
  if (Array.isArray(primary)) merged.push(...primary);
  if (Array.isArray(secondary)) merged.push(...secondary);
  return merged;
}

function latestBackchannelStyle(recentBackchannels) {
  if (!Array.isArray(recentBackchannels) || recentBackchannels.length === 0) return null;
  const latest = recentBackchannels[recentBackchannels.length - 1];
  if (typeof latest === "string") return latest;
  if (!latest || typeof latest !== "object") return null;
  return latest.style ?? latest.backchannel_style ?? null;
}

function assertBackchannelPlanSafe(plan, context) {
  if (!plan || typeof plan !== "object") {
    throw new ContractError(`${context}: backchannel plan required`);
  }
  if (plan.repetition_guard?.same_backchannel_consecutive_forbidden !== true) {
    throw new ContractError(`${context}: backchannel repetition guard required`);
  }
  if (plan.allowed !== true) return;
  if (plan.interrupts_main_speech === true) {
    throw new ContractError(`${context}: backchannel must not interrupt main speech`);
  }
  if (typeof plan.max_chars !== "number" || plan.max_chars < 1 || plan.max_chars > 12) {
    throw new ContractError(`${context}: backchannel must stay short`, { max_chars: plan.max_chars });
  }
  if (typeof plan.max_duration_ms !== "number" || plan.max_duration_ms < 1 || plan.max_duration_ms > 700) {
    throw new ContractError(`${context}: backchannel duration must stay short`, {
      max_duration_ms: plan.max_duration_ms,
    });
  }
  if (plan.style && plan.style === plan.repetition_guard?.previous_style) {
    throw new ContractError(`${context}: same backchannel must not be consecutive`, { style: plan.style });
  }
}

function scoreRhythm({ safetyStatus, overload, isSilent, isLaughRecovery }) {
  let score = 0.9;
  if (safetyStatus === "degrade") score -= 0.08;
  if (safetyStatus === "reject") score -= 0.2;
  if (overload) score -= 0.1;
  if (isSilent) score -= 0.02;
  if (isLaughRecovery) score += 0.03;
  return clamp01(score);
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
    if (FORBIDDEN_RHYTHM_FIELDS.has(field)) {
      throw new ContractError(`${context}: turn rhythm must not define command or canonical fields`, {
        field,
        path,
      });
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}

function assertDelay(name, value) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 2500) {
    throw new ContractError(`${name} out of range`, { name, value });
  }
}

function assertScore(name, value) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    throw new ContractError("score out of range", { name, value });
  }
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number < 0) return 0;
  if (number > 1) return 1;
  return Number(number.toFixed(4));
}
