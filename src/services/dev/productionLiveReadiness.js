import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationLiveReadinessReportSafe,
  createFoundationLiveReadinessReport,
} from "./foundationLiveReadiness.js";
import {
  assertGameplayLiveReadinessReportSafe,
  createGameplayLiveReadinessReport,
} from "./gameplayLiveReadiness.js";
import {
  assertPersistenceLiveReadinessReportSafe,
  createPersistenceLiveReadinessReport,
} from "./persistenceLiveReadiness.js";
import {
  assertYouTubeIngestLiveReadinessReportSafe,
  createYouTubeIngestLiveReadinessReport,
} from "./youtubeIngestLiveReadiness.js";
import {
  assertProductionNextTaskOperatorStartupSummarySafe,
  assertProductionNextTaskReportSafe,
  createProductionNextTaskReport,
} from "./productionNextTask.js";

const FORBIDDEN_PRODUCTION_LIVE_READINESS_FIELDS = new Set([
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
  "last_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "password",
  "authorization",
  "value",
  "payload",
  "path",
  "artifact_path",
  "cursor_path",
  "filePath",
  "file_path",
  "memory_store_path",
  "relationship_store_path",
  "store_path",
  "viewer_id",
  "viewerId",
  "author_id",
  "authorId",
  "channel_id",
  "channelId",
  "display_name",
  "displayName",
  "summary",
  "recent_summaries",
  "raw_frame",
  "image",
  "frame",
  "ocr_text",
]);

const OVERALL_STATUSES = new Set([
  "foundation_attention",
  "youtube_ingest_attention",
  "persistence_attention",
  "gameplay_attention",
  "ready_for_live_operation",
]);
const STAGE_IDS = new Set([
  "tts_live2d_obs_foundation",
  "youtube_comments_and_support",
  "memory_and_relationship_persistence",
  "vision_and_safe_game_control",
]);
const STAGE_ID_BY_PRIORITY = new Map([
  [1, "tts_live2d_obs_foundation"],
  [2, "youtube_comments_and_support"],
  [3, "memory_and_relationship_persistence"],
  [4, "vision_and_safe_game_control"],
]);
const EXPECTED_LIVE_READINESS_STATUSES = new Set([
  "ready_for_live_obs_operation",
  "ready_for_youtube_live_ingest",
  "ready_for_persistence_operation",
  "ready_for_gameplay_safe_control",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const PRODUCTION_READINESS_BLOCKER_CLASSIFICATIONS = new Set([
  "BLOCKED",
  "attention",
  "ready",
  "degraded",
]);
const PRODUCTION_READINESS_BLOCKER_CLASSIFIER_FIELDS = new Set([
  "schema",
  "classification",
  "readiness_state",
  "safe_status",
  "real_runtime_confirmed",
  "ready_allowed",
  "boundary_policy",
]);
const PRODUCTION_READINESS_COMPONENT_DEPENDENCY_MAP_FIELDS = new Set([
  "schema",
  "component_count",
  "ready_component_count",
  "attention_component_count",
  "components",
  "boundary_policy",
]);
const PRODUCTION_READINESS_SAFE_NEXT_ACTION_FIELDS = new Set([
  "schema",
  "action_kind",
  "next_safe_script",
  "operator_action_label",
  "boundary_policy",
]);
const PRODUCTION_READINESS_FIXTURE_MODE_LABEL_FIELDS = new Set([
  "schema",
  "fixture_status",
  "real_readiness_status",
  "fixture_success_is_real_ready",
  "boundary_policy",
]);
const PRODUCTION_READINESS_PUBLIC_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "readiness_status",
  "ready_count",
  "attention_count",
  "blocked_count",
  "boundary_policy",
]);
const PRODUCTION_READINESS_COMPONENT_DEPENDENCY_FIELDS = new Set([
  "schema",
  "component_id",
  "dependency_status",
  "readiness_state",
  "required_for_live",
]);
const PRODUCTION_READINESS_COMPONENT_IDS = new Set([
  "local_bridge",
  "tts",
  "live2d",
  "subtitle",
  "obs",
  "overlay_pickup",
]);
const PRODUCTION_LIVE_READINESS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "overall_status",
  "next_priority",
  "next_stage_id",
  "next_live_readiness_script",
  "next_runtime_status_script",
  "next_check_script",
  "next_readiness_state",
  "readiness_state_counts",
  "next_launch_script",
  "next_readiness_script",
  "next_startup_checklist_script",
  "next_configure_env",
  "next_operator_startup_summary",
  "next_expected_live_readiness_status",
  "foundation_obs_pickup_startup_summary",
  "ready_stage_count",
  "attention_stage_count",
  "priority_stages",
  "production_handoff_summary",
  "verification_scripts",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_LIVE_READINESS_STAGE_FIELDS = new Set([
  "schema",
  "priority",
  "stage_id",
  "ready",
  "stage_live_readiness_status",
  "expected_live_readiness_status",
  "overall_attention_status",
  "first_attention_gate_id",
  "first_attention_gate_status",
  "first_attention_blocking_stage",
  "first_attention_check_script",
  "readiness_state",
  "readiness_state_counts",
  "gate_count",
  "ready_gate_count",
  "attention_gate_count",
  "runtime_status_script",
  "live_readiness_script",
  "startup_checklist_script",
  "expected_runtime_status",
  "operator_startup_summary",
  "obs_pickup_startup_summary",
  "gate_summaries",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_LIVE_READINESS_GATE_FIELDS = new Set([
  "schema",
  "gate_id",
  "ready",
  "gate_status",
  "blocking_stage",
  "check_script",
  "next_check_script",
  "readiness_state",
  "diagnostic_detail",
  "boundary_policy",
  "adapter_validation_required",
]);
const FOUNDATION_OBS_PICKUP_STARTUP_SUMMARY_FIELDS = new Set([
  "schema",
  "obs_pickup_guidance_only",
  "real_obs_operation_not_started",
  "startup_scripts_are_names_only",
  "env_names_only",
  "local_bridge_required_before_obs_pickup",
  "worker_required_before_obs_pickup",
  "obs_setup_required_before_obs_pickup",
  "obs_pickup_blocking_step_count",
  "ready_obs_pickup_blocking_step_count",
  "attention_obs_pickup_blocking_step_count",
  "next_obs_pickup_readiness_state",
  "next_obs_pickup_blocking_step_id",
  "next_obs_pickup_blocking_step_order",
  "next_obs_pickup_blocking_launch_script",
  "next_obs_pickup_blocking_readiness_script",
  "obs_pickup_startup_state",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_READINESS_BLOCKER_CLASSIFIER_BOUNDARY_FIELDS = new Set([
  "fixed_classification_only",
  "real_runtime_required_for_ready",
  "no_readiness_sweetening",
  "no_secret_values",
  "no_endpoint_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const PRODUCTION_READINESS_COMPONENT_DEPENDENCY_BOUNDARY_FIELDS = new Set([
  "safe_component_status_summary_only",
  "component_ids_are_fixed",
  "status_counts_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_paths",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const PRODUCTION_READINESS_SAFE_NEXT_ACTION_BOUNDARY_FIELDS = new Set([
  "safe_script_or_operator_label_only",
  "no_endpoint_values",
  "no_paths",
  "no_tokens",
  "no_secret_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const PRODUCTION_READINESS_FIXTURE_MODE_LABEL_BOUNDARY_FIELDS = new Set([
  "fixture_and_real_readiness_separated",
  "fixture_success_not_real_ready",
  "no_readiness_sweetening",
  "no_secret_values",
  "no_endpoint_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const PRODUCTION_READINESS_PUBLIC_SAFE_SUMMARY_BOUNDARY_FIELDS = new Set([
  "status_and_counts_only",
  "no_raw_logs",
  "redacted_raw_payload_values",
  "redacted_network_values",
  "redacted_auth_values",
  "redacted_review_items",
  "no_control_directives",
]);
const GAMEPLAY_STAGE_GATE_SCRIPTS = Object.freeze({
  configuration_gate: "npm run dev:gameplay:preflight",
  scheduler_gate: "npm run dev:gameplay:runtime-status",
  vision_capture_gate: "npm run dev:vision:game-roundtrip",
  action_gate: "npm run dev:gameplay:validation-gate-roundtrip",
  adapter_gate: "npm run dev:game-control:roundtrip",
  safe_control_gate: "npm run dev:gameplay:runtime-roundtrip",
  lifecycle_gate: "npm run dev:gameplay:runtime-roundtrip",
  vision_to_action_gate: "npm run dev:gameplay:validation-gate-roundtrip",
});
const SAFE_STAGE_STATUS_PATTERN = /^[a-z0-9_]+$/;
const URL_PATTERN = /https?:\/\//i;
const SAFE_GATE_BOOLEAN_DETAIL_FIELDS = new Set([
  "foundation_ready",
  "local_bridge_worker_ready",
  "local_bridge_worker_queue_clear",
  "real_engine_handoff_ready",
  "obs_browser_source_ready",
  "overlay_runtime_available",
  "runtime_event_available",
  "overlay_event_stream_available",
  "tts_engine_http_ready",
  "tts_engine_preferences_configured",
  "original_voice_profile_configured",
  "original_voice_style_profile_configured",
  "licensed_voice_source_status_configured",
  "original_voice_engine_preferences_configured",
  "live2d_engine_http_ready",
  "subtitle_renderer_ready",
  "worker_ready_for_handoff",
  "worker_queue_clear",
  "origin_configured",
  "source_dimensions_configured",
  "overlay_routes_ready",
  "local_bridge_handoff_routes_ready",
  "latest_manifest_available",
  "obs_pickup_ready",
  "obs_bridge_health_required",
  "obs_bridge_health_passed_or_not_required",
  "local_endpoint_policy_all_allowed_required",
]);
const SAFE_GATE_COUNT_DETAIL_FIELDS = new Set([
  "foundation_attention_reason_count",
  "foundation_stage_ready_check_count",
  "foundation_stage_attention_check_count",
  "engine_health_pass_count",
  "engine_health_attention_count",
  "engine_health_required_pass_count",
  "configured_real_engine_count",
  "required_real_engine_count",
  "queue_pending_job_count",
  "queue_retry_ready_count",
  "queue_retry_waiting_count",
  "queue_retry_blocked_count",
  "queue_invalid_json_line_count",
  "complete_manifest_count",
  "overlay_route_count",
  "local_bridge_handoff_route_count",
  "required_adapter_kind_count",
  "artifact_pickup_ready_adapter_count",
  "required_artifact_pickup_ready_adapter_count",
  "local_endpoint_policy_blocked_check_count",
  "adapter_probe_attention_count",
]);
const SAFE_GATE_LABEL_DETAIL_FIELDS = new Set([
  "runtime_flow_status",
  "runtime_flow_blocking_stage",
  "real_engine_worker_flow_status",
  "real_engine_worker_blocking_stage",
  "handoff_status",
  "tts_engine_health_status",
  "original_voice_source_status",
  "live2d_engine_health_status",
  "artifact_flow_status",
  "artifact_blocking_stage",
  "obs_bridge_health_status",
  "probe_mode",
  "production_probe_readiness_status",
  "production_probe_verification_status",
  "foundation_stage_status",
]);
const FOUNDATION_STARTUP_PROCESS_IDS = new Set([
  "voicevox_tts_engine_bridge",
  "live2d_cue_engine_bridge",
  "local_adapter_bridge",
  "local_bridge_worker",
  "iris_dev_server",
  "obs_browser_source_setup",
]);
const OBS_PICKUP_STARTUP_STATES = new Set([
  "obs_pickup_startup_ready",
  "obs_pickup_startup_waiting",
]);
const REPORT_BOUNDARY_FIELDS = Object.freeze([
  "env_names_only",
  "script_names_only",
  "counts_statuses_booleans_and_policy_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_text_payloads",
  "no_memory_records",
  "no_relationship_records",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
  "no_raw_scheduler_results",
  "no_raw_stream_state",
  "read_only_live_readiness",
  "no_polling_side_effects",
  "no_control_side_effects",
  "synthetic_fixture_post_only",
]);
const STAGE_BOUNDARY_FIELDS = Object.freeze([
  "script_names_only",
  "counts_statuses_booleans_and_policy_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
  "read_only_stage_summary",
]);
const GATE_BOUNDARY_FIELDS = Object.freeze([
  "fixed_statuses_and_booleans_only",
  "script_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const VERIFICATION_SCRIPT_FIELDS = Object.freeze({
  production_live_readiness_script: "npm run dev:production:live-readiness",
  production_next_task_script: "npm run dev:production:next-task",
  production_runtime_handoff_status_script:
    "npm run dev:production:runtime-handoff-status",
  production_loop_verification_script:
    "npm run dev:production-loop:roundtrip",
  postgres_admin_save_preflight_script:
    "npm run dev:persistence:postgres-admin-save-preflight",
  operator_policy_async_save_gate_roundtrip_script:
    "npm run dev:operator-policy:async-save-gate-roundtrip",
  admin_review_auth_gate_script: "npm run dev:admin:review-auth-gate",
  admin_review_validator_run_plan_script:
    "npm run dev:admin:review-validator-run-plan",
  foundation_live_readiness_script: "npm run dev:foundation:live-readiness",
  foundation_readiness_rehearsal_script:
    "npm run dev:foundation:readiness-rehearsal",
  foundation_local_env_profile_script:
    "npm run dev:foundation:local-env-profile",
  foundation_local_env_apply_script: "npm run dev:foundation:local-env-apply",
  foundation_startup_checklist_script:
    "npm run dev:foundation:startup-checklist",
  foundation_env_setup_plan_script: "npm run dev:foundation:env-setup-plan",
  foundation_connector_handoff_script:
    "npm run dev:foundation:connector-handoff",
  foundation_runtime_status_script: "npm run dev:foundation:runtime-status",
  foundation_bridge_status_roundtrip_script:
    "npm run dev:bridge:status-roundtrip",
  foundation_bridge_engine_roundtrip_script:
    "npm run dev:bridge:engine-roundtrip",
  youtube_local_env_profile_script: "npm run dev:youtube:local-env-profile",
  youtube_local_env_apply_script: "npm run dev:youtube:local-env-apply",
  youtube_env_setup_plan_script: "npm run dev:youtube:env-setup-plan",
  youtube_relay_startup_checklist_script:
    "npm run dev:youtube:relay-startup-checklist",
  youtube_live_readiness_script: "npm run dev:youtube:live-readiness",
  youtube_source_specific_roundtrip_script:
    "npm run dev:youtube:direct-live-chat-roundtrip",
  youtube_http_ingest_roundtrip_script:
    "npm run dev:youtube:http-ingest-roundtrip",
  youtube_cursor_roundtrip_script: "npm run dev:youtube:cursor-roundtrip",
  youtube_cursor_backup_roundtrip_script:
    "npm run dev:youtube:cursor-backup-roundtrip",
  persistence_local_env_profile_script:
    "npm run dev:persistence:local-env-profile",
  persistence_local_env_apply_script: "npm run dev:persistence:local-env-apply",
  persistence_env_setup_plan_script:
    "npm run dev:persistence:env-setup-plan",
  persistence_startup_checklist_script:
    "npm run dev:persistence:startup-checklist",
  persistence_live_readiness_script: "npm run dev:persistence:live-readiness",
  persistence_readiness_rehearsal_script:
    "npm run dev:persistence:readiness-rehearsal",
  persistence_memory_vector_bridge_script:
    "npm run dev:memory-vector:bridge",
  persistence_memory_vector_roundtrip_script:
    "npm run dev:memory-vector:roundtrip",
  gameplay_local_env_profile_script:
    "npm run dev:gameplay:local-env-profile",
  gameplay_local_env_apply_script: "npm run dev:gameplay:local-env-apply",
  gameplay_env_setup_plan_script: "npm run dev:gameplay:env-setup-plan",
  gameplay_startup_checklist_script:
    "npm run dev:gameplay:startup-checklist",
  gameplay_live_readiness_script: "npm run dev:gameplay:live-readiness",
  gameplay_readiness_rehearsal_script:
    "npm run dev:gameplay:readiness-rehearsal",
});
const VERIFICATION_BOUNDARY_FIELDS = Object.freeze([
  "script_names_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const OBS_PICKUP_STARTUP_BOUNDARY_FIELDS = Object.freeze([
  "booleans_counts_and_script_names_only",
  "env_names_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
  "no_artifact_paths",
]);
const PRODUCTION_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "live_readiness_aggregate_only",
  "no_real_processes_started_by_report",
  "no_polling_side_effects",
  "no_control_side_effects",
  "no_live_payloads_exposed",
  "stage_count",
  "ready_stage_count",
  "attention_stage_count",
  "next_stage_id",
  "next_live_readiness_script",
  "next_check_script",
  "next_readiness_state",
  "readiness_state_counts",
  "foundation_first_until_live_ready",
  "production_runtime_handoff_status_script",
  "production_loop_verification_script",
  "foundation_obs_pickup_startup_summary",
]);

export async function createProductionLiveReadinessReport({
  env = process.env,
  runtime = null,
  streamState = null,
  httpIngestScheduler = null,
  overlayEventBus = null,
  gameControlAdapterStatus = null,
  gameplayRuntimeStatusOverride = null,
  persistenceRuntimeStatusOverride = null,
  probeMode = "dry_run",
  fetchImpl = globalThis.fetch,
  generatedAtMs = Date.now(),
} = {}) {
  const foundation = await createFoundationLiveReadinessReport({
    env,
    streamState,
    overlayEventBus,
    probeMode,
    fetchImpl,
    generatedAtMs,
  });
  const youtube = createYouTubeIngestLiveReadinessReport({
    env,
    httpIngestScheduler,
    streamState,
    generatedAtMs,
  });
  const persistence = createPersistenceLiveReadinessReport({
    env,
    runtime,
    streamState,
    runtimeStatusOverride: persistenceRuntimeStatusOverride,
    generatedAtMs,
  });
  const gameplay = createGameplayLiveReadinessReport({
    env,
    runtime,
    httpIngestScheduler,
    streamState,
    gameControlAdapterStatus,
    runtimeStatusOverride: gameplayRuntimeStatusOverride,
    generatedAtMs,
  });
  const nextTask = createProductionNextTaskReport({ env, generatedAtMs });
  const foundationObsPickupStartupSummary = sanitizeFoundationObsPickupStartupSummary(
    foundation.obs_pickup_startup_summary
  );

  assertFoundationLiveReadinessReportSafe(
    foundation,
    "production live readiness foundation"
  );
  assertYouTubeIngestLiveReadinessReportSafe(
    youtube,
    "production live readiness youtube"
  );
  assertPersistenceLiveReadinessReportSafe(
    persistence,
    "production live readiness persistence"
  );
  assertGameplayLiveReadinessReportSafe(
    gameplay,
    "production live readiness gameplay"
  );
  assertProductionNextTaskReportSafe(
    nextTask,
    "production live readiness next task"
  );

  const priorityStages = [
    createStageSummary({
      priority: 1,
      stageId: "tts_live2d_obs_foundation",
      report: foundation,
      readyStatus: "ready_for_live_obs_operation",
      overallAttentionStatus: "foundation_attention",
      statusScript: "npm run dev:foundation:runtime-status",
      liveReadinessScript: "npm run dev:foundation:live-readiness",
      startupChecklistScript: "npm run dev:foundation:startup-checklist",
      expectedRuntimeStatus: foundation.verification_scripts.expected_runtime_status,
      operatorStartupSummary:
        nextTask.priority_gates.find(
          (gate) => gate.stage_id === "tts_live2d_obs_foundation"
        )?.operator_startup_summary ?? null,
      obsPickupStartupSummary: foundationObsPickupStartupSummary,
      gates: [
        ["runtime_gate", foundation.runtime_gate, "npm run dev:foundation:runtime-status"],
        ["real_engine_gate", foundation.real_engine_gate, "npm run dev:engine:probe"],
        ["obs_gate", foundation.obs_gate, "npm run dev:obs:runtime-render-roundtrip"],
        ["production_probe_gate", foundation.production_probe_gate, "npm run dev:production:probe"],
      ],
    }),
    createStageSummary({
      priority: 2,
      stageId: "youtube_comments_and_support",
      report: youtube,
      readyStatus: "ready_for_youtube_live_ingest",
      overallAttentionStatus: "youtube_ingest_attention",
      statusScript: "npm run dev:youtube:runtime-status",
      liveReadinessScript: "npm run dev:youtube:live-readiness",
      startupChecklistScript: "npm run dev:youtube:relay-startup-checklist",
      expectedRuntimeStatus: youtube.verification_scripts.expected_runtime_status,
      gates: [
        ["source_gate", youtube.source_gate, "npm run dev:youtube:source-status"],
        ["access_gate", youtube.access_gate, "npm run dev:youtube:ingest-once"],
        ["scheduler_gate", youtube.scheduler_gate, "npm run dev:youtube:runtime-status"],
        ["runtime_ingest_gate", youtube.runtime_ingest_gate, "npm run dev:youtube:runtime-ingest-roundtrip"],
        ["support_pipeline_gate", youtube.support_pipeline_gate, "npm run dev:youtube:support-gate-roundtrip"],
      ],
    }),
    createStageSummary({
      priority: 3,
      stageId: "memory_and_relationship_persistence",
      report: persistence,
      readyStatus: "ready_for_persistence_operation",
      overallAttentionStatus: "persistence_attention",
      statusScript: "npm run dev:persistence:runtime-status",
      liveReadinessScript: "npm run dev:persistence:live-readiness",
      startupChecklistScript: "npm run dev:persistence:startup-checklist",
      expectedRuntimeStatus:
        persistence.verification_scripts.expected_runtime_status,
      gates: [
        ["configuration_gate", persistence.configuration_gate, "npm run dev:persistence:preflight"],
        ["runtime_gate", persistence.runtime_gate, "npm run dev:persistence:runtime-status"],
        ["store_gate", persistence.store_gate, "npm run dev:persistence:status-roundtrip"],
        ["approved_record_gate", persistence.approved_record_gate, "npm run dev:persistence:roundtrip"],
        ["candidate_gate", persistence.candidate_gate, "npm run dev:persistence:candidate-gate-roundtrip"],
        ["relationship_gate", persistence.relationship_gate, "npm run dev:persistence:roundtrip"],
        ["recall_gate", persistence.recall_gate, "npm run dev:persistence:restart-roundtrip"],
        ["lifecycle_gate", persistence.lifecycle_gate, "npm run dev:persistence:roundtrip"],
      ],
    }),
    createStageSummary({
      priority: 4,
      stageId: "vision_and_safe_game_control",
      report: gameplay,
      readyStatus: "ready_for_gameplay_safe_control",
      overallAttentionStatus: "gameplay_attention",
      statusScript: "npm run dev:gameplay:runtime-status",
      liveReadinessScript: "npm run dev:gameplay:live-readiness",
      startupChecklistScript: "npm run dev:gameplay:startup-checklist",
      expectedRuntimeStatus: gameplay.verification_scripts.expected_runtime_status,
      gates: [
        ["configuration_gate", gameplay.configuration_gate, "npm run dev:gameplay:preflight"],
        ["scheduler_gate", gameplay.scheduler_gate, "npm run dev:gameplay:runtime-status"],
        ["vision_capture_gate", gameplay.vision_capture_gate, "npm run dev:vision:game-roundtrip"],
        ["action_gate", gameplay.action_gate, "npm run dev:gameplay:validation-gate-roundtrip"],
        ["adapter_gate", gameplay.adapter_gate, "npm run dev:game-control:roundtrip"],
        ["safe_control_gate", gameplay.safe_control_gate, "npm run dev:gameplay:runtime-roundtrip"],
        ["lifecycle_gate", gameplay.lifecycle_gate, "npm run dev:gameplay:runtime-roundtrip"],
        ["vision_to_action_gate", gameplay.vision_to_action_gate, "npm run dev:gameplay:validation-gate-roundtrip"],
      ],
    }),
  ];

  const nextStage = priorityStages.find((stage) => stage.ready !== true) ?? null;
  const readinessStateCounts = countReadinessStates(
    priorityStages.map((stage) => stage.readiness_state)
  );
  const report = {
    schema: "iris_production_live_readiness_report_v1",
    generated_at_ms: generatedAtMs,
    overall_status: nextStage
      ? nextStage.overall_attention_status
      : "ready_for_live_operation",
    next_priority: nextStage?.priority ?? null,
    next_stage_id: nextStage?.stage_id ?? null,
    next_live_readiness_script: nextStage?.live_readiness_script ?? null,
    next_runtime_status_script: nextStage?.runtime_status_script ?? null,
    next_check_script: nextStage?.first_attention_check_script ?? null,
    next_readiness_state: nextStage?.readiness_state ?? null,
    readiness_state_counts: readinessStateCounts,
    next_launch_script: nextTask.next_launch_script,
    next_readiness_script: nextTask.next_readiness_script,
    next_startup_checklist_script: nextTask.next_startup_checklist_script,
    next_configure_env: nextTask.next_configure_env,
    next_operator_startup_summary: nextTask.next_operator_startup_summary,
    next_expected_live_readiness_status:
      nextStage?.expected_live_readiness_status ?? null,
    foundation_obs_pickup_startup_summary: foundationObsPickupStartupSummary,
    ready_stage_count: priorityStages.filter((stage) => stage.ready).length,
    attention_stage_count: priorityStages.filter((stage) => !stage.ready).length,
    priority_stages: priorityStages,
    production_handoff_summary: {
      schema: "iris_production_live_readiness_handoff_summary_v1",
      live_readiness_aggregate_only: true,
      no_real_processes_started_by_report: true,
      no_polling_side_effects: true,
      no_control_side_effects: true,
      no_live_payloads_exposed: true,
      stage_count: priorityStages.length,
      ready_stage_count: priorityStages.filter((stage) => stage.ready).length,
      attention_stage_count: priorityStages.filter((stage) => !stage.ready).length,
      next_stage_id: nextStage?.stage_id ?? null,
      next_live_readiness_script: nextStage?.live_readiness_script ?? null,
      next_check_script: nextStage?.first_attention_check_script ?? null,
      next_readiness_state: nextStage?.readiness_state ?? null,
      readiness_state_counts: readinessStateCounts,
      foundation_first_until_live_ready:
        nextStage?.stage_id === "tts_live2d_obs_foundation",
      production_runtime_handoff_status_script:
        "npm run dev:production:runtime-handoff-status",
      production_loop_verification_script:
        "npm run dev:production-loop:roundtrip",
      foundation_obs_pickup_startup_summary: foundationObsPickupStartupSummary,
    },
    verification_scripts: {
      schema: "iris_production_live_readiness_scripts_v1",
      production_live_readiness_script: "npm run dev:production:live-readiness",
      production_next_task_script: "npm run dev:production:next-task",
      production_runtime_handoff_status_script:
        "npm run dev:production:runtime-handoff-status",
      production_loop_verification_script:
        "npm run dev:production-loop:roundtrip",
      postgres_admin_save_preflight_script:
        "npm run dev:persistence:postgres-admin-save-preflight",
      operator_policy_async_save_gate_roundtrip_script:
        "npm run dev:operator-policy:async-save-gate-roundtrip",
      admin_review_auth_gate_script: "npm run dev:admin:review-auth-gate",
      admin_review_validator_run_plan_script:
        "npm run dev:admin:review-validator-run-plan",
      foundation_live_readiness_script: "npm run dev:foundation:live-readiness",
      foundation_readiness_rehearsal_script:
        "npm run dev:foundation:readiness-rehearsal",
      foundation_local_env_profile_script:
        "npm run dev:foundation:local-env-profile",
      foundation_local_env_apply_script:
        "npm run dev:foundation:local-env-apply",
      foundation_startup_checklist_script:
        "npm run dev:foundation:startup-checklist",
      foundation_env_setup_plan_script:
        "npm run dev:foundation:env-setup-plan",
      foundation_connector_handoff_script:
        "npm run dev:foundation:connector-handoff",
      foundation_runtime_status_script:
        "npm run dev:foundation:runtime-status",
      foundation_bridge_status_roundtrip_script:
        "npm run dev:bridge:status-roundtrip",
      foundation_bridge_engine_roundtrip_script:
        "npm run dev:bridge:engine-roundtrip",
      youtube_local_env_profile_script:
        "npm run dev:youtube:local-env-profile",
      youtube_local_env_apply_script:
        "npm run dev:youtube:local-env-apply",
      youtube_env_setup_plan_script: "npm run dev:youtube:env-setup-plan",
      youtube_relay_startup_checklist_script:
        "npm run dev:youtube:relay-startup-checklist",
      youtube_live_readiness_script: "npm run dev:youtube:live-readiness",
      youtube_source_specific_roundtrip_script:
        "npm run dev:youtube:direct-live-chat-roundtrip",
      youtube_http_ingest_roundtrip_script:
        "npm run dev:youtube:http-ingest-roundtrip",
      youtube_cursor_roundtrip_script: "npm run dev:youtube:cursor-roundtrip",
      youtube_cursor_backup_roundtrip_script:
        "npm run dev:youtube:cursor-backup-roundtrip",
      persistence_local_env_profile_script:
        "npm run dev:persistence:local-env-profile",
      persistence_local_env_apply_script:
        "npm run dev:persistence:local-env-apply",
      persistence_env_setup_plan_script:
        "npm run dev:persistence:env-setup-plan",
      persistence_startup_checklist_script:
        "npm run dev:persistence:startup-checklist",
      persistence_live_readiness_script: "npm run dev:persistence:live-readiness",
      persistence_readiness_rehearsal_script:
        "npm run dev:persistence:readiness-rehearsal",
      persistence_memory_vector_bridge_script:
        "npm run dev:memory-vector:bridge",
      persistence_memory_vector_roundtrip_script:
        "npm run dev:memory-vector:roundtrip",
      gameplay_local_env_profile_script:
        "npm run dev:gameplay:local-env-profile",
      gameplay_local_env_apply_script:
        "npm run dev:gameplay:local-env-apply",
      gameplay_env_setup_plan_script: "npm run dev:gameplay:env-setup-plan",
      gameplay_startup_checklist_script:
        "npm run dev:gameplay:startup-checklist",
      gameplay_live_readiness_script: "npm run dev:gameplay:live-readiness",
      gameplay_readiness_rehearsal_script:
        "npm run dev:gameplay:readiness-rehearsal",
      expected_overall_status: "ready_for_live_operation",
      boundary_policy: {
        script_names_only: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
      },
    },
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      counts_statuses_booleans_and_policy_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_raw_scheduler_results: true,
      no_raw_stream_state: true,
      read_only_live_readiness: true,
      no_polling_side_effects: true,
      no_control_side_effects: true,
      synthetic_fixture_post_only: true,
    },
    adapter_validation_required: true,
  };
  assertProductionLiveReadinessReportSafe(report);
  return report;
}

export function assertProductionLiveReadinessReportSafe(
  report,
  context = "production live readiness report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(report, context);
  for (const field of Object.keys(report)) {
    if (!PRODUCTION_LIVE_READINESS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`);
    }
  }
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_production_live_readiness_report_v1") {
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
  assertSafeOptionalReadinessState(report.next_readiness_state, context);
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  for (const field of [
    "next_live_readiness_script",
    "next_runtime_status_script",
    "next_check_script",
    "next_launch_script",
    "next_readiness_script",
    "next_startup_checklist_script",
  ]) {
    if (report[field] !== null) assertSafeScriptName(report[field], context);
  }
  assertEnvNameListSafe(report.next_configure_env, `${context}: next configure env`);
  if (
    report.next_expected_live_readiness_status !== null &&
    !EXPECTED_LIVE_READINESS_STATUSES.has(
      report.next_expected_live_readiness_status
    )
  ) {
    throw new ContractError(`${context}: invalid next expected readiness status`);
  }
  if (!Array.isArray(report.priority_stages) || report.priority_stages.length !== 4) {
    throw new ContractError(`${context}: four priority stages are required`);
  }
  report.priority_stages.forEach((stage, index) =>
    assertStageSummarySafe(stage, context, index + 1)
  );
  const firstAttentionStage =
    report.priority_stages.find((stage) => stage.ready !== true) ?? null;
  if (!firstAttentionStage) {
    if (
      report.overall_status !== "ready_for_live_operation" ||
      report.next_priority !== null ||
      report.next_stage_id !== null ||
      report.next_live_readiness_script !== null ||
      report.next_runtime_status_script !== null ||
      report.next_check_script !== null ||
      report.next_launch_script !== null ||
      report.next_readiness_script !== null ||
      report.next_startup_checklist_script !== null ||
      report.next_readiness_state !== null ||
      !Array.isArray(report.next_configure_env) ||
      report.next_configure_env.length !== 0 ||
      report.next_operator_startup_summary !== null ||
      report.next_expected_live_readiness_status !== null
    ) {
      throw new ContractError(`${context}: ready report has next stage`);
    }
  } else {
    if (
      report.overall_status !== firstAttentionStage.overall_attention_status ||
      report.next_priority !== firstAttentionStage.priority ||
      report.next_stage_id !== firstAttentionStage.stage_id ||
      report.next_live_readiness_script !==
        firstAttentionStage.live_readiness_script ||
      report.next_runtime_status_script !==
        firstAttentionStage.runtime_status_script ||
      report.next_check_script !== firstAttentionStage.first_attention_check_script ||
      report.next_readiness_state !== firstAttentionStage.readiness_state ||
      report.next_expected_live_readiness_status !==
        firstAttentionStage.expected_live_readiness_status
    ) {
      throw new ContractError(`${context}: next stage must match first attention stage`);
    }
    if (report.next_startup_checklist_script !== null) {
      assertSafeScriptName(report.next_startup_checklist_script, context);
      if (
        ![
          "npm run dev:foundation:startup-checklist",
          "npm run dev:youtube:relay-startup-checklist",
          "npm run dev:persistence:startup-checklist",
          "npm run dev:gameplay:startup-checklist",
        ].includes(report.next_startup_checklist_script)
      ) {
        throw new ContractError(`${context}: invalid next startup checklist script`);
      }
    }
  }
  if (report.next_operator_startup_summary !== null) {
    assertProductionNextTaskOperatorStartupSummarySafe(
      report.next_operator_startup_summary,
      `${context}: next operator startup summary`
    );
  }
  assertFoundationObsPickupStartupSummarySafe(
    report.foundation_obs_pickup_startup_summary,
    `${context}: foundation OBS pickup startup summary`
  );
  if (
    report.ready_stage_count !==
      report.priority_stages.filter((stage) => stage.ready).length ||
    report.attention_stage_count !==
      report.priority_stages.filter((stage) => !stage.ready).length
  ) {
    throw new ContractError(`${context}: invalid stage counts`);
  }
  if (
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      countReadinessStates(report.priority_stages.map((stage) => stage.readiness_state))
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  assertVerificationScriptsSafe(report.verification_scripts, context);
  assertProductionHandoffSummarySafe(
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
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionReadinessBlockerClassifier({
  readinessState = "runtime_waiting",
  status = "runtime_waiting",
  realRuntimeConfirmed = false,
} = {}) {
  const safeReadinessState = READINESS_STATES.has(readinessState)
    ? readinessState
    : "operator_review_required";
  const safeStatus = safeGateDetailLabel(status) ?? "attention";
  const realConfirmed = realRuntimeConfirmed === true;
  const classification = classifyProductionReadinessBlocker({
    readinessState: safeReadinessState,
    status: safeStatus,
    realRuntimeConfirmed: realConfirmed,
  });
  const summary = {
    schema: "iris_production_readiness_blocker_classifier_v1",
    classification,
    readiness_state: safeReadinessState,
    safe_status: safeStatus,
    real_runtime_confirmed: realConfirmed,
    ready_allowed: classification === "ready",
    boundary_policy: {
      fixed_classification_only: true,
      real_runtime_required_for_ready: true,
      no_readiness_sweetening: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertProductionReadinessBlockerClassifierSafe(summary);
  return summary;
}

export function assertProductionReadinessBlockerClassifierSafe(
  summary,
  context = "production readiness blocker classifier"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_READINESS_BLOCKER_CLASSIFIER_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected classifier field`);
    }
  }
  if (
    summary.schema !== "iris_production_readiness_blocker_classifier_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (
    !PRODUCTION_READINESS_BLOCKER_CLASSIFICATIONS.has(summary.classification)
  ) {
    throw new ContractError(`${context}: invalid classification`);
  }
  assertSafeReadinessState(summary.readiness_state, context);
  if (
    typeof summary.safe_status !== "string" ||
    !SAFE_STAGE_STATUS_PATTERN.test(summary.safe_status)
  ) {
    throw new ContractError(`${context}: invalid safe status`);
  }
  if (typeof summary.real_runtime_confirmed !== "boolean") {
    throw new ContractError(`${context}: invalid runtime confirmation flag`);
  }
  if (typeof summary.ready_allowed !== "boolean") {
    throw new ContractError(`${context}: invalid ready allowed flag`);
  }
  if (
    summary.real_runtime_confirmed !== true &&
    (summary.classification === "ready" || summary.ready_allowed === true)
  ) {
    throw new ContractError(`${context}: unconfirmed runtime cannot be ready`);
  }
  if (
    summary.ready_allowed !==
    (summary.classification === "ready" &&
      summary.readiness_state === "ready" &&
      summary.real_runtime_confirmed === true)
  ) {
    throw new ContractError(`${context}: ready flag mismatch`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    PRODUCTION_READINESS_BLOCKER_CLASSIFIER_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionReadinessComponentDependencyMap({
  localBridgeStatus = "runtime_waiting",
  ttsStatus = "runtime_waiting",
  live2dStatus = "runtime_waiting",
  subtitleStatus = "runtime_waiting",
  obsStatus = "real_device_waiting",
  overlayPickupStatus = "real_device_waiting",
} = {}) {
  const components = [
    componentDependency("local_bridge", localBridgeStatus),
    componentDependency("tts", ttsStatus),
    componentDependency("live2d", live2dStatus),
    componentDependency("subtitle", subtitleStatus),
    componentDependency("obs", obsStatus),
    componentDependency("overlay_pickup", overlayPickupStatus),
  ];
  const summary = {
    schema: "iris_production_readiness_component_dependency_map_v1",
    component_count: components.length,
    ready_component_count: components.filter(
      (component) => component.readiness_state === "ready"
    ).length,
    attention_component_count: components.filter(
      (component) => component.readiness_state !== "ready"
    ).length,
    components,
    boundary_policy: {
      safe_component_status_summary_only: true,
      component_ids_are_fixed: true,
      status_counts_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_paths: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertProductionReadinessComponentDependencyMapSafe(summary);
  return summary;
}

export function assertProductionReadinessComponentDependencyMapSafe(
  summary,
  context = "production readiness component dependency map"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_READINESS_COMPONENT_DEPENDENCY_MAP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected dependency map field`);
    }
  }
  if (
    summary.schema !== "iris_production_readiness_component_dependency_map_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!Array.isArray(summary.components) || summary.components.length !== 6) {
    throw new ContractError(`${context}: six component dependencies required`);
  }
  const seen = new Set();
  for (const component of summary.components) {
    assertProductionReadinessComponentDependencySafe(component, context);
    if (seen.has(component.component_id)) {
      throw new ContractError(`${context}: duplicate component dependency`);
    }
    seen.add(component.component_id);
  }
  for (const componentId of PRODUCTION_READINESS_COMPONENT_IDS) {
    if (!seen.has(componentId)) {
      throw new ContractError(`${context}: missing component dependency`);
    }
  }
  if (
    summary.component_count !== summary.components.length ||
    summary.ready_component_count !==
      summary.components.filter((item) => item.readiness_state === "ready").length ||
    summary.attention_component_count !==
      summary.components.filter((item) => item.readiness_state !== "ready").length
  ) {
    throw new ContractError(`${context}: invalid component counts`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    PRODUCTION_READINESS_COMPONENT_DEPENDENCY_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionReadinessSafeNextAction({
  nextScript = null,
  operatorActionLabel = "operator_attention_required",
} = {}) {
  const safeScript = isSafeScriptName(nextScript) ? nextScript : null;
  const safeOperatorLabel =
    safeGateDetailLabel(operatorActionLabel) ?? "operator_attention_required";
  const summary = {
    schema: "iris_production_readiness_safe_next_action_v1",
    action_kind: safeScript ? "safe_script" : "operator_action_label",
    next_safe_script: safeScript,
    operator_action_label: safeScript ? null : safeOperatorLabel,
    boundary_policy: {
      safe_script_or_operator_label_only: true,
      no_endpoint_values: true,
      no_paths: true,
      no_tokens: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertProductionReadinessSafeNextActionSafe(summary);
  return summary;
}

export function assertProductionReadinessSafeNextActionSafe(
  summary,
  context = "production readiness safe next action"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_READINESS_SAFE_NEXT_ACTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected next action field`);
    }
  }
  if (summary.schema !== "iris_production_readiness_safe_next_action_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["safe_script", "operator_action_label"].includes(summary.action_kind)) {
    throw new ContractError(`${context}: invalid action kind`);
  }
  if (summary.action_kind === "safe_script") {
    if (!isSafeScriptName(summary.next_safe_script)) {
      throw new ContractError(`${context}: invalid next safe script`);
    }
    if (summary.operator_action_label !== null) {
      throw new ContractError(`${context}: script action must not carry label`);
    }
  } else {
    if (summary.next_safe_script !== null) {
      throw new ContractError(`${context}: label action must not carry script`);
    }
    if (
      typeof summary.operator_action_label !== "string" ||
      !SAFE_STAGE_STATUS_PATTERN.test(summary.operator_action_label)
    ) {
      throw new ContractError(`${context}: invalid operator action label`);
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    PRODUCTION_READINESS_SAFE_NEXT_ACTION_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionReadinessFixtureModeLabel({
  fixturePassed = false,
  realRuntimeConfirmed = false,
} = {}) {
  const fixturePass = fixturePassed === true;
  const realReady = realRuntimeConfirmed === true;
  const summary = {
    schema: "iris_production_readiness_fixture_mode_label_v1",
    fixture_status: fixturePass ? "fixture_pass" : "fixture_attention",
    real_readiness_status: realReady ? "real_ready" : "real_blocked",
    fixture_success_is_real_ready: false,
    boundary_policy: {
      fixture_and_real_readiness_separated: true,
      fixture_success_not_real_ready: true,
      no_readiness_sweetening: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertProductionReadinessFixtureModeLabelSafe(summary);
  return summary;
}

export function assertProductionReadinessFixtureModeLabelSafe(
  summary,
  context = "production readiness fixture mode label"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_READINESS_FIXTURE_MODE_LABEL_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture mode field`);
    }
  }
  if (summary.schema !== "iris_production_readiness_fixture_mode_label_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["fixture_pass", "fixture_attention"].includes(summary.fixture_status)) {
    throw new ContractError(`${context}: invalid fixture status`);
  }
  if (!["real_ready", "real_blocked"].includes(summary.real_readiness_status)) {
    throw new ContractError(`${context}: invalid real readiness status`);
  }
  if (summary.fixture_success_is_real_ready !== false) {
    throw new ContractError(`${context}: fixture success cannot imply real readiness`);
  }
  if (
    summary.fixture_status === "fixture_pass" &&
    summary.real_readiness_status === "real_ready" &&
    summary.fixture_success_is_real_ready !== false
  ) {
    throw new ContractError(`${context}: fixture pass and real ready must stay separated`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    PRODUCTION_READINESS_FIXTURE_MODE_LABEL_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionReadinessPublicSafeSummary({
  readinessStatus = "blocked",
  readyCount = 0,
  attentionCount = 0,
  blockedCount = 0,
} = {}) {
  const summary = {
    schema: "iris_production_readiness_public_safe_summary_v1",
    readiness_status: safePublicReadinessStatus(readinessStatus),
    ready_count: safePublicCount(readyCount),
    attention_count: safePublicCount(attentionCount),
    blocked_count: safePublicCount(blockedCount),
    boundary_policy: {
      status_and_counts_only: true,
      no_raw_logs: true,
      redacted_raw_payload_values: true,
      redacted_network_values: true,
      redacted_auth_values: true,
      redacted_review_items: true,
      no_control_directives: true,
    },
  };
  assertProductionReadinessPublicSafeSummarySafe(summary);
  return summary;
}

export function assertProductionReadinessPublicSafeSummarySafe(
  summary,
  context = "production readiness public safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_READINESS_PUBLIC_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected public summary field`);
    }
  }
  if (summary.schema !== "iris_production_readiness_public_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["blocked", "attention", "degraded", "ready"].includes(summary.readiness_status)) {
    throw new ContractError(`${context}: invalid readiness status`);
  }
  for (const field of ["ready_count", "attention_count", "blocked_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    PRODUCTION_READINESS_PUBLIC_SAFE_SUMMARY_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

function assertProductionHandoffSummarySafe(summary, report, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_production_live_readiness_handoff_summary_v1") {
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
    "live_readiness_aggregate_only",
    "no_real_processes_started_by_report",
    "no_polling_side_effects",
    "no_control_side_effects",
    "no_live_payloads_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  for (const field of [
    "stage_count",
    "ready_stage_count",
    "attention_stage_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid production handoff count`);
    }
  }
  if (summary.stage_count !== 4) {
    throw new ContractError(`${context}: invalid production handoff stage count`);
  }
  if (summary.ready_stage_count + summary.attention_stage_count !== 4) {
    throw new ContractError(`${context}: invalid production handoff stage totals`);
  }
  if (
    summary.stage_count !== report.priority_stages.length ||
    summary.ready_stage_count !== report.ready_stage_count ||
    summary.attention_stage_count !== report.attention_stage_count
  ) {
    throw new ContractError(`${context}: production handoff count mismatch`);
  }
  if (summary.next_stage_id !== null && !STAGE_IDS.has(summary.next_stage_id)) {
    throw new ContractError(`${context}: invalid production handoff next stage`);
  }
  for (const field of ["next_live_readiness_script", "next_check_script"]) {
    if (summary[field] !== null) {
      assertSafeScriptName(summary[field], `${context}: ${field}`);
    }
  }
  assertSafeOptionalReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  if (
    summary.next_stage_id !== report.next_stage_id ||
    summary.next_live_readiness_script !== report.next_live_readiness_script ||
    summary.next_check_script !== report.next_check_script ||
    summary.next_readiness_state !== report.next_readiness_state ||
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: production handoff readiness mismatch`);
  }
  if (typeof summary.foundation_first_until_live_ready !== "boolean") {
    throw new ContractError(`${context}: invalid foundation first flag`);
  }
  for (const field of [
    "production_runtime_handoff_status_script",
    "production_loop_verification_script",
  ]) {
    assertSafeScriptName(summary[field], `${context}: ${field}`);
  }
  if (
    summary.production_runtime_handoff_status_script !==
      report.verification_scripts.production_runtime_handoff_status_script ||
    summary.production_loop_verification_script !==
      report.verification_scripts.production_loop_verification_script
  ) {
    throw new ContractError(`${context}: production handoff verification script mismatch`);
  }
  assertFoundationObsPickupStartupSummarySafe(
    summary.foundation_obs_pickup_startup_summary,
    `${context}: production handoff foundation OBS pickup startup summary`
  );
  if (
    JSON.stringify(summary.foundation_obs_pickup_startup_summary) !==
    JSON.stringify(report.foundation_obs_pickup_startup_summary)
  ) {
    throw new ContractError(
      `${context}: production handoff foundation OBS pickup summary mismatch`
    );
  }
}

function createStageSummary({
  priority,
  stageId,
  report,
  readyStatus,
  overallAttentionStatus,
  statusScript,
  liveReadinessScript,
  startupChecklistScript,
  expectedRuntimeStatus,
  operatorStartupSummary = null,
  obsPickupStartupSummary = null,
  gates,
}) {
  const gateSummaries = gates.map(([gateId, gate, checkScript]) =>
    summarizeGate(gateId, gate, checkScript)
  );
  const firstAttentionGate =
    gateSummaries.find((gate) => gate.ready !== true) ?? null;
  const readinessStateCounts = countReadinessStates(
    gateSummaries.map((gate) => gate.readiness_state)
  );
  return {
    schema: "iris_production_live_readiness_stage_summary_v1",
    priority,
    stage_id: stageId,
    ready:
      report.live_readiness_status === readyStatus &&
      firstAttentionGate === null,
    stage_live_readiness_status: report.live_readiness_status,
    expected_live_readiness_status: readyStatus,
    overall_attention_status: overallAttentionStatus,
    first_attention_gate_id: firstAttentionGate?.gate_id ?? null,
    first_attention_gate_status: firstAttentionGate?.gate_status ?? null,
    first_attention_blocking_stage:
      firstAttentionGate?.blocking_stage ?? null,
    first_attention_check_script: firstAttentionGate?.next_check_script ?? null,
    readiness_state: firstAttentionGate?.readiness_state ?? "ready",
    readiness_state_counts: readinessStateCounts,
    gate_count: gateSummaries.length,
    ready_gate_count: gateSummaries.filter((gate) => gate.ready === true).length,
    attention_gate_count: gateSummaries.filter((gate) => gate.ready !== true).length,
    runtime_status_script: statusScript,
    live_readiness_script: liveReadinessScript,
    startup_checklist_script: startupChecklistScript,
    expected_runtime_status: expectedRuntimeStatus,
    operator_startup_summary: operatorStartupSummary,
    obs_pickup_startup_summary: obsPickupStartupSummary,
    gate_summaries: gateSummaries,
    boundary_policy: {
      script_names_only: true,
      counts_statuses_booleans_and_policy_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      read_only_stage_summary: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeGate(gateId, gate, checkScript) {
  const readinessState = summarizeGateReadinessState(gate);
  return {
    schema: "iris_production_live_readiness_gate_summary_v1",
    gate_id: gateId,
    ready: readinessState === "ready",
    gate_status:
      readinessState === "ready" ? "ready" : gate.gate_status ?? gate.runtime_status ?? "attention",
    blocking_stage:
      gate.blocking_stage ??
      gate.runtime_flow_blocking_stage ??
      gate.obs_artifact_blocking_stage ??
      gate.real_engine_worker_blocking_stage ??
      gate.artifact_blocking_stage ??
      gate.live_chat_ingest_blocking_stage ??
      gate.candidate_gate_blocking_stage ??
      "none",
    check_script: checkScript,
    next_check_script:
      readinessState === "ready" ? null : gate.next_check_script ?? gate.check_script ?? checkScript,
    readiness_state: readinessState,
    diagnostic_detail: summarizeGateDiagnosticDetail(gate),
    boundary_policy: {
      fixed_statuses_and_booleans_only: true,
      script_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeGateDiagnosticDetail(gate) {
  const detail = {
    schema: "iris_production_live_readiness_gate_diagnostic_detail_v1",
  };
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) return detail;
  for (const field of SAFE_GATE_BOOLEAN_DETAIL_FIELDS) {
    if (typeof gate[field] === "boolean") detail[field] = gate[field];
  }
  for (const field of SAFE_GATE_COUNT_DETAIL_FIELDS) {
    const count = safeNonNegativeInteger(gate[field]);
    if (count !== null) detail[field] = count;
  }
  for (const field of SAFE_GATE_LABEL_DETAIL_FIELDS) {
    const label = safeGateDetailLabel(gate[field]);
    if (label !== null) detail[field] = label;
  }
  return detail;
}

function assertStageSummarySafe(stage, context, expectedPriority) {
  if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
    throw new ContractError(`${context}: invalid stage summary`);
  }
  if (stage.schema !== "iris_production_live_readiness_stage_summary_v1") {
    throw new ContractError(`${context}: invalid stage schema`);
  }
  for (const field of Object.keys(stage)) {
    if (!PRODUCTION_LIVE_READINESS_STAGE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected stage field`);
    }
  }
  if (stage.priority !== expectedPriority) {
    throw new ContractError(`${context}: invalid priority order`);
  }
  if (!STAGE_IDS.has(stage.stage_id)) {
    throw new ContractError(`${context}: invalid stage id`);
  }
  if (STAGE_ID_BY_PRIORITY.get(expectedPriority) !== stage.stage_id) {
    throw new ContractError(`${context}: stage priority mismatch`);
  }
  if (typeof stage.ready !== "boolean") {
    throw new ContractError(`${context}: invalid stage ready flag`);
  }
  for (const field of [
    "stage_live_readiness_status",
    "expected_live_readiness_status",
    "overall_attention_status",
  ]) {
    if (
      typeof stage[field] !== "string" ||
      !SAFE_STAGE_STATUS_PATTERN.test(stage[field])
    ) {
      throw new ContractError(`${context}: invalid stage ${field}`);
    }
  }
  if (!EXPECTED_LIVE_READINESS_STATUSES.has(stage.expected_live_readiness_status)) {
    throw new ContractError(`${context}: invalid expected stage readiness status`);
  }
  if (!OVERALL_STATUSES.has(stage.overall_attention_status)) {
    throw new ContractError(`${context}: invalid stage attention status`);
  }
  if (stage.ready !== (stage.stage_live_readiness_status === stage.expected_live_readiness_status)) {
    throw new ContractError(`${context}: invalid stage ready status`);
  }
  assertSafeReadinessState(stage.readiness_state, context);
  assertReadinessStateCountsSafe(stage.readiness_state_counts, context);
  if (stage.ready) {
    if (
      stage.first_attention_gate_id !== null ||
      stage.first_attention_gate_status !== null ||
      stage.first_attention_blocking_stage !== null ||
      stage.first_attention_check_script !== null ||
      stage.readiness_state !== "ready"
    ) {
      throw new ContractError(`${context}: ready stage has attention gate`);
    }
  } else {
    for (const field of [
      "first_attention_gate_id",
      "first_attention_gate_status",
      "first_attention_blocking_stage",
    ]) {
      if (
        typeof stage[field] !== "string" ||
        !SAFE_STAGE_STATUS_PATTERN.test(stage[field])
      ) {
        throw new ContractError(`${context}: invalid ${field}`);
      }
    }
    assertSafeScriptName(stage.first_attention_check_script, context);
  }
  for (const field of ["gate_count", "ready_gate_count", "attention_gate_count"]) {
    if (!Number.isInteger(stage[field]) || stage[field] < 0) {
      throw new ContractError(`${context}: invalid stage count`);
    }
  }
  if (!Array.isArray(stage.gate_summaries) || stage.gate_summaries.length !== stage.gate_count) {
    throw new ContractError(`${context}: invalid gate summaries`);
  }
  stage.gate_summaries.forEach((gate) => assertGateSummarySafe(gate, context));
  if (stage.stage_id === "vision_and_safe_game_control") {
    assertGameplayStageGateScriptsSafe(stage.gate_summaries, context);
  }
  if (stage.stage_id === "tts_live2d_obs_foundation") {
    assertProductionNextTaskOperatorStartupSummarySafe(
      stage.operator_startup_summary,
      `${context}: stage operator startup summary`
    );
    assertFoundationObsPickupStartupSummarySafe(
      stage.obs_pickup_startup_summary,
      `${context}: stage OBS pickup startup summary`
    );
  } else if (stage.operator_startup_summary !== null) {
    throw new ContractError(`${context}: unexpected stage operator startup summary`);
  } else if (stage.obs_pickup_startup_summary !== null) {
    throw new ContractError(`${context}: unexpected stage OBS pickup startup summary`);
  }
  if (
    stage.ready_gate_count !==
      stage.gate_summaries.filter((gate) => gate.ready === true).length ||
    stage.attention_gate_count !==
      stage.gate_summaries.filter((gate) => gate.ready !== true).length
  ) {
    throw new ContractError(`${context}: invalid gate counts`);
  }
  if (
    !sameReadinessStateCounts(
      stage.readiness_state_counts,
      countReadinessStates(stage.gate_summaries.map((gate) => gate.readiness_state))
    )
  ) {
    throw new ContractError(`${context}: invalid stage readiness counts`);
  }
  const firstAttentionGate =
    stage.gate_summaries.find((gate) => gate.ready !== true) ?? null;
  if (
    stage.readiness_state !== (firstAttentionGate?.readiness_state ?? "ready")
  ) {
    throw new ContractError(`${context}: stage readiness mismatch`);
  }
  assertSafeScriptName(stage.runtime_status_script, context);
  assertSafeScriptName(stage.live_readiness_script, context);
  if (stage.stage_id === "tts_live2d_obs_foundation") {
    if (
      stage.startup_checklist_script !==
      "npm run dev:foundation:startup-checklist"
    ) {
      throw new ContractError(`${context}: invalid startup checklist script`);
    }
  } else if (stage.stage_id === "youtube_comments_and_support") {
    if (
      stage.startup_checklist_script !== null &&
      stage.startup_checklist_script !==
      "npm run dev:youtube:relay-startup-checklist"
    ) {
      throw new ContractError(`${context}: invalid startup checklist script`);
    }
  } else if (stage.stage_id === "memory_and_relationship_persistence") {
    if (
      stage.startup_checklist_script !== null &&
      stage.startup_checklist_script !==
      "npm run dev:persistence:startup-checklist"
    ) {
      throw new ContractError(`${context}: invalid startup checklist script`);
    }
  } else if (stage.stage_id === "vision_and_safe_game_control") {
    if (
      stage.startup_checklist_script !== null &&
      stage.startup_checklist_script !==
      "npm run dev:gameplay:startup-checklist"
    ) {
      throw new ContractError(`${context}: invalid startup checklist script`);
    }
  } else if (stage.startup_checklist_script !== null) {
    throw new ContractError(`${context}: unexpected startup checklist script`);
  }
  if (
    typeof stage.expected_runtime_status !== "string" ||
    !SAFE_STAGE_STATUS_PATTERN.test(stage.expected_runtime_status)
  ) {
    throw new ContractError(`${context}: invalid expected runtime status`);
  }
  assertBoundaryPolicy(
    stage.boundary_policy,
    STAGE_BOUNDARY_FIELDS,
    `${context}: stage boundary policy`
  );
  if (stage.adapter_validation_required !== true) {
    throw new ContractError(`${context}: stage adapter validation required`);
  }
}

function assertGameplayStageGateScriptsSafe(gates, context) {
  if (gates.length !== Object.keys(GAMEPLAY_STAGE_GATE_SCRIPTS).length) {
    throw new ContractError(`${context}: invalid gameplay gate count`);
  }
  for (const gate of gates) {
    const expectedScript = GAMEPLAY_STAGE_GATE_SCRIPTS[gate.gate_id];
    if (!expectedScript || gate.check_script !== expectedScript) {
      throw new ContractError(`${context}: invalid gameplay gate script`);
    }
  }
}

function assertGateSummarySafe(gate, context) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: invalid gate summary`);
  }
  if (gate.schema !== "iris_production_live_readiness_gate_summary_v1") {
    throw new ContractError(`${context}: invalid gate summary schema`);
  }
  for (const field of Object.keys(gate)) {
    if (!PRODUCTION_LIVE_READINESS_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`);
    }
  }
  if (
    typeof gate.gate_id !== "string" ||
    !SAFE_STAGE_STATUS_PATTERN.test(gate.gate_id)
  ) {
    throw new ContractError(`${context}: invalid gate id`);
  }
  if (typeof gate.ready !== "boolean") {
    throw new ContractError(`${context}: invalid gate ready flag`);
  }
  assertSafeReadinessState(gate.readiness_state, context);
  for (const field of ["gate_status", "blocking_stage"]) {
    if (
      typeof gate[field] !== "string" ||
      !SAFE_STAGE_STATUS_PATTERN.test(gate[field])
    ) {
      throw new ContractError(`${context}: invalid gate ${field}`);
    }
  }
  assertSafeScriptName(gate.check_script, context);
  if (gate.readiness_state === "ready") {
    if (gate.ready !== true) {
      throw new ContractError(`${context}: ready gate readiness mismatch`);
    }
    if (gate.next_check_script !== null) {
      throw new ContractError(`${context}: ready gate has next check script`);
    }
  } else {
    if (gate.ready === true) {
      throw new ContractError(`${context}: ready gate cannot be waiting`);
    }
    assertSafeScriptName(gate.next_check_script, context);
  }
  assertGateDiagnosticDetailSafe(gate.diagnostic_detail, context);
  assertBoundaryPolicy(
    gate.boundary_policy,
    GATE_BOUNDARY_FIELDS,
    `${context}: gate boundary policy`
  );
  if (gate.adapter_validation_required !== true) {
    throw new ContractError(`${context}: gate adapter validation required`);
  }
}

function summarizeGateReadinessState(gate) {
  if (READINESS_STATES.has(gate?.readiness_state)) return gate.readiness_state;
  const status = gate?.gate_status ?? gate?.runtime_status ?? "";
  const blockingStage =
    gate?.blocking_stage ??
    gate?.runtime_flow_blocking_stage ??
    gate?.obs_artifact_blocking_stage ??
    gate?.real_engine_worker_blocking_stage ??
    gate?.artifact_blocking_stage ??
    gate?.live_chat_ingest_blocking_stage ??
    gate?.candidate_gate_blocking_stage ??
    "";
  if (
    String(status).includes("configuration") ||
    String(status).includes("not_configured") ||
    String(blockingStage).includes("configuration")
  ) {
    return "configuration_waiting";
  }
  if (
    String(status).includes("runtime") ||
    String(status).includes("worker") ||
    String(status).includes("polling") ||
    String(blockingStage).includes("runtime") ||
    String(blockingStage).includes("worker")
  ) {
    return "runtime_waiting";
  }
  if (
    String(status).includes("real_engine") ||
    String(status).includes("obs") ||
    String(status).includes("capture") ||
    String(blockingStage).includes("real_engine") ||
    String(blockingStage).includes("obs") ||
    String(blockingStage).includes("capture")
  ) {
    return "real_device_waiting";
  }
  return "operator_review_required";
}

function classifyProductionReadinessBlocker({
  readinessState,
  status,
  realRuntimeConfirmed,
}) {
  if (status.includes("attention")) return "attention";
  if (readinessState === "ready" && realRuntimeConfirmed === true) {
    return status.includes("degraded") ? "degraded" : "ready";
  }
  if (
    readinessState === "runtime_waiting" ||
    readinessState === "real_device_waiting" ||
    realRuntimeConfirmed !== true
  ) {
    return "BLOCKED";
  }
  if (status.includes("degraded")) return "degraded";
  return "attention";
}

function componentDependency(componentId, status) {
  const dependencyStatus = safeGateDetailLabel(status) ?? "attention";
  return {
    schema: "iris_production_readiness_component_dependency_v1",
    component_id: componentId,
    dependency_status: dependencyStatus,
    readiness_state: readinessStateForComponentDependency(dependencyStatus),
    required_for_live: true,
  };
}

function readinessStateForComponentDependency(status) {
  if (status === "ready" || status === "configured") return "ready";
  if (
    status.includes("configuration") ||
    status.includes("missing") ||
    status.includes("not_configured")
  ) {
    return "configuration_waiting";
  }
  if (
    status.includes("worker") ||
    status.includes("runtime") ||
    status.includes("stale")
  ) {
    return "runtime_waiting";
  }
  if (
    status.includes("obs") ||
    status.includes("pickup") ||
    status.includes("engine") ||
    status.includes("device")
  ) {
    return "real_device_waiting";
  }
  return "operator_review_required";
}

function assertProductionReadinessComponentDependencySafe(component, context) {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    throw new ContractError(`${context}: component dependency is required`);
  }
  for (const field of Object.keys(component)) {
    if (!PRODUCTION_READINESS_COMPONENT_DEPENDENCY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected component dependency field`);
    }
  }
  if (
    component.schema !== "iris_production_readiness_component_dependency_v1"
  ) {
    throw new ContractError(`${context}: invalid component dependency schema`);
  }
  if (!PRODUCTION_READINESS_COMPONENT_IDS.has(component.component_id)) {
    throw new ContractError(`${context}: invalid component id`);
  }
  if (
    typeof component.dependency_status !== "string" ||
    !SAFE_STAGE_STATUS_PATTERN.test(component.dependency_status)
  ) {
    throw new ContractError(`${context}: invalid component dependency status`);
  }
  assertSafeReadinessState(component.readiness_state, context);
  if (
    component.readiness_state !==
    readinessStateForComponentDependency(component.dependency_status)
  ) {
    throw new ContractError(`${context}: component readiness mismatch`);
  }
  if (component.required_for_live !== true) {
    throw new ContractError(`${context}: component must be required for live`);
  }
}

function safePublicReadinessStatus(status) {
  const safeStatus = safeGateDetailLabel(status);
  if (safeStatus === "ready") return "ready";
  if (safeStatus === "attention") return "attention";
  if (safeStatus === "degraded") return "degraded";
  if (safeStatus === "blocked" || safeStatus === "runtime_waiting") {
    return "blocked";
  }
  return "attention";
}

function safePublicCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
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

function assertSafeOptionalReadinessState(state, context) {
  if (state === null) return;
  assertSafeReadinessState(state, context);
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: readiness counts required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness count`);
    }
  }
  for (const state of Object.keys(counts)) {
    if (!READINESS_STATES.has(state)) {
      throw new ContractError(`${context}: unknown readiness count`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  for (const state of READINESS_STATES) {
    if (left?.[state] !== right?.[state]) return false;
  }
  return true;
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

function assertGateDiagnosticDetailSafe(detail, context) {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
    throw new ContractError(`${context}: invalid gate diagnostic detail`);
  }
  if (
    detail.schema !==
    "iris_production_live_readiness_gate_diagnostic_detail_v1"
  ) {
    throw new ContractError(`${context}: invalid gate diagnostic detail schema`);
  }
  for (const [field, value] of Object.entries(detail)) {
    if (field === "schema") continue;
    if (SAFE_GATE_BOOLEAN_DETAIL_FIELDS.has(field)) {
      if (typeof value !== "boolean") {
        throw new ContractError(`${context}: invalid boolean gate detail`);
      }
      continue;
    }
    if (SAFE_GATE_COUNT_DETAIL_FIELDS.has(field)) {
      if (!Number.isInteger(value) || value < 0) {
        throw new ContractError(`${context}: invalid count gate detail`);
      }
      continue;
    }
    if (SAFE_GATE_LABEL_DETAIL_FIELDS.has(field)) {
      if (typeof value !== "string" || !SAFE_STAGE_STATUS_PATTERN.test(value)) {
        throw new ContractError(`${context}: invalid label gate detail`);
      }
      continue;
    }
    throw new ContractError(`${context}: unsupported gate diagnostic detail`);
  }
}

function sanitizeFoundationObsPickupStartupSummary(source) {
  const blockingStepCount = requiredObsPickupStartupCount(
    source,
    "obs_pickup_blocking_step_count"
  );
  const readyBlockingStepCount = requiredObsPickupStartupCount(
    source,
    "ready_obs_pickup_blocking_step_count"
  );
  const attentionBlockingStepCount = requiredObsPickupStartupCount(
    source,
    "attention_obs_pickup_blocking_step_count"
  );
  const nextReadinessState =
    attentionBlockingStepCount > 0 ? "operator_review_required" : "ready";
  const nextBlockingStepId =
    attentionBlockingStepCount > 0 &&
    FOUNDATION_STARTUP_PROCESS_IDS.has(source?.next_obs_pickup_blocking_step_id)
      ? source.next_obs_pickup_blocking_step_id
      : null;
  const nextBlockingStepOrder =
    attentionBlockingStepCount > 0
      ? safeNonNegativeInteger(source?.next_obs_pickup_blocking_step_order)
      : null;
  const nextBlockingLaunchScript =
    attentionBlockingStepCount > 0 &&
    isSafeScriptName(source?.next_obs_pickup_blocking_launch_script)
      ? source.next_obs_pickup_blocking_launch_script
      : null;
  const nextBlockingReadinessScript =
    attentionBlockingStepCount > 0 &&
    isSafeScriptName(source?.next_obs_pickup_blocking_readiness_script)
      ? source.next_obs_pickup_blocking_readiness_script
      : null;
  return {
    schema: "iris_production_live_readiness_obs_pickup_startup_summary_v1",
    obs_pickup_guidance_only: true,
    real_obs_operation_not_started: true,
    startup_scripts_are_names_only: true,
    env_names_only: true,
    local_bridge_required_before_obs_pickup:
      source?.local_bridge_required_before_obs_pickup === true,
    worker_required_before_obs_pickup:
      source?.worker_required_before_obs_pickup === true,
    obs_setup_required_before_obs_pickup:
      source?.obs_setup_required_before_obs_pickup === true,
    obs_pickup_blocking_step_count: blockingStepCount,
    ready_obs_pickup_blocking_step_count: readyBlockingStepCount,
    attention_obs_pickup_blocking_step_count: attentionBlockingStepCount,
    next_obs_pickup_readiness_state:
      attentionBlockingStepCount > 0 ? nextReadinessState : "ready",
    next_obs_pickup_blocking_step_id: nextBlockingStepId,
    next_obs_pickup_blocking_step_order: nextBlockingStepOrder,
    next_obs_pickup_blocking_launch_script: nextBlockingLaunchScript,
    next_obs_pickup_blocking_readiness_script: nextBlockingReadinessScript,
    obs_pickup_startup_state:
      attentionBlockingStepCount === 0
        ? "obs_pickup_startup_ready"
        : "obs_pickup_startup_waiting",
    boundary_policy: {
      booleans_counts_and_script_names_only: true,
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_artifact_paths: true,
    },
    adapter_validation_required: true,
  };
}

function requiredObsPickupStartupCount(source, field) {
  if (!source) return 0;
  const count = safeNonNegativeInteger(source[field]);
  if (count === null) {
    throw new ContractError(
      `production live readiness OBS pickup startup summary: ${field} is required`
    );
  }
  return count;
}

function assertFoundationObsPickupStartupSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: OBS pickup startup summary required`);
  }
  if (
    summary.schema !==
    "iris_production_live_readiness_obs_pickup_startup_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid OBS pickup startup schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!FOUNDATION_OBS_PICKUP_STARTUP_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: unexpected OBS pickup startup field`
      );
    }
  }
  for (const field of [
    "obs_pickup_guidance_only",
    "real_obs_operation_not_started",
    "startup_scripts_are_names_only",
    "env_names_only",
    "local_bridge_required_before_obs_pickup",
    "worker_required_before_obs_pickup",
    "obs_setup_required_before_obs_pickup",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid OBS pickup startup flag`);
    }
  }
  if (
    summary.obs_pickup_guidance_only !== true ||
    summary.real_obs_operation_not_started !== true ||
    summary.startup_scripts_are_names_only !== true ||
    summary.env_names_only !== true
  ) {
    throw new ContractError(`${context}: OBS pickup startup safety flags required`);
  }
  for (const field of [
    "obs_pickup_blocking_step_count",
    "ready_obs_pickup_blocking_step_count",
    "attention_obs_pickup_blocking_step_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid OBS pickup startup count`);
    }
  }
  if (
    summary.ready_obs_pickup_blocking_step_count +
      summary.attention_obs_pickup_blocking_step_count !==
    summary.obs_pickup_blocking_step_count
  ) {
    throw new ContractError(`${context}: invalid OBS pickup startup totals`);
  }
  assertSafeReadinessState(summary.next_obs_pickup_readiness_state, context);
  if (!OBS_PICKUP_STARTUP_STATES.has(summary.obs_pickup_startup_state)) {
    throw new ContractError(`${context}: invalid OBS pickup startup state`);
  }
  if (
    summary.next_obs_pickup_blocking_step_id !== null &&
    !FOUNDATION_STARTUP_PROCESS_IDS.has(summary.next_obs_pickup_blocking_step_id)
  ) {
    throw new ContractError(`${context}: invalid OBS pickup startup step`);
  }
  if (
    summary.next_obs_pickup_blocking_step_order !== null &&
    (!Number.isInteger(summary.next_obs_pickup_blocking_step_order) ||
      summary.next_obs_pickup_blocking_step_order < 0)
  ) {
    throw new ContractError(`${context}: invalid OBS pickup startup order`);
  }
  for (const field of [
    "next_obs_pickup_blocking_launch_script",
    "next_obs_pickup_blocking_readiness_script",
  ]) {
    if (summary[field] !== null) {
      assertSafeScriptName(summary[field], `${context}: ${field}`);
    }
  }
  if (summary.attention_obs_pickup_blocking_step_count === 0) {
    if (
      summary.obs_pickup_startup_state !== "obs_pickup_startup_ready" ||
      summary.next_obs_pickup_readiness_state !== "ready" ||
      summary.next_obs_pickup_blocking_step_id !== null ||
      summary.next_obs_pickup_blocking_step_order !== null ||
      summary.next_obs_pickup_blocking_launch_script !== null ||
      summary.next_obs_pickup_blocking_readiness_script !== null
    ) {
      throw new ContractError(`${context}: ready OBS pickup startup has next item`);
    }
  } else if (
    summary.obs_pickup_startup_state !== "obs_pickup_startup_waiting" ||
    summary.next_obs_pickup_blocking_step_id === null ||
    summary.next_obs_pickup_blocking_step_order === null ||
    summary.next_obs_pickup_blocking_launch_script === null ||
    summary.next_obs_pickup_blocking_readiness_script === null
  ) {
    throw new ContractError(`${context}: waiting OBS pickup startup needs next item`);
  }
  if (
    !summary.boundary_policy ||
    typeof summary.boundary_policy !== "object" ||
    Array.isArray(summary.boundary_policy)
  ) {
    throw new ContractError(`${context}: OBS pickup startup boundary required`);
  }
  const allowedBoundaryFields = new Set(OBS_PICKUP_STARTUP_BOUNDARY_FIELDS);
  for (const field of Object.keys(summary.boundary_policy)) {
    if (!allowedBoundaryFields.has(field)) {
      throw new ContractError(
        `${context}: unexpected OBS pickup startup boundary field`
      );
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    OBS_PICKUP_STARTUP_BOUNDARY_FIELDS,
    `${context}: OBS pickup startup boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: OBS pickup startup validation required`);
  }
}

function safeNonNegativeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.trunc(number);
}

function isSafeScriptName(script) {
  return (
    typeof script === "string" &&
    (/^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      script
    ) ||
      script === "npm test")
  );
}

function safeGateDetailLabel(value) {
  if (typeof value !== "string" || !SAFE_STAGE_STATUS_PATTERN.test(value)) {
    return null;
  }
  return value;
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts required`);
  }
  if (scripts.schema !== "iris_production_live_readiness_scripts_v1") {
    throw new ContractError(`${context}: invalid verification scripts schema`);
  }
  for (const [field, expectedScript] of Object.entries(VERIFICATION_SCRIPT_FIELDS)) {
    assertSafeScriptName(scripts[field], context);
    if (scripts[field] !== expectedScript) {
      throw new ContractError(`${context}: invalid verification script ${field}`);
    }
  }
  if (scripts.expected_overall_status !== "ready_for_live_operation") {
    throw new ContractError(`${context}: invalid expected overall status`);
  }
  assertBoundaryPolicy(
    scripts.boundary_policy,
    VERIFICATION_BOUNDARY_FIELDS,
    `${context}: verification boundary policy`
  );
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

function assertNoForbiddenProductionLiveReadinessFields(
  subject,
  context,
  trace = "root"
) {
  if (!subject || typeof subject !== "object") return;
  if (Array.isArray(subject)) {
    subject.forEach((item, index) =>
      assertNoForbiddenProductionLiveReadinessFields(
        item,
        context,
        `${trace}[${index}]`
      )
    );
    return;
  }
  for (const field of Object.keys(subject)) {
    if (FORBIDDEN_PRODUCTION_LIVE_READINESS_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { trace, field });
    }
    assertNoForbiddenProductionLiveReadinessFields(
      subject[field],
      context,
      `${trace}.${field}`
    );
  }
}
