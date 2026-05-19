#!/usr/bin/env bash
# CODEX_QUALITY_HARNESS_FILE v0.6.5
set -euo pipefail

node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

const requiredFiles = [
  'AGENTS.md',
  'IRIS_SPEC_AUTHORITY.md',
  'docs/index.md',
  'docs/iris/SPEC.md',
  'docs/iris/BEHAVIOR.md',
  'docs/iris/EVALS.md',
  'docs/iris/FAILURES.md',
  'docs/iris/QUESTIONS.md',
  'docs/iris/QUALITY_SCORE.md',
  'docs/iris/CHANGELOG.md',
  'docs/iris/PROMPT_RULES.md',
  'evals/iris/golden_cases.yaml',
  'evals/iris/regression_cases.yaml',
  'scripts/lint-iris-docs.sh',
  'scripts/run-iris-evals.sh',
  'scripts/check-iris-boundaries.sh',
  'scripts/verify-iris.sh',
  'scripts/verify-iris.mjs',
  'reports/iris/README.md',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing required file: ${file}`);
}

const metadataManagedMd = requiredFiles.filter((file) => file.endsWith('.md') && file !== 'IRIS_SPEC_AUTHORITY.md');
const mdFiles = requiredFiles.filter((file) => file.endsWith('.md'));
for (const file of metadataManagedMd) {
  const text = fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
  for (const field of ['project: IRIS', 'role:', 'status:', 'last_verified: 2026-05-19', 'verification_command:', 'owner: human']) {
    if (!text.includes(field)) failures.push(`${file}: missing metadata field ${field}`);
  }
  if (!text.includes('<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->')) {
    failures.push(`${file}: missing harness marker`);
  }
}

function checkPathRefs(file) {
  if (!fs.existsSync(path.join(root, file))) return;
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of text.matchAll(/`((?:\.\/)?(?:AGENTS\.md|IRIS_SPEC_AUTHORITY\.md|docs\/[^` ]+|evals\/[^` ]+|scripts\/[^` ]+|reports\/[^` ]+))`/g)) {
    const ref = match[1].replace(/[.,;:)]$/, '').replace(/^\.\//, '');
    if (!ref.includes('*') && !fs.existsSync(path.join(root, ref))) {
      failures.push(`${file}: missing referenced path: ${ref}`);
    }
  }
}

for (const file of mdFiles) checkPathRefs(file);

if (failures.length) {
  console.error('lint-iris-docs: fail');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('lint-iris-docs: pass');
NODE
