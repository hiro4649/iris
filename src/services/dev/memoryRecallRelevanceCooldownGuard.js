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
  "relevance_threshold_summary",
  "cooldown_summary",
  "reference_boundary_summary",
  "public_recall_summary",
  "safe_output_guard_summary",
  "production_handoff_summary",
  "boundary_policy",
]);

const RELEVANCE_THRESHOLD_FIELDS = new Set([
  "schema",
  "threshold_status",
  "low_relevance_recall_count",
  "low_relevance_reject_count",
  "high_relevance_reference_count",
  "safe_reason_label_status",
]);

const COOLDOWN_FIELDS = new Set([
  "schema",
  "recent_history_status",
  "repeated_recall_suppressed_count",
  "repeated_recall_allowed_count",
  "consecutive_same_reference_count",
]);

const REFERENCE_BOUNDARY_FIELDS = new Set([
  "schema",
  "read_only_reference_count",
  "reference_list_commit_input_count",
  "recall_reference_commit_count",
  "memory_commit_from_reference_count",
  "approved_schema_required",
]);

const PUBLIC_RECALL_FIELDS = new Set([
  "schema",
  "safe_phrase_only",
  "unsafe_phrase_hint_count",
  "identifier_leak_count",
  "reference_identifier_leak_count",
  "score_detail_leak_count",
  "internal_identifier_leak_count",
  "private_scope_phrase_count",
  "sensitive_scope_phrase_count",
]);

const SAFE_OUTPUT_GUARD_FIELDS = new Set([
  "schema",
  "safe_summary_only",
  "memory_body_leak_count",
  "private_body_leak_count",
  "reason_detail_leak_count",
  "candidate_detail_leak_count",
  "private_identity_leak_count",
  "network_location_leak_count",
  "credential_leak_count",
  "unsafe_value_leak_detected",
]);

const HANDOFF_FIELDS = new Set([
  "schema",
  "fixture_rehearsal_only",
  "real_memory_export_not_started",
  "real_recall_not_executed",
  "safe_summary_only",
  "production_ready_allowed",
  "go_no_go",
  "next_validation_script",
  "next_preflight_script",
]);

const BOUNDARY_FIELDS = new Set([
  "relevance_threshold_enforced",
  "low_relevance_not_recalled",
  "repeated_recall_cooldown_enforced",
  "phase21_reference_read_only",
  "recall_reference_not_memory_commit",
  "public_recall_safe_phrase_only",
  "reject_reason_safe_label_only",
  "private_sensitive_not_public_recall",
  "no_identifier_leaks",
  "no_score_leaks",
  "no_body_detail_leaks",
  "no_private_identity_leaks",
  "no_candidate_detail_leaks",
  "no_network_location_leaks",
  "no_credential_leaks",
  "fixture_rehearsal_not_real_ready",
  "production_ready_not_allowed",
]);

export function createMemoryRecallRelevanceCooldownGuardReport() {
  const report = {
    schema: "iris_memory_recall_relevance_cooldown_guard_v1",
    ok: false,
    status: "blocked",
    external_real_evidence_status: "external_real_evidence_blocked",
    next_readiness_state: "operator_review_required",
    production_ready_allowed: false,
    go_no_go: "no_go",
    relevance_threshold_summary: {
      schema: "iris_memory_recall_relevance_threshold_summary_v1",
      threshold_status: "threshold_enforced",
      low_relevance_recall_count: 0,
      low_relevance_reject_count: 1,
      high_relevance_reference_count: 1,
      safe_reason_label_status: "safe_label_only",
    },
    cooldown_summary: {
      schema: "iris_memory_recall_cooldown_summary_v1",
      recent_history_status: "cooldown_active",
      repeated_recall_suppressed_count: 1,
      repeated_recall_allowed_count: 0,
      consecutive_same_reference_count: 0,
    },
    reference_boundary_summary: {
      schema: "iris_memory_recall_reference_boundary_summary_v1",
      read_only_reference_count: 1,
      reference_list_commit_input_count: 0,
      recall_reference_commit_count: 0,
      memory_commit_from_reference_count: 0,
      approved_schema_required: true,
    },
    public_recall_summary: {
      schema: "iris_memory_recall_public_safe_phrase_summary_v1",
      safe_phrase_only: true,
      unsafe_phrase_hint_count: 0,
      identifier_leak_count: 0,
      reference_identifier_leak_count: 0,
      score_detail_leak_count: 0,
      internal_identifier_leak_count: 0,
      private_scope_phrase_count: 0,
      sensitive_scope_phrase_count: 0,
    },
    safe_output_guard_summary: {
      schema: "iris_memory_recall_safe_output_guard_summary_v1",
      safe_summary_only: true,
      memory_body_leak_count: 0,
      private_body_leak_count: 0,
      reason_detail_leak_count: 0,
      candidate_detail_leak_count: 0,
      private_identity_leak_count: 0,
      network_location_leak_count: 0,
      credential_leak_count: 0,
      unsafe_value_leak_detected: false,
    },
    production_handoff_summary: {
      schema: "iris_memory_recall_production_handoff_summary_v1",
      fixture_rehearsal_only: true,
      real_memory_export_not_started: true,
      real_recall_not_executed: true,
      safe_summary_only: true,
      production_ready_allowed: false,
      go_no_go: "no_go",
      next_validation_script:
        "node scripts/dev-memory-recall-relevance-cooldown-guard.js",
      next_preflight_script: "npm run dev:persistence:preflight",
    },
    boundary_policy: {
      relevance_threshold_enforced: true,
      low_relevance_not_recalled: true,
      repeated_recall_cooldown_enforced: true,
      phase21_reference_read_only: true,
      recall_reference_not_memory_commit: true,
      public_recall_safe_phrase_only: true,
      reject_reason_safe_label_only: true,
      private_sensitive_not_public_recall: true,
      no_identifier_leaks: true,
      no_score_leaks: true,
      no_body_detail_leaks: true,
      no_private_identity_leaks: true,
      no_candidate_detail_leaks: true,
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
    report.relevance_threshold_summary.low_relevance_recall_count === 0 &&
    report.relevance_threshold_summary.low_relevance_reject_count === 1 &&
    report.cooldown_summary.repeated_recall_suppressed_count === 1 &&
    report.cooldown_summary.repeated_recall_allowed_count === 0 &&
    report.cooldown_summary.consecutive_same_reference_count === 0 &&
    report.reference_boundary_summary.reference_list_commit_input_count === 0 &&
    report.reference_boundary_summary.recall_reference_commit_count === 0 &&
    report.reference_boundary_summary.memory_commit_from_reference_count === 0 &&
    report.public_recall_summary.safe_phrase_only === true &&
    report.public_recall_summary.unsafe_phrase_hint_count === 0 &&
    report.public_recall_summary.identifier_leak_count === 0 &&
    report.public_recall_summary.reference_identifier_leak_count === 0 &&
    report.public_recall_summary.score_detail_leak_count === 0 &&
    report.public_recall_summary.internal_identifier_leak_count === 0 &&
    report.public_recall_summary.private_scope_phrase_count === 0 &&
    report.public_recall_summary.sensitive_scope_phrase_count === 0 &&
    report.safe_output_guard_summary.memory_body_leak_count === 0 &&
    report.safe_output_guard_summary.private_body_leak_count === 0 &&
    report.safe_output_guard_summary.reason_detail_leak_count === 0 &&
    report.safe_output_guard_summary.candidate_detail_leak_count === 0 &&
    report.safe_output_guard_summary.private_identity_leak_count === 0 &&
    report.safe_output_guard_summary.unsafe_value_leak_detected === false;

  assertMemoryRecallRelevanceCooldownGuardReportSafe(report);
  return report;
}

export function assertMemoryRecallRelevanceCooldownGuardReportSafe(
  report,
  context = "memory recall relevance cooldown guard"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  assertFields(report, REPORT_FIELDS, context, "report");
  if (
    report.schema !== "iris_memory_recall_relevance_cooldown_guard_v1" ||
    report.ok !== true ||
    report.status !== "blocked" ||
    report.external_real_evidence_status !== "external_real_evidence_blocked" ||
    report.next_readiness_state !== "operator_review_required" ||
    report.production_ready_allowed !== false ||
    report.go_no_go !== "no_go"
  ) {
    throw new ContractError(`${context}: no-go invariant mismatch`);
  }

  assertRelevanceThresholdSummarySafe(
    report.relevance_threshold_summary,
    context
  );
  assertCooldownSummarySafe(report.cooldown_summary, context);
  assertReferenceBoundarySummarySafe(report.reference_boundary_summary, context);
  assertPublicRecallSummarySafe(report.public_recall_summary, context);
  assertSafeOutputGuardSummarySafe(report.safe_output_guard_summary, context);
  assertProductionHandoffSummarySafe(report.production_handoff_summary, context);
  assertBoundaryPolicySafe(report.boundary_policy, context);
  assertNoWorldCommand(report, context);
  assertNoDirectMemoryWrite(report, context);
  assertNoDirectCandidateCommit(report, context);
  assertNoUnsafeReportLeak(report, context);
}

function assertRelevanceThresholdSummarySafe(summary, context) {
  assertFields(
    summary,
    RELEVANCE_THRESHOLD_FIELDS,
    context,
    "relevance threshold"
  );
  if (
    summary.schema !== "iris_memory_recall_relevance_threshold_summary_v1" ||
    summary.threshold_status !== "threshold_enforced" ||
    summary.low_relevance_recall_count !== 0 ||
    summary.low_relevance_reject_count !== 1 ||
    summary.high_relevance_reference_count !== 1 ||
    summary.safe_reason_label_status !== "safe_label_only"
  ) {
    throw new ContractError(`${context}: relevance threshold mismatch`);
  }
}

function assertCooldownSummarySafe(summary, context) {
  assertFields(summary, COOLDOWN_FIELDS, context, "cooldown");
  if (
    summary.schema !== "iris_memory_recall_cooldown_summary_v1" ||
    summary.recent_history_status !== "cooldown_active" ||
    summary.repeated_recall_suppressed_count !== 1 ||
    summary.repeated_recall_allowed_count !== 0 ||
    summary.consecutive_same_reference_count !== 0
  ) {
    throw new ContractError(`${context}: cooldown mismatch`);
  }
}

function assertReferenceBoundarySummarySafe(summary, context) {
  assertFields(summary, REFERENCE_BOUNDARY_FIELDS, context, "reference boundary");
  if (
    summary.schema !== "iris_memory_recall_reference_boundary_summary_v1" ||
    summary.read_only_reference_count !== 1 ||
    summary.approved_schema_required !== true
  ) {
    throw new ContractError(`${context}: reference boundary mismatch`);
  }
  for (const field of [
    "reference_list_commit_input_count",
    "recall_reference_commit_count",
    "memory_commit_from_reference_count",
  ]) {
    if (summary[field] !== 0) {
      throw new ContractError(`${context}: reference boundary count must be zero`, {
        field,
      });
    }
  }
}

function assertPublicRecallSummarySafe(summary, context) {
  assertFields(summary, PUBLIC_RECALL_FIELDS, context, "public recall");
  if (
    summary.schema !== "iris_memory_recall_public_safe_phrase_summary_v1" ||
    summary.safe_phrase_only !== true ||
    summary.unsafe_phrase_hint_count !== 0 ||
    summary.private_scope_phrase_count !== 0 ||
    summary.sensitive_scope_phrase_count !== 0
  ) {
    throw new ContractError(`${context}: public recall mismatch`);
  }
  for (const field of [
    "identifier_leak_count",
    "reference_identifier_leak_count",
    "score_detail_leak_count",
    "internal_identifier_leak_count",
  ]) {
    if (summary[field] !== 0) {
      throw new ContractError(`${context}: public recall leak count must be zero`, {
        field,
      });
    }
  }
}

function assertSafeOutputGuardSummarySafe(summary, context) {
  assertFields(summary, SAFE_OUTPUT_GUARD_FIELDS, context, "safe output guard");
  if (
    summary.schema !== "iris_memory_recall_safe_output_guard_summary_v1" ||
    summary.safe_summary_only !== true ||
    summary.unsafe_value_leak_detected !== false
  ) {
    throw new ContractError(`${context}: safe output guard mismatch`);
  }
  for (const field of [
    "memory_body_leak_count",
    "private_body_leak_count",
    "reason_detail_leak_count",
    "candidate_detail_leak_count",
    "private_identity_leak_count",
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
    summary.schema !== "iris_memory_recall_production_handoff_summary_v1" ||
    summary.fixture_rehearsal_only !== true ||
    summary.real_memory_export_not_started !== true ||
    summary.real_recall_not_executed !== true ||
    summary.safe_summary_only !== true ||
    summary.production_ready_allowed !== false ||
    summary.go_no_go !== "no_go" ||
    summary.next_validation_script !==
      "node scripts/dev-memory-recall-relevance-cooldown-guard.js" ||
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
