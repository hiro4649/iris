import { ContractError } from "../../core/contracts.js";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;
const SAFE_FIELDS = new Set([
  "schema",
  "query_status",
  "page_size",
  "keyset_cursor_required",
  "keyset_cursor_present",
  "unbounded_query_allowed",
  "boundary_policy",
]);
const BOUNDED_QUERY_POLICY_FIELDS = new Set([
  "schema",
  "policy_status",
  "page_size",
  "keyset_cursor_required",
  "keyset_cursor_present",
  "unbounded_query_allowed",
  "all_load_allowed",
  "boundary_policy",
]);
const VIEWER_IDENTITY_STABLE_KEY_REDACTION_FIELDS = new Set([
  "schema",
  "surface_status",
  "identity_record_count",
  "stable_identity_key_internal_only",
  "public_view_safe",
  "admin_ordinary_view_safe",
  "redacted_identity_count",
  "boundary_policy",
]);
const BOUNDARY_FIELDS = [
  "bounded_page_size_required",
  "keyset_pagination_required",
  "no_unbounded_profile_scan",
  "no_index_skip_scan",
  "no_private_identity_values",
  "no_memory_bodies",
  "no_private_scores",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(private_viewer_id|viewer_id|raw_memory|memory_body|hidden_score|relation_score|offset|all_profiles|load_all)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(private[_-]?viewer[_-]?id|viewer[_-]?id|raw[_-]?memory|memory[_-]?body|hidden[_-]?score|relation[_-]?score|load[_-]?all|all[_-]?profiles|offset)\b/i;

export function createPostgresProfilePaginationGuard({
  pageSize = DEFAULT_PAGE_SIZE,
  keysetCursor = null,
  requireCursor = false,
} = {}) {
  const boundedPageSize = clampPageSize(pageSize);
  const cursorPresent = safeCursorPresent(keysetCursor);
  const queryAllowed = requireCursor === true ? cursorPresent : true;
  const guard = {
    schema: "iris_postgres_profile_pagination_guard_v1",
    query_status: queryAllowed ? "bounded_keyset_ready" : "keyset_cursor_required",
    page_size: boundedPageSize,
    keyset_cursor_required: requireCursor === true,
    keyset_cursor_present: cursorPresent,
    unbounded_query_allowed: false,
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertPostgresProfilePaginationGuardSafe(guard);
  return guard;
}

export function assertPostgresProfilePaginationGuardSafe(
  guard,
  context = "PostgreSQL profile pagination guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  assertNoUnsafeStringValues(guard, context);
  if (guard.schema !== "iris_postgres_profile_pagination_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(guard)) {
    if (!SAFE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["bounded_keyset_ready", "keyset_cursor_required"].includes(guard.query_status)) {
    throw new ContractError(`${context}: invalid query status`);
  }
  if (
    !Number.isInteger(guard.page_size) ||
    guard.page_size < 1 ||
    guard.page_size > MAX_PAGE_SIZE
  ) {
    throw new ContractError(`${context}: invalid page size`);
  }
  for (const field of ["keyset_cursor_required", "keyset_cursor_present"]) {
    if (typeof guard[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (guard.unbounded_query_allowed !== false) {
    throw new ContractError(`${context}: unbounded profile query is forbidden`);
  }
  if (
    guard.keyset_cursor_required === true &&
    guard.keyset_cursor_present !== true &&
    guard.query_status !== "keyset_cursor_required"
  ) {
    throw new ContractError(`${context}: missing keyset cursor must block query`);
  }
  assertBoundaryPolicy(guard.boundary_policy, context);
}

export function createPostgresBoundedQueryPolicy({
  pageSize = DEFAULT_PAGE_SIZE,
  keysetCursor = null,
  requireCursor = true,
  allowUnbounded = false,
  allowAllLoad = false,
} = {}) {
  const boundedPageSize = clampPageSize(pageSize);
  const cursorPresent = safeCursorPresent(keysetCursor);
  const blocked =
    allowUnbounded === true ||
    allowAllLoad === true ||
    (requireCursor === true && cursorPresent !== true);
  const policy = {
    schema: "iris_postgres_bounded_query_policy_v1",
    policy_status: blocked ? "rejected_unbounded_or_missing_keyset" : "bounded_keyset_ready",
    page_size: boundedPageSize,
    keyset_cursor_required: requireCursor === true,
    keyset_cursor_present: cursorPresent,
    unbounded_query_allowed: false,
    all_load_allowed: false,
    boundary_policy: {
      bounded_page_size_required: true,
      keyset_pagination_required: true,
      no_unbounded_query: true,
      no_all_load: true,
      no_query_values: true,
      no_connection_values: true,
    },
  };
  assertPostgresBoundedQueryPolicySafe(policy);
  return policy;
}

export function assertPostgresBoundedQueryPolicySafe(
  policy,
  context = "PostgreSQL bounded query policy"
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: policy required`);
  }
  assertNoUnsafeStringValues(policy, context);
  if (policy.schema !== "iris_postgres_bounded_query_policy_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(policy)) {
    if (!BOUNDED_QUERY_POLICY_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    !["bounded_keyset_ready", "rejected_unbounded_or_missing_keyset"].includes(
      policy.policy_status
    )
  ) {
    throw new ContractError(`${context}: invalid policy status`);
  }
  if (
    !Number.isInteger(policy.page_size) ||
    policy.page_size < 1 ||
    policy.page_size > MAX_PAGE_SIZE
  ) {
    throw new ContractError(`${context}: invalid page size`);
  }
  for (const field of [
    "keyset_cursor_required",
    "keyset_cursor_present",
    "unbounded_query_allowed",
    "all_load_allowed",
  ]) {
    if (typeof policy[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (policy.unbounded_query_allowed !== false || policy.all_load_allowed !== false) {
    throw new ContractError(`${context}: unbounded/all load is forbidden`);
  }
  if (
    policy.keyset_cursor_required === true &&
    policy.keyset_cursor_present !== true &&
    policy.policy_status !== "rejected_unbounded_or_missing_keyset"
  ) {
    throw new ContractError(`${context}: missing keyset cursor must reject`);
  }
  for (const [field, value] of Object.entries({
    bounded_page_size_required: true,
    keyset_pagination_required: true,
    no_unbounded_query: true,
    no_all_load: true,
    no_query_values: true,
    no_connection_values: true,
  })) {
    if (policy.boundary_policy?.[field] !== value) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

export function createPostgresViewerIdentityStableKeyRedaction({
  identityRecords = [],
} = {}) {
  const records = Array.isArray(identityRecords) ? identityRecords : [];
  const summary = {
    schema: "iris_postgres_viewer_identity_stable_key_redaction_v1",
    surface_status: "stable_identity_internal_reference_only",
    identity_record_count: records.length,
    stable_identity_key_internal_only: true,
    public_view_safe: true,
    admin_ordinary_view_safe: true,
    redacted_identity_count: records.length,
    boundary_policy: {
      stable_identity_key_internal_only: true,
      public_view_redacted: true,
      admin_ordinary_view_redacted: true,
      no_private_identity_values: true,
      no_raw_identity_payload: true,
    },
  };
  assertPostgresViewerIdentityStableKeyRedactionSafe(summary);
  return summary;
}

export function assertPostgresViewerIdentityStableKeyRedactionSafe(
  summary,
  context = "PostgreSQL viewer identity stable key redaction"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeStringValues(summary, context);
  if (summary.schema !== "iris_postgres_viewer_identity_stable_key_redaction_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !VIEWER_IDENTITY_STABLE_KEY_REDACTION_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.surface_status !== "stable_identity_internal_reference_only") {
    throw new ContractError(`${context}: invalid surface status`);
  }
  for (const field of [
    "identity_record_count",
    "redacted_identity_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (summary.redacted_identity_count !== summary.identity_record_count) {
    throw new ContractError(`${context}: identity redaction count mismatch`);
  }
  for (const field of [
    "stable_identity_key_internal_only",
    "public_view_safe",
    "admin_ordinary_view_safe",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
  for (const [field, value] of Object.entries({
    stable_identity_key_internal_only: true,
    public_view_redacted: true,
    admin_ordinary_view_redacted: true,
    no_private_identity_values: true,
    no_raw_identity_payload: true,
  })) {
    if (summary.boundary_policy?.[field] !== value) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function clampPageSize(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.trunc(number), MAX_PAGE_SIZE);
}

function safeCursorPresent(value) {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
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
      throw new ContractError(`${context}: unsafe profile value exposed`, { path });
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
