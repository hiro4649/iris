import { ContractError } from "../../core/contracts.js";

const FAILURE_SCHEMA = "iris_postgres_persistence_failure_result_v1";

export const POSTGRES_PERSISTENCE_ERROR_KINDS = new Set([
  "postgres_unique_conflict",
  "postgres_foreign_key_rejected",
  "postgres_check_constraint_rejected",
  "postgres_not_null_rejected",
  "postgres_serialization_retry",
  "postgres_deadlock_retry",
  "postgres_connection_unavailable",
  "postgres_connection_timeout",
  "postgres_authentication_failed",
  "postgres_capacity_unavailable",
  "postgres_contract_failed",
  "postgres_unavailable",
]);

const RETRYABLE_ERROR_KINDS = new Set([
  "postgres_serialization_retry",
  "postgres_deadlock_retry",
  "postgres_connection_unavailable",
  "postgres_connection_timeout",
  "postgres_capacity_unavailable",
  "postgres_unavailable",
]);

const FORBIDDEN_PUBLIC_FIELDS = new Set([
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
  "summary",
  "text",
  "message_text",
  "display_name",
  "payload",
  "value",
  "params",
  "parameters",
  "sql",
  "raw_sql",
  "query",
  "statement",
  "command",
  "endpoint",
  "url",
  "connection_string",
  "dsn",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "message",
  "detail",
  "hint",
  "where",
  "stack",
]);

const UNSAFE_PUBLIC_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|postgres:\/\/|select |insert |update |delete |constraint |violates )\b|https?:\/\//i;
const POSTGRES_PERSISTENCE_FAILURE_RESULT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "operation_result_status",
  "operation_kind",
  "error_kind",
  "retryable",
  "real_database_connected",
  "public_error_detail_available",
  "boundary_policy",
]);

export function classifyPostgresPersistenceError(error) {
  if (error instanceof ContractError) return "postgres_contract_failed";
  const code = typeof error?.code === "string" ? error.code : "";
  if (code === "23505") return "postgres_unique_conflict";
  if (code === "23503") return "postgres_foreign_key_rejected";
  if (code === "23514") return "postgres_check_constraint_rejected";
  if (code === "23502") return "postgres_not_null_rejected";
  if (code === "40001") return "postgres_serialization_retry";
  if (code === "40P01") return "postgres_deadlock_retry";
  if (code === "28P01" || code === "28000") return "postgres_authentication_failed";
  if (code === "53300" || code === "53400" || code === "53100") {
    return "postgres_capacity_unavailable";
  }
  if (["ECONNREFUSED", "ECONNRESET", "EPIPE", "ENOTFOUND"].includes(code)) {
    return "postgres_connection_unavailable";
  }
  if (["ETIMEDOUT", "ESOCKETTIMEDOUT"].includes(code)) {
    return "postgres_connection_timeout";
  }
  return "postgres_unavailable";
}

export function createPostgresPersistenceFailureResult({
  error,
  operationKind = "unknown_operation",
  generatedAtMs = Date.now(),
} = {}) {
  const errorKind = classifyPostgresPersistenceError(error);
  const result = {
    schema: FAILURE_SCHEMA,
    generated_at_ms: generatedAtMs,
    operation_result_status: "failed_safely",
    operation_kind: sanitizeOperationKind(operationKind),
    error_kind: errorKind,
    retryable: RETRYABLE_ERROR_KINDS.has(errorKind),
    real_database_connected: false,
    public_error_detail_available: false,
    boundary_policy: {
      counts_only: true,
      error_kind_only: true,
      no_error_messages: true,
      no_stack_traces: true,
      no_connection_values: true,
      no_endpoint_values: true,
      no_sql_statements: true,
      no_parameter_values: true,
      no_record_payloads: true,
      no_candidate_payloads: true,
      no_commands: true,
    },
  };
  assertPostgresPersistenceFailureResultSafe(result);
  return result;
}

export function assertPostgresPersistenceFailureResultSafe(
  result,
  context = "postgres persistence failure result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result must be an object`);
  }
  if (result.schema !== FAILURE_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(result)) {
    if (!POSTGRES_PERSISTENCE_FAILURE_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected failure result field ${field}`);
    }
  }
  if (result.operation_result_status !== "failed_safely") {
    throw new ContractError(`${context}: invalid operation result status`);
  }
  if (!POSTGRES_PERSISTENCE_ERROR_KINDS.has(result.error_kind)) {
    throw new ContractError(`${context}: invalid error kind`);
  }
  assertPublicSafeObject(result, context);
  const serialized = JSON.stringify(result);
  if (UNSAFE_PUBLIC_TEXT_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: unsafe public text detected`);
  }
  const requiredBoundaryPolicy = [
    "counts_only",
    "error_kind_only",
    "no_error_messages",
    "no_stack_traces",
    "no_connection_values",
    "no_endpoint_values",
    "no_sql_statements",
    "no_parameter_values",
    "no_record_payloads",
    "no_candidate_payloads",
    "no_commands",
  ];
  assertExactBoundaryPolicy(
    result.boundary_policy,
    Object.fromEntries(requiredBoundaryPolicy.map((key) => [key, true])),
    context
  );
  for (const key of requiredBoundaryPolicy) {
    if (result.boundary_policy[key] !== true) {
      throw new ContractError(`${context}: boundary policy ${key} must be true`);
    }
  }
}

function sanitizeOperationKind(value) {
  const rawText = String(value ?? "unknown_operation");
  if (UNSAFE_PUBLIC_TEXT_PATTERN.test(rawText)) return "unknown_operation";
  const text = rawText
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (!text || UNSAFE_PUBLIC_TEXT_PATTERN.test(text)) return "unknown_operation";
  return text.slice(0, 80);
}

function assertPublicSafeObject(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertPublicSafeObject(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_PUBLIC_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe public field ${field}`, { path });
    }
    assertPublicSafeObject(child, context, `${path}.${field}`);
  }
}

function assertExactBoundaryPolicy(policy, expected, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy must be an object`);
  }
  for (const key of Object.keys(policy)) {
    if (!Object.hasOwn(expected, key)) {
      throw new ContractError(`${context}: unexpected boundary policy ${key}`);
    }
  }
  for (const key of Object.keys(expected)) {
    if (!Object.hasOwn(policy, key)) {
      throw new ContractError(`${context}: missing boundary policy ${key}`);
    }
  }
}
