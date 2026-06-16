# IRIS Community World Core Manual Event Summary Ingest Specification

## Status

Status: proposal
Scope: specification only
Runtime implementation: not started
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Dataset audit runner implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define how operator-provided or fixture-provided Community World event summaries
can be safely ingested before any Minecraft runtime or plugin exists.

Manual event ingest is a specification boundary for future tooling. It does not
prove real server operation, does not write memory, and does not execute game or
adapter actions.

## Relation To Community World Core

IRIS Community World Core is the reusable shared-world architecture. Minecraft
is the first adapter target, not the whole architecture.

Manual event ingest supports early Community World planning by allowing safe,
reviewable event summaries to be drafted before live adapter evidence exists.
These summaries may feed future candidate workflows only after separate
validation and owner-approved implementation.

## Manual Ingest Principle

Manual event summaries are safe summaries only.

Manual summaries are not raw Minecraft chat.
Manual summaries are not server logs.
Manual summaries are not plugin payloads.
Manual summaries are not machine evidence for runtime readiness.
Manual summaries do not prove real server operation.
Manual summaries may create candidates only, not approved memory or persistence
writes.

## Ingest Source Types

Allowed source types:

- `operator_summary`
- `moderator_summary`
- `fixture_summary`
- `stream_recap_summary`
- `safe_chat_digest`
- `safe_build_digest`

Forbidden source types:

- `raw_minecraft_chat`
- `raw_server_log`
- `raw_plugin_payload`
- `raw_discord_export`
- `raw_youtube_chat_export`
- `raw_grief_evidence`
- `private_dm`
- `payment_record`

## Required Input Shape

`community_world_manual_event_ingest`:

- `event_id`
- `world_id`
- `session_id`
- `source_type`
- `safe_title`
- `safe_summary`
- `participant_safe_keys`
- `contribution_refs`
- `build_refs`
- `moderation_precheck_status`
- `memory_candidate_allowed`
- `public_recognition_candidate_allowed`
- `owner_or_moderator_review_required`
- `raw_text_included=false`
- `private_id_included=false`
- `payment_ranking_included=false`
- `game_command_included=false`
- `trace_id`
- `created_at_ms`

## Allowed Event Types

- `build_progress`
- `exploration`
- `resource_support`
- `newcomer_support`
- `community_ceremony`
- `area_unlock`
- `repair`
- `moderation_review`
- `weekly_recap_seed`

Forbidden event types:

- `game_command`
- `server_admin_command`
- `payment_rank_update`
- `relationship_rank_update`
- `exclusive_friendship_event`
- `romantic_escalation_event`
- `raw_grief_accusation`
- `private_identity_link`
- `production_readiness_evidence`

## Safety Boundaries

- `candidate` is not executable.
- `input_action_candidate` must not reach Game Adapter.
- `approved_game_input_action` is not produced by manual ingest.
- Manual ingest cannot generate Minecraft commands.
- Manual ingest cannot update server state.
- Manual ingest cannot commit memory directly.
- Manual ingest cannot commit relationship directly.
- Manual ingest cannot create production readiness.
- Manual ingest cannot resolve priority1.
- Manual ingest cannot prove real Minecraft server operation.

## Memory Candidate Boundary

Manual event ingest may create `community_world_memory_candidate` only if a safe
summary is present.

Rejected inputs:

- raw chat
- private identifiers
- sensitive data
- exact private coordinates
- payment-derived relationship

Approved memory requires later validation. A valid manual event summary can at
most become a memory candidate.

## Contribution Ledger Boundary

Manual event ingest may reference a contribution ledger candidate.

Contribution is safe summary only. Contribution cannot rank viewers, compare
payment amount, produce exclusive access, or create pay-to-win benefit.

## Public Recognition Boundary

Public recognition candidate rules:

- Must be non-ranking.
- Must not expose private IDs.
- Must not accuse griefing publicly.
- Must not imply exclusive closeness.
- Must not be payment-derived.

Public recognition remains a candidate until reviewed.

## Moderation Boundary

Moderation review events must use safe labels.

Forbidden moderation ingest content:

- raw accusation
- raw evidence
- private IDs
- doxxing details
- harassment details

Rollback request remains a candidate. Moderator or owner review is required for
any public consequence.

## Recap Export Boundary

Recap export uses safe highlights only.

Forbidden recap content:

- raw chat
- private IDs
- moderation raw detail
- exact private coordinates
- payment ranking
- readiness claim

## Negative Examples

Reject examples:

- raw chat included
- private viewer ID included
- relationship score included
- payment ranking included
- Minecraft command included
- server admin command included
- raw grief evidence included
- production readiness claimed
- priority1 resolved
- Mojang or Microsoft affiliation implied

## Validation Plan

Required validation for this specification:

- docs lint
- spec-only docs lint
- secret scan
- v124 self-test only if docs policy requires

No runtime tests are required.
No npm test is required unless docs tooling requires it.

## Non Goals

- No runtime implementation.
- No Minecraft plugin.
- No server integration.
- No adapter implementation.
- No dataset audit runner.
- No package or workflow change.
- No production readiness.
- No production go.

## Acceptance Criteria

- Spec exists.
- Manual ingest is safe-summary-only.
- Required input shape is defined.
- Forbidden source types are defined.
- Memory, contribution, recognition, moderation, and recap boundaries are
  defined.
- Negative examples are listed.
- No runtime code added.
- No Minecraft plugin added.
- No dataset audit runner added.
- priority1 remains BLOCKED.

## Future Work

- Schema JSON fixtures.
- Manual ingest validator spec.
- Operator review UI spec.
- Moderator review spec.
- Recap export spec.
- Only later optional runtime adapter after safety gates.
