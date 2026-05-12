import { ContractError } from "../../core/contracts.js";

const TRANSPARENCY_FIELDS = new Set([
  "schema",
  "transparency_status",
  "ai_disclosure_label",
  "operator_disclosure_label",
  "memory_disclosure_label",
  "sponsor_disclosure_label",
  "public_summary",
  "boundary_policy",
]);

const BOUNDARY_FIELDS = [
  "short_public_summary_only",
  "ai_identity_disclosed",
  "operator_role_disclosed",
  "operator_review_status_label_only",
  "no_operator_private_notes",
  "memory_use_disclosed",
  "memory_policy_summary_only",
  "sponsor_status_disclosed",
  "sponsor_template_only",
  "no_human_impersonation",
  "no_prompt_values",
  "no_internal_provider_values",
  "no_private_memory",
  "no_private_viewer_details",
  "no_sponsor_negotiation",
  "no_sponsor_revenue_contract",
  "no_raw_sponsor_notes",
  "no_sponsor_contract_values",
];

const DISCLOSURE_LABELS = new Set([
  "ai_system_disclosed",
  "operator_review_enabled",
  "operator_review_disabled",
  "memory_may_be_used_safely",
  "memory_disabled",
  "sponsor_none",
  "sponsor_disclosed",
  "review_required",
]);

const UNSAFE_TEXT_PATTERN =
  /\b(real human|not an ai|human operator pretending|operator private note|private operator note|private memory|raw memory|private viewer|viewer id|viewer details|raw prompt|internal provider data|provider diagnostics|sponsor negotiation|sponsor revenue|revenue contract|raw sponsor note|raw note|sponsor contract|payment term|secret|token|endpoint|payload)\b|https?:\/\//i;

export function createAiTransparencyPublicSummary({
  memoryEnabled = false,
  sponsorPresent = false,
  operatorSupported = true,
} = {}) {
  const summary = {
    schema: "iris_ai_transparency_public_summary_v1",
    transparency_status: "ai_system_disclosed",
    ai_disclosure_label: "ai_system_disclosed",
    operator_disclosure_label:
      operatorSupported === true ? "operator_review_enabled" : "operator_review_disabled",
    memory_disclosure_label:
      memoryEnabled === true ? "memory_may_be_used_safely" : "memory_disabled",
    sponsor_disclosure_label: sponsorPresent === true ? "sponsor_disclosed" : "sponsor_none",
    public_summary:
      "IRIS is an AI character system with operator support; safe memory and sponsor status are disclosed by fixed labels.",
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertAiTransparencyPublicSummary(summary);
  return summary;
}

export function assertAiTransparencyPublicSummary(
  summary,
  context = "AI transparency public summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_ai_transparency_public_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!TRANSPARENCY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  for (const field of [
    "transparency_status",
    "ai_disclosure_label",
    "operator_disclosure_label",
    "memory_disclosure_label",
    "sponsor_disclosure_label",
  ]) {
    if (!DISCLOSURE_LABELS.has(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (summary.ai_disclosure_label !== "ai_system_disclosed") {
    throw new ContractError(`${context}: AI disclosure is required`);
  }
  if (
    typeof summary.public_summary !== "string" ||
    summary.public_summary.length > 180 ||
    !/\bAI\b/.test(summary.public_summary)
  ) {
    throw new ContractError(`${context}: invalid public summary`);
  }
  assertNoUnsafeStringValues(summary, context);
  assertBoundaryPolicy(summary.boundary_policy, context);
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
      throw new ContractError(`${context}: unsafe transparency text`, { path });
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
