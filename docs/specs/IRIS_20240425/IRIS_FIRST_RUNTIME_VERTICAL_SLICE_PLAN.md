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

Exact files must be owner-approved before implementation. The exact first-slice
implementation file set is defined in `Exact Implementation Scope`:

- `src/runtime/firstRuntimeVerticalSlice.js`
- `scripts/iris-first-runtime-vertical-slice-self-test.mjs`
- `docs/specs/IRIS_20240425/fixtures/runtime/iris_first_runtime_vertical_slice_fixture.jsonl`

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

## Exact Implementation Scope

scope_id: `iris_first_runtime_vertical_slice_v1`

base_main_sha: `1fd52ea22b5cab949d00680a409aae33492d55f2`

implementation_branch: `iris-first-runtime-vertical-slice-impl`

This exact scope is still plan-only. It names the only files that may be used
for the first implementation after owner authorization.

### Runtime Discovery Summary

Inspected active source files:

- `src/runtime/irisRuntime.js`: existing reusable runtime path, read-only for
  this slice. It is too broad for the first slice because it can select adapter
  fallbacks, game control, candidate persistence, and stores.
- `src/runtime/scenarioRunner.js`: existing scenario utility, read-only. Useful
  as a safety reference for synthetic scenario shape, but not selected as the
  implementation path because it returns broad runtime summaries.
- `src/adapters/youtube/commentAdapter.js`: existing reusable input normalizer,
  read-only or imported. It validates synthetic YouTube-style comment summaries.
- `src/services/response/httpResponseGenerator.js`: existing response provider,
  read-only. It must not be used by the first slice because it performs HTTP.
- `src/services/safety/moderationPersonalizationGate.js`: existing safe
  validator, imported by the first slice.
- `src/services/voice/speechCue.js`: existing safe voice-summary builder,
  imported by the first slice.
- `src/services/voice/subtitleCue.js`: existing safe subtitle-summary builder,
  imported by the first slice.
- `src/services/expression/expressionProfile.js`: existing safe avatar profile
  builder, read-only reference. The first slice may produce only a bounded
  avatar safe summary rather than a full expression profile if dependencies
  would widen scope.
- `src/services/presence/performancePlan.js`: existing safe timing/profile
  helper, read-only reference. It must not create adapter calls.
- `src/runtime/streamState.js`: existing safe public state and trace surface,
  read-only reference for safe trace fields.
- `src/server/httpServer.js`: existing emergency-stop surface, read-only
  reference. The first slice must not add routes.
- `src/core/pipeline.js`: existing broad comment pipeline, read-only reference.
  It is not selected as the implementation path because it can approve memory
  and relationship candidates when stores/config are present.

Classification:

- existing_reusable_runtime_path: `src/runtime/irisRuntime.js`,
  `src/runtime/scenarioRunner.js`, `src/core/pipeline.js`
- existing_safe_validator: `src/adapters/youtube/commentAdapter.js`,
  `src/services/safety/moderationPersonalizationGate.js`
- existing_safe_handoff_builder: `src/services/voice/speechCue.js`,
  `src/services/voice/subtitleCue.js`,
  `src/services/expression/expressionProfile.js`,
  `src/services/presence/performancePlan.js`
- existing_trace_surface: `src/runtime/streamState.js`
- existing_emergency_stop_surface: `src/server/httpServer.js`
- not_suitable_for_first_slice: `src/services/response/httpResponseGenerator.js`

### Exact Existing Files

These existing files may be read or imported only as stated:

- `src/adapters/youtube/commentAdapter.js`
  - existing
  - read-only or imported
  - reason: normalize one synthetic YouTube-style comment into a safe event
  - allowed responsibility: comment input normalization and boundary checks
  - forbidden responsibility: YouTube API access, raw API response handling,
    external polling, public publish

- `src/services/safety/moderationPersonalizationGate.js`
  - existing
  - read-only or imported
  - reason: persona-adjacent safety and privacy suppression gate
  - allowed responsibility: produce safe moderation/personalization summary
  - forbidden responsibility: candidate persistence, memory commit,
    relationship commit, adapter calls

- `src/services/voice/speechCue.js`
  - existing
  - read-only or imported
  - reason: create VOXWEAVE safe-summary input shape from final output
  - allowed responsibility: local speech cue object only
  - forbidden responsibility: TTS generation, voice engine call, raw audio

- `src/services/voice/subtitleCue.js`
  - existing
  - read-only or imported
  - reason: create subtitle safe-summary shape from final output and speech cue
  - allowed responsibility: local subtitle cue object only
  - forbidden responsibility: OBS mutation, public subtitle publish, bridge
    mutation

- `src/runtime/streamState.js`
  - existing
  - read-only reference
  - reason: safe trace/public-state shape reference
  - allowed responsibility: guide safe trace field selection
  - forbidden responsibility: persistent state mutation in the first slice

- `src/server/httpServer.js`
  - existing
  - read-only reference
  - reason: existing emergency-stop behavior reference
  - allowed responsibility: define semantics copied into the local in-process
    emergency-stop state
  - forbidden responsibility: new route, server mutation, network behavior

### Exact New Files

These files may be created by the implementation PR:

- `src/runtime/firstRuntimeVerticalSlice.js`
  - new
  - modified by implementation
  - reason: narrow in-process coordinator for one synthetic comment
  - allowed responsibility: normalize one synthetic comment, run safe
    persona/safety/privacy checks, build safe response candidate, build
    VOXWEAVE/LIVE2D/subtitle safe summaries, emit operator safe trace
  - forbidden responsibility: external calls, DB access, memory commit,
    relationship commit, public publish, game action, adapter mutation,
    readiness claim

- `scripts/iris-first-runtime-vertical-slice-self-test.mjs`
  - new
  - modified by implementation
  - reason: focused deterministic self-test for the first slice
  - allowed responsibility: assert pass path, emergency-stop path, no
    side-effect path, no raw material in trace
  - forbidden responsibility: network, filesystem persistence outside temporary
    test directory, external service access

- `docs/specs/IRIS_20240425/fixtures/runtime/iris_first_runtime_vertical_slice_fixture.jsonl`
  - new
  - modified by implementation
  - reason: one synthetic comment fixture plus one emergency-stop fixture
  - allowed responsibility: safe fixture labels and summaries only
  - forbidden responsibility: raw chat, private IDs, endpoint values, secrets,
    real user data

### Exact Modified Files

The first implementation may modify only:

- `src/runtime/firstRuntimeVerticalSlice.js`
- `scripts/iris-first-runtime-vertical-slice-self-test.mjs`
- `docs/specs/IRIS_20240425/fixtures/runtime/iris_first_runtime_vertical_slice_fixture.jsonl`

No existing runtime file may be modified in the first implementation unless the
owner issues a new exact scope.

### Exact Test Files

- `scripts/iris-first-runtime-vertical-slice-self-test.mjs`

### Exact External Interfaces

Allowed interface types:

- `synthetic_input_envelope`
- `safe_response_candidate`
- `voice_safe_summary`
- `avatar_safe_summary`
- `subtitle_safe_summary`
- `operator_safe_trace`
- `emergency_stop_state`

Forbidden interfaces:

- YouTube HTTP/API
- OBS WebSocket
- TTS engine call
- Live2D renderer call
- CRIPTO-TIP call
- DB call
- Minecraft call
- Game Adapter call
- filesystem persistence outside a bounded temporary test path
- network
- child daemon
- shell command execution

### Allowed Side Effects

No persistent side effect is allowed by default.

If a trace file is later requested, it requires a separate exact owner scope and
must be optional, local-only, safe-summary-only, disabled by default, not
committed, not public, and not a P0 artifact.

### Forbidden Side Effects

The implementation must not perform:

- memory commit
- relationship commit
- public publish
- game action
- OBS mutation
- external adapter call
- payment action
- DB write
- network call
- process launch
- secret read
- endpoint read
- private ID use
- raw chat retention
- raw audio
- raw asset path
- raw payment data

### Emergency Stop Surface

Emergency-stop state is local input to
`src/runtime/firstRuntimeVerticalSlice.js`.

Required function:

- `runFirstRuntimeVerticalSlice(input, { emergencyStopState })`

If `emergencyStopState.active === true`, the function must return:

- `result_state=blocked`
- `reason_code=emergency_stop_active`
- no response candidate
- no memory candidate
- no relationship candidate
- no voice/avatar/subtitle handoff candidate
- all side-effect booleans false
- `priority1_status=BLOCKED`

The self-test must include an emergency-stop case proving no candidates are
produced.

### Rollback Method

Rollback is one PR revert or deletion of only:

- `src/runtime/firstRuntimeVerticalSlice.js`
- `scripts/iris-first-runtime-vertical-slice-self-test.mjs`
- `docs/specs/IRIS_20240425/fixtures/runtime/iris_first_runtime_vertical_slice_fixture.jsonl`

No database rollback, external cleanup, secret rotation, migration reversal, or
adapter rollback may be required.

### Audit Surface

Safe trace fields:

- `scenario_id`
- `trace_id`
- `stage_statuses`
- `reason_codes`
- `candidate_presence_booleans`
- `side_effect_booleans`
- `emergency_stop_status`
- `priority1_status`

The safe trace must not include raw content, private IDs, raw audio, raw asset
paths, raw payment data, endpoint values, tokens, secrets, memory records,
relationship records, or game commands.

### Validation Commands

Expected implementation validation:

- `git diff --check`
- `node --check src/runtime/firstRuntimeVerticalSlice.js`
- `node --check scripts/iris-first-runtime-vertical-slice-self-test.mjs`
- `node scripts/codex-secret-safety-scan.mjs`
- `node scripts/iris-first-runtime-vertical-slice-self-test.mjs`
- `node scripts/codex-iris-synthetic-live-loop-dry-run.mjs`
- `node scripts/codex-iris-nonruntime-validator-suite.mjs`
- `node scripts/codex-v126-self-test.mjs`
- `node scripts/codex-v125-self-test.mjs`
- `node scripts/lint-iris-docs.mjs`
- `node scripts/lint-iris-docs.mjs --iris-spec-only`
- `npm test` three times with a 600-second budget
- `node scripts/codex-local-quality-gate.mjs` in create_pr_only lane
- independent read-only checker
- same-head remote quality-gate

### Owner Confirmation Required

Owner confirmation is required before implementation and before merge. The
authorization must reference:

- scope_id `iris_first_runtime_vertical_slice_v1`
- branch `iris-first-runtime-vertical-slice-impl`
- exact files above
- no external calls
- no readiness claim
- no production go
- priority1 remains BLOCKED

runtime_readiness_claimed=false

production_readiness_claimed=false

production_go_performed=false

priority1_status=BLOCKED
