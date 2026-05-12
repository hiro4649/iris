import { ContractError } from "../../core/contracts.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const ENV_NAME_PATTERN = /^IRIS_[A-Z0-9_]+$/;
const SAFE_SCRIPT_PATTERN =
  /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i;

const FORBIDDEN_FIELDS = new Set([
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
  "recent_summaries",
  "summary",
  "endpoint",
  "url",
  "path",
  "file_path",
  "store_path",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "value",
  "payload",
]);

const PERSISTENCE_STARTUP_CHECKLIST_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "checklist_status",
  "startup_step_count",
  "long_running_service_count",
  "one_shot_rehearsal_count",
  "read_only_check_count",
  "next_startup_step_id",
  "next_startup_script",
  "next_readiness_script",
  "next_readiness_state",
  "startup_readiness_state_counts",
  "next_configure_env",
  "steps",
  "verification_scripts",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);

const STEP_IDS = new Set([
  "start_memory_vector_bridge",
  "review_persistence_local_env",
  "run_vector_memory_roundtrip",
  "review_persistence_runtime_status",
  "review_persistence_live_readiness",
]);

const STARTUP_KINDS = new Set([
  "long_running_service",
  "read_only_check",
  "one_shot_rehearsal",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);

const STEPS = Object.freeze([
  {
    step_id: "start_memory_vector_bridge",
    startup_kind: "long_running_service",
    startup_script: "npm run dev:memory-vector:bridge",
    readiness_script: "npm run dev:memory-vector:roundtrip",
    configure_env: [
      "IRIS_MEMORY_VECTOR_BRIDGE_HOST",
      "IRIS_MEMORY_VECTOR_BRIDGE_PORT",
      "IRIS_MEMORY_SEARCH_ADAPTER",
      "IRIS_MEMORY_SEARCH_ENDPOINT",
    ],
  },
  {
    step_id: "review_persistence_local_env",
    startup_kind: "read_only_check",
    startup_script: "npm run dev:persistence:local-env-profile",
    readiness_script: "npm run dev:persistence:env-setup-plan",
    configure_env: [
      "IRIS_MEMORY_STORE_PATH",
      "IRIS_RELATIONSHIP_STORE_PATH",
      "IRIS_ENABLE_CANDIDATE_PERSISTENCE",
      "IRIS_ENABLE_RELATIONSHIP_MEMORY",
      "IRIS_MEMORY_SEARCH_ENDPOINT",
    ],
  },
  {
    step_id: "run_vector_memory_roundtrip",
    startup_kind: "one_shot_rehearsal",
    startup_script: "npm run dev:memory-vector:roundtrip",
    readiness_script: "npm run dev:persistence:preflight",
    configure_env: [],
  },
  {
    step_id: "review_persistence_runtime_status",
    startup_kind: "read_only_check",
    startup_script: "npm run dev:persistence:runtime-status",
    readiness_script: "npm run dev:persistence:roundtrip",
    configure_env: [],
  },
  {
    step_id: "review_persistence_live_readiness",
    startup_kind: "read_only_check",
    startup_script: "npm run dev:persistence:live-readiness",
    readiness_script: "npm run dev:persistence:readiness-rehearsal",
    configure_env: [],
  },
]);

export function createPersistenceStartupChecklist({
  generatedAtMs = Date.now(),
} = {}) {
  const steps = STEPS.map((step, index) => ({
    schema: "iris_persistence_startup_step_v1",
    sequence_order: index + 1,
    step_id: step.step_id,
    startup_kind: step.startup_kind,
    startup_script: step.startup_script,
    readiness_script: step.readiness_script,
    readiness_state: readinessStateForStartupStep(step),
    configure_env: [...step.configure_env],
    configure_env_count: step.configure_env.length,
    boundary_policy: stepBoundaryPolicy(),
  }));
  const checklist = {
    schema: "iris_persistence_startup_checklist_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "memory_and_relationship_persistence",
    target_stage_priority: 3,
    checklist_status: "ready_to_follow_persistence_startup_checklist",
    startup_step_count: steps.length,
    long_running_service_count: countSteps(steps, "long_running_service"),
    one_shot_rehearsal_count: countSteps(steps, "one_shot_rehearsal"),
    read_only_check_count: countSteps(steps, "read_only_check"),
    next_startup_step_id: steps[0].step_id,
    next_startup_script: steps[0].startup_script,
    next_readiness_script: steps[0].readiness_script,
    next_readiness_state: steps[0].readiness_state,
    startup_readiness_state_counts: countReadinessStates(steps),
    next_configure_env: [...steps[0].configure_env],
    steps,
    verification_scripts: {
      schema: "iris_persistence_startup_verification_scripts_v1",
      vector_memory_bridge_script: "npm run dev:memory-vector:bridge",
      vector_memory_roundtrip_script: "npm run dev:memory-vector:roundtrip",
      local_env_profile_script: "npm run dev:persistence:local-env-profile",
      env_setup_plan_script: "npm run dev:persistence:env-setup-plan",
      runtime_status_script: "npm run dev:persistence:runtime-status",
      live_readiness_script: "npm run dev:persistence:live-readiness",
      readiness_rehearsal_script: "npm run dev:persistence:readiness-rehearsal",
      persistence_roundtrip_script: "npm run dev:persistence:roundtrip",
    },
    production_handoff_summary: {
      schema: "iris_persistence_startup_production_handoff_summary_v1",
      local_vector_bridge_rehearsal_only: true,
      production_vector_search_not_started: true,
      memory_candidates_not_committed_directly: true,
      relationship_candidates_not_committed_directly: true,
      real_memory_record_values_not_required_for_rehearsal: true,
      next_production_decision_ids: [
        "configure_json_store_paths",
        "choose_local_or_private_vector_bridge",
        "configure_vector_search_endpoint",
        "run_persistence_preflight_before_live_memory_search",
      ],
      next_production_decision_count: 4,
      next_plan_script: "npm run dev:persistence:env-setup-plan",
      next_readiness_state: steps[0].readiness_state,
      startup_readiness_state_counts: countReadinessStates(steps),
    },
    boundary_policy: {
      local_or_private_bridge_only: true,
      env_names_only: true,
      script_names_only: true,
      no_secret_values: true,
      no_store_path_values: true,
      no_endpoint_values: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_memory_summaries: true,
      no_candidates: true,
      no_commands: true,
      read_only_checklist: true,
    },
    adapter_validation_required: true,
  };
  assertPersistenceStartupChecklistSafe(checklist);
  return checklist;
}

export function assertPersistenceStartupChecklistSafe(
  checklist,
  context = "persistence startup checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist is required`);
  }
  assertNoForbiddenFields(checklist, context);
  assertNoUrlStrings(checklist, context);
  if (checklist.schema !== "iris_persistence_startup_checklist_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(checklist)) {
    if (!PERSISTENCE_STARTUP_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`, { field });
    }
  }
  if (!Number.isInteger(checklist.generated_at_ms) || checklist.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (checklist.target_stage_id !== "memory_and_relationship_persistence") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (checklist.target_stage_priority !== 3) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (
    checklist.checklist_status !==
    "ready_to_follow_persistence_startup_checklist"
  ) {
    throw new ContractError(`${context}: invalid status`);
  }
  assertStepListSafe(checklist.steps, context);
  if (checklist.startup_step_count !== checklist.steps.length) {
    throw new ContractError(`${context}: invalid step count`);
  }
  for (const field of [
    "long_running_service_count",
    "one_shot_rehearsal_count",
    "read_only_check_count",
  ]) {
    if (!Number.isInteger(checklist[field]) || checklist[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    checklist.long_running_service_count +
      checklist.one_shot_rehearsal_count +
      checklist.read_only_check_count !==
    checklist.startup_step_count
  ) {
    throw new ContractError(`${context}: invalid startup kind counts`);
  }
  if (!STEP_IDS.has(checklist.next_startup_step_id)) {
    throw new ContractError(`${context}: invalid next startup step`);
  }
  assertSafeScriptName(checklist.next_startup_script, context);
  assertSafeScriptName(checklist.next_readiness_script, context);
  assertSafeReadinessState(checklist.next_readiness_state, context);
  assertReadinessStateCountsSafe(
    checklist.startup_readiness_state_counts,
    context
  );
  if (checklist.next_readiness_state !== checklist.steps[0].readiness_state) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  if (
    !sameReadinessStateCounts(
      checklist.startup_readiness_state_counts,
      countReadinessStates(checklist.steps)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  assertEnvNameListSafe(checklist.next_configure_env, `${context}: next env`);
  assertVerificationScriptsSafe(checklist.verification_scripts, context);
  assertProductionHandoffSummarySafe(
    checklist.production_handoff_summary,
    checklist,
    context
  );
  assertBoundaryPolicy(checklist.boundary_policy, [
    "local_or_private_bridge_only",
    "env_names_only",
    "script_names_only",
    "no_secret_values",
    "no_store_path_values",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
    "no_memory_summaries",
    "no_candidates",
    "no_commands",
    "read_only_checklist",
  ], `${context}: boundary policy`);
  if (checklist.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertProductionHandoffSummarySafe(summary, checklist, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (
    summary.schema !==
    "iris_persistence_startup_production_handoff_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of [
    "local_vector_bridge_rehearsal_only",
    "production_vector_search_not_started",
    "memory_candidates_not_committed_directly",
    "relationship_candidates_not_committed_directly",
    "real_memory_record_values_not_required_for_rehearsal",
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
  if (
    new Set(summary.next_production_decision_ids).size !==
    summary.next_production_decision_ids.length
  ) {
    throw new ContractError(`${context}: duplicate production decision ids`);
  }
  for (const decisionId of summary.next_production_decision_ids) {
    if (typeof decisionId !== "string" || !/^[a-z0-9_:-]+$/i.test(decisionId)) {
      throw new ContractError(`${context}: invalid production decision id`);
    }
  }
  assertSafeScriptName(summary.next_plan_script, context);
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(
    summary.startup_readiness_state_counts,
    context
  );
  if (
    summary.next_readiness_state !== checklist.next_readiness_state ||
    !sameReadinessStateCounts(
      summary.startup_readiness_state_counts,
      checklist.startup_readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: production handoff readiness mismatch`);
  }
}

function assertStepListSafe(steps, context) {
  if (!Array.isArray(steps) || steps.length !== STEPS.length) {
    throw new ContractError(`${context}: invalid steps`);
  }
  steps.forEach((step, index) => {
    if (!step || typeof step !== "object" || Array.isArray(step)) {
      throw new ContractError(`${context}: invalid step`);
    }
    if (step.schema !== "iris_persistence_startup_step_v1") {
      throw new ContractError(`${context}: invalid step schema`);
    }
    if (step.sequence_order !== index + 1) {
      throw new ContractError(`${context}: invalid step order`);
    }
    if (!STEP_IDS.has(step.step_id)) {
      throw new ContractError(`${context}: invalid step id`);
    }
    if (!STARTUP_KINDS.has(step.startup_kind)) {
      throw new ContractError(`${context}: invalid startup kind`);
    }
    assertSafeScriptName(step.startup_script, context);
    assertSafeScriptName(step.readiness_script, context);
    assertSafeReadinessState(step.readiness_state, context);
    if (step.readiness_state !== readinessStateForStartupStep(step)) {
      throw new ContractError(`${context}: invalid step readiness state`);
    }
    assertEnvNameListSafe(step.configure_env, `${context}: step env`);
    if (step.configure_env_count !== step.configure_env.length) {
      throw new ContractError(`${context}: invalid step env count`);
    }
    assertStepBoundaryPolicySafe(step.boundary_policy, `${context}: step boundary policy`);
  });
}

function assertStepBoundaryPolicySafe(policy, context) {
  assertBoundaryPolicy(policy, [
    "env_names_only",
    "script_names_only",
    "no_secret_values",
    "no_store_path_values",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
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
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
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
  if (scripts.schema !== "iris_persistence_startup_verification_scripts_v1") {
    throw new ContractError(`${context}: invalid verification schema`);
  }
  for (const [field, value] of Object.entries(scripts)) {
    if (field === "schema") continue;
    assertSafeScriptName(value, `${context}: ${field}`);
  }
}

function countSteps(steps, kind) {
  return steps.filter((step) => step.startup_kind === kind).length;
}

function readinessStateForStartupStep(step) {
  if (step.step_id === "start_memory_vector_bridge") return "runtime_waiting";
  if (step.configure_env?.length > 0) return "configuration_waiting";
  if (step.startup_kind === "one_shot_rehearsal") return "operator_review_required";
  return "operator_review_required";
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

function stepBoundaryPolicy() {
  return {
    env_names_only: true,
    script_names_only: true,
    no_secret_values: true,
    no_store_path_values: true,
    no_endpoint_values: true,
    no_memory_records: true,
    no_relationship_records: true,
    no_candidates: true,
    no_commands: true,
  };
}

function assertSafeScriptName(value, context) {
  if (typeof value !== "string" || !SAFE_SCRIPT_PATTERN.test(value)) {
    throw new ContractError(`${context}: unsafe script`);
  }
}

function assertEnvNameListSafe(values, context) {
  if (!Array.isArray(values)) {
    throw new ContractError(`${context}: env list required`);
  }
  for (const value of values) {
    if (typeof value !== "string" || !ENV_NAME_PATTERN.test(value)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
}

function assertNoForbiddenFields(value, context, path = "$") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe field`, { field, path });
    }
    assertNoForbiddenFields(child, context, `${path}.${field}`);
  }
}

function assertNoUrlStrings(value, context, path = "$") {
  if (typeof value === "string") {
    if (URL_PATTERN.test(value)) {
      throw new ContractError(`${context}: url value leaked`, { path });
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
