import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";
import { assertMotionCueSafe } from "./motionCue.js";
import { assertSpeechCueSafe } from "../voice/speechCue.js";
import { assertSubtitleCueSafe } from "../voice/subtitleCue.js";

const FORBIDDEN_PLAN_FIELDS = new Set([
  "world_command",
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

export function createPerformancePlan({ finalOutput, speechCue, motionCue, subtitleCue = null } = {}) {
  assertNoWorldCommand(finalOutput, "Performance plan final output input");
  assertSpeechCueSafe(speechCue, "Performance plan speech cue");
  assertMotionCueSafe(motionCue, "Performance plan motion cue");
  if (subtitleCue) assertSubtitleCueSafe(subtitleCue, "Performance plan subtitle cue");

  const totalDurationMs = Math.max(speechCue.estimated_duration_ms ?? 0, 900);
  const plan = {
    schema: "iris_performance_plan_v1",
    trace_id: finalOutput?.trace_id ?? speechCue.trace_id ?? null,
    event_id: finalOutput?.event_id ?? speechCue.event_id ?? null,
    total_duration_ms: totalDurationMs,
    sync_mode: "tts_leads_live2d",
    tracks: {
      speech: buildSpeechTrack(speechCue, totalDurationMs),
      mouth: buildMouthTrack(speechCue),
      breath: buildBreathTrack(speechCue, motionCue, totalDurationMs),
      expression: buildExpressionTrack(motionCue, totalDurationMs),
      motion: buildMotionTrack(motionCue, totalDurationMs),
      subtitle: buildSubtitleTrack(subtitleCue),
    },
    adapter_validation_required: true,
  };

  assertPerformancePlanSafe(plan, "Performance plan output");
  return plan;
}

function buildSubtitleTrack(subtitleCue) {
  if (!subtitleCue) return [];
  return subtitleCue.line_break_plan.map((segment) => ({
    kind: "subtitle_segment",
    start_ms: segment.display_start_ms,
    end_ms: segment.display_end_ms,
    segment_index: segment.segment_index,
    direction: segment.direction,
    line_count: segment.line_count,
  }));
}

export function assertPerformancePlanSafe(plan, context = "performance plan") {
  if (!plan || typeof plan !== "object") {
    throw new ContractError(`${context}: missing performance plan`);
  }
  assertNoWorldCommand(plan, context);
  assertNoForbiddenFieldsRecursive(plan, context);
  if (plan.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (plan.schema !== "iris_performance_plan_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: plan.schema });
  }
}

function buildSpeechTrack(speechCue, totalDurationMs) {
  return [
    {
      kind: "speech_window",
      start_ms: 0,
      end_ms: totalDurationMs,
      prosody_style: speechCue.prosody_style,
      pace: speechCue.pace,
      pitch: speechCue.pitch,
      volume: speechCue.volume,
      breathiness: speechCue.breathiness,
    },
  ];
}

function buildMouthTrack(speechCue) {
  return speechCue.mouth_cues.map((mouthCue) => ({
    kind: "mouth_shape",
    start_ms: mouthCue.start_ms,
    end_ms: mouthCue.end_ms,
    shape: mouthCue.shape,
  }));
}

function buildBreathTrack(speechCue, motionCue, totalDurationMs) {
  const laughBreaths = speechCue.laugh_breaths.map((breath) => ({
    kind: "laugh_breath",
    start_ms: breath.start_ms,
    end_ms: breath.end_ms,
    intensity: breath.intensity,
    style: breath.style,
  }));
  return [
    {
      kind: "ambient_breath",
      start_ms: 0,
      end_ms: totalDurationMs,
      breathing_rate: motionCue.breathing_rate,
    },
    ...laughBreaths,
  ];
}

function buildExpressionTrack(motionCue, totalDurationMs) {
  return [
    {
      kind: "expression",
      start_ms: 0,
      end_ms: totalDurationMs,
      expression_hint: motionCue.expression_hint,
      gaze_hint: motionCue.gaze_hint,
      blink_rate: motionCue.blink_rate,
    },
  ];
}

function buildMotionTrack(motionCue, totalDurationMs) {
  return [
    {
      kind: "body_motion",
      start_ms: 0,
      end_ms: totalDurationMs,
      motion_style: motionCue.motion_style,
      head_motion: motionCue.head_motion,
      body_sway: motionCue.body_sway,
      gesture_hint: motionCue.gesture_hint,
    },
  ];
}

function assertNoForbiddenFieldsRecursive(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenFieldsRecursive(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: performance plan must not define command or canonical fields`, {
        field,
        path,
      });
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}
