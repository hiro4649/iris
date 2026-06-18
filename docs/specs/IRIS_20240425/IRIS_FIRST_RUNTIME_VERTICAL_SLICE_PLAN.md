# IRIS First Runtime Vertical Slice Plan

## Status

Status: plan only
Runtime implementation: not implemented
External calls: not performed
Dataset audit runner: not implemented
Real dataset processing: not performed
Runtime readiness: not claimed
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Goal

Define the first owner-scoped real runtime vertical slice for IRIS without
implementing it. The slice should move one synthetic or fixture-like
YouTube-style comment through an in-process orchestration path and produce a
safe response candidate plus bounded handoff summaries.

This document is a planning artifact. It cannot authorize runtime work, external
service access, package changes, workflow changes, release, readiness, or
production go.

## Existing Files Inspected

- `AGENTS.md`
- `docs/process/CODEX_HARNESS_MANIFEST.json`
- `docs/process/CODEX_V126_SPEC.md`
- `docs/specs/IRIS_20240425/IRIS_SYNTHETIC_LIVE_LOOP_DRY_RUN.md`
- `scripts/codex-iris-synthetic-live-loop-dry-run.mjs`
- `scripts/codex-iris-nonruntime-validator-suite.mjs`

## Proposed Files

Exact files must be owner-approved before implementation. A narrow first slice
should prefer:

- one runtime orchestration module
- one local-only synthetic input fixture
- one local-only validator or self-test
- one operator safe-trace schema or fixture
- one docs update tying the implementation to this plan

Do not touch package files, lockfiles, workflows, external adapters, or product
runtime surfaces outside the approved slice.

## Slice Shape

Recommended first slice:

1. one fixture or synthetic YouTube-style comment enters an in-process IRIS
   runtime orchestration path
2. IRIS produces a safe response candidate
3. persona validation runs
4. safety validation runs
5. privacy validation runs
6. VOXWEAVE safe-summary handoff is produced
7. LIVE2D safe-summary handoff is produced
8. subtitle safe-summary handoff is produced
9. operator safe trace is produced
10. no external side effect is performed

## External Interfaces

Allowed for the first slice only after owner approval:

- in-process synthetic comment input
- safe summary handoff objects for VOXWEAVE, LIVE2D, and subtitle layers
- operator safe trace with counts, statuses, and reason codes only

Forbidden for the first slice:

- real YouTube API
- OBS mutation
- TTS generation
- Live2D renderer mutation
- payment action
- database write
- memory commit
- relationship commit
- game action
- public publish
- external network call
- raw chat, raw audio, raw model path, raw payment data, private ID, or secret

## Real Side Effects

The planned first slice should have no real side effects. It may create a local
safe trace artifact only if the owner explicitly scopes the exact path and the
artifact contains safe summaries only.

## Forbidden Side Effects

The implementation must not:

- connect to YouTube, OBS, TTS, Live2D, CRIPTO-TIP, DB, Minecraft, or Game
  Adapter
- call an LLM
- call external services
- commit memory
- commit relationship state
- create approved game input action
- publish public recognition
- claim runtime readiness
- claim production readiness
- perform production go

## Emergency Stop

The implementation must include a local-only emergency stop switch before any
future external adapter is considered. If the switch is active, the slice must
produce a blocked safe trace and no candidates.

## Rollback

Rollback must be one commit revert or file removal within the owner-approved
slice. No migration, database cleanup, external cleanup, or secret rotation
should be required because the first slice must not perform external side
effects.

## Audit

Audit output must be safe-summary only:

- scenario id
- stage statuses
- reason codes
- candidate presence booleans
- side-effect booleans
- priority1 status

Audit output must exclude raw user text, private IDs, raw audio, raw asset
paths, raw payment data, endpoints, tokens, secrets, memory records,
relationship records, and game commands.

## Fresh Evidence

Before any implementation PR can be considered:

- local validation must pass for the exact changed files
- same-head remote quality gate must pass
- safe artifact head must match the PR head
- owner confirmation must be current-head specific for merge
- local pass must not be treated as production readiness
- remote gate pass must not be treated as production readiness

## Owner Confirmation

Owner confirmation is required before implementation and again before merge if
the PR changes runtime behavior. Agent, reviewer, delegated process, or PR body
text cannot create owner authority.

## Failure Isolation

Failures must be classified into one of:

- synthetic_input_invalid
- persona_validation_blocked
- safety_validation_blocked
- privacy_validation_blocked
- handoff_summary_invalid
- side_effect_attempted
- emergency_stop_active
- owner_scope_missing
- validation_unavailable
- unknown

Unknown failures stop the slice. They do not authorize broad runtime repair.

## Validation

Minimum validation for this plan:

- `git diff --check`
- `node scripts/lint-iris-docs.mjs`
- `node scripts/lint-iris-docs.mjs --iris-spec-only`
- `node scripts/codex-secret-safety-scan.mjs`
- `node scripts/codex-v126-self-test.mjs`
- `node scripts/codex-iris-nonruntime-validator-suite.mjs`

Implementation validation must be separately scoped after owner approval.

## Closed Alpha Entry Criteria

Closed alpha cannot begin from this plan alone. It requires:

- implemented runtime slice in a separate owner-approved PR
- fresh same-head remote evidence
- no raw payload leakage
- emergency stop verified
- rollback verified
- owner confirmation
- explicit statement that runtime readiness and production readiness remain
  unclaimed

## Production Claims

Fixture PASS, mock PASS, local PASS, remote gate PASS, target gate PASS, and
closed-alpha planning are not production readiness. Production go is not
performed by this plan.

## priority1 Behavior

priority1 remains BLOCKED. This plan does not resolve priority1 and does not
authorize any live operation.
