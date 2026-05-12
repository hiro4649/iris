import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationStatusReportSafe,
  createFoundationStatusReport,
} from "./foundationStatus.js";
import {
  assertOperatorLaunchPlanSafe,
  createProductionReadinessRunbook,
} from "./productionReadinessRunbook.js";

const FORBIDDEN_FOUNDATION_PREFLIGHT_FIELDS = new Set([
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
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "value",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const FOUNDATION_PREFLIGHT_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "preflight_status",
  "next_readiness_state",
  "readiness_state_counts",
  "target_stage_id",
  "plan_status",
  "ready_step_count",
  "attention_step_count",
  "target_policy_attention",
  "foundation_status_summary",
  "next_step",
  "launch_steps",
  "foundation_stage_summary",
  "integration_readiness",
  "verification_plan_summary",
  "boundary_policy",
  "adapter_validation_required",
]);

export function createFoundationPreflightReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const runbook = createProductionReadinessRunbook({ env, generatedAtMs });
  const foundationStatus = createFoundationStatusReport({ env, generatedAtMs });
  const plan = runbook.operator_launch_plan;
  const foundationStage = runbook.stages.find(
    (stage) => stage.stage_id === "tts_live2d_obs_foundation"
  );
  assertOperatorLaunchPlanSafe(plan, "foundation preflight launch plan");
  assertFoundationStatusReportSafe(
    foundationStatus,
    "foundation preflight foundation status"
  );
  if (!foundationStage) {
    throw new ContractError("foundation preflight: missing foundation stage");
  }
  const nextStep =
    plan.next_step_id === null
      ? null
      : plan.launch_sequence.find((step) => step.process_id === plan.next_step_id) ?? null;
  const foundationStatusSummary = buildFoundationStatusSummary(foundationStatus);
  const foundationReady =
    foundationStage.status === "ready" &&
    foundationStatus.foundation_readiness_status === "ready_for_runtime_handoff" &&
    foundationStatusSummary.attention_reason_count === 0;
  const missingEnvBlocked =
    plan.attention_step_count > 0 || foundationStage.missing_required_env.length > 0;
  const report = {
    schema: "iris_foundation_preflight_report_v1",
    generated_at_ms: generatedAtMs,
    preflight_status:
      foundationReady
        ? "ready_to_start_foundation"
        : missingEnvBlocked
          ? "blocked_by_missing_env"
          : "blocked_by_configuration",
    next_readiness_state: foundationStatus.next_readiness_state,
    readiness_state_counts: foundationStatus.readiness_state_counts,
    target_stage_id: plan.target_stage_id,
    plan_status: plan.plan_status,
    ready_step_count: plan.ready_step_count,
    attention_step_count: plan.attention_step_count,
    target_policy_attention:
      foundationStatus.foundation_summary.local_target_policy_attention === true,
    foundation_status_summary: foundationStatusSummary,
    next_step: nextStep === null ? null : buildNextStep(nextStep),
    launch_steps: plan.launch_sequence.map((step) => ({
      schema: "iris_foundation_preflight_step_v1",
      sequence_order: step.sequence_order,
      process_id: step.process_id,
      launch_readiness_status: step.launch_readiness_status,
      readiness_state: readinessStateForLaunchStep(step),
      launch_script: step.launch_script,
      readiness_script: step.readiness_script,
      missing_required_env_count: step.missing_required_env.length,
    })),
    foundation_stage_summary: {
      schema: "iris_foundation_preflight_stage_summary_v1",
      stage_id: foundationStage.stage_id,
      stage_status: foundationStage.status,
      integration_count: foundationStage.integrations.length,
      ready_integration_count: foundationStage.integrations.filter(
        (integration) => integration.status === "ready"
      ).length,
      attention_integration_count: foundationStage.integrations.filter(
        (integration) => integration.status === "attention"
      ).length,
      missing_required_env_count: foundationStage.missing_required_env.length,
      first_verification_script: foundationStage.verification_scripts[0] ?? null,
      verification_script_count: foundationStage.verification_scripts.length,
    },
    integration_readiness: foundationStage.integrations.map((integration) => ({
      schema: "iris_foundation_preflight_integration_readiness_v1",
      integration: integration.integration,
      status: integration.status,
      mode: integration.mode,
      readiness_state: readinessStateForIntegration(integration),
    })),
    verification_plan_summary: {
      schema: "iris_foundation_preflight_verification_summary_v1",
      plan_status: runbook.verification_plan.plan_status,
      next_stage_id: runbook.verification_plan.next_stage_id,
      next_stage_priority: runbook.verification_plan.next_stage_priority,
      first_verification_script:
        runbook.verification_plan.next_stage_verification_scripts[0] ?? null,
      total_verification_script_count:
        runbook.verification_plan.total_verification_script_count,
    },
    boundary_policy: {
      safe_local_scripts_only: true,
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      read_only_preflight: true,
    },
    adapter_validation_required: true,
  };
  assertFoundationPreflightReportSafe(report);
  return report;
}

export function assertFoundationPreflightReportSafe(
  report,
  context = "foundation preflight report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenFoundationPreflightFields(report, context);
  if (report.schema !== "iris_foundation_preflight_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!FOUNDATION_PREFLIGHT_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (
    ![
      "ready_to_start_foundation",
      "blocked_by_missing_env",
      "blocked_by_configuration",
    ].includes(
      report.preflight_status
    )
  ) {
    throw new ContractError(`${context}: invalid preflight status`);
  }
  assertSafeReadinessState(report.next_readiness_state, context);
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  if (
    report.next_readiness_state !==
      report.foundation_status_summary.next_readiness_state ||
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      report.foundation_status_summary.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: readiness state summary mismatch`);
  }
  if (report.target_stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (!["ready_to_launch_foundation", "configure_foundation_env_first"].includes(report.plan_status)) {
    throw new ContractError(`${context}: invalid plan status`);
  }
  if (!Number.isInteger(report.ready_step_count) || report.ready_step_count < 0) {
    throw new ContractError(`${context}: invalid ready step count`);
  }
  if (!Number.isInteger(report.attention_step_count) || report.attention_step_count < 0) {
    throw new ContractError(`${context}: invalid attention step count`);
  }
  if (typeof report.target_policy_attention !== "boolean") {
    throw new ContractError(`${context}: invalid target policy flag`);
  }
  assertFoundationStatusSummarySafe(report.foundation_status_summary, context);
  if (!Array.isArray(report.launch_steps) || report.launch_steps.length === 0) {
    throw new ContractError(`${context}: launch step summaries are required`);
  }
  if (report.ready_step_count + report.attention_step_count !== report.launch_steps.length) {
    throw new ContractError(`${context}: invalid launch step count summary`);
  }
  if (
    report.preflight_status === "ready_to_start_foundation" &&
    (report.attention_step_count !== 0 ||
      report.foundation_status_summary.attention_reason_count !== 0 ||
      report.target_policy_attention === true)
  ) {
    throw new ContractError(`${context}: ready preflight has attention steps`);
  }
  if (
    report.preflight_status === "blocked_by_missing_env" &&
    report.attention_step_count === 0
  ) {
    throw new ContractError(`${context}: blocked preflight has no attention steps`);
  }
  if (
    report.preflight_status === "blocked_by_configuration" &&
    (report.attention_step_count !== 0 ||
      report.foundation_status_summary.attention_reason_count === 0)
  ) {
    throw new ContractError(`${context}: configuration block summary is inconsistent`);
  }
  if (report.attention_step_count === 0 && report.next_step !== null) {
    throw new ContractError(`${context}: unexpected next step`);
  }
  if (report.attention_step_count > 0) assertFoundationNextStepSafe(report.next_step, context);
  for (const step of report.launch_steps) assertFoundationStepSummarySafe(step, context);
  assertFoundationStageSummarySafe(report.foundation_stage_summary, context);
  assertFoundationIntegrationReadinessListSafe(report.integration_readiness, context);
  assertVerificationSummarySafe(report.verification_plan_summary, context);
  assertBoundaryPolicy(report.boundary_policy, [
    "safe_local_scripts_only",
    "env_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_payloads",
    "no_candidates",
    "read_only_preflight",
  ], context);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

function buildFoundationStatusSummary(foundationStatus) {
  const summary = foundationStatus.foundation_summary;
  return {
    schema: "iris_foundation_preflight_status_summary_v1",
    foundation_readiness_status: foundationStatus.foundation_readiness_status,
    runtime_http_adapters_configured:
      summary.runtime_http_adapters_configured === true,
    local_bridge_storage_configured:
      summary.local_bridge_storage_configured === true,
    render_manifest_stale_guard_configured:
      summary.render_manifest_stale_guard_configured === true,
    render_artifact_sync_guard_configured:
      summary.render_artifact_sync_guard_configured === true,
    real_tts_engine_configured:
      summary.original_voice_engine_preferences_configured === true &&
      summary.tts_adapter_readiness_status !== "unavailable",
    real_live2d_engine_configured:
      summary.live2d_adapter_readiness_status !== "unavailable",
    obs_browser_source_configured:
      summary.obs_browser_source_configured === true,
    local_target_policy_attention:
      summary.local_target_policy_attention === true,
    attention_reason_count: summary.attention_reason_count,
    next_attention_reason: summary.next_attention_reason,
    next_readiness_state: foundationStatus.next_readiness_state,
    readiness_state_counts: foundationStatus.readiness_state_counts,
    boundary_policy: {
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function assertFoundationStatusSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: foundation status summary is required`);
  }
  if (summary.schema !== "iris_foundation_preflight_status_summary_v1") {
    throw new ContractError(`${context}: invalid foundation status summary schema`);
  }
  if (
    !["ready_for_runtime_handoff", "attention_required"].includes(
      summary.foundation_readiness_status
    )
  ) {
    throw new ContractError(`${context}: invalid foundation readiness summary`);
  }
  for (const field of [
    "runtime_http_adapters_configured",
    "local_bridge_storage_configured",
    "render_manifest_stale_guard_configured",
    "render_artifact_sync_guard_configured",
    "real_tts_engine_configured",
    "real_live2d_engine_configured",
    "obs_browser_source_configured",
    "local_target_policy_attention",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid foundation summary flag`);
    }
  }
  if (
    !Number.isInteger(summary.attention_reason_count) ||
    summary.attention_reason_count < 0
  ) {
    throw new ContractError(`${context}: invalid foundation attention count`);
  }
  if (
    summary.next_attention_reason !== null &&
    ![
      "runtime_http_adapters_not_configured",
      "local_bridge_storage_not_configured",
      "real_tts_engine_not_configured",
      "real_live2d_engine_not_configured",
      "obs_browser_source_not_configured",
      "local_target_policy_attention",
    ].includes(summary.next_attention_reason)
  ) {
    throw new ContractError(`${context}: invalid foundation attention reason`);
  }
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  if (
    summary.foundation_readiness_status === "ready_for_runtime_handoff" &&
    (summary.attention_reason_count !== 0 || summary.next_attention_reason !== null)
  ) {
    throw new ContractError(`${context}: ready foundation summary has attention`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "booleans_counts_and_fixed_statuses_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_payloads",
    "no_candidates",
    "no_commands",
  ], `${context}: foundation status summary`);
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

function assertFoundationStageSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: foundation stage summary is required`);
  }
  if (summary.schema !== "iris_foundation_preflight_stage_summary_v1") {
    throw new ContractError(`${context}: invalid foundation stage summary schema`);
  }
  if (summary.stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid foundation stage summary id`);
  }
  if (!["ready", "attention"].includes(summary.stage_status)) {
    throw new ContractError(`${context}: invalid foundation stage status`);
  }
  for (const field of [
    "integration_count",
    "ready_integration_count",
    "attention_integration_count",
    "missing_required_env_count",
    "verification_script_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    summary.ready_integration_count + summary.attention_integration_count !==
    summary.integration_count
  ) {
    throw new ContractError(`${context}: invalid foundation integration count`);
  }
  if (summary.stage_status === "ready" && summary.attention_integration_count !== 0) {
    throw new ContractError(`${context}: ready foundation summary has attention checks`);
  }
  if (summary.stage_status === "attention" && summary.attention_integration_count === 0) {
    throw new ContractError(`${context}: attention foundation summary has no attention checks`);
  }
  if (summary.first_verification_script !== null) {
    assertSafeDevScript(summary.first_verification_script, context);
  }
}

function assertFoundationIntegrationReadinessListSafe(readiness, context) {
  if (!Array.isArray(readiness) || readiness.length === 0) {
    throw new ContractError(`${context}: foundation integration readiness is required`);
  }
  for (const item of readiness) assertFoundationIntegrationReadinessSafe(item, context);
}

function assertFoundationIntegrationReadinessSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: invalid foundation integration readiness`);
  }
  if (item.schema !== "iris_foundation_preflight_integration_readiness_v1") {
    throw new ContractError(`${context}: invalid foundation integration readiness schema`);
  }
  if (
    ![
      "validated_runtime_bridge_handoff",
      "real_tts_engine",
      "real_live2d_bridge",
      "production_obs_overlay",
    ].includes(item.integration)
  ) {
    throw new ContractError(`${context}: invalid foundation integration`);
  }
  if (!["ready", "attention"].includes(item.status)) {
    throw new ContractError(`${context}: invalid foundation integration status`);
  }
  assertSafeReadinessState(item.readiness_state, context);
  if (
    item.readiness_state !== readinessStateForIntegration(item)
  ) {
    throw new ContractError(`${context}: invalid foundation integration readiness state`);
  }
  if (typeof item.mode !== "string" || !/^[a-z0-9_]+$/.test(item.mode)) {
    throw new ContractError(`${context}: invalid foundation integration mode`);
  }
}

function buildNextStep(step) {
  return {
    schema: "iris_foundation_preflight_next_step_v1",
    sequence_order: step.sequence_order,
    process_id: step.process_id,
    launch_readiness_status: step.launch_readiness_status,
    readiness_state: readinessStateForLaunchStep(step),
    launch_script: step.launch_script,
    readiness_script: step.readiness_script,
    missing_required_env: step.missing_required_env,
  };
}

function assertFoundationNextStepSafe(step, context) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: next step is required`);
  }
  if (step.schema !== "iris_foundation_preflight_next_step_v1") {
    throw new ContractError(`${context}: invalid next step schema`);
  }
  assertPositiveInteger(step.sequence_order, `${context}: next step order`);
  assertProcessIdSafe(step.process_id, `${context}: next step process`);
  assertLaunchReadinessStatusSafe(step.launch_readiness_status, context);
  assertSafeReadinessState(step.readiness_state, context);
  if (step.readiness_state !== readinessStateForLaunchStep(step)) {
    throw new ContractError(`${context}: invalid next step readiness state`);
  }
  if (step.launch_readiness_status !== "missing_required_env") {
    throw new ContractError(`${context}: next step must require env attention`);
  }
  assertSafeDevScript(step.launch_script, context);
  assertSafeDevScript(step.readiness_script, context);
  assertEnvNameListSafe(step.missing_required_env, `${context}: next step env`);
  if (step.missing_required_env.length === 0) {
    throw new ContractError(`${context}: next step missing env is required`);
  }
}

function assertFoundationStepSummarySafe(step, context) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: invalid launch step summary`);
  }
  if (step.schema !== "iris_foundation_preflight_step_v1") {
    throw new ContractError(`${context}: invalid launch step summary schema`);
  }
  assertPositiveInteger(step.sequence_order, `${context}: launch step order`);
  assertProcessIdSafe(step.process_id, `${context}: launch step process`);
  assertLaunchReadinessStatusSafe(step.launch_readiness_status, context);
  assertSafeReadinessState(step.readiness_state, context);
  if (step.readiness_state !== readinessStateForLaunchStep(step)) {
    throw new ContractError(`${context}: invalid launch step readiness state`);
  }
  assertSafeDevScript(step.launch_script, context);
  assertSafeDevScript(step.readiness_script, context);
  if (
    !Number.isInteger(step.missing_required_env_count) ||
    step.missing_required_env_count < 0
  ) {
    throw new ContractError(`${context}: invalid missing env count`);
  }
  if (step.launch_readiness_status === "ready" && step.missing_required_env_count !== 0) {
    throw new ContractError(`${context}: ready launch summary has missing env`);
  }
  if (
    step.launch_readiness_status === "missing_required_env" &&
    step.missing_required_env_count === 0
  ) {
    throw new ContractError(`${context}: missing-env launch summary has no missing env`);
  }
}

function readinessStateForLaunchStep(step) {
  if (step.launch_readiness_status === "ready") return "ready";
  return "configuration_waiting";
}

function readinessStateForIntegration(integration) {
  if (integration.status === "ready") return "ready";
  if (integration.integration === "validated_runtime_bridge_handoff") {
    return "configuration_waiting";
  }
  if (
    integration.integration === "real_tts_engine" ||
    integration.integration === "real_live2d_bridge" ||
    integration.integration === "production_obs_overlay"
  ) {
    return "real_device_waiting";
  }
  return "operator_review_required";
}

function assertSafeReadinessState(state, context) {
  if (!READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: readiness state counts are required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness state count`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every(
    (state) => Number(left?.[state] ?? -1) === Number(right?.[state] ?? -2)
  );
}

function assertVerificationSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: verification summary is required`);
  }
  if (summary.schema !== "iris_foundation_preflight_verification_summary_v1") {
    throw new ContractError(`${context}: invalid verification summary schema`);
  }
  if (!["start_next_attention_stage", "all_stages_ready"].includes(summary.plan_status)) {
    throw new ContractError(`${context}: invalid verification plan status`);
  }
  if (summary.next_stage_id !== null && typeof summary.next_stage_id !== "string") {
    throw new ContractError(`${context}: invalid verification next stage`);
  }
  if (
    summary.next_stage_priority !== null &&
    (!Number.isInteger(summary.next_stage_priority) || summary.next_stage_priority < 1)
  ) {
    throw new ContractError(`${context}: invalid verification stage priority`);
  }
  if (summary.first_verification_script !== null) {
    assertSafeDevScript(summary.first_verification_script, context);
  }
  if (
    !Number.isInteger(summary.total_verification_script_count) ||
    summary.total_verification_script_count < 0
  ) {
    throw new ContractError(`${context}: invalid verification script count`);
  }
}

function assertLaunchReadinessStatusSafe(status, context) {
  if (!["ready", "missing_required_env"].includes(status)) {
    throw new ContractError(`${context}: invalid launch readiness status`);
  }
}

function assertSafeDevScript(script, context) {
  if (
    typeof script !== "string" ||
    !/^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      script
    )
  ) {
    throw new ContractError(`${context}: unsafe dev script`);
  }
}

function assertProcessIdSafe(processId, context) {
  if (typeof processId !== "string" || !/^[a-z0-9_]+$/.test(processId)) {
    throw new ContractError(`${context}: invalid process id`);
  }
}

function assertPositiveInteger(value, context) {
  if (!Number.isInteger(value) || value < 1) {
    throw new ContractError(`${context}: invalid positive integer`);
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

function assertNoForbiddenFoundationPreflightFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFoundationPreflightFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FOUNDATION_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe preflight field`, { field, path });
    }
    assertNoForbiddenFoundationPreflightFields(child, context, `${path}.${field}`);
  }
}
