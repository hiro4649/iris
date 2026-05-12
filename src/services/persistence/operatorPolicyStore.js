import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { ContractError } from "../../core/contracts.js";
import { classifyStoreReadError } from "./storeStatusErrors.js";

const STORE_SCHEMA = "iris_operator_policy_store_v1";
const APPROVED_RECORD_SCHEMA = "approved_operator_policy_record";
const STATUS_SCHEMA = "iris_json_operator_policy_store_status_v1";

const SETTING_GROUPS = [
  "relationship_delta",
  "memory_retention",
  "gameplay_skill",
  "gameplay_control",
];

const FORBIDDEN_POLICY_FIELDS = new Set([
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
  "memory_candidate",
  "relationship_candidate",
  "candidate",
  "command",
  "endpoint",
  "url",
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
  "viewer_id",
  "display_name",
  "message_text",
  "support_message_text",
  "raw_frame",
  "frame",
  "ocr_text",
  "hidden_relationship_score",
]);

const UNSAFE_POLICY_TEXT_PATTERN =
  /\b(world_command|input_action|approved_game_input_action|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|raw[_-]?frame|ocr[_-]?text|candidate|command)\b|https?:\/\//i;
const JSON_OPERATOR_POLICY_STORE_STATUS_FIELDS = new Set([
  "schema",
  "health",
  "store_available",
  "read_error",
  "error_kind",
  "record_count",
  "latest_committed_at_ms",
  "setting_group_counts",
  "active_setting_count",
  "max_records",
  "retention_enabled",
  "recovery",
  "boundary_policy",
]);
const OPERATOR_POLICY_PUBLIC_SUMMARY_FIELDS = new Set([
  "schema",
  "setting_id",
  "setting_group",
  "policy_version",
  "policy_digest",
  "summary_label",
  "committed_at_ms",
  "policy_values_hidden",
  "boundary_policy",
]);

export function createJsonOperatorPolicyStore(
  filePath,
  { maxRecords = 1000 } = {}
) {
  const retention = {
    maxRecords: clampInteger(maxRecords, 1, 10_000, 1000),
  };
  return {
    filePath,
    listRecords() {
      return readRecordsWithRecovery(filePath).records;
    },
    upsertApproved(record) {
      assertApprovedOperatorPolicyRecordSafe(record, "JSON operator policy store upsert");
      const existing = readRecordsWithRecovery(filePath).records;
      const nextRecords = upsertRecord(existing, record).slice(-retention.maxRecords);
      writeRecords(filePath, nextRecords);
      return sanitizeOperatorPolicyRecordForPublicState(record);
    },
    status() {
      const { records, errorKind, recovery } = readRecordsForStatus(filePath);
      return {
        schema: STATUS_SCHEMA,
        health: errorKind ? "attention" : "ready",
        store_available: !errorKind,
        read_error: Boolean(errorKind),
        error_kind: errorKind,
        record_count: records.length,
        latest_committed_at_ms: latestRecordTime(records),
        setting_group_counts: countSettingGroups(records),
        active_setting_count: activeSettingCount(records),
        max_records: retention.maxRecords,
        retention_enabled: true,
        recovery,
        boundary_policy: {
          counts_only: true,
          no_policy_payloads: true,
          no_policy_numeric_values: true,
          no_secret_values: true,
          no_endpoint_values: true,
          no_viewer_messages: true,
          no_support_message_text: true,
          no_hidden_relationship_scores: true,
          no_candidates: true,
          no_commands: true,
          no_raw_frames: true,
          no_store_paths: true,
          approved_schema_only: true,
        },
      };
    },
  };
}

export function createApprovedOperatorPolicyRecord({
  settingId,
  settingGroup,
  policyVersion,
  policyConfig,
  summaryLabel,
  approvedByOperator = true,
  committedAtMs = Date.now(),
} = {}) {
  const safeConfig = clonePolicyConfig(policyConfig);
  const record = {
    schema: APPROVED_RECORD_SCHEMA,
    approved: approvedByOperator === true,
    setting_id: sanitizePolicyId(settingId),
    setting_group: sanitizeSettingGroup(settingGroup),
    policy_version: sanitizePolicyId(policyVersion ?? "v1"),
    policy_digest: digestPolicyConfig(safeConfig),
    policy_config: safeConfig,
    summary_label: sanitizePolicyLabel(summaryLabel ?? "operator_policy_configured"),
    committed_at_ms: safeTimestamp(committedAtMs),
  };
  assertApprovedOperatorPolicyRecordSafe(record);
  return record;
}

export function sanitizeOperatorPolicyRecordForPublicState(record) {
  assertApprovedOperatorPolicyRecordSafe(record, "operator policy public summary");
  const publicRecord = {
    schema: "operator_policy_public_summary_v1",
    setting_id: record.setting_id,
    setting_group: record.setting_group,
    policy_version: record.policy_version,
    policy_digest: record.policy_digest,
    summary_label: record.summary_label,
    committed_at_ms: record.committed_at_ms,
    policy_values_hidden: true,
    boundary_policy: {
      no_policy_payloads: true,
      no_policy_numeric_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_viewer_messages: true,
      no_support_message_text: true,
      no_hidden_relationship_scores: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
    },
  };
  assertOperatorPolicyPublicSummarySafe(publicRecord);
  return publicRecord;
}

export function assertApprovedOperatorPolicyRecordSafe(
  record,
  context = "approved operator policy record"
) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new ContractError(`${context}: record must be an object`);
  }
  if (record.schema !== APPROVED_RECORD_SCHEMA || record.approved !== true) {
    throw new ContractError(`${context}: approved schema required`);
  }
  for (const field of [
    "setting_id",
    "setting_group",
    "policy_version",
    "policy_digest",
    "summary_label",
  ]) {
    if (!record[field] || typeof record[field] !== "string") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!SETTING_GROUPS.includes(record.setting_group)) {
    throw new ContractError(`${context}: invalid setting group`);
  }
  if (!Number.isSafeInteger(record.committed_at_ms) || record.committed_at_ms < 0) {
    throw new ContractError(`${context}: invalid committed timestamp`);
  }
  if (!record.policy_config || typeof record.policy_config !== "object") {
    throw new ContractError(`${context}: policy config required`);
  }
  assertNoForbiddenPolicyShape(record, context);
  assertNoUnsafePolicyText(record, context);
}

export function assertJsonOperatorPolicyStoreStatusSafe(
  status,
  context = "operator policy store status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  if (status.schema !== STATUS_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!JSON_OPERATOR_POLICY_STORE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected store status field ${field}`);
    }
  }
  if (!["ready", "attention"].includes(status.health)) {
    throw new ContractError(`${context}: invalid health`);
  }
  const requiredBoundaryPolicy = [
    "counts_only",
    "no_policy_payloads",
    "no_policy_numeric_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_viewer_messages",
    "no_support_message_text",
    "no_hidden_relationship_scores",
    "no_candidates",
    "no_commands",
    "no_raw_frames",
    "no_store_paths",
    "approved_schema_only",
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
  assertNoForbiddenPolicyShape(status, context);
  assertNoUnsafePolicyText(status, context);
}

export function assertOperatorPolicyPublicSummarySafe(
  summary,
  context = "operator policy public summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary must be an object`);
  }
  if (summary.schema !== "operator_policy_public_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!OPERATOR_POLICY_PUBLIC_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected public summary field ${field}`);
    }
  }
  if (summary.policy_values_hidden !== true) {
    throw new ContractError(`${context}: policy values must be hidden`);
  }
  assertNoForbiddenPolicyShape(summary, context);
  assertNoUnsafePolicyText(summary, context);
}

function upsertRecord(records, record) {
  const withoutSame = records.filter(
    (existing) =>
      existing.setting_id !== record.setting_id ||
      existing.policy_version !== record.policy_version
  );
  return [...withoutSame, record];
}

function readRecordsWithRecovery(filePath) {
  if (!existsSync(filePath)) return { records: [], recovery: "not_needed" };
  try {
    return { records: parseRecords(readFileSync(filePath, "utf8")), recovery: "not_needed" };
  } catch {
    const backupPath = `${filePath}.bak`;
    if (!existsSync(backupPath)) return { records: [], recovery: "failed" };
    try {
      return { records: parseRecords(readFileSync(backupPath, "utf8")), recovery: "backup" };
    } catch {
      return { records: [], recovery: "failed" };
    }
  }
}

function readRecordsForStatus(filePath) {
  if (!existsSync(filePath)) {
    return { records: [], errorKind: null, recovery: "not_needed" };
  }
  try {
    return {
      records: parseRecords(readFileSync(filePath, "utf8")),
      errorKind: null,
      recovery: "not_needed",
    };
  } catch (error) {
    return {
      records: readRecordsWithRecovery(filePath).records,
      errorKind: classifyStoreReadError(error),
      recovery: "backup_or_empty",
    };
  }
}

function parseRecords(raw) {
  const parsed = JSON.parse(raw);
  if (parsed?.schema !== STORE_SCHEMA || !Array.isArray(parsed.records)) return [];
  return parsed.records.filter((record) => {
    try {
      assertApprovedOperatorPolicyRecordSafe(record);
      return true;
    } catch {
      return false;
    }
  });
}

function writeRecords(filePath, records) {
  mkdirSync(dirname(filePath), { recursive: true });
  const payload = JSON.stringify({ schema: STORE_SCHEMA, records }, null, 2);
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmpPath, payload);
  renameSync(tmpPath, filePath);
  writeFileSync(`${filePath}.bak`, payload);
}

function clonePolicyConfig(value) {
  const cloned = JSON.parse(JSON.stringify(value ?? {}));
  if (!cloned || typeof cloned !== "object" || Array.isArray(cloned)) {
    throw new ContractError("operator policy config must be an object");
  }
  assertNoForbiddenPolicyShape(cloned, "operator policy config");
  assertNoUnsafePolicyText(cloned, "operator policy config");
  return cloned;
}

function digestPolicyConfig(config) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(config))
    .digest("hex")
    .slice(0, 24)}`;
}

function countSettingGroups(records) {
  const counts = Object.fromEntries(SETTING_GROUPS.map((group) => [group, 0]));
  for (const record of records) {
    if (Object.hasOwn(counts, record.setting_group)) counts[record.setting_group] += 1;
  }
  return counts;
}

function activeSettingCount(records) {
  return new Set(records.map((record) => record.setting_id)).size;
}

function latestRecordTime(records) {
  return records.reduce(
    (latest, record) => Math.max(latest, safeTimestamp(record.committed_at_ms)),
    null
  );
}

function sanitizePolicyId(value) {
  const text = String(value ?? "").trim();
  if (!/^[a-z0-9][a-z0-9_-]{1,80}$/i.test(text)) {
    throw new ContractError("unsafe operator policy id");
  }
  return text;
}

function sanitizeSettingGroup(value) {
  const text = sanitizePolicyId(value);
  if (!SETTING_GROUPS.includes(text)) {
    throw new ContractError("unsupported operator policy setting group");
  }
  return text;
}

function sanitizePolicyLabel(value) {
  const text = String(value ?? "").trim();
  if (!/^[a-z0-9][a-z0-9 _-]{1,100}$/i.test(text)) {
    throw new ContractError("unsafe operator policy label");
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

function assertNoForbiddenPolicyShape(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenPolicyShape(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_POLICY_FIELDS.has(key)) {
      throw new ContractError(`${context}: forbidden field ${path}.${key}`);
    }
    assertNoForbiddenPolicyShape(child, context, `${path}.${key}`);
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

function assertNoUnsafePolicyText(value, context, path = "root") {
  if (typeof value === "string") {
    if (UNSAFE_POLICY_TEXT_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe text at ${path}`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafePolicyText(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertNoUnsafePolicyText(child, context, `${path}.${key}`);
  }
}
