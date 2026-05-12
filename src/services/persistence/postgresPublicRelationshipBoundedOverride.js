import { ContractError } from "../../core/contracts.js";

const PUBLIC_LEVELS = new Set([
  "new",
  "recognized",
  "familiar",
  "trusted",
  "long_term_friend",
  "bounded",
]);
const BOUNDED_STATES = new Set(["bounded", "limited", "muted", "blocked"]);
const SAFE_FIELDS = new Set([
  "schema",
  "public_relationship_level",
  "bounded_override_applied",
  "safety_distance_applied",
  "negative_label_allowed",
  "boundary_policy",
]);
const BOUNDARY_FIELDS = [
  "bounded_is_safety_distance",
  "no_humiliation_label",
  "no_private_scores",
  "no_private_identity_values",
  "no_memory_bodies",
  "no_pending_payloads",
  "no_action_outputs",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(hidden_score|relation_score|rank|shame_rank|private_viewer_id|viewer_id|raw_memory|candidate|command|payload)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(hidden[_-]?score|relation[_-]?score|shame[_-]?rank|private[_-]?viewer[_-]?id|viewer[_-]?id|raw[_-]?memory|candidate|command|payload|postgres:\/\/)\b|https?:\/\//i;

export function createPostgresPublicRelationshipBoundedOverride({
  publicRelationshipLevel = "new",
  moderationState = "allowed",
} = {}) {
  const bounded = BOUNDED_STATES.has(String(moderationState ?? "").trim().toLowerCase());
  const summary = {
    schema: "iris_postgres_public_relationship_bounded_override_v1",
    public_relationship_level: bounded
      ? "bounded"
      : safePublicLevel(publicRelationshipLevel),
    bounded_override_applied: bounded,
    safety_distance_applied: bounded,
    negative_label_allowed: false,
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertPostgresPublicRelationshipBoundedOverrideSafe(summary);
  return summary;
}

export function assertPostgresPublicRelationshipBoundedOverrideSafe(
  summary,
  context = "PostgreSQL public relationship bounded override"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeStringValues(summary, context);
  if (summary.schema !== "iris_postgres_public_relationship_bounded_override_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!PUBLIC_LEVELS.has(summary.public_relationship_level)) {
    throw new ContractError(`${context}: invalid public relationship level`);
  }
  for (const field of ["bounded_override_applied", "safety_distance_applied"]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (summary.negative_label_allowed !== false) {
    throw new ContractError(`${context}: bounded state must not become shame rank`);
  }
  if (
    summary.bounded_override_applied === true &&
    (summary.public_relationship_level !== "bounded" ||
      summary.safety_distance_applied !== true)
  ) {
    throw new ContractError(`${context}: bounded state must override to safety distance`);
  }
  assertBoundaryPolicy(summary.boundary_policy, context);
}

function safePublicLevel(value) {
  const level = String(value ?? "").trim();
  return PUBLIC_LEVELS.has(level) ? level : "new";
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
      throw new ContractError(`${context}: unsafe bounded override value exposed`, {
        path,
      });
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
