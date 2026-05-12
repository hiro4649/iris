import "../src/config/loadIrisEnv.js";
import { createPublicReportBoundaryAuditReport } from "../src/services/dev/publicReportBoundaryAudit.js";
import { createProductionLiveReadinessReport } from "../src/services/dev/productionLiveReadiness.js";
import { createProductionNextTaskReport } from "../src/services/dev/productionNextTask.js";
import { createProductionRuntimeHandoffStatusReport } from "../src/services/dev/productionRuntimeHandoffStatus.js";
import { ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES } from "../src/services/dev/adminCharacterVoiceSettings.js";
import { fileURLToPath } from "node:url";

const ATTENTION_DIGEST_FIELDS = new Set([
  "ok",
  "schema",
  "runtime_handoff_summary",
  "operator_focus",
  "low_output_restart_summary",
  "next_task_summary",
  "anime_performance_admin_attention_summary",
  "growth_business_admin_attention_summary",
  "live_readiness_summary",
  "public_report_boundary_audit_summary",
  "stage_summaries",
  "boundary_policy"
]);

const OPERATOR_FOCUS_FIELDS = new Set([
  "focus_id",
  "focus_status",
  "focus_readiness_state",
  "focus_stage_id",
  "focus_reason",
  "focus_urgency",
  "focus_check_script",
  "secondary_check_script",
  "attention_count",
  "pending_worker_job_count",
  "retry_blocked_worker_job_count",
  "local_bridge_worker_attention_reason",
  "local_bridge_worker_next_operator_action_id"
]);

const LOW_OUTPUT_RESTART_SUMMARY_FIELDS = new Set([
  "entry_check_script",
  "first_check_script",
  "focus_check_script",
  "secondary_check_script",
  "full_preflight_script",
  "public_boundary_check_script",
  "required_lightweight_script_count",
  "missing_required_lightweight_script_count"
]);

const SUMMARY_FIELDS = {
  runtime_handoff_summary: new Set([
    "handoff_status",
    "ready_component_count",
    "attention_component_count",
    "next_component_id",
    "next_readiness_state",
    "next_check_script"
  ]),
  next_task_summary: new Set([
    "next_priority",
    "next_stage_id",
    "next_readiness_state",
    "next_status_script",
    "next_verification_script",
    "next_runtime_verification_script",
    "next_launch_script",
    "next_readiness_script",
    "next_configure_env_count",
    "attention_gate_count"
  ]),
  anime_performance_admin_attention_summary: new Set([
    "module_id",
    "admin_status",
    "next_operator_action_id",
    "next_attention_area_id",
    "next_attention_area_missing_setting_count",
    "next_safe_script",
    "required_setting_count",
    "configured_setting_count",
    "missing_setting_count",
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
    "anime_identity_surface_count",
    "anime_identity_configured_surface_count",
    "anime_identity_missing_surface_count"
  ]),
  growth_business_admin_attention_summary: new Set([
    "module_id",
    "admin_status",
    "next_operator_action_id",
    "next_attention_area_id",
    "next_attention_area_missing_setting_count",
    "next_safe_script",
    "required_setting_count",
    "configured_setting_count",
    "missing_setting_count"
  ]),
  live_readiness_summary: new Set([
    "probe_mode",
    "overall_status",
    "ready_stage_count",
    "attention_stage_count",
    "next_priority",
    "next_stage_id",
    "next_check_script",
    "next_configure_env_count"
  ]),
  public_report_boundary_audit_summary: new Set([
    "ok",
    "counts_only",
    "missing_file_lists_omitted",
    "next_safe_script",
    "admin_route",
    "missing_allowlist_count",
    "missing_run_boundary_count",
    "missing_dev_service_allowlist_count",
    "missing_server_allowlist_count",
    "script_layer_import_violation_count",
    "required_lightweight_script_count",
    "missing_required_lightweight_script_count"
  ])
};

const STAGE_SUMMARY_FIELDS = new Set([
  "stage_id",
  "ready",
  "stage_live_readiness_status",
  "gate_count",
  "ready_gate_count",
  "attention_gate_count",
  "first_attention_gate_id",
  "first_attention_gate_status",
  "first_attention_check_script"
]);
function sumAnimeIdentitySurfaceCounts(summary, suffix) {
  return ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES.reduce(
    (total, prefix) => total + summary[`${prefix}_${suffix}`],
    0
  );
}

function assertOnlyFields(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Production attention digest ${label} must be an object`);
  }
  for (const field of Object.keys(value)) {
    if (!fields.has(field)) {
      throw new Error(`Unexpected production attention digest ${label} field: ${field}`);
    }
  }
}

function assertString(value, label) {
  if (typeof value !== "string") {
    throw new Error(`Production attention digest ${label} must be a string`);
  }
}

function assertSafeLabel(value, label) {
  assertString(value, label);
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    throw new Error(`Production attention digest ${label} must be a safe public label`);
  }
}

function assertOptionalSafeLabel(value, label) {
  if (value !== null) {
    assertSafeLabel(value, label);
  }
}

function assertSafeNpmScript(value, label) {
  assertString(value, label);
  if (
    !/^npm run [a-z0-9][a-z0-9:_-]*(?: [a-z0-9:_=-]+)*$/.test(value) &&
    value !== "npm test"
  ) {
    throw new Error(`Production attention digest ${label} must be a safe npm script name`);
  }
}

function assertSafeRoutePath(value, label) {
  assertString(value, label);
  if (!/^\/[a-z0-9/_-]+$/i.test(value)) {
    throw new Error(`Production attention digest ${label} must be a safe route path`);
  }
}

function assertOptionalSafeNpmScript(value, label) {
  if (value !== null) {
    assertSafeNpmScript(value, label);
  }
}

export function assertProductionAttentionDigestSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("Production attention digest must be an object");
  }
  for (const field of Object.keys(report)) {
    if (!ATTENTION_DIGEST_FIELDS.has(field)) {
      throw new Error(`Unexpected production attention digest field: ${field}`);
    }
  }
  if (report.schema !== "iris_production_attention_digest_v1") {
    throw new Error("Production attention digest schema mismatch");
  }
  if (report.ok !== true) {
    throw new Error("Production attention digest must be ok");
  }
  for (const [label, fields] of Object.entries(SUMMARY_FIELDS)) {
    assertOnlyFields(report[label], fields, label);
  }
  assertOnlyFields(
    report.low_output_restart_summary,
    LOW_OUTPUT_RESTART_SUMMARY_FIELDS,
    "low output restart summary"
  );
  for (const [field, label] of [
    ["entry_check_script", "low output restart entry check script"],
    ["first_check_script", "low output restart first check script"],
    ["focus_check_script", "low output restart focus check script"],
    ["secondary_check_script", "low output restart secondary check script"],
    ["full_preflight_script", "low output restart full preflight script"],
    ["public_boundary_check_script", "low output restart public boundary check script"],
  ]) {
    assertSafeNpmScript(report.low_output_restart_summary[field], label);
  }
  for (const field of [
    "required_lightweight_script_count",
    "missing_required_lightweight_script_count"
  ]) {
    if (
      !Number.isInteger(report.low_output_restart_summary[field]) ||
      report.low_output_restart_summary[field] < 0
    ) {
      throw new Error(
        `Production attention digest low output restart count invalid: ${field}`
      );
    }
  }
  if (report.low_output_restart_summary.required_lightweight_script_count <= 0) {
    throw new Error(
      "Production attention digest low output restart required lightweight script count must be positive"
    );
  }
  if (
    report.low_output_restart_summary.missing_required_lightweight_script_count >
    report.low_output_restart_summary.required_lightweight_script_count
  ) {
    throw new Error(
      "Production attention digest low output restart missing lightweight count must not exceed required count"
    );
  }
  if (
    report.low_output_restart_summary.entry_check_script !==
    "npm run dev:admin:operations-summary"
  ) {
    throw new Error(
      "Production attention digest low output restart entry check script must be npm run dev:admin:operations-summary"
    );
  }
  if (
    report.low_output_restart_summary.first_check_script !==
    "npm run dev:production:attention-digest"
  ) {
    throw new Error(
      "Production attention digest low output restart first script must be the attention digest"
    );
  }
  if (report.low_output_restart_summary.full_preflight_script !== "npm run preflight") {
    throw new Error(
      "Production attention digest low output restart full preflight script must be npm run preflight"
    );
  }
  for (const [label, countFields] of Object.entries({
    runtime_handoff_summary: [
      "ready_component_count",
      "attention_component_count"
    ],
    next_task_summary: [
      "next_configure_env_count",
      "attention_gate_count"
    ],
    anime_performance_admin_attention_summary: [
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
      "anime_identity_surface_count",
      "anime_identity_configured_surface_count",
      "anime_identity_missing_surface_count"
    ],
    growth_business_admin_attention_summary: [
      "required_setting_count",
      "configured_setting_count",
      "missing_setting_count",
      "next_attention_area_missing_setting_count"
    ],
    live_readiness_summary: [
      "ready_stage_count",
      "attention_stage_count",
      "next_configure_env_count"
    ],
  })) {
    for (const field of countFields) {
      if (!Number.isInteger(report[label][field]) || report[label][field] < 0) {
        throw new Error(
          `Production attention digest ${label} count invalid: ${field}`
        );
      }
    }
  }
  assertSafeLabel(
    report.runtime_handoff_summary.handoff_status,
    "runtime handoff status"
  );
  assertOptionalSafeLabel(
    report.runtime_handoff_summary.next_component_id,
    "runtime handoff next component id"
  );
  assertOptionalSafeLabel(
    report.runtime_handoff_summary.next_readiness_state,
    "runtime handoff next readiness state"
  );
  assertOptionalSafeNpmScript(
    report.runtime_handoff_summary.next_check_script,
    "runtime handoff next check script"
  );
  assertOptionalSafeLabel(report.next_task_summary.next_stage_id, "next task stage id");
  assertOptionalSafeLabel(
    report.next_task_summary.next_readiness_state,
    "next task readiness state"
  );
  for (const [field, label] of [
    ["next_status_script", "next task status script"],
    ["next_verification_script", "next task verification script"],
    ["next_runtime_verification_script", "next task runtime verification script"],
    ["next_launch_script", "next task launch script"],
    ["next_readiness_script", "next task readiness script"],
  ]) {
    assertOptionalSafeNpmScript(report.next_task_summary[field], label);
  }
  for (const [summaryName, field] of [
    ["next_task_summary", "next_priority"],
    ["live_readiness_summary", "next_priority"],
  ]) {
    const value = report[summaryName][field];
    if (value !== null && (!Number.isInteger(value) || value < 0)) {
      throw new Error(
        `Production attention digest ${summaryName} priority invalid: ${field}`
      );
    }
  }
  assertSafeLabel(report.live_readiness_summary.probe_mode, "live readiness probe mode");
  assertSafeLabel(
    report.anime_performance_admin_attention_summary.module_id,
    "anime performance module id"
  );
  assertSafeLabel(
    report.anime_performance_admin_attention_summary.admin_status,
    "anime performance admin status"
  );
  assertOptionalSafeLabel(
    report.anime_performance_admin_attention_summary.next_operator_action_id,
    "anime performance next operator action"
  );
  assertOptionalSafeLabel(
    report.anime_performance_admin_attention_summary.next_attention_area_id,
    "anime performance next attention area"
  );
  assertSafeNpmScript(
    report.anime_performance_admin_attention_summary.next_safe_script,
    "anime performance next safe script"
  );
  assertSafeLabel(
    report.growth_business_admin_attention_summary.module_id,
    "growth business module id"
  );
  assertSafeLabel(
    report.growth_business_admin_attention_summary.admin_status,
    "growth business admin status"
  );
  assertOptionalSafeLabel(
    report.growth_business_admin_attention_summary.next_operator_action_id,
    "growth business next operator action"
  );
  assertOptionalSafeLabel(
    report.growth_business_admin_attention_summary.next_attention_area_id,
    "growth business next attention area"
  );
  assertSafeNpmScript(
    report.growth_business_admin_attention_summary.next_safe_script,
    "growth business next safe script"
  );
  if (
    report.growth_business_admin_attention_summary.configured_setting_count +
      report.growth_business_admin_attention_summary.missing_setting_count !==
    report.growth_business_admin_attention_summary.required_setting_count
  ) {
    throw new Error(
      "Production attention digest growth business counts must match"
    );
  }
  if (
    report.anime_performance_admin_attention_summary.configured_setting_count +
      report.anime_performance_admin_attention_summary.missing_setting_count !==
    report.anime_performance_admin_attention_summary.required_setting_count
  ) {
    throw new Error(
      "Production attention digest anime performance counts must match"
    );
  }
  assertCategoryCountsMatch(
    report.anime_performance_admin_attention_summary,
    "reference",
    "Production attention digest anime performance reference counts must match"
  );
  assertCategoryCountsMatch(
    report.anime_performance_admin_attention_summary,
    "expression_motion",
    "Production attention digest anime performance expression motion counts must match"
  );
  assertCategoryCountsMatch(
    report.anime_performance_admin_attention_summary,
    "voice_speech",
    "Production attention digest anime performance voice speech counts must match"
  );
  assertCategoryCountsMatch(
    report.anime_performance_admin_attention_summary,
    "ip_governance",
    "Production attention digest anime performance IP governance counts must match"
  );
  assertCategoryCountsMatch(
    report.anime_performance_admin_attention_summary,
    "voice_license_use_category",
    "Production attention digest anime performance voice license counts must match"
  );
  if (
    report.anime_performance_admin_attention_summary
      .anime_identity_surface_count !==
      ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES.length ||
    report.anime_performance_admin_attention_summary
      .anime_identity_configured_surface_count +
      report.anime_performance_admin_attention_summary
        .anime_identity_missing_surface_count !==
      report.anime_performance_admin_attention_summary.anime_identity_surface_count
  ) {
    throw new Error(
      "Production attention digest anime performance identity surface counts must match"
    );
  }
  const animeAttentionSummary =
    report.anime_performance_admin_attention_summary;
  if (
    sumAnimeIdentitySurfaceCounts(
      animeAttentionSummary,
      "setting_count"
    ) !== animeAttentionSummary.required_setting_count
  ) {
    throw new Error(
      "Production attention digest anime performance category counts must match"
    );
  }
  if (
    sumAnimeIdentitySurfaceCounts(
      animeAttentionSummary,
      "configured_setting_count"
    ) !== animeAttentionSummary.configured_setting_count
  ) {
    throw new Error(
      "Production attention digest anime performance category configured counts must match"
    );
  }
  if (
    sumAnimeIdentitySurfaceCounts(
      animeAttentionSummary,
      "missing_setting_count"
    ) !== animeAttentionSummary.missing_setting_count
  ) {
    throw new Error(
      "Production attention digest anime performance category missing counts must match"
    );
  }
  assertSafeLabel(
    report.live_readiness_summary.overall_status,
    "live readiness overall status"
  );
  assertOptionalSafeLabel(
    report.live_readiness_summary.next_stage_id,
    "live readiness next stage id"
  );
  assertOptionalSafeNpmScript(
    report.live_readiness_summary.next_check_script,
    "live readiness next check script"
  );
  const auditSummary = report.public_report_boundary_audit_summary;
  if (typeof auditSummary.ok !== "boolean") {
    throw new Error("Production attention digest public audit ok must be a boolean");
  }
  if (auditSummary.counts_only !== true) {
    throw new Error(
      "Production attention digest public audit counts_only must be true"
    );
  }
  if (auditSummary.missing_file_lists_omitted !== true) {
    throw new Error(
      "Production attention digest public audit missing_file_lists_omitted must be true"
    );
  }
  assertSafeNpmScript(
    auditSummary.next_safe_script,
    "public audit next safe script"
  );
  if (
    report.low_output_restart_summary.public_boundary_check_script !==
    auditSummary.next_safe_script
  ) {
    throw new Error(
      "Production attention digest low output restart boundary script must match public audit summary"
    );
  }
  assertSafeRoutePath(auditSummary.admin_route, "public audit admin route");
  for (const field of [
    "missing_allowlist_count",
    "missing_run_boundary_count",
    "missing_dev_service_allowlist_count",
    "missing_server_allowlist_count",
    "script_layer_import_violation_count",
    "required_lightweight_script_count",
    "missing_required_lightweight_script_count"
  ]) {
    if (!Number.isInteger(auditSummary[field]) || auditSummary[field] < 0) {
      throw new Error(`Production attention digest public audit count invalid: ${field}`);
    }
  }
  if (auditSummary.required_lightweight_script_count <= 0) {
    throw new Error(
      "Production attention digest public audit required lightweight script count must be positive"
    );
  }
  if (
    auditSummary.missing_required_lightweight_script_count >
    auditSummary.required_lightweight_script_count
  ) {
    throw new Error(
      "Production attention digest public audit missing lightweight count must not exceed required count"
    );
  }
  const publicAuditMissingCountTotal =
    auditSummary.missing_allowlist_count +
    auditSummary.missing_run_boundary_count +
    auditSummary.missing_dev_service_allowlist_count +
    auditSummary.missing_server_allowlist_count +
    auditSummary.script_layer_import_violation_count +
    auditSummary.missing_required_lightweight_script_count;
  if (auditSummary.ok === true && publicAuditMissingCountTotal !== 0) {
    throw new Error(
      "Production attention digest public audit ok must have zero missing counts"
    );
  }
  if (auditSummary.ok === false && publicAuditMissingCountTotal === 0) {
    throw new Error(
      "Production attention digest public audit not-ok must have missing counts"
    );
  }
  assertOnlyFields(report.operator_focus, OPERATOR_FOCUS_FIELDS, "operator focus");
  assertSafeLabel(report.operator_focus.focus_id, "operator focus id");
  assertSafeLabel(report.operator_focus.focus_status, "operator focus status");
  assertOptionalSafeLabel(
    report.operator_focus.focus_readiness_state,
    "operator focus readiness state"
  );
  assertOptionalSafeLabel(report.operator_focus.focus_stage_id, "operator focus stage id");
  assertOptionalSafeLabel(report.operator_focus.focus_reason, "operator focus reason");
  assertSafeLabel(report.operator_focus.focus_urgency, "operator focus urgency");
  assertOptionalSafeNpmScript(
    report.operator_focus.focus_check_script,
    "operator focus check script"
  );
  assertOptionalSafeNpmScript(
    report.operator_focus.secondary_check_script,
    "operator focus secondary check script"
  );
  if (
    !Number.isInteger(report.operator_focus.attention_count) ||
    report.operator_focus.attention_count < 0
  ) {
    throw new Error("Production attention digest operator focus attention count invalid");
  }
  const expectedFocusAttentionCounts = {
    runtime_handoff: report.runtime_handoff_summary.attention_component_count,
    live_readiness: report.live_readiness_summary.attention_stage_count,
    production_next_task: report.next_task_summary.attention_gate_count,
  };
  if (!(report.operator_focus.focus_id in expectedFocusAttentionCounts)) {
    throw new Error("Production attention digest operator focus id invalid");
  }
  if (
    report.operator_focus.attention_count !==
    expectedFocusAttentionCounts[report.operator_focus.focus_id]
  ) {
    throw new Error(
      "Production attention digest operator focus attention count must match summary"
    );
  }
  if (!["ready", "attention", "multi_gate_attention"].includes(
    report.operator_focus.focus_urgency
  )) {
    throw new Error("Production attention digest operator focus urgency invalid");
  }
  if (
    report.operator_focus.focus_urgency !== "ready" &&
    report.operator_focus.focus_reason === null
  ) {
    throw new Error(
      "Production attention digest attention focus reason must be present"
    );
  }
  const expectedFocusTargets = {
    runtime_handoff: {
      stageId: report.runtime_handoff_summary.next_component_id,
      checkScript:
        report.runtime_handoff_summary.next_component_id ===
        "foundation_runtime"
          ? "npm run dev:foundation:runtime-summary"
          : report.runtime_handoff_summary.next_check_script,
    },
    live_readiness: {
      stageId: report.live_readiness_summary.next_stage_id,
      checkScript: report.live_readiness_summary.next_check_script,
    },
    production_next_task: {
      stageId: report.next_task_summary.next_stage_id,
      checkScript: report.next_task_summary.next_readiness_script,
    },
  };
  const expectedFocusTarget = expectedFocusTargets[report.operator_focus.focus_id];
  if (report.operator_focus.focus_stage_id !== expectedFocusTarget.stageId) {
    throw new Error(
      "Production attention digest operator focus stage must match summary"
    );
  }
  if (report.operator_focus.focus_check_script !== expectedFocusTarget.checkScript) {
    throw new Error(
      "Production attention digest operator focus check script must match summary"
    );
  }
  const expectedSecondaryCheckScripts = {
    runtime_handoff: report.live_readiness_summary.next_check_script,
    live_readiness: report.next_task_summary.next_readiness_script,
    production_next_task: report.next_task_summary.next_runtime_verification_script,
  };
  if (
    report.operator_focus.secondary_check_script !==
    expectedSecondaryCheckScripts[report.operator_focus.focus_id]
  ) {
    throw new Error(
      "Production attention digest operator focus secondary check script must match summary"
    );
  }
  for (const field of [
    "pending_worker_job_count",
    "retry_blocked_worker_job_count"
  ]) {
    const value = report.operator_focus[field];
    if (value !== null && (!Number.isInteger(value) || value < 0)) {
      throw new Error(
        `Production attention digest operator focus worker count invalid: ${field}`
      );
    }
  }
  assertOptionalSafeLabel(
    report.operator_focus.local_bridge_worker_attention_reason,
    "operator focus local bridge worker attention reason"
  );
  assertOptionalSafeLabel(
    report.operator_focus.local_bridge_worker_next_operator_action_id,
    "operator focus local bridge worker next operator action"
  );
  if (
    report.operator_focus.focus_id === "runtime_handoff" &&
    (report.operator_focus.pending_worker_job_count === null ||
      report.operator_focus.retry_blocked_worker_job_count === null)
  ) {
    throw new Error(
      "Production attention digest runtime focus worker job counts must be present"
    );
  }
  if (!Array.isArray(report.stage_summaries)) {
    throw new Error("Production attention digest stage summaries must be an array");
  }
  let readyStageCount = 0;
  let attentionStageCount = 0;
  const stagesById = new Map();
  for (const stage of report.stage_summaries) {
    assertOnlyFields(stage, STAGE_SUMMARY_FIELDS, "stage summary");
    assertSafeLabel(stage.stage_id, "stage id");
    assertSafeLabel(stage.stage_live_readiness_status, "stage live readiness status");
    if (stagesById.has(stage.stage_id)) {
      throw new Error("Production attention digest stage ids must be unique");
    }
    stagesById.set(stage.stage_id, stage);
    for (const field of ["gate_count", "ready_gate_count", "attention_gate_count"]) {
      if (!Number.isInteger(stage[field]) || stage[field] < 0) {
        throw new Error(`Production attention digest stage count invalid: ${field}`);
      }
    }
    if (stage.ready_gate_count + stage.attention_gate_count !== stage.gate_count) {
      throw new Error(
        "Production attention digest stage gate counts must match gate count"
      );
    }
    if (typeof stage.ready !== "boolean") {
      throw new Error("Production attention digest stage ready must be a boolean");
    }
    if (stage.ready === true && stage.attention_gate_count !== 0) {
      throw new Error(
        "Production attention digest ready stage must not have attention gates"
      );
    }
    if (
      stage.attention_gate_count > 0 &&
      (typeof stage.first_attention_gate_id !== "string" ||
        typeof stage.first_attention_gate_status !== "string" ||
        typeof stage.first_attention_check_script !== "string")
    ) {
      throw new Error(
        "Production attention digest attention stage must include first attention details"
      );
    }
    if (stage.attention_gate_count > 0) {
      assertSafeLabel(stage.first_attention_gate_id, "stage first attention gate id");
      assertSafeLabel(
        stage.first_attention_gate_status,
        "stage first attention gate status"
      );
      assertSafeNpmScript(
        stage.first_attention_check_script,
        "stage first attention check script"
      );
    }
    if (
      stage.attention_gate_count === 0 &&
      (stage.first_attention_gate_id !== null ||
        stage.first_attention_gate_status !== null ||
        stage.first_attention_check_script !== null)
    ) {
      throw new Error(
        "Production attention digest ready stage must not include first attention details"
      );
    }
    if (stage.ready === true) {
      readyStageCount += 1;
    } else {
      attentionStageCount += 1;
    }
  }
  if (readyStageCount !== report.live_readiness_summary.ready_stage_count) {
    throw new Error(
      "Production attention digest ready stage count must match stage summaries"
    );
  }
  if (attentionStageCount !== report.live_readiness_summary.attention_stage_count) {
    throw new Error(
      "Production attention digest attention stage count must match stage summaries"
    );
  }
  const liveNextStageId = report.live_readiness_summary.next_stage_id;
  if (attentionStageCount > 0) {
    const liveNextStage = stagesById.get(liveNextStageId);
    if (!liveNextStage) {
      throw new Error(
        "Production attention digest live readiness next stage must exist in stage summaries"
      );
    }
    if (liveNextStage.ready === true) {
      throw new Error(
        "Production attention digest live readiness next stage must require attention"
      );
    }
  } else if (liveNextStageId !== null) {
    throw new Error(
      "Production attention digest live readiness next stage must be null when all stages are ready"
    );
  }
  const nextTaskStageId = report.next_task_summary.next_stage_id;
  if (nextTaskStageId !== null && !stagesById.has(nextTaskStageId)) {
    throw new Error(
      "Production attention digest next task stage must exist in stage summaries"
    );
  }
  assertBoundaryPolicy(report.boundary_policy, [
    "env_names_only",
    "script_names_only",
    "counts_statuses_and_booleans_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_text_payloads",
    "no_memory_records",
    "no_relationship_records",
    "no_candidates",
    "no_commands",
    "no_raw_frames",
    "no_raw_runtime_state",
    "read_only_cli"
  ], "Production attention digest");
}

function summarizeStage(stage) {
  return {
    stage_id: stage.stage_id,
    ready: stage.ready,
    stage_live_readiness_status: stage.stage_live_readiness_status,
    gate_count: stage.gate_count,
    ready_gate_count: stage.ready_gate_count,
    attention_gate_count: stage.attention_gate_count,
    first_attention_gate_id: stage.first_attention_gate_id,
    first_attention_gate_status: stage.first_attention_gate_status,
    first_attention_check_script: stage.first_attention_check_script,
  };
}

function assertCategoryCountsMatch(summary, prefix, message) {
  if (
    summary[`${prefix}_configured_setting_count`] +
      summary[`${prefix}_missing_setting_count`] !==
    summary[`${prefix}_setting_count`]
  ) {
    throw new Error(message);
  }
}

function summarizeFocusUrgency({ focusStatus, attentionCount }) {
  if (focusStatus === "ready_for_runtime_handoff") {
    return "ready";
  }
  if (Number.isInteger(attentionCount) && attentionCount > 1) {
    return "multi_gate_attention";
  }
  return "attention";
}

function createOperatorFocus({ runtimeHandoff, nextTask, liveReadiness }) {
  if (runtimeHandoff.handoff_status !== "ready_for_runtime_handoff") {
    const foundationRuntime =
      runtimeHandoff.foundation_obs_pickup_runtime_summary ?? {};
    const attentionCount = runtimeHandoff.attention_component_count;
    return {
      focus_id: "runtime_handoff",
      focus_status: runtimeHandoff.handoff_status,
      focus_readiness_state: runtimeHandoff.next_readiness_state,
      focus_stage_id: runtimeHandoff.next_component_id,
      focus_reason: foundationRuntime.next_runtime_attention ?? null,
      focus_urgency: summarizeFocusUrgency({
        focusStatus: runtimeHandoff.handoff_status,
        attentionCount,
      }),
      focus_check_script:
        runtimeHandoff.next_component_id === "foundation_runtime"
          ? "npm run dev:foundation:runtime-summary"
          : runtimeHandoff.next_check_script,
      secondary_check_script: liveReadiness.next_check_script,
      attention_count: attentionCount,
      pending_worker_job_count:
        foundationRuntime.pending_worker_job_count ?? null,
      retry_blocked_worker_job_count:
        foundationRuntime.retry_blocked_worker_job_count ?? null,
      local_bridge_worker_attention_reason:
        foundationRuntime.local_bridge_worker_attention_reason ?? null,
      local_bridge_worker_next_operator_action_id:
        foundationRuntime.local_bridge_worker_next_operator_action_id ?? null,
    };
  }

  if (liveReadiness.overall_status !== "ready_for_live_operation") {
    const attentionCount = liveReadiness.attention_stage_count;
    return {
      focus_id: "live_readiness",
      focus_status: liveReadiness.overall_status,
      focus_readiness_state: liveReadiness.next_readiness_state,
      focus_stage_id: liveReadiness.next_stage_id,
      focus_reason:
        liveReadiness.priority_stages.find((stage) => stage.ready !== true)
          ?.first_attention_gate_id ?? null,
      focus_urgency: summarizeFocusUrgency({
        focusStatus: liveReadiness.overall_status,
        attentionCount,
      }),
      focus_check_script: liveReadiness.next_check_script,
      secondary_check_script: nextTask.next_readiness_script,
      attention_count: attentionCount,
      pending_worker_job_count: null,
      retry_blocked_worker_job_count: null,
      local_bridge_worker_attention_reason: null,
      local_bridge_worker_next_operator_action_id: null,
    };
  }

  const attentionCount = nextTask.attention_gate_count;
  return {
    focus_id: "production_next_task",
    focus_status: nextTask.overall_status,
    focus_readiness_state: nextTask.next_readiness_state,
    focus_stage_id: nextTask.next_stage_id,
    focus_reason: nextTask.next_diagnostic_detail?.next_attention_reason ?? null,
    focus_urgency: summarizeFocusUrgency({
      focusStatus: nextTask.overall_status,
      attentionCount,
    }),
    focus_check_script: nextTask.next_readiness_script,
    secondary_check_script: nextTask.next_runtime_verification_script,
    attention_count: attentionCount,
    pending_worker_job_count: null,
    retry_blocked_worker_job_count: null,
    local_bridge_worker_attention_reason: null,
    local_bridge_worker_next_operator_action_id: null,
  };
}

export async function createProductionAttentionDigestReport({
  env = process.env,
  probeMode = "dry_run",
  generatedAtMs = Date.now(),
} = {}) {
  const runtimeHandoff = createProductionRuntimeHandoffStatusReport({
    env,
    generatedAtMs,
  });
  const nextTask = createProductionNextTaskReport({ env, generatedAtMs });
  const liveReadiness = await createProductionLiveReadinessReport({
    env,
    probeMode,
    generatedAtMs,
  });
  const audit = createPublicReportBoundaryAuditReport();
  const operatorFocus = createOperatorFocus({
    runtimeHandoff,
    nextTask,
    liveReadiness,
  });

  const animeAttention = nextTask.anime_performance_admin_attention_summary;
  const animeIdentityConfiguredSurfaceCount =
    ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES.filter(
    (prefix) => animeAttention[`${prefix}_missing_setting_count`] === 0
  ).length;
  const report = {
    ok: true,
    schema: "iris_production_attention_digest_v1",
    runtime_handoff_summary: {
      handoff_status: runtimeHandoff.handoff_status,
      ready_component_count: runtimeHandoff.ready_component_count,
      attention_component_count: runtimeHandoff.attention_component_count,
      next_component_id: runtimeHandoff.next_component_id,
      next_readiness_state: runtimeHandoff.next_readiness_state,
      next_check_script: runtimeHandoff.next_check_script,
    },
    operator_focus: operatorFocus,
    low_output_restart_summary: {
      entry_check_script: "npm run dev:admin:operations-summary",
      first_check_script: "npm run dev:production:attention-digest",
      focus_check_script: operatorFocus.focus_check_script,
      secondary_check_script: operatorFocus.secondary_check_script,
      full_preflight_script: "npm run preflight",
      public_boundary_check_script: "npm run dev:public-report-boundary-audit",
      required_lightweight_script_count: audit.required_lightweight_script_count,
      missing_required_lightweight_script_count:
        audit.missing_required_lightweight_script_count,
    },
    next_task_summary: {
      next_priority: nextTask.next_priority,
      next_stage_id: nextTask.next_stage_id,
      next_readiness_state: nextTask.next_readiness_state,
      next_status_script: nextTask.next_status_script,
      next_verification_script: nextTask.next_verification_script,
      next_runtime_verification_script: nextTask.next_runtime_verification_script,
      next_launch_script: nextTask.next_launch_script,
      next_readiness_script: nextTask.next_readiness_script,
      next_configure_env_count: nextTask.next_configure_env.length,
      attention_gate_count: nextTask.attention_gate_count,
    },
    anime_performance_admin_attention_summary: {
      module_id:
        animeAttention.module_id,
      admin_status:
        animeAttention.admin_status,
      next_operator_action_id:
        animeAttention.next_operator_action_id,
      next_attention_area_id:
        animeAttention.next_attention_area_id,
      next_attention_area_missing_setting_count:
        animeAttention.next_attention_area_missing_setting_count,
      next_safe_script:
        animeAttention.next_safe_script,
      required_setting_count:
        animeAttention.required_setting_count,
      configured_setting_count:
        animeAttention.configured_setting_count,
      missing_setting_count:
        animeAttention.missing_setting_count,
      reference_setting_count:
        animeAttention.reference_setting_count,
      reference_configured_setting_count:
        animeAttention.reference_configured_setting_count,
      reference_missing_setting_count:
        animeAttention.reference_missing_setting_count,
      expression_motion_setting_count:
        animeAttention.expression_motion_setting_count,
      expression_motion_configured_setting_count:
        animeAttention.expression_motion_configured_setting_count,
      expression_motion_missing_setting_count:
        animeAttention.expression_motion_missing_setting_count,
      voice_speech_setting_count:
        animeAttention.voice_speech_setting_count,
      voice_speech_configured_setting_count:
        animeAttention.voice_speech_configured_setting_count,
      voice_speech_missing_setting_count:
        animeAttention.voice_speech_missing_setting_count,
      ip_governance_setting_count:
        animeAttention.ip_governance_setting_count,
      ip_governance_configured_setting_count:
        animeAttention.ip_governance_configured_setting_count,
      ip_governance_missing_setting_count:
        animeAttention.ip_governance_missing_setting_count,
      voice_license_use_category_setting_count:
        animeAttention.voice_license_use_category_setting_count,
      voice_license_use_category_configured_setting_count:
        animeAttention.voice_license_use_category_configured_setting_count,
      voice_license_use_category_missing_setting_count:
        animeAttention.voice_license_use_category_missing_setting_count,
      anime_identity_surface_count:
        ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES.length,
      anime_identity_configured_surface_count:
        animeIdentityConfiguredSurfaceCount,
      anime_identity_missing_surface_count:
        ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES.length -
        animeIdentityConfiguredSurfaceCount,
    },
    growth_business_admin_attention_summary: {
      module_id: nextTask.growth_business_admin_attention_summary.module_id,
      admin_status: nextTask.growth_business_admin_attention_summary.admin_status,
      next_operator_action_id:
        nextTask.growth_business_admin_attention_summary.next_operator_action_id,
      next_attention_area_id:
        nextTask.growth_business_admin_attention_summary.next_attention_area_id,
      next_attention_area_missing_setting_count:
        nextTask.growth_business_admin_attention_summary
          .next_attention_area_missing_setting_count,
      next_safe_script:
        nextTask.growth_business_admin_attention_summary.next_safe_script,
      required_setting_count:
        nextTask.growth_business_admin_attention_summary.required_setting_count,
      configured_setting_count:
        nextTask.growth_business_admin_attention_summary.configured_setting_count,
      missing_setting_count:
        nextTask.growth_business_admin_attention_summary.missing_setting_count,
    },
    live_readiness_summary: {
      probe_mode: probeMode,
      overall_status: liveReadiness.overall_status,
      ready_stage_count: liveReadiness.ready_stage_count,
      attention_stage_count: liveReadiness.attention_stage_count,
      next_priority: liveReadiness.next_priority,
      next_stage_id: liveReadiness.next_stage_id,
      next_check_script: liveReadiness.next_check_script,
      next_configure_env_count: liveReadiness.next_configure_env.length,
    },
    public_report_boundary_audit_summary: {
      ok: audit.ok,
      counts_only: true,
      missing_file_lists_omitted: true,
      next_safe_script: "npm run dev:public-report-boundary-audit",
      admin_route: "/admin/public-report-boundary-audit",
      missing_allowlist_count: audit.missing_allowlist_count,
      missing_run_boundary_count: audit.missing_run_boundary_count,
      missing_dev_service_allowlist_count:
        audit.missing_dev_service_allowlist_count,
      missing_server_allowlist_count: audit.missing_server_allowlist_count,
      script_layer_import_violation_count:
        audit.script_layer_import_violation_count,
      required_lightweight_script_count:
        audit.required_lightweight_script_count,
      missing_required_lightweight_script_count:
        audit.missing_required_lightweight_script_count,
    },
    stage_summaries: liveReadiness.priority_stages.map(summarizeStage),
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      counts_statuses_and_booleans_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_raw_runtime_state: true,
      read_only_cli: true,
    },
  };

  assertProductionAttentionDigestSafe(report);
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const probeMode = process.argv.includes("--fixture-post")
    ? "fixture_post"
    : "dry_run";
  const report = await createProductionAttentionDigestReport({ probeMode });
  console.log(JSON.stringify(report, null, 2));
}

function assertBoundaryPolicy(policy, fields, context) {
  const checkedPolicy = policy && typeof policy === "object" && !Array.isArray(policy) ? policy : {};
  const expected = new Set(fields);
  for (const field of Object.keys(checkedPolicy)) {
    if (!expected.has(field)) {
      throw new Error(`${context} unexpected boundary flag ${field}`);
    }
  }
  for (const field of fields) {
    if (checkedPolicy[field] !== true) {
      throw new Error(`${context} boundary missing: ${field}`);
    }
  }
}
