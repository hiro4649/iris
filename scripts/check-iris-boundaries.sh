#!/usr/bin/env bash
# CODEX_QUALITY_HARNESS_FILE v0.6.5
set -euo pipefail

node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [
  'docs/iris/SPEC.md',
  'docs/iris/BEHAVIOR.md',
  'docs/iris/PROMPT_RULES.md',
  'evals/iris/golden_cases.yaml',
];
const forbidden = [
  'BSC',
  'tBNB',
  'sendToWallet',
  'NFT mint',
  'chainId 97',
  'Prize hot wallet',
  'wallet signature',
];
const failures = [];

for (const file of files) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    failures.push(`missing boundary file: ${file}`);
    continue;
  }
  const text = fs.readFileSync(full, 'utf8');
  for (const term of forbidden) {
    if (text.includes(term)) failures.push(`${file}: contains non-IRIS project-specific term: ${term}`);
  }
}

if (failures.length) {
  console.error('check-iris-boundaries: fail');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('check-iris-boundaries: pass');
NODE
