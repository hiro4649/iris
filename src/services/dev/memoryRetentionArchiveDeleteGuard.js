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
  "retention_policy_summary",
  "workflow_status_summary",
  "delete_suppress_confirmation_summary",
  "ordinary_recall_suppression_summary",
  "candidate_boundary_summary",
  "raw_leak_guard_summary",
  "production_handoff_summary",
  "boundary_policy",
]);

const RETENTION_POLICY_FIELDS = new Set([
  "schema",
  "policy_class",
  "policy_status",
  "approved_memory_count",
  "indefinite_retention_approved_memory_count",
  "candidate_retention_count",
  "local_rehearsal_status",
]);

const WORKFLOW_STATUS_FIELDS = new Set([
  "schema",
  "archive_status",
  "summarize_status",
  "delete_status",
  "suppress_status",
  "backup_status",
  "restore_status",
  "safe_label_only",
]);

const DELETE_SUPPRESS_FIELDS = new Set([
  "schema",
  "delete_confirmation_status",
  "delete_audit_status",
  "suppress_confirmation_status",
  "suppress_audit_status",
  "auto_delete_approval_count",
  "auto_suppress_approval_count",
]);

const ORDINARY_RECALL_SUPPRESSION_FIELDS = new Set([
  "schema",
  "deleted_memory_ordinary_recall_count",
  "suppressed_memory_ordinary_recall_count",
  "raw_youtube_text_memory_count",
  "support_message_memory_count",
  "raw_frame_memory_count",
  "raw_audio_memory_count",
  "ordinary_recall_filter_status",
]);

const CANDIDATE_BOUNDARY_FIELDS = new Set([
  "schema",
  "selected_memory_ids_commit_input_count",
  "recall_candidate_commit_input_count",
  "memory_carryover_candidates_writer_count",
  "community_memory_candidates_writer_count",
  "raw_candidate_persistence_count",
  "raw_payload_persistence_count",
  "approved_schema_required",
]);

const RAW_LEAK_GUARD_FIELDS = new Set([
  "schema",
  "safe_summary_only",
  "raw_backup_path_count",
  "raw_db_value_count",
  "raw_memory_body_count",
  "raw_youtube_text_count",
  "support_message_count",
  "raw_frame_count",
  "raw_audio_count",
  "private_viewer_id_count",
  "candidate_payload_count",
  "endpoint_value_count",
  "db_credential_value_count",
  "connection_string_value_count",
  "unsafe_value_leak_detected",
]);

const HANDOFF_FIELDS = new Set([
  "schema",
  "fixture_rehearsal_only",
  "real_db_not_connected",
  "real_backup_not_executed",
  "real_restore_not_executed",
  "real_delete_not_executed",
  "safe_summary_only",
  "production_ready_allowed",
  "go_no_go",
  "next_validation_script",
  "next_preflight_script",
]);

const BOUNDARY_FIELDS = new Set([
  "retention_policy_class_status_count_only",
  "archive_status_safe_label_only",
  "summarize_status_safe_label_only",
  "delete_status_safe_label_only",
  "suppress_status_safe_label_only",
  "delete_requires_confirmation",
  "delete_requires_audit",
  "suppress_requires_confirmation",
  "suppress_requires_audit",
  "deleted_memory_excluded_from_ordinary_recall",
  "suppressed_memory_excluded_from_ordinary_recall",
  "indefinite_retention_approved_memory_only",
  "selected_memory_ids_not_commit_input",
  "recall_candidate_not_commit_input",
  "memory_carryover_candidates_not_direct_writer",
  "community_memory_candidates_not_direct_writer",
  "no_raw_backup_paths",
  "no_raw_db_values",
  "no_raw_memory_body",
  "no_raw_youtube_text",
  "no_support_messages",
  "no_raw_frames",
  "no_raw_audio",
  "no_private_viewer_ids",
  "no_candidate_payloads",
  "json_local_fixture_not_production_ready",
  "production_ready_not_allowed",
]);

export function createMemoryRetentionArchiveDeleteGuardReport() {
  const report = {
    schema: "iris_memory_retention_archive_delete_guard_v1",
    ok: false,
    status: "blocked",
    external_real_evidence_status: "external_real_evidence_blocked",
    next_readiness_state: "operator_review_required",
    production_ready_allowed: false,
    go_no_go: "no_go",
    retention_policy_summary: {
      schema: "iris_memory_retention_policy_safe_summary_v1",
      policy_class: "approved_memory_only",
      policy_status: "configuration_waiting",
      approved_memory_count: 1,
      indefinite_retention_approved_memory_count: 1,
      candidate_retention_count: 0,
      local_rehearsal_status: "local_rehearsal_only",
    },
    workflow_status_summary: {
      schema: "iris_memory_retention_workflow_status_summary_v1",
      archive_status: "operator_review_required",
      summarize_status: "safe_summary_only",
      delete_status: "confirmation_required",
      suppress_status: "confirmation_required",
      backup_status: "external_real_evidence_blocked",
      restore_status: "external_real_evidence_blocked",
      safe_label_only: true,
    },
    delete_suppress_confirmation_summary: {
      schema: "iris_memory_delete_suppress_confirmation_summary_v1",
      delete_confirmation_status: "confirmation_required",
      delete_audit_status: "audit_required",
      suppress_confirmation_status: "confirmation_required",
      suppress_audit_status: "audit_required",
      auto_delete_approval_count: 0,
      auto_suppress_approval_count: 0,
    },
    ordinary_recall_suppression_summary: {
      schema: "iris_memory_ordinary_recall_suppression_summary_v1",
      deleted_memory_ordinary_recall_count: 0,
      suppressed_memory_ordinary_recall_count: 0,
      raw_youtube_text_memory_count: 0,
      support_message_memory_count: 0,
      raw_frame_memory_count: 0,
      raw_audio_memory_count: 0,
      ordinary_recall_filter_status: "deleted_suppressed_excluded",
    },
    candidate_boundary_summary: {
      schema: "iris_memory_retention_candidate_boundary_summary_v1",
      selected_memory_ids_commit_input_count: 0,
      recall_candidate_commit_input_count: 0,
      memory_carryover_candidates_writer_count: 0,
      community_memory_candidates_writer_count: 0,
      raw_candidate_persistence_count: 0,
      raw_payload_persistence_count: 0,
      approved_schema_required: true,
    },
    raw_leak_guard_summary: {
      schema: "iris_memory_retention_raw_leak_guard_summary_v1",
      safe_summary_only: true,
      raw_backup_path_count: 0,
      raw_db_value_count: 0,
      raw_memory_body_count: 0,
      raw_youtube_text_count: 0,
      support_message_count: 0,
      raw_frame_count: 0,
      raw_audio_count: 0,
      private_viewer_id_count: 0,
      candidate_payload_count: 0,
      endpoint_value_count: 0,
      db_credential_value_count: 0,
      connection_string_value_count: 0,
      unsafe_value_leak_detected: false,
    },
    production_handoff_summary: {
      schema: "iris_memory_retention_production_handoff_summary_v1",
      fixture_rehearsal_only: true,
      real_db_not_connected: true,
      real_backup_not_executed: true,
      real_restore_not_executed: true,
      real_delete_not_executed: true,
      safe_summary_only: true,
      production_ready_allowed: false,
      go_no_go: "no_go",
      next_validation_script:
        "node scripts/dev-memory-retention-archive-delete-guard.js",
      next_preflight_script: "npm run dev:persistence:preflight",
    },
    boundary_policy: {
      retention_policy_class_status_count_only: true,
      archive_status_safe_label_only: true,
      summarize_status_safe_label_only: true,
      delete_status_safe_label_only: true,
      suppress_status_safe_label_only: true,
      delete_requires_confirmation: true,
      delete_requires_audit: true,
      suppress_requires_confirmation: true,
      suppress_requires_audit: true,
      deleted_memory_excluded_from_ordinary_recall: true,
      suppressed_memory_excluded_from_ordinary_recall: true,
      indefinite_retention_approved_memory_only: true,
      selected_memory_ids_not_commit_input: true,
      recall_candidate_not_commit_input: true,
      memory_carryover_candidates_not_direct_writer: true,
      community_memory_candidates_not_direct_writer: true,
      no_raw_backup_paths: true,
      no_raw_db_values: true,
      no_raw_memory_body: true,
      no_raw_youtube_text: true,
      no_support_messages: true,
      no_raw_frames: true,
      no_raw_audio: true,
      no_private_viewer_ids: true,
      no_candidate_payloads: true,
      json_local_fixture_not_production_ready: true,
      production_ready_not_allowed: true,
    },
  };

  report.raw_leak_guard_summary.unsafe_value_leak_detected =
    hasUnsafeValueLeak(report);
  report.ok =
    report.production_ready_allowed === false &&
    report.go_no_go === "no_go" &&
    report.retention_policy_summary.candidate_retention_count === 0 &&
    report.delete_suppress_confirmation_summary.auto_delete_approval_count === 0 &&
    report.delete_suppress_confirmation_summary.auto_suppress_approval_count ===
      0 &&
    report.ordinary_recall_suppression_summary
      .deleted_memory_ordinary_recall_count === 0 &&
    report.ordinary_recall_suppression_summary
      .suppressed_memory_ordinary_recall_count === 0 &&
    report.candidate_boundary_summary.selected_memory_ids_commit_input_count === 0 &&
    report.candidate_boundary_summary.recall_candidate_commit_input_count === 0 &&
    report.candidate_boundary_summary.memory_carryover_candidates_writer_count ===
      0 &&
    report.candidate_boundary_summary.community_memory_candidates_writer_count ===
      0 &&
    report.candidate_boundary_summary.raw_candidate_persistence_count === 0 &&
    report.candidate_boundary_summary.raw_payload_persistence_count === 0 &&
    report.raw_leak_guard_summary.raw_backup_path_count === 0 &&
    report.raw_leak_guard_summary.raw_db_value_count === 0 &&
    report.raw_leak_guard_summary.raw_memory_body_count === 0 &&
    report.raw_leak_guard_summary.raw_youtube_text_count === 0 &&
    report.raw_leak_guard_summary.support_message_count === 0 &&
    report.raw_leak_guard_summary.raw_frame_count === 0 &&
    report.raw_leak_guard_summary.raw_audio_count === 0 &&
    report.raw_leak_guard_summary.private_viewer_id_count === 0 &&
    report.raw_leak_guard_summary.candidate_payload_count === 0 &&
    report.raw_leak_guard_summary.unsafe_value_leak_detected === false;

  assertMemoryRetentionArchiveDeleteGuardReportSafe(report);
  return report;
}

export function assertMemoryRetentionArchiveDeleteGuardReportSafe(
  report,
  context = "memory retention archive delete guard"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  assertFields(report, REPORT_FIELDS, context, "report");
  if (
    report.schema !== "iris_memory_retention_archive_delete_guard_v1" ||
    report.ok !== true ||
    report.status !== "blocked" ||
    report.external_real_evidence_status !== "external_real_evidence_blocked" ||
    report.next_readiness_state !== "operator_review_required" ||
    report.production_ready_allowed !== false ||
    report.go_no_go !== "no_go"
  ) {
    throw new ContractError(`${context}: no-go invariant mismatch`);
  }

  assertRetentionPolicySummarySafe(report.retention_policy_summary, context);
  assertWorkflowStatusSummarySafe(report.workflow_status_summary, context);
  assertDeleteSuppressConfirmationSummarySafe(
    report.delete_suppress_confirmation_summary,
    context
  );
  assertOrdinaryRecallSuppressionSummarySafe(
    report.ordinary_recall_suppression_summary,
    context
  );
  assertCandidateBoundarySummarySafe(report.candidate_boundary_summary, context);
  assertRawLeakGuardSummarySafe(report.raw_leak_guard_summary, context);
  assertProductionHandoffSummarySafe(report.production_handoff_summary, context);
  assertBoundaryPolicySafe(report.boundary_policy, context);
  assertNoWorldCommand(report, context);
  assertNoDirectMemoryWrite(report, context);
  assertNoDirectCandidateCommit(report, context);
  assertNoUnsafeReportLeak(report, context);
}

function assertRetentionPolicySummarySafe(summary, context) {
  assertFields(summary, RETENTION_POLICY_FIELDS, context, "retention policy");
  if (
    summary.schema !== "iris_memory_retention_policy_safe_summary_v1" ||
    summary.policy_class !== "approved_memory_only" ||
    summary.policy_status !== "configuration_waiting" ||
    summary.approved_memory_count !== 1 ||
    summary.indefinite_retention_approved_memory_count !== 1 ||
    summary.candidate_retention_count !== 0 ||
    summary.local_rehearsal_status !== "local_rehearsal_only"
  ) {
    throw new ContractError(`${context}: retention policy mismatch`);
  }
}

function assertWorkflowStatusSummarySafe(summary, context) {
  assertFields(summary, WORKFLOW_STATUS_FIELDS, context, "workflow status");
  if (
    summary.schema !== "iris_memory_retention_workflow_status_summary_v1" ||
    summary.archive_status !== "operator_review_required" ||
    summary.summarize_status !== "safe_summary_only" ||
    summary.delete_status !== "confirmation_required" ||
    summary.suppress_status !== "confirmation_required" ||
    summary.backup_status !== "external_real_evidence_blocked" ||
    summary.restore_status !== "external_real_evidence_blocked" ||
    summary.safe_label_only !== true
  ) {
    throw new ContractError(`${context}: workflow status mismatch`);
  }
}

function assertDeleteSuppressConfirmationSummarySafe(summary, context) {
  assertFields(
    summary,
    DELETE_SUPPRESS_FIELDS,
    context,
    "delete suppress confirmation"
  );
  if (
    summary.schema !== "iris_memory_delete_suppress_confirmation_summary_v1" ||
    summary.delete_confirmation_status !== "confirmation_required" ||
    summary.delete_audit_status !== "audit_required" ||
    summary.suppress_confirmation_status !== "confirmation_required" ||
    summary.suppress_audit_status !== "audit_required" ||
    summary.auto_delete_approval_count !== 0 ||
    summary.auto_suppress_approval_count !== 0
  ) {
    throw new ContractError(`${context}: delete suppress confirmation mismatch`);
  }
}

function assertOrdinaryRecallSuppressionSummarySafe(summary, context) {
  assertFields(
    summary,
    ORDINARY_RECALL_SUPPRESSION_FIELDS,
    context,
    "ordinary recall suppression"
  );
  if (
    summary.schema !== "iris_memory_ordinary_recall_suppression_summary_v1" ||
    summary.deleted_memory_ordinary_recall_count !== 0 ||
    summary.suppressed_memory_ordinary_recall_count !== 0 ||
    summary.raw_youtube_text_memory_count !== 0 ||
    summary.support_message_memory_count !== 0 ||
    summary.raw_frame_memory_count !== 0 ||
    summary.raw_audio_memory_count !== 0 ||
    summary.ordinary_recall_filter_status !== "deleted_suppressed_excluded"
  ) {
    throw new ContractError(`${context}: ordinary recall suppression mismatch`);
  }
}

function assertCandidateBoundarySummarySafe(summary, context) {
  assertFields(summary, CANDIDATE_BOUNDARY_FIELDS, context, "candidate boundary");
  for (const field of [
    "selected_memory_ids_commit_input_count",
    "recall_candidate_commit_input_count",
    "memory_carryover_candidates_writer_count",
    "community_memory_candidates_writer_count",
    "raw_candidate_persistence_count",
    "raw_payload_persistence_count",
  ]) {
    if (summary[field] !== 0) {
      throw new ContractError(`${context}: candidate boundary count must be zero`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_memory_retention_candidate_boundary_summary_v1" ||
    summary.approved_schema_required !== true
  ) {
    throw new ContractError(`${context}: candidate boundary mismatch`);
  }
}

function assertRawLeakGuardSummarySafe(summary, context) {
  assertFields(summary, RAW_LEAK_GUARD_FIELDS, context, "raw leak guard");
  if (
    summary.schema !== "iris_memory_retention_raw_leak_guard_summary_v1" ||
    summary.safe_summary_only !== true ||
    summary.unsafe_value_leak_detected !== false
  ) {
    throw new ContractError(`${context}: raw leak guard mismatch`);
  }
  for (const field of [
    "raw_backup_path_count",
    "raw_db_value_count",
    "raw_memory_body_count",
    "raw_youtube_text_count",
    "support_message_count",
    "raw_frame_count",
    "raw_audio_count",
    "private_viewer_id_count",
    "candidate_payload_count",
    "endpoint_value_count",
    "db_credential_value_count",
    "connection_string_value_count",
  ]) {
    if (summary[field] !== 0) {
      throw new ContractError(`${context}: raw leak count must remain zero`, {
        field,
      });
    }
  }
}

function assertProductionHandoffSummarySafe(summary, context) {
  assertFields(summary, HANDOFF_FIELDS, context, "production handoff");
  if (
    summary.schema !== "iris_memory_retention_production_handoff_summary_v1" ||
    summary.fixture_rehearsal_only !== true ||
    summary.real_db_not_connected !== true ||
    summary.real_backup_not_executed !== true ||
    summary.real_restore_not_executed !== true ||
    summary.real_delete_not_executed !== true ||
    summary.safe_summary_only !== true ||
    summary.production_ready_allowed !== false ||
    summary.go_no_go !== "no_go" ||
    summary.next_validation_script !==
      "node scripts/dev-memory-retention-archive-delete-guard.js" ||
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
  return /(?:https?:\/\/|Bearer\s+|sk-[A-Za-z0-9]|BEGIN [A-Z ]*PRIVATE KEY|postgres(?:ql)?:\/\/|mysql:\/\/|mongodb:\/\/|sqlite:\/\/|[A-Za-z]:\\|\/home\/|\/Users\/|raw_backup_path|raw_db_value|raw_memory_body|raw_youtube_text|support_message|raw_frame|raw_audio|private_viewer_id|candidate_payload)/i.test(
    value
  );
}

function assertNoUnsafeReportLeak(report, context) {
  if (hasUnsafeValueLeak(report)) {
    throw new ContractError(`${context}: unsafe value leak detected`);
  }
}
