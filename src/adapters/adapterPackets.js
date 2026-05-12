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
  "token",
  "access_token",
  "oauth_token",
  "vendor_token",
  "bearer_token",
  "authorization",
  "raw_audio",
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

const TTS_ADAPTER_GUIDANCE_ALLOWED_FIELDS = new Set([
  "voice_hint",
  "voice_profile_hint",
  "profile_hint",
  "model_hint",
  "locale_hint",
  "subtitle_hint",
  "speech_rate_hint",
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
  } = {}
) {
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
    adapter_validation_required: true,
  };
  assertAdapterPacketSafe(packet, "Live2D adapter packet");
  return packet;
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
    script_direction: subtitleCue.script_direction,
    display_start_ms: subtitleCue.display_start_ms,
    display_end_ms: subtitleCue.display_end_ms,
    line_break_plan: subtitleCue.line_break_plan,
    safe_area_policy: subtitleCue.safe_area_policy,
    reading_speed_guard: subtitleCue.reading_speed_guard,
    readability_profile: subtitleCue.readability_profile,
    adapter_guidance: subtitleCue.adapter_guidance ?? null,
    sync_source: subtitleCue.sync_source,
    language_profile: languageProfile,
    speech_rate_profile: speechRateProfile,
    performance_timing: performancePlan
      ? {
          total_duration_ms: performancePlan.total_duration_ms,
          track_count:
            Number(performancePlan.tracks?.speech?.length ?? 0) +
            Number(performancePlan.tracks?.motion?.length ?? 0),
        }
      : null,
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
  if (packet.adapter_kind === "tts") {
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
  }
  if (packet.adapter_kind === "subtitle") {
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
        sync_source: packet.sync_source,
        reading_speed_guard: packet.reading_speed_guard,
        readability_profile: packet.readability_profile,
        script_direction: packet.script_direction,
        adapter_guidance: packet.adapter_guidance,
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

function isSafeTtsGuidanceValue(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed !== "" && !containsUnsafeAdapterGuidanceValue(trimmed);
  }
  return typeof value === "number" ? Number.isFinite(value) : typeof value === "boolean";
}
