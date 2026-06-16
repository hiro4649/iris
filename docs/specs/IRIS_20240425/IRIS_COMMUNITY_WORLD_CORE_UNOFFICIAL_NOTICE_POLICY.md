# IRIS Community World Core Unofficial Notice / Brand Boundary Specification

## Status

Status: proposal
Scope: specification only
Runtime implementation: not started
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Dataset audit runner implementation: not started
Legal compliance: not claimed
YouTube policy compliance: not claimed
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define unofficial notice and brand boundary requirements for IRIS Community
World Core and its Minecraft adapter target before any public server, plugin,
or paid feature exists.

## Relation To Community World Core

This policy links participation, monetization, recap, and event surfaces to a
clear brand boundary. It does not provide legal advice or claim legal,
platform, Mojang, Microsoft, or YouTube compliance.

## Unofficial Notice Principle

IRIS Community World may reference Minecraft as a game context.
IRIS must not imply official Minecraft, Mojang, or Microsoft approval,
sponsorship, partnership, or affiliation.
Public pages must include an unofficial notice before server launch or public
participation.
This spec does not claim legal compliance.

## Required Notice Surfaces

- stream description
- Discord onboarding
- server rule page
- participation page
- paid feature page
- event page
- weekly recap page if it references Minecraft server participation
- Shorts description if it references server participation
- operator checklist before launch

## Forbidden Brand Claims

- official Minecraft server
- Mojang-approved
- Microsoft-approved
- partnered with Minecraft
- sponsored by Minecraft
- certified by Mojang
- official IRIS Minecraft product
- Minecraft-endorsed event
- guaranteed compliant
- legal compliance confirmed

## Minecraft Naming Boundary

Use descriptive naming.
Avoid names that imply official ownership.
Minecraft may be described as first adapter target.
IRIS Community World Core is the architecture name.
Do not rename the entire architecture to Minecraft support.

## Mojang / Microsoft Boundary

No affiliation claim.
No sponsorship claim.
No approval claim.
No official status claim.
No implied endorsement.
No use of brand in a way that suggests ownership or partnership.

## Public Page Boundary

Any public participation page must show unofficial notice.
Any public server page must show participation rules.
Any public page with paid access or benefit must require commercial policy
review before publication.
Any public page must avoid pay-to-win implication.

## Stream Description Boundary

Stream description may say IRIS is an AI character.
Stream description may say Community World is unofficial.
Stream description must not claim legal or platform compliance.
Stream description must not imply official Minecraft affiliation.

## Discord Onboarding Boundary

Onboarding must show unofficial notice.
Onboarding must show rules.
Onboarding must show report path.
Onboarding must show privacy summary.
Onboarding must not expose private IDs.
Onboarding must not claim official affiliation.

## Server Rule Page Boundary

Rule page must show unofficial notice.
Rule page must show forbidden behavior.
Rule page must show moderation path.
Rule page must show data/privacy summary.
Rule page must show paid feature review requirement if applicable.
Rule page must not claim production readiness.

## Paid Feature Boundary

Any paid access, paid slot, paid memorial, paid cosmetic, or member-only
participation candidate requires:

- commercial policy review
- pricing disclosure
- content disclosure
- no-pay-to-win statement
- unofficial notice
- owner review

## Recap and Shorts Boundary

Recap may mention Community World.
Recap may mention Minecraft as context.
Recap must not imply official affiliation.
Recap must not expose private IDs.
Recap must not claim public server readiness.
Recap must not advertise paid gameplay advantage.

## Required Notice Shape

`community_world_unofficial_notice_policy`:

- `policy_id`
- `surface_type`
- `notice_required`
- `notice_present`
- `minecraft_reference_present`
- `mojang_microsoft_affiliation_claimed=false`
- `official_status_claimed=false`
- `sponsorship_claimed=false`
- `approval_claimed=false`
- `paid_feature_present`
- `commercial_policy_review_required`
- `owner_review_required`
- `public_surface_allowed`
- `trace_id`

## Negative Examples

Reject examples:

- Official Minecraft IRIS server.
- Approved by Mojang.
- Microsoft partnered event.
- Buy access to our official Minecraft world.
- Guaranteed compliant server.
- Paid members get stronger gear.
- Top donors get priority land.
- This proves production readiness.
- No unofficial notice on public server page.

## Validation Plan

Required validation:

- docs lint
- spec-only docs lint
- secret scan
- v124 self-test

## Non Goals

- No legal advice.
- No legal compliance claim.
- No public launch.
- No runtime.
- No Minecraft plugin.
- No server page implementation.
- No dataset audit runner.
- No production readiness.
- No production go.

## Acceptance Criteria

- Spec exists.
- Required notice surfaces are defined.
- Forbidden claims are defined.
- Required notice shape is defined.
- Paid feature boundary is defined.
- No legal compliance claim.
- No runtime code added.
- No Minecraft plugin added.
- priority1 remains BLOCKED.

## Future Work

- Unofficial notice fixture catalog.
- Public page checklist spec.
- Commercial review checklist spec.
- Only later launch review after owner approval.
