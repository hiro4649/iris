import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationProcessHandoffDryRunSafe,
  createFoundationProcessHandoffDryRun,
} from "./foundationProcessHandoffDryRun.js";

const SCHEMA = "iris_foundation_post_start_health_checklist_v1";

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

const HEALTH_CHECKS = [
  {
    check_id: "local_engine_health_probe",
    process_ids: ["voicevox_tts_engine_bridge", "live2d_cue_engine_bridge"],
    verification_script: "npm run dev:engine:probe",
  },
  {
    check_id: "local_bridge_worker_status",
    process_ids: ["local_adapter_bridge", "local_bridge_worker"],
    verification_script: "npm run dev:bridge:status-roundtrip",
  },
  {
    check_id: "obs_bridge_health_probe",
    process_ids: ["obs_browser_source_setup"],
    verification_script: "npm run dev:obs:probe",
  },
  {
    check_id: "obs_runtime_render_roundtrip",
    process_ids: ["iris_dev_server", "obs_browser_source_setup"],
    verification_script: "npm run dev:obs:runtime-render-roundtrip",
  },
  {
    check_id: "foundation_live_readiness",
    process_ids: ["iris_dev_server", "local_bridge_worker", "obs_browser_source_setup"],
    verification_script: "npm run dev:foundation:live-readiness",
  },
];
const FOUNDATION_POST_START_HEALTH_CHECKLIST_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "checklist_status",
  "process_handoff_status",
  "process_start_allowed",
  "health_probe_executed_by_checklist",
  "network_request_attempted_by_checklist",
  "obs_operation_attempted_by_checklist",
  "check_count",
  "ready_check_count",
  "blocked_check_count",
  "checks",
  "verification_scripts",
  "boundary_policy",
]);

export function createFoundationPostStartHealthChecklist({
  env = process.env,
  generatedAtMs = Date.now(),
  operatorRunApproved = false,
} = {}) {
  const handoffDryRun = createFoundationProcessHandoffDryRun({
    env,
    generatedAtMs,
    operatorRunApproved,
  });
  assertFoundationProcessHandoffDryRunSafe(
    handoffDryRun,
    "foundation post-start health checklist process handoff dry-run"
  );
  const handoffReady =
    handoffDryRun.dry_run_status === "ready_for_operator_terminal_handoff";
  const checks = HEALTH_CHECKS.map((check, index) => ({
    schema: "iris_foundation_post_start_health_check_v1",
    sequence_order: index + 1,
    check_id: check.check_id,
    process_ids: [...check.process_ids],
    process_id_count: check.process_ids.length,
    verification_script: check.verification_script,
    readiness_state: handoffReady ? "operator_run_required" : "blocked_before_handoff",
    real_probe_executed_by_checklist: false,
    network_request_attempted_by_checklist: false,
    obs_operation_attempted_by_checklist: false,
  }));
  const checklist = {
    schema: SCHEMA,
    generated_at_ms: generatedAtMs,
    checklist_status: handoffReady
      ? "ready_for_operator_post_start_health_checks"
      : "blocked_before_operator_handoff",
    process_handoff_status: handoffDryRun.dry_run_status,
    process_start_allowed: handoffDryRun.process_start_allowed,
    health_probe_executed_by_checklist: false,
    network_request_attempted_by_checklist: false,
    obs_operation_attempted_by_checklist: false,
    check_count: checks.length,
    ready_check_count: checks.filter(
      (check) => check.readiness_state === "operator_run_required"
    ).length,
    blocked_check_count: checks.filter(
      (check) => check.readiness_state !== "operator_run_required"
    ).length,
    checks,
    verification_scripts: {
      schema: "iris_foundation_post_start_health_scripts_v1",
      post_start_health_checklist_script:
        "npm run dev:foundation:post-start-health-checklist",
      process_handoff_dry_run_script:
        "npm run dev:foundation:process-handoff-dry-run",
      local_engine_health_probe_script: "npm run dev:engine:probe",
      bridge_worker_status_script: "npm run dev:bridge:status-roundtrip",
      obs_bridge_health_probe_script: "npm run dev:obs:probe",
      obs_runtime_render_roundtrip_script: "npm run dev:obs:runtime-render-roundtrip",
      foundation_live_readiness_script: "npm run dev:foundation:live-readiness",
    },
    boundary_policy: createBoundaryPolicy(),
  };
  assertFoundationPostStartHealthChecklistSafe(checklist);
  return checklist;
}

export function assertFoundationPostStartHealthChecklistSafe(
  checklist,
  context = "foundation post-start health checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist must be an object`);
  }
  if (checklist.schema !== SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(checklist)) {
    if (!FOUNDATION_POST_START_HEALTH_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`, { field });
    }
  }
  if (
    checklist.checklist_status !== "ready_for_operator_post_start_health_checks" &&
    checklist.checklist_status !== "blocked_before_operator_handoff"
  ) {
    throw new ContractError(`${context}: invalid checklist status`);
  }
  assertSafeObject(checklist, context);
  assertNoUnsafeText(checklist, context);
  assertBoundaryPolicy(
    checklist.boundary_policy,
    [
      "read_only_checklist",
      "script_names_only",
      "ids_and_counts_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_raw_payloads",
      "no_candidate_payloads",
      "no_commands",
      "no_real_probe_executed",
      "no_network_request_attempted",
      "no_obs_operation",
    ],
    `${context}: boundary policy`
  );
  if (checklist.health_probe_executed_by_checklist !== false) {
    throw new ContractError(`${context}: checklist must not run health probes`);
  }
  if (checklist.network_request_attempted_by_checklist !== false) {
    throw new ContractError(`${context}: checklist must not make network requests`);
  }
  if (checklist.obs_operation_attempted_by_checklist !== false) {
    throw new ContractError(`${context}: checklist must not touch OBS`);
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
    read_only_checklist: true,
    script_names_only: true,
    ids_and_counts_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_raw_payloads: true,
    no_candidate_payloads: true,
    no_commands: true,
    no_real_probe_executed: true,
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
