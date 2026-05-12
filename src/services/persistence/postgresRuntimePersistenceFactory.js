import { ContractError } from "../../core/contracts.js";
import { createPostgresPersistenceAdapter } from "./postgresPersistenceAdapter.js";
import { createPostgresPersistenceStores } from "./postgresPersistenceStores.js";
import { createPostgresPreparedStatementExecutor } from "./postgresPreparedStatementExecutor.js";
import {
  assertPostgresPrivatePoolFactoryResultSafe,
  createPostgresPrivatePoolFactory,
} from "./postgresPrivatePoolFactory.js";

const RESULT_SCHEMA = "iris_postgres_runtime_persistence_factory_result_v1";

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
const RUNTIME_PERSISTENCE_FACTORY_RESULT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "factory_result_status",
  "pool_created",
  "pool_factory_result_status",
  "connection_configured",
  "postgres_store_created",
  "real_database_connected",
  "db_connection_attempted",
  "boundary_policy",
]);

export function createPostgresRuntimePersistenceStores({
  env = process.env,
  PoolClass,
  generatedAtMs = Date.now,
  allowPoolCreation = false,
} = {}) {
  const poolFactory = createPostgresPrivatePoolFactory({
    env,
    PoolClass,
    generatedAtMs,
    allowPoolCreation,
  });
  const { pool, result: poolFactoryResult } = poolFactory.createPool();
  assertPostgresPrivatePoolFactoryResultSafe(
    poolFactoryResult,
    "postgres runtime persistence pool factory result"
  );
  if (!pool) {
    return {
      stores: null,
      result: createResult({
        generatedAtMs: generatedAtMs(),
        resultStatus: "blocked_before_store_creation",
        poolFactoryResult,
      }),
    };
  }

  const statementExecutor = createPostgresPreparedStatementExecutor({
    pool,
    generatedAtMs,
  });
  const adapter = createPostgresPersistenceAdapter({
    statementExecutor,
    generatedAtMs,
  });
  const stores = createPostgresPersistenceStores({
    adapter,
    generatedAtMs,
  });
  return {
    stores,
    result: createResult({
      generatedAtMs: generatedAtMs(),
      resultStatus: "stores_created",
      poolFactoryResult,
    }),
  };
}

export function assertPostgresRuntimePersistenceFactoryResultSafe(
  result,
  context = "postgres runtime persistence factory result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result must be an object`);
  }
  if (result.schema !== RESULT_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(result)) {
    if (!RUNTIME_PERSISTENCE_FACTORY_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected factory result field ${field}`);
    }
  }
  if (
    result.factory_result_status !== "stores_created" &&
    result.factory_result_status !== "blocked_before_store_creation"
  ) {
    throw new ContractError(`${context}: invalid factory result status`);
  }
  assertPublicSafeObject(result, context);
  assertNoUnsafeText(result, context);
  const requiredBoundaryPolicy = [
    "operator_controlled_pool_creation",
    "private_pool_only",
    "prepared_executor_required",
    "adapter_contract_required",
    "no_secret_values",
    "no_connection_values",
    "no_endpoint_values",
    "no_sql_statements",
    "no_public_parameter_values",
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

function createResult({ generatedAtMs, resultStatus, poolFactoryResult }) {
  const result = {
    schema: RESULT_SCHEMA,
    generated_at_ms: generatedAtMs,
    factory_result_status: resultStatus,
    pool_created: poolFactoryResult.pool_created,
    pool_factory_result_status: poolFactoryResult.factory_result_status,
    connection_configured: poolFactoryResult.connection_configured,
    postgres_store_created: resultStatus === "stores_created",
    real_database_connected:
      resultStatus === "stores_created" && poolFactoryResult.pool_created === true,
    db_connection_attempted:
      resultStatus === "stores_created" && poolFactoryResult.pool_created === true,
    boundary_policy: createBoundaryPolicy(),
  };
  assertPostgresRuntimePersistenceFactoryResultSafe(result);
  return result;
}

function createBoundaryPolicy() {
  return {
    operator_controlled_pool_creation: true,
    private_pool_only: true,
    prepared_executor_required: true,
    adapter_contract_required: true,
    no_secret_values: true,
    no_connection_values: true,
    no_endpoint_values: true,
    no_sql_statements: true,
    no_public_parameter_values: true,
    no_record_payloads: true,
    no_candidate_payloads: true,
    no_commands: true,
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
