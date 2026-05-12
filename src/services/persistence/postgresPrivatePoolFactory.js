import { ContractError } from "../../core/contracts.js";
import {
  assertPostgresPoolFactoryPlanSafe,
  createPostgresPoolFactoryPlan,
} from "./postgresPoolFactoryPlan.js";

const RESULT_SCHEMA = "iris_postgres_private_pool_factory_result_v1";
const STATUS_SCHEMA = "iris_postgres_private_pool_factory_status_v1";

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
const POSTGRES_PRIVATE_POOL_FACTORY_RESULT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "factory_result_status",
  "pool_created",
  "pool_creation_allowed_by_plan",
  "connection_configured",
  "ssl_mode_policy",
  "max_pool_size",
  "idle_timeout_ms",
  "statement_timeout_ms",
  "error_kind",
  "boundary_policy",
]);
const POSTGRES_PRIVATE_POOL_FACTORY_STATUS_FIELDS = new Set([
  "schema",
  "factory_kind",
  "factory_status",
  "pool_creation_attempted",
  "pool_created",
  "pool_creation_blocked_count",
  "pool_creation_failed_count",
  "latest_attempt_at_ms",
  "boundary_policy",
]);

export function createPostgresPrivatePoolFactory({
  env = process.env,
  PoolClass,
  generatedAtMs = Date.now,
  allowPoolCreation = false,
} = {}) {
  if (typeof PoolClass !== "function") {
    throw new ContractError("postgres private pool factory: PoolClass is required");
  }
  const state = {
    poolCreated: false,
    poolCreationAttempted: false,
    poolCreationBlockedCount: 0,
    poolCreationFailedCount: 0,
    latestAttemptAtMs: null,
  };

  return {
    createPool() {
      state.poolCreationAttempted = true;
      state.latestAttemptAtMs = generatedAtMs();
      const plan = createPostgresPoolFactoryPlan({
        env,
        generatedAtMs: state.latestAttemptAtMs,
      });
      assertPostgresPoolFactoryPlanSafe(plan, "postgres private pool factory plan");
      if (allowPoolCreation !== true || plan.real_pool_creation_allowed_by_plan !== true) {
        state.poolCreationBlockedCount += 1;
        return {
          pool: null,
          result: createResult({
            generatedAtMs: state.latestAttemptAtMs,
            resultStatus: "blocked_by_operator_control",
            plan,
            poolCreated: false,
          }),
        };
      }
      try {
        const pool = new PoolClass(createPrivatePoolOptions({ env, plan }));
        state.poolCreated = true;
        return {
          pool,
          result: createResult({
            generatedAtMs: state.latestAttemptAtMs,
            resultStatus: "pool_created",
            plan,
            poolCreated: true,
          }),
        };
      } catch (error) {
        state.poolCreationFailedCount += 1;
        return {
          pool: null,
          result: createResult({
            generatedAtMs: state.latestAttemptAtMs,
            resultStatus: "pool_creation_failed_safely",
            plan,
            poolCreated: false,
            errorKind: "postgres_pool_creation_failed",
          }),
        };
      }
    },
    status() {
      const status = {
        schema: STATUS_SCHEMA,
        factory_kind: "postgres_private_pool_factory",
        factory_status: allowPoolCreation === true ? "operator_enabled" : "operator_disabled",
        pool_creation_attempted: state.poolCreationAttempted,
        pool_created: state.poolCreated,
        pool_creation_blocked_count: state.poolCreationBlockedCount,
        pool_creation_failed_count: state.poolCreationFailedCount,
        latest_attempt_at_ms: state.latestAttemptAtMs,
        boundary_policy: createBoundaryPolicy(),
      };
      assertPostgresPrivatePoolFactoryStatusSafe(status);
      return status;
    },
  };
}

export function assertPostgresPrivatePoolFactoryResultSafe(
  result,
  context = "postgres private pool factory result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result must be an object`);
  }
  if (result.schema !== RESULT_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(result)) {
    if (!POSTGRES_PRIVATE_POOL_FACTORY_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pool factory result field ${field}`);
    }
  }
  if (
    result.factory_result_status !== "blocked_by_operator_control" &&
    result.factory_result_status !== "pool_created" &&
    result.factory_result_status !== "pool_creation_failed_safely"
  ) {
    throw new ContractError(`${context}: invalid factory result status`);
  }
  assertPublicSafeObject(result, context);
  assertNoUnsafeText(result, context);
  assertRequiredBoundary(result.boundary_policy, context);
}

export function assertPostgresPrivatePoolFactoryStatusSafe(
  status,
  context = "postgres private pool factory status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  if (status.schema !== STATUS_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!POSTGRES_PRIVATE_POOL_FACTORY_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pool factory status field ${field}`);
    }
  }
  if (
    status.factory_kind !== "postgres_private_pool_factory" ||
    !["operator_enabled", "operator_disabled"].includes(status.factory_status)
  ) {
    throw new ContractError(`${context}: invalid factory status`);
  }
  assertPublicSafeObject(status, context);
  assertNoUnsafeText(status, context);
  assertRequiredBoundary(status.boundary_policy, context);
}

function createPrivatePoolOptions({ env, plan }) {
  return {
    connectionString: env.IRIS_POSTGRES_CONNECTION_STRING,
    ssl:
      plan.ssl_mode_policy === "disable"
        ? false
        : { rejectUnauthorized: plan.ssl_mode_policy === "verify-full" },
    max: plan.max_pool_size,
    idleTimeoutMillis: plan.idle_timeout_ms,
    statement_timeout: plan.statement_timeout_ms,
  };
}

function createResult({
  generatedAtMs,
  resultStatus,
  plan,
  poolCreated,
  errorKind = null,
}) {
  const result = {
    schema: RESULT_SCHEMA,
    generated_at_ms: generatedAtMs,
    factory_result_status: resultStatus,
    pool_created: poolCreated,
    pool_creation_allowed_by_plan: plan.real_pool_creation_allowed_by_plan,
    connection_configured: plan.connection_configured,
    ssl_mode_policy: plan.ssl_mode_policy,
    max_pool_size: plan.max_pool_size,
    idle_timeout_ms: plan.idle_timeout_ms,
    statement_timeout_ms: plan.statement_timeout_ms,
    error_kind: errorKind,
    boundary_policy: createBoundaryPolicy(),
  };
  assertPostgresPrivatePoolFactoryResultSafe(result);
  return result;
}

function createBoundaryPolicy() {
  return {
    private_pool_only: true,
    operator_controlled_pool_creation: true,
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

function assertRequiredBoundary(boundaryPolicy, context) {
  const required = [
    "private_pool_only",
    "operator_controlled_pool_creation",
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
    boundaryPolicy,
    Object.fromEntries(required.map((key) => [key, true])),
    context
  );
  for (const key of required) {
    if (boundaryPolicy[key] !== true) {
      throw new ContractError(`${context}: boundary policy ${key} must be true`);
    }
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

function assertNoUnsafeText(value, context) {
  const serialized = JSON.stringify(value);
  if (UNSAFE_PUBLIC_TEXT_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: unsafe public text detected`);
  }
}
