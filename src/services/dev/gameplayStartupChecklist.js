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
  "canonical",
  "canonical_envelope",
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
  "authorization",
  "value",
  "payload",
  "raw_frame",
  "frame",
  "image",
  "ocr_text",
  "candidate",
  "command",
]);

const GAMEPLAY_STARTUP_CHECKLIST_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "checklist_status",
  "startup_step_count",
  "operator_bridge_start_count",
  "one_shot_rehearsal_count",
  "read_only_check_count",
  "safety_gate_check_count",
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
  "review_gameplay_local_env",
  "start_vision_source_bridge",
  "verify_vision_source",
  "review_game_control_adapter",
  "verify_validation_gate",
  "review_gameplay_runtime_status",
]);

const STARTUP_KINDS = new Set([
  "operator_bridge_start",
  "read_only_check",
  "one_shot_rehearsal",
  "safety_gate_check",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const STEP_BOUNDARY_POLICY_FIELDS = [
  "env_names_only",
  "script_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_raw_frames",
  "no_raw_ocr_text",
  "no_vision_payloads",
  "no_action_candidates",
  "no_approved_actions",
  "no_commands",
];
const CHECKLIST_BOUNDARY_POLICY_FIELDS = [
  "local_or_private_bridge_only",
  ...STEP_BOUNDARY_POLICY_FIELDS,
  "read_only_checklist",
  "validator_required_before_adapter",
  "direct_os_input_forbidden",
];

const STEPS = Object.freeze([
  {
    step_id: "review_gameplay_local_env",
    startup_kind: "read_only_check",
    startup_script: "npm run dev:gameplay:local-env-profile",
    readiness_script: "npm run dev:gameplay:env-setup-plan",
    configure_env: [
      "IRIS_GAME_OBSERVATION_ENDPOINT",
      "IRIS_GAME_OBSERVATION_METHOD",
      "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
      "IRIS_ENABLE_GAME_CONTROL",
      "IRIS_GAME_CONTROL_ADAPTER",
      "IRIS_GAME_CONTROL_ENDPOINT",
      "IRIS_AVAILABLE_GAME_ACTIONS",
    ],
  },
  {
    step_id: "start_vision_source_bridge",
    startup_kind: "operator_bridge_start",
    startup_script: "npm run dev:gameplay:preflight",
    readiness_script: "npm run dev:vision:game-roundtrip",
    configure_env: [
      "IRIS_GAME_OBSERVATION_ENDPOINT",
      "IRIS_GAME_OBSERVATION_METHOD",
    ],
  },
  {
    step_id: "verify_vision_source",
    startup_kind: "one_shot_rehearsal",
    startup_script: "npm run dev:vision:game-roundtrip",
    readiness_script: "npm run dev:vision:unsafe-roundtrip",
    configure_env: [],
  },
  {
    step_id: "review_game_control_adapter",
    startup_kind: "read_only_check",
    startup_script: "npm run dev:gameplay:preflight",
    readiness_script: "npm run dev:game-control:roundtrip",
    configure_env: [
      "IRIS_ENABLE_GAME_CONTROL",
      "IRIS_GAME_CONTROL_ADAPTER",
      "IRIS_GAME_CONTROL_ENDPOINT",
      "IRIS_AVAILABLE_GAME_ACTIONS",
    ],
  },
  {
    step_id: "verify_validation_gate",
    startup_kind: "safety_gate_check",
    startup_script: "npm run dev:gameplay:validation-gate-roundtrip",
    readiness_script: "npm run dev:gameplay:policy-gate-roundtrip",
    configure_env: [
      "IRIS_GAME_CONTROL_MIN_INTERVAL_MS",
      "IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS",
    ],
  },
  {
    step_id: "review_gameplay_runtime_status",
    startup_kind: "read_only_check",
    startup_script: "npm run dev:gameplay:runtime-status",
    readiness_script: "npm run dev:gameplay:live-readiness",
    configure_env: [],
  },
]);

export function createGameplayStartupChecklist({
  generatedAtMs = Date.now(),
} = {}) {
  const steps = STEPS.map((step, index) => ({
    schema: "iris_gameplay_startup_step_v1",
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
    schema: "iris_gameplay_startup_checklist_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "vision_and_safe_game_control",
    target_stage_priority: 4,
    checklist_status: "ready_to_follow_gameplay_startup_checklist",
    startup_step_count: steps.length,
    operator_bridge_start_count: countSteps(steps, "operator_bridge_start"),
    one_shot_rehearsal_count: countSteps(steps, "one_shot_rehearsal"),
    read_only_check_count: countSteps(steps, "read_only_check"),
    safety_gate_check_count: countSteps(steps, "safety_gate_check"),
    next_startup_step_id: steps[0].step_id,
    next_startup_script: steps[0].startup_script,
    next_readiness_script: steps[0].readiness_script,
    next_readiness_state: steps[0].readiness_state,
    startup_readiness_state_counts: countReadinessStates(steps),
    next_configure_env: [...steps[0].configure_env],
    steps,
    verification_scripts: {
      schema: "iris_gameplay_startup_verification_scripts_v1",
      local_env_profile_script: "npm run dev:gameplay:local-env-profile",
      env_setup_plan_script: "npm run dev:gameplay:env-setup-plan",
      preflight_script: "npm run dev:gameplay:preflight",
      vision_roundtrip_script: "npm run dev:vision:game-roundtrip",
      vision_unsafe_roundtrip_script: "npm run dev:vision:unsafe-roundtrip",
      game_control_roundtrip_script: "npm run dev:game-control:roundtrip",
      validation_gate_roundtrip_script:
        "npm run dev:gameplay:validation-gate-roundtrip",
      policy_gate_roundtrip_script: "npm run dev:gameplay:policy-gate-roundtrip",
      runtime_status_script: "npm run dev:gameplay:runtime-status",
      live_readiness_script: "npm run dev:gameplay:live-readiness",
      runtime_roundtrip_script: "npm run dev:gameplay:runtime-roundtrip",
    },
    production_handoff_summary: {
      schema: "iris_gameplay_startup_production_handoff_summary_v1",
      local_vision_bridge_rehearsal_only: true,
      real_game_or_os_input_not_started: true,
      input_action_candidates_never_forwarded_directly: true,
      approved_actions_required_before_adapter: true,
      real_raw_frames_not_required_for_rehearsal: true,
      next_production_decision_ids: [
        "configure_game_observation_endpoint",
        "review_available_game_actions",
        "enable_game_control_after_validation_gate",
        "run_runtime_roundtrip_before_real_game_operation",
      ],
      next_production_decision_count: 4,
      next_plan_script: "npm run dev:gameplay:env-setup-plan",
      next_readiness_state: steps[0].readiness_state,
      startup_readiness_state_counts: countReadinessStates(steps),
    },
    boundary_policy: {
      local_or_private_bridge_only: true,
      env_names_only: true,
      script_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_raw_frames: true,
      no_raw_ocr_text: true,
      no_vision_payloads: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      read_only_checklist: true,
      validator_required_before_adapter: true,
      direct_os_input_forbidden: true,
    },
    adapter_validation_required: true,
  };
  assertGameplayStartupChecklistSafe(checklist);
  return checklist;
}

export function assertGameplayStartupChecklistSafe(
  checklist,
  context = "gameplay startup checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist is required`);
  }
  assertNoForbiddenFields(checklist, context);
  assertNoUrlStrings(checklist, context);
  if (checklist.schema !== "iris_gameplay_startup_checklist_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(checklist)) {
    if (!GAMEPLAY_STARTUP_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`, { field });
    }
  }
  if (!Number.isInteger(checklist.generated_at_ms) || checklist.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (checklist.target_stage_id !== "vision_and_safe_game_control") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (checklist.target_stage_priority !== 4) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (checklist.checklist_status !== "ready_to_follow_gameplay_startup_checklist") {
    throw new ContractError(`${context}: invalid status`);
  }
  assertStepListSafe(checklist.steps, context);
  if (checklist.startup_step_count !== checklist.steps.length) {
    throw new ContractError(`${context}: invalid step count`);
  }
  for (const field of [
    "operator_bridge_start_count",
    "one_shot_rehearsal_count",
    "read_only_check_count",
    "safety_gate_check_count",
  ]) {
    if (!Number.isInteger(checklist[field]) || checklist[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    checklist.operator_bridge_start_count +
      checklist.one_shot_rehearsal_count +
      checklist.read_only_check_count +
      checklist.safety_gate_check_count !==
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
  if (checklist.next_readiness_state !== checklist.steps[0].readiness_state) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  assertReadinessStateCountsSafe(checklist.startup_readiness_state_counts, context);
  if (
    !sameReadinessStateCounts(
      checklist.startup_readiness_state_counts,
      countReadinessStates(checklist.steps)
    )
  ) {
    throw new ContractError(`${context}: invalid startup readiness counts`);
  }
  assertEnvNameListSafe(checklist.next_configure_env, `${context}: next env`);
  assertVerificationScriptsSafe(checklist.verification_scripts, context);
  assertProductionHandoffSummarySafe(
    checklist.production_handoff_summary,
    checklist,
    context
  );
  assertExactBoundaryPolicySafe(
    checklist.boundary_policy,
    CHECKLIST_BOUNDARY_POLICY_FIELDS,
    `${context}: boundary policy`
  );
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
    "iris_gameplay_startup_production_handoff_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of [
    "local_vision_bridge_rehearsal_only",
    "real_game_or_os_input_not_started",
    "input_action_candidates_never_forwarded_directly",
    "approved_actions_required_before_adapter",
    "real_raw_frames_not_required_for_rehearsal",
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
  assertReadinessStateCountsSafe(summary.startup_readiness_state_counts, context);
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
    if (step.schema !== "iris_gameplay_startup_step_v1") {
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
    assertSafeReadinessState(step.readiness_state, context);
    if (step.readiness_state !== readinessStateForStartupStep(step)) {
      throw new ContractError(`${context}: invalid step readiness state`);
    }
    assertSafeScriptName(step.startup_script, context);
    assertSafeScriptName(step.readiness_script, context);
    assertEnvNameListSafe(step.configure_env, `${context}: step env`);
    if (step.configure_env_count !== step.configure_env.length) {
      throw new ContractError(`${context}: invalid step env count`);
    }
    assertStepBoundaryPolicySafe(step.boundary_policy, `${context}: step boundary policy`);
  });
}

function assertStepBoundaryPolicySafe(policy, context) {
  assertExactBoundaryPolicySafe(policy, STEP_BOUNDARY_POLICY_FIELDS, context);
}

function assertExactBoundaryPolicySafe(policy, requiredFields, context) {
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
  if (scripts.schema !== "iris_gameplay_startup_verification_scripts_v1") {
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
  if (step.configure_env.length > 0) return "configuration_waiting";
  if (step.startup_kind === "operator_bridge_start") return "runtime_waiting";
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
    throw new ContractError(`${context}: readiness counts are required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness count`);
    }
  }
  for (const state of Object.keys(counts)) {
    if (!READINESS_STATES.has(state)) {
      throw new ContractError(`${context}: unknown readiness count state`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every((state) => left?.[state] === right?.[state]);
}

function stepBoundaryPolicy() {
  return {
    env_names_only: true,
    script_names_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_raw_frames: true,
    no_raw_ocr_text: true,
    no_vision_payloads: true,
    no_action_candidates: true,
    no_approved_actions: true,
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
