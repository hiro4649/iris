import { ContractError } from "../../core/contracts.js";

const SAFE_EXPORT_FIELDS = new Set([
  "schema",
  "export_status",
  "item_count",
  "redacted_field_count",
  "safe_label",
  "boundary_policy",
]);

const BOUNDARY_FIELDS = [
  "safe_summary_only",
  "counts_and_status_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_oauth_credentials",
  "no_candidate_payloads",
  "no_voice_bodies",
  "no_model_locations",
  "no_frame_bodies",
  "no_job_bodies",
];

const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(secret|endpoint|oauth|token|access_token|refresh_token|raw_candidate|candidate_payload|raw_voice|voice_sample|model_path|internal_model_path|dataset_path|raw_frame|raw_job|job_payload)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(secret|endpoint|oauth|access[_-]?token|refresh[_-]?token|bearer|api[_-]?key|raw[_-]?candidate|candidate[_-]?payload|raw[_-]?voice|voice[_-]?sample|model[_-]?path|internal[_-]?model[_-]?path|dataset[_-]?path|raw[_-]?frame|raw[_-]?job|job[_-]?payload)\b|https?:\/\//i;

export function createAdminBackupExportRedaction({
  backup = null,
  exportStatus = "ready",
} = {}) {
  const itemCount = countItems(backup);
  const redactedFieldCount = countUnsafeFields(backup);
  const summary = {
    schema: "iris_admin_backup_export_redaction_v1",
    export_status: exportStatus === "blocked" ? "blocked" : "ready",
    item_count: itemCount,
    redacted_field_count: redactedFieldCount,
    safe_label: redactedFieldCount > 0 ? "unsafe_fields_redacted" : "safe_export_ready",
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertAdminBackupExportRedactionSafe(summary);
  return summary;
}

export function assertAdminBackupExportRedactionSafe(
  summary,
  context = "admin backup export redaction"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeStringValues(summary, context);
  if (summary.schema !== "iris_admin_backup_export_redaction_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_EXPORT_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["ready", "blocked"].includes(summary.export_status)) {
    throw new ContractError(`${context}: invalid export status`);
  }
  for (const field of ["item_count", "redacted_field_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!["safe_export_ready", "unsafe_fields_redacted"].includes(summary.safe_label)) {
    throw new ContractError(`${context}: invalid safe label`);
  }
  assertBoundaryPolicy(summary.boundary_policy, context);
}

function countItems(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return value == null ? 0 : 1;
}

function countUnsafeFields(value) {
  if (!value || typeof value !== "object") return 0;
  if (Array.isArray(value)) {
    return value.reduce((count, item) => count + countUnsafeFields(item), 0);
  }
  return Object.entries(value).reduce((count, [field, child]) => {
    const self = UNSAFE_FIELD_PATTERN.test(field) ? 1 : 0;
    return count + self + countUnsafeFields(child);
  }, 0);
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
      throw new ContractError(`${context}: unsafe export value exposed`, { path });
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
