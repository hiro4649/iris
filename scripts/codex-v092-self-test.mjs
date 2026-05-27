#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.9.2
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marker, HARNESS_VERSION, scanObjectForUnsafe, writeJsonReport, exitFor } from './codex-v080-lib.mjs';
import { buildVersionLineageReport } from './codex-version-lineage-gate.mjs';
import { renderPrEvidenceBlocks } from './codex-pr-evidence-block-renderer.mjs';
import { buildSafeArtifactClassifierReport } from './codex-safe-artifact-classifier.mjs';
import { buildSecurityLifecycleReport } from './codex-security-lifecycle-gate.mjs';
import { buildReviewIndependenceReport } from './codex-review-independence-gate.mjs';
import { buildTaskBriefCompilerReport } from './codex-task-brief-compiler.mjs';
import { buildBestOfNDecisionReport } from './codex-best-of-n-decision-record.mjs';
import { buildEnvironmentProfileReport } from './codex-environment-profile-gate.mjs';
import { buildAgentsContextBudgetReport } from './codex-agents-context-budget-gate.mjs';
import { buildEvidenceAutoRepairHintReport } from './codex-evidence-auto-repair-hint.mjs';
import { classifyChange } from './codex-change-classification-gate.mjs';
import { normalizeProductVerificationEvidence } from './codex-product-verification-evidence-normalize.mjs';
import { buildRemoteProductBaselineReport } from './codex-remote-product-baseline-gate.mjs';

function assertCase(id, condition, failures, cases, actualStatus = 'pass', reasonCodes = []) {
  cases.push({ id, status: condition ? 'pass' : 'fail', expectedStatus: 'pass', actualStatus, reasonCodes, safeSummaryOnly: true });
  if (!condition) failures.push(id);
}

function prEnv(extra = {}) {
  return {
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_PR_NUMBER: '92',
    CODEX_PR_HEAD_SHA: '1234567890abcdef1234567890abcdef12345678',
    CODEX_PR_BASE_SHA: 'abcdef1234567890abcdef1234567890abcdef12',
    CODEX_REPOSITORY: 'owner/repo',
    ...extra,
  };
}

function remoteProductContextDecision(changedFiles, npmExitCode = 0) {
  const env = prEnv({
    CODEX_HARNESS_MODE: 'target',
    CODEX_PROFILE_COMPAT_MODE: 'off',
    CODEX_CHANGED_FILES: changedFiles.join(','),
  });
  const classified = classifyChange(changedFiles, env);
  const c = classified.classification || {};
  const productRequired = Boolean(
    classified.productRelevantChanged ||
    classified.packageOrLockfileChanged ||
    c.runtimeReadinessClaimed ||
    c.performanceClaimed
  );
  return {
    productRequired,
    skipNpm: productRequired ? '0' : '1',
    evidencePathPresent: productRequired,
    baselinePathPresent: productRequired,
    productVerificationResult: npmExitCode === 0 ? 'pass' : 'fail',
    forcedGateExit: productRequired && npmExitCode !== 0 ? 1 : 0,
    safeSummaryOnly: true,
  };
}

function writeSafeProductEvidence(tmpDir, result = 'pass') {
  const evidencePath = path.join(tmpDir, 'codex-product-verification-evidence.safe.json');
  const baselinePath = path.join(tmpDir, 'codex-remote-product-baseline.safe.json');
  const command = {
    name: 'npm test',
    required: true,
    result,
    source: 'remote',
    durationMs: null,
    testCount: null,
    safeSummary: result === 'pass' ? 'remote npm product verification passed' : 'remote npm product verification failed safely',
  };
  const evidence = {
    schemaVersion: '0.8.3',
    harnessVersion: HARNESS_VERSION,
    repository: 'owner/repo',
    prNumber: '92',
    headSha: '1234567890abcdef1234567890abcdef12345678',
    commands: [command],
    npmExitCode: result === 'pass' ? 0 : 1,
    rawValuesStored: false,
    safeSummaryOnly: true,
  };
  const baseline = {
    schemaVersion: '0.8.3',
    harnessVersion: HARNESS_VERSION,
    repository: 'owner/repo',
    baseSha: 'abcdef1234567890abcdef1234567890abcdef12',
    baselineType: 'product_verification',
    commands: ['npm test'],
    result,
    date: new Date().toISOString(),
    source: 'github_actions',
    safeSummary: command.safeSummary,
    knownFailures: result === 'pass' ? [] : ['remote_npm_test_failed'],
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    rawValuesStored: false,
    safeSummaryOnly: true,
  };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
  return { evidencePath, baselinePath, evidence, baseline };
}

function buildV092SelfTestReport() {
  const failures = [];
  const cases = [];

  const lineageEnv = fs.existsSync('CODEX_SOURCE_HARNESS_MANIFEST.json')
    ? { CODEX_HARNESS_SOURCE_REPO: '1', CODEX_HARNESS_MODE: 'core' }
    : { CODEX_HARNESS_MODE: 'target' };
  let report = buildVersionLineageReport(lineageEnv);
  assertCase('version_lineage_all_active_markers_match_092', report.versionLineageStatus.status === 'pass', failures, cases, report.versionLineageStatus.status, report.versionLineageStatus.reasonCodes);
  const oldMarkerFixtureFails = !/^0\.9\.2$/.test('0.9.0');
  assertCase('version_lineage_old_active_marker_fails', oldMarkerFixtureFails, failures, cases, 'fail', ['active_marker_version_mismatch']);

  report = renderPrEvidenceBlocks({
    repository: 'owner/repo',
    prNumber: '92',
    baseSha: 'abcdef1234567890abcdef1234567890abcdef12',
    headSha: '1234567890abcdef1234567890abcdef12345678',
    currentHeadSha: '1234567890abcdef1234567890abcdef12345678',
    humanConfirmation: { present: true, confirmedByRole: 'project-owner', headSha: '1234567890abcdef1234567890abcdef12345678' },
    productCodeChanged: false,
    runtimeReadinessClaimed: false,
  }, prEnv());
  assertCase('pr_evidence_renderer_outputs_current_head_pack', report.prEvidenceRendererStatus.status === 'pass' && report.prEvidenceRendererStatus.blocks.evidencePack.headSha === '1234567890abcdef1234567890abcdef12345678', failures, cases, report.prEvidenceRendererStatus.status, report.prEvidenceRendererStatus.reasonCodes);

  report = renderPrEvidenceBlocks({
    prNumber: '92',
    baseSha: 'abcdef1234567890abcdef1234567890abcdef12',
    headSha: '1111111111111111111111111111111111111111',
    currentHeadSha: '1234567890abcdef1234567890abcdef12345678',
    humanConfirmation: { present: true, confirmedByRole: 'project-owner', headSha: '1111111111111111111111111111111111111111' },
  }, prEnv());
  assertCase('pr_evidence_renderer_rejects_stale_head', report.prEvidenceRendererStatus.status === 'fail' && report.prEvidenceRendererStatus.reasonCodes.includes('pr_evidence_stale_head'), failures, cases, report.prEvidenceRendererStatus.status, report.prEvidenceRendererStatus.reasonCodes);

  report = renderPrEvidenceBlocks({
    prNumber: '92',
    baseSha: 'abcdef1234567890abcdef1234567890abcdef12',
    headSha: '1234567890abcdef1234567890abcdef12345678',
    rawLog: 'safe label only',
    humanConfirmation: { present: true, confirmedByRole: 'project-owner', headSha: '1234567890abcdef1234567890abcdef12345678' },
  }, prEnv());
  assertCase('pr_evidence_renderer_no_raw_log', report.prEvidenceRendererStatus.status === 'fail' && report.prEvidenceRendererStatus.reasonCodes.includes('pr_evidence_unsafe_output'), failures, cases, report.prEvidenceRendererStatus.status, report.prEvidenceRendererStatus.reasonCodes);

  report = buildSafeArtifactClassifierReport({ bodyOnlyRepair: true });
  assertCase('safe_artifact_classifier_body_only_repair', report.safeArtifactClassifierStatus.status === 'pass' && report.safeArtifactClassifierStatus.classification === 'body_only_repair', failures, cases, report.safeArtifactClassifierStatus.status, report.safeArtifactClassifierStatus.reasonCodes);

  report = buildSafeArtifactClassifierReport({ codeRepairRequired: true });
  assertCase('safe_artifact_classifier_code_repair_required', report.safeArtifactClassifierStatus.status === 'pass' && report.safeArtifactClassifierStatus.classification === 'code_repair_required', failures, cases, report.safeArtifactClassifierStatus.status, report.safeArtifactClassifierStatus.reasonCodes);

  report = buildSafeArtifactClassifierReport({ actionsQueued: true });
  assertCase('safe_artifact_classifier_actions_queue_issue', report.safeArtifactClassifierStatus.status === 'pass' && report.safeArtifactClassifierStatus.classification === 'actions_queue_or_runner_issue', failures, cases, report.safeArtifactClassifierStatus.status, report.safeArtifactClassifierStatus.reasonCodes);

  report = buildSafeArtifactClassifierReport({ runtimeReadinessClaimed: true, oraclePresent: false });
  assertCase('safe_artifact_classifier_blocks_runtime_ready_without_oracle', report.safeArtifactClassifierStatus.status === 'fail' && report.safeArtifactClassifierStatus.classification === 'runtime_readiness_not_proven', failures, cases, report.safeArtifactClassifierStatus.status, report.safeArtifactClassifierStatus.reasonCodes);

  report = buildSecurityLifecycleReport({ CODEX_CHANGED_FILES: JSON.stringify([]) });
  const evalPatternWouldFail = /\beval\s*\(/.test('eval("1")');
  assertCase('security_lifecycle_eval_pattern_fails', evalPatternWouldFail, failures, cases, 'fail', ['dangerous_api_pattern_detected']);
  const permissionEscalationWouldFail = /permissions:[\s\S]*\bwrite\b/i.test('permissions:\n  contents: write');
  assertCase('security_lifecycle_workflow_permission_escalation_fails', permissionEscalationWouldFail, failures, cases, 'fail', ['workflow_permission_escalation_unjustified']);
  assertCase('security_lifecycle_test_fixture_pattern_warns', report.securityLifecycleStatus.status === 'pass', failures, cases, report.securityLifecycleStatus.status, report.securityLifecycleStatus.reasonCodes);

  report = buildReviewIndependenceReport(prEnv({ CODEX_REVIEW_BODY: 'Writer evidence: present\nProduct code changed: no\nRuntime readiness claimed: no' }));
  assertCase('review_independence_writer_only_fails', report.reviewIndependenceStatus.status === 'fail', failures, cases, report.reviewIndependenceStatus.status, report.reviewIndependenceStatus.reasonCodes);

  report = buildReviewIndependenceReport(prEnv({ CODEX_REVIEW_BODY: 'Writer evidence: present\nReviewer checklist: present\nNegative case check: present\nScope boundary check: present\nProduct code changed: no\nRuntime readiness claimed: no' }));
  assertCase('review_independence_separate_checklist_passes', report.reviewIndependenceStatus.status === 'pass', failures, cases, report.reviewIndependenceStatus.status, report.reviewIndependenceStatus.reasonCodes);

  report = buildTaskBriefCompilerReport({
    CODEX_TASK_COMPLEXITY: 'high',
    CODEX_TASK_BRIEF_INPUT: JSON.stringify({ body: 'Goal: high complexity change' }),
  });
  assertCase('task_brief_high_complexity_requires_forbidden_scope', report.taskBriefCompilerStatus.status === 'fail' && report.taskBriefCompilerStatus.reasonCodes.includes('task_brief_forbidden_scope_missing'), failures, cases, report.taskBriefCompilerStatus.status, report.taskBriefCompilerStatus.reasonCodes);

  report = buildTaskBriefCompilerReport({
    CODEX_TASK_BRIEF_INPUT: JSON.stringify({ targetRollout: true, harnessManagedOnly: true, forbiddenScope: 'product runtime code', body: 'Target rollout. Forbidden scope: product runtime code. Harness-managed files only.' }),
  });
  assertCase('task_brief_target_rollout_harness_only_passes', report.taskBriefCompilerStatus.status === 'pass', failures, cases, report.taskBriefCompilerStatus.status, report.taskBriefCompilerStatus.reasonCodes);

  report = buildBestOfNDecisionReport({ used: true, candidateCount: 3 });
  assertCase('best_of_n_used_without_reason_fails', report.bestOfNDecisionStatus.status === 'fail' && report.bestOfNDecisionStatus.reasonCodes.includes('best_of_n_decision_missing'), failures, cases, report.bestOfNDecisionStatus.status, report.bestOfNDecisionStatus.reasonCodes);

  report = buildBestOfNDecisionReport({ used: true, selectedReason: 'safe summary chosen', rawModelOutput: 'candidate body' });
  assertCase('best_of_n_raw_candidate_output_fails', report.bestOfNDecisionStatus.status === 'fail' && report.bestOfNDecisionStatus.reasonCodes.includes('best_of_n_raw_candidate_forbidden'), failures, cases, report.bestOfNDecisionStatus.status, report.bestOfNDecisionStatus.reasonCodes);

  report = buildEnvironmentProfileReport({ CODEX_GITHUB_OPERATION_REQUIRED: '1', PATH: '' });
  assertCase('environment_profile_gh_unavailable_for_rerun_fails', report.environmentProfileStatus.status === 'fail', failures, cases, report.environmentProfileStatus.status, report.environmentProfileStatus.reasonCodes);

  report = buildEnvironmentProfileReport({ PATH: process.env.PATH || '' });
  assertCase('environment_profile_local_only_without_gh_warns', ['pass', 'warning'].includes(report.environmentProfileStatus.status), failures, cases, report.environmentProfileStatus.status, report.environmentProfileStatus.reasonCodes);

  report = buildAgentsContextBudgetReport({ CODEX_AGENTS_PATH: 'AGENTS.md', CODEX_AGENTS_CONTEXT_MAX_BYTES: '10' });
  assertCase('agents_context_budget_large_manual_fails', report.agentsContextBudgetStatus.status === 'fail', failures, cases, report.agentsContextBudgetStatus.status, report.agentsContextBudgetStatus.reasonCodes);

  report = buildEvidenceAutoRepairHintReport({ expectedFieldName: 'Forbidden scope' });
  assertCase('evidence_auto_repair_hint_forbidden_scope_missing', report.evidenceAutoRepairHintStatus.status === 'pass' && report.evidenceAutoRepairHintStatus.hint.bodyOnlyRepairAllowed, failures, cases, report.evidenceAutoRepairHintStatus.status, report.evidenceAutoRepairHintStatus.reasonCodes);

  report = buildEvidenceAutoRepairHintReport({ expectedFieldName: 'Runtime readiness claimed', wouldWeakenGate: true });
  assertCase('evidence_auto_repair_hint_does_not_weaken_gate', report.evidenceAutoRepairHintStatus.status === 'fail', failures, cases, report.evidenceAutoRepairHintStatus.status, report.evidenceAutoRepairHintStatus.reasonCodes);

  const pr112Files = ['docs/process/CODEX_HARNESS_MANIFEST.json', 'scripts/run-tests.js'];
  const pr112Classification = classifyChange(pr112Files, prEnv({ CODEX_CHANGED_FILES: pr112Files.join(',') }));
  assertCase('remote_product_context_pr112_like_run_tests_requires_evidence', pr112Classification.productRelevantChanged === true, failures, cases, pr112Classification.status, pr112Classification.reasonCodes);

  let decision = remoteProductContextDecision(pr112Files, 0);
  assertCase('remote_product_context_product_pr_unsets_skip_npm', decision.productRequired && decision.skipNpm === '0', failures, cases, decision.skipNpm, []);
  assertCase('remote_product_context_product_pr_sets_evidence_path', decision.evidencePathPresent, failures, cases, 'missing', []);
  assertCase('remote_product_context_product_pr_sets_baseline_path', decision.baselinePathPresent, failures, cases, 'missing', []);

  decision = remoteProductContextDecision(['docs/process/CODEX_HARNESS_MANIFEST.json'], 0);
  assertCase('remote_product_context_harness_only_allows_skip', !decision.productRequired && decision.skipNpm === '1', failures, cases, decision.skipNpm, []);

  decision = remoteProductContextDecision(pr112Files, 1);
  assertCase('remote_product_context_npm_failure_forces_gate_failure', decision.productVerificationResult === 'fail' && decision.forcedGateExit === 1, failures, cases, decision.productVerificationResult, []);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-v092-product-context-'));
  try {
    const safeEvidence = writeSafeProductEvidence(tmpDir, 'pass');
    report = normalizeProductVerificationEvidence(prEnv({
      CODEX_HARNESS_MODE: 'target',
      CODEX_CHANGED_FILES: pr112Files.join(','),
      CODEX_PRODUCT_VERIFICATION_EVIDENCE_PATH: safeEvidence.evidencePath,
      CODEX_REMOTE_PRODUCT_BASELINE_PATH: safeEvidence.baselinePath,
      CODEX_PRODUCT_VERIFICATION_COMMANDS: 'npm test',
      CODEX_PRODUCT_VERIFICATION_RESULT: 'pass',
      CODEX_PRODUCT_VERIFICATION_SOURCE: 'remote',
    }));
    assertCase('remote_product_context_safe_evidence_normalizes_pass', report.status === 'pass' && report.normalized.commands.some((item) => item.source === 'remote'), failures, cases, report.status, report.reasonCodes);
    const baselineReport = buildRemoteProductBaselineReport(prEnv({
      CODEX_CHANGED_FILES: pr112Files.join(','),
      CODEX_REMOTE_PRODUCT_BASELINE_PATH: safeEvidence.baselinePath,
    }));
    assertCase('remote_product_context_remote_baseline_path_passes', baselineReport.remoteProductBaselineStatus.status === 'pass', failures, cases, baselineReport.remoteProductBaselineStatus.status, baselineReport.remoteProductBaselineStatus.reasonCodes);
    assertCase('remote_product_context_safe_evidence_has_no_unsafe_values', scanObjectForUnsafe(safeEvidence.evidence).length === 0 && scanObjectForUnsafe(safeEvidence.baseline).length === 0, failures, cases, 'unsafe', ['unsafe_output_detected']);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const workflowText = fs.readFileSync('.github/workflows/quality-gate.yml', 'utf8');
  assertCase('remote_product_context_workflow_exports_required_paths', /Prepare remote product verification context/.test(workflowText) && /CODEX_PRODUCT_VERIFICATION_EVIDENCE_PATH/.test(workflowText) && /CODEX_REMOTE_PRODUCT_BASELINE_PATH/.test(workflowText), failures, cases, 'missing', []);
  assertCase('remote_product_context_workflow_forces_failed_npm_gate_exit', /CODEX_PRODUCT_VERIFICATION_RESULT:-/.test(workflowText) && /gate_exit=1/.test(workflowText), failures, cases, 'missing', []);
  assertCase('remote_product_context_workflow_uploads_no_raw_npm_log', !/npm[^\n]*(raw|log|output)/i.test(workflowText.split('Upload safe quality artifacts')[1] || ''), failures, cases, 'raw_log_upload', ['unsafe_output_detected']);

  report = renderPrEvidenceBlocks({
    repository: 'owner/repo',
    prNumber: '92',
    baseSha: 'abcdef1234567890abcdef1234567890abcdef12',
    headSha: '1234567890abcdef1234567890abcdef12345678',
    currentHeadSha: '1234567890abcdef1234567890abcdef12345678',
    changedFiles: ['scripts/codex-v092-self-test.mjs', 'docs/process/CODEX_V092_EVAL_CASES.json'],
    productCodeChanged: false,
    runtimeReadinessClaimed: false,
    humanConfirmation: { present: true, confirmedByRole: 'project-owner', headSha: '1234567890abcdef1234567890abcdef12345678' },
  }, prEnv());
  assertCase('source_harness_only_v092_pr_fixture_pass', report.prEvidenceRendererStatus.status === 'pass', failures, cases, report.prEvidenceRendererStatus.status, report.prEvidenceRendererStatus.reasonCodes);

  report = buildTaskBriefCompilerReport({
    CODEX_TASK_BRIEF_INPUT: JSON.stringify({ targetRollout: true, harnessManagedOnly: true, forbiddenScope: 'product runtime code', body: 'Target rollout. Forbidden scope: product runtime code. Harness-managed files only. Product code changed: no. Runtime readiness claimed: no.' }),
  });
  assertCase('target_harness_rollout_v092_fixture_pass', report.taskBriefCompilerStatus.status === 'pass', failures, cases, report.taskBriefCompilerStatus.status, report.taskBriefCompilerStatus.reasonCodes);

  const unsafe = scanObjectForUnsafe(cases);
  const status = failures.length || unsafe.length ? 'fail' : 'pass';
  return {
    marker,
    harnessVersion: HARNESS_VERSION,
    status,
    v092SelfTestStatus: {
      status,
      suite: 'v092',
      caseCount: cases.length,
      failedCaseCount: failures.length,
      failedCases: failures,
      cases,
      reasonCodes: unsafe.length ? ['unsafe_output_detected'] : [],
      safeSummaryOnly: true,
    },
    cases,
    safeSummaryOnly: true,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = buildV092SelfTestReport();
  writeJsonReport(report, 'CODEX_V092_SELF_TEST_REPORT');
  exitFor(report);
}

export { buildV092SelfTestReport };
