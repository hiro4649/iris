import { ContractError } from "../../core/contracts.js";

const NOTIFICATION_FIELDS = new Set([
  "schema",
  "notification_status",
  "notification_count",
  "attention_count",
  "safe_labels",
  "boundary_policy",
]);

const BOUNDARY_FIELDS = [
  "safe_labels_and_counts_only",
  "no_viewer_message_bodies",
  "no_donation_message_bodies",
  "no_pending_payloads",
  "no_action_payloads",
  "no_private_credentials",
];

const SAFE_LABELS = new Set([
  "system_ready",
  "operator_attention_required",
  "review_required",
  "safety_notice",
  "configuration_needed",
  "blocked",
]);

const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw_viewer_text|viewer_text|raw_comment|support_text|raw_support|candidate|candidate_payload|command|world_command|secret|token|password|endpoint|payload)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(raw[_-]?viewer|viewer[_-]?text|raw[_-]?comment|support[_-]?text|raw[_-]?support|candidate|command|world[_-]?command|secret|token|password|endpoint|payload|bearer|api[_-]?key)\b|https?:\/\//i;

export function createAdminNotificationSafeSummary({ notifications = [] } = {}) {
  const list = Array.isArray(notifications) ? notifications : [];
  const safeLabels = list.map((item) => safeNotificationLabel(item)).slice(0, 12);
  const attentionCount = safeLabels.filter((label) =>
    ["operator_attention_required", "review_required", "safety_notice", "blocked"].includes(label)
  ).length;
  const summary = {
    schema: "iris_admin_notification_safe_summary_v1",
    notification_status:
      attentionCount > 0 ? "operator_attention_required" : "system_ready",
    notification_count: list.length,
    attention_count: attentionCount,
    safe_labels: safeLabels,
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertAdminNotificationSafeSummary(summary);
  return summary;
}

export function assertAdminNotificationSafeSummary(
  summary,
  context = "admin notification safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeStringValues(summary, context);
  if (summary.schema !== "iris_admin_notification_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!NOTIFICATION_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!SAFE_LABELS.has(summary.notification_status)) {
    throw new ContractError(`${context}: invalid notification status`);
  }
  for (const field of ["notification_count", "attention_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!Array.isArray(summary.safe_labels)) {
    throw new ContractError(`${context}: safe labels required`);
  }
  for (const label of summary.safe_labels) {
    if (!SAFE_LABELS.has(label)) {
      throw new ContractError(`${context}: invalid safe label`);
    }
  }
  if (summary.attention_count > summary.notification_count) {
    throw new ContractError(`${context}: attention count mismatch`);
  }
  assertBoundaryPolicy(summary.boundary_policy, context);
}

function safeNotificationLabel(item) {
  const label = typeof item === "string" ? item : item?.safe_label ?? item?.status;
  return SAFE_LABELS.has(label) ? label : "operator_attention_required";
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
      throw new ContractError(`${context}: unsafe notification value exposed`, { path });
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
