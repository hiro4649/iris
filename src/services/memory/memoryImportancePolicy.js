import { ContractError } from "../../core/contracts.js";

const IMPORTANCE_CLASSES = new Set([
  "low",
  "standard",
  "high",
  "critical_review",
]);
const SAFE_FIELDS = new Set([
  "schema",
  "importance_class",
  "policy_label",
  "phase00_enum_export_allowed",
  "persistence_trigger_allowed",
  "approved_schema_required",
  "boundary_policy",
]);
const BOUNDARY_FIELDS = [
  "policy_label_only",
  "no_phase00_enum_export",
  "no_persistence_trigger",
  "approved_schema_required",
  "candidate_requires_validation",
  "no_execution_command",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(canonical|enum|commit|write|apply|execute|world_command|action_type|task_type|intent|memory_candidate|raw_payload)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(world[_-]?command|action[_-]?type|task[_-]?type|intent|execute|commit|write|apply|direct[_-]?commit|canonical[_-]?enum|raw[_-]?payload)\b/i;

export function createMemoryImportancePolicy({
  importanceClass = "standard",
} = {}) {
  const safeClass = normalizeImportanceClass(importanceClass);
  const policy = {
    schema: "iris_memory_importance_policy_v1",
    importance_class: safeClass,
    policy_label: `memory_importance_${safeClass}`,
    phase00_enum_export_allowed: false,
    persistence_trigger_allowed: false,
    approved_schema_required: true,
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertMemoryImportancePolicySafe(policy);
  return policy;
}

export function assertMemoryImportancePolicySafe(
  policy,
  context = "memory importance policy"
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: policy required`);
  }
  assertNoUnsafeStringValues(policy, context);
  if (policy.schema !== "iris_memory_importance_policy_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(policy)) {
    if (!SAFE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!IMPORTANCE_CLASSES.has(policy.importance_class)) {
    throw new ContractError(`${context}: invalid importance class`);
  }
  if (policy.policy_label !== `memory_importance_${policy.importance_class}`) {
    throw new ContractError(`${context}: invalid policy label`);
  }
  if (
    policy.phase00_enum_export_allowed !== false ||
    policy.persistence_trigger_allowed !== false ||
    policy.approved_schema_required !== true
  ) {
    throw new ContractError(`${context}: importance class must stay policy-only`);
  }
  assertBoundaryPolicy(policy.boundary_policy, context);
}

function normalizeImportanceClass(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return IMPORTANCE_CLASSES.has(normalized) ? normalized : "standard";
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
      throw new ContractError(`${context}: unsafe importance policy value`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  const allowedKeys = new Set([...SAFE_FIELDS, ...BOUNDARY_FIELDS]);
  for (const [key, nested] of Object.entries(value)) {
    if (!allowedKeys.has(key) && UNSAFE_FIELD_PATTERN.test(key)) {
      throw new ContractError(`${context}: unsafe importance policy field`, {
        path: `${path}.${key}`,
      });
    }
    assertNoUnsafeStringValues(nested, context, `${path}.${key}`);
  }
}
