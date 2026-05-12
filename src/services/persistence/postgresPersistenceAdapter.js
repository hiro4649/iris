import { ContractError } from "../../core/contracts.js";
import {
  assertPostgresMemoryWritePlanSafe,
  assertPostgresOperatorPolicyWritePlanSafe,
  assertPostgresRelationshipWritePlanSafe,
  createPostgresMemoryWritePlan,
  createPostgresOperatorPolicyWritePlan,
  createPostgresRelationshipWritePlan,
} from "./postgresPersistenceAdapterContract.js";
import {
  assertPostgresPersistenceFailureResultSafe,
  createPostgresPersistenceFailureResult,
} from "./postgresPersistenceErrors.js";

const RESULT_SCHEMA = "iris_postgres_persistence_result_v1";
const STATUS_SCHEMA = "iris_postgres_persistence_adapter_status_v1";

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
const POSTGRES_PERSISTENCE_ADAPTER_RESULT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "operation_result_status",
  "record_kind",
  "target_table_names",
  "target_table_count",
  "operation_ids",
  "operation_count",
  "private_parameter_count",
  "real_database_connected",
  "db_connection_attempted",
  "boundary_policy",
]);
const POSTGRES_PERSISTENCE_ADAPTER_STATUS_FIELDS = new Set([
  "schema",
  "adapter_kind",
  "adapter_status",
  "real_database_connected",
  "db_connection_attempted",
  "attempted_operation_count",
  "successful_operation_count",
  "failed_operation_count",
  "operation_count_by_kind",
  "failure_count_by_kind",
  "table_operation_counts",
  "latest_operation_at_ms",
  "boundary_policy",
]);

const STATEMENT_IDS = {
  memory: "upsert_approved_memory_by_event",
  relationshipAggregate: "upsert_relationship_aggregate_by_viewer",
  relationshipEvent: "append_relationship_event_ledger",
  operatorPolicyRecord: "upsert_operator_policy_record_by_setting",
  operatorPolicyVersion: "append_operator_policy_version",
};

export function createPostgresPersistenceAdapter({
  statementExecutor,
  generatedAtMs = Date.now,
} = {}) {
  if (!statementExecutor || typeof statementExecutor.runPreparedStatement !== "function") {
    throw new ContractError(
      "postgres persistence adapter: statementExecutor.runPreparedStatement is required"
    );
  }

  const state = {
    attemptedOperationCount: 0,
    successfulOperationCount: 0,
    failedOperationCount: 0,
    operationCountByKind: {
      approved_memory: 0,
      approved_relationship: 0,
      approved_operator_policy: 0,
    },
    failureCountByKind: {},
    tableOperationCounts: {
      approved_memory_summaries: 0,
      relationship_aggregates: 0,
      relationship_event_ledger: 0,
      operator_policy_records: 0,
      operator_policy_versions: 0,
    },
    latestOperationAtMs: null,
  };

  return {
    async persistApprovedMemory(approvedRecord) {
      const operationKind = "persist_approved_memory";
      const plan = createPostgresMemoryWritePlan(approvedRecord, {
        generatedAtMs: generatedAtMs(),
      });
      assertPostgresMemoryWritePlanSafe(plan, "real PostgreSQL memory adapter plan");
      return runSafely({
        state,
        generatedAtMs,
        operationKind,
        recordKind: "approved_memory",
        targetTableNames: [plan.target_table_name],
        operationIds: [plan.operation_id],
        privateParameterCount: plan.private_parameter_count,
        run: async () => {
          await statementExecutor.runPreparedStatement({
            statementId: STATEMENT_IDS.memory,
            values: createMemoryStatementValues(approvedRecord),
          });
        },
      });
    },
    async persistApprovedRelationship(approvedRecord) {
      const operationKind = "persist_approved_relationship";
      const plan = createPostgresRelationshipWritePlan(approvedRecord, {
        generatedAtMs: generatedAtMs(),
      });
      assertPostgresRelationshipWritePlanSafe(
        plan,
        "real PostgreSQL relationship adapter plan"
      );
      return runSafely({
        state,
        generatedAtMs,
        operationKind,
        recordKind: "approved_relationship",
        targetTableNames: plan.target_table_names,
        operationIds: plan.operation_ids,
        privateParameterCount: plan.private_parameter_count,
        run: async () => {
          await statementExecutor.runPreparedStatement({
            statementId: STATEMENT_IDS.relationshipAggregate,
            values: createRelationshipAggregateStatementValues(approvedRecord),
          });
          await statementExecutor.runPreparedStatement({
            statementId: STATEMENT_IDS.relationshipEvent,
            values: createRelationshipEventStatementValues(approvedRecord),
          });
        },
      });
    },
    async persistApprovedOperatorPolicy(approvedRecord, auditEntry) {
      const operationKind = "persist_approved_operator_policy";
      const plan = createPostgresOperatorPolicyWritePlan(approvedRecord, auditEntry, {
        generatedAtMs: generatedAtMs(),
      });
      assertPostgresOperatorPolicyWritePlanSafe(
        plan,
        "real PostgreSQL operator policy adapter plan"
      );
      return runSafely({
        state,
        generatedAtMs,
        operationKind,
        recordKind: "approved_operator_policy",
        targetTableNames: plan.target_table_names,
        operationIds: plan.operation_ids,
        privateParameterCount: plan.private_parameter_count,
        run: async () => {
          await statementExecutor.runPreparedStatement({
            statementId: STATEMENT_IDS.operatorPolicyRecord,
            values: createOperatorPolicyRecordStatementValues(approvedRecord),
          });
          await statementExecutor.runPreparedStatement({
            statementId: STATEMENT_IDS.operatorPolicyVersion,
            values: createOperatorPolicyVersionStatementValues(
              approvedRecord,
              auditEntry
            ),
          });
        },
      });
    },
    status() {
      const status = {
        schema: STATUS_SCHEMA,
        adapter_kind: "postgres_persistence",
        adapter_status: "configured",
        real_database_connected: true,
        db_connection_attempted: true,
        attempted_operation_count: state.attemptedOperationCount,
        successful_operation_count: state.successfulOperationCount,
        failed_operation_count: state.failedOperationCount,
        operation_count_by_kind: { ...state.operationCountByKind },
        failure_count_by_kind: { ...state.failureCountByKind },
        table_operation_counts: { ...state.tableOperationCounts },
        latest_operation_at_ms: state.latestOperationAtMs,
        boundary_policy: createBoundaryPolicy(),
      };
      assertPostgresPersistenceAdapterStatusSafe(status);
      return status;
    },
  };
}

export function assertPostgresPersistenceAdapterResultSafe(
  result,
  context = "postgres persistence adapter result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result must be an object`);
  }
  if (result.schema !== RESULT_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(result)) {
    if (!POSTGRES_PERSISTENCE_ADAPTER_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected adapter result field ${field}`);
    }
  }
  if (result.operation_result_status !== "persisted_in_postgres") {
    throw new ContractError(`${context}: invalid operation result status`);
  }
  assertPublicSafeObject(result, context);
  assertNoUnsafeText(result, context);
  assertRequiredBoundary(result.boundary_policy, context);
}

export function assertPostgresPersistenceAdapterStatusSafe(
  status,
  context = "postgres persistence adapter status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  if (status.schema !== STATUS_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!POSTGRES_PERSISTENCE_ADAPTER_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected adapter status field ${field}`);
    }
  }
  if (
    status.adapter_kind !== "postgres_persistence" ||
    status.adapter_status !== "configured"
  ) {
    throw new ContractError(`${context}: invalid adapter status`);
  }
  assertPublicSafeObject(status, context);
  assertNoUnsafeText(status, context);
  assertRequiredBoundary(status.boundary_policy, context);
}

async function runSafely({
  state,
  generatedAtMs,
  operationKind,
  recordKind,
  targetTableNames,
  operationIds,
  privateParameterCount,
  run,
}) {
  state.attemptedOperationCount += 1;
  state.latestOperationAtMs = generatedAtMs();
  try {
    await run();
    state.successfulOperationCount += 1;
    state.operationCountByKind[recordKind] += 1;
    for (const tableName of targetTableNames) {
      state.tableOperationCounts[tableName] += 1;
    }
    return createSuccessResult({
      generatedAtMs: state.latestOperationAtMs,
      recordKind,
      targetTableNames,
      operationIds,
      privateParameterCount,
    });
  } catch (error) {
    state.failedOperationCount += 1;
    const failure = createPostgresPersistenceFailureResult({
      error,
      operationKind,
      generatedAtMs: state.latestOperationAtMs,
    });
    state.failureCountByKind[failure.error_kind] =
      (state.failureCountByKind[failure.error_kind] ?? 0) + 1;
    assertPostgresPersistenceFailureResultSafe(failure);
    return failure;
  }
}

function createSuccessResult({
  generatedAtMs,
  recordKind,
  targetTableNames,
  operationIds,
  privateParameterCount,
}) {
  const result = {
    schema: RESULT_SCHEMA,
    generated_at_ms: generatedAtMs,
    operation_result_status: "persisted_in_postgres",
    record_kind: recordKind,
    target_table_names: [...targetTableNames],
    target_table_count: targetTableNames.length,
    operation_ids: [...operationIds],
    operation_count: operationIds.length,
    private_parameter_count: privateParameterCount,
    real_database_connected: true,
    db_connection_attempted: true,
    boundary_policy: createBoundaryPolicy(),
  };
  assertPostgresPersistenceAdapterResultSafe(result);
  return result;
}

function createMemoryStatementValues(record) {
  return [
    record.event_id,
    record.trace_id,
    record.memory_type,
    record.owner_scope,
    record.linked_identity_id,
    record.source_phase,
    record.source_candidate_kind,
    record.committed_at_ms,
    record.summary,
  ];
}

function createRelationshipAggregateStatementValues(record) {
  return [
    record.linked_identity_id,
    record.affinity_delta,
    record.familiarity_delta,
    record.topic_key,
    record.source_phase,
    record.source_candidate_kind,
    record.committed_at_ms,
    record.summary,
  ];
}

function createRelationshipEventStatementValues(record) {
  return [
    record.event_id,
    record.trace_id,
    record.linked_identity_id,
    record.topic_key,
    record.source_phase,
    record.source_candidate_kind,
    record.committed_at_ms,
    record.summary,
  ];
}

function createOperatorPolicyRecordStatementValues(record) {
  return [
    record.setting_id,
    record.setting_group,
    record.policy_version,
    record.policy_digest,
    record.committed_at_ms,
    record.policy_config,
  ];
}

function createOperatorPolicyVersionStatementValues(record, auditEntry) {
  return [
    auditEntry.event_id,
    record.setting_id,
    record.setting_group,
    record.policy_version,
    record.policy_digest,
    auditEntry.decision,
    auditEntry.actor_role,
    auditEntry.owner_confirmed,
    auditEntry.event_at_ms,
  ];
}

function createBoundaryPolicy() {
  return {
    private_adapter_contract_required: true,
    prepared_statements_only: true,
    no_public_parameter_values: true,
    no_raw_summary_in_public_report: true,
    no_viewer_text_in_public_report: true,
    no_candidate_payloads: true,
    no_direct_candidate_commit: true,
    no_policy_payloads_in_public_report: true,
    no_policy_numeric_values_in_public_report: true,
    no_audit_payloads_in_public_report: true,
    no_connection_values: true,
    no_endpoint_values: true,
    no_sql_statements: true,
    no_commands: true,
  };
}

function assertRequiredBoundary(boundaryPolicy, context) {
  const required = [
    "private_adapter_contract_required",
    "prepared_statements_only",
    "no_public_parameter_values",
    "no_raw_summary_in_public_report",
    "no_viewer_text_in_public_report",
    "no_candidate_payloads",
    "no_direct_candidate_commit",
    "no_policy_payloads_in_public_report",
    "no_policy_numeric_values_in_public_report",
    "no_audit_payloads_in_public_report",
    "no_connection_values",
    "no_endpoint_values",
    "no_sql_statements",
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
