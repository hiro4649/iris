import {
  assertIntegrationStatusSafe,
  createIntegrationStatus,
} from "./integrationStatus.js";
import {
  assertProductionConfigDoctorSafe,
  createProductionConfigDoctor,
} from "./productionConfigDoctor.js";
import "../../config/loadIrisEnv.js";
import { ContractError } from "../../core/contracts.js";
import {
  assertLocalBridgeEngineStatusSafe,
  DEFAULT_LIVE_BRIDGE_WORKER_MAX_JOB_AGE_MS,
  createLocalBridgeEngineWorker,
} from "../../server/localBridgeEngineWorker.js";
import {
  assertLocalBridgeRenderManifestOperatorReportSafe,
  createLocalBridgeRenderManifestOperatorReport,
} from "../../server/localBridgeRenderManifestReport.js";
import {
  assertObsOverlayConfigSafe,
  createObsOverlayConfigFromEnv,
} from "../../server/obsOverlayConfig.js";
import { ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES } from "./adminCharacterVoiceSettings.js";

const FOUNDATION_INTEGRATIONS = new Set([
  "tts_bridge",
  "live2d_bridge",
  "subtitle_bridge",
  "obs_bridge",
  "local_bridge_engine_worker",
]);
const FOUNDATION_DOCTOR_INTEGRATIONS = new Set([
  "validated_runtime_bridge_handoff",
  "real_tts_engine",
  "real_live2d_bridge",
  "production_obs_overlay",
]);
const FOUNDATION_READINESS_STATUSES = new Set([
  "ready_for_runtime_handoff",
  "attention_required",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const ATTENTION_REASONS = new Set([
  "runtime_http_adapters_not_configured",
  "local_bridge_storage_not_configured",
  "real_tts_engine_not_configured",
  "original_voice_source_status_attention",
  "real_live2d_engine_not_configured",
  "obs_browser_source_not_configured",
  "local_target_policy_attention",
]);
const ORIGINAL_VOICE_SOURCE_STATUSES = new Set([
  "not_configured",
  "licensed",
  "placeholder",
  "operator_attention_required",
]);
const FORBIDDEN_FOUNDATION_STATUS_FIELDS = new Set([
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
  "canonical",
  "canonical_envelope",
  "final_text",
  "text",
  "subtitle_text",
  "raw_voice",
  "raw_voice_sample",
  "raw_audio",
  "voice_sample",
  "dataset_path",
  "internal_model_path",
  "model_path",
  "raw_packet",
  "job_payload",
  "endpoint",
  "url",
  "audio_url",
  "artifact_url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "value",
  "payload",
]);
const URL_PATTERN = /https?:\/\//i;

const FOUNDATION_STATUS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "foundation_readiness_status",
  "next_readiness_state",
  "readiness_state_counts",
  "foundation_summary",
  "foundation_integrations",
  "foundation_checks",
  "local_bridge_engine_status",
  "render_manifest_operator_report",
  "obs_browser_source_status",
  "boundary_policy",
  "adapter_validation_required",
]);

const FOUNDATION_SUMMARY_FIELDS = new Set([
  "schema",
  "runtime_http_adapters_configured",
  "local_bridge_storage_configured",
  "render_manifest_stale_guard_configured",
  "render_artifact_sync_guard_configured",
  "real_tts_engine_configured",
  "original_voice_profile_configured",
  "original_voice_style_profile_configured",
  "licensed_voice_source_status_configured",
  "voice_license_use_category_count",
  "voice_license_use_category_configured_count",
  "voice_license_use_category_missing_count",
  "original_voice_source_status",
  "original_voice_engine_preferences_configured",
  "real_live2d_engine_configured",
  "obs_browser_source_configured",
  "obs_setup_bridge_configured",
  "obs_setup_bridge_health_configured",
  "local_target_policy_attention",
  "local_bridge_worker_readiness_status",
  "tts_adapter_readiness_status",
  "live2d_adapter_readiness_status",
  "subtitle_adapter_readiness_status",
  "render_manifest_store_configured",
  "latest_render_manifest_available",
  "obs_handoff_readiness_status",
  "http_origin_configured",
  "attention_reasons",
  "attention_reason_count",
  "next_attention_reason",
  "next_readiness_state",
  "readiness_state_counts",
  "boundary_policy",
]);
const VOICE_LICENSE_USE_CATEGORY_ENV_NAMES =
  ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES;

const OBS_BROWSER_SOURCE_STATUS_FIELDS = new Set([
  "schema",
  "obs_setup_bridge_configured",
  "origin_configured",
  "source_name_configured",
  "scene_name_configured",
  "source_dimensions_configured",
  "width",
  "height",
  "fps",
  "shutdown_source_when_not_visible",
  "refresh_browser_when_scene_becomes_active",
  "overlay_paths",
  "local_bridge_handoff_paths",
  "required_adapter_kinds",
  "boundary_policy",
  "adapter_validation_required",
]);

export function createFoundationStatusReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const integrationStatus = createIntegrationStatus({ env, generatedAtMs });
  const doctor = createProductionConfigDoctor({ env, generatedAtMs });
  assertIntegrationStatusSafe(integrationStatus, "foundation status integration input");
  assertProductionConfigDoctorSafe(doctor, "foundation status doctor input");

  const foundationIntegrations = integrationStatus.integrations.filter((item) =>
    FOUNDATION_INTEGRATIONS.has(item.integration)
  );
  const foundationChecks = doctor.checks.filter((item) =>
    FOUNDATION_DOCTOR_INTEGRATIONS.has(item.integration)
  );
  const localBridgeEngineStatus = createFoundationLocalBridgeEngineStatus({
    env,
    generatedAtMs,
  });
  const renderManifestReport = createLocalBridgeRenderManifestOperatorReport({
    artifactDir: env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR || "data/local_bridge_artifacts",
    showLocalPaths: false,
    maxManifestAgeMs: env.IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS ?? null,
    maxArtifactRenderSkewMs:
      env.IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS ?? null,
    nowMs: generatedAtMs,
  });
  const obsBrowserSourceStatus = createObsBrowserSourceStatus({ env });

  const foundationSummary = createFoundationStatusSummary({
    env,
    foundationIntegrations,
    foundationChecks,
    localBridgeEngineStatus,
    renderManifestReport,
    obsBrowserSourceStatus,
  });
  const publicLocalBridgeEngineStatus = {
    ...localBridgeEngineStatus,
    event_render_manifests: {
      ...localBridgeEngineStatus.event_render_manifests,
      latest_manifest_id: undefined,
    },
  };
  const publicRenderManifestReport = {
    ...renderManifestReport,
    store_status: renderManifestReport.store_status
      ? {
          ...renderManifestReport.store_status,
          latest_manifest_id: undefined,
        }
      : renderManifestReport.store_status,
    latest_manifest_summary: renderManifestReport.latest_manifest_summary
      ? (({
          manifest_id,
          event_id,
          artifact_byte_hash_by_adapter,
          ...summary
        }) => summary)(renderManifestReport.latest_manifest_summary)
      : renderManifestReport.latest_manifest_summary,
  };
  const report = {
    schema: "iris_foundation_status_report_v1",
    generated_at_ms: generatedAtMs,
    foundation_readiness_status:
      foundationSummary.attention_reason_count === 0
        ? "ready_for_runtime_handoff"
        : "attention_required",
    next_readiness_state: foundationSummary.next_readiness_state,
    readiness_state_counts: foundationSummary.readiness_state_counts,
    foundation_summary: foundationSummary,
    foundation_integrations: foundationIntegrations,
    foundation_checks: foundationChecks,
    local_bridge_engine_status: publicLocalBridgeEngineStatus,
    render_manifest_operator_report: publicRenderManifestReport,
    obs_browser_source_status: obsBrowserSourceStatus,
    boundary_policy: {
      no_secret_values: true,
      no_endpoint_values: true,
      no_raw_packets: true,
      no_job_payloads: true,
      no_text_payloads: true,
      no_artifact_paths: true,
      no_candidates: true,
      no_commands: true,
      read_only_status: true,
      no_engine_calls: true,
      no_obs_setup_side_effects: true,
    },
    adapter_validation_required: true,
  };
  assertFoundationStatusReportSafe(report);
  return report;
}

export function assertFoundationStatusReportSafe(
  report,
  context = "foundation status report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenFoundationStatusFields(report, context);
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_foundation_status_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!FOUNDATION_STATUS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated time`);
  }
  if (!FOUNDATION_READINESS_STATUSES.has(report.foundation_readiness_status)) {
    throw new ContractError(`${context}: invalid readiness status`);
  }
  assertSafeReadinessState(report.next_readiness_state, context);
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  if (
    report.next_readiness_state !== report.foundation_summary.next_readiness_state ||
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      report.foundation_summary.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: readiness state summary mismatch`);
  }
  assertFoundationSummarySafe(report.foundation_summary, context);
  assertFoundationIntegrationListSafe(report.foundation_integrations, context);
  assertFoundationCheckListSafe(report.foundation_checks, context);
  assertLocalBridgeEngineStatusSafe(
    report.local_bridge_engine_status,
    `${context}: local bridge engine`
  );
  assertLocalBridgeRenderManifestOperatorReportSafe(
    report.render_manifest_operator_report,
    `${context}: render manifest`
  );
  assertObsBrowserSourceStatusSafe(report.obs_browser_source_status, context);
  assertBoundaryPolicy(
    report.boundary_policy,
    [
      "no_secret_values",
      "no_endpoint_values",
      "no_raw_packets",
      "no_job_payloads",
      "no_text_payloads",
      "no_artifact_paths",
      "no_candidates",
      "no_commands",
      "read_only_status",
      "no_engine_calls",
      "no_obs_setup_side_effects",
    ],
    `${context}: boundary policy`
  );
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!requiredFields.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field`, { field });
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function createFoundationLocalBridgeEngineStatus({ env, generatedAtMs }) {
  const outboxDir = env.IRIS_LOCAL_BRIDGE_OUTBOX_DIR || "data/local_bridge_outbox";
  const artifactDir = env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR || "data/local_bridge_artifacts";
  const bridgeHost = env.IRIS_LOCAL_BRIDGE_HOST || "127.0.0.1";
  const bridgePort = env.IRIS_LOCAL_BRIDGE_PORT || "8790";
  const worker = createLocalBridgeEngineWorker({
    outboxDir,
    artifactDir,
    nowMs: () => generatedAtMs,
    ttsEngineEndpoint: normalizeLocalEngineEndpoint({
      endpoint: env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT,
      bridgeHost,
      bridgePort,
      adapterPath: "/tts",
    }),
    ttsEngineApiKey: env.IRIS_LOCAL_TTS_ENGINE_API_KEY ?? "",
    ttsEngineVoiceId: env.IRIS_LOCAL_TTS_ENGINE_VOICE_ID ?? "",
    ttsEngineModel: env.IRIS_LOCAL_TTS_ENGINE_MODEL ?? "",
    ttsEngineLocale: env.IRIS_LOCAL_TTS_ENGINE_LOCALE ?? "",
    ttsCharacterVoiceProfileId: env.IRIS_CHARACTER_VOICE_PROFILE_ID ?? "",
    ttsCharacterVoiceStyleProfileId:
      env.IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID ?? "",
    ttsLicensedVoiceSourceStatus: env.IRIS_LICENSED_VOICE_SOURCE_STATUS ?? "",
    live2dEngineEndpoint: normalizeLocalEngineEndpoint({
      endpoint: env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT,
      bridgeHost,
      bridgePort,
      adapterPath: "/live2d",
    }),
    live2dEngineApiKey: env.IRIS_LOCAL_LIVE2D_ENGINE_API_KEY ?? "",
    live2dEngineModelId: env.IRIS_LOCAL_LIVE2D_MODEL_ID ?? "",
    live2dEngineSceneId: env.IRIS_LOCAL_LIVE2D_SCENE_ID ?? "",
    engineTimeoutMs: env.IRIS_LOCAL_ENGINE_TIMEOUT_MS ?? 5000,
    retryBackoffMs: env.IRIS_LOCAL_BRIDGE_WORKER_RETRY_BACKOFF_MS ?? 5000,
    retryMaxBackoffMs: env.IRIS_LOCAL_BRIDGE_WORKER_RETRY_MAX_BACKOFF_MS ?? 300_000,
    maxRetryAttempts: env.IRIS_LOCAL_BRIDGE_WORKER_MAX_RETRY_ATTEMPTS ?? 3,
    maxJobAgeMs:
      env.IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS ??
      DEFAULT_LIVE_BRIDGE_WORKER_MAX_JOB_AGE_MS,
  });
  const status = worker.status();
  assertLocalBridgeEngineStatusSafe(status, "foundation status worker status");
  return status;
}

function normalizeLocalEngineEndpoint({ endpoint, bridgeHost, bridgePort, adapterPath }) {
  const value = String(endpoint ?? "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    const hostname = url.hostname === "localhost" ? "127.0.0.1" : url.hostname;
    const expectedHost = bridgeHost === "localhost" ? "127.0.0.1" : bridgeHost;
    if (
      hostname === expectedHost &&
      url.port === String(bridgePort) &&
      url.pathname === adapterPath
    ) {
      return "";
    }
  } catch {
    return value;
  }
  return value;
}

function createObsBrowserSourceStatus({ env }) {
  const config = createObsOverlayConfigFromEnv(env);
  assertObsOverlayConfigSafe(config, "foundation status OBS config input");
  const source = config.obs_browser_source;
  return {
    schema: "iris_foundation_obs_browser_source_status_v1",
    obs_setup_bridge_configured: Boolean(env.IRIS_OBS_BRIDGE_ENDPOINT),
    origin_configured: Boolean(env.IRIS_HTTP_ORIGIN),
    source_name_configured: Boolean(env.IRIS_OBS_SOURCE_NAME),
    scene_name_configured: Boolean(env.IRIS_OBS_SCENE_NAME),
    source_dimensions_configured: Boolean(
      env.IRIS_OBS_SOURCE_WIDTH || env.IRIS_OBS_SOURCE_HEIGHT || env.IRIS_OBS_SOURCE_FPS
    ),
    width: source.width,
    height: source.height,
    fps: source.fps,
    shutdown_source_when_not_visible: source.shutdown_source_when_not_visible,
    refresh_browser_when_scene_becomes_active:
      source.refresh_browser_when_scene_becomes_active,
    overlay_paths: {
      overlay: config.endpoints.overlay_path,
      display_event: config.endpoints.display_event_path,
      event_stream: config.endpoints.event_stream_path,
      event_stream_status: config.endpoints.event_stream_status_path,
      overlay_status: config.endpoints.overlay_status_path,
      render_manifest_status:
        config.endpoints.local_bridge_event_render_manifest_status_path,
      render_manifest_latest:
        config.endpoints.local_bridge_event_render_manifest_latest_path,
    },
    local_bridge_handoff_paths: {
      render_manifest_status:
        config.local_bridge_handoff.render_manifest_status_path,
      latest_render_manifest_report:
        config.local_bridge_handoff.latest_render_manifest_report_path,
      latest_artifact_tts:
        config.local_bridge_handoff.latest_artifact_paths.tts,
      latest_artifact_live2d:
        config.local_bridge_handoff.latest_artifact_paths.live2d,
      latest_artifact_subtitle:
        config.local_bridge_handoff.latest_artifact_paths.subtitle,
    },
    required_adapter_kinds: config.local_bridge_handoff.required_adapter_kinds,
    boundary_policy: {
      paths_only_no_origin: true,
      no_scene_or_source_names: true,
      no_secret_values: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
}

function createFoundationStatusSummary({
  env,
  foundationIntegrations,
  foundationChecks,
  localBridgeEngineStatus,
  renderManifestReport,
  obsBrowserSourceStatus,
}) {
  const getIntegration = (name) =>
    foundationIntegrations.find((item) => item.integration === name) ?? null;
  const getCheck = (name) =>
    foundationChecks.find((item) => item.integration === name) ?? null;
  const runtimeBridge = getCheck("validated_runtime_bridge_handoff");
  const ttsEngine = getCheck("real_tts_engine");
  const live2dEngine = getCheck("real_live2d_bridge");
  const obsOverlay = getCheck("production_obs_overlay");
  const ttsBridge = getIntegration("tts_bridge");
  const live2dBridge = getIntegration("live2d_bridge");
  const subtitleBridge = getIntegration("subtitle_bridge");
  const localWorker = getIntegration("local_bridge_engine_worker");
  const runtimeHttpAdaptersConfigured = [
    ttsBridge,
    live2dBridge,
    subtitleBridge,
  ].every((item) => item?.status === "configured");
  const runtimeTargetPolicyAttention = [
    ttsBridge,
    live2dBridge,
    subtitleBridge,
    localWorker,
  ].some((item) => item?.local_endpoint_policy_status === "blocked");
  const localBridgeStorageConfigured =
    Boolean(env.IRIS_LOCAL_BRIDGE_OUTBOX_DIR) &&
    Boolean(env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR) &&
    Boolean(env.IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS) &&
    Boolean(env.IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS);
  const bridgeHost = env.IRIS_LOCAL_BRIDGE_HOST || "127.0.0.1";
  const bridgePort = env.IRIS_LOCAL_BRIDGE_PORT || "8790";
  const localBridgeUrl = `http://${bridgeHost}:${bridgePort}`;
  const ttsHealthEndpoint =
    env.IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT ??
    `${env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT || `${localBridgeUrl}/tts`}/health`;
  const live2dHealthEndpoint =
    env.IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT ??
    `${env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT || `${localBridgeUrl}/live2d`}/health`;
  const realTtsEngineConfigured =
    localBridgeEngineStatus.engine_modes.tts === "http" &&
    Boolean(ttsHealthEndpoint) &&
    ttsEngine?.status === "ready";
  const originalVoiceSourceStatus = summarizeOriginalVoiceSourceStatus(
    env.IRIS_LICENSED_VOICE_SOURCE_STATUS
  );
  const voiceLicenseUseCategoryConfiguredCount =
    VOICE_LICENSE_USE_CATEGORY_ENV_NAMES.filter((name) => Boolean(env[name]))
      .length;
  const realLive2dEngineConfigured =
    localBridgeEngineStatus.engine_modes.live2d === "http" &&
    Boolean(live2dHealthEndpoint) &&
    live2dEngine?.status === "ready";
  const obsBrowserSourceConfigured =
    Boolean(env.IRIS_HTTP_ORIGIN) || Boolean(env.IRIS_OBS_BRIDGE_ENDPOINT);
  const attentionReasons = [
    runtimeHttpAdaptersConfigured ? null : "runtime_http_adapters_not_configured",
    localBridgeStorageConfigured ? null : "local_bridge_storage_not_configured",
    realTtsEngineConfigured ? null : "real_tts_engine_not_configured",
    originalVoiceSourceStatus === "operator_attention_required"
      ? "original_voice_source_status_attention"
      : null,
    realLive2dEngineConfigured ? null : "real_live2d_engine_not_configured",
    obsBrowserSourceConfigured ? null : "obs_browser_source_not_configured",
    runtimeTargetPolicyAttention ? "local_target_policy_attention" : null,
  ].filter(Boolean);
  const readinessStates =
    attentionReasons.length > 0
      ? attentionReasons.map(readinessStateForAttentionReason)
      : ["ready"];
  return {
    schema: "iris_foundation_status_summary_v1",
    runtime_http_adapters_configured: runtimeHttpAdaptersConfigured,
    local_bridge_storage_configured: localBridgeStorageConfigured,
    render_manifest_stale_guard_configured:
      Boolean(env.IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS),
    render_artifact_sync_guard_configured:
      Boolean(env.IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS),
    real_tts_engine_configured: realTtsEngineConfigured,
    original_voice_profile_configured: Boolean(env.IRIS_CHARACTER_VOICE_PROFILE_ID),
    original_voice_style_profile_configured: Boolean(
      env.IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID
    ),
    licensed_voice_source_status_configured: Boolean(
      env.IRIS_LICENSED_VOICE_SOURCE_STATUS
    ),
    voice_license_use_category_count: VOICE_LICENSE_USE_CATEGORY_ENV_NAMES.length,
    voice_license_use_category_configured_count:
      voiceLicenseUseCategoryConfiguredCount,
    voice_license_use_category_missing_count:
      VOICE_LICENSE_USE_CATEGORY_ENV_NAMES.length -
      voiceLicenseUseCategoryConfiguredCount,
    original_voice_source_status: originalVoiceSourceStatus,
    original_voice_engine_preferences_configured:
      localBridgeEngineStatus.engine_preferences_configured.tts === true,
    real_live2d_engine_configured: realLive2dEngineConfigured,
    obs_browser_source_configured: obsBrowserSourceConfigured,
    obs_setup_bridge_configured: Boolean(env.IRIS_OBS_BRIDGE_ENDPOINT),
    obs_setup_bridge_health_configured:
      !env.IRIS_OBS_BRIDGE_ENDPOINT ||
      Boolean(env.IRIS_OBS_BRIDGE_HEALTH_ENDPOINT),
    local_target_policy_attention: runtimeTargetPolicyAttention,
    local_bridge_worker_readiness_status:
      localBridgeEngineStatus.worker_readiness_status,
    tts_adapter_readiness_status:
      localBridgeEngineStatus.adapter_readiness_status.tts,
    live2d_adapter_readiness_status:
      localBridgeEngineStatus.adapter_readiness_status.live2d,
    subtitle_adapter_readiness_status:
      localBridgeEngineStatus.adapter_readiness_status.subtitle,
    render_manifest_store_configured:
      localBridgeEngineStatus.event_render_manifests.artifact_dir_configured,
    latest_render_manifest_available: renderManifestReport.manifest_available,
    obs_handoff_readiness_status:
      renderManifestReport.obs_handoff_readiness_status,
    http_origin_configured: Boolean(env.IRIS_HTTP_ORIGIN),
    attention_reasons: attentionReasons,
    attention_reason_count: attentionReasons.length,
    next_attention_reason: attentionReasons[0] ?? null,
    next_readiness_state: readinessStates[0],
    readiness_state_counts: countReadinessStates(readinessStates),
    boundary_policy: {
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_voice_profile_values: true,
      no_raw_voice_samples: true,
      no_internal_model_paths: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function assertFoundationSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  if (summary.schema !== "iris_foundation_status_summary_v1") {
    throw new ContractError(`${context}: invalid summary schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!FOUNDATION_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  for (const field of [
    "runtime_http_adapters_configured",
    "local_bridge_storage_configured",
    "render_manifest_stale_guard_configured",
    "render_artifact_sync_guard_configured",
    "real_tts_engine_configured",
    "original_voice_profile_configured",
    "original_voice_style_profile_configured",
    "licensed_voice_source_status_configured",
    "original_voice_engine_preferences_configured",
    "real_live2d_engine_configured",
    "obs_browser_source_configured",
    "obs_setup_bridge_configured",
    "obs_setup_bridge_health_configured",
    "local_target_policy_attention",
    "render_manifest_store_configured",
    "latest_render_manifest_available",
    "http_origin_configured",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid summary flag`);
    }
  }
  for (const field of [
    "local_bridge_worker_readiness_status",
    "tts_adapter_readiness_status",
    "live2d_adapter_readiness_status",
    "subtitle_adapter_readiness_status",
    "obs_handoff_readiness_status",
  ]) {
    if (typeof summary[field] !== "string" || !/^[a-z0-9_]+$/.test(summary[field])) {
      throw new ContractError(`${context}: invalid summary status`);
    }
  }
  if (!ORIGINAL_VOICE_SOURCE_STATUSES.has(summary.original_voice_source_status)) {
    throw new ContractError(`${context}: invalid original voice source status`);
  }
  for (const field of [
    "voice_license_use_category_count",
    "voice_license_use_category_configured_count",
    "voice_license_use_category_missing_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid summary count`);
    }
  }
  if (
    summary.voice_license_use_category_configured_count +
      summary.voice_license_use_category_missing_count !==
    summary.voice_license_use_category_count
  ) {
    throw new ContractError(`${context}: voice license use category count mismatch`);
  }
  if (!Array.isArray(summary.attention_reasons)) {
    throw new ContractError(`${context}: attention reasons must be an array`);
  }
  for (const reason of summary.attention_reasons) {
    if (!ATTENTION_REASONS.has(reason)) {
      throw new ContractError(`${context}: invalid attention reason`);
    }
  }
  if (
    !Number.isInteger(summary.attention_reason_count) ||
    summary.attention_reason_count !== summary.attention_reasons.length
  ) {
    throw new ContractError(`${context}: invalid attention reason count`);
  }
  if (
    summary.next_attention_reason !== null &&
    summary.next_attention_reason !== summary.attention_reasons[0]
  ) {
    throw new ContractError(`${context}: invalid next attention reason`);
  }
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  const expectedReadinessStates =
    summary.attention_reasons.length > 0
      ? summary.attention_reasons.map(readinessStateForAttentionReason)
      : ["ready"];
  if (
    summary.next_readiness_state !== expectedReadinessStates[0] ||
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      countReadinessStates(expectedReadinessStates)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state summary`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "booleans_counts_and_fixed_statuses_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_voice_profile_values",
      "no_raw_voice_samples",
      "no_internal_model_paths",
      "no_candidates",
      "no_commands",
    ],
    `${context}: summary boundary policy`
  );
}

function readinessStateForAttentionReason(reason) {
  switch (reason) {
    case "runtime_http_adapters_not_configured":
    case "local_bridge_storage_not_configured":
      return "configuration_waiting";
    case "real_tts_engine_not_configured":
    case "real_live2d_engine_not_configured":
    case "obs_browser_source_not_configured":
      return "real_device_waiting";
    case "original_voice_source_status_attention":
    case "local_target_policy_attention":
      return "operator_review_required";
    default:
      return "operator_review_required";
  }
}

function summarizeOriginalVoiceSourceStatus(status) {
  if (!status) return "not_configured";
  if (["licensed", "placeholder", "operator_attention_required"].includes(status)) {
    return status;
  }
  return "operator_attention_required";
}

function countReadinessStates(states) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const state of states) {
    if (READINESS_STATES.has(state)) counts[state] += 1;
  }
  return counts;
}

function assertSafeReadinessState(state, context) {
  if (!READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: readiness state counts are required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness state count`);
    }
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: invalid readiness state count key`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every(
    (state) => Number(left?.[state] ?? -1) === Number(right?.[state] ?? -2)
  );
}

function assertFoundationIntegrationListSafe(items, context) {
  if (!Array.isArray(items) || items.length !== FOUNDATION_INTEGRATIONS.size) {
    throw new ContractError(`${context}: invalid foundation integration list`);
  }
  for (const item of items) {
    if (!FOUNDATION_INTEGRATIONS.has(item.integration)) {
      throw new ContractError(`${context}: unexpected foundation integration`);
    }
  }
}

function assertFoundationCheckListSafe(items, context) {
  if (!Array.isArray(items) || items.length !== FOUNDATION_DOCTOR_INTEGRATIONS.size) {
    throw new ContractError(`${context}: invalid foundation check list`);
  }
  for (const item of items) {
    if (!FOUNDATION_DOCTOR_INTEGRATIONS.has(item.integration)) {
      throw new ContractError(`${context}: unexpected foundation check`);
    }
  }
}

function assertObsBrowserSourceStatusSafe(status, context) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: OBS status is required`);
  }
  if (status.schema !== "iris_foundation_obs_browser_source_status_v1") {
    throw new ContractError(`${context}: invalid OBS status schema`);
  }
  for (const field of Object.keys(status)) {
    if (!OBS_BROWSER_SOURCE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected OBS status field`, { field });
    }
  }
  for (const field of [
    "origin_configured",
    "source_name_configured",
    "scene_name_configured",
    "source_dimensions_configured",
    "shutdown_source_when_not_visible",
    "refresh_browser_when_scene_becomes_active",
  ]) {
    if (typeof status[field] !== "boolean") {
      throw new ContractError(`${context}: invalid OBS flag`);
    }
  }
  for (const field of ["width", "height", "fps"]) {
    if (!Number.isInteger(status[field]) || status[field] <= 0) {
      throw new ContractError(`${context}: invalid OBS dimensions`);
    }
  }
  assertPathMapSafe(status.overlay_paths, context);
  assertPathMapSafe(status.local_bridge_handoff_paths, context);
  if (!Array.isArray(status.required_adapter_kinds)) {
    throw new ContractError(`${context}: invalid OBS adapter list`);
  }
  for (const kind of status.required_adapter_kinds) {
    if (!["tts", "live2d", "subtitle"].includes(kind)) {
      throw new ContractError(`${context}: invalid OBS adapter kind`);
    }
  }
  assertBoundaryPolicy(
    status.boundary_policy,
    [
      "paths_only_no_origin",
      "no_scene_or_source_names",
      "no_secret_values",
      "no_live_payloads",
      "no_text_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: OBS boundary policy`
  );
  if (status.adapter_validation_required !== true) {
    throw new ContractError(`${context}: OBS adapter validation required`);
  }
}

function assertPathMapSafe(paths, context) {
  if (!paths || typeof paths !== "object" || Array.isArray(paths)) {
    throw new ContractError(`${context}: path map is required`);
  }
  for (const item of Object.values(paths)) {
    if (typeof item !== "string" || !item.startsWith("/") || URL_PATTERN.test(item)) {
      throw new ContractError(`${context}: invalid path-only value`);
    }
  }
}

function assertNoForbiddenFoundationStatusFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFoundationStatusFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const field of Object.keys(value)) {
    if (FORBIDDEN_FOUNDATION_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { path, field });
    }
    assertNoForbiddenFoundationStatusFields(value[field], context, `${path}.${field}`);
  }
}
