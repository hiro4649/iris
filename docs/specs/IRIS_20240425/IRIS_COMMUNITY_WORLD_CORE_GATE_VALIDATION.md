# IRIS Community World Core Gate Validation Specification

## Status

Status: proposal
Scope: specification only
Validator implementation: not started
Runtime implementation: not started
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Dataset audit runner implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define safe gate validation semantics for Community World Core before any
runtime, Minecraft plugin, or dataset audit runner implementation exists.

## Relation To K1001-K1020

The gates provide future validation boundaries for the K1001-K1020 traceability
matrix. They classify whether a candidate is acceptable for documentation,
fixture, review, or future implementation work. They do not approve runtime
execution or production operation.

## Gate Validation Principle

Gate validation is fail-closed. A missing review, unclear evidence class, raw
payload, command-like action, private identifier, payment-to-rank signal, or
readiness claim blocks the candidate. A passing gate is only a safe validation
result for the current evidence class.

## Gate List

- `community_world_core_schema_gate`
- `minecraft_identity_link_gate`
- `minecraft_server_participation_policy_gate`
- `minecraft_chat_safe_ingest_gate`
- `minecraft_contribution_ledger_gate`
- `minecraft_build_registry_gate`
- `minecraft_event_lifecycle_gate`
- `minecraft_moderation_grief_rollback_gate`
- `minecraft_memory_recall_policy_gate`
- `minecraft_public_recognition_no_ranking_gate`
- `minecraft_monetization_no_pay_to_win_gate`
- `minecraft_unofficial_commercial_policy_gate`
- `community_recap_safe_export_gate`
- `community_world_anti_parasocial_gate`
- `community_world_minor_safety_gate`
- `community_world_no_direct_command_gate`
- `community_world_no_raw_chat_memory_gate`
- `community_world_owner_review_gate`
- `community_world_pay_to_rank_guard`
- `community_world_newcomer_friendliness_gate`
- `community_world_recall_cooldown_gate`

## Gate Result States

- `pass`
- `fail`
- `blocked`
- `not_applicable`
- `needs_review`

## Gate Input Evidence Classes

- `spec_only`
- `fixture_spec`
- `synthetic_fixture`
- `manual_summary`
- `operator_review_candidate`
- `remote_runtime_evidence`
- `real_runtime_evidence`

## Gate Output Shape

`community_world_gate_result`:

- `schema_version`
- `gate_id`
- `result_state`
- `input_evidence_class`
- `safe_reason_codes`
- `blocking`
- `owner_review_required`
- `operator_review_required`
- `runtime_execution_allowed=false`
- `minecraft_command_allowed=false`
- `production_readiness_claimed=false`
- `production_go_performed=false`
- `priority1_status`
- `trace_id`

## Fail-Closed Rules

The candidate must fail or block if it includes raw chat, private identifiers,
exact private coordinates, raw server logs, game commands, `input_action_candidate`,
payment-derived rank, relationship rank, public leaderboard pressure, production
readiness claims, production go claims, official Minecraft affiliation claims,
missing owner review, missing operator review where required, or unclear minor
safety handling.

## Per-Gate Semantics

- `community_world_core_schema_gate`: requires a known schema version and safe
  field names.
- `minecraft_identity_link_gate`: blocks direct private ID exposure and requires
  reversible candidate handling.
- `minecraft_server_participation_policy_gate`: requires whitelist, newcomer,
  minor safety, and rule disclosure boundaries.
- `minecraft_chat_safe_ingest_gate`: accepts safe summaries only and rejects raw
  chat memory.
- `minecraft_contribution_ledger_gate`: records contribution type without ranking
  people.
- `minecraft_build_registry_gate`: accepts build metadata without ownership or
  friendship pressure.
- `minecraft_event_lifecycle_gate`: requires lifecycle state and review boundary.
- `minecraft_moderation_grief_rollback_gate`: blocks unreviewed punishment or
  automatic rollback claims.
- `minecraft_memory_recall_policy_gate`: requires cooldown, suppression, and no
  raw chat recall.
- `minecraft_public_recognition_no_ranking_gate`: permits thanks and recap while
  rejecting leaderboards and status hierarchy.
- `minecraft_monetization_no_pay_to_win_gate`: rejects paid power, paid rank, and
  paid friendship signals.
- `minecraft_unofficial_commercial_policy_gate`: requires unofficial notice and
  commercial review where relevant.
- `community_recap_safe_export_gate`: permits safe recap summaries only.
- `community_world_anti_parasocial_gate`: rejects dependency, exclusivity, and
  relationship pressure.
- `community_world_minor_safety_gate`: requires protective defaults and review.
- `community_world_no_direct_command_gate`: rejects executable game actions.
- `community_world_no_raw_chat_memory_gate`: rejects raw chat as memory input.
- `community_world_owner_review_gate`: blocks owner-scoped decisions until owner
  review is present.
- `community_world_pay_to_rank_guard`: rejects ranking derived from payment.
- `community_world_newcomer_friendliness_gate`: rejects exclusionary newcomer
  treatment.
- `community_world_recall_cooldown_gate`: blocks repeated recall without cooldown.

## Negative Examples

- Accepting `input_action_candidate` as a Minecraft adapter command.
- Storing raw chat text as long-term memory.
- Ranking players by donation amount.
- Claiming official Minecraft, Mojang, or Microsoft affiliation.
- Treating operator review as owner approval.
- Treating a fixture PASS as production readiness.
- Allowing public recognition to become a popularity ladder.

## Validation Plan

Future validators should evaluate each gate against safe, typed inputs and emit
only `community_world_gate_result`. Validators must not read raw logs, raw chat,
private identifiers, secrets, endpoint values, or live server payloads.

## Non Goals

- No runtime implementation.
- No Minecraft plugin implementation.
- No dataset audit runner implementation.
- No production readiness claim.
- No production go.
- No priority1 resolution.

## Acceptance Criteria

- All gates have named semantics.
- Result states and evidence classes are explicit.
- Fail-closed behavior is defined.
- Direct command execution is rejected.
- Raw chat memory is rejected.
- Payment-to-rank behavior is rejected.
- Runtime implementation remains not started.
- Production readiness is not claimed.
- priority1 remains BLOCKED.

## Future Work

- Add synthetic fixture rows for each gate.
- Add safe validators after owner-scoped approval.
- Link validator output to the K1001-K1020 traceability matrix.
