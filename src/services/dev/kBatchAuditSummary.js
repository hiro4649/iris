import { ContractError } from "../../core/contracts.js";

const SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "batch_label",
  "audit_status",
  "checked_count",
  "pass_count",
  "fail_count",
  "safe_labels",
  "boundary_policy",
]);
const SAFE_FILE_DELTA_SUMMARY_FIELDS = new Set([
  "schema",
  "summary_status",
  "file_count",
  "changed_file_labels",
  "boundary_policy",
]);
const SAFE_MODIFIED_FILE_POLICY_FIELDS = new Set([
  "schema",
  "policy_status",
  "checked_file_count",
  "docs_report_spec_changed",
  "rename_move_delete_detected",
  "broad_refactor_suspected",
  "boundary_policy",
]);
const SAFE_CORE_AUDIT_FLAG_FIELDS = new Set([
  "schema",
  "audit_status",
  "checked_file_count",
  "core_contract_boundary_changed",
  "phase04_boundary_changed",
  "persistence_boundary_changed",
  "adapter_boundary_changed",
  "canonical_boundary_changed",
  "candidate_boundary_changed",
  "immediate_audit_required",
  "boundary_policy",
]);
const SAFE_TARGET_NODE_VERIFICATION_RECORDER_FIELDS = new Set([
  "schema",
  "record_status",
  "verification_count",
  "pass_count",
  "fail_count",
  "verification_results",
  "boundary_policy",
]);
const SAFE_TARGET_NODE_VERIFICATION_RESULT_FIELDS = new Set([
  "schema",
  "k_label",
  "verification_status",
]);
const SAFE_RESIDUAL_RISK_NORMALIZER_FIELDS = new Set([
  "schema",
  "risk_status",
  "risk_count",
  "risk_labels",
  "whole_test_not_run_instruction_only",
  "boundary_policy",
]);
const SAFE_COMPLETION_ONE_LINE_SUMMARY_FIELDS = new Set([
  "schema",
  "line_status",
  "completed_k",
  "changed_files_label",
  "verification_result_label",
  "residual_risk_label",
  "one_line_summary",
  "boundary_policy",
]);
const SAFE_AUDIT_NG_COMPACT_REPORT_FIELDS = new Set([
  "schema",
  "report_status",
  "problem_k",
  "problem_label",
  "recommended_fix_label",
  "residual_risk_label",
  "boundary_policy",
]);
const SAFE_NG_REPAIR_INSTRUCTION_FIELDS = new Set([
  "schema",
  "instruction_status",
  "problem_k",
  "problem_label",
  "nearby_repair_policy_label",
  "residual_risk_label",
  "boundary_policy",
]);
const SAFE_NO_AUTO_FIX_AUDIT_MODE_FIELDS = new Set([
  "schema",
  "audit_mode_status",
  "code_change_allowed",
  "stop_required",
  "ng_detected",
  "boundary_policy",
]);
const SAFE_NEXT_RANGE_READINESS_FIELDS = new Set([
  "schema",
  "readiness_status",
  "completed_range_label",
  "next_range_label",
  "completed_count",
  "expected_count",
  "next_range_allowed",
  "next_task_exploration_performed",
  "boundary_policy",
]);
const SAFE_REVIEW_HOOK_FIELDS = new Set([
  "schema",
  "status",
  "batch_label",
  "review_recommended",
  "next_step_label",
  "boundary_policy",
]);
const SAFE_PRODUCTION_COMPLETION_REVIEW_HOOK_FIELDS = new Set([
  "schema",
  "status",
  "batch_label",
  "production_status",
  "real_residency_confirmed",
  "residual_risk_label",
  "review_recommended",
  "next_step_label",
  "boundary_policy",
]);
const SAFE_PRODUCTION_BLOCKER_CARRYOVER_FIELDS = new Set([
  "schema",
  "carryover_status",
  "source_range_label",
  "next_range_label",
  "blocked_count",
  "blocker_labels",
  "carryover_required",
  "readiness_exploration_performed",
  "boundary_policy",
]);
const SAFE_REAL_MODE_BLOCKED_POLICY_FIELDS = new Set([
  "schema",
  "policy_status",
  "real_mode_confirmed",
  "fixture_passed",
  "production_status",
  "blocked_reason_label",
  "boundary_policy",
]);
const SAFE_PRIORITY1_BLOCKER_STATE_FIELDS = new Set([
  "schema",
  "state_status",
  "priority_label",
  "component_label",
  "blocker_status",
  "blocked_reason_label",
  "k_completion_seen",
  "fixture_pass_seen",
  "production_status",
  "blocker_persisted",
  "boundary_policy",
]);
const SAFE_GIT_CLEAN_GATE_FIELDS = new Set([
  "schema",
  "gate_status",
  "changed_file_count",
  "clean_required",
  "safe_flag_label",
  "boundary_policy",
]);
const SAFE_RUNTIME_DATA_IGNORE_POLICY_FIELDS = new Set([
  "schema",
  "policy_status",
  "checked_file_count",
  "runtime_delta_count",
  "k_change_file_count",
  "runtime_delta_action_label",
  "boundary_policy",
]);
const SAFE_DOCS_SPEC_GUARD_FIELDS = new Set([
  "schema",
  "guard_status",
  "checked_file_count",
  "docs_report_spec_changed",
  "stop_required",
  "safe_flag_label",
  "boundary_policy",
]);
const SAFE_COMMIT_MESSAGE_SUGGESTION_FIELDS = new Set([
  "schema",
  "suggestion_status",
  "range_label",
  "category_label",
  "commit_message_label",
  "git_commit_performed",
  "boundary_policy",
]);
const SAFE_COMPLETION_REVIEW_SUMMARY_FIELDS = new Set([
  "schema",
  "summary_status",
  "range_label",
  "completed_category_label",
  "missing_category_label",
  "next_priority_label",
  "residual_risk_label",
  "one_line_summary",
  "boundary_policy",
]);
const BOUNDARY_FIELDS = [
  "safe_labels_only",
  "counts_only",
  "source_delta_values_excluded",
  "source_trace_values_excluded",
  "sensitive_values_excluded",
  "personal_values_excluded",
  "proposal_values_excluded",
  "operation_values_excluded",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw_diff|diff|raw_log|log|secret|token|private_data|private_viewer|raw_payload|candidate|command|world_command)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(raw[_-]?diff|raw[_-]?log|authorization|bearer|api[_-]?key|private[_-]?data|private[_-]?viewer|raw[_-]?payload|candidate|command|world[_-]?command)\b|(?:^|[_-])(secret|token)(?:$|[_-])|https?:\/\//i;

export function createKBatchAuditSummary({ batchLabel = "k_batch", items = [] } = {}) {
  const entries = Array.isArray(items) ? items : [];
  const passCount = entries.filter((item) => normalizeStatus(item?.status) === "pass").length;
  const failCount = entries.filter((item) => normalizeStatus(item?.status) === "fail").length;
  const summary = {
    schema: "iris_k_batch_audit_summary_v1",
    batch_label: safeLabel(batchLabel),
    audit_status: failCount > 0 ? "attention" : "pass",
    checked_count: entries.length,
    pass_count: passCount,
    fail_count: failCount,
    safe_labels: entries.map((item) => safeLabel(item?.label ?? item?.k ?? item?.status)).slice(0, 20),
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertKBatchAuditSummarySafe(summary);
  return summary;
}

export function createGitDiffStatSafeSummary({ files = [], maxFiles = 50 } = {}) {
  const entries = Array.isArray(files) ? files : [];
  const limit = Number.isInteger(maxFiles) && maxFiles > 0 ? Math.min(maxFiles, 100) : 50;
  const summary = {
    schema: "iris_git_file_delta_summary_v1",
    summary_status: entries.length > 0 ? "changed" : "clean",
    file_count: entries.length,
    changed_file_labels: entries.slice(0, limit).map((item) => safeFileLabel(item)),
    boundary_policy: {
      safe_file_labels_only: true,
      counts_only: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      large_text_excluded: true,
    },
  };
  assertGitDiffStatSafeSummary(summary);
  return summary;
}

export function createGitStatusDiffStatSafeSummary({
  statusText = "",
  diffStatText = "",
  maxFiles = 50,
} = {}) {
  return createGitDiffStatSafeSummary({
    files: [
      ...parseGitStatusFileLabels(statusText),
      ...parseGitDiffStatFileLabels(diffStatText),
    ],
    maxFiles,
  });
}

export function createKBatchModifiedFilePolicyCheck({
  files = [],
  statusText = "",
  broadRefactorFileThreshold = 20,
} = {}) {
  const entries = collectPolicyFileEntries({ files, statusText });
  const docsReportSpecChanged = entries.some((entry) =>
    isDocsReportSpecPath(entry.path)
  );
  const renameMoveDeleteDetected = entries.some((entry) =>
    ["renamed", "moved", "deleted"].includes(entry.change_kind)
  );
  const broadRefactorSuspected =
    entries.length >=
    (Number.isInteger(broadRefactorFileThreshold) && broadRefactorFileThreshold > 0
      ? broadRefactorFileThreshold
      : 20);
  const summary = {
    schema: "iris_k_batch_modified_file_policy_check_v1",
    policy_status:
      docsReportSpecChanged || renameMoveDeleteDetected || broadRefactorSuspected
        ? "attention"
        : "pass",
    checked_file_count: entries.length,
    docs_report_spec_changed: docsReportSpecChanged,
    rename_move_delete_detected: renameMoveDeleteDetected,
    broad_refactor_suspected: broadRefactorSuspected,
    boundary_policy: {
      safe_flags_only: true,
      counts_only: true,
      file_paths_excluded: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      no_auto_fix: true,
    },
  };
  assertKBatchModifiedFilePolicyCheckSafe(summary);
  return summary;
}

export function createKBatchGitCleanGate({ files = [], statusText = "" } = {}) {
  const entries = collectPolicyFileEntries({ files, statusText });
  const hasChanges = entries.length > 0;
  const summary = {
    schema: "iris_k_batch_git_clean_gate_v1",
    gate_status: hasChanges ? "blocked" : "clean",
    changed_file_count: entries.length,
    clean_required: hasChanges,
    safe_flag_label: hasChanges ? "changes_require_confirm_or_stash" : "none",
    boundary_policy: {
      safe_flag_only: true,
      counts_only: true,
      file_paths_excluded: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      no_auto_fix: true,
    },
  };
  assertKBatchGitCleanGateSafe(summary);
  return summary;
}

export function assertKBatchGitCleanGateSafe(
  summary,
  context = "K-batch Git clean gate"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_git_clean_gate_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_GIT_CLEAN_GATE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    !["clean", "blocked"].includes(summary.gate_status) ||
    !Number.isInteger(summary.changed_file_count) ||
    summary.changed_file_count < 0 ||
    typeof summary.clean_required !== "boolean" ||
    summary.safe_flag_label !== safeLabel(summary.safe_flag_label)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const hasChanges = summary.changed_file_count > 0;
  if (
    summary.gate_status !== (hasChanges ? "blocked" : "clean") ||
    summary.clean_required !== hasChanges ||
    summary.safe_flag_label !==
      (hasChanges ? "changes_require_confirm_or_stash" : "none")
  ) {
    throw new ContractError(`${context}: clean gate mismatch`);
  }
  assertGitCleanGateBoundaryPolicy(summary.boundary_policy, context);
}

export function createKBatchRuntimeDataIgnorePolicy({
  files = [],
  statusText = "",
} = {}) {
  const entries = collectPolicyFileEntries({ files, statusText });
  const runtimeDeltaCount = entries.filter((entry) =>
    isRuntimeDataPath(entry.path)
  ).length;
  const kChangeFileCount = entries.length - runtimeDeltaCount;
  const summary = {
    schema: "iris_k_batch_runtime_data_ignore_policy_v1",
    policy_status:
      runtimeDeltaCount > 0 && kChangeFileCount === 0
        ? "runtime_only"
        : runtimeDeltaCount > 0
          ? "mixed"
          : "none",
    checked_file_count: entries.length,
    runtime_delta_count: runtimeDeltaCount,
    k_change_file_count: kChangeFileCount,
    runtime_delta_action_label:
      runtimeDeltaCount > 0 ? "stash_restore_or_ignore_runtime_delta" : "none",
    boundary_policy: {
      runtime_delta_safe_summary_only: true,
      runtime_data_not_counted_as_k_change: true,
      stash_restore_ignore_label_only: true,
      file_paths_excluded: true,
      counts_only: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      no_auto_fix: true,
    },
  };
  assertKBatchRuntimeDataIgnorePolicySafe(summary);
  return summary;
}

export function assertKBatchRuntimeDataIgnorePolicySafe(
  summary,
  context = "K-batch runtime data ignore policy"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_runtime_data_ignore_policy_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !SAFE_RUNTIME_DATA_IGNORE_POLICY_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    !["none", "runtime_only", "mixed"].includes(summary.policy_status) ||
    !Number.isInteger(summary.checked_file_count) ||
    !Number.isInteger(summary.runtime_delta_count) ||
    !Number.isInteger(summary.k_change_file_count) ||
    summary.checked_file_count < 0 ||
    summary.runtime_delta_count < 0 ||
    summary.k_change_file_count < 0 ||
    summary.runtime_delta_action_label !== safeLabel(summary.runtime_delta_action_label)
  ) {
    throw new ContractError(`${context}: invalid policy`);
  }
  if (
    summary.checked_file_count !==
      summary.runtime_delta_count + summary.k_change_file_count ||
    summary.runtime_delta_action_label !==
      (summary.runtime_delta_count > 0
        ? "stash_restore_or_ignore_runtime_delta"
        : "none")
  ) {
    throw new ContractError(`${context}: runtime delta mismatch`);
  }
  const expectedStatus =
    summary.runtime_delta_count > 0 && summary.k_change_file_count === 0
      ? "runtime_only"
      : summary.runtime_delta_count > 0
        ? "mixed"
        : "none";
  if (summary.policy_status !== expectedStatus) {
    throw new ContractError(`${context}: invalid policy status`);
  }
  assertRuntimeDataIgnorePolicyBoundaryPolicy(summary.boundary_policy, context);
}

export function createKBatchDocsSpecGuard({ files = [], statusText = "" } = {}) {
  const entries = collectPolicyFileEntries({ files, statusText });
  const docsReportSpecChanged = entries.some((entry) =>
    isDocsReportSpecPath(entry.path)
  );
  const summary = {
    schema: "iris_k_batch_docs_spec_guard_v1",
    guard_status: docsReportSpecChanged ? "ng" : "pass",
    checked_file_count: entries.length,
    docs_report_spec_changed: docsReportSpecChanged,
    stop_required: docsReportSpecChanged,
    safe_flag_label: docsReportSpecChanged ? "docs_spec_change_stop_required" : "none",
    boundary_policy: {
      docs_spec_change_detected_as_ng: true,
      stop_without_auto_fix: true,
      safe_flag_only: true,
      file_paths_excluded: true,
      counts_only: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
    },
  };
  assertKBatchDocsSpecGuardSafe(summary);
  return summary;
}

export function assertKBatchDocsSpecGuardSafe(
  summary,
  context = "K-batch docs/spec guard"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_docs_spec_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_DOCS_SPEC_GUARD_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    !["pass", "ng"].includes(summary.guard_status) ||
    !Number.isInteger(summary.checked_file_count) ||
    summary.checked_file_count < 0 ||
    typeof summary.docs_report_spec_changed !== "boolean" ||
    typeof summary.stop_required !== "boolean" ||
    summary.safe_flag_label !== safeLabel(summary.safe_flag_label)
  ) {
    throw new ContractError(`${context}: invalid guard`);
  }
  if (
    summary.guard_status !== (summary.docs_report_spec_changed ? "ng" : "pass") ||
    summary.stop_required !== summary.docs_report_spec_changed ||
    summary.safe_flag_label !==
      (summary.docs_report_spec_changed ? "docs_spec_change_stop_required" : "none")
  ) {
    throw new ContractError(`${context}: docs/spec guard mismatch`);
  }
  assertDocsSpecGuardBoundaryPolicy(summary.boundary_policy, context);
}

export function createKBatchCommitMessageSuggestion({
  rangeLabel = "K671-K680",
  category = "k_batch",
} = {}) {
  const safeRange = safeLabel(rangeLabel);
  const safeCategory = safeLabel(category);
  const summary = {
    schema: "iris_k_batch_commit_message_suggestion_v1",
    suggestion_status: "suggested",
    range_label: safeRange,
    category_label: safeCategory,
    commit_message_label: `${safeRange}_${safeCategory}`,
    git_commit_performed: false,
    boundary_policy: {
      suggestion_only: true,
      git_commit_not_performed: true,
      safe_label_only: true,
      raw_diff_excluded: true,
      file_paths_excluded: true,
      sensitive_values_excluded: true,
    },
  };
  assertKBatchCommitMessageSuggestionSafe(summary);
  return summary;
}

export function assertKBatchCommitMessageSuggestionSafe(
  summary,
  context = "K-batch commit message suggestion"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_commit_message_suggestion_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !SAFE_COMMIT_MESSAGE_SUGGESTION_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    summary.suggestion_status !== "suggested" ||
    summary.range_label !== safeLabel(summary.range_label) ||
    summary.category_label !== safeLabel(summary.category_label) ||
    summary.commit_message_label !== safeLabel(summary.commit_message_label) ||
    summary.git_commit_performed !== false
  ) {
    throw new ContractError(`${context}: invalid suggestion`);
  }
  if (
    summary.commit_message_label !==
    safeLabel(`${summary.range_label}_${summary.category_label}`)
  ) {
    throw new ContractError(`${context}: message mismatch`);
  }
  assertCommitMessageSuggestionBoundaryPolicy(summary.boundary_policy, context);
}

export function createKBatchCompletionReviewSummary({
  rangeLabel = "K671-K680",
  completedCategories = [],
  missingCategories = [],
  nextPriority = "production_blocker_carryover",
  residualRisks = [],
} = {}) {
  const completed = summarizeSafeListLabel(completedCategories, "none");
  const missing = summarizeSafeListLabel(missingCategories, "none");
  const riskSummary = createKBatchResidualRiskNormalizer({ risks: residualRisks });
  const residualRiskLabel = riskSummary.risk_status === "attention" ? "attention" : "none";
  const safeRange = safeLabel(rangeLabel);
  const safeNextPriority = safeLabel(nextPriority);
  const summary = {
    schema: "iris_k_batch_completion_review_summary_v1",
    summary_status: "ready",
    range_label: safeRange,
    completed_category_label: completed,
    missing_category_label: missing,
    next_priority_label: safeNextPriority,
    residual_risk_label: residualRiskLabel,
    one_line_summary: [
      safeRange,
      completed,
      missing,
      safeNextPriority,
      residualRiskLabel,
    ].join(" / "),
    boundary_policy: {
      one_line_summary_only: true,
      safe_labels_only: true,
      category_details_excluded: true,
      raw_logs_excluded: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      whole_test_not_run_instruction_excluded: true,
    },
  };
  assertKBatchCompletionReviewSummarySafe(summary);
  return summary;
}

export function assertKBatchCompletionReviewSummarySafe(
  summary,
  context = "K-batch completion review summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_completion_review_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !SAFE_COMPLETION_REVIEW_SUMMARY_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    summary.summary_status !== "ready" ||
    summary.range_label !== safeLabel(summary.range_label) ||
    summary.completed_category_label !== safeLabel(summary.completed_category_label) ||
    summary.missing_category_label !== safeLabel(summary.missing_category_label) ||
    summary.next_priority_label !== safeLabel(summary.next_priority_label) ||
    !["none", "attention"].includes(summary.residual_risk_label)
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  const expectedLine = [
    summary.range_label,
    summary.completed_category_label,
    summary.missing_category_label,
    summary.next_priority_label,
    summary.residual_risk_label,
  ].join(" / ");
  if (summary.one_line_summary !== expectedLine) {
    throw new ContractError(`${context}: one line mismatch`);
  }
  assertCompletionReviewSummaryBoundaryPolicy(summary.boundary_policy, context);
}

export function createKBatchCoreImmediateAuditFlag({
  files = [],
  statusText = "",
} = {}) {
  const entries = collectPolicyFileEntries({ files, statusText });
  const flags = entries.reduce(
    (acc, entry) => {
      const path = normalizedPath(entry.path);
      acc.core_contract_boundary_changed ||= isCoreContractPath(path);
      acc.phase04_boundary_changed ||= path.includes("phase04");
      acc.persistence_boundary_changed ||= path.includes("persistence");
      acc.adapter_boundary_changed ||= path.includes("adapter");
      acc.canonical_boundary_changed ||= path.includes("canonical");
      acc.candidate_boundary_changed ||= path.includes("candidate");
      return acc;
    },
    {
      core_contract_boundary_changed: false,
      phase04_boundary_changed: false,
      persistence_boundary_changed: false,
      adapter_boundary_changed: false,
      canonical_boundary_changed: false,
      candidate_boundary_changed: false,
    }
  );
  const immediateAuditRequired = Object.values(flags).some(Boolean);
  const summary = {
    schema: "iris_k_batch_core_immediate_audit_flag_v1",
    audit_status: immediateAuditRequired ? "attention" : "pass",
    checked_file_count: entries.length,
    ...flags,
    immediate_audit_required: immediateAuditRequired,
    boundary_policy: {
      safe_flags_only: true,
      counts_only: true,
      file_paths_excluded: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      no_auto_fix: true,
    },
  };
  assertKBatchCoreImmediateAuditFlagSafe(summary);
  return summary;
}

export function createKBatchTargetNodeVerificationRecorder({
  verifications = [],
} = {}) {
  const results = (Array.isArray(verifications) ? verifications : []).map((item) => ({
    schema: "iris_k_batch_target_node_verification_result_v1",
    k_label: safeKLabel(item?.k ?? item?.k_label ?? item?.label),
    verification_status: normalizeVerificationStatus(item?.status),
  }));
  const passCount = results.filter(
    (item) => item.verification_status === "pass"
  ).length;
  const failCount = results.filter(
    (item) => item.verification_status === "fail"
  ).length;
  const summary = {
    schema: "iris_k_batch_target_node_verification_recorder_v1",
    record_status: failCount > 0 ? "attention" : "pass",
    verification_count: results.length,
    pass_count: passCount,
    fail_count: failCount,
    verification_results: results,
    boundary_policy: {
      k_labels_and_pass_fail_only: true,
      counts_only: true,
      raw_logs_excluded: true,
      command_output_excluded: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      no_auto_fix: true,
    },
  };
  assertKBatchTargetNodeVerificationRecorderSafe(summary);
  return summary;
}

export function createKBatchResidualRiskNormalizer({ risks = [] } = {}) {
  const entries = Array.isArray(risks) ? risks : [];
  const wholeTestOnly = entries.every((risk) => isWholeTestNotRunInstructionRisk(risk));
  const riskLabels = wholeTestOnly
    ? []
    : [
        ...new Set(
          entries
            .filter((risk) => !isWholeTestNotRunInstructionRisk(risk))
            .map((risk) => safeResidualRiskLabel(risk))
        ),
      ].slice(0, 20);
  const summary = {
    schema: "iris_k_batch_residual_risk_normalizer_v1",
    risk_status: riskLabels.length > 0 ? "attention" : "none",
    risk_count: riskLabels.length,
    risk_labels: riskLabels,
    whole_test_not_run_instruction_only: entries.length > 0 && wholeTestOnly,
    boundary_policy: {
      safe_risk_labels_only: true,
      whole_test_not_run_instruction_excluded: true,
      counts_only: true,
      raw_logs_excluded: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      no_auto_fix: true,
    },
  };
  assertKBatchResidualRiskNormalizerSafe(summary);
  return summary;
}

export function createKBatchCompletionOneLineSummary({
  completedK = "K000",
  changedFiles = [],
  verificationResult = "PASS",
  residualRisks = [],
} = {}) {
  const riskSummary = createKBatchResidualRiskNormalizer({ risks: residualRisks });
  const changedFilesLabel = summarizeChangedFilesLabel(changedFiles);
  const verificationResultLabel =
    normalizeVerificationStatus(verificationResult) === "fail" ? "fail" : "pass";
  const residualRiskLabel =
    riskSummary.risk_status === "attention" ? "attention" : "none";
  const summary = {
    schema: "iris_k_batch_completion_one_line_summary_v1",
    line_status: verificationResultLabel === "pass" ? "ready" : "attention",
    completed_k: safeKLabel(completedK),
    changed_files_label: changedFilesLabel,
    verification_result_label: verificationResultLabel,
    residual_risk_label: residualRiskLabel,
    one_line_summary: [
      safeKLabel(completedK),
      changedFilesLabel,
      verificationResultLabel,
      residualRiskLabel,
    ].join(" / "),
    boundary_policy: {
      one_line_only: true,
      safe_labels_only: true,
      file_paths_excluded: true,
      raw_logs_excluded: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      whole_test_not_run_instruction_excluded: true,
    },
  };
  assertKBatchCompletionOneLineSummarySafe(summary);
  return summary;
}

export function createKBatchAuditNgCompactReport({
  problemK = "K000",
  problem = "audit_ng",
  recommendedFix = "nearby_fix",
  residualRisks = [],
} = {}) {
  const riskSummary = createKBatchResidualRiskNormalizer({ risks: residualRisks });
  const report = {
    schema: "iris_k_batch_audit_ng_compact_report_v1",
    report_status: "ng",
    problem_k: safeKLabel(problemK),
    problem_label: safeLabel(problem),
    recommended_fix_label: safeLabel(recommendedFix),
    residual_risk_label: riskSummary.risk_status === "attention" ? "attention" : "none",
    boundary_policy: {
      compact_ng_fields_only: true,
      problem_k_problem_fix_risk_only: true,
      safe_labels_only: true,
      long_report_excluded: true,
      raw_logs_excluded: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      no_auto_fix: true,
    },
  };
  assertKBatchAuditNgCompactReportSafe(report);
  return report;
}

export function createKBatchNgRepairInstruction({
  problemK = "K000",
  problem = "audit_ng",
  nearbyRepairPolicy = "nearby_fix_only",
  residualRisks = [],
} = {}) {
  const riskSummary = createKBatchResidualRiskNormalizer({ risks: residualRisks });
  const instruction = {
    schema: "iris_k_batch_ng_repair_instruction_v1",
    instruction_status: "ng_repair_required",
    problem_k: safeKLabel(problemK),
    problem_label: safeLabel(problem),
    nearby_repair_policy_label: safeLabel(nearbyRepairPolicy),
    residual_risk_label: riskSummary.risk_status === "attention" ? "attention" : "none",
    boundary_policy: {
      problem_k_problem_policy_risk_only: true,
      nearby_repair_only: true,
      compact_instruction_only: true,
      safe_labels_only: true,
      raw_logs_excluded: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      no_auto_fix: true,
    },
  };
  assertKBatchNgRepairInstructionSafe(instruction);
  return instruction;
}

export function createKBatchNoAutoFixAuditMode({ ngDetected = false } = {}) {
  const detected = ngDetected === true;
  const summary = {
    schema: "iris_k_batch_no_auto_fix_audit_mode_v1",
    audit_mode_status: detected ? "stop_on_ng" : "audit_only",
    code_change_allowed: false,
    stop_required: detected,
    ng_detected: detected,
    boundary_policy: {
      audit_only: true,
      no_code_changes: true,
      stop_on_ng: true,
      no_auto_fix: true,
      safe_status_only: true,
      raw_logs_excluded: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
    },
  };
  assertKBatchNoAutoFixAuditModeSafe(summary);
  return summary;
}

export function createKBatchNextRangeReadiness({
  completedKs = [],
  rangeStart = 491,
  rangeSize = 10,
} = {}) {
  const start = safeRangeStart(rangeStart);
  const size = safeRangeSize(rangeSize);
  const completedSet = new Set(
    (Array.isArray(completedKs) ? completedKs : []).map((item) =>
      safeKLabel(item?.k ?? item?.k_label ?? item?.label ?? item)
    )
  );
  const expectedLabels = Array.from({ length: size }, (_, index) =>
    safeKLabel(`K${start + index}`)
  );
  const completedCount = expectedLabels.filter((label) => completedSet.has(label)).length;
  const ready = completedCount === size;
  const summary = {
    schema: "iris_k_batch_next_range_readiness_v1",
    readiness_status: ready ? "ok" : "ng",
    completed_range_label: safeRangeLabel(start, size),
    next_range_label: safeRangeLabel(start + size, size),
    completed_count: completedCount,
    expected_count: size,
    next_range_allowed: ready,
    next_task_exploration_performed: false,
    boundary_policy: {
      range_labels_and_counts_only: true,
      ok_ng_only: true,
      next_task_exploration_not_performed: true,
      task_details_excluded: true,
      raw_logs_excluded: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      no_auto_fix: true,
    },
  };
  assertKBatchNextRangeReadinessSafe(summary);
  return summary;
}

export function createK301K400ReviewHook({ batchLabel = "K301-K400" } = {}) {
  const summary = {
    schema: "iris_k301_k400_review_hook_v1",
    status: "review_recommended",
    batch_label: safeLabel(batchLabel),
    review_recommended: true,
    next_step_label: "k301_k400_safe_review",
    boundary_policy: {
      safe_status_only: true,
      code_change_not_required: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      personal_values_excluded: true,
      operation_values_excluded: true,
    },
  };
  assertK301K400ReviewHookSafe(summary);
  return summary;
}

export function createK401K500CompletionReviewHook({ batchLabel = "K401-K500" } = {}) {
  const summary = {
    schema: "iris_k401_k500_completion_review_hook_v1",
    status: "review_recommended",
    batch_label: safeLabel(batchLabel),
    review_recommended: true,
    next_step_label: "k401_k500_completion_review",
    boundary_policy: {
      safe_status_only: true,
      code_change_not_required: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      personal_values_excluded: true,
      operation_values_excluded: true,
    },
  };
  assertK401K500CompletionReviewHookSafe(summary);
  return summary;
}

export function createK501K600CompletionReviewHook({ batchLabel = "K501-K600" } = {}) {
  const summary = {
    schema: "iris_k501_k600_completion_review_hook_v1",
    status: "review_recommended",
    batch_label: safeLabel(batchLabel),
    review_recommended: true,
    next_step_label: "k501_k600_completion_review",
    boundary_policy: {
      safe_status_only: true,
      code_change_not_required: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      personal_values_excluded: true,
      operation_values_excluded: true,
    },
  };
  assertK501K600CompletionReviewHookSafe(summary);
  return summary;
}

export function createK601K700CompletionReviewHook({ batchLabel = "K601-K700" } = {}) {
  const summary = {
    schema: "iris_k601_k700_completion_review_hook_v1",
    status: "review_recommended",
    batch_label: safeLabel(batchLabel),
    review_recommended: true,
    next_step_label: "k601_k700_completion_review",
    boundary_policy: {
      safe_status_only: true,
      code_change_not_required: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      personal_values_excluded: true,
      operation_values_excluded: true,
    },
  };
  assertK601K700CompletionReviewHookSafe(summary);
  return summary;
}

export function createK600ProductionReadinessCompletionReviewHook({
  batchLabel = "K600-plus",
  realResidencyConfirmed = false,
} = {}) {
  const confirmed = realResidencyConfirmed === true;
  const summary = {
    schema: "iris_k600_production_readiness_completion_review_hook_v1",
    status: confirmed ? "review_ready" : "review_blocked",
    batch_label: safeLabel(batchLabel),
    production_status: confirmed ? "ready" : "blocked",
    real_residency_confirmed: confirmed,
    residual_risk_label: confirmed ? "none" : "real_residency_unconfirmed",
    review_recommended: true,
    next_step_label: "k600_production_completion_review",
    boundary_policy: {
      safe_completion_status_only: true,
      production_blocker_preserved: true,
      fixture_pass_not_real_ready: true,
      real_residency_risk_retained: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      operation_values_excluded: true,
    },
  };
  assertK600ProductionReadinessCompletionReviewHookSafe(summary);
  return summary;
}

export function createKBatchProductionBlockerCarryover({
  sourceRangeLabel = "K601-K670",
  nextRangeLabel = "K671-K680",
  blockers = ["real_residency_unconfirmed"],
} = {}) {
  const safeBlockers = [
    ...new Set((Array.isArray(blockers) ? blockers : []).map((item) => safeLabel(item))),
  ].filter((item) => item !== "item");
  const summary = {
    schema: "iris_k_batch_production_blocker_carryover_v1",
    carryover_status: safeBlockers.length > 0 ? "blocked" : "clear",
    source_range_label: safeLabel(sourceRangeLabel),
    next_range_label: safeLabel(nextRangeLabel),
    blocked_count: safeBlockers.length,
    blocker_labels: safeBlockers.slice(0, 20),
    carryover_required: safeBlockers.length > 0,
    readiness_exploration_performed: false,
    boundary_policy: {
      safe_carryover_labels_only: true,
      production_blocked_status_preserved: true,
      next_range_carryover_only: true,
      readiness_exploration_not_performed: true,
      counts_only: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      operation_values_excluded: true,
    },
  };
  assertKBatchProductionBlockerCarryoverSafe(summary);
  return summary;
}

export function createKBatchRealModeBlockedPolicy({
  realModeConfirmed = false,
  fixturePassed = false,
  blockedReason = "real_mode_unconfirmed",
} = {}) {
  const confirmed = realModeConfirmed === true;
  const summary = {
    schema: "iris_k_batch_real_mode_blocked_policy_v1",
    policy_status: confirmed ? "pass" : "blocked",
    real_mode_confirmed: confirmed,
    fixture_passed: fixturePassed === true,
    production_status: confirmed ? "ready" : "blocked",
    blocked_reason_label: confirmed ? "none" : safeLabel(blockedReason),
    boundary_policy: {
      real_mode_unconfirmed_blocks_ready: true,
      fixture_pass_separated_from_real_mode: true,
      safe_status_only: true,
      source_delta_values_excluded: true,
      sensitive_values_excluded: true,
      operation_values_excluded: true,
    },
  };
  assertKBatchRealModeBlockedPolicySafe(summary);
  return summary;
}

export function createPriority1BlockerSafeState({
  componentLabel = "live_residency",
  blockedReason = "real_residency_unconfirmed",
  kCompletionSeen = false,
  fixturePassSeen = false,
} = {}) {
  const summary = {
    schema: "iris_priority1_blocker_safe_state_v1",
    state_status: "persisted",
    priority_label: "priority1",
    component_label: safeLabel(componentLabel),
    blocker_status: "BLOCKED",
    blocked_reason_label: safeLabel(blockedReason),
    k_completion_seen: kCompletionSeen === true,
    fixture_pass_seen: fixturePassSeen === true,
    production_status: "blocked",
    blocker_persisted: true,
    boundary_policy: {
      safe_state_only: true,
      priority1_blocked_status_preserved: true,
      k_completion_does_not_clear_blocker: true,
      fixture_pass_does_not_clear_blocker: true,
      real_residency_wait_retained: true,
      sensitive_values_excluded: true,
      operation_values_excluded: true,
    },
  };
  assertPriority1BlockerSafeState(summary);
  return summary;
}

export function assertKBatchAuditSummarySafe(summary, context = "K-batch audit summary") {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_audit_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_SUMMARY_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["pass", "attention"].includes(summary.audit_status)) {
    throw new ContractError(`${context}: invalid audit status`);
  }
  for (const field of ["checked_count", "pass_count", "fail_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid count`, { field });
    }
  }
  if (summary.pass_count + summary.fail_count > summary.checked_count) {
    throw new ContractError(`${context}: count mismatch`);
  }
  if (!Array.isArray(summary.safe_labels) || summary.safe_labels.some((item) => item !== safeLabel(item))) {
    throw new ContractError(`${context}: invalid safe labels`);
  }
  assertBoundaryPolicy(summary.boundary_policy, context);
}

export function assertGitDiffStatSafeSummary(summary, context = "Git file delta summary") {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_git_file_delta_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_FILE_DELTA_SUMMARY_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["changed", "clean"].includes(summary.summary_status)) {
    throw new ContractError(`${context}: invalid status`);
  }
  if (!Number.isInteger(summary.file_count) || summary.file_count < 0) {
    throw new ContractError(`${context}: invalid file count`);
  }
  if (
    !Array.isArray(summary.changed_file_labels) ||
    summary.changed_file_labels.some((item) => item !== safeLabel(item))
  ) {
    throw new ContractError(`${context}: invalid file labels`);
  }
  assertFileDeltaBoundaryPolicy(summary.boundary_policy, context);
}

export function assertKBatchModifiedFilePolicyCheckSafe(
  summary,
  context = "K-batch modified file policy check"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_modified_file_policy_check_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_MODIFIED_FILE_POLICY_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["pass", "attention"].includes(summary.policy_status)) {
    throw new ContractError(`${context}: invalid policy status`);
  }
  if (!Number.isInteger(summary.checked_file_count) || summary.checked_file_count < 0) {
    throw new ContractError(`${context}: invalid checked file count`);
  }
  for (const field of [
    "docs_report_spec_changed",
    "rename_move_delete_detected",
    "broad_refactor_suspected",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid flag ${field}`);
    }
  }
  const attentionRequired =
    summary.docs_report_spec_changed ||
    summary.rename_move_delete_detected ||
    summary.broad_refactor_suspected;
  if (summary.policy_status !== (attentionRequired ? "attention" : "pass")) {
    throw new ContractError(`${context}: policy status mismatch`);
  }
  assertModifiedFilePolicyBoundaryPolicy(summary.boundary_policy, context);
}

export function assertKBatchCoreImmediateAuditFlagSafe(
  summary,
  context = "K-batch core immediate audit flag"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_core_immediate_audit_flag_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !SAFE_CORE_AUDIT_FLAG_FIELDS.has(field) ||
      (UNSAFE_FIELD_PATTERN.test(field) && field !== "candidate_boundary_changed")
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["pass", "attention"].includes(summary.audit_status)) {
    throw new ContractError(`${context}: invalid audit status`);
  }
  if (!Number.isInteger(summary.checked_file_count) || summary.checked_file_count < 0) {
    throw new ContractError(`${context}: invalid checked file count`);
  }
  const flagFields = [
    "core_contract_boundary_changed",
    "phase04_boundary_changed",
    "persistence_boundary_changed",
    "adapter_boundary_changed",
    "canonical_boundary_changed",
    "candidate_boundary_changed",
  ];
  for (const field of [...flagFields, "immediate_audit_required"]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid flag ${field}`);
    }
  }
  const expectedAuditRequired = flagFields.some((field) => summary[field] === true);
  if (
    summary.immediate_audit_required !== expectedAuditRequired ||
    summary.audit_status !== (expectedAuditRequired ? "attention" : "pass")
  ) {
    throw new ContractError(`${context}: audit status mismatch`);
  }
  assertModifiedFilePolicyBoundaryPolicy(summary.boundary_policy, context);
}

export function assertKBatchTargetNodeVerificationRecorderSafe(
  summary,
  context = "K-batch target Node verification recorder"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_target_node_verification_recorder_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !SAFE_TARGET_NODE_VERIFICATION_RECORDER_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["pass", "attention"].includes(summary.record_status)) {
    throw new ContractError(`${context}: invalid record status`);
  }
  if (!Array.isArray(summary.verification_results)) {
    throw new ContractError(`${context}: verification results required`);
  }
  let passCount = 0;
  let failCount = 0;
  for (const result of summary.verification_results) {
    assertKBatchTargetNodeVerificationResultSafe(result, context);
    if (result.verification_status === "pass") passCount += 1;
    if (result.verification_status === "fail") failCount += 1;
  }
  if (
    summary.verification_count !== summary.verification_results.length ||
    summary.pass_count !== passCount ||
    summary.fail_count !== failCount ||
    summary.record_status !== (failCount > 0 ? "attention" : "pass")
  ) {
    throw new ContractError(`${context}: verification count mismatch`);
  }
  assertTargetNodeVerificationBoundaryPolicy(summary.boundary_policy, context);
}

export function assertKBatchResidualRiskNormalizerSafe(
  summary,
  context = "K-batch residual risk normalizer"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_residual_risk_normalizer_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !SAFE_RESIDUAL_RISK_NORMALIZER_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["none", "attention"].includes(summary.risk_status)) {
    throw new ContractError(`${context}: invalid risk status`);
  }
  if (!Number.isInteger(summary.risk_count) || summary.risk_count < 0) {
    throw new ContractError(`${context}: invalid risk count`);
  }
  if (
    !Array.isArray(summary.risk_labels) ||
    summary.risk_labels.some((label) => label !== safeLabel(label))
  ) {
    throw new ContractError(`${context}: invalid risk labels`);
  }
  if (
    summary.risk_count !== summary.risk_labels.length ||
    summary.risk_status !== (summary.risk_labels.length > 0 ? "attention" : "none")
  ) {
    throw new ContractError(`${context}: risk count mismatch`);
  }
  if (typeof summary.whole_test_not_run_instruction_only !== "boolean") {
    throw new ContractError(`${context}: invalid whole test flag`);
  }
  assertResidualRiskBoundaryPolicy(summary.boundary_policy, context);
}

export function assertKBatchCompletionOneLineSummarySafe(
  summary,
  context = "K-batch completion one line summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_completion_one_line_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !SAFE_COMPLETION_ONE_LINE_SUMMARY_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["ready", "attention"].includes(summary.line_status)) {
    throw new ContractError(`${context}: invalid line status`);
  }
  if (summary.completed_k !== safeKLabel(summary.completed_k)) {
    throw new ContractError(`${context}: invalid completed K`);
  }
  for (const field of [
    "changed_files_label",
    "verification_result_label",
    "residual_risk_label",
  ]) {
    if (summary[field] !== safeLabel(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  const expectedLine = [
    summary.completed_k,
    summary.changed_files_label,
    summary.verification_result_label,
    summary.residual_risk_label,
  ].join(" / ");
  if (summary.one_line_summary !== expectedLine) {
    throw new ContractError(`${context}: one line mismatch`);
  }
  assertCompletionOneLineBoundaryPolicy(summary.boundary_policy, context);
}

export function assertKBatchAuditNgCompactReportSafe(
  report,
  context = "K-batch audit NG compact report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  assertNoUnsafeValues(report, context);
  if (report.schema !== "iris_k_batch_audit_ng_compact_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (
      !SAFE_AUDIT_NG_COMPACT_REPORT_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (report.report_status !== "ng") {
    throw new ContractError(`${context}: invalid report status`);
  }
  if (report.problem_k !== safeKLabel(report.problem_k)) {
    throw new ContractError(`${context}: invalid problem K`);
  }
  for (const field of [
    "problem_label",
    "recommended_fix_label",
    "residual_risk_label",
  ]) {
    if (report[field] !== safeLabel(report[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertAuditNgCompactBoundaryPolicy(report.boundary_policy, context);
}

export function assertKBatchNgRepairInstructionSafe(
  instruction,
  context = "K-batch NG repair instruction"
) {
  if (!instruction || typeof instruction !== "object" || Array.isArray(instruction)) {
    throw new ContractError(`${context}: instruction required`);
  }
  assertNoUnsafeValues(instruction, context);
  if (instruction.schema !== "iris_k_batch_ng_repair_instruction_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(instruction)) {
    if (
      !SAFE_NG_REPAIR_INSTRUCTION_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    instruction.instruction_status !== "ng_repair_required" ||
    instruction.problem_k !== safeKLabel(instruction.problem_k) ||
    instruction.problem_label !== safeLabel(instruction.problem_label) ||
    instruction.nearby_repair_policy_label !==
      safeLabel(instruction.nearby_repair_policy_label) ||
    !["none", "attention"].includes(instruction.residual_risk_label)
  ) {
    throw new ContractError(`${context}: invalid instruction`);
  }
  assertNgRepairInstructionBoundaryPolicy(instruction.boundary_policy, context);
}

export function assertKBatchNoAutoFixAuditModeSafe(
  summary,
  context = "K-batch no auto-fix audit mode"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_no_auto_fix_audit_mode_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !SAFE_NO_AUTO_FIX_AUDIT_MODE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["audit_only", "stop_on_ng"].includes(summary.audit_mode_status)) {
    throw new ContractError(`${context}: invalid audit mode status`);
  }
  if (summary.code_change_allowed !== false) {
    throw new ContractError(`${context}: code changes must remain blocked`);
  }
  for (const field of ["stop_required", "ng_detected"]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    summary.stop_required !== summary.ng_detected ||
    summary.audit_mode_status !== (summary.ng_detected ? "stop_on_ng" : "audit_only")
  ) {
    throw new ContractError(`${context}: audit stop mismatch`);
  }
  assertNoAutoFixAuditModeBoundaryPolicy(summary.boundary_policy, context);
}

export function assertKBatchNextRangeReadinessSafe(
  summary,
  context = "K-batch next range readiness"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_next_range_readiness_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !SAFE_NEXT_RANGE_READINESS_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["ok", "ng"].includes(summary.readiness_status)) {
    throw new ContractError(`${context}: invalid readiness status`);
  }
  for (const field of ["completed_range_label", "next_range_label"]) {
    if (summary[field] !== safeLabel(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of ["completed_count", "expected_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (typeof summary.next_range_allowed !== "boolean") {
    throw new ContractError(`${context}: invalid next range flag`);
  }
  if (summary.next_task_exploration_performed !== false) {
    throw new ContractError(`${context}: next task exploration must remain disabled`);
  }
  const ready = summary.completed_count === summary.expected_count;
  if (
    summary.next_range_allowed !== ready ||
    summary.readiness_status !== (ready ? "ok" : "ng")
  ) {
    throw new ContractError(`${context}: readiness mismatch`);
  }
  assertNextRangeReadinessBoundaryPolicy(summary.boundary_policy, context);
}

function assertKBatchTargetNodeVerificationResultSafe(result, context) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: verification result required`);
  }
  for (const field of Object.keys(result)) {
    if (
      !SAFE_TARGET_NODE_VERIFICATION_RESULT_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected verification field ${field}`);
    }
  }
  if (result.schema !== "iris_k_batch_target_node_verification_result_v1") {
    throw new ContractError(`${context}: invalid verification result schema`);
  }
  if (result.k_label !== safeKLabel(result.k_label)) {
    throw new ContractError(`${context}: invalid K label`);
  }
  if (!["pass", "fail"].includes(result.verification_status)) {
    throw new ContractError(`${context}: invalid verification status`);
  }
}

export function assertK301K400ReviewHookSafe(summary, context = "K301-K400 review hook") {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k301_k400_review_hook_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_REVIEW_HOOK_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.status !== "review_recommended" || summary.review_recommended !== true) {
    throw new ContractError(`${context}: invalid review status`);
  }
  if (summary.batch_label !== safeLabel(summary.batch_label)) {
    throw new ContractError(`${context}: invalid batch label`);
  }
  if (summary.next_step_label !== safeLabel(summary.next_step_label)) {
    throw new ContractError(`${context}: invalid next step label`);
  }
  assertReviewHookBoundaryPolicy(summary.boundary_policy, context);
}

export function assertK401K500CompletionReviewHookSafe(
  summary,
  context = "K401-K500 completion review hook"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k401_k500_completion_review_hook_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_REVIEW_HOOK_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.status !== "review_recommended" || summary.review_recommended !== true) {
    throw new ContractError(`${context}: invalid review status`);
  }
  if (summary.batch_label !== safeLabel(summary.batch_label)) {
    throw new ContractError(`${context}: invalid batch label`);
  }
  if (summary.next_step_label !== "k401_k500_completion_review") {
    throw new ContractError(`${context}: invalid next step label`);
  }
  assertReviewHookBoundaryPolicy(summary.boundary_policy, context);
}

export function assertK501K600CompletionReviewHookSafe(
  summary,
  context = "K501-K600 completion review hook"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k501_k600_completion_review_hook_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_REVIEW_HOOK_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.status !== "review_recommended" || summary.review_recommended !== true) {
    throw new ContractError(`${context}: invalid review status`);
  }
  if (summary.batch_label !== safeLabel(summary.batch_label)) {
    throw new ContractError(`${context}: invalid batch label`);
  }
  if (summary.next_step_label !== "k501_k600_completion_review") {
    throw new ContractError(`${context}: invalid next step label`);
  }
  assertReviewHookBoundaryPolicy(summary.boundary_policy, context);
}

export function assertK601K700CompletionReviewHookSafe(
  summary,
  context = "K601-K700 completion review hook"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k601_k700_completion_review_hook_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_REVIEW_HOOK_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.status !== "review_recommended" || summary.review_recommended !== true) {
    throw new ContractError(`${context}: invalid review status`);
  }
  if (summary.batch_label !== safeLabel(summary.batch_label)) {
    throw new ContractError(`${context}: invalid batch label`);
  }
  if (summary.next_step_label !== "k601_k700_completion_review") {
    throw new ContractError(`${context}: invalid next step label`);
  }
  assertReviewHookBoundaryPolicy(summary.boundary_policy, context);
}

export function assertK600ProductionReadinessCompletionReviewHookSafe(
  summary,
  context = "K600 production readiness completion review hook"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k600_production_readiness_completion_review_hook_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !SAFE_PRODUCTION_COMPLETION_REVIEW_HOOK_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    !["review_ready", "review_blocked"].includes(summary.status) ||
    !["ready", "blocked"].includes(summary.production_status) ||
    typeof summary.real_residency_confirmed !== "boolean" ||
    summary.review_recommended !== true
  ) {
    throw new ContractError(`${context}: invalid review status`);
  }
  if (summary.batch_label !== safeLabel(summary.batch_label)) {
    throw new ContractError(`${context}: invalid batch label`);
  }
  if (summary.next_step_label !== "k600_production_completion_review") {
    throw new ContractError(`${context}: invalid next step label`);
  }
  const expectedStatus = summary.real_residency_confirmed
    ? ["review_ready", "ready", "none"]
    : ["review_blocked", "blocked", "real_residency_unconfirmed"];
  if (
    summary.status !== expectedStatus[0] ||
    summary.production_status !== expectedStatus[1] ||
    summary.residual_risk_label !== expectedStatus[2]
  ) {
    throw new ContractError(`${context}: production blocker mismatch`);
  }
  assertProductionCompletionReviewHookBoundaryPolicy(summary.boundary_policy, context);
}

export function assertKBatchProductionBlockerCarryoverSafe(
  summary,
  context = "K-batch production blocker carryover"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_production_blocker_carryover_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !SAFE_PRODUCTION_BLOCKER_CARRYOVER_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    !["blocked", "clear"].includes(summary.carryover_status) ||
    summary.source_range_label !== safeLabel(summary.source_range_label) ||
    summary.next_range_label !== safeLabel(summary.next_range_label) ||
    !Number.isInteger(summary.blocked_count) ||
    summary.blocked_count < 0 ||
    !Array.isArray(summary.blocker_labels) ||
    summary.blocker_labels.some((item) => item !== safeLabel(item)) ||
    typeof summary.carryover_required !== "boolean" ||
    summary.readiness_exploration_performed !== false
  ) {
    throw new ContractError(`${context}: invalid carryover`);
  }
  if (
    summary.blocked_count !== summary.blocker_labels.length ||
    summary.carryover_required !== (summary.blocked_count > 0) ||
    summary.carryover_status !== (summary.blocked_count > 0 ? "blocked" : "clear")
  ) {
    throw new ContractError(`${context}: carryover mismatch`);
  }
  assertProductionBlockerCarryoverBoundaryPolicy(summary.boundary_policy, context);
}

export function assertKBatchRealModeBlockedPolicySafe(
  summary,
  context = "K-batch real-mode blocked policy"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_k_batch_real_mode_blocked_policy_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !SAFE_REAL_MODE_BLOCKED_POLICY_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    !["pass", "blocked"].includes(summary.policy_status) ||
    typeof summary.real_mode_confirmed !== "boolean" ||
    typeof summary.fixture_passed !== "boolean" ||
    !["ready", "blocked"].includes(summary.production_status) ||
    summary.blocked_reason_label !== safeLabel(summary.blocked_reason_label)
  ) {
    throw new ContractError(`${context}: invalid policy`);
  }
  const expected = summary.real_mode_confirmed
    ? ["pass", "ready", "none"]
    : ["blocked", "blocked", summary.blocked_reason_label];
  if (
    summary.policy_status !== expected[0] ||
    summary.production_status !== expected[1] ||
    (summary.real_mode_confirmed && summary.blocked_reason_label !== expected[2])
  ) {
    throw new ContractError(`${context}: real-mode readiness mismatch`);
  }
  if (!summary.real_mode_confirmed && summary.production_status !== "blocked") {
    throw new ContractError(`${context}: fixture pass must not produce real ready`);
  }
  assertRealModeBlockedPolicyBoundaryPolicy(summary.boundary_policy, context);
}

export function assertPriority1BlockerSafeState(
  summary,
  context = "priority1 blocker safe state"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeValues(summary, context);
  if (summary.schema !== "iris_priority1_blocker_safe_state_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !SAFE_PRIORITY1_BLOCKER_STATE_FIELDS.has(field) ||
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    summary.state_status !== "persisted" ||
    summary.priority_label !== "priority1" ||
    summary.component_label !== safeLabel(summary.component_label) ||
    summary.blocker_status !== "BLOCKED" ||
    summary.blocked_reason_label !== safeLabel(summary.blocked_reason_label) ||
    typeof summary.k_completion_seen !== "boolean" ||
    typeof summary.fixture_pass_seen !== "boolean" ||
    summary.production_status !== "blocked" ||
    summary.blocker_persisted !== true
  ) {
    throw new ContractError(`${context}: invalid priority1 blocker state`);
  }
  assertPriority1BlockerBoundaryPolicy(summary.boundary_policy, context);
}

function normalizeStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (status === "pass" || status === "ok") return "pass";
  if (status === "fail" || status === "ng") return "fail";
  return "unknown";
}

function normalizeVerificationStatus(value) {
  const status = normalizeStatus(value);
  return status === "fail" ? "fail" : "pass";
}

function safeLabel(value) {
  const label = String(value ?? "item")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return label && !UNSAFE_TEXT_PATTERN.test(label) ? label : "item";
}

function safeKLabel(value) {
  const match = String(value ?? "").trim().toUpperCase().match(/^K\d{1,4}$/);
  return match ? match[0].toLowerCase() : "k_unknown";
}

function safeRangeStart(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? Math.min(numeric, 9999) : 491;
}

function safeRangeSize(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? Math.min(numeric, 100) : 10;
}

function safeRangeLabel(start, size) {
  return safeLabel(`${safeKLabel(`K${start}`)}_${safeKLabel(`K${start + size - 1}`)}`);
}

function isWholeTestNotRunInstructionRisk(value) {
  const text = String(value?.label ?? value?.risk ?? value ?? "").toLowerCase();
  return (
    /whole|all|full|全体/.test(text) &&
    /test|テスト/.test(text) &&
    /not[_ -]?run|未実行|skipped|指示/.test(text)
  );
}

function safeResidualRiskLabel(value) {
  return safeLabel(value?.label ?? value?.risk ?? value ?? "residual_risk");
}

function summarizeChangedFilesLabel(files) {
  const count = Array.isArray(files) ? files.length : 0;
  if (count === 0) return "no_files";
  if (count === 1) return "one_file";
  return "multiple_files";
}

function summarizeSafeListLabel(items, fallback) {
  const labels = [
    ...new Set((Array.isArray(items) ? items : []).map((item) => safeLabel(item))),
  ].filter((item) => item !== "item");
  if (labels.length === 0) return safeLabel(fallback);
  if (labels.length === 1) return labels[0];
  return safeLabel(`${labels.length}_categories`);
}

function safeFileLabel(value) {
  const source = typeof value === "string" ? value : value?.path ?? value?.file ?? value?.name;
  const leaf = String(source ?? "file").split(/[\\/]/).filter(Boolean).pop() ?? "file";
  const label = safeLabel(leaf);
  return label === "item" ? "file" : label;
}

function parseGitStatusFileLabels(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => line.replace(/^[- MADRCU?!]{1,3}\s+/, ""))
    .map((line) => line.split(/\s+->\s+/).pop())
    .filter(Boolean);
}

function parseGitDiffStatFileLabels(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("|"))
    .map((line) => line.split("|")[0].trim())
    .filter(Boolean);
}

function collectPolicyFileEntries({ files, statusText }) {
  const explicitEntries = (Array.isArray(files) ? files : []).map((item) => ({
    path: typeof item === "string" ? item : item?.path ?? item?.file ?? item?.name,
    change_kind: safeChangeKind(typeof item === "object" ? item?.change_kind ?? item?.status : null),
  }));
  const statusEntries = parseGitStatusPolicyEntries(statusText);
  return [...explicitEntries, ...statusEntries].filter((entry) => entry.path);
}

function parseGitStatusPolicyEntries(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const status = line.slice(0, 2);
      const path = line.replace(/^[- MADRCU?!]{1,3}\s+/, "");
      return {
        path: path.split(/\s+->\s+/).pop(),
        change_kind: safeChangeKind(status),
      };
    })
    .filter((entry) => entry.path);
}

function safeChangeKind(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("r")) return "renamed";
  if (normalized.includes("d")) return "deleted";
  if (normalized === "moved" || normalized === "move") return "moved";
  return "modified";
}

function isDocsReportSpecPath(path) {
  const normalized = normalizedPath(path);
  return (
    normalized.startsWith("docs/") ||
    normalized.startsWith("report/") ||
    normalized.includes("/report/") ||
    /(^|\/)iris_spec[^/]*\.(md|txt)$/.test(normalized)
  );
}

function isRuntimeDataPath(path) {
  const normalized = normalizedPath(path);
  return (
    normalized.startsWith("data/") ||
    normalized.startsWith("log/") ||
    normalized.startsWith("logs/") ||
    normalized.startsWith("tmp/") ||
    normalized.startsWith(".tmp/") ||
    normalized.includes("/data/") ||
    normalized.includes("/logs/") ||
    normalized.includes("/tmp/")
  );
}

function normalizedPath(path) {
  return String(path ?? "").replace(/\\/g, "/").toLowerCase();
}

function isCoreContractPath(path) {
  return path.startsWith("src/core/") || path.includes("/contracts");
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

function assertModifiedFilePolicyBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    safe_flags_only: true,
    counts_only: true,
    file_paths_excluded: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    no_auto_fix: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertGitCleanGateBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    safe_flag_only: true,
    counts_only: true,
    file_paths_excluded: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    no_auto_fix: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertRuntimeDataIgnorePolicyBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    runtime_delta_safe_summary_only: true,
    runtime_data_not_counted_as_k_change: true,
    stash_restore_ignore_label_only: true,
    file_paths_excluded: true,
    counts_only: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    no_auto_fix: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertDocsSpecGuardBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    docs_spec_change_detected_as_ng: true,
    stop_without_auto_fix: true,
    safe_flag_only: true,
    file_paths_excluded: true,
    counts_only: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertCommitMessageSuggestionBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    suggestion_only: true,
    git_commit_not_performed: true,
    safe_label_only: true,
    raw_diff_excluded: true,
    file_paths_excluded: true,
    sensitive_values_excluded: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertCompletionReviewSummaryBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    one_line_summary_only: true,
    safe_labels_only: true,
    category_details_excluded: true,
    raw_logs_excluded: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    whole_test_not_run_instruction_excluded: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertTargetNodeVerificationBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    k_labels_and_pass_fail_only: true,
    counts_only: true,
    raw_logs_excluded: true,
    command_output_excluded: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    no_auto_fix: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertResidualRiskBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    safe_risk_labels_only: true,
    whole_test_not_run_instruction_excluded: true,
    counts_only: true,
    raw_logs_excluded: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    no_auto_fix: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertCompletionOneLineBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    one_line_only: true,
    safe_labels_only: true,
    file_paths_excluded: true,
    raw_logs_excluded: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    whole_test_not_run_instruction_excluded: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertAuditNgCompactBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    compact_ng_fields_only: true,
    problem_k_problem_fix_risk_only: true,
    safe_labels_only: true,
    long_report_excluded: true,
    raw_logs_excluded: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    no_auto_fix: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNgRepairInstructionBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    problem_k_problem_policy_risk_only: true,
    nearby_repair_only: true,
    compact_instruction_only: true,
    safe_labels_only: true,
    raw_logs_excluded: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    no_auto_fix: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNoAutoFixAuditModeBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    audit_only: true,
    no_code_changes: true,
    stop_on_ng: true,
    no_auto_fix: true,
    safe_status_only: true,
    raw_logs_excluded: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNextRangeReadinessBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    range_labels_and_counts_only: true,
    ok_ng_only: true,
    next_task_exploration_not_performed: true,
    task_details_excluded: true,
    raw_logs_excluded: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    no_auto_fix: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertFileDeltaBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    safe_file_labels_only: true,
    counts_only: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    large_text_excluded: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertReviewHookBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    safe_status_only: true,
    code_change_not_required: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    personal_values_excluded: true,
    operation_values_excluded: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertProductionCompletionReviewHookBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    safe_completion_status_only: true,
    production_blocker_preserved: true,
    fixture_pass_not_real_ready: true,
    real_residency_risk_retained: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    operation_values_excluded: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertProductionBlockerCarryoverBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    safe_carryover_labels_only: true,
    production_blocked_status_preserved: true,
    next_range_carryover_only: true,
    readiness_exploration_not_performed: true,
    counts_only: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    operation_values_excluded: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertRealModeBlockedPolicyBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    real_mode_unconfirmed_blocks_ready: true,
    fixture_pass_separated_from_real_mode: true,
    safe_status_only: true,
    source_delta_values_excluded: true,
    sensitive_values_excluded: true,
    operation_values_excluded: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertPriority1BlockerBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const expected = {
    safe_state_only: true,
    priority1_blocked_status_preserved: true,
    k_completion_does_not_clear_blocker: true,
    fixture_pass_does_not_clear_blocker: true,
    real_residency_wait_retained: true,
    sensitive_values_excluded: true,
    operation_values_excluded: true,
  };
  const allowed = new Set(Object.keys(expected));
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (policy[field] !== expectedValue) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNoUnsafeValues(value, context, path = "root") {
  if (typeof value === "string") {
    if (UNSAFE_TEXT_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe value exposed`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUnsafeValues(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (
      !path.endsWith(".boundary_policy") &&
      UNSAFE_FIELD_PATTERN.test(field) &&
      field !== "candidate_boundary_changed"
    ) {
      throw new ContractError(`${context}: unsafe field exposed`, { field, path });
    }
    assertNoUnsafeValues(child, context, `${path}.${field}`);
  }
}
