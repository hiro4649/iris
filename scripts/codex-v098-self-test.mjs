#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.9.8

import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { marker, HARNESS_VERSION, scanObjectForUnsafe, writeJsonReport, exitFor } from './codex-v080-lib.mjs';
import { buildMinimalSafeFailureArtifact } from './codex-artifact-lifeboat.mjs';
import { buildProductVerificationEvidenceReport } from './codex-product-verification-evidence-normalize.mjs';
import { buildRemoteNpmDiagnosticReport } from './codex-remote-npm-diagnostic-classify.mjs';
import {
  buildRemoteProductEvidenceExecutionReport,
  buildRemoteProductEvidenceRunnerReport,
  buildProductEvidenceConsumptionReport,
  buildPlaceholderEvidenceForbiddenReport,
  buildLocalRemotePhaseStatusReport,
  buildStructuredSolvabilityFieldsReport,
  buildLive2DDatasetRowAuditRunnerReport,
  buildMotionAllowlistDiffReport,
  buildTrustedLoaderEvidenceEnforcerReport,
  buildAvatarUxSafetyRunnerReport,
  buildRuntimeLatencySafeMetricReport,
  buildBrowserSmokeVisualSafetyArtifactReport,
  buildOpenPrRebaseReadinessReport,
  buildFiveLineOwnerDigestReport,
} from './codex-v098-gate-lib.mjs';

function statusOf(report, key) { return report[key]?.status || report.status || 'missing'; }
function reasonsOf(report, key) { return report[key]?.reasonCodes || []; }
function assertCase(id, condition, failures, cases, actualStatus = 'pass', reasonCodes = []) {
  cases.push({ id, status: condition ? 'pass' : 'fail', actualStatus, reasonCodes, safeSummaryOnly: true });
  if (!condition) failures.push(id);
}
function hasKeyDeep(value, targetKeys) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => hasKeyDeep(item, targetKeys));
  return Object.entries(value).some(([key, nested]) => targetKeys.has(key) || hasKeyDeep(nested, targetKeys));
}

export function buildV098SelfTestReport() {
  const failures = [];
  const cases = [];
  let report;
  const workflowText = fs.readFileSync('.github/workflows/quality-gate.yml', 'utf8');
  const uploadStepText = workflowText.slice(workflowText.indexOf('- name: Upload safe quality artifacts'));
  const lifeboatJobStart = workflowText.indexOf('safe-artifact-lifeboat:');
  const lifeboatJobText = lifeboatJobStart >= 0 ? workflowText.slice(lifeboatJobStart) : '';
  const allowedLifeboatKeys = ['schemaVersion', 'harnessVersion', 'runStatus', 'workflowJobResult', 'headSha', 'prNumber', 'repository', 'safeReasonCodes', 'artifactLifeboatStatus', 'qualityGateStatus', 'safeSummaryOnly', 'rawLogsIncluded', 'rawDiffIncluded'];
  const forbiddenLifeboatKeys = new Set(['endpoint', 'token', 'privatePath', 'payload', 'command', 'candidate', 'world_command']);
  const minimal = buildMinimalSafeFailureArtifact({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_PR_NUMBER: '112',
    CODEX_PR_HEAD_SHA: '61969ec61b97361ebce0abfde8308798e2e63ec3',
    CODEX_REPOSITORY: 'hiro4649/iris',
    CODEX_WORKFLOW_JOB_RESULT: 'failure',
    CODEX_LAST_KNOWN_REASON_CODES: 'target_quality_summary_missing product_verification_evidence_missing remote_product_baseline_missing reason_summary_missing unexpected_runner_error',
  });
  const standbyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-v098-lifeboat-standby-'));
  const normalSummaryPath = path.join(standbyDir, 'codex-quality-gate-safe-summary.json');
  fs.writeFileSync(normalSummaryPath, JSON.stringify({ status: 'fail', safeSummaryOnly: true }));
  const standbyMinimal = buildMinimalSafeFailureArtifact({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_PR_NUMBER: '129',
    CODEX_PR_HEAD_SHA: '899692df544e7ae842d1ba2116cdf5cbe33b27af',
    CODEX_REPOSITORY: 'hiro4649/iris',
    CODEX_WORKFLOW_JOB_RESULT: 'failure',
    CODEX_LAST_KNOWN_REASON_CODES: 'safe_artifact_bundle_lifeboat',
    CODEX_LIFEBOAT_STANDBY_WHEN_NORMAL_SUMMARY: '1',
    CODEX_NORMAL_SAFE_SUMMARY_PATH: normalSummaryPath,
  });
  fs.rmSync(standbyDir, { recursive: true, force: true });
  assertCase('lifeboat_minimal_safe_failure_shape_exact_keys', JSON.stringify(Object.keys(minimal).sort()) === JSON.stringify([...allowedLifeboatKeys].sort()), failures, cases, Object.keys(minimal).join(','), []);
  assertCase('normal_safe_bundle_with_quality_summary_plus_standby_lifeboat_does_not_fail_only_because_lifeboat_exists', standbyMinimal.runStatus === 'standby' && standbyMinimal.artifactLifeboatStatus.status === 'standby' && standbyMinimal.qualityGateStatus.status === 'reported' && !standbyMinimal.safeReasonCodes.includes('safe_artifact_bundle_lifeboat'), failures, cases, standbyMinimal.artifactLifeboatStatus.status, standbyMinimal.artifactLifeboatStatus.reasonCodes);
  assertCase('lifeboat_only_bundle_without_quality_summary_remains_failure', minimal.runStatus === 'fail' && minimal.artifactLifeboatStatus.status === 'fail' && minimal.qualityGateStatus.status === 'fail', failures, cases, minimal.runStatus, minimal.safeReasonCodes);
  assertCase('failing_quality_gate_still_uploads_safe_artifact_bundle', workflowText.includes('- name: Prepare safe artifact bundle') && workflowText.includes('path: ${{ runner.temp }}/codex-quality-gate-safe-artifacts') && workflowText.includes('if-no-files-found: error'), failures, cases, 'pass', []);
  assertCase('missing_target_quality_summary_uploads_minimal_failure', minimal.safeReasonCodes.includes('target_quality_summary_missing') && minimal.qualityGateStatus.status === 'fail', failures, cases, minimal.qualityGateStatus.status, minimal.safeReasonCodes);
  assertCase('missing_product_verification_evidence_uploads_minimal_failure', minimal.safeReasonCodes.includes('product_verification_evidence_missing') && minimal.qualityGateStatus.status === 'fail', failures, cases, minimal.qualityGateStatus.status, minimal.safeReasonCodes);
  assertCase('missing_remote_baseline_uploads_minimal_failure', minimal.safeReasonCodes.includes('remote_product_baseline_missing') && minimal.qualityGateStatus.status === 'fail', failures, cases, minimal.qualityGateStatus.status, minimal.safeReasonCodes);
  assertCase('missing_reason_summary_uploads_minimal_failure', minimal.safeReasonCodes.includes('reason_summary_missing') && minimal.qualityGateStatus.status === 'fail', failures, cases, minimal.qualityGateStatus.status, minimal.safeReasonCodes);
  assertCase('unexpected_runner_error_uploads_minimal_failure', minimal.safeReasonCodes.includes('unexpected_runner_error') && minimal.qualityGateStatus.status === 'fail', failures, cases, minimal.qualityGateStatus.status, minimal.safeReasonCodes);
  assertCase('upload_path_includes_lifeboat_artifact', workflowText.includes('codex-quality-gate-safe-artifacts/codex-minimal-safe-failure.json') && workflowText.includes('codex-safe-artifact-bundle-index.safe.json'), failures, cases, 'pass', []);
  assertCase('lifeboat_safe_artifact_excludes_raw_and_forbidden_fields', !scanObjectForUnsafe(minimal).length && minimal.rawLogsIncluded === false && minimal.rawDiffIncluded === false && !hasKeyDeep(minimal, forbiddenLifeboatKeys), failures, cases, 'pass', []);
  assertCase('standby_lifeboat_safe_artifact_excludes_raw_and_forbidden_fields', !scanObjectForUnsafe(standbyMinimal).length && standbyMinimal.rawLogsIncluded === false && standbyMinimal.rawDiffIncluded === false && !hasKeyDeep(standbyMinimal, forbiddenLifeboatKeys), failures, cases, 'pass', []);
  assertCase('success_path_still_uploads_normal_safe_summaries', workflowText.includes('copy_if_exists "codex-quality-gate-safe-summary.json"') && workflowText.includes('copy_if_exists "codex-target-quality-summary.json"'), failures, cases, 'pass', []);
  assertCase('normal_bundle_sets_lifeboat_standby_when_summary_present', workflowText.includes('CODEX_LIFEBOAT_STANDBY_WHEN_NORMAL_SUMMARY: "1"') && workflowText.includes('CODEX_NORMAL_SAFE_SUMMARY_PATH: codex-quality-gate-safe-summary.json'), failures, cases, 'pass', []);
  assertCase('lifeboat_failure_is_not_sweetened_into_success', minimal.runStatus === 'fail' && minimal.artifactLifeboatStatus.status === 'fail' && minimal.qualityGateStatus.status === 'fail', failures, cases, minimal.runStatus, minimal.safeReasonCodes);
  assertCase('artifact_upload_allowlist_excludes_raw_logs', !/raw\.log|raw npm log|raw report|raw job|environment dump/i.test(uploadStepText), failures, cases, 'pass', []);
  assertCase('failed_quality_gate_has_independent_lifeboat_job', lifeboatJobStart >= 0 && !lifeboatJobText.includes('actions/checkout'), failures, cases, lifeboatJobStart >= 0 ? 'present' : 'missing', []);
  assertCase('lifeboat_job_depends_on_quality_gate', /safe-artifact-lifeboat:[\s\S]*needs:\s*quality-gate/.test(lifeboatJobText), failures, cases, 'pass', []);
  assertCase('lifeboat_job_uses_if_always', /if:\s*\$\{\{\s*always\(\)/.test(lifeboatJobText), failures, cases, 'pass', []);
  assertCase('lifeboat_job_runs_on_quality_gate_failure', /needs\.quality-gate\.result\s*!=\s*'success'/.test(lifeboatJobText), failures, cases, 'pass', []);
  assertCase('lifeboat_job_writes_minimal_safe_failure_json', lifeboatJobText.includes('codex-minimal-safe-failure.json') && lifeboatJobText.includes('codex-safe-artifact-bundle-index.safe.json') && lifeboatJobText.includes('"workflowJobResult"'), failures, cases, 'pass', []);
  assertCase('lifeboat_job_artifact_excludes_raw_and_forbidden_fields', !/raw\.log|raw npm log|raw report|raw job|environment dump|endpoint|token|privatePath|payload|command|candidate|world_command/i.test(lifeboatJobText), failures, cases, 'pass', []);
  assertCase('failed_path_has_acceptable_safe_artifact_bundle', lifeboatJobText.includes('name: codex-quality-gate-safe-artifacts') && lifeboatJobText.includes('if-no-files-found: error'), failures, cases, 'pass', []);

  report = buildRemoteProductEvidenceExecutionReport({ forceCheck: true, productRelevant: true, targetRepoMode: true, isPullRequest: true, skipNpm: false, npmExecuted: true, evidencePresent: true, baselinePresent: true, diagnosticPresent: true, sameHeadEvidencePresent: true });
  assertCase('remote_product_evidence_execution_product_pr_pass', statusOf(report, 'remoteProductEvidenceExecutionStatus') === 'pass', failures, cases, statusOf(report, 'remoteProductEvidenceExecutionStatus'), reasonsOf(report, 'remoteProductEvidenceExecutionStatus'));
  report = buildRemoteProductEvidenceExecutionReport({ forceCheck: true, productRelevant: true, targetRepoMode: true, isPullRequest: true, skipNpm: false, npmExecuted: true, evidencePath: null, baselinePath: null, diagnosticPath: null });
  assertCase('remote_product_evidence_execution_missing_fails', statusOf(report, 'remoteProductEvidenceExecutionStatus') === 'fail', failures, cases, statusOf(report, 'remoteProductEvidenceExecutionStatus'), reasonsOf(report, 'remoteProductEvidenceExecutionStatus'));
  report = buildRemoteProductEvidenceExecutionReport({ forceCheck: true, productRelevant: true, targetRepoMode: true, isPullRequest: true, skipNpm: false, npmExecuted: true, evidence: { status: 'pending' }, baselinePresent: true, diagnosticPresent: true });
  assertCase('remote_product_evidence_execution_pending_placeholder_fails', statusOf(report, 'remoteProductEvidenceExecutionStatus') === 'fail', failures, cases, statusOf(report, 'remoteProductEvidenceExecutionStatus'), reasonsOf(report, 'remoteProductEvidenceExecutionStatus'));
  report = buildRemoteProductEvidenceExecutionReport({ forceCheck: true, productRelevant: true, targetRepoMode: true, isPullRequest: true, skipNpm: false, npmExecuted: true, npmExitCode: 1, evidence: { status: 'fail', evidenceType: 'remote_npm_test' }, baselinePresent: true, diagnosticPresent: true, sameHeadEvidencePresent: true });
  assertCase('remote_product_evidence_execution_npm_fail_remains_fail', statusOf(report, 'remoteProductEvidenceExecutionStatus') === 'fail', failures, cases, statusOf(report, 'remoteProductEvidenceExecutionStatus'), reasonsOf(report, 'remoteProductEvidenceExecutionStatus'));
  assertCase('remote_npm_failure_remains_gate_failure', statusOf(report, 'remoteProductEvidenceExecutionStatus') === 'fail', failures, cases, statusOf(report, 'remoteProductEvidenceExecutionStatus'), reasonsOf(report, 'remoteProductEvidenceExecutionStatus'));
  report = buildRemoteProductEvidenceExecutionReport({ forceCheck: true, productRelevant: false, targetRepoMode: true, isPullRequest: true, skipNpm: true });
  assertCase('remote_product_evidence_execution_harness_only_skip_pass', statusOf(report, 'remoteProductEvidenceExecutionStatus') === 'pass', failures, cases, statusOf(report, 'remoteProductEvidenceExecutionStatus'), reasonsOf(report, 'remoteProductEvidenceExecutionStatus'));

  report = buildRemoteProductEvidenceRunnerReport({ forceCheck: true, productRelevant: true, npmExecuted: true, npmExitCode: 0, headSha: 'abc123' });
  assertCase('remote_product_evidence_runner_no_raw_logs', statusOf(report, 'remoteProductEvidenceRunnerStatus') === 'pass', failures, cases, statusOf(report, 'remoteProductEvidenceRunnerStatus'), reasonsOf(report, 'remoteProductEvidenceRunnerStatus'));
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-v098-self-test-'));
  const productEvidencePath = path.join(tempDir, 'product-evidence.json');
  const npmDiagnosticPath = path.join(tempDir, 'npm-diagnostic.json');
  fs.writeFileSync(productEvidencePath, JSON.stringify({ status: 'not_applicable', evidenceType: 'not_applicable', commands: [], rawLogsIncluded: false, safeSummaryOnly: true }));
  fs.writeFileSync(npmDiagnosticPath, JSON.stringify({ npmExitCode: 0, safeFailureCategory: 'test_assertion_failure', rawLogUploaded: false, rawValuesStored: false, safeSummaryOnly: true }));
  report = buildProductVerificationEvidenceReport({ CODEX_PRODUCT_VERIFICATION_EVIDENCE_PATH: productEvidencePath, CODEX_CHANGED_FILES: 'docs/process/CODEX_V098_EVAL_CASES.json', CODEX_HARNESS_SOURCE_REPO: '1' });
  assertCase('remote_product_evidence_runner_false_raw_log_sentinel_consumed_pass', statusOf(report, 'productVerificationEvidenceStatus') === 'pass', failures, cases, statusOf(report, 'productVerificationEvidenceStatus'), reasonsOf(report, 'productVerificationEvidenceStatus'));
  report = buildRemoteNpmDiagnosticReport({ CODEX_NPM_TEST_SAFE_SUMMARY_PATH: npmDiagnosticPath });
  assertCase('remote_npm_diagnostic_false_raw_log_sentinel_consumed_pass', statusOf(report, 'remoteNpmDiagnosticStatus') === 'pass', failures, cases, statusOf(report, 'remoteNpmDiagnosticStatus'), reasonsOf(report, 'remoteNpmDiagnosticStatus'));
  report = buildProductEvidenceConsumptionReport({ evidenceGenerated: true, productRelevant: true });
  assertCase('product_evidence_consumption_generated_but_not_consumed_fails', statusOf(report, 'productEvidenceConsumptionStatus') === 'fail', failures, cases, statusOf(report, 'productEvidenceConsumptionStatus'), reasonsOf(report, 'productEvidenceConsumptionStatus'));
  report = buildPlaceholderEvidenceForbiddenReport({ productRelevant: true, evidence: { evidenceType: 'placeholder', status: 'pending' } });
  assertCase('placeholder_evidence_forbidden_product_pr', statusOf(report, 'placeholderEvidenceForbiddenStatus') === 'fail', failures, cases, statusOf(report, 'placeholderEvidenceForbiddenStatus'), reasonsOf(report, 'placeholderEvidenceForbiddenStatus'));

  report = buildLocalRemotePhaseStatusReport({ remoteEvidencePhase: 'remote_evidence_pending_before_push' });
  assertCase('local_pre_push_remote_pending_allowed', statusOf(report, 'localRemotePhaseStatus') === 'pass', failures, cases, statusOf(report, 'localRemotePhaseStatus'), reasonsOf(report, 'localRemotePhaseStatus'));
  report = buildLocalRemotePhaseStatusReport({ remoteEvidencePhase: 'remote_evidence_required_after_push', remoteEvidenceMissing: true });
  assertCase('remote_after_push_evidence_required', statusOf(report, 'localRemotePhaseStatus') === 'fail', failures, cases, statusOf(report, 'localRemotePhaseStatus'), reasonsOf(report, 'localRemotePhaseStatus'));
  report = buildStructuredSolvabilityFieldsReport({ requireFields: true, localImplementationSolvability: 'local_pass', externalServicesRequiredForLocalValidation: false, remoteEvidencePhase: 'remote_evidence_pass', mergeReadiness: 'ready', productionReadinessClaimed: false, runtimeReadinessClaimed: false, priority1Status: 'not_applicable' });
  assertCase('structured_solvability_fields_pass', statusOf(report, 'structuredSolvabilityFieldsStatus') === 'pass', failures, cases, statusOf(report, 'structuredSolvabilityFieldsStatus'), reasonsOf(report, 'structuredSolvabilityFieldsStatus'));
  report = buildStructuredSolvabilityFieldsReport({ mergeReady: true, remoteEvidencePhase: 'pending' });
  assertCase('structured_solvability_merge_ready_with_remote_pending_fails', statusOf(report, 'structuredSolvabilityFieldsStatus') === 'fail', failures, cases, statusOf(report, 'structuredSolvabilityFieldsStatus'), reasonsOf(report, 'structuredSolvabilityFieldsStatus'));

  report = buildLive2DDatasetRowAuditRunnerReport({ forceCheck: true, requireFields: true });
  assertCase('live2d_dataset_row_audit_valid_row_pass', statusOf(report, 'live2dDatasetRowAuditRunnerStatus') === 'pass', failures, cases, statusOf(report, 'live2dDatasetRowAuditRunnerStatus'), reasonsOf(report, 'live2dDatasetRowAuditRunnerStatus'));
  report = buildLive2DDatasetRowAuditRunnerReport({ forceCheck: true, rowIdMissing: true });
  assertCase('live2d_dataset_row_audit_missing_row_id_fails', statusOf(report, 'live2dDatasetRowAuditRunnerStatus') === 'fail', failures, cases, statusOf(report, 'live2dDatasetRowAuditRunnerStatus'), reasonsOf(report, 'live2dDatasetRowAuditRunnerStatus'));
  report = buildMotionAllowlistDiffReport({ forceCheck: true, futureLabelRuntimeExecutable: true });
  assertCase('motion_allowlist_diff_future_label_runtime_fails', statusOf(report, 'motionAllowlistDiffStatus') === 'fail', failures, cases, statusOf(report, 'motionAllowlistDiffStatus'), reasonsOf(report, 'motionAllowlistDiffStatus'));
  report = buildTrustedLoaderEvidenceEnforcerReport({ forceCheck: true, browserSelfAssertedReadyTrusted: true });
  assertCase('trusted_loader_enforcer_browser_self_asserted_fails', statusOf(report, 'trustedLoaderEvidenceEnforcerStatus') === 'fail', failures, cases, statusOf(report, 'trustedLoaderEvidenceEnforcerStatus'), reasonsOf(report, 'trustedLoaderEvidenceEnforcerStatus'));
  report = buildTrustedLoaderEvidenceEnforcerReport({ forceCheck: true });
  assertCase('trusted_loader_enforcer_allowlisted_pass', statusOf(report, 'trustedLoaderEvidenceEnforcerStatus') === 'pass', failures, cases, statusOf(report, 'trustedLoaderEvidenceEnforcerStatus'), reasonsOf(report, 'trustedLoaderEvidenceEnforcerStatus'));
  report = buildAvatarUxSafetyRunnerReport({ forceCheck: true, subtitleObstruction: true });
  assertCase('avatar_ux_safety_subtitle_obstruction_needs_review', statusOf(report, 'avatarUxSafetyRunnerStatus') === 'warning', failures, cases, statusOf(report, 'avatarUxSafetyRunnerStatus'), reasonsOf(report, 'avatarUxSafetyRunnerStatus'));
  report = buildRuntimeLatencySafeMetricReport({ forceCheck: true });
  assertCase('runtime_latency_safe_metric_pass', statusOf(report, 'runtimeLatencySafeMetricStatus') === 'pass', failures, cases, statusOf(report, 'runtimeLatencySafeMetricStatus'), reasonsOf(report, 'runtimeLatencySafeMetricStatus'));
  report = buildRuntimeLatencySafeMetricReport({ forceCheck: true, rawCueBodyIncluded: true });
  assertCase('runtime_latency_raw_cue_fails', statusOf(report, 'runtimeLatencySafeMetricStatus') === 'fail', failures, cases, statusOf(report, 'runtimeLatencySafeMetricStatus'), reasonsOf(report, 'runtimeLatencySafeMetricStatus'));
  report = buildBrowserSmokeVisualSafetyArtifactReport({ forceCheck: true, requiredFieldsPresent: true });
  assertCase('browser_smoke_visual_artifact_pass', statusOf(report, 'browserSmokeVisualSafetyArtifactStatus') === 'pass', failures, cases, statusOf(report, 'browserSmokeVisualSafetyArtifactStatus'), reasonsOf(report, 'browserSmokeVisualSafetyArtifactStatus'));
  report = buildBrowserSmokeVisualSafetyArtifactReport({ forceCheck: true, requiredFieldsPresent: true, rawConsoleLogsIncluded: true });
  assertCase('browser_smoke_visual_raw_console_log_fails', statusOf(report, 'browserSmokeVisualSafetyArtifactStatus') === 'fail', failures, cases, statusOf(report, 'browserSmokeVisualSafetyArtifactStatus'), reasonsOf(report, 'browserSmokeVisualSafetyArtifactStatus'));
  report = buildOpenPrRebaseReadinessReport({ openPrStale: true });
  assertCase('open_pr_rebase_readiness_old_base_warns', statusOf(report, 'openPrRebaseReadinessStatus') === 'warning', failures, cases, statusOf(report, 'openPrRebaseReadinessStatus'), reasonsOf(report, 'openPrRebaseReadinessStatus'));
  report = buildOpenPrRebaseReadinessReport({ obsoletePrReused: true });
  assertCase('open_pr_rebase_readiness_obsolete_reuse_fails', statusOf(report, 'openPrRebaseReadinessStatus') === 'fail', failures, cases, statusOf(report, 'openPrRebaseReadinessStatus'), reasonsOf(report, 'openPrRebaseReadinessStatus'));
  report = buildFiveLineOwnerDigestReport({ fiveLineDigestPresent: true });
  assertCase('five_line_owner_digest_pass', statusOf(report, 'fiveLineOwnerDigestStatus') === 'pass', failures, cases, statusOf(report, 'fiveLineOwnerDigestStatus'), reasonsOf(report, 'fiveLineOwnerDigestStatus'));
  report = buildFiveLineOwnerDigestReport({ digestMissing: true });
  assertCase('five_line_owner_digest_missing_fails', statusOf(report, 'fiveLineOwnerDigestStatus') === 'fail', failures, cases, statusOf(report, 'fiveLineOwnerDigestStatus'), reasonsOf(report, 'fiveLineOwnerDigestStatus'));
  report = buildFiveLineOwnerDigestReport({});
  assertCase('source_harness_only_v098_fixture_pass', statusOf(report, 'fiveLineOwnerDigestStatus') === 'pass', failures, cases, statusOf(report, 'fiveLineOwnerDigestStatus'), reasonsOf(report, 'fiveLineOwnerDigestStatus'));
  report = buildRemoteProductEvidenceExecutionReport({ forceCheck: true, productRelevant: false, targetRepoMode: true, isPullRequest: true, skipNpm: true });
  assertCase('target_harness_rollout_v098_fixture_pass', statusOf(report, 'remoteProductEvidenceExecutionStatus') === 'pass', failures, cases, statusOf(report, 'remoteProductEvidenceExecutionStatus'), reasonsOf(report, 'remoteProductEvidenceExecutionStatus'));

  const unsafe = scanObjectForUnsafe(cases);
  const status = failures.length || unsafe.length ? 'fail' : 'pass';
  return {
    marker,
    harnessVersion: HARNESS_VERSION,
    status,
    v098SelfTestStatus: {
      status,
      suite: 'v098',
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
  const report = buildV098SelfTestReport();
  writeJsonReport(report, 'CODEX_V098_SELF_TEST_REPORT');
  exitFor(report);
}
