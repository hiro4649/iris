import { ContractError } from "../../core/contracts.js";
import {
  assertPostgresMemoryWritePlanSafe,
  assertPostgresOperatorPolicyWritePlanSafe,
  assertPostgresRelationshipWritePlanSafe,
  createPostgresMemoryWritePlan,
  createPostgresOperatorPolicyWritePlan,
  createPostgresRelationshipWritePlan,
} from "./postgresPersistenceAdapterContract.js";

const RESULT_SCHEMA = "iris_mock_postgres_persistence_result_v1";
const STATUS_SCHEMA = "iris_mock_postgres_persistence_status_v1";

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
  "params",
  "parameters",
  "sql",
  "raw_sql",
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
]);

const UNSAFE_PUBLIC_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|postgres:\/\/|select |insert |update |delete )\b|https?:\/\//i;
const MOCK_POSTGRES_PERSISTENCE_RESULT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "operation_result_status",
  "record_kind",
  "target_table_names",
  "target_table_count",
  "operation_ids",
  "operation_count",
  "duplicate_ignored",
  "private_parameter_count",
  "real_database_connected",
  "db_connection_attempted",
  "boundary_policy",
]);
const MOCK_POSTGRES_PERSISTENCE_STATUS_FIELDS = new Set([
  "schema",
  "adapter_kind",
  "adapter_status",
  "real_database_connected",
  "db_connection_attempted",
  "operation_count_by_kind",
  "duplicate_count_by_kind",
  "table_operation_counts",
  "latest_operation_at_ms",
  "boundary_policy",
]);
const MOCK_POSTGRES_RUNTIME_STORE_STATUS_FIELDS = new Set([
  "schema",
  "health",
  "store_available",
  "read_error",
  "error_kind",
  "record_count",
  "profile_count",
  "adapter_status",
  "real_database_connected",
  "db_connection_attempted",
  "internal_relationship_stage_policy",
  "public_relationship_level_policy",
  "table_operation_counts",
  "duplicate_count",
  "boundary_policy",
]);

export function createMockPostgresPersistenceAdapter({ generatedAtMs = Date.now } = {}) {
  const state = {
    memoryKeys: new Set(),
    relationshipKeys: new Set(),
    operatorPolicyKeys: new Set(),
    operationCountByKind: {
      approved_memory: 0,
      approved_relationship: 0,
      approved_operator_policy: 0,
    },
    duplicateCountByKind: {
      approved_memory: 0,
      approved_relationship: 0,
      approved_operator_policy: 0,
    },
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
    persistApprovedMemory(approvedRecord) {
      const plan = createPostgresMemoryWritePlan(approvedRecord, {
        generatedAtMs: generatedAtMs(),
      });
      assertPostgresMemoryWritePlanSafe(plan, "mock PostgreSQL memory adapter input plan");
      const stableKey = approvedRecord.event_id;
      const duplicate = state.memoryKeys.has(stableKey);
      if (!duplicate) {
        state.memoryKeys.add(stableKey);
        state.operationCountByKind.approved_memory += 1;
        state.tableOperationCounts.approved_memory_summaries += 1;
      } else {
        state.duplicateCountByKind.approved_memory += 1;
      }
      state.latestOperationAtMs = generatedAtMs();
      return createResult({
        generatedAtMs: state.latestOperationAtMs,
        recordKind: "approved_memory",
        targetTableNames: [plan.target_table_name],
        operationIds: [plan.operation_id],
        duplicate,
        privateParameterCount: plan.private_parameter_count,
      });
    },
    persistApprovedRelationship(approvedRecord) {
      const plan = createPostgresRelationshipWritePlan(approvedRecord, {
        generatedAtMs: generatedAtMs(),
      });
      assertPostgresRelationshipWritePlanSafe(
        plan,
        "mock PostgreSQL relationship adapter input plan"
      );
      const stableKey = [
        approvedRecord.event_id,
        approvedRecord.linked_identity_id,
        approvedRecord.source_phase ?? "phase05",
        approvedRecord.source_candidate_kind ?? "relationship_memory",
      ].join(":");
      const duplicate = state.relationshipKeys.has(stableKey);
      if (!duplicate) {
        state.relationshipKeys.add(stableKey);
        state.operationCountByKind.approved_relationship += 1;
        for (const tableName of plan.target_table_names) {
          state.tableOperationCounts[tableName] += 1;
        }
      } else {
        state.duplicateCountByKind.approved_relationship += 1;
      }
      state.latestOperationAtMs = generatedAtMs();
      return createResult({
        generatedAtMs: state.latestOperationAtMs,
        recordKind: "approved_relationship",
        targetTableNames: plan.target_table_names,
        operationIds: plan.operation_ids,
        duplicate,
        privateParameterCount: plan.private_parameter_count,
      });
    },
    persistApprovedOperatorPolicy(approvedRecord, auditEntry) {
      const plan = createPostgresOperatorPolicyWritePlan(approvedRecord, auditEntry, {
        generatedAtMs: generatedAtMs(),
      });
      assertPostgresOperatorPolicyWritePlanSafe(
        plan,
        "mock PostgreSQL operator policy adapter input plan"
      );
      const stableKey = [
        approvedRecord.setting_id,
        approvedRecord.policy_version,
        auditEntry.event_id,
      ].join(":");
      const duplicate = state.operatorPolicyKeys.has(stableKey);
      if (!duplicate) {
        state.operatorPolicyKeys.add(stableKey);
        state.operationCountByKind.approved_operator_policy += 1;
        for (const tableName of plan.target_table_names) {
          state.tableOperationCounts[tableName] += 1;
        }
      } else {
        state.duplicateCountByKind.approved_operator_policy += 1;
      }
      state.latestOperationAtMs = generatedAtMs();
      return createResult({
        generatedAtMs: state.latestOperationAtMs,
        recordKind: "approved_operator_policy",
        targetTableNames: plan.target_table_names,
        operationIds: plan.operation_ids,
        duplicate,
        privateParameterCount: plan.private_parameter_count,
      });
    },
    status() {
      const status = {
        schema: STATUS_SCHEMA,
        adapter_kind: "mock_postgres_persistence",
        adapter_status: "ready",
        real_database_connected: false,
        db_connection_attempted: false,
        operation_count_by_kind: { ...state.operationCountByKind },
        duplicate_count_by_kind: { ...state.duplicateCountByKind },
        table_operation_counts: { ...state.tableOperationCounts },
        latest_operation_at_ms: state.latestOperationAtMs,
        boundary_policy: createBoundaryPolicy(),
      };
      assertMockPostgresPersistenceStatusSafe(status);
      return status;
    },
  };
}

export function createMockPostgresPersistenceStores({
  generatedAtMs = Date.now,
  recentSummaryLimit = 5,
} = {}) {
  const adapter = createMockPostgresPersistenceAdapter({ generatedAtMs });
  const memoryRecords = [];
  const relationshipProfiles = new Map();
  const relationshipRecordKeys = new Set();
  const safeRecentSummaryLimit = clampInteger(recentSummaryLimit, 1, 50, 5);

  const memoryStore = {
    list() {
      return [...memoryRecords];
    },
    append(record) {
      const result = adapter.persistApprovedMemory(record);
      if (result.duplicate_ignored !== true) {
        memoryRecords.push(record);
      }
      return record;
    },
    recentSummary(limit = 3) {
      return memoryRecords
        .slice(-clampInteger(limit, 1, 20, 3))
        .map((record) => record.summary)
        .filter(Boolean)
        .join(" / ");
    },
    status() {
      const adapterStatus = adapter.status();
      const status = {
        schema: "iris_mock_postgres_memory_store_status_v1",
        health: "ready",
        store_available: true,
        read_error: false,
        error_kind: null,
        record_count: memoryRecords.length,
        adapter_status: adapterStatus.adapter_status,
        real_database_connected: false,
        db_connection_attempted: false,
        table_operation_counts: {
          approved_memory_summaries:
            adapterStatus.table_operation_counts.approved_memory_summaries,
        },
        duplicate_count:
          adapterStatus.duplicate_count_by_kind.approved_memory,
        boundary_policy: createStoreBoundaryPolicy(),
      };
      assertMockPostgresRuntimeStoreStatusSafe(status, "mock PostgreSQL memory store");
      return status;
    },
  };

  const relationshipStore = {
    getProfile(linkedIdentityId) {
      return relationshipProfiles.get(linkedIdentityId) ?? null;
    },
    listProfiles() {
      return [...relationshipProfiles.values()];
    },
    summarize(linkedIdentityId) {
      const profile = relationshipProfiles.get(linkedIdentityId);
      if (!profile) return null;
      if (profile.interaction_count >= 4) return "familiar viewer";
      if (profile.interaction_count >= 2) return "returning viewer";
      return "newly recognized viewer";
    },
    upsertApproved(record) {
      const result = adapter.persistApprovedRelationship(record);
      const recordKey = relationshipRecordKey(record);
      const existing = relationshipProfiles.get(record.linked_identity_id) ?? {
        linked_identity_id: record.linked_identity_id,
        display_name: record.display_name,
        affinity_score: 0,
        familiarity_score: 0,
        interaction_count: 0,
        last_interaction_at_ms: null,
        recent_summaries: [],
        committed_record_keys: [],
      };
      if (relationshipRecordKeys.has(recordKey) || result.duplicate_ignored === true) {
        return {
          ...existing,
          duplicate_record_ignored: true,
        };
      }
      relationshipRecordKeys.add(recordKey);
      const updated = {
        ...existing,
        display_name: record.display_name ?? existing.display_name,
        affinity_score: clamp01(existing.affinity_score + Number(record.affinity_delta ?? 0)),
        familiarity_score: clamp01(
          existing.familiarity_score + Number(record.familiarity_delta ?? 0)
        ),
        interaction_count: existing.interaction_count + 1,
        last_interaction_at_ms: record.committed_at_ms ?? generatedAtMs(),
        recent_summaries: [...existing.recent_summaries, record.summary]
          .filter(Boolean)
          .slice(-safeRecentSummaryLimit),
        committed_record_keys: [...existing.committed_record_keys, recordKey].slice(-100),
      };
      relationshipProfiles.set(record.linked_identity_id, updated);
      return updated;
    },
    status() {
      const adapterStatus = adapter.status();
      const status = {
        schema: "iris_mock_postgres_relationship_store_status_v1",
        health: "ready",
        store_available: true,
        read_error: false,
        error_kind: null,
        profile_count: relationshipProfiles.size,
        adapter_status: adapterStatus.adapter_status,
        real_database_connected: false,
        db_connection_attempted: false,
        internal_relationship_stage_policy: "0_to_99",
        public_relationship_level_policy: "8_plus_bounded",
        table_operation_counts: {
          relationship_aggregates:
            adapterStatus.table_operation_counts.relationship_aggregates,
          relationship_event_ledger:
            adapterStatus.table_operation_counts.relationship_event_ledger,
        },
        duplicate_count:
          adapterStatus.duplicate_count_by_kind.approved_relationship,
        boundary_policy: createStoreBoundaryPolicy(),
      };
      assertMockPostgresRuntimeStoreStatusSafe(
        status,
        "mock PostgreSQL relationship store"
      );
      return status;
    },
  };

  return {
    schema: "iris_mock_postgres_persistence_stores_v1",
    persistence_backend: "postgresql",
    postgres_adapter_mode: "mock",
    real_database_connected: false,
    db_connection_attempted: false,
    memoryStore,
    relationshipStore,
    adapter,
  };
}

export function assertMockPostgresPersistenceResultSafe(
  result,
  context = "mock PostgreSQL persistence result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result must be an object`);
  }
  if (result.schema !== RESULT_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(result)) {
    if (!MOCK_POSTGRES_PERSISTENCE_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected mock adapter result field ${field}`);
    }
  }
  if (
    result.operation_result_status !== "persisted_in_mock" &&
    result.operation_result_status !== "duplicate_ignored"
  ) {
    throw new ContractError(`${context}: invalid operation result status`);
  }
  assertPublicSafeObject(result, context);
  assertNoUnsafeText(result, context);
  assertRequiredBoundary(result.boundary_policy, context);
}

export function assertMockPostgresPersistenceStatusSafe(
  status,
  context = "mock PostgreSQL persistence status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  if (status.schema !== STATUS_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!MOCK_POSTGRES_PERSISTENCE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected mock adapter status field ${field}`);
    }
  }
  if (
    status.adapter_kind !== "mock_postgres_persistence" ||
    status.adapter_status !== "ready"
  ) {
    throw new ContractError(`${context}: invalid adapter status`);
  }
  if (status.real_database_connected !== false || status.db_connection_attempted !== false) {
    throw new ContractError(`${context}: must not report a real database connection`);
  }
  assertPublicSafeObject(status, context);
  assertNoUnsafeText(status, context);
  assertRequiredBoundary(status.boundary_policy, context);
}

export function assertMockPostgresRuntimeStoreStatusSafe(
  status,
  context = "mock PostgreSQL runtime store status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  if (
    status.schema !== "iris_mock_postgres_memory_store_status_v1" &&
    status.schema !== "iris_mock_postgres_relationship_store_status_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!MOCK_POSTGRES_RUNTIME_STORE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected mock runtime store status field ${field}`);
    }
  }
  if (status.real_database_connected !== false || status.db_connection_attempted !== false) {
    throw new ContractError(`${context}: must not report a real database connection`);
  }
  assertPublicSafeObject(status, context);
  assertNoUnsafeText(status, context);
  const required = [
    "mock_adapter_only",
    "private_adapter_contract_required",
    "no_real_database_connection",
    "no_db_connection_attempted",
    "counts_only",
    "no_record_payloads",
    "no_profile_payloads",
    "no_public_parameter_values",
    "no_raw_summary_in_public_report",
    "no_viewer_text_in_public_report",
    "no_candidate_payloads",
    "no_direct_candidate_commit",
    "no_connection_values",
    "no_endpoint_values",
    "no_sql_statements",
    "no_commands",
  ];
  assertExactBoundaryPolicy(status.boundary_policy, Object.fromEntries(required.map((key) => [key, true])), context);
  for (const key of required) {
    if (status.boundary_policy[key] !== true) {
      throw new ContractError(`${context}: boundary policy ${key} must be true`);
    }
  }
}

function createResult({
  generatedAtMs,
  recordKind,
  targetTableNames,
  operationIds,
  duplicate,
  privateParameterCount,
}) {
  const result = {
    schema: RESULT_SCHEMA,
    generated_at_ms: generatedAtMs,
    operation_result_status: duplicate ? "duplicate_ignored" : "persisted_in_mock",
    record_kind: recordKind,
    target_table_names: [...targetTableNames],
    target_table_count: targetTableNames.length,
    operation_ids: [...operationIds],
    operation_count: operationIds.length,
    duplicate_ignored: duplicate,
    private_parameter_count: privateParameterCount,
    real_database_connected: false,
    db_connection_attempted: false,
    boundary_policy: createBoundaryPolicy(),
  };
  assertMockPostgresPersistenceResultSafe(result);
  return result;
}

function createBoundaryPolicy() {
  return {
    mock_adapter_only: true,
    private_adapter_contract_required: true,
    no_real_database_connection: true,
    no_db_connection_attempted: true,
    no_public_parameter_values: true,
    no_raw_summary_in_public_report: true,
    no_viewer_text_in_public_report: true,
    no_candidate_payloads: true,
    no_direct_candidate_commit: true,
    no_connection_values: true,
    no_endpoint_values: true,
    no_sql_statements: true,
    no_commands: true,
  };
}

function createStoreBoundaryPolicy() {
  return {
    ...createBoundaryPolicy(),
    counts_only: true,
    no_record_payloads: true,
    no_profile_payloads: true,
  };
}

function relationshipRecordKey(record) {
  return [
    record.event_id ?? "event_missing",
    record.linked_identity_id ?? "identity_missing",
    record.source_phase ?? "phase05",
    record.source_candidate_kind ?? record.topic_key ?? "relationship",
  ].join(":");
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function assertRequiredBoundary(boundaryPolicy, context) {
  const required = [
    "mock_adapter_only",
    "private_adapter_contract_required",
    "no_real_database_connection",
    "no_db_connection_attempted",
    "no_public_parameter_values",
    "no_raw_summary_in_public_report",
    "no_viewer_text_in_public_report",
    "no_candidate_payloads",
    "no_direct_candidate_commit",
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
