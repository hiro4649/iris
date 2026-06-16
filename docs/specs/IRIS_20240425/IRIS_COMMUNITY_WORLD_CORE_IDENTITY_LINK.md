# IRIS Community World Core Identity Link Specification

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

Specify the YouTube, Discord, and Minecraft identity link candidate flow for
IRIS Community World Core before any runtime, Minecraft plugin, persistence
write, whitelist action, or public display commitment exists.

Identity linking is a review workflow for safe continuity. It is not proof of
real server operation, not game access approval, and not relationship growth.

## Relation To Community World Core

IRIS Community World Core uses identity links to connect safe community
participation summaries across surfaces after review.

This specification follows:

- IRIS Community World Core / Minecraft MVP
- IRIS Community World Core Schema Fixtures
- IRIS Community World Core Fixture Catalog
- IRIS Community World Core Manual Event Summary Ingest
- IRIS Community World Core Operator Review

This remains docs/spec-only and does not implement runtime, adapter logic,
Minecraft plugin behavior, or dataset audit automation.

## Identity Link Principle

Identity link remains candidate until reviewed.
YouTube, Discord, and Minecraft IDs are private by default.
Public display requires an explicit allowed flag.
Identity link does not imply relationship growth.
Identity link does not imply whitelist approval.
Identity link does not imply game access.
Identity mismatch blocks confirmation.
Private IDs are not public.
Raw tokens are not stored.
No production readiness is claimed.
priority1 remains BLOCKED.

## Supported Identity Sources

Supported candidate sources:

- `youtube_channel_safe_key`
- `discord_user_safe_key`
- `minecraft_username_candidate`
- `operator_entered_alias`
- `moderator_entered_alias`
- `fixture_identity_candidate`

Forbidden sources:

- raw OAuth token
- raw Discord export
- raw YouTube chat export
- private direct message
- payment record
- server log identity scrape
- unreviewed third-party profile dump

## Candidate Shape

`community_world_identity_link_candidate`:

- `identity_link_candidate_id`
- `world_id`
- `source_event_id`
- `primary_safe_key`
- `youtube_safe_key_optional`
- `discord_safe_key_optional`
- `minecraft_username_candidate_optional`
- `public_display_name_candidate`
- `public_display_allowed=false`
- `verification_state`
- `reviewer_role_required`
- `owner_review_required`
- `moderator_review_required`
- `mismatch_reason_code`
- `whitelist_candidate_allowed=false`
- `game_access_allowed=false`
- `memory_join_allowed=false`
- `raw_token_included=false`
- `private_id_included=false`
- `payment_basis_included=false`
- `relationship_growth_claimed=false`
- `trace_id`
- `created_at_ms`

## Verification States

- `pending_review`
- `needs_owner_review`
- `needs_moderator_review`
- `verified_candidate`
- `rejected_mismatch`
- `needs_correction`
- `public_display_suppressed`
- `expired`
- `revoked`

State rules:

- `verified_candidate` is not game access.
- `verified_candidate` is not whitelist approval.
- `verified_candidate` is not approved memory.
- `rejected_mismatch` blocks confirmation.
- `needs_correction` must preserve trace linkage.
- `expired` requires re-review.
- `revoked` prevents future use until reviewed again.

## Review Requirements

Review must confirm:

- safe key references are present
- private identifiers are not exposed
- public display name is safe
- username mismatch is not ignored
- source is allowed
- owner-only decision is not approved by AI
- payment is not used as identity proof
- relationship score is not used as identity proof

AI reviewer may classify and recommend. AI reviewer may not approve owner-only
identity decisions, submit GitHub approval review, or create owner authority.

## Public Display Policy

Public display requires `public_display_allowed=true`.

Public display must not include:

- private ID
- private Discord handle where not explicitly allowed
- private YouTube channel ID where not explicitly allowed
- raw Minecraft account metadata
- payment status
- relationship score
- moderation history

Public display may use a reviewed display alias or public-safe Minecraft name
when policy allows.

## Privacy Boundaries

Private identifiers remain role-gated.

Forbidden in ordinary output:

- raw token
- endpoint
- secret
- private ID
- payment detail
- private direct message
- raw chat export
- moderation raw evidence

Safe summaries may reference identity link status without exposing underlying
private values.

## Mismatch Handling

Mismatch cases:

- YouTube safe key conflicts with Discord safe key.
- Minecraft username candidate conflicts with prior reviewed alias.
- Public display name is impersonation-prone.
- Source event cannot support the claimed link.
- Candidate was derived from forbidden source.

Mismatch response:

- set `verification_state=rejected_mismatch` or `needs_correction`
- preserve safe `trace_id`
- do not publish display name
- do not join memory records
- do not whitelist
- do not grant game access

## Whitelist Relationship

Identity link does not imply whitelist approval.

Whitelist approval, if ever implemented, must be a separate future policy with
separate owner or operator review. This specification does not create whitelist
runtime behavior, server access, or Minecraft plugin integration.

## Moderation Relationship

Identity link may help route moderation candidates after review.

Identity link must not expose private IDs in moderation recap. Moderation action
requires separate moderator or owner approval. AI may recommend review but
cannot execute moderation consequence.

## Negative Examples

Reject examples:

- candidate contains raw OAuth token
- candidate contains private Discord ID in public field
- candidate contains raw YouTube channel ID in public field
- candidate treats payment as identity proof
- candidate treats relationship score as identity proof
- candidate confirms mismatched Minecraft username
- candidate grants whitelist approval
- candidate grants game access
- candidate commits memory directly
- candidate exposes moderation raw evidence
- candidate claims production readiness
- candidate resolves priority1
- AI reviewer approves owner-only identity link

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
- No whitelist implementation.
- No production readiness.
- No production go.

## Acceptance Criteria

- Spec exists.
- Identity link remains candidate until reviewed.
- YouTube, Discord, and Minecraft identity sources are defined.
- Candidate shape is defined.
- Verification states are defined.
- Public display policy is defined.
- Privacy boundaries are defined.
- Mismatch handling is defined.
- Whitelist and moderation relationships are bounded.
- Negative examples are listed.
- No runtime code added.
- No Minecraft plugin added.
- No dataset audit runner added.
- priority1 remains BLOCKED.

## Future Work

- Identity link JSON fixture catalog.
- Identity link validator spec.
- Operator review UI spec for identity candidates.
- Moderator review handling for identity-linked moderation candidates.
- Whitelist candidate policy spec.
- Only later optional runtime adapter after safety gates.
