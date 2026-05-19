---
project: IRIS
role: unresolved questions
status: draft
last_verified: 2026-05-19
verification_command: bash scripts/lint-iris-docs.sh
owner: human
---
<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->

# IRIS Questions

## Q-001 Workspace-Level Authority Path

`C:\Users\HIRO-001\Documents\IRIS_SPEC_AUTHORITY.md` was not present during the 2026-05-19 cross-project harness audit.
This repository contains `IRIS_SPEC_AUTHORITY.md` at the repo root.

Decision recorded for this repository: use repo-local `IRIS_SPEC_AUTHORITY.md` as the source of truth.
Do not restore or require the workspace-level path unless a future human instruction explicitly changes the authority model.
Do not treat the clone directory name as authority for the harness version.

## Q-002 Full Runtime Eval Scope

The current `scripts/run-iris-evals.sh` is a lightweight static harness.
It does not execute a full IRIS runtime behavior simulation.

Human decision needed: which live runtime prompts or scenarios should be promoted into executable golden cases?

## Q-003 Shared Codex Process

FUNKY now has a richer Codex documentation system.
Only project-neutral process ideas should be reused in IRIS.

Human decision needed: which shared Codex rules should live in a separate common harness repository instead of each project?

## Q-004 Quality Gate Split Scope

`npm test` passed on 2026-05-19 after repairing runtime/test contract mismatches.

The local quality gate still fails because the current working tree mixes docs, scripts, package metadata, high-risk source changes, and `.env.example`.

Human decision needed: split the broad repair into policy-compliant PRs, or define a formal broad repair path without using a silent policy exception.

Proposed split:

1. IRIS source repair:
   - Purpose: repair runtime/test contract mismatches without changing harness policy.
   - Include: `src/server/localBridgeEngineWorker.js`, `src/runtime/streamState.js`, `src/services/stream/streamLifecycle.js`, `src/services/dev/youtubeIngestReadinessRehearsal.js`, `src/services/dev/persistenceReadinessRehearsal.js`, and source files needed by the repaired runtime contracts.
   - Include tests: `scripts/run-tests.js` only for contract assertions tied to the source repair.
   - Exclude: `AGENTS.md`, docs-only harness files, `.env.example`, package metadata, and quality-gate policy.
   - Verification: `npm test`, secret scan, quality gate, JSON quality report, diff checks.
   - Human review: required for high-risk source changes.

2. IRIS harness docs:
   - Purpose: document authority, failures, quality score, evals, Windows verify wrapper, and project registry alignment.
   - Include: `AGENTS.md`, `docs/index.md`, `docs/iris/*`, `evals/iris/*`, `reports/iris/README.md`, `scripts/verify-iris.sh`, `scripts/verify-iris.mjs`, docs lint/eval scripts, and manifest updates.
   - Exclude: runtime source changes and `.env.example`.
   - Verification: docs lint, eval, boundary check, secret scan, quality gate, diff checks.
   - Human review: required if the manifest authority model changes.

3. IRIS env policy:
   - Purpose: decide whether `.env.example` changes are necessary.
   - Include: `.env.example` only if a human approves the blocked-path change.
   - Alternative: move non-secret env-name documentation to docs instead of changing blocked env samples.
   - Verification: secret scan, quality gate, diff checks.
   - Human review: required before any `.env.example` change is merged.

Current high-risk source-change groups:

- Adapter and HTTP boundary: `src/adapters/*`, `src/runtime/httpIngestScheduler.js`, `src/runtime/irisRuntime.js`, `src/runtime/runtimeConfig.js`.
- Public-safe summaries: `src/runtime/streamState.js`, `src/server/overlayStatus.js`, `src/services/stream/streamLifecycle.js`.
- Dev/readiness reports: `src/services/dev/*`, including YouTube and persistence rehearsal gate summaries.
- Memory and relationship boundary: `src/services/memory/memoryRecall.js`, `src/services/relationship/relationshipDeepening.js`.

These require source-repair PR treatment because reverting them blindly can reintroduce the `npm test` failures repaired on 2026-05-19.

## Q-006 Env Sample Approval

Current human decision: do not include `.env.example` changes in this repair.

Proposed env names are reserved for a separate env policy PR.

Human decision needed: approve a future env-only policy PR, or reject the proposed env names permanently.

## Q-005 Directory Rename Timing

Current working directory name includes `v065`.
This is not source of truth.
Future rename candidate: `iris-harness-current` or `iris`.

Human decision needed before any rename: confirm no scripts, docs, manifests, or external runner paths depend on the current directory name.
