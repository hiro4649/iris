import { ContractError } from "../../core/contracts.js";
import {
  assertPersistenceEnvSetupPlanSafe,
  createPersistenceEnvSetupPlan,
} from "./persistenceEnvSetupPlan.js";
import {
  assertPersistenceLaunchPlanSafe,
  createPersistenceLaunchPlan,
} from "./persistenceLaunchPlan.js";
import {
  assertPersistenceRuntimeStatusReportSafe,
  createPersistenceRuntimeStatusReport,
} from "./persistenceRuntimeStatus.js";

const FORBIDDEN_PERSISTENCE_LIVE_READINESS_FIELDS = new Set([
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
  "viewer_id",
  "viewerId",
  "author_id",
  "authorId",
  "channel_id",
  "channelId",
  "author_channel_id",
  "authorChannelId",
  "identity_id",
  "identityId",
  "linked_identity_id",
  "linkedIdentityId",
  "display_name",
  "displayName",
  "approved_memory_record",
  "approved_relationship_record",
  "memory_records",
  "relationship_profiles",
  "records",
  "profiles",
  "summary",
  "recent_summaries",
  "endpoint",
  "url",
  "filePath",
  "file_path",
  "memory_store_path",
  "relationship_store_path",
  "store_path",
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
]);

const PERSISTENCE_LIVE_READINESS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "live_readiness_status",
  "persistence_launch_plan_status",
  "target_stage_id",
  "persistence_mode",
  "vector_memory_mode",
  "env_setup_plan_summary",
  "next_gate_id",
  "next_readiness_state",
  "readiness_state_counts",
  "next_check_script",
  "configuration_gate",
  "runtime_gate",
  "store_gate",
  "approved_record_gate",
  "candidate_gate",
  "relationship_gate",
  "recall_gate",
  "lifecycle_gate",
  "production_handoff_summary",
  "verification_scripts",
  "boundary_policy",
  "adapter_validation_required",
]);

const LIVE_READINESS_STATUSES = new Set([
  "configuration_attention",
  "runtime_attention",
  "store_attention",
  "waiting_for_records",
  "candidate_gate_attention",
  "relationship_attention",
  "recall_attention",
  "ready_for_persistence_operation",
]);
const GATE_IDS = new Set([
  "configuration_gate",
  "runtime_gate",
  "store_gate",
  "approved_record_gate",
  "candidate_gate",
  "relationship_gate",
  "recall_gate",
  "lifecycle_gate",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "operator_review_required",
]);
const ENV_SETUP_PLAN_STATUSES = new Set([
  "ready_for_persistence_env_setup",
  "configure_persistence_env_first",
]);
const ENV_SETUP_GROUP_IDS = new Set([
  "json_store_files",
  "candidate_relationship_flags",
  "vector_memory_search",
  "persistence_verification",
]);
const ENV_SETUP_GROUP_KINDS = new Set([
  "json_store_config",
  "feature_flag_config",
  "vector_memory_config",
  "verification_config",
]);
const ENV_SETUP_ATTENTION_REASONS = new Set([
  "ready",
  "missing_required_env",
  "configuration_attention",
  "vector_target_policy_attention",
]);
const TARGET_POLICY_STATUSES = new Set(["allowed", "attention", "not_applicable"]);
const CHECK_SCRIPTS = {
  configuration_gate: "npm run dev:persistence:preflight",
  runtime_gate: "npm run dev:persistence:runtime-status",
  store_gate: "npm run dev:persistence:status-roundtrip",
  approved_record_gate: "npm run dev:persistence:roundtrip",
  candidate_gate: "npm run dev:persistence:candidate-gate-roundtrip",
  relationship_gate: "npm run dev:persistence:roundtrip",
  recall_gate: "npm run dev:persistence:restart-roundtrip",
  lifecycle_gate: "npm run dev:persistence:roundtrip",
};
const CONFIGURATION_GATE_STATUSES = new Set([
  "configuration_attention",
  "ready",
]);
const RUNTIME_GATE_STATUSES = new Set([
  "runtime_unavailable",
  "attention_required",
  "configured_waiting_for_records",
  "runtime_attention",
  "active_with_memory",
  "partial_relationship_memory",
  "active_with_memory_and_relationships",
  "ready",
]);
const STORE_GATE_STATUSES = new Set([
  "configuration_attention",
  "store_attention",
  "ready",
]);
const APPROVED_RECORD_GATE_STATUSES = new Set([
  "unavailable",
  "disabled",
  "waiting_for_records",
  "active_with_memory_only",
  "active_with_relationships_only",
  "active_with_memory_and_relationships",
  "attention",
  "ready",
]);
const CANDIDATE_GATE_STATUSES = new Set([
  "unavailable",
  "validator_disabled",
  "waiting_for_runtime_event",
  "waiting_for_candidate_validation",
  "validation_blocked",
  "waiting_for_candidate_persistence",
  "persistence_attention",
  "commit_observed_waiting_for_status",
  "memory_commit_active",
  "relationship_commit_active",
  "memory_relationship_commit_active",
  "validation_gated_review_only",
  "ready",
]);
const CANDIDATE_BLOCKING_STAGES = new Set([
  "runtime_state",
  "validator",
  "persistence",
  "store_status",
  "none",
]);
const RELATIONSHIP_GATE_STATUSES = new Set([
  "configuration_attention",
  "runtime_unavailable",
  "disabled",
  "waiting_for_relationship_profiles",
  "memory_available_waiting_for_relationships",
  "relationship_values_active",
  "relationship_values_attention",
  "ready",
]);
const RELATIONSHIP_BLOCKING_STAGES = new Set([
  "configuration",
  "runtime",
  "candidate_gate",
  "store",
  "relationship_profiles",
  "none",
]);
const RECALL_GATE_STATUSES = new Set([
  "configuration_attention",
  "runtime_unavailable",
  "disabled",
  "waiting_for_memory_records",
  "memory_recall_ready",
  "relationship_recall_ready",
  "memory_relationship_recall_ready",
  "recall_attention",
  "ready",
]);
const RECALL_BLOCKING_STAGES = new Set([
  "configuration",
  "runtime",
  "store",
  "records",
  "none",
]);
const LIFECYCLE_GATE_STATUSES = new Set([
  "configuration_attention",
  "runtime_unavailable",
  "waiting_for_approved_records",
  "memory_only_active",
  "relationship_only_active",
  "memory_and_relationship_active",
  "identity_scope_attention",
  "candidate_gate_attention",
  "store_attention",
  "ready",
]);
const LIFECYCLE_BLOCKING_STAGES = new Set([
  "configuration",
  "runtime",
  "candidate_gate",
  "store",
  "identity_scope",
  "none",
]);
const URL_PATTERN = /https?:\/\//i;

export function createPersistenceLiveReadinessReport({
  env = process.env,
  runtime = null,
  streamState = null,
  runtimeStatusOverride = null,
  generatedAtMs = Date.now(),
} = {}) {
  const launchPlan = createPersistenceLaunchPlan({ env, generatedAtMs });
  const envSetupPlan = createPersistenceEnvSetupPlan({ env, generatedAtMs });
  const runtimeStatus =
    runtimeStatusOverride ??
    createPersistenceRuntimeStatusReport({
      env,
      runtime,
      streamState,
      generatedAtMs,
    });
  assertPersistenceLaunchPlanSafe(
    launchPlan,
    "persistence live readiness launch plan"
  );
  assertPersistenceEnvSetupPlanSafe(
    envSetupPlan,
    "persistence live readiness env setup plan"
  );
  assertPersistenceRuntimeStatusReportSafe(
    runtimeStatus,
    "persistence live readiness runtime status"
  );

  const configurationGate = summarizeConfigurationGate({ launchPlan, runtimeStatus });
  const runtimeGate = summarizeRuntimeGate(runtimeStatus);
  const storeGate = summarizeStoreGate(runtimeStatus);
  const approvedRecordGate = summarizeApprovedRecordGate(runtimeStatus);
  const candidateGate = summarizeCandidateGate(runtimeStatus);
  const relationshipGate = summarizeRelationshipGate(runtimeStatus);
  const recallGate = summarizeRecallGate(runtimeStatus);
  const lifecycleGate = summarizeLifecycleGate(runtimeStatus);
  const liveReadinessStatus = summarizeLiveReadinessStatus({
    configurationGate,
    runtimeGate,
    storeGate,
    approvedRecordGate,
    candidateGate,
    relationshipGate,
    recallGate,
    lifecycleGate,
  });
  const nextGate = firstAttentionGate([
    ["configuration_gate", configurationGate],
    ["runtime_gate", runtimeGate],
    ["store_gate", storeGate],
    ["approved_record_gate", approvedRecordGate],
    ["candidate_gate", candidateGate],
    ["relationship_gate", relationshipGate],
    ["recall_gate", recallGate],
    ["lifecycle_gate", lifecycleGate],
  ]);

  const report = {
    schema: "iris_persistence_live_readiness_report_v1",
    generated_at_ms: generatedAtMs,
    live_readiness_status: liveReadinessStatus,
    persistence_launch_plan_status: launchPlan.plan_status,
    target_stage_id: "memory_and_relationship_persistence",
    persistence_mode: launchPlan.persistence_mode,
    vector_memory_mode: launchPlan.vector_memory_mode,
    env_setup_plan_summary: summarizeEnvSetupPlan(envSetupPlan),
    next_gate_id: nextGate?.gate_id ?? null,
    next_readiness_state: nextGate?.readiness_state ?? "ready",
    readiness_state_counts: countReadinessStates([
      configurationGate,
      runtimeGate,
      storeGate,
      approvedRecordGate,
      candidateGate,
      relationshipGate,
      recallGate,
      lifecycleGate,
    ]),
    next_check_script: nextGate?.next_check_script ?? null,
    configuration_gate: configurationGate,
    runtime_gate: runtimeGate,
    store_gate: storeGate,
    approved_record_gate: approvedRecordGate,
    candidate_gate: candidateGate,
    relationship_gate: relationshipGate,
    recall_gate: recallGate,
    lifecycle_gate: lifecycleGate,
    production_handoff_summary: summarizeProductionHandoff({
      liveReadinessStatus,
      nextGate,
      configurationGate,
      runtimeGate,
      storeGate,
      approvedRecordGate,
      candidateGate,
      relationshipGate,
      recallGate,
      lifecycleGate,
    }),
    verification_scripts: {
      schema: "iris_persistence_live_readiness_scripts_v1",
      local_env_profile_script: "npm run dev:persistence:local-env-profile",
      local_env_apply_plan_script: "npm run dev:persistence:local-env-apply",
      env_setup_plan_script: "npm run dev:persistence:env-setup-plan",
      launch_plan_script: "npm run dev:persistence:launch-plan",
      runtime_status_script: "npm run dev:persistence:runtime-status",
      live_readiness_script: "npm run dev:persistence:live-readiness",
      readiness_rehearsal_script:
        "npm run dev:persistence:readiness-rehearsal",
      persistence_roundtrip_script:
        launchPlan.runtime_persistence_verification.persistence_roundtrip_script,
      candidate_gate_roundtrip_script:
        launchPlan.runtime_persistence_verification.candidate_gate_roundtrip_script,
      vector_memory_bridge_script:
        launchPlan.runtime_persistence_verification.vector_memory_bridge_script,
      vector_memory_roundtrip_script:
        launchPlan.runtime_persistence_verification.vector_memory_roundtrip_script,
      policy_gate_roundtrip_script:
        launchPlan.runtime_persistence_verification.policy_gate_roundtrip_script,
      restart_roundtrip_script:
        launchPlan.runtime_persistence_verification.restart_roundtrip_script,
      backup_roundtrip_script:
        launchPlan.runtime_persistence_verification.backup_roundtrip_script,
      expected_runtime_status: "active_with_memory_and_relationships",
      expected_live_readiness_status: "ready_for_persistence_operation",
      boundary_policy: {
        script_names_only: true,
        no_store_paths: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_memory_records: true,
        no_relationship_records: true,
        no_candidates: true,
        no_commands: true,
      },
    },
    boundary_policy: {
      env_names_only: true,
      counts_statuses_booleans_and_policy_only: true,
      no_secret_values: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_memory_summaries: true,
      no_relationship_scores: true,
      no_viewer_ids: true,
      no_display_names: true,
      no_candidates: true,
      no_commands: true,
      no_raw_runtime_state: true,
      read_only_live_readiness: true,
    },
    adapter_validation_required: true,
  };
  assertPersistenceLiveReadinessReportSafe(report);
  return report;
}

export function assertPersistenceLiveReadinessReportSafe(
  report,
  context = "persistence live readiness report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenPersistenceLiveReadinessFields(report, context);
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_persistence_live_readiness_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!PERSISTENCE_LIVE_READINESS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated time`);
  }
  if (!LIVE_READINESS_STATUSES.has(report.live_readiness_status)) {
    throw new ContractError(`${context}: invalid live readiness status`);
  }
  if (
    ![
      "ready_to_launch_persistence",
      "configure_persistence_env_first",
    ].includes(report.persistence_launch_plan_status)
  ) {
    throw new ContractError(`${context}: invalid launch plan status`);
  }
  if (report.target_stage_id !== "memory_and_relationship_persistence") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (report.persistence_mode !== "json_store") {
    throw new ContractError(`${context}: invalid persistence mode`);
  }
  if (!["local", "http_vector", "unsupported_adapter"].includes(report.vector_memory_mode)) {
    throw new ContractError(`${context}: invalid vector memory mode`);
  }
  assertEnvSetupPlanSummarySafe(report.env_setup_plan_summary, context);
  if (report.next_gate_id !== null && !GATE_IDS.has(report.next_gate_id)) {
    throw new ContractError(`${context}: invalid next gate`);
  }
  if (!READINESS_STATES.has(report.next_readiness_state)) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  assertReadinessStateCountsSafe(
    report.readiness_state_counts,
    `${context}: readiness state counts`
  );
  if (report.next_check_script !== null) {
    assertSafeScriptName(report.next_check_script, `${context}: next check script`);
  }
  assertConfigurationGateSafe(report.configuration_gate, context);
  assertRuntimeGateSafe(report.runtime_gate, context);
  assertStoreGateSafe(report.store_gate, context);
  assertApprovedRecordGateSafe(report.approved_record_gate, context);
  assertCandidateGateSafe(report.candidate_gate, context);
  assertRelationshipGateSafe(report.relationship_gate, context);
  assertRecallGateSafe(report.recall_gate, context);
  assertLifecycleGateSafe(report.lifecycle_gate, context);
  assertProductionHandoffSummarySafe(report.production_handoff_summary, report, context);
  assertVerificationScriptsSafe(report.verification_scripts, context);
  const nextGate = firstAttentionGate([
    ["configuration_gate", report.configuration_gate],
    ["runtime_gate", report.runtime_gate],
    ["store_gate", report.store_gate],
    ["approved_record_gate", report.approved_record_gate],
    ["candidate_gate", report.candidate_gate],
    ["relationship_gate", report.relationship_gate],
    ["recall_gate", report.recall_gate],
    ["lifecycle_gate", report.lifecycle_gate],
  ]);
  if (!nextGate) {
    if (
      report.next_gate_id !== null ||
      report.next_check_script !== null ||
      report.next_readiness_state !== "ready"
    ) {
      throw new ContractError(`${context}: ready report must not expose next gate`);
    }
  } else if (
    report.next_gate_id !== nextGate.gate_id ||
    report.next_readiness_state !== nextGate.readiness_state ||
    report.next_check_script !== nextGate.next_check_script
  ) {
    throw new ContractError(`${context}: next gate must match first attention gate`);
  }
  if (
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      countReadinessStates([
        report.configuration_gate,
        report.runtime_gate,
        report.store_gate,
        report.approved_record_gate,
        report.candidate_gate,
        report.relationship_gate,
        report.recall_gate,
        report.lifecycle_gate,
      ])
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  assertBoundaryPolicy(report.boundary_policy, [
    "env_names_only",
    "counts_statuses_booleans_and_policy_only",
    "no_secret_values",
    "no_store_paths",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
    "no_memory_summaries",
    "no_relationship_scores",
    "no_viewer_ids",
    "no_display_names",
    "no_candidates",
    "no_commands",
    "no_raw_runtime_state",
    "read_only_live_readiness",
  ], context);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function summarizeProductionHandoff({
  liveReadinessStatus,
  nextGate,
  configurationGate,
  runtimeGate,
  storeGate,
  approvedRecordGate,
  candidateGate,
  relationshipGate,
  recallGate,
  lifecycleGate,
}) {
  const gates = [
    configurationGate,
    runtimeGate,
    storeGate,
    approvedRecordGate,
    candidateGate,
    relationshipGate,
    recallGate,
    lifecycleGate,
  ];
  return {
    schema: "iris_persistence_live_readiness_handoff_summary_v1",
    live_readiness_report_only: true,
    no_real_store_mutation_by_report: true,
    memory_candidates_not_committed_directly: true,
    relationship_candidates_not_committed_directly: true,
    approved_records_only_for_persistence: true,
    relationship_profiles_not_exposed: true,
    memory_summaries_not_exposed: true,
    viewer_identity_values_not_exposed: true,
    live_readiness_status: liveReadinessStatus,
    ready_gate_count: gates.filter((gate) => gate.ready === true).length,
    attention_gate_count: gates.filter((gate) => gate.ready !== true).length,
    memory_validated_count: candidateGate.memory_validated_count,
    relationship_validated_count: candidateGate.relationship_validated_count,
    memory_committed_count: candidateGate.memory_committed_count,
    relationship_committed_count: candidateGate.relationship_committed_count,
    rejected_candidate_count: candidateGate.rejected_candidate_count,
    persistence_error_count: candidateGate.persistence_error_count,
    memory_operation_success_count:
      approvedRecordGate.memory_operation_success_count,
    relationship_operation_success_count:
      approvedRecordGate.relationship_operation_success_count,
    memory_record_count: recallGate.memory_record_count,
    relationship_profile_count: relationshipGate.relationship_profile_count,
    next_gate_id: nextGate?.gate_id ?? null,
    next_readiness_state: nextGate?.readiness_state ?? "ready",
    readiness_state_counts: countReadinessStates(gates),
    next_check_script: nextGate?.next_check_script ?? null,
  };
}

function assertProductionHandoffSummarySafe(summary, report, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_persistence_live_readiness_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of [
    "live_readiness_report_only",
    "no_real_store_mutation_by_report",
    "memory_candidates_not_committed_directly",
    "relationship_candidates_not_committed_directly",
    "approved_records_only_for_persistence",
    "relationship_profiles_not_exposed",
    "memory_summaries_not_exposed",
    "viewer_identity_values_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (summary.live_readiness_status !== report.live_readiness_status) {
    throw new ContractError(`${context}: invalid production handoff status`);
  }
  for (const field of [
    "ready_gate_count",
    "attention_gate_count",
    "memory_validated_count",
    "relationship_validated_count",
    "memory_committed_count",
    "relationship_committed_count",
    "rejected_candidate_count",
    "persistence_error_count",
    "memory_operation_success_count",
    "relationship_operation_success_count",
    "memory_record_count",
    "relationship_profile_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (summary.ready_gate_count + summary.attention_gate_count !== GATE_IDS.size) {
    throw new ContractError(`${context}: invalid production handoff gate counts`);
  }
  const readyGateCount = [
    report.configuration_gate,
    report.runtime_gate,
    report.store_gate,
    report.approved_record_gate,
    report.candidate_gate,
    report.relationship_gate,
    report.recall_gate,
    report.lifecycle_gate,
  ].filter((gate) => gate.ready === true).length;
  if (
    summary.ready_gate_count !== readyGateCount ||
    summary.attention_gate_count !== GATE_IDS.size - readyGateCount ||
    summary.memory_validated_count !== report.candidate_gate.memory_validated_count ||
    summary.relationship_validated_count !==
      report.candidate_gate.relationship_validated_count ||
    summary.memory_committed_count !== report.candidate_gate.memory_committed_count ||
    summary.relationship_committed_count !==
      report.candidate_gate.relationship_committed_count ||
    summary.rejected_candidate_count !== report.candidate_gate.rejected_candidate_count ||
    summary.persistence_error_count !== report.candidate_gate.persistence_error_count ||
    summary.memory_operation_success_count !==
      report.approved_record_gate.memory_operation_success_count ||
    summary.relationship_operation_success_count !==
      report.approved_record_gate.relationship_operation_success_count ||
    summary.memory_record_count !== report.recall_gate.memory_record_count ||
    summary.relationship_profile_count !==
      report.relationship_gate.relationship_profile_count
  ) {
    throw new ContractError(`${context}: invalid production handoff totals`);
  }
  if (summary.next_gate_id !== report.next_gate_id) {
    throw new ContractError(`${context}: invalid production handoff next gate`);
  }
  if (summary.next_readiness_state !== report.next_readiness_state) {
    throw new ContractError(`${context}: invalid production handoff next readiness`);
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
  if (summary.next_check_script !== report.next_check_script) {
    throw new ContractError(`${context}: invalid production handoff next script`);
  }
  if (summary.next_gate_id !== null && !GATE_IDS.has(summary.next_gate_id)) {
    throw new ContractError(`${context}: invalid production handoff gate`);
  }
  if (summary.next_check_script !== null) {
    assertSafeScriptName(
      summary.next_check_script,
      `${context}: production handoff next check script`
    );
  }
}

function summarizeEnvSetupPlan(plan) {
  const jsonStoreGroup = findEnvSetupGroup(plan, "json_store_files");
  const approvalFlagsGroup = findEnvSetupGroup(
    plan,
    "candidate_relationship_flags"
  );
  const vectorMemoryGroup = findEnvSetupGroup(plan, "vector_memory_search");
  const verificationGroup = findEnvSetupGroup(plan, "persistence_verification");
  return {
    schema: "iris_persistence_live_readiness_env_setup_summary_v1",
    check_script: "npm run dev:persistence:env-setup-plan",
    plan_status: plan.plan_status,
    preflight_status: plan.preflight_status,
    launch_plan_status: plan.persistence_launch_plan_status,
    env_group_count: plan.env_group_count,
    ready_env_group_count: plan.ready_env_group_count,
    attention_env_group_count: plan.attention_env_group_count,
    missing_required_env_count: plan.missing_required_env_count,
    next_env_group_id: plan.next_env_group_id,
    next_env_group_kind: plan.next_env_group_kind,
    next_attention_reason: plan.next_attention_reason,
    next_configure_env: plan.next_configure_env,
    next_launch_script: plan.next_launch_script,
    next_readiness_script: plan.next_readiness_script,
    json_store_group_ready: jsonStoreGroup?.setup_status === "ready",
    approval_flags_group_ready: approvalFlagsGroup?.setup_status === "ready",
    vector_memory_group_ready: vectorMemoryGroup?.setup_status === "ready",
    verification_group_ready: verificationGroup?.setup_status === "ready",
    vector_memory_target_policy_status:
      vectorMemoryGroup?.vector_memory_target_policy_status ?? "not_applicable",
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      schema_names_only: true,
      fixed_ids_statuses_and_counts_only: true,
      no_secret_values: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
      read_only_env_setup_summary: true,
    },
    adapter_validation_required: true,
  };
}

function findEnvSetupGroup(plan, groupId) {
  return plan.env_groups.find((group) => group.env_group_id === groupId) ?? null;
}

function assertEnvSetupPlanSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: env setup plan summary is required`);
  }
  if (
    summary.schema !==
    "iris_persistence_live_readiness_env_setup_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid env setup plan summary schema`);
  }
  assertSafeScriptName(summary.check_script, `${context}: env setup check script`);
  if (!ENV_SETUP_PLAN_STATUSES.has(summary.plan_status)) {
    throw new ContractError(`${context}: invalid env setup plan status`);
  }
  if (
    ![
      "ready_to_persist_memory_and_relationships",
      "blocked_by_configuration",
    ].includes(summary.preflight_status)
  ) {
    throw new ContractError(`${context}: invalid env setup preflight status`);
  }
  if (
    ![
      "ready_to_launch_persistence",
      "configure_persistence_env_first",
    ].includes(summary.launch_plan_status)
  ) {
    throw new ContractError(`${context}: invalid env setup launch status`);
  }
  for (const field of [
    "env_group_count",
    "ready_env_group_count",
    "attention_env_group_count",
    "missing_required_env_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (summary.next_env_group_id !== null && !ENV_SETUP_GROUP_IDS.has(summary.next_env_group_id)) {
    throw new ContractError(`${context}: invalid next env setup group id`);
  }
  if (
    summary.next_env_group_kind !== null &&
    !ENV_SETUP_GROUP_KINDS.has(summary.next_env_group_kind)
  ) {
    throw new ContractError(`${context}: invalid next env setup group kind`);
  }
  if (
    summary.next_attention_reason !== null &&
    !ENV_SETUP_ATTENTION_REASONS.has(summary.next_attention_reason)
  ) {
    throw new ContractError(`${context}: invalid next env setup reason`);
  }
  assertEnvNameListSafe(summary.next_configure_env, `${context}: next configure env`);
  if (summary.next_launch_script !== null) {
    assertSafeScriptName(summary.next_launch_script, `${context}: next launch script`);
  }
  if (summary.next_readiness_script !== null) {
    assertSafeScriptName(
      summary.next_readiness_script,
      `${context}: next readiness script`
    );
  }
  for (const field of [
    "json_store_group_ready",
    "approval_flags_group_ready",
    "vector_memory_group_ready",
    "verification_group_ready",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid env setup group readiness`);
    }
  }
  if (!TARGET_POLICY_STATUSES.has(summary.vector_memory_target_policy_status)) {
    throw new ContractError(`${context}: invalid vector target policy status`);
  }
  if (summary.plan_status === "ready_for_persistence_env_setup") {
    if (
      summary.next_env_group_id !== null ||
      summary.next_env_group_kind !== null ||
      summary.next_attention_reason !== null ||
      summary.next_launch_script !== null ||
      summary.next_readiness_script !== null ||
      summary.next_configure_env.length !== 0 ||
      summary.attention_env_group_count !== 0
    ) {
      throw new ContractError(`${context}: invalid ready env setup summary`);
    }
  } else if (
    summary.next_env_group_id === null ||
    summary.next_env_group_kind === null ||
    summary.next_attention_reason === null
  ) {
    throw new ContractError(`${context}: invalid attention env setup summary`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "env_names_only",
    "script_names_only",
    "schema_names_only",
    "fixed_ids_statuses_and_counts_only",
    "no_secret_values",
    "no_store_paths",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
    "no_candidates",
    "no_commands",
    "read_only_env_setup_summary",
  ], `${context}: env setup summary`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: env setup summary validation required`);
  }
}

function summarizeConfigurationGate({ launchPlan, runtimeStatus }) {
  const preflightReady =
    runtimeStatus.preflight_status === "ready_to_persist_memory_and_relationships";
  const ready = launchPlan.plan_status === "ready_to_launch_persistence" && preflightReady;
  return {
    schema: "iris_persistence_live_readiness_configuration_gate_v1",
    check_script: CHECK_SCRIPTS.configuration_gate,
    next_check_script: ready ? null : CHECK_SCRIPTS.configuration_gate,
    ready,
    gate_status: ready ? "ready" : "configuration_attention",
    readiness_state: ready ? "ready" : "configuration_waiting",
    preflight_ready: preflightReady,
    memory_store_path_configured: runtimeStatus.memory_store_path_configured,
    relationship_store_path_configured:
      runtimeStatus.relationship_store_path_configured,
    candidate_persistence_ready: runtimeStatus.candidate_persistence_ready,
    relationship_memory_ready: runtimeStatus.relationship_memory_ready,
    vector_memory_adapter_ready: runtimeStatus.vector_memory_adapter_ready,
    preflight_attention_reason_count:
      runtimeStatus.preflight_attention_reason_count,
    diagnostic_detail: createGateDiagnosticDetail("configuration_gate", {
      preflight_ready: preflightReady,
      memory_store_path_configured: runtimeStatus.memory_store_path_configured,
      relationship_store_path_configured:
        runtimeStatus.relationship_store_path_configured,
      candidate_persistence_ready: runtimeStatus.candidate_persistence_ready,
      relationship_memory_ready: runtimeStatus.relationship_memory_ready,
      vector_memory_adapter_ready: runtimeStatus.vector_memory_adapter_ready,
      preflight_attention_reason_count:
        runtimeStatus.preflight_attention_reason_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeRuntimeGate(runtimeStatus) {
  const ready =
    runtimeStatus.runtime_status === "active_with_memory_and_relationships" &&
    runtimeStatus.persistence_status_available === true &&
    runtimeStatus.capability_flags.candidate_persistence === true &&
    runtimeStatus.capability_flags.relationship_memory === true;
  return {
    schema: "iris_persistence_live_readiness_runtime_gate_v1",
    check_script: CHECK_SCRIPTS.runtime_gate,
    next_check_script: ready
      ? null
      : runtimeStatus.next_runtime_check_script ?? CHECK_SCRIPTS.runtime_gate,
    ready,
    gate_status: ready ? "ready" : runtimeStatus.runtime_status,
    readiness_state: ready ? "ready" : runtimeStatus.next_readiness_state,
    runtime_status: runtimeStatus.runtime_status,
    persistence_status_available: runtimeStatus.persistence_status_available,
    persistence_readiness_status:
      runtimeStatus.persistence_readiness_status ?? "disabled",
    memory_record_count: runtimeStatus.runtime_counts.memory_record_count,
    relationship_profile_count:
      runtimeStatus.runtime_counts.relationship_profile_count,
    replay_entry_count: runtimeStatus.runtime_counts.replay_entry_count,
    candidate_review_item_count:
      runtimeStatus.runtime_counts.candidate_review_item_count,
    persistence_enabled: runtimeStatus.capability_flags.persistence === true,
    candidate_persistence_enabled:
      runtimeStatus.capability_flags.candidate_persistence === true,
    relationship_memory_enabled:
      runtimeStatus.capability_flags.relationship_memory === true,
    diagnostic_detail: createGateDiagnosticDetail("runtime_gate", {
      runtime_status: runtimeStatus.runtime_status,
      persistence_status_available: runtimeStatus.persistence_status_available,
      persistence_readiness_status:
        runtimeStatus.persistence_readiness_status ?? "disabled",
      memory_record_count: runtimeStatus.runtime_counts.memory_record_count,
      relationship_profile_count:
        runtimeStatus.runtime_counts.relationship_profile_count,
      replay_entry_count: runtimeStatus.runtime_counts.replay_entry_count,
      candidate_review_item_count:
        runtimeStatus.runtime_counts.candidate_review_item_count,
      persistence_enabled: runtimeStatus.capability_flags.persistence === true,
      candidate_persistence_enabled:
        runtimeStatus.capability_flags.candidate_persistence === true,
      relationship_memory_enabled:
        runtimeStatus.capability_flags.relationship_memory === true,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeStoreGate(runtimeStatus) {
  const memory = runtimeStatus.store_health.memory;
  const relationship = runtimeStatus.store_health.relationship;
  const ready =
    runtimeStatus.preflight_status === "ready_to_persist_memory_and_relationships" &&
    runtimeStatus.memory_store_path_configured === true &&
    runtimeStatus.relationship_store_path_configured === true &&
    memory.health === "ready" &&
    relationship.health === "ready" &&
    memory.operation_health !== "attention" &&
    relationship.operation_health !== "attention" &&
    memory.backup_write_health !== "attention" &&
    relationship.backup_write_health !== "attention" &&
    memory.read_error !== true &&
    relationship.read_error !== true;
  return {
    schema: "iris_persistence_live_readiness_store_gate_v1",
    check_script: CHECK_SCRIPTS.store_gate,
    next_check_script: ready ? null : CHECK_SCRIPTS.store_gate,
    ready,
    gate_status:
      runtimeStatus.preflight_status === "ready_to_persist_memory_and_relationships"
        ? ready
          ? "ready"
          : "store_attention"
        : "configuration_attention",
    readiness_state: ready
      ? "ready"
      : runtimeStatus.preflight_status === "ready_to_persist_memory_and_relationships"
        ? "runtime_waiting"
        : "configuration_waiting",
    memory_store_health: memory.health,
    relationship_store_health: relationship.health,
    memory_activity_available: memory.latest_activity_age_ms !== null,
    relationship_activity_available: relationship.latest_activity_age_ms !== null,
    memory_operation_health: memory.operation_health,
    relationship_operation_health: relationship.operation_health,
    memory_backup_write_health: memory.backup_write_health,
    relationship_backup_write_health: relationship.backup_write_health,
    memory_operation_success_count: memory.operation_success_count,
    relationship_operation_success_count: relationship.operation_success_count,
    memory_operation_error_count: memory.operation_error_count,
    relationship_operation_error_count: relationship.operation_error_count,
    diagnostic_detail: createGateDiagnosticDetail("store_gate", {
      memory_store_health: memory.health,
      relationship_store_health: relationship.health,
      memory_activity_available: memory.latest_activity_age_ms !== null,
      relationship_activity_available: relationship.latest_activity_age_ms !== null,
      memory_operation_health: memory.operation_health,
      relationship_operation_health: relationship.operation_health,
      memory_backup_write_health: memory.backup_write_health,
      relationship_backup_write_health: relationship.backup_write_health,
      memory_operation_success_count: memory.operation_success_count,
      relationship_operation_success_count: relationship.operation_success_count,
      memory_operation_error_count: memory.operation_error_count,
      relationship_operation_error_count: relationship.operation_error_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeApprovedRecordGate(runtimeStatus) {
  const flow = runtimeStatus.approved_record_flow;
  const ready =
    flow.flow_status === "active_with_memory_and_relationships" &&
    flow.relationship_memory_complete === true;
  return {
    schema: "iris_persistence_live_readiness_approved_record_gate_v1",
    check_script: CHECK_SCRIPTS.approved_record_gate,
    next_check_script: ready ? null : CHECK_SCRIPTS.approved_record_gate,
    ready,
    gate_status: ready ? "ready" : flow.flow_status,
    readiness_state: ready ? "ready" : nonReadyGateReadiness(flow.readiness_state),
    approved_record_flow_status: flow.flow_status,
    memory_records_available: flow.memory_records_available,
    relationship_profiles_available: flow.relationship_profiles_available,
    relationship_memory_complete: flow.relationship_memory_complete,
    memory_activity_available: flow.memory_activity_available,
    relationship_activity_available: flow.relationship_activity_available,
    memory_operation_success_count: flow.memory_operation_success_count,
    relationship_operation_success_count:
      flow.relationship_operation_success_count,
    memory_operation_error_count: flow.memory_operation_error_count,
    relationship_operation_error_count:
      flow.relationship_operation_error_count,
    diagnostic_detail: createGateDiagnosticDetail("approved_record_gate", {
      approved_record_flow_status: flow.flow_status,
      memory_records_available: flow.memory_records_available,
      relationship_profiles_available: flow.relationship_profiles_available,
      relationship_memory_complete: flow.relationship_memory_complete,
      memory_activity_available: flow.memory_activity_available,
      relationship_activity_available: flow.relationship_activity_available,
      memory_operation_success_count: flow.memory_operation_success_count,
      relationship_operation_success_count:
        flow.relationship_operation_success_count,
      memory_operation_error_count: flow.memory_operation_error_count,
      relationship_operation_error_count:
        flow.relationship_operation_error_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeCandidateGate(runtimeStatus) {
  const flow = runtimeStatus.candidate_commit_flow;
  const ready =
    flow.blocking_stage === "none" &&
    flow.validation_passed === true &&
    flow.persistence_committed === true &&
    flow.persistence_healthy === true &&
    flow.store_status_healthy === true &&
    [
      "memory_commit_active",
      "relationship_commit_active",
      "memory_relationship_commit_active",
    ].includes(flow.flow_status);
  return {
    schema: "iris_persistence_live_readiness_candidate_gate_v1",
    check_script: CHECK_SCRIPTS.candidate_gate,
    next_check_script: ready
      ? null
      : flow.next_check_script ?? CHECK_SCRIPTS.candidate_gate,
    ready,
    gate_status: ready ? "ready" : flow.flow_status,
    readiness_state: ready ? "ready" : nonReadyGateReadiness(flow.readiness_state),
    candidate_commit_flow_status: flow.flow_status,
    blocking_stage: flow.blocking_stage,
    stream_state_available: flow.stream_state_available,
    validation_seen: flow.validation_seen,
    validation_passed: flow.validation_passed,
    persistence_seen: flow.persistence_seen,
    persistence_committed: flow.persistence_committed,
    persistence_healthy: flow.persistence_healthy,
    store_status_healthy: flow.store_status_healthy,
    memory_validated_count: flow.memory_validated_count,
    relationship_validated_count: flow.relationship_validated_count,
    rejected_candidate_count: flow.rejected_candidate_count,
    memory_committed_count: flow.memory_committed_count,
    relationship_committed_count: flow.relationship_committed_count,
    persistence_error_count: flow.persistence_error_count,
    diagnostic_detail: createGateDiagnosticDetail("candidate_gate", {
      candidate_commit_flow_status: flow.flow_status,
      blocking_stage: flow.blocking_stage,
      stream_state_available: flow.stream_state_available,
      validation_seen: flow.validation_seen,
      validation_passed: flow.validation_passed,
      persistence_seen: flow.persistence_seen,
      persistence_committed: flow.persistence_committed,
      persistence_healthy: flow.persistence_healthy,
      store_status_healthy: flow.store_status_healthy,
      memory_validated_count: flow.memory_validated_count,
      relationship_validated_count: flow.relationship_validated_count,
      rejected_candidate_count: flow.rejected_candidate_count,
      memory_committed_count: flow.memory_committed_count,
      relationship_committed_count: flow.relationship_committed_count,
      persistence_error_count: flow.persistence_error_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeRelationshipGate(runtimeStatus) {
  const flow = runtimeStatus.relationship_value_flow;
  const ready =
    flow.flow_status === "relationship_values_active" &&
    flow.blocking_stage === "none" &&
    flow.identity_scope_enforced === true &&
    flow.direct_candidate_persistence_blocked === true &&
    flow.relationship_profiles_available === true;
  return {
    schema: "iris_persistence_live_readiness_relationship_gate_v1",
    check_script: CHECK_SCRIPTS.relationship_gate,
    next_check_script: ready
      ? null
      : flow.next_check_script ?? CHECK_SCRIPTS.relationship_gate,
    ready,
    gate_status: ready ? "ready" : flow.flow_status,
    readiness_state: ready ? "ready" : nonReadyGateReadiness(flow.readiness_state),
    relationship_value_flow_status: flow.flow_status,
    blocking_stage: flow.blocking_stage,
    relationship_profiles_available: flow.relationship_profiles_available,
    relationship_memory_complete: flow.relationship_memory_complete,
    relationship_activity_available: flow.relationship_activity_available,
    relationship_profile_count: flow.relationship_profile_count,
    relationship_level_known_count: flow.relationship_level_known_count,
    identity_scope_enforced: flow.identity_scope_enforced,
    approved_records_only: flow.approved_records_only,
    direct_candidate_persistence_blocked:
      flow.direct_candidate_persistence_blocked,
    candidate_gate_seen: flow.candidate_gate_seen,
    candidate_validation_passed: flow.candidate_validation_passed,
    diagnostic_detail: createGateDiagnosticDetail("relationship_gate", {
      relationship_value_flow_status: flow.flow_status,
      blocking_stage: flow.blocking_stage,
      relationship_profiles_available: flow.relationship_profiles_available,
      relationship_memory_complete: flow.relationship_memory_complete,
      relationship_activity_available: flow.relationship_activity_available,
      relationship_profile_count: flow.relationship_profile_count,
      relationship_level_known_count: flow.relationship_level_known_count,
      identity_scope_enforced: flow.identity_scope_enforced,
      approved_records_only: flow.approved_records_only,
      direct_candidate_persistence_blocked:
        flow.direct_candidate_persistence_blocked,
      candidate_gate_seen: flow.candidate_gate_seen,
      candidate_validation_passed: flow.candidate_validation_passed,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeRecallGate(runtimeStatus) {
  const flow = runtimeStatus.long_term_recall_flow;
  const ready =
    flow.flow_status === "memory_relationship_recall_ready" &&
    flow.blocking_stage === "none" &&
    flow.public_memory_recall_available === true &&
    flow.per_user_relationship_recall_available === true &&
    flow.durable_restart_recall_ready === true &&
    flow.approved_records_only === true &&
    flow.direct_candidate_persistence_blocked === true;
  return {
    schema: "iris_persistence_live_readiness_recall_gate_v1",
    check_script: CHECK_SCRIPTS.recall_gate,
    next_check_script: ready
      ? null
      : flow.next_check_script ?? CHECK_SCRIPTS.recall_gate,
    ready,
    gate_status: ready ? "ready" : flow.flow_status,
    readiness_state: ready ? "ready" : nonReadyGateReadiness(flow.readiness_state),
    long_term_recall_flow_status: flow.flow_status,
    blocking_stage: flow.blocking_stage,
    public_memory_recall_available: flow.public_memory_recall_available,
    per_user_relationship_recall_available:
      flow.per_user_relationship_recall_available,
    durable_restart_recall_ready: flow.durable_restart_recall_ready,
    identity_scope_enforced: flow.identity_scope_enforced,
    approved_records_only: flow.approved_records_only,
    direct_candidate_persistence_blocked:
      flow.direct_candidate_persistence_blocked,
    memory_record_count: flow.memory_record_count,
    relationship_profile_count: flow.relationship_profile_count,
    diagnostic_detail: createGateDiagnosticDetail("recall_gate", {
      long_term_recall_flow_status: flow.flow_status,
      blocking_stage: flow.blocking_stage,
      public_memory_recall_available: flow.public_memory_recall_available,
      per_user_relationship_recall_available:
        flow.per_user_relationship_recall_available,
      durable_restart_recall_ready: flow.durable_restart_recall_ready,
      identity_scope_enforced: flow.identity_scope_enforced,
      approved_records_only: flow.approved_records_only,
      direct_candidate_persistence_blocked:
        flow.direct_candidate_persistence_blocked,
      memory_record_count: flow.memory_record_count,
      relationship_profile_count: flow.relationship_profile_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeLifecycleGate(runtimeStatus) {
  const flow = runtimeStatus.memory_relationship_lifecycle_flow;
  const ready =
    flow.flow_status === "memory_and_relationship_active" &&
    flow.blocking_stage === "none" &&
    flow.relationship_memory_complete === true &&
    flow.identity_scope_enforced === true &&
    flow.approved_records_only === true &&
    flow.direct_candidate_persistence_blocked === true;
  return {
    schema: "iris_persistence_live_readiness_lifecycle_gate_v1",
    check_script: CHECK_SCRIPTS.lifecycle_gate,
    next_check_script: ready
      ? null
      : flow.next_check_script ?? CHECK_SCRIPTS.lifecycle_gate,
    ready,
    gate_status: ready ? "ready" : flow.flow_status,
    readiness_state: ready ? "ready" : nonReadyGateReadiness(flow.readiness_state),
    lifecycle_flow_status: flow.flow_status,
    blocking_stage: flow.blocking_stage,
    memory_records_available: flow.memory_records_available,
    relationship_profiles_available: flow.relationship_profiles_available,
    relationship_memory_complete: flow.relationship_memory_complete,
    memory_activity_available: flow.memory_activity_available,
    relationship_activity_available: flow.relationship_activity_available,
    identity_scope_enforced: flow.identity_scope_enforced,
    approved_records_only: flow.approved_records_only,
    direct_candidate_persistence_blocked:
      flow.direct_candidate_persistence_blocked,
    candidate_gate_seen: flow.candidate_gate_seen,
    candidate_validation_passed: flow.candidate_validation_passed,
    candidate_persistence_committed: flow.candidate_persistence_committed,
    diagnostic_detail: createGateDiagnosticDetail("lifecycle_gate", {
      lifecycle_flow_status: flow.flow_status,
      blocking_stage: flow.blocking_stage,
      memory_records_available: flow.memory_records_available,
      relationship_profiles_available: flow.relationship_profiles_available,
      relationship_memory_complete: flow.relationship_memory_complete,
      memory_activity_available: flow.memory_activity_available,
      relationship_activity_available: flow.relationship_activity_available,
      identity_scope_enforced: flow.identity_scope_enforced,
      approved_records_only: flow.approved_records_only,
      direct_candidate_persistence_blocked:
        flow.direct_candidate_persistence_blocked,
      candidate_gate_seen: flow.candidate_gate_seen,
      candidate_validation_passed: flow.candidate_validation_passed,
      candidate_persistence_committed: flow.candidate_persistence_committed,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeLiveReadinessStatus({
  configurationGate,
  runtimeGate,
  storeGate,
  approvedRecordGate,
  candidateGate,
  relationshipGate,
  recallGate,
  lifecycleGate,
}) {
  if (configurationGate.ready !== true) return "configuration_attention";
  if (runtimeGate.ready !== true) return "runtime_attention";
  if (storeGate.ready !== true) return "store_attention";
  if (approvedRecordGate.ready !== true) return "waiting_for_records";
  if (candidateGate.ready !== true) return "candidate_gate_attention";
  if (relationshipGate.ready !== true || lifecycleGate.ready !== true) {
    return "relationship_attention";
  }
  if (recallGate.ready !== true) return "recall_attention";
  return "ready_for_persistence_operation";
}

function firstAttentionGate(gates) {
  for (const [gateId, gate] of gates) {
    if (gate?.ready !== true) {
      return {
        gate_id: gateId,
        readiness_state: READINESS_STATES.has(gate?.readiness_state)
          ? gate.readiness_state
          : "operator_review_required",
        next_check_script:
          gate?.next_check_script ?? gate?.check_script ?? CHECK_SCRIPTS[gateId],
      };
    }
  }
  return null;
}

function nonReadyGateReadiness(state) {
  if (!READINESS_STATES.has(state) || state === "ready") {
    return "runtime_waiting";
  }
  return state;
}

function countReadinessStates(items) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const item of items) {
    const state = item.readiness_state;
    if (READINESS_STATES.has(state)) counts[state] += 1;
  }
  return counts;
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: counts required`);
  }
  for (const state of READINESS_STATES) {
    assertNonNegativeInteger(counts[state], `${context}: invalid ${state}`);
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: unexpected readiness state ${key}`);
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

function gateBoundaryPolicy() {
  return {
    counts_statuses_booleans_and_policy_only: true,
    script_names_only: true,
    no_secret_values: true,
    no_store_paths: true,
    no_endpoint_values: true,
    no_memory_records: true,
    no_relationship_records: true,
    no_memory_summaries: true,
    no_relationship_scores: true,
    no_viewer_ids: true,
    no_display_names: true,
    no_candidates: true,
    no_commands: true,
  };
}

function assertConfigurationGateSafe(gate, context) {
  assertGateObject(
    gate,
    "iris_persistence_live_readiness_configuration_gate_v1",
    context
  );
  if (!CONFIGURATION_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid configuration gate status`);
  }
  assertBooleans(gate, context, [
    "ready",
    "preflight_ready",
    "memory_store_path_configured",
    "relationship_store_path_configured",
    "candidate_persistence_ready",
    "relationship_memory_ready",
    "vector_memory_adapter_ready",
  ]);
  assertGateCounts(gate, context, ["preflight_attention_reason_count"]);
  assertGateDiagnosticDetailSafe(
    gate.diagnostic_detail,
    "configuration_gate",
    context
  );
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertRuntimeGateSafe(gate, context) {
  assertGateObject(gate, "iris_persistence_live_readiness_runtime_gate_v1", context);
  if (!RUNTIME_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid runtime gate status`);
  }
  assertBooleans(gate, context, [
    "ready",
    "persistence_status_available",
    "persistence_enabled",
    "candidate_persistence_enabled",
    "relationship_memory_enabled",
  ]);
  assertGateCounts(gate, context, [
    "memory_record_count",
    "relationship_profile_count",
    "replay_entry_count",
    "candidate_review_item_count",
  ]);
  assertStringStatus(gate.runtime_status, `${context}: invalid runtime status`);
  assertStringStatus(
    gate.persistence_readiness_status,
    `${context}: invalid persistence readiness`
  );
  assertGateDiagnosticDetailSafe(gate.diagnostic_detail, "runtime_gate", context);
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertStoreGateSafe(gate, context) {
  assertGateObject(gate, "iris_persistence_live_readiness_store_gate_v1", context);
  if (!STORE_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid store gate status`);
  }
  assertBooleans(gate, context, [
    "ready",
    "memory_activity_available",
    "relationship_activity_available",
  ]);
  for (const field of [
    "memory_store_health",
    "relationship_store_health",
    "memory_operation_health",
    "relationship_operation_health",
    "memory_backup_write_health",
    "relationship_backup_write_health",
  ]) {
    assertStringStatus(gate[field], `${context}: invalid ${field}`);
  }
  assertGateCounts(gate, context, [
    "memory_operation_success_count",
    "relationship_operation_success_count",
    "memory_operation_error_count",
    "relationship_operation_error_count",
  ]);
  assertGateDiagnosticDetailSafe(gate.diagnostic_detail, "store_gate", context);
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertApprovedRecordGateSafe(gate, context) {
  assertGateObject(
    gate,
    "iris_persistence_live_readiness_approved_record_gate_v1",
    context
  );
  if (!APPROVED_RECORD_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid approved record gate status`);
  }
  assertBooleans(gate, context, [
    "ready",
    "memory_records_available",
    "relationship_profiles_available",
    "relationship_memory_complete",
    "memory_activity_available",
    "relationship_activity_available",
  ]);
  assertStringStatus(
    gate.approved_record_flow_status,
    `${context}: invalid approved record flow`
  );
  assertGateCounts(gate, context, [
    "memory_operation_success_count",
    "relationship_operation_success_count",
    "memory_operation_error_count",
    "relationship_operation_error_count",
  ]);
  assertGateDiagnosticDetailSafe(
    gate.diagnostic_detail,
    "approved_record_gate",
    context
  );
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertCandidateGateSafe(gate, context) {
  assertGateObject(gate, "iris_persistence_live_readiness_candidate_gate_v1", context);
  if (!CANDIDATE_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid candidate gate status`);
  }
  if (!CANDIDATE_BLOCKING_STAGES.has(gate.blocking_stage)) {
    throw new ContractError(`${context}: invalid candidate blocking stage`);
  }
  assertBooleans(gate, context, [
    "ready",
    "stream_state_available",
    "validation_seen",
    "validation_passed",
    "persistence_seen",
    "persistence_committed",
    "persistence_healthy",
    "store_status_healthy",
  ]);
  assertStringStatus(
    gate.candidate_commit_flow_status,
    `${context}: invalid candidate flow`
  );
  assertGateCounts(gate, context, [
    "memory_validated_count",
    "relationship_validated_count",
    "rejected_candidate_count",
    "memory_committed_count",
    "relationship_committed_count",
    "persistence_error_count",
  ]);
  assertGateDiagnosticDetailSafe(gate.diagnostic_detail, "candidate_gate", context);
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertRelationshipGateSafe(gate, context) {
  assertGateObject(
    gate,
    "iris_persistence_live_readiness_relationship_gate_v1",
    context
  );
  if (!RELATIONSHIP_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid relationship gate status`);
  }
  if (!RELATIONSHIP_BLOCKING_STAGES.has(gate.blocking_stage)) {
    throw new ContractError(`${context}: invalid relationship blocking stage`);
  }
  assertBooleans(gate, context, [
    "ready",
    "relationship_profiles_available",
    "relationship_memory_complete",
    "relationship_activity_available",
    "identity_scope_enforced",
    "approved_records_only",
    "direct_candidate_persistence_blocked",
    "candidate_gate_seen",
    "candidate_validation_passed",
  ]);
  assertStringStatus(
    gate.relationship_value_flow_status,
    `${context}: invalid relationship flow`
  );
  assertGateCounts(gate, context, [
    "relationship_profile_count",
    "relationship_level_known_count",
  ]);
  assertGateDiagnosticDetailSafe(
    gate.diagnostic_detail,
    "relationship_gate",
    context
  );
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertRecallGateSafe(gate, context) {
  assertGateObject(gate, "iris_persistence_live_readiness_recall_gate_v1", context);
  if (!RECALL_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid recall gate status`);
  }
  if (!RECALL_BLOCKING_STAGES.has(gate.blocking_stage)) {
    throw new ContractError(`${context}: invalid recall blocking stage`);
  }
  assertBooleans(gate, context, [
    "ready",
    "public_memory_recall_available",
    "per_user_relationship_recall_available",
    "durable_restart_recall_ready",
    "identity_scope_enforced",
    "approved_records_only",
    "direct_candidate_persistence_blocked",
  ]);
  assertStringStatus(
    gate.long_term_recall_flow_status,
    `${context}: invalid recall flow`
  );
  assertGateCounts(gate, context, [
    "memory_record_count",
    "relationship_profile_count",
  ]);
  assertGateDiagnosticDetailSafe(gate.diagnostic_detail, "recall_gate", context);
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertLifecycleGateSafe(gate, context) {
  assertGateObject(gate, "iris_persistence_live_readiness_lifecycle_gate_v1", context);
  if (!LIFECYCLE_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid lifecycle gate status`);
  }
  if (!LIFECYCLE_BLOCKING_STAGES.has(gate.blocking_stage)) {
    throw new ContractError(`${context}: invalid lifecycle blocking stage`);
  }
  assertBooleans(gate, context, [
    "ready",
    "memory_records_available",
    "relationship_profiles_available",
    "relationship_memory_complete",
    "memory_activity_available",
    "relationship_activity_available",
    "identity_scope_enforced",
    "approved_records_only",
    "direct_candidate_persistence_blocked",
    "candidate_gate_seen",
    "candidate_validation_passed",
    "candidate_persistence_committed",
  ]);
  assertStringStatus(
    gate.lifecycle_flow_status,
    `${context}: invalid lifecycle flow`
  );
  assertGateDiagnosticDetailSafe(gate.diagnostic_detail, "lifecycle_gate", context);
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_persistence_live_readiness_scripts_v1") {
    throw new ContractError(`${context}: invalid verification scripts schema`);
  }
  for (const field of [
    "local_env_profile_script",
    "local_env_apply_plan_script",
    "env_setup_plan_script",
    "launch_plan_script",
    "runtime_status_script",
    "live_readiness_script",
    "readiness_rehearsal_script",
    "persistence_roundtrip_script",
    "candidate_gate_roundtrip_script",
    "vector_memory_bridge_script",
    "vector_memory_roundtrip_script",
    "policy_gate_roundtrip_script",
    "restart_roundtrip_script",
    "backup_roundtrip_script",
  ]) {
    assertSafeScriptName(scripts[field], `${context}: ${field}`);
  }
  if (scripts.expected_runtime_status !== "active_with_memory_and_relationships") {
    throw new ContractError(`${context}: invalid expected runtime status`);
  }
  if (scripts.expected_live_readiness_status !== "ready_for_persistence_operation") {
    throw new ContractError(`${context}: invalid expected live readiness status`);
  }
  assertBoundaryPolicy(scripts.boundary_policy, [
    "script_names_only",
    "no_store_paths",
    "no_endpoint_values",
    "no_secret_values",
    "no_memory_records",
    "no_relationship_records",
    "no_candidates",
    "no_commands",
  ], `${context}: scripts boundary`);
}

function assertGateObject(gate, schema, context) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate is required`);
  }
  if (gate.schema !== schema) {
    throw new ContractError(`${context}: invalid gate schema`);
  }
  assertSafeScriptName(gate.check_script, `${context}: gate check script`);
  assertGateNextCheckScriptSafe(gate, `${context}: gate next check script`);
  if (!READINESS_STATES.has(gate.readiness_state)) {
    throw new ContractError(`${context}: invalid gate readiness`);
  }
  if (gate.ready === true && gate.readiness_state !== "ready") {
    throw new ContractError(`${context}: ready gate readiness mismatch`);
  }
  if (gate.ready !== true && gate.readiness_state === "ready") {
    throw new ContractError(`${context}: attention gate readiness mismatch`);
  }
}

function assertGateNextCheckScriptSafe(gate, context) {
  if (gate.ready === true) {
    if (gate.next_check_script !== null) {
      throw new ContractError(`${context}: ready gate must not expose next check`);
    }
    return;
  }
  assertSafeScriptName(gate.next_check_script, context);
}

function assertBooleans(gate, context, fields) {
  for (const field of fields) {
    if (typeof gate[field] !== "boolean") {
      throw new ContractError(`${context}: invalid flag ${field}`);
    }
  }
}

function assertGateCounts(gate, context, fields) {
  for (const field of fields) {
    assertNonNegativeInteger(gate[field], `${context}: invalid ${field}`);
  }
}

function createGateDiagnosticDetail(gateId, fields) {
  const detail = {
    schema: "iris_persistence_live_readiness_gate_diagnostic_detail_v1",
    gate_id: gateId,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "boolean") {
      detail[key] = value;
    } else if (Number.isInteger(value) && value >= 0) {
      detail[key] = value;
    } else if (typeof value === "string") {
      detail[key] = safeDiagnosticLabel(value);
    }
  }
  return detail;
}

function assertGateDiagnosticDetailSafe(detail, gateId, context) {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
    throw new ContractError(`${context}: gate diagnostic detail is required`);
  }
  if (
    detail.schema !==
    "iris_persistence_live_readiness_gate_diagnostic_detail_v1"
  ) {
    throw new ContractError(`${context}: invalid gate diagnostic detail schema`);
  }
  if (detail.gate_id !== gateId) {
    throw new ContractError(`${context}: invalid gate diagnostic detail id`);
  }
  for (const [key, value] of Object.entries(detail)) {
    if (!/^[a-zA-Z0-9_:-]+$/.test(key)) {
      throw new ContractError(`${context}: invalid gate diagnostic key`);
    }
    if (key === "schema" || key === "gate_id") continue;
    if (typeof value === "boolean") continue;
    if (Number.isInteger(value) && value >= 0) continue;
    if (typeof value === "string") {
      assertStringStatus(value, `${context}: invalid gate diagnostic label`);
      continue;
    }
    throw new ContractError(`${context}: invalid gate diagnostic value`);
  }
}

function assertGateBoundaryPolicySafe(policy, context) {
  assertBoundaryPolicy(policy, [
    "counts_statuses_booleans_and_policy_only",
    "script_names_only",
    "no_secret_values",
    "no_store_paths",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
    "no_memory_summaries",
    "no_relationship_scores",
    "no_viewer_ids",
    "no_display_names",
    "no_candidates",
    "no_commands",
  ], `${context}: gate`);
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertAdapterValidation(value, context) {
  if (value.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertStringStatus(value, context) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 80 ||
    !/^[a-zA-Z0-9_:-]+$/.test(value)
  ) {
    throw new ContractError(context);
  }
}

function assertSafeScriptName(script, context) {
  if (
    typeof script !== "string" ||
    !/^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      script
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

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function safeDiagnosticLabel(value) {
  const text = String(value).replace(/\s+/g, "_").trim().slice(0, 80);
  return /^[a-zA-Z0-9_:-]+$/.test(text) ? text : "attention";
}

function assertNoForbiddenPersistenceLiveReadinessFields(
  value,
  context,
  path = "root"
) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenPersistenceLiveReadinessFields(
        item,
        context,
        `${path}[${index}]`
      )
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_PERSISTENCE_LIVE_READINESS_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { field, path });
    }
    assertNoForbiddenPersistenceLiveReadinessFields(child, context, `${path}.${field}`);
  }
}
