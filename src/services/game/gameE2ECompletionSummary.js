import { ContractError } from "../../core/contracts.js";

const GAME_E2E_COMPONENTS = [
  "game_adapter",
  "game_observation",
  "game_commentary",
  "game_input",
  "game_embodiment",
];

const SAFE_STATUSES = new Set(["pass", "attention", "blocked", "not_run"]);
const SAFE_COMPLETION_STATUSES = new Set(["ready_for_completion_review", "blocked"]);
const SAFE_RISK_LABELS = new Set(["none", "runtime_waiting", "operator_attention", "blocked"]);
const SUMMARY_FIELDS = new Set([
  "schema",
  "completion_status",
  "completion_review_label",
  "component_count",
  "completed_components",
  "component_statuses",
  "pass_count",
  "attention_count",
  "blocked_count",
  "residual_risk_label",
  "boundary_policy",
]);
const COMPONENT_STATUS_FIELDS = new Set(["component", "status"]);
const BOUNDARY_FIELDS = new Set([
  "safe_summary_only",
  "no_raw_observation",
  "no_action_candidate_payload",
  "no_approved_action_payload",
  "no_adapter_payload",
  "no_commands",
  "no_public_raw_screen",
]);
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw|payload|candidate|approved_game_input_action|input_action_candidate|world_command|command|endpoint|token|secret|screen|frame)(?:$|_)/i;
const UNSAFE_VALUE_PATTERN =
  /\b(raw[_-]?(?:screen|frame|payload|command)|input_action_candidate|approved_game_input_action|world_command|os_command|endpoint|token|secret|authorization|payload)\b|https?:\/\//i;

export function createGameE2ECompletionReviewSummary({
  componentStatuses = {},
  residualRiskLabel = "none",
} = {}) {
  const statuses = GAME_E2E_COMPONENTS.map((component) => ({
    component,
    status: safeStatus(componentStatuses[component]),
  }));
  const blockedCount = statuses.filter((item) => item.status === "blocked").length;
  const attentionCount = statuses.filter((item) => item.status === "attention").length;
  const passCount = statuses.filter((item) => item.status === "pass").length;
  const summary = {
    schema: "iris_game_e2e_completion_review_summary_v1",
    completion_status:
      blockedCount > 0 ? "blocked" : "ready_for_completion_review",
    completion_review_label: "game_adapter_observation_commentary_input_embodiment_e2e",
    component_count: GAME_E2E_COMPONENTS.length,
    completed_components: [...GAME_E2E_COMPONENTS],
    component_statuses: statuses,
    pass_count: passCount,
    attention_count: attentionCount,
    blocked_count: blockedCount,
    residual_risk_label: safeRiskLabel(residualRiskLabel),
    boundary_policy: {
      safe_summary_only: true,
      no_raw_observation: true,
      no_action_candidate_payload: true,
      no_approved_action_payload: true,
      no_adapter_payload: true,
      no_commands: true,
      no_public_raw_screen: true,
    },
  };
  assertGameE2ECompletionReviewSummarySafe(summary);
  return summary;
}

export function assertGameE2ECompletionReviewSummarySafe(
  summary,
  context = "game E2E completion review summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (!SUMMARY_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (
    summary.schema !== "iris_game_e2e_completion_review_summary_v1" ||
    summary.completion_review_label !==
      "game_adapter_observation_commentary_input_embodiment_e2e" ||
    summary.component_count !== GAME_E2E_COMPONENTS.length ||
    !SAFE_COMPLETION_STATUSES.has(summary.completion_status)
  ) {
    throw new ContractError(`${context}: invalid completion summary`);
  }
  assertExactComponents(summary.completed_components, context);
  assertComponentStatusesSafe(summary.component_statuses, context);
  if (!Number.isInteger(summary.pass_count) || summary.pass_count < 0) {
    throw new ContractError(`${context}: invalid pass count`);
  }
  if (!Number.isInteger(summary.attention_count) || summary.attention_count < 0) {
    throw new ContractError(`${context}: invalid attention count`);
  }
  if (!Number.isInteger(summary.blocked_count) || summary.blocked_count < 0) {
    throw new ContractError(`${context}: invalid blocked count`);
  }
  if (!SAFE_RISK_LABELS.has(summary.residual_risk_label)) {
    throw new ContractError(`${context}: invalid residual risk label`);
  }
  assertBoundaryPolicySafe(summary.boundary_policy, context);
  assertNoUnsafeSummaryMaterial(summary, context, new WeakSet());
}

function assertExactComponents(components, context) {
  if (
    !Array.isArray(components) ||
    components.length !== GAME_E2E_COMPONENTS.length ||
    components.some((component, index) => component !== GAME_E2E_COMPONENTS[index])
  ) {
    throw new ContractError(`${context}: invalid completed components`);
  }
}

function assertComponentStatusesSafe(statuses, context) {
  if (!Array.isArray(statuses) || statuses.length !== GAME_E2E_COMPONENTS.length) {
    throw new ContractError(`${context}: invalid component statuses`);
  }
  statuses.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ContractError(`${context}: invalid component status`);
    }
    for (const field of Object.keys(item)) {
      if (!COMPONENT_STATUS_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
        throw new ContractError(`${context}: unsafe component status field`, { field });
      }
    }
    if (item.component !== GAME_E2E_COMPONENTS[index]) {
      throw new ContractError(`${context}: component order mismatch`);
    }
    if (!SAFE_STATUSES.has(item.status)) {
      throw new ContractError(`${context}: invalid component status label`);
    }
  });
}

function assertBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: missing boundary`, { field });
    }
  }
  for (const field of Object.keys(policy)) {
    if (!BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`, { field });
    }
  }
}

function safeStatus(value) {
  const status = String(value ?? "pass").trim().toLowerCase();
  return SAFE_STATUSES.has(status) ? status : "attention";
}

function safeRiskLabel(value) {
  const label = String(value ?? "none").trim().toLowerCase();
  return SAFE_RISK_LABELS.has(label) ? label : "operator_attention";
}

function assertNoUnsafeSummaryMaterial(value, context, seen) {
  if (typeof value === "string") {
    if (UNSAFE_VALUE_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe summary value`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => assertNoUnsafeSummaryMaterial(item, context, seen));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (field === "boundary_policy") continue;
    if (UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unsafe field`, { field });
    }
    assertNoUnsafeSummaryMaterial(child, context, seen);
  }
}
