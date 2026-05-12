import { ContractError } from "../../core/contracts.js";

const RETENTION_CLASSES = new Set([
  "short_lived",
  "standard",
  "long_term",
  "archive_review",
]);
const POLICY_STATUSES = new Set([
  "active",
  "operator_review_required",
  "disabled",
]);
const SAFE_FIELDS = new Set([
  "schema",
  "policy_status",
  "retention_class_count",
  "archive_class_count",
  "retention_classes",
  "raw_detail_exposed",
  "boundary_policy",
]);
const CLASS_FIELDS = new Set(["class_id", "status", "record_count"]);
const BOUNDARY_FIELDS = [
  "class_status_and_counts_only",
  "no_memory_bodies",
  "no_private_identity_values",
  "no_database_values",
  "no_backup_locations",
  "no_candidates",
  "no_commands",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw_memory|memory_body|private_viewer_id|viewer_id|raw_db_value|db_value|backup_path|raw_backup_path|candidate|command|payload|secret|token)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(raw[_-]?memory|memory[_-]?body|private[_-]?viewer[_-]?id|viewer[_-]?id|raw[_-]?db[_-]?value|db[_-]?value|backup[_-]?path|raw[_-]?backup[_-]?path|candidate|command|payload|secret|token|postgres:\/\/)\b|https?:\/\//i;

export function createPostgresRetentionArchivePolicySummary({
  classes = [],
} = {}) {
  const safeClasses = sanitizeClasses(classes);
  const summary = {
    schema: "iris_postgres_retention_archive_policy_summary_v1",
    policy_status: safeClasses.length > 0 ? "active" : "operator_review_required",
    retention_class_count: safeClasses.length,
    archive_class_count: safeClasses.filter(
      (item) => item.class_id === "archive_review"
    ).length,
    retention_classes: safeClasses,
    raw_detail_exposed: false,
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertPostgresRetentionArchivePolicySummarySafe(summary);
  return summary;
}

export function assertPostgresRetentionArchivePolicySummarySafe(
  summary,
  context = "PostgreSQL retention archive policy summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeStringValues(summary, context);
  if (summary.schema !== "iris_postgres_retention_archive_policy_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!POLICY_STATUSES.has(summary.policy_status)) {
    throw new ContractError(`${context}: invalid policy status`);
  }
  for (const field of ["retention_class_count", "archive_class_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    !Array.isArray(summary.retention_classes) ||
    summary.retention_classes.length !== summary.retention_class_count
  ) {
    throw new ContractError(`${context}: retention class count mismatch`);
  }
  let archiveCount = 0;
  for (const item of summary.retention_classes) {
    assertRetentionClassSafe(item, context);
    if (item.class_id === "archive_review") archiveCount += 1;
  }
  if (summary.archive_class_count !== archiveCount) {
    throw new ContractError(`${context}: archive class count mismatch`);
  }
  if (summary.raw_detail_exposed !== false) {
    throw new ContractError(`${context}: raw detail must not be exposed`);
  }
  assertBoundaryPolicy(summary.boundary_policy, context);
}

function sanitizeClasses(classes) {
  const list = Array.isArray(classes) ? classes : [];
  return list.slice(0, 12).map((item) => ({
    class_id: RETENTION_CLASSES.has(item?.class_id)
      ? item.class_id
      : "standard",
    status: POLICY_STATUSES.has(item?.status)
      ? item.status
      : "operator_review_required",
    record_count: safeCount(item?.record_count),
  }));
}

function assertRetentionClassSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: retention class required`);
  }
  for (const field of Object.keys(item)) {
    if (!CLASS_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected retention class field ${field}`);
    }
  }
  if (!RETENTION_CLASSES.has(item.class_id)) {
    throw new ContractError(`${context}: invalid retention class`);
  }
  if (!POLICY_STATUSES.has(item.status)) {
    throw new ContractError(`${context}: invalid retention class status`);
  }
  if (!Number.isInteger(item.record_count) || item.record_count < 0) {
    throw new ContractError(`${context}: invalid retention class count`);
  }
}

function safeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(BOUNDARY_FIELDS);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNoUnsafeStringValues(value, context, path = "root") {
  if (typeof value === "string") {
    if (UNSAFE_TEXT_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe retention value exposed`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeStringValues(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUnsafeStringValues(child, context, `${path}.${field}`);
  }
}
