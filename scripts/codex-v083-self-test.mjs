#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.8.3
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { HARNESS_VERSION, marker, writeJsonReport } from './codex-v080-lib.mjs';
import { evaluateWorkflowReport } from './codex-workflow-quality-runner.mjs';
import { buildWorkflowPreflight } from './codex-workflow-preflight.mjs';
import { buildRemoteProductBaselineReport } from './codex-remote-product-baseline-gate.mjs';
import { buildRemoteNpmDiagnosticReport } from './codex-remote-npm-diagnostic-classify.mjs';
import { buildProductVerificationReport } from './codex-product-verification-gate.mjs';
import { buildSafeArtifactIndex } from './codex-safe-artifact-index.mjs';
import { buildOpenPrHygieneReport } from './codex-open-pr-hygiene-report.mjs';
import { buildFinalSummary } from './codex-target-final-summary.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.dirname(here);

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
    'remoteProductBaselineStatus',
    'remoteNpmDiagnosticStatus',
    'workflowPreflightStatus',
    'safeArtifactIndexStatus',
    'openPrHygieneStatus',
    'targetFinalSummaryStatus',
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
    'v083SelfTestStatus',
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
    'remoteProductBaselineStatus',
    'remoteNpmDiagnosticStatus',
    'workflowPreflightStatus',
    'safeArtifactIndexStatus',
    'openPrHygieneStatus',
    'targetFinalSummaryStatus',
    'stalePrAuditStatus',
    'reasonSummaryStatus',
    'safeOutputScanStatus',
    'v080SelfTestStatus',
    'v081SelfTestStatus',
    'v082SelfTestStatus',
    'v083SelfTestStatus',
    'safeArtifactValidation',
    'outputShapeStatus',
  ]) report[key] = passStatus();
  return report;
}

function run(script, env = {}) {
  const result = spawnSync(process.execPath, [path.join(repo, script), '--json'], {
    cwd: repo,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    return { code: result.status, parsed: JSON.parse(result.stdout || '{}') };
  } catch {
    return { code: result.status, parsed: null };
  }
}

function baseline(result = 'pass') {
  return JSON.stringify({
    schemaVersion: '0.8.3',
    harnessVersion: HARNESS_VERSION,
    repository: 'example/repo',
    baseSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    baselineType: 'npm_test',
    commands: [{ name: 'npm test', result }],
    result,
    date: '2026-05-24T00:00:00Z',
    source: 'fixture',
    safeSummary: 'safe baseline summary',
    knownFailures: result === 'fail' ? ['safe_known_failure'] : [],
    expiresAt: '2099-01-01T00:00:00Z',
    rawValuesStored: false,
    safeSummaryOnly: true,
  });
}

function staleBaseline() {
  const value = JSON.parse(baseline('pass'));
  value.expiresAt = '2000-01-01T00:00:00Z';
  return JSON.stringify(value);
}

function withTempCwd(callback) {
  const old = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-v083-preflight-'));
  try {
    process.chdir(tmp);
    return callback(tmp);
  } finally {
    process.chdir(old);
  }
}

function assertCase(name, ok, failures, cases, status = ok ? 'pass' : 'fail') {
  cases.push({ name, status });
  if (!ok) failures.push(name);
}

const fallbackArtifactNames = [
  'codex-quality-gate-safe-summary.json',
  'codex-target-quality-summary.json',
  'codex-target-final-summary.json',
  'codex-reason-summary.json',
  'codex-safe-artifact-index.json',
  'codex-failure-reasons.json',
];

function readJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function runWorkflowRunnerFixture(reportText) {
  return withTempCwd((tmp) => {
    const args = [path.join(repo, 'scripts', 'codex-workflow-quality-runner.mjs')];
    if (reportText !== null) {
      const reportPath = path.join(tmp, 'quality-report.json');
      fs.writeFileSync(reportPath, reportText, 'utf8');
      args.push('--report', reportPath);
    } else {
      args.push('--report', path.join(tmp, 'missing-report.json'));
    }
    const result = spawnSync(process.execPath, args, {
      cwd: tmp,
      env: { ...process.env, CODEX_HARNESS_MODE: 'target', CODEX_WORKFLOW_RUNNER_REPORT: 'json' },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const artifacts = Object.fromEntries(
      fallbackArtifactNames.map((name) => [name, fs.existsSync(path.join(tmp, name))])
    );
    return {
      code: result.status,
      parsed: (() => {
        try { return JSON.parse(result.stdout || '{}'); } catch { return null; }
      })(),
      artifacts,
      index: readJsonFile(path.join(tmp, 'codex-safe-artifact-index.json')),
      targetQuality: readJsonFile(path.join(tmp, 'codex-target-quality-summary.json')),
      finalSummary: readJsonFile(path.join(tmp, 'codex-target-final-summary.json')),
      reasonSummary: readJsonFile(path.join(tmp, 'codex-reason-summary.json')),
      failureReasons: readJsonFile(path.join(tmp, 'codex-failure-reasons.json')),
      serializedArtifacts: fallbackArtifactNames
        .filter((name) => fs.existsSync(path.join(tmp, name)))
        .map((name) => fs.readFileSync(path.join(tmp, name), 'utf8'))
        .join('\n'),
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    };
  });
}

function invalidReportFixture(value) {
  return runWorkflowRunnerFixture(JSON.stringify(value));
}

function buildReport() {
  const failures = [];
  const cases = [];

  let result = evaluateWorkflowReport(sourcePassReport(), { eventName: 'workflow_dispatch' });
  assertCase('source runner still accepts pass report', result.status === 'pass', failures, cases, result.status);
  result = evaluateWorkflowReport(targetPassReport(), { eventName: 'pull_request' });
  assertCase('target runner still accepts pass report', result.status === 'pass', failures, cases, result.status);

  result = withTempCwd((tmp) => {
    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'docs', 'process'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'scripts', 'codex-local-quality-gate.mjs'), '');
    fs.writeFileSync(path.join(tmp, 'scripts', 'codex-workflow-quality-runner.mjs'), '');
    fs.writeFileSync(path.join(tmp, 'CODEX_SOURCE_HARNESS_MANIFEST.json'), '{}');
    fs.copyFileSync(path.join(repo, 'docs', 'process', 'CODEX_CHANGE_CLASSIFICATION_RULES.json'), path.join(tmp, 'docs', 'process', 'CODEX_CHANGE_CLASSIFICATION_RULES.json'));
    return buildWorkflowPreflight({ CODEX_HARNESS_SOURCE_REPO: '1', CODEX_HARNESS_MODE: 'core' });
  });
  assertCase('workflow preflight source mode pass', result.workflowPreflightStatus.status === 'pass', failures, cases, result.workflowPreflightStatus.status);
  result = withTempCwd((tmp) => {
    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'docs', 'process'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'scripts', 'codex-local-quality-gate.mjs'), '');
    fs.writeFileSync(path.join(tmp, 'scripts', 'codex-workflow-quality-runner.mjs'), '');
    fs.writeFileSync(path.join(tmp, 'docs', 'process', 'CODEX_HARNESS_MANIFEST.json'), '{}');
    fs.copyFileSync(path.join(repo, 'docs', 'process', 'CODEX_CHANGE_CLASSIFICATION_RULES.json'), path.join(tmp, 'docs', 'process', 'CODEX_CHANGE_CLASSIFICATION_RULES.json'));
    return buildWorkflowPreflight({ CODEX_HARNESS_MODE: 'target' });
  });
  assertCase('workflow preflight target mode pass', result.workflowPreflightStatus.status === 'pass', failures, cases, result.workflowPreflightStatus.status);
  result = withTempCwd(() => buildWorkflowPreflight({ CODEX_HARNESS_MODE: 'target' }));
  assertCase('workflow preflight missing required file fails', result.workflowPreflightStatus.status === 'fail', failures, cases, result.workflowPreflightStatus.status);

  result = buildRemoteProductBaselineReport({ CODEX_EVENT_NAME: 'pull_request', CODEX_CHANGED_FILES: 'src/app.js', CODEX_REMOTE_PRODUCT_BASELINE_JSON: baseline('pass') });
  assertCase('remote product baseline valid pass', result.remoteProductBaselineStatus.status === 'pass', failures, cases, result.remoteProductBaselineStatus.status);
  result = buildRemoteProductBaselineReport({ CODEX_EVENT_NAME: 'pull_request', CODEX_CHANGED_FILES: 'src/app.js' });
  assertCase('remote product baseline missing fails for product change', result.remoteProductBaselineStatus.status === 'fail', failures, cases, result.remoteProductBaselineStatus.status);
  result = buildRemoteProductBaselineReport({ CODEX_EVENT_NAME: 'pull_request', CODEX_CHANGED_FILES: 'scripts/codex-local-quality-gate.mjs' });
  assertCase('remote product baseline not required for harness-only', result.remoteProductBaselineStatus.status === 'not_applicable', failures, cases, result.remoteProductBaselineStatus.status);
  result = buildRemoteProductBaselineReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'README.md',
    CODEX_PR_BODY: '## Performance Evidence\nNo performance claim is made.',
  });
  assertCase('performance evidence denial does not require baseline', result.remoteProductBaselineStatus.status === 'not_applicable', failures, cases, result.remoteProductBaselineStatus.status);
  result = buildRemoteProductBaselineReport({ CODEX_EVENT_NAME: 'pull_request', CODEX_CHANGED_FILES: 'src/app.js', CODEX_REMOTE_PRODUCT_BASELINE_JSON: staleBaseline() });
  assertCase('stale baseline fails', result.remoteProductBaselineStatus.status === 'fail', failures, cases, result.remoteProductBaselineStatus.status);

  result = buildProductVerificationReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'src/app.js',
    CODEX_PRODUCT_VERIFICATION_COMMANDS: 'npm test',
    CODEX_PRODUCT_VERIFICATION_RESULT: 'fail',
    CODEX_REMOTE_PRODUCT_BASELINE_JSON: baseline('fail'),
  });
  assertCase('baseline fail plus npm fail is baseline_failure', result.productVerificationStatus.reasonCodes.includes('baseline_failure'), failures, cases, result.productVerificationStatus.status);
  result = buildProductVerificationReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'src/app.js',
    CODEX_PRODUCT_VERIFICATION_COMMANDS: 'npm test',
    CODEX_PRODUCT_VERIFICATION_RESULT: 'fail',
    CODEX_REMOTE_PRODUCT_BASELINE_JSON: baseline('pass'),
  });
  assertCase('baseline pass plus npm fail is candidate_regression', result.productVerificationStatus.reasonCodes.includes('candidate_regression'), failures, cases, result.productVerificationStatus.status);

  result = buildRemoteNpmDiagnosticReport({ CODEX_NPM_SAFE_FAILURE_CATEGORY: 'lint_failure', CODEX_NPM_EXIT_CODE: '1' });
  assertCase('npm diagnostic safe categories pass', result.remoteNpmDiagnosticStatus.status === 'pass', failures, cases, result.remoteNpmDiagnosticStatus.status);
  result = buildRemoteNpmDiagnosticReport({ CODEX_NPM_SAFE_FAILURE_CATEGORY: 'not_a_category', CODEX_NPM_EXIT_CODE: '1' });
  assertCase('unknown_npm_failure is warning or manual, not silent pass', result.remoteNpmDiagnosticStatus.status === 'manual_confirmation_required', failures, cases, result.remoteNpmDiagnosticStatus.status);
  const unsafeNpm = path.join(os.tmpdir(), `codex-v083-unsafe-npm-${Date.now()}.json`);
  fs.writeFileSync(unsafeNpm, JSON.stringify({ rawLogs: 'stored raw output' }));
  result = buildRemoteNpmDiagnosticReport({ CODEX_NPM_TEST_SAFE_SUMMARY_PATH: unsafeNpm });
  assertCase('npm diagnostic with raw log field fails', result.remoteNpmDiagnosticStatus.status === 'fail', failures, cases, result.remoteNpmDiagnosticStatus.status);

  result = buildSafeArtifactIndex([{ artifactName: 'codex-quality-gate-safe-summary.json', path: 'codex-quality-gate-safe-summary.json', status: 'present' }], 'target');
  assertCase('safe artifact index lists all artifacts', result.status === 'pass' && result.artifacts.length === 1, failures, cases, result.status);
  result = buildSafeArtifactIndex([{ artifactName: 'raw.log', path: 'raw-output.log', status: 'present' }], 'target');
  assertCase('artifact index rejects raw-looking artifact', result.status === 'fail', failures, cases, result.status);

  result = buildOpenPrHygieneReport({ CODEX_OPEN_PR_HYGIENE_JSON: JSON.stringify([{ prNumber: 12, staleEvidence: true, needsOwnerDecision: true }]) });
  assertCase('open PR hygiene report flags stale evidence', result.openPrHygieneStatus.status === 'warning', failures, cases, result.openPrHygieneStatus.status);
  assertCase('open PR hygiene report is report-only', result.openPrHygieneStatus.reportOnly === true, failures, cases);

  result = buildFinalSummary(targetPassReport(), 'target');
  assertCase('target final summary has no unsafe values', result.status === 'pass' && result.summary.safeSummaryOnly, failures, cases, result.status);

  result = runWorkflowRunnerFixture(null);
  assertCase('workflow runner writes safe artifacts when quality report is missing', Object.values(result.artifacts).every(Boolean), failures, cases, JSON.stringify(result.artifacts));
  assertCase('workflow runner missing report remains failure', result.code !== 0 && result.parsed?.workflowQualityRunnerStatus?.status === 'fail', failures, cases, result.parsed?.workflowQualityRunnerStatus?.status);
  assertCase('workflow runner missing report writes safe artifact index', Array.isArray(result.index?.artifacts) && result.index.artifacts.some((item) => item.artifactName === 'codex-target-final-summary.json'), failures, cases, result.index?.status);
  assertCase('workflow runner missing report writes target final summary', result.finalSummary?.safeSummaryOnly === true, failures, cases, result.finalSummary ? 'pass' : 'missing');
  assertCase('workflow runner missing report writes reason summary', result.reasonSummary?.safeSummaryOnly === true, failures, cases, result.reasonSummary ? 'pass' : 'missing');
  assertCase('workflow runner failure reasons use safe codes only', result.failureReasons?.every((item) => /^[a-z0-9_]+$/.test(item.reasonCode || '')) === true, failures, cases);

  result = runWorkflowRunnerFixture('{ invalid json');
  assertCase('workflow runner writes safe artifacts when quality report JSON parse fails', Object.values(result.artifacts).every(Boolean), failures, cases, JSON.stringify(result.artifacts));
  assertCase('workflow runner parse failure remains failure', result.code !== 0 && result.parsed?.workflowQualityRunnerStatus?.reasonCodes?.includes('quality_report_parse_failed'), failures, cases, result.parsed?.workflowQualityRunnerStatus?.status);

  result = invalidReportFixture({ status: 'fail', rawPayload: 'unsafe value' });
  assertCase('workflow runner writes safe artifacts when report is invalid or unsafe', Object.values(result.artifacts).every(Boolean), failures, cases, JSON.stringify(result.artifacts));
  assertCase('workflow runner unsafe report remains failure', result.code !== 0 && result.parsed?.workflowQualityRunnerStatus?.reasonCodes?.includes('workflow_runner_invalid_report'), failures, cases, result.parsed?.workflowQualityRunnerStatus?.status);
  assertCase('invalid report with rawPayload yields safe label raw_payload_field', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.includes('raw_payload_field'), failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.join(','));
  assertCase('invalid report fallback artifact includes safeInvalidReportReason', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportReason === 'unsafe_report_field', failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportReason);
  assertCase('invalid report fallback artifact includes safeInvalidReportPathLabels', result.failureReasons?.some((item) => item.safeInvalidReportPathLabels?.includes('raw_payload_field')) === true, failures, cases);
  const unsafeEcho = `${result.stdout}\n${result.stderr}\n${result.serializedArtifacts}`;
  assertCase('workflow runner fallback artifacts do not print raw report values', !unsafeEcho.includes('rawPayload') && !unsafeEcho.includes('unsafe value'), failures, cases);
  assertCase('safe artifact index still generated for invalid report', Array.isArray(result.index?.artifacts) && result.index.artifacts.length > 0, failures, cases, result.index?.status);

  result = invalidReportFixture({ status: 'fail', rawLogs: 'unsafe value' });
  assertCase('invalid report with rawLogs yields safe label raw_logs_field', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.includes('raw_logs_field'), failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.join(','));

  result = invalidReportFixture({ status: 'fail', endpointValue: 'unsafe value' });
  assertCase('invalid report with endpointValue yields safe label endpoint_value_field', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.includes('endpoint_value_field'), failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.join(','));

  result = invalidReportFixture({ status: 'fail', privatePath: 'unsafe value' });
  assertCase('invalid report with privatePath yields safe label private_path_field', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.includes('private_path_field'), failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.join(','));

  const tokenLikeValue = ['g', 'hp', '_', 'A'.repeat(12)].join('');
  result = invalidReportFixture({ status: 'fail', safeLabel: tokenLikeValue });
  assertCase('unknown unsafe value yields unknown_value_path', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.includes('unknown_value_path'), failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.join(','));
  assertCase('invalid report with unsafe concrete token omits token value', !`${result.stdout}\n${result.stderr}\n${result.serializedArtifacts}`.includes(tokenLikeValue), failures, cases);

  const urlLikeValue = ['https', '://', 'example.invalid', '/safe'].join('');
  result = invalidReportFixture({ status: 'fail', html_url: urlLikeValue });
  assertCase('unsafe URL value under html_url yields public_github_url_value', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.includes('public_github_url_value'), failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.join(','));
  assertCase('invalid report with URL value omits URL value', !`${result.stdout}\n${result.stderr}\n${result.serializedArtifacts}`.includes(urlLikeValue), failures, cases);
  result = invalidReportFixture({ status: 'fail', jobs_url: urlLikeValue });
  assertCase('unsafe URL value under jobs_url yields workflow_run_metadata_value', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.includes('workflow_run_metadata_value'), failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.join(','));
  result = invalidReportFixture({ status: 'fail', head_sha: tokenLikeValue });
  assertCase('unsafe value under head_sha yields commit_metadata_value', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.includes('commit_metadata_value'), failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.join(','));
  assertCase('unsafe value under head_sha omits unsafe value', !`${result.stdout}\n${result.stderr}\n${result.serializedArtifacts}`.includes(tokenLikeValue), failures, cases);
  const privatePathLikeValue = ['/', 'home', '/runner/work/artifact'].join('');
  result = invalidReportFixture({ status: 'fail', artifact: { path: privatePathLikeValue } });
  assertCase('unsafe value under artifact path yields artifact_metadata_value', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.includes('artifact_metadata_value'), failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.join(','));
  assertCase('unsafe value under artifact path omits path value', !`${result.stdout}\n${result.stderr}\n${result.serializedArtifacts}`.includes(privatePathLikeValue), failures, cases);
  result = invalidReportFixture({ status: 'fail', test_command: tokenLikeValue });
  assertCase('unsafe value under test command field yields command_label_value', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.includes('command_label_value'), failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.join(','));
  result = invalidReportFixture({ status: 'fail', safeMessage: urlLikeValue });
  assertCase('unsafe value under safeMessage yields reason_text_value', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.includes('reason_text_value'), failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.join(','));
  result = invalidReportFixture({
    status: 'fail',
    html_url: urlLikeValue,
    jobs_url: urlLikeValue,
    head_sha: tokenLikeValue,
    artifact: { path: privatePathLikeValue },
    test_command: tokenLikeValue,
    safeMessage: urlLikeValue,
    safeLabel: tokenLikeValue,
  });
  assertCase('multiple unsafe values produce bounded finding count', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportFindingCount > 1 && result.parsed.workflowQualityRunnerStatus.safeInvalidReportFindingCount <= 100, failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportFindingCount);
  assertCase('multiple unsafe values produce bounded label list', result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.length <= 10, failures, cases, result.parsed?.workflowQualityRunnerStatus?.safeInvalidReportPathLabels?.length);
  assertCase('workflow runner remains failure for unsafe concrete value', result.parsed?.workflowQualityRunnerStatus?.status === 'fail' && result.code !== 0, failures, cases, result.parsed?.workflowQualityRunnerStatus?.status);
  assertCase('targetQualityScoreStatus remains fail for invalid report fallback', result.targetQuality?.targetQualityScoreStatus?.status === 'fail', failures, cases, result.targetQuality?.targetQualityScoreStatus?.status);
  assertCase('safeArtifactIndexStatus remains pass for invalid report fallback', result.index?.status === 'pass', failures, cases, result.index?.status);
  assertCase('invalid report diagnostic does not print raw value', !`${result.stdout}\n${result.stderr}\n${result.serializedArtifacts}`.includes('unsafe value'), failures, cases);

  result = run('scripts/codex-v082-self-test.mjs', { CODEX_QUALITY_REPORT: 'json', CODEX_SKIP_V083_SELF_TEST: '1' });
  assertCase('v0.8.2 behavior still passes', result.parsed?.v082SelfTestStatus?.status === 'pass', failures, cases, result.parsed?.v082SelfTestStatus?.status);
  result = run('scripts/codex-v081-self-test.mjs', { CODEX_QUALITY_REPORT: 'json', CODEX_SKIP_V082_SELF_TEST: '1', CODEX_SKIP_V083_SELF_TEST: '1' });
  assertCase('v0.8.1 behavior still passes', result.parsed?.v081SelfTestStatus?.status === 'pass', failures, cases, result.parsed?.v081SelfTestStatus?.status);

  return {
    marker,
    harnessVersion: HARNESS_VERSION,
    v083SelfTestStatus: { status: failures.length ? 'fail' : 'pass', cases, failures, safeSummaryOnly: true },
    valuesPrinted: false,
    status: failures.length ? 'fail' : 'pass',
    safeSummary: failures.length ? 'v0.8.3 self-test failed; see safe labels.' : 'v0.8.3 self-test passed.',
  };
}

try {
  const report = buildReport();
  writeJsonReport(report, 'CODEX_V083_SELF_TEST_REPORT');
  process.exit(report.status === 'fail' ? 1 : 0);
} catch {
  const report = {
    marker,
    harnessVersion: HARNESS_VERSION,
    v083SelfTestStatus: { status: 'fail', failures: ['unexpected_error'], safeSummaryOnly: true },
    valuesPrinted: false,
    status: 'fail',
  };
  writeJsonReport(report, 'CODEX_V083_SELF_TEST_REPORT');
  process.exit(1);
}
