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
- `expected_blocking`
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

## Persona Boundary

Persona consistency is checked as a safe label only. Identity drift, echo risk,
and out-of-character pressure can require operator attention, but they cannot
create owner authority, memory commits, relationship commits, or runtime calls.

## Safety Boundary

Safety and privacy checks must block unsafe rows before candidate generation.
Minor-safety signals, blocked viewers, private IDs, raw inputs, direct command
requests, and readiness claims produce safe failures or expected blocking
reports only.

## Memory Candidate Boundary

Memory candidates are validation-gated summaries. They are not persisted. A
row that performs or requests direct memory commit must fail.

## Relationship Candidate Boundary

Relationship candidates are validation-gated summaries. Payment signals cannot
create relationship growth. A row that performs or requests direct relationship
commit must fail.

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

