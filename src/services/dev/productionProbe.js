import { ContractError } from "../../core/contracts.js";
import {
  assertIntegrationProbeReportSafe,
  createIntegrationProbeReport,
} from "./integrationProbe.js";
import {
  assertIntegrationStatusSafe,
  createIntegrationStatus,
} from "./integrationStatus.js";
import {
  assertProductionConfigDoctorSafe,
  createProductionConfigDoctor,
} from "./productionConfigDoctor.js";
import {
  assertProductionNextTaskOperatorStartupSummarySafe,
  assertProductionNextTaskGateDiagnosticDetailSafe,
  assertProductionNextTaskReportSafe,
  createProductionNextTaskReport,
} from "./productionNextTask.js";
import {
  assertOperatorLaunchPlanSafe,
  assertProductionReadinessRunbookSafe,
  createProductionReadinessRunbook,
} from "./productionReadinessRunbook.js";
import {
  assertObsBridgeHealthProbeReportSafe,
  createObsBridgeHealthProbeReport,
} from "../../server/obsBridgeSetup.js";

const FORBIDDEN_PRODUCTION_PROBE_FIELDS = new Set([
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
  "raw_error",
  "rawError",
  "raw_job",
  "rawJob",
  "raw_payload",
  "rawPayload",
  "command",
  "command_payload",
  "commandPayload",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "value",
]);

const NEXT_TASK_OVERALL_STATUSES = new Set([
  "continue_priority_tasks",
  "ready_for_live_operation",
]);
const NEXT_TASK_STAGE_IDS = new Set([
  "tts_live2d_obs_foundation",
  "youtube_comments_and_support",
  "memory_and_relationship_persistence",
  "vision_and_safe_game_control",
]);
const STAGE_IDS_BY_PRIORITY = new Map([
  [1, "tts_live2d_obs_foundation"],
  [2, "youtube_comments_and_support"],
  [3, "memory_and_relationship_persistence"],
  [4, "vision_and_safe_game_control"],
]);
const NEXT_TASK_RUNTIME_STATUSES = new Set([
  "ready_for_obs_runtime_handoff",
  "polling_active",
  "active_with_memory_and_relationships",
  "safe_control_active",
]);
const NEXT_TASK_RUNTIME_FLOW_IDS = new Set([
  "runtime_handoff_flow",
  "live_chat_ingest_flow",
  "memory_relationship_lifecycle_flow",
  "safe_action_lifecycle_flow",
]);
const NEXT_TASK_RUNTIME_FLOW_SCHEMAS = new Set([
  "iris_foundation_runtime_handoff_flow_summary_v1",
  "iris_youtube_live_chat_ingest_flow_summary_v1",
  "iris_persistence_memory_relationship_lifecycle_flow_summary_v1",
  "iris_gameplay_safe_action_lifecycle_flow_summary_v1",
]);
const NEXT_TASK_RUNTIME_FLOW_STATUSES = new Set([
  "ready_for_obs_runtime_handoff",
  "runtime_active_with_comments_and_support",
  "memory_and_relationship_active",
  "safe_control_active",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const PRODUCTION_PROBE_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "probe_mode",
  "readiness_status",
  "verification_status",
  "next_readiness_state",
  "readiness_state_counts",
  "next_stage",
  "next_task_summary",
  "fixture_real_readiness_summary",
  "failure_reason_summary",
  "missing_component_summary",
  "blocker_summary",
  "direct_remediation_policy",
  "admin_summary",
  "operator_checklist",
  "audit_event",
  "repeated_blocker_group_summary",
  "verification_plan",
  "operator_launch_plan",
  "stages",
  "summary",
  "production_handoff_summary",
  "recommended_commands",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_PROBE_STAGE_FIELDS = new Set([
  "schema",
  "stage_id",
  "priority",
  "status",
  "readiness_state",
  "readiness_state_counts",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "local_endpoint_policy_summary",
  "checks",
  "verification_scripts",
  "missing_required_env",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_PROBE_CHECK_FIELDS = new Set([
  "schema",
  "integration",
  "status",
  "readiness_state",
  "mode",
  "configured_env",
  "missing_env",
  "runtime_status",
  "auth_configured",
  "local_endpoint_policy",
  "local_endpoint_policy_status",
  "local_endpoint_scope_summary",
  "adapter_probe_status",
  "engine_health_status",
  "engine_health_compatibility",
  "local_bridge_worker_diagnostics",
  "obs_bridge_health_status",
  "obs_bridge_health_compatibility",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "production_probe_report_only",
  "real_processes_not_started_by_probe",
  "live_polling_not_started_by_probe",
  "real_game_or_os_input_not_started",
  "fixture_post_uses_synthetic_payloads_only",
  "runtime_packets_remain_adapter_gated",
  "memory_and_relationship_candidates_remain_gated",
  "input_action_candidates_never_forwarded_directly",
  "fixture_real_readiness_summary",
  "failure_reason_summary",
  "missing_component_summary",
  "blocker_summary",
  "direct_remediation_policy",
  "admin_summary",
  "operator_checklist",
  "audit_event",
  "repeated_blocker_group_summary",
  "probe_mode",
  "readiness_status",
  "verification_status",
  "next_readiness_state",
  "readiness_state_counts",
  "stage_count",
  "ready_stage_count",
  "attention_stage_count",
  "adapter_probe_attention_count",
  "obs_bridge_health_attention_count",
  "next_stage_id",
  "next_task_stage_id",
  "next_task_status_script",
  "next_task_runtime_verification_script",
  "runtime_handoff_status_script",
  "production_loop_verification_script",
  "postgres_admin_save_preflight_script",
  "admin_review_auth_gate_script",
  "admin_review_validator_run_plan_script",
  "admin_review_private_runner_not_started_by_probe",
  "admin_review_runner_input_not_materialized_by_probe",
]);
const PRODUCTION_PROBE_FIXTURE_REAL_SUMMARY_FIELDS = new Set([
  "schema",
  "probe_mode",
  "fixture_probe_status",
  "real_readiness_status",
  "real_runtime_confirmed",
  "production_ready_allowed",
  "boundary_policy",
]);
const PRODUCTION_PROBE_FAILURE_REASON_SUMMARY_FIELDS = new Set([
  "schema",
  "failure_reason_count",
  "failure_reasons",
  "boundary_policy",
]);
const PRODUCTION_PROBE_MISSING_COMPONENT_SUMMARY_FIELDS = new Set([
  "schema",
  "missing_component_count",
  "components",
  "boundary_policy",
]);
const PRODUCTION_PROBE_MISSING_COMPONENT_FIELDS = new Set([
  "schema",
  "component_label",
  "status",
]);
const PRODUCTION_PROBE_BLOCKER_SUMMARY_FIELDS = new Set([
  "schema",
  "blocker_count",
  "blockers",
  "boundary_policy",
]);
const PRODUCTION_PROBE_BLOCKER_FIELDS = new Set([
  "schema",
  "blocker_label",
  "status",
  "next_safe_action_label",
]);
const PRODUCTION_PROBE_BLOCKER_NEXT_SAFE_ACTION_LABELS = new Set([
  "configure_required_production_settings",
  "start_required_runtime",
  "connect_required_real_device",
  "complete_operator_review",
  "check_adapter_probe_status",
  "check_obs_bridge_status",
  "configure_missing_component",
  "review_blocker_status",
]);
const PRODUCTION_PROBE_DIRECT_REMEDIATION_POLICY_FIELDS = new Set([
  "schema",
  "probe_is_read_only",
  "auto_obs_setting_change_allowed",
  "auto_tts_setting_change_allowed",
  "auto_live2d_setting_change_allowed",
  "auto_command_execution_allowed",
  "boundary_policy",
]);
const PRODUCTION_PROBE_ADMIN_SUMMARY_FIELDS = new Set([
  "schema",
  "ready_count",
  "degraded_count",
  "blocked_count",
  "attention_count",
  "boundary_policy",
]);
const PRODUCTION_PROBE_OPERATOR_CHECKLIST_FIELDS = new Set([
  "schema",
  "check_count",
  "checks",
  "boundary_policy",
]);
const PRODUCTION_PROBE_OPERATOR_CHECK_FIELDS = new Set([
  "schema",
  "check_label",
  "script_name",
  "status",
]);
const PRODUCTION_PROBE_AUDIT_EVENT_FIELDS = new Set([
  "schema",
  "actor_role",
  "audit_action",
  "safe_target",
  "result_status",
  "timestamp_ms",
  "boundary_policy",
]);
const PRODUCTION_PROBE_AUDIT_SAFE_TARGETS = new Set([
  "production_probe",
  "production_preflight",
  "production_readiness",
]);
const PRODUCTION_PROBE_REPEATED_BLOCKER_GROUP_SUMMARY_FIELDS = new Set([
  "schema",
  "group_count",
  "groups",
  "boundary_policy",
]);
const PRODUCTION_PROBE_REPEATED_BLOCKER_GROUP_FIELDS = new Set([
  "schema",
  "component_label",
  "status",
  "count",
]);
const PRODUCTION_PROBE_SAFE_FAILURE_REASON_LABELS = new Set([
  "configuration_missing",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
  "adapter_probe_attention",
  "obs_bridge_attention",
]);
const PRODUCTION_PROBE_NEXT_TASK_SUMMARY_FIELDS = new Set([
  "schema",
  "overall_status",
  "next_priority",
  "next_stage_id",
  "next_status_script",
  "next_verification_script",
  "next_runtime_verification_script",
  "runtime_handoff_status_script",
  "production_loop_verification_script",
  "postgres_admin_save_preflight_script",
  "admin_review_auth_gate_script",
  "admin_review_validator_run_plan_script",
  "admin_review_private_runner_not_started_by_summary",
  "admin_review_runner_input_not_materialized_by_summary",
  "next_startup_checklist_script",
  "next_launch_script",
  "next_readiness_script",
  "next_configure_env",
  "next_expected_runtime_status",
  "next_diagnostic_detail",
  "next_operator_startup_summary",
  "anime_performance_admin_attention_summary",
  "growth_business_admin_attention_summary",
  "ready_gate_count",
  "attention_gate_count",
  "gates",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_PROBE_NEXT_TASK_GATE_SUMMARY_FIELDS = new Set([
  "schema",
  "priority",
  "stage_id",
  "ready",
  "gate_status",
  "stage_status",
  "readiness_state",
  "attention_reason_count",
  "missing_env_count",
  "status_script",
  "launch_plan_script",
  "startup_checklist_script",
  "next_launch_step_id",
  "next_launch_step_order",
  "next_launch_script",
  "next_readiness_script",
  "next_configure_env",
  "runtime_verification_script",
  "expected_runtime_status",
  "runtime_flow_id",
  "runtime_flow_schema",
  "expected_runtime_flow_status",
  "expected_runtime_blocking_stage",
  "runtime_flow_summary_required",
  "runtime_boundary_summary_required",
  "diagnostic_detail",
  "operator_startup_summary",
]);
const PRODUCTION_PROBE_VERIFICATION_PLAN_FIELDS = new Set([
  "schema",
  "plan_status",
  "next_stage_id",
  "next_stage_priority",
  "next_stage_verification_scripts",
  "stage_summaries",
  "total_verification_script_count",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_PROBE_VERIFICATION_STAGE_SUMMARY_FIELDS = new Set([
  "schema",
  "stage_id",
  "priority",
  "status",
  "readiness_state",
  "verification_script_count",
  "first_verification_script",
  "missing_required_env_count",
]);

export async function createProductionProbeReport({
  env = process.env,
  mode = "dry_run",
  fetchImpl = globalThis.fetch,
  generatedAtMs = Date.now(),
} = {}) {
  const probeMode = mode === "fixture_post" ? "fixture_post" : "dry_run";
  const doctor = createProductionConfigDoctor({ env, generatedAtMs });
  const runbook = createProductionReadinessRunbook({ env, generatedAtMs });
  const integrationStatus = createIntegrationStatus({ env, generatedAtMs });
  const nextTask = createProductionNextTaskReport({ env, generatedAtMs });
  const obsBridgeHealth = await createObsBridgeHealthProbeReport({
    env,
    fetchImpl,
    generatedAtMs,
  });
  const adapterProbe = await createIntegrationProbeReport({
    env,
    mode: probeMode,
    fetchImpl,
    generatedAtMs,
  });

  assertProductionConfigDoctorSafe(doctor, "production probe doctor");
  assertProductionReadinessRunbookSafe(runbook, "production probe runbook");
  assertIntegrationStatusSafe(integrationStatus, "production probe integration status");
  assertProductionNextTaskReportSafe(nextTask, "production probe next task");
  assertObsBridgeHealthProbeReportSafe(obsBridgeHealth, "production probe OBS bridge health");
  assertIntegrationProbeReportSafe(adapterProbe, "production probe adapter probe");

  const stages = runbook.stages.map((stage) =>
    summarizeStage({
      stage,
      doctorChecks: doctor.checks,
      integrationStatus,
      obsBridgeHealth,
      adapterProbe,
    })
  );
  const readinessStateCounts = countReadinessStates(stages);
  const localEndpointPolicySummary = summarizeLocalEndpointPolicyAcrossStages(stages);
  const nextTaskSummary = summarizeProductionNextTask(nextTask);
  assertProductionProbeNextTaskSummarySafe(nextTaskSummary, "production probe next task");
  const verificationStatus = summarizeVerificationStatus({
    readinessStatus: runbook.readiness_status,
    adapterProbe,
    obsBridgeHealth,
  });
  const fixtureRealReadinessSummary = createProductionProbeFixtureRealSummary({
    probeMode,
    fixturePassed: verificationStatus === "configured_probe_ready",
    realRuntimeConfirmed: false,
  });
  const failureReasonSummary = createProductionProbeSafeFailureReasonSummary({
    stages,
    adapterProbe,
    obsBridgeHealth,
  });
  const missingComponentSummary = createProductionProbeMissingComponentSummary({
    stages,
  });
  const blockerSummary = createProductionProbeBlockerSummary({
    failureReasonSummary,
    missingComponentSummary,
  });
  const directRemediationPolicy = createProductionProbeDirectRemediationPolicy();
  const adminSummary = createProductionProbeAdminSummary({
    readinessStateCounts,
    blockerSummary,
    verificationStatus,
  });
  const operatorChecklist = createProductionProbeOperatorChecklist({
    nextTaskSummary,
  });
  const auditEvent = createProductionProbeReadinessAuditEvent({
    generatedAtMs,
    verificationStatus,
  });
  const repeatedBlockerGroupSummary = createProductionProbeRepeatedBlockerGroupSummary({
    blockers: blockerSummary.blockers,
  });

  const report = {
    schema: "iris_production_probe_report_v1",
    generated_at_ms: generatedAtMs,
    probe_mode: probeMode,
    readiness_status: runbook.readiness_status,
    verification_status: verificationStatus,
    next_readiness_state: firstReadinessState(stages),
    readiness_state_counts: readinessStateCounts,
    next_stage: runbook.next_stage,
    next_task_summary: nextTaskSummary,
    fixture_real_readiness_summary: fixtureRealReadinessSummary,
    failure_reason_summary: failureReasonSummary,
    missing_component_summary: missingComponentSummary,
    blocker_summary: blockerSummary,
    direct_remediation_policy: directRemediationPolicy,
    admin_summary: adminSummary,
    operator_checklist: operatorChecklist,
    audit_event: auditEvent,
    repeated_blocker_group_summary: repeatedBlockerGroupSummary,
    verification_plan: runbook.verification_plan,
    operator_launch_plan: runbook.operator_launch_plan,
    stages,
    summary: {
      stage_count: runbook.summary.stage_count,
      ready_stage_count: runbook.summary.ready_stage_count,
      attention_stage_count: runbook.summary.attention_stage_count,
      ready_check_count: doctor.summary.ready,
      attention_check_count: doctor.summary.attention,
      configured_integration_count: integrationStatus.summary.configured,
      local_integration_count: integrationStatus.summary.local,
      adapter_probe_pass_count: adapterProbe.summary.pass,
      adapter_probe_attention_count: adapterProbe.summary.attention,
      adapter_probe_ready_count: adapterProbe.summary.ready_for_fixture_probe,
      engine_health_pass_count: adapterProbe.summary.engine_health_pass,
      engine_health_attention_count: adapterProbe.summary.engine_health_attention,
      engine_health_missing_endpoint_count: adapterProbe.summary.engine_health_missing_endpoint,
      engine_health_request_schema_compatible_count:
        adapterProbe.summary.engine_health_request_schema_compatible,
      engine_health_request_schema_mismatch_count:
        adapterProbe.summary.engine_health_request_schema_mismatch,
      engine_health_engine_ready_count: adapterProbe.summary.engine_health_engine_ready,
      engine_health_engine_attention_count: adapterProbe.summary.engine_health_engine_attention,
      engine_health_engine_readiness_not_declared_count:
        adapterProbe.summary.engine_health_engine_readiness_not_declared,
      engine_health_response_shape_compatible_count:
        adapterProbe.summary.engine_health_response_shape_compatible,
      engine_health_response_shape_mismatch_count:
        adapterProbe.summary.engine_health_response_shape_mismatch,
      engine_health_output_format_compatible_count:
        adapterProbe.summary.engine_health_output_format_compatible,
      engine_health_output_format_mismatch_count:
        adapterProbe.summary.engine_health_output_format_mismatch,
      engine_health_output_format_not_declared_count:
        adapterProbe.summary.engine_health_output_format_not_declared,
      engine_health_cue_schema_compatible_count:
        adapterProbe.summary.engine_health_cue_schema_compatible,
      engine_health_cue_schema_mismatch_count:
        adapterProbe.summary.engine_health_cue_schema_mismatch,
      engine_health_cue_schema_not_declared_count:
        adapterProbe.summary.engine_health_cue_schema_not_declared,
      obs_bridge_health_pass_count: obsBridgeHealth.summary.pass,
      obs_bridge_health_attention_count: obsBridgeHealth.summary.attention,
      obs_bridge_health_missing_endpoint_count:
        obsBridgeHealth.summary.health_endpoint_not_configured,
      obs_bridge_health_setup_schema_compatible_count:
        obsBridgeHealth.summary.setup_schema_compatible,
      obs_bridge_health_setup_schema_mismatch_count:
        obsBridgeHealth.summary.setup_schema_mismatch,
      obs_bridge_health_bridge_ready_count: obsBridgeHealth.summary.bridge_ready,
      obs_bridge_health_bridge_attention_count: obsBridgeHealth.summary.bridge_attention,
      obs_bridge_health_bridge_readiness_not_declared_count:
        obsBridgeHealth.summary.bridge_readiness_not_declared,
      obs_bridge_health_ack_shape_compatible_count:
        obsBridgeHealth.summary.ack_shape_compatible,
      obs_bridge_health_ack_shape_mismatch_count:
        obsBridgeHealth.summary.ack_shape_mismatch,
      local_endpoint_policy_applicable_check_count:
        localEndpointPolicySummary.applicable_check_count,
      local_endpoint_policy_all_allowed_check_count:
        localEndpointPolicySummary.all_allowed_check_count,
      local_endpoint_policy_not_configured_check_count:
        localEndpointPolicySummary.not_configured_check_count,
      local_endpoint_policy_blocked_check_count:
        localEndpointPolicySummary.blocked_check_count,
      local_endpoint_policy_not_applicable_check_count:
        localEndpointPolicySummary.not_applicable_check_count,
      local_endpoint_scope_counts: localEndpointPolicySummary.scope_counts,
      next_task_ready_gate_count: nextTaskSummary.ready_gate_count,
      next_task_attention_gate_count: nextTaskSummary.attention_gate_count,
      readiness_state_counts: readinessStateCounts,
    },
    production_handoff_summary: {
      schema: "iris_production_probe_handoff_summary_v1",
      production_probe_report_only: true,
      real_processes_not_started_by_probe: true,
      live_polling_not_started_by_probe: true,
      real_game_or_os_input_not_started: true,
      fixture_post_uses_synthetic_payloads_only: true,
      runtime_packets_remain_adapter_gated: true,
      memory_and_relationship_candidates_remain_gated: true,
      input_action_candidates_never_forwarded_directly: true,
      fixture_real_readiness_summary: fixtureRealReadinessSummary,
      failure_reason_summary: failureReasonSummary,
      missing_component_summary: missingComponentSummary,
      blocker_summary: blockerSummary,
      direct_remediation_policy: directRemediationPolicy,
      admin_summary: adminSummary,
      operator_checklist: operatorChecklist,
      audit_event: auditEvent,
      repeated_blocker_group_summary: repeatedBlockerGroupSummary,
      probe_mode: probeMode,
      readiness_status: runbook.readiness_status,
      verification_status: verificationStatus,
      next_readiness_state: firstReadinessState(stages),
      readiness_state_counts: readinessStateCounts,
      stage_count: runbook.summary.stage_count,
      ready_stage_count: runbook.summary.ready_stage_count,
      attention_stage_count: runbook.summary.attention_stage_count,
      adapter_probe_attention_count: adapterProbe.summary.attention,
      obs_bridge_health_attention_count: obsBridgeHealth.summary.attention,
      next_stage_id: runbook.next_stage,
      next_task_stage_id: nextTaskSummary.next_stage_id,
      next_task_status_script: nextTaskSummary.next_status_script,
      next_task_runtime_verification_script:
        nextTaskSummary.next_runtime_verification_script,
      runtime_handoff_status_script:
        nextTaskSummary.runtime_handoff_status_script,
      production_loop_verification_script:
        nextTaskSummary.production_loop_verification_script,
      postgres_admin_save_preflight_script:
        nextTaskSummary.postgres_admin_save_preflight_script,
      admin_review_auth_gate_script:
        nextTaskSummary.admin_review_auth_gate_script,
      admin_review_validator_run_plan_script:
        nextTaskSummary.admin_review_validator_run_plan_script,
      admin_review_private_runner_not_started_by_probe: true,
      admin_review_runner_input_not_materialized_by_probe: true,
    },
    recommended_commands: doctor.recommended_commands,
    boundary_policy: {
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_probe_report: true,
      fixture_post_uses_synthetic_payloads_only: true,
    },
    adapter_validation_required: true,
  };
  assertProductionProbeReportSafe(report);
  return report;
}

export function assertProductionProbeReportSafe(
  report,
  context = "production probe report"
) {
  if (!report || typeof report !== "object") {
    throw new ContractError(`${context}: missing report`);
  }
  assertNoForbiddenProductionProbeFields(report, context);
  for (const field of Object.keys(report)) {
    if (!PRODUCTION_PROBE_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`);
    }
  }
  if (report.schema !== "iris_production_probe_report_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: report.schema });
  }
  if (!["dry_run", "fixture_post"].includes(report.probe_mode)) {
    throw new ContractError(`${context}: invalid probe mode`, { probe_mode: report.probe_mode });
  }
  if (
    !["ready_for_configured_production_probe", "attention_required"].includes(
      report.readiness_status
    )
  ) {
    throw new ContractError(`${context}: invalid readiness status`, {
      readiness_status: report.readiness_status,
    });
  }
  if (
    ![
      "configuration_attention",
      "configured_probe_attention",
      "configured_probe_ready",
    ].includes(report.verification_status)
  ) {
    throw new ContractError(`${context}: invalid verification status`, {
      verification_status: report.verification_status,
    });
  }
  if (!READINESS_STATES.has(report.next_readiness_state)) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  assertReadinessStateCountsSafe(
    report.readiness_state_counts,
    `${context}: readiness state counts`
  );
  if (!Array.isArray(report.stages) || report.stages.length === 0) {
    throw new ContractError(`${context}: stages are required`);
  }
  if (
    report.next_readiness_state !== firstReadinessState(report.stages) ||
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      countReadinessStates(report.stages)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state summary`);
  }
  if (report.stages.length !== STAGE_IDS_BY_PRIORITY.size) {
    throw new ContractError(`${context}: stage count mismatch`);
  }
  const stageIds = new Set();
  const stagePriorities = new Set();
  for (const stage of report.stages) {
    if (stageIds.has(stage.stage_id) || stagePriorities.has(stage.priority)) {
      throw new ContractError(`${context}: duplicate stage summary`);
    }
    stageIds.add(stage.stage_id);
    stagePriorities.add(stage.priority);
    if (STAGE_IDS_BY_PRIORITY.get(stage.priority) !== stage.stage_id) {
      throw new ContractError(`${context}: stage priority mismatch`);
    }
  }
  for (const stageId of NEXT_TASK_STAGE_IDS) {
    if (!stageIds.has(stageId)) {
      throw new ContractError(`${context}: missing stage summary`);
    }
  }
  assertProductionProbeNextTaskSummarySafe(report.next_task_summary, context);
  assertProductionProbeVerificationPlanSafe(report.verification_plan, context);
  assertProductionProbeVerificationPlanMatchesReport(
    report.verification_plan,
    report,
    context
  );
  assertOperatorLaunchPlanSafe(report.operator_launch_plan, context);
  assertProductionProbeHandoffSummarySafe(
    report.production_handoff_summary,
    report,
    context
  );
  assertProductionProbeFixtureRealSummarySafe(
    report.fixture_real_readiness_summary,
    `${context}: fixture real readiness summary`
  );
  assertProductionProbeSafeFailureReasonSummarySafe(
    report.failure_reason_summary,
    `${context}: failure reason summary`
  );
  assertProductionProbeMissingComponentSummarySafe(
    report.missing_component_summary,
    `${context}: missing component summary`
  );
  assertProductionProbeBlockerSummarySafe(
    report.blocker_summary,
    `${context}: blocker summary`
  );
  assertProductionProbeDirectRemediationPolicySafe(
    report.direct_remediation_policy,
    `${context}: direct remediation policy`
  );
  assertProductionProbeAdminSummarySafe(
    report.admin_summary,
    `${context}: admin summary`
  );
  assertProductionProbeOperatorChecklistSafe(
    report.operator_checklist,
    `${context}: operator checklist`
  );
  assertProductionProbeReadinessAuditEventSafe(
    report.audit_event,
    `${context}: audit event`
  );
  assertProductionProbeRepeatedBlockerGroupSummarySafe(
    report.repeated_blocker_group_summary,
    `${context}: repeated blocker group summary`
  );
  for (const stage of report.stages) assertProductionProbeStageSafe(stage, context);
  assertProductionProbeSummarySafe(report.summary, report, context);
  assertBoundaryPolicy(report.boundary_policy, [
    "env_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_raw_payloads",
    "no_candidates",
    "no_commands",
    "read_only_probe_report",
    "fixture_post_uses_synthetic_payloads_only",
  ], context);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

export function createProductionProbeFixtureRealSummary({
  probeMode = "dry_run",
  fixturePassed = false,
  realRuntimeConfirmed = false,
} = {}) {
  const safeProbeMode = probeMode === "fixture_post" ? "fixture_post" : "dry_run";
  const realConfirmed = realRuntimeConfirmed === true;
  const summary = {
    schema: "iris_production_probe_fixture_real_summary_v1",
    probe_mode: safeProbeMode,
    fixture_probe_status:
      safeProbeMode === "fixture_post" && fixturePassed === true
        ? "fixture_pass"
        : "fixture_not_ready",
    real_readiness_status: realConfirmed ? "real_ready" : "real_blocked",
    real_runtime_confirmed: realConfirmed,
    production_ready_allowed: realConfirmed,
    boundary_policy: {
      fixture_and_real_readiness_separated: true,
      fixture_probe_not_production_ready: true,
      real_runtime_required_for_production_ready: true,
      no_readiness_sweetening: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertProductionProbeFixtureRealSummarySafe(summary);
  return summary;
}

export function assertProductionProbeFixtureRealSummarySafe(
  summary,
  context = "production probe fixture real summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionProbeFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_PROBE_FIXTURE_REAL_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.schema !== "iris_production_probe_fixture_real_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["dry_run", "fixture_post"].includes(summary.probe_mode)) {
    throw new ContractError(`${context}: invalid probe mode`);
  }
  if (!["fixture_pass", "fixture_not_ready"].includes(summary.fixture_probe_status)) {
    throw new ContractError(`${context}: invalid fixture probe status`);
  }
  if (!["real_ready", "real_blocked"].includes(summary.real_readiness_status)) {
    throw new ContractError(`${context}: invalid real readiness status`);
  }
  if (typeof summary.real_runtime_confirmed !== "boolean") {
    throw new ContractError(`${context}: invalid real runtime flag`);
  }
  if (typeof summary.production_ready_allowed !== "boolean") {
    throw new ContractError(`${context}: invalid production ready flag`);
  }
  if (
    summary.production_ready_allowed !== summary.real_runtime_confirmed ||
    (summary.real_readiness_status === "real_ready") !==
      summary.real_runtime_confirmed
  ) {
    throw new ContractError(`${context}: production ready requires real runtime`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "fixture_and_real_readiness_separated",
    "fixture_probe_not_production_ready",
    "real_runtime_required_for_production_ready",
    "no_readiness_sweetening",
    "no_secret_values",
    "no_endpoint_values",
    "no_payloads",
    "no_candidates",
    "no_commands",
  ], context);
}

export function createProductionProbeSafeFailureReasonSummary({
  stages = [],
  adapterProbe = null,
  obsBridgeHealth = null,
} = {}) {
  const labels = new Set();
  for (const stage of Array.isArray(stages) ? stages : []) {
    if (!stage || stage.status === "ready") continue;
    if (stage.readiness_state === "configuration_waiting") {
      labels.add("configuration_missing");
    } else if (PRODUCTION_PROBE_SAFE_FAILURE_REASON_LABELS.has(stage.readiness_state)) {
      labels.add(stage.readiness_state);
    }
  }
  if (Number(adapterProbe?.summary?.attention ?? 0) > 0) {
    labels.add("adapter_probe_attention");
  }
  if (Number(obsBridgeHealth?.summary?.attention ?? 0) > 0) {
    labels.add("obs_bridge_attention");
  }
  const failureReasons = [...labels].sort();
  const summary = {
    schema: "iris_production_probe_failure_reason_summary_v1",
    failure_reason_count: failureReasons.length,
    failure_reasons: failureReasons,
    boundary_policy: {
      fixed_labels_only: true,
      no_raw_error_body: true,
      no_raw_commands: true,
      no_raw_paths: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
    },
  };
  assertProductionProbeSafeFailureReasonSummarySafe(summary);
  return summary;
}

export function assertProductionProbeSafeFailureReasonSummarySafe(
  summary,
  context = "production probe failure reason summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionProbeFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_PROBE_FAILURE_REASON_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.schema !== "iris_production_probe_failure_reason_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!Array.isArray(summary.failure_reasons)) {
    throw new ContractError(`${context}: failure reasons must be an array`);
  }
  if (
    !Number.isInteger(summary.failure_reason_count) ||
    summary.failure_reason_count !== summary.failure_reasons.length
  ) {
    throw new ContractError(`${context}: invalid failure reason count`);
  }
  for (const label of summary.failure_reasons) {
    if (!PRODUCTION_PROBE_SAFE_FAILURE_REASON_LABELS.has(label)) {
      throw new ContractError(`${context}: unsafe failure reason label`);
    }
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "fixed_labels_only",
    "no_raw_error_body",
    "no_raw_commands",
    "no_raw_paths",
    "no_secret_values",
    "no_endpoint_values",
    "no_payloads",
  ], context);
}

export function createProductionProbeMissingComponentSummary({ stages = [] } = {}) {
  const componentByLabel = new Map();
  for (const stage of Array.isArray(stages) ? stages : []) {
    for (const check of Array.isArray(stage?.checks) ? stage.checks : []) {
      if (check?.readiness_state !== "configuration_waiting") continue;
      const componentLabel = safeComponentLabel(check.integration);
      if (!componentLabel) continue;
      componentByLabel.set(componentLabel, {
        schema: "iris_production_probe_missing_component_v1",
        component_label: componentLabel,
        status: "missing",
      });
    }
  }
  const components = [...componentByLabel.values()].sort((left, right) =>
    left.component_label.localeCompare(right.component_label)
  );
  const summary = {
    schema: "iris_production_probe_missing_component_summary_v1",
    missing_component_count: components.length,
    components,
    boundary_policy: {
      component_labels_and_status_only: true,
      no_config_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
    },
  };
  assertProductionProbeMissingComponentSummarySafe(summary);
  return summary;
}

export function assertProductionProbeMissingComponentSummarySafe(
  summary,
  context = "production probe missing component summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionProbeFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_PROBE_MISSING_COMPONENT_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.schema !== "iris_production_probe_missing_component_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!Array.isArray(summary.components)) {
    throw new ContractError(`${context}: components must be an array`);
  }
  if (
    !Number.isInteger(summary.missing_component_count) ||
    summary.missing_component_count !== summary.components.length
  ) {
    throw new ContractError(`${context}: invalid missing component count`);
  }
  const labels = new Set();
  for (const component of summary.components) {
    assertProductionProbeMissingComponentSafe(component, context);
    if (labels.has(component.component_label)) {
      throw new ContractError(`${context}: duplicate component label`);
    }
    labels.add(component.component_label);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "component_labels_and_status_only",
    "no_config_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_payloads",
  ], context);
}

function assertProductionProbeMissingComponentSafe(component, context) {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    throw new ContractError(`${context}: component is required`);
  }
  assertNoForbiddenProductionProbeFields(component, context);
  for (const field of Object.keys(component)) {
    if (!PRODUCTION_PROBE_MISSING_COMPONENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected component field ${field}`);
    }
  }
  if (component.schema !== "iris_production_probe_missing_component_v1") {
    throw new ContractError(`${context}: invalid component schema`);
  }
  if (component.component_label !== safeComponentLabel(component.component_label)) {
    throw new ContractError(`${context}: invalid component label`);
  }
  if (component.status !== "missing") {
    throw new ContractError(`${context}: invalid component status`);
  }
}

export function createProductionProbeBlockerSummary({
  failureReasonSummary = null,
  missingComponentSummary = null,
} = {}) {
  if (failureReasonSummary) {
    assertProductionProbeSafeFailureReasonSummarySafe(
      failureReasonSummary,
      "production probe blocker failure reasons"
    );
  }
  if (missingComponentSummary) {
    assertProductionProbeMissingComponentSummarySafe(
      missingComponentSummary,
      "production probe blocker missing components"
    );
  }
  const blockersByLabel = new Map();
  for (const reason of failureReasonSummary?.failure_reasons ?? []) {
    const blockerLabel = safeBlockerLabel(reason);
    if (blockerLabel) {
      blockersByLabel.set(blockerLabel, {
        schema: "iris_production_probe_blocker_v1",
        blocker_label: blockerLabel,
        status: "blocked",
        next_safe_action_label: safeBlockerNextActionLabel(blockerLabel),
      });
    }
  }
  for (const component of missingComponentSummary?.components ?? []) {
    const blockerLabel = safeBlockerLabel(`missing_${component.component_label}`);
    if (blockerLabel) {
      blockersByLabel.set(blockerLabel, {
        schema: "iris_production_probe_blocker_v1",
        blocker_label: blockerLabel,
        status: "blocked",
        next_safe_action_label: safeBlockerNextActionLabel(blockerLabel),
      });
    }
  }
  const blockers = [...blockersByLabel.values()].sort((left, right) =>
    left.blocker_label.localeCompare(right.blocker_label)
  );
  const summary = {
    schema: "iris_production_probe_blocker_summary_v1",
    blocker_count: blockers.length,
    blockers,
    boundary_policy: {
      safe_count_and_list_only: true,
      no_raw_logs: true,
      no_raw_error_body: true,
      no_raw_commands: true,
      no_raw_paths: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      next_safe_action_label_only: true,
    },
  };
  assertProductionProbeBlockerSummarySafe(summary);
  return summary;
}

export function assertProductionProbeBlockerSummarySafe(
  summary,
  context = "production probe blocker summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionProbeFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_PROBE_BLOCKER_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.schema !== "iris_production_probe_blocker_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!Array.isArray(summary.blockers)) {
    throw new ContractError(`${context}: blockers must be an array`);
  }
  if (
    !Number.isInteger(summary.blocker_count) ||
    summary.blocker_count !== summary.blockers.length
  ) {
    throw new ContractError(`${context}: invalid blocker count`);
  }
  const labels = new Set();
  for (const blocker of summary.blockers) {
    assertProductionProbeBlockerSafe(blocker, context);
    if (labels.has(blocker.blocker_label)) {
      throw new ContractError(`${context}: duplicate blocker label`);
    }
    labels.add(blocker.blocker_label);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "safe_count_and_list_only",
    "no_raw_logs",
    "no_raw_error_body",
    "no_raw_commands",
    "no_raw_paths",
    "no_secret_values",
    "no_endpoint_values",
    "no_payloads",
    "next_safe_action_label_only",
  ], context);
}

function assertProductionProbeBlockerSafe(blocker, context) {
  if (!blocker || typeof blocker !== "object" || Array.isArray(blocker)) {
    throw new ContractError(`${context}: blocker is required`);
  }
  assertNoForbiddenProductionProbeFields(blocker, context);
  for (const field of Object.keys(blocker)) {
    if (!PRODUCTION_PROBE_BLOCKER_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected blocker field ${field}`);
    }
  }
  if (blocker.schema !== "iris_production_probe_blocker_v1") {
    throw new ContractError(`${context}: invalid blocker schema`);
  }
  if (blocker.blocker_label !== safeBlockerLabel(blocker.blocker_label)) {
    throw new ContractError(`${context}: invalid blocker label`);
  }
  if (blocker.status !== "blocked") {
    throw new ContractError(`${context}: invalid blocker status`);
  }
  if (!PRODUCTION_PROBE_BLOCKER_NEXT_SAFE_ACTION_LABELS.has(blocker.next_safe_action_label)) {
    throw new ContractError(`${context}: invalid blocker next safe action`);
  }
}

export function createProductionProbeDirectRemediationPolicy() {
  const policy = {
    schema: "iris_production_probe_direct_remediation_policy_v1",
    probe_is_read_only: true,
    auto_obs_setting_change_allowed: false,
    auto_tts_setting_change_allowed: false,
    auto_live2d_setting_change_allowed: false,
    auto_command_execution_allowed: false,
    boundary_policy: {
      read_only_probe_result: true,
      no_auto_obs_mutation: true,
      no_auto_tts_mutation: true,
      no_auto_live2d_mutation: true,
      no_command_execution: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
    },
  };
  assertProductionProbeDirectRemediationPolicySafe(policy);
  return policy;
}

export function assertProductionProbeDirectRemediationPolicySafe(
  policy,
  context = "production probe direct remediation policy"
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: policy is required`);
  }
  assertNoForbiddenProductionProbeFields(policy, context);
  for (const field of Object.keys(policy)) {
    if (!PRODUCTION_PROBE_DIRECT_REMEDIATION_POLICY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (policy.schema !== "iris_production_probe_direct_remediation_policy_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (policy.probe_is_read_only !== true) {
    throw new ContractError(`${context}: probe must be read only`);
  }
  for (const field of [
    "auto_obs_setting_change_allowed",
    "auto_tts_setting_change_allowed",
    "auto_live2d_setting_change_allowed",
    "auto_command_execution_allowed",
  ]) {
    if (policy[field] !== false) {
      throw new ContractError(`${context}: direct remediation must be disabled`);
    }
  }
  assertBoundaryPolicy(policy.boundary_policy, [
    "read_only_probe_result",
    "no_auto_obs_mutation",
    "no_auto_tts_mutation",
    "no_auto_live2d_mutation",
    "no_command_execution",
    "no_secret_values",
    "no_endpoint_values",
    "no_payloads",
  ], context);
}

export function createProductionProbeAdminSummary({
  readinessStateCounts = {},
  blockerSummary = null,
  verificationStatus = "configuration_attention",
} = {}) {
  assertReadinessStateCountsSafe(
    readinessStateCounts,
    "production probe admin summary readiness counts"
  );
  if (blockerSummary) {
    assertProductionProbeBlockerSummarySafe(
      blockerSummary,
      "production probe admin summary blockers"
    );
  }
  const attentionCount =
    readinessStateCounts.configuration_waiting +
    readinessStateCounts.runtime_waiting +
    readinessStateCounts.real_device_waiting +
    readinessStateCounts.operator_review_required;
  const summary = {
    schema: "iris_production_probe_admin_summary_v1",
    ready_count: readinessStateCounts.ready,
    degraded_count: verificationStatus === "configured_probe_attention" ? 1 : 0,
    blocked_count: blockerSummary?.blocker_count ?? 0,
    attention_count: attentionCount,
    boundary_policy: {
      counts_only: true,
      no_raw_diagnostics: true,
      no_raw_payloads: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertProductionProbeAdminSummarySafe(summary);
  return summary;
}

export function createAdminProductionReadinessFixture({
  readinessStateCounts = {
    ready: 0,
    configuration_waiting: 1,
    runtime_waiting: 1,
    real_device_waiting: 1,
    operator_review_required: 1,
  },
  blockerSummary = null,
  verificationStatus = "configuration_attention",
} = {}) {
  const dashboardSummary = createProductionProbeAdminSummary({
    readinessStateCounts,
    blockerSummary,
    verificationStatus,
  });
  assertProductionProbeAdminSummarySafe(dashboardSummary);
  return {
    schema: "iris_admin_production_readiness_fixture_v1",
    dashboard_summary: dashboardSummary,
    safe_dashboard_summary_only: true,
    boundary_policy: {
      dashboard_summary_only: true,
      no_raw_sensitive_fields: true,
      no_raw_diagnostics: true,
      no_raw_payloads: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
}

export function assertAdminProductionReadinessFixtureSafe(
  fixture,
  context = "admin production readiness fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  assertNoForbiddenProductionProbeFields(fixture, context);
  const allowedFields = new Set([
    "schema",
    "dashboard_summary",
    "safe_dashboard_summary_only",
    "boundary_policy",
    "adapter_validation_required",
  ]);
  for (const field of Object.keys(fixture)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field ${field}`);
    }
  }
  if (
    fixture.schema !== "iris_admin_production_readiness_fixture_v1" ||
    fixture.safe_dashboard_summary_only !== true ||
    fixture.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  assertProductionProbeAdminSummarySafe(fixture.dashboard_summary, context);
  assertBoundaryPolicy(fixture.boundary_policy, [
    "dashboard_summary_only",
    "no_raw_sensitive_fields",
    "no_raw_diagnostics",
    "no_raw_payloads",
    "no_secret_values",
    "no_endpoint_values",
    "no_candidates",
    "no_commands",
  ], context);
}

export function assertProductionProbeAdminSummarySafe(
  summary,
  context = "production probe admin summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionProbeFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_PROBE_ADMIN_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.schema !== "iris_production_probe_admin_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of [
    "ready_count",
    "degraded_count",
    "blocked_count",
    "attention_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_only",
    "no_raw_diagnostics",
    "no_raw_payloads",
    "no_secret_values",
    "no_endpoint_values",
    "no_candidates",
    "no_commands",
  ], context);
}

export function createProductionProbeOperatorChecklist({ nextTaskSummary = {} } = {}) {
  const candidates = [
    ["status_check", nextTaskSummary.next_status_script],
    ["runtime_verification", nextTaskSummary.next_runtime_verification_script],
    ["runtime_handoff_status", nextTaskSummary.runtime_handoff_status_script],
    ["production_loop_verification", nextTaskSummary.production_loop_verification_script],
    ["postgres_admin_save_preflight", nextTaskSummary.postgres_admin_save_preflight_script],
    ["admin_review_auth_gate", nextTaskSummary.admin_review_auth_gate_script],
    ["admin_review_validator_run_plan", nextTaskSummary.admin_review_validator_run_plan_script],
    ["startup_checklist", nextTaskSummary.next_startup_checklist_script],
    ["launch_check", nextTaskSummary.next_launch_script],
    ["readiness_check", nextTaskSummary.next_readiness_script],
  ];
  const checks = candidates
    .map(([label, script]) => ({
      schema: "iris_production_probe_operator_check_v1",
      check_label: label,
      script_name: safeScriptName(script),
      status: script ? "available" : "not_applicable",
    }))
    .filter((check) => check.script_name !== null || check.status === "not_applicable");
  const checklist = {
    schema: "iris_production_probe_operator_checklist_v1",
    check_count: checks.length,
    checks,
    boundary_policy: {
      safe_labels_and_script_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_paths: true,
      no_payloads: true,
      no_commands: true,
    },
  };
  assertProductionProbeOperatorChecklistSafe(checklist);
  return checklist;
}

export function assertProductionProbeOperatorChecklistSafe(
  checklist,
  context = "production probe operator checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist is required`);
  }
  assertNoForbiddenProductionProbeFields(checklist, context);
  for (const field of Object.keys(checklist)) {
    if (!PRODUCTION_PROBE_OPERATOR_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (checklist.schema !== "iris_production_probe_operator_checklist_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!Array.isArray(checklist.checks)) {
    throw new ContractError(`${context}: checks must be an array`);
  }
  if (
    !Number.isInteger(checklist.check_count) ||
    checklist.check_count !== checklist.checks.length
  ) {
    throw new ContractError(`${context}: invalid check count`);
  }
  for (const check of checklist.checks) {
    assertProductionProbeOperatorCheckSafe(check, context);
  }
  assertBoundaryPolicy(checklist.boundary_policy, [
    "safe_labels_and_script_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_paths",
    "no_payloads",
    "no_commands",
  ], context);
}

function assertProductionProbeOperatorCheckSafe(check, context) {
  if (!check || typeof check !== "object" || Array.isArray(check)) {
    throw new ContractError(`${context}: check is required`);
  }
  assertNoForbiddenProductionProbeFields(check, context);
  for (const field of Object.keys(check)) {
    if (!PRODUCTION_PROBE_OPERATOR_CHECK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected check field ${field}`);
    }
  }
  if (check.schema !== "iris_production_probe_operator_check_v1") {
    throw new ContractError(`${context}: invalid check schema`);
  }
  if (!/^[a-z0-9_]+$/.test(check.check_label)) {
    throw new ContractError(`${context}: invalid check label`);
  }
  if (check.script_name !== null && check.script_name !== safeScriptName(check.script_name)) {
    throw new ContractError(`${context}: invalid script name`);
  }
  if (!["available", "not_applicable"].includes(check.status)) {
    throw new ContractError(`${context}: invalid check status`);
  }
}

export function createProductionProbeReadinessAuditEvent({
  generatedAtMs = Date.now(),
  verificationStatus = "configuration_attention",
  safeTarget = "production_probe",
} = {}) {
  const event = {
    schema: "iris_production_probe_readiness_audit_event_v1",
    actor_role: "system",
    audit_action: "readiness_status_update",
    safe_target: PRODUCTION_PROBE_AUDIT_SAFE_TARGETS.has(safeTarget)
      ? safeTarget
      : "production_probe",
    result_status:
      verificationStatus === "configured_probe_ready" ? "ready" : "attention",
    timestamp_ms: Number.isFinite(Number(generatedAtMs))
      ? Math.trunc(Number(generatedAtMs))
      : 0,
    boundary_policy: {
      safe_audit_fields_only: true,
      no_raw_payloads: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertProductionProbeReadinessAuditEventSafe(event);
  return event;
}

export function assertProductionProbeReadinessAuditEventSafe(
  event,
  context = "production probe readiness audit event"
) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new ContractError(`${context}: event is required`);
  }
  assertNoForbiddenProductionProbeFields(event, context);
  for (const field of Object.keys(event)) {
    if (!PRODUCTION_PROBE_AUDIT_EVENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (event.schema !== "iris_production_probe_readiness_audit_event_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["system", "operator"].includes(event.actor_role)) {
    throw new ContractError(`${context}: invalid actor role`);
  }
  if (event.audit_action !== "readiness_status_update") {
    throw new ContractError(`${context}: invalid audit action`);
  }
  if (!PRODUCTION_PROBE_AUDIT_SAFE_TARGETS.has(event.safe_target)) {
    throw new ContractError(`${context}: invalid safe target`);
  }
  if (!["ready", "attention"].includes(event.result_status)) {
    throw new ContractError(`${context}: invalid result status`);
  }
  if (!Number.isInteger(event.timestamp_ms) || event.timestamp_ms < 0) {
    throw new ContractError(`${context}: invalid timestamp`);
  }
  assertBoundaryPolicy(event.boundary_policy, [
    "safe_audit_fields_only",
    "no_raw_payloads",
    "no_secret_values",
    "no_endpoint_values",
    "no_candidates",
    "no_commands",
  ], context);
}

export function createProductionProbeRepeatedBlockerGroupSummary({
  blockers = [],
} = {}) {
  const groupCounts = new Map();
  for (const blocker of Array.isArray(blockers) ? blockers : []) {
    const componentLabel = safeBlockerLabel(blocker?.blocker_label);
    if (!componentLabel || blocker?.status !== "blocked") continue;
    const key = `${componentLabel}\u0000blocked`;
    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
  }
  const groups = [...groupCounts.entries()]
    .map(([key, count]) => {
      const [componentLabel, status] = key.split("\u0000");
      return {
        schema: "iris_production_probe_repeated_blocker_group_v1",
        component_label: componentLabel,
        status,
        count,
      };
    })
    .sort((left, right) => left.component_label.localeCompare(right.component_label));
  const summary = {
    schema: "iris_production_probe_repeated_blocker_group_summary_v1",
    group_count: groups.length,
    groups,
    boundary_policy: {
      component_status_count_only: true,
      no_raw_error_detail: true,
      no_raw_jobs: true,
      no_raw_logs: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
    },
  };
  assertProductionProbeRepeatedBlockerGroupSummarySafe(summary);
  return summary;
}

export function assertProductionProbeRepeatedBlockerGroupSummarySafe(
  summary,
  context = "production probe repeated blocker group summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  assertNoForbiddenProductionProbeFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_PROBE_REPEATED_BLOCKER_GROUP_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.schema !== "iris_production_probe_repeated_blocker_group_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!Array.isArray(summary.groups)) {
    throw new ContractError(`${context}: groups must be an array`);
  }
  if (!Number.isInteger(summary.group_count) || summary.group_count !== summary.groups.length) {
    throw new ContractError(`${context}: invalid group count`);
  }
  for (const group of summary.groups) {
    assertProductionProbeRepeatedBlockerGroupSafe(group, context);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "component_status_count_only",
    "no_raw_error_detail",
    "no_raw_jobs",
    "no_raw_logs",
    "no_secret_values",
    "no_endpoint_values",
    "no_payloads",
  ], context);
}

function assertProductionProbeRepeatedBlockerGroupSafe(group, context) {
  if (!group || typeof group !== "object" || Array.isArray(group)) {
    throw new ContractError(`${context}: group is required`);
  }
  assertNoForbiddenProductionProbeFields(group, context);
  for (const field of Object.keys(group)) {
    if (!PRODUCTION_PROBE_REPEATED_BLOCKER_GROUP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected group field ${field}`);
    }
  }
  if (group.schema !== "iris_production_probe_repeated_blocker_group_v1") {
    throw new ContractError(`${context}: invalid group schema`);
  }
  if (group.component_label !== safeBlockerLabel(group.component_label)) {
    throw new ContractError(`${context}: invalid component label`);
  }
  if (group.status !== "blocked") {
    throw new ContractError(`${context}: invalid group status`);
  }
  if (!Number.isInteger(group.count) || group.count < 1) {
    throw new ContractError(`${context}: invalid group count`);
  }
}

function assertProductionProbeSummarySafe(summary, report, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  const readyStages = report.stages.filter((stage) => stage.status === "ready").length;
  const attentionStages = report.stages.length - readyStages;
  const readyChecks = report.stages.reduce(
    (sum, stage) => sum + stage.ready_check_count,
    0
  );
  const attentionChecks = report.stages.reduce(
    (sum, stage) => sum + stage.attention_check_count,
    0
  );
  const localEndpointPolicySummary =
    summarizeLocalEndpointPolicyAcrossStages(report.stages);
  for (const [field, value] of Object.entries(summary)) {
    if (field.endsWith("_count") && (!Number.isInteger(value) || value < 0)) {
      throw new ContractError(`${context}: summary ${field} must be a count`);
    }
  }
  const expectedCounts = {
    stage_count: report.stages.length,
    ready_stage_count: readyStages,
    attention_stage_count: attentionStages,
    ready_check_count: readyChecks,
    attention_check_count: attentionChecks,
    local_endpoint_policy_applicable_check_count:
      localEndpointPolicySummary.applicable_check_count,
    local_endpoint_policy_all_allowed_check_count:
      localEndpointPolicySummary.all_allowed_check_count,
    local_endpoint_policy_not_configured_check_count:
      localEndpointPolicySummary.not_configured_check_count,
    local_endpoint_policy_blocked_check_count:
      localEndpointPolicySummary.blocked_check_count,
    local_endpoint_policy_not_applicable_check_count:
      localEndpointPolicySummary.not_applicable_check_count,
    next_task_ready_gate_count: report.next_task_summary.ready_gate_count,
    next_task_attention_gate_count: report.next_task_summary.attention_gate_count,
  };
  for (const [field, expected] of Object.entries(expectedCounts)) {
    if (summary[field] !== expected) {
      throw new ContractError(`${context}: summary ${field} mismatch`);
    }
  }
  if (
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: summary readiness counts mismatch`);
  }
  if (
    JSON.stringify(summary.local_endpoint_scope_counts) !==
    JSON.stringify(localEndpointPolicySummary.scope_counts)
  ) {
    throw new ContractError(`${context}: summary local endpoint scope mismatch`);
  }
}

function assertProductionProbeHandoffSummarySafe(summary, report, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_production_probe_handoff_summary_v1") {
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
    "production_probe_report_only",
    "real_processes_not_started_by_probe",
    "live_polling_not_started_by_probe",
    "real_game_or_os_input_not_started",
    "fixture_post_uses_synthetic_payloads_only",
    "runtime_packets_remain_adapter_gated",
    "memory_and_relationship_candidates_remain_gated",
    "input_action_candidates_never_forwarded_directly",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (summary.probe_mode !== report.probe_mode) {
    throw new ContractError(`${context}: invalid production handoff mode`);
  }
  assertProductionProbeFixtureRealSummarySafe(
    summary.fixture_real_readiness_summary,
    `${context}: handoff fixture real readiness summary`
  );
  if (
    JSON.stringify(summary.fixture_real_readiness_summary) !==
    JSON.stringify(report.fixture_real_readiness_summary)
  ) {
    throw new ContractError(`${context}: invalid handoff fixture real readiness summary`);
  }
  assertProductionProbeSafeFailureReasonSummarySafe(
    summary.failure_reason_summary,
    `${context}: handoff failure reason summary`
  );
  if (
    JSON.stringify(summary.failure_reason_summary) !==
    JSON.stringify(report.failure_reason_summary)
  ) {
    throw new ContractError(`${context}: invalid handoff failure reason summary`);
  }
  assertProductionProbeMissingComponentSummarySafe(
    summary.missing_component_summary,
    `${context}: handoff missing component summary`
  );
  if (
    JSON.stringify(summary.missing_component_summary) !==
    JSON.stringify(report.missing_component_summary)
  ) {
    throw new ContractError(`${context}: invalid handoff missing component summary`);
  }
  assertProductionProbeBlockerSummarySafe(
    summary.blocker_summary,
    `${context}: handoff blocker summary`
  );
  if (
    JSON.stringify(summary.blocker_summary) !==
    JSON.stringify(report.blocker_summary)
  ) {
    throw new ContractError(`${context}: invalid handoff blocker summary`);
  }
  assertProductionProbeDirectRemediationPolicySafe(
    summary.direct_remediation_policy,
    `${context}: handoff direct remediation policy`
  );
  if (
    JSON.stringify(summary.direct_remediation_policy) !==
    JSON.stringify(report.direct_remediation_policy)
  ) {
    throw new ContractError(`${context}: invalid handoff direct remediation policy`);
  }
  assertProductionProbeAdminSummarySafe(
    summary.admin_summary,
    `${context}: handoff admin summary`
  );
  if (
    JSON.stringify(summary.admin_summary) !==
    JSON.stringify(report.admin_summary)
  ) {
    throw new ContractError(`${context}: invalid handoff admin summary`);
  }
  assertProductionProbeOperatorChecklistSafe(
    summary.operator_checklist,
    `${context}: handoff operator checklist`
  );
  if (
    JSON.stringify(summary.operator_checklist) !==
    JSON.stringify(report.operator_checklist)
  ) {
    throw new ContractError(`${context}: invalid handoff operator checklist`);
  }
  assertProductionProbeReadinessAuditEventSafe(
    summary.audit_event,
    `${context}: handoff audit event`
  );
  if (JSON.stringify(summary.audit_event) !== JSON.stringify(report.audit_event)) {
    throw new ContractError(`${context}: invalid handoff audit event`);
  }
  assertProductionProbeRepeatedBlockerGroupSummarySafe(
    summary.repeated_blocker_group_summary,
    `${context}: handoff repeated blocker group summary`
  );
  if (
    JSON.stringify(summary.repeated_blocker_group_summary) !==
    JSON.stringify(report.repeated_blocker_group_summary)
  ) {
    throw new ContractError(`${context}: invalid handoff repeated blocker group summary`);
  }
  if (summary.readiness_status !== report.readiness_status) {
    throw new ContractError(`${context}: invalid production handoff readiness`);
  }
  if (summary.verification_status !== report.verification_status) {
    throw new ContractError(`${context}: invalid production handoff verification`);
  }
  if (summary.next_readiness_state !== report.next_readiness_state) {
    throw new ContractError(`${context}: invalid production handoff readiness state`);
  }
  assertReadinessStateCountsSafe(
    summary.readiness_state_counts,
    `${context}: production handoff readiness counts`
  );
  if (
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: invalid production handoff readiness counts`);
  }
  for (const field of [
    "stage_count",
    "ready_stage_count",
    "attention_stage_count",
    "adapter_probe_attention_count",
    "obs_bridge_health_attention_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid production handoff count`);
    }
  }
  if (
    summary.stage_count !== report.summary.stage_count ||
    summary.ready_stage_count !== report.summary.ready_stage_count ||
    summary.attention_stage_count !== report.summary.attention_stage_count ||
    summary.adapter_probe_attention_count !==
      report.summary.adapter_probe_attention_count ||
    summary.obs_bridge_health_attention_count !==
      report.summary.obs_bridge_health_attention_count
  ) {
    throw new ContractError(`${context}: invalid production handoff totals`);
  }
  if (summary.next_stage_id !== report.next_stage) {
    throw new ContractError(`${context}: invalid production handoff next stage`);
  }
  if (summary.next_task_stage_id !== report.next_task_summary.next_stage_id) {
    throw new ContractError(`${context}: invalid production handoff next task`);
  }
  if (
    summary.next_task_status_script !==
    report.next_task_summary.next_status_script
  ) {
    throw new ContractError(`${context}: invalid production handoff next script`);
  }
  if (
    summary.next_task_runtime_verification_script !==
    report.next_task_summary.next_runtime_verification_script
  ) {
    throw new ContractError(`${context}: invalid production handoff runtime verification script`);
  }
  if (
    summary.runtime_handoff_status_script !==
    report.next_task_summary.runtime_handoff_status_script
  ) {
    throw new ContractError(`${context}: invalid production handoff runtime script`);
  }
  if (
    summary.production_loop_verification_script !==
    report.next_task_summary.production_loop_verification_script
  ) {
    throw new ContractError(`${context}: invalid production handoff loop script`);
  }
  if (
    summary.postgres_admin_save_preflight_script !==
    report.next_task_summary.postgres_admin_save_preflight_script
  ) {
    throw new ContractError(`${context}: invalid production handoff PostgreSQL preflight script`);
  }
  if (
    summary.admin_review_auth_gate_script !==
    report.next_task_summary.admin_review_auth_gate_script
  ) {
    throw new ContractError(`${context}: invalid production handoff Admin Review auth script`);
  }
  if (
    summary.admin_review_validator_run_plan_script !==
    report.next_task_summary.admin_review_validator_run_plan_script
  ) {
    throw new ContractError(`${context}: invalid production handoff Admin Review run plan script`);
  }
  if (
    summary.admin_review_private_runner_not_started_by_probe !== true ||
    summary.admin_review_runner_input_not_materialized_by_probe !== true
  ) {
    throw new ContractError(`${context}: invalid Admin Review production handoff flags`);
  }
  if (
    summary.next_stage_id !== null &&
    !NEXT_TASK_STAGE_IDS.has(summary.next_stage_id)
  ) {
    throw new ContractError(`${context}: invalid production handoff stage`);
  }
  if (
    summary.next_task_stage_id !== null &&
    !NEXT_TASK_STAGE_IDS.has(summary.next_task_stage_id)
  ) {
    throw new ContractError(`${context}: invalid production handoff task stage`);
  }
  if (summary.next_task_status_script !== null) {
    assertSafeVerificationScript(
      summary.next_task_status_script,
      `${context}: next task status script`
    );
  }
  assertSafeVerificationScript(
    summary.runtime_handoff_status_script,
    `${context}: runtime handoff status script`
  );
  assertSafeVerificationScript(
    summary.production_loop_verification_script,
    `${context}: production loop verification script`
  );
  assertSafeVerificationScript(
    summary.postgres_admin_save_preflight_script,
    `${context}: PostgreSQL preflight script`
  );
  assertSafeVerificationScript(
    summary.admin_review_auth_gate_script,
    `${context}: Admin Review auth gate script`
  );
  assertSafeVerificationScript(
    summary.admin_review_validator_run_plan_script,
    `${context}: Admin Review validator run plan script`
  );
}

function summarizeVerificationStatus({ readinessStatus, adapterProbe, obsBridgeHealth }) {
  if (readinessStatus !== "ready_for_configured_production_probe") {
    return "configuration_attention";
  }
  const attentionCount =
    requiredProductionProbeSummaryCount(
      adapterProbe.summary,
      "attention",
      "production probe adapter summary"
    ) +
    requiredProductionProbeSummaryCount(
      adapterProbe.summary,
      "engine_health_attention",
      "production probe adapter summary"
    ) +
    requiredProductionProbeSummaryCount(
      adapterProbe.summary,
      "engine_health_missing_endpoint",
      "production probe adapter summary"
    ) +
    requiredProductionProbeSummaryCount(
      adapterProbe.summary,
      "engine_health_engine_attention",
      "production probe adapter summary"
    ) +
    requiredProductionProbeSummaryCount(
      adapterProbe.summary,
      "engine_health_response_shape_mismatch",
      "production probe adapter summary"
    ) +
    requiredProductionProbeSummaryCount(
      adapterProbe.summary,
      "engine_health_output_format_mismatch",
      "production probe adapter summary"
    ) +
    requiredProductionProbeSummaryCount(
      adapterProbe.summary,
      "engine_health_cue_schema_mismatch",
      "production probe adapter summary"
    ) +
    requiredProductionProbeSummaryCount(
      adapterProbe.summary,
      "engine_health_request_schema_mismatch",
      "production probe adapter summary"
    ) +
    requiredProductionProbeSummaryCount(
      obsBridgeHealth.summary,
      "attention",
      "production probe OBS bridge health summary"
    ) +
    requiredProductionProbeSummaryCount(
      obsBridgeHealth.summary,
      "health_endpoint_not_configured",
      "production probe OBS bridge health summary"
    ) +
    requiredProductionProbeSummaryCount(
      obsBridgeHealth.summary,
      "bridge_attention",
      "production probe OBS bridge health summary"
    ) +
    requiredProductionProbeSummaryCount(
      obsBridgeHealth.summary,
      "setup_schema_mismatch",
      "production probe OBS bridge health summary"
    ) +
    requiredProductionProbeSummaryCount(
      obsBridgeHealth.summary,
      "ack_shape_mismatch",
      "production probe OBS bridge health summary"
    );
  return attentionCount > 0 ? "configured_probe_attention" : "configured_probe_ready";
}

function requiredProductionProbeSummaryCount(summary, field, context) {
  const value = summary?.[field];
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(`${context}: ${field} is required`);
  }
  return value;
}

function summarizeProductionNextTask(nextTask) {
  return {
    schema: "iris_production_probe_next_task_summary_v1",
    overall_status: nextTask.overall_status,
    next_priority: nextTask.next_priority,
    next_stage_id: nextTask.next_stage_id,
    next_status_script: nextTask.next_status_script,
    next_verification_script: nextTask.next_verification_script,
    next_runtime_verification_script: nextTask.next_runtime_verification_script,
    runtime_handoff_status_script: nextTask.runtime_handoff_status_script,
    production_loop_verification_script:
      nextTask.production_loop_verification_script,
    postgres_admin_save_preflight_script:
      nextTask.production_handoff_summary.postgres_admin_save_preflight_script,
    admin_review_auth_gate_script:
      nextTask.production_handoff_summary.admin_review_auth_gate_script,
    admin_review_validator_run_plan_script:
      nextTask.production_handoff_summary.admin_review_validator_run_plan_script,
    admin_review_private_runner_not_started_by_summary:
      nextTask.production_handoff_summary
        .admin_review_private_runner_not_started_by_report,
    admin_review_runner_input_not_materialized_by_summary:
      nextTask.production_handoff_summary
        .admin_review_runner_input_not_materialized_by_report,
    next_startup_checklist_script: nextTask.next_startup_checklist_script,
    next_launch_script: nextTask.next_launch_script,
    next_readiness_script: nextTask.next_readiness_script,
    next_configure_env: nextTask.next_configure_env,
    next_expected_runtime_status: nextTask.next_expected_runtime_status,
    next_diagnostic_detail: nextTask.next_diagnostic_detail,
    next_operator_startup_summary: nextTask.next_operator_startup_summary,
    anime_performance_admin_attention_summary:
      summarizeAnimePerformanceAdminAttention(
        nextTask.anime_performance_admin_attention_summary
      ),
    growth_business_admin_attention_summary:
      summarizeGrowthBusinessAdminAttention(
        nextTask.growth_business_admin_attention_summary
      ),
    ready_gate_count: nextTask.ready_gate_count,
    attention_gate_count: nextTask.attention_gate_count,
    gates: nextTask.priority_gates.map((gate) => ({
      schema: "iris_production_probe_next_task_gate_summary_v1",
      priority: gate.priority,
      stage_id: gate.stage_id,
      ready: gate.ready,
      gate_status: gate.gate_status,
      stage_status: gate.stage_status,
      readiness_state: gate.readiness_state,
      attention_reason_count: gate.attention_reason_count,
      missing_env_count: gate.missing_env_count,
      status_script: gate.status_script,
      launch_plan_script: gate.launch_plan_script,
      startup_checklist_script: gate.startup_checklist_script,
      next_launch_step_id: gate.next_launch_step_id,
      next_launch_step_order: gate.next_launch_step_order,
      next_launch_script: gate.next_launch_script,
      next_readiness_script: gate.next_readiness_script,
      next_configure_env: gate.next_configure_env,
      runtime_verification_script: gate.runtime_verification_script,
      expected_runtime_status: gate.expected_runtime_status,
      runtime_flow_id: gate.runtime_flow_id,
      runtime_flow_schema: gate.runtime_flow_schema,
      expected_runtime_flow_status: gate.expected_runtime_flow_status,
      expected_runtime_blocking_stage: gate.expected_runtime_blocking_stage,
      runtime_flow_summary_required: gate.runtime_flow_summary_required === true,
      runtime_boundary_summary_required: gate.runtime_boundary_summary_required === true,
      diagnostic_detail: gate.diagnostic_detail,
      operator_startup_summary: gate.operator_startup_summary,
    })),
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      read_only_next_task_summary: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeAnimePerformanceAdminAttention(summary) {
  return {
    schema: "iris_production_probe_anime_performance_admin_attention_summary_v1",
    module_id: summary.module_id,
    admin_status: summary.admin_status,
    next_operator_action_id: summary.next_operator_action_id,
    next_attention_area_id: summary.next_attention_area_id,
    next_attention_area_missing_setting_count:
      summary.next_attention_area_missing_setting_count,
    next_safe_script: summary.next_safe_script,
    required_setting_count: summary.required_setting_count,
    configured_setting_count: summary.configured_setting_count,
    missing_setting_count: summary.missing_setting_count,
    voice_license_use_category_setting_count:
      summary.voice_license_use_category_setting_count,
    voice_license_use_category_missing_setting_count:
      summary.voice_license_use_category_missing_setting_count,
  };
}

function summarizeGrowthBusinessAdminAttention(summary) {
  return {
    schema: "iris_production_probe_growth_business_admin_attention_summary_v1",
    module_id: summary.module_id,
    admin_status: summary.admin_status,
    next_operator_action_id: summary.next_operator_action_id,
    next_attention_area_id: summary.next_attention_area_id,
    next_attention_area_missing_setting_count:
      summary.next_attention_area_missing_setting_count,
    next_safe_script: summary.next_safe_script,
    required_setting_count: summary.required_setting_count,
    configured_setting_count: summary.configured_setting_count,
    missing_setting_count: summary.missing_setting_count,
  };
}

function assertProductionProbeNextTaskSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: next task summary is required`);
  }
  if (summary.schema !== "iris_production_probe_next_task_summary_v1") {
    throw new ContractError(`${context}: invalid next task summary schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_PROBE_NEXT_TASK_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected next task summary field ${field}`);
    }
  }
  if (!NEXT_TASK_OVERALL_STATUSES.has(summary.overall_status)) {
    throw new ContractError(`${context}: invalid next task overall status`);
  }
  if (summary.next_priority !== null && ![1, 2, 3, 4].includes(summary.next_priority)) {
    throw new ContractError(`${context}: invalid next task priority`);
  }
  if (summary.next_stage_id !== null && !NEXT_TASK_STAGE_IDS.has(summary.next_stage_id)) {
    throw new ContractError(`${context}: invalid next task stage`);
  }
  for (const field of [
    "next_status_script",
    "next_verification_script",
    "next_runtime_verification_script",
    "runtime_handoff_status_script",
    "production_loop_verification_script",
    "postgres_admin_save_preflight_script",
    "admin_review_auth_gate_script",
    "admin_review_validator_run_plan_script",
    "next_startup_checklist_script",
    "next_launch_script",
    "next_readiness_script",
  ]) {
    if (summary[field] !== null) assertSafeVerificationScript(summary[field], context);
  }
  assertEnvNameListSafe(summary.next_configure_env, `${context}: next configure env`);
  assertProductionProbeAnimePerformanceAdminAttentionSummarySafe(
    summary.anime_performance_admin_attention_summary,
    `${context}: anime performance admin attention`
  );
  assertProductionProbeGrowthBusinessAdminAttentionSummarySafe(
    summary.growth_business_admin_attention_summary,
    `${context}: growth business admin attention`
  );
  if (
    summary.admin_review_private_runner_not_started_by_summary !== true ||
    summary.admin_review_runner_input_not_materialized_by_summary !== true
  ) {
    throw new ContractError(`${context}: invalid Admin Review summary flags`);
  }
  if (
    summary.next_expected_runtime_status !== null &&
    !NEXT_TASK_RUNTIME_STATUSES.has(summary.next_expected_runtime_status)
  ) {
    throw new ContractError(`${context}: invalid next expected runtime status`);
  }
  if (!Array.isArray(summary.gates) || summary.gates.length !== 4) {
    throw new ContractError(`${context}: next task gates are required`);
  }
  summary.gates.forEach((gate, index) =>
    assertProductionProbeNextTaskGateSummarySafe(gate, context, index + 1)
  );
  if (
    summary.ready_gate_count + summary.attention_gate_count !==
    summary.gates.length
  ) {
    throw new ContractError(`${context}: invalid next task gate counts`);
  }
  const firstAttentionGate = summary.gates.find((gate) => gate.ready !== true) ?? null;
  if (!firstAttentionGate) {
    if (
      summary.overall_status !== "ready_for_live_operation" ||
      summary.next_priority !== null ||
      summary.next_stage_id !== null ||
      summary.next_status_script !== null ||
      summary.next_verification_script !== null ||
      summary.next_runtime_verification_script !== null ||
      summary.next_startup_checklist_script !== null ||
      summary.next_launch_script !== null ||
      summary.next_readiness_script !== null ||
      !Array.isArray(summary.next_configure_env) ||
      summary.next_configure_env.length !== 0 ||
      summary.next_expected_runtime_status !== null ||
      summary.next_diagnostic_detail !== null ||
      summary.next_operator_startup_summary !== null ||
      summary.ready_gate_count !== 4 ||
      summary.attention_gate_count !== 0
    ) {
      throw new ContractError(`${context}: invalid ready next task summary`);
    }
  } else if (
    summary.overall_status !== "continue_priority_tasks" ||
    summary.next_priority !== firstAttentionGate.priority ||
    summary.next_stage_id !== firstAttentionGate.stage_id ||
    summary.next_status_script !== firstAttentionGate.status_script ||
    summary.next_launch_script !== firstAttentionGate.next_launch_script ||
    summary.next_readiness_script !== firstAttentionGate.next_readiness_script ||
    JSON.stringify(summary.next_configure_env) !==
      JSON.stringify(firstAttentionGate.next_configure_env) ||
    summary.next_runtime_verification_script !==
      firstAttentionGate.runtime_verification_script ||
    summary.next_startup_checklist_script !==
      firstAttentionGate.startup_checklist_script ||
    summary.next_expected_runtime_status !== firstAttentionGate.expected_runtime_status ||
    JSON.stringify(summary.next_diagnostic_detail) !==
      JSON.stringify(firstAttentionGate.diagnostic_detail) ||
    JSON.stringify(summary.next_operator_startup_summary) !==
      JSON.stringify(firstAttentionGate.operator_startup_summary)
  ) {
    throw new ContractError(`${context}: invalid blocked next task summary`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "env_names_only",
    "script_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_memory_records",
    "no_relationship_records",
    "no_candidates",
    "no_commands",
    "no_raw_frames",
    "read_only_next_task_summary",
  ], context);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: next task adapter validation required`);
  }
}

function assertProductionProbeAnimePerformanceAdminAttentionSummarySafe(
  summary,
  context
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  const expectedFields = new Set([
    "schema",
    "module_id",
    "admin_status",
    "next_operator_action_id",
    "next_attention_area_id",
    "next_attention_area_missing_setting_count",
    "next_safe_script",
    "required_setting_count",
    "configured_setting_count",
    "missing_setting_count",
    "next_attention_area_missing_setting_count",
    "voice_license_use_category_setting_count",
    "voice_license_use_category_missing_setting_count",
  ]);
  for (const field of Object.keys(summary)) {
    if (!expectedFields.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    summary.schema !==
    "iris_production_probe_anime_performance_admin_attention_summary_v1"
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
  if (summary.next_safe_script !== null) {
    assertSafeVerificationScript(summary.next_safe_script, context);
  }
  for (const field of [
    "required_setting_count",
    "configured_setting_count",
    "missing_setting_count",
    "voice_license_use_category_setting_count",
    "voice_license_use_category_missing_setting_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    summary.configured_setting_count + summary.missing_setting_count !==
    summary.required_setting_count
  ) {
    throw new ContractError(`${context}: invalid setting counts`);
  }
}

function assertProductionProbeGrowthBusinessAdminAttentionSummarySafe(
  summary,
  context
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  const expectedFields = new Set([
    "schema",
    "module_id",
    "admin_status",
    "next_operator_action_id",
    "next_attention_area_id",
    "next_attention_area_missing_setting_count",
    "next_safe_script",
    "required_setting_count",
    "configured_setting_count",
    "missing_setting_count",
  ]);
  for (const field of Object.keys(summary)) {
    if (!expectedFields.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    summary.schema !==
    "iris_production_probe_growth_business_admin_attention_summary_v1"
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
  if (summary.next_safe_script !== null) {
    assertSafeVerificationScript(summary.next_safe_script, context);
  }
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
  if (
    summary.configured_setting_count + summary.missing_setting_count !==
    summary.required_setting_count
  ) {
    throw new ContractError(`${context}: invalid setting counts`);
  }
}

function assertProductionProbeNextTaskGateSummarySafe(gate, context, expectedPriority) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: invalid next task gate summary`);
  }
  if (gate.schema !== "iris_production_probe_next_task_gate_summary_v1") {
    throw new ContractError(`${context}: invalid next task gate schema`);
  }
  for (const field of Object.keys(gate)) {
    if (!PRODUCTION_PROBE_NEXT_TASK_GATE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected next task gate field ${field}`);
    }
  }
  if (gate.priority !== expectedPriority) {
    throw new ContractError(`${context}: invalid next task gate priority`);
  }
  if (!NEXT_TASK_STAGE_IDS.has(gate.stage_id)) {
    throw new ContractError(`${context}: invalid next task gate stage`);
  }
  if (typeof gate.ready !== "boolean") {
    throw new ContractError(`${context}: invalid next task gate ready flag`);
  }
  if (typeof gate.gate_status !== "string" || !/^[a-z0-9_]+$/.test(gate.gate_status)) {
    throw new ContractError(`${context}: invalid next task gate status`);
  }
  if (!["ready", "attention"].includes(gate.stage_status)) {
    throw new ContractError(`${context}: invalid next task gate stage status`);
  }
  if (!READINESS_STATES.has(gate.readiness_state)) {
    throw new ContractError(`${context}: invalid next task gate readiness state`);
  }
  for (const field of ["attention_reason_count", "missing_env_count"]) {
    if (!Number.isInteger(gate[field]) || gate[field] < 0) {
      throw new ContractError(`${context}: invalid next task gate ${field}`);
    }
  }
  for (const field of [
    "status_script",
    "launch_plan_script",
    "startup_checklist_script",
    "next_launch_script",
    "next_readiness_script",
    "runtime_verification_script",
  ]) {
    if (gate[field] !== null) assertSafeVerificationScript(gate[field], context);
  }
  if (
    gate.next_launch_step_id !== null &&
    (typeof gate.next_launch_step_id !== "string" ||
      !/^[a-z0-9_]+$/.test(gate.next_launch_step_id))
  ) {
    throw new ContractError(`${context}: invalid next task gate launch step`);
  }
  if (
    gate.next_launch_step_order !== null &&
    (!Number.isInteger(gate.next_launch_step_order) ||
      gate.next_launch_step_order < 1)
  ) {
    throw new ContractError(`${context}: invalid next task gate launch step order`);
  }
  if (
    (gate.next_launch_step_id === null) !== (gate.next_launch_step_order === null) ||
    (gate.next_launch_script === null) !== (gate.next_readiness_script === null)
  ) {
    throw new ContractError(`${context}: inconsistent next task gate launch fields`);
  }
  assertEnvNameListSafe(
    gate.next_configure_env,
    `${context}: gate next configure env`
  );
  if (!NEXT_TASK_RUNTIME_STATUSES.has(gate.expected_runtime_status)) {
    throw new ContractError(`${context}: invalid next task gate runtime status`);
  }
  if (!NEXT_TASK_RUNTIME_FLOW_IDS.has(gate.runtime_flow_id)) {
    throw new ContractError(`${context}: invalid next task gate runtime flow`);
  }
  if (!NEXT_TASK_RUNTIME_FLOW_SCHEMAS.has(gate.runtime_flow_schema)) {
    throw new ContractError(`${context}: invalid next task gate runtime flow schema`);
  }
  if (!NEXT_TASK_RUNTIME_FLOW_STATUSES.has(gate.expected_runtime_flow_status)) {
    throw new ContractError(
      `${context}: invalid next task gate runtime flow status`
    );
  }
  if (gate.expected_runtime_blocking_stage !== "none") {
    throw new ContractError(
      `${context}: invalid next task gate runtime blocking stage`
    );
  }
  if (gate.runtime_flow_summary_required !== true) {
    throw new ContractError(`${context}: next task runtime flow summary required`);
  }
  if (gate.runtime_boundary_summary_required !== true) {
    throw new ContractError(`${context}: next task runtime boundary summary required`);
  }
  assertProductionNextTaskGateDiagnosticDetailSafe(
    gate.diagnostic_detail,
    `${context}: next task gate diagnostic detail`
  );
  if (gate.stage_id === "tts_live2d_obs_foundation") {
    if (gate.startup_checklist_script !== "npm run dev:foundation:startup-checklist") {
      throw new ContractError(`${context}: invalid startup checklist script`);
    }
    assertProductionNextTaskOperatorStartupSummarySafe(
      gate.operator_startup_summary,
      `${context}: next task gate operator startup summary`
    );
  } else if (gate.stage_id === "youtube_comments_and_support") {
    if (
      gate.startup_checklist_script !==
      "npm run dev:youtube:relay-startup-checklist"
    ) {
      throw new ContractError(`${context}: invalid youtube startup checklist script`);
    }
    if (gate.operator_startup_summary !== null) {
      throw new ContractError(`${context}: unexpected next task gate startup summary`);
    }
  } else if (gate.stage_id === "memory_and_relationship_persistence") {
    if (
      gate.startup_checklist_script !==
      "npm run dev:persistence:startup-checklist"
    ) {
      throw new ContractError(`${context}: invalid persistence startup checklist script`);
    }
    if (gate.operator_startup_summary !== null) {
      throw new ContractError(`${context}: unexpected next task gate startup summary`);
    }
  } else if (gate.stage_id === "vision_and_safe_game_control") {
    if (
      gate.startup_checklist_script !==
      "npm run dev:gameplay:startup-checklist"
    ) {
      throw new ContractError(`${context}: invalid gameplay startup checklist script`);
    }
    if (gate.operator_startup_summary !== null) {
      throw new ContractError(`${context}: unexpected next task gate startup summary`);
    }
  } else {
    if (gate.operator_startup_summary !== null) {
      throw new ContractError(`${context}: unexpected next task gate startup summary`);
    }
  }
}

function assertProductionProbeVerificationPlanSafe(plan, context) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: verification plan is required`);
  }
  if (plan.schema !== "iris_production_verification_plan_v1") {
    throw new ContractError(`${context}: invalid verification plan schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!PRODUCTION_PROBE_VERIFICATION_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected verification plan field ${field}`);
    }
  }
  if (!["start_next_attention_stage", "all_stages_ready"].includes(plan.plan_status)) {
    throw new ContractError(`${context}: invalid verification plan status`);
  }
  if (
    plan.next_stage_id !== null &&
    !NEXT_TASK_STAGE_IDS.has(plan.next_stage_id)
  ) {
    throw new ContractError(`${context}: invalid verification next stage`);
  }
  if (
    plan.next_stage_priority !== null &&
    ![1, 2, 3, 4].includes(plan.next_stage_priority)
  ) {
    throw new ContractError(`${context}: invalid verification next stage priority`);
  }
  if (
    plan.next_stage_priority !== null &&
    STAGE_IDS_BY_PRIORITY.get(plan.next_stage_priority) !== plan.next_stage_id
  ) {
    throw new ContractError(`${context}: invalid verification next stage priority pair`);
  }
  if (!Array.isArray(plan.next_stage_verification_scripts)) {
    throw new ContractError(`${context}: verification scripts must be an array`);
  }
  for (const script of plan.next_stage_verification_scripts) {
    assertSafeVerificationScript(script, context);
  }
  if (!Array.isArray(plan.stage_summaries) || plan.stage_summaries.length === 0) {
    throw new ContractError(`${context}: verification stage summaries are required`);
  }
  for (const summary of plan.stage_summaries) {
    assertProductionProbeVerificationStageSummarySafe(summary, context);
  }
  if (!Number.isInteger(plan.total_verification_script_count) || plan.total_verification_script_count < 0) {
    throw new ContractError(`${context}: invalid total verification script count`);
  }
  assertBoundaryPolicy(plan.boundary_policy, [
    "script_names_only",
    "env_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "read_only_plan",
  ], context);
  if (plan.adapter_validation_required !== true) {
    throw new ContractError(`${context}: verification plan adapter validation required`);
  }
}

function assertProductionProbeVerificationStageSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: invalid verification stage summary`);
  }
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_PROBE_VERIFICATION_STAGE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: unexpected verification stage summary field ${field}`
      );
    }
  }
  if (!NEXT_TASK_STAGE_IDS.has(summary.stage_id)) {
    throw new ContractError(`${context}: invalid verification stage id`);
  }
  if (![1, 2, 3, 4].includes(summary.priority)) {
    throw new ContractError(`${context}: invalid verification stage priority`);
  }
  if (STAGE_IDS_BY_PRIORITY.get(summary.priority) !== summary.stage_id) {
    throw new ContractError(`${context}: invalid verification stage priority pair`);
  }
  if (!["ready", "attention"].includes(summary.status)) {
    throw new ContractError(`${context}: invalid verification stage status`);
  }
  if (!Number.isInteger(summary.verification_script_count) || summary.verification_script_count < 0) {
    throw new ContractError(`${context}: invalid verification script count`);
  }
  if (summary.first_verification_script !== null) {
    assertSafeVerificationScript(summary.first_verification_script, context);
  }
  if (!Number.isInteger(summary.missing_required_env_count) || summary.missing_required_env_count < 0) {
    throw new ContractError(`${context}: invalid missing env count`);
  }
}

function assertProductionProbeVerificationPlanMatchesReport(plan, report, context) {
  if (plan.next_stage_id !== report.next_stage) {
    throw new ContractError(`${context}: verification next stage drift`);
  }
  const expectedNextPriority =
    report.next_stage === null
      ? null
      : report.stages.find((stage) => stage.stage_id === report.next_stage)
          ?.priority ?? null;
  if (plan.next_stage_priority !== expectedNextPriority) {
    throw new ContractError(`${context}: verification next priority drift`);
  }
  if (!Array.isArray(plan.stage_summaries) || plan.stage_summaries.length !== report.stages.length) {
    throw new ContractError(`${context}: verification stage summary count drift`);
  }
  for (const stage of report.stages) {
    const summary = plan.stage_summaries.find(
      (candidate) => candidate.stage_id === stage.stage_id
    );
    if (!summary) {
      throw new ContractError(`${context}: missing verification stage summary`);
    }
    if (summary.priority !== stage.priority) {
      throw new ContractError(`${context}: verification stage summary drift`);
    }
  }
  const scriptCount = plan.stage_summaries.reduce(
    (sum, summary) => sum + summary.verification_script_count,
    0
  );
  if (plan.total_verification_script_count !== scriptCount) {
    throw new ContractError(`${context}: verification script count drift`);
  }
}

function assertSafeVerificationScript(script, context) {
  if (
    typeof script !== "string" ||
    !(
      /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
        script
      ) || script === "npm test"
    )
  ) {
    throw new ContractError(`${context}: invalid verification script`);
  }
}

function assertSafeAttentionAreaId(value, context) {
  if (
    value !== null &&
    (typeof value !== "string" || !/^[a-z0-9_]+$/.test(value))
  ) {
    throw new ContractError(`${context}: invalid next attention area`);
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

function summarizeStage({ stage, doctorChecks, integrationStatus, obsBridgeHealth, adapterProbe }) {
  const checkSummaries = stage.integrations.map((integration) =>
    summarizeCheck({
      integration: integration.integration,
      doctorChecks,
      integrationStatus,
      obsBridgeHealth,
      adapterProbe,
    })
  );
  const readinessState = firstReadinessState(checkSummaries);
  return {
    schema: "iris_production_probe_stage_v1",
    stage_id: stage.stage_id,
    priority: stage.priority,
    status: stage.status,
    readiness_state: readinessState,
    readiness_state_counts: countReadinessStates(checkSummaries),
    check_count: checkSummaries.length,
    ready_check_count: checkSummaries.filter((check) => check.status === "ready").length,
    attention_check_count: checkSummaries.filter((check) => check.status === "attention").length,
    local_endpoint_policy_summary: summarizeLocalEndpointPolicyAcrossChecks(checkSummaries),
    checks: checkSummaries,
    verification_scripts: stage.verification_scripts,
    missing_required_env: stage.missing_required_env,
    boundary_policy: {
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_stage: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeLocalEndpointPolicyAcrossStages(stages) {
  const checks = [];
  for (const stage of stages) {
    if (Array.isArray(stage?.checks)) checks.push(...stage.checks);
  }
  return summarizeLocalEndpointPolicyAcrossChecks(checks);
}

function summarizeLocalEndpointPolicyAcrossChecks(checks) {
  if (!Array.isArray(checks)) {
    throw new ContractError("production probe local endpoint checks must be an array");
  }
  const summary = {
    schema: "iris_production_probe_local_endpoint_policy_summary_v1",
    applicable_check_count: 0,
    all_allowed_check_count: 0,
    not_configured_check_count: 0,
    blocked_check_count: 0,
    not_applicable_check_count: 0,
    scope_counts: {
      total_count: 0,
      loopback_count: 0,
      private_network_count: 0,
      external_count: 0,
      invalid_count: 0,
      not_configured_count: 0,
    },
  };
  for (const check of checks) {
    const status = check?.local_endpoint_policy_status ?? "not_applicable";
    if (status === "all_allowed") {
      summary.applicable_check_count += 1;
      summary.all_allowed_check_count += 1;
    } else if (status === "not_configured") {
      summary.applicable_check_count += 1;
      summary.not_configured_check_count += 1;
    } else if (status === "blocked") {
      summary.applicable_check_count += 1;
      summary.blocked_check_count += 1;
    } else {
      summary.not_applicable_check_count += 1;
    }
    const scopeSummary = check?.local_endpoint_scope_summary;
    assertLocalEndpointScopeSummarySafe(
      scopeSummary,
      "production probe local endpoint summary aggregation"
    );
    for (const field of Object.keys(summary.scope_counts)) {
      summary.scope_counts[field] += scopeSummary[field];
    }
  }
  return summary;
}

function summarizeCheck({
  integration,
  doctorChecks,
  integrationStatus,
  obsBridgeHealth,
  adapterProbe,
}) {
  const doctorCheck = doctorChecks.find((check) => check.integration === integration);
  const statusItem = findRelatedIntegrationStatus({ integration, integrationStatus });
  const localEndpointPolicyStatus = summarizeLocalEndpointPolicyStatus(doctorCheck);
  const adapterProbeStatus = summarizeAdapterProbeStatus(integration, adapterProbe);
  const engineHealthStatus = summarizeEngineHealthStatus(integration, adapterProbe);
  const obsBridgeHealthStatus = summarizeObsBridgeHealthStatus(
    integration,
    obsBridgeHealth
  );
  const configuredEnv = doctorCheck?.configured_env ?? [];
  const missingEnv = doctorCheck?.missing_env ?? [];
  const authConfigured = configuredEnv.some((name) =>
    /(?:AUTH|TOKEN|API_KEY|SECRET|CREDENTIAL)/i.test(String(name))
  );
  return {
    schema: "iris_production_probe_check_v1",
    integration,
    status: doctorCheck?.status ?? "attention",
    readiness_state: summarizeCheckReadinessState({
      doctorCheck,
      localEndpointPolicyStatus,
      adapterProbeStatus,
      engineHealthStatus,
      obsBridgeHealthStatus,
    }),
    mode: safeText(doctorCheck?.mode ?? statusItem?.mode ?? "unknown", 80),
    configured_env: configuredEnv,
    missing_env: missingEnv,
    runtime_status: safeText(statusItem?.status ?? "unknown", 80),
    auth_configured: authConfigured,
    local_endpoint_policy: safeText(doctorCheck?.local_endpoint_policy ?? "not_applicable", 80),
    local_endpoint_policy_status: localEndpointPolicyStatus,
    local_endpoint_scope_summary: summarizeLocalEndpointScopes(doctorCheck),
    adapter_probe_status: adapterProbeStatus,
    engine_health_status: engineHealthStatus,
    engine_health_compatibility: summarizeEngineHealthCompatibility(integration, adapterProbe),
    local_bridge_worker_diagnostics: summarizeLocalBridgeWorkerDiagnostics({
      integration,
      integrationStatus,
    }),
    obs_bridge_health_status: obsBridgeHealthStatus,
    obs_bridge_health_compatibility: summarizeObsBridgeHealthCompatibility(
      integration,
      obsBridgeHealth
    ),
    boundary_policy: {
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_check: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeLocalEndpointPolicyStatus(doctorCheck) {
  const summary = summarizeLocalEndpointScopes(doctorCheck);
  if (summary.total_count === 0) return "not_applicable";
  if (summary.external_count > 0 || summary.invalid_count > 0) return "blocked";
  if (summary.not_configured_count > 0) return "not_configured";
  return "all_allowed";
}

function summarizeLocalEndpointScopes(doctorCheck) {
  const counts = {
    total_count: 0,
    loopback_count: 0,
    private_network_count: 0,
    external_count: 0,
    invalid_count: 0,
    not_configured_count: 0,
  };
  if (!doctorCheck || typeof doctorCheck !== "object") return counts;
  for (const [field, value] of Object.entries(doctorCheck)) {
    if (!field.endsWith("_endpoint_scope")) continue;
    counts.total_count += 1;
    if (value === "loopback") counts.loopback_count += 1;
    else if (value === "private_network") counts.private_network_count += 1;
    else if (value === "external") counts.external_count += 1;
    else if (value === "invalid") counts.invalid_count += 1;
    else counts.not_configured_count += 1;
  }
  return counts;
}

function summarizeCheckReadinessState({
  doctorCheck,
  localEndpointPolicyStatus,
  adapterProbeStatus,
  engineHealthStatus,
  obsBridgeHealthStatus,
}) {
  if (!doctorCheck || doctorCheck.status !== "ready") {
    if (Array.isArray(doctorCheck?.missing_env) && doctorCheck.missing_env.length > 0) {
      return "configuration_waiting";
    }
    if (localEndpointPolicyStatus === "blocked") return "operator_review_required";
    return "operator_review_required";
  }
  if (localEndpointPolicyStatus === "blocked") return "operator_review_required";
  if (localEndpointPolicyStatus === "not_configured") return "configuration_waiting";
  if (
    engineHealthStatus === "health_endpoint_not_configured" ||
    engineHealthStatus === "not_configured" ||
    obsBridgeHealthStatus === "health_endpoint_not_configured" ||
    obsBridgeHealthStatus === "not_configured"
  ) {
    return "configuration_waiting";
  }
  if (engineHealthStatus === "attention" || obsBridgeHealthStatus === "attention") {
    return "real_device_waiting";
  }
  if (adapterProbeStatus === "missing_configuration") {
    return "configuration_waiting";
  }
  if (adapterProbeStatus === "attention") return "runtime_waiting";
  return "ready";
}

function summarizeLocalBridgeWorkerDiagnostics({ integration, integrationStatus }) {
  if (
    ![
      "validated_runtime_bridge_handoff",
      "real_tts_engine",
      "real_live2d_bridge",
      "production_obs_overlay",
    ].includes(integration)
  ) {
    return {
      status: "not_applicable",
      outbox_configured: null,
      artifact_dir_configured: null,
      adapter_readiness_public_status: "not_applicable",
      event_render_manifests_supported: null,
      tts_engine_mode: "not_applicable",
      live2d_engine_mode: "not_applicable",
      subtitle_engine_mode: "not_applicable",
      tts_health_configured: null,
      live2d_health_configured: null,
      job_freshness_guard_configured: null,
      job_freshness_guard_status_policy: "not_applicable",
      engine_mode_summary: null,
      obs_render_handoff_summary: null,
    };
  }
  const worker = integrationStatus.integrations.find(
    (item) => item.integration === "local_bridge_engine_worker"
  );
  if (!worker) {
    return {
      status: "not_found",
      outbox_configured: null,
      artifact_dir_configured: null,
      adapter_readiness_public_status: "not_applicable",
      event_render_manifests_supported: null,
      tts_engine_mode: "unknown",
      live2d_engine_mode: "unknown",
      subtitle_engine_mode: "unknown",
      tts_health_configured: null,
      live2d_health_configured: null,
      job_freshness_guard_configured: null,
      job_freshness_guard_status_policy: "unknown",
      engine_mode_summary: null,
      obs_render_handoff_summary: null,
    };
  }
  return {
    status: safeText(worker.status ?? "unknown", 80),
    outbox_configured:
      Array.isArray(worker.configured_env) &&
      worker.configured_env.includes("IRIS_LOCAL_BRIDGE_OUTBOX_DIR"),
    artifact_dir_configured:
      Array.isArray(worker.configured_env) &&
      worker.configured_env.includes("IRIS_LOCAL_BRIDGE_ARTIFACT_DIR"),
    adapter_readiness_public_status: safeText(
      worker.adapter_readiness_public_status ?? "not_declared",
      80
    ),
    event_render_manifests_supported: worker.event_render_manifests_supported === true,
    tts_engine_mode: safeText(worker.tts_engine_mode ?? "unknown", 80),
    live2d_engine_mode: safeText(worker.live2d_engine_mode ?? "unknown", 80),
    subtitle_engine_mode: safeText(worker.subtitle_engine_mode ?? "unknown", 80),
    tts_health_configured:
      Array.isArray(worker.configured_env) &&
      worker.configured_env.includes("IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT"),
    live2d_health_configured:
      Array.isArray(worker.configured_env) &&
      worker.configured_env.includes("IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT"),
    job_freshness_guard_configured:
      Array.isArray(worker.configured_env) &&
      worker.configured_env.includes("IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS"),
    job_freshness_guard_status_policy: safeText(
      worker.job_freshness_guard_status_policy ?? "not_declared",
      80
    ),
    engine_mode_summary: sanitizeEngineModeSummary(worker.engine_mode_summary),
    obs_render_handoff_summary: sanitizeObsRenderHandoffSummary(
      worker.obs_render_handoff_summary
    ),
  };
}

function sanitizeObsRenderHandoffSummary(summary) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  const configuredPickupGuardCount = safeNonNegativeInteger(
    summary.configured_pickup_guard_count
  );
  const requiredPickupGuardCount = safeNonNegativeInteger(
    summary.required_pickup_guard_count
  );
  const pickupState = [
    "obs_pickup_guards_configured",
    "obs_pickup_guard_configuration_waiting",
  ].includes(summary.production_obs_pickup_handoff_state)
    ? summary.production_obs_pickup_handoff_state
    : "obs_pickup_guard_configuration_waiting";
  const pickupGuardsConfigured =
    pickupState === "obs_pickup_guards_configured" &&
    requiredPickupGuardCount > 0 &&
    configuredPickupGuardCount >= requiredPickupGuardCount;
  return {
    schema: "iris_production_probe_obs_render_handoff_summary_v1",
    artifact_pipeline_configured: pickupGuardsConfigured,
    outbox_configured: pickupGuardsConfigured,
    artifact_store_configured: pickupGuardsConfigured,
    event_render_manifests_supported:
      summary.event_render_manifests_supported === true,
    render_manifest_public_status:
      summary.render_manifest_public_status === "counts_only"
        ? "counts_only"
        : "unknown",
    render_manifest_stale_guard_configured:
      pickupGuardsConfigured,
    render_artifact_sync_guard_configured:
      pickupGuardsConfigured,
    configured_pickup_guard_count: configuredPickupGuardCount,
    required_pickup_guard_count: requiredPickupGuardCount,
    obs_pickup_requires_complete_render_manifest:
      summary.obs_pickup_requires_complete_render_manifest === true,
    manifest_id_match_required_for_artifact_pickup:
      summary.manifest_id_match_required_for_artifact_pickup === true,
    render_timestamp_match_required_for_artifact_pickup:
      summary.render_timestamp_match_required_for_artifact_pickup === true,
    local_bridge_worker_required_before_obs_pickup:
      summary.local_bridge_worker_required_before_obs_pickup === true,
    all_obs_pickup_guards_configured:
      pickupGuardsConfigured,
    production_obs_pickup_handoff_state: pickupState,
    boundary_policy: {
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_artifact_paths: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function sanitizeEngineModeSummary(summary) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  const realHttpEngineCount = safeNonNegativeInteger(
    summary.real_http_engine_count
  );
  const engineHandoffState = [
    "real_tts_live2d_configured",
    "local_artifact_handoff_active",
    "local_placeholder_mode_active",
  ].includes(summary.production_engine_handoff_state)
    ? summary.production_engine_handoff_state
    : "local_placeholder_mode_active";
  return {
    schema: "iris_production_probe_engine_mode_summary_v1",
    tts_engine_real_http_configured:
      engineHandoffState === "real_tts_live2d_configured" &&
      realHttpEngineCount >= 2,
    live2d_engine_real_http_configured:
      engineHandoffState === "real_tts_live2d_configured" &&
      realHttpEngineCount >= 2,
    subtitle_engine_local_vtt: summary.subtitle_engine_local_vtt === true,
    real_http_engine_count: realHttpEngineCount,
    local_placeholder_engine_count: safeNonNegativeInteger(
      summary.local_placeholder_engine_count
    ),
    health_check_configured_count: safeNonNegativeInteger(
      summary.health_check_configured_count
    ),
    all_real_http_engines_configured:
      engineHandoffState === "real_tts_live2d_configured" &&
      realHttpEngineCount >= 2,
    placeholder_mode_active: summary.placeholder_mode_active === true,
    production_engine_handoff_state: engineHandoffState,
    boundary_policy: {
      modes_and_counts_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function safeNonNegativeInteger(value) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0) return 0;
  return numeric;
}

function summarizeObsBridgeHealthCompatibility(integration, obsBridgeHealth) {
  if (integration !== "production_obs_overlay") {
    return {
      status: "not_applicable",
      bridge_readiness_status: "not_applicable",
      bridge_reports_ready: null,
      setup_schema_status: "not_applicable",
      supports_setup_request_schema: null,
      ack_shape_status: "not_applicable",
      supports_setup_ack_shape: null,
    };
  }
  const probe = obsBridgeHealth?.probe;
  if (!probe) {
    return {
      status: "not_applicable",
      bridge_readiness_status: "not_applicable",
      bridge_reports_ready: null,
      setup_schema_status: "not_applicable",
      supports_setup_request_schema: null,
      ack_shape_status: "not_applicable",
      supports_setup_ack_shape: null,
    };
  }
  return {
    status: summarizeObsBridgeHealthStatus(integration, obsBridgeHealth),
    bridge_readiness_status: safeText(probe.bridge_readiness_status ?? "not_checked", 80),
    bridge_reports_ready:
      typeof probe.bridge_reports_ready === "boolean" ? probe.bridge_reports_ready : null,
    setup_schema_status: safeText(probe.compatibility_status ?? "not_checked", 80),
    supports_setup_request_schema:
      typeof probe.supports_setup_request_schema === "boolean"
        ? probe.supports_setup_request_schema
        : null,
    ack_shape_status: safeText(probe.response_compatibility_status ?? "not_checked", 80),
    supports_setup_ack_shape:
      typeof probe.supports_setup_ack_shape === "boolean"
        ? probe.supports_setup_ack_shape
        : null,
  };
}

function summarizeEngineHealthCompatibility(integration, adapterProbe) {
  const engineKindByIntegration = {
    real_tts_engine: "tts",
    real_live2d_bridge: "live2d",
  };
  const engineKind = engineKindByIntegration[integration];
  if (!engineKind) {
    return {
      status: "not_applicable",
      request_schema_status: "not_applicable",
      supports_required_request_schema: null,
      engine_readiness_status: "not_applicable",
      engine_reports_ready: null,
      response_shape_status: "not_applicable",
      supports_required_response_shape: null,
      output_format_status: "not_applicable",
      supports_required_output_format: null,
      cue_schema_status: "not_applicable",
      supports_required_cue_schema: null,
    };
  }
  const probe = adapterProbe.engine_health?.probes?.find(
    (item) => item.engine_kind === engineKind
  );
  if (!probe) {
    return {
      status: "not_applicable",
      request_schema_status: "not_applicable",
      supports_required_request_schema: null,
      engine_readiness_status: "not_applicable",
      engine_reports_ready: null,
      response_shape_status: "not_applicable",
      supports_required_response_shape: null,
      output_format_status: "not_applicable",
      supports_required_output_format: null,
      cue_schema_status: "not_applicable",
      supports_required_cue_schema: null,
    };
  }
  return {
    status: summarizeEngineHealthStatus(integration, adapterProbe),
    request_schema_status: safeText(probe.compatibility_status ?? "not_checked", 80),
    supports_required_request_schema:
      typeof probe.supports_required_request_schema === "boolean"
        ? probe.supports_required_request_schema
        : null,
    engine_readiness_status: safeText(probe.engine_readiness_status ?? "not_checked", 80),
    engine_reports_ready:
      typeof probe.engine_reports_ready === "boolean" ? probe.engine_reports_ready : null,
    response_shape_status: safeText(probe.response_compatibility_status ?? "not_checked", 80),
    supports_required_response_shape:
      typeof probe.supports_required_response_shape === "boolean"
        ? probe.supports_required_response_shape
        : null,
    output_format_status: safeText(
      probe.output_format_compatibility_status ?? "not_checked",
      80
    ),
    supports_required_output_format:
      typeof probe.supports_required_output_format === "boolean"
        ? probe.supports_required_output_format
        : null,
    cue_schema_status: safeText(
      probe.cue_schema_compatibility_status ?? "not_checked",
      80
    ),
    supports_required_cue_schema:
      typeof probe.supports_required_cue_schema === "boolean"
        ? probe.supports_required_cue_schema
        : null,
  };
}

function summarizeObsBridgeHealthStatus(integration, obsBridgeHealth) {
  if (integration !== "production_obs_overlay") return "not_applicable";
  const status = obsBridgeHealth?.probe?.status;
  if (status === "pass") return "pass";
  if (status === "health_endpoint_not_configured") return "health_endpoint_not_configured";
  if (status === "not_configured") return "not_configured";
  return "attention";
}

function findRelatedIntegrationStatus({ integration, integrationStatus }) {
  const candidates = {
    validated_runtime_bridge_handoff: [
      "tts_bridge",
      "live2d_bridge",
      "subtitle_bridge",
      "local_bridge_engine_worker",
    ],
    real_tts_engine: ["local_bridge_engine_worker", "tts_bridge"],
    real_live2d_bridge: ["local_bridge_engine_worker", "live2d_bridge"],
    production_obs_overlay: ["obs_bridge"],
    youtube_live_chat_api: ["youtube_live_chat_source"],
    media_and_external_topic_ingestion: ["media_watch_bridge", "external_topic_bridge"],
    memory_and_relationship_persistence: ["relationship_memory", "candidate_persistence"],
    production_vector_memory: ["memory_search"],
    real_screen_capture_or_vision_ingestion: ["game_observation_bridge"],
    approved_game_control_adapter: ["game_control_bridge"],
  }[integration] ?? [integration];
  return integrationStatus.integrations.find((item) => candidates.includes(item.integration)) ?? null;
}

function summarizeAdapterProbeStatus(integration, adapterProbe) {
  if (integration === "validated_runtime_bridge_handoff") {
    const bridgeProbeStatuses = ["tts", "live2d", "subtitle"].map(
      (adapterKind) =>
        adapterProbe.probes.find((probe) => probe.adapter_kind === adapterKind)?.status ??
        "not_applicable"
    );
    if (bridgeProbeStatuses.every((status) => status === "ready_for_fixture_probe")) {
      return "ready_for_fixture_probe";
    }
    if (bridgeProbeStatuses.some((status) => status === "missing_configuration")) {
      return "missing_configuration";
    }
    if (bridgeProbeStatuses.some((status) => status === "attention")) return "attention";
    return "local_or_disabled";
  }
  if (integration === "real_tts_engine" || integration === "real_live2d_bridge") {
    return adapterProbe.engine_worker.status;
  }
  const adapterKindByIntegration = {
    production_obs_overlay: "subtitle",
  };
  const adapterKind = adapterKindByIntegration[integration];
  if (!adapterKind) return "not_applicable";
  return (
    adapterProbe.probes.find((probe) => probe.adapter_kind === adapterKind)?.status ??
    "not_applicable"
  );
}

function summarizeEngineHealthStatus(integration, adapterProbe) {
  const engineKindByIntegration = {
    real_tts_engine: "tts",
    real_live2d_bridge: "live2d",
  };
  const engineKind = engineKindByIntegration[integration];
  if (!engineKind) return "not_applicable";
  const probe = adapterProbe.engine_health?.probes?.find(
    (item) => item.engine_kind === engineKind
  );
  if (!probe) return "not_applicable";
  if (probe.status === "pass") return "pass";
  if (probe.status === "health_endpoint_not_configured") return "health_endpoint_not_configured";
  if (probe.status === "not_configured") return "not_configured";
  return "attention";
}

function assertProductionProbeStageSafe(stage, context) {
  if (!stage || typeof stage !== "object") {
    throw new ContractError(`${context}: invalid stage`);
  }
  if (stage.schema !== "iris_production_probe_stage_v1") {
    throw new ContractError(`${context}: invalid stage schema`, { schema: stage.schema });
  }
  for (const field of Object.keys(stage)) {
    if (!PRODUCTION_PROBE_STAGE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected stage field`);
    }
  }
  if (!NEXT_TASK_STAGE_IDS.has(stage.stage_id)) {
    throw new ContractError(`${context}: invalid stage id`);
  }
  if (!Number.isInteger(stage.priority) || stage.priority < 1 || stage.priority > 4) {
    throw new ContractError(`${context}: invalid stage priority`);
  }
  if (!["ready", "attention"].includes(stage.status)) {
    throw new ContractError(`${context}: invalid stage status`, { status: stage.status });
  }
  if (!READINESS_STATES.has(stage.readiness_state)) {
    throw new ContractError(`${context}: invalid stage readiness`);
  }
  assertReadinessStateCountsSafe(
    stage.readiness_state_counts,
    `${context}: stage readiness counts`
  );
  if (!Array.isArray(stage.checks)) {
    throw new ContractError(`${context}: stage checks are required`);
  }
  for (const check of stage.checks) assertProductionProbeCheckSafe(check, context);
  const readyCheckCount = stage.checks.filter((check) => check.status === "ready").length;
  if (
    stage.check_count !== stage.checks.length ||
    stage.ready_check_count !== readyCheckCount ||
    stage.attention_check_count !== stage.checks.length - readyCheckCount
  ) {
    throw new ContractError(`${context}: invalid stage check counts`);
  }
  if (
    stage.readiness_state !== firstReadinessState(stage.checks) ||
    !sameReadinessStateCounts(
      stage.readiness_state_counts,
      countReadinessStates(stage.checks)
    )
  ) {
    throw new ContractError(`${context}: invalid stage readiness summary`);
  }
  assertBoundaryPolicy(stage.boundary_policy, [
    "env_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_raw_payloads",
    "no_candidates",
    "no_commands",
    "read_only_stage",
  ], context);
}

function assertProductionProbeCheckSafe(check, context) {
  if (!check || typeof check !== "object") {
    throw new ContractError(`${context}: invalid check`);
  }
  if (check.schema !== "iris_production_probe_check_v1") {
    throw new ContractError(`${context}: invalid check schema`, { schema: check.schema });
  }
  for (const field of Object.keys(check)) {
    if (!PRODUCTION_PROBE_CHECK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected check field`);
    }
  }
  if (!["ready", "attention"].includes(check.status)) {
    throw new ContractError(`${context}: invalid check status`, { status: check.status });
  }
  if (!READINESS_STATES.has(check.readiness_state)) {
    throw new ContractError(`${context}: invalid check readiness state`);
  }
  if (!Array.isArray(check.configured_env) || !Array.isArray(check.missing_env)) {
    throw new ContractError(`${context}: check env summaries must be arrays`);
  }
  assertLocalEndpointScopeSummarySafe(
    check.local_endpoint_scope_summary,
    `${context}: local endpoint scope summary`
  );
  if (check.local_bridge_worker_diagnostics !== undefined) {
    assertLocalBridgeWorkerDiagnosticsSafe(
      check.local_bridge_worker_diagnostics,
      `${context}: local bridge worker diagnostics`
    );
  }
  assertBoundaryPolicy(check.boundary_policy, [
    "env_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_raw_payloads",
    "no_candidates",
    "no_commands",
    "read_only_check",
  ], context);
}

function assertLocalEndpointScopeSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: scope summary is required`);
  }
  for (const field of [
    "total_count",
    "loopback_count",
    "private_network_count",
    "external_count",
    "invalid_count",
    "not_configured_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
}

function assertLocalBridgeWorkerDiagnosticsSafe(diagnostics, context) {
  if (!diagnostics || typeof diagnostics !== "object" || Array.isArray(diagnostics)) {
    throw new ContractError(`${context}: diagnostics required`);
  }
  if (diagnostics.engine_mode_summary !== null) {
    assertProductionProbeEngineModeSummarySafe(
      diagnostics.engine_mode_summary,
      `${context}: engine mode summary`
    );
  }
  if (diagnostics.obs_render_handoff_summary !== null) {
    assertProductionProbeObsRenderHandoffSummarySafe(
      diagnostics.obs_render_handoff_summary,
      `${context}: OBS render handoff summary`
    );
  }
}

function assertProductionProbeObsRenderHandoffSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_production_probe_obs_render_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of [
    "artifact_pipeline_configured",
    "outbox_configured",
    "artifact_store_configured",
    "event_render_manifests_supported",
    "render_manifest_stale_guard_configured",
    "render_artifact_sync_guard_configured",
    "obs_pickup_requires_complete_render_manifest",
    "manifest_id_match_required_for_artifact_pickup",
    "render_timestamp_match_required_for_artifact_pickup",
    "local_bridge_worker_required_before_obs_pickup",
    "all_obs_pickup_guards_configured",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "configured_pickup_guard_count",
    "required_pickup_guard_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!["counts_only", "unknown"].includes(summary.render_manifest_public_status)) {
    throw new ContractError(`${context}: invalid public status`);
  }
  if (
    ![
      "obs_pickup_guards_configured",
      "obs_pickup_guard_configuration_waiting",
    ].includes(summary.production_obs_pickup_handoff_state)
  ) {
    throw new ContractError(`${context}: invalid production handoff state`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "booleans_counts_and_fixed_statuses_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_payloads",
    "no_artifact_paths",
    "no_candidates",
    "no_commands",
  ], context);
}

function assertProductionProbeEngineModeSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_production_probe_engine_mode_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of [
    "tts_engine_real_http_configured",
    "live2d_engine_real_http_configured",
    "subtitle_engine_local_vtt",
    "all_real_http_engines_configured",
    "placeholder_mode_active",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "real_http_engine_count",
    "local_placeholder_engine_count",
    "health_check_configured_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    ![
      "real_tts_live2d_configured",
      "local_artifact_handoff_active",
      "local_placeholder_mode_active",
    ].includes(summary.production_engine_handoff_state)
  ) {
    throw new ContractError(`${context}: invalid production handoff state`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "modes_and_counts_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_payloads",
    "no_candidates",
    "no_commands",
  ], context);
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

function assertNoForbiddenProductionProbeFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenProductionProbeFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_PRODUCTION_PROBE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe production probe field`, { field, path });
    }
    assertNoForbiddenProductionProbeFields(child, context, `${path}.${field}`);
  }
}

function countReadinessStates(items) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const item of items) {
    const state = item.readiness_state;
    if (READINESS_STATES.has(state)) counts[state] += 1;
  }
  return counts;
}

function firstReadinessState(items) {
  for (const item of items) {
    const state = item.readiness_state;
    if (READINESS_STATES.has(state) && state !== "ready") return state;
  }
  return "ready";
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: counts required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness count`);
    }
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: unexpected readiness state`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  if (!left || !right) return false;
  for (const state of READINESS_STATES) {
    if (left[state] !== right[state]) return false;
  }
  return true;
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeComponentLabel(value) {
  const text = safeText(value, 80);
  if (!/^[a-z0-9_:-]+$/.test(text)) return "";
  if (/(?:endpoint|token|secret|password|url|path|command|payload)/i.test(text)) {
    return "";
  }
  return text;
}

function safeBlockerLabel(value) {
  const text = safeText(value, 100);
  if (!/^[a-z0-9_:-]+$/.test(text)) return "";
  if (/(?:endpoint|token|secret|password|url|path|command|payload|log)/i.test(text)) {
    return "";
  }
  return text;
}

function safeBlockerNextActionLabel(blockerLabel) {
  switch (blockerLabel) {
    case "configuration_missing":
      return "configure_required_production_settings";
    case "runtime_waiting":
      return "start_required_runtime";
    case "real_device_waiting":
      return "connect_required_real_device";
    case "operator_review_required":
      return "complete_operator_review";
    case "adapter_probe_attention":
      return "check_adapter_probe_status";
    case "obs_bridge_attention":
      return "check_obs_bridge_status";
    default:
      return String(blockerLabel ?? "").startsWith("missing_")
        ? "configure_missing_component"
        : "review_blocker_status";
  }
}

function safeScriptName(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = safeText(value, 120);
  const match = /^npm run ([a-z0-9:_-]+)(?: -- .*)?$/i.exec(text);
  const scriptName = match ? match[1] : text;
  if (!/^[a-z0-9:_-]+$/i.test(scriptName)) return null;
  if (/(?:endpoint|token|secret|password|url|path|payload)/i.test(scriptName)) {
    return null;
  }
  return scriptName;
}
