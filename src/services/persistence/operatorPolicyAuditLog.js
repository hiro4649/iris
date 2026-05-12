import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ContractError } from "../../core/contracts.js";
import { classifyStoreReadError } from "./storeStatusErrors.js";

const STORE_SCHEMA = "iris_operator_policy_audit_log_v1";
const ENTRY_SCHEMA = "iris_operator_policy_audit_entry_v1";
const STATUS_SCHEMA = "iris_operator_policy_audit_log_status_v1";

const DECISIONS = new Set(["validated", "blocked", "saved"]);
const ADMIN_AUDIT_ACTION_TYPES = new Set([
  "operator_policy_validated",
  "operator_policy_blocked",
  "operator_policy_saved",
]);
const FORBIDDEN_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "candidate",
  "command",
  "policy_config",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "viewer_id",
  "display_name",
  "message_text",
  "support_message_text",
  "raw_frame",
  "ocr_text",
]);
const UNSAFE_TEXT_PATTERN =
  /\b(world_command|input_action|approved_game_input_action|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|raw[_-]?frame|ocr[_-]?text|candidate|command)\b|https?:\/\//i;
const OPERATOR_POLICY_AUDIT_LOG_STATUS_FIELDS = new Set([
  "schema",
  "health",
  "store_available",
  "read_error",
  "error_kind",
  "entry_count",
  "latest_event_at_ms",
  "decision_counts",
  "max_entries",
  "retention_enabled",
  "recovery",
  "boundary_policy",
]);
const OPERATOR_POLICY_AUDIT_PUBLIC_SUMMARY_FIELDS = new Set([
  "schema",
  "event_id",
  "setting_id",
  "setting_group",
  "policy_version",
  "policy_digest",
  "decision",
  "actor_role",
  "owner_confirmed",
  "event_at_ms",
  "policy_payload_hidden",
  "boundary_policy",
]);
const ADMIN_AUDIT_TRAIL_SAFE_ENTRY_FIELDS = new Set([
  "schema",
  "actor_role",
  "audit_action_type",
  "safe_target",
  "result",
  "event_at_ms",
  "boundary_policy",
]);
const ADMIN_AUDIT_TRAIL_SAFE_BOUNDARY_POLICY = {
  actor_role_only: true,
  action_type_safe_label_only: true,
  safe_target_label_only: true,
  result_label_only: true,
  no_payload_values: true,
  no_sensitive_values: true,
  no_instruction_values: true,
};

export function createJsonOperatorPolicyAuditLog(filePath, { maxEntries = 5000 } = {}) {
  const retention = { maxEntries: clampInteger(maxEntries, 1, 100_000, 5000) };
  return {
    filePath,
    append(entry) {
      assertOperatorPolicyAuditEntrySafe(entry, "operator policy audit append");
      const entries = readEntriesWithRecovery(filePath).entries;
      const next = [...entries, entry].slice(-retention.maxEntries);
      writeEntries(filePath, next);
      return sanitizeOperatorPolicyAuditEntryForPublicState(entry);
    },
    listEntries() {
      return readEntriesWithRecovery(filePath).entries;
    },
    status() {
      const { entries, errorKind, recovery } = readEntriesForStatus(filePath);
      return {
        schema: STATUS_SCHEMA,
        health: errorKind ? "attention" : "ready",
        store_available: !errorKind,
        read_error: Boolean(errorKind),
        error_kind: errorKind,
        entry_count: entries.length,
        latest_event_at_ms: latestEntryTime(entries),
        decision_counts: countDecisions(entries),
        max_entries: retention.maxEntries,
        retention_enabled: true,
        recovery,
        boundary_policy: {
          counts_only: true,
          no_audit_payloads: true,
          no_policy_payloads: true,
          no_policy_numeric_values: true,
          no_secret_values: true,
          no_endpoint_values: true,
          no_viewer_messages: true,
          no_support_message_text: true,
          no_candidates: true,
          no_commands: true,
          no_raw_frames: true,
          no_store_paths: true,
        },
      };
    },
  };
}

export function createOperatorPolicyAuditEntry({
  eventId,
  settingId,
  settingGroup,
  policyVersion = "v1",
  policyDigest,
  decision = "validated",
  actorRole = "owner",
  ownerConfirmed = false,
  eventAtMs = Date.now(),
  ...rest
} = {}) {
  assertNoForbiddenShape(rest, "operator policy audit entry input");
  assertNoUnsafeText(rest, "operator policy audit entry input");
  const entry = {
    schema: ENTRY_SCHEMA,
    event_id: sanitizeId(eventId ?? `operator_policy_${safeTimestamp(eventAtMs)}`),
    setting_id: sanitizeId(settingId),
    setting_group: sanitizeId(settingGroup),
    policy_version: sanitizeId(policyVersion),
    policy_digest: sanitizeDigest(policyDigest),
    decision: sanitizeDecision(decision),
    actor_role: sanitizeId(actorRole),
    owner_confirmed: ownerConfirmed === true,
    event_at_ms: safeTimestamp(eventAtMs),
    policy_payload_stored_in_audit: false,
  };
  assertOperatorPolicyAuditEntrySafe(entry);
  return entry;
}

export function sanitizeOperatorPolicyAuditEntryForPublicState(entry) {
  assertOperatorPolicyAuditEntrySafe(entry, "operator policy audit public summary");
  const summary = {
    schema: "iris_operator_policy_audit_public_summary_v1",
    event_id: entry.event_id,
    setting_id: entry.setting_id,
    setting_group: entry.setting_group,
    policy_version: entry.policy_version,
    policy_digest: entry.policy_digest,
    decision: entry.decision,
    actor_role: entry.actor_role,
    owner_confirmed: entry.owner_confirmed,
    event_at_ms: entry.event_at_ms,
    policy_payload_hidden: true,
    boundary_policy: {
      no_audit_payloads: true,
      no_policy_payloads: true,
      no_policy_numeric_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
    },
  };
  assertOperatorPolicyAuditPublicSummarySafe(summary);
  return summary;
}

export function createAdminAuditTrailSafeEntry(
  entry,
  context = "admin audit trail safe entry"
) {
  assertOperatorPolicyAuditEntrySafe(entry, context);
  const safeEntry = {
    schema: "iris_admin_audit_trail_safe_entry_v1",
    actor_role: entry.actor_role,
    audit_action_type: safeAuditActionType(entry),
    safe_target: safeAuditTarget(entry),
    result: entry.decision,
    event_at_ms: entry.event_at_ms,
    boundary_policy: { ...ADMIN_AUDIT_TRAIL_SAFE_BOUNDARY_POLICY },
  };
  assertAdminAuditTrailSafeEntry(safeEntry, context);
  return safeEntry;
}

export function assertAdminAuditTrailSafeEntry(
  entry,
  context = "admin audit trail safe entry"
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: entry must be an object`);
  }
  if (entry.schema !== "iris_admin_audit_trail_safe_entry_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(entry)) {
    if (!ADMIN_AUDIT_TRAIL_SAFE_ENTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!entry.actor_role || !/^[a-z0-9][a-z0-9_-]{1,100}$/i.test(entry.actor_role)) {
    throw new ContractError(`${context}: invalid actor role`);
  }
  if (!entry.audit_action_type || !/^[a-z0-9][a-z0-9_-]{1,100}$/i.test(entry.audit_action_type)) {
    throw new ContractError(`${context}: invalid audit action type`);
  }
  if (!ADMIN_AUDIT_ACTION_TYPES.has(entry.audit_action_type)) {
    throw new ContractError(`${context}: unsupported audit action type`);
  }
  if (!entry.safe_target || !/^[a-z0-9][a-z0-9_-]{1,100}$/i.test(entry.safe_target)) {
    throw new ContractError(`${context}: invalid safe target`);
  }
  if (!DECISIONS.has(entry.result)) {
    throw new ContractError(`${context}: invalid result`);
  }
  if (!Number.isInteger(entry.event_at_ms) || entry.event_at_ms < 0) {
    throw new ContractError(`${context}: invalid timestamp`);
  }
  assertExactBoundaryPolicy(entry.boundary_policy, ADMIN_AUDIT_TRAIL_SAFE_BOUNDARY_POLICY, context);
  for (const key of Object.keys(ADMIN_AUDIT_TRAIL_SAFE_BOUNDARY_POLICY)) {
    if (entry.boundary_policy[key] !== true) {
      throw new ContractError(`${context}: boundary policy ${key} must be true`);
    }
  }
  assertNoForbiddenShape(entry, context);
  assertNoUnsafeText(entry, context);
}

export function assertOperatorPolicyAuditEntrySafe(
  entry,
  context = "operator policy audit entry"
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: entry must be an object`);
  }
  if (entry.schema !== ENTRY_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!DECISIONS.has(entry.decision)) {
    throw new ContractError(`${context}: invalid decision`);
  }
  if (entry.policy_payload_stored_in_audit !== false) {
    throw new ContractError(`${context}: policy payload must not be stored in audit`);
  }
  assertNoForbiddenShape(entry, context);
  assertNoUnsafeText(entry, context);
}

export function assertOperatorPolicyAuditLogStatusSafe(
  status,
  context = "operator policy audit log status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  if (status.schema !== STATUS_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!OPERATOR_POLICY_AUDIT_LOG_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected audit log status field ${field}`);
    }
  }
  if (!["ready", "attention"].includes(status.health)) {
    throw new ContractError(`${context}: invalid health`);
  }
  const requiredBoundaryPolicy = [
    "counts_only",
    "no_audit_payloads",
    "no_policy_payloads",
    "no_policy_numeric_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_viewer_messages",
    "no_support_message_text",
    "no_candidates",
    "no_commands",
    "no_raw_frames",
    "no_store_paths",
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
  assertNoForbiddenShape(status, context);
  assertNoUnsafeText(status, context);
}

function assertOperatorPolicyAuditPublicSummarySafe(
  summary,
  context = "operator policy audit public summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary must be an object`);
  }
  if (summary.schema !== "iris_operator_policy_audit_public_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!OPERATOR_POLICY_AUDIT_PUBLIC_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected public summary field ${field}`);
    }
  }
  if (summary.policy_payload_hidden !== true) {
    throw new ContractError(`${context}: policy payload must be hidden`);
  }
  assertNoForbiddenShape(summary, context);
  assertNoUnsafeText(summary, context);
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
      assertOperatorPolicyAuditEntrySafe(entry);
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

function countDecisions(entries) {
  const counts = Object.fromEntries([...DECISIONS].map((decision) => [decision, 0]));
  for (const entry of entries) counts[entry.decision] += 1;
  return counts;
}

function latestEntryTime(entries) {
  return entries.reduce((latest, entry) => Math.max(latest, entry.event_at_ms), null);
}

function sanitizeDecision(value) {
  const text = String(value ?? "").trim();
  if (!DECISIONS.has(text)) throw new ContractError("unsupported audit decision");
  return text;
}

function safeAuditActionType(entry) {
  if (entry.decision === "saved") return "operator_policy_saved";
  if (entry.decision === "blocked") return "operator_policy_blocked";
  return "operator_policy_validated";
}

function safeAuditTarget(entry) {
  return sanitizeId(`${entry.setting_group}_${entry.setting_id}`.slice(0, 100));
}

function sanitizeDigest(value) {
  const text = String(value ?? "").trim();
  if (!/^sha256:[a-f0-9]{12,64}$/i.test(text)) {
    throw new ContractError("unsafe policy digest");
  }
  return text;
}

function sanitizeId(value) {
  const text = String(value ?? "").trim();
  if (!/^[a-z0-9][a-z0-9_-]{1,100}$/i.test(text)) {
    throw new ContractError("unsafe operator policy audit id");
  }
  return text;
}

function safeTimestamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

function assertNoForbiddenShape(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenShape(item, context, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(key)) {
      throw new ContractError(`${context}: forbidden field ${path}.${key}`);
    }
    assertNoForbiddenShape(child, context, `${path}.${key}`);
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

function assertNoUnsafeText(value, context, path = "root") {
  if (typeof value === "string") {
    if (UNSAFE_TEXT_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe text at ${path}`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUnsafeText(item, context, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertNoUnsafeText(child, context, `${path}.${key}`);
  }
}
