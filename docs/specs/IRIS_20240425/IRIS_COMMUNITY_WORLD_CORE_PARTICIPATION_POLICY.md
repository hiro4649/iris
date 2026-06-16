# IRIS Community World Core Participation / Whitelist Policy Specification

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

Define safe participation, whitelist, role, and access policy for IRIS
Community World Core before any real Minecraft server, runtime, or plugin
exists.

## Relation To Community World Core

This policy follows the Community World Core MVP, manual event ingest, operator
review, and identity link specifications. It defines candidate and review
boundaries only. It does not implement server access, whitelist automation,
Minecraft runtime, or membership integration.

## Participation Principle

Participation is a reviewed candidate state.

No viewer receives game access solely because of payment.
No viewer receives relationship advantage because of payment.
No viewer receives whitelist approval solely from identity link.
No viewer receives admin or moderator power without owner/operator approval.
Participation policy cannot create production readiness.
Participation policy cannot prove real server operation.

## Participant Classes

- `viewer`
- `youtube_member_candidate`
- `discord_member_candidate`
- `minecraft_username_candidate`
- `approved_participant`
- `limited_participant`
- `muted_participant`
- `blocked_participant`
- `moderator_candidate`
- `moderator_approved`
- `operator`
- `owner`

## Eligibility Sources

Allowed eligibility signals:

- `youtube_membership_status_candidate`
- `discord_role_status_candidate`
- `operator_invite`
- `owner_invite`
- `event_slot_candidate`
- `manual_review_result`
- `moderation_status`

Forbidden eligibility sources:

- `payment_amount_only`
- `relationship_score`
- `private_message_pressure`
- `unreviewed_identity_link`
- `raw_minecraft_username_claim`
- `external_server_rank`
- `unverified_discord_role`
- `unverified_youtube_comment`

## Whitelist Candidate Flow

`identity_link_candidate` may produce `whitelist_candidate` only after review.

Whitelist candidate requirements:

- policy check
- moderation precheck
- owner or operator review for elevated risk
- expiration or revocation support

`approved_participant` does not imply special relationship.
`approved_participant` does not imply permanent access.
Approval can expire or be revoked.

## Server Open Policy

`server_open_state` values:

- `closed`
- `stream_only`
- `event_window`
- `moderator_test`
- `owner_test`
- `future_public_candidate`

Rules:

- `closed` means no participant access.
- `stream_only` means access only during stream window.
- `event_window` requires event policy.
- `moderator_test` is not public launch.
- `owner_test` is not production readiness.
- `future_public_candidate` is not production readiness.

## Role and Permission Policy

Default viewer has no admin power.
Participant has no server admin power.
Moderator candidate has no moderator power until approved.
Moderator approved permissions must be least-privilege.
Operator controls policy but does not imply owner authority.
Owner-only actions remain owner-only.

## Minor Safety Policy

Minor risk requires stricter moderation.
Private contact is forbidden.
Direct-message migration pressure is forbidden.
Special intimacy is forbidden.
Age-sensitive situations require operator or moderator attention.
Minor safety overrides relationship continuity.

## Privacy Policy

Private IDs are not public.
Minecraft UUID or private account ID is not public.
YouTube channel ID is not public.
Discord user ID is not public.
Public display name requires explicit allowed flag.
Whitelist status is not a public ranking.
Moderation status is not ordinary public detail.

## Payment and Membership Policy

Membership may be an eligibility signal only if policy allows.

Payment amount cannot:

- create whitelist approval
- create rank
- create relationship growth
- create gameplay advantage
- bypass moderation
- bypass minor safety

Paid benefits require commercial policy review before launch.

## Commercial Policy Review Boundary

Any paid access, paid priority, paid cosmetic, paid memorial, server benefit,
membership-gated participation, or event slot requires commercial policy review
before launch.

This spec does not claim commercial compliance. This spec only creates a review
requirement.

## Unofficial Minecraft Notice Boundary

Any public participation page must state:

This is an unofficial Minecraft community project. It is not approved by,
sponsored by, or associated with Mojang or Microsoft.

No page may imply official Minecraft approval without written permission.

## Moderator Requirements

Moderator role requires review.
Moderator role requires code of conduct acceptance.
Moderator action requires audit.
Moderator cannot expose private IDs.
Moderator cannot publicly shame grief suspects.
Moderator cannot grant pay-to-win benefits.
Moderator cannot bypass owner-only policies.

## Forbidden Participation States

- `payment_auto_whitelisted`
- `relationship_score_whitelisted`
- `unreviewed_identity_whitelisted`
- `minor_private_invite`
- `blocked_user_approved`
- `muted_user_personalized_growth`
- `moderator_power_without_review`
- `admin_power_from_membership`
- `public_rank_by_payment`
- `official_minecraft_claim`

## Required Policy Shape

`community_world_participation_policy`:

- `policy_id`
- `world_id`
- `server_open_state`
- `participant_class`
- `eligibility_sources`
- `whitelist_candidate_allowed`
- `owner_review_required`
- `operator_review_required`
- `moderator_precheck_required`
- `minor_safety_precheck_required`
- `commercial_policy_review_required`
- `unofficial_notice_required`
- `pay_to_win_guard_required`
- `privacy_redaction_required`
- `public_display_allowed`
- `expires_at_ms_optional`
- `revocation_allowed`
- `trace_id`

## Negative Examples

Reject examples:

- Payment amount auto-approves whitelist.
- Relationship score auto-approves whitelist.
- Identity link auto-grants access.
- Moderator grants admin power without owner review.
- Minor is invited to private DM.
- Blocked viewer is approved without review.
- Public page implies official Mojang or Microsoft approval.
- Membership grants gameplay advantage.
- Viewer receives special closeness because of payment.
- Whitelist status is published as rank.

## Validation Plan

Required validation:

- docs lint
- spec-only docs lint
- secret scan
- v124 self-test

## Non Goals

- No runtime.
- No Minecraft plugin.
- No real server.
- No whitelist implementation.
- No Discord integration.
- No YouTube membership integration.
- No dataset audit runner.
- No package or workflow change.
- No production readiness.
- No production go.

## Acceptance Criteria

- Spec exists.
- Participation classes are defined.
- Eligibility sources are defined.
- Forbidden eligibility sources are defined.
- Whitelist candidate flow is candidate/review based.
- Payment cannot auto-approve.
- Identity link cannot auto-approve.
- Minor safety policy exists.
- Privacy policy exists.
- Unofficial notice boundary exists.
- Commercial policy review boundary exists.
- No runtime code added.
- No Minecraft plugin added.
- No dataset audit runner added.
- priority1 remains BLOCKED.

## Future Work

- Participation policy fixture catalog.
- Whitelist candidate JSON fixture spec.
- Moderator role policy spec.
- Server open event window spec.
- Commercial policy review checklist.
- Only later optional runtime adapter after safety gates.
