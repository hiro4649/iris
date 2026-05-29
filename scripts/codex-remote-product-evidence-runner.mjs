#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.9.9
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRemoteProductEvidenceRunnerReport,
  buildRemoteProductSafeArtifacts,
  parseBool,
  parseJson,
} from './codex-v098-gate-lib.mjs';
import { writeJsonReport, exitFor } from './codex-v080-lib.mjs';

export { buildRemoteProductEvidenceRunnerReport };

function inputFromEnv(env = process.env) {
  return parseJson(env.CODEX_REMOTE_PRODUCT_EVIDENCE_RUNNER_JSON) || {};
}

export function writeArtifacts(input = inputFromEnv(), env = process.env) {
  const dir = env.CODEX_REMOTE_PRODUCT_EVIDENCE_OUT_DIR || env.RUNNER_TEMP || process.cwd();
  fs.mkdirSync(dir, { recursive: true });
  const artifacts = buildRemoteProductSafeArtifacts(input, env);
  const productRelevant = artifacts.evidence.productRelevant === true;
  const npmExecuted = input.npmExecuted !== undefined
    ? parseBool(input.npmExecuted)
    : env.CODEX_REMOTE_NPM_EXECUTED === '1';
  const npmExitCode = Number(input.npmExitCode ?? env.CODEX_NPM_EXIT_CODE ?? artifacts.evidence.npmExitCode ?? 0);
  const status = !productRelevant ? 'not_applicable' : npmExitCode === 0 ? 'pass' : 'fail';

  artifacts.evidence.npmExecuted = productRelevant ? npmExecuted : false;
  artifacts.evidence.status = status;
  artifacts.baseline.baselineType = productRelevant ? 'npm_test' : 'not_applicable';
  artifacts.baseline.result = status === 'not_applicable' ? 'pass' : status;
  artifacts.diagnostic.npmExecuted = productRelevant ? npmExecuted : false;
  artifacts.diagnostic.status = status;

  fs.writeFileSync(path.join(dir, 'codex-product-verification-evidence.remote.json'), JSON.stringify(artifacts.evidence, null, 2));
  fs.writeFileSync(path.join(dir, 'codex-remote-product-baseline.json'), JSON.stringify(artifacts.baseline, null, 2));
  fs.writeFileSync(path.join(dir, 'codex-remote-npm-diagnostic.safe.json'), JSON.stringify(artifacts.diagnostic, null, 2));
  return artifacts;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const input = inputFromEnv();
  if (process.argv.includes('--write-artifacts') || process.env.CODEX_REMOTE_PRODUCT_EVIDENCE_WRITE === '1') {
    writeArtifacts(input);
  }
  const report = buildRemoteProductEvidenceRunnerReport(input);
  writeJsonReport(report, 'CODEX_REMOTE_PRODUCT_EVIDENCE_RUNNER_REPORT');
  exitFor(report);
}
