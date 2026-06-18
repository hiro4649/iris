import {
  createYouTubeIngestEventSummary,
  normalizeYouTubeComment,
} from "../adapters/youtube/commentAdapter.js";
import { createModerationPersonalizationE2ESummary } from "../services/safety/moderationPersonalizationGate.js";
import { createSpeechCueFromFinalOutput } from "../services/voice/speechCue.js";
import { createSubtitleCue, sanitizeSubtitleCueForPublicState } from "../services/voice/subtitleCue.js";

const INPUT_SCHEMA = "iris_first_runtime_vertical_slice_input_v1";
const RESULT_SCHEMA = "iris_first_runtime_vertical_slice_result_v1";
const RESPONSE_SCHEMA = "iris_safe_response_candidate_v1";
const SAFE_SUMMARY = "viewer_greeting_and_stream_interest";
const SAFE_RESPONSE_TEXT = "来てくれてありがとう。今日も一緒に楽しもう。";
const SAFE_TIME_MS = 1_700_000_000_000;

const REQUIRED_INPUT_FIELDS = new Set([
  "schema_version",
  "scenario_id",
  "trace_id",
  "event_id",
  "source",
  "comment_kind",
  "safe_comment_summary",
  "moderation_status",
  "synthetic_only",
  "priority1_status",
]);

const ALLOWED_MODERATION = new Set(["allowed", "watch", "limited", "muted", "blocked", "bounded"]);
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$/;
const FORBIDDEN_INPUT_FIELDS = new Set([
  "text",
  "message",
  "message_text",
  "raw_text",
  "raw_chat",
  "raw_comment",
  "author_channel_id",
  "display_name",
  "private_viewer_id",
  "viewer_id",
  "endpoint",
  "url",
  "token",
  "secret",
  "password",
  "authorization",
  "api_key",
  "oauth",
  "raw_audio",
  "raw_asset_path",
  "raw_payment_data",
  "world_command",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "memory_write",
  "relationship_update_candidate",
  "public_publish",
  "production_go",
]);

const GENERATED_FORBIDDEN_TEXT = [
  "君だけ",
  "特別な関係",
  "課金したから",
  "relation_score",
  "relationship_score",
  "secret",
  "token",
  "world_command",
  "input_action_candidate",
  "approved_game_input_action",
];

export function runFirstRuntimeVerticalSlice(input, { emergencyStopState } = {}) {
  const stopValidation = validateEmergencyStopState(emergencyStopState);
  if (stopValidation !== null) {
    return buildEmergencyStopResult(input, stopValidation);
  }
  if (emergencyStopState.active === true) {
    return buildEmergencyStopResult(input, "emergency_stop_active");
  }

  const inputValidation = validateFirstRuntimeVerticalSliceInput(input);
  if (inputValidation.status !== "pass") {
    return buildBlockedOrFailedResult(input, {
      resultState: "fail",
      reasonCode: inputValidation.reason_code,
      stageStatuses: stageStatuses({ input_validation: "fail" }),
    });
  }

  try {
    const transientEvent = normalizeYouTubeComment({
      event_id: input.event_id,
      trace_id: input.trace_id,
      timestamp_ms: SAFE_TIME_MS,
      author_channel_id: "synthetic-safe-placeholder",
      display_name: "viewer",
      text: SAFE_SUMMARY,
    });
    const ingestSummary = createYouTubeIngestEventSummary(transientEvent);
    const moderation = createModerationPersonalizationE2ESummary({
      moderationStatus: input.moderation_status,
    });

    if (moderation.suppression_required === true) {
      return buildBlockedOrFailedResult(input, {
        resultState: "blocked",
        reasonCode: "moderation_personalization_blocked",
        stageStatuses: stageStatuses({
          input_validation: "pass",
          comment_normalization: "pass",
          moderation_personalization: "blocked",
        }),
      });
    }

    const responseCandidate = buildResponseCandidate(input);
    const personaStatus = validateResponseCandidate(responseCandidate);
    if (personaStatus !== "pass") {
      return buildBlockedOrFailedResult(input, {
        resultState: "fail",
        reasonCode: "persona_validation_blocked",
        stageStatuses: stageStatuses({ input_validation: "pass", persona_validation: "fail" }),
      });
    }

    const finalOutput = {
      trace_id: input.trace_id,
      event_id: input.event_id,
      final_text: responseCandidate.final_text,
      performance_cue: { style: "steady_talk" },
      affect_snapshot: {
        energy: 0.42,
        amusement: 0.18,
        warmth: 0.66,
      },
    };
    const speechCue = createSpeechCueFromFinalOutput(finalOutput);
    const voiceSafeSummary = buildVoiceSafeSummary(input, speechCue);
    const avatarSafeSummary = buildAvatarSafeSummary(input);
    const subtitleCue = createSubtitleCue({
      finalOutput,
      speechCue,
      languageProfile: buildLanguageProfile(input),
      speechRateProfile: buildSpeechRateProfile(input),
    });
    const subtitleSafeSummary = buildSubtitleSafeSummary(input, responseCandidate, subtitleCue);
    const result = {
      schema_version: RESULT_SCHEMA,
      scenario_id: input.scenario_id,
      trace_id: input.trace_id,
      event_id: input.event_id,
      result_state: "pass",
      reason_code: "safe_response_candidate_ready",
      persona_status: "pass",
      safety_status: "pass",
      privacy_status: "pass",
      response_candidate: responseCandidate,
      voice_safe_summary: voiceSafeSummary,
      avatar_safe_summary: avatarSafeSummary,
      subtitle_safe_summary: subtitleSafeSummary,
      operator_safe_trace: buildOperatorSafeTrace({
        input,
        resultState: "pass",
        reasonCodes: ["safe_response_candidate_ready"],
        stageStatuses: stageStatuses({
          input_validation: "pass",
          comment_normalization: "pass",
          moderation_personalization: "pass",
          response_candidate: "pass",
          voice_safe_summary: "pass",
          avatar_safe_summary: "pass",
          subtitle_safe_summary: "pass",
        }),
        candidatePresence: candidatePresence(true),
      }),
      runtime_readiness_claimed: false,
      production_readiness_claimed: false,
      production_go_performed: false,
      priority1_status: "BLOCKED",
      _ingest_summary_schema: ingestSummary.schema,
    };
    delete result._ingest_summary_schema;
    return validateFirstRuntimeVerticalSliceResult(result).status === "pass"
      ? result
      : buildBlockedOrFailedResult(input, {
        resultState: "fail",
        reasonCode: "unknown_safe_failure",
        stageStatuses: stageStatuses({ result_validation: "fail" }),
      });
  } catch {
    return buildBlockedOrFailedResult(input, {
      resultState: "fail",
      reasonCode: "handoff_summary_invalid",
      stageStatuses: stageStatuses({ handoff_summary: "fail" }),
    });
  }
}

export function validateFirstRuntimeVerticalSliceInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("synthetic_input_invalid");
  }
  const forbidden = findForbiddenInputField(input);
  if (forbidden) return fail("synthetic_input_invalid");
  const keys = Object.keys(input);
  if (keys.some((key) => !REQUIRED_INPUT_FIELDS.has(key))) return fail("synthetic_input_invalid");
  for (const field of REQUIRED_INPUT_FIELDS) {
    if (!Object.hasOwn(input, field)) return fail("synthetic_input_invalid");
  }
  if (input.schema_version !== INPUT_SCHEMA) return fail("synthetic_input_invalid");
  if (input.source !== "synthetic_youtube_comment") return fail("synthetic_input_invalid");
  if (input.comment_kind !== "ordinary_greeting") return fail("synthetic_input_invalid");
  if (input.safe_comment_summary !== SAFE_SUMMARY) return fail("synthetic_input_invalid");
  if (!ALLOWED_MODERATION.has(input.moderation_status)) return fail("synthetic_input_invalid");
  if (input.synthetic_only !== true) return fail("synthetic_input_invalid");
  if (input.priority1_status !== "BLOCKED") return fail("synthetic_input_invalid");
  for (const field of ["scenario_id", "trace_id", "event_id"]) {
    if (typeof input[field] !== "string" || !SAFE_ID_PATTERN.test(input[field])) {
      return fail("synthetic_input_invalid");
    }
  }
  return { status: "pass", safeSummaryOnly: true };
}

export function validateFirstRuntimeVerticalSliceResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return fail("unknown_safe_failure");
  if (result.schema_version !== RESULT_SCHEMA) return fail("unknown_safe_failure");
  if (result.priority1_status !== "BLOCKED") return fail("unknown_safe_failure");
  if (result.runtime_readiness_claimed !== false) return fail("unknown_safe_failure");
  if (result.production_readiness_claimed !== false) return fail("unknown_safe_failure");
  if (result.production_go_performed !== false) return fail("unknown_safe_failure");
  if (!["pass", "blocked", "fail"].includes(result.result_state)) return fail("unknown_safe_failure");
  const trace = result.operator_safe_trace;
  if (!trace || containsForbiddenTraceMaterial(trace)) return fail("unknown_safe_failure");
  if (Object.values(trace.side_effect_booleans || {}).some((value) => value !== false)) {
    return fail("unknown_safe_failure");
  }
  if (trace.candidate_presence_booleans?.memory_candidate_present !== false) {
    return fail("unknown_safe_failure");
  }
  if (trace.candidate_presence_booleans?.relationship_candidate_present !== false) {
    return fail("unknown_safe_failure");
  }
  if (trace.candidate_presence_booleans?.approved_game_input_action_present !== false) {
    return fail("unknown_safe_failure");
  }
  if (result.result_state === "pass") {
    if (!result.response_candidate || !result.voice_safe_summary || !result.avatar_safe_summary || !result.subtitle_safe_summary) {
      return fail("unknown_safe_failure");
    }
  }
  if (result.reason_code === "emergency_stop_active") {
    if (result.response_candidate || result.voice_safe_summary || result.avatar_safe_summary || result.subtitle_safe_summary) {
      return fail("unknown_safe_failure");
    }
    const stages = result.operator_safe_trace?.stage_statuses || {};
    if (Object.entries(stages).some(([key, value]) => key !== "emergency_stop" && value !== "not_started")) {
      return fail("unknown_safe_failure");
    }
  }
  return { status: "pass", safeSummaryOnly: true };
}

export function buildEmergencyStopResult(input, reasonCode = "emergency_stop_active") {
  return buildBlockedOrFailedResult(input, {
    resultState: "blocked",
    reasonCode,
    stageStatuses: stageStatuses({ emergency_stop: "blocked" }),
  });
}

export function buildOperatorSafeTrace({
  input,
  resultState,
  reasonCodes,
  stageStatuses,
  candidatePresence,
  emergencyStopStatus = "inactive",
} = {}) {
  return {
    scenario_id: safeIdentifier(input?.scenario_id),
    trace_id: safeIdentifier(input?.trace_id),
    stage_statuses: stageStatuses,
    reason_codes: reasonCodes,
    candidate_presence_booleans: candidatePresence,
    side_effect_booleans: sideEffectBooleans(),
    emergency_stop_status: emergencyStopStatus,
    result_state: resultState,
    priority1_status: "BLOCKED",
  };
}

function validateEmergencyStopState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) return "emergency_stop_state_invalid";
  if (typeof state.active !== "boolean") return "emergency_stop_state_invalid";
  if (Object.keys(state).some((key) => key !== "active")) return "emergency_stop_state_invalid";
  return null;
}

function buildBlockedOrFailedResult(input, { resultState, reasonCode, stageStatuses }) {
  const safeInput = input && typeof input === "object" ? input : {};
  const candidatePresenceBooleans = candidatePresence(false);
  return {
    schema_version: RESULT_SCHEMA,
    scenario_id: safeIdentifier(safeInput.scenario_id),
    trace_id: safeIdentifier(safeInput.trace_id),
    event_id: safeIdentifier(safeInput.event_id),
    result_state: resultState,
    reason_code: reasonCode,
    persona_status: resultState === "fail" ? "fail" : "blocked",
    safety_status: resultState === "fail" ? "fail" : "blocked",
    privacy_status: resultState === "fail" ? "fail" : "blocked",
    response_candidate: null,
    voice_safe_summary: null,
    avatar_safe_summary: null,
    subtitle_safe_summary: null,
    operator_safe_trace: buildOperatorSafeTrace({
      input: safeInput,
      resultState,
      reasonCodes: [reasonCode],
      stageStatuses,
      candidatePresence: candidatePresenceBooleans,
      emergencyStopStatus: reasonCode === "emergency_stop_active" ? "active" : "inactive",
    }),
    runtime_readiness_claimed: false,
    production_readiness_claimed: false,
    production_go_performed: false,
    priority1_status: "BLOCKED",
  };
}

function buildResponseCandidate(input) {
  return {
    schema: RESPONSE_SCHEMA,
    candidate_only: true,
    trace_id: input.trace_id,
    event_id: input.event_id,
    final_text: SAFE_RESPONSE_TEXT,
    persona_status: "pass",
    safety_status: "pass",
    privacy_status: "pass",
    memory_commit_allowed: false,
    relationship_commit_allowed: false,
    game_action_allowed: false,
    public_publish_allowed: false,
    external_call_allowed: false,
    adapter_validation_required: true,
  };
}

function validateResponseCandidate(candidate) {
  const text = String(candidate?.final_text || "");
  if (!text || [...text].length > 120) return "fail";
  if (GENERATED_FORBIDDEN_TEXT.some((term) => text.includes(term))) return "fail";
  for (const field of [
    "memory_commit_allowed",
    "relationship_commit_allowed",
    "game_action_allowed",
    "public_publish_allowed",
    "external_call_allowed",
  ]) {
    if (candidate[field] !== false) return "fail";
  }
  return "pass";
}

function buildVoiceSafeSummary(input, speechCue) {
  return {
    schema: "iris_voxweave_safe_summary_v1",
    trace_id: input.trace_id,
    event_id: input.event_id,
    status: "candidate_only",
    speech_cue_schema: speechCue.schema,
    prosody_style: speechCue.prosody_style,
    estimated_duration_ms: speechCue.estimated_duration_ms,
    mouth_cue_count: speechCue.mouth_cues.length,
    pause_point_count: speechCue.pause_points.length,
    adapter_validation_required: true,
    raw_audio_included: false,
    voice_model_path_included: false,
    endpoint_included: false,
    token_included: false,
    external_call_performed: false,
  };
}

function buildAvatarSafeSummary(input) {
  return {
    schema: "iris_live2d_safe_summary_v1",
    trace_id: input.trace_id,
    event_id: input.event_id,
    status: "candidate_only",
    expression_label: "warm_neutral",
    motion_label: "idle_breath",
    identity_drift_status: "stable",
    recovery_required: false,
    adapter_validation_required: true,
    raw_model_path_included: false,
    raw_motion_payload_included: false,
    endpoint_included: false,
    token_included: false,
    external_call_performed: false,
  };
}

function buildSubtitleSafeSummary(input, responseCandidate, cue) {
  return {
    schema: "iris_subtitle_safe_summary_v1",
    trace_id: input.trace_id,
    event_id: input.event_id,
    status: "candidate_only",
    safe_text_candidate: responseCandidate.final_text,
    public_cue_summary: sanitizeSubtitleCueForPublicState(cue),
    adapter_validation_required: true,
    raw_chat_included: false,
    raw_subtitle_payload_included: false,
    obs_command_included: false,
    endpoint_included: false,
    token_included: false,
    external_call_performed: false,
  };
}

function buildLanguageProfile(input) {
  return {
    schema: "iris_language_profile_v1",
    trace_id: input.trace_id,
    event_id: input.event_id,
    internal_profile: true,
    detected_language: "ja",
    requested_language: null,
    response_language: "ja",
    response_language_label: "日本語",
    supported_language: true,
    mixed_language_allowed: false,
    pronunciation_profile: {
      pronunciation_profile_id: "pronunciation_ja_v1",
      voice_locale_hint: "ja-JP",
      natural_rhythm_hint: "ja_phrase",
      avoid_extreme_slow: true,
    },
    script_profile: {
      script: "japanese",
      direction: "ltr",
      line_break_mode: "ja_phrase",
    },
    subtitle_language: "ja",
    translation_policy: "preserve_meaning_with_safety_check",
    adapter_validation_required: true,
  };
}

function buildSpeechRateProfile(input) {
  return {
    schema: "iris_speech_rate_profile_v1",
    trace_id: input.trace_id,
    event_id: input.event_id,
    internal_profile: true,
    base_rate: "natural",
    rate_variation_plan: [],
    min_rate: 0.72,
    max_rate: 1.18,
    slow_speech_guard: {
      guard_status: "pass",
      rate_repair_required: false,
    },
    intelligibility_guard: {
      guard_status: "pass",
      subtitle_sync_required: true,
    },
    emotion_rate_link: {
      affect_energy: 0.42,
      affect_amusement: 0.18,
      laugh_recovery: false,
      rule: "natural_variation_without_monotone",
    },
    adapter_validation_required: true,
  };
}

function stageStatuses(overrides = {}) {
  return {
    emergency_stop: "not_started",
    input_validation: "not_started",
    comment_normalization: "not_started",
    moderation_personalization: "not_started",
    response_candidate: "not_started",
    persona_validation: "not_started",
    voice_safe_summary: "not_started",
    avatar_safe_summary: "not_started",
    subtitle_safe_summary: "not_started",
    result_validation: "not_started",
    ...overrides,
  };
}

function candidatePresence(present) {
  return {
    response_candidate_present: present,
    memory_candidate_present: false,
    relationship_candidate_present: false,
    voice_handoff_candidate_present: present,
    avatar_handoff_candidate_present: present,
    subtitle_handoff_candidate_present: present,
    approved_game_input_action_present: false,
  };
}

function sideEffectBooleans() {
  return {
    network_call_performed: false,
    external_call_performed: false,
    db_read_performed: false,
    db_write_performed: false,
    memory_commit_performed: false,
    relationship_commit_performed: false,
    game_action_performed: false,
    public_publish_performed: false,
    obs_mutation_performed: false,
    tts_generation_performed: false,
    live2d_renderer_mutation_performed: false,
    payment_action_performed: false,
    filesystem_persistence_performed: false,
    process_launch_performed: false,
  };
}

function findForbiddenInputField(value) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findForbiddenInputField(item);
      if (found) return found;
    }
    return null;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_INPUT_FIELDS.has(field)) return field;
    const found = findForbiddenInputField(child);
    if (found) return found;
  }
  return null;
}

function containsForbiddenTraceMaterial(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => containsForbiddenTraceMaterial(item));
  return Object.entries(value).some(([field, child]) => {
    if (["final_text", "safe_comment_summary", "display_name", "author_channel_id", "private_viewer_id", "text", "token", "secret", "endpoint"].includes(field)) {
      return true;
    }
    return containsForbiddenTraceMaterial(child);
  });
}

function safeIdentifier(value) {
  return typeof value === "string" && SAFE_ID_PATTERN.test(value) ? value : "unknown";
}

function fail(reasonCode) {
  return { status: "fail", reason_code: reasonCode, safeSummaryOnly: true };
}
