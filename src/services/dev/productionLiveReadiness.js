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
const LOCAL_BRIDGE_WORKER_LIVE_CHECK_MANIFEST_FIELDS = new Set([
  "schema",
  "manifest_status",
  "component",
  "worker_required",
  "worker_present",
  "worker_status",
  "live_check_status",
  "production_ready_allowed",
  "required_fields",
  "boundary_policy",
  "adapter_validation_required",
]);
const LOCAL_BRIDGE_WORKER_HEARTBEAT_FRESHNESS_GATE_FIELDS = new Set([
  "schema",
  "gate_status",
  "heartbeat_status",
  "age_bucket",
  "readiness_state",
  "ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const LOCAL_BRIDGE_WORKER_DRY_RUN_STATUS_FIELDS = new Set([
  "schema",
  "dry_run_status",
  "worker_required",
  "worker_presence_status",
  "worker_freshness_status",
  "worker_status",
  "readiness_state",
  "production_ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const LOCAL_BRIDGE_WORKER_NO_FAKE_READY_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "detected_runtime_label",
  "worker_present",
  "live_check_status",
  "production_ready_allowed",
  "expected_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const LOCAL_BRIDGE_WORKER_PUBLIC_SUMMARY_FIELDS = new Set([
  "schema",
  "summary_status",
  "component",
  "worker_status",
  "readiness_state",
  "production_ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const LOCAL_BRIDGE_WORKER_BLOCKER_AGGREGATION_FIELDS = new Set([
  "schema",
  "aggregation_status",
  "component",
  "worker_status",
  "blocker_label",
  "production_blocker",
  "boundary_policy",
  "adapter_validation_required",
]);
const LOCAL_BRIDGE_WORKER_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixture_cases",
  "blocker_aggregation_count",
  "boundary_policy",
  "adapter_validation_required",
]);
const LOCAL_BRIDGE_WORKER_FIXTURE_CASE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "worker_status",
  "expected_result",
  "production_ready_allowed",
  "blocker_label",
  "redaction_status",
]);
const TTS_LIVE_READINESS_CHECKLIST_FIELDS = new Set([
  "schema",
  "checklist_status",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "checks",
  "boundary_policy",
  "adapter_validation_required",
]);
const TTS_LIVE_READINESS_CHECK_FIELDS = new Set([
  "schema",
  "check_label",
  "status",
  "ready_allowed",
]);
const TTS_LIVE_DRY_RUN_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "checklist_status",
  "expected_result",
  "redaction_status",
]);
const TTS_LIVE_DRY_RUN_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE2D_LIVE_READINESS_CHECKLIST_FIELDS = new Set([
  "schema",
  "checklist_status",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "checks",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE2D_LIVE_READINESS_CHECK_FIELDS = new Set([
  "schema",
  "check_label",
  "status",
  "ready_allowed",
]);
const LIVE2D_LIVE_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "checklist_status",
  "expected_result",
  "redaction_status",
]);
const LIVE2D_LIVE_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const SUBTITLE_ENGINE_LIVE_READINESS_CHECKLIST_FIELDS = new Set([
  "schema",
  "checklist_status",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "checks",
  "boundary_policy",
  "adapter_validation_required",
]);
const SUBTITLE_ENGINE_LIVE_READINESS_CHECK_FIELDS = new Set([
  "schema",
  "check_label",
  "status",
  "ready_allowed",
]);
const SUBTITLE_ENGINE_PUBLIC_STATE_FIELDS = new Set([
  "schema",
  "public_state_status",
  "subtitle_status",
  "sync_status",
  "safe_area_status",
  "line_break_status",
  "rtl_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const SUBTITLE_ENGINE_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "checklist_status",
  "expected_result",
  "redaction_status",
]);
const SUBTITLE_ENGINE_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const OBS_LIVE_READINESS_CHECKLIST_FIELDS = new Set([
  "schema",
  "checklist_status",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "checks",
  "boundary_policy",
  "adapter_validation_required",
]);
const OBS_LIVE_READINESS_CHECK_FIELDS = new Set([
  "schema",
  "check_label",
  "status",
  "ready_allowed",
]);
const OBS_LIVE_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "checklist_status",
  "expected_result",
  "redaction_status",
  "confirmation_required",
]);
const OBS_LIVE_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const DB_LIVE_READINESS_CHECKLIST_FIELDS = new Set([
  "schema",
  "checklist_status",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "checks",
  "boundary_policy",
  "adapter_validation_required",
]);
const DB_LIVE_READINESS_CHECK_FIELDS = new Set([
  "schema",
  "check_label",
  "status",
  "ready_allowed",
]);
const DB_LIVE_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "checklist_status",
  "expected_result",
  "redaction_status",
]);
const DB_LIVE_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const YOUTUBE_LIVE_READINESS_CHECKLIST_FIELDS = new Set([
  "schema",
  "checklist_status",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "checks",
  "boundary_policy",
  "adapter_validation_required",
]);
const YOUTUBE_LIVE_READINESS_CHECK_FIELDS = new Set([
  "schema",
  "check_label",
  "status",
  "ready_allowed",
]);
const YOUTUBE_LIVE_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "checklist_status",
  "expected_result",
  "redaction_status",
]);
const YOUTUBE_LIVE_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const GAME_LIVE_READINESS_CHECKLIST_FIELDS = new Set([
  "schema",
  "checklist_status",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "checks",
  "boundary_policy",
  "adapter_validation_required",
]);
const GAME_LIVE_READINESS_CHECK_FIELDS = new Set([
  "schema",
  "check_label",
  "status",
  "ready_allowed",
]);
const GAME_LIVE_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "checklist_status",
  "expected_result",
  "redaction_status",
]);
const GAME_LIVE_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE_PRODUCTION_GO_NO_GO_CLASSIFIER_FIELDS = new Set([
  "schema",
  "classifier_status",
  "component_count",
  "ready_count",
  "blocker_count",
  "component_statuses",
  "owner_confirmation_status",
  "audit_entry_required",
  "audit_entry",
  "production_go_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE_PRODUCTION_GO_NO_GO_COMPONENT_FIELDS = new Set([
  "schema",
  "component_label",
  "status",
  "blocker_present",
]);
const LIVE_PRODUCTION_GO_NO_GO_SAFE_EXPORT_FIELDS = new Set([
  "schema",
  "export_status",
  "classifier_status",
  "component_count",
  "ready_count",
  "blocker_count",
  "component_statuses",
  "production_go_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE_PRODUCTION_GO_NO_GO_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "expected_status",
  "safe_export",
]);
const LIVE_PRODUCTION_GO_NO_GO_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
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
const OPERATOR_CHECKLIST_DAILY_READINESS_SUMMARY_FIELDS = new Set([
  "schema",
  "daily_status",
  "verified_count",
  "attention_count",
  "blocked_count",
  "item_count",
  "next_safe_action_label",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATOR_CHECKLIST_STREAM_START_GATE_FIELDS = new Set([
  "schema",
  "gate_status",
  "start_ready",
  "critical_blocker_count",
  "attention_count",
  "verified_count",
  "next_safe_action_label",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATOR_CHECKLIST_STREAM_END_SUMMARY_FIELDS = new Set([
  "schema",
  "end_status",
  "event_count",
  "support_event_count",
  "moderation_attention_count",
  "archive_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATOR_CHECKLIST_DEGRADED_MODE_RECOMMENDATION_FIELDS = new Set([
  "schema",
  "recommendation_status",
  "degraded_mode_allowed",
  "ready_count",
  "degraded_count",
  "attention_count",
  "blocked_count",
  "component_count",
  "recommendation_label",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATOR_CHECKLIST_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATOR_CHECKLIST_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "expected_status",
  "start_gate",
  "degraded_recommendation",
  "detail_body_rejected",
]);
const LIVE_PRODUCTION_AUDIT_REVIEW_PAGE_FIELDS = new Set([
  "schema",
  "review_status",
  "event_count",
  "recorded_count",
  "blocked_count",
  "required_event_count",
  "missing_required_count",
  "production_go_allowed",
  "safe_events",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE_PRODUCTION_AUDIT_REVIEW_EVENT_FIELDS = new Set([
  "schema",
  "event_label",
  "status",
]);
const LIVE_PRODUCTION_AUDIT_ROLE_GATE_FIELDS = new Set([
  "schema",
  "gate_status",
  "viewer_role",
  "detail_visible",
  "ordinary_view_redacted",
  "safe_detail_count",
  "safe_detail_labels",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE_PRODUCTION_AUDIT_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE_PRODUCTION_AUDIT_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "expected_status",
  "audit_review",
  "role_gate",
  "sensitive_value_rejected",
]);
const PRODUCTION_LIVE_STARTUP_SEQUENCE_MANIFEST_FIELDS = new Set([
  "schema",
  "manifest_status",
  "sequence_count",
  "startup_sequence",
  "real_start_attempted",
  "external_connection_attempted",
  "obs_mutation_attempted",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_LIVE_STARTUP_SEQUENCE_STEP_FIELDS = new Set([
  "schema",
  "order",
  "component_label",
  "prerequisite_labels",
  "safe_status",
  "required_for_live",
]);
const EMERGENCY_STOP_MANIFEST_FIELDS = new Set([
  "schema",
  "manifest_status",
  "component_count",
  "components",
  "real_stop_attempted",
  "fixture_verified",
  "boundary_policy",
  "adapter_validation_required",
]);
const EMERGENCY_STOP_COMPONENT_FIELDS = new Set([
  "schema",
  "component_label",
  "required_status",
  "safe_status",
  "required_for_production",
]);
const EMERGENCY_STOP_DRY_RUN_SAFE_RESULT_FIELDS = new Set([
  "schema",
  "dry_run_status",
  "safe_status",
  "action_label",
  "real_device_signal_sent",
  "bridge_material_emitted",
  "boundary_policy",
  "adapter_validation_required",
]);
const EMERGENCY_STOP_AUDIT_REQUIREMENT_FIELDS = new Set([
  "schema",
  "operation_type",
  "requirement_status",
  "audit_entry_required",
  "audit_entry",
  "boundary_policy",
  "adapter_validation_required",
]);
const EMERGENCY_STOP_SAFE_AUDIT_ENTRY_FIELDS = new Set([
  "schema",
  "actor_role",
  "action_type",
  "safe_target_label",
  "result_status",
  "event_at_ms",
  "payload_stored_in_audit",
]);
const EMERGENCY_STOP_PUBLIC_ORDINARY_VIEW_FIELDS = new Set([
  "schema",
  "view_status",
  "emergency_stop_status",
  "component_count",
  "action_label",
  "ordinary_public_redacted",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_LIVE_PREREQUISITE_CHECKLIST_FIELDS = new Set([
  "schema",
  "checklist_status",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "blocked_check_count",
  "checks",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_LIVE_PREREQUISITE_CHECK_FIELDS = new Set([
  "schema",
  "check_label",
  "component_label",
  "status",
  "safe_label",
]);
const PRODUCTION_LIVE_BLOCKED_UNTIL_CONFIRMED_GATE_FIELDS = new Set([
  "schema",
  "gate_status",
  "owner_confirmed",
  "emergency_stop_confirmed",
  "audit_ready",
  "fresh_heartbeat_confirmed",
  "production_live_ready",
  "blocker_count",
  "blocker_labels",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_LIVE_FIXTURE_VS_REAL_GATE_FIELDS = new Set([
  "schema",
  "gate_status",
  "fixture_pass",
  "real_live_confirmed",
  "production_live_ready",
  "fixture_status",
  "real_live_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_LIVE_STARTUP_DRY_RUN_RESULT_FIELDS = new Set([
  "schema",
  "dry_run_status",
  "safe_status",
  "real_process_started",
  "external_connection_attempted",
  "obs_mutation_attempted",
  "production_live_ready_reported",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_LIVE_COMPONENT_DEPENDENCY_GRAPH_FIELDS = new Set([
  "schema",
  "graph_status",
  "component_count",
  "blocked_component_count",
  "components",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_LIVE_COMPONENT_DEPENDENCY_NODE_FIELDS = new Set([
  "schema",
  "component_label",
  "dependency_labels",
  "safe_status",
  "classification",
  "required_for_live",
]);
const PRODUCTION_LIVE_STALE_DEPENDENCY_GUARD_FIELDS = new Set([
  "schema",
  "guard_status",
  "heartbeat_status",
  "pickup_status",
  "probe_status",
  "production_live_ready",
  "stale_count",
  "attention_labels",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_LIVE_OWNER_CONFIRMATION_ENVELOPE_FIELDS = new Set([
  "schema",
  "confirmation_status",
  "owner_confirmation_required",
  "owner_confirmed",
  "owner_confirmation_pending",
  "safe_status",
  "boundary_policy",
  "adapter_validation_required",
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
const PRODUCTION_LIVE_NO_AUTO_START_GUARD_FIELDS = new Set([
  "schema",
  "guard_status",
  "readiness_result_status",
  "auto_start_allowed",
  "worker_started",
  "engine_started",
  "obs_mutated",
  "db_connected",
  "game_started",
  "next_safe_action_label",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_LIVE_STARTUP_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_LIVE_STARTUP_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "expected_status",
  "safe_gate",
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
const LIVE_READINESS_FINAL_DRY_RUN_ROUTE_FIELDS = new Set([
  "schema",
  "route_id",
  "route_status",
  "prerequisite_count",
  "prerequisite_statuses",
  "real_operation_performed",
  "production_ready_reported",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE_READINESS_FINAL_DRY_RUN_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "expected_status",
  "route",
]);
const LIVE_READINESS_FINAL_DRY_RUN_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE_READINESS_OPERATOR_HANDOFF_PLAN_FIELDS = new Set([
  "schema",
  "plan_status",
  "step_count",
  "steps",
  "real_operation_performed",
  "audit_entry_required",
  "audit_entry",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE_READINESS_OPERATOR_HANDOFF_STEP_FIELDS = new Set([
  "schema",
  "step_label",
  "status",
]);
const LIVE_READINESS_OPERATOR_HANDOFF_AUDIT_ENTRY_FIELDS = new Set([
  "schema",
  "actor_role",
  "action_type",
  "safe_target_label",
  "result_status",
  "event_at_ms",
  "payload_stored_in_audit",
]);
const LIVE_READINESS_OPERATOR_HANDOFF_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "expected_status",
  "confirmation_status",
  "audit_entry_present",
  "safe_plan",
]);
const LIVE_READINESS_OPERATOR_HANDOFF_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE_READINESS_COMPLETION_BLOCKER_CARRYOVER_FIELDS = new Set([
  "schema",
  "review_status",
  "completion_review_label",
  "real_residency_status",
  "production_blocker_retained",
  "unresolved_blocked_count",
  "blocker_labels",
  "production_ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_READINESS_UNRESOLVED_BLOCKER_REPORT_FIELDS = new Set([
  "schema",
  "report_status",
  "real_residency_status",
  "unresolved_blocker_count",
  "blocker_labels",
  "production_ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_READINESS_BLOCKER_RESOLUTION_TRACKING_FIELDS = new Set([
  "schema",
  "tracking_status",
  "resolved_count",
  "unresolved_count",
  "stale_evidence_count",
  "resolved_blocker_labels",
  "unresolved_blocker_labels",
  "fresh_evidence_required",
  "production_ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_READINESS_FALSE_READY_REGRESSION_FIELDS = new Set([
  "schema",
  "regression_status",
  "blocked_fixture_count",
  "false_ready_detected",
  "ready_allowed",
  "blocked_fixture_labels",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_READINESS_UNRESOLVED_BLOCKER_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_READINESS_UNRESOLVED_BLOCKER_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "expected_status",
  "blocker_report",
  "resolution_tracking",
  "sensitive_value_rejected",
]);
const PRODUCTION_LIVE_READINESS_FINAL_REVIEW_HOOK_FIELDS = new Set([
  "schema",
  "review_status",
  "completion_review_label",
  "safe_residual_risk_count",
  "safe_residual_risk_labels",
  "production_ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATIONAL_REHEARSAL_MANIFEST_FIELDS = new Set([
  "schema",
  "manifest_status",
  "rehearsal_count",
  "rehearsals",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATIONAL_REHEARSAL_ENTRY_FIELDS = new Set([
  "schema",
  "rehearsal_label",
  "mode",
  "confirmation_required",
  "status",
  "script_name",
]);
const OPERATIONAL_REHEARSAL_RESULT_FIELDS = new Set([
  "schema",
  "result_status",
  "pass_count",
  "fail_count",
  "stale_count",
  "result_count",
  "freshness_status",
  "fresh_readiness_allowed",
  "script_names",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATIONAL_REHEARSAL_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATIONAL_REHEARSAL_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "expected_status",
  "result_summary",
  "synthetic_only_required",
  "real_external_confirmed",
  "packet_body_rejected",
  "stale_result_rejected",
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
const LOCAL_BRIDGE_WORKER_LIVE_CHECK_MANIFEST_BOUNDARY_FIELDS = new Set([
  "safe_manifest_only",
  "worker_required_before_ready",
  "real_worker_required_for_ready",
  "missing_worker_blocks_ready",
  "safe_status_labels_only",
  "no_readiness_sweetening",
  "bridge_material_values_excluded",
  "no_endpoint_values",
  "no_token_values",
  "no_secret_values",
  "no_path_values",
  "no_commands",
]);
const LOCAL_BRIDGE_WORKER_HEARTBEAT_FRESHNESS_GATE_BOUNDARY_FIELDS = new Set([
  "heartbeat_age_status_bucket_only",
  "stale_heartbeat_not_ready",
  "stale_is_runtime_waiting",
  "safe_status_labels_only",
  "no_raw_bridge_payload_values",
  "no_endpoint_values",
  "no_token_values",
  "no_secret_values",
  "no_commands",
]);
const LOCAL_BRIDGE_WORKER_DRY_RUN_STATUS_BOUNDARY_FIELDS = new Set([
  "dry_run_status_only",
  "worker_required_missing_stale_status_only",
  "real_worker_not_started",
  "raw_bridge_material_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
  "payload_values_excluded",
  "command_values_excluded",
]);
const LOCAL_BRIDGE_WORKER_NO_FAKE_READY_FIXTURE_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "node_repl_not_worker_ready",
  "worker_residency_required",
  "no_readiness_sweetening",
  "safe_status_labels_only",
  "raw_bridge_material_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
  "command_values_excluded",
]);
const LOCAL_BRIDGE_WORKER_PUBLIC_SUMMARY_BOUNDARY_FIELDS = new Set([
  "safe_status_only",
  "public_summary_redacted",
  "raw_payload_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
  "command_values_excluded",
]);
const LOCAL_BRIDGE_WORKER_BLOCKER_AGGREGATION_BOUNDARY_FIELDS = new Set([
  "worker_status_to_production_blocker_only",
  "missing_worker_aggregates_to_blocker",
  "stale_worker_aggregates_to_blocker",
  "attention_worker_aggregates_to_blocker",
  "ready_worker_has_no_blocker",
  "safe_label_count_status_only",
  "raw_bridge_material_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
  "command_values_excluded",
]);
const LOCAL_BRIDGE_WORKER_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "missing_worker_not_ready",
  "stale_worker_not_ready",
  "node_repl_not_worker_ready",
  "bridge_material_leak_rejected",
  "ready_fixture_requires_live_worker",
  "safe_status_labels_only",
  "raw_bridge_material_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
  "command_values_excluded",
]);
const TTS_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS = new Set([
  "safe_checklist_only",
  "engine_health_required",
  "voice_source_required",
  "license_status_required",
  "placeholder_policy_separated",
  "safe_status_labels_only",
  "audio_material_excluded",
  "phoneme_material_excluded",
  "vendor_diagnostic_values_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
]);
const TTS_LIVE_DRY_RUN_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_dry_run_fixture_only",
  "engine_missing_not_ready",
  "license_missing_not_ready",
  "placeholder_not_real_ready",
  "credential_material_leak_rejected",
  "raw_audio_excluded",
  "raw_phoneme_excluded",
  "vendor_diagnostics_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
]);
const LIVE2D_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS = new Set([
  "safe_checklist_only",
  "renderer_health_required",
  "model_configured_status_only",
  "cue_capability_required",
  "recovery_support_required",
  "safe_status_labels_only",
  "renderer_payload_excluded",
  "model_path_values_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
]);
const LIVE2D_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "missing_renderer_not_ready",
  "stale_heartbeat_not_ready",
  "unsupported_cue_rejected",
  "recovery_missing_not_ready",
  "model_material_leak_rejected",
  "renderer_payload_excluded",
  "model_path_values_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
]);
const SUBTITLE_ENGINE_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS = new Set([
  "safe_checklist_only",
  "subtitle_engine_required",
  "sync_source_required",
  "safe_area_required",
  "line_break_required",
  "rtl_support_status_only",
  "safe_status_labels_only",
  "raw_subtitle_material_excluded",
  "memory_reference_values_excluded",
  "candidate_values_excluded",
  "command_values_excluded",
]);
const SUBTITLE_ENGINE_PUBLIC_STATE_BOUNDARY_FIELDS = new Set([
  "public_state_safe_status_only",
  "raw_subtitle_material_excluded",
  "memory_reference_values_excluded",
  "candidate_values_excluded",
  "command_values_excluded",
  "safe_area_status_only",
  "line_break_status_only",
  "rtl_status_only",
]);
const SUBTITLE_ENGINE_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "missing_engine_not_ready",
  "sync_missing_not_ready",
  "raw_cue_leak_rejected",
  "command_contamination_rejected",
  "raw_subtitle_material_excluded",
  "memory_reference_values_excluded",
  "candidate_values_excluded",
  "command_values_excluded",
]);
const OBS_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS = new Set([
  "safe_checklist_only",
  "obs_running_required",
  "browser_source_required",
  "overlay_pickup_required",
  "heartbeat_required",
  "artifact_freshness_required",
  "safe_status_labels_only",
  "obs_link_values_excluded",
  "credential_values_excluded",
  "raw_event_values_excluded",
  "raw_frame_values_excluded",
]);
const OBS_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "missing_obs_not_ready",
  "missing_browser_source_not_ready",
  "stale_pickup_not_ready",
  "obs_link_leak_rejected",
  "unconfirmed_mutation_not_executed",
  "obs_link_values_excluded",
  "credential_values_excluded",
  "raw_event_values_excluded",
  "raw_frame_values_excluded",
  "command_values_excluded",
]);
const DB_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS = new Set([
  "safe_checklist_only",
  "postgres_configured_required",
  "schema_required",
  "index_required",
  "migration_required",
  "backup_required",
  "restore_rehearsal_required",
  "safe_status_labels_only",
  "connection_string_values_excluded",
  "password_values_excluded",
  "host_values_excluded",
  "raw_sql_values_excluded",
]);
const DB_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "no_connection_not_ready",
  "schema_missing_not_ready",
  "migration_pending_not_ready",
  "backup_stale_not_ready",
  "secret_leak_rejected",
  "connection_string_values_excluded",
  "password_values_excluded",
  "host_values_excluded",
  "raw_sql_values_excluded",
]);
const YOUTUBE_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS = new Set([
  "safe_checklist_only",
  "oauth_required",
  "token_freshness_required",
  "live_chat_id_required",
  "polling_required",
  "dedupe_required",
  "moderation_required",
  "safe_status_labels_only",
  "token_values_excluded",
  "api_response_values_excluded",
  "raw_comment_values_excluded",
]);
const YOUTUBE_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "token_expired_not_ready",
  "stale_chat_id_not_ready",
  "moderation_missing_not_ready",
  "raw_api_material_leak_rejected",
  "token_values_excluded",
  "api_response_values_excluded",
  "raw_comment_values_excluded",
  "private_channel_values_excluded",
]);
const GAME_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS = new Set([
  "safe_checklist_only",
  "game_adapter_required",
  "safe_action_map_required",
  "manual_approval_required",
  "emergency_stop_required",
  "cooldown_required",
  "audit_readiness_required",
  "safe_status_labels_only",
  "key_binding_values_excluded",
  "device_command_values_excluded",
  "adapter_input_values_excluded",
]);
const GAME_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "missing_safe_map_not_ready",
  "no_approval_not_ready",
  "no_emergency_stop_not_ready",
  "raw_command_leak_rejected",
  "stale_adapter_not_ready",
  "key_binding_values_excluded",
  "device_command_values_excluded",
  "adapter_input_values_excluded",
]);
const LIVE_PRODUCTION_GO_NO_GO_CLASSIFIER_BOUNDARY_FIELDS = new Set([
  "component_status_count_blocker_only",
  "all_required_components_must_be_ready",
  "unconfirmed_component_blocks_go",
  "no_readiness_sweetening",
  "sensitive_values_excluded",
  "raw_material_values_excluded",
  "device_action_values_excluded",
]);
const LIVE_PRODUCTION_GO_NO_GO_SAFE_EXPORT_BOUNDARY_FIELDS = new Set([
  "component_status_count_blocker_only",
  "safe_export_only",
  "audit_detail_not_exported",
  "owner_detail_not_exported",
  "sensitive_values_excluded",
  "raw_material_values_excluded",
  "device_action_values_excluded",
]);
const LIVE_PRODUCTION_GO_NO_GO_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "all_ready_can_go",
  "owner_missing_not_go",
  "emergency_missing_not_go",
  "component_blocked_not_go",
  "sensitive_leak_rejected",
  "safe_export_only",
  "sensitive_values_excluded",
  "raw_material_values_excluded",
  "device_action_values_excluded",
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
  "worker_attention",
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
  Object.freeze(["worker_attention", "attention", "worker"]),
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
const PRODUCTION_LIVE_STARTUP_SEQUENCE_MANIFEST_BOUNDARY_FIELDS = new Set([
  "safe_manifest_only",
  "safe_component_labels_only",
  "startup_order_only",
  "real_start_not_attempted",
  "external_connection_not_attempted",
  "obs_mutation_not_attempted",
  "no_endpoint_values",
  "no_path_values",
  "no_token_values",
  "no_secret_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
]);
const EMERGENCY_STOP_MANIFEST_BOUNDARY_FIELDS = new Set([
  "safe_manifest_only",
  "safe_component_labels_only",
  "required_status_only",
  "fixture_validation_only",
  "real_stop_not_attempted",
  "device_signal_not_emitted",
  "bridge_material_redacted",
  "endpoint_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
  "job_values_excluded",
  "command_values_excluded",
]);
const EMERGENCY_STOP_DRY_RUN_SAFE_RESULT_BOUNDARY_FIELDS = new Set([
  "dry_run_status_action_label_only",
  "real_device_signal_not_sent",
  "bridge_material_not_emitted",
  "safe_status_only",
  "endpoint_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
  "job_values_excluded",
  "command_values_excluded",
]);
const EMERGENCY_STOP_AUDIT_REQUIREMENT_BOUNDARY_FIELDS = new Set([
  "safe_audit_entry_required",
  "actor_role_action_target_result_timestamp_only",
  "payload_not_stored_in_audit",
  "raw_operator_note_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
  "job_values_excluded",
  "command_values_excluded",
]);
const EMERGENCY_STOP_PUBLIC_ORDINARY_VIEW_BOUNDARY_FIELDS = new Set([
  "safe_status_count_action_label_only",
  "ordinary_public_redacted",
  "raw_command_excluded",
  "endpoint_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
  "job_values_excluded",
  "payload_values_excluded",
]);
const PRODUCTION_LIVE_PREREQUISITE_CHECKLIST_BOUNDARY_FIELDS = new Set([
  "status_check_count_safe_label_only",
  "safe_component_labels_only",
  "endpoint_values_excluded",
  "token_values_excluded",
  "path_values_excluded",
  "secret_values_excluded",
  "payload_values_excluded",
  "candidate_values_excluded",
  "command_values_excluded",
]);
const PRODUCTION_LIVE_BLOCKED_UNTIL_CONFIRMED_GATE_BOUNDARY_FIELDS = new Set([
  "owner_confirmation_required",
  "emergency_stop_required",
  "audit_ready_required",
  "fresh_heartbeat_required",
  "blocked_until_all_confirmed",
  "safe_blocker_labels_only",
  "no_readiness_sweetening",
  "raw_operator_note_excluded",
  "private_token_excluded",
  "endpoint_values_excluded",
  "secret_values_excluded",
  "command_values_excluded",
]);
const PRODUCTION_LIVE_FIXTURE_VS_REAL_GATE_BOUNDARY_FIELDS = new Set([
  "fixture_and_real_live_separated",
  "fixture_pass_not_live_ready",
  "real_live_confirmation_required",
  "safe_status_only",
  "no_readiness_sweetening",
  "endpoint_values_excluded",
  "secret_values_excluded",
  "token_values_excluded",
  "payload_values_excluded",
  "command_values_excluded",
]);
const PRODUCTION_LIVE_STARTUP_DRY_RUN_RESULT_BOUNDARY_FIELDS = new Set([
  "dry_run_status_only",
  "real_process_not_started",
  "external_connection_not_attempted",
  "obs_mutation_not_attempted",
  "live_ready_not_reported",
  "safe_status_only",
  "endpoint_values_excluded",
  "secret_values_excluded",
  "token_values_excluded",
  "payload_values_excluded",
  "command_values_excluded",
]);
const PRODUCTION_LIVE_COMPONENT_DEPENDENCY_GRAPH_BOUNDARY_FIELDS = new Set([
  "safe_component_labels_only",
  "safe_dependency_labels_only",
  "unresolved_dependency_blocks_live",
  "blocked_classification_preserved",
  "safe_status_only",
  "endpoint_values_excluded",
  "secret_values_excluded",
  "token_values_excluded",
  "path_values_excluded",
  "payload_values_excluded",
  "command_values_excluded",
]);
const PRODUCTION_LIVE_STALE_DEPENDENCY_GUARD_BOUNDARY_FIELDS = new Set([
  "stale_heartbeat_not_live_ready",
  "stale_pickup_not_live_ready",
  "stale_probe_not_live_ready",
  "stale_or_attention_status_only",
  "safe_attention_labels_only",
  "raw_probe_result_excluded",
  "raw_payload_values_excluded",
  "endpoint_values_excluded",
  "secret_values_excluded",
  "command_values_excluded",
]);
const PRODUCTION_LIVE_OWNER_CONFIRMATION_ENVELOPE_BOUNDARY_FIELDS = new Set([
  "owner_confirmation_required_confirmed_pending_only",
  "safe_status_only",
  "raw_operator_note_excluded",
  "private_token_excluded",
  "endpoint_values_excluded",
  "secret_values_excluded",
  "payload_values_excluded",
  "command_values_excluded",
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
const PRODUCTION_LIVE_NO_AUTO_START_GUARD_BOUNDARY_FIELDS = new Set([
  "readiness_result_does_not_start_components",
  "no_worker_auto_start",
  "no_engine_auto_start",
  "no_obs_auto_mutation",
  "no_db_auto_connect",
  "no_game_auto_start",
  "safe_next_action_only",
  "endpoint_values_excluded",
  "path_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
  "command_values_excluded",
]);
const PRODUCTION_LIVE_STARTUP_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "missing_worker_covered",
  "missing_obs_covered",
  "stale_tts_covered",
  "owner_unconfirmed_covered",
  "emergency_stop_missing_covered",
  "safe_status_only",
  "endpoint_values_excluded",
  "path_values_excluded",
  "token_values_excluded",
  "secret_values_excluded",
  "command_values_excluded",
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
const LIVE_READINESS_FINAL_DRY_RUN_ROUTE_BOUNDARY_FIELDS = new Set([
  "dry_run_only",
  "safe_prerequisite_status_only",
  "real_operation_not_performed",
  "production_ready_not_reported",
  "sensitive_values_excluded",
  "raw_material_values_excluded",
  "device_action_values_excluded",
]);
const LIVE_READINESS_FINAL_DRY_RUN_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "fixture_pass_real_missing_not_ready",
  "sensitive_leak_rejected",
  "owner_missing_not_ready",
  "dry_run_only",
  "safe_prerequisite_status_only",
  "sensitive_values_excluded",
  "raw_material_values_excluded",
  "device_action_values_excluded",
]);
const LIVE_READINESS_OPERATOR_HANDOFF_PLAN_BOUNDARY_FIELDS = new Set([
  "safe_step_labels_only",
  "operator_handoff_only",
  "real_operation_not_performed",
  "safe_audit_event_required",
  "terminal_body_values_excluded",
  "external_link_values_excluded",
  "credential_values_excluded",
]);
const LIVE_READINESS_OPERATOR_HANDOFF_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "raw_command_leak_rejected",
  "missing_confirmation_not_ready",
  "missing_audit_rejected",
  "safe_plan_verified",
  "safe_step_labels_only",
  "terminal_body_values_excluded",
  "external_link_values_excluded",
  "credential_values_excluded",
]);
const LIVE_READINESS_COMPLETION_BLOCKER_CARRYOVER_BOUNDARY_FIELDS = new Set([
  "completion_review_safe_status_only",
  "real_residency_unconfirmed_retained",
  "blocked_not_promoted_to_ready",
  "safe_blocker_labels_only",
  "counts_only",
  "sensitive_values_excluded",
  "raw_material_values_excluded",
  "device_action_values_excluded",
]);
const OPERATIONAL_REHEARSAL_MANIFEST_BOUNDARY_FIELDS = new Set([
  "safe_rehearsal_manifest_only",
  "synthetic_fixture_default",
  "real_external_service_confirmation_required",
  "script_names_only",
  "real_external_service_not_used",
  "sensitive_values_excluded",
  "raw_material_values_excluded",
  "device_action_values_excluded",
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
const PRODUCTION_LIVE_STARTUP_SEQUENCE = Object.freeze([
  Object.freeze(["local_bridge", []]),
  Object.freeze(["tts", ["local_bridge"]]),
  Object.freeze(["live2d", ["local_bridge"]]),
  Object.freeze(["subtitle", ["tts"]]),
  Object.freeze(["obs", ["local_bridge", "live2d", "subtitle"]]),
  Object.freeze(["db", ["local_bridge"]]),
  Object.freeze(["youtube", ["local_bridge", "db"]]),
  Object.freeze(["game", ["local_bridge", "obs"]]),
]);
const PRODUCTION_LIVE_STARTUP_COMPONENTS = new Set(
  PRODUCTION_LIVE_STARTUP_SEQUENCE.map(([component]) => component)
);
const PRODUCTION_LIVE_STARTUP_STATUSES = new Set([
  "pending",
  "attention",
  "blocked",
  "verified",
]);
const EMERGENCY_STOP_COMPONENTS = Object.freeze([
  Object.freeze(["local_bridge", "stop_ready"]),
  Object.freeze(["tts", "stop_ready"]),
  Object.freeze(["live2d", "stop_ready"]),
  Object.freeze(["subtitle", "stop_ready"]),
  Object.freeze(["obs", "stop_ready"]),
  Object.freeze(["db", "stop_ready"]),
  Object.freeze(["youtube", "stop_ready"]),
  Object.freeze(["game", "stop_ready"]),
]);
const EMERGENCY_STOP_COMPONENT_LABELS = new Set(
  EMERGENCY_STOP_COMPONENTS.map(([component]) => component)
);
const EMERGENCY_STOP_STATUSES = new Set([
  "stop_ready",
  "stop_missing",
  "stop_attention",
]);
const EMERGENCY_STOP_AUDIT_OPERATION_TYPES = new Set([
  "setting",
  "confirmation",
  "dry_run",
]);
const EMERGENCY_STOP_AUDIT_ACTOR_ROLES = new Set([
  "owner",
  "operator",
  "developer",
]);
const EMERGENCY_STOP_AUDIT_RESULT_STATUSES = new Set([
  "recorded",
  "blocked",
]);
const PRODUCTION_LIVE_PREREQUISITE_CHECKS = Object.freeze([
  Object.freeze(["owner_confirmation", "local_bridge"]),
  Object.freeze(["emergency_stop", "game"]),
  Object.freeze(["audit_ready", "db"]),
  Object.freeze(["fresh_heartbeat", "local_bridge"]),
  Object.freeze(["tts_engine_status", "tts"]),
  Object.freeze(["live2d_renderer_status", "live2d"]),
  Object.freeze(["subtitle_pipeline_status", "subtitle"]),
  Object.freeze(["obs_pickup_status", "obs"]),
  Object.freeze(["youtube_ingest_status", "youtube"]),
  Object.freeze(["game_adapter_status", "game"]),
]);
const PRODUCTION_LIVE_PREREQUISITE_CHECK_LABELS = new Set(
  PRODUCTION_LIVE_PREREQUISITE_CHECKS.map(([label]) => label)
);
const PRODUCTION_LIVE_BLOCKER_LABELS = new Set([
  "owner_confirmation_pending",
  "emergency_stop_unconfirmed",
  "audit_not_ready",
  "fresh_heartbeat_unconfirmed",
]);
const PRODUCTION_LIVE_DEPENDENCY_GRAPH = Object.freeze([
  Object.freeze(["bridge", []]),
  Object.freeze(["tts", ["bridge"]]),
  Object.freeze(["live2d", ["bridge"]]),
  Object.freeze(["obs", ["bridge", "live2d"]]),
  Object.freeze(["db", ["bridge"]]),
  Object.freeze(["youtube", ["bridge", "db"]]),
  Object.freeze(["game", ["bridge", "obs"]]),
]);
const PRODUCTION_LIVE_DEPENDENCY_COMPONENTS = new Set(
  PRODUCTION_LIVE_DEPENDENCY_GRAPH.map(([component]) => component)
);
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

export function createOperatorChecklistDailyReadinessSummary({
  itemStatuses = {},
} = {}) {
  const checklist = createRuntimeProductionOperatorChecklist({ itemStatuses });
  const verifiedCount = checklist.items.filter(
    (item) => item.status === "verified"
  ).length;
  const blockedCount = checklist.items.filter(
    (item) => item.status === "blocked"
  ).length;
  const attentionCount = checklist.items.length - verifiedCount - blockedCount;
  const dailyStatus =
    blockedCount > 0
      ? "BLOCKED"
      : attentionCount > 0
        ? "attention"
        : "ready";
  const dailySummary = {
    schema: "iris_operator_checklist_daily_readiness_summary_v1",
    daily_status: dailyStatus,
    verified_count: verifiedCount,
    attention_count: attentionCount,
    blocked_count: blockedCount,
    item_count: checklist.items.length,
    next_safe_action_label:
      dailyStatus === "ready"
        ? "continue_stream_start_checklist"
        : blockedCount > 0
          ? "review_blocked_operator_checks"
          : "continue_operator_checks",
    boundary_policy: {
      status_counts_and_next_action_only: true,
      detail_body_excluded: true,
      sensitive_values_excluded: true,
      command_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertOperatorChecklistDailyReadinessSummarySafe(dailySummary);
  return dailySummary;
}

export function assertOperatorChecklistDailyReadinessSummarySafe(
  dailySummary,
  context = "operator checklist daily readiness summary"
) {
  if (!dailySummary || typeof dailySummary !== "object" || Array.isArray(dailySummary)) {
    throw new ContractError(`${context}: daily summary required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(dailySummary, context);
  for (const field of Object.keys(dailySummary)) {
    if (!OPERATOR_CHECKLIST_DAILY_READINESS_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected daily summary field`);
    }
  }
  if (
    dailySummary.schema !==
      "iris_operator_checklist_daily_readiness_summary_v1" ||
    !["BLOCKED", "attention", "ready"].includes(dailySummary.daily_status) ||
    !Number.isInteger(dailySummary.verified_count) ||
    !Number.isInteger(dailySummary.attention_count) ||
    !Number.isInteger(dailySummary.blocked_count) ||
    !Number.isInteger(dailySummary.item_count) ||
    dailySummary.verified_count < 0 ||
    dailySummary.attention_count < 0 ||
    dailySummary.blocked_count < 0 ||
    dailySummary.item_count !==
      dailySummary.verified_count +
        dailySummary.attention_count +
        dailySummary.blocked_count ||
    dailySummary.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid daily summary`);
  }
  const expectedStatus =
    dailySummary.blocked_count > 0
      ? "BLOCKED"
      : dailySummary.attention_count > 0
        ? "attention"
        : "ready";
  const expectedAction =
    expectedStatus === "ready"
      ? "continue_stream_start_checklist"
      : dailySummary.blocked_count > 0
        ? "review_blocked_operator_checks"
        : "continue_operator_checks";
  if (
    dailySummary.daily_status !== expectedStatus ||
    dailySummary.next_safe_action_label !== expectedAction
  ) {
    throw new ContractError(`${context}: daily summary status mismatch`);
  }
  assertBoundaryPolicy(
    dailySummary.boundary_policy,
    new Set([
      "status_counts_and_next_action_only",
      "detail_body_excluded",
      "sensitive_values_excluded",
      "command_body_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createOperatorChecklistStreamStartGate({
  itemStatuses = {},
} = {}) {
  const dailySummary = createOperatorChecklistDailyReadinessSummary({ itemStatuses });
  const gate = {
    schema: "iris_operator_checklist_stream_start_gate_v1",
    gate_status:
      dailySummary.blocked_count > 0
        ? "BLOCKED"
        : dailySummary.attention_count > 0
          ? "attention"
          : "ready",
    start_ready:
      dailySummary.blocked_count === 0 && dailySummary.attention_count === 0,
    critical_blocker_count: dailySummary.blocked_count,
    attention_count: dailySummary.attention_count,
    verified_count: dailySummary.verified_count,
    next_safe_action_label:
      dailySummary.blocked_count > 0
        ? "resolve_critical_blockers"
        : dailySummary.attention_count > 0
          ? "complete_attention_checks"
          : "continue_operator_confirmation",
    boundary_policy: {
      status_counts_and_next_action_only: true,
      critical_blocker_blocks_start: true,
      detail_body_excluded: true,
      sensitive_values_excluded: true,
      command_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertOperatorChecklistStreamStartGateSafe(gate);
  return gate;
}

export function assertOperatorChecklistStreamStartGateSafe(
  gate,
  context = "operator checklist stream start gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(gate, context);
  for (const field of Object.keys(gate)) {
    if (!OPERATOR_CHECKLIST_STREAM_START_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`);
    }
  }
  if (
    gate.schema !== "iris_operator_checklist_stream_start_gate_v1" ||
    !["BLOCKED", "attention", "ready"].includes(gate.gate_status) ||
    typeof gate.start_ready !== "boolean" ||
    !Number.isInteger(gate.critical_blocker_count) ||
    !Number.isInteger(gate.attention_count) ||
    !Number.isInteger(gate.verified_count) ||
    gate.critical_blocker_count < 0 ||
    gate.attention_count < 0 ||
    gate.verified_count < 0 ||
    gate.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const expectedStatus =
    gate.critical_blocker_count > 0
      ? "BLOCKED"
      : gate.attention_count > 0
        ? "attention"
        : "ready";
  const expectedAction =
    expectedStatus === "BLOCKED"
      ? "resolve_critical_blockers"
      : expectedStatus === "attention"
        ? "complete_attention_checks"
        : "continue_operator_confirmation";
  if (
    gate.gate_status !== expectedStatus ||
    gate.start_ready !==
      (gate.critical_blocker_count === 0 && gate.attention_count === 0) ||
    gate.next_safe_action_label !== expectedAction
  ) {
    throw new ContractError(`${context}: gate status mismatch`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    new Set([
      "status_counts_and_next_action_only",
      "critical_blocker_blocks_start",
      "detail_body_excluded",
      "sensitive_values_excluded",
      "command_body_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createOperatorChecklistStreamEndSummary({
  eventCount = 0,
  supportEventCount = 0,
  moderationAttentionCount = 0,
  archiveStatus = "pending",
} = {}) {
  const endSummary = {
    schema: "iris_operator_checklist_stream_end_summary_v1",
    end_status:
      safeOperatorChecklistStatus(archiveStatus) === "verified"
        ? "verified"
        : "attention",
    event_count: safeNonNegativeCount(eventCount),
    support_event_count: safeNonNegativeCount(supportEventCount),
    moderation_attention_count: safeNonNegativeCount(moderationAttentionCount),
    archive_status: safeOperatorChecklistStatus(archiveStatus),
    boundary_policy: {
      safe_metrics_and_status_only: true,
      comment_body_excluded: true,
      support_body_excluded: true,
      private_identity_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertOperatorChecklistStreamEndSummarySafe(endSummary);
  return endSummary;
}

export function assertOperatorChecklistStreamEndSummarySafe(
  endSummary,
  context = "operator checklist stream end summary"
) {
  if (!endSummary || typeof endSummary !== "object" || Array.isArray(endSummary)) {
    throw new ContractError(`${context}: end summary required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(endSummary, context);
  for (const field of Object.keys(endSummary)) {
    if (!OPERATOR_CHECKLIST_STREAM_END_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected end summary field`);
    }
  }
  if (
    endSummary.schema !== "iris_operator_checklist_stream_end_summary_v1" ||
    !["attention", "verified"].includes(endSummary.end_status) ||
    !Number.isInteger(endSummary.event_count) ||
    !Number.isInteger(endSummary.support_event_count) ||
    !Number.isInteger(endSummary.moderation_attention_count) ||
    endSummary.event_count < 0 ||
    endSummary.support_event_count < 0 ||
    endSummary.moderation_attention_count < 0 ||
    !RUNTIME_PRODUCTION_OPERATOR_CHECK_STATUSES.has(endSummary.archive_status) ||
    endSummary.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid end summary`);
  }
  if (
    endSummary.end_status !==
    (endSummary.archive_status === "verified" ? "verified" : "attention")
  ) {
    throw new ContractError(`${context}: end status mismatch`);
  }
  assertBoundaryPolicy(
    endSummary.boundary_policy,
    new Set([
      "safe_metrics_and_status_only",
      "comment_body_excluded",
      "support_body_excluded",
      "private_identity_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createOperatorChecklistDegradedModeRecommendation({
  componentStatuses = {},
} = {}) {
  const statuses = [...PRODUCTION_LIVE_STARTUP_COMPONENTS].map((component) =>
    safeLiveProductionComponentStatus(componentStatuses[component])
  );
  const readyCount = statuses.filter((status) => status === "ready").length;
  const degradedCount = statuses.filter((status) => status === "degraded").length;
  const attentionCount = statuses.filter((status) => status === "attention").length;
  const blockedCount = statuses.filter((status) => status === "BLOCKED").length;
  const recommendationStatus =
    blockedCount > 0
      ? "BLOCKED"
      : attentionCount > 0
        ? "attention"
        : degradedCount > 0
          ? "degraded_available"
          : "ready";
  const recommendation = {
    schema: "iris_operator_checklist_degraded_mode_recommendation_v1",
    recommendation_status: recommendationStatus,
    degraded_mode_allowed:
      recommendationStatus === "degraded_available" && blockedCount === 0,
    ready_count: readyCount,
    degraded_count: degradedCount,
    attention_count: attentionCount,
    blocked_count: blockedCount,
    component_count: statuses.length,
    recommendation_label:
      recommendationStatus === "degraded_available"
        ? "use_degraded_mode"
        : recommendationStatus === "ready"
          ? "use_normal_mode"
          : recommendationStatus === "attention"
            ? "resolve_attention_first"
            : "resolve_blockers_first",
    boundary_policy: {
      safe_component_status_only: true,
      no_readiness_sweetening: true,
      detail_body_excluded: true,
      sensitive_values_excluded: true,
      command_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertOperatorChecklistDegradedModeRecommendationSafe(recommendation);
  return recommendation;
}

export function assertOperatorChecklistDegradedModeRecommendationSafe(
  recommendation,
  context = "operator checklist degraded mode recommendation"
) {
  if (!recommendation || typeof recommendation !== "object" || Array.isArray(recommendation)) {
    throw new ContractError(`${context}: recommendation required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(recommendation, context);
  for (const field of Object.keys(recommendation)) {
    if (!OPERATOR_CHECKLIST_DEGRADED_MODE_RECOMMENDATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected recommendation field`);
    }
  }
  if (
    recommendation.schema !==
      "iris_operator_checklist_degraded_mode_recommendation_v1" ||
    !["BLOCKED", "attention", "degraded_available", "ready"].includes(
      recommendation.recommendation_status
    ) ||
    typeof recommendation.degraded_mode_allowed !== "boolean" ||
    !Number.isInteger(recommendation.ready_count) ||
    !Number.isInteger(recommendation.degraded_count) ||
    !Number.isInteger(recommendation.attention_count) ||
    !Number.isInteger(recommendation.blocked_count) ||
    recommendation.component_count !== PRODUCTION_LIVE_STARTUP_COMPONENTS.size ||
    recommendation.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid recommendation`);
  }
  const expectedStatus =
    recommendation.blocked_count > 0
      ? "BLOCKED"
      : recommendation.attention_count > 0
        ? "attention"
        : recommendation.degraded_count > 0
          ? "degraded_available"
          : "ready";
  const expectedLabel =
    expectedStatus === "degraded_available"
      ? "use_degraded_mode"
      : expectedStatus === "ready"
        ? "use_normal_mode"
        : expectedStatus === "attention"
          ? "resolve_attention_first"
          : "resolve_blockers_first";
  if (
    recommendation.recommendation_status !== expectedStatus ||
    recommendation.degraded_mode_allowed !==
      (expectedStatus === "degraded_available" &&
        recommendation.blocked_count === 0) ||
    recommendation.recommendation_label !== expectedLabel ||
    recommendation.component_count !==
      recommendation.ready_count +
        recommendation.degraded_count +
        recommendation.attention_count +
        recommendation.blocked_count
  ) {
    throw new ContractError(`${context}: recommendation status mismatch`);
  }
  assertBoundaryPolicy(
    recommendation.boundary_policy,
    new Set([
      "safe_component_status_only",
      "no_readiness_sweetening",
      "detail_body_excluded",
      "sensitive_values_excluded",
      "command_body_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createOperatorChecklistFixturePack() {
  const readyStatuses = {
    local_bridge: "ready",
    tts: "ready",
    live2d: "ready",
    subtitle: "ready",
    obs: "ready",
    db: "ready",
    youtube: "ready",
    game: "ready",
  };
  const fixtures = [
    operatorChecklistFixture({
      fixtureLabel: "blocker_present",
      expectedStatus: "BLOCKED",
      startGate: createOperatorChecklistStreamStartGate({
        itemStatuses: { worker_residency: "blocked" },
      }),
      degradedRecommendation: createOperatorChecklistDegradedModeRecommendation({
        componentStatuses: { ...readyStatuses, db: "missing" },
      }),
    }),
    operatorChecklistFixture({
      fixtureLabel: "degraded_available",
      expectedStatus: "degraded_available",
      startGate: createOperatorChecklistStreamStartGate({
        itemStatuses: {
          worker_residency: "verified",
          engine_health: "verified",
          obs_pickup: "verified",
          db_preflight: "verified",
          adapter_preflight: "verified",
        },
      }),
      degradedRecommendation: createOperatorChecklistDegradedModeRecommendation({
        componentStatuses: { ...readyStatuses, obs: "degraded" },
      }),
    }),
    operatorChecklistFixture({
      fixtureLabel: "detail_leak_rejected",
      expectedStatus: "rejected",
      detailBodyRejected: true,
      startGate: createOperatorChecklistStreamStartGate({
        itemStatuses: { worker_residency: "blocked" },
      }),
      degradedRecommendation: createOperatorChecklistDegradedModeRecommendation({
        componentStatuses: { ...readyStatuses, obs: "degraded" },
      }),
    }),
    operatorChecklistFixture({
      fixtureLabel: "ready",
      expectedStatus: "ready",
      startGate: createOperatorChecklistStreamStartGate({
        itemStatuses: {
          worker_residency: "verified",
          engine_health: "verified",
          obs_pickup: "verified",
          db_preflight: "verified",
          adapter_preflight: "verified",
        },
      }),
      degradedRecommendation: createOperatorChecklistDegradedModeRecommendation({
        componentStatuses: readyStatuses,
      }),
    }),
  ];
  const pack = {
    schema: "iris_operator_checklist_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: {
      safe_status_count_and_next_action_only: true,
      degraded_mode_not_readiness_sweetening: true,
      detail_body_excluded: true,
      sensitive_values_excluded: true,
      command_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertOperatorChecklistFixturePackSafe(pack);
  return pack;
}

export function assertOperatorChecklistFixturePackSafe(
  pack,
  context = "operator checklist fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!OPERATOR_CHECKLIST_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_operator_checklist_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "blocker_present",
    "degraded_available",
    "detail_leak_rejected",
    "ready",
  ]);
  for (const fixture of pack.fixtures) {
    assertOperatorChecklistFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    new Set([
      "safe_status_count_and_next_action_only",
      "degraded_mode_not_readiness_sweetening",
      "detail_body_excluded",
      "sensitive_values_excluded",
      "command_body_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createLiveProductionAuditReviewPage({
  auditEntries = [],
  requiredEventLabels = [],
} = {}) {
  const entries = Array.isArray(auditEntries) ? auditEntries : [];
  const safeEvents = entries.map((entry) => liveProductionAuditReviewEvent(entry));
  const presentLabels = new Set(safeEvents.map((event) => event.event_label));
  const requiredLabels = Array.isArray(requiredEventLabels)
    ? requiredEventLabels.map((label) => safeAuditReviewEventLabel(label))
    : [];
  const missingRequiredEvents = [...new Set(requiredLabels)]
    .filter((label) => !presentLabels.has(label))
    .map((label) => ({
      schema: "iris_live_production_audit_review_event_v1",
      event_label: label,
      status: "missing",
    }));
  safeEvents.push(...missingRequiredEvents);
  const recordedCount = safeEvents.filter(
    (event) => event.status === "recorded"
  ).length;
  const blockedCount = safeEvents.length - recordedCount;
  const reviewPage = {
    schema: "iris_live_production_audit_review_page_v1",
    review_status:
      missingRequiredEvents.length > 0
        ? "BLOCKED"
        : blockedCount === 0
          ? "ready"
          : "attention",
    event_count: safeEvents.length,
    recorded_count: recordedCount,
    blocked_count: blockedCount,
    required_event_count: new Set(requiredLabels).size,
    missing_required_count: missingRequiredEvents.length,
    production_go_allowed: missingRequiredEvents.length === 0 && blockedCount === 0,
    safe_events: safeEvents,
    boundary_policy: {
      safe_events_counts_and_status_only: true,
      missing_required_audit_blocks_go: true,
      packet_body_excluded: true,
      sensitive_values_excluded: true,
      control_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertLiveProductionAuditReviewPageSafe(reviewPage);
  return reviewPage;
}

export function assertLiveProductionAuditReviewPageSafe(
  reviewPage,
  context = "live production audit review page"
) {
  if (!reviewPage || typeof reviewPage !== "object" || Array.isArray(reviewPage)) {
    throw new ContractError(`${context}: review page required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(reviewPage, context);
  for (const field of Object.keys(reviewPage)) {
    if (!LIVE_PRODUCTION_AUDIT_REVIEW_PAGE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected review page field`);
    }
  }
  if (
    reviewPage.schema !== "iris_live_production_audit_review_page_v1" ||
    !["BLOCKED", "attention", "ready"].includes(reviewPage.review_status) ||
    !Number.isInteger(reviewPage.event_count) ||
    !Number.isInteger(reviewPage.recorded_count) ||
    !Number.isInteger(reviewPage.blocked_count) ||
    !Number.isInteger(reviewPage.required_event_count) ||
    !Number.isInteger(reviewPage.missing_required_count) ||
    reviewPage.event_count < 0 ||
    reviewPage.recorded_count < 0 ||
    reviewPage.blocked_count < 0 ||
    reviewPage.required_event_count < 0 ||
    reviewPage.missing_required_count < 0 ||
    reviewPage.missing_required_count > reviewPage.required_event_count ||
    typeof reviewPage.production_go_allowed !== "boolean" ||
    !Array.isArray(reviewPage.safe_events) ||
    reviewPage.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid review page`);
  }
  let recordedCount = 0;
  let missingRequiredCount = 0;
  for (const event of reviewPage.safe_events) {
    assertLiveProductionAuditReviewEventSafe(event, context);
    if (event.status === "recorded") recordedCount += 1;
    if (event.status === "missing") missingRequiredCount += 1;
  }
  if (
    reviewPage.event_count !== reviewPage.safe_events.length ||
    reviewPage.recorded_count !== recordedCount ||
    reviewPage.blocked_count !== reviewPage.event_count - recordedCount ||
    reviewPage.missing_required_count > missingRequiredCount ||
    reviewPage.production_go_allowed !==
      (reviewPage.missing_required_count === 0 && reviewPage.blocked_count === 0) ||
    reviewPage.review_status !==
      (reviewPage.missing_required_count > 0
        ? "BLOCKED"
        : reviewPage.blocked_count === 0
          ? "ready"
          : "attention")
  ) {
    throw new ContractError(`${context}: review page count mismatch`);
  }
  assertBoundaryPolicy(
    reviewPage.boundary_policy,
    new Set([
      "safe_events_counts_and_status_only",
      "missing_required_audit_blocks_go",
      "packet_body_excluded",
      "sensitive_values_excluded",
      "control_body_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createLiveProductionAuditRoleGate({
  viewerRole = "ordinary",
  detailLabels = [],
} = {}) {
  const role =
    viewerRole === "owner" || viewerRole === "operator" ? viewerRole : "ordinary";
  const detailVisible = role === "owner" || role === "operator";
  const safeDetailLabels = (Array.isArray(detailLabels) ? detailLabels : [])
    .map((label) => safeAuditReviewEventLabel(label))
    .filter(Boolean);
  const gate = {
    schema: "iris_live_production_audit_role_gate_v1",
    gate_status: detailVisible ? "detail_visible" : "redacted",
    viewer_role: role,
    detail_visible: detailVisible,
    ordinary_view_redacted: !detailVisible,
    safe_detail_count: safeDetailLabels.length,
    safe_detail_labels: detailVisible ? [...new Set(safeDetailLabels)].sort() : [],
    boundary_policy: {
      owner_operator_detail_role_gated: true,
      ordinary_view_redacted: true,
      safe_detail_labels_only: true,
      packet_body_excluded: true,
      sensitive_values_excluded: true,
      control_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertLiveProductionAuditRoleGateSafe(gate);
  return gate;
}

export function assertLiveProductionAuditRoleGateSafe(
  gate,
  context = "live production audit role gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(gate, context);
  for (const field of Object.keys(gate)) {
    if (!LIVE_PRODUCTION_AUDIT_ROLE_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`);
    }
  }
  if (
    gate.schema !== "iris_live_production_audit_role_gate_v1" ||
    !["detail_visible", "redacted"].includes(gate.gate_status) ||
    !["owner", "operator", "ordinary"].includes(gate.viewer_role) ||
    typeof gate.detail_visible !== "boolean" ||
    typeof gate.ordinary_view_redacted !== "boolean" ||
    !Number.isInteger(gate.safe_detail_count) ||
    gate.safe_detail_count < 0 ||
    !Array.isArray(gate.safe_detail_labels) ||
    gate.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const detailVisible = gate.viewer_role === "owner" || gate.viewer_role === "operator";
  for (const label of gate.safe_detail_labels) {
    assertLiveProductionAuditReviewEventSafe(
      {
        schema: "iris_live_production_audit_review_event_v1",
        event_label: label,
        status: "recorded",
      },
      context
    );
  }
  if (
    gate.gate_status !== (detailVisible ? "detail_visible" : "redacted") ||
    gate.detail_visible !== detailVisible ||
    gate.ordinary_view_redacted !== !detailVisible ||
    (!detailVisible && gate.safe_detail_labels.length !== 0) ||
    (detailVisible && gate.safe_detail_labels.length > gate.safe_detail_count)
  ) {
    throw new ContractError(`${context}: role gate mismatch`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    new Set([
      "owner_operator_detail_role_gated",
      "ordinary_view_redacted",
      "safe_detail_labels_only",
      "packet_body_excluded",
      "sensitive_values_excluded",
      "control_body_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createLiveProductionAuditFixturePack() {
  const fixtures = [
    liveProductionAuditFixture({
      fixtureLabel: "missing_audit",
      expectedStatus: "BLOCKED",
      auditReview: createLiveProductionAuditReviewPage({
        auditEntries: [{ event_label: "emergency_stop", status: "recorded" }],
        requiredEventLabels: ["emergency_stop", "operator_handoff"],
      }),
      roleGate: createLiveProductionAuditRoleGate({
        viewerRole: "ordinary",
        detailLabels: ["operator_handoff"],
      }),
    }),
    liveProductionAuditFixture({
      fixtureLabel: "role_leak",
      expectedStatus: "rejected",
      auditReview: createLiveProductionAuditReviewPage({
        auditEntries: [{ event_label: "operator_handoff", status: "recorded" }],
        requiredEventLabels: ["operator_handoff"],
      }),
      roleGate: createLiveProductionAuditRoleGate({
        viewerRole: "ordinary",
        detailLabels: ["operator_handoff"],
      }),
    }),
    liveProductionAuditFixture({
      fixtureLabel: "sensitive_leak",
      expectedStatus: "rejected",
      sensitiveValueRejected: true,
      auditReview: createLiveProductionAuditReviewPage({
        auditEntries: [{ event_label: "final_preflight", status: "blocked" }],
        requiredEventLabels: ["final_preflight"],
      }),
      roleGate: createLiveProductionAuditRoleGate({
        viewerRole: "owner",
        detailLabels: ["final_preflight"],
      }),
    }),
    liveProductionAuditFixture({
      fixtureLabel: "safe_review",
      expectedStatus: "ready",
      auditReview: createLiveProductionAuditReviewPage({
        auditEntries: [
          { event_label: "emergency_stop", status: "recorded" },
          { event_label: "operator_handoff", status: "recorded" },
        ],
        requiredEventLabels: ["emergency_stop", "operator_handoff"],
      }),
      roleGate: createLiveProductionAuditRoleGate({
        viewerRole: "operator",
        detailLabels: ["emergency_stop", "operator_handoff"],
      }),
    }),
  ];
  const pack = {
    schema: "iris_live_production_audit_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: {
      missing_audit_blocks_go: true,
      owner_operator_detail_role_gated: true,
      packet_body_excluded: true,
      sensitive_values_excluded: true,
      control_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertLiveProductionAuditFixturePackSafe(pack);
  return pack;
}

export function assertLiveProductionAuditFixturePackSafe(
  pack,
  context = "live production audit fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!LIVE_PRODUCTION_AUDIT_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_live_production_audit_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "missing_audit",
    "role_leak",
    "sensitive_leak",
    "safe_review",
  ]);
  for (const fixture of pack.fixtures) {
    assertLiveProductionAuditFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    new Set([
      "missing_audit_blocks_go",
      "owner_operator_detail_role_gated",
      "packet_body_excluded",
      "sensitive_values_excluded",
      "control_body_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createProductionLiveStartupSequenceManifest({
  componentStatuses = {},
} = {}) {
  const startupSequence = PRODUCTION_LIVE_STARTUP_SEQUENCE.map(
    ([componentLabel, prerequisiteLabels], index) => ({
      schema: "iris_production_live_startup_sequence_step_v1",
      order: index + 1,
      component_label: componentLabel,
      prerequisite_labels: prerequisiteLabels,
      safe_status: safeProductionLiveStartupStatus(
        componentStatuses[componentLabel]
      ),
      required_for_live: true,
    })
  );
  const manifest = {
    schema: "iris_production_live_startup_sequence_manifest_v1",
    manifest_status: startupSequence.every(
      (step) => step.safe_status === "verified"
    )
      ? "verified"
      : "blocked",
    sequence_count: startupSequence.length,
    startup_sequence: startupSequence,
    real_start_attempted: false,
    external_connection_attempted: false,
    obs_mutation_attempted: false,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_LIVE_STARTUP_SEQUENCE_MANIFEST_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionLiveStartupSequenceManifestSafe(manifest);
  return manifest;
}

export function assertProductionLiveStartupSequenceManifestSafe(
  manifest,
  context = "production live startup sequence manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(manifest, context);
  for (const field of Object.keys(manifest)) {
    if (!PRODUCTION_LIVE_STARTUP_SEQUENCE_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`);
    }
  }
  if (
    manifest.schema !== "iris_production_live_startup_sequence_manifest_v1" ||
    !["blocked", "verified"].includes(manifest.manifest_status) ||
    !Array.isArray(manifest.startup_sequence) ||
    manifest.sequence_count !== manifest.startup_sequence.length ||
    manifest.sequence_count !== PRODUCTION_LIVE_STARTUP_SEQUENCE.length ||
    manifest.real_start_attempted !== false ||
    manifest.external_connection_attempted !== false ||
    manifest.obs_mutation_attempted !== false ||
    manifest.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid manifest`);
  }
  const seen = new Set();
  manifest.startup_sequence.forEach((step, index) => {
    const [expectedComponent, expectedPrerequisites] =
      PRODUCTION_LIVE_STARTUP_SEQUENCE[index];
    assertProductionLiveStartupSequenceStepSafe(
      step,
      expectedComponent,
      expectedPrerequisites,
      index + 1,
      context
    );
    if (seen.has(step.component_label)) {
      throw new ContractError(`${context}: duplicate component`);
    }
    seen.add(step.component_label);
  });
  const expectedStatus = manifest.startup_sequence.every(
    (step) => step.safe_status === "verified"
  )
    ? "verified"
    : "blocked";
  if (manifest.manifest_status !== expectedStatus) {
    throw new ContractError(`${context}: manifest status mismatch`);
  }
  assertBoundaryPolicy(
    manifest.boundary_policy,
    PRODUCTION_LIVE_STARTUP_SEQUENCE_MANIFEST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createEmergencyStopManifest({ componentStatuses = {} } = {}) {
  const components = EMERGENCY_STOP_COMPONENTS.map(
    ([componentLabel, requiredStatus]) => ({
      schema: "iris_emergency_stop_component_requirement_v1",
      component_label: componentLabel,
      required_status: requiredStatus,
      safe_status: safeEmergencyStopStatus(componentStatuses[componentLabel]),
      required_for_production: true,
    })
  );
  const verified = components.every(
    (component) => component.safe_status === component.required_status
  );
  const manifest = {
    schema: "iris_emergency_stop_manifest_v1",
    manifest_status: verified ? "verified" : "blocked",
    component_count: components.length,
    components,
    real_stop_attempted: false,
    fixture_verified: true,
    boundary_policy: Object.fromEntries(
      [...EMERGENCY_STOP_MANIFEST_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertEmergencyStopManifestSafe(manifest);
  return manifest;
}

export function assertEmergencyStopManifestSafe(
  manifest,
  context = "emergency stop manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(manifest, context);
  for (const field of Object.keys(manifest)) {
    if (!EMERGENCY_STOP_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`);
    }
  }
  if (
    manifest.schema !== "iris_emergency_stop_manifest_v1" ||
    !["blocked", "verified"].includes(manifest.manifest_status) ||
    !Array.isArray(manifest.components) ||
    manifest.component_count !== manifest.components.length ||
    manifest.component_count !== EMERGENCY_STOP_COMPONENTS.length ||
    manifest.real_stop_attempted !== false ||
    manifest.fixture_verified !== true ||
    manifest.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid manifest`);
  }
  const seen = new Set();
  manifest.components.forEach((component, index) => {
    const [expectedComponent, expectedRequiredStatus] =
      EMERGENCY_STOP_COMPONENTS[index];
    assertEmergencyStopComponentSafe(
      component,
      expectedComponent,
      expectedRequiredStatus,
      context
    );
    if (seen.has(component.component_label)) {
      throw new ContractError(`${context}: duplicate component`);
    }
    seen.add(component.component_label);
  });
  const expectedStatus = manifest.components.every(
    (component) => component.safe_status === component.required_status
  )
    ? "verified"
    : "blocked";
  if (manifest.manifest_status !== expectedStatus) {
    throw new ContractError(`${context}: manifest status mismatch`);
  }
  assertBoundaryPolicy(
    manifest.boundary_policy,
    EMERGENCY_STOP_MANIFEST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createEmergencyStopDryRunSafeResult({
  emergencyStopReady = false,
} = {}) {
  const ready = emergencyStopReady === true;
  const result = {
    schema: "iris_emergency_stop_dry_run_safe_result_v1",
    dry_run_status: ready ? "dry_run_ready" : "dry_run_blocked",
    safe_status: ready ? "ready" : "blocked",
    action_label: ready
      ? "emergency_stop_dry_run_verified"
      : "emergency_stop_verification_required",
    real_device_signal_sent: false,
    bridge_material_emitted: false,
    boundary_policy: Object.fromEntries(
      [...EMERGENCY_STOP_DRY_RUN_SAFE_RESULT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertEmergencyStopDryRunSafeResultSafe(result);
  return result;
}

export function assertEmergencyStopDryRunSafeResultSafe(
  result,
  context = "emergency stop dry-run safe result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: dry-run result required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(result, context);
  for (const field of Object.keys(result)) {
    if (!EMERGENCY_STOP_DRY_RUN_SAFE_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected dry-run result field`);
    }
  }
  if (
    result.schema !== "iris_emergency_stop_dry_run_safe_result_v1" ||
    !["dry_run_blocked", "dry_run_ready"].includes(result.dry_run_status) ||
    !["blocked", "ready"].includes(result.safe_status) ||
    ![
      "emergency_stop_dry_run_verified",
      "emergency_stop_verification_required",
    ].includes(result.action_label) ||
    result.real_device_signal_sent !== false ||
    result.bridge_material_emitted !== false ||
    result.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid dry-run result`);
  }
  const ready = result.safe_status === "ready";
  if (
    result.dry_run_status !== (ready ? "dry_run_ready" : "dry_run_blocked") ||
    result.action_label !==
      (ready
        ? "emergency_stop_dry_run_verified"
        : "emergency_stop_verification_required")
  ) {
    throw new ContractError(`${context}: dry-run status mismatch`);
  }
  assertBoundaryPolicy(
    result.boundary_policy,
    EMERGENCY_STOP_DRY_RUN_SAFE_RESULT_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createEmergencyStopAuditRequirement({
  operationType = "dry_run",
  actorRole = "operator",
  resultStatus = "recorded",
  eventAtMs = 0,
} = {}) {
  const safeOperationType = EMERGENCY_STOP_AUDIT_OPERATION_TYPES.has(
    operationType
  )
    ? operationType
    : "dry_run";
  const safeActorRole = EMERGENCY_STOP_AUDIT_ACTOR_ROLES.has(actorRole)
    ? actorRole
    : "operator";
  const safeResultStatus = EMERGENCY_STOP_AUDIT_RESULT_STATUSES.has(resultStatus)
    ? resultStatus
    : "blocked";
  const requirement = {
    schema: "iris_emergency_stop_audit_requirement_v1",
    operation_type: safeOperationType,
    requirement_status:
      safeResultStatus === "recorded" ? "audit_recorded" : "audit_blocked",
    audit_entry_required: true,
    audit_entry: {
      schema: "iris_emergency_stop_safe_audit_entry_v1",
      actor_role: safeActorRole,
      action_type: `emergency_stop_${safeOperationType}`,
      safe_target_label: "emergency_stop_control",
      result_status: safeResultStatus,
      event_at_ms: safeTimestampMs(eventAtMs),
      payload_stored_in_audit: false,
    },
    boundary_policy: Object.fromEntries(
      [...EMERGENCY_STOP_AUDIT_REQUIREMENT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertEmergencyStopAuditRequirementSafe(requirement);
  return requirement;
}

export function assertEmergencyStopAuditRequirementSafe(
  requirement,
  context = "emergency stop audit requirement"
) {
  if (
    !requirement ||
    typeof requirement !== "object" ||
    Array.isArray(requirement)
  ) {
    throw new ContractError(`${context}: requirement required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(requirement, context);
  for (const field of Object.keys(requirement)) {
    if (!EMERGENCY_STOP_AUDIT_REQUIREMENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected requirement field`);
    }
  }
  if (
    requirement.schema !== "iris_emergency_stop_audit_requirement_v1" ||
    !EMERGENCY_STOP_AUDIT_OPERATION_TYPES.has(requirement.operation_type) ||
    !["audit_recorded", "audit_blocked"].includes(
      requirement.requirement_status
    ) ||
    requirement.audit_entry_required !== true ||
    requirement.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid requirement`);
  }
  assertEmergencyStopSafeAuditEntrySafe(
    requirement.audit_entry,
    requirement.operation_type,
    context
  );
  const expectedStatus =
    requirement.audit_entry.result_status === "recorded"
      ? "audit_recorded"
      : "audit_blocked";
  if (requirement.requirement_status !== expectedStatus) {
    throw new ContractError(`${context}: audit requirement status mismatch`);
  }
  assertBoundaryPolicy(
    requirement.boundary_policy,
    EMERGENCY_STOP_AUDIT_REQUIREMENT_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createEmergencyStopPublicOrdinaryView({
  manifest = createEmergencyStopManifest(),
  dryRunResult = createEmergencyStopDryRunSafeResult(),
} = {}) {
  assertEmergencyStopManifestSafe(
    manifest,
    "emergency stop public ordinary view manifest"
  );
  assertEmergencyStopDryRunSafeResultSafe(
    dryRunResult,
    "emergency stop public ordinary view dry-run result"
  );
  const blocked =
    manifest.manifest_status !== "verified" ||
    dryRunResult.safe_status !== "ready";
  const view = {
    schema: "iris_emergency_stop_public_ordinary_view_v1",
    view_status: blocked ? "blocked" : "ready",
    emergency_stop_status: manifest.manifest_status,
    component_count: manifest.component_count,
    action_label: dryRunResult.action_label,
    ordinary_public_redacted: true,
    boundary_policy: Object.fromEntries(
      [...EMERGENCY_STOP_PUBLIC_ORDINARY_VIEW_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertEmergencyStopPublicOrdinaryViewSafe(view);
  return view;
}

export function assertEmergencyStopPublicOrdinaryViewSafe(
  view,
  context = "emergency stop public ordinary view"
) {
  if (!view || typeof view !== "object" || Array.isArray(view)) {
    throw new ContractError(`${context}: view required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(view, context);
  for (const field of Object.keys(view)) {
    if (!EMERGENCY_STOP_PUBLIC_ORDINARY_VIEW_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected view field`);
    }
  }
  if (
    view.schema !== "iris_emergency_stop_public_ordinary_view_v1" ||
    !["blocked", "ready"].includes(view.view_status) ||
    !["blocked", "verified"].includes(view.emergency_stop_status) ||
    !Number.isInteger(view.component_count) ||
    view.component_count !== EMERGENCY_STOP_COMPONENTS.length ||
    ![
      "emergency_stop_dry_run_verified",
      "emergency_stop_verification_required",
    ].includes(view.action_label) ||
    view.ordinary_public_redacted !== true ||
    view.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid view`);
  }
  const expectedStatus =
    view.emergency_stop_status === "verified" &&
    view.action_label === "emergency_stop_dry_run_verified"
      ? "ready"
      : "blocked";
  if (view.view_status !== expectedStatus) {
    throw new ContractError(`${context}: view status mismatch`);
  }
  assertBoundaryPolicy(
    view.boundary_policy,
    EMERGENCY_STOP_PUBLIC_ORDINARY_VIEW_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionLivePrerequisiteChecklist({
  checkStatuses = {},
} = {}) {
  const checks = PRODUCTION_LIVE_PREREQUISITE_CHECKS.map(
    ([checkLabel, componentLabel]) => {
      const status = safeProductionLivePrerequisiteStatus(
        checkStatuses[checkLabel]
      );
      return {
        schema: "iris_production_live_prerequisite_check_v1",
        check_label: checkLabel,
        component_label: componentLabel,
        status,
        safe_label: `${componentLabel}_${status}`,
      };
    }
  );
  const readyCount = checks.filter((check) => check.status === "ready").length;
  const attentionCount = checks.filter(
    (check) => check.status === "attention"
  ).length;
  const blockedCount = checks.filter((check) => check.status === "blocked").length;
  const checklist = {
    schema: "iris_production_live_prerequisite_checklist_v1",
    checklist_status:
      blockedCount > 0 ? "blocked" : attentionCount > 0 ? "attention" : "ready",
    check_count: checks.length,
    ready_check_count: readyCount,
    attention_check_count: attentionCount,
    blocked_check_count: blockedCount,
    checks,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_LIVE_PREREQUISITE_CHECKLIST_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionLivePrerequisiteChecklistSafe(checklist);
  return checklist;
}

export function assertProductionLivePrerequisiteChecklistSafe(
  checklist,
  context = "production live prerequisite checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(checklist, context);
  for (const field of Object.keys(checklist)) {
    if (!PRODUCTION_LIVE_PREREQUISITE_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`);
    }
  }
  if (
    checklist.schema !== "iris_production_live_prerequisite_checklist_v1" ||
    !["ready", "attention", "blocked"].includes(checklist.checklist_status) ||
    !Array.isArray(checklist.checks) ||
    checklist.check_count !== checklist.checks.length ||
    checklist.check_count !== PRODUCTION_LIVE_PREREQUISITE_CHECKS.length ||
    checklist.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid checklist`);
  }
  const seen = new Set();
  let readyCount = 0;
  let attentionCount = 0;
  let blockedCount = 0;
  checklist.checks.forEach((check, index) => {
    const [expectedCheckLabel, expectedComponentLabel] =
      PRODUCTION_LIVE_PREREQUISITE_CHECKS[index];
    assertProductionLivePrerequisiteCheckSafe(
      check,
      expectedCheckLabel,
      expectedComponentLabel,
      context
    );
    if (seen.has(check.check_label)) {
      throw new ContractError(`${context}: duplicate check`);
    }
    seen.add(check.check_label);
    if (check.status === "ready") readyCount += 1;
    if (check.status === "attention") attentionCount += 1;
    if (check.status === "blocked") blockedCount += 1;
  });
  if (
    checklist.ready_check_count !== readyCount ||
    checklist.attention_check_count !== attentionCount ||
    checklist.blocked_check_count !== blockedCount ||
    checklist.checklist_status !==
      (blockedCount > 0 ? "blocked" : attentionCount > 0 ? "attention" : "ready")
  ) {
    throw new ContractError(`${context}: checklist status mismatch`);
  }
  assertBoundaryPolicy(
    checklist.boundary_policy,
    PRODUCTION_LIVE_PREREQUISITE_CHECKLIST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionLiveBlockedUntilConfirmedGate({
  ownerConfirmed = false,
  emergencyStopConfirmed = false,
  auditReady = false,
  freshHeartbeatConfirmed = false,
} = {}) {
  const blockers = [];
  if (ownerConfirmed !== true) blockers.push("owner_confirmation_pending");
  if (emergencyStopConfirmed !== true) {
    blockers.push("emergency_stop_unconfirmed");
  }
  if (auditReady !== true) blockers.push("audit_not_ready");
  if (freshHeartbeatConfirmed !== true) {
    blockers.push("fresh_heartbeat_unconfirmed");
  }
  const ready = blockers.length === 0;
  const gate = {
    schema: "iris_production_live_blocked_until_confirmed_gate_v1",
    gate_status: ready ? "ready" : "blocked",
    owner_confirmed: ownerConfirmed === true,
    emergency_stop_confirmed: emergencyStopConfirmed === true,
    audit_ready: auditReady === true,
    fresh_heartbeat_confirmed: freshHeartbeatConfirmed === true,
    production_live_ready: ready,
    blocker_count: blockers.length,
    blocker_labels: blockers,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_LIVE_BLOCKED_UNTIL_CONFIRMED_GATE_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionLiveBlockedUntilConfirmedGateSafe(gate);
  return gate;
}

export function assertProductionLiveBlockedUntilConfirmedGateSafe(
  gate,
  context = "production live blocked-until-confirmed gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(gate, context);
  for (const field of Object.keys(gate)) {
    if (!PRODUCTION_LIVE_BLOCKED_UNTIL_CONFIRMED_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`);
    }
  }
  if (
    gate.schema !== "iris_production_live_blocked_until_confirmed_gate_v1" ||
    !["blocked", "ready"].includes(gate.gate_status) ||
    typeof gate.owner_confirmed !== "boolean" ||
    typeof gate.emergency_stop_confirmed !== "boolean" ||
    typeof gate.audit_ready !== "boolean" ||
    typeof gate.fresh_heartbeat_confirmed !== "boolean" ||
    typeof gate.production_live_ready !== "boolean" ||
    !Number.isInteger(gate.blocker_count) ||
    gate.blocker_count < 0 ||
    !Array.isArray(gate.blocker_labels) ||
    gate.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const expectedBlockers = [];
  if (!gate.owner_confirmed) expectedBlockers.push("owner_confirmation_pending");
  if (!gate.emergency_stop_confirmed) {
    expectedBlockers.push("emergency_stop_unconfirmed");
  }
  if (!gate.audit_ready) expectedBlockers.push("audit_not_ready");
  if (!gate.fresh_heartbeat_confirmed) {
    expectedBlockers.push("fresh_heartbeat_unconfirmed");
  }
  assertExactStringList(
    gate.blocker_labels,
    expectedBlockers,
    `${context}: blocker labels`
  );
  for (const blocker of gate.blocker_labels) {
    if (!PRODUCTION_LIVE_BLOCKER_LABELS.has(blocker)) {
      throw new ContractError(`${context}: invalid blocker label`);
    }
  }
  const expectedReady = expectedBlockers.length === 0;
  if (
    gate.blocker_count !== expectedBlockers.length ||
    gate.production_live_ready !== expectedReady ||
    gate.gate_status !== (expectedReady ? "ready" : "blocked")
  ) {
    throw new ContractError(`${context}: gate status mismatch`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    PRODUCTION_LIVE_BLOCKED_UNTIL_CONFIRMED_GATE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionLiveFixtureVsRealGate({
  fixturePass = false,
  realLiveConfirmed = false,
} = {}) {
  const fixturePassed = fixturePass === true;
  const realConfirmed = realLiveConfirmed === true;
  const gate = {
    schema: "iris_production_live_fixture_vs_real_gate_v1",
    gate_status: realConfirmed ? "ready" : "blocked",
    fixture_pass: fixturePassed,
    real_live_confirmed: realConfirmed,
    production_live_ready: realConfirmed,
    fixture_status: fixturePassed ? "fixture_pass" : "fixture_attention",
    real_live_status: realConfirmed ? "real_live_confirmed" : "real_live_blocked",
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_LIVE_FIXTURE_VS_REAL_GATE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertProductionLiveFixtureVsRealGateSafe(gate);
  return gate;
}

export function assertProductionLiveFixtureVsRealGateSafe(
  gate,
  context = "production live fixture-vs-real gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(gate, context);
  for (const field of Object.keys(gate)) {
    if (!PRODUCTION_LIVE_FIXTURE_VS_REAL_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`);
    }
  }
  if (
    gate.schema !== "iris_production_live_fixture_vs_real_gate_v1" ||
    !["blocked", "ready"].includes(gate.gate_status) ||
    typeof gate.fixture_pass !== "boolean" ||
    typeof gate.real_live_confirmed !== "boolean" ||
    typeof gate.production_live_ready !== "boolean" ||
    !["fixture_pass", "fixture_attention"].includes(gate.fixture_status) ||
    !["real_live_blocked", "real_live_confirmed"].includes(gate.real_live_status) ||
    gate.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  if (
    gate.fixture_status !==
      (gate.fixture_pass ? "fixture_pass" : "fixture_attention") ||
    gate.real_live_status !==
      (gate.real_live_confirmed ? "real_live_confirmed" : "real_live_blocked") ||
    gate.production_live_ready !== gate.real_live_confirmed ||
    gate.gate_status !== (gate.real_live_confirmed ? "ready" : "blocked")
  ) {
    throw new ContractError(`${context}: fixture and real live status mismatch`);
  }
  if (gate.fixture_pass && !gate.real_live_confirmed && gate.production_live_ready) {
    throw new ContractError(`${context}: fixture pass cannot imply live ready`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    PRODUCTION_LIVE_FIXTURE_VS_REAL_GATE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionLiveStartupDryRunResult({
  prerequisitesReady = false,
} = {}) {
  const safeStatus = prerequisitesReady === true ? "ready" : "blocked";
  const result = {
    schema: "iris_production_live_startup_dry_run_result_v1",
    dry_run_status: safeStatus === "ready" ? "dry_run_ready" : "dry_run_blocked",
    safe_status: safeStatus,
    real_process_started: false,
    external_connection_attempted: false,
    obs_mutation_attempted: false,
    production_live_ready_reported: false,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_LIVE_STARTUP_DRY_RUN_RESULT_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionLiveStartupDryRunResultSafe(result);
  return result;
}

export function assertProductionLiveStartupDryRunResultSafe(
  result,
  context = "production live startup dry-run result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(result, context);
  for (const field of Object.keys(result)) {
    if (!PRODUCTION_LIVE_STARTUP_DRY_RUN_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected result field`);
    }
  }
  if (
    result.schema !== "iris_production_live_startup_dry_run_result_v1" ||
    !["dry_run_blocked", "dry_run_ready"].includes(result.dry_run_status) ||
    !["blocked", "ready"].includes(result.safe_status) ||
    result.real_process_started !== false ||
    result.external_connection_attempted !== false ||
    result.obs_mutation_attempted !== false ||
    result.production_live_ready_reported !== false ||
    result.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid dry-run result`);
  }
  if (
    result.dry_run_status !==
    (result.safe_status === "ready" ? "dry_run_ready" : "dry_run_blocked")
  ) {
    throw new ContractError(`${context}: dry-run status mismatch`);
  }
  assertBoundaryPolicy(
    result.boundary_policy,
    PRODUCTION_LIVE_STARTUP_DRY_RUN_RESULT_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionLiveComponentDependencyGraph({
  componentStatuses = {},
} = {}) {
  const components = PRODUCTION_LIVE_DEPENDENCY_GRAPH.map(
    ([componentLabel, dependencyLabels]) => {
      const safeStatus = safeProductionLiveDependencyStatus(
        componentStatuses[componentLabel]
      );
      return {
        schema: "iris_production_live_component_dependency_node_v1",
        component_label: componentLabel,
        dependency_labels: dependencyLabels,
        safe_status: safeStatus,
        classification: safeStatus === "ready" ? "ready" : "BLOCKED",
        required_for_live: true,
      };
    }
  );
  const blockedCount = components.filter(
    (component) => component.classification === "BLOCKED"
  ).length;
  const graph = {
    schema: "iris_production_live_component_dependency_graph_v1",
    graph_status: blockedCount > 0 ? "BLOCKED" : "ready",
    component_count: components.length,
    blocked_component_count: blockedCount,
    components,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_LIVE_COMPONENT_DEPENDENCY_GRAPH_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionLiveComponentDependencyGraphSafe(graph);
  return graph;
}

export function assertProductionLiveComponentDependencyGraphSafe(
  graph,
  context = "production live component dependency graph"
) {
  if (!graph || typeof graph !== "object" || Array.isArray(graph)) {
    throw new ContractError(`${context}: graph required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(graph, context);
  for (const field of Object.keys(graph)) {
    if (!PRODUCTION_LIVE_COMPONENT_DEPENDENCY_GRAPH_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected graph field`);
    }
  }
  if (
    graph.schema !== "iris_production_live_component_dependency_graph_v1" ||
    !["BLOCKED", "ready"].includes(graph.graph_status) ||
    !Array.isArray(graph.components) ||
    graph.component_count !== graph.components.length ||
    graph.component_count !== PRODUCTION_LIVE_DEPENDENCY_GRAPH.length ||
    !Number.isInteger(graph.blocked_component_count) ||
    graph.blocked_component_count < 0 ||
    graph.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid graph`);
  }
  const seen = new Set();
  let blockedCount = 0;
  graph.components.forEach((node, index) => {
    const [expectedComponent, expectedDependencies] =
      PRODUCTION_LIVE_DEPENDENCY_GRAPH[index];
    assertProductionLiveComponentDependencyNodeSafe(
      node,
      expectedComponent,
      expectedDependencies,
      context
    );
    if (seen.has(node.component_label)) {
      throw new ContractError(`${context}: duplicate component`);
    }
    seen.add(node.component_label);
    if (node.classification === "BLOCKED") blockedCount += 1;
  });
  if (
    graph.blocked_component_count !== blockedCount ||
    graph.graph_status !== (blockedCount > 0 ? "BLOCKED" : "ready")
  ) {
    throw new ContractError(`${context}: graph status mismatch`);
  }
  assertBoundaryPolicy(
    graph.boundary_policy,
    PRODUCTION_LIVE_COMPONENT_DEPENDENCY_GRAPH_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionLiveStaleDependencyGuard({
  heartbeatStatus = "stale",
  pickupStatus = "stale",
  probeStatus = "stale",
} = {}) {
  const statuses = {
    heartbeat_status: safeLiveDependencyFreshnessStatus(heartbeatStatus),
    pickup_status: safeLiveDependencyFreshnessStatus(pickupStatus),
    probe_status: safeLiveDependencyFreshnessStatus(probeStatus),
  };
  const attentionLabels = Object.entries(statuses)
    .filter(([, status]) => status !== "fresh")
    .map(([field]) => field.replace("_status", "_attention"));
  const staleCount = Object.values(statuses).filter(
    (status) => status === "stale"
  ).length;
  const guard = {
    schema: "iris_production_live_stale_dependency_guard_v1",
    guard_status: attentionLabels.length > 0 ? "attention" : "ready",
    ...statuses,
    production_live_ready: attentionLabels.length === 0,
    stale_count: staleCount,
    attention_labels: attentionLabels,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_LIVE_STALE_DEPENDENCY_GUARD_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionLiveStaleDependencyGuardSafe(guard);
  return guard;
}

export function assertProductionLiveStaleDependencyGuardSafe(
  guard,
  context = "production live stale dependency guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(guard, context);
  for (const field of Object.keys(guard)) {
    if (!PRODUCTION_LIVE_STALE_DEPENDENCY_GUARD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected guard field`);
    }
  }
  if (
    guard.schema !== "iris_production_live_stale_dependency_guard_v1" ||
    !["ready", "attention"].includes(guard.guard_status) ||
    typeof guard.production_live_ready !== "boolean" ||
    !Number.isInteger(guard.stale_count) ||
    guard.stale_count < 0 ||
    !Array.isArray(guard.attention_labels) ||
    guard.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid guard`);
  }
  for (const field of ["heartbeat_status", "pickup_status", "probe_status"]) {
    if (!["fresh", "stale", "attention"].includes(guard[field])) {
      throw new ContractError(`${context}: invalid freshness status`);
    }
  }
  const expectedAttentionLabels = [
    ["heartbeat_status", "heartbeat_attention"],
    ["pickup_status", "pickup_attention"],
    ["probe_status", "probe_attention"],
  ]
    .filter(([field]) => guard[field] !== "fresh")
    .map(([, label]) => label);
  const expectedStaleCount = [
    guard.heartbeat_status,
    guard.pickup_status,
    guard.probe_status,
  ].filter((status) => status === "stale").length;
  assertExactStringList(
    guard.attention_labels,
    expectedAttentionLabels,
    `${context}: attention labels`
  );
  if (
    guard.stale_count !== expectedStaleCount ||
    guard.production_live_ready !== (expectedAttentionLabels.length === 0) ||
    guard.guard_status !==
      (expectedAttentionLabels.length === 0 ? "ready" : "attention")
  ) {
    throw new ContractError(`${context}: stale dependency readiness mismatch`);
  }
  assertBoundaryPolicy(
    guard.boundary_policy,
    PRODUCTION_LIVE_STALE_DEPENDENCY_GUARD_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionLiveOwnerConfirmationEnvelope({
  ownerConfirmationRequired = true,
  ownerConfirmed = false,
} = {}) {
  const required = ownerConfirmationRequired !== false;
  const confirmed = ownerConfirmed === true;
  const pending = required && !confirmed;
  const envelope = {
    schema: "iris_production_live_owner_confirmation_envelope_v1",
    confirmation_status: pending
      ? "owner_confirmation_pending"
      : "owner_confirmation_confirmed",
    owner_confirmation_required: required,
    owner_confirmed: confirmed,
    owner_confirmation_pending: pending,
    safe_status: pending ? "blocked" : "ready",
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_LIVE_OWNER_CONFIRMATION_ENVELOPE_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertProductionLiveOwnerConfirmationEnvelopeSafe(envelope);
  return envelope;
}

export function assertProductionLiveOwnerConfirmationEnvelopeSafe(
  envelope,
  context = "production live owner confirmation envelope"
) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new ContractError(`${context}: envelope required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(envelope, context);
  for (const field of Object.keys(envelope)) {
    if (!PRODUCTION_LIVE_OWNER_CONFIRMATION_ENVELOPE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected envelope field`);
    }
  }
  if (
    envelope.schema !== "iris_production_live_owner_confirmation_envelope_v1" ||
    !["owner_confirmation_pending", "owner_confirmation_confirmed"].includes(
      envelope.confirmation_status
    ) ||
    typeof envelope.owner_confirmation_required !== "boolean" ||
    typeof envelope.owner_confirmed !== "boolean" ||
    typeof envelope.owner_confirmation_pending !== "boolean" ||
    !["blocked", "ready"].includes(envelope.safe_status) ||
    envelope.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid envelope`);
  }
  const pending =
    envelope.owner_confirmation_required && !envelope.owner_confirmed;
  if (
    envelope.owner_confirmation_pending !== pending ||
    envelope.confirmation_status !==
      (pending ? "owner_confirmation_pending" : "owner_confirmation_confirmed") ||
    envelope.safe_status !== (pending ? "blocked" : "ready")
  ) {
    throw new ContractError(`${context}: owner confirmation status mismatch`);
  }
  assertBoundaryPolicy(
    envelope.boundary_policy,
    PRODUCTION_LIVE_OWNER_CONFIRMATION_ENVELOPE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
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

export function createProductionLiveNoAutoStartGuard({
  readinessResultStatus = "blocked",
  nextSafeActionLabel = "operator_startup_review",
} = {}) {
  const safeStatus = safeProductionLiveNoAutoStartStatus(readinessResultStatus);
  const guard = {
    schema: "iris_production_live_no_auto_start_guard_v1",
    guard_status: safeStatus === "ready" ? "ready" : "blocked",
    readiness_result_status: safeStatus,
    auto_start_allowed: false,
    worker_started: false,
    engine_started: false,
    obs_mutated: false,
    db_connected: false,
    game_started: false,
    next_safe_action_label:
      safeGateDetailLabel(nextSafeActionLabel) ?? "operator_startup_review",
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_LIVE_NO_AUTO_START_GUARD_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertProductionLiveNoAutoStartGuardSafe(guard);
  return guard;
}

export function assertProductionLiveNoAutoStartGuardSafe(
  guard,
  context = "production live no-auto-start guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(guard, context);
  for (const field of Object.keys(guard)) {
    if (!PRODUCTION_LIVE_NO_AUTO_START_GUARD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected guard field`);
    }
  }
  if (
    guard.schema !== "iris_production_live_no_auto_start_guard_v1" ||
    !["blocked", "attention", "ready"].includes(guard.readiness_result_status) ||
    !["blocked", "ready"].includes(guard.guard_status) ||
    guard.auto_start_allowed !== false ||
    guard.worker_started !== false ||
    guard.engine_started !== false ||
    guard.obs_mutated !== false ||
    guard.db_connected !== false ||
    guard.game_started !== false ||
    guard.next_safe_action_label !==
      safeGateDetailLabel(guard.next_safe_action_label) ||
    guard.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid guard`);
  }
  if (
    guard.guard_status !==
    (guard.readiness_result_status === "ready" ? "ready" : "blocked")
  ) {
    throw new ContractError(`${context}: guard status mismatch`);
  }
  assertBoundaryPolicy(
    guard.boundary_policy,
    PRODUCTION_LIVE_NO_AUTO_START_GUARD_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createProductionLiveStartupFixturePack() {
  const fixtures = [
    {
      schema: "iris_production_live_startup_fixture_v1",
      fixture_label: "missing_worker",
      expected_status: "blocked",
      safe_gate: createProductionLiveStartupSequenceManifest({
        componentStatuses: { local_bridge: "blocked" },
      }),
    },
    {
      schema: "iris_production_live_startup_fixture_v1",
      fixture_label: "missing_obs",
      expected_status: "blocked",
      safe_gate: createProductionLiveComponentDependencyGraph({
        componentStatuses: {
          bridge: "ready",
          tts: "ready",
          live2d: "ready",
          db: "ready",
          youtube: "ready",
          game: "ready",
        },
      }),
    },
    {
      schema: "iris_production_live_startup_fixture_v1",
      fixture_label: "stale_tts",
      expected_status: "attention",
      safe_gate: createProductionLiveStaleDependencyGuard({
        heartbeatStatus: "fresh",
        pickupStatus: "fresh",
        probeStatus: "stale",
      }),
    },
    {
      schema: "iris_production_live_startup_fixture_v1",
      fixture_label: "owner_unconfirmed",
      expected_status: "blocked",
      safe_gate: createProductionLiveOwnerConfirmationEnvelope({
        ownerConfirmed: false,
      }),
    },
    {
      schema: "iris_production_live_startup_fixture_v1",
      fixture_label: "emergency_stop_missing",
      expected_status: "blocked",
      safe_gate: createProductionFinalPreflightEmergencyStopReadiness({
        emergencyStopConfirmed: false,
      }),
    },
  ];
  const pack = {
    schema: "iris_production_live_startup_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_LIVE_STARTUP_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertProductionLiveStartupFixturePackSafe(pack);
  return pack;
}

export function assertProductionLiveStartupFixturePackSafe(
  pack,
  context = "production live startup fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!PRODUCTION_LIVE_STARTUP_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_production_live_startup_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.fixture_count !== pack.fixtures.length ||
    pack.fixture_count !== 5 ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const expectedLabels = new Set([
    "missing_worker",
    "missing_obs",
    "stale_tts",
    "owner_unconfirmed",
    "emergency_stop_missing",
  ]);
  for (const fixture of pack.fixtures) {
    assertProductionLiveStartupFixtureSafe(fixture, context);
    expectedLabels.delete(fixture.fixture_label);
  }
  if (expectedLabels.size !== 0) {
    throw new ContractError(`${context}: missing fixture coverage`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    PRODUCTION_LIVE_STARTUP_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
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

export function createLiveReadinessFinalDryRunRoute({
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
    schema: "iris_live_readiness_final_dry_run_route_v1",
    route_id: "live_readiness_final_dry_run",
    route_status: !runtimeConfirmed
      ? "attention"
      : statuses.some((item) => item.status !== "ready")
      ? "attention"
      : "dry_run_clear",
    prerequisite_count: statuses.length,
    prerequisite_statuses: statuses,
    real_operation_performed: false,
    production_ready_reported: false,
    boundary_policy: Object.fromEntries(
      [...LIVE_READINESS_FINAL_DRY_RUN_ROUTE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertLiveReadinessFinalDryRunRouteSafe(route);
  return route;
}

export function assertLiveReadinessFinalDryRunRouteSafe(
  route,
  context = "live readiness final dry-run route"
) {
  if (!route || typeof route !== "object" || Array.isArray(route)) {
    throw new ContractError(`${context}: route is required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(route, context);
  for (const field of Object.keys(route)) {
    if (!LIVE_READINESS_FINAL_DRY_RUN_ROUTE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected route field`);
    }
  }
  if (
    route.schema !== "iris_live_readiness_final_dry_run_route_v1" ||
    route.route_id !== "live_readiness_final_dry_run" ||
    !["attention", "dry_run_clear"].includes(route.route_status)
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
  if (
    (route.route_status === "dry_run_clear" && hasAttention) ||
    route.real_operation_performed !== false ||
    route.production_ready_reported !== false
  ) {
    throw new ContractError(`${context}: dry-run route mismatch`);
  }
  assertBoundaryPolicy(
    route.boundary_policy,
    LIVE_READINESS_FINAL_DRY_RUN_ROUTE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (route.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function createLiveReadinessFinalDryRunFixturePack() {
  const readyPrerequisites = [
    { component: "worker", status: "ready" },
    { component: "engine", status: "ready" },
    { component: "obs", status: "ready" },
    { component: "db", status: "ready" },
    { component: "youtube", status: "ready" },
    { component: "game", status: "ready" },
  ];
  const fixtures = [
    liveReadinessFinalDryRunFixture({
      fixtureLabel: "fixture_pass_real_missing",
      expectedStatus: "attention",
      route: createLiveReadinessFinalDryRunRoute({
        prerequisites: readyPrerequisites,
        realRuntimeConfirmed: false,
      }),
    }),
    liveReadinessFinalDryRunFixture({
      fixtureLabel: "sensitive_leak",
      expectedStatus: "rejected",
      route: createLiveReadinessFinalDryRunRoute({
        prerequisites: readyPrerequisites,
        realRuntimeConfirmed: true,
      }),
    }),
    liveReadinessFinalDryRunFixture({
      fixtureLabel: "owner_missing",
      expectedStatus: "attention",
      route: createLiveReadinessFinalDryRunRoute({
        prerequisites: [{ component: "operator", status: "missing" }],
        realRuntimeConfirmed: true,
      }),
    }),
  ];
  const pack = {
    schema: "iris_live_readiness_final_dry_run_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...LIVE_READINESS_FINAL_DRY_RUN_FIXTURE_PACK_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertLiveReadinessFinalDryRunFixturePackSafe(pack);
  return pack;
}

export function assertLiveReadinessFinalDryRunFixturePackSafe(
  pack,
  context = "live readiness final dry-run fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!LIVE_READINESS_FINAL_DRY_RUN_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_live_readiness_final_dry_run_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "fixture_pass_real_missing",
    "sensitive_leak",
    "owner_missing",
  ]);
  for (const fixture of pack.fixtures) {
    assertLiveReadinessFinalDryRunFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    LIVE_READINESS_FINAL_DRY_RUN_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLiveReadinessOperatorHandoffPlan({
  stepStatuses = {},
  actorRole = "operator",
  eventAtMs = 0,
} = {}) {
  const steps = [
    "review_final_dry_run",
    "confirm_owner_go_no_go",
    "confirm_emergency_stop",
    "confirm_audit_ready",
    "start_live_components",
  ].map((stepLabel) =>
    liveReadinessOperatorHandoffStep(stepLabel, stepStatuses[stepLabel])
  );
  const readyCount = steps.filter((step) => step.status === "ready").length;
  const plan = {
    schema: "iris_live_readiness_operator_handoff_plan_v1",
    plan_status: readyCount === steps.length ? "ready" : "attention",
    step_count: steps.length,
    steps,
    real_operation_performed: false,
    audit_entry_required: true,
    audit_entry: createLiveReadinessOperatorHandoffAuditEntry({
      actorRole,
      resultStatus: readyCount === steps.length ? "recorded" : "blocked",
      eventAtMs,
    }),
    boundary_policy: Object.fromEntries(
      [...LIVE_READINESS_OPERATOR_HANDOFF_PLAN_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertLiveReadinessOperatorHandoffPlanSafe(plan);
  return plan;
}

export function assertLiveReadinessOperatorHandoffPlanSafe(
  plan,
  context = "live readiness operator handoff plan"
) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: plan required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(plan, context);
  for (const field of Object.keys(plan)) {
    if (!LIVE_READINESS_OPERATOR_HANDOFF_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected plan field`);
    }
  }
  if (
    plan.schema !== "iris_live_readiness_operator_handoff_plan_v1" ||
    !["attention", "ready"].includes(plan.plan_status) ||
    !Array.isArray(plan.steps) ||
    plan.real_operation_performed !== false ||
    plan.audit_entry_required !== true ||
    plan.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid plan`);
  }
  assertLiveReadinessOperatorHandoffAuditEntrySafe(
    plan.audit_entry,
    `${context}: audit entry`
  );
  const requiredLabels = new Set([
    "review_final_dry_run",
    "confirm_owner_go_no_go",
    "confirm_emergency_stop",
    "confirm_audit_ready",
    "start_live_components",
  ]);
  let readyCount = 0;
  for (const step of plan.steps) {
    assertLiveReadinessOperatorHandoffStepSafe(step, context);
    requiredLabels.delete(step.step_label);
    if (step.status === "ready") readyCount += 1;
  }
  if (
    requiredLabels.size !== 0 ||
    plan.step_count !== plan.steps.length ||
    plan.plan_status !== (readyCount === plan.steps.length ? "ready" : "attention")
  ) {
    throw new ContractError(`${context}: plan count mismatch`);
  }
  assertBoundaryPolicy(
    plan.boundary_policy,
    LIVE_READINESS_OPERATOR_HANDOFF_PLAN_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLiveReadinessOperatorHandoffFixturePack() {
  const safePlan = createLiveReadinessOperatorHandoffPlan({
    stepStatuses: {
      review_final_dry_run: "ready",
      confirm_owner_go_no_go: "confirmed",
      confirm_emergency_stop: "verified",
      confirm_audit_ready: "ready",
      start_live_components: "ready",
    },
  });
  const fixtures = [
    liveReadinessOperatorHandoffFixture({
      fixtureLabel: "raw_command_leak",
      expectedStatus: "rejected",
      confirmationStatus: "confirmed",
      auditEntryPresent: true,
      safePlan,
    }),
    liveReadinessOperatorHandoffFixture({
      fixtureLabel: "missing_confirmation",
      expectedStatus: "attention",
      confirmationStatus: "missing",
      auditEntryPresent: true,
      safePlan,
    }),
    liveReadinessOperatorHandoffFixture({
      fixtureLabel: "no_audit",
      expectedStatus: "rejected",
      confirmationStatus: "confirmed",
      auditEntryPresent: false,
      safePlan,
    }),
    liveReadinessOperatorHandoffFixture({
      fixtureLabel: "safe_plan",
      expectedStatus: "ready",
      confirmationStatus: "confirmed",
      auditEntryPresent: true,
      safePlan,
    }),
  ];
  const pack = {
    schema: "iris_live_readiness_operator_handoff_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...LIVE_READINESS_OPERATOR_HANDOFF_FIXTURE_PACK_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertLiveReadinessOperatorHandoffFixturePackSafe(pack);
  return pack;
}

export function assertLiveReadinessOperatorHandoffFixturePackSafe(
  pack,
  context = "live readiness operator handoff fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!LIVE_READINESS_OPERATOR_HANDOFF_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_live_readiness_operator_handoff_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "raw_command_leak",
    "missing_confirmation",
    "no_audit",
    "safe_plan",
  ]);
  for (const fixture of pack.fixtures) {
    assertLiveReadinessOperatorHandoffFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    LIVE_READINESS_OPERATOR_HANDOFF_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLiveReadinessCompletionBlockerCarryover({
  realResidencyConfirmed = false,
  blockerLabels = ["fixture_only"],
} = {}) {
  const realConfirmed = realResidencyConfirmed === true;
  const safeLabels = (Array.isArray(blockerLabels) ? blockerLabels : [])
    .map((label) => safeProductionReadinessBlockerReason(label))
    .filter((label) => PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(label));
  if (!realConfirmed && !safeLabels.includes("fixture_only")) {
    safeLabels.push("fixture_only");
  }
  const retained = !realConfirmed || safeLabels.length > 0;
  const carryover = {
    schema: "iris_live_readiness_completion_blocker_carryover_v1",
    review_status: retained
      ? "production_blocker_review_required"
      : "no_unresolved_blocker",
    completion_review_label: "live_readiness_completion_blocker_carryover",
    real_residency_status: realConfirmed ? "confirmed" : "unconfirmed",
    production_blocker_retained: retained,
    unresolved_blocked_count: retained ? safeLabels.length : 0,
    blocker_labels: retained ? [...new Set(safeLabels)].sort() : [],
    production_ready_allowed: false,
    boundary_policy: Object.fromEntries(
      [...LIVE_READINESS_COMPLETION_BLOCKER_CARRYOVER_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertLiveReadinessCompletionBlockerCarryoverSafe(carryover);
  return carryover;
}

export function assertLiveReadinessCompletionBlockerCarryoverSafe(
  carryover,
  context = "live readiness completion blocker carryover"
) {
  if (!carryover || typeof carryover !== "object" || Array.isArray(carryover)) {
    throw new ContractError(`${context}: carryover required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(carryover, context);
  for (const field of Object.keys(carryover)) {
    if (!LIVE_READINESS_COMPLETION_BLOCKER_CARRYOVER_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected carryover field`);
    }
  }
  if (
    carryover.schema !== "iris_live_readiness_completion_blocker_carryover_v1" ||
    !["production_blocker_review_required", "no_unresolved_blocker"].includes(
      carryover.review_status
    ) ||
    carryover.completion_review_label !==
      "live_readiness_completion_blocker_carryover" ||
    !["confirmed", "unconfirmed"].includes(carryover.real_residency_status) ||
    typeof carryover.production_blocker_retained !== "boolean" ||
    !Number.isInteger(carryover.unresolved_blocked_count) ||
    carryover.unresolved_blocked_count < 0 ||
    !Array.isArray(carryover.blocker_labels) ||
    carryover.production_ready_allowed !== false ||
    carryover.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid carryover`);
  }
  for (const label of carryover.blocker_labels) {
    if (!PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(label)) {
      throw new ContractError(`${context}: invalid blocker label`);
    }
  }
  const retained =
    carryover.real_residency_status === "unconfirmed" ||
    carryover.blocker_labels.length > 0;
  if (
    carryover.production_blocker_retained !== retained ||
    carryover.unresolved_blocked_count !== carryover.blocker_labels.length ||
    carryover.review_status !==
      (retained ? "production_blocker_review_required" : "no_unresolved_blocker")
  ) {
    throw new ContractError(`${context}: carryover mismatch`);
  }
  if (
    carryover.real_residency_status === "unconfirmed" &&
    !carryover.blocker_labels.includes("fixture_only")
  ) {
    throw new ContractError(`${context}: unconfirmed real residency must remain blocked`);
  }
  assertBoundaryPolicy(
    carryover.boundary_policy,
    LIVE_READINESS_COMPLETION_BLOCKER_CARRYOVER_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createRealReadinessUnresolvedBlockerReport({
  blockerLabels = [],
  realResidencyConfirmed = false,
} = {}) {
  const safeLabels = (Array.isArray(blockerLabels) ? blockerLabels : [])
    .map((label) => safeProductionBlockerReasonLabel(label))
    .filter(Boolean);
  if (!realResidencyConfirmed) {
    safeLabels.push("fixture_only");
  }
  const labels = [...new Set(safeLabels)].sort();
  const report = {
    schema: "iris_real_readiness_unresolved_blocker_report_v1",
    report_status: labels.length > 0 ? "BLOCKED" : "ready",
    real_residency_status: realResidencyConfirmed ? "confirmed" : "unconfirmed",
    unresolved_blocker_count: labels.length,
    blocker_labels: labels,
    production_ready_allowed: labels.length === 0 && realResidencyConfirmed === true,
    boundary_policy: {
      safe_blocker_labels_only: true,
      real_residency_status_explicit: true,
      sensitive_values_excluded: true,
      packet_body_excluded: true,
      control_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertRealReadinessUnresolvedBlockerReportSafe(report);
  return report;
}

export function assertRealReadinessUnresolvedBlockerReportSafe(
  report,
  context = "real readiness unresolved blocker report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(report, context);
  for (const field of Object.keys(report)) {
    if (!REAL_READINESS_UNRESOLVED_BLOCKER_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`);
    }
  }
  if (
    report.schema !== "iris_real_readiness_unresolved_blocker_report_v1" ||
    !["BLOCKED", "ready"].includes(report.report_status) ||
    !["confirmed", "unconfirmed"].includes(report.real_residency_status) ||
    !Number.isInteger(report.unresolved_blocker_count) ||
    report.unresolved_blocker_count < 0 ||
    !Array.isArray(report.blocker_labels) ||
    typeof report.production_ready_allowed !== "boolean" ||
    report.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid report`);
  }
  for (const label of report.blocker_labels) {
    if (!PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(label)) {
      throw new ContractError(`${context}: invalid blocker label`);
    }
  }
  if (
    report.unresolved_blocker_count !== report.blocker_labels.length ||
    report.report_status !==
      (report.blocker_labels.length > 0 ? "BLOCKED" : "ready") ||
    report.production_ready_allowed !==
      (report.blocker_labels.length === 0 &&
        report.real_residency_status === "confirmed") ||
    (report.real_residency_status === "unconfirmed" &&
      !report.blocker_labels.includes("fixture_only"))
  ) {
    throw new ContractError(`${context}: report mismatch`);
  }
  assertBoundaryPolicy(
    report.boundary_policy,
    new Set([
      "safe_blocker_labels_only",
      "real_residency_status_explicit",
      "sensitive_values_excluded",
      "packet_body_excluded",
      "control_body_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createRealReadinessBlockerResolutionTracking({
  blockerLabels = [],
  evidence = {},
  nowMs = 0,
  maxEvidenceAgeMs = 300000,
} = {}) {
  const now = safeTimestampMs(nowMs);
  const maxAge = safeNonNegativeCount(maxEvidenceAgeMs) || 300000;
  const labels = [
    ...new Set(
      (Array.isArray(blockerLabels) ? blockerLabels : [])
        .map((label) => safeProductionBlockerReasonLabel(label))
        .filter(Boolean)
    ),
  ].sort();
  const resolved = [];
  const unresolved = [];
  let staleEvidenceCount = 0;
  for (const label of labels) {
    const item = evidence?.[label];
    const status = safeGateDetailLabel(item?.status);
    const timestampMs = safeTimestampMs(item?.timestamp_ms);
    const fresh = timestampMs > 0 && now >= timestampMs && now - timestampMs <= maxAge;
    if (status === "resolved" && fresh) {
      resolved.push(label);
    } else {
      unresolved.push(label);
      if (status === "resolved" && !fresh) staleEvidenceCount += 1;
    }
  }
  const tracking = {
    schema: "iris_real_readiness_blocker_resolution_tracking_v1",
    tracking_status: unresolved.length === 0 ? "ready" : "BLOCKED",
    resolved_count: resolved.length,
    unresolved_count: unresolved.length,
    stale_evidence_count: staleEvidenceCount,
    resolved_blocker_labels: resolved,
    unresolved_blocker_labels: unresolved,
    fresh_evidence_required: true,
    production_ready_allowed: unresolved.length === 0,
    boundary_policy: {
      safe_blocker_labels_and_status_only: true,
      fresh_evidence_timestamp_required: true,
      stale_evidence_does_not_resolve: true,
      sensitive_values_excluded: true,
      packet_body_excluded: true,
      control_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertRealReadinessBlockerResolutionTrackingSafe(tracking);
  return tracking;
}

export function assertRealReadinessBlockerResolutionTrackingSafe(
  tracking,
  context = "real readiness blocker resolution tracking"
) {
  if (!tracking || typeof tracking !== "object" || Array.isArray(tracking)) {
    throw new ContractError(`${context}: tracking required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(tracking, context);
  for (const field of Object.keys(tracking)) {
    if (!REAL_READINESS_BLOCKER_RESOLUTION_TRACKING_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected tracking field`);
    }
  }
  if (
    tracking.schema !== "iris_real_readiness_blocker_resolution_tracking_v1" ||
    !["BLOCKED", "ready"].includes(tracking.tracking_status) ||
    !Number.isInteger(tracking.resolved_count) ||
    !Number.isInteger(tracking.unresolved_count) ||
    !Number.isInteger(tracking.stale_evidence_count) ||
    tracking.resolved_count < 0 ||
    tracking.unresolved_count < 0 ||
    tracking.stale_evidence_count < 0 ||
    !Array.isArray(tracking.resolved_blocker_labels) ||
    !Array.isArray(tracking.unresolved_blocker_labels) ||
    tracking.fresh_evidence_required !== true ||
    typeof tracking.production_ready_allowed !== "boolean" ||
    tracking.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid tracking`);
  }
  for (const label of [
    ...tracking.resolved_blocker_labels,
    ...tracking.unresolved_blocker_labels,
  ]) {
    if (!PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(label)) {
      throw new ContractError(`${context}: invalid blocker label`);
    }
  }
  if (
    tracking.resolved_count !== tracking.resolved_blocker_labels.length ||
    tracking.unresolved_count !== tracking.unresolved_blocker_labels.length ||
    tracking.tracking_status !==
      (tracking.unresolved_blocker_labels.length === 0 ? "ready" : "BLOCKED") ||
    tracking.production_ready_allowed !==
      (tracking.unresolved_blocker_labels.length === 0)
  ) {
    throw new ContractError(`${context}: tracking mismatch`);
  }
  assertBoundaryPolicy(
    tracking.boundary_policy,
    new Set([
      "safe_blocker_labels_and_status_only",
      "fresh_evidence_timestamp_required",
      "stale_evidence_does_not_resolve",
      "sensitive_values_excluded",
      "packet_body_excluded",
      "control_body_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createRealReadinessFalseReadyRegression({
  blockedFixtures = [],
} = {}) {
  const fixtures = Array.isArray(blockedFixtures) ? blockedFixtures : [];
  const blockedLabels = [];
  let falseReadyDetected = false;
  for (const fixture of fixtures) {
    const label =
      safeProductionBlockerReasonLabel(fixture?.blocker_label) ??
      safeProductionBlockerReasonLabel(fixture?.label) ??
      "fixture_only";
    if (!blockedLabels.includes(label)) blockedLabels.push(label);
    if (fixture?.ready_allowed === true || fixture?.status === "ready") {
      falseReadyDetected = true;
    }
  }
  const regression = {
    schema: "iris_real_readiness_false_ready_regression_v1",
    regression_status: falseReadyDetected ? "fail" : "pass",
    blocked_fixture_count: fixtures.length,
    false_ready_detected: falseReadyDetected,
    ready_allowed: false,
    blocked_fixture_labels: blockedLabels.sort(),
    boundary_policy: {
      blocked_fixture_cannot_be_ready: true,
      safe_blocker_labels_only: true,
      sensitive_values_excluded: true,
      packet_body_excluded: true,
      control_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertRealReadinessFalseReadyRegressionSafe(regression);
  return regression;
}

export function assertRealReadinessFalseReadyRegressionSafe(
  regression,
  context = "real readiness false-ready regression"
) {
  if (!regression || typeof regression !== "object" || Array.isArray(regression)) {
    throw new ContractError(`${context}: regression required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(regression, context);
  for (const field of Object.keys(regression)) {
    if (!REAL_READINESS_FALSE_READY_REGRESSION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected regression field`);
    }
  }
  if (
    regression.schema !== "iris_real_readiness_false_ready_regression_v1" ||
    !["fail", "pass"].includes(regression.regression_status) ||
    !Number.isInteger(regression.blocked_fixture_count) ||
    regression.blocked_fixture_count < 0 ||
    typeof regression.false_ready_detected !== "boolean" ||
    regression.ready_allowed !== false ||
    !Array.isArray(regression.blocked_fixture_labels) ||
    regression.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid regression`);
  }
  for (const label of regression.blocked_fixture_labels) {
    if (!PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(label)) {
      throw new ContractError(`${context}: invalid blocker label`);
    }
  }
  if (
    regression.regression_status !==
      (regression.false_ready_detected ? "fail" : "pass")
  ) {
    throw new ContractError(`${context}: regression status mismatch`);
  }
  assertBoundaryPolicy(
    regression.boundary_policy,
    new Set([
      "blocked_fixture_cannot_be_ready",
      "safe_blocker_labels_only",
      "sensitive_values_excluded",
      "packet_body_excluded",
      "control_body_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createRealReadinessUnresolvedBlockerFixturePack() {
  const nowMs = 100000;
  const fixtures = [
    realReadinessUnresolvedBlockerFixture({
      fixtureLabel: "stale_evidence",
      expectedStatus: "BLOCKED",
      blockerReport: createRealReadinessUnresolvedBlockerReport({
        blockerLabels: ["worker_missing"],
        realResidencyConfirmed: true,
      }),
      resolutionTracking: createRealReadinessBlockerResolutionTracking({
        blockerLabels: ["worker_missing"],
        evidence: { worker_missing: { status: "resolved", timestamp_ms: 1 } },
        nowMs,
        maxEvidenceAgeMs: 1000,
      }),
    }),
    realReadinessUnresolvedBlockerFixture({
      fixtureLabel: "missing_owner",
      expectedStatus: "BLOCKED",
      blockerReport: createRealReadinessUnresolvedBlockerReport({
        blockerLabels: ["operator_review_required"],
        realResidencyConfirmed: false,
      }),
      resolutionTracking: createRealReadinessBlockerResolutionTracking({
        blockerLabels: ["operator_review_required"],
        evidence: {},
        nowMs,
      }),
    }),
    realReadinessUnresolvedBlockerFixture({
      fixtureLabel: "missing_engine",
      expectedStatus: "BLOCKED",
      blockerReport: createRealReadinessUnresolvedBlockerReport({
        blockerLabels: ["engine_attention"],
        realResidencyConfirmed: true,
      }),
      resolutionTracking: createRealReadinessBlockerResolutionTracking({
        blockerLabels: ["engine_attention"],
        evidence: {},
        nowMs,
      }),
    }),
    realReadinessUnresolvedBlockerFixture({
      fixtureLabel: "sensitive_leak",
      expectedStatus: "rejected",
      sensitiveValueRejected: true,
      blockerReport: createRealReadinessUnresolvedBlockerReport({
        blockerLabels: ["adapter_attention"],
        realResidencyConfirmed: true,
      }),
      resolutionTracking: createRealReadinessBlockerResolutionTracking({
        blockerLabels: ["adapter_attention"],
        evidence: {},
        nowMs,
      }),
    }),
    realReadinessUnresolvedBlockerFixture({
      fixtureLabel: "resolved_blocker",
      expectedStatus: "ready",
      blockerReport: createRealReadinessUnresolvedBlockerReport({
        blockerLabels: [],
        realResidencyConfirmed: true,
      }),
      resolutionTracking: createRealReadinessBlockerResolutionTracking({
        blockerLabels: ["worker_missing"],
        evidence: { worker_missing: { status: "resolved", timestamp_ms: nowMs } },
        nowMs,
      }),
    }),
  ];
  const pack = {
    schema: "iris_real_readiness_unresolved_blocker_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: {
      safe_blocker_labels_only: true,
      fresh_evidence_required: true,
      stale_evidence_does_not_resolve: true,
      sensitive_values_excluded: true,
      packet_body_excluded: true,
      control_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertRealReadinessUnresolvedBlockerFixturePackSafe(pack);
  return pack;
}

export function assertRealReadinessUnresolvedBlockerFixturePackSafe(
  pack,
  context = "real readiness unresolved blocker fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!REAL_READINESS_UNRESOLVED_BLOCKER_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_real_readiness_unresolved_blocker_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "stale_evidence",
    "missing_owner",
    "missing_engine",
    "sensitive_leak",
    "resolved_blocker",
  ]);
  for (const fixture of pack.fixtures) {
    assertRealReadinessUnresolvedBlockerFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    new Set([
      "safe_blocker_labels_only",
      "fresh_evidence_required",
      "stale_evidence_does_not_resolve",
      "sensitive_values_excluded",
      "packet_body_excluded",
      "control_body_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createProductionLiveReadinessFinalReviewHook({
  blockerReport = createRealReadinessUnresolvedBlockerReport(),
} = {}) {
  assertRealReadinessUnresolvedBlockerReportSafe(
    blockerReport,
    "production live readiness final review hook blocker report"
  );
  const riskLabels = blockerReport.production_ready_allowed
    ? []
    : [
        ...new Set([
          ...blockerReport.blocker_labels,
          ...(blockerReport.real_residency_status === "unconfirmed"
            ? ["fixture_only"]
            : []),
        ]),
      ].sort();
  const hook = {
    schema: "iris_production_live_readiness_final_review_hook_v1",
    review_status:
      riskLabels.length > 0 ? "safe_residual_risk_review_required" : "ready",
    completion_review_label: "production_live_readiness_final_review",
    safe_residual_risk_count: riskLabels.length,
    safe_residual_risk_labels: riskLabels,
    production_ready_allowed: riskLabels.length === 0,
    boundary_policy: {
      safe_residual_risk_labels_only: true,
      real_residency_unconfirmed_retained: true,
      no_readiness_sweetening: true,
      sensitive_values_excluded: true,
      packet_body_excluded: true,
      control_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertProductionLiveReadinessFinalReviewHookSafe(hook);
  return hook;
}

export function assertProductionLiveReadinessFinalReviewHookSafe(
  hook,
  context = "production live readiness final review hook"
) {
  if (!hook || typeof hook !== "object" || Array.isArray(hook)) {
    throw new ContractError(`${context}: hook required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(hook, context);
  for (const field of Object.keys(hook)) {
    if (!PRODUCTION_LIVE_READINESS_FINAL_REVIEW_HOOK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected hook field`);
    }
  }
  if (
    hook.schema !== "iris_production_live_readiness_final_review_hook_v1" ||
    !["safe_residual_risk_review_required", "ready"].includes(hook.review_status) ||
    hook.completion_review_label !== "production_live_readiness_final_review" ||
    !Number.isInteger(hook.safe_residual_risk_count) ||
    hook.safe_residual_risk_count < 0 ||
    !Array.isArray(hook.safe_residual_risk_labels) ||
    typeof hook.production_ready_allowed !== "boolean" ||
    hook.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid hook`);
  }
  for (const label of hook.safe_residual_risk_labels) {
    if (!PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(label)) {
      throw new ContractError(`${context}: invalid residual risk label`);
    }
  }
  if (
    hook.safe_residual_risk_count !== hook.safe_residual_risk_labels.length ||
    hook.review_status !==
      (hook.safe_residual_risk_labels.length > 0
        ? "safe_residual_risk_review_required"
        : "ready") ||
    hook.production_ready_allowed !== (hook.safe_residual_risk_labels.length === 0)
  ) {
    throw new ContractError(`${context}: hook mismatch`);
  }
  assertBoundaryPolicy(
    hook.boundary_policy,
    new Set([
      "safe_residual_risk_labels_only",
      "real_residency_unconfirmed_retained",
      "no_readiness_sweetening",
      "sensitive_values_excluded",
      "packet_body_excluded",
      "control_body_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createOperationalRehearsalManifest({
  rehearsalStatuses = {},
  rehearsalModes = {},
} = {}) {
  const rehearsals = [
    operationalRehearsalEntry(
      "emergency_stop",
      rehearsalStatuses.emergency_stop,
      "npm run dev:emergency-stop:dry-run",
      rehearsalModes.emergency_stop
    ),
    operationalRehearsalEntry(
      "pause_controls",
      rehearsalStatuses.pause_controls,
      "npm run dev:pause-controls:dry-run",
      rehearsalModes.pause_controls
    ),
    operationalRehearsalEntry(
      "fixture_youtube",
      rehearsalStatuses.fixture_youtube,
      "npm run dev:youtube:relay-readiness-rehearsal",
      rehearsalModes.fixture_youtube
    ),
    operationalRehearsalEntry(
      "tts_preview",
      rehearsalStatuses.tts_preview,
      "npm run dev:tts:preview-rehearsal",
      rehearsalModes.tts_preview
    ),
    operationalRehearsalEntry(
      "live2d_cue",
      rehearsalStatuses.live2d_cue,
      "npm run dev:live2d:cue-rehearsal",
      rehearsalModes.live2d_cue
    ),
    operationalRehearsalEntry(
      "obs_overlay",
      rehearsalStatuses.obs_overlay,
      "npm run dev:obs:overlay-rehearsal",
      rehearsalModes.obs_overlay
    ),
    operationalRehearsalEntry(
      "game_validation",
      rehearsalStatuses.game_validation,
      "npm run dev:game:validation-rehearsal",
      rehearsalModes.game_validation
    ),
  ];
  const readyCount = rehearsals.filter((entry) => entry.status === "ready").length;
  const manifest = {
    schema: "iris_operational_rehearsal_manifest_v1",
    manifest_status: readyCount === rehearsals.length ? "ready" : "attention",
    rehearsal_count: rehearsals.length,
    rehearsals,
    boundary_policy: Object.fromEntries(
      [...OPERATIONAL_REHEARSAL_MANIFEST_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertOperationalRehearsalManifestSafe(manifest);
  return manifest;
}

export function assertOperationalRehearsalManifestSafe(
  manifest,
  context = "operational rehearsal manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(manifest, context);
  for (const field of Object.keys(manifest)) {
    if (!OPERATIONAL_REHEARSAL_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`);
    }
  }
  if (
    manifest.schema !== "iris_operational_rehearsal_manifest_v1" ||
    !["attention", "ready"].includes(manifest.manifest_status) ||
    !Array.isArray(manifest.rehearsals) ||
    manifest.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid manifest`);
  }
  const requiredLabels = new Set([
    "emergency_stop",
    "pause_controls",
    "fixture_youtube",
    "tts_preview",
    "live2d_cue",
    "obs_overlay",
    "game_validation",
  ]);
  let readyCount = 0;
  for (const entry of manifest.rehearsals) {
    assertOperationalRehearsalEntrySafe(entry, context);
    requiredLabels.delete(entry.rehearsal_label);
    if (entry.status === "ready") readyCount += 1;
  }
  if (
    requiredLabels.size !== 0 ||
    manifest.rehearsal_count !== manifest.rehearsals.length ||
    manifest.manifest_status !==
      (readyCount === manifest.rehearsals.length ? "ready" : "attention")
  ) {
    throw new ContractError(`${context}: manifest count mismatch`);
  }
  assertBoundaryPolicy(
    manifest.boundary_policy,
    OPERATIONAL_REHEARSAL_MANIFEST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createOperationalRehearsalResultSummary({
  results = [],
} = {}) {
  const safeResults = Array.isArray(results) ? results : [];
  const scriptNames = [];
  let passCount = 0;
  let failCount = 0;
  let staleCount = 0;
  for (const result of safeResults) {
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      failCount += 1;
      continue;
    }
    const status = safeGateDetailLabel(result.status);
    const freshnessStatus = safeGateDetailLabel(result.freshness_status);
    const isStale =
      result.is_stale === true ||
      freshnessStatus === "stale" ||
      freshnessStatus === "expired";
    if (isStale) {
      staleCount += 1;
      failCount += 1;
    } else if (status === "pass" || status === "ready" || status === "verified") {
      passCount += 1;
    } else {
      failCount += 1;
    }
    if (typeof result.script_name === "string") {
      assertSafeScriptName(result.script_name, "operational rehearsal result");
      scriptNames.push(result.script_name);
    }
  }
  const resultSummary = {
    schema: "iris_operational_rehearsal_result_summary_v1",
    result_status: failCount === 0 ? "pass" : "fail",
    pass_count: passCount,
    fail_count: failCount,
    stale_count: staleCount,
    result_count: passCount + failCount,
    freshness_status: staleCount === 0 ? "fresh" : "stale",
    fresh_readiness_allowed: staleCount === 0 && failCount === 0,
    script_names: [...new Set(scriptNames)].sort(),
    boundary_policy: {
      pass_fail_count_and_script_names_only: true,
      stale_results_do_not_grant_readiness: true,
      packet_body_excluded: true,
      comment_body_excluded: true,
      job_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertOperationalRehearsalResultSummarySafe(resultSummary);
  return resultSummary;
}

export function assertOperationalRehearsalResultSummarySafe(
  resultSummary,
  context = "operational rehearsal result summary"
) {
  if (!resultSummary || typeof resultSummary !== "object" || Array.isArray(resultSummary)) {
    throw new ContractError(`${context}: result summary required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(resultSummary, context);
  for (const field of Object.keys(resultSummary)) {
    if (!OPERATIONAL_REHEARSAL_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected result field`);
    }
  }
  if (
    resultSummary.schema !== "iris_operational_rehearsal_result_summary_v1" ||
    !["pass", "fail"].includes(resultSummary.result_status) ||
    !Number.isInteger(resultSummary.pass_count) ||
    !Number.isInteger(resultSummary.fail_count) ||
    !Number.isInteger(resultSummary.stale_count) ||
    !Number.isInteger(resultSummary.result_count) ||
    resultSummary.pass_count < 0 ||
    resultSummary.fail_count < 0 ||
    resultSummary.stale_count < 0 ||
    resultSummary.stale_count > resultSummary.fail_count ||
    resultSummary.result_count !==
      resultSummary.pass_count + resultSummary.fail_count ||
    resultSummary.result_status !==
      (resultSummary.fail_count === 0 ? "pass" : "fail") ||
    !["fresh", "stale"].includes(resultSummary.freshness_status) ||
    resultSummary.freshness_status !==
      (resultSummary.stale_count === 0 ? "fresh" : "stale") ||
    resultSummary.fresh_readiness_allowed !==
      (resultSummary.stale_count === 0 && resultSummary.fail_count === 0) ||
    !Array.isArray(resultSummary.script_names) ||
    resultSummary.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid result summary`);
  }
  for (const scriptName of resultSummary.script_names) {
    assertSafeScriptName(scriptName, context);
  }
  assertBoundaryPolicy(
    resultSummary.boundary_policy,
    new Set([
      "pass_fail_count_and_script_names_only",
      "stale_results_do_not_grant_readiness",
      "packet_body_excluded",
      "comment_body_excluded",
      "job_body_excluded",
    ]),
    `${context}: boundary policy`
  );
}

export function createOperationalRehearsalFixturePack() {
  const fixtures = [
    operationalRehearsalFixture({
      fixtureLabel: "synthetic_only",
      expectedStatus: "pass",
      resultSummary: createOperationalRehearsalResultSummary({
        results: [
          {
            status: "pass",
            freshness_status: "fresh",
            script_name: "npm run dev:youtube:relay-readiness-rehearsal",
          },
        ],
      }),
    }),
    operationalRehearsalFixture({
      fixtureLabel: "real_unconfirmed",
      expectedStatus: "fail",
      realExternalConfirmed: false,
      resultSummary: createOperationalRehearsalResultSummary({
        results: [
          {
            status: "fail",
            freshness_status: "fresh",
            script_name: "npm run dev:tts:preview-rehearsal",
          },
        ],
      }),
    }),
    operationalRehearsalFixture({
      fixtureLabel: "packet_body_leak",
      expectedStatus: "rejected",
      packetBodyRejected: true,
      resultSummary: createOperationalRehearsalResultSummary({
        results: [
          {
            status: "fail",
            freshness_status: "fresh",
            script_name: "npm run dev:live2d:cue-rehearsal",
          },
        ],
      }),
    }),
    operationalRehearsalFixture({
      fixtureLabel: "stale_result",
      expectedStatus: "fail",
      staleResultRejected: true,
      resultSummary: createOperationalRehearsalResultSummary({
        results: [
          {
            status: "pass",
            freshness_status: "stale",
            script_name: "npm run dev:obs:overlay-rehearsal",
          },
        ],
      }),
    }),
  ];
  const pack = {
    schema: "iris_operational_rehearsal_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: {
      synthetic_fixture_default: true,
      real_external_requires_confirmation: true,
      pass_fail_count_and_script_names_only: true,
      packet_body_excluded: true,
      comment_body_excluded: true,
      job_body_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertOperationalRehearsalFixturePackSafe(pack);
  return pack;
}

export function assertOperationalRehearsalFixturePackSafe(
  pack,
  context = "operational rehearsal fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!OPERATIONAL_REHEARSAL_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_operational_rehearsal_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "synthetic_only",
    "real_unconfirmed",
    "packet_body_leak",
    "stale_result",
  ]);
  for (const fixture of pack.fixtures) {
    assertOperationalRehearsalFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    new Set([
      "synthetic_fixture_default",
      "real_external_requires_confirmation",
      "pass_fail_count_and_script_names_only",
      "packet_body_excluded",
      "comment_body_excluded",
      "job_body_excluded",
    ]),
    `${context}: boundary policy`
  );
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

export function createLocalBridgeWorkerLiveCheckManifest({
  workerPresent = false,
  workerStatus = "missing",
} = {}) {
  const present = workerPresent === true;
  const safeStatus = present ? safeLocalBridgeWorkerLiveStatus(workerStatus) : "missing";
  const ready = present && safeStatus === "active";
  const manifest = {
    schema: "iris_local_bridge_worker_live_check_manifest_v1",
    manifest_status: ready ? "ready" : "BLOCKED",
    component: "local_bridge_worker",
    worker_required: true,
    worker_present: present,
    worker_status: safeStatus,
    live_check_status: ready ? "live_worker_confirmed" : "worker_blocked",
    production_ready_allowed: ready,
    required_fields: [
      "component",
      "worker_required",
      "worker_present",
      "worker_status",
      "live_check_status",
    ],
    boundary_policy: Object.fromEntries(
      [...LOCAL_BRIDGE_WORKER_LIVE_CHECK_MANIFEST_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertLocalBridgeWorkerLiveCheckManifestSafe(manifest);
  return manifest;
}

export function assertLocalBridgeWorkerLiveCheckManifestSafe(
  manifest,
  context = "local bridge worker live check manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(manifest, context);
  for (const field of Object.keys(manifest)) {
    if (!LOCAL_BRIDGE_WORKER_LIVE_CHECK_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`);
    }
  }
  if (
    manifest.schema !== "iris_local_bridge_worker_live_check_manifest_v1" ||
    manifest.component !== "local_bridge_worker" ||
    manifest.worker_required !== true ||
    typeof manifest.worker_present !== "boolean" ||
    !["missing", "active", "stale", "attention"].includes(manifest.worker_status) ||
    !["worker_blocked", "live_worker_confirmed"].includes(
      manifest.live_check_status
    ) ||
    typeof manifest.production_ready_allowed !== "boolean" ||
    manifest.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid manifest`);
  }
  const ready = manifest.worker_present === true && manifest.worker_status === "active";
  if (
    manifest.manifest_status !== (ready ? "ready" : "BLOCKED") ||
    manifest.live_check_status !==
      (ready ? "live_worker_confirmed" : "worker_blocked") ||
    manifest.production_ready_allowed !== ready
  ) {
    throw new ContractError(`${context}: worker readiness mismatch`);
  }
  if (!manifest.worker_present && manifest.production_ready_allowed !== false) {
    throw new ContractError(`${context}: missing worker cannot be ready`);
  }
  assertExactStringList(
    manifest.required_fields,
    [
      "component",
      "worker_required",
      "worker_present",
      "worker_status",
      "live_check_status",
    ],
    `${context}: required fields`
  );
  assertBoundaryPolicy(
    manifest.boundary_policy,
    LOCAL_BRIDGE_WORKER_LIVE_CHECK_MANIFEST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLocalBridgeWorkerHeartbeatFreshnessGate({
  heartbeatAgeMs = null,
  staleAfterMs = 30000,
} = {}) {
  const classifier = createProductionReadinessHeartbeatClassifier({
    heartbeatAgeMs,
    staleAfterMs,
  });
  const gate = {
    schema: "iris_local_bridge_worker_heartbeat_freshness_gate_v1",
    gate_status: classifier.ready_allowed ? "ready" : "runtime_waiting",
    heartbeat_status: classifier.heartbeat_status,
    age_bucket: classifier.age_bucket,
    readiness_state: classifier.readiness_state,
    ready_allowed: classifier.ready_allowed,
    boundary_policy: Object.fromEntries(
      [...LOCAL_BRIDGE_WORKER_HEARTBEAT_FRESHNESS_GATE_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertLocalBridgeWorkerHeartbeatFreshnessGateSafe(gate);
  return gate;
}

export function assertLocalBridgeWorkerHeartbeatFreshnessGateSafe(
  gate,
  context = "local bridge worker heartbeat freshness gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(gate, context);
  for (const field of Object.keys(gate)) {
    if (!LOCAL_BRIDGE_WORKER_HEARTBEAT_FRESHNESS_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`);
    }
  }
  if (
    gate.schema !== "iris_local_bridge_worker_heartbeat_freshness_gate_v1" ||
    !["ready", "runtime_waiting"].includes(gate.gate_status) ||
    !["fresh", "stale"].includes(gate.heartbeat_status) ||
    !["recent", "stale", "missing"].includes(gate.age_bucket) ||
    !["ready", "runtime_waiting"].includes(gate.readiness_state) ||
    typeof gate.ready_allowed !== "boolean" ||
    gate.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const ready = gate.heartbeat_status === "fresh";
  if (
    gate.ready_allowed !== ready ||
    gate.gate_status !== (ready ? "ready" : "runtime_waiting") ||
    gate.readiness_state !== (ready ? "ready" : "runtime_waiting")
  ) {
    throw new ContractError(`${context}: heartbeat freshness mismatch`);
  }
  if (gate.heartbeat_status === "stale" && gate.ready_allowed !== false) {
    throw new ContractError(`${context}: stale heartbeat cannot be ready`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    LOCAL_BRIDGE_WORKER_HEARTBEAT_FRESHNESS_GATE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLocalBridgeWorkerDryRunStatus({
  workerPresent = false,
  heartbeatAgeMs = null,
  staleAfterMs = 30000,
} = {}) {
  const present = workerPresent === true;
  const freshnessGate = createLocalBridgeWorkerHeartbeatFreshnessGate({
    heartbeatAgeMs: present ? heartbeatAgeMs : null,
    staleAfterMs,
  });
  const workerStatus = !present
    ? "missing"
    : freshnessGate.heartbeat_status === "fresh"
      ? "ready"
      : "stale";
  const dryRun = {
    schema: "iris_local_bridge_worker_dry_run_status_v1",
    dry_run_status: workerStatus === "ready" ? "dry_run_ready" : "dry_run_blocked",
    worker_required: true,
    worker_presence_status: present ? "present" : "missing",
    worker_freshness_status: freshnessGate.heartbeat_status,
    worker_status: workerStatus,
    readiness_state: workerStatus === "ready" ? "ready" : "runtime_waiting",
    production_ready_allowed: workerStatus === "ready",
    boundary_policy: Object.fromEntries(
      [...LOCAL_BRIDGE_WORKER_DRY_RUN_STATUS_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertLocalBridgeWorkerDryRunStatusSafe(dryRun);
  return dryRun;
}

export function assertLocalBridgeWorkerDryRunStatusSafe(
  dryRun,
  context = "local bridge worker dry-run status"
) {
  if (!dryRun || typeof dryRun !== "object" || Array.isArray(dryRun)) {
    throw new ContractError(`${context}: dry-run status required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(dryRun, context);
  for (const field of Object.keys(dryRun)) {
    if (!LOCAL_BRIDGE_WORKER_DRY_RUN_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected dry-run field`);
    }
  }
  if (
    dryRun.schema !== "iris_local_bridge_worker_dry_run_status_v1" ||
    !["dry_run_blocked", "dry_run_ready"].includes(dryRun.dry_run_status) ||
    dryRun.worker_required !== true ||
    !["present", "missing"].includes(dryRun.worker_presence_status) ||
    !["fresh", "stale"].includes(dryRun.worker_freshness_status) ||
    !["missing", "stale", "ready"].includes(dryRun.worker_status) ||
    !["ready", "runtime_waiting"].includes(dryRun.readiness_state) ||
    typeof dryRun.production_ready_allowed !== "boolean" ||
    dryRun.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid dry-run status`);
  }
  const ready =
    dryRun.worker_presence_status === "present" &&
    dryRun.worker_freshness_status === "fresh" &&
    dryRun.worker_status === "ready";
  if (
    dryRun.production_ready_allowed !== ready ||
    dryRun.readiness_state !== (ready ? "ready" : "runtime_waiting") ||
    dryRun.dry_run_status !== (ready ? "dry_run_ready" : "dry_run_blocked")
  ) {
    throw new ContractError(`${context}: dry-run readiness mismatch`);
  }
  if (
    dryRun.worker_presence_status === "missing" &&
    dryRun.worker_status !== "missing"
  ) {
    throw new ContractError(`${context}: missing worker status mismatch`);
  }
  if (
    dryRun.worker_presence_status === "present" &&
    dryRun.worker_freshness_status === "stale" &&
    dryRun.worker_status !== "stale"
  ) {
    throw new ContractError(`${context}: stale worker status mismatch`);
  }
  assertBoundaryPolicy(
    dryRun.boundary_policy,
    LOCAL_BRIDGE_WORKER_DRY_RUN_STATUS_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLocalBridgeWorkerSafeNextAction({
  workerStatus = "missing",
} = {}) {
  const status = safeLocalBridgeWorkerLiveStatus(workerStatus);
  if (status === "missing") {
    return createProductionReadinessSafeNextAction({
      nextScript: "npm run dev:bridge:worker",
    });
  }
  if (status === "stale") {
    return createProductionReadinessSafeNextAction({
      nextScript: "npm run dev:production:runtime-handoff-status",
    });
  }
  return createProductionReadinessSafeNextAction({
    operatorActionLabel:
      status === "active"
        ? "local_bridge_worker_live_confirmed"
        : "operator_attention_required",
  });
}

export function createLocalBridgeWorkerNoFakeReadyFixture() {
  const liveCheck = createLocalBridgeWorkerLiveCheckManifest({
    workerPresent: false,
    workerStatus: "active",
  });
  const fixture = {
    schema: "iris_local_bridge_worker_no_fake_ready_fixture_v1",
    fixture_label: "node_repl_only_worker_missing",
    detected_runtime_label: "node_repl_only",
    worker_present: liveCheck.worker_present,
    live_check_status: liveCheck.live_check_status,
    production_ready_allowed: liveCheck.production_ready_allowed,
    expected_status:
      liveCheck.production_ready_allowed === false ? "pass" : "blocked",
    boundary_policy: Object.fromEntries(
      [...LOCAL_BRIDGE_WORKER_NO_FAKE_READY_FIXTURE_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertLocalBridgeWorkerNoFakeReadyFixtureSafe(fixture);
  return fixture;
}

export function assertLocalBridgeWorkerNoFakeReadyFixtureSafe(
  fixture,
  context = "local bridge worker no-fake-ready fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!LOCAL_BRIDGE_WORKER_NO_FAKE_READY_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_local_bridge_worker_no_fake_ready_fixture_v1" ||
    fixture.fixture_label !== "node_repl_only_worker_missing" ||
    fixture.detected_runtime_label !== "node_repl_only" ||
    fixture.worker_present !== false ||
    fixture.live_check_status !== "worker_blocked" ||
    fixture.production_ready_allowed !== false ||
    fixture.expected_status !== "pass" ||
    fixture.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  assertBoundaryPolicy(
    fixture.boundary_policy,
    LOCAL_BRIDGE_WORKER_NO_FAKE_READY_FIXTURE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLocalBridgeWorkerPublicSummary({
  liveCheck = createLocalBridgeWorkerLiveCheckManifest(),
} = {}) {
  assertLocalBridgeWorkerLiveCheckManifestSafe(
    liveCheck,
    "local bridge worker public summary live check"
  );
  const summary = {
    schema: "iris_local_bridge_worker_public_summary_v1",
    summary_status: liveCheck.production_ready_allowed ? "ready" : "BLOCKED",
    component: "local_bridge_worker",
    worker_status: liveCheck.worker_status,
    readiness_state: liveCheck.production_ready_allowed
      ? "ready"
      : "runtime_waiting",
    production_ready_allowed: liveCheck.production_ready_allowed,
    boundary_policy: Object.fromEntries(
      [...LOCAL_BRIDGE_WORKER_PUBLIC_SUMMARY_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertLocalBridgeWorkerPublicSummarySafe(summary);
  return summary;
}

export function assertLocalBridgeWorkerPublicSummarySafe(
  summary,
  context = "local bridge worker public summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!LOCAL_BRIDGE_WORKER_PUBLIC_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (
    summary.schema !== "iris_local_bridge_worker_public_summary_v1" ||
    !["ready", "BLOCKED"].includes(summary.summary_status) ||
    summary.component !== "local_bridge_worker" ||
    !["missing", "active", "stale", "attention"].includes(summary.worker_status) ||
    !["ready", "runtime_waiting"].includes(summary.readiness_state) ||
    typeof summary.production_ready_allowed !== "boolean" ||
    summary.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  const ready =
    summary.worker_status === "active" && summary.production_ready_allowed === true;
  if (
    summary.summary_status !== (ready ? "ready" : "BLOCKED") ||
    summary.readiness_state !== (ready ? "ready" : "runtime_waiting")
  ) {
    throw new ContractError(`${context}: public readiness mismatch`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    LOCAL_BRIDGE_WORKER_PUBLIC_SUMMARY_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLocalBridgeWorkerBlockerAggregation({
  workerStatus = "missing",
} = {}) {
  const status = safeLocalBridgeWorkerLiveStatus(workerStatus);
  const blockerLabel = localBridgeWorkerBlockerLabelForStatus(status);
  const productionBlocker = createProductionBlockerAggregationAdminPage({
    blockers: blockerLabel ? [blockerLabel] : [],
  });
  const aggregation = {
    schema: "iris_local_bridge_worker_blocker_aggregation_v1",
    aggregation_status:
      productionBlocker.total_blocker_count > 0 ? "attention" : "ready",
    component: "local_bridge_worker",
    worker_status: status,
    blocker_label: blockerLabel,
    production_blocker: productionBlocker,
    boundary_policy: Object.fromEntries(
      [...LOCAL_BRIDGE_WORKER_BLOCKER_AGGREGATION_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertLocalBridgeWorkerBlockerAggregationSafe(aggregation);
  return aggregation;
}

export function assertLocalBridgeWorkerBlockerAggregationSafe(
  aggregation,
  context = "local bridge worker blocker aggregation"
) {
  if (!aggregation || typeof aggregation !== "object" || Array.isArray(aggregation)) {
    throw new ContractError(`${context}: aggregation required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(aggregation, context);
  for (const field of Object.keys(aggregation)) {
    if (!LOCAL_BRIDGE_WORKER_BLOCKER_AGGREGATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected aggregation field`);
    }
  }
  if (
    aggregation.schema !== "iris_local_bridge_worker_blocker_aggregation_v1" ||
    aggregation.component !== "local_bridge_worker" ||
    !["missing", "active", "stale", "attention"].includes(
      aggregation.worker_status
    ) ||
    !["ready", "attention"].includes(aggregation.aggregation_status) ||
    aggregation.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid aggregation`);
  }
  const expectedBlocker = localBridgeWorkerBlockerLabelForStatus(
    aggregation.worker_status
  );
  if (aggregation.blocker_label !== expectedBlocker) {
    throw new ContractError(`${context}: worker blocker mismatch`);
  }
  assertProductionBlockerAggregationAdminPageSafe(
    aggregation.production_blocker,
    `${context}: production blocker`
  );
  const expectedCount = expectedBlocker ? 1 : 0;
  if (
    aggregation.production_blocker.total_blocker_count !== expectedCount ||
    aggregation.aggregation_status !== (expectedCount > 0 ? "attention" : "ready")
  ) {
    throw new ContractError(`${context}: production blocker count mismatch`);
  }
  if (expectedBlocker) {
    const [group] = aggregation.production_blocker.blocker_groups;
    if (
      group?.blocker_group_label !== expectedBlocker ||
      group.blocker_count !== 1
    ) {
      throw new ContractError(`${context}: blocker group mismatch`);
    }
  }
  assertBoundaryPolicy(
    aggregation.boundary_policy,
    LOCAL_BRIDGE_WORKER_BLOCKER_AGGREGATION_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLocalBridgeWorkerFixturePack() {
  const missing = createLocalBridgeWorkerLiveCheckManifest({
    workerPresent: false,
    workerStatus: "missing",
  });
  const stale = createLocalBridgeWorkerDryRunStatus({
    workerPresent: true,
    heartbeatAgeMs: 60000,
    staleAfterMs: 30000,
  });
  const ready = createLocalBridgeWorkerLiveCheckManifest({
    workerPresent: true,
    workerStatus: "active",
  });
  const cases = [
    localBridgeWorkerFixtureCase({
      fixtureLabel: "missing",
      workerStatus: missing.worker_status,
      productionReadyAllowed: missing.production_ready_allowed,
      expectedResult: "blocked",
      blockerLabel: "worker_missing",
    }),
    localBridgeWorkerFixtureCase({
      fixtureLabel: "stale",
      workerStatus: "stale",
      productionReadyAllowed: stale.production_ready_allowed,
      expectedResult: "blocked",
      blockerLabel: "stale_heartbeat",
    }),
    localBridgeWorkerFixtureCase({
      fixtureLabel: "node_repl_only",
      workerStatus: "missing",
      productionReadyAllowed: false,
      expectedResult: "blocked",
      blockerLabel: "worker_missing",
    }),
    localBridgeWorkerFixtureCase({
      fixtureLabel: "raw_payload_leak",
      workerStatus: "attention",
      productionReadyAllowed: false,
      expectedResult: "rejected",
      blockerLabel: "worker_attention",
      redactionStatus: "redacted",
    }),
    localBridgeWorkerFixtureCase({
      fixtureLabel: "ready",
      workerStatus: ready.worker_status,
      productionReadyAllowed: ready.production_ready_allowed,
      expectedResult: "ready",
      blockerLabel: null,
    }),
  ];
  const pack = {
    schema: "iris_local_bridge_worker_fixture_pack_v1",
    pack_status: cases.every((fixtureCase) =>
      ["blocked", "rejected", "ready"].includes(fixtureCase.expected_result)
    )
      ? "pass"
      : "blocked",
    fixture_count: cases.length,
    fixture_cases: cases,
    blocker_aggregation_count: cases.filter((fixtureCase) => fixtureCase.blocker_label)
      .length,
    boundary_policy: Object.fromEntries(
      [...LOCAL_BRIDGE_WORKER_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertLocalBridgeWorkerFixturePackSafe(pack);
  return pack;
}

export function assertLocalBridgeWorkerFixturePackSafe(
  pack,
  context = "local bridge worker fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!LOCAL_BRIDGE_WORKER_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_local_bridge_worker_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixture_cases) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "missing",
    "stale",
    "node_repl_only",
    "raw_payload_leak",
    "ready",
  ]);
  let aggregationCount = 0;
  for (const fixtureCase of pack.fixture_cases) {
    assertLocalBridgeWorkerFixtureCaseSafe(fixtureCase, context);
    requiredLabels.delete(fixtureCase.fixture_label);
    if (fixtureCase.blocker_label) aggregationCount += 1;
  }
  if (
    requiredLabels.size !== 0 ||
    pack.fixture_count !== pack.fixture_cases.length ||
    pack.blocker_aggregation_count !== aggregationCount
  ) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    LOCAL_BRIDGE_WORKER_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createTtsLiveReadinessChecklist({
  engineHealthStatus = "missing",
  voiceSourceStatus = "placeholder",
  licenseStatus = "operator_attention_required",
  placeholderPolicyStatus = "separated",
} = {}) {
  const checks = [
    ttsLiveReadinessCheck(
      "engine_health",
      safeTtsLiveEngineHealthStatus(engineHealthStatus)
    ),
    ttsLiveReadinessCheck(
      "voice_source",
      safeTtsLiveVoiceSourceStatus(voiceSourceStatus)
    ),
    ttsLiveReadinessCheck(
      "license_status",
      safeTtsLiveLicenseStatus(licenseStatus)
    ),
    ttsLiveReadinessCheck(
      "placeholder_policy",
      safeTtsLivePlaceholderPolicyStatus(placeholderPolicyStatus)
    ),
  ];
  const readyCheckCount = checks.filter((check) => check.ready_allowed).length;
  const checklist = {
    schema: "iris_tts_live_readiness_checklist_v1",
    checklist_status:
      readyCheckCount === checks.length ? "ready" : "operator_attention_required",
    check_count: checks.length,
    ready_check_count: readyCheckCount,
    attention_check_count: checks.length - readyCheckCount,
    checks,
    boundary_policy: Object.fromEntries(
      [...TTS_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertTtsLiveReadinessChecklistSafe(checklist);
  return checklist;
}

export function assertTtsLiveReadinessChecklistSafe(
  checklist,
  context = "TTS live readiness checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(checklist, context);
  for (const field of Object.keys(checklist)) {
    if (!TTS_LIVE_READINESS_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`);
    }
  }
  if (
    checklist.schema !== "iris_tts_live_readiness_checklist_v1" ||
    !["ready", "operator_attention_required"].includes(checklist.checklist_status) ||
    !Array.isArray(checklist.checks) ||
    checklist.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid checklist`);
  }
  const requiredLabels = new Set([
    "engine_health",
    "voice_source",
    "license_status",
    "placeholder_policy",
  ]);
  let readyCount = 0;
  for (const check of checklist.checks) {
    assertTtsLiveReadinessCheckSafe(check, context);
    requiredLabels.delete(check.check_label);
    if (check.ready_allowed) readyCount += 1;
  }
  if (
    requiredLabels.size !== 0 ||
    checklist.check_count !== checklist.checks.length ||
    checklist.ready_check_count !== readyCount ||
    checklist.attention_check_count !== checklist.checks.length - readyCount ||
    checklist.checklist_status !==
      (readyCount === checklist.checks.length
        ? "ready"
        : "operator_attention_required")
  ) {
    throw new ContractError(`${context}: checklist count mismatch`);
  }
  assertBoundaryPolicy(
    checklist.boundary_policy,
    TTS_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createTtsLiveDryRunFixturePack() {
  const fixtures = [
    ttsLiveDryRunFixture({
      fixtureLabel: "engine_missing",
      checklist: createTtsLiveReadinessChecklist({
        engineHealthStatus: "missing",
        voiceSourceStatus: "licensed_real_voice",
        licenseStatus: "licensed_verified",
        placeholderPolicyStatus: "separated",
      }),
      expectedResult: "blocked",
    }),
    ttsLiveDryRunFixture({
      fixtureLabel: "license_missing",
      checklist: createTtsLiveReadinessChecklist({
        engineHealthStatus: "healthy",
        voiceSourceStatus: "licensed_real_voice",
        licenseStatus: "operator_attention_required",
        placeholderPolicyStatus: "separated",
      }),
      expectedResult: "attention",
    }),
    ttsLiveDryRunFixture({
      fixtureLabel: "placeholder",
      checklist: createTtsLiveReadinessChecklist({
        engineHealthStatus: "healthy",
        voiceSourceStatus: "placeholder",
        licenseStatus: "licensed_verified",
        placeholderPolicyStatus: "separated",
      }),
      expectedResult: "attention",
    }),
    ttsLiveDryRunFixture({
      fixtureLabel: "credential_leak",
      checklist: createTtsLiveReadinessChecklist({
        engineHealthStatus: "healthy",
        voiceSourceStatus: "licensed_real_voice",
        licenseStatus: "licensed_verified",
        placeholderPolicyStatus: "separated",
      }),
      expectedResult: "rejected",
      redactionStatus: "redacted",
    }),
  ];
  const pack = {
    schema: "iris_tts_live_dry_run_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...TTS_LIVE_DRY_RUN_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertTtsLiveDryRunFixturePackSafe(pack);
  return pack;
}

export function assertTtsLiveDryRunFixturePackSafe(
  pack,
  context = "TTS live dry-run fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!TTS_LIVE_DRY_RUN_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_tts_live_dry_run_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "engine_missing",
    "license_missing",
    "placeholder",
    "credential_leak",
  ]);
  for (const fixture of pack.fixtures) {
    assertTtsLiveDryRunFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    TTS_LIVE_DRY_RUN_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLive2dLiveReadinessChecklist({
  rendererHealthStatus = "missing",
  modelConfiguredStatus = "missing",
  cueCapabilityStatus = "unsupported",
  recoverySupportStatus = "missing",
} = {}) {
  const checks = [
    live2dLiveReadinessCheck(
      "renderer_health",
      safeLive2dLiveRendererHealthStatus(rendererHealthStatus)
    ),
    live2dLiveReadinessCheck(
      "model_configured",
      safeLive2dLiveConfiguredStatus(modelConfiguredStatus)
    ),
    live2dLiveReadinessCheck(
      "cue_capability",
      safeLive2dLiveCapabilityStatus(cueCapabilityStatus)
    ),
    live2dLiveReadinessCheck(
      "recovery_support",
      safeLive2dLiveCapabilityStatus(recoverySupportStatus)
    ),
  ];
  const readyCheckCount = checks.filter((check) => check.ready_allowed).length;
  const checklist = {
    schema: "iris_live2d_live_readiness_checklist_v1",
    checklist_status:
      readyCheckCount === checks.length ? "ready" : "operator_attention_required",
    check_count: checks.length,
    ready_check_count: readyCheckCount,
    attention_check_count: checks.length - readyCheckCount,
    checks,
    boundary_policy: Object.fromEntries(
      [...LIVE2D_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertLive2dLiveReadinessChecklistSafe(checklist);
  return checklist;
}

export function assertLive2dLiveReadinessChecklistSafe(
  checklist,
  context = "Live2D live readiness checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(checklist, context);
  for (const field of Object.keys(checklist)) {
    if (!LIVE2D_LIVE_READINESS_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`);
    }
  }
  if (
    checklist.schema !== "iris_live2d_live_readiness_checklist_v1" ||
    !["ready", "operator_attention_required"].includes(checklist.checklist_status) ||
    !Array.isArray(checklist.checks) ||
    checklist.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid checklist`);
  }
  const requiredLabels = new Set([
    "renderer_health",
    "model_configured",
    "cue_capability",
    "recovery_support",
  ]);
  let readyCount = 0;
  for (const check of checklist.checks) {
    assertLive2dLiveReadinessCheckSafe(check, context);
    requiredLabels.delete(check.check_label);
    if (check.ready_allowed) readyCount += 1;
  }
  if (
    requiredLabels.size !== 0 ||
    checklist.check_count !== checklist.checks.length ||
    checklist.ready_check_count !== readyCount ||
    checklist.attention_check_count !== checklist.checks.length - readyCount ||
    checklist.checklist_status !==
      (readyCount === checklist.checks.length
        ? "ready"
        : "operator_attention_required")
  ) {
    throw new ContractError(`${context}: checklist count mismatch`);
  }
  assertBoundaryPolicy(
    checklist.boundary_policy,
    LIVE2D_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLive2dLiveFixturePack() {
  const fixtures = [
    live2dLiveFixture({
      fixtureLabel: "missing_renderer",
      checklist: createLive2dLiveReadinessChecklist({
        rendererHealthStatus: "missing",
        modelConfiguredStatus: "configured",
        cueCapabilityStatus: "supported",
        recoverySupportStatus: "supported",
      }),
      expectedResult: "blocked",
    }),
    live2dLiveFixture({
      fixtureLabel: "stale_heartbeat",
      checklist: createLive2dLiveReadinessChecklist({
        rendererHealthStatus: "stale",
        modelConfiguredStatus: "configured",
        cueCapabilityStatus: "supported",
        recoverySupportStatus: "supported",
      }),
      expectedResult: "attention",
    }),
    live2dLiveFixture({
      fixtureLabel: "unsupported_cue",
      checklist: createLive2dLiveReadinessChecklist({
        rendererHealthStatus: "healthy",
        modelConfiguredStatus: "configured",
        cueCapabilityStatus: "unsupported",
        recoverySupportStatus: "supported",
      }),
      expectedResult: "rejected",
    }),
    live2dLiveFixture({
      fixtureLabel: "recovery_missing",
      checklist: createLive2dLiveReadinessChecklist({
        rendererHealthStatus: "healthy",
        modelConfiguredStatus: "configured",
        cueCapabilityStatus: "supported",
        recoverySupportStatus: "missing",
      }),
      expectedResult: "attention",
    }),
    live2dLiveFixture({
      fixtureLabel: "model_material_leak",
      checklist: createLive2dLiveReadinessChecklist({
        rendererHealthStatus: "healthy",
        modelConfiguredStatus: "configured",
        cueCapabilityStatus: "supported",
        recoverySupportStatus: "supported",
      }),
      expectedResult: "rejected",
      redactionStatus: "redacted",
    }),
  ];
  const pack = {
    schema: "iris_live2d_live_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...LIVE2D_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertLive2dLiveFixturePackSafe(pack);
  return pack;
}

export function assertLive2dLiveFixturePackSafe(
  pack,
  context = "Live2D live fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!LIVE2D_LIVE_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_live2d_live_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "missing_renderer",
    "stale_heartbeat",
    "unsupported_cue",
    "recovery_missing",
    "model_material_leak",
  ]);
  for (const fixture of pack.fixtures) {
    assertLive2dLiveFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    LIVE2D_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createSubtitleEngineLiveReadinessChecklist({
  engineStatus = "missing",
  syncSourceStatus = "missing",
  safeAreaStatus = "missing",
  lineBreakStatus = "missing",
  rtlSupportStatus = "unsupported",
} = {}) {
  const checks = [
    subtitleEngineLiveReadinessCheck(
      "subtitle_engine",
      safeSubtitleEngineLiveRequiredStatus(engineStatus)
    ),
    subtitleEngineLiveReadinessCheck(
      "sync_source",
      safeSubtitleEngineLiveRequiredStatus(syncSourceStatus)
    ),
    subtitleEngineLiveReadinessCheck(
      "safe_area",
      safeSubtitleEngineLiveRequiredStatus(safeAreaStatus)
    ),
    subtitleEngineLiveReadinessCheck(
      "line_break",
      safeSubtitleEngineLiveRequiredStatus(lineBreakStatus)
    ),
    subtitleEngineLiveReadinessCheck(
      "rtl_support",
      safeSubtitleEngineLiveOptionalStatus(rtlSupportStatus)
    ),
  ];
  const readyCheckCount = checks.filter((check) => check.ready_allowed).length;
  const checklist = {
    schema: "iris_subtitle_engine_live_readiness_checklist_v1",
    checklist_status:
      readyCheckCount === checks.length ? "ready" : "operator_attention_required",
    check_count: checks.length,
    ready_check_count: readyCheckCount,
    attention_check_count: checks.length - readyCheckCount,
    checks,
    boundary_policy: Object.fromEntries(
      [...SUBTITLE_ENGINE_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertSubtitleEngineLiveReadinessChecklistSafe(checklist);
  return checklist;
}

export function assertSubtitleEngineLiveReadinessChecklistSafe(
  checklist,
  context = "subtitle engine live readiness checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(checklist, context);
  for (const field of Object.keys(checklist)) {
    if (!SUBTITLE_ENGINE_LIVE_READINESS_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`);
    }
  }
  if (
    checklist.schema !== "iris_subtitle_engine_live_readiness_checklist_v1" ||
    !["ready", "operator_attention_required"].includes(checklist.checklist_status) ||
    !Array.isArray(checklist.checks) ||
    checklist.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid checklist`);
  }
  const requiredLabels = new Set([
    "subtitle_engine",
    "sync_source",
    "safe_area",
    "line_break",
    "rtl_support",
  ]);
  let readyCount = 0;
  for (const check of checklist.checks) {
    assertSubtitleEngineLiveReadinessCheckSafe(check, context);
    requiredLabels.delete(check.check_label);
    if (check.ready_allowed) readyCount += 1;
  }
  if (
    requiredLabels.size !== 0 ||
    checklist.check_count !== checklist.checks.length ||
    checklist.ready_check_count !== readyCount ||
    checklist.attention_check_count !== checklist.checks.length - readyCount ||
    checklist.checklist_status !==
      (readyCount === checklist.checks.length
        ? "ready"
        : "operator_attention_required")
  ) {
    throw new ContractError(`${context}: checklist count mismatch`);
  }
  assertBoundaryPolicy(
    checklist.boundary_policy,
    SUBTITLE_ENGINE_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createSubtitleEnginePublicState({
  subtitleStatus = "enabled",
  syncStatus = "ready",
  safeAreaStatus = "configured",
  lineBreakStatus = "configured",
  rtlStatus = "supported",
} = {}) {
  const publicState = {
    schema: "iris_subtitle_engine_public_state_v1",
    public_state_status: "safe",
    subtitle_status: safeSubtitlePublicStateStatus(subtitleStatus),
    sync_status: safeSubtitlePublicStateStatus(syncStatus),
    safe_area_status: safeSubtitlePublicStateStatus(safeAreaStatus),
    line_break_status: safeSubtitlePublicStateStatus(lineBreakStatus),
    rtl_status: safeSubtitlePublicStateStatus(rtlStatus),
    boundary_policy: Object.fromEntries(
      [...SUBTITLE_ENGINE_PUBLIC_STATE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertSubtitleEnginePublicStateSafe(publicState);
  return publicState;
}

export function assertSubtitleEnginePublicStateSafe(
  publicState,
  context = "subtitle engine public state"
) {
  if (!publicState || typeof publicState !== "object" || Array.isArray(publicState)) {
    throw new ContractError(`${context}: public state required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(publicState, context);
  for (const field of Object.keys(publicState)) {
    if (!SUBTITLE_ENGINE_PUBLIC_STATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected public state field`);
    }
  }
  if (
    publicState.schema !== "iris_subtitle_engine_public_state_v1" ||
    publicState.public_state_status !== "safe" ||
    publicState.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid public state`);
  }
  for (const field of [
    "subtitle_status",
    "sync_status",
    "safe_area_status",
    "line_break_status",
    "rtl_status",
  ]) {
    if (!safeSubtitlePublicStateStatus(publicState[field])) {
      throw new ContractError(`${context}: unsafe status label`);
    }
  }
  assertBoundaryPolicy(
    publicState.boundary_policy,
    SUBTITLE_ENGINE_PUBLIC_STATE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createSubtitleEngineFixturePack() {
  const fixtures = [
    subtitleEngineFixture({
      fixtureLabel: "missing_engine",
      checklist: createSubtitleEngineLiveReadinessChecklist({
        engineStatus: "missing",
        syncSourceStatus: "configured",
        safeAreaStatus: "configured",
        lineBreakStatus: "configured",
        rtlSupportStatus: "supported",
      }),
      expectedResult: "blocked",
    }),
    subtitleEngineFixture({
      fixtureLabel: "sync_missing",
      checklist: createSubtitleEngineLiveReadinessChecklist({
        engineStatus: "configured",
        syncSourceStatus: "missing",
        safeAreaStatus: "configured",
        lineBreakStatus: "configured",
        rtlSupportStatus: "supported",
      }),
      expectedResult: "blocked",
    }),
    subtitleEngineFixture({
      fixtureLabel: "raw_cue_leak",
      checklist: createSubtitleEngineLiveReadinessChecklist({
        engineStatus: "configured",
        syncSourceStatus: "configured",
        safeAreaStatus: "configured",
        lineBreakStatus: "configured",
        rtlSupportStatus: "supported",
      }),
      expectedResult: "rejected",
      redactionStatus: "redacted",
    }),
    subtitleEngineFixture({
      fixtureLabel: "command_contamination",
      checklist: createSubtitleEngineLiveReadinessChecklist({
        engineStatus: "configured",
        syncSourceStatus: "configured",
        safeAreaStatus: "configured",
        lineBreakStatus: "configured",
        rtlSupportStatus: "supported",
      }),
      expectedResult: "rejected",
      redactionStatus: "redacted",
    }),
  ];
  const pack = {
    schema: "iris_subtitle_engine_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...SUBTITLE_ENGINE_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertSubtitleEngineFixturePackSafe(pack);
  return pack;
}

export function assertSubtitleEngineFixturePackSafe(
  pack,
  context = "subtitle engine fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!SUBTITLE_ENGINE_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_subtitle_engine_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "missing_engine",
    "sync_missing",
    "raw_cue_leak",
    "command_contamination",
  ]);
  for (const fixture of pack.fixtures) {
    assertSubtitleEngineFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    SUBTITLE_ENGINE_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createObsLiveReadinessChecklist({
  obsStatus = "missing",
  browserSourceStatus = "missing",
  overlayPickupStatus = "missing",
  heartbeatStatus = "missing",
  artifactFreshnessStatus = "missing",
} = {}) {
  const checks = [
    obsLiveReadinessCheck("obs_running", safeObsLiveRequiredStatus(obsStatus)),
    obsLiveReadinessCheck(
      "browser_source",
      safeObsLiveRequiredStatus(browserSourceStatus)
    ),
    obsLiveReadinessCheck(
      "overlay_pickup",
      safeObsLiveRequiredStatus(overlayPickupStatus)
    ),
    obsLiveReadinessCheck("heartbeat", safeObsLiveFreshnessStatus(heartbeatStatus)),
    obsLiveReadinessCheck(
      "artifact_freshness",
      safeObsLiveFreshnessStatus(artifactFreshnessStatus)
    ),
  ];
  const readyCheckCount = checks.filter((check) => check.ready_allowed).length;
  const checklist = {
    schema: "iris_obs_live_readiness_checklist_v1",
    checklist_status:
      readyCheckCount === checks.length ? "ready" : "operator_attention_required",
    check_count: checks.length,
    ready_check_count: readyCheckCount,
    attention_check_count: checks.length - readyCheckCount,
    checks,
    boundary_policy: Object.fromEntries(
      [...OBS_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertObsLiveReadinessChecklistSafe(checklist);
  return checklist;
}

export function assertObsLiveReadinessChecklistSafe(
  checklist,
  context = "OBS live readiness checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(checklist, context);
  for (const field of Object.keys(checklist)) {
    if (!OBS_LIVE_READINESS_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`);
    }
  }
  if (
    checklist.schema !== "iris_obs_live_readiness_checklist_v1" ||
    !["ready", "operator_attention_required"].includes(checklist.checklist_status) ||
    !Array.isArray(checklist.checks) ||
    checklist.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid checklist`);
  }
  const requiredLabels = new Set([
    "obs_running",
    "browser_source",
    "overlay_pickup",
    "heartbeat",
    "artifact_freshness",
  ]);
  let readyCount = 0;
  for (const check of checklist.checks) {
    assertObsLiveReadinessCheckSafe(check, context);
    requiredLabels.delete(check.check_label);
    if (check.ready_allowed) readyCount += 1;
  }
  if (
    requiredLabels.size !== 0 ||
    checklist.check_count !== checklist.checks.length ||
    checklist.ready_check_count !== readyCount ||
    checklist.attention_check_count !== checklist.checks.length - readyCount ||
    checklist.checklist_status !==
      (readyCount === checklist.checks.length
        ? "ready"
        : "operator_attention_required")
  ) {
    throw new ContractError(`${context}: checklist count mismatch`);
  }
  assertBoundaryPolicy(
    checklist.boundary_policy,
    OBS_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createObsLiveFixturePack() {
  const fixtures = [
    obsLiveFixture({
      fixtureLabel: "missing_obs",
      checklist: createObsLiveReadinessChecklist({
        obsStatus: "missing",
        browserSourceStatus: "configured",
        overlayPickupStatus: "configured",
        heartbeatStatus: "fresh",
        artifactFreshnessStatus: "fresh",
      }),
      expectedResult: "blocked",
    }),
    obsLiveFixture({
      fixtureLabel: "missing_browser_source",
      checklist: createObsLiveReadinessChecklist({
        obsStatus: "running",
        browserSourceStatus: "missing",
        overlayPickupStatus: "configured",
        heartbeatStatus: "fresh",
        artifactFreshnessStatus: "fresh",
      }),
      expectedResult: "blocked",
    }),
    obsLiveFixture({
      fixtureLabel: "stale_pickup",
      checklist: createObsLiveReadinessChecklist({
        obsStatus: "running",
        browserSourceStatus: "configured",
        overlayPickupStatus: "stale",
        heartbeatStatus: "fresh",
        artifactFreshnessStatus: "fresh",
      }),
      expectedResult: "attention",
    }),
    obsLiveFixture({
      fixtureLabel: "obs_link_leak",
      checklist: createObsLiveReadinessChecklist({
        obsStatus: "running",
        browserSourceStatus: "configured",
        overlayPickupStatus: "configured",
        heartbeatStatus: "fresh",
        artifactFreshnessStatus: "fresh",
      }),
      expectedResult: "rejected",
      redactionStatus: "redacted",
    }),
    obsLiveFixture({
      fixtureLabel: "unconfirmed_mutation",
      checklist: createObsLiveReadinessChecklist({
        obsStatus: "running",
        browserSourceStatus: "configured",
        overlayPickupStatus: "configured",
        heartbeatStatus: "fresh",
        artifactFreshnessStatus: "fresh",
      }),
      expectedResult: "blocked",
      confirmationRequired: true,
    }),
  ];
  const pack = {
    schema: "iris_obs_live_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...OBS_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertObsLiveFixturePackSafe(pack);
  return pack;
}

export function assertObsLiveFixturePackSafe(
  pack,
  context = "OBS live fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!OBS_LIVE_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_obs_live_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "missing_obs",
    "missing_browser_source",
    "stale_pickup",
    "obs_link_leak",
    "unconfirmed_mutation",
  ]);
  for (const fixture of pack.fixtures) {
    assertObsLiveFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    OBS_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createDbLiveReadinessChecklist({
  postgresConfiguredStatus = "missing",
  schemaStatus = "missing",
  indexStatus = "missing",
  migrationStatus = "missing",
  backupStatus = "missing",
  restoreRehearsalStatus = "missing",
} = {}) {
  const checks = [
    dbLiveReadinessCheck(
      "postgres_configured",
      safeDbLiveRequiredStatus(postgresConfiguredStatus)
    ),
    dbLiveReadinessCheck("schema", safeDbLiveRequiredStatus(schemaStatus)),
    dbLiveReadinessCheck("index", safeDbLiveRequiredStatus(indexStatus)),
    dbLiveReadinessCheck("migration", safeDbLiveRequiredStatus(migrationStatus)),
    dbLiveReadinessCheck("backup", safeDbLiveRequiredStatus(backupStatus)),
    dbLiveReadinessCheck(
      "restore_rehearsal",
      safeDbLiveRequiredStatus(restoreRehearsalStatus)
    ),
  ];
  const readyCheckCount = checks.filter((check) => check.ready_allowed).length;
  const checklist = {
    schema: "iris_db_live_readiness_checklist_v1",
    checklist_status:
      readyCheckCount === checks.length ? "ready" : "operator_attention_required",
    check_count: checks.length,
    ready_check_count: readyCheckCount,
    attention_check_count: checks.length - readyCheckCount,
    checks,
    boundary_policy: Object.fromEntries(
      [...DB_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertDbLiveReadinessChecklistSafe(checklist);
  return checklist;
}

export function assertDbLiveReadinessChecklistSafe(
  checklist,
  context = "DB live readiness checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(checklist, context);
  for (const field of Object.keys(checklist)) {
    if (!DB_LIVE_READINESS_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`);
    }
  }
  if (
    checklist.schema !== "iris_db_live_readiness_checklist_v1" ||
    !["ready", "operator_attention_required"].includes(checklist.checklist_status) ||
    !Array.isArray(checklist.checks) ||
    checklist.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid checklist`);
  }
  const requiredLabels = new Set([
    "postgres_configured",
    "schema",
    "index",
    "migration",
    "backup",
    "restore_rehearsal",
  ]);
  let readyCount = 0;
  for (const check of checklist.checks) {
    assertDbLiveReadinessCheckSafe(check, context);
    requiredLabels.delete(check.check_label);
    if (check.ready_allowed) readyCount += 1;
  }
  if (
    requiredLabels.size !== 0 ||
    checklist.check_count !== checklist.checks.length ||
    checklist.ready_check_count !== readyCount ||
    checklist.attention_check_count !== checklist.checks.length - readyCount ||
    checklist.checklist_status !==
      (readyCount === checklist.checks.length
        ? "ready"
        : "operator_attention_required")
  ) {
    throw new ContractError(`${context}: checklist count mismatch`);
  }
  assertBoundaryPolicy(
    checklist.boundary_policy,
    DB_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createDbLiveFixturePack() {
  const fixtures = [
    dbLiveFixture({
      fixtureLabel: "no_connection",
      checklist: createDbLiveReadinessChecklist({
        postgresConfiguredStatus: "unavailable",
        schemaStatus: "verified",
        indexStatus: "verified",
        migrationStatus: "ready",
        backupStatus: "ready",
        restoreRehearsalStatus: "verified",
      }),
      expectedResult: "blocked",
    }),
    dbLiveFixture({
      fixtureLabel: "schema_missing",
      checklist: createDbLiveReadinessChecklist({
        postgresConfiguredStatus: "configured",
        schemaStatus: "missing",
        indexStatus: "verified",
        migrationStatus: "ready",
        backupStatus: "ready",
        restoreRehearsalStatus: "verified",
      }),
      expectedResult: "blocked",
    }),
    dbLiveFixture({
      fixtureLabel: "migration_pending",
      checklist: createDbLiveReadinessChecklist({
        postgresConfiguredStatus: "configured",
        schemaStatus: "verified",
        indexStatus: "verified",
        migrationStatus: "pending",
        backupStatus: "ready",
        restoreRehearsalStatus: "verified",
      }),
      expectedResult: "attention",
    }),
    dbLiveFixture({
      fixtureLabel: "backup_stale",
      checklist: createDbLiveReadinessChecklist({
        postgresConfiguredStatus: "configured",
        schemaStatus: "verified",
        indexStatus: "verified",
        migrationStatus: "ready",
        backupStatus: "stale",
        restoreRehearsalStatus: "verified",
      }),
      expectedResult: "attention",
    }),
    dbLiveFixture({
      fixtureLabel: "secret_leak",
      checklist: createDbLiveReadinessChecklist({
        postgresConfiguredStatus: "configured",
        schemaStatus: "verified",
        indexStatus: "verified",
        migrationStatus: "ready",
        backupStatus: "ready",
        restoreRehearsalStatus: "verified",
      }),
      expectedResult: "rejected",
      redactionStatus: "redacted",
    }),
  ];
  const pack = {
    schema: "iris_db_live_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...DB_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
    adapter_validation_required: true,
  };
  assertDbLiveFixturePackSafe(pack);
  return pack;
}

export function assertDbLiveFixturePackSafe(
  pack,
  context = "DB live fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!DB_LIVE_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_db_live_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "no_connection",
    "schema_missing",
    "migration_pending",
    "backup_stale",
    "secret_leak",
  ]);
  for (const fixture of pack.fixtures) {
    assertDbLiveFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    DB_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createYoutubeLiveReadinessChecklist({
  oauthStatus = "missing",
  tokenFreshnessStatus = "missing",
  liveChatIdStatus = "missing",
  pollingStatus = "missing",
  dedupeStatus = "missing",
  moderationStatus = "missing",
} = {}) {
  const checks = [
    youtubeLiveReadinessCheck("oauth", safeYoutubeLiveRequiredStatus(oauthStatus)),
    youtubeLiveReadinessCheck(
      "token_freshness",
      safeYoutubeLiveFreshnessStatus(tokenFreshnessStatus)
    ),
    youtubeLiveReadinessCheck(
      "live_chat_id",
      safeYoutubeLiveFreshnessStatus(liveChatIdStatus)
    ),
    youtubeLiveReadinessCheck(
      "polling",
      safeYoutubeLiveRequiredStatus(pollingStatus)
    ),
    youtubeLiveReadinessCheck(
      "dedupe",
      safeYoutubeLiveRequiredStatus(dedupeStatus)
    ),
    youtubeLiveReadinessCheck(
      "moderation",
      safeYoutubeLiveRequiredStatus(moderationStatus)
    ),
  ];
  const readyCheckCount = checks.filter((check) => check.ready_allowed).length;
  const checklist = {
    schema: "iris_youtube_live_readiness_checklist_v1",
    checklist_status:
      readyCheckCount === checks.length ? "ready" : "operator_attention_required",
    check_count: checks.length,
    ready_check_count: readyCheckCount,
    attention_check_count: checks.length - readyCheckCount,
    checks,
    boundary_policy: Object.fromEntries(
      [...YOUTUBE_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertYoutubeLiveReadinessChecklistSafe(checklist);
  return checklist;
}

export function assertYoutubeLiveReadinessChecklistSafe(
  checklist,
  context = "YouTube live readiness checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(checklist, context);
  for (const field of Object.keys(checklist)) {
    if (!YOUTUBE_LIVE_READINESS_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`);
    }
  }
  if (
    checklist.schema !== "iris_youtube_live_readiness_checklist_v1" ||
    !["ready", "operator_attention_required"].includes(checklist.checklist_status) ||
    !Array.isArray(checklist.checks) ||
    checklist.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid checklist`);
  }
  const requiredLabels = new Set([
    "oauth",
    "token_freshness",
    "live_chat_id",
    "polling",
    "dedupe",
    "moderation",
  ]);
  let readyCount = 0;
  for (const check of checklist.checks) {
    assertYoutubeLiveReadinessCheckSafe(check, context);
    requiredLabels.delete(check.check_label);
    if (check.ready_allowed) readyCount += 1;
  }
  if (
    requiredLabels.size !== 0 ||
    checklist.check_count !== checklist.checks.length ||
    checklist.ready_check_count !== readyCount ||
    checklist.attention_check_count !== checklist.checks.length - readyCount ||
    checklist.checklist_status !==
      (readyCount === checklist.checks.length
        ? "ready"
        : "operator_attention_required")
  ) {
    throw new ContractError(`${context}: checklist count mismatch`);
  }
  assertBoundaryPolicy(
    checklist.boundary_policy,
    YOUTUBE_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createYoutubeLiveFixturePack() {
  const fixtures = [
    youtubeLiveFixture({
      fixtureLabel: "token_expired",
      checklist: createYoutubeLiveReadinessChecklist({
        oauthStatus: "configured",
        tokenFreshnessStatus: "expired",
        liveChatIdStatus: "fresh",
        pollingStatus: "configured",
        dedupeStatus: "verified",
        moderationStatus: "verified",
      }),
      expectedResult: "blocked",
    }),
    youtubeLiveFixture({
      fixtureLabel: "stale_chat_id",
      checklist: createYoutubeLiveReadinessChecklist({
        oauthStatus: "configured",
        tokenFreshnessStatus: "fresh",
        liveChatIdStatus: "stale",
        pollingStatus: "configured",
        dedupeStatus: "verified",
        moderationStatus: "verified",
      }),
      expectedResult: "attention",
    }),
    youtubeLiveFixture({
      fixtureLabel: "moderation_missing",
      checklist: createYoutubeLiveReadinessChecklist({
        oauthStatus: "configured",
        tokenFreshnessStatus: "fresh",
        liveChatIdStatus: "fresh",
        pollingStatus: "configured",
        dedupeStatus: "verified",
        moderationStatus: "missing",
      }),
      expectedResult: "blocked",
    }),
    youtubeLiveFixture({
      fixtureLabel: "raw_api_leak",
      checklist: createYoutubeLiveReadinessChecklist({
        oauthStatus: "configured",
        tokenFreshnessStatus: "fresh",
        liveChatIdStatus: "fresh",
        pollingStatus: "configured",
        dedupeStatus: "verified",
        moderationStatus: "verified",
      }),
      expectedResult: "rejected",
      redactionStatus: "redacted",
    }),
  ];
  const pack = {
    schema: "iris_youtube_live_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...YOUTUBE_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertYoutubeLiveFixturePackSafe(pack);
  return pack;
}

export function assertYoutubeLiveFixturePackSafe(
  pack,
  context = "YouTube live fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!YOUTUBE_LIVE_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_youtube_live_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "token_expired",
    "stale_chat_id",
    "moderation_missing",
    "raw_api_leak",
  ]);
  for (const fixture of pack.fixtures) {
    assertYoutubeLiveFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    YOUTUBE_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createGameLiveReadinessChecklist({
  gameAdapterStatus = "missing",
  safeActionMapStatus = "missing",
  manualApprovalStatus = "missing",
  emergencyStopStatus = "missing",
  cooldownStatus = "missing",
  auditReadinessStatus = "missing",
} = {}) {
  const checks = [
    gameLiveReadinessCheck(
      "game_adapter",
      safeGameLiveRequiredStatus(gameAdapterStatus)
    ),
    gameLiveReadinessCheck(
      "safe_action_map",
      safeGameLiveRequiredStatus(safeActionMapStatus)
    ),
    gameLiveReadinessCheck(
      "manual_approval",
      safeGameLiveRequiredStatus(manualApprovalStatus)
    ),
    gameLiveReadinessCheck(
      "emergency_stop",
      safeGameLiveRequiredStatus(emergencyStopStatus)
    ),
    gameLiveReadinessCheck("cooldown", safeGameLiveRequiredStatus(cooldownStatus)),
    gameLiveReadinessCheck(
      "audit_readiness",
      safeGameLiveRequiredStatus(auditReadinessStatus)
    ),
  ];
  const readyCheckCount = checks.filter((check) => check.ready_allowed).length;
  const checklist = {
    schema: "iris_game_live_readiness_checklist_v1",
    checklist_status:
      readyCheckCount === checks.length ? "ready" : "operator_attention_required",
    check_count: checks.length,
    ready_check_count: readyCheckCount,
    attention_check_count: checks.length - readyCheckCount,
    checks,
    boundary_policy: Object.fromEntries(
      [...GAME_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertGameLiveReadinessChecklistSafe(checklist);
  return checklist;
}

export function assertGameLiveReadinessChecklistSafe(
  checklist,
  context = "Game live readiness checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(checklist, context);
  for (const field of Object.keys(checklist)) {
    if (!GAME_LIVE_READINESS_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`);
    }
  }
  if (
    checklist.schema !== "iris_game_live_readiness_checklist_v1" ||
    !["ready", "operator_attention_required"].includes(checklist.checklist_status) ||
    !Array.isArray(checklist.checks) ||
    checklist.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid checklist`);
  }
  const requiredLabels = new Set([
    "game_adapter",
    "safe_action_map",
    "manual_approval",
    "emergency_stop",
    "cooldown",
    "audit_readiness",
  ]);
  let readyCount = 0;
  for (const check of checklist.checks) {
    assertGameLiveReadinessCheckSafe(check, context);
    requiredLabels.delete(check.check_label);
    if (check.ready_allowed) readyCount += 1;
  }
  if (
    requiredLabels.size !== 0 ||
    checklist.check_count !== checklist.checks.length ||
    checklist.ready_check_count !== readyCount ||
    checklist.attention_check_count !== checklist.checks.length - readyCount ||
    checklist.checklist_status !==
      (readyCount === checklist.checks.length
        ? "ready"
        : "operator_attention_required")
  ) {
    throw new ContractError(`${context}: checklist count mismatch`);
  }
  assertBoundaryPolicy(
    checklist.boundary_policy,
    GAME_LIVE_READINESS_CHECKLIST_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createGameLiveFixturePack() {
  const fixtures = [
    gameLiveFixture({
      fixtureLabel: "missing_safe_map",
      checklist: createGameLiveReadinessChecklist({
        gameAdapterStatus: "fresh",
        safeActionMapStatus: "missing",
        manualApprovalStatus: "verified",
        emergencyStopStatus: "verified",
        cooldownStatus: "verified",
        auditReadinessStatus: "verified",
      }),
      expectedResult: "blocked",
    }),
    gameLiveFixture({
      fixtureLabel: "no_approval",
      checklist: createGameLiveReadinessChecklist({
        gameAdapterStatus: "fresh",
        safeActionMapStatus: "verified",
        manualApprovalStatus: "missing",
        emergencyStopStatus: "verified",
        cooldownStatus: "verified",
        auditReadinessStatus: "verified",
      }),
      expectedResult: "blocked",
    }),
    gameLiveFixture({
      fixtureLabel: "no_emergency_stop",
      checklist: createGameLiveReadinessChecklist({
        gameAdapterStatus: "fresh",
        safeActionMapStatus: "verified",
        manualApprovalStatus: "verified",
        emergencyStopStatus: "missing",
        cooldownStatus: "verified",
        auditReadinessStatus: "verified",
      }),
      expectedResult: "blocked",
    }),
    gameLiveFixture({
      fixtureLabel: "raw_command_leak",
      checklist: createGameLiveReadinessChecklist({
        gameAdapterStatus: "fresh",
        safeActionMapStatus: "verified",
        manualApprovalStatus: "verified",
        emergencyStopStatus: "verified",
        cooldownStatus: "verified",
        auditReadinessStatus: "verified",
      }),
      expectedResult: "rejected",
      redactionStatus: "redacted",
    }),
    gameLiveFixture({
      fixtureLabel: "stale_adapter",
      checklist: createGameLiveReadinessChecklist({
        gameAdapterStatus: "stale",
        safeActionMapStatus: "verified",
        manualApprovalStatus: "verified",
        emergencyStopStatus: "verified",
        cooldownStatus: "verified",
        auditReadinessStatus: "verified",
      }),
      expectedResult: "attention",
    }),
  ];
  const pack = {
    schema: "iris_game_live_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...GAME_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
    adapter_validation_required: true,
  };
  assertGameLiveFixturePackSafe(pack);
  return pack;
}

export function assertGameLiveFixturePackSafe(
  pack,
  context = "Game live fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!GAME_LIVE_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_game_live_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "missing_safe_map",
    "no_approval",
    "no_emergency_stop",
    "raw_command_leak",
    "stale_adapter",
  ]);
  for (const fixture of pack.fixtures) {
    assertGameLiveFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    GAME_LIVE_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLiveProductionGoNoGoClassifier({
  componentStatuses = {},
  ownerConfirmed = false,
  auditEntry = null,
} = {}) {
  const components = [
    "bridge",
    "tts",
    "live2d",
    "subtitle",
    "obs",
    "db",
    "youtube",
    "game",
  ].map((componentLabel) =>
    liveProductionGoNoGoComponent(
      componentLabel,
      componentStatuses[componentLabel]
    )
  );
  const readyCount = components.filter(
    (component) => component.status === "ready"
  ).length;
  const blockerCount = components.filter(
    (component) => component.blocker_present
  ).length;
  const ownerConfirmationStatus =
    ownerConfirmed === true ? "owner_confirmed" : "owner_confirmation_required";
  const hasAuditEntry = auditEntry !== null && auditEntry !== undefined;
  if (hasAuditEntry) {
    assertEmergencyStopSafeAuditEntrySafe(
      auditEntry,
      "dry_run",
      "live production go/no-go audit entry"
    );
  }
  const productionGoAllowed =
    readyCount === components.length &&
    blockerCount === 0 &&
    ownerConfirmationStatus === "owner_confirmed" &&
    hasAuditEntry;
  const classifier = {
    schema: "iris_live_production_go_no_go_classifier_v1",
    classifier_status: productionGoAllowed ? "go" : "no_go",
    component_count: components.length,
    ready_count: readyCount,
    blocker_count:
      blockerCount +
      (ownerConfirmationStatus === "owner_confirmed" ? 0 : 1) +
      (hasAuditEntry ? 0 : 1),
    component_statuses: components,
    owner_confirmation_status: ownerConfirmationStatus,
    audit_entry_required: true,
    audit_entry: hasAuditEntry ? auditEntry : null,
    production_go_allowed: productionGoAllowed,
    boundary_policy: Object.fromEntries(
      [...LIVE_PRODUCTION_GO_NO_GO_CLASSIFIER_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertLiveProductionGoNoGoClassifierSafe(classifier);
  return classifier;
}

export function assertLiveProductionGoNoGoClassifierSafe(
  classifier,
  context = "live production go/no-go classifier"
) {
  if (!classifier || typeof classifier !== "object" || Array.isArray(classifier)) {
    throw new ContractError(`${context}: classifier required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(classifier, context);
  for (const field of Object.keys(classifier)) {
    if (!LIVE_PRODUCTION_GO_NO_GO_CLASSIFIER_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected classifier field`);
    }
  }
  if (
    classifier.schema !== "iris_live_production_go_no_go_classifier_v1" ||
    !["go", "no_go"].includes(classifier.classifier_status) ||
    !Array.isArray(classifier.component_statuses) ||
    !["owner_confirmation_required", "owner_confirmed"].includes(
      classifier.owner_confirmation_status
    ) ||
    classifier.audit_entry_required !== true ||
    typeof classifier.production_go_allowed !== "boolean" ||
    classifier.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid classifier`);
  }
  if (classifier.audit_entry !== null) {
    assertEmergencyStopSafeAuditEntrySafe(
      classifier.audit_entry,
      "dry_run",
      `${context}: audit entry`
    );
  }
  let readyCount = 0;
  let blockerCount = 0;
  const requiredLabels = new Set([
    "bridge",
    "tts",
    "live2d",
    "subtitle",
    "obs",
    "db",
    "youtube",
    "game",
  ]);
  for (const component of classifier.component_statuses) {
    assertLiveProductionGoNoGoComponentSafe(component, context);
    requiredLabels.delete(component.component_label);
    if (component.status === "ready") readyCount += 1;
    if (component.blocker_present) blockerCount += 1;
  }
  const allowed =
    requiredLabels.size === 0 &&
    readyCount === classifier.component_statuses.length &&
    blockerCount === 0 &&
    classifier.owner_confirmation_status === "owner_confirmed" &&
    classifier.audit_entry !== null;
  const expectedBlockerCount =
    blockerCount +
    (classifier.owner_confirmation_status === "owner_confirmed" ? 0 : 1) +
    (classifier.audit_entry !== null ? 0 : 1);
  if (
    requiredLabels.size !== 0 ||
    classifier.component_count !== classifier.component_statuses.length ||
    classifier.ready_count !== readyCount ||
    classifier.blocker_count !== expectedBlockerCount ||
    classifier.production_go_allowed !== allowed ||
    classifier.classifier_status !== (allowed ? "go" : "no_go")
  ) {
    throw new ContractError(`${context}: classifier count mismatch`);
  }
  assertBoundaryPolicy(
    classifier.boundary_policy,
    LIVE_PRODUCTION_GO_NO_GO_CLASSIFIER_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLiveProductionGoNoGoSafeExport({
  classifier = createLiveProductionGoNoGoClassifier(),
} = {}) {
  assertLiveProductionGoNoGoClassifierSafe(
    classifier,
    "live production go/no-go safe export classifier"
  );
  const safeExport = {
    schema: "iris_live_production_go_no_go_safe_export_v1",
    export_status: classifier.production_go_allowed ? "go" : "no_go",
    classifier_status: classifier.classifier_status,
    component_count: classifier.component_count,
    ready_count: classifier.ready_count,
    blocker_count: classifier.blocker_count,
    component_statuses: classifier.component_statuses.map((component) => ({
      schema: component.schema,
      component_label: component.component_label,
      status: component.status,
      blocker_present: component.blocker_present,
    })),
    production_go_allowed: classifier.production_go_allowed,
    boundary_policy: Object.fromEntries(
      [...LIVE_PRODUCTION_GO_NO_GO_SAFE_EXPORT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertLiveProductionGoNoGoSafeExportSafe(safeExport);
  return safeExport;
}

export function assertLiveProductionGoNoGoSafeExportSafe(
  safeExport,
  context = "live production go/no-go safe export"
) {
  if (!safeExport || typeof safeExport !== "object" || Array.isArray(safeExport)) {
    throw new ContractError(`${context}: safe export required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(safeExport, context);
  for (const field of Object.keys(safeExport)) {
    if (!LIVE_PRODUCTION_GO_NO_GO_SAFE_EXPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected safe export field`);
    }
  }
  if (
    safeExport.schema !== "iris_live_production_go_no_go_safe_export_v1" ||
    !["go", "no_go"].includes(safeExport.export_status) ||
    !["go", "no_go"].includes(safeExport.classifier_status) ||
    !Array.isArray(safeExport.component_statuses) ||
    typeof safeExport.production_go_allowed !== "boolean" ||
    safeExport.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid safe export`);
  }
  let readyCount = 0;
  let blockerCount = 0;
  for (const component of safeExport.component_statuses) {
    assertLiveProductionGoNoGoComponentSafe(component, context);
    if (component.status === "ready") readyCount += 1;
    if (component.blocker_present) blockerCount += 1;
  }
  if (
    safeExport.component_count !== safeExport.component_statuses.length ||
    safeExport.ready_count !== readyCount ||
    safeExport.blocker_count < blockerCount ||
    safeExport.production_go_allowed !==
      (safeExport.classifier_status === "go" && safeExport.blocker_count === 0) ||
    safeExport.export_status !== safeExport.classifier_status
  ) {
    throw new ContractError(`${context}: safe export count mismatch`);
  }
  assertBoundaryPolicy(
    safeExport.boundary_policy,
    LIVE_PRODUCTION_GO_NO_GO_SAFE_EXPORT_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

export function createLiveProductionGoNoGoFixturePack() {
  const readyStatuses = {
    bridge: "ready",
    tts: "ready",
    live2d: "ready",
    subtitle: "ready",
    obs: "ready",
    db: "ready",
    youtube: "ready",
    game: "ready",
  };
  const auditEntry = createEmergencyStopAuditRequirement({
    operationType: "dry_run",
    resultStatus: "recorded",
  }).audit_entry;
  const fixtures = [
    liveProductionGoNoGoFixture({
      fixtureLabel: "all_ready",
      classifier: createLiveProductionGoNoGoClassifier({
        componentStatuses: readyStatuses,
        ownerConfirmed: true,
        auditEntry,
      }),
      expectedStatus: "go",
    }),
    liveProductionGoNoGoFixture({
      fixtureLabel: "owner_missing",
      classifier: createLiveProductionGoNoGoClassifier({
        componentStatuses: readyStatuses,
        auditEntry,
      }),
      expectedStatus: "no_go",
    }),
    liveProductionGoNoGoFixture({
      fixtureLabel: "emergency_missing",
      classifier: createLiveProductionGoNoGoClassifier({
        componentStatuses: {
          ...readyStatuses,
          game: "BLOCKED",
        },
        ownerConfirmed: true,
        auditEntry,
      }),
      expectedStatus: "no_go",
    }),
    liveProductionGoNoGoFixture({
      fixtureLabel: "component_blocked",
      classifier: createLiveProductionGoNoGoClassifier({
        componentStatuses: {
          ...readyStatuses,
          db: "missing",
        },
        ownerConfirmed: true,
        auditEntry,
      }),
      expectedStatus: "no_go",
    }),
    liveProductionGoNoGoFixture({
      fixtureLabel: "sensitive_leak",
      classifier: createLiveProductionGoNoGoClassifier({
        componentStatuses: readyStatuses,
        ownerConfirmed: true,
        auditEntry,
      }),
      expectedStatus: "rejected",
    }),
  ];
  const pack = {
    schema: "iris_live_production_go_no_go_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...LIVE_PRODUCTION_GO_NO_GO_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertLiveProductionGoNoGoFixturePackSafe(pack);
  return pack;
}

export function assertLiveProductionGoNoGoFixturePackSafe(
  pack,
  context = "live production go/no-go fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!LIVE_PRODUCTION_GO_NO_GO_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.schema !== "iris_live_production_go_no_go_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    !Array.isArray(pack.fixtures) ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const requiredLabels = new Set([
    "all_ready",
    "owner_missing",
    "emergency_missing",
    "component_blocked",
    "sensitive_leak",
  ]);
  for (const fixture of pack.fixtures) {
    assertLiveProductionGoNoGoFixtureSafe(fixture, context);
    requiredLabels.delete(fixture.fixture_label);
  }
  if (requiredLabels.size !== 0 || pack.fixture_count !== pack.fixtures.length) {
    throw new ContractError(`${context}: fixture coverage mismatch`);
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    LIVE_PRODUCTION_GO_NO_GO_FIXTURE_PACK_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
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

function safeNonNegativeCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function safeProductionLiveStartupStatus(status) {
  const label = safeGateDetailLabel(status);
  return PRODUCTION_LIVE_STARTUP_STATUSES.has(label) ? label : "pending";
}

function safeEmergencyStopStatus(status) {
  const label = safeGateDetailLabel(status);
  if (label === "stop_ready" || label === "verified" || label === "ready") {
    return "stop_ready";
  }
  if (label === "stop_attention" || label === "attention") {
    return "stop_attention";
  }
  return "stop_missing";
}

function safeProductionLivePrerequisiteStatus(status) {
  const label = safeGateDetailLabel(status);
  if (label === "verified" || label === "configured") return "ready";
  if (label === "ready" || label === "attention" || label === "blocked") {
    return label;
  }
  return "blocked";
}

function safeProductionLiveDependencyStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "ready" || label === "verified" || label === "configured"
    ? "ready"
    : "unresolved";
}

function safeLiveDependencyFreshnessStatus(status) {
  const label = safeGateDetailLabel(status);
  if (label === "fresh" || label === "ready" || label === "verified") {
    return "fresh";
  }
  if (label === "stale" || label?.includes("stale")) return "stale";
  return "attention";
}

function safeProductionLiveNoAutoStartStatus(status) {
  const label = safeGateDetailLabel(status);
  if (label === "ready" || label === "attention" || label === "blocked") {
    return label;
  }
  return "blocked";
}

function safeLocalBridgeWorkerLiveStatus(status) {
  const label = safeGateDetailLabel(status);
  if (label === "active" || label === "ready" || label === "verified") {
    return "active";
  }
  if (label === "stale" || label === "runtime_waiting") return "stale";
  if (label === "attention" || label === "degraded") return "attention";
  return "missing";
}

function localBridgeWorkerBlockerLabelForStatus(status) {
  const safeStatus = safeLocalBridgeWorkerLiveStatus(status);
  if (safeStatus === "missing") return "worker_missing";
  if (safeStatus === "stale") return "stale_heartbeat";
  if (safeStatus === "attention") return "worker_attention";
  return null;
}

function localBridgeWorkerFixtureCase({
  fixtureLabel,
  workerStatus,
  expectedResult,
  productionReadyAllowed,
  blockerLabel,
  redactionStatus = "safe",
}) {
  const fixtureCase = {
    schema: "iris_local_bridge_worker_fixture_case_v1",
    fixture_label: fixtureLabel,
    worker_status: safeLocalBridgeWorkerLiveStatus(workerStatus),
    expected_result: expectedResult,
    production_ready_allowed: productionReadyAllowed === true,
    blocker_label: blockerLabel,
    redaction_status: redactionStatus,
  };
  assertLocalBridgeWorkerFixtureCaseSafe(fixtureCase);
  return fixtureCase;
}

function assertLocalBridgeWorkerFixtureCaseSafe(
  fixtureCase,
  context = "local bridge worker fixture case"
) {
  if (!fixtureCase || typeof fixtureCase !== "object" || Array.isArray(fixtureCase)) {
    throw new ContractError(`${context}: fixture case required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixtureCase, context);
  for (const field of Object.keys(fixtureCase)) {
    if (!LOCAL_BRIDGE_WORKER_FIXTURE_CASE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture case field`);
    }
  }
  if (
    fixtureCase.schema !== "iris_local_bridge_worker_fixture_case_v1" ||
    !["missing", "stale", "node_repl_only", "raw_payload_leak", "ready"].includes(
      fixtureCase.fixture_label
    ) ||
    !["missing", "active", "stale", "attention"].includes(
      fixtureCase.worker_status
    ) ||
    !["blocked", "rejected", "ready"].includes(fixtureCase.expected_result) ||
    typeof fixtureCase.production_ready_allowed !== "boolean" ||
    !["safe", "redacted"].includes(fixtureCase.redaction_status)
  ) {
    throw new ContractError(`${context}: invalid fixture case`);
  }
  const expectedBlocker = localBridgeWorkerBlockerLabelForStatus(
    fixtureCase.worker_status
  );
  if (fixtureCase.blocker_label !== expectedBlocker) {
    throw new ContractError(`${context}: blocker label mismatch`);
  }
  if (
    fixtureCase.production_ready_allowed !==
    (fixtureCase.worker_status === "active" && fixtureCase.expected_result === "ready")
  ) {
    throw new ContractError(`${context}: readiness mismatch`);
  }
  if (
    fixtureCase.fixture_label === "raw_payload_leak" &&
    (fixtureCase.expected_result !== "rejected" ||
      fixtureCase.redaction_status !== "redacted")
  ) {
    throw new ContractError(`${context}: leak fixture must be rejected`);
  }
}

function ttsLiveReadinessCheck(checkLabel, status) {
  const check = {
    schema: "iris_tts_live_readiness_check_v1",
    check_label: checkLabel,
    status,
    ready_allowed: status === "ready",
  };
  assertTtsLiveReadinessCheckSafe(check);
  return check;
}

function assertTtsLiveReadinessCheckSafe(
  check,
  context = "TTS live readiness check"
) {
  if (!check || typeof check !== "object" || Array.isArray(check)) {
    throw new ContractError(`${context}: check required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(check, context);
  for (const field of Object.keys(check)) {
    if (!TTS_LIVE_READINESS_CHECK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected check field`);
    }
  }
  if (
    check.schema !== "iris_tts_live_readiness_check_v1" ||
    !["engine_health", "voice_source", "license_status", "placeholder_policy"].includes(
      check.check_label
    ) ||
    !["ready", "BLOCKED", "operator_attention_required"].includes(check.status) ||
    check.ready_allowed !== (check.status === "ready")
  ) {
    throw new ContractError(`${context}: invalid check`);
  }
}

function ttsLiveDryRunFixture({
  fixtureLabel,
  checklist,
  expectedResult,
  redactionStatus = "safe",
}) {
  assertTtsLiveReadinessChecklistSafe(checklist, "TTS live dry-run fixture");
  const fixture = {
    schema: "iris_tts_live_dry_run_fixture_v1",
    fixture_label: fixtureLabel,
    checklist_status: checklist.checklist_status,
    expected_result: expectedResult,
    redaction_status: redactionStatus,
  };
  assertTtsLiveDryRunFixtureSafe(fixture);
  return fixture;
}

function assertTtsLiveDryRunFixtureSafe(
  fixture,
  context = "TTS live dry-run fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!TTS_LIVE_DRY_RUN_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_tts_live_dry_run_fixture_v1" ||
    !["engine_missing", "license_missing", "placeholder", "credential_leak"].includes(
      fixture.fixture_label
    ) ||
    !["ready", "operator_attention_required"].includes(fixture.checklist_status) ||
    !["blocked", "attention", "rejected"].includes(fixture.expected_result) ||
    !["safe", "redacted"].includes(fixture.redaction_status)
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  if (
    fixture.fixture_label !== "credential_leak" &&
    fixture.expected_result !== "blocked" &&
    fixture.expected_result !== "attention"
  ) {
    throw new ContractError(`${context}: non-leak fixture must not be ready`);
  }
  if (
    fixture.fixture_label === "credential_leak" &&
    (fixture.expected_result !== "rejected" ||
      fixture.redaction_status !== "redacted")
  ) {
    throw new ContractError(`${context}: credential material must be rejected`);
  }
}

function live2dLiveReadinessCheck(checkLabel, status) {
  const check = {
    schema: "iris_live2d_live_readiness_check_v1",
    check_label: checkLabel,
    status,
    ready_allowed: status === "ready",
  };
  assertLive2dLiveReadinessCheckSafe(check);
  return check;
}

function assertLive2dLiveReadinessCheckSafe(
  check,
  context = "Live2D live readiness check"
) {
  if (!check || typeof check !== "object" || Array.isArray(check)) {
    throw new ContractError(`${context}: check required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(check, context);
  for (const field of Object.keys(check)) {
    if (!LIVE2D_LIVE_READINESS_CHECK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected check field`);
    }
  }
  if (
    check.schema !== "iris_live2d_live_readiness_check_v1" ||
    ![
      "renderer_health",
      "model_configured",
      "cue_capability",
      "recovery_support",
    ].includes(check.check_label) ||
    !["ready", "BLOCKED", "operator_attention_required"].includes(check.status) ||
    check.ready_allowed !== (check.status === "ready")
  ) {
    throw new ContractError(`${context}: invalid check`);
  }
}

function live2dLiveFixture({
  fixtureLabel,
  checklist,
  expectedResult,
  redactionStatus = "safe",
}) {
  assertLive2dLiveReadinessChecklistSafe(checklist, "Live2D live fixture");
  const fixture = {
    schema: "iris_live2d_live_fixture_v1",
    fixture_label: fixtureLabel,
    checklist_status: checklist.checklist_status,
    expected_result: expectedResult,
    redaction_status: redactionStatus,
  };
  assertLive2dLiveFixtureSafe(fixture);
  return fixture;
}

function assertLive2dLiveFixtureSafe(
  fixture,
  context = "Live2D live fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!LIVE2D_LIVE_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_live2d_live_fixture_v1" ||
    ![
      "missing_renderer",
      "stale_heartbeat",
      "unsupported_cue",
      "recovery_missing",
      "model_material_leak",
    ].includes(fixture.fixture_label) ||
    !["ready", "operator_attention_required"].includes(fixture.checklist_status) ||
    !["blocked", "attention", "rejected"].includes(fixture.expected_result) ||
    !["safe", "redacted"].includes(fixture.redaction_status)
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  if (
    fixture.fixture_label === "model_material_leak" &&
    (fixture.expected_result !== "rejected" ||
      fixture.redaction_status !== "redacted")
  ) {
    throw new ContractError(`${context}: model material leak must be rejected`);
  }
  if (
    fixture.fixture_label !== "model_material_leak" &&
    fixture.expected_result === "rejected" &&
    fixture.fixture_label !== "unsupported_cue"
  ) {
    throw new ContractError(`${context}: invalid rejected fixture`);
  }
}

function subtitleEngineLiveReadinessCheck(checkLabel, status) {
  const check = {
    schema: "iris_subtitle_engine_live_readiness_check_v1",
    check_label: checkLabel,
    status,
    ready_allowed: status === "ready",
  };
  assertSubtitleEngineLiveReadinessCheckSafe(check);
  return check;
}

function assertSubtitleEngineLiveReadinessCheckSafe(
  check,
  context = "subtitle engine live readiness check"
) {
  if (!check || typeof check !== "object" || Array.isArray(check)) {
    throw new ContractError(`${context}: check required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(check, context);
  for (const field of Object.keys(check)) {
    if (!SUBTITLE_ENGINE_LIVE_READINESS_CHECK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected check field`);
    }
  }
  if (
    check.schema !== "iris_subtitle_engine_live_readiness_check_v1" ||
    ![
      "subtitle_engine",
      "sync_source",
      "safe_area",
      "line_break",
      "rtl_support",
    ].includes(check.check_label) ||
    !["ready", "BLOCKED", "operator_attention_required"].includes(check.status) ||
    check.ready_allowed !== (check.status === "ready")
  ) {
    throw new ContractError(`${context}: invalid check`);
  }
}

function subtitleEngineFixture({
  fixtureLabel,
  checklist,
  expectedResult,
  redactionStatus = "safe",
}) {
  assertSubtitleEngineLiveReadinessChecklistSafe(
    checklist,
    "subtitle engine fixture"
  );
  const fixture = {
    schema: "iris_subtitle_engine_fixture_v1",
    fixture_label: fixtureLabel,
    checklist_status: checklist.checklist_status,
    expected_result: expectedResult,
    redaction_status: redactionStatus,
  };
  assertSubtitleEngineFixtureSafe(fixture);
  return fixture;
}

function assertSubtitleEngineFixtureSafe(
  fixture,
  context = "subtitle engine fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!SUBTITLE_ENGINE_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_subtitle_engine_fixture_v1" ||
    ![
      "missing_engine",
      "sync_missing",
      "raw_cue_leak",
      "command_contamination",
    ].includes(fixture.fixture_label) ||
    !["ready", "operator_attention_required"].includes(fixture.checklist_status) ||
    !["blocked", "rejected"].includes(fixture.expected_result) ||
    !["safe", "redacted"].includes(fixture.redaction_status)
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  if (
    ["raw_cue_leak", "command_contamination"].includes(fixture.fixture_label) &&
    (fixture.expected_result !== "rejected" ||
      fixture.redaction_status !== "redacted")
  ) {
    throw new ContractError(`${context}: unsafe fixture must be rejected`);
  }
}

function obsLiveReadinessCheck(checkLabel, status) {
  const check = {
    schema: "iris_obs_live_readiness_check_v1",
    check_label: checkLabel,
    status,
    ready_allowed: status === "ready",
  };
  assertObsLiveReadinessCheckSafe(check);
  return check;
}

function assertObsLiveReadinessCheckSafe(
  check,
  context = "OBS live readiness check"
) {
  if (!check || typeof check !== "object" || Array.isArray(check)) {
    throw new ContractError(`${context}: check required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(check, context);
  for (const field of Object.keys(check)) {
    if (!OBS_LIVE_READINESS_CHECK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected check field`);
    }
  }
  if (
    check.schema !== "iris_obs_live_readiness_check_v1" ||
    ![
      "obs_running",
      "browser_source",
      "overlay_pickup",
      "heartbeat",
      "artifact_freshness",
    ].includes(check.check_label) ||
    !["ready", "BLOCKED", "operator_attention_required"].includes(check.status) ||
    check.ready_allowed !== (check.status === "ready")
  ) {
    throw new ContractError(`${context}: invalid check`);
  }
}

function obsLiveFixture({
  fixtureLabel,
  checklist,
  expectedResult,
  redactionStatus = "safe",
  confirmationRequired = false,
}) {
  assertObsLiveReadinessChecklistSafe(checklist, "OBS live fixture");
  const fixture = {
    schema: "iris_obs_live_fixture_v1",
    fixture_label: fixtureLabel,
    checklist_status: checklist.checklist_status,
    expected_result: expectedResult,
    redaction_status: redactionStatus,
    confirmation_required: confirmationRequired === true,
  };
  assertObsLiveFixtureSafe(fixture);
  return fixture;
}

function assertObsLiveFixtureSafe(fixture, context = "OBS live fixture") {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!OBS_LIVE_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_obs_live_fixture_v1" ||
    ![
      "missing_obs",
      "missing_browser_source",
      "stale_pickup",
      "obs_link_leak",
      "unconfirmed_mutation",
    ].includes(fixture.fixture_label) ||
    !["ready", "operator_attention_required"].includes(fixture.checklist_status) ||
    !["blocked", "attention", "rejected"].includes(fixture.expected_result) ||
    !["safe", "redacted"].includes(fixture.redaction_status) ||
    typeof fixture.confirmation_required !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  if (
    fixture.fixture_label === "obs_link_leak" &&
    (fixture.expected_result !== "rejected" ||
      fixture.redaction_status !== "redacted")
  ) {
    throw new ContractError(`${context}: OBS link leak must be rejected`);
  }
  if (
    fixture.fixture_label === "unconfirmed_mutation" &&
    (fixture.confirmation_required !== true || fixture.expected_result !== "blocked")
  ) {
    throw new ContractError(`${context}: unconfirmed mutation must be blocked`);
  }
}

function dbLiveReadinessCheck(checkLabel, status) {
  const check = {
    schema: "iris_db_live_readiness_check_v1",
    check_label: checkLabel,
    status,
    ready_allowed: status === "ready",
  };
  assertDbLiveReadinessCheckSafe(check);
  return check;
}

function assertDbLiveReadinessCheckSafe(
  check,
  context = "DB live readiness check"
) {
  if (!check || typeof check !== "object" || Array.isArray(check)) {
    throw new ContractError(`${context}: check required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(check, context);
  for (const field of Object.keys(check)) {
    if (!DB_LIVE_READINESS_CHECK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected check field`);
    }
  }
  if (
    check.schema !== "iris_db_live_readiness_check_v1" ||
    ![
      "postgres_configured",
      "schema",
      "index",
      "migration",
      "backup",
      "restore_rehearsal",
    ].includes(check.check_label) ||
    !["ready", "BLOCKED", "operator_attention_required"].includes(check.status) ||
    check.ready_allowed !== (check.status === "ready")
  ) {
    throw new ContractError(`${context}: invalid check`);
  }
}

function dbLiveFixture({
  fixtureLabel,
  checklist,
  expectedResult,
  redactionStatus = "safe",
}) {
  assertDbLiveReadinessChecklistSafe(checklist, "DB live fixture");
  const fixture = {
    schema: "iris_db_live_fixture_v1",
    fixture_label: fixtureLabel,
    checklist_status: checklist.checklist_status,
    expected_result: expectedResult,
    redaction_status: redactionStatus,
  };
  assertDbLiveFixtureSafe(fixture);
  return fixture;
}

function assertDbLiveFixtureSafe(fixture, context = "DB live fixture") {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!DB_LIVE_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_db_live_fixture_v1" ||
    ![
      "no_connection",
      "schema_missing",
      "migration_pending",
      "backup_stale",
      "secret_leak",
    ].includes(fixture.fixture_label) ||
    !["ready", "operator_attention_required"].includes(fixture.checklist_status) ||
    !["blocked", "attention", "rejected"].includes(fixture.expected_result) ||
    !["safe", "redacted"].includes(fixture.redaction_status)
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  if (
    fixture.fixture_label === "secret_leak" &&
    (fixture.expected_result !== "rejected" ||
      fixture.redaction_status !== "redacted")
  ) {
    throw new ContractError(`${context}: secret leak must be rejected`);
  }
}

function youtubeLiveReadinessCheck(checkLabel, status) {
  const check = {
    schema: "iris_youtube_live_readiness_check_v1",
    check_label: checkLabel,
    status,
    ready_allowed: status === "ready",
  };
  assertYoutubeLiveReadinessCheckSafe(check);
  return check;
}

function assertYoutubeLiveReadinessCheckSafe(
  check,
  context = "YouTube live readiness check"
) {
  if (!check || typeof check !== "object" || Array.isArray(check)) {
    throw new ContractError(`${context}: check required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(check, context);
  for (const field of Object.keys(check)) {
    if (!YOUTUBE_LIVE_READINESS_CHECK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected check field`);
    }
  }
  if (
    check.schema !== "iris_youtube_live_readiness_check_v1" ||
    ![
      "oauth",
      "token_freshness",
      "live_chat_id",
      "polling",
      "dedupe",
      "moderation",
    ].includes(check.check_label) ||
    !["ready", "BLOCKED", "operator_attention_required"].includes(check.status) ||
    check.ready_allowed !== (check.status === "ready")
  ) {
    throw new ContractError(`${context}: invalid check`);
  }
}

function youtubeLiveFixture({
  fixtureLabel,
  checklist,
  expectedResult,
  redactionStatus = "safe",
}) {
  const fixture = {
    schema: "iris_youtube_live_fixture_v1",
    fixture_label: fixtureLabel,
    checklist_status: checklist.checklist_status,
    expected_result: expectedResult,
    redaction_status: redactionStatus,
  };
  assertYoutubeLiveFixtureSafe(fixture);
  return fixture;
}

function assertYoutubeLiveFixtureSafe(
  fixture,
  context = "YouTube live fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!YOUTUBE_LIVE_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_youtube_live_fixture_v1" ||
    ![
      "token_expired",
      "stale_chat_id",
      "moderation_missing",
      "raw_api_leak",
    ].includes(fixture.fixture_label) ||
    !["ready", "operator_attention_required"].includes(
      fixture.checklist_status
    ) ||
    !["blocked", "attention", "rejected"].includes(fixture.expected_result) ||
    !["safe", "redacted"].includes(fixture.redaction_status)
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  if (
    fixture.fixture_label === "raw_api_leak" &&
    (fixture.expected_result !== "rejected" ||
      fixture.redaction_status !== "redacted")
  ) {
    throw new ContractError(`${context}: raw API leak must be rejected`);
  }
}

function gameLiveReadinessCheck(checkLabel, status) {
  const check = {
    schema: "iris_game_live_readiness_check_v1",
    check_label: checkLabel,
    status,
    ready_allowed: status === "ready",
  };
  assertGameLiveReadinessCheckSafe(check);
  return check;
}

function assertGameLiveReadinessCheckSafe(
  check,
  context = "Game live readiness check"
) {
  if (!check || typeof check !== "object" || Array.isArray(check)) {
    throw new ContractError(`${context}: check required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(check, context);
  for (const field of Object.keys(check)) {
    if (!GAME_LIVE_READINESS_CHECK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected check field`);
    }
  }
  if (
    check.schema !== "iris_game_live_readiness_check_v1" ||
    ![
      "game_adapter",
      "safe_action_map",
      "manual_approval",
      "emergency_stop",
      "cooldown",
      "audit_readiness",
    ].includes(check.check_label) ||
    !["ready", "BLOCKED", "operator_attention_required"].includes(check.status) ||
    check.ready_allowed !== (check.status === "ready")
  ) {
    throw new ContractError(`${context}: invalid check`);
  }
}

function gameLiveFixture({
  fixtureLabel,
  checklist,
  expectedResult,
  redactionStatus = "safe",
}) {
  const fixture = {
    schema: "iris_game_live_fixture_v1",
    fixture_label: fixtureLabel,
    checklist_status: checklist.checklist_status,
    expected_result: expectedResult,
    redaction_status: redactionStatus,
  };
  assertGameLiveFixtureSafe(fixture);
  return fixture;
}

function assertGameLiveFixtureSafe(fixture, context = "Game live fixture") {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!GAME_LIVE_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_game_live_fixture_v1" ||
    ![
      "missing_safe_map",
      "no_approval",
      "no_emergency_stop",
      "raw_command_leak",
      "stale_adapter",
    ].includes(fixture.fixture_label) ||
    !["ready", "operator_attention_required"].includes(
      fixture.checklist_status
    ) ||
    !["blocked", "attention", "rejected"].includes(fixture.expected_result) ||
    !["safe", "redacted"].includes(fixture.redaction_status)
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  if (
    fixture.fixture_label === "raw_command_leak" &&
    (fixture.expected_result !== "rejected" ||
      fixture.redaction_status !== "redacted")
  ) {
    throw new ContractError(`${context}: raw command leak must be rejected`);
  }
}

function liveProductionGoNoGoComponent(componentLabel, status) {
  const safeStatus = safeLiveProductionComponentStatus(status);
  const component = {
    schema: "iris_live_production_go_no_go_component_v1",
    component_label: componentLabel,
    status: safeStatus,
    blocker_present: safeStatus !== "ready",
  };
  assertLiveProductionGoNoGoComponentSafe(component);
  return component;
}

function assertLiveProductionGoNoGoComponentSafe(
  component,
  context = "live production go/no-go component"
) {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    throw new ContractError(`${context}: component required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(component, context);
  for (const field of Object.keys(component)) {
    if (!LIVE_PRODUCTION_GO_NO_GO_COMPONENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected component field`);
    }
  }
  if (
    component.schema !== "iris_live_production_go_no_go_component_v1" ||
    ![
      "bridge",
      "tts",
      "live2d",
      "subtitle",
      "obs",
      "db",
      "youtube",
      "game",
    ].includes(component.component_label) ||
    !["ready", "BLOCKED", "attention", "degraded"].includes(component.status) ||
    component.blocker_present !== (component.status !== "ready")
  ) {
    throw new ContractError(`${context}: invalid component`);
  }
}

function liveProductionGoNoGoFixture({
  fixtureLabel,
  classifier,
  expectedStatus,
}) {
  const safeExport = createLiveProductionGoNoGoSafeExport({ classifier });
  const fixture = {
    schema: "iris_live_production_go_no_go_fixture_v1",
    fixture_label: fixtureLabel,
    expected_status: expectedStatus,
    safe_export: safeExport,
  };
  assertLiveProductionGoNoGoFixtureSafe(fixture);
  return fixture;
}

function assertLiveProductionGoNoGoFixtureSafe(
  fixture,
  context = "live production go/no-go fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!LIVE_PRODUCTION_GO_NO_GO_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_live_production_go_no_go_fixture_v1" ||
    ![
      "all_ready",
      "owner_missing",
      "emergency_missing",
      "component_blocked",
      "sensitive_leak",
    ].includes(fixture.fixture_label) ||
    !["go", "no_go", "rejected"].includes(fixture.expected_status)
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  assertLiveProductionGoNoGoSafeExportSafe(fixture.safe_export, context);
  if (
    fixture.fixture_label === "sensitive_leak" &&
    fixture.expected_status !== "rejected"
  ) {
    throw new ContractError(`${context}: sensitive leak must be rejected`);
  }
  if (
    fixture.fixture_label !== "sensitive_leak" &&
    fixture.safe_export.export_status !== fixture.expected_status
  ) {
    throw new ContractError(`${context}: fixture expectation mismatch`);
  }
}

function liveReadinessFinalDryRunFixture({
  fixtureLabel,
  expectedStatus,
  route,
}) {
  const fixture = {
    schema: "iris_live_readiness_final_dry_run_fixture_v1",
    fixture_label: fixtureLabel,
    expected_status: expectedStatus,
    route,
  };
  assertLiveReadinessFinalDryRunFixtureSafe(fixture);
  return fixture;
}

function assertLiveReadinessFinalDryRunFixtureSafe(
  fixture,
  context = "live readiness final dry-run fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!LIVE_READINESS_FINAL_DRY_RUN_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_live_readiness_final_dry_run_fixture_v1" ||
    ![
      "fixture_pass_real_missing",
      "sensitive_leak",
      "owner_missing",
    ].includes(fixture.fixture_label) ||
    !["attention", "rejected"].includes(fixture.expected_status)
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  assertLiveReadinessFinalDryRunRouteSafe(fixture.route, context);
  if (
    fixture.fixture_label === "sensitive_leak" &&
    fixture.expected_status !== "rejected"
  ) {
    throw new ContractError(`${context}: sensitive leak must be rejected`);
  }
  if (
    fixture.fixture_label !== "sensitive_leak" &&
    fixture.route.route_status !== fixture.expected_status
  ) {
    throw new ContractError(`${context}: fixture expectation mismatch`);
  }
}

function liveReadinessOperatorHandoffStep(stepLabel, status) {
  const step = {
    schema: "iris_live_readiness_operator_handoff_step_v1",
    step_label: stepLabel,
    status: safeOperatorHandoffStepStatus(status),
  };
  assertLiveReadinessOperatorHandoffStepSafe(step);
  return step;
}

function assertLiveReadinessOperatorHandoffStepSafe(
  step,
  context = "live readiness operator handoff step"
) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: step required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(step, context);
  for (const field of Object.keys(step)) {
    if (!LIVE_READINESS_OPERATOR_HANDOFF_STEP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected step field`);
    }
  }
  if (
    step.schema !== "iris_live_readiness_operator_handoff_step_v1" ||
    ![
      "review_final_dry_run",
      "confirm_owner_go_no_go",
      "confirm_emergency_stop",
      "confirm_audit_ready",
      "start_live_components",
    ].includes(step.step_label) ||
    !["attention", "ready"].includes(step.status)
  ) {
    throw new ContractError(`${context}: invalid step`);
  }
}

function createLiveReadinessOperatorHandoffAuditEntry({
  actorRole = "operator",
  resultStatus = "blocked",
  eventAtMs = 0,
} = {}) {
  const safeActorRole = EMERGENCY_STOP_AUDIT_ACTOR_ROLES.has(actorRole)
    ? actorRole
    : "operator";
  const safeResultStatus = EMERGENCY_STOP_AUDIT_RESULT_STATUSES.has(resultStatus)
    ? resultStatus
    : "blocked";
  const entry = {
    schema: "iris_live_readiness_operator_handoff_audit_entry_v1",
    actor_role: safeActorRole,
    action_type: "live_readiness_operator_handoff",
    safe_target_label: "live_readiness_handoff_plan",
    result_status: safeResultStatus,
    event_at_ms: safeTimestampMs(eventAtMs),
    payload_stored_in_audit: false,
  };
  assertLiveReadinessOperatorHandoffAuditEntrySafe(entry);
  return entry;
}

function assertLiveReadinessOperatorHandoffAuditEntrySafe(
  entry,
  context = "live readiness operator handoff audit entry"
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: audit entry required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(entry, context);
  for (const field of Object.keys(entry)) {
    if (!LIVE_READINESS_OPERATOR_HANDOFF_AUDIT_ENTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected audit entry field`);
    }
  }
  if (
    entry.schema !== "iris_live_readiness_operator_handoff_audit_entry_v1" ||
    !EMERGENCY_STOP_AUDIT_ACTOR_ROLES.has(entry.actor_role) ||
    entry.action_type !== "live_readiness_operator_handoff" ||
    entry.safe_target_label !== "live_readiness_handoff_plan" ||
    !EMERGENCY_STOP_AUDIT_RESULT_STATUSES.has(entry.result_status) ||
    !Number.isInteger(entry.event_at_ms) ||
    entry.event_at_ms < 0 ||
    entry.payload_stored_in_audit !== false
  ) {
    throw new ContractError(`${context}: invalid audit entry`);
  }
}

function liveReadinessOperatorHandoffFixture({
  fixtureLabel,
  expectedStatus,
  confirmationStatus,
  auditEntryPresent,
  safePlan,
}) {
  const fixture = {
    schema: "iris_live_readiness_operator_handoff_fixture_v1",
    fixture_label: fixtureLabel,
    expected_status: expectedStatus,
    confirmation_status: confirmationStatus,
    audit_entry_present: auditEntryPresent === true,
    safe_plan: safePlan,
  };
  assertLiveReadinessOperatorHandoffFixtureSafe(fixture);
  return fixture;
}

function assertLiveReadinessOperatorHandoffFixtureSafe(
  fixture,
  context = "live readiness operator handoff fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!LIVE_READINESS_OPERATOR_HANDOFF_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_live_readiness_operator_handoff_fixture_v1" ||
    ![
      "raw_command_leak",
      "missing_confirmation",
      "no_audit",
      "safe_plan",
    ].includes(fixture.fixture_label) ||
    !["ready", "attention", "rejected"].includes(fixture.expected_status) ||
    !["confirmed", "missing"].includes(fixture.confirmation_status) ||
    typeof fixture.audit_entry_present !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  assertLiveReadinessOperatorHandoffPlanSafe(fixture.safe_plan, context);
  if (
    fixture.fixture_label === "raw_command_leak" &&
    fixture.expected_status !== "rejected"
  ) {
    throw new ContractError(`${context}: raw command leak must be rejected`);
  }
  if (
    fixture.fixture_label === "missing_confirmation" &&
    (fixture.confirmation_status !== "missing" ||
      fixture.expected_status !== "attention")
  ) {
    throw new ContractError(`${context}: missing confirmation must not be ready`);
  }
  if (
    fixture.fixture_label === "no_audit" &&
    (fixture.audit_entry_present !== false || fixture.expected_status !== "rejected")
  ) {
    throw new ContractError(`${context}: missing audit must be rejected`);
  }
  if (
    fixture.fixture_label === "safe_plan" &&
    (fixture.safe_plan.plan_status !== "ready" ||
      fixture.confirmation_status !== "confirmed" ||
      fixture.audit_entry_present !== true ||
      fixture.expected_status !== "ready")
  ) {
    throw new ContractError(`${context}: safe plan fixture mismatch`);
  }
}

function operationalRehearsalEntry(
  rehearsalLabel,
  status,
  scriptName,
  mode = "synthetic_fixture"
) {
  const safeMode =
    mode === "real_external_service" ? "real_external_service" : "synthetic_fixture";
  const entry = {
    schema: "iris_operational_rehearsal_entry_v1",
    rehearsal_label: rehearsalLabel,
    mode: safeMode,
    confirmation_required: safeMode === "real_external_service",
    status: safeOperatorHandoffStepStatus(status),
    script_name: scriptName,
  };
  assertOperationalRehearsalEntrySafe(entry);
  return entry;
}

function assertOperationalRehearsalEntrySafe(
  entry,
  context = "operational rehearsal entry"
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: entry required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(entry, context);
  for (const field of Object.keys(entry)) {
    if (!OPERATIONAL_REHEARSAL_ENTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected entry field`);
    }
  }
  if (
    entry.schema !== "iris_operational_rehearsal_entry_v1" ||
    ![
      "emergency_stop",
      "pause_controls",
      "fixture_youtube",
      "tts_preview",
      "live2d_cue",
      "obs_overlay",
      "game_validation",
    ].includes(entry.rehearsal_label) ||
    !["synthetic_fixture", "real_external_service"].includes(entry.mode) ||
    entry.confirmation_required !== (entry.mode === "real_external_service") ||
    !["attention", "ready"].includes(entry.status) ||
    ![
      "npm run dev:emergency-stop:dry-run",
      "npm run dev:pause-controls:dry-run",
      "npm run dev:youtube:relay-readiness-rehearsal",
      "npm run dev:tts:preview-rehearsal",
      "npm run dev:live2d:cue-rehearsal",
      "npm run dev:obs:overlay-rehearsal",
      "npm run dev:game:validation-rehearsal",
    ].includes(entry.script_name)
  ) {
    throw new ContractError(`${context}: invalid entry`);
  }
  assertSafeScriptName(entry.script_name, context);
}

function operationalRehearsalFixture({
  fixtureLabel,
  expectedStatus,
  resultSummary,
  realExternalConfirmed = false,
  packetBodyRejected = false,
  staleResultRejected = false,
}) {
  const fixture = {
    schema: "iris_operational_rehearsal_fixture_v1",
    fixture_label: fixtureLabel,
    expected_status: expectedStatus,
    result_summary: resultSummary,
    synthetic_only_required: fixtureLabel === "synthetic_only",
    real_external_confirmed: realExternalConfirmed,
    packet_body_rejected: packetBodyRejected,
    stale_result_rejected: staleResultRejected,
  };
  assertOperationalRehearsalFixtureSafe(fixture);
  return fixture;
}

function assertOperationalRehearsalFixtureSafe(
  fixture,
  context = "operational rehearsal fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!OPERATIONAL_REHEARSAL_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_operational_rehearsal_fixture_v1" ||
    ![
      "synthetic_only",
      "real_unconfirmed",
      "packet_body_leak",
      "stale_result",
    ].includes(fixture.fixture_label) ||
    !["pass", "fail", "rejected"].includes(fixture.expected_status) ||
    typeof fixture.synthetic_only_required !== "boolean" ||
    typeof fixture.real_external_confirmed !== "boolean" ||
    typeof fixture.packet_body_rejected !== "boolean" ||
    typeof fixture.stale_result_rejected !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  assertOperationalRehearsalResultSummarySafe(
    fixture.result_summary,
    `${context}: result summary`
  );
  if (
    (fixture.fixture_label === "synthetic_only" &&
      (fixture.expected_status !== "pass" ||
        fixture.synthetic_only_required !== true ||
        fixture.result_summary.result_status !== "pass")) ||
    (fixture.fixture_label === "real_unconfirmed" &&
      (fixture.expected_status !== "fail" ||
        fixture.real_external_confirmed !== false ||
        fixture.result_summary.result_status !== "fail")) ||
    (fixture.fixture_label === "packet_body_leak" &&
      (fixture.expected_status !== "rejected" ||
        fixture.packet_body_rejected !== true ||
        fixture.result_summary.result_status !== "fail")) ||
    (fixture.fixture_label === "stale_result" &&
      (fixture.expected_status !== "fail" ||
        fixture.stale_result_rejected !== true ||
        fixture.result_summary.fresh_readiness_allowed !== false))
  ) {
    throw new ContractError(`${context}: fixture expectation mismatch`);
  }
}

function operatorChecklistFixture({
  fixtureLabel,
  expectedStatus,
  startGate,
  degradedRecommendation,
  detailBodyRejected = false,
}) {
  const fixture = {
    schema: "iris_operator_checklist_fixture_v1",
    fixture_label: fixtureLabel,
    expected_status: expectedStatus,
    start_gate: startGate,
    degraded_recommendation: degradedRecommendation,
    detail_body_rejected: detailBodyRejected,
  };
  assertOperatorChecklistFixtureSafe(fixture);
  return fixture;
}

function assertOperatorChecklistFixtureSafe(
  fixture,
  context = "operator checklist fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!OPERATOR_CHECKLIST_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_operator_checklist_fixture_v1" ||
    ![
      "blocker_present",
      "degraded_available",
      "detail_leak_rejected",
      "ready",
    ].includes(fixture.fixture_label) ||
    !["BLOCKED", "degraded_available", "rejected", "ready"].includes(
      fixture.expected_status
    ) ||
    typeof fixture.detail_body_rejected !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  assertOperatorChecklistStreamStartGateSafe(
    fixture.start_gate,
    `${context}: start gate`
  );
  assertOperatorChecklistDegradedModeRecommendationSafe(
    fixture.degraded_recommendation,
    `${context}: degraded recommendation`
  );
  if (
    (fixture.fixture_label === "blocker_present" &&
      (fixture.expected_status !== "BLOCKED" ||
        fixture.start_gate.start_ready !== false ||
        fixture.start_gate.critical_blocker_count < 1)) ||
    (fixture.fixture_label === "degraded_available" &&
      (fixture.expected_status !== "degraded_available" ||
        fixture.degraded_recommendation.degraded_mode_allowed !== true ||
        fixture.start_gate.start_ready !== true)) ||
    (fixture.fixture_label === "detail_leak_rejected" &&
      (fixture.expected_status !== "rejected" ||
        fixture.detail_body_rejected !== true)) ||
    (fixture.fixture_label === "ready" &&
      (fixture.expected_status !== "ready" ||
        fixture.start_gate.start_ready !== true ||
        fixture.degraded_recommendation.recommendation_status !== "ready"))
  ) {
    throw new ContractError(`${context}: fixture expectation mismatch`);
  }
}

function liveProductionAuditReviewEvent(entry) {
  const eventLabel = safeAuditReviewEventLabel(
    entry?.event_label ?? entry?.action_type ?? entry?.safe_target_label
  );
  const status = safeAuditReviewEventStatus(entry?.result_status ?? entry?.status);
  return {
    schema: "iris_live_production_audit_review_event_v1",
    event_label: eventLabel,
    status,
  };
}

function liveProductionAuditFixture({
  fixtureLabel,
  expectedStatus,
  auditReview,
  roleGate,
  sensitiveValueRejected = false,
}) {
  const fixture = {
    schema: "iris_live_production_audit_fixture_v1",
    fixture_label: fixtureLabel,
    expected_status: expectedStatus,
    audit_review: auditReview,
    role_gate: roleGate,
    sensitive_value_rejected: sensitiveValueRejected,
  };
  assertLiveProductionAuditFixtureSafe(fixture);
  return fixture;
}

function assertLiveProductionAuditFixtureSafe(
  fixture,
  context = "live production audit fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!LIVE_PRODUCTION_AUDIT_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_live_production_audit_fixture_v1" ||
    ![
      "missing_audit",
      "role_leak",
      "sensitive_leak",
      "safe_review",
    ].includes(fixture.fixture_label) ||
    !["BLOCKED", "rejected", "ready"].includes(fixture.expected_status) ||
    typeof fixture.sensitive_value_rejected !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  assertLiveProductionAuditReviewPageSafe(
    fixture.audit_review,
    `${context}: audit review`
  );
  assertLiveProductionAuditRoleGateSafe(fixture.role_gate, `${context}: role gate`);
  if (
    (fixture.fixture_label === "missing_audit" &&
      (fixture.expected_status !== "BLOCKED" ||
        fixture.audit_review.production_go_allowed !== false ||
        fixture.audit_review.missing_required_count < 1)) ||
    (fixture.fixture_label === "role_leak" &&
      (fixture.expected_status !== "rejected" ||
        fixture.role_gate.viewer_role !== "ordinary" ||
        fixture.role_gate.detail_visible !== false ||
        fixture.role_gate.safe_detail_labels.length !== 0)) ||
    (fixture.fixture_label === "sensitive_leak" &&
      (fixture.expected_status !== "rejected" ||
        fixture.sensitive_value_rejected !== true ||
        fixture.audit_review.production_go_allowed !== false)) ||
    (fixture.fixture_label === "safe_review" &&
      (fixture.expected_status !== "ready" ||
        fixture.audit_review.production_go_allowed !== true ||
        fixture.role_gate.detail_visible !== true))
  ) {
    throw new ContractError(`${context}: fixture expectation mismatch`);
  }
}

function realReadinessUnresolvedBlockerFixture({
  fixtureLabel,
  expectedStatus,
  blockerReport,
  resolutionTracking,
  sensitiveValueRejected = false,
}) {
  const fixture = {
    schema: "iris_real_readiness_unresolved_blocker_fixture_v1",
    fixture_label: fixtureLabel,
    expected_status: expectedStatus,
    blocker_report: blockerReport,
    resolution_tracking: resolutionTracking,
    sensitive_value_rejected: sensitiveValueRejected,
  };
  assertRealReadinessUnresolvedBlockerFixtureSafe(fixture);
  return fixture;
}

function assertRealReadinessUnresolvedBlockerFixtureSafe(
  fixture,
  context = "real readiness unresolved blocker fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(fixture, context);
  for (const field of Object.keys(fixture)) {
    if (!REAL_READINESS_UNRESOLVED_BLOCKER_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_real_readiness_unresolved_blocker_fixture_v1" ||
    ![
      "stale_evidence",
      "missing_owner",
      "missing_engine",
      "sensitive_leak",
      "resolved_blocker",
    ].includes(fixture.fixture_label) ||
    !["BLOCKED", "rejected", "ready"].includes(fixture.expected_status) ||
    typeof fixture.sensitive_value_rejected !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  assertRealReadinessUnresolvedBlockerReportSafe(
    fixture.blocker_report,
    `${context}: blocker report`
  );
  assertRealReadinessBlockerResolutionTrackingSafe(
    fixture.resolution_tracking,
    `${context}: resolution tracking`
  );
  if (
    (fixture.fixture_label === "stale_evidence" &&
      (fixture.expected_status !== "BLOCKED" ||
        fixture.resolution_tracking.stale_evidence_count < 1 ||
        fixture.resolution_tracking.production_ready_allowed !== false)) ||
    (fixture.fixture_label === "missing_owner" &&
      (fixture.expected_status !== "BLOCKED" ||
        fixture.blocker_report.real_residency_status !== "unconfirmed" ||
        fixture.blocker_report.production_ready_allowed !== false)) ||
    (fixture.fixture_label === "missing_engine" &&
      (fixture.expected_status !== "BLOCKED" ||
        !fixture.blocker_report.blocker_labels.includes("engine_attention"))) ||
    (fixture.fixture_label === "sensitive_leak" &&
      (fixture.expected_status !== "rejected" ||
        fixture.sensitive_value_rejected !== true)) ||
    (fixture.fixture_label === "resolved_blocker" &&
      (fixture.expected_status !== "ready" ||
        fixture.blocker_report.production_ready_allowed !== true ||
        fixture.resolution_tracking.production_ready_allowed !== true))
  ) {
    throw new ContractError(`${context}: fixture expectation mismatch`);
  }
}

function assertLiveProductionAuditReviewEventSafe(
  event,
  context = "live production audit review event"
) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new ContractError(`${context}: event required`);
  }
  assertNoForbiddenProductionLiveReadinessFields(event, context);
  for (const field of Object.keys(event)) {
    if (!LIVE_PRODUCTION_AUDIT_REVIEW_EVENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected event field`);
    }
  }
  if (
    event.schema !== "iris_live_production_audit_review_event_v1" ||
    ![
      "production_go_no_go",
      "emergency_stop",
      "pause_controls",
      "operator_handoff",
      "final_preflight",
      "audit_event",
    ].includes(event.event_label) ||
    !["recorded", "blocked", "missing", "attention"].includes(event.status)
  ) {
    throw new ContractError(`${context}: invalid event`);
  }
}

function safeAuditReviewEventLabel(value) {
  const label = safeGateDetailLabel(value);
  if (!label) return "audit_event";
  if (label.includes("emergency_stop")) return "emergency_stop";
  if (label.includes("pause")) return "pause_controls";
  if (label.includes("handoff")) return "operator_handoff";
  if (label.includes("preflight")) return "final_preflight";
  if (label.includes("go_no_go") || label.includes("go_nogo")) {
    return "production_go_no_go";
  }
  return "audit_event";
}

function safeAuditReviewEventStatus(value) {
  const label = safeGateDetailLabel(value);
  if (label === "recorded" || label === "pass" || label === "verified") {
    return "recorded";
  }
  if (label === "missing") return "missing";
  if (label === "blocked" || label === "fail") return "blocked";
  return "attention";
}

function safeOperatorHandoffStepStatus(status) {
  return ["ready", "verified", "confirmed"].includes(safeGateDetailLabel(status))
    ? "ready"
    : "attention";
}

function safeLiveProductionComponentStatus(status) {
  const label = safeGateDetailLabel(status);
  if (label === "ready" || label === "verified" || label === "fresh") {
    return "ready";
  }
  if (label === "degraded") return "degraded";
  if (label === "attention" || label === "operator_attention_required") {
    return "attention";
  }
  return "BLOCKED";
}

function safeGameLiveRequiredStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "ready" ||
    label === "configured" ||
    label === "verified" ||
    label === "fresh"
    ? "ready"
    : label === "missing" || label === "blocked" || label === "stale"
      ? "BLOCKED"
      : "operator_attention_required";
}

function safeYoutubeLiveRequiredStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "ready" || label === "configured" || label === "verified"
    ? "ready"
    : label === "missing" || label === "blocked" || label === "expired"
      ? "BLOCKED"
      : "operator_attention_required";
}

function safeYoutubeLiveFreshnessStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "ready" || label === "fresh" || label === "verified"
    ? "ready"
    : label === "missing" || label === "blocked" || label === "expired"
      ? "BLOCKED"
      : "operator_attention_required";
}

function safeDbLiveRequiredStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "ready" || label === "configured" || label === "verified"
    ? "ready"
    : label === "missing" || label === "blocked" || label === "unavailable"
      ? "BLOCKED"
      : "operator_attention_required";
}

function safeObsLiveRequiredStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "ready" || label === "configured" || label === "running"
    ? "ready"
    : label === "missing" || label === "blocked"
      ? "BLOCKED"
      : "operator_attention_required";
}

function safeObsLiveFreshnessStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "ready" || label === "fresh"
    ? "ready"
    : label === "missing" || label === "blocked"
      ? "BLOCKED"
      : "operator_attention_required";
}

function safeSubtitleEngineLiveRequiredStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "ready" || label === "configured" || label === "supported"
    ? "ready"
    : label === "missing" || label === "blocked"
      ? "BLOCKED"
      : "operator_attention_required";
}

function safeSubtitleEngineLiveOptionalStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "ready" || label === "configured" || label === "supported"
    ? "ready"
    : "operator_attention_required";
}

function safeSubtitlePublicStateStatus(status) {
  const label = safeGateDetailLabel(status);
  if (
    [
      "enabled",
      "disabled",
      "ready",
      "configured",
      "supported",
      "missing",
      "attention",
      "operator_attention_required",
    ].includes(label)
  ) {
    return label;
  }
  return "operator_attention_required";
}

function safeLive2dLiveRendererHealthStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "ready" || label === "healthy"
    ? "ready"
    : label === "missing" || label === "blocked"
      ? "BLOCKED"
      : "operator_attention_required";
}

function safeLive2dLiveConfiguredStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "configured" || label === "ready"
    ? "ready"
    : "operator_attention_required";
}

function safeLive2dLiveCapabilityStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "supported" || label === "ready"
    ? "ready"
    : "operator_attention_required";
}

function safeTtsLiveEngineHealthStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "ready" || label === "healthy"
    ? "ready"
    : label === "missing" || label === "blocked"
      ? "BLOCKED"
      : "operator_attention_required";
}

function safeTtsLiveVoiceSourceStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "licensed_real_voice" || label === "licensed"
    ? "ready"
    : "operator_attention_required";
}

function safeTtsLiveLicenseStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "licensed_verified" || label === "licensed"
    ? "ready"
    : "operator_attention_required";
}

function safeTtsLivePlaceholderPolicyStatus(status) {
  const label = safeGateDetailLabel(status);
  return label === "separated" || label === "placeholder_separated"
    ? "ready"
    : "operator_attention_required";
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

function assertProductionLiveComponentDependencyNodeSafe(
  node,
  expectedComponent,
  expectedDependencies,
  context
) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    throw new ContractError(`${context}: dependency node required`);
  }
  for (const field of Object.keys(node)) {
    if (!PRODUCTION_LIVE_COMPONENT_DEPENDENCY_NODE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected dependency node field`);
    }
  }
  if (
    node.schema !== "iris_production_live_component_dependency_node_v1" ||
    node.component_label !== expectedComponent ||
    !PRODUCTION_LIVE_DEPENDENCY_COMPONENTS.has(node.component_label) ||
    !["ready", "unresolved"].includes(node.safe_status) ||
    !["ready", "BLOCKED"].includes(node.classification) ||
    node.required_for_live !== true
  ) {
    throw new ContractError(`${context}: invalid dependency node`);
  }
  assertExactStringList(
    node.dependency_labels,
    expectedDependencies,
    `${context}: dependency labels`
  );
  for (const dependency of node.dependency_labels) {
    if (!PRODUCTION_LIVE_DEPENDENCY_COMPONENTS.has(dependency)) {
      throw new ContractError(`${context}: invalid dependency label`);
    }
  }
  if (
    node.classification !== (node.safe_status === "ready" ? "ready" : "BLOCKED")
  ) {
    throw new ContractError(`${context}: unresolved dependency must block`);
  }
}

function assertProductionLiveStartupFixtureSafe(fixture, context) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  for (const field of Object.keys(fixture)) {
    if (!PRODUCTION_LIVE_STARTUP_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_production_live_startup_fixture_v1" ||
    ![
      "missing_worker",
      "missing_obs",
      "stale_tts",
      "owner_unconfirmed",
      "emergency_stop_missing",
    ].includes(fixture.fixture_label) ||
    !["blocked", "attention"].includes(fixture.expected_status)
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  if (fixture.fixture_label === "missing_worker") {
    assertProductionLiveStartupSequenceManifestSafe(
      fixture.safe_gate,
      `${context}: missing worker fixture`
    );
    if (fixture.safe_gate.manifest_status !== "blocked") {
      throw new ContractError(`${context}: missing worker must block`);
    }
    return;
  }
  if (fixture.fixture_label === "missing_obs") {
    assertProductionLiveComponentDependencyGraphSafe(
      fixture.safe_gate,
      `${context}: missing OBS fixture`
    );
    const obsNode = fixture.safe_gate.components.find(
      (component) => component.component_label === "obs"
    );
    if (!obsNode || obsNode.classification !== "BLOCKED") {
      throw new ContractError(`${context}: missing OBS must block`);
    }
    return;
  }
  if (fixture.fixture_label === "stale_tts") {
    assertProductionLiveStaleDependencyGuardSafe(
      fixture.safe_gate,
      `${context}: stale TTS fixture`
    );
    if (
      fixture.safe_gate.guard_status !== "attention" ||
      fixture.safe_gate.production_live_ready !== false
    ) {
      throw new ContractError(`${context}: stale TTS must attention`);
    }
    return;
  }
  if (fixture.fixture_label === "owner_unconfirmed") {
    assertProductionLiveOwnerConfirmationEnvelopeSafe(
      fixture.safe_gate,
      `${context}: owner unconfirmed fixture`
    );
    if (
      fixture.safe_gate.owner_confirmation_pending !== true ||
      fixture.safe_gate.safe_status !== "blocked"
    ) {
      throw new ContractError(`${context}: owner unconfirmed must block`);
    }
    return;
  }
  assertProductionFinalPreflightEmergencyStopReadinessSafe(
    fixture.safe_gate,
    `${context}: emergency stop missing fixture`
  );
  if (
    fixture.safe_gate.emergency_stop_confirmed !== false ||
    fixture.safe_gate.production_go_allowed !== false
  ) {
    throw new ContractError(`${context}: emergency stop missing must block`);
  }
}

function assertProductionLivePrerequisiteCheckSafe(
  check,
  expectedCheckLabel,
  expectedComponentLabel,
  context
) {
  if (!check || typeof check !== "object" || Array.isArray(check)) {
    throw new ContractError(`${context}: prerequisite check required`);
  }
  for (const field of Object.keys(check)) {
    if (!PRODUCTION_LIVE_PREREQUISITE_CHECK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected prerequisite check field`);
    }
  }
  if (
    check.schema !== "iris_production_live_prerequisite_check_v1" ||
    check.check_label !== expectedCheckLabel ||
    check.component_label !== expectedComponentLabel ||
    !PRODUCTION_LIVE_PREREQUISITE_CHECK_LABELS.has(check.check_label) ||
    !PRODUCTION_LIVE_STARTUP_COMPONENTS.has(check.component_label) ||
    !["ready", "attention", "blocked"].includes(check.status) ||
    check.safe_label !== `${check.component_label}_${check.status}`
  ) {
    throw new ContractError(`${context}: invalid prerequisite check`);
  }
}

function assertProductionLiveStartupSequenceStepSafe(
  step,
  expectedComponent,
  expectedPrerequisites,
  expectedOrder,
  context
) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: startup step required`);
  }
  for (const field of Object.keys(step)) {
    if (!PRODUCTION_LIVE_STARTUP_SEQUENCE_STEP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected startup step field`);
    }
  }
  if (
    step.schema !== "iris_production_live_startup_sequence_step_v1" ||
    step.order !== expectedOrder ||
    step.component_label !== expectedComponent ||
    !PRODUCTION_LIVE_STARTUP_COMPONENTS.has(step.component_label) ||
    !PRODUCTION_LIVE_STARTUP_STATUSES.has(step.safe_status) ||
    step.required_for_live !== true
  ) {
    throw new ContractError(`${context}: invalid startup step`);
  }
  assertExactStringList(
    step.prerequisite_labels,
    expectedPrerequisites,
    `${context}: startup prerequisites`
  );
  for (const prerequisite of step.prerequisite_labels) {
    if (!PRODUCTION_LIVE_STARTUP_COMPONENTS.has(prerequisite)) {
      throw new ContractError(`${context}: invalid startup prerequisite`);
    }
  }
}

function assertEmergencyStopComponentSafe(
  component,
  expectedComponent,
  expectedRequiredStatus,
  context
) {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    throw new ContractError(`${context}: component required`);
  }
  for (const field of Object.keys(component)) {
    if (!EMERGENCY_STOP_COMPONENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected component field`);
    }
  }
  if (
    component.schema !== "iris_emergency_stop_component_requirement_v1" ||
    component.component_label !== expectedComponent ||
    component.required_status !== expectedRequiredStatus ||
    !EMERGENCY_STOP_COMPONENT_LABELS.has(component.component_label) ||
    !EMERGENCY_STOP_STATUSES.has(component.required_status) ||
    !EMERGENCY_STOP_STATUSES.has(component.safe_status) ||
    component.required_for_production !== true
  ) {
    throw new ContractError(`${context}: invalid component`);
  }
}

function assertEmergencyStopSafeAuditEntrySafe(
  entry,
  expectedOperationType,
  context
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: audit entry required`);
  }
  for (const field of Object.keys(entry)) {
    if (!EMERGENCY_STOP_SAFE_AUDIT_ENTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected audit entry field`);
    }
  }
  if (
    entry.schema !== "iris_emergency_stop_safe_audit_entry_v1" ||
    !EMERGENCY_STOP_AUDIT_ACTOR_ROLES.has(entry.actor_role) ||
    entry.action_type !== `emergency_stop_${expectedOperationType}` ||
    entry.safe_target_label !== "emergency_stop_control" ||
    !EMERGENCY_STOP_AUDIT_RESULT_STATUSES.has(entry.result_status) ||
    !Number.isInteger(entry.event_at_ms) ||
    entry.event_at_ms < 0 ||
    entry.payload_stored_in_audit !== false
  ) {
    throw new ContractError(`${context}: invalid audit entry`);
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

function safeTimestampMs(value) {
  return safeNonNegativeInteger(value) ?? 0;
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

function safeProductionBlockerReasonLabel(value) {
  const label = safeGateDetailLabel(value);
  return PRODUCTION_READINESS_BLOCKER_REASON_LABELS.has(label) ? label : null;
}

function safeNextActionForProductionBlocker(blockerLabel) {
  const scriptByBlocker = {
    worker_missing: "npm run dev:foundation:startup-checklist",
    worker_attention: "npm run dev:foundation:runtime-status",
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
    worker_attention: "dev_foundation_runtime_status",
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
