import { ContractError } from "../../core/contracts.js";

const PLAN_SCHEMA = "iris_postgres_pool_factory_plan_v1";

const SSL_MODES = new Set(["disable", "prefer", "require", "verify-ca", "verify-full"]);

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
const POSTGRES_POOL_FACTORY_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "plan_status",
  "real_pool_creation_allowed_by_plan",
  "real_pool_created_by_plan",
  "db_connection_attempted_by_plan",
  "connection_configured",
  "ssl_mode_policy",
  "max_pool_size",
  "idle_timeout_ms",
  "statement_timeout_ms",
  "required_env_names",
  "optional_env_names",
  "missing_required_env",
  "private_factory_contract",
  "boundary_policy",
]);
const PRIVATE_FACTORY_CONTRACT_FIELDS = new Set([
  "schema",
  "connection_string_must_remain_private",
  "pg_pool_creation_is_operator_controlled",
  "public_reports_are_config_only",
  "prepared_executor_required_after_pool_creation",
]);

export function createPostgresPoolFactoryPlan({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const connectionConfigured = Boolean(String(env.IRIS_POSTGRES_CONNECTION_STRING ?? "").trim());
  const sslMode = normalizeSslMode(env.IRIS_POSTGRES_SSL_MODE);
  const maxPoolSize = clampInteger(env.IRIS_POSTGRES_MAX_POOL_SIZE, 1, 100, 10);
  const idleTimeoutMs = clampInteger(
    env.IRIS_POSTGRES_IDLE_TIMEOUT_MS,
    1_000,
    3_600_000,
    30_000
  );
  const statementTimeoutMs = clampInteger(
    env.IRIS_POSTGRES_STATEMENT_TIMEOUT_MS,
    1_000,
    3_600_000,
    30_000
  );
  const plan = {
    schema: PLAN_SCHEMA,
    generated_at_ms: generatedAtMs,
    plan_status: connectionConfigured ? "ready_for_private_pool_factory" : "blocked_by_configuration",
    real_pool_creation_allowed_by_plan: connectionConfigured,
    real_pool_created_by_plan: false,
    db_connection_attempted_by_plan: false,
    connection_configured: connectionConfigured,
    ssl_mode_policy: sslMode,
    max_pool_size: maxPoolSize,
    idle_timeout_ms: idleTimeoutMs,
    statement_timeout_ms: statementTimeoutMs,
    required_env_names: ["IRIS_POSTGRES_CONNECTION_STRING"],
    optional_env_names: [
      "IRIS_POSTGRES_SSL_MODE",
      "IRIS_POSTGRES_MAX_POOL_SIZE",
      "IRIS_POSTGRES_IDLE_TIMEOUT_MS",
      "IRIS_POSTGRES_STATEMENT_TIMEOUT_MS",
    ],
    missing_required_env: connectionConfigured
      ? []
      : ["IRIS_POSTGRES_CONNECTION_STRING"],
    private_factory_contract: {
      schema: "iris_postgres_private_pool_factory_contract_v1",
      connection_string_must_remain_private: true,
      pg_pool_creation_is_operator_controlled: true,
      public_reports_are_config_only: true,
      prepared_executor_required_after_pool_creation: true,
    },
    boundary_policy: createBoundaryPolicy(),
  };
  assertPostgresPoolFactoryPlanSafe(plan);
  return plan;
}

export function assertPostgresPoolFactoryPlanSafe(
  plan,
  context = "postgres pool factory plan"
) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: plan must be an object`);
  }
  if (plan.schema !== PLAN_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!POSTGRES_POOL_FACTORY_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pool factory plan field ${field}`);
    }
  }
  if (
    plan.plan_status !== "ready_for_private_pool_factory" &&
    plan.plan_status !== "blocked_by_configuration"
  ) {
    throw new ContractError(`${context}: invalid plan status`);
  }
  assertPrivateFactoryContractSafe(plan.private_factory_contract, context);
  assertPublicSafeObject(plan, context);
  assertNoUnsafeText(plan, context);
  const requiredBoundaryPolicy = [
    "env_names_only",
    "no_secret_values",
    "no_connection_values",
    "no_endpoint_values",
    "no_sql_statements",
    "no_public_parameter_values",
    "no_record_payloads",
    "no_candidate_payloads",
    "no_commands",
    "no_db_connection_attempted",
    "no_pool_created_by_plan",
  ];
  assertExactBoundaryPolicy(
    plan.boundary_policy,
    Object.fromEntries(requiredBoundaryPolicy.map((key) => [key, true])),
    context
  );
  for (const key of requiredBoundaryPolicy) {
    if (plan.boundary_policy[key] !== true) {
      throw new ContractError(`${context}: boundary policy ${key} must be true`);
    }
  }
  if (plan.real_pool_created_by_plan !== false) {
    throw new ContractError(`${context}: plan must not create a pool`);
  }
  if (plan.db_connection_attempted_by_plan !== false) {
    throw new ContractError(`${context}: plan must not attempt a connection`);
  }
}

function assertPrivateFactoryContractSafe(contract, context) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: private factory contract required`);
  }
  if (contract.schema !== "iris_postgres_private_pool_factory_contract_v1") {
    throw new ContractError(`${context}: invalid private factory contract schema`);
  }
  for (const field of Object.keys(contract)) {
    if (!PRIVATE_FACTORY_CONTRACT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected private factory contract field ${field}`);
    }
  }
  for (const field of [
    "connection_string_must_remain_private",
    "pg_pool_creation_is_operator_controlled",
    "public_reports_are_config_only",
    "prepared_executor_required_after_pool_creation",
  ]) {
    if (contract[field] !== true) {
      throw new ContractError(`${context}: private factory contract ${field} required`);
    }
  }
}

function normalizeSslMode(value) {
  const text = String(value ?? "prefer").trim().toLowerCase();
  return SSL_MODES.has(text) ? text : "prefer";
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function createBoundaryPolicy() {
  return {
    env_names_only: true,
    no_secret_values: true,
    no_connection_values: true,
    no_endpoint_values: true,
    no_sql_statements: true,
    no_public_parameter_values: true,
    no_record_payloads: true,
    no_candidate_payloads: true,
    no_commands: true,
    no_db_connection_attempted: true,
    no_pool_created_by_plan: true,
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
