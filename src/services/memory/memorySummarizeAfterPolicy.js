import { ContractError } from "../../core/contracts.js";

const SAFE_FIELDS = new Set([
  "schema",
  "policy_status",
  "summary_candidate_required",
  "summary_candidate_created",
  "public_summary_allowed",
  "source_body_export_allowed",
  "boundary_policy",
]);
const BOUNDARY_FIELDS = [
  "summary_candidate_only",
  "validator_approval_required",
  "no_source_body_public_summary",
  "no_direct_memory_commit",
  "no_execution_command",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw_text|source_text|raw_payload|memory_candidate|summary_payload|execute|commit|write|apply|world_command)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(raw[_-]?text|source[_-]?text|raw[_-]?payload|memory[_-]?candidate|summary[_-]?payload|execute|commit|write|apply|world[_-]?command)\b/i;

export function createMemorySummarizeAfterPolicy({
  summarizeAfterRequired = false,
  sourceText = "",
} = {}) {
  const hasSourceText = String(sourceText ?? "").trim().length > 0;
  const createCandidate = summarizeAfterRequired === true && hasSourceText === true;
  const policy = {
    schema: "iris_memory_summarize_after_policy_v1",
    policy_status: createCandidate ? "summary_candidate_required" : "no_summary_candidate",
    summary_candidate_required: summarizeAfterRequired === true,
    summary_candidate_created: createCandidate,
    public_summary_allowed: false,
    source_body_export_allowed: false,
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertMemorySummarizeAfterPolicySafe(policy);
  return policy;
}

export function assertMemorySummarizeAfterPolicySafe(
  policy,
  context = "memory summarize-after policy"
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: policy required`);
  }
  assertNoUnsafeStringValues(policy, context);
  if (policy.schema !== "iris_memory_summarize_after_policy_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(policy)) {
    if (!SAFE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["summary_candidate_required", "no_summary_candidate"].includes(policy.policy_status)) {
    throw new ContractError(`${context}: invalid policy status`);
  }
  for (const field of [
    "summary_candidate_required",
    "summary_candidate_created",
    "public_summary_allowed",
    "source_body_export_allowed",
  ]) {
    if (typeof policy[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (policy.public_summary_allowed !== false || policy.source_body_export_allowed !== false) {
    throw new ContractError(`${context}: raw text must not become public summary`);
  }
  if (
    policy.summary_candidate_created === true &&
    policy.policy_status !== "summary_candidate_required"
  ) {
    throw new ContractError(`${context}: summary candidate status mismatch`);
  }
  assertBoundaryPolicy(policy.boundary_policy, context);
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
      throw new ContractError(`${context}: unsafe summarize-after value`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  const allowedKeys = new Set([...SAFE_FIELDS, ...BOUNDARY_FIELDS]);
  for (const [key, nested] of Object.entries(value)) {
    if (!allowedKeys.has(key) && UNSAFE_FIELD_PATTERN.test(key)) {
      throw new ContractError(`${context}: unsafe summarize-after field`, {
        path: `${path}.${key}`,
      });
    }
    assertNoUnsafeStringValues(nested, context, `${path}.${key}`);
  }
}
