---
project: IRIS
role: failure log
status: source-of-truth
last_verified: 2026-05-19
verification_command: bash scripts/run-iris-evals.sh
owner: human
---
<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->

# IRIS Failures

This log records failures that should become regression cases when they are concrete.

## F-001 Project Boundary Mixing

Cause: IRIS and FUNKY instructions can appear in the same operator history.

Risk: Codex may apply FUNKY-specific authority or asset rules to IRIS work.

Prevention: `scripts/check-iris-boundaries.sh` checks for project-specific terms that should not appear in IRIS spec docs.
`evals/iris/regression_cases.yaml` includes a boundary regression case.

## F-002 Missing Authority Ambiguity

Cause: IRIS has repo-local `IRIS_SPEC_AUTHORITY.md`, while a separate absolute authority path may be absent in some workspaces.

Risk: Codex may treat a draft or stale external file as authority.

Prevention: `docs/iris/QUESTIONS.md` records the workspace-level authority question.
Codex must use repo-local `IRIS_SPEC_AUTHORITY.md` for this repository unless a human gives a different authority path.

## F-003 Code Used As Specification

Cause: Code and tests show current implementation, not the formal meaning of the IRIS spec.

Risk: Codex may normalize an implementation bug into documentation.

Prevention: `evals/iris/regression_cases.yaml` requires code/test evidence to remain subordinate to formal authority.

## F-004 Unsafe Report Output

Cause: Debugging can tempt Codex to paste raw logs, payloads, memory, OBS events, frames, OCR text, voice samples, dataset paths, or internal model paths.

Risk: Sensitive or internal material leaks into reports.

Prevention: secret scan and eval cases require safe summaries only.

## F-005 Full npm test Failure On Harness Branch

Observed: 2026-05-19.

Command: `npm test`.

Cause: implementation/test mismatch in the existing IRIS runtime and HTTP adapter test set.

Status: repaired in the current working tree; `npm test` passed on 2026-05-19 with 454 tests.

Risk: broad implementation plus harness changes still fail the local quality gate, so the IRIS Codex environment cannot be called 100/100 yet.

Prevention: Keep full `npm test` in the required verification loop, and do not hide failing runtime coverage behind a harness-only pass.

## F-006 Windows Bash Launcher Drift

Observed: 2026-05-19.

Command: `bash scripts/verify-iris.sh`.

Cause: Windows resolved `bash` to the WSL launcher, which failed before running the repo script.

Risk: A valid repo-level harness can appear broken on Windows due to host shell configuration.

Prevention: Use `node scripts/verify-iris.mjs` on Windows. The wrapper prefers Git Bash and keeps `scripts/verify-iris.sh` unchanged.

## F-007 Derived Gate Count Drift

Observed: 2026-05-19.

Command: `npm test`.

Cause: YouTube ingest and persistence rehearsal summaries counted raw gate `ready` flags while the public summary exposed stricter derived ready flags.

Risk: a report could pass internal readiness counts while its public booleans show a different state.

Prevention: derive ready and attention counts from the same public-safe gate booleans validated by the contract.

## F-008 Foundation Readiness Fixture Drift

Observed: 2026-05-19.

Command: `npm test`.

Cause: tests expected lower-priority live readiness gates to become top-level next tasks even while real engine handoff remained the first blocking gate.

Risk: Codex could treat downstream readiness as ready before the foundation runtime handoff is complete.

Prevention: keep top-level `next_*` assertions aligned with the first blocking gate and assert downstream details through `priority_gates` or gate-specific summaries.

## F-009 Quality Gate Mixed Scope Block

Observed: 2026-05-19.

Command: `node scripts/codex-local-quality-gate.mjs`.

Cause: the current working tree mixed docs, scripts, package metadata, high-risk source changes, and `.env.example`.

Risk: the repo can have passing tests while still failing Codex PR separation and blocked-path policy.

Prevention: restore blocked paths and package/policy changes unless explicitly approved, then split future work into policy-compliant PRs. Do not use a policy exception silently.

## F-010 High-Risk Source Change Without Split

Observed: 2026-05-19.

Command: `node scripts/codex-local-quality-gate.mjs`.

Cause: runtime, adapter, server, dev readiness, memory, relationship, and stream source repairs were left in the same working tree as harness docs.

Risk: human review cannot clearly separate implementation behavior risk from documentation and harness entrypoint changes.

Prevention: keep high-risk source changes in an IRIS source repair PR with `npm test` evidence and regression cases. Keep harness docs and env policy proposals in separate PRs.

## F-011 Env Sample Blocked Path Drift

Observed: 2026-05-19.

Command: `node scripts/codex-local-quality-gate.mjs`.

Cause: `.env.example` was changed while the current human decision disallows env sample changes.

Risk: blocked-path policy fails, and env examples can be mistaken for approved runtime configuration.

Prevention: keep `.env.example` unchanged unless a dedicated human-approved env policy PR is opened. Record proposed env names in that separate env policy PR.
