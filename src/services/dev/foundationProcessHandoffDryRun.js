import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationOperatorRunGateSafe,
  createFoundationOperatorRunGate,
} from "./foundationOperatorRunGate.js";
import { createFoundationLaunchPlan } from "./foundationLaunchPlan.js";

const SCHEMA = "iris_foundation_process_handoff_dry_run_v1";

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
const FOUNDATION_PROCESS_HANDOFF_DRY_RUN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "dry_run_status",
  "operator_gate_status",
  "process_start_allowed",
  "real_process_started_by_dry_run",
  "network_request_attempted_by_dry_run",
  "obs_operation_attempted_by_dry_run",
  "tts_engine_started_by_dry_run",
  "live2d_renderer_started_by_dry_run",
  "process_count",
  "ready_handoff_count",
  "blocked_handoff_count",
  "handoff_plan",
  "verification_scripts",
  "boundary_policy",
]);

export function createFoundationProcessHandoffDryRun({
  env = process.env,
  generatedAtMs = Date.now(),
  operatorRunApproved = false,
} = {}) {
  const gate = createFoundationOperatorRunGate({
    env,
    generatedAtMs,
    operatorRunApproved,
  });
  assertFoundationOperatorRunGateSafe(
    gate,
    "foundation process handoff dry-run operator gate"
  );

  const launchPlan = createFoundationLaunchPlan({ env, generatedAtMs });
  const launchStepByProcessId = new Map(
    launchPlan.launch_sequence.map((step) => [step.process_id, step])
  );
  const hasScriptName = (script) =>
    typeof script === "string" && script.trim() !== "";
  const handoffAllowed = gate.process_start_allowed === true;
  const handoffPlan = gate.process_plan.map((process) => {
    const launchStep = launchStepByProcessId.get(process.process_id);
    return {
      schema: "iris_foundation_process_handoff_dry_run_step_v1",
      process_id: process.process_id,
      sequence_order: process.sequence_order,
      readiness_state: process.readiness_state,
      handoff_state:
        handoffAllowed && process.readiness_state === "ready"
          ? "ready_for_operator_terminal"
          : "blocked_before_operator_terminal",
      script_available: hasScriptName(launchStep?.launch_script),
      readiness_script_available: hasScriptName(launchStep?.readiness_script),
      requires_dedicated_terminal: process.requires_dedicated_terminal === true,
      process_started_by_dry_run: false,
    };
  });

  const result = {
    schema: SCHEMA,
    generated_at_ms: generatedAtMs,
    dry_run_status: handoffAllowed
      ? "ready_for_operator_terminal_handoff"
      : "blocked_before_operator_terminal_handoff",
    operator_gate_status: gate.gate_status,
    process_start_allowed: handoffAllowed,
    real_process_started_by_dry_run: false,
    network_request_attempted_by_dry_run: false,
    obs_operation_attempted_by_dry_run: false,
    tts_engine_started_by_dry_run: false,
    live2d_renderer_started_by_dry_run: false,
    process_count: handoffPlan.length,
    ready_handoff_count: handoffPlan.filter(
      (step) => step.handoff_state === "ready_for_operator_terminal"
    ).length,
    blocked_handoff_count: handoffPlan.filter(
      (step) => step.handoff_state !== "ready_for_operator_terminal"
    ).length,
    handoff_plan: handoffPlan,
    verification_scripts: {
      schema: "iris_foundation_process_handoff_dry_run_scripts_v1",
      process_handoff_dry_run_script:
        "npm run dev:foundation:process-handoff-dry-run",
      operator_run_gate_script: "npm run dev:foundation:operator-run-gate",
      foundation_live_readiness_script: "npm run dev:foundation:live-readiness",
      bridge_worker_status_script: "npm run dev:bridge:status-roundtrip",
      obs_runtime_render_roundtrip_script: "npm run dev:obs:runtime-render-roundtrip",
    },
    boundary_policy: createBoundaryPolicy(),
  };
  assertFoundationProcessHandoffDryRunSafe(result);
  return result;
}

export function assertFoundationProcessHandoffDryRunSafe(
  result,
  context = "foundation process handoff dry-run"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result must be an object`);
  }
  if (result.schema !== SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(result)) {
    if (!FOUNDATION_PROCESS_HANDOFF_DRY_RUN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected dry-run field`, { field });
    }
  }
  if (
    result.dry_run_status !== "ready_for_operator_terminal_handoff" &&
    result.dry_run_status !== "blocked_before_operator_terminal_handoff"
  ) {
    throw new ContractError(`${context}: invalid dry-run status`);
  }
  assertSafeObject(result, context);
  assertNoUnsafeText(result, context);
  assertBoundaryPolicy(
    result.boundary_policy,
    [
      "dry_run_only",
      "operator_gate_required",
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
  if (result.real_process_started_by_dry_run !== false) {
    throw new ContractError(`${context}: dry-run must not start processes`);
  }
  if (result.network_request_attempted_by_dry_run !== false) {
    throw new ContractError(`${context}: dry-run must not make network requests`);
  }
  if (result.obs_operation_attempted_by_dry_run !== false) {
    throw new ContractError(`${context}: dry-run must not touch OBS`);
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

function createBoundaryPolicy() {
  return {
    dry_run_only: true,
    operator_gate_required: true,
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
