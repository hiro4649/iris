import { ContractError } from "../../core/contracts.js";

const SAFE_FIELDS = new Set([
  "schema",
  "retention_status",
  "approved_memory_required",
  "approved_memory_present",
  "indefinite_retention_applied",
  "unapproved_source_persistence_allowed",
  "source_body_persistence_allowed",
  "boundary_policy",
]);
const BOUNDARY_FIELDS = [
  "approved_memory_only",
  "validator_approval_required",
  "no_unapproved_source_persistence",
  "no_source_body_persistence",
  "no_source_direct_persistence",
  "no_execution_command",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw_candidate|raw_payload|memory_candidate|candidate_payload|execute|commit|write|apply|world_command|input_action_candidate|approved_game_input_action)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(raw[_-]?candidate|raw[_-]?payload|memory[_-]?candidate|candidate[_-]?payload|execute|commit|write|apply|world[_-]?command|input[_-]?action[_-]?candidate|approved[_-]?game[_-]?input[_-]?action)\b/i;

export function createMemoryIndefiniteRetentionPolicy({
  approvedMemory = null,
  indefiniteRetentionRequested = false,
} = {}) {
  const approvedMemoryPresent = isApprovedMemory(approvedMemory);
  const applied =
    indefiniteRetentionRequested === true && approvedMemoryPresent === true;
  const policy = {
    schema: "iris_memory_indefinite_retention_policy_v1",
    retention_status: applied ? "approved_retention_applied" : "approved_memory_required",
    approved_memory_required: true,
    approved_memory_present: approvedMemoryPresent,
    indefinite_retention_applied: applied,
    unapproved_source_persistence_allowed: false,
    source_body_persistence_allowed: false,
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertMemoryIndefiniteRetentionPolicySafe(policy);
  return policy;
}

export function assertMemoryIndefiniteRetentionPolicySafe(
  policy,
  context = "memory indefinite retention policy"
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: policy required`);
  }
  assertNoUnsafeStringValues(policy, context);
  if (policy.schema !== "iris_memory_indefinite_retention_policy_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(policy)) {
    if (!SAFE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    !["approved_retention_applied", "approved_memory_required"].includes(
      policy.retention_status
    )
  ) {
    throw new ContractError(`${context}: invalid retention status`);
  }
  if (policy.approved_memory_required !== true) {
    throw new ContractError(`${context}: approved memory is required`);
  }
  for (const field of [
    "approved_memory_present",
    "indefinite_retention_applied",
    "unapproved_source_persistence_allowed",
    "source_body_persistence_allowed",
  ]) {
    if (typeof policy[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    policy.unapproved_source_persistence_allowed !== false ||
    policy.source_body_persistence_allowed !== false
  ) {
    throw new ContractError(`${context}: raw candidate or payload persistence is forbidden`);
  }
  if (
    policy.indefinite_retention_applied === true &&
    policy.approved_memory_present !== true
  ) {
    throw new ContractError(`${context}: retention requires approved memory`);
  }
  if (
    policy.indefinite_retention_applied === true &&
    policy.retention_status !== "approved_retention_applied"
  ) {
    throw new ContractError(`${context}: applied retention status mismatch`);
  }
  if (
    policy.indefinite_retention_applied !== true &&
    policy.retention_status !== "approved_memory_required"
  ) {
    throw new ContractError(`${context}: unapplied retention must require approved memory`);
  }
  assertBoundaryPolicy(policy.boundary_policy, context);
}

function isApprovedMemory(value) {
  return value?.schema === "approved_memory_record" && value?.approved === true;
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
      throw new ContractError(`${context}: unsafe retention value`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  const allowedKeys = new Set([...SAFE_FIELDS, ...BOUNDARY_FIELDS]);
  for (const [key, nested] of Object.entries(value)) {
    if (!allowedKeys.has(key) && UNSAFE_FIELD_PATTERN.test(key)) {
      throw new ContractError(`${context}: unsafe retention field`, {
        path: `${path}.${key}`,
      });
    }
    assertNoUnsafeStringValues(nested, context, `${path}.${key}`);
  }
}
