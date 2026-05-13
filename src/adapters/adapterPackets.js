import { ContractError, assertNoWorldCommand, canonical } from "../core/contracts.js";
import { assertExpressionProfileSafe } from "../services/expression/expressionProfile.js";
import { assertAffectiveContinuitySafe } from "../services/personality/affectiveContinuity.js";
import { assertPersonalityHabitSafe } from "../services/personality/personalityHabit.js";
import { assertBodyContinuitySafe } from "../services/presence/bodyContinuity.js";
import { assertAutonomousExpressionSafe } from "../services/presence/autonomousExpression.js";
import { assertCameraProximitySafe } from "../services/presence/cameraProximity.js";
import { assertMotionCueSafe } from "../services/presence/motionCue.js";
import { assertPerformancePlanSafe } from "../services/presence/performancePlan.js";
import { assertTurnRhythmSafe } from "../services/presence/turnRhythm.js";
import { assertLanguageProfileSafe } from "../services/voice/languageProfile.js";
import { assertSpeechCueSafe } from "../services/voice/speechCue.js";
import {
  assertSpeechRateProfileSafe,
  assertTongueTwisterModeSafe,
} from "../services/voice/speechRateProfile.js";
import { assertSubtitleCueSafe } from "../services/voice/subtitleCue.js";

const FORBIDDEN_PACKET_FIELDS = new Set([
  "world_command",
  "obs_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "memory_commit",
  "commit_memory",
  "memory_candidate",
  "memory_candidates",
  "candidate_payload",
  "relationship_commit",
  "relationship_update_commit",
  "relationship_update_candidate",
  "candidate",
  "candidates",
  "selected_memory_ids",
  "endpoint",
  "endpoint_url",
  "api_key",
  "api_token",
  "secret",
  "token",
  "access_token",
  "oauth_token",
  "vendor_token",
  "bearer_token",
  "authorization",
  "raw_audio",
  "raw_payload",
  "raw_renderer_payload",
  "renderer_payload",
  "audio_data",
  "raw_audio_body",
  "raw_phoneme_debug",
  "phoneme_debug",
  "raw_vendor_diagnostics",
  "vendor_diagnostics",
  "tts_vendor_diagnostics",
  "voice_sample",
  "raw_voice_sample",
  "audio_body",
  "dataset_path",
  "internal_model_path",
  "model_path",
]);
const CROSS_PACKET_ADAPTER_KINDS = new Set([
  "tts",
  "live2d",
  "subtitle",
  "obs",
  "overlay",
  "game",
  "youtube",
  "db",
]);
const CROSS_PACKET_FORBIDDEN_FIELD_PATTERN =
  /(?:^|_)(?:secret|token|endpoint|raw_payload|raw_packet|raw_response|raw_body|raw_command|raw_comment|raw_support|raw_frame|candidate|candidates|commit|execute|write)(?:_|$)/u;
const CROSS_PACKET_FORBIDDEN_TEXT_PATTERN =
  /\b(?:secret|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|endpoint|raw[_\s-]?(?:payload|packet|response|command)|candidate(?:_kind)?|commit(?:_memory)?|direct[_-]?memory[_-]?write)\b|https?:\/\//iu;

const TTS_ADAPTER_GUIDANCE_ALLOWED_FIELDS = new Set([
  "voice_hint",
  "voice_profile_hint",
  "profile_hint",
  "model_hint",
  "locale_hint",
  "subtitle_hint",
  "speech_rate_hint",
]);
const LIVE2D_ADAPTER_CUE_GUIDANCE_ALLOWED_FIELDS = new Set([
  "expression_guidance",
  "gaze_guidance",
  "breath_guidance",
  "motion_guidance",
]);
const TTS_UNSUPPORTED_VOICE_SAFE_ERROR_FIELDS = new Set([
  "schema",
  "adapter_kind",
  "error_status",
  "safe_code",
  "summary_only",
  "boundary_policy",
]);
const TTS_ADAPTER_SOURCE_STATUS_FIELDS = new Set([
  "schema",
  "adapter_kind",
  "source_verified",
  "safe_source_status",
  "handoff_status",
  "boundary_policy",
]);
const TTS_FIXTURE_PACKET_PREVIEW_FIELDS = new Set([
  "schema",
  "preview_status",
  "adapter_kind",
  "packet_field_count",
  "guidance_hint_count",
  "boundary_policy",
]);
const TTS_ADAPTER_PACKET_ALLOWED_FIELDS = new Set([
  "schema",
  "adapter_kind",
  "trace_id",
  "trace_id_present",
  "event_id",
  "event_id_present",
  "final_text",
  "text",
  "status",
  "performance_cue",
  "speech_cue",
  "performance_plan",
  "turn_rhythm",
  "affective_continuity",
  "personality_habit",
  "expression_profile",
  "autonomous_expression",
  "speech_rate_profile",
  "language_profile",
  "subtitle_cue",
  "tongue_twister_mode",
  "tts_adapter_guidance",
  "adapter_validation_required",
]);
const LIVE2D_FIXTURE_CUE_PREVIEW_FIELDS = new Set([
  "schema",
  "preview_status",
  "adapter_kind",
  "packet_field_count",
  "motion_track_count",
  "boundary_policy",
]);
const LIVE2D_ADAPTER_PACKET_ALLOWED_FIELDS = new Set([
  "schema",
  "adapter_kind",
  "trace_id",
  "trace_id_present",
  "event_id",
  "event_id_present",
  "action_type",
  "canonical_envelope",
  "performance_cue",
  "motion_cue",
  "body_continuity",
  "camera_proximity",
  "performance_plan",
  "turn_rhythm",
  "affective_continuity",
  "personality_habit",
  "expression_profile",
  "autonomous_expression",
  "live2d_adapter_guidance",
  "adapter_validation_required",
]);
const SUBTITLE_ADAPTER_PACKET_ALLOWED_FIELDS = new Set([
  "schema",
  "adapter_kind",
  "trace_id",
  "trace_id_present",
  "event_id",
  "event_id_present",
  "subtitle_text",
  "subtitle_language",
  "display_start_ms",
  "display_end_ms",
  "line_break_plan",
  "safe_area_policy",
  "boundary_policy",
  "adapter_validation_required",
]);
const FORBIDDEN_ADAPTER_ACTION_ENVELOPE_FIELDS = new Set([
  "reaction",
  "context",
  "task_candidate",
  "task_type",
  "task_type_candidate",
  "phase02_reaction",
  "phase03_context",
  "phase08_goal_candidate",
  "input_action_candidate",
  "candidate_kind",
  "requires_validation",
  "world_command",
  "candidate",
  "candidates",
]);
const APPROVED_ADAPTER_ACTION_ENVELOPE_SCHEMAS = new Set([
  "iris_phase04_approved_action_v1",
  "iris_approved_action_v1",
  "iris_adapter_approved_action_envelope_v1",
]);
const ADAPTER_HANDOFF_ROUTE_LABELS = new Set(["normal", "adapter", "review"]);
const APPROVED_ADAPTER_ACTION_ENVELOPE_FIELDS = new Set([
  "schema",
  "trace_id",
  "event_id",
  "handoff_route",
  "handoff_timestamp_status",
  "handoff_issued_at_ms",
  "handoff_expires_at_ms",
  "handoff_max_age_ms",
  "action_type",
  "target_presence_id",
  "tone",
  "emotion",
  "character_tag",
  "final_normalized_status",
  "continuity_maintained",
  "performance_cue",
]);

export function createTtsAdapterPacket(
  finalOutput,
  {
    speechCue,
    performancePlan,
    turnRhythm = null,
    affectiveContinuity = null,
    personalityHabit = null,
    expressionProfile = null,
    autonomousExpression = null,
    speechRateProfile = null,
    languageProfile = null,
    subtitleCue = null,
    tongueTwisterMode = null,
    ttsAdapterGuidance = null,
  } = {}
) {
  assertNoWorldCommand(finalOutput, "TTS adapter packet final output");
  assertSpeechCueSafe(speechCue, "TTS adapter packet speech cue");
  assertPerformancePlanSafe(performancePlan, "TTS adapter packet performance plan");
  if (turnRhythm) {
    assertTurnRhythmSafe(turnRhythm, "TTS adapter packet turn rhythm");
  }
  if (affectiveContinuity) {
    assertAffectiveContinuitySafe(affectiveContinuity, "TTS adapter packet affective continuity");
  }
  if (personalityHabit) {
    assertPersonalityHabitSafe(personalityHabit, "TTS adapter packet personality habit");
  }
  if (expressionProfile) {
    assertExpressionProfileSafe(expressionProfile, "TTS adapter packet expression profile");
  }
  if (autonomousExpression) {
    assertAutonomousExpressionSafe(
      autonomousExpression,
      "TTS adapter packet autonomous expression"
    );
  }
  if (speechRateProfile) {
    assertSpeechRateProfileSafe(speechRateProfile, "TTS adapter packet speech rate profile");
  }
  if (languageProfile) {
    assertLanguageProfileSafe(languageProfile, "TTS adapter packet language profile");
  }
  if (subtitleCue) {
    assertSubtitleCueSafe(subtitleCue, "TTS adapter packet subtitle cue");
  }
  if (tongueTwisterMode) {
    assertTongueTwisterModeSafe(tongueTwisterMode, "TTS adapter packet tongue twister mode");
  }

  const packet = {
    schema: "iris_adapter_packet_v1",
    adapter_kind: "tts",
    trace_id: finalOutput.trace_id,
    trace_id_present: String(finalOutput.trace_id ?? "").trim() !== "",
    event_id: finalOutput.event_id,
    event_id_present: String(finalOutput.event_id ?? "").trim() !== "",
    final_text: finalOutput.final_text ?? "",
    text: finalOutput.final_text ?? "",
    status: finalOutput.final_normalized_status,
    performance_cue: finalOutput.performance_cue ?? null,
    speech_cue: speechCue,
    performance_plan: performancePlan,
    turn_rhythm: turnRhythm,
    affective_continuity: affectiveContinuity,
    personality_habit: personalityHabit,
    expression_profile: expressionProfile,
    autonomous_expression: autonomousExpression,
    speech_rate_profile: speechRateProfile,
    language_profile: languageProfile,
    subtitle_cue: subtitleCue,
    tongue_twister_mode: tongueTwisterMode,
    tts_adapter_guidance: sanitizeTtsAdapterGuidanceHints(ttsAdapterGuidance),
    adapter_validation_required: true,
  };
  assertAdapterPacketSafe(packet, "TTS adapter packet");
  return packet;
}

export function sanitizeTtsAdapterGuidanceHints(guidance) {
  if (guidance == null) return null;
  if (typeof guidance !== "object" || Array.isArray(guidance)) {
    throw new ContractError("TTS adapter guidance: guidance must be an object");
  }
  const sanitized = {};
  for (const [field, value] of Object.entries(guidance)) {
    const normalized = normalizePacketField(field);
    if (
      !TTS_ADAPTER_GUIDANCE_ALLOWED_FIELDS.has(normalized) ||
      isForbiddenPacketField(normalized)
    ) {
      continue;
    }
    if (!isSafeTtsGuidanceValue(value)) {
      continue;
    }
    sanitized[normalized] = typeof value === "string" ? value.trim() : value;
  }
  assertTtsAdapterGuidanceSafe(sanitized);
  return sanitized;
}

export function assertTtsAdapterGuidanceSafe(guidance, context = "TTS adapter guidance") {
  if (guidance == null) return;
  if (typeof guidance !== "object" || Array.isArray(guidance)) {
    throw new ContractError(`${context}: guidance must be an object`);
  }
  for (const [field, value] of Object.entries(guidance)) {
    const normalized = normalizePacketField(field);
    if (
      normalized !== field ||
      !TTS_ADAPTER_GUIDANCE_ALLOWED_FIELDS.has(normalized) ||
      isForbiddenPacketField(field)
    ) {
      throw new ContractError(`${context}: unsafe guidance field`, { field });
    }
    if (!isSafeTtsGuidanceValue(value)) {
      throw new ContractError(`${context}: unsafe guidance value`, { field });
    }
  }
}

export function createTtsUnsupportedVoiceSafeError() {
  const summary = {
    schema: "iris_tts_unsupported_voice_safe_error_v1",
    adapter_kind: "tts",
    error_status: "summary_only_error",
    safe_code: "unsupported_voice_model_locale",
    summary_only: true,
    boundary_policy: {
      no_raw_vendor_diagnostics: true,
      no_voice_values: true,
      no_model_values: true,
      no_locale_values: true,
      no_endpoint_values: true,
      no_tokens: true,
    },
  };
  assertTtsUnsupportedVoiceSafeError(summary);
  return summary;
}

export function assertTtsUnsupportedVoiceSafeError(
  summary,
  context = "TTS unsupported voice safe error"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (!TTS_UNSUPPORTED_VOICE_SAFE_ERROR_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (
    summary.schema !== "iris_tts_unsupported_voice_safe_error_v1" ||
    summary.adapter_kind !== "tts" ||
    summary.error_status !== "summary_only_error" ||
    summary.safe_code !== "unsupported_voice_model_locale" ||
    summary.summary_only !== true
  ) {
    throw new ContractError(`${context}: invalid safe error`);
  }
  for (const field of [
    "no_raw_vendor_diagnostics",
    "no_voice_values",
    "no_model_values",
    "no_locale_values",
    "no_endpoint_values",
    "no_tokens",
  ]) {
    if (summary.boundary_policy?.[field] !== true) {
      throw new ContractError(`${context}: missing boundary`, { field });
    }
  }
  assertNoForbiddenPacketFields(summary, context);
}

export function createTtsAdapterSourceStatusFallback({
  sourceVerified = false,
  sourceStatus = "operator_attention_required",
} = {}) {
  const verified = sourceVerified === true;
  const safeSourceStatus = verified
    ? normalizeTtsAdapterSourceStatus(sourceStatus)
    : normalizeTtsAdapterSourceStatus("operator_attention_required");
  const summary = {
    schema: "iris_tts_adapter_source_status_fallback_v1",
    adapter_kind: "tts",
    source_verified: verified,
    safe_source_status: safeSourceStatus,
    handoff_status:
      safeSourceStatus === "licensed"
        ? "licensed_handoff"
        : safeSourceStatus === "placeholder"
          ? "placeholder_handoff"
          : "operator_attention_required",
    boundary_policy: {
      no_real_voice_values: true,
      no_endpoint_values: true,
      no_tokens: true,
      summary_only: true,
      unverified_source_not_ready: true,
    },
  };
  assertTtsAdapterSourceStatusFallback(summary);
  return summary;
}

export function assertTtsAdapterSourceStatusFallback(
  summary,
  context = "TTS adapter source status fallback"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (!TTS_ADAPTER_SOURCE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (
    summary.schema !== "iris_tts_adapter_source_status_fallback_v1" ||
    summary.adapter_kind !== "tts" ||
    typeof summary.source_verified !== "boolean" ||
    !["licensed", "placeholder", "operator_attention_required"].includes(
      summary.safe_source_status
    ) ||
    !["licensed_handoff", "placeholder_handoff", "operator_attention_required"].includes(
      summary.handoff_status
    )
  ) {
    throw new ContractError(`${context}: invalid source status fallback`);
  }
  if (
    summary.source_verified !== true &&
    !["operator_attention_required", "placeholder"].includes(summary.safe_source_status)
  ) {
    throw new ContractError(`${context}: unverified source must use safe fallback`);
  }
  for (const field of [
    "no_real_voice_values",
    "no_endpoint_values",
    "no_tokens",
    "summary_only",
    "unverified_source_not_ready",
  ]) {
    if (summary.boundary_policy?.[field] !== true) {
      throw new ContractError(`${context}: missing boundary`, { field });
    }
  }
  assertNoForbiddenPacketFields(summary, context);
}

export function createTtsFixturePacketPreview(packet) {
  assertAdapterPacketSafe(packet, "TTS fixture packet preview source packet");
  if (packet.adapter_kind !== "tts") {
    throw new ContractError("TTS fixture packet preview: TTS packet required");
  }
  const preview = {
    schema: "iris_tts_fixture_packet_preview_v1",
    preview_status: "pass",
    adapter_kind: "tts",
    packet_field_count: Object.keys(packet).length,
    guidance_hint_count:
      packet.tts_adapter_guidance && typeof packet.tts_adapter_guidance === "object"
        ? Object.keys(packet.tts_adapter_guidance).length
        : 0,
    boundary_policy: {
      safe_fixture_preview_only: true,
      no_endpoint_values: true,
      no_token_values: true,
      no_audio_bodies: true,
      no_vendor_diagnostic_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertTtsFixturePacketPreviewSafe(preview);
  return preview;
}

export function assertTtsFixturePacketPreviewSafe(
  preview,
  context = "TTS fixture packet preview"
) {
  if (!preview || typeof preview !== "object" || Array.isArray(preview)) {
    throw new ContractError(`${context}: preview must be an object`);
  }
  for (const field of Object.keys(preview)) {
    if (!TTS_FIXTURE_PACKET_PREVIEW_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected preview field`, { field });
    }
  }
  if (preview.schema !== "iris_tts_fixture_packet_preview_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["pass", "fail"].includes(preview.preview_status)) {
    throw new ContractError(`${context}: invalid preview status`);
  }
  if (preview.adapter_kind !== "tts") {
    throw new ContractError(`${context}: invalid adapter kind`);
  }
  for (const field of ["packet_field_count", "guidance_hint_count"]) {
    if (!Number.isInteger(preview[field]) || preview[field] < 0) {
      throw new ContractError(`${context}: invalid count`, { field });
    }
  }
  const requiredBoundary = [
    "safe_fixture_preview_only",
    "no_endpoint_values",
    "no_token_values",
    "no_audio_bodies",
    "no_vendor_diagnostic_values",
    "no_candidates",
    "no_commands",
  ];
  for (const field of requiredBoundary) {
    if (preview.boundary_policy?.[field] !== true) {
      throw new ContractError(`${context}: missing boundary`, { field });
    }
  }
  assertNoUnsafeTtsFixturePreviewMaterial(preview, context);
}

export function createLive2dAdapterPacket(
  envelope,
  {
    motionCue,
    performancePlan,
    bodyContinuity = null,
    cameraProximity = null,
    turnRhythm = null,
    affectiveContinuity = null,
    personalityHabit = null,
    expressionProfile = null,
    autonomousExpression = null,
    live2dAdapterGuidance = null,
  } = {}
) {
  assertApprovedActionEnvelopeForAdapter(envelope, "Live2D adapter packet envelope");
  assertNoWorldCommand(envelope, "Live2D adapter packet envelope");
  assertMotionCueSafe(motionCue, "Live2D adapter packet motion cue");
  assertPerformancePlanSafe(performancePlan, "Live2D adapter packet performance plan");
  if (bodyContinuity) {
    assertBodyContinuitySafe(bodyContinuity, "Live2D adapter packet body continuity");
  }
  if (cameraProximity) {
    assertCameraProximitySafe(cameraProximity, "Live2D adapter packet camera proximity");
  }
  if (turnRhythm) {
    assertTurnRhythmSafe(turnRhythm, "Live2D adapter packet turn rhythm");
  }
  if (affectiveContinuity) {
    assertAffectiveContinuitySafe(affectiveContinuity, "Live2D adapter packet affective continuity");
  }
  if (personalityHabit) {
    assertPersonalityHabitSafe(personalityHabit, "Live2D adapter packet personality habit");
  }
  if (expressionProfile) {
    assertExpressionProfileSafe(expressionProfile, "Live2D adapter packet expression profile");
  }
  if (autonomousExpression) {
    assertAutonomousExpressionSafe(
      autonomousExpression,
      "Live2D adapter packet autonomous expression"
    );
  }

  const packet = {
    schema: "iris_adapter_packet_v1",
    adapter_kind: "live2d",
    trace_id: envelope.trace_id,
    trace_id_present: String(envelope.trace_id ?? "").trim() !== "",
    event_id: envelope.event_id,
    event_id_present: String(envelope.event_id ?? "").trim() !== "",
    action_type: envelope.action_type,
    canonical_envelope: {
      action_type: envelope.action_type,
      target_presence_id: envelope.target_presence_id,
      tone: envelope.tone,
      emotion: envelope.emotion,
      character_tag: envelope.character_tag,
      final_normalized_status: envelope.final_normalized_status,
      continuity_maintained: envelope.continuity_maintained,
    },
    performance_cue: envelope.performance_cue ?? null,
    motion_cue: motionCue,
    body_continuity: bodyContinuity,
    camera_proximity: cameraProximity,
    performance_plan: performancePlan,
    turn_rhythm: turnRhythm,
    affective_continuity: affectiveContinuity,
    personality_habit: personalityHabit,
    expression_profile: expressionProfile,
    autonomous_expression: autonomousExpression,
    live2d_adapter_guidance: sanitizeLive2dAdapterCueGuidance(live2dAdapterGuidance),
    adapter_validation_required: true,
  };
  assertLive2dRecoveryCueRequired(packet, "Live2D adapter packet");
  assertAdapterPacketSafe(packet, "Live2D adapter packet");
  return packet;
}

export function sanitizeLive2dAdapterCueGuidance(guidance) {
  if (guidance == null) return null;
  if (typeof guidance !== "object" || Array.isArray(guidance)) {
    throw new ContractError("Live2D adapter cue guidance: guidance must be an object");
  }
  const sanitized = {};
  for (const [field, value] of Object.entries(guidance)) {
    const normalized = normalizePacketField(field);
    if (
      !LIVE2D_ADAPTER_CUE_GUIDANCE_ALLOWED_FIELDS.has(normalized) ||
      isForbiddenPacketField(normalized)
    ) {
      continue;
    }
    const safeValue = sanitizeAdapterPacketValue(value);
    if (safeValue === undefined) continue;
    sanitized[normalized] = safeValue;
  }
  assertLive2dAdapterCueGuidanceSafe(sanitized);
  return sanitized;
}

export function assertLive2dAdapterCueGuidanceSafe(
  guidance,
  context = "Live2D adapter cue guidance"
) {
  if (guidance == null) return;
  if (typeof guidance !== "object" || Array.isArray(guidance)) {
    throw new ContractError(`${context}: guidance must be an object`);
  }
  for (const field of Object.keys(guidance)) {
    const normalized = normalizePacketField(field);
    if (
      normalized !== field ||
      !LIVE2D_ADAPTER_CUE_GUIDANCE_ALLOWED_FIELDS.has(normalized) ||
      isForbiddenPacketField(field)
    ) {
      throw new ContractError(`${context}: unsafe guidance field`, { field });
    }
  }
  assertNoForbiddenPacketFields(guidance, context);
}

export function assertLive2dRecoveryCueRequired(packet, context = "Live2D adapter packet") {
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
    throw new ContractError(`${context}: packet object required`);
  }
  if (!requiresLive2dRecoveryPlan(packet)) return;
  if (!hasLive2dRecoveryPlan(packet)) {
    throw new ContractError(`${context}: closeup/laugh/scream cue requires recovery plan`);
  }
}

export function assertApprovedActionEnvelopeForAdapter(
  envelope,
  context = "Adapter action envelope",
  expectedCorrelation = null
) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new ContractError(`${context}: approved action envelope required`);
  }
  assertNoWorldCommand(envelope, context);
  assertNoForbiddenActionEnvelopeFields(envelope, context);
  assertApprovedActionEnvelopeAllowlist(envelope, context);
  assertAdapterHandoffRouteLabel(envelope, context);
  assertAdapterHandoffFreshTimestamp(envelope, context);
  for (const field of ["trace_id", "event_id", "action_type", "target_presence_id", "tone", "character_tag"]) {
    if (String(envelope[field] ?? "").trim() === "") {
      throw new ContractError(`${context}: missing approved action field`, { field });
    }
  }
  if (!canonical.actionTypes.has(envelope.action_type)) {
    throw new ContractError(`${context}: invalid action_type`, {
      action_type: envelope.action_type,
    });
  }
  assertAdapterHandoffTraceCorrelation(envelope, expectedCorrelation, context);
  assertTargetPresenceReadyForAdapter(envelope, context);
}

export function assertAdapterHandoffTraceCorrelation(
  envelope,
  expectedCorrelation = null,
  context = "Adapter handoff trace correlation"
) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new ContractError(`${context}: approved action envelope required`);
  }
  const traceId = String(envelope.trace_id ?? "").trim();
  const eventId = String(envelope.event_id ?? "").trim();
  if (traceId === "" || eventId === "") {
    throw new ContractError(`${context}: trace_id and event_id are required`);
  }
  if (expectedCorrelation == null) return;
  const expectedTraceId = String(expectedCorrelation.trace_id ?? expectedCorrelation.traceId ?? "").trim();
  const expectedEventId = String(expectedCorrelation.event_id ?? expectedCorrelation.eventId ?? "").trim();
  if (expectedTraceId !== "" && traceId !== expectedTraceId) {
    throw new ContractError(`${context}: trace_id changed before adapter handoff`);
  }
  if (expectedEventId !== "" && eventId !== expectedEventId) {
    throw new ContractError(`${context}: event_id changed before adapter handoff`);
  }
}

export function createAdapterHandoffFixtureRegressionPack({ nowMs = Date.now() } = {}) {
  const approved = {
    schema: "iris_phase04_approved_action_v1",
    trace_id: "trace",
    event_id: "event",
    handoff_route: "adapter",
    handoff_timestamp_status: "fresh",
    handoff_issued_at_ms: nowMs,
    handoff_expires_at_ms: nowMs + 10000,
    handoff_max_age_ms: 10000,
    action_type: "SPEAK",
    target_presence_id: "iris",
    tone: "calm",
    emotion: "neutral",
    character_tag: "iris",
  };
  const fixtures = [
    ["approved", approved, true],
    ["blocked_target", { ...approved, target_presence_id: "blocked" }, false],
    ["stale_timestamp", { ...approved, handoff_timestamp_status: "stale" }, false],
    ["candidate_mixed", { ...approved, candidate_kind: "adapter_shortcut" }, false],
    ["task_type_shortcut", { ...approved, task_type: "INTERACT_USER" }, false],
    ["review_queue_shortcut", { ...approved, handoff_route: "review" }, false],
    ["world_command_shortcut", { ...approved, world_command: { kind: "unsafe" } }, false],
  ];
  const results = fixtures.map(([fixture, envelope, shouldPass]) => {
    let passed = false;
    try {
      assertApprovedActionEnvelopeForAdapter(envelope, "Adapter handoff fixture regression");
      passed = true;
    } catch (error) {
      if (!(error instanceof ContractError)) throw error;
    }
    if (passed !== shouldPass) {
      throw new ContractError("Adapter handoff fixture regression: unexpected fixture result", {
        fixture,
      });
    }
    return { fixture, result: passed ? "pass" : "reject" };
  });
  return {
    schema: "iris_adapter_handoff_fixture_regression_pack_v1",
    fixture_count: results.length,
    approved_passed: results.find((result) => result.fixture === "approved")?.result === "pass",
    blocked_rejected:
      results.find((result) => result.fixture === "blocked_target")?.result === "reject",
    stale_rejected:
      results.find((result) => result.fixture === "stale_timestamp")?.result === "reject",
    candidate_rejected:
      results.find((result) => result.fixture === "candidate_mixed")?.result === "reject",
    task_type_rejected:
      results.find((result) => result.fixture === "task_type_shortcut")?.result === "reject",
    review_queue_rejected:
      results.find((result) => result.fixture === "review_queue_shortcut")?.result === "reject",
    world_command_rejected:
      results.find((result) => result.fixture === "world_command_shortcut")?.result === "reject",
    boundary_policy: {
      safe_fixture_labels_only: true,
      no_raw_payload_values: true,
      no_world_command_values: true,
      no_secret_values: true,
      no_candidate_payload_values: true,
    },
  };
}

export function createAdapterRegressionPackRunner({ nowMs = Date.now() } = {}) {
  const handoffPack = createAdapterHandoffFixtureRegressionPack({ nowMs });
  const checks = [
    handoffPack.approved_passed,
    handoffPack.blocked_rejected,
    handoffPack.stale_rejected,
    handoffPack.candidate_rejected,
    handoffPack.task_type_rejected,
    handoffPack.review_queue_rejected,
    handoffPack.world_command_rejected,
  ];
  const passed = checks.filter(Boolean).length;
  const summary = {
    schema: "iris_adapter_regression_pack_runner_v1",
    runner_status: passed === checks.length ? "pass" : "fail",
    pack_count: 1,
    fixture_count: handoffPack.fixture_count,
    pass_count: passed,
    fail_count: checks.length - passed,
    packs: [
      {
        pack_label: "adapter_handoff_fixture_regression",
        pack_status: passed === checks.length ? "pass" : "fail",
        fixture_count: handoffPack.fixture_count,
      },
    ],
    boundary_policy: {
      pass_fail_summary_only: true,
      no_raw_logs: true,
      no_raw_payload_values: true,
      no_world_command_values: true,
      no_secret_values: true,
      no_candidate_payload_values: true,
    },
  };
  assertAdapterRegressionPackRunnerSafe(summary);
  return summary;
}

export function assertAdapterRegressionPackRunnerSafe(
  summary,
  context = "adapter regression pack runner"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  const allowedFields = new Set([
    "schema",
    "runner_status",
    "pack_count",
    "fixture_count",
    "pass_count",
    "fail_count",
    "packs",
    "boundary_policy",
  ]);
  for (const field of Object.keys(summary)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (summary.schema !== "iris_adapter_regression_pack_runner_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["pass", "fail"].includes(summary.runner_status)) {
    throw new ContractError(`${context}: invalid runner status`);
  }
  for (const field of ["pack_count", "fixture_count", "pass_count", "fail_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid count`, { field });
    }
  }
  if (!Array.isArray(summary.packs) || summary.packs.length !== summary.pack_count) {
    throw new ContractError(`${context}: pack summary count mismatch`);
  }
  for (const pack of summary.packs) {
    if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
      throw new ContractError(`${context}: pack summary required`);
    }
    for (const field of Object.keys(pack)) {
      if (!["pack_label", "pack_status", "fixture_count"].includes(field)) {
        throw new ContractError(`${context}: unexpected pack summary field`, { field });
      }
    }
    if (!["pass", "fail"].includes(pack.pack_status)) {
      throw new ContractError(`${context}: invalid pack status`);
    }
    if (!Number.isInteger(pack.fixture_count) || pack.fixture_count < 0) {
      throw new ContractError(`${context}: invalid pack fixture count`);
    }
  }
  for (const field of [
    "pass_fail_summary_only",
    "no_raw_logs",
    "no_raw_payload_values",
    "no_world_command_values",
    "no_secret_values",
    "no_candidate_payload_values",
  ]) {
    if (summary.boundary_policy?.[field] !== true) {
      throw new ContractError(`${context}: missing boundary`, { field });
    }
  }
  assertNoUnsafeRegressionRunnerValues(summary, context);
}

function assertNoUnsafeRegressionRunnerValues(value, context, path = "root") {
  if (typeof value === "string") {
    if (CROSS_PACKET_FORBIDDEN_TEXT_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe runner summary value`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeRegressionRunnerValues(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUnsafeRegressionRunnerValues(child, context, `${path}.${field}`);
  }
}

function assertApprovedActionEnvelopeAllowlist(envelope, context) {
  for (const field of Object.keys(envelope)) {
    if (!APPROVED_ADAPTER_ACTION_ENVELOPE_FIELDS.has(field)) {
      throw new ContractError(`${context}: field is outside approved adapter schema`, { field });
    }
  }
  if (
    Object.hasOwn(envelope, "schema") &&
    !APPROVED_ADAPTER_ACTION_ENVELOPE_SCHEMAS.has(envelope.schema)
  ) {
    throw new ContractError(`${context}: schema is not approved for adapter handoff`, {
      schema: envelope.schema,
    });
  }
}

function assertAdapterHandoffFreshTimestamp(envelope, context) {
  const status = String(envelope.handoff_timestamp_status ?? "fresh").trim().toLowerCase();
  if (["stale", "expired"].includes(status)) {
    throw new ContractError(`${context}: stale handoff timestamp cannot enter adapter`);
  }
  const expiresAtMs = Number(envelope.handoff_expires_at_ms);
  if (Number.isFinite(expiresAtMs) && expiresAtMs < Date.now()) {
    throw new ContractError(`${context}: handoff timestamp expired`);
  }
  const issuedAtMs = Number(envelope.handoff_issued_at_ms);
  const maxAgeMs = Number(envelope.handoff_max_age_ms);
  if (Number.isFinite(issuedAtMs) && Number.isFinite(maxAgeMs) && maxAgeMs >= 0) {
    if (Date.now() - issuedAtMs > maxAgeMs) {
      throw new ContractError(`${context}: handoff timestamp is stale`);
    }
  }
}

function assertAdapterHandoffRouteLabel(envelope, context) {
  const route = String(envelope.handoff_route ?? "").trim();
  if (!ADAPTER_HANDOFF_ROUTE_LABELS.has(route)) {
    throw new ContractError(`${context}: handoff_route label is required`);
  }
  if (route === "review") {
    throw new ContractError(`${context}: review route cannot enter adapter execution handoff`);
  }
}

function assertTargetPresenceReadyForAdapter(envelope, context) {
  const targetPresenceId = String(envelope.target_presence_id ?? "").trim();
  if (
    targetPresenceId === "" ||
    /^(blocked|missing|target_presence_blocked|target_presence_missing|presence:blocked|presence:missing)$/i.test(
      targetPresenceId
    )
  ) {
    throw new ContractError(`${context}: target_presence_id is not adapter-ready`);
  }
}

export function assertAdapterWorldCommandOutputBoundary(
  output,
  context = "Adapter world command output"
) {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new ContractError(`${context}: output required`);
  }
  if (!Object.hasOwn(output, "world_command")) {
    assertNoWorldCommand(output, context);
    return;
  }
  if (
    output.schema !== "iris_adapter_world_command_output_v1" ||
    output.adapter_transform_completed !== true ||
    output.core_export === true ||
    output.public_summary === true
  ) {
    throw new ContractError(`${context}: world_command allowed only after adapter transform`);
  }
  const envelope = { ...output };
  delete envelope.world_command;
  assertNoWorldCommand(envelope, context);
}

export function createAdapterErrorSafeSummary({
  component = "adapter",
  status = "error",
  safeCode = "adapter_error",
} = {}) {
  const summary = {
    schema: "iris_adapter_error_safe_summary_v1",
    component: safeAdapterSummaryLabel(component, "adapter"),
    status: safeAdapterSummaryLabel(status, "error"),
    safe_code: safeAdapterSummaryLabel(safeCode, "adapter_error"),
    boundary_policy: {
      component_status_safe_code_only: true,
      no_endpoint_values: true,
      no_tokens: true,
      no_raw_commands: true,
      no_raw_responses: true,
      vendor_response_values_excluded: true,
      renderer_response_values_excluded: true,
      obs_response_values_excluded: true,
      game_response_values_excluded: true,
      payload_values_excluded: true,
      command_values_excluded: true,
      sensitive_values_excluded: true,
      unapproved_values_excluded: true,
    },
  };
  assertAdapterErrorSafeSummary(summary);
  return summary;
}

export function assertAdapterErrorSafeSummary(
  summary,
  context = "Adapter error safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  const allowedFields = new Set(["schema", "component", "status", "safe_code", "boundary_policy"]);
  for (const field of Object.keys(summary)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (summary.schema !== "iris_adapter_error_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of ["component", "status", "safe_code"]) {
    if (summary[field] !== safeAdapterSummaryLabel(summary[field], "")) {
      throw new ContractError(`${context}: unsafe summary label`, { field });
    }
  }
  for (const field of [
    "component_status_safe_code_only",
    "no_endpoint_values",
    "no_tokens",
    "no_raw_commands",
    "no_raw_responses",
    "vendor_response_values_excluded",
    "renderer_response_values_excluded",
    "obs_response_values_excluded",
    "game_response_values_excluded",
    "payload_values_excluded",
    "command_values_excluded",
    "sensitive_values_excluded",
    "unapproved_values_excluded",
  ]) {
    if (summary.boundary_policy?.[field] !== true) {
      throw new ContractError(`${context}: missing boundary`, { field });
    }
  }
  assertNoForbiddenPacketFields(summary, context);
}

export function createLive2dFixtureCuePreview(packet) {
  assertAdapterPacketSafe(packet, "Live2D fixture cue preview source packet");
  if (packet.adapter_kind !== "live2d") {
    throw new ContractError("Live2D fixture cue preview: Live2D packet required");
  }
  const preview = {
    schema: "iris_live2d_fixture_cue_preview_v1",
    preview_status: "pass",
    adapter_kind: "live2d",
    packet_field_count: Object.keys(packet).length,
    motion_track_count: Array.isArray(packet.performance_plan?.tracks?.motion)
      ? packet.performance_plan.tracks.motion.length
      : 0,
    boundary_policy: {
      safe_fixture_preview_only: true,
      renderer_payload_values_excluded: true,
      model_file_values_excluded: true,
      motion_instruction_values_excluded: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertLive2dFixtureCuePreviewSafe(preview);
  return preview;
}

export function assertLive2dFixtureCuePreviewSafe(
  preview,
  context = "Live2D fixture cue preview"
) {
  if (!preview || typeof preview !== "object" || Array.isArray(preview)) {
    throw new ContractError(`${context}: preview must be an object`);
  }
  for (const field of Object.keys(preview)) {
    if (!LIVE2D_FIXTURE_CUE_PREVIEW_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected preview field`, { field });
    }
  }
  if (preview.schema !== "iris_live2d_fixture_cue_preview_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["pass", "fail"].includes(preview.preview_status)) {
    throw new ContractError(`${context}: invalid preview status`);
  }
  if (preview.adapter_kind !== "live2d") {
    throw new ContractError(`${context}: invalid adapter kind`);
  }
  for (const field of ["packet_field_count", "motion_track_count"]) {
    if (!Number.isInteger(preview[field]) || preview[field] < 0) {
      throw new ContractError(`${context}: invalid count`, { field });
    }
  }
  const requiredBoundary = [
    "safe_fixture_preview_only",
    "renderer_payload_values_excluded",
    "model_file_values_excluded",
    "motion_instruction_values_excluded",
    "no_endpoint_values",
    "no_candidates",
    "no_commands",
  ];
  for (const field of requiredBoundary) {
    if (preview.boundary_policy?.[field] !== true) {
      throw new ContractError(`${context}: missing boundary`, { field });
    }
  }
  assertNoUnsafeLive2dFixturePreviewMaterial(preview, context);
}

export function createSubtitleAdapterPacket(
  finalOutput,
  {
    subtitleCue,
    languageProfile = null,
    speechRateProfile = null,
    performancePlan = null,
  } = {}
) {
  assertNoWorldCommand(finalOutput, "Subtitle adapter packet final output");
  assertSubtitleCueSafe(subtitleCue, "Subtitle adapter packet subtitle cue");
  if (languageProfile) {
    assertLanguageProfileSafe(languageProfile, "Subtitle adapter packet language profile");
  }
  if (speechRateProfile) {
    assertSpeechRateProfileSafe(speechRateProfile, "Subtitle adapter packet speech rate profile");
  }
  if (performancePlan) {
    assertPerformancePlanSafe(performancePlan, "Subtitle adapter packet performance plan");
  }

  const packet = {
    schema: "iris_adapter_packet_v1",
    adapter_kind: "subtitle",
    trace_id: finalOutput.trace_id,
    trace_id_present: String(finalOutput.trace_id ?? "").trim() !== "",
    event_id: finalOutput.event_id,
    event_id_present: String(finalOutput.event_id ?? "").trim() !== "",
    subtitle_text: subtitleCue.subtitle_text ?? "",
    subtitle_language: subtitleCue.subtitle_language,
    display_start_ms: subtitleCue.display_start_ms,
    display_end_ms: subtitleCue.display_end_ms,
    line_break_plan: subtitleCue.line_break_plan,
    safe_area_policy: subtitleCue.safe_area_policy,
    boundary_policy: {
      subtitle_display_guidance_only: true,
      no_memory_ids: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertAdapterPacketSafe(packet, "Subtitle adapter packet");
  return packet;
}

export function assertAdapterPacketSafe(packet, context = "adapter packet") {
  if (!packet || typeof packet !== "object") {
    throw new ContractError(`${context}: missing packet`);
  }
  assertNoWorldCommand(packet, context);
  if (packet.schema !== "iris_adapter_packet_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: packet.schema });
  }
  if (!["tts", "live2d", "subtitle"].includes(packet.adapter_kind)) {
    throw new ContractError(`${context}: unsupported adapter kind`, {
      adapter_kind: packet.adapter_kind,
    });
  }
  if (packet.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  assertNoForbiddenPacketFields(packet, context);
  assertAdapterHandoffTracePreserved(packet, context);
  if (packet.adapter_kind === "tts") {
    assertTtsAdapterPacketAllowlist(packet, context);
    assertSpeechCueSafe(packet.speech_cue, `${context} speech cue`);
    assertPerformancePlanSafe(packet.performance_plan, `${context} performance plan`);
    if (packet.turn_rhythm) {
      assertTurnRhythmSafe(packet.turn_rhythm, `${context} turn rhythm`);
    }
    if (packet.affective_continuity) {
      assertAffectiveContinuitySafe(packet.affective_continuity, `${context} affective continuity`);
    }
    if (packet.personality_habit) {
      assertPersonalityHabitSafe(packet.personality_habit, `${context} personality habit`);
    }
    if (packet.expression_profile) {
      assertExpressionProfileSafe(packet.expression_profile, `${context} expression profile`);
    }
    if (packet.autonomous_expression) {
      assertAutonomousExpressionSafe(
        packet.autonomous_expression,
        `${context} autonomous expression`
      );
    }
    if (packet.speech_rate_profile) {
      assertSpeechRateProfileSafe(packet.speech_rate_profile, `${context} speech rate profile`);
    }
    if (packet.language_profile) {
      assertLanguageProfileSafe(packet.language_profile, `${context} language profile`);
    }
    if (packet.subtitle_cue) {
      assertSubtitleCueSafe(packet.subtitle_cue, `${context} subtitle cue`);
    }
    if (packet.tongue_twister_mode) {
      assertTongueTwisterModeSafe(packet.tongue_twister_mode, `${context} tongue twister mode`);
    }
    assertTtsAdapterGuidanceSafe(packet.tts_adapter_guidance, `${context} TTS adapter guidance`);
  }
  if (packet.adapter_kind === "live2d") {
    assertLive2dAdapterPacketAllowlist(packet, context);
    if (!canonical.actionTypes.has(packet.action_type)) {
      throw new ContractError(`${context}: invalid live2d action_type`, {
        action_type: packet.action_type,
      });
    }
    assertMotionCueSafe(packet.motion_cue, `${context} motion cue`);
    assertPerformancePlanSafe(packet.performance_plan, `${context} performance plan`);
    if (packet.body_continuity) {
      assertBodyContinuitySafe(packet.body_continuity, `${context} body continuity`);
    }
    if (packet.camera_proximity) {
      assertCameraProximitySafe(packet.camera_proximity, `${context} camera proximity`);
    }
    if (packet.turn_rhythm) {
      assertTurnRhythmSafe(packet.turn_rhythm, `${context} turn rhythm`);
    }
    if (packet.affective_continuity) {
      assertAffectiveContinuitySafe(packet.affective_continuity, `${context} affective continuity`);
    }
    if (packet.personality_habit) {
      assertPersonalityHabitSafe(packet.personality_habit, `${context} personality habit`);
    }
    if (packet.expression_profile) {
      assertExpressionProfileSafe(packet.expression_profile, `${context} expression profile`);
    }
    if (packet.autonomous_expression) {
      assertAutonomousExpressionSafe(
        packet.autonomous_expression,
        `${context} autonomous expression`
      );
    }
    assertLive2dAdapterCueGuidanceSafe(
      packet.live2d_adapter_guidance,
      `${context} Live2D adapter cue guidance`
    );
    assertLive2dRecoveryCueRequired(packet, context);
  }
  if (packet.adapter_kind === "subtitle") {
    assertSubtitleAdapterPacketAllowlist(packet, context);
    if (typeof packet.subtitle_text !== "string") {
      throw new ContractError(`${context}: subtitle_text must be a string`);
    }
    assertSubtitleCueSafe(
      {
        schema: "iris_subtitle_cue_v1",
        trace_id: packet.trace_id,
        event_id: packet.event_id,
        internal_profile: true,
        subtitle_text: packet.subtitle_text,
        subtitle_language: packet.subtitle_language,
        display_start_ms: packet.display_start_ms,
        display_end_ms: packet.display_end_ms,
        line_break_plan: packet.line_break_plan,
        max_line_count: 2,
        safe_area_policy: packet.safe_area_policy,
        sync_source: "subtitle_adapter_packet",
        script_direction: inferSubtitlePacketScriptDirection(packet),
        adapter_validation_required: true,
      },
      `${context} subtitle cue`
    );
    if (packet.language_profile) {
      assertLanguageProfileSafe(packet.language_profile, `${context} language profile`);
    }
    if (packet.speech_rate_profile) {
      assertSpeechRateProfileSafe(packet.speech_rate_profile, `${context} speech rate profile`);
    }
  }
}

export function assertAdapterCrossPacketUnsafeFieldSweep(
  packet,
  { adapterKind = packet?.adapter_kind ?? packet?.adapter ?? "unknown" } = {},
  context = "adapter cross-packet unsafe field sweep"
) {
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
    throw new ContractError(`${context}: packet object required`);
  }
  const normalizedKind = normalizePacketField(adapterKind);
  if (!CROSS_PACKET_ADAPTER_KINDS.has(normalizedKind)) {
    throw new ContractError(`${context}: unsupported adapter kind`, { adapter_kind: adapterKind });
  }
  assertNoForbiddenCrossPacketFields(packet, context);
  return true;
}

function assertTtsAdapterPacketAllowlist(packet, context) {
  for (const field of Object.keys(packet)) {
    if (!TTS_ADAPTER_PACKET_ALLOWED_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsupported TTS adapter packet field`, { field });
    }
  }
}

function assertLive2dAdapterPacketAllowlist(packet, context) {
  for (const field of Object.keys(packet)) {
    if (!LIVE2D_ADAPTER_PACKET_ALLOWED_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsupported Live2D adapter packet field`, { field });
    }
  }
}

function assertAdapterHandoffTracePreserved(packet, context) {
  const traceIdPresent = String(packet.trace_id ?? "").trim() !== "";
  const eventIdPresent = String(packet.event_id ?? "").trim() !== "";
  if (
    traceIdPresent !== true ||
    eventIdPresent !== true ||
    packet.trace_id_present !== true ||
    packet.event_id_present !== true
  ) {
    throw new ContractError(`${context}: trace_id and event_id are required`);
  }
}

function assertSubtitleAdapterPacketAllowlist(packet, context) {
  for (const field of Object.keys(packet)) {
    if (!SUBTITLE_ADAPTER_PACKET_ALLOWED_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsupported subtitle adapter packet field`, { field });
    }
  }
  if (
    packet.boundary_policy?.subtitle_display_guidance_only !== true ||
    packet.boundary_policy?.no_memory_ids !== true ||
    packet.boundary_policy?.no_candidates !== true ||
    packet.boundary_policy?.no_commands !== true
  ) {
    throw new ContractError(`${context}: unsafe subtitle adapter boundary policy`);
  }
}

export function sanitizeAdapterPacketCommonFields(payload) {
  return sanitizeAdapterPacketValue(payload);
}

function sanitizeAdapterPacketValue(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeAdapterPacketValue(item))
      .filter((item) => item !== undefined);
  }

  const sanitized = {};
  for (const [field, child] of Object.entries(value)) {
    if (isForbiddenPacketField(field)) continue;
    if (typeof child === "string" && containsUnsafeAdapterGuidanceValue(child)) continue;
    sanitized[field] = sanitizeAdapterPacketValue(child);
  }
  return sanitized;
}

function assertNoForbiddenPacketFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenPacketFields(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (isForbiddenPacketField(field)) {
      throw new ContractError(`${context}: packet must not contain command fields`, {
        field,
        path,
      });
    }
    if (typeof child === "string" && containsUnsafeAdapterGuidanceValue(child)) {
      throw new ContractError(`${context}: packet must not contain unsafe adapter guidance values`, {
        field,
        path,
      });
    }
    assertNoForbiddenPacketFields(child, context, `${path}.${field}`);
  }
}

function assertNoForbiddenCrossPacketFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenCrossPacketFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    const normalized = normalizePacketField(field);
    if (
      isForbiddenPacketField(field) ||
      CROSS_PACKET_FORBIDDEN_FIELD_PATTERN.test(normalized)
    ) {
      throw new ContractError(`${context}: unsafe adapter packet field`, { field, path });
    }
    if (typeof child === "string" && CROSS_PACKET_FORBIDDEN_TEXT_PATTERN.test(child)) {
      throw new ContractError(`${context}: unsafe adapter packet value`, { field, path });
    }
    assertNoForbiddenCrossPacketFields(child, context, `${path}.${field}`);
  }
}

function assertNoForbiddenActionEnvelopeFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenActionEnvelopeFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    const normalized = normalizePacketField(field);
    if (FORBIDDEN_ADAPTER_ACTION_ENVELOPE_FIELDS.has(normalized)) {
      throw new ContractError(`${context}: upstream action candidate cannot enter adapter`, {
        field,
        path,
      });
    }
    assertNoForbiddenActionEnvelopeFields(child, context, `${path}.${field}`);
  }
}

function isForbiddenPacketField(field) {
  return FORBIDDEN_PACKET_FIELDS.has(normalizePacketField(field));
}

function normalizePacketField(field) {
  return String(field ?? "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .toLowerCase();
}

function containsUnsafeAdapterGuidanceValue(value) {
  return /\bhttps?:\/\/|\b(?:api[_-]?key|oauth[_-]?token|token|authorization|password|secret)\s*[:=]|\bBearer\s+|(?:^|[\\/:])(?:dataset|datasets|model|models)(?:[\\/]|$)|\.(?:wav|mp3|flac|ogg|opus|m4a)\b/iu.test(
    value
  );
}

function safeAdapterSummaryLabel(value, fallback) {
  const raw = String(value ?? "").trim();
  if (
    raw === "" ||
    containsUnsafeAdapterGuidanceValue(raw) ||
    /\b(endpoint|token|secret|authorization|raw[_-]?command|raw[_-]?response|raw[_-]?(?:vendor|renderer|obs|game)[_-]?response|(?:vendor|renderer|obs|game)[_-]?response|raw[_-]?payload|world[_-]?command|candidate)\b/iu.test(raw)
  ) {
    return fallback;
  }
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/gu, "_")
    .replace(/_+/gu, "_")
    .replace(/^_+|_+$/gu, "");
  if (
    text === "" ||
    containsUnsafeAdapterGuidanceValue(text) ||
    /\b(endpoint|token|secret|authorization|raw_command|raw_response|raw_vendor_response|vendor_response|raw_renderer_response|renderer_response|raw_obs_response|obs_response|raw_game_response|game_response|raw_payload|world_command|candidate)\b/iu.test(text)
  ) {
    return fallback;
  }
  return text.slice(0, 80);
}

function assertNoUnsafeTtsFixturePreviewMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /\b(endpoint|token|authorization|bearer|secret|raw audio|raw_audio|audio_base64|audio_data_url|vendor diagnostics|vendor_diagnostics|tts_vendor_diagnostics|input_action_candidate|world_command|candidate)\b|https?:\/\//iu.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe preview material`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeTtsFixturePreviewMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (path === "root" && field === "schema") continue;
    assertNoUnsafeTtsFixturePreviewMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoUnsafeLive2dFixturePreviewMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /\b(endpoint|token|authorization|bearer|secret|raw renderer payload|raw_renderer_payload|renderer_payload|model path|model_path|internal_model_path|motion command|motion_command|raw_motion_command|input_action_candidate|world_command|candidate)\b|https?:\/\//iu.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe preview material`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeLive2dFixturePreviewMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (path === "root" && field === "schema") continue;
    assertNoUnsafeLive2dFixturePreviewMaterial(child, context, `${path}.${field}`);
  }
}

function isSafeTtsGuidanceValue(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed !== "" && !containsUnsafeAdapterGuidanceValue(trimmed);
  }
  return typeof value === "number" ? Number.isFinite(value) : typeof value === "boolean";
}

function normalizeTtsAdapterSourceStatus(status) {
  const normalized = String(status ?? "").trim().toLowerCase();
  return ["licensed", "placeholder", "operator_attention_required"].includes(normalized)
    ? normalized
    : "operator_attention_required";
}

function requiresLive2dRecoveryPlan(packet) {
  const motionStyle = String(packet.motion_cue?.motion_style ?? "").toLowerCase();
  const cameraLevel = String(packet.camera_proximity?.proximity_level ?? "").toLowerCase();
  const cameraProfile = String(
    packet.camera_proximity?.camera_proximity_profile ?? ""
  ).toLowerCase();
  const autonomousState = String(
    packet.autonomous_expression?.autonomous_state_id ?? ""
  ).toLowerCase();
  return (
    motionStyle.includes("laugh") ||
    motionStyle.includes("scream") ||
    autonomousState.includes("scream") ||
    ["close", "face_near", "extreme_closeup"].includes(cameraLevel) ||
    cameraProfile.includes("close") ||
    cameraProfile.includes("face")
  );
}

function hasLive2dRecoveryPlan(packet) {
  return (
    packet.camera_proximity?.recovery_plan?.required === true ||
    packet.expression_profile?.recovery_profile?.required === true ||
    Number(packet.autonomous_expression?.scream_reaction_plan?.recovery_pause_ms ?? 0) > 0 ||
    packet.affective_continuity?.breath_recovery_plan?.required === true ||
    packet.affective_continuity?.affective_state?.recovery_required === true ||
    packet.body_continuity?.body_motion_plan?.recovery_state === "recovering" ||
    packet.body_continuity?.breath_plan?.breath_profile === "burst_laugh_profile"
  );
}

function inferSubtitlePacketScriptDirection(packet) {
  const segmentDirection = packet.line_break_plan?.find?.((segment) =>
    ["ltr", "rtl"].includes(segment?.direction)
  )?.direction;
  return ["ltr", "rtl"].includes(segmentDirection) ? segmentDirection : "ltr";
}
