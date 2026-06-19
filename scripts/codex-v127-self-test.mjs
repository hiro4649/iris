#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.7

import fs from 'node:fs';
import { writeJsonReport, exitFor } from './codex-v080-lib.mjs';
import {
  V127_OPERATOR_STATUS_KEYS,
  V127_P0_ARTIFACTS,
  buildOrchestrationCapsule,
  validateBlockerClosureAndProductValuePressure,
  validateContextOutputOwnerInterruptTokenBudget,
  validateDecisionEvidenceEnvelopeAndSameHeadBinder,
  validateOrchestrationCapsule,
  validateTypedOwnerProcessReceiptAndContinuationKernel,
  validateV127PermissionGrantReceiptCoherence,
  validateValidationDagAndContentAddressedReuse,
} from './codex-orchestration-capsule.mjs';
import { buildWorkerProofCapsule, validateWorkerProofCapsule } from './codex-worker-proof-capsule.mjs';
import { buildOwnerDecisionBrief, validateOwnerDecisionBrief } from './codex-owner-decision-brief.mjs';
import { buildSameHeadArtifactEvidenceReport } from './codex-same-head-artifact-evidence-gate.mjs';
import { buildWorkflowQualityRunnerReport, resolveWorkflowQualityRunnerExitCode } from './codex-workflow-quality-runner.mjs';

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail', safeSummaryOnly: true };
  } catch {
    return { name, status: 'fail', reasonCodes: ['self_test_exception'], safeSummaryOnly: true };
  }
}

function passed(status) {
  return status?.status === 'pass';
}

function failed(status) {
  return status?.status === 'fail';
}

const VALID_PROCESS_RECEIPT = {
  present: true,
  receiptId: 'receipt-v127-source-body',
  taskId: 'task-v127-source-body',
  ownerInstructionHash: 'sha256:owner-instruction-v127',
  allowedActions: ['edit', 'check', 'commit', 'push', 'create_pr'],
};

const SAME_HEAD_ENVELOPE = {
  lane: 'same_head_remote_qg',
  localHead: 'abc123',
  prHead: 'abc123',
  workflowHead: 'abc123',
  artifactHead: 'abc123',
  remoteGate: 'pass',
  allowedNextAction: 'owner_merge_decision_only',
};

const OBSERVED_WORKTREE_STATE = {
  currentBranch: 'harness127-remote-technical-failure-coherence',
  requireObservedGitState: true,
  headSha: 'abc123',
  baseHeadSha: 'base123',
  originMainHeadSha: 'base123',
  mergeBaseSha: 'base123',
  changedFiles: ['scripts/codex-workflow-quality-runner.mjs'],
  allowedFiles: ['scripts/codex-workflow-quality-runner.mjs'],
  forbiddenFiles: [],
  changedFilesWithinAllowed: true,
  forbiddenFilesTouched: false,
  observedPrState: 'open',
};

const TARGET_REQUIRED_PASS_STATUSES = Object.fromEntries([
  'targetManifestStatus',
  'secretScan',
  'environmentReadinessStatus',
  'changeClassificationStatus',
  'productVerificationStatus',
  'productVerificationEvidenceStatus',
  'testMetricsStatus',
  'remoteProductBaselineStatus',
  'remoteNpmDiagnosticStatus',
  'workflowPreflightStatus',
  'safeArtifactIndexStatus',
  'openPrHygieneStatus',
  'targetFinalSummaryStatus',
  'stalePrAuditStatus',
  'reasonSummaryStatus',
  'safeOutputScanStatus',
  'safeArtifactValidation',
  'outputShapeStatus',
].map((key) => [key, { status: 'pass', safeSummaryOnly: true }]));

function resolveHarnessMode(env = process.env) {
  if (env.CODEX_HARNESS_MODE === 'target') return 'target';
  if (env.CODEX_HARNESS_SOURCE_REPO === '1' || env.CODEX_HARNESS_MODE === 'core' || env.CODEX_HARNESS_MODE === 'source') return 'source';
  try {
    const manifest = JSON.parse(fs.readFileSync('docs/process/CODEX_HARNESS_MANIFEST.json', 'utf8'));
    if (manifest.targetRepoMode === true) return 'target';
    if (manifest.sourceOnlyRelease === true) return 'source';
  } catch {
    // Source-body self-test fixtures may omit the target manifest.
  }
  return 'source';
}

function activeManifestPathsForMode(env = process.env) {
  return resolveHarnessMode(env) === 'target'
    ? ['docs/process/CODEX_HARNESS_MANIFEST.json']
    : ['CODEX_SOURCE_HARNESS_MANIFEST.json', 'docs/process/CODEX_HARNESS_MANIFEST.json'];
}

function manifestThemeMatchesActiveVersion() {
  const manifests = activeManifestPathsForMode().map((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
  return manifests.every((manifest) => manifest.activeHarnessVersion === '1.2.7'
    && manifest.activeSelfTestSuite === 'v127'
    && manifest.theme === 'Receipt-Carried Continuation and Evidence Compression');
}

function readCurrentAgents() {
  return fs.readFileSync('AGENTS.md', 'utf8');
}

function normalizedIncludes(content, expected) {
  return content.replace(/\s+/g, ' ').includes(expected.replace(/\s+/g, ' '));
}

const cases = [
  ['v127_self_test_must_pass', () => true],
  ['v127_adds_no_new_p0_artifact', () => V127_P0_ARTIFACTS.length === 3 && V127_P0_ARTIFACTS.includes('codex-orchestration-capsule.safe.json')],
  ['v127_adds_no_new_top_level_status', () => V127_OPERATOR_STATUS_KEYS.length === 8 && !V127_OPERATOR_STATUS_KEYS.includes('decisionEvidenceEnvelopeStatus')],
  ['v127_preserves_v118_final_decision', () => buildOrchestrationCapsule().finalAuthority === 'v1.1.8_final_decision_kernel'],
  ['v127_active_authority_tuple_is_current', () => {
    const tuple = buildOrchestrationCapsule().skillContextRouting.activeAuthorityTuple;
    return tuple.agentsMarker === 'CODEX_QUALITY_HARNESS_FILE v1.2.7'
      && tuple.manifestActiveHarnessVersion === '1.2.7'
      && tuple.activeSelfTestSuite === 'v127'
      && tuple.activeSpecPath === 'docs/process/CODEX_V127_SPEC.md';
  }],
  ['agents_active_harness_is_v127', () => readCurrentAgents().includes('CODEX_QUALITY_HARNESS_FILE v1.2.7')
    && readCurrentAgents().includes('Active target harness: v1.2.7 / v127.')],
  ['agents_local_task_discipline_uses_v127', () => normalizedIncludes(readCurrentAgents(), 'Run v127 self-test and the local quality gate for v1.2.7 harness work.')],
  ['agents_v126_is_compatibility_not_primary', () => normalizedIncludes(readCurrentAgents(), 'Run v126 only as a blocking compatibility test where required.')
    && !normalizedIncludes(readCurrentAgents(), 'Run v125 only as a blocking compatibility test where required.')],
  ['agents_v127_receipt_carried_continuation_line_present', () => normalizedIncludes(readCurrentAgents(), `v1.2.7 adds only typed owner process and conditional merge receipts,
same-head decision evidence envelopes, content-addressed validation reuse,
and context/output/owner-interrupt compression inside existing P0 artifacts.`)],
  ['agents_no_new_p0_artifact_language_preserved', () => readCurrentAgents().includes('Do not add new P0 artifacts')],
  ['agents_no_new_top_level_status_language_preserved', () => readCurrentAgents().includes('top-level statuses')],
  ['agents_no_runtime_or_readiness_scope_expansion', () => readCurrentAgents().includes('runtime code, or readiness claims')
    && !readCurrentAgents().includes('runtime readiness is claimed')
    && !readCurrentAgents().includes('production readiness is claimed')],
  ['process_receipt_survives_in_scope_commit_head_changes', () => passed(validateTypedOwnerProcessReceiptAndContinuationKernel(buildOrchestrationCapsule({
    typedOwnerProcessReceiptAndContinuationKernel: {
      ownerProcessReceipt: VALID_PROCESS_RECEIPT,
    },
  }).typedOwnerProcessReceiptAndContinuationKernel))],
  ['receipt_without_owner_provenance_fails', () => failed(validateTypedOwnerProcessReceiptAndContinuationKernel(buildOrchestrationCapsule({
    typedOwnerProcessReceiptAndContinuationKernel: {
      ownerProcessReceipt: { present: true, allowedActions: ['edit', 'check', 'commit', 'push', 'create_pr'] },
      continuationDecision: { state: 'continue' },
    },
  }).typedOwnerProcessReceiptAndContinuationKernel))],
  ['exact_head_merge_receipt_expires_on_head_change', () => failed(validateTypedOwnerProcessReceiptAndContinuationKernel(buildOrchestrationCapsule({
    typedOwnerProcessReceiptAndContinuationKernel: {
      ownerConditionalMergeReceipt: { present: true, scope: 'exact_head', headSha: null },
    },
  }).typedOwnerProcessReceiptAndContinuationKernel))],
  ['conditional_merge_receipt_requires_new_same_head_pass', () => failed(validateDecisionEvidenceEnvelopeAndSameHeadBinder(buildOrchestrationCapsule({
    decisionEvidenceEnvelopeAndSameHeadBinder: {
      decisionEvidenceEnvelope: { lane: 'merge_boundary', remoteGate: 'pending', sameHead: true, ownerReceiptBinding: 'valid', allowedNextAction: 'merge_current_pr' },
    },
  }).decisionEvidenceEnvelopeAndSameHeadBinder))],
  ['scope_delta_invalidates_receipt', () => failed(validateTypedOwnerProcessReceiptAndContinuationKernel(buildOrchestrationCapsule({
    typedOwnerProcessReceiptAndContinuationKernel: {
      ownerProcessReceipt: VALID_PROCESS_RECEIPT,
      continuationDecision: { state: 'continue', receiptValid: true, scopeDeltaDetected: true },
    },
  }).typedOwnerProcessReceiptAndContinuationKernel))],
  ['out_of_scope_file_invalidates_continuation', () => failed(validateTypedOwnerProcessReceiptAndContinuationKernel(buildOrchestrationCapsule({
    typedOwnerProcessReceiptAndContinuationKernel: {
      ownerProcessReceipt: { ...VALID_PROCESS_RECEIPT, expiresOnScopeDelta: false },
      continuationDecision: { state: 'continue' },
    },
  }).typedOwnerProcessReceiptAndContinuationKernel))],
  ['install_rollout_does_not_authorize_runtime_operation', () => failed(validateTypedOwnerProcessReceiptAndContinuationKernel(buildOrchestrationCapsule({
    typedOwnerProcessReceiptAndContinuationKernel: {
      normalizedOwnerIntent: 'harness_target_rollout_complete',
      ownerDangerousCapabilityReceipt: { present: false, deployAllowed: true },
    },
  }).typedOwnerProcessReceiptAndContinuationKernel))],
  ['required_check_failure_is_not_owner_overridable', () => failed(validateDecisionEvidenceEnvelopeAndSameHeadBinder(buildOrchestrationCapsule({
    decisionEvidenceEnvelopeAndSameHeadBinder: {
      decisionEvidenceEnvelope: { lane: 'merge_boundary', remoteGate: 'fail', sameHead: true, ownerReceiptBinding: 'valid', allowedNextAction: 'merge_current_pr' },
    },
  }).decisionEvidenceEnvelopeAndSameHeadBinder))],
  ['avoidable_owner_stop_is_detected', () => failed(validateTypedOwnerProcessReceiptAndContinuationKernel(buildOrchestrationCapsule({
    typedOwnerProcessReceiptAndContinuationKernel: {
      ownerProcessReceipt: VALID_PROCESS_RECEIPT,
      continuationDecision: { state: 'continue', avoidableOwnerStopDetected: true, receiptValid: true },
    },
  }).typedOwnerProcessReceiptAndContinuationKernel))],
  ['justified_owner_boundary_is_not_penalized', () => passed(validateTypedOwnerProcessReceiptAndContinuationKernel(buildOrchestrationCapsule({
    typedOwnerProcessReceiptAndContinuationKernel: { continuationDecision: { state: 'justified_owner_boundary', avoidableOwnerStopDetected: false, receiptValid: false } },
  }).typedOwnerProcessReceiptAndContinuationKernel))],
  ['ambiguous_scope_allows_one_initial_question', () => passed(validateTypedOwnerProcessReceiptAndContinuationKernel(buildOrchestrationCapsule({
    typedOwnerProcessReceiptAndContinuationKernel: { continuationDecision: { state: 'clarify_once', receiptValid: false } },
  }).typedOwnerProcessReceiptAndContinuationKernel))],
  ['decision_evidence_envelope_rejects_head_mismatch', () => failed(validateDecisionEvidenceEnvelopeAndSameHeadBinder(buildOrchestrationCapsule({
    decisionEvidenceEnvelopeAndSameHeadBinder: { decisionEvidenceEnvelope: { lane: 'same_head_remote_qg', localHead: 'abc123', prHead: 'def456', workflowHead: 'abc123', artifactHead: 'abc123', oneBlockingReason: null } },
  }).decisionEvidenceEnvelopeAndSameHeadBinder))],
  ['same_head_true_with_null_heads_fails', () => failed(validateDecisionEvidenceEnvelopeAndSameHeadBinder({
    runtimeVersion: '1.2.7',
    decisionEvidenceEnvelope: { lane: 'same_head_remote_qg', sameHead: true, remoteGate: 'pass', allowedNextAction: 'owner_merge_decision_only', prBodyMachineEvidence: false },
    sameHeadBinder: { rejectsHeadMismatch: true, prBodyIsDisplayOnly: true, sameHeadDerivedFromHashes: true, allRequiredHeadsPresent: false, allRequiredHeadsMatch: false },
  }))],
  ['same_head_hash_mismatch_fails', () => failed(validateDecisionEvidenceEnvelopeAndSameHeadBinder({
    runtimeVersion: '1.2.7',
    decisionEvidenceEnvelope: { lane: 'same_head_remote_qg', sameHead: true, remoteGate: 'pass', allowedNextAction: 'owner_merge_decision_only', prBodyMachineEvidence: false },
    sameHeadBinder: { rejectsHeadMismatch: true, prBodyIsDisplayOnly: true, sameHeadDerivedFromHashes: true, allRequiredHeadsPresent: true, allRequiredHeadsMatch: false },
  }))],
  ['remote_run_emits_remote_lane', () => {
    const control = buildOrchestrationCapsule({
      decisionEvidenceEnvelopeAndSameHeadBinder: { decisionEvidenceEnvelope: SAME_HEAD_ENVELOPE },
    }).decisionEvidenceEnvelopeAndSameHeadBinder;
    return control.decisionEvidenceEnvelope.allowedNextAction === 'owner_merge_decision_only'
      && passed(validateDecisionEvidenceEnvelopeAndSameHeadBinder(control));
  }],
  ['workflow_runner_fails_when_remote_npm_exit_failed_despite_final_decision_zero', () => failed(buildWorkflowQualityRunnerReport({
    status: 'fail',
    targetQualityScoreStatus: { status: 'pass' },
    finalDecision: { exitCode: 0, safeNextAction: 'owner_merge_decision_only' },
  }, { gateExit: 1 }))],
  ['workflow_runner_fails_when_gate_exit_nonzero_even_if_report_status_pass', () => failed(buildWorkflowQualityRunnerReport({
    ...TARGET_REQUIRED_PASS_STATUSES,
    status: 'pass',
    targetQualityScoreStatus: { status: 'pass' },
    finalDecision: { exitCode: 0, safeNextAction: 'owner_merge_decision_only' },
  }, { gateExit: 1 }))],
  ['workflow_runner_fails_when_report_status_fail_despite_final_decision_zero', () => failed(buildWorkflowQualityRunnerReport({
    status: 'fail',
    targetQualityScoreStatus: { status: 'pass' },
    finalDecision: { exitCode: 0, safeNextAction: 'owner_merge_decision_only' },
  }))],
  ['workflow_runner_fails_when_target_quality_fails_despite_final_decision_zero', () => failed(buildWorkflowQualityRunnerReport({
    status: 'pass',
    targetQualityScoreStatus: { status: 'fail' },
    finalDecision: { exitCode: 0, safeNextAction: 'owner_merge_decision_only' },
  }))],
  ['workflow_runner_exit_fails_when_technical_pass_but_final_decision_nonzero', () => resolveWorkflowQualityRunnerExitCode({
    failures: [],
  }, { exitCode: 1 }) === 1],
  ['workflow_runner_exit_passes_when_technical_pass_and_owner_only_final_decision_zero', () => resolveWorkflowQualityRunnerExitCode({
    failures: [],
  }, { exitCode: 0, safeNextAction: 'owner_merge_decision_only' }) === 0],
  ['workflow_runner_exit_fails_when_technical_failure_even_with_final_decision_zero', () => resolveWorkflowQualityRunnerExitCode({
    failures: ['targetQualityScoreStatus=fail'],
  }, { exitCode: 0 }) === 1],
  ['workflow_runner_allows_owner_only_boundary_after_technical_pass', () => passed(buildWorkflowQualityRunnerReport({
    ...TARGET_REQUIRED_PASS_STATUSES,
    status: 'pass',
    targetQualityScoreStatus: { status: 'pass' },
    targetMergeReady: true,
    technicalChecksReady: true,
    ownerMergeAuthorized: false,
    finalDecision: { exitCode: 0, safeNextAction: 'owner_merge_decision_only' },
    blockingReasons: ['owner_merge_instruction'],
  }))],
  ['same_head_artifact_missing_fails_even_when_artifact_not_explicitly_required', () => failed(buildSameHeadArtifactEvidenceReport({
    forceCheck: true,
    localHeadSha: 'abc123',
    prHeadSha: 'abc123',
    workflowHeadSha: 'abc123',
    artifactHeadSha: '',
    artifactRequired: false,
  }))],
  ['same_head_artifact_mismatch_fails', () => failed(buildSameHeadArtifactEvidenceReport({
    forceCheck: true,
    localHeadSha: 'abc123',
    prHeadSha: 'abc123',
    workflowHeadSha: 'abc123',
    artifactHeadSha: 'def456',
  }))],
  ['same_head_four_hashes_present_and_match_passes', () => passed(buildSameHeadArtifactEvidenceReport({
    forceCheck: true,
    localHeadSha: 'abc123',
    prHeadSha: 'abc123',
    workflowHeadSha: 'abc123',
    artifactHeadSha: 'abc123',
  }))],
  ['same_head_artifact_outputs_actual_values_and_derived_match_status', () => {
    const report = buildSameHeadArtifactEvidenceReport({
      forceCheck: true,
      localHeadSha: 'abc123',
      prHeadSha: 'abc123',
      workflowHeadSha: 'abc123',
      artifactHeadSha: 'abc123',
      workflowRunId: '27827243980',
      artifactName: 'codex-quality-gate-safe-artifacts',
      artifactPointer: 'github-actions://hiro4649/iris/runs/27827243980/artifacts/codex-quality-gate-safe-artifacts',
    });
    const details = report.sameHeadArtifactEvidenceStatus || {};
    return passed(report)
      && details.expectedHeadSha === 'abc123'
      && details.localHeadSha === 'abc123'
      && details.prHeadSha === 'abc123'
      && details.workflowHeadSha === 'abc123'
      && details.artifactHeadSha === 'abc123'
      && details.allRequiredHeadsPresent === true
      && details.allRequiredHeadsMatch === true
      && details.sameHead === true
      && details.workflowRunId === '27827243980'
      && details.artifactPointer.includes('/runs/27827243980/');
  }],
  ['same_head_stale_safe_summary_observation_does_not_override_required_four_heads', () => passed(buildSameHeadArtifactEvidenceReport({
    forceCheck: true,
    localHeadSha: 'abc123',
    prHeadSha: 'abc123',
    workflowHeadSha: 'abc123',
    artifactHeadSha: 'abc123',
    safeSummaryHeadSha: 'def456',
  }))],
  ['worker_proof_observed_state_missing_fails_when_required', () => failed(validateWorkerProofCapsule(buildWorkerProofCapsule({
    observedGitWorktreePrState: { requireObservedGitState: true },
  })))],
  ['worker_proof_observed_state_present_passes_when_required', () => passed(validateWorkerProofCapsule(buildWorkerProofCapsule({
    changedFiles: OBSERVED_WORKTREE_STATE.changedFiles,
    observedGitWorktreePrState: OBSERVED_WORKTREE_STATE,
  })))],
  ['worker_proof_forbidden_observed_file_fails', () => failed(validateWorkerProofCapsule(buildWorkerProofCapsule({
    changedFiles: ['package.json'],
    observedGitWorktreePrState: {
      ...OBSERVED_WORKTREE_STATE,
      changedFiles: ['package.json'],
      allowedFiles: ['scripts/codex-local-quality-gate.mjs'],
      forbiddenFiles: ['package.json'],
      changedFilesWithinAllowed: false,
      forbiddenFilesTouched: true,
    },
  })))],
  ['worker_proof_local_clean_main_allows_empty_changed_files_when_not_required', () => passed(validateWorkerProofCapsule(buildWorkerProofCapsule({
    changedFiles: [],
    observedGitWorktreePrState: {
      currentBranch: 'main',
      requireObservedGitState: false,
      headSha: 'abc123',
      baseHeadSha: 'abc123',
      originMainHeadSha: 'abc123',
      mergeBaseSha: 'abc123',
      changedFiles: [],
      allowedFiles: ['scripts/codex-local-quality-gate.mjs'],
      forbiddenFiles: [],
      changedFilesWithinAllowed: true,
      forbiddenFilesTouched: false,
      observedPrState: 'none',
    },
  })))],
  ['invalid_next_action_fails_without_builder_fallback', () => failed(validateDecisionEvidenceEnvelopeAndSameHeadBinder({
    runtimeVersion: '1.2.7',
    decisionEvidenceEnvelope: { ...SAME_HEAD_ENVELOPE, allowedNextAction: 'invalid_action', sameHead: true, prBodyMachineEvidence: false },
    sameHeadBinder: { rejectsHeadMismatch: true, prBodyIsDisplayOnly: true, sameHeadDerivedFromHashes: true, allRequiredHeadsPresent: true, allRequiredHeadsMatch: true },
  }))],
  ['ci_cache_invalidates_on_script_lockfile_or_runner_change', () => failed(validateValidationDagAndContentAddressedReuse(buildOrchestrationCapsule({
    validationDagAndContentAddressedReuse: { invalidatesOn: ['validation_script'] },
  }).validationDagAndContentAddressedReuse))],
  ['validation_cache_placeholder_fails', () => failed(validateValidationDagAndContentAddressedReuse(buildOrchestrationCapsule({
    validationDagAndContentAddressedReuse: {
      validationCacheKey: { headSha: 'unknown', scriptDigest: 'required', runnerImage: 'unknown', nodeOrRuntimeVersion: 'unknown' },
    },
  }).validationDagAndContentAddressedReuse))],
  ['nightly_full_gate_does_not_replace_premerge_required_checks', () => failed(validateValidationDagAndContentAddressedReuse(buildOrchestrationCapsule({
    validationDagAndContentAddressedReuse: { nightlyFullGateReplacesPremergeRequiredChecks: true },
  }).validationDagAndContentAddressedReuse))],
  ['portfolio_rollout_counts_as_one_harness_cycle', () => passed(validateBlockerClosureAndProductValuePressure(buildOrchestrationCapsule().blockerClosureAndProductValuePressure))],
  ['neutral_skill_is_not_disabled_after_two_samples', () => failed(validateBlockerClosureAndProductValuePressure(buildOrchestrationCapsule({
    blockerClosureAndProductValuePressure: { skillRoiOptimization: { roiStatus: 'neutral', disabledAfterTwoNeutralSamples: true } },
  }).blockerClosureAndProductValuePressure))],
  ['mandatory_safety_skill_cannot_be_roi_disabled', () => failed(validateBlockerClosureAndProductValuePressure(buildOrchestrationCapsule({
    blockerClosureAndProductValuePressure: { skillRoiOptimization: { mandatorySafetySkill: true, roiStatus: 'negative' } },
  }).blockerClosureAndProductValuePressure))],
  ['final_report_line_budget_enforced', () => failed(validateContextOutputOwnerInterruptTokenBudget(buildOrchestrationCapsule({
    contextOutputOwnerInterruptTokenBudget: { operatorOutputLines: 25, finalReportLineBudget: 12 },
  }).contextOutputOwnerInterruptTokenBudget))],
  ['repeated_safety_text_suppressed', () => failed(validateContextOutputOwnerInterruptTokenBudget(buildOrchestrationCapsule({
    contextOutputOwnerInterruptTokenBudget: { repeatedSafetyTextSuppressed: false },
  }).contextOutputOwnerInterruptTokenBudget))],
  ['token_observed_default_is_false', () => buildOrchestrationCapsule().contextOutputOwnerInterruptTokenBudget.tokenEconomyMetrics.observed === false],
  ['token_metrics_must_be_observed', () => failed(validateContextOutputOwnerInterruptTokenBudget(buildOrchestrationCapsule({
    contextOutputOwnerInterruptTokenBudget: { observed: false, requireObservedMetrics: true },
  }).contextOutputOwnerInterruptTokenBudget))],
  ['token_observed_metrics_require_source_and_bytes', () => failed(validateContextOutputOwnerInterruptTokenBudget(buildOrchestrationCapsule({
    contextOutputOwnerInterruptTokenBudget: { observed: true, requireObservedMetrics: true, metricsSource: 'not_observed', safeArtifactBytes: 0, outputLineCount: 0 },
  }).contextOutputOwnerInterruptTokenBudget))],
  ['token_observed_metrics_with_source_pass', () => passed(validateContextOutputOwnerInterruptTokenBudget(buildOrchestrationCapsule({
    contextOutputOwnerInterruptTokenBudget: { observed: true, requireObservedMetrics: true, metricsSource: 'quality_gate_runtime_generated_artifact_sizes', countsSource: 'declared_budget', observedCounts: false, routineArtifactBytes: 120, safeArtifactBytes: 1200, outputLineCount: 8 },
  }).contextOutputOwnerInterruptTokenBudget))],
  ['token_declared_counts_cannot_claim_observed', () => failed(validateContextOutputOwnerInterruptTokenBudget(buildOrchestrationCapsule({
    contextOutputOwnerInterruptTokenBudget: { observed: true, requireObservedMetrics: true, metricsSource: 'quality_gate_runtime_generated_artifact_sizes', countsSource: 'declared_budget', observedCounts: true, routineArtifactBytes: 120, safeArtifactBytes: 1200, outputLineCount: 8 },
  }).contextOutputOwnerInterruptTokenBudget))],
  ['permission_grant_receipt_contradiction_fails', () => failed(validateV127PermissionGrantReceiptCoherence(buildOrchestrationCapsule({
    typedOwnerProcessReceiptAndContinuationKernel: {
      ownerProcessReceipt: { ...VALID_PROCESS_RECEIPT, allowedActions: ['edit', 'check', 'commit'] },
    },
    permissionEvidenceSource: 'owner_process_receipt',
    mutationPermissionAuthority: 'owner_explicit_only',
    createPr: true,
  })))],
  ['manifest_theme_matches_active_version', () => manifestThemeMatchesActiveVersion()],
  ['target_mode_does_not_require_source_manifest', () => activeManifestPathsForMode({ CODEX_HARNESS_MODE: 'target' }).join('|') === 'docs/process/CODEX_HARNESS_MANIFEST.json'],
  ['target_mode_stray_source_manifest_cannot_select_source', () => resolveHarnessMode({
    CODEX_HARNESS_MODE: 'target',
    CODEX_HARNESS_SOURCE_REPO: '',
  }) === 'target'],
  ['owner_brief_default_v127_receipts_pass', () => passed(validateOwnerDecisionBrief(buildOwnerDecisionBrief()))],
  ['owner_brief_does_not_stop_for_commit_push_pr_when_process_receipt_valid', () => passed(validateOwnerDecisionBrief(buildOwnerDecisionBrief({
    typedOwnerProcessReceipt: { ...VALID_PROCESS_RECEIPT, normalizedOwnerIntent: 'harness_source_develop_and_publish' },
    continuationDecision: { state: 'continue', oneSafeNextAction: 'continue_commit_push_create_pr' },
  })))],
  ['owner_brief_contains_current_self_test', () => buildOwnerDecisionBrief().proofCompleted.includes('v127_self_test')],
  ['worker_proof_v127_marker_compatibility_pass', () => passed(validateWorkerProofCapsule(buildWorkerProofCapsule({
    changedFiles: OBSERVED_WORKTREE_STATE.changedFiles,
    observedGitWorktreePrState: OBSERVED_WORKTREE_STATE,
  })))],
  ['orchestration_capsule_validates_all_v127_internal_blocks', () => Object.values(validateOrchestrationCapsule(buildOrchestrationCapsule())).every((item) => item.status === 'pass')],
].map(([name, fn]) => test(name, fn));

const fixtureGroups = [
  'v118_v119_v120_v121_v122_v123_v124_v125_v126_compatibility_matrix',
  'typed_owner_process_receipt_and_continuation_kernel_matrix',
  'decision_evidence_envelope_same_head_binder_matrix',
  'validation_dag_content_addressed_reuse_matrix',
  'context_output_owner_interrupt_token_budget_matrix',
  'blocker_closure_product_value_pressure_matrix',
];

const failures = cases.filter((item) => item.status !== 'pass');
const report = {
  v127SelfTestStatus: {
    status: failures.length ? 'fail' : 'pass',
    caseCount: cases.length,
    failureCount: failures.length,
    fixtureGroups,
    safeSummaryOnly: true,
  },
  cases,
  status: failures.length ? 'fail' : 'pass',
  safeSummaryOnly: true,
};

writeJsonReport(report, 'CODEX_V127_SELF_TEST_REPORT');
if (!process.env.CODEX_V127_SELF_TEST_REPORT && process.env.CODEX_QUALITY_REPORT !== 'json') {
  console.log(`v127SelfTestStatus: ${report.v127SelfTestStatus.status}`);
}
exitFor(report);
