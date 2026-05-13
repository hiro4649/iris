import { ContractError } from "../../core/contracts.js";

const RELATIONSHIP_MEMORY_E2E_COMPONENTS = [
  "relationship",
  "memory",
  "moderation",
  "donation",
  "community",
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
  "safe_status_count_only",
  "no_raw_memory",
  "no_raw_support",
  "no_private_viewer_id",
  "no_hidden_scores",
  "no_internal_stage",
  "no_raw_payloads",
  "no_commands",
]);
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw|payload|command|token|secret|endpoint|url|private_viewer|private_id|hidden_score|internal_stage|relation_score|relationship_score)(?:$|_)/iu;
const UNSAFE_VALUE_PATTERN =
  /\b(raw[_ -]?(?:memory|support|payload)|private[_ -]?(?:viewer[_ -]?)?id|private[-_ ]?viewer[-_ ][a-z0-9-]+|hidden[_ -]?score|hidden[_ -]?rank|internal[_ -]?relationship[_ -]?stage|relation[_ -]?score|relationship[_ -]?score|support[_ -]?message|endpoint|token|secret|command|world[_ -]?command)\b|https?:\/\//iu;

export function createRelationshipMemoryE2ECompletionReviewSummary({
  componentStatuses = {},
  residualRiskLabel = "none",
} = {}) {
  const statuses = RELATIONSHIP_MEMORY_E2E_COMPONENTS.map((component) => ({
    component,
    status: safeStatus(componentStatuses[component]),
  }));
  const passCount = statuses.filter((item) => item.status === "pass").length;
  const attentionCount = statuses.filter((item) => item.status === "attention").length;
  const blockedCount = statuses.filter((item) => item.status === "blocked").length;
  const summary = {
    schema: "iris_relationship_memory_e2e_completion_review_summary_v1",
    completion_status: blockedCount > 0 ? "blocked" : "ready_for_completion_review",
    completion_review_label: "relationship_memory_moderation_donation_community_e2e",
    component_count: RELATIONSHIP_MEMORY_E2E_COMPONENTS.length,
    completed_components: [...RELATIONSHIP_MEMORY_E2E_COMPONENTS],
    component_statuses: statuses,
    pass_count: passCount,
    attention_count: attentionCount,
    blocked_count: blockedCount,
    residual_risk_label: safeRiskLabel(residualRiskLabel),
    boundary_policy: {
      safe_status_count_only: true,
      no_raw_memory: true,
      no_raw_support: true,
      no_private_viewer_id: true,
      no_hidden_scores: true,
      no_internal_stage: true,
      no_raw_payloads: true,
      no_commands: true,
    },
  };
  assertRelationshipMemoryE2ECompletionReviewSummarySafe(summary);
  return summary;
}

export function assertRelationshipMemoryE2ECompletionReviewSummarySafe(
  summary,
  context = "relationship memory E2E completion review summary"
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
    summary.schema !== "iris_relationship_memory_e2e_completion_review_summary_v1" ||
    summary.completion_review_label !== "relationship_memory_moderation_donation_community_e2e" ||
    summary.component_count !== RELATIONSHIP_MEMORY_E2E_COMPONENTS.length ||
    !SAFE_COMPLETION_STATUSES.has(summary.completion_status)
  ) {
    throw new ContractError(`${context}: invalid completion summary`);
  }
  assertExactComponents(summary.completed_components, context);
  assertComponentStatusesSafe(summary.component_statuses, context);
  if (
    summary.pass_count !== summary.component_statuses.filter((item) => item.status === "pass").length ||
    summary.attention_count !==
      summary.component_statuses.filter((item) => item.status === "attention").length ||
    summary.blocked_count !==
      summary.component_statuses.filter((item) => item.status === "blocked").length
  ) {
    throw new ContractError(`${context}: status count mismatch`);
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
    components.length !== RELATIONSHIP_MEMORY_E2E_COMPONENTS.length ||
    components.some((component, index) => component !== RELATIONSHIP_MEMORY_E2E_COMPONENTS[index])
  ) {
    throw new ContractError(`${context}: invalid completed components`);
  }
}

function assertComponentStatusesSafe(statuses, context) {
  if (!Array.isArray(statuses) || statuses.length !== RELATIONSHIP_MEMORY_E2E_COMPONENTS.length) {
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
    if (item.component !== RELATIONSHIP_MEMORY_E2E_COMPONENTS[index]) {
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
    if (!BOUNDARY_FIELDS.has(field) && UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unsafe summary field`, { field });
    }
    assertNoUnsafeSummaryMaterial(child, context, seen);
  }
}
