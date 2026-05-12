import { ContractError } from "../../core/contracts.js";

const URL_PATTERN = /https?:\/\/|postgres:\/\/|postgresql:\/\//i;
const AUTH_GATE_STATUSES = new Set(["ready", "blocked"]);
const REQUIRED_ENV_NAMES = [
  "IRIS_ADMIN_REVIEW_ADMIN_AUTHENTICATED",
  "IRIS_ADMIN_REVIEW_OWNER_CONFIRMED",
];
const ALLOWED_ACTOR_ROLES = new Set(["owner", "admin", "operator"]);
const FORBIDDEN_FIELDS = new Set([
  "world_command",
  "event_id",
  "trace_id",
  "subtitle_text",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "memory_candidate",
  "relationship_candidate",
  "relationship_update_candidate",
  "approved_memory_record",
  "approved_relationship_record",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "payload",
  "raw_frame",
  "ocr_text",
]);
const ADMIN_REVIEW_AUTH_GATE_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "auth_gate_status",
  "actor_role_label",
  "admin_authenticated",
  "owner_confirmed",
  "actor_allowed",
  "required_env_names",
  "configured_required_env_count",
  "missing_required_env_names",
  "private_runner_allowed",
  "private_runner_input_materialized",
  "private_validator_called",
  "validator_execution_performed",
  "validator_commit_performed",
  "memory_store_write_performed",
  "relationship_store_write_performed",
  "raw_candidate_exposed",
  "approved_record_exposed",
  "boundary_policy",
]);
const ADMIN_REVIEW_AUTH_GATE_BOUNDARY_POLICY_FIELDS = new Set([
  "auth_status_only",
  "env_names_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_raw_candidates",
  "no_approved_records",
  "no_private_runner_call",
  "no_validator_execution",
  "no_validator_commit",
  "no_memory_or_relationship_store_write",
  "no_commands",
  "no_game_or_os_input",
]);

export function createAdminReviewAuthGateReport({
  env = process.env,
  actorRole = "operator",
  generatedAtMs = Date.now(),
} = {}) {
  const actorRoleLabel = sanitizeActorRole(actorRole);
  const adminAuthenticated =
    env?.IRIS_ADMIN_REVIEW_ADMIN_AUTHENTICATED === "true";
  const ownerConfirmed = env?.IRIS_ADMIN_REVIEW_OWNER_CONFIRMED === "true";
  const missingRequiredEnvNames = REQUIRED_ENV_NAMES.filter(
    (name) => env?.[name] !== "true"
  );
  const actorAllowed = actorRoleLabel === "owner" || actorRoleLabel === "admin";
  const privateRunnerAllowed =
    adminAuthenticated && ownerConfirmed && actorAllowed;
  const report = {
    schema: "iris_admin_review_auth_gate_v1",
    generated_at_ms: generatedAtMs,
    auth_gate_status: privateRunnerAllowed ? "ready" : "blocked",
    actor_role_label: actorRoleLabel,
    admin_authenticated: adminAuthenticated,
    owner_confirmed: ownerConfirmed,
    actor_allowed: actorAllowed,
    required_env_names: REQUIRED_ENV_NAMES,
    configured_required_env_count:
      REQUIRED_ENV_NAMES.length - missingRequiredEnvNames.length,
    missing_required_env_names: missingRequiredEnvNames,
    private_runner_allowed: privateRunnerAllowed,
    private_runner_input_materialized: false,
    private_validator_called: false,
    validator_execution_performed: false,
    validator_commit_performed: false,
    memory_store_write_performed: false,
    relationship_store_write_performed: false,
    raw_candidate_exposed: false,
    approved_record_exposed: false,
    boundary_policy: {
      auth_status_only: true,
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_private_runner_call: true,
      no_validator_execution: true,
      no_validator_commit: true,
      no_memory_or_relationship_store_write: true,
      no_commands: true,
      no_game_or_os_input: true,
    },
  };
  assertAdminReviewAuthGateSafe(report);
  return report;
}

export function assertAdminReviewAuthGateSafe(
  report,
  context = "admin review auth gate"
) {
  assertSafeObject(report, context);
  if (report.schema !== "iris_admin_review_auth_gate_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!ADMIN_REVIEW_AUTH_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected auth gate field ${field}`);
    }
  }
  if (!AUTH_GATE_STATUSES.has(report.auth_gate_status)) {
    throw new ContractError(`${context}: invalid auth gate status`);
  }
  if (!ALLOWED_ACTOR_ROLES.has(report.actor_role_label)) {
    throw new ContractError(`${context}: invalid actor role label`);
  }
  if (
    report.private_runner_input_materialized !== false ||
    report.private_validator_called !== false ||
    report.validator_execution_performed !== false ||
    report.validator_commit_performed !== false ||
    report.memory_store_write_performed !== false ||
    report.relationship_store_write_performed !== false ||
    report.raw_candidate_exposed !== false ||
    report.approved_record_exposed !== false
  ) {
    throw new ContractError(`${context}: execution, write, or exposure boundary failed`);
  }
  if (!Array.isArray(report.required_env_names)) {
    throw new ContractError(`${context}: env name list required`);
  }
  if (
    report.required_env_names.length !== REQUIRED_ENV_NAMES.length ||
    new Set(report.required_env_names).size !== report.required_env_names.length ||
    REQUIRED_ENV_NAMES.some((name) => !report.required_env_names.includes(name))
  ) {
    throw new ContractError(`${context}: required env names mismatch`);
  }
  for (const name of report.required_env_names) {
    if (typeof name !== "string" || !name.startsWith("IRIS_")) {
      throw new ContractError(`${context}: unsafe env name`);
    }
  }
  if (
    !Array.isArray(report.missing_required_env_names) ||
    new Set(report.missing_required_env_names).size !==
      report.missing_required_env_names.length ||
    report.missing_required_env_names.some(
      (name) => !REQUIRED_ENV_NAMES.includes(name)
    ) ||
    report.configured_required_env_count +
      report.missing_required_env_names.length !==
      REQUIRED_ENV_NAMES.length
  ) {
    throw new ContractError(`${context}: required env count mismatch`);
  }
  if (
    typeof report.admin_authenticated !== "boolean" ||
    typeof report.owner_confirmed !== "boolean" ||
    typeof report.actor_allowed !== "boolean" ||
    typeof report.private_runner_allowed !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid auth booleans`);
  }
  const expectedPrivateRunnerAllowed =
    report.admin_authenticated && report.owner_confirmed && report.actor_allowed;
  const expectedActorAllowed =
    report.actor_role_label === "owner" || report.actor_role_label === "admin";
  if (report.actor_allowed !== expectedActorAllowed) {
    throw new ContractError(`${context}: actor allowed mismatch`);
  }
  if (report.private_runner_allowed !== expectedPrivateRunnerAllowed) {
    throw new ContractError(`${context}: private runner allowed mismatch`);
  }
  if (
    report.auth_gate_status !==
    (report.private_runner_allowed ? "ready" : "blocked")
  ) {
    throw new ContractError(`${context}: auth gate status mismatch`);
  }
  if (
    report.auth_gate_status === "ready" &&
    report.private_runner_allowed !== true
  ) {
    throw new ContractError(`${context}: ready gate must allow private runner`);
  }
  assertBoundaryPolicy(
    report.boundary_policy,
    {
      auth_status_only: true,
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_private_runner_call: true,
      no_validator_execution: true,
      no_validator_commit: true,
      no_memory_or_relationship_store_write: true,
      no_commands: true,
      no_game_or_os_input: true,
    },
    context
  );
}

function sanitizeActorRole(actorRole) {
  const value = String(actorRole ?? "operator").trim().toLowerCase();
  return ALLOWED_ACTOR_ROLES.has(value) ? value : "operator";
}

function assertBoundaryPolicy(actual, expected, context) {
  assertSafeObject(actual, `${context} boundary policy`);
  for (const field of Object.keys(actual)) {
    if (!ADMIN_REVIEW_AUTH_GATE_BOUNDARY_POLICY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const [field, value] of Object.entries(expected)) {
    if (actual?.[field] !== value) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertSafeObject(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: object required`);
  }
  if (URL_PATTERN.test(JSON.stringify(value))) {
    throw new ContractError(`${context}: endpoint value leaked`);
  }
  assertNoForbiddenFields(value, context);
}

function assertNoForbiddenFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { field, path });
    }
    assertNoForbiddenFields(child, context, `${path}.${field}`);
  }
}
