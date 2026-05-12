import assert from "node:assert/strict";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { loadScenarioFile, runScenario } from "../src/runtime/scenarioRunner.js";
import {
  assertReadinessReportSafe,
  createReadinessReport,
} from "../src/services/dev/readinessReport.js";
import {
  assertProductionReadinessRunbookSafe,
  createProductionReadinessRunbook,
} from "../src/services/dev/productionReadinessRunbook.js";
import { createSpecManifest } from "../src/services/dev/specManifest.js";
import {
  createPublicReportBoundaryAuditReport,
  verifyPublicReportBoundaryAuditReportSafe,
} from "../src/services/dev/publicReportBoundaryAudit.js";
import {
  assertProductionAttentionDigestSafe,
  createProductionAttentionDigestReport,
} from "./dev-production-attention-digest.js";
import { ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES } from "../src/services/dev/adminCharacterVoiceSettings.js";

const PREFLIGHT_REPORT_FIELDS = new Set([
  "ok",
  "specs",
  "scenario",
  "readiness",
  "production",
  "production_attention_digest",
  "public_report_boundary_audit"
]);

const PREFLIGHT_PRODUCTION_ATTENTION_DIGEST_FIELDS = new Set([
  "schema",
  "runtime_handoff_status",
  "runtime_next_component_id",
  "runtime_next_check_script",
  "operator_focus_id",
  "operator_focus_reason",
  "operator_focus_urgency",
  "operator_focus_check_script",
  "operator_focus_secondary_check_script",
  "operator_focus_pending_worker_job_count",
  "operator_focus_retry_blocked_worker_job_count",
  "operator_focus_local_bridge_worker_attention_reason",
  "operator_focus_local_bridge_worker_next_operator_action_id",
  "low_output_entry_check_script",
  "low_output_first_check_script",
  "low_output_focus_check_script",
  "low_output_secondary_check_script",
  "low_output_full_preflight_script",
  "low_output_public_boundary_check_script",
  "low_output_required_lightweight_script_count",
  "low_output_missing_required_lightweight_script_count",
  "next_task_stage_id",
  "next_task_readiness_state",
  "next_task_check_script",
  "anime_performance_admin_status",
  "anime_performance_next_operator_action_id",
  "anime_performance_next_attention_area_id",
  "anime_performance_next_attention_area_missing_setting_count",
  "anime_performance_next_safe_script",
  "anime_performance_required_setting_count",
  "anime_performance_configured_setting_count",
  "anime_performance_missing_setting_count",
  "anime_performance_reference_setting_count",
  "anime_performance_reference_missing_setting_count",
  "anime_performance_expression_motion_setting_count",
  "anime_performance_expression_motion_missing_setting_count",
  "anime_performance_voice_speech_setting_count",
  "anime_performance_voice_speech_missing_setting_count",
  "anime_performance_ip_governance_setting_count",
  "anime_performance_ip_governance_missing_setting_count",
  "anime_performance_voice_license_use_category_setting_count",
  "anime_performance_voice_license_use_category_missing_setting_count",
  "anime_performance_identity_surface_count",
  "anime_performance_identity_configured_surface_count",
  "anime_performance_identity_missing_surface_count",
  "growth_business_admin_status",
  "growth_business_next_operator_action_id",
  "growth_business_next_attention_area_id",
  "growth_business_next_attention_area_missing_setting_count",
  "growth_business_next_safe_script",
  "growth_business_required_setting_count",
  "growth_business_configured_setting_count",
  "growth_business_missing_setting_count",
  "live_readiness_status",
  "live_readiness_next_stage_id",
  "live_readiness_next_check_script",
  "ready_stage_count",
  "attention_stage_count",
  "public_report_boundary_ok",
  "public_report_boundary_next_safe_script",
  "public_report_boundary_admin_route",
  "public_report_boundary_required_lightweight_script_count",
  "public_report_boundary_missing_required_lightweight_script_count",
  "boundary_policy"
]);
const PREFLIGHT_ANIME_IDENTITY_SURFACE_FIELDS = Object.freeze(
  ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES.map(
    (prefix) => `anime_performance_${prefix}`
  )
);

function sumPreflightAnimePerformanceCounts(summary, suffix) {
  return PREFLIGHT_ANIME_IDENTITY_SURFACE_FIELDS.reduce(
    (total, prefix) => total + summary[`${prefix}_${suffix}`],
    0
  );
}

const PREFLIGHT_PUBLIC_REPORT_BOUNDARY_AUDIT_FIELDS = new Set([
  "ok",
  "schema",
  "scanned_script_count",
  "assert_script_count",
  "missing_allowlist_count",
  "scanned_run_script_count",
  "missing_run_boundary_count",
  "scanned_dev_service_count",
  "dev_service_assert_count",
  "missing_dev_service_allowlist_count",
  "scanned_server_file_count",
  "server_assert_count",
  "missing_server_allowlist_count",
  "scanned_src_import_file_count",
  "script_layer_import_violation_count",
  "required_lightweight_script_count",
  "missing_required_lightweight_script_count",
  "boundary_policy"
]);

const PREFLIGHT_SPECS_FIELDS = new Set([
  "expected",
  "found",
  "missing",
  "addendum_files"
]);

const PREFLIGHT_SCENARIO_FIELDS = new Set([
  "name",
  "step_count",
  "last_review_required"
]);

const PREFLIGHT_READINESS_FIELDS = new Set([
  "status",
  "next_readiness_state",
  "readiness_state_counts",
  "integration_probe_readiness_summary",
  "candidate_review_items",
  "integration_gaps",
  "integration_gap_statuses"
]);

const PREFLIGHT_READINESS_STATE_COUNT_FIELDS = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required"
]);

const PREFLIGHT_READINESS_INTEGRATION_GAP_STATUS_FIELDS = new Set([
  "gap",
  "status",
  "readiness_state",
  "operator_configuration_required"
]);

const PREFLIGHT_READINESS_INTEGRATION_GAP_STATUSES = new Set([
  "boundary_available",
  "boundary_missing"
]);

const PREFLIGHT_PRODUCTION_LIVE_READINESS_STATUSES = new Set([
  "foundation_attention",
  "youtube_ingest_attention",
  "persistence_attention",
  "gameplay_attention",
  "ready_for_live_operation"
]);

const PREFLIGHT_PRODUCTION_RUNTIME_HANDOFF_STATUSES = new Set([
  "runtime_handoff_attention",
  "runtime_handoff_ready"
]);

const PREFLIGHT_PRODUCTION_RUNTIME_COMPONENT_IDS = new Set([
  "foundation_runtime",
  "youtube_ingest_runtime",
  "persistence_runtime",
  "gameplay_runtime"
]);

const PREFLIGHT_PRODUCTION_RUNTIME_COMPONENT_CHECK_SCRIPTS = {
  foundation_runtime: "npm run dev:foundation:runtime-status",
  youtube_ingest_runtime: "npm run dev:youtube:runtime-status",
  persistence_runtime: "npm run dev:persistence:runtime-status",
  gameplay_runtime: "npm run dev:gameplay:runtime-status"
};

const PREFLIGHT_PRODUCTION_LIVE_READINESS_STAGE_CHECK_SCRIPTS = {
  tts_live2d_obs_foundation: "npm run dev:bridge:status-roundtrip"
};

const PREFLIGHT_PRODUCTION_NEXT_TASK_STAGE_CHECK_SCRIPTS = {
  tts_live2d_obs_foundation: "npm run dev:bridge:status-roundtrip",
  youtube_comments_and_support: "npm run dev:youtube:source-status",
  memory_and_relationship_persistence: "npm run dev:persistence:backup-roundtrip",
  vision_and_safe_game_control: "npm run dev:vision:game-roundtrip"
};

const PREFLIGHT_INTEGRATION_PROBE_SUMMARY_FIELDS = new Set([
  "schema",
  "next_readiness_state",
  "readiness_state_counts",
  "probe_count",
  "engine_worker_readiness_state",
  "boundary_policy"
]);

const PREFLIGHT_INTEGRATION_PROBE_BOUNDARY_POLICY_FIELDS = new Set([
  "counts_and_labels_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_payloads",
  "no_commands"
]);

const PREFLIGHT_PRODUCTION_FIELDS = new Set([
  "readiness_status",
  "next_stage",
  "verification_plan",
  "operator_launch_plan",
  "stage_statuses",
  "boundary_policy"
]);

const PREFLIGHT_PRODUCTION_VERIFICATION_PLAN_FIELDS = new Set([
  "plan_status",
  "next_stage_id",
  "next_stage_priority",
  "next_stage_verification_scripts",
  "total_verification_script_count",
  "boundary_policy"
]);

const PREFLIGHT_PRODUCTION_OPERATOR_LAUNCH_PLAN_FIELDS = new Set([
  "plan_status",
  "target_stage_id",
  "ready_step_count",
  "attention_step_count",
  "next_step_id",
  "next_step_order",
  "launch_sequence",
  "boundary_policy"
]);

const PREFLIGHT_PRODUCTION_LAUNCH_STEP_FIELDS = new Set([
  "sequence_order",
  "process_id",
  "launch_readiness_status",
  "launch_script",
  "readiness_script",
  "missing_required_env"
]);

const PREFLIGHT_PRODUCTION_STAGE_STATUS_FIELDS = new Set([
  "stage_id",
  "status",
  "missing_required_env"
]);

const PREFLIGHT_PRODUCTION_VERIFICATION_BOUNDARY_POLICY_FIELDS = new Set([
  "script_names_only",
  "env_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "read_only_plan"
]);

const PREFLIGHT_PRODUCTION_OPERATOR_LAUNCH_BOUNDARY_POLICY_FIELDS = new Set([
  "safe_local_commands_only",
  "env_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_payloads",
  "read_only_plan"
]);

const PREFLIGHT_PRODUCTION_BOUNDARY_POLICY_FIELDS = new Set([
  "env_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_text_payloads",
  "no_memory_records",
  "no_relationship_records",
  "no_candidates",
  "no_raw_frames",
  "no_raw_runtime_state",
  "read_only_summary"
]);

const PREFLIGHT_ATTENTION_DIGEST_BOUNDARY_POLICY_FIELDS = new Set([
  "script_names_only",
  "counts_statuses_and_booleans_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_memory_records",
  "no_relationship_records",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
  "no_raw_runtime_state",
  "no_character_reference_materials",
  "no_voice_samples",
  "no_animation_materials",
  "no_script_text",
  "public_audit_ok_only",
  "public_audit_missing_file_lists_omitted"
]);

const PREFLIGHT_PUBLIC_REPORT_BOUNDARY_POLICY_FIELDS = new Set([
  "script_names_only",
  "public_relative_file_names_only",
  "missing_file_lists_omitted",
  "no_file_contents",
  "no_env_values",
  "no_commands"
]);

function assertOnlyFields(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  for (const field of Object.keys(value)) {
    if (!fields.has(field)) {
      throw new Error(`Unexpected ${label} field: ${field}`);
    }
  }
}

function assertBoundaryPolicyFlagsTrue(policy, fields, label) {
  assertOnlyFields(policy, fields, label);
  for (const field of fields) {
    if (policy[field] !== true) {
      throw new Error(`${label} ${field} must be true`);
    }
  }
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function assertOptionalNonNegativeInteger(value, label) {
  if (value !== null) {
    assertNonNegativeInteger(value, label);
  }
}

function assertString(value, label) {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
}

function assertSafeLabel(value, label) {
  assertString(value, label);
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    throw new Error(`${label} must be a safe public label`);
  }
}

function assertPublicToken(value, label) {
  assertString(value, label);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) {
    throw new Error(`${label} must be a safe public token`);
  }
}

function assertSafeNpmScript(value, label) {
  assertString(value, label);
  if (!/^npm run [a-z0-9][a-z0-9:_-]*(?: [a-z0-9:_=-]+)*$/.test(value) && value !== "npm test") {
    throw new Error(`${label} must be a safe npm script name`);
  }
}

function assertSafeRoutePath(value, label) {
  assertString(value, label);
  if (!/^\/[a-z0-9/_-]+$/i.test(value)) {
    throw new Error(`${label} must be a safe route path`);
  }
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${label} must be a string array`);
  }
}

function assertSafeLabelArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  for (const item of value) {
    assertSafeLabel(item, label);
  }
}

function assertOptionalSafeLabel(value, label) {
  if (value !== null) {
    assertSafeLabel(value, label);
  }
}

function assertSpecFileNameArray(value, label) {
  assertStringArray(value, label);
  for (const item of value) {
    if (!/^IRIS_20240425_[A-Za-z0-9_]+\.txt$/.test(item)) {
      throw new Error(`${label} must contain public spec file names only`);
    }
  }
}

function assertEnvNameArray(value, label) {
  assertStringArray(value, label);
  for (const item of value) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(item)) {
      throw new Error(`${label} must contain env names only`);
    }
  }
}

function assertSafeNpmScriptArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  for (const item of value) {
    assertSafeNpmScript(item, label);
  }
}

function assertReadinessStateCountObject(value, fields, label) {
  assertOnlyFields(value, fields, label);
  for (const field of fields) {
    assertNonNegativeInteger(value[field], `${label} ${field}`);
  }
}

function assertIntegrationProbeSummary(value, label) {
  if (value === null) return;
  assertOnlyFields(value, PREFLIGHT_INTEGRATION_PROBE_SUMMARY_FIELDS, label);
  if (value.schema !== "iris_integration_probe_readiness_summary_v1") {
    throw new Error(`${label} schema must match`);
  }
  assertSafeLabel(value.next_readiness_state, `${label} next readiness state`);
  assertReadinessStateCountObject(
    value.readiness_state_counts,
    PREFLIGHT_READINESS_STATE_COUNT_FIELDS,
    `${label} readiness state count`
  );
  assertNonNegativeInteger(value.probe_count, `${label} probe count`);
  const readinessStateCountTotal = Object.values(value.readiness_state_counts).reduce(
    (sum, count) => sum + count,
    0
  );
  if (readinessStateCountTotal !== value.probe_count) {
    throw new Error(`${label} readiness state count total must match probe count`);
  }
  if (value.readiness_state_counts[value.next_readiness_state] <= 0) {
    throw new Error(`${label} next readiness state must be present in state counts`);
  }
  assertOptionalSafeLabel(
    value.engine_worker_readiness_state,
    `${label} engine worker readiness state`
  );
  if (
    value.engine_worker_readiness_state !== null &&
    value.readiness_state_counts[value.engine_worker_readiness_state] <= 0
  ) {
    throw new Error(
      `${label} engine worker readiness state must be present in state counts`
    );
  }
  assertBoundaryPolicyFlagsTrue(
    value.boundary_policy,
    PREFLIGHT_INTEGRATION_PROBE_BOUNDARY_POLICY_FIELDS,
    `${label} boundary policy`
  );
}

export function assertPreflightReportSafe(preflightReport) {
  if (
    !preflightReport ||
    typeof preflightReport !== "object" ||
    Array.isArray(preflightReport)
  ) {
    throw new Error("Preflight report must be an object");
  }

  for (const field of Object.keys(preflightReport)) {
    if (!PREFLIGHT_REPORT_FIELDS.has(field)) {
      throw new Error(`Unexpected preflight report field: ${field}`);
    }
  }
  if (typeof preflightReport.ok !== "boolean") {
    throw new Error("preflight ok must be a boolean");
  }
  assertOnlyFields(preflightReport.specs, PREFLIGHT_SPECS_FIELDS, "preflight specs summary");
  assertOnlyFields(preflightReport.scenario, PREFLIGHT_SCENARIO_FIELDS, "preflight scenario summary");
  assertNonNegativeInteger(preflightReport.specs.expected, "preflight specs expected count");
  if (preflightReport.specs.expected <= 0) {
    throw new Error("preflight specs expected count must be positive");
  }
  assertNonNegativeInteger(preflightReport.specs.found, "preflight specs found count");
  if (preflightReport.specs.found > preflightReport.specs.expected) {
    throw new Error("preflight specs found count must not exceed expected count");
  }
  assertSpecFileNameArray(preflightReport.specs.missing, "preflight specs missing files");
  if (new Set(preflightReport.specs.missing).size !== preflightReport.specs.missing.length) {
    throw new Error("preflight specs missing files must be unique");
  }
  assertSpecFileNameArray(
    preflightReport.specs.addendum_files,
    "preflight specs addendum files"
  );
  if (
    new Set(preflightReport.specs.addendum_files).size !==
    preflightReport.specs.addendum_files.length
  ) {
    throw new Error("preflight specs addendum files must be unique");
  }
  const missingSpecFiles = new Set(preflightReport.specs.missing);
  if (preflightReport.specs.addendum_files.some((file) => missingSpecFiles.has(file))) {
    throw new Error("preflight specs addendum files must not overlap missing files");
  }
  if (
    preflightReport.specs.found + preflightReport.specs.missing.length !==
    preflightReport.specs.expected
  ) {
    throw new Error(
      "preflight specs found count plus missing file count must match expected count"
    );
  }
  assertPublicToken(preflightReport.scenario.name, "preflight scenario name");
  if (preflightReport.scenario.name !== "dev-basic") {
    throw new Error("preflight scenario name must match dev-basic scenario");
  }
  assertNonNegativeInteger(preflightReport.scenario.step_count, "preflight scenario step count");
  if (preflightReport.scenario.step_count <= 0) {
    throw new Error("preflight scenario step count must be positive");
  }
  if (preflightReport.scenario.step_count !== 7) {
    throw new Error("preflight scenario step count must match dev-basic scenario");
  }
  if (typeof preflightReport.scenario.last_review_required !== "boolean") {
    throw new Error("preflight scenario last review flag must be a boolean");
  }
  if (preflightReport.scenario.last_review_required !== false) {
    throw new Error("preflight scenario last review flag must match dev-basic scenario");
  }
  assertOnlyFields(preflightReport.readiness, PREFLIGHT_READINESS_FIELDS, "preflight readiness summary");
  assertSafeLabel(preflightReport.readiness.status, "preflight readiness status");
  assertSafeLabel(
    preflightReport.readiness.next_readiness_state,
    "preflight readiness next state"
  );
  if (
    !PREFLIGHT_READINESS_STATE_COUNT_FIELDS.has(
      preflightReport.readiness.next_readiness_state
    )
  ) {
    throw new Error("preflight readiness next state must be known");
  }
  assertIntegrationProbeSummary(
    preflightReport.readiness.integration_probe_readiness_summary,
    "preflight readiness integration probe summary"
  );
  assertNonNegativeInteger(
    preflightReport.readiness.candidate_review_items,
    "preflight readiness candidate review item count"
  );
  if (
    preflightReport.readiness.candidate_review_items <
    preflightReport.scenario.step_count
  ) {
    throw new Error(
      "preflight readiness candidate review item count must be at least the scenario step count"
    );
  }
  assertReadinessStateCountObject(
    preflightReport.readiness.readiness_state_counts,
    PREFLIGHT_READINESS_STATE_COUNT_FIELDS,
    "preflight readiness state counts"
  );
  if (
    preflightReport.readiness.readiness_state_counts[
      preflightReport.readiness.next_readiness_state
    ] <= 0
  ) {
    throw new Error("preflight readiness next state must be present in state counts");
  }
  assertSafeLabelArray(
    preflightReport.readiness.integration_gaps,
    "preflight readiness integration gap"
  );
  if (
    new Set(preflightReport.readiness.integration_gaps).size !==
    preflightReport.readiness.integration_gaps.length
  ) {
    throw new Error("preflight readiness integration gaps must be unique");
  }
  if (!Array.isArray(preflightReport.readiness.integration_gap_statuses)) {
    throw new Error("preflight readiness integration gap statuses must be an array");
  }
  if (
    preflightReport.readiness.integration_gap_statuses.length !==
    preflightReport.readiness.integration_gaps.length
  ) {
    throw new Error(
      "preflight readiness integration gap status count must match integration gaps"
    );
  }
  for (const gap of preflightReport.readiness.integration_gap_statuses) {
    assertOnlyFields(
      gap,
      PREFLIGHT_READINESS_INTEGRATION_GAP_STATUS_FIELDS,
      "preflight readiness integration gap status"
    );
    assertSafeLabel(gap.gap, "preflight readiness integration gap id");
    assertSafeLabel(gap.status, "preflight readiness integration gap status");
    if (!PREFLIGHT_READINESS_INTEGRATION_GAP_STATUSES.has(gap.status)) {
      throw new Error("preflight readiness integration gap status must be known");
    }
    assertSafeLabel(
      gap.readiness_state,
      "preflight readiness integration gap readiness state"
    );
    if (!PREFLIGHT_READINESS_STATE_COUNT_FIELDS.has(gap.readiness_state)) {
      throw new Error(
        "preflight readiness integration gap readiness state must be known"
      );
    }
    if (typeof gap.operator_configuration_required !== "boolean") {
      throw new Error(
        "preflight readiness integration gap operator configuration flag must be a boolean"
      );
    }
    if (
      gap.operator_configuration_required &&
      gap.readiness_state !== "operator_review_required"
    ) {
      throw new Error(
        "preflight readiness integration gap operator configuration must require operator review"
      );
    }
  }
  for (const [index, gap] of preflightReport.readiness.integration_gaps.entries()) {
    if (preflightReport.readiness.integration_gap_statuses[index].gap !== gap) {
      throw new Error(
        "preflight readiness integration gap statuses must match integration gaps"
      );
    }
  }
  assertOnlyFields(preflightReport.production, PREFLIGHT_PRODUCTION_FIELDS, "preflight production summary");
  assertSafeLabel(preflightReport.production.readiness_status, "preflight production readiness status");
  if (preflightReport.production.readiness_status !== "attention_required") {
    throw new Error(
      "preflight production readiness status must require attention"
    );
  }
  assertSafeLabel(preflightReport.production.next_stage, "preflight production next stage");
  assertOnlyFields(
    preflightReport.production.verification_plan,
    PREFLIGHT_PRODUCTION_VERIFICATION_PLAN_FIELDS,
    "preflight production verification plan summary"
  );
  assertSafeLabel(
    preflightReport.production.verification_plan.plan_status,
    "preflight production verification plan status"
  );
  if (
    preflightReport.production.verification_plan.plan_status !==
    "start_next_attention_stage"
  ) {
    throw new Error(
      "preflight production verification plan status must start next attention stage"
    );
  }
  assertSafeLabel(
    preflightReport.production.verification_plan.next_stage_id,
    "preflight production verification next stage id"
  );
  assertNonNegativeInteger(
    preflightReport.production.verification_plan.next_stage_priority,
    "preflight production verification next stage priority"
  );
  if (preflightReport.production.verification_plan.next_stage_priority <= 0) {
    throw new Error(
      "preflight production verification next stage priority must be positive"
    );
  }
  assertSafeNpmScriptArray(
    preflightReport.production.verification_plan.next_stage_verification_scripts,
    "preflight production verification scripts"
  );
  if (
    preflightReport.production.verification_plan.next_stage_verification_scripts
      .length === 0
  ) {
    throw new Error(
      "preflight production verification scripts must not be empty"
    );
  }
  if (
    new Set(
      preflightReport.production.verification_plan.next_stage_verification_scripts
    ).size !==
    preflightReport.production.verification_plan.next_stage_verification_scripts
      .length
  ) {
    throw new Error(
      "preflight production verification scripts must be unique"
    );
  }
  assertNonNegativeInteger(
    preflightReport.production.verification_plan.total_verification_script_count,
    "preflight production total verification script count"
  );
  if (
    preflightReport.production.verification_plan.total_verification_script_count <
    preflightReport.production.verification_plan.next_stage_verification_scripts.length
  ) {
    throw new Error(
      "preflight production total verification script count must cover next stage scripts"
    );
  }
  assertBoundaryPolicyFlagsTrue(
    preflightReport.production.verification_plan.boundary_policy,
    PREFLIGHT_PRODUCTION_VERIFICATION_BOUNDARY_POLICY_FIELDS,
    "preflight production verification boundary policy"
  );
  assertOnlyFields(
    preflightReport.production.operator_launch_plan,
    PREFLIGHT_PRODUCTION_OPERATOR_LAUNCH_PLAN_FIELDS,
    "preflight production operator launch plan summary"
  );
  assertSafeLabel(
    preflightReport.production.operator_launch_plan.plan_status,
    "preflight production operator launch plan status"
  );
  assertSafeLabel(
    preflightReport.production.operator_launch_plan.target_stage_id,
    "preflight production operator launch target stage id"
  );
  assertNonNegativeInteger(
    preflightReport.production.operator_launch_plan.ready_step_count,
    "preflight production operator launch ready step count"
  );
  assertNonNegativeInteger(
    preflightReport.production.operator_launch_plan.attention_step_count,
    "preflight production operator launch attention step count"
  );
  assertOptionalSafeLabel(
    preflightReport.production.operator_launch_plan.next_step_id,
    "preflight production operator launch next step id"
  );
  assertOptionalNonNegativeInteger(
    preflightReport.production.operator_launch_plan.next_step_order,
    "preflight production operator launch next step order"
  );
  assertBoundaryPolicyFlagsTrue(
    preflightReport.production.operator_launch_plan.boundary_policy,
    PREFLIGHT_PRODUCTION_OPERATOR_LAUNCH_BOUNDARY_POLICY_FIELDS,
    "preflight production operator launch boundary policy"
  );
  if (!Array.isArray(preflightReport.production.operator_launch_plan.launch_sequence)) {
    throw new Error("preflight production launch sequence must be an array");
  }
  if (preflightReport.production.operator_launch_plan.launch_sequence.length === 0) {
    throw new Error("preflight production launch sequence must not be empty");
  }
  for (const [
    index,
    step,
  ] of preflightReport.production.operator_launch_plan.launch_sequence.entries()) {
    assertOnlyFields(
      step,
      PREFLIGHT_PRODUCTION_LAUNCH_STEP_FIELDS,
      "preflight production launch step summary"
    );
    assertPositiveInteger(step.sequence_order, "preflight production launch step order");
    assertSafeLabel(step.process_id, "preflight production launch step process id");
    assertSafeLabel(
      step.launch_readiness_status,
      "preflight production launch step readiness status"
    );
    if (
      !["ready", "missing_required_env", "configuration_attention"].includes(
        step.launch_readiness_status
      )
    ) {
      throw new Error(
        "preflight production launch step readiness status must be known"
      );
    }
    assertSafeNpmScript(step.launch_script, "preflight production launch step launch script");
    assertSafeNpmScript(
      step.readiness_script,
      "preflight production launch step readiness script"
    );
    assertEnvNameArray(
      step.missing_required_env,
      "preflight production launch step missing required env"
    );
    if (new Set(step.missing_required_env).size !== step.missing_required_env.length) {
      throw new Error(
        "preflight production launch step missing required env names must be unique"
      );
    }
    if (
      step.launch_readiness_status === "ready" &&
      step.missing_required_env.length !== 0
    ) {
      throw new Error(
        "preflight production ready launch step must not list missing required env"
      );
    }
    if (step.sequence_order !== index + 1) {
      throw new Error(
        "preflight production launch step order must match launch sequence position"
      );
    }
  }
  const launchProcessIds =
    preflightReport.production.operator_launch_plan.launch_sequence.map(
      (step) => step.process_id
    );
  if (new Set(launchProcessIds).size !== launchProcessIds.length) {
    throw new Error("preflight production launch process ids must be unique");
  }
  const launchReadyStepCount =
    preflightReport.production.operator_launch_plan.launch_sequence.filter(
      (step) => step.launch_readiness_status === "ready"
    ).length;
  const launchAttentionStepCount =
    preflightReport.production.operator_launch_plan.launch_sequence.length -
    launchReadyStepCount;
  const launchNextStepId =
    preflightReport.production.operator_launch_plan.next_step_id;
  const launchNextStepOrder =
    preflightReport.production.operator_launch_plan.next_step_order;
  if ((launchNextStepId === null) !== (launchNextStepOrder === null)) {
    throw new Error(
      "preflight production operator launch next step id and order must both be null or both be set"
    );
  }
  if (launchNextStepId !== null) {
    const launchNextStep =
      preflightReport.production.operator_launch_plan.launch_sequence.find(
        (step) => step.process_id === launchNextStepId
      );
    if (!launchNextStep) {
      throw new Error(
        "preflight production operator launch next step id must exist in launch sequence"
      );
    }
    if (launchNextStep.sequence_order !== launchNextStepOrder) {
      throw new Error(
        "preflight production operator launch next step order must match launch sequence"
      );
    }
  }
  if (
    preflightReport.production.operator_launch_plan.ready_step_count !==
    launchReadyStepCount
  ) {
    throw new Error(
      "preflight production operator launch ready step count must match launch sequence"
    );
  }
  if (
    preflightReport.production.operator_launch_plan.attention_step_count !==
    launchAttentionStepCount
  ) {
    throw new Error(
      "preflight production operator launch attention step count must match launch sequence"
    );
  }
  if (
    preflightReport.production.operator_launch_plan.plan_status ===
      "ready_to_launch_foundation" &&
    preflightReport.production.operator_launch_plan.attention_step_count !== 0
  ) {
    throw new Error(
      "preflight production ready launch plan must not have attention steps"
    );
  }
  if (
    preflightReport.production.operator_launch_plan.plan_status ===
      "ready_to_launch_foundation" &&
    preflightReport.production.operator_launch_plan.next_step_id !== null
  ) {
    throw new Error(
      "preflight production ready launch plan must not have a next step"
    );
  }
  if (!Array.isArray(preflightReport.production.stage_statuses)) {
    throw new Error("preflight production stage statuses must be an array");
  }
  if (preflightReport.production.stage_statuses.length === 0) {
    throw new Error("preflight production stage statuses must not be empty");
  }
  for (const stage of preflightReport.production.stage_statuses) {
    assertOnlyFields(
      stage,
      PREFLIGHT_PRODUCTION_STAGE_STATUS_FIELDS,
      "preflight production stage status summary"
    );
    assertSafeLabel(stage.stage_id, "preflight production stage id");
    assertSafeLabel(stage.status, "preflight production stage status");
    if (!["ready", "attention"].includes(stage.status)) {
      throw new Error("preflight production stage status must be known");
    }
    assertEnvNameArray(
      stage.missing_required_env,
      "preflight production stage missing required env"
    );
    if (
      new Set(stage.missing_required_env).size !==
      stage.missing_required_env.length
    ) {
      throw new Error(
        "preflight production stage missing required env names must be unique"
      );
    }
    if (stage.status === "ready" && stage.missing_required_env.length !== 0) {
      throw new Error(
        "preflight production ready stage must not list missing required env"
      );
    }
    if (stage.status !== "ready" && stage.missing_required_env.length === 0) {
      throw new Error(
        "preflight production attention stage must list missing required env"
      );
    }
  }
  const productionStageIdList = preflightReport.production.stage_statuses.map(
    (stage) => stage.stage_id
  );
  if (new Set(productionStageIdList).size !== productionStageIdList.length) {
    throw new Error("preflight production stage ids must be unique");
  }
  const productionStageIds = new Set(
    productionStageIdList
  );
  assertOnlyFields(
    preflightReport.production_attention_digest,
    PREFLIGHT_PRODUCTION_ATTENTION_DIGEST_FIELDS,
    "preflight production attention digest summary"
  );
  assertSafeLabel(
    preflightReport.production_attention_digest.next_task_stage_id,
    "preflight production attention digest next task stage id"
  );
  assertSafeLabel(
    preflightReport.production_attention_digest.live_readiness_next_stage_id,
    "preflight production attention digest live readiness next stage id"
  );
  assertSafeNpmScript(
    preflightReport.production_attention_digest.next_task_check_script,
    "preflight production attention digest next task check script"
  );
  assertSafeNpmScript(
    preflightReport.production_attention_digest.live_readiness_next_check_script,
    "preflight production attention digest live readiness next check script"
  );
  if (!productionStageIds.has(preflightReport.production.next_stage)) {
    throw new Error("preflight production next stage must exist in stage statuses");
  }
  if (
    preflightReport.production.verification_plan.next_stage_id !==
    preflightReport.production.next_stage
  ) {
    throw new Error(
      "preflight production verification next stage must match production next stage"
    );
  }
  if (
    !productionStageIds.has(
      preflightReport.production.operator_launch_plan.target_stage_id
    )
  ) {
    throw new Error(
      "preflight production operator launch target stage must exist in stage statuses"
    );
  }
  if (
    !productionStageIds.has(
      preflightReport.production_attention_digest.next_task_stage_id
    )
  ) {
    throw new Error(
      "preflight production attention digest next task stage must exist in stage statuses"
    );
  }
  if (
    !productionStageIds.has(
      preflightReport.production_attention_digest.live_readiness_next_stage_id
    )
  ) {
    throw new Error(
      "preflight production attention digest live readiness next stage must exist in stage statuses"
    );
  }
  if (
    preflightReport.production_attention_digest.live_readiness_next_stage_id !==
    preflightReport.production.operator_launch_plan.target_stage_id
  ) {
    throw new Error(
      "preflight production attention digest live readiness stage must match operator launch target stage"
    );
  }
  if (
    preflightReport.production_attention_digest.next_task_stage_id !==
    preflightReport.production.next_stage
  ) {
    throw new Error(
      "preflight production attention digest next task stage must match production next stage"
    );
  }
  if (
    !preflightReport.production.verification_plan.next_stage_verification_scripts.includes(
      preflightReport.production_attention_digest.next_task_check_script
    )
  ) {
    throw new Error(
      "preflight production attention digest next task check script must be listed in verification scripts"
    );
  }
  if (
    preflightReport.production_attention_digest.next_task_check_script !==
    PREFLIGHT_PRODUCTION_NEXT_TASK_STAGE_CHECK_SCRIPTS[
      preflightReport.production_attention_digest.next_task_stage_id
    ]
  ) {
    throw new Error(
      "preflight production attention digest next task check script must match next task stage"
    );
  }
  const launchStepScripts = new Set(
    preflightReport.production.operator_launch_plan.launch_sequence.flatMap(
      (step) => [step.launch_script, step.readiness_script]
    )
  );
  if (
    !launchStepScripts.has(
      preflightReport.production_attention_digest.live_readiness_next_check_script
    )
  ) {
    throw new Error(
      "preflight production attention digest live readiness check script must be listed in launch sequence scripts"
    );
  }
  if (
    preflightReport.production_attention_digest.live_readiness_next_check_script !==
    PREFLIGHT_PRODUCTION_LIVE_READINESS_STAGE_CHECK_SCRIPTS[
      preflightReport.production_attention_digest.live_readiness_next_stage_id
    ]
  ) {
    throw new Error(
      "preflight production attention digest live readiness check script must match live readiness stage"
    );
  }
  assertOnlyFields(
    preflightReport.production.boundary_policy,
    PREFLIGHT_PRODUCTION_BOUNDARY_POLICY_FIELDS,
    "preflight production boundary policy"
  );
  assertBoundaryPolicyFlagsTrue(
    preflightReport.production.boundary_policy,
    PREFLIGHT_PRODUCTION_BOUNDARY_POLICY_FIELDS,
    "preflight production boundary policy"
  );
  assertSafeLabel(
    preflightReport.production_attention_digest.runtime_handoff_status,
    "preflight production attention digest runtime handoff status"
  );
  if (
    !PREFLIGHT_PRODUCTION_RUNTIME_HANDOFF_STATUSES.has(
      preflightReport.production_attention_digest.runtime_handoff_status
    )
  ) {
    throw new Error(
      "preflight production attention digest runtime handoff status must be known"
    );
  }
  assertSafeLabel(
    preflightReport.production_attention_digest.runtime_next_component_id,
    "preflight production attention digest runtime next component id"
  );
  if (
    !PREFLIGHT_PRODUCTION_RUNTIME_COMPONENT_IDS.has(
      preflightReport.production_attention_digest.runtime_next_component_id
    )
  ) {
    throw new Error(
      "preflight production attention digest runtime next component id must be known"
    );
  }
  assertSafeNpmScript(
    preflightReport.production_attention_digest.runtime_next_check_script,
    "preflight production attention digest runtime next check script"
  );
  if (
    preflightReport.production_attention_digest.runtime_next_check_script !==
    PREFLIGHT_PRODUCTION_RUNTIME_COMPONENT_CHECK_SCRIPTS[
      preflightReport.production_attention_digest.runtime_next_component_id
    ]
  ) {
    throw new Error(
      "preflight production attention digest runtime next check script must match runtime component"
    );
  }
  assertSafeLabel(
    preflightReport.production_attention_digest.operator_focus_id,
    "preflight production attention digest operator focus id"
  );
  assertOptionalSafeLabel(
    preflightReport.production_attention_digest.operator_focus_reason,
    "preflight production attention digest operator focus reason"
  );
  assertSafeLabel(
    preflightReport.production_attention_digest.operator_focus_urgency,
    "preflight production attention digest operator focus urgency"
  );
  if (
    !["ready", "attention", "multi_gate_attention"].includes(
      preflightReport.production_attention_digest.operator_focus_urgency
    )
  ) {
    throw new Error(
      "preflight production attention digest operator focus urgency must be known"
    );
  }
  if (
    preflightReport.production_attention_digest.operator_focus_urgency !==
      "ready" &&
    preflightReport.production_attention_digest.operator_focus_reason === null
  ) {
    throw new Error(
      "preflight production attention digest attention focus reason must be present"
    );
  }
  assertSafeNpmScript(
    preflightReport.production_attention_digest.operator_focus_check_script,
    "preflight production attention digest operator focus check script"
  );
  assertSafeNpmScript(
    preflightReport.production_attention_digest.operator_focus_secondary_check_script,
    "preflight production attention digest operator focus secondary check script"
  );
  const expectedOperatorFocusCheckScripts = {
    runtime_handoff:
      preflightReport.production_attention_digest.runtime_next_component_id ===
      "foundation_runtime"
        ? "npm run dev:foundation:runtime-summary"
        : preflightReport.production_attention_digest.runtime_next_check_script,
    live_readiness:
      preflightReport.production_attention_digest.live_readiness_next_check_script,
    production_next_task:
      preflightReport.production_attention_digest.next_task_check_script,
  };
  if (
    !Object.hasOwn(
      expectedOperatorFocusCheckScripts,
      preflightReport.production_attention_digest.operator_focus_id
    )
  ) {
    throw new Error("preflight production attention digest operator focus id must be known");
  }
  if (
    preflightReport.production_attention_digest.operator_focus_check_script !==
    expectedOperatorFocusCheckScripts[
      preflightReport.production_attention_digest.operator_focus_id
    ]
  ) {
    throw new Error(
      "preflight production attention digest operator focus check script must match focus summary"
    );
  }
  assertOptionalNonNegativeInteger(
    preflightReport.production_attention_digest
      .operator_focus_pending_worker_job_count,
    "preflight production attention digest pending worker job count"
  );
  assertOptionalNonNegativeInteger(
    preflightReport.production_attention_digest
      .operator_focus_retry_blocked_worker_job_count,
    "preflight production attention digest retry blocked worker job count"
  );
  assertOptionalSafeLabel(
    preflightReport.production_attention_digest
      .operator_focus_local_bridge_worker_attention_reason,
    "preflight production attention digest local bridge worker attention reason"
  );
  assertOptionalSafeLabel(
    preflightReport.production_attention_digest
      .operator_focus_local_bridge_worker_next_operator_action_id,
    "preflight production attention digest local bridge worker next operator action"
  );
  if (
    preflightReport.production_attention_digest.operator_focus_id ===
      "runtime_handoff" &&
    (preflightReport.production_attention_digest
      .operator_focus_pending_worker_job_count === null ||
      preflightReport.production_attention_digest
        .operator_focus_retry_blocked_worker_job_count === null)
  ) {
    throw new Error(
      "preflight production attention digest runtime focus worker job counts must be present"
    );
  }
  for (const [field, label] of [
    ["low_output_entry_check_script", "preflight production attention digest low output entry check script"],
    ["low_output_first_check_script", "preflight production attention digest low output first check script"],
    ["low_output_focus_check_script", "preflight production attention digest low output focus check script"],
    ["low_output_secondary_check_script", "preflight production attention digest low output secondary check script"],
    ["low_output_full_preflight_script", "preflight production attention digest low output full preflight script"],
    ["low_output_public_boundary_check_script", "preflight production attention digest low output public boundary check script"],
  ]) {
    assertSafeNpmScript(preflightReport.production_attention_digest[field], label);
  }
  if (
    preflightReport.production_attention_digest.low_output_entry_check_script !==
    "npm run dev:admin:operations-summary"
  ) {
    throw new Error(
      "preflight production attention digest low output entry check script must be the admin operations summary"
    );
  }
  if (
    preflightReport.production_attention_digest.low_output_first_check_script !==
    "npm run dev:production:attention-digest"
  ) {
    throw new Error(
      "preflight production attention digest low output first check script must be the attention digest"
    );
  }
  if (
    preflightReport.production_attention_digest.low_output_focus_check_script !==
    preflightReport.production_attention_digest.operator_focus_check_script
  ) {
    throw new Error(
      "preflight production attention digest low output focus script must match operator focus"
    );
  }
  if (
    preflightReport.production_attention_digest.low_output_secondary_check_script !==
    preflightReport.production_attention_digest.operator_focus_secondary_check_script
  ) {
    throw new Error(
      "preflight production attention digest low output secondary script must match operator focus"
    );
  }
  if (
    preflightReport.production_attention_digest.low_output_full_preflight_script !==
    "npm run preflight"
  ) {
    throw new Error(
      "preflight production attention digest low output full preflight script must be npm run preflight"
    );
  }
  assertPositiveInteger(
    preflightReport.production_attention_digest
      .low_output_required_lightweight_script_count,
    "preflight production attention digest low output required lightweight script count"
  );
  assertNonNegativeInteger(
    preflightReport.production_attention_digest
      .low_output_missing_required_lightweight_script_count,
    "preflight production attention digest low output missing required lightweight script count"
  );
  if (
    preflightReport.production_attention_digest
      .low_output_missing_required_lightweight_script_count >
    preflightReport.production_attention_digest
      .low_output_required_lightweight_script_count
  ) {
    throw new Error(
      "preflight production attention digest low output missing required lightweight script count must not exceed required count"
    );
  }
  assertSafeLabel(
    preflightReport.production_attention_digest.next_task_stage_id,
    "preflight production attention digest next task stage id"
  );
  assertSafeLabel(
    preflightReport.production_attention_digest.next_task_readiness_state,
    "preflight production attention digest next task readiness state"
  );
  if (
    !PREFLIGHT_READINESS_STATE_COUNT_FIELDS.has(
      preflightReport.production_attention_digest.next_task_readiness_state
    )
  ) {
    throw new Error(
      "preflight production attention digest next task readiness state must be known"
    );
  }
  assertSafeNpmScript(
    preflightReport.production_attention_digest.next_task_check_script,
    "preflight production attention digest next task check script"
  );
  assertSafeLabel(
    preflightReport.production_attention_digest.anime_performance_admin_status,
    "preflight production attention digest anime performance admin status"
  );
  if (
    !["ready", "configuration_waiting"].includes(
      preflightReport.production_attention_digest.anime_performance_admin_status
    )
  ) {
    throw new Error(
      "preflight production attention digest anime performance admin status must be known"
    );
  }
  assertOptionalSafeLabel(
    preflightReport.production_attention_digest
      .anime_performance_next_operator_action_id,
    "preflight production attention digest anime performance next operator action"
  );
  assertOptionalSafeLabel(
    preflightReport.production_attention_digest
      .anime_performance_next_attention_area_id,
    "preflight production attention digest anime performance next attention area"
  );
  assertSafeNpmScript(
    preflightReport.production_attention_digest.anime_performance_next_safe_script,
    "preflight production attention digest anime performance next safe script"
  );
  assertSafeLabel(
    preflightReport.production_attention_digest.growth_business_admin_status,
    "preflight production attention digest growth business admin status"
  );
  if (
    !["ready", "configuration_waiting"].includes(
      preflightReport.production_attention_digest.growth_business_admin_status
    )
  ) {
    throw new Error(
      "preflight production attention digest growth business admin status must be known"
    );
  }
  assertOptionalSafeLabel(
    preflightReport.production_attention_digest
      .growth_business_next_operator_action_id,
    "preflight production attention digest growth business next operator action"
  );
  assertOptionalSafeLabel(
    preflightReport.production_attention_digest
      .growth_business_next_attention_area_id,
    "preflight production attention digest growth business next attention area"
  );
  assertSafeNpmScript(
    preflightReport.production_attention_digest.growth_business_next_safe_script,
    "preflight production attention digest growth business next safe script"
  );
  assertSafeNpmScript(
    preflightReport.production_attention_digest
      .public_report_boundary_next_safe_script,
    "preflight production attention digest public boundary next safe script"
  );
  assertSafeRoutePath(
    preflightReport.production_attention_digest.public_report_boundary_admin_route,
    "preflight production attention digest public boundary admin route"
  );
  for (const [field, label] of [
    [
      "anime_performance_next_attention_area_missing_setting_count",
      "preflight production attention digest anime performance next attention area missing setting count",
    ],
    [
      "anime_performance_required_setting_count",
      "preflight production attention digest anime performance required setting count",
    ],
    [
      "anime_performance_configured_setting_count",
      "preflight production attention digest anime performance configured setting count",
    ],
    [
      "anime_performance_missing_setting_count",
      "preflight production attention digest anime performance missing setting count",
    ],
    [
      "anime_performance_reference_setting_count",
      "preflight production attention digest anime performance reference setting count",
    ],
    [
      "anime_performance_reference_missing_setting_count",
      "preflight production attention digest anime performance reference missing setting count",
    ],
    [
      "anime_performance_expression_motion_setting_count",
      "preflight production attention digest anime performance expression motion setting count",
    ],
    [
      "anime_performance_expression_motion_missing_setting_count",
      "preflight production attention digest anime performance expression motion missing setting count",
    ],
    [
      "anime_performance_voice_speech_setting_count",
      "preflight production attention digest anime performance voice speech setting count",
    ],
    [
      "anime_performance_voice_speech_missing_setting_count",
      "preflight production attention digest anime performance voice speech missing setting count",
    ],
    [
      "anime_performance_ip_governance_setting_count",
      "preflight production attention digest anime performance IP governance setting count",
    ],
    [
      "anime_performance_ip_governance_missing_setting_count",
      "preflight production attention digest anime performance IP governance missing setting count",
    ],
    [
      "anime_performance_voice_license_use_category_setting_count",
      "preflight production attention digest anime performance voice license setting count",
    ],
    [
      "anime_performance_voice_license_use_category_missing_setting_count",
      "preflight production attention digest anime performance voice license missing setting count",
    ],
    [
      "anime_performance_identity_surface_count",
      "preflight production attention digest anime performance identity surface count",
    ],
    [
      "anime_performance_identity_configured_surface_count",
      "preflight production attention digest anime performance identity configured surface count",
    ],
    [
      "anime_performance_identity_missing_surface_count",
      "preflight production attention digest anime performance identity missing surface count",
    ],
    [
      "growth_business_next_attention_area_missing_setting_count",
      "preflight production attention digest growth business next attention area missing setting count",
    ],
    [
      "growth_business_required_setting_count",
      "preflight production attention digest growth business required setting count",
    ],
    [
      "growth_business_configured_setting_count",
      "preflight production attention digest growth business configured setting count",
    ],
    [
      "growth_business_missing_setting_count",
      "preflight production attention digest growth business missing setting count",
    ],
  ]) {
    assertNonNegativeInteger(
      preflightReport.production_attention_digest[field],
      label
    );
  }
  if (
    preflightReport.production_attention_digest
      .anime_performance_configured_setting_count +
      preflightReport.production_attention_digest
        .anime_performance_missing_setting_count !==
    preflightReport.production_attention_digest
      .anime_performance_required_setting_count
  ) {
    throw new Error(
      "preflight production attention digest anime performance setting counts must match"
    );
  }
  if (
    sumPreflightAnimePerformanceCounts(
      preflightReport.production_attention_digest,
      "setting_count"
    ) !==
    preflightReport.production_attention_digest
      .anime_performance_required_setting_count
  ) {
    throw new Error(
      "preflight production attention digest anime performance category setting counts must match"
    );
  }
  if (
    sumPreflightAnimePerformanceCounts(
      preflightReport.production_attention_digest,
      "missing_setting_count"
    ) !==
    preflightReport.production_attention_digest.anime_performance_missing_setting_count
  ) {
    throw new Error(
      "preflight production attention digest anime performance category missing counts must match"
    );
  }
  if (
    preflightReport.production_attention_digest
      .anime_performance_identity_surface_count !==
      PREFLIGHT_ANIME_IDENTITY_SURFACE_FIELDS.length ||
    preflightReport.production_attention_digest
      .anime_performance_identity_configured_surface_count +
      preflightReport.production_attention_digest
        .anime_performance_identity_missing_surface_count !==
      preflightReport.production_attention_digest
        .anime_performance_identity_surface_count
  ) {
    throw new Error(
      "preflight production attention digest anime performance identity surface counts must match"
    );
  }
  if (
    preflightReport.production_attention_digest
      .growth_business_configured_setting_count +
      preflightReport.production_attention_digest
        .growth_business_missing_setting_count !==
    preflightReport.production_attention_digest
      .growth_business_required_setting_count
  ) {
    throw new Error(
      "preflight production attention digest growth business setting counts must match"
    );
  }
  assertSafeLabel(
    preflightReport.production_attention_digest.live_readiness_status,
    "preflight production attention digest live readiness status"
  );
  if (
    !PREFLIGHT_PRODUCTION_LIVE_READINESS_STATUSES.has(
      preflightReport.production_attention_digest.live_readiness_status
    )
  ) {
    throw new Error(
      "preflight production attention digest live readiness status must be known"
    );
  }
  assertSafeLabel(
    preflightReport.production_attention_digest.live_readiness_next_stage_id,
    "preflight production attention digest live readiness next stage id"
  );
  assertSafeNpmScript(
    preflightReport.production_attention_digest.live_readiness_next_check_script,
    "preflight production attention digest live readiness next check script"
  );
  assertNonNegativeInteger(
    preflightReport.production_attention_digest.ready_stage_count,
    "preflight production attention digest ready stage count"
  );
  assertNonNegativeInteger(
    preflightReport.production_attention_digest.attention_stage_count,
    "preflight production attention digest attention stage count"
  );
  if (
    preflightReport.production_attention_digest.ready_stage_count +
      preflightReport.production_attention_digest.attention_stage_count ===
    0
  ) {
    throw new Error("preflight production attention digest stage counts must not be empty");
  }
  if (
    preflightReport.production_attention_digest.ready_stage_count +
      preflightReport.production_attention_digest.attention_stage_count !==
    preflightReport.production.stage_statuses.length
  ) {
    throw new Error(
      "preflight production attention digest stage counts must match production stage statuses"
    );
  }
  if (
    typeof preflightReport.production_attention_digest.public_report_boundary_ok !==
    "boolean"
  ) {
    throw new Error("preflight production attention digest boundary ok must be a boolean");
  }
  assertPositiveInteger(
    preflightReport.production_attention_digest
      .public_report_boundary_required_lightweight_script_count,
    "preflight production attention digest public boundary required lightweight script count"
  );
  assertNonNegativeInteger(
    preflightReport.production_attention_digest
      .public_report_boundary_missing_required_lightweight_script_count,
    "preflight production attention digest public boundary missing required lightweight script count"
  );
  if (
    preflightReport.production_attention_digest
      .public_report_boundary_missing_required_lightweight_script_count >
    preflightReport.production_attention_digest
      .public_report_boundary_required_lightweight_script_count
  ) {
    throw new Error(
      "preflight production attention digest public boundary missing required lightweight script count must not exceed required count"
    );
  }
  assertOnlyFields(
    preflightReport.production_attention_digest.boundary_policy,
    PREFLIGHT_ATTENTION_DIGEST_BOUNDARY_POLICY_FIELDS,
    "preflight production attention digest boundary policy"
  );
  assertBoundaryPolicyFlagsTrue(
    preflightReport.production_attention_digest.boundary_policy,
    PREFLIGHT_ATTENTION_DIGEST_BOUNDARY_POLICY_FIELDS,
    "preflight production attention digest boundary policy"
  );
  assertOnlyFields(
    preflightReport.public_report_boundary_audit,
    PREFLIGHT_PUBLIC_REPORT_BOUNDARY_AUDIT_FIELDS,
    "preflight public report boundary audit summary"
  );
  if (typeof preflightReport.public_report_boundary_audit.ok !== "boolean") {
    throw new Error("preflight public report boundary audit ok must be a boolean");
  }
  if (preflightReport.ok !== preflightReport.public_report_boundary_audit.ok) {
    throw new Error("preflight ok must match public report boundary audit ok");
  }
  if (
    preflightReport.production_attention_digest.public_report_boundary_ok !==
    preflightReport.public_report_boundary_audit.ok
  ) {
    throw new Error(
      "preflight production attention digest boundary ok must match boundary audit"
    );
  }
  if (
    preflightReport.public_report_boundary_audit.schema !==
    "iris_public_report_boundary_audit_v1"
  ) {
    throw new Error("preflight public report boundary audit schema must match");
  }
  for (const field of [
    "scanned_script_count",
    "assert_script_count",
    "missing_allowlist_count",
    "scanned_run_script_count",
    "missing_run_boundary_count",
    "scanned_dev_service_count",
    "dev_service_assert_count",
    "missing_dev_service_allowlist_count",
    "scanned_server_file_count",
    "server_assert_count",
    "missing_server_allowlist_count",
    "scanned_src_import_file_count",
    "script_layer_import_violation_count",
    "required_lightweight_script_count",
    "missing_required_lightweight_script_count",
  ]) {
    assertNonNegativeInteger(
      preflightReport.public_report_boundary_audit[field],
      `preflight public report boundary audit ${field}`
    );
  }
  for (const field of [
    "scanned_script_count",
    "assert_script_count",
    "scanned_run_script_count",
    "scanned_dev_service_count",
    "dev_service_assert_count",
    "scanned_server_file_count",
    "server_assert_count",
    "scanned_src_import_file_count",
    "required_lightweight_script_count",
  ]) {
    assertPositiveInteger(
      preflightReport.public_report_boundary_audit[field],
      `preflight public report boundary audit ${field}`
    );
  }
  if (
    preflightReport.public_report_boundary_audit.assert_script_count >
    preflightReport.public_report_boundary_audit.scanned_script_count
  ) {
    throw new Error(
      "preflight public report boundary audit assert script count must not exceed scanned script count"
    );
  }
  if (
    preflightReport.public_report_boundary_audit.dev_service_assert_count >
    preflightReport.public_report_boundary_audit.scanned_dev_service_count
  ) {
    throw new Error(
      "preflight public report boundary audit dev-service assert count must not exceed scanned dev-service count"
    );
  }
  if (
    preflightReport.public_report_boundary_audit.server_assert_count >
    preflightReport.public_report_boundary_audit.scanned_server_file_count
  ) {
    throw new Error(
      "preflight public report boundary audit server assert count must not exceed scanned server file count"
    );
  }
  for (const [missingField, scannedField] of [
    ["missing_allowlist_count", "scanned_script_count"],
    ["missing_run_boundary_count", "scanned_run_script_count"],
    ["missing_dev_service_allowlist_count", "scanned_dev_service_count"],
    ["missing_server_allowlist_count", "scanned_server_file_count"],
    ["script_layer_import_violation_count", "scanned_src_import_file_count"],
    [
      "missing_required_lightweight_script_count",
      "required_lightweight_script_count",
    ],
  ]) {
    if (
      preflightReport.public_report_boundary_audit[missingField] >
      preflightReport.public_report_boundary_audit[scannedField]
    ) {
      throw new Error(
        `preflight public report boundary audit ${missingField} must not exceed ${scannedField}`
      );
    }
  }
  if (preflightReport.public_report_boundary_audit.ok === true) {
    for (const field of [
      "missing_allowlist_count",
      "missing_run_boundary_count",
      "missing_dev_service_allowlist_count",
      "missing_server_allowlist_count",
      "script_layer_import_violation_count",
      "missing_required_lightweight_script_count",
    ]) {
      if (preflightReport.public_report_boundary_audit[field] !== 0) {
        throw new Error(
          `preflight public report boundary audit ${field} must be zero when ok`
        );
      }
    }
  }
  const preflightBoundaryMissingCountTotal =
    preflightReport.public_report_boundary_audit.missing_allowlist_count +
    preflightReport.public_report_boundary_audit.missing_run_boundary_count +
    preflightReport.public_report_boundary_audit
      .missing_dev_service_allowlist_count +
    preflightReport.public_report_boundary_audit.missing_server_allowlist_count +
    preflightReport.public_report_boundary_audit
      .script_layer_import_violation_count +
    preflightReport.public_report_boundary_audit
      .missing_required_lightweight_script_count;
  if (
    preflightReport.public_report_boundary_audit.ok === false &&
    preflightBoundaryMissingCountTotal === 0
  ) {
    throw new Error(
      "preflight public report boundary audit not-ok must have missing counts"
    );
  }
  assertOnlyFields(
    preflightReport.public_report_boundary_audit.boundary_policy,
    PREFLIGHT_PUBLIC_REPORT_BOUNDARY_POLICY_FIELDS,
    "preflight public report boundary audit boundary policy"
  );
  assertBoundaryPolicyFlagsTrue(
    preflightReport.public_report_boundary_audit.boundary_policy,
    PREFLIGHT_PUBLIC_REPORT_BOUNDARY_POLICY_FIELDS,
    "preflight public report boundary audit boundary policy"
  );
  if (preflightReport.ok !== true) {
    throw new Error("preflight ok must be true after public boundary validation");
  }
  if (preflightReport.public_report_boundary_audit.ok !== true) {
    throw new Error("preflight public report boundary audit ok must be true");
  }

  assert.equal(preflightReport.ok, true);
  assert.equal(preflightReport.public_report_boundary_audit?.ok, true);
  assert.equal(
    preflightReport.public_report_boundary_audit?.missing_allowlist_count,
    0
  );
  assert.equal(
    preflightReport.public_report_boundary_audit?.missing_run_boundary_count,
    0
  );
  assert.equal(
    preflightReport.public_report_boundary_audit
      ?.missing_dev_service_allowlist_count,
    0
  );
  assert.equal(
    preflightReport.public_report_boundary_audit
      ?.missing_server_allowlist_count,
    0
  );
  assert.equal(
    preflightReport.public_report_boundary_audit.boundary_policy.no_file_contents,
    true
  );
  assert.equal(
    preflightReport.production.boundary_policy.no_secret_values,
    true
  );
  assert.equal(
    preflightReport.production.boundary_policy.no_endpoint_values,
    true
  );
  if (
    preflightReport.production_attention_digest.schema !==
    "iris_production_attention_digest_preflight_summary_v1"
  ) {
    throw new Error("preflight production attention digest schema must match");
  }
  assert.equal(
    preflightReport.production_attention_digest?.public_report_boundary_ok,
    true
  );
  assert.equal(
    preflightReport.production_attention_digest.boundary_policy.script_names_only,
    true
  );
}

export async function createPreflightReport() {
const specsDir = join("docs", "specs", "IRIS_20240425");
const specManifest = createSpecManifest({ specsDir });

const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig({ enablePersistence: false }),
  ttsAdapter(packet) {
    return { spoken: Boolean(packet.final_text), packet_schema: packet.packet_schema };
  },
  live2dAdapter(packet) {
    return { sent: true, packet_schema: packet.packet_schema };
  },
  logger: { log() {}, error: console.error },
});

const scenario = loadScenarioFile("scenarios/dev-basic.json");
const scenarioResult = await runScenario(runtime, scenario);
const latestStep = scenarioResult.results.at(-1);

assert.equal(specManifest.complete, true);
assert.equal(scenarioResult.schema, "iris_scenario_result_v1");
assert.equal(latestStep.review_required, false);

const report = createReadinessReport({
  capabilities: runtime.capabilities(),
  candidateReviewStats: runtime.candidateReviewStats(),
  specFileCount: specManifest.found_count,
});
assertReadinessReportSafe(report);
assert.equal(report.readiness_status, "ready_for_local_dev");
const productionRunbook = createProductionReadinessRunbook();
assertProductionReadinessRunbookSafe(productionRunbook, "preflight production runbook");
const publicReportBoundaryAudit = createPublicReportBoundaryAuditReport();
verifyPublicReportBoundaryAuditReportSafe(publicReportBoundaryAudit);
assert.equal(publicReportBoundaryAudit.ok, true);
const productionAttentionDigest = await createProductionAttentionDigestReport();
assertProductionAttentionDigestSafe(productionAttentionDigest);

const preflightReport = {
  ok: true,
  specs: {
    expected: specManifest.expected_count,
    found: specManifest.found_count,
    missing: specManifest.missing_files,
    addendum_files: specManifest.addendum_files,
  },
  scenario: {
    name: scenarioResult.name,
    step_count: scenarioResult.step_count,
    last_review_required: latestStep.review_required,
  },
  readiness: {
    status: report.readiness_status,
    next_readiness_state: report.next_readiness_state,
    readiness_state_counts: report.readiness_state_counts,
    integration_probe_readiness_summary:
      report.integration_probe_readiness_summary,
    candidate_review_items: runtime.candidateReviewStats().total_items,
    integration_gaps: report.integration_gaps,
    integration_gap_statuses: report.integration_gap_statuses.map((item) => ({
      gap: item.gap,
      status: item.status,
      readiness_state: item.readiness_state,
      operator_configuration_required: item.operator_configuration_required,
    })),
  },
  production: {
    readiness_status: productionRunbook.readiness_status,
    next_stage: productionRunbook.next_stage,
    verification_plan: {
      plan_status: productionRunbook.verification_plan.plan_status,
      next_stage_id: productionRunbook.verification_plan.next_stage_id,
      next_stage_priority: productionRunbook.verification_plan.next_stage_priority,
      next_stage_verification_scripts:
        productionRunbook.verification_plan.next_stage_verification_scripts,
      total_verification_script_count:
        productionRunbook.verification_plan.total_verification_script_count,
      boundary_policy: productionRunbook.verification_plan.boundary_policy,
    },
    operator_launch_plan: {
      plan_status: productionRunbook.operator_launch_plan.plan_status,
      target_stage_id: productionRunbook.operator_launch_plan.target_stage_id,
      ready_step_count: productionRunbook.operator_launch_plan.ready_step_count,
      attention_step_count: productionRunbook.operator_launch_plan.attention_step_count,
      next_step_id: productionRunbook.operator_launch_plan.next_step_id,
      next_step_order: productionRunbook.operator_launch_plan.next_step_order,
      launch_sequence: productionRunbook.operator_launch_plan.launch_sequence.map(
        (step) => ({
          sequence_order: step.sequence_order,
          process_id: step.process_id,
          launch_readiness_status: step.launch_readiness_status,
          launch_script: step.launch_script,
          readiness_script: step.readiness_script,
          missing_required_env: step.missing_required_env,
        })
      ),
      boundary_policy: productionRunbook.operator_launch_plan.boundary_policy,
    },
    stage_statuses: productionRunbook.stages.map((stage) => ({
      stage_id: stage.stage_id,
      status: stage.status,
      missing_required_env: stage.missing_required_env,
    })),
    boundary_policy: {
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_raw_frames: true,
      no_raw_runtime_state: true,
      read_only_summary: true,
    },
  },
  production_attention_digest: {
    schema: "iris_production_attention_digest_preflight_summary_v1",
    runtime_handoff_status:
      productionAttentionDigest.runtime_handoff_summary.handoff_status,
    runtime_next_component_id:
      productionAttentionDigest.runtime_handoff_summary.next_component_id,
    runtime_next_check_script:
      productionAttentionDigest.runtime_handoff_summary.next_check_script,
    operator_focus_id:
      productionAttentionDigest.operator_focus.focus_id,
    operator_focus_reason:
      productionAttentionDigest.operator_focus.focus_reason,
    operator_focus_urgency:
      productionAttentionDigest.operator_focus.focus_urgency,
    operator_focus_check_script:
      productionAttentionDigest.operator_focus.focus_check_script,
    operator_focus_secondary_check_script:
      productionAttentionDigest.operator_focus.secondary_check_script,
    operator_focus_pending_worker_job_count:
      productionAttentionDigest.operator_focus.pending_worker_job_count,
    operator_focus_retry_blocked_worker_job_count:
      productionAttentionDigest.operator_focus.retry_blocked_worker_job_count,
    operator_focus_local_bridge_worker_attention_reason:
      productionAttentionDigest.operator_focus.local_bridge_worker_attention_reason,
    operator_focus_local_bridge_worker_next_operator_action_id:
      productionAttentionDigest.operator_focus
        .local_bridge_worker_next_operator_action_id,
    low_output_entry_check_script:
      productionAttentionDigest.low_output_restart_summary.entry_check_script,
    low_output_first_check_script:
      productionAttentionDigest.low_output_restart_summary.first_check_script,
    low_output_focus_check_script:
      productionAttentionDigest.low_output_restart_summary.focus_check_script,
    low_output_secondary_check_script:
      productionAttentionDigest.low_output_restart_summary.secondary_check_script,
    low_output_full_preflight_script:
      productionAttentionDigest.low_output_restart_summary.full_preflight_script,
    low_output_public_boundary_check_script:
      productionAttentionDigest.low_output_restart_summary
        .public_boundary_check_script,
    low_output_required_lightweight_script_count:
      productionAttentionDigest.low_output_restart_summary
        .required_lightweight_script_count,
    low_output_missing_required_lightweight_script_count:
      productionAttentionDigest.low_output_restart_summary
        .missing_required_lightweight_script_count,
    next_task_stage_id:
      productionAttentionDigest.next_task_summary.next_stage_id,
    next_task_readiness_state:
      productionAttentionDigest.next_task_summary.next_readiness_state,
    next_task_check_script:
      productionAttentionDigest.next_task_summary.next_readiness_script,
    anime_performance_admin_status:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .admin_status,
    anime_performance_next_operator_action_id:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .next_operator_action_id,
    anime_performance_next_attention_area_id:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .next_attention_area_id,
    anime_performance_next_attention_area_missing_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .next_attention_area_missing_setting_count,
    anime_performance_next_safe_script:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .next_safe_script,
    anime_performance_required_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .required_setting_count,
    anime_performance_configured_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .configured_setting_count,
    anime_performance_missing_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .missing_setting_count,
    anime_performance_reference_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .reference_setting_count,
    anime_performance_reference_missing_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .reference_missing_setting_count,
    anime_performance_expression_motion_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .expression_motion_setting_count,
    anime_performance_expression_motion_missing_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .expression_motion_missing_setting_count,
    anime_performance_voice_speech_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .voice_speech_setting_count,
    anime_performance_voice_speech_missing_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .voice_speech_missing_setting_count,
    anime_performance_ip_governance_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .ip_governance_setting_count,
    anime_performance_ip_governance_missing_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .ip_governance_missing_setting_count,
    anime_performance_voice_license_use_category_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .voice_license_use_category_setting_count,
    anime_performance_voice_license_use_category_missing_setting_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .voice_license_use_category_missing_setting_count,
    anime_performance_identity_surface_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .anime_identity_surface_count,
    anime_performance_identity_configured_surface_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .anime_identity_configured_surface_count,
    anime_performance_identity_missing_surface_count:
      productionAttentionDigest.anime_performance_admin_attention_summary
        .anime_identity_missing_surface_count,
    growth_business_admin_status:
      productionAttentionDigest.growth_business_admin_attention_summary
        .admin_status,
    growth_business_next_operator_action_id:
      productionAttentionDigest.growth_business_admin_attention_summary
        .next_operator_action_id,
    growth_business_next_attention_area_id:
      productionAttentionDigest.growth_business_admin_attention_summary
        .next_attention_area_id,
    growth_business_next_attention_area_missing_setting_count:
      productionAttentionDigest.growth_business_admin_attention_summary
        .next_attention_area_missing_setting_count,
    growth_business_next_safe_script:
      productionAttentionDigest.growth_business_admin_attention_summary
        .next_safe_script,
    growth_business_required_setting_count:
      productionAttentionDigest.growth_business_admin_attention_summary
        .required_setting_count,
    growth_business_configured_setting_count:
      productionAttentionDigest.growth_business_admin_attention_summary
        .configured_setting_count,
    growth_business_missing_setting_count:
      productionAttentionDigest.growth_business_admin_attention_summary
        .missing_setting_count,
    live_readiness_status:
      productionAttentionDigest.live_readiness_summary.overall_status,
    live_readiness_next_stage_id:
      productionAttentionDigest.live_readiness_summary.next_stage_id,
    live_readiness_next_check_script:
      productionAttentionDigest.live_readiness_summary.next_check_script,
    ready_stage_count:
      productionAttentionDigest.live_readiness_summary.ready_stage_count,
    attention_stage_count:
      productionAttentionDigest.live_readiness_summary.attention_stage_count,
    public_report_boundary_ok:
      productionAttentionDigest.public_report_boundary_audit_summary.ok,
    public_report_boundary_next_safe_script:
      productionAttentionDigest.public_report_boundary_audit_summary.next_safe_script,
    public_report_boundary_admin_route:
      productionAttentionDigest.public_report_boundary_audit_summary.admin_route,
    public_report_boundary_required_lightweight_script_count:
      productionAttentionDigest.public_report_boundary_audit_summary
        .required_lightweight_script_count,
    public_report_boundary_missing_required_lightweight_script_count:
      productionAttentionDigest.public_report_boundary_audit_summary
        .missing_required_lightweight_script_count,
    boundary_policy: {
      script_names_only: true,
      counts_statuses_and_booleans_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_raw_runtime_state: true,
      no_character_reference_materials: true,
      no_voice_samples: true,
      no_animation_materials: true,
      no_script_text: true,
      public_audit_ok_only: true,
      public_audit_missing_file_lists_omitted: true,
    },
  },
  public_report_boundary_audit: {
    ok: publicReportBoundaryAudit.ok,
    schema: publicReportBoundaryAudit.schema,
    scanned_script_count: publicReportBoundaryAudit.scanned_script_count,
    assert_script_count: publicReportBoundaryAudit.assert_script_count,
    missing_allowlist_count:
      publicReportBoundaryAudit.missing_allowlist_count,
    scanned_run_script_count:
      publicReportBoundaryAudit.scanned_run_script_count,
    missing_run_boundary_count:
      publicReportBoundaryAudit.missing_run_boundary_count,
    scanned_dev_service_count:
      publicReportBoundaryAudit.scanned_dev_service_count,
    dev_service_assert_count:
      publicReportBoundaryAudit.dev_service_assert_count,
    missing_dev_service_allowlist_count:
      publicReportBoundaryAudit.missing_dev_service_allowlist_count,
    scanned_server_file_count:
      publicReportBoundaryAudit.scanned_server_file_count,
    server_assert_count:
      publicReportBoundaryAudit.server_assert_count,
    missing_server_allowlist_count:
      publicReportBoundaryAudit.missing_server_allowlist_count,
    scanned_src_import_file_count:
      publicReportBoundaryAudit.scanned_src_import_file_count,
    script_layer_import_violation_count:
      publicReportBoundaryAudit.script_layer_import_violation_count,
    required_lightweight_script_count:
      publicReportBoundaryAudit.required_lightweight_script_count,
    missing_required_lightweight_script_count:
      publicReportBoundaryAudit.missing_required_lightweight_script_count,
    boundary_policy: {
      ...publicReportBoundaryAudit.boundary_policy,
      missing_file_lists_omitted: true,
    },
  },
};

assertPreflightReportSafe(preflightReport);

return preflightReport;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const preflightReport = await createPreflightReport();
  console.log(JSON.stringify(preflightReport, null, 2));
}
