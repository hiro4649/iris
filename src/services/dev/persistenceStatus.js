import { ContractError } from "../../core/contracts.js";
import { sanitizeStoreErrorKind } from "../persistence/storeStatusErrors.js";

const PERSISTENCE_READINESS_STATUSES = new Set([
  "disabled",
  "configured_waiting_for_records",
  "active_with_memory",
  "active_with_memory_and_relationships",
  "partial_relationship_memory",
  "attention",
]);

const FORBIDDEN_PERSISTENCE_STATUS_FIELDS = new Set([
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
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "memory_records",
  "relationship_profiles",
  "records",
  "profiles",
  "summary",
  "recent_summaries",
  "endpoint",
  "url",
  "filePath",
  "file_path",
  "memory_store_path",
  "relationship_store_path",
  "store_path",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "password",
  "authorization",
]);
const PERSISTENCE_STATUS_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "enabled",
  "public_counts",
  "store_limits",
  "persistence_readiness_status",
  "status",
  "boundary_policy",
  "adapter_validation_required",
]);

export function createPersistenceStatus({
  capabilities = {},
  memoryRecordCount = 0,
  relationshipProfileCount = 0,
  replayEntryCount = 0,
  candidateReviewStats = null,
  memoryStoreStatus = null,
  relationshipStoreStatus = null,
  generatedAtMs = Date.now(),
} = {}) {
  const memoryStatus = sanitizeMemoryStoreStatus(memoryStoreStatus, { generatedAtMs });
  const relationshipStatus = sanitizeRelationshipStoreStatus(relationshipStoreStatus, {
    generatedAtMs,
  });
  const status = {
    schema: "iris_persistence_status_v1",
    generated_at_ms: generatedAtMs,
    enabled: {
      persistence: capabilities.persistence_enabled === true,
      candidate_persistence: capabilities.candidate_persistence_enabled === true,
      relationship_memory: capabilities.relationship_memory_enabled === true,
      replay_log: capabilities.replay_log_enabled === true,
    },
    public_counts: {
      memory_record_count: safeCount(memoryRecordCount),
      relationship_profile_count: safeCount(relationshipProfileCount),
      replay_entry_count: safeCount(replayEntryCount),
      candidate_review_item_count: candidateReviewItemCount(candidateReviewStats),
    },
    store_limits: {
      memory: memoryStatus,
      relationship: relationshipStatus,
    },
    persistence_readiness_status: buildPersistenceReadinessStatus({
      capabilities,
      memoryRecordCount,
      relationshipProfileCount,
      memoryStatus,
      relationshipStatus,
    }),
    status: buildStatus({
      capabilities,
      memoryRecordCount,
      relationshipProfileCount,
    }),
    boundary_policy: {
      read_only_status: true,
      counts_only: true,
      no_record_payloads: true,
      no_private_memory: true,
      no_hidden_relationship_scores: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
      no_path_values: true,
      no_error_messages: true,
    },
    adapter_validation_required: true,
  };
  assertPersistenceStatusSafe(status);
  return status;
}

export function assertPersistenceStatusSafe(status, context = "persistence status") {
  if (!status || typeof status !== "object") {
    throw new ContractError(`${context}: missing status`);
  }
  assertNoForbiddenPersistenceStatusFields(status, context);
  if (status.schema !== "iris_persistence_status_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: status.schema });
  }
  for (const field of Object.keys(status)) {
    if (!PERSISTENCE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`, { field });
    }
  }
  assertBoundaryPolicy(status.boundary_policy, [
    "read_only_status",
    "counts_only",
    "no_record_payloads",
    "no_private_memory",
    "no_hidden_relationship_scores",
    "no_candidates",
    "no_commands",
    "no_secret_values",
    "no_path_values",
    "no_error_messages",
  ], context);
  if (!PERSISTENCE_READINESS_STATUSES.has(status.persistence_readiness_status)) {
    throw new ContractError(`${context}: invalid persistence readiness status`, {
      persistence_readiness_status: status.persistence_readiness_status,
    });
  }
  if (status.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy ${field} must be true`);
    }
  }
}

function buildPersistenceReadinessStatus({
  capabilities,
  memoryRecordCount,
  relationshipProfileCount,
  memoryStatus,
  relationshipStatus,
}) {
  if (capabilities.candidate_persistence_enabled !== true) return "disabled";
  if (memoryStatus.read_error === true || relationshipStatus.read_error === true) {
    return "attention";
  }
  if (
    memoryStatus.persistence_operation_status.operation_health === "attention" ||
    relationshipStatus.persistence_operation_status.operation_health === "attention"
  ) {
    return "attention";
  }
  if (
    memoryStatus.durability.backup_write_health === "attention" ||
    relationshipStatus.durability.backup_write_health === "attention"
  ) {
    return "attention";
  }
  if (
    capabilities.relationship_memory_enabled !== true &&
    safeCount(memoryRecordCount) > 0
  ) {
    return "partial_relationship_memory";
  }
  if (
    capabilities.relationship_memory_enabled === true &&
    safeCount(memoryRecordCount) > 0 &&
    safeCount(relationshipProfileCount) > 0
  ) {
    return "active_with_memory_and_relationships";
  }
  if (safeCount(memoryRecordCount) > 0) return "active_with_memory";
  return "configured_waiting_for_records";
}

function buildStatus({ capabilities, memoryRecordCount, relationshipProfileCount }) {
  if (capabilities.candidate_persistence_enabled !== true) return "disabled";
  if (
    capabilities.relationship_memory_enabled === true &&
    relationshipProfileCount > 0 &&
    memoryRecordCount > 0
  ) {
    return "active_with_memory_and_relationships";
  }
  if (memoryRecordCount > 0) return "active_with_memory";
  return "enabled_no_public_records_yet";
}

function safeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function safeNullableCount(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.trunc(number);
}

function candidateReviewItemCount(candidateReviewStats) {
  if (candidateReviewStats === null || candidateReviewStats === undefined) return 0;
  if (
    !candidateReviewStats ||
    typeof candidateReviewStats !== "object" ||
    Array.isArray(candidateReviewStats) ||
    !Number.isInteger(candidateReviewStats.total_items) ||
    candidateReviewStats.total_items < 0
  ) {
    throw new ContractError("persistence status: candidate review item count is required");
  }
  return candidateReviewStats.total_items;
}

function sanitizeMemoryStoreStatus(status, { generatedAtMs }) {
  const configured = Boolean(status);
  const readError = configured && (status?.read_error === true || status?.store_available === false);
  const latestActivityAtMs = safeOptionalTimestamp(status?.latest_committed_at_ms);
  return {
    configured,
    health: storeHealth({ configured, readError }),
    retained_item_count: requiredConfiguredStoreCount(
      status,
      "record_count",
      "memory store"
    ),
    activity: sanitizeStoreActivity({
      latestActivityAtMs,
      generatedAtMs,
      readError,
    }),
    memory_type_counts: sanitizeKnownCountMap(status?.memory_type_counts, [
      "stream_experience",
      "game_experience",
      "media_watch_experience",
      "community",
      "relationship",
      "episodic",
      "semantic",
      "short_term",
    ]),
    owner_scope_counts: sanitizeKnownCountMap(status?.owner_scope_counts, [
      "user",
      "community",
      "shared_stream",
    ]),
    max_items: safeCount(status?.max_records),
    retention_enabled: status?.retention_enabled === true,
    dedupe_by_memory_key: status?.dedupe_by_memory_key === true,
    persistence_operation_status: sanitizePersistenceOperationStatus(
      status?.persistence_operation_status
    ),
    durability: sanitizeStoreDurability(status?.durability),
    read_error: readError,
    error_kind: sanitizeStoreErrorKind(status?.error_kind),
  };
}

function sanitizeRelationshipStoreStatus(status, { generatedAtMs }) {
  const configured = Boolean(status);
  const readError = configured && (status?.read_error === true || status?.store_available === false);
  const latestActivityAtMs = safeOptionalTimestamp(status?.latest_interaction_at_ms);
  return {
    configured,
    health: storeHealth({ configured, readError }),
    retained_item_count: requiredConfiguredStoreCount(
      status,
      "profile_count",
      "relationship store"
    ),
    activity: sanitizeStoreActivity({
      latestActivityAtMs,
      generatedAtMs,
      readError,
    }),
    relationship_level_counts: sanitizeKnownCountMap(status?.relationship_level_counts, [
      "new",
      "recognized",
      "familiar",
      "trusted",
      "long_term_friend",
      "bounded",
    ]),
    max_items: safeCount(status?.max_profiles),
    recent_item_limit: safeCount(status?.recent_summary_limit),
    retention_enabled: status?.retention_enabled === true,
    persistence_operation_status: sanitizePersistenceOperationStatus(
      status?.persistence_operation_status
    ),
    durability: sanitizeStoreDurability(status?.durability),
    read_error: readError,
    error_kind: sanitizeStoreErrorKind(status?.error_kind),
  };
}

function requiredConfiguredStoreCount(status, field, label) {
  if (!status) return 0;
  const count = safeNullableCount(status[field]);
  if (count === null) {
    throw new ContractError(`persistence status: ${label} ${field} is required`);
  }
  return count;
}

function sanitizeStoreDurability(value) {
  const sourceAvailable = value && typeof value === "object" && !Array.isArray(value);
  const source = sourceAvailable ? value : {};
  return {
    sidecar_backup_enabled: source.sidecar_backup_enabled === true,
    backup_available:
      safeCount(source.backup_write_success_count) > 0 ||
      source.recovered_from_backup === true,
    recovered_from_backup: source.recovered_from_backup === true,
    primary_read_error: source.primary_read_error === true,
    primary_error_kind: sanitizeStoreErrorKind(source.primary_error_kind),
    backup_write_health: sanitizeBackupWriteHealth(
      source.backup_write_health,
      source.backup_write_error === true || Boolean(source.backup_error_kind)
    ),
    backup_write_error: source.backup_write_error === true || Boolean(source.backup_error_kind),
    backup_error_kind: sanitizeStoreErrorKind(source.backup_error_kind),
    backup_write_attempt_count: requiredOptionalStatusCount(
      sourceAvailable,
      source,
      "backup_write_attempt_count",
      "store durability"
    ),
    backup_write_success_count: requiredOptionalStatusCount(
      sourceAvailable,
      source,
      "backup_write_success_count",
      "store durability"
    ),
    backup_write_error_count: requiredOptionalStatusCount(
      sourceAvailable,
      source,
      "backup_write_error_count",
      "store durability"
    ),
    last_backup_write_at_ms: safeOptionalTimestamp(source.last_backup_write_at_ms),
    boundary_policy: {
      counts_only: true,
      no_backup_payloads: true,
      no_paths: true,
      no_error_messages: true,
    },
  };
}

function sanitizeBackupWriteHealth(value, hasError) {
  const text = safeOptionalText(value, 40);
  if (["idle", "ready", "attention"].includes(text)) return text;
  return hasError ? "attention" : "idle";
}

function sanitizePersistenceOperationStatus(value) {
  const sourceAvailable = value && typeof value === "object" && !Array.isArray(value);
  const source = sourceAvailable ? value : {};
  const lastErrorKind = sanitizeStoreErrorKind(source.last_error_kind);
  return {
    schema: safeOptionalText(source.schema, 120) ?? "iris_json_store_persistence_operation_status_v1",
    operation_health: sanitizeOperationHealth(source.operation_health, lastErrorKind),
    attempt_count: requiredOptionalStatusCount(
      sourceAvailable,
      source,
      "attempt_count",
      "persistence operation"
    ),
    success_count: requiredOptionalStatusCount(
      sourceAvailable,
      source,
      "success_count",
      "persistence operation"
    ),
    error_count: requiredOptionalStatusCount(
      sourceAvailable,
      source,
      "error_count",
      "persistence operation"
    ),
    last_success_at_ms: safeOptionalTimestamp(source.last_success_at_ms),
    last_error_kind: lastErrorKind,
    boundary_policy: {
      counts_only: true,
      no_record_payloads: true,
      no_profile_payloads: true,
      no_paths: true,
      no_error_messages: true,
    },
  };
}

function requiredOptionalStatusCount(sourceAvailable, source, field, label) {
  if (!sourceAvailable) return 0;
  const count = safeNullableCount(source[field]);
  if (count === null) {
    throw new ContractError(`persistence status: ${label} ${field} is required`);
  }
  return count;
}

function sanitizeOperationHealth(value, lastErrorKind) {
  const text = safeOptionalText(value, 40);
  if (["idle", "ready", "attention"].includes(text)) return text;
  return lastErrorKind ? "attention" : "idle";
}

function sanitizeKnownCountMap(value, keys) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(keys.map((key) => [key, safeCount(source[key])]));
}

function sanitizeStoreActivity({ latestActivityAtMs, generatedAtMs, readError }) {
  const generated = safeOptionalTimestamp(generatedAtMs);
  const ageMs =
    latestActivityAtMs === null || readError || generated === null
      ? null
      : Math.max(0, generated - latestActivityAtMs);
  return {
    activity_available: Number.isFinite(ageMs),
    latest_activity_at_ms: readError ? null : latestActivityAtMs,
    latest_activity_age_ms: ageMs,
    boundary_policy: {
      timestamps_only: true,
      no_payloads: true,
      no_paths: true,
    },
  };
}

function storeHealth({ configured, readError }) {
  if (!configured) return "not_configured";
  return readError ? "attention" : "ready";
}

function safeOptionalTimestamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.trunc(number);
}

function safeOptionalText(value, maxLength = 120) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function assertNoForbiddenPersistenceStatusFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenPersistenceStatusFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_PERSISTENCE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe persistence status field`, { field, path });
    }
    assertNoForbiddenPersistenceStatusFields(child, context, `${path}.${field}`);
  }
}
