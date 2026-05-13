import { ContractError } from "../../core/contracts.js";

const REGISTRY_SCHEMA = "iris_adapter_preflight_contract_registry_v1";
const CONTRACT_SCHEMA = "iris_adapter_preflight_contract_v1";
const ADAPTER_LABELS = new Set([
  "tts",
  "live2d",
  "obs",
  "overlay",
  "game",
  "youtube",
  "db",
]);
const REGISTRY_FIELDS = new Set([
  "schema",
  "registry_status",
  "adapter_count",
  "adapter_contracts",
  "boundary_policy",
]);
const CONTRACT_FIELDS = new Set([
  "schema",
  "adapter_label",
  "preflight_required",
  "safe_manifest_required",
  "required_status_fields",
  "forbidden_public_fields",
]);
const DEPENDENCY_CLASSIFIER_FIELDS = new Set([
  "schema",
  "dependency_status",
  "missing_component_count",
  "components",
  "boundary_policy",
]);
const DEPENDENCY_COMPONENT_FIELDS = new Set([
  "component_label",
  "component_status",
]);
const FIXTURE_MODE_SPLIT_FIELDS = new Set([
  "schema",
  "adapter_label",
  "fixture_pass",
  "real_ready",
  "preflight_status",
  "boundary_policy",
]);
const ROUTE_LABEL_VALIDATION_FIELDS = new Set([
  "schema",
  "route_label",
  "route_status",
  "execution_shortcut_allowed",
  "boundary_policy",
]);
const STALE_PACKET_VALIDATION_FIELDS = new Set([
  "schema",
  "packet_status",
  "age_bucket",
  "execution_candidate_allowed",
  "boundary_policy",
]);
const TRACE_ID_VALIDATION_FIELDS = new Set([
  "schema",
  "trace_id",
  "event_id",
  "trace_status",
  "boundary_policy",
]);
const SAFE_ERROR_CATALOG_FIELDS = new Set([
  "schema",
  "component_label",
  "error_code",
  "error_status",
  "boundary_policy",
]);
const PUBLIC_DIAGNOSTIC_FIELDS = new Set([
  "schema",
  "component_label",
  "diagnostic_status",
  "safe_error_code",
  "boundary_policy",
]);
const ADMIN_DIAGNOSTIC_FIELDS = new Set([
  "schema",
  "view_role",
  "component_label",
  "diagnostic_status",
  "safe_error_code",
  "owner_only_available",
  "boundary_policy",
]);
const ADMIN_PAGE_SUMMARY_FIELDS = new Set([
  "schema",
  "page_status",
  "adapter_count",
  "ready_adapter_count",
  "attention_adapter_count",
  "adapter_statuses",
  "boundary_policy",
  "adapter_validation_required",
]);
const ADMIN_PAGE_ADAPTER_STATUS_FIELDS = new Set([
  "schema",
  "adapter_label",
  "status",
]);
const REAL_HANDSHAKE_MANIFEST_FIELDS = new Set([
  "schema",
  "manifest_status",
  "adapter_count",
  "handshake_contracts",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_HANDSHAKE_CONTRACT_FIELDS = new Set([
  "schema",
  "adapter_label",
  "handshake_required",
  "real_connection_required_for_ready",
  "required_fields",
  "forbidden_summary_fields",
]);
const REAL_HANDSHAKE_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "adapter_label",
  "handshake_status",
  "safe_status",
  "redaction_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_HANDSHAKE_TIMEOUT_CLASSIFICATION_FIELDS = new Set([
  "schema",
  "adapter_label",
  "timeout_detected",
  "classification",
  "ready_allowed",
  "safe_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_HANDSHAKE_STALE_SUCCESS_GUARD_FIELDS = new Set([
  "schema",
  "adapter_label",
  "success_age_bucket",
  "fixture_cached",
  "real_success_accepted",
  "handshake_status",
  "ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_HANDSHAKE_TRACE_CORRELATION_FIELDS = new Set([
  "schema",
  "trace_id",
  "component",
  "timestamp_ms",
  "status",
  "trace_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_ADAPTER_CAPABILITY_SUMMARY_FIELDS = new Set([
  "schema",
  "adapter_label",
  "capability_status",
  "capability_count",
  "capability_labels",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_ADAPTER_UNSUPPORTED_CAPABILITY_FIELDS = new Set([
  "schema",
  "adapter_label",
  "capability_label",
  "capability_status",
  "adapter_payload_allowed",
  "safe_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_ADAPTER_READINESS_GATE_FIELDS = new Set([
  "schema",
  "adapter_label",
  "fresh_handshake",
  "capability_status",
  "safe_config_status",
  "readiness_status",
  "ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_ADAPTER_DRY_RUN_SUMMARY_FIELDS = new Set([
  "schema",
  "adapter_label",
  "dry_run_status",
  "safe_status",
  "real_execution_performed",
  "execution_reported",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_ADAPTER_E2E_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "timeout_fixture",
  "stale_fixture",
  "capability_missing_fixture",
  "unsupported_fixture",
  "dry_run_fixture",
  "secret_leak_fixture",
  "boundary_policy",
  "adapter_validation_required",
]);
const TTS_REAL_ENGINE_CONNECTOR_PREFLIGHT_FIELDS = new Set([
  "schema",
  "voice_status",
  "model_status",
  "locale_status",
  "connector_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const TTS_REAL_ENGINE_FRESHNESS_GUARD_FIELDS = new Set([
  "schema",
  "engine_health_age_bucket",
  "engine_health_status",
  "ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const TTS_REAL_ENGINE_PLACEHOLDER_SEPARATION_FIELDS = new Set([
  "schema",
  "voice_source_kind",
  "licensed_real_voice",
  "placeholder_voice",
  "real_licensed_ready",
  "handoff_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const TTS_REAL_ENGINE_RIGHTS_GATE_FIELDS = new Set([
  "schema",
  "licensed_voice_source_verified",
  "rights_status",
  "real_voice_handoff_ready",
  "operator_attention_required",
  "boundary_policy",
  "adapter_validation_required",
]);
const TTS_REAL_ENGINE_PACKET_DRY_RUN_FIELDS = new Set([
  "schema",
  "voice_status",
  "model_status",
  "locale_status",
  "dry_run_status",
  "audio_generated",
  "vendor_call_performed",
  "endpoint_exposed",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE2D_REAL_RENDERER_CONNECTOR_PREFLIGHT_FIELDS = new Set([
  "schema",
  "renderer_status",
  "cue_capability_status",
  "model_configured_status",
  "preflight_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE2D_REAL_RENDERER_FRESHNESS_GUARD_FIELDS = new Set([
  "schema",
  "heartbeat_age_bucket",
  "render_pickup_age_bucket",
  "renderer_status",
  "ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE2D_REAL_RENDERER_CUE_VALIDATION_FIELDS = new Set([
  "schema",
  "cue_kind",
  "validation_status",
  "renderer_payload_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE2D_REAL_RENDERER_RECOVERY_REQUIREMENT_FIELDS = new Set([
  "schema",
  "cue_intensity",
  "recovery_cue_present",
  "validation_status",
  "renderer_payload_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE2D_REAL_RENDERER_E2E_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "stale_heartbeat_fixture",
  "unsupported_cue_fixture",
  "recovery_missing_fixture",
  "model_path_leak_fixture",
  "boundary_policy",
  "adapter_validation_required",
]);
const LIVE2D_REAL_RENDERER_MODEL_PATH_LEAK_FIXTURE_FIELDS = new Set([
  "schema",
  "leak_detected",
  "safe_status",
  "redaction_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const OBS_REAL_PICKUP_CONNECTOR_PREFLIGHT_FIELDS = new Set([
  "schema",
  "browser_source_status",
  "pickup_manifest_status",
  "heartbeat_status",
  "preflight_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const OBS_REAL_PICKUP_FRESHNESS_GUARD_FIELDS = new Set([
  "schema",
  "pickup_age_bucket",
  "pickup_status",
  "ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const OBS_REAL_PICKUP_ARTIFACT_VALIDATION_FIELDS = new Set([
  "schema",
  "artifact_age_bucket",
  "artifact_schema_status",
  "validation_status",
  "ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const OBS_REAL_PICKUP_MUTATION_CONFIRMATION_FIELDS = new Set([
  "schema",
  "mutation_kind",
  "confirmation_required",
  "operator_confirmed",
  "mutation_executed",
  "mutation_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const OBS_REAL_PICKUP_E2E_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "stale_pickup_fixture",
  "missing_browser_source_fixture",
  "event_leak_fixture",
  "mutation_without_confirmation_fixture",
  "boundary_policy",
  "adapter_validation_required",
]);
const OBS_REAL_PICKUP_EVENT_LEAK_FIXTURE_FIELDS = new Set([
  "schema",
  "leak_detected",
  "safe_status",
  "redaction_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const DB_REAL_CONNECTOR_PREFLIGHT_FIELDS = new Set([
  "schema",
  "configured_status",
  "connector_status",
  "schema_status",
  "index_status",
  "migration_status",
  "backup_status",
  "preflight_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const DB_REAL_CONNECTOR_AVAILABILITY_GATE_FIELDS = new Set([
  "schema",
  "real_db_connected",
  "availability_status",
  "production_persistence_ready",
  "attention_required",
  "boundary_policy",
  "adapter_validation_required",
]);
const DB_REAL_CONNECTOR_SCHEMA_FRESHNESS_FIELDS = new Set([
  "schema",
  "schema_manifest_age_bucket",
  "schema_manifest_status",
  "readiness_status",
  "ready_allowed",
  "boundary_policy",
  "adapter_validation_required",
]);
const DB_REAL_CONNECTOR_MIGRATION_READINESS_FIELDS = new Set([
  "schema",
  "migration_status",
  "production_db_ready",
  "readiness_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const GAME_REAL_ADAPTER_CONNECTOR_PREFLIGHT_FIELDS = new Set([
  "schema",
  "mode",
  "safe_map_status",
  "manual_approval_status",
  "cooldown_status",
  "preflight_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const GAME_REAL_ADAPTER_MANUAL_APPROVAL_GATE_FIELDS = new Set([
  "schema",
  "mode",
  "operator_approval_cue_present",
  "manual_approval_status",
  "real_control_ready",
  "boundary_policy",
  "adapter_validation_required",
]);
const GAME_REAL_ADAPTER_APPROVED_SAFE_MODE_GATE_FIELDS = new Set([
  "schema",
  "mode",
  "adapter_fresh",
  "safe_map_ready",
  "emergency_stop_ready",
  "audit_ready",
  "approved_safe_adapter_ready",
  "boundary_policy",
  "adapter_validation_required",
]);
const GAME_REAL_ADAPTER_EMERGENCY_STOP_REQUIREMENT_FIELDS = new Set([
  "schema",
  "emergency_stop_confirmed",
  "real_game_control_ready",
  "control_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const GAME_REAL_ADAPTER_E2E_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "missing_safe_map_fixture",
  "no_approval_fixture",
  "stale_adapter_fixture",
  "no_emergency_stop_fixture",
  "command_leak_fixture",
  "boundary_policy",
  "adapter_validation_required",
]);
const GAME_REAL_ADAPTER_COMMAND_LEAK_FIXTURE_FIELDS = new Set([
  "schema",
  "leak_detected",
  "safe_status",
  "redaction_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const YOUTUBE_REAL_INGEST_CONNECTOR_PREFLIGHT_FIELDS = new Set([
  "schema",
  "oauth_status",
  "chat_id_status",
  "polling_status",
  "dedupe_status",
  "moderation_status",
  "preflight_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const YOUTUBE_REAL_INGEST_TOKEN_FRESHNESS_GUARD_FIELDS = new Set([
  "schema",
  "token_status",
  "ingest_ready",
  "attention_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const YOUTUBE_REAL_INGEST_LIVE_CHAT_FRESHNESS_GUARD_FIELDS = new Set([
  "schema",
  "discovery_status",
  "ingest_ready",
  "attention_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const YOUTUBE_REAL_INGEST_MODERATION_READINESS_FIELDS = new Set([
  "schema",
  "moderation_status",
  "personalized_reaction_ready",
  "relationship_growth_ready",
  "attention_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const YOUTUBE_REAL_INGEST_E2E_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "token_expired_fixture",
  "stale_chat_fixture",
  "moderation_missing_fixture",
  "raw_api_leak_fixture",
  "boundary_policy",
  "adapter_validation_required",
]);
const YOUTUBE_REAL_INGEST_RAW_API_LEAK_FIXTURE_FIELDS = new Set([
  "schema",
  "leak_detected",
  "safe_status",
  "redaction_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const REAL_ADAPTER_SECRET_LEAK_FIXTURE_FIELDS = new Set([
  "schema",
  "adapter_label",
  "leak_detected",
  "safe_status",
  "redaction_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const UNSAFE_PACKET_FIELD_PATTERN =
  /(^|_)(secret|token|endpoint|raw_payload|candidate|commit)($|_)/i;
const BOUNDARY_FIELDS = new Set([
  "safe_manifest_only",
  "adapter_labels_only",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_payloads",
  "no_candidate_payloads",
  "no_commit_payloads",
]);
const DEPENDENCY_BOUNDARY_FIELDS = new Set([
  "component_labels_only",
  "status_only",
  "no_path_values",
  "no_network_values",
  "no_credential_values",
]);
const FIXTURE_MODE_BOUNDARY_FIELDS = new Set([
  "fixture_and_real_split",
  "fixture_pass_not_real_ready",
  "no_ready_sweetening",
  "status_only",
]);
const ROUTE_LABEL_BOUNDARY_FIELDS = new Set([
  "route_labels_only",
  "review_route_not_execution",
  "no_execution_shortcut",
  "status_only",
]);
const STALE_PACKET_BOUNDARY_FIELDS = new Set([
  "stale_not_ready",
  "stale_not_execution_candidate",
  "age_bucket_only",
  "status_only",
]);
const TRACE_ID_BOUNDARY_FIELDS = new Set([
  "trace_id_required",
  "event_id_required",
  "handoff_without_trace_rejected",
  "status_only",
]);
const SAFE_ERROR_BOUNDARY_FIELDS = new Set([
  "fixed_error_code_only",
  "summary_only",
  "no_raw_vendor_response",
  "no_renderer_job",
]);
const PUBLIC_DIAGNOSTIC_BOUNDARY_FIELDS = new Set([
  "safe_summary_only",
  "no_raw_packet",
  "no_world_command",
  "no_secret",
  "no_token",
  "no_candidate",
  "no_raw_response",
]);
const ADMIN_DIAGNOSTIC_BOUNDARY_FIELDS = new Set([
  "ordinary_safe_summary_only",
  "owner_only_role_gated",
  "no_secret",
  "no_token",
  "no_endpoint",
  "no_raw_diagnostics",
  "no_raw_packet",
  "no_world_command",
  "no_candidate",
  "no_raw_response",
]);
const ADMIN_PAGE_BOUNDARY_FIELDS = new Set([
  "adapter_status_only",
  "fixed_adapter_labels_only",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_packets",
  "no_raw_payloads",
  "no_candidate_payloads",
  "no_commit_payloads",
]);
const REAL_HANDSHAKE_BOUNDARY_FIELDS = new Set([
  "manifest_only",
  "real_adapter_labels_only",
  "required_fields_only",
  "real_connection_required_for_ready",
  "real_connection_not_required_for_validation",
  "no_endpoint_values",
  "no_token_values",
  "no_credential_values",
  "no_raw_vendor_response",
  "no_internal_path_values",
]);
const REAL_HANDSHAKE_SAFE_SUMMARY_BOUNDARY_FIELDS = new Set([
  "safe_summary_only",
  "adapter_label_status_only",
  "no_endpoint_values",
  "no_token_values",
  "no_credential_values",
  "no_raw_vendor_response",
  "no_internal_path_values",
]);
const REAL_HANDSHAKE_TIMEOUT_BOUNDARY_FIELDS = new Set([
  "timeout_not_ready",
  "fixed_status_only",
  "safe_classification_only",
  "no_endpoint_values",
  "no_token_values",
  "no_credential_values",
  "no_raw_vendor_response",
  "no_internal_path_values",
]);
const REAL_HANDSHAKE_STALE_SUCCESS_GUARD_BOUNDARY_FIELDS = new Set([
  "stale_success_not_real_success",
  "cached_fixture_not_real_success",
  "fresh_real_success_required_for_ready",
  "safe_status_only",
  "no_endpoint_values",
  "no_token_values",
  "no_credential_values",
  "no_raw_vendor_response",
  "no_internal_path_values",
]);
const REAL_HANDSHAKE_TRACE_CORRELATION_BOUNDARY_FIELDS = new Set([
  "trace_id_required",
  "component_required",
  "timestamp_required",
  "status_required",
  "missing_trace_rejected",
  "safe_status_only",
  "no_endpoint_values",
  "no_token_values",
  "no_credential_values",
  "no_raw_vendor_response",
  "no_internal_path_values",
]);
const REAL_ADAPTER_CAPABILITY_SUMMARY_BOUNDARY_FIELDS = new Set([
  "safe_capability_label_count_status_only",
  "command_values_redacted",
  "schema_values_redacted",
  "schema_sensitive_values_redacted",
  "path_values_redacted",
  "no_endpoint_values",
  "no_token_values",
]);
const REAL_ADAPTER_UNSUPPORTED_CAPABILITY_BOUNDARY_FIELDS = new Set([
  "unsupported_capability_degraded",
  "adapter_payload_not_forwarded",
  "safe_capability_label_only",
  "no_raw_payloads",
  "no_raw_command_values",
  "no_endpoint_values",
  "no_token_values",
  "no_internal_path_values",
]);
const REAL_ADAPTER_READINESS_GATE_BOUNDARY_FIELDS = new Set([
  "fresh_handshake_required",
  "capability_required",
  "safe_config_required",
  "all_conditions_required_for_ready",
  "no_readiness_sweetening",
  "safe_status_only",
  "no_endpoint_values",
  "no_token_values",
  "no_credential_values",
  "no_raw_vendor_response",
  "no_internal_path_values",
]);
const REAL_ADAPTER_DRY_RUN_SUMMARY_BOUNDARY_FIELDS = new Set([
  "dry_run_summary_only",
  "not_real_execution",
  "not_execution_report",
  "safe_status_only",
  "no_endpoint_values",
  "no_token_values",
  "no_credential_values",
  "no_raw_vendor_response",
  "no_internal_path_values",
]);
const REAL_ADAPTER_E2E_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "synthetic_fixture_only",
  "timeout_guarded",
  "stale_guarded",
  "capability_missing_guarded",
  "unsupported_guarded",
  "dry_run_not_execution",
  "secret_leak_redacted",
  "safe_summary_only",
  "no_endpoint_values",
  "no_token_values",
  "no_credential_values",
  "no_raw_vendor_response",
  "no_internal_path_values",
]);
const REAL_ADAPTER_SECRET_LEAK_FIXTURE_BOUNDARY_FIELDS = new Set([
  "secret_leak_redacted",
  "safe_status_only",
  "no_endpoint_values",
  "no_token_values",
  "no_credential_values",
  "no_raw_vendor_response",
  "no_internal_path_values",
]);
const TTS_REAL_ENGINE_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS = new Set([
  "voice_model_locale_status_only",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_audio",
  "no_vendor_diagnostics",
]);
const TTS_REAL_ENGINE_FRESHNESS_GUARD_BOUNDARY_FIELDS = new Set([
  "stale_health_not_ready",
  "fresh_health_required_for_ready",
  "safe_status_only",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_audio",
  "no_vendor_diagnostics",
]);
const TTS_REAL_ENGINE_PLACEHOLDER_SEPARATION_BOUNDARY_FIELDS = new Set([
  "placeholder_not_real_licensed_ready",
  "licensed_real_voice_separated",
  "safe_source_kind_only",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_audio",
  "no_vendor_diagnostics",
]);
const TTS_REAL_ENGINE_RIGHTS_GATE_BOUNDARY_FIELDS = new Set([
  "licensed_voice_source_required",
  "unverified_rights_not_ready",
  "operator_attention_on_unverified_rights",
  "safe_status_only",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_audio",
  "no_vendor_diagnostics",
]);
const TTS_REAL_ENGINE_PACKET_DRY_RUN_BOUNDARY_FIELDS = new Set([
  "safe_fields_only",
  "no_raw_audio_generated",
  "no_vendor_call",
  "no_endpoint_display",
  "voice_model_locale_status_only",
  "no_token_values",
  "no_vendor_diagnostics",
]);
const LIVE2D_REAL_RENDERER_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS = new Set([
  "renderer_status_cue_capability_model_status_only",
  "endpoint_values_redacted",
  "path_values_redacted",
  "cue_payload_redacted",
  "safe_status_only",
]);
const LIVE2D_REAL_RENDERER_FRESHNESS_GUARD_BOUNDARY_FIELDS = new Set([
  "stale_heartbeat_not_ready",
  "stale_render_pickup_not_ready",
  "fresh_heartbeat_and_pickup_required",
  "safe_status_only",
  "endpoint_values_redacted",
  "path_values_redacted",
  "cue_payload_redacted",
]);
const LIVE2D_REAL_RENDERER_CUE_VALIDATION_BOUNDARY_FIELDS = new Set([
  "expression_gaze_breath_motion_allowlist",
  "unsupported_cue_rejected",
  "renderer_payload_rejected",
  "safe_cue_kind_only",
  "endpoint_values_redacted",
  "path_values_redacted",
  "cue_payload_redacted",
]);
const LIVE2D_REAL_RENDERER_RECOVERY_REQUIREMENT_BOUNDARY_FIELDS = new Set([
  "closeup_laugh_scream_strong_motion_require_recovery",
  "missing_recovery_rejected",
  "renderer_payload_rejected",
  "safe_intensity_label_only",
  "endpoint_values_redacted",
  "path_values_redacted",
  "cue_payload_redacted",
]);
const LIVE2D_REAL_RENDERER_E2E_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "stale_heartbeat_not_ready",
  "unsupported_cue_rejected",
  "missing_recovery_rejected",
  "model_path_redacted",
  "safe_summary_only",
  "endpoint_values_redacted",
  "path_values_redacted",
  "cue_payload_redacted",
]);
const LIVE2D_REAL_RENDERER_MODEL_PATH_LEAK_FIXTURE_BOUNDARY_FIELDS = new Set([
  "model_path_redacted",
  "safe_status_only",
  "endpoint_values_redacted",
  "path_values_redacted",
  "cue_payload_redacted",
]);
const OBS_REAL_PICKUP_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS = new Set([
  "browser_source_pickup_manifest_heartbeat_status_only",
  "url_values_redacted",
  "credential_values_redacted",
  "raw_event_redacted",
  "safe_status_only",
]);
const OBS_REAL_PICKUP_FRESHNESS_GUARD_BOUNDARY_FIELDS = new Set([
  "stale_pickup_not_ready",
  "stale_pickup_runtime_waiting",
  "fresh_pickup_required_for_ready",
  "safe_status_only",
  "url_values_redacted",
  "credential_values_redacted",
  "raw_event_redacted",
]);
const OBS_REAL_PICKUP_ARTIFACT_VALIDATION_BOUNDARY_FIELDS = new Set([
  "fresh_artifact_required_for_ready",
  "schema_match_required_for_ready",
  "stale_or_mismatch_not_ready",
  "safe_status_only",
  "artifact_body_redacted",
  "artifact_path_redacted",
  "raw_event_redacted",
]);
const OBS_REAL_PICKUP_MUTATION_CONFIRMATION_BOUNDARY_FIELDS = new Set([
  "scene_source_mutation_requires_confirmation",
  "unconfirmed_mutation_not_executed",
  "safe_mutation_label_only",
  "url_values_redacted",
  "credential_values_redacted",
  "raw_event_redacted",
  "raw_command_redacted",
]);
const OBS_REAL_PICKUP_E2E_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "stale_pickup_not_ready",
  "missing_browser_source_not_ready",
  "event_payload_redacted",
  "unconfirmed_mutation_not_executed",
  "safe_summary_only",
  "url_values_redacted",
  "credential_values_redacted",
]);
const OBS_REAL_PICKUP_EVENT_LEAK_FIXTURE_BOUNDARY_FIELDS = new Set([
  "event_payload_redacted",
  "safe_status_only",
  "url_values_redacted",
  "credential_values_redacted",
]);
const DB_REAL_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS = new Set([
  "configured_status_schema_index_migration_backup_only",
  "connection_string_redacted",
  "password_values_redacted",
  "host_values_redacted",
  "safe_status_only",
]);
const DB_REAL_CONNECTOR_AVAILABILITY_GATE_BOUNDARY_FIELDS = new Set([
  "real_db_connection_required",
  "unconnected_db_not_production_ready",
  "blocked_or_attention_on_unavailable",
  "connection_string_redacted",
  "password_values_redacted",
  "host_values_redacted",
  "safe_status_only",
]);
const DB_REAL_CONNECTOR_SCHEMA_FRESHNESS_BOUNDARY_FIELDS = new Set([
  "fresh_schema_manifest_required",
  "unconfirmed_schema_not_ready",
  "stale_schema_attention_required",
  "connection_string_redacted",
  "password_values_redacted",
  "host_values_redacted",
  "safe_status_only",
]);
const DB_REAL_CONNECTOR_MIGRATION_READINESS_BOUNDARY_FIELDS = new Set([
  "migration_applied_required",
  "pending_migration_not_ready",
  "missing_migration_not_ready",
  "raw_sql_redacted",
  "connection_string_redacted",
  "password_values_redacted",
  "host_values_redacted",
  "safe_status_only",
]);
const GAME_REAL_ADAPTER_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS = new Set([
  "mode_safe_map_manual_approval_cooldown_status_only",
  "raw_key_map_redacted",
  "os_command_redacted",
  "safe_status_only",
  "endpoint_values_redacted",
  "credential_values_redacted",
]);
const GAME_REAL_ADAPTER_MANUAL_APPROVAL_GATE_BOUNDARY_FIELDS = new Set([
  "manual_approval_requires_operator_cue",
  "missing_approval_not_real_ready",
  "raw_key_map_redacted",
  "os_command_redacted",
  "safe_status_only",
  "endpoint_values_redacted",
  "credential_values_redacted",
]);
const GAME_REAL_ADAPTER_APPROVED_SAFE_MODE_GATE_BOUNDARY_FIELDS = new Set([
  "approved_safe_adapter_requires_fresh_adapter",
  "safe_map_required",
  "emergency_stop_required",
  "audit_readiness_required",
  "raw_key_map_redacted",
  "os_command_redacted",
  "safe_status_only",
]);
const GAME_REAL_ADAPTER_EMERGENCY_STOP_REQUIREMENT_BOUNDARY_FIELDS = new Set([
  "emergency_stop_required",
  "unconfirmed_stop_not_real_ready",
  "raw_key_map_redacted",
  "os_command_redacted",
  "safe_status_only",
  "endpoint_values_redacted",
  "credential_values_redacted",
]);
const GAME_REAL_ADAPTER_E2E_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "missing_safe_map_not_ready",
  "manual_approval_required",
  "stale_adapter_not_ready",
  "emergency_stop_required",
  "command_payload_redacted",
  "safe_summary_only",
  "raw_key_map_redacted",
  "os_command_redacted",
]);
const GAME_REAL_ADAPTER_COMMAND_LEAK_FIXTURE_BOUNDARY_FIELDS = new Set([
  "command_payload_redacted",
  "raw_key_map_redacted",
  "os_command_redacted",
  "safe_status_only",
]);
const YOUTUBE_REAL_INGEST_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS = new Set([
  "oauth_chat_polling_dedupe_moderation_status_only",
  "token_values_redacted",
  "raw_api_response_redacted",
  "endpoint_values_redacted",
  "safe_status_only",
]);
const YOUTUBE_REAL_INGEST_TOKEN_FRESHNESS_GUARD_BOUNDARY_FIELDS = new Set([
  "fresh_token_required_for_ready",
  "expired_token_not_ready",
  "missing_token_blocked",
  "token_values_redacted",
  "raw_api_response_redacted",
  "endpoint_values_redacted",
  "safe_status_only",
]);
const YOUTUBE_REAL_INGEST_LIVE_CHAT_FRESHNESS_GUARD_BOUNDARY_FIELDS = new Set([
  "fresh_discovery_required_for_ready",
  "stale_discovery_not_ready",
  "missing_discovery_blocked",
  "raw_chat_id_redacted",
  "raw_api_response_redacted",
  "endpoint_values_redacted",
  "safe_status_only",
]);
const YOUTUBE_REAL_INGEST_MODERATION_READINESS_BOUNDARY_FIELDS = new Set([
  "moderation_confirmed_required_for_personalization",
  "moderation_confirmed_required_for_relationship_growth",
  "unconfirmed_moderation_not_ready",
  "raw_terms_redacted",
  "raw_comment_redacted",
  "private_note_redacted",
  "safe_status_only",
]);
const YOUTUBE_REAL_INGEST_E2E_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "expired_token_not_ready",
  "stale_chat_not_ready",
  "moderation_missing_not_ready",
  "raw_api_response_redacted",
  "token_values_redacted",
  "safe_summary_only",
]);
const YOUTUBE_REAL_INGEST_RAW_API_LEAK_FIXTURE_BOUNDARY_FIELDS = new Set([
  "raw_api_response_redacted",
  "token_values_redacted",
  "endpoint_values_redacted",
  "safe_status_only",
]);
const REQUIRED_STATUS_FIELDS = [
  "adapter_label",
  "preflight_status",
  "fixture_pass",
  "real_ready",
];
const FORBIDDEN_PUBLIC_FIELDS = [
  "secret",
  "token",
  "endpoint",
  "raw_payload",
  "candidate",
  "commit",
];
const ROUTE_LABELS = new Set(["normal", "review", "adapter", "public", "admin"]);
const ADMIN_VIEW_ROLES = new Set(["ordinary", "owner", "operator"]);
const LIVE2D_REAL_RENDERER_CUE_KINDS = new Set([
  "expression",
  "gaze",
  "breath",
  "motion",
]);
const LIVE2D_REAL_RENDERER_RECOVERY_REQUIRED_INTENSITIES = new Set([
  "closeup",
  "laugh",
  "scream",
  "strong_motion",
]);
const SAFE_ERROR_CODES = new Set([
  "dependency_missing",
  "unsupported_schema",
  "stale_packet",
  "trace_missing",
  "unsafe_field_rejected",
  "adapter_attention_required",
]);
const ADMIN_PAGE_ADAPTER_LABELS = ["tts", "live2d", "obs", "game", "youtube"];
const REAL_HANDSHAKE_ADAPTER_LABELS = ["tts", "live2d", "obs", "game", "youtube", "db"];
const REAL_HANDSHAKE_REQUIRED_FIELDS = [
  "trace_id",
  "component",
  "timestamp_ms",
  "status",
];
const REAL_HANDSHAKE_FORBIDDEN_SUMMARY_FIELDS = [
  "endpoint",
  "token",
  "credential",
  "raw_vendor_response",
  "internal_path",
];
const REAL_ADAPTER_CAPABILITY_LABELS = new Set([
  "speech",
  "motion",
  "scene_status",
  "safe_input",
  "ingest",
  "persistence",
]);
const UNSAFE_TEXT_PATTERN =
  /\b(secret|token|endpoint|credential|raw[_-]?payload|raw[_-]?vendor[_-]?response|raw[_-]?command|schema[_-]?secret|internal[_-]?path|candidate|commit|world_command)\s*[:=]|https?:\/\/|postgres:\/\//i;

export function createAdapterPreflightContractRegistry({
  adapters = [...ADAPTER_LABELS],
} = {}) {
  const contracts = [...new Set((Array.isArray(adapters) ? adapters : [])
    .map((adapter) => safeAdapterLabel(adapter))
    .filter(Boolean))]
    .sort()
    .map((adapterLabel) => createAdapterPreflightContract(adapterLabel));
  const registry = {
    schema: REGISTRY_SCHEMA,
    registry_status: "adapter_preflight_contracts_ready",
    adapter_count: contracts.length,
    adapter_contracts: contracts,
    boundary_policy: {
      safe_manifest_only: true,
      adapter_labels_only: true,
      no_endpoint_values: true,
      no_token_values: true,
      no_raw_payloads: true,
      no_candidate_payloads: true,
      no_commit_payloads: true,
    },
  };
  assertAdapterPreflightContractRegistrySafe(registry);
  return registry;
}

export function assertAdapterPreflightContractRegistrySafe(
  registry,
  context = "adapter preflight contract registry"
) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    throw new ContractError(`${context}: registry required`);
  }
  if (registry.schema !== REGISTRY_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(registry)) {
    if (!REGISTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected registry field`);
    }
  }
  if (registry.registry_status !== "adapter_preflight_contracts_ready") {
    throw new ContractError(`${context}: invalid registry status`);
  }
  if (!Array.isArray(registry.adapter_contracts)) {
    throw new ContractError(`${context}: adapter contracts required`);
  }
  if (registry.adapter_count !== registry.adapter_contracts.length) {
    throw new ContractError(`${context}: adapter count mismatch`);
  }
  const seen = new Set();
  for (const contract of registry.adapter_contracts) {
    assertAdapterPreflightContractSafe(contract, context);
    if (seen.has(contract.adapter_label)) {
      throw new ContractError(`${context}: duplicate adapter label`);
    }
    seen.add(contract.adapter_label);
  }
  for (const adapterLabel of ADAPTER_LABELS) {
    if (!seen.has(adapterLabel)) {
      throw new ContractError(`${context}: missing adapter contract`);
    }
  }
  assertBoundaryPolicy(registry.boundary_policy, context);
  assertNoUnsafeText(registry, context);
}

export function createRealAdapterHandshakeContractManifest({
  adapters = REAL_HANDSHAKE_ADAPTER_LABELS,
} = {}) {
  const contracts = [...new Set((Array.isArray(adapters) ? adapters : [])
    .map((adapter) => safeRealHandshakeAdapterLabel(adapter))
    .filter(Boolean))]
    .sort()
    .map((adapterLabel) => createRealAdapterHandshakeContract(adapterLabel));
  const manifest = {
    schema: "iris_real_adapter_handshake_contract_manifest_v1",
    manifest_status: "real_handshake_contracts_ready",
    adapter_count: contracts.length,
    handshake_contracts: contracts,
    boundary_policy: Object.fromEntries(
      [...REAL_HANDSHAKE_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
    adapter_validation_required: true,
  };
  assertRealAdapterHandshakeContractManifestSafe(manifest);
  return manifest;
}

export function assertRealAdapterHandshakeContractManifestSafe(
  manifest,
  context = "real adapter handshake contract manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest required`);
  }
  if (
    manifest.schema !== "iris_real_adapter_handshake_contract_manifest_v1" ||
    manifest.manifest_status !== "real_handshake_contracts_ready" ||
    manifest.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid manifest`);
  }
  for (const field of Object.keys(manifest)) {
    if (!REAL_HANDSHAKE_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`);
    }
  }
  if (!Array.isArray(manifest.handshake_contracts)) {
    throw new ContractError(`${context}: contracts required`);
  }
  if (manifest.adapter_count !== manifest.handshake_contracts.length) {
    throw new ContractError(`${context}: adapter count mismatch`);
  }
  const seen = new Set();
  for (const contract of manifest.handshake_contracts) {
    assertRealAdapterHandshakeContractSafe(contract, context);
    if (seen.has(contract.adapter_label)) {
      throw new ContractError(`${context}: duplicate adapter label`);
    }
    seen.add(contract.adapter_label);
  }
  for (const adapterLabel of REAL_HANDSHAKE_ADAPTER_LABELS) {
    if (!seen.has(adapterLabel)) {
      throw new ContractError(`${context}: missing adapter contract`);
    }
  }
  assertRealHandshakeBoundaryPolicy(manifest.boundary_policy, context);
  assertNoUnsafeText(manifest, context);
}

export function createRealAdapterHandshakeSafeSummary({
  adapter = "tts",
  status = "attention_required",
} = {}) {
  const safeStatus = safeHandshakeStatus(status);
  const summary = {
    schema: "iris_real_adapter_handshake_safe_summary_v1",
    adapter_label: safeRealHandshakeAdapterLabel(adapter) ?? "tts",
    handshake_status: safeStatus,
    safe_status: safeStatus,
    redaction_status: "redacted",
    boundary_policy: Object.fromEntries(
      [...REAL_HANDSHAKE_SAFE_SUMMARY_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRealAdapterHandshakeSafeSummarySafe(summary);
  return summary;
}

export function assertRealAdapterHandshakeSafeSummarySafe(
  summary,
  context = "real adapter handshake safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_real_adapter_handshake_safe_summary_v1") {
    throw new ContractError(`${context}: invalid summary schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!REAL_HANDSHAKE_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (!REAL_HANDSHAKE_ADAPTER_LABELS.includes(summary.adapter_label)) {
    throw new ContractError(`${context}: invalid adapter label`);
  }
  if (
    !["ok", "attention_required", "blocked", "degraded"].includes(
      summary.handshake_status
    ) ||
    summary.safe_status !== summary.handshake_status ||
    summary.redaction_status !== "redacted" ||
    summary.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid summary status`);
  }
  assertRealHandshakeSafeSummaryBoundaryPolicy(summary.boundary_policy, context);
  assertNoUnsafeText(summary, context);
}

export function createRealAdapterHandshakeTimeoutClassification({
  adapter = "tts",
  timedOut = true,
  classification = "attention",
} = {}) {
  const timeoutDetected = timedOut !== false;
  const safeClassification = safeHandshakeTimeoutClassification(classification);
  const resultClassification = timeoutDetected ? safeClassification : "degraded";
  const summary = {
    schema: "iris_real_adapter_handshake_timeout_classification_v1",
    adapter_label: safeRealHandshakeAdapterLabel(adapter) ?? "tts",
    timeout_detected: timeoutDetected,
    classification: resultClassification,
    ready_allowed: false,
    safe_status: resultClassification === "BLOCKED" ? "blocked" : resultClassification,
    boundary_policy: Object.fromEntries(
      [...REAL_HANDSHAKE_TIMEOUT_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
    adapter_validation_required: true,
  };
  assertRealAdapterHandshakeTimeoutClassificationSafe(summary);
  return summary;
}

export function assertRealAdapterHandshakeTimeoutClassificationSafe(
  summary,
  context = "real adapter handshake timeout classification"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (
    summary.schema !== "iris_real_adapter_handshake_timeout_classification_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!REAL_HANDSHAKE_TIMEOUT_CLASSIFICATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (!REAL_HANDSHAKE_ADAPTER_LABELS.includes(summary.adapter_label)) {
    throw new ContractError(`${context}: invalid adapter label`);
  }
  if (
    typeof summary.timeout_detected !== "boolean" ||
    !["attention", "BLOCKED", "degraded"].includes(summary.classification) ||
    summary.ready_allowed !== false ||
    !["attention", "blocked", "degraded"].includes(summary.safe_status)
  ) {
    throw new ContractError(`${context}: invalid timeout classification`);
  }
  if (
    summary.timeout_detected === true &&
    summary.classification === "ready"
  ) {
    throw new ContractError(`${context}: timeout cannot be ready`);
  }
  if (
    summary.safe_status !==
    (summary.classification === "BLOCKED" ? "blocked" : summary.classification)
  ) {
    throw new ContractError(`${context}: safe status mismatch`);
  }
  assertRealHandshakeTimeoutBoundaryPolicy(summary.boundary_policy, context);
  assertNoUnsafeText(summary, context);
}

export function createRealAdapterHandshakeStaleSuccessGuard({
  adapter = "tts",
  ageBucket = "stale",
  fixtureCached = false,
} = {}) {
  const safeAgeBucket = ageBucket === "fresh" ? "fresh" : "stale";
  const cached = fixtureCached === true;
  const accepted = safeAgeBucket === "fresh" && cached === false;
  const guard = {
    schema: "iris_real_adapter_handshake_stale_success_guard_v1",
    adapter_label: safeRealHandshakeAdapterLabel(adapter) ?? "tts",
    success_age_bucket: safeAgeBucket,
    fixture_cached: cached,
    real_success_accepted: accepted,
    handshake_status: accepted ? "ok" : "attention_required",
    ready_allowed: accepted,
    boundary_policy: Object.fromEntries(
      [...REAL_HANDSHAKE_STALE_SUCCESS_GUARD_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRealAdapterHandshakeStaleSuccessGuardSafe(guard);
  return guard;
}

export function assertRealAdapterHandshakeStaleSuccessGuardSafe(
  guard,
  context = "real adapter handshake stale success guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  if (guard.schema !== "iris_real_adapter_handshake_stale_success_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(guard)) {
    if (!REAL_HANDSHAKE_STALE_SUCCESS_GUARD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected guard field`);
    }
  }
  if (!REAL_HANDSHAKE_ADAPTER_LABELS.includes(guard.adapter_label)) {
    throw new ContractError(`${context}: invalid adapter label`);
  }
  if (
    !["fresh", "stale"].includes(guard.success_age_bucket) ||
    typeof guard.fixture_cached !== "boolean" ||
    typeof guard.real_success_accepted !== "boolean" ||
    !["ok", "attention_required"].includes(guard.handshake_status) ||
    typeof guard.ready_allowed !== "boolean" ||
    guard.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid guard`);
  }
  const accepted =
    guard.success_age_bucket === "fresh" && guard.fixture_cached === false;
  if (
    guard.real_success_accepted !== accepted ||
    guard.ready_allowed !== accepted ||
    guard.handshake_status !== (accepted ? "ok" : "attention_required")
  ) {
    throw new ContractError(`${context}: stale or cached success cannot be ready`);
  }
  assertRealHandshakeStaleSuccessBoundaryPolicy(guard.boundary_policy, context);
  assertNoUnsafeText(guard, context);
}

export function createRealAdapterHandshakeTraceCorrelation({
  traceId,
  component,
  timestampMs,
  status = "attention_required",
} = {}) {
  const timestamp =
    Number.isInteger(timestampMs) && timestampMs >= 0 ? timestampMs : null;
  if (timestamp === null) {
    throw new ContractError(
      "real adapter handshake trace correlation: timestamp required"
    );
  }
  const result = {
    schema: "iris_real_adapter_handshake_trace_correlation_v1",
    trace_id: safeTraceId(traceId),
    component: safeRequiredRealHandshakeAdapterLabel(component),
    timestamp_ms: timestamp,
    status: safeHandshakeStatus(status),
    trace_status: "trace_correlated",
    boundary_policy: Object.fromEntries(
      [...REAL_HANDSHAKE_TRACE_CORRELATION_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRealAdapterHandshakeTraceCorrelationSafe(result);
  return result;
}

export function assertRealAdapterHandshakeTraceCorrelationSafe(
  result,
  context = "real adapter handshake trace correlation"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result required`);
  }
  if (result.schema !== "iris_real_adapter_handshake_trace_correlation_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(result)) {
    if (!REAL_HANDSHAKE_TRACE_CORRELATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected result field`);
    }
  }
  if (
    !isSafeTraceId(result.trace_id) ||
    !REAL_HANDSHAKE_ADAPTER_LABELS.includes(result.component) ||
    !Number.isInteger(result.timestamp_ms) ||
    result.timestamp_ms < 0 ||
    !["ok", "attention_required", "blocked", "degraded"].includes(result.status) ||
    result.trace_status !== "trace_correlated" ||
    result.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid trace correlation`);
  }
  assertRealHandshakeTraceCorrelationBoundaryPolicy(
    result.boundary_policy,
    context
  );
  assertNoUnsafeText(result, context);
}

export function createRealAdapterCapabilitySummary({
  adapter = "tts",
  capabilities = [],
} = {}) {
  const labels = [...new Set((Array.isArray(capabilities) ? capabilities : [])
    .map((capability) => safeRealAdapterCapabilityLabel(capability))
    .filter(Boolean))]
    .sort();
  const summary = {
    schema: "iris_real_adapter_capability_summary_v1",
    adapter_label: safeRealHandshakeAdapterLabel(adapter) ?? "tts",
    capability_status: labels.length > 0 ? "available" : "missing",
    capability_count: labels.length,
    capability_labels: labels,
    boundary_policy: Object.fromEntries(
      [...REAL_ADAPTER_CAPABILITY_SUMMARY_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRealAdapterCapabilitySummarySafe(summary);
  return summary;
}

export function assertRealAdapterCapabilitySummarySafe(
  summary,
  context = "real adapter capability summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_real_adapter_capability_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!REAL_ADAPTER_CAPABILITY_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (
    !REAL_HANDSHAKE_ADAPTER_LABELS.includes(summary.adapter_label) ||
    !["available", "missing"].includes(summary.capability_status) ||
    !Number.isInteger(summary.capability_count) ||
    !Array.isArray(summary.capability_labels)
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  for (const capability of summary.capability_labels) {
    if (!REAL_ADAPTER_CAPABILITY_LABELS.has(capability)) {
      throw new ContractError(`${context}: invalid capability label`);
    }
  }
  if (
    summary.capability_count !== summary.capability_labels.length ||
    summary.capability_status !==
      (summary.capability_labels.length > 0 ? "available" : "missing")
  ) {
    throw new ContractError(`${context}: capability count mismatch`);
  }
  assertRealAdapterCapabilitySummaryBoundaryPolicy(
    summary.boundary_policy,
    context
  );
  assertNoUnsafeText(summary, context);
}

export function createRealAdapterUnsupportedCapabilityDegrade({
  adapter = "tts",
  capability = "unsupported",
} = {}) {
  const degrade = {
    schema: "iris_real_adapter_unsupported_capability_degrade_v1",
    adapter_label: safeRealHandshakeAdapterLabel(adapter) ?? "tts",
    capability_label: safeUnsupportedCapabilityLabel(capability),
    capability_status: "unsupported_degraded",
    adapter_payload_allowed: false,
    safe_status: "degraded",
    boundary_policy: Object.fromEntries(
      [...REAL_ADAPTER_UNSUPPORTED_CAPABILITY_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRealAdapterUnsupportedCapabilityDegradeSafe(degrade);
  return degrade;
}

export function assertRealAdapterUnsupportedCapabilityDegradeSafe(
  degrade,
  context = "real adapter unsupported capability degrade"
) {
  if (!degrade || typeof degrade !== "object" || Array.isArray(degrade)) {
    throw new ContractError(`${context}: degrade summary required`);
  }
  if (degrade.schema !== "iris_real_adapter_unsupported_capability_degrade_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(degrade)) {
    if (!REAL_ADAPTER_UNSUPPORTED_CAPABILITY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected degrade field`);
    }
  }
  if (
    !REAL_HANDSHAKE_ADAPTER_LABELS.includes(degrade.adapter_label) ||
    !isSafeUnsupportedCapabilityLabel(degrade.capability_label) ||
    degrade.capability_status !== "unsupported_degraded" ||
    degrade.adapter_payload_allowed !== false ||
    degrade.safe_status !== "degraded" ||
    degrade.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid unsupported capability degrade`);
  }
  assertRealAdapterUnsupportedCapabilityBoundaryPolicy(
    degrade.boundary_policy,
    context
  );
  assertNoUnsafeText(degrade, context);
}

export function createRealAdapterReadinessGate({
  adapter = "tts",
  freshHandshake = false,
  capabilityStatus = "missing",
  safeConfigStatus = "attention",
} = {}) {
  const handshakeFresh = freshHandshake === true;
  const safeCapabilityStatus =
    capabilityStatus === "available" ? "available" : "missing";
  const safeConfig = safeConfigStatus === "safe" ? "safe" : "attention";
  const ready =
    handshakeFresh && safeCapabilityStatus === "available" && safeConfig === "safe";
  const gate = {
    schema: "iris_real_adapter_readiness_gate_v1",
    adapter_label: safeRealHandshakeAdapterLabel(adapter) ?? "tts",
    fresh_handshake: handshakeFresh,
    capability_status: safeCapabilityStatus,
    safe_config_status: safeConfig,
    readiness_status: ready ? "ready" : "attention_required",
    ready_allowed: ready,
    boundary_policy: Object.fromEntries(
      [...REAL_ADAPTER_READINESS_GATE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRealAdapterReadinessGateSafe(gate);
  return gate;
}

export function assertRealAdapterReadinessGateSafe(
  gate,
  context = "real adapter readiness gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  if (gate.schema !== "iris_real_adapter_readiness_gate_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(gate)) {
    if (!REAL_ADAPTER_READINESS_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`);
    }
  }
  if (
    !REAL_HANDSHAKE_ADAPTER_LABELS.includes(gate.adapter_label) ||
    typeof gate.fresh_handshake !== "boolean" ||
    !["available", "missing"].includes(gate.capability_status) ||
    !["safe", "attention"].includes(gate.safe_config_status) ||
    !["ready", "attention_required"].includes(gate.readiness_status) ||
    typeof gate.ready_allowed !== "boolean" ||
    gate.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const ready =
    gate.fresh_handshake === true &&
    gate.capability_status === "available" &&
    gate.safe_config_status === "safe";
  if (
    gate.ready_allowed !== ready ||
    gate.readiness_status !== (ready ? "ready" : "attention_required")
  ) {
    throw new ContractError(`${context}: readiness gate mismatch`);
  }
  assertRealAdapterReadinessGateBoundaryPolicy(gate.boundary_policy, context);
  assertNoUnsafeText(gate, context);
}

export function createRealAdapterDryRunSummary({
  adapter = "tts",
  status = "attention_required",
} = {}) {
  const safeStatus = safeHandshakeStatus(status);
  const summary = {
    schema: "iris_real_adapter_dry_run_summary_v1",
    adapter_label: safeRealHandshakeAdapterLabel(adapter) ?? "tts",
    dry_run_status: "dry_run_summary_only",
    safe_status: safeStatus === "ok" ? "degraded" : safeStatus,
    real_execution_performed: false,
    execution_reported: false,
    boundary_policy: Object.fromEntries(
      [...REAL_ADAPTER_DRY_RUN_SUMMARY_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRealAdapterDryRunSummarySafe(summary);
  return summary;
}

export function assertRealAdapterDryRunSummarySafe(
  summary,
  context = "real adapter dry-run summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_real_adapter_dry_run_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!REAL_ADAPTER_DRY_RUN_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (
    !REAL_HANDSHAKE_ADAPTER_LABELS.includes(summary.adapter_label) ||
    summary.dry_run_status !== "dry_run_summary_only" ||
    !["attention_required", "blocked", "degraded"].includes(summary.safe_status) ||
    summary.real_execution_performed !== false ||
    summary.execution_reported !== false ||
    summary.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid dry-run summary`);
  }
  assertRealAdapterDryRunSummaryBoundaryPolicy(summary.boundary_policy, context);
  assertNoUnsafeText(summary, context);
}

export function createRealAdapterE2EFixturePack() {
  const timeoutFixture = createRealAdapterHandshakeTimeoutClassification({
    adapter: "tts",
    timedOut: true,
    classification: "attention",
  });
  const staleFixture = createRealAdapterHandshakeStaleSuccessGuard({
    adapter: "obs",
    ageBucket: "stale",
    fixtureCached: true,
  });
  const capabilityMissingFixture = createRealAdapterReadinessGate({
    adapter: "db",
    freshHandshake: true,
    capabilityStatus: "missing",
    safeConfigStatus: "safe",
  });
  const unsupportedFixture = createRealAdapterUnsupportedCapabilityDegrade({
    adapter: "game",
    capability: "macro_mode",
  });
  const dryRunFixture = createRealAdapterDryRunSummary({
    adapter: "youtube",
    status: "ok",
  });
  const secretLeakFixture = createRealAdapterSecretLeakFixture({
    adapter: "live2d",
  });
  const pack = {
    schema: "iris_real_adapter_e2e_fixture_pack_v1",
    pack_status: "guarded",
    fixture_count: 6,
    timeout_fixture: timeoutFixture,
    stale_fixture: staleFixture,
    capability_missing_fixture: capabilityMissingFixture,
    unsupported_fixture: unsupportedFixture,
    dry_run_fixture: dryRunFixture,
    secret_leak_fixture: secretLeakFixture,
    boundary_policy: Object.fromEntries(
      [...REAL_ADAPTER_E2E_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRealAdapterE2EFixturePackSafe(pack);
  return pack;
}

export function assertRealAdapterE2EFixturePackSafe(
  pack,
  context = "real adapter E2E fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  if (pack.schema !== "iris_real_adapter_e2e_fixture_pack_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(pack)) {
    if (!REAL_ADAPTER_E2E_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (
    pack.pack_status !== "guarded" ||
    pack.fixture_count !== 6 ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid pack status`);
  }
  assertRealAdapterHandshakeTimeoutClassificationSafe(
    pack.timeout_fixture,
    `${context}: timeout fixture`
  );
  assertRealAdapterHandshakeStaleSuccessGuardSafe(
    pack.stale_fixture,
    `${context}: stale fixture`
  );
  assertRealAdapterReadinessGateSafe(
    pack.capability_missing_fixture,
    `${context}: capability missing fixture`
  );
  assertRealAdapterUnsupportedCapabilityDegradeSafe(
    pack.unsupported_fixture,
    `${context}: unsupported fixture`
  );
  assertRealAdapterDryRunSummarySafe(
    pack.dry_run_fixture,
    `${context}: dry-run fixture`
  );
  assertRealAdapterSecretLeakFixtureSafe(
    pack.secret_leak_fixture,
    `${context}: secret leak fixture`
  );
  if (
    pack.timeout_fixture.ready_allowed !== false ||
    pack.stale_fixture.ready_allowed !== false ||
    pack.capability_missing_fixture.ready_allowed !== false ||
    pack.unsupported_fixture.adapter_payload_allowed !== false ||
    pack.dry_run_fixture.real_execution_performed !== false ||
    pack.secret_leak_fixture.leak_detected !== false
  ) {
    throw new ContractError(`${context}: fixture guard mismatch`);
  }
  assertRealAdapterE2EFixturePackBoundaryPolicy(pack.boundary_policy, context);
  assertNoUnsafeText(pack, context);
}

export function createTtsRealEngineConnectorPreflight({
  voiceStatus = "missing",
  modelStatus = "missing",
  localeStatus = "missing",
} = {}) {
  const voice = safeTtsConnectorStatus(voiceStatus);
  const model = safeTtsConnectorStatus(modelStatus);
  const locale = safeTtsConnectorStatus(localeStatus);
  const ready = [voice, model, locale].every((status) => status === "configured");
  const preflight = {
    schema: "iris_tts_real_engine_connector_preflight_v1",
    voice_status: voice,
    model_status: model,
    locale_status: locale,
    connector_status: ready ? "ready" : "attention_required",
    boundary_policy: Object.fromEntries(
      [...TTS_REAL_ENGINE_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertTtsRealEngineConnectorPreflightSafe(preflight);
  return preflight;
}

export function assertTtsRealEngineConnectorPreflightSafe(
  preflight,
  context = "TTS real engine connector preflight"
) {
  if (!preflight || typeof preflight !== "object" || Array.isArray(preflight)) {
    throw new ContractError(`${context}: preflight required`);
  }
  if (preflight.schema !== "iris_tts_real_engine_connector_preflight_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(preflight)) {
    if (!TTS_REAL_ENGINE_CONNECTOR_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected preflight field`);
    }
  }
  for (const field of ["voice_status", "model_status", "locale_status"]) {
    if (!["configured", "missing", "attention_required"].includes(preflight[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  const ready = [
    preflight.voice_status,
    preflight.model_status,
    preflight.locale_status,
  ].every((status) => status === "configured");
  if (
    preflight.connector_status !== (ready ? "ready" : "attention_required") ||
    preflight.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: connector status mismatch`);
  }
  assertTtsRealEngineConnectorPreflightBoundaryPolicy(
    preflight.boundary_policy,
    context
  );
  assertNoUnsafeText(preflight, context);
}

export function createTtsRealEngineFreshnessGuard({
  healthAgeBucket = "stale",
} = {}) {
  const ageBucket = healthAgeBucket === "fresh" ? "fresh" : "stale";
  const fresh = ageBucket === "fresh";
  const guard = {
    schema: "iris_tts_real_engine_freshness_guard_v1",
    engine_health_age_bucket: ageBucket,
    engine_health_status: fresh ? "fresh" : "stale_attention",
    ready_allowed: fresh,
    boundary_policy: Object.fromEntries(
      [...TTS_REAL_ENGINE_FRESHNESS_GUARD_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertTtsRealEngineFreshnessGuardSafe(guard);
  return guard;
}

export function assertTtsRealEngineFreshnessGuardSafe(
  guard,
  context = "TTS real engine freshness guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  if (guard.schema !== "iris_tts_real_engine_freshness_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(guard)) {
    if (!TTS_REAL_ENGINE_FRESHNESS_GUARD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected guard field`);
    }
  }
  if (
    !["fresh", "stale"].includes(guard.engine_health_age_bucket) ||
    !["fresh", "stale_attention"].includes(guard.engine_health_status) ||
    typeof guard.ready_allowed !== "boolean" ||
    guard.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid guard`);
  }
  const fresh = guard.engine_health_age_bucket === "fresh";
  if (
    guard.ready_allowed !== fresh ||
    guard.engine_health_status !== (fresh ? "fresh" : "stale_attention")
  ) {
    throw new ContractError(`${context}: stale health cannot be ready`);
  }
  assertTtsRealEngineFreshnessGuardBoundaryPolicy(
    guard.boundary_policy,
    context
  );
  assertNoUnsafeText(guard, context);
}

export function createTtsRealEnginePlaceholderSeparation({
  voiceSourceKind = "placeholder",
} = {}) {
  const sourceKind =
    voiceSourceKind === "licensed_real_voice"
      ? "licensed_real_voice"
      : "placeholder";
  const licensed = sourceKind === "licensed_real_voice";
  const summary = {
    schema: "iris_tts_real_engine_placeholder_separation_v1",
    voice_source_kind: sourceKind,
    licensed_real_voice: licensed,
    placeholder_voice: !licensed,
    real_licensed_ready: licensed,
    handoff_status: licensed ? "real_voice_ready" : "placeholder_separated",
    boundary_policy: Object.fromEntries(
      [...TTS_REAL_ENGINE_PLACEHOLDER_SEPARATION_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertTtsRealEnginePlaceholderSeparationSafe(summary);
  return summary;
}

export function assertTtsRealEnginePlaceholderSeparationSafe(
  summary,
  context = "TTS real engine placeholder separation"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_tts_real_engine_placeholder_separation_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!TTS_REAL_ENGINE_PLACEHOLDER_SEPARATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (
    !["placeholder", "licensed_real_voice"].includes(summary.voice_source_kind) ||
    typeof summary.licensed_real_voice !== "boolean" ||
    typeof summary.placeholder_voice !== "boolean" ||
    typeof summary.real_licensed_ready !== "boolean" ||
    !["placeholder_separated", "real_voice_ready"].includes(summary.handoff_status) ||
    summary.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  const licensed = summary.voice_source_kind === "licensed_real_voice";
  if (
    summary.licensed_real_voice !== licensed ||
    summary.placeholder_voice !== !licensed ||
    summary.real_licensed_ready !== licensed ||
    summary.handoff_status !== (licensed ? "real_voice_ready" : "placeholder_separated")
  ) {
    throw new ContractError(`${context}: placeholder cannot be real licensed ready`);
  }
  assertTtsRealEnginePlaceholderSeparationBoundaryPolicy(
    summary.boundary_policy,
    context
  );
  assertNoUnsafeText(summary, context);
}

export function createTtsRealEngineRightsGate({
  licensedVoiceSourceVerified = false,
} = {}) {
  const verified = licensedVoiceSourceVerified === true;
  const gate = {
    schema: "iris_tts_real_engine_rights_gate_v1",
    licensed_voice_source_verified: verified,
    rights_status: verified ? "licensed_verified" : "operator_attention_required",
    real_voice_handoff_ready: verified,
    operator_attention_required: !verified,
    boundary_policy: Object.fromEntries(
      [...TTS_REAL_ENGINE_RIGHTS_GATE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertTtsRealEngineRightsGateSafe(gate);
  return gate;
}

export function assertTtsRealEngineRightsGateSafe(
  gate,
  context = "TTS real engine rights gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  if (gate.schema !== "iris_tts_real_engine_rights_gate_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(gate)) {
    if (!TTS_REAL_ENGINE_RIGHTS_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`);
    }
  }
  if (
    typeof gate.licensed_voice_source_verified !== "boolean" ||
    !["licensed_verified", "operator_attention_required"].includes(gate.rights_status) ||
    typeof gate.real_voice_handoff_ready !== "boolean" ||
    typeof gate.operator_attention_required !== "boolean" ||
    gate.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const verified = gate.licensed_voice_source_verified === true;
  if (
    gate.rights_status !== (verified ? "licensed_verified" : "operator_attention_required") ||
    gate.real_voice_handoff_ready !== verified ||
    gate.operator_attention_required !== !verified
  ) {
    throw new ContractError(`${context}: unverified rights cannot be ready`);
  }
  assertTtsRealEngineRightsGateBoundaryPolicy(gate.boundary_policy, context);
  assertNoUnsafeText(gate, context);
}

export function createTtsRealEnginePacketDryRun({
  voiceStatus = "configured",
  modelStatus = "configured",
  localeStatus = "configured",
} = {}) {
  const dryRun = {
    schema: "iris_tts_real_engine_packet_dry_run_v1",
    voice_status: safeTtsConnectorStatus(voiceStatus),
    model_status: safeTtsConnectorStatus(modelStatus),
    locale_status: safeTtsConnectorStatus(localeStatus),
    dry_run_status: "summary_only",
    audio_generated: false,
    vendor_call_performed: false,
    endpoint_exposed: false,
    boundary_policy: Object.fromEntries(
      [...TTS_REAL_ENGINE_PACKET_DRY_RUN_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertTtsRealEnginePacketDryRunSafe(dryRun);
  return dryRun;
}

export function assertTtsRealEnginePacketDryRunSafe(
  dryRun,
  context = "TTS real engine packet dry-run"
) {
  if (!dryRun || typeof dryRun !== "object" || Array.isArray(dryRun)) {
    throw new ContractError(`${context}: dry-run required`);
  }
  if (dryRun.schema !== "iris_tts_real_engine_packet_dry_run_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(dryRun)) {
    if (!TTS_REAL_ENGINE_PACKET_DRY_RUN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected dry-run field`);
    }
  }
  for (const field of ["voice_status", "model_status", "locale_status"]) {
    if (!["configured", "missing", "attention_required"].includes(dryRun[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    dryRun.dry_run_status !== "summary_only" ||
    dryRun.audio_generated !== false ||
    dryRun.vendor_call_performed !== false ||
    dryRun.endpoint_exposed !== false ||
    dryRun.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: unsafe dry-run result`);
  }
  assertTtsRealEnginePacketDryRunBoundaryPolicy(dryRun.boundary_policy, context);
  assertNoUnsafeText(dryRun, context);
}

export function createLive2dRealRendererConnectorPreflight({
  rendererStatus = "missing",
  cueCapabilityStatus = "missing",
  modelConfiguredStatus = "missing",
} = {}) {
  const renderer = safeLive2dRendererStatus(rendererStatus);
  const cueCapability = safeLive2dRendererStatus(cueCapabilityStatus);
  const modelConfigured = safeLive2dRendererStatus(modelConfiguredStatus);
  const ready = [renderer, cueCapability, modelConfigured].every(
    (status) => status === "configured"
  );
  const preflight = {
    schema: "iris_live2d_real_renderer_connector_preflight_v1",
    renderer_status: renderer,
    cue_capability_status: cueCapability,
    model_configured_status: modelConfigured,
    preflight_status: ready ? "ready" : "attention_required",
    boundary_policy: Object.fromEntries(
      [...LIVE2D_REAL_RENDERER_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertLive2dRealRendererConnectorPreflightSafe(preflight);
  return preflight;
}

export function assertLive2dRealRendererConnectorPreflightSafe(
  preflight,
  context = "Live2D real renderer connector preflight"
) {
  if (!preflight || typeof preflight !== "object" || Array.isArray(preflight)) {
    throw new ContractError(`${context}: preflight required`);
  }
  if (preflight.schema !== "iris_live2d_real_renderer_connector_preflight_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(preflight)) {
    if (!LIVE2D_REAL_RENDERER_CONNECTOR_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected preflight field`);
    }
  }
  for (const field of [
    "renderer_status",
    "cue_capability_status",
    "model_configured_status",
  ]) {
    if (!["configured", "missing", "attention_required"].includes(preflight[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  const ready = [
    preflight.renderer_status,
    preflight.cue_capability_status,
    preflight.model_configured_status,
  ].every((status) => status === "configured");
  if (
    preflight.preflight_status !== (ready ? "ready" : "attention_required") ||
    preflight.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: preflight status mismatch`);
  }
  assertLive2dRealRendererConnectorPreflightBoundaryPolicy(
    preflight.boundary_policy,
    context
  );
  assertNoUnsafeText(preflight, context);
}

export function createLive2dRealRendererFreshnessGuard({
  heartbeatAgeBucket = "stale",
  renderPickupAgeBucket = "stale",
} = {}) {
  const heartbeat = heartbeatAgeBucket === "fresh" ? "fresh" : "stale";
  const pickup = renderPickupAgeBucket === "fresh" ? "fresh" : "stale";
  const ready = heartbeat === "fresh" && pickup === "fresh";
  const guard = {
    schema: "iris_live2d_real_renderer_freshness_guard_v1",
    heartbeat_age_bucket: heartbeat,
    render_pickup_age_bucket: pickup,
    renderer_status: ready ? "fresh" : "stale_attention",
    ready_allowed: ready,
    boundary_policy: Object.fromEntries(
      [...LIVE2D_REAL_RENDERER_FRESHNESS_GUARD_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertLive2dRealRendererFreshnessGuardSafe(guard);
  return guard;
}

export function assertLive2dRealRendererFreshnessGuardSafe(
  guard,
  context = "Live2D real renderer freshness guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  if (guard.schema !== "iris_live2d_real_renderer_freshness_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(guard)) {
    if (!LIVE2D_REAL_RENDERER_FRESHNESS_GUARD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected guard field`);
    }
  }
  if (
    !["fresh", "stale"].includes(guard.heartbeat_age_bucket) ||
    !["fresh", "stale"].includes(guard.render_pickup_age_bucket) ||
    !["fresh", "stale_attention"].includes(guard.renderer_status) ||
    typeof guard.ready_allowed !== "boolean" ||
    guard.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid guard`);
  }
  const ready =
    guard.heartbeat_age_bucket === "fresh" &&
    guard.render_pickup_age_bucket === "fresh";
  if (
    guard.ready_allowed !== ready ||
    guard.renderer_status !== (ready ? "fresh" : "stale_attention")
  ) {
    throw new ContractError(`${context}: stale renderer state cannot be ready`);
  }
  assertLive2dRealRendererFreshnessGuardBoundaryPolicy(
    guard.boundary_policy,
    context
  );
  assertNoUnsafeText(guard, context);
}

export function createLive2dRealRendererCueValidation({
  cueKind = "expression",
} = {}) {
  const safeCueKind = safeLive2dRendererCueKind(cueKind);
  const accepted = safeCueKind !== null;
  const validation = {
    schema: "iris_live2d_real_renderer_cue_validation_v1",
    cue_kind: safeCueKind ?? "unsupported",
    validation_status: accepted ? "accepted" : "rejected",
    renderer_payload_allowed: accepted,
    boundary_policy: Object.fromEntries(
      [...LIVE2D_REAL_RENDERER_CUE_VALIDATION_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertLive2dRealRendererCueValidationSafe(validation);
  return validation;
}

export function assertLive2dRealRendererCueValidationSafe(
  validation,
  context = "Live2D real renderer cue validation"
) {
  if (!validation || typeof validation !== "object" || Array.isArray(validation)) {
    throw new ContractError(`${context}: validation required`);
  }
  if (validation.schema !== "iris_live2d_real_renderer_cue_validation_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(validation)) {
    if (!LIVE2D_REAL_RENDERER_CUE_VALIDATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected validation field`);
    }
  }
  const accepted = LIVE2D_REAL_RENDERER_CUE_KINDS.has(validation.cue_kind);
  if (
    ![...LIVE2D_REAL_RENDERER_CUE_KINDS, "unsupported"].includes(
      validation.cue_kind
    ) ||
    !["accepted", "rejected"].includes(validation.validation_status) ||
    typeof validation.renderer_payload_allowed !== "boolean" ||
    validation.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid validation`);
  }
  if (
    validation.validation_status !== (accepted ? "accepted" : "rejected") ||
    validation.renderer_payload_allowed !== accepted
  ) {
    throw new ContractError(`${context}: cue validation mismatch`);
  }
  assertLive2dRealRendererCueValidationBoundaryPolicy(
    validation.boundary_policy,
    context
  );
  assertNoUnsafeText(validation, context);
}

export function createLive2dRealRendererRecoveryRequirement({
  cueIntensity = "strong_motion",
  recoveryCuePresent = false,
} = {}) {
  const intensity = safeLive2dRendererRecoveryIntensity(cueIntensity);
  const recoveryPresent = recoveryCuePresent === true;
  const requiresRecovery =
    LIVE2D_REAL_RENDERER_RECOVERY_REQUIRED_INTENSITIES.has(intensity);
  const allowed = !requiresRecovery || recoveryPresent;
  const requirement = {
    schema: "iris_live2d_real_renderer_recovery_requirement_v1",
    cue_intensity: intensity,
    recovery_cue_present: recoveryPresent,
    validation_status: allowed ? "accepted" : "rejected",
    renderer_payload_allowed: allowed,
    boundary_policy: Object.fromEntries(
      [...LIVE2D_REAL_RENDERER_RECOVERY_REQUIREMENT_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertLive2dRealRendererRecoveryRequirementSafe(requirement);
  return requirement;
}

export function assertLive2dRealRendererRecoveryRequirementSafe(
  requirement,
  context = "Live2D real renderer recovery requirement"
) {
  if (
    !requirement ||
    typeof requirement !== "object" ||
    Array.isArray(requirement)
  ) {
    throw new ContractError(`${context}: requirement required`);
  }
  if (
    requirement.schema !== "iris_live2d_real_renderer_recovery_requirement_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(requirement)) {
    if (!LIVE2D_REAL_RENDERER_RECOVERY_REQUIREMENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected requirement field`);
    }
  }
  const requiresRecovery =
    LIVE2D_REAL_RENDERER_RECOVERY_REQUIRED_INTENSITIES.has(
      requirement.cue_intensity
    );
  const allowed = !requiresRecovery || requirement.recovery_cue_present === true;
  if (
    ![
      ...LIVE2D_REAL_RENDERER_RECOVERY_REQUIRED_INTENSITIES,
      "standard",
    ].includes(requirement.cue_intensity) ||
    typeof requirement.recovery_cue_present !== "boolean" ||
    !["accepted", "rejected"].includes(requirement.validation_status) ||
    typeof requirement.renderer_payload_allowed !== "boolean" ||
    requirement.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid requirement`);
  }
  if (
    requirement.validation_status !== (allowed ? "accepted" : "rejected") ||
    requirement.renderer_payload_allowed !== allowed
  ) {
    throw new ContractError(`${context}: recovery requirement mismatch`);
  }
  assertLive2dRealRendererRecoveryRequirementBoundaryPolicy(
    requirement.boundary_policy,
    context
  );
  assertNoUnsafeText(requirement, context);
}

export function createLive2dRealRendererE2EFixturePack() {
  const staleHeartbeatFixture = createLive2dRealRendererFreshnessGuard({
    heartbeatAgeBucket: "stale",
    renderPickupAgeBucket: "fresh",
  });
  const unsupportedCueFixture = createLive2dRealRendererCueValidation({
    cueKind: "scene_command",
  });
  const recoveryMissingFixture = createLive2dRealRendererRecoveryRequirement({
    cueIntensity: "strong_motion",
    recoveryCuePresent: false,
  });
  const modelPathLeakFixture = createLive2dRealRendererModelPathLeakFixture();
  const pack = {
    schema: "iris_live2d_real_renderer_e2e_fixture_pack_v1",
    stale_heartbeat_fixture: staleHeartbeatFixture,
    unsupported_cue_fixture: unsupportedCueFixture,
    recovery_missing_fixture: recoveryMissingFixture,
    model_path_leak_fixture: modelPathLeakFixture,
    boundary_policy: Object.fromEntries(
      [...LIVE2D_REAL_RENDERER_E2E_FIXTURE_PACK_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertLive2dRealRendererE2EFixturePackSafe(pack);
  return pack;
}

export function assertLive2dRealRendererE2EFixturePackSafe(
  pack,
  context = "Live2D real renderer E2E fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: fixture pack required`);
  }
  if (pack.schema !== "iris_live2d_real_renderer_e2e_fixture_pack_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(pack)) {
    if (!LIVE2D_REAL_RENDERER_E2E_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture pack field`);
    }
  }
  assertLive2dRealRendererFreshnessGuardSafe(
    pack.stale_heartbeat_fixture,
    `${context}: stale heartbeat fixture`
  );
  assertLive2dRealRendererCueValidationSafe(
    pack.unsupported_cue_fixture,
    `${context}: unsupported cue fixture`
  );
  assertLive2dRealRendererRecoveryRequirementSafe(
    pack.recovery_missing_fixture,
    `${context}: recovery missing fixture`
  );
  assertLive2dRealRendererModelPathLeakFixtureSafe(
    pack.model_path_leak_fixture,
    `${context}: model path leak fixture`
  );
  if (
    pack.stale_heartbeat_fixture.ready_allowed !== false ||
    pack.unsupported_cue_fixture.validation_status !== "rejected" ||
    pack.recovery_missing_fixture.validation_status !== "rejected" ||
    pack.model_path_leak_fixture.leak_detected !== false ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: fixture guard mismatch`);
  }
  assertLive2dRealRendererE2EFixturePackBoundaryPolicy(
    pack.boundary_policy,
    context
  );
  assertNoUnsafeText(pack, context);
}

function createLive2dRealRendererModelPathLeakFixture() {
  const fixture = {
    schema: "iris_live2d_real_renderer_model_path_leak_fixture_v1",
    leak_detected: false,
    safe_status: "redacted",
    redaction_status: "redacted",
    boundary_policy: Object.fromEntries(
      [...LIVE2D_REAL_RENDERER_MODEL_PATH_LEAK_FIXTURE_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertLive2dRealRendererModelPathLeakFixtureSafe(fixture);
  return fixture;
}

function assertLive2dRealRendererModelPathLeakFixtureSafe(
  fixture,
  context = "Live2D real renderer model path leak fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  if (
    fixture.schema !== "iris_live2d_real_renderer_model_path_leak_fixture_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(fixture)) {
    if (!LIVE2D_REAL_RENDERER_MODEL_PATH_LEAK_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.leak_detected !== false ||
    fixture.safe_status !== "redacted" ||
    fixture.redaction_status !== "redacted" ||
    fixture.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid redaction fixture`);
  }
  assertLive2dRealRendererModelPathLeakFixtureBoundaryPolicy(
    fixture.boundary_policy,
    context
  );
  assertNoUnsafeText(fixture, context);
}

export function createObsRealPickupConnectorPreflight({
  browserSourceStatus = "missing",
  pickupManifestStatus = "missing",
  heartbeatStatus = "missing",
} = {}) {
  const browserSource = safeObsPickupConnectorStatus(browserSourceStatus);
  const pickupManifest = safeObsPickupConnectorStatus(pickupManifestStatus);
  const heartbeat = safeObsPickupConnectorStatus(heartbeatStatus);
  const ready = [browserSource, pickupManifest, heartbeat].every(
    (status) => status === "configured"
  );
  const preflight = {
    schema: "iris_obs_real_pickup_connector_preflight_v1",
    browser_source_status: browserSource,
    pickup_manifest_status: pickupManifest,
    heartbeat_status: heartbeat,
    preflight_status: ready ? "ready" : "attention_required",
    boundary_policy: Object.fromEntries(
      [...OBS_REAL_PICKUP_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertObsRealPickupConnectorPreflightSafe(preflight);
  return preflight;
}

export function assertObsRealPickupConnectorPreflightSafe(
  preflight,
  context = "OBS real pickup connector preflight"
) {
  if (!preflight || typeof preflight !== "object" || Array.isArray(preflight)) {
    throw new ContractError(`${context}: preflight required`);
  }
  if (preflight.schema !== "iris_obs_real_pickup_connector_preflight_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(preflight)) {
    if (!OBS_REAL_PICKUP_CONNECTOR_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected preflight field`);
    }
  }
  for (const field of [
    "browser_source_status",
    "pickup_manifest_status",
    "heartbeat_status",
  ]) {
    if (!["configured", "missing", "attention_required"].includes(preflight[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  const ready = [
    preflight.browser_source_status,
    preflight.pickup_manifest_status,
    preflight.heartbeat_status,
  ].every((status) => status === "configured");
  if (
    preflight.preflight_status !== (ready ? "ready" : "attention_required") ||
    preflight.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: preflight status mismatch`);
  }
  assertObsRealPickupConnectorPreflightBoundaryPolicy(
    preflight.boundary_policy,
    context
  );
  assertNoUnsafeText(preflight, context);
}

export function createObsRealPickupFreshnessGuard({
  pickupAgeBucket = "stale",
} = {}) {
  const ageBucket = pickupAgeBucket === "fresh" ? "fresh" : "stale";
  const fresh = ageBucket === "fresh";
  const guard = {
    schema: "iris_obs_real_pickup_freshness_guard_v1",
    pickup_age_bucket: ageBucket,
    pickup_status: fresh ? "fresh" : "runtime_waiting",
    ready_allowed: fresh,
    boundary_policy: Object.fromEntries(
      [...OBS_REAL_PICKUP_FRESHNESS_GUARD_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertObsRealPickupFreshnessGuardSafe(guard);
  return guard;
}

export function assertObsRealPickupFreshnessGuardSafe(
  guard,
  context = "OBS real pickup freshness guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  if (guard.schema !== "iris_obs_real_pickup_freshness_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(guard)) {
    if (!OBS_REAL_PICKUP_FRESHNESS_GUARD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected guard field`);
    }
  }
  if (
    !["fresh", "stale"].includes(guard.pickup_age_bucket) ||
    !["fresh", "runtime_waiting"].includes(guard.pickup_status) ||
    typeof guard.ready_allowed !== "boolean" ||
    guard.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid guard`);
  }
  const fresh = guard.pickup_age_bucket === "fresh";
  if (
    guard.ready_allowed !== fresh ||
    guard.pickup_status !== (fresh ? "fresh" : "runtime_waiting")
  ) {
    throw new ContractError(`${context}: stale pickup cannot be ready`);
  }
  assertObsRealPickupFreshnessGuardBoundaryPolicy(guard.boundary_policy, context);
  assertNoUnsafeText(guard, context);
}

export function createObsRealPickupArtifactValidation({
  artifactAgeBucket = "stale",
  artifactSchemaStatus = "mismatch",
} = {}) {
  const ageBucket = artifactAgeBucket === "fresh" ? "fresh" : "stale";
  const schemaStatus =
    artifactSchemaStatus === "match" ? "match" : "mismatch";
  const ready = ageBucket === "fresh" && schemaStatus === "match";
  const validation = {
    schema: "iris_obs_real_pickup_artifact_validation_v1",
    artifact_age_bucket: ageBucket,
    artifact_schema_status: schemaStatus,
    validation_status: ready ? "ready" : "attention_required",
    ready_allowed: ready,
    boundary_policy: Object.fromEntries(
      [...OBS_REAL_PICKUP_ARTIFACT_VALIDATION_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertObsRealPickupArtifactValidationSafe(validation);
  return validation;
}

export function assertObsRealPickupArtifactValidationSafe(
  validation,
  context = "OBS real pickup artifact validation"
) {
  if (!validation || typeof validation !== "object" || Array.isArray(validation)) {
    throw new ContractError(`${context}: validation required`);
  }
  if (validation.schema !== "iris_obs_real_pickup_artifact_validation_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(validation)) {
    if (!OBS_REAL_PICKUP_ARTIFACT_VALIDATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected validation field`);
    }
  }
  if (
    !["fresh", "stale"].includes(validation.artifact_age_bucket) ||
    !["match", "mismatch"].includes(validation.artifact_schema_status) ||
    !["ready", "attention_required"].includes(validation.validation_status) ||
    typeof validation.ready_allowed !== "boolean" ||
    validation.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid validation`);
  }
  const ready =
    validation.artifact_age_bucket === "fresh" &&
    validation.artifact_schema_status === "match";
  if (
    validation.ready_allowed !== ready ||
    validation.validation_status !== (ready ? "ready" : "attention_required")
  ) {
    throw new ContractError(`${context}: artifact cannot be ready`);
  }
  assertObsRealPickupArtifactValidationBoundaryPolicy(
    validation.boundary_policy,
    context
  );
  assertNoUnsafeText(validation, context);
}

export function createObsRealPickupMutationConfirmation({
  mutationKind = "scene",
  operatorConfirmed = false,
} = {}) {
  const safeMutationKind = safeObsPickupMutationKind(mutationKind);
  const confirmed = operatorConfirmed === true;
  const guard = {
    schema: "iris_obs_real_pickup_mutation_confirmation_v1",
    mutation_kind: safeMutationKind,
    confirmation_required: true,
    operator_confirmed: confirmed,
    mutation_executed: confirmed,
    mutation_status: confirmed ? "confirmed_ready" : "confirmation_required",
    boundary_policy: Object.fromEntries(
      [...OBS_REAL_PICKUP_MUTATION_CONFIRMATION_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertObsRealPickupMutationConfirmationSafe(guard);
  return guard;
}

export function assertObsRealPickupMutationConfirmationSafe(
  guard,
  context = "OBS real pickup mutation confirmation"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  if (guard.schema !== "iris_obs_real_pickup_mutation_confirmation_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(guard)) {
    if (!OBS_REAL_PICKUP_MUTATION_CONFIRMATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected guard field`);
    }
  }
  if (
    !["scene", "source"].includes(guard.mutation_kind) ||
    guard.confirmation_required !== true ||
    typeof guard.operator_confirmed !== "boolean" ||
    typeof guard.mutation_executed !== "boolean" ||
    !["confirmation_required", "confirmed_ready"].includes(guard.mutation_status) ||
    guard.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid guard`);
  }
  const confirmed = guard.operator_confirmed === true;
  if (
    guard.mutation_executed !== confirmed ||
    guard.mutation_status !==
      (confirmed ? "confirmed_ready" : "confirmation_required")
  ) {
    throw new ContractError(`${context}: unconfirmed mutation cannot execute`);
  }
  assertObsRealPickupMutationConfirmationBoundaryPolicy(
    guard.boundary_policy,
    context
  );
  assertNoUnsafeText(guard, context);
}

export function createObsRealPickupE2EFixturePack() {
  const stalePickupFixture = createObsRealPickupFreshnessGuard({
    pickupAgeBucket: "stale",
  });
  const missingBrowserSourceFixture = createObsRealPickupConnectorPreflight({
    browserSourceStatus: "missing",
    pickupManifestStatus: "configured",
    heartbeatStatus: "configured",
  });
  const eventLeakFixture = createObsRealPickupEventLeakFixture();
  const mutationWithoutConfirmationFixture =
    createObsRealPickupMutationConfirmation({
      mutationKind: "scene",
      operatorConfirmed: false,
    });
  const pack = {
    schema: "iris_obs_real_pickup_e2e_fixture_pack_v1",
    stale_pickup_fixture: stalePickupFixture,
    missing_browser_source_fixture: missingBrowserSourceFixture,
    event_leak_fixture: eventLeakFixture,
    mutation_without_confirmation_fixture: mutationWithoutConfirmationFixture,
    boundary_policy: Object.fromEntries(
      [...OBS_REAL_PICKUP_E2E_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertObsRealPickupE2EFixturePackSafe(pack);
  return pack;
}

export function assertObsRealPickupE2EFixturePackSafe(
  pack,
  context = "OBS real pickup E2E fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: fixture pack required`);
  }
  if (pack.schema !== "iris_obs_real_pickup_e2e_fixture_pack_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(pack)) {
    if (!OBS_REAL_PICKUP_E2E_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture pack field`);
    }
  }
  assertObsRealPickupFreshnessGuardSafe(
    pack.stale_pickup_fixture,
    `${context}: stale pickup fixture`
  );
  assertObsRealPickupConnectorPreflightSafe(
    pack.missing_browser_source_fixture,
    `${context}: missing browser source fixture`
  );
  assertObsRealPickupEventLeakFixtureSafe(
    pack.event_leak_fixture,
    `${context}: event leak fixture`
  );
  assertObsRealPickupMutationConfirmationSafe(
    pack.mutation_without_confirmation_fixture,
    `${context}: mutation without confirmation fixture`
  );
  if (
    pack.stale_pickup_fixture.ready_allowed !== false ||
    pack.missing_browser_source_fixture.preflight_status !==
      "attention_required" ||
    pack.event_leak_fixture.leak_detected !== false ||
    pack.mutation_without_confirmation_fixture.mutation_executed !== false ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: fixture guard mismatch`);
  }
  assertObsRealPickupE2EFixturePackBoundaryPolicy(
    pack.boundary_policy,
    context
  );
  assertNoUnsafeText(pack, context);
}

function createObsRealPickupEventLeakFixture() {
  const fixture = {
    schema: "iris_obs_real_pickup_event_leak_fixture_v1",
    leak_detected: false,
    safe_status: "redacted",
    redaction_status: "redacted",
    boundary_policy: Object.fromEntries(
      [...OBS_REAL_PICKUP_EVENT_LEAK_FIXTURE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertObsRealPickupEventLeakFixtureSafe(fixture);
  return fixture;
}

function assertObsRealPickupEventLeakFixtureSafe(
  fixture,
  context = "OBS real pickup event leak fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  if (fixture.schema !== "iris_obs_real_pickup_event_leak_fixture_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(fixture)) {
    if (!OBS_REAL_PICKUP_EVENT_LEAK_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.leak_detected !== false ||
    fixture.safe_status !== "redacted" ||
    fixture.redaction_status !== "redacted" ||
    fixture.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid redaction fixture`);
  }
  assertObsRealPickupEventLeakFixtureBoundaryPolicy(
    fixture.boundary_policy,
    context
  );
  assertNoUnsafeText(fixture, context);
}

export function createDbRealConnectorPreflight({
  configuredStatus = "missing",
  connectorStatus = "missing",
  schemaStatus = "missing",
  indexStatus = "missing",
  migrationStatus = "missing",
  backupStatus = "missing",
} = {}) {
  const configured = safeDbConnectorStatus(configuredStatus);
  const connector = safeDbConnectorStatus(connectorStatus);
  const schemaReady = safeDbConnectorStatus(schemaStatus);
  const indexReady = safeDbConnectorStatus(indexStatus);
  const migrationReady = safeDbConnectorStatus(migrationStatus);
  const backupReady = safeDbConnectorStatus(backupStatus);
  const ready = [
    configured,
    connector,
    schemaReady,
    indexReady,
    migrationReady,
    backupReady,
  ].every((status) => status === "configured");
  const preflight = {
    schema: "iris_db_real_connector_preflight_v1",
    configured_status: configured,
    connector_status: connector,
    schema_status: schemaReady,
    index_status: indexReady,
    migration_status: migrationReady,
    backup_status: backupReady,
    preflight_status: ready ? "ready" : "attention_required",
    boundary_policy: Object.fromEntries(
      [...DB_REAL_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertDbRealConnectorPreflightSafe(preflight);
  return preflight;
}

export function assertDbRealConnectorPreflightSafe(
  preflight,
  context = "DB real connector preflight"
) {
  if (!preflight || typeof preflight !== "object" || Array.isArray(preflight)) {
    throw new ContractError(`${context}: preflight required`);
  }
  if (preflight.schema !== "iris_db_real_connector_preflight_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(preflight)) {
    if (!DB_REAL_CONNECTOR_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected preflight field`);
    }
  }
  for (const field of [
    "configured_status",
    "connector_status",
    "schema_status",
    "index_status",
    "migration_status",
    "backup_status",
  ]) {
    if (!["configured", "missing", "attention_required"].includes(preflight[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  const ready = [
    preflight.configured_status,
    preflight.connector_status,
    preflight.schema_status,
    preflight.index_status,
    preflight.migration_status,
    preflight.backup_status,
  ].every((status) => status === "configured");
  if (
    preflight.preflight_status !== (ready ? "ready" : "attention_required") ||
    preflight.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: preflight status mismatch`);
  }
  assertDbRealConnectorPreflightBoundaryPolicy(
    preflight.boundary_policy,
    context
  );
  assertNoUnsafeText(preflight, context);
}

export function createDbRealConnectorAvailabilityGate({
  realDbConnected = false,
} = {}) {
  const connected = realDbConnected === true;
  const gate = {
    schema: "iris_db_real_connector_availability_gate_v1",
    real_db_connected: connected,
    availability_status: connected ? "ready" : "BLOCKED",
    production_persistence_ready: connected,
    attention_required: !connected,
    boundary_policy: Object.fromEntries(
      [...DB_REAL_CONNECTOR_AVAILABILITY_GATE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertDbRealConnectorAvailabilityGateSafe(gate);
  return gate;
}

export function assertDbRealConnectorAvailabilityGateSafe(
  gate,
  context = "DB real connector availability gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  if (gate.schema !== "iris_db_real_connector_availability_gate_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(gate)) {
    if (!DB_REAL_CONNECTOR_AVAILABILITY_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`);
    }
  }
  if (
    typeof gate.real_db_connected !== "boolean" ||
    !["ready", "BLOCKED"].includes(gate.availability_status) ||
    typeof gate.production_persistence_ready !== "boolean" ||
    typeof gate.attention_required !== "boolean" ||
    gate.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const connected = gate.real_db_connected === true;
  if (
    gate.production_persistence_ready !== connected ||
    gate.attention_required !== !connected ||
    gate.availability_status !== (connected ? "ready" : "BLOCKED")
  ) {
    throw new ContractError(`${context}: unavailable DB cannot be ready`);
  }
  assertDbRealConnectorAvailabilityGateBoundaryPolicy(
    gate.boundary_policy,
    context
  );
  assertNoUnsafeText(gate, context);
}

export function createDbRealConnectorSchemaFreshness({
  schemaManifestAgeBucket = "stale",
  schemaManifestStatus = "unconfirmed",
} = {}) {
  const ageBucket = schemaManifestAgeBucket === "fresh" ? "fresh" : "stale";
  const manifestStatus =
    schemaManifestStatus === "confirmed" ? "confirmed" : "unconfirmed";
  const ready = ageBucket === "fresh" && manifestStatus === "confirmed";
  const freshness = {
    schema: "iris_db_real_connector_schema_freshness_v1",
    schema_manifest_age_bucket: ageBucket,
    schema_manifest_status: manifestStatus,
    readiness_status: ready ? "ready" : "attention_required",
    ready_allowed: ready,
    boundary_policy: Object.fromEntries(
      [...DB_REAL_CONNECTOR_SCHEMA_FRESHNESS_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertDbRealConnectorSchemaFreshnessSafe(freshness);
  return freshness;
}

export function assertDbRealConnectorSchemaFreshnessSafe(
  freshness,
  context = "DB real connector schema freshness"
) {
  if (!freshness || typeof freshness !== "object" || Array.isArray(freshness)) {
    throw new ContractError(`${context}: freshness required`);
  }
  if (freshness.schema !== "iris_db_real_connector_schema_freshness_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(freshness)) {
    if (!DB_REAL_CONNECTOR_SCHEMA_FRESHNESS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected freshness field`);
    }
  }
  if (
    !["fresh", "stale"].includes(freshness.schema_manifest_age_bucket) ||
    !["confirmed", "unconfirmed"].includes(freshness.schema_manifest_status) ||
    !["ready", "attention_required"].includes(freshness.readiness_status) ||
    typeof freshness.ready_allowed !== "boolean" ||
    freshness.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid freshness`);
  }
  const ready =
    freshness.schema_manifest_age_bucket === "fresh" &&
    freshness.schema_manifest_status === "confirmed";
  if (
    freshness.ready_allowed !== ready ||
    freshness.readiness_status !== (ready ? "ready" : "attention_required")
  ) {
    throw new ContractError(`${context}: stale or unconfirmed schema cannot be ready`);
  }
  assertDbRealConnectorSchemaFreshnessBoundaryPolicy(
    freshness.boundary_policy,
    context
  );
  assertNoUnsafeText(freshness, context);
}

export function createDbRealConnectorMigrationReadiness({
  migrationStatus = "pending",
} = {}) {
  const status = safeDbMigrationStatus(migrationStatus);
  const ready = status === "applied";
  const readiness = {
    schema: "iris_db_real_connector_migration_readiness_v1",
    migration_status: status,
    production_db_ready: ready,
    readiness_status: ready ? "ready" : "attention_required",
    boundary_policy: Object.fromEntries(
      [...DB_REAL_CONNECTOR_MIGRATION_READINESS_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertDbRealConnectorMigrationReadinessSafe(readiness);
  return readiness;
}

export function assertDbRealConnectorMigrationReadinessSafe(
  readiness,
  context = "DB real connector migration readiness"
) {
  if (!readiness || typeof readiness !== "object" || Array.isArray(readiness)) {
    throw new ContractError(`${context}: readiness required`);
  }
  if (readiness.schema !== "iris_db_real_connector_migration_readiness_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(readiness)) {
    if (!DB_REAL_CONNECTOR_MIGRATION_READINESS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected readiness field`);
    }
  }
  if (
    !["applied", "pending", "missing"].includes(readiness.migration_status) ||
    typeof readiness.production_db_ready !== "boolean" ||
    !["ready", "attention_required"].includes(readiness.readiness_status) ||
    readiness.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid readiness`);
  }
  const ready = readiness.migration_status === "applied";
  if (
    readiness.production_db_ready !== ready ||
    readiness.readiness_status !== (ready ? "ready" : "attention_required")
  ) {
    throw new ContractError(`${context}: pending or missing migration cannot be ready`);
  }
  assertDbRealConnectorMigrationReadinessBoundaryPolicy(
    readiness.boundary_policy,
    context
  );
  assertNoUnsafeText(readiness, context);
}

export function createGameRealAdapterConnectorPreflight({
  mode = "manual_approval",
  safeMapStatus = "missing",
  manualApprovalStatus = "pending",
  cooldownStatus = "ready",
} = {}) {
  const safeMode = safeGameAdapterMode(mode);
  const safeMap = safeGameAdapterStatus(safeMapStatus);
  const manualApproval = safeGameManualApprovalStatus(manualApprovalStatus);
  const cooldown = safeGameCooldownStatus(cooldownStatus);
  const ready =
    safeMap === "configured" &&
    manualApproval === "approved" &&
    cooldown === "ready";
  const preflight = {
    schema: "iris_game_real_adapter_connector_preflight_v1",
    mode: safeMode,
    safe_map_status: safeMap,
    manual_approval_status: manualApproval,
    cooldown_status: cooldown,
    preflight_status: ready ? "ready" : "attention_required",
    boundary_policy: Object.fromEntries(
      [...GAME_REAL_ADAPTER_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertGameRealAdapterConnectorPreflightSafe(preflight);
  return preflight;
}

export function assertGameRealAdapterConnectorPreflightSafe(
  preflight,
  context = "Game real adapter connector preflight"
) {
  if (!preflight || typeof preflight !== "object" || Array.isArray(preflight)) {
    throw new ContractError(`${context}: preflight required`);
  }
  if (preflight.schema !== "iris_game_real_adapter_connector_preflight_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(preflight)) {
    if (!GAME_REAL_ADAPTER_CONNECTOR_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected preflight field`);
    }
  }
  if (
    !["manual_approval", "approved_safe_adapter"].includes(preflight.mode) ||
    !["configured", "missing", "attention_required"].includes(
      preflight.safe_map_status
    ) ||
    !["approved", "pending", "attention_required"].includes(
      preflight.manual_approval_status
    ) ||
    !["ready", "cooling_down", "attention_required"].includes(
      preflight.cooldown_status
    ) ||
    !["ready", "attention_required"].includes(preflight.preflight_status) ||
    preflight.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid preflight`);
  }
  const ready =
    preflight.safe_map_status === "configured" &&
    preflight.manual_approval_status === "approved" &&
    preflight.cooldown_status === "ready";
  if (preflight.preflight_status !== (ready ? "ready" : "attention_required")) {
    throw new ContractError(`${context}: preflight status mismatch`);
  }
  assertGameRealAdapterConnectorPreflightBoundaryPolicy(
    preflight.boundary_policy,
    context
  );
  assertNoUnsafeText(preflight, context);
}

export function createGameRealAdapterManualApprovalGate({
  mode = "manual_approval",
  operatorApprovalCuePresent = false,
} = {}) {
  const safeMode = safeGameAdapterMode(mode);
  const cuePresent = operatorApprovalCuePresent === true;
  const ready = safeMode === "manual_approval" && cuePresent;
  const gate = {
    schema: "iris_game_real_adapter_manual_approval_gate_v1",
    mode: safeMode,
    operator_approval_cue_present: cuePresent,
    manual_approval_status: ready ? "approved" : "pending",
    real_control_ready: ready,
    boundary_policy: Object.fromEntries(
      [...GAME_REAL_ADAPTER_MANUAL_APPROVAL_GATE_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertGameRealAdapterManualApprovalGateSafe(gate);
  return gate;
}

export function assertGameRealAdapterManualApprovalGateSafe(
  gate,
  context = "Game real adapter manual approval gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  if (gate.schema !== "iris_game_real_adapter_manual_approval_gate_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(gate)) {
    if (!GAME_REAL_ADAPTER_MANUAL_APPROVAL_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`);
    }
  }
  if (
    !["manual_approval", "approved_safe_adapter"].includes(gate.mode) ||
    typeof gate.operator_approval_cue_present !== "boolean" ||
    !["approved", "pending"].includes(gate.manual_approval_status) ||
    typeof gate.real_control_ready !== "boolean" ||
    gate.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const ready =
    gate.mode === "manual_approval" && gate.operator_approval_cue_present === true;
  if (
    gate.real_control_ready !== ready ||
    gate.manual_approval_status !== (ready ? "approved" : "pending")
  ) {
    throw new ContractError(`${context}: manual approval cue required`);
  }
  assertGameRealAdapterManualApprovalGateBoundaryPolicy(
    gate.boundary_policy,
    context
  );
  assertNoUnsafeText(gate, context);
}

export function createGameRealAdapterApprovedSafeModeGate({
  adapterFresh = false,
  safeMapReady = false,
  emergencyStopReady = false,
  auditReady = false,
} = {}) {
  const fresh = adapterFresh === true;
  const safeMap = safeMapReady === true;
  const emergencyStop = emergencyStopReady === true;
  const audit = auditReady === true;
  const ready = fresh && safeMap && emergencyStop && audit;
  const gate = {
    schema: "iris_game_real_adapter_approved_safe_mode_gate_v1",
    mode: "approved_safe_adapter",
    adapter_fresh: fresh,
    safe_map_ready: safeMap,
    emergency_stop_ready: emergencyStop,
    audit_ready: audit,
    approved_safe_adapter_ready: ready,
    boundary_policy: Object.fromEntries(
      [...GAME_REAL_ADAPTER_APPROVED_SAFE_MODE_GATE_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertGameRealAdapterApprovedSafeModeGateSafe(gate);
  return gate;
}

export function assertGameRealAdapterApprovedSafeModeGateSafe(
  gate,
  context = "Game real adapter approved safe mode gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  if (gate.schema !== "iris_game_real_adapter_approved_safe_mode_gate_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(gate)) {
    if (!GAME_REAL_ADAPTER_APPROVED_SAFE_MODE_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`);
    }
  }
  if (
    gate.mode !== "approved_safe_adapter" ||
    typeof gate.adapter_fresh !== "boolean" ||
    typeof gate.safe_map_ready !== "boolean" ||
    typeof gate.emergency_stop_ready !== "boolean" ||
    typeof gate.audit_ready !== "boolean" ||
    typeof gate.approved_safe_adapter_ready !== "boolean" ||
    gate.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const ready =
    gate.adapter_fresh === true &&
    gate.safe_map_ready === true &&
    gate.emergency_stop_ready === true &&
    gate.audit_ready === true;
  if (gate.approved_safe_adapter_ready !== ready) {
    throw new ContractError(`${context}: approved safe adapter gate mismatch`);
  }
  assertGameRealAdapterApprovedSafeModeGateBoundaryPolicy(
    gate.boundary_policy,
    context
  );
  assertNoUnsafeText(gate, context);
}

export function createGameRealAdapterEmergencyStopRequirement({
  emergencyStopConfirmed = false,
} = {}) {
  const confirmed = emergencyStopConfirmed === true;
  const requirement = {
    schema: "iris_game_real_adapter_emergency_stop_requirement_v1",
    emergency_stop_confirmed: confirmed,
    real_game_control_ready: confirmed,
    control_status: confirmed ? "ready" : "attention_required",
    boundary_policy: Object.fromEntries(
      [...GAME_REAL_ADAPTER_EMERGENCY_STOP_REQUIREMENT_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertGameRealAdapterEmergencyStopRequirementSafe(requirement);
  return requirement;
}

export function assertGameRealAdapterEmergencyStopRequirementSafe(
  requirement,
  context = "Game real adapter emergency stop requirement"
) {
  if (
    !requirement ||
    typeof requirement !== "object" ||
    Array.isArray(requirement)
  ) {
    throw new ContractError(`${context}: requirement required`);
  }
  if (
    requirement.schema !==
    "iris_game_real_adapter_emergency_stop_requirement_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(requirement)) {
    if (!GAME_REAL_ADAPTER_EMERGENCY_STOP_REQUIREMENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected requirement field`);
    }
  }
  if (
    typeof requirement.emergency_stop_confirmed !== "boolean" ||
    typeof requirement.real_game_control_ready !== "boolean" ||
    !["ready", "attention_required"].includes(requirement.control_status) ||
    requirement.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid requirement`);
  }
  const ready = requirement.emergency_stop_confirmed === true;
  if (
    requirement.real_game_control_ready !== ready ||
    requirement.control_status !== (ready ? "ready" : "attention_required")
  ) {
    throw new ContractError(`${context}: emergency stop confirmation required`);
  }
  assertGameRealAdapterEmergencyStopRequirementBoundaryPolicy(
    requirement.boundary_policy,
    context
  );
  assertNoUnsafeText(requirement, context);
}

export function createGameRealAdapterE2EFixturePack() {
  const missingSafeMapFixture = createGameRealAdapterConnectorPreflight({
    mode: "approved_safe_adapter",
    safeMapStatus: "missing",
    manualApprovalStatus: "approved",
    cooldownStatus: "ready",
  });
  const noApprovalFixture = createGameRealAdapterManualApprovalGate({
    mode: "manual_approval",
    operatorApprovalCuePresent: false,
  });
  const staleAdapterFixture = createGameRealAdapterApprovedSafeModeGate({
    adapterFresh: false,
    safeMapReady: true,
    emergencyStopReady: true,
    auditReady: true,
  });
  const noEmergencyStopFixture =
    createGameRealAdapterEmergencyStopRequirement({
      emergencyStopConfirmed: false,
    });
  const commandLeakFixture = createGameRealAdapterCommandLeakFixture();
  const pack = {
    schema: "iris_game_real_adapter_e2e_fixture_pack_v1",
    missing_safe_map_fixture: missingSafeMapFixture,
    no_approval_fixture: noApprovalFixture,
    stale_adapter_fixture: staleAdapterFixture,
    no_emergency_stop_fixture: noEmergencyStopFixture,
    command_leak_fixture: commandLeakFixture,
    boundary_policy: Object.fromEntries(
      [...GAME_REAL_ADAPTER_E2E_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertGameRealAdapterE2EFixturePackSafe(pack);
  return pack;
}

export function assertGameRealAdapterE2EFixturePackSafe(
  pack,
  context = "Game real adapter E2E fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: fixture pack required`);
  }
  if (pack.schema !== "iris_game_real_adapter_e2e_fixture_pack_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(pack)) {
    if (!GAME_REAL_ADAPTER_E2E_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture pack field`);
    }
  }
  assertGameRealAdapterConnectorPreflightSafe(
    pack.missing_safe_map_fixture,
    `${context}: missing safe map fixture`
  );
  assertGameRealAdapterManualApprovalGateSafe(
    pack.no_approval_fixture,
    `${context}: no approval fixture`
  );
  assertGameRealAdapterApprovedSafeModeGateSafe(
    pack.stale_adapter_fixture,
    `${context}: stale adapter fixture`
  );
  assertGameRealAdapterEmergencyStopRequirementSafe(
    pack.no_emergency_stop_fixture,
    `${context}: no emergency stop fixture`
  );
  assertGameRealAdapterCommandLeakFixtureSafe(
    pack.command_leak_fixture,
    `${context}: command leak fixture`
  );
  if (
    pack.missing_safe_map_fixture.preflight_status !== "attention_required" ||
    pack.no_approval_fixture.real_control_ready !== false ||
    pack.stale_adapter_fixture.approved_safe_adapter_ready !== false ||
    pack.no_emergency_stop_fixture.real_game_control_ready !== false ||
    pack.command_leak_fixture.leak_detected !== false ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: fixture guard mismatch`);
  }
  assertGameRealAdapterE2EFixturePackBoundaryPolicy(
    pack.boundary_policy,
    context
  );
  assertNoUnsafeText(pack, context);
}

function createGameRealAdapterCommandLeakFixture() {
  const fixture = {
    schema: "iris_game_real_adapter_command_leak_fixture_v1",
    leak_detected: false,
    safe_status: "redacted",
    redaction_status: "redacted",
    boundary_policy: Object.fromEntries(
      [...GAME_REAL_ADAPTER_COMMAND_LEAK_FIXTURE_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertGameRealAdapterCommandLeakFixtureSafe(fixture);
  return fixture;
}

function assertGameRealAdapterCommandLeakFixtureSafe(
  fixture,
  context = "Game real adapter command leak fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  if (fixture.schema !== "iris_game_real_adapter_command_leak_fixture_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(fixture)) {
    if (!GAME_REAL_ADAPTER_COMMAND_LEAK_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.leak_detected !== false ||
    fixture.safe_status !== "redacted" ||
    fixture.redaction_status !== "redacted" ||
    fixture.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid redaction fixture`);
  }
  assertGameRealAdapterCommandLeakFixtureBoundaryPolicy(
    fixture.boundary_policy,
    context
  );
  assertNoUnsafeText(fixture, context);
}

export function createYoutubeRealIngestConnectorPreflight({
  oauthStatus = "missing",
  chatIdStatus = "missing",
  pollingStatus = "missing",
  dedupeStatus = "missing",
  moderationStatus = "missing",
} = {}) {
  const oauth = safeYoutubeIngestStatus(oauthStatus);
  const chatId = safeYoutubeIngestStatus(chatIdStatus);
  const polling = safeYoutubeIngestStatus(pollingStatus);
  const dedupe = safeYoutubeIngestStatus(dedupeStatus);
  const moderation = safeYoutubeIngestStatus(moderationStatus);
  const ready = [oauth, chatId, polling, dedupe, moderation].every(
    (status) => status === "configured"
  );
  const preflight = {
    schema: "iris_youtube_real_ingest_connector_preflight_v1",
    oauth_status: oauth,
    chat_id_status: chatId,
    polling_status: polling,
    dedupe_status: dedupe,
    moderation_status: moderation,
    preflight_status: ready ? "ready" : "attention_required",
    boundary_policy: Object.fromEntries(
      [...YOUTUBE_REAL_INGEST_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertYoutubeRealIngestConnectorPreflightSafe(preflight);
  return preflight;
}

export function assertYoutubeRealIngestConnectorPreflightSafe(
  preflight,
  context = "YouTube real ingest connector preflight"
) {
  if (!preflight || typeof preflight !== "object" || Array.isArray(preflight)) {
    throw new ContractError(`${context}: preflight required`);
  }
  if (preflight.schema !== "iris_youtube_real_ingest_connector_preflight_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(preflight)) {
    if (!YOUTUBE_REAL_INGEST_CONNECTOR_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected preflight field`);
    }
  }
  for (const field of [
    "oauth_status",
    "chat_id_status",
    "polling_status",
    "dedupe_status",
    "moderation_status",
  ]) {
    if (!["configured", "missing", "attention_required"].includes(preflight[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  const ready = [
    preflight.oauth_status,
    preflight.chat_id_status,
    preflight.polling_status,
    preflight.dedupe_status,
    preflight.moderation_status,
  ].every((status) => status === "configured");
  if (
    preflight.preflight_status !== (ready ? "ready" : "attention_required") ||
    preflight.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: preflight status mismatch`);
  }
  assertYoutubeRealIngestConnectorPreflightBoundaryPolicy(
    preflight.boundary_policy,
    context
  );
  assertNoUnsafeText(preflight, context);
}

export function createYoutubeRealIngestTokenFreshnessGuard({
  tokenStatus = "missing",
} = {}) {
  const token = safeYoutubeTokenStatus(tokenStatus);
  const ready = token === "fresh";
  const guard = {
    schema: "iris_youtube_real_ingest_token_freshness_guard_v1",
    token_status: token,
    ingest_ready: ready,
    attention_status:
      token === "fresh" ? "ready" : token === "expired" ? "attention" : "BLOCKED",
    boundary_policy: Object.fromEntries(
      [...YOUTUBE_REAL_INGEST_TOKEN_FRESHNESS_GUARD_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertYoutubeRealIngestTokenFreshnessGuardSafe(guard);
  return guard;
}

export function assertYoutubeRealIngestTokenFreshnessGuardSafe(
  guard,
  context = "YouTube real ingest token freshness guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  if (guard.schema !== "iris_youtube_real_ingest_token_freshness_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(guard)) {
    if (!YOUTUBE_REAL_INGEST_TOKEN_FRESHNESS_GUARD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected guard field`);
    }
  }
  if (!["fresh", "expired", "missing"].includes(guard.token_status)) {
    throw new ContractError(`${context}: invalid token status`);
  }
  if (typeof guard.ingest_ready !== "boolean") {
    throw new ContractError(`${context}: invalid ready flag`);
  }
  if (!["ready", "attention", "BLOCKED"].includes(guard.attention_status)) {
    throw new ContractError(`${context}: invalid attention status`);
  }
  if (guard.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
  const ready = guard.token_status === "fresh";
  const attention =
    guard.token_status === "fresh"
      ? "ready"
      : guard.token_status === "expired"
        ? "attention"
        : "BLOCKED";
  if (guard.ingest_ready !== ready || guard.attention_status !== attention) {
    throw new ContractError(`${context}: token freshness status mismatch`);
  }
  assertYoutubeRealIngestTokenFreshnessGuardBoundaryPolicy(
    guard.boundary_policy,
    context
  );
  assertNoUnsafeText(guard, context);
}

export function createYoutubeRealIngestLiveChatFreshnessGuard({
  discoveryStatus = "missing",
} = {}) {
  const discovery = safeYoutubeDiscoveryStatus(discoveryStatus);
  const ready = discovery === "fresh";
  const guard = {
    schema: "iris_youtube_real_ingest_live_chat_freshness_guard_v1",
    discovery_status: discovery,
    ingest_ready: ready,
    attention_status:
      discovery === "fresh"
        ? "ready"
        : discovery === "stale"
          ? "attention"
          : "BLOCKED",
    boundary_policy: Object.fromEntries(
      [...YOUTUBE_REAL_INGEST_LIVE_CHAT_FRESHNESS_GUARD_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertYoutubeRealIngestLiveChatFreshnessGuardSafe(guard);
  return guard;
}

export function assertYoutubeRealIngestLiveChatFreshnessGuardSafe(
  guard,
  context = "YouTube real ingest live chat freshness guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  if (guard.schema !== "iris_youtube_real_ingest_live_chat_freshness_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(guard)) {
    if (!YOUTUBE_REAL_INGEST_LIVE_CHAT_FRESHNESS_GUARD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected guard field`);
    }
  }
  if (!["fresh", "stale", "missing"].includes(guard.discovery_status)) {
    throw new ContractError(`${context}: invalid discovery status`);
  }
  if (typeof guard.ingest_ready !== "boolean") {
    throw new ContractError(`${context}: invalid ready flag`);
  }
  if (!["ready", "attention", "BLOCKED"].includes(guard.attention_status)) {
    throw new ContractError(`${context}: invalid attention status`);
  }
  if (guard.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
  const ready = guard.discovery_status === "fresh";
  const attention =
    guard.discovery_status === "fresh"
      ? "ready"
      : guard.discovery_status === "stale"
        ? "attention"
        : "BLOCKED";
  if (guard.ingest_ready !== ready || guard.attention_status !== attention) {
    throw new ContractError(`${context}: live chat freshness status mismatch`);
  }
  assertYoutubeRealIngestLiveChatFreshnessGuardBoundaryPolicy(
    guard.boundary_policy,
    context
  );
  assertNoUnsafeText(guard, context);
}

export function createYoutubeRealIngestModerationReadiness({
  moderationStatus = "missing",
} = {}) {
  const moderation = safeYoutubeModerationStatus(moderationStatus);
  const ready = moderation === "confirmed";
  const readiness = {
    schema: "iris_youtube_real_ingest_moderation_readiness_v1",
    moderation_status: moderation,
    personalized_reaction_ready: ready,
    relationship_growth_ready: ready,
    attention_status:
      moderation === "confirmed"
        ? "ready"
        : moderation === "unconfirmed"
          ? "attention"
          : "BLOCKED",
    boundary_policy: Object.fromEntries(
      [...YOUTUBE_REAL_INGEST_MODERATION_READINESS_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertYoutubeRealIngestModerationReadinessSafe(readiness);
  return readiness;
}

export function assertYoutubeRealIngestModerationReadinessSafe(
  readiness,
  context = "YouTube real ingest moderation readiness"
) {
  if (!readiness || typeof readiness !== "object" || Array.isArray(readiness)) {
    throw new ContractError(`${context}: readiness required`);
  }
  if (readiness.schema !== "iris_youtube_real_ingest_moderation_readiness_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(readiness)) {
    if (!YOUTUBE_REAL_INGEST_MODERATION_READINESS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected readiness field`);
    }
  }
  if (!["confirmed", "unconfirmed", "missing"].includes(readiness.moderation_status)) {
    throw new ContractError(`${context}: invalid moderation status`);
  }
  if (
    typeof readiness.personalized_reaction_ready !== "boolean" ||
    typeof readiness.relationship_growth_ready !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid readiness flag`);
  }
  if (!["ready", "attention", "BLOCKED"].includes(readiness.attention_status)) {
    throw new ContractError(`${context}: invalid attention status`);
  }
  if (readiness.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
  const ready = readiness.moderation_status === "confirmed";
  const attention =
    readiness.moderation_status === "confirmed"
      ? "ready"
      : readiness.moderation_status === "unconfirmed"
        ? "attention"
        : "BLOCKED";
  if (
    readiness.personalized_reaction_ready !== ready ||
    readiness.relationship_growth_ready !== ready ||
    readiness.attention_status !== attention
  ) {
    throw new ContractError(`${context}: moderation readiness mismatch`);
  }
  assertYoutubeRealIngestModerationReadinessBoundaryPolicy(
    readiness.boundary_policy,
    context
  );
  assertNoUnsafeText(readiness, context);
}

export function createYoutubeRealIngestE2EFixturePack() {
  const tokenExpiredFixture = createYoutubeRealIngestTokenFreshnessGuard({
    tokenStatus: "expired",
  });
  const staleChatFixture = createYoutubeRealIngestLiveChatFreshnessGuard({
    discoveryStatus: "stale",
  });
  const moderationMissingFixture = createYoutubeRealIngestModerationReadiness({
    moderationStatus: "missing",
  });
  const rawApiLeakFixture = createYoutubeRealIngestRawApiLeakFixture();
  const pack = {
    schema: "iris_youtube_real_ingest_e2e_fixture_pack_v1",
    token_expired_fixture: tokenExpiredFixture,
    stale_chat_fixture: staleChatFixture,
    moderation_missing_fixture: moderationMissingFixture,
    raw_api_leak_fixture: rawApiLeakFixture,
    boundary_policy: Object.fromEntries(
      [...YOUTUBE_REAL_INGEST_E2E_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertYoutubeRealIngestE2EFixturePackSafe(pack);
  return pack;
}

export function assertYoutubeRealIngestE2EFixturePackSafe(
  pack,
  context = "YouTube real ingest E2E fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: fixture pack required`);
  }
  if (pack.schema !== "iris_youtube_real_ingest_e2e_fixture_pack_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(pack)) {
    if (!YOUTUBE_REAL_INGEST_E2E_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture pack field`);
    }
  }
  assertYoutubeRealIngestTokenFreshnessGuardSafe(
    pack.token_expired_fixture,
    `${context}: token expired fixture`
  );
  assertYoutubeRealIngestLiveChatFreshnessGuardSafe(
    pack.stale_chat_fixture,
    `${context}: stale chat fixture`
  );
  assertYoutubeRealIngestModerationReadinessSafe(
    pack.moderation_missing_fixture,
    `${context}: moderation missing fixture`
  );
  assertYoutubeRealIngestRawApiLeakFixtureSafe(
    pack.raw_api_leak_fixture,
    `${context}: raw api leak fixture`
  );
  if (
    pack.token_expired_fixture.ingest_ready !== false ||
    pack.stale_chat_fixture.ingest_ready !== false ||
    pack.moderation_missing_fixture.personalized_reaction_ready !== false ||
    pack.moderation_missing_fixture.relationship_growth_ready !== false ||
    pack.raw_api_leak_fixture.leak_detected !== false ||
    pack.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: fixture guard mismatch`);
  }
  assertYoutubeRealIngestE2EFixturePackBoundaryPolicy(
    pack.boundary_policy,
    context
  );
  assertNoUnsafeText(pack, context);
}

function createYoutubeRealIngestRawApiLeakFixture() {
  const fixture = {
    schema: "iris_youtube_real_ingest_raw_api_leak_fixture_v1",
    leak_detected: false,
    safe_status: "redacted",
    redaction_status: "redacted",
    boundary_policy: Object.fromEntries(
      [...YOUTUBE_REAL_INGEST_RAW_API_LEAK_FIXTURE_BOUNDARY_FIELDS].map(
        (field) => [field, true]
      )
    ),
    adapter_validation_required: true,
  };
  assertYoutubeRealIngestRawApiLeakFixtureSafe(fixture);
  return fixture;
}

function assertYoutubeRealIngestRawApiLeakFixtureSafe(
  fixture,
  context = "YouTube real ingest raw API leak fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  if (fixture.schema !== "iris_youtube_real_ingest_raw_api_leak_fixture_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(fixture)) {
    if (!YOUTUBE_REAL_INGEST_RAW_API_LEAK_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.leak_detected !== false ||
    fixture.safe_status !== "redacted" ||
    fixture.redaction_status !== "redacted" ||
    fixture.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: raw API leak not redacted`);
  }
  assertYoutubeRealIngestRawApiLeakFixtureBoundaryPolicy(
    fixture.boundary_policy,
    context
  );
  assertNoUnsafeText(fixture, context);
}

function createRealAdapterSecretLeakFixture({ adapter = "tts" } = {}) {
  const fixture = {
    schema: "iris_real_adapter_secret_leak_fixture_v1",
    adapter_label: safeRealHandshakeAdapterLabel(adapter) ?? "tts",
    leak_detected: false,
    safe_status: "redacted",
    redaction_status: "redacted",
    boundary_policy: Object.fromEntries(
      [...REAL_ADAPTER_SECRET_LEAK_FIXTURE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertRealAdapterSecretLeakFixtureSafe(fixture);
  return fixture;
}

function assertRealAdapterSecretLeakFixtureSafe(
  fixture,
  context = "real adapter secret leak fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  if (fixture.schema !== "iris_real_adapter_secret_leak_fixture_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(fixture)) {
    if (!REAL_ADAPTER_SECRET_LEAK_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    !REAL_HANDSHAKE_ADAPTER_LABELS.includes(fixture.adapter_label) ||
    fixture.leak_detected !== false ||
    fixture.safe_status !== "redacted" ||
    fixture.redaction_status !== "redacted" ||
    fixture.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid secret leak fixture`);
  }
  assertRealAdapterSecretLeakFixtureBoundaryPolicy(
    fixture.boundary_policy,
    context
  );
  assertNoUnsafeText(fixture, context);
}

export function createAdapterPreflightMissingDependencyClassifier({
  dependencies = [],
} = {}) {
  const components = (Array.isArray(dependencies) ? dependencies : [])
    .map((dependency) => safeDependencyComponent(dependency))
    .filter(Boolean)
    .sort((a, b) => a.component_label.localeCompare(b.component_label));
  const missingCount = components.filter(
    (component) => component.component_status === "missing"
  ).length;
  const classifier = {
    schema: "iris_adapter_preflight_missing_dependency_classifier_v1",
    dependency_status: missingCount > 0 ? "missing" : "available",
    missing_component_count: missingCount,
    components,
    boundary_policy: {
      component_labels_only: true,
      status_only: true,
      no_path_values: true,
      no_network_values: true,
      no_credential_values: true,
    },
  };
  assertAdapterPreflightMissingDependencyClassifierSafe(classifier);
  return classifier;
}

export function assertAdapterPreflightMissingDependencyClassifierSafe(
  classifier,
  context = "adapter preflight missing dependency classifier"
) {
  if (!classifier || typeof classifier !== "object" || Array.isArray(classifier)) {
    throw new ContractError(`${context}: classifier required`);
  }
  if (
    classifier.schema !==
    "iris_adapter_preflight_missing_dependency_classifier_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(classifier)) {
    if (!DEPENDENCY_CLASSIFIER_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected classifier field`);
    }
  }
  if (!["available", "missing"].includes(classifier.dependency_status)) {
    throw new ContractError(`${context}: invalid dependency status`);
  }
  if (!Array.isArray(classifier.components)) {
    throw new ContractError(`${context}: components required`);
  }
  const seen = new Set();
  let missingCount = 0;
  for (const component of classifier.components) {
    assertDependencyComponentSafe(component, context);
    if (seen.has(component.component_label)) {
      throw new ContractError(`${context}: duplicate component label`);
    }
    seen.add(component.component_label);
    if (component.component_status === "missing") missingCount += 1;
  }
  if (classifier.missing_component_count !== missingCount) {
    throw new ContractError(`${context}: missing component count mismatch`);
  }
  const expectedStatus = missingCount > 0 ? "missing" : "available";
  if (classifier.dependency_status !== expectedStatus) {
    throw new ContractError(`${context}: invalid status aggregate`);
  }
  assertDependencyBoundaryPolicy(classifier.boundary_policy, context);
  assertNoUnsafeText(classifier, context);
}

export function createAdapterPreflightFixtureModeSplit({
  adapter = "tts",
  fixturePass = false,
  realReady = false,
} = {}) {
  const adapterLabel = safeAdapterLabel(adapter) ?? "tts";
  const fixturePassed = fixturePass === true;
  const realAdapterReady = realReady === true;
  const split = {
    schema: "iris_adapter_preflight_fixture_mode_split_v1",
    adapter_label: adapterLabel,
    fixture_pass: fixturePassed,
    real_ready: realAdapterReady,
    preflight_status: realAdapterReady
      ? "real_ready"
      : fixturePassed
        ? "fixture_pass_real_blocked"
        : "fixture_waiting",
    boundary_policy: {
      fixture_and_real_split: true,
      fixture_pass_not_real_ready: true,
      no_ready_sweetening: true,
      status_only: true,
    },
  };
  assertAdapterPreflightFixtureModeSplitSafe(split);
  return split;
}

export function assertAdapterPreflightFixtureModeSplitSafe(
  split,
  context = "adapter preflight fixture mode split"
) {
  if (!split || typeof split !== "object" || Array.isArray(split)) {
    throw new ContractError(`${context}: split required`);
  }
  if (split.schema !== "iris_adapter_preflight_fixture_mode_split_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(split)) {
    if (!FIXTURE_MODE_SPLIT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected split field`);
    }
  }
  if (!ADAPTER_LABELS.has(split.adapter_label)) {
    throw new ContractError(`${context}: invalid adapter label`);
  }
  if (typeof split.fixture_pass !== "boolean" || typeof split.real_ready !== "boolean") {
    throw new ContractError(`${context}: invalid fixture split boolean`);
  }
  const expectedStatus = split.real_ready
    ? "real_ready"
    : split.fixture_pass
      ? "fixture_pass_real_blocked"
      : "fixture_waiting";
  if (split.preflight_status !== expectedStatus) {
    throw new ContractError(`${context}: fixture status must not sweeten ready`);
  }
  assertFixtureModeBoundaryPolicy(split.boundary_policy, context);
  assertNoUnsafeText(split, context);
}

export function assertAdapterPreflightPacketSafe(
  packet,
  context = "adapter preflight packet"
) {
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
    throw new ContractError(`${context}: packet required`);
  }
  assertNoUnsafePacketFields(packet, context);
  assertNoUnsafeText(packet, context);
}

export function createAdapterPreflightRouteLabelValidation({
  route = "normal",
} = {}) {
  const routeLabel = safeRouteLabel(route);
  const validation = {
    schema: "iris_adapter_preflight_route_label_validation_v1",
    route_label: routeLabel,
    route_status:
      routeLabel === "review" ? "review_requires_validation" : "route_label_valid",
    execution_shortcut_allowed: routeLabel !== "review",
    boundary_policy: {
      route_labels_only: true,
      review_route_not_execution: true,
      no_execution_shortcut: true,
      status_only: true,
    },
  };
  assertAdapterPreflightRouteLabelValidationSafe(validation);
  return validation;
}

export function assertAdapterPreflightRouteLabelValidationSafe(
  validation,
  context = "adapter preflight route label validation"
) {
  if (!validation || typeof validation !== "object" || Array.isArray(validation)) {
    throw new ContractError(`${context}: validation required`);
  }
  if (validation.schema !== "iris_adapter_preflight_route_label_validation_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(validation)) {
    if (!ROUTE_LABEL_VALIDATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected validation field`);
    }
  }
  if (!ROUTE_LABELS.has(validation.route_label)) {
    throw new ContractError(`${context}: invalid route label`);
  }
  if (
    !["route_label_valid", "review_requires_validation"].includes(
      validation.route_status
    )
  ) {
    throw new ContractError(`${context}: invalid route status`);
  }
  if (typeof validation.execution_shortcut_allowed !== "boolean") {
    throw new ContractError(`${context}: invalid execution shortcut flag`);
  }
  if (
    validation.route_label === "review" &&
    (validation.route_status !== "review_requires_validation" ||
      validation.execution_shortcut_allowed)
  ) {
    throw new ContractError(`${context}: review route cannot be execution shortcut`);
  }
  if (
    validation.route_label !== "review" &&
    validation.route_status !== "route_label_valid"
  ) {
    throw new ContractError(`${context}: invalid non-review route status`);
  }
  assertRouteLabelBoundaryPolicy(validation.boundary_policy, context);
  assertNoUnsafeText(validation, context);
}

export function createAdapterPreflightStalePacketValidation({
  packetAgeMs = Number.POSITIVE_INFINITY,
  staleAfterMs = 30000,
} = {}) {
  const stale = !Number.isFinite(packetAgeMs) || packetAgeMs > staleAfterMs;
  const validation = {
    schema: "iris_adapter_preflight_stale_packet_validation_v1",
    packet_status: stale ? "stale_degraded" : "fresh_valid",
    age_bucket: stale ? "stale" : "fresh",
    execution_candidate_allowed: !stale,
    boundary_policy: {
      stale_not_ready: true,
      stale_not_execution_candidate: true,
      age_bucket_only: true,
      status_only: true,
    },
  };
  assertAdapterPreflightStalePacketValidationSafe(validation);
  return validation;
}

export function assertAdapterPreflightStalePacketValidationSafe(
  validation,
  context = "adapter preflight stale packet validation"
) {
  if (!validation || typeof validation !== "object" || Array.isArray(validation)) {
    throw new ContractError(`${context}: validation required`);
  }
  if (validation.schema !== "iris_adapter_preflight_stale_packet_validation_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(validation)) {
    if (!STALE_PACKET_VALIDATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected validation field`);
    }
  }
  if (!["fresh_valid", "stale_degraded"].includes(validation.packet_status)) {
    throw new ContractError(`${context}: invalid packet status`);
  }
  if (!["fresh", "stale"].includes(validation.age_bucket)) {
    throw new ContractError(`${context}: invalid age bucket`);
  }
  if (typeof validation.execution_candidate_allowed !== "boolean") {
    throw new ContractError(`${context}: invalid execution candidate flag`);
  }
  if (
    validation.age_bucket === "stale" &&
    (validation.packet_status !== "stale_degraded" ||
      validation.execution_candidate_allowed)
  ) {
    throw new ContractError(`${context}: stale packet cannot be ready or execution candidate`);
  }
  if (
    validation.age_bucket === "fresh" &&
    (validation.packet_status !== "fresh_valid" ||
      !validation.execution_candidate_allowed)
  ) {
    throw new ContractError(`${context}: fresh packet status mismatch`);
  }
  assertStalePacketBoundaryPolicy(validation.boundary_policy, context);
  assertNoUnsafeText(validation, context);
}

export function createAdapterPreflightTraceIdValidation({
  traceId,
  eventId,
} = {}) {
  const validation = {
    schema: "iris_adapter_preflight_trace_id_validation_v1",
    trace_id: safeTraceId(traceId),
    event_id: safeTraceId(eventId),
    trace_status: "trace_valid",
    boundary_policy: {
      trace_id_required: true,
      event_id_required: true,
      handoff_without_trace_rejected: true,
      status_only: true,
    },
  };
  assertAdapterPreflightTraceIdValidationSafe(validation);
  return validation;
}

export function assertAdapterPreflightTraceIdValidationSafe(
  validation,
  context = "adapter preflight trace id validation"
) {
  if (!validation || typeof validation !== "object" || Array.isArray(validation)) {
    throw new ContractError(`${context}: validation required`);
  }
  if (validation.schema !== "iris_adapter_preflight_trace_id_validation_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(validation)) {
    if (!TRACE_ID_VALIDATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected validation field`);
    }
  }
  if (!isSafeTraceId(validation.trace_id)) {
    throw new ContractError(`${context}: trace_id required`);
  }
  if (!isSafeTraceId(validation.event_id)) {
    throw new ContractError(`${context}: event_id required`);
  }
  if (validation.trace_status !== "trace_valid") {
    throw new ContractError(`${context}: invalid trace status`);
  }
  assertTraceIdBoundaryPolicy(validation.boundary_policy, context);
  assertNoUnsafeText(validation, context);
}

export function createAdapterPreflightSafeErrorCatalog({
  component = "tts",
  errorCode = "adapter_attention_required",
} = {}) {
  const catalog = {
    schema: "iris_adapter_preflight_safe_error_catalog_v1",
    component_label: safeAdapterLabel(component) ?? "tts",
    error_code: safeErrorCode(errorCode),
    error_status: "attention_required",
    boundary_policy: {
      fixed_error_code_only: true,
      summary_only: true,
      no_raw_vendor_response: true,
      no_renderer_job: true,
    },
  };
  assertAdapterPreflightSafeErrorCatalogSafe(catalog);
  return catalog;
}

export function assertAdapterPreflightSafeErrorCatalogSafe(
  catalog,
  context = "adapter preflight safe error catalog"
) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new ContractError(`${context}: catalog required`);
  }
  if (catalog.schema !== "iris_adapter_preflight_safe_error_catalog_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(catalog)) {
    if (!SAFE_ERROR_CATALOG_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected catalog field`);
    }
  }
  if (!ADAPTER_LABELS.has(catalog.component_label)) {
    throw new ContractError(`${context}: invalid component label`);
  }
  if (!SAFE_ERROR_CODES.has(catalog.error_code)) {
    throw new ContractError(`${context}: invalid error code`);
  }
  if (catalog.error_status !== "attention_required") {
    throw new ContractError(`${context}: invalid error status`);
  }
  assertSafeErrorBoundaryPolicy(catalog.boundary_policy, context);
  assertNoUnsafeText(catalog, context);
}

export function createAdapterPreflightPublicDiagnostic({
  component = "tts",
  safeErrorCode = "adapter_attention_required",
  status = "attention_required",
} = {}) {
  const diagnostic = {
    schema: "iris_adapter_preflight_public_diagnostic_v1",
    component_label: safeAdapterLabel(component) ?? "tts",
    diagnostic_status: safeDiagnosticStatus(status),
    safe_error_code: safeErrorCodeValue(safeErrorCode),
    boundary_policy: {
      safe_summary_only: true,
      no_raw_packet: true,
      no_world_command: true,
      no_secret: true,
      no_token: true,
      no_candidate: true,
      no_raw_response: true,
    },
  };
  assertAdapterPreflightPublicDiagnosticSafe(diagnostic);
  return diagnostic;
}

export function assertAdapterPreflightPublicDiagnosticSafe(
  diagnostic,
  context = "adapter preflight public diagnostic"
) {
  if (!diagnostic || typeof diagnostic !== "object" || Array.isArray(diagnostic)) {
    throw new ContractError(`${context}: diagnostic required`);
  }
  if (diagnostic.schema !== "iris_adapter_preflight_public_diagnostic_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(diagnostic)) {
    if (!PUBLIC_DIAGNOSTIC_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected diagnostic field`);
    }
  }
  if (!ADAPTER_LABELS.has(diagnostic.component_label)) {
    throw new ContractError(`${context}: invalid component label`);
  }
  if (!["ok", "attention_required", "blocked", "degraded"].includes(diagnostic.diagnostic_status)) {
    throw new ContractError(`${context}: invalid diagnostic status`);
  }
  if (!SAFE_ERROR_CODES.has(diagnostic.safe_error_code)) {
    throw new ContractError(`${context}: invalid safe error code`);
  }
  assertPublicDiagnosticBoundaryPolicy(diagnostic.boundary_policy, context);
  assertNoUnsafeText(diagnostic, context);
}

export function createAdapterPreflightAdminDiagnostic({
  viewRole = "ordinary",
  component = "tts",
  safeErrorCode = "adapter_attention_required",
  status = "attention_required",
} = {}) {
  const role = safeAdminViewRole(viewRole);
  const diagnostic = {
    schema: "iris_adapter_preflight_admin_diagnostic_v1",
    view_role: role,
    component_label: safeAdapterLabel(component) ?? "tts",
    diagnostic_status: safeDiagnosticStatus(status),
    safe_error_code: safeErrorCodeValue(safeErrorCode),
    owner_only_available: role === "owner" || role === "operator",
    boundary_policy: {
      ordinary_safe_summary_only: true,
      owner_only_role_gated: true,
      no_secret: true,
      no_token: true,
      no_endpoint: true,
      no_raw_diagnostics: true,
      no_raw_packet: true,
      no_world_command: true,
      no_candidate: true,
      no_raw_response: true,
    },
  };
  assertAdapterPreflightAdminDiagnosticSafe(diagnostic);
  return diagnostic;
}

export function assertAdapterPreflightAdminDiagnosticSafe(
  diagnostic,
  context = "adapter preflight admin diagnostic"
) {
  if (!diagnostic || typeof diagnostic !== "object" || Array.isArray(diagnostic)) {
    throw new ContractError(`${context}: diagnostic required`);
  }
  if (diagnostic.schema !== "iris_adapter_preflight_admin_diagnostic_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(diagnostic)) {
    if (!ADMIN_DIAGNOSTIC_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected diagnostic field`);
    }
  }
  if (!ADMIN_VIEW_ROLES.has(diagnostic.view_role)) {
    throw new ContractError(`${context}: invalid view role`);
  }
  if (!ADAPTER_LABELS.has(diagnostic.component_label)) {
    throw new ContractError(`${context}: invalid component label`);
  }
  if (!["ok", "attention_required", "blocked", "degraded"].includes(diagnostic.diagnostic_status)) {
    throw new ContractError(`${context}: invalid diagnostic status`);
  }
  if (!SAFE_ERROR_CODES.has(diagnostic.safe_error_code)) {
    throw new ContractError(`${context}: invalid safe error code`);
  }
  if (typeof diagnostic.owner_only_available !== "boolean") {
    throw new ContractError(`${context}: invalid owner-only gate`);
  }
  if (diagnostic.view_role === "ordinary" && diagnostic.owner_only_available) {
    throw new ContractError(`${context}: ordinary view cannot expose owner-only fields`);
  }
  assertAdminDiagnosticBoundaryPolicy(diagnostic.boundary_policy, context);
  assertNoUnsafeText(diagnostic, context);
}

export function createAdapterPreflightAdminPageSummary({
  statuses = {},
} = {}) {
  const adapterStatuses = ADMIN_PAGE_ADAPTER_LABELS.map((adapterLabel) => ({
    schema: "iris_adapter_preflight_admin_page_adapter_status_v1",
    adapter_label: adapterLabel,
    status: safeDiagnosticStatus(
      typeof statuses?.[adapterLabel] === "string"
        ? statuses[adapterLabel]
        : statuses?.[adapterLabel]?.status
    ),
  }));
  const readyCount = adapterStatuses.filter((item) => item.status === "ok").length;
  const summary = {
    schema: "iris_adapter_preflight_admin_page_summary_v1",
    page_status: readyCount === adapterStatuses.length ? "ready" : "attention",
    adapter_count: adapterStatuses.length,
    ready_adapter_count: readyCount,
    attention_adapter_count: adapterStatuses.length - readyCount,
    adapter_statuses: adapterStatuses,
    boundary_policy: Object.fromEntries(
      [...ADMIN_PAGE_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
    adapter_validation_required: true,
  };
  assertAdapterPreflightAdminPageSummarySafe(summary);
  return summary;
}

export function assertAdapterPreflightAdminPageSummarySafe(
  summary,
  context = "adapter preflight admin page summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_adapter_preflight_admin_page_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ADMIN_PAGE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (!["ready", "attention"].includes(summary.page_status)) {
    throw new ContractError(`${context}: invalid page status`);
  }
  if (!Array.isArray(summary.adapter_statuses)) {
    throw new ContractError(`${context}: adapter statuses required`);
  }
  const labels = summary.adapter_statuses.map((item) => item.adapter_label);
  if (JSON.stringify(labels) !== JSON.stringify(ADMIN_PAGE_ADAPTER_LABELS)) {
    throw new ContractError(`${context}: adapter labels must match admin page scope`);
  }
  let readyCount = 0;
  for (const adapterStatus of summary.adapter_statuses) {
    assertAdapterPreflightAdminPageAdapterStatusSafe(adapterStatus, context);
    if (adapterStatus.status === "ok") readyCount += 1;
  }
  if (
    summary.adapter_count !== summary.adapter_statuses.length ||
    summary.ready_adapter_count !== readyCount ||
    summary.attention_adapter_count !== summary.adapter_statuses.length - readyCount
  ) {
    throw new ContractError(`${context}: adapter status count mismatch`);
  }
  if (
    summary.page_status !==
    (readyCount === summary.adapter_statuses.length ? "ready" : "attention")
  ) {
    throw new ContractError(`${context}: invalid page aggregate status`);
  }
  assertAdminPageBoundaryPolicy(summary.boundary_policy, context);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
  assertNoUnsafeText(summary, context);
}

function assertAdapterPreflightAdminPageAdapterStatusSafe(
  adapterStatus,
  context
) {
  if (!adapterStatus || typeof adapterStatus !== "object" || Array.isArray(adapterStatus)) {
    throw new ContractError(`${context}: adapter status required`);
  }
  if (
    adapterStatus.schema !==
    "iris_adapter_preflight_admin_page_adapter_status_v1"
  ) {
    throw new ContractError(`${context}: invalid adapter status schema`);
  }
  for (const field of Object.keys(adapterStatus)) {
    if (!ADMIN_PAGE_ADAPTER_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected adapter status field`);
    }
  }
  if (!ADMIN_PAGE_ADAPTER_LABELS.includes(adapterStatus.adapter_label)) {
    throw new ContractError(`${context}: invalid adapter label`);
  }
  if (!["ok", "attention_required", "blocked", "degraded"].includes(adapterStatus.status)) {
    throw new ContractError(`${context}: invalid adapter status`);
  }
}

function createAdapterPreflightContract(adapterLabel) {
  return {
    schema: CONTRACT_SCHEMA,
    adapter_label: adapterLabel,
    preflight_required: true,
    safe_manifest_required: true,
    required_status_fields: [...REQUIRED_STATUS_FIELDS],
    forbidden_public_fields: [...FORBIDDEN_PUBLIC_FIELDS],
  };
}

function createRealAdapterHandshakeContract(adapterLabel) {
  return {
    schema: "iris_real_adapter_handshake_contract_v1",
    adapter_label: adapterLabel,
    handshake_required: true,
    real_connection_required_for_ready: true,
    required_fields: [...REAL_HANDSHAKE_REQUIRED_FIELDS],
    forbidden_summary_fields: [...REAL_HANDSHAKE_FORBIDDEN_SUMMARY_FIELDS],
  };
}

function assertRealAdapterHandshakeContractSafe(contract, context) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: handshake contract required`);
  }
  if (contract.schema !== "iris_real_adapter_handshake_contract_v1") {
    throw new ContractError(`${context}: invalid handshake contract schema`);
  }
  for (const field of Object.keys(contract)) {
    if (!REAL_HANDSHAKE_CONTRACT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected handshake contract field`);
    }
  }
  if (!REAL_HANDSHAKE_ADAPTER_LABELS.includes(contract.adapter_label)) {
    throw new ContractError(`${context}: invalid handshake adapter label`);
  }
  if (
    contract.handshake_required !== true ||
    contract.real_connection_required_for_ready !== true
  ) {
    throw new ContractError(`${context}: real handshake required`);
  }
  assertExactStringList(
    contract.required_fields,
    REAL_HANDSHAKE_REQUIRED_FIELDS,
    context
  );
  assertExactStringList(
    contract.forbidden_summary_fields,
    REAL_HANDSHAKE_FORBIDDEN_SUMMARY_FIELDS,
    context
  );
}

function assertAdapterPreflightContractSafe(contract, context) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: adapter contract required`);
  }
  if (contract.schema !== CONTRACT_SCHEMA) {
    throw new ContractError(`${context}: invalid contract schema`);
  }
  for (const field of Object.keys(contract)) {
    if (!CONTRACT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected contract field`);
    }
  }
  if (!ADAPTER_LABELS.has(contract.adapter_label)) {
    throw new ContractError(`${context}: invalid adapter label`);
  }
  if (
    contract.preflight_required !== true ||
    contract.safe_manifest_required !== true
  ) {
    throw new ContractError(`${context}: preflight manifest required`);
  }
  assertExactStringList(
    contract.required_status_fields,
    REQUIRED_STATUS_FIELDS,
    context
  );
  assertExactStringList(
    contract.forbidden_public_fields,
    FORBIDDEN_PUBLIC_FIELDS,
    context
  );
}

function safeDependencyComponent(dependency) {
  const componentLabel = safeAdapterLabel(
    typeof dependency === "string"
      ? dependency
      : dependency?.component_label ?? dependency?.component ?? dependency?.adapter
  );
  if (!componentLabel) return null;
  const rawStatus =
    typeof dependency === "string"
      ? "missing"
      : String(dependency?.component_status ?? dependency?.status ?? "missing")
          .trim()
          .toLowerCase();
  const componentStatus = rawStatus === "available" ? "available" : "missing";
  return {
    component_label: componentLabel,
    component_status: componentStatus,
  };
}

function assertDependencyComponentSafe(component, context) {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    throw new ContractError(`${context}: dependency component required`);
  }
  for (const field of Object.keys(component)) {
    if (!DEPENDENCY_COMPONENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected component field`);
    }
  }
  if (!ADAPTER_LABELS.has(component.component_label)) {
    throw new ContractError(`${context}: invalid component label`);
  }
  if (!["available", "missing"].includes(component.component_status)) {
    throw new ContractError(`${context}: invalid component status`);
  }
}

function assertExactStringList(actual, expected, context) {
  if (!Array.isArray(actual) || actual.length !== expected.length) {
    throw new ContractError(`${context}: invalid field list`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      throw new ContractError(`${context}: invalid field list`);
    }
  }
}

function assertNoUnsafePacketFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafePacketFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (UNSAFE_PACKET_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unsafe packet field`, { path });
    }
    assertNoUnsafePacketFields(child, context, `${path}.${field}`);
  }
}

function assertFixtureModeBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!FIXTURE_MODE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of FIXTURE_MODE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRouteLabelBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!ROUTE_LABEL_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of ROUTE_LABEL_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertStalePacketBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!STALE_PACKET_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of STALE_PACKET_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertTraceIdBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!TRACE_ID_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of TRACE_ID_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertSafeErrorBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!SAFE_ERROR_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of SAFE_ERROR_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertPublicDiagnosticBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!PUBLIC_DIAGNOSTIC_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of PUBLIC_DIAGNOSTIC_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertAdminDiagnosticBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!ADMIN_DIAGNOSTIC_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of ADMIN_DIAGNOSTIC_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertAdminPageBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!ADMIN_PAGE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of ADMIN_PAGE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDependencyBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!DEPENDENCY_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of DEPENDENCY_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRealHandshakeBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REAL_HANDSHAKE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of REAL_HANDSHAKE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRealHandshakeSafeSummaryBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REAL_HANDSHAKE_SAFE_SUMMARY_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of REAL_HANDSHAKE_SAFE_SUMMARY_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRealHandshakeTimeoutBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REAL_HANDSHAKE_TIMEOUT_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of REAL_HANDSHAKE_TIMEOUT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRealHandshakeStaleSuccessBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REAL_HANDSHAKE_STALE_SUCCESS_GUARD_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of REAL_HANDSHAKE_STALE_SUCCESS_GUARD_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRealHandshakeTraceCorrelationBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REAL_HANDSHAKE_TRACE_CORRELATION_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of REAL_HANDSHAKE_TRACE_CORRELATION_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRealAdapterCapabilitySummaryBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REAL_ADAPTER_CAPABILITY_SUMMARY_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of REAL_ADAPTER_CAPABILITY_SUMMARY_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRealAdapterUnsupportedCapabilityBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REAL_ADAPTER_UNSUPPORTED_CAPABILITY_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of REAL_ADAPTER_UNSUPPORTED_CAPABILITY_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRealAdapterReadinessGateBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REAL_ADAPTER_READINESS_GATE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of REAL_ADAPTER_READINESS_GATE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRealAdapterDryRunSummaryBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REAL_ADAPTER_DRY_RUN_SUMMARY_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of REAL_ADAPTER_DRY_RUN_SUMMARY_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRealAdapterE2EFixturePackBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REAL_ADAPTER_E2E_FIXTURE_PACK_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of REAL_ADAPTER_E2E_FIXTURE_PACK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRealAdapterSecretLeakFixtureBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REAL_ADAPTER_SECRET_LEAK_FIXTURE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of REAL_ADAPTER_SECRET_LEAK_FIXTURE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertTtsRealEngineConnectorPreflightBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!TTS_REAL_ENGINE_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of TTS_REAL_ENGINE_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertTtsRealEngineFreshnessGuardBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!TTS_REAL_ENGINE_FRESHNESS_GUARD_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of TTS_REAL_ENGINE_FRESHNESS_GUARD_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertTtsRealEnginePlaceholderSeparationBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!TTS_REAL_ENGINE_PLACEHOLDER_SEPARATION_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of TTS_REAL_ENGINE_PLACEHOLDER_SEPARATION_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertTtsRealEngineRightsGateBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!TTS_REAL_ENGINE_RIGHTS_GATE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of TTS_REAL_ENGINE_RIGHTS_GATE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertTtsRealEnginePacketDryRunBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!TTS_REAL_ENGINE_PACKET_DRY_RUN_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of TTS_REAL_ENGINE_PACKET_DRY_RUN_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertLive2dRealRendererConnectorPreflightBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!LIVE2D_REAL_RENDERER_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of LIVE2D_REAL_RENDERER_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertLive2dRealRendererFreshnessGuardBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!LIVE2D_REAL_RENDERER_FRESHNESS_GUARD_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of LIVE2D_REAL_RENDERER_FRESHNESS_GUARD_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertLive2dRealRendererCueValidationBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!LIVE2D_REAL_RENDERER_CUE_VALIDATION_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of LIVE2D_REAL_RENDERER_CUE_VALIDATION_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertLive2dRealRendererRecoveryRequirementBoundaryPolicy(
  policy,
  context
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!LIVE2D_REAL_RENDERER_RECOVERY_REQUIREMENT_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of LIVE2D_REAL_RENDERER_RECOVERY_REQUIREMENT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertLive2dRealRendererE2EFixturePackBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!LIVE2D_REAL_RENDERER_E2E_FIXTURE_PACK_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of LIVE2D_REAL_RENDERER_E2E_FIXTURE_PACK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertLive2dRealRendererModelPathLeakFixtureBoundaryPolicy(
  policy,
  context
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!LIVE2D_REAL_RENDERER_MODEL_PATH_LEAK_FIXTURE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of LIVE2D_REAL_RENDERER_MODEL_PATH_LEAK_FIXTURE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertObsRealPickupConnectorPreflightBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!OBS_REAL_PICKUP_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of OBS_REAL_PICKUP_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertObsRealPickupFreshnessGuardBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!OBS_REAL_PICKUP_FRESHNESS_GUARD_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of OBS_REAL_PICKUP_FRESHNESS_GUARD_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertObsRealPickupArtifactValidationBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!OBS_REAL_PICKUP_ARTIFACT_VALIDATION_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of OBS_REAL_PICKUP_ARTIFACT_VALIDATION_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertObsRealPickupMutationConfirmationBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!OBS_REAL_PICKUP_MUTATION_CONFIRMATION_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of OBS_REAL_PICKUP_MUTATION_CONFIRMATION_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertObsRealPickupE2EFixturePackBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!OBS_REAL_PICKUP_E2E_FIXTURE_PACK_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of OBS_REAL_PICKUP_E2E_FIXTURE_PACK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertObsRealPickupEventLeakFixtureBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!OBS_REAL_PICKUP_EVENT_LEAK_FIXTURE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of OBS_REAL_PICKUP_EVENT_LEAK_FIXTURE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDbRealConnectorPreflightBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!DB_REAL_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of DB_REAL_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDbRealConnectorAvailabilityGateBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!DB_REAL_CONNECTOR_AVAILABILITY_GATE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of DB_REAL_CONNECTOR_AVAILABILITY_GATE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDbRealConnectorSchemaFreshnessBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!DB_REAL_CONNECTOR_SCHEMA_FRESHNESS_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of DB_REAL_CONNECTOR_SCHEMA_FRESHNESS_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDbRealConnectorMigrationReadinessBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!DB_REAL_CONNECTOR_MIGRATION_READINESS_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of DB_REAL_CONNECTOR_MIGRATION_READINESS_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertGameRealAdapterConnectorPreflightBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!GAME_REAL_ADAPTER_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of GAME_REAL_ADAPTER_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertGameRealAdapterManualApprovalGateBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!GAME_REAL_ADAPTER_MANUAL_APPROVAL_GATE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of GAME_REAL_ADAPTER_MANUAL_APPROVAL_GATE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertGameRealAdapterApprovedSafeModeGateBoundaryPolicy(
  policy,
  context
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!GAME_REAL_ADAPTER_APPROVED_SAFE_MODE_GATE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of GAME_REAL_ADAPTER_APPROVED_SAFE_MODE_GATE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertGameRealAdapterEmergencyStopRequirementBoundaryPolicy(
  policy,
  context
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!GAME_REAL_ADAPTER_EMERGENCY_STOP_REQUIREMENT_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of GAME_REAL_ADAPTER_EMERGENCY_STOP_REQUIREMENT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertGameRealAdapterE2EFixturePackBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!GAME_REAL_ADAPTER_E2E_FIXTURE_PACK_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of GAME_REAL_ADAPTER_E2E_FIXTURE_PACK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertGameRealAdapterCommandLeakFixtureBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!GAME_REAL_ADAPTER_COMMAND_LEAK_FIXTURE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of GAME_REAL_ADAPTER_COMMAND_LEAK_FIXTURE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertYoutubeRealIngestConnectorPreflightBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!YOUTUBE_REAL_INGEST_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of YOUTUBE_REAL_INGEST_CONNECTOR_PREFLIGHT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertYoutubeRealIngestTokenFreshnessGuardBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!YOUTUBE_REAL_INGEST_TOKEN_FRESHNESS_GUARD_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of YOUTUBE_REAL_INGEST_TOKEN_FRESHNESS_GUARD_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertYoutubeRealIngestLiveChatFreshnessGuardBoundaryPolicy(
  policy,
  context
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!YOUTUBE_REAL_INGEST_LIVE_CHAT_FRESHNESS_GUARD_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of YOUTUBE_REAL_INGEST_LIVE_CHAT_FRESHNESS_GUARD_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertYoutubeRealIngestModerationReadinessBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!YOUTUBE_REAL_INGEST_MODERATION_READINESS_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of YOUTUBE_REAL_INGEST_MODERATION_READINESS_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertYoutubeRealIngestE2EFixturePackBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!YOUTUBE_REAL_INGEST_E2E_FIXTURE_PACK_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of YOUTUBE_REAL_INGEST_E2E_FIXTURE_PACK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertYoutubeRealIngestRawApiLeakFixtureBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!YOUTUBE_REAL_INGEST_RAW_API_LEAK_FIXTURE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of YOUTUBE_REAL_INGEST_RAW_API_LEAK_FIXTURE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function safeAdapterLabel(adapter) {
  const label = String(adapter ?? "").trim().toLowerCase();
  return ADAPTER_LABELS.has(label) ? label : null;
}

function safeRealHandshakeAdapterLabel(adapter) {
  const label = String(adapter ?? "").trim().toLowerCase();
  return REAL_HANDSHAKE_ADAPTER_LABELS.includes(label) ? label : null;
}

function safeRequiredRealHandshakeAdapterLabel(adapter) {
  const label = safeRealHandshakeAdapterLabel(adapter);
  if (!label) {
    throw new ContractError(
      "real adapter handshake trace correlation: component required"
    );
  }
  return label;
}

function safeHandshakeStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return ["ok", "attention_required", "blocked", "degraded"].includes(value)
    ? value
    : "attention_required";
}

function safeHandshakeTimeoutClassification(classification) {
  const value = String(classification ?? "").trim();
  return ["attention", "BLOCKED", "degraded"].includes(value)
    ? value
    : "attention";
}

function safeRealAdapterCapabilityLabel(capability) {
  const label = String(capability ?? "").trim().toLowerCase();
  return REAL_ADAPTER_CAPABILITY_LABELS.has(label) ? label : null;
}

function safeTtsConnectorStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return ["configured", "missing", "attention_required"].includes(value)
    ? value
    : "attention_required";
}

function safeLive2dRendererStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return ["configured", "missing", "attention_required"].includes(value)
    ? value
    : "attention_required";
}

function safeLive2dRendererCueKind(cueKind) {
  const value = String(cueKind ?? "").trim().toLowerCase();
  return LIVE2D_REAL_RENDERER_CUE_KINDS.has(value) ? value : null;
}

function safeLive2dRendererRecoveryIntensity(intensity) {
  const value = String(intensity ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_");
  return LIVE2D_REAL_RENDERER_RECOVERY_REQUIRED_INTENSITIES.has(value)
    ? value
    : "standard";
}

function safeObsPickupConnectorStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return ["configured", "missing", "attention_required"].includes(value)
    ? value
    : "attention_required";
}

function safeObsPickupMutationKind(kind) {
  const value = String(kind ?? "").trim().toLowerCase();
  return ["scene", "source"].includes(value) ? value : "scene";
}

function safeDbConnectorStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return ["configured", "missing", "attention_required"].includes(value)
    ? value
    : "attention_required";
}

function safeDbMigrationStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return ["applied", "pending", "missing"].includes(value) ? value : "missing";
}

function safeGameAdapterMode(mode) {
  const value = String(mode ?? "").trim().toLowerCase();
  return ["manual_approval", "approved_safe_adapter"].includes(value)
    ? value
    : "manual_approval";
}

function safeGameAdapterStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return ["configured", "missing", "attention_required"].includes(value)
    ? value
    : "attention_required";
}

function safeGameManualApprovalStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return ["approved", "pending", "attention_required"].includes(value)
    ? value
    : "pending";
}

function safeGameCooldownStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return ["ready", "cooling_down", "attention_required"].includes(value)
    ? value
    : "attention_required";
}

function safeYoutubeIngestStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return ["configured", "missing", "attention_required"].includes(value)
    ? value
    : "attention_required";
}

function safeYoutubeTokenStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return ["fresh", "expired", "missing"].includes(value) ? value : "missing";
}

function safeYoutubeDiscoveryStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return ["fresh", "stale", "missing"].includes(value) ? value : "missing";
}

function safeYoutubeModerationStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return ["confirmed", "unconfirmed", "missing"].includes(value)
    ? value
    : "missing";
}

function safeUnsupportedCapabilityLabel(capability) {
  const label = String(capability ?? "unsupported")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 48);
  return isSafeUnsupportedCapabilityLabel(label) ? label : "unsupported";
}

function isSafeUnsupportedCapabilityLabel(capability) {
  return (
    typeof capability === "string" &&
    /^[a-z0-9_]{1,48}$/.test(capability) &&
    !/secret|token|endpoint|payload|command|path|candidate|commit/.test(capability)
  );
}

function safeRouteLabel(route) {
  const label = String(route ?? "").trim().toLowerCase();
  return ROUTE_LABELS.has(label) ? label : "review";
}

function safeTraceId(value) {
  const id = String(value ?? "").trim();
  if (!isSafeTraceId(id)) {
    throw new ContractError("adapter preflight trace id validation: trace_id/event_id required");
  }
  return id;
}

function isSafeTraceId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,96}$/.test(value);
}

function safeErrorCode(value) {
  const code = String(value ?? "").trim().toLowerCase();
  return SAFE_ERROR_CODES.has(code) ? code : "adapter_attention_required";
}

function safeErrorCodeValue(value) {
  return safeErrorCode(value);
}

function safeDiagnosticStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  return ["ok", "attention_required", "blocked", "degraded"].includes(status)
    ? status
    : "attention_required";
}

function safeAdminViewRole(value) {
  const role = String(value ?? "").trim().toLowerCase();
  return ADMIN_VIEW_ROLES.has(role) ? role : "ordinary";
}

function assertNoUnsafeText(value, context) {
  const serialized = JSON.stringify(value);
  if (UNSAFE_TEXT_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: unsafe adapter preflight material`);
  }
}
