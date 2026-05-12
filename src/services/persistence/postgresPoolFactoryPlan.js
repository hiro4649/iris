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
const POSTGRES_CONFIG_SAFE_SUMMARY_SCHEMA =
  "iris_postgres_config_safe_summary_v1";
const POSTGRES_CONFIG_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "status",
  "configured",
  "missing",
]);
const DB_ADAPTER_CONFIG_REDACTION_SUMMARY_SCHEMA =
  "iris_db_adapter_config_redaction_summary_v1";
const DB_ADAPTER_CONFIG_REDACTION_SUMMARY_FIELDS = new Set([
  "schema",
  "status",
  "configured_count",
  "missing_count",
  "boundary_policy",
]);
const POSTGRES_CONNECTION_READINESS_SCHEMA =
  "iris_postgres_connection_readiness_classifier_v1";
const POSTGRES_CONNECTION_READINESS_FIELDS = new Set([
  "schema",
  "readiness_status",
  "connection_configured",
  "connection_verified",
  "db_connection_attempted",
  "operator_attention_required",
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

export function createPostgresConfigSafeSummary({
  env = process.env,
} = {}) {
  const connectionConfigured = Boolean(
    String(env.IRIS_POSTGRES_CONNECTION_STRING ?? "").trim()
  );
  const summary = {
    schema: POSTGRES_CONFIG_SAFE_SUMMARY_SCHEMA,
    status: connectionConfigured ? "configured" : "missing",
    configured: connectionConfigured ? ["IRIS_POSTGRES_CONNECTION_STRING"] : [],
    missing: connectionConfigured ? [] : ["IRIS_POSTGRES_CONNECTION_STRING"],
  };
  assertPostgresConfigSafeSummary(summary);
  return summary;
}

export function assertPostgresConfigSafeSummary(
  summary,
  context = "postgres config safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary must be an object`);
  }
  if (summary.schema !== POSTGRES_CONFIG_SAFE_SUMMARY_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!POSTGRES_CONFIG_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field ${field}`);
    }
  }
  if (!["configured", "missing"].includes(summary.status)) {
    throw new ContractError(`${context}: invalid status`);
  }
  assertEnvNameList(summary.configured, `${context}: configured`);
  assertEnvNameList(summary.missing, `${context}: missing`);
  assertNoUnsafeText(summary, context);
}

export function createDbAdapterConfigRedactionSummary({
  env = process.env,
} = {}) {
  const configuredCount = String(env.IRIS_POSTGRES_CONNECTION_STRING ?? "").trim()
    ? 1
    : 0;
  const missingCount = configuredCount === 1 ? 0 : 1;
  const summary = {
    schema: DB_ADAPTER_CONFIG_REDACTION_SUMMARY_SCHEMA,
    status: configuredCount === 1 ? "configured" : "missing",
    configured_count: configuredCount,
    missing_count: missingCount,
    boundary_policy: {
      status_and_counts_only: true,
      private_values_redacted: true,
      adapter_public_safe: true,
      no_db_connection_attempted: true,
    },
  };
  assertDbAdapterConfigRedactionSummarySafe(summary);
  return summary;
}

export function assertDbAdapterConfigRedactionSummarySafe(
  summary,
  context = "db adapter config redaction summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary must be an object`);
  }
  if (summary.schema !== DB_ADAPTER_CONFIG_REDACTION_SUMMARY_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!DB_ADAPTER_CONFIG_REDACTION_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field ${field}`);
    }
  }
  if (!["configured", "missing"].includes(summary.status)) {
    throw new ContractError(`${context}: invalid status`);
  }
  for (const field of ["configured_count", "missing_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (summary.configured_count + summary.missing_count !== 1) {
    throw new ContractError(`${context}: invalid config counts`);
  }
  if (
    summary.status !==
    (summary.configured_count === 1 ? "configured" : "missing")
  ) {
    throw new ContractError(`${context}: status/count mismatch`);
  }
  assertExactBoundaryPolicy(
    summary.boundary_policy,
    {
      status_and_counts_only: true,
      private_values_redacted: true,
      adapter_public_safe: true,
      no_db_connection_attempted: true,
    },
    context
  );
  for (const value of Object.values(summary.boundary_policy)) {
    if (value !== true) {
      throw new ContractError(`${context}: boundary policy must be true`);
    }
  }
  assertPublicSafeObject(summary, context);
  assertNoUnsafeText(summary, context);
}

export function createPostgresConnectionReadinessClassifier({
  env = process.env,
  connectionVerified = false,
  dbConnectionAttempted = false,
} = {}) {
  const connectionConfigured = Boolean(
    String(env.IRIS_POSTGRES_CONNECTION_STRING ?? "").trim()
  );
  const attempted = dbConnectionAttempted === true;
  const verified = attempted && connectionVerified === true;
  const classifier = {
    schema: POSTGRES_CONNECTION_READINESS_SCHEMA,
    readiness_status: verified ? "verified_ready" : "blocked_pending_real_db_connection",
    connection_configured: connectionConfigured,
    connection_verified: verified,
    db_connection_attempted: attempted,
    operator_attention_required: verified !== true,
  };
  assertPostgresConnectionReadinessClassifierSafe(classifier);
  return classifier;
}

export function assertPostgresConnectionReadinessClassifierSafe(
  classifier,
  context = "postgres connection readiness classifier"
) {
  if (!classifier || typeof classifier !== "object" || Array.isArray(classifier)) {
    throw new ContractError(`${context}: classifier must be an object`);
  }
  if (classifier.schema !== POSTGRES_CONNECTION_READINESS_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(classifier)) {
    if (!POSTGRES_CONNECTION_READINESS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected classifier field ${field}`);
    }
  }
  if (
    !["blocked_pending_real_db_connection", "verified_ready"].includes(
      classifier.readiness_status
    )
  ) {
    throw new ContractError(`${context}: invalid readiness status`);
  }
  for (const field of [
    "connection_configured",
    "connection_verified",
    "db_connection_attempted",
    "operator_attention_required",
  ]) {
    if (typeof classifier[field] !== "boolean") {
      throw new ContractError(`${context}: invalid boolean ${field}`);
    }
  }
  if (
    classifier.connection_verified !== true &&
    classifier.readiness_status === "verified_ready"
  ) {
    throw new ContractError(`${context}: unverified connection must not be ready`);
  }
  if (
    classifier.db_connection_attempted !== true &&
    (classifier.connection_verified === true ||
      classifier.readiness_status === "verified_ready")
  ) {
    throw new ContractError(`${context}: real db connection is required for ready`);
  }
  if (
    classifier.connection_verified !== true &&
    classifier.operator_attention_required !== true
  ) {
    throw new ContractError(`${context}: unverified connection requires attention`);
  }
  assertNoUnsafeText(classifier, context);
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

function assertEnvNameList(list, context) {
  if (!Array.isArray(list)) {
    throw new ContractError(`${context}: env list must be an array`);
  }
  for (const name of list) {
    if (typeof name !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(name)) {
      throw new ContractError(`${context}: unsafe env name`);
    }
  }
}
