#!/usr/bin/env bash
# CODEX_QUALITY_HARNESS_FILE v0.6.5
set -euo pipefail

node <<'NODE'
const fs = require('fs');

const files = [
  'evals/iris/golden_cases.yaml',
  'evals/iris/regression_cases.yaml',
];
const requiredCaseIds = [
  'iris-golden-authority-first',
  'iris-golden-phase-boundary',
  'iris-golden-ambiguous-request',
  'iris-golden-safe-output',
  'iris-regression-project-mixing',
  'iris-regression-missing-authority',
  'iris-regression-code-as-authority',
  'iris-regression-unsafe-report',
  'iris-regression-windows-bash-wrapper',
];

const text = files.map((file) => {
  if (!fs.existsSync(file)) throw new Error(`missing eval file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}).join('\n');

const failures = [];
for (const id of requiredCaseIds) {
  if (!text.includes(`id: ${id}`)) failures.push(`missing case: ${id}`);
}
for (const phrase of ['IRIS_SPEC_AUTHORITY.md', 'Do not guess', 'Core / Adapter', 'safe summaries']) {
  if (!text.includes(phrase)) failures.push(`missing expected eval phrase: ${phrase}`);
}

if (failures.length) {
  console.error('run-iris-evals: fail');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('run-iris-evals: pass');
NODE
