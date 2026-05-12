import { ContractError } from "../../core/contracts.js";

const COST_GOVERNANCE_FIELDS = new Set([
  "schema",
  "governance_status",
  "usage_count_range",
  "budget_status",
  "budget_range_label",
  "provider_count",
  "raw_value_redacted_count",
  "boundary_policy",
]);

const BOUNDARY_FIELDS = [
  "counts_ranges_status_only",
  "no_api_keys",
  "no_endpoint_values",
  "no_generation_inputs",
  "no_generation_outputs",
  "no_database_values",
  "no_secret_values",
];

const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(api_key|key|endpoint|url|raw_prompt|prompt|raw_response|response|raw_db_value|db_value|secret|token|password)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(api[_-]?key|endpoint|raw[_-]?prompt|raw[_-]?response|raw[_-]?db[_-]?value|secret|token|password|bearer)\b|https?:\/\//i;

export function createAdminCostGovernanceSafeSummary({
  usage = null,
  budget = null,
  providers = [],
} = {}) {
  const usageCount = safeCount(usage?.count ?? usage?.request_count ?? usage?.usage_count);
  const budgetValue = Number(budget?.remaining_ratio ?? budget?.usage_ratio);
  const raw_value_redacted_count =
    countUnsafeFields(usage) + countUnsafeFields(budget) + countUnsafeFields(providers);
  const summary = {
    schema: "iris_admin_cost_governance_safe_summary_v1",
    governance_status: budgetStatus(budgetValue),
    usage_count_range: countRangeLabel(usageCount),
    budget_status: budgetStatus(budgetValue),
    budget_range_label: ratioRangeLabel(budgetValue),
    provider_count: Array.isArray(providers) ? providers.length : providers ? 1 : 0,
    raw_value_redacted_count,
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertAdminCostGovernanceSafeSummary(summary);
  return summary;
}

export function assertAdminCostGovernanceSafeSummary(
  summary,
  context = "admin cost governance safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeStringValues(summary, context);
  if (summary.schema !== "iris_admin_cost_governance_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!COST_GOVERNANCE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  for (const field of ["governance_status", "budget_status"]) {
    if (!["ok", "watch", "limited", "blocked", "unknown"].includes(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!/^(\d+_\d+|over_\d+|unknown)$/.test(summary.usage_count_range)) {
    throw new ContractError(`${context}: invalid usage range`);
  }
  if (!/^(0_25|25_50|50_75|75_90|90_100|unknown)$/.test(summary.budget_range_label)) {
    throw new ContractError(`${context}: invalid budget range`);
  }
  for (const field of ["provider_count", "raw_value_redacted_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertBoundaryPolicy(summary.boundary_policy, context);
}

function safeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.trunc(number);
}

function countRangeLabel(value) {
  if (!Number.isInteger(value)) return "unknown";
  if (value <= 99) return "0_99";
  if (value <= 999) return "100_999";
  if (value <= 9999) return "1000_9999";
  return "over_9999";
}

function ratioRangeLabel(value) {
  if (!Number.isFinite(value) || value < 0) return "unknown";
  const ratio = Math.min(value, 1);
  if (ratio < 0.25) return "0_25";
  if (ratio < 0.5) return "25_50";
  if (ratio < 0.75) return "50_75";
  if (ratio < 0.9) return "75_90";
  return "90_100";
}

function budgetStatus(value) {
  if (!Number.isFinite(value) || value < 0) return "unknown";
  if (value >= 1) return "blocked";
  if (value >= 0.9) return "limited";
  if (value >= 0.75) return "watch";
  return "ok";
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
      throw new ContractError(`${context}: unsafe value exposed`, { path });
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
