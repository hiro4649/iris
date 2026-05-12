import { ContractError } from "../../core/contracts.js";
import {
  assertPersistenceLaunchPlanSafe,
  createPersistenceLaunchPlan,
} from "./persistenceLaunchPlan.js";
import {
  assertPersistencePreflightReportSafe,
  createPersistencePreflightReport,
} from "./persistencePreflight.js";

const FORBIDDEN_PERSISTENCE_ENV_SETUP_FIELDS = new Set([
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
  "path",
]);

const PLAN_STATUSES = new Set([
  "ready_for_persistence_env_setup",
  "configure_persistence_env_first",
]);
const PREFLIGHT_STATUSES = new Set([
  "ready_to_persist_memory_and_relationships",
  "blocked_by_configuration",
]);
const LAUNCH_PLAN_STATUSES = new Set([
  "ready_to_launch_persistence",
  "configure_persistence_env_first",
]);
const GROUP_STATUSES = new Set(["ready", "attention"]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const ATTENTION_REASONS = new Set([
  "ready",
  "missing_required_env",
  "configuration_attention",
  "vector_target_policy_attention",
]);
const PERSISTENCE_MODES = new Set(["json_store"]);
const VECTOR_MEMORY_MODES = new Set(["local", "http_vector", "unsupported_adapter"]);
const TARGET_POLICY_STATUSES = new Set(["allowed", "attention", "not_applicable"]);
const ENV_GROUP_IDS = new Set([
  "json_store_files",
  "candidate_relationship_flags",
  "vector_memory_search",
  "persistence_verification",
]);
const ENV_GROUP_KINDS = new Set([
  "json_store_config",
  "feature_flag_config",
  "vector_memory_config",
  "verification_config",
]);
const PROCESS_IDS = new Set([
  "json_memory_relationship_stores",
  "candidate_relationship_flags",
  "vector_memory_search_bridge",
  "persistence_verification",
]);
const PROCESS_TO_GROUP = {
  json_memory_relationship_stores: {
    envGroupId: "json_store_files",
    envGroupKind: "json_store_config",
    guidanceLabels: ["json_files_required"],
  },
  candidate_relationship_flags: {
    envGroupId: "candidate_relationship_flags",
    envGroupKind: "feature_flag_config",
    guidanceLabels: ["approval_flags_required"],
  },
  vector_memory_search_bridge: {
    envGroupId: "vector_memory_search",
    envGroupKind: "vector_memory_config",
    guidanceLabels: ["vector_adapter_required", "target_local_only"],
  },
  persistence_verification: {
    envGroupId: "persistence_verification",
    envGroupKind: "verification_config",
    guidanceLabels: ["roundtrip_verification_required"],
  },
};
const GUIDANCE_LABELS = new Set([
  "json_files_required",
  "approval_flags_required",
  "vector_adapter_required",
  "target_local_only",
  "roundtrip_verification_required",
]);
const PERSISTENCE_POLICY_FIELDS = [
  "memory_records_require_approval",
  "relationship_records_require_approval",
  "candidate_records_require_validation",
  "direct_candidate_commit_blocked",
  "relationship_values_require_validated_candidate",
  "long_term_recall_uses_approved_records_only",
  "public_status_counts_only",
  "private_summaries_filtered",
];
const URL_PATTERN = /\bhttps?:\/\//i;
const UNSAFE_LABEL_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory|relationship|candidate|canonical|secret|token|password|authorization|endpoint|url|payload|text)\b|https?:\/\//i;
const PERSISTENCE_ENV_SETUP_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "plan_status",
  "preflight_status",
  "persistence_launch_plan_status",
  "persistence_mode",
  "vector_memory_mode",
  "env_group_count",
  "ready_env_group_count",
  "attention_env_group_count",
  "next_env_group_id",
  "next_env_group_kind",
  "next_attention_reason",
  "next_readiness_state",
  "readiness_state_counts",
  "next_configure_env",
  "next_launch_script",
  "next_readiness_script",
  "missing_required_env_count",
  "env_groups",
  "verification_scripts",
  "persistence_policy",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);

export function createPersistenceEnvSetupPlan({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const preflight = createPersistencePreflightReport({ env, generatedAtMs });
  const launchPlan = createPersistenceLaunchPlan({ env, generatedAtMs });
  assertPersistencePreflightReportSafe(preflight, "persistence env setup preflight");
  assertPersistenceLaunchPlanSafe(launchPlan, "persistence env setup launch plan");

  const envGroups = buildEnvGroups(launchPlan.launch_sequence);
  const nextGroup = envGroups.find((group) => group.setup_status !== "ready") ?? null;
  const readyEnvGroupCount = envGroups.filter(
    (group) => group.setup_status === "ready"
  ).length;
  const plan = {
    schema: "iris_persistence_env_setup_plan_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "memory_and_relationship_persistence",
    target_stage_priority: 3,
    plan_status:
      nextGroup === null && launchPlan.plan_status === "ready_to_launch_persistence"
        ? "ready_for_persistence_env_setup"
        : "configure_persistence_env_first",
    preflight_status: preflight.preflight_status,
    persistence_launch_plan_status: launchPlan.plan_status,
    persistence_mode: launchPlan.persistence_mode,
    vector_memory_mode: launchPlan.vector_memory_mode,
    env_group_count: envGroups.length,
    ready_env_group_count: readyEnvGroupCount,
    attention_env_group_count: envGroups.length - readyEnvGroupCount,
    next_env_group_id: nextGroup?.env_group_id ?? null,
    next_env_group_kind: nextGroup?.env_group_kind ?? null,
    next_attention_reason: nextGroup?.attention_reason ?? null,
    next_readiness_state: nextGroup?.readiness_state ?? "ready",
    readiness_state_counts: countReadinessStates(envGroups),
    next_configure_env: nextGroup?.next_configure_env ?? [],
    next_launch_script: nextGroup?.launch_script ?? null,
    next_readiness_script: nextGroup?.readiness_script ?? null,
    missing_required_env_count: launchPlan.missing_required_env_count,
    env_groups: envGroups,
    verification_scripts: {
      schema: "iris_persistence_env_setup_plan_scripts_v1",
      local_env_profile_script: "npm run dev:persistence:local-env-profile",
      local_env_apply_plan_script: "npm run dev:persistence:local-env-apply",
      env_setup_plan_script: "npm run dev:persistence:env-setup-plan",
      startup_checklist_script: "npm run dev:persistence:startup-checklist",
      preflight_script: "npm run dev:persistence:preflight",
      launch_plan_script: "npm run dev:persistence:launch-plan",
      runtime_status_script:
        launchPlan.runtime_persistence_verification.runtime_status_script,
      live_readiness_script:
        launchPlan.runtime_persistence_verification.live_readiness_script,
      readiness_rehearsal_script:
        launchPlan.runtime_persistence_verification.readiness_rehearsal_script,
      status_roundtrip_script:
        launchPlan.runtime_persistence_verification.status_roundtrip_script,
      persistence_roundtrip_script:
        launchPlan.runtime_persistence_verification.persistence_roundtrip_script,
      candidate_gate_roundtrip_script:
        launchPlan.runtime_persistence_verification.candidate_gate_roundtrip_script,
      policy_gate_roundtrip_script:
        launchPlan.runtime_persistence_verification.policy_gate_roundtrip_script,
      restart_roundtrip_script:
        launchPlan.runtime_persistence_verification.restart_roundtrip_script,
      backup_roundtrip_script:
        launchPlan.runtime_persistence_verification.backup_roundtrip_script,
      http_roundtrip_script:
        launchPlan.runtime_persistence_verification.http_roundtrip_script,
      vector_memory_bridge_script:
        launchPlan.runtime_persistence_verification.vector_memory_bridge_script,
      vector_memory_roundtrip_script:
        launchPlan.runtime_persistence_verification.vector_memory_roundtrip_script,
    },
    persistence_policy: preflight.persistence_policy,
    production_handoff_summary: {
      schema: "iris_persistence_env_setup_production_handoff_summary_v1",
      env_setup_plan_only: true,
      production_vector_search_not_started: true,
      real_store_paths_not_required_for_plan: true,
      real_memory_record_values_not_required_for_plan: true,
      memory_candidates_not_committed_directly: true,
      relationship_candidates_not_committed_directly: true,
      next_production_decision_ids: [
        "configure_json_store_paths",
        "enable_candidate_persistence_flags",
        "choose_local_or_private_vector_bridge",
        "run_persistence_preflight_before_live_memory_search",
      ],
      next_production_decision_count: 4,
      next_status_script: "npm run dev:persistence:runtime-status",
      next_readiness_state: nextGroup?.readiness_state ?? "ready",
      readiness_state_counts: countReadinessStates(envGroups),
    },
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
      no_memory_summaries: true,
      no_relationship_scores: true,
      no_candidates: true,
      no_commands: true,
      read_only_env_setup_plan: true,
    },
    adapter_validation_required: true,
  };
  assertPersistenceEnvSetupPlanSafe(plan);
  return plan;
}

export function assertPersistenceEnvSetupPlanSafe(
  plan,
  context = "persistence env setup plan"
) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: plan is required`);
  }
  assertNoForbiddenPersistenceEnvSetupFields(plan, context);
  assertNoUrlStrings(plan, context);
  if (plan.schema !== "iris_persistence_env_setup_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!PERSISTENCE_ENV_SETUP_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected plan field`, { field });
    }
  }
  if (!Number.isInteger(plan.generated_at_ms) || plan.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (plan.target_stage_id !== "memory_and_relationship_persistence") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (plan.target_stage_priority !== 3) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!PLAN_STATUSES.has(plan.plan_status)) {
    throw new ContractError(`${context}: invalid plan status`);
  }
  if (!PREFLIGHT_STATUSES.has(plan.preflight_status)) {
    throw new ContractError(`${context}: invalid preflight status`);
  }
  if (!LAUNCH_PLAN_STATUSES.has(plan.persistence_launch_plan_status)) {
    throw new ContractError(`${context}: invalid launch plan status`);
  }
  if (!PERSISTENCE_MODES.has(plan.persistence_mode)) {
    throw new ContractError(`${context}: invalid persistence mode`);
  }
  if (!VECTOR_MEMORY_MODES.has(plan.vector_memory_mode)) {
    throw new ContractError(`${context}: invalid vector memory mode`);
  }
  if (!Array.isArray(plan.env_groups) || plan.env_groups.length === 0) {
    throw new ContractError(`${context}: env groups are required`);
  }
  plan.env_groups.forEach((group, index) =>
    assertEnvSetupGroupSafe(group, context, index + 1)
  );
  for (const field of [
    "env_group_count",
    "ready_env_group_count",
    "attention_env_group_count",
    "missing_required_env_count",
  ]) {
    assertNonNegativeInteger(plan[field], `${context}: invalid ${field}`);
  }
  if (plan.env_group_count !== plan.env_groups.length) {
    throw new ContractError(`${context}: invalid env group count`);
  }
  if (
    plan.ready_env_group_count !==
    plan.env_groups.filter((group) => group.setup_status === "ready").length
  ) {
    throw new ContractError(`${context}: invalid ready env group count`);
  }
  if (
    plan.attention_env_group_count !==
    plan.env_groups.filter((group) => group.setup_status !== "ready").length
  ) {
    throw new ContractError(`${context}: invalid attention env group count`);
  }
  const firstAttentionGroup =
    plan.env_groups.find((group) => group.setup_status !== "ready") ?? null;
  if (firstAttentionGroup === null) {
    if (
      plan.plan_status !== "ready_for_persistence_env_setup" ||
      plan.next_env_group_id !== null ||
      plan.next_env_group_kind !== null ||
      plan.next_attention_reason !== null ||
      plan.next_readiness_state !== "ready" ||
      plan.next_launch_script !== null ||
      plan.next_readiness_script !== null ||
      !Array.isArray(plan.next_configure_env) ||
      plan.next_configure_env.length !== 0
    ) {
      throw new ContractError(`${context}: unexpected next env group`);
    }
  } else if (
    plan.plan_status !== "configure_persistence_env_first" ||
    plan.next_env_group_id !== firstAttentionGroup.env_group_id ||
    plan.next_env_group_kind !== firstAttentionGroup.env_group_kind ||
    plan.next_attention_reason !== firstAttentionGroup.attention_reason ||
    plan.next_readiness_state !== firstAttentionGroup.readiness_state ||
    plan.next_launch_script !== firstAttentionGroup.launch_script ||
    plan.next_readiness_script !== firstAttentionGroup.readiness_script ||
    JSON.stringify(plan.next_configure_env) !==
      JSON.stringify(firstAttentionGroup.next_configure_env)
  ) {
    throw new ContractError(`${context}: invalid next env group`);
  }
  assertSafeReadinessState(plan.next_readiness_state, context);
  assertReadinessStateCountsSafe(plan.readiness_state_counts, context);
  if (
    !sameReadinessStateCounts(
      plan.readiness_state_counts,
      countReadinessStates(plan.env_groups)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  assertEnvNameListSafe(plan.next_configure_env, `${context}: next configure env`);
  assertVerificationScriptsSafe(plan.verification_scripts, context);
  assertPersistencePolicySafe(plan.persistence_policy, context);
  assertProductionHandoffSummarySafe(plan.production_handoff_summary, plan, context);
  assertBoundaryPolicy(plan.boundary_policy, [
    "env_names_only",
    "script_names_only",
    "schema_names_only",
    "fixed_ids_statuses_and_counts_only",
    "no_secret_values",
    "no_store_paths",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
    "no_memory_summaries",
    "no_relationship_scores",
    "no_candidates",
    "no_commands",
    "read_only_env_setup_plan",
  ], context);
  if (plan.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertProductionHandoffSummarySafe(summary, plan, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (
    summary.schema !==
    "iris_persistence_env_setup_production_handoff_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of [
    "env_setup_plan_only",
    "production_vector_search_not_started",
    "real_store_paths_not_required_for_plan",
    "real_memory_record_values_not_required_for_plan",
    "memory_candidates_not_committed_directly",
    "relationship_candidates_not_committed_directly",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (
    !Array.isArray(summary.next_production_decision_ids) ||
    summary.next_production_decision_ids.length !==
      summary.next_production_decision_count
  ) {
    throw new ContractError(`${context}: invalid production decision count`);
  }
  for (const decisionId of summary.next_production_decision_ids) {
    if (typeof decisionId !== "string" || !/^[a-z0-9_:-]+$/i.test(decisionId)) {
      throw new ContractError(`${context}: invalid production decision id`);
    }
  }
  assertSafeScriptName(summary.next_status_script, context);
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  if (
    summary.next_readiness_state !== plan.next_readiness_state ||
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      plan.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: production handoff readiness mismatch`);
  }
}

function buildEnvGroups(launchSequence) {
  return launchSequence.map((step, index) =>
    buildEnvGroupFromLaunchStep(step, index + 1)
  );
}

function buildEnvGroupFromLaunchStep(step, sequenceOrder) {
  const mapping = PROCESS_TO_GROUP[step.process_id];
  const setupStatus = setupStatusForStep(step);
  return {
    schema: "iris_persistence_env_setup_group_v1",
    sequence_order: sequenceOrder,
    env_group_id: mapping.envGroupId,
    env_group_kind: mapping.envGroupKind,
    persistence_mode_scope: "json_store",
    vector_memory_mode_scope:
      step.process_id === "vector_memory_search_bridge" ? "http_vector" : "local",
    setup_status: setupStatus,
    attention_reason: attentionReasonForStep(step),
    readiness_state: readinessStateForAttentionReason(attentionReasonForStep(step)),
    process_ref: step.process_id,
    required_env: uniqueEnvNames(step.required_env),
    optional_env: uniqueEnvNames(step.optional_env),
    configured_required_env: uniqueEnvNames(step.configured_required_env),
    missing_required_env: uniqueEnvNames(step.missing_required_env),
    next_configure_env:
      setupStatus === "ready" ? [] : nextConfigureEnvForStep(step),
    launch_script: step.launch_script,
    readiness_script: step.readiness_script,
    guidance_labels: mapping.guidanceLabels,
    vector_memory_target_policy_status:
      step.vector_memory_target_policy_status ?? "not_applicable",
    blocks_memory_relationship_persistence:
      step.launch_readiness_status !== "ready",
    blocks_vector_recall:
      step.process_id === "vector_memory_search_bridge" &&
      step.launch_readiness_status !== "ready",
    blocks_restart_durability:
      ["json_memory_relationship_stores", "persistence_verification"].includes(
        step.process_id
      ) && step.launch_readiness_status !== "ready",
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      process_ids_only: true,
      guidance_labels_only: true,
      no_secret_values: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_memory_summaries: true,
      no_candidates: true,
      no_commands: true,
      read_only_env_group: true,
    },
    adapter_validation_required: true,
  };
}

function setupStatusForStep(step) {
  return step.launch_readiness_status === "ready" ? "ready" : "attention";
}

function attentionReasonForStep(step) {
  if (setupStatusForStep(step) === "ready") return "ready";
  if (
    step.launch_readiness_status === "configuration_attention" &&
    step.vector_memory_target_policy_status === "attention"
  ) {
    return "vector_target_policy_attention";
  }
  if (step.launch_readiness_status === "configuration_attention") {
    return "configuration_attention";
  }
  return "missing_required_env";
}

function readinessStateForAttentionReason(reason) {
  if (reason === "ready") return "ready";
  if (reason === "vector_target_policy_attention") return "operator_review_required";
  return "configuration_waiting";
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
    assertNonNegativeInteger(counts[state], `${context}: invalid ${state} count`);
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

function nextConfigureEnvForStep(step) {
  if (step.missing_required_env.length > 0) {
    return uniqueEnvNames(step.missing_required_env);
  }
  if (step.launch_readiness_status === "configuration_attention") {
    return uniqueEnvNames(step.required_env);
  }
  return [];
}

function assertEnvSetupGroupSafe(group, context, expectedOrder) {
  if (!group || typeof group !== "object" || Array.isArray(group)) {
    throw new ContractError(`${context}: invalid env group`);
  }
  if (group.schema !== "iris_persistence_env_setup_group_v1") {
    throw new ContractError(`${context}: invalid env group schema`);
  }
  if (group.sequence_order !== expectedOrder) {
    throw new ContractError(`${context}: invalid env group order`);
  }
  if (!ENV_GROUP_IDS.has(group.env_group_id)) {
    throw new ContractError(`${context}: invalid env group id`);
  }
  if (!ENV_GROUP_KINDS.has(group.env_group_kind)) {
    throw new ContractError(`${context}: invalid env group kind`);
  }
  if (!PERSISTENCE_MODES.has(group.persistence_mode_scope)) {
    throw new ContractError(`${context}: invalid persistence mode scope`);
  }
  if (!VECTOR_MEMORY_MODES.has(group.vector_memory_mode_scope)) {
    throw new ContractError(`${context}: invalid vector memory mode scope`);
  }
  if (!GROUP_STATUSES.has(group.setup_status)) {
    throw new ContractError(`${context}: invalid setup status`);
  }
  if (!ATTENTION_REASONS.has(group.attention_reason)) {
    throw new ContractError(`${context}: invalid attention reason`);
  }
  assertSafeReadinessState(group.readiness_state, context);
  if (group.readiness_state !== readinessStateForAttentionReason(group.attention_reason)) {
    throw new ContractError(`${context}: invalid env group readiness state`);
  }
  if ((group.setup_status === "ready") !== (group.attention_reason === "ready")) {
    throw new ContractError(`${context}: invalid attention status pairing`);
  }
  if (!PROCESS_IDS.has(group.process_ref)) {
    throw new ContractError(`${context}: invalid process ref`);
  }
  const expectedMapping = PROCESS_TO_GROUP[group.process_ref];
  if (
    group.env_group_id !== expectedMapping.envGroupId ||
    group.env_group_kind !== expectedMapping.envGroupKind ||
    JSON.stringify(group.guidance_labels) !==
      JSON.stringify(expectedMapping.guidanceLabels)
  ) {
    throw new ContractError(`${context}: invalid process group mapping`);
  }
  for (const field of [
    "required_env",
    "optional_env",
    "configured_required_env",
    "missing_required_env",
    "next_configure_env",
  ]) {
    assertEnvNameListSafe(group[field], `${context}: ${field}`);
  }
  if (
    group.setup_status === "ready" &&
    (group.missing_required_env.length !== 0 || group.next_configure_env.length !== 0)
  ) {
    throw new ContractError(`${context}: ready group has attention details`);
  }
  assertSafeScriptName(group.launch_script, `${context}: launch script`);
  assertSafeScriptName(group.readiness_script, `${context}: readiness script`);
  assertGuidanceLabelListSafe(group.guidance_labels, `${context}: guidance labels`);
  if (!TARGET_POLICY_STATUSES.has(group.vector_memory_target_policy_status)) {
    throw new ContractError(`${context}: invalid vector target policy`);
  }
  for (const field of [
    "blocks_memory_relationship_persistence",
    "blocks_vector_recall",
    "blocks_restart_durability",
  ]) {
    if (typeof group[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertBoundaryPolicy(group.boundary_policy, [
    "env_names_only",
    "script_names_only",
    "process_ids_only",
    "guidance_labels_only",
    "no_secret_values",
    "no_store_paths",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
    "no_memory_summaries",
    "no_candidates",
    "no_commands",
    "read_only_env_group",
  ], `${context}: env group`);
  if (group.adapter_validation_required !== true) {
    throw new ContractError(`${context}: env group validation required`);
  }
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

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_persistence_env_setup_plan_scripts_v1") {
    throw new ContractError(`${context}: invalid verification scripts schema`);
  }
  for (const [field, value] of Object.entries(scripts)) {
    if (field === "schema") continue;
    assertSafeScriptName(value, `${context}: ${field}`);
  }
}

function assertPersistencePolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: persistence policy is required`);
  }
  for (const field of PERSISTENCE_POLICY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid persistence policy`);
    }
  }
}

function uniqueEnvNames(names) {
  return [...new Set(names.filter(Boolean))];
}

function assertEnvNameListSafe(value, context) {
  if (!Array.isArray(value)) {
    throw new ContractError(`${context}: env list must be an array`);
  }
  for (const item of value) {
    if (typeof item !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(item)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
}

function assertGuidanceLabelListSafe(value, context) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ContractError(`${context}: guidance labels are required`);
  }
  for (const label of value) {
    assertSafePublicLabel(label, context);
    if (!GUIDANCE_LABELS.has(label)) {
      throw new ContractError(`${context}: unknown guidance label`);
    }
  }
}

function assertSafeScriptName(value, context) {
  if (
    typeof value !== "string" ||
    !/^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      value
    )
  ) {
    throw new ContractError(`${context}: invalid script name`);
  }
  if (/[;&|<>]/.test(value)) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function assertSafePublicLabel(value, context) {
  if (typeof value !== "string" || value.length === 0 || value.length > 120) {
    throw new ContractError(`${context}: invalid public label`);
  }
  if (UNSAFE_LABEL_PATTERN.test(value)) {
    throw new ContractError(`${context}: unsafe public label`);
  }
  if (!/^[a-z0-9_.:-]+$/.test(value)) {
    throw new ContractError(`${context}: invalid public label shape`);
  }
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function assertNoForbiddenPersistenceEnvSetupFields(
  value,
  context,
  path = "root"
) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenPersistenceEnvSetupFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_PERSISTENCE_ENV_SETUP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe field`, { field, path });
    }
    assertNoForbiddenPersistenceEnvSetupFields(child, context, `${path}.${field}`);
  }
}

function assertNoUrlStrings(value, context, path = "root") {
  if (typeof value === "string") {
    if (URL_PATTERN.test(value)) {
      throw new ContractError(`${context}: endpoint values must not be exposed`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUrlStrings(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUrlStrings(child, context, `${path}.${field}`);
  }
}
