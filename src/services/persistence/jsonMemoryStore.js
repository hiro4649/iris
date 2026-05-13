import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { assertCandidateNotExecutable, ContractError } from "../../core/contracts.js";
import { inferSensitivityLevel, redactSensitiveText } from "../safety/privacyGuards.js";
import { classifyStoreReadError } from "./storeStatusErrors.js";

const FORBIDDEN_MEMORY_PUBLIC_FIELDS = new Set([
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
  "selected_memory_ids",
  "approved_memory_record",
  "approved_relationship_record",
  "relation_score",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "endpoint",
  "url",
  "filePath",
  "file_path",
  "backup_path",
  "raw_backup_path",
  "memory_store_path",
  "relationship_store_path",
  "store_path",
  "db_value",
  "raw_db_value",
  "raw_memory",
  "raw_memory_body",
  "memory_body",
  "raw_youtube_text",
  "raw_youtube_comment",
  "raw_support_message",
  "support_message",
  "raw_frame",
  "raw_screen",
  "raw_audio",
  "raw_audio_body",
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
const UNSAFE_MEMORY_PUBLIC_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url)\b|https?:\/\//i;
const JSON_MEMORY_STORE_STATUS_FIELDS = new Set([
  "schema",
  "health",
  "store_available",
  "read_error",
  "error_kind",
  "record_count",
  "latest_committed_at_ms",
  "memory_type_counts",
  "owner_scope_counts",
  "max_records",
  "retention_enabled",
  "dedupe_by_memory_key",
  "persistence_operation_status",
  "durability",
  "boundary_policy",
]);
const JSON_MEMORY_STORE_STATUS_BOUNDARY_POLICY = {
  counts_only: true,
  no_record_payloads: true,
  approved_schema_only: true,
  no_store_paths: true,
  no_error_messages: true,
};

export function createJsonMemoryStore(
  filePath,
  { maxRecords = 5000, dedupeByMemoryKey = true } = {}
) {
  const persistenceOperation = createPersistenceOperationTracker();
  const backupWriteOperation = createBackupWriteOperationTracker();
  const retention = {
    maxRecords: clampInteger(maxRecords, 1, 100_000, 5000),
    dedupeByMemoryKey: dedupeByMemoryKey !== false,
  };
  return {
    filePath,
    list() {
      return readRecordsWithRecovery(filePath).records;
    },
    append(record) {
      assertApprovedMemoryRecordShape(record, "JSON memory store append");
      markPersistenceOperationAttempt(persistenceOperation);
      try {
        const existing = readRecordsWithRecovery(filePath).records;
        const records = applyRetention([...existing, record], retention);
        writeRecords(filePath, records, backupWriteOperation);
        markPersistenceOperationSuccess(persistenceOperation);
        return record;
      } catch (error) {
        markPersistenceOperationError(persistenceOperation, error);
        throw error;
      }
    },
    recentSummary(limit = 3) {
      return readRecordsWithRecovery(filePath)
        .records
        .slice(-limit)
        .map((record) => record.summary)
        .filter(Boolean)
        .join(" / ");
    },
    status() {
      const { records, errorKind, recovery } = readRecordsForStatus(filePath);
      const status = {
        schema: "iris_json_memory_store_status_v1",
        health: errorKind ? "attention" : "ready",
        store_available: !errorKind,
        read_error: Boolean(errorKind),
        error_kind: errorKind,
        record_count: records.length,
        latest_committed_at_ms: latestRecordTime(records),
        memory_type_counts: countKnownValues(records, {
          keys: MEMORY_TYPES,
          select: inferMemoryType,
        }),
        owner_scope_counts: countKnownValues(records, {
          keys: OWNER_SCOPES,
          select: inferOwnerScope,
        }),
        max_records: retention.maxRecords,
        retention_enabled: true,
        dedupe_by_memory_key: retention.dedupeByMemoryKey,
        persistence_operation_status: createPersistenceOperationStatus(persistenceOperation),
        durability: createDurabilityStatus(filePath, recovery, backupWriteOperation),
        boundary_policy: { ...JSON_MEMORY_STORE_STATUS_BOUNDARY_POLICY },
      };
      assertJsonMemoryStoreStatusSafe(status);
      return status;
    },
  };
}

export function assertJsonMemoryStoreStatusSafe(
  status,
  context = "JSON memory store status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  if (status.schema !== "iris_json_memory_store_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!JSON_MEMORY_STORE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`, { field });
    }
  }
  if (!["ready", "attention"].includes(status.health)) {
    throw new ContractError(`${context}: invalid health`);
  }
  assertExactBoundaryPolicy(status.boundary_policy, JSON_MEMORY_STORE_STATUS_BOUNDARY_POLICY, context);
  for (const key of Object.keys(JSON_MEMORY_STORE_STATUS_BOUNDARY_POLICY)) {
    if (status.boundary_policy[key] !== true) {
      throw new ContractError(`${context}: boundary policy ${key} must be true`);
    }
  }
  assertNoForbiddenMemoryPublicFields(status, context);
}

export function approveMemoryCandidate(phase05, phase15) {
  if (phase05.commit_status !== "committed") return null;
  if (phase15.final_normalized_status !== "safe") return null;

  const candidate = phase05.memory_candidate;
  assertCandidateNotExecutable(candidate, "Phase05 memory candidate approval");

  if (candidate.candidate_kind !== "experience_log") {
    throw new ContractError("unsupported memory candidate kind", {
      candidate_kind: candidate.candidate_kind,
    });
  }

  return {
    schema: "approved_memory_record",
    approved: true,
    trace_id: candidate.trace_id,
    event_id: candidate.event_id,
    store: phase05.updated_store,
    summary: candidate.summary,
    audit_status: "approved",
    commit_snapshot_id: `snapshot:phase05:${candidate.event_id}`,
    rollback_pointer_id: `rollback:phase05:${candidate.event_id}`,
    moderation_precheck_status: "allowed",
    committed_at_ms: Date.now(),
  };
}

export function commitApprovedMemoryRecord(memoryStore, approvedRecord) {
  if (!approvedRecord) return { committed: false, reason: "no_approved_record" };
  if (approvedRecord.schema !== "approved_memory_record" || approvedRecord.approved !== true) {
    throw new ContractError("persistence writer received non-approved memory record");
  }
  const recordKey = memoryRecordKey(approvedRecord);
  if (
    recordKey &&
    typeof memoryStore.list === "function" &&
    memoryStore.list().some((record) => memoryRecordKey(record) === recordKey)
  ) {
    return {
      committed: false,
      reason: "duplicate_memory_record",
      record: approvedRecord,
    };
  }
  memoryStore.append(approvedRecord);
  return { committed: true, record: approvedRecord };
}

export function sanitizeApprovedMemoryRecordForPublicState(record) {
  if (!record) return null;
  assertApprovedMemoryRecordShape(record, "Approved memory public summary");
  if (isPrivateOwnerScope(record.owner_scope)) {
    return null;
  }
  if (record.sensitivity_level === "private" || record.sensitivity_level === "sensitive") {
    return null;
  }
  const sensitivity = inferSensitivityLevel(record.summary ?? "");
  if (sensitivity === "private" || sensitivity === "sensitive") {
    return null;
  }
  const summary = redactSensitiveText(record.summary ?? "", { maxLength: 220 });
  const publicRecord = {
    schema: record.schema,
    memory_id: sanitizePublicMemoryText(record.memory_id ?? record.event_id, {
      maxLength: 140,
      fallback: null,
    }),
    event_id: sanitizePublicMemoryText(record.event_id, { maxLength: 140, fallback: null }),
    store: sanitizePublicMemoryText(record.store, {
      maxLength: 80,
      fallback: "memory_store",
    }),
    summary,
    memory_type: inferMemoryType(record),
    owner_scope: inferOwnerScope(record),
    linked_identity_id: sanitizePublicMemoryText(record.linked_identity_id, {
      maxLength: 140,
      fallback: null,
    }),
    display_name: sanitizePublicMemoryText(record.display_name, {
      maxLength: 80,
      fallback: null,
    }),
    source_phase: sanitizePublicMemoryText(record.source_phase, {
      maxLength: 80,
      fallback: "phase05",
    }),
    source_candidate_kind: sanitizePublicMemoryText(record.source_candidate_kind, {
      maxLength: 80,
      fallback: null,
    }),
    committed_at_ms: record.committed_at_ms ?? null,
  };
  assertNoForbiddenMemoryPublicFields(publicRecord, "Approved memory public summary");
  return publicRecord;
}

function sanitizePublicMemoryText(value, { maxLength = 160, fallback = "" } = {}) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  if (!text || UNSAFE_MEMORY_PUBLIC_TEXT_PATTERN.test(text)) return fallback;
  return text;
}

export function sanitizeApprovedMemoryRecordsForPublicState(records, { limit = 50 } = {}) {
  if (!Array.isArray(records)) return [];
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 50;
  return records
    .slice(-safeLimit)
    .map((record) => sanitizeApprovedMemoryRecordForPublicState(record))
    .filter(Boolean);
}

const MEMORY_TYPES = [
  "stream_experience",
  "game_experience",
  "media_watch_experience",
  "community",
  "relationship",
  "episodic",
  "semantic",
  "short_term",
];

const OWNER_SCOPES = ["user", "community", "shared_stream"];
const PRIVATE_OWNER_SCOPES = new Set(["private", "sensitive"]);

function countKnownValues(records, { keys, select }) {
  const counts = Object.fromEntries(keys.map((key) => [key, 0]));
  for (const record of records) {
    const key = select(record);
    if (Object.hasOwn(counts, key)) counts[key] += 1;
  }
  return counts;
}

function readRecords(filePath) {
  if (!existsSync(filePath)) return [];
  const raw = readFileSync(filePath, "utf8");
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new ContractError("memory store file must contain an array", { filePath });
  }
  parsed.forEach((record) => assertApprovedMemoryRecordShape(record, "JSON memory store record"));
  return parsed;
}

function readRecordsForStatus(filePath) {
  try {
    const recovered = readRecordsWithRecovery(filePath);
    return { records: recovered.records, errorKind: null, recovery: recovered.recovery };
  } catch (error) {
    return {
      records: [],
      errorKind: classifyStoreReadError(error),
      recovery: {
        backup_available: hasReadableBackup(filePath),
        recovered_from_backup: false,
        primary_error_kind: classifyStoreReadError(error),
      },
    };
  }
}

function writeRecords(filePath, records, backupWriteOperation = null) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeJsonAtomic(filePath, records);
  writeBackupSafely(filePath, records, backupWriteOperation);
}

function createPersistenceOperationTracker() {
  return {
    attempt_count: 0,
    success_count: 0,
    error_count: 0,
    last_success_at_ms: null,
    last_error_kind: null,
  };
}

function markPersistenceOperationAttempt(tracker) {
  tracker.attempt_count += 1;
}

function markPersistenceOperationSuccess(tracker) {
  tracker.success_count += 1;
  tracker.last_success_at_ms = Date.now();
  tracker.last_error_kind = null;
}

function markPersistenceOperationError(tracker, error) {
  tracker.error_count += 1;
  tracker.last_error_kind = classifyStoreReadError(error);
}

function createPersistenceOperationStatus(tracker) {
  return {
    schema: "iris_json_store_persistence_operation_status_v1",
    operation_health:
      tracker.last_error_kind !== null ? "attention" : tracker.success_count > 0 ? "ready" : "idle",
    attempt_count: tracker.attempt_count,
    success_count: tracker.success_count,
    error_count: tracker.error_count,
    last_success_at_ms: tracker.last_success_at_ms,
    last_error_kind: tracker.last_error_kind,
    boundary_policy: {
      counts_only: true,
      no_record_payloads: true,
      no_store_paths: true,
      no_error_messages: true,
    },
  };
}

function createBackupWriteOperationTracker() {
  return {
    attempt_count: 0,
    success_count: 0,
    error_count: 0,
    last_success_at_ms: null,
    last_error_kind: null,
  };
}

function markBackupWriteSuccess(tracker) {
  if (!tracker) return;
  tracker.attempt_count += 1;
  tracker.success_count += 1;
  tracker.last_success_at_ms = Date.now();
  tracker.last_error_kind = null;
}

function markBackupWriteError(tracker, error) {
  if (!tracker) return;
  tracker.attempt_count += 1;
  tracker.error_count += 1;
  tracker.last_error_kind = classifyStoreReadError(error);
}

function readRecordsWithRecovery(filePath) {
  const backupAvailable = hasReadableBackup(filePath);
  if (!existsSync(filePath) && backupAvailable) {
    return {
      records: readBackupRecords(filePath),
      recovery: {
        backup_available: true,
        recovered_from_backup: true,
        primary_error_kind: "store_location_unavailable",
      },
    };
  }
  try {
    return {
      records: readRecords(filePath),
      recovery: {
        backup_available: backupAvailable,
        recovered_from_backup: false,
        primary_error_kind: null,
      },
    };
  } catch (error) {
    let records;
    try {
      records = readBackupRecords(filePath);
    } catch {
      throw error;
    }
    return {
      records,
      recovery: {
        backup_available: true,
        recovered_from_backup: true,
        primary_error_kind: classifyStoreReadError(error),
      },
    };
  }
}

function hasReadableBackup(filePath) {
  try {
    readBackupRecords(filePath);
    return true;
  } catch {
    return false;
  }
}

function readBackupRecords(filePath) {
  const sidecarPath = backupPath(filePath);
  if (!existsSync(sidecarPath)) {
    throw new ContractError("memory store backup is unavailable");
  }
  return readRecords(sidecarPath);
}

function writeBackupSafely(filePath, records, backupWriteOperation = null) {
  try {
    writeJsonAtomic(backupPath(filePath), records);
    markBackupWriteSuccess(backupWriteOperation);
  } catch (error) {
    markBackupWriteError(backupWriteOperation, error);
    // Primary persistence has already succeeded; backup health is reported by status().
  }
}

function backupPath(filePath) {
  return `${filePath}.bak`;
}

function createDurabilityStatus(filePath, recovery = {}, backupWriteOperation = null) {
  const backupErrorKind = backupWriteOperation?.last_error_kind ?? null;
  return {
    sidecar_backup_enabled: true,
    backup_available: hasReadableBackup(filePath),
    recovered_from_backup: recovery.recovered_from_backup === true,
    primary_read_error: Boolean(recovery.primary_error_kind),
    primary_error_kind: recovery.primary_error_kind ?? null,
    backup_write_health: backupErrorKind
      ? "attention"
      : backupWriteOperation?.success_count > 0
        ? "ready"
        : "idle",
    backup_write_error: Boolean(backupErrorKind),
    backup_error_kind: backupErrorKind,
    backup_write_attempt_count: backupWriteOperation?.attempt_count ?? 0,
    backup_write_success_count: backupWriteOperation?.success_count ?? 0,
    backup_write_error_count: backupWriteOperation?.error_count ?? 0,
    last_backup_write_at_ms: backupWriteOperation?.last_success_at_ms ?? null,
    boundary_policy: {
      counts_only: true,
      no_backup_payloads: true,
      no_store_paths: true,
      no_error_messages: true,
    },
  };
}

function applyRetention(records, { maxRecords, dedupeByMemoryKey }) {
  const deduped = dedupeByMemoryKey ? dedupeRecordsByKey(records) : records;
  return deduped.slice(-maxRecords);
}

function dedupeRecordsByKey(records) {
  const byKey = new Map();
  const withoutKey = [];
  for (const record of records) {
    const key = memoryRecordKey(record);
    if (!key) {
      withoutKey.push(record);
      continue;
    }
    byKey.delete(key);
    byKey.set(key, record);
  }
  return [...withoutKey, ...byKey.values()].sort(
    (a, b) => safeRecordTime(a) - safeRecordTime(b)
  );
}

function memoryRecordKey(record) {
  if (!record || typeof record !== "object") return "";
  if (record.memory_id) return `memory_id:${record.memory_id}`;
  if (record.event_id && (record.source_phase || record.source_candidate_kind)) {
    return [
      "event",
      record.event_id,
      record.source_phase ?? "phase05",
      record.source_candidate_kind ?? "unknown",
    ].join(":");
  }
  return "";
}

function safeRecordTime(record) {
  const number = Number(record?.committed_at_ms ?? record?.timestamp_ms ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function latestRecordTime(records) {
  const latest = records.reduce((max, record) => Math.max(max, safeRecordTime(record)), 0);
  return latest > 0 ? latest : null;
}

function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(tempPath, filePath);
}

function assertApprovedMemoryRecordShape(record, context) {
  assertNoForbiddenMemoryPublicFields(record, context);
  if (record.schema !== "approved_memory_record" || record.approved !== true) {
    throw new ContractError(`${context}: invalid approved memory record`);
  }
  assertRollbackGuardFields(record, context);
}

function assertRollbackGuardFields(record, context) {
  for (const field of [
    "audit_status",
    "commit_snapshot_id",
    "rollback_pointer_id",
    "moderation_precheck_status",
  ]) {
    if (typeof record[field] !== "string" || record[field].trim() === "") {
      throw new ContractError(`${context}: ${field} is required`);
    }
  }
  if (record.audit_status !== "approved") {
    throw new ContractError(`${context}: approved audit status required`);
  }
  if (record.moderation_precheck_status !== "allowed") {
    throw new ContractError(`${context}: allowed moderation precheck required`);
  }
}

function inferMemoryType(record) {
  if (
    [
      "stream_experience",
      "game_experience",
      "media_watch_experience",
      "community",
      "relationship",
      "episodic",
      "semantic",
      "short_term",
    ].includes(record.memory_type)
  ) {
    return record.memory_type;
  }
  const summary = String(record.summary ?? "").toLowerCase();
  if (/game|minecraft|apex|valorant/.test(summary)) return "game_experience";
  if (/media|youtube|clip|anime|video|watch/.test(summary)) {
    return "media_watch_experience";
  }
  if (/stream|live|shared moment/.test(summary)) return "stream_experience";
  if (/community|meme|shared/.test(summary)) return "community";
  return "episodic";
}

function inferOwnerScope(record) {
  const ownerScope = String(record.owner_scope ?? "").trim();
  if (OWNER_SCOPES.includes(ownerScope)) return ownerScope;
  if (record.linked_identity_id) return "user";
  if (record.store === "community_memory") return "community";
  return "shared_stream";
}

function isPrivateOwnerScope(value) {
  return PRIVATE_OWNER_SCOPES.has(String(value ?? "").trim());
}

function assertNoForbiddenMemoryPublicFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenMemoryPublicFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_MEMORY_PUBLIC_FIELDS.has(field)) {
      throw new ContractError(`${context}: memory public summary contains unsafe field`, {
        field,
        path,
      });
    }
    assertNoForbiddenMemoryPublicFields(child, context, `${path}.${field}`);
  }
}

function assertExactBoundaryPolicy(policy, expected, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy is missing`);
  }
  for (const field of Object.keys(policy)) {
    if (!Object.hasOwn(expected, field)) {
      throw new ContractError(`${context}: unexpected boundary policy ${field}`);
    }
  }
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}
