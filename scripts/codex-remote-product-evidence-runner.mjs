#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.9.7
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { HARNESS_VERSION, normalizePath, scanObjectForUnsafe } from './codex-v080-lib.mjs';
import { classifyChange } from './codex-change-classification-gate.mjs';

const DEFAULT_COMMAND = ['npm', 'test'];
const ARTIFACT_NAMES = {
  checks: 'codex-remote-product-checks.safe.json',
  baseline: 'codex-remote-product-baseline.json',
  evidence: 'codex-product-verification-evidence.remote.json',
  diagnostic: 'codex-remote-npm-diagnostic.safe.json',
};

function splitFiles(value) {
  if (Array.isArray(value)) return value.map(normalizePath).filter(Boolean);
  const text = String(value || '').trim();
  if (!text) return [];
  return text.split(/\r?\n|,/).map((item) => normalizePath(item.trim())).filter(Boolean);
}

function gitLines(args) {
  const result = spawnSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  if (result.status !== 0) return [];
  return splitFiles(result.stdout);
}

export function detectRemoteProductChangedFiles(env = process.env) {
  if (env.CODEX_CHANGED_FILES) return [...new Set(splitFiles(env.CODEX_CHANGED_FILES))].sort();
  if (env.CODEX_PR_BASE_SHA && env.CODEX_PR_HEAD_SHA) {
    const files = gitLines(['diff', '--name-only', env.CODEX_PR_BASE_SHA, env.CODEX_PR_HEAD_SHA]);
    if (files.length) return [...new Set(files)].sort();
  }
  return [...new Set([
    ...gitLines(['diff', '--name-only', 'origin/main...HEAD']),
    ...gitLines(['diff', '--name-only']),
    ...gitLines(['diff', '--cached', '--name-only']),
  ])].sort();
}

function isoDate(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function safeFailureCategory(exitCode, output = '') {
  if (Number(exitCode) === 0) return 'test_success';
  const text = String(output || '');
  if (/missing script/i.test(text)) return 'script_missing';
  if (/Cannot find module|ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND/i.test(text)) return 'module_resolution_failure';
  if (/timed? out|timeout/i.test(text)) return 'timeout';
  if (/npm ERR!|ERESOLVE|ELOCKVERIFY|ENOTFOUND/i.test(text)) return 'package_manager_error';
  if (/AssertionError|not ok|FAIL|failed/i.test(text)) return 'test_assertion_failure';
  return 'unknown_npm_failure';
}

function safeTestCount(output = '') {
  const match = String(output || '').match(/\b(\d{1,6})\s+(?:tests?|passing)\b/i);
  return match ? Number(match[1]) : null;
}

function runNpmTest(input = {}) {
  if (input.npmExitCode !== undefined) {
    return {
      npmExitCode: Number(input.npmExitCode),
      durationMs: Number(input.durationMs || 0),
      output: String(input.npmOutput || ''),
    };
  }
  const started = Date.now();
  const result = spawnSync(DEFAULT_COMMAND[0], DEFAULT_COMMAND.slice(1), {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    timeout: Number(input.timeoutMs || process.env.CODEX_REMOTE_PRODUCT_NPM_TIMEOUT_MS || 20 * 60 * 1000),
  });
  return {
    npmExitCode: result.error?.code === 'ETIMEDOUT' ? 124 : Number(result.status ?? 1),
    durationMs: Date.now() - started,
    output: `${result.stdout || ''}\n${result.stderr || ''}`,
  };
}

function safeArtifact(value, fallbackStatus = 'fail') {
  if (!scanObjectForUnsafe(value).length) return value;
  return {
    schemaVersion: '0.9.7',
    harnessVersion: HARNESS_VERSION,
    status: fallbackStatus,
    reasonCodes: ['remote_product_evidence_unsafe'],
    logsUploaded: false,
    valuesStored: false,
    safeSummaryOnly: true,
  };
}

function productRelevant(classified) {
  const c = classified.classification || {};
  return Boolean(
    classified.productRelevantChanged ||
    classified.packageOrLockfileChanged ||
    classified.runtimeReadinessClaimed ||
    c.performanceClaimed
  );
}

export function buildRemoteProductEvidenceArtifacts(input = {}, env = process.env) {
  const changedFiles = input.changedFiles ? splitFiles(input.changedFiles) : detectRemoteProductChangedFiles(env);
  const classified = input.classified || classifyChange(changedFiles, { ...env, CODEX_CHANGED_FILES: changedFiles.join('\n') });
  const relevant = input.productRelevant ?? productRelevant(classified);
  const repository = String(env.CODEX_REPOSITORY || env.GITHUB_REPOSITORY || '').slice(0, 120);
  const baseSha = String(env.CODEX_PR_BASE_SHA || '').slice(0, 64);
  const headSha = String(env.CODEX_PR_HEAD_SHA || env.GITHUB_SHA || '').slice(0, 64);
  const result = relevant ? runNpmTest(input) : { npmExitCode: null, durationMs: null, output: '' };
  const npmExitCode = result.npmExitCode;
  const npmPassed = relevant && npmExitCode === 0;
  const npmFailed = relevant && npmExitCode !== 0;
  const status = relevant ? (npmPassed ? 'pass' : 'fail') : 'not_applicable';
  const category = relevant ? safeFailureCategory(npmExitCode, result.output) : 'not_applicable';
  const diagnosticCategory = npmPassed ? 'test_assertion_failure' : category;
  const testCount = relevant ? safeTestCount(result.output) : null;
  const date = isoDate();
  const expiresAt = isoDate(7 * 24 * 60 * 60 * 1000);
  const safeSummary = relevant
    ? (npmPassed ? 'remote npm test completed successfully' : 'remote npm test completed with safe failure classification')
    : 'remote npm test not required for this change classification';

  const command = {
    name: 'npm test',
    required: Boolean(relevant),
    result: relevant ? (npmPassed ? 'pass' : 'fail') : 'not_run',
    source: relevant ? 'remote' : 'not_applicable',
    durationMs: relevant ? Number(result.durationMs || 0) : null,
    testCount,
    safeSummary,
  };

  const checks = safeArtifact({
    schemaVersion: '0.9.7',
    harnessVersion: HARNESS_VERSION,
    phase: 'remote product checks',
    status,
    productRelevantPullRequest: Boolean(relevant),
    changedFileCount: changedFiles.length,
    npmAttempted: Boolean(relevant),
    npmExitCode,
    commandClass: relevant ? 'npm_test' : 'not_applicable',
    logsUploaded: false,
    valuesStored: false,
    reasonCodes: npmFailed ? ['remote_npm_test_failed'] : [],
    safeSummaryOnly: true,
  }, status === 'not_applicable' ? 'not_applicable' : 'fail');

  const evidence = safeArtifact({
    schemaVersion: '0.8.3',
    harnessVersion: HARNESS_VERSION,
    status,
    repository,
    prNumber: String(env.CODEX_PR_NUMBER || '').slice(0, 20),
    headSha,
    commands: relevant ? [command] : [],
    logsUploaded: false,
    valuesStored: false,
    safeSummaryOnly: true,
  }, status === 'not_applicable' ? 'not_applicable' : 'fail');

  const baseline = safeArtifact(relevant ? {
    schemaVersion: '0.8.3',
    harnessVersion: HARNESS_VERSION,
    repository,
    baseSha,
    baselineType: 'npm_test',
    commands: [command],
    result: npmPassed ? 'pass' : 'fail',
    date,
    source: 'remote_quality_gate',
    safeSummary,
    knownFailures: npmFailed ? [category] : [],
    expiresAt,
    rawValuesStored: false,
    safeSummaryOnly: true,
  } : {
    schemaVersion: '0.9.7',
    harnessVersion: HARNESS_VERSION,
    phase: 'remote product baseline',
    status: 'not_applicable',
    baselineType: 'npm_test',
    reasonCodes: ['remote_product_baseline_not_required'],
    rawValuesStored: false,
    safeSummaryOnly: true,
  }, status === 'not_applicable' ? 'not_applicable' : 'fail');

  const diagnostic = safeArtifact({
    schemaVersion: '0.8.3',
    harnessVersion: HARNESS_VERSION,
    status,
    npmExitCode,
    nodeMajor: Number(process.versions.node.split('.')[0]),
    platform: process.platform,
    packageManager: 'npm',
    commandClass: relevant ? 'npm_test' : 'not_applicable',
    safeFailureCategory: diagnosticCategory,
    safeMarkerCount: null,
    testCountDetected: testCount,
    durationMs: relevant ? Number(result.durationMs || 0) : null,
    knownBaselineMatched: false,
    logsUploaded: false,
    valuesStored: false,
    safeSummaryOnly: true,
  }, status === 'not_applicable' ? 'not_applicable' : 'fail');

  return {
    status,
    productRelevant: Boolean(relevant),
    npmFailed: Boolean(npmFailed),
    changedFiles,
    env: {
      CODEX_PRODUCT_VERIFICATION_EVIDENCE_PATH: '',
      CODEX_REMOTE_PRODUCT_BASELINE_PATH: '',
      CODEX_NPM_TEST_SAFE_SUMMARY_PATH: '',
      CODEX_PRODUCT_VERIFICATION_COMMANDS: relevant ? 'npm test' : '',
      CODEX_PRODUCT_VERIFICATION_RESULT: relevant ? (npmPassed ? 'pass' : 'fail') : 'not_applicable',
      CODEX_PRODUCT_VERIFICATION_SOURCE: relevant ? 'remote' : 'not_applicable',
      CODEX_PRODUCT_VERIFICATION_REQUIRED: relevant ? '1' : '0',
      CODEX_REMOTE_PRODUCT_BASELINE_REQUIRED: relevant ? '1' : '0',
      CODEX_REMOTE_NPM_FAILED: npmFailed ? '1' : '0',
      ...(relevant ? { CODEX_SKIP_NPM: '0' } : {}),
      CODEX_CHANGED_FILES: changedFiles.join('\n'),
    },
    artifacts: { checks, baseline, evidence, diagnostic },
  };
}

function appendGithubEnv(file, values) {
  if (!file) return;
  const lines = [];
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue;
    const text = String(value);
    if (text.includes('\n')) {
      const delimiter = `CODEX_${key}_EOF`;
      lines.push(`${key}<<${delimiter}`, text, delimiter);
    } else {
      lines.push(`${key}=${text}`);
    }
  }
  fs.appendFileSync(file, `${lines.join('\n')}\n`);
}

export function writeRemoteProductEvidenceArtifacts(input = {}, env = process.env) {
  const outDir = input.outDir || env.CODEX_REMOTE_PRODUCT_EVIDENCE_DIR || env.RUNNER_TEMP || process.cwd();
  fs.mkdirSync(outDir, { recursive: true });
  const result = buildRemoteProductEvidenceArtifacts(input, env);
  const paths = {
    checks: path.join(outDir, ARTIFACT_NAMES.checks),
    baseline: path.join(outDir, ARTIFACT_NAMES.baseline),
    evidence: path.join(outDir, ARTIFACT_NAMES.evidence),
    diagnostic: path.join(outDir, ARTIFACT_NAMES.diagnostic),
  };
  for (const [key, file] of Object.entries(paths)) {
    fs.writeFileSync(file, JSON.stringify(result.artifacts[key], null, 2));
  }
  appendGithubEnv(env.GITHUB_ENV, {
    ...result.env,
    CODEX_REMOTE_PRODUCT_CHECKS_PATH: paths.checks,
    CODEX_REMOTE_PRODUCT_BASELINE_PATH: paths.baseline,
    CODEX_PRODUCT_VERIFICATION_EVIDENCE_PATH: paths.evidence,
    CODEX_NPM_TEST_SAFE_SUMMARY_PATH: result.productRelevant ? paths.diagnostic : '',
  });
  return { ...result, paths };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeRemoteProductEvidenceArtifacts();
}
