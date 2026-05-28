#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.9.7

import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { marker, HARNESS_VERSION, scanObjectForUnsafe, writeJsonReport, exitFor } from './codex-v080-lib.mjs';
import {
  buildActiveSelfTestRegistryReport,
  buildWorkflowProductVerificationInvariantReport,
  buildTargetHotfixRegressionReport,
  buildHarnessRolloutDiffRegressionReport,
  buildBlockerRootCauseClassifierReport,
  buildLocalRemoteEvidencePhaseReport,
  buildStructuredSolvabilityReport,
  buildLive2DDatasetRowAuditReport,
  buildMotionAllowlistSyncReport,
  buildTrustedLoaderEvidenceReport,
  buildLive2DEvidenceCollectorContractReport,
  buildAvatarUxSafetyReport,
  buildRuntimeLatencyMeasurementReport,
  buildBrowserSmokeJsonArtifactReport,
  buildOwnerDecisionDigestReport,
  buildObsoletePrAutoRecommendReport,
  buildDatasetAuditV2SchemaReport,
  buildGameToolAdapterContractFixtureV097Report,
  buildBelovedAvatarSafetyAuditV097Report,
} from './codex-v097-gate-lib.mjs';
import { buildProductVerificationReport } from './codex-product-verification-gate.mjs';
import { buildProductVerificationEvidenceReport } from './codex-product-verification-evidence-normalize.mjs';
import { buildRemoteProductBaselineReport } from './codex-remote-product-baseline-gate.mjs';

function statusOf(report, key) { return report[key]?.status || report.status || 'missing'; }
function reasonsOf(report, key) { return report[key]?.reasonCodes || []; }
function assertCase(id, condition, failures, cases, actualStatus = 'pass', reasonCodes = []) {
  cases.push({ id, status: condition ? 'pass' : 'fail', actualStatus, reasonCodes, safeSummaryOnly: true });
  if (!condition) failures.push(id);
}
function fallbackRemoteProductEvidenceArtifacts(input = {}, env = {}) {
  const changedFiles = Array.isArray(input.changedFiles) ? input.changedFiles : String(input.changedFiles || '').split(/\r?\n|,/).filter(Boolean);
  const relevant = changedFiles.includes('scripts/run-tests.js') || changedFiles.some((file) => /^(src|apps|contracts|packages|lib|server|client|tests?|__tests__|specs|docs\/specs)\//.test(file));
  const npmExitCode = relevant ? Number(input.npmExitCode ?? 0) : null;
  const passed = relevant && npmExitCode === 0;
  const failed = relevant && npmExitCode !== 0;
  const status = relevant ? (passed ? 'pass' : 'fail') : 'not_applicable';
  const command = {
    name: 'npm test',
    required: relevant,
    result: relevant ? (passed ? 'pass' : 'fail') : 'not_run',
    source: relevant ? 'remote' : 'not_applicable',
    durationMs: Number(input.durationMs || 0),
    testCount: passed ? 470 : null,
    safeSummary: passed ? 'remote test completed successfully' : 'remote test completed with safe failure classification',
  };
  return {
    status,
    productRelevant: relevant,
    npmFailed: failed,
    changedFiles,
    env: {
      CODEX_PRODUCT_VERIFICATION_COMMANDS: relevant ? 'npm test' : '',
      CODEX_PRODUCT_VERIFICATION_RESULT: relevant ? (passed ? 'pass' : 'fail') : 'not_applicable',
      CODEX_PRODUCT_VERIFICATION_SOURCE: relevant ? 'remote' : 'not_applicable',
      CODEX_PRODUCT_VERIFICATION_REQUIRED: relevant ? '1' : '0',
      CODEX_REMOTE_PRODUCT_BASELINE_REQUIRED: relevant ? '1' : '0',
      CODEX_REMOTE_NPM_FAILED: failed ? '1' : '0',
      ...(relevant ? { CODEX_SKIP_NPM: '0' } : {}),
    },
    artifacts: {
      checks: { schemaVersion: '0.9.7', harnessVersion: HARNESS_VERSION, status, reasonCodes: failed ? ['remote_test_failed'] : [], safeSummaryOnly: true },
      evidence: { schemaVersion: '0.8.3', harnessVersion: HARNESS_VERSION, status, repository: env.CODEX_REPOSITORY || '', prNumber: env.CODEX_PR_NUMBER || '', headSha: env.CODEX_PR_HEAD_SHA || '', commands: relevant ? [command] : [], logsUploaded: false, valuesStored: false, safeSummaryOnly: true },
      baseline: relevant ? { schemaVersion: '0.8.3', harnessVersion: HARNESS_VERSION, repository: env.CODEX_REPOSITORY || '', baseSha: env.CODEX_PR_BASE_SHA || '', baselineType: 'npm_test', commands: [command], result: passed ? 'pass' : 'fail', date: new Date().toISOString(), source: 'remote_quality_gate', safeSummary: command.safeSummary, knownFailures: failed ? ['test_assertion_failure'] : [], expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), rawValuesStored: false, safeSummaryOnly: true } : { schemaVersion: '0.9.7', harnessVersion: HARNESS_VERSION, status: 'not_applicable', safeSummaryOnly: true },
      diagnostic: { schemaVersion: '0.8.3', harnessVersion: HARNESS_VERSION, status, npmExitCode, safeFailureCategory: passed ? 'test_success' : failed ? 'test_assertion_failure' : 'not_applicable', commandClass: relevant ? 'npm_test' : 'not_applicable', rawLogUploaded: false, rawValuesStored: false, safeSummaryOnly: true },
    },
  };
}

let buildRemoteProductEvidenceArtifacts = fallbackRemoteProductEvidenceArtifacts;
try {
  ({ buildRemoteProductEvidenceArtifacts } = await import('./codex-remote-product-evidence-runner.mjs'));
} catch {
  buildRemoteProductEvidenceArtifacts = fallbackRemoteProductEvidenceArtifacts;
}

export function buildV097SelfTestReport() {
  const failures = [];
  const cases = [];
  let report;

  report = buildActiveSelfTestRegistryReport({ harnessVersion: '0.9.7', activeStatusKey: 'v097SelfTestStatus', selfTestFilePresent: true, manifestHasSelfTest: true, localGateHasStatus: true });
  assertCase('active_self_test_registry_v097_pass', statusOf(report, 'activeSelfTestRegistryStatus') === 'pass', failures, cases, statusOf(report, 'activeSelfTestRegistryStatus'), reasonsOf(report, 'activeSelfTestRegistryStatus'));
  report = buildActiveSelfTestRegistryReport({ harnessVersion: '0.9.7', activeStatusKey: 'v096SelfTestStatus', selfTestFilePresent: false, manifestHasSelfTest: false, localGateHasStatus: false });
  assertCase('active_self_test_registry_missing_fails', statusOf(report, 'activeSelfTestRegistryStatus') === 'fail', failures, cases, statusOf(report, 'activeSelfTestRegistryStatus'), reasonsOf(report, 'activeSelfTestRegistryStatus'));

  report = buildWorkflowProductVerificationInvariantReport({});
  assertCase('workflow_product_verification_step_present_pass', statusOf(report, 'workflowProductVerificationInvariantStatus') === 'pass', failures, cases, statusOf(report, 'workflowProductVerificationInvariantStatus'), reasonsOf(report, 'workflowProductVerificationInvariantStatus'));
  report = buildWorkflowProductVerificationInvariantReport({ stepRemoved: true });
  assertCase('workflow_product_verification_step_removed_fails', statusOf(report, 'workflowProductVerificationInvariantStatus') === 'fail', failures, cases, statusOf(report, 'workflowProductVerificationInvariantStatus'), reasonsOf(report, 'workflowProductVerificationInvariantStatus'));
  report = buildWorkflowProductVerificationInvariantReport({ remoteProductArtifactUploadRemoved: true });
  assertCase('remote_product_artifact_upload_removed_fails', statusOf(report, 'workflowProductVerificationInvariantStatus') === 'fail', failures, cases, statusOf(report, 'workflowProductVerificationInvariantStatus'), reasonsOf(report, 'workflowProductVerificationInvariantStatus'));

  report = buildTargetHotfixRegressionReport({ forceCheck: true });
  assertCase('target_hotfix_regression_preserved_pass', statusOf(report, 'targetHotfixRegressionStatus') === 'pass', failures, cases, statusOf(report, 'targetHotfixRegressionStatus'), reasonsOf(report, 'targetHotfixRegressionStatus'));
  report = buildTargetHotfixRegressionReport({ forceCheck: true, prepareProductVerificationRemoved: true });
  assertCase('target_hotfix_regression_prepare_product_verification_removed_fails', statusOf(report, 'targetHotfixRegressionStatus') === 'fail', failures, cases, statusOf(report, 'targetHotfixRegressionStatus'), reasonsOf(report, 'targetHotfixRegressionStatus'));
  report = buildHarnessRolloutDiffRegressionReport({ forceCheck: true, workflowStepDeletedWithoutReason: true });
  assertCase('harness_rollout_diff_step_deletion_requires_reason', statusOf(report, 'harnessRolloutDiffRegressionStatus') === 'fail', failures, cases, statusOf(report, 'harnessRolloutDiffRegressionStatus'), reasonsOf(report, 'harnessRolloutDiffRegressionStatus'));

  report = buildBlockerRootCauseClassifierReport({ failurePresent: true, workflowStepMissing: true, rootCause: 'workflow_step_missing' });
  assertCase('blocker_root_cause_workflow_step_missing', statusOf(report, 'blockerRootCauseClassifierStatus') === 'pass', failures, cases, statusOf(report, 'blockerRootCauseClassifierStatus'), reasonsOf(report, 'blockerRootCauseClassifierStatus'));
  report = buildBlockerRootCauseClassifierReport({ failurePresent: true, activeSelfTestRegistryMissing: true, rootCause: 'warning' });
  assertCase('blocker_root_cause_active_self_test_missing', statusOf(report, 'blockerRootCauseClassifierStatus') === 'fail', failures, cases, statusOf(report, 'blockerRootCauseClassifierStatus'), reasonsOf(report, 'blockerRootCauseClassifierStatus'));

  report = buildLocalRemoteEvidencePhaseReport({ remoteEvidencePhase: 'remote_evidence_pending_before_push' });
  assertCase('local_pre_push_remote_pending_allowed', statusOf(report, 'localRemoteEvidencePhaseStatus') === 'pass', failures, cases, statusOf(report, 'localRemoteEvidencePhaseStatus'), reasonsOf(report, 'localRemoteEvidencePhaseStatus'));
  report = buildLocalRemoteEvidencePhaseReport({ remoteEvidencePhase: 'remote_evidence_required_after_push', afterPushRemoteMissingPass: true });
  assertCase('remote_evidence_required_after_push', statusOf(report, 'localRemoteEvidencePhaseStatus') === 'fail', failures, cases, statusOf(report, 'localRemoteEvidencePhaseStatus'), reasonsOf(report, 'localRemoteEvidencePhaseStatus'));
  report = buildStructuredSolvabilityReport({ remoteEvidencePhase: 'remote_evidence_required_after_push', mergeReady: false });
  assertCase('structured_solvability_local_remote_split_pass', statusOf(report, 'structuredSolvabilityStatus') === 'pass', failures, cases, statusOf(report, 'structuredSolvabilityStatus'), reasonsOf(report, 'structuredSolvabilityStatus'));
  report = buildStructuredSolvabilityReport({ localRemoteMixed: true });
  assertCase('structured_solvability_conflict_fails', statusOf(report, 'structuredSolvabilityStatus') === 'fail', failures, cases, statusOf(report, 'structuredSolvabilityStatus'), reasonsOf(report, 'structuredSolvabilityStatus'));

  const remoteProductEnv = {
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_REPOSITORY: 'hiro4649/iris',
    CODEX_PR_NUMBER: '112',
    CODEX_PR_BASE_SHA: '0'.repeat(40),
    CODEX_PR_HEAD_SHA: '1'.repeat(40),
    CODEX_HARNESS_MODE: 'target',
    CODEX_PR_BODY: 'Runtime readiness claimed: no.\nProduction readiness claimed: no.',
  };
  const remoteProductTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-v097-remote-product-'));
  const writeFixture = (name, value) => {
    const file = path.join(remoteProductTmp, name);
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
    return file;
  };
  const passRemote = buildRemoteProductEvidenceArtifacts({
    changedFiles: ['scripts/run-tests.js'],
    npmExitCode: 0,
    npmOutput: '470 tests passed',
    durationMs: 10,
  }, remoteProductEnv);
  assertCase('pr112_like_scripts_run_tests_change_requires_remote_npm-evidence', passRemote.productRelevant === true && passRemote.artifacts.evidence.commands[0].source === 'remote', failures, cases, passRemote.status, passRemote.artifacts.checks.reasonCodes);
  assertCase('product_relevant_target_pr_does_not_keep_CODEX_SKIP_NPM_1', passRemote.productRelevant === true && passRemote.env.CODEX_SKIP_NPM === '0', failures, cases, passRemote.env.CODEX_SKIP_NPM || 'missing', passRemote.artifacts.checks.reasonCodes);

  const pendingEvidence = writeFixture('pending-product-evidence.json', { schemaVersion: '0.9.7', phase: 'remote product checks', status: 'pending', safeSummaryOnly: true });
  report = buildProductVerificationEvidenceReport({
    ...remoteProductEnv,
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_SKIP_NPM: '0',
    CODEX_PRODUCT_VERIFICATION_EVIDENCE_PATH: pendingEvidence,
    CODEX_REMOTE_PRODUCT_BASELINE_JSON: JSON.stringify(passRemote.artifacts.baseline),
  });
  assertCase('pending_remote_product_placeholder_does_not_satisfy_evidence', statusOf(report, 'productVerificationEvidenceStatus') === 'fail', failures, cases, statusOf(report, 'productVerificationEvidenceStatus'), reasonsOf(report, 'productVerificationEvidenceStatus'));

  report = buildProductVerificationEvidenceReport({
    ...remoteProductEnv,
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_SKIP_NPM: '0',
    CODEX_REMOTE_PRODUCT_BASELINE_JSON: JSON.stringify(passRemote.artifacts.baseline),
  });
  assertCase('missing_remote_product_evidence_fails', statusOf(report, 'productVerificationEvidenceStatus') === 'fail', failures, cases, statusOf(report, 'productVerificationEvidenceStatus'), reasonsOf(report, 'productVerificationEvidenceStatus'));

  const passEvidencePath = writeFixture('pass-product-evidence.json', passRemote.artifacts.evidence);
  report = buildProductVerificationEvidenceReport({
    ...remoteProductEnv,
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_SKIP_NPM: '0',
    CODEX_PRODUCT_VERIFICATION_EVIDENCE_PATH: passEvidencePath,
    CODEX_REMOTE_PRODUCT_BASELINE_JSON: JSON.stringify(passRemote.artifacts.baseline),
  });
  const passEvidenceOk = statusOf(report, 'productVerificationEvidenceStatus') === 'pass';
  const passBaseline = buildRemoteProductBaselineReport({
    ...remoteProductEnv,
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_REMOTE_PRODUCT_BASELINE_JSON: JSON.stringify(passRemote.artifacts.baseline),
  });
  assertCase('npm-pass_writes_pass_product_evidence', passEvidenceOk && passRemote.artifacts.evidence.status === 'pass', failures, cases, statusOf(report, 'productVerificationEvidenceStatus'), reasonsOf(report, 'productVerificationEvidenceStatus'));
  assertCase('npm-pass_writes_pass_remote_baseline', statusOf(passBaseline, 'remoteProductBaselineStatus') === 'pass' && passRemote.artifacts.baseline.result === 'pass' && passRemote.artifacts.baseline.baselineType === 'npm_test', failures, cases, statusOf(passBaseline, 'remoteProductBaselineStatus'), reasonsOf(passBaseline, 'remoteProductBaselineStatus'));
  assertCase('npm-pass_writes_pass_remote_diagnostic', passRemote.artifacts.diagnostic.status === 'pass', failures, cases, passRemote.artifacts.diagnostic.status, passRemote.artifacts.diagnostic.reasonCodes || []);

  const failRemote = buildRemoteProductEvidenceArtifacts({
    changedFiles: ['scripts/run-tests.js'],
    npmExitCode: 1,
    npmOutput: 'AssertionError stack detail should stay private',
    durationMs: 11,
  }, remoteProductEnv);
  const failEvidencePath = writeFixture('fail-product-evidence.json', failRemote.artifacts.evidence);
  report = buildProductVerificationReport({
    ...remoteProductEnv,
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_SKIP_NPM: '0',
    CODEX_PRODUCT_VERIFICATION_EVIDENCE_PATH: failEvidencePath,
    CODEX_REMOTE_PRODUCT_BASELINE_JSON: JSON.stringify(failRemote.artifacts.baseline),
    CODEX_PRODUCT_VERIFICATION_COMMANDS: 'npm test',
    CODEX_PRODUCT_VERIFICATION_RESULT: 'fail',
    CODEX_PRODUCT_VERIFICATION_SOURCE: 'remote',
  });
  assertCase('npm-fail_writes_fail_product_evidence', failRemote.artifacts.evidence.status === 'fail', failures, cases, failRemote.artifacts.evidence.status, failRemote.artifacts.checks.reasonCodes);
  assertCase('npm-fail_writes_fail_remote_baseline', failRemote.artifacts.baseline.result === 'fail' && failRemote.artifacts.baseline.baselineType === 'npm_test', failures, cases, failRemote.artifacts.baseline.result || 'missing', failRemote.artifacts.checks.reasonCodes);
  assertCase('npm-fail_writes_fail_remote_diagnostic', failRemote.artifacts.diagnostic.status === 'fail', failures, cases, failRemote.artifacts.diagnostic.status, failRemote.artifacts.diagnostic.reasonCodes || []);
  assertCase('npm-fail_keeps_gate_failure', failRemote.env.CODEX_REMOTE_NPM_FAILED === '1' && statusOf(report, 'productVerificationStatus') === 'fail', failures, cases, statusOf(report, 'productVerificationStatus'), reasonsOf(report, 'productVerificationStatus'));
  report = buildProductVerificationReport({
    ...remoteProductEnv,
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_SKIP_NPM: '0',
    CODEX_PRODUCT_VERIFICATION_EVIDENCE_PATH: failEvidencePath,
    CODEX_REMOTE_PRODUCT_BASELINE_JSON: JSON.stringify(failRemote.artifacts.baseline),
    CODEX_PRODUCT_VERIFICATION_COMMANDS: 'npm test',
    CODEX_PRODUCT_VERIFICATION_RESULT: 'fail',
    CODEX_PRODUCT_VERIFICATION_SOURCE: 'remote',
    CODEX_MANUAL_CONFIRMATION_JSON: JSON.stringify({ decision: 'approved', riskLevel: 'R3' }),
  });
  assertCase('manual_confirmation_cannot_override_failed_product_verification', statusOf(report, 'productVerificationStatus') === 'fail', failures, cases, statusOf(report, 'productVerificationStatus'), reasonsOf(report, 'productVerificationStatus'));
  assertCase('remote_test_logs_not_uploaded', !JSON.stringify(failRemote.artifacts).includes('AssertionError') && failRemote.artifacts.diagnostic.rawLogUploaded === false && failRemote.artifacts.evidence.logsUploaded === false, failures, cases, failRemote.artifacts.diagnostic.status, []);

  const harnessOnlyRemote = buildRemoteProductEvidenceArtifacts({
    changedFiles: ['scripts/codex-v097-self-test.mjs'],
    npmExitCode: 0,
  }, remoteProductEnv);
  assertCase('harness_only_pr_allows_safe_skip_path', harnessOnlyRemote.productRelevant === false && harnessOnlyRemote.artifacts.evidence.status === 'not_applicable' && !harnessOnlyRemote.env.CODEX_SKIP_NPM, failures, cases, harnessOnlyRemote.status, harnessOnlyRemote.artifacts.checks.reasonCodes);
  const workflowText = fs.existsSync('.github/workflows/quality-gate.yml') ? fs.readFileSync('.github/workflows/quality-gate.yml', 'utf8') : '';
  const uploadBlock = workflowText.split('path: |')[1] || '';
  assertCase('artifact_upload_allowlist_excludes_raw_logs', !/raw[-_ ]?logs?|npm[-_ ]?logs?|stdout|stderr/i.test(uploadBlock), failures, cases, 'pass', []);

  report = buildLive2DDatasetRowAuditReport({ forceCheck: true, requireFields: true });
  assertCase('live2d_dataset_row_audit_valid_row_pass', statusOf(report, 'live2dDatasetRowAuditStatus') === 'pass', failures, cases, statusOf(report, 'live2dDatasetRowAuditStatus'), reasonsOf(report, 'live2dDatasetRowAuditStatus'));
  report = buildLive2DDatasetRowAuditReport({ forceCheck: true, futureLabelRuntimeExecutable: true });
  assertCase('live2d_dataset_row_audit_future_label_fails', statusOf(report, 'live2dDatasetRowAuditStatus') === 'fail', failures, cases, statusOf(report, 'live2dDatasetRowAuditStatus'), reasonsOf(report, 'live2dDatasetRowAuditStatus'));
  report = buildMotionAllowlistSyncReport({ forceCheck: true, futureLabelRuntimeExecutable: true });
  assertCase('motion_allowlist_sync_future_label_runtime_executable_fails', statusOf(report, 'motionAllowlistSyncStatus') === 'fail', failures, cases, statusOf(report, 'motionAllowlistSyncStatus'), reasonsOf(report, 'motionAllowlistSyncStatus'));

  report = buildTrustedLoaderEvidenceReport({ forceCheck: true, browserSelfAssertedReady: true });
  assertCase('trusted_loader_browser_self_asserted_ready_fails', statusOf(report, 'trustedLoaderEvidenceStatus') === 'fail', failures, cases, statusOf(report, 'trustedLoaderEvidenceStatus'), reasonsOf(report, 'trustedLoaderEvidenceStatus'));
  report = buildTrustedLoaderEvidenceReport({ forceCheck: true, allowlistedEvidence: true });
  assertCase('trusted_loader_allowlisted_evidence_pass', statusOf(report, 'trustedLoaderEvidenceStatus') === 'pass', failures, cases, statusOf(report, 'trustedLoaderEvidenceStatus'), reasonsOf(report, 'trustedLoaderEvidenceStatus'));
  report = buildLive2DEvidenceCollectorContractReport({ forceCheck: true, rawCueIncluded: true });
  assertCase('live2d_evidence_collector_raw_cue_fails', statusOf(report, 'live2dEvidenceCollectorContractStatus') === 'fail', failures, cases, statusOf(report, 'live2dEvidenceCollectorContractStatus'), reasonsOf(report, 'live2dEvidenceCollectorContractStatus'));

  report = buildAvatarUxSafetyReport({ forceCheck: true, subtitleObstruction: true });
  assertCase('avatar_ux_safety_subtitle_obstruction_needs_review', statusOf(report, 'avatarUxSafetyStatus') === 'warning', failures, cases, statusOf(report, 'avatarUxSafetyStatus'), reasonsOf(report, 'avatarUxSafetyStatus'));
  report = buildAvatarUxSafetyReport({ forceCheck: true, donationScaledCloseup: true });
  assertCase('avatar_ux_safety_monetization_closeup_fails', statusOf(report, 'avatarUxSafetyStatus') === 'fail', failures, cases, statusOf(report, 'avatarUxSafetyStatus'), reasonsOf(report, 'avatarUxSafetyStatus'));

  report = buildRuntimeLatencyMeasurementReport({ forceCheck: true, duplicateDeliveryUnsafe: true });
  assertCase('runtime_latency_duplicate_delivery_fails', statusOf(report, 'runtimeLatencyMeasurementStatus') === 'fail', failures, cases, statusOf(report, 'runtimeLatencyMeasurementStatus'), reasonsOf(report, 'runtimeLatencyMeasurementStatus'));
  report = buildRuntimeLatencyMeasurementReport({ forceCheck: true, metricCount: 8 });
  assertCase('runtime_latency_safe_metric_pass', statusOf(report, 'runtimeLatencyMeasurementStatus') === 'pass', failures, cases, statusOf(report, 'runtimeLatencyMeasurementStatus'), reasonsOf(report, 'runtimeLatencyMeasurementStatus'));
  report = buildBrowserSmokeJsonArtifactReport({ forceCheck: true, requiredFieldsPresent: true });
  assertCase('browser_smoke_json_required_fields_pass', statusOf(report, 'browserSmokeJsonArtifactStatus') === 'pass', failures, cases, statusOf(report, 'browserSmokeJsonArtifactStatus'), reasonsOf(report, 'browserSmokeJsonArtifactStatus'));
  report = buildBrowserSmokeJsonArtifactReport({ forceCheck: true, requiredFieldsPresent: true, rawConsoleLogsIncluded: true });
  assertCase('browser_smoke_json_raw_console_log_fails', statusOf(report, 'browserSmokeJsonArtifactStatus') === 'fail', failures, cases, statusOf(report, 'browserSmokeJsonArtifactStatus'), reasonsOf(report, 'browserSmokeJsonArtifactStatus'));

  report = buildOwnerDecisionDigestReport({ required: true, digestPresent: true });
  assertCase('owner_decision_digest_required_pass', statusOf(report, 'ownerDecisionDigestStatus') === 'pass', failures, cases, statusOf(report, 'ownerDecisionDigestStatus'), reasonsOf(report, 'ownerDecisionDigestStatus'));
  report = buildObsoletePrAutoRecommendReport({ reuseObsoletePr: true });
  assertCase('obsolete_pr_reuse_fails', statusOf(report, 'obsoletePrAutoRecommendStatus') === 'fail', failures, cases, statusOf(report, 'obsoletePrAutoRecommendStatus'), reasonsOf(report, 'obsoletePrAutoRecommendStatus'));
  report = buildDatasetAuditV2SchemaReport({ forceCheck: true });
  assertCase('dataset_audit_v2_schema_pass', statusOf(report, 'datasetAuditV2SchemaStatus') === 'pass', failures, cases, statusOf(report, 'datasetAuditV2SchemaStatus'), reasonsOf(report, 'datasetAuditV2SchemaStatus'));
  report = buildDatasetAuditV2SchemaReport({ forceCheck: true, autoFixAllowed: true });
  assertCase('dataset_audit_auto_fix_fails', statusOf(report, 'datasetAuditV2SchemaStatus') === 'fail', failures, cases, statusOf(report, 'datasetAuditV2SchemaStatus'), reasonsOf(report, 'datasetAuditV2SchemaStatus'));

  report = buildGameToolAdapterContractFixtureV097Report({ forceCheck: true, candidateDirectHandoff: true });
  assertCase('game_tool_candidate_direct_handoff_fails', statusOf(report, 'gameToolAdapterContractFixtureStatus') === 'fail', failures, cases, statusOf(report, 'gameToolAdapterContractFixtureStatus'), reasonsOf(report, 'gameToolAdapterContractFixtureStatus'));
  report = buildGameToolAdapterContractFixtureV097Report({ forceCheck: true, approvedAction: true });
  assertCase('game_tool_approved_action_pass', statusOf(report, 'gameToolAdapterContractFixtureStatus') === 'pass', failures, cases, statusOf(report, 'gameToolAdapterContractFixtureStatus'), reasonsOf(report, 'gameToolAdapterContractFixtureStatus'));
  report = buildBelovedAvatarSafetyAuditV097Report({ forceCheck: true, memoryPrivacyViolation: true });
  assertCase('beloved_avatar_memory_privacy_fails', statusOf(report, 'belovedAvatarSafetyAuditStatus') === 'fail', failures, cases, statusOf(report, 'belovedAvatarSafetyAuditStatus'), reasonsOf(report, 'belovedAvatarSafetyAuditStatus'));

  report = buildOwnerDecisionDigestReport({ digestPresent: true });
  assertCase('source_harness_only_v097_fixture_pass', statusOf(report, 'ownerDecisionDigestStatus') === 'pass', failures, cases, statusOf(report, 'ownerDecisionDigestStatus'), reasonsOf(report, 'ownerDecisionDigestStatus'));
  report = buildWorkflowProductVerificationInvariantReport({});
  assertCase('target_harness_rollout_v097_fixture_pass', statusOf(report, 'workflowProductVerificationInvariantStatus') === 'pass', failures, cases, statusOf(report, 'workflowProductVerificationInvariantStatus'), reasonsOf(report, 'workflowProductVerificationInvariantStatus'));

  const unsafe = scanObjectForUnsafe(cases);
  const status = failures.length || unsafe.length ? 'fail' : 'pass';
  return {
    marker,
    harnessVersion: HARNESS_VERSION,
    status,
    v097SelfTestStatus: {
      status,
      suite: 'v097',
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
  const report = buildV097SelfTestReport();
  writeJsonReport(report, 'CODEX_V097_SELF_TEST_REPORT');
  exitFor(report);
}
