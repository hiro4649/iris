import { ContractError } from "../../core/contracts.js";

const RESULT_SCHEMA = "iris_postgres_pg_module_resolver_result_v1";

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
  "values",
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
  "connectionString",
  "dsn",
  "database_url",
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
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|postgres:\/\/|postgresql:\/\/|select |insert |update |delete |constraint |violates )\b|https?:\/\//i;
const PG_MODULE_RESOLVER_RESULT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "resolver_status",
  "pool_class_available",
  "module_import_attempted_by_resolver",
  "db_connection_attempted_by_resolver",
  "boundary_policy",
]);

export function resolvePostgresPoolClassFromModule({
  pgModule,
  generatedAtMs = Date.now,
} = {}) {
  const PoolClass = findPoolClass(pgModule);
  const poolClassAvailable = typeof PoolClass === "function";
  const result = {
    schema: RESULT_SCHEMA,
    generated_at_ms: generatedAtMs(),
    resolver_status: poolClassAvailable ? "pool_class_resolved" : "pool_class_missing",
    pool_class_available: poolClassAvailable,
    module_import_attempted_by_resolver: false,
    db_connection_attempted_by_resolver: false,
    boundary_policy: createBoundaryPolicy(),
  };
  assertPostgresPgModuleResolverResultSafe(result);
  return {
    PoolClass,
    result,
  };
}

export function assertPostgresPgModuleResolverResultSafe(
  result,
  context = "postgres pg module resolver result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result must be an object`);
  }
  if (result.schema !== RESULT_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(result)) {
    if (!PG_MODULE_RESOLVER_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected resolver result field ${field}`);
    }
  }
  if (
    result.resolver_status !== "pool_class_resolved" &&
    result.resolver_status !== "pool_class_missing"
  ) {
    throw new ContractError(`${context}: invalid resolver status`);
  }
  assertPublicSafeObject(result, context);
  assertNoUnsafeText(result, context);
  const requiredBoundaryPolicy = [
    "injected_module_only",
    "no_dynamic_import_by_default",
    "no_secret_values",
    "no_connection_values",
    "no_endpoint_values",
    "no_sql_statements",
    "no_public_parameter_values",
    "no_record_payloads",
    "no_candidate_payloads",
    "no_commands",
    "no_db_connection_attempted",
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
  if (result.module_import_attempted_by_resolver !== false) {
    throw new ContractError(`${context}: resolver must not import modules`);
  }
  if (result.db_connection_attempted_by_resolver !== false) {
    throw new ContractError(`${context}: resolver must not attempt DB connection`);
  }
}

function findPoolClass(pgModule) {
  if (!pgModule || typeof pgModule !== "object") return null;
  if (typeof pgModule.Pool === "function") return pgModule.Pool;
  if (
    pgModule.default &&
    typeof pgModule.default === "object" &&
    typeof pgModule.default.Pool === "function"
  ) {
    return pgModule.default.Pool;
  }
  return null;
}

function createBoundaryPolicy() {
  return {
    injected_module_only: true,
    no_dynamic_import_by_default: true,
    no_secret_values: true,
    no_connection_values: true,
    no_endpoint_values: true,
    no_sql_statements: true,
    no_public_parameter_values: true,
    no_record_payloads: true,
    no_candidate_payloads: true,
    no_commands: true,
    no_db_connection_attempted: true,
  };
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

function assertNoUnsafeText(value, context) {
  const serialized = JSON.stringify(value);
  if (UNSAFE_PUBLIC_TEXT_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: unsafe public text detected`);
  }
}
