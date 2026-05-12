import { ContractError } from "../../core/contracts.js";

const SAFE_FIELDS = new Set([
  "schema",
  "diagnostic_status",
  "slow_query_count",
  "affected_component_count",
  "safe_component_labels",
  "raw_detail_exposed",
  "boundary_policy",
]);
const BOUNDARY_FIELDS = [
  "safe_status_and_counts_only",
  "no_statement_text",
  "no_parameter_values",
  "no_database_credentials",
  "no_database_connection_values",
  "no_private_payloads",
];
const SAFE_COMPONENT_LABELS = new Set([
  "memory_store",
  "relationship_store",
  "operator_policy_store",
  "unknown_component",
]);
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw_sql|sql_text|query_value|db_credential|connection_string|password|token|secret|payload)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(raw[_-]?sql|sql[_-]?text|query[_-]?value|db[_-]?credential|connection[_-]?string|password|token|secret|payload|select |insert |update |delete |postgres:\/\/)\b|https?:\/\//i;

export function createPostgresSlowQueryDiagnostic({
  slowQueries = [],
  componentLabels = [],
} = {}) {
  const queryList = Array.isArray(slowQueries) ? slowQueries : [];
  const labels = safeComponentLabels(componentLabels);
  const diagnostic = {
    schema: "iris_postgres_slow_query_diagnostic_v1",
    diagnostic_status:
      queryList.length > 0 ? "operator_attention_required" : "ok",
    slow_query_count: queryList.length,
    affected_component_count: labels.length,
    safe_component_labels: labels,
    raw_detail_exposed: false,
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertPostgresSlowQueryDiagnosticSafe(diagnostic);
  return diagnostic;
}

export function assertPostgresSlowQueryDiagnosticSafe(
  diagnostic,
  context = "PostgreSQL slow query diagnostic"
) {
  if (!diagnostic || typeof diagnostic !== "object" || Array.isArray(diagnostic)) {
    throw new ContractError(`${context}: diagnostic required`);
  }
  assertNoUnsafeStringValues(diagnostic, context);
  if (diagnostic.schema !== "iris_postgres_slow_query_diagnostic_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(diagnostic)) {
    if (!SAFE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["ok", "operator_attention_required"].includes(diagnostic.diagnostic_status)) {
    throw new ContractError(`${context}: invalid diagnostic status`);
  }
  for (const field of ["slow_query_count", "affected_component_count"]) {
    if (!Number.isInteger(diagnostic[field]) || diagnostic[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!Array.isArray(diagnostic.safe_component_labels)) {
    throw new ContractError(`${context}: safe component labels required`);
  }
  if (diagnostic.safe_component_labels.length !== diagnostic.affected_component_count) {
    throw new ContractError(`${context}: component count mismatch`);
  }
  for (const label of diagnostic.safe_component_labels) {
    if (!SAFE_COMPONENT_LABELS.has(label)) {
      throw new ContractError(`${context}: invalid component label`);
    }
  }
  if (diagnostic.raw_detail_exposed !== false) {
    throw new ContractError(`${context}: raw detail must not be exposed`);
  }
  assertBoundaryPolicy(diagnostic.boundary_policy, context);
}

function safeComponentLabels(values) {
  const labels = Array.isArray(values) ? values : [];
  return [
    ...new Set(
      labels.map((value) =>
        SAFE_COMPONENT_LABELS.has(value) ? value : "unknown_component"
      )
    ),
  ].slice(0, 8);
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
      throw new ContractError(`${context}: unsafe diagnostic value exposed`, {
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
