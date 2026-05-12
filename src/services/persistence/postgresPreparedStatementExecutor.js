import { ContractError } from "../../core/contracts.js";

const STATUS_SCHEMA = "iris_postgres_prepared_statement_executor_status_v1";

const STATEMENTS = {
  upsert_approved_memory_by_event: {
    name: "iris_upsert_approved_memory_by_event_v1",
    text: `
      insert into approved_memory_summaries (
        event_id,
        trace_id,
        memory_type,
        owner_scope,
        linked_identity_id,
        source_phase,
        source_candidate_kind,
        committed_at_ms,
        summary_private
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      on conflict (event_id) do nothing
    `,
    valueCount: 9,
    tableName: "approved_memory_summaries",
  },
  upsert_relationship_aggregate_by_viewer: {
    name: "iris_upsert_relationship_aggregate_by_viewer_v1",
    text: `
      insert into relationship_aggregates (
        linked_identity_id,
        affinity_delta,
        familiarity_delta,
        topic_key,
        source_phase,
        source_candidate_kind,
        committed_at_ms,
        summary_private
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      on conflict (linked_identity_id) do update set
        affinity_delta = relationship_aggregates.affinity_delta + excluded.affinity_delta,
        familiarity_delta = relationship_aggregates.familiarity_delta + excluded.familiarity_delta,
        committed_at_ms = greatest(relationship_aggregates.committed_at_ms, excluded.committed_at_ms)
    `,
    valueCount: 8,
    tableName: "relationship_aggregates",
  },
  append_relationship_event_ledger: {
    name: "iris_append_relationship_event_ledger_v1",
    text: `
      insert into relationship_event_ledger (
        event_id,
        trace_id,
        linked_identity_id,
        topic_key,
        source_phase,
        source_candidate_kind,
        committed_at_ms,
        summary_private
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      on conflict (event_id) do nothing
    `,
    valueCount: 8,
    tableName: "relationship_event_ledger",
  },
  upsert_operator_policy_record_by_setting: {
    name: "iris_upsert_operator_policy_record_by_setting_v1",
    text: `
      insert into operator_policy_records (
        setting_id,
        setting_group,
        policy_version,
        policy_digest,
        committed_at_ms,
        policy_config_private
      ) values ($1,$2,$3,$4,$5,$6)
      on conflict (setting_id) do update set
        setting_group = excluded.setting_group,
        policy_version = excluded.policy_version,
        policy_digest = excluded.policy_digest,
        committed_at_ms = excluded.committed_at_ms,
        policy_config_private = excluded.policy_config_private
    `,
    valueCount: 6,
    tableName: "operator_policy_records",
  },
  append_operator_policy_version: {
    name: "iris_append_operator_policy_version_v1",
    text: `
      insert into operator_policy_versions (
        event_id,
        setting_id,
        setting_group,
        policy_version,
        policy_digest,
        decision,
        actor_role,
        owner_confirmed,
        event_at_ms
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      on conflict (event_id) do nothing
    `,
    valueCount: 9,
    tableName: "operator_policy_versions",
  },
};

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
  "approved_operator_policy_record",
  "operator_policy_audit_entry",
  "summary",
  "text",
  "message_text",
  "display_name",
  "payload",
  "policy_config",
  "policy_payload",
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
const PREPARED_STATEMENT_EXECUTOR_STATUS_FIELDS = new Set([
  "schema",
  "executor_kind",
  "executor_status",
  "real_database_pool_injected",
  "db_connection_attempted_by_status",
  "prepared_statement_count",
  "attempted_statement_count",
  "successful_statement_count",
  "failed_statement_count",
  "statement_count_by_id",
  "table_operation_counts",
  "latest_statement_at_ms",
  "boundary_policy",
]);

export function createPostgresPreparedStatementExecutor({ pool, generatedAtMs = Date.now } = {}) {
  if (!pool || typeof pool.query !== "function") {
    throw new ContractError("postgres prepared executor: pool.query is required");
  }

  const state = {
    attemptedStatementCount: 0,
    successfulStatementCount: 0,
    failedStatementCount: 0,
    statementCountById: {},
    tableOperationCounts: {
      approved_memory_summaries: 0,
      relationship_aggregates: 0,
      relationship_event_ledger: 0,
      operator_policy_records: 0,
      operator_policy_versions: 0,
    },
    latestStatementAtMs: null,
  };

  return {
    async runPreparedStatement({ statementId, values }) {
      const statement = STATEMENTS[statementId];
      if (!statement) {
        throw new ContractError("postgres prepared executor: unsupported statement id");
      }
      if (!Array.isArray(values) || values.length !== statement.valueCount) {
        throw new ContractError("postgres prepared executor: invalid private value count");
      }
      state.attemptedStatementCount += 1;
      state.latestStatementAtMs = generatedAtMs();
      try {
        const result = await pool.query({
          name: statement.name,
          text: statement.text,
          values,
        });
        state.successfulStatementCount += 1;
        state.statementCountById[statementId] =
          (state.statementCountById[statementId] ?? 0) + 1;
        state.tableOperationCounts[statement.tableName] += 1;
        return {
          rowCount: Number.isFinite(Number(result?.rowCount))
            ? Number(result.rowCount)
            : 0,
        };
      } catch (error) {
        state.failedStatementCount += 1;
        throw error;
      }
    },
    status() {
      const status = {
        schema: STATUS_SCHEMA,
        executor_kind: "postgres_prepared_statement_executor",
        executor_status: "configured",
        real_database_pool_injected: true,
        db_connection_attempted_by_status: false,
        prepared_statement_count: Object.keys(STATEMENTS).length,
        attempted_statement_count: state.attemptedStatementCount,
        successful_statement_count: state.successfulStatementCount,
        failed_statement_count: state.failedStatementCount,
        statement_count_by_id: { ...state.statementCountById },
        table_operation_counts: { ...state.tableOperationCounts },
        latest_statement_at_ms: state.latestStatementAtMs,
        boundary_policy: createBoundaryPolicy(),
      };
      assertPostgresPreparedStatementExecutorStatusSafe(status);
      return status;
    },
  };
}

export function assertPostgresPreparedStatementExecutorStatusSafe(
  status,
  context = "postgres prepared statement executor status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  if (status.schema !== STATUS_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!PREPARED_STATEMENT_EXECUTOR_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected executor status field ${field}`);
    }
  }
  if (
    status.executor_kind !== "postgres_prepared_statement_executor" ||
    status.executor_status !== "configured"
  ) {
    throw new ContractError(`${context}: invalid executor status`);
  }
  if (status.db_connection_attempted_by_status !== false) {
    throw new ContractError(`${context}: status must not attempt DB connections`);
  }
  assertPublicSafeObject(status, context);
  assertNoUnsafeText(status, context);
  const requiredBoundaryPolicy = [
    "private_pool_only",
    "prepared_statements_only",
    "no_public_parameter_values",
    "no_sql_statements_in_status",
    "no_connection_values",
    "no_endpoint_values",
    "no_record_payloads",
    "no_candidate_payloads",
    "no_commands",
  ];
  assertExactBoundaryPolicy(
    status.boundary_policy,
    Object.fromEntries(requiredBoundaryPolicy.map((key) => [key, true])),
    context
  );
  for (const key of requiredBoundaryPolicy) {
    if (status.boundary_policy[key] !== true) {
      throw new ContractError(`${context}: boundary policy ${key} must be true`);
    }
  }
}

function createBoundaryPolicy() {
  return {
    private_pool_only: true,
    prepared_statements_only: true,
    no_public_parameter_values: true,
    no_sql_statements_in_status: true,
    no_connection_values: true,
    no_endpoint_values: true,
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
