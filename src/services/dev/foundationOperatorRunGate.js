import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationLaunchPlanSafe,
  createFoundationLaunchPlan,
} from "./foundationLaunchPlan.js";

const SCHEMA = "iris_foundation_operator_run_gate_v1";

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
  "memory_carryover_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "canonical",
  "canonical_envelope",
  "final_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
  "payload",
  "value",
  "values",
  "endpoint",
  "url",
  "audio_url",
  "artifact_url",
  "path",
  "artifact_path",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "command",
]);

const UNSAFE_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|raw_packet|job_payload)\b|https?:\/\//i;
const FOUNDATION_OPERATOR_RUN_GATE_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "gate_status",
  "launch_plan_status",
  "operator_run_approved",
  "process_start_allowed",
  "real_process_started_by_gate",
  "real_tts_engine_started_by_gate",
  "real_live2d_renderer_started_by_gate",
  "obs_process_touched_by_gate",
  "network_request_attempted_by_gate",
  "next_step_id",
  "next_readiness_state",
  "configured_process_count",
  "attention_process_count",
  "process_plan",
  "verification_scripts",
  "boundary_policy",
]);

export function createFoundationOperatorRunGate({
  env = process.env,
  generatedAtMs = Date.now(),
  operatorRunApproved = false,
} = {}) {
  const launchPlan = createFoundationLaunchPlan({ env, generatedAtMs });
  assertFoundationLaunchPlanSafe(launchPlan, "foundation operator run gate launch plan");
  const launchReady = launchPlan.plan_status === "ready_to_launch_foundation";
  const runApproved = operatorRunApproved === true;
  const processPlan = createProcessPlan(launchPlan);
  const gate = {
    schema: SCHEMA,
    generated_at_ms: generatedAtMs,
    gate_status:
      launchReady && runApproved
        ? "ready_for_operator_process_start"
        : launchReady
        ? "operator_review_required"
        : "configuration_waiting",
    launch_plan_status: launchPlan.plan_status,
    operator_run_approved: runApproved,
    process_start_allowed: launchReady && runApproved,
    real_process_started_by_gate: false,
    real_tts_engine_started_by_gate: false,
    real_live2d_renderer_started_by_gate: false,
    obs_process_touched_by_gate: false,
    network_request_attempted_by_gate: false,
    next_step_id: launchPlan.next_step_id,
    next_readiness_state: launchPlan.next_readiness_state,
    configured_process_count: processPlan.filter((item) => item.readiness_state === "ready").length,
    attention_process_count: processPlan.filter((item) => item.readiness_state !== "ready").length,
    process_plan: processPlan,
    verification_scripts: {
      schema: "iris_foundation_operator_run_gate_scripts_v1",
      operator_run_gate_script: "npm run dev:foundation:operator-run-gate",
      foundation_launch_plan_script: "npm run dev:foundation:launch-plan",
      foundation_live_readiness_script: "npm run dev:foundation:live-readiness",
      engine_probe_script: "npm run dev:engine:probe",
      obs_runtime_render_roundtrip_script: "npm run dev:obs:runtime-render-roundtrip",
    },
    boundary_policy: createBoundaryPolicy(),
  };
  assertFoundationOperatorRunGateSafe(gate);
  return gate;
}

export function assertFoundationOperatorRunGateSafe(
  gate,
  context = "foundation operator run gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate must be an object`);
  }
  if (gate.schema !== SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(gate)) {
    if (!FOUNDATION_OPERATOR_RUN_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`, { field });
    }
  }
  if (
    gate.gate_status !== "ready_for_operator_process_start" &&
    gate.gate_status !== "operator_review_required" &&
    gate.gate_status !== "configuration_waiting"
  ) {
    throw new ContractError(`${context}: invalid gate status`);
  }
  assertSafeObject(gate, context);
  assertNoUnsafeText(gate, context);
  assertBoundaryPolicy(
    gate.boundary_policy,
    [
      "operator_gate_only",
      "script_names_only",
      "ids_and_counts_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_raw_payloads",
      "no_candidate_payloads",
      "no_commands",
      "no_real_process_started",
      "no_network_request_attempted",
      "no_obs_operation",
    ],
    `${context}: boundary policy`
  );
  if (gate.real_process_started_by_gate !== false) {
    throw new ContractError(`${context}: gate must not start processes`);
  }
  if (gate.network_request_attempted_by_gate !== false) {
    throw new ContractError(`${context}: gate must not make network requests`);
  }
  if (gate.obs_process_touched_by_gate !== false) {
    throw new ContractError(`${context}: gate must not touch OBS`);
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy ${field} must be true`);
    }
  }
}

function createProcessPlan(launchPlan) {
  const hasScriptName = (script) =>
    typeof script === "string" && script.trim() !== "";
  return launchPlan.launch_sequence.map((step) => ({
    schema: "iris_foundation_operator_run_process_plan_v1",
    process_id: step.process_id,
    purpose_id: step.purpose_id,
    sequence_order: step.sequence_order,
    readiness_state:
      step.launch_readiness_status === "ready" ? "ready" : "configuration_waiting",
    script_available: hasScriptName(step.launch_script),
    readiness_script_available: hasScriptName(step.readiness_script),
    requires_dedicated_terminal: step.requires_dedicated_terminal === true,
    operator_review_required: true,
    start_blocked_until_operator_run_gate: true,
  }));
}

function createBoundaryPolicy() {
  return {
    operator_gate_only: true,
    script_names_only: true,
    ids_and_counts_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_raw_payloads: true,
    no_candidate_payloads: true,
    no_commands: true,
    no_real_process_started: true,
    no_network_request_attempted: true,
    no_obs_operation: true,
  };
}

function assertSafeObject(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertSafeObject(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe public field ${field}`, { path });
    }
    assertSafeObject(child, context, `${path}.${field}`);
  }
}

function assertNoUnsafeText(value, context) {
  const serialized = JSON.stringify(value);
  if (UNSAFE_TEXT_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: unsafe public text detected`);
  }
}
