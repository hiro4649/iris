project: IRIS
role: production live handoff bundle specification
status: spec_only
last_verified: 2026-05-22
verification_command: node scripts/lint-iris-docs.mjs
owner: human

# IRIS Production Live Handoff Bundle

This document specifies the safe bundle that can be prepared for the owner before any production live handoff.
It does not start workers, mutate OBS, connect to a database, poll YouTube, send Game input, collect fresh evidence, or perform production go.

Bundle generation is a reporting step only.
It is not production go, not owner confirmation, not emergency stop confirmation, not audit readiness, and not real evidence collection.

## Bundle Schema

A live handoff bundle is safe-summary-only and contains:

- `bundle_id`
- `bundle_status`
- `handoff_ready`
- `created_at_ms`
- `expires_at_ms`
- `component_evidence_aggregate`
- `owner_confirmation_aggregate`
- `emergency_stop_aggregate`
- `audit_readiness_aggregate`
- `blocker_summary`
- `go_no_go_classifier_reference`
- `safe_next_action_labels`
- `owner_only_section_status`
- `redaction_status`

The bundle may include safe references such as audit ids, status hashes, component labels, blocker counts, freshness labels, and next action labels.
It must not include raw evidence bodies, shell bodies, endpoint values, token values, paths, payloads, commands, candidates, or private memory.

## Required Sections

Every bundle must include these sections:

- `component_evidence_aggregate`: one safe status entry for bridge, TTS, Live2D, subtitle, OBS, DB, YouTube, and Game.
- `owner_confirmation_aggregate`: scope-specific owner confirmation status and audit reference.
- `emergency_stop_aggregate`: emergency stop status for every live-affecting component.
- `audit_readiness_aggregate`: safe audit readiness status and audit references.
- `blocker_summary`: critical blocker count, missing evidence count, stale evidence count, unsafe field count, and unresolved priority1 state.
- `go_no_go_classifier_reference`: safe classifier label and safe reason counts.
- `safe_next_action_labels`: labels for owner-facing next steps, without commands or values.
- `owner_only_section_status`: whether owner-only details are present, gated, missing, or blocked.
- `redaction_status`: summary-only confirmation that forbidden fields were excluded.

Missing sections keep `handoff_ready=false`.

## Handoff Ready Rules

`handoff_ready` is `true` only when all conditions are true:

- every required section is present;
- every component has fresh real evidence from an allowlisted source in `docs/iris/IRIS_PRODUCTION_REAL_EVIDENCE_MANIFEST.md`;
- owner confirmation is current for the exact live scope;
- emergency stop status is confirmed for live-affecting components;
- audit readiness is ready and audit-linked;
- blocker summary has zero critical blockers;
- go/no-go classifier reference is safe and consistent with the bundle;
- bundle has not expired;
- owner-only section is role-gated when present;
- redaction status is clear.

`handoff_ready=false` when any required section is missing, any evidence is stale, any owner confirmation is missing, emergency stop is missing, audit readiness is blocked, any critical blocker exists, the bundle is expired, or forbidden fields are detected.

## Bundle Expiration

Every bundle has an `expires_at_ms` safe timestamp.
Expired bundles cannot be reused for production go.
A stale or expired bundle must be regenerated from current safe summaries and current real evidence references.
Regeneration still does not collect evidence or perform production go.

## Owner-Only Section Role Gate

Owner-only sections may contain only safe summaries and safe references.
They are gated by owner role and must never include forbidden fields.

If owner-only material is required but missing, inaccessible, stale, or not role-gated:

- `owner_only_section_status=blocked`
- `handoff_ready=false`
- production go remains prohibited

Codex output cannot self-confirm owner access or owner approval.

## No-Action Guarantee

Creating, rendering, validating, or reviewing a live handoff bundle must not perform live actions.
It must not start a worker, start an engine, mutate OBS, connect to DB, poll YouTube, send Game input, write memory, write relationship records, or issue production go.

The bundle can only summarize safe status, safe references, safe blocker counts, and safe next action labels.

## Production Go/No-Go Package Reference

The production go/no-go package is governed by `docs/iris/IRIS_PRODUCTION_GO_NOGO_PACKAGE.md`.
It can reference the live handoff bundle by safe id, safe status, blocker counts, and redaction status only.
It must not treat bundle generation as production go, fresh evidence collection, or owner final approval.

## Forbidden Fields

The bundle, public summaries, admin summaries, reports, debug summaries, and go/no-go packages must not contain:

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

If any forbidden field is present or suspected, the bundle is invalid, `handoff_ready=false`, and priority1 remains BLOCKED.

## Priority1 Persistence

Priority1 remains BLOCKED after bundle creation unless all real evidence, owner confirmation, emergency stop, audit readiness, handoff bundle, go/no-go, blocker resolution, and human owner approval requirements are satisfied.

The bundle is not proof of production readiness by itself.
It is the safe handoff package that lets the owner review whether the prerequisites are complete.
