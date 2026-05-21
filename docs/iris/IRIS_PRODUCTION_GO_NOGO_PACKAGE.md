project: IRIS
role: production go/no-go package specification
status: spec_only
last_verified: 2026-05-22
verification_command: node scripts/lint-iris-docs.mjs
owner: human

# IRIS Production Go/No-Go Package

This document specifies the safe package used to classify whether production go remains blocked or can be considered by the owner.
It does not perform production go, start workers, mutate OBS, connect to a database, poll YouTube, send Game input, collect fresh evidence, or confirm owner approval.

Package generation is a reporting step only.
It is not production go, not a live handoff execution, not fresh evidence collection, and not owner confirmation.

## Package Schema

A production go/no-go package is safe-summary-only and contains:

- `package_id`
- `package_status`
- `created_at_ms`
- `expires_at_ms`
- `real_evidence_bundle_reference`
- `live_handoff_bundle_reference`
- `owner_final_approval_section`
- `emergency_stop_final_status`
- `audit_trail_final_status`
- `rollback_abort_plan_reference`
- `critical_blocker_summary`
- `missing_component_summary`
- `stale_evidence_summary`
- `unsafe_field_scan_summary`
- `degraded_mode_separation`
- `final_classifier_result`
- `owner_only_section_status`
- `redaction_status`

Safe references may include status hashes, audit ids, component labels, blocker counts, freshness labels, and safe next action labels.
The package must not include raw evidence, raw commands, endpoint values, token values, local paths, payloads, candidates, private memory, or private relationship data.

## Required Sections

Every package must include these sections:

- `real_evidence_bundle_reference`: safe reference to real evidence governed by `docs/iris/IRIS_PRODUCTION_REAL_EVIDENCE_MANIFEST.md`.
- `live_handoff_bundle_reference`: safe reference to a complete live handoff bundle governed by `docs/iris/IRIS_PRODUCTION_LIVE_HANDOFF_BUNDLE.md`.
- `owner_final_approval_section`: owner-only final approval status for the exact production scope.
- `emergency_stop_final_status`: final emergency stop readiness status for every live-affecting component.
- `audit_trail_final_status`: final safe audit readiness status and audit references.
- `rollback_abort_plan_reference`: safe reference to the rollback and abort plan.
- `critical_blocker_summary`: critical blocker count and safe blocker labels.
- `missing_component_summary`: missing component count and safe component labels.
- `stale_evidence_summary`: stale evidence count and safe freshness labels.
- `unsafe_field_scan_summary`: safe count of forbidden field findings.
- `degraded_mode_separation`: explicit separation between degraded availability and production go permission.
- `final_classifier_result`: safe classifier output, reason labels, and counts.
- `owner_only_section_status`: whether owner-only details are present, gated, missing, or blocked.
- `redaction_status`: summary-only confirmation that forbidden fields were excluded.

Missing sections keep `package_status=blocked`.

## No-Action Guarantee

Creating, validating, rendering, or reviewing a production go/no-go package must not perform any live action.
It must not start a worker or engine, mutate OBS, connect to DB, poll YouTube, send Game input, write memory, write relationship records, trigger handoff, or issue production go.

The package can only summarize safe status, safe references, safe blocker counts, and safe next action labels.
Codex output cannot self-confirm production readiness, owner approval, or go/no-go completion.

## Go=false Conditions

The final classifier must return `go=false` when any condition is true:

- a required section is missing, stale, unsafe, or not audit-linked;
- fresh real evidence is missing for any required component;
- the live handoff bundle is incomplete, stale, blocked, or expired;
- owner final approval is missing, stale, scope-mismatched, or not owner-gated;
- emergency stop is missing, stale, unconfirmed, or unsafe;
- audit trail status is not ready;
- rollback or abort plan reference is missing or blocked;
- any critical blocker exists;
- any required component is missing;
- any required evidence is fixture-only, dry-run-only, rehearsal-only, or synthetic-only;
- unsafe field scan finds a forbidden field;
- priority1 blocker resolution guard is not clear.

When any go=false condition is present:

- `package_status=blocked`
- `production_go_allowed=false`
- final classifier remains `no_go` or `blocked`
- priority1 remains BLOCKED

## Go=true Conditions

The final classifier may return `go=true` only when all conditions are true:

- every required package section is present and safe-summary-only;
- every required component has fresh real evidence from an allowlisted source;
- live handoff bundle is complete, current, and `handoff_ready=true`;
- owner final approval is present for the exact production scope;
- emergency stop is confirmed for every live-affecting component;
- audit trail status is ready and audit-linked;
- rollback and abort plan reference is present and safe;
- critical blocker count is zero;
- missing component count is zero;
- stale evidence count is zero;
- unsafe field scan is clear;
- priority1 blocker resolution requirements are met;
- human owner approval explicitly accepts the final package.

`go=true` is a classification result, not automatic execution.
Production go still requires the approved operational procedure outside this spec.

## Degraded Mode Separation

`degraded_mode_available` is separate from `production_go_allowed`.
Degraded mode may describe a safe fallback or reduced capability path, but it does not imply production go approval.

If degraded mode is available while any production requirement is missing:

- `degraded_mode_available=true`
- `production_go_allowed=false`
- final classifier remains `no_go` or `blocked`
- priority1 remains BLOCKED

## Owner-Only Role Gate

Owner-only sections may contain only safe summaries and safe references.
They are gated by owner role and must never include forbidden fields.

If owner-only material is required but missing, inaccessible, stale, or not role-gated:

- `owner_only_section_status=blocked`
- `package_status=blocked`
- `production_go_allowed=false`

Codex cannot self-confirm owner access, owner final approval, or owner acceptance of production go.

## Rollback and Abort Plan

The package must include a safe rollback and abort plan reference before `go=true` can be considered.
The reference is a safe label or audit id only.
It must not include shell bodies, endpoint values, raw paths, raw commands, credentials, or raw operational notes.

If the rollback or abort plan is missing, stale, unsafe, or not owner-reviewable:

- `package_status=blocked`
- `production_go_allowed=false`
- priority1 remains BLOCKED

## Forbidden Fields

The package, public summaries, admin summaries, reports, debug summaries, handoff bundles, and audit summaries must not contain:

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

If any forbidden field is present or suspected, the package is invalid, `package_status=blocked`, `production_go_allowed=false`, and priority1 remains BLOCKED.

## Priority1 Persistence

Priority1 remains BLOCKED until the production go/no-go package reaches `go=true` with all required real evidence, a complete live handoff bundle, owner final approval, emergency stop confirmation, audit readiness, rollback and abort plan reference, zero critical blockers, and human owner approval.

`npm test` PASS, IRIS eval PASS, docs lint PASS, local quality gate PASS, fixture PASS, rehearsal PASS, and dry-run PASS remain regression evidence only.
They do not create real evidence, owner approval, handoff readiness, or production go.
