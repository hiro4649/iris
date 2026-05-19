#!/usr/bin/env bash
# CODEX_QUALITY_HARNESS_FILE v0.6.5
set -euo pipefail

bash scripts/lint-iris-docs.sh
bash scripts/check-iris-boundaries.sh
bash scripts/run-iris-evals.sh
node scripts/codex-secret-safety-scan.mjs
node scripts/codex-local-quality-gate.mjs

echo "verify-iris: pass"
