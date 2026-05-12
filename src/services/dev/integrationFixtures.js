import {
  assertAdapterPacketSafe,
  createLive2dAdapterPacket,
  createSubtitleAdapterPacket,
  createTtsAdapterSourceStatusFallback,
  createTtsAdapterPacket,
  createTtsUnsupportedVoiceSafeError,
} from "../../adapters/adapterPackets.js";
import { ContractError } from "../../core/contracts.js";
import { createMotionCueFromEnvelope } from "../presence/motionCue.js";
import { createPerformancePlan } from "../presence/performancePlan.js";
import { createLanguageProfile } from "../voice/languageProfile.js";
import { createSpeechCueFromFinalOutput } from "../voice/speechCue.js";
import { createSpeechRateProfile } from "../voice/speechRateProfile.js";
import { createSubtitleCue } from "../voice/subtitleCue.js";
import { createOverlayDisplayEvent } from "../../server/overlayDisplayEvent.js";
import {
  assertObsBridgeSetupRequestSafe,
  createObsBridgeSetupRequest,
} from "../../server/obsBridgeSetup.js";

const FORBIDDEN_FIXTURE_FIELDS = new Set([
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
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "candidate",
  "candidates",
  "raw_audio",
  "raw_subtitle_payload",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "token",
  "secret",
  "password",
  "endpoint",
  "url",
]);
const INTEGRATION_FIXTURES_FIELDS = [
  "schema",
  "generated_at_ms",
  "fixture_policy",
  "adapter_packets",
  "local_engine_requests",
  "local_engine_response_examples",
  "obs_bridge_setup_request",
  "overlay_display_event",
  "safe_ack_examples",
  "boundary_policy",
  "adapter_validation_required",
];
const INTEGRATION_FIXTURE_POLICY_FIELDS = [
  "synthetic_payload_only",
  "not_from_live_viewer",
  "not_from_memory",
  "not_from_game_input",
  "no_secret_values",
];
const ROOT_BOUNDARY_POLICY_FIELDS = [
  "synthetic_examples_only",
  "no_live_payloads",
  "no_candidates",
  "no_commands",
  "read_only_fixture_manifest",
];
const LOCAL_ENGINE_REQUEST_BOUNDARY_POLICY_FIELDS = [
  "validated_local_bridge_job",
  "engine_internal_payload",
  "synthetic_fixture_only",
  "no_candidates",
  "no_commands",
  "no_endpoint_values",
  "no_secret_values",
  "engine_preferences_internal_only",
];

export function createIntegrationFixtures({ generatedAtMs = Date.now() } = {}) {
  const finalOutput = createFixtureFinalOutput();
  const envelope = finalOutput.phase15_continuity_envelope;
  const event = {
    trace_id: finalOutput.trace_id,
    event_id: finalOutput.event_id,
    source: "fixture",
    payload: {
      payload_kind: "comment",
      text: "IRIS bridge fixture voice check.",
    },
  };
  const speechCue = createSpeechCueFromFinalOutput(finalOutput);
  const languageProfile = createLanguageProfile({ event, finalOutput });
  const speechRateProfile = createSpeechRateProfile({
    event,
    finalOutput,
    speechCue,
    languageProfile,
  });
  const subtitleCue = createSubtitleCue({
    finalOutput,
    speechCue,
    languageProfile,
    speechRateProfile,
  });
  const motionCue = createMotionCueFromEnvelope(envelope);
  const performancePlan = createPerformancePlan({
    finalOutput,
    speechCue,
    motionCue,
    subtitleCue,
  });
  const ttsPacket = createTtsAdapterPacket(finalOutput, {
    speechCue,
    performancePlan,
    speechRateProfile,
    languageProfile,
    subtitleCue,
    ttsAdapterGuidance: {
      voice_hint: "fixture_iris_voice",
      model_hint: "fixture_tts_model",
      locale_hint: languageProfile.response_language,
      speech_rate_hint: speechRateProfile.base_rate,
      subtitle_hint: subtitleCue.subtitle_language,
    },
  });
  const live2dPacket = createLive2dAdapterPacket(envelope, {
    motionCue,
    performancePlan,
  });
  const subtitlePacket = createSubtitleAdapterPacket(finalOutput, {
    subtitleCue,
    languageProfile,
    speechRateProfile,
    performancePlan,
  });
  const overlayDisplayEvent = createOverlayDisplayEvent({
    status: "active",
    last_event_id: finalOutput.event_id,
    last_payload_kind: "comment",
    last_text: finalOutput.final_text,
    last_subtitle_cue: subtitleCue,
    last_speech_cue: speechCue,
    last_speech_rate_profile: speechRateProfile,
    last_language_profile: languageProfile,
    last_motion_cue: motionCue,
    last_performance_plan: performancePlan,
    updated_at_ms: generatedAtMs,
  }, { nowMs: generatedAtMs });
  const obsBridgeSetupRequest = createObsBridgeSetupRequest({
    origin: "http://127.0.0.1:8787",
    generatedAtMs,
  });

  const fixtures = {
    schema: "iris_integration_fixtures_v1",
    generated_at_ms: generatedAtMs,
    fixture_policy: {
      synthetic_payload_only: true,
      not_from_live_viewer: true,
      not_from_memory: true,
      not_from_game_input: true,
      no_secret_values: true,
    },
    adapter_packets: {
      tts: ttsPacket,
      live2d: live2dPacket,
      subtitle: subtitlePacket,
    },
    local_engine_requests: {
      tts: createFixtureTtsEngineRequest({
        finalOutput,
        speechCue,
        speechRateProfile,
        languageProfile,
        subtitleCue,
      }),
      live2d: createFixtureLive2dEngineRequest({
        finalOutput,
        live2dPacket,
        performancePlan,
      }),
    },
    local_engine_response_examples: createFixtureEngineResponses({
      speechCue,
      performancePlan,
    }),
    obs_bridge_setup_request: obsBridgeSetupRequest,
    overlay_display_event: overlayDisplayEvent,
    safe_ack_examples: {
      tts: {
        request_id: "fixture-tts-ack",
        bridge_status: "accepted",
        audio_url: "artifact://fixture/audio.wav",
        duration_ms: speechCue.estimated_duration_ms,
        sample_rate_hz: 48000,
        visemes: [],
      },
      live2d: {
        request_id: "fixture-live2d-ack",
        bridge_status: "accepted",
        duration_ms: performancePlan.total_duration_ms,
      },
      subtitle: {
        request_id: "fixture-subtitle-ack",
        bridge_status: "displayed",
        duration_ms: subtitleCue.display_end_ms,
      },
      obs_bridge: {
        request_id: "fixture-obs-setup-ack",
        bridge_status: "configured",
        configured: true,
      },
      game_control: {
        request_id: "fixture-game-control-ack",
        bridge_status: "accepted_fixture",
        executed: false,
        simulated: true,
        reason: "ack_shape_only_no_game_action",
      },
    },
    boundary_policy: {
      synthetic_examples_only: true,
      no_live_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_fixture_manifest: true,
    },
    adapter_validation_required: true,
  };
  assertIntegrationFixturesSafe(fixtures);
  return fixtures;
}

export function createVoiceSubtitlePublicStateFixture({ generatedAtMs = Date.now() } = {}) {
  const fixtures = createIntegrationFixtures({ generatedAtMs });
  const ttsPacket = fixtures.adapter_packets.tts;
  const publicState = {
    schema: "iris_voice_subtitle_public_state_fixture_v1",
    selected_language: ttsPacket.language_profile.response_language,
    subtitle_status: ttsPacket.subtitle_cue.subtitle_text ? "enabled" : "disabled",
    speech_rate_label: ttsPacket.speech_rate_profile.base_rate,
    boundary_policy: {
      public_voice_subtitle_labels_only: true,
      no_trace_or_event_ids: true,
      no_raw_subtitle_payload: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertVoiceSubtitlePublicStateFixtureSafe(publicState);
  return publicState;
}

export function assertVoiceSubtitlePublicStateFixtureSafe(
  publicState,
  context = "voice subtitle public state fixture"
) {
  assertFixtureObjectKeys(
    publicState,
    [
      "schema",
      "selected_language",
      "subtitle_status",
      "speech_rate_label",
      "boundary_policy",
      "adapter_validation_required",
    ],
    context
  );
  if (publicState.schema !== "iris_voice_subtitle_public_state_fixture_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["enabled", "disabled"].includes(publicState.subtitle_status)) {
    throw new ContractError(`${context}: invalid subtitle status`);
  }
  assertExactPolicyFields(
    publicState.boundary_policy,
    [
      "public_voice_subtitle_labels_only",
      "no_trace_or_event_ids",
      "no_raw_subtitle_payload",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  if (publicState.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  assertNoForbiddenFixtureFields(publicState, context);
}

export function createVoiceSubtitleUnsafeFieldFixture({ generatedAtMs = Date.now() } = {}) {
  const safePublicState = createVoiceSubtitlePublicStateFixture({ generatedAtMs });
  const unsafeCases = [
    ["endpoint", { endpoint: "https://tts.invalid" }],
    ["token", { token: "secret-token" }],
    ["raw_audio", { raw_audio: "base64-audio" }],
    ["raw_subtitle_payload", { raw_subtitle_payload: { text: "raw subtitle" } }],
    ["candidate", { candidate: { kind: "unsafe_voice_subtitle" } }],
  ];
  const results = unsafeCases.map(([field, payload]) => {
    let rejected = false;
    try {
      assertVoiceSubtitlePublicStateFixtureSafe({
        ...safePublicState,
        ...payload,
      });
    } catch (error) {
      if (!(error instanceof ContractError)) throw error;
      rejected = true;
    }
    if (!rejected) {
      throw new ContractError("voice subtitle unsafe field fixture: unsafe field accepted", {
        field,
      });
    }
    return { field, result: "reject" };
  });
  return {
    schema: "iris_voice_subtitle_unsafe_field_fixture_v1",
    checked_field_count: results.length,
    rejected_field_count: results.filter((result) => result.result === "reject").length,
    boundary_policy: {
      endpoint_values_rejected: true,
      token_values_rejected: true,
      audio_values_rejected: true,
      subtitle_payload_values_rejected: true,
      candidate_values_rejected: true,
      safe_fixture_labels_only: true,
    },
    adapter_validation_required: true,
  };
}

export function createVoiceSubtitleFallbackFixture() {
  const unsupportedVoice = createTtsUnsupportedVoiceSafeError();
  const sourceFallback = createTtsAdapterSourceStatusFallback({
    sourceVerified: false,
    sourceStatus: "licensed",
  });
  const fixture = {
    schema: "iris_voice_subtitle_fallback_fixture_v1",
    voice_status: unsupportedVoice.error_status,
    language_status: "unsupported_language_degraded",
    fallback_status: "placeholder",
    readiness_state: "attention_required",
    production_ready: false,
    voice_safe_code: unsupportedVoice.safe_code,
    source_handoff_status: sourceFallback.handoff_status,
    boundary_policy: {
      unsupported_voice_degrades: true,
      unsupported_language_degrades: true,
      placeholder_or_attention_only: true,
      not_production_ready: true,
      no_raw_voice_values: true,
      no_endpoint_values: true,
      no_tokens: true,
    },
    adapter_validation_required: true,
  };
  assertVoiceSubtitleFallbackFixtureSafe(fixture);
  return fixture;
}

export function assertVoiceSubtitleFallbackFixtureSafe(
  fixture,
  context = "voice subtitle fallback fixture"
) {
  assertFixtureObjectKeys(
    fixture,
    [
      "schema",
      "voice_status",
      "language_status",
      "fallback_status",
      "readiness_state",
      "production_ready",
      "voice_safe_code",
      "source_handoff_status",
      "boundary_policy",
      "adapter_validation_required",
    ],
    context
  );
  if (
    fixture.schema !== "iris_voice_subtitle_fallback_fixture_v1" ||
    fixture.voice_status !== "summary_only_error" ||
    fixture.language_status !== "unsupported_language_degraded" ||
    !["placeholder", "degraded", "operator_attention_required"].includes(fixture.fallback_status) ||
    fixture.readiness_state === "ready" ||
    fixture.production_ready !== false
  ) {
    throw new ContractError(`${context}: invalid fallback status`);
  }
  assertExactPolicyFields(
    fixture.boundary_policy,
    [
      "unsupported_voice_degrades",
      "unsupported_language_degrades",
      "placeholder_or_attention_only",
      "not_production_ready",
      "no_raw_voice_values",
      "no_endpoint_values",
      "no_tokens",
    ],
    `${context}: boundary policy`
  );
  if (fixture.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  assertNoForbiddenFixtureFields(fixture, context);
}

export function assertIntegrationFixturesSafe(fixtures, context = "integration fixtures") {
  if (!fixtures || typeof fixtures !== "object") {
    throw new ContractError(`${context}: missing fixtures`);
  }
  assertNoForbiddenFixtureFields(fixtures, context);
  if (fixtures.schema !== "iris_integration_fixtures_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: fixtures.schema });
  }
  assertFixtureObjectKeys(fixtures, INTEGRATION_FIXTURES_FIELDS, context);
  assertFixtureObjectKeys(
    fixtures.fixture_policy,
    INTEGRATION_FIXTURE_POLICY_FIELDS,
    `${context}: fixture policy`
  );
  if (fixtures.fixture_policy?.synthetic_payload_only !== true) {
    throw new ContractError(`${context}: fixtures must be synthetic only`);
  }
  for (const field of INTEGRATION_FIXTURE_POLICY_FIELDS) {
    if (fixtures.fixture_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid fixture policy`);
    }
  }
  assertFixtureObjectKeys(
    fixtures.adapter_packets,
    ["tts", "live2d", "subtitle"],
    `${context}: adapter packets`
  );
  for (const packet of Object.values(fixtures.adapter_packets)) {
    assertAdapterPacketSafe(packet, `${context} adapter packet`);
  }
  assertFixtureObjectKeys(
    fixtures.local_engine_requests,
    ["tts", "live2d"],
    `${context}: local engine requests`
  );
  assertLocalEngineFixtureRequestSafe(
    fixtures.local_engine_requests?.tts,
    `${context} TTS engine request`
  );
  assertLocalEngineFixtureRequestSafe(
    fixtures.local_engine_requests?.live2d,
    `${context} Live2D engine request`
  );
  assertObsBridgeSetupRequestSafe(
    fixtures.obs_bridge_setup_request,
    `${context} OBS bridge setup request`
  );
  assertFixtureEngineResponsesSafe(
    fixtures.local_engine_response_examples,
    `${context}: local engine response examples`
  );
  assertSafeAckExamplesSafe(
    fixtures.safe_ack_examples,
    `${context}: safe ack examples`
  );
  assertExactPolicyFields(
    fixtures.boundary_policy,
    ROOT_BOUNDARY_POLICY_FIELDS,
    `${context}: boundary policy`
  );
  if (fixtures.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

function assertFixtureObjectKeys(value, expectedKeys, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: object required`);
  }
  if (JSON.stringify(Object.keys(value)) !== JSON.stringify(expectedKeys)) {
    throw new ContractError(`${context}: invalid keys`);
  }
}

function assertFixtureEngineResponsesSafe(responses, context) {
  assertFixtureObjectKeys(
    responses,
    ["tts_audio_base64", "tts_audio_data_url", "live2d", "response_policy"],
    context
  );
  if (
    responses.tts_audio_base64?.audio_mime !== "audio/wav" ||
    responses.tts_audio_data_url?.audio_mime !== "audio/wav" ||
    typeof responses.tts_audio_data_url?.audio_data_url !== "string" ||
    !responses.tts_audio_data_url.audio_data_url.startsWith("data:audio/wav;base64,") ||
    responses.live2d?.cue?.schema !== "iris_live2d_fixture_cue_v1"
  ) {
    throw new ContractError(`${context}: invalid synthetic response example`);
  }
  for (const field of [
    "examples_are_synthetic_only",
    "do_not_echo_runtime_request",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ]) {
    if (responses.response_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid response policy`);
    }
  }
}

function assertSafeAckExamplesSafe(ackExamples, context) {
  assertFixtureObjectKeys(
    ackExamples,
    ["tts", "live2d", "subtitle", "obs_bridge", "game_control"],
    context
  );
  for (const [kind, ack] of Object.entries(ackExamples)) {
    if (!ack || typeof ack !== "object" || Array.isArray(ack)) {
      throw new ContractError(`${context}: invalid ${kind} ack`);
    }
    if (typeof ack.request_id !== "string" || typeof ack.bridge_status !== "string") {
      throw new ContractError(`${context}: invalid ${kind} ack shape`);
    }
  }
  if (
    ackExamples.obs_bridge.configured !== true ||
    ackExamples.game_control.executed !== false ||
    ackExamples.game_control.simulated !== true
  ) {
    throw new ContractError(`${context}: unsafe ack effect flags`);
  }
}

function createFixtureTtsEngineRequest({
  finalOutput,
  speechCue,
  speechRateProfile,
  languageProfile,
  subtitleCue,
}) {
  return {
    schema: "iris_local_tts_engine_request_v1",
    job_id: "fixture-tts-job",
    event_id: finalOutput.event_id,
    text: finalOutput.final_text,
    language: languageProfile.response_language,
    script_direction: subtitleCue.script_direction,
    prosody_style: speechCue.prosody_style,
    speech_rate: {
      base_rate: speechRateProfile.base_rate,
      min_rate: speechRateProfile.min_rate,
      max_rate: speechRateProfile.max_rate,
      rate_variation_plan: speechRateProfile.rate_variation_plan,
    },
    estimated_duration_ms: speechCue.estimated_duration_ms,
    mouth_timing: speechCue.mouth_cues,
    voice_expression: {
      expression_id: "fixture_warm_talk",
      breath_profile: speechCue.breath_profile ?? null,
      pause_points: speechCue.pause_points,
      subtitle_sync_required: true,
    },
    engine_preferences: {
      voice_id: "fixture_iris_voice",
      model: "fixture_tts_model",
      locale: languageProfile.response_language,
    },
    boundary_policy: {
      validated_local_bridge_job: true,
      engine_internal_payload: true,
      synthetic_fixture_only: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      engine_preferences_internal_only: true,
    },
    adapter_validation_required: true,
  };
}

function createFixtureLive2dEngineRequest({ finalOutput, live2dPacket, performancePlan }) {
  return {
    schema: "iris_local_live2d_engine_request_v1",
    job_id: "fixture-live2d-job",
    event_id: finalOutput.event_id,
    motion_style: live2dPacket.motion_cue?.motion_style ?? "talk",
    motion_intensity: live2dPacket.motion_cue?.motion_intensity ?? "medium",
    body_state_id: live2dPacket.body_continuity?.body_state_id ?? "fixture_body_warm_talk",
    camera_proximity_profile:
      live2dPacket.camera_proximity?.proximity_level ?? "fixture_camera_micro",
    expression_profile_id:
      live2dPacket.expression_profile?.expression_profile_id ?? "fixture_expression_warm",
    autonomous_state_id:
      live2dPacket.autonomous_expression?.autonomous_state_id ?? "fixture_autonomous_none",
    timing: {
      total_duration_ms: performancePlan.total_duration_ms,
      start_delay_ms: 0,
      sync_policy: performancePlan.sync_policy ?? "speech_motion_timeline",
    },
    tracks: performancePlan.tracks.motion,
    engine_preferences: {
      model_id: "fixture_iris_live2d_model",
      scene_id: "fixture_streaming_scene",
    },
    boundary_policy: {
      validated_local_bridge_job: true,
      engine_internal_payload: true,
      synthetic_fixture_only: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      engine_preferences_internal_only: true,
    },
    adapter_validation_required: true,
  };
}

function createFixtureEngineResponses({ speechCue, performancePlan }) {
  return {
    tts_audio_base64: {
      audio_base64: "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
      audio_mime: "audio/wav",
      duration_ms: speechCue.estimated_duration_ms,
      sample_rate_hz: 48000,
      visemes: [],
      bridge_status: "accepted_fixture",
    },
    tts_audio_data_url: {
      audio_data_url:
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
      audio_mime: "audio/wav",
      duration_ms: speechCue.estimated_duration_ms,
      sample_rate_hz: 48000,
      bridge_status: "accepted_fixture",
    },
    live2d: {
      cue: {
        schema: "iris_live2d_fixture_cue_v1",
        expression_profile_id: "fixture_expression_warm",
        motion_style: "talk",
        track_count: performancePlan.tracks?.motion?.length ?? 0,
      },
      duration_ms: performancePlan.total_duration_ms,
      bridge_status: "accepted_fixture",
    },
    response_policy: {
      examples_are_synthetic_only: true,
      do_not_echo_runtime_request: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
  };
}

function assertLocalEngineFixtureRequestSafe(request, context) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new ContractError(`${context}: missing request`);
  }
  if (
    ![
      "iris_local_tts_engine_request_v1",
      "iris_local_live2d_engine_request_v1",
    ].includes(request.schema)
  ) {
    throw new ContractError(`${context}: invalid schema`, { schema: request.schema });
  }
  if (request.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (request.schema === "iris_local_tts_engine_request_v1") {
    if (!Array.isArray(request.mouth_timing)) {
      throw new ContractError(`${context}: mouth timing is required`);
    }
    if (!Array.isArray(request.voice_expression?.pause_points)) {
      throw new ContractError(`${context}: pause points are required`);
    }
  }
  if (
    request.schema === "iris_local_live2d_engine_request_v1" &&
    !Array.isArray(request.tracks)
  ) {
    throw new ContractError(`${context}: Live2D tracks are required`);
  }
  assertExactPolicyFields(
    request.boundary_policy,
    LOCAL_ENGINE_REQUEST_BOUNDARY_POLICY_FIELDS,
    `${context}: boundary policy`
  );
}

function assertExactPolicyFields(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: policy required`);
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected policy field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: policy ${field} must be true`);
    }
  }
}

function createFixtureFinalOutput() {
  const affectSnapshot = {
    affect_label: "warm_fixture",
    energy: 0.48,
    amusement: 0.28,
    warmth: 0.72,
    last_trigger: "fixture",
  };
  return {
    trace_id: "fixture-trace",
    event_id: "fixture-event",
    final_text: "IRIS bridge fixture voice check.",
    final_decision: "allow",
    final_normalized_status: "safe",
    performance_cue: {
      style: "talk",
      intensity: "medium",
      adapter_validation_required: true,
    },
    affect_snapshot: affectSnapshot,
    phase15_continuity_envelope: {
      schema: "iris_phase04_approved_action_v1",
      trace_id: "fixture-trace",
      event_id: "fixture-event",
      handoff_route: "adapter",
      handoff_timestamp_status: "fresh",
      handoff_issued_at_ms: 0,
      handoff_expires_at_ms: 4102444800000,
      handoff_max_age_ms: 4102444800000,
      action_type: "SPEAK",
      target_presence_id: "viewer",
      tone: "friendly",
      emotion: "happy",
      character_tag: "IRIS",
      final_normalized_status: "safe",
      continuity_maintained: true,
      performance_cue: {
        style: "talk",
        intensity: "medium",
        adapter_validation_required: true,
      },
    },
  };
}

function assertNoForbiddenFixtureFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFixtureFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe fixture field`, { field, path });
    }
    assertNoForbiddenFixtureFields(child, context, `${path}.${field}`);
  }
}
