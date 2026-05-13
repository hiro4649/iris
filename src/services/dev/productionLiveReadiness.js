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
  "raw_error",
  "rawError",
  "raw_job",
  "rawJob",
  "raw_payload",
  "rawPayload",
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
const RUNTIME_PRODUCTION_CONNECTION_MANIFEST_FIELDS = new Set([
  "schema",
  "manifest_status",
  "dependency_count",
  "required_dependencies",
  "required_fields",
  "dependency_statuses",
  "boundary_policy",
  "adapter_validation_required",
]);
const RUNTIME_PRODUCTION_CONNECTION_DEPENDENCY_FIELDS = new Set([
  "schema",
  "component_id",
  "required_field",
  "safe_status",
  "real_residency_required",
]);
const RUNTIME_PRODUCTION_BLOCKER_MATRIX_FIELDS = new Set([
  "schema",
  "matrix_status",
  "component_count",
  "blocked_count",
  "attention_count",
  "degraded_count",
  "ready_count",
  "components",
  "boundary_policy",
  "adapter_validation_required",
]);
const RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENT_FIELDS = new Set([
  "schema",
  "component_id",
  "input_status",
  "real_runtime_confirmed",
  "classification",
  "ready_allowed",
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
const PRODUCTION_PREFLIGHT_ADMIN_PAGE_SUMMARY_FIELDS = new Set([
  "schema",
  "page_status",
  "component_count",
  "ready_component_count",
  "attention_component_count",
  "component_statuses",
  "next_safe_action",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_PREFLIGHT_ADMIN_PAGE_COMPONENT_STATUS_FIELDS = new Set([
  "schema",
  "component_id",
  "status",
  "readiness_state",
]);
const PRODUCTION_READINESS_BLOCKER_ACTION_MAP_FIELDS = new Set([
  "schema",
  "blocker_label",
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
const PRODUCTION_READINESS_ROUTE_CONTRACT_MANIFEST_FIELDS = new Set([
  "schema",
  "contract_status",
  "route_count",
  "routes",
  "boundary_policy",
]);
const PRODUCTION_READINESS_ROUTE_CONTRACT_FIELDS = new Set([
  "schema",
  "route_id",
  "input_fields",
  "output_fields",
  "required_output_fields",
  "safe_summary_required",
]);
const PRODUCTION_READINESS_BLOCKER_REASON_SUMMARY_FIELDS = new Set([
  "schema",
  "reason_count",
  "reason_labels",
  "boundary_policy",
]);
const PRODUCTION_BLOCKER_AGGREGATION_ADMIN_PAGE_FIELDS = new Set([
  "schema",
  "page_status",
  "blocker_group_count",
  "total_blocker_count",
  "blocker_groups",
  "boundary_policy",
]);
const PRODUCTION_BLOCKER_AGGREGATION_ADMIN_PAGE_GROUP_FIELDS = new Set([
  "schema",
  "blocker_group_label",
  "status",
  "blocker_count",
  "next_safe_action",
]);
const PRODUCTION_BLOCKER_DASHBOARD_FIXTURE_FIELDS = new Set([
  "schema",
  "dashboard_status",
  "blocker_count",
  "status_counts",
  "blocker_labels",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_BLOCKER_ADMIN_PUBLIC_CONSISTENCY_FIELDS = new Set([
  "schema",
  "consistency_status",
  "blocker_count",
  "admin_status_counts",
  "public_status_counts",
  "admin_blocker_labels",
  "public_blocker_labels",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_BLOCKER_OWNER_DETAIL_GATE_FIELDS = new Set([
  "schema",
  "gate_status",
  "viewer_role",
  "owner_only_detail_count",
  "detail_visible",
  "ordinary_public_redacted",
  "safe_detail_labels",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_BLOCKER_NEXT_ACTION_NO_COMMAND_FIELDS = new Set([
  "schema",
  "action_status",
  "blocker_label",
  "next_safe_script_name",
  "operator_action_label",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_BLOCKER_FIXTURE_REGRESSION_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "blocker_dashboard",
  "admin_public_consistency",
  "owner_detail_gate",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_READINESS_MISSING_COMPONENT_CLASSIFIER_FIELDS = new Set([
  "schema",
  "missing_component_count",
  "missing_components",
  "boundary_policy",
]);
const PRODUCTION_READINESS_MISSING_COMPONENT_FIELDS = new Set([
  "schema",
  "component_label",
  "status",
]);
const PRODUCTION_READINESS_HEARTBEAT_CLASSIFIER_FIELDS = new Set([
  "schema",
  "heartbeat_status",
  "readiness_state",
  "ready_allowed",
  "age_bucket",
  "boundary_policy",
]);
const RUNTIME_PRODUCTION_FRESH_ARTIFACT_REQUIREMENT_FIELDS = new Set([
  "schema",
  "requirement_status",
  "fresh_heartbeat_status",
  "fresh_pickup_status",
  "fresh_render_status",
  "fresh_engine_health_status",
  "real_ready_allowed",
  "missing_fresh_count",
  "readiness_state",
  "boundary_policy",
  "adapter_validation_required",
]);
const RUNTIME_PRODUCTION_OPERATOR_CHECKLIST_FIELDS = new Set([
  "schema",
  "checklist_status",
  "item_count",
  "items",
  "boundary_policy",
  "adapter_validation_required",
]);
const RUNTIME_PRODUCTION_OPERATOR_CHECKLIST_ITEM_FIELDS = new Set([
  "schema",
  "check_label",
  "safe_script_name",
  "status",
]);
const PRODUCTION_FINAL_PREFLIGHT_CHECKLIST_MANIFEST_FIELDS = new Set([
  "schema",
  "manifest_status",
  "check_count",
  "required_checks",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_FINAL_PREFLIGHT_CHECK_FIELDS = new Set([
  "schema",
  "check_label",
  "category_label",
  "component_label",
  "status",
  "required_before_real_operation",
]);
const PRODUCTION_FINAL_PREFLIGHT_CHECK_GROUPING_FIELDS = new Set([
  "schema",
  "grouping_status",
  "category_count",
  "groups",
  "total_blocker_count",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_FINAL_PREFLIGHT_CHECK_GROUP_FIELDS = new Set([
  "schema",
  "category_label",
  "status",
  "check_count",
  "blocker_count",
]);
const PRODUCTION_FINAL_PREFLIGHT_OWNER_CONFIRMATION_FIELDS = new Set([
  "schema",
  "confirmation_status",
  "real_external_device_step_requested",
  "owner_confirmation_required",
  "owner_confirmed",
  "production_go_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_FINAL_PREFLIGHT_AUDIT_READINESS_FIELDS = new Set([
  "schema",
  "audit_status",
  "audit_trail_ready",
  "production_go_allowed",
  "blocker_label",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_FINAL_PREFLIGHT_EMERGENCY_STOP_READINESS_FIELDS = new Set([
  "schema",
  "emergency_stop_status",
  "emergency_stop_confirmed",
  "production_go_allowed",
  "blocker_label",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_FINAL_PREFLIGHT_SAFE_EXPORT_FIELDS = new Set([
  "schema",
  "safe_export_status",
  "manifest_status",
  "grouping_status",
  "audit_status",
  "emergency_stop_status",
  "owner_confirmation_status",
  "blocker_count",
  "production_go_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_FINAL_PREFLIGHT_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_FINAL_PREFLIGHT_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "expected_status",
  "safe_export",
]);
const PRODUCTION_FINAL_PREFLIGHT_REVIEW_HOOK_FIELDS = new Set([
  "schema",
  "review_status",
  "review_label",
  "safe_export_status",
  "blocker_count",
  "code_change_required",
  "production_go_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const RUNTIME_PRODUCTION_CONNECTOR_TRACE_ENVELOPE_FIELDS = new Set([
  "schema",
  "trace_id",
  "run_id",
  "component",
  "status",
  "boundary_policy",
  "adapter_validation_required",
]);
const RUNTIME_PRODUCTION_CONNECTION_DRY_RUN_FIELDS = new Set([
  "schema",
  "dry_run_status",
  "dry_run_result",
  "real_runtime_confirmed",
  "real_connection_attempted",
  "real_ready_reported",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_READINESS_DRY_RUN_ROUTE_FIELDS = new Set([
  "schema",
  "route_id",
  "route_status",
  "prerequisite_count",
  "prerequisite_statuses",
  "real_runtime_confirmed",
  "real_operation_performed",
  "real_ready_reported",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_READINESS_DRY_RUN_ROUTE_PREREQUISITE_FIELDS = new Set([
  "schema",
  "prerequisite_label",
  "status",
]);
const REAL_READINESS_DRY_RUN_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_READINESS_DRY_RUN_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "expected_route_status",
  "route",
]);
const REAL_READINESS_DRY_RUN_COMPLETION_HOOK_FIELDS = new Set([
  "schema",
  "review_status",
  "review_label",
  "dry_run_route_status",
  "real_readiness_status",
  "dry_run_only",
  "real_ready_reported",
  "boundary_policy",
  "adapter_validation_required",
]);
const RUNTIME_PRODUCTION_ATTENTION_REASON_CATALOG_FIELDS = new Set([
  "schema",
  "catalog_status",
  "reason_count",
  "reasons",
  "boundary_policy",
  "adapter_validation_required",
]);
const RUNTIME_PRODUCTION_ATTENTION_REASON_FIELDS = new Set([
  "schema",
  "reason_label",
  "classification",
  "component_id",
]);
const RUNTIME_PRODUCTION_NO_AUTO_REMEDIATION_GUARD_FIELDS = new Set([
  "schema",
  "guard_status",
  "blocker_detected",
  "blocked_component_count",
  "blocked_components",
  "auto_remediation_allowed",
  "mutation_attempted",
  "safe_operator_action_required",
  "boundary_policy",
  "adapter_validation_required",
]);
const RUNTIME_PRODUCTION_E2E_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "classification",
  "ready_allowed",
  "fixture_mode_status",
  "worker_status",
  "engine_status",
  "obs_status",
  "db_status",
  "fixture_status",
  "blocker_reason_summary",
  "component_matrix",
  "fresh_artifact_requirement",
  "dry_run_result",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_READINESS_BATCH_FIXTURE_FIELDS = new Set([
  "schema",
  "classification",
  "ready_allowed",
  "fixture_status",
  "real_readiness_status",
  "component_summary",
  "blocker_reason_summary",
  "boundary_policy",
]);
const PRODUCTION_E2E_BLOCKER_REVIEW_HOOK_FIELDS = new Set([
  "schema",
  "review_status",
  "completion_review_label",
  "production_blocker_retained",
  "unresolved_blocked_count",
  "blocker_labels",
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
  "db",
  "game",
  "youtube",
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
const PRODUCTION_PREFLIGHT_ADMIN_PAGE_BOUNDARY_FIELDS = new Set([
  "component_status_count_and_next_action_only",
  "no_raw_diagnostics",
  "no_raw_logs",
  "no_secret_values",
  "no_endpoint_values",
  "no_paths",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const PRODUCTION_READINESS_BLOCKER_ACTION_BOUNDARY_FIELDS = new Set([
  "safe_script_or_operator_label_only",
  "blocker_label_only",
  "no_shell_command_body",
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
const PRODUCTION_READINESS_ROUTE_CONTRACT_MANIFEST_BOUNDARY_FIELDS = new Set([
  "manifest_only",
  "safe_route_ids_only",
  "field_names_only",
  "safe_summary_required",
  "real_process_not_required",
  "no_secret_values",
  "no_endpoint_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const RUNTIME_PRODUCTION_CONNECTION_COMPONENTS = Object.freeze([
  Object.freeze(["worker", "worker_status"]),
  Object.freeze(["engine", "engine_status"]),
  Object.freeze(["obs", "obs_status"]),
  Object.freeze(["db", "db_status"]),
  Object.freeze(["adapter", "adapter_status"]),
]);
const RUNTIME_PRODUCTION_CONNECTION_COMPONENT_IDS = new Set(
  RUNTIME_PRODUCTION_CONNECTION_COMPONENTS.map(([component]) => component)
);
const RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENTS = Object.freeze([
  "worker",
  "engine",
  "obs",
  "db",
  "adapter",
  "youtube",
  "game",
]);
const RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENT_IDS = new Set(
  RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENTS
);
const RUNTIME_PRODUCTION_CONNECTION_REQUIRED_FIELDS =
  RUNTIME_PRODUCTION_CONNECTION_COMPONENTS.map(([, field]) => field);
const RUNTIME_PRODUCTION_CONNECTION_BOUNDARY_FIELDS = new Set([
  "manifest_only",
  "safe_component_status_only",
  "real_residency_required",
  "real_process_not_required_for_validation",
  "no_readiness_sweetening",
  "no_secret_values",
  "no_endpoint_values",
  "no_paths",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const RUNTIME_PRODUCTION_BLOCKER_MATRIX_BOUNDARY_FIELDS = new Set([
  "fixed_component_matrix",
  "fixed_classification_only",
  "real_runtime_required_for_ready",
  "unconfirmed_runtime_not_ready",
  "no_readiness_sweetening",
  "safe_status_labels_only",
  "no_raw_error_values",
  "no_secret_values",
  "no_endpoint_values",
  "no_paths",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const PRODUCTION_READINESS_ROUTE_REQUIRED_OUTPUT_FIELDS = [
  "schema",
  "readiness_status",
  "ready_count",
  "attention_count",
  "blocked_count",
  "boundary_policy",
];
const PRODUCTION_READINESS_BLOCKER_REASON_LABELS = new Set([
  "worker_missing",
  "engine_attention",
  "obs_missing",
  "db_missing",
  "adapter_attention",
  "youtube_attention",
  "game_attention",
  "stale_heartbeat",
  "stale_pickup",
  "stale_render",
  "fixture_only",
  "operator_review_required",
]);
const RUNTIME_PRODUCTION_ATTENTION_REASON_CATALOG = Object.freeze([
  Object.freeze(["worker_missing", "BLOCKED", "worker"]),
  Object.freeze(["engine_attention", "attention", "engine"]),
  Object.freeze(["obs_missing", "BLOCKED", "obs"]),
  Object.freeze(["db_missing", "BLOCKED", "db"]),
  Object.freeze(["adapter_attention", "attention", "adapter"]),
  Object.freeze(["youtube_attention", "attention", "youtube"]),
  Object.freeze(["game_attention", "attention", "game"]),
  Object.freeze(["stale_heartbeat", "attention", "worker"]),
  Object.freeze(["stale_pickup", "attention", "obs"]),
  Object.freeze(["stale_render", "attention", "engine"]),
  Object.freeze(["fixture_only", "BLOCKED", "adapter"]),
  Object.freeze(["operator_review_required", "attention", "adapter"]),
]);
const PRODUCTION_READINESS_BLOCKER_REASON_BOUNDARY_FIELDS = new Set([
  "fixed_labels_only",
  "no_raw_error_values",
  "no_path_values",
  "no_endpoint_values",
  "no_token_values",
]);
const PRODUCTION_BLOCKER_AGGREGATION_ADMIN_PAGE_BOUNDARY_FIELDS = new Set([
  "safe_grouped_blocker_list_only",
  "fixed_labels_only",
  "status_counts_only",
  "safe_next_action_only",
  "no_raw_error_values",
  "no_raw_job_values",
  "no_raw_payload_values",
  "no_endpoint_values",
  "no_secret_values",
  "no_paths",
  "no_candidates",
  "no_commands",
]);
const PRODUCTION_BLOCKER_DASHBOARD_FIXTURE_BOUNDARY_FIELDS = new Set([
  "safe_label_count_status_only",
  "raw_diagnostic_excluded",
  "raw_error_excluded",
  "raw_job_excluded",
  "raw_payload_excluded",
  "endpoint_excluded",
  "secret_excluded",
  "command_excluded",
]);
const PRODUCTION_BLOCKER_ADMIN_PUBLIC_CONSISTENCY_BOUNDARY_FIELDS = new Set([
  "shared_safe_blocker_classification",
  "ordinary_and_public_safe_fields_only",
  "secret_excluded",
  "raw_data_excluded",
  "endpoint_excluded",
  "command_excluded",
  "counts_and_labels_only",
]);
const PRODUCTION_BLOCKER_OWNER_DETAIL_GATE_BOUNDARY_FIELDS = new Set([
  "owner_only_detail_role_gated",
  "ordinary_public_detail_redacted",
  "safe_detail_labels_only",
  "raw_diagnostic_excluded",
  "secret_excluded",
  "endpoint_excluded",
  "command_excluded",
]);
const PRODUCTION_BLOCKER_NEXT_ACTION_NO_COMMAND_BOUNDARY_FIELDS = new Set([
  "safe_script_name_or_operator_label_only",
  "shell_body_excluded",
  "external_url_excluded",
  "endpoint_excluded",
  "secret_excluded",
  "command_excluded",
]);
const PRODUCTION_BLOCKER_FIXTURE_REGRESSION_PACK_BOUNDARY_FIELDS = new Set([
  "missing_components_and_owner_detail_fixture_only",
  "safe_label_count_status_only",
  "owner_only_detail_role_gated",
  "raw_diagnostic_excluded",
  "secret_excluded",
  "endpoint_excluded",
  "command_excluded",
]);
const PRODUCTION_READINESS_MISSING_COMPONENT_LABELS = new Set([
  "worker",
  "engine",
  "obs",
  "db",
  "adapter",
]);
const PRODUCTION_READINESS_MISSING_COMPONENT_BOUNDARY_FIELDS = new Set([
  "component_labels_only",
  "status_only",
  "no_config_values",
  "no_secret_values",
  "no_endpoint_values",
]);
const PRODUCTION_READINESS_HEARTBEAT_BOUNDARY_FIELDS = new Set([
  "age_bucket_only",
  "stale_is_runtime_waiting",
  "fresh_required_for_ready",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
]);
const RUNTIME_PRODUCTION_FRESH_ARTIFACT_REQUIREMENT_BOUNDARY_FIELDS = new Set([
  "fresh_heartbeat_required",
  "fresh_pickup_required",
  "fresh_render_required",
  "fresh_engine_health_required",
  "all_fresh_required_for_real_ready",
  "stale_or_missing_not_ready",
  "safe_status_count_only",
  "no_raw_artifact_values",
  "no_endpoint_values",
  "no_paths",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const RUNTIME_PRODUCTION_OPERATOR_CHECKLIST_BOUNDARY_FIELDS = new Set([
  "safe_label_script_status_only",
  "script_names_only",
  "fixed_status_labels_only",
  "no_endpoint_values",
  "no_path_values",
  "no_token_values",
  "no_raw_command_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const PRODUCTION_FINAL_PREFLIGHT_CHECKLIST_MANIFEST_BOUNDARY_FIELDS = new Set([
  "manifest_only",
  "safe_check_labels_only",
  "safe_category_status_only",
  "required_before_real_operation",
  "real_residency_not_assumed",
  "config_values_excluded",
  "secret_values_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "command_values_excluded",
]);
const PRODUCTION_FINAL_PREFLIGHT_CHECK_GROUPING_BOUNDARY_FIELDS = new Set([
  "category_status_blocker_count_only",
  "safe_category_labels_only",
  "raw_config_values_excluded",
  "secret_values_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "path_values_excluded",
  "command_values_excluded",
]);
const PRODUCTION_FINAL_PREFLIGHT_OWNER_CONFIRMATION_BOUNDARY_FIELDS = new Set([
  "owner_confirmation_required_before_real_external_device_step",
  "safe_status_only",
  "real_operation_not_started",
  "raw_config_values_excluded",
  "secret_values_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "command_values_excluded",
]);
const PRODUCTION_FINAL_PREFLIGHT_AUDIT_READINESS_BOUNDARY_FIELDS = new Set([
  "audit_ready_required_before_production_go",
  "safe_status_only",
  "raw_audit_payload_excluded",
  "secret_values_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "command_values_excluded",
]);
const PRODUCTION_FINAL_PREFLIGHT_EMERGENCY_STOP_READINESS_BOUNDARY_FIELDS =
  new Set([
    "emergency_stop_required_before_production_go",
    "safe_status_only",
    "real_device_command_not_emitted",
    "raw_payload_values_excluded",
    "secret_values_excluded",
    "endpoint_values_excluded",
    "token_values_excluded",
    "command_values_excluded",
  ]);
const PRODUCTION_FINAL_PREFLIGHT_SAFE_EXPORT_BOUNDARY_FIELDS = new Set([
  "safe_status_count_only",
  "safe_export_only",
  "secret_values_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "command_values_excluded",
  "job_values_excluded",
]);
const PRODUCTION_FINAL_PREFLIGHT_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "safe_status_count_only",
  "missing_confirmation_audit_emergency_stop_covered",
  "secret_leak_fixture_rejected",
  "secret_values_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "command_values_excluded",
  "job_values_excluded",
]);
const PRODUCTION_FINAL_PREFLIGHT_REVIEW_HOOK_BOUNDARY_FIELDS = new Set([
  "safe_review_status_only",
  "code_change_not_required",
  "pre_real_residency_review_only",
  "safe_status_count_only",
  "secret_values_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "command_values_excluded",
  "job_values_excluded",
]);
const RUNTIME_PRODUCTION_CONNECTOR_TRACE_ENVELOPE_BOUNDARY_FIELDS = new Set([
  "trace_run_component_status_only",
  "safe_ids_only",
  "safe_component_label_only",
  "safe_status_label_only",
  "no_raw_payload_values",
  "no_secret_values",
  "no_endpoint_values",
  "no_token_values",
  "no_paths",
  "no_candidates",
  "no_commands",
]);
const RUNTIME_PRODUCTION_CONNECTION_DRY_RUN_BOUNDARY_FIELDS = new Set([
  "dry_run_result_only_without_real_residency",
  "no_real_connection_success_without_residency",
  "no_real_ready_without_residency",
  "no_readiness_sweetening",
  "safe_status_labels_only",
  "no_raw_payload_values",
  "no_secret_values",
  "no_endpoint_values",
  "no_token_values",
  "no_paths",
  "no_candidates",
  "no_commands",
]);
const REAL_READINESS_DRY_RUN_ROUTE_BOUNDARY_FIELDS = new Set([
  "dry_run_only",
  "safe_prerequisite_status_only",
  "real_operation_not_performed",
  "real_ready_not_reported",
  "no_raw_payload_values",
  "no_secret_values",
  "no_endpoint_values",
  "no_token_values",
  "no_candidates",
  "no_commands",
]);
const REAL_READINESS_DRY_RUN_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "dry_run_fixture_only",
  "missing_attention_degraded_ready_only",
  "safe_status_count_only",
  "real_operation_not_performed",
  "real_ready_not_reported",
  "no_raw_payload_values",
  "no_secret_values",
  "no_endpoint_values",
  "no_token_values",
  "no_commands",
]);
const REAL_READINESS_DRY_RUN_COMPLETION_HOOK_BOUNDARY_FIELDS = new Set([
  "safe_summary_only",
  "dry_run_distinct_from_real_ready",
  "real_ready_not_reported",
  "safe_status_labels_only",
  "no_raw_payload_values",
  "no_secret_values",
  "no_endpoint_values",
  "no_token_values",
  "no_commands",
]);
const RUNTIME_PRODUCTION_ATTENTION_REASON_CATALOG_BOUNDARY_FIELDS = new Set([
  "fixed_reason_catalog_only",
  "blocked_attention_labels_only",
  "safe_component_label_only",
  "no_raw_error_values",
  "no_path_values",
  "no_endpoint_values",
  "no_token_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const RUNTIME_PRODUCTION_NO_AUTO_REMEDIATION_GUARD_BOUNDARY_FIELDS = new Set([
  "operator_action_only_after_blocker",
  "no_auto_obs_mutation",
  "no_auto_tts_mutation",
  "no_auto_live2d_mutation",
  "no_auto_db_mutation",
  "no_auto_game_mutation",
  "safe_component_labels_only",
  "no_raw_command_values",
  "no_endpoint_values",
  "no_path_values",
  "no_token_values",
  "no_payloads",
  "no_candidates",
]);
const RUNTIME_PRODUCTION_E2E_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "worker_missing_blocks_ready",
  "engine_attention_blocks_ready",
  "obs_stale_blocks_ready",
  "db_blocked_blocks_ready",
  "fixture_pass_not_real_ready",
  "blocked_priority_preserved",
  "safe_summary_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_paths",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const RUNTIME_PRODUCTION_OPERATOR_CHECKLIST_DEFAULT_ITEMS = Object.freeze([
  Object.freeze(["worker_residency", "npm run dev:foundation:startup-checklist"]),
  Object.freeze(["engine_health", "npm run dev:engine:probe"]),
  Object.freeze(["obs_pickup", "npm run dev:obs:runtime-render-roundtrip"]),
  Object.freeze(["db_preflight", "npm run dev:persistence:preflight"]),
  Object.freeze(["adapter_preflight", "npm run dev:production:runtime-handoff-status"]),
]);
const PRODUCTION_FINAL_PREFLIGHT_CHECKS = Object.freeze([
  Object.freeze(["bridge_runtime", "runtime", "bridge"]),
  Object.freeze(["tts_engine", "voice", "tts"]),
  Object.freeze(["live2d_renderer", "render", "live2d"]),
  Object.freeze(["subtitle_pipeline", "voice", "subtitle"]),
  Object.freeze(["obs_pickup", "overlay", "obs"]),
  Object.freeze(["db_connector", "persistence", "db"]),
  Object.freeze(["youtube_ingest", "ingest", "youtube"]),
  Object.freeze(["game_adapter", "control", "game"]),
]);
const PRODUCTION_FINAL_PREFLIGHT_CHECK_LABELS = new Set(
  PRODUCTION_FINAL_PREFLIGHT_CHECKS.map(([label]) => label)
);
const PRODUCTION_FINAL_PREFLIGHT_CATEGORIES = new Set(
  PRODUCTION_FINAL_PREFLIGHT_CHECKS.map(([, category]) => category)
);
const PRODUCTION_FINAL_PREFLIGHT_COMPONENTS = new Set(
  PRODUCTION_FINAL_PREFLIGHT_CHECKS.map(([, , component]) => component)
);
const RUNTIME_PRODUCTION_OPERATOR_CHECK_STATUSES = new Set([
  "pending",
  "attention",
  "blocked",
  "verified",
]);
const PRODUCTION_READINESS_BATCH_FIXTURE_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "blocked_priority_preserved",
  "fixture_success_not_real_ready",
  "safe_summary_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const PRODUCTION_E2E_BLOCKER_REVIEW_HOOK_BOUNDARY_FIELDS = new Set([
  "safe_review_hook_only",
  "unresolved_blocked_retained",
  "safe_blocker_labels_only",
  "counts_only",
  "no_readiness_sweetening",
  "no_secret_values",
  "no_endpoint_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
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

export function createRuntimeProductionConnectionManifest({
  dependencyStatuses = {},
} = {}) {
  const dependency_statuses = RUNTIME_PRODUCTION_CONNECTION_COMPONENTS.map(
    ([componentId, requiredField]) => ({
      schema: "iris_runtime_production_connection_dependency_v1",
      component_id: componentId,
      required_field: requiredField,
      safe_status: safeRuntimeProductionConnectionStatus(
        dependencyStatuses[componentId] ?? dependencyStatuses[requiredField]
      ),
      real_residency_required: true,
    })
  );
  const manifest = {
    schema: "iris_runtime_production_connection_manifest_v1",
    manifest_status: "blocked_until_real_residency_confirmed",
    dependency_count: RUNTIME_PRODUCTION_CONNECTION_COMPONENTS.length,
    required_dependencies: RUNTIME_PRODUCTION_CONNECTION_COMPONENTS.map(
      ([componentId]) => componentId
    ),
    required_fields: [...RUNTIME_PRODUCTION_CONNECTION_REQUIRED_FIELDS],
    dependency_statuses,
    boundary_policy: Object.fromEntries(
      [...RUNTIME_PRODUCTION_CONNECTION_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRuntimeProductionConnectionManifestSafe(manifest);
  return manifest;
}

export function assertRuntimeProductionConnectionManifestSafe(
  manifest,
  context = "runtime production connection manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(manifest, context);
  for (const field of Object.keys(manifest)) {
    if (!RUNTIME_PRODUCTION_CONNECTION_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`);
    }
  }
  if (
    manifest.schema !== "iris_runtime_production_connection_manifest_v1" ||
    manifest.manifest_status !== "blocked_until_real_residency_confirmed" ||
    manifest.dependency_count !== RUNTIME_PRODUCTION_CONNECTION_COMPONENTS.length
  ) {
    throw new ContractError(`${context}: invalid manifest`);
  }
  assertExactStringList(
    manifest.required_dependencies,
    RUNTIME_PRODUCTION_CONNECTION_COMPONENTS.map(([componentId]) => componentId),
    `${context}: required dependencies`
  );
  assertExactStringList(
    manifest.required_fields,
    RUNTIME_PRODUCTION_CONNECTION_REQUIRED_FIELDS,
    `${context}: required fields`
  );
  assertRuntimeProductionConnectionDependenciesSafe(
    manifest.dependency_statuses,
    context
  );
  assertBoundaryPolicy(
    manifest.boundary_policy,
    RUNTIME_PRODUCTION_CONNECTION_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (manifest.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createRuntimeProductionBlockerMatrix({
  componentStates = {},
} = {}) {
  const components = RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENTS.map(
    (componentId) =>
      runtimeProductionBlockerMatrixComponent(
        componentId,
        componentStates[componentId] ?? {}
      )
  );
  const summary = {
    schema: "iris_runtime_production_blocker_matrix_v1",
    matrix_status: components.some((component) => component.classification === "BLOCKED")
      ? "BLOCKED"
      : components.some((component) => component.classification === "attention")
        ? "attention"
        : components.some((component) => component.classification === "degraded")
          ? "degraded"
          : "ready",
    component_count: components.length,
    blocked_count: components.filter((component) => component.classification === "BLOCKED").length,
    attention_count: components.filter((component) => component.classification === "attention").length,
    degraded_count: components.filter((component) => component.classification === "degraded").length,
    ready_count: components.filter((component) => component.classification === "ready").length,
    components,
    boundary_policy: Object.fromEntries(
      [...RUNTIME_PRODUCTION_BLOCKER_MATRIX_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRuntimeProductionBlockerMatrixSafe(summary);
  return summary;
}

export function assertRuntimeProductionBlockerMatrixSafe(
  summary,
  context = "runtime production blocker matrix"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: matrix required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!RUNTIME_PRODUCTION_BLOCKER_MATRIX_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected matrix field`);
    }
  }
  if (
    summary.schema !== "iris_runtime_production_blocker_matrix_v1" ||
    summary.component_count !== RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENTS.length ||
    !PRODUCTION_READINESS_BLOCKER_CLASSIFICATIONS.has(summary.matrix_status)
  ) {
    throw new ContractError(`${context}: invalid matrix`);
  }
  assertRuntimeProductionBlockerMatrixComponentsSafe(summary.components, context);
  if (
    summary.blocked_count !== summary.components.filter((component) => component.classification === "BLOCKED").length ||
    summary.attention_count !== summary.components.filter((component) => component.classification === "attention").length ||
    summary.degraded_count !== summary.components.filter((component) => component.classification === "degraded").length ||
    summary.ready_count !== summary.components.filter((component) => component.classification === "ready").length
  ) {
    throw new ContractError(`${context}: count mismatch`);
  }
  if (
    summary.components.some(
      (component) =>
        component.real_runtime_confirmed !== true &&
        (component.classification === "ready" || component.ready_allowed === true)
    )
  ) {
    throw new ContractError(`${context}: unconfirmed runtime cannot be ready`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    RUNTIME_PRODUCTION_BLOCKER_MATRIX_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionReadinessComponentDependencyMap({
  localBridgeStatus = "runtime_waiting",
  ttsStatus = "runtime_waiting",
  live2dStatus = "runtime_waiting",
  subtitleStatus = "runtime_waiting",
  obsStatus = "real_device_waiting",
  dbStatus = "configuration_waiting",
  gameStatus = "operator_review_required",
  youtubeStatus = "configuration_waiting",
  overlayPickupStatus = "real_device_waiting",
} = {}) {
  const components = [
    componentDependency("local_bridge", localBridgeStatus),
    componentDependency("tts", ttsStatus),
    componentDependency("live2d", live2dStatus),
    componentDependency("subtitle", subtitleStatus),
    componentDependency("obs", obsStatus),
    componentDependency("db", dbStatus),
    componentDependency("game", gameStatus),
    componentDependency("youtube", youtubeStatus),
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
  if (
    !Array.isArray(summary.components) ||
    summary.components.length !== PRODUCTION_READINESS_COMPONENT_IDS.size
  ) {
    throw new ContractError(`${context}: component dependencies required`);
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

export function createProductionPreflightAdminPageSummary({
  componentSummary = null,
  nextSafeAction = null,
} = {}) {
  const safeComponentSummary =
    componentSummary ??
    createProductionReadinessComponentDependencyMap();
  assertProductionReadinessComponentDependencyMapSafe(
    safeComponentSummary,
    "production preflight admin page component summary"
  );
  const safeNextAction =
    nextSafeAction ?? createProductionReadinessSafeNextAction();
  assertProductionReadinessSafeNextActionSafe(
    safeNextAction,
    "production preflight admin page next safe action"
  );
  const componentStatuses = safeComponentSummary.components.map((component) => ({
    schema: "iris_production_preflight_admin_page_component_status_v1",
    component_id: component.component_id,
    status: component.dependency_status,
    readiness_state: component.readiness_state,
  }));
  const summary = {
    schema: "iris_production_preflight_admin_page_summary_v1",
    page_status:
      safeComponentSummary.attention_component_count === 0 ? "ready" : "attention",
    component_count: safeComponentSummary.component_count,
    ready_component_count: safeComponentSummary.ready_component_count,
    attention_component_count: safeComponentSummary.attention_component_count,
    component_statuses: componentStatuses,
    next_safe_action: safeNextAction,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_PREFLIGHT_ADMIN_PAGE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertProductionPreflightAdminPageSummarySafe(summary);
  return summary;
}

export function assertProductionPreflightAdminPageSummarySafe(
  summary,
  context = "production preflight admin page summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_PREFLIGHT_ADMIN_PAGE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected page summary field`);
    }
  }
  if (summary.schema !== "iris_production_preflight_admin_page_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["ready", "attention"].includes(summary.page_status)) {
    throw new ContractError(`${context}: invalid page status`);
  }
  if (!Array.isArray(summary.component_statuses)) {
    throw new ContractError(`${context}: component statuses are required`);
  }
  if (
    summary.component_count !== summary.component_statuses.length ||
    summary.ready_component_count !==
      summary.component_statuses.filter((item) => item.readiness_state === "ready")
        .length ||
    summary.attention_component_count !==
      summary.component_statuses.filter((item) => item.readiness_state !== "ready")
        .length
  ) {
    throw new ContractError(`${context}: invalid component counts`);
  }
  const seen = new Set();
  for (const component of summary.component_statuses) {
    assertProductionPreflightAdminPageComponentStatusSafe(component, context);
    if (seen.has(component.component_id)) {
      throw new ContractError(`${context}: duplicate component status`);
    }
    seen.add(component.component_id);
  }
  assertProductionReadinessSafeNextActionSafe(
    summary.next_safe_action,
    `${context}: next safe action`
  );
  assertBoundaryPolicy(
    summary.boundary_policy,
    PRODUCTION_PREFLIGHT_ADMIN_PAGE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

function assertProductionPreflightAdminPageComponentStatusSafe(
  component,
  context
) {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    throw new ContractError(`${context}: component status is required`);
  }
  for (const field of Object.keys(component)) {
    if (!PRODUCTION_PREFLIGHT_ADMIN_PAGE_COMPONENT_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected component status field`);
    }
  }
  if (
    component.schema !==
    "iris_production_preflight_admin_page_component_status_v1"
  ) {
    throw new ContractError(`${context}: invalid component status schema`);
  }
  if (!PRODUCTION_READINESS_COMPONENT_IDS.has(component.component_id)) {
    throw new ContractError(`${context}: invalid component id`);
  }
  if (
    typeof component.status !== "string" ||
    !SAFE_STAGE_STATUS_PATTERN.test(component.status)
  ) {
    throw new ContractError(`${context}: invalid component status`);
  }
  assertSafeReadinessState(component.readiness_state, context);
}

export function createProductionReadinessBlockerActionMap({
  blockerLabel = "operator_review_required",
} = {}) {
  const safeBlocker = PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(blockerLabel)
    ? blockerLabel
    : "operator_review_required";
  const nextAction = safeNextActionForProductionBlocker(safeBlocker);
  const summary = {
    schema: "iris_production_readiness_blocker_action_map_v1",
    blocker_label: safeBlocker,
    action_kind: nextAction.next_safe_script ? "safe_script" : "operator_action_label",
    next_safe_script: nextAction.next_safe_script,
    operator_action_label: nextAction.operator_action_label,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_READINESS_BLOCKER_ACTION_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertProductionReadinessBlockerActionMapSafe(summary);
  return summary;
}

export function assertProductionReadinessBlockerActionMapSafe(
  summary,
  context = "production readiness blocker action map"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_READINESS_BLOCKER_ACTION_MAP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected action map field`);
    }
  }
  if (summary.schema !== "iris_production_readiness_blocker_action_map_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(summary.blocker_label)) {
    throw new ContractError(`${context}: invalid blocker label`);
  }
  if (!["safe_script", "operator_action_label"].includes(summary.action_kind)) {
    throw new ContractError(`${context}: invalid action kind`);
  }
  if (summary.action_kind === "safe_script") {
    if (!isSafeScriptName(summary.next_safe_script) || summary.operator_action_label !== null) {
      throw new ContractError(`${context}: invalid safe script action`);
    }
  } else if (
    summary.next_safe_script !== null ||
    !safeGateDetailLabel(summary.operator_action_label)
  ) {
    throw new ContractError(`${context}: invalid operator action label`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    PRODUCTION_READINESS_BLOCKER_ACTION_BOUNDARY_FIELDS,
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

export function createProductionReadinessRouteContractManifest({
  routes = null,
} = {}) {
  const routeContracts =
    routes ??
    [
      productionReadinessRouteContract({
        routeId: "production_live_readiness",
        inputFields: ["generated_at_ms"],
      }),
      productionReadinessRouteContract({
        routeId: "production_probe",
        inputFields: ["generated_at_ms", "fixture_mode"],
      }),
      productionReadinessRouteContract({
        routeId: "production_runtime_handoff_status",
        inputFields: ["generated_at_ms"],
      }),
    ];
  const manifest = {
    schema: "iris_production_readiness_route_contract_manifest_v1",
    contract_status: "manifest_ready",
    route_count: routeContracts.length,
    routes: routeContracts,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_READINESS_ROUTE_CONTRACT_MANIFEST_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
  };
  assertProductionReadinessRouteContractManifestSafe(manifest);
  return manifest;
}

export function assertProductionReadinessRouteContractManifestSafe(
  manifest,
  context = "production readiness route contract manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(manifest, context);
  for (const field of Object.keys(manifest)) {
    if (!PRODUCTION_READINESS_ROUTE_CONTRACT_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`);
    }
  }
  if (manifest.schema !== "iris_production_readiness_route_contract_manifest_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (manifest.contract_status !== "manifest_ready") {
    throw new ContractError(`${context}: invalid contract status`);
  }
  if (!Array.isArray(manifest.routes) || manifest.routes.length === 0) {
    throw new ContractError(`${context}: routes required`);
  }
  if (manifest.route_count !== manifest.routes.length) {
    throw new ContractError(`${context}: route count mismatch`);
  }
  const seen = new Set();
  for (const route of manifest.routes) {
    assertProductionReadinessRouteContractSafe(route, context);
    if (seen.has(route.route_id)) {
      throw new ContractError(`${context}: duplicate route contract`);
    }
    seen.add(route.route_id);
  }
  assertBoundaryPolicy(
    manifest.boundary_policy,
    PRODUCTION_READINESS_ROUTE_CONTRACT_MANIFEST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionReadinessBlockerReasonSummary({
  reasons = [],
} = {}) {
  const reasonLabels = [
    ...new Set(
      (Array.isArray(reasons) ? reasons : [])
        .map((reason) => safeProductionReadinessBlockerReason(reason))
        .filter(Boolean)
    ),
  ].sort();
  const summary = {
    schema: "iris_production_readiness_blocker_reason_summary_v1",
    reason_count: reasonLabels.length,
    reason_labels: reasonLabels,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_READINESS_BLOCKER_REASON_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertProductionReadinessBlockerReasonSummarySafe(summary);
  return summary;
}

export function assertProductionReadinessBlockerReasonSummarySafe(
  summary,
  context = "production readiness blocker reason summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_READINESS_BLOCKER_REASON_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected reason summary field`);
    }
  }
  if (summary.schema !== "iris_production_readiness_blocker_reason_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (
    !Array.isArray(summary.reason_labels) ||
    summary.reason_labels.some(
      (reason) => !PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(reason)
    )
  ) {
    throw new ContractError(`${context}: invalid reason labels`);
  }
  if (
    !Number.isInteger(summary.reason_count) ||
    summary.reason_count !== summary.reason_labels.length
  ) {
    throw new ContractError(`${context}: invalid reason count`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    PRODUCTION_READINESS_BLOCKER_REASON_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionBlockerAggregationAdminPage({
  blockers = [],
} = {}) {
  const grouped = new Map();
  for (const blocker of Array.isArray(blockers) ? blockers : []) {
    const label = safeProductionReadinessBlockerReason(
      typeof blocker === "string" ? blocker : blocker?.blocker_label
    );
    if (!label) continue;
    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  }
  const blockerGroups = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, count]) => ({
      schema: "iris_production_blocker_aggregation_admin_page_group_v1",
      blocker_group_label: label,
      status: "blocked",
      blocker_count: count,
      next_safe_action: safeNextActionForProductionBlocker(label),
    }));
  const page = {
    schema: "iris_production_blocker_aggregation_admin_page_v1",
    page_status: blockerGroups.length > 0 ? "attention" : "ready",
    blocker_group_count: blockerGroups.length,
    total_blocker_count: blockerGroups.reduce(
      (total, group) => total + group.blocker_count,
      0
    ),
    blocker_groups: blockerGroups,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_BLOCKER_AGGREGATION_ADMIN_PAGE_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
  };
  assertProductionBlockerAggregationAdminPageSafe(page);
  return page;
}

export function assertProductionBlockerAggregationAdminPageSafe(
  page,
  context = "production blocker aggregation admin page"
) {
  if (!page || typeof page !== "object" || Array.isArray(page)) {
    throw new ContractError(`${context}: page is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(page, context);
  for (const field of Object.keys(page)) {
    if (!PRODUCTION_BLOCKER_AGGREGATION_ADMIN_PAGE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected page field`);
    }
  }
  if (page.schema !== "iris_production_blocker_aggregation_admin_page_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["ready", "attention"].includes(page.page_status)) {
    throw new ContractError(`${context}: invalid page status`);
  }
  if (!Array.isArray(page.blocker_groups)) {
    throw new ContractError(`${context}: blocker groups required`);
  }
  const seen = new Set();
  let total = 0;
  for (const group of page.blocker_groups) {
    assertProductionBlockerAggregationAdminPageGroupSafe(group, context);
    if (seen.has(group.blocker_group_label)) {
      throw new ContractError(`${context}: duplicate blocker group`);
    }
    seen.add(group.blocker_group_label);
    total += group.blocker_count;
  }
  if (
    page.blocker_group_count !== page.blocker_groups.length ||
    page.total_blocker_count !== total ||
    page.page_status !== (page.blocker_groups.length > 0 ? "attention" : "ready")
  ) {
    throw new ContractError(`${context}: blocker count mismatch`);
  }
  assertBoundaryPolicy(
    page.boundary_policy,
    PRODUCTION_BLOCKER_AGGREGATION_ADMIN_PAGE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionBlockerDashboardFixture({
  blockers = [],
} = {}) {
  const labels = (Array.isArray(blockers) ? blockers : [])
    .map((blocker) =>
      safeProductionReadinessBlockerReason(
        typeof blocker === "string" ? blocker : blocker?.blocker_label
      )
    )
    .filter(Boolean);
  const statusCounts = labels.reduce(
    (counts, label) => {
      const status = productionBlockerStatus(label);
      counts[status] += 1;
      return counts;
    },
    { blocked: 0, attention: 0 }
  );
  const fixture = {
    schema: "iris_production_blocker_dashboard_fixture_v1",
    dashboard_status: labels.length > 0 ? "attention" : "ready",
    blocker_count: labels.length,
    status_counts: statusCounts,
    blocker_labels: [...new Set(labels)].sort(),
    boundary_policy: {
      safe_label_count_status_only: true,
      raw_diagnostic_excluded: true,
      raw_error_excluded: true,
      raw_job_excluded: true,
      raw_payload_excluded: true,
      endpoint_excluded: true,
      secret_excluded: true,
      command_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertProductionBlockerDashboardFixtureSafe(fixture);
  return fixture;
}

export function assertProductionBlockerDashboardFixtureSafe(
  fixture,
  context = "production blocker dashboard fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!PRODUCTION_BLOCKER_DASHBOARD_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (fixture.schema !== "iris_production_blocker_dashboard_fixture_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["ready", "attention"].includes(fixture.dashboard_status)) {
    throw new ContractError(`${context}: invalid dashboard status`);
  }
  if (!Number.isInteger(fixture.blocker_count) || fixture.blocker_count < 0) {
    throw new ContractError(`${context}: invalid blocker count`);
  }
  if (
    !fixture.status_counts ||
    typeof fixture.status_counts !== "object" ||
    Array.isArray(fixture.status_counts)
  ) {
    throw new ContractError(`${context}: status counts required`);
  }
  for (const field of Object.keys(fixture.status_counts)) {
    if (
      !["blocked", "attention"].includes(field) ||
      !Number.isInteger(fixture.status_counts[field]) ||
      fixture.status_counts[field] < 0
    ) {
      throw new ContractError(`${context}: invalid status count`);
    }
  }
  if (
    fixture.blocker_count !==
      (fixture.status_counts.blocked ?? 0) + (fixture.status_counts.attention ?? 0) ||
    fixture.dashboard_status !== (fixture.blocker_count > 0 ? "attention" : "ready")
  ) {
    throw new ContractError(`${context}: blocker count mismatch`);
  }
  if (
    !Array.isArray(fixture.blocker_labels) ||
    fixture.blocker_labels.some(
      (label) => !PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(label)
    )
  ) {
    throw new ContractError(`${context}: invalid blocker labels`);
  }
  assertBoundaryPolicy(
    fixture.boundary_policy,
    PRODUCTION_BLOCKER_DASHBOARD_FIXTURE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (fixture.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionBlockerAdminPublicConsistency({
  blockers = [],
} = {}) {
  const labels = productionBlockerLabelsFromInput(blockers);
  const statusCounts = productionBlockerStatusCounts(labels);
  const sharedLabels = [...new Set(labels)].sort();
  const fixture = {
    schema: "iris_production_blocker_admin_public_consistency_v1",
    consistency_status: "consistent",
    blocker_count: labels.length,
    admin_status_counts: { ...statusCounts },
    public_status_counts: { ...statusCounts },
    admin_blocker_labels: sharedLabels,
    public_blocker_labels: sharedLabels,
    boundary_policy: {
      shared_safe_blocker_classification: true,
      ordinary_and_public_safe_fields_only: true,
      secret_excluded: true,
      raw_data_excluded: true,
      endpoint_excluded: true,
      command_excluded: true,
      counts_and_labels_only: true,
    },
    adapter_validation_required: true,
  };
  assertProductionBlockerAdminPublicConsistencySafe(fixture);
  return fixture;
}

export function assertProductionBlockerAdminPublicConsistencySafe(
  fixture,
  context = "production blocker admin/public consistency"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!PRODUCTION_BLOCKER_ADMIN_PUBLIC_CONSISTENCY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (fixture.schema !== "iris_production_blocker_admin_public_consistency_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (fixture.consistency_status !== "consistent") {
    throw new ContractError(`${context}: inconsistent blocker classification`);
  }
  if (!Number.isInteger(fixture.blocker_count) || fixture.blocker_count < 0) {
    throw new ContractError(`${context}: invalid blocker count`);
  }
  assertProductionBlockerStatusCountsSafe(fixture.admin_status_counts, context);
  assertProductionBlockerStatusCountsSafe(fixture.public_status_counts, context);
  const adminCount =
    (fixture.admin_status_counts.blocked ?? 0) +
    (fixture.admin_status_counts.attention ?? 0);
  const publicCount =
    (fixture.public_status_counts.blocked ?? 0) +
    (fixture.public_status_counts.attention ?? 0);
  if (
    fixture.blocker_count !== adminCount ||
    fixture.blocker_count !== publicCount ||
    JSON.stringify(fixture.admin_status_counts) !==
      JSON.stringify(fixture.public_status_counts)
  ) {
    throw new ContractError(`${context}: status count mismatch`);
  }
  assertProductionBlockerLabelsSafe(fixture.admin_blocker_labels, context);
  assertProductionBlockerLabelsSafe(fixture.public_blocker_labels, context);
  if (
    JSON.stringify(fixture.admin_blocker_labels) !==
    JSON.stringify(fixture.public_blocker_labels)
  ) {
    throw new ContractError(`${context}: blocker label mismatch`);
  }
  assertBoundaryPolicy(
    fixture.boundary_policy,
    PRODUCTION_BLOCKER_ADMIN_PUBLIC_CONSISTENCY_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (fixture.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionBlockerOwnerOnlyDetailGate({
  viewerRole = "ordinary",
  details = [],
} = {}) {
  const role = viewerRole === "owner" ? "owner" : "ordinary";
  const safeDetails = (Array.isArray(details) ? details : [])
    .map((detail) => safeGateDetailLabel(detail?.detail_label ?? detail?.label ?? detail))
    .filter(Boolean);
  const detailVisible = role === "owner";
  const fixture = {
    schema: "iris_production_blocker_owner_detail_gate_v1",
    gate_status: detailVisible ? "owner_detail_visible" : "redacted",
    viewer_role: role,
    owner_only_detail_count: safeDetails.length,
    detail_visible: detailVisible,
    ordinary_public_redacted: !detailVisible,
    safe_detail_labels: detailVisible ? [...new Set(safeDetails)].sort() : [],
    boundary_policy: {
      owner_only_detail_role_gated: true,
      ordinary_public_detail_redacted: true,
      safe_detail_labels_only: true,
      raw_diagnostic_excluded: true,
      secret_excluded: true,
      endpoint_excluded: true,
      command_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertProductionBlockerOwnerOnlyDetailGateSafe(fixture);
  return fixture;
}

export function assertProductionBlockerOwnerOnlyDetailGateSafe(
  fixture,
  context = "production blocker owner-only detail gate"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!PRODUCTION_BLOCKER_OWNER_DETAIL_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (fixture.schema !== "iris_production_blocker_owner_detail_gate_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["owner_detail_visible", "redacted"].includes(fixture.gate_status)) {
    throw new ContractError(`${context}: invalid gate status`);
  }
  if (!["owner", "ordinary"].includes(fixture.viewer_role)) {
    throw new ContractError(`${context}: invalid viewer role`);
  }
  if (
    !Number.isInteger(fixture.owner_only_detail_count) ||
    fixture.owner_only_detail_count < 0 ||
    typeof fixture.detail_visible !== "boolean" ||
    typeof fixture.ordinary_public_redacted !== "boolean" ||
    !Array.isArray(fixture.safe_detail_labels)
  ) {
    throw new ContractError(`${context}: invalid detail gate`);
  }
  for (const label of fixture.safe_detail_labels) {
    if (!safeGateDetailLabel(label)) {
      throw new ContractError(`${context}: unsafe detail label`);
    }
  }
  const ownerView = fixture.viewer_role === "owner";
  if (
    fixture.gate_status !== (ownerView ? "owner_detail_visible" : "redacted") ||
    fixture.detail_visible !== ownerView ||
    fixture.ordinary_public_redacted !== !ownerView ||
    (!ownerView && fixture.safe_detail_labels.length !== 0) ||
    (ownerView && fixture.safe_detail_labels.length > fixture.owner_only_detail_count)
  ) {
    throw new ContractError(`${context}: owner detail gate mismatch`);
  }
  assertBoundaryPolicy(
    fixture.boundary_policy,
    PRODUCTION_BLOCKER_OWNER_DETAIL_GATE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (fixture.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionBlockerNextActionNoCommandBody({
  blockerLabel = "operator_review_required",
} = {}) {
  const safeBlocker = PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(blockerLabel)
    ? blockerLabel
    : "operator_review_required";
  const action = safeNextActionLabelForProductionBlocker(safeBlocker);
  const fixture = {
    schema: "iris_production_blocker_next_action_no_command_body_v1",
    action_status: "safe",
    blocker_label: safeBlocker,
    next_safe_script_name: action.next_safe_script_name,
    operator_action_label: action.operator_action_label,
    boundary_policy: {
      safe_script_name_or_operator_label_only: true,
      shell_body_excluded: true,
      external_url_excluded: true,
      endpoint_excluded: true,
      secret_excluded: true,
      command_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertProductionBlockerNextActionNoCommandBodySafe(fixture);
  return fixture;
}

export function assertProductionBlockerNextActionNoCommandBodySafe(
  fixture,
  context = "production blocker next action no command body"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!PRODUCTION_BLOCKER_NEXT_ACTION_NO_COMMAND_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (fixture.schema !== "iris_production_blocker_next_action_no_command_body_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (fixture.action_status !== "safe") {
    throw new ContractError(`${context}: invalid action status`);
  }
  if (!PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(fixture.blocker_label)) {
    throw new ContractError(`${context}: invalid blocker label`);
  }
  const hasScriptName = fixture.next_safe_script_name !== null;
  const hasOperatorLabel = fixture.operator_action_label !== null;
  if (hasScriptName === hasOperatorLabel) {
    throw new ContractError(`${context}: exactly one next action label required`);
  }
  if (
    hasScriptName &&
    (!isSafeScriptLabel(fixture.next_safe_script_name) ||
      isShellCommandBody(fixture.next_safe_script_name))
  ) {
    throw new ContractError(`${context}: unsafe script name`);
  }
  if (hasOperatorLabel && !safeGateDetailLabel(fixture.operator_action_label)) {
    throw new ContractError(`${context}: unsafe operator label`);
  }
  assertBoundaryPolicy(
    fixture.boundary_policy,
    PRODUCTION_BLOCKER_NEXT_ACTION_NO_COMMAND_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (fixture.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionBlockerFixtureRegressionPack() {
  const blockers = [
    "worker_missing",
    "db_missing",
    "obs_missing",
    "engine_attention",
    "game_attention",
    "youtube_attention",
  ];
  const dashboard = createProductionBlockerDashboardFixture({ blockers });
  const consistency = createProductionBlockerAdminPublicConsistency({ blockers });
  const ownerDetailGate = createProductionBlockerOwnerOnlyDetailGate({
    viewerRole: "ordinary",
    details: ["db_owner_detail", "obs_owner_detail"],
  });
  const pack = {
    schema: "iris_production_blocker_fixture_regression_pack_v1",
    pack_status: "blocked",
    fixture_count: blockers.length + 1,
    blocker_dashboard: dashboard,
    admin_public_consistency: consistency,
    owner_detail_gate: ownerDetailGate,
    boundary_policy: {
      missing_components_and_owner_detail_fixture_only: true,
      safe_label_count_status_only: true,
      owner_only_detail_role_gated: true,
      raw_diagnostic_excluded: true,
      secret_excluded: true,
      endpoint_excluded: true,
      command_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertProductionBlockerFixtureRegressionPackSafe(pack);
  return pack;
}

export function assertProductionBlockerFixtureRegressionPackSafe(
  pack,
  context = "production blocker fixture regression pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!PRODUCTION_BLOCKER_FIXTURE_REGRESSION_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (pack.schema !== "iris_production_blocker_fixture_regression_pack_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (
    pack.pack_status !== "blocked" ||
    !Number.isInteger(pack.fixture_count) ||
    pack.fixture_count !== 7
  ) {
    throw new ContractError(`${context}: invalid pack status`);
  }
  assertProductionBlockerDashboardFixtureSafe(
    pack.blocker_dashboard,
    `${context}: dashboard`
  );
  assertProductionBlockerAdminPublicConsistencySafe(
    pack.admin_public_consistency,
    `${context}: admin public consistency`
  );
  assertProductionBlockerOwnerOnlyDetailGateSafe(
    pack.owner_detail_gate,
    `${context}: owner detail gate`
  );
  for (const label of [
    "worker_missing",
    "db_missing",
    "obs_missing",
    "engine_attention",
    "game_attention",
    "youtube_attention",
  ]) {
    if (!pack.blocker_dashboard.blocker_labels.includes(label)) {
      throw new ContractError(`${context}: missing blocker label`);
    }
  }
  if (
    pack.owner_detail_gate.viewer_role !== "ordinary" ||
    pack.owner_detail_gate.detail_visible !== false ||
    pack.owner_detail_gate.ordinary_public_redacted !== true
  ) {
    throw new ContractError(`${context}: owner-only detail must stay gated`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    PRODUCTION_BLOCKER_FIXTURE_REGRESSION_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (pack.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertProductionBlockerAggregationAdminPageGroupSafe(group, context) {
  if (!group || typeof group !== "object" || Array.isArray(group)) {
    throw new ContractError(`${context}: blocker group is required`);
  }
  for (const field of Object.keys(group)) {
    if (!PRODUCTION_BLOCKER_AGGREGATION_ADMIN_PAGE_GROUP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected blocker group field`);
    }
  }
  if (
    group.schema !== "iris_production_blocker_aggregation_admin_page_group_v1"
  ) {
    throw new ContractError(`${context}: invalid blocker group schema`);
  }
  if (!PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(group.blocker_group_label)) {
    throw new ContractError(`${context}: invalid blocker group label`);
  }
  if (group.status !== "blocked") {
    throw new ContractError(`${context}: invalid blocker group status`);
  }
  if (!Number.isInteger(group.blocker_count) || group.blocker_count <= 0) {
    throw new ContractError(`${context}: invalid blocker group count`);
  }
  const expectedAction = safeNextActionForProductionBlocker(group.blocker_group_label);
  if (JSON.stringify(group.next_safe_action) !== JSON.stringify(expectedAction)) {
    throw new ContractError(`${context}: invalid blocker group action`);
  }
  if (
    group.next_safe_action.next_safe_script !== null &&
    !isSafeScriptName(group.next_safe_action.next_safe_script)
  ) {
    throw new ContractError(`${context}: unsafe blocker group script`);
  }
  if (
    group.next_safe_action.operator_action_label !== null &&
    !safeGateDetailLabel(group.next_safe_action.operator_action_label)
  ) {
    throw new ContractError(`${context}: unsafe blocker group label`);
  }
}

export function createProductionReadinessMissingComponentClassifier({
  missingComponents = [],
} = {}) {
  const components = [
    ...new Set(
      (Array.isArray(missingComponents) ? missingComponents : [])
        .map((component) => safeProductionReadinessMissingComponent(component))
        .filter(Boolean)
    ),
  ].sort();
  const summary = {
    schema: "iris_production_readiness_missing_component_classifier_v1",
    missing_component_count: components.length,
    missing_components: components.map((componentLabel) => ({
      schema: "iris_production_readiness_missing_component_v1",
      component_label: componentLabel,
      status: "missing",
    })),
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_READINESS_MISSING_COMPONENT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertProductionReadinessMissingComponentClassifierSafe(summary);
  return summary;
}

export function assertProductionReadinessMissingComponentClassifierSafe(
  summary,
  context = "production readiness missing component classifier"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_READINESS_MISSING_COMPONENT_CLASSIFIER_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected classifier field`);
    }
  }
  if (summary.schema !== "iris_production_readiness_missing_component_classifier_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!Array.isArray(summary.missing_components)) {
    throw new ContractError(`${context}: missing components must be an array`);
  }
  if (
    !Number.isInteger(summary.missing_component_count) ||
    summary.missing_component_count !== summary.missing_components.length
  ) {
    throw new ContractError(`${context}: invalid component count`);
  }
  const seen = new Set();
  for (const component of summary.missing_components) {
    assertProductionReadinessMissingComponentSafe(component, context);
    if (seen.has(component.component_label)) {
      throw new ContractError(`${context}: duplicate component`);
    }
    seen.add(component.component_label);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    PRODUCTION_READINESS_MISSING_COMPONENT_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionReadinessHeartbeatClassifier({
  heartbeatAgeMs = null,
  staleAfterMs = 30000,
} = {}) {
  const age =
    heartbeatAgeMs !== null &&
    heartbeatAgeMs !== undefined &&
    Number.isFinite(Number(heartbeatAgeMs)) &&
    Number(heartbeatAgeMs) >= 0
      ? Number(heartbeatAgeMs)
      : null;
  const threshold =
    Number.isFinite(Number(staleAfterMs)) && Number(staleAfterMs) > 0
      ? Number(staleAfterMs)
      : 30000;
  const stale = age === null || age > threshold;
  const summary = {
    schema: "iris_production_readiness_heartbeat_classifier_v1",
    heartbeat_status: stale ? "stale" : "fresh",
    readiness_state: stale ? "runtime_waiting" : "ready",
    ready_allowed: stale === false,
    age_bucket: heartbeatAgeBucket(age, threshold),
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_READINESS_HEARTBEAT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertProductionReadinessHeartbeatClassifierSafe(summary);
  return summary;
}

export function assertProductionReadinessHeartbeatClassifierSafe(
  summary,
  context = "production readiness heartbeat classifier"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_READINESS_HEARTBEAT_CLASSIFIER_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected heartbeat field`);
    }
  }
  if (summary.schema !== "iris_production_readiness_heartbeat_classifier_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["fresh", "stale"].includes(summary.heartbeat_status)) {
    throw new ContractError(`${context}: invalid heartbeat status`);
  }
  assertSafeReadinessState(summary.readiness_state, context);
  if (!["recent", "stale", "missing"].includes(summary.age_bucket)) {
    throw new ContractError(`${context}: invalid age bucket`);
  }
  if (summary.heartbeat_status === "stale") {
    if (summary.readiness_state !== "runtime_waiting" || summary.ready_allowed !== false) {
      throw new ContractError(`${context}: stale heartbeat cannot be ready`);
    }
  }
  if (summary.heartbeat_status === "fresh" && summary.ready_allowed !== true) {
    throw new ContractError(`${context}: fresh heartbeat ready flag mismatch`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    PRODUCTION_READINESS_HEARTBEAT_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createRuntimeProductionFreshArtifactRequirement({
  heartbeatStatus = "missing",
  pickupStatus = "missing",
  renderStatus = "missing",
  engineHealthStatus = "missing",
} = {}) {
  const statuses = {
    fresh_heartbeat_status: safeFreshArtifactStatus(heartbeatStatus),
    fresh_pickup_status: safeFreshArtifactStatus(pickupStatus),
    fresh_render_status: safeFreshArtifactStatus(renderStatus),
    fresh_engine_health_status: safeFreshArtifactStatus(engineHealthStatus),
  };
  const missingFreshCount = Object.values(statuses).filter(
    (status) => status !== "fresh"
  ).length;
  const allFresh = missingFreshCount === 0;
  const summary = {
    schema: "iris_runtime_production_fresh_artifact_requirement_v1",
    requirement_status: allFresh ? "fresh_ready" : "runtime_waiting",
    ...statuses,
    real_ready_allowed: allFresh,
    missing_fresh_count: missingFreshCount,
    readiness_state: allFresh ? "ready" : "runtime_waiting",
    boundary_policy: Object.fromEntries(
      [...RUNTIME_PRODUCTION_FRESH_ARTIFACT_REQUIREMENT_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertRuntimeProductionFreshArtifactRequirementSafe(summary);
  return summary;
}

export function assertRuntimeProductionFreshArtifactRequirementSafe(
  summary,
  context = "runtime production fresh artifact requirement"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!RUNTIME_PRODUCTION_FRESH_ARTIFACT_REQUIREMENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (
    summary.schema !== "iris_runtime_production_fresh_artifact_requirement_v1" ||
    !["fresh_ready", "runtime_waiting"].includes(summary.requirement_status)
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  for (const field of [
    "fresh_heartbeat_status",
    "fresh_pickup_status",
    "fresh_render_status",
    "fresh_engine_health_status",
  ]) {
    if (!["fresh", "stale", "missing", "attention"].includes(summary[field])) {
      throw new ContractError(`${context}: invalid fresh status`);
    }
  }
  const missingFreshCount = [
    summary.fresh_heartbeat_status,
    summary.fresh_pickup_status,
    summary.fresh_render_status,
    summary.fresh_engine_health_status,
  ].filter((status) => status !== "fresh").length;
  if (
    summary.missing_fresh_count !== missingFreshCount ||
    summary.real_ready_allowed !== (missingFreshCount === 0) ||
    summary.readiness_state !== (missingFreshCount === 0 ? "ready" : "runtime_waiting") ||
    summary.requirement_status !== (missingFreshCount === 0 ? "fresh_ready" : "runtime_waiting")
  ) {
    throw new ContractError(`${context}: fresh readiness mismatch`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    RUNTIME_PRODUCTION_FRESH_ARTIFACT_REQUIREMENT_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createRuntimeProductionOperatorChecklist({
  itemStatuses = {},
} = {}) {
  const items = RUNTIME_PRODUCTION_OPERATOR_CHECKLIST_DEFAULT_ITEMS.map(
    ([checkLabel, scriptName]) => ({
      schema: "iris_runtime_production_operator_checklist_item_v1",
      check_label: checkLabel,
      safe_script_name: scriptName,
      status: safeOperatorChecklistStatus(itemStatuses[checkLabel]),
    })
  );
  const checklist = {
    schema: "iris_runtime_production_operator_checklist_v1",
    checklist_status: items.every((item) => item.status === "verified")
      ? "verified"
      : "attention",
    item_count: items.length,
    items,
    boundary_policy: Object.fromEntries(
      [...RUNTIME_PRODUCTION_OPERATOR_CHECKLIST_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertRuntimeProductionOperatorChecklistSafe(checklist);
  return checklist;
}

export function assertRuntimeProductionOperatorChecklistSafe(
  checklist,
  context = "runtime production operator checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(checklist, context);
  for (const field of Object.keys(checklist)) {
    if (!RUNTIME_PRODUCTION_OPERATOR_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`);
    }
  }
  if (
    checklist.schema !== "iris_runtime_production_operator_checklist_v1" ||
    !["attention", "verified"].includes(checklist.checklist_status) ||
    checklist.item_count !== RUNTIME_PRODUCTION_OPERATOR_CHECKLIST_DEFAULT_ITEMS.length
  ) {
    throw new ContractError(`${context}: invalid checklist`);
  }
  assertRuntimeProductionOperatorChecklistItemsSafe(checklist.items, context);
  if (
    checklist.checklist_status !==
    (checklist.items.every((item) => item.status === "verified")
      ? "verified"
      : "attention")
  ) {
    throw new ContractError(`${context}: checklist status mismatch`);
  }
  assertBoundaryPolicy(
    checklist.boundary_policy,
    RUNTIME_PRODUCTION_OPERATOR_CHECKLIST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (checklist.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionFinalPreflightChecklistManifest({
  checkStatuses = {},
} = {}) {
  const requiredChecks = PRODUCTION_FINAL_PREFLIGHT_CHECKS.map(
    ([checkLabel, categoryLabel, componentLabel]) => ({
      schema: "iris_production_final_preflight_check_v1",
      check_label: checkLabel,
      category_label: categoryLabel,
      component_label: componentLabel,
      status: safeFinalPreflightCheckStatus(checkStatuses[checkLabel]),
      required_before_real_operation: true,
    })
  );
  const manifest = {
    schema: "iris_production_final_preflight_checklist_manifest_v1",
    manifest_status: requiredChecks.every((check) => check.status === "verified")
      ? "verified"
      : "blocked",
    check_count: requiredChecks.length,
    required_checks: requiredChecks,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_FINAL_PREFLIGHT_CHECKLIST_MANIFEST_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionFinalPreflightChecklistManifestSafe(manifest);
  return manifest;
}

export function assertProductionFinalPreflightChecklistManifestSafe(
  manifest,
  context = "production final preflight checklist manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(manifest, context);
  for (const field of Object.keys(manifest)) {
    if (!PRODUCTION_FINAL_PREFLIGHT_CHECKLIST_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`);
    }
  }
  if (
    manifest.schema !==
      "iris_production_final_preflight_checklist_manifest_v1" ||
    !["blocked", "verified"].includes(manifest.manifest_status) ||
    !Array.isArray(manifest.required_checks) ||
    manifest.check_count !== manifest.required_checks.length ||
    manifest.check_count !== PRODUCTION_FINAL_PREFLIGHT_CHECKS.length
  ) {
    throw new ContractError(`${context}: invalid manifest`);
  }
  const seen = new Set();
  for (const check of manifest.required_checks) {
    assertProductionFinalPreflightCheckSafe(check, context);
    if (seen.has(check.check_label)) {
      throw new ContractError(`${context}: duplicate check`);
    }
    seen.add(check.check_label);
  }
  for (const [checkLabel] of PRODUCTION_FINAL_PREFLIGHT_CHECKS) {
    if (!seen.has(checkLabel)) {
      throw new ContractError(`${context}: missing required check`);
    }
  }
  const expectedStatus = manifest.required_checks.every(
    (check) => check.status === "verified"
  )
    ? "verified"
    : "blocked";
  if (manifest.manifest_status !== expectedStatus) {
    throw new ContractError(`${context}: manifest status mismatch`);
  }
  assertBoundaryPolicy(
    manifest.boundary_policy,
    PRODUCTION_FINAL_PREFLIGHT_CHECKLIST_MANIFEST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (manifest.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionFinalPreflightCheckGrouping({
  manifest = createProductionFinalPreflightChecklistManifest(),
} = {}) {
  assertProductionFinalPreflightChecklistManifestSafe(
    manifest,
    "production final preflight check grouping manifest"
  );
  const groups = [...PRODUCTION_FINAL_PREFLIGHT_CATEGORIES].map(
    (categoryLabel) => {
      const checks = manifest.required_checks.filter(
        (check) => check.category_label === categoryLabel
      );
      const blockerCount = checks.filter(
        (check) => check.status !== "verified"
      ).length;
      return {
        schema: "iris_production_final_preflight_check_group_v1",
        category_label: categoryLabel,
        status: blockerCount > 0 ? "blocked" : "verified",
        check_count: checks.length,
        blocker_count: blockerCount,
      };
    }
  );
  const totalBlockerCount = groups.reduce(
    (sum, group) => sum + group.blocker_count,
    0
  );
  const grouping = {
    schema: "iris_production_final_preflight_check_grouping_v1",
    grouping_status: totalBlockerCount > 0 ? "blocked" : "verified",
    category_count: groups.length,
    groups,
    total_blocker_count: totalBlockerCount,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_FINAL_PREFLIGHT_CHECK_GROUPING_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionFinalPreflightCheckGroupingSafe(grouping);
  return grouping;
}

export function assertProductionFinalPreflightCheckGroupingSafe(
  grouping,
  context = "production final preflight check grouping"
) {
  if (!grouping || typeof grouping !== "object" || Array.isArray(grouping)) {
    throw new ContractError(`${context}: grouping required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(grouping, context);
  for (const field of Object.keys(grouping)) {
    if (!PRODUCTION_FINAL_PREFLIGHT_CHECK_GROUPING_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected grouping field`);
    }
  }
  if (
    grouping.schema !== "iris_production_final_preflight_check_grouping_v1" ||
    !["blocked", "verified"].includes(grouping.grouping_status) ||
    !Array.isArray(grouping.groups) ||
    grouping.category_count !== grouping.groups.length ||
    grouping.category_count !== PRODUCTION_FINAL_PREFLIGHT_CATEGORIES.size
  ) {
    throw new ContractError(`${context}: invalid grouping`);
  }
  const seen = new Set();
  let blockerTotal = 0;
  for (const group of grouping.groups) {
    assertProductionFinalPreflightCheckGroupSafe(group, context);
    if (seen.has(group.category_label)) {
      throw new ContractError(`${context}: duplicate category`);
    }
    seen.add(group.category_label);
    blockerTotal += group.blocker_count;
  }
  for (const categoryLabel of PRODUCTION_FINAL_PREFLIGHT_CATEGORIES) {
    if (!seen.has(categoryLabel)) {
      throw new ContractError(`${context}: missing category`);
    }
  }
  if (
    grouping.total_blocker_count !== blockerTotal ||
    grouping.grouping_status !== (blockerTotal > 0 ? "blocked" : "verified")
  ) {
    throw new ContractError(`${context}: grouping status mismatch`);
  }
  assertBoundaryPolicy(
    grouping.boundary_policy,
    PRODUCTION_FINAL_PREFLIGHT_CHECK_GROUPING_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (grouping.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionFinalPreflightOwnerConfirmation({
  realExternalDeviceStepRequested = true,
  ownerConfirmed = false,
} = {}) {
  const requested = realExternalDeviceStepRequested === true;
  const confirmed = ownerConfirmed === true;
  const required = requested;
  const summary = {
    schema: "iris_production_final_preflight_owner_confirmation_v1",
    confirmation_status:
      required && !confirmed
        ? "owner_confirmation_required"
        : "owner_confirmation_ready",
    real_external_device_step_requested: requested,
    owner_confirmation_required: required,
    owner_confirmed: confirmed,
    production_go_allowed: requested && confirmed,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_FINAL_PREFLIGHT_OWNER_CONFIRMATION_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionFinalPreflightOwnerConfirmationSafe(summary);
  return summary;
}

export function assertProductionFinalPreflightOwnerConfirmationSafe(
  summary,
  context = "production final preflight owner confirmation"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_FINAL_PREFLIGHT_OWNER_CONFIRMATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`);
    }
  }
  if (
    summary.schema !==
      "iris_production_final_preflight_owner_confirmation_v1" ||
    !["owner_confirmation_required", "owner_confirmation_ready"].includes(
      summary.confirmation_status
    ) ||
    typeof summary.real_external_device_step_requested !== "boolean" ||
    typeof summary.owner_confirmation_required !== "boolean" ||
    typeof summary.owner_confirmed !== "boolean" ||
    typeof summary.production_go_allowed !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  if (
    summary.owner_confirmation_required !==
      summary.real_external_device_step_requested ||
    summary.production_go_allowed !==
      (summary.real_external_device_step_requested && summary.owner_confirmed)
  ) {
    throw new ContractError(`${context}: confirmation gate mismatch`);
  }
  if (
    summary.real_external_device_step_requested &&
    !summary.owner_confirmed &&
    summary.confirmation_status !== "owner_confirmation_required"
  ) {
    throw new ContractError(`${context}: owner confirmation must be required`);
  }
  if (
    summary.real_external_device_step_requested &&
    !summary.owner_confirmed &&
    summary.production_go_allowed !== false
  ) {
    throw new ContractError(`${context}: unconfirmed production go blocked`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    PRODUCTION_FINAL_PREFLIGHT_OWNER_CONFIRMATION_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionFinalPreflightAuditReadiness({
  auditTrailReady = false,
} = {}) {
  const ready = auditTrailReady === true;
  const summary = {
    schema: "iris_production_final_preflight_audit_readiness_v1",
    audit_status: ready ? "ready" : "blocked",
    audit_trail_ready: ready,
    production_go_allowed: ready,
    blocker_label: ready ? "none" : "audit_trail_not_ready",
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_FINAL_PREFLIGHT_AUDIT_READINESS_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionFinalPreflightAuditReadinessSafe(summary);
  return summary;
}

export function assertProductionFinalPreflightAuditReadinessSafe(
  summary,
  context = "production final preflight audit readiness"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_FINAL_PREFLIGHT_AUDIT_READINESS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`);
    }
  }
  if (
    summary.schema !== "iris_production_final_preflight_audit_readiness_v1" ||
    !["blocked", "ready"].includes(summary.audit_status) ||
    typeof summary.audit_trail_ready !== "boolean" ||
    typeof summary.production_go_allowed !== "boolean" ||
    !["audit_trail_not_ready", "none"].includes(summary.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  if (
    summary.production_go_allowed !== summary.audit_trail_ready ||
    summary.audit_status !== (summary.audit_trail_ready ? "ready" : "blocked") ||
    summary.blocker_label !==
      (summary.audit_trail_ready ? "none" : "audit_trail_not_ready")
  ) {
    throw new ContractError(`${context}: audit readiness mismatch`);
  }
  if (!summary.audit_trail_ready && summary.production_go_allowed !== false) {
    throw new ContractError(`${context}: audit not ready blocks production go`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    PRODUCTION_FINAL_PREFLIGHT_AUDIT_READINESS_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionFinalPreflightEmergencyStopReadiness({
  emergencyStopConfirmed = false,
} = {}) {
  const confirmed = emergencyStopConfirmed === true;
  const summary = {
    schema: "iris_production_final_preflight_emergency_stop_readiness_v1",
    emergency_stop_status: confirmed ? "ready" : "blocked",
    emergency_stop_confirmed: confirmed,
    production_go_allowed: confirmed,
    blocker_label: confirmed ? "none" : "emergency_stop_not_confirmed",
    boundary_policy: Object.fromEntries(
      [
        ...PRODUCTION_FINAL_PREFLIGHT_EMERGENCY_STOP_READINESS_BOUNDARY_FIELDS,
      ].map((field) => [field, true])
    ),
    adapter_validation_required: true,
  };
  assertProductionFinalPreflightEmergencyStopReadinessSafe(summary);
  return summary;
}

export function assertProductionFinalPreflightEmergencyStopReadinessSafe(
  summary,
  context = "production final preflight emergency stop readiness"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_FINAL_PREFLIGHT_EMERGENCY_STOP_READINESS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`);
    }
  }
  if (
    summary.schema !==
      "iris_production_final_preflight_emergency_stop_readiness_v1" ||
    !["blocked", "ready"].includes(summary.emergency_stop_status) ||
    typeof summary.emergency_stop_confirmed !== "boolean" ||
    typeof summary.production_go_allowed !== "boolean" ||
    !["emergency_stop_not_confirmed", "none"].includes(summary.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  if (
    summary.production_go_allowed !== summary.emergency_stop_confirmed ||
    summary.emergency_stop_status !==
      (summary.emergency_stop_confirmed ? "ready" : "blocked") ||
    summary.blocker_label !==
      (summary.emergency_stop_confirmed
        ? "none"
        : "emergency_stop_not_confirmed")
  ) {
    throw new ContractError(`${context}: emergency stop readiness mismatch`);
  }
  if (
    !summary.emergency_stop_confirmed &&
    summary.production_go_allowed !== false
  ) {
    throw new ContractError(
      `${context}: emergency stop not confirmed blocks production go`
    );
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    PRODUCTION_FINAL_PREFLIGHT_EMERGENCY_STOP_READINESS_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionFinalPreflightSafeExport({
  manifest = createProductionFinalPreflightChecklistManifest(),
  grouping = createProductionFinalPreflightCheckGrouping({ manifest }),
  auditReadiness = createProductionFinalPreflightAuditReadiness(),
  emergencyStopReadiness = createProductionFinalPreflightEmergencyStopReadiness(),
  ownerConfirmation = createProductionFinalPreflightOwnerConfirmation(),
} = {}) {
  assertProductionFinalPreflightChecklistManifestSafe(
    manifest,
    "production final preflight safe export manifest"
  );
  assertProductionFinalPreflightCheckGroupingSafe(
    grouping,
    "production final preflight safe export grouping"
  );
  assertProductionFinalPreflightAuditReadinessSafe(
    auditReadiness,
    "production final preflight safe export audit"
  );
  assertProductionFinalPreflightEmergencyStopReadinessSafe(
    emergencyStopReadiness,
    "production final preflight safe export emergency stop"
  );
  assertProductionFinalPreflightOwnerConfirmationSafe(
    ownerConfirmation,
    "production final preflight safe export owner confirmation"
  );
  const productionGoAllowed =
    manifest.manifest_status === "verified" &&
    grouping.grouping_status === "verified" &&
    auditReadiness.production_go_allowed === true &&
    emergencyStopReadiness.production_go_allowed === true &&
    ownerConfirmation.production_go_allowed === true;
  const blockerCount =
    grouping.total_blocker_count +
    (auditReadiness.production_go_allowed ? 0 : 1) +
    (emergencyStopReadiness.production_go_allowed ? 0 : 1) +
    (ownerConfirmation.production_go_allowed ? 0 : 1);
  const safeExport = {
    schema: "iris_production_final_preflight_safe_export_v1",
    safe_export_status: productionGoAllowed ? "ready" : "blocked",
    manifest_status: manifest.manifest_status,
    grouping_status: grouping.grouping_status,
    audit_status: auditReadiness.audit_status,
    emergency_stop_status: emergencyStopReadiness.emergency_stop_status,
    owner_confirmation_status: ownerConfirmation.confirmation_status,
    blocker_count: blockerCount,
    production_go_allowed: productionGoAllowed,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_FINAL_PREFLIGHT_SAFE_EXPORT_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionFinalPreflightSafeExportSafe(safeExport);
  return safeExport;
}

export function assertProductionFinalPreflightSafeExportSafe(
  safeExport,
  context = "production final preflight safe export"
) {
  if (!safeExport || typeof safeExport !== "object" || Array.isArray(safeExport)) {
    throw new ContractError(`${context}: safe export required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(safeExport, context);
  for (const field of Object.keys(safeExport)) {
    if (!PRODUCTION_FINAL_PREFLIGHT_SAFE_EXPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`);
    }
  }
  if (
    safeExport.schema !== "iris_production_final_preflight_safe_export_v1" ||
    !["blocked", "ready"].includes(safeExport.safe_export_status) ||
    !["blocked", "verified"].includes(safeExport.manifest_status) ||
    !["blocked", "verified"].includes(safeExport.grouping_status) ||
    !["blocked", "ready"].includes(safeExport.audit_status) ||
    !["blocked", "ready"].includes(safeExport.emergency_stop_status) ||
    !["owner_confirmation_required", "owner_confirmation_ready"].includes(
      safeExport.owner_confirmation_status
    ) ||
    !Number.isInteger(safeExport.blocker_count) ||
    safeExport.blocker_count < 0 ||
    typeof safeExport.production_go_allowed !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid safe export`);
  }
  const expectedAllowed =
    safeExport.manifest_status === "verified" &&
    safeExport.grouping_status === "verified" &&
    safeExport.audit_status === "ready" &&
    safeExport.emergency_stop_status === "ready" &&
    safeExport.owner_confirmation_status === "owner_confirmation_ready";
  if (
    safeExport.production_go_allowed !== expectedAllowed ||
    safeExport.safe_export_status !== (expectedAllowed ? "ready" : "blocked")
  ) {
    throw new ContractError(`${context}: safe export status mismatch`);
  }
  if (!expectedAllowed && safeExport.blocker_count < 1) {
    throw new ContractError(`${context}: blocked export requires blocker count`);
  }
  assertBoundaryPolicy(
    safeExport.boundary_policy,
    PRODUCTION_FINAL_PREFLIGHT_SAFE_EXPORT_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (safeExport.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionFinalPreflightFixturePack() {
  const verifiedManifest = createProductionFinalPreflightChecklistManifest({
    checkStatuses: Object.fromEntries(
      createProductionFinalPreflightChecklistManifest().required_checks.map(
        (check) => [check.check_label, "verified"]
      )
    ),
  });
  const verifiedGrouping = createProductionFinalPreflightCheckGrouping({
    manifest: verifiedManifest,
  });
  const fixtures = [
    {
      schema: "iris_production_final_preflight_fixture_v1",
      fixture_label: "missing_confirmation",
      expected_status: "blocked",
      safe_export: createProductionFinalPreflightSafeExport({
        manifest: verifiedManifest,
        grouping: verifiedGrouping,
        auditReadiness: createProductionFinalPreflightAuditReadiness({
          auditTrailReady: true,
        }),
        emergencyStopReadiness:
          createProductionFinalPreflightEmergencyStopReadiness({
            emergencyStopConfirmed: true,
          }),
        ownerConfirmation: createProductionFinalPreflightOwnerConfirmation({
          realExternalDeviceStepRequested: true,
          ownerConfirmed: false,
        }),
      }),
    },
    {
      schema: "iris_production_final_preflight_fixture_v1",
      fixture_label: "audit_blocked",
      expected_status: "blocked",
      safe_export: createProductionFinalPreflightSafeExport({
        manifest: verifiedManifest,
        grouping: verifiedGrouping,
        auditReadiness: createProductionFinalPreflightAuditReadiness({
          auditTrailReady: false,
        }),
        emergencyStopReadiness:
          createProductionFinalPreflightEmergencyStopReadiness({
            emergencyStopConfirmed: true,
          }),
        ownerConfirmation: createProductionFinalPreflightOwnerConfirmation({
          realExternalDeviceStepRequested: true,
          ownerConfirmed: true,
        }),
      }),
    },
    {
      schema: "iris_production_final_preflight_fixture_v1",
      fixture_label: "emergency_stop_blocked",
      expected_status: "blocked",
      safe_export: createProductionFinalPreflightSafeExport({
        manifest: verifiedManifest,
        grouping: verifiedGrouping,
        auditReadiness: createProductionFinalPreflightAuditReadiness({
          auditTrailReady: true,
        }),
        emergencyStopReadiness:
          createProductionFinalPreflightEmergencyStopReadiness({
            emergencyStopConfirmed: false,
          }),
        ownerConfirmation: createProductionFinalPreflightOwnerConfirmation({
          realExternalDeviceStepRequested: true,
          ownerConfirmed: true,
        }),
      }),
    },
    {
      schema: "iris_production_final_preflight_fixture_v1",
      fixture_label: "secret_leak_rejected",
      expected_status: "rejected",
      safe_export: createProductionFinalPreflightSafeExport(),
    },
  ];
  const pack = {
    schema: "iris_production_final_preflight_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_FINAL_PREFLIGHT_FIXTURE_PACK_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionFinalPreflightFixturePackSafe(pack);
  return pack;
}

export function assertProductionFinalPreflightFixturePackSafe(
  pack,
  context = "production final preflight fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!PRODUCTION_FINAL_PREFLIGHT_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_production_final_preflight_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.fixture_count !== pack.fixtures.length ||
    pack.fixture_count !== 4
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const expectedLabels = new Set([
    "missing_confirmation",
    "audit_blocked",
    "emergency_stop_blocked",
    "secret_leak_rejected",
  ]);
  for (const fixture of pack.fixtures) {
    assertProductionFinalPreflightFixtureSafe(fixture, context);
    expectedLabels.delete(fixture.fixture_label);
  }
  if (expectedLabels.size !== 0) {
    throw new ContractError(`${context}: missing fixture coverage`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    PRODUCTION_FINAL_PREFLIGHT_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (pack.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionFinalPreflightReviewHook({
  safeExport = createProductionFinalPreflightSafeExport(),
} = {}) {
  assertProductionFinalPreflightSafeExportSafe(
    safeExport,
    "production final preflight review hook safe export"
  );
  const hook = {
    schema: "iris_production_final_preflight_review_hook_v1",
    review_status:
      safeExport.production_go_allowed === true
        ? "final_preflight_review_ready"
        : "final_preflight_review_blocked",
    review_label: "production_final_preflight_review",
    safe_export_status: safeExport.safe_export_status,
    blocker_count: safeExport.blocker_count,
    code_change_required: false,
    production_go_allowed: safeExport.production_go_allowed,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_FINAL_PREFLIGHT_REVIEW_HOOK_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionFinalPreflightReviewHookSafe(hook);
  return hook;
}

export function assertProductionFinalPreflightReviewHookSafe(
  hook,
  context = "production final preflight review hook"
) {
  if (!hook || typeof hook !== "object" || Array.isArray(hook)) {
    throw new ContractError(`${context}: hook required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(hook, context);
  for (const field of Object.keys(hook)) {
    if (!PRODUCTION_FINAL_PREFLIGHT_REVIEW_HOOK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`);
    }
  }
  if (
    hook.schema !== "iris_production_final_preflight_review_hook_v1" ||
    hook.review_label !== "production_final_preflight_review" ||
    !["final_preflight_review_blocked", "final_preflight_review_ready"].includes(
      hook.review_status
    ) ||
    !["blocked", "ready"].includes(hook.safe_export_status) ||
    !Number.isInteger(hook.blocker_count) ||
    hook.blocker_count < 0 ||
    hook.code_change_required !== false ||
    typeof hook.production_go_allowed !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid hook`);
  }
  const expectedAllowed = hook.safe_export_status === "ready";
  if (
    hook.production_go_allowed !== expectedAllowed ||
    hook.review_status !==
      (expectedAllowed
        ? "final_preflight_review_ready"
        : "final_preflight_review_blocked")
  ) {
    throw new ContractError(`${context}: review status mismatch`);
  }
  if (!expectedAllowed && hook.blocker_count < 1) {
    throw new ContractError(`${context}: blocked review requires blocker count`);
  }
  assertBoundaryPolicy(
    hook.boundary_policy,
    PRODUCTION_FINAL_PREFLIGHT_REVIEW_HOOK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (hook.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createRuntimeProductionConnectorTraceEnvelope({
  traceId = "trace-runtime-production",
  runId = "run-runtime-production",
  component = "worker",
  status = "blocked",
} = {}) {
  const envelope = {
    schema: "iris_runtime_production_connector_trace_envelope_v1",
    trace_id: safeRuntimeProductionTraceId(traceId, "trace-runtime-production"),
    run_id: safeRuntimeProductionTraceId(runId, "run-runtime-production"),
    component: safeRuntimeProductionConnectorComponent(component),
    status: safeRuntimeProductionConnectorStatus(status),
    boundary_policy: Object.fromEntries(
      [...RUNTIME_PRODUCTION_CONNECTOR_TRACE_ENVELOPE_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertRuntimeProductionConnectorTraceEnvelopeSafe(envelope);
  return envelope;
}

export function assertRuntimeProductionConnectorTraceEnvelopeSafe(
  envelope,
  context = "runtime production connector trace envelope"
) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new ContractError(`${context}: envelope required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(envelope, context);
  for (const field of Object.keys(envelope)) {
    if (!RUNTIME_PRODUCTION_CONNECTOR_TRACE_ENVELOPE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected envelope field`);
    }
  }
  if (
    envelope.schema !== "iris_runtime_production_connector_trace_envelope_v1" ||
    !isSafeRuntimeProductionTraceId(envelope.trace_id) ||
    !isSafeRuntimeProductionTraceId(envelope.run_id) ||
    !RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENT_IDS.has(envelope.component) ||
    !SAFE_STAGE_STATUS_PATTERN.test(envelope.status)
  ) {
    throw new ContractError(`${context}: invalid envelope`);
  }
  assertBoundaryPolicy(
    envelope.boundary_policy,
    RUNTIME_PRODUCTION_CONNECTOR_TRACE_ENVELOPE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (envelope.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createRuntimeProductionConnectionDryRun({
  realRuntimeConfirmed = false,
} = {}) {
  const runtimeConfirmed = realRuntimeConfirmed === true;
  const summary = {
    schema: "iris_runtime_production_connection_dry_run_v1",
    dry_run_status: runtimeConfirmed ? "dry_run_ready" : "dry_run_blocked",
    dry_run_result: runtimeConfirmed
      ? "real_residency_confirmed_dry_run_only"
      : "blocked_without_real_residency",
    real_runtime_confirmed: runtimeConfirmed,
    real_connection_attempted: false,
    real_ready_reported: false,
    boundary_policy: Object.fromEntries(
      [...RUNTIME_PRODUCTION_CONNECTION_DRY_RUN_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertRuntimeProductionConnectionDryRunSafe(summary);
  return summary;
}

export function assertRuntimeProductionConnectionDryRunSafe(
  summary,
  context = "runtime production connection dry-run"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: dry-run summary required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!RUNTIME_PRODUCTION_CONNECTION_DRY_RUN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected dry-run field`);
    }
  }
  if (
    summary.schema !== "iris_runtime_production_connection_dry_run_v1" ||
    !["dry_run_blocked", "dry_run_ready"].includes(summary.dry_run_status) ||
    ![
      "blocked_without_real_residency",
      "real_residency_confirmed_dry_run_only",
    ].includes(summary.dry_run_result)
  ) {
    throw new ContractError(`${context}: invalid dry-run summary`);
  }
  if (
    summary.real_connection_attempted !== false ||
    summary.real_ready_reported !== false
  ) {
    throw new ContractError(`${context}: dry-run must not report real connection`);
  }
  if (
    summary.real_runtime_confirmed !== true &&
    (summary.dry_run_status !== "dry_run_blocked" ||
      summary.dry_run_result !== "blocked_without_real_residency")
  ) {
    throw new ContractError(`${context}: unconfirmed runtime must stay blocked`);
  }
  if (
    summary.real_runtime_confirmed === true &&
    (summary.dry_run_status !== "dry_run_ready" ||
      summary.dry_run_result !== "real_residency_confirmed_dry_run_only")
  ) {
    throw new ContractError(`${context}: confirmed runtime dry-run mismatch`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    RUNTIME_PRODUCTION_CONNECTION_DRY_RUN_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createRealReadinessDryRunRoute({
  prerequisites = [],
  realRuntimeConfirmed = false,
} = {}) {
  const runtimeConfirmed = realRuntimeConfirmed === true;
  const statuses = (Array.isArray(prerequisites) ? prerequisites : []).map(
    (item) => ({
      schema: "iris_real_readiness_dry_run_route_prerequisite_v1",
      prerequisite_label: safeRuntimeProductionConnectorComponent(
        item?.prerequisite_label ?? item?.component ?? item?.label
      ),
      status: safePrerequisiteStatus(item?.status),
    })
  );
  const route = {
    schema: "iris_real_readiness_dry_run_route_v1",
    route_id: "real_readiness_dry_run",
    route_status: !runtimeConfirmed
      ? "blocked"
      : statuses.some((item) => item.status !== "ready")
        ? "attention"
        : "dry_run_clear",
    prerequisite_count: statuses.length,
    prerequisite_statuses: statuses,
    real_runtime_confirmed: runtimeConfirmed,
    real_operation_performed: false,
    real_ready_reported: false,
    boundary_policy: Object.fromEntries(
      [...REAL_READINESS_DRY_RUN_ROUTE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRealReadinessDryRunRouteSafe(route);
  return route;
}

export function assertRealReadinessDryRunRouteSafe(
  route,
  context = "real readiness dry-run route"
) {
  if (!route || typeof route !== "object" || Array.isArray(route)) {
    throw new ContractError(`${context}: route is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(route, context);
  for (const field of Object.keys(route)) {
    if (!REAL_READINESS_DRY_RUN_ROUTE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected route field`);
    }
  }
  if (
    route.schema !== "iris_real_readiness_dry_run_route_v1" ||
    route.route_id !== "real_readiness_dry_run" ||
    !["blocked", "attention", "dry_run_clear"].includes(route.route_status)
  ) {
    throw new ContractError(`${context}: invalid route`);
  }
  if (
    !Array.isArray(route.prerequisite_statuses) ||
    route.prerequisite_count !== route.prerequisite_statuses.length
  ) {
    throw new ContractError(`${context}: invalid prerequisites`);
  }
  for (const item of route.prerequisite_statuses) {
    assertRealReadinessDryRunRoutePrerequisiteSafe(item, context);
  }
  const hasAttention = route.prerequisite_statuses.some(
    (item) => item.status !== "ready"
  );
  if (typeof route.real_runtime_confirmed !== "boolean") {
    throw new ContractError(`${context}: invalid runtime confirmation`);
  }
  const expectedRouteStatus = !route.real_runtime_confirmed
    ? "blocked"
    : hasAttention
      ? "attention"
      : "dry_run_clear";
  if (route.route_status !== expectedRouteStatus) {
    throw new ContractError(`${context}: route status mismatch`);
  }
  if (
    route.real_operation_performed !== false ||
    route.real_ready_reported !== false
  ) {
    throw new ContractError(`${context}: dry-run must not perform real operation`);
  }
  assertBoundaryPolicy(
    route.boundary_policy,
    REAL_READINESS_DRY_RUN_ROUTE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (route.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createRealReadinessDryRunFixturePack() {
  const fixtures = [
    {
      schema: "iris_real_readiness_dry_run_fixture_v1",
      fixture_label: "missing",
      expected_route_status: "blocked",
      route: createRealReadinessDryRunRoute({
        realRuntimeConfirmed: false,
        prerequisites: [{ component: "worker", status: "blocked" }],
      }),
    },
    {
      schema: "iris_real_readiness_dry_run_fixture_v1",
      fixture_label: "attention",
      expected_route_status: "attention",
      route: createRealReadinessDryRunRoute({
        realRuntimeConfirmed: true,
        prerequisites: [{ component: "engine", status: "attention" }],
      }),
    },
    {
      schema: "iris_real_readiness_dry_run_fixture_v1",
      fixture_label: "degraded",
      expected_route_status: "attention",
      route: createRealReadinessDryRunRoute({
        realRuntimeConfirmed: true,
        prerequisites: [{ component: "obs", status: "degraded" }],
      }),
    },
    {
      schema: "iris_real_readiness_dry_run_fixture_v1",
      fixture_label: "ready",
      expected_route_status: "dry_run_clear",
      route: createRealReadinessDryRunRoute({
        realRuntimeConfirmed: true,
        prerequisites: [{ component: "adapter", status: "ready" }],
      }),
    },
  ];
  const pack = {
    schema: "iris_real_readiness_dry_run_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...REAL_READINESS_DRY_RUN_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRealReadinessDryRunFixturePackSafe(pack);
  return pack;
}

export function assertRealReadinessDryRunFixturePackSafe(
  pack,
  context = "real readiness dry-run fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!REAL_READINESS_DRY_RUN_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_real_readiness_dry_run_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.fixture_count !== pack.fixtures.length ||
    pack.fixture_count !== 4
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const expectedLabels = new Set(["missing", "attention", "degraded", "ready"]);
  for (const fixture of pack.fixtures) {
    assertRealReadinessDryRunFixtureSafe(fixture, context);
    expectedLabels.delete(fixture.fixture_label);
  }
  if (expectedLabels.size !== 0) {
    throw new ContractError(`${context}: missing fixture coverage`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    REAL_READINESS_DRY_RUN_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (pack.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createRealReadinessDryRunCompletionHook({
  route = createRealReadinessDryRunRoute(),
} = {}) {
  assertRealReadinessDryRunRouteSafe(
    route,
    "real readiness dry-run completion hook route"
  );
  const hook = {
    schema: "iris_real_readiness_dry_run_completion_hook_v1",
    review_status:
      route.route_status === "dry_run_clear"
        ? "dry_run_review_ready"
        : "dry_run_review_attention",
    review_label: "real_readiness_dry_run_completion_review",
    dry_run_route_status: route.route_status,
    real_readiness_status: "not_reported",
    dry_run_only: true,
    real_ready_reported: false,
    boundary_policy: Object.fromEntries(
      [...REAL_READINESS_DRY_RUN_COMPLETION_HOOK_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertRealReadinessDryRunCompletionHookSafe(hook);
  return hook;
}

export function assertRealReadinessDryRunCompletionHookSafe(
  hook,
  context = "real readiness dry-run completion hook"
) {
  if (!hook || typeof hook !== "object" || Array.isArray(hook)) {
    throw new ContractError(`${context}: hook is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(hook, context);
  for (const field of Object.keys(hook)) {
    if (!REAL_READINESS_DRY_RUN_COMPLETION_HOOK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected hook field`);
    }
  }
  if (
    hook.schema !== "iris_real_readiness_dry_run_completion_hook_v1" ||
    hook.review_label !== "real_readiness_dry_run_completion_review" ||
    !["dry_run_review_ready", "dry_run_review_attention"].includes(
      hook.review_status
    ) ||
    !["blocked", "attention", "dry_run_clear"].includes(
      hook.dry_run_route_status
    )
  ) {
    throw new ContractError(`${context}: invalid hook`);
  }
  if (
    hook.real_readiness_status !== "not_reported" ||
    hook.dry_run_only !== true ||
    hook.real_ready_reported !== false
  ) {
    throw new ContractError(`${context}: dry-run must not report real ready`);
  }
  if (
    hook.review_status !==
    (hook.dry_run_route_status === "dry_run_clear"
      ? "dry_run_review_ready"
      : "dry_run_review_attention")
  ) {
    throw new ContractError(`${context}: review status mismatch`);
  }
  assertBoundaryPolicy(
    hook.boundary_policy,
    REAL_READINESS_DRY_RUN_COMPLETION_HOOK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (hook.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertRealReadinessDryRunFixtureSafe(fixture, context) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture is required`);
  }
  for (const field of Object.keys(fixture)) {
    if (!REAL_READINESS_DRY_RUN_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_real_readiness_dry_run_fixture_v1" ||
    !["missing", "attention", "degraded", "ready"].includes(
      fixture.fixture_label
    ) ||
    !["blocked", "attention", "dry_run_clear"].includes(
      fixture.expected_route_status
    )
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  assertRealReadinessDryRunRouteSafe(
    fixture.route,
    `${context}: ${fixture.fixture_label} route`
  );
  if (fixture.route.route_status !== fixture.expected_route_status) {
    throw new ContractError(`${context}: fixture route mismatch`);
  }
  if (
    fixture.fixture_label === "missing" &&
    fixture.route.route_status !== "blocked"
  ) {
    throw new ContractError(`${context}: missing fixture must stay blocked`);
  }
}

function assertRealReadinessDryRunRoutePrerequisiteSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: prerequisite is required`);
  }
  for (const field of Object.keys(item)) {
    if (!REAL_READINESS_DRY_RUN_ROUTE_PREREQUISITE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected prerequisite field`);
    }
  }
  if (
    item.schema !== "iris_real_readiness_dry_run_route_prerequisite_v1" ||
    !RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENT_IDS.has(item.prerequisite_label) ||
    !["ready", "attention", "blocked", "degraded"].includes(item.status)
  ) {
    throw new ContractError(`${context}: invalid prerequisite`);
  }
}

export function createRuntimeProductionAttentionReasonCatalog({
  reasons = null,
} = {}) {
  const entries = (Array.isArray(reasons) && reasons.length > 0
    ? reasons.map((reason) => runtimeProductionAttentionReasonEntry(reason))
    : RUNTIME_PRODUCTION_ATTENTION_REASON_CATALOG.map(
        ([reasonLabel, classification, componentId]) => ({
          schema: "iris_runtime_production_attention_reason_v1",
          reason_label: reasonLabel,
          classification,
          component_id: componentId,
        })
      )
  ).filter(Boolean);
  const dedupedEntries = [...new Map(
    entries.map((entry) => [entry.reason_label, entry])
  ).values()];
  const catalog = {
    schema: "iris_runtime_production_attention_reason_catalog_v1",
    catalog_status: "fixed_label_catalog",
    reason_count: dedupedEntries.length,
    reasons: dedupedEntries,
    boundary_policy: Object.fromEntries(
      [...RUNTIME_PRODUCTION_ATTENTION_REASON_CATALOG_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertRuntimeProductionAttentionReasonCatalogSafe(catalog);
  return catalog;
}

export function assertRuntimeProductionAttentionReasonCatalogSafe(
  catalog,
  context = "runtime production attention reason catalog"
) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new ContractError(`${context}: catalog required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(catalog, context);
  for (const field of Object.keys(catalog)) {
    if (!RUNTIME_PRODUCTION_ATTENTION_REASON_CATALOG_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected catalog field`);
    }
  }
  if (
    catalog.schema !== "iris_runtime_production_attention_reason_catalog_v1" ||
    catalog.catalog_status !== "fixed_label_catalog" ||
    !Array.isArray(catalog.reasons)
  ) {
    throw new ContractError(`${context}: invalid catalog`);
  }
  const seen = new Set();
  for (const reason of catalog.reasons) {
    assertRuntimeProductionAttentionReasonSafe(reason, context);
    if (seen.has(reason.reason_label)) {
      throw new ContractError(`${context}: duplicate reason label`);
    }
    seen.add(reason.reason_label);
  }
  if (catalog.reason_count !== catalog.reasons.length) {
    throw new ContractError(`${context}: reason count mismatch`);
  }
  assertBoundaryPolicy(
    catalog.boundary_policy,
    RUNTIME_PRODUCTION_ATTENTION_REASON_CATALOG_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (catalog.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createRuntimeProductionNoAutoRemediationGuard({
  blockedComponents = [],
  mutationAttempted = false,
} = {}) {
  const components = safeRuntimeProductionBlockedComponents(blockedComponents);
  const blockerDetected = components.length > 0;
  const guard = {
    schema: "iris_runtime_production_no_auto_remediation_guard_v1",
    guard_status:
      blockerDetected || mutationAttempted === true
        ? "operator_action_required"
        : "idle",
    blocker_detected: blockerDetected,
    blocked_component_count: components.length,
    blocked_components: components,
    auto_remediation_allowed: false,
    mutation_attempted: mutationAttempted === true,
    safe_operator_action_required: blockerDetected || mutationAttempted === true,
    boundary_policy: Object.fromEntries(
      [...RUNTIME_PRODUCTION_NO_AUTO_REMEDIATION_GUARD_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertRuntimeProductionNoAutoRemediationGuardSafe(guard);
  return guard;
}

export function assertRuntimeProductionNoAutoRemediationGuardSafe(
  guard,
  context = "runtime production no-auto-remediation guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(guard, context);
  for (const field of Object.keys(guard)) {
    if (!RUNTIME_PRODUCTION_NO_AUTO_REMEDIATION_GUARD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected guard field`);
    }
  }
  if (
    guard.schema !== "iris_runtime_production_no_auto_remediation_guard_v1" ||
    !["idle", "operator_action_required"].includes(guard.guard_status)
  ) {
    throw new ContractError(`${context}: invalid guard`);
  }
  if (
    !Array.isArray(guard.blocked_components) ||
    guard.blocked_components.some(
      (component) => !RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENT_IDS.has(component)
    )
  ) {
    throw new ContractError(`${context}: invalid blocked components`);
  }
  if (
    guard.blocked_component_count !== guard.blocked_components.length ||
    guard.blocker_detected !== (guard.blocked_components.length > 0) ||
    guard.auto_remediation_allowed !== false ||
    typeof guard.mutation_attempted !== "boolean" ||
    guard.safe_operator_action_required !==
      (guard.blocker_detected || guard.mutation_attempted) ||
    guard.guard_status !==
      (guard.safe_operator_action_required ? "operator_action_required" : "idle")
  ) {
    throw new ContractError(`${context}: guard mismatch`);
  }
  assertBoundaryPolicy(
    guard.boundary_policy,
    RUNTIME_PRODUCTION_NO_AUTO_REMEDIATION_GUARD_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (guard.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createRuntimeProductionE2EFixturePack() {
  const componentMatrix = createRuntimeProductionBlockerMatrix({
    componentStates: {
      worker: { status: "blocked", realRuntimeConfirmed: false },
      engine: { status: "attention", realRuntimeConfirmed: true },
      obs: { status: "stale", realRuntimeConfirmed: true },
      db: { status: "blocked", realRuntimeConfirmed: true },
      adapter: { status: "ready", realRuntimeConfirmed: true },
      youtube: { status: "ready", realRuntimeConfirmed: true },
      game: { status: "ready", realRuntimeConfirmed: true },
    },
  });
  const freshArtifactRequirement =
    createRuntimeProductionFreshArtifactRequirement({
      heartbeatStatus: "fresh",
      pickupStatus: "stale",
      renderStatus: "fresh",
      engineHealthStatus: "attention",
    });
  const dryRun = createRuntimeProductionConnectionDryRun({
    realRuntimeConfirmed: false,
  });
  const blockerReasonSummary = createProductionReadinessBlockerReasonSummary({
    reasons: [
      "worker_missing",
      "engine_attention",
      "stale_pickup",
      "db_missing",
      "fixture_only",
    ],
  });
  const pack = {
    schema: "iris_runtime_production_e2e_fixture_pack_v1",
    classification: "BLOCKED",
    ready_allowed: false,
    fixture_mode_status: "fixture_pass_real_blocked",
    worker_status: "missing",
    engine_status: "attention",
    obs_status: "stale",
    db_status: "blocked",
    fixture_status: "fixture_pass",
    blocker_reason_summary: blockerReasonSummary,
    component_matrix: componentMatrix,
    fresh_artifact_requirement: freshArtifactRequirement,
    dry_run_result: dryRun.dry_run_result,
    boundary_policy: Object.fromEntries(
      [...RUNTIME_PRODUCTION_E2E_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRuntimeProductionE2EFixturePackSafe(pack);
  return pack;
}

export function assertRuntimeProductionE2EFixturePackSafe(
  pack,
  context = "runtime production E2E fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!RUNTIME_PRODUCTION_E2E_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_runtime_production_e2e_fixture_pack_v1" ||
    pack.classification !== "BLOCKED" ||
    pack.ready_allowed !== false ||
    pack.fixture_mode_status !== "fixture_pass_real_blocked" ||
    pack.worker_status !== "missing" ||
    pack.engine_status !== "attention" ||
    pack.obs_status !== "stale" ||
    pack.db_status !== "blocked" ||
    pack.fixture_status !== "fixture_pass" ||
    pack.dry_run_result !== "blocked_without_real_residency"
  ) {
    throw new ContractError(`${context}: invalid E2E fixture pack`);
  }
  assertProductionReadinessBlockerReasonSummarySafe(
    pack.blocker_reason_summary,
    `${context}: blocker reasons`
  );
  assertRuntimeProductionBlockerMatrixSafe(
    pack.component_matrix,
    `${context}: component matrix`
  );
  assertRuntimeProductionFreshArtifactRequirementSafe(
    pack.fresh_artifact_requirement,
    `${context}: fresh artifact requirement`
  );
  if (
    pack.component_matrix.matrix_status !== "BLOCKED" ||
    pack.component_matrix.components.find((item) => item.component_id === "worker")
      ?.classification !== "BLOCKED" ||
    pack.component_matrix.components.find((item) => item.component_id === "engine")
      ?.classification !== "attention" ||
    pack.component_matrix.components.find((item) => item.component_id === "obs")
      ?.classification !== "BLOCKED" ||
    pack.component_matrix.components.find((item) => item.component_id === "db")
      ?.classification !== "BLOCKED" ||
    pack.fresh_artifact_requirement.real_ready_allowed !== false
  ) {
    throw new ContractError(`${context}: BLOCKED must be preserved`);
  }
  for (const reason of [
    "worker_missing",
    "engine_attention",
    "stale_pickup",
    "db_missing",
    "fixture_only",
  ]) {
    if (!pack.blocker_reason_summary.reason_labels.includes(reason)) {
      throw new ContractError(`${context}: missing fixture reason`);
    }
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    RUNTIME_PRODUCTION_E2E_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (pack.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createProductionReadinessBatchFixture() {
  const componentSummary = createProductionReadinessComponentDependencyMap({
    localBridgeStatus: "runtime_waiting",
    ttsStatus: "engine_attention",
    live2dStatus: "ready",
    subtitleStatus: "ready",
    obsStatus: "configuration_waiting",
    dbStatus: "configuration_waiting",
    gameStatus: "operator_review_required",
    youtubeStatus: "configuration_waiting",
    overlayPickupStatus: "ready",
  });
  const fixtureSummary = createProductionReadinessFixtureModeLabel({
    fixturePassed: true,
    realRuntimeConfirmed: false,
  });
  const blockerSummary = createProductionReadinessBlockerReasonSummary({
    reasons: ["worker_missing", "engine_attention", "obs_missing", "db_missing", "fixture_only"],
  });
  const classifier = createProductionReadinessBlockerClassifier({
    readinessState: "runtime_waiting",
    status: "engine_attention",
    realRuntimeConfirmed: false,
  });
  const fixture = {
    schema: "iris_production_readiness_batch_fixture_v1",
    classification: classifier.classification,
    ready_allowed: classifier.ready_allowed,
    fixture_status: fixtureSummary.fixture_status,
    real_readiness_status: fixtureSummary.real_readiness_status,
    component_summary: componentSummary,
    blocker_reason_summary: blockerSummary,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_READINESS_BATCH_FIXTURE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertProductionReadinessBatchFixtureSafe(fixture);
  return fixture;
}

export function assertProductionReadinessBatchFixtureSafe(
  fixture,
  context = "production readiness batch fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!PRODUCTION_READINESS_BATCH_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (fixture.schema !== "iris_production_readiness_batch_fixture_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (fixture.classification !== "BLOCKED" || fixture.ready_allowed !== false) {
    throw new ContractError(`${context}: BLOCKED classification must be preserved`);
  }
  if (
    fixture.fixture_status !== "fixture_pass" ||
    fixture.real_readiness_status !== "real_blocked"
  ) {
    throw new ContractError(`${context}: fixture and real readiness must stay split`);
  }
  assertProductionReadinessComponentDependencyMapSafe(
    fixture.component_summary,
    `${context}: component summary`
  );
  assertProductionReadinessBlockerReasonSummarySafe(
    fixture.blocker_reason_summary,
    `${context}: blocker reason summary`
  );
  for (const reason of [
    "worker_missing",
    "engine_attention",
    "obs_missing",
    "db_missing",
    "fixture_only",
  ]) {
    if (!fixture.blocker_reason_summary.reason_labels.includes(reason)) {
      throw new ContractError(`${context}: missing blocker reason`);
    }
  }
  assertBoundaryPolicy(
    fixture.boundary_policy,
    PRODUCTION_READINESS_BATCH_FIXTURE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionE2EBlockerReviewHook({
  fixture = createProductionReadinessBatchFixture(),
} = {}) {
  assertProductionReadinessBatchFixtureSafe(
    fixture,
    "production E2E blocker review hook fixture"
  );
  const blocked = fixture.classification === "BLOCKED" || fixture.ready_allowed === false;
  const blockerLabels = blocked
    ? [...fixture.blocker_reason_summary.reason_labels].map((label) =>
        safeProductionReadinessBlockerReason(label)
      )
    : [];
  const hook = {
    schema: "iris_production_e2e_blocker_review_hook_v1",
    review_status: blocked
      ? "production_blocker_review_required"
      : "no_unresolved_blocker",
    completion_review_label: "production_blocker_completion_review",
    production_blocker_retained: blocked,
    unresolved_blocked_count: blockerLabels.length,
    blocker_labels: blockerLabels,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_E2E_BLOCKER_REVIEW_HOOK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertProductionE2EBlockerReviewHookSafe(hook);
  return hook;
}

export function assertProductionE2EBlockerReviewHookSafe(
  hook,
  context = "production E2E blocker review hook"
) {
  if (!hook || typeof hook !== "object" || Array.isArray(hook)) {
    throw new ContractError(`${context}: hook is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(hook, context);
  for (const field of Object.keys(hook)) {
    if (!PRODUCTION_E2E_BLOCKER_REVIEW_HOOK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected hook field`);
    }
  }
  if (hook.schema !== "iris_production_e2e_blocker_review_hook_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (
    !["production_blocker_review_required", "no_unresolved_blocker"].includes(
      hook.review_status
    )
  ) {
    throw new ContractError(`${context}: invalid review status`);
  }
  if (hook.completion_review_label !== "production_blocker_completion_review") {
    throw new ContractError(`${context}: invalid completion review label`);
  }
  if (typeof hook.production_blocker_retained !== "boolean") {
    throw new ContractError(`${context}: invalid retained flag`);
  }
  if (!Number.isInteger(hook.unresolved_blocked_count) || hook.unresolved_blocked_count < 0) {
    throw new ContractError(`${context}: invalid blocked count`);
  }
  if (!Array.isArray(hook.blocker_labels)) {
    throw new ContractError(`${context}: blocker labels required`);
  }
  for (const label of hook.blocker_labels) {
    if (!PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(label)) {
      throw new ContractError(`${context}: invalid blocker label`);
    }
  }
  if (
    hook.production_blocker_retained !==
      (hook.review_status === "production_blocker_review_required") ||
    hook.unresolved_blocked_count !== hook.blocker_labels.length ||
    (hook.production_blocker_retained && hook.unresolved_blocked_count < 1)
  ) {
    throw new ContractError(`${context}: production blocker must stay in review`);
  }
  assertBoundaryPolicy(
    hook.boundary_policy,
    PRODUCTION_E2E_BLOCKER_REVIEW_HOOK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

function productionReadinessRouteContract({ routeId, inputFields }) {
  return {
    schema: "iris_production_readiness_route_contract_v1",
    route_id: routeId,
    input_fields: inputFields,
    output_fields: PRODUCTION_READINESS_ROUTE_REQUIRED_OUTPUT_FIELDS,
    required_output_fields: PRODUCTION_READINESS_ROUTE_REQUIRED_OUTPUT_FIELDS,
    safe_summary_required: true,
  };
}

function assertProductionReadinessRouteContractSafe(route, context) {
  if (!route || typeof route !== "object" || Array.isArray(route)) {
    throw new ContractError(`${context}: route contract required`);
  }
  for (const field of Object.keys(route)) {
    if (!PRODUCTION_READINESS_ROUTE_CONTRACT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected route contract field`);
    }
  }
  if (route.schema !== "iris_production_readiness_route_contract_v1") {
    throw new ContractError(`${context}: invalid route contract schema`);
  }
  if (!safeGateDetailLabel(route.route_id)) {
    throw new ContractError(`${context}: invalid route id`);
  }
  assertSafeFieldNameList(route.input_fields, context);
  assertSafeFieldNameList(route.output_fields, context);
  assertSafeFieldNameList(route.required_output_fields, context);
  for (const requiredField of PRODUCTION_READINESS_ROUTE_REQUIRED_OUTPUT_FIELDS) {
    if (!route.required_output_fields.includes(requiredField)) {
      throw new ContractError(`${context}: missing required output field`);
    }
  }
  if (route.safe_summary_required !== true) {
    throw new ContractError(`${context}: safe summary required`);
  }
}

function safeProductionReadinessBlockerReason(reason) {
  if (typeof reason !== "string") return "operator_review_required";
  const label = safeGateDetailLabel(reason);
  if (!label || !PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(label)) {
    return "operator_review_required";
  }
  return label;
}

function runtimeProductionAttentionReasonEntry(reason) {
  const label = safeProductionReadinessBlockerReason(
    typeof reason === "string" ? reason : reason?.reason_label
  );
  const catalogEntry = RUNTIME_PRODUCTION_ATTENTION_REASON_CATALOG.find(
    ([reasonLabel]) => reasonLabel === label
  );
  if (!catalogEntry) return null;
  const [, classification, componentId] = catalogEntry;
  return {
    schema: "iris_runtime_production_attention_reason_v1",
    reason_label: label,
    classification,
    component_id: componentId,
  };
}

function assertRuntimeProductionAttentionReasonSafe(reason, context) {
  if (!reason || typeof reason !== "object" || Array.isArray(reason)) {
    throw new ContractError(`${context}: reason required`);
  }
  for (const field of Object.keys(reason)) {
    if (!RUNTIME_PRODUCTION_ATTENTION_REASON_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected reason field`);
    }
  }
  const catalogEntry = RUNTIME_PRODUCTION_ATTENTION_REASON_CATALOG.find(
    ([reasonLabel]) => reasonLabel === reason.reason_label
  );
  if (
    reason.schema !== "iris_runtime_production_attention_reason_v1" ||
    !catalogEntry ||
    reason.classification !== catalogEntry[1] ||
    reason.component_id !== catalogEntry[2]
  ) {
    throw new ContractError(`${context}: invalid reason`);
  }
  if (
    !["BLOCKED", "attention"].includes(reason.classification) ||
    !RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENT_IDS.has(reason.component_id)
  ) {
    throw new ContractError(`${context}: unsafe reason classification`);
  }
}

function safeRuntimeProductionBlockedComponents(components) {
  const source = Array.isArray(components) ? components : [];
  return [
    ...new Set(
      source
        .map((component) =>
          safeRuntimeProductionConnectorComponent(
            typeof component === "string"
              ? component
              : component?.component_id ?? component?.component
          )
        )
        .filter((component) =>
          RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENT_IDS.has(component)
        )
    ),
  ].sort();
}

function safeProductionReadinessMissingComponent(component) {
  const label =
    typeof component === "string"
      ? component
      : component?.component_label ?? component?.component ?? component?.name;
  const safeLabel = safeGateDetailLabel(label);
  if (!safeLabel || !PRODUCTION_READINESS_MISSING_COMPONENT_LABELS.has(safeLabel)) {
    return null;
  }
  return safeLabel;
}

function assertProductionReadinessMissingComponentSafe(component, context) {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    throw new ContractError(`${context}: component is required`);
  }
  for (const field of Object.keys(component)) {
    if (!PRODUCTION_READINESS_MISSING_COMPONENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected component field`);
    }
  }
  if (component.schema !== "iris_production_readiness_missing_component_v1") {
    throw new ContractError(`${context}: invalid component schema`);
  }
  if (!PRODUCTION_READINESS_MISSING_COMPONENT_LABELS.has(component.component_label)) {
    throw new ContractError(`${context}: invalid component label`);
  }
  if (component.status !== "missing") {
    throw new ContractError(`${context}: invalid component status`);
  }
}

function heartbeatAgeBucket(age, threshold) {
  if (age === null) return "missing";
  return age > threshold ? "stale" : "recent";
}

function safeFreshArtifactStatus(status) {
  const label = safeGateDetailLabel(status);
  if (label === "fresh" || label === "ready") return "fresh";
  if (label === "stale" || label === "runtime_waiting") return "stale";
  if (label === "missing" || label === "configuration_waiting") return "missing";
  return "attention";
}

function safeOperatorChecklistStatus(status) {
  const label = safeGateDetailLabel(status);
  return RUNTIME_PRODUCTION_OPERATOR_CHECK_STATUSES.has(label)
    ? label
    : "pending";
}

function safeFinalPreflightCheckStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "verified" ? "verified" : "missing";
}

function assertProductionFinalPreflightCheckSafe(check, context) {
  if (!check || typeof check !== "object" || Array.isArray(check)) {
    throw new ContractError(`${context}: check required`);
  }
  for (const field of Object.keys(check)) {
    if (!PRODUCTION_FINAL_PREFLIGHT_CHECK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected check field`);
    }
  }
  if (
    check.schema !== "iris_production_final_preflight_check_v1" ||
    !PRODUCTION_FINAL_PREFLIGHT_CHECK_LABELS.has(check.check_label) ||
    !PRODUCTION_FINAL_PREFLIGHT_CATEGORIES.has(check.category_label) ||
    !PRODUCTION_FINAL_PREFLIGHT_COMPONENTS.has(check.component_label) ||
    !["missing", "verified"].includes(check.status) ||
    check.required_before_real_operation !== true
  ) {
    throw new ContractError(`${context}: invalid check`);
  }
  const expected = PRODUCTION_FINAL_PREFLIGHT_CHECKS.find(
    ([checkLabel]) => checkLabel === check.check_label
  );
  if (
    !expected ||
    check.category_label !== expected[1] ||
    check.component_label !== expected[2]
  ) {
    throw new ContractError(`${context}: check mapping mismatch`);
  }
}

function assertProductionFinalPreflightCheckGroupSafe(group, context) {
  if (!group || typeof group !== "object" || Array.isArray(group)) {
    throw new ContractError(`${context}: group required`);
  }
  for (const field of Object.keys(group)) {
    if (!PRODUCTION_FINAL_PREFLIGHT_CHECK_GROUP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected group field`);
    }
  }
  if (
    group.schema !== "iris_production_final_preflight_check_group_v1" ||
    !PRODUCTION_FINAL_PREFLIGHT_CATEGORIES.has(group.category_label) ||
    !["blocked", "verified"].includes(group.status) ||
    !Number.isInteger(group.check_count) ||
    group.check_count < 1 ||
    !Number.isInteger(group.blocker_count) ||
    group.blocker_count < 0 ||
    group.blocker_count > group.check_count ||
    group.status !== (group.blocker_count > 0 ? "blocked" : "verified")
  ) {
    throw new ContractError(`${context}: invalid group`);
  }
}

function assertProductionFinalPreflightFixtureSafe(fixture, context) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  for (const field of Object.keys(fixture)) {
    if (!PRODUCTION_FINAL_PREFLIGHT_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_production_final_preflight_fixture_v1" ||
    ![
      "missing_confirmation",
      "audit_blocked",
      "emergency_stop_blocked",
      "secret_leak_rejected",
    ].includes(fixture.fixture_label) ||
    !["blocked", "rejected"].includes(fixture.expected_status)
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  assertProductionFinalPreflightSafeExportSafe(
    fixture.safe_export,
    `${context}: ${fixture.fixture_label} safe export`
  );
  if (
    fixture.fixture_label === "secret_leak_rejected" &&
    fixture.expected_status !== "rejected"
  ) {
    throw new ContractError(`${context}: secret leak fixture must reject`);
  }
  if (
    fixture.fixture_label !== "secret_leak_rejected" &&
    (fixture.expected_status !== fixture.safe_export.safe_export_status ||
      fixture.safe_export.production_go_allowed !== false)
  ) {
    throw new ContractError(`${context}: fixture status mismatch`);
  }
}

function assertRuntimeProductionOperatorChecklistItemsSafe(items, context) {
  if (
    !Array.isArray(items) ||
    items.length !== RUNTIME_PRODUCTION_OPERATOR_CHECKLIST_DEFAULT_ITEMS.length
  ) {
    throw new ContractError(`${context}: invalid checklist items`);
  }
  items.forEach((item, index) => {
    const [expectedLabel, expectedScript] =
      RUNTIME_PRODUCTION_OPERATOR_CHECKLIST_DEFAULT_ITEMS[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ContractError(`${context}: checklist item required`);
    }
    for (const field of Object.keys(item)) {
      if (!RUNTIME_PRODUCTION_OPERATOR_CHECKLIST_ITEM_FIELDS.has(field)) {
        throw new ContractError(`${context}: unexpected checklist item field`);
      }
    }
    if (
      item.schema !== "iris_runtime_production_operator_checklist_item_v1" ||
      item.check_label !== expectedLabel ||
      item.safe_script_name !== expectedScript ||
      !isSafeScriptName(item.safe_script_name) ||
      !RUNTIME_PRODUCTION_OPERATOR_CHECK_STATUSES.has(item.status)
    ) {
      throw new ContractError(`${context}: invalid checklist item`);
    }
  });
}

function safeRuntimeProductionTraceId(value, fallback) {
  const text = String(value ?? fallback)
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
  return isSafeRuntimeProductionTraceId(text) ? text : fallback;
}

function isSafeRuntimeProductionTraceId(value) {
  return (
    typeof value === "string" &&
    /^[a-zA-Z0-9._:-]{1,120}$/.test(value) &&
    !/https?:\/\/|secret|token|endpoint|payload|candidate|command/i.test(value)
  );
}

function safeRuntimeProductionConnectorComponent(component) {
  const label = safeGateDetailLabel(component);
  return RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENT_IDS.has(label)
    ? label
    : "worker";
}

function safeRuntimeProductionConnectorStatus(status) {
  const label = safeGateDetailLabel(status);
  if (label === "ready") return "ready";
  if (label === "degraded") return "degraded";
  if (label === "attention" || label?.includes("attention")) return "attention";
  return "blocked";
}

function safePrerequisiteStatus(status) {
  const label = safeGateDetailLabel(status);
  if (label === "ready") return "ready";
  if (label === "degraded") return "degraded";
  if (label === "attention" || label?.includes("attention")) return "attention";
  return "blocked";
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
  if (
    readinessState === "runtime_waiting" ||
    readinessState === "real_device_waiting" ||
    realRuntimeConfirmed !== true
  ) {
    return "BLOCKED";
  }
  if (status.includes("blocked")) return "BLOCKED";
  if (status.includes("attention")) return "attention";
  if (status.includes("degraded")) return "degraded";
  if (readinessState === "ready") return "ready";
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

function safeRuntimeProductionConnectionStatus(status) {
  const label = safeGateDetailLabel(status) ?? "blocked";
  if (label === "ready") return "blocked";
  if (label.includes("attention")) return "attention";
  if (label.includes("degraded")) return "degraded";
  return label === "blocked" || label.includes("waiting") ? label : "blocked";
}

function assertRuntimeProductionConnectionDependenciesSafe(dependencies, context) {
  if (
    !Array.isArray(dependencies) ||
    dependencies.length !== RUNTIME_PRODUCTION_CONNECTION_COMPONENTS.length
  ) {
    throw new ContractError(`${context}: invalid dependency list`);
  }
  dependencies.forEach((dependency, index) => {
    const [expectedComponent, expectedField] =
      RUNTIME_PRODUCTION_CONNECTION_COMPONENTS[index];
    assertRuntimeProductionConnectionDependencySafe(
      dependency,
      expectedComponent,
      expectedField,
      context
    );
  });
}

function assertRuntimeProductionConnectionDependencySafe(
  dependency,
  expectedComponent,
  expectedField,
  context
) {
  if (!dependency || typeof dependency !== "object" || Array.isArray(dependency)) {
    throw new ContractError(`${context}: dependency required`);
  }
  for (const field of Object.keys(dependency)) {
    if (!RUNTIME_PRODUCTION_CONNECTION_DEPENDENCY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected dependency field`);
    }
  }
  if (
    dependency.schema !== "iris_runtime_production_connection_dependency_v1" ||
    dependency.component_id !== expectedComponent ||
    dependency.required_field !== expectedField ||
    dependency.real_residency_required !== true
  ) {
    throw new ContractError(`${context}: invalid dependency`);
  }
  if (
    !RUNTIME_PRODUCTION_CONNECTION_COMPONENT_IDS.has(dependency.component_id) ||
    !SAFE_STAGE_STATUS_PATTERN.test(dependency.safe_status) ||
    dependency.safe_status === "ready"
  ) {
    throw new ContractError(`${context}: invalid dependency status`);
  }
}

function runtimeProductionBlockerMatrixComponent(componentId, state) {
  const rawStatus =
    typeof state === "string"
      ? state
      : state?.status ?? state?.safe_status ?? state?.readiness_status;
  const inputStatus = safeRuntimeProductionMatrixStatus(rawStatus);
  const realRuntimeConfirmed =
    typeof state === "object" && state?.realRuntimeConfirmed === true;
  const classification = classifyRuntimeProductionMatrixStatus({
    inputStatus,
    realRuntimeConfirmed,
  });
  return {
    schema: "iris_runtime_production_blocker_matrix_component_v1",
    component_id: componentId,
    input_status: inputStatus,
    real_runtime_confirmed: realRuntimeConfirmed,
    classification,
    ready_allowed: classification === "ready",
  };
}

function assertRuntimeProductionBlockerMatrixComponentsSafe(components, context) {
  if (
    !Array.isArray(components) ||
    components.length !== RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENTS.length
  ) {
    throw new ContractError(`${context}: invalid components`);
  }
  components.forEach((component, index) => {
    const expectedComponent = RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENTS[index];
    if (!component || typeof component !== "object" || Array.isArray(component)) {
      throw new ContractError(`${context}: component required`);
    }
    for (const field of Object.keys(component)) {
      if (!RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENT_FIELDS.has(field)) {
        throw new ContractError(`${context}: unexpected component field`);
      }
    }
    if (
      component.schema !== "iris_runtime_production_blocker_matrix_component_v1" ||
      component.component_id !== expectedComponent ||
      !RUNTIME_PRODUCTION_BLOCKER_MATRIX_COMPONENT_IDS.has(component.component_id) ||
      !SAFE_STAGE_STATUS_PATTERN.test(component.input_status) ||
      !PRODUCTION_READINESS_BLOCKER_CLASSIFICATIONS.has(component.classification) ||
      typeof component.real_runtime_confirmed !== "boolean" ||
      component.ready_allowed !== (component.classification === "ready")
    ) {
      throw new ContractError(`${context}: invalid component`);
    }
  });
}

function safeRuntimeProductionMatrixStatus(status) {
  const label = safeGateDetailLabel(status) ?? "blocked";
  if (label === "configured") return "ready";
  if (label === "missing" || label.includes("missing")) return "blocked";
  if (label.includes("stale") || label.includes("waiting")) return "blocked";
  if (label.includes("attention")) return "attention";
  if (label.includes("degraded")) return "degraded";
  if (label === "ready" || label === "blocked") return label;
  return "attention";
}

function classifyRuntimeProductionMatrixStatus({
  inputStatus,
  realRuntimeConfirmed,
}) {
  if (realRuntimeConfirmed !== true) return "BLOCKED";
  if (inputStatus === "blocked") return "BLOCKED";
  if (inputStatus === "attention") return "attention";
  if (inputStatus === "degraded") return "degraded";
  return inputStatus === "ready" ? "ready" : "attention";
}

function assertExactStringList(actual, expected, context) {
  if (
    !Array.isArray(actual) ||
    actual.length !== expected.length ||
    actual.some((item, index) => item !== expected[index])
  ) {
    throw new ContractError(`${context}: list mismatch`);
  }
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

function safeNextActionForProductionBlocker(blockerLabel) {
  const scriptByBlocker = {
    worker_missing: "npm run dev:foundation:startup-checklist",
    engine_attention: "npm run dev:foundation:runtime-status",
    obs_missing: "npm run dev:foundation:live-readiness",
    db_missing: "npm run dev:persistence:live-readiness",
    adapter_attention: "npm run dev:production:probe",
    stale_heartbeat: "npm run dev:production:runtime-handoff-status",
    fixture_only: "npm run dev:production:live-readiness",
  };
  const nextSafeScript = scriptByBlocker[blockerLabel] ?? null;
  return {
    next_safe_script: nextSafeScript,
    operator_action_label: nextSafeScript ? null : "operator_review_required",
  };
}

function safeNextActionLabelForProductionBlocker(blockerLabel) {
  const scriptLabelByBlocker = {
    worker_missing: "dev_foundation_startup_checklist",
    engine_attention: "dev_foundation_runtime_status",
    obs_missing: "dev_foundation_live_readiness",
    db_missing: "dev_persistence_live_readiness",
    adapter_attention: "dev_production_probe",
    stale_heartbeat: "dev_production_runtime_handoff_status",
    fixture_only: "dev_production_live_readiness",
  };
  const nextSafeScriptName = scriptLabelByBlocker[blockerLabel] ?? null;
  return {
    next_safe_script_name: nextSafeScriptName,
    operator_action_label: nextSafeScriptName ? null : "operator_review_required",
  };
}

function productionBlockerLabelsFromInput(blockers) {
  return (Array.isArray(blockers) ? blockers : [])
    .map((blocker) =>
      safeProductionReadinessBlockerReason(
        typeof blocker === "string" ? blocker : blocker?.blocker_label
      )
    )
    .filter(Boolean);
}

function productionBlockerStatusCounts(labels) {
  return labels.reduce(
    (counts, label) => {
      const status = productionBlockerStatus(label);
      counts[status] += 1;
      return counts;
    },
    { blocked: 0, attention: 0 }
  );
}

function productionBlockerStatus(blockerLabel) {
  return ["worker_missing", "obs_missing", "db_missing", "fixture_only"].includes(
    blockerLabel
  )
    ? "blocked"
    : "attention";
}

function isSafeScriptLabel(value) {
  return typeof value === "string" && /^[a-z0-9_]+$/.test(value);
}

function isShellCommandBody(value) {
  return (
    typeof value === "string" &&
    (/\s/.test(value) || /https?:\/\//i.test(value) || /[;&|<>]/.test(value))
  );
}

function assertProductionBlockerStatusCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: status counts required`);
  }
  for (const field of Object.keys(counts)) {
    if (
      !["blocked", "attention"].includes(field) ||
      !Number.isInteger(counts[field]) ||
      counts[field] < 0
    ) {
      throw new ContractError(`${context}: invalid status count`);
    }
  }
}

function assertProductionBlockerLabelsSafe(labels, context) {
  if (
    !Array.isArray(labels) ||
    labels.some((label) => !PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(label))
  ) {
    throw new ContractError(`${context}: invalid blocker labels`);
  }
}

function assertSafeFieldNameList(fields, context) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new ContractError(`${context}: field list required`);
  }
  for (const field of fields) {
    if (
      typeof field !== "string" ||
      !SAFE_STAGE_STATUS_PATTERN.test(field) ||
      FORBIDDEN_PRODUCTION_LIVE_READINESS_FIELDS.has(field)
    ) {
      throw new ContractError(`${context}: unsafe field name`);
    }
  }
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
