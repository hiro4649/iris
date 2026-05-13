import { ContractError } from "../../core/contracts.js";

const YOUTUBE_E2E_COMPONENTS = [
  "ingest_to_phase01",
  "support_event_separation",
  "moderation_precheck",
  "duplicate_idempotency",
  "stale_live_chat_guard",
  "secret_redaction",
  "relay_fixture",
  "failure_summary",
  "public_leak_pack",
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
  "no_raw_comment_text",
  "no_raw_support_text",
  "no_api_response_body",
  "no_private_channel_data",
  "no_secret_values",
  "no_candidates",
  "no_commands",
]);
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw|payload|candidate|command|token|secret|endpoint|url|api_response|comment_text|support_text|private_channel|private_viewer)(?:$|_)/iu;
const UNSAFE_VALUE_PATTERN =
  /\b(raw[_ -]?(?:comment|support|payload)|api[_ -]?response|response[_ -]?body|private[_ -]?channel|private[_ -]?viewer|oauth|refresh[_ -]?token|access[_ -]?token|api[_ -]?key|secret|endpoint|url|candidate|command|world[_ -]?command|input[_ -]?action[_ -]?candidate)\b|https?:\/\//iu;

export function createYouTubeIngestE2ECompletionReviewSummary({
  componentStatuses = {},
  residualRiskLabel = "none",
} = {}) {
  const statuses = YOUTUBE_E2E_COMPONENTS.map((component) => ({
    component,
    status: safeStatus(componentStatuses[component]),
  }));
  const passCount = statuses.filter((item) => item.status === "pass").length;
  const attentionCount = statuses.filter((item) => item.status === "attention").length;
  const blockedCount = statuses.filter((item) => item.status === "blocked").length;
  const summary = {
    schema: "iris_youtube_ingest_e2e_completion_review_summary_v1",
    completion_status: blockedCount > 0 ? "blocked" : "ready_for_completion_review",
    completion_review_label: "youtube_ingest_e2e",
    component_count: YOUTUBE_E2E_COMPONENTS.length,
    completed_components: [...YOUTUBE_E2E_COMPONENTS],
    component_statuses: statuses,
    pass_count: passCount,
    attention_count: attentionCount,
    blocked_count: blockedCount,
    residual_risk_label: safeRiskLabel(residualRiskLabel),
    boundary_policy: {
      safe_status_count_only: true,
      no_raw_comment_text: true,
      no_raw_support_text: true,
      no_api_response_body: true,
      no_private_channel_data: true,
      no_secret_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertYouTubeIngestE2ECompletionReviewSummarySafe(summary);
  return summary;
}

export function assertYouTubeIngestE2ECompletionReviewSummarySafe(
  summary,
  context = "YouTube ingest E2E completion review summary"
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
    summary.schema !== "iris_youtube_ingest_e2e_completion_review_summary_v1" ||
    summary.completion_review_label !== "youtube_ingest_e2e" ||
    summary.component_count !== YOUTUBE_E2E_COMPONENTS.length ||
    !SAFE_COMPLETION_STATUSES.has(summary.completion_status)
  ) {
    throw new ContractError(`${context}: invalid completion summary`);
  }
  assertExactComponents(summary.completed_components, context);
  assertComponentStatusesSafe(summary.component_statuses, context);
  if (
    !Number.isInteger(summary.pass_count) ||
    !Number.isInteger(summary.attention_count) ||
    !Number.isInteger(summary.blocked_count) ||
    summary.pass_count < 0 ||
    summary.attention_count < 0 ||
    summary.blocked_count < 0
  ) {
    throw new ContractError(`${context}: invalid status counts`);
  }
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
    components.length !== YOUTUBE_E2E_COMPONENTS.length ||
    components.some((component, index) => component !== YOUTUBE_E2E_COMPONENTS[index])
  ) {
    throw new ContractError(`${context}: invalid completed components`);
  }
}

function assertComponentStatusesSafe(statuses, context) {
  if (!Array.isArray(statuses) || statuses.length !== YOUTUBE_E2E_COMPONENTS.length) {
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
    if (item.component !== YOUTUBE_E2E_COMPONENTS[index]) {
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
