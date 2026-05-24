#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.8.2
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { HARNESS_VERSION, marker, writeJsonReport } from './codex-v080-lib.mjs';
import { evaluateWorkflowReport } from './codex-workflow-quality-runner.mjs';
import { classifyChange, loadClassificationRules } from './codex-change-classification-gate.mjs';
import { buildProductVerificationReport } from './codex-product-verification-gate.mjs';
import { buildProductVerificationEvidenceReport } from './codex-product-verification-evidence-normalize.mjs';
import { buildTestMetricsReport } from './codex-test-metrics-collect.mjs';
import { buildStalePrAuditReport } from './codex-stale-pr-audit-gate.mjs';
import { buildCompactReasonSummary } from './codex-reason-summary.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.dirname(here);

function run(script, options = {}) {
  const result = spawnSync(process.execPath, [path.join(repo, script), '--json'], {
    cwd: options.cwd || repo,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    return { code: result.status, parsed: JSON.parse(result.stdout || '{}') };
  } catch {
    return { code: result.status, parsed: null };
  }
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function assertCase(name, ok, failures, cases, status = ok ? 'pass' : 'fail') {
  cases.push({ name, status });
  if (!ok) failures.push(name);
}

function passStatus(status = 'pass') {
  return { status, safeSummaryOnly: true, reasonCodes: [] };
}

function sourcePassReport() {
  const report = {
    status: 'pass',
    mergeReady: true,
    humanReviewRequired: false,
    qualityScoreStatus: { status: 'pass', score: 100, safeSummaryOnly: true },
  };
  for (const key of [
    'sourceHarnessValidationStatus',
    'profileTemplateCompatibilityStatus',
    'genericHarnessCoreStatus',
    'agentsContextStatus',
    'environmentReadinessStatus',
    'goldenSetStatus',
    'changeClassificationStatus',
    'productVerificationStatus',
    'productVerificationEvidenceStatus',
    'testMetricsStatus',
    'stalePrAuditStatus',
    'reasonSummaryStatus',
    'bestOfNEvidenceStatus',
    'taskQueueLiteStatus',
    'safeTraceSchemaStatus',
    'curatorReportStatus',
    'offlineEvolutionProposalStatus',
    'testCoverageEvidenceStatus',
    'performanceEvidenceStatus',
    'agentMemoryPolicyStatus',
    'skillLifecyclePolicyStatus',
    'curatorSuggestionStatus',
    'selfEvolutionPolicyStatus',
    'safeArtifactValidation',
    'outputShapeStatus',
    'openaiCodexMethodStatus',
    'methodSupportStatus',
    'productionReadinessStatus',
    'evidenceIntegrityStatus',
    'hermesInvariantStatus',
    'evidencePackStatus',
    'humanConfirmationObjectStatus',
    'safeOutputScanStatus',
    'ciReplayStatus',
    'prBodyLintStatus',
    'failureReasonCatalogStatus',
    'v071SelfTestStatus',
    'v072SelfTestStatus',
    'v080SelfTestStatus',
    'v081SelfTestStatus',
    'v082SelfTestStatus',
  ]) report[key] = passStatus();
  return report;
}

function targetPassReport() {
  const report = {
    status: 'pass',
    mergeReady: true,
    targetMergeReady: true,
    targetQualityScoreStatus: { status: 'pass', score: 100, safeSummaryOnly: true },
  };
  for (const key of [
    'targetManifestStatus',
    'secretScan',
    'agentsContextStatus',
    'environmentReadinessStatus',
    'changeClassificationStatus',
    'productVerificationStatus',
    'productVerificationEvidenceStatus',
    'testMetricsStatus',
    'stalePrAuditStatus',
    'reasonSummaryStatus',
    'safeOutputScanStatus',
    'v080SelfTestStatus',
    'v081SelfTestStatus',
    'v082SelfTestStatus',
    'safeArtifactValidation',
    'outputShapeStatus',
  ]) report[key] = passStatus();
  return report;
}

function buildNpmSafeDiagnostic(logText, options = {}) {
  const text = String(logText || '');
  const markerRules = [
    ['bom_parse_failure', /\bBOM\b|\uFEFF|Unexpected token .* JSON at position 0/i],
    ['json_parse_failure', /JSON\.parse|Unexpected token .*JSON|Unexpected end of JSON|SyntaxError.*JSON/i],
    ['module_not_found', /ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|Cannot find module/i],
    ['missing_dependency', /Cannot find package|npm ERR! missing|ENOENT.*node_modules/i],
    ['node_syntax_check_failure', /SyntaxError|Unexpected token/i],
    ['permission_or_path_issue', /EACCES|EPERM|ENOENT/i],
    ['timeout_or_killed', /timed out|timeout|SIGKILL|Killed/i],
    ['test_fixture_failure', /not ok|AssertionError|test failed|FAIL/i],
  ];
  let category = 'unknown_npm_failure';
  let markerCount = 0;
  for (const [label, pattern] of markerRules) {
    if (pattern.test(text)) {
      markerCount += 1;
      if (category === 'unknown_npm_failure') category = label;
    }
  }
  const testCountMatch = text.match(/\b(\d{1,5})\s+tests?\b/i);
  const testCount = testCountMatch ? Number.parseInt(testCountMatch[1], 10) : null;
  const platform = ['linux', 'win32', 'darwin'].includes(options.platform || process.platform)
    ? options.platform || process.platform
    : 'other';
  return {
    schema: 'codex_npm_test_safe_summary_v1',
    status: 'fail',
    safeSummaryOnly: true,
    npm_exit_code: Number.isFinite(options.exitCode) ? options.exitCode : 1,
    node_version_major: Number.parseInt(process.versions.node.split('.')[0] || '0', 10),
    platform,
    package_json_exists: true,
    run_tests_js_exists: true,
    node_modules_exists: Boolean(options.nodeModulesExists),
    package_install_present: Boolean(options.nodeModulesExists),
    test_count_detected: testCount,
    safe_failure_category: category,
    safe_failure_marker_count: markerCount,
    raw_values_printed: false,
  };
}

function withRulesTmp(callback) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-v082-'));
  fs.mkdirSync(path.join(tmp, 'docs', 'process'), { recursive: true });
  fs.copyFileSync(path.join(repo, 'docs', 'process', 'CODEX_CHANGE_CLASSIFICATION_RULES.json'), path.join(tmp, 'docs', 'process', 'CODEX_CHANGE_CLASSIFICATION_RULES.json'));
  return callback(tmp);
}

function buildReport() {
  const failures = [];
  const cases = [];

  let result = evaluateWorkflowReport(sourcePassReport(), { eventName: 'workflow_dispatch' });
  assertCase('workflow runner accepts source pass report', result.status === 'pass', failures, cases, result.status);
  const failedSource = sourcePassReport();
  failedSource.agentsContextStatus = passStatus('fail');
  result = evaluateWorkflowReport(failedSource, { eventName: 'pull_request' });
  assertCase('workflow runner rejects source fail report', result.status === 'fail', failures, cases, result.status);
  result = evaluateWorkflowReport(targetPassReport(), { eventName: 'pull_request' });
  assertCase('workflow runner accepts target pass report', result.status === 'pass', failures, cases, result.status);
  const targetWithSafeGithubMetadata = targetPassReport();
  targetWithSafeGithubMetadata.prContext = {
    pullRequestUrl: 'https://github.com/hiro4649/iris/pull/82',
    commitUrl: 'https://github.com/hiro4649/iris/commit/a33b09fb48499c4d660cec52c953549c8004abef',
    apiUrl: 'https://api.github.com/repos/hiro4649/iris/pulls/82',
    changedFiles: ['scripts/run-tests.js'],
    artifactFilename: 'codex-quality-gate-safe-summary.json',
    commandLabel: 'npm test',
    sourceLabel: 'github_actions',
    policyVocabulary: 'Do not print raw payload, raw logs, endpoint value, secret value, or private path; safe status labels only.',
  };
  result = evaluateWorkflowReport(targetWithSafeGithubMetadata, { eventName: 'pull_request' });
  assertCase('workflow runner accepts public GitHub metadata and safe policy vocabulary', result.status === 'pass', failures, cases, result.status);
  const unsafeTokenReport = targetPassReport();
  unsafeTokenReport.safeMetadata = { tokenLabel: 'ghp_1234567890abcdef' };
  result = evaluateWorkflowReport(unsafeTokenReport, { eventName: 'pull_request' });
  assertCase('workflow runner rejects secret-like token values', result.status === 'fail', failures, cases, result.status);
  assertCase('workflow runner emits safe reason labels only for token findings', !JSON.stringify(result).includes('ghp_1234567890abcdef'), failures, cases, result.status);
  const credentialedUrlReport = targetPassReport();
  credentialedUrlReport.safeMetadata = { publicUrl: 'https://user:pass@github.com/hiro4649/iris/pull/82' };
  result = evaluateWorkflowReport(credentialedUrlReport, { eventName: 'pull_request' });
  assertCase('workflow runner rejects credentialed URL values', result.status === 'fail', failures, cases, result.status);
  assertCase('workflow runner does not print credentialed URL values', !JSON.stringify(result).includes('user:pass'), failures, cases, result.status);
  const privatePathReport = targetPassReport();
  privatePathReport.safeMetadata = { pathLabel: 'C:\\Users\\HIRO-001\\Documents\\secret.txt' };
  result = evaluateWorkflowReport(privatePathReport, { eventName: 'pull_request' });
  assertCase('workflow runner rejects private path values', result.status === 'fail', failures, cases, result.status);
  assertCase('workflow runner does not print private path values', !JSON.stringify(result).includes('HIRO-001'), failures, cases, result.status);
  const rawPayloadReport = targetPassReport();
  rawPayloadReport.safeMetadata = { rawPayload: 'safe label only' };
  result = evaluateWorkflowReport(rawPayloadReport, { eventName: 'pull_request' });
  assertCase('workflow runner rejects rawPayload fields', result.status === 'fail', failures, cases, result.status);
  const endpointValueReport = targetPassReport();
  endpointValueReport.safeMetadata = { endpointValue: 'safe label only' };
  result = evaluateWorkflowReport(endpointValueReport, { eventName: 'pull_request' });
  assertCase('workflow runner rejects endpointValue fields', result.status === 'fail', failures, cases, result.status);
  const manualSource = sourcePassReport();
  manualSource.humanConfirmationObjectStatus = passStatus('manual_confirmation_required');
  result = evaluateWorkflowReport(manualSource, { eventName: 'pull_request' });
  assertCase('workflow runner preserves manual_confirmation_required', result.status === 'fail', failures, cases, result.status);

  result = withRulesTmp((tmp) => loadClassificationRules({ CODEX_CHANGE_CLASSIFICATION_RULES_PATH: path.join(tmp, 'docs', 'process', 'CODEX_CHANGE_CLASSIFICATION_RULES.json') }));
  assertCase('change classification rules JSON loads', result.ok, failures, cases, result.ok ? 'pass' : result.reasonCode);
  result = loadClassificationRules({ CODEX_CHANGE_CLASSIFICATION_RULES_PATH: path.join(os.tmpdir(), 'missing-rules.json') });
  assertCase('missing classification rules JSON fails in PR context', result.ok === false && result.reasonCode === 'classification_rules_missing', failures, cases, result.reasonCode);

  let classified = classifyChange(['scripts/run-tests.js'], { CODEX_EVENT_NAME: 'pull_request' });
  assertCase('scripts/run-tests.js classified as verification-relevant', classified.productRelevantChanged, failures, cases, classified.status);
  classified = classifyChange(['package-lock.json'], { CODEX_EVENT_NAME: 'pull_request' });
  assertCase('package-lock file is package/lock relevant', classified.packageOrLockfileChanged, failures, cases, classified.status);
  classified = classifyChange(['unknown.safe'], { CODEX_EVENT_NAME: 'pull_request' });
  assertCase('unknown file fails in PR context', classified.status === 'fail', failures, cases, classified.status);
  classified = classifyChange(['scripts/codex-local-quality-gate.mjs'], { CODEX_EVENT_NAME: 'pull_request' });
  assertCase('harness-only changed files classify as harnessOnly', classified.classification.harnessOnly, failures, cases, classified.status);
  classified = classifyChange(['README.md'], { CODEX_EVENT_NAME: 'pull_request' });
  assertCase('docs-only changed files classify as docsOnly', classified.classification.docsOnly, failures, cases, classified.status);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-v082-override-'));
  write(path.join(tmp, 'docs', 'process', 'CODEX_CHANGE_CLASSIFICATION_RULES.json'), fs.readFileSync(path.join(repo, 'docs', 'process', 'CODEX_CHANGE_CLASSIFICATION_RULES.json'), 'utf8'));
  write(path.join(tmp, 'docs', 'process', 'CODEX_CHANGE_CLASSIFICATION_RULES.local.json'), JSON.stringify({
    authorityFiles: ['PROJECT_AUTHORITY.md'],
  }, null, 2));
  const oldCwd = process.cwd();
  process.chdir(tmp);
  classified = classifyChange(['PROJECT_AUTHORITY.md'], { CODEX_EVENT_NAME: 'pull_request' });
  process.chdir(oldCwd);
  assertCase('local override can add a repo-specific authority file safely', classified.classification.authorityChanged, failures, cases, classified.status);

  result = buildProductVerificationEvidenceReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_SKIP_NPM: '1',
    CODEX_CHANGED_FILES: 'scripts/codex-local-quality-gate.mjs',
    CODEX_NPM_SKIP_REASON: 'harness-only',
  });
  assertCase('harness-only change with CODEX_SKIP_NPM=1 passes through normalized evidence', result.productVerificationEvidenceStatus.status === 'pass', failures, cases, result.productVerificationEvidenceStatus.status);
  result = buildProductVerificationReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_SKIP_NPM: '1',
    CODEX_CHANGED_FILES: 'README.md',
    CODEX_NPM_SKIP_REASON: 'docs-only',
  });
  assertCase('docs-only change with CODEX_SKIP_NPM=1 and safe reason passes product verification', result.productVerificationStatus.status === 'pass', failures, cases, result.productVerificationStatus.status);
  result = buildProductVerificationReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_SKIP_NPM: '1',
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
  });
  assertCase('scripts/run-tests.js target change with CODEX_SKIP_NPM=1 fails product verification', result.productVerificationStatus.status === 'fail', failures, cases, result.productVerificationStatus.status);
  result = buildProductVerificationEvidenceReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_SKIP_NPM: '1',
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
  });
  assertCase('scripts/run-tests.js target change with CODEX_SKIP_NPM=1 fails normalized evidence', result.productVerificationEvidenceStatus.status === 'fail', failures, cases, result.productVerificationEvidenceStatus.status);
  const remoteNpmPass = {
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_PRODUCT_VERIFICATION_COMMANDS: 'npm test',
    CODEX_PRODUCT_VERIFICATION_RESULT: 'pass',
    CODEX_PRODUCT_VERIFICATION_SOURCE: 'remote_quality_gate',
  };
  result = buildProductVerificationReport(remoteNpmPass);
  assertCase('product-relevant target change with remote npm evidence pass passes product verification', result.productVerificationStatus.status === 'pass', failures, cases, result.productVerificationStatus.status);
  const remoteNpmEvidence = buildProductVerificationEvidenceReport(remoteNpmPass);
  assertCase('product-relevant target change with remote npm evidence pass passes normalized evidence', remoteNpmEvidence.productVerificationEvidenceStatus.status === 'pass', failures, cases, remoteNpmEvidence.productVerificationEvidenceStatus.status);
  const validProductTargetReport = targetPassReport();
  validProductTargetReport.productVerificationStatus = result.productVerificationStatus;
  validProductTargetReport.productVerificationEvidenceStatus = remoteNpmEvidence.productVerificationEvidenceStatus;
  validProductTargetReport.reasonSummaryStatus = passStatus('pass');
  validProductTargetReport.targetQualityScoreStatus = { status: 'pass', score: 95, safeSummaryOnly: true };
  const validProductTargetResult = evaluateWorkflowReport(validProductTargetReport, { eventName: 'pull_request' });
  assertCase('target runner remains pass when product evidence is valid', validProductTargetResult.status === 'pass', failures, cases, validProductTargetResult.status);
  const remoteNpmFail = {
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_PRODUCT_VERIFICATION_COMMANDS: 'npm test',
    CODEX_PRODUCT_VERIFICATION_RESULT: 'fail',
    CODEX_PRODUCT_VERIFICATION_SOURCE: 'remote_quality_gate',
  };
  result = buildProductVerificationReport(remoteNpmFail);
  assertCase('product-relevant target change with remote npm evidence fail fails product verification', result.productVerificationStatus.status === 'fail', failures, cases, result.productVerificationStatus.status);
  result = buildProductVerificationEvidenceReport(remoteNpmFail);
  assertCase('product-relevant target change with remote npm evidence fail fails normalized evidence', result.productVerificationEvidenceStatus.status === 'fail', failures, cases, result.productVerificationEvidenceStatus.status);
  const remoteNpmFailTarget = targetPassReport();
  remoteNpmFailTarget.productVerificationStatus = buildProductVerificationReport(remoteNpmFail).productVerificationStatus;
  remoteNpmFailTarget.productVerificationEvidenceStatus = result.productVerificationEvidenceStatus;
  remoteNpmFailTarget.targetQualityScoreStatus = { status: 'fail', score: 70, safeSummaryOnly: true };
  const remoteNpmFailRunner = evaluateWorkflowReport(remoteNpmFailTarget, { eventName: 'pull_request' });
  assertCase('product-relevant remote npm fail keeps target runner failing', remoteNpmFailRunner.status === 'fail', failures, cases, remoteNpmFailRunner.status);

  const moduleDiagnostic = buildNpmSafeDiagnostic('Error: Cannot find module example\n    at /home/runner/work/iris/iris/file.js', { exitCode: 1, platform: 'linux' });
  assertCase('remote npm diagnostic emits safe summary only', moduleDiagnostic.safeSummaryOnly && moduleDiagnostic.raw_values_printed === false, failures, cases, moduleDiagnostic.status);
  assertCase('remote npm diagnostic classifies module_not_found without raw stack', moduleDiagnostic.safe_failure_category === 'module_not_found' && !JSON.stringify(moduleDiagnostic).includes('/home/runner'), failures, cases, moduleDiagnostic.safe_failure_category);
  const jsonDiagnostic = buildNpmSafeDiagnostic('SyntaxError: Unexpected token } in JSON at position 4\n{"not":"printed"}');
  assertCase('remote npm diagnostic classifies json_parse_failure without raw JSON', jsonDiagnostic.safe_failure_category === 'json_parse_failure' && !JSON.stringify(jsonDiagnostic).includes('not'), failures, cases, jsonDiagnostic.safe_failure_category);
  const bomDiagnostic = buildNpmSafeDiagnostic('\uFEFF SyntaxError: Unexpected token ﻿ in JSON at position 0');
  assertCase('remote npm diagnostic classifies bom_parse_failure without raw JSON', bomDiagnostic.safe_failure_category === 'bom_parse_failure' && !JSON.stringify(bomDiagnostic).includes('\uFEFF'), failures, cases, bomDiagnostic.safe_failure_category);
  const tokenDiagnostic = buildNpmSafeDiagnostic('token ghp_1234567890abcdef should not print');
  assertCase('remote npm diagnostic rejects token or secret leakage by omission', !JSON.stringify(tokenDiagnostic).includes('ghp_1234567890abcdef'), failures, cases, tokenDiagnostic.status);
  const pathDiagnostic = buildNpmSafeDiagnostic('failure at C:\\Users\\HIRO-001\\Documents\\private.txt');
  assertCase('remote npm diagnostic rejects private path leakage by omission', !JSON.stringify(pathDiagnostic).includes('HIRO-001'), failures, cases, pathDiagnostic.status);
  const workflowText = fs.readFileSync(path.join(repo, '.github', 'workflows', 'quality-gate.yml'), 'utf8');
  const uploadBlock = workflowText.slice(workflowText.indexOf('Upload safe quality artifacts'));
  assertCase('remote npm diagnostic does not upload raw npm log', !uploadBlock.includes('codex-npm-test-safe-hidden.log'), failures, cases, uploadBlock.includes('codex-npm-test-safe-hidden.log') ? 'fail' : 'pass');
  assertCase('remote npm diagnostic uploads safe summary artifact', uploadBlock.includes('codex-npm-test-safe-summary.json'), failures, cases, uploadBlock.includes('codex-npm-test-safe-summary.json') ? 'pass' : 'fail');
  assertCase('remote npm diagnostic includes exit code and safe category', moduleDiagnostic.npm_exit_code === 1 && moduleDiagnostic.safe_failure_category === 'module_not_found', failures, cases, moduleDiagnostic.safe_failure_category);

  result = buildProductVerificationReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_SKIP_NPM: '1',
    CODEX_CHANGED_FILES: 'src/app.js',
  });
  assertCase('product src change with CODEX_SKIP_NPM=1 fails through normalized evidence', result.productVerificationStatus.status === 'fail', failures, cases, result.productVerificationStatus.status);
  result = buildProductVerificationReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_SKIP_NPM: '1',
    CODEX_CHANGED_FILES: 'scripts/codex-local-quality-gate.mjs',
    CODEX_PR_BODY: 'Runtime readiness claimed: yes.',
  });
  assertCase('runtime readiness claim with CODEX_SKIP_NPM=1 fails', result.productVerificationStatus.status === 'fail', failures, cases, result.productVerificationStatus.status);
  result = buildProductVerificationReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'package-lock.json',
    CODEX_SKIP_NPM: '1',
  });
  assertCase('package/lockfile change with CODEX_SKIP_NPM=1 fails', result.productVerificationStatus.status === 'fail', failures, cases, result.productVerificationStatus.status);
  result = buildProductVerificationReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'src/app.js',
    CODEX_PRODUCT_VERIFICATION_COMMANDS: 'npm test',
    CODEX_PRODUCT_VERIFICATION_RESULT: 'pass',
  });
  assertCase('npm test pass evidence with duration/testCount normalizes to pass', result.productVerificationStatus.status === 'pass', failures, cases, result.productVerificationStatus.status);
  const unsafeEvidence = path.join(os.tmpdir(), `codex-unsafe-evidence-${Date.now()}.json`);
  write(unsafeEvidence, JSON.stringify({ rawLogs: 'stored output' }));
  result = buildProductVerificationEvidenceReport({ CODEX_PRODUCT_VERIFICATION_EVIDENCE_PATH: unsafeEvidence });
  assertCase('unsafe evidence field fails safe output', result.productVerificationEvidenceStatus.status === 'fail', failures, cases, result.productVerificationEvidenceStatus.status);

  const metricsFile = path.join(os.tmpdir(), `codex-safe-metrics-${Date.now()}.json`);
  write(metricsFile, JSON.stringify({ command: 'npm test', result: 'pass', durationMs: 123, testCount: 4, safeSummary: 'safe metrics' }));
  result = buildTestMetricsReport({ CODEX_TEST_METRICS_INPUT_PATH: metricsFile });
  assertCase('safe npm metrics pass', result.testMetricsStatus.status === 'pass', failures, cases, result.testMetricsStatus.status);
  const unsafeMetricsFile = path.join(os.tmpdir(), `codex-unsafe-metrics-${Date.now()}.json`);
  write(unsafeMetricsFile, JSON.stringify({ command: 'npm test', result: 'pass', rawLogs: 'stored raw output' }));
  result = buildTestMetricsReport({ CODEX_TEST_METRICS_INPUT_PATH: unsafeMetricsFile });
  assertCase('metrics with raw logs fail', result.testMetricsStatus.status === 'fail', failures, cases, result.testMetricsStatus.status);

  result = run('scripts/codex-performance-evidence-gate.mjs', { env: { CODEX_EVENT_NAME: 'pull_request', CODEX_PR_BODY: 'This change is faster.' } });
  assertCase('performance claim without baseline/new metrics fails', result.parsed?.performanceEvidenceStatus?.status === 'fail', failures, cases, result.parsed?.performanceEvidenceStatus?.status);
  const perfMetricsFile = path.join(os.tmpdir(), `codex-perf-metrics-${Date.now()}.json`);
  write(perfMetricsFile, JSON.stringify({ baselineSummary: 'old safe baseline', newMeasurementSummary: 'new safe measurement' }));
  result = run('scripts/codex-performance-evidence-gate.mjs', { env: { CODEX_EVENT_NAME: 'pull_request', CODEX_PR_BODY: 'This change is faster.', CODEX_TEST_METRICS_PATH: perfMetricsFile } });
  assertCase('performance claim with safe baseline/new metrics passes', result.parsed?.performanceEvidenceStatus?.status === 'pass', failures, cases, result.parsed?.performanceEvidenceStatus?.status);

  const staleBody = 'BEGIN_CODEX_MANUAL_CONFIRMATION_JSON\n{\"codexManualConfirmation\":{\"headSha\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"}}\nEND_CODEX_MANUAL_CONFIRMATION_JSON';
  result = buildStalePrAuditReport({ CODEX_EVENT_NAME: 'pull_request', CODEX_PR_HEAD_SHA: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', CODEX_PR_BODY: staleBody });
  assertCase('stale confirmation fails', result.stalePrAuditStatus.status === 'fail', failures, cases, result.stalePrAuditStatus.status);
  result = buildStalePrAuditReport({ CODEX_EVENT_NAME: 'pull_request', CODEX_PR_HEAD_SHA: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', CODEX_PR_BODY: '"headSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"' });
  assertCase('stale evidence fails', result.stalePrAuditStatus.status === 'fail', failures, cases, result.stalePrAuditStatus.status);
  result = buildStalePrAuditReport({ CODEX_EVENT_NAME: 'pull_request', CODEX_PR_HEAD_SHA: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', CODEX_PR_BODY: '"headSha":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"' });
  assertCase('fresh current-head evidence passes', result.stalePrAuditStatus.status === 'pass', failures, cases, result.stalePrAuditStatus.status);
  result = buildStalePrAuditReport({});
  assertCase('no PR context returns not_applicable', result.stalePrAuditStatus.status === 'not_applicable', failures, cases, result.stalePrAuditStatus.status);

  result = buildCompactReasonSummary({ status: 'fail', targetQualityScoreStatus: { status: 'fail', score: 70 }, failures: [{ id: 'workflow_runner_failed', message: 'safe failure' }] });
  assertCase('compact reason summary contains no unsafe values', result.status === 'pass' && result.summary.safeSummaryOnly, failures, cases, result.status);

  result = run('scripts/codex-v081-self-test.mjs', { env: { CODEX_QUALITY_REPORT: 'json', CODEX_SKIP_V082_SELF_TEST: '1' } });
  assertCase('v0.8.1 core behavior still passes', result.parsed?.v081SelfTestStatus?.status === 'pass', failures, cases, result.parsed?.v081SelfTestStatus?.status);

  return {
    marker,
    harnessVersion: HARNESS_VERSION,
    v082SelfTestStatus: { status: failures.length ? 'fail' : 'pass', cases, failures, safeSummaryOnly: true },
    valuesPrinted: false,
    status: failures.length ? 'fail' : 'pass',
    safeSummary: failures.length ? 'v0.8.2 self-test failed; see safe labels.' : 'v0.8.2 self-test passed.',
  };
}

try {
  const report = buildReport();
  writeJsonReport(report, 'CODEX_V082_SELF_TEST_REPORT');
  process.exit(report.status === 'fail' ? 1 : 0);
} catch {
  const report = {
    marker,
    harnessVersion: HARNESS_VERSION,
    v082SelfTestStatus: { status: 'fail', failures: ['unexpected_error'], safeSummaryOnly: true },
    valuesPrinted: false,
    status: 'fail',
  };
  writeJsonReport(report, 'CODEX_V082_SELF_TEST_REPORT');
  process.exit(1);
}
