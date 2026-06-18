# IRIS Synthetic Live Loop Dry-Run

## Status

Status: proposal
Scope: specification and deterministic local-only validation
Runtime implementation: not implemented
External calls: not performed
Dataset audit runner: not implemented
Real dataset processing: not performed
Runtime readiness: not claimed
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define a deterministic synthetic dry-run for the minimum IRIS AI-Tuber loop.
The dry-run proves that safe synthetic inputs can pass through classification,
persona, safety, candidate, and external handoff summary stages without side
effects. It is not a runtime loop and must not connect to YouTube, OBS, TTS,
Live2D, CRIPTO-TIP, a database, Minecraft, or any game adapter.

## Product Value

This slice returns product value by showing a coherent end-to-end shape for an
IRIS live interaction while preserving the current nonruntime boundary. It
connects earlier fixture and validator work to a recognizable AI-Tuber flow:
commentary, memory candidate, relationship candidate, safe voice/avatar/subtitle
summaries, and Community World recap candidate.

ProductValueDelta is advisory only. It cannot authorize product code changes,
runtime work, package or lockfile changes, workflow changes, merge, release,
readiness, production go, or owner-scope expansion.

## Synthetic Input Boundary

Inputs are JSONL fixture rows only. Rows must use synthetic labels and safe
summaries. They must not include raw chat, private viewer IDs, raw audio, raw
asset paths, raw payment data, raw screen data, external endpoints, tokens,
secrets, or real user data.

Fixture oracle fields are:

- `expected_result_state`
- `expected_reason_code`
- `expected_blocking`
- `expected_operator_attention_required`

These expected fields are comparison data only. They must never influence the
actual reason, result state, blocking state, operator attention state, candidate
creation, side-effect classification, privacy classification, or safety
classification.

## Oracle Independence

Actual evaluation is derived only from observed fixture input markers and
policy. Expected fields are read only after actual evaluation is complete.

Actual blocking semantics are:

- `pass`: `blocking=false`
- `blocked`, `needs_review`, and `fail`: `blocking=true`

Invalid schema, missing required fields, invalid field types, duplicate
`scenario_id`, duplicate `trace_id`, unsupported scenario kind, and unsupported
fixture group all fail safely.

## Supported Scenario Kinds

Supported scenario kinds:

- `comment`
- `game_observation`
- `donation`
- `media_watch`
- `external_topic`
- `idle`

Unsupported scenario kinds:

- `world_command`
- `input_action_candidate`
- `approved_game_input_action`
- `execute`
- `commit`
- `write`
- `memory_write`

## Dry-Run Stages

The dry-run stages are:

1. safe synthetic input
2. input classification
3. persona consistency check
4. safety and privacy check
5. commentary candidate
6. memory candidate
7. relationship candidate
8. VOXWEAVE safe summary candidate
9. LIVE2D safe summary candidate
10. subtitle safe summary candidate
11. Community World recap candidate
12. safe final dry-run report

No stage executes a command, calls a service, mutates OBS, commits memory,
commits relationship state, publishes recognition, performs moderation, or
rolls back state.

## Output Envelope

The dry-run emits `iris_synthetic_live_loop_dry_run` safe JSON with:

- `schema_version`
- `scenario_id`
- `scenario_kind`
- `safe_input_summary`
- `persona_status`
- `safety_status`
- `privacy_status`
- `commentary_candidate`
- `memory_candidate`
- `relationship_candidate`
- `voice_safe_summary`
- `avatar_safe_summary`
- `subtitle_safe_summary`
- `community_recap_candidate`
- `operator_attention_required`
- `blocking`
- `trace_id`
- `raw_chat_included=false`
- `private_id_included=false`
- `raw_audio_included=false`
- `raw_asset_path_included=false`
- `raw_payment_data_included=false`
- `game_action_candidate_allowed=false`
- `approved_game_input_action_produced=false`
- `memory_commit_performed=false`
- `relationship_commit_performed=false`
- `public_publish_performed=false`
- `external_call_performed=false`
- `runtime_readiness_claimed=false`
- `production_readiness_claimed=false`
- `production_go_performed=false`
- `priority1_status=BLOCKED`

The safe report must not emit fixture expected fields except inside bounded
safe mismatch entries.

## Persona Boundary

Persona consistency is checked as a safe label only. Identity drift, echo risk,
and out-of-character pressure can require operator attention, but they cannot
create owner authority, memory commits, relationship commits, or runtime calls.

## Safety Boundary

Safety and privacy checks must block unsafe rows before candidate generation.
Minor-safety signals, blocked viewers, private IDs, raw inputs, direct command
requests, and readiness claims produce safe failures or expected blocking
reports only.

Prohibited input markers include `approved_game_input_action_included`,
`world_command_included`, `public_publish_performed`,
`external_call_performed`, and `production_go_performed`. These must fail
safely without executing any runtime action.

## Memory Candidate Boundary

Memory candidates are validation-gated summaries. They are not persisted. A
row that performs or requests direct memory commit must fail.

## Relationship Candidate Boundary

Relationship candidates are validation-gated summaries. Payment signals cannot
create relationship growth. A row that performs or requests direct relationship
commit must fail.

Donation rows may produce gratitude commentary candidates, but donation-derived
relationship growth must fail. A stale observation with a memory candidate,
relationship candidate, or game action candidate must fail. Muted or blocked
viewer personalization must be blocked or failed according to policy.

## External Module Handoff Boundary

VOXWEAVE, LIVE2D, and subtitle outputs are safe summary candidates only. They
must not include raw audio, raw model paths, renderer payloads, endpoints,
tokens, or external call results.

## Community World Boundary

Community World recap candidates are safe text-state summaries. They cannot
create Minecraft commands, plugins, runtime actions, public publish decisions,
or official affiliation claims.

## No-Side-Effect Boundary

The dry-run must not:

- use network
- launch external processes except bounded self-test children
- write outside temporary self-test directories
- call an LLM
- call external adapters
- connect to YouTube, OBS, TTS, Live2D, CRIPTO-TIP, DB, Minecraft, or Game
  Adapter
- commit memory
- commit relationship state
- publish public recognition
- claim runtime readiness or production readiness

## Failure Semantics

Safe failures include:

- `scenario_id`
- `reason_code`
- `stage`
- `expected_status`
- `actual_status`
- `expected_blocking`
- `actual_blocking`
- `rawFixturePrinted=false`
- `rawLogsRead=false`
- `rawDiffRead=false`
- `priority1Status=BLOCKED`

The validator must not print full unsafe fixture bodies.

## Acceptance Criteria

Acceptance requires:

- at least 20 synthetic fixture rows
- all supported scenario kinds represented
- positive, boundary, and negative rows represented
- negative rows fail for their intended reason
- safe rows cannot become actual fail merely because `expected_result_state`
  says `fail`
- safe rows cannot become blocking merely because `expected_blocking` says
  `true`
- negative fixture group rows without an unsafe trigger fail validation because
  actual evaluation remains pass
- unsafe rows cannot pass merely because expected fields say `pass`
- `approved_game_input_action_included`, `world_command_included`,
  `public_publish_performed`, `external_call_performed`, and
  `production_go_performed` fail safely
- donation-derived relationship growth fails
- direct relationship commit fails
- muted viewer personalization is blocked
- pass rows produce only safe summary candidates
- priority1 remains BLOCKED
- no external call, memory commit, relationship commit, public publish,
  readiness claim, or production go is performed

## Non Goals

This document does not implement runtime, dataset audit execution, YouTube
ingest, OBS pickup, TTS, Live2D rendering, CRIPTO-TIP payment handling, DB
persistence, Minecraft runtime, Minecraft plugin, Game Adapter execution, legal
compliance, platform compliance, runtime readiness, production readiness, or
production go.

## Future Runtime Boundary

Future runtime work requires separate owner scope, exact files, external
interfaces, real side effects, fresh evidence, emergency stop, rollback, audit,
owner confirmation, and validation. This dry-run may inform that work but cannot
authorize it.

