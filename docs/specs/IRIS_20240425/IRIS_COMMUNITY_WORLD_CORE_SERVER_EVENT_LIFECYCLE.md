# IRIS Community World Core Server Event Lifecycle Specification

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

Define Community World event lifecycle before any real server automation or
Minecraft plugin exists.

## Relation To Community World Core

This lifecycle ties together participation, identity link, moderation, memory
recall, public recognition, unofficial notice, and commercial review policies.
It defines planning states and candidate boundaries only.

## Event Lifecycle Principle

Events are planned as candidates.
Events do not open a real server.
Events do not change server state.
Events do not prove production readiness.
Events do not execute commands.
Events require review before public participation.

## Lifecycle States

- `draft`
- `needs_policy_review`
- `needs_owner_review`
- `approved_candidate`
- `scheduled_candidate`
- `stream_only_open_candidate`
- `active_manual_summary_only`
- `closed`
- `recap_candidate`
- `archived`
- `cancelled`
- `quarantined`

## Event Candidate Shape

`community_world_event_lifecycle_policy`:

- `event_id`
- `world_id`
- `event_type`
- `lifecycle_state`
- `participation_policy_ref`
- `identity_link_policy_ref`
- `moderation_policy_ref`
- `memory_policy_ref`
- `recognition_policy_ref`
- `unofficial_notice_policy_ref`
- `commercial_policy_review_ref_optional`
- `server_open_state`
- `owner_review_required`
- `operator_review_required`
- `moderator_required`
- `minor_safety_precheck_required`
- `manual_summary_ingest_allowed`
- `runtime_execution_allowed=false`
- `minecraft_command_allowed=false`
- `production_readiness_claimed=false`
- `trace_id`

## Pre-Event Review

Participation policy is required.
Identity link candidate policy is required.
Moderation precheck is required.
Minor safety check is required.
Unofficial notice is required for public surfaces.
Commercial review is required for paid access or benefit.
Owner or operator review is required before public scheduling.

## Open Window Policy

`stream_only` means access during stream window only.
`event_window` requires start/end bucket.
`moderator_test` is not public launch.
`owner_test` is not production readiness.
`future_public_candidate` is not production readiness.

No automatic server opening is created by this spec.

## Live Event Policy

Live event handling is manual event summary only.
No real server automation.
No plugin payload.
No raw chat storage.
No direct command generation.
No public moderation accusation.
Moderator attention path is required.

## Close Policy

Event closes to `recap_candidate` or `archived`.
No automatic memory commit.
No automatic public recognition publish.
No automatic rollback.
No production readiness claim.

## Recap Policy

Recap uses safe highlights only.
Recap follows the recognition / recap spec.
Recap excludes raw chat, private IDs, moderation raw detail, exact private
coordinates, and payment ranking.

## Rollback and Incident Policy

Rollback request remains candidate.
Incident summary uses safe label.
Moderator or owner review is required.
No runtime rollback execution.
No public accusation.

## Participation Policy Link

Event participant flow must respect whitelist policy.
Identity link does not auto-approve access.
Payment does not auto-approve access.
Moderation status can block or limit access.

## Memory Policy Link

Event memory remains candidate.
Approved memory requires review.
Recall cooldown applies.
Newcomer friendliness applies.

## Public Recognition Link

Event recognition is non-ranking.
Event recognition is non-exclusive.
Payment-derived recognition is forbidden.
Moderation unresolved candidates are excluded.

## Unofficial Notice Link

Public event surface must include unofficial notice if Minecraft is referenced.
No official Minecraft, Mojang, or Microsoft claim is allowed.

## Commercial Review Link

Paid access or benefit requires commercial review.
No legal compliance claim is made.
No pay-to-win is allowed.

## Negative Examples

Reject examples:

- Event opens server automatically.
- Event executes Minecraft command.
- Event grants access to paid user automatically.
- Event claims official Minecraft approval.
- Event claims production readiness.
- Event publishes raw chat recap.
- Event names grief suspect publicly.
- Event creates approved memory directly.
- Event creates public recognition directly.

## Validation Plan

Required validation:

- docs lint
- spec-only docs lint
- secret scan
- v124 self-test

## Non Goals

- No runtime implementation.
- No Minecraft plugin.
- No real server automation.
- No scheduler implementation.
- No YouTube or Discord integration.
- No dataset audit runner.
- No production readiness.
- No production go.

## Acceptance Criteria

- Spec exists.
- Lifecycle states are defined.
- Event candidate shape is defined.
- Pre-event, live, close, recap, and rollback policies are defined.
- Participation, memory, recognition, unofficial notice, and commercial policy
  links are defined.
- No runtime code added.
- No Minecraft plugin added.
- No dataset audit runner added.
- priority1 remains BLOCKED.

## Future Work

- Event lifecycle fixture catalog.
- Event review checklist.
- Manual event operation guide.
- Only later optional runtime adapter after safety gates.
