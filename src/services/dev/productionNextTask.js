import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationStatusReportSafe,
  createFoundationStatusReport,
} from "./foundationStatus.js";
import {
  assertFoundationLaunchPlanSafe,
  createFoundationLaunchPlan,
} from "./foundationLaunchPlan.js";
import {
  assertGameplayLaunchPlanSafe,
  createGameplayLaunchPlan,
} from "./gameplayLaunchPlan.js";
import {
  assertGameplayPreflightReportSafe,
  createGameplayPreflightReport,
} from "./gameplayPreflight.js";
import {
  assertGameplayStartupChecklistSafe,
  createGameplayStartupChecklist,
} from "./gameplayStartupChecklist.js";
import {
  assertPersistenceLaunchPlanSafe,
  createPersistenceLaunchPlan,
} from "./persistenceLaunchPlan.js";
import {
  assertPersistencePreflightReportSafe,
  createPersistencePreflightReport,
} from "./persistencePreflight.js";
import {
  assertPersistenceStartupChecklistSafe,
  createPersistenceStartupChecklist,
} from "./persistenceStartupChecklist.js";
import {
  assertPostgresAdminSavePreflightReportSafe,
  createPostgresAdminSavePreflightReport,
} from "./postgresAdminSavePreflight.js";
import {
  assertYouTubeIngestLaunchPlanSafe,
  createYouTubeIngestLaunchPlan,
} from "./youtubeIngestLaunchPlan.js";
import {
  assertYouTubeIngestPreflightReportSafe,
  createYouTubeIngestPreflightReport,
} from "./youtubeIngestPreflight.js";
import {
  assertYouTubeIngestSourceStatusReportSafe,
  createYouTubeIngestSourceStatusReport,
} from "./youtubeIngestSourceStatus.js";
import {
  assertYouTubeRelayStartupChecklistSafe,
  createYouTubeRelayStartupChecklist,
} from "./youtubeRelayStartupChecklist.js";
import {
  ANIME_PERFORMANCE_IDENTITY_SURFACE_ENV_GROUPS,
  ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES,
} from "./adminCharacterVoiceSettings.js";

const FORBIDDEN_NEXT_TASK_FIELDS = new Set([
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
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "value",
  "payload",
  "raw_frame",
  "ocr_text",
  "image",
  "frame",
]);

const OVERALL_STATUSES = new Set(["continue_priority_tasks", "ready_for_live_operation"]);
const PRODUCTION_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "next_task_report_only",
  "real_processes_not_started_by_report",
  "live_polling_not_started_by_report",
  "real_game_or_os_input_not_started",
  "runtime_packets_remain_adapter_gated",
  "memory_and_relationship_candidates_remain_gated",
  "input_action_candidates_never_forwarded_directly",
  "admin_review_private_runner_not_started_by_report",
  "admin_review_runner_input_not_materialized_by_report",
  "stage_count",
  "ready_gate_count",
  "attention_gate_count",
  "next_stage_id",
  "next_priority",
  "next_status_script",
  "next_verification_script",
  "next_runtime_verification_script",
  "runtime_handoff_status_script",
  "production_loop_verification_script",
  "next_startup_checklist_script",
  "next_readiness_state",
  "readiness_state_counts",
  "postgres_admin_save_preflight_script",
  "admin_review_auth_gate_script",
  "admin_review_validator_run_plan_script",
]);
const GATE_STATUSES = new Set([
  "ready_for_runtime_handoff",
  "attention_required",
  "ready_to_poll_youtube_ingest",
  "blocked_by_configuration",
  "youtube_source_not_ready",
  "ready_to_persist_memory_and_relationships",
  "ready_to_poll_game_and_approve_control",
]);
const RUNTIME_EXPECTED_STATUSES = new Set([
  "ready_for_obs_runtime_handoff",
  "polling_active",
  "active_with_memory_and_relationships",
  "safe_control_active",
]);
const RUNTIME_FLOW_IDS = new Set([
  "runtime_handoff_flow",
  "live_chat_ingest_flow",
  "memory_relationship_lifecycle_flow",
  "safe_action_lifecycle_flow",
]);
const RUNTIME_FLOW_SCHEMAS = new Set([
  "iris_foundation_runtime_handoff_flow_summary_v1",
  "iris_youtube_live_chat_ingest_flow_summary_v1",
  "iris_persistence_memory_relationship_lifecycle_flow_summary_v1",
  "iris_gameplay_safe_action_lifecycle_flow_summary_v1",
]);
const RUNTIME_FLOW_EXPECTED_STATUSES = new Set([
  "ready_for_obs_runtime_handoff",
  "runtime_active_with_comments_and_support",
  "memory_and_relationship_active",
  "safe_control_active",
]);
const RUNTIME_FLOW_EXPECTED_BLOCKING_STAGES = new Set(["none"]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const STAGE_IDS = new Set([
  "tts_live2d_obs_foundation",
  "youtube_comments_and_support",
  "memory_and_relationship_persistence",
  "vision_and_safe_game_control",
]);
const PRIORITY_GATE_EXPECTATIONS = Object.freeze({
  tts_live2d_obs_foundation: Object.freeze({
    priority: 1,
    stage_label: "real_tts_live2d_obs_foundation",
    status_script: "npm run dev:foundation:runtime-status",
    preflight_script: "npm run dev:foundation:preflight",
    launch_plan_script: "npm run dev:foundation:launch-plan",
    startup_checklist_script: "npm run dev:foundation:startup-checklist",
    runtime_verification_script: "npm run dev:obs:runtime-render-roundtrip",
    expected_runtime_status: "ready_for_obs_runtime_handoff",
    runtime_flow_id: "runtime_handoff_flow",
    runtime_flow_schema: "iris_foundation_runtime_handoff_flow_summary_v1",
    expected_runtime_flow_status: "ready_for_obs_runtime_handoff",
    expected_runtime_blocking_stage: "none",
  }),
  youtube_comments_and_support: Object.freeze({
    priority: 2,
    stage_label: "youtube_comments_support_and_side_sources",
    status_script: "npm run dev:youtube:runtime-status",
    preflight_script: "npm run dev:youtube:preflight",
    launch_plan_script: "npm run dev:youtube:launch-plan",
    startup_checklist_script: "npm run dev:youtube:relay-startup-checklist",
    runtime_verification_script: "npm run dev:youtube:runtime-ingest-roundtrip",
    expected_runtime_status: "polling_active",
    runtime_flow_id: "live_chat_ingest_flow",
    runtime_flow_schema: "iris_youtube_live_chat_ingest_flow_summary_v1",
    expected_runtime_flow_status: "runtime_active_with_comments_and_support",
    expected_runtime_blocking_stage: "none",
  }),
  memory_and_relationship_persistence: Object.freeze({
    priority: 3,
    stage_label: "long_term_memory_and_relationship_persistence",
    status_script: "npm run dev:persistence:runtime-status",
    preflight_script: "npm run dev:persistence:preflight",
    launch_plan_script: "npm run dev:persistence:launch-plan",
    startup_checklist_script: "npm run dev:persistence:startup-checklist",
    runtime_verification_script: "npm run dev:persistence:roundtrip",
    expected_runtime_status: "active_with_memory_and_relationships",
    runtime_flow_id: "memory_relationship_lifecycle_flow",
    runtime_flow_schema:
      "iris_persistence_memory_relationship_lifecycle_flow_summary_v1",
    expected_runtime_flow_status: "memory_and_relationship_active",
    expected_runtime_blocking_stage: "none",
  }),
  vision_and_safe_game_control: Object.freeze({
    priority: 4,
    stage_label: "game_screen_recognition_and_safe_action_approval",
    status_script: "npm run dev:gameplay:runtime-status",
    preflight_script: "npm run dev:gameplay:preflight",
    launch_plan_script: "npm run dev:gameplay:launch-plan",
    startup_checklist_script: "npm run dev:gameplay:startup-checklist",
    runtime_verification_script: "npm run dev:gameplay:runtime-roundtrip",
    expected_runtime_status: "safe_control_active",
    runtime_flow_id: "safe_action_lifecycle_flow",
    runtime_flow_schema: "iris_gameplay_safe_action_lifecycle_flow_summary_v1",
    expected_runtime_flow_status: "safe_control_active",
    expected_runtime_blocking_stage: "none",
  }),
});
const URL_PATTERN = /https?:\/\//i;
const SAFE_DIAGNOSTIC_BOOLEAN_FIELDS = new Set([
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
  "source_configured",
  "source_status_available",
  "ingest_scheduler_enabled",
  "scheduler_required_for_live_polling",
  "auth_ready",
  "oauth_refresh_client_configured",
  "cursor_store_configured",
  "cursor_store_required_for_restart_resume",
  "memory_store_path_configured",
  "relationship_store_path_configured",
  "candidate_persistence_ready",
  "relationship_memory_ready",
  "vector_memory_adapter_ready",
  "vector_memory_required_for_production_search",
  "vision_target_configured",
  "vision_request_method_configured",
  "vision_request_method_supported",
  "scheduler_required_for_screen_polling",
  "game_control_enabled",
  "game_control_http_adapter_ready",
  "game_control_target_configured",
  "available_actions_configured",
  "fallback_to_wait_when_unconfigured",
  "rate_limit_env_configured",
  "stale_observation_guard_env_configured",
]);
const SAFE_DIAGNOSTIC_COUNT_FIELDS = new Set([
  "attention_reason_count",
  "missing_required_env_count",
  "configured_env_count",
  "foundation_check_count",
  "foundation_ready_check_count",
  "foundation_attention_check_count",
  "foundation_integration_count",
  "foundation_configured_integration_count",
  "foundation_attention_integration_count",
  "ingest_stage_integration_count",
  "ingest_stage_ready_integration_count",
  "ingest_stage_attention_integration_count",
  "persistence_stage_integration_count",
  "persistence_stage_ready_integration_count",
  "persistence_stage_attention_integration_count",
  "gameplay_stage_integration_count",
  "gameplay_stage_ready_integration_count",
  "gameplay_stage_attention_integration_count",
  "launch_step_count",
  "ready_launch_step_count",
  "attention_launch_step_count",
  "next_launch_step_order",
  "verification_script_count",
  "approved_action_kind_count",
  "unsupported_action_name_count",
]);
const SAFE_DIAGNOSTIC_LABEL_FIELDS = new Set([
  "gate_status",
  "stage_status",
  "next_attention_reason",
  "launch_plan_status",
  "local_bridge_worker_readiness_status",
  "tts_adapter_readiness_status",
  "live2d_adapter_readiness_status",
  "subtitle_adapter_readiness_status",
  "obs_handoff_readiness_status",
  "original_voice_source_status",
  "source_mode",
  "auth_mode",
  "local_target_policy_status",
  "source_kind",
  "source_instantiation_status",
  "source_error_kind",
  "json_store_status",
  "vector_memory_status",
  "persistence_mode",
  "vector_memory_mode",
  "vector_memory_target_policy_status",
  "vision_status",
  "game_control_status",
  "vision_mode",
  "game_control_mode",
  "vision_target_policy_status",
  "game_control_target_policy_status",
  "expected_runtime_status",
  "expected_runtime_flow_status",
]);
const REPORT_BOUNDARY_FIELDS = Object.freeze([
  "env_names_only",
  "script_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_text_payloads",
  "no_memory_records",
  "no_relationship_records",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
  "read_only_next_task",
]);
const GATE_BOUNDARY_FIELDS = Object.freeze([
  "script_names_only",
  "env_counts_only",
  "env_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
  "read_only_gate",
]);
const STARTUP_SUMMARY_BOUNDARY_FIELDS = Object.freeze([
  "script_names_only",
  "env_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
  "read_only_startup_summary",
]);
const ANIME_PERFORMANCE_ATTENTION_AREAS =
  ANIME_PERFORMANCE_IDENTITY_SURFACE_ENV_GROUPS;
const ANIME_PERFORMANCE_ENV_NAMES = Object.freeze(
  ANIME_PERFORMANCE_ATTENTION_AREAS.flatMap(([, envNames]) => envNames)
);
const ANIME_PERFORMANCE_REFERENCE_ENV_NAMES =
  envNamesForAnimeAttentionArea("anime_reference_profile");
const ANIME_PERFORMANCE_EXPRESSION_MOTION_ENV_NAMES =
  envNamesForAnimeAttentionArea("expression_motion_match");
const ANIME_PERFORMANCE_VOICE_SPEECH_ENV_NAMES =
  envNamesForAnimeAttentionArea("voice_speech_match");
const ANIME_IP_GOVERNANCE_ENV_NAMES = envNamesForAnimeAttentionArea(
  "ip_governance"
);
const ANIME_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES =
  envNamesForAnimeAttentionArea("voice_license_use_categories");
const ANIME_PERFORMANCE_CATEGORY_PREFIXES =
  ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES;
const ANIME_PERFORMANCE_BOUNDARY_FIELDS = Object.freeze([
  "counts_statuses_scripts_and_env_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_character_reference_materials",
  "no_voice_samples",
  "no_animation_materials",
  "no_script_text",
  "read_only_admin_attention_summary",
]);

function envNamesForAnimeAttentionArea(areaId) {
  const area = ANIME_PERFORMANCE_ATTENTION_AREAS.find(
    ([candidateAreaId]) => candidateAreaId === areaId
  );
  if (!area) {
    throw new ContractError(`production next task: missing anime area ${areaId}`);
  }
  return area[1];
}

const GROWTH_BUSINESS_ENV_NAMES = Object.freeze([
  "IRIS_FAN_GROWTH_LIFECYCLE_POLICY_ID",
  "IRIS_COMMUNITY_RITUAL_REVIEW_POLICY_ID",
  "IRIS_AI_TRANSPARENCY_DISCLOSURE_POLICY_ID",
  "IRIS_CONTENT_STRATEGY_APPROVAL_POLICY_ID",
  "IRIS_MONETIZATION_SAFETY_POLICY_ID",
  "IRIS_OPERATOR_COMFORT_CHECKLIST_ID",
  "IRIS_COST_GOVERNANCE_BUDGET_POLICY_ID",
  "IRIS_PUBLIC_ANALYTICS_EXPORT_POLICY_ID",
]);
const GROWTH_BUSINESS_ATTENTION_AREAS = Object.freeze([
  Object.freeze([
    "fan_community",
    Object.freeze([
      "IRIS_FAN_GROWTH_LIFECYCLE_POLICY_ID",
      "IRIS_COMMUNITY_RITUAL_REVIEW_POLICY_ID",
    ]),
  ]),
  Object.freeze([
    "trust_content",
    Object.freeze([
      "IRIS_AI_TRANSPARENCY_DISCLOSURE_POLICY_ID",
      "IRIS_CONTENT_STRATEGY_APPROVAL_POLICY_ID",
    ]),
  ]),
  Object.freeze([
    "monetization_cost",
    Object.freeze([
      "IRIS_MONETIZATION_SAFETY_POLICY_ID",
      "IRIS_COST_GOVERNANCE_BUDGET_POLICY_ID",
    ]),
  ]),
  Object.freeze([
    "operator_analytics",
    Object.freeze([
      "IRIS_OPERATOR_COMFORT_CHECKLIST_ID",
      "IRIS_PUBLIC_ANALYTICS_EXPORT_POLICY_ID",
    ]),
  ]),
]);
const GROWTH_BUSINESS_BOUNDARY_FIELDS = Object.freeze([
  "counts_statuses_scripts_and_env_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_policy_values",
  "no_viewer_data",
  "no_support_text",
  "no_analytics_payloads",
  "read_only_admin_attention_summary",
]);

export function createProductionNextTaskReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const foundation = createFoundationStatusReport({ env, generatedAtMs });
  const foundationLaunchPlan = createFoundationLaunchPlan({ env, generatedAtMs });
  const youtubePreflight = createYouTubeIngestPreflightReport({ env, generatedAtMs });
  const youtubeLaunchPlan = createYouTubeIngestLaunchPlan({ env, generatedAtMs });
  const youtubeSourceStatus = createYouTubeIngestSourceStatusReport({
    env,
    generatedAtMs,
  });
  const youtubeRelayStartupChecklist = createYouTubeRelayStartupChecklist({
    generatedAtMs,
  });
  const persistence = createPersistencePreflightReport({ env, generatedAtMs });
  const persistenceLaunchPlan = createPersistenceLaunchPlan({ env, generatedAtMs });
  const persistenceStartupChecklist = createPersistenceStartupChecklist({
    generatedAtMs,
  });
  const postgresAdminSavePreflight = createPostgresAdminSavePreflightReport({
    env,
    generatedAtMs,
  });
  const gameplay = createGameplayPreflightReport({ env, generatedAtMs });
  const gameplayLaunchPlan = createGameplayLaunchPlan({ env, generatedAtMs });
  const gameplayStartupChecklist = createGameplayStartupChecklist({
    generatedAtMs,
  });

  assertFoundationStatusReportSafe(foundation, "production next task foundation");
  assertFoundationLaunchPlanSafe(
    foundationLaunchPlan,
    "production next task foundation launch plan"
  );
  assertYouTubeIngestPreflightReportSafe(
    youtubePreflight,
    "production next task youtube preflight"
  );
  assertYouTubeIngestLaunchPlanSafe(
    youtubeLaunchPlan,
    "production next task youtube launch plan"
  );
  assertYouTubeIngestSourceStatusReportSafe(
    youtubeSourceStatus,
    "production next task youtube source status"
  );
  assertYouTubeRelayStartupChecklistSafe(
    youtubeRelayStartupChecklist,
    "production next task youtube relay startup checklist"
  );
  assertPersistencePreflightReportSafe(persistence, "production next task persistence");
  assertPersistenceLaunchPlanSafe(
    persistenceLaunchPlan,
    "production next task persistence launch plan"
  );
  assertPersistenceStartupChecklistSafe(
    persistenceStartupChecklist,
    "production next task persistence startup checklist"
  );
  assertPostgresAdminSavePreflightReportSafe(
    postgresAdminSavePreflight,
    "production next task postgres admin save preflight"
  );
  assertGameplayPreflightReportSafe(gameplay, "production next task gameplay");
  assertGameplayLaunchPlanSafe(
    gameplayLaunchPlan,
    "production next task gameplay launch plan"
  );
  assertGameplayStartupChecklistSafe(
    gameplayStartupChecklist,
    "production next task gameplay startup checklist"
  );

  const priorityGates = [
    createFoundationGate({ foundation, foundationLaunchPlan }),
    createYouTubeGate({
      youtubePreflight,
      youtubeSourceStatus,
      youtubeLaunchPlan,
      youtubeRelayStartupChecklist,
    }),
    createPersistenceGate({
      persistence,
      persistenceLaunchPlan,
      persistenceStartupChecklist,
    }),
    createGameplayGate({
      gameplay,
      gameplayLaunchPlan,
      gameplayStartupChecklist,
    }),
  ];
  const nextGate = priorityGates.find((gate) => gate.ready !== true) ?? null;
  const nextReadinessState = firstReadinessState(priorityGates);
  const readinessStateCounts = countReadinessStates(priorityGates);
  const report = {
    schema: "iris_production_next_task_report_v1",
    generated_at_ms: generatedAtMs,
    overall_status: nextGate ? "continue_priority_tasks" : "ready_for_live_operation",
    next_priority: nextGate?.priority ?? null,
    next_stage_id: nextGate?.stage_id ?? null,
    next_status_script: nextGate?.status_script ?? null,
    next_verification_script: nextGate?.first_verification_script ?? null,
    next_runtime_verification_script:
      nextGate?.runtime_verification_script ?? null,
    runtime_handoff_status_script:
      "npm run dev:production:runtime-handoff-status",
    production_loop_verification_script:
      "npm run dev:production-loop:roundtrip",
    next_startup_checklist_script:
      nextGate?.startup_checklist_script ?? null,
    next_launch_script: nextGate?.next_launch_script ?? null,
    next_readiness_script: nextGate?.next_readiness_script ?? null,
    next_configure_env: nextGate?.next_configure_env ?? [],
    next_expected_runtime_status: nextGate?.expected_runtime_status ?? null,
    next_diagnostic_detail: nextGate?.diagnostic_detail ?? null,
    next_operator_startup_summary: nextGate?.operator_startup_summary ?? null,
    anime_performance_admin_attention_summary:
      createAnimePerformanceAdminAttentionSummary(env),
    growth_business_admin_attention_summary:
      createGrowthBusinessAdminAttentionSummary(env),
    postgres_admin_save_preflight_summary:
      createPostgresAdminSavePreflightSummary(postgresAdminSavePreflight),
    next_readiness_state: nextReadinessState,
    readiness_state_counts: readinessStateCounts,
    ready_gate_count: priorityGates.filter((gate) => gate.ready === true).length,
    attention_gate_count: priorityGates.filter((gate) => gate.ready !== true)
      .length,
    priority_gates: priorityGates,
    production_handoff_summary: {
      schema: "iris_production_next_task_handoff_summary_v1",
      next_task_report_only: true,
      real_processes_not_started_by_report: true,
      live_polling_not_started_by_report: true,
      real_game_or_os_input_not_started: true,
      runtime_packets_remain_adapter_gated: true,
      memory_and_relationship_candidates_remain_gated: true,
      input_action_candidates_never_forwarded_directly: true,
      admin_review_private_runner_not_started_by_report: true,
      admin_review_runner_input_not_materialized_by_report: true,
      stage_count: priorityGates.length,
      ready_gate_count: priorityGates.filter((gate) => gate.ready === true)
        .length,
      attention_gate_count: priorityGates.filter((gate) => gate.ready !== true)
        .length,
      next_stage_id: nextGate?.stage_id ?? null,
      next_priority: nextGate?.priority ?? null,
      next_status_script: nextGate?.status_script ?? null,
      next_verification_script: nextGate?.first_verification_script ?? null,
      next_runtime_verification_script:
        nextGate?.runtime_verification_script ?? null,
      runtime_handoff_status_script:
        "npm run dev:production:runtime-handoff-status",
      production_loop_verification_script:
        "npm run dev:production-loop:roundtrip",
      next_startup_checklist_script:
        nextGate?.startup_checklist_script ?? null,
      next_readiness_state: nextReadinessState,
      readiness_state_counts: readinessStateCounts,
      postgres_admin_save_preflight_script:
        "npm run dev:persistence:postgres-admin-save-preflight",
      admin_review_auth_gate_script: "npm run dev:admin:review-auth-gate",
      admin_review_validator_run_plan_script:
        "npm run dev:admin:review-validator-run-plan",
    },
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      read_only_next_task: true,
    },
    adapter_validation_required: true,
  };
  assertProductionNextTaskReportSafe(report);
  return report;
}

export function assertProductionNextTaskReportSafe(
  report,
  context = "production next task report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenNextTaskFields(report, context);
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_production_next_task_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated time`);
  }
  if (!OVERALL_STATUSES.has(report.overall_status)) {
    throw new ContractError(`${context}: invalid overall status`);
  }
  if (report.next_priority !== null && ![1, 2, 3, 4].includes(report.next_priority)) {
    throw new ContractError(`${context}: invalid next priority`);
  }
  if (report.next_stage_id !== null && !STAGE_IDS.has(report.next_stage_id)) {
    throw new ContractError(`${context}: invalid next stage`);
  }
  if (report.next_status_script !== null) {
    assertSafeScriptName(report.next_status_script, context);
  }
  if (report.next_verification_script !== null) {
    assertSafeScriptName(report.next_verification_script, context);
  }
  if (report.next_runtime_verification_script !== null) {
    assertSafeScriptName(report.next_runtime_verification_script, context);
  }
  assertSafeScriptName(report.runtime_handoff_status_script, context);
  assertSafeScriptName(report.production_loop_verification_script, context);
  if (report.next_startup_checklist_script !== null) {
    assertSafeScriptName(report.next_startup_checklist_script, context);
  }
  if (report.next_launch_script !== null) {
    assertSafeScriptName(report.next_launch_script, context);
  }
  if (report.next_readiness_script !== null) {
    assertSafeScriptName(report.next_readiness_script, context);
  }
  assertEnvNameListSafe(report.next_configure_env, `${context}: next configure env`);
  assertPostgresAdminSavePreflightSummarySafe(
    report.postgres_admin_save_preflight_summary,
    `${context}: postgres admin save preflight summary`
  );
  assertAnimePerformanceAdminAttentionSummarySafe(
    report.anime_performance_admin_attention_summary,
    `${context}: anime performance admin attention summary`
  );
  assertGrowthBusinessAdminAttentionSummarySafe(
    report.growth_business_admin_attention_summary,
    `${context}: growth business admin attention summary`
  );
  if (
    report.next_expected_runtime_status !== null &&
    !RUNTIME_EXPECTED_STATUSES.has(report.next_expected_runtime_status)
  ) {
    throw new ContractError(`${context}: invalid expected runtime status`);
  }
  if (!Array.isArray(report.priority_gates) || report.priority_gates.length !== 4) {
    throw new ContractError(`${context}: four priority gates are required`);
  }
  report.priority_gates.forEach((gate, index) =>
    assertPriorityGateSafe(gate, context, index + 1)
  );
  const firstAttentionGate = report.priority_gates.find((gate) => gate.ready !== true) ?? null;
  if (!firstAttentionGate) {
    if (
      report.overall_status !== "ready_for_live_operation" ||
      report.next_priority !== null ||
      report.next_stage_id !== null ||
    report.next_status_script !== null ||
    report.next_verification_script !== null ||
    report.next_runtime_verification_script !== null ||
    report.production_loop_verification_script !==
      "npm run dev:production-loop:roundtrip" ||
    report.next_startup_checklist_script !== null ||
      report.next_launch_script !== null ||
      report.next_readiness_script !== null ||
      !Array.isArray(report.next_configure_env) ||
      report.next_configure_env.length !== 0 ||
      report.next_expected_runtime_status !== null ||
      report.next_diagnostic_detail !== null ||
      report.next_operator_startup_summary !== null ||
      report.attention_gate_count !== 0 ||
      report.ready_gate_count !== 4
    ) {
      throw new ContractError(`${context}: invalid ready summary`);
    }
  } else if (
    report.overall_status !== "continue_priority_tasks" ||
    report.next_priority !== firstAttentionGate.priority ||
    report.next_stage_id !== firstAttentionGate.stage_id ||
    report.next_status_script !== firstAttentionGate.status_script ||
    report.next_verification_script !== firstAttentionGate.first_verification_script ||
    report.next_runtime_verification_script !==
      firstAttentionGate.runtime_verification_script ||
    report.next_startup_checklist_script !==
      firstAttentionGate.startup_checklist_script ||
    report.next_launch_script !== firstAttentionGate.next_launch_script ||
    report.next_readiness_script !== firstAttentionGate.next_readiness_script ||
    JSON.stringify(report.next_configure_env) !==
      JSON.stringify(firstAttentionGate.next_configure_env) ||
    report.next_expected_runtime_status !== firstAttentionGate.expected_runtime_status ||
    JSON.stringify(report.next_diagnostic_detail) !==
      JSON.stringify(firstAttentionGate.diagnostic_detail) ||
    JSON.stringify(report.next_operator_startup_summary) !==
      JSON.stringify(firstAttentionGate.operator_startup_summary)
  ) {
    throw new ContractError(`${context}: invalid next gate summary`);
  }
  if (
    report.ready_gate_count + report.attention_gate_count !==
    report.priority_gates.length
  ) {
    throw new ContractError(`${context}: invalid gate counts`);
  }
  if (
    report.ready_gate_count !==
      report.priority_gates.filter((gate) => gate.ready === true).length ||
    report.attention_gate_count !==
      report.priority_gates.filter((gate) => gate.ready !== true).length
  ) {
    throw new ContractError(`${context}: gate counts must be derived from gates`);
  }
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  if (report.next_readiness_state !== firstReadinessState(report.priority_gates)) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  if (
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      countReadinessStates(report.priority_gates)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness counts`);
  }
  assertProductionNextTaskHandoffSummarySafe(
    report.production_handoff_summary,
    report,
    context
  );
  assertBoundaryPolicy(
    report.boundary_policy,
    REPORT_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

function assertProductionNextTaskHandoffSummarySafe(summary, report, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_production_next_task_handoff_summary_v1") {
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
    "next_task_report_only",
    "real_processes_not_started_by_report",
    "live_polling_not_started_by_report",
    "real_game_or_os_input_not_started",
    "runtime_packets_remain_adapter_gated",
    "memory_and_relationship_candidates_remain_gated",
    "input_action_candidates_never_forwarded_directly",
    "admin_review_private_runner_not_started_by_report",
    "admin_review_runner_input_not_materialized_by_report",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  for (const field of [
    "stage_count",
    "ready_gate_count",
    "attention_gate_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid production handoff count`);
    }
  }
  if (
    summary.stage_count !== report.priority_gates.length ||
    summary.ready_gate_count !== report.ready_gate_count ||
    summary.attention_gate_count !== report.attention_gate_count ||
    summary.ready_gate_count + summary.attention_gate_count !==
      summary.stage_count
  ) {
    throw new ContractError(`${context}: invalid production handoff counts`);
  }
  if (summary.next_stage_id !== report.next_stage_id) {
    throw new ContractError(`${context}: invalid production handoff next stage`);
  }
  if (summary.next_priority !== report.next_priority) {
    throw new ContractError(`${context}: invalid production handoff priority`);
  }
  if (summary.next_readiness_state !== report.next_readiness_state) {
    throw new ContractError(`${context}: invalid production handoff readiness state`);
  }
  if (
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: invalid production handoff readiness counts`);
  }
  for (const field of [
    "next_status_script",
    "next_verification_script",
    "next_runtime_verification_script",
    "runtime_handoff_status_script",
    "production_loop_verification_script",
    "next_startup_checklist_script",
  ]) {
    if (summary[field] !== report[field]) {
      throw new ContractError(`${context}: invalid production handoff script`);
    }
    if (summary[field] !== null) {
      assertSafeScriptName(summary[field], `${context}: ${field}`);
    }
  }
  assertSafeScriptName(
    summary.postgres_admin_save_preflight_script,
    `${context}: postgres admin save preflight script`
  );
  assertSafeScriptName(
    summary.admin_review_auth_gate_script,
    `${context}: admin review auth gate script`
  );
  assertSafeScriptName(
    summary.admin_review_validator_run_plan_script,
    `${context}: admin review validator run plan script`
  );
}

function createPostgresAdminSavePreflightSummary(preflight) {
  const gate = preflight.admin_async_save_gate_preflight;
  return {
    schema: "iris_production_next_task_postgres_admin_save_preflight_summary_v1",
    readiness_status: gate.readiness_status,
    check_script: "npm run dev:persistence:postgres-admin-save-preflight",
    gate_enabled: gate.gate_enabled,
    mock_postgres_save_enabled: gate.mock_postgres_save_enabled,
    admin_authenticated_flag_enabled: gate.admin_authenticated_flag_enabled,
    store_path_configured: gate.store_path_configured,
    audit_log_path_configured: gate.audit_log_path_configured,
    db_connection_attempted_by_preflight:
      gate.db_connection_attempted_by_preflight,
    real_postgres_pool_created_by_preflight:
      gate.real_postgres_pool_created_by_preflight,
    required_env_names: [...gate.required_env_names],
    boundary_policy: {
      env_names_and_booleans_only: true,
      no_secret_values: true,
      no_connection_values: true,
      no_endpoint_values: true,
      no_store_path_values: true,
      no_sql_statements: true,
      no_policy_payloads: true,
      no_policy_numeric_values: true,
      no_candidates: true,
      no_commands: true,
      no_db_connection_attempted: true,
      no_pool_created: true,
    },
  };
}

function createAnimePerformanceAdminAttentionSummary(env) {
  const missingEnvNames = ANIME_PERFORMANCE_ENV_NAMES.filter((name) => !env[name]);
  const referenceCounts = countAnimePerformanceEnvNames(
    env,
    ANIME_PERFORMANCE_REFERENCE_ENV_NAMES
  );
  const expressionMotionCounts = countAnimePerformanceEnvNames(
    env,
    ANIME_PERFORMANCE_EXPRESSION_MOTION_ENV_NAMES
  );
  const voiceSpeechCounts = countAnimePerformanceEnvNames(
    env,
    ANIME_PERFORMANCE_VOICE_SPEECH_ENV_NAMES
  );
  const ipGovernanceCounts = countAnimePerformanceEnvNames(
    env,
    ANIME_IP_GOVERNANCE_ENV_NAMES
  );
  const voiceLicenseUseCategoryCounts = countAnimePerformanceEnvNames(
    env,
    ANIME_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES
  );
  const nextAttentionAreaId = firstMissingAreaId(
    env,
    ANIME_PERFORMANCE_ATTENTION_AREAS
  );
  const nextAttentionAreaMissingSettingCount = missingCountForAreaId(
    env,
    ANIME_PERFORMANCE_ATTENTION_AREAS,
    nextAttentionAreaId
  );
  return {
    schema: "iris_production_next_task_anime_performance_admin_attention_v1",
    module_id: "anime_performance_matching",
    admin_status: missingEnvNames.length === 0 ? "ready" : "configuration_waiting",
    next_operator_action_id:
      missingEnvNames.length === 0 ? null : "configure_anime_performance_matching",
    next_attention_area_id: nextAttentionAreaId,
    next_attention_area_missing_setting_count:
      nextAttentionAreaMissingSettingCount,
    next_safe_script:
      missingEnvNames.length === 0
        ? "npm run dev:admin:dashboard"
        : "npm run dev:admin:character-voice-settings:summary",
    required_setting_count: ANIME_PERFORMANCE_ENV_NAMES.length,
    configured_setting_count: ANIME_PERFORMANCE_ENV_NAMES.length - missingEnvNames.length,
    missing_setting_count: missingEnvNames.length,
    reference_setting_count: referenceCounts.setting_count,
    reference_configured_setting_count: referenceCounts.configured_setting_count,
    reference_missing_setting_count: referenceCounts.missing_setting_count,
    expression_motion_setting_count: expressionMotionCounts.setting_count,
    expression_motion_configured_setting_count:
      expressionMotionCounts.configured_setting_count,
    expression_motion_missing_setting_count:
      expressionMotionCounts.missing_setting_count,
    voice_speech_setting_count: voiceSpeechCounts.setting_count,
    voice_speech_configured_setting_count:
      voiceSpeechCounts.configured_setting_count,
    voice_speech_missing_setting_count: voiceSpeechCounts.missing_setting_count,
    ip_governance_setting_count: ipGovernanceCounts.setting_count,
    ip_governance_configured_setting_count:
      ipGovernanceCounts.configured_setting_count,
    ip_governance_missing_setting_count: ipGovernanceCounts.missing_setting_count,
    voice_license_use_category_setting_count:
      voiceLicenseUseCategoryCounts.setting_count,
    voice_license_use_category_configured_setting_count:
      voiceLicenseUseCategoryCounts.configured_setting_count,
    voice_license_use_category_missing_setting_count:
      voiceLicenseUseCategoryCounts.missing_setting_count,
    missing_env_names: missingEnvNames,
    boundary_policy: {
      counts_statuses_scripts_and_env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_character_reference_materials: true,
      no_voice_samples: true,
      no_animation_materials: true,
      no_script_text: true,
      read_only_admin_attention_summary: true,
    },
  };
}

function createGrowthBusinessAdminAttentionSummary(env) {
  const missingEnvNames = GROWTH_BUSINESS_ENV_NAMES.filter((name) => !env[name]);
  const nextAttentionAreaId = firstMissingAreaId(
    env,
    GROWTH_BUSINESS_ATTENTION_AREAS
  );
  const nextAttentionAreaMissingSettingCount = missingCountForAreaId(
    env,
    GROWTH_BUSINESS_ATTENTION_AREAS,
    nextAttentionAreaId
  );
  return {
    schema: "iris_production_next_task_growth_business_admin_attention_v1",
    module_id: "growth_business_operations",
    admin_status: missingEnvNames.length === 0 ? "ready" : "configuration_waiting",
    next_operator_action_id:
      missingEnvNames.length === 0 ? null : "configure_growth_business_operations",
    next_attention_area_id: nextAttentionAreaId,
    next_attention_area_missing_setting_count:
      nextAttentionAreaMissingSettingCount,
    next_safe_script:
      missingEnvNames.length === 0
        ? "npm run dev:admin:dashboard"
        : "npm run dev:admin:character-voice-settings:summary",
    required_setting_count: GROWTH_BUSINESS_ENV_NAMES.length,
    configured_setting_count: GROWTH_BUSINESS_ENV_NAMES.length - missingEnvNames.length,
    missing_setting_count: missingEnvNames.length,
    missing_env_names: missingEnvNames,
    boundary_policy: {
      counts_statuses_scripts_and_env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_policy_values: true,
      no_viewer_data: true,
      no_support_text: true,
      no_analytics_payloads: true,
      read_only_admin_attention_summary: true,
    },
  };
}

function assertAnimePerformanceAdminAttentionSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (
    summary.schema !==
    "iris_production_next_task_anime_performance_admin_attention_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (summary.module_id !== "anime_performance_matching") {
    throw new ContractError(`${context}: invalid module id`);
  }
  if (!["ready", "configuration_waiting"].includes(summary.admin_status)) {
    throw new ContractError(`${context}: invalid admin status`);
  }
  if (
    summary.next_operator_action_id !== null &&
    summary.next_operator_action_id !== "configure_anime_performance_matching"
  ) {
    throw new ContractError(`${context}: invalid next operator action`);
  }
  assertSafeAttentionAreaId(summary.next_attention_area_id, context);
  assertSafeScriptName(summary.next_safe_script, context);
  for (const field of [
    "required_setting_count",
    "configured_setting_count",
    "missing_setting_count",
    "next_attention_area_missing_setting_count",
    "reference_setting_count",
    "reference_configured_setting_count",
    "reference_missing_setting_count",
    "expression_motion_setting_count",
    "expression_motion_configured_setting_count",
    "expression_motion_missing_setting_count",
    "voice_speech_setting_count",
    "voice_speech_configured_setting_count",
    "voice_speech_missing_setting_count",
    "ip_governance_setting_count",
    "ip_governance_configured_setting_count",
    "ip_governance_missing_setting_count",
    "voice_license_use_category_setting_count",
    "voice_license_use_category_configured_setting_count",
    "voice_license_use_category_missing_setting_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertEnvNameListSafe(summary.missing_env_names, context);
  if (
    summary.required_setting_count !== ANIME_PERFORMANCE_ENV_NAMES.length ||
    summary.configured_setting_count + summary.missing_setting_count !==
      summary.required_setting_count ||
    summary.missing_setting_count !== summary.missing_env_names.length
  ) {
    throw new ContractError(`${context}: invalid anime performance counts`);
  }
  assertAnimePerformanceCategoryCounts(summary, "reference", context);
  assertAnimePerformanceCategoryCounts(summary, "expression_motion", context);
  assertAnimePerformanceCategoryCounts(summary, "voice_speech", context);
  assertAnimePerformanceCategoryCounts(summary, "ip_governance", context);
  assertAnimePerformanceCategoryCounts(
    summary,
    "voice_license_use_category",
    context
  );
  if (
    sumAnimePerformanceCategoryCounts(summary, "setting_count") !==
    summary.required_setting_count
  ) {
    throw new ContractError(`${context}: invalid anime performance category counts`);
  }
  if (
    sumAnimePerformanceCategoryCounts(summary, "configured_setting_count") !==
    summary.configured_setting_count
  ) {
    throw new ContractError(
      `${context}: invalid anime performance category configured counts`
    );
  }
  if (
    sumAnimePerformanceCategoryCounts(summary, "missing_setting_count") !==
    summary.missing_setting_count
  ) {
    throw new ContractError(
      `${context}: invalid anime performance category missing counts`
    );
  }
  if (
    summary.missing_env_names.some(
      (name) => !ANIME_PERFORMANCE_ENV_NAMES.includes(name)
    )
  ) {
    throw new ContractError(`${context}: unknown anime performance env name`);
  }
  if (
    summary.admin_status === "ready" &&
    (summary.missing_setting_count !== 0 ||
      summary.next_operator_action_id !== null ||
      summary.next_attention_area_id !== null ||
      summary.next_attention_area_missing_setting_count !== 0 ||
      summary.next_safe_script !== "npm run dev:admin:dashboard")
  ) {
    throw new ContractError(`${context}: invalid ready anime performance summary`);
  }
  if (
    summary.admin_status === "configuration_waiting" &&
    (summary.missing_setting_count === 0 ||
      summary.next_operator_action_id !==
        "configure_anime_performance_matching" ||
      typeof summary.next_attention_area_id !== "string" ||
      summary.next_attention_area_missing_setting_count <= 0 ||
      summary.next_safe_script !==
        "npm run dev:admin:character-voice-settings:summary")
  ) {
    throw new ContractError(
      `${context}: invalid waiting anime performance summary`
    );
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    ANIME_PERFORMANCE_BOUNDARY_FIELDS,
    context
  );
}

function assertGrowthBusinessAdminAttentionSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (
    summary.schema !==
    "iris_production_next_task_growth_business_admin_attention_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (summary.module_id !== "growth_business_operations") {
    throw new ContractError(`${context}: invalid module id`);
  }
  if (!["ready", "configuration_waiting"].includes(summary.admin_status)) {
    throw new ContractError(`${context}: invalid admin status`);
  }
  if (
    summary.next_operator_action_id !== null &&
    summary.next_operator_action_id !== "configure_growth_business_operations"
  ) {
    throw new ContractError(`${context}: invalid next operator action`);
  }
  assertSafeAttentionAreaId(summary.next_attention_area_id, context);
  assertSafeScriptName(summary.next_safe_script, context);
  for (const field of [
    "required_setting_count",
    "configured_setting_count",
    "missing_setting_count",
    "next_attention_area_missing_setting_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertEnvNameListSafe(summary.missing_env_names, context);
  if (
    summary.required_setting_count !== GROWTH_BUSINESS_ENV_NAMES.length ||
    summary.configured_setting_count + summary.missing_setting_count !==
      summary.required_setting_count ||
    summary.missing_setting_count !== summary.missing_env_names.length
  ) {
    throw new ContractError(`${context}: invalid growth business counts`);
  }
  if (
    summary.missing_env_names.some(
      (name) => !GROWTH_BUSINESS_ENV_NAMES.includes(name)
    )
  ) {
    throw new ContractError(`${context}: unknown growth business env name`);
  }
  if (
    summary.admin_status === "ready" &&
    (summary.missing_setting_count !== 0 ||
      summary.next_operator_action_id !== null ||
      summary.next_attention_area_id !== null ||
      summary.next_attention_area_missing_setting_count !== 0 ||
      summary.next_safe_script !== "npm run dev:admin:dashboard")
  ) {
    throw new ContractError(`${context}: invalid ready growth business summary`);
  }
  if (
    summary.admin_status === "configuration_waiting" &&
    (summary.missing_setting_count === 0 ||
      summary.next_operator_action_id !==
        "configure_growth_business_operations" ||
      typeof summary.next_attention_area_id !== "string" ||
      summary.next_attention_area_missing_setting_count <= 0 ||
      summary.next_safe_script !==
        "npm run dev:admin:character-voice-settings:summary")
  ) {
    throw new ContractError(`${context}: invalid waiting growth business summary`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    GROWTH_BUSINESS_BOUNDARY_FIELDS,
    context
  );
}

function countAnimePerformanceEnvNames(env, envNames) {
  const configured = envNames.filter((name) => Boolean(env[name])).length;
  return {
    setting_count: envNames.length,
    configured_setting_count: configured,
    missing_setting_count: envNames.length - configured,
  };
}

function sumAnimePerformanceCategoryCounts(summary, suffix) {
  return ANIME_PERFORMANCE_CATEGORY_PREFIXES.reduce(
    (total, prefix) => total + summary[`${prefix}_${suffix}`],
    0
  );
}

function firstMissingAreaId(env, groupedEnvNames) {
  return groupedEnvNames.find(([, envNames]) =>
    envNames.some((name) => !env[name])
  )?.[0] ?? null;
}

function missingCountForAreaId(env, groupedEnvNames, areaId) {
  if (areaId === null) return 0;
  const envNames = groupedEnvNames.find(([id]) => id === areaId)?.[1] ?? [];
  return envNames.filter((name) => !env[name]).length;
}

function assertSafeAttentionAreaId(value, context) {
  if (
    value !== null &&
    (typeof value !== "string" || !/^[a-z0-9_]+$/.test(value))
  ) {
    throw new ContractError(`${context}: invalid next attention area`);
  }
}

function assertAnimePerformanceCategoryCounts(summary, prefix, context) {
  if (
    summary[`${prefix}_configured_setting_count`] +
      summary[`${prefix}_missing_setting_count`] !==
    summary[`${prefix}_setting_count`]
  ) {
    throw new ContractError(`${context}: invalid ${prefix} anime performance counts`);
  }
}

function assertPostgresAdminSavePreflightSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (
    summary.schema !==
    "iris_production_next_task_postgres_admin_save_preflight_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (
    summary.readiness_status !== "configuration_waiting" &&
    summary.readiness_status !== "ready_for_mock_postgres_save_gate"
  ) {
    throw new ContractError(`${context}: invalid readiness status`);
  }
  assertSafeScriptName(summary.check_script, context);
  for (const field of [
    "gate_enabled",
    "mock_postgres_save_enabled",
    "admin_authenticated_flag_enabled",
    "store_path_configured",
    "audit_log_path_configured",
    "db_connection_attempted_by_preflight",
    "real_postgres_pool_created_by_preflight",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid boolean field`);
    }
  }
  if (
    summary.db_connection_attempted_by_preflight !== false ||
    summary.real_postgres_pool_created_by_preflight !== false
  ) {
    throw new ContractError(`${context}: preflight must not touch database`);
  }
  assertEnvNameListSafe(summary.required_env_names, context);
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "env_names_and_booleans_only",
      "no_secret_values",
      "no_connection_values",
      "no_endpoint_values",
      "no_store_path_values",
      "no_sql_statements",
      "no_policy_payloads",
      "no_policy_numeric_values",
      "no_candidates",
      "no_commands",
      "no_db_connection_attempted",
      "no_pool_created",
    ],
    context
  );
}

function createFoundationGate({ foundation, foundationLaunchPlan }) {
  const runtimeVerification =
    foundationLaunchPlan.runtime_handoff_verification_summary;
  const launchNext = summarizeLaunchNext(foundationLaunchPlan);
  const operatorStartupSummary = summarizeOperatorStartupPlan(
    foundationLaunchPlan.operator_startup_plan
  );
  const ready =
    foundation.foundation_readiness_status === "ready_for_runtime_handoff" &&
    operatorStartupSummary?.next_readiness_state === "ready";
  const stageStatus = ready ? "ready" : "attention";
  return {
    schema: "iris_production_priority_gate_v1",
    priority: 1,
    stage_id: "tts_live2d_obs_foundation",
    stage_label: "real_tts_live2d_obs_foundation",
    ready,
    gate_status: foundation.foundation_readiness_status,
    attention_reason_count: foundation.foundation_summary.attention_reason_count,
    next_attention_reason: foundation.foundation_summary.next_attention_reason,
    missing_env_count: foundation.foundation_checks.reduce(
      (sum, check) => sum + (check.missing_env?.length ?? 0),
      0
    ),
    stage_status: stageStatus,
    readiness_state: summarizeGateReadinessState({
      ready,
      missingEnvCount: foundation.foundation_checks.reduce(
        (sum, check) => sum + (check.missing_env?.length ?? 0),
        0
      ),
      operatorStartupSummary,
    }),
    first_verification_script: "npm run dev:bridge:engine-roundtrip",
    status_script: "npm run dev:foundation:runtime-status",
    preflight_script: "npm run dev:foundation:preflight",
    launch_plan_script: "npm run dev:foundation:launch-plan",
    startup_checklist_script: "npm run dev:foundation:startup-checklist",
    next_launch_step_id: launchNext.next_launch_step_id,
    next_launch_step_order: launchNext.next_launch_step_order,
    next_launch_script: launchNext.next_launch_script,
    next_readiness_script: launchNext.next_readiness_script,
    next_configure_env: launchNext.next_configure_env,
    runtime_verification_script:
      runtimeVerification.obs_runtime_render_roundtrip_script,
    expected_runtime_status: runtimeVerification.foundation_runtime_status_expected,
    runtime_flow_id: "runtime_handoff_flow",
    runtime_flow_schema: "iris_foundation_runtime_handoff_flow_summary_v1",
    expected_runtime_flow_status: "ready_for_obs_runtime_handoff",
    expected_runtime_blocking_stage: "none",
    runtime_flow_summary_required: true,
    runtime_boundary_summary_required:
      runtimeVerification.real_engine_handoff_summary_required === true &&
      runtimeVerification.obs_browser_source_runtime_summary_required === true,
    diagnostic_detail: {
      ...createFoundationDiagnosticDetail({
        foundation,
        foundationLaunchPlan,
      }),
      stage_status: stageStatus,
    },
    operator_startup_summary: operatorStartupSummary,
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function createYouTubeGate({
  youtubePreflight,
  youtubeSourceStatus,
  youtubeLaunchPlan,
  youtubeRelayStartupChecklist,
}) {
  const sourceReady = youtubeSourceStatus.instantiation_status === "ready";
  const preflightReady =
    youtubePreflight.preflight_status === "ready_to_poll_youtube_ingest";
  const ready = sourceReady && preflightReady;
  const sourceReason = sourceReady
    ? null
    : youtubeSourceStatus.error_kind ?? "source_not_configured";
  const runtimeVerification =
    youtubeLaunchPlan.runtime_poll_verification_summary;
  const launchNext = summarizeLaunchNext(youtubeLaunchPlan);
  const missingEnvCount = youtubePreflight.missing_required_env.length;
  return {
    schema: "iris_production_priority_gate_v1",
    priority: 2,
    stage_id: "youtube_comments_and_support",
    stage_label: "youtube_comments_support_and_side_sources",
    ready,
    gate_status: sourceReady
      ? youtubePreflight.preflight_status
      : "youtube_source_not_ready",
    attention_reason_count:
      youtubePreflight.attention_reason_count + (sourceReady ? 0 : 1),
    next_attention_reason:
      youtubePreflight.next_attention_reason ?? sourceReason,
    missing_env_count: missingEnvCount,
    stage_status: ready ? "ready" : "attention",
    readiness_state: summarizeGateReadinessState({
      ready,
      missingEnvCount,
    }),
    first_verification_script:
      youtubePreflight.verification_plan_summary.first_verification_script,
    status_script: "npm run dev:youtube:runtime-status",
    preflight_script: "npm run dev:youtube:preflight",
    launch_plan_script: "npm run dev:youtube:launch-plan",
    startup_checklist_script:
      youtubeRelayStartupChecklist.verification_scripts
        .relay_readiness_rehearsal_script ===
      "npm run dev:youtube:relay-readiness-rehearsal"
        ? "npm run dev:youtube:relay-startup-checklist"
        : null,
    next_launch_step_id: launchNext.next_launch_step_id,
    next_launch_step_order: launchNext.next_launch_step_order,
    next_launch_script: launchNext.next_launch_script,
    next_readiness_script: launchNext.next_readiness_script,
    next_configure_env: launchNext.next_configure_env,
    runtime_verification_script:
      runtimeVerification.runtime_ingest_roundtrip_script,
    expected_runtime_status: runtimeVerification.runtime_polling_status_expected,
    runtime_flow_id: "live_chat_ingest_flow",
    runtime_flow_schema: "iris_youtube_live_chat_ingest_flow_summary_v1",
    expected_runtime_flow_status: "runtime_active_with_comments_and_support",
    expected_runtime_blocking_stage: "none",
    runtime_flow_summary_required: true,
    runtime_boundary_summary_required:
      runtimeVerification.support_events_ready_for_donation_pipeline_required === true &&
      runtimeVerification.relationship_and_memory_candidates_validation_gated === true,
    diagnostic_detail: createYouTubeDiagnosticDetail({
      youtubePreflight,
      youtubeSourceStatus,
      youtubeLaunchPlan,
      gateStatus: sourceReady
        ? youtubePreflight.preflight_status
        : "youtube_source_not_ready",
    }),
    operator_startup_summary: null,
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function createPersistenceGate({
  persistence,
  persistenceLaunchPlan,
  persistenceStartupChecklist,
}) {
  const ready =
    persistence.preflight_status === "ready_to_persist_memory_and_relationships";
  const runtimeVerification =
    persistenceLaunchPlan.runtime_persistence_verification;
  const launchNext = summarizeLaunchNext(persistenceLaunchPlan);
  const missingEnvCount = persistence.missing_required_env.length;
  return {
    schema: "iris_production_priority_gate_v1",
    priority: 3,
    stage_id: "memory_and_relationship_persistence",
    stage_label: "long_term_memory_and_relationship_persistence",
    ready,
    gate_status: persistence.preflight_status,
    attention_reason_count: persistence.attention_reason_count,
    next_attention_reason: persistence.next_attention_reason,
    missing_env_count: missingEnvCount,
    stage_status: persistence.persistence_stage_summary.stage_status,
    readiness_state: summarizeGateReadinessState({
      ready,
      missingEnvCount,
    }),
    first_verification_script:
      persistence.verification_plan_summary.first_verification_script,
    status_script: "npm run dev:persistence:runtime-status",
    preflight_script: "npm run dev:persistence:preflight",
    launch_plan_script: "npm run dev:persistence:launch-plan",
    startup_checklist_script:
      persistenceStartupChecklist.verification_scripts
        .vector_memory_roundtrip_script === "npm run dev:memory-vector:roundtrip"
        ? "npm run dev:persistence:startup-checklist"
        : null,
    next_launch_step_id: launchNext.next_launch_step_id,
    next_launch_step_order: launchNext.next_launch_step_order,
    next_launch_script: launchNext.next_launch_script,
    next_readiness_script: launchNext.next_readiness_script,
    next_configure_env: launchNext.next_configure_env,
    runtime_verification_script:
      runtimeVerification.persistence_roundtrip_script,
    expected_runtime_status: runtimeVerification.runtime_active_status_expected,
    runtime_flow_id: "memory_relationship_lifecycle_flow",
    runtime_flow_schema:
      "iris_persistence_memory_relationship_lifecycle_flow_summary_v1",
    expected_runtime_flow_status: "memory_and_relationship_active",
    expected_runtime_blocking_stage: "none",
    runtime_flow_summary_required: true,
    runtime_boundary_summary_required:
      runtimeVerification.candidate_validation_gate_required === true &&
      runtimeVerification.approved_memory_schema_only_required === true &&
      runtimeVerification.approved_relationship_schema_only_required === true,
    diagnostic_detail: createPersistenceDiagnosticDetail({
      persistence,
      persistenceLaunchPlan,
    }),
    operator_startup_summary: null,
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function createGameplayGate({
  gameplay,
  gameplayLaunchPlan,
  gameplayStartupChecklist,
}) {
  const ready = gameplay.preflight_status === "ready_to_poll_game_and_approve_control";
  const runtimeVerification =
    gameplayLaunchPlan.runtime_safe_control_verification;
  const launchNext = summarizeLaunchNext(gameplayLaunchPlan);
  const missingEnvCount = gameplay.missing_required_env.length;
  return {
    schema: "iris_production_priority_gate_v1",
    priority: 4,
    stage_id: "vision_and_safe_game_control",
    stage_label: "game_screen_recognition_and_safe_action_approval",
    ready,
    gate_status: gameplay.preflight_status,
    attention_reason_count: gameplay.attention_reason_count,
    next_attention_reason: gameplay.next_attention_reason,
    missing_env_count: missingEnvCount,
    stage_status: gameplay.gameplay_stage_summary.stage_status,
    readiness_state:
      READINESS_STATES.has(gameplay.next_readiness_state) &&
      (ready || gameplay.next_readiness_state !== "ready")
      ? gameplay.next_readiness_state
      : summarizeGateReadinessState({
          ready,
          missingEnvCount,
        }),
    first_verification_script:
      gameplay.verification_plan_summary.first_verification_script,
    status_script: "npm run dev:gameplay:runtime-status",
    preflight_script: "npm run dev:gameplay:preflight",
    launch_plan_script: "npm run dev:gameplay:launch-plan",
    startup_checklist_script: "npm run dev:gameplay:startup-checklist",
    next_launch_step_id: launchNext.next_launch_step_id,
    next_launch_step_order: launchNext.next_launch_step_order,
    next_launch_script: launchNext.next_launch_script,
    next_readiness_script: launchNext.next_readiness_script,
    next_configure_env: launchNext.next_configure_env,
    runtime_verification_script: runtimeVerification.runtime_roundtrip_script,
    expected_runtime_status: runtimeVerification.runtime_safe_control_status_expected,
    runtime_flow_id: "safe_action_lifecycle_flow",
    runtime_flow_schema: "iris_gameplay_safe_action_lifecycle_flow_summary_v1",
    expected_runtime_flow_status: "safe_control_active",
    expected_runtime_blocking_stage: "none",
    runtime_flow_summary_required: true,
    runtime_boundary_summary_required:
      runtimeVerification.validator_required_before_adapter === true &&
      runtimeVerification.approved_actions_not_exposed_in_reports === true,
    diagnostic_detail: createGameplayDiagnosticDetail({
      gameplay,
      gameplayLaunchPlan,
    }),
    operator_startup_summary: null,
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function assertPriorityGateSafe(gate, context, expectedPriority) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: invalid priority gate`);
  }
  if (gate.schema !== "iris_production_priority_gate_v1") {
    throw new ContractError(`${context}: invalid priority gate schema`);
  }
  if (gate.priority !== expectedPriority) {
    throw new ContractError(`${context}: invalid priority order`);
  }
  if (!STAGE_IDS.has(gate.stage_id)) {
    throw new ContractError(`${context}: invalid gate stage`);
  }
  const expectedGate = PRIORITY_GATE_EXPECTATIONS[gate.stage_id];
  if (!expectedGate) {
    throw new ContractError(`${context}: missing gate expectations`);
  }
  if (expectedGate.priority !== expectedPriority) {
    throw new ContractError(`${context}: invalid gate expected priority`);
  }
  if (gate.stage_label !== expectedGate.stage_label) {
    throw new ContractError(`${context}: invalid gate label`);
  }
  if (typeof gate.stage_label !== "string" || !/^[a-z0-9_]+$/.test(gate.stage_label)) {
    throw new ContractError(`${context}: invalid gate label`);
  }
  if (typeof gate.ready !== "boolean") {
    throw new ContractError(`${context}: invalid gate ready flag`);
  }
  if (!GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid gate status`);
  }
  for (const field of ["attention_reason_count", "missing_env_count"]) {
    if (!Number.isInteger(gate[field]) || gate[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (gate.ready && gate.attention_reason_count !== 0) {
    throw new ContractError(`${context}: ready gate has attention reasons`);
  }
  if (
    gate.next_attention_reason !== null &&
    (typeof gate.next_attention_reason !== "string" ||
      !/^[a-z0-9_]+$/.test(gate.next_attention_reason))
  ) {
    throw new ContractError(`${context}: invalid next attention reason`);
  }
  if (!["ready", "attention"].includes(gate.stage_status)) {
    throw new ContractError(`${context}: invalid stage status`);
  }
  assertSafeOptionalReadinessState(gate.readiness_state, context);
  if (gate.ready !== true && gate.readiness_state === "ready") {
    throw new ContractError(`${context}: attention gate cannot be ready state`);
  }
  if (gate.ready === true && gate.readiness_state !== "ready") {
    throw new ContractError(`${context}: ready gate readiness mismatch`);
  }
  for (const field of [
    "status_script",
    "preflight_script",
    "launch_plan_script",
    "startup_checklist_script",
    "next_launch_script",
    "next_readiness_script",
    "runtime_verification_script",
  ]) {
    if (gate[field] !== null) assertSafeScriptName(gate[field], context);
  }
  for (const field of [
    "status_script",
    "preflight_script",
    "launch_plan_script",
    "startup_checklist_script",
    "runtime_verification_script",
    "expected_runtime_status",
    "runtime_flow_id",
    "runtime_flow_schema",
    "expected_runtime_flow_status",
    "expected_runtime_blocking_stage",
  ]) {
    if (gate[field] !== expectedGate[field]) {
      throw new ContractError(`${context}: invalid gate ${field}`);
    }
  }
  if (
    gate.next_launch_step_id !== null &&
    (typeof gate.next_launch_step_id !== "string" ||
      !/^[a-z0-9_]+$/.test(gate.next_launch_step_id))
  ) {
    throw new ContractError(`${context}: invalid next launch step id`);
  }
  if (
    gate.next_launch_step_order !== null &&
    (!Number.isInteger(gate.next_launch_step_order) ||
      gate.next_launch_step_order < 1)
  ) {
    throw new ContractError(`${context}: invalid next launch step order`);
  }
  if (
    (gate.next_launch_step_id === null) !==
      (gate.next_launch_step_order === null) ||
    (gate.next_launch_script === null) !==
      (gate.next_readiness_script === null)
  ) {
    throw new ContractError(`${context}: inconsistent launch next summary`);
  }
  assertEnvNameListSafe(gate.next_configure_env, `${context}: gate next configure env`);
  if (!RUNTIME_EXPECTED_STATUSES.has(gate.expected_runtime_status)) {
    throw new ContractError(`${context}: invalid gate expected runtime status`);
  }
  if (!RUNTIME_FLOW_IDS.has(gate.runtime_flow_id)) {
    throw new ContractError(`${context}: invalid gate runtime flow`);
  }
  if (!RUNTIME_FLOW_SCHEMAS.has(gate.runtime_flow_schema)) {
    throw new ContractError(`${context}: invalid gate runtime flow schema`);
  }
  if (!RUNTIME_FLOW_EXPECTED_STATUSES.has(gate.expected_runtime_flow_status)) {
    throw new ContractError(`${context}: invalid gate expected runtime flow status`);
  }
  if (
    !RUNTIME_FLOW_EXPECTED_BLOCKING_STAGES.has(
      gate.expected_runtime_blocking_stage
    )
  ) {
    throw new ContractError(`${context}: invalid gate expected runtime blocking stage`);
  }
  if (gate.runtime_flow_summary_required !== true) {
    throw new ContractError(`${context}: runtime flow summary required`);
  }
  if (gate.runtime_boundary_summary_required !== true) {
    throw new ContractError(`${context}: runtime boundary summary required`);
  }
  assertProductionNextTaskGateDiagnosticDetailSafe(
    gate.diagnostic_detail,
    `${context}: gate diagnostic detail`
  );
  if (gate.diagnostic_detail.stage_status !== gate.stage_status) {
    throw new ContractError(`${context}: diagnostic stage status mismatch`);
  }
  if (gate.stage_id === "tts_live2d_obs_foundation") {
    if (gate.startup_checklist_script !== "npm run dev:foundation:startup-checklist") {
      throw new ContractError(`${context}: invalid foundation startup checklist script`);
    }
    assertProductionNextTaskOperatorStartupSummarySafe(
      gate.operator_startup_summary,
      `${context}: gate operator startup summary`
    );
  } else if (gate.stage_id === "youtube_comments_and_support") {
    if (
      gate.startup_checklist_script !==
      "npm run dev:youtube:relay-startup-checklist"
    ) {
      throw new ContractError(`${context}: invalid youtube startup checklist script`);
    }
    if (gate.operator_startup_summary !== null) {
      throw new ContractError(`${context}: unexpected gate operator startup summary`);
    }
  } else if (gate.stage_id === "memory_and_relationship_persistence") {
    if (
      gate.startup_checklist_script !==
      "npm run dev:persistence:startup-checklist"
    ) {
      throw new ContractError(`${context}: invalid persistence startup checklist script`);
    }
    if (gate.operator_startup_summary !== null) {
      throw new ContractError(`${context}: unexpected gate operator startup summary`);
    }
  } else if (gate.stage_id === "vision_and_safe_game_control") {
    if (
      gate.startup_checklist_script !==
      "npm run dev:gameplay:startup-checklist"
    ) {
      throw new ContractError(`${context}: invalid gameplay startup checklist script`);
    }
    if (gate.operator_startup_summary !== null) {
      throw new ContractError(`${context}: unexpected gate operator startup summary`);
    }
  } else {
    if (gate.operator_startup_summary !== null) {
      throw new ContractError(`${context}: unexpected gate operator startup summary`);
    }
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    GATE_BOUNDARY_FIELDS,
    `${context}: gate boundary policy`
  );
  if (gate.adapter_validation_required !== true) {
    throw new ContractError(`${context}: gate adapter validation required`);
  }
}

export function assertProductionNextTaskGateDiagnosticDetailSafe(
  detail,
  context = "production next task gate diagnostic detail"
) {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
    throw new ContractError(`${context}: diagnostic detail is required`);
  }
  if (detail.schema !== "iris_production_next_task_gate_diagnostic_detail_v1") {
    throw new ContractError(`${context}: invalid diagnostic detail schema`);
  }
  for (const [field, value] of Object.entries(detail)) {
    if (field === "schema") continue;
    if (SAFE_DIAGNOSTIC_BOOLEAN_FIELDS.has(field)) {
      if (value !== null && typeof value !== "boolean") {
        throw new ContractError(`${context}: invalid boolean diagnostic field`);
      }
      continue;
    }
    if (SAFE_DIAGNOSTIC_COUNT_FIELDS.has(field)) {
      if (!Number.isInteger(value) || value < 0) {
        throw new ContractError(`${context}: invalid count diagnostic field`);
      }
      continue;
    }
    if (SAFE_DIAGNOSTIC_LABEL_FIELDS.has(field)) {
      if (value !== null && !isSafeDiagnosticLabel(value)) {
        throw new ContractError(`${context}: invalid label diagnostic field`);
      }
      continue;
    }
    throw new ContractError(`${context}: unsupported diagnostic field`, { field });
  }
}

function summarizeGateReadinessState({
  ready,
  missingEnvCount,
  operatorStartupSummary = null,
}) {
  if (missingEnvCount > 0) return "configuration_waiting";
  if (ready !== true) return "operator_review_required";
  if (
    operatorStartupSummary?.next_readiness_state &&
    operatorStartupSummary.next_readiness_state !== "ready"
  ) {
    return operatorStartupSummary.next_readiness_state;
  }
  return "ready";
}

function countReadinessStates(gates) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const gate of gates) {
    counts[gate.readiness_state] += 1;
  }
  return counts;
}

function firstReadinessState(gates) {
  const firstAttentionGate = gates.find((gate) => gate.ready !== true);
  if (firstAttentionGate) return firstAttentionGate.readiness_state;
  const firstNonReadyStartup = gates.find((gate) => gate.readiness_state !== "ready");
  return firstNonReadyStartup?.readiness_state ?? "ready";
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: readiness counts required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness ${state} count`);
    }
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: invalid readiness count key`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every((state) => left?.[state] === right?.[state]);
}

function summarizeOperatorStartupPlan(plan) {
  if (!plan || typeof plan !== "object") return null;
  const startupStepCount = requiredOperatorStartupPlanCount(
    plan,
    "startup_step_count"
  );
  const readyToStartCount = requiredOperatorStartupPlanCount(
    plan,
    "ready_to_start_count"
  );
  const attentionStartupCount = requiredOperatorStartupPlanCount(
    plan,
    "attention_startup_count"
  );
  const longRunningServiceCount = requiredOperatorStartupPlanCount(
    plan,
    "long_running_service_count"
  );
  const watchWorkerCount = requiredOperatorStartupPlanCount(
    plan,
    "watch_worker_count"
  );
  const oneShotSetupCount = requiredOperatorStartupPlanCount(
    plan,
    "one_shot_setup_count"
  );
  const dedicatedTerminalCount = requiredOperatorStartupPlanCount(
    plan,
    "dedicated_terminal_count"
  );
  const nextReadinessState =
    attentionStartupCount > 0
      ? "configuration_waiting"
      : readyToStartCount > 0
        ? "real_device_waiting"
        : null;
  const summary = {
    schema: "iris_production_next_task_operator_startup_summary_v1",
    startup_step_count: startupStepCount,
    ready_to_start_count: readyToStartCount,
    attention_startup_count: attentionStartupCount,
    long_running_service_count: longRunningServiceCount,
    watch_worker_count: watchWorkerCount,
    one_shot_setup_count: oneShotSetupCount,
    dedicated_terminal_count: dedicatedTerminalCount,
    next_startup_step_id: isSafeDiagnosticLabel(plan.next_startup_step_id)
      ? plan.next_startup_step_id
      : null,
    next_startup_step_order: safeNonNegativeInteger(plan.next_startup_step_order),
    next_startup_script:
      typeof plan.next_startup_script === "string" ? plan.next_startup_script : null,
    next_readiness_script:
      typeof plan.next_readiness_script === "string"
        ? plan.next_readiness_script
        : null,
    next_readiness_state: nextReadinessState,
    startup_readiness_state_counts: {
      ready: 0,
      configuration_waiting: attentionStartupCount,
      runtime_waiting: 0,
      real_device_waiting: readyToStartCount,
      operator_review_required: 0,
    },
    next_configure_env: Array.isArray(plan.next_configure_env)
      ? plan.next_configure_env.filter((name) => /^IRIS_[A-Z0-9_]+$/.test(name))
      : [],
    local_bridge_required_before_dev_server:
      plan.local_bridge_required_before_dev_server === true,
    worker_required_before_obs_pickup: plan.worker_required_before_obs_pickup === true,
    obs_setup_can_be_manual: plan.obs_setup_can_be_manual === true,
    obs_pickup_startup_summary: sanitizeObsPickupStartupSummary(
      plan.obs_pickup_startup_summary
    ),
    boundary_policy: {
      script_names_only: true,
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_startup_summary: true,
    },
    adapter_validation_required: true,
  };
  assertProductionNextTaskOperatorStartupSummarySafe(summary);
  return summary;
}

function requiredOperatorStartupPlanCount(plan, field) {
  const count = safeNonNegativeInteger(plan[field]);
  if (count === null) {
    throw new ContractError(
      `production next task operator startup plan: ${field} is required`
    );
  }
  return count;
}

function sanitizeObsPickupStartupSummary(summary) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  const attentionCount = requiredObsPickupStartupSummaryCount(
    summary,
    "attention_obs_pickup_blocking_step_count"
  );
  const readyCount = requiredObsPickupStartupSummaryCount(
    summary,
    "ready_obs_pickup_blocking_step_count"
  );
  const blockingCount = requiredObsPickupStartupSummaryCount(
    summary,
    "obs_pickup_blocking_step_count"
  );
  return {
    schema: "iris_production_next_task_obs_pickup_startup_summary_v1",
    obs_pickup_guidance_only: true,
    real_obs_operation_not_started: true,
    launch_scripts_are_names_only: true,
    env_names_only: true,
    local_bridge_required_before_obs_pickup:
      summary.local_bridge_required_before_obs_pickup === true,
    worker_required_before_obs_pickup:
      summary.worker_required_before_obs_pickup === true,
    obs_setup_required_before_obs_pickup:
      summary.obs_setup_required_before_obs_pickup === true,
    obs_pickup_blocking_step_count: blockingCount,
    ready_obs_pickup_blocking_step_count: readyCount,
    attention_obs_pickup_blocking_step_count: attentionCount,
    next_obs_pickup_readiness_state:
      attentionCount > 0 ? "configuration_waiting" : "ready",
    next_obs_pickup_blocking_step_id: isSafeDiagnosticLabel(
      summary.next_obs_pickup_blocking_step_id
    )
      ? summary.next_obs_pickup_blocking_step_id
      : null,
    next_obs_pickup_blocking_step_order: safeNonNegativeInteger(
      summary.next_obs_pickup_blocking_step_order
    ),
    next_obs_pickup_blocking_launch_script:
      typeof summary.next_obs_pickup_blocking_launch_script === "string"
        ? summary.next_obs_pickup_blocking_launch_script
        : null,
    next_obs_pickup_blocking_readiness_script:
      typeof summary.next_obs_pickup_blocking_readiness_script === "string"
        ? summary.next_obs_pickup_blocking_readiness_script
        : null,
    obs_pickup_startup_state:
      attentionCount > 0
        ? "obs_pickup_startup_waiting"
        : "obs_pickup_startup_ready",
    boundary_policy: {
      booleans_counts_and_script_names_only: true,
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function requiredObsPickupStartupSummaryCount(summary, field) {
  const count = safeNonNegativeInteger(summary[field]);
  if (count === null) {
    throw new ContractError(
      `production next task OBS pickup startup summary: ${field} is required`
    );
  }
  return count;
}

export function assertProductionNextTaskOperatorStartupSummarySafe(
  summary,
  context = "production next task operator startup summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: operator startup summary is required`);
  }
  if (
    summary.schema !==
    "iris_production_next_task_operator_startup_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid operator startup summary schema`);
  }
  for (const field of [
    "startup_step_count",
    "ready_to_start_count",
    "attention_startup_count",
    "long_running_service_count",
    "watch_worker_count",
    "one_shot_setup_count",
    "dedicated_terminal_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid operator startup ${field}`);
    }
  }
  if (
    summary.ready_to_start_count + summary.attention_startup_count !==
    summary.startup_step_count
  ) {
    throw new ContractError(`${context}: invalid startup readiness counts`);
  }
  if (
    summary.long_running_service_count +
      summary.watch_worker_count +
      summary.one_shot_setup_count !==
    summary.startup_step_count
  ) {
    throw new ContractError(`${context}: invalid startup kind counts`);
  }
  if (summary.dedicated_terminal_count > summary.startup_step_count) {
    throw new ContractError(`${context}: invalid dedicated terminal count`);
  }
  if (summary.attention_startup_count === 0) {
    if (
      summary.next_startup_step_id !== null ||
      summary.next_startup_step_order !== null ||
      summary.next_startup_script !== null ||
      summary.next_readiness_script !== null ||
      summary.next_readiness_state !==
        (summary.ready_to_start_count > 0 ? "real_device_waiting" : null) ||
      !Array.isArray(summary.next_configure_env) ||
      summary.next_configure_env.length !== 0
    ) {
      throw new ContractError(`${context}: unexpected next startup step`);
    }
  } else {
    if (
      !isSafeDiagnosticLabel(summary.next_startup_step_id) ||
      !Number.isInteger(summary.next_startup_step_order) ||
      summary.next_startup_step_order < 1 ||
      summary.next_startup_script === null ||
      summary.next_readiness_script === null ||
      summary.next_readiness_state !== "configuration_waiting"
    ) {
      throw new ContractError(`${context}: invalid next startup step`);
    }
  }
  assertSafeOptionalReadinessState(summary.next_readiness_state, context);
  assertStartupReadinessStateCountsSafe(summary, context);
  if (summary.next_startup_script !== null) {
    assertSafeScriptName(summary.next_startup_script, context);
  }
  if (summary.next_readiness_script !== null) {
    assertSafeScriptName(summary.next_readiness_script, context);
  }
  assertEnvNameListSafe(summary.next_configure_env, `${context}: next configure env`);
  for (const field of [
    "local_bridge_required_before_dev_server",
    "worker_required_before_obs_pickup",
    "obs_setup_can_be_manual",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid startup policy`);
    }
  }
  if (summary.obs_pickup_startup_summary !== null) {
    assertProductionNextTaskObsPickupStartupSummarySafe(
      summary.obs_pickup_startup_summary,
      `${context}: OBS pickup startup summary`
    );
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    STARTUP_SUMMARY_BOUNDARY_FIELDS,
    `${context}: startup boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: startup summary adapter validation required`);
  }
}

function assertProductionNextTaskObsPickupStartupSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  if (summary.schema !== "iris_production_next_task_obs_pickup_startup_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of [
    "obs_pickup_guidance_only",
    "real_obs_operation_not_started",
    "launch_scripts_are_names_only",
    "env_names_only",
    "local_bridge_required_before_obs_pickup",
    "worker_required_before_obs_pickup",
    "obs_setup_required_before_obs_pickup",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "obs_pickup_blocking_step_count",
    "ready_obs_pickup_blocking_step_count",
    "attention_obs_pickup_blocking_step_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    summary.ready_obs_pickup_blocking_step_count +
      summary.attention_obs_pickup_blocking_step_count !==
    summary.obs_pickup_blocking_step_count
  ) {
    throw new ContractError(`${context}: invalid OBS pickup startup counts`);
  }
  assertSafeOptionalReadinessState(summary.next_obs_pickup_readiness_state, context);
  if (summary.attention_obs_pickup_blocking_step_count === 0) {
    if (
      summary.next_obs_pickup_blocking_step_id !== null ||
      summary.next_obs_pickup_blocking_step_order !== null ||
      summary.next_obs_pickup_blocking_launch_script !== null ||
      summary.next_obs_pickup_blocking_readiness_script !== null ||
      summary.next_obs_pickup_readiness_state !== "ready" ||
      summary.obs_pickup_startup_state !== "obs_pickup_startup_ready"
    ) {
      throw new ContractError(`${context}: unexpected next OBS pickup blocker`);
    }
  } else if (
    !isSafeDiagnosticLabel(summary.next_obs_pickup_blocking_step_id) ||
    !Number.isInteger(summary.next_obs_pickup_blocking_step_order) ||
    summary.next_obs_pickup_blocking_step_order < 1 ||
    summary.next_obs_pickup_blocking_launch_script === null ||
    summary.next_obs_pickup_blocking_readiness_script === null ||
    summary.obs_pickup_startup_state !== "obs_pickup_startup_waiting"
  ) {
    throw new ContractError(`${context}: invalid next OBS pickup blocker`);
  }
  if (summary.next_obs_pickup_blocking_launch_script !== null) {
    assertSafeScriptName(summary.next_obs_pickup_blocking_launch_script, context);
  }
  if (summary.next_obs_pickup_blocking_readiness_script !== null) {
    assertSafeScriptName(summary.next_obs_pickup_blocking_readiness_script, context);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "booleans_counts_and_script_names_only",
      "env_names_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
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

function assertSafeOptionalReadinessState(state, context) {
  if (state !== null && !READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
}

function assertStartupReadinessStateCountsSafe(summary, context) {
  const counts = summary.startup_readiness_state_counts;
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: startup readiness counts required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid startup ${state} count`);
    }
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: invalid startup readiness count key`);
    }
  }
  if (counts.configuration_waiting !== summary.attention_startup_count) {
    throw new ContractError(`${context}: configuration-waiting count mismatch`);
  }
  if (counts.real_device_waiting !== summary.ready_to_start_count) {
    throw new ContractError(`${context}: real-device-waiting count mismatch`);
  }
}

function createFoundationDiagnosticDetail({ foundation, foundationLaunchPlan }) {
  const foundationChecks = foundation.foundation_checks;
  const foundationIntegrations = foundation.foundation_integrations;
  const summary = foundation.foundation_summary;
  return sanitizeDiagnosticDetail({
    gate_status: foundation.foundation_readiness_status,
    stage_status:
      foundation.foundation_readiness_status === "ready_for_runtime_handoff"
        ? "ready"
        : "attention",
    next_attention_reason: summary.next_attention_reason,
    launch_plan_status: foundationLaunchPlan.plan_status,
    runtime_http_adapters_configured: summary.runtime_http_adapters_configured,
    local_bridge_storage_configured: summary.local_bridge_storage_configured,
    render_manifest_stale_guard_configured:
      summary.render_manifest_stale_guard_configured,
    render_artifact_sync_guard_configured:
      summary.render_artifact_sync_guard_configured,
    real_tts_engine_configured: summary.real_tts_engine_configured,
    original_voice_profile_configured:
      summary.original_voice_profile_configured,
    original_voice_style_profile_configured:
      summary.original_voice_style_profile_configured,
    licensed_voice_source_status_configured:
      summary.licensed_voice_source_status_configured,
    original_voice_source_status: summary.original_voice_source_status,
    original_voice_engine_preferences_configured:
      summary.original_voice_engine_preferences_configured,
    real_live2d_engine_configured: summary.real_live2d_engine_configured,
    obs_browser_source_configured: summary.obs_browser_source_configured,
    obs_setup_bridge_configured: summary.obs_setup_bridge_configured,
    obs_setup_bridge_health_configured: summary.obs_setup_bridge_health_configured,
    local_target_policy_attention: summary.local_target_policy_attention,
    render_manifest_store_configured: summary.render_manifest_store_configured,
    latest_render_manifest_available: summary.latest_render_manifest_available,
    http_origin_configured: summary.http_origin_configured,
    local_bridge_worker_readiness_status:
      summary.local_bridge_worker_readiness_status,
    tts_adapter_readiness_status: summary.tts_adapter_readiness_status,
    live2d_adapter_readiness_status: summary.live2d_adapter_readiness_status,
    subtitle_adapter_readiness_status: summary.subtitle_adapter_readiness_status,
    obs_handoff_readiness_status: summary.obs_handoff_readiness_status,
    attention_reason_count: summary.attention_reason_count,
    missing_required_env_count: foundationLaunchPlan.missing_required_env_count,
    configured_env_count: countUniqueConfiguredEnv(foundationChecks),
    foundation_check_count: foundationChecks.length,
    foundation_ready_check_count: foundationChecks.filter(
      (check) => check.status === "ready"
    ).length,
    foundation_attention_check_count: foundationChecks.filter(
      (check) => check.status === "attention"
    ).length,
    foundation_integration_count: foundationIntegrations.length,
    foundation_configured_integration_count: foundationIntegrations.filter(
      (integration) => integration.status === "configured"
    ).length,
    foundation_attention_integration_count: foundationIntegrations.filter(
      (integration) => integration.status !== "configured"
    ).length,
    launch_step_count: foundationLaunchPlan.launch_sequence?.length,
    ready_launch_step_count: foundationLaunchPlan.ready_step_count,
    attention_launch_step_count: foundationLaunchPlan.attention_step_count,
    next_launch_step_order: foundationLaunchPlan.next_step_order,
    verification_script_count:
      foundationLaunchPlan.verification_handoff_summary?.verification_script_count,
    expected_runtime_status:
      foundationLaunchPlan.runtime_handoff_verification_summary
        ?.foundation_runtime_status_expected,
    expected_runtime_flow_status: "ready_for_obs_runtime_handoff",
  });
}

function createYouTubeDiagnosticDetail({
  youtubePreflight,
  youtubeSourceStatus,
  youtubeLaunchPlan,
  gateStatus,
}) {
  return sanitizeDiagnosticDetail({
    gate_status: gateStatus,
    stage_status: youtubePreflight.ingest_stage_summary.stage_status,
    next_attention_reason:
      youtubePreflight.next_attention_reason ?? youtubeSourceStatus.error_kind,
    launch_plan_status: youtubeLaunchPlan.plan_status,
    source_mode: youtubePreflight.source_mode,
    auth_mode: youtubePreflight.auth_mode,
    local_target_policy_status: youtubePreflight.local_target_policy_status,
    source_configured: youtubeSourceStatus.source_configured,
    source_status_available: youtubeSourceStatus.source_status_available,
    source_kind: youtubeSourceStatus.source_kind,
    source_instantiation_status: youtubeSourceStatus.instantiation_status,
    source_error_kind: youtubeSourceStatus.error_kind,
    ingest_scheduler_enabled: youtubePreflight.ingest_scheduler_enabled,
    scheduler_required_for_live_polling:
      youtubePreflight.scheduler_required_for_live_polling,
    auth_ready: youtubePreflight.auth_ready,
    oauth_refresh_client_configured:
      youtubePreflight.oauth_refresh_client_configured,
    cursor_store_configured: youtubePreflight.cursor_store_configured,
    cursor_store_required_for_restart_resume:
      youtubePreflight.cursor_store_required_for_restart_resume,
    attention_reason_count:
      youtubePreflight.attention_reason_count +
      (youtubeSourceStatus.instantiation_status === "ready" ? 0 : 1),
    missing_required_env_count: youtubePreflight.missing_required_env.length,
    configured_env_count: youtubePreflight.configured_env.length,
    ingest_stage_integration_count:
      youtubePreflight.ingest_stage_summary.integration_count,
    ingest_stage_ready_integration_count:
      youtubePreflight.ingest_stage_summary.ready_integration_count,
    ingest_stage_attention_integration_count:
      youtubePreflight.ingest_stage_summary.attention_integration_count,
    launch_step_count: youtubeLaunchPlan.launch_sequence?.length,
    ready_launch_step_count: youtubeLaunchPlan.ready_step_count,
    attention_launch_step_count: youtubeLaunchPlan.attention_step_count,
    next_launch_step_order: youtubeLaunchPlan.next_step_order,
    verification_script_count:
      youtubePreflight.verification_plan_summary.verification_script_count,
    expected_runtime_status:
      youtubeLaunchPlan.runtime_poll_verification_summary
        ?.runtime_polling_status_expected,
    expected_runtime_flow_status: "runtime_active_with_comments_and_support",
  });
}

function createPersistenceDiagnosticDetail({ persistence, persistenceLaunchPlan }) {
  return sanitizeDiagnosticDetail({
    gate_status: persistence.preflight_status,
    stage_status: persistence.persistence_stage_summary.stage_status,
    next_attention_reason: persistence.next_attention_reason,
    launch_plan_status: persistenceLaunchPlan.plan_status,
    json_store_status: persistence.json_store_status,
    vector_memory_status: persistence.vector_memory_status,
    persistence_mode: persistence.persistence_mode,
    vector_memory_mode: persistence.vector_memory_mode,
    vector_memory_target_policy_status:
      persistence.vector_memory_target_policy_status,
    memory_store_path_configured: persistence.memory_store_path_configured,
    relationship_store_path_configured:
      persistence.relationship_store_path_configured,
    candidate_persistence_ready: persistence.candidate_persistence_ready,
    relationship_memory_ready: persistence.relationship_memory_ready,
    vector_memory_adapter_ready: persistence.vector_memory_adapter_ready,
    vector_memory_required_for_production_search:
      persistence.vector_memory_required_for_production_search,
    attention_reason_count: persistence.attention_reason_count,
    missing_required_env_count: persistence.missing_required_env.length,
    configured_env_count: persistence.configured_env.length,
    persistence_stage_integration_count:
      persistence.persistence_stage_summary.integration_count,
    persistence_stage_ready_integration_count:
      persistence.persistence_stage_summary.ready_integration_count,
    persistence_stage_attention_integration_count:
      persistence.persistence_stage_summary.attention_integration_count,
    launch_step_count: persistenceLaunchPlan.launch_sequence?.length,
    ready_launch_step_count: persistenceLaunchPlan.ready_step_count,
    attention_launch_step_count: persistenceLaunchPlan.attention_step_count,
    next_launch_step_order: persistenceLaunchPlan.next_step_order,
    verification_script_count:
      persistence.verification_plan_summary.verification_script_count,
    expected_runtime_status:
      persistenceLaunchPlan.runtime_persistence_verification
        ?.runtime_active_status_expected,
    expected_runtime_flow_status: "memory_and_relationship_active",
  });
}

function createGameplayDiagnosticDetail({ gameplay, gameplayLaunchPlan }) {
  return sanitizeDiagnosticDetail({
    gate_status: gameplay.preflight_status,
    stage_status: gameplay.gameplay_stage_summary.stage_status,
    next_attention_reason: gameplay.next_attention_reason,
    launch_plan_status: gameplayLaunchPlan.plan_status,
    vision_status: gameplay.vision_status,
    game_control_status: gameplay.game_control_status,
    vision_mode: gameplay.vision_mode,
    game_control_mode: gameplay.game_control_mode,
    vision_target_policy_status: gameplay.vision_target_policy_status,
    game_control_target_policy_status:
      gameplay.game_control_target_policy_status,
    vision_target_configured: gameplay.vision_target_configured,
    vision_request_method_configured:
      gameplay.vision_request_method_configured,
    vision_request_method_supported: gameplay.vision_request_method_supported,
    ingest_scheduler_enabled: gameplay.ingest_scheduler_enabled,
    scheduler_required_for_screen_polling:
      gameplay.scheduler_required_for_screen_polling,
    game_control_enabled: gameplay.game_control_enabled,
    game_control_http_adapter_ready: gameplay.game_control_http_adapter_ready,
    game_control_target_configured: gameplay.game_control_target_configured,
    available_actions_configured: gameplay.available_actions_configured,
    fallback_to_wait_when_unconfigured:
      gameplay.fallback_to_wait_when_unconfigured,
    rate_limit_env_configured: gameplay.rate_limit_env_configured,
    stale_observation_guard_env_configured:
      gameplay.stale_observation_guard_env_configured,
    attention_reason_count: gameplay.attention_reason_count,
    missing_required_env_count: gameplay.missing_required_env.length,
    configured_env_count: gameplay.configured_env.length,
    gameplay_stage_integration_count:
      gameplay.gameplay_stage_summary.integration_count,
    gameplay_stage_ready_integration_count:
      gameplay.gameplay_stage_summary.ready_integration_count,
    gameplay_stage_attention_integration_count:
      gameplay.gameplay_stage_summary.attention_integration_count,
    approved_action_kind_count: gameplay.approved_action_kind_count,
    unsupported_action_name_count: gameplay.unsupported_action_name_count,
    launch_step_count: gameplayLaunchPlan.launch_sequence?.length,
    ready_launch_step_count: gameplayLaunchPlan.ready_step_count,
    attention_launch_step_count: gameplayLaunchPlan.attention_step_count,
    next_launch_step_order: gameplayLaunchPlan.next_step_order,
    verification_script_count:
      gameplay.verification_plan_summary.verification_script_count,
    expected_runtime_status:
      gameplayLaunchPlan.runtime_safe_control_verification
        ?.runtime_safe_control_status_expected,
    expected_runtime_flow_status: "safe_control_active",
  });
}

function sanitizeDiagnosticDetail(detail) {
  const sanitized = {
    schema: "iris_production_next_task_gate_diagnostic_detail_v1",
  };
  for (const [field, value] of Object.entries(detail)) {
    if (SAFE_DIAGNOSTIC_BOOLEAN_FIELDS.has(field)) {
      if (typeof value === "boolean" || value === null) sanitized[field] = value;
      continue;
    }
    if (SAFE_DIAGNOSTIC_COUNT_FIELDS.has(field)) {
      const count = safeNonNegativeInteger(value);
      if (count !== null) sanitized[field] = count;
      continue;
    }
    if (SAFE_DIAGNOSTIC_LABEL_FIELDS.has(field)) {
      sanitized[field] = isSafeDiagnosticLabel(value) ? value : null;
    }
  }
  assertProductionNextTaskGateDiagnosticDetailSafe(sanitized);
  return sanitized;
}

function countUniqueConfiguredEnv(items) {
  return new Set(
    items.flatMap((item) =>
      Array.isArray(item.configured_env) ? item.configured_env : []
    )
  ).size;
}

function safeNonNegativeInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.trunc(number);
}

function isSafeDiagnosticLabel(value) {
  return typeof value === "string" && /^[a-z0-9_]+$/.test(value);
}

function gateBoundaryPolicy() {
  return {
    script_names_only: true,
    env_counts_only: true,
    env_names_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_payloads: true,
    no_candidates: true,
    no_commands: true,
    read_only_gate: true,
  };
}

function summarizeLaunchNext(launchPlan) {
  if (
    Object.hasOwn(launchPlan, "next_step_id") &&
    Object.hasOwn(launchPlan, "next_step_order") &&
    Object.hasOwn(launchPlan, "next_launch_script") &&
    Object.hasOwn(launchPlan, "next_readiness_script") &&
    Object.hasOwn(launchPlan, "next_configure_env")
  ) {
    return {
      next_launch_step_id: launchPlan.next_step_id,
      next_launch_step_order: launchPlan.next_step_order,
      next_launch_script: launchPlan.next_launch_script,
      next_readiness_script: launchPlan.next_readiness_script,
      next_configure_env: launchPlan.next_configure_env,
    };
  }
  const nextStep =
    launchPlan.launch_sequence.find((step) =>
      ["missing_required_env", "configuration_attention"].includes(
        step.launch_readiness_status
      )
    ) ?? null;
  return {
    next_launch_step_id: nextStep?.process_id ?? null,
    next_launch_step_order: nextStep?.sequence_order ?? null,
    next_launch_script: nextStep?.launch_script ?? null,
    next_readiness_script: nextStep?.readiness_script ?? null,
    next_configure_env: nextStep ? nextConfigureEnv(nextStep) : [],
  };
}

function nextConfigureEnv(step) {
  const missingGroupEnv = Array.isArray(step.missing_required_env_groups)
    ? step.missing_required_env_groups.flatMap((group) =>
        Array.isArray(group.env_options) ? group.env_options.flatMap((option) => option) : []
      )
    : [];
  const candidates = [
    ...step.missing_required_env,
    ...missingGroupEnv,
  ];
  const fallback =
    candidates.length > 0
      ? candidates
      : step.configure_next_env.length > 0
        ? step.configure_next_env
        : step.required_env;
  return [...new Set(fallback)].filter((name) => /^IRIS_[A-Z0-9_]+$/.test(name));
}

function assertEnvNameListSafe(names, context) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of names) {
    if (typeof name !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
}

function assertSafeScriptName(script, context) {
  if (
    typeof script !== "string" ||
    !(
      /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
        script
      ) || script === "npm test"
    )
  ) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function assertNoForbiddenNextTaskFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenNextTaskFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const field of Object.keys(value)) {
    if (FORBIDDEN_NEXT_TASK_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { path, field });
    }
    assertNoForbiddenNextTaskFields(value[field], context, `${path}.${field}`);
  }
}
