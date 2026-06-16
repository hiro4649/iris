# IRIS Community World Core Operator Review Specification

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

Define how operator, moderator, and owner review Community World candidates
before any memory approval, public recognition, moderation consequence, recap
export, identity link confirmation, rollback action, or future adapter action
can occur.

## Relation To Community World Core

This specification depends on:

- IRIS Community World Core / Minecraft MVP
- IRIS Community World Core Schema Fixtures
- IRIS Community World Core Fixture Catalog
- IRIS Community World Core Manual Event Summary Ingest

This specification remains docs/spec-only. It does not implement runtime,
Minecraft plugin, dataset audit runner, memory writes, public recognition
publishing, moderation action, or game command execution.

## Operator Review Principle

AI may produce candidates and safe summaries.
AI may recommend safe next action.
AI may not approve owner-only actions.
AI may not create owner authority.
AI may not commit memory directly.
AI may not publish recognition directly.
AI may not execute moderation consequence directly.
AI may not confirm identity link directly.
AI may not execute rollback.
AI may not produce `approved_game_input_action`.

Human or operator review is required for candidate approval according to scope.

## Review Roles

- `owner`
- `operator`
- `moderator`
- `read_only`
- `ai_reviewer`

Role rules:

- Owner may approve owner-only decisions.
- Operator may approve standard safe candidates if policy allows.
- Moderator may review moderation and grief candidates if policy allows.
- Read-only role may not approve.
- AI reviewer may classify and recommend but may not approve.
- AI reviewer may not submit GitHub approval review.
- AI reviewer may not create owner authority.

## Reviewable Candidate Types

- `community_world_memory_candidate`
- `public_recognition_candidate`
- `moderation_candidate`
- `recap_export_candidate`
- `minecraft_identity_link_candidate`
- `contribution_ledger_candidate`
- `build_registry_candidate`
- `grief_rollback_request_candidate`
- `minor_safety_attention_candidate`
- `monetization_policy_attention_candidate`
- `unofficial_notice_attention_candidate`

## Required Review Item Shape

`community_world_operator_review_item`:

- `review_id`
- `candidate_id`
- `candidate_type`
- `world_id`
- `session_id`
- `source_event_id`
- `viewer_safe_key_optional`
- `safe_title`
- `safe_summary`
- `risk_flags`
- `privacy_class`
- `moderation_precheck_status`
- `reviewer_role_required`
- `decision_state`
- `decision_reason_code`
- `owner_review_required`
- `moderator_review_required`
- `public_surface_allowed`
- `memory_commit_allowed`
- `recognition_publish_allowed`
- `moderation_action_allowed`
- `rollback_action_allowed`
- `identity_link_confirm_allowed`
- `raw_text_included=false`
- `private_id_included=false`
- `payment_ranking_included=false`
- `relationship_ranking_included=false`
- `game_command_included=false`
- `adapter_action_included=false`
- `trace_id`
- `created_at_ms`

## Decision States

- `pending_review`
- `approved_candidate`
- `rejected_candidate`
- `needs_correction`
- `needs_owner_review`
- `needs_moderator_review`
- `suppressed_public`
- `quarantined`
- `expired`
- `revoked`

Decision rules:

- `approved_candidate` is still not direct runtime execution.
- `approved_candidate` may allow a later approved schema only where policy
  permits.
- `rejected_candidate` must not be silently retried as approved.
- `needs_correction` returns safe reason only.
- `quarantined` prevents public surface and memory commit.
- `revoked` invalidates previous approval for future use.
- `expired` requires re-review.

## Memory Candidate Review

Raw Minecraft chat is rejected.
Private viewer ID is rejected.
Sensitive personal data is rejected.
Exact private coordinate is rejected.
Raw grief evidence is rejected.
Payment-derived relationship is rejected.
Relationship ranking is rejected.

Approved memory requires safe summary and review. Approved memory does not imply
public mention. Approved memory does not imply relationship growth.

## Public Recognition Candidate Review

Recognition must be non-ranking.
Recognition must be contribution-based.
Recognition must not expose private IDs.
Recognition must not compare payment amounts.
Recognition must not imply exclusive friendship.
Recognition must not imply romantic closeness.
Recognition must not publicly accuse griefing.
Recognition must be newcomer-friendly.

## Moderation Candidate Review

Moderation requires safe labels.
Raw accusation is rejected.
Raw evidence is rejected from ordinary view.
Private IDs are role-gated.

Mute, ban, kick, and limited interaction require moderator or owner approval
according to policy. AI may recommend review but cannot execute action. Public
shame is forbidden.

## Recap Candidate Review

Recap must be safe highlights only.

Forbidden recap content:

- raw chat
- private IDs
- raw moderation detail
- exact private coordinates
- payment ranking
- relationship ranking
- production readiness claim
- official Minecraft, Mojang, or Microsoft affiliation claim

## Identity Link Candidate Review

YouTube, Discord, and Minecraft username links remain candidates until reviewed.
Private identifiers are not public.
Identity mismatch requires rejection or correction.
Public display name requires explicit allowed flag.
Identity link confirmation does not imply special relationship.
Identity link confirmation does not imply whitelist approval by itself.

## Contribution and Build Candidate Review

Contribution summaries must be safe summaries.
Build registry references must avoid exact private coordinates.
Contributor list must use safe keys or public-safe display names.
Contribution does not create rank.
Contribution does not create payment privilege.
Build recognition requires public recognition review.

## Grief and Rollback Review

Rollback request remains candidate.
Raw accusation is forbidden in public.
Raw evidence is forbidden in ordinary view.
Moderator or owner review is required before public consequence.
Rollback action is not executed by this spec.
Rollback action requires future runtime policy and approval.

## Correction and Suppression Flow

Candidate may be corrected before approval.
Candidate may be suppressed from public surface.
Suppression does not delete audit trace.
Correction must preserve `trace_id`.
Rejected or quarantined candidates must not be committed.
Suppressed public recognition must not appear in recap.

## Audit Trail

Review decision must create a safe audit entry.

Audit entry fields:

- `review_id`
- `candidate_id`
- `candidate_type`
- `reviewer_role`
- `decision_state`
- `decision_reason_code`
- `safe_summary`
- `trace_id`
- `created_at_ms`

Audit entry must not include:

- raw chat
- raw grief evidence
- private ID
- secret
- endpoint
- token
- payment detail
- relationship score
- game command
- adapter payload

## Safety Boundaries

- `candidate` is not executable.
- `input_action_candidate` must not reach Game Adapter.
- `approved_game_input_action` is not produced by operator review.
- Operator review cannot generate Minecraft commands.
- Operator review cannot update server state.
- Operator review cannot directly write memory.
- Operator review cannot directly write relationship.
- Operator review cannot publish public recognition without an approved
  publishing path.
- Operator review cannot execute moderation action without future runtime
  policy.
- Operator review cannot produce production readiness.
- Operator review cannot resolve priority1.
- Operator review cannot prove real Minecraft server operation.

## Negative Examples

Reject examples:

- review item contains raw Minecraft chat
- review item contains private viewer ID
- review item contains relationship score
- review item contains payment ranking
- review item contains Minecraft command
- review item approves memory direct commit
- review item approves relationship direct commit
- review item publicly accuses griefing
- review item exposes raw grief evidence
- review item implies Mojang or Microsoft official approval
- review item claims production readiness
- review item resolves priority1
- `ai_reviewer` approves owner-only action

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
- Review roles are defined.
- Review item shape is defined.
- Decision states are defined.
- Memory, recognition, moderation, recap, identity, contribution, build, grief,
  and rollback review boundaries are defined.
- Negative examples are listed.
- No runtime code added.
- No Minecraft plugin added.
- No dataset audit runner added.
- priority1 remains BLOCKED.

## Future Work

- Operator review JSON fixture catalog.
- Review validator spec.
- Owner-only review UI spec.
- Moderator review UI spec.
- Recap approval spec.
- Public recognition publishing spec.
- Only later optional runtime adapter after safety gates.
