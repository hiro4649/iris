import { ContractError } from "../../core/contracts.js";
import { assertPostgresPersistenceAdapterStatusSafe } from "./postgresPersistenceAdapter.js";

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
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
]);

const UNSAFE_PUBLIC_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|postgres:\/\/|select |insert |update |delete )\b|https?:\/\//i;
const POSTGRES_RUNTIME_STORE_STATUS_FIELDS = new Set([
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
  "latest_write_at_ms",
  "boundary_policy",
]);

export function createPostgresPersistenceStores({
  adapter,
  generatedAtMs = Date.now,
} = {}) {
  if (
    !adapter ||
    typeof adapter.persistApprovedMemory !== "function" ||
    typeof adapter.persistApprovedRelationship !== "function" ||
    typeof adapter.status !== "function"
  ) {
    throw new ContractError("postgres persistence stores: adapter is required");
  }
  const memoryRecordCount = { value: 0 };
  const relationshipProfileIds = new Set();
  const latestWriteAtMs = { value: null };

  const memoryStore = {
    async append(record) {
      const result = await adapter.persistApprovedMemory(record);
      if (result.operation_result_status !== "persisted_in_postgres") {
        throw new ContractError("postgres memory store: adapter did not persist record");
      }
      memoryRecordCount.value += 1;
      latestWriteAtMs.value = generatedAtMs();
      return record;
    },
    list() {
      return [];
    },
    recentSummary() {
      return "";
    },
    status() {
      const adapterStatus = adapter.status();
      assertPostgresPersistenceAdapterStatusSafe(
        adapterStatus,
        "postgres memory store adapter status"
      );
      const status = {
        schema: "iris_postgres_memory_store_status_v1",
        health: adapterStatus.failed_operation_count > 0 ? "attention" : "ready",
        store_available: true,
        read_error: false,
        error_kind: null,
        record_count: memoryRecordCount.value,
        adapter_status: adapterStatus.adapter_status,
        real_database_connected: adapterStatus.real_database_connected,
        db_connection_attempted: adapterStatus.db_connection_attempted,
        table_operation_counts: {
          approved_memory_summaries:
            adapterStatus.table_operation_counts.approved_memory_summaries,
        },
        latest_write_at_ms: latestWriteAtMs.value,
        boundary_policy: createStoreBoundaryPolicy(),
      };
      assertPostgresRuntimeStoreStatusSafe(status, "postgres memory store");
      return status;
    },
  };

  const relationshipStore = {
    async upsertApproved(record) {
      const result = await adapter.persistApprovedRelationship(record);
      if (result.operation_result_status !== "persisted_in_postgres") {
        throw new ContractError("postgres relationship store: adapter did not persist record");
      }
      relationshipProfileIds.add(record.linked_identity_id);
      latestWriteAtMs.value = generatedAtMs();
      return {
        linked_identity_id: record.linked_identity_id,
        duplicate_record_ignored: false,
      };
    },
    getProfile() {
      return null;
    },
    listProfiles() {
      return [];
    },
    summarize() {
      return null;
    },
    status() {
      const adapterStatus = adapter.status();
      assertPostgresPersistenceAdapterStatusSafe(
        adapterStatus,
        "postgres relationship store adapter status"
      );
      const status = {
        schema: "iris_postgres_relationship_store_status_v1",
        health: adapterStatus.failed_operation_count > 0 ? "attention" : "ready",
        store_available: true,
        read_error: false,
        error_kind: null,
        profile_count: relationshipProfileIds.size,
        adapter_status: adapterStatus.adapter_status,
        real_database_connected: adapterStatus.real_database_connected,
        db_connection_attempted: adapterStatus.db_connection_attempted,
        internal_relationship_stage_policy: "0_to_99",
        public_relationship_level_policy: "8_plus_bounded",
        table_operation_counts: {
          relationship_aggregates:
            adapterStatus.table_operation_counts.relationship_aggregates,
          relationship_event_ledger:
            adapterStatus.table_operation_counts.relationship_event_ledger,
        },
        latest_write_at_ms: latestWriteAtMs.value,
        boundary_policy: createStoreBoundaryPolicy(),
      };
      assertPostgresRuntimeStoreStatusSafe(status, "postgres relationship store");
      return status;
    },
  };

  return {
    schema: "iris_postgres_persistence_stores_v1",
    persistence_backend: "postgresql",
    postgres_adapter_mode: "real",
    real_database_connected: true,
    db_connection_attempted: true,
    memoryStore,
    relationshipStore,
    adapter,
  };
}

export function assertPostgresRuntimeStoreStatusSafe(
  status,
  context = "postgres runtime store status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  if (
    status.schema !== "iris_postgres_memory_store_status_v1" &&
    status.schema !== "iris_postgres_relationship_store_status_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!POSTGRES_RUNTIME_STORE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected runtime store status field ${field}`);
    }
  }
  if (!["ready", "attention"].includes(status.health)) {
    throw new ContractError(`${context}: invalid health`);
  }
  if (status.adapter_status !== "configured") {
    throw new ContractError(`${context}: invalid adapter status`);
  }
  assertPublicSafeObject(status, context);
  assertNoUnsafeText(status, context);
  const requiredBoundaryPolicy = [
    "real_adapter_only",
    "private_adapter_contract_required",
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

function createStoreBoundaryPolicy() {
  return {
    real_adapter_only: true,
    private_adapter_contract_required: true,
    counts_only: true,
    no_record_payloads: true,
    no_profile_payloads: true,
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
