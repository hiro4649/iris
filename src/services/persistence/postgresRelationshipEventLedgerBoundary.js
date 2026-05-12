import { ContractError } from "../../core/contracts.js";

const SAFE_FIELDS = new Set([
  "schema",
  "ledger_append_status",
  "record_kind",
  "approved_record_required",
  "approved_record_present",
  "event_ledger_append_allowed",
  "aggregate_update_required",
  "boundary_policy",
]);
const AGGREGATE_GUARD_FIELDS = new Set([
  "schema",
  "aggregate_update_status",
  "record_kind",
  "approved_record_required",
  "approved_record_present",
  "candidate_input_present",
  "aggregate_update_allowed",
  "boundary_policy",
]);
const BOUNDARY_FIELDS = [
  "approved_relationship_record_required",
  "validator_approval_required",
  "no_direct_unapproved_ledger_append",
  "aggregate_and_event_transaction_required",
  "no_public_record_values",
  "no_private_identity_values",
  "no_private_scores",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(relationship_update_candidate|candidate_payload|private_viewer_id|viewer_id|raw_memory|hidden_score|relation_score|event_id|trace_id|sql|query_value)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(relationship[_-]?update[_-]?candidate|candidate[_-]?payload|private[_-]?viewer[_-]?id|viewer[_-]?id|raw[_-]?memory|hidden[_-]?score|relation[_-]?score|event[_-]?id|trace[_-]?id|postgres:\/\/|select |insert |update |delete |query[_-]?value)\b|https?:\/\//i;

export function createPostgresRelationshipEventLedgerBoundary({
  approvedRecord = null,
  relationshipCandidate = null,
} = {}) {
  const approvedRecordPresent = isApprovedRelationshipRecord(approvedRecord);
  const candidatePresent = relationshipCandidate !== null && relationshipCandidate !== undefined;
  const appendAllowed = approvedRecordPresent === true && candidatePresent !== true;
  const boundary = {
    schema: "iris_postgres_relationship_event_ledger_boundary_v1",
    ledger_append_status: appendAllowed
      ? "approved_record_ready"
      : "approved_record_required",
    record_kind: appendAllowed ? "approved_relationship" : "unapproved_input",
    approved_record_required: true,
    approved_record_present: approvedRecordPresent,
    event_ledger_append_allowed: appendAllowed,
    aggregate_update_required: appendAllowed,
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertPostgresRelationshipEventLedgerBoundarySafe(boundary);
  return boundary;
}

export function assertPostgresRelationshipEventLedgerBoundarySafe(
  boundary,
  context = "PostgreSQL relationship event ledger boundary"
) {
  if (!boundary || typeof boundary !== "object" || Array.isArray(boundary)) {
    throw new ContractError(`${context}: boundary required`);
  }
  assertNoUnsafeStringValues(boundary, context);
  if (boundary.schema !== "iris_postgres_relationship_event_ledger_boundary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(boundary)) {
    if (!SAFE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    !["approved_record_ready", "approved_record_required"].includes(
      boundary.ledger_append_status
    )
  ) {
    throw new ContractError(`${context}: invalid ledger append status`);
  }
  if (!["approved_relationship", "unapproved_input"].includes(boundary.record_kind)) {
    throw new ContractError(`${context}: invalid record kind`);
  }
  if (boundary.approved_record_required !== true) {
    throw new ContractError(`${context}: approved record is required`);
  }
  if (typeof boundary.approved_record_present !== "boolean") {
    throw new ContractError(`${context}: invalid approved record status`);
  }
  if (
    boundary.event_ledger_append_allowed === true &&
    boundary.approved_record_present !== true
  ) {
    throw new ContractError(`${context}: append must follow approved record only`);
  }
  if (
    boundary.event_ledger_append_allowed === true &&
    boundary.aggregate_update_required !== true
  ) {
    throw new ContractError(`${context}: event ledger requires aggregate transaction`);
  }
  if (
    boundary.event_ledger_append_allowed !== true &&
    boundary.ledger_append_status !== "approved_record_required"
  ) {
    throw new ContractError(`${context}: unapproved input must be blocked`);
  }
  assertBoundaryPolicy(boundary.boundary_policy, context);
}

export function createPostgresRelationshipAggregateSchemaGuard({
  approvedRecord = null,
  relationshipCandidate = null,
} = {}) {
  const approvedRecordPresent = isApprovedRelationshipRecord(approvedRecord);
  const candidateInputPresent =
    relationshipCandidate !== null && relationshipCandidate !== undefined;
  const updateAllowed = approvedRecordPresent === true && candidateInputPresent !== true;
  const guard = {
    schema: "iris_postgres_relationship_aggregate_schema_guard_v1",
    aggregate_update_status: updateAllowed
      ? "approved_record_ready"
      : "approved_record_required",
    record_kind: updateAllowed ? "approved_relationship" : "unapproved_input",
    approved_record_required: true,
    approved_record_present: approvedRecordPresent,
    candidate_input_present: candidateInputPresent,
    aggregate_update_allowed: updateAllowed,
    boundary_policy: {
      approved_relationship_record_required: true,
      validator_approval_required: true,
      no_candidate_direct_write: true,
      no_public_record_values: true,
      no_private_identity_values: true,
      no_private_scores: true,
    },
  };
  assertPostgresRelationshipAggregateSchemaGuardSafe(guard);
  return guard;
}

export function assertPostgresRelationshipAggregateSchemaGuardSafe(
  guard,
  context = "PostgreSQL relationship aggregate schema guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  assertNoUnsafeStringValues(guard, context);
  if (guard.schema !== "iris_postgres_relationship_aggregate_schema_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(guard)) {
    if (!AGGREGATE_GUARD_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    !["approved_record_ready", "approved_record_required"].includes(
      guard.aggregate_update_status
    )
  ) {
    throw new ContractError(`${context}: invalid aggregate update status`);
  }
  if (!["approved_relationship", "unapproved_input"].includes(guard.record_kind)) {
    throw new ContractError(`${context}: invalid record kind`);
  }
  if (guard.approved_record_required !== true) {
    throw new ContractError(`${context}: approved record is required`);
  }
  for (const field of [
    "approved_record_present",
    "candidate_input_present",
    "aggregate_update_allowed",
  ]) {
    if (typeof guard[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    guard.aggregate_update_allowed === true &&
    (guard.approved_record_present !== true || guard.candidate_input_present === true)
  ) {
    throw new ContractError(`${context}: aggregate update requires approved record only`);
  }
  if (
    guard.aggregate_update_allowed !== true &&
    guard.aggregate_update_status !== "approved_record_required"
  ) {
    throw new ContractError(`${context}: unapproved input must be blocked`);
  }
  for (const [field, value] of Object.entries({
    approved_relationship_record_required: true,
    validator_approval_required: true,
    no_candidate_direct_write: true,
    no_public_record_values: true,
    no_private_identity_values: true,
    no_private_scores: true,
  })) {
    if (guard.boundary_policy?.[field] !== value) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function isApprovedRelationshipRecord(record) {
  return record?.schema === "approved_relationship_record" && record?.approved === true;
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
      throw new ContractError(`${context}: unsafe ledger value exposed`, { path });
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
