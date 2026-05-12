import { ContractError } from "../../core/contracts.js";
import { createAdminOperationsSummary } from "./adminOperationsSummary.js";
import { createIntegrationStatus } from "./integrationStatus.js";
import { createPersistenceStatus } from "./persistenceStatus.js";
import { createPublicReportBoundaryAuditReport } from "./publicReportBoundaryAudit.js";
import { createReadinessReport } from "./readinessReport.js";
import { ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES } from "./adminCharacterVoiceSettings.js";

const URL_PATTERN = /https?:\/\/|postgres:\/\/|postgresql:\/\//i;
const UNSAFE_ADMIN_DASHBOARD_REPORT_FRAGMENTS = [
  '"secret"',
  '"endpoint"',
  '"event_id"',
  '"trace_id"',
  '"subtitle_text"',
  '"raw_comment"',
  '"rawComment"',
  '"raw_support"',
  '"rawSupport"',
  '"raw_support_message"',
  '"rawSupportMessage"',
  '"raw_payload"',
  '"rawPayload"',
  '"raw_error"',
  '"rawError"',
  '"raw_job"',
  '"rawJob"',
  '"raw_memory"',
  '"rawMemory"',
  '"hidden_score"',
  '"hiddenScore"',
  '"hidden_relationship_score"',
  '"hiddenRelationshipScore"',
  '"candidate_payload"',
  '"candidatePayload"',
  '"command_payload"',
  '"commandPayload"',
  '"world_command"',
  '"worldCommand"',
  '"input_action_candidate"',
  '"approved_game_input_action"',
];
const UNSAFE_ADMIN_DASHBOARD_TEXT_PATTERN =
  /\b(secret|endpoint(?:_url)?|rawComment|raw_comment|rawSupport|raw_support|rawSupportMessage|raw_support_message|rawPayload|raw_payload|rawError|raw_error|rawJob|raw_job|payload|rawMemory|raw_memory|hiddenScore|hidden_score|hiddenRelationshipScore|hidden_relationship_score|candidatePayload|candidate_payload|commandPayload|command_payload|worldCommand|world_command)(?:\b|_)/i;
const ADMIN_PUBLIC_JSON_REDACTED_VALUE = "[redacted]";
const ADMIN_PUBLIC_JSON_UNSAFE_KEY_PATTERN =
  /(^|_)(secret|token|endpoint|url|raw|raw_comment|raw_memory|candidate|command|world_command|input_action_candidate|approved_game_input_action|payload)($|_)/i;
const ADMIN_PUBLIC_JSON_ROLE_GATED_KEY_PATTERN =
  /(^|_)(hidden_score|hidden_relationship_score|internal_stage|internal_relationship_stage|private_id|private_viewer_id)($|_)/i;
const ADMIN_PUBLIC_JSON_UNSAFE_TEXT_PATTERN =
  /https?:\/\/|\b(secret|token|endpoint|raw[_-]?comment|raw[_-]?memory|candidate|command|world[_-]?command|input[_-]?action[_-]?candidate|approved[_-]?game[_-]?input[_-]?action|payload)\b/i;
const SAFE_SCRIPT_PATTERN =
  /^(npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?|npm test)$/i;
const MODULE_IDS = new Set([
  "tts_live2d_obs_foundation",
  "youtube_comments_and_support",
  "memory_and_relationship_persistence",
  "vision_and_safe_game_control",
  "admin_operator_policy",
  "admin_review_queue",
  "anime_performance_matching",
]);
const MODULE_ADMIN_STATUSES = new Set([
  "configuration_waiting",
  "mock_verification_ready",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
  "ready",
]);
const WIDGET_STATUS = new Set([
  "ready",
  "attention_required",
  "configured",
  "not_configured",
  "operator_attention_required",
  "real_device_waiting",
  "real_credential_waiting",
  "disabled_by_safety_policy",
  "degraded_safe",
  "blocked",
  "implemented",
  "not_implemented",
]);
const WIDGET_IDS = new Set([
  "current_stream_mode",
  "runtime_state",
  "current_character_identity",
  "voice_profile_configured_status",
  "anime_performance_reference_status",
  "anime_expression_motion_match_status",
  "anime_voice_speech_match_status",
  "anime_ip_governance_status",
  "anime_voice_license_use_categories_status",
  "growth_business_operations_status",
  "tts_readiness",
  "live2d_readiness",
  "subtitle_readiness",
  "obs_readiness",
  "youtube_comment_readiness",
  "support_donation_ingest_readiness",
  "memory_store_readiness",
  "relationship_store_readiness",
  "vector_memory_readiness",
  "game_observation_readiness",
  "game_action_validation_readiness",
  "media_watch_readiness",
  "external_topic_readiness",
  "overlay_readiness",
  "replay_log_readiness",
  "scenario_rehearsal_readiness",
  "admin_review_queue_readiness",
  "admin_review_private_runner_readiness",
  "public_boundary_audit_status",
  "privacy_guard_status",
  "safety_boundary_status",
  "last_safe_heartbeat",
  "last_operator_action_summary",
  "current_degraded_components",
  "next_recommended_setup_step",
]);
const ADMIN_DASHBOARD_WIDGET_COUNT = WIDGET_IDS.size;
const ANIME_IDENTITY_WIDGET_DEFINITIONS = Object.freeze([
  Object.freeze({
    widgetId: "anime_performance_reference_status",
    title: "Anime Performance Reference",
    envNames: Object.freeze(["IRIS_ANIME_PERFORMANCE_REFERENCE_PROFILE_ID"]),
    configuredSummary: "anime_performance_reference_configured",
    incompleteSummary: "anime_performance_reference_not_configured",
  }),
  Object.freeze({
    widgetId: "anime_expression_motion_match_status",
    title: "Anime Expression And Motion Match",
    envNames: Object.freeze([
      "IRIS_ANIME_EXPRESSION_MATCH_PROFILE_ID",
      "IRIS_ANIME_GAZE_BLINK_MATCH_PROFILE_ID",
      "IRIS_ANIME_MOUTH_LIPSYNC_MATCH_PROFILE_ID",
      "IRIS_ANIME_POSTURE_GESTURE_MATCH_PROFILE_ID",
      "IRIS_ANIME_IDLE_BREATHING_MOTION_PROFILE_ID",
    ]),
    configuredSummary: "anime_expression_motion_match_configured",
    incompleteSummary: "anime_expression_motion_match_incomplete",
  }),
  Object.freeze({
    widgetId: "anime_voice_speech_match_status",
    title: "Anime Voice And Speech Match",
    envNames: Object.freeze([
      "IRIS_ANIME_VOICE_QUALITY_MATCH_PROFILE_ID",
      "IRIS_ANIME_INTONATION_ACCENT_MATCH_PROFILE_ID",
      "IRIS_ANIME_CATCHPHRASE_POLICY_ID",
      "IRIS_ANIME_SPEECH_TIMING_PROFILE_ID",
      "IRIS_ANIME_SUBTITLE_PACING_PROFILE_ID",
      "IRIS_ANIME_PERFORMANCE_APPROVAL_STATUS",
    ]),
    configuredSummary: "anime_voice_speech_match_configured",
    incompleteSummary: "anime_voice_speech_match_incomplete",
  }),
  Object.freeze({
    widgetId: "anime_ip_governance_status",
    title: "Anime IP Governance",
    envNames: Object.freeze([
      "IRIS_ANIME_CANON_BIBLE_PROFILE_ID",
      "IRIS_ANIME_SPOILER_RELEASE_POLICY_ID",
      "IRIS_ANIME_NON_CANON_LABEL_POLICY_ID",
      "IRIS_ANIME_IP_OWNER_APPROVAL_STATUS",
      "IRIS_ANIME_CANON_LAYER_POLICY_ID",
      "IRIS_ANIME_STREAM_MODE_POLICY_ID",
      "IRIS_ANIME_RELEASE_MODE_SCHEDULE_ID",
      "IRIS_ANIME_CHARACTER_COMMUNICATION_MODE_POLICY_ID",
    ]),
    configuredSummary: "anime_ip_governance_configured",
    incompleteSummary: "anime_ip_governance_incomplete",
  }),
  Object.freeze({
    widgetId: "anime_voice_license_use_categories_status",
    title: "Anime Voice License Use Categories",
    envNames: ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES,
    configuredSummary: "anime_voice_license_use_categories_configured",
    incompleteSummary: "anime_voice_license_use_categories_incomplete",
  }),
]);
const GROWTH_BUSINESS_WIDGET_DEFINITION = Object.freeze({
  widgetId: "growth_business_operations_status",
  title: "Growth Business Operations",
  envNames: Object.freeze([
    "IRIS_FAN_GROWTH_LIFECYCLE_POLICY_ID",
    "IRIS_COMMUNITY_RITUAL_REVIEW_POLICY_ID",
    "IRIS_AI_TRANSPARENCY_DISCLOSURE_POLICY_ID",
    "IRIS_CONTENT_STRATEGY_APPROVAL_POLICY_ID",
    "IRIS_MONETIZATION_SAFETY_POLICY_ID",
    "IRIS_OPERATOR_COMFORT_CHECKLIST_ID",
    "IRIS_COST_GOVERNANCE_BUDGET_POLICY_ID",
    "IRIS_PUBLIC_ANALYTICS_EXPORT_POLICY_ID",
  ]),
  configuredSummary: "growth_business_operations_configured",
  incompleteSummary: "growth_business_operations_incomplete",
});
const ADMIN_DASHBOARD_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "dashboard_status",
  "operator_language",
  "widget_count",
  "attention_widget_count",
  "widgets",
  "role_permission_summary",
  "module_summary",
  "verification_surfaces",
  "low_output_restart_summary",
  "boundary_policy",
]);
const ADMIN_DASHBOARD_BOUNDARY_FIELDS = [
  "read_only_admin_dashboard",
  "counts_statuses_and_route_paths_only",
  "operator_language_safe_labels_only",
  "env_names_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_connection_values",
  "no_live_payloads",
  "no_viewer_messages",
  "no_support_message_text",
  "no_memory_records",
  "no_relationship_records",
  "no_hidden_relationship_scores",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
  "no_raw_voice_samples",
  "no_dataset_paths",
  "no_internal_model_paths",
  "no_raw_jobs",
  "no_real_process_started",
  "no_database_connection_attempted",
  "no_game_or_os_input",
];
const ADMIN_DASHBOARD_WIDGET_BOUNDARY_FIELDS = [
  "status_count_boolean_safe_action_only",
  "safe_labels_only",
  "no_values",
  "no_raw_payloads",
  "no_raw_errors",
  "no_raw_jobs",
  "no_secret_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
];
const ADMIN_DASHBOARD_WIDGET_FIELDS = new Set([
  "schema",
  "widget_id",
  "title",
  "widget_status",
  "safe_summary_label",
  "safe_operator_action_summary",
  "boundary_policy",
]);
const ADMIN_OPERATOR_ACTION_SUMMARY_FIELDS = new Set([
  "actor_role",
  "action_type",
  "safe_target_label",
  "result_status",
  "live_side_effect",
  "confirmation_required",
  "executed",
]);
const ADMIN_OPERATOR_ACTION_ROLES = new Set([
  "owner",
  "operator",
  "moderator",
  "developer",
  "read_only",
]);
const ADMIN_OPERATOR_ACTION_TYPES = new Set([
  "none",
  "view",
  "confirm",
  "configure",
  "approve",
  "reject",
  "pause",
  "resume",
]);
const ADMIN_OPERATOR_ACTION_RESULTS = new Set([
  "not_recorded",
  "success",
  "rejected",
  "blocked",
  "pending_confirmation",
]);
const ADMIN_ROLE_PERMISSION_SUMMARY_FIELDS = new Set([
  "schema",
  "roles",
  "role_count",
  "boundary_policy",
]);
const ADMIN_ROLE_PERMISSION_ITEM_FIELDS = new Set([
  "role",
  "permission_labels",
]);
const ADMIN_ROLE_PERMISSION_LABELS = new Set([
  "production_settings_configure",
  "risky_policy_approve",
  "safe_export_request",
  "stream_run",
  "review_queue_manage",
  "feature_pause",
  "safe_settings_edit",
  "viewer_safety_review",
  "moderation_review",
  "relationship_summary_review",
  "diagnostics_view",
  "readiness_test",
  "safe_readiness_view",
  "safe_status_view",
]);
const ADMIN_ROLE_PERMISSION_BOUNDARY_FIELDS = [
  "safe_labels_only",
  "no_private_policy_raw_data",
  "no_secret_values",
  "no_endpoint_values",
  "no_payloads",
  "no_commands",
];
const ADMIN_DASHBOARD_MODULE_SUMMARY_FIELDS = new Set([
  "schema",
  "module_count",
  "ready_module_count",
  "attention_module_count",
  "next_module_id",
  "next_admin_status",
  "next_operator_action_id",
  "next_attention_area_id",
  "next_attention_area_missing_setting_count",
  "next_safe_script",
  "next_safe_script_catalog",
  "next_safe_script_catalog_count",
]);
const SAFE_RESTART_SCRIPT_PATTERN =
  /^(npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?|npm run preflight)$/i;
const LOW_OUTPUT_RESTART_SUMMARY_FIELDS = new Set([
  "entry_check_script",
  "first_check_script",
  "focus_check_script",
  "secondary_check_script",
  "full_preflight_script",
  "public_boundary_check_script",
  "required_lightweight_script_count",
  "missing_required_lightweight_script_count",
]);
const ADMIN_GLOBAL_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "dashboard_status",
  "widget_count",
  "attention_widget_count",
  "ready_module_count",
  "attention_module_count",
  "has_attention",
  "next_operator_action_id",
  "next_attention_area_id",
  "safe_next_action_available",
  "boundary_policy",
]);
const ADMIN_GLOBAL_SAFE_SUMMARY_BOUNDARY_FIELDS = [
  "status_count_boolean_only",
  "safe_next_action_id_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_raw_comments",
  "no_raw_frames",
  "no_candidates",
  "no_commands",
  "no_hidden_scores",
];
const UNSAFE_ADMIN_GLOBAL_SUMMARY_TEXT_PATTERN =
  /\b(secret|endpoint|raw[_-]?comment|raw[_-]?support|raw[_-]?memory|raw[_-]?frame|candidate|command|hidden[_-]?score|token|password|payload|script)\b/i;

export async function createAdminDashboard({
  env = process.env,
  runtime = null,
  streamState = null,
  httpIngestScheduler = null,
  overlayEventBus = null,
  generatedAtMs = Date.now(),
} = {}) {
  const state = streamState?.get?.() ?? {};
  const capabilities = runtime?.capabilities?.() ?? {};
  const candidateReviewStats = runtime?.candidateReviewStats?.() ?? null;
  const readinessReport = createReadinessReport({
    capabilities,
    state,
    candidateReviewStats,
    generatedAtMs,
  });
  const integrationStatus = createIntegrationStatus({
    env,
    runtime,
    streamState,
    httpIngestScheduler,
    overlayEventBus,
    generatedAtMs,
  });
  const persistenceStatus = createPersistenceStatus({
    capabilities,
    memoryRecordCount: runtimeListCount({
      runtime,
      methodName: "memoryRecords",
      args: [10_000],
      fallbackCount: 0,
      context: "admin dashboard memory records",
    }),
    relationshipProfileCount: runtimeListCount({
      runtime,
      methodName: "relationshipProfiles",
      fallbackCount: 0,
      context: "admin dashboard relationship profiles",
    }),
    replayEntryCount: runtimeListCount({
      runtime,
      methodName: "replayEntries",
      args: [10_000],
      fallbackCount: 0,
      context: "admin dashboard replay entries",
    }),
    candidateReviewStats,
    memoryStoreStatus: runtime?.memoryStoreStatus?.() ?? null,
    relationshipStoreStatus: runtime?.relationshipStoreStatus?.() ?? null,
    generatedAtMs,
  });
  const operationsSummary = await createAdminOperationsSummary({
    env,
    runtime,
    streamState,
    httpIngestScheduler,
    overlayEventBus,
    generatedAtMs,
  });
  const publicReportBoundaryAudit = createPublicReportBoundaryAuditReport();
  const nextModule =
    operationsSummary.next_module_id === null
      ? null
      : operationsSummary.modules.find(
          (module) => module.module_id === operationsSummary.next_module_id
        );
  if (operationsSummary.next_module_id !== null && !nextModule) {
    throw new ContractError("admin dashboard: next module summary is required");
  }

  const report = {
    schema: "iris_admin_dashboard_v1",
    generated_at_ms: generatedAtMs,
    dashboard_status:
      operationsSummary.summary_status === "ready" ? "ready" : "attention_required",
    operator_language: {
      summary_label:
        operationsSummary.summary_status === "ready"
          ? "IRIS is ready for the currently configured safe local operation."
          : "IRIS can run locally, but setup items still need operator attention before full production use.",
      next_step_label: operatorLabelForAction(
        operationsSummary.next_operator_action_id
      ),
    },
    widget_count: ADMIN_DASHBOARD_WIDGET_COUNT,
    attention_widget_count: 0,
    widgets: [],
    role_permission_summary: createRolePermissionSummary(),
    module_summary: {
      schema: "iris_admin_dashboard_module_summary_v1",
      module_count: operationsSummary.module_count,
      ready_module_count: operationsSummary.ready_module_count,
      attention_module_count: operationsSummary.attention_module_count,
      next_module_id: operationsSummary.next_module_id,
      next_admin_status: operationsSummary.next_admin_status,
      next_operator_action_id: operationsSummary.next_operator_action_id,
      next_attention_area_id: nextModule?.next_attention_area_id ?? null,
      next_attention_area_missing_setting_count:
        nextModule?.next_attention_area_missing_setting_count ?? 0,
      next_safe_script: operationsSummary.next_safe_script,
      next_safe_script_catalog: nextModule ? nextModule.safe_script_catalog : [],
      next_safe_script_catalog_count: nextModule
        ? nextModule.safe_script_catalog_count
        : 0,
    },
    verification_surfaces: operationsSummary.verification_surfaces,
    low_output_restart_summary: operationsSummary.low_output_restart_summary,
    boundary_policy: {
      read_only_admin_dashboard: true,
      counts_statuses_and_route_paths_only: true,
      operator_language_safe_labels_only: true,
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_connection_values: true,
      no_live_payloads: true,
      no_viewer_messages: true,
      no_support_message_text: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_hidden_relationship_scores: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_raw_voice_samples: true,
      no_dataset_paths: true,
      no_internal_model_paths: true,
      no_raw_jobs: true,
      no_real_process_started: true,
      no_database_connection_attempted: true,
      no_game_or_os_input: true,
    },
  };

  report.widgets = buildWidgets({
    env,
    state,
    readinessReport,
    integrationStatus,
    persistenceStatus,
    operationsSummary,
    publicReportBoundaryAudit,
    generatedAtMs,
  });
  report.attention_widget_count = report.widgets.filter(
    (widget) => widget.widget_status !== "ready" && widget.widget_status !== "configured"
  ).length;

  assertAdminDashboardSafe(report);
  return report;
}

export function redactAdminPublicJson(value, { viewRole = "ordinary" } = {}) {
  const ownerOperatorView = viewRole === "owner" || viewRole === "operator";
  if (Array.isArray(value)) {
    return value.map((item) => redactAdminPublicJson(item, { viewRole }));
  }
  if (typeof value === "string") {
    return ADMIN_PUBLIC_JSON_UNSAFE_TEXT_PATTERN.test(value)
      ? ADMIN_PUBLIC_JSON_REDACTED_VALUE
      : value;
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const safe = {};
  for (const [key, childValue] of Object.entries(value)) {
    const normalizedKey = key
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (ADMIN_PUBLIC_JSON_UNSAFE_KEY_PATTERN.test(normalizedKey)) {
      continue;
    }
    if (!ownerOperatorView && ADMIN_PUBLIC_JSON_ROLE_GATED_KEY_PATTERN.test(normalizedKey)) {
      continue;
    }
    safe[key] = redactAdminPublicJson(childValue, { viewRole });
  }
  return safe;
}

function runtimeListCount({
  runtime,
  methodName,
  args = [],
  fallbackCount,
  context,
}) {
  if (!runtime || typeof runtime[methodName] !== "function") return fallbackCount;
  const values = runtime[methodName](...args);
  if (!Array.isArray(values)) {
    throw new ContractError(`${context}: runtime list is required`);
  }
  return values.length;
}

export function assertAdminDashboardSafe(report, context = "admin dashboard") {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  assertNoUnsafeReportLeak(report, context);
  if (report.schema !== "iris_admin_dashboard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!ADMIN_DASHBOARD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected dashboard field ${field}`);
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (!["ready", "attention_required"].includes(report.dashboard_status)) {
    throw new ContractError(`${context}: invalid dashboard status`);
  }
  if (
    !Array.isArray(report.widgets) ||
    report.widgets.length !== ADMIN_DASHBOARD_WIDGET_COUNT
  ) {
    throw new ContractError(`${context}: widgets required`);
  }
  report.widgets.forEach((widget) => assertDashboardWidgetSafe(widget, context));
  if (
    new Set(report.widgets.map((widget) => widget.widget_id)).size !==
    ADMIN_DASHBOARD_WIDGET_COUNT
  ) {
    throw new ContractError(`${context}: duplicate widget id`);
  }
  if (report.widget_count !== report.widgets.length) {
    throw new ContractError(`${context}: widget count mismatch`);
  }
  const attentionCount = report.widgets.filter(
    (widget) => widget.widget_status !== "ready" && widget.widget_status !== "configured"
  ).length;
  if (report.attention_widget_count !== attentionCount) {
    throw new ContractError(`${context}: attention widget count mismatch`);
  }
  assertDashboardModuleSummarySafe(report.module_summary, context);
  assertRolePermissionSummarySafe(report.role_permission_summary, context);
  assertDashboardVerificationSurfacesSafe(report.verification_surfaces, context);
  assertLowOutputRestartSummarySafe(report.low_output_restart_summary, context);
  if (
    !report.operator_language ||
    typeof report.operator_language.summary_label !== "string" ||
    typeof report.operator_language.next_step_label !== "string"
  ) {
    throw new ContractError(`${context}: operator language required`);
  }
  assertBoundaryPolicy(
    report.boundary_policy,
    ADMIN_DASHBOARD_BOUNDARY_FIELDS,
    `${context} boundary policy`
  );
}

export function createAdminGlobalDashboardSafeSummary(
  report,
  context = "admin global dashboard safe summary"
) {
  assertAdminDashboardSafe(report, context);
  const nextOperatorActionId = safeActionId(report.module_summary?.next_operator_action_id);
  const nextAttentionAreaId = safeActionId(report.module_summary?.next_attention_area_id);
  const summary = {
    schema: "iris_admin_global_dashboard_safe_summary_v1",
    generated_at_ms: report.generated_at_ms,
    dashboard_status: report.dashboard_status,
    widget_count: report.widget_count,
    attention_widget_count: report.attention_widget_count,
    ready_module_count: report.module_summary.ready_module_count,
    attention_module_count: report.module_summary.attention_module_count,
    has_attention: report.attention_widget_count > 0,
    next_operator_action_id: nextOperatorActionId,
    next_attention_area_id: nextAttentionAreaId,
    safe_next_action_available: nextOperatorActionId !== null || nextAttentionAreaId !== null,
    boundary_policy: {
      status_count_boolean_only: true,
      safe_next_action_id_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_comments: true,
      no_raw_frames: true,
      no_candidates: true,
      no_commands: true,
      no_hidden_scores: true,
    },
  };
  assertAdminGlobalDashboardSafeSummary(summary, context);
  return summary;
}

export function assertAdminGlobalDashboardSafeSummary(
  summary,
  context = "admin global dashboard safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  if (URL_PATTERN.test(JSON.stringify(summary))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (UNSAFE_ADMIN_GLOBAL_SUMMARY_TEXT_PATTERN.test(JSON.stringify(summary))) {
    throw new ContractError(`${context}: unsafe public summary text exposed`);
  }
  if (summary.schema !== "iris_admin_global_dashboard_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ADMIN_GLOBAL_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field ${field}`);
    }
  }
  for (const field of [
    "generated_at_ms",
    "widget_count",
    "attention_widget_count",
    "ready_module_count",
    "attention_module_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!["ready", "attention_required"].includes(summary.dashboard_status)) {
    throw new ContractError(`${context}: invalid dashboard status`);
  }
  for (const field of ["has_attention", "safe_next_action_available"]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of ["next_operator_action_id", "next_attention_area_id"]) {
    if (
      summary[field] !== null &&
      (typeof summary[field] !== "string" || !/^[a-z0-9_]+$/.test(summary[field]))
    ) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    ADMIN_GLOBAL_SAFE_SUMMARY_BOUNDARY_FIELDS,
    `${context} boundary policy`
  );
}

function assertNoUnsafeReportLeak(report, context) {
  const serialized = JSON.stringify(report);
  const leaked = UNSAFE_ADMIN_DASHBOARD_REPORT_FRAGMENTS.filter((fragment) =>
    serialized.includes(fragment)
  );
  if (leaked.length > 0) {
    throw new ContractError(`${context}: unsafe fragment(s) exposed: ${leaked.join(", ")}`);
  }
  if (UNSAFE_ADMIN_DASHBOARD_TEXT_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: unsafe public summary text exposed`);
  }
}

function safeActionId(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return /^[a-z0-9_]+$/.test(text) ? text : null;
}

function assertLowOutputRestartSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: low output restart summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (!LOW_OUTPUT_RESTART_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected low output restart field`);
    }
  }
  for (const field of [
    "entry_check_script",
    "first_check_script",
    "focus_check_script",
    "secondary_check_script",
    "full_preflight_script",
    "public_boundary_check_script",
  ]) {
    if (!SAFE_RESTART_SCRIPT_PATTERN.test(summary[field])) {
      throw new ContractError(`${context}: invalid low output restart script`);
    }
  }
  if (summary.first_check_script !== "npm run dev:production:attention-digest") {
    throw new ContractError(`${context}: invalid low output first script`);
  }
  if (summary.full_preflight_script !== "npm run preflight") {
    throw new ContractError(`${context}: invalid low output preflight script`);
  }
  if (
    summary.public_boundary_check_script !==
    "npm run dev:public-report-boundary-audit"
  ) {
    throw new ContractError(`${context}: invalid low output boundary script`);
  }
  for (const field of [
    "required_lightweight_script_count",
    "missing_required_lightweight_script_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid low output lightweight count`);
    }
  }
  if (summary.required_lightweight_script_count <= 0) {
    throw new ContractError(`${context}: low output required count must be positive`);
  }
  if (
    summary.missing_required_lightweight_script_count >
    summary.required_lightweight_script_count
  ) {
    throw new ContractError(`${context}: low output missing count mismatch`);
  }
}

function buildWidgets({
  env,
  state,
  readinessReport,
  integrationStatus,
  persistenceStatus,
  operationsSummary,
  publicReportBoundaryAudit,
  generatedAtMs,
}) {
  const stageById = new Map(
    operationsSummary.modules.map((module) => [module.module_id, module])
  );
  const foundation = stageById.get("tts_live2d_obs_foundation");
  const youtube = stageById.get("youtube_comments_and_support");
  const persistence = stageById.get("memory_and_relationship_persistence");
  const gameplay = stageById.get("vision_and_safe_game_control");
  const adminReview = stageById.get("admin_review_queue");
  const currentMode = safeModeLabel(state?.stream_mode ?? state?.mode);
  const runtimeState = readinessReport.readiness_status === "ready_for_local_dev"
    ? "ready"
    : "operator_attention_required";

  return [
    widget("current_stream_mode", "Current Stream Mode", "configured", currentMode),
    widget("runtime_state", "Runtime State", runtimeState, readinessReport.readiness_status),
    widget(
      "current_character_identity",
      "Current Character Identity",
      "configured",
      env.IRIS_CHARACTER_PROFILE_ID ? "custom_profile_configured" : "default_iris_profile"
    ),
    widget(
      "voice_profile_configured_status",
      "Voice Profile",
      env.IRIS_CHARACTER_VOICE_PROFILE_ID ? "configured" : "operator_attention_required",
      env.IRIS_CHARACTER_VOICE_PROFILE_ID
        ? "character_voice_profile_configured"
        : "voice_profile_not_configured"
    ),
    ...ANIME_IDENTITY_WIDGET_DEFINITIONS.map((definition) =>
      configuredWidget(env, definition)
    ),
    configuredWidget(env, GROWTH_BUSINESS_WIDGET_DEFINITION),
    widget("tts_readiness", "TTS Readiness", moduleStatus(foundation), "tts_bridge_status_summary"),
    widget(
      "live2d_readiness",
      "Live2D Readiness",
      moduleStatus(foundation),
      "live2d_bridge_status_summary"
    ),
    widget(
      "subtitle_readiness",
      "Subtitle Readiness",
      moduleStatus(foundation),
      "subtitle_bridge_status_summary"
    ),
    widget("obs_readiness", "OBS Readiness", moduleStatus(foundation), "obs_overlay_status_summary"),
    widget(
      "youtube_comment_readiness",
      "YouTube Comment Readiness",
      moduleStatus(youtube),
      "youtube_ingest_status_summary"
    ),
    widget(
      "support_donation_ingest_readiness",
      "Support And Donation Ingest",
      moduleStatus(youtube),
      "support_ingest_status_summary"
    ),
    widget(
      "memory_store_readiness",
      "Memory Store",
      persistenceStatus.enabled?.persistence ? "ready" : "operator_attention_required",
      persistenceStatus.enabled?.persistence ? "memory_store_enabled" : "memory_store_not_enabled"
    ),
    widget(
      "relationship_store_readiness",
      "Relationship Store",
      persistenceStatus.enabled?.relationship_memory ? "ready" : "operator_attention_required",
      persistenceStatus.enabled?.relationship_memory
        ? "relationship_store_enabled"
        : "relationship_store_not_enabled"
    ),
    widget(
      "vector_memory_readiness",
      "Vector Memory",
      moduleStatus(persistence),
      "vector_memory_status_summary"
    ),
    widget(
      "game_observation_readiness",
      "Game Observation",
      moduleStatus(gameplay),
      "game_observation_status_summary"
    ),
    widget(
      "game_action_validation_readiness",
      "Game Action Validation",
      moduleStatus(gameplay),
      "safe_action_validation_status_summary"
    ),
    widget(
      "media_watch_readiness",
      "Media Watch",
      moduleStatus(youtube),
      "media_watch_status_summary"
    ),
    widget(
      "external_topic_readiness",
      "External Topic",
      moduleStatus(youtube),
      "external_topic_status_summary"
    ),
    widget(
      "overlay_readiness",
      "Overlay",
      integrationStatus.overlay?.configured ? "ready" : moduleStatus(foundation),
      "overlay_status_summary"
    ),
    widget("replay_log_readiness", "Replay Log", "ready", "safe_replay_summary_available"),
    widget(
      "scenario_rehearsal_readiness",
      "Scenario Rehearsal",
      "ready",
      "local_scenario_suite_available"
    ),
    widget(
      "admin_review_queue_readiness",
      "Admin Review Queue",
      moduleStatus(adminReview),
      adminReview?.next_operator_action_id ?? "admin_review_queue_clear"
    ),
    widget(
      "admin_review_private_runner_readiness",
      "Admin Review Private Runner",
      moduleStatus(adminReview),
      adminReview?.admin_status === "ready"
        ? "admin_review_private_runner_no_pending_items"
        : "admin_review_private_runner_requires_operator_review"
    ),
    widget(
      "public_boundary_audit_status",
      "Public Boundary Audit",
      publicReportBoundaryAudit.ok
        ? "ready"
        : "operator_attention_required",
      publicReportBoundaryAudit.ok
        ? "public_boundary_audit_ok"
        : "public_boundary_audit_attention_required"
    ),
    widget("privacy_guard_status", "Privacy Guard", "ready", "privacy_boundaries_active"),
    widget("safety_boundary_status", "Safety Boundary", "ready", "safety_boundaries_active"),
    widget(
      "last_safe_heartbeat",
      "Last Safe Heartbeat",
      "ready",
      `generated_at_${generatedAtMs}`
    ),
    widget(
      "last_operator_action_summary",
      "Last Operator Action",
      "implemented",
      "read_only_summary_no_action_recorded",
      {
        actor_role: "operator",
        action_type: "none",
        safe_target_label: "admin_dashboard",
        result_status: "not_recorded",
        live_side_effect: false,
        confirmation_required: false,
        executed: false,
      }
    ),
    widget(
      "current_degraded_components",
      "Current Degraded Components",
      operationsSummary.attention_module_count > 0 ? "degraded_safe" : "ready",
      `attention_modules_${operationsSummary.attention_module_count}`
    ),
    widget(
      "next_recommended_setup_step",
      "Next Recommended Setup Step",
      operationsSummary.next_operator_action_id ? "operator_attention_required" : "ready",
      operationsSummary.next_operator_action_id ?? "no_next_step"
    ),
  ];
}

function configuredWidget(env, definition) {
  const configured = allConfigured(env, definition.envNames);
  return widget(
    definition.widgetId,
    definition.title,
    configured ? "configured" : "operator_attention_required",
    configured ? definition.configuredSummary : definition.incompleteSummary
  );
}

function widget(widgetId, title, status, safeSummary, safeOperatorActionSummary = null) {
  return {
    schema: "iris_admin_dashboard_widget_v1",
    widget_id: widgetId,
    title,
    widget_status: status,
    safe_summary_label: safeSummary,
    safe_operator_action_summary: safeOperatorActionSummary,
    boundary_policy: {
      status_count_boolean_safe_action_only: true,
      safe_labels_only: true,
      no_values: true,
      no_raw_payloads: true,
      no_raw_errors: true,
      no_raw_jobs: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function moduleStatus(module) {
  if (!module) return "operator_attention_required";
  if (module.admin_status === "ready" || module.admin_status === "mock_verification_ready") {
    return "ready";
  }
  if (module.admin_status === "real_device_waiting") return "real_device_waiting";
  if (module.admin_status === "runtime_waiting") return "operator_attention_required";
  return "operator_attention_required";
}

function allConfigured(env, names) {
  return names.every((name) => String(env?.[name] ?? "").trim().length > 0);
}

function createRolePermissionSummary() {
  const roles = [
    rolePermission("owner", [
      "production_settings_configure",
      "risky_policy_approve",
      "safe_export_request",
    ]),
    rolePermission("operator", [
      "stream_run",
      "review_queue_manage",
      "feature_pause",
      "safe_settings_edit",
    ]),
    rolePermission("moderator", [
      "viewer_safety_review",
      "moderation_review",
      "relationship_summary_review",
    ]),
    rolePermission("developer", ["diagnostics_view", "readiness_test"]),
    rolePermission("read_only", ["safe_readiness_view", "safe_status_view"]),
  ];
  return {
    schema: "iris_admin_role_permission_summary_v1",
    roles,
    role_count: roles.length,
    boundary_policy: {
      safe_labels_only: true,
      no_private_policy_raw_data: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_commands: true,
    },
  };
}

function rolePermission(role, permissionLabels) {
  return {
    role,
    permission_labels: permissionLabels,
  };
}

function operatorLabelForAction(actionId) {
  switch (actionId) {
    case "configure_missing_env_names":
      return "Review missing configuration names and run the next safe verification.";
    case "run_next_safe_verification":
      return "Run the next local verification script before live operation.";
    case "configure_postgres_admin_save_preflight":
      return "Review PostgreSQL admin save preflight before enabling real persistence.";
    case "review_before_real_postgres_enablement":
      return "Review mock persistence results before any real database enablement.";
    default:
      return "No operator action is required by the dashboard.";
  }
}

function safeModeLabel(value) {
  const normalized = String(value ?? "idle").trim().toLowerCase();
  if (/^[a-z0-9_-]{1,48}$/.test(normalized)) return normalized;
  return "idle";
}

function assertDashboardWidgetSafe(widget, context) {
  if (!widget || typeof widget !== "object" || Array.isArray(widget)) {
    throw new ContractError(`${context}: widget required`);
  }
  if (widget.schema !== "iris_admin_dashboard_widget_v1") {
    throw new ContractError(`${context}: invalid widget schema`);
  }
  for (const field of Object.keys(widget)) {
    if (!ADMIN_DASHBOARD_WIDGET_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected widget field ${field}`);
    }
  }
  if (!WIDGET_IDS.has(widget.widget_id)) {
    throw new ContractError(`${context}: invalid widget id`);
  }
  if (!WIDGET_STATUS.has(widget.widget_status)) {
    throw new ContractError(`${context}: invalid widget status`);
  }
  if (typeof widget.title !== "string" || widget.title.length < 1) {
    throw new ContractError(`${context}: widget title required`);
  }
  if (
    typeof widget.safe_summary_label !== "string" ||
    !/^[a-zA-Z0-9_. -]+$/.test(widget.safe_summary_label)
  ) {
    throw new ContractError(`${context}: invalid widget summary label`);
  }
  if (/(^|[_ .-])(endpoint|token|path|url|secret|payload|command)([_ .-]|$)/i.test(widget.safe_summary_label)) {
    throw new ContractError(`${context}: unsafe widget summary label`);
  }
  assertSafeOperatorActionSummary(widget, context);
  assertBoundaryPolicy(
    widget.boundary_policy,
    ADMIN_DASHBOARD_WIDGET_BOUNDARY_FIELDS,
    `${context} widget boundary policy`
  );
}

function assertSafeOperatorActionSummary(widget, context) {
  const summary = widget.safe_operator_action_summary;
  if (widget.widget_id !== "last_operator_action_summary") {
    if (summary !== null) {
      throw new ContractError(`${context}: unexpected operator action summary`);
    }
    return;
  }
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: operator action summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (!ADMIN_OPERATOR_ACTION_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected operator action summary field ${field}`);
    }
  }
  if (!ADMIN_OPERATOR_ACTION_ROLES.has(summary.actor_role)) {
    throw new ContractError(`${context}: invalid operator action actor role`);
  }
  if (!ADMIN_OPERATOR_ACTION_TYPES.has(summary.action_type)) {
    throw new ContractError(`${context}: invalid operator action type`);
  }
  if (!ADMIN_OPERATOR_ACTION_RESULTS.has(summary.result_status)) {
    throw new ContractError(`${context}: invalid operator action result`);
  }
  if (
    typeof summary.safe_target_label !== "string" ||
    !/^[a-z0-9_]{1,80}$/.test(summary.safe_target_label)
  ) {
    throw new ContractError(`${context}: invalid operator action safe target`);
  }
  if (/(^|_)(endpoint|token|path|url|secret|payload|command|candidate|raw)($|_)/i.test(summary.safe_target_label)) {
    throw new ContractError(`${context}: unsafe operator action safe target`);
  }
  for (const field of ["live_side_effect", "confirmation_required", "executed"]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid operator action ${field}`);
    }
  }
  if (summary.live_side_effect && !summary.confirmation_required) {
    throw new ContractError(`${context}: live side effect confirmation required`);
  }
  if (summary.confirmation_required && summary.result_status === "pending_confirmation" && summary.executed) {
    throw new ContractError(`${context}: pending live side effect cannot be executed`);
  }
  if (
    summary.live_side_effect &&
    summary.executed &&
    (summary.action_type !== "confirm" || summary.result_status !== "success")
  ) {
    throw new ContractError(`${context}: live side effect executed without confirmation success`);
  }
}

function assertRolePermissionSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: role permission summary required`);
  }
  if (summary.schema !== "iris_admin_role_permission_summary_v1") {
    throw new ContractError(`${context}: invalid role permission summary schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ADMIN_ROLE_PERMISSION_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected role permission field ${field}`);
    }
  }
  if (!Array.isArray(summary.roles) || summary.roles.length !== ADMIN_OPERATOR_ACTION_ROLES.size) {
    throw new ContractError(`${context}: role permission roles required`);
  }
  if (summary.role_count !== summary.roles.length) {
    throw new ContractError(`${context}: role permission count mismatch`);
  }
  const seenRoles = new Set();
  for (const roleSummary of summary.roles) {
    if (!roleSummary || typeof roleSummary !== "object" || Array.isArray(roleSummary)) {
      throw new ContractError(`${context}: role permission item required`);
    }
    for (const field of Object.keys(roleSummary)) {
      if (!ADMIN_ROLE_PERMISSION_ITEM_FIELDS.has(field)) {
        throw new ContractError(`${context}: unexpected role permission item field ${field}`);
      }
    }
    if (!ADMIN_OPERATOR_ACTION_ROLES.has(roleSummary.role) || seenRoles.has(roleSummary.role)) {
      throw new ContractError(`${context}: invalid role permission role`);
    }
    seenRoles.add(roleSummary.role);
    if (
      !Array.isArray(roleSummary.permission_labels) ||
      roleSummary.permission_labels.length < 1 ||
      roleSummary.permission_labels.some((label) => !ADMIN_ROLE_PERMISSION_LABELS.has(label))
    ) {
      throw new ContractError(`${context}: invalid role permission label`);
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    ADMIN_ROLE_PERMISSION_BOUNDARY_FIELDS,
    `${context} role permission boundary policy`
  );
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertDashboardVerificationSurfacesSafe(surfaces, context) {
  if (!surfaces || typeof surfaces !== "object" || Array.isArray(surfaces)) {
    throw new ContractError(`${context}: verification surfaces required`);
  }
  if (surfaces.schema !== "iris_admin_operations_verification_surfaces_v1") {
    throw new ContractError(`${context}: invalid verification surfaces schema`);
  }
  for (const [key, value] of Object.entries(surfaces)) {
    if (key === "schema") continue;
    if (key === "debug_routes") {
      if (
        !Array.isArray(value) ||
        value.some(
          (route) =>
            typeof route !== "string" || !/^\/[a-z0-9/_-]+$/i.test(route)
        )
      ) {
        throw new ContractError(`${context}: invalid verification route`);
      }
      continue;
    }
    if (typeof value !== "string" || !SAFE_SCRIPT_PATTERN.test(value)) {
      throw new ContractError(`${context}: invalid verification script`);
    }
  }
}

function assertDashboardModuleSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: module summary required`);
  }
  if (summary.schema !== "iris_admin_dashboard_module_summary_v1") {
    throw new ContractError(`${context}: invalid module summary schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ADMIN_DASHBOARD_MODULE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: unexpected module summary field ${field}`
      );
    }
  }
  for (const field of [
    "module_count",
    "ready_module_count",
    "attention_module_count",
    "next_attention_area_missing_setting_count",
    "next_safe_script_catalog_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid module summary ${field}`);
    }
  }
  if (
    summary.ready_module_count + summary.attention_module_count !==
    summary.module_count
  ) {
    throw new ContractError(`${context}: module count mismatch`);
  }
  if (
    !Array.isArray(summary.next_safe_script_catalog) ||
    summary.next_safe_script_catalog.length !==
      summary.next_safe_script_catalog_count ||
    summary.next_safe_script_catalog.length > 12 ||
    summary.next_safe_script_catalog.some(
      (script) => typeof script !== "string" || !SAFE_SCRIPT_PATTERN.test(script)
    )
  ) {
    throw new ContractError(`${context}: invalid module script catalog`);
  }
  if (
    new Set(summary.next_safe_script_catalog).size !==
    summary.next_safe_script_catalog.length
  ) {
    throw new ContractError(`${context}: duplicate module script catalog item`);
  }
  if (
    summary.next_safe_script !== null &&
    summary.next_safe_script !== undefined &&
    (!SAFE_SCRIPT_PATTERN.test(summary.next_safe_script) ||
      !summary.next_safe_script_catalog.includes(summary.next_safe_script))
  ) {
    throw new ContractError(`${context}: invalid next safe script`);
  }
  if (
    summary.next_module_id !== null &&
    summary.next_module_id !== undefined &&
    !MODULE_IDS.has(summary.next_module_id)
  ) {
    throw new ContractError(`${context}: invalid next module id`);
  }
  if (
    summary.next_admin_status !== null &&
    summary.next_admin_status !== undefined &&
    !MODULE_ADMIN_STATUSES.has(summary.next_admin_status)
  ) {
    throw new ContractError(`${context}: invalid next admin status`);
  }
  if (
    summary.next_operator_action_id !== null &&
    summary.next_operator_action_id !== undefined &&
    (typeof summary.next_operator_action_id !== "string" ||
      !/^[a-z0-9_]+$/.test(summary.next_operator_action_id))
  ) {
    throw new ContractError(`${context}: invalid next operator action`);
  }
  if (
    summary.next_attention_area_id !== null &&
    summary.next_attention_area_id !== undefined &&
    (typeof summary.next_attention_area_id !== "string" ||
      !/^[a-z0-9_]+$/.test(summary.next_attention_area_id))
  ) {
    throw new ContractError(`${context}: invalid next attention area`);
  }
  if (
    summary.next_attention_area_id === null &&
    summary.next_attention_area_missing_setting_count !== 0
  ) {
    throw new ContractError(`${context}: invalid next attention area count`);
  }
}
