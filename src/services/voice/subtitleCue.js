import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";
import { assertLanguageProfileSafe } from "./languageProfile.js";
import { assertSpeechRateProfileSafe } from "./speechRateProfile.js";
import { assertSpeechCueSafe } from "./speechCue.js";

const FORBIDDEN_SUBTITLE_FIELDS = new Set([
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
  "raw_memory",
  "raw_memories",
  "raw_cue",
  "raw_cue_payload",
  "cue_payload",
  "subtitle_cue_payload",
  "selected_memory_ids",
  "raw_memory_ids",
  "memory_ids",
  "memory_candidate",
  "memory_candidates",
  "relationship_update_candidate",
  "raw_translation_prompt",
  "translation_prompt",
  "raw_translation_context",
  "vendor_token",
  "translation_vendor_token",
  "relationship_score",
  "endpoint",
  "endpoint_url",
  "api_key",
  "token",
  "command",
  "command_payload",
  "obs_command",
  "obs_command_payload",
  "candidate",
  "candidates",
  "canonical",
  "canonical_envelope",
  "canonical_action_type",
  "canonical_emotion",
  "canonical_task_type",
  "action_type",
  "intent",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
]);
const RELATIONSHIP_SCORE_TEXT_PATTERN =
  /\b(?:relation[\s_-]?score|relationship[\s_-]?score|internal[\s_-]?score|hidden[\s_-]?score|relationship[\s_-]?delta|proposed[\s_-]?relation[\s_-]?score[\s_-]?delta)\b|\b\d+(?:\.\d+)?\s*(?:relationship|relation)\s*(?:score|delta)\b/iu;

export function createSubtitleCue({
  finalOutput = null,
  speechCue,
  languageProfile,
  speechRateProfile,
} = {}) {
  assertNoWorldCommand(finalOutput, "Subtitle cue final output input");
  assertSpeechCueSafe(speechCue, "Subtitle cue speech cue input");
  assertLanguageProfileSafe(languageProfile, "Subtitle cue language profile input");
  assertSpeechRateProfileSafe(speechRateProfile, "Subtitle cue speech rate input");

  const subtitleText = String(finalOutput?.final_text ?? "").trim();
  if (RELATIONSHIP_SCORE_TEXT_PATTERN.test(subtitleText)) {
    throw new ContractError("Subtitle cue final output input: relationship score text is forbidden");
  }
  const displayStartMs = subtitleText ? 0 : 0;
  const displayEndMs = subtitleText
    ? Math.max(Number(speechCue.estimated_duration_ms ?? 0), 1600)
    : 0;
  const chunks = buildSubtitleChunks({
    subtitleText,
    displayEndMs,
    languageProfile,
  });
  const readingSpeedGuard = buildReadingSpeedGuard({
    subtitleText,
    displayEndMs,
    speechRateProfile,
  });

  const cue = {
    schema: "iris_subtitle_cue_v1",
    trace_id: finalOutput?.trace_id ?? speechCue.trace_id ?? null,
    event_id: finalOutput?.event_id ?? speechCue.event_id ?? null,
    internal_profile: true,
    subtitle_text: subtitleText,
    subtitle_language: languageProfile.subtitle_language,
    display_start_ms: displayStartMs,
    display_end_ms: displayEndMs,
    line_break_plan: chunks,
    max_line_count: 2,
    safe_area_policy: {
      placement: "bottom_center",
      avoid_game_ui: true,
      avoid_face_closeup_occlusion: true,
      keep_camera_proximity_readable: true,
    },
    sync_source: "phase15_final_text_and_speech_cue",
    reading_speed_guard: readingSpeedGuard,
    readability_profile: buildReadabilityProfile({
      subtitleText,
      chunks,
      displayEndMs,
      speechRateProfile,
      readingSpeedGuard,
      languageProfile,
    }),
    script_direction: languageProfile.script_profile.direction,
    adapter_guidance: buildSubtitleAdapterGuidance(languageProfile),
    adapter_validation_required: true,
  };

  assertSubtitleCueSafe(cue);
  return cue;
}

export function assertSubtitleCueSafe(cue, context = "subtitle cue") {
  if (!cue || typeof cue !== "object") {
    throw new ContractError(`${context}: missing subtitle cue`);
  }
  assertNoWorldCommand(cue, context);
  assertNoForbiddenSubtitleFields(cue, context);
  if (cue.schema !== "iris_subtitle_cue_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: cue.schema });
  }
  if (cue.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (cue.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!["ltr", "rtl"].includes(cue.script_direction)) {
    throw new ContractError(`${context}: invalid script direction`, {
      script_direction: cue.script_direction,
    });
  }
  if (cue.adapter_guidance) {
    assertSubtitleAdapterGuidanceSafe(cue.adapter_guidance, `${context}: adapter guidance`);
  }
  if (Number(cue.display_end_ms ?? 0) < Number(cue.display_start_ms ?? 0)) {
    throw new ContractError(`${context}: invalid display timing`);
  }
  if (!Array.isArray(cue.line_break_plan)) {
    throw new ContractError(`${context}: line break plan is required`);
  }
  assertSubtitleLineBreakPlanSafe(cue.line_break_plan, `${context}: line break plan`);
  if (!cue.safe_area_policy || typeof cue.safe_area_policy !== "object" || Array.isArray(cue.safe_area_policy)) {
    throw new ContractError(`${context}: safe area policy is required`);
  }
  if (
    cue.safe_area_policy.avoid_game_ui !== true ||
    cue.safe_area_policy.avoid_face_closeup_occlusion !== true ||
    cue.safe_area_policy.keep_camera_proximity_readable !== true
  ) {
    throw new ContractError(`${context}: safe area policy must protect overlay readability`);
  }
  for (const segment of cue.line_break_plan) {
    if (Number(segment?.display_end_ms ?? 0) < Number(segment?.display_start_ms ?? 0)) {
      throw new ContractError(`${context}: invalid line break timing`);
    }
  }
  if (cue.readability_profile) {
    if (cue.readability_profile.safe_for_overlay !== true) {
      throw new ContractError(`${context}: readability profile must stay overlay-safe`);
    }
    if (cue.readability_profile.chunk_count !== cue.line_break_plan.length) {
      throw new ContractError(`${context}: readability chunk count mismatch`);
    }
  }
}

export function sanitizeSubtitleCueForPublicState(cue) {
  if (!cue) return null;
  assertSubtitleCueSafe(cue, "Subtitle public summary");
  const publicState = {
    schema: cue.schema,
    trace_id: cue.trace_id ?? null,
    event_id: cue.event_id ?? null,
    subtitle_enabled: String(cue.subtitle_text ?? "").trim() !== "",
    subtitle_language: cue.subtitle_language,
    script_direction: cue.script_direction,
    text_direction_hint: cue.adapter_guidance?.text_direction_hint ?? cue.script_direction,
    display_start_ms: cue.display_start_ms,
    display_end_ms: cue.display_end_ms,
    line_count: cue.line_break_plan.length,
    max_line_count: cue.max_line_count,
    safe_area_policy: structuredClone(cue.safe_area_policy),
    reading_speed_guard_status: cue.reading_speed_guard?.guard_status ?? null,
    boundary_policy: {
      no_raw_cue_payload: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertSubtitlePublicStateSafe(publicState);
  return publicState;
}

export function assertSubtitleAdapterGuidanceSafe(
  guidance,
  context = "subtitle adapter guidance"
) {
  if (!guidance || typeof guidance !== "object" || Array.isArray(guidance)) {
    throw new ContractError(`${context}: guidance is required`);
  }
  assertNoForbiddenSubtitleFields(guidance, context);
  const allowed = new Set([
    "schema",
    "text_direction_hint",
    "line_flow_hint",
    "adapter_guidance_only",
    "no_obs_command",
  ]);
  for (const field of Object.keys(guidance)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unsupported guidance field`, { field });
    }
  }
  if (guidance.schema !== "iris_subtitle_adapter_guidance_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["ltr", "rtl"].includes(guidance.text_direction_hint)) {
    throw new ContractError(`${context}: invalid direction hint`);
  }
  if (!["left_to_right", "right_to_left"].includes(guidance.line_flow_hint)) {
    throw new ContractError(`${context}: invalid line flow hint`);
  }
  if (guidance.adapter_guidance_only !== true || guidance.no_obs_command !== true) {
    throw new ContractError(`${context}: guidance must not become an OBS command`);
  }
}

export function assertSubtitleLineBreakPlanSafe(plan, context = "subtitle line break plan") {
  if (!Array.isArray(plan)) {
    throw new ContractError(`${context}: plan must be an array`);
  }
  const allowedFields = new Set([
    "segment_index",
    "segment_text",
    "display_start_ms",
    "display_end_ms",
    "direction",
    "line_count",
  ]);
  plan.forEach((segment, index) => {
    if (!segment || typeof segment !== "object" || Array.isArray(segment)) {
      throw new ContractError(`${context}: segment must be an object`, { index });
    }
    assertNoForbiddenSubtitleFields(segment, context, `line_break_plan[${index}]`);
    for (const [field, value] of Object.entries(segment)) {
      if (!allowedFields.has(field)) {
        throw new ContractError(`${context}: unsupported segment field`, { field, index });
      }
      if (typeof value === "string" && containsUnsafeLineBreakValue(value)) {
        throw new ContractError(`${context}: unsafe segment value`, { field, index });
      }
    }
  });
}

export function assertSubtitlePublicStateSafe(state, context = "subtitle public state") {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new ContractError(`${context}: state is required`);
  }
  assertNoForbiddenSubtitleFields(state, context);
  const allowed = new Set([
    "schema",
    "trace_id",
    "event_id",
    "subtitle_enabled",
    "subtitle_language",
    "script_direction",
    "text_direction_hint",
    "display_start_ms",
    "display_end_ms",
    "line_count",
    "max_line_count",
    "safe_area_policy",
    "reading_speed_guard_status",
    "boundary_policy",
    "adapter_validation_required",
  ]);
  for (const field of Object.keys(state)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unsupported public state field`, { field });
    }
  }
  if (typeof state.subtitle_enabled !== "boolean") {
    throw new ContractError(`${context}: subtitle_enabled must be boolean`);
  }
  if (!["ltr", "rtl"].includes(state.script_direction)) {
    throw new ContractError(`${context}: invalid script direction`);
  }
  if (state.boundary_policy?.no_raw_cue_payload !== true) {
    throw new ContractError(`${context}: raw cue payload must be excluded`);
  }
  if (state.boundary_policy?.no_candidates !== true || state.boundary_policy?.no_commands !== true) {
    throw new ContractError(`${context}: candidates and commands must be excluded`);
  }
}

function buildSubtitleChunks({ subtitleText, displayEndMs, languageProfile }) {
  if (!subtitleText) return [];
  const maxChars = maxCharsForLanguage(languageProfile.subtitle_language);
  const rawChunks = splitForSubtitles(subtitleText, maxChars);
  const totalChars = rawChunks.reduce((sum, chunk) => sum + [...chunk].length, 0) || 1;
  let cursor = 0;
  return rawChunks.map((chunk, index) => {
    const ratio = [...chunk].length / totalChars;
    const duration = Math.max(720, Math.round(displayEndMs * ratio));
    const start = cursor;
    const end = index === rawChunks.length - 1 ? displayEndMs : Math.min(displayEndMs, start + duration);
    cursor = end;
    return {
      segment_index: index,
      segment_text: chunk,
      display_start_ms: start,
      display_end_ms: end,
      direction: languageProfile.script_profile.direction,
      line_count: chunk.length > maxChars ? 2 : 1,
    };
  });
}

function buildReadingSpeedGuard({ subtitleText, displayEndMs, speechRateProfile }) {
  const visibleChars = [...subtitleText.replace(/\s+/g, "")].length;
  const seconds = Math.max(displayEndMs / 1000, 0.1);
  const charsPerSecond = visibleChars / seconds;
  const fastRate = speechRateProfile.base_rate === "fast" || speechRateProfile.base_rate === "tongue_twister_fast";
  const threshold = fastRate ? 22 : 18;
  const repairRequired = charsPerSecond > threshold;
  return {
    guard_status: repairRequired ? "repair_required" : "pass",
    chars_per_second: Number(charsPerSecond.toFixed(2)),
    maximum_chars_per_second: threshold,
    repair_strategy: repairRequired ? "split_lines_extend_display_or_reduce_rate" : "none",
  };
}

function buildReadabilityProfile({
  subtitleText,
  chunks,
  displayEndMs,
  speechRateProfile,
  readingSpeedGuard,
  languageProfile,
}) {
  const visibleChars = [...String(subtitleText ?? "").replace(/\s+/g, "")].length;
  const chunkCount = chunks.length;
  const maxChunkChars = chunks.reduce(
    (max, chunk) => Math.max(max, [...String(chunk.segment_text ?? "")].length),
    0
  );
  const averageChunkDurationMs = chunkCount > 0 ? Math.round(displayEndMs / chunkCount) : 0;
  const fastSpeechMode =
    speechRateProfile.base_rate === "fast" ||
    speechRateProfile.base_rate === "tongue_twister_fast";
  return {
    schema: "iris_subtitle_readability_profile_v1",
    subtitle_language: languageProfile.subtitle_language,
    visible_char_count: visibleChars,
    chunk_count: chunkCount,
    max_chunk_chars: maxChunkChars,
    average_chunk_duration_ms: averageChunkDurationMs,
    fast_speech_mode: fastSpeechMode,
    overflow_risk: readingSpeedGuard.guard_status === "repair_required",
    safe_for_overlay: true,
  };
}

function buildSubtitleAdapterGuidance(languageProfile) {
  const direction = languageProfile.script_profile.direction;
  return {
    schema: "iris_subtitle_adapter_guidance_v1",
    text_direction_hint: direction,
    line_flow_hint: direction === "rtl" ? "right_to_left" : "left_to_right",
    adapter_guidance_only: true,
    no_obs_command: true,
  };
}

function splitForSubtitles(text, maxChars) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const pieces = clean
    .split(/(?<=[.!?。！？、,])\s*/)
    .map((piece) => piece.trim())
    .filter(Boolean);
  const chunks = [];
  for (const piece of pieces.length ? pieces : [clean]) {
    if ([...piece].length <= maxChars) {
      chunks.push(piece);
      continue;
    }
    let buffer = "";
    for (const unit of piece.includes(" ") ? piece.split(" ") : [...piece]) {
      const next = buffer ? `${buffer}${piece.includes(" ") ? " " : ""}${unit}` : unit;
      if ([...next].length > maxChars && buffer) {
        chunks.push(buffer);
        buffer = unit;
      } else {
        buffer = next;
      }
    }
    if (buffer) chunks.push(buffer);
  }
  return chunks.slice(0, 8);
}

function maxCharsForLanguage(language) {
  if (["ja", "zh", "ko", "th"].includes(language)) return 24;
  if (["bn", "ta"].includes(language)) return 28;
  if (["ar", "ur"].includes(language)) return 32;
  return 38;
}

function assertNoForbiddenSubtitleFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenSubtitleFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_SUBTITLE_FIELDS.has(normalizeSubtitleField(field))) {
      throw new ContractError(`${context}: subtitle cue must not define command or canonical fields`, {
        field,
        path,
      });
    }
    assertNoForbiddenSubtitleFields(child, context, `${path}.${field}`);
  }
}

function normalizeSubtitleField(field) {
  return String(field ?? "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .toLowerCase();
}

function containsUnsafeLineBreakValue(value) {
  return /\bhttps?:\/\/|\b(?:api[_-]?key|oauth[_-]?token|token|authorization|password|secret|endpoint|world_command|input_action_candidate|approved_game_input_action|memory[_-]?candidate|relationship[\s_-]?score|relation[\s_-]?score|internal[\s_-]?score|hidden[\s_-]?score|relationship[\s_-]?delta|command)\b/iu.test(
    value
  ) || RELATIONSHIP_SCORE_TEXT_PATTERN.test(value);
}
