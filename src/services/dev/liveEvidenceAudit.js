import { ContractError } from "../../core/contracts.js";
import {
  assertFreshEvidenceEnvelopeSafe,
  createFreshEvidenceEnvelope,
} from "./freshEvidenceEnvelope.js";
import {
  assertRealEvidenceIntakeSafe,
  classifyRealEvidenceSourceType,
  classifyRealEvidenceFreshness,
  createRealEvidenceIntake,
} from "./realEvidenceIntake.js";

const AUDIT_FIELDS = new Set([
  "schema",
  "audit_id",
  "audit_timestamp_ms",
  "audit_status",
  "fresh_evidence",
  "owner_confirmation",
  "handoff_plan",
  "go_no_go_result",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_FIELDS = new Set([
  "schema",
  "confirmation_scope",
  "owner_status",
  "owner_role",
  "confirmation_status",
  "confirmation_timestamp_ms",
]);
const OWNER_CONFIRMATION_STATUSES = new Set([
  "required",
  "pending",
  "confirmed",
  "expired",
]);
const OWNER_CONFIRMATION_SCOPES = new Set([
  "tts",
  "live2d",
  "obs",
  "db",
  "game",
  "youtube",
  "live_handoff",
]);

const OWNER_LIVE_CONFIRMATION_FIELDS = new Set([
  "schema",
  "scope",
  "component",
  "confirmed_by_role",
  "confirmed_at",
  "status",
  "expiry",
  "audit_reference",
]);
const OWNER_LIVE_CONFIRMATION_SCOPES = new Set([
  "bridge",
  "tts",
  "live2d",
  "subtitle",
  "obs",
  "db",
  "youtube",
  "game",
  "go_no_go",
]);
const OWNER_LIVE_CONFIRMATION_STATUSES = new Set([
  "pending",
  "confirmed",
  "expired",
  "revoked",
]);
const OWNER_LIVE_CONFIRMATION_GO_GATE_FIELDS = new Set([
  "schema",
  "scope",
  "component",
  "confirmation_status",
  "confirmed_by_role",
  "production_go",
  "blocker_label",
]);
const OWNER_LIVE_CONFIRMATION_SCOPE_GATE_FIELDS = new Set([
  "schema",
  "required_scope",
  "confirmation_scope",
  "scope_match",
  "production_go",
  "blocker_label",
]);
const OWNER_LIVE_CONFIRMATION_EXPIRY_GATE_FIELDS = new Set([
  "schema",
  "scope",
  "component",
  "checked_at",
  "expiry",
  "status",
  "fresh_status",
  "production_go",
  "blocker_label",
]);
const OWNER_LIVE_CONFIRMATION_NO_FIXTURE_PROMOTION_FIELDS = new Set([
  "schema",
  "scope",
  "component",
  "fixture_pass",
  "dry_run_pass",
  "confirmation_status",
  "auto_confirmed",
  "production_go",
]);
const OWNER_LIVE_CONFIRMATION_AUDIT_LINK_GATE_FIELDS = new Set([
  "schema",
  "scope",
  "component",
  "audit_reference",
  "audit_link_status",
  "confirmation_complete",
  "production_go",
  "blocker_label",
]);
const OWNER_LIVE_CONFIRMATION_PUBLIC_SUMMARY_FIELDS = new Set([
  "schema",
  "scope",
  "status",
  "expiry",
]);
const OWNER_LIVE_CONFIRMATION_CONFLICT_GATE_FIELDS = new Set([
  "schema",
  "scope",
  "component",
  "conflict_status",
  "observed_statuses",
  "production_go",
  "blocker_label",
]);
const OWNER_LIVE_CONFIRMATION_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "wrong_role_fixture",
  "expired_fixture",
  "revoked_fixture",
  "missing_audit_fixture",
  "auto_confirm_attempt_fixture",
  "note_leak_fixture",
]);
const LIVE_HANDOFF_EVIDENCE_BUNDLE_FIELDS = new Set([
  "schema",
  "bundle_status",
  "real_evidence",
  "owner_confirmation",
  "audit_reference",
  "blocker_summary",
]);
const LIVE_HANDOFF_BUNDLE_BLOCKER_SUMMARY_FIELDS = new Set([
  "schema",
  "blocker_status",
  "blocker_count",
  "blocker_labels",
]);
const LIVE_HANDOFF_BUNDLE_COMPLETENESS_GATE_FIELDS = new Set([
  "schema",
  "required_component_count",
  "present_component_count",
  "missing_component_count",
  "missing_components",
  "handoff_ready",
  "blocker_label",
]);
const LIVE_HANDOFF_BUNDLE_FRESHNESS_GATE_FIELDS = new Set([
  "schema",
  "evidence_count",
  "stale_evidence_count",
  "stale_components",
  "handoff_ready",
  "blocker_label",
]);
const LIVE_HANDOFF_BUNDLE_OWNER_GATE_FIELDS = new Set([
  "schema",
  "owner_status",
  "checked_at",
  "expiry",
  "handoff_ready",
  "blocker_label",
]);
const LIVE_HANDOFF_BUNDLE_EMERGENCY_GATE_FIELDS = new Set([
  "schema",
  "emergency_stop_freshness",
  "handoff_ready",
  "blocker_label",
]);
const LIVE_HANDOFF_BUNDLE_AUDIT_GATE_FIELDS = new Set([
  "schema",
  "audit_readiness_status",
  "bundle_audit_reference_status",
  "handoff_ready",
  "blocker_label",
]);
const LIVE_HANDOFF_BUNDLE_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "bundle_status",
  "evidence_count",
  "owner_confirmation_status",
  "audit_reference_status",
  "blocker_count",
  "blocker_labels",
]);
const LIVE_HANDOFF_BUNDLE_DRY_RUN_GATE_FIELDS = new Set([
  "schema",
  "dry_run_status",
  "real_operation_performed",
  "worker_started",
  "obs_changed",
  "db_connected",
  "game_input_sent",
  "handoff_ready_claimed",
]);
const LIVE_HANDOFF_BUNDLE_NO_SWEETENING_GATE_FIELDS = new Set([
  "schema",
  "bundle_status",
  "blocker_count",
  "degraded_mode",
  "fixture_pass",
  "handoff_ready",
  "blocker_label",
]);
const LIVE_HANDOFF_BUNDLE_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "complete_fixture",
  "stale_fixture",
  "missing_owner_fixture",
  "missing_emergency_fixture",
  "missing_audit_fixture",
  "leak_reject_fixture",
]);
const LIVE_GO_NO_GO_EVIDENCE_EVALUATOR_FIELDS = new Set([
  "schema",
  "decision_status",
  "go",
  "real_evidence_count",
  "blocker_count",
  "fixture_only",
  "dry_run_only",
  "blocker_label",
]);
const LIVE_GO_NO_GO_CRITICAL_BLOCKER_GATE_FIELDS = new Set([
  "schema",
  "component_count",
  "ready_component_count",
  "critical_blocker_count",
  "critical_blockers",
  "go",
  "blocker_label",
]);
const LIVE_GO_NO_GO_DEGRADED_MODE_GATE_FIELDS = new Set([
  "schema",
  "go",
  "degraded_mode_available",
  "degraded_component_count",
  "degraded_components",
  "blocker_label",
]);
const LIVE_GO_NO_GO_OWNER_FINAL_APPROVAL_GATE_FIELDS = new Set([
  "schema",
  "approval_status",
  "approved_by_role",
  "go",
  "blocker_label",
]);
const LIVE_GO_NO_GO_EMERGENCY_FINAL_GATE_FIELDS = new Set([
  "schema",
  "emergency_stop_freshness",
  "go",
  "blocker_label",
]);
const LIVE_GO_NO_GO_AUDIT_EVENT_FIELDS = new Set([
  "schema",
  "actor_role",
  "safe_target",
  "decision_status",
  "audit_timestamp_ms",
]);
const LIVE_GO_NO_GO_AUDIT_TRAIL_FINAL_GATE_FIELDS = new Set([
  "schema",
  "audit_event_status",
  "go",
  "blocker_label",
]);
const LIVE_GO_NO_GO_BLOCKER_REASON_ALLOWLIST_FIELDS = new Set([
  "schema",
  "reason_count",
  "reason_labels",
]);
const LIVE_GO_NO_GO_BLOCKER_REASON_LABELS = new Set([
  "real_evidence_required",
  "bundle_blocker_unresolved",
  "fixture_only_not_go",
  "dry_run_only_not_go",
  "critical_blocker_present",
  "degraded_mode_not_go",
  "owner_final_approval_required",
  "emergency_stop_final_required",
  "safe_audit_event_required",
  "none",
]);
const LIVE_GO_NO_GO_PUBLIC_SAFE_EXPORT_FIELDS = new Set([
  "schema",
  "go",
  "status",
  "blocker_count",
  "component_labels",
]);
const LIVE_GO_NO_GO_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "all_ready_fixture",
  "owner_missing_fixture",
  "emergency_stale_fixture",
  "audit_missing_fixture",
  "critical_blocker_fixture",
  "degraded_only_fixture",
  "leak_reject_fixture",
]);
const LIVE_GO_NO_GO_OWNER_VIEW_ROLE_GATE_FIELDS = new Set([
  "schema",
  "viewer_role",
  "detail_visible",
  "owner_only_detail_count",
  "safe_detail_labels",
  "ordinary_view_redacted",
]);
const LIVE_EVIDENCE_COLLECTOR_MANIFEST_FIELDS = new Set([
  "schema",
  "component_count",
  "collectors",
]);
const LIVE_EVIDENCE_COLLECTOR_MANIFEST_ITEM_FIELDS = new Set([
  "schema",
  "component",
  "collector_name",
  "expected_source",
  "freshness_threshold_ms",
  "required",
]);
const LIVE_EVIDENCE_COLLECTOR_COMPONENTS = Object.freeze([
  ["bridge", "bridge_evidence_collector", "real_probe", 10_000, true],
  ["tts", "tts_evidence_collector", "real_probe", 20_000, true],
  ["live2d", "live2d_evidence_collector", "real_probe", 20_000, true],
  ["subtitle", "subtitle_evidence_collector", "real_probe", 20_000, true],
  ["obs", "obs_evidence_collector", "real_probe", 15_000, true],
  ["db", "db_evidence_collector", "real_probe", 60_000, true],
  ["youtube", "youtube_evidence_collector", "operator_confirmed", 30_000, true],
  ["game", "game_evidence_collector", "operator_confirmed", 15_000, true],
  ["go_no_go", "go_no_go_evidence_collector", "audit_link", 30_000, true],
]);
const BRIDGE_EVIDENCE_COLLECTOR_FIELDS = new Set([
  "schema",
  "worker_heartbeat",
  "worker_status",
  "evidence_timestamp_ms",
]);
const BRIDGE_SAFE_COLLECTOR_HELPER_FIELDS = new Set([
  "schema",
  "component_label",
  "collector_label",
  "status",
  "freshness",
  "source_type",
  "worker_heartbeat",
  "worker_status",
  "evidence_timestamp_ms",
  "status_hash",
  "audit_reference",
  "blocker_count",
  "safe_next_action_label",
  "redaction_status",
  "production_go_allowed",
  "priority1_status",
]);
const TTS_EVIDENCE_COLLECTOR_FIELDS = new Set([
  "schema",
  "engine_health",
  "voice_status",
  "license_status",
]);
const LIVE2D_EVIDENCE_COLLECTOR_FIELDS = new Set([
  "schema",
  "renderer_heartbeat",
  "model_configured",
  "cue_capability",
]);
const SUBTITLE_EVIDENCE_COLLECTOR_FIELDS = new Set([
  "schema",
  "engine_status",
  "sync_status",
  "safe_area_status",
  "line_break_status",
  "rtl_status",
]);
const SUBTITLE_SAFE_COLLECTOR_INPUT_FIELDS = new Set([
  "engine_status",
  "engineStatus",
  "sync_status",
  "syncStatus",
  "safe_area_status",
  "safeAreaStatus",
  "line_break_status",
  "lineBreakStatus",
  "rtl_status",
  "rtlStatus",
  "evidence_timestamp_ms",
  "evidenceTimestampMs",
  "source_type",
  "sourceType",
  "status_hash",
  "statusHash",
  "audit_reference",
  "auditReference",
]);
const SUBTITLE_SAFE_COLLECTOR_HELPER_FIELDS = new Set([
  "schema",
  "component_label",
  "collector_label",
  "status",
  "freshness",
  "source_type",
  "engine_status",
  "sync_status",
  "safe_area_status",
  "line_break_status",
  "rtl_status",
  "evidence_timestamp_ms",
  "status_hash",
  "audit_reference",
  "blocker_count",
  "safe_next_action_label",
  "redaction_status",
  "production_go_allowed",
  "priority1_status",
]);
const OBS_EVIDENCE_COLLECTOR_FIELDS = new Set([
  "schema",
  "browser_source_status",
  "pickup_status",
  "heartbeat_status",
  "artifact_freshness",
]);
const DB_EVIDENCE_COLLECTOR_FIELDS = new Set([
  "schema",
  "connection_status",
  "schema_status",
  "index_status",
  "migration_status",
  "backup_status",
]);
const YOUTUBE_EVIDENCE_COLLECTOR_FIELDS = new Set([
  "schema",
  "oauth_status",
  "token_status",
  "chat_status",
  "polling_status",
  "moderation_status",
]);
const GAME_EVIDENCE_COLLECTOR_FIELDS = new Set([
  "schema",
  "adapter_status",
  "safe_map_status",
  "manual_approval_status",
  "emergency_stop_status",
  "audit_status",
]);
const EVIDENCE_COLLECTOR_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "bridge_safe_output_fixture",
  "bridge_reject_fixture",
  "tts_safe_output_fixture",
  "tts_reject_fixture",
  "live2d_safe_output_fixture",
  "live2d_reject_fixture",
  "subtitle_safe_output_fixture",
  "subtitle_reject_fixture",
  "obs_safe_output_fixture",
  "obs_reject_fixture",
  "db_safe_output_fixture",
  "db_reject_fixture",
  "youtube_safe_output_fixture",
  "youtube_reject_fixture",
  "game_safe_output_fixture",
  "game_reject_fixture",
]);
const LIVE_HANDOFF_OPERATOR_PACKET_FIELDS = new Set([
  "schema",
  "packet_status",
  "generated_at",
  "expires_at",
  "summary",
  "checklist",
  "blockers",
  "required_confirmations",
]);
const LIVE_HANDOFF_OPERATOR_PACKET_SUMMARY_FIELDS = new Set([
  "schema",
  "handoff_status",
  "checklist_count",
  "blocker_count",
  "required_confirmation_count",
  "real_process_started",
  "obs_changed",
  "db_connected",
  "game_input_sent",
]);
const LIVE_HANDOFF_OPERATOR_PACKET_CHECKLIST_FIELDS = new Set([
  "schema",
  "component",
  "status",
  "required_evidence",
  "owner_action_label",
]);
const LIVE_HANDOFF_OPERATOR_PACKET_BLOCKER_FIELDS = new Set([
  "schema",
  "blocker_label",
  "operator_action_label",
]);
const LIVE_HANDOFF_OPERATOR_PACKET_CONFIRMATION_FIELDS = new Set([
  "schema",
  "scope",
  "status",
  "owner_action_label",
]);
const LIVE_HANDOFF_OPERATOR_PACKET_OWNER_ONLY_GATE_FIELDS = new Set([
  "schema",
  "viewer_role",
  "owner_only_visible",
  "owner_only_section_count",
  "safe_section_labels",
  "ordinary_view_redacted",
]);
const LIVE_HANDOFF_OPERATOR_PACKET_AUDIT_EVENT_FIELDS = new Set([
  "schema",
  "actor_role",
  "action",
  "safe_target",
  "result",
  "audit_timestamp_ms",
]);
const LIVE_HANDOFF_OPERATOR_PACKET_PUBLIC_SUMMARY_FIELDS = new Set([
  "schema",
  "handoff_status",
  "blocker_count",
]);
const LIVE_HANDOFF_OPERATOR_PACKET_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "leak_reject_fixture",
  "no_action_fixture",
  "expired_fixture",
  "owner_gate_fixture",
  "blocker_mapping_fixture",
]);
const LIVE_RUNBOOK_FINAL_HANDOFF_SECTION_FIELDS = new Set([
  "schema",
  "section_status",
  "step_count",
  "steps",
]);
const LIVE_RUNBOOK_FINAL_HANDOFF_STEP_FIELDS = new Set([
  "schema",
  "order",
  "step_label",
  "step_status",
]);
const LIVE_RUNBOOK_OWNER_CONFIRMATION_STEP_FIELDS = new Set([
  "schema",
  "step_label",
  "confirmation_status",
  "step_status",
  "can_proceed_next",
]);
const LIVE_RUNBOOK_EMERGENCY_STOP_STEP_FIELDS = new Set([
  "schema",
  "step_label",
  "emergency_stop_freshness",
  "step_status",
  "production_go",
  "blocker_label",
]);
const LIVE_RUNBOOK_EVIDENCE_COLLECTION_STEP_FIELDS = new Set([
  "schema",
  "step_label",
  "collector_labels",
  "step_status",
  "real_collector_executed",
]);
const LIVE_RUNBOOK_GO_NO_GO_STEP_FIELDS = new Set([
  "schema",
  "step_label",
  "input_bundle_reference",
  "step_status",
  "display_only",
  "real_operation_performed",
]);
const LIVE_RUNBOOK_ROLLBACK_STEP_FIELDS = new Set([
  "schema",
  "step_label",
  "rollback_label",
  "abort_label",
  "step_status",
]);
const LIVE_RUNBOOK_AUDIT_STEP_FIELDS = new Set([
  "schema",
  "step_label",
  "audit_status",
  "step_status",
  "handoff_status",
  "blocker_label",
]);
const LIVE_RUNBOOK_STALE_EVIDENCE_STEP_FIELDS = new Set([
  "schema",
  "step_label",
  "stale_evidence_count",
  "stale_component_labels",
  "step_status",
  "handoff_ready",
  "blocker_label",
]);
const LIVE_RUNBOOK_PUBLIC_VIEW_FIELDS = new Set([
  "schema",
  "viewer_role",
  "step_count",
  "steps",
  "ordinary_view_redacted",
]);
const LIVE_RUNBOOK_PUBLIC_STEP_FIELDS = new Set([
  "schema",
  "step_label",
  "step_status",
]);
const LIVE_RUNBOOK_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "owner_missing_fixture",
  "emergency_missing_fixture",
  "audit_missing_fixture",
  "stale_evidence_fixture",
  "leak_reject_fixture",
]);
const LIVE_BLOCKER_RESOLUTION_FIELDS = new Set([
  "schema",
  "blocker_id",
  "component",
  "resolution_status",
  "evidence_ref",
  "owner_ref",
]);
const LIVE_BLOCKER_RESOLUTION_EVIDENCE_GATE_FIELDS = new Set([
  "schema",
  "blocker_id",
  "component",
  "requested_resolution_status",
  "evidence_status",
  "evidence_freshness",
  "evidence_source_type",
  "resolution_status",
  "blocker_label",
]);
const LIVE_BLOCKER_RESOLUTION_OWNER_GATE_FIELDS = new Set([
  "schema",
  "blocker_id",
  "component",
  "owner_required",
  "owner_ref",
  "requested_resolution_status",
  "resolution_status",
  "blocker_label",
]);
const LIVE_BLOCKER_RESOLUTION_AUDIT_GATE_FIELDS = new Set([
  "schema",
  "blocker_id",
  "component",
  "audit_entry_status",
  "requested_resolution_status",
  "resolution_status",
  "blocker_label",
]);
const LIVE_BLOCKER_RESOLUTION_REGRESSION_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fixture_evidence_fixture",
  "owner_missing_fixture",
  "audit_missing_fixture",
  "stale_fixture",
  "fresh_resolved_fixture",
]);
const LIVE_BLOCKER_RESOLUTION_PUBLIC_SUMMARY_FIELDS = new Set([
  "schema",
  "resolved_count",
  "unresolved_count",
  "component_status",
]);
const LIVE_BLOCKER_RESOLUTION_COMPONENT_STATUS_FIELDS = new Set([
  "schema",
  "component",
  "status",
]);
const LIVE_BLOCKER_RESOLUTION_NO_AUTO_GATE_FIELDS = new Set([
  "schema",
  "blocker_id",
  "readiness_pass",
  "fixture_pass",
  "requested_resolution_status",
  "resolution_status",
  "blocker_label",
]);
const LIVE_BLOCKER_RESOLUTION_CONFLICT_GATE_FIELDS = new Set([
  "schema",
  "blocker_id",
  "observed_statuses",
  "conflict_status",
  "resolution_status",
  "blocker_label",
]);
const LIVE_BLOCKER_RESOLUTION_COMPLETION_HOOK_FIELDS = new Set([
  "schema",
  "review_status",
  "resolved_count",
  "unresolved_count",
  "attention_count",
  "component_status",
]);
const PRODUCTION_OWNER_HANDOFF_REVIEW_FIELDS = new Set([
  "schema",
  "required_sections",
  "status",
  "blockers",
  "confirmations",
  "evidence_freshness",
]);
const PRODUCTION_OWNER_HANDOFF_REVIEW_SECTION_FIELDS = new Set([
  "schema",
  "section",
  "status",
]);
const PRODUCTION_OWNER_HANDOFF_REVIEW_BLOCKER_FIELDS = new Set([
  "schema",
  "blocker_label",
  "status",
]);
const PRODUCTION_OWNER_HANDOFF_REVIEW_CONFIRMATION_FIELDS = new Set([
  "schema",
  "scope",
  "status",
]);
const PRODUCTION_OWNER_HANDOFF_REVIEW_EVIDENCE_FIELDS = new Set([
  "schema",
  "component",
  "freshness",
]);
const PRODUCTION_OWNER_HANDOFF_REVIEW_COMPLETENESS_FIELDS = new Set([
  "schema",
  "required_section_count",
  "present_section_count",
  "missing_sections",
  "review_complete",
  "status",
]);
const PRODUCTION_OWNER_HANDOFF_REVIEW_ROLE_GATE_FIELDS = new Set([
  "schema",
  "viewer_role",
  "owner_only_visible",
  "owner_only_detail_count",
  "safe_detail_labels",
  "ordinary_view_redacted",
]);
const PRODUCTION_OWNER_HANDOFF_REVIEW_NO_ACTION_FIELDS = new Set([
  "schema",
  "review_status",
  "real_operation_performed",
  "external_connection_opened",
  "worker_started",
  "obs_changed",
  "db_connected",
  "game_input_sent",
]);
const PRODUCTION_OWNER_HANDOFF_REVIEW_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "incomplete_fixture",
  "leak_reject_fixture",
  "owner_only_leak_fixture",
  "no_action_fixture",
  "complete_fixture",
]);
const PRODUCTION_GO_PACKAGE_FIELDS = new Set([
  "schema",
  "evidence_bundle",
  "owner_confirmation",
  "emergency_stop",
  "audit",
  "rollback_plan",
  "blocker_status",
]);
const PRODUCTION_GO_PACKAGE_ITEM_FIELDS = new Set([
  "schema",
  "status",
  "label",
]);
const PRODUCTION_GO_PACKAGE_NO_REAL_GO_FIELDS = new Set([
  "schema",
  "package_generated",
  "real_go_executed",
  "production_go_claimed",
  "status",
]);
const PRODUCTION_GO_PACKAGE_READINESS_FIELDS = new Set([
  "schema",
  "package_status",
  "missing_required",
  "blocker_count",
]);
const PRODUCTION_GO_PACKAGE_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "package_status",
  "blocker_count",
  "required_count",
  "missing_required",
]);
const PRODUCTION_EVIDENCE_SAFE_PROVENANCE_REFERENCE_FIELDS = new Set([
  "schema",
  "component_label",
  "status",
  "freshness",
  "source_type",
  "collector_role",
  "status_hash",
  "audit_reference",
  "evidence_timestamp_ms",
  "safe_next_action_label",
]);
const PRODUCTION_EVIDENCE_SAFE_PROVENANCE_HANDOFF_REFERENCE_FIELDS = new Set([
  "schema",
  "bundle_status",
  "handoff_ready",
  "blocker_count",
  "missing_required",
  "safe_next_action_label",
]);
const PRODUCTION_EVIDENCE_SAFE_PROVENANCE_GO_PACKAGE_REFERENCE_FIELDS = new Set([
  "schema",
  "package_status",
  "production_go_allowed",
  "degraded_mode_available",
  "final_classifier_status",
  "blocker_count",
  "missing_required",
  "safe_next_action_label",
]);
const PRODUCTION_EVIDENCE_SAFE_PROVENANCE_COMPOSITOR_FIELDS = new Set([
  "schema",
  "compositor_status",
  "safe_provenance_references",
  "handoff_bundle_reference",
  "go_no_go_package_reference",
  "bundle_status",
  "package_status",
  "blocker_count",
  "missing_required",
  "production_go_allowed",
  "degraded_mode_available",
  "priority1_status",
  "safe_next_action_label",
]);
const PRODUCTION_EVIDENCE_SAFE_PROVENANCE_SUMMARY_FIELDS = new Set([
  "schema",
  "compositor_status",
  "evidence_reference_count",
  "bundle_status",
  "package_status",
  "blocker_count",
  "missing_required",
  "production_go_allowed",
  "degraded_mode_available",
  "priority1_status",
  "safe_next_action_label",
]);
const PRODUCTION_GO_PACKAGE_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "complete_fixture",
  "owner_missing_fixture",
  "evidence_stale_fixture",
  "emergency_missing_fixture",
  "audit_missing_fixture",
  "leak_reject_fixture",
]);
const PRIORITY1_BLOCKED_PERSISTENCE_FIELDS = new Set([
  "schema",
  "blocker_id",
  "status",
  "evidence_status",
  "evidence_freshness",
  "evidence_source_type",
  "persisted_after_k900",
  "blocker_label",
]);
const PRIORITY1_FALSE_RESOLUTION_REGRESSION_FIELDS = new Set([
  "schema",
  "fixture_label",
  "requested_resolution_status",
  "owner_status",
  "evidence_source_type",
  "evidence_freshness",
  "regression_status",
  "blocker_label",
]);
const PRIORITY1_FALSE_RESOLUTION_REGRESSION_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "owner_missing_fixture",
  "fixture_evidence_fixture",
  "stale_evidence_fixture",
]);
const PRIORITY1_REAL_EVIDENCE_DRY_RUN_FIELDS = new Set([
  "schema",
  "dry_run",
  "evidence_source_type",
  "evidence_freshness",
  "owner_status",
  "resolution_status",
  "real_go",
  "blocker_label",
]);
const PRIORITY1_OWNER_CONFIRMED_CANDIDATE_FIELDS = new Set([
  "schema",
  "fixture_mode",
  "owner_status",
  "evidence_freshness",
  "resolution_status",
  "real_go",
  "blocker_label",
]);
const PRIORITY1_COMPLETION_SUMMARY_FIELDS = new Set([
  "schema",
  "summary_line",
  "unresolved_count",
  "resolution_candidate_count",
  "missing_evidence_count",
]);
const LIVE_HANDOFF_FINAL_SAFETY_SWEEP_FIELDS = new Set([
  "schema",
  "sweep_status",
  "readiness_sweetening_status",
  "fixture_to_real_promotion_status",
  "owner_auto_confirmation_status",
  "blocker_count",
]);
const LIVE_HANDOFF_FINAL_REDACTION_SWEEP_FIELDS = new Set([
  "schema",
  "sweep_status",
  "checked_export_count",
  "leak_count",
  "blocked_labels",
]);
const LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw|payload|endpoint|url|token|secret|authorization|credential|password|command|path|diagnostics|job)(?:$|_)/iu;
const LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_VALUE_PATTERN =
  /(?:https?:\/\/|endpoint|oauth|token|authorization|bearer|api[_ -]?key|secret|raw[_ -]?payload|payload|raw[_ -]?evidence|raw[_ -]?note|private[_ -]?note|raw[_ -]?command|world[_ -]?command|obs[_ -]?command|os[_ -]?command|path|raw[_ -]?diagnostics|diagnostics|raw[_ -]?job|job)/iu;
const LIVE_HANDOFF_OPERATOR_BLOCKER_ACTION_LABELS = new Map([
  ["missing_fresh_evidence", "collect_fresh_real_evidence"],
  ["priority1_runtime_waiting", "collect_fresh_real_evidence"],
  ["worker_runtime_waiting", "collect_fresh_real_evidence"],
  ["owner_confirmation_required", "request_owner_confirmation"],
  ["owner_confirmation_expired", "request_owner_reconfirmation"],
  ["emergency_stop_fresh_evidence_required", "verify_emergency_stop"],
  ["audit_reference_required", "create_safe_audit_entry"],
  ["bundle_blocker_unresolved", "resolve_bundle_blocker"],
  ["critical_blocker_present", "resolve_critical_blocker"],
]);

const HANDOFF_PLAN_FIELDS = new Set([
  "schema",
  "plan_status",
  "handoff_owner_role",
  "required_evidence_count",
  "ready_evidence_count",
]);

const LIVE_HANDOFF_PLAN_FIELDS = new Set([
  "schema",
  "component",
  "order",
  "required_evidence",
  "owner_confirmation",
  "blocker",
  "status",
  "real_operation_performed",
  "boundary_policy",
]);

const LIVE_HANDOFF_PLAN_BOUNDARY_FIELDS = new Set([
  "safe_handoff_plan_only",
  "component_order_evidence_owner_blocker_status_only",
  "dry_plan_no_real_operation",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
  "no_obs_commands",
  "no_os_commands",
]);

const LIVE_HANDOFF_SEQUENCE_MANIFEST_FIELDS = new Set([
  "schema",
  "manifest_status",
  "step_count",
  "steps",
  "boundary_policy",
]);

const LIVE_HANDOFF_SEQUENCE_STEP_FIELDS = new Set([
  "schema",
  "component",
  "order",
  "status",
]);

const LIVE_HANDOFF_SEQUENCE_BOUNDARY_FIELDS = new Set([
  "safe_sequence_manifest_only",
  "bridge_engine_overlay_probe_go_no_go_order_required",
  "out_of_order_rejected",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
]);

const LIVE_HANDOFF_SEQUENCE = [
  "bridge",
  "engine",
  "overlay",
  "probe",
  "go_no_go",
];

const LIVE_HANDOFF_SAFE_NEXT_ACTION_FIELDS = new Set([
  "schema",
  "safe_script_name",
  "operator_label",
  "boundary_policy",
]);

const LIVE_HANDOFF_EMERGENCY_STOP_GATE_FIELDS = new Set([
  "schema",
  "gate_status",
  "emergency_stop_freshness",
  "progress_allowed",
  "blocker",
  "boundary_policy",
]);

const LIVE_HANDOFF_AUDIT_READINESS_GATE_FIELDS = new Set([
  "schema",
  "gate_status",
  "audit_status",
  "progress_allowed",
  "blocker",
  "boundary_policy",
]);

const LIVE_HANDOFF_DRY_RUN_RESULT_FIELDS = new Set([
  "schema",
  "dry_run_status",
  "safe_status",
  "real_connection_succeeded",
  "execution_performed",
  "boundary_policy",
]);

const LIVE_HANDOFF_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "owner_missing_fixture",
  "emergency_missing_fixture",
  "audit_missing_fixture",
  "out_of_order_fixture",
  "unsafe_handoff_fixture",
  "boundary_policy",
]);

const LIVE_HANDOFF_FIXTURE_RESULT_FIELDS = new Set([
  "schema",
  "fixture_label",
  "fixture_status",
]);

const LIVE_HANDOFF_SAFE_NEXT_ACTION_BOUNDARY_FIELDS = new Set([
  "safe_script_name_only",
  "operator_label_only",
  "no_shell_body",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
]);

const LIVE_HANDOFF_EMERGENCY_STOP_GATE_BOUNDARY_FIELDS = new Set([
  "safe_emergency_stop_gate_only",
  "fresh_emergency_stop_required_for_progress",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
]);

const LIVE_HANDOFF_AUDIT_READINESS_GATE_BOUNDARY_FIELDS = new Set([
  "safe_audit_readiness_gate_only",
  "audit_ready_required_for_handoff",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
]);

const LIVE_HANDOFF_DRY_RUN_RESULT_BOUNDARY_FIELDS = new Set([
  "safe_dry_run_status_only",
  "real_connection_not_reported",
  "execution_not_performed",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
  "no_obs_commands",
  "no_os_commands",
]);

const LIVE_HANDOFF_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "safe_fixture_status_only",
  "owner_emergency_audit_order_raw_command_covered",
  "no_real_operation",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
  "no_obs_commands",
  "no_os_commands",
]);

const GO_NO_GO_FIELDS = new Set([
  "schema",
  "decision",
  "result_status",
  "blocker_count",
]);

const OWNER_CONFIRMATION_GO_GATE_FIELDS = new Set([
  "schema",
  "gate_status",
  "confirmation_status",
  "owner_role",
  "production_go",
  "blocker_label",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_AUDIT_EVENT_FIELDS = new Set([
  "schema",
  "actor_role",
  "action",
  "safe_target",
  "result",
  "audit_timestamp_ms",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_NO_AUTO_APPROVE_FIELDS = new Set([
  "schema",
  "gate_status",
  "readiness_pass",
  "fixture_pass",
  "confirmation_status",
  "auto_confirmed",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_PUBLIC_SUMMARY_FIELDS = new Set([
  "schema",
  "confirmation_status",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_EXPIRATION_POLICY_FIELDS = new Set([
  "schema",
  "policy_status",
  "validity_window_ms",
  "expired_returns_to",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "missing_fixture",
  "wrong_role_fixture",
  "expired_fixture",
  "auto_approve_attempt_fixture",
  "note_leak_fixture",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_FIXTURE_RESULT_FIELDS = new Set([
  "schema",
  "fixture_label",
  "fixture_status",
]);

const BOUNDARY_POLICY_FIELDS = new Set([
  "safe_audit_schema_only",
  "no_raw_payloads",
  "no_secret_values",
  "no_token_values",
  "no_endpoint_values",
  "no_raw_commands",
]);

const OWNER_CONFIRMATION_GO_GATE_BOUNDARY_FIELDS = new Set([
  "safe_gate_status_only",
  "pending_confirmation_blocks_production_go",
  "expired_confirmation_blocks_production_go",
  "owner_role_required_for_production_go",
  "no_raw_operator_note",
  "no_private_token",
]);

const OWNER_CONFIRMATION_AUDIT_EVENT_BOUNDARY_FIELDS = new Set([
  "safe_confirmation_audit_event_only",
  "actor_role_action_target_result_timestamp_only",
  "no_raw_operator_note",
  "no_private_token",
  "no_raw_payloads",
]);

const OWNER_CONFIRMATION_NO_AUTO_APPROVE_BOUNDARY_FIELDS = new Set([
  "readiness_pass_does_not_confirm_owner",
  "fixture_pass_does_not_confirm_owner",
  "owner_confirmation_remains_explicit",
  "safe_status_only",
]);

const OWNER_CONFIRMATION_PUBLIC_SUMMARY_BOUNDARY_FIELDS = new Set([
  "confirmation_status_only",
  "no_raw_operator_note",
  "no_private_operator_detail",
  "no_private_token",
]);

const OWNER_CONFIRMATION_EXPIRATION_POLICY_BOUNDARY_FIELDS = new Set([
  "safe_expiration_policy_only",
  "expired_confirmation_returns_to_pending",
  "no_raw_operator_note",
  "no_private_token",
]);

const OWNER_CONFIRMATION_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "safe_fixture_status_only",
  "missing_wrong_role_expired_covered",
  "auto_approve_attempt_rejected",
  "note_leak_rejected",
  "no_raw_operator_note",
  "no_private_token",
]);

const SAFE_LABEL_PATTERN = /^[a-z0-9_.:-]{1,80}$/u;
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw|payload|endpoint|url|token|secret|authorization|credential|password|command)(?:$|_)/iu;
const UNSAFE_VALUE_PATTERN =
  /\b(?:https?:\/\/|endpoint|oauth|token|authorization|bearer|api[_ -]?key|secret|raw[_ -]?payload|payload|raw[_ -]?evidence|raw[_ -]?note|private[_ -]?note|raw[_ -]?command|world[_ -]?command|obs[_ -]?command|os[_ -]?command)\b/iu;

export function createLiveEvidenceAuditEntry({
  auditId = "live_evidence_audit",
  auditTimestampMs = Date.now(),
  freshEvidence,
  ownerRole = "owner",
  ownerConfirmed = false,
  handoffOwnerRole = "operator",
  requiredEvidenceCount = 1,
  readyEvidenceCount = 0,
  goDecision = "no_go",
} = {}) {
  const entry = {
    schema: "iris_live_evidence_audit_entry_v1",
    audit_id: safeLabel(auditId),
    audit_timestamp_ms: normalizeTimestampMs(auditTimestampMs),
    audit_status: "recorded",
    fresh_evidence: freshEvidence,
    owner_confirmation: createOwnerConfirmationEnvelope({
      ownerRole,
      confirmationStatus: ownerConfirmed === true ? "confirmed" : "pending",
    }),
    handoff_plan: {
      schema: "iris_live_evidence_handoff_plan_v1",
      plan_status: "recorded",
      handoff_owner_role: safeActorRole(handoffOwnerRole),
      required_evidence_count: normalizeCount(requiredEvidenceCount),
      ready_evidence_count: normalizeCount(readyEvidenceCount),
    },
    go_no_go_result: {
      schema: "iris_live_evidence_go_no_go_result_v1",
      decision: goDecision === "go" ? "go" : "no_go",
      result_status: goDecision === "go" ? "go_recorded" : "blocked",
      blocker_count: goDecision === "go" ? 0 : 1,
    },
    boundary_policy: Object.fromEntries(
      [...BOUNDARY_POLICY_FIELDS].map((field) => [field, true])
    ),
  };
  assertLiveEvidenceAuditEntrySafe(entry);
  return entry;
}

export function createOwnerConfirmationEnvelope({
  confirmationScope = "live_handoff",
  ownerRole = "owner",
  confirmationStatus = "required",
  confirmationTimestampMs = 0,
} = {}) {
  const status = OWNER_CONFIRMATION_STATUSES.has(confirmationStatus)
    ? confirmationStatus
    : "required";
  const envelope = {
    schema: "iris_live_evidence_owner_confirmation_v1",
    confirmation_scope: safeOwnerConfirmationScope(confirmationScope),
    owner_status: status,
    owner_role: safeActorRole(ownerRole),
    confirmation_status: status,
    confirmation_timestamp_ms: normalizeTimestampMs(confirmationTimestampMs),
  };
  assertOwnerConfirmationSafe(envelope);
  return envelope;
}

export function createOwnerLiveConfirmation({
  scope = "go_no_go",
  component = "go_no_go",
  confirmedByRole = "owner",
  confirmedAt = 0,
  status = "pending",
  expiry = 0,
  auditReference = "audit_pending",
} = {}) {
  const confirmation = {
    schema: "iris_owner_live_confirmation_v1",
    scope: safeOwnerLiveConfirmationScope(scope),
    component: safeLabel(component),
    confirmed_by_role: safeActorRole(confirmedByRole),
    confirmed_at: normalizeTimestampMs(confirmedAt),
    status: safeOwnerLiveConfirmationStatus(status),
    expiry: normalizeTimestampMs(expiry),
    audit_reference: safeLabel(auditReference),
  };
  assertOwnerLiveConfirmationSafe(confirmation);
  return confirmation;
}

export function assertOwnerLiveConfirmationSafe(
  confirmation,
  context = "owner live confirmation"
) {
  if (!confirmation || typeof confirmation !== "object" || Array.isArray(confirmation)) {
    throw new ContractError(`${context}: confirmation required`);
  }
  for (const field of Object.keys(confirmation)) {
    if (
      !OWNER_LIVE_CONFIRMATION_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe confirmation field`, {
        field,
      });
    }
  }
  for (const field of OWNER_LIVE_CONFIRMATION_FIELDS) {
    if (!Object.hasOwn(confirmation, field)) {
      throw new ContractError(`${context}: missing confirmation field`, { field });
    }
  }
  if (
    confirmation.schema !== "iris_owner_live_confirmation_v1" ||
    !OWNER_LIVE_CONFIRMATION_SCOPES.has(confirmation.scope) ||
    !SAFE_LABEL_PATTERN.test(confirmation.component) ||
    !["owner", "admin", "operator"].includes(confirmation.confirmed_by_role) ||
    !Number.isInteger(confirmation.confirmed_at) ||
    confirmation.confirmed_at < 0 ||
    !OWNER_LIVE_CONFIRMATION_STATUSES.has(confirmation.status) ||
    !Number.isInteger(confirmation.expiry) ||
    confirmation.expiry < 0 ||
    !SAFE_LABEL_PATTERN.test(confirmation.audit_reference)
  ) {
    throw new ContractError(`${context}: invalid confirmation`);
  }
  assertNoUnsafeAuditMaterial(confirmation, context);
}

export function revokeOwnerLiveConfirmation({ confirmation } = {}) {
  assertOwnerLiveConfirmationSafe(confirmation, "owner live confirmation revocation");
  return createOwnerLiveConfirmation({
    scope: confirmation.scope,
    component: confirmation.component,
    confirmedByRole: confirmation.confirmed_by_role,
    confirmedAt: confirmation.confirmed_at,
    status: "revoked",
    expiry: confirmation.expiry,
    auditReference: confirmation.audit_reference,
  });
}

export function createOwnerLiveConfirmationProductionGoGate({
  confirmation,
} = {}) {
  assertOwnerLiveConfirmationSafe(
    confirmation,
    "owner live confirmation production go gate"
  );
  const blocked =
    confirmation.confirmed_by_role !== "owner" ||
    confirmation.status !== "confirmed";
  const gate = {
    schema: "iris_owner_live_confirmation_production_go_gate_v1",
    scope: confirmation.scope,
    component: confirmation.component,
    confirmation_status: confirmation.status,
    confirmed_by_role: confirmation.confirmed_by_role,
    production_go: !blocked,
    blocker_label:
      confirmation.confirmed_by_role !== "owner"
        ? "owner_role_required"
        : blocked
          ? "owner_confirmation_required"
          : "none",
  };
  assertOwnerLiveConfirmationProductionGoGateSafe(gate);
  return gate;
}

export function assertOwnerLiveConfirmationProductionGoGateSafe(
  gate,
  context = "owner live confirmation production go gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !OWNER_LIVE_CONFIRMATION_GO_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_owner_live_confirmation_production_go_gate_v1" ||
    !OWNER_LIVE_CONFIRMATION_SCOPES.has(gate.scope) ||
    !SAFE_LABEL_PATTERN.test(gate.component) ||
    !OWNER_LIVE_CONFIRMATION_STATUSES.has(gate.confirmation_status) ||
    !["owner", "admin", "operator"].includes(gate.confirmed_by_role) ||
    typeof gate.production_go !== "boolean" ||
    !["owner_role_required", "owner_confirmation_required", "none"].includes(
      gate.blocker_label
    )
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const blocked =
    gate.confirmed_by_role !== "owner" || gate.confirmation_status !== "confirmed";
  const expectedBlocker =
    gate.confirmed_by_role !== "owner"
      ? "owner_role_required"
      : blocked
        ? "owner_confirmation_required"
        : "none";
  if (
    gate.production_go !== !blocked ||
    gate.blocker_label !== expectedBlocker
  ) {
    throw new ContractError(`${context}: gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createOwnerLiveConfirmationScopeGate({
  confirmation,
  requiredScope = "go_no_go",
} = {}) {
  assertOwnerLiveConfirmationSafe(confirmation, "owner live confirmation scope gate");
  const safeRequiredScope = safeOwnerLiveConfirmationScope(requiredScope);
  const scopeMatch = confirmation.scope === safeRequiredScope;
  const gate = {
    schema: "iris_owner_live_confirmation_scope_gate_v1",
    required_scope: safeRequiredScope,
    confirmation_scope: confirmation.scope,
    scope_match: scopeMatch,
    production_go: scopeMatch,
    blocker_label: scopeMatch ? "none" : "owner_confirmation_scope_mismatch",
  };
  assertOwnerLiveConfirmationScopeGateSafe(gate);
  return gate;
}

export function assertOwnerLiveConfirmationScopeGateSafe(
  gate,
  context = "owner live confirmation scope gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !OWNER_LIVE_CONFIRMATION_SCOPE_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_owner_live_confirmation_scope_gate_v1" ||
    !OWNER_LIVE_CONFIRMATION_SCOPES.has(gate.required_scope) ||
    !OWNER_LIVE_CONFIRMATION_SCOPES.has(gate.confirmation_scope) ||
    typeof gate.scope_match !== "boolean" ||
    typeof gate.production_go !== "boolean" ||
    !["owner_confirmation_scope_mismatch", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const scopeMatch = gate.required_scope === gate.confirmation_scope;
  if (
    gate.scope_match !== scopeMatch ||
    gate.production_go !== scopeMatch ||
    gate.blocker_label !== (scopeMatch ? "none" : "owner_confirmation_scope_mismatch")
  ) {
    throw new ContractError(`${context}: scope gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createOwnerLiveConfirmationExpiryGate({
  confirmation,
  checkedAt = Date.now(),
} = {}) {
  assertOwnerLiveConfirmationSafe(confirmation, "owner live confirmation expiry gate");
  const safeCheckedAt = normalizeTimestampMs(checkedAt);
  const expired =
    confirmation.status !== "confirmed" ||
    confirmation.expiry === 0 ||
    safeCheckedAt === 0 ||
    confirmation.expiry <= safeCheckedAt;
  const gate = {
    schema: "iris_owner_live_confirmation_expiry_gate_v1",
    scope: confirmation.scope,
    component: confirmation.component,
    checked_at: safeCheckedAt,
    expiry: confirmation.expiry,
    status: expired ? "expired" : confirmation.status,
    fresh_status: expired ? "pending" : "fresh",
    production_go: !expired,
    blocker_label: expired ? "owner_confirmation_expired" : "none",
  };
  assertOwnerLiveConfirmationExpiryGateSafe(gate);
  return gate;
}

export function assertOwnerLiveConfirmationExpiryGateSafe(
  gate,
  context = "owner live confirmation expiry gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !OWNER_LIVE_CONFIRMATION_EXPIRY_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_owner_live_confirmation_expiry_gate_v1" ||
    !OWNER_LIVE_CONFIRMATION_SCOPES.has(gate.scope) ||
    !SAFE_LABEL_PATTERN.test(gate.component) ||
    !Number.isInteger(gate.checked_at) ||
    gate.checked_at < 0 ||
    !Number.isInteger(gate.expiry) ||
    gate.expiry < 0 ||
    !["confirmed", "expired"].includes(gate.status) ||
    !["fresh", "pending"].includes(gate.fresh_status) ||
    typeof gate.production_go !== "boolean" ||
    !["owner_confirmation_expired", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const expired = gate.expiry === 0 || gate.checked_at === 0 || gate.expiry <= gate.checked_at;
  if (
    gate.status !== (expired ? "expired" : "confirmed") ||
    gate.fresh_status !== (expired ? "pending" : "fresh") ||
    gate.production_go !== !expired ||
    gate.blocker_label !== (expired ? "owner_confirmation_expired" : "none")
  ) {
    throw new ContractError(`${context}: expiry gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createOwnerLiveConfirmationNoFixturePromotionGate({
  confirmation,
  fixturePass = false,
  dryRunPass = false,
} = {}) {
  assertOwnerLiveConfirmationSafe(
    confirmation,
    "owner live confirmation no fixture promotion gate"
  );
  const gate = {
    schema: "iris_owner_live_confirmation_no_fixture_promotion_gate_v1",
    scope: confirmation.scope,
    component: confirmation.component,
    fixture_pass: fixturePass === true,
    dry_run_pass: dryRunPass === true,
    confirmation_status: confirmation.status,
    auto_confirmed: false,
    production_go:
      confirmation.status === "confirmed" &&
      confirmation.confirmed_by_role === "owner",
  };
  assertOwnerLiveConfirmationNoFixturePromotionGateSafe(gate);
  return gate;
}

export function assertOwnerLiveConfirmationNoFixturePromotionGateSafe(
  gate,
  context = "owner live confirmation no fixture promotion gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !OWNER_LIVE_CONFIRMATION_NO_FIXTURE_PROMOTION_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !==
      "iris_owner_live_confirmation_no_fixture_promotion_gate_v1" ||
    !OWNER_LIVE_CONFIRMATION_SCOPES.has(gate.scope) ||
    !SAFE_LABEL_PATTERN.test(gate.component) ||
    typeof gate.fixture_pass !== "boolean" ||
    typeof gate.dry_run_pass !== "boolean" ||
    !OWNER_LIVE_CONFIRMATION_STATUSES.has(gate.confirmation_status) ||
    gate.auto_confirmed !== false ||
    typeof gate.production_go !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  if (
    gate.confirmation_status !== "confirmed" &&
    gate.production_go !== false
  ) {
    throw new ContractError(`${context}: fixture promotion mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createOwnerLiveConfirmationAuditLinkGate({
  confirmation,
  auditEntries = [],
} = {}) {
  assertOwnerLiveConfirmationSafe(
    confirmation,
    "owner live confirmation audit link gate"
  );
  const safeAuditEntries = new Set(
    (Array.isArray(auditEntries) ? auditEntries : [])
      .map((entry) => safeLabel(entry))
      .filter((entry) => entry !== "unknown")
  );
  const linked = safeAuditEntries.has(confirmation.audit_reference);
  const complete =
    linked &&
    confirmation.status === "confirmed" &&
    confirmation.confirmed_by_role === "owner";
  const gate = {
    schema: "iris_owner_live_confirmation_audit_link_gate_v1",
    scope: confirmation.scope,
    component: confirmation.component,
    audit_reference: confirmation.audit_reference,
    audit_link_status: linked ? "linked" : "missing",
    confirmation_complete: complete,
    production_go: complete,
    blocker_label: linked ? "none" : "owner_confirmation_audit_missing",
  };
  assertOwnerLiveConfirmationAuditLinkGateSafe(gate);
  return gate;
}

export function assertOwnerLiveConfirmationAuditLinkGateSafe(
  gate,
  context = "owner live confirmation audit link gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !OWNER_LIVE_CONFIRMATION_AUDIT_LINK_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_owner_live_confirmation_audit_link_gate_v1" ||
    !OWNER_LIVE_CONFIRMATION_SCOPES.has(gate.scope) ||
    !SAFE_LABEL_PATTERN.test(gate.component) ||
    !SAFE_LABEL_PATTERN.test(gate.audit_reference) ||
    !["linked", "missing"].includes(gate.audit_link_status) ||
    typeof gate.confirmation_complete !== "boolean" ||
    typeof gate.production_go !== "boolean" ||
    !["owner_confirmation_audit_missing", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const linked = gate.audit_link_status === "linked";
  if (
    gate.production_go !== gate.confirmation_complete ||
    (!linked && gate.confirmation_complete !== false) ||
    gate.blocker_label !== (linked ? "none" : "owner_confirmation_audit_missing")
  ) {
    throw new ContractError(`${context}: audit link gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createOwnerLiveConfirmationPublicSummary({
  confirmation,
} = {}) {
  assertOwnerLiveConfirmationSafe(
    confirmation,
    "owner live confirmation public summary"
  );
  const summary = {
    schema: "iris_owner_live_confirmation_public_summary_v1",
    scope: confirmation.scope,
    status: confirmation.status,
    expiry: confirmation.expiry,
  };
  assertOwnerLiveConfirmationPublicSummarySafe(summary);
  return summary;
}

export function assertOwnerLiveConfirmationPublicSummarySafe(
  summary,
  context = "owner live confirmation public summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !OWNER_LIVE_CONFIRMATION_PUBLIC_SUMMARY_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe summary field`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_owner_live_confirmation_public_summary_v1" ||
    !OWNER_LIVE_CONFIRMATION_SCOPES.has(summary.scope) ||
    !OWNER_LIVE_CONFIRMATION_STATUSES.has(summary.status) ||
    !Number.isInteger(summary.expiry) ||
    summary.expiry < 0
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  assertNoUnsafeAuditMaterial(summary, context);
}

export function createOwnerLiveConfirmationConflictGate({
  confirmations = [],
} = {}) {
  const safeConfirmations = (Array.isArray(confirmations) ? confirmations : []).map(
    (confirmation) => {
      assertOwnerLiveConfirmationSafe(
        confirmation,
        "owner live confirmation conflict gate item"
      );
      return confirmation;
    }
  );
  const first = safeConfirmations[0] ?? createOwnerLiveConfirmation();
  const observedStatuses = [
    ...new Set(safeConfirmations.map((confirmation) => confirmation.status)),
  ].sort();
  const hasConflict =
    observedStatuses.includes("confirmed") &&
    (observedStatuses.includes("revoked") ||
      observedStatuses.includes("expired") ||
      observedStatuses.includes("pending"));
  const gate = {
    schema: "iris_owner_live_confirmation_conflict_gate_v1",
    scope: first.scope,
    component: first.component,
    conflict_status: hasConflict ? "BLOCKED" : "clear",
    observed_statuses: observedStatuses,
    production_go: !hasConflict,
    blocker_label: hasConflict ? "owner_confirmation_conflict" : "none",
  };
  assertOwnerLiveConfirmationConflictGateSafe(gate);
  return gate;
}

export function assertOwnerLiveConfirmationConflictGateSafe(
  gate,
  context = "owner live confirmation conflict gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !OWNER_LIVE_CONFIRMATION_CONFLICT_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_owner_live_confirmation_conflict_gate_v1" ||
    !OWNER_LIVE_CONFIRMATION_SCOPES.has(gate.scope) ||
    !SAFE_LABEL_PATTERN.test(gate.component) ||
    !["BLOCKED", "clear"].includes(gate.conflict_status) ||
    !Array.isArray(gate.observed_statuses) ||
    typeof gate.production_go !== "boolean" ||
    !["owner_confirmation_conflict", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  for (const status of gate.observed_statuses) {
    if (!OWNER_LIVE_CONFIRMATION_STATUSES.has(status)) {
      throw new ContractError(`${context}: invalid observed status`);
    }
  }
  const hasConflict =
    gate.observed_statuses.includes("confirmed") &&
    (gate.observed_statuses.includes("revoked") ||
      gate.observed_statuses.includes("expired") ||
      gate.observed_statuses.includes("pending"));
  if (
    gate.conflict_status !== (hasConflict ? "BLOCKED" : "clear") ||
    gate.production_go !== !hasConflict ||
    gate.blocker_label !== (hasConflict ? "owner_confirmation_conflict" : "none")
  ) {
    throw new ContractError(`${context}: conflict gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createOwnerLiveConfirmationFixturePack() {
  const ownerConfirmed = createOwnerLiveConfirmation({
    scope: "bridge",
    component: "bridge_worker",
    confirmedByRole: "owner",
    confirmedAt: 1_000,
    status: "confirmed",
    expiry: 2_000,
    auditReference: "audit_entry_001",
  });
  const wrongRole = createOwnerLiveConfirmationProductionGoGate({
    confirmation: createOwnerLiveConfirmation({
      scope: "bridge",
      component: "bridge_worker",
      confirmedByRole: "operator",
      confirmedAt: 1_000,
      status: "confirmed",
      expiry: 2_000,
      auditReference: "audit_entry_002",
    }),
  });
  const expired = createOwnerLiveConfirmationExpiryGate({
    confirmation: ownerConfirmed,
    checkedAt: 3_000,
  });
  const revoked = createOwnerLiveConfirmationProductionGoGate({
    confirmation: revokeOwnerLiveConfirmation({ confirmation: ownerConfirmed }),
  });
  const missingAudit = createOwnerLiveConfirmationAuditLinkGate({
    confirmation: ownerConfirmed,
    auditEntries: [],
  });
  const autoConfirmAttempt = createOwnerLiveConfirmationNoFixturePromotionGate({
    confirmation: createOwnerLiveConfirmation({
      scope: "bridge",
      component: "bridge_worker",
      confirmedByRole: "owner",
      status: "pending",
      auditReference: "audit_entry_003",
    }),
    fixturePass: true,
    dryRunPass: true,
  });
  const noteLeakRejected = throwsContractError(() =>
    assertOwnerLiveConfirmationSafe({
      ...ownerConfirmed,
      raw_note: "operator private detail",
    })
  );
  const pack = {
    schema: "iris_owner_live_confirmation_fixture_pack_v1",
    pack_status:
      wrongRole.production_go === false &&
      expired.production_go === false &&
      revoked.production_go === false &&
      missingAudit.production_go === false &&
      autoConfirmAttempt.auto_confirmed === false &&
      autoConfirmAttempt.production_go === false &&
      noteLeakRejected
        ? "pass"
        : "fail",
    fixture_count: 6,
    wrong_role_fixture: createFixtureResult("wrong_role", wrongRole.blocker_label),
    expired_fixture: createFixtureResult("expired", expired.fresh_status),
    revoked_fixture: createFixtureResult("revoked", revoked.blocker_label),
    missing_audit_fixture: createFixtureResult(
      "missing_audit",
      missingAudit.audit_link_status
    ),
    auto_confirm_attempt_fixture: createFixtureResult(
      "auto_confirm_attempt",
      autoConfirmAttempt.auto_confirmed ? "accepted" : "blocked"
    ),
    note_leak_fixture: createFixtureResult(
      "note_leak",
      noteLeakRejected ? "rejected" : "accepted"
    ),
  };
  assertOwnerLiveConfirmationFixturePackSafe(pack);
  return pack;
}

export function assertOwnerLiveConfirmationFixturePackSafe(
  pack,
  context = "owner live confirmation fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  for (const field of Object.keys(pack)) {
    if (
      !OWNER_LIVE_CONFIRMATION_FIXTURE_PACK_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe pack field`, {
        field,
      });
    }
  }
  if (
    pack.schema !== "iris_owner_live_confirmation_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 6
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  for (const field of [
    "wrong_role_fixture",
    "expired_fixture",
    "revoked_fixture",
    "missing_audit_fixture",
    "auto_confirm_attempt_fixture",
    "note_leak_fixture",
  ]) {
    assertOwnerConfirmationFixtureResultSafe(pack[field], context);
  }
  const expected = {
    wrong_role_fixture: ["wrong_role", "owner_role_required"],
    expired_fixture: ["expired", "pending"],
    revoked_fixture: ["revoked", "owner_confirmation_required"],
    missing_audit_fixture: ["missing_audit", "missing"],
    auto_confirm_attempt_fixture: ["auto_confirm_attempt", "blocked"],
    note_leak_fixture: ["note_leak", "rejected"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
  assertNoUnsafeAuditMaterial(pack, context);
}

export function createLiveHandoffEvidenceBundle({
  realEvidence = [],
  ownerConfirmation,
  auditReference = "audit_pending",
  blockerLabels = [],
} = {}) {
  const safeRealEvidence = (Array.isArray(realEvidence) ? realEvidence : []).map(
    (evidence) => {
      assertRealEvidenceIntakeSafe(evidence, "live handoff evidence bundle item");
      return evidence;
    }
  );
  const confirmation =
    ownerConfirmation ??
    createOwnerLiveConfirmation({
      status: "pending",
      auditReference,
    });
  assertOwnerLiveConfirmationSafe(
    confirmation,
    "live handoff evidence bundle owner confirmation"
  );
  const safeBlockerLabels = [
    ...new Set(
      (Array.isArray(blockerLabels) ? blockerLabels : [])
        .map((label) => safeLabel(label))
        .filter((label) => label !== "unknown")
    ),
  ].sort();
  const bundle = {
    schema: "iris_live_handoff_evidence_bundle_v1",
    bundle_status: safeBlockerLabels.length === 0 ? "collected" : "BLOCKED",
    real_evidence: safeRealEvidence,
    owner_confirmation: createOwnerLiveConfirmationPublicSummary({
      confirmation,
    }),
    audit_reference: safeLabel(auditReference),
    blocker_summary: {
      schema: "iris_live_handoff_bundle_blocker_summary_v1",
      blocker_status: safeBlockerLabels.length === 0 ? "clear" : "BLOCKED",
      blocker_count: safeBlockerLabels.length,
      blocker_labels: safeBlockerLabels,
    },
  };
  assertLiveHandoffEvidenceBundleSafe(bundle);
  return bundle;
}

export function assertLiveHandoffEvidenceBundleSafe(
  bundle,
  context = "live handoff evidence bundle"
) {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw new ContractError(`${context}: bundle required`);
  }
  for (const field of Object.keys(bundle)) {
    if (
      !LIVE_HANDOFF_EVIDENCE_BUNDLE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe bundle field`, {
        field,
      });
    }
  }
  if (
    bundle.schema !== "iris_live_handoff_evidence_bundle_v1" ||
    !["collected", "BLOCKED"].includes(bundle.bundle_status) ||
    !Array.isArray(bundle.real_evidence) ||
    !SAFE_LABEL_PATTERN.test(bundle.audit_reference)
  ) {
    throw new ContractError(`${context}: invalid bundle`);
  }
  for (const evidence of bundle.real_evidence) {
    assertRealEvidenceIntakeSafe(evidence, `${context}: real evidence`);
  }
  assertOwnerLiveConfirmationPublicSummarySafe(
    bundle.owner_confirmation,
    `${context}: owner confirmation`
  );
  assertLiveHandoffBundleBlockerSummarySafe(
    bundle.blocker_summary,
    `${context}: blocker summary`
  );
  if (
    bundle.bundle_status !==
    (bundle.blocker_summary.blocker_count === 0 ? "collected" : "BLOCKED")
  ) {
    throw new ContractError(`${context}: bundle status mismatch`);
  }
  assertNoUnsafeAuditMaterial(bundle, context);
}

export function createLiveHandoffBundleCompletenessGate({
  bundle,
  requiredComponents = [],
} = {}) {
  assertLiveHandoffEvidenceBundleSafe(
    bundle,
    "live handoff bundle completeness source"
  );
  const safeRequiredComponents = [
    ...new Set(
      (Array.isArray(requiredComponents) ? requiredComponents : [])
        .map((component) => safeLabel(component))
        .filter((component) => component !== "unknown")
    ),
  ].sort();
  const presentComponents = new Set(
    bundle.real_evidence.map((evidence) => evidence.component)
  );
  const missingComponents = safeRequiredComponents.filter(
    (component) => !presentComponents.has(component)
  );
  const gate = {
    schema: "iris_live_handoff_bundle_completeness_gate_v1",
    required_component_count: safeRequiredComponents.length,
    present_component_count: safeRequiredComponents.length - missingComponents.length,
    missing_component_count: missingComponents.length,
    missing_components: missingComponents,
    handoff_ready: missingComponents.length === 0,
    blocker_label:
      missingComponents.length === 0 ? "none" : "required_component_missing",
  };
  assertLiveHandoffBundleCompletenessGateSafe(gate);
  return gate;
}

export function assertLiveHandoffBundleCompletenessGateSafe(
  gate,
  context = "live handoff bundle completeness gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_HANDOFF_BUNDLE_COMPLETENESS_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_handoff_bundle_completeness_gate_v1" ||
    !Number.isInteger(gate.required_component_count) ||
    !Number.isInteger(gate.present_component_count) ||
    !Number.isInteger(gate.missing_component_count) ||
    gate.required_component_count < 0 ||
    gate.present_component_count < 0 ||
    gate.missing_component_count < 0 ||
    !Array.isArray(gate.missing_components) ||
    typeof gate.handoff_ready !== "boolean" ||
    !["required_component_missing", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  for (const component of gate.missing_components) {
    if (!SAFE_LABEL_PATTERN.test(component)) {
      throw new ContractError(`${context}: invalid missing component`);
    }
  }
  if (
    gate.missing_component_count !== gate.missing_components.length ||
    gate.present_component_count !==
      gate.required_component_count - gate.missing_component_count ||
    gate.handoff_ready !== (gate.missing_component_count === 0) ||
    gate.blocker_label !==
      (gate.missing_component_count === 0 ? "none" : "required_component_missing")
  ) {
    throw new ContractError(`${context}: completeness gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveHandoffBundleFreshnessGate({
  bundle,
  nowMs = Date.now(),
  componentThresholdsMs = {},
} = {}) {
  assertLiveHandoffEvidenceBundleSafe(
    bundle,
    "live handoff bundle freshness source"
  );
  const staleComponents = bundle.real_evidence
    .filter(
      (evidence) =>
        classifyRealEvidenceFreshness({
          evidence,
          nowMs,
          componentThresholdsMs,
        }) !== "fresh"
    )
    .map((evidence) => evidence.component)
    .sort();
  const gate = {
    schema: "iris_live_handoff_bundle_freshness_gate_v1",
    evidence_count: bundle.real_evidence.length,
    stale_evidence_count: staleComponents.length,
    stale_components: staleComponents,
    handoff_ready: staleComponents.length === 0,
    blocker_label: staleComponents.length === 0 ? "none" : "stale_evidence",
  };
  assertLiveHandoffBundleFreshnessGateSafe(gate);
  return gate;
}

export function assertLiveHandoffBundleFreshnessGateSafe(
  gate,
  context = "live handoff bundle freshness gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_HANDOFF_BUNDLE_FRESHNESS_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_handoff_bundle_freshness_gate_v1" ||
    !Number.isInteger(gate.evidence_count) ||
    !Number.isInteger(gate.stale_evidence_count) ||
    gate.evidence_count < 0 ||
    gate.stale_evidence_count < 0 ||
    !Array.isArray(gate.stale_components) ||
    typeof gate.handoff_ready !== "boolean" ||
    !["stale_evidence", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  for (const component of gate.stale_components) {
    if (!SAFE_LABEL_PATTERN.test(component)) {
      throw new ContractError(`${context}: invalid stale component`);
    }
  }
  if (
    gate.stale_evidence_count !== gate.stale_components.length ||
    gate.stale_evidence_count > gate.evidence_count ||
    gate.handoff_ready !== (gate.stale_evidence_count === 0) ||
    gate.blocker_label !==
      (gate.stale_evidence_count === 0 ? "none" : "stale_evidence")
  ) {
    throw new ContractError(`${context}: freshness gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveHandoffBundleOwnerGate({
  bundle,
  checkedAt = Date.now(),
} = {}) {
  assertLiveHandoffEvidenceBundleSafe(bundle, "live handoff bundle owner source");
  const safeCheckedAt = normalizeTimestampMs(checkedAt);
  const confirmation = bundle.owner_confirmation;
  const expired =
    confirmation.status === "confirmed" &&
    confirmation.expiry === 0 ||
    (confirmation.status === "confirmed" &&
      (safeCheckedAt === 0 || confirmation.expiry <= safeCheckedAt));
  const ownerStatus = expired ? "expired" : confirmation.status;
  const gate = {
    schema: "iris_live_handoff_bundle_owner_gate_v1",
    owner_status: ownerStatus,
    checked_at: safeCheckedAt,
    expiry: confirmation.expiry,
    handoff_ready: ownerStatus === "confirmed",
    blocker_label: ownerStatus === "confirmed" ? "none" : "owner_confirmation_required",
  };
  assertLiveHandoffBundleOwnerGateSafe(gate);
  return gate;
}

export function assertLiveHandoffBundleOwnerGateSafe(
  gate,
  context = "live handoff bundle owner gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_HANDOFF_BUNDLE_OWNER_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_handoff_bundle_owner_gate_v1" ||
    !["confirmed", "pending", "expired", "revoked"].includes(gate.owner_status) ||
    !Number.isInteger(gate.checked_at) ||
    gate.checked_at < 0 ||
    !Number.isInteger(gate.expiry) ||
    gate.expiry < 0 ||
    typeof gate.handoff_ready !== "boolean" ||
    !["owner_confirmation_required", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  if (
    gate.handoff_ready !== (gate.owner_status === "confirmed") ||
    gate.blocker_label !==
      (gate.owner_status === "confirmed" ? "none" : "owner_confirmation_required")
  ) {
    throw new ContractError(`${context}: owner gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveHandoffBundleEmergencyGate({
  emergencyStopEvidence,
} = {}) {
  assertFreshEvidenceEnvelopeSafe(
    emergencyStopEvidence,
    "live handoff bundle emergency evidence"
  );
  const fresh = emergencyStopEvidence.freshness === "fresh";
  const gate = {
    schema: "iris_live_handoff_bundle_emergency_gate_v1",
    emergency_stop_freshness: emergencyStopEvidence.freshness,
    handoff_ready: fresh,
    blocker_label: fresh ? "none" : "emergency_stop_fresh_evidence_required",
  };
  assertLiveHandoffBundleEmergencyGateSafe(gate);
  return gate;
}

export function assertLiveHandoffBundleEmergencyGateSafe(
  gate,
  context = "live handoff bundle emergency gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_HANDOFF_BUNDLE_EMERGENCY_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_handoff_bundle_emergency_gate_v1" ||
    !["fresh", "stale", "runtime_waiting", "attention"].includes(
      gate.emergency_stop_freshness
    ) ||
    typeof gate.handoff_ready !== "boolean" ||
    !["emergency_stop_fresh_evidence_required", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const fresh = gate.emergency_stop_freshness === "fresh";
  if (
    gate.handoff_ready !== fresh ||
    gate.blocker_label !==
      (fresh ? "none" : "emergency_stop_fresh_evidence_required")
  ) {
    throw new ContractError(`${context}: emergency gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveHandoffBundleAuditGate({
  bundle,
  auditReadinessStatus = "missing",
  auditEntries = [],
} = {}) {
  assertLiveHandoffEvidenceBundleSafe(bundle, "live handoff bundle audit source");
  const auditStatus = safeAuditReadinessStatus(auditReadinessStatus);
  const safeAuditEntries = new Set(
    (Array.isArray(auditEntries) ? auditEntries : [])
      .map((entry) => safeLabel(entry))
      .filter((entry) => entry !== "unknown")
  );
  const linked = safeAuditEntries.has(bundle.audit_reference);
  const ready = auditStatus === "ready" && linked;
  const gate = {
    schema: "iris_live_handoff_bundle_audit_gate_v1",
    audit_readiness_status: auditStatus,
    bundle_audit_reference_status: linked ? "linked" : "missing",
    handoff_ready: ready,
    blocker_label: ready ? "none" : "audit_reference_required",
  };
  assertLiveHandoffBundleAuditGateSafe(gate);
  return gate;
}

export function assertLiveHandoffBundleAuditGateSafe(
  gate,
  context = "live handoff bundle audit gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_HANDOFF_BUNDLE_AUDIT_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_handoff_bundle_audit_gate_v1" ||
    !["ready", "missing", "attention"].includes(gate.audit_readiness_status) ||
    !["linked", "missing"].includes(gate.bundle_audit_reference_status) ||
    typeof gate.handoff_ready !== "boolean" ||
    !["audit_reference_required", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const ready =
    gate.audit_readiness_status === "ready" &&
    gate.bundle_audit_reference_status === "linked";
  if (
    gate.handoff_ready !== ready ||
    gate.blocker_label !== (ready ? "none" : "audit_reference_required")
  ) {
    throw new ContractError(`${context}: audit gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveHandoffBundleSafeSummary({ bundle } = {}) {
  assertLiveHandoffEvidenceBundleSafe(bundle, "live handoff bundle safe summary");
  const summary = {
    schema: "iris_live_handoff_bundle_safe_summary_v1",
    bundle_status: bundle.bundle_status,
    evidence_count: bundle.real_evidence.length,
    owner_confirmation_status: bundle.owner_confirmation.status,
    audit_reference_status:
      bundle.audit_reference === "audit_pending" ? "missing" : "present",
    blocker_count: bundle.blocker_summary.blocker_count,
    blocker_labels: [...bundle.blocker_summary.blocker_labels],
  };
  assertLiveHandoffBundleSafeSummarySafe(summary);
  return summary;
}

export function assertLiveHandoffBundleSafeSummarySafe(
  summary,
  context = "live handoff bundle safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !LIVE_HANDOFF_BUNDLE_SAFE_SUMMARY_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe summary field`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_live_handoff_bundle_safe_summary_v1" ||
    !["collected", "BLOCKED"].includes(summary.bundle_status) ||
    !Number.isInteger(summary.evidence_count) ||
    summary.evidence_count < 0 ||
    !OWNER_LIVE_CONFIRMATION_STATUSES.has(summary.owner_confirmation_status) ||
    !["present", "missing"].includes(summary.audit_reference_status) ||
    !Number.isInteger(summary.blocker_count) ||
    summary.blocker_count < 0 ||
    !Array.isArray(summary.blocker_labels) ||
    summary.blocker_count !== summary.blocker_labels.length
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  for (const label of summary.blocker_labels) {
    if (!SAFE_LABEL_PATTERN.test(label)) {
      throw new ContractError(`${context}: invalid blocker label`);
    }
  }
  assertNoUnsafeAuditMaterial(summary, context);
}

export function createLiveHandoffBundleDryRunGate({ bundle } = {}) {
  assertLiveHandoffEvidenceBundleSafe(bundle, "live handoff bundle dry-run source");
  const gate = {
    schema: "iris_live_handoff_bundle_dry_run_gate_v1",
    dry_run_status: "simulated",
    real_operation_performed: false,
    worker_started: false,
    obs_changed: false,
    db_connected: false,
    game_input_sent: false,
    handoff_ready_claimed: false,
  };
  assertLiveHandoffBundleDryRunGateSafe(gate);
  return gate;
}

export function assertLiveHandoffBundleDryRunGateSafe(
  gate,
  context = "live handoff bundle dry-run gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_HANDOFF_BUNDLE_DRY_RUN_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_handoff_bundle_dry_run_gate_v1" ||
    gate.dry_run_status !== "simulated" ||
    gate.real_operation_performed !== false ||
    gate.worker_started !== false ||
    gate.obs_changed !== false ||
    gate.db_connected !== false ||
    gate.game_input_sent !== false ||
    gate.handoff_ready_claimed !== false
  ) {
    throw new ContractError(`${context}: invalid dry-run gate`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveHandoffBundleNoSweeteningGate({
  bundle,
  degradedMode = false,
  fixturePass = false,
} = {}) {
  assertLiveHandoffEvidenceBundleSafe(
    bundle,
    "live handoff bundle no-sweetening source"
  );
  const hasBlocker = bundle.blocker_summary.blocker_count > 0;
  const gate = {
    schema: "iris_live_handoff_bundle_no_sweetening_gate_v1",
    bundle_status: bundle.bundle_status,
    blocker_count: bundle.blocker_summary.blocker_count,
    degraded_mode: degradedMode === true,
    fixture_pass: fixturePass === true,
    handoff_ready: !hasBlocker,
    blocker_label: hasBlocker ? "bundle_blocker_unresolved" : "none",
  };
  assertLiveHandoffBundleNoSweeteningGateSafe(gate);
  return gate;
}

export function assertLiveHandoffBundleNoSweeteningGateSafe(
  gate,
  context = "live handoff bundle no-sweetening gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_HANDOFF_BUNDLE_NO_SWEETENING_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_handoff_bundle_no_sweetening_gate_v1" ||
    !["collected", "BLOCKED"].includes(gate.bundle_status) ||
    !Number.isInteger(gate.blocker_count) ||
    gate.blocker_count < 0 ||
    typeof gate.degraded_mode !== "boolean" ||
    typeof gate.fixture_pass !== "boolean" ||
    typeof gate.handoff_ready !== "boolean" ||
    !["bundle_blocker_unresolved", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const hasBlocker = gate.blocker_count > 0;
  if (
    gate.handoff_ready !== !hasBlocker ||
    gate.blocker_label !== (hasBlocker ? "bundle_blocker_unresolved" : "none")
  ) {
    throw new ContractError(`${context}: no-sweetening gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveHandoffBundleFixturePack({ nowMs = 100_000 } = {}) {
  const evidence = createRealEvidenceIntake({
    component: "bridge_worker",
    status: "ready",
    evidenceTimestampMs: nowMs - 1_000,
    sourceType: "real_probe",
    collector: "local_probe",
    statusHash: "abcdef0123456789",
    auditReference: "audit_entry_001",
  });
  const staleEvidence = createRealEvidenceIntake({
    component: "tts_engine",
    status: "ready",
    evidenceTimestampMs: nowMs - 60_000,
    sourceType: "real_probe",
    collector: "local_probe",
    statusHash: "1234567890abcdef",
    auditReference: "audit_entry_002",
  });
  const ownerConfirmation = createOwnerLiveConfirmation({
    scope: "bridge",
    component: "bridge_worker",
    confirmedByRole: "owner",
    confirmedAt: nowMs - 1_000,
    status: "confirmed",
    expiry: nowMs + 60_000,
    auditReference: "audit_entry_001",
  });
  const completeBundle = createLiveHandoffEvidenceBundle({
    realEvidence: [evidence],
    ownerConfirmation,
    auditReference: "audit_entry_001",
  });
  const complete =
    createLiveHandoffBundleCompletenessGate({
      bundle: completeBundle,
      requiredComponents: ["bridge_worker"],
    }).handoff_ready &&
    createLiveHandoffBundleFreshnessGate({
      bundle: completeBundle,
      nowMs,
      componentThresholdsMs: { bridge_worker: 10_000 },
    }).handoff_ready &&
    createLiveHandoffBundleOwnerGate({
      bundle: completeBundle,
      checkedAt: nowMs,
    }).handoff_ready &&
    createLiveHandoffBundleEmergencyGate({
      emergencyStopEvidence: createFreshEvidenceEnvelope({
        component: "emergency_stop",
        status: "ready",
        evidenceTimestampMs: nowMs,
        evidenceSource: "real_probe",
        freshness: "fresh",
        nowMs,
      }),
    }).handoff_ready &&
    createLiveHandoffBundleAuditGate({
      bundle: completeBundle,
      auditReadinessStatus: "ready",
      auditEntries: ["audit_entry_001"],
    }).handoff_ready;
  const stale = createLiveHandoffBundleFreshnessGate({
    bundle: createLiveHandoffEvidenceBundle({
      realEvidence: [evidence, staleEvidence],
      ownerConfirmation,
      auditReference: "audit_entry_001",
    }),
    nowMs,
    componentThresholdsMs: { bridge_worker: 10_000, tts_engine: 10_000 },
  });
  const missingOwner = createLiveHandoffBundleOwnerGate({
    bundle: createLiveHandoffEvidenceBundle({
      realEvidence: [evidence],
      ownerConfirmation: createOwnerLiveConfirmation({
        scope: "bridge",
        component: "bridge_worker",
        status: "pending",
        auditReference: "audit_entry_001",
      }),
      auditReference: "audit_entry_001",
    }),
    checkedAt: nowMs,
  });
  const missingEmergency = createLiveHandoffBundleEmergencyGate({
    emergencyStopEvidence: createFreshEvidenceEnvelope({
      component: "emergency_stop",
      status: "attention",
      evidenceTimestampMs: nowMs - 60_000,
      evidenceSource: "real_probe",
      freshness: "stale",
      nowMs,
    }),
  });
  const missingAudit = createLiveHandoffBundleAuditGate({
    bundle: completeBundle,
    auditReadinessStatus: "missing",
    auditEntries: [],
  });
  const secretLeakRejected = throwsContractError(() =>
    assertLiveHandoffEvidenceBundleSafe({
      ...completeBundle,
      private_token: "secret",
    })
  );
  const pack = {
    schema: "iris_live_handoff_bundle_fixture_pack_v1",
    pack_status:
      complete &&
      stale.handoff_ready === false &&
      missingOwner.handoff_ready === false &&
      missingEmergency.handoff_ready === false &&
      missingAudit.handoff_ready === false &&
      secretLeakRejected
        ? "pass"
        : "fail",
    fixture_count: 6,
    complete_fixture: createLiveHandoffFixtureResult(
      "complete",
      complete ? "ready" : "blocked"
    ),
    stale_fixture: createLiveHandoffFixtureResult(
      "stale",
      stale.blocker_label
    ),
    missing_owner_fixture: createLiveHandoffFixtureResult(
      "missing_owner",
      missingOwner.blocker_label
    ),
    missing_emergency_fixture: createLiveHandoffFixtureResult(
      "missing_emergency",
      missingEmergency.blocker_label
    ),
    missing_audit_fixture: createLiveHandoffFixtureResult(
      "missing_audit",
      missingAudit.blocker_label
    ),
    leak_reject_fixture: createLiveHandoffFixtureResult(
      "leak_reject",
      secretLeakRejected ? "rejected" : "accepted"
    ),
  };
  assertLiveHandoffBundleFixturePackSafe(pack);
  return pack;
}

export function assertLiveHandoffBundleFixturePackSafe(
  pack,
  context = "live handoff bundle fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  for (const field of Object.keys(pack)) {
    if (
      !LIVE_HANDOFF_BUNDLE_FIXTURE_PACK_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe pack field`, {
        field,
      });
    }
  }
  if (
    pack.schema !== "iris_live_handoff_bundle_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 6
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  for (const field of [
    "complete_fixture",
    "stale_fixture",
    "missing_owner_fixture",
    "missing_emergency_fixture",
    "missing_audit_fixture",
    "leak_reject_fixture",
  ]) {
    assertLiveHandoffFixtureResultSafe(pack[field], context);
  }
  const expected = {
    complete_fixture: ["complete", "ready"],
    stale_fixture: ["stale", "stale_evidence"],
    missing_owner_fixture: ["missing_owner", "owner_confirmation_required"],
    missing_emergency_fixture: [
      "missing_emergency",
      "emergency_stop_fresh_evidence_required",
    ],
    missing_audit_fixture: ["missing_audit", "audit_reference_required"],
    leak_reject_fixture: ["leak_reject", "rejected"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
  assertNoUnsafeAuditMaterial(pack, context);
}

export function createLiveGoNoGoEvidenceEvaluator({
  bundle,
  fixtureOnly = false,
  dryRunOnly = false,
} = {}) {
  assertLiveHandoffEvidenceBundleSafe(bundle, "live go/no-go evidence bundle");
  const realEvidenceCount = bundle.real_evidence.length;
  const blockerCount = bundle.blocker_summary.blocker_count;
  const blocked =
    realEvidenceCount === 0 ||
    blockerCount > 0 ||
    fixtureOnly === true ||
    dryRunOnly === true;
  const evaluator = {
    schema: "iris_live_go_no_go_evidence_evaluator_v1",
    decision_status: blocked ? "no_go" : "go",
    go: !blocked,
    real_evidence_count: realEvidenceCount,
    blocker_count: blockerCount,
    fixture_only: fixtureOnly === true,
    dry_run_only: dryRunOnly === true,
    blocker_label:
      realEvidenceCount === 0
        ? "real_evidence_required"
        : blockerCount > 0
          ? "bundle_blocker_unresolved"
          : fixtureOnly === true
            ? "fixture_only_not_go"
            : dryRunOnly === true
              ? "dry_run_only_not_go"
              : "none",
  };
  assertLiveGoNoGoEvidenceEvaluatorSafe(evaluator);
  return evaluator;
}

export function assertLiveGoNoGoEvidenceEvaluatorSafe(
  evaluator,
  context = "live go/no-go evidence evaluator"
) {
  if (!evaluator || typeof evaluator !== "object" || Array.isArray(evaluator)) {
    throw new ContractError(`${context}: evaluator required`);
  }
  for (const field of Object.keys(evaluator)) {
    if (
      !LIVE_GO_NO_GO_EVIDENCE_EVALUATOR_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe evaluator field`, {
        field,
      });
    }
  }
  if (
    evaluator.schema !== "iris_live_go_no_go_evidence_evaluator_v1" ||
    !["go", "no_go"].includes(evaluator.decision_status) ||
    typeof evaluator.go !== "boolean" ||
    !Number.isInteger(evaluator.real_evidence_count) ||
    evaluator.real_evidence_count < 0 ||
    !Number.isInteger(evaluator.blocker_count) ||
    evaluator.blocker_count < 0 ||
    typeof evaluator.fixture_only !== "boolean" ||
    typeof evaluator.dry_run_only !== "boolean" ||
    ![
      "real_evidence_required",
      "bundle_blocker_unresolved",
      "fixture_only_not_go",
      "dry_run_only_not_go",
      "none",
    ].includes(evaluator.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid evaluator`);
  }
  const blocked =
    evaluator.real_evidence_count === 0 ||
    evaluator.blocker_count > 0 ||
    evaluator.fixture_only ||
    evaluator.dry_run_only;
  const expectedBlocker =
    evaluator.real_evidence_count === 0
      ? "real_evidence_required"
      : evaluator.blocker_count > 0
        ? "bundle_blocker_unresolved"
        : evaluator.fixture_only
          ? "fixture_only_not_go"
          : evaluator.dry_run_only
            ? "dry_run_only_not_go"
            : "none";
  if (
    evaluator.go !== !blocked ||
    evaluator.decision_status !== (blocked ? "no_go" : "go") ||
    evaluator.blocker_label !== expectedBlocker
  ) {
    throw new ContractError(`${context}: evaluator mismatch`);
  }
  assertNoUnsafeAuditMaterial(evaluator, context);
}

export function createLiveGoNoGoCriticalBlockerGate({
  components = [],
  criticalBlockers = [],
} = {}) {
  const safeComponents = (Array.isArray(components) ? components : [])
    .map((component) => safeLabel(component))
    .filter((component) => component !== "unknown");
  const safeCriticalBlockers = [
    ...new Set(
      (Array.isArray(criticalBlockers) ? criticalBlockers : [])
        .map((blocker) => safeLabel(blocker))
        .filter((blocker) => blocker !== "unknown")
    ),
  ].sort();
  const gate = {
    schema: "iris_live_go_no_go_critical_blocker_gate_v1",
    component_count: safeComponents.length,
    ready_component_count: safeComponents.length,
    critical_blocker_count: safeCriticalBlockers.length,
    critical_blockers: safeCriticalBlockers,
    go: safeCriticalBlockers.length === 0,
    blocker_label:
      safeCriticalBlockers.length === 0 ? "none" : "critical_blocker_present",
  };
  assertLiveGoNoGoCriticalBlockerGateSafe(gate);
  return gate;
}

export function assertLiveGoNoGoCriticalBlockerGateSafe(
  gate,
  context = "live go/no-go critical blocker gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_GO_NO_GO_CRITICAL_BLOCKER_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_go_no_go_critical_blocker_gate_v1" ||
    !Number.isInteger(gate.component_count) ||
    !Number.isInteger(gate.ready_component_count) ||
    !Number.isInteger(gate.critical_blocker_count) ||
    gate.component_count < 0 ||
    gate.ready_component_count < 0 ||
    gate.ready_component_count > gate.component_count ||
    gate.critical_blocker_count < 0 ||
    !Array.isArray(gate.critical_blockers) ||
    gate.critical_blocker_count !== gate.critical_blockers.length ||
    typeof gate.go !== "boolean" ||
    !["critical_blocker_present", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  for (const blocker of gate.critical_blockers) {
    if (!SAFE_LABEL_PATTERN.test(blocker)) {
      throw new ContractError(`${context}: invalid critical blocker`);
    }
  }
  const blocked = gate.critical_blocker_count > 0;
  if (
    gate.go !== !blocked ||
    gate.blocker_label !== (blocked ? "critical_blocker_present" : "none")
  ) {
    throw new ContractError(`${context}: critical blocker gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveGoNoGoDegradedModeGate({
  go = false,
  degradedComponents = [],
} = {}) {
  const safeDegradedComponents = [
    ...new Set(
      (Array.isArray(degradedComponents) ? degradedComponents : [])
        .map((component) => safeLabel(component))
        .filter((component) => component !== "unknown")
    ),
  ].sort();
  const gate = {
    schema: "iris_live_go_no_go_degraded_mode_gate_v1",
    go: go === true,
    degraded_mode_available: safeDegradedComponents.length > 0,
    degraded_component_count: safeDegradedComponents.length,
    degraded_components: safeDegradedComponents,
    blocker_label:
      go === true
        ? "none"
        : safeDegradedComponents.length > 0
          ? "degraded_mode_not_go"
          : "none",
  };
  assertLiveGoNoGoDegradedModeGateSafe(gate);
  return gate;
}

export function assertLiveGoNoGoDegradedModeGateSafe(
  gate,
  context = "live go/no-go degraded mode gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_GO_NO_GO_DEGRADED_MODE_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_go_no_go_degraded_mode_gate_v1" ||
    typeof gate.go !== "boolean" ||
    typeof gate.degraded_mode_available !== "boolean" ||
    !Number.isInteger(gate.degraded_component_count) ||
    gate.degraded_component_count < 0 ||
    !Array.isArray(gate.degraded_components) ||
    !["degraded_mode_not_go", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  for (const component of gate.degraded_components) {
    if (!SAFE_LABEL_PATTERN.test(component)) {
      throw new ContractError(`${context}: invalid degraded component`);
    }
  }
  const degradedAvailable = gate.degraded_component_count > 0;
  if (
    gate.degraded_component_count !== gate.degraded_components.length ||
    gate.degraded_mode_available !== degradedAvailable ||
    (gate.go && gate.blocker_label !== "none") ||
    (!gate.go &&
      gate.blocker_label !== (degradedAvailable ? "degraded_mode_not_go" : "none"))
  ) {
    throw new ContractError(`${context}: degraded mode gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveGoNoGoOwnerFinalApprovalGate({
  ownerApproval,
} = {}) {
  const approval =
    ownerApproval ??
    createOwnerLiveConfirmation({
      scope: "go_no_go",
      component: "go_no_go",
      status: "pending",
    });
  assertOwnerLiveConfirmationSafe(
    approval,
    "live go/no-go owner final approval gate"
  );
  const approved =
    approval.status === "confirmed" && approval.confirmed_by_role === "owner";
  const gate = {
    schema: "iris_live_go_no_go_owner_final_approval_gate_v1",
    approval_status: approval.status,
    approved_by_role: approval.confirmed_by_role,
    go: approved,
    blocker_label: approved ? "none" : "owner_final_approval_required",
  };
  assertLiveGoNoGoOwnerFinalApprovalGateSafe(gate);
  return gate;
}

export function assertLiveGoNoGoOwnerFinalApprovalGateSafe(
  gate,
  context = "live go/no-go owner final approval gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_GO_NO_GO_OWNER_FINAL_APPROVAL_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_go_no_go_owner_final_approval_gate_v1" ||
    !OWNER_LIVE_CONFIRMATION_STATUSES.has(gate.approval_status) ||
    !["owner", "admin", "operator"].includes(gate.approved_by_role) ||
    typeof gate.go !== "boolean" ||
    !["owner_final_approval_required", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const approved =
    gate.approval_status === "confirmed" && gate.approved_by_role === "owner";
  if (
    gate.go !== approved ||
    gate.blocker_label !== (approved ? "none" : "owner_final_approval_required")
  ) {
    throw new ContractError(`${context}: owner final approval gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveGoNoGoEmergencyFinalGate({
  emergencyStopEvidence,
} = {}) {
  assertFreshEvidenceEnvelopeSafe(
    emergencyStopEvidence,
    "live go/no-go emergency final evidence"
  );
  const fresh = emergencyStopEvidence.freshness === "fresh";
  const gate = {
    schema: "iris_live_go_no_go_emergency_final_gate_v1",
    emergency_stop_freshness: emergencyStopEvidence.freshness,
    go: fresh,
    blocker_label: fresh ? "none" : "emergency_stop_final_required",
  };
  assertLiveGoNoGoEmergencyFinalGateSafe(gate);
  return gate;
}

export function assertLiveGoNoGoEmergencyFinalGateSafe(
  gate,
  context = "live go/no-go emergency final gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_GO_NO_GO_EMERGENCY_FINAL_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_go_no_go_emergency_final_gate_v1" ||
    !["fresh", "stale", "runtime_waiting", "attention"].includes(
      gate.emergency_stop_freshness
    ) ||
    typeof gate.go !== "boolean" ||
    !["emergency_stop_final_required", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const fresh = gate.emergency_stop_freshness === "fresh";
  if (
    gate.go !== fresh ||
    gate.blocker_label !== (fresh ? "none" : "emergency_stop_final_required")
  ) {
    throw new ContractError(`${context}: emergency final gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveGoNoGoAuditEvent({
  actorRole = "owner",
  safeTarget = "go_no_go",
  decisionStatus = "no_go",
  auditTimestampMs = Date.now(),
} = {}) {
  const event = {
    schema: "iris_live_go_no_go_audit_event_v1",
    actor_role: safeActorRole(actorRole),
    safe_target: safeLabel(safeTarget),
    decision_status: safeGoNoGoDecisionStatus(decisionStatus),
    audit_timestamp_ms: normalizeTimestampMs(auditTimestampMs),
  };
  assertLiveGoNoGoAuditEventSafe(event);
  return event;
}

export function assertLiveGoNoGoAuditEventSafe(
  event,
  context = "live go/no-go audit event"
) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new ContractError(`${context}: event required`);
  }
  for (const field of Object.keys(event)) {
    if (
      !LIVE_GO_NO_GO_AUDIT_EVENT_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe event field`, {
        field,
      });
    }
  }
  if (
    event.schema !== "iris_live_go_no_go_audit_event_v1" ||
    !["owner", "admin", "operator"].includes(event.actor_role) ||
    !SAFE_LABEL_PATTERN.test(event.safe_target) ||
    !["go", "no_go"].includes(event.decision_status) ||
    !Number.isInteger(event.audit_timestamp_ms) ||
    event.audit_timestamp_ms < 0
  ) {
    throw new ContractError(`${context}: invalid event`);
  }
  assertNoUnsafeAuditMaterial(event, context);
}

export function createLiveGoNoGoAuditTrailFinalGate({ auditEvent } = {}) {
  const auditEventStatus = throwsContractError(() =>
    assertLiveGoNoGoAuditEventSafe(auditEvent, "live go/no-go final audit event")
  )
    ? "missing"
    : "created";
  const gate = {
    schema: "iris_live_go_no_go_audit_trail_final_gate_v1",
    audit_event_status: auditEventStatus,
    go: auditEventStatus === "created",
    blocker_label:
      auditEventStatus === "created" ? "none" : "safe_audit_event_required",
  };
  assertLiveGoNoGoAuditTrailFinalGateSafe(gate);
  return gate;
}

export function assertLiveGoNoGoAuditTrailFinalGateSafe(
  gate,
  context = "live go/no-go audit trail final gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_GO_NO_GO_AUDIT_TRAIL_FINAL_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_go_no_go_audit_trail_final_gate_v1" ||
    !["created", "missing"].includes(gate.audit_event_status) ||
    typeof gate.go !== "boolean" ||
    !["safe_audit_event_required", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const created = gate.audit_event_status === "created";
  if (
    gate.go !== created ||
    gate.blocker_label !== (created ? "none" : "safe_audit_event_required")
  ) {
    throw new ContractError(`${context}: audit trail final gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveGoNoGoBlockerReasonAllowlist({
  reasons = [],
} = {}) {
  const reasonLabels = [
    ...new Set(
      (Array.isArray(reasons) ? reasons : [])
        .map((reason) => safeGoNoGoBlockerReasonLabel(reason))
        .filter((reason) => reason !== "none")
    ),
  ].sort();
  const summary = {
    schema: "iris_live_go_no_go_blocker_reason_allowlist_v1",
    reason_count: reasonLabels.length,
    reason_labels: reasonLabels,
  };
  assertLiveGoNoGoBlockerReasonAllowlistSafe(summary);
  return summary;
}

export function assertLiveGoNoGoBlockerReasonAllowlistSafe(
  summary,
  context = "live go/no-go blocker reason allowlist"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !LIVE_GO_NO_GO_BLOCKER_REASON_ALLOWLIST_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe summary field`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_live_go_no_go_blocker_reason_allowlist_v1" ||
    !Number.isInteger(summary.reason_count) ||
    summary.reason_count < 0 ||
    !Array.isArray(summary.reason_labels) ||
    summary.reason_count !== summary.reason_labels.length
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  for (const label of summary.reason_labels) {
    if (
      !LIVE_GO_NO_GO_BLOCKER_REASON_LABELS.has(label) ||
      label === "none"
    ) {
      throw new ContractError(`${context}: invalid reason label`);
    }
  }
  assertNoUnsafeAuditMaterial(summary, context);
}

export function createLiveGoNoGoPublicSafeExport({
  go = false,
  blockerLabels = [],
  componentLabels = [],
} = {}) {
  const safeBlockers = [
    ...new Set(
      (Array.isArray(blockerLabels) ? blockerLabels : [])
        .map((label) => safeGoNoGoBlockerReasonLabel(label))
        .filter((label) => label !== "none")
    ),
  ];
  const safeComponents = [
    ...new Set(
      (Array.isArray(componentLabels) ? componentLabels : [])
        .map((label) => safeLabel(label))
        .filter((label) => label !== "unknown")
    ),
  ].sort();
  const blocked = safeBlockers.length > 0 || go !== true;
  const safeExport = {
    schema: "iris_live_go_no_go_public_safe_export_v1",
    go: !blocked,
    status: blocked ? "no_go" : "go",
    blocker_count: safeBlockers.length,
    component_labels: safeComponents,
  };
  assertLiveGoNoGoPublicSafeExportSafe(safeExport);
  return safeExport;
}

export function assertLiveGoNoGoPublicSafeExportSafe(
  safeExport,
  context = "live go/no-go public safe export"
) {
  if (!safeExport || typeof safeExport !== "object" || Array.isArray(safeExport)) {
    throw new ContractError(`${context}: export required`);
  }
  for (const field of Object.keys(safeExport)) {
    if (
      !LIVE_GO_NO_GO_PUBLIC_SAFE_EXPORT_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe export field`, {
        field,
      });
    }
  }
  if (
    safeExport.schema !== "iris_live_go_no_go_public_safe_export_v1" ||
    typeof safeExport.go !== "boolean" ||
    !["go", "no_go"].includes(safeExport.status) ||
    !Number.isInteger(safeExport.blocker_count) ||
    safeExport.blocker_count < 0 ||
    !Array.isArray(safeExport.component_labels)
  ) {
    throw new ContractError(`${context}: invalid export`);
  }
  for (const label of safeExport.component_labels) {
    if (!SAFE_LABEL_PATTERN.test(label)) {
      throw new ContractError(`${context}: invalid component label`);
    }
  }
  if (
    safeExport.go !== (safeExport.status === "go") ||
    (safeExport.go && safeExport.blocker_count !== 0) ||
    (!safeExport.go && safeExport.status !== "no_go")
  ) {
    throw new ContractError(`${context}: export mismatch`);
  }
  assertNoUnsafeAuditMaterial(safeExport, context);
}

export function createLiveGoNoGoOwnerViewRoleGate({
  viewerRole = "ordinary",
  ownerOnlyDetails = [],
} = {}) {
  const role = viewerRole === "owner" ? "owner" : "ordinary";
  const detailVisible = role === "owner";
  const safeDetails = (Array.isArray(ownerOnlyDetails) ? ownerOnlyDetails : [])
    .map((detail) => safeLabel(detail))
    .filter((detail) => detail !== "unknown");
  const gate = {
    schema: "iris_live_go_no_go_owner_view_role_gate_v1",
    viewer_role: role,
    detail_visible: detailVisible,
    owner_only_detail_count: safeDetails.length,
    safe_detail_labels: detailVisible ? safeDetails : [],
    ordinary_view_redacted: !detailVisible,
  };
  assertLiveGoNoGoOwnerViewRoleGateSafe(gate);
  return gate;
}

export function assertLiveGoNoGoOwnerViewRoleGateSafe(
  gate,
  context = "live go/no-go owner view role gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_GO_NO_GO_OWNER_VIEW_ROLE_GATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_go_no_go_owner_view_role_gate_v1" ||
    !["owner", "ordinary"].includes(gate.viewer_role) ||
    typeof gate.detail_visible !== "boolean" ||
    !Number.isInteger(gate.owner_only_detail_count) ||
    gate.owner_only_detail_count < 0 ||
    !Array.isArray(gate.safe_detail_labels) ||
    typeof gate.ordinary_view_redacted !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  for (const label of gate.safe_detail_labels) {
    if (!SAFE_LABEL_PATTERN.test(label)) {
      throw new ContractError(`${context}: invalid detail label`);
    }
  }
  const ownerView = gate.viewer_role === "owner";
  if (
    gate.detail_visible !== ownerView ||
    gate.ordinary_view_redacted !== !ownerView ||
    (!ownerView && gate.safe_detail_labels.length !== 0) ||
    (ownerView && gate.safe_detail_labels.length > gate.owner_only_detail_count)
  ) {
    throw new ContractError(`${context}: role gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveGoNoGoFixturePack({ nowMs = 100_000 } = {}) {
  const evidence = createRealEvidenceIntake({
    component: "bridge_worker",
    status: "ready",
    evidenceTimestampMs: nowMs - 1_000,
    sourceType: "real_probe",
    collector: "local_probe",
    statusHash: "abcdef0123456789",
    auditReference: "audit_entry_001",
  });
  const ownerApproval = createOwnerLiveConfirmation({
    scope: "go_no_go",
    component: "go_no_go",
    confirmedByRole: "owner",
    confirmedAt: nowMs - 1_000,
    status: "confirmed",
    expiry: nowMs + 60_000,
    auditReference: "audit_entry_001",
  });
  const bundle = createLiveHandoffEvidenceBundle({
    realEvidence: [evidence],
    ownerConfirmation: ownerApproval,
    auditReference: "audit_entry_001",
  });
  const allReady =
    createLiveGoNoGoEvidenceEvaluator({ bundle }).go &&
    createLiveGoNoGoOwnerFinalApprovalGate({ ownerApproval }).go &&
    createLiveGoNoGoEmergencyFinalGate({
      emergencyStopEvidence: createFreshEvidenceEnvelope({
        component: "emergency_stop",
        status: "ready",
        evidenceTimestampMs: nowMs,
        evidenceSource: "real_probe",
        freshness: "fresh",
        nowMs,
      }),
    }).go &&
    createLiveGoNoGoAuditTrailFinalGate({
      auditEvent: createLiveGoNoGoAuditEvent({
        actorRole: "owner",
        safeTarget: "go_no_go",
        decisionStatus: "go",
        auditTimestampMs: nowMs,
      }),
    }).go;
  const ownerMissing = createLiveGoNoGoOwnerFinalApprovalGate({
    ownerApproval: createOwnerLiveConfirmation({
      scope: "go_no_go",
      component: "go_no_go",
      confirmedByRole: "owner",
      status: "pending",
      auditReference: "audit_entry_001",
    }),
  });
  const emergencyStale = createLiveGoNoGoEmergencyFinalGate({
    emergencyStopEvidence: createFreshEvidenceEnvelope({
      component: "emergency_stop",
      status: "attention",
      evidenceTimestampMs: nowMs - 60_000,
      evidenceSource: "real_probe",
      freshness: "stale",
      nowMs,
    }),
  });
  const auditMissing = createLiveGoNoGoAuditTrailFinalGate({ auditEvent: null });
  const criticalBlocker = createLiveGoNoGoCriticalBlockerGate({
    components: ["bridge_worker", "tts_engine"],
    criticalBlockers: ["emergency_stop_missing"],
  });
  const degradedOnly = createLiveGoNoGoDegradedModeGate({
    go: false,
    degradedComponents: ["obs_pickup"],
  });
  const leakRejected = throwsContractError(() =>
    assertLiveGoNoGoPublicSafeExportSafe({
      schema: "iris_live_go_no_go_public_safe_export_v1",
      go: false,
      status: "no_go",
      blocker_count: 1,
      component_labels: ["bridge_worker"],
      raw_payload: "secret",
    })
  );
  const pack = {
    schema: "iris_live_go_no_go_fixture_pack_v1",
    pack_status:
      allReady &&
      ownerMissing.go === false &&
      emergencyStale.go === false &&
      auditMissing.go === false &&
      criticalBlocker.go === false &&
      degradedOnly.go === false &&
      degradedOnly.degraded_mode_available === true &&
      leakRejected
        ? "pass"
        : "fail",
    fixture_count: 7,
    all_ready_fixture: createLiveHandoffFixtureResult(
      "all_ready",
      allReady ? "go" : "no_go"
    ),
    owner_missing_fixture: createLiveHandoffFixtureResult(
      "owner_missing",
      ownerMissing.blocker_label
    ),
    emergency_stale_fixture: createLiveHandoffFixtureResult(
      "emergency_stale",
      emergencyStale.blocker_label
    ),
    audit_missing_fixture: createLiveHandoffFixtureResult(
      "audit_missing",
      auditMissing.blocker_label
    ),
    critical_blocker_fixture: createLiveHandoffFixtureResult(
      "critical_blocker",
      criticalBlocker.blocker_label
    ),
    degraded_only_fixture: createLiveHandoffFixtureResult(
      "degraded_only",
      degradedOnly.blocker_label
    ),
    leak_reject_fixture: createLiveHandoffFixtureResult(
      "leak_reject",
      leakRejected ? "rejected" : "accepted"
    ),
  };
  assertLiveGoNoGoFixturePackSafe(pack);
  return pack;
}

export function assertLiveGoNoGoFixturePackSafe(
  pack,
  context = "live go/no-go fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  for (const field of Object.keys(pack)) {
    if (
      !LIVE_GO_NO_GO_FIXTURE_PACK_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe pack field`, {
        field,
      });
    }
  }
  if (
    pack.schema !== "iris_live_go_no_go_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 7
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  for (const field of [
    "all_ready_fixture",
    "owner_missing_fixture",
    "emergency_stale_fixture",
    "audit_missing_fixture",
    "critical_blocker_fixture",
    "degraded_only_fixture",
    "leak_reject_fixture",
  ]) {
    assertLiveHandoffFixtureResultSafe(pack[field], context);
  }
  const expected = {
    all_ready_fixture: ["all_ready", "go"],
    owner_missing_fixture: ["owner_missing", "owner_final_approval_required"],
    emergency_stale_fixture: ["emergency_stale", "emergency_stop_final_required"],
    audit_missing_fixture: ["audit_missing", "safe_audit_event_required"],
    critical_blocker_fixture: ["critical_blocker", "critical_blocker_present"],
    degraded_only_fixture: ["degraded_only", "degraded_mode_not_go"],
    leak_reject_fixture: ["leak_reject", "rejected"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
  assertNoUnsafeAuditMaterial(pack, context);
}

export function createLiveEvidenceCollectorManifest({
  collectors = LIVE_EVIDENCE_COLLECTOR_COMPONENTS,
} = {}) {
  const items = (Array.isArray(collectors) ? collectors : []).map((collector) => {
    const [component, collectorName, expectedSource, freshnessThresholdMs, required] =
      Array.isArray(collector)
        ? collector
        : [
            collector?.component,
            collector?.collector_name,
            collector?.expected_source,
            collector?.freshness_threshold_ms,
            collector?.required,
          ];
    return {
      schema: "iris_live_evidence_collector_manifest_item_v1",
      component: safeLabel(component),
      collector_name: safeLabel(collectorName),
      expected_source: safeCollectorExpectedSource(expectedSource),
      freshness_threshold_ms: normalizePositiveInteger(freshnessThresholdMs, 30_000),
      required: required !== false,
    };
  });
  const manifest = {
    schema: "iris_live_evidence_collector_manifest_v1",
    component_count: items.length,
    collectors: items,
  };
  assertLiveEvidenceCollectorManifestSafe(manifest);
  return manifest;
}

export function assertLiveEvidenceCollectorManifestSafe(
  manifest,
  context = "live evidence collector manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest required`);
  }
  for (const field of Object.keys(manifest)) {
    if (
      !LIVE_EVIDENCE_COLLECTOR_MANIFEST_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe manifest field`, {
        field,
      });
    }
  }
  if (
    manifest.schema !== "iris_live_evidence_collector_manifest_v1" ||
    !Number.isInteger(manifest.component_count) ||
    manifest.component_count < 0 ||
    !Array.isArray(manifest.collectors) ||
    manifest.component_count !== manifest.collectors.length
  ) {
    throw new ContractError(`${context}: invalid manifest`);
  }
  for (const collector of manifest.collectors) {
    assertLiveEvidenceCollectorManifestItemSafe(collector, context);
  }
  assertNoUnsafeAuditMaterial(manifest, context);
}

function assertLiveEvidenceCollectorManifestItemSafe(
  item,
  context = "live evidence collector manifest item"
) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: collector item required`);
  }
  for (const field of Object.keys(item)) {
    if (
      !LIVE_EVIDENCE_COLLECTOR_MANIFEST_ITEM_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe collector field`, {
        field,
      });
    }
  }
  if (
    item.schema !== "iris_live_evidence_collector_manifest_item_v1" ||
    !SAFE_LABEL_PATTERN.test(item.component) ||
    !SAFE_LABEL_PATTERN.test(item.collector_name) ||
    !["real_probe", "operator_confirmed", "manual_upload", "audit_link"].includes(
      item.expected_source
    ) ||
    !Number.isInteger(item.freshness_threshold_ms) ||
    item.freshness_threshold_ms <= 0 ||
    typeof item.required !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid collector item`);
  }
  assertNoUnsafeAuditMaterial(item, context);
}

export function createBridgeEvidenceCollectorContract({
  workerHeartbeat = "fresh",
  workerStatus = "runtime_waiting",
  evidenceTimestampMs = 0,
} = {}) {
  const contract = {
    schema: "iris_bridge_evidence_collector_contract_v1",
    worker_heartbeat: safeCollectorStatus(workerHeartbeat),
    worker_status: safeCollectorStatus(workerStatus),
    evidence_timestamp_ms: normalizeTimestampMs(evidenceTimestampMs),
  };
  assertBridgeEvidenceCollectorContractSafe(contract);
  return contract;
}

export function assertBridgeEvidenceCollectorContractSafe(
  contract,
  context = "bridge evidence collector contract"
) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: contract required`);
  }
  for (const field of Object.keys(contract)) {
    if (!BRIDGE_EVIDENCE_COLLECTOR_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe contract field`, {
        field,
      });
    }
  }
  if (
    contract.schema !== "iris_bridge_evidence_collector_contract_v1" ||
    !isSafeCollectorStatus(contract.worker_heartbeat) ||
    !isSafeCollectorStatus(contract.worker_status) ||
    !Number.isInteger(contract.evidence_timestamp_ms) ||
    contract.evidence_timestamp_ms < 0
  ) {
    throw new ContractError(`${context}: invalid contract`);
  }
  assertNoUnsafeAuditMaterial(contract, context);
}

function safeBridgeCollectorStatusHash(value) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-f0-9]/gu, "")
    .slice(0, 128);
  return /^[a-f0-9]{16,128}$/u.test(normalized) ? normalized : "0".repeat(16);
}

function bridgeSafeCollectorInputValue(source, ...keys) {
  for (const key of keys) {
    if (source && Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }
  return undefined;
}

export function createBridgeSafeCollectorHelper({
  safeBridgeStatus = {},
  workerHeartbeat,
  workerStatus,
  evidenceTimestampMs,
  sourceType,
  statusHash,
  auditReference,
  nowMs = Date.now(),
  freshnessThresholdMs = 10_000,
  nodeReplOnly = false,
  fixturePass = false,
  dryRunOnly = false,
  safeNextActionLabel = "collect_bridge_worker_evidence",
} = {}) {
  if (!safeBridgeStatus || typeof safeBridgeStatus !== "object" || Array.isArray(safeBridgeStatus)) {
    throw new ContractError("bridge safe collector helper: safe status object required");
  }
  assertNoUnsafeAuditMaterial(safeBridgeStatus, "bridge safe collector input");

  const sourceClassification = classifyRealEvidenceSourceType(
    sourceType ?? bridgeSafeCollectorInputValue(safeBridgeStatus, "source_type") ?? "real_probe"
  );
  const source_type = safePacketLabel(sourceClassification.source_type);
  const contract = createBridgeEvidenceCollectorContract({
    workerHeartbeat:
      workerHeartbeat ??
      bridgeSafeCollectorInputValue(
        safeBridgeStatus,
        "worker_heartbeat",
        "workerHeartbeat",
        "heartbeat_status"
      ) ??
      "runtime_waiting",
    workerStatus:
      workerStatus ??
      bridgeSafeCollectorInputValue(
        safeBridgeStatus,
        "worker_status",
        "workerStatus",
        "bridge_status",
        "status"
      ) ??
      "runtime_waiting",
    evidenceTimestampMs:
      evidenceTimestampMs ??
      bridgeSafeCollectorInputValue(
        safeBridgeStatus,
        "evidence_timestamp_ms",
        "evidenceTimestampMs",
        "lastSeenMs",
        "last_seen_ms"
      ) ??
      0,
  });
  const hash = safeBridgeCollectorStatusHash(
    statusHash ?? bridgeSafeCollectorInputValue(safeBridgeStatus, "status_hash")
  );
  const audit_reference = safePacketLabel(
    auditReference ??
      bridgeSafeCollectorInputValue(safeBridgeStatus, "audit_reference") ??
      "bridge_audit_pending"
  );
  const sourceAllowed =
    sourceClassification.allowed && source_type === sourceClassification.source_type;
  const nonRealSource =
    nodeReplOnly ||
    fixturePass ||
    dryRunOnly ||
    ["node_repl_only", "fixture", "fixture_pass", "dry_run", "dry_run_only"].includes(
      source_type
    );
  const evidence =
    sourceAllowed && !nonRealSource && contract.evidence_timestamp_ms > 0
      ? createRealEvidenceIntake({
          component: "bridge",
          status: contract.worker_status,
          evidenceTimestampMs: contract.evidence_timestamp_ms,
          sourceType: source_type,
          collector: "bridge_evidence_collector",
          statusHash: hash,
          auditReference: audit_reference,
        })
      : null;
  const freshness = evidence
    ? classifyRealEvidenceFreshness({
        evidence,
        nowMs,
        componentThresholdsMs: { bridge: freshnessThresholdMs },
      })
    : "runtime_waiting";
  const blockers = [];
  if (!sourceAllowed) blockers.push("source_type_blocked");
  if (nodeReplOnly || source_type === "node_repl_only") blockers.push("node_repl_only");
  if (fixturePass || ["fixture", "fixture_pass"].includes(source_type)) {
    blockers.push("fixture_only");
  }
  if (dryRunOnly || ["dry_run", "dry_run_only"].includes(source_type)) {
    blockers.push("dry_run_only");
  }
  if (contract.evidence_timestamp_ms === 0) blockers.push("worker_heartbeat_missing");
  if (freshness !== "fresh") blockers.push("worker_heartbeat_not_fresh");
  if (contract.worker_heartbeat !== "fresh") blockers.push("worker_heartbeat_not_fresh_label");
  if (contract.worker_status !== "ready") blockers.push("worker_status_not_ready");

  const helper = {
    schema: "iris_bridge_safe_collector_helper_v1",
    component_label: "bridge",
    collector_label: "bridge_evidence_collector",
    status: blockers.length === 0 ? "ready" : "blocked",
    freshness,
    source_type,
    worker_heartbeat: contract.worker_heartbeat,
    worker_status: contract.worker_status,
    evidence_timestamp_ms: contract.evidence_timestamp_ms,
    status_hash: hash,
    audit_reference,
    blocker_count: blockers.length,
    safe_next_action_label: safePacketLabel(safeNextActionLabel),
    redaction_status: "redacted",
    production_go_allowed: false,
    priority1_status: "BLOCKED",
  };
  assertBridgeSafeCollectorHelperSafe(helper);
  return helper;
}

export function assertBridgeSafeCollectorHelperSafe(
  helper,
  context = "bridge safe collector helper"
) {
  if (!helper || typeof helper !== "object" || Array.isArray(helper)) {
    throw new ContractError(`${context}: helper required`);
  }
  for (const field of Object.keys(helper)) {
    if (
      !BRIDGE_SAFE_COLLECTOR_HELPER_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe helper field`, {
        field,
      });
    }
  }
  if (
    ![
      "iris_bridge_safe_collector_helper_v1",
      "iris_bridge_safe_collector_summary_v1",
    ].includes(helper.schema) ||
    helper.component_label !== "bridge" ||
    helper.collector_label !== "bridge_evidence_collector" ||
    !["ready", "blocked"].includes(helper.status) ||
    !["fresh", "stale", "attention", "runtime_waiting"].includes(helper.freshness) ||
    !SAFE_LABEL_PATTERN.test(helper.source_type) ||
    !isSafeCollectorStatus(helper.worker_heartbeat) ||
    !isSafeCollectorStatus(helper.worker_status) ||
    !Number.isInteger(helper.evidence_timestamp_ms) ||
    helper.evidence_timestamp_ms < 0 ||
    !/^[a-f0-9]{16,128}$/u.test(helper.status_hash) ||
    !SAFE_LABEL_PATTERN.test(helper.audit_reference) ||
    !Number.isInteger(helper.blocker_count) ||
    helper.blocker_count < 0 ||
    !SAFE_LABEL_PATTERN.test(helper.safe_next_action_label) ||
    helper.redaction_status !== "redacted" ||
    helper.production_go_allowed !== false ||
    helper.priority1_status !== "BLOCKED"
  ) {
    throw new ContractError(`${context}: invalid helper`);
  }
  assertNoUnsafeAuditMaterial(helper, context);
}

export function createBridgeSafeCollectorSummary({ helper } = {}) {
  assertBridgeSafeCollectorHelperSafe(helper, "bridge safe collector summary input");
  const summary = {
    ...helper,
    schema: "iris_bridge_safe_collector_summary_v1",
  };
  assertBridgeSafeCollectorSummarySafe(summary);
  return summary;
}

export function assertBridgeSafeCollectorSummarySafe(
  summary,
  context = "bridge safe collector summary"
) {
  assertBridgeSafeCollectorHelperSafe(summary, context);
}

export function createBridgeSafeCollectorEvidenceIntake({ helper } = {}) {
  assertBridgeSafeCollectorHelperSafe(helper, "bridge safe collector evidence intake input");
  if (helper.blocker_count > 0 || helper.evidence_timestamp_ms === 0) {
    return null;
  }
  const evidence = createRealEvidenceIntake({
    component: helper.component_label,
    status: helper.worker_status,
    evidenceTimestampMs: helper.evidence_timestamp_ms,
    sourceType: helper.source_type,
    collector: helper.collector_label,
    statusHash: helper.status_hash,
    auditReference: helper.audit_reference,
  });
  assertRealEvidenceIntakeSafe(evidence, "bridge safe collector evidence intake");
  return evidence;
}

export function createTtsEvidenceCollectorContract({
  engineHealth = "runtime_waiting",
  voiceStatus = "runtime_waiting",
  licenseStatus = "runtime_waiting",
} = {}) {
  const contract = {
    schema: "iris_tts_evidence_collector_contract_v1",
    engine_health: safeCollectorStatus(engineHealth),
    voice_status: safeCollectorStatus(voiceStatus),
    license_status: safeCollectorStatus(licenseStatus),
  };
  assertTtsEvidenceCollectorContractSafe(contract);
  return contract;
}

export function assertTtsEvidenceCollectorContractSafe(
  contract,
  context = "TTS evidence collector contract"
) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: contract required`);
  }
  for (const field of Object.keys(contract)) {
    if (!TTS_EVIDENCE_COLLECTOR_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe contract field`, {
        field,
      });
    }
  }
  if (
    contract.schema !== "iris_tts_evidence_collector_contract_v1" ||
    !isSafeCollectorStatus(contract.engine_health) ||
    !isSafeCollectorStatus(contract.voice_status) ||
    !isSafeCollectorStatus(contract.license_status)
  ) {
    throw new ContractError(`${context}: invalid contract`);
  }
  assertNoUnsafeAuditMaterial(contract, context);
}

export function createLive2dEvidenceCollectorContract({
  rendererHeartbeat = "runtime_waiting",
  modelConfigured = "runtime_waiting",
  cueCapability = "runtime_waiting",
} = {}) {
  const contract = {
    schema: "iris_live2d_evidence_collector_contract_v1",
    renderer_heartbeat: safeCollectorStatus(rendererHeartbeat),
    model_configured: safeCollectorStatus(modelConfigured),
    cue_capability: safeCollectorStatus(cueCapability),
  };
  assertLive2dEvidenceCollectorContractSafe(contract);
  return contract;
}

export function assertLive2dEvidenceCollectorContractSafe(
  contract,
  context = "Live2D evidence collector contract"
) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: contract required`);
  }
  for (const field of Object.keys(contract)) {
    if (!LIVE2D_EVIDENCE_COLLECTOR_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe contract field`, {
        field,
      });
    }
  }
  if (
    contract.schema !== "iris_live2d_evidence_collector_contract_v1" ||
    !isSafeCollectorStatus(contract.renderer_heartbeat) ||
    !isSafeCollectorStatus(contract.model_configured) ||
    !isSafeCollectorStatus(contract.cue_capability)
  ) {
    throw new ContractError(`${context}: invalid contract`);
  }
  assertNoUnsafeAuditMaterial(contract, context);
}

export function createSubtitleEvidenceCollectorContract({
  engineStatus = "runtime_waiting",
  syncStatus = "runtime_waiting",
  safeAreaStatus = "runtime_waiting",
  lineBreakStatus = "runtime_waiting",
  rtlStatus = "runtime_waiting",
} = {}) {
  const contract = {
    schema: "iris_subtitle_evidence_collector_contract_v1",
    engine_status: safeCollectorStatus(engineStatus),
    sync_status: safeCollectorStatus(syncStatus),
    safe_area_status: safeCollectorStatus(safeAreaStatus),
    line_break_status: safeCollectorStatus(lineBreakStatus),
    rtl_status: safeCollectorStatus(rtlStatus),
  };
  assertSubtitleEvidenceCollectorContractSafe(contract);
  return contract;
}

export function assertSubtitleEvidenceCollectorContractSafe(
  contract,
  context = "subtitle evidence collector contract"
) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: contract required`);
  }
  for (const field of Object.keys(contract)) {
    if (!SUBTITLE_EVIDENCE_COLLECTOR_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe contract field`, {
        field,
      });
    }
  }
  if (
    contract.schema !== "iris_subtitle_evidence_collector_contract_v1" ||
    !isSafeCollectorStatus(contract.engine_status) ||
    !isSafeCollectorStatus(contract.sync_status) ||
    !isSafeCollectorStatus(contract.safe_area_status) ||
    !isSafeCollectorStatus(contract.line_break_status) ||
    !isSafeCollectorStatus(contract.rtl_status)
  ) {
    throw new ContractError(`${context}: invalid contract`);
  }
  assertNoUnsafeAuditMaterial(contract, context);
}

function safeSubtitleCollectorStatusHash(value) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-f0-9]/gu, "")
    .slice(0, 128);
  return /^[a-f0-9]{16,128}$/u.test(normalized) ? normalized : "0".repeat(16);
}

function subtitleSafeCollectorInputValue(source, ...keys) {
  for (const key of keys) {
    if (source && Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }
  return undefined;
}

function assertSubtitleSafeCollectorInputSafe(
  safeSubtitleStatus,
  context = "subtitle safe collector input"
) {
  if (
    !safeSubtitleStatus ||
    typeof safeSubtitleStatus !== "object" ||
    Array.isArray(safeSubtitleStatus)
  ) {
    throw new ContractError(`${context}: safe status object required`);
  }
  for (const field of Object.keys(safeSubtitleStatus)) {
    if (
      !SUBTITLE_SAFE_COLLECTOR_INPUT_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe input field`, {
        field,
      });
    }
  }
  assertNoUnsafeAuditMaterial(safeSubtitleStatus, context);
}

export function createSubtitleSafeCollectorHelper({
  safeSubtitleStatus = {},
  engineStatus,
  syncStatus,
  safeAreaStatus,
  lineBreakStatus,
  rtlStatus,
  evidenceTimestampMs,
  sourceType,
  statusHash,
  auditReference,
  nowMs = Date.now(),
  freshnessThresholdMs = 20_000,
  fixturePass = false,
  dryRunOnly = false,
  safeNextActionLabel = "collect_subtitle_engine_evidence",
} = {}) {
  assertSubtitleSafeCollectorInputSafe(safeSubtitleStatus);

  const sourceClassification = classifyRealEvidenceSourceType(
    sourceType ??
      subtitleSafeCollectorInputValue(
        safeSubtitleStatus,
        "source_type",
        "sourceType"
      ) ??
      "real_probe"
  );
  const source_type = safePacketLabel(sourceClassification.source_type);
  const contract = createSubtitleEvidenceCollectorContract({
    engineStatus:
      engineStatus ??
      subtitleSafeCollectorInputValue(
        safeSubtitleStatus,
        "engine_status",
        "engineStatus"
      ) ??
      "runtime_waiting",
    syncStatus:
      syncStatus ??
      subtitleSafeCollectorInputValue(safeSubtitleStatus, "sync_status", "syncStatus") ??
      "runtime_waiting",
    safeAreaStatus:
      safeAreaStatus ??
      subtitleSafeCollectorInputValue(
        safeSubtitleStatus,
        "safe_area_status",
        "safeAreaStatus"
      ) ??
      "runtime_waiting",
    lineBreakStatus:
      lineBreakStatus ??
      subtitleSafeCollectorInputValue(
        safeSubtitleStatus,
        "line_break_status",
        "lineBreakStatus"
      ) ??
      "runtime_waiting",
    rtlStatus:
      rtlStatus ??
      subtitleSafeCollectorInputValue(safeSubtitleStatus, "rtl_status", "rtlStatus") ??
      "runtime_waiting",
  });
  const evidence_timestamp_ms = normalizeTimestampMs(
    evidenceTimestampMs ??
      subtitleSafeCollectorInputValue(
        safeSubtitleStatus,
        "evidence_timestamp_ms",
        "evidenceTimestampMs"
      ) ??
      0
  );
  const hash = safeSubtitleCollectorStatusHash(
    statusHash ??
      subtitleSafeCollectorInputValue(safeSubtitleStatus, "status_hash", "statusHash")
  );
  const audit_reference = safePacketLabel(
    auditReference ??
      subtitleSafeCollectorInputValue(
        safeSubtitleStatus,
        "audit_reference",
        "auditReference"
      ) ??
      "subtitle_audit_pending"
  );
  const sourceAllowed =
    sourceClassification.allowed && source_type === sourceClassification.source_type;
  const nonRealSource =
    fixturePass ||
    dryRunOnly ||
    ["fixture", "fixture_pass", "dry_run", "dry_run_only"].includes(source_type);
  const statusReady =
    contract.engine_status === "ready" &&
    contract.sync_status === "fresh" &&
    contract.safe_area_status === "ready" &&
    contract.line_break_status === "ready" &&
    contract.rtl_status === "ready";
  const evidence =
    sourceAllowed && !nonRealSource && evidence_timestamp_ms > 0 && statusReady
      ? createRealEvidenceIntake({
          component: "subtitle",
          status: contract.engine_status,
          evidenceTimestampMs: evidence_timestamp_ms,
          sourceType: source_type,
          collector: "subtitle_evidence_collector",
          statusHash: hash,
          auditReference: audit_reference,
        })
      : null;
  const freshness = evidence
    ? classifyRealEvidenceFreshness({
        evidence,
        nowMs,
        componentThresholdsMs: { subtitle: freshnessThresholdMs },
      })
    : contract.sync_status === "stale"
      ? "stale"
      : "runtime_waiting";
  const blockers = [];
  if (!sourceAllowed) blockers.push("source_type_blocked");
  if (fixturePass || ["fixture", "fixture_pass"].includes(source_type)) {
    blockers.push("fixture_only");
  }
  if (dryRunOnly || ["dry_run", "dry_run_only"].includes(source_type)) {
    blockers.push("dry_run_only");
  }
  if (evidence_timestamp_ms === 0) blockers.push("subtitle_sync_missing");
  if (freshness !== "fresh") blockers.push("subtitle_sync_not_fresh");
  if (contract.engine_status !== "ready") blockers.push("subtitle_engine_not_ready");
  if (contract.sync_status !== "fresh") blockers.push("subtitle_sync_not_fresh_label");
  if (contract.safe_area_status !== "ready") blockers.push("subtitle_safe_area_not_ready");
  if (contract.line_break_status !== "ready") {
    blockers.push("subtitle_line_break_not_ready");
  }
  if (contract.rtl_status !== "ready") blockers.push("subtitle_rtl_not_ready");

  const helper = {
    schema: "iris_subtitle_safe_collector_helper_v1",
    component_label: "subtitle",
    collector_label: "subtitle_evidence_collector",
    status: blockers.length === 0 ? "ready" : "blocked",
    freshness,
    source_type,
    engine_status: contract.engine_status,
    sync_status: contract.sync_status,
    safe_area_status: contract.safe_area_status,
    line_break_status: contract.line_break_status,
    rtl_status: contract.rtl_status,
    evidence_timestamp_ms,
    status_hash: hash,
    audit_reference,
    blocker_count: blockers.length,
    safe_next_action_label: safePacketLabel(safeNextActionLabel),
    redaction_status: "redacted",
    production_go_allowed: false,
    priority1_status: "BLOCKED",
  };
  assertSubtitleSafeCollectorHelperSafe(helper);
  return helper;
}

export function assertSubtitleSafeCollectorHelperSafe(
  helper,
  context = "subtitle safe collector helper"
) {
  if (!helper || typeof helper !== "object" || Array.isArray(helper)) {
    throw new ContractError(`${context}: helper required`);
  }
  for (const field of Object.keys(helper)) {
    if (
      !SUBTITLE_SAFE_COLLECTOR_HELPER_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe helper field`, {
        field,
      });
    }
  }
  if (
    ![
      "iris_subtitle_safe_collector_helper_v1",
      "iris_subtitle_safe_collector_summary_v1",
    ].includes(helper.schema) ||
    helper.component_label !== "subtitle" ||
    helper.collector_label !== "subtitle_evidence_collector" ||
    !["ready", "blocked"].includes(helper.status) ||
    !["fresh", "stale", "attention", "runtime_waiting"].includes(helper.freshness) ||
    !SAFE_LABEL_PATTERN.test(helper.source_type) ||
    !isSafeCollectorStatus(helper.engine_status) ||
    !isSafeCollectorStatus(helper.sync_status) ||
    !isSafeCollectorStatus(helper.safe_area_status) ||
    !isSafeCollectorStatus(helper.line_break_status) ||
    !isSafeCollectorStatus(helper.rtl_status) ||
    !Number.isInteger(helper.evidence_timestamp_ms) ||
    helper.evidence_timestamp_ms < 0 ||
    !/^[a-f0-9]{16,128}$/u.test(helper.status_hash) ||
    !SAFE_LABEL_PATTERN.test(helper.audit_reference) ||
    !Number.isInteger(helper.blocker_count) ||
    helper.blocker_count < 0 ||
    !SAFE_LABEL_PATTERN.test(helper.safe_next_action_label) ||
    helper.redaction_status !== "redacted" ||
    helper.production_go_allowed !== false ||
    helper.priority1_status !== "BLOCKED"
  ) {
    throw new ContractError(`${context}: invalid helper`);
  }
  assertNoUnsafeAuditMaterial(helper, context);
}

export function createSubtitleSafeCollectorSummary({ helper } = {}) {
  assertSubtitleSafeCollectorHelperSafe(
    helper,
    "subtitle safe collector summary input"
  );
  const summary = {
    ...helper,
    schema: "iris_subtitle_safe_collector_summary_v1",
  };
  assertSubtitleSafeCollectorSummarySafe(summary);
  return summary;
}

export function assertSubtitleSafeCollectorSummarySafe(
  summary,
  context = "subtitle safe collector summary"
) {
  assertSubtitleSafeCollectorHelperSafe(summary, context);
}

export function createSubtitleSafeCollectorEvidenceIntake({ helper } = {}) {
  assertSubtitleSafeCollectorHelperSafe(
    helper,
    "subtitle safe collector evidence intake input"
  );
  if (helper.blocker_count > 0 || helper.evidence_timestamp_ms === 0) {
    return null;
  }
  const evidence = createRealEvidenceIntake({
    component: helper.component_label,
    status: helper.engine_status,
    evidenceTimestampMs: helper.evidence_timestamp_ms,
    sourceType: helper.source_type,
    collector: helper.collector_label,
    statusHash: helper.status_hash,
    auditReference: helper.audit_reference,
  });
  assertRealEvidenceIntakeSafe(evidence, "subtitle safe collector evidence intake");
  return evidence;
}

export function createObsEvidenceCollectorContract({
  browserSourceStatus = "runtime_waiting",
  pickupStatus = "runtime_waiting",
  heartbeatStatus = "runtime_waiting",
  artifactFreshness = "runtime_waiting",
} = {}) {
  const contract = {
    schema: "iris_obs_evidence_collector_contract_v1",
    browser_source_status: safeCollectorStatus(browserSourceStatus),
    pickup_status: safeCollectorStatus(pickupStatus),
    heartbeat_status: safeCollectorStatus(heartbeatStatus),
    artifact_freshness: safeCollectorStatus(artifactFreshness),
  };
  assertObsEvidenceCollectorContractSafe(contract);
  return contract;
}

export function assertObsEvidenceCollectorContractSafe(
  contract,
  context = "OBS evidence collector contract"
) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: contract required`);
  }
  for (const field of Object.keys(contract)) {
    if (!OBS_EVIDENCE_COLLECTOR_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe contract field`, {
        field,
      });
    }
  }
  if (
    contract.schema !== "iris_obs_evidence_collector_contract_v1" ||
    !isSafeCollectorStatus(contract.browser_source_status) ||
    !isSafeCollectorStatus(contract.pickup_status) ||
    !isSafeCollectorStatus(contract.heartbeat_status) ||
    !isSafeCollectorStatus(contract.artifact_freshness)
  ) {
    throw new ContractError(`${context}: invalid contract`);
  }
  assertNoUnsafeAuditMaterial(contract, context);
}

export function createDbEvidenceCollectorContract({
  connectionStatus = "runtime_waiting",
  schemaStatus = "runtime_waiting",
  indexStatus = "runtime_waiting",
  migrationStatus = "runtime_waiting",
  backupStatus = "runtime_waiting",
} = {}) {
  const contract = {
    schema: "iris_db_evidence_collector_contract_v1",
    connection_status: safeCollectorStatus(connectionStatus),
    schema_status: safeCollectorStatus(schemaStatus),
    index_status: safeCollectorStatus(indexStatus),
    migration_status: safeCollectorStatus(migrationStatus),
    backup_status: safeCollectorStatus(backupStatus),
  };
  assertDbEvidenceCollectorContractSafe(contract);
  return contract;
}

export function assertDbEvidenceCollectorContractSafe(
  contract,
  context = "DB evidence collector contract"
) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: contract required`);
  }
  for (const field of Object.keys(contract)) {
    if (!DB_EVIDENCE_COLLECTOR_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe contract field`, {
        field,
      });
    }
  }
  if (
    contract.schema !== "iris_db_evidence_collector_contract_v1" ||
    !isSafeCollectorStatus(contract.connection_status) ||
    !isSafeCollectorStatus(contract.schema_status) ||
    !isSafeCollectorStatus(contract.index_status) ||
    !isSafeCollectorStatus(contract.migration_status) ||
    !isSafeCollectorStatus(contract.backup_status)
  ) {
    throw new ContractError(`${context}: invalid contract`);
  }
  assertNoUnsafeAuditMaterial(contract, context);
}

export function createYoutubeEvidenceCollectorContract({
  oauthStatus = "runtime_waiting",
  tokenStatus = "runtime_waiting",
  chatStatus = "runtime_waiting",
  pollingStatus = "runtime_waiting",
  moderationStatus = "runtime_waiting",
} = {}) {
  const contract = {
    schema: "iris_youtube_evidence_collector_contract_v1",
    oauth_status: safeCollectorStatus(oauthStatus),
    token_status: safeCollectorStatus(tokenStatus),
    chat_status: safeCollectorStatus(chatStatus),
    polling_status: safeCollectorStatus(pollingStatus),
    moderation_status: safeCollectorStatus(moderationStatus),
  };
  assertYoutubeEvidenceCollectorContractSafe(contract);
  return contract;
}

export function assertYoutubeEvidenceCollectorContractSafe(
  contract,
  context = "YouTube evidence collector contract"
) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: contract required`);
  }
  for (const field of Object.keys(contract)) {
    if (
      !YOUTUBE_EVIDENCE_COLLECTOR_FIELDS.has(field) ||
      (field !== "token_status" && UNSAFE_FIELD_PATTERN.test(field))
    ) {
      throw new ContractError(`${context}: unexpected or unsafe contract field`, {
        field,
      });
    }
  }
  if (
    contract.schema !== "iris_youtube_evidence_collector_contract_v1" ||
    !isSafeCollectorStatus(contract.oauth_status) ||
    !isSafeCollectorStatus(contract.token_status) ||
    !isSafeCollectorStatus(contract.chat_status) ||
    !isSafeCollectorStatus(contract.polling_status) ||
    !isSafeCollectorStatus(contract.moderation_status)
  ) {
    throw new ContractError(`${context}: invalid contract`);
  }
  const auditSafeContract = { ...contract, access_status: contract.token_status };
  delete auditSafeContract.token_status;
  assertNoUnsafeAuditMaterial(auditSafeContract, context);
}

export function createGameEvidenceCollectorContract({
  adapterStatus = "runtime_waiting",
  safeMapStatus = "runtime_waiting",
  manualApprovalStatus = "runtime_waiting",
  emergencyStopStatus = "runtime_waiting",
  auditStatus = "runtime_waiting",
} = {}) {
  const contract = {
    schema: "iris_game_evidence_collector_contract_v1",
    adapter_status: safeCollectorStatus(adapterStatus),
    safe_map_status: safeCollectorStatus(safeMapStatus),
    manual_approval_status: safeCollectorStatus(manualApprovalStatus),
    emergency_stop_status: safeCollectorStatus(emergencyStopStatus),
    audit_status: safeCollectorStatus(auditStatus),
  };
  assertGameEvidenceCollectorContractSafe(contract);
  return contract;
}

export function assertGameEvidenceCollectorContractSafe(
  contract,
  context = "Game evidence collector contract"
) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: contract required`);
  }
  for (const field of Object.keys(contract)) {
    if (!GAME_EVIDENCE_COLLECTOR_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe contract field`, {
        field,
      });
    }
  }
  if (
    contract.schema !== "iris_game_evidence_collector_contract_v1" ||
    !isSafeCollectorStatus(contract.adapter_status) ||
    !isSafeCollectorStatus(contract.safe_map_status) ||
    !isSafeCollectorStatus(contract.manual_approval_status) ||
    !isSafeCollectorStatus(contract.emergency_stop_status) ||
    !isSafeCollectorStatus(contract.audit_status)
  ) {
    throw new ContractError(`${context}: invalid contract`);
  }
  assertNoUnsafeAuditMaterial(contract, context);
}

export function createEvidenceCollectorFixturePack() {
  const bridge = createBridgeEvidenceCollectorContract({
    workerHeartbeat: "fresh",
    workerStatus: "ready",
    evidenceTimestampMs: 1000,
  });
  const tts = createTtsEvidenceCollectorContract({
    engineHealth: "fresh",
    voiceStatus: "ready",
    licenseStatus: "ready",
  });
  const live2d = createLive2dEvidenceCollectorContract({
    rendererHeartbeat: "fresh",
    modelConfigured: "ready",
    cueCapability: "ready",
  });
  const subtitle = createSubtitleEvidenceCollectorContract({
    engineStatus: "fresh",
    syncStatus: "ready",
    safeAreaStatus: "ready",
    lineBreakStatus: "ready",
    rtlStatus: "ready",
  });
  const obs = createObsEvidenceCollectorContract({
    browserSourceStatus: "ready",
    pickupStatus: "ready",
    heartbeatStatus: "fresh",
    artifactFreshness: "fresh",
  });
  const db = createDbEvidenceCollectorContract({
    connectionStatus: "ready",
    schemaStatus: "ready",
    indexStatus: "ready",
    migrationStatus: "ready",
    backupStatus: "fresh",
  });
  const youtube = createYoutubeEvidenceCollectorContract({
    oauthStatus: "ready",
    tokenStatus: "fresh",
    chatStatus: "ready",
    pollingStatus: "ready",
    moderationStatus: "ready",
  });
  const game = createGameEvidenceCollectorContract({
    adapterStatus: "ready",
    safeMapStatus: "ready",
    manualApprovalStatus: "ready",
    emergencyStopStatus: "fresh",
    auditStatus: "ready",
  });
  const pack = {
    schema: "iris_evidence_collector_fixture_pack_v1",
    bridge_safe_output_fixture: createLiveHandoffFixtureResult("bridge_safe_output", "safe_output"),
    bridge_reject_fixture: createLiveHandoffFixtureResult(
      "bridge_reject",
      capturesContractError(() =>
        assertBridgeEvidenceCollectorContractSafe({ ...bridge, raw_payload: "x" })
      )
    ),
    tts_safe_output_fixture: createLiveHandoffFixtureResult("tts_safe_output", "safe_output"),
    tts_reject_fixture: createLiveHandoffFixtureResult(
      "tts_reject",
      capturesContractError(() =>
        assertTtsEvidenceCollectorContractSafe({ ...tts, vendor_diagnostics: "x" })
      )
    ),
    live2d_safe_output_fixture: createLiveHandoffFixtureResult(
      "live2d_safe_output",
      "safe_output"
    ),
    live2d_reject_fixture: createLiveHandoffFixtureResult(
      "live2d_reject",
      capturesContractError(() =>
        assertLive2dEvidenceCollectorContractSafe({ ...live2d, model_path: "x" })
      )
    ),
    subtitle_safe_output_fixture: createLiveHandoffFixtureResult(
      "subtitle_safe_output",
      "safe_output"
    ),
    subtitle_reject_fixture: createLiveHandoffFixtureResult(
      "subtitle_reject",
      capturesContractError(() =>
        assertSubtitleEvidenceCollectorContractSafe({ ...subtitle, raw_subtitle_payload: "x" })
      )
    ),
    obs_safe_output_fixture: createLiveHandoffFixtureResult("obs_safe_output", "safe_output"),
    obs_reject_fixture: createLiveHandoffFixtureResult(
      "obs_reject",
      capturesContractError(() => assertObsEvidenceCollectorContractSafe({ ...obs, url: "x" }))
    ),
    db_safe_output_fixture: createLiveHandoffFixtureResult("db_safe_output", "safe_output"),
    db_reject_fixture: createLiveHandoffFixtureResult(
      "db_reject",
      capturesContractError(() =>
        assertDbEvidenceCollectorContractSafe({ ...db, connection_string: "x" })
      )
    ),
    youtube_safe_output_fixture: createLiveHandoffFixtureResult(
      "youtube_safe_output",
      "safe_output"
    ),
    youtube_reject_fixture: createLiveHandoffFixtureResult(
      "youtube_reject",
      capturesContractError(() =>
        assertYoutubeEvidenceCollectorContractSafe({ ...youtube, raw_api_response: "x" })
      )
    ),
    game_safe_output_fixture: createLiveHandoffFixtureResult("game_safe_output", "safe_output"),
    game_reject_fixture: createLiveHandoffFixtureResult(
      "game_reject",
      capturesContractError(() =>
        assertGameEvidenceCollectorContractSafe({ ...game, raw_input: "x" })
      )
    ),
  };
  assertEvidenceCollectorFixturePackSafe(pack);
  return pack;
}

export function assertEvidenceCollectorFixturePackSafe(
  pack,
  context = "evidence collector fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: fixture pack required`);
  }
  for (const field of Object.keys(pack)) {
    if (
      !EVIDENCE_COLLECTOR_FIXTURE_PACK_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe fixture field`, {
        field,
      });
    }
  }
  if (pack.schema !== "iris_evidence_collector_fixture_pack_v1") {
    throw new ContractError(`${context}: invalid fixture pack`);
  }
  for (const field of EVIDENCE_COLLECTOR_FIXTURE_PACK_FIELDS) {
    if (field === "schema") continue;
    assertLiveHandoffFixtureResultSafe(pack[field], context);
  }
}

export function createLiveHandoffOperatorPacket({
  handoffStatus = "BLOCKED",
  generatedAt = Date.now(),
  expiresAt,
  nowMs = Date.now(),
  checklist = [],
  blockers = [],
  requiredConfirmations = [],
} = {}) {
  const safeGeneratedAt = normalizeTimestampMs(generatedAt);
  const safeExpiresAt = normalizeTimestampMs(
    expiresAt ?? safeGeneratedAt + 15 * 60 * 1000
  );
  const safeNowMs = normalizeTimestampMs(nowMs);
  const packetExpired =
    safeGeneratedAt === 0 ||
    safeExpiresAt === 0 ||
    safeExpiresAt <= safeGeneratedAt ||
    safeExpiresAt <= safeNowMs;
  const safeChecklist = (Array.isArray(checklist) ? checklist : []).map((item) =>
    createLiveHandoffOperatorPacketChecklistItem(item)
  );
  const safeBlockers = (Array.isArray(blockers) ? blockers : []).map((item) =>
    createLiveHandoffOperatorPacketBlocker(item)
  );
  const safeRequiredConfirmations = (
    Array.isArray(requiredConfirmations) ? requiredConfirmations : []
  ).map((item) => createLiveHandoffOperatorPacketConfirmation(item));
  const packet = {
    schema: "iris_live_handoff_operator_packet_v1",
    packet_status: packetExpired ? "expired" : "valid",
    generated_at: safeGeneratedAt,
    expires_at: safeExpiresAt,
    summary: {
      schema: "iris_live_handoff_operator_packet_summary_v1",
      handoff_status: safePacketLabel(handoffStatus),
      checklist_count: safeChecklist.length,
      blocker_count: safeBlockers.length,
      required_confirmation_count: safeRequiredConfirmations.length,
      real_process_started: false,
      obs_changed: false,
      db_connected: false,
      game_input_sent: false,
    },
    checklist: safeChecklist,
    blockers: safeBlockers,
    required_confirmations: safeRequiredConfirmations,
  };
  assertLiveHandoffOperatorPacketSafe(packet);
  return packet;
}

export function assertLiveHandoffOperatorPacketSafe(
  packet,
  context = "live handoff operator packet"
) {
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
    throw new ContractError(`${context}: packet required`);
  }
  for (const field of Object.keys(packet)) {
    if (
      !LIVE_HANDOFF_OPERATOR_PACKET_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe packet field`, {
        field,
      });
    }
  }
  if (
    packet.schema !== "iris_live_handoff_operator_packet_v1" ||
    !["valid", "expired"].includes(packet.packet_status) ||
    !Number.isInteger(packet.generated_at) ||
    packet.generated_at <= 0 ||
    !Number.isInteger(packet.expires_at) ||
    packet.expires_at <= packet.generated_at ||
    !packet.summary ||
    !Array.isArray(packet.checklist) ||
    !Array.isArray(packet.blockers) ||
    !Array.isArray(packet.required_confirmations)
  ) {
    throw new ContractError(`${context}: invalid packet`);
  }
  assertLiveHandoffOperatorPacketSummarySafe(packet.summary, context);
  if (
    packet.summary.checklist_count !== packet.checklist.length ||
    packet.summary.blocker_count !== packet.blockers.length ||
    packet.summary.required_confirmation_count !== packet.required_confirmations.length
  ) {
    throw new ContractError(`${context}: summary count mismatch`);
  }
  packet.checklist.forEach((item) =>
    assertLiveHandoffOperatorPacketChecklistItemSafe(item, context)
  );
  packet.blockers.forEach((item) =>
    assertLiveHandoffOperatorPacketBlockerSafe(item, context)
  );
  packet.required_confirmations.forEach((item) =>
    assertLiveHandoffOperatorPacketConfirmationSafe(item, context)
  );
  assertNoUnsafeAuditMaterial(packet, context);
}

export function isLiveHandoffOperatorPacketUsableForHandoff(
  packet,
  { nowMs = Date.now() } = {}
) {
  assertLiveHandoffOperatorPacketSafe(packet);
  const safeNowMs = normalizeTimestampMs(nowMs);
  return (
    packet.packet_status === "valid" &&
    packet.generated_at > 0 &&
    packet.expires_at > packet.generated_at &&
    packet.expires_at > safeNowMs
  );
}

function createLiveHandoffOperatorPacketChecklistItem({
  component = "unknown",
  status = "BLOCKED",
  requiredEvidence = "fresh_real_evidence",
  ownerActionLabel = "owner_confirm_required",
} = {}) {
  return {
    schema: "iris_live_handoff_operator_packet_checklist_item_v1",
    component: safePacketLabel(component),
    status: safePacketLabel(status),
    required_evidence: safePacketLabel(requiredEvidence),
    owner_action_label: safePacketLabel(ownerActionLabel),
  };
}

function createLiveHandoffOperatorPacketBlocker({
  blockerLabel = "priority1_runtime_waiting",
  operatorActionLabel,
} = {}) {
  const safeBlockerLabel = safePacketLabel(blockerLabel);
  return {
    schema: "iris_live_handoff_operator_packet_blocker_v1",
    blocker_label: safeBlockerLabel,
    operator_action_label: mapLiveHandoffOperatorBlockerAction(
      safeBlockerLabel,
      operatorActionLabel
    ),
  };
}

function createLiveHandoffOperatorPacketConfirmation({
  scope = "live_handoff",
  status = "pending",
  ownerActionLabel = "owner_confirm_required",
} = {}) {
  return {
    schema: "iris_live_handoff_operator_packet_required_confirmation_v1",
    scope: safePacketLabel(scope),
    status: safePacketLabel(status),
    owner_action_label: safePacketLabel(ownerActionLabel),
  };
}

export function mapLiveHandoffOperatorBlockerAction(
  blockerLabel,
  fallbackActionLabel = "review_blocker_with_owner"
) {
  const safeBlockerLabel = safePacketLabel(blockerLabel);
  const mapped = LIVE_HANDOFF_OPERATOR_BLOCKER_ACTION_LABELS.get(safeBlockerLabel);
  if (mapped) return mapped;
  const fallback = safePacketLabel(fallbackActionLabel);
  return fallback === "unknown" ? "review_blocker_with_owner" : fallback;
}

export function createLiveHandoffOperatorPacketOwnerOnlyGate({
  viewerRole = "ordinary",
  ownerOnlySectionLabels = [],
} = {}) {
  const role = viewerRole === "owner" ? "owner" : "ordinary";
  const safeSectionLabels = (Array.isArray(ownerOnlySectionLabels)
    ? ownerOnlySectionLabels
    : []
  )
    .map((label) => safePacketLabel(label))
    .filter((label) => label !== "unknown");
  const visible = role === "owner";
  const gate = {
    schema: "iris_live_handoff_operator_packet_owner_only_gate_v1",
    viewer_role: role,
    owner_only_visible: visible,
    owner_only_section_count: safeSectionLabels.length,
    safe_section_labels: visible ? safeSectionLabels : [],
    ordinary_view_redacted: !visible,
  };
  assertLiveHandoffOperatorPacketOwnerOnlyGateSafe(gate);
  return gate;
}

export function assertLiveHandoffOperatorPacketOwnerOnlyGateSafe(
  gate,
  context = "live handoff operator packet owner-only gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_HANDOFF_OPERATOR_PACKET_OWNER_ONLY_GATE_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_handoff_operator_packet_owner_only_gate_v1" ||
    !["owner", "ordinary"].includes(gate.viewer_role) ||
    typeof gate.owner_only_visible !== "boolean" ||
    !Number.isInteger(gate.owner_only_section_count) ||
    gate.owner_only_section_count < 0 ||
    !Array.isArray(gate.safe_section_labels) ||
    typeof gate.ordinary_view_redacted !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const ownerView = gate.viewer_role === "owner";
  if (
    gate.owner_only_visible !== ownerView ||
    gate.ordinary_view_redacted !== !ownerView ||
    (!ownerView && gate.safe_section_labels.length !== 0) ||
    (ownerView && gate.safe_section_labels.length > gate.owner_only_section_count)
  ) {
    throw new ContractError(`${context}: role gate mismatch`);
  }
  for (const label of gate.safe_section_labels) {
    if (!SAFE_LABEL_PATTERN.test(label)) {
      throw new ContractError(`${context}: invalid section label`);
    }
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveHandoffOperatorPacketAuditEvent({
  actorRole = "operator",
  action = "packet_generated",
  safeTarget = "live_handoff_operator_packet",
  result = "recorded",
  auditTimestampMs = Date.now(),
} = {}) {
  const event = {
    schema: "iris_live_handoff_operator_packet_audit_event_v1",
    actor_role: safeActorRole(actorRole),
    action: safeOperatorPacketAuditAction(action),
    safe_target: safePacketLabel(safeTarget),
    result: safeOperatorPacketAuditResult(result),
    audit_timestamp_ms: normalizeTimestampMs(auditTimestampMs),
  };
  assertLiveHandoffOperatorPacketAuditEventSafe(event);
  return event;
}

export function createLiveHandoffOperatorPacketAuditEvents({
  actorRole = "operator",
  safeTarget = "live_handoff_operator_packet",
  auditTimestampMs = Date.now(),
} = {}) {
  return [
    createLiveHandoffOperatorPacketAuditEvent({
      actorRole,
      action: "packet_generated",
      safeTarget,
      result: "recorded",
      auditTimestampMs,
    }),
    createLiveHandoffOperatorPacketAuditEvent({
      actorRole,
      action: "owner_confirmation_requested",
      safeTarget,
      result: "requested",
      auditTimestampMs,
    }),
  ];
}

export function assertLiveHandoffOperatorPacketAuditEventSafe(
  event,
  context = "live handoff operator packet audit event"
) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new ContractError(`${context}: event required`);
  }
  for (const field of Object.keys(event)) {
    if (
      !LIVE_HANDOFF_OPERATOR_PACKET_AUDIT_EVENT_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe event field`, {
        field,
      });
    }
  }
  if (
    event.schema !== "iris_live_handoff_operator_packet_audit_event_v1" ||
    !["owner", "admin", "operator"].includes(event.actor_role) ||
    !["packet_generated", "owner_confirmation_requested"].includes(event.action) ||
    !SAFE_LABEL_PATTERN.test(event.safe_target) ||
    !["recorded", "requested", "rejected"].includes(event.result) ||
    !Number.isInteger(event.audit_timestamp_ms) ||
    event.audit_timestamp_ms < 0
  ) {
    throw new ContractError(`${context}: invalid event`);
  }
  assertNoUnsafeAuditMaterial(event, context);
}

export function createLiveHandoffOperatorPacketPublicSummary({ packet } = {}) {
  assertLiveHandoffOperatorPacketSafe(
    packet,
    "live handoff operator packet public summary source"
  );
  const summary = {
    schema: "iris_live_handoff_operator_packet_public_summary_v1",
    handoff_status: packet.summary.handoff_status,
    blocker_count: packet.summary.blocker_count,
  };
  assertLiveHandoffOperatorPacketPublicSummarySafe(summary);
  return summary;
}

export function assertLiveHandoffOperatorPacketPublicSummarySafe(
  summary,
  context = "live handoff operator packet public summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !LIVE_HANDOFF_OPERATOR_PACKET_PUBLIC_SUMMARY_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe summary field`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_live_handoff_operator_packet_public_summary_v1" ||
    !SAFE_LABEL_PATTERN.test(summary.handoff_status) ||
    !Number.isInteger(summary.blocker_count) ||
    summary.blocker_count < 0
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  assertNoUnsafeAuditMaterial(summary, context);
}

export function createLiveHandoffOperatorPacketFixturePack() {
  const safePacket = createLiveHandoffOperatorPacket({
    generatedAt: 1000,
    expiresAt: 2000,
    nowMs: 1500,
    blockers: [{ blockerLabel: "missing_fresh_evidence" }],
  });
  const leakStatus = capturesContractError(() =>
    assertLiveHandoffOperatorPacketSafe({ ...safePacket, token: "x" })
  );
  const noActionStatus =
    safePacket.summary.real_process_started === false &&
    safePacket.summary.obs_changed === false &&
    safePacket.summary.db_connected === false &&
    safePacket.summary.game_input_sent === false
      ? "no_real_action"
      : "unsafe_action";
  const expiredPacket = createLiveHandoffOperatorPacket({
    generatedAt: 1000,
    expiresAt: 2000,
    nowMs: 2500,
  });
  const ownerGate = createLiveHandoffOperatorPacketOwnerOnlyGate({
    viewerRole: "ordinary",
    ownerOnlySectionLabels: ["owner_packet_detail"],
  });
  const blockerAction = mapLiveHandoffOperatorBlockerAction(
    "missing_fresh_evidence",
    "curl https://example.invalid"
  );
  const pack = {
    schema: "iris_live_handoff_operator_packet_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: 5,
    leak_reject_fixture: createLiveHandoffFixtureResult("leak_reject", leakStatus),
    no_action_fixture: createLiveHandoffFixtureResult("no_action", noActionStatus),
    expired_fixture: createLiveHandoffFixtureResult(
      "expired",
      expiredPacket.packet_status
    ),
    owner_gate_fixture: createLiveHandoffFixtureResult(
      "owner_gate",
      ownerGate.ordinary_view_redacted ? "redacted" : "visible"
    ),
    blocker_mapping_fixture: createLiveHandoffFixtureResult(
      "blocker_mapping",
      blockerAction
    ),
  };
  assertLiveHandoffOperatorPacketFixturePackSafe(pack);
  return pack;
}

export function assertLiveHandoffOperatorPacketFixturePackSafe(
  pack,
  context = "live handoff operator packet fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: fixture pack required`);
  }
  for (const field of Object.keys(pack)) {
    if (
      !LIVE_HANDOFF_OPERATOR_PACKET_FIXTURE_PACK_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe fixture field`, {
        field,
      });
    }
  }
  if (
    pack.schema !== "iris_live_handoff_operator_packet_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 5
  ) {
    throw new ContractError(`${context}: invalid fixture pack`);
  }
  for (const field of LIVE_HANDOFF_OPERATOR_PACKET_FIXTURE_PACK_FIELDS) {
    if (["schema", "pack_status", "fixture_count"].includes(field)) continue;
    assertLiveHandoffFixtureResultSafe(pack[field], context);
  }
  const expected = {
    leak_reject_fixture: ["leak_reject", "contracterror"],
    no_action_fixture: ["no_action", "no_real_action"],
    expired_fixture: ["expired", "expired"],
    owner_gate_fixture: ["owner_gate", "redacted"],
    blocker_mapping_fixture: ["blocker_mapping", "collect_fresh_real_evidence"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
}

export function createLiveRunbookFinalHandoffSection({
  sectionStatus = "BLOCKED",
  steps = [
    { order: 1, stepLabel: "collect_fresh_real_evidence", stepStatus: "pending" },
    { order: 2, stepLabel: "request_owner_confirmation", stepStatus: "pending" },
    { order: 3, stepLabel: "verify_emergency_stop", stepStatus: "pending" },
    { order: 4, stepLabel: "confirm_audit_ready", stepStatus: "pending" },
    { order: 5, stepLabel: "review_go_no_go", stepStatus: "pending" },
  ],
} = {}) {
  const safeSteps = (Array.isArray(steps) ? steps : []).map((step, index) =>
    createLiveRunbookFinalHandoffStep(step, index)
  );
  const section = {
    schema: "iris_live_runbook_final_handoff_section_v1",
    section_status: safePacketLabel(sectionStatus),
    step_count: safeSteps.length,
    steps: safeSteps,
  };
  assertLiveRunbookFinalHandoffSectionSafe(section);
  return section;
}

export function assertLiveRunbookFinalHandoffSectionSafe(
  section,
  context = "live runbook final handoff section"
) {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    throw new ContractError(`${context}: section required`);
  }
  for (const field of Object.keys(section)) {
    if (
      !LIVE_RUNBOOK_FINAL_HANDOFF_SECTION_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe section field`, {
        field,
      });
    }
  }
  if (
    section.schema !== "iris_live_runbook_final_handoff_section_v1" ||
    !SAFE_LABEL_PATTERN.test(section.section_status) ||
    !Number.isInteger(section.step_count) ||
    section.step_count < 0 ||
    !Array.isArray(section.steps) ||
    section.step_count !== section.steps.length
  ) {
    throw new ContractError(`${context}: invalid section`);
  }
  section.steps.forEach((step) => assertLiveRunbookFinalHandoffStepSafe(step, context));
  assertNoUnsafeAuditMaterial(section, context);
}

export function createLiveRunbookOwnerConfirmationStep({
  confirmationStatus = "pending",
} = {}) {
  const safeStatus = safePacketLabel(confirmationStatus);
  const confirmed = safeStatus === "confirmed";
  const step = {
    schema: "iris_live_runbook_owner_confirmation_step_v1",
    step_label: "request_owner_confirmation",
    confirmation_status: confirmed ? "confirmed" : safeStatus,
    step_status: confirmed ? "ready" : "blocked",
    can_proceed_next: confirmed,
  };
  assertLiveRunbookOwnerConfirmationStepSafe(step);
  return step;
}

export function assertLiveRunbookOwnerConfirmationStepSafe(
  step,
  context = "live runbook owner confirmation step"
) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: step required`);
  }
  for (const field of Object.keys(step)) {
    if (
      !LIVE_RUNBOOK_OWNER_CONFIRMATION_STEP_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe step field`, {
        field,
      });
    }
  }
  if (
    step.schema !== "iris_live_runbook_owner_confirmation_step_v1" ||
    step.step_label !== "request_owner_confirmation" ||
    !SAFE_LABEL_PATTERN.test(step.confirmation_status) ||
    !["ready", "blocked"].includes(step.step_status) ||
    typeof step.can_proceed_next !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid step`);
  }
  const confirmed = step.confirmation_status === "confirmed";
  if (
    step.can_proceed_next !== confirmed ||
    step.step_status !== (confirmed ? "ready" : "blocked")
  ) {
    throw new ContractError(`${context}: owner confirmation gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(step, context);
}

export function createLiveRunbookEmergencyStopStep({
  emergencyStopFreshness = "missing",
} = {}) {
  const freshness = safePacketLabel(emergencyStopFreshness);
  const fresh = freshness === "fresh";
  const step = {
    schema: "iris_live_runbook_emergency_stop_step_v1",
    step_label: "verify_emergency_stop",
    emergency_stop_freshness: freshness,
    step_status: fresh ? "ready" : "blocked",
    production_go: fresh,
    blocker_label: fresh ? "none" : "emergency_stop_fresh_evidence_required",
  };
  assertLiveRunbookEmergencyStopStepSafe(step);
  return step;
}

export function assertLiveRunbookEmergencyStopStepSafe(
  step,
  context = "live runbook emergency stop step"
) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: step required`);
  }
  for (const field of Object.keys(step)) {
    if (
      !LIVE_RUNBOOK_EMERGENCY_STOP_STEP_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe step field`, {
        field,
      });
    }
  }
  if (
    step.schema !== "iris_live_runbook_emergency_stop_step_v1" ||
    step.step_label !== "verify_emergency_stop" ||
    !SAFE_LABEL_PATTERN.test(step.emergency_stop_freshness) ||
    !["ready", "blocked"].includes(step.step_status) ||
    typeof step.production_go !== "boolean" ||
    !["none", "emergency_stop_fresh_evidence_required"].includes(step.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid step`);
  }
  const fresh = step.emergency_stop_freshness === "fresh";
  if (
    step.production_go !== fresh ||
    step.step_status !== (fresh ? "ready" : "blocked") ||
    step.blocker_label !==
      (fresh ? "none" : "emergency_stop_fresh_evidence_required")
  ) {
    throw new ContractError(`${context}: emergency stop gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(step, context);
}

export function createLiveRunbookEvidenceCollectionStep({
  collectorLabels = LIVE_EVIDENCE_COLLECTOR_COMPONENTS.map(([, collectorName]) => collectorName),
  stepStatus = "pending",
} = {}) {
  const safeCollectorLabels = [
    ...new Set(
      (Array.isArray(collectorLabels) ? collectorLabels : [])
        .map((label) => safePacketLabel(label))
        .filter((label) => label !== "unknown")
    ),
  ];
  const step = {
    schema: "iris_live_runbook_evidence_collection_step_v1",
    step_label: "collect_fresh_real_evidence",
    collector_labels: safeCollectorLabels,
    step_status: safePacketLabel(stepStatus),
    real_collector_executed: false,
  };
  assertLiveRunbookEvidenceCollectionStepSafe(step);
  return step;
}

export function assertLiveRunbookEvidenceCollectionStepSafe(
  step,
  context = "live runbook evidence collection step"
) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: step required`);
  }
  for (const field of Object.keys(step)) {
    if (
      !LIVE_RUNBOOK_EVIDENCE_COLLECTION_STEP_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe step field`, {
        field,
      });
    }
  }
  if (
    step.schema !== "iris_live_runbook_evidence_collection_step_v1" ||
    step.step_label !== "collect_fresh_real_evidence" ||
    !Array.isArray(step.collector_labels) ||
    !SAFE_LABEL_PATTERN.test(step.step_status) ||
    step.real_collector_executed !== false
  ) {
    throw new ContractError(`${context}: invalid step`);
  }
  for (const label of step.collector_labels) {
    if (!SAFE_LABEL_PATTERN.test(label)) {
      throw new ContractError(`${context}: invalid collector label`);
    }
  }
  assertNoUnsafeAuditMaterial(step, context);
}

export function createLiveRunbookGoNoGoStep({
  inputBundleReference = "live_handoff_evidence_bundle",
  stepStatus = "pending",
} = {}) {
  const step = {
    schema: "iris_live_runbook_go_no_go_step_v1",
    step_label: "review_go_no_go",
    input_bundle_reference: safePacketLabel(inputBundleReference),
    step_status: safePacketLabel(stepStatus),
    display_only: true,
    real_operation_performed: false,
  };
  assertLiveRunbookGoNoGoStepSafe(step);
  return step;
}

export function assertLiveRunbookGoNoGoStepSafe(
  step,
  context = "live runbook go/no-go step"
) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: step required`);
  }
  for (const field of Object.keys(step)) {
    if (
      !LIVE_RUNBOOK_GO_NO_GO_STEP_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe step field`, {
        field,
      });
    }
  }
  if (
    step.schema !== "iris_live_runbook_go_no_go_step_v1" ||
    step.step_label !== "review_go_no_go" ||
    !SAFE_LABEL_PATTERN.test(step.input_bundle_reference) ||
    !SAFE_LABEL_PATTERN.test(step.step_status) ||
    step.display_only !== true ||
    step.real_operation_performed !== false
  ) {
    throw new ContractError(`${context}: invalid step`);
  }
  assertNoUnsafeAuditMaterial(step, context);
}

export function createLiveRunbookRollbackStep({
  rollbackLabel = "operator_rollback_ready",
  abortLabel = "operator_abort_ready",
  stepStatus = "pending",
} = {}) {
  const step = {
    schema: "iris_live_runbook_rollback_step_v1",
    step_label: "prepare_rollback_or_abort",
    rollback_label: safePacketLabel(rollbackLabel),
    abort_label: safePacketLabel(abortLabel),
    step_status: safePacketLabel(stepStatus),
  };
  assertLiveRunbookRollbackStepSafe(step);
  return step;
}

export function assertLiveRunbookRollbackStepSafe(
  step,
  context = "live runbook rollback step"
) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: step required`);
  }
  for (const field of Object.keys(step)) {
    if (
      !LIVE_RUNBOOK_ROLLBACK_STEP_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe step field`, {
        field,
      });
    }
  }
  if (
    step.schema !== "iris_live_runbook_rollback_step_v1" ||
    step.step_label !== "prepare_rollback_or_abort" ||
    !SAFE_LABEL_PATTERN.test(step.rollback_label) ||
    !SAFE_LABEL_PATTERN.test(step.abort_label) ||
    !SAFE_LABEL_PATTERN.test(step.step_status)
  ) {
    throw new ContractError(`${context}: invalid step`);
  }
  assertNoUnsafeAuditMaterial(step, context);
}

export function createLiveRunbookAuditStep({ auditStatus = "missing" } = {}) {
  const safeStatus = safePacketLabel(auditStatus);
  const ready = safeStatus === "ready";
  const step = {
    schema: "iris_live_runbook_audit_step_v1",
    step_label: "confirm_audit_ready",
    audit_status: safeStatus,
    step_status: ready ? "ready" : "blocked",
    handoff_status: ready ? "ready" : "BLOCKED",
    blocker_label: ready ? "none" : "audit_trail_ready_required",
  };
  assertLiveRunbookAuditStepSafe(step);
  return step;
}

export function assertLiveRunbookAuditStepSafe(
  step,
  context = "live runbook audit step"
) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: step required`);
  }
  for (const field of Object.keys(step)) {
    if (
      !LIVE_RUNBOOK_AUDIT_STEP_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe step field`, {
        field,
      });
    }
  }
  if (
    step.schema !== "iris_live_runbook_audit_step_v1" ||
    step.step_label !== "confirm_audit_ready" ||
    !SAFE_LABEL_PATTERN.test(step.audit_status) ||
    !["ready", "blocked"].includes(step.step_status) ||
    !["ready", "BLOCKED"].includes(step.handoff_status) ||
    !["none", "audit_trail_ready_required"].includes(step.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid step`);
  }
  const ready = step.audit_status === "ready";
  if (
    step.step_status !== (ready ? "ready" : "blocked") ||
    step.handoff_status !== (ready ? "ready" : "BLOCKED") ||
    step.blocker_label !== (ready ? "none" : "audit_trail_ready_required")
  ) {
    throw new ContractError(`${context}: audit gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(step, context);
}

export function createLiveRunbookStaleEvidenceStep({
  staleComponentLabels = [],
} = {}) {
  const safeLabels = [
    ...new Set(
      (Array.isArray(staleComponentLabels) ? staleComponentLabels : [])
        .map((label) => safePacketLabel(label))
        .filter((label) => label !== "unknown")
    ),
  ].sort();
  const hasStale = safeLabels.length > 0;
  const step = {
    schema: "iris_live_runbook_stale_evidence_step_v1",
    step_label: "recollect_stale_evidence",
    stale_evidence_count: safeLabels.length,
    stale_component_labels: safeLabels,
    step_status: hasStale ? "blocked" : "ready",
    handoff_ready: !hasStale,
    blocker_label: hasStale ? "stale_evidence" : "none",
  };
  assertLiveRunbookStaleEvidenceStepSafe(step);
  return step;
}

export function assertLiveRunbookStaleEvidenceStepSafe(
  step,
  context = "live runbook stale evidence step"
) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: step required`);
  }
  for (const field of Object.keys(step)) {
    if (
      !LIVE_RUNBOOK_STALE_EVIDENCE_STEP_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe step field`, {
        field,
      });
    }
  }
  if (
    step.schema !== "iris_live_runbook_stale_evidence_step_v1" ||
    step.step_label !== "recollect_stale_evidence" ||
    !Number.isInteger(step.stale_evidence_count) ||
    step.stale_evidence_count < 0 ||
    !Array.isArray(step.stale_component_labels) ||
    step.stale_evidence_count !== step.stale_component_labels.length ||
    !["ready", "blocked"].includes(step.step_status) ||
    typeof step.handoff_ready !== "boolean" ||
    !["none", "stale_evidence"].includes(step.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid step`);
  }
  for (const label of step.stale_component_labels) {
    if (!SAFE_LABEL_PATTERN.test(label)) {
      throw new ContractError(`${context}: invalid stale component label`);
    }
  }
  const hasStale = step.stale_evidence_count > 0;
  if (
    step.step_status !== (hasStale ? "blocked" : "ready") ||
    step.handoff_ready !== !hasStale ||
    step.blocker_label !== (hasStale ? "stale_evidence" : "none")
  ) {
    throw new ContractError(`${context}: stale evidence gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(step, context);
}

export function createLiveRunbookPublicView({
  viewerRole = "ordinary",
  steps = [],
} = {}) {
  const role = viewerRole === "owner" ? "owner" : "ordinary";
  const safeSteps = (Array.isArray(steps) ? steps : []).map((step) => ({
    schema: "iris_live_runbook_public_step_v1",
    step_label: safePacketLabel(step?.step_label ?? step?.stepLabel),
    step_status: safePacketLabel(step?.step_status ?? step?.stepStatus),
  }));
  const view = {
    schema: "iris_live_runbook_public_view_v1",
    viewer_role: role,
    step_count: safeSteps.length,
    steps: safeSteps,
    ordinary_view_redacted: role !== "owner",
  };
  assertLiveRunbookPublicViewSafe(view);
  return view;
}

export function assertLiveRunbookPublicViewSafe(
  view,
  context = "live runbook public view"
) {
  if (!view || typeof view !== "object" || Array.isArray(view)) {
    throw new ContractError(`${context}: view required`);
  }
  for (const field of Object.keys(view)) {
    if (
      !LIVE_RUNBOOK_PUBLIC_VIEW_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe view field`, {
        field,
      });
    }
  }
  if (
    view.schema !== "iris_live_runbook_public_view_v1" ||
    !["owner", "ordinary"].includes(view.viewer_role) ||
    !Number.isInteger(view.step_count) ||
    view.step_count < 0 ||
    !Array.isArray(view.steps) ||
    view.step_count !== view.steps.length ||
    view.ordinary_view_redacted !== (view.viewer_role !== "owner")
  ) {
    throw new ContractError(`${context}: invalid view`);
  }
  view.steps.forEach((step) => assertLiveRunbookPublicStepSafe(step, context));
  assertNoUnsafeAuditMaterial(view, context);
}

export function createLiveRunbookFixturePack() {
  const ownerMissing = createLiveRunbookOwnerConfirmationStep({
    confirmationStatus: "pending",
  });
  const emergencyMissing = createLiveRunbookEmergencyStopStep({
    emergencyStopFreshness: "missing",
  });
  const auditMissing = createLiveRunbookAuditStep({ auditStatus: "missing" });
  const staleEvidence = createLiveRunbookStaleEvidenceStep({
    staleComponentLabels: ["tts"],
  });
  const safeSection = createLiveRunbookFinalHandoffSection();
  const leakStatus = capturesContractError(() =>
    assertLiveRunbookFinalHandoffSectionSafe({
      ...safeSection,
      raw_command: "x",
    })
  );
  const pack = {
    schema: "iris_live_runbook_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: 5,
    owner_missing_fixture: createLiveHandoffFixtureResult(
      "owner_missing",
      ownerMissing.step_status
    ),
    emergency_missing_fixture: createLiveHandoffFixtureResult(
      "emergency_missing",
      emergencyMissing.step_status
    ),
    audit_missing_fixture: createLiveHandoffFixtureResult(
      "audit_missing",
      auditMissing.handoff_status
    ),
    stale_evidence_fixture: createLiveHandoffFixtureResult(
      "stale_evidence",
      staleEvidence.blocker_label
    ),
    leak_reject_fixture: createLiveHandoffFixtureResult("leak_reject", leakStatus),
  };
  assertLiveRunbookFixturePackSafe(pack);
  return pack;
}

export function assertLiveRunbookFixturePackSafe(
  pack,
  context = "live runbook fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: fixture pack required`);
  }
  for (const field of Object.keys(pack)) {
    if (
      !LIVE_RUNBOOK_FIXTURE_PACK_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe fixture field`, {
        field,
      });
    }
  }
  if (
    pack.schema !== "iris_live_runbook_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 5
  ) {
    throw new ContractError(`${context}: invalid fixture pack`);
  }
  for (const field of LIVE_RUNBOOK_FIXTURE_PACK_FIELDS) {
    if (["schema", "pack_status", "fixture_count"].includes(field)) continue;
    assertLiveHandoffFixtureResultSafe(pack[field], context);
  }
  const expected = {
    owner_missing_fixture: ["owner_missing", "blocked"],
    emergency_missing_fixture: ["emergency_missing", "blocked"],
    audit_missing_fixture: ["audit_missing", "blocked"],
    stale_evidence_fixture: ["stale_evidence", "stale_evidence"],
    leak_reject_fixture: ["leak_reject", "contracterror"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
}

export function createLiveBlockerResolution({
  blockerId = "priority1_runtime_waiting",
  component = "live_handoff",
  resolutionStatus = "open",
  evidenceRef = "evidence_pending",
  ownerRef = "owner_pending",
} = {}) {
  const resolution = {
    schema: "iris_live_blocker_resolution_v1",
    blocker_id: safePacketLabel(blockerId),
    component: safePacketLabel(component),
    resolution_status: safeBlockerResolutionStatus(resolutionStatus),
    evidence_ref: safePacketLabel(evidenceRef),
    owner_ref: safePacketLabel(ownerRef),
  };
  assertLiveBlockerResolutionSafe(resolution);
  return resolution;
}

export function assertLiveBlockerResolutionSafe(
  resolution,
  context = "live blocker resolution"
) {
  if (!resolution || typeof resolution !== "object" || Array.isArray(resolution)) {
    throw new ContractError(`${context}: resolution required`);
  }
  for (const field of Object.keys(resolution)) {
    if (
      !LIVE_BLOCKER_RESOLUTION_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe resolution field`, {
        field,
      });
    }
  }
  if (
    resolution.schema !== "iris_live_blocker_resolution_v1" ||
    !SAFE_LABEL_PATTERN.test(resolution.blocker_id) ||
    !SAFE_LABEL_PATTERN.test(resolution.component) ||
    !["open", "resolved", "attention", "blocked"].includes(
      resolution.resolution_status
    ) ||
    !SAFE_LABEL_PATTERN.test(resolution.evidence_ref) ||
    !SAFE_LABEL_PATTERN.test(resolution.owner_ref)
  ) {
    throw new ContractError(`${context}: invalid resolution`);
  }
  assertNoUnsafeAuditMaterial(resolution, context);
}

export function createLiveBlockerResolutionEvidenceGate({
  resolution,
  evidence,
  nowMs = Date.now(),
  freshnessThresholdMs = 30_000,
} = {}) {
  assertLiveBlockerResolutionSafe(
    resolution,
    "live blocker resolution evidence gate resolution"
  );
  let evidenceStatus = "missing";
  let evidenceFreshness = "missing";
  let evidenceSourceType = "missing";
  if (evidence) {
    assertRealEvidenceIntakeSafe(evidence, "live blocker resolution evidence gate evidence");
    evidenceStatus = safePacketLabel(evidence.status);
    evidenceFreshness = classifyRealEvidenceFreshness({
      evidence,
      nowMs,
      componentThresholdsMs: {
        [evidence.component]: freshnessThresholdMs,
      },
    });
    evidenceSourceType = safePacketLabel(evidence.source_type);
  }
  const freshRealEvidence =
    evidenceFreshness === "fresh" &&
    ["real_probe", "operator_confirmed", "manual_upload", "audit_link"].includes(
      evidenceSourceType
    );
  const resolved =
    resolution.resolution_status === "resolved" && freshRealEvidence === true;
  const gate = {
    schema: "iris_live_blocker_resolution_evidence_gate_v1",
    blocker_id: resolution.blocker_id,
    component: resolution.component,
    requested_resolution_status: resolution.resolution_status,
    evidence_status: evidenceStatus,
    evidence_freshness: evidenceFreshness,
    evidence_source_type: evidenceSourceType,
    resolution_status: resolved ? "resolved" : "blocked",
    blocker_label: resolved ? "none" : "fresh_real_evidence_required",
  };
  assertLiveBlockerResolutionEvidenceGateSafe(gate);
  return gate;
}

export function assertLiveBlockerResolutionEvidenceGateSafe(
  gate,
  context = "live blocker resolution evidence gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_BLOCKER_RESOLUTION_EVIDENCE_GATE_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_blocker_resolution_evidence_gate_v1" ||
    !SAFE_LABEL_PATTERN.test(gate.blocker_id) ||
    !SAFE_LABEL_PATTERN.test(gate.component) ||
    !["open", "resolved", "attention", "blocked"].includes(
      gate.requested_resolution_status
    ) ||
    !SAFE_LABEL_PATTERN.test(gate.evidence_status) ||
    !["fresh", "stale", "runtime_waiting", "attention", "missing"].includes(
      gate.evidence_freshness
    ) ||
    !SAFE_LABEL_PATTERN.test(gate.evidence_source_type) ||
    !["resolved", "blocked"].includes(gate.resolution_status) ||
    !["none", "fresh_real_evidence_required"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const freshRealEvidence =
    gate.evidence_freshness === "fresh" &&
    ["real_probe", "operator_confirmed", "manual_upload", "audit_link"].includes(
      gate.evidence_source_type
    );
  const resolved =
    gate.requested_resolution_status === "resolved" && freshRealEvidence === true;
  if (
    gate.resolution_status !== (resolved ? "resolved" : "blocked") ||
    gate.blocker_label !== (resolved ? "none" : "fresh_real_evidence_required")
  ) {
    throw new ContractError(`${context}: evidence gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveBlockerResolutionOwnerGate({
  resolution,
  ownerRequired = true,
} = {}) {
  assertLiveBlockerResolutionSafe(
    resolution,
    "live blocker resolution owner gate resolution"
  );
  const safeOwnerRef = safePacketLabel(resolution.owner_ref);
  const hasOwnerRef =
    safeOwnerRef !== "unknown" &&
    safeOwnerRef !== "owner_pending" &&
    safeOwnerRef !== "missing";
  const resolved =
    resolution.resolution_status === "resolved" &&
    (ownerRequired !== true || hasOwnerRef);
  const gate = {
    schema: "iris_live_blocker_resolution_owner_gate_v1",
    blocker_id: resolution.blocker_id,
    component: resolution.component,
    owner_required: ownerRequired === true,
    owner_ref: safeOwnerRef,
    requested_resolution_status: resolution.resolution_status,
    resolution_status: resolved ? "resolved" : "blocked",
    blocker_label: resolved ? "none" : "owner_ref_required",
  };
  assertLiveBlockerResolutionOwnerGateSafe(gate);
  return gate;
}

export function assertLiveBlockerResolutionOwnerGateSafe(
  gate,
  context = "live blocker resolution owner gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_BLOCKER_RESOLUTION_OWNER_GATE_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_blocker_resolution_owner_gate_v1" ||
    !SAFE_LABEL_PATTERN.test(gate.blocker_id) ||
    !SAFE_LABEL_PATTERN.test(gate.component) ||
    typeof gate.owner_required !== "boolean" ||
    !SAFE_LABEL_PATTERN.test(gate.owner_ref) ||
    !["open", "resolved", "attention", "blocked"].includes(
      gate.requested_resolution_status
    ) ||
    !["resolved", "blocked"].includes(gate.resolution_status) ||
    !["none", "owner_ref_required"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const hasOwnerRef =
    gate.owner_ref !== "unknown" &&
    gate.owner_ref !== "owner_pending" &&
    gate.owner_ref !== "missing";
  const resolved =
    gate.requested_resolution_status === "resolved" &&
    (gate.owner_required !== true || hasOwnerRef);
  if (
    gate.resolution_status !== (resolved ? "resolved" : "blocked") ||
    gate.blocker_label !== (resolved ? "none" : "owner_ref_required")
  ) {
    throw new ContractError(`${context}: owner gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveBlockerResolutionAuditGate({
  resolution,
  auditEntry,
} = {}) {
  assertLiveBlockerResolutionSafe(
    resolution,
    "live blocker resolution audit gate resolution"
  );
  const auditEntryStatus = isSafeLiveBlockerResolutionAuditEntry(auditEntry)
    ? "linked"
    : "missing";
  const resolved =
    resolution.resolution_status === "resolved" && auditEntryStatus === "linked";
  const gate = {
    schema: "iris_live_blocker_resolution_audit_gate_v1",
    blocker_id: resolution.blocker_id,
    component: resolution.component,
    audit_entry_status: auditEntryStatus,
    requested_resolution_status: resolution.resolution_status,
    resolution_status: resolved ? "resolved" : "blocked",
    blocker_label: resolved ? "none" : "safe_audit_entry_required",
  };
  assertLiveBlockerResolutionAuditGateSafe(gate);
  return gate;
}

export function assertLiveBlockerResolutionAuditGateSafe(
  gate,
  context = "live blocker resolution audit gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_BLOCKER_RESOLUTION_AUDIT_GATE_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_blocker_resolution_audit_gate_v1" ||
    !SAFE_LABEL_PATTERN.test(gate.blocker_id) ||
    !SAFE_LABEL_PATTERN.test(gate.component) ||
    !["linked", "missing"].includes(gate.audit_entry_status) ||
    !["open", "resolved", "attention", "blocked"].includes(
      gate.requested_resolution_status
    ) ||
    !["resolved", "blocked"].includes(gate.resolution_status) ||
    !["none", "safe_audit_entry_required"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const resolved =
    gate.requested_resolution_status === "resolved" &&
    gate.audit_entry_status === "linked";
  if (
    gate.resolution_status !== (resolved ? "resolved" : "blocked") ||
    gate.blocker_label !== (resolved ? "none" : "safe_audit_entry_required")
  ) {
    throw new ContractError(`${context}: audit gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveBlockerResolutionRegressionPack() {
  const resolution = createLiveBlockerResolution({
    blockerId: "priority1_runtime_waiting",
    component: "tts",
    resolutionStatus: "resolved",
    evidenceRef: "evidence_1",
    ownerRef: "owner_1",
  });
  const fixtureEvidenceStatus = capturesContractError(() =>
    createRealEvidenceIntake({
      component: "tts",
      status: "ready",
      evidenceTimestampMs: 1000,
      sourceType: "fixture",
      collector: "fixture_pack",
      statusHash: "hash_fixture",
    })
  );
  const ownerMissing = createLiveBlockerResolutionOwnerGate({
    resolution: createLiveBlockerResolution({
      blockerId: "priority1_runtime_waiting",
      component: "tts",
      resolutionStatus: "resolved",
      evidenceRef: "evidence_1",
      ownerRef: "owner_pending",
    }),
    ownerRequired: true,
  });
  const auditMissing = createLiveBlockerResolutionAuditGate({
    resolution,
    auditEntry: null,
  });
  const staleEvidence = createRealEvidenceIntake({
    component: "tts",
    status: "ready",
    evidenceTimestampMs: 1000,
    sourceType: "real_probe",
    collector: "tts_collector",
    statusHash: "hash_stale",
  });
  const stale = createLiveBlockerResolutionEvidenceGate({
    resolution,
    evidence: staleEvidence,
    nowMs: 5000,
    freshnessThresholdMs: 1000,
  });
  const freshEvidence = createRealEvidenceIntake({
    component: "tts",
    status: "ready",
    evidenceTimestampMs: 4500,
    sourceType: "real_probe",
    collector: "tts_collector",
    statusHash: "hash_fresh",
  });
  const freshResolved = createLiveBlockerResolutionEvidenceGate({
    resolution,
    evidence: freshEvidence,
    nowMs: 5000,
    freshnessThresholdMs: 1000,
  });
  const pack = {
    schema: "iris_live_blocker_resolution_regression_pack_v1",
    pack_status: "pass",
    fixture_count: 5,
    fixture_evidence_fixture: createLiveHandoffFixtureResult(
      "fixture_evidence",
      fixtureEvidenceStatus
    ),
    owner_missing_fixture: createLiveHandoffFixtureResult(
      "owner_missing",
      ownerMissing.blocker_label
    ),
    audit_missing_fixture: createLiveHandoffFixtureResult(
      "audit_missing",
      auditMissing.blocker_label
    ),
    stale_fixture: createLiveHandoffFixtureResult("stale", stale.blocker_label),
    fresh_resolved_fixture: createLiveHandoffFixtureResult(
      "fresh_resolved",
      freshResolved.resolution_status
    ),
  };
  assertLiveBlockerResolutionRegressionPackSafe(pack);
  return pack;
}

export function assertLiveBlockerResolutionRegressionPackSafe(
  pack,
  context = "live blocker resolution regression pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: regression pack required`);
  }
  for (const field of Object.keys(pack)) {
    if (
      !LIVE_BLOCKER_RESOLUTION_REGRESSION_PACK_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe pack field`, {
        field,
      });
    }
  }
  if (
    pack.schema !== "iris_live_blocker_resolution_regression_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 5
  ) {
    throw new ContractError(`${context}: invalid regression pack`);
  }
  for (const field of LIVE_BLOCKER_RESOLUTION_REGRESSION_PACK_FIELDS) {
    if (["schema", "pack_status", "fixture_count"].includes(field)) continue;
    assertLiveHandoffFixtureResultSafe(pack[field], context);
  }
  const expected = {
    fixture_evidence_fixture: ["fixture_evidence", "contracterror"],
    owner_missing_fixture: ["owner_missing", "owner_ref_required"],
    audit_missing_fixture: ["audit_missing", "safe_audit_entry_required"],
    stale_fixture: ["stale", "fresh_real_evidence_required"],
    fresh_resolved_fixture: ["fresh_resolved", "resolved"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
  assertNoUnsafeAuditMaterial(pack, context);
}

export function createLiveBlockerResolutionPublicSummary({ resolutions = [] } = {}) {
  const safeResolutions = (Array.isArray(resolutions) ? resolutions : []).map(
    (resolution) => {
      assertLiveBlockerResolutionSafe(
        resolution,
        "live blocker resolution public summary item"
      );
      return resolution;
    }
  );
  const resolvedCount = safeResolutions.filter(
    (resolution) => resolution.resolution_status === "resolved"
  ).length;
  const componentMap = new Map();
  for (const resolution of safeResolutions) {
    const current = componentMap.get(resolution.component);
    const status =
      resolution.resolution_status === "resolved" ? "resolved" : "unresolved";
    componentMap.set(
      resolution.component,
      current === "unresolved" || status === "unresolved" ? "unresolved" : status
    );
  }
  const summary = {
    schema: "iris_live_blocker_resolution_public_summary_v1",
    resolved_count: resolvedCount,
    unresolved_count: safeResolutions.length - resolvedCount,
    component_status: [...componentMap.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([component, status]) => ({
        schema: "iris_live_blocker_resolution_component_status_v1",
        component,
        status,
      })),
  };
  assertLiveBlockerResolutionPublicSummarySafe(summary);
  return summary;
}

export function assertLiveBlockerResolutionPublicSummarySafe(
  summary,
  context = "live blocker resolution public summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !LIVE_BLOCKER_RESOLUTION_PUBLIC_SUMMARY_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe summary field`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_live_blocker_resolution_public_summary_v1" ||
    !Number.isInteger(summary.resolved_count) ||
    summary.resolved_count < 0 ||
    !Number.isInteger(summary.unresolved_count) ||
    summary.unresolved_count < 0 ||
    !Array.isArray(summary.component_status)
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  for (const item of summary.component_status) {
    assertLiveBlockerResolutionComponentStatusSafe(item, context);
  }
  assertNoUnsafeAuditMaterial(summary, context);
}

export function createLiveBlockerResolutionNoAutoGate({
  resolution,
  readinessPass = false,
  fixturePass = false,
} = {}) {
  assertLiveBlockerResolutionSafe(
    resolution,
    "live blocker resolution no-auto gate resolution"
  );
  const autoOnly = readinessPass === true || fixturePass === true;
  const resolved = resolution.resolution_status === "resolved" && !autoOnly;
  const gate = {
    schema: "iris_live_blocker_resolution_no_auto_gate_v1",
    blocker_id: resolution.blocker_id,
    readiness_pass: readinessPass === true,
    fixture_pass: fixturePass === true,
    requested_resolution_status: resolution.resolution_status,
    resolution_status: resolved ? "resolved" : "blocked",
    blocker_label: resolved ? "none" : "manual_resolution_required",
  };
  assertLiveBlockerResolutionNoAutoGateSafe(gate);
  return gate;
}

export function assertLiveBlockerResolutionNoAutoGateSafe(
  gate,
  context = "live blocker resolution no-auto gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_BLOCKER_RESOLUTION_NO_AUTO_GATE_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_blocker_resolution_no_auto_gate_v1" ||
    !SAFE_LABEL_PATTERN.test(gate.blocker_id) ||
    typeof gate.readiness_pass !== "boolean" ||
    typeof gate.fixture_pass !== "boolean" ||
    !["open", "resolved", "attention", "blocked"].includes(
      gate.requested_resolution_status
    ) ||
    !["resolved", "blocked"].includes(gate.resolution_status) ||
    !["none", "manual_resolution_required"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const autoOnly = gate.readiness_pass === true || gate.fixture_pass === true;
  const resolved = gate.requested_resolution_status === "resolved" && !autoOnly;
  if (
    gate.resolution_status !== (resolved ? "resolved" : "blocked") ||
    gate.blocker_label !== (resolved ? "none" : "manual_resolution_required")
  ) {
    throw new ContractError(`${context}: no-auto gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveBlockerResolutionConflictGate({ resolutions = [] } = {}) {
  const safeResolutions = (Array.isArray(resolutions) ? resolutions : []).map(
    (resolution) => {
      assertLiveBlockerResolutionSafe(
        resolution,
        "live blocker resolution conflict gate item"
      );
      return resolution;
    }
  );
  const blockerId = safeResolutions[0]?.blocker_id ?? "unknown";
  const statusSet = new Set(
    safeResolutions
      .filter((resolution) => resolution.blocker_id === blockerId)
      .map((resolution) =>
        resolution.resolution_status === "resolved" ? "resolved" : "open"
      )
  );
  const hasConflict = statusSet.has("resolved") && statusSet.has("open");
  const gate = {
    schema: "iris_live_blocker_resolution_conflict_gate_v1",
    blocker_id: blockerId,
    observed_statuses: [...statusSet].sort(),
    conflict_status: hasConflict ? "attention" : "clear",
    resolution_status: hasConflict
      ? "attention"
      : statusSet.has("resolved")
        ? "resolved"
        : "open",
    blocker_label: hasConflict ? "resolution_conflict" : "none",
  };
  assertLiveBlockerResolutionConflictGateSafe(gate);
  return gate;
}

export function assertLiveBlockerResolutionConflictGateSafe(
  gate,
  context = "live blocker resolution conflict gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !LIVE_BLOCKER_RESOLUTION_CONFLICT_GATE_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_live_blocker_resolution_conflict_gate_v1" ||
    !SAFE_LABEL_PATTERN.test(gate.blocker_id) ||
    !Array.isArray(gate.observed_statuses) ||
    !["attention", "clear"].includes(gate.conflict_status) ||
    !["open", "resolved", "attention"].includes(gate.resolution_status) ||
    !["none", "resolution_conflict"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const statuses = new Set(gate.observed_statuses);
  for (const status of statuses) {
    if (!["open", "resolved"].includes(status)) {
      throw new ContractError(`${context}: invalid observed status`);
    }
  }
  const hasConflict = statuses.has("resolved") && statuses.has("open");
  const expectedResolution = hasConflict
    ? "attention"
    : statuses.has("resolved")
      ? "resolved"
      : "open";
  if (
    gate.conflict_status !== (hasConflict ? "attention" : "clear") ||
    gate.resolution_status !== expectedResolution ||
    gate.blocker_label !== (hasConflict ? "resolution_conflict" : "none")
  ) {
    throw new ContractError(`${context}: conflict gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createLiveBlockerResolutionCompletionHook({
  resolutions = [],
} = {}) {
  const safeResolutions = (Array.isArray(resolutions) ? resolutions : []).map(
    (resolution) => {
      assertLiveBlockerResolutionSafe(
        resolution,
        "live blocker resolution completion hook item"
      );
      return resolution;
    }
  );
  const summary = createLiveBlockerResolutionPublicSummary({
    resolutions: safeResolutions,
  });
  const attentionCount = safeResolutions.filter(
    (resolution) => resolution.resolution_status === "attention"
  ).length;
  const hook = {
    schema: "iris_live_blocker_resolution_completion_hook_v1",
    review_status:
      summary.unresolved_count === 0 && attentionCount === 0
        ? "ready"
        : "attention",
    resolved_count: summary.resolved_count,
    unresolved_count: summary.unresolved_count,
    attention_count: attentionCount,
    component_status: summary.component_status,
  };
  assertLiveBlockerResolutionCompletionHookSafe(hook);
  return hook;
}

export function assertLiveBlockerResolutionCompletionHookSafe(
  hook,
  context = "live blocker resolution completion hook"
) {
  if (!hook || typeof hook !== "object" || Array.isArray(hook)) {
    throw new ContractError(`${context}: hook required`);
  }
  for (const field of Object.keys(hook)) {
    if (
      !LIVE_BLOCKER_RESOLUTION_COMPLETION_HOOK_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe hook field`, {
        field,
      });
    }
  }
  if (
    hook.schema !== "iris_live_blocker_resolution_completion_hook_v1" ||
    !["ready", "attention"].includes(hook.review_status) ||
    !Number.isInteger(hook.resolved_count) ||
    hook.resolved_count < 0 ||
    !Number.isInteger(hook.unresolved_count) ||
    hook.unresolved_count < 0 ||
    !Number.isInteger(hook.attention_count) ||
    hook.attention_count < 0 ||
    !Array.isArray(hook.component_status)
  ) {
    throw new ContractError(`${context}: invalid hook`);
  }
  for (const item of hook.component_status) {
    assertLiveBlockerResolutionComponentStatusSafe(item, context);
  }
  if (
    hook.review_status !==
    (hook.unresolved_count === 0 && hook.attention_count === 0
      ? "ready"
      : "attention")
  ) {
    throw new ContractError(`${context}: review status mismatch`);
  }
  assertNoUnsafeAuditMaterial(hook, context);
}

export function createProductionOwnerHandoffReview({
  requiredSections = [
    "evidence_bundle",
    "owner_confirmations",
    "blocker_summary",
    "go_no_go",
  ],
  sectionStatuses = {},
  blockers = [],
  confirmations = [],
  evidenceFreshness = [],
  status = "pending",
} = {}) {
  const safeSections = (Array.isArray(requiredSections) ? requiredSections : []).map(
    (section) => ({
      schema: "iris_production_owner_handoff_review_section_v1",
      section: safePacketLabel(section),
      status: safeOwnerHandoffReviewStatus(sectionStatuses?.[section] ?? "pending"),
    })
  );
  const safeBlockers = (Array.isArray(blockers) ? blockers : []).map((blocker) => ({
    schema: "iris_production_owner_handoff_review_blocker_v1",
    blocker_label: safePacketLabel(blocker?.blocker_label ?? blocker?.label ?? blocker),
    status: safeOwnerHandoffReviewStatus(blocker?.status ?? "open"),
  }));
  const safeConfirmations = (Array.isArray(confirmations) ? confirmations : []).map(
    (confirmation) => ({
      schema: "iris_production_owner_handoff_review_confirmation_v1",
      scope: safePacketLabel(confirmation?.scope ?? confirmation),
      status: safeOwnerHandoffReviewStatus(confirmation?.status ?? "pending"),
    })
  );
  const safeEvidenceFreshness = (
    Array.isArray(evidenceFreshness) ? evidenceFreshness : []
  ).map((evidence) => ({
    schema: "iris_production_owner_handoff_review_evidence_freshness_v1",
    component: safePacketLabel(evidence?.component ?? evidence),
    freshness: safeOwnerHandoffEvidenceFreshness(
      evidence?.freshness ?? evidence?.status ?? "runtime_waiting"
    ),
  }));
  const review = {
    schema: "iris_production_owner_handoff_review_v1",
    required_sections: safeSections,
    status: safeOwnerHandoffReviewStatus(status),
    blockers: safeBlockers,
    confirmations: safeConfirmations,
    evidence_freshness: safeEvidenceFreshness,
  };
  assertProductionOwnerHandoffReviewSafe(review);
  return review;
}

export function assertProductionOwnerHandoffReviewSafe(
  review,
  context = "production owner handoff review"
) {
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    throw new ContractError(`${context}: review required`);
  }
  for (const field of Object.keys(review)) {
    if (
      !PRODUCTION_OWNER_HANDOFF_REVIEW_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe review field`, {
        field,
      });
    }
  }
  if (
    review.schema !== "iris_production_owner_handoff_review_v1" ||
    !["pending", "blocked", "attention", "complete"].includes(review.status) ||
    !Array.isArray(review.required_sections) ||
    !Array.isArray(review.blockers) ||
    !Array.isArray(review.confirmations) ||
    !Array.isArray(review.evidence_freshness)
  ) {
    throw new ContractError(`${context}: invalid review`);
  }
  for (const section of review.required_sections) {
    assertProductionOwnerHandoffReviewSectionSafe(section, context);
  }
  for (const blocker of review.blockers) {
    assertProductionOwnerHandoffReviewBlockerSafe(blocker, context);
  }
  for (const confirmation of review.confirmations) {
    assertProductionOwnerHandoffReviewConfirmationSafe(confirmation, context);
  }
  for (const evidence of review.evidence_freshness) {
    assertProductionOwnerHandoffReviewEvidenceFreshnessSafe(evidence, context);
  }
  assertNoUnsafeAuditMaterial(review, context);
}

export function createProductionOwnerHandoffReviewCompleteness({
  requiredSections = [],
  presentSections = [],
} = {}) {
  const required = (Array.isArray(requiredSections) ? requiredSections : []).map(
    safePacketLabel
  );
  const present = new Set(
    (Array.isArray(presentSections) ? presentSections : []).map(safePacketLabel)
  );
  const missing = required.filter((section) => !present.has(section));
  const gate = {
    schema: "iris_production_owner_handoff_review_completeness_v1",
    required_section_count: required.length,
    present_section_count: required.filter((section) => present.has(section)).length,
    missing_sections: missing,
    review_complete: missing.length === 0,
    status: missing.length === 0 ? "complete" : "blocked",
  };
  assertProductionOwnerHandoffReviewCompletenessSafe(gate);
  return gate;
}

export function assertProductionOwnerHandoffReviewCompletenessSafe(
  gate,
  context = "production owner handoff review completeness"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !PRODUCTION_OWNER_HANDOFF_REVIEW_COMPLETENESS_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_production_owner_handoff_review_completeness_v1" ||
    !Number.isInteger(gate.required_section_count) ||
    gate.required_section_count < 0 ||
    !Number.isInteger(gate.present_section_count) ||
    gate.present_section_count < 0 ||
    gate.present_section_count > gate.required_section_count ||
    !Array.isArray(gate.missing_sections) ||
    typeof gate.review_complete !== "boolean" ||
    !["complete", "blocked"].includes(gate.status)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  for (const section of gate.missing_sections) {
    if (!SAFE_LABEL_PATTERN.test(section)) {
      throw new ContractError(`${context}: invalid missing section`);
    }
  }
  const expectedComplete = gate.missing_sections.length === 0;
  if (
    gate.review_complete !== expectedComplete ||
    gate.status !== (expectedComplete ? "complete" : "blocked")
  ) {
    throw new ContractError(`${context}: completeness mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createProductionOwnerHandoffReviewRoleGate({
  viewerRole = "ordinary",
  ownerOnlyDetails = [],
} = {}) {
  const role = safeOwnerHandoffReviewViewerRole(viewerRole);
  const ownerView = role === "owner";
  const safeDetails = (Array.isArray(ownerOnlyDetails) ? ownerOnlyDetails : []).map(
    safePacketLabel
  );
  const gate = {
    schema: "iris_production_owner_handoff_review_role_gate_v1",
    viewer_role: role,
    owner_only_visible: ownerView,
    owner_only_detail_count: safeDetails.length,
    safe_detail_labels: ownerView ? safeDetails : [],
    ordinary_view_redacted: !ownerView,
  };
  assertProductionOwnerHandoffReviewRoleGateSafe(gate);
  return gate;
}

export function assertProductionOwnerHandoffReviewRoleGateSafe(
  gate,
  context = "production owner handoff review role gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !PRODUCTION_OWNER_HANDOFF_REVIEW_ROLE_GATE_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_production_owner_handoff_review_role_gate_v1" ||
    !["owner", "ordinary"].includes(gate.viewer_role) ||
    typeof gate.owner_only_visible !== "boolean" ||
    !Number.isInteger(gate.owner_only_detail_count) ||
    gate.owner_only_detail_count < 0 ||
    !Array.isArray(gate.safe_detail_labels) ||
    typeof gate.ordinary_view_redacted !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  for (const label of gate.safe_detail_labels) {
    if (
      !SAFE_LABEL_PATTERN.test(label) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_VALUE_PATTERN.test(label)
    ) {
      throw new ContractError(`${context}: invalid safe detail label`);
    }
  }
  const ownerView = gate.viewer_role === "owner";
  if (
    gate.owner_only_visible !== ownerView ||
    gate.ordinary_view_redacted !== !ownerView ||
    (!ownerView && gate.safe_detail_labels.length !== 0) ||
    (ownerView && gate.safe_detail_labels.length > gate.owner_only_detail_count)
  ) {
    throw new ContractError(`${context}: role gate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createProductionOwnerHandoffReviewNoActionGate({
  reviewStatus = "generated",
} = {}) {
  const gate = {
    schema: "iris_production_owner_handoff_review_no_action_gate_v1",
    review_status: safePacketLabel(reviewStatus),
    real_operation_performed: false,
    external_connection_opened: false,
    worker_started: false,
    obs_changed: false,
    db_connected: false,
    game_input_sent: false,
  };
  assertProductionOwnerHandoffReviewNoActionGateSafe(gate);
  return gate;
}

export function assertProductionOwnerHandoffReviewNoActionGateSafe(
  gate,
  context = "production owner handoff review no-action gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !PRODUCTION_OWNER_HANDOFF_REVIEW_NO_ACTION_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_production_owner_handoff_review_no_action_gate_v1" ||
    !SAFE_LABEL_PATTERN.test(gate.review_status) ||
    gate.real_operation_performed !== false ||
    gate.external_connection_opened !== false ||
    gate.worker_started !== false ||
    gate.obs_changed !== false ||
    gate.db_connected !== false ||
    gate.game_input_sent !== false
  ) {
    throw new ContractError(`${context}: invalid no-action gate`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createProductionOwnerHandoffReviewFixturePack() {
  const requiredSections = [
    "evidence_bundle",
    "owner_confirmations",
    "blocker_summary",
    "go_no_go",
  ];
  const incomplete = createProductionOwnerHandoffReviewCompleteness({
    requiredSections,
    presentSections: ["evidence_bundle", "blocker_summary"],
  });
  const secretLeakStatus = capturesContractError(() =>
    assertProductionOwnerHandoffReviewSafe({
      ...createProductionOwnerHandoffReview({ status: "complete" }),
      token: "x",
    })
  );
  const ownerOnlyGate = createProductionOwnerHandoffReviewRoleGate({
    viewerRole: "ordinary",
    ownerOnlyDetails: ["owner_confirmation_detail"],
  });
  const noAction = createProductionOwnerHandoffReviewNoActionGate();
  const complete = createProductionOwnerHandoffReviewCompleteness({
    requiredSections,
    presentSections: requiredSections,
  });
  const noActionStatus =
    noAction.real_operation_performed === false &&
    noAction.external_connection_opened === false &&
    noAction.worker_started === false &&
    noAction.obs_changed === false &&
    noAction.db_connected === false &&
    noAction.game_input_sent === false
      ? "no_real_action"
      : "unsafe_action";
  const pack = {
    schema: "iris_production_owner_handoff_review_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: 5,
    incomplete_fixture: createLiveHandoffFixtureResult(
      "incomplete",
      incomplete.review_complete ? "complete" : "blocked"
    ),
    leak_reject_fixture: createLiveHandoffFixtureResult(
      "leak_reject",
      secretLeakStatus
    ),
    owner_only_leak_fixture: createLiveHandoffFixtureResult(
      "owner_only_leak",
      ownerOnlyGate.ordinary_view_redacted ? "redacted" : "visible"
    ),
    no_action_fixture: createLiveHandoffFixtureResult(
      "no_action",
      noActionStatus
    ),
    complete_fixture: createLiveHandoffFixtureResult(
      "complete",
      complete.review_complete ? "complete" : "blocked"
    ),
  };
  assertProductionOwnerHandoffReviewFixturePackSafe(pack);
  return pack;
}

export function assertProductionOwnerHandoffReviewFixturePackSafe(
  pack,
  context = "production owner handoff review fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: fixture pack required`);
  }
  for (const field of Object.keys(pack)) {
    if (
      !PRODUCTION_OWNER_HANDOFF_REVIEW_FIXTURE_PACK_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe fixture field`, {
        field,
      });
    }
  }
  if (
    pack.schema !== "iris_production_owner_handoff_review_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 5
  ) {
    throw new ContractError(`${context}: invalid fixture pack`);
  }
  for (const field of PRODUCTION_OWNER_HANDOFF_REVIEW_FIXTURE_PACK_FIELDS) {
    if (["schema", "pack_status", "fixture_count"].includes(field)) continue;
    assertLiveHandoffFixtureResultSafe(pack[field], context);
  }
  const expected = {
    incomplete_fixture: ["incomplete", "blocked"],
    leak_reject_fixture: ["leak_reject", "contracterror"],
    owner_only_leak_fixture: ["owner_only_leak", "redacted"],
    no_action_fixture: ["no_action", "no_real_action"],
    complete_fixture: ["complete", "complete"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
  assertNoUnsafeAuditMaterial(pack, context);
}

export function createProductionGoPackage({
  evidenceBundleStatus = "pending",
  ownerConfirmationStatus = "pending",
  emergencyStopStatus = "pending",
  auditStatus = "pending",
  rollbackPlanStatus = "pending",
  blockerStatus = "open",
} = {}) {
  const goPackage = {
    schema: "iris_production_go_package_v1",
    evidence_bundle: createProductionGoPackageItem(
      "evidence_bundle",
      evidenceBundleStatus
    ),
    owner_confirmation: createProductionGoPackageItem(
      "owner_confirmation",
      ownerConfirmationStatus
    ),
    emergency_stop: createProductionGoPackageItem(
      "emergency_stop",
      emergencyStopStatus
    ),
    audit: createProductionGoPackageItem("audit", auditStatus),
    rollback_plan: createProductionGoPackageItem(
      "rollback_plan",
      rollbackPlanStatus
    ),
    blocker_status: createProductionGoPackageItem("blocker_status", blockerStatus),
  };
  assertProductionGoPackageSafe(goPackage);
  return goPackage;
}

export function assertProductionGoPackageSafe(
  goPackage,
  context = "production go package"
) {
  if (!goPackage || typeof goPackage !== "object" || Array.isArray(goPackage)) {
    throw new ContractError(`${context}: package required`);
  }
  for (const field of Object.keys(goPackage)) {
    if (
      !PRODUCTION_GO_PACKAGE_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe package field`, {
        field,
      });
    }
  }
  if (goPackage.schema !== "iris_production_go_package_v1") {
    throw new ContractError(`${context}: invalid package`);
  }
  for (const field of PRODUCTION_GO_PACKAGE_FIELDS) {
    if (field === "schema") continue;
    assertProductionGoPackageItemSafe(goPackage[field], context);
  }
  assertNoUnsafeAuditMaterial(goPackage, context);
}

export function createProductionGoPackageNoRealGoGate({ goPackage } = {}) {
  assertProductionGoPackageSafe(goPackage, "production go package no-real-go source");
  const gate = {
    schema: "iris_production_go_package_no_real_go_gate_v1",
    package_generated: true,
    real_go_executed: false,
    production_go_claimed: false,
    status: "not_executed",
  };
  assertProductionGoPackageNoRealGoGateSafe(gate);
  return gate;
}

export function assertProductionGoPackageNoRealGoGateSafe(
  gate,
  context = "production go package no-real-go gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !PRODUCTION_GO_PACKAGE_NO_REAL_GO_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_production_go_package_no_real_go_gate_v1" ||
    gate.package_generated !== true ||
    gate.real_go_executed !== false ||
    gate.production_go_claimed !== false ||
    gate.status !== "not_executed"
  ) {
    throw new ContractError(`${context}: invalid no-real-go gate`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createProductionGoPackageReadinessResult({ goPackage } = {}) {
  assertProductionGoPackageSafe(goPackage, "production go package readiness source");
  const requirements = [
    ["evidence_bundle", goPackage.evidence_bundle.status === "ready"],
    ["owner_confirmation", goPackage.owner_confirmation.status === "confirmed"],
    ["emergency_stop", goPackage.emergency_stop.status === "fresh"],
    ["audit", goPackage.audit.status === "ready"],
    ["rollback_plan", goPackage.rollback_plan.status === "ready"],
    [
      "blocker_status",
      ["none", "resolved"].includes(goPackage.blocker_status.status),
    ],
  ];
  const missingRequired = requirements
    .filter(([, ready]) => !ready)
    .map(([label]) => label);
  const result = {
    schema: "iris_production_go_package_readiness_result_v1",
    package_status: missingRequired.length === 0 ? "ready" : "blocked",
    missing_required: missingRequired,
    blocker_count: missingRequired.length,
  };
  assertProductionGoPackageReadinessResultSafe(result);
  return result;
}

export function assertProductionGoPackageReadinessResultSafe(
  result,
  context = "production go package readiness result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result required`);
  }
  for (const field of Object.keys(result)) {
    if (
      !PRODUCTION_GO_PACKAGE_READINESS_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe result field`, {
        field,
      });
    }
  }
  if (
    result.schema !== "iris_production_go_package_readiness_result_v1" ||
    !["ready", "blocked"].includes(result.package_status) ||
    !Array.isArray(result.missing_required) ||
    !Number.isInteger(result.blocker_count) ||
    result.blocker_count < 0 ||
    result.blocker_count !== result.missing_required.length
  ) {
    throw new ContractError(`${context}: invalid result`);
  }
  for (const label of result.missing_required) {
    if (
      !SAFE_LABEL_PATTERN.test(label) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_VALUE_PATTERN.test(label)
    ) {
      throw new ContractError(`${context}: invalid missing required label`);
    }
  }
  if (
    result.package_status !==
    (result.missing_required.length === 0 ? "ready" : "blocked")
  ) {
    throw new ContractError(`${context}: readiness mismatch`);
  }
  assertNoUnsafeAuditMaterial(result, context);
}

export function createProductionGoPackageSafeSummary({ goPackage } = {}) {
  const readiness = createProductionGoPackageReadinessResult({ goPackage });
  const summary = {
    schema: "iris_production_go_package_safe_summary_v1",
    package_status: readiness.package_status,
    blocker_count: readiness.blocker_count,
    required_count: PRODUCTION_GO_PACKAGE_FIELDS.size - 1,
    missing_required: [...readiness.missing_required],
  };
  assertProductionGoPackageSafeSummarySafe(summary);
  return summary;
}

export function assertProductionGoPackageSafeSummarySafe(
  summary,
  context = "production go package safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !PRODUCTION_GO_PACKAGE_SAFE_SUMMARY_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe summary field`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_production_go_package_safe_summary_v1" ||
    !["ready", "blocked"].includes(summary.package_status) ||
    !Number.isInteger(summary.blocker_count) ||
    summary.blocker_count < 0 ||
    summary.required_count !== PRODUCTION_GO_PACKAGE_FIELDS.size - 1 ||
    !Array.isArray(summary.missing_required) ||
    summary.blocker_count !== summary.missing_required.length
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  for (const label of summary.missing_required) {
    if (
      !SAFE_LABEL_PATTERN.test(label) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_VALUE_PATTERN.test(label)
    ) {
      throw new ContractError(`${context}: invalid missing required label`);
    }
  }
  if (
    summary.package_status !==
    (summary.missing_required.length === 0 ? "ready" : "blocked")
  ) {
    throw new ContractError(`${context}: summary mismatch`);
  }
  assertNoUnsafeAuditMaterial(summary, context);
}

export function createProductionEvidenceSafeProvenanceCompositor({
  realEvidence = [],
  requiredComponents = [],
  nowMs = Date.now(),
  componentThresholdsMs = {},
  ownerConfirmation,
  ownerFinalApproval,
  emergencyStopEvidence,
  auditReadinessStatus = "missing",
  auditEntries = [],
  auditEvent,
  rollbackPlanStatus = "missing",
  criticalBlockers = [],
  degradedComponents = [],
  fixtureOnly = false,
  dryRunOnly = false,
  safeNextActionLabel = "collect_real_evidence",
} = {}) {
  const safeAction = safePacketLabel(safeNextActionLabel);
  const safeRealEvidence = (Array.isArray(realEvidence) ? realEvidence : []).map(
    (evidence) => {
      assertRealEvidenceIntakeSafe(
        evidence,
        "production evidence safe provenance item"
      );
      return evidence;
    }
  );
  const safeRequiredComponents = [
    ...new Set(
      (Array.isArray(requiredComponents) ? requiredComponents : [])
        .map((component) => safeLabel(component))
        .filter((component) => component !== "unknown")
    ),
  ].sort();
  const safeCriticalBlockers = [
    ...new Set(
      (Array.isArray(criticalBlockers) ? criticalBlockers : [])
        .map((blocker) => safeLabel(blocker))
        .filter((blocker) => blocker !== "unknown")
    ),
  ].sort();
  const bundle = createLiveHandoffEvidenceBundle({
    realEvidence: safeRealEvidence,
    ownerConfirmation,
    auditReference: safeRealEvidence[0]?.audit_reference ?? "audit_pending",
    blockerLabels: safeCriticalBlockers,
  });
  const completenessGate = createLiveHandoffBundleCompletenessGate({
    bundle,
    requiredComponents: safeRequiredComponents,
  });
  const freshnessGate = createLiveHandoffBundleFreshnessGate({
    bundle,
    nowMs,
    componentThresholdsMs,
  });
  const ownerGate = createLiveHandoffBundleOwnerGate({ bundle, checkedAt: nowMs });
  let emergencyHandoffReady = false;
  let emergencyGoReady = false;
  let emergencyPackageStatus = "missing";
  if (emergencyStopEvidence) {
    assertFreshEvidenceEnvelopeSafe(
      emergencyStopEvidence,
      "production evidence safe provenance emergency evidence"
    );
    const emergencyGate = createLiveHandoffBundleEmergencyGate({
      emergencyStopEvidence,
    });
    const emergencyFinalGate = createLiveGoNoGoEmergencyFinalGate({
      emergencyStopEvidence,
    });
    emergencyHandoffReady = emergencyGate.handoff_ready;
    emergencyGoReady = emergencyFinalGate.go;
    emergencyPackageStatus =
      emergencyStopEvidence.freshness === "fresh" ? "fresh" : "stale";
  }
  const auditGate = createLiveHandoffBundleAuditGate({
    bundle,
    auditReadinessStatus,
    auditEntries,
  });
  const evaluator = createLiveGoNoGoEvidenceEvaluator({
    bundle,
    fixtureOnly,
    dryRunOnly,
  });
  const criticalBlockerGate = createLiveGoNoGoCriticalBlockerGate({
    components: safeRequiredComponents,
    criticalBlockers: safeCriticalBlockers,
  });
  const degradedModeGate = createLiveGoNoGoDegradedModeGate({
    go: false,
    degradedComponents,
  });
  const ownerFinalGate = createLiveGoNoGoOwnerFinalApprovalGate({
    ownerApproval: ownerFinalApproval,
  });
  const auditFinalGate = createLiveGoNoGoAuditTrailFinalGate({ auditEvent });
  const handoffMissingRequired = [
    ...(completenessGate.handoff_ready ? [] : ["required_component_missing"]),
    ...(freshnessGate.handoff_ready ? [] : ["fresh_evidence_required"]),
    ...(ownerGate.handoff_ready ? [] : ["owner_confirmation"]),
    ...(emergencyHandoffReady ? [] : ["emergency_stop"]),
    ...(auditGate.handoff_ready ? [] : ["audit_readiness"]),
    ...(evaluator.go ? [] : [evaluator.blocker_label]),
    ...(criticalBlockerGate.go ? [] : ["critical_blocker"]),
  ].filter((label) => label !== "none");
  const evidenceBundleStatus = !completenessGate.handoff_ready
    ? "missing"
    : !freshnessGate.handoff_ready
      ? "stale"
      : !evaluator.go
        ? "blocked"
        : "ready";
  const ownerPackageStatus =
    ownerGate.handoff_ready && ownerFinalGate.go ? "confirmed" : "pending";
  const auditPackageStatus =
    auditGate.handoff_ready && auditFinalGate.go ? "ready" : "missing";
  const rollbackStatus = safePacketLabel(rollbackPlanStatus);
  const allBlockingClear =
    handoffMissingRequired.length === 0 &&
    ownerFinalGate.go &&
    emergencyGoReady &&
    auditFinalGate.go &&
    rollbackStatus === "ready" &&
    criticalBlockerGate.go;
  const goPackage = createProductionGoPackage({
    evidenceBundleStatus,
    ownerConfirmationStatus: ownerPackageStatus,
    emergencyStopStatus: emergencyGoReady ? emergencyPackageStatus : "missing",
    auditStatus: auditPackageStatus,
    rollbackPlanStatus: rollbackStatus,
    blockerStatus: allBlockingClear ? "none" : "open",
  });
  const packageReadiness = createProductionGoPackageReadinessResult({ goPackage });
  const missingRequired = uniqueSafeLabels([
    ...handoffMissingRequired,
    ...packageReadiness.missing_required,
    ...(ownerFinalGate.go ? [] : ["owner_final_approval"]),
    ...(emergencyGoReady ? [] : ["emergency_stop_final"]),
    ...(auditFinalGate.go ? [] : ["audit_trail"]),
    ...(rollbackStatus === "ready" ? [] : ["rollback_plan"]),
  ]);
  const productionGoAllowed = false;
  const finalClassifierStatus =
    packageReadiness.package_status === "ready" ? "no_go" : "blocked";
  const compositor = {
    schema: "iris_production_evidence_safe_provenance_compositor_v1",
    compositor_status: missingRequired.length === 0 ? "no_go" : "blocked",
    safe_provenance_references: safeRealEvidence.map((evidence) =>
      createProductionEvidenceSafeProvenanceReference({
        evidence,
        nowMs,
        componentThresholdsMs,
        safeNextActionLabel: safeAction,
      })
    ),
    handoff_bundle_reference: {
      schema: "iris_production_evidence_safe_provenance_handoff_reference_v1",
      bundle_status: bundle.bundle_status,
      handoff_ready:
        completenessGate.handoff_ready &&
        freshnessGate.handoff_ready &&
        ownerGate.handoff_ready &&
        emergencyHandoffReady &&
        auditGate.handoff_ready &&
        evaluator.go &&
        criticalBlockerGate.go,
      blocker_count: handoffMissingRequired.length,
      missing_required: uniqueSafeLabels(handoffMissingRequired),
      safe_next_action_label: safeAction,
    },
    go_no_go_package_reference: {
      schema: "iris_production_evidence_safe_provenance_go_package_reference_v1",
      package_status: packageReadiness.package_status,
      production_go_allowed: productionGoAllowed,
      degraded_mode_available: degradedModeGate.degraded_mode_available,
      final_classifier_status: finalClassifierStatus,
      blocker_count: packageReadiness.blocker_count,
      missing_required: [...packageReadiness.missing_required],
      safe_next_action_label: safeAction,
    },
    bundle_status: bundle.bundle_status,
    package_status: packageReadiness.package_status,
    blocker_count: missingRequired.length,
    missing_required: missingRequired,
    production_go_allowed: productionGoAllowed,
    degraded_mode_available: degradedModeGate.degraded_mode_available,
    priority1_status: "BLOCKED",
    safe_next_action_label: safeAction,
  };
  assertProductionEvidenceSafeProvenanceCompositorSafe(compositor);
  return compositor;
}

export function assertProductionEvidenceSafeProvenanceCompositorSafe(
  compositor,
  context = "production evidence safe provenance compositor"
) {
  if (!compositor || typeof compositor !== "object" || Array.isArray(compositor)) {
    throw new ContractError(`${context}: compositor required`);
  }
  for (const field of Object.keys(compositor)) {
    if (
      !PRODUCTION_EVIDENCE_SAFE_PROVENANCE_COMPOSITOR_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe compositor field`, {
        field,
      });
    }
  }
  if (
    compositor.schema !==
      "iris_production_evidence_safe_provenance_compositor_v1" ||
    !["blocked", "no_go"].includes(compositor.compositor_status) ||
    !Array.isArray(compositor.safe_provenance_references) ||
    !["collected", "BLOCKED"].includes(compositor.bundle_status) ||
    !["ready", "blocked"].includes(compositor.package_status) ||
    !Number.isInteger(compositor.blocker_count) ||
    compositor.blocker_count < 0 ||
    !Array.isArray(compositor.missing_required) ||
    typeof compositor.production_go_allowed !== "boolean" ||
    typeof compositor.degraded_mode_available !== "boolean" ||
    compositor.priority1_status !== "BLOCKED" ||
    !SAFE_LABEL_PATTERN.test(compositor.safe_next_action_label)
  ) {
    throw new ContractError(`${context}: invalid compositor`);
  }
  for (const reference of compositor.safe_provenance_references) {
    assertProductionEvidenceSafeProvenanceReferenceSafe(reference, context);
  }
  assertProductionEvidenceSafeProvenanceHandoffReferenceSafe(
    compositor.handoff_bundle_reference,
    context
  );
  assertProductionEvidenceSafeProvenanceGoPackageReferenceSafe(
    compositor.go_no_go_package_reference,
    context
  );
  for (const label of compositor.missing_required) {
    if (
      !SAFE_LABEL_PATTERN.test(label) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_VALUE_PATTERN.test(label)
    ) {
      throw new ContractError(`${context}: invalid missing required label`);
    }
  }
  if (
    compositor.blocker_count !== compositor.missing_required.length ||
    compositor.production_go_allowed !== false ||
    compositor.package_status !== compositor.go_no_go_package_reference.package_status ||
    compositor.bundle_status !== compositor.handoff_bundle_reference.bundle_status
  ) {
    throw new ContractError(`${context}: compositor mismatch`);
  }
  assertNoUnsafeAuditMaterial(compositor, context);
}

export function createProductionEvidenceSafeProvenanceSummary({
  compositor,
} = {}) {
  assertProductionEvidenceSafeProvenanceCompositorSafe(
    compositor,
    "production evidence safe provenance summary source"
  );
  const summary = {
    schema: "iris_production_evidence_safe_provenance_summary_v1",
    compositor_status: compositor.compositor_status,
    evidence_reference_count: compositor.safe_provenance_references.length,
    bundle_status: compositor.bundle_status,
    package_status: compositor.package_status,
    blocker_count: compositor.blocker_count,
    missing_required: [...compositor.missing_required],
    production_go_allowed: compositor.production_go_allowed,
    degraded_mode_available: compositor.degraded_mode_available,
    priority1_status: compositor.priority1_status,
    safe_next_action_label: compositor.safe_next_action_label,
  };
  assertProductionEvidenceSafeProvenanceSummarySafe(summary);
  return summary;
}

export function assertProductionEvidenceSafeProvenanceSummarySafe(
  summary,
  context = "production evidence safe provenance summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !PRODUCTION_EVIDENCE_SAFE_PROVENANCE_SUMMARY_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe summary field`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_production_evidence_safe_provenance_summary_v1" ||
    !["blocked", "no_go"].includes(summary.compositor_status) ||
    !Number.isInteger(summary.evidence_reference_count) ||
    summary.evidence_reference_count < 0 ||
    !["collected", "BLOCKED"].includes(summary.bundle_status) ||
    !["ready", "blocked"].includes(summary.package_status) ||
    !Number.isInteger(summary.blocker_count) ||
    summary.blocker_count < 0 ||
    !Array.isArray(summary.missing_required) ||
    typeof summary.production_go_allowed !== "boolean" ||
    typeof summary.degraded_mode_available !== "boolean" ||
    summary.priority1_status !== "BLOCKED" ||
    !SAFE_LABEL_PATTERN.test(summary.safe_next_action_label)
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  for (const label of summary.missing_required) {
    if (
      !SAFE_LABEL_PATTERN.test(label) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_VALUE_PATTERN.test(label)
    ) {
      throw new ContractError(`${context}: invalid missing required label`);
    }
  }
  if (
    summary.blocker_count !== summary.missing_required.length ||
    summary.production_go_allowed !== false
  ) {
    throw new ContractError(`${context}: summary mismatch`);
  }
  assertNoUnsafeAuditMaterial(summary, context);
}

export function createProductionGoPackageFixturePack() {
  const complete = createProductionGoPackageReadinessResult({
    goPackage: createProductionGoPackage({
      evidenceBundleStatus: "ready",
      ownerConfirmationStatus: "confirmed",
      emergencyStopStatus: "fresh",
      auditStatus: "ready",
      rollbackPlanStatus: "ready",
      blockerStatus: "none",
    }),
  });
  const ownerMissing = createProductionGoPackageReadinessResult({
    goPackage: createProductionGoPackage({
      evidenceBundleStatus: "ready",
      ownerConfirmationStatus: "pending",
      emergencyStopStatus: "fresh",
      auditStatus: "ready",
      rollbackPlanStatus: "ready",
      blockerStatus: "none",
    }),
  });
  const evidenceStale = createProductionGoPackageReadinessResult({
    goPackage: createProductionGoPackage({
      evidenceBundleStatus: "stale",
      ownerConfirmationStatus: "confirmed",
      emergencyStopStatus: "fresh",
      auditStatus: "ready",
      rollbackPlanStatus: "ready",
      blockerStatus: "none",
    }),
  });
  const emergencyMissing = createProductionGoPackageReadinessResult({
    goPackage: createProductionGoPackage({
      evidenceBundleStatus: "ready",
      ownerConfirmationStatus: "confirmed",
      emergencyStopStatus: "missing",
      auditStatus: "ready",
      rollbackPlanStatus: "ready",
      blockerStatus: "none",
    }),
  });
  const auditMissing = createProductionGoPackageReadinessResult({
    goPackage: createProductionGoPackage({
      evidenceBundleStatus: "ready",
      ownerConfirmationStatus: "confirmed",
      emergencyStopStatus: "fresh",
      auditStatus: "missing",
      rollbackPlanStatus: "ready",
      blockerStatus: "none",
    }),
  });
  const leakReject = capturesContractError(() =>
    assertProductionGoPackageSafe({
      ...createProductionGoPackage(),
      token: "x",
    })
  );
  const pack = {
    schema: "iris_production_go_package_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: 6,
    complete_fixture: createLiveHandoffFixtureResult(
      "complete",
      complete.package_status
    ),
    owner_missing_fixture: createLiveHandoffFixtureResult(
      "owner_missing",
      ownerMissing.package_status
    ),
    evidence_stale_fixture: createLiveHandoffFixtureResult(
      "evidence_stale",
      evidenceStale.package_status
    ),
    emergency_missing_fixture: createLiveHandoffFixtureResult(
      "emergency_missing",
      emergencyMissing.package_status
    ),
    audit_missing_fixture: createLiveHandoffFixtureResult(
      "audit_missing",
      auditMissing.package_status
    ),
    leak_reject_fixture: createLiveHandoffFixtureResult(
      "leak_reject",
      leakReject
    ),
  };
  assertProductionGoPackageFixturePackSafe(pack);
  return pack;
}

export function assertProductionGoPackageFixturePackSafe(
  pack,
  context = "production go package fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: fixture pack required`);
  }
  for (const field of Object.keys(pack)) {
    if (
      !PRODUCTION_GO_PACKAGE_FIXTURE_PACK_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe fixture field`, {
        field,
      });
    }
  }
  if (
    pack.schema !== "iris_production_go_package_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 6
  ) {
    throw new ContractError(`${context}: invalid fixture pack`);
  }
  for (const field of PRODUCTION_GO_PACKAGE_FIXTURE_PACK_FIELDS) {
    if (["schema", "pack_status", "fixture_count"].includes(field)) continue;
    assertLiveHandoffFixtureResultSafe(pack[field], context);
  }
  const expected = {
    complete_fixture: ["complete", "ready"],
    owner_missing_fixture: ["owner_missing", "blocked"],
    evidence_stale_fixture: ["evidence_stale", "blocked"],
    emergency_missing_fixture: ["emergency_missing", "blocked"],
    audit_missing_fixture: ["audit_missing", "blocked"],
    leak_reject_fixture: ["leak_reject", "contracterror"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
  assertNoUnsafeAuditMaterial(pack, context);
}

export function createPriority1BlockedPersistenceAfterK900({
  blockerId = "priority1_runtime_waiting",
  evidence,
  nowMs = Date.now(),
  freshnessThresholdMs = 30_000,
} = {}) {
  let evidenceStatus = "missing";
  let evidenceFreshness = "missing";
  let evidenceSourceType = "missing";
  if (evidence) {
    assertRealEvidenceIntakeSafe(evidence, "priority1 blocked persistence evidence");
    evidenceStatus = safePacketLabel(evidence.status);
    evidenceFreshness = classifyRealEvidenceFreshness({
      evidence,
      nowMs,
      componentThresholdsMs: {
        [evidence.component]: freshnessThresholdMs,
      },
    });
    evidenceSourceType = safePacketLabel(evidence.source_type);
  }
  const realFreshEvidence =
    evidenceFreshness === "fresh" &&
    ["real_probe", "operator_confirmed", "manual_upload", "audit_link"].includes(
      evidenceSourceType
    );
  const state = {
    schema: "iris_priority1_blocked_persistence_after_k900_v1",
    blocker_id: safePacketLabel(blockerId),
    status: realFreshEvidence ? "resolution_candidate" : "BLOCKED",
    evidence_status: evidenceStatus,
    evidence_freshness: evidenceFreshness,
    evidence_source_type: evidenceSourceType,
    persisted_after_k900: !realFreshEvidence,
    blocker_label: realFreshEvidence ? "fresh_real_evidence_candidate" : "priority1_runtime_waiting",
  };
  assertPriority1BlockedPersistenceAfterK900Safe(state);
  return state;
}

export function assertPriority1BlockedPersistenceAfterK900Safe(
  state,
  context = "priority1 blocked persistence after K900"
) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new ContractError(`${context}: state required`);
  }
  for (const field of Object.keys(state)) {
    if (
      !PRIORITY1_BLOCKED_PERSISTENCE_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe state field`, {
        field,
      });
    }
  }
  if (
    state.schema !== "iris_priority1_blocked_persistence_after_k900_v1" ||
    !SAFE_LABEL_PATTERN.test(state.blocker_id) ||
    !["BLOCKED", "resolution_candidate"].includes(state.status) ||
    !SAFE_LABEL_PATTERN.test(state.evidence_status) ||
    !["fresh", "stale", "runtime_waiting", "attention", "missing"].includes(
      state.evidence_freshness
    ) ||
    !SAFE_LABEL_PATTERN.test(state.evidence_source_type) ||
    typeof state.persisted_after_k900 !== "boolean" ||
    !["priority1_runtime_waiting", "fresh_real_evidence_candidate"].includes(
      state.blocker_label
    )
  ) {
    throw new ContractError(`${context}: invalid state`);
  }
  const realFreshEvidence =
    state.evidence_freshness === "fresh" &&
    ["real_probe", "operator_confirmed", "manual_upload", "audit_link"].includes(
      state.evidence_source_type
    );
  if (
    state.status !== (realFreshEvidence ? "resolution_candidate" : "BLOCKED") ||
    state.persisted_after_k900 !== !realFreshEvidence ||
    state.blocker_label !==
      (realFreshEvidence
        ? "fresh_real_evidence_candidate"
        : "priority1_runtime_waiting")
  ) {
    throw new ContractError(`${context}: persistence mismatch`);
  }
  assertNoUnsafeAuditMaterial(state, context);
}

export function createPriority1FalseResolutionRegression({
  fixtureLabel = "owner_missing",
  requestedResolutionStatus = "resolved",
  ownerStatus = "missing",
  evidenceSourceType = "real_probe",
  evidenceFreshness = "fresh",
} = {}) {
  const requested = safeBlockerResolutionStatus(requestedResolutionStatus);
  const owner = safePacketLabel(ownerStatus);
  const source = safePacketLabel(evidenceSourceType);
  const freshness = safeOwnerHandoffEvidenceFreshness(evidenceFreshness);
  const realSource = ["real_probe", "operator_confirmed", "manual_upload", "audit_link"].includes(
    source
  );
  const validResolution =
    requested === "resolved" &&
    owner === "confirmed" &&
    realSource &&
    freshness === "fresh";
  const gate = {
    schema: "iris_priority1_false_resolution_regression_v1",
    fixture_label: safePacketLabel(fixtureLabel),
    requested_resolution_status: requested,
    owner_status: owner,
    evidence_source_type: source,
    evidence_freshness: freshness,
    regression_status: validResolution ? "candidate_allowed" : "fail_detected",
    blocker_label: validResolution ? "none" : "priority1_false_resolution",
  };
  assertPriority1FalseResolutionRegressionSafe(gate);
  return gate;
}

export function assertPriority1FalseResolutionRegressionSafe(
  gate,
  context = "priority1 false resolution regression"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !PRIORITY1_FALSE_RESOLUTION_REGRESSION_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_priority1_false_resolution_regression_v1" ||
    !SAFE_LABEL_PATTERN.test(gate.fixture_label) ||
    !["open", "resolved", "attention", "blocked"].includes(
      gate.requested_resolution_status
    ) ||
    !SAFE_LABEL_PATTERN.test(gate.owner_status) ||
    !SAFE_LABEL_PATTERN.test(gate.evidence_source_type) ||
    !["fresh", "stale", "runtime_waiting", "attention", "missing"].includes(
      gate.evidence_freshness
    ) ||
    !["fail_detected", "candidate_allowed"].includes(gate.regression_status) ||
    !["priority1_false_resolution", "none"].includes(gate.blocker_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const realSource = ["real_probe", "operator_confirmed", "manual_upload", "audit_link"].includes(
    gate.evidence_source_type
  );
  const validResolution =
    gate.requested_resolution_status === "resolved" &&
    gate.owner_status === "confirmed" &&
    realSource &&
    gate.evidence_freshness === "fresh";
  if (
    gate.regression_status !==
      (validResolution ? "candidate_allowed" : "fail_detected") ||
    gate.blocker_label !== (validResolution ? "none" : "priority1_false_resolution")
  ) {
    throw new ContractError(`${context}: regression mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createPriority1FalseResolutionRegressionPack() {
  const pack = {
    schema: "iris_priority1_false_resolution_regression_pack_v1",
    pack_status: "pass",
    fixture_count: 3,
    owner_missing_fixture: createPriority1FalseResolutionRegression({
      fixtureLabel: "owner_missing",
      ownerStatus: "missing",
      evidenceSourceType: "real_probe",
      evidenceFreshness: "fresh",
    }),
    fixture_evidence_fixture: createPriority1FalseResolutionRegression({
      fixtureLabel: "fixture_evidence",
      ownerStatus: "confirmed",
      evidenceSourceType: "fixture",
      evidenceFreshness: "fresh",
    }),
    stale_evidence_fixture: createPriority1FalseResolutionRegression({
      fixtureLabel: "stale_evidence",
      ownerStatus: "confirmed",
      evidenceSourceType: "real_probe",
      evidenceFreshness: "stale",
    }),
  };
  assertPriority1FalseResolutionRegressionPackSafe(pack);
  return pack;
}

export function assertPriority1FalseResolutionRegressionPackSafe(
  pack,
  context = "priority1 false resolution regression pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  for (const field of Object.keys(pack)) {
    if (
      !PRIORITY1_FALSE_RESOLUTION_REGRESSION_PACK_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe pack field`, {
        field,
      });
    }
  }
  if (
    pack.schema !== "iris_priority1_false_resolution_regression_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 3
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const expected = [
    ["owner_missing_fixture", "owner_missing"],
    ["fixture_evidence_fixture", "fixture_evidence"],
    ["stale_evidence_fixture", "stale_evidence"],
  ];
  for (const [field, label] of expected) {
    assertPriority1FalseResolutionRegressionSafe(pack[field], context);
    if (
      pack[field].fixture_label !== label ||
      pack[field].regression_status !== "fail_detected" ||
      pack[field].blocker_label !== "priority1_false_resolution"
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
  assertNoUnsafeAuditMaterial(pack, context);
}

export function createPriority1RealEvidenceResolutionDryRun({
  evidenceSourceType = "real_probe",
  evidenceFreshness = "fresh",
  ownerStatus = "confirmed",
  dryRun = true,
} = {}) {
  const source = safePacketLabel(evidenceSourceType);
  const freshness = safeOwnerHandoffEvidenceFreshness(evidenceFreshness);
  const owner = safePacketLabel(ownerStatus);
  const realFreshCandidate =
    ["real_probe", "operator_confirmed", "manual_upload", "audit_link"].includes(
      source
    ) &&
    freshness === "fresh" &&
    owner === "confirmed";
  const gate = {
    schema: "iris_priority1_real_evidence_resolution_dry_run_v1",
    dry_run: dryRun === true,
    evidence_source_type: source,
    evidence_freshness: freshness,
    owner_status: owner,
    resolution_status:
      dryRun === true && realFreshCandidate ? "resolution_candidate" : "BLOCKED",
    real_go: false,
    blocker_label:
      dryRun === true && realFreshCandidate
        ? "dry_run_not_real_go"
        : "priority1_runtime_waiting",
  };
  assertPriority1RealEvidenceResolutionDryRunSafe(gate);
  return gate;
}

export function assertPriority1RealEvidenceResolutionDryRunSafe(
  gate,
  context = "priority1 real evidence resolution dry-run"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !PRIORITY1_REAL_EVIDENCE_DRY_RUN_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_priority1_real_evidence_resolution_dry_run_v1" ||
    typeof gate.dry_run !== "boolean" ||
    !SAFE_LABEL_PATTERN.test(gate.evidence_source_type) ||
    !["fresh", "stale", "runtime_waiting", "attention", "missing"].includes(
      gate.evidence_freshness
    ) ||
    !SAFE_LABEL_PATTERN.test(gate.owner_status) ||
    !["resolution_candidate", "BLOCKED"].includes(gate.resolution_status) ||
    gate.real_go !== false ||
    !["dry_run_not_real_go", "priority1_runtime_waiting"].includes(
      gate.blocker_label
    )
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const realFreshCandidate =
    ["real_probe", "operator_confirmed", "manual_upload", "audit_link"].includes(
      gate.evidence_source_type
    ) &&
    gate.evidence_freshness === "fresh" &&
    gate.owner_status === "confirmed";
  const candidate = gate.dry_run === true && realFreshCandidate;
  if (
    gate.resolution_status !== (candidate ? "resolution_candidate" : "BLOCKED") ||
    gate.blocker_label !==
      (candidate ? "dry_run_not_real_go" : "priority1_runtime_waiting")
  ) {
    throw new ContractError(`${context}: dry-run mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createPriority1OwnerConfirmedCandidate({
  ownerStatus = "confirmed",
  evidenceFreshness = "fresh",
  fixtureMode = true,
} = {}) {
  const owner = safePacketLabel(ownerStatus);
  const freshness = safeOwnerHandoffEvidenceFreshness(evidenceFreshness);
  const candidate = fixtureMode === true && owner === "confirmed" && freshness === "fresh";
  const gate = {
    schema: "iris_priority1_owner_confirmed_candidate_v1",
    fixture_mode: fixtureMode === true,
    owner_status: owner,
    evidence_freshness: freshness,
    resolution_status: candidate ? "resolution_candidate" : "BLOCKED",
    real_go: false,
    blocker_label: candidate
      ? "fixture_candidate_not_real_go"
      : "priority1_runtime_waiting",
  };
  assertPriority1OwnerConfirmedCandidateSafe(gate);
  return gate;
}

export function assertPriority1OwnerConfirmedCandidateSafe(
  gate,
  context = "priority1 owner-confirmed candidate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  for (const field of Object.keys(gate)) {
    if (
      !PRIORITY1_OWNER_CONFIRMED_CANDIDATE_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe gate field`, {
        field,
      });
    }
  }
  if (
    gate.schema !== "iris_priority1_owner_confirmed_candidate_v1" ||
    typeof gate.fixture_mode !== "boolean" ||
    !SAFE_LABEL_PATTERN.test(gate.owner_status) ||
    !["fresh", "stale", "runtime_waiting", "attention", "missing"].includes(
      gate.evidence_freshness
    ) ||
    !["resolution_candidate", "BLOCKED"].includes(gate.resolution_status) ||
    gate.real_go !== false ||
    !["fixture_candidate_not_real_go", "priority1_runtime_waiting"].includes(
      gate.blocker_label
    )
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const candidate =
    gate.fixture_mode === true &&
    gate.owner_status === "confirmed" &&
    gate.evidence_freshness === "fresh";
  if (
    gate.resolution_status !== (candidate ? "resolution_candidate" : "BLOCKED") ||
    gate.blocker_label !==
      (candidate ? "fixture_candidate_not_real_go" : "priority1_runtime_waiting")
  ) {
    throw new ContractError(`${context}: candidate mismatch`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
}

export function createPriority1CompletionSummary({
  unresolvedCount = 1,
  resolutionCandidateCount = 0,
  missingEvidenceCount = 1,
} = {}) {
  const unresolved = normalizeNonNegativeInteger(unresolvedCount);
  const candidates = normalizeNonNegativeInteger(resolutionCandidateCount);
  const missing = normalizeNonNegativeInteger(missingEvidenceCount);
  const summary = {
    schema: "iris_priority1_completion_summary_v1",
    summary_line: `priority1_unresolved:${unresolved}/resolution_candidate:${candidates}/missing_evidence:${missing}`,
    unresolved_count: unresolved,
    resolution_candidate_count: candidates,
    missing_evidence_count: missing,
  };
  assertPriority1CompletionSummarySafe(summary);
  return summary;
}

export function assertPriority1CompletionSummarySafe(
  summary,
  context = "priority1 completion summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !PRIORITY1_COMPLETION_SUMMARY_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe summary field`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_priority1_completion_summary_v1" ||
    !Number.isInteger(summary.unresolved_count) ||
    summary.unresolved_count < 0 ||
    !Number.isInteger(summary.resolution_candidate_count) ||
    summary.resolution_candidate_count < 0 ||
    !Number.isInteger(summary.missing_evidence_count) ||
    summary.missing_evidence_count < 0
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  const expected = `priority1_unresolved:${summary.unresolved_count}/resolution_candidate:${summary.resolution_candidate_count}/missing_evidence:${summary.missing_evidence_count}`;
  if (summary.summary_line !== expected || /\r|\n/u.test(summary.summary_line)) {
    throw new ContractError(`${context}: summary line mismatch`);
  }
  assertNoUnsafeAuditMaterial(summary, context);
}

export function createLiveHandoffFinalSafetySweep({
  readinessSweetening = false,
  fixtureToRealPromotion = false,
  ownerAutoConfirmation = false,
} = {}) {
  const blockers = [
    readinessSweetening === true,
    fixtureToRealPromotion === true,
    ownerAutoConfirmation === true,
  ].filter(Boolean).length;
  const sweep = {
    schema: "iris_live_handoff_final_safety_sweep_v1",
    sweep_status: blockers === 0 ? "pass" : "fail",
    readiness_sweetening_status:
      readinessSweetening === true ? "detected" : "not_detected",
    fixture_to_real_promotion_status:
      fixtureToRealPromotion === true ? "detected" : "not_detected",
    owner_auto_confirmation_status:
      ownerAutoConfirmation === true ? "detected" : "not_detected",
    blocker_count: blockers,
  };
  assertLiveHandoffFinalSafetySweepSafe(sweep);
  return sweep;
}

export function assertLiveHandoffFinalSafetySweepSafe(
  sweep,
  context = "live handoff final safety sweep"
) {
  if (!sweep || typeof sweep !== "object" || Array.isArray(sweep)) {
    throw new ContractError(`${context}: sweep required`);
  }
  for (const field of Object.keys(sweep)) {
    if (
      !LIVE_HANDOFF_FINAL_SAFETY_SWEEP_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe sweep field`, {
        field,
      });
    }
  }
  if (
    sweep.schema !== "iris_live_handoff_final_safety_sweep_v1" ||
    !["pass", "fail"].includes(sweep.sweep_status) ||
    !["detected", "not_detected"].includes(sweep.readiness_sweetening_status) ||
    !["detected", "not_detected"].includes(
      sweep.fixture_to_real_promotion_status
    ) ||
    !["detected", "not_detected"].includes(
      sweep.owner_auto_confirmation_status
    ) ||
    !Number.isInteger(sweep.blocker_count) ||
    sweep.blocker_count < 0
  ) {
    throw new ContractError(`${context}: invalid sweep`);
  }
  const blockers = [
    sweep.readiness_sweetening_status === "detected",
    sweep.fixture_to_real_promotion_status === "detected",
    sweep.owner_auto_confirmation_status === "detected",
  ].filter(Boolean).length;
  if (
    sweep.blocker_count !== blockers ||
    sweep.sweep_status !== (blockers === 0 ? "pass" : "fail")
  ) {
    throw new ContractError(`${context}: sweep mismatch`);
  }
  assertNoUnsafeAuditMaterial(sweep, context);
}

export function createLiveHandoffFinalRedactionSweep({ exports = [] } = {}) {
  const safeExports = Array.isArray(exports) ? exports : [];
  const blockedLabels = [];
  safeExports.forEach((item, index) => {
    try {
      assertNoUnsafeAuditMaterial(item, "live handoff final redaction sweep item");
    } catch (error) {
      if (error instanceof ContractError) {
        blockedLabels.push(`export_${index}`);
        return;
      }
      throw error;
    }
  });
  const sweep = {
    schema: "iris_live_handoff_final_redaction_sweep_v1",
    sweep_status: blockedLabels.length === 0 ? "pass" : "fail",
    checked_export_count: safeExports.length,
    leak_count: blockedLabels.length,
    blocked_labels: blockedLabels,
  };
  assertLiveHandoffFinalRedactionSweepSafe(sweep);
  return sweep;
}

export function assertLiveHandoffFinalRedactionSweepSafe(
  sweep,
  context = "live handoff final redaction sweep"
) {
  if (!sweep || typeof sweep !== "object" || Array.isArray(sweep)) {
    throw new ContractError(`${context}: sweep required`);
  }
  for (const field of Object.keys(sweep)) {
    if (
      !LIVE_HANDOFF_FINAL_REDACTION_SWEEP_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe sweep field`, {
        field,
      });
    }
  }
  if (
    sweep.schema !== "iris_live_handoff_final_redaction_sweep_v1" ||
    !["pass", "fail"].includes(sweep.sweep_status) ||
    !Number.isInteger(sweep.checked_export_count) ||
    sweep.checked_export_count < 0 ||
    !Number.isInteger(sweep.leak_count) ||
    sweep.leak_count < 0 ||
    !Array.isArray(sweep.blocked_labels) ||
    sweep.leak_count !== sweep.blocked_labels.length
  ) {
    throw new ContractError(`${context}: invalid sweep`);
  }
  for (const label of sweep.blocked_labels) {
    if (
      !SAFE_LABEL_PATTERN.test(label) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_VALUE_PATTERN.test(label)
    ) {
      throw new ContractError(`${context}: invalid blocked label`);
    }
  }
  if (sweep.sweep_status !== (sweep.leak_count === 0 ? "pass" : "fail")) {
    throw new ContractError(`${context}: sweep mismatch`);
  }
  assertNoUnsafeAuditMaterial(sweep, context);
}

function assertLiveBlockerResolutionComponentStatusSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: component status required`);
  }
  for (const field of Object.keys(item)) {
    if (
      !LIVE_BLOCKER_RESOLUTION_COMPONENT_STATUS_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe component field`, {
        field,
      });
    }
  }
  if (
    item.schema !== "iris_live_blocker_resolution_component_status_v1" ||
    !SAFE_LABEL_PATTERN.test(item.component) ||
    !["resolved", "unresolved"].includes(item.status)
  ) {
    throw new ContractError(`${context}: invalid component status`);
  }
}

function assertProductionOwnerHandoffReviewSectionSafe(section, context) {
  assertProductionOwnerHandoffReviewItemSafe(
    section,
    PRODUCTION_OWNER_HANDOFF_REVIEW_SECTION_FIELDS,
    "iris_production_owner_handoff_review_section_v1",
    ["section", "status"],
    context
  );
}

function assertProductionOwnerHandoffReviewBlockerSafe(blocker, context) {
  assertProductionOwnerHandoffReviewItemSafe(
    blocker,
    PRODUCTION_OWNER_HANDOFF_REVIEW_BLOCKER_FIELDS,
    "iris_production_owner_handoff_review_blocker_v1",
    ["blocker_label", "status"],
    context
  );
}

function assertProductionOwnerHandoffReviewConfirmationSafe(
  confirmation,
  context
) {
  assertProductionOwnerHandoffReviewItemSafe(
    confirmation,
    PRODUCTION_OWNER_HANDOFF_REVIEW_CONFIRMATION_FIELDS,
    "iris_production_owner_handoff_review_confirmation_v1",
    ["scope", "status"],
    context
  );
}

function assertProductionOwnerHandoffReviewEvidenceFreshnessSafe(
  evidence,
  context
) {
  assertProductionOwnerHandoffReviewItemSafe(
    evidence,
    PRODUCTION_OWNER_HANDOFF_REVIEW_EVIDENCE_FIELDS,
    "iris_production_owner_handoff_review_evidence_freshness_v1",
    ["component", "freshness"],
    context
  );
  if (
    !["fresh", "stale", "runtime_waiting", "attention", "missing"].includes(
      evidence.freshness
    )
  ) {
    throw new ContractError(`${context}: invalid evidence freshness`);
  }
}

function assertProductionOwnerHandoffReviewItemSafe(
  item,
  allowedFields,
  expectedSchema,
  labelFields,
  context
) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: review item required`);
  }
  for (const field of Object.keys(item)) {
    if (
      !allowedFields.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe review item field`, {
        field,
      });
    }
  }
  if (item.schema !== expectedSchema) {
    throw new ContractError(`${context}: invalid review item schema`);
  }
  for (const field of labelFields) {
    if (!SAFE_LABEL_PATTERN.test(item[field])) {
      throw new ContractError(`${context}: invalid review item label`, { field });
    }
  }
  assertNoUnsafeAuditMaterial(item, context);
}

function createProductionGoPackageItem(label, status) {
  return {
    schema: "iris_production_go_package_item_v1",
    status: safePacketLabel(status),
    label: safePacketLabel(label),
  };
}

function createProductionEvidenceSafeProvenanceReference({
  evidence,
  nowMs,
  componentThresholdsMs,
  safeNextActionLabel,
}) {
  assertRealEvidenceIntakeSafe(evidence, "production evidence safe reference");
  const reference = {
    schema: "iris_production_evidence_safe_provenance_reference_v1",
    component_label: evidence.component,
    status: evidence.status,
    freshness: classifyRealEvidenceFreshness({
      evidence,
      nowMs,
      componentThresholdsMs,
    }),
    source_type: evidence.source_type,
    collector_role: evidence.collector,
    status_hash: evidence.status_hash,
    audit_reference: evidence.audit_reference,
    evidence_timestamp_ms: evidence.evidence_timestamp_ms,
    safe_next_action_label: safePacketLabel(safeNextActionLabel),
  };
  assertProductionEvidenceSafeProvenanceReferenceSafe(reference);
  return reference;
}

function assertProductionEvidenceSafeProvenanceReferenceSafe(
  reference,
  context = "production evidence safe provenance reference"
) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
    throw new ContractError(`${context}: reference required`);
  }
  for (const field of Object.keys(reference)) {
    if (
      !PRODUCTION_EVIDENCE_SAFE_PROVENANCE_REFERENCE_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe reference field`, {
        field,
      });
    }
  }
  if (
    reference.schema !==
      "iris_production_evidence_safe_provenance_reference_v1" ||
    !SAFE_LABEL_PATTERN.test(reference.component_label) ||
    !SAFE_LABEL_PATTERN.test(reference.status) ||
    !["fresh", "stale", "runtime_waiting", "attention"].includes(
      reference.freshness
    ) ||
    !SAFE_LABEL_PATTERN.test(reference.source_type) ||
    !SAFE_LABEL_PATTERN.test(reference.collector_role) ||
    !/^[a-f0-9]{16}$/u.test(reference.status_hash) ||
    !SAFE_LABEL_PATTERN.test(reference.audit_reference) ||
    !Number.isInteger(reference.evidence_timestamp_ms) ||
    reference.evidence_timestamp_ms < 0 ||
    !SAFE_LABEL_PATTERN.test(reference.safe_next_action_label)
  ) {
    throw new ContractError(`${context}: invalid reference`);
  }
  assertNoUnsafeAuditMaterial(reference, context);
}

function assertProductionEvidenceSafeProvenanceHandoffReferenceSafe(
  reference,
  context = "production evidence safe provenance handoff reference"
) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
    throw new ContractError(`${context}: reference required`);
  }
  for (const field of Object.keys(reference)) {
    if (
      !PRODUCTION_EVIDENCE_SAFE_PROVENANCE_HANDOFF_REFERENCE_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe reference field`, {
        field,
      });
    }
  }
  if (
    reference.schema !==
      "iris_production_evidence_safe_provenance_handoff_reference_v1" ||
    !["collected", "BLOCKED"].includes(reference.bundle_status) ||
    typeof reference.handoff_ready !== "boolean" ||
    !Number.isInteger(reference.blocker_count) ||
    reference.blocker_count < 0 ||
    !Array.isArray(reference.missing_required) ||
    !SAFE_LABEL_PATTERN.test(reference.safe_next_action_label)
  ) {
    throw new ContractError(`${context}: invalid reference`);
  }
  for (const label of reference.missing_required) {
    if (
      !SAFE_LABEL_PATTERN.test(label) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_VALUE_PATTERN.test(label)
    ) {
      throw new ContractError(`${context}: invalid missing required label`);
    }
  }
  if (
    reference.blocker_count !== reference.missing_required.length ||
    reference.handoff_ready !== (reference.missing_required.length === 0)
  ) {
    throw new ContractError(`${context}: handoff reference mismatch`);
  }
  assertNoUnsafeAuditMaterial(reference, context);
}

function assertProductionEvidenceSafeProvenanceGoPackageReferenceSafe(
  reference,
  context = "production evidence safe provenance go package reference"
) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
    throw new ContractError(`${context}: reference required`);
  }
  for (const field of Object.keys(reference)) {
    if (
      !PRODUCTION_EVIDENCE_SAFE_PROVENANCE_GO_PACKAGE_REFERENCE_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe reference field`, {
        field,
      });
    }
  }
  if (
    reference.schema !==
      "iris_production_evidence_safe_provenance_go_package_reference_v1" ||
    !["ready", "blocked"].includes(reference.package_status) ||
    reference.production_go_allowed !== false ||
    typeof reference.degraded_mode_available !== "boolean" ||
    !["blocked", "no_go"].includes(reference.final_classifier_status) ||
    !Number.isInteger(reference.blocker_count) ||
    reference.blocker_count < 0 ||
    !Array.isArray(reference.missing_required) ||
    !SAFE_LABEL_PATTERN.test(reference.safe_next_action_label)
  ) {
    throw new ContractError(`${context}: invalid reference`);
  }
  for (const label of reference.missing_required) {
    if (
      !SAFE_LABEL_PATTERN.test(label) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_VALUE_PATTERN.test(label)
    ) {
      throw new ContractError(`${context}: invalid missing required label`);
    }
  }
  if (
    reference.blocker_count !== reference.missing_required.length ||
    reference.final_classifier_status !==
      (reference.package_status === "ready" ? "no_go" : "blocked")
  ) {
    throw new ContractError(`${context}: go package reference mismatch`);
  }
  assertNoUnsafeAuditMaterial(reference, context);
}

function assertProductionGoPackageItemSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: package item required`);
  }
  for (const field of Object.keys(item)) {
    if (
      !PRODUCTION_GO_PACKAGE_ITEM_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe package item field`, {
        field,
      });
    }
  }
  if (
    item.schema !== "iris_production_go_package_item_v1" ||
    !SAFE_LABEL_PATTERN.test(item.status) ||
    !SAFE_LABEL_PATTERN.test(item.label)
  ) {
    throw new ContractError(`${context}: invalid package item`);
  }
  assertNoUnsafeAuditMaterial(item, context);
}

function assertLiveRunbookPublicStepSafe(step, context) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: public step required`);
  }
  for (const field of Object.keys(step)) {
    if (
      !LIVE_RUNBOOK_PUBLIC_STEP_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe public step field`, {
        field,
      });
    }
  }
  if (
    step.schema !== "iris_live_runbook_public_step_v1" ||
    !SAFE_LABEL_PATTERN.test(step.step_label) ||
    !SAFE_LABEL_PATTERN.test(step.step_status)
  ) {
    throw new ContractError(`${context}: invalid public step`);
  }
}

function createLiveRunbookFinalHandoffStep(
  { order, stepLabel = "review_handoff_step", stepStatus = "pending" } = {},
  index = 0
) {
  const safeOrder = normalizeCount(order ?? index + 1);
  return {
    schema: "iris_live_runbook_final_handoff_step_v1",
    order: safeOrder,
    step_label: safePacketLabel(stepLabel),
    step_status: safePacketLabel(stepStatus),
  };
}

function assertLiveRunbookFinalHandoffStepSafe(
  step,
  context = "live runbook final handoff step"
) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: step required`);
  }
  for (const field of Object.keys(step)) {
    if (
      !LIVE_RUNBOOK_FINAL_HANDOFF_STEP_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe step field`, {
        field,
      });
    }
  }
  if (
    step.schema !== "iris_live_runbook_final_handoff_step_v1" ||
    !Number.isInteger(step.order) ||
    step.order <= 0 ||
    !SAFE_LABEL_PATTERN.test(step.step_label) ||
    !SAFE_LABEL_PATTERN.test(step.step_status)
  ) {
    throw new ContractError(`${context}: invalid step`);
  }
}

function assertLiveHandoffOperatorPacketSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !LIVE_HANDOFF_OPERATOR_PACKET_SUMMARY_FIELDS.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe summary field`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_live_handoff_operator_packet_summary_v1" ||
    !SAFE_LABEL_PATTERN.test(summary.handoff_status) ||
    !Number.isInteger(summary.checklist_count) ||
    summary.checklist_count < 0 ||
    !Number.isInteger(summary.blocker_count) ||
    summary.blocker_count < 0 ||
    !Number.isInteger(summary.required_confirmation_count) ||
    summary.required_confirmation_count < 0 ||
    summary.real_process_started !== false ||
    summary.obs_changed !== false ||
    summary.db_connected !== false ||
    summary.game_input_sent !== false
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
}

function assertLiveHandoffOperatorPacketChecklistItemSafe(item, context) {
  assertLiveHandoffOperatorPacketSectionItemSafe(
    item,
    LIVE_HANDOFF_OPERATOR_PACKET_CHECKLIST_FIELDS,
    "iris_live_handoff_operator_packet_checklist_item_v1",
    context
  );
}

function assertLiveHandoffOperatorPacketBlockerSafe(item, context) {
  assertLiveHandoffOperatorPacketSectionItemSafe(
    item,
    LIVE_HANDOFF_OPERATOR_PACKET_BLOCKER_FIELDS,
    "iris_live_handoff_operator_packet_blocker_v1",
    context
  );
}

function assertLiveHandoffOperatorPacketConfirmationSafe(item, context) {
  assertLiveHandoffOperatorPacketSectionItemSafe(
    item,
    LIVE_HANDOFF_OPERATOR_PACKET_CONFIRMATION_FIELDS,
    "iris_live_handoff_operator_packet_required_confirmation_v1",
    context
  );
}

function assertLiveHandoffOperatorPacketSectionItemSafe(
  item,
  allowedFields,
  schema,
  context
) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: section item required`);
  }
  for (const field of Object.keys(item)) {
    if (
      !allowedFields.has(field) ||
      LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe section field`, {
        field,
      });
    }
  }
  if (item.schema !== schema) {
    throw new ContractError(`${context}: invalid section item`);
  }
  for (const [field, value] of Object.entries(item)) {
    if (field === "schema") continue;
    if (!SAFE_LABEL_PATTERN.test(value)) {
      throw new ContractError(`${context}: invalid section label`, { field });
    }
  }
}

function assertLiveHandoffBundleBlockerSummarySafe(
  summary,
  context = "live handoff bundle blocker summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !LIVE_HANDOFF_BUNDLE_BLOCKER_SUMMARY_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected or unsafe summary field`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_live_handoff_bundle_blocker_summary_v1" ||
    !["clear", "BLOCKED"].includes(summary.blocker_status) ||
    !Number.isInteger(summary.blocker_count) ||
    summary.blocker_count < 0 ||
    !Array.isArray(summary.blocker_labels) ||
    summary.blocker_count !== summary.blocker_labels.length
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  for (const label of summary.blocker_labels) {
    if (!SAFE_LABEL_PATTERN.test(label)) {
      throw new ContractError(`${context}: invalid blocker label`);
    }
  }
  if (
    summary.blocker_status !==
    (summary.blocker_count === 0 ? "clear" : "BLOCKED")
  ) {
    throw new ContractError(`${context}: blocker summary mismatch`);
  }
  assertNoUnsafeAuditMaterial(summary, context);
}

export function createLiveHandoffPlan({
  component = "bridge",
  order = 1,
  requiredEvidence = "fresh_evidence_required",
  ownerConfirmation,
  blocker = "none",
  status = "BLOCKED",
} = {}) {
  const confirmation =
    ownerConfirmation ??
    createOwnerConfirmationEnvelope({ confirmationStatus: "required" });
  assertOwnerConfirmationSafe(confirmation, "live handoff plan owner confirmation");
  const plan = {
    schema: "iris_live_handoff_plan_v1",
    component: safeLabel(component),
    order: normalizePositiveInteger(order, 1),
    required_evidence: safeLabel(requiredEvidence),
    owner_confirmation: confirmation.confirmation_status,
    blocker: safeLabel(blocker),
    status: safeLiveHandoffStatus(status, confirmation.confirmation_status, blocker),
    real_operation_performed: false,
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_PLAN_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertLiveHandoffPlanSafe(plan);
  return plan;
}

export function createLiveHandoffSequenceManifest({ plans = [] } = {}) {
  const steps = (Array.isArray(plans) ? plans : []).map((plan) => {
    assertLiveHandoffPlanSafe(plan, "live handoff sequence source plan");
    return {
      schema: "iris_live_handoff_sequence_step_v1",
      component: plan.component,
      order: plan.order,
      status: plan.status,
    };
  });
  const manifest = {
    schema: "iris_live_handoff_sequence_manifest_v1",
    manifest_status: isLiveHandoffSequenceValid(steps) ? "valid" : "rejected",
    step_count: steps.length,
    steps,
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_SEQUENCE_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertLiveHandoffSequenceManifestSafe(manifest);
  return manifest;
}

export function createLiveHandoffSafeNextAction({
  safeScriptName = "dev_live_handoff_check",
  operatorLabel = "operator_review_required",
} = {}) {
  const action = {
    schema: "iris_live_handoff_safe_next_action_v1",
    safe_script_name: safeLabel(safeScriptName),
    operator_label: safeLabel(operatorLabel),
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_SAFE_NEXT_ACTION_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertLiveHandoffSafeNextActionSafe(action);
  return action;
}

export function createLiveHandoffEmergencyStopGate({
  emergencyStopEvidence,
} = {}) {
  assertFreshEvidenceEnvelopeSafe(
    emergencyStopEvidence,
    "live handoff emergency stop evidence"
  );
  const fresh = emergencyStopEvidence.freshness === "fresh";
  const gate = {
    schema: "iris_live_handoff_emergency_stop_gate_v1",
    gate_status: fresh ? "ready" : "BLOCKED",
    emergency_stop_freshness: emergencyStopEvidence.freshness,
    progress_allowed: fresh,
    blocker: fresh ? "none" : "emergency_stop_fresh_evidence_required",
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_EMERGENCY_STOP_GATE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertLiveHandoffEmergencyStopGateSafe(gate);
  return gate;
}

export function createLiveHandoffAuditReadinessGate({
  auditStatus = "missing",
} = {}) {
  const safeStatus = safeAuditReadinessStatus(auditStatus);
  const ready = safeStatus === "ready";
  const gate = {
    schema: "iris_live_handoff_audit_readiness_gate_v1",
    gate_status: ready ? "ready" : "BLOCKED",
    audit_status: safeStatus,
    progress_allowed: ready,
    blocker: ready ? "none" : "audit_trail_ready_required",
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_AUDIT_READINESS_GATE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertLiveHandoffAuditReadinessGateSafe(gate);
  return gate;
}

export function createLiveHandoffDryRunResult({
  safeStatus = "blocked",
} = {}) {
  const result = {
    schema: "iris_live_handoff_dry_run_result_v1",
    dry_run_status: "simulated",
    safe_status: safeDryRunStatus(safeStatus),
    real_connection_succeeded: false,
    execution_performed: false,
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_DRY_RUN_RESULT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertLiveHandoffDryRunResultSafe(result);
  return result;
}

export function createLiveHandoffFixturePack({ nowMs = 10_000 } = {}) {
  const ownerMissing = createLiveHandoffPlan({
    component: "bridge",
    order: 1,
    ownerConfirmation: createOwnerConfirmationEnvelope({
      confirmationStatus: "pending",
      confirmationTimestampMs: nowMs,
    }),
    status: "ready",
  });
  const emergencyMissing = createLiveHandoffEmergencyStopGate({
    emergencyStopEvidence: createFreshEvidenceEnvelope({
      component: "emergency_stop",
      status: "BLOCKED",
      evidenceTimestampMs: nowMs - 60_000,
      evidenceSource: "real_probe",
      freshness: "stale",
      nowMs,
    }),
  });
  const auditMissing = createLiveHandoffAuditReadinessGate({
    auditStatus: "missing",
  });
  const orderedPlans = LIVE_HANDOFF_SEQUENCE.map((component, index) =>
    createLiveHandoffPlan({
      component,
      order: index + 1,
      ownerConfirmation: createOwnerConfirmationEnvelope({
        confirmationStatus: "confirmed",
        confirmationTimestampMs: nowMs,
      }),
      status: "ready",
    })
  );
  const outOfOrder = createLiveHandoffSequenceManifest({
    plans: [orderedPlans[1], orderedPlans[0], ...orderedPlans.slice(2)],
  });
  const unsafeHandoffStatus = capturesContractError(() =>
    assertLiveHandoffPlanSafe({
      ...orderedPlans[0],
      raw_command: "start",
    })
  );
  const pack = {
    schema: "iris_live_handoff_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: 5,
    owner_missing_fixture: createLiveHandoffFixtureResult(
      "owner_missing",
      ownerMissing.status
    ),
    emergency_missing_fixture: createLiveHandoffFixtureResult(
      "emergency_missing",
      emergencyMissing.gate_status
    ),
    audit_missing_fixture: createLiveHandoffFixtureResult(
      "audit_missing",
      auditMissing.gate_status
    ),
    out_of_order_fixture: createLiveHandoffFixtureResult(
      "out_of_order",
      outOfOrder.manifest_status
    ),
    unsafe_handoff_fixture: createLiveHandoffFixtureResult(
      "unsafe_handoff",
      unsafeHandoffStatus
    ),
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertLiveHandoffFixturePackSafe(pack);
  return pack;
}

export function createOwnerConfirmationFreshnessGuard({
  ownerConfirmation,
  nowMs = Date.now(),
  freshWindowMs = 300_000,
} = {}) {
  assertOwnerConfirmationSafe(ownerConfirmation, "owner confirmation freshness guard");
  const currentMs = normalizeTimestampMs(nowMs);
  const maxAgeMs = normalizePositiveMs(freshWindowMs, 300_000);
  const ageMs =
    currentMs > 0 && ownerConfirmation.confirmation_timestamp_ms > 0
      ? currentMs - ownerConfirmation.confirmation_timestamp_ms
      : Number.POSITIVE_INFINITY;
  const fresh =
    ownerConfirmation.confirmation_status === "confirmed" &&
    ageMs >= 0 &&
    ageMs <= maxAgeMs;
  return createOwnerConfirmationEnvelope({
    confirmationScope: ownerConfirmation.confirmation_scope,
    ownerRole: ownerConfirmation.owner_role,
    confirmationStatus: fresh ? "confirmed" : "required",
    confirmationTimestampMs: ownerConfirmation.confirmation_timestamp_ms,
  });
}

export function createOwnerConfirmationProductionGoGate({
  ownerConfirmation,
} = {}) {
  assertOwnerConfirmationSafe(ownerConfirmation, "owner confirmation production go gate");
  const blocked =
    ownerConfirmation.owner_role !== "owner" ||
    ["required", "pending", "expired"].includes(
      ownerConfirmation.confirmation_status
    );
  const gate = {
    schema: "iris_owner_confirmation_production_go_gate_v1",
    gate_status: blocked ? "BLOCKED" : "ready",
    confirmation_status: ownerConfirmation.confirmation_status,
    owner_role: ownerConfirmation.owner_role,
    production_go: !blocked,
    blocker_label:
      ownerConfirmation.owner_role !== "owner"
        ? "owner_role_required"
        : blocked
          ? "owner_confirmation_required"
          : "none",
    boundary_policy: Object.fromEntries(
      [...OWNER_CONFIRMATION_GO_GATE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertOwnerConfirmationProductionGoGateSafe(gate);
  return gate;
}

export function createOwnerConfirmationAuditEvent({
  actorRole = "operator",
  action = "owner_confirmation_recorded",
  safeTarget = "live_handoff",
  result = "pending",
  auditTimestampMs = Date.now(),
} = {}) {
  const event = {
    schema: "iris_owner_confirmation_audit_event_v1",
    actor_role: safeActorRole(actorRole),
    action: safeOwnerConfirmationAction(action),
    safe_target: safeLabel(safeTarget),
    result: safeOwnerConfirmationAuditResult(result),
    audit_timestamp_ms: normalizeTimestampMs(auditTimestampMs),
    boundary_policy: Object.fromEntries(
      [...OWNER_CONFIRMATION_AUDIT_EVENT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertOwnerConfirmationAuditEventSafe(event);
  return event;
}

export function createOwnerConfirmationNoAutoApproveGate({
  readinessPass = false,
  fixturePass = false,
  ownerConfirmation,
} = {}) {
  assertOwnerConfirmationSafe(ownerConfirmation, "owner confirmation no auto-approve");
  const gate = {
    schema: "iris_owner_confirmation_no_auto_approve_gate_v1",
    gate_status:
      ownerConfirmation.confirmation_status === "confirmed" ? "confirmed" : "blocked",
    readiness_pass: readinessPass === true,
    fixture_pass: fixturePass === true,
    confirmation_status: ownerConfirmation.confirmation_status,
    auto_confirmed: false,
    boundary_policy: Object.fromEntries(
      [...OWNER_CONFIRMATION_NO_AUTO_APPROVE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertOwnerConfirmationNoAutoApproveGateSafe(gate);
  return gate;
}

export function createOwnerConfirmationPublicSummary({
  ownerConfirmation,
} = {}) {
  assertOwnerConfirmationSafe(ownerConfirmation, "owner confirmation public summary");
  const summary = {
    schema: "iris_owner_confirmation_public_summary_v1",
    confirmation_status: ownerConfirmation.confirmation_status,
    boundary_policy: Object.fromEntries(
      [...OWNER_CONFIRMATION_PUBLIC_SUMMARY_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertOwnerConfirmationPublicSummarySafe(summary);
  return summary;
}

export function createOwnerConfirmationExpirationPolicy({
  validityWindowMs = 300_000,
} = {}) {
  const policy = {
    schema: "iris_owner_confirmation_expiration_policy_v1",
    policy_status: "active",
    validity_window_ms: normalizePositiveMs(validityWindowMs, 300_000),
    expired_returns_to: "pending",
    boundary_policy: Object.fromEntries(
      [...OWNER_CONFIRMATION_EXPIRATION_POLICY_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertOwnerConfirmationExpirationPolicySafe(policy);
  return policy;
}

export function applyOwnerConfirmationExpirationPolicy({
  ownerConfirmation,
  policy = createOwnerConfirmationExpirationPolicy(),
  nowMs = Date.now(),
} = {}) {
  assertOwnerConfirmationSafe(ownerConfirmation, "owner confirmation expiration");
  assertOwnerConfirmationExpirationPolicySafe(policy);
  const currentMs = normalizeTimestampMs(nowMs);
  const expired =
    ownerConfirmation.confirmation_status === "confirmed" &&
    (ownerConfirmation.confirmation_timestamp_ms === 0 ||
      currentMs === 0 ||
      ownerConfirmation.confirmation_timestamp_ms > currentMs ||
      currentMs - ownerConfirmation.confirmation_timestamp_ms >
        policy.validity_window_ms);
  return createOwnerConfirmationEnvelope({
    confirmationScope: ownerConfirmation.confirmation_scope,
    ownerRole: ownerConfirmation.owner_role,
    confirmationStatus: expired
      ? policy.expired_returns_to
      : ownerConfirmation.confirmation_status,
    confirmationTimestampMs: ownerConfirmation.confirmation_timestamp_ms,
  });
}

export function createOwnerConfirmationFixturePack({ nowMs = 10_000 } = {}) {
  const policy = createOwnerConfirmationExpirationPolicy({ validityWindowMs: 500 });
  const missing = createOwnerConfirmationProductionGoGate({
    ownerConfirmation: createOwnerConfirmationEnvelope({
      confirmationStatus: "pending",
      confirmationTimestampMs: nowMs,
    }),
  });
  const wrongRole = createOwnerConfirmationProductionGoGate({
    ownerConfirmation: createOwnerConfirmationEnvelope({
      ownerRole: "operator",
      confirmationStatus: "confirmed",
      confirmationTimestampMs: nowMs,
    }),
  });
  const expired = applyOwnerConfirmationExpirationPolicy({
    ownerConfirmation: createOwnerConfirmationEnvelope({
      ownerRole: "owner",
      confirmationStatus: "confirmed",
      confirmationTimestampMs: nowMs - 1000,
    }),
    policy,
    nowMs,
  });
  const autoApproveAttempt = createOwnerConfirmationNoAutoApproveGate({
    readinessPass: true,
    fixturePass: true,
    ownerConfirmation: createOwnerConfirmationEnvelope({
      confirmationStatus: "pending",
      confirmationTimestampMs: nowMs,
    }),
  });
  const noteLeakStatus = capturesContractError(() =>
    assertOwnerConfirmationPublicSummarySafe({
      ...createOwnerConfirmationPublicSummary({
        ownerConfirmation: createOwnerConfirmationEnvelope({
          confirmationStatus: "confirmed",
          confirmationTimestampMs: nowMs,
        }),
      }),
      raw_operator_note: "note",
    })
  );
  const pack = {
    schema: "iris_owner_confirmation_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: 5,
    missing_fixture: createFixtureResult("missing", missing.gate_status),
    wrong_role_fixture: createFixtureResult("wrong_role", wrongRole.gate_status),
    expired_fixture: createFixtureResult("expired", expired.confirmation_status),
    auto_approve_attempt_fixture: createFixtureResult(
      "auto_approve_attempt",
      autoApproveAttempt.auto_confirmed ? "auto_confirmed" : "blocked"
    ),
    note_leak_fixture: createFixtureResult("note_leak", noteLeakStatus),
    boundary_policy: Object.fromEntries(
      [...OWNER_CONFIRMATION_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertOwnerConfirmationFixturePackSafe(pack);
  return pack;
}

export function assertLiveEvidenceAuditEntrySafe(
  entry,
  context = "live evidence audit entry"
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: entry required`);
  }
  assertNoUnsafeAuditMaterial(entry, context);
  for (const field of Object.keys(entry)) {
    if (!AUDIT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected audit field`, { field });
    }
  }
  if (
    entry.schema !== "iris_live_evidence_audit_entry_v1" ||
    !SAFE_LABEL_PATTERN.test(entry.audit_id) ||
    !Number.isInteger(entry.audit_timestamp_ms) ||
    entry.audit_timestamp_ms < 0 ||
    entry.audit_status !== "recorded"
  ) {
    throw new ContractError(`${context}: invalid audit entry`);
  }
  assertFreshEvidenceEnvelopeSafe(entry.fresh_evidence, `${context}: fresh evidence`);
  assertOwnerConfirmationSafe(entry.owner_confirmation, context);
  assertHandoffPlanSafe(entry.handoff_plan, context);
  assertGoNoGoResultSafe(entry.go_no_go_result, context);
  assertBoundaryPolicy(entry.boundary_policy, BOUNDARY_POLICY_FIELDS, context);
}

export function assertLiveHandoffPlanSafe(
  plan,
  context = "live handoff plan"
) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: plan required`);
  }
  assertNoUnsafeAuditMaterial(plan, context);
  for (const field of Object.keys(plan)) {
    if (!LIVE_HANDOFF_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected plan field`, { field });
    }
  }
  if (
    plan.schema !== "iris_live_handoff_plan_v1" ||
    !SAFE_LABEL_PATTERN.test(plan.component) ||
    !Number.isInteger(plan.order) ||
    plan.order <= 0 ||
    !SAFE_LABEL_PATTERN.test(plan.required_evidence) ||
    !OWNER_CONFIRMATION_STATUSES.has(plan.owner_confirmation) ||
    !SAFE_LABEL_PATTERN.test(plan.blocker) ||
    !["BLOCKED", "pending", "ready"].includes(plan.status) ||
    plan.real_operation_performed !== false
  ) {
    throw new ContractError(`${context}: invalid plan`);
  }
  if (
    plan.owner_confirmation !== "confirmed" &&
    plan.status !== "BLOCKED"
  ) {
    throw new ContractError(`${context}: owner confirmation blocks handoff`);
  }
  assertBoundaryPolicy(plan.boundary_policy, LIVE_HANDOFF_PLAN_BOUNDARY_FIELDS, context);
}

export function assertLiveHandoffSequenceManifestSafe(
  manifest,
  context = "live handoff sequence manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest required`);
  }
  assertNoUnsafeAuditMaterial(manifest, context);
  for (const field of Object.keys(manifest)) {
    if (!LIVE_HANDOFF_SEQUENCE_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`, { field });
    }
  }
  if (
    manifest.schema !== "iris_live_handoff_sequence_manifest_v1" ||
    !["valid", "rejected"].includes(manifest.manifest_status) ||
    !Array.isArray(manifest.steps) ||
    manifest.step_count !== manifest.steps.length
  ) {
    throw new ContractError(`${context}: invalid manifest`);
  }
  for (const step of manifest.steps) {
    assertLiveHandoffSequenceStepSafe(step, context);
  }
  const valid = isLiveHandoffSequenceValid(manifest.steps);
  if (manifest.manifest_status !== (valid ? "valid" : "rejected")) {
    throw new ContractError(`${context}: sequence status mismatch`);
  }
  assertBoundaryPolicy(
    manifest.boundary_policy,
    LIVE_HANDOFF_SEQUENCE_BOUNDARY_FIELDS,
    context
  );
}

export function assertLiveHandoffSafeNextActionSafe(
  action,
  context = "live handoff safe next action"
) {
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    throw new ContractError(`${context}: action required`);
  }
  assertNoUnsafeAuditMaterial(action, context);
  for (const field of Object.keys(action)) {
    if (!LIVE_HANDOFF_SAFE_NEXT_ACTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected action field`, { field });
    }
  }
  if (
    action.schema !== "iris_live_handoff_safe_next_action_v1" ||
    !SAFE_LABEL_PATTERN.test(action.safe_script_name) ||
    !SAFE_LABEL_PATTERN.test(action.operator_label)
  ) {
    throw new ContractError(`${context}: invalid action`);
  }
  assertBoundaryPolicy(
    action.boundary_policy,
    LIVE_HANDOFF_SAFE_NEXT_ACTION_BOUNDARY_FIELDS,
    context
  );
}

export function assertLiveHandoffEmergencyStopGateSafe(
  gate,
  context = "live handoff emergency stop gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
  for (const field of Object.keys(gate)) {
    if (!LIVE_HANDOFF_EMERGENCY_STOP_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`, { field });
    }
  }
  if (
    gate.schema !== "iris_live_handoff_emergency_stop_gate_v1" ||
    !["ready", "BLOCKED"].includes(gate.gate_status) ||
    !["fresh", "stale", "runtime_waiting", "attention"].includes(
      gate.emergency_stop_freshness
    ) ||
    typeof gate.progress_allowed !== "boolean" ||
    !["none", "emergency_stop_fresh_evidence_required"].includes(gate.blocker)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const fresh = gate.emergency_stop_freshness === "fresh";
  if (
    gate.progress_allowed !== fresh ||
    gate.gate_status !== (fresh ? "ready" : "BLOCKED") ||
    gate.blocker !== (fresh ? "none" : "emergency_stop_fresh_evidence_required")
  ) {
    throw new ContractError(`${context}: emergency stop gate mismatch`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    LIVE_HANDOFF_EMERGENCY_STOP_GATE_BOUNDARY_FIELDS,
    context
  );
}

export function assertLiveHandoffAuditReadinessGateSafe(
  gate,
  context = "live handoff audit readiness gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
  for (const field of Object.keys(gate)) {
    if (!LIVE_HANDOFF_AUDIT_READINESS_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`, { field });
    }
  }
  if (
    gate.schema !== "iris_live_handoff_audit_readiness_gate_v1" ||
    !["ready", "BLOCKED"].includes(gate.gate_status) ||
    !["ready", "missing", "attention"].includes(gate.audit_status) ||
    typeof gate.progress_allowed !== "boolean" ||
    !["none", "audit_trail_ready_required"].includes(gate.blocker)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const ready = gate.audit_status === "ready";
  if (
    gate.progress_allowed !== ready ||
    gate.gate_status !== (ready ? "ready" : "BLOCKED") ||
    gate.blocker !== (ready ? "none" : "audit_trail_ready_required")
  ) {
    throw new ContractError(`${context}: audit readiness gate mismatch`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    LIVE_HANDOFF_AUDIT_READINESS_GATE_BOUNDARY_FIELDS,
    context
  );
}

export function assertLiveHandoffDryRunResultSafe(
  result,
  context = "live handoff dry-run result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result required`);
  }
  assertNoUnsafeAuditMaterial(result, context);
  for (const field of Object.keys(result)) {
    if (!LIVE_HANDOFF_DRY_RUN_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected result field`, { field });
    }
  }
  if (
    result.schema !== "iris_live_handoff_dry_run_result_v1" ||
    result.dry_run_status !== "simulated" ||
    !["blocked", "attention", "ready"].includes(result.safe_status) ||
    result.real_connection_succeeded !== false ||
    result.execution_performed !== false
  ) {
    throw new ContractError(`${context}: invalid result`);
  }
  assertBoundaryPolicy(
    result.boundary_policy,
    LIVE_HANDOFF_DRY_RUN_RESULT_BOUNDARY_FIELDS,
    context
  );
}

export function assertLiveHandoffFixturePackSafe(
  pack,
  context = "live handoff fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoUnsafeAuditMaterial(pack, context);
  for (const field of Object.keys(pack)) {
    if (!LIVE_HANDOFF_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`, { field });
    }
  }
  if (
    pack.schema !== "iris_live_handoff_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 5
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const expected = {
    owner_missing_fixture: ["owner_missing", "blocked"],
    emergency_missing_fixture: ["emergency_missing", "blocked"],
    audit_missing_fixture: ["audit_missing", "blocked"],
    out_of_order_fixture: ["out_of_order", "rejected"],
    unsafe_handoff_fixture: ["unsafe_handoff", "contracterror"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    assertLiveHandoffFixtureResultSafe(pack[field], context);
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    LIVE_HANDOFF_FIXTURE_PACK_BOUNDARY_FIELDS,
    context
  );
}

export function assertOwnerConfirmationProductionGoGateSafe(
  gate,
  context = "owner confirmation production go gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
  for (const field of Object.keys(gate)) {
    if (!OWNER_CONFIRMATION_GO_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`, { field });
    }
  }
  if (
    gate.schema !== "iris_owner_confirmation_production_go_gate_v1" ||
    !["BLOCKED", "ready"].includes(gate.gate_status) ||
    !OWNER_CONFIRMATION_STATUSES.has(gate.confirmation_status) ||
    !["owner", "admin", "operator"].includes(gate.owner_role) ||
    typeof gate.production_go !== "boolean" ||
    !["owner_confirmation_required", "owner_role_required", "none"].includes(
      gate.blocker_label
    )
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const blocked =
    gate.owner_role !== "owner" ||
    ["required", "pending", "expired"].includes(gate.confirmation_status);
  const expectedBlocker =
    gate.owner_role !== "owner"
      ? "owner_role_required"
      : blocked
        ? "owner_confirmation_required"
        : "none";
  if (
    gate.production_go !== !blocked ||
    gate.gate_status !== (blocked ? "BLOCKED" : "ready") ||
    gate.blocker_label !== expectedBlocker
  ) {
    throw new ContractError(`${context}: confirmation gate mismatch`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    OWNER_CONFIRMATION_GO_GATE_BOUNDARY_FIELDS,
    context
  );
}

export function assertOwnerConfirmationAuditEventSafe(
  event,
  context = "owner confirmation audit event"
) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new ContractError(`${context}: event required`);
  }
  assertNoUnsafeAuditMaterial(event, context);
  for (const field of Object.keys(event)) {
    if (!OWNER_CONFIRMATION_AUDIT_EVENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected event field`, { field });
    }
  }
  if (
    event.schema !== "iris_owner_confirmation_audit_event_v1" ||
    !["owner", "admin", "operator"].includes(event.actor_role) ||
    !["owner_confirmation_recorded", "owner_confirmation_rejected"].includes(
      event.action
    ) ||
    !SAFE_LABEL_PATTERN.test(event.safe_target) ||
    !["confirmed", "pending", "expired", "rejected"].includes(event.result) ||
    !Number.isInteger(event.audit_timestamp_ms) ||
    event.audit_timestamp_ms < 0
  ) {
    throw new ContractError(`${context}: invalid event`);
  }
  assertBoundaryPolicy(
    event.boundary_policy,
    OWNER_CONFIRMATION_AUDIT_EVENT_BOUNDARY_FIELDS,
    context
  );
}

export function assertOwnerConfirmationNoAutoApproveGateSafe(
  gate,
  context = "owner confirmation no auto-approve gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
  for (const field of Object.keys(gate)) {
    if (!OWNER_CONFIRMATION_NO_AUTO_APPROVE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`, { field });
    }
  }
  if (
    gate.schema !== "iris_owner_confirmation_no_auto_approve_gate_v1" ||
    !["blocked", "confirmed"].includes(gate.gate_status) ||
    typeof gate.readiness_pass !== "boolean" ||
    typeof gate.fixture_pass !== "boolean" ||
    !OWNER_CONFIRMATION_STATUSES.has(gate.confirmation_status) ||
    gate.auto_confirmed !== false
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  if (
    gate.gate_status !==
    (gate.confirmation_status === "confirmed" ? "confirmed" : "blocked")
  ) {
    throw new ContractError(`${context}: auto approve mismatch`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    OWNER_CONFIRMATION_NO_AUTO_APPROVE_BOUNDARY_FIELDS,
    context
  );
}

export function assertOwnerConfirmationPublicSummarySafe(
  summary,
  context = "owner confirmation public summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeAuditMaterial(summary, context);
  for (const field of Object.keys(summary)) {
    if (!OWNER_CONFIRMATION_PUBLIC_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (
    summary.schema !== "iris_owner_confirmation_public_summary_v1" ||
    !OWNER_CONFIRMATION_STATUSES.has(summary.confirmation_status)
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    OWNER_CONFIRMATION_PUBLIC_SUMMARY_BOUNDARY_FIELDS,
    context
  );
}

export function assertOwnerConfirmationExpirationPolicySafe(
  policy,
  context = "owner confirmation expiration policy"
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: policy required`);
  }
  assertNoUnsafeAuditMaterial(policy, context);
  for (const field of Object.keys(policy)) {
    if (!OWNER_CONFIRMATION_EXPIRATION_POLICY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected policy field`, { field });
    }
  }
  if (
    policy.schema !== "iris_owner_confirmation_expiration_policy_v1" ||
    policy.policy_status !== "active" ||
    !Number.isInteger(policy.validity_window_ms) ||
    policy.validity_window_ms <= 0 ||
    policy.expired_returns_to !== "pending"
  ) {
    throw new ContractError(`${context}: invalid policy`);
  }
  assertBoundaryPolicy(
    policy.boundary_policy,
    OWNER_CONFIRMATION_EXPIRATION_POLICY_BOUNDARY_FIELDS,
    context
  );
}

export function assertOwnerConfirmationFixturePackSafe(
  pack,
  context = "owner confirmation fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoUnsafeAuditMaterial(pack, context);
  for (const field of Object.keys(pack)) {
    if (!OWNER_CONFIRMATION_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`, { field });
    }
  }
  if (
    pack.schema !== "iris_owner_confirmation_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 5
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const expected = {
    missing_fixture: ["missing", "blocked"],
    wrong_role_fixture: ["wrong_role", "blocked"],
    expired_fixture: ["expired", "pending"],
    auto_approve_attempt_fixture: ["auto_approve_attempt", "blocked"],
    note_leak_fixture: ["note_leak", "contracterror"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    assertOwnerConfirmationFixtureResultSafe(pack[field], context);
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    OWNER_CONFIRMATION_FIXTURE_PACK_BOUNDARY_FIELDS,
    context
  );
}

function assertOwnerConfirmationSafe(ownerConfirmation, context) {
  if (
    !ownerConfirmation ||
    typeof ownerConfirmation !== "object" ||
    Array.isArray(ownerConfirmation)
  ) {
    throw new ContractError(`${context}: owner confirmation required`);
  }
  for (const field of Object.keys(ownerConfirmation)) {
    if (!OWNER_CONFIRMATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected owner confirmation field`, { field });
    }
  }
  if (
    ownerConfirmation.schema !== "iris_live_evidence_owner_confirmation_v1" ||
    !OWNER_CONFIRMATION_SCOPES.has(ownerConfirmation.confirmation_scope) ||
    !OWNER_CONFIRMATION_STATUSES.has(ownerConfirmation.owner_status) ||
    !["owner", "admin", "operator"].includes(ownerConfirmation.owner_role) ||
    !OWNER_CONFIRMATION_STATUSES.has(ownerConfirmation.confirmation_status) ||
    ownerConfirmation.owner_status !== ownerConfirmation.confirmation_status ||
    !Number.isInteger(ownerConfirmation.confirmation_timestamp_ms) ||
    ownerConfirmation.confirmation_timestamp_ms < 0
  ) {
    throw new ContractError(`${context}: invalid owner confirmation`);
  }
}

function assertHandoffPlanSafe(handoffPlan, context) {
  if (!handoffPlan || typeof handoffPlan !== "object" || Array.isArray(handoffPlan)) {
    throw new ContractError(`${context}: handoff plan required`);
  }
  for (const field of Object.keys(handoffPlan)) {
    if (!HANDOFF_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected handoff plan field`, { field });
    }
  }
  if (
    handoffPlan.schema !== "iris_live_evidence_handoff_plan_v1" ||
    handoffPlan.plan_status !== "recorded" ||
    !["owner", "admin", "operator"].includes(handoffPlan.handoff_owner_role) ||
    !Number.isInteger(handoffPlan.required_evidence_count) ||
    !Number.isInteger(handoffPlan.ready_evidence_count) ||
    handoffPlan.required_evidence_count < 0 ||
    handoffPlan.ready_evidence_count < 0 ||
    handoffPlan.ready_evidence_count > handoffPlan.required_evidence_count
  ) {
    throw new ContractError(`${context}: invalid handoff plan`);
  }
}

function assertGoNoGoResultSafe(goNoGoResult, context) {
  if (!goNoGoResult || typeof goNoGoResult !== "object" || Array.isArray(goNoGoResult)) {
    throw new ContractError(`${context}: go/no-go result required`);
  }
  for (const field of Object.keys(goNoGoResult)) {
    if (!GO_NO_GO_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected go/no-go field`, { field });
    }
  }
  if (
    goNoGoResult.schema !== "iris_live_evidence_go_no_go_result_v1" ||
    !["go", "no_go"].includes(goNoGoResult.decision) ||
    !["go_recorded", "blocked"].includes(goNoGoResult.result_status) ||
    !Number.isInteger(goNoGoResult.blocker_count) ||
    goNoGoResult.blocker_count < 0
  ) {
    throw new ContractError(`${context}: invalid go/no-go result`);
  }
  if (
    (goNoGoResult.decision === "go" && goNoGoResult.result_status !== "go_recorded") ||
    (goNoGoResult.decision === "no_go" && goNoGoResult.result_status !== "blocked")
  ) {
    throw new ContractError(`${context}: go/no-go mismatch`);
  }
}

function assertOwnerConfirmationFixtureResultSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: fixture result required`);
  }
  for (const field of Object.keys(item)) {
    if (!OWNER_CONFIRMATION_FIXTURE_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture result field`, {
        field,
      });
    }
  }
  if (
    item.schema !== "iris_owner_confirmation_fixture_result_v1" ||
    !SAFE_LABEL_PATTERN.test(item.fixture_label) ||
    !SAFE_LABEL_PATTERN.test(item.fixture_status)
  ) {
    throw new ContractError(`${context}: invalid fixture result`);
  }
}

function assertLiveHandoffSequenceStepSafe(step, context) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: sequence step required`);
  }
  for (const field of Object.keys(step)) {
    if (!LIVE_HANDOFF_SEQUENCE_STEP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected sequence step field`, {
        field,
      });
    }
  }
  if (
    step.schema !== "iris_live_handoff_sequence_step_v1" ||
    !LIVE_HANDOFF_SEQUENCE.includes(step.component) ||
    !Number.isInteger(step.order) ||
    step.order <= 0 ||
    !["BLOCKED", "pending", "ready"].includes(step.status)
  ) {
    throw new ContractError(`${context}: invalid sequence step`);
  }
}

function isLiveHandoffSequenceValid(steps) {
  if (steps.length !== LIVE_HANDOFF_SEQUENCE.length) return false;
  return steps.every(
    (step, index) =>
      step.component === LIVE_HANDOFF_SEQUENCE[index] && step.order === index + 1
  );
}

function createFixtureResult(fixtureLabel, fixtureStatus) {
  return {
    schema: "iris_owner_confirmation_fixture_result_v1",
    fixture_label: safeLabel(fixtureLabel),
    fixture_status: safeLabel(fixtureStatus),
  };
}

function createLiveHandoffFixtureResult(fixtureLabel, fixtureStatus) {
  return {
    schema: "iris_live_handoff_fixture_result_v1",
    fixture_label: safeLabel(fixtureLabel),
    fixture_status: safeLabel(fixtureStatus),
  };
}

function assertLiveHandoffFixtureResultSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: fixture result required`);
  }
  for (const field of Object.keys(item)) {
    if (!LIVE_HANDOFF_FIXTURE_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture result field`, {
        field,
      });
    }
  }
  if (
    item.schema !== "iris_live_handoff_fixture_result_v1" ||
    !SAFE_LABEL_PATTERN.test(item.fixture_label) ||
    !SAFE_LABEL_PATTERN.test(item.fixture_status)
  ) {
    throw new ContractError(`${context}: invalid fixture result`);
  }
}

function capturesContractError(fn) {
  try {
    fn();
    return "not_rejected";
  } catch (error) {
    if (error instanceof ContractError) return "ContractError";
    throw error;
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!requiredFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`, { field });
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function assertNoUnsafeAuditMaterial(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeAuditMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (path !== "root.boundary_policy" && UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unsafe audit field`, { field, path });
    }
    if (typeof child === "string" && UNSAFE_VALUE_PATTERN.test(child)) {
      throw new ContractError(`${context}: unsafe audit value`, { field, path });
    }
    assertNoUnsafeAuditMaterial(child, context, `${path}.${field}`);
  }
}

function safeActorRole(value) {
  const role = safeLabel(value);
  return ["owner", "admin", "operator"].includes(role) ? role : "operator";
}

function safeOwnerConfirmationScope(value) {
  const scope = safeLabel(value);
  return OWNER_CONFIRMATION_SCOPES.has(scope) ? scope : "live_handoff";
}

function safeOwnerLiveConfirmationScope(value) {
  const scope = safeLabel(value);
  return OWNER_LIVE_CONFIRMATION_SCOPES.has(scope) ? scope : "go_no_go";
}

function safeOwnerLiveConfirmationStatus(value) {
  const status = safeLabel(value);
  return OWNER_LIVE_CONFIRMATION_STATUSES.has(status) ? status : "pending";
}

function safeGoNoGoDecisionStatus(value) {
  const status = safeLabel(value);
  return ["go", "no_go"].includes(status) ? status : "no_go";
}

function safeGoNoGoBlockerReasonLabel(value) {
  const label = safeLabel(value);
  return LIVE_GO_NO_GO_BLOCKER_REASON_LABELS.has(label)
    ? label
    : "real_evidence_required";
}

function safeOwnerConfirmationAction(value) {
  const action = safeLabel(value);
  return ["owner_confirmation_recorded", "owner_confirmation_rejected"].includes(
    action
  )
    ? action
    : "owner_confirmation_recorded";
}

function safeOwnerConfirmationAuditResult(value) {
  const result = safeLabel(value);
  return ["confirmed", "pending", "expired", "rejected"].includes(result)
    ? result
    : "pending";
}

function safeAuditReadinessStatus(value) {
  const status = safeLabel(value);
  return ["ready", "missing", "attention"].includes(status) ? status : "missing";
}

function safeDryRunStatus(value) {
  const status = safeLabel(value);
  return ["blocked", "attention", "ready"].includes(status) ? status : "blocked";
}

function uniqueSafeLabels(labels) {
  return [
    ...new Set(
      (Array.isArray(labels) ? labels : [])
        .map((label) => safePacketLabel(label))
        .filter((label) => label !== "unknown")
    ),
  ].sort();
}

function safePacketLabel(value) {
  const raw = String(value ?? "unknown");
  if (LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_VALUE_PATTERN.test(raw)) return "unknown";
  const label = safeLabel(value);
  return LIVE_HANDOFF_OPERATOR_PACKET_UNSAFE_VALUE_PATTERN.test(label) ? "unknown" : label;
}

function safeOperatorPacketAuditAction(value) {
  const action = safePacketLabel(value);
  return ["packet_generated", "owner_confirmation_requested"].includes(action)
    ? action
    : "packet_generated";
}

function safeOperatorPacketAuditResult(value) {
  const result = safePacketLabel(value);
  return ["recorded", "requested", "rejected"].includes(result) ? result : "rejected";
}

function safeBlockerResolutionStatus(value) {
  const status = safePacketLabel(value);
  return ["open", "resolved", "attention", "blocked"].includes(status)
    ? status
    : "open";
}

function safeOwnerHandoffReviewStatus(value) {
  const status = safePacketLabel(value);
  return ["pending", "blocked", "attention", "complete", "open"].includes(status)
    ? status
    : "pending";
}

function safeOwnerHandoffEvidenceFreshness(value) {
  const freshness = safePacketLabel(value);
  return ["fresh", "stale", "runtime_waiting", "attention", "missing"].includes(
    freshness
  )
    ? freshness
    : "runtime_waiting";
}

function safeOwnerHandoffReviewViewerRole(value) {
  const role = safePacketLabel(value);
  return role === "owner" ? "owner" : "ordinary";
}

function isSafeLiveBlockerResolutionAuditEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
  try {
    assertNoUnsafeAuditMaterial(entry, "live blocker resolution audit entry");
  } catch (error) {
    if (error instanceof ContractError) return false;
    throw error;
  }
  return (
    typeof entry.schema === "string" &&
    SAFE_LABEL_PATTERN.test(entry.schema) &&
    Number.isInteger(entry.audit_timestamp_ms) &&
    entry.audit_timestamp_ms > 0
  );
}

function safeLabel(value) {
  return (
    String(value ?? "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9_.:-]+/gu, "_")
      .replace(/^_+|_+$/gu, "")
      .slice(0, 80) || "unknown"
  );
}

function safeCollectorExpectedSource(value) {
  const source = safeLabel(value);
  return ["real_probe", "operator_confirmed", "manual_upload", "audit_link"].includes(
    source
  )
    ? source
    : "real_probe";
}

function safeCollectorStatus(value) {
  const status = safeLabel(value);
  return isSafeCollectorStatus(status) ? status : "runtime_waiting";
}

function isSafeCollectorStatus(value) {
  return [
    "ready",
    "fresh",
    "stale",
    "runtime_waiting",
    "attention",
    "blocked",
  ].includes(value);
}

function normalizeTimestampMs(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function throwsContractError(fn) {
  try {
    fn();
    return false;
  } catch (error) {
    return error instanceof ContractError;
  }
}

function normalizeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.trunc(number);
}

function normalizeNonNegativeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function normalizePositiveMs(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.trunc(number);
}

function safeLiveHandoffStatus(status, confirmationStatus, blocker) {
  if (confirmationStatus !== "confirmed" || safeLabel(blocker) !== "none") {
    return "BLOCKED";
  }
  const safeStatus = safeLabel(status);
  return ["pending", "ready"].includes(safeStatus) ? safeStatus : "pending";
}
