import {
  ContractError,
  assertNoDirectCandidateCommit,
  assertNoDirectMemoryWrite,
  assertNoWorldCommand,
} from "../../core/contracts.js";

const REPORT_FIELDS = new Set([
  "schema",
  "ok",
  "status",
  "external_real_evidence_status",
  "next_readiness_state",
  "production_ready_allowed",
  "go_no_go",
  "owner_scope_policy_summary",
  "public_surface_filter_summary",
  "recall_phrase_guard_summary",
  "downstream_seed_guard_summary",
  "safe_output_guard_summary",
  "production_handoff_summary",
  "boundary_policy",
]);

const OWNER_SCOPE_POLICY_FIELDS = new Set([
  "schema",
  "public_scope_allowed_count",
  "private_scope_blocked_count",
  "sensitive_scope_blocked_count",
  "ordinary_surface_allowed_scope_count",
  "owner_operator_gate_status",
  "privacy_guard_status",
  "real_memory_export_status",
]);

const PUBLIC_SURFACE_FILTER_FIELDS = new Set([
  "schema",
  "public_view_leak_count",
  "ordinary_view_leak_count",
  "public_report_leak_count",
  "admin_ordinary_summary_leak_count",
  "readiness_leak_count",
  "output_recall_leak_count",
  "owner_operator_raw_detail_leak_count",
  "safe_status_count",
]);

const RECALL_PHRASE_GUARD_FIELDS = new Set([
  "schema",
  "safe_phrase_only",
  "internal_identifier_leak_count",
  "reference_identifier_leak_count",
  "score_detail_leak_count",
  "low_relevance_recall_count",
  "read_only_reference_commit_count",
  "private_scope_phrase_count",
  "sensitive_scope_phrase_count",
]);

const DOWNSTREAM_SEED_GUARD_FIELDS = new Set([
  "schema",
  "next_stream_seed_private_scope_count",
  "next_stream_seed_sensitive_scope_count",
  "community_memory_private_scope_count",
  "community_memory_sensitive_scope_count",
  "newcomer_exclusion_status",
  "safe_summary_only",
]);

const SAFE_OUTPUT_GUARD_FIELDS = new Set([
  "schema",
  "safe_summary_only",
  "body_detail_leak_count",
  "source_text_leak_count",
  "candidate_detail_leak_count",
  "private_identity_leak_count",
  "internal_identifier_leak_count",
  "score_detail_leak_count",
  "reason_detail_leak_count",
  "network_location_leak_count",
  "credential_leak_count",
  "unsafe_value_leak_detected",
]);

const HANDOFF_FIELDS = new Set([
  "schema",
  "fixture_rehearsal_only",
  "real_memory_export_not_started",
  "real_admin_export_not_started",
  "safe_summary_only",
  "production_ready_allowed",
  "go_no_go",
  "next_validation_script",
  "next_preflight_script",
]);

const BOUNDARY_FIELDS = new Set([
  "public_scope_only_for_public_surfaces",
  "private_scope_requires_context_and_guard",
  "sensitive_scope_not_surfaceable",
  "public_recall_safe_phrase_only",
  "admin_ordinary_status_count_label_only",
  "owner_operator_raw_details_blocked",
  "private_sensitive_not_seeded",
  "private_sensitive_not_community_memory",
  "low_relevance_not_recalled",
  "phase21_reference_read_only",
  "no_identifier_leaks",
  "no_score_leaks",
  "no_body_detail_leaks",
  "no_source_text_leaks",
  "no_candidate_detail_leaks",
  "no_private_identity_leaks",
  "no_network_location_leaks",
  "no_credential_leaks",
  "fixture_rehearsal_not_real_ready",
  "production_ready_not_allowed",
]);

export function createMemoryOwnerScopePrivacyFilterReport() {
  const report = {
    schema: "iris_memory_owner_scope_privacy_filter_v1",
    ok: false,
    status: "blocked",
    external_real_evidence_status: "external_real_evidence_blocked",
    next_readiness_state: "operator_review_required",
    production_ready_allowed: false,
    go_no_go: "no_go",
    owner_scope_policy_summary: {
      schema: "iris_memory_owner_scope_policy_safe_summary_v1",
      public_scope_allowed_count: 1,
      private_scope_blocked_count: 1,
      sensitive_scope_blocked_count: 1,
      ordinary_surface_allowed_scope_count: 1,
      owner_operator_gate_status: "operator_review_required",
      privacy_guard_status: "configuration_waiting",
      real_memory_export_status: "external_real_evidence_blocked",
    },
    public_surface_filter_summary: {
      schema: "iris_memory_owner_scope_public_surface_filter_summary_v1",
      public_view_leak_count: 0,
      ordinary_view_leak_count: 0,
      public_report_leak_count: 0,
      admin_ordinary_summary_leak_count: 0,
      readiness_leak_count: 0,
      output_recall_leak_count: 0,
      owner_operator_raw_detail_leak_count: 0,
      safe_status_count: 6,
    },
    recall_phrase_guard_summary: {
      schema: "iris_memory_owner_scope_recall_phrase_guard_summary_v1",
      safe_phrase_only: true,
      internal_identifier_leak_count: 0,
      reference_identifier_leak_count: 0,
      score_detail_leak_count: 0,
      low_relevance_recall_count: 0,
      read_only_reference_commit_count: 0,
      private_scope_phrase_count: 0,
      sensitive_scope_phrase_count: 0,
    },
    downstream_seed_guard_summary: {
      schema: "iris_memory_owner_scope_downstream_seed_guard_summary_v1",
      next_stream_seed_private_scope_count: 0,
      next_stream_seed_sensitive_scope_count: 0,
      community_memory_private_scope_count: 0,
      community_memory_sensitive_scope_count: 0,
      newcomer_exclusion_status: "guarded",
      safe_summary_only: true,
    },
    safe_output_guard_summary: {
      schema: "iris_memory_owner_scope_safe_output_guard_summary_v1",
      safe_summary_only: true,
      body_detail_leak_count: 0,
      source_text_leak_count: 0,
      candidate_detail_leak_count: 0,
      private_identity_leak_count: 0,
      internal_identifier_leak_count: 0,
      score_detail_leak_count: 0,
      reason_detail_leak_count: 0,
      network_location_leak_count: 0,
      credential_leak_count: 0,
      unsafe_value_leak_detected: false,
    },
    production_handoff_summary: {
      schema: "iris_memory_owner_scope_production_handoff_summary_v1",
      fixture_rehearsal_only: true,
      real_memory_export_not_started: true,
      real_admin_export_not_started: true,
      safe_summary_only: true,
      production_ready_allowed: false,
      go_no_go: "no_go",
      next_validation_script: "node scripts/dev-memory-owner-scope-privacy-filter.js",
      next_preflight_script: "npm run dev:persistence:preflight",
    },
    boundary_policy: {
      public_scope_only_for_public_surfaces: true,
      private_scope_requires_context_and_guard: true,
      sensitive_scope_not_surfaceable: true,
      public_recall_safe_phrase_only: true,
      admin_ordinary_status_count_label_only: true,
      owner_operator_raw_details_blocked: true,
      private_sensitive_not_seeded: true,
      private_sensitive_not_community_memory: true,
      low_relevance_not_recalled: true,
      phase21_reference_read_only: true,
      no_identifier_leaks: true,
      no_score_leaks: true,
      no_body_detail_leaks: true,
      no_source_text_leaks: true,
      no_candidate_detail_leaks: true,
      no_private_identity_leaks: true,
      no_network_location_leaks: true,
      no_credential_leaks: true,
      fixture_rehearsal_not_real_ready: true,
      production_ready_not_allowed: true,
    },
  };

  report.safe_output_guard_summary.unsafe_value_leak_detected =
    hasUnsafeValueLeak(report);
  report.ok =
    report.production_ready_allowed === false &&
    report.go_no_go === "no_go" &&
    report.owner_scope_policy_summary.public_scope_allowed_count === 1 &&
    report.owner_scope_policy_summary.private_scope_blocked_count === 1 &&
    report.owner_scope_policy_summary.sensitive_scope_blocked_count === 1 &&
    report.public_surface_filter_summary.public_view_leak_count === 0 &&
    report.public_surface_filter_summary.ordinary_view_leak_count === 0 &&
    report.public_surface_filter_summary.public_report_leak_count === 0 &&
    report.public_surface_filter_summary.admin_ordinary_summary_leak_count === 0 &&
    report.public_surface_filter_summary.readiness_leak_count === 0 &&
    report.recall_phrase_guard_summary.safe_phrase_only === true &&
    report.recall_phrase_guard_summary.internal_identifier_leak_count === 0 &&
    report.recall_phrase_guard_summary.reference_identifier_leak_count === 0 &&
    report.recall_phrase_guard_summary.score_detail_leak_count === 0 &&
    report.recall_phrase_guard_summary.low_relevance_recall_count === 0 &&
    report.recall_phrase_guard_summary.read_only_reference_commit_count === 0 &&
    report.downstream_seed_guard_summary.next_stream_seed_private_scope_count ===
      0 &&
    report.downstream_seed_guard_summary.next_stream_seed_sensitive_scope_count ===
      0 &&
    report.downstream_seed_guard_summary.community_memory_private_scope_count ===
      0 &&
    report.downstream_seed_guard_summary.community_memory_sensitive_scope_count ===
      0 &&
    report.safe_output_guard_summary.body_detail_leak_count === 0 &&
    report.safe_output_guard_summary.source_text_leak_count === 0 &&
    report.safe_output_guard_summary.candidate_detail_leak_count === 0 &&
    report.safe_output_guard_summary.private_identity_leak_count === 0 &&
    report.safe_output_guard_summary.unsafe_value_leak_detected === false;

  assertMemoryOwnerScopePrivacyFilterReportSafe(report);
  return report;
}

export function assertMemoryOwnerScopePrivacyFilterReportSafe(
  report,
  context = "memory owner scope privacy filter"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  assertFields(report, REPORT_FIELDS, context, "report");
  if (
    report.schema !== "iris_memory_owner_scope_privacy_filter_v1" ||
    report.ok !== true ||
    report.status !== "blocked" ||
    report.external_real_evidence_status !== "external_real_evidence_blocked" ||
    report.next_readiness_state !== "operator_review_required" ||
    report.production_ready_allowed !== false ||
    report.go_no_go !== "no_go"
  ) {
    throw new ContractError(`${context}: no-go invariant mismatch`);
  }

  assertOwnerScopePolicySummarySafe(report.owner_scope_policy_summary, context);
  assertPublicSurfaceFilterSummarySafe(
    report.public_surface_filter_summary,
    context
  );
  assertRecallPhraseGuardSummarySafe(report.recall_phrase_guard_summary, context);
  assertDownstreamSeedGuardSummarySafe(
    report.downstream_seed_guard_summary,
    context
  );
  assertSafeOutputGuardSummarySafe(report.safe_output_guard_summary, context);
  assertProductionHandoffSummarySafe(report.production_handoff_summary, context);
  assertBoundaryPolicySafe(report.boundary_policy, context);
  assertNoWorldCommand(report, context);
  assertNoDirectMemoryWrite(report, context);
  assertNoDirectCandidateCommit(report, context);
  assertNoUnsafeReportLeak(report, context);
}

function assertOwnerScopePolicySummarySafe(summary, context) {
  assertFields(summary, OWNER_SCOPE_POLICY_FIELDS, context, "owner scope policy");
  if (
    summary.schema !== "iris_memory_owner_scope_policy_safe_summary_v1" ||
    summary.public_scope_allowed_count !== 1 ||
    summary.private_scope_blocked_count !== 1 ||
    summary.sensitive_scope_blocked_count !== 1 ||
    summary.ordinary_surface_allowed_scope_count !== 1 ||
    summary.owner_operator_gate_status !== "operator_review_required" ||
    summary.privacy_guard_status !== "configuration_waiting" ||
    summary.real_memory_export_status !== "external_real_evidence_blocked"
  ) {
    throw new ContractError(`${context}: owner scope policy mismatch`);
  }
}

function assertPublicSurfaceFilterSummarySafe(summary, context) {
  assertFields(
    summary,
    PUBLIC_SURFACE_FILTER_FIELDS,
    context,
    "public surface filter"
  );
  for (const field of [
    "public_view_leak_count",
    "ordinary_view_leak_count",
    "public_report_leak_count",
    "admin_ordinary_summary_leak_count",
    "readiness_leak_count",
    "output_recall_leak_count",
    "owner_operator_raw_detail_leak_count",
  ]) {
    if (summary[field] !== 0) {
      throw new ContractError(`${context}: public surface leak count must be zero`, {
        field,
      });
    }
  }
  if (
    summary.schema !==
      "iris_memory_owner_scope_public_surface_filter_summary_v1" ||
    summary.safe_status_count !== 6
  ) {
    throw new ContractError(`${context}: public surface filter mismatch`);
  }
}

function assertRecallPhraseGuardSummarySafe(summary, context) {
  assertFields(summary, RECALL_PHRASE_GUARD_FIELDS, context, "recall phrase");
  if (
    summary.schema !== "iris_memory_owner_scope_recall_phrase_guard_summary_v1" ||
    summary.safe_phrase_only !== true ||
    summary.low_relevance_recall_count !== 0 ||
    summary.read_only_reference_commit_count !== 0 ||
    summary.private_scope_phrase_count !== 0 ||
    summary.sensitive_scope_phrase_count !== 0
  ) {
    throw new ContractError(`${context}: recall phrase guard mismatch`);
  }
  for (const field of [
    "internal_identifier_leak_count",
    "reference_identifier_leak_count",
    "score_detail_leak_count",
  ]) {
    if (summary[field] !== 0) {
      throw new ContractError(`${context}: recall phrase leak count must be zero`, {
        field,
      });
    }
  }
}

function assertDownstreamSeedGuardSummarySafe(summary, context) {
  assertFields(summary, DOWNSTREAM_SEED_GUARD_FIELDS, context, "downstream seed");
  for (const field of [
    "next_stream_seed_private_scope_count",
    "next_stream_seed_sensitive_scope_count",
    "community_memory_private_scope_count",
    "community_memory_sensitive_scope_count",
  ]) {
    if (summary[field] !== 0) {
      throw new ContractError(`${context}: downstream leak count must be zero`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_memory_owner_scope_downstream_seed_guard_summary_v1" ||
    summary.newcomer_exclusion_status !== "guarded" ||
    summary.safe_summary_only !== true
  ) {
    throw new ContractError(`${context}: downstream seed guard mismatch`);
  }
}

function assertSafeOutputGuardSummarySafe(summary, context) {
  assertFields(summary, SAFE_OUTPUT_GUARD_FIELDS, context, "safe output guard");
  if (
    summary.schema !== "iris_memory_owner_scope_safe_output_guard_summary_v1" ||
    summary.safe_summary_only !== true ||
    summary.unsafe_value_leak_detected !== false
  ) {
    throw new ContractError(`${context}: safe output guard mismatch`);
  }
  for (const field of [
    "body_detail_leak_count",
    "source_text_leak_count",
    "candidate_detail_leak_count",
    "private_identity_leak_count",
    "internal_identifier_leak_count",
    "score_detail_leak_count",
    "reason_detail_leak_count",
    "network_location_leak_count",
    "credential_leak_count",
  ]) {
    if (summary[field] !== 0) {
      throw new ContractError(`${context}: safe output leak count must be zero`, {
        field,
      });
    }
  }
}

function assertProductionHandoffSummarySafe(summary, context) {
  assertFields(summary, HANDOFF_FIELDS, context, "production handoff");
  if (
    summary.schema !== "iris_memory_owner_scope_production_handoff_summary_v1" ||
    summary.fixture_rehearsal_only !== true ||
    summary.real_memory_export_not_started !== true ||
    summary.real_admin_export_not_started !== true ||
    summary.safe_summary_only !== true ||
    summary.production_ready_allowed !== false ||
    summary.go_no_go !== "no_go" ||
    summary.next_validation_script !==
      "node scripts/dev-memory-owner-scope-privacy-filter.js" ||
    summary.next_preflight_script !== "npm run dev:persistence:preflight"
  ) {
    throw new ContractError(`${context}: production handoff mismatch`);
  }
}

function assertBoundaryPolicySafe(policy, context) {
  assertFields(policy, BOUNDARY_FIELDS, context, "boundary policy");
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy failed`, { field });
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

function hasUnsafeValueLeak(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return unsafeStringValue(value);
  if (Array.isArray(value)) return value.some(hasUnsafeValueLeak);
  if (typeof value !== "object") return false;
  return Object.values(value).some(hasUnsafeValueLeak);
}

function unsafeStringValue(value) {
  return /(?:https?:\/\/|Bearer\s+|sk-[A-Za-z0-9]|BEGIN [A-Z ]*PRIVATE KEY|postgres(?:ql)?:\/\/|mysql:\/\/|mongodb:\/\/|sqlite:\/\/|[A-Za-z]:\\|\/home\/|\/Users\/|memory[_ -]?id|selected[_ -]?memory|relation[_ -]?score|hidden[_ -]?score|internal[_ -]?id|private[_ -]?viewer|raw[_ -]?memory|raw[_ -]?candidate|raw[_ -]?reason|endpoint[_ -]?value|db[_ -]?credential)/i.test(
    value
  );
}

function assertNoUnsafeReportLeak(report, context) {
  if (hasUnsafeValueLeak(report)) {
    throw new ContractError(`${context}: unsafe value leak detected`);
  }
}
