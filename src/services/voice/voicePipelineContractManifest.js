import { ContractError } from "../../core/contracts.js";

const MANIFEST_SCHEMA = "iris_voice_pipeline_contract_manifest_v1";
const PIPELINE_FIELDS = new Set([
  "schema",
  "pipeline_status",
  "required_components",
  "handoff_contract",
  "boundary_policy",
]);
const HANDOFF_CONTRACT_FIELDS = new Set([
  "voice_hint",
  "speech_rate_profile",
  "language_profile",
  "subtitle_cue",
  "mouth_cue",
]);
const COMPONENTS = [
  "voice_hint",
  "speech_rate_profile",
  "language_profile",
  "subtitle_cue",
  "mouth_cue",
];
const BOUNDARY_POLICY_FIELDS = new Set([
  "adapter_guidance_only",
  "no_canonical_enum_export",
  "no_command_fields",
  "safe_manifest_only",
]);
const CANONICAL_ENUM_FIELDS = new Set([
  "intent",
  "conversation_state",
  "action_type",
  "tone",
  "emotion",
  "character_tag",
  "task_type",
  "updated_store",
]);
const VOICE_PROFILE_FIELD_PATTERN =
  /^(?:language_profile|speech_rate_profile|voice_profile)$/;
const VOICE_SUPPORT_STATUS_FIELDS = new Set([
  "schema",
  "locale_status",
  "model_status",
  "voice_status",
  "pipeline_status",
  "ready",
  "boundary_policy",
]);
const VOICE_SUPPORT_BOUNDARY_FIELDS = new Set([
  "unsupported_not_ready",
  "degrade_or_operator_attention",
  "status_only",
  "no_raw_voice_value",
]);
const PRONUNCIATION_REPAIR_STATUS_FIELDS = new Set([
  "schema",
  "repair_status",
  "pronunciation_repair_required",
  "safe_reason",
  "boundary_policy",
]);
const PRONUNCIATION_REPAIR_BOUNDARY_FIELDS = new Set([
  "safe_status_only",
  "no_raw_phoneme_debug",
  "no_vendor_diagnostics",
  "no_raw_audio",
]);
const PRONUNCIATION_SAFE_REASONS = new Set([
  "none",
  "locale_mismatch",
  "dictionary_review",
  "adapter_attention_required",
]);
const SPEECH_TIMING_BOUNDARY_FIELDS = new Set([
  "bounded_timing_only",
  "reject_out_of_range",
  "no_raw_audio_body",
  "safe_timing_summary_only",
]);
const MOUTH_CUE_SUMMARY_FIELDS = new Set([
  "schema",
  "mouth_cue_status",
  "mouth_cue_count",
  "timing_status",
  "boundary_policy",
]);
const MOUTH_CUE_BOUNDARY_FIELDS = new Set([
  "timing_status_count_only",
  "no_raw_vendor_phoneme",
  "no_internal_model_path",
  "safe_summary_only",
]);
const SUBTITLE_SYNC_STATUS_FIELDS = new Set([
  "schema",
  "sync_status",
  "sync_source",
  "pipeline_status",
  "boundary_policy",
]);
const SUBTITLE_SYNC_BOUNDARY_FIELDS = new Set([
  "sync_source_required",
  "mismatch_degrades",
  "safe_status_only",
  "no_raw_cue_payload",
]);
const PUBLIC_STATE_FIELDS = new Set([
  "schema",
  "language",
  "subtitle_status",
  "speech_rate_label",
  "repair_status",
  "boundary_policy",
]);
const PUBLIC_STATE_BOUNDARY_FIELDS = new Set([
  "allowlisted_public_fields_only",
  "no_raw_cue",
  "no_voice_id_value",
  "no_token",
]);
const REGRESSION_PACK_FIELDS = new Set([
  "schema",
  "fixture_status",
  "fixture_count",
  "covered_fixtures",
  "boundary_policy",
]);
const REGRESSION_PACK_BOUNDARY_FIELDS = new Set([
  "supported_fixture_required",
  "unsupported_fixture_required",
  "raw_audio_reject_fixture_required",
  "token_reject_fixture_required",
  "canonical_pollution_reject_fixture_required",
]);
const COMPLETION_REVIEW_SUMMARY_FIELDS = new Set([
  "schema",
  "completion_status",
  "completion_review_label",
  "component_count",
  "completed_components",
  "residual_risk_label",
  "boundary_policy",
]);
const COMPLETION_REVIEW_BOUNDARY_FIELDS = new Set([
  "safe_summary_only",
  "no_raw_voice_material",
  "no_raw_cue_payload",
  "no_candidate_payload",
  "no_command_fields",
]);
const OPERATOR_ATTENTION_SUMMARY_FIELDS = new Set([
  "schema",
  "attention_status",
  "reason_labels",
  "safe_next_action",
  "boundary_policy",
]);
const E2E_SAFE_PACKET_FIELDS = new Set([
  "schema",
  "packet_status",
  "component_count",
  "guidance_components",
  "canonical_enum_exported",
  "adapter_guidance_only",
  "boundary_policy",
]);
const OPERATOR_ATTENTION_BOUNDARY_FIELDS = new Set([
  "safe_attention_summary_only",
  "no_raw_voice_value",
  "no_license_payload",
  "no_secret",
]);
const OPERATOR_ATTENTION_REASONS = new Set([
  "voice_unset",
  "rights_unverified",
  "placeholder_active",
]);
const E2E_SAFE_PACKET_BOUNDARY_FIELDS = new Set([
  "voice_hint_adapter_guidance_only",
  "speech_rate_profile_adapter_guidance_only",
  "language_profile_adapter_guidance_only",
  "subtitle_cue_adapter_guidance_only",
  "mouth_cue_adapter_guidance_only",
  "no_canonical_enum_export",
  "no_memory_or_relationship_write",
  "no_game_input",
  "no_commands",
]);
const REQUIRED_REGRESSION_FIXTURES = [
  "supported",
  "unsupported",
  "raw_audio_reject",
  "token_reject",
  "canonical_pollution_reject",
];
const SAFE_PUBLIC_TEXT_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;
const RAW_AUDIO_FIELD_PATTERN = /^(?:raw_audio|raw_audio_body|audio_body|generated_audio)$/;
const UNSAFE_MOUTH_CUE_FIELD_PATTERN =
  /^(?:raw_vendor_phoneme|vendor_phoneme|raw_phoneme|internal_model_path|model_path)$/;
const SAFE_SYNC_SOURCE_PATTERN = /^[A-Za-z0-9_.:-]{1,96}$/;
const MAX_SPEECH_TIMING_MS = 300000;

export function createVoicePipelineContractManifest() {
  const manifest = {
    schema: MANIFEST_SCHEMA,
    pipeline_status: "contract_manifest_ready",
    required_components: [...COMPONENTS],
    handoff_contract: {
      voice_hint: "safe_adapter_guidance",
      speech_rate_profile: "internal_voice_profile",
      language_profile: "internal_language_profile",
      subtitle_cue: "safe_display_cue",
      mouth_cue: "safe_timing_cue",
    },
    boundary_policy: {
      adapter_guidance_only: true,
      no_canonical_enum_export: true,
      no_command_fields: true,
      safe_manifest_only: true,
    },
  };
  assertVoicePipelineContractManifestSafe(manifest);
  return manifest;
}

export function createVoicePipelineE2ESafePacket({
  voiceHint = "safe_adapter_guidance",
  speechRateProfile = "internal_voice_profile",
  languageProfile = "internal_language_profile",
  subtitleCue = "safe_display_cue",
  mouthCue = "safe_timing_cue",
} = {}) {
  const packet = {
    schema: "iris_voice_pipeline_e2e_safe_packet_v1",
    packet_status: "safe_adapter_guidance",
    component_count: COMPONENTS.length,
    guidance_components: {
      voice_hint: safeGuidanceLabel(voiceHint, "safe_adapter_guidance"),
      speech_rate_profile: safeGuidanceLabel(
        speechRateProfile,
        "internal_voice_profile"
      ),
      language_profile: safeGuidanceLabel(languageProfile, "internal_language_profile"),
      subtitle_cue: safeGuidanceLabel(subtitleCue, "safe_display_cue"),
      mouth_cue: safeGuidanceLabel(mouthCue, "safe_timing_cue"),
    },
    canonical_enum_exported: false,
    adapter_guidance_only: true,
    boundary_policy: {
      voice_hint_adapter_guidance_only: true,
      speech_rate_profile_adapter_guidance_only: true,
      language_profile_adapter_guidance_only: true,
      subtitle_cue_adapter_guidance_only: true,
      mouth_cue_adapter_guidance_only: true,
      no_canonical_enum_export: true,
      no_memory_or_relationship_write: true,
      no_game_input: true,
      no_commands: true,
    },
  };
  assertVoicePipelineE2ESafePacketSafe(packet);
  return packet;
}

export function assertVoicePipelineE2ESafePacketSafe(
  packet,
  context = "voice pipeline E2E safe packet"
) {
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
    throw new ContractError(`${context}: packet required`);
  }
  for (const field of Object.keys(packet)) {
    if (!E2E_SAFE_PACKET_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected packet field`);
    }
  }
  if (
    packet.schema !== "iris_voice_pipeline_e2e_safe_packet_v1" ||
    packet.packet_status !== "safe_adapter_guidance" ||
    packet.component_count !== COMPONENTS.length ||
    packet.canonical_enum_exported !== false ||
    packet.adapter_guidance_only !== true
  ) {
    throw new ContractError(`${context}: invalid safe packet`);
  }
  assertVoicePipelineCanonicalFirewall(packet, context);
  assertHandoffContract(packet.guidance_components, context);
  for (const field of COMPONENTS) {
    if (!SAFE_PUBLIC_TEXT_PATTERN.test(packet.guidance_components[field])) {
      throw new ContractError(`${context}: unsafe guidance value`);
    }
  }
  assertE2ESafePacketBoundaryPolicy(packet.boundary_policy, context);
}

export function assertVoicePipelineContractManifestSafe(
  manifest,
  context = "voice pipeline contract manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest required`);
  }
  for (const field of Object.keys(manifest)) {
    if (!PIPELINE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`);
    }
  }
  if (manifest.schema !== MANIFEST_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (manifest.pipeline_status !== "contract_manifest_ready") {
    throw new ContractError(`${context}: invalid status`);
  }
  assertExactComponents(manifest.required_components, context);
  assertHandoffContract(manifest.handoff_contract, context);
  assertBoundaryPolicy(manifest.boundary_policy, context);
}

export function assertVoicePipelineCanonicalFirewall(
  payload,
  context = "voice pipeline canonical firewall"
) {
  assertNoVoiceProfileInCanonicalField(payload, context, new WeakSet());
}

export function createVoicePipelineSupportStatus({
  localeSupported = true,
  modelSupported = true,
  voiceSupported = true,
} = {}) {
  const unsupported =
    localeSupported !== true || modelSupported !== true || voiceSupported !== true;
  const status = {
    schema: "iris_voice_pipeline_support_status_v1",
    locale_status: localeSupported === true ? "supported" : "unsupported",
    model_status: modelSupported === true ? "supported" : "unsupported",
    voice_status: voiceSupported === true ? "supported" : "unsupported",
    pipeline_status: unsupported ? "operator_attention_required" : "supported",
    ready: !unsupported,
    boundary_policy: {
      unsupported_not_ready: true,
      degrade_or_operator_attention: true,
      status_only: true,
      no_raw_voice_value: true,
    },
  };
  assertVoicePipelineSupportStatusSafe(status);
  return status;
}

export function assertVoicePipelineSupportStatusSafe(
  status,
  context = "voice pipeline support status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status required`);
  }
  for (const field of Object.keys(status)) {
    if (!VOICE_SUPPORT_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`);
    }
  }
  if (status.schema !== "iris_voice_pipeline_support_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of ["locale_status", "model_status", "voice_status"]) {
    if (!["supported", "unsupported"].includes(status[field])) {
      throw new ContractError(`${context}: invalid support status`);
    }
  }
  const unsupported =
    status.locale_status === "unsupported" ||
    status.model_status === "unsupported" ||
    status.voice_status === "unsupported";
  if (unsupported && (status.ready !== false || status.pipeline_status === "supported")) {
    throw new ContractError(`${context}: unsupported voice pipeline must not be ready`);
  }
  if (!unsupported && (status.ready !== true || status.pipeline_status !== "supported")) {
    throw new ContractError(`${context}: supported voice pipeline status mismatch`);
  }
  if (!["supported", "degraded", "operator_attention_required"].includes(status.pipeline_status)) {
    throw new ContractError(`${context}: invalid pipeline status`);
  }
  assertVoiceSupportBoundaryPolicy(status.boundary_policy, context);
}

export function createVoicePipelinePronunciationRepairStatus({
  repairRequired = false,
  reason = "none",
} = {}) {
  const required = repairRequired === true;
  const status = {
    schema: "iris_voice_pipeline_pronunciation_repair_status_v1",
    repair_status: required ? "repair_required" : "ok",
    pronunciation_repair_required: required,
    safe_reason: required ? safePronunciationReason(reason) : "none",
    boundary_policy: {
      safe_status_only: true,
      no_raw_phoneme_debug: true,
      no_vendor_diagnostics: true,
      no_raw_audio: true,
    },
  };
  assertVoicePipelinePronunciationRepairStatusSafe(status);
  return status;
}

export function assertVoicePipelinePronunciationRepairStatusSafe(
  status,
  context = "voice pipeline pronunciation repair status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status required`);
  }
  for (const field of Object.keys(status)) {
    if (!PRONUNCIATION_REPAIR_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`);
    }
  }
  if (status.schema !== "iris_voice_pipeline_pronunciation_repair_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["ok", "repair_required"].includes(status.repair_status)) {
    throw new ContractError(`${context}: invalid repair status`);
  }
  if (typeof status.pronunciation_repair_required !== "boolean") {
    throw new ContractError(`${context}: repair required flag must be boolean`);
  }
  if (!PRONUNCIATION_SAFE_REASONS.has(status.safe_reason)) {
    throw new ContractError(`${context}: invalid safe reason`);
  }
  if (
    status.pronunciation_repair_required !==
    (status.repair_status === "repair_required")
  ) {
    throw new ContractError(`${context}: repair status mismatch`);
  }
  if (!status.pronunciation_repair_required && status.safe_reason !== "none") {
    throw new ContractError(`${context}: safe reason must be none when repair is not required`);
  }
  assertPronunciationRepairBoundaryPolicy(status.boundary_policy, context);
}

export function createVoicePipelineSpeechCueTimingSummary({
  speechCue,
} = {}) {
  assertVoicePipelineSpeechCueTimingSafe(speechCue);
  const mouthCueCount = Array.isArray(speechCue?.mouth_cues)
    ? speechCue.mouth_cues.length
    : 0;
  return {
    schema: "iris_voice_pipeline_speech_cue_timing_summary_v1",
    timing_status: "bounded",
    mouth_cue_count: mouthCueCount,
    boundary_policy: {
      bounded_timing_only: true,
      reject_out_of_range: true,
      no_raw_audio_body: true,
      safe_timing_summary_only: true,
    },
  };
}

export function assertVoicePipelineSpeechCueTimingSafe(
  speechCue,
  context = "voice pipeline speech cue timing"
) {
  if (!speechCue || typeof speechCue !== "object" || Array.isArray(speechCue)) {
    throw new ContractError(`${context}: speech cue required`);
  }
  assertNoRawAudioField(speechCue, context, new WeakSet());
  assertBoundedTimingValue(speechCue.estimated_duration_ms ?? 0, context);
  if (!Array.isArray(speechCue.mouth_cues)) {
    throw new ContractError(`${context}: mouth cues required`);
  }
  for (const cue of speechCue.mouth_cues) {
    if (!cue || typeof cue !== "object" || Array.isArray(cue)) {
      throw new ContractError(`${context}: mouth cue object required`);
    }
    assertBoundedTimingValue(cue.start_ms, context);
    assertBoundedTimingValue(cue.end_ms, context);
    if (cue.end_ms < cue.start_ms) {
      throw new ContractError(`${context}: mouth cue timing out of range`);
    }
  }
  assertSpeechTimingBoundaryPolicy(
    {
      bounded_timing_only: true,
      reject_out_of_range: true,
      no_raw_audio_body: true,
      safe_timing_summary_only: true,
    },
    context
  );
}

export function createVoicePipelineMouthCueSummary({ mouthCues = [] } = {}) {
  assertMouthCueListSafe(mouthCues);
  const summary = {
    schema: "iris_voice_pipeline_mouth_cue_summary_v1",
    mouth_cue_status: mouthCues.length > 0 ? "available" : "empty",
    mouth_cue_count: mouthCues.length,
    timing_status: "bounded",
    boundary_policy: {
      timing_status_count_only: true,
      no_raw_vendor_phoneme: true,
      no_internal_model_path: true,
      safe_summary_only: true,
    },
  };
  assertVoicePipelineMouthCueSummarySafe(summary);
  return summary;
}

export function assertVoicePipelineMouthCueSummarySafe(
  summary,
  context = "voice pipeline mouth cue summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (!MOUTH_CUE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (summary.schema !== "iris_voice_pipeline_mouth_cue_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["available", "empty"].includes(summary.mouth_cue_status)) {
    throw new ContractError(`${context}: invalid mouth cue status`);
  }
  if (
    !Number.isInteger(summary.mouth_cue_count) ||
    summary.mouth_cue_count < 0
  ) {
    throw new ContractError(`${context}: invalid mouth cue count`);
  }
  if (summary.mouth_cue_status === "empty" && summary.mouth_cue_count !== 0) {
    throw new ContractError(`${context}: mouth cue status mismatch`);
  }
  if (summary.mouth_cue_status === "available" && summary.mouth_cue_count === 0) {
    throw new ContractError(`${context}: mouth cue status mismatch`);
  }
  if (summary.timing_status !== "bounded") {
    throw new ContractError(`${context}: invalid timing status`);
  }
  assertMouthCueBoundaryPolicy(summary.boundary_policy, context);
}

export function createVoicePipelineSubtitleSyncStatus({
  speechCue,
  subtitleCue,
} = {}) {
  const speechSyncSource = safeSyncSource(speechCue?.sync_source);
  const subtitleSyncSource = safeSyncSource(subtitleCue?.sync_source);
  const synced = speechSyncSource !== null && speechSyncSource === subtitleSyncSource;
  const status = {
    schema: "iris_voice_pipeline_subtitle_sync_status_v1",
    sync_status: synced ? "synced" : "sync_degraded",
    sync_source: synced ? speechSyncSource : "degraded",
    pipeline_status: synced ? "supported" : "degraded",
    boundary_policy: {
      sync_source_required: true,
      mismatch_degrades: true,
      safe_status_only: true,
      no_raw_cue_payload: true,
    },
  };
  assertVoicePipelineSubtitleSyncStatusSafe(status);
  return status;
}

export function assertVoicePipelineSubtitleSyncStatusSafe(
  status,
  context = "voice pipeline subtitle sync status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status required`);
  }
  for (const field of Object.keys(status)) {
    if (!SUBTITLE_SYNC_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`);
    }
  }
  if (status.schema !== "iris_voice_pipeline_subtitle_sync_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["synced", "sync_degraded"].includes(status.sync_status)) {
    throw new ContractError(`${context}: invalid sync status`);
  }
  if (!SAFE_SYNC_SOURCE_PATTERN.test(status.sync_source)) {
    throw new ContractError(`${context}: invalid sync source`);
  }
  if (!["supported", "degraded"].includes(status.pipeline_status)) {
    throw new ContractError(`${context}: invalid pipeline status`);
  }
  if (status.sync_status === "sync_degraded" && status.pipeline_status !== "degraded") {
    throw new ContractError(`${context}: unsynced subtitles must degrade`);
  }
  assertSubtitleSyncBoundaryPolicy(status.boundary_policy, context);
}

export function createVoicePipelinePublicState({
  language = "unknown",
  subtitleStatus = "unknown",
  speechRateLabel = "unknown",
  repairStatus = "unknown",
} = {}) {
  const state = {
    schema: "iris_voice_pipeline_public_state_v1",
    language: safePublicText(language),
    subtitle_status: safePublicText(subtitleStatus),
    speech_rate_label: safePublicText(speechRateLabel),
    repair_status: safePublicText(repairStatus),
    boundary_policy: {
      allowlisted_public_fields_only: true,
      no_raw_cue: true,
      no_voice_id_value: true,
      no_token: true,
    },
  };
  assertVoicePipelinePublicStateSafe(state);
  return state;
}

export function assertVoicePipelinePublicStateSafe(
  state,
  context = "voice pipeline public state"
) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new ContractError(`${context}: state required`);
  }
  for (const field of Object.keys(state)) {
    if (!PUBLIC_STATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected public state field`);
    }
  }
  if (state.schema !== "iris_voice_pipeline_public_state_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of ["language", "subtitle_status", "speech_rate_label", "repair_status"]) {
    if (!SAFE_PUBLIC_TEXT_PATTERN.test(state[field]) || isUnsafePublicStateText(state[field])) {
      throw new ContractError(`${context}: invalid public state value`);
    }
  }
  assertPublicStateBoundaryPolicy(state.boundary_policy, context);
}

export function createVoicePipelineFixtureRegressionPack() {
  const pack = {
    schema: "iris_voice_pipeline_fixture_regression_pack_v1",
    fixture_status: "ready",
    fixture_count: REQUIRED_REGRESSION_FIXTURES.length,
    covered_fixtures: [...REQUIRED_REGRESSION_FIXTURES],
    boundary_policy: {
      supported_fixture_required: true,
      unsupported_fixture_required: true,
      raw_audio_reject_fixture_required: true,
      token_reject_fixture_required: true,
      canonical_pollution_reject_fixture_required: true,
    },
  };
  assertVoicePipelineFixtureRegressionPackSafe(pack);
  return pack;
}

export function assertVoicePipelineFixtureRegressionPackSafe(
  pack,
  context = "voice pipeline fixture regression pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  for (const field of Object.keys(pack)) {
    if (!REGRESSION_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (pack.schema !== "iris_voice_pipeline_fixture_regression_pack_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (pack.fixture_status !== "ready") {
    throw new ContractError(`${context}: invalid fixture status`);
  }
  assertExactRegressionFixtures(pack.covered_fixtures, context);
  if (pack.fixture_count !== REQUIRED_REGRESSION_FIXTURES.length) {
    throw new ContractError(`${context}: fixture count mismatch`);
  }
  assertRegressionPackBoundaryPolicy(pack.boundary_policy, context);
}

export function createVoicePipelineE2ECompletionReviewSummary({
  completionStatus = "ready_for_completion_review",
  residualRiskLabel = "none",
} = {}) {
  const summary = {
    schema: "iris_voice_pipeline_e2e_completion_review_summary_v1",
    completion_status: safeCompletionStatus(completionStatus),
    completion_review_label: "voice_subtitle_language_pipeline_e2e",
    component_count: 5,
    completed_components: [...COMPONENTS],
    residual_risk_label: safeCompletionRiskLabel(residualRiskLabel),
    boundary_policy: {
      safe_summary_only: true,
      no_raw_voice_material: true,
      no_raw_cue_payload: true,
      no_candidate_payload: true,
      no_command_fields: true,
    },
  };
  assertVoicePipelineE2ECompletionReviewSummarySafe(summary);
  return summary;
}

export function assertVoicePipelineE2ECompletionReviewSummarySafe(
  summary,
  context = "voice pipeline E2E completion review summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (!COMPLETION_REVIEW_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (
    summary.schema !== "iris_voice_pipeline_e2e_completion_review_summary_v1" ||
    summary.completion_review_label !== "voice_subtitle_language_pipeline_e2e" ||
    summary.component_count !== 5 ||
    !["ready_for_completion_review", "blocked"].includes(summary.completion_status)
  ) {
    throw new ContractError(`${context}: invalid completion summary`);
  }
  assertExactComponents(summary.completed_components, context);
  if (!SAFE_PUBLIC_TEXT_PATTERN.test(summary.residual_risk_label)) {
    throw new ContractError(`${context}: invalid residual risk label`);
  }
  assertCompletionReviewBoundaryPolicy(summary.boundary_policy, context);
  assertNoUnsafeCompletionReviewMaterial(summary, context, new WeakSet());
}

export function createVoicePipelineOperatorAttentionSummary({
  voiceConfigured = true,
  rightsVerified = true,
  placeholderActive = false,
} = {}) {
  const reasonLabels = [];
  if (voiceConfigured !== true) reasonLabels.push("voice_unset");
  if (rightsVerified !== true) reasonLabels.push("rights_unverified");
  if (placeholderActive === true) reasonLabels.push("placeholder_active");
  const summary = {
    schema: "iris_voice_pipeline_operator_attention_summary_v1",
    attention_status: reasonLabels.length > 0 ? "operator_attention_required" : "ok",
    reason_labels: reasonLabels,
    safe_next_action:
      reasonLabels.length > 0 ? "review_voice_pipeline_settings" : "none",
    boundary_policy: {
      safe_attention_summary_only: true,
      no_raw_voice_value: true,
      no_license_payload: true,
      no_secret: true,
    },
  };
  assertVoicePipelineOperatorAttentionSummarySafe(summary);
  return summary;
}

export function assertVoicePipelineOperatorAttentionSummarySafe(
  summary,
  context = "voice pipeline operator attention summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (!OPERATOR_ATTENTION_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (summary.schema !== "iris_voice_pipeline_operator_attention_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["ok", "operator_attention_required"].includes(summary.attention_status)) {
    throw new ContractError(`${context}: invalid attention status`);
  }
  if (!Array.isArray(summary.reason_labels)) {
    throw new ContractError(`${context}: reason labels required`);
  }
  for (const reason of summary.reason_labels) {
    if (!OPERATOR_ATTENTION_REASONS.has(reason)) {
      throw new ContractError(`${context}: invalid reason label`);
    }
  }
  if (
    summary.attention_status === "ok" &&
    (summary.reason_labels.length !== 0 || summary.safe_next_action !== "none")
  ) {
    throw new ContractError(`${context}: ok summary must not request attention`);
  }
  if (
    summary.attention_status === "operator_attention_required" &&
    (summary.reason_labels.length === 0 ||
      summary.safe_next_action !== "review_voice_pipeline_settings")
  ) {
    throw new ContractError(`${context}: attention summary mismatch`);
  }
  assertOperatorAttentionBoundaryPolicy(summary.boundary_policy, context);
}

function assertExactComponents(components, context) {
  if (!Array.isArray(components) || components.length !== COMPONENTS.length) {
    throw new ContractError(`${context}: required components mismatch`);
  }
  for (let index = 0; index < COMPONENTS.length; index += 1) {
    if (components[index] !== COMPONENTS[index]) {
      throw new ContractError(`${context}: required components mismatch`);
    }
  }
}

function assertHandoffContract(contract, context) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: handoff contract required`);
  }
  for (const field of Object.keys(contract)) {
    if (!HANDOFF_CONTRACT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected handoff field`);
    }
  }
  for (const field of HANDOFF_CONTRACT_FIELDS) {
    if (typeof contract[field] !== "string" || contract[field].trim() === "") {
      throw new ContractError(`${context}: handoff contract value required`);
    }
  }
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!BOUNDARY_POLICY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy required`);
    }
  }
}

function assertVoiceSupportBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!VOICE_SUPPORT_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of VOICE_SUPPORT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy required`);
    }
  }
}

function assertPronunciationRepairBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!PRONUNCIATION_REPAIR_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of PRONUNCIATION_REPAIR_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy required`);
    }
  }
}

function assertSpeechTimingBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!SPEECH_TIMING_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of SPEECH_TIMING_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy required`);
    }
  }
}

function assertMouthCueBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!MOUTH_CUE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of MOUTH_CUE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy required`);
    }
  }
}

function assertSubtitleSyncBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!SUBTITLE_SYNC_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of SUBTITLE_SYNC_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy required`);
    }
  }
}

function assertPublicStateBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!PUBLIC_STATE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of PUBLIC_STATE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy required`);
    }
  }
}

function assertRegressionPackBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REGRESSION_PACK_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of REGRESSION_PACK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy required`);
    }
  }
}

function assertCompletionReviewBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!COMPLETION_REVIEW_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of COMPLETION_REVIEW_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy required`);
    }
  }
}

function assertOperatorAttentionBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!OPERATOR_ATTENTION_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of OPERATOR_ATTENTION_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy required`);
    }
  }
}

function assertE2ESafePacketBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!E2E_SAFE_PACKET_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of E2E_SAFE_PACKET_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy required`);
    }
  }
}

function safeGuidanceLabel(value, fallback) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]/g, "_")
    .slice(0, 64);
  if (
    !SAFE_PUBLIC_TEXT_PATTERN.test(normalized) ||
    /(^|[_.:-])(canonical|command|candidate|memory|relationship|game_input|endpoint|token|secret|raw)($|[_.:-])/i.test(
      normalized
    )
  ) {
    return fallback;
  }
  return normalized;
}

function assertExactRegressionFixtures(fixtures, context) {
  if (
    !Array.isArray(fixtures) ||
    fixtures.length !== REQUIRED_REGRESSION_FIXTURES.length
  ) {
    throw new ContractError(`${context}: fixture list mismatch`);
  }
  for (let index = 0; index < REQUIRED_REGRESSION_FIXTURES.length; index += 1) {
    if (fixtures[index] !== REQUIRED_REGRESSION_FIXTURES[index]) {
      throw new ContractError(`${context}: fixture list mismatch`);
    }
  }
}

function assertNoVoiceProfileInCanonicalField(value, context, seen) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  if (!Array.isArray(value)) {
    for (const [field, nested] of Object.entries(value)) {
      if (CANONICAL_ENUM_FIELDS.has(field) && containsVoiceProfileField(nested, new WeakSet())) {
        throw new ContractError(`${context}: voice profile must not enter canonical enum field`, {
          field,
        });
      }
      assertNoVoiceProfileInCanonicalField(nested, context, seen);
    }
    return;
  }

  for (const nested of value) {
    assertNoVoiceProfileInCanonicalField(nested, context, seen);
  }
}

function containsVoiceProfileField(value, seen) {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.some((item) => containsVoiceProfileField(item, seen));
  }

  for (const [field, nested] of Object.entries(value)) {
    if (VOICE_PROFILE_FIELD_PATTERN.test(field)) return true;
    if (containsVoiceProfileField(nested, seen)) return true;
  }
  return false;
}

function safePronunciationReason(reason) {
  const normalized = String(reason ?? "").trim().toLowerCase();
  return PRONUNCIATION_SAFE_REASONS.has(normalized)
    ? normalized
    : "adapter_attention_required";
}

function assertNoRawAudioField(value, context, seen) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoRawAudioField(item, context, seen);
    }
    return;
  }
  for (const [field, nested] of Object.entries(value)) {
    if (RAW_AUDIO_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: raw audio body is forbidden`, { field });
    }
    assertNoRawAudioField(nested, context, seen);
  }
}

function assertMouthCueListSafe(mouthCues, context = "voice pipeline mouth cue summary") {
  if (!Array.isArray(mouthCues)) {
    throw new ContractError(`${context}: mouth cues must be an array`);
  }
  for (const cue of mouthCues) {
    if (!cue || typeof cue !== "object" || Array.isArray(cue)) {
      throw new ContractError(`${context}: mouth cue object required`);
    }
    assertNoUnsafeMouthCueField(cue, context, new WeakSet());
    assertBoundedTimingValue(cue.start_ms, context);
    assertBoundedTimingValue(cue.end_ms, context);
    if (cue.end_ms < cue.start_ms) {
      throw new ContractError(`${context}: mouth cue timing out of range`);
    }
  }
}

function assertNoUnsafeMouthCueField(value, context, seen) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoUnsafeMouthCueField(item, context, seen);
    }
    return;
  }
  for (const [field, nested] of Object.entries(value)) {
    if (UNSAFE_MOUTH_CUE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unsafe mouth cue field`, { field });
    }
    assertNoUnsafeMouthCueField(nested, context, seen);
  }
}

function assertBoundedTimingValue(value, context) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_SPEECH_TIMING_MS
  ) {
    throw new ContractError(`${context}: timing out of range`);
  }
}

function safeSyncSource(value) {
  const source = String(value ?? "").trim();
  return SAFE_SYNC_SOURCE_PATTERN.test(source) ? source : null;
}

function safePublicText(value) {
  const text = String(value ?? "").trim();
  return SAFE_PUBLIC_TEXT_PATTERN.test(text) && !isUnsafePublicStateText(text)
    ? text
    : "unknown";
}

function safeCompletionStatus(value) {
  return value === "blocked" ? "blocked" : "ready_for_completion_review";
}

function safeCompletionRiskLabel(value) {
  const label = String(value ?? "none").trim();
  return SAFE_PUBLIC_TEXT_PATTERN.test(label) && !isUnsafePublicStateText(label)
    ? label
    : "attention_required";
}

function assertNoUnsafeCompletionReviewMaterial(value, context, seen) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => assertNoUnsafeCompletionReviewMaterial(item, context, seen));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (
      typeof child === "string" &&
      /(?:raw[_ -]?(?:voice|audio|cue|payload)|candidate|command|token|endpoint|secret|voice_sample|dataset_path|model_path)/iu.test(
        child
      )
    ) {
      throw new ContractError(`${context}: unsafe completion review value`);
    }
    assertNoUnsafeCompletionReviewMaterial(child, context, seen);
  }
}

function isUnsafePublicStateText(value) {
  return /(?:^|[_.:-])(?:raw|token|secret|endpoint|candidate|command|memory|relationship|voice_id_value|raw_audio|raw_cue)(?:$|[_.:-])/iu.test(
    String(value ?? "")
  );
}
