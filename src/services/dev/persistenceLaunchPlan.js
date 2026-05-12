import { ContractError } from "../../core/contracts.js";
import {
  assertPersistencePreflightReportSafe,
  createPersistencePreflightReport,
} from "./persistencePreflight.js";

const FORBIDDEN_PERSISTENCE_LAUNCH_PLAN_FIELDS = new Set([
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
  "payload",
  "recent_summaries",
  "summary",
]);

const PLAN_STATUSES = new Set([
  "ready_to_launch_persistence",
  "configure_persistence_env_first",
]);
const PERSISTENCE_LAUNCH_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "plan_status",
  "target_stage_id",
  "target_stage_priority",
  "persistence_mode",
  "vector_memory_mode",
  "launch_sequence",
  "ready_step_count",
  "attention_step_count",
  "next_step_id",
  "next_step_order",
  "next_launch_script",
  "next_readiness_script",
  "next_readiness_state",
  "readiness_state_counts",
  "next_configure_env",
  "missing_required_env_count",
  "persistence_stage_summary",
  "integration_readiness",
  "verification_plan_summary",
  "runtime_persistence_verification",
  "persistence_policy",
  "boundary_policy",
  "adapter_validation_required",
]);
const STEP_STATUSES = new Set(["ready", "missing_required_env", "configuration_attention"]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const PROCESS_IDS = new Set([
  "json_memory_relationship_stores",
  "candidate_relationship_flags",
  "vector_memory_search_bridge",
  "persistence_verification",
]);
const PURPOSES = new Set([
  "configure_json_store_files",
  "enable_approved_candidate_commit",
  "configure_vector_memory_search",
  "verify_persistence_roundtrips",
]);
const TARGET_POLICY_STATUSES = new Set(["allowed", "attention", "not_applicable"]);
const INTEGRATIONS = new Set([
  "memory_and_relationship_persistence",
  "admin_review_private_runner_gate",
  "production_vector_memory",
]);
const RUNTIME_PERSISTENCE_VERIFICATION_SCRIPT_FIELDS = [
  "runtime_status_script",
  "live_readiness_script",
  "readiness_rehearsal_script",
  "status_roundtrip_script",
  "persistence_roundtrip_script",
  "candidate_gate_roundtrip_script",
  "policy_gate_roundtrip_script",
  "restart_roundtrip_script",
  "backup_roundtrip_script",
  "http_roundtrip_script",
  "vector_memory_bridge_script",
  "vector_memory_roundtrip_script",
];

export function createPersistenceLaunchPlan({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const preflight = createPersistencePreflightReport({ env, generatedAtMs });
  assertPersistencePreflightReportSafe(preflight, "persistence launch plan preflight");

  const launchSequence = buildPersistenceLaunchSequence({ env, preflight });
  const readyStepCount = launchSequence.filter(
    (step) => step.launch_readiness_status === "ready"
  ).length;
  const attentionStepCount = launchSequence.filter(
    (step) => step.launch_readiness_status !== "ready"
  ).length;
  const nextStep = launchSequence.find(
    (step) => step.launch_readiness_status !== "ready"
  );
  const missingRequiredEnvCount = uniqueEnvNames(
    launchSequence.flatMap((step) => step.missing_required_env)
  ).length;

  const plan = {
    schema: "iris_persistence_launch_plan_v1",
    generated_at_ms: generatedAtMs,
    plan_status:
      preflight.preflight_status === "ready_to_persist_memory_and_relationships" &&
      attentionStepCount === 0
        ? "ready_to_launch_persistence"
        : "configure_persistence_env_first",
    target_stage_id: "memory_and_relationship_persistence",
    target_stage_priority: 3,
    persistence_mode: preflight.persistence_mode,
    vector_memory_mode: preflight.vector_memory_mode,
    launch_sequence: launchSequence,
    ready_step_count: readyStepCount,
    attention_step_count: attentionStepCount,
    next_step_id: nextStep?.process_id ?? null,
    next_step_order: nextStep?.sequence_order ?? null,
    next_launch_script: nextStep?.launch_script ?? null,
    next_readiness_script: nextStep?.readiness_script ?? null,
    next_readiness_state: nextStep?.readiness_state ?? "ready",
    readiness_state_counts: countReadinessStates(launchSequence),
    next_configure_env: nextStep ? nextConfigureEnv(nextStep) : [],
    missing_required_env_count: missingRequiredEnvCount,
    persistence_stage_summary: {
      schema: "iris_persistence_launch_stage_summary_v1",
      stage_id: preflight.persistence_stage_summary.stage_id,
      stage_status: preflight.persistence_stage_summary.stage_status,
      readiness_state: preflight.persistence_stage_summary.readiness_state,
      integration_count: preflight.persistence_stage_summary.integration_count,
      ready_integration_count:
        preflight.persistence_stage_summary.ready_integration_count,
      attention_integration_count:
        preflight.persistence_stage_summary.attention_integration_count,
      missing_required_env_count:
        preflight.persistence_stage_summary.missing_required_env_count,
      first_verification_script:
        preflight.persistence_stage_summary.first_verification_script,
      verification_script_count:
        preflight.persistence_stage_summary.verification_script_count,
    },
    integration_readiness: preflight.integration_readiness.map((integration) => ({
      schema: "iris_persistence_launch_integration_readiness_v1",
      integration: integration.integration,
      status: integration.status,
      mode: integration.mode,
      readiness_state: integration.readiness_state,
    })),
    verification_plan_summary: {
      schema: "iris_persistence_launch_verification_summary_v1",
      stage_id: "memory_and_relationship_persistence",
      stage_status: preflight.persistence_stage_summary.stage_status,
      first_verification_script:
        preflight.verification_plan_summary.first_verification_script,
      verification_script_count:
        preflight.verification_plan_summary.verification_script_count,
      json_store_fixture_script:
        preflight.verification_plan_summary.json_store_fixture_script,
      json_store_status_script:
        preflight.verification_plan_summary.json_store_status_script,
      json_store_failure_script:
        preflight.verification_plan_summary.json_store_failure_script,
      vector_memory_fixture_script:
        preflight.verification_plan_summary.vector_memory_fixture_script,
      runtime_status_script: "npm run dev:persistence:runtime-status",
      live_readiness_script: "npm run dev:persistence:live-readiness",
      readiness_rehearsal_script:
        "npm run dev:persistence:readiness-rehearsal",
      status_roundtrip_script: "npm run dev:persistence:status-roundtrip",
      candidate_gate_roundtrip_script:
        "npm run dev:persistence:candidate-gate-roundtrip",
      policy_gate_roundtrip_script:
        "npm run dev:persistence:policy-gate-roundtrip",
      restart_roundtrip_script: "npm run dev:persistence:restart-roundtrip",
      backup_roundtrip_script: "npm run dev:persistence:backup-roundtrip",
      http_roundtrip_script: "npm run dev:persistence:http-roundtrip",
    },
    runtime_persistence_verification: {
      schema: "iris_persistence_launch_runtime_verification_v1",
      stage_id: "memory_and_relationship_persistence",
      runtime_status_script: "npm run dev:persistence:runtime-status",
      live_readiness_script: "npm run dev:persistence:live-readiness",
      readiness_rehearsal_script:
        "npm run dev:persistence:readiness-rehearsal",
      status_roundtrip_script: "npm run dev:persistence:status-roundtrip",
      persistence_roundtrip_script: "npm run dev:persistence:roundtrip",
      candidate_gate_roundtrip_script:
        "npm run dev:persistence:candidate-gate-roundtrip",
      policy_gate_roundtrip_script:
        "npm run dev:persistence:policy-gate-roundtrip",
      restart_roundtrip_script: "npm run dev:persistence:restart-roundtrip",
      backup_roundtrip_script: "npm run dev:persistence:backup-roundtrip",
      http_roundtrip_script: "npm run dev:persistence:http-roundtrip",
      vector_memory_bridge_script: "npm run dev:memory-vector:bridge",
      vector_memory_roundtrip_script: "npm run dev:memory-vector:roundtrip",
      script_count: RUNTIME_PERSISTENCE_VERIFICATION_SCRIPT_FIELDS.length,
      runtime_waiting_status_expected: "configured_waiting_for_records",
      runtime_active_status_expected: "active_with_memory_and_relationships",
      live_readiness_status_expected: "ready_for_persistence_operation",
      approved_record_flow_active_status_expected:
        "active_with_memory_and_relationships",
      candidate_commit_flow_active_status_expected:
        "memory_commit_active",
      relationship_value_flow_active_status_expected:
        "relationship_values_active",
      long_term_recall_flow_active_status_expected:
        "memory_relationship_recall_ready",
      memory_relationship_lifecycle_active_status_expected:
        "memory_and_relationship_active",
      candidate_validation_gate_required: true,
      approved_memory_schema_only_required: true,
      approved_relationship_schema_only_required: true,
      private_summaries_filtered_required: true,
      restart_survival_required: true,
      backup_health_required: true,
      boundary_policy: {
        safe_local_scripts_only: true,
        env_names_only: true,
        script_names_only: true,
        no_secret_values: true,
        no_store_paths: true,
        no_endpoint_values: true,
        no_memory_records: true,
        no_relationship_records: true,
        no_candidates: true,
        no_commands: true,
        read_only_plan: true,
      },
    },
    persistence_policy: preflight.persistence_policy,
    boundary_policy: {
      safe_local_scripts_only: true,
      env_names_only: true,
      script_names_only: true,
      no_secret_values: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
      read_only_plan: true,
    },
    adapter_validation_required: true,
  };
  assertPersistenceLaunchPlanSafe(plan);
  return plan;
}

export function assertPersistenceLaunchPlanSafe(
  plan,
  context = "persistence launch plan"
) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: plan is required`);
  }
  assertNoForbiddenPersistenceLaunchPlanFields(plan, context);
  if (plan.schema !== "iris_persistence_launch_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!PERSISTENCE_LAUNCH_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected plan field`, { field });
    }
  }
  if (!PLAN_STATUSES.has(plan.plan_status)) {
    throw new ContractError(`${context}: invalid plan status`);
  }
  if (plan.target_stage_id !== "memory_and_relationship_persistence") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (plan.target_stage_priority !== 3) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (plan.persistence_mode !== "json_store") {
    throw new ContractError(`${context}: invalid persistence mode`);
  }
  if (!["local", "http_vector", "unsupported_adapter"].includes(plan.vector_memory_mode)) {
    throw new ContractError(`${context}: invalid vector memory mode`);
  }
  if (!Array.isArray(plan.launch_sequence) || plan.launch_sequence.length === 0) {
    throw new ContractError(`${context}: launch sequence is required`);
  }
  plan.launch_sequence.forEach((step, index) =>
    assertPersistenceLaunchStepSafe(step, context, index + 1)
  );
  for (const field of [
    "ready_step_count",
    "attention_step_count",
    "missing_required_env_count",
  ]) {
    if (!Number.isInteger(plan[field]) || plan[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (plan.ready_step_count + plan.attention_step_count !== plan.launch_sequence.length) {
    throw new ContractError(`${context}: invalid launch step count summary`);
  }
  const firstAttentionStep = plan.launch_sequence.find(
    (step) => step.launch_readiness_status !== "ready"
  );
  if (plan.attention_step_count === 0) {
    if (
      plan.next_step_id !== null ||
      plan.next_step_order !== null ||
      plan.next_launch_script !== null ||
      plan.next_readiness_script !== null ||
      plan.next_readiness_state !== "ready" ||
      !Array.isArray(plan.next_configure_env) ||
      plan.next_configure_env.length !== 0
    ) {
      throw new ContractError(`${context}: unexpected next step`);
    }
  } else if (
    plan.next_step_id !== firstAttentionStep?.process_id ||
    plan.next_step_order !== firstAttentionStep?.sequence_order ||
    plan.next_launch_script !== firstAttentionStep?.launch_script ||
    plan.next_readiness_script !== firstAttentionStep?.readiness_script ||
    plan.next_readiness_state !== firstAttentionStep?.readiness_state
  ) {
    throw new ContractError(`${context}: invalid next step`);
  }
  assertSafeReadinessState(plan.next_readiness_state, context);
  assertReadinessStateCountsSafe(plan.readiness_state_counts, context);
  if (
    !sameReadinessStateCounts(
      plan.readiness_state_counts,
      countReadinessStates(plan.launch_sequence)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  if (plan.next_launch_script !== null) {
    assertSafeScriptName(plan.next_launch_script, `${context}: next launch script`);
  }
  if (plan.next_readiness_script !== null) {
    assertSafeScriptName(
      plan.next_readiness_script,
      `${context}: next readiness script`
    );
  }
  assertEnvNameListSafe(plan.next_configure_env, `${context}: next configure env`);
  if (
    firstAttentionStep &&
    JSON.stringify(plan.next_configure_env) !==
      JSON.stringify(nextConfigureEnv(firstAttentionStep))
  ) {
    throw new ContractError(`${context}: invalid next configure env`);
  }
  if (plan.plan_status === "ready_to_launch_persistence" && plan.attention_step_count !== 0) {
    throw new ContractError(`${context}: ready launch plan has attention steps`);
  }
  if (
    plan.plan_status === "configure_persistence_env_first" &&
    plan.attention_step_count === 0
  ) {
    throw new ContractError(`${context}: configure plan has no attention steps`);
  }
  assertPersistenceStageSummarySafe(plan.persistence_stage_summary, context);
  assertPersistenceIntegrationReadinessListSafe(plan.integration_readiness, context);
  assertVerificationSummarySafe(plan.verification_plan_summary, context);
  assertRuntimePersistenceVerificationSafe(
    plan.runtime_persistence_verification,
    context
  );
  assertPersistencePolicySafe(plan.persistence_policy, context);
  assertBoundaryPolicySafe(plan.boundary_policy, context);
  if (plan.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function buildPersistenceLaunchSequence({ env, preflight }) {
  return [
    buildJsonStoreStep(env),
    buildFeatureFlagStep(env),
    buildVectorMemoryStep(env, preflight),
    buildVerificationStep(preflight),
  ].map((step, index) => ({ ...step, sequence_order: index + 1 }));
}

function buildJsonStoreStep(env) {
  return buildStep({
    process_id: "json_memory_relationship_stores",
    purpose: "configure_json_store_files",
    launchScript: "npm run dev:persistence:preflight",
    readinessScript: "npm run dev:persistence:backup-roundtrip",
    requiredEnv: ["IRIS_MEMORY_STORE_PATH", "IRIS_RELATIONSHIP_STORE_PATH"],
    configuredRequiredEnv: [
      env.IRIS_MEMORY_STORE_PATH ? "IRIS_MEMORY_STORE_PATH" : null,
      env.IRIS_RELATIONSHIP_STORE_PATH ? "IRIS_RELATIONSHIP_STORE_PATH" : null,
    ].filter(Boolean),
    missingRequiredEnv: [
      env.IRIS_MEMORY_STORE_PATH ? null : "IRIS_MEMORY_STORE_PATH",
      env.IRIS_RELATIONSHIP_STORE_PATH ? null : "IRIS_RELATIONSHIP_STORE_PATH",
    ].filter(Boolean),
    optionalEnv: [
      "IRIS_ENABLE_PERSISTENCE",
      "IRIS_MEMORY_STORE_MAX_RECORDS",
      "IRIS_MEMORY_STORE_DEDUPE",
      "IRIS_RELATIONSHIP_STORE_MAX_PROFILES",
      "IRIS_RELATIONSHIP_RECENT_SUMMARY_LIMIT",
    ],
  });
}

function buildFeatureFlagStep(env) {
  return buildStep({
    process_id: "candidate_relationship_flags",
    purpose: "enable_approved_candidate_commit",
    launchScript: "npm run dev:persistence:preflight",
    readinessScript: "npm run dev:persistence:roundtrip",
    requiredEnv: ["IRIS_ENABLE_CANDIDATE_PERSISTENCE", "IRIS_ENABLE_RELATIONSHIP_MEMORY"],
    configuredRequiredEnv: [
      env.IRIS_ENABLE_CANDIDATE_PERSISTENCE === "true"
        ? "IRIS_ENABLE_CANDIDATE_PERSISTENCE"
        : null,
      env.IRIS_ENABLE_RELATIONSHIP_MEMORY === "true"
        ? "IRIS_ENABLE_RELATIONSHIP_MEMORY"
        : null,
    ].filter(Boolean),
    missingRequiredEnv: [
      env.IRIS_ENABLE_CANDIDATE_PERSISTENCE === "true"
        ? null
        : "IRIS_ENABLE_CANDIDATE_PERSISTENCE",
      env.IRIS_ENABLE_RELATIONSHIP_MEMORY === "true"
        ? null
        : "IRIS_ENABLE_RELATIONSHIP_MEMORY",
    ].filter(Boolean),
    extra: {
      candidate_commit_requires_validation: true,
      relationship_memory_expected_enabled: true,
    },
  });
}

function buildVectorMemoryStep(env, preflight) {
  const missingRequiredEnv = [
    env.IRIS_MEMORY_SEARCH_ADAPTER === "http_vector" ? null : "IRIS_MEMORY_SEARCH_ADAPTER",
    env.IRIS_MEMORY_SEARCH_ENDPOINT ? null : "IRIS_MEMORY_SEARCH_ENDPOINT",
  ].filter(Boolean);
  const configuredRequiredEnv = [
    env.IRIS_MEMORY_SEARCH_ADAPTER === "http_vector" ? "IRIS_MEMORY_SEARCH_ADAPTER" : null,
    env.IRIS_MEMORY_SEARCH_ENDPOINT ? "IRIS_MEMORY_SEARCH_ENDPOINT" : null,
  ].filter(Boolean);
  const targetAttention = preflight.vector_memory_target_policy_status === "attention";
  return buildStep({
    process_id: "vector_memory_search_bridge",
    purpose: "configure_vector_memory_search",
    launchScript: "npm run dev:persistence:preflight",
    readinessScript: "npm run dev:memory-vector:roundtrip",
    requiredEnv: ["IRIS_MEMORY_SEARCH_ADAPTER", "IRIS_MEMORY_SEARCH_ENDPOINT"],
    configuredRequiredEnv,
    missingRequiredEnv,
    optionalEnv: ["IRIS_MEMORY_SEARCH_API_KEY", "IRIS_MEMORY_SEARCH_TIMEOUT_MS"],
    statusOverride:
      missingRequiredEnv.length > 0
        ? "missing_required_env"
        : targetAttention
          ? "configuration_attention"
          : "ready",
    extra: {
      vector_memory_target_policy_status: preflight.vector_memory_target_policy_status,
      vector_memory_required_for_production_search: true,
    },
  });
}

function buildVerificationStep(preflight) {
  return buildStep({
    process_id: "persistence_verification",
    purpose: "verify_persistence_roundtrips",
    launchScript: "npm run dev:persistence:status-roundtrip",
    readinessScript: "npm run dev:persistence:http-roundtrip",
    requiredEnv: [],
    configuredRequiredEnv: [],
    missingRequiredEnv: [],
    statusOverride:
      preflight.preflight_status === "ready_to_persist_memory_and_relationships"
        ? "ready"
        : "configuration_attention",
    optionalEnv: [],
    extra: {
      verification_is_summary_only: true,
    },
  });
}

function buildStep({
  process_id,
  purpose,
  launchScript,
  readinessScript,
  requiredEnv,
  configuredRequiredEnv,
  missingRequiredEnv,
  optionalEnv = [],
  statusOverride = null,
  extra = {},
}) {
  const launchReadinessStatus =
    statusOverride ?? (missingRequiredEnv.length === 0 ? "ready" : "missing_required_env");
  return {
    schema: "iris_persistence_launch_step_v1",
    sequence_order: 0,
    process_id,
    purpose,
    launch_readiness_status: launchReadinessStatus,
    readiness_state: readinessStateForLaunchStatus(launchReadinessStatus),
    launch_script: launchScript,
    readiness_script: readinessScript,
    required_env: requiredEnv,
    optional_env: optionalEnv,
    configured_required_env: configuredRequiredEnv,
    missing_required_env: missingRequiredEnv,
    ...extra,
  };
}

function assertPersistenceLaunchStepSafe(step, context, expectedOrder) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: invalid launch step`);
  }
  if (step.schema !== "iris_persistence_launch_step_v1") {
    throw new ContractError(`${context}: invalid launch step schema`);
  }
  if (step.sequence_order !== expectedOrder) {
    throw new ContractError(`${context}: invalid launch step order`);
  }
  if (!PROCESS_IDS.has(step.process_id)) {
    throw new ContractError(`${context}: invalid process id`);
  }
  if (!PURPOSES.has(step.purpose)) {
    throw new ContractError(`${context}: invalid purpose`);
  }
  if (!STEP_STATUSES.has(step.launch_readiness_status)) {
    throw new ContractError(`${context}: invalid step status`);
  }
  assertSafeReadinessState(step.readiness_state, context);
  if (step.readiness_state !== readinessStateForLaunchStatus(step.launch_readiness_status)) {
    throw new ContractError(`${context}: invalid step readiness state`);
  }
  assertSafeScriptName(step.launch_script, context);
  assertSafeScriptName(step.readiness_script, context);
  for (const field of [
    "required_env",
    "optional_env",
    "configured_required_env",
    "missing_required_env",
  ]) {
    assertEnvNameListSafe(step[field], `${context}: ${field}`);
  }
  if (step.launch_readiness_status === "ready" && step.missing_required_env.length !== 0) {
    throw new ContractError(`${context}: ready step has missing env`);
  }
  if (
    step.launch_readiness_status === "missing_required_env" &&
    step.missing_required_env.length === 0
  ) {
    throw new ContractError(`${context}: missing-env step has no missing env`);
  }
  if (
    step.vector_memory_target_policy_status !== undefined &&
    !TARGET_POLICY_STATUSES.has(step.vector_memory_target_policy_status)
  ) {
    throw new ContractError(`${context}: invalid vector target policy`);
  }
  if (
    step.vector_memory_required_for_production_search !== undefined &&
    step.vector_memory_required_for_production_search !== true
  ) {
    throw new ContractError(`${context}: invalid vector production policy`);
  }
  if (
    step.candidate_commit_requires_validation !== undefined &&
    step.candidate_commit_requires_validation !== true
  ) {
    throw new ContractError(`${context}: invalid candidate validation policy`);
  }
  if (
    step.relationship_memory_expected_enabled !== undefined &&
    step.relationship_memory_expected_enabled !== true
  ) {
    throw new ContractError(`${context}: invalid relationship memory policy`);
  }
  if (
    step.verification_is_summary_only !== undefined &&
    step.verification_is_summary_only !== true
  ) {
    throw new ContractError(`${context}: invalid verification policy`);
  }
}

function assertPersistenceStageSummarySafe(stage, context) {
  if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
    throw new ContractError(`${context}: stage summary is required`);
  }
  if (stage.schema !== "iris_persistence_launch_stage_summary_v1") {
    throw new ContractError(`${context}: invalid stage schema`);
  }
  if (stage.stage_id !== "memory_and_relationship_persistence") {
    throw new ContractError(`${context}: invalid stage id`);
  }
  if (!["ready", "attention"].includes(stage.stage_status)) {
    throw new ContractError(`${context}: invalid stage status`);
  }
  assertSafeReadinessState(stage.readiness_state, context);
  if (stage.stage_status === "ready" && stage.readiness_state !== "ready") {
    throw new ContractError(`${context}: invalid ready stage readiness state`);
  }
  if (stage.stage_status === "attention" && stage.readiness_state === "ready") {
    throw new ContractError(`${context}: invalid attention stage readiness state`);
  }
  for (const field of [
    "integration_count",
    "ready_integration_count",
    "attention_integration_count",
    "missing_required_env_count",
    "verification_script_count",
  ]) {
    if (!Number.isInteger(stage[field]) || stage[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (stage.ready_integration_count + stage.attention_integration_count !== stage.integration_count) {
    throw new ContractError(`${context}: invalid integration count`);
  }
  if (stage.stage_status === "ready" && stage.attention_integration_count !== 0) {
    throw new ContractError(`${context}: ready stage summary has attention checks`);
  }
  if (stage.stage_status === "attention" && stage.attention_integration_count === 0) {
    throw new ContractError(`${context}: attention stage summary has no attention checks`);
  }
  if (stage.first_verification_script !== null) {
    assertSafeScriptName(stage.first_verification_script, context);
  }
}

function assertPersistenceIntegrationReadinessListSafe(readiness, context) {
  if (!Array.isArray(readiness) || readiness.length === 0) {
    throw new ContractError(`${context}: integration readiness is required`);
  }
  const seen = new Set();
  for (const item of readiness) {
    assertPersistenceIntegrationReadinessSafe(item, context);
    seen.add(item.integration);
  }
  for (const integration of INTEGRATIONS) {
    if (!seen.has(integration)) {
      throw new ContractError(`${context}: missing integration`);
    }
  }
}

function assertPersistenceIntegrationReadinessSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: invalid integration readiness`);
  }
  if (item.schema !== "iris_persistence_launch_integration_readiness_v1") {
    throw new ContractError(`${context}: invalid integration readiness schema`);
  }
  if (!INTEGRATIONS.has(item.integration)) {
    throw new ContractError(`${context}: invalid integration`);
  }
  if (!["ready", "attention"].includes(item.status)) {
    throw new ContractError(`${context}: invalid integration status`);
  }
  assertSafeReadinessState(item.readiness_state, context);
  if (item.readiness_state !== readinessStateForIntegration(item)) {
    throw new ContractError(`${context}: invalid integration readiness state`);
  }
  if (typeof item.mode !== "string" || !/^[a-z0-9_]+$/.test(item.mode)) {
    throw new ContractError(`${context}: invalid integration mode`);
  }
}

function readinessStateForLaunchStatus(status) {
  if (status === "ready") return "ready";
  if (status === "missing_required_env") return "configuration_waiting";
  if (status === "configuration_attention") return "operator_review_required";
  return "operator_review_required";
}

function readinessStateForIntegration(integration) {
  return integration.status === "ready" ? "ready" : "configuration_waiting";
}

function countReadinessStates(items) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const item of items) {
    const state = item.readiness_state;
    if (READINESS_STATES.has(state)) counts[state] += 1;
  }
  return counts;
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
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: unexpected readiness state count`);
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
  if (summary.schema !== "iris_persistence_launch_verification_summary_v1") {
    throw new ContractError(`${context}: invalid verification schema`);
  }
  if (summary.stage_id !== "memory_and_relationship_persistence") {
    throw new ContractError(`${context}: invalid verification stage`);
  }
  if (!["ready", "attention"].includes(summary.stage_status)) {
    throw new ContractError(`${context}: invalid verification status`);
  }
  if (summary.first_verification_script !== null) {
    assertSafeScriptName(summary.first_verification_script, context);
  }
  if (
    !Number.isInteger(summary.verification_script_count) ||
    summary.verification_script_count < 0
  ) {
    throw new ContractError(`${context}: invalid verification script count`);
  }
  assertSafeScriptName(summary.json_store_fixture_script, context);
  assertSafeScriptName(summary.json_store_status_script, context);
  assertSafeScriptName(summary.json_store_failure_script, context);
  assertSafeScriptName(summary.vector_memory_fixture_script, context);
  assertSafeScriptName(summary.runtime_status_script, context);
  assertSafeScriptName(summary.live_readiness_script, context);
  assertSafeScriptName(summary.readiness_rehearsal_script, context);
  assertSafeScriptName(summary.status_roundtrip_script, context);
  assertSafeScriptName(summary.candidate_gate_roundtrip_script, context);
  assertSafeScriptName(summary.policy_gate_roundtrip_script, context);
  assertSafeScriptName(summary.restart_roundtrip_script, context);
  assertSafeScriptName(summary.backup_roundtrip_script, context);
  assertSafeScriptName(summary.http_roundtrip_script, context);
}

function assertRuntimePersistenceVerificationSafe(verification, context) {
  if (!verification || typeof verification !== "object" || Array.isArray(verification)) {
    throw new ContractError(`${context}: runtime persistence verification is required`);
  }
  if (verification.schema !== "iris_persistence_launch_runtime_verification_v1") {
    throw new ContractError(`${context}: invalid runtime persistence verification schema`);
  }
  if (verification.stage_id !== "memory_and_relationship_persistence") {
    throw new ContractError(`${context}: invalid runtime persistence verification stage`);
  }
  for (const field of RUNTIME_PERSISTENCE_VERIFICATION_SCRIPT_FIELDS) {
    assertSafeScriptName(verification[field], context);
  }
  if (verification.script_count !== RUNTIME_PERSISTENCE_VERIFICATION_SCRIPT_FIELDS.length) {
    throw new ContractError(`${context}: invalid runtime persistence script count`);
  }
  if (verification.runtime_waiting_status_expected !== "configured_waiting_for_records") {
    throw new ContractError(`${context}: invalid waiting runtime expectation`);
  }
  if (verification.runtime_active_status_expected !== "active_with_memory_and_relationships") {
    throw new ContractError(`${context}: invalid active runtime expectation`);
  }
  if (verification.live_readiness_status_expected !== "ready_for_persistence_operation") {
    throw new ContractError(`${context}: invalid live readiness expectation`);
  }
  if (
    verification.approved_record_flow_active_status_expected !==
    "active_with_memory_and_relationships"
  ) {
    throw new ContractError(`${context}: invalid approved-record flow expectation`);
  }
  if (
    verification.candidate_commit_flow_active_status_expected !==
    "memory_commit_active"
  ) {
    throw new ContractError(`${context}: invalid candidate commit flow expectation`);
  }
  if (
    verification.relationship_value_flow_active_status_expected !==
    "relationship_values_active"
  ) {
    throw new ContractError(`${context}: invalid relationship value flow expectation`);
  }
  if (
    verification.long_term_recall_flow_active_status_expected !==
    "memory_relationship_recall_ready"
  ) {
    throw new ContractError(`${context}: invalid long-term recall flow expectation`);
  }
  if (
    verification.memory_relationship_lifecycle_active_status_expected !==
    "memory_and_relationship_active"
  ) {
    throw new ContractError(`${context}: invalid memory relationship lifecycle expectation`);
  }
  for (const field of [
    "candidate_validation_gate_required",
    "approved_memory_schema_only_required",
    "approved_relationship_schema_only_required",
    "private_summaries_filtered_required",
    "restart_survival_required",
    "backup_health_required",
  ]) {
    if (verification[field] !== true) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertBoundaryPolicySafe(verification.boundary_policy, context);
}

function assertPersistencePolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: persistence policy is required`);
  }
  for (const field of [
    "memory_records_require_approval",
    "relationship_records_require_approval",
    "candidate_records_require_validation",
    "direct_candidate_commit_blocked",
    "relationship_values_require_validated_candidate",
    "long_term_recall_uses_approved_records_only",
    "public_status_counts_only",
    "private_summaries_filtered",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid persistence policy`);
    }
  }
}

function assertBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const requiredFields = [
    "safe_local_scripts_only",
    "env_names_only",
    "script_names_only",
    "no_secret_values",
    "no_store_paths",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
    "no_candidates",
    "no_commands",
    "read_only_plan",
  ];
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

function nextConfigureEnv(step) {
  if (!step) return [];
  const candidates =
    step.missing_required_env.length > 0
      ? step.missing_required_env
      : step.required_env;
  return uniqueEnvNames(candidates);
}

function uniqueEnvNames(names) {
  return [...new Set(names)].filter((name) => /^IRIS_[A-Z0-9_]+$/.test(name));
}

function assertNoForbiddenPersistenceLaunchPlanFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenPersistenceLaunchPlanFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_PERSISTENCE_LAUNCH_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe launch plan field`, { field, path });
    }
    assertNoForbiddenPersistenceLaunchPlanFields(child, context, `${path}.${field}`);
  }
}
