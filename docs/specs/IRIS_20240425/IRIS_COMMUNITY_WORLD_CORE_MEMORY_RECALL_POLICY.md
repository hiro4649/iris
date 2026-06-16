# IRIS Community World Core Memory Recall Policy Specification

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

Define how IRIS may safely remember and recall Community World contributions,
builds, events, and participation summaries before any runtime persistence or
Minecraft plugin exists.

## Relation To Community World Core

This policy follows the Community World Core MVP, manual ingest, operator
review, identity link, participation, moderation, and recognition specs. It
defines memory candidate and recall boundaries only. It does not implement a
database writer, memory service, Minecraft plugin, or runtime recall system.

## Memory Recall Principle

IRIS may recall safe contribution summaries.
IRIS may not recall raw Minecraft chat.
IRIS may not recall private IDs.
IRIS may not recall exact private coordinates.
IRIS may not recall raw grief evidence.
IRIS may not recall payment-derived relationship.
IRIS may not recall sensitive personal disclosures as ordinary community memory.
Recall must remain newcomer-friendly.
Recall must avoid exclusive intimacy.
Recall must be suppressible and correctable.

## Memory Candidate Classes

- `contribution_memory_candidate`
- `build_memory_candidate`
- `event_memory_candidate`
- `newcomer_support_memory_candidate`
- `community_ceremony_memory_candidate`
- `weekly_recap_memory_candidate`
- `moderation_attention_memory_candidate`
- `identity_link_context_candidate`

## Approved Memory Classes

- `approved_safe_contribution_memory`
- `approved_safe_build_memory`
- `approved_safe_event_memory`
- `approved_safe_recap_memory`
- `approved_safe_public_ritual_memory`

## Forbidden Memory Classes

- `raw_chat_memory`
- `private_id_memory`
- `payment_rank_memory`
- `relationship_rank_memory`
- `exact_private_coordinate_memory`
- `raw_grief_evidence_memory`
- `minor_private_contact_memory`
- `romantic_or_exclusive_memory`
- `unofficial_compliance_claim_memory`
- `production_readiness_memory`

## Recall Permission States

- `not_reviewed`
- `recall_allowed`
- `recall_limited`
- `public_surface_allowed`
- `private_surface_only`
- `suppressed`
- `forgotten`
- `expired`
- `quarantined`

## Recall Cooldown Policy

Same memory cannot be recalled repeatedly without cooldown. Viewer-specific
recall must not monopolize attention. Community memory should include short
context for newcomers. High-frequency recall should degrade to a general
community summary.

## Newcomer Friendliness Policy

Memory should help new viewers understand the world.
Memory must not imply newcomers are outsiders.
Inside jokes need short safe context.
Regulars may be acknowledged without ranking.

## Privacy Boundary

No private viewer IDs.
No raw Minecraft chat.
No exact private coordinates.
No raw moderation notes.
No raw grief evidence.
No private DMs.
No payment details.
No sensitive personal disclosures.
No relationship score.
No hidden rank.

## Moderation Boundary

Muted, blocked, or limited viewers suppress personalized recall.
Moderation candidates are not ordinary memory.
Grief allegations are not public recall.
Quarantined candidates cannot be recalled.
Public moderation statements require separate review.

## Minor Safety Boundary

Minor-related memories require stricter limits.
No special intimacy.
No private contact.
No dependency reinforcement.
No repeated individualized attention.

## Contribution Memory Boundary

Contribution memory is safe summary only.
Contribution memory is not ranking.
Contribution memory is not payment-derived.
Contribution memory is not permanent privilege.
Contribution memory does not imply special friendship.

## Build Memory Boundary

Build memory may reference safe build name and general area bucket.
Build memory must not reveal exact private coordinates.
Build memory must not expose hidden grief evidence.
Build memory must not publish contributors without allowed public display names.

## Event Memory Boundary

Event memory must be safe summary.
Event memory must not include raw chat.
Event memory must not include private IDs.
Event memory must not claim official Minecraft affiliation.
Event memory must not claim production readiness.

## Public Surface Boundary

Public recall requires `public_surface_allowed`.
Public recall must be short.
Public recall must be non-ranking.
Public recall must be non-exclusive.
Public recall must be newcomer-friendly.
Public recall must avoid payment hierarchy.

## Correction / Suppression / Forget Flow

Viewer or operator may request correction.
Operator may suppress public recall.
Owner or operator may quarantine risky memory.
Forget flow must remove ordinary recall.
Audit trace may remain as safe metadata only.
Suppressed or forgotten memory must not appear in recap.

## Required Memory Recall Shape

`community_world_memory_recall_policy`:

- `policy_id`
- `memory_id`
- `world_id`
- `memory_class`
- `safe_summary`
- `source_event_refs`
- `viewer_safe_keys_optional`
- `public_display_allowed`
- `public_surface_allowed`
- `recall_permission_state`
- `recall_cooldown_bucket`
- `newcomer_context_required`
- `moderation_precheck_status`
- `minor_safety_precheck_status`
- `privacy_class`
- `suppression_allowed`
- `forget_allowed`
- `raw_chat_included=false`
- `private_id_included=false`
- `exact_coordinate_included=false`
- `payment_ranking_included=false`
- `relationship_ranking_included=false`
- `trace_id`

## Negative Examples

Reject examples:

- IRIS recalls raw Minecraft chat.
- IRIS says a private viewer ID.
- IRIS recalls exact private coordinates.
- IRIS ranks viewers by closeness.
- IRIS says payment made someone closer.
- IRIS recalls grief accusation publicly.
- IRIS repeatedly singles out a minor.
- IRIS says someone is its special friend.
- IRIS recalls sensitive personal data.
- IRIS claims production readiness from memory.

## Validation Plan

Required validation:

- docs lint
- spec-only docs lint
- secret scan
- v124 self-test

## Non Goals

- No runtime memory implementation.
- No DB writer.
- No memory validator code.
- No Minecraft plugin.
- No dataset audit runner.
- No package or workflow change.
- No production readiness.
- No production go.

## Acceptance Criteria

- Spec exists.
- Memory candidate and approved memory classes are defined.
- Forbidden memory classes are defined.
- Recall permission states are defined.
- Cooldown and newcomer friendliness policies are defined.
- Privacy, moderation, minor safety, contribution, build, event, and public
  surface boundaries are defined.
- Correction, suppression, and forget flow is defined.
- No runtime code added.
- No Minecraft plugin added.
- No dataset audit runner added.
- priority1 remains BLOCKED.

## Future Work

- Memory recall fixture catalog.
- Memory candidate validator spec.
- Operator correction UI spec.
- Forget and suppression audit spec.
- Only later optional runtime memory implementation after safety gates.
