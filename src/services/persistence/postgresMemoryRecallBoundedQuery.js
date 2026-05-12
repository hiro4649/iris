import { ContractError } from "../../core/contracts.js";

const MAX_RECALL_LIMIT = 20;
const DEFAULT_RECALL_LIMIT = 8;
const SAFE_FIELDS = new Set([
  "schema",
  "query_status",
  "recall_limit",
  "cache_lookup_required",
  "summary_only",
  "unbounded_query_allowed",
  "process_bulk_material_allowed",
  "boundary_policy",
]);
const BOUNDARY_FIELDS = [
  "bounded_query_required",
  "cache_lookup_required",
  "summary_only",
  "no_unbounded_scan",
  "no_bulk_process_material",
  "no_private_identity_values",
  "no_candidate_payloads",
  "no_command_output",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw_memory|memory_body|all_memory|load_all|private_viewer_id|viewer_id|candidate|world_command|command|commit|sql|query_value)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(raw[_-]?memory|memory[_-]?body|all[_-]?memory|load[_-]?all|private[_-]?viewer[_-]?id|viewer[_-]?id|candidate|world[_-]?command|command|commit|select |insert |update |delete |postgres:\/\/|query[_-]?value)\b|https?:\/\//i;

export function createPostgresMemoryRecallBoundedQuery({
  recallLimit = DEFAULT_RECALL_LIMIT,
  cacheHit = false,
  summaryOnly = true,
} = {}) {
  const boundedLimit = clampRecallLimit(recallLimit);
  const safeSummaryOnly = summaryOnly !== false;
  const query = {
    schema: "iris_postgres_memory_recall_bounded_query_v1",
    query_status:
      safeSummaryOnly === true ? "bounded_summary_ready" : "summary_required",
    recall_limit: boundedLimit,
    cache_lookup_required: true,
    summary_only: safeSummaryOnly,
    unbounded_query_allowed: false,
    process_bulk_material_allowed: false,
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  if (cacheHit === true) {
    query.query_status = "cache_summary_ready";
  }
  assertPostgresMemoryRecallBoundedQuerySafe(query);
  return query;
}

export function assertPostgresMemoryRecallBoundedQuerySafe(
  query,
  context = "PostgreSQL memory recall bounded query"
) {
  if (!query || typeof query !== "object" || Array.isArray(query)) {
    throw new ContractError(`${context}: query summary required`);
  }
  assertNoUnsafeStringValues(query, context);
  if (query.schema !== "iris_postgres_memory_recall_bounded_query_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(query)) {
    if (!SAFE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    ![
      "bounded_summary_ready",
      "cache_summary_ready",
      "summary_required",
    ].includes(query.query_status)
  ) {
    throw new ContractError(`${context}: invalid query status`);
  }
  if (
    !Number.isInteger(query.recall_limit) ||
    query.recall_limit < 1 ||
    query.recall_limit > MAX_RECALL_LIMIT
  ) {
    throw new ContractError(`${context}: invalid recall limit`);
  }
  if (query.cache_lookup_required !== true) {
    throw new ContractError(`${context}: cache lookup is required`);
  }
  if (query.summary_only !== true) {
    throw new ContractError(`${context}: recall must stay summary-only`);
  }
  if (
    query.unbounded_query_allowed !== false ||
    query.process_bulk_material_allowed !== false
  ) {
    throw new ContractError(`${context}: unbounded recall is forbidden`);
  }
  assertBoundaryPolicy(query.boundary_policy, context);
}

function clampRecallLimit(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) return DEFAULT_RECALL_LIMIT;
  return Math.min(Math.trunc(number), MAX_RECALL_LIMIT);
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
      throw new ContractError(`${context}: unsafe recall value exposed`, { path });
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
