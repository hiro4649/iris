---
project: IRIS
role: PR split plan
status: draft
last_verified: 2026-05-19
verification_command: node scripts/codex-local-quality-gate.mjs
owner: human
---
<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->

# IRIS PR Split Plan

Current working tree is not a valid single PR.
It mixes source repair, harness docs, env policy, evals, manifest updates, and Windows wrapper work.
Quality gate correctly reports `mergeReady=false` until this is split.

## File Classification

| File group | Classification | Keep? | PR unit | Quality gate impact |
| --- | --- | --- | --- | --- |
| `src/adapters/**` | source repair | keep if tied to tests | IRIS source repair | high-risk, human review required |
| `src/runtime/**` | source repair | keep if tied to tests | IRIS source repair | high-risk, human review required |
| `src/server/localBridgeEngineWorker.js`, `src/server/overlayStatus.js` | source repair | keep if tied to tests | IRIS source repair | high-risk, human review required |
| `src/services/dev/**` | source repair | keep if tied to tests | IRIS source repair | high-risk, human review required |
| `src/services/memory/**`, `src/services/relationship/**`, `src/services/stream/**` | source repair | keep if tied to tests | IRIS source repair | high-risk, human review required |
| `scripts/run-tests.js`, `scripts/run-scenario-suite.js` | source repair test coverage | keep with source repair | IRIS source repair | allowed with implementation PR, high review load |
| `AGENTS.md`, `docs/index.md`, `docs/iris/**` | harness docs | keep in docs PR | IRIS harness docs | mixed if included with source repair |
| `evals/iris/**` | eval/regression | keep in docs PR or source repair only when referenced by tests | IRIS harness docs | mixed if included with source repair |
| `reports/iris/**` | harness docs / planning | keep in docs PR | IRIS harness docs | mixed if included with source repair |
| `docs/process/CODEX_HARNESS_MANIFEST.json` | quality gate / manifest | keep in docs PR | IRIS harness docs | mixed if included with source repair |
| `scripts/verify-iris.sh`, `scripts/verify-iris.mjs`, `scripts/lint-iris-docs.sh`, `scripts/run-iris-evals.sh`, `scripts/check-iris-boundaries.sh` | Windows verify wrapper and harness scripts | keep in docs PR | IRIS harness docs | mixed if included with source repair |
| `.env.example` | env policy proposal | restored, do not include | IRIS env policy | blocked path if included |
| `package.json` | package metadata | restored, do not include | none | caused dependency PR inference |
| `docs/process/CODEX_QUALITY_GATE_POLICY.json`, `scripts/codex-local-quality-gate.mjs` | quality gate policy/script | restored, do not include | none | quality gate weakening risk |

Current changed-file classification:

- Source repair: `scripts/run-tests.js`, `scripts/run-scenario-suite.js`, `src/adapters/adapterPackets.js`, `src/adapters/game/gameObservationAdapter.js`, `src/adapters/game/httpGameObservationSource.js`, `src/adapters/httpPostAdapter.js`, `src/adapters/runtimeAdapters.js`, `src/adapters/youtube/donationAdapter.js`, `src/adapters/youtube/youtubeLiveChatApiSource.js`, `src/runtime/httpIngestScheduler.js`, `src/runtime/irisRuntime.js`, `src/runtime/runtimeConfig.js`, `src/runtime/streamState.js`, `src/server/localBridgeEngineWorker.js`, `src/server/overlayStatus.js`, `src/services/dev/adminCharacterVoiceSettings.js`, `src/services/dev/gameplayValidationGateRoundtrip.js`, `src/services/dev/integrationStatus.js`, `src/services/dev/persistenceReadinessRehearsal.js`, `src/services/dev/productionConfigDoctor.js`, `src/services/dev/youtubeIngestReadinessRehearsal.js`, `src/services/memory/memoryRecall.js`, `src/services/relationship/relationshipDeepening.js`, `src/services/stream/streamLifecycle.js`.
- Harness docs: `AGENTS.md`, `docs/index.md`, `docs/architecture/INTEGRATION_STATUS.md`, `docs/iris/BEHAVIOR.md`, `docs/iris/CHANGELOG.md`, `docs/iris/EVALS.md`, `docs/iris/FAILURES.md`, `docs/iris/PROMPT_RULES.md`, `docs/iris/QUALITY_SCORE.md`, `docs/iris/QUESTIONS.md`, `docs/iris/SPEC.md`, `reports/iris/README.md`, `reports/iris/PR_SPLIT_PLAN.md`.
- Env policy proposal: `docs/iris/ENV_POLICY_PROPOSAL.md`.
- Eval/regression: `evals/iris/golden_cases.yaml`, `evals/iris/regression_cases.yaml`.
- Quality gate / manifest: `docs/process/CODEX_HARNESS_MANIFEST.json`.
- Windows verify wrapper: `scripts/verify-iris.sh`, `scripts/verify-iris.mjs`.
- Harness scripts: `scripts/check-iris-boundaries.sh`, `scripts/lint-iris-docs.sh`, `scripts/run-iris-evals.sh`.
- Restored and excluded: `.env.example`, `package.json`, `docs/process/CODEX_QUALITY_GATE_POLICY.json`, `scripts/codex-local-quality-gate.mjs`.

## PR 1: IRIS Source Repair

Purpose: repair runtime/test contract mismatches without changing harness policy.

Include:

- `src/adapters/**`
- `src/runtime/**`
- `src/server/localBridgeEngineWorker.js`
- `src/server/overlayStatus.js`
- `src/services/dev/**` files that changed
- `src/services/memory/memoryRecall.js`
- `src/services/relationship/relationshipDeepening.js`
- `src/services/stream/streamLifecycle.js`
- `scripts/run-tests.js`
- `scripts/run-scenario-suite.js` only if required by scenario safety assertions

Do not include:

- `.env.example`
- `package.json`
- `AGENTS.md`
- docs/evals/reports
- quality gate policy or local gate implementation

Verification:

- `npm test`
- `node scripts/codex-secret-safety-scan.mjs`
- `node scripts/codex-local-quality-gate.mjs`
- `CODEX_RUN_PROFILE_REQUIRED_CHECKS=1 node scripts/codex-local-quality-gate.mjs`
- `CODEX_QUALITY_REPORT=json node scripts/codex-local-quality-gate.mjs`
- `git diff --check`
- `git diff --cached --check`

Quality gate expectation: implementation PR, R3, human review required, no blocked path, no harness mixed scope.

Human judgment: required for high-risk source changes.

## PR 2: IRIS Harness Docs

Purpose: document authority, quality score, failures, questions, evals, and Windows verify entry.

Include:

- `AGENTS.md`
- `docs/index.md`
- `docs/iris/**`
- `evals/iris/**`
- `reports/iris/**`
- `docs/process/CODEX_HARNESS_MANIFEST.json`
- `scripts/verify-iris.sh`
- `scripts/verify-iris.mjs`
- `scripts/lint-iris-docs.sh`
- `scripts/run-iris-evals.sh`
- `scripts/check-iris-boundaries.sh`

Do not include:

- `src/**`
- `scripts/run-tests.js`
- `.env.example`
- `package.json`
- quality gate policy changes

Verification:

- `bash scripts/lint-iris-docs.sh`
- `bash scripts/check-iris-boundaries.sh`
- `bash scripts/run-iris-evals.sh`
- `node scripts/codex-secret-safety-scan.mjs`
- `node scripts/codex-local-quality-gate.mjs`
- `CODEX_QUALITY_REPORT=json node scripts/codex-local-quality-gate.mjs`
- `git diff --check`
- `git diff --cached --check`

Quality gate expectation: harness or docs-focused PR. May require existing policy to support these paths without weakening blocked source paths.

Human judgment: required for authority manifest changes.

## PR 3: IRIS Env Policy Proposal

Purpose: decide whether env sample names belong in `.env.example`.

Include:

- `docs/iris/ENV_POLICY_PROPOSAL.md`
- `docs/iris/QUESTIONS.md` updates

Do not include:

- `.env.example` unless a human approves a dedicated env policy PR.
- source changes
- harness policy changes

Verification:

- `bash scripts/lint-iris-docs.sh`
- `node scripts/codex-secret-safety-scan.mjs`
- `node scripts/codex-local-quality-gate.mjs`
- `git diff --check`

Quality gate expectation: docs-only PR.

Human judgment: required before `.env.example` changes are reintroduced.

## High-Risk Source Change Justification

| File | Why needed | Test evidence | Regression case | If reverted |
| --- | --- | --- | --- | --- |
| `src/server/localBridgeEngineWorker.js` | Enforces safe engine cue text, explicit duration, bridge status, and Live2D cue schema handling. | `npm test` local bridge engine worker cases | `iris-regression-engine-cue-safety` | HTTP engine success/failure contracts regress. |
| `src/runtime/streamState.js` | Keeps vision metadata summary safe while preserving allowed boolean telemetry. | `npm test` stream state and replay log cases | `iris-regression-stream-summary-sanitization` | Safe public summary or telemetry assertions regress. |
| `src/services/stream/streamLifecycle.js` | Sanitizes unsafe lifecycle summary values. | `npm test` stream lifecycle cases | `iris-regression-stream-summary-sanitization` | Raw or unsafe summary values can reappear. |
| `src/services/dev/youtubeIngestReadinessRehearsal.js` | Counts ready gates from the same public booleans validated by the contract. | `npm test` production readiness runbook | `iris-regression-derived-gate-counts` | Gate count summary becomes internally inconsistent. |
| `src/services/dev/persistenceReadinessRehearsal.js` | Same derived gate count correction for persistence readiness. | `npm test` persistence readiness coverage | `iris-regression-derived-gate-counts` | Gate count summary becomes internally inconsistent. |
| `src/services/dev/gameplayValidationGateRoundtrip.js` | Keeps adapter handoff proof tied to actual request count. | `npm test` gameplay validation gate roundtrip | `iris-regression-foundation-first-blocker` | Disabled/simulated handoff can be reported as real. |
| `src/adapters/**`, `src/runtime/**`, `src/services/dev/**`, `src/services/memory/**`, `src/services/relationship/**` | Existing broad repair set from contract mismatch cleanup. | `npm test` 454/454 PASS | see `evals/iris/regression_cases.yaml` | Needs per-file review before any revert; blind revert can reintroduce repaired failures. |

## Merge Order

1. IRIS source repair.
2. IRIS harness docs.
3. IRIS env policy proposal.

Do not merge env sample changes before human approval.
