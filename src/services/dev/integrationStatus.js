import { ContractError } from "../../core/contracts.js";
import {
  summarizeLocalEndpointScope,
} from "../../core/localEndpointPolicy.js";

const FORBIDDEN_INTEGRATION_STATUS_FIELDS = new Set([
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "token",
  "secret",
  "password",
  "credential",
  "credentials",
  "value",
  "endpoint",
  "url",
  "world_command",
  "input_action_candidate",
  "approved_game_input_action",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "commit",
  "write",
  "execute",
]);
const GAME_ACTION_KINDS = new Set([
  "wait",
  "move_axis",
  "press_key",
  "click",
  "open_menu",
  "select_item",
]);
const INTEGRATION_STATUS_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "integrations",
  "schedulers",
  "overlay_event_stream",
  "summary",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_SUMMARY_FIELDS = new Set([
  "total",
  "configured",
  "local",
  "disabled",
  "missing_configuration",
  "local_endpoint_policy_applicable_count",
  "local_endpoint_policy_all_allowed_count",
  "local_endpoint_policy_not_configured_count",
  "local_endpoint_policy_blocked_count",
  "local_endpoint_scope_counts",
]);
const OBS_RENDER_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "artifact_pipeline_configured",
  "outbox_configured",
  "artifact_store_configured",
  "event_render_manifests_supported",
  "render_manifest_public_status",
  "render_manifest_stale_guard_configured",
  "render_artifact_sync_guard_configured",
  "configured_pickup_guard_count",
  "required_pickup_guard_count",
  "obs_pickup_requires_complete_render_manifest",
  "manifest_id_match_required_for_artifact_pickup",
  "render_timestamp_match_required_for_artifact_pickup",
  "local_bridge_worker_required_before_obs_pickup",
  "all_obs_pickup_guards_configured",
  "production_obs_pickup_handoff_state",
  "boundary_policy",
]);
const ENGINE_MODE_SUMMARY_FIELDS = new Set([
  "schema",
  "tts_engine_real_http_configured",
  "live2d_engine_real_http_configured",
  "subtitle_engine_local_vtt",
  "real_http_engine_count",
  "local_placeholder_engine_count",
  "health_check_configured_count",
  "all_real_http_engines_configured",
  "placeholder_mode_active",
  "production_engine_handoff_state",
  "boundary_policy",
]);
const INTEGRATION_STATUS_BOUNDARY_FIELDS = [
  "no_secret_values",
  "env_names_only",
  "no_raw_payloads",
  "no_candidates",
  "no_commands",
  "read_only_integration_status",
];
const INTEGRATION_ITEM_BOUNDARY_FIELDS = [
  "no_secret_values",
  "env_names_only",
  "no_payloads",
  "read_only",
  "no_job_payloads",
  "no_text_payloads",
  "local_artifacts_only",
  "event_render_manifest_paths_hidden_in_status",
  "render_manifest_stale_guard_paths_hidden",
  "render_artifact_sync_guard_paths_hidden",
  "job_freshness_guard_payloads_hidden",
];
const OBS_RENDER_HANDOFF_BOUNDARY_FIELDS = [
  "booleans_counts_and_fixed_statuses_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_payloads",
  "no_artifact_paths",
  "no_candidates",
  "no_commands",
];
const ENGINE_MODE_BOUNDARY_FIELDS = [
  "modes_and_counts_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_payloads",
  "no_commands",
];

export function createIntegrationStatus({
  env = process.env,
  idleScheduler = null,
  httpIngestScheduler = null,
  overlayEventBus = null,
  generatedAtMs = Date.now(),
} = {}) {
  const integrations = [
    responseProviderStatus(env),
    adapterBridgeStatus(env, {
      integration: "tts_bridge",
      adapterEnv: "IRIS_TTS_ADAPTER",
      defaultAdapter: "console",
      httpAdapter: "http",
      requiredEndpointEnv: "IRIS_TTS_ENDPOINT",
      endpointAliasEnv: "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT",
      optionalAuthEnv: "IRIS_TTS_API_KEY",
    }),
    adapterBridgeStatus(env, {
      integration: "live2d_bridge",
      adapterEnv: "IRIS_LIVE2D_ADAPTER",
      defaultAdapter: "console",
      httpAdapter: "http",
      requiredEndpointEnv: "IRIS_LIVE2D_ENDPOINT",
      endpointAliasEnv: "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT",
      optionalAuthEnv: "IRIS_LIVE2D_API_KEY",
    }),
    adapterBridgeStatus(env, {
      integration: "subtitle_bridge",
      adapterEnv: "IRIS_SUBTITLE_ADAPTER",
      defaultAdapter: "console",
      httpAdapter: "http",
      requiredEndpointEnv: "IRIS_SUBTITLE_ENDPOINT",
      endpointAliasEnv: "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT",
      optionalAuthEnv: "IRIS_SUBTITLE_API_KEY",
    }),
    obsBridgeStatus(env),
    localBridgeEngineWorkerStatus(env),
    gameControlStatus(env),
    liveChatStatus(env),
    sourceBridgeStatus(env, {
      integration: "game_observation_bridge",
      requiredEndpointEnv: "IRIS_GAME_OBSERVATION_ENDPOINT",
      optionalAuthEnv: "IRIS_GAME_OBSERVATION_API_KEY",
      enabledBy: "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
      optionalEnv: [
        "IRIS_GAME_OBSERVATION_TIMEOUT_MS",
        "IRIS_GAME_OBSERVATION_METHOD",
        "IRIS_GAME_CAPTURE_REGION",
        "IRIS_GAME_CAPTURE_X",
        "IRIS_GAME_CAPTURE_Y",
        "IRIS_GAME_CAPTURE_WIDTH",
        "IRIS_GAME_CAPTURE_HEIGHT",
        "IRIS_GAME_OBSERVATION_INCLUDE_OCR_SUMMARY",
        "IRIS_GAME_OBSERVATION_INCLUDE_UI_FOCUS_AREAS",
        "IRIS_GAME_OBSERVATION_MAX_EVENTS",
        "IRIS_GAME_OBSERVATION_ERROR_BACKOFF_MS",
        "IRIS_GAME_OBSERVATION_MAX_ERROR_BACKOFF_MS",
      ],
      localEndpointPolicy: true,
    }),
    sourceBridgeStatus(env, {
      integration: "media_watch_bridge",
      requiredEndpointEnv: "IRIS_MEDIA_WATCH_ENDPOINT",
      optionalAuthEnv: "IRIS_MEDIA_WATCH_API_KEY",
      enabledBy: "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
      localEndpointPolicy: true,
    }),
    sourceBridgeStatus(env, {
      integration: "external_topic_bridge",
      requiredEndpointEnv: "IRIS_EXTERNAL_TOPIC_ENDPOINT",
      optionalAuthEnv: "IRIS_EXTERNAL_TOPIC_API_KEY",
      enabledBy: "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
      localEndpointPolicy: true,
    }),
    memorySearchStatus(env),
    featureFlagStatus(env, {
      integration: "relationship_memory",
      flagEnv: "IRIS_ENABLE_RELATIONSHIP_MEMORY",
    }),
    featureFlagStatus(env, {
      integration: "candidate_persistence",
      flagEnv: "IRIS_ENABLE_CANDIDATE_PERSISTENCE",
    }),
    featureFlagStatus(env, {
      integration: "replay_log",
      flagEnv: "IRIS_ENABLE_REPLAY_LOG",
    }),
  ];
  const status = {
    schema: "iris_integration_status_v1",
    generated_at_ms: generatedAtMs,
    integrations,
    schedulers: {
      idle: schedulerSummary(idleScheduler),
      http_ingest: schedulerSummary(httpIngestScheduler),
    },
    overlay_event_stream: overlayEventBus?.status?.({ nowMs: generatedAtMs }) ?? null,
    summary: summarizeIntegrations(integrations),
    boundary_policy: {
      no_secret_values: true,
      env_names_only: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_integration_status: true,
    },
    adapter_validation_required: true,
  };
  assertIntegrationStatusSafe(status);
  return status;
}

export function assertIntegrationStatusSafe(status, context = "integration status") {
  if (!status || typeof status !== "object") {
    throw new ContractError(`${context}: missing status`);
  }
  assertNoForbiddenIntegrationStatusFields(status, context);
  for (const field of Object.keys(status)) {
    if (!INTEGRATION_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`);
    }
  }
  if (status.schema !== "iris_integration_status_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: status.schema });
  }
  if (!Array.isArray(status.integrations)) {
    throw new ContractError(`${context}: integrations must be an array`);
  }
  for (const item of status.integrations) assertIntegrationItem(item, context);
  assertIntegrationSummarySafe(status.summary, status.integrations, context);
  assertBoundaryPolicy(
    status.boundary_policy,
    INTEGRATION_STATUS_BOUNDARY_FIELDS,
    `${context} boundary policy`
  );
  if (status.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

function assertIntegrationSummarySafe(summary, integrations, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  for (const field of Object.keys(summary)) {
    if (!INTEGRATION_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  const expected = summarizeIntegrations(integrations);
  for (const field of [
    "total",
    "configured",
    "local",
    "disabled",
    "missing_configuration",
    "local_endpoint_policy_applicable_count",
    "local_endpoint_policy_all_allowed_count",
    "local_endpoint_policy_not_configured_count",
    "local_endpoint_policy_blocked_count",
  ]) {
    if (summary[field] !== expected[field]) {
      throw new ContractError(`${context}: summary ${field} mismatch`);
    }
  }
  if (
    JSON.stringify(summary.local_endpoint_scope_counts) !==
    JSON.stringify(expected.local_endpoint_scope_counts)
  ) {
    throw new ContractError(`${context}: summary local endpoint scope mismatch`);
  }
}

function responseProviderStatus(env) {
  const provider = env.IRIS_RESPONSE_PROVIDER ?? "mock";
  if (provider === "mock") {
    if (env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true") {
      return {
        ...bridgeIntegration(env, "response_provider", provider, {
          requiredEndpointEnv: "IRIS_RESPONSE_ENDPOINT",
          optionalAuthEnv: "IRIS_RESPONSE_API_KEY",
          configured: false,
          extraConfiguredEnv: ["IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS"],
        }),
        missing_env: ["IRIS_RESPONSE_PROVIDER", "IRIS_RESPONSE_ENDPOINT"],
      };
    }
    return localIntegration("response_provider", "mock", ["IRIS_RESPONSE_PROVIDER"]);
  }
  return bridgeIntegration(env, "response_provider", provider, {
    requiredEndpointEnv: "IRIS_RESPONSE_ENDPOINT",
    optionalAuthEnv: "IRIS_RESPONSE_API_KEY",
    configured: Boolean(env.IRIS_RESPONSE_ENDPOINT),
    extraConfiguredEnv: env.IRIS_RESPONSE_MODEL ? ["IRIS_RESPONSE_MODEL"] : [],
  });
}

function adapterBridgeStatus(env, config) {
  const adapter = env[config.adapterEnv] ?? config.defaultAdapter;
  if (adapter === config.defaultAdapter) {
    return localIntegration(config.integration, adapter, [config.adapterEnv]);
  }

  const endpointEnv = env[config.requiredEndpointEnv]
    ? config.requiredEndpointEnv
    : config.endpointAliasEnv;
  const endpoint = env[endpointEnv] || "";
  return withLocalEndpointPolicy(
    bridgeIntegration(env, config.integration, adapter, {
      requiredEndpointEnv: endpointEnv,
      optionalAuthEnv: config.optionalAuthEnv,
      configured: adapter === config.httpAdapter && Boolean(endpoint),
      extraConfiguredEnv: [config.adapterEnv],
    }),
    { ...env, [endpointEnv]: endpoint },
    { requiredEnv: [endpointEnv] }
  );
}

function gameControlStatus(env) {
  const adapter = env.IRIS_GAME_CONTROL_ADAPTER ?? "mock";
  const actionSummary = summarizeConfiguredGameActions(env.IRIS_AVAILABLE_GAME_ACTIONS);
  if (adapter === "mock") {
    return {
      ...localIntegration("game_control_bridge", adapter, [
        "IRIS_GAME_CONTROL_ADAPTER",
        "IRIS_ENABLE_GAME_CONTROL",
        ...(env.IRIS_AVAILABLE_GAME_ACTIONS ? ["IRIS_AVAILABLE_GAME_ACTIONS"] : []),
        ...(env.IRIS_GAME_CONTROL_MIN_INTERVAL_MS
          ? ["IRIS_GAME_CONTROL_MIN_INTERVAL_MS"]
          : []),
        ...(env.IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS
          ? ["IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS"]
          : []),
      ]),
      side_effects_enabled: env.IRIS_ENABLE_GAME_CONTROL === "true",
      approval_required: true,
      action_rate_limit_configured: Boolean(env.IRIS_GAME_CONTROL_MIN_INTERVAL_MS),
      fresh_observation_required: true,
      max_observation_age_configured: Boolean(env.IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS),
      ...actionSummary,
    };
  }
  return {
    ...withLocalEndpointPolicy(
      bridgeIntegration(env, "game_control_bridge", adapter, {
        requiredEndpointEnv: "IRIS_GAME_CONTROL_ENDPOINT",
        optionalAuthEnv: "IRIS_GAME_CONTROL_API_KEY",
        configured: adapter === "http" && Boolean(env.IRIS_GAME_CONTROL_ENDPOINT),
        extraConfiguredEnv: [
          "IRIS_GAME_CONTROL_ADAPTER",
          "IRIS_ENABLE_GAME_CONTROL",
          ...(env.IRIS_AVAILABLE_GAME_ACTIONS ? ["IRIS_AVAILABLE_GAME_ACTIONS"] : []),
          ...(env.IRIS_GAME_CONTROL_TIMEOUT_MS ? ["IRIS_GAME_CONTROL_TIMEOUT_MS"] : []),
          ...(env.IRIS_GAME_CONTROL_MIN_INTERVAL_MS
            ? ["IRIS_GAME_CONTROL_MIN_INTERVAL_MS"]
            : []),
          ...(env.IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS
            ? ["IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS"]
            : []),
        ],
      }),
      env,
      { requiredEnv: ["IRIS_GAME_CONTROL_ENDPOINT"] }
    ),
    side_effects_enabled: env.IRIS_ENABLE_GAME_CONTROL === "true",
    approval_required: true,
    action_rate_limit_configured: Boolean(env.IRIS_GAME_CONTROL_MIN_INTERVAL_MS),
    fresh_observation_required: true,
    max_observation_age_configured: Boolean(env.IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS),
    ...actionSummary,
  };
}

function summarizeConfiguredGameActions(value) {
  const rawItems = String(value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const supported = [...new Set(rawItems.filter((item) => GAME_ACTION_KINDS.has(item)))];
  return {
    available_actions_configured: rawItems.length > 0,
    available_action_count: supported.length > 0 ? supported.length : 1,
    unsupported_action_name_count: rawItems.filter((item) => !GAME_ACTION_KINDS.has(item)).length,
    fallback_to_wait_when_unconfigured: supported.length === 0,
  };
}

function localBridgeEngineWorkerStatus(env) {
  const ttsEngineMode = env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT ? "http" : "local_placeholder";
  const live2dEngineMode = env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT ? "http" : "local_cue_json";
  const subtitleEngineMode = "local_vtt";
  const ttsHealthConfigured = Boolean(env.IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT);
  const live2dHealthConfigured = Boolean(env.IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT);
  const outboxDir = env.IRIS_LOCAL_BRIDGE_OUTBOX_DIR || "data/local_bridge_outbox";
  const artifactDir = env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR || "data/local_bridge_artifacts";
  const outboxConfigured = Boolean(outboxDir);
  const artifactDirConfigured = Boolean(artifactDir);
  const renderManifestStaleGuardConfigured = Boolean(
    env.IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS
  );
  const renderArtifactSyncGuardConfigured = Boolean(
    env.IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS
  );
  return {
    ...withLocalEndpointPolicy(
      localIntegration("local_bridge_engine_worker", "local_artifact_worker", [
        "IRIS_LOCAL_BRIDGE_OUTBOX_DIR",
        "IRIS_LOCAL_BRIDGE_ARTIFACT_DIR",
        "IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS",
        "IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS",
        "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
        "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
        "IRIS_LOCAL_TTS_ENGINE_API_KEY",
        "IRIS_LOCAL_TTS_ENGINE_VOICE_ID",
        "IRIS_LOCAL_TTS_ENGINE_MODEL",
        "IRIS_LOCAL_TTS_ENGINE_LOCALE",
        "IRIS_CHARACTER_VOICE_PROFILE_ID",
        "IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID",
        "IRIS_LICENSED_VOICE_SOURCE_STATUS",
        "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
        "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
        "IRIS_LOCAL_LIVE2D_ENGINE_API_KEY",
        "IRIS_LOCAL_LIVE2D_MODEL_ID",
        "IRIS_LOCAL_LIVE2D_SCENE_ID",
        "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
        "IRIS_LOCAL_BRIDGE_WORKER_RETRY_BACKOFF_MS",
        "IRIS_LOCAL_BRIDGE_WORKER_RETRY_MAX_BACKOFF_MS",
        "IRIS_LOCAL_BRIDGE_WORKER_MAX_RETRY_ATTEMPTS",
        "IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS",
      ].filter((name) => Boolean(env[name]))),
      env,
      {
        optionalEnv: [
          "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
          "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
          "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
          "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
        ],
      }
    ),
    outbox_configured: outboxConfigured,
    artifact_dir_configured: artifactDirConfigured,
    tts_engine_mode: ttsEngineMode,
    live2d_engine_mode: live2dEngineMode,
    subtitle_engine_mode: subtitleEngineMode,
    engine_mode_summary: summarizeLocalBridgeEngineModeReadiness({
      ttsEngineMode,
      live2dEngineMode,
      subtitleEngineMode,
      ttsHealthConfigured,
      live2dHealthConfigured,
    }),
    obs_render_handoff_summary: summarizeLocalBridgeObsRenderHandoffReadiness({
      outboxConfigured,
      artifactDirConfigured,
      renderManifestStaleGuardConfigured,
      renderArtifactSyncGuardConfigured,
    }),
    tts_health_configured: ttsHealthConfigured,
    live2d_health_configured: live2dHealthConfigured,
    tts_auth_configured: Boolean(env.IRIS_LOCAL_TTS_ENGINE_API_KEY),
    live2d_auth_configured: Boolean(env.IRIS_LOCAL_LIVE2D_ENGINE_API_KEY),
    tts_engine_preferences_configured: Boolean(
      env.IRIS_LOCAL_TTS_ENGINE_VOICE_ID ||
        env.IRIS_LOCAL_TTS_ENGINE_MODEL ||
        env.IRIS_LOCAL_TTS_ENGINE_LOCALE ||
        env.IRIS_CHARACTER_VOICE_PROFILE_ID ||
        env.IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID ||
        env.IRIS_LICENSED_VOICE_SOURCE_STATUS
    ),
    live2d_engine_preferences_configured: Boolean(
      env.IRIS_LOCAL_LIVE2D_MODEL_ID || env.IRIS_LOCAL_LIVE2D_SCENE_ID
    ),
    event_render_manifests_supported: true,
    event_render_manifest_public_status: "counts_only",
    adapter_readiness_public_status: "per_adapter_fixed_enum",
    render_manifest_stale_guard_configured: renderManifestStaleGuardConfigured,
    render_manifest_stale_guard_status_policy: "freshness_status_without_paths",
    render_artifact_sync_guard_configured: renderArtifactSyncGuardConfigured,
    render_artifact_sync_guard_status_policy: "sync_status_without_paths",
    job_freshness_guard_configured: Boolean(env.IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS),
    job_freshness_guard_status_policy: "expire_before_engine_call_summary_only",
    supported_adapter_kinds: ["tts", "live2d", "subtitle"],
    boundary_policy: {
      ...itemBoundaryPolicy(),
      no_job_payloads: true,
      no_text_payloads: true,
      local_artifacts_only: true,
      event_render_manifest_paths_hidden_in_status: true,
      render_manifest_stale_guard_paths_hidden: true,
      render_artifact_sync_guard_paths_hidden: true,
      job_freshness_guard_payloads_hidden: true,
    },
  };
}

function summarizeLocalBridgeObsRenderHandoffReadiness({
  outboxConfigured,
  artifactDirConfigured,
  renderManifestStaleGuardConfigured,
  renderArtifactSyncGuardConfigured,
}) {
  const configuredGuardCount =
    (renderManifestStaleGuardConfigured ? 1 : 0) +
    (renderArtifactSyncGuardConfigured ? 1 : 0);
  const requiredGuardCount = 2;
  const artifactPipelineConfigured = outboxConfigured && artifactDirConfigured;
  const allPickupGuardsConfigured =
    artifactPipelineConfigured && configuredGuardCount === requiredGuardCount;
  return {
    schema: "iris_local_bridge_obs_render_handoff_summary_v1",
    artifact_pipeline_configured: artifactPipelineConfigured,
    outbox_configured: outboxConfigured,
    artifact_store_configured: artifactDirConfigured,
    event_render_manifests_supported: true,
    render_manifest_public_status: "counts_only",
    render_manifest_stale_guard_configured: renderManifestStaleGuardConfigured,
    render_artifact_sync_guard_configured: renderArtifactSyncGuardConfigured,
    configured_pickup_guard_count: configuredGuardCount,
    required_pickup_guard_count: requiredGuardCount,
    obs_pickup_requires_complete_render_manifest: true,
    manifest_id_match_required_for_artifact_pickup: true,
    render_timestamp_match_required_for_artifact_pickup: true,
    local_bridge_worker_required_before_obs_pickup: true,
    all_obs_pickup_guards_configured: allPickupGuardsConfigured,
    production_obs_pickup_handoff_state: allPickupGuardsConfigured
      ? "obs_pickup_guards_configured"
      : "obs_pickup_guard_configuration_waiting",
    boundary_policy: {
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_artifact_paths: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function summarizeLocalBridgeEngineModeReadiness({
  ttsEngineMode,
  live2dEngineMode,
  subtitleEngineMode,
  ttsHealthConfigured,
  live2dHealthConfigured,
}) {
  const modes = [ttsEngineMode, live2dEngineMode, subtitleEngineMode];
  const realHttpEngineCount = modes.filter((mode) => mode === "http").length;
  const localPlaceholderEngineCount = modes.filter((mode) =>
    mode === "local_placeholder" || mode === "local_vtt"
  ).length;
  return {
    schema: "iris_local_bridge_engine_mode_summary_v1",
    tts_engine_real_http_configured: ttsEngineMode === "http",
    live2d_engine_real_http_configured: live2dEngineMode === "http",
    subtitle_engine_local_vtt: subtitleEngineMode === "local_vtt",
    real_http_engine_count: realHttpEngineCount,
    local_placeholder_engine_count: localPlaceholderEngineCount,
    health_check_configured_count:
      (ttsHealthConfigured ? 1 : 0) + (live2dHealthConfigured ? 1 : 0),
    all_real_http_engines_configured:
      ttsEngineMode === "http" && live2dEngineMode === "http",
    placeholder_mode_active: localPlaceholderEngineCount > 0,
    production_engine_handoff_state:
      ttsEngineMode === "http" && live2dEngineMode === "http"
        ? "real_tts_live2d_configured"
        : localPlaceholderEngineCount > 0
          ? "local_placeholder_mode_active"
          : "local_artifact_handoff_active",
    boundary_policy: {
      modes_and_counts_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_commands: true,
    },
  };
}

function obsBridgeStatus(env) {
  const bridgeHost = env.IRIS_LOCAL_BRIDGE_HOST || "127.0.0.1";
  const bridgePort = env.IRIS_LOCAL_BRIDGE_PORT || "8790";
  const inferredEndpoint = `${`http://${bridgeHost}:${bridgePort}`}/obs-bridge`;
  const endpoint = env.IRIS_OBS_BRIDGE_ENDPOINT || inferredEndpoint;
  return {
    ...withLocalEndpointPolicy(
      bridgeIntegration(
        { ...env, IRIS_OBS_BRIDGE_ENDPOINT: endpoint },
        "obs_bridge",
        "http_setup",
        {
          requiredEndpointEnv: "IRIS_OBS_BRIDGE_ENDPOINT",
          optionalAuthEnv: "IRIS_OBS_BRIDGE_API_KEY",
          configured: Boolean(endpoint),
          extraConfiguredEnv: [
            ...(env.IRIS_OBS_BRIDGE_TIMEOUT_MS ? ["IRIS_OBS_BRIDGE_TIMEOUT_MS"] : []),
            ...(env.IRIS_OBS_BRIDGE_HEALTH_ENDPOINT ? ["IRIS_OBS_BRIDGE_HEALTH_ENDPOINT"] : []),
            ...(env.IRIS_OBS_SOURCE_NAME ? ["IRIS_OBS_SOURCE_NAME"] : []),
            ...(env.IRIS_OBS_SCENE_NAME ? ["IRIS_OBS_SCENE_NAME"] : []),
            ...(env.IRIS_OBS_SOURCE_WIDTH ? ["IRIS_OBS_SOURCE_WIDTH"] : []),
            ...(env.IRIS_OBS_SOURCE_HEIGHT ? ["IRIS_OBS_SOURCE_HEIGHT"] : []),
            ...(env.IRIS_OBS_SOURCE_FPS ? ["IRIS_OBS_SOURCE_FPS"] : []),
            ...(env.IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE
              ? ["IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE"]
              : []),
            ...(env.IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE
              ? ["IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE"]
              : []),
          ],
        }
      ),
      { ...env, IRIS_OBS_BRIDGE_ENDPOINT: endpoint },
      {
        requiredEnv: ["IRIS_OBS_BRIDGE_ENDPOINT"],
        optionalEnv: ["IRIS_OBS_BRIDGE_HEALTH_ENDPOINT"],
      }
    ),
    health_configured: Boolean(env.IRIS_OBS_BRIDGE_HEALTH_ENDPOINT),
    scene_configured: Boolean(env.IRIS_OBS_SCENE_NAME),
    source_dimensions_configured: Boolean(
      env.IRIS_OBS_SOURCE_WIDTH || env.IRIS_OBS_SOURCE_HEIGHT || env.IRIS_OBS_SOURCE_FPS
    ),
  };
}

function liveChatStatus(env) {
  if (
    env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true" &&
    !env.IRIS_YOUTUBE_LIVE_CHAT_ID &&
    !env.IRIS_YOUTUBE_VIDEO_ID &&
    !env.IRIS_YOUTUBE_VIDEO_URL &&
    !env.IRIS_YOUTUBE_WATCH_URL &&
    !env.IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT
  ) {
    return bridgeIntegration(env, "youtube_live_chat_source", "youtube_api", {
      requiredEndpointEnv: "IRIS_YOUTUBE_VIDEO_ID",
      optionalAuthEnv: "IRIS_YOUTUBE_DATA_API_KEY",
      configured: false,
      extraConfiguredEnv: ["IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS"],
    });
  }
  if (
    env.IRIS_YOUTUBE_LIVE_CHAT_SOURCE === "youtube_api" ||
    env.IRIS_YOUTUBE_LIVE_CHAT_ID ||
    env.IRIS_YOUTUBE_VIDEO_ID ||
    env.IRIS_YOUTUBE_VIDEO_URL ||
    env.IRIS_YOUTUBE_WATCH_URL
  ) {
    const requiredEndpointEnv = env.IRIS_YOUTUBE_VIDEO_ID
      ? "IRIS_YOUTUBE_VIDEO_ID"
      : env.IRIS_YOUTUBE_VIDEO_URL
        ? "IRIS_YOUTUBE_VIDEO_URL"
        : env.IRIS_YOUTUBE_WATCH_URL
          ? "IRIS_YOUTUBE_WATCH_URL"
          : "IRIS_YOUTUBE_LIVE_CHAT_ID";
    return bridgeIntegration(env, "youtube_live_chat_source", "youtube_api", {
      requiredEndpointEnv,
      optionalAuthEnv: env.IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN
        ? "IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN"
        : env.IRIS_YOUTUBE_OAUTH_TOKEN
        ? "IRIS_YOUTUBE_OAUTH_TOKEN"
        : "IRIS_YOUTUBE_DATA_API_KEY",
      configured: Boolean(
        (env.IRIS_YOUTUBE_LIVE_CHAT_ID ||
          env.IRIS_YOUTUBE_VIDEO_ID ||
          env.IRIS_YOUTUBE_VIDEO_URL ||
          env.IRIS_YOUTUBE_WATCH_URL) &&
          (env.IRIS_YOUTUBE_OAUTH_TOKEN ||
            env.IRIS_YOUTUBE_DATA_API_KEY ||
            env.IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN)
      ),
      extraConfiguredEnv: [
        "IRIS_YOUTUBE_LIVE_CHAT_SOURCE",
        ...(env.IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN
          ? [
              "IRIS_YOUTUBE_OAUTH_CLIENT_ID",
              "IRIS_YOUTUBE_OAUTH_CLIENT_SECRET",
              "IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT",
              "IRIS_YOUTUBE_OAUTH_REFRESH_TIMEOUT_MS",
            ]
          : []),
        ...optionalConfiguredEnv(env, [
          "IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT",
          "IRIS_YOUTUBE_VIDEOS_API_ENDPOINT",
          "IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS",
          "IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS",
          "IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW",
          "IRIS_YOUTUBE_LIVE_CHAT_PAGE_TOKEN",
          "IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH",
          "IRIS_YOUTUBE_LIVE_CHAT_ERROR_BACKOFF_MS",
          "IRIS_YOUTUBE_LIVE_CHAT_MAX_ERROR_BACKOFF_MS",
          "IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS",
          "IRIS_YOUTUBE_BLOCKED_TEXT_TERMS",
        ]),
      ],
    });
  }
  return sourceBridgeStatus(env, {
    integration: "youtube_live_chat_source",
    requiredEndpointEnv: "IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT",
    optionalAuthEnv: "IRIS_YOUTUBE_LIVE_CHAT_API_KEY",
    enabledBy: "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
    optionalEnv: [
      "IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS",
      "IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW",
      "IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS",
      "IRIS_YOUTUBE_BLOCKED_TEXT_TERMS",
    ],
    localEndpointPolicy: true,
  });
}

function memorySearchStatus(env) {
  const adapter = env.IRIS_MEMORY_SEARCH_ADAPTER ?? "local";
  if (adapter === "local") {
    return localIntegration("memory_search", adapter, ["IRIS_MEMORY_SEARCH_ADAPTER"]);
  }
  return withLocalEndpointPolicy(
    bridgeIntegration(env, "memory_search", adapter, {
      requiredEndpointEnv: "IRIS_MEMORY_SEARCH_ENDPOINT",
      optionalAuthEnv: "IRIS_MEMORY_SEARCH_API_KEY",
      configured: adapter === "http_vector" && Boolean(env.IRIS_MEMORY_SEARCH_ENDPOINT),
      extraConfiguredEnv: ["IRIS_MEMORY_SEARCH_ADAPTER"],
    }),
    env,
    { requiredEnv: ["IRIS_MEMORY_SEARCH_ENDPOINT"] }
  );
}

function sourceBridgeStatus(
  env,
  {
    integration,
    requiredEndpointEnv,
    optionalAuthEnv,
    enabledBy,
    optionalEnv = [],
    localEndpointPolicy = false,
  }
) {
  const item = bridgeIntegration(env, integration, "http", {
    requiredEndpointEnv,
    optionalAuthEnv,
    configured: Boolean(env[requiredEndpointEnv]),
    extraConfiguredEnv: [
      ...(enabledBy ? [enabledBy] : []),
      ...optionalEnv.filter((name) => Boolean(env[name])),
    ],
  });
  if (!localEndpointPolicy) return item;
  return withLocalEndpointPolicy(item, env, { requiredEnv: [requiredEndpointEnv] });
}

function optionalConfiguredEnv(env, names) {
  return names.filter((name) => Boolean(env[name]));
}

function featureFlagStatus(env, { integration, flagEnv }) {
  return {
    integration,
    mode: env[flagEnv] === "true" ? "enabled" : "disabled",
    status: env[flagEnv] === "true" ? "configured" : "disabled",
    configured_env: env[flagEnv] ? [flagEnv] : [],
    missing_env: [],
    auth_configured: false,
    boundary_policy: itemBoundaryPolicy(),
  };
}

function localIntegration(integration, mode, configuredEnv = []) {
  return {
    integration,
    mode,
    status: "local",
    configured_env: configuredEnv,
    missing_env: [],
    auth_configured: false,
    boundary_policy: itemBoundaryPolicy(),
  };
}

function bridgeIntegration(
  env,
  integration,
  mode,
  { requiredEndpointEnv, optionalAuthEnv, configured, extraConfiguredEnv = [] }
) {
  const authConfigured = optionalAuthEnv ? Boolean(env[optionalAuthEnv]) : false;
  return {
    integration,
    mode,
    status: configured ? "configured" : "missing_configuration",
    configured_env: [
      ...extraConfiguredEnv,
      ...(configured ? [requiredEndpointEnv] : []),
      ...(optionalAuthEnv && configured && authConfigured ? [optionalAuthEnv] : []),
    ].filter(Boolean),
    missing_env: configured ? [] : [requiredEndpointEnv],
    auth_configured: authConfigured,
    boundary_policy: itemBoundaryPolicy(),
  };
}

function withLocalEndpointPolicy(item, env, { requiredEnv = [], optionalEnv = [] } = {}) {
  const summary = summarizeLocalEndpointScopesFromEnv(env, { requiredEnv, optionalEnv });
  return {
    ...item,
    local_endpoint_policy: "loopback_or_private_network_only",
    local_endpoint_policy_status: summarizeLocalEndpointPolicyStatus(summary),
    local_endpoint_scope_summary: summary,
  };
}

function summarizeLocalEndpointPolicyStatus(summary) {
  if (!summary || summary.total_count <= 0) return "not_configured";
  if (summary.external_count > 0 || summary.invalid_count > 0) return "blocked";
  if (summary.not_configured_count > 0) return "not_configured";
  return "all_allowed";
}

function summarizeLocalEndpointScopesFromEnv(env, { requiredEnv = [], optionalEnv = [] } = {}) {
  const counts = {
    total_count: 0,
    loopback_count: 0,
    private_network_count: 0,
    external_count: 0,
    invalid_count: 0,
    not_configured_count: 0,
  };
  const names = [
    ...requiredEnv,
    ...optionalEnv.filter((name) => Boolean(env[name])),
  ].filter(Boolean);
  for (const name of names) {
    const scope = summarizeLocalEndpointScope(env[name]).endpoint_scope;
    counts.total_count += 1;
    if (scope === "loopback") counts.loopback_count += 1;
    else if (scope === "private_network") counts.private_network_count += 1;
    else if (scope === "external") counts.external_count += 1;
    else if (scope === "invalid") counts.invalid_count += 1;
    else counts.not_configured_count += 1;
  }
  return counts;
}

function schedulerSummary(scheduler) {
  const status = scheduler?.status?.() ?? null;
  if (
    status &&
    Object.hasOwn(status, "source_count") &&
    (!Number.isInteger(status.source_count) || status.source_count < 0)
  ) {
    throw new ContractError("integration status: scheduler source count is required");
  }
  return {
    configured: Boolean(status),
    running: status?.running === true,
    source_count: status && Object.hasOwn(status, "source_count") ? status.source_count : 0,
  };
}

function summarizeIntegrations(integrations) {
  const localEndpointPolicySummary = summarizeIntegrationLocalEndpointPolicy(integrations);
  return {
    total: integrations.length,
    configured: integrations.filter((item) => item.status === "configured").length,
    local: integrations.filter((item) => item.status === "local").length,
    disabled: integrations.filter((item) => item.status === "disabled").length,
    missing_configuration: integrations.filter((item) => item.status === "missing_configuration")
      .length,
    local_endpoint_policy_applicable_count:
      localEndpointPolicySummary.local_endpoint_policy_applicable_count,
    local_endpoint_policy_all_allowed_count:
      localEndpointPolicySummary.local_endpoint_policy_all_allowed_count,
    local_endpoint_policy_not_configured_count:
      localEndpointPolicySummary.local_endpoint_policy_not_configured_count,
    local_endpoint_policy_blocked_count:
      localEndpointPolicySummary.local_endpoint_policy_blocked_count,
    local_endpoint_scope_counts: localEndpointPolicySummary.local_endpoint_scope_counts,
  };
}

function summarizeIntegrationLocalEndpointPolicy(integrations) {
  const scopeCounts = {
    total_count: 0,
    loopback_count: 0,
    private_network_count: 0,
    external_count: 0,
    invalid_count: 0,
    not_configured_count: 0,
  };
  const summary = {
    local_endpoint_policy_applicable_count: 0,
    local_endpoint_policy_all_allowed_count: 0,
    local_endpoint_policy_not_configured_count: 0,
    local_endpoint_policy_blocked_count: 0,
    local_endpoint_scope_counts: scopeCounts,
  };
  for (const item of integrations) {
    if (!Object.hasOwn(item, "local_endpoint_policy_status")) continue;
    if (
      !item.local_endpoint_scope_summary ||
      typeof item.local_endpoint_scope_summary !== "object" ||
      Array.isArray(item.local_endpoint_scope_summary)
    ) {
      throw new ContractError("integration status: local endpoint scope summary is required");
    }
    summary.local_endpoint_policy_applicable_count += 1;
    if (item.local_endpoint_policy_status === "all_allowed") {
      summary.local_endpoint_policy_all_allowed_count += 1;
    } else if (item.local_endpoint_policy_status === "blocked") {
      summary.local_endpoint_policy_blocked_count += 1;
    } else {
      summary.local_endpoint_policy_not_configured_count += 1;
    }
    for (const field of Object.keys(scopeCounts)) {
      scopeCounts[field] += Number(item.local_endpoint_scope_summary[field]);
    }
  }
  return summary;
}

function itemBoundaryPolicy() {
  return {
    no_secret_values: true,
    env_names_only: true,
    no_payloads: true,
    read_only: true,
  };
}

function assertIntegrationItem(item, context) {
  if (!item || typeof item !== "object") {
    throw new ContractError(`${context}: invalid integration item`);
  }
  if (typeof item.integration !== "string" || !item.integration) {
    throw new ContractError(`${context}: invalid integration name`);
  }
  if (!["local", "configured", "missing_configuration", "disabled"].includes(item.status)) {
    throw new ContractError(`${context}: invalid integration status`, { status: item.status });
  }
  if (!Array.isArray(item.configured_env) || !Array.isArray(item.missing_env)) {
    throw new ContractError(`${context}: env summaries must be arrays`);
  }
  assertBoundaryPolicy(
    item.boundary_policy,
    INTEGRATION_ITEM_BOUNDARY_FIELDS,
    `${context} item boundary policy`,
    { requireAll: false }
  );
  if (item.engine_mode_summary !== undefined) {
    assertEngineModeSummarySafe(item.engine_mode_summary, `${context}: engine mode summary`);
  }
  if (item.obs_render_handoff_summary !== undefined) {
    assertObsRenderHandoffSummarySafe(
      item.obs_render_handoff_summary,
      `${context}: OBS render handoff summary`
    );
  }
  assertLocalEndpointPolicyFieldsSafe(item, context);
}

function assertObsRenderHandoffSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_local_bridge_obs_render_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!OBS_RENDER_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  for (const field of [
    "artifact_pipeline_configured",
    "outbox_configured",
    "artifact_store_configured",
    "event_render_manifests_supported",
    "render_manifest_stale_guard_configured",
    "render_artifact_sync_guard_configured",
    "obs_pickup_requires_complete_render_manifest",
    "manifest_id_match_required_for_artifact_pickup",
    "render_timestamp_match_required_for_artifact_pickup",
    "local_bridge_worker_required_before_obs_pickup",
    "all_obs_pickup_guards_configured",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "configured_pickup_guard_count",
    "required_pickup_guard_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (summary.render_manifest_public_status !== "counts_only") {
    throw new ContractError(`${context}: invalid public status`);
  }
  if (
    ![
      "obs_pickup_guards_configured",
      "obs_pickup_guard_configuration_waiting",
    ].includes(summary.production_obs_pickup_handoff_state)
  ) {
    throw new ContractError(`${context}: invalid production OBS pickup handoff state`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    OBS_RENDER_HANDOFF_BOUNDARY_FIELDS,
    `${context} boundary policy`
  );
}

function assertEngineModeSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_local_bridge_engine_mode_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ENGINE_MODE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  for (const field of [
    "tts_engine_real_http_configured",
    "live2d_engine_real_http_configured",
    "subtitle_engine_local_vtt",
    "all_real_http_engines_configured",
    "placeholder_mode_active",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "real_http_engine_count",
    "local_placeholder_engine_count",
    "health_check_configured_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    ![
      "real_tts_live2d_configured",
      "local_artifact_handoff_active",
      "local_placeholder_mode_active",
    ].includes(summary.production_engine_handoff_state)
  ) {
    throw new ContractError(`${context}: invalid production handoff state`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    ENGINE_MODE_BOUNDARY_FIELDS,
    `${context} boundary policy`
  );
}

function assertBoundaryPolicy(
  policy,
  allowedFields,
  context,
  { requireAll = true } = {}
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(allowedFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  const required = requireAll ? allowedFields : Object.keys(policy);
  for (const field of required) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertLocalEndpointPolicyFieldsSafe(item, context) {
  if (!Object.hasOwn(item, "local_endpoint_policy")) return;
  if (item.local_endpoint_policy !== "loopback_or_private_network_only") {
    throw new ContractError(`${context}: invalid local endpoint policy`, {
      local_endpoint_policy: item.local_endpoint_policy,
    });
  }
  if (
    !["all_allowed", "blocked", "not_configured"].includes(
      item.local_endpoint_policy_status
    )
  ) {
    throw new ContractError(`${context}: invalid local endpoint policy status`, {
      local_endpoint_policy_status: item.local_endpoint_policy_status,
    });
  }
  const summary = item.local_endpoint_scope_summary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: invalid local endpoint scope summary`);
  }
  for (const field of [
    "total_count",
    "loopback_count",
    "private_network_count",
    "external_count",
    "invalid_count",
    "not_configured_count",
  ]) {
    if (!Number.isFinite(Number(summary[field]))) {
      throw new ContractError(`${context}: invalid local endpoint scope count`, { field });
    }
  }
}

function assertNoForbiddenIntegrationStatusFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenIntegrationStatusFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_INTEGRATION_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe integration status field`, { field, path });
    }
    assertNoForbiddenIntegrationStatusFields(child, context, `${path}.${field}`);
  }
}
