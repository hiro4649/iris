# IRIS Community World Core Moderation / Grief / Rollback Specification

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

Define safe moderation, grief report, rollback request, and enforcement
candidate policy before any Minecraft runtime or plugin exists.

## Relation To Community World Core

This specification extends the Community World Core operator review and
participation policy. It defines candidate shapes and safety boundaries only.
It does not execute moderation, rollback, server commands, adapter actions, or
public consequences.

## Moderation Principle

AI may classify moderation risk.
AI may recommend review.
AI may not execute moderation action.
AI may not publicly accuse.
AI may not publish raw evidence.
AI may not expose private IDs.
AI may not execute rollback.

Moderator or owner review is required for consequences.

## Moderation Candidate Types

- `grief_report_candidate`
- `rollback_request_candidate`
- `mute_candidate`
- `kick_candidate`
- `ban_candidate`
- `limited_interaction_candidate`
- `minor_safety_attention_candidate`
- `harassment_attention_candidate`
- `private_data_exposure_attention_candidate`
- `false_report_attention_candidate`

## Grief Report Candidate Shape

`community_world_grief_report_candidate`:

- `report_id`
- `world_id`
- `session_id`
- `reporter_safe_key_optional`
- `subject_safe_key_optional`
- `safe_summary`
- `affected_build_refs`
- `event_refs`
- `evidence_class`
- `raw_evidence_included=false`
- `private_id_included=false`
- `public_accusation_allowed=false`
- `moderator_review_required=true`
- `owner_review_required_optional`
- `rollback_candidate_allowed`
- `public_surface_allowed=false`
- `trace_id`
- `created_at_ms`

## Rollback Request Candidate Shape

`community_world_rollback_request_candidate`:

- `rollback_request_id`
- `world_id`
- `affected_build_refs`
- `affected_area_bucket`
- `safe_reason_code`
- `safe_summary`
- `raw_coordinates_included=false`
- `raw_evidence_included=false`
- `moderator_review_required=true`
- `owner_review_required_optional`
- `execution_allowed=false`
- `future_runtime_policy_required=true`
- `trace_id`

## Mute / Kick / Ban Candidate Shape

`community_world_moderation_action_candidate`:

- `candidate_id`
- `world_id`
- `subject_safe_key`
- `action_type`
- `safe_reason_code`
- `duration_bucket_optional`
- `moderator_review_required`
- `owner_review_required`
- `public_surface_allowed=false`
- `execution_allowed=false`
- `audit_required=true`
- `trace_id`

## Review Requirements

Review requirements:

- Moderator or owner review is required for consequences.
- Owner review is required for high-risk public statements.
- AI reviewer may classify and recommend only.
- Public recap cannot include unresolved allegations.
- Moderator action must create safe audit entry before any future execution
  path can use it.

## Evidence Handling

Raw evidence is never public.
Raw evidence is not ordinary admin view.
Screenshots, logs, chat, coordinates, or private messages are not stored in
ordinary candidate summaries.
Evidence class is safe label only.
Evidence references must be role-gated.
Public recap must not include accusations.

## Privacy and Public Surface

Forbidden public surface content:

- private IDs
- exact private coordinates
- raw chat
- raw server logs
- private DMs
- payment details
- public shame
- public accusation without moderator-approved public statement

## Minor Safety

Minor safety attention overrides ordinary flow.
Private contact is forbidden.
Special intimacy is forbidden.
Public handling must be conservative.
Owner or operator escalation is required for risk.

## False Report Handling

False report is candidate only.
Do not publicly shame reporter.
Do not auto-punish.
Moderator review is required.
Repeated abuse may create moderation candidate with safe summary only.

## Audit Trail

Every reviewed moderation candidate requires safe audit entry.

Audit entry cannot include:

- raw evidence
- private IDs
- tokens
- endpoints
- raw command
- raw chat

## Negative Examples

Reject examples:

- AI bans a viewer directly.
- AI kicks a viewer directly.
- AI executes rollback.
- AI publishes accusation in recap.
- Raw chat evidence is included.
- Exact coordinates are included.
- Private ID is exposed.
- Moderator raw note is public.
- Payment status affects moderation.
- Minor is contacted privately.
- Production readiness claimed.

## Validation Plan

Required validation:

- docs lint
- spec-only docs lint
- secret scan
- v124 self-test

## Non Goals

- No runtime implementation.
- No Minecraft plugin.
- No real server moderation.
- No rollback execution.
- No dataset audit runner.
- No package or workflow change.
- No production readiness.
- No production go.

## Acceptance Criteria

- Spec exists.
- Moderation candidate types are defined.
- Grief report shape is defined.
- Rollback request shape is defined.
- Moderation action candidate shape is defined.
- Review requirements are explicit.
- Raw evidence is forbidden from public surfaces.
- AI cannot execute moderation action.
- AI cannot execute rollback.
- No runtime code added.
- No Minecraft plugin added.
- priority1 remains BLOCKED.

## Future Work

- Moderation fixture catalog.
- Grief report fixture catalog.
- Rollback candidate validator spec.
- Moderator review UI spec.
- Only later optional runtime adapter after safety gates.
