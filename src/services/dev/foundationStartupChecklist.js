import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationLaunchPlanSafe,
  createFoundationLaunchPlan,
} from "./foundationLaunchPlan.js";

const FORBIDDEN_FOUNDATION_STARTUP_CHECKLIST_FIELDS = new Set([
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
  "memory_candidate",
  "memory_candidates",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "relationship_update_candidate",
  "approved_memory_record",
  "approved_relationship_record",
  "internal_profile",
  "canonical_profile",
  "profile_enum",
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
]);

const CHECKLIST_STATUSES = new Set([
  "ready_to_follow_startup_checklist",
  "configure_foundation_startup_env_first",
]);
const PLAN_STATUSES = new Set([
  "ready_to_launch_foundation",
  "configure_foundation_env_first",
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
  "voicevox_tts_engine_bridge",
  "live2d_cue_engine_bridge",
  "local_adapter_bridge",
  "local_bridge_worker",
  "iris_dev_server",
  "obs_browser_source_setup",
]);
const STARTUP_KINDS = new Set([
  "long_running_service",
  "watch_worker",
  "one_shot_setup",
]);
const OPERATOR_ACTIONS = new Set([
  "start_service",
  "start_watch_worker",
  "run_setup_once",
]);
const VERIFICATION_SCRIPT_FIELDS = [
  "foundation_status_script",
  "foundation_runtime_status_script",
  "foundation_live_readiness_script",
  "production_next_task_script",
  "production_live_readiness_script",
  "production_probe_script",
  "bridge_status_roundtrip_script",
  "bridge_engine_roundtrip_script",
  "engine_probe_script",
  "obs_render_handoff_script",
  "obs_runtime_render_roundtrip_script",
];
const URL_PATTERN = /\bhttps?:\/\//i;
const FOUNDATION_STARTUP_CHECKLIST_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "checklist_status",
  "target_stage_id",
  "target_stage_priority",
  "launch_plan_status",
  "startup_step_count",
  "ready_to_start_count",
  "attention_startup_count",
  "missing_required_env_count",
  "long_running_service_count",
  "watch_worker_count",
  "one_shot_setup_count",
  "dedicated_terminal_count",
  "next_startup_step_id",
  "next_startup_step_order",
  "next_startup_script",
  "next_readiness_script",
  "next_readiness_state",
  "startup_readiness_state_counts",
  "next_configure_env",
  "terminal_plan",
  "steps",
  "verification_scripts",
  "startup_policy",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);
const FOUNDATION_STARTUP_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "startup_checklist_only",
  "real_processes_not_started_by_checklist",
  "local_bridge_required_before_dev_server",
  "local_bridge_worker_required_before_obs_pickup",
  "obs_setup_can_be_manual",
  "dedicated_terminals_required_for_long_running_services",
  "next_startup_step_id",
  "next_startup_script",
  "next_readiness_script",
  "next_readiness_state",
  "startup_readiness_state_counts",
  "ready_to_start_count",
  "attention_startup_count",
  "long_running_service_count",
  "watch_worker_count",
  "one_shot_setup_count",
]);

export function createFoundationStartupChecklist({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const launchPlan = createFoundationLaunchPlan({ env, generatedAtMs });
  assertFoundationLaunchPlanSafe(launchPlan, "foundation startup checklist launch plan");
  const startupPlan = launchPlan.operator_startup_plan;
  const steps = startupPlan.steps.map((step) => buildChecklistStep(step));
  const terminalLabels = steps
    .filter((step) => step.requires_dedicated_terminal)
    .map((step) => step.terminal_label);
  const nextStep = steps.find((step) => step.ready_to_start !== true) ?? null;
  const nextOperatorStep = steps.find((step) => step.ready_to_start === true) ?? null;
  const nextReadinessState =
    nextStep?.readiness_state ?? nextOperatorStep?.readiness_state ?? null;
  const startupReadinessStateCounts = summarizeStartupReadinessStateCounts(steps);

  const checklist = {
    schema: "iris_foundation_startup_checklist_v1",
    generated_at_ms: generatedAtMs,
    checklist_status:
      startupPlan.attention_startup_count === 0
        ? "ready_to_follow_startup_checklist"
        : "configure_foundation_startup_env_first",
    target_stage_id: "tts_live2d_obs_foundation",
    target_stage_priority: 1,
    launch_plan_status: launchPlan.plan_status,
    startup_step_count: steps.length,
    ready_to_start_count: startupPlan.ready_to_start_count,
    attention_startup_count: startupPlan.attention_startup_count,
    missing_required_env_count: uniqueEnvNames(
      steps.flatMap((step) => step.missing_required_env)
    ).length,
    long_running_service_count: startupPlan.long_running_service_count,
    watch_worker_count: startupPlan.watch_worker_count,
    one_shot_setup_count: startupPlan.one_shot_setup_count,
    dedicated_terminal_count: startupPlan.dedicated_terminal_count,
    next_startup_step_id: nextStep?.process_id ?? null,
    next_startup_step_order: nextStep?.sequence_order ?? null,
    next_startup_script: nextStep?.launch_script ?? null,
    next_readiness_script: nextStep?.readiness_script ?? null,
    next_readiness_state: nextReadinessState,
    startup_readiness_state_counts: startupReadinessStateCounts,
    next_configure_env: nextStep ? nextConfigureEnvForChecklistStep(nextStep) : [],
    terminal_plan: {
      schema: "iris_foundation_startup_terminal_plan_v1",
      target_stage_id: "tts_live2d_obs_foundation",
      dedicated_terminal_count: startupPlan.dedicated_terminal_count,
      long_running_service_count: startupPlan.long_running_service_count,
      watch_worker_count: startupPlan.watch_worker_count,
      one_shot_setup_count: startupPlan.one_shot_setup_count,
      recommended_terminal_labels: terminalLabels,
      first_dedicated_terminal_label: terminalLabels[0] ?? null,
      boundary_policy: {
        terminal_labels_only: true,
        script_names_only: true,
        env_names_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
        read_only_terminal_plan: true,
      },
    },
    steps,
    verification_scripts: {
      schema: "iris_foundation_startup_verification_scripts_v1",
      target_stage_id: "tts_live2d_obs_foundation",
      foundation_status_script: "npm run dev:foundation:status",
      foundation_runtime_status_script: "npm run dev:foundation:runtime-status",
      foundation_live_readiness_script: "npm run dev:foundation:live-readiness",
      production_next_task_script: "npm run dev:production:next-task",
      production_live_readiness_script: "npm run dev:production:live-readiness",
      production_probe_script: "npm run dev:production:probe",
      bridge_status_roundtrip_script: "npm run dev:bridge:status-roundtrip",
      bridge_engine_roundtrip_script: "npm run dev:bridge:engine-roundtrip",
      engine_probe_script: "npm run dev:engine:probe",
      obs_render_handoff_script: "npm run dev:obs:render-handoff-roundtrip",
      obs_runtime_render_roundtrip_script:
        "npm run dev:obs:runtime-render-roundtrip",
      script_count: VERIFICATION_SCRIPT_FIELDS.length,
      expected_foundation_status: "ready_for_runtime_handoff",
      expected_foundation_runtime_status: "ready_for_obs_runtime_handoff",
      expected_foundation_live_readiness: "ready_for_live_obs_operation",
    },
    startup_policy: {
      schema: "iris_foundation_startup_policy_v1",
      local_adapter_bridge_before_dev_server: true,
      local_bridge_worker_before_obs_pickup: true,
      obs_setup_can_be_manual: true,
      long_running_services_need_dedicated_terminals: true,
      one_shot_setup_does_not_need_dedicated_terminal: true,
    },
    production_handoff_summary: {
      schema: "iris_foundation_startup_production_handoff_summary_v1",
      startup_checklist_only: true,
      real_processes_not_started_by_checklist: true,
      local_bridge_required_before_dev_server: true,
      local_bridge_worker_required_before_obs_pickup: true,
      obs_setup_can_be_manual: true,
      dedicated_terminals_required_for_long_running_services: true,
      next_startup_step_id: nextStep?.process_id ?? null,
      next_startup_script: nextStep?.launch_script ?? null,
      next_readiness_script: nextStep?.readiness_script ?? null,
      next_readiness_state: nextReadinessState,
      startup_readiness_state_counts: startupReadinessStateCounts,
      ready_to_start_count: startupPlan.ready_to_start_count,
      attention_startup_count: startupPlan.attention_startup_count,
      long_running_service_count: startupPlan.long_running_service_count,
      watch_worker_count: startupPlan.watch_worker_count,
      one_shot_setup_count: startupPlan.one_shot_setup_count,
    },
    boundary_policy: {
      safe_local_scripts_only: true,
      env_names_only: true,
      script_names_only: true,
      terminal_labels_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_checklist: true,
    },
    adapter_validation_required: true,
  };
  assertFoundationStartupChecklistSafe(checklist);
  return checklist;
}

export function assertFoundationStartupChecklistSafe(
  checklist,
  context = "foundation startup checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist is required`);
  }
  assertNoForbiddenFoundationStartupChecklistFields(checklist, context);
  assertNoUrlStrings(checklist, context);
  if (checklist.schema !== "iris_foundation_startup_checklist_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(checklist)) {
    if (!FOUNDATION_STARTUP_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`, { field });
    }
  }
  if (!Number.isInteger(checklist.generated_at_ms) || checklist.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (!CHECKLIST_STATUSES.has(checklist.checklist_status)) {
    throw new ContractError(`${context}: invalid checklist status`);
  }
  if (checklist.target_stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (checklist.target_stage_priority !== 1) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!PLAN_STATUSES.has(checklist.launch_plan_status)) {
    throw new ContractError(`${context}: invalid launch plan status`);
  }
  if (!Array.isArray(checklist.steps) || checklist.steps.length === 0) {
    throw new ContractError(`${context}: checklist steps are required`);
  }
  checklist.steps.forEach((step, index) =>
    assertChecklistStepSafe(step, context, index + 1)
  );
  for (const field of [
    "startup_step_count",
    "ready_to_start_count",
    "attention_startup_count",
    "missing_required_env_count",
    "long_running_service_count",
    "watch_worker_count",
    "one_shot_setup_count",
    "dedicated_terminal_count",
  ]) {
    if (!Number.isInteger(checklist[field]) || checklist[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (checklist.startup_step_count !== checklist.steps.length) {
    throw new ContractError(`${context}: invalid startup step count`);
  }
  if (
    checklist.ready_to_start_count + checklist.attention_startup_count !==
    checklist.startup_step_count
  ) {
    throw new ContractError(`${context}: invalid startup readiness counts`);
  }
  if (
    checklist.long_running_service_count +
      checklist.watch_worker_count +
      checklist.one_shot_setup_count !==
    checklist.startup_step_count
  ) {
    throw new ContractError(`${context}: invalid startup kind counts`);
  }
  if (
    checklist.dedicated_terminal_count !==
    checklist.steps.filter((step) => step.requires_dedicated_terminal).length
  ) {
    throw new ContractError(`${context}: invalid dedicated terminal count`);
  }
  const missingRequiredEnvCount = uniqueEnvNames(
    checklist.steps.flatMap((step) => step.missing_required_env)
  ).length;
  if (checklist.missing_required_env_count !== missingRequiredEnvCount) {
    throw new ContractError(`${context}: invalid missing env count`);
  }

  const firstAttentionStep =
    checklist.steps.find((step) => step.ready_to_start !== true) ?? null;
  if (!firstAttentionStep) {
    if (
      checklist.checklist_status !== "ready_to_follow_startup_checklist" ||
      checklist.next_startup_step_id !== null ||
      checklist.next_startup_step_order !== null ||
      checklist.next_startup_script !== null ||
      checklist.next_readiness_script !== null ||
      checklist.next_readiness_state !==
        (checklist.steps.find((step) => step.ready_to_start === true)
          ?.readiness_state ?? null) ||
      !Array.isArray(checklist.next_configure_env) ||
      checklist.next_configure_env.length !== 0
    ) {
      throw new ContractError(`${context}: unexpected next startup step`);
    }
  } else if (
    checklist.checklist_status !== "configure_foundation_startup_env_first" ||
    checklist.next_startup_step_id !== firstAttentionStep.process_id ||
    checklist.next_startup_step_order !== firstAttentionStep.sequence_order ||
    checklist.next_startup_script !== firstAttentionStep.launch_script ||
    checklist.next_readiness_script !== firstAttentionStep.readiness_script ||
    checklist.next_readiness_state !== firstAttentionStep.readiness_state ||
    JSON.stringify(checklist.next_configure_env) !==
      JSON.stringify(nextConfigureEnvForChecklistStep(firstAttentionStep))
  ) {
    throw new ContractError(`${context}: invalid next startup step`);
  }
  if (checklist.next_startup_script !== null) {
    assertSafeScriptName(checklist.next_startup_script, context);
  }
  if (checklist.next_readiness_script !== null) {
    assertSafeScriptName(checklist.next_readiness_script, context);
  }
  assertEnvNameListSafe(checklist.next_configure_env, `${context}: next configure env`);
  assertSafeOptionalReadinessState(checklist.next_readiness_state, context);
  assertStartupReadinessStateCountsSafe(
    checklist.startup_readiness_state_counts,
    checklist.steps,
    context
  );
  assertTerminalPlanSafe(checklist.terminal_plan, checklist, context);
  assertVerificationScriptsSafe(checklist.verification_scripts, context);
  assertStartupPolicySafe(checklist.startup_policy, context);
  assertProductionHandoffSummarySafe(
    checklist.production_handoff_summary,
    checklist,
    context
  );
  assertBoundaryPolicySafe(checklist.boundary_policy, context);
  if (checklist.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertProductionHandoffSummarySafe(summary, checklist, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_foundation_startup_production_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!FOUNDATION_STARTUP_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected production handoff field`, {
        field,
      });
    }
  }
  for (const field of [
    "startup_checklist_only",
    "real_processes_not_started_by_checklist",
    "local_bridge_required_before_dev_server",
    "local_bridge_worker_required_before_obs_pickup",
    "obs_setup_can_be_manual",
    "dedicated_terminals_required_for_long_running_services",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (
    summary.next_startup_step_id !== null &&
    !PROCESS_IDS.has(summary.next_startup_step_id)
  ) {
    throw new ContractError(`${context}: invalid production handoff next step`);
  }
  if (summary.next_startup_script !== null) {
    assertSafeScriptName(
      summary.next_startup_script,
      `${context}: production handoff next startup script`
    );
  }
  if (summary.next_readiness_script !== null) {
    assertSafeScriptName(
      summary.next_readiness_script,
      `${context}: production handoff next readiness script`
    );
  }
  assertSafeOptionalReadinessState(summary.next_readiness_state, context);
  assertStartupReadinessStateCountsObjectSafe(
    summary.startup_readiness_state_counts,
    `${context}: production handoff startup readiness counts`
  );
  if (
    summary.next_startup_step_id !== checklist.next_startup_step_id ||
    summary.next_startup_script !== checklist.next_startup_script ||
    summary.next_readiness_script !== checklist.next_readiness_script ||
    summary.next_readiness_state !== checklist.next_readiness_state ||
    !sameReadinessStateCounts(
      summary.startup_readiness_state_counts,
      checklist.startup_readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: production handoff startup mismatch`);
  }
  for (const field of [
    "ready_to_start_count",
    "attention_startup_count",
    "long_running_service_count",
    "watch_worker_count",
    "one_shot_setup_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid production handoff count`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  for (const state of READINESS_STATES) {
    if (left?.[state] !== right?.[state]) return false;
  }
  return true;
}

function buildChecklistStep(step) {
  const terminalLabel = step.requires_dedicated_terminal
    ? `terminal_${step.process_id}`
    : null;
  return {
    schema: "iris_foundation_startup_checklist_step_v1",
    sequence_order: step.sequence_order,
    process_id: step.process_id,
    startup_kind: step.startup_kind,
    operator_action: step.operator_action,
    launch_readiness_status: step.launch_readiness_status,
    ready_to_start: step.ready_to_start,
    readiness_state: summarizeStepReadinessState(step),
    launch_script: step.launch_script,
    readiness_script: step.readiness_script,
    requires_dedicated_terminal: step.requires_dedicated_terminal,
    terminal_label: terminalLabel,
    blocks_runtime_handoff: step.blocks_runtime_handoff,
    blocks_obs_pickup: step.blocks_obs_pickup,
    missing_required_env_count: step.missing_required_env_count,
    next_configure_env: nextConfigureEnvForChecklistStep(step),
    configure_next_env: step.configure_next_env,
    missing_required_env: step.missing_required_env,
  };
}

function assertChecklistStepSafe(step, context, expectedOrder) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: invalid checklist step`);
  }
  if (step.schema !== "iris_foundation_startup_checklist_step_v1") {
    throw new ContractError(`${context}: invalid checklist step schema`);
  }
  if (step.sequence_order !== expectedOrder) {
    throw new ContractError(`${context}: invalid checklist step order`);
  }
  if (!PROCESS_IDS.has(step.process_id)) {
    throw new ContractError(`${context}: invalid process id`);
  }
  if (!STARTUP_KINDS.has(step.startup_kind)) {
    throw new ContractError(`${context}: invalid startup kind`);
  }
  if (!OPERATOR_ACTIONS.has(step.operator_action)) {
    throw new ContractError(`${context}: invalid operator action`);
  }
  if (!STEP_STATUSES.has(step.launch_readiness_status)) {
    throw new ContractError(`${context}: invalid launch readiness`);
  }
  if (typeof step.ready_to_start !== "boolean") {
    throw new ContractError(`${context}: invalid ready flag`);
  }
  if (step.ready_to_start !== (step.launch_readiness_status === "ready")) {
    throw new ContractError(`${context}: inconsistent ready flag`);
  }
  assertSafeReadinessState(step.readiness_state, `${context}: step readiness`);
  if (
    step.ready_to_start === true &&
    step.readiness_state !== "real_device_waiting"
  ) {
    throw new ContractError(`${context}: ready step must wait for operator runtime`);
  }
  if (
    step.ready_to_start !== true &&
    step.readiness_state !== "configuration_waiting"
  ) {
    throw new ContractError(`${context}: attention step must wait for configuration`);
  }
  assertSafeScriptName(step.launch_script, context);
  assertSafeScriptName(step.readiness_script, context);
  for (const field of [
    "requires_dedicated_terminal",
    "blocks_runtime_handoff",
    "blocks_obs_pickup",
  ]) {
    if (typeof step[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (step.requires_dedicated_terminal) {
    const expectedLabel = `terminal_${step.process_id}`;
    if (step.terminal_label !== expectedLabel) {
      throw new ContractError(`${context}: invalid terminal label`);
    }
    assertTerminalLabelSafe(step.terminal_label, context);
  } else if (step.terminal_label !== null) {
    throw new ContractError(`${context}: unexpected terminal label`);
  }
  if (
    !Number.isInteger(step.missing_required_env_count) ||
    step.missing_required_env_count < 0
  ) {
    throw new ContractError(`${context}: invalid missing env count`);
  }
  for (const field of [
    "next_configure_env",
    "configure_next_env",
    "missing_required_env",
  ]) {
    assertEnvNameListSafe(step[field], `${context}: ${field}`);
  }
  if (step.missing_required_env_count !== step.missing_required_env.length) {
    throw new ContractError(`${context}: invalid missing env summary`);
  }
  if (step.ready_to_start && step.missing_required_env.length !== 0) {
    throw new ContractError(`${context}: ready step has missing env`);
  }
  if (
    JSON.stringify(step.next_configure_env) !==
    JSON.stringify(nextConfigureEnvForChecklistStep(step))
  ) {
    throw new ContractError(`${context}: invalid step next configure env`);
  }
}

function assertTerminalPlanSafe(plan, checklist, context) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: terminal plan is required`);
  }
  if (plan.schema !== "iris_foundation_startup_terminal_plan_v1") {
    throw new ContractError(`${context}: invalid terminal plan schema`);
  }
  if (plan.target_stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid terminal plan stage`);
  }
  for (const field of [
    "dedicated_terminal_count",
    "long_running_service_count",
    "watch_worker_count",
    "one_shot_setup_count",
  ]) {
    if (!Number.isInteger(plan[field]) || plan[field] < 0) {
      throw new ContractError(`${context}: invalid terminal plan ${field}`);
    }
  }
  if (plan.dedicated_terminal_count !== checklist.dedicated_terminal_count) {
    throw new ContractError(`${context}: invalid terminal plan dedicated count`);
  }
  if (plan.long_running_service_count !== checklist.long_running_service_count) {
    throw new ContractError(`${context}: invalid terminal plan service count`);
  }
  if (plan.watch_worker_count !== checklist.watch_worker_count) {
    throw new ContractError(`${context}: invalid terminal plan worker count`);
  }
  if (plan.one_shot_setup_count !== checklist.one_shot_setup_count) {
    throw new ContractError(`${context}: invalid terminal plan setup count`);
  }
  const expectedLabels = checklist.steps
    .filter((step) => step.requires_dedicated_terminal)
    .map((step) => step.terminal_label);
  if (
    !Array.isArray(plan.recommended_terminal_labels) ||
    JSON.stringify(plan.recommended_terminal_labels) !== JSON.stringify(expectedLabels)
  ) {
    throw new ContractError(`${context}: invalid terminal labels`);
  }
  for (const label of plan.recommended_terminal_labels) {
    assertTerminalLabelSafe(label, context);
  }
  if (plan.first_dedicated_terminal_label !== (expectedLabels[0] ?? null)) {
    throw new ContractError(`${context}: invalid first terminal label`);
  }
  if (plan.first_dedicated_terminal_label !== null) {
    assertTerminalLabelSafe(plan.first_dedicated_terminal_label, context);
  }
  assertBoundaryPolicy(
    plan.boundary_policy,
    [
      "terminal_labels_only",
      "script_names_only",
      "env_names_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "read_only_terminal_plan",
    ],
    `${context}: terminal boundary policy`
  );
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_foundation_startup_verification_scripts_v1") {
    throw new ContractError(`${context}: invalid verification scripts schema`);
  }
  if (scripts.target_stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid verification scripts stage`);
  }
  for (const field of VERIFICATION_SCRIPT_FIELDS) {
    assertSafeScriptName(scripts[field], `${context}: ${field}`);
  }
  if (scripts.script_count !== VERIFICATION_SCRIPT_FIELDS.length) {
    throw new ContractError(`${context}: invalid verification script count`);
  }
  if (scripts.expected_foundation_status !== "ready_for_runtime_handoff") {
    throw new ContractError(`${context}: invalid foundation status expectation`);
  }
  if (
    scripts.expected_foundation_runtime_status !==
    "ready_for_obs_runtime_handoff"
  ) {
    throw new ContractError(`${context}: invalid runtime status expectation`);
  }
  if (
    scripts.expected_foundation_live_readiness !==
    "ready_for_live_obs_operation"
  ) {
    throw new ContractError(`${context}: invalid live readiness expectation`);
  }
}

function assertStartupPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: startup policy is required`);
  }
  if (policy.schema !== "iris_foundation_startup_policy_v1") {
    throw new ContractError(`${context}: invalid startup policy schema`);
  }
  for (const field of [
    "local_adapter_bridge_before_dev_server",
    "local_bridge_worker_before_obs_pickup",
    "obs_setup_can_be_manual",
    "long_running_services_need_dedicated_terminals",
    "one_shot_setup_does_not_need_dedicated_terminal",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid startup policy`);
    }
  }
}

function assertBoundaryPolicySafe(policy, context) {
  assertBoundaryPolicy(
    policy,
    [
      "safe_local_scripts_only",
      "env_names_only",
      "script_names_only",
      "terminal_labels_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "read_only_checklist",
    ],
    `${context}: boundary policy`
  );
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

function nextConfigureEnvForChecklistStep(step) {
  if (!step) return [];
  const candidates =
    step.missing_required_env.length > 0
      ? step.missing_required_env
      : step.configure_next_env.length > 0
        ? step.configure_next_env
        : [];
  return uniqueEnvNames(candidates);
}

function summarizeStepReadinessState(step) {
  return step.ready_to_start === true
    ? "real_device_waiting"
    : "configuration_waiting";
}

function summarizeStartupReadinessStateCounts(steps) {
  const counts = {
    ready: 0,
    configuration_waiting: 0,
    runtime_waiting: 0,
    real_device_waiting: 0,
    operator_review_required: 0,
  };
  for (const step of steps) {
    const state = READINESS_STATES.has(step.readiness_state)
      ? step.readiness_state
      : "operator_review_required";
    counts[state] += 1;
  }
  return counts;
}

function assertSafeReadinessState(state, context) {
  if (!READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
}

function assertSafeOptionalReadinessState(state, context) {
  if (state !== null) {
    assertSafeReadinessState(state, `${context}: readiness state`);
  }
}

function assertStartupReadinessStateCountsSafe(counts, steps, context) {
  assertStartupReadinessStateCountsObjectSafe(
    counts,
    `${context}: startup readiness counts`
  );
  const expected = summarizeStartupReadinessStateCounts(steps);
  for (const state of READINESS_STATES) {
    if (counts[state] !== expected[state]) {
      throw new ContractError(`${context}: mismatched startup ${state} count`);
    }
  }
}

function assertStartupReadinessStateCountsObjectSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: startup readiness counts are required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid ${state}`);
    }
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: invalid startup readiness key`);
    }
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

function assertTerminalLabelSafe(label, context) {
  if (typeof label !== "string" || !/^terminal_[a-z0-9_]+$/.test(label)) {
    throw new ContractError(`${context}: invalid terminal label`);
  }
}

function uniqueEnvNames(names) {
  return [...new Set(names)].filter((name) => /^IRIS_[A-Z0-9_]+$/.test(name));
}

function assertNoForbiddenFoundationStartupChecklistFields(
  value,
  context,
  path = "root"
) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFoundationStartupChecklistFields(
        item,
        context,
        `${path}[${index}]`
      )
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FOUNDATION_STARTUP_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe startup checklist field`, {
        field,
        path,
      });
    }
    assertNoForbiddenFoundationStartupChecklistFields(child, context, `${path}.${field}`);
  }
}

function assertNoUrlStrings(value, context, path = "root") {
  if (typeof value === "string") {
    if (URL_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe URL value`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUrlStrings(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUrlStrings(child, context, `${path}.${field}`);
  }
}
