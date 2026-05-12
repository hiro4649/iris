import { ContractError } from "../core/contracts.js";

const FORBIDDEN_OVERLAY_STATUS_FIELDS = new Set([
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
  "relationship_update_candidate",
  "raw_memory",
  "raw_memories",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "selected_memory_ids",
  "last_event_id",
  "event_id",
  "trace_id",
  "final_text",
  "last_text",
  "text",
  "action_type",
  "intent",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "internal_relationship_stage",
  "relation_score",
  "relationship_score",
  "hidden_rank",
  "hidden_relationship_rank",
  "endpoint",
  "endpoint_url",
  "api_key",
  "token",
  "command",
  "command_payload",
]);
const EXPECTED_OVERLAY_ARTIFACT_KINDS = Object.freeze({
  tts: new Set(["audio_wav", "audio_mp3", "audio_mpeg", "audio_mp4", "audio_m4a", "audio_aac", "audio_flac", "audio_ogg", "audio_opus", "audio_webm"]),
  live2d: new Set(["live2d_cue", "live2d_cue_json", "live2d_engine_cue", "live2d_engine_cue_json", "application_json"]),
  subtitle: new Set(["subtitle_vtt", "subtitle_webvtt", "subtitle_srt", "text_vtt", "text_webvtt", "text_srt", "application_x_subrip"]),
});

export function createOverlayStatus(state, { nowMs = Date.now() } = {}) {
  const classHints = buildClassHints(state);
  const requestedNowMs = safeTimestampMs(nowMs);
  const generatedAtMs = Math.floor(
    Number.isFinite(requestedNowMs) && requestedNowMs >= 0 ? requestedNowMs : Date.now()
  );
  const updatedAtMs = safeTimestampMs(state?.updated_at_ms);
  const rawAgeMs = Number.isFinite(updatedAtMs) && updatedAtMs >= 0 ? generatedAtMs - updatedAtMs : NaN;
  const ageMs = Number.isFinite(rawAgeMs) && rawAgeMs >= 0 ? Math.floor(rawAgeMs) : 15_001;
  const lastText = safeVisibleTextField(state?.last_text);
  const hasLastText = lastText != null;
  const subtitleText = safeVisibleTextField(state?.last_subtitle_cue?.subtitle_text);
  const subtitleVisible = subtitleText != null;
  const visibleText = hasLastText ? lastText : subtitleVisible ? subtitleText : null;
  const visible =
    hasLastText ||
    subtitleVisible ||
    isRenderedArtifactAvailable(state?.last_subtitle_adapter_summary, "subtitle") ||
    isRenderedArtifactAvailable(state?.last_live2d_adapter_summary, "live2d") ||
    isRenderedArtifactAvailable(state?.last_tts_adapter_summary, "tts");
  const hasEventId = safeEventId(state?.last_event_id) != null;
  const hasFreshEvent = hasEventId && ageMs <= 15_000;
  const tongueTwisterMode = state?.last_tongue_twister_mode ?? null;
  const tongueTwisterEnabled = safeBooleanField(tongueTwisterMode?.enabled);
  const tongueTwisterAttemptMs = safeDurationMs(tongueTwisterMode?.max_attempt_duration_ms ?? 0);
  const tongueTwisterPhraseLength = safeDurationMs(tongueTwisterMode?.phrase_length ?? 0);
  const visionFrameAgeMs = safeDurationMs(state?.last_vision_metadata_summary?.frame_age_ms);
  const visionUiFocusCount = safeDurationMs(state?.last_vision_metadata_summary?.ui_focus_count);
  const status = {
    schema: "iris_overlay_status_v1",
    generated_at_ms: generatedAtMs,
    overlay_ready: hasFreshEvent && visible,
    health: !hasEventId
      ? "empty"
      : ageMs > 15_000
      ? "stale"
      : "fresh",
    last_payload_kind: safeStringField(state?.last_payload_kind),
    visibility_state: visible ? "visible" : "hidden",
    text_length: visible && visibleText != null ? [...String(visibleText)].length : 0,
    subtitle_visible: subtitleVisible,
    subtitle_language: safeStringField(state?.last_subtitle_cue?.subtitle_language),
    vision_source_kind: safeStringField(state?.last_vision_metadata_summary?.source_kind),
    vision_frame_age_ms: Number.isFinite(visionFrameAgeMs) && visionFrameAgeMs >= 0 ? visionFrameAgeMs : null,
    vision_ui_focus_count: Number.isFinite(visionUiFocusCount) && visionUiFocusCount >= 0
      ? Math.floor(visionUiFocusCount)
      : null,
    vision_raw_frame_available: safeBooleanField(
      state?.last_vision_metadata_summary?.raw_frame_available
    ),
    speech_rate_label: safeStringField(state?.last_speech_rate_profile?.base_rate),
    speech_rate_repair_status: safeStringField(
      state?.last_speech_rate_profile?.slow_speech_guard?.guard_status
    ),
    subtitle_sync_status: safeStringField(state?.last_subtitle_cue?.reading_speed_guard?.guard_status),
    tongue_twister_enabled: tongueTwisterEnabled,
    tongue_twister_language: tongueTwisterEnabled ? safeStringField(tongueTwisterMode.language) : null,
    tongue_twister_phrase_length: tongueTwisterEnabled
      ? Math.floor(Number.isFinite(tongueTwisterPhraseLength) ? tongueTwisterPhraseLength : 0)
      : 0,
    tongue_twister_attempt_ms: tongueTwisterEnabled
      ? Number.isFinite(tongueTwisterAttemptMs) && tongueTwisterAttemptMs >= 0
        ? tongueTwisterAttemptMs
        : 0
      : 0,
    tts_bridge_status: safeBridgeStatus(state?.last_tts_adapter_summary),
    tts_artifact_available: isRenderedArtifactAvailable(state?.last_tts_adapter_summary, "tts"),
    tts_artifact_kind: safeArtifactKind(state?.last_tts_adapter_summary, "tts"),
    tts_duration_ms: safeAdapterDurationMs(state?.last_tts_adapter_summary),
    live2d_bridge_status: safeBridgeStatus(state?.last_live2d_adapter_summary),
    live2d_artifact_available: isRenderedArtifactAvailable(state?.last_live2d_adapter_summary, "live2d"),
    live2d_artifact_kind: safeArtifactKind(state?.last_live2d_adapter_summary, "live2d"),
    live2d_duration_ms: safeAdapterDurationMs(state?.last_live2d_adapter_summary),
    subtitle_bridge_status: safeBridgeStatus(state?.last_subtitle_adapter_summary),
    subtitle_artifact_available: isRenderedArtifactAvailable(state?.last_subtitle_adapter_summary, "subtitle"),
    subtitle_artifact_kind: safeArtifactKind(state?.last_subtitle_adapter_summary, "subtitle"),
    subtitle_duration_ms: safeAdapterDurationMs(state?.last_subtitle_adapter_summary),
    planned_visible_ms: computePlannedVisibleMs(state),
    class_hints: classHints,
    state_age_ms: ageMs,
    boundary_policy: {
      no_raw_text: true,
      no_candidates: true,
      no_commands: true,
      read_only_overlay_status: true,
    },
    adapter_validation_required: true,
  };
  assertOverlayStatusSafe(status);
  return status;
}

function isRenderedArtifactAvailable(summary, adapterKind) {
  if (!summary || typeof summary !== "object") return false;
  const bridgeStatus = normalizeStatusToken(summary.bridge_status);
  if (
    !safeAdapterOk(summary) ||
    [
      "failed",
      "rejected",
      "error",
      "not_rendered",
      "outbox_not_configured",
      "artifact_unavailable",
    ].includes(bridgeStatus) ||
    ["aborted", "rendered_aborted"].includes(bridgeStatus) ||
    ["blank", "rendered_blank"].includes(bridgeStatus) ||
    ["blocked", "rendered_blocked"].includes(bridgeStatus) ||
    ["cancelled", "rendered_cancelled"].includes(bridgeStatus) ||
    ["canceled", "rendered_canceled"].includes(bridgeStatus) ||
    ["corrupt", "rendered_corrupt"].includes(bridgeStatus) ||
    ["deferred", "rendered_deferred"].includes(bridgeStatus) ||
    ["denied", "rendered_denied"].includes(bridgeStatus) ||
    ["disabled", "rendered_disabled"].includes(bridgeStatus) ||
    ["disconnected", "rendered_disconnected"].includes(bridgeStatus) ||
    ["draft", "rendered_draft"].includes(bridgeStatus) ||
    ["empty", "rendered_empty"].includes(bridgeStatus) ||
    ["expired", "rendered_expired"].includes(bridgeStatus) ||
    ["failed", "rendered_failed"].includes(bridgeStatus) ||
    ["failure", "rendered_failure"].includes(bridgeStatus) ||
    ["forbidden", "rendered_forbidden"].includes(bridgeStatus) ||
    ["error", "rendered_error"].includes(bridgeStatus) ||
    ["hidden", "rendered_hidden"].includes(bridgeStatus) ||
    ["incomplete", "rendered_incomplete"].includes(bridgeStatus) ||
    ["in_progress", "rendered_in_progress"].includes(bridgeStatus) ||
    ["interrupted", "rendered_interrupted"].includes(bridgeStatus) ||
    ["invalid", "rendered_invalid"].includes(bridgeStatus) ||
    ["rejected", "rendered_rejected"].includes(bridgeStatus) ||
    ["refused", "rendered_refused"].includes(bridgeStatus) ||
    ["malformed", "rendered_malformed"].includes(bridgeStatus) ||
    ["missing", "rendered_missing"].includes(bridgeStatus) ||
    ["muted", "rendered_muted"].includes(bridgeStatus) ||
    ["n_a", "na", "rendered_n_a", "rendered_na"].includes(bridgeStatus) ||
    ["no_access", "rendered_no_access"].includes(bridgeStatus) ||
    ["no_api_key", "rendered_no_api_key"].includes(bridgeStatus) ||
    ["no_artifact", "rendered_no_artifact"].includes(bridgeStatus) ||
    ["no_content", "rendered_no_content"].includes(bridgeStatus) ||
    ["no_credentials", "rendered_no_credentials"].includes(bridgeStatus) ||
    ["no_data", "rendered_no_data"].includes(bridgeStatus) ||
    ["no_endpoint", "rendered_no_endpoint"].includes(bridgeStatus) ||
    ["no_file", "rendered_no_file"].includes(bridgeStatus) ||
    ["no_key", "rendered_no_key"].includes(bridgeStatus) ||
    ["no_output", "rendered_no_output"].includes(bridgeStatus) ||
    ["no_permission", "rendered_no_permission"].includes(bridgeStatus) ||
    ["no_speech", "rendered_no_speech"].includes(bridgeStatus) ||
    ["no_voice", "rendered_no_voice"].includes(bridgeStatus) ||
    ["not_allowed", "rendered_not_allowed"].includes(bridgeStatus) ||
    ["not_applicable", "rendered_not_applicable"].includes(bridgeStatus) ||
    ["not_available", "rendered_not_available"].includes(bridgeStatus) ||
    ["not_configured", "rendered_not_configured"].includes(bridgeStatus) ||
    ["not_complete", "rendered_not_complete"].includes(bridgeStatus) ||
    ["not_done", "rendered_not_done"].includes(bridgeStatus) ||
    ["not_found", "rendered_not_found"].includes(bridgeStatus) ||
    ["not_permitted", "rendered_not_permitted"].includes(bridgeStatus) ||
    ["not_ready", "rendered_not_ready"].includes(bridgeStatus) ||
    ["not_rendered", "rendered_not_rendered"].includes(bridgeStatus) ||
    ["not_started", "rendered_not_started"].includes(bridgeStatus) ||
    ["null", "rendered_null"].includes(bridgeStatus) ||
    ["none", "rendered_none"].includes(bridgeStatus) ||
    ["obsolete", "rendered_obsolete"].includes(bridgeStatus) ||
    ["offline", "rendered_offline"].includes(bridgeStatus) ||
    ["outbox_not_configured", "rendered_outbox_not_configured"].includes(bridgeStatus) ||
    ["partial", "rendered_partial"].includes(bridgeStatus) ||
    ["pending", "rendered_pending"].includes(bridgeStatus) ||
    ["processing", "rendered_processing"].includes(bridgeStatus) ||
    ["provisional", "rendered_provisional"].includes(bridgeStatus) ||
    ["quota_exceeded", "rendered_quota_exceeded"].includes(bridgeStatus) ||
    ["queued", "rendered_queued"].includes(bridgeStatus) ||
    ["rate_limited", "rendered_rate_limited"].includes(bridgeStatus) ||
    ["silent", "rendered_silent"].includes(bridgeStatus) ||
    ["skipped", "rendered_skipped"].includes(bridgeStatus) ||
    ["stale", "rendered_stale"].includes(bridgeStatus) ||
    ["suppressed", "rendered_suppressed"].includes(bridgeStatus) ||
    ["throttled", "rendered_throttled"].includes(bridgeStatus) ||
    ["timeout", "rendered_timeout"].includes(bridgeStatus) ||
    ["too_large", "rendered_too_large"].includes(bridgeStatus) ||
    ["too_small", "rendered_too_small"].includes(bridgeStatus) ||
    ["unauthorized", "rendered_unauthorized"].includes(bridgeStatus) ||
    ["undefined", "rendered_undefined"].includes(bridgeStatus) ||
    ["unknown", "rendered_unknown"].includes(bridgeStatus) ||
    ["unavailable", "artifact_unavailable", "rendered_unavailable"].includes(bridgeStatus) ||
    ["unhealthy", "rendered_unhealthy"].includes(bridgeStatus) ||
    ["unsupported", "rendered_unsupported"].includes(bridgeStatus) ||
    ["unverified", "rendered_unverified"].includes(bridgeStatus) ||
    ["waiting", "rendered_waiting"].includes(bridgeStatus) ||
    ["zero_bytes", "rendered_zero_bytes"].includes(bridgeStatus) ||
    ["zero_length", "rendered_zero_length"].includes(bridgeStatus)
  ) {
    return false;
  }
  if (
    ![
      "",
      "rendered",
      "displayed",
      "available",
      "ready",
      "ok",
      "success",
      "succeeded",
      "true",
      "1",
      "complete",
      "completed",
      "done",
      "artifact_available",
      "artifact_complete",
      "artifact_completed",
      "artifact_displayed",
      "artifact_done",
      "artifact_ok",
      "artifact_rendered",
      "artifact_ready",
      "artifact_success",
      "artifact_succeeded",
    ].includes(bridgeStatus) &&
    !bridgeStatus.startsWith("rendered_") &&
    !bridgeStatus.startsWith("displayed_") &&
    !bridgeStatus.startsWith("ready_") &&
    !bridgeStatus.startsWith("available_") &&
    !bridgeStatus.startsWith("complete_") &&
    !bridgeStatus.startsWith("completed_") &&
    !bridgeStatus.startsWith("done_") &&
    !bridgeStatus.startsWith("ok_") &&
    !bridgeStatus.startsWith("success_") &&
    !bridgeStatus.startsWith("succeeded_") &&
    !bridgeStatus.startsWith("artifact_available_") &&
    !bridgeStatus.startsWith("artifact_ready_") &&
    !bridgeStatus.startsWith("artifact_complete_") &&
    !bridgeStatus.startsWith("artifact_completed_") &&
    !bridgeStatus.startsWith("artifact_displayed_") &&
    !bridgeStatus.startsWith("artifact_done_") &&
    !bridgeStatus.startsWith("artifact_ok_") &&
    !bridgeStatus.startsWith("artifact_rendered_") &&
    !bridgeStatus.startsWith("artifact_success_") &&
    !bridgeStatus.startsWith("artifact_succeeded_")
  ) {
    return false;
  }
  const artifactKind = normalizeArtifactKind(
    summary.artifact_kind ?? summary.artifact_url,
    adapterKind
  );
  return EXPECTED_OVERLAY_ARTIFACT_KINDS[adapterKind]?.has(artifactKind) === true;
}

function safeAdapterDurationMs(summary) {
  if (!summary || !safeAdapterOk(summary)) return null;
  const number = safeDurationMs(summary.duration_ms);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
}

function safeAdapterOk(summary) {
  if (safeBooleanField(summary?.ok)) return true;
  if (summary?.ok != null && !["string", "number", "boolean"].includes(typeof summary.ok)) {
    return false;
  }
  const okStatus = normalizeStatusToken(summary?.ok);
  if (
    okStatus.endsWith("_abandoned") ||
    okStatus.endsWith("_aborted") ||
    okStatus.endsWith("_archived") ||
    okStatus.endsWith("_failed") ||
    okStatus.endsWith("_failure") ||
    okStatus.endsWith("_error") ||
    okStatus.endsWith("_rejected") ||
    okStatus.endsWith("_deferred") ||
    okStatus.endsWith("_deleted") ||
    okStatus.endsWith("_denied") ||
    okStatus.endsWith("_denylisted") ||
    okStatus.endsWith("_detached") ||
    okStatus.endsWith("_disabled") ||
    okStatus.endsWith("_disconnected") ||
    okStatus.endsWith("_discarded") ||
    okStatus.endsWith("_blank") ||
    okStatus.endsWith("_compromised") ||
    okStatus.endsWith("_contaminated") ||
    okStatus.endsWith("_corrupt") ||
    okStatus.endsWith("_draft") ||
    okStatus.endsWith("_empty") ||
    okStatus.endsWith("_expired") ||
    okStatus.endsWith("_evicted") ||
    okStatus.endsWith("_flagged") ||
    okStatus.endsWith("_forbidden") ||
    okStatus.endsWith("_blocked") ||
    okStatus.endsWith("_blocklisted") ||
    okStatus.endsWith("_hidden") ||
    okStatus.endsWith("_incomplete") ||
    okStatus.endsWith("_invalid") ||
    okStatus.endsWith("_invalidated") ||
    okStatus.endsWith("_in_progress") ||
    okStatus.endsWith("_interrupted") ||
    okStatus.endsWith("_isolated") ||
    okStatus.endsWith("_malformed") ||
    okStatus.endsWith("_mismatch") ||
    okStatus.endsWith("_muted") ||
    okStatus.endsWith("_timeout") ||
    okStatus.endsWith("_tampered") ||
    okStatus.endsWith("_throttled") ||
    okStatus.endsWith("_too_large") ||
    okStatus.endsWith("_too_small") ||
    okStatus.endsWith("_not_allowed") ||
    okStatus.endsWith("_not_applicable") ||
    okStatus.endsWith("_not_complete") ||
    okStatus.endsWith("_not_configured") ||
    okStatus.endsWith("_not_done") ||
    okStatus.endsWith("_not_permitted") ||
    okStatus.endsWith("_not_ready") ||
    okStatus.endsWith("_not_available") ||
    okStatus.endsWith("_not_found") ||
    okStatus.endsWith("_no_access") ||
    okStatus.endsWith("_no_api_key") ||
    okStatus.endsWith("_no_artifact") ||
    okStatus.endsWith("_no_content") ||
    okStatus.endsWith("_no_credentials") ||
    okStatus.endsWith("_no_data") ||
    okStatus.endsWith("_no_endpoint") ||
    okStatus.endsWith("_no_file") ||
    okStatus.endsWith("_no_key") ||
    okStatus.endsWith("_no_output") ||
    okStatus.endsWith("_no_permission") ||
    okStatus.endsWith("_no_speech") ||
    okStatus.endsWith("_no_voice") ||
    okStatus.endsWith("_obsolete") ||
    okStatus.endsWith("_offline") ||
    okStatus.endsWith("_partial") ||
    okStatus.endsWith("_pending") ||
    okStatus.endsWith("_poisoned") ||
    okStatus.endsWith("_policy_violation") ||
    okStatus.endsWith("_processing") ||
    okStatus.endsWith("_provisional") ||
    okStatus.endsWith("_quota_exceeded") ||
    okStatus.endsWith("_queued") ||
    okStatus.endsWith("_quarantined") ||
    okStatus.endsWith("_rate_limited") ||
    okStatus.endsWith("_refused") ||
    okStatus.endsWith("_removed") ||
    okStatus.endsWith("_revoked") ||
    okStatus.endsWith("_silent") ||
    okStatus.endsWith("_skipped") ||
    okStatus.endsWith("_stale") ||
    okStatus.endsWith("_suppressed") ||
    okStatus.endsWith("_unaccepted") ||
    okStatus.endsWith("_unallowlisted") ||
    okStatus.endsWith("_unauthorized") ||
    okStatus.endsWith("_unapproved") ||
    okStatus.endsWith("_uncommitted") ||
    okStatus.endsWith("_unconfirmed") ||
    okStatus.endsWith("_unavailable") ||
    okStatus.endsWith("_unhealthy") ||
    okStatus.endsWith("_unloaded") ||
    okStatus.endsWith("_undisplayed") ||
    okStatus.endsWith("_ungenerated") ||
    okStatus.endsWith("_unrendered") ||
    okStatus.endsWith("_unready") ||
    okStatus.endsWith("_unreachable") ||
    okStatus.endsWith("_unpublished") ||
    okStatus.endsWith("_unsigned") ||
    okStatus.endsWith("_unsafe") ||
    okStatus.endsWith("_unsupported") ||
    okStatus.endsWith("_untrusted") ||
    okStatus.endsWith("_unverified") ||
    okStatus.endsWith("_unknown") ||
    okStatus.endsWith("_waiting") ||
    okStatus.endsWith("_zero_bytes") ||
    okStatus.endsWith("_zero_length") ||
    okStatus.endsWith("_cancelled") ||
    okStatus.endsWith("_canceled") ||
    okStatus.endsWith("_missing")
  ) {
    return false;
  }
  return (
    ["ok", "success", "succeeded", "complete", "completed", "done", "ready", "available", "rendered", "displayed", "artifact_available", "artifact_ready", "artifact_rendered", "artifact_displayed", "artifact_done", "artifact_complete", "artifact_completed", "artifact_success", "artifact_succeeded", "artifact_ok", "artifact_warning", "warning", "artifact_present", "artifact_loaded", "artifact_seen"].includes(okStatus) ||
    okStatus.startsWith("artifact_ok_") ||
    okStatus.startsWith("artifact_ready_") ||
    okStatus.startsWith("artifact_available_") ||
    okStatus.startsWith("artifact_rendered_") ||
    okStatus.startsWith("artifact_displayed_") ||
    okStatus.startsWith("artifact_done_") ||
    okStatus.startsWith("artifact_complete_") ||
    okStatus.startsWith("artifact_completed_") ||
    okStatus.startsWith("artifact_success_") ||
    okStatus.startsWith("artifact_succeeded_") ||
    okStatus.startsWith("artifact_present_") ||
    okStatus.startsWith("artifact_loaded_") ||
    okStatus.startsWith("artifact_seen_")
  );
}

function safeBridgeStatus(summary) {
  const rawBridgeStatus = summary?.bridge_status;
  if (
    rawBridgeStatus != null &&
    !["string", "number", "boolean"].includes(typeof rawBridgeStatus)
  ) {
    return null;
  }
  const bridgeStatus = normalizeStatusToken(rawBridgeStatus);
  return bridgeStatus || null;
}

function safeTextField(value) {
  if (value != null && !["string", "number", "boolean"].includes(typeof value)) return null;
  const text = String(value ?? "").trim();
  return text || null;
}

function safeStringField(value) {
  if (value != null && typeof value !== "string") return null;
  const text = String(value ?? "").trim();
  if (text === "0") return null;
  if (text.toLowerCase() === "null") return null;
  if (text.toLowerCase() === "undefined") return null;
  if (text.toLowerCase() === "none") return null;
  if (["n/a", "na"].includes(text.toLowerCase())) return null;
  return text || null;
}

function safeVisibleTextField(value) {
  if (value != null && typeof value !== "string") return null;
  const text = String(value ?? "").trim();
  if (text.toLowerCase() === "null") return null;
  if (text.toLowerCase() === "undefined") return null;
  if (text.toLowerCase() === "none") return null;
  if (["n/a", "na"].includes(text.toLowerCase())) return null;
  return text || null;
}

function safeEventId(value) {
  if (value != null && !["string", "number"].includes(typeof value)) return null;
  if (typeof value === "number" && (!Number.isFinite(value) || value <= 0)) return null;
  const text = String(value ?? "").trim();
  if (text === "0") return null;
  if (text.toLowerCase() === "null") return null;
  if (text.toLowerCase() === "undefined") return null;
  if (text.toLowerCase() === "none") return null;
  if (["n/a", "na"].includes(text.toLowerCase())) return null;
  return text || null;
}

function safeTimestampMs(value) {
  if (value != null && !["string", "number"].includes(typeof value)) return NaN;
  if (typeof value === "string" && value.trim() === "") return NaN;
  const number = Number(value);
  if (Number.isFinite(number)) return number;
  return typeof value === "string" ? Date.parse(value) : NaN;
}

function safeBooleanField(value) {
  if (value === true || value === false) return value;
  if (value === 1) return true;
  if (value === 0) return false;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (text === "1") return true;
    if (text === "0") return false;
    if (text === "true") return true;
    if (text === "false") return false;
    if (text === "yes") return true;
    if (text === "no") return false;
    if (text === "on") return true;
    if (text === "off") return false;
    if (text === "enabled") return true;
    if (text === "disabled") return false;
    if (text === "available") return true;
    if (text === "unavailable") return false;
    if (text === "present") return true;
    if (text === "absent") return false;
    if (text === "ready") return true;
    if (text === "not_ready") return false;
    if (text === "loaded") return true;
    if (text === "unloaded") return false;
    if (text === "seen") return true;
    if (text === "missing") return false;
  }
  return false;
}

function safeArtifactKind(summary, adapterKind) {
  if (!isRenderedArtifactAvailable(summary, adapterKind)) return null;
  const artifactKind = normalizeArtifactKind(
    summary?.artifact_kind ?? summary?.artifact_url,
    adapterKind
  );
  return artifactKind || null;
}

function normalizeArtifactKind(value, adapterKind) {
  const rawKind = String(value ?? "").split(";", 1)[0];
  const token = normalizeStatusToken(rawKind).replace(/^audio_x_/u, "audio_");
  const textToken = token.replace(/^_+|_+$/gu, "").replace(/^text_x_/u, "text_");
  const extensionToken = normalizeStatusToken(rawKind.split(".").pop()).replace(/^_+|_+$/gu, "");
  if (adapterKind === "tts" && extensionToken === "aac") return "audio_aac";
  if (adapterKind === "tts" && extensionToken === "flac") return "audio_flac";
  if (adapterKind === "tts" && extensionToken === "m4a") return "audio_m4a";
  if (adapterKind === "tts" && extensionToken === "mpeg") return "audio_mpeg";
  if (adapterKind === "tts" && extensionToken === "mp3") return "audio_mp3";
  if (adapterKind === "tts" && extensionToken === "mp4") return "audio_mp4";
  if (adapterKind === "tts" && extensionToken === "ogg") return "audio_ogg";
  if (adapterKind === "tts" && extensionToken === "opus") return "audio_opus";
  if (adapterKind === "tts" && extensionToken === "wav") return "audio_wav";
  if (adapterKind === "tts" && extensionToken === "webm") return "audio_webm";
  if (adapterKind === "tts" && textToken === "audio_mpeg3") return "audio_mp3";
  if (adapterKind === "tts" && textToken === "audio_mpg") return "audio_mp3";
  if (adapterKind === "tts" && textToken === "application_mp4") return "audio_mp4";
  if (adapterKind === "tts" && textToken === "application_ogg") return "audio_ogg";
  if (adapterKind === "tts" && textToken === "application_webm") return "audio_webm";
  if (adapterKind === "tts" && textToken === "audio_pn_wav") return "audio_wav";
  if (adapterKind === "tts" && textToken === "audio_vnd_wave") return "audio_wav";
  if (adapterKind === "tts" && textToken === "audio_wave") return "audio_wav";
  if (
    adapterKind === "live2d" &&
    (textToken === "application_json" ||
      textToken === "application_live2d_json" ||
      textToken === "application_vnd_iris_live2d_json" ||
      textToken === "cue_json" ||
      textToken === "json" ||
      textToken === "live2d_json")
  ) {
    return "live2d_cue_json";
  }
  if (adapterKind === "live2d" && textToken === "cue") return "live2d_cue";
  if (adapterKind === "live2d" && textToken === "application_live2d_cue") return "live2d_cue";
  if (adapterKind === "live2d" && textToken === "application_vnd_iris_live2d_cue") {
    return "live2d_cue";
  }
  if (adapterKind === "live2d" && textToken === "application_live2d_engine_cue") {
    return "live2d_engine_cue";
  }
  if (adapterKind === "live2d" && textToken === "application_vnd_iris_live2d_engine_cue") {
    return "live2d_engine_cue";
  }
  if (adapterKind === "live2d" && textToken === "application_live2d_engine_cue_json") {
    return "live2d_engine_cue_json";
  }
  if (adapterKind === "live2d" && textToken === "application_vnd_iris_live2d_engine_cue_json") {
    return "live2d_engine_cue_json";
  }
  if (adapterKind === "live2d" && textToken === "engine_cue") return "live2d_engine_cue";
  if (adapterKind === "live2d" && textToken === "engine_cue_json") return "live2d_engine_cue_json";
  if (textToken === "srt") return "subtitle_srt";
  if (textToken === "vtt") return "text_vtt";
  if (textToken === "application_srt") return "subtitle_srt";
  if (textToken === "application_subrip") return "subtitle_srt";
  if (textToken === "application_x_srt") return "subtitle_srt";
  if (textToken === "application_vtt") return "text_vtt";
  if (textToken === "application_webvtt") return "text_webvtt";
  if (textToken === "application_x_webvtt") return "text_webvtt";
  return textToken === "application_x_subrip" ? "subtitle_srt" : textToken;
}

export function assertOverlayStatusSafe(status, context = "overlay status") {
  if (!status || typeof status !== "object") {
    throw new ContractError(`${context}: missing status`);
  }
  assertNoForbiddenOverlayStatusFields(status, context);
  if (status.schema !== "iris_overlay_status_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: status.schema });
  }
  if (typeof status.overlay_ready !== "boolean") {
    throw new ContractError(`${context}: overlay_ready must be boolean`);
  }
  if (!["fresh", "stale", "empty"].includes(status.health)) {
    throw new ContractError(`${context}: invalid health`, { health: status.health });
  }
  if (!["visible", "hidden"].includes(status.visibility_state)) {
    throw new ContractError(`${context}: invalid visibility state`, {
      visibility_state: status.visibility_state,
    });
  }
  if (typeof status.subtitle_visible !== "boolean") {
    throw new ContractError(`${context}: subtitle_visible must be boolean`);
  }
  if (typeof status.vision_raw_frame_available !== "boolean") {
    throw new ContractError(`${context}: vision_raw_frame_available must be boolean`);
  }
  if (typeof status.tongue_twister_enabled !== "boolean") {
    throw new ContractError(`${context}: tongue_twister_enabled must be boolean`);
  }
  if (typeof status.tongue_twister_phrase_length !== "number") {
    throw new ContractError(`${context}: tongue_twister_phrase_length must be numeric`);
  }
  if (typeof status.tongue_twister_attempt_ms !== "number") {
    throw new ContractError(`${context}: tongue_twister_attempt_ms must be numeric`);
  }
  if (typeof status.tts_artifact_available !== "boolean") {
    throw new ContractError(`${context}: tts_artifact_available must be boolean`);
  }
  if (typeof status.live2d_artifact_available !== "boolean") {
    throw new ContractError(`${context}: live2d_artifact_available must be boolean`);
  }
  if (typeof status.subtitle_artifact_available !== "boolean") {
    throw new ContractError(`${context}: subtitle_artifact_available must be boolean`);
  }
  assertBoundaryPolicy(status.boundary_policy, [
    "no_raw_text",
    "no_candidates",
    "no_commands",
    "read_only_overlay_status",
  ], context);
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary flag ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary flag required ${field}`);
    }
  }
}

function buildClassHints(state) {
  const hints = [];
  const expressionProfileId = normalizeHintToken(state?.last_expression_profile?.expression_profile_id);
  const motionStyle = normalizeHintToken(state?.last_motion_cue?.motion_style);
  const bodyStateId = normalizeHintToken(state?.last_body_continuity?.body_state_id);
  const rawProximity = normalizeHintToken(state?.last_camera_proximity?.proximity_level ?? "neutral");
  const proximity = /[a-z0-9]/u.test(rawProximity) ? rawProximity : "neutral";
  const rawAutonomousState = normalizeHintToken(state?.last_autonomous_expression?.autonomous_state_id);
  const autonomousState = /[a-z0-9]/u.test(rawAutonomousState) ? rawAutonomousState : "";

  if (
    expressionProfileId.includes("laugh") ||
    motionStyle === "laugh_big" ||
    bodyStateId === "body_burst_laugh_recovery"
  ) {
    hints.push("big_laugh");
  }
  if (
    expressionProfileId === "expression_game_focus" ||
    expressionProfileId === "expression_game_tension" ||
    motionStyle === "focused_talk" ||
    bodyStateId === "body_screen_focus_talk"
  ) {
    hints.push("focused_talk");
  }
  if (
    expressionProfileId === "expression_steady_talk" ||
    expressionProfileId === "expression_idle_breath" ||
    motionStyle === "talk" ||
    bodyStateId === "body_soft_talk"
  ) {
    hints.push("soft_motion");
  }
  if (proximity !== "neutral") hints.push(`camera_${proximity}`);
  if (autonomousState && autonomousState !== "quiet_presence") {
    hints.push(`autonomous_${autonomousState}`);
  }
  if (safeBooleanField(state?.last_tongue_twister_mode?.enabled)) hints.push("tongue_twister");
  return hints;
}

function normalizeHintToken(value) {
  if (value != null && typeof value !== "string") return "";
  const token = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
  return ["0", "null", "undefined", "none", "n_a", "na"].includes(token) ? "" : token;
}

function normalizeStatusToken(value) {
  const token = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
  return /[a-z0-9]/u.test(token) ? token : "";
}

function computePlannedVisibleMs(state) {
  const rawPlannedDuration = safeDurationMs(state?.last_performance_plan?.total_duration_ms);
  const rawEstimatedDuration = safeDurationMs(state?.last_speech_cue?.estimated_duration_ms);
  const plannedDuration =
    Number.isFinite(rawPlannedDuration) && rawPlannedDuration >= 0
      ? rawPlannedDuration
      : Number.isFinite(rawEstimatedDuration) && rawEstimatedDuration >= 0
      ? rawEstimatedDuration
      : 4200;
  const rawRhythmSilence = safeDurationMs(
    state?.last_turn_rhythm?.response_timing_plan?.post_response_silence_ms
  );
  const rhythmSilence = Number.isFinite(rawRhythmSilence) && rawRhythmSilence >= 0 ? rawRhythmSilence : 900;
  return Math.floor(Math.min(14000, Math.max(2200, Math.min(14000, plannedDuration)) + rhythmSilence));
}

function safeDurationMs(value) {
  if (value != null && !["string", "number"].includes(typeof value)) return NaN;
  if (typeof value === "string" && value.trim() === "") return NaN;
  return Number(value);
}

function assertNoForbiddenOverlayStatusFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenOverlayStatusFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_OVERLAY_STATUS_FIELDS.has(normalizeOverlayStatusField(field))) {
      throw new ContractError(`${context}: overlay status must not expose raw state`, {
        field,
        path,
      });
    }
    assertNoForbiddenOverlayStatusFields(child, context, `${path}.${field}`);
  }
}

function normalizeOverlayStatusField(field) {
  return String(field ?? "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .toLowerCase();
}
