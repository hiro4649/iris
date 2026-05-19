import {
  ContractError,
  assertNoDirectCandidateCommit,
  assertNoDirectMemoryWrite,
  assertNoWorldCommand,
} from "../../core/contracts.js";

const REAL_BACKEND_ENV_NAMES = [
  "IRIS_MEMORY_SEARCH_ADAPTER",
  "IRIS_MEMORY_SEARCH_ENDPOINT",
  "IRIS_MEMORY_SEARCH_TIMEOUT_MS",
  "IRIS_MEMORY_VECTOR_BRIDGE_HOST",
  "IRIS_MEMORY_VECTOR_BRIDGE_PORT",
];

const REPORT_FIELDS = new Set([
  "schema",
  "ok",
  "status",
  "external_real_evidence_status",
  "next_readiness_state",
  "production_ready_allowed",
  "go_no_go",
  "backend_evidence_summary",
  "recall_safety_summary",
  "raw_leak_guard_summary",
  "production_handoff_summary",
  "boundary_policy",
]);

const BACKEND_EVIDENCE_FIELDS = new Set([
  "schema",
  "configured_env",
  "missing_env",
  "configured_env_count",
  "missing_env_count",
  "memory_search_adapter_configured",
  "memory_search_endpoint_configured",
  "vector_bridge_host_configured",
  "vector_bridge_port_configured",
  "backend_mode_label",
  "loopback_or_fixture_status",
  "real_backend_evidence_status",
  "operator_confirmation_status",
]);

const RECALL_SAFETY_FIELDS = new Set([
  "schema",
  "bounded_query_status",
  "cache_status",
  "summary_status",
  "read_only_reference_count",
  "selected_memory_ids_commit_count",
  "recall_candidate_commit_count",
  "candidate_payload_count",
  "memory_commit_count",
]);

const RAW_LEAK_GUARD_FIELDS = new Set([
  "schema",
  "safe_summary_only",
  "raw_vector_value_count",
  "embedding_value_count",
  "raw_memory_body_count",
  "private_viewer_id_count",
  "endpoint_value_count",
  "db_credential_value_count",
  "connection_string_value_count",
  "raw_query_value_count",
  "raw_candidate_count",
  "unsafe_value_leak_detected",
]);

const HANDOFF_FIELDS = new Set([
  "schema",
  "real_vector_backend_not_connected",
  "embedding_generation_not_started",
  "db_connection_not_started",
  "vector_loopback_not_real_ready",
  "fixture_rehearsal_not_real_ready",
  "raw_vector_not_exported",
  "raw_memory_not_exported",
  "private_viewer_id_not_exported",
  "safe_summary_only",
  "production_ready_allowed",
  "go_no_go",
  "next_validation_script",
  "next_rehearsal_script",
]);

const BOUNDARY_FIELDS = new Set([
  "vector_readiness_status_count_boolean_label_only",
  "env_names_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_db_credentials",
  "no_connection_strings",
  "no_raw_vectors",
  "no_embedding_values",
  "no_raw_memory",
  "no_private_viewer_ids",
  "no_raw_queries",
  "no_raw_candidates",
  "selected_memory_ids_read_only_reference",
  "recall_candidate_not_commit_input",
  "no_direct_memory_write",
  "bounded_recall_summary_only",
  "fixture_loopback_not_real_backend_ready",
  "production_ready_not_allowed",
]);

export function createMemoryVectorBackendEvidenceBoundaryReport({
  env = process.env,
} = {}) {
  const configuredEnv = REAL_BACKEND_ENV_NAMES.filter((name) => env[name]);
  const missingEnv = REAL_BACKEND_ENV_NAMES.filter((name) => !env[name]);
  const report = {
    schema: "iris_memory_vector_backend_evidence_boundary_v1",
    ok: false,
    status: "blocked",
    external_real_evidence_status: "external_real_evidence_blocked",
    next_readiness_state: "operator_review_required",
    production_ready_allowed: false,
    go_no_go: "no_go",
    backend_evidence_summary: {
      schema: "iris_memory_vector_backend_evidence_summary_v1",
      configured_env: configuredEnv,
      missing_env: missingEnv,
      configured_env_count: configuredEnv.length,
      missing_env_count: missingEnv.length,
      memory_search_adapter_configured: Boolean(env.IRIS_MEMORY_SEARCH_ADAPTER),
      memory_search_endpoint_configured: Boolean(env.IRIS_MEMORY_SEARCH_ENDPOINT),
      vector_bridge_host_configured: Boolean(env.IRIS_MEMORY_VECTOR_BRIDGE_HOST),
      vector_bridge_port_configured: Boolean(env.IRIS_MEMORY_VECTOR_BRIDGE_PORT),
      backend_mode_label: "local_rehearsal_only",
      loopback_or_fixture_status: "not_real_backend_evidence",
      real_backend_evidence_status: "external_real_evidence_blocked",
      operator_confirmation_status: "operator_review_required",
    },
    recall_safety_summary: {
      schema: "iris_memory_vector_recall_safety_summary_v1",
      bounded_query_status: "bounded_summary_only",
      cache_status: "safe_count_status_only",
      summary_status: "safe_summary_only",
      read_only_reference_count: 2,
      selected_memory_ids_commit_count: 0,
      recall_candidate_commit_count: 0,
      candidate_payload_count: 0,
      memory_commit_count: 0,
    },
    raw_leak_guard_summary: {
      schema: "iris_memory_vector_raw_leak_guard_summary_v1",
      safe_summary_only: true,
      raw_vector_value_count: 0,
      embedding_value_count: 0,
      raw_memory_body_count: 0,
      private_viewer_id_count: 0,
      endpoint_value_count: 0,
      db_credential_value_count: 0,
      connection_string_value_count: 0,
      raw_query_value_count: 0,
      raw_candidate_count: 0,
      unsafe_value_leak_detected: false,
    },
    production_handoff_summary: {
      schema: "iris_memory_vector_production_handoff_summary_v1",
      real_vector_backend_not_connected: true,
      embedding_generation_not_started: true,
      db_connection_not_started: true,
      vector_loopback_not_real_ready: true,
      fixture_rehearsal_not_real_ready: true,
      raw_vector_not_exported: true,
      raw_memory_not_exported: true,
      private_viewer_id_not_exported: true,
      safe_summary_only: true,
      production_ready_allowed: false,
      go_no_go: "no_go",
      next_validation_script:
        "node scripts/dev-memory-vector-backend-evidence-boundary.js",
      next_rehearsal_script: "npm run dev:memory-vector:roundtrip",
    },
    boundary_policy: {
      vector_readiness_status_count_boolean_label_only: true,
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_db_credentials: true,
      no_connection_strings: true,
      no_raw_vectors: true,
      no_embedding_values: true,
      no_raw_memory: true,
      no_private_viewer_ids: true,
      no_raw_queries: true,
      no_raw_candidates: true,
      selected_memory_ids_read_only_reference: true,
      recall_candidate_not_commit_input: true,
      no_direct_memory_write: true,
      bounded_recall_summary_only: true,
      fixture_loopback_not_real_backend_ready: true,
      production_ready_not_allowed: true,
    },
  };

  report.raw_leak_guard_summary.unsafe_value_leak_detected =
    hasUnsafeValueLeak(report);
  report.ok =
    report.production_ready_allowed === false &&
    report.go_no_go === "no_go" &&
    report.backend_evidence_summary.real_backend_evidence_status ===
      "external_real_evidence_blocked" &&
    report.recall_safety_summary.selected_memory_ids_commit_count === 0 &&
    report.recall_safety_summary.recall_candidate_commit_count === 0 &&
    report.recall_safety_summary.candidate_payload_count === 0 &&
    report.recall_safety_summary.memory_commit_count === 0 &&
    report.raw_leak_guard_summary.raw_vector_value_count === 0 &&
    report.raw_leak_guard_summary.embedding_value_count === 0 &&
    report.raw_leak_guard_summary.raw_memory_body_count === 0 &&
    report.raw_leak_guard_summary.private_viewer_id_count === 0 &&
    report.raw_leak_guard_summary.endpoint_value_count === 0 &&
    report.raw_leak_guard_summary.db_credential_value_count === 0 &&
    report.raw_leak_guard_summary.connection_string_value_count === 0 &&
    report.raw_leak_guard_summary.raw_query_value_count === 0 &&
    report.raw_leak_guard_summary.raw_candidate_count === 0 &&
    report.raw_leak_guard_summary.unsafe_value_leak_detected === false;

  assertMemoryVectorBackendEvidenceBoundaryReportSafe(report);
  return report;
}

export function assertMemoryVectorBackendEvidenceBoundaryReportSafe(
  report,
  context = "memory vector backend evidence boundary"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  if (report.schema !== "iris_memory_vector_backend_evidence_boundary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  assertFields(report, REPORT_FIELDS, context, "report");
  if (
    report.ok !== true ||
    report.status !== "blocked" ||
    report.external_real_evidence_status !== "external_real_evidence_blocked" ||
    report.next_readiness_state !== "operator_review_required" ||
    report.production_ready_allowed !== false ||
    report.go_no_go !== "no_go"
  ) {
    throw new ContractError(`${context}: no-go invariant mismatch`);
  }
  assertBackendEvidenceSummarySafe(report.backend_evidence_summary, context);
  assertRecallSafetySummarySafe(report.recall_safety_summary, context);
  assertRawLeakGuardSummarySafe(report.raw_leak_guard_summary, context);
  assertProductionHandoffSummarySafe(report.production_handoff_summary, context);
  assertBoundaryPolicySafe(report.boundary_policy, context);
  assertNoWorldCommand(report, context);
  assertNoDirectMemoryWrite(report, context);
  assertNoDirectCandidateCommit(report, context);
  assertNoUnsafeReportLeak(report, context);
}

function assertBackendEvidenceSummarySafe(summary, context) {
  assertFields(summary, BACKEND_EVIDENCE_FIELDS, context, "backend evidence");
  assertEnvNameList(summary.configured_env, context, "configured_env");
  assertEnvNameList(summary.missing_env, context, "missing_env");
  if (
    summary.schema !== "iris_memory_vector_backend_evidence_summary_v1" ||
    summary.configured_env_count !== summary.configured_env.length ||
    summary.missing_env_count !== summary.missing_env.length ||
    summary.configured_env_count + summary.missing_env_count !==
      REAL_BACKEND_ENV_NAMES.length ||
    typeof summary.memory_search_adapter_configured !== "boolean" ||
    typeof summary.memory_search_endpoint_configured !== "boolean" ||
    typeof summary.vector_bridge_host_configured !== "boolean" ||
    typeof summary.vector_bridge_port_configured !== "boolean" ||
    summary.backend_mode_label !== "local_rehearsal_only" ||
    summary.loopback_or_fixture_status !== "not_real_backend_evidence" ||
    summary.real_backend_evidence_status !== "external_real_evidence_blocked" ||
    summary.operator_confirmation_status !== "operator_review_required"
  ) {
    throw new ContractError(`${context}: backend evidence summary mismatch`);
  }
}

function assertRecallSafetySummarySafe(summary, context) {
  assertFields(summary, RECALL_SAFETY_FIELDS, context, "recall safety");
  if (
    summary.schema !== "iris_memory_vector_recall_safety_summary_v1" ||
    summary.bounded_query_status !== "bounded_summary_only" ||
    summary.cache_status !== "safe_count_status_only" ||
    summary.summary_status !== "safe_summary_only" ||
    summary.read_only_reference_count < 1 ||
    summary.selected_memory_ids_commit_count !== 0 ||
    summary.recall_candidate_commit_count !== 0 ||
    summary.candidate_payload_count !== 0 ||
    summary.memory_commit_count !== 0
  ) {
    throw new ContractError(`${context}: recall safety invariant mismatch`);
  }
}

function assertRawLeakGuardSummarySafe(summary, context) {
  assertFields(summary, RAW_LEAK_GUARD_FIELDS, context, "raw leak guard");
  if (summary.schema !== "iris_memory_vector_raw_leak_guard_summary_v1") {
    throw new ContractError(`${context}: raw leak guard schema mismatch`);
  }
  if (summary.safe_summary_only !== true) {
    throw new ContractError(`${context}: raw leak guard must be summary only`);
  }
  for (const field of [
    "raw_vector_value_count",
    "embedding_value_count",
    "raw_memory_body_count",
    "private_viewer_id_count",
    "endpoint_value_count",
    "db_credential_value_count",
    "connection_string_value_count",
    "raw_query_value_count",
    "raw_candidate_count",
  ]) {
    if (summary[field] !== 0) {
      throw new ContractError(`${context}: raw leak count must remain zero`, {
        field,
      });
    }
  }
  if (summary.unsafe_value_leak_detected !== false) {
    throw new ContractError(`${context}: unsafe value leak detected`);
  }
}

function assertProductionHandoffSummarySafe(summary, context) {
  assertFields(summary, HANDOFF_FIELDS, context, "production handoff");
  for (const field of [
    "real_vector_backend_not_connected",
    "embedding_generation_not_started",
    "db_connection_not_started",
    "vector_loopback_not_real_ready",
    "fixture_rehearsal_not_real_ready",
    "raw_vector_not_exported",
    "raw_memory_not_exported",
    "private_viewer_id_not_exported",
    "safe_summary_only",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: handoff flag failed`, { field });
    }
  }
  if (
    summary.schema !== "iris_memory_vector_production_handoff_summary_v1" ||
    summary.production_ready_allowed !== false ||
    summary.go_no_go !== "no_go" ||
    summary.next_validation_script !==
      "node scripts/dev-memory-vector-backend-evidence-boundary.js" ||
    summary.next_rehearsal_script !== "npm run dev:memory-vector:roundtrip"
  ) {
    throw new ContractError(`${context}: handoff no-go mismatch`);
  }
}

function assertBoundaryPolicySafe(policy, context) {
  assertFields(policy, BOUNDARY_FIELDS, context, "boundary policy");
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary flag failed`, { field });
    }
  }
}

function assertFields(value, expectedFields, context, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: ${label} required`);
  }
  for (const field of Object.keys(value)) {
    if (!expectedFields.has(field)) {
      throw new ContractError(`${context}: unexpected ${label} field`, { field });
    }
  }
  for (const field of expectedFields) {
    if (!(field in value)) {
      throw new ContractError(`${context}: missing ${label} field`, { field });
    }
  }
}

function assertEnvNameList(names, context, field) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: ${field} must be an array`);
  }
  for (const name of names) {
    if (!REAL_BACKEND_ENV_NAMES.includes(name) || !isSafeEnvName(name)) {
      throw new ContractError(`${context}: unsafe env name`, { field });
    }
  }
}

function hasUnsafeValueLeak(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return unsafeStringValue(value);
  if (Array.isArray(value)) return value.some((item) => hasUnsafeValueLeak(item));
  if (typeof value === "object") {
    return Object.values(value).some((item) => hasUnsafeValueLeak(item));
  }
  return false;
}

function assertNoUnsafeReportLeak(report, context) {
  if (hasUnsafeValueLeak(report)) {
    throw new ContractError(`${context}: unsafe value leak detected`);
  }
}

function unsafeStringValue(value) {
  const text = String(value ?? "");
  if (isSafeEnvName(text) || isSafeScriptName(text)) return false;
  return (
    /https?:\/\//i.test(text) ||
    /\b(authorization|bearer|api[_-]?key|oauth|password|secret|token)\b/i.test(
      text
    ) ||
    /\b(connection string|db credential|raw query|raw memory|raw vector|embedding value)\b/i.test(
      text
    ) ||
    /\b(private viewer id|private_viewer_id|viewer_id|endpoint value)\b/i.test(
      text
    ) ||
    /\b(raw candidate|candidate payload|selected_memory_ids|recall_candidate)\b/i.test(
      text
    )
  );
}

function isSafeEnvName(value) {
  return /^IRIS_[A-Z0-9_]+$/.test(String(value ?? ""));
}

function isSafeScriptName(value) {
  return /^npm run dev:[a-z0-9:-]+$/.test(String(value ?? "")) ||
    /^node scripts\/dev-[a-z0-9-]+\.js$/.test(String(value ?? ""));
}
