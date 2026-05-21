project: IRIS
role: production real evidence acquisition manifest
status: spec_only
last_verified: 2026-05-22
verification_command: node scripts/lint-iris-docs.mjs
owner: human

# IRIS Production Real Evidence Manifest

This manifest defines the safe evidence envelope required before priority1 production blockers can be considered for resolution.
It does not run probes, start workers, mutate OBS, connect to a database, poll YouTube, send Game input, or perform production go/no-go.

Regression PASS, fixture PASS, rehearsal PASS, and dry-run PASS are not real production evidence.
They may prove contracts, but they do not prove live residency, owner confirmation, emergency stop readiness, audit readiness, or production go.

## Evidence Envelope

Real evidence must use an allowlisted source type:

- `real_probe`
- `operator_confirmed`
- `manual_upload`
- `audit_link`

Every real evidence item is a safe summary only:

- `component_label`
- `status`
- `freshness`
- `source_type`
- `collector_role`
- `status_hash`
- `audit_reference`
- `evidence_timestamp_ms`

The `status_hash` is a safe integrity reference, not a raw evidence body.
The `audit_reference` is a safe label or safe audit id, not an endpoint, path, URL, payload, command, or private note.

## Forbidden Fields

Production real evidence, public summaries, admin summaries, reports, debug summaries, audit handoff bundles, and go/no-go packages must not contain:

- `secret`
- endpoint value
- token
- raw path
- local absolute path
- raw payload
- raw command
- raw evidence body
- raw memory
- raw candidate
- raw relationship record
- private viewer id
- relationship score
- `world_command`
- `inner_intent`

Any evidence item carrying those fields, or values shaped like those fields, remains blocked and cannot resolve priority1.

## Component Evidence Matrix

| component_label | required_evidence | freshness_requirement | owner_confirmation_required | emergency_stop_required | audit_reference_required | go_no_go_dependency | safe_public_fields | forbidden_fields | next_safe_action_label |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bridge` | real bridge worker residency and safe handoff status | `bridge_worker` fresh within the live worker window | yes, for live handoff | yes, before live operation | yes | blocks go until worker and handoff are fresh | status, freshness, count, safe reason | endpoint, raw job, raw path, payload | `collect_bridge_worker_evidence` |
| `TTS` | real TTS engine health and voice source status | `tts_engine` fresh within the engine window | yes, before live voice use | yes, before live operation | yes | blocks go until engine health and voice source are fresh | status, freshness, count, safe reason | endpoint, token, raw voice sample, payload | `collect_tts_engine_evidence` |
| `Live2D` | real renderer heartbeat, model configured status, cue capability, recovery support | `live2d_renderer` fresh within the renderer window | yes, before live renderer use | yes, before live operation | yes | blocks go until renderer and cue capability are fresh | status, freshness, count, safe reason | endpoint, model path, motion path, raw renderer payload | `collect_live2d_renderer_evidence` |
| `subtitle` | real subtitle engine, sync source, safe area, and line break readiness | `subtitle_engine` fresh within the subtitle window | yes, before live overlay use | yes, before live operation | yes | blocks go until subtitle output path is fresh and safe | status, freshness, count, safe reason | raw text body, raw path, payload | `collect_subtitle_engine_evidence` |
| `OBS` | OBS running status, browser source pickup, overlay pickup, heartbeat, artifact freshness | `obs_pickup` fresh within the OBS pickup window | yes, before OBS live pickup | yes, before live operation | yes | blocks go until OBS pickup and artifact freshness are confirmed | status, freshness, count, safe reason | endpoint, URL value, raw acknowledgement, runtime payload | `collect_obs_pickup_evidence` |
| `DB` | real connection status, schema, index, migration, backup, restore rehearsal | `db_connection` fresh within the DB verification window | yes, before production persistence use | yes, before live operation | yes | blocks go until DB verification and rollback evidence are fresh | status, freshness, count, safe reason | DB URL, SQL, credentials, private viewer data | `collect_db_connection_evidence` |
| `YouTube` | OAuth label, token freshness label, live chat id readiness, polling, dedupe, moderation | `youtube_ingest` fresh within the ingest window | yes, before real polling | yes, before live operation | yes | blocks go until ingest, dedupe, and moderation evidence are fresh | status, freshness, count, safe reason | token, endpoint, raw API response, raw comment, live chat id value | `collect_youtube_ingest_evidence` |
| `Game` | real adapter status, safe action map, manual approval, emergency stop, cooldown, audit readiness | `game_adapter` fresh within the game adapter window | yes, before any real input/control | yes, required and confirmed before go | yes | blocks go until game adapter, approval, stop, cooldown, and audit readiness are fresh | status, freshness, count, safe reason | raw frame, raw screenshot, raw vision response, raw game payload, command | `collect_game_adapter_evidence` |

Freshness windows are evaluated by the runtime contracts for each component.
A stale item remains stale even if it was previously successful.
Missing evidence, future timestamps, unsafe source types, fixture evidence, and unsafe fields keep the component blocked.

## Owner Confirmation

Owner confirmation is required for every scope that can affect real live operation:

- live worker or bridge handoff
- OBS pickup or overlay use
- TTS voice output
- Live2D renderer output
- subtitle overlay output
- DB persistence against production resources
- YouTube real polling or ingest
- Game observation, control, or input
- emergency stop availability
- final go/no-go and live handoff bundle

Owner confirmation must be current, scope-specific, safe-summary-only, and audit-linked.
It cannot be inferred from tests, fixtures, dry-runs, prior approval, branch name, PR title, or Codex output.
Codex cannot self-confirm owner approval.

## Emergency Stop

Emergency stop confirmation is required before production go.
The confirmation must show safe status for each live-affecting component and must include an audit reference.

If emergency stop is missing, stale, unconfirmed, unsafe, or not audit-linked:

- `production_go_allowed=false`
- go/no-go remains `no_go` or `blocked`
- priority1 remains BLOCKED

## Audit Readiness

Audit readiness requires:

- safe audit reference linked for every component evidence item
- safe operator handoff event recorded
- no raw payload stored in the handoff audit event
- no endpoint, token, raw path, raw diagnostics, or command text in the audit summary
- timestamp freshness evaluated as safe status only

If audit readiness is missing or blocked, production go is prohibited even when component evidence appears fresh.

## Live Handoff Bundle

A live handoff bundle is governed by `docs/iris/IRIS_PRODUCTION_LIVE_HANDOFF_BUNDLE.md`.
The bundle is safe-summary-only and must contain:

- component evidence aggregate
- owner confirmation aggregate
- emergency stop confirmation aggregate
- audit readiness aggregate
- blocker resolution aggregate
- go/no-go classifier result
- safe next action labels

Bundle generation does not collect fresh evidence, perform owner confirmation, confirm emergency stop, confirm audit readiness, or perform production go.
It must not contain shell bodies, endpoint values, token values, raw paths, local absolute paths, raw payloads, raw evidence bodies, raw jobs, candidates, commands, `world_command`, or `inner_intent`.

## Go/No-Go Conditions

The production go/no-go package is governed by `docs/iris/IRIS_PRODUCTION_GO_NOGO_PACKAGE.md`.
Package generation can only consume safe references from real evidence and live handoff bundle summaries.
It does not perform production go, collect fresh evidence, or confirm owner approval.

Production go remains prohibited unless all conditions are true:

- every required component has fresh real evidence from an allowlisted source
- owner confirmation is present for the exact live scope
- emergency stop is confirmed
- audit readiness is ready
- the live handoff bundle is complete
- critical blocker count is zero
- missing component count is zero
- unsafe field detection is clear
- priority1 blocker resolution guard is clear

If any critical blocker exists, the result is `go=false`.
If any component is missing, stale, fixture-only, dry-run-only, or unsafe, the result is `go=false`.

## Priority1 Resolution

Priority1 BLOCKED can be considered for resolution only after:

- fresh real evidence exists for bridge, TTS, Live2D, subtitle, OBS, DB, YouTube, and Game
- owner confirmation exists for all live-affecting scopes
- emergency stop is confirmed
- audit readiness is ready
- live handoff bundle is complete
- go/no-go evaluates to go with zero critical blockers
- no forbidden field is present
- human owner approves the resolution

Until then, priority1 remains BLOCKED.

## Non-Evidence

The following are not production real evidence:

- `npm test` PASS
- IRIS eval PASS
- docs lint PASS
- local quality gate PASS
- fixture PASS
- rehearsal PASS
- synthetic relay/source output
- dry-run output
- stale prior success
- Codex-generated confirmation text

These checks remain required for regression safety, but they do not remove the real-operation evidence requirement.
