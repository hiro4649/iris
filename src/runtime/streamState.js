import { assertHumanLikenessEvaluationSafe } from "../services/evaluation/humanLikenessEvaluation.js";
import { assertCandidateReviewItemSafe } from "../services/dev/candidateReviewQueue.js";
import { sanitizeGameControlResultForPublicState } from "../adapters/game/mockGameControlAdapter.js";
import { sanitizeBoundaryAuditForPublicState } from "../services/evaluation/boundaryAudit.js";
import { sanitizeExpressionProfileForPublicState } from "../services/expression/expressionProfile.js";
import { assertIrisPersonaProfileSafe } from "../services/personality/irisPersonaProfile.js";
import { sanitizeGameCommentaryForPublicState } from "../services/game/gameCommentary.js";
import { sanitizeGameEmbodimentForPublicState } from "../services/game/gameEmbodiment.js";
import { sanitizeGamePerceptionForPublicState } from "../services/game/gamePerception.js";
import { sanitizeGamePlayerForPublicState } from "../services/game/gamePlayer.js";
import { sanitizeGameActionValidationForPublicState } from "../services/game/gameActionValidator.js";
import { sanitizeDonationReactionForPublicState } from "../services/interaction/donationReaction.js";
import { sanitizeExternalTopicReactionForPublicState } from "../services/interaction/externalTopicReaction.js";
import { sanitizeMediaWatchReactionForPublicState } from "../services/interaction/mediaWatchReaction.js";
import { sanitizeMemoryRecallForPublicState } from "../services/memory/memoryRecall.js";
import {
  sanitizeCandidatePersistenceForPublicState,
  sanitizeCandidateValidationForPublicState,
} from "../services/persistence/candidateValidator.js";
import { sanitizeAutonomousExpressionForPublicState } from "../services/presence/autonomousExpression.js";
import { sanitizeCameraProximityForPublicState } from "../services/presence/cameraProximity.js";
import { sanitizeRelationshipDeepeningForPublicState } from "../services/relationship/relationshipDeepening.js";
import { sanitizeStreamLifecycleForPublicState } from "../services/stream/streamLifecycle.js";
import { sanitizeLanguageProfileForPublicState } from "../services/voice/languageProfile.js";
import {
  sanitizeSpeechRateProfileForPublicState,
  sanitizeTongueTwisterModeForPublicState,
} from "../services/voice/speechRateProfile.js";
import { sanitizeSubtitleCueForPublicState } from "../services/voice/subtitleCue.js";
import { ContractError } from "../core/contracts.js";

const UNSAFE_VISION_METADATA_SUMMARY_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|raw[_\s-]?(?:comment|support|frame|audio)|raw_comment|raw_support|raw_frame|raw_audio|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url)\b|https?:\/\//i;
const UNSAFE_PUBLIC_TEXT_PATTERN =
  /\b(?:relation[\s_-]?score|relationship[\s_-]?score|internal[\s_-]?score|hidden[\s_-]?score|relationship[\s_-]?delta|proposed[\s_-]?relation[\s_-]?score[\s_-]?delta)\b|\b\d+(?:\.\d+)?\s*(?:relationship|relation)\s*(?:score|delta)\b/i;

export function createStreamState({ historyLimit = 20 } = {}) {
  const state = {
    status: "idle",
    last_event_id: null,
    last_trace_id: null,
    last_source: null,
    last_payload_kind: null,
    last_persona_profile: null,
    last_game_context: null,
    last_vision_metadata_summary: null,
    last_affect_snapshot: null,
    last_speech_cue: null,
    last_speech_rate_profile: null,
    last_language_profile: null,
    last_subtitle_cue: null,
    last_tongue_twister_mode: null,
    last_motion_cue: null,
    last_performance_plan: null,
    last_body_continuity: null,
    last_camera_proximity: null,
    last_turn_rhythm: null,
    last_affective_continuity: null,
    last_personality_habit: null,
    last_expression_profile: null,
    last_autonomous_expression: null,
    last_relationship_deepening: null,
    last_donation_reaction: null,
    last_media_watch_reaction: null,
    last_external_topic_reaction: null,
    last_memory_recall: null,
    last_game_perception: null,
    last_game_commentary: null,
    last_game_player: null,
    last_game_action_validation: null,
    last_game_control_result: null,
    last_game_embodiment: null,
    last_stream_lifecycle: null,
    last_human_likeness_evaluation: null,
    last_boundary_audit: null,
    last_candidate_validation: null,
    last_candidate_persistence: null,
    last_candidate_review_items: [],
    last_tts_adapter_summary: null,
    last_live2d_adapter_summary: null,
    last_subtitle_adapter_summary: null,
    last_text: "",
    last_decision: null,
    last_envelope: null,
    updated_at_ms: Date.now(),
    history: [],
  };

  return {
    get() {
      return structuredClone(state);
    },
    updateFromRuntimeResult(result) {
      const phase15 = result?.core?.phase15;
      const phase01 = result?.core?.phase01;
      const event = result?.event;
      const nowMs = Date.now();
      const traceId =
        firstNonEmptyText(event?.trace_id) ??
        firstNonEmptyText(phase15?.trace_id) ??
        firstNonEmptyText(phase01?.trace_id) ??
        firstNonEmptyText(result?.trace_id) ??
        firstNonEmptyText(result?.request_id) ??
        null;
      const eventId =
        firstNonEmptyText(event?.event_id) ??
        firstNonEmptyText(phase15?.event_id) ??
        firstNonEmptyText(result?.event_id) ??
        (traceId ? `trace:${traceId}` : `runtime:${nowMs}`);
      state.status = result?.processed ? "active" : "idle";
      state.last_event_id = eventId;
      state.last_trace_id = traceId;
      state.last_source = event?.source ?? phase01?.source ?? null;
      state.last_payload_kind = phase01?.payload_kind ?? event?.payload?.payload_kind ?? "comment";
      state.last_persona_profile = sanitizePersonaProfile(
        result?.persona_profile ?? result?.core?.personaProfile ?? null
      );
      const rawGameContext = phase01?.game_context ?? event?.payload?.game_context ?? null;
      state.last_game_context = sanitizeGameContextForPublicState(rawGameContext);
      state.last_vision_metadata_summary = sanitizeVisionMetadataSummary(
        rawGameContext?.vision_metadata ?? event?.payload?.vision_metadata ?? null
      );
      state.last_affect_snapshot = phase15?.affect_snapshot ?? result?.core?.affectSnapshot ?? null;
      state.last_speech_cue =
        result?.speech_cue ??
        result?.adapter_packets?.tts?.speech_cue ??
        result?.adapters?.tts?.payload?.speech_cue ??
        null;
      state.last_speech_rate_profile = sanitizeSpeechRateProfileForPublicState(
        result?.speech_rate_profile ??
          result?.adapter_packets?.tts?.speech_rate_profile ??
          result?.adapters?.tts?.payload?.speech_rate_profile ??
          null
      );
      state.last_language_profile = sanitizeLanguageProfileForPublicState(
        result?.language_profile ??
          result?.adapter_packets?.tts?.language_profile ??
          result?.adapters?.tts?.payload?.language_profile ??
          null
      );
      state.last_subtitle_cue = sanitizeSubtitleCueForPublicState(
        result?.subtitle_cue ??
          result?.adapter_packets?.tts?.subtitle_cue ??
          result?.adapters?.subtitle?.subtitle_cue ??
          result?.adapters?.tts?.payload?.subtitle_cue ??
          null
      );
      state.last_tongue_twister_mode = sanitizeTongueTwisterModeForPublicState(
        result?.tongue_twister_mode ??
          result?.adapter_packets?.tts?.tongue_twister_mode ??
          result?.adapters?.tts?.payload?.tongue_twister_mode ??
          null
      );
      state.last_motion_cue =
        result?.motion_cue ??
        result?.adapter_packets?.live2d?.motion_cue ??
        result?.adapters?.live2d?.motion_cue ??
        null;
      state.last_performance_plan =
        result?.performance_plan ??
        result?.adapter_packets?.tts?.performance_plan ??
        result?.adapter_packets?.live2d?.performance_plan ??
        result?.adapters?.tts?.payload?.performance_plan ??
        result?.adapters?.live2d?.performance_plan ??
        null;
      state.last_body_continuity =
        result?.body_continuity ??
        result?.adapter_packets?.live2d?.body_continuity ??
        result?.adapters?.live2d?.body_continuity ??
        null;
      state.last_camera_proximity = sanitizeCameraProximityForPublicState(
        result?.camera_proximity ??
          result?.adapter_packets?.live2d?.camera_proximity ??
          result?.adapters?.live2d?.camera_proximity ??
          null
      );
      state.last_turn_rhythm =
        result?.turn_rhythm ??
        result?.adapter_packets?.tts?.turn_rhythm ??
        result?.adapter_packets?.live2d?.turn_rhythm ??
        result?.adapters?.tts?.payload?.turn_rhythm ??
        result?.adapters?.live2d?.turn_rhythm ??
        null;
      state.last_affective_continuity =
        result?.affective_continuity ??
        result?.adapter_packets?.tts?.affective_continuity ??
        result?.adapter_packets?.live2d?.affective_continuity ??
        result?.adapters?.tts?.payload?.affective_continuity ??
        result?.adapters?.live2d?.affective_continuity ??
        null;
      state.last_personality_habit =
        result?.personality_habit ??
        result?.adapter_packets?.tts?.personality_habit ??
        result?.adapter_packets?.live2d?.personality_habit ??
        result?.adapters?.tts?.payload?.personality_habit ??
        result?.adapters?.live2d?.personality_habit ??
        null;
      state.last_expression_profile = sanitizeExpressionProfileForPublicState(
        result?.expression_profile ??
          result?.adapter_packets?.tts?.expression_profile ??
          result?.adapter_packets?.live2d?.expression_profile ??
          result?.adapters?.tts?.payload?.expression_profile ??
          result?.adapters?.live2d?.expression_profile ??
          null
      );
      state.last_autonomous_expression = sanitizeAutonomousExpressionForPublicState(
        result?.autonomous_expression ??
          result?.adapter_packets?.tts?.autonomous_expression ??
          result?.adapter_packets?.live2d?.autonomous_expression ??
          result?.adapters?.tts?.payload?.autonomous_expression ??
          result?.adapters?.live2d?.autonomous_expression ??
          null
      );
      state.last_relationship_deepening = sanitizeRelationshipDeepeningForPublicState(
        result?.relationship_deepening ?? null
      );
      state.last_donation_reaction = sanitizeDonationReactionForPublicState(
        result?.donation_reaction ?? null
      );
      state.last_media_watch_reaction = sanitizeMediaWatchReactionForPublicState(
        result?.media_watch_reaction ?? null
      );
      state.last_external_topic_reaction = sanitizeExternalTopicReactionForPublicState(
        result?.external_topic_reaction ?? null
      );
      state.last_memory_recall = sanitizeMemoryRecallForPublicState(result?.memory_recall ?? null);
      state.last_game_perception = sanitizeGamePerceptionForPublicState(
        result?.game_perception ?? null
      );
      state.last_game_commentary = sanitizeGameCommentaryForPublicState(
        result?.game_commentary ?? null
      );
      state.last_game_player = sanitizeGamePlayerForPublicState(result?.game_player ?? null);
      state.last_game_action_validation = sanitizeGameActionValidationForPublicState(
        result?.game_action_validation ?? null
      );
      state.last_game_control_result = sanitizeGameControlResultForPublicState(
        result?.game_control_result ?? null
      );
      state.last_game_embodiment = sanitizeGameEmbodimentForPublicState(
        result?.game_embodiment ?? null
      );
      state.last_stream_lifecycle = sanitizeStreamLifecycleForPublicState(
        result?.stream_lifecycle ?? null
      );
      state.last_human_likeness_evaluation = sanitizeHumanLikenessEvaluation(
        result?.human_likeness_evaluation ?? null
      );
      state.last_boundary_audit = sanitizeBoundaryAuditForPublicState(
        result?.boundary_audit ?? null
      );
      state.last_candidate_validation = sanitizeCandidateValidationForPublicState(
        result?.candidate_validation ?? null
      );
      state.last_candidate_persistence = sanitizeCandidatePersistenceForPublicState(
        result?.candidate_persistence ?? null
      );
      state.last_candidate_review_items = sanitizeCandidateReviewItems(
        result?.candidate_review_items
      );
      state.last_tts_adapter_summary = sanitizeAdapterResponseSummary(
        result?.adapters?.tts?.response_summary ?? null,
        "tts"
      );
      state.last_live2d_adapter_summary = sanitizeAdapterResponseSummary(
        result?.adapters?.live2d?.response_summary ?? null,
        "live2d"
      );
      state.last_subtitle_adapter_summary = sanitizeAdapterResponseSummary(
        result?.adapters?.subtitle?.response_summary ?? null,
        "subtitle"
      );
      state.last_text = sanitizePublicText(phase15?.final_text ?? "");
      state.last_decision = phase15?.final_decision ?? null;
      state.last_envelope = phase15?.phase15_continuity_envelope ?? null;
      state.updated_at_ms = nowMs;
      state.history.push({
        event_id: state.last_event_id,
        trace_id: state.last_trace_id,
        source: state.last_source,
        payload_kind: state.last_payload_kind,
        vision_source_kind: state.last_vision_metadata_summary?.source_kind ?? null,
        vision_frame_age_ms: state.last_vision_metadata_summary?.frame_age_ms ?? null,
        vision_ui_focus_count: state.last_vision_metadata_summary?.ui_focus_count ?? null,
        affect_label: state.last_affect_snapshot?.affect_label ?? null,
        prosody_style: state.last_speech_cue?.prosody_style ?? null,
        speech_rate_label: state.last_speech_rate_profile?.base_rate ?? null,
        response_language: state.last_language_profile?.response_language ?? null,
        subtitle_language: state.last_subtitle_cue?.subtitle_language ?? null,
        tongue_twister_enabled: state.last_tongue_twister_mode?.enabled ?? false,
        motion_style: state.last_motion_cue?.motion_style ?? null,
        body_state_id: state.last_body_continuity?.body_state_id ?? null,
        camera_proximity_profile:
          state.last_camera_proximity?.camera_proximity_profile ?? null,
        proximity_level: state.last_camera_proximity?.proximity_level ?? null,
        rhythm_state_id: state.last_turn_rhythm?.rhythm_state_id ?? null,
        affective_state_id: state.last_affective_continuity?.affective_state_id ?? null,
        laughter_state: state.last_affective_continuity?.laughter_state ?? null,
        selected_habit: state.last_personality_habit?.selected_habit ?? null,
        expression_profile_id: state.last_expression_profile?.expression_profile_id ?? null,
        laugh_kind: state.last_expression_profile?.laugh_expression_profile?.laugh_kind ?? null,
        autonomous_state_id:
          state.last_autonomous_expression?.autonomous_state_id ?? null,
        scream_profile:
          state.last_autonomous_expression?.scream_reaction_plan?.scream_profile ?? null,
        familiarity_level: state.last_relationship_deepening?.familiarity_level ?? null,
        relationship_candidate_status:
          state.last_relationship_deepening?.candidate_status ?? null,
        donation_reaction_style: state.last_donation_reaction?.reaction_style ?? null,
        media_watch_reaction_mode: state.last_media_watch_reaction?.reaction_mode ?? null,
        external_topic_reaction_mode:
          state.last_external_topic_reaction?.reaction_mode ?? null,
        memory_recall_decision: state.last_memory_recall?.recall_decision ?? null,
        selected_memory_count: state.last_memory_recall?.selected_memory_count ?? null,
        danger_level: state.last_game_perception?.danger_level ?? null,
        commentary_trigger: state.last_game_perception?.commentary_trigger ?? null,
        commentary_mode: state.last_game_commentary?.commentary_mode ?? null,
        game_goal: state.last_game_player?.game_goal ?? null,
        input_action_candidate_status:
          state.last_game_player?.input_action_candidate_status ?? null,
        game_action_validation_status:
          state.last_game_action_validation?.validation_status ?? null,
        approved_game_action_kind:
          state.last_game_action_validation?.approved_game_action_kind ?? null,
        game_control_status:
          state.last_game_control_result?.control_status ?? null,
        game_embodied_state: state.last_game_embodiment?.game_embodied_state ?? null,
        session_phase: state.last_stream_lifecycle?.stream_lifecycle_state?.session_phase ?? null,
        human_likeness_score:
          state.last_human_likeness_evaluation?.total_human_likeness_score ?? null,
        boundary_audit_status: state.last_boundary_audit?.audit_status ?? null,
        candidate_validation_status:
          state.last_candidate_validation?.validation_status ?? null,
        candidate_memory_approved_count:
          state.last_candidate_validation?.approved_memory_record_count ?? null,
        candidate_memory_validated_count:
          state.last_candidate_validation?.approved_memory_record_count ?? null,
        candidate_relationship_validated_count:
          state.last_candidate_validation?.approved_relationship_record_count ?? null,
        candidate_memory_committed_count:
          state.last_candidate_persistence?.memory_committed_count ?? null,
        candidate_relationship_committed_count:
          state.last_candidate_persistence?.relationship_committed_count ?? null,
        candidate_persistence_error_count:
          state.last_candidate_persistence?.persistence_error_count ?? null,
        candidate_review_count: state.last_candidate_review_items.length,
        tts_bridge_status: state.last_tts_adapter_summary?.bridge_status ?? null,
        tts_duration_ms: state.last_tts_adapter_summary?.duration_ms ?? null,
        live2d_bridge_status: state.last_live2d_adapter_summary?.bridge_status ?? null,
        live2d_duration_ms: state.last_live2d_adapter_summary?.duration_ms ?? null,
        subtitle_bridge_status: state.last_subtitle_adapter_summary?.bridge_status ?? null,
        subtitle_duration_ms: state.last_subtitle_adapter_summary?.duration_ms ?? null,
        performance_duration_ms: state.last_performance_plan?.total_duration_ms ?? null,
        text: state.last_text,
        decision: state.last_decision,
        updated_at_ms: state.updated_at_ms,
      });
      while (state.history.length > historyLimit) state.history.shift();
      return this.get();
    },
  };
}

function sanitizeHumanLikenessEvaluation(evaluation) {
  if (!evaluation) return null;
  assertHumanLikenessEvaluationSafe(evaluation, "Human likeness public summary");
  return structuredClone(evaluation);
}

function sanitizeCandidateReviewItems(items) {
  if (!Array.isArray(items)) {
    throw new ContractError("stream state: candidate review items are required");
  }
  for (const item of items) {
    assertCandidateReviewItemSafe(item, "Candidate review public summary");
  }
  return structuredClone(items);
}

function firstNonEmptyText(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function sanitizePublicText(value) {
  const text = String(value ?? "");
  return UNSAFE_PUBLIC_TEXT_PATTERN.test(text) ? "" : text;
}

function sanitizePersonaProfile(profile) {
  if (!profile) return null;
  assertIrisPersonaProfileSafe(profile, "Persona profile public summary");
  return structuredClone(profile);
}

function sanitizeAdapterResponseSummary(summary, adapterKind = "") {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  const ok = summary.ok === true;
  const artifactUrl = ok ? cleanText(summary.artifact_url, 500) : "";
  const artifactKind = ok ? cleanText(summary.artifact_kind, 120) : "";
  const artifactAvailable = ok && isExpectedAdapterArtifactKind(adapterKind, artifactKind);
  const eventId = ok ? cleanText(summary.event_id, 160) : "";
  const durationMs = ok ? safeNullableNumber(summary.duration_ms) : null;
  return {
    status: safeNumber(summary.status),
    ok,
    response_kind: cleanText(summary.response_kind),
    response_omitted: summary.response_omitted === true,
    error_kind: cleanText(summary.error_kind),
    request_id: cleanText(summary.request_id),
    bridge_status: cleanText(summary.bridge_status),
    artifact_url: artifactUrl,
    artifact_kind: artifactAvailable ? artifactKind : "",
    manifest_id: artifactAvailable ? cleanText(summary.manifest_id, 220) : "",
    event_id: eventId,
    duration_ms: durationMs,
    sample_rate_hz: artifactAvailable ? safeNullableNumber(summary.sample_rate_hz) : null,
    viseme_count: artifactAvailable ? safeNumber(summary.viseme_count) : 0,
  };
}

function isExpectedAdapterArtifactKind(adapterKind, artifactKind) {
  if (!artifactKind) return false;
  if (adapterKind === "tts") {
    return ["audio_wav", "audio_mpeg", "audio_mp4", "audio_aac", "audio_flac", "audio_ogg", "audio_opus", "audio_webm"].includes(artifactKind);
  }
  if (adapterKind === "live2d") {
    return artifactKind === "live2d_cue_json" || artifactKind === "live2d_engine_cue_json";
  }
  if (adapterKind === "subtitle") return artifactKind === "subtitle_vtt" || artifactKind === "subtitle_srt";
  return Boolean(artifactKind);
}

function sanitizeVisionMetadataSummary(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const frameId = cleanText(metadata.frame_id, 120);
  const frameReferenceId = cleanText(metadata.frame_reference_id, 120);
  return {
    schema: "iris_vision_metadata_summary_v1",
    source_kind: cleanPublicVisionMetadataText(
      metadata.source_kind || "unknown_vision_source",
      120,
      "vision_source_omitted"
    ),
    frame_id: "",
    frame_reference_id: "",
    frame_id_available: frameId !== "",
    frame_reference_available: frameReferenceId !== "",
    frame_age_ms: safeNullableNumber(metadata.frame_age_ms),
    raw_frame_available:
      metadata.raw_frame_available === true || Object.hasOwn(metadata, "raw_frame"),
    raw_frame_policy: "raw_frame_not_passed_to_core",
    ui_focus_count: Array.isArray(metadata.ui_focus_areas) ? metadata.ui_focus_areas.length : 0,
    boundary_policy: {
      no_frame_ids: true,
      no_frame_references: true,
      no_raw_frames: true,
      no_unsafe_vision_labels: true,
    },
  };
}

function sanitizeGameContextForPublicState(context) {
  if (!context || typeof context !== "object" || Array.isArray(context)) return null;
  return {
    game_title: cleanPublicVisionMetadataText(context.game_title, 120, "unknown_game"),
    scene_summary: cleanPublicVisionMetadataText(
      context.scene_summary,
      500,
      "scene_summary_omitted"
    ),
    detected_events: Array.isArray(context.detected_events)
      ? context.detected_events
          .map((item) => cleanPublicVisionMetadataText(item, 80, ""))
          .filter(Boolean)
          .slice(0, 8)
      : [],
    player_state: cleanPublicVisionMetadataText(context.player_state, 220, ""),
    screen_confidence: safeNullableNumber(context.screen_confidence) ?? 0.5,
    vision_metadata: sanitizeVisionMetadataSummary(context.vision_metadata),
    boundary_policy: {
      no_raw_frames: true,
      no_frame_ids: true,
      no_frame_references: true,
      no_unsafe_vision_labels: true,
    },
  };
}

function cleanText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanPublicVisionMetadataText(value, maxLength = 160, fallback = "") {
  const text = cleanText(value, maxLength);
  if (!text) return fallback;
  if (UNSAFE_VISION_METADATA_SUMMARY_PATTERN.test(text)) return fallback;
  return text;
}

function safeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(4));
}

function safeNullableNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}
