import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ContractError } from "../../core/contracts.js";
import {
  assertAdminReviewQueueDecisionSafe,
} from "./adminReviewQueue.js";
import { classifyStoreReadError } from "../persistence/storeStatusErrors.js";

const STORE_SCHEMA = "iris_admin_review_decision_log_v1";
const STATUS_SCHEMA = "iris_admin_review_decision_log_status_v1";
const URL_PATTERN = /https?:\/\/|postgres:\/\/|postgresql:\/\//i;
const ACTION_IDS = new Set([
  "approve_memory_candidate",
  "reject_memory_candidate",
  "approve_relationship_candidate",
  "reject_relationship_candidate",
]);
const FORBIDDEN_FIELDS = new Set([
  "world_command",
  "event_id",
  "trace_id",
  "subtitle_text",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "memory_candidate",
  "relationship_candidate",
  "relationship_update_candidate",
  "approved_memory_record",
  "approved_relationship_record",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "payload",
  "raw_frame",
  "ocr_text",
]);
const ADMIN_REVIEW_DECISION_LOG_STATUS_FIELDS = new Set([
  "schema",
  "health",
  "store_available",
  "read_error",
  "error_kind",
  "entry_count",
  "latest_decision_at_ms",
  "action_counts",
  "max_entries",
  "retention_enabled",
  "recovery",
  "boundary_policy",
]);
const ADMIN_REVIEW_DECISION_LOG_STATUS_BOUNDARY_FIELDS = [
  "counts_only",
  "decision_summaries_only",
  "no_raw_candidates",
  "no_approved_records",
  "no_memory_or_relationship_store_write",
  "no_validator_commit",
  "no_endpoint_values",
  "no_secret_values",
  "no_payloads",
  "no_commands",
  "no_raw_frames",
  "no_store_paths",
];

export function createJsonAdminReviewDecisionLog(
  filePath,
  { maxEntries = 5000 } = {}
) {
  const retention = {
    maxEntries: clampInteger(maxEntries, 1, 100_000, 5000),
  };
  return {
    filePath,
    append(decision) {
      assertAdminReviewQueueDecisionSafe(decision, "admin review decision log append");
      const entries = readEntriesWithRecovery(filePath).entries;
      const next = [...entries, decision].slice(-retention.maxEntries);
      writeEntries(filePath, next);
      return structuredClone(decision);
    },
    list(limitCount = retention.maxEntries) {
      const safeLimit = clampInteger(limitCount, 1, retention.maxEntries, retention.maxEntries);
      return readEntriesWithRecovery(filePath).entries.slice(-safeLimit);
    },
    summary() {
      return summarizeAdminReviewDecisions(readEntriesWithRecovery(filePath).entries);
    },
    status() {
      const { entries, errorKind, recovery } = readEntriesForStatus(filePath);
      const status = {
        schema: STATUS_SCHEMA,
        health: errorKind ? "attention" : "ready",
        store_available: !errorKind,
        read_error: Boolean(errorKind),
        error_kind: errorKind,
        entry_count: entries.length,
        latest_decision_at_ms: latestDecisionTime(entries),
        action_counts: countActions(entries),
        max_entries: retention.maxEntries,
        retention_enabled: true,
        recovery,
        boundary_policy: {
          counts_only: true,
          decision_summaries_only: true,
          no_raw_candidates: true,
          no_approved_records: true,
          no_memory_or_relationship_store_write: true,
          no_validator_commit: true,
          no_endpoint_values: true,
          no_secret_values: true,
          no_payloads: true,
          no_commands: true,
          no_raw_frames: true,
          no_store_paths: true,
        },
      };
      assertAdminReviewDecisionLogStatusSafe(status);
      return status;
    },
  };
}

export function summarizeAdminReviewDecisions(decisions = []) {
  const safeDecisions = decisions.map((decision) => {
    assertAdminReviewQueueDecisionSafe(decision, "admin review decision log summary source");
    return decision;
  });
  const summary = {
    schema: "iris_admin_review_queue_decision_summary_v1",
    decision_count: safeDecisions.length,
    approve_memory_count: safeDecisions.filter(
      (decision) => decision.action_id === "approve_memory_candidate"
    ).length,
    reject_memory_count: safeDecisions.filter(
      (decision) => decision.action_id === "reject_memory_candidate"
    ).length,
    approve_relationship_count: safeDecisions.filter(
      (decision) => decision.action_id === "approve_relationship_candidate"
    ).length,
    reject_relationship_count: safeDecisions.filter(
      (decision) => decision.action_id === "reject_relationship_candidate"
    ).length,
    latest_decision_id: safeDecisions.at(-1)?.decision_id ?? null,
    raw_candidate_exposed: false,
    approved_record_exposed: false,
  };
  assertAdminReviewDecisionSummarySafe(summary);
  return summary;
}

export function assertAdminReviewDecisionLogStatusSafe(
  status,
  context = "admin review decision log status"
) {
  assertSafeObject(status, context);
  if (status.schema !== STATUS_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!ADMIN_REVIEW_DECISION_LOG_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field ${field}`);
    }
  }
  if (!["ready", "attention"].includes(status.health)) {
    throw new ContractError(`${context}: invalid health`);
  }
  if (
    typeof status.store_available !== "boolean" ||
    typeof status.read_error !== "boolean" ||
    status.store_available === status.read_error ||
    (status.health === "ready") !== status.store_available
  ) {
    throw new ContractError(`${context}: health status mismatch`);
  }
  if (
    status.error_kind !== null &&
    (typeof status.error_kind !== "string" || !/^[a-z0-9_]+$/.test(status.error_kind))
  ) {
    throw new ContractError(`${context}: invalid error kind`);
  }
  if (
    !Number.isInteger(status.entry_count) ||
    status.entry_count < 0 ||
    !Number.isInteger(status.max_entries) ||
    status.max_entries < 0 ||
    typeof status.retention_enabled !== "boolean" ||
    (status.retention_enabled === true && status.max_entries < 1)
  ) {
    throw new ContractError(`${context}: invalid retention counts`);
  }
  if (
    status.latest_decision_at_ms !== null &&
    (!Number.isInteger(status.latest_decision_at_ms) ||
      status.latest_decision_at_ms < 0)
  ) {
    throw new ContractError(`${context}: invalid latest decision timestamp`);
  }
  if (
    !status.action_counts ||
    typeof status.action_counts !== "object" ||
    Array.isArray(status.action_counts) ||
    Object.keys(status.action_counts).length !== ACTION_IDS.size ||
    [...ACTION_IDS].some(
      (action) =>
        !Number.isInteger(status.action_counts[action]) ||
        status.action_counts[action] < 0
    )
  ) {
    throw new ContractError(`${context}: invalid action counts`);
  }
  assertBoundaryPolicy(
    status.boundary_policy,
    ADMIN_REVIEW_DECISION_LOG_STATUS_BOUNDARY_FIELDS,
    `${context} boundary policy`
  );
  if (status.entry_count !== Object.values(status.action_counts).reduce((a, b) => a + b, 0)) {
    throw new ContractError(`${context}: action count mismatch`);
  }
  if (
    !["not_needed", "backup", "backup_or_empty", "failed", "in_memory"].includes(
      status.recovery
    )
  ) {
    throw new ContractError(`${context}: invalid recovery status`);
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  assertSafeObject(policy, context);
  const allowed = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

export function assertAdminReviewDecisionSummarySafe(
  summary,
  context = "admin review decision summary"
) {
  assertSafeObject(summary, context);
  if (summary.schema !== "iris_admin_review_queue_decision_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (summary.raw_candidate_exposed !== false || summary.approved_record_exposed !== false) {
    throw new ContractError(`${context}: raw candidate or approved record exposed`);
  }
  const countFields = [
    "decision_count",
    "approve_memory_count",
    "reject_memory_count",
    "approve_relationship_count",
    "reject_relationship_count",
  ];
  for (const field of countFields) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid decision count`);
    }
  }
  if (
    summary.latest_decision_id !== null &&
    (typeof summary.latest_decision_id !== "string" ||
      summary.latest_decision_id.length < 1)
  ) {
    throw new ContractError(`${context}: invalid latest decision id`);
  }
  const count =
    summary.approve_memory_count +
    summary.reject_memory_count +
    summary.approve_relationship_count +
    summary.reject_relationship_count;
  if (summary.decision_count !== count) {
    throw new ContractError(`${context}: decision count mismatch`);
  }
}

function readEntriesWithRecovery(filePath) {
  if (!existsSync(filePath)) return { entries: [], recovery: "not_needed" };
  try {
    return { entries: parseEntries(readFileSync(filePath, "utf8")), recovery: "not_needed" };
  } catch {
    const backupPath = `${filePath}.bak`;
    if (!existsSync(backupPath)) return { entries: [], recovery: "failed" };
    try {
      return { entries: parseEntries(readFileSync(backupPath, "utf8")), recovery: "backup" };
    } catch {
      return { entries: [], recovery: "failed" };
    }
  }
}

function readEntriesForStatus(filePath) {
  if (!existsSync(filePath)) return { entries: [], errorKind: null, recovery: "not_needed" };
  try {
    return {
      entries: parseEntries(readFileSync(filePath, "utf8")),
      errorKind: null,
      recovery: "not_needed",
    };
  } catch (error) {
    return {
      entries: readEntriesWithRecovery(filePath).entries,
      errorKind: classifyStoreReadError(error),
      recovery: "backup_or_empty",
    };
  }
}

function parseEntries(raw) {
  const parsed = JSON.parse(raw);
  if (parsed?.schema !== STORE_SCHEMA || !Array.isArray(parsed.entries)) return [];
  return parsed.entries.filter((entry) => {
    try {
      assertAdminReviewQueueDecisionSafe(entry);
      return true;
    } catch {
      return false;
    }
  });
}

function writeEntries(filePath, entries) {
  mkdirSync(dirname(filePath), { recursive: true });
  const payload = JSON.stringify({ schema: STORE_SCHEMA, entries }, null, 2);
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmpPath, payload);
  renameSync(tmpPath, filePath);
  writeFileSync(`${filePath}.bak`, payload);
}

function countActions(entries) {
  const counts = Object.fromEntries([...ACTION_IDS].map((action) => [action, 0]));
  for (const entry of entries) {
    if (ACTION_IDS.has(entry.action_id)) counts[entry.action_id] += 1;
  }
  return counts;
}

function latestDecisionTime(entries) {
  return entries.reduce((latest, entry) => Math.max(latest, entry.created_at_ms), null);
}

function assertSafeObject(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: object required`);
  }
  if (URL_PATTERN.test(JSON.stringify(value))) {
    throw new ContractError(`${context}: endpoint value leaked`);
  }
  assertNoForbiddenFields(value, context);
}

function assertNoForbiddenFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { field, path });
    }
    assertNoForbiddenFields(child, context, `${path}.${field}`);
  }
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}
