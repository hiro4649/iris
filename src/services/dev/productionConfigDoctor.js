import "../../config/loadIrisEnv.js";
import { ContractError } from "../../core/contracts.js";
import { summarizeLocalEndpointScope } from "../../core/localEndpointPolicy.js";
import { ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES } from "./adminCharacterVoiceSettings.js";

const FORBIDDEN_DOCTOR_FIELDS = new Set([
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
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
]);
const GAME_ACTION_KINDS = new Set([
  "wait",
  "move_axis",
  "press_key",
  "click",
  "open_menu",
  "select_item",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const DOCTOR_REPORT_BOUNDARY_FIELDS = Object.freeze([
  "env_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_memory_records",
  "no_relationship_records",
  "no_candidates",
  "no_commands",
  "read_only_report",
]);
const DOCTOR_CHECK_BOUNDARY_FIELDS = Object.freeze([
  "env_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "read_only_check",
]);
const ORIGINAL_VOICE_BOUNDARY_FIELDS = Object.freeze([
  "env_names_only",
  "no_voice_profile_values",
  "no_voice_source_values",
  "no_voice_license_values",
  "no_raw_voice_samples",
  "no_dataset_paths",
  "no_internal_model_paths",
  "no_vendor_tokens",
  "no_candidates",
  "no_commands",
]);
const POSTGRES_SCALE_BOUNDARY_FIELDS = Object.freeze([
  "no_connection_values",
  "no_database_payloads",
  "env_names_only",
  "readiness_flags_only",
  "no_viewer_payloads",
  "no_hidden_relationship_scores",
]);
const PRODUCTION_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "config_doctor_report_only",
  "real_processes_not_started_by_doctor",
  "live_polling_not_started_by_doctor",
  "real_obs_live2d_voicevox_not_operated",
  "real_game_or_os_input_not_started",
  "env_names_only",
  "endpoint_values_not_exposed",
  "secret_values_not_exposed",
  "recommended_commands_are_names_only",
  "memory_and_relationship_candidates_remain_gated",
  "input_action_candidates_never_forwarded_directly",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "local_fixture_available_count",
  "recommended_command_count",
  "next_attention_integration",
  "next_readiness_state",
  "readiness_state_counts",
  "next_configured_command",
  "next_local_fixture_command",
]);
export const PRODUCTION_CONFIG_ENV_NAMES = Object.freeze([
  "IRIS_TTS_ADAPTER",
  "IRIS_TTS_ENDPOINT",
  "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT",
  "IRIS_TTS_API_KEY",
  "IRIS_TTS_TIMEOUT_MS",
  "IRIS_LIVE2D_ADAPTER",
  "IRIS_LIVE2D_ENDPOINT",
  "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT",
  "IRIS_LIVE2D_API_KEY",
  "IRIS_LIVE2D_TIMEOUT_MS",
  "IRIS_SUBTITLE_ADAPTER",
  "IRIS_SUBTITLE_ENDPOINT",
  "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT",
  "IRIS_SUBTITLE_API_KEY",
  "IRIS_SUBTITLE_TIMEOUT_MS",
  "IRIS_LOCAL_BRIDGE_OUTBOX_DIR",
  "IRIS_LOCAL_BRIDGE_ARTIFACT_DIR",
  "IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS",
  "IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS",
  "IRIS_LOCAL_BRIDGE_WORKER_WATCH",
  "IRIS_LOCAL_BRIDGE_WORKER_INTERVAL_MS",
  "IRIS_LOCAL_BRIDGE_WORKER_MAX_PASSES",
  "IRIS_LOCAL_BRIDGE_WORKER_LIMIT_PER_KIND",
  "IRIS_LOCAL_BRIDGE_WORKER_CONTINUE_ON_ERROR",
  "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
  "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
  "IRIS_LOCAL_TTS_ENGINE_API_KEY",
  "IRIS_LOCAL_TTS_ENGINE_VOICE_ID",
  "IRIS_LOCAL_TTS_ENGINE_MODEL",
  "IRIS_LOCAL_TTS_ENGINE_LOCALE",
  "IRIS_CHARACTER_VOICE_PROFILE_ID",
  "IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID",
  "IRIS_LICENSED_VOICE_SOURCE_STATUS",
  ...ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES,
  "IRIS_VOICEVOX_BRIDGE_HOST",
  "IRIS_VOICEVOX_BRIDGE_PORT",
  "IRIS_VOICEVOX_ENDPOINT",
  "IRIS_VOICEVOX_SPEAKER_ID",
  "IRIS_VOICEVOX_TIMEOUT_MS",
  "IRIS_VOICEVOX_API_KEY",
  "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
  "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
  "IRIS_LOCAL_LIVE2D_ENGINE_API_KEY",
  "IRIS_LOCAL_LIVE2D_MODEL_ID",
  "IRIS_LOCAL_LIVE2D_SCENE_ID",
  "IRIS_LIVE2D_CUE_BRIDGE_HOST",
  "IRIS_LIVE2D_CUE_BRIDGE_PORT",
  "IRIS_LIVE2D_RENDERER_ENDPOINT",
  "IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT",
  "IRIS_LIVE2D_RENDERER_API_KEY",
  "IRIS_LIVE2D_CUE_BRIDGE_TIMEOUT_MS",
  "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
  "IRIS_LOCAL_BRIDGE_WORKER_RETRY_BACKOFF_MS",
  "IRIS_LOCAL_BRIDGE_WORKER_RETRY_MAX_BACKOFF_MS",
  "IRIS_LOCAL_BRIDGE_WORKER_MAX_RETRY_ATTEMPTS",
  "IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS",
  "IRIS_OBS_BRIDGE_ENDPOINT",
  "IRIS_OBS_BRIDGE_HEALTH_ENDPOINT",
  "IRIS_OBS_BRIDGE_API_KEY",
  "IRIS_OBS_BRIDGE_TIMEOUT_MS",
  "IRIS_OBS_SETUP_CONTINUE_ON_ERROR",
  "IRIS_HTTP_ORIGIN",
  "IRIS_OBS_SOURCE_NAME",
  "IRIS_OBS_SCENE_NAME",
  "IRIS_OBS_SOURCE_WIDTH",
  "IRIS_OBS_SOURCE_HEIGHT",
  "IRIS_OBS_SOURCE_FPS",
  "IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE",
  "IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE",
  "IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT",
  "IRIS_YOUTUBE_LIVE_CHAT_API_KEY",
  "IRIS_YOUTUBE_LIVE_CHAT_SOURCE",
  "IRIS_YOUTUBE_RELAY_BRIDGE_HOST",
  "IRIS_YOUTUBE_RELAY_BRIDGE_PORT",
  "IRIS_YOUTUBE_LIVE_CHAT_ID",
  "IRIS_YOUTUBE_VIDEO_ID",
  "IRIS_YOUTUBE_VIDEO_URL",
  "IRIS_YOUTUBE_WATCH_URL",
  "IRIS_YOUTUBE_DATA_API_KEY",
  "IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT",
  "IRIS_YOUTUBE_VIDEOS_API_ENDPOINT",
  "IRIS_YOUTUBE_OAUTH_TOKEN",
  "IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN",
  "IRIS_YOUTUBE_OAUTH_CLIENT_ID",
  "IRIS_YOUTUBE_OAUTH_CLIENT_SECRET",
  "IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT",
  "IRIS_YOUTUBE_OAUTH_REFRESH_TIMEOUT_MS",
  "IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS",
  "IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS",
  "IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW",
  "IRIS_YOUTUBE_LIVE_CHAT_PAGE_TOKEN",
  "IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH",
  "IRIS_YOUTUBE_LIVE_CHAT_ERROR_BACKOFF_MS",
  "IRIS_YOUTUBE_LIVE_CHAT_MAX_ERROR_BACKOFF_MS",
  "IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS",
  "IRIS_YOUTUBE_BLOCKED_TEXT_TERMS",
  "IRIS_MEDIA_WATCH_ENDPOINT",
  "IRIS_MEDIA_WATCH_API_KEY",
  "IRIS_MEDIA_WATCH_TIMEOUT_MS",
  "IRIS_EXTERNAL_TOPIC_ENDPOINT",
  "IRIS_EXTERNAL_TOPIC_API_KEY",
  "IRIS_EXTERNAL_TOPIC_TIMEOUT_MS",
  "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
  "IRIS_HTTP_INGEST_INTERVAL_MS",
  "IRIS_HTTP_INGEST_LIMIT",
  "IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR",
  "IRIS_MEMORY_STORE_PATH",
  "IRIS_RELATIONSHIP_STORE_PATH",
  "IRIS_ENABLE_PERSISTENCE",
  "IRIS_ENABLE_CANDIDATE_PERSISTENCE",
  "IRIS_ENABLE_RELATIONSHIP_MEMORY",
  "IRIS_ADMIN_REVIEW_DECISION_LOG_PATH",
  "IRIS_ADMIN_REVIEW_ADMIN_AUTHENTICATED",
  "IRIS_ADMIN_REVIEW_OWNER_CONFIRMED",
  "IRIS_ADMIN_REVIEW_ACTOR_ROLE",
  "IRIS_MEMORY_STORE_MAX_RECORDS",
  "IRIS_MEMORY_STORE_DEDUPE",
  "IRIS_RELATIONSHIP_STORE_MAX_PROFILES",
  "IRIS_RELATIONSHIP_RECENT_SUMMARY_LIMIT",
  "IRIS_PERSISTENCE_BACKEND",
  "IRIS_POSTGRES_CONNECTION_STRING",
  "IRIS_POSTGRES_SSL_MODE",
  "IRIS_POSTGRES_MAX_POOL_SIZE",
  "IRIS_POSTGRES_MOCK_ADAPTER_ENABLED",
  "IRIS_POSTGRES_MIGRATIONS_READY",
  "IRIS_POSTGRES_INDEXES_READY",
  "IRIS_POSTGRES_BACKUP_READY",
  "IRIS_POSTGRES_TARGET_VIEWER_PROFILE_CAPACITY",
  "IRIS_MODERATION_STORE_ENABLED",
  "IRIS_MODERATION_BLOCKLIST_ENABLED",
  "IRIS_INTERNAL_RELATIONSHIP_STAGE_COUNT",
  "IRIS_PUBLIC_RELATIONSHIP_LEVEL_COUNT",
  "IRIS_MEMORY_SEARCH_ADAPTER",
  "IRIS_MEMORY_SEARCH_ENDPOINT",
  "IRIS_MEMORY_SEARCH_API_KEY",
  "IRIS_MEMORY_SEARCH_TIMEOUT_MS",
  "IRIS_GAME_OBSERVATION_ENDPOINT",
  "IRIS_GAME_OBSERVATION_API_KEY",
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
  "IRIS_ENABLE_GAME_CONTROL",
  "IRIS_GAME_CONTROL_ADAPTER",
  "IRIS_GAME_CONTROL_ENDPOINT",
  "IRIS_AVAILABLE_GAME_ACTIONS",
  "IRIS_GAME_CONTROL_API_KEY",
  "IRIS_GAME_CONTROL_TIMEOUT_MS",
  "IRIS_GAME_CONTROL_MIN_INTERVAL_MS",
  "IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS",
]);

const ENV_EXAMPLE_DEFERRED_ENV_NAMES = new Set([
  "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT",
  "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT",
  "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT",
  "IRIS_YOUTUBE_VIDEO_URL",
  "IRIS_YOUTUBE_WATCH_URL",
]);

export function listProductionConfigEnvNames() {
  return PRODUCTION_CONFIG_ENV_NAMES.filter(
    (name) => !ENV_EXAMPLE_DEFERRED_ENV_NAMES.has(name)
  );
}

export function createProductionConfigDoctor({ env = process.env, generatedAtMs = Date.now() } = {}) {
  const checks = [
    checkRuntimeBridgeHandoff(env),
    checkTtsEngine(env),
    checkLive2dEngine(env),
    checkObsSetup(env),
    checkYouTubeApi(env),
    checkMediaAndTopicIngest(env),
    checkPersistence(env),
    checkAdminReviewGate(env),
    checkVectorMemorySearch(env),
    checkVision(env),
    checkGameControl(env),
  ];
  const summary = {
    total: checks.length,
    ready: checks.filter((check) => check.status === "ready").length,
    attention: checks.filter((check) => check.status === "attention").length,
    local_fixture_available: checks.filter((check) => check.local_fixture_available).length,
  };
  const readinessStateCounts = countReadinessStates(checks);
  const firstAttentionCheck =
    checks.find((check) => check.status === "attention") ?? null;
  const nextReadinessState =
    firstAttentionCheck?.readiness_state ?? "ready";
  const recommendedCommands = [
    "npm run dev:env:example-check",
    "npm run dev:production-loop:roundtrip",
    "npm run dev:production:attention-digest",
    "npm run dev:production:live-readiness",
    "npm run dev:production:next-task",
    "npm run dev:production:probe",
    "npm run dev:production:runtime-handoff-status",
    "npm run dev:production:scheduler-enablement",
    "npm run dev:foundation:preflight",
    "npm run dev:foundation:launch-plan",
    "npm run dev:foundation:startup-checklist",
    "npm run dev:foundation:env-setup-plan",
    "npm run dev:foundation:local-env-profile",
    "npm run dev:foundation:local-env-roundtrip",
    "npm run dev:foundation:local-env-apply",
    "npm run dev:foundation:local-env-rehearsal",
    "npm run dev:foundation:connector-handoff",
    "npm run dev:foundation:status",
    "npm run dev:foundation:runtime-summary",
    "npm run dev:foundation:runtime-status",
    "npm run dev:foundation:live-readiness",
    "npm run dev:foundation:readiness-rehearsal",
    "npm run dev:foundation:blocked-worker-roundtrip",
    "npm run dev:foundation:policy-gate-roundtrip",
    "npm run dev:bridge:engine-roundtrip",
    "npm run dev:bridge:artifact-roundtrip",
    "npm run dev:bridge:error-roundtrip",
    "npm run dev:bridge:outbox-corrupt-roundtrip",
    "npm run dev:bridge:render-manifest",
    "npm run dev:bridge:status-roundtrip",
    "npm run dev:live2d:roundtrip",
    "npm run dev:live2d:unsafe-roundtrip",
    "npm run dev:engine:probe",
    "npm run dev:engine:invalid-audio-roundtrip",
    "npm run dev:engine:invalid-json-roundtrip",
    "npm run dev:engine:invalid-live2d-roundtrip",
    "npm run dev:engine:unsafe-roundtrip",
    "npm run dev:obs:probe",
    "npm run dev:obs:browser-source",
    "npm run dev:obs:invalid-artifact-roundtrip",
    "npm run dev:obs:render-handoff-roundtrip",
    "npm run dev:obs:runtime-render-roundtrip",
    "npm run dev:obs:stale-artifact-roundtrip",
    "npm run dev:obs:roundtrip",
    "npm run dev:obs:setup",
    "npm run dev:obs:failure-roundtrip",
    "npm run dev:obs:unsafe-roundtrip",
    "npm run dev:youtube:preflight",
    "npm run dev:youtube:local-env-profile",
    "npm run dev:youtube:local-env-apply",
    "npm run dev:youtube:env-setup-plan",
    "npm run dev:youtube:source-status",
    "npm run dev:youtube:runtime-status",
    "npm run dev:youtube:live-readiness",
    "npm run dev:youtube:readiness-rehearsal",
    "npm run dev:youtube:ingest-once",
    "npm run dev:voicevox:roundtrip",
    "npm run dev:voicevox:unsafe-roundtrip",
    "npm run dev:youtube:direct-live-chat-roundtrip",
    "npm run dev:youtube:cursor-backup-roundtrip",
    "npm run dev:youtube:cursor-roundtrip",
    "npm run dev:youtube:failure-roundtrip",
    "npm run dev:youtube:http-ingest-roundtrip",
    "npm run dev:youtube:runtime-ingest-roundtrip",
    "npm run dev:youtube:policy-gate-roundtrip",
    "npm run dev:youtube:support-gate-roundtrip",
    "npm run dev:youtube:roundtrip",
    "npm run dev:youtube:relay-bridge",
    "npm run dev:youtube:relay-readiness-rehearsal",
    "npm run dev:youtube:relay-startup-checklist",
    "npm run dev:youtube:relay-roundtrip",
    "npm run dev:youtube:relay-status-roundtrip",
    "npm run dev:youtube:status-roundtrip",
    "npm run dev:gameplay:preflight",
    "npm run dev:gameplay:local-env-profile",
    "npm run dev:gameplay:local-env-apply",
    "npm run dev:gameplay:env-setup-plan",
    "npm run dev:gameplay:startup-checklist",
    "npm run dev:gameplay:runtime-status",
    "npm run dev:gameplay:live-readiness",
    "npm run dev:gameplay:readiness-rehearsal",
    "npm run dev:gameplay:runtime-roundtrip",
    "npm run dev:gameplay:policy-gate-roundtrip",
    "npm run dev:gameplay:validation-gate-roundtrip",
    "npm run dev:vision:game-roundtrip",
    "npm run dev:vision:unsafe-roundtrip",
    "npm run dev:game-control:roundtrip",
    "npm run dev:game-control:failure-roundtrip",
    "npm run dev:game-control:unsafe-roundtrip",
    "npm run dev:memory-vector:bridge",
    "npm run dev:memory-vector:roundtrip",
    "npm run dev:persistence:preflight",
    "npm run dev:persistence:postgres-admin-save-preflight",
    "npm run dev:operator-policy:async-save-gate-roundtrip",
    "npm run dev:admin:review-auth-gate",
    "npm run dev:admin:review-validator-run-plan",
    "npm run dev:persistence:local-env-profile",
    "npm run dev:persistence:local-env-apply",
    "npm run dev:persistence:env-setup-plan",
    "npm run dev:persistence:startup-checklist",
    "npm run dev:persistence:runtime-status",
    "npm run dev:persistence:live-readiness",
    "npm run dev:persistence:readiness-rehearsal",
    "npm run dev:persistence:backup-roundtrip",
    "npm run dev:persistence:candidate-gate-roundtrip",
    "npm run dev:persistence:failure-roundtrip",
    "npm run dev:persistence:http-roundtrip",
    "npm run dev:persistence:policy-gate-roundtrip",
    "npm run dev:persistence:restart-roundtrip",
    "npm run dev:persistence:roundtrip",
    "npm run dev:persistence:status-roundtrip",
  ];
  const report = {
    schema: "iris_production_config_doctor_v1",
    generated_at_ms: generatedAtMs,
    checks,
    summary,
    next_readiness_state: nextReadinessState,
    readiness_state_counts: readinessStateCounts,
    recommended_commands: recommendedCommands,
    production_handoff_summary: {
      schema: "iris_production_config_doctor_handoff_summary_v1",
      config_doctor_report_only: true,
      real_processes_not_started_by_doctor: true,
      live_polling_not_started_by_doctor: true,
      real_obs_live2d_voicevox_not_operated: true,
      real_game_or_os_input_not_started: true,
      env_names_only: true,
      endpoint_values_not_exposed: true,
      secret_values_not_exposed: true,
      recommended_commands_are_names_only: true,
      memory_and_relationship_candidates_remain_gated: true,
      input_action_candidates_never_forwarded_directly: true,
      check_count: summary.total,
      ready_check_count: summary.ready,
      attention_check_count: summary.attention,
      local_fixture_available_count: summary.local_fixture_available,
      recommended_command_count: recommendedCommands.length,
      next_attention_integration: firstAttentionCheck?.integration ?? null,
      next_readiness_state: nextReadinessState,
      readiness_state_counts: readinessStateCounts,
      next_configured_command: firstAttentionCheck?.configured_command ?? null,
      next_local_fixture_command:
        firstAttentionCheck?.local_fixture_command ?? null,
    },
    boundary_policy: {
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
      read_only_report: true,
    },
    adapter_validation_required: true,
  };
  assertProductionConfigDoctorSafe(report);
  return report;
}

export function assertProductionConfigDoctorSafe(
  report,
  context = "production config doctor"
) {
  if (!report || typeof report !== "object") {
    throw new ContractError(`${context}: missing report`);
  }
  assertNoForbiddenDoctorFields(report, context);
  if (report.schema !== "iris_production_config_doctor_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: report.schema });
  }
  assertDoctorBoundaryPolicySafe(report.boundary_policy, context);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
  if (!Array.isArray(report.checks)) {
    throw new ContractError(`${context}: checks must be an array`);
  }
  if (
    report.summary?.total !== report.checks.length ||
    report.summary?.ready !==
      report.checks.filter((check) => check.status === "ready").length ||
    report.summary?.attention !==
      report.checks.filter((check) => check.status === "attention").length ||
    report.summary?.local_fixture_available !==
      report.checks.filter((check) => check.local_fixture_available).length
  ) {
    throw new ContractError(`${context}: summary must be derived from checks`);
  }
  assertSafeReadinessState(report.next_readiness_state, context);
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  if (!sameReadinessStateCounts(report.readiness_state_counts, countReadinessStates(report.checks))) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  assertRecommendedCommandsSafe(report.recommended_commands, context);
  assertProductionConfigDoctorHandoffSummarySafe(
    report.production_handoff_summary,
    report,
    context
  );
  for (const check of report.checks) {
    assertDoctorCheckSafe(check, context);
  }
}

function assertRecommendedCommandsSafe(commands, context) {
  if (!Array.isArray(commands)) {
    throw new ContractError(`${context}: recommended commands must be an array`);
  }
  for (const command of commands) {
    assertSafeCommandName(command, `${context}: recommended command`);
  }
}

function assertProductionConfigDoctorHandoffSummarySafe(summary, report, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_production_config_doctor_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: unexpected production handoff field ${field}`
      );
    }
  }
  for (const field of [
    "config_doctor_report_only",
    "real_processes_not_started_by_doctor",
    "live_polling_not_started_by_doctor",
    "real_obs_live2d_voicevox_not_operated",
    "real_game_or_os_input_not_started",
    "env_names_only",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
    "recommended_commands_are_names_only",
    "memory_and_relationship_candidates_remain_gated",
    "input_action_candidates_never_forwarded_directly",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  for (const field of [
    "check_count",
    "ready_check_count",
    "attention_check_count",
    "local_fixture_available_count",
    "recommended_command_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid production handoff count`);
    }
  }
  if (
    summary.check_count !== report.summary?.total ||
    summary.ready_check_count !== report.summary?.ready ||
    summary.attention_check_count !== report.summary?.attention ||
    summary.local_fixture_available_count !==
      report.summary?.local_fixture_available ||
    summary.recommended_command_count !== report.recommended_commands.length
  ) {
    throw new ContractError(`${context}: invalid production handoff totals`);
  }
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  if (
    summary.next_readiness_state !== report.next_readiness_state ||
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: invalid production handoff readiness state`);
  }
  const firstAttentionCheck =
    report.checks.find((check) => check.status === "attention") ?? null;
  if (
    summary.next_attention_integration !==
      (firstAttentionCheck?.integration ?? null) ||
    summary.next_configured_command !==
      (firstAttentionCheck?.configured_command ?? null) ||
    summary.next_local_fixture_command !==
      (firstAttentionCheck?.local_fixture_command ?? null)
  ) {
    throw new ContractError(`${context}: invalid production handoff next check`);
  }
  if (
    summary.next_attention_integration !== null &&
    !/^[a-z0-9_]+$/.test(summary.next_attention_integration)
  ) {
    throw new ContractError(`${context}: invalid production handoff integration`);
  }
  for (const field of ["next_configured_command", "next_local_fixture_command"]) {
    if (summary[field] !== null) {
      assertSafeCommandName(summary[field], `${context}: ${field}`);
    }
  }
}

function assertSafeCommandName(command, context) {
  if (
    typeof command !== "string" ||
    !(
      /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
        command
      ) || command === "npm test"
    )
  ) {
    throw new ContractError(`${context}: unsafe command name`);
  }
}

function checkRuntimeBridgeHandoff(env) {
  const ttsHttp = env.IRIS_TTS_ADAPTER === "http";
  const live2dHttp = env.IRIS_LIVE2D_ADAPTER === "http";
  const subtitleHttp = env.IRIS_SUBTITLE_ADAPTER === "http";
  const ttsEndpoint = env.IRIS_TTS_ENDPOINT || env.IRIS_LOCAL_TTS_BRIDGE_ENDPOINT;
  const live2dEndpoint =
    env.IRIS_LIVE2D_ENDPOINT || env.IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT;
  const subtitleEndpoint =
    env.IRIS_SUBTITLE_ENDPOINT || env.IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT;
  const ttsEndpointConfigured = Boolean(ttsEndpoint);
  const live2dEndpointConfigured = Boolean(live2dEndpoint);
  const subtitleEndpointConfigured = Boolean(subtitleEndpoint);
  const ttsEndpointScope = summarizeLocalEndpointScope(ttsEndpoint);
  const live2dEndpointScope = summarizeLocalEndpointScope(live2dEndpoint);
  const subtitleEndpointScope = summarizeLocalEndpointScope(subtitleEndpoint);
  const outboxConfigured = Boolean(env.IRIS_LOCAL_BRIDGE_OUTBOX_DIR);
  const artifactDirConfigured = Boolean(env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR);
  const staleGuardConfigured = Boolean(env.IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS);
  const artifactSyncGuardConfigured = Boolean(
    env.IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS
  );
  return checkGroup({
    integration: "validated_runtime_bridge_handoff",
    mode: runtimeBridgeMode({ ttsHttp, live2dHttp, subtitleHttp }),
    requiredEnv: [
      "IRIS_TTS_ADAPTER",
      env.IRIS_TTS_ENDPOINT ? "IRIS_TTS_ENDPOINT" : "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT",
      "IRIS_LIVE2D_ADAPTER",
      env.IRIS_LIVE2D_ENDPOINT
        ? "IRIS_LIVE2D_ENDPOINT"
        : "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT",
      "IRIS_SUBTITLE_ADAPTER",
      env.IRIS_SUBTITLE_ENDPOINT
        ? "IRIS_SUBTITLE_ENDPOINT"
        : "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT",
      "IRIS_LOCAL_BRIDGE_OUTBOX_DIR",
      "IRIS_LOCAL_BRIDGE_ARTIFACT_DIR",
      "IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS",
      "IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS",
    ],
    optionalEnv: [
      "IRIS_TTS_API_KEY",
      "IRIS_TTS_ENDPOINT",
      "IRIS_TTS_TIMEOUT_MS",
      "IRIS_LIVE2D_API_KEY",
      "IRIS_LIVE2D_ENDPOINT",
      "IRIS_LIVE2D_TIMEOUT_MS",
      "IRIS_SUBTITLE_API_KEY",
      "IRIS_SUBTITLE_ENDPOINT",
      "IRIS_SUBTITLE_TIMEOUT_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_WATCH",
      "IRIS_LOCAL_BRIDGE_WORKER_INTERVAL_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_MAX_PASSES",
      "IRIS_LOCAL_BRIDGE_WORKER_LIMIT_PER_KIND",
      "IRIS_LOCAL_BRIDGE_WORKER_CONTINUE_ON_ERROR",
      "IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS",
    ],
    env,
    ready: Boolean(
      ttsHttp &&
        live2dHttp &&
        subtitleHttp &&
        ttsEndpointConfigured &&
        live2dEndpointConfigured &&
        subtitleEndpointConfigured &&
        ttsEndpointScope.local_endpoint_allowed &&
        live2dEndpointScope.local_endpoint_allowed &&
        subtitleEndpointScope.local_endpoint_allowed &&
        outboxConfigured &&
        artifactDirConfigured &&
        staleGuardConfigured &&
        artifactSyncGuardConfigured
    ),
    localFixtureCommand: "npm run dev:bridge:roundtrip",
    configuredCommand: "npm run dev:probe -- --fixture-post",
    failureCommand: "npm run dev:bridge:error-roundtrip",
    extra: {
      tts_http_adapter_configured: ttsHttp,
      live2d_http_adapter_configured: live2dHttp,
      subtitle_http_adapter_configured: subtitleHttp,
      tts_bridge_endpoint_configured: ttsEndpointConfigured,
      live2d_bridge_endpoint_configured: live2dEndpointConfigured,
      subtitle_bridge_endpoint_configured: subtitleEndpointConfigured,
      tts_bridge_endpoint_scope: ttsEndpointScope.endpoint_scope,
      live2d_bridge_endpoint_scope: live2dEndpointScope.endpoint_scope,
      subtitle_bridge_endpoint_scope: subtitleEndpointScope.endpoint_scope,
      tts_bridge_endpoint_locality_ok: ttsEndpointScope.local_endpoint_allowed,
      live2d_bridge_endpoint_locality_ok: live2dEndpointScope.local_endpoint_allowed,
      subtitle_bridge_endpoint_locality_ok: subtitleEndpointScope.local_endpoint_allowed,
      local_endpoint_policy: "loopback_or_private_network_only",
      local_bridge_outbox_configured: outboxConfigured,
      local_bridge_artifact_dir_configured: artifactDirConfigured,
      render_manifest_stale_guard_configured: staleGuardConfigured,
      render_manifest_stale_guard_required_for_obs_pickup: true,
      render_artifact_sync_guard_configured: artifactSyncGuardConfigured,
      render_artifact_sync_guard_status_policy: "sync_status_without_paths",
      handoff_requires_http_adapters: true,
    },
  });
}

function runtimeBridgeMode({ ttsHttp, live2dHttp, subtitleHttp }) {
  if (ttsHttp && live2dHttp && subtitleHttp) return "http_local_bridge";
  if (ttsHttp || live2dHttp || subtitleHttp) return "partial_http_bridge";
  return "console_or_not_configured";
}

function checkTtsEngine(env) {
  const engineEndpointScope = summarizeLocalEndpointScope(env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT);
  const healthEndpoint = env.IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT
    ? env.IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT
    : `${env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT || ""}/health`;
  const healthEndpointScope = summarizeLocalEndpointScope(
    healthEndpoint
  );
  const voiceLicenseUseCategoryEnvNames =
    ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES;
  const voiceLicenseUseCategoryConfiguredCount =
    voiceLicenseUseCategoryEnvNames.filter((name) => Boolean(env[name])).length;
  return checkGroup({
    integration: "real_tts_engine",
    mode: env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT ? "local_engine_http" : "not_configured",
    requiredEnv: ["IRIS_LOCAL_TTS_ENGINE_ENDPOINT", "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT"],
    optionalEnv: [
      "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
      "IRIS_LOCAL_TTS_ENGINE_API_KEY",
      "IRIS_LOCAL_TTS_ENGINE_VOICE_ID",
      "IRIS_LOCAL_TTS_ENGINE_MODEL",
      "IRIS_LOCAL_TTS_ENGINE_LOCALE",
      "IRIS_CHARACTER_VOICE_PROFILE_ID",
      "IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID",
      "IRIS_LICENSED_VOICE_SOURCE_STATUS",
      ...ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES,
      "IRIS_VOICEVOX_BRIDGE_HOST",
      "IRIS_VOICEVOX_BRIDGE_PORT",
      "IRIS_VOICEVOX_ENDPOINT",
      "IRIS_VOICEVOX_SPEAKER_ID",
      "IRIS_VOICEVOX_TIMEOUT_MS",
      "IRIS_VOICEVOX_API_KEY",
      "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_RETRY_BACKOFF_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_RETRY_MAX_BACKOFF_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_MAX_RETRY_ATTEMPTS",
      "IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS",
    ],
    env,
    ready: Boolean(
      env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT &&
        env.IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT &&
        engineEndpointScope.local_endpoint_allowed &&
        healthEndpointScope.local_endpoint_allowed
    ),
    localFixtureCommand: "npm run dev:bridge:engine-roundtrip",
    configuredCommand: "npm run dev:engine:probe",
    extra: {
      engine_endpoint_scope: engineEndpointScope.endpoint_scope,
      health_endpoint_scope: healthEndpointScope.endpoint_scope,
      engine_endpoint_locality_ok: engineEndpointScope.local_endpoint_allowed,
      health_endpoint_locality_ok: healthEndpointScope.local_endpoint_allowed,
      local_endpoint_policy: "loopback_or_private_network_only",
      character_voice_profile_configured:
        Boolean(env.IRIS_CHARACTER_VOICE_PROFILE_ID),
      character_voice_style_profile_configured:
        Boolean(env.IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID),
      licensed_voice_source_status_configured:
        Boolean(env.IRIS_LICENSED_VOICE_SOURCE_STATUS),
      voice_license_use_category_count: voiceLicenseUseCategoryEnvNames.length,
      voice_license_use_category_configured_count:
        voiceLicenseUseCategoryConfiguredCount,
      voice_license_use_category_missing_count:
        voiceLicenseUseCategoryEnvNames.length -
        voiceLicenseUseCategoryConfiguredCount,
      original_voice_source_status: summarizeOriginalVoiceSourceStatus(
        env.IRIS_LICENSED_VOICE_SOURCE_STATUS
      ),
      original_voice_boundary_policy: {
        env_names_only: true,
        no_voice_profile_values: true,
        no_voice_source_values: true,
        no_voice_license_values: true,
        no_raw_voice_samples: true,
        no_dataset_paths: true,
        no_internal_model_paths: true,
        no_vendor_tokens: true,
        no_candidates: true,
        no_commands: true,
      },
    },
  });
}

function summarizeOriginalVoiceSourceStatus(status) {
  if (!status) return "not_configured";
  if (["licensed", "placeholder", "operator_attention_required"].includes(status)) {
    return status;
  }
  return "operator_attention_required";
}

function checkLive2dEngine(env) {
  const engineEndpointScope = summarizeLocalEndpointScope(env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT);
  const healthEndpoint = env.IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT
    ? env.IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT
    : `${env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT || ""}/health`;
  const healthEndpointScope = summarizeLocalEndpointScope(
    healthEndpoint
  );
  return checkGroup({
    integration: "real_live2d_bridge",
    mode: env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT ? "local_engine_http" : "not_configured",
    requiredEnv: [
      "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
      "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
    ],
    optionalEnv: [
      "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
      "IRIS_LOCAL_LIVE2D_ENGINE_API_KEY",
      "IRIS_LOCAL_LIVE2D_MODEL_ID",
      "IRIS_LOCAL_LIVE2D_SCENE_ID",
      "IRIS_LIVE2D_CUE_BRIDGE_HOST",
      "IRIS_LIVE2D_CUE_BRIDGE_PORT",
      "IRIS_LIVE2D_RENDERER_ENDPOINT",
      "IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT",
      "IRIS_LIVE2D_RENDERER_API_KEY",
      "IRIS_LIVE2D_CUE_BRIDGE_TIMEOUT_MS",
      "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_RETRY_BACKOFF_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_RETRY_MAX_BACKOFF_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_MAX_RETRY_ATTEMPTS",
      "IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS",
    ],
    env,
    ready: Boolean(
      env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT &&
        env.IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT &&
        engineEndpointScope.local_endpoint_allowed &&
        healthEndpointScope.local_endpoint_allowed
    ),
    localFixtureCommand: "npm run dev:bridge:engine-roundtrip",
    configuredCommand: "npm run dev:engine:probe",
    extra: {
      engine_endpoint_scope: engineEndpointScope.endpoint_scope,
      health_endpoint_scope: healthEndpointScope.endpoint_scope,
      engine_endpoint_locality_ok: engineEndpointScope.local_endpoint_allowed,
      health_endpoint_locality_ok: healthEndpointScope.local_endpoint_allowed,
      local_endpoint_policy: "loopback_or_private_network_only",
    },
  });
}

function checkObsSetup(env) {
  const bridgeEndpointExplicit = Boolean(env.IRIS_OBS_BRIDGE_ENDPOINT);
  const bridgeEndpoint =
    env.IRIS_OBS_BRIDGE_ENDPOINT ||
    `http://${env.IRIS_LOCAL_BRIDGE_HOST || "127.0.0.1"}:${env.IRIS_LOCAL_BRIDGE_PORT || "8790"}/obs-bridge`;
  const bridgeHealthEndpoint =
    env.IRIS_OBS_BRIDGE_HEALTH_ENDPOINT ||
    (bridgeEndpointExplicit ? `${bridgeEndpoint}/health` : "");
  const bridgeConfigured = bridgeEndpointExplicit;
  const bridgeHealthConfigured = Boolean(env.IRIS_OBS_BRIDGE_HEALTH_ENDPOINT);
  const manualBrowserSourceConfigured = Boolean(env.IRIS_HTTP_ORIGIN);
  const originScope = summarizeLocalEndpointScope(env.IRIS_HTTP_ORIGIN);
  const bridgeEndpointScope = summarizeLocalEndpointScope(bridgeEndpoint);
  const bridgeHealthScope = summarizeLocalEndpointScope(bridgeHealthEndpoint);
  const requiredEnv = bridgeConfigured
    ? ["IRIS_OBS_BRIDGE_ENDPOINT", "IRIS_OBS_BRIDGE_HEALTH_ENDPOINT", "IRIS_HTTP_ORIGIN"]
    : ["IRIS_HTTP_ORIGIN"];
  return checkGroup({
    integration: "production_obs_overlay",
    mode: bridgeConfigured ? "obs_setup_http" : "browser_source_manual",
    requiredEnv,
    optionalEnv: [
      "IRIS_OBS_BRIDGE_API_KEY",
      "IRIS_OBS_BRIDGE_TIMEOUT_MS",
      "IRIS_OBS_SETUP_CONTINUE_ON_ERROR",
      "IRIS_OBS_SOURCE_NAME",
      "IRIS_OBS_SCENE_NAME",
      "IRIS_OBS_SOURCE_WIDTH",
      "IRIS_OBS_SOURCE_HEIGHT",
      "IRIS_OBS_SOURCE_FPS",
      "IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE",
      "IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE",
    ],
    env,
    ready:
      manualBrowserSourceConfigured &&
      originScope.local_endpoint_allowed &&
      (!bridgeConfigured ||
        (bridgeHealthConfigured &&
          bridgeEndpointScope.local_endpoint_allowed &&
          bridgeHealthScope.local_endpoint_allowed)),
    localFixtureCommand: "npm run dev:obs:roundtrip",
    configuredCommand: bridgeConfigured
      ? "npm run dev:obs:setup"
      : "npm run dev:obs:browser-source",
    extra: {
      manual_browser_source_configured: manualBrowserSourceConfigured,
      manual_browser_source_endpoint_scope: originScope.endpoint_scope,
      manual_browser_source_locality_ok: originScope.local_endpoint_allowed,
      obs_setup_bridge_configured: bridgeConfigured,
      obs_setup_bridge_health_configured: bridgeHealthConfigured,
      obs_setup_bridge_endpoint_scope: bridgeEndpointScope.endpoint_scope,
      obs_setup_bridge_health_endpoint_scope: bridgeHealthScope.endpoint_scope,
      obs_setup_bridge_endpoint_locality_ok: bridgeEndpointScope.local_endpoint_allowed,
      obs_setup_bridge_health_endpoint_locality_ok: bridgeHealthScope.local_endpoint_allowed,
      setup_bridge_optional_for_manual_source: true,
      local_endpoint_policy: "loopback_or_private_network_only",
    },
  });
}

function checkYouTubeApi(env) {
  if (env.IRIS_YOUTUBE_LIVE_CHAT_SOURCE !== "youtube_api" && env.IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT) {
    const ingestSchedulerEnabled = env.IRIS_ENABLE_HTTP_INGEST_SCHEDULER === "true";
    const relayEndpointScope = summarizeLocalEndpointScope(env.IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT);
    return checkGroup({
      integration: "youtube_live_chat_api",
      mode: "http_relay",
      requiredEnv: ["IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT", "IRIS_ENABLE_HTTP_INGEST_SCHEDULER"],
      optionalEnv: [
        "IRIS_YOUTUBE_LIVE_CHAT_API_KEY",
        "IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS",
        "IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW",
        "IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS",
        "IRIS_YOUTUBE_BLOCKED_TEXT_TERMS",
        "IRIS_HTTP_INGEST_INTERVAL_MS",
        "IRIS_HTTP_INGEST_LIMIT",
        "IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR",
      ],
      env,
      ready: ingestSchedulerEnabled && relayEndpointScope.local_endpoint_allowed,
      localFixtureCommand: "npm run dev:youtube:relay-roundtrip",
      configuredCommand: "npm run dev:youtube:ingest-once",
      extra: {
        http_ingest_scheduler_enabled: ingestSchedulerEnabled,
        http_ingest_scheduler_required_for_live_polling: true,
        youtube_relay_endpoint_scope: relayEndpointScope.endpoint_scope,
        youtube_relay_endpoint_locality_ok: relayEndpointScope.local_endpoint_allowed,
        local_endpoint_policy: "loopback_or_private_network_only",
      },
    });
  }
  const auth = summarizeYouTubeApiAuth(env);
  const youtubeTargetEnvName = env.IRIS_YOUTUBE_LIVE_CHAT_ID
    ? "IRIS_YOUTUBE_LIVE_CHAT_ID"
    : env.IRIS_YOUTUBE_VIDEO_ID
    ? "IRIS_YOUTUBE_VIDEO_ID"
    : env.IRIS_YOUTUBE_VIDEO_URL
    ? "IRIS_YOUTUBE_VIDEO_URL"
    : "IRIS_YOUTUBE_WATCH_URL";
  const ingestSchedulerEnabled = env.IRIS_ENABLE_HTTP_INGEST_SCHEDULER === "true";
  const cursorStoreConfigured = Boolean(
    env.IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH ||
      (env.IRIS_YOUTUBE_LIVE_CHAT_SOURCE === "youtube_api" &&
        Boolean(
          env.IRIS_YOUTUBE_LIVE_CHAT_ID ||
            env.IRIS_YOUTUBE_VIDEO_ID ||
            env.IRIS_YOUTUBE_VIDEO_URL ||
            env.IRIS_YOUTUBE_WATCH_URL
        ) &&
        auth.auth_ready)
  );
  return checkGroup({
    integration: "youtube_live_chat_api",
    mode: env.IRIS_YOUTUBE_LIVE_CHAT_SOURCE === "youtube_api" ? "youtube_api" : "not_configured",
    requiredEnv: [
      "IRIS_YOUTUBE_LIVE_CHAT_SOURCE",
      youtubeTargetEnvName,
      "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
      ...(env.IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH
        ? ["IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH"]
        : []),
      ...(auth.auth_mode === "oauth_refresh_incomplete"
        ? [
            "IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN",
            "IRIS_YOUTUBE_OAUTH_CLIENT_ID",
            "IRIS_YOUTUBE_OAUTH_CLIENT_SECRET",
          ]
        : []),
    ],
    optionalEnv: [
      "IRIS_YOUTUBE_LIVE_CHAT_ID",
      "IRIS_YOUTUBE_VIDEO_ID",
      "IRIS_YOUTUBE_VIDEO_URL",
      "IRIS_YOUTUBE_WATCH_URL",
      "IRIS_YOUTUBE_DATA_API_KEY",
      "IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT",
      "IRIS_YOUTUBE_VIDEOS_API_ENDPOINT",
      "IRIS_YOUTUBE_OAUTH_TOKEN",
      "IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN",
      "IRIS_YOUTUBE_OAUTH_CLIENT_ID",
      "IRIS_YOUTUBE_OAUTH_CLIENT_SECRET",
      "IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT",
      "IRIS_YOUTUBE_OAUTH_REFRESH_TIMEOUT_MS",
      "IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS",
      "IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS",
      "IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW",
      "IRIS_YOUTUBE_LIVE_CHAT_PAGE_TOKEN",
      "IRIS_YOUTUBE_LIVE_CHAT_ERROR_BACKOFF_MS",
      "IRIS_YOUTUBE_LIVE_CHAT_MAX_ERROR_BACKOFF_MS",
      "IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS",
      "IRIS_YOUTUBE_BLOCKED_TEXT_TERMS",
      "IRIS_HTTP_INGEST_INTERVAL_MS",
      "IRIS_HTTP_INGEST_LIMIT",
      "IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR",
    ],
    env,
    ready:
      env.IRIS_YOUTUBE_LIVE_CHAT_SOURCE === "youtube_api" &&
      Boolean(
        env.IRIS_YOUTUBE_LIVE_CHAT_ID ||
          env.IRIS_YOUTUBE_VIDEO_ID ||
          env.IRIS_YOUTUBE_VIDEO_URL ||
          env.IRIS_YOUTUBE_WATCH_URL
      ) &&
      auth.auth_ready &&
      ingestSchedulerEnabled &&
      cursorStoreConfigured,
    localFixtureCommand: env.IRIS_YOUTUBE_LIVE_CHAT_ID
      ? "npm run dev:youtube:direct-live-chat-roundtrip"
      : "npm run dev:youtube:roundtrip",
    configuredCommand: "npm run dev:youtube:ingest-once",
    extra: {
      auth_mode: auth.auth_mode,
      auth_ready: auth.auth_ready,
      oauth_refresh_client_configured: auth.oauth_refresh_client_configured,
      http_ingest_scheduler_enabled: ingestSchedulerEnabled,
      http_ingest_scheduler_required_for_live_polling: true,
      cursor_store_configured: cursorStoreConfigured,
      cursor_store_required_for_restart_resume: true,
    },
  });
}

function summarizeYouTubeApiAuth(env) {
  if (env.IRIS_YOUTUBE_DATA_API_KEY) {
    return {
      auth_mode: "data_api_key",
      auth_ready: true,
      oauth_refresh_client_configured: false,
    };
  }
  if (env.IRIS_YOUTUBE_OAUTH_TOKEN) {
    return {
      auth_mode: "static_oauth",
      auth_ready: true,
      oauth_refresh_client_configured: false,
    };
  }
  if (env.IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN) {
    const clientConfigured = Boolean(
      env.IRIS_YOUTUBE_OAUTH_CLIENT_ID && env.IRIS_YOUTUBE_OAUTH_CLIENT_SECRET
    );
    return {
      auth_mode: clientConfigured ? "oauth_refresh" : "oauth_refresh_incomplete",
      auth_ready: clientConfigured,
      oauth_refresh_client_configured: clientConfigured,
    };
  }
  return {
    auth_mode: "missing",
    auth_ready: false,
    oauth_refresh_client_configured: false,
  };
}

function checkMediaAndTopicIngest(env) {
  const ingestSchedulerEnabled = env.IRIS_ENABLE_HTTP_INGEST_SCHEDULER === "true";
  const mediaWatchEndpointScope = summarizeLocalEndpointScope(env.IRIS_MEDIA_WATCH_ENDPOINT);
  const externalTopicEndpointScope = summarizeLocalEndpointScope(
    env.IRIS_EXTERNAL_TOPIC_ENDPOINT
  );
  return checkGroup({
    integration: "media_and_external_topic_ingestion",
    mode:
      env.IRIS_MEDIA_WATCH_ENDPOINT || env.IRIS_EXTERNAL_TOPIC_ENDPOINT
        ? "http_summary_bridges"
        : "not_configured",
    requiredEnv: [
      "IRIS_MEDIA_WATCH_ENDPOINT",
      "IRIS_EXTERNAL_TOPIC_ENDPOINT",
      "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
    ],
    optionalEnv: [
      "IRIS_MEDIA_WATCH_API_KEY",
      "IRIS_MEDIA_WATCH_TIMEOUT_MS",
      "IRIS_EXTERNAL_TOPIC_API_KEY",
      "IRIS_EXTERNAL_TOPIC_TIMEOUT_MS",
      "IRIS_HTTP_INGEST_INTERVAL_MS",
      "IRIS_HTTP_INGEST_LIMIT",
      "IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR",
    ],
    env,
    ready: Boolean(
      env.IRIS_MEDIA_WATCH_ENDPOINT &&
        env.IRIS_EXTERNAL_TOPIC_ENDPOINT &&
        ingestSchedulerEnabled &&
        mediaWatchEndpointScope.local_endpoint_allowed &&
        externalTopicEndpointScope.local_endpoint_allowed
    ),
    localFixtureCommand: "npm test",
    configuredCommand: "npm run dev:ingest:http",
    extra: {
      http_ingest_scheduler_enabled: ingestSchedulerEnabled,
      http_ingest_scheduler_required_for_live_polling: true,
      media_watch_endpoint_scope: mediaWatchEndpointScope.endpoint_scope,
      media_watch_endpoint_locality_ok: mediaWatchEndpointScope.local_endpoint_allowed,
      external_topic_endpoint_scope: externalTopicEndpointScope.endpoint_scope,
      external_topic_endpoint_locality_ok: externalTopicEndpointScope.local_endpoint_allowed,
      local_endpoint_policy: "loopback_or_private_network_only",
    },
  });
}

function checkPersistence(env) {
  const postgresScale = summarizePostgresScaleReadiness(env);
  const postgresMode = postgresScale.persistence_backend === "postgresql";
  return checkGroup({
    integration: "memory_and_relationship_persistence",
    mode: postgresScale.persistence_backend,
    requiredEnv: [
      "IRIS_MEMORY_STORE_PATH",
      "IRIS_RELATIONSHIP_STORE_PATH",
      "IRIS_ENABLE_CANDIDATE_PERSISTENCE",
      "IRIS_ENABLE_RELATIONSHIP_MEMORY",
    ],
    optionalEnv: [
      "IRIS_ENABLE_PERSISTENCE",
      "IRIS_MEMORY_STORE_MAX_RECORDS",
      "IRIS_MEMORY_STORE_DEDUPE",
      "IRIS_RELATIONSHIP_STORE_MAX_PROFILES",
      "IRIS_RELATIONSHIP_RECENT_SUMMARY_LIMIT",
      "IRIS_PERSISTENCE_BACKEND",
      "IRIS_POSTGRES_CONNECTION_STRING",
      "IRIS_POSTGRES_SSL_MODE",
      "IRIS_POSTGRES_MAX_POOL_SIZE",
      "IRIS_POSTGRES_MOCK_ADAPTER_ENABLED",
      "IRIS_POSTGRES_MIGRATIONS_READY",
      "IRIS_POSTGRES_INDEXES_READY",
      "IRIS_POSTGRES_BACKUP_READY",
      "IRIS_POSTGRES_TARGET_VIEWER_PROFILE_CAPACITY",
      "IRIS_MODERATION_STORE_ENABLED",
      "IRIS_MODERATION_BLOCKLIST_ENABLED",
      "IRIS_INTERNAL_RELATIONSHIP_STAGE_COUNT",
      "IRIS_PUBLIC_RELATIONSHIP_LEVEL_COUNT",
    ],
    env,
    ready: postgresMode
      ? postgresScale.postgres_production_scale_ready === true
      : Boolean(
          env.IRIS_MEMORY_STORE_PATH &&
            env.IRIS_RELATIONSHIP_STORE_PATH &&
            env.IRIS_ENABLE_CANDIDATE_PERSISTENCE === "true" &&
            env.IRIS_ENABLE_RELATIONSHIP_MEMORY === "true"
        ),
    localFixtureCommand: "npm run dev:persistence:roundtrip",
    configuredCommand: "npm run dev:persistence:status-roundtrip",
    failureCommand: "npm run dev:persistence:failure-roundtrip",
    extra: {
      ...postgresScale,
      postgres_scale_boundary_policy: {
        no_connection_values: true,
        no_database_payloads: true,
        env_names_only: true,
        readiness_flags_only: true,
        no_viewer_payloads: true,
        no_hidden_relationship_scores: true,
      },
    },
  });
}

function checkAdminReviewGate(env) {
  const actorRole = normalizeAdminReviewActorRole(env.IRIS_ADMIN_REVIEW_ACTOR_ROLE);
  const adminAuthenticated =
    env.IRIS_ADMIN_REVIEW_ADMIN_AUTHENTICATED === "true";
  const ownerConfirmed = env.IRIS_ADMIN_REVIEW_OWNER_CONFIRMED === "true";
  const actorAllowed = actorRole === "owner" || actorRole === "admin";
  return checkGroup({
    integration: "admin_review_private_runner_gate",
    mode: actorAllowed ? actorRole : "operator_review_pending",
    requiredEnv: [
      "IRIS_ADMIN_REVIEW_DECISION_LOG_PATH",
      "IRIS_ADMIN_REVIEW_ADMIN_AUTHENTICATED",
      "IRIS_ADMIN_REVIEW_OWNER_CONFIRMED",
      "IRIS_ADMIN_REVIEW_ACTOR_ROLE",
    ],
    optionalEnv: [],
    env,
    ready:
      Boolean(env.IRIS_ADMIN_REVIEW_DECISION_LOG_PATH) &&
      adminAuthenticated &&
      ownerConfirmed &&
      actorAllowed,
    localFixtureCommand: "npm run dev:admin:review-auth-gate",
    configuredCommand: "npm run dev:admin:review-validator-run-plan",
    extra: {
      decision_log_path_configured: Boolean(env.IRIS_ADMIN_REVIEW_DECISION_LOG_PATH),
      admin_authenticated_flag_enabled: adminAuthenticated,
      owner_confirmed_flag_enabled: ownerConfirmed,
      admin_review_actor_role_label: actorRole,
      admin_review_actor_role_allowed: actorAllowed,
      private_runner_auth_gate_required: true,
      private_runner_input_materialized_by_doctor: false,
      private_validator_called_by_doctor: false,
      validator_commit_performed_by_doctor: false,
    },
  });
}

function summarizePostgresScaleReadiness(env) {
  const backend = normalizePersistenceBackend(env.IRIS_PERSISTENCE_BACKEND);
  const targetCapacity = clampInteger(
    env.IRIS_POSTGRES_TARGET_VIEWER_PROFILE_CAPACITY,
    0,
    1_000_000_000,
    0
  );
  const internalStageCount = clampInteger(
    env.IRIS_INTERNAL_RELATIONSHIP_STAGE_COUNT,
    0,
    10_000,
    0
  );
  const publicLevelCount = clampInteger(
    env.IRIS_PUBLIC_RELATIONSHIP_LEVEL_COUNT,
    0,
    1000,
    0
  );
  const connectionConfigured = Boolean(env.IRIS_POSTGRES_CONNECTION_STRING);
  const mockAdapterEnabled = env.IRIS_POSTGRES_MOCK_ADAPTER_ENABLED === "true";
  const migrationsReady = env.IRIS_POSTGRES_MIGRATIONS_READY === "true";
  const indexesReady = env.IRIS_POSTGRES_INDEXES_READY === "true";
  const backupReady = env.IRIS_POSTGRES_BACKUP_READY === "true";
  const moderationStoreEnabled = env.IRIS_MODERATION_STORE_ENABLED === "true";
  const blocklistEnabled = env.IRIS_MODERATION_BLOCKLIST_ENABLED === "true";
  const stageCountReady = internalStageCount === 100;
  const publicLevelCountReady = publicLevelCount === 8;
  const capacityReady = targetCapacity >= 1_000_000;
  const postgresProductionScaleReady =
    backend === "postgresql" &&
    !mockAdapterEnabled &&
    connectionConfigured &&
    migrationsReady &&
    indexesReady &&
    backupReady &&
    moderationStoreEnabled &&
    blocklistEnabled &&
    stageCountReady &&
    publicLevelCountReady &&
    capacityReady;
  return {
    persistence_backend: backend,
    postgres_adapter_mode:
      backend === "postgresql"
        ? mockAdapterEnabled
          ? "mock_adapter"
          : "real_adapter_pending"
        : "disabled",
    postgres_mock_adapter_enabled: mockAdapterEnabled,
    postgres_real_database_required_for_production: backend === "postgresql",
    postgres_real_database_connection_attempted_by_doctor: false,
    postgres_connection_configured: connectionConfigured,
    postgres_ssl_mode_configured: Boolean(env.IRIS_POSTGRES_SSL_MODE),
    postgres_pool_configured: Boolean(env.IRIS_POSTGRES_MAX_POOL_SIZE),
    postgres_migrations_ready: migrationsReady,
    postgres_indexes_ready: indexesReady,
    postgres_backup_ready: backupReady,
    postgres_target_capacity_ready: capacityReady,
    postgres_target_capacity_band: capacityReady
      ? "one_million_plus"
      : targetCapacity > 0
        ? "below_one_million"
        : "not_configured",
    moderation_store_enabled: moderationStoreEnabled,
    moderation_blocklist_enabled: blocklistEnabled,
    internal_relationship_stage_count_ready: stageCountReady,
    public_relationship_level_count_ready: publicLevelCountReady,
    internal_relationship_stage_policy: "0_to_99",
    public_relationship_level_policy: "8_plus_bounded",
    postgres_production_scale_ready: postgresProductionScaleReady,
  };
}

function normalizePersistenceBackend(value) {
  const text = String(value ?? "json_store").trim().toLowerCase();
  if (text === "postgres" || text === "postgresql") return "postgresql";
  return "json_store";
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

function checkVectorMemorySearch(env) {
  const endpointScope = summarizeLocalEndpointScope(env.IRIS_MEMORY_SEARCH_ENDPOINT);
  return checkGroup({
    integration: "production_vector_memory",
    mode: env.IRIS_MEMORY_SEARCH_ADAPTER ?? "local",
    requiredEnv: ["IRIS_MEMORY_SEARCH_ADAPTER", "IRIS_MEMORY_SEARCH_ENDPOINT"],
    optionalEnv: ["IRIS_MEMORY_SEARCH_API_KEY", "IRIS_MEMORY_SEARCH_TIMEOUT_MS"],
    env,
    ready:
      env.IRIS_MEMORY_SEARCH_ADAPTER === "http_vector" &&
      Boolean(env.IRIS_MEMORY_SEARCH_ENDPOINT) &&
      endpointScope.local_endpoint_allowed,
    localFixtureCommand: "npm run dev:memory-vector:roundtrip",
    configuredCommand: "npm run dev:memory-vector:roundtrip",
    extra: {
      memory_search_endpoint_scope: endpointScope.endpoint_scope,
      memory_search_endpoint_locality_ok: endpointScope.local_endpoint_allowed,
      local_endpoint_policy: "loopback_or_private_network_only",
    },
  });
}

function checkVision(env) {
  const methodConfigured = Boolean(env.IRIS_GAME_OBSERVATION_METHOD);
  const methodSupported = ["GET", "POST"].includes(
    String(env.IRIS_GAME_OBSERVATION_METHOD ?? "").toUpperCase()
  );
  const ingestSchedulerEnabled = env.IRIS_ENABLE_HTTP_INGEST_SCHEDULER === "true";
  const endpointScope = summarizeLocalEndpointScope(env.IRIS_GAME_OBSERVATION_ENDPOINT);
  return checkGroup({
    integration: "real_screen_capture_or_vision_ingestion",
    mode: env.IRIS_GAME_OBSERVATION_ENDPOINT ? "http_game_observation" : "not_configured",
    requiredEnv: [
      "IRIS_GAME_OBSERVATION_ENDPOINT",
      "IRIS_GAME_OBSERVATION_METHOD",
      "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
    ],
    optionalEnv: [
      "IRIS_GAME_OBSERVATION_API_KEY",
      "IRIS_GAME_OBSERVATION_TIMEOUT_MS",
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
      "IRIS_HTTP_INGEST_INTERVAL_MS",
      "IRIS_HTTP_INGEST_LIMIT",
      "IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR",
    ],
    env,
    ready:
      Boolean(env.IRIS_GAME_OBSERVATION_ENDPOINT) &&
      methodConfigured &&
      methodSupported &&
      ingestSchedulerEnabled &&
      endpointScope.local_endpoint_allowed,
    localFixtureCommand: "npm run dev:vision:game-roundtrip",
    configuredCommand: "npm run dev:ingest:http",
    failureCommand: "npm run dev:vision:unsafe-roundtrip",
    extra: {
      request_method_configured: methodConfigured,
      request_method_supported: methodSupported,
      http_ingest_scheduler_enabled: ingestSchedulerEnabled,
      http_ingest_scheduler_required_for_screen_polling: true,
      vision_endpoint_scope: endpointScope.endpoint_scope,
      vision_endpoint_locality_ok: endpointScope.local_endpoint_allowed,
      local_endpoint_policy: "loopback_or_private_network_only",
    },
  });
}

function checkGameControl(env) {
  const actionSummary = summarizeConfiguredGameActions(env.IRIS_AVAILABLE_GAME_ACTIONS);
  const gameControlEnabled = env.IRIS_ENABLE_GAME_CONTROL === "true";
  const httpAdapterConfigured = env.IRIS_GAME_CONTROL_ADAPTER === "http";
  const endpointConfigured = Boolean(env.IRIS_GAME_CONTROL_ENDPOINT);
  const endpointScope = summarizeLocalEndpointScope(env.IRIS_GAME_CONTROL_ENDPOINT);
  return checkGroup({
    integration: "approved_game_control_adapter",
    mode: gameControlMode(env.IRIS_GAME_CONTROL_ADAPTER),
    requiredEnv: [
      "IRIS_ENABLE_GAME_CONTROL",
      "IRIS_GAME_CONTROL_ADAPTER",
      "IRIS_GAME_CONTROL_ENDPOINT",
      "IRIS_AVAILABLE_GAME_ACTIONS",
    ],
    optionalEnv: [
      "IRIS_GAME_CONTROL_API_KEY",
      "IRIS_GAME_CONTROL_TIMEOUT_MS",
      "IRIS_GAME_CONTROL_MIN_INTERVAL_MS",
      "IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS",
    ],
    env,
    ready: Boolean(
        gameControlEnabled &&
        httpAdapterConfigured &&
        endpointConfigured &&
        endpointScope.local_endpoint_allowed &&
        actionSummary.available_actions_configured &&
        actionSummary.available_action_count > 0 &&
        actionSummary.fallback_to_wait_when_unconfigured === false
    ),
    localFixtureCommand: "npm run dev:game-control:roundtrip",
    configuredCommand: "npm run dev:game-control:roundtrip",
    extra: {
      game_control_enabled_configured: gameControlEnabled,
      game_control_http_adapter_configured: httpAdapterConfigured,
      game_control_endpoint_configured: endpointConfigured,
      game_control_endpoint_scope: endpointScope.endpoint_scope,
      game_control_endpoint_locality_ok: endpointScope.local_endpoint_allowed,
      local_endpoint_policy: "loopback_or_private_network_only",
      ...actionSummary,
    },
  });
}

function gameControlMode(value) {
  if (!value) return "mock";
  if (value === "http" || value === "mock") return value;
  return "unsupported_adapter";
}

function normalizeAdminReviewActorRole(value) {
  const role = String(value ?? "operator").trim().toLowerCase();
  return ["owner", "admin", "operator"].includes(role) ? role : "operator";
}

function summarizeConfiguredGameActions(value) {
  const rawItems = String(value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const supported = [...new Set(rawItems.filter((item) => GAME_ACTION_KINDS.has(item)))];
  return {
    available_actions_configured: rawItems.length > 0,
    available_action_count: supported.length,
    unsupported_action_name_count: rawItems.filter((item) => !GAME_ACTION_KINDS.has(item)).length,
    fallback_to_wait_when_unconfigured: supported.length === 0,
  };
}

function checkGroup({
  integration,
  mode,
  requiredEnv,
  optionalEnv,
  env,
  ready,
  localFixtureCommand,
  configuredCommand,
  failureCommand = null,
  extra = {},
}) {
  const configuredEnv = [...requiredEnv, ...optionalEnv].filter((name) => Boolean(env[name]));
  const missingEnv = requiredEnv.filter((name) => !env[name]);
  const readinessState = readinessStateForConfigCheck({
    ready,
    missingEnv,
    extra,
  });
  const check = {
    schema: "iris_production_config_check_v1",
    integration,
    mode,
    status: ready ? "ready" : "attention",
    readiness_state: readinessState,
    configured_env: configuredEnv,
    missing_env: missingEnv,
    local_fixture_available: true,
    local_fixture_command: localFixtureCommand,
    configured_command: configuredCommand,
    failure_command: failureCommand,
    ...extra,
    boundary_policy: {
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      read_only_check: true,
    },
  };
  assertDoctorCheckSafe(check, integration);
  return check;
}

function assertDoctorCheckSafe(check, context) {
  if (!check || typeof check !== "object") {
    throw new ContractError(`${context}: invalid doctor check`);
  }
  assertNoForbiddenDoctorFields(check, context);
  if (check.schema !== "iris_production_config_check_v1") {
    throw new ContractError(`${context}: invalid check schema`, { schema: check.schema });
  }
  if (!["ready", "attention"].includes(check.status)) {
    throw new ContractError(`${context}: invalid check status`, { status: check.status });
  }
  assertSafeReadinessState(check.readiness_state, context);
  if (check.status === "ready" && check.readiness_state !== "ready") {
    throw new ContractError(`${context}: ready check must have ready readiness state`);
  }
  assertEndpointScopeFieldsSafe(check, context);
  assertDoctorCheckBoundaryPolicySafe(check.boundary_policy, context);
  if (Object.hasOwn(check, "original_voice_boundary_policy")) {
    assertBoundaryPolicy(
      check.original_voice_boundary_policy,
      ORIGINAL_VOICE_BOUNDARY_FIELDS,
      `${context}: original voice boundary policy`
    );
  }
  if (Object.hasOwn(check, "postgres_scale_boundary_policy")) {
    assertBoundaryPolicy(
      check.postgres_scale_boundary_policy,
      POSTGRES_SCALE_BOUNDARY_FIELDS,
      `${context}: postgres scale boundary policy`
    );
  }
}

function assertDoctorBoundaryPolicySafe(policy, context) {
  assertBoundaryPolicy(
    policy,
    DOCTOR_REPORT_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

function assertDoctorCheckBoundaryPolicySafe(policy, context) {
  assertBoundaryPolicy(
    policy,
    DOCTOR_CHECK_BOUNDARY_FIELDS,
    `${context}: check boundary policy`
  );
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNoForbiddenDoctorFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenDoctorFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_DOCTOR_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe production doctor field`, { field, path });
    }
    assertNoForbiddenDoctorFields(child, context, `${path}.${field}`);
  }
}

function assertEndpointScopeFieldsSafe(check, context) {
  const allowedScopes = new Set(["not_configured", "invalid", "loopback", "private_network", "external"]);
  for (const [field, value] of Object.entries(check)) {
    if (field.endsWith("_endpoint_scope") || field === "manual_browser_source_endpoint_scope") {
      if (!allowedScopes.has(value)) {
        throw new ContractError(`${context}: invalid endpoint scope`, { field, value });
      }
    }
    if (field.endsWith("_locality_ok") || field === "manual_browser_source_locality_ok") {
      if (typeof value !== "boolean") {
        throw new ContractError(`${context}: invalid endpoint locality flag`, { field, value });
      }
    }
  }
}

function readinessStateForConfigCheck({ ready, missingEnv, extra }) {
  if (ready) return "ready";
  if (hasUnsupportedOperatorChoice(extra)) return "operator_review_required";
  if (missingEnv.length > 0) return "configuration_waiting";
  if (hasUnsafeLocalEndpointScope(extra)) return "operator_review_required";
  return "configuration_waiting";
}

function hasUnsafeLocalEndpointScope(extra) {
  for (const [field, value] of Object.entries(extra)) {
    if (
      (field.endsWith("_locality_ok") ||
        field === "manual_browser_source_locality_ok") &&
      value === false
    ) {
      return true;
    }
  }
  return false;
}

function hasUnsupportedOperatorChoice(extra) {
  return (
    extra.request_method_supported === false ||
    extra.game_control_http_adapter_configured === false ||
    (Number.isInteger(extra.unsupported_action_name_count) &&
      extra.unsupported_action_name_count > 0)
  );
}

function countReadinessStates(items) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const item of items) {
    const state = item.readiness_state;
    if (READINESS_STATES.has(state)) counts[state] += 1;
  }
  return counts;
}

function assertSafeReadinessState(state, context) {
  if (!READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`, { state });
  }
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness state count`, {
        state,
      });
    }
  }
  for (const state of Object.keys(counts)) {
    if (!READINESS_STATES.has(state)) {
      throw new ContractError(`${context}: unexpected readiness state count`, {
        state,
      });
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every((state) => left?.[state] === right?.[state]);
}
