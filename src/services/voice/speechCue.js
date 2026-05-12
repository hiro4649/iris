import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";

const FORBIDDEN_SPEECH_FIELDS = new Set([
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
  "action_type",
  "intent",
]);

const MOUTH_SHAPES = ["rest", "a", "i", "u", "e", "o", "closed"];
const RELATIONSHIP_SCORE_TEXT_PATTERN =
  /\b(?:relation[\s_-]?score|relationship[\s_-]?score|internal[\s_-]?score|hidden[\s_-]?score|relationship[\s_-]?delta|proposed[\s_-]?relation[\s_-]?score[\s_-]?delta)\b|\b\d+(?:\.\d+)?\s*(?:relationship|relation)\s*(?:score|delta)\b/i;

export function createSpeechCueFromFinalOutput(finalOutput = {}) {
  assertNoWorldCommand(finalOutput, "Speech cue final output input");

  const text = String(finalOutput.final_text ?? "").trim();
  if (RELATIONSHIP_SCORE_TEXT_PATTERN.test(text)) {
    throw new ContractError("Speech cue final output input: relationship score text is forbidden");
  }
  const performance = finalOutput.performance_cue ?? {};
  const affect = finalOutput.affect_snapshot ?? {};
  const isBigLaugh = performance.style === "big_laugh";
  const pace = clamp(0.88 + (affect.energy ?? 0.42) * 0.18 + (isBigLaugh ? -0.12 : 0), 0.72, 1.18);
  const pitch = clamp(0.48 + (affect.amusement ?? 0.22) * 0.22 + (affect.warmth ?? 0.54) * 0.08, 0.35, 0.78);
  const volume = clamp(0.52 + (affect.energy ?? 0.42) * 0.22 + (isBigLaugh ? 0.14 : 0), 0.35, 0.9);
  const breathiness = clamp(0.18 + (isBigLaugh ? 0.42 : 0) + (affect.amusement ?? 0.22) * 0.14, 0.08, 0.82);
  const phrase_segments = buildPhraseSegments(text, pace, isBigLaugh);

  const cue = {
    schema: "iris_speech_cue_v1",
    trace_id: finalOutput.trace_id ?? null,
    event_id: finalOutput.event_id ?? null,
    prosody_style: isBigLaugh ? "laughing_speech" : "natural_speech",
    pace,
    pitch,
    volume,
    breathiness,
    estimated_duration_ms: phrase_segments.at(-1)?.end_ms ?? 0,
    laugh_breaths: isBigLaugh ? buildLaughBreaths(phrase_segments) : [],
    pause_points: buildPausePoints(phrase_segments),
    mouth_cues: buildMouthCues(phrase_segments),
    adapter_validation_required: true,
  };

  assertSpeechCueSafe(cue, "Speech cue output");
  return cue;
}

export function assertSpeechCueSafe(speechCue, context = "speech cue") {
  if (!speechCue || typeof speechCue !== "object") {
    throw new ContractError(`${context}: missing speech cue`);
  }
  assertNoWorldCommand(speechCue, context);
  for (const field of Object.keys(speechCue)) {
    if (FORBIDDEN_SPEECH_FIELDS.has(field)) {
      throw new ContractError(`${context}: speech cue must not define command or canonical fields`, {
        field,
      });
    }
  }
  if (speechCue.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!Array.isArray(speechCue.mouth_cues)) {
    throw new ContractError(`${context}: mouth cues are required`);
  }
  if (!Array.isArray(speechCue.pause_points)) {
    throw new ContractError(`${context}: pause points are required`);
  }
  if (!Array.isArray(speechCue.laugh_breaths)) {
    throw new ContractError(`${context}: laugh breaths are required`);
  }
  for (const mouthCue of speechCue.mouth_cues) {
    if (!MOUTH_SHAPES.includes(mouthCue.shape)) {
      throw new ContractError(`${context}: unsupported mouth shape`, { shape: mouthCue.shape });
    }
  }
}

function buildPhraseSegments(text, pace, isBigLaugh) {
  if (!text) return [];
  const pieces = text
    .split(/(?<=[.!?。！？])\s+/)
    .map((piece) => piece.trim())
    .filter(Boolean);
  let cursor = 0;
  return pieces.map((text_piece, index) => {
    const leadPause = index === 0 && isBigLaugh ? 160 : 80;
    const duration = estimateDurationMs(text_piece, pace) + (isBigLaugh && index === 0 ? 420 : 0);
    const start_ms = cursor + leadPause;
    const end_ms = start_ms + duration;
    cursor = end_ms;
    return {
      index,
      text: text_piece,
      start_ms,
      end_ms,
      emphasis: isBigLaugh && index === 0 ? "laugh_burst" : "normal",
    };
  });
}

function buildLaughBreaths(segments) {
  const first = segments[0];
  if (!first) return [];
  return [
    {
      start_ms: first.start_ms,
      end_ms: Math.min(first.start_ms + 360, first.end_ms),
      intensity: 0.82,
      style: "breathy_laugh",
    },
  ];
}

function buildPausePoints(segments) {
  return segments.slice(0, -1).map((segment) => ({
    after_segment_index: segment.index,
    at_ms: segment.end_ms,
    duration_ms: 180,
  }));
}

function buildMouthCues(segments) {
  const cues = [];
  for (const segment of segments) {
    const duration = Math.max(segment.end_ms - segment.start_ms, 120);
    const step = Math.max(90, Math.floor(duration / 8));
    let cursor = segment.start_ms;
    let shapeIndex = 0;
    while (cursor < segment.end_ms) {
      const end_ms = Math.min(cursor + step, segment.end_ms);
      cues.push({
        start_ms: cursor,
        end_ms,
        shape: MOUTH_SHAPES[(shapeIndex % (MOUTH_SHAPES.length - 1)) + 1],
      });
      cursor = end_ms;
      shapeIndex += 1;
    }
    cues.push({
      start_ms: segment.end_ms,
      end_ms: segment.end_ms + 60,
      shape: "closed",
    });
  }
  return cues.slice(0, 64);
}

function estimateDurationMs(text, pace) {
  const visibleLength = [...text.replace(/\s+/g, "")].length;
  const base = visibleLength * 58;
  return Math.round(clamp(base / pace, 420, 12_000));
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  if (number < min) return min;
  if (number > max) return max;
  return Number(number.toFixed(4));
}
