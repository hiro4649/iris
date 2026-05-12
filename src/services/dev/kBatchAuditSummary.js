import { ContractError } from "../../core/contracts.js";

const SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "batch_label",
  "audit_status",
  "checked_count",
  "pass_count",
  "fail_count",
  "safe_labels",
  "boundary_policy",
]);
const SAFE_FILE_DELTA_SUMMARY_FIELDS = new Set([
  "schema",
  "summary_status",
  "file_count",
  "changed_file_labels",
  "boundary_policy",
]);
const SAFE_REVIEW_HOOK_FIELDS = new Set([
  "schema",
  "status",
  "batch_label",
  "review_recommended",
  "next_step_label",
  "boundary_policy",
]);
const BOUNDARY_FIELDS = [
  "safe_labels_only",
  "counts_only",
  "source_delta_values_excluded",
  "source_trace_values_excluded",
  "sensitive_values_excluded",
  "personal_values_excluded",
  "proposal_values_excluded",
  "operation_values_excluded",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw_diff|diff|raw_log|log|secret|token|private_data|private_viewer|raw_payload|candidate|command|world_command)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(raw[_-]?diff|raw[_-]?log|authorization|bearer|api[_-]?key|private[_-]?data|private[_-]?viewer|raw[_-]?payload|candidate|command|world[_-]?command)\b|(?:^|[_-])(secret|token)(?:$|[_-])|https?:\/\//i;

export function createKBatchAuditSummary({ batchLabel = "k_batch", items = [] } = {}) {
  const entries = Array.isArray(items) ? items : [];
  const passCount = entries.filter((item) => normalizeStatus(item?.status) === "pass").length;
  const failCount = entries.filter((item) => normalizeStatus(item?.status) === "fail").length;
  const summary = {
    schema: "iris_k_batch_audit_summary_v1",
    batch_label: safeLabel(batchLabel),
    audit_status: failCount > 0 ? "attention" : "pass",
    checked_count: entries.length,
    pass_count: passCount,
    fail_count: failCount,
    safe_labels: entries.map((item) => safeLabel(item?.label ?? item?.k ?? item?.status)).slice(0, 20),
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertKBatchAuditSummarySafe(summary);
  return summary;
}

export function createGitDiffStatSafeSummary({ files = [], maxFiles = 50 } = {}) {
  const entries = Array.isArray(files) ? files : [];
  const limit = Number.isInteger(maxFiles) && maxFiles > 0 ? Math.min(maxFiles, 100) : 50;
  const summary = {
    schema: "iris_git_file_delta_summary_v1",
    summary_status: entries.length > 0 ? "changed" : "clean",
    file_count: entries.length,
    changed_file_labels: entries.slice(0, limit).map((item) => safeFileLabel(item)),
    boundary_policy: {
      safe_file_labels_only: true,
      counts_only: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      large_text_excluded: true,
    },
  };
  assertGitDiffStatSafeSummary(summary);
  return summary;
}

export function createK301K400ReviewHook({ batchLabel = "K301-K400" } = {}) {
  const summary = {
    schema: "iris_k301_k400_review_hook_v1",
    status: "review_recommended",
    batch_label: safeLabel(batchLabel),
    review_recommended: true,
    next_step_label: "k301_k400_safe_review",
    boundary_policy: {
      safe_status_only: true,
      code_change_not_required: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      personal_values_excluded: true,
      operation_values_excluded: true,
    },
  };
  assertK301K400ReviewHookSafe(summary);
  return summary;
}

export function assertKBatchAuditSummarySafe(summary, context = "K-batch audit summary") {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_audit_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_SUMMARY_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["pass", "attention"].includes(summary.audit_status)) {
    throw new ContractError(`${context}: invalid audit status`);
  }
  for (const field of ["checked_count", "pass_count", "fail_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid count`, { field });
    }
  }
  if (summary.pass_count + summary.fail_count > summary.checked_count) {
    throw new ContractError(`${context}: count mismatch`);
  }
  if (!Array.isArray(summary.safe_labels) || summary.safe_labels.some((item) => item !== safeLabel(item))) {
    throw new ContractError(`${context}: invalid safe labels`);
  }
  assertBoundaryPolicy(summary.boundary_policy, context);
}

export function assertGitDiffStatSafeSummary(summary, context = "Git file delta summary") {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_git_file_delta_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_FILE_DELTA_SUMMARY_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["changed", "clean"].includes(summary.summary_status)) {
    throw new ContractError(`${context}: invalid status`);
  }
  if (!Number.isInteger(summary.file_count) || summary.file_count < 0) {
    throw new ContractError(`${context}: invalid file count`);
  }
  if (
    !Array.isArray(summary.changed_file_labels) ||
    summary.changed_file_labels.some((item) => item !== safeLabel(item))
  ) {
    throw new ContractError(`${context}: invalid file labels`);
  }
  assertFileDeltaBoundaryPolicy(summary.boundary_policy, context);
}

export function assertK301K400ReviewHookSafe(summary, context = "K301-K400 review hook") {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k301_k400_review_hook_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_REVIEW_HOOK_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.status !== "review_recommended" || summary.review_recommended !== true) {
    throw new ContractError(`${context}: invalid review status`);
  }
  if (summary.batch_label !== safeLabel(summary.batch_label)) {
    throw new ContractError(`${context}: invalid batch label`);
  }
  if (summary.next_step_label !== safeLabel(summary.next_step_label)) {
    throw new ContractError(`${context}: invalid next step label`);
  }
  assertReviewHookBoundaryPolicy(summary.boundary_policy, context);
}

function normalizeStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (status === "pass" || status === "ok") return "pass";
  if (status === "fail" || status === "ng") return "fail";
  return "unknown";
}

function safeLabel(value) {
  const label = String(value ?? "item")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return label && !UNSAFE_TEXT_PATTERN.test(label) ? label : "item";
}

function safeFileLabel(value) {
  const source = typeof value === "string" ? value : value?.path ?? value?.file ?? value?.name;
  const leaf = String(source ?? "file").split(/[\\/]/).filter(Boolean).pop() ?? "file";
  const label = safeLabel(leaf);
  return label === "item" ? "file" : label;
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

function assertFileDeltaBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    safe_file_labels_only: true,
    counts_only: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    large_text_excluded: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertReviewHookBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    safe_status_only: true,
    code_change_not_required: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    personal_values_excluded: true,
    operation_values_excluded: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNoUnsafeValues(value, context, path = "root") {
  if (typeof value === "string") {
    if (UNSAFE_TEXT_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe value exposed`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUnsafeValues(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unsafe field exposed`, { field, path });
    }
    assertNoUnsafeValues(child, context, `${path}.${field}`);
  }
}
