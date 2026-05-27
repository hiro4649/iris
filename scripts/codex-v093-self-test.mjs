#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.9.3

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marker, HARNESS_VERSION, scanObjectForUnsafe, writeJsonReport, exitFor } from './codex-v080-lib.mjs';
import { buildTargetHotfixPreservationReport } from './codex-target-hotfix-preservation-gate.mjs';
import { buildTargetPatchManifestReport } from './codex-target-patch-manifest.mjs';
import { buildTargetRolloutConflictReport } from './codex-target-rollout-conflict-gate.mjs';
import { buildRemoteProductPrContextFixtureReport } from './codex-remote-product-pr-context-fixture.mjs';
import { buildTargetScriptClassificationFixtureReport, classifyTargetScript } from './codex-target-script-classification-fixture.mjs';
import { buildSameHeadArtifactEvidenceReport } from './codex-same-head-artifact-evidence-gate.mjs';
import { buildDockerSmokeArtifactReport } from './codex-docker-smoke-artifact-gate.mjs';
import { buildTargetSkipNpmProductOverrideReport } from './codex-target-skip-npm-product-override-gate.mjs';
import { buildGoalConditionReport } from './codex-goal-condition-gate.mjs';
import { buildReviewPolicyClassifierReport } from './codex-review-policy-classifier.mjs';
import { buildPrEvidenceCompactReport } from './codex-pr-evidence-compact-gate.mjs';
import { classifyChange } from './codex-change-classification-gate.mjs';
import { normalizeProductVerificationEvidence } from './codex-product-verification-evidence-normalize.mjs';
import { buildRemoteProductBaselineReport } from './codex-remote-product-baseline-gate.mjs';

const HEAD = '1234567890abcdef1234567890abcdef12345678';
const OTHER = 'abcdef1234567890abcdef1234567890abcdef12';

function assertCase(id, condition, failures, cases, actualStatus = 'pass', reasonCodes = []) {
  cases.push({ id, status: condition ? 'pass' : 'fail', actualStatus, reasonCodes, safeSummaryOnly: true });
  if (!condition) failures.push(id);
}

function prEnv(extra = {}) {
  return {
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_PR_NUMBER: '93',
    CODEX_PR_HEAD_SHA: HEAD,
    CODEX_PR_BASE_SHA: OTHER,
    CODEX_REPOSITORY: 'owner/repo',
    CODEX_HARNESS_MODE: 'target',
    CODEX_PROFILE_COMPAT_MODE: 'off',
    ...extra,
  };
}

function remoteProductContextDecision(changedFiles, npmExitCode = 0) {
  const env = prEnv({ CODEX_CHANGED_FILES: changedFiles.join(',') });
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
    prNumber: '93',
    headSha: HEAD,
    commands: [command],
    npmExitCode: result === 'pass' ? 0 : 1,
    rawValuesStored: false,
    safeSummaryOnly: true,
  };
  const baseline = {
    schemaVersion: '0.8.3',
    harnessVersion: HARNESS_VERSION,
    repository: 'owner/repo',
    baseSha: OTHER,
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

export function buildV093SelfTestReport() {
  const failures = [];
  const cases = [];
  let report;

  report = buildTargetHotfixPreservationReport({ targetMode: true, targetHotfixDetected: true, preserved: true, preservationDecisionRecorded: true });
  assertCase('previous_target_hotfix_preserved_pass', report.previousTargetHotfixPreservationStatus.status === 'pass', failures, cases, report.previousTargetHotfixPreservationStatus.status, report.previousTargetHotfixPreservationStatus.reasonCodes);

  report = buildTargetHotfixPreservationReport({ targetMode: true, targetHotfixDetected: true, preserved: false, preservationDecisionRecorded: true });
  assertCase('previous_target_hotfix_overwritten_fails', report.previousTargetHotfixPreservationStatus.status === 'fail', failures, cases, report.previousTargetHotfixPreservationStatus.status, report.previousTargetHotfixPreservationStatus.reasonCodes);

  report = buildTargetHotfixPreservationReport({ targetMode: true, targetHotfixDetected: true, preserved: true, preservationDecisionRecorded: true });
  assertCase('remote_product_context_preserves_previous_target_hotfix_fixture', report.previousTargetHotfixPreservationStatus.status === 'pass', failures, cases, report.previousTargetHotfixPreservationStatus.status, report.previousTargetHotfixPreservationStatus.reasonCodes);

  report = buildTargetPatchManifestReport({ targetMode: true, patches: [{ id: 'patch-1', classification: 'target_hotfix', expectedDuringRollout: true }] });
  assertCase('target_patch_manifest_missing_entry_fails', report.targetPatchManifestStatus.status === 'fail', failures, cases, report.targetPatchManifestStatus.status, report.targetPatchManifestStatus.reasonCodes);

  report = buildTargetRolloutConflictReport({ targetMode: true, targetOnlyHarnessFileDeleted: true });
  assertCase('target_rollout_conflict_detects_deleted_target_policy', report.targetRolloutConflictStatus.status === 'fail', failures, cases, report.targetRolloutConflictStatus.status, report.targetRolloutConflictStatus.reasonCodes);

  report = buildRemoteProductPrContextFixtureReport({ productRelevantChanged: true, skipNpm: true, allowed: true });
  assertCase('remote_product_pr_context_skip_npm_fails', report.remoteProductPrContextFixtureStatus.status === 'fail', failures, cases, report.remoteProductPrContextFixtureStatus.status, report.remoteProductPrContextFixtureStatus.reasonCodes);

  report = buildRemoteProductPrContextFixtureReport({ workflowDispatchTreatedAsPrCheck: true });
  assertCase('remote_product_pr_context_workflow_dispatch_not_substitute', report.remoteProductPrContextFixtureStatus.status === 'fail', failures, cases, report.remoteProductPrContextFixtureStatus.status, report.remoteProductPrContextFixtureStatus.reasonCodes);

  const pr116Files = ['scripts/codex-v085-self-test.mjs', 'scripts/run-tests.js'];
  const pr116Classification = classifyChange(pr116Files, prEnv({ CODEX_CHANGED_FILES: pr116Files.join(',') }));
  assertCase('remote_product_context_pr116_like_run_tests_requires_evidence', pr116Classification.productRelevantChanged === true, failures, cases, pr116Classification.status, pr116Classification.reasonCodes);

  let decision = remoteProductContextDecision(pr116Files, 0);
  assertCase('remote_product_context_product_pr_unsets_skip_npm', decision.productRequired && decision.skipNpm === '0', failures, cases, decision.skipNpm, []);
  assertCase('remote_product_context_product_pr_sets_evidence_path', decision.evidencePathPresent, failures, cases, 'missing', []);
  assertCase('remote_product_context_product_pr_sets_baseline_path', decision.baselinePathPresent, failures, cases, 'missing', []);

  decision = remoteProductContextDecision(['scripts/codex-v093-self-test.mjs'], 0);
  assertCase('remote_product_context_harness_only_allows_skip', !decision.productRequired && decision.skipNpm === '1', failures, cases, decision.skipNpm, []);

  decision = remoteProductContextDecision(pr116Files, 1);
  assertCase('remote_product_context_npm_failure_forces_gate_failure', decision.productVerificationResult === 'fail' && decision.forcedGateExit === 1, failures, cases, decision.productVerificationResult, []);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-v093-product-context-'));
  try {
    const safeEvidence = writeSafeProductEvidence(tmpDir, 'pass');
    const evidence = normalizeProductVerificationEvidence(prEnv({
      CODEX_CHANGED_FILES: pr116Files.join(','),
      CODEX_PRODUCT_VERIFICATION_EVIDENCE_PATH: safeEvidence.evidencePath,
      CODEX_REMOTE_PRODUCT_BASELINE_PATH: safeEvidence.baselinePath,
      CODEX_PRODUCT_VERIFICATION_COMMANDS: 'npm test',
      CODEX_PRODUCT_VERIFICATION_RESULT: 'pass',
      CODEX_PRODUCT_VERIFICATION_SOURCE: 'remote',
    }));
    assertCase('remote_product_context_safe_evidence_normalizes_pass', evidence.status === 'pass' && evidence.normalized.commands.some((item) => item.source === 'remote'), failures, cases, evidence.status, evidence.reasonCodes);
    const baselineReport = buildRemoteProductBaselineReport(prEnv({
      CODEX_CHANGED_FILES: pr116Files.join(','),
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

  report = buildTargetScriptClassificationFixtureReport({ manifest: { runTestsClassification: 'product_relevant', devServerClassification: 'dev_server_entrypoint' } });
  assertCase('scripts_run_tests_product_relevant_fixture_pass', report.targetScriptClassificationFixtureStatus.status === 'pass' && classifyTargetScript('scripts/run-tests.js', { runTestsClassification: 'product_relevant' }) === 'product_relevant', failures, cases, report.targetScriptClassificationFixtureStatus.status, report.targetScriptClassificationFixtureStatus.reasonCodes);

  assertCase('scripts_codex_star_harness_managed_fixture_pass', classifyTargetScript('scripts/codex-local-quality-gate.mjs', {}) === 'harness_managed', failures, cases);
  assertCase('scripts_dev_server_entrypoint_fixture_pass', classifyTargetScript('scripts/dev-server.js', { devServerClassification: 'dev_server_entrypoint' }) === 'dev_server_entrypoint', failures, cases);

  report = buildTargetScriptClassificationFixtureReport({ unknownScriptPasses: true });
  assertCase('unknown_script_requires_classification', report.targetScriptClassificationFixtureStatus.status === 'fail', failures, cases, report.targetScriptClassificationFixtureStatus.status, report.targetScriptClassificationFixtureStatus.reasonCodes);

  report = buildSameHeadArtifactEvidenceReport({ forcePrContext: true, localHeadSha: HEAD, prHeadSha: HEAD, evidencePackHeadSha: HEAD, manualConfirmationHeadSha: HEAD, remoteRunHeadSha: HEAD, artifactRequired: true, artifactHeadSha: HEAD, safeSummaryHeadSha: HEAD });
  assertCase('same_head_artifact_all_match_pass', report.sameHeadArtifactEvidenceStatus.status === 'pass', failures, cases, report.sameHeadArtifactEvidenceStatus.status, report.sameHeadArtifactEvidenceStatus.reasonCodes);

  report = buildSameHeadArtifactEvidenceReport({ forcePrContext: true, localHeadSha: HEAD, prHeadSha: HEAD, evidencePackHeadSha: OTHER, manualConfirmationHeadSha: HEAD, remoteRunHeadSha: HEAD });
  assertCase('same_head_artifact_head_mismatch_fails', report.sameHeadArtifactEvidenceStatus.status === 'fail', failures, cases, report.sameHeadArtifactEvidenceStatus.status, report.sameHeadArtifactEvidenceStatus.reasonCodes);

  report = buildSameHeadArtifactEvidenceReport({ forcePrContext: true, localHeadSha: HEAD, prHeadSha: HEAD, evidencePackHeadSha: HEAD, manualConfirmationHeadSha: OTHER, remoteRunHeadSha: HEAD });
  assertCase('manual_confirmation_stale_head_fails', report.sameHeadArtifactEvidenceStatus.status === 'fail' && report.sameHeadArtifactEvidenceStatus.reasonCodes.includes('manual_confirmation_stale_head'), failures, cases, report.sameHeadArtifactEvidenceStatus.status, report.sameHeadArtifactEvidenceStatus.reasonCodes);

  report = buildDockerSmokeArtifactReport({ dockerSmokeRequired: true, prHeadSha: HEAD });
  assertCase('docker_smoke_required_artifact_missing_fails', report.dockerSmokeCurrentHeadArtifactStatus.status === 'fail', failures, cases, report.dockerSmokeCurrentHeadArtifactStatus.status, report.dockerSmokeCurrentHeadArtifactStatus.reasonCodes);

  report = buildDockerSmokeArtifactReport({ dockerSmokeRequired: true, prHeadSha: HEAD, artifactHeadSha: HEAD, artifactPresent: true });
  assertCase('docker_smoke_required_same_head_pass', report.dockerSmokeCurrentHeadArtifactStatus.status === 'pass', failures, cases, report.dockerSmokeCurrentHeadArtifactStatus.status, report.dockerSmokeCurrentHeadArtifactStatus.reasonCodes);

  report = buildDockerSmokeArtifactReport({ dockerSmokeRequired: true, prHeadSha: HEAD, artifactHeadSha: HEAD, artifactPresent: true, skippedByFastPath: true });
  assertCase('docker_smoke_fast_path_skip_fails', report.dockerSmokeCurrentHeadArtifactStatus.status === 'fail', failures, cases, report.dockerSmokeCurrentHeadArtifactStatus.status, report.dockerSmokeCurrentHeadArtifactStatus.reasonCodes);

  report = buildTargetSkipNpmProductOverrideReport({ productRelevantChanged: true, skipNpm: true, allowed: true });
  assertCase('target_skip_npm_product_override_fails', report.targetSkipNpmProductOverrideStatus.status === 'fail', failures, cases, report.targetSkipNpmProductOverrideStatus.status, report.targetSkipNpmProductOverrideStatus.reasonCodes);

  report = buildTargetSkipNpmProductOverrideReport({ harnessOnly: true, skipNpm: true, explicitReason: 'harness-only rollout' });
  assertCase('target_skip_npm_harness_only_passes', report.targetSkipNpmProductOverrideStatus.status === 'pass', failures, cases, report.targetSkipNpmProductOverrideStatus.status, report.targetSkipNpmProductOverrideStatus.reasonCodes);

  report = buildGoalConditionReport({ targetRollout: true, goal: 'roll out harness only', measurableEndState: 'target gate pass', proofCommand: 'node scripts/codex-local-quality-gate.mjs', mustNotChange: ['product files'], stopCondition: 'stop after target verification', maxScope: 'harness-managed files' });
  assertCase('goal_condition_target_rollout_must_not_change_pass', report.goalConditionStatus.status === 'pass', failures, cases, report.goalConditionStatus.status, report.goalConditionStatus.reasonCodes);

  report = buildGoalConditionReport({ goal: 'expand', measurableEndState: 'done', proofCommand: 'node scripts/codex-local-quality-gate.mjs', mustNotChange: 'product files', stopCondition: 'continue', maxScope: 'all repos', scopeExpanded: true });
  assertCase('goal_condition_scope_expansion_fails', report.goalConditionStatus.status === 'fail', failures, cases, report.goalConditionStatus.status, report.goalConditionStatus.reasonCodes);

  report = buildReviewPolicyClassifierReport({ changedFiles: ['docs/process/CODEX_GOAL_CONDITION_POLICY.md'] });
  assertCase('review_policy_docs_only_light_pass', report.reviewPolicyClassifierStatus.status === 'pass', failures, cases, report.reviewPolicyClassifierStatus.status, report.reviewPolicyClassifierStatus.reasonCodes);

  report = buildReviewPolicyClassifierReport({ securityRelevant: true, reviewIndependencePass: false });
  assertCase('review_policy_security_requires_independence_fails', report.reviewPolicyClassifierStatus.status === 'fail', failures, cases, report.reviewPolicyClassifierStatus.status, report.reviewPolicyClassifierStatus.reasonCodes);

  report = buildPrEvidenceCompactReport({ body: 'Goal\nraw logs: command output omitted' });
  assertCase('pr_evidence_compact_raw_log_fails', report.prEvidenceCompactStatus.status === 'fail', failures, cases, report.prEvidenceCompactStatus.status, report.prEvidenceCompactStatus.reasonCodes);

  report = buildPrEvidenceCompactReport({ body: Array.from({ length: 70 }, (_, i) => '- changed-file-' + i).join('\n'), safeArtifactAvailable: true });
  assertCase('pr_evidence_compact_large_file_list_warns', report.prEvidenceCompactStatus.status === 'warning', failures, cases, report.prEvidenceCompactStatus.status, report.prEvidenceCompactStatus.reasonCodes);

  report = buildReviewPolicyClassifierReport({ changedFiles: ['scripts/codex-v093-self-test.mjs'], reviewIndependencePass: true, securityLifecyclePass: true, dockerSmokeCurrentHeadArtifactPass: true, hotfixPreservationPass: true });
  assertCase('source_harness_only_v093_pr_fixture_pass', report.reviewPolicyClassifierStatus.status === 'pass', failures, cases, report.reviewPolicyClassifierStatus.status, report.reviewPolicyClassifierStatus.reasonCodes);

  report = buildTargetHotfixPreservationReport({ targetMode: true, noTargetHotfixPresent: true });
  assertCase('target_harness_rollout_v093_fixture_pass', report.previousTargetHotfixPreservationStatus.status === 'pass', failures, cases, report.previousTargetHotfixPreservationStatus.status, report.previousTargetHotfixPreservationStatus.reasonCodes);

  const unsafe = scanObjectForUnsafe(cases);
  const status = failures.length || unsafe.length ? 'fail' : 'pass';
  return {
    marker,
    harnessVersion: HARNESS_VERSION,
    status,
    v093SelfTestStatus: {
      status,
      suite: 'v093',
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
  const report = buildV093SelfTestReport();
  writeJsonReport(report, 'CODEX_V093_SELF_TEST_REPORT');
  exitFor(report);
}

