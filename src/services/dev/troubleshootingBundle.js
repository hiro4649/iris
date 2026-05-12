import { ContractError } from "../../core/contracts.js";

const SAFE_BUNDLE_FIELDS = new Set([
  "schema",
  "bundle_status",
  "component_count",
  "redacted_item_count",
  "included_safe_labels",
  "boundary_policy",
]);
const SAFE_BOUNDARY_FIELDS = [
  "redacted_safe_summary_only",
  "safe_labels_and_counts_only",
  "sensitive_values_excluded",
  "network_location_values_excluded",
  "raw_body_values_excluded",
  "proposal_values_excluded",
  "operation_values_excluded",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(secret|token|endpoint|url|raw_payload|payload|candidate|command|world_command|input_action_candidate|approved_game_input_action)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(secret|token|authorization|bearer|api[_-]?key|endpoint|raw[_-]?payload|payload|candidate|command|world[_-]?command|input[_-]?action[_-]?candidate|approved[_-]?game[_-]?input[_-]?action)\b|https?:\/\//i;

export function createRedactedTroubleshootingBundleGate({ items = [] } = {}) {
  const safeItems = Array.isArray(items) ? items : [];
  const summary = {
    schema: "iris_redacted_troubleshooting_bundle_gate_v1",
    bundle_status: "redacted",
    component_count: safeItems.length,
    redacted_item_count: countUnsafeItems(safeItems),
    included_safe_labels: safeItems.map((item) => safeLabel(item?.component ?? item?.label)).slice(0, 20),
    boundary_policy: Object.fromEntries(SAFE_BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertRedactedTroubleshootingBundleGateSafe(summary);
  return summary;
}

export function assertRedactedTroubleshootingBundleGateSafe(
  summary,
  context = "redacted troubleshooting bundle gate"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_redacted_troubleshooting_bundle_gate_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_BUNDLE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.bundle_status !== "redacted") {
    throw new ContractError(`${context}: invalid bundle status`);
  }
  for (const field of ["component_count", "redacted_item_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid count`, { field });
    }
  }
  if (
    !Array.isArray(summary.included_safe_labels) ||
    summary.included_safe_labels.some((label) => label !== safeLabel(label))
  ) {
    throw new ContractError(`${context}: invalid safe labels`);
  }
  assertBoundaryPolicy(summary.boundary_policy, context);
}

function countUnsafeItems(items) {
  return items.filter((item) => containsUnsafeField(item) || containsUnsafeText(item)).length;
}

function containsUnsafeField(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsUnsafeField);
  return Object.entries(value).some(
    ([field, child]) => UNSAFE_FIELD_PATTERN.test(field) || containsUnsafeField(child)
  );
}

function containsUnsafeText(value) {
  if (typeof value === "string") return UNSAFE_TEXT_PATTERN.test(value);
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsUnsafeText);
  return Object.values(value).some(containsUnsafeText);
}

function safeLabel(value) {
  const label = String(value ?? "component")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return label && !UNSAFE_TEXT_PATTERN.test(label) ? label : "component";
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(SAFE_BOUNDARY_FIELDS);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of SAFE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
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
