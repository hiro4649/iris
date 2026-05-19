---
project: Codex development projects
role: final local acceptance report
status: source-of-truth
last_verified: 2026-05-19
verification_command: see per-project commands below
owner: human
---
<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->

# Final Codex Project Acceptance

## Final Decision

Local acceptance is achieved for the active candidates verified in this pass.
This is not a remote PR quality-gate result and does not replace human merge review.

## IRIS Merge Order

1. `codex/iris-source-repair` at `07948a6`
2. `codex/iris-harness-docs` at `82b3174`
3. `codex/iris-env-policy-proposal` at `794d7af`

Do not change these fixed commits.

## IRIS Source Repair

Purpose: repair runtime/test contract mismatches without docs, evals, reports, env proposal, or `.env.example`.

Includes:
- `scripts/run-scenario-suite.js`
- `scripts/run-tests.js`
- `scripts/codex-local-quality-gate.mjs`
- `src/` runtime, adapter, server, dev readiness, memory, relationship, and stream repair files

Excludes:
- `AGENTS.md`
- `docs/`
- `evals/`
- `reports/`
- `scripts/verify-iris.*`
- `.env.example`
- `package.json`
- quality gate policy JSON

Verification:
- `npm test`: PASS, 454/454
- secret scan: PASS
- local quality gate: PASS
- profile required checks: PASS
- JSON quality report: `mergeReady=true`
- remote PR quality-gate: PASS on `07948a6`
- diff checks: PASS

## IRIS Harness Docs

Purpose: restore IRIS harness docs, evals, reports, and verification entrypoints after source repair.

Includes:
- `AGENTS.md`
- `docs/index.md`
- `docs/iris/*`
- `docs/process/CODEX_HARNESS_MANIFEST.json`
- `evals/iris/*`
- `reports/iris/*`
- `scripts/verify-iris.*`
- `scripts/lint-iris-docs.sh`
- `scripts/run-iris-evals.sh`
- `scripts/check-iris-boundaries.sh`

Excludes:
- `src/`
- `.env.example`
- `package.json`
- quality gate policy
- env policy proposal

Verification:
- `npm test`: PASS, 454/454
- `node scripts/verify-iris.mjs`: PASS
- Git for Windows bash `scripts/verify-iris.sh`: PASS
- secret scan: PASS
- local quality gate: PASS
- profile required checks: PASS
- JSON quality report: `mergeReady=true`, `riskLevel=R1`
- remote PR quality-gate: PASS on `82b3174`
- diff checks: PASS

Windows note: PowerShell `bash` resolves to WSL on this host and fails with a registration error.
Use Git for Windows bash for shell entrypoints.

## IRIS Env Policy Proposal

Purpose: record env sample proposals without changing `.env.example`.

Includes:
- `docs/iris/ENV_POLICY_PROPOSAL.md`

Excludes:
- `.env.example`
- `src/`
- `package.json`
- quality gate policy
- harness scripts

Verification:
- `npm test`: PASS, 454/454
- `node scripts/verify-iris.mjs`: PASS
- secret scan: PASS
- local quality gate: PASS
- profile required checks: PASS
- JSON quality report: `mergeReady=true`, `riskLevel=R1`
- remote PR quality-gate: PASS on `794d7af`
- diff checks: PASS

Human review: required to decide whether the proposed env names should ever be added to `.env.example` in a separate env-policy PR.

## FUNKY

Path: `C:\Users\HIRO-001\Documents\New project\disco-funky-repair-pr`

Verification:
- Git for Windows bash `scripts/verify-funky.sh`: PASS
- JSON quality report: `mergeReady=true`, `riskLevel=R2`
- profile required checks: PASS
- backend build/test: PASS
- frontend build: PASS
- contracts compile/test: PASS
- NFT compile/test: PASS
- docs lint/eval/secret scan: PASS
- diff checks: PASS

No FUNKY files were changed in this pass.
Remote PR quality-gate remains a separate check.

## IRIS-live2d-renderer

Path: `C:\Users\HIRO-001\Documents\Codex\iris-live2d-renderer-harness-v065`

Verification:
- Git for Windows bash `scripts/verify-iris-live2d-renderer.sh`: PASS
- `npm test`: PASS
- JSON quality report: `mergeReady=true`, `riskLevel=R3`
- profile required quality gate command: PASS
- docs lint: PASS
- boundary check: PASS
- eval: PASS
- secret scan: PASS
- diff checks: PASS

No renderer files were changed in this pass.
The R3/staged harness scope requires human review before remote merge.

## Archive Candidates

Common harness candidate remains `archive_candidate`.
Old IRIS clone worktrees remain `archive_candidate`.
They are not active acceptance targets and were not verified as active projects.

## IRIS Authority Path

The formal IRIS source of truth is repo-local `IRIS_SPEC_AUTHORITY.md`.
The old workspace path `C:\Users\HIRO-001\Documents\IRIS_SPEC_AUTHORITY.md` was not restored.
It must not be treated as a second source of truth.

Repo-local search confirmed current IRIS docs and manifest point to repo-local authority.
Old absolute-path mentions remain only as deprecated/non-authoritative references or historical audit evidence.

## Remote PR Checks Before Merge

Before merging each active branch:
- confirm remote GitHub quality-gate success
- confirm human review for R3 or human-review-required cases
- confirm no `.env.example` appears in the env policy proposal
- confirm no fixed IRIS branch was amended after this acceptance
- keep the IRIS merge order unchanged

Current remote PR quality-gate state:
- PR #8 `codex/iris-source-repair`: PASS on `07948a6`
- PR #9 `codex/iris-harness-docs`: PASS on `82b3174`
- PR #10 `codex/iris-env-policy-proposal`: PASS on `794d7af`
- PR #11 `codex/final-codex-project-acceptance`: must pass after this report update

## Human Review Points

- Merge IRIS in the listed order.
- Treat env policy proposal as a human decision PR.
- Keep common harness and old IRIS clones archived unless explicitly promoted.
- Do not restore the old absolute IRIS authority path.
