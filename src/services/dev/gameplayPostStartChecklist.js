import { ContractError } from "../../core/contracts.js";
import {
  assertGameplayLiveReadinessReportSafe,
  createGameplayLiveReadinessReport,
} from "./gameplayLiveReadiness.js";

const SCHEMA = "iris_gameplay_post_start_checklist_v1";

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
  "last_text",
  "text",
  "subtitle_text",
  "endpoint",
  "url",
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
  "raw_frame",
  "frame",
  "image",
  "ocr_text",
  "command",
]);

const UNSAFE_TEXT_PATTERN =
  /\b(world_command|input_action|approved_game_input_action|execute|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|raw[_-]?frame|ocr[_-]?text)\b|https?:\/\//i;
const SAFE_SCRIPT_PATTERN =
  /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i;

const CHECKLIST_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "checklist_status",
  "gameplay_live_readiness_status",
  "next_gate_id",
  "next_check_script",
  "next_readiness_state",
  "real_capture_request_attempted_by_checklist",
  "real_game_or_os_input_attempted_by_checklist",
  "action_candidate_forwarded_by_checklist",
  "approved_action_executed_by_checklist",
  "raw_frame_read_by_checklist",
  "check_count",
  "ready_check_count",
  "blocked_check_count",
  "checks",
  "verification_scripts",
  "gameplay_control_policy",
  "boundary_policy",
]);
const BOUNDARY_POLICY_FIELDS = [
  "read_only_checklist",
  "script_names_only",
  "ids_counts_and_fixed_statuses_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_raw_frames",
  "no_raw_ocr_text",
  "no_vision_payloads",
  "no_action_candidates",
  "no_approved_actions",
  "no_commands",
  "no_real_capture_request_attempted",
  "no_real_game_or_os_input_attempted",
  "no_action_candidate_forwarded",
  "no_approved_action_executed",
];

const POST_START_CHECKS = [
  {
    check_id: "runtime_status_after_start",
    gate_id: "scheduler_gate",
    verification_script: "npm run dev:gameplay:runtime-status",
  },
  {
    check_id: "vision_source_after_start",
    gate_id: "vision_capture_gate",
    verification_script: "npm run dev:vision:game-roundtrip",
  },
  {
    check_id: "validation_gate_after_start",
    gate_id: "action_gate",
    verification_script: "npm run dev:gameplay:validation-gate-roundtrip",
  },
  {
    check_id: "game_control_adapter_after_start",
    gate_id: "adapter_gate",
    verification_script: "npm run dev:game-control:roundtrip",
  },
  {
    check_id: "safe_control_runtime_after_start",
    gate_id: "safe_control_gate",
    verification_script: "npm run dev:gameplay:runtime-roundtrip",
  },
  {
    check_id: "unsafe_control_boundary_after_start",
    gate_id: "safe_control_gate",
    verification_script: "npm run dev:game-control:unsafe-roundtrip",
  },
  {
    check_id: "live_readiness_after_start",
    gate_id: "live_readiness",
    verification_script: "npm run dev:gameplay:live-readiness",
  },
];

export function createGameplayPostStartChecklist({
  env = process.env,
  httpIngestScheduler = null,
  streamState = null,
  runtime = null,
  generatedAtMs = Date.now(),
} = {}) {
  const liveReadiness = createGameplayLiveReadinessReport({
    env,
    httpIngestScheduler,
    streamState,
    runtime,
    generatedAtMs,
  });
  assertGameplayLiveReadinessReportSafe(
    liveReadiness,
    "gameplay post-start checklist live readiness"
  );
  const readyForSafeControl =
    liveReadiness.live_readiness_status ===
    "ready_for_gameplay_safe_control";
  const checks = POST_START_CHECKS.map((check, index) => ({
    schema: "iris_gameplay_post_start_check_v1",
    sequence_order: index + 1,
    check_id: check.check_id,
    gate_id: check.gate_id,
    verification_script: check.verification_script,
    readiness_state: readyForSafeControl
      ? "operator_run_required"
      : "blocked_before_gameplay_safe_control",
    real_capture_request_attempted_by_checklist: false,
    real_game_or_os_input_attempted_by_checklist: false,
    action_candidate_forwarded_by_checklist: false,
    approved_action_executed_by_checklist: false,
    raw_frame_read_by_checklist: false,
  }));
  const checklist = {
    schema: SCHEMA,
    generated_at_ms: generatedAtMs,
    checklist_status: readyForSafeControl
      ? "ready_for_operator_post_start_gameplay_checks"
      : "blocked_before_gameplay_safe_control",
    gameplay_live_readiness_status: liveReadiness.live_readiness_status,
    next_gate_id: liveReadiness.next_gate_id,
    next_check_script: liveReadiness.next_check_script,
    next_readiness_state: liveReadiness.next_readiness_state,
    real_capture_request_attempted_by_checklist: false,
    real_game_or_os_input_attempted_by_checklist: false,
    action_candidate_forwarded_by_checklist: false,
    approved_action_executed_by_checklist: false,
    raw_frame_read_by_checklist: false,
    check_count: checks.length,
    ready_check_count: checks.filter(
      (check) => check.readiness_state === "operator_run_required"
    ).length,
    blocked_check_count: checks.filter(
      (check) => check.readiness_state !== "operator_run_required"
    ).length,
    checks,
    verification_scripts: {
      schema: "iris_gameplay_post_start_scripts_v1",
      post_start_checklist_script:
        "npm run dev:gameplay:post-start-checklist",
      runtime_status_script: "npm run dev:gameplay:runtime-status",
      vision_roundtrip_script: "npm run dev:vision:game-roundtrip",
      validation_gate_roundtrip_script:
        "npm run dev:gameplay:validation-gate-roundtrip",
      game_control_roundtrip_script: "npm run dev:game-control:roundtrip",
      game_control_unsafe_roundtrip_script:
        "npm run dev:game-control:unsafe-roundtrip",
      runtime_roundtrip_script: "npm run dev:gameplay:runtime-roundtrip",
      live_readiness_script: "npm run dev:gameplay:live-readiness",
    },
    gameplay_control_policy: {
      validation_required_before_adapter: true,
      direct_action_candidate_handoff_forbidden: true,
      approved_action_execution_not_performed_by_checklist: true,
      real_capture_not_performed_by_checklist: true,
      real_game_or_os_input_not_performed_by_checklist: true,
      status_counts_only: true,
    },
    boundary_policy: createBoundaryPolicy(),
  };
  assertGameplayPostStartChecklistSafe(checklist);
  return checklist;
}

export function assertGameplayPostStartChecklistSafe(
  checklist,
  context = "gameplay post-start checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist must be an object`);
  }
  if (checklist.schema !== SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(checklist)) {
    if (!CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`, { field });
    }
  }
  if (
    checklist.checklist_status !==
      "ready_for_operator_post_start_gameplay_checks" &&
    checklist.checklist_status !== "blocked_before_gameplay_safe_control"
  ) {
    throw new ContractError(`${context}: invalid checklist status`);
  }
  assertSafeObject(checklist, context);
  assertNoUnsafeText(checklist, context);
  assertBoundaryPolicySafe(checklist.boundary_policy, context);
  for (const flag of [
    "real_capture_request_attempted_by_checklist",
    "real_game_or_os_input_attempted_by_checklist",
    "action_candidate_forwarded_by_checklist",
    "approved_action_executed_by_checklist",
    "raw_frame_read_by_checklist",
  ]) {
    if (checklist[flag] !== false) {
      throw new ContractError(`${context}: ${flag} must be false`);
    }
  }
  assertPostStartChecksSafe(checklist, context);
  assertSafeScripts(checklist, context);
}

function assertPostStartChecksSafe(checklist, context) {
  if (!Array.isArray(checklist.checks) || checklist.checks.length !== POST_START_CHECKS.length) {
    throw new ContractError(`${context}: invalid checks`);
  }
  checklist.checks.forEach((check, index) => {
    const expected = POST_START_CHECKS[index];
    if (
      !check ||
      typeof check !== "object" ||
      check.schema !== "iris_gameplay_post_start_check_v1" ||
      check.sequence_order !== index + 1 ||
      check.check_id !== expected.check_id ||
      check.gate_id !== expected.gate_id ||
      check.verification_script !== expected.verification_script ||
      !["operator_run_required", "blocked_before_gameplay_safe_control"].includes(
        check.readiness_state
      )
    ) {
      throw new ContractError(`${context}: invalid check`);
    }
  });
  const readyCount = checklist.checks.filter(
    (check) => check.readiness_state === "operator_run_required"
  ).length;
  if (
    checklist.check_count !== checklist.checks.length ||
    checklist.ready_check_count !== readyCount ||
    checklist.blocked_check_count !== checklist.checks.length - readyCount
  ) {
    throw new ContractError(`${context}: invalid check counts`);
  }
}

function createBoundaryPolicy() {
  return {
    read_only_checklist: true,
    script_names_only: true,
    ids_counts_and_fixed_statuses_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_raw_frames: true,
    no_raw_ocr_text: true,
    no_vision_payloads: true,
    no_action_candidates: true,
    no_approved_actions: true,
    no_commands: true,
    no_real_capture_request_attempted: true,
    no_real_game_or_os_input_attempted: true,
    no_action_candidate_forwarded: true,
    no_approved_action_executed: true,
  };
}

function assertBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set(BOUNDARY_POLICY_FIELDS);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy ${field} must be true`);
    }
  }
}

function assertSafeObject(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertSafeObject(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(key)) {
      throw new ContractError(`${context}: forbidden field ${path}.${key}`);
    }
    assertSafeObject(child, context, `${path}.${key}`);
  }
}

function assertNoUnsafeText(value, context, path = "root") {
  if (typeof value === "string") {
    if (UNSAFE_TEXT_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe text at ${path}`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeText(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertNoUnsafeText(child, context, `${path}.${key}`);
  }
}

function assertSafeScripts(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertSafeScripts(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "verification_script" || key.endsWith("_script")) {
      if (typeof child !== "string" || !SAFE_SCRIPT_PATTERN.test(child)) {
        throw new ContractError(`${context}: unsafe script at ${path}.${key}`);
      }
    }
    assertSafeScripts(child, context, `${path}.${key}`);
  }
}
