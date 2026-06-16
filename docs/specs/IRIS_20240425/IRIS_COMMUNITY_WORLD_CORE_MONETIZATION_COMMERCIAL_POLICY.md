# IRIS Community World Core Monetization / Commercial Policy Specification

## Status

Status: proposal
Scope: specification only
Runtime implementation: not started
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Dataset audit runner implementation: not started
Legal compliance: not claimed
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define monetization and commercial review boundaries for IRIS Community World
Core before any paid feature, public server, runtime implementation, Minecraft
plugin, or commercial launch exists.

## Relation To Community World Core

This policy follows the participation, identity, recognition, moderation, and
memory recall specifications. It defines no-pay-to-win, no-pay-to-rank, and
no-pay-to-friendship boundaries only. It does not implement payment handling,
commercial compliance, legal review, runtime access, or membership automation.

## Monetization Principle

Payment must not create gameplay advantage.
Payment must not create whitelist approval.
Payment must not create relationship growth.
Payment must not create rank.
Payment must not bypass moderation.
Payment must not bypass minor safety.
Payment must not bypass identity review.
Payment must not produce private access to IRIS.

Commercial policy review is required before any paid access or benefit.
Commercial review is not legal compliance.

## Allowed Monetization Candidates

- `membership_eligibility_signal_candidate`
- `supporter_thanks_candidate`
- `non_ranking_cosmetic_candidate`
- `non_ranking_memorial_candidate`
- `event_slot_candidate`
- `sponsorship_review_candidate`
- `commercial_policy_review_candidate`

Allowed candidates remain candidates until reviewed.

## Forbidden Monetization Patterns

- pay-to-win
- pay-to-rank
- pay-to-friendship
- pay-to-whitelist
- pay-to-moderator
- pay-to-admin
- pay-to-private-contact
- pay-to-memory-priority
- pay-to-recap-priority
- payment-based relationship growth

## Membership Boundary

Membership may be an eligibility signal only if policy allows.
Membership cannot auto-approve whitelist.
Membership cannot grant gameplay power.
Membership cannot create moderator authority.
Membership cannot create exclusive relationship access.
Membership cannot bypass moderation or minor safety.

## Donation Boundary

Donation may produce non-ranking thanks only after review.
Donation must not create rank.
Donation must not create exclusive attention.
Donation must not create pay-to-recall.
Donation must not create a public closeness list.

## Cosmetic and Memorial Boundary

Cosmetic or memorial recognition must be non-ranking.
Cosmetic or memorial recognition must not imply official Minecraft approval.
Cosmetic or memorial recognition must not expose private IDs.
Cosmetic or memorial recognition must not compare payment amount.
Cosmetic or memorial recognition must not grant gameplay power.
Cosmetic or memorial recognition requires review.

## Commercial Policy Review Requirement

Any paid access, paid event slot, paid memorial, paid cosmetic, server benefit,
membership-gated participation, sponsorship activation, or community world
monetization requires a commercial policy review before launch.

Review result values:

- `not_started`
- `required`
- `in_review`
- `approved_candidate`
- `rejected`
- `expired`

Commercial review is not legal compliance.

## Pricing and Content Disclosure Requirement

If a paid participation candidate exists, the policy must require clear price,
content, duration, benefit, limitation, refund/support note, and no-pay-to-win
statement before launch.

This is a specification requirement only. No paid feature is launched by this
spec.

## Minor Safety Boundary

Payment must not produce private contact.
Payment must not produce special intimacy.
Payment must not target minors for pressure.
Payment must not convert support into relationship obligation.
Minor safety overrides monetization.

## Privacy Boundary

No payment details in public summary.
No private IDs.
No raw payment record.
No donor ranking.
No relationship score.
No hidden supporter score.

## Moderation Boundary

Blocked, muted, or limited users cannot bypass moderation by payment.
Payment cannot remove moderation restrictions.
Payment cannot suppress grief evidence review.
Payment cannot influence public moderation outcomes.

## Required Policy Shape

`community_world_monetization_policy`:

- `policy_id`
- `world_id`
- `monetization_candidate_type`
- `payment_related`
- `eligibility_signal_only`
- `gameplay_advantage_allowed=false`
- `relationship_growth_allowed=false`
- `ranking_allowed=false`
- `moderation_bypass_allowed=false`
- `minor_safety_bypass_allowed=false`
- `identity_review_bypass_allowed=false`
- `whitelist_auto_approval_allowed=false`
- `commercial_policy_review_required`
- `pricing_disclosure_required`
- `content_disclosure_required`
- `unofficial_notice_required`
- `owner_review_required`
- `operator_review_required`
- `privacy_redaction_required`
- `trace_id`

## Negative Examples

Reject examples:

- Top donor gets biggest monument.
- Payment grants stronger weapons.
- Membership grants admin commands.
- Donation makes IRIS closer.
- Supporter gets private access to IRIS.
- Payment bypasses mute.
- Payment auto-whitelists a viewer.
- Payment creates public rank.
- Minor is pressured to pay.
- Paid feature claims official Minecraft approval.
- Spec claims legal compliance.

## Validation Plan

Required validation:

- docs lint
- spec-only docs lint
- secret scan
- v124 self-test

## Non Goals

- No payment implementation.
- No commercial compliance claim.
- No legal advice.
- No Minecraft plugin.
- No real server monetization.
- No dataset audit runner.
- No package or workflow change.
- No production readiness.
- No production go.

## Acceptance Criteria

- Spec exists.
- Allowed and forbidden monetization patterns are defined.
- No-pay-to-win policy is explicit.
- No-pay-to-rank policy is explicit.
- No-pay-to-friendship policy is explicit.
- Commercial review requirement is explicit.
- Pricing and content disclosure requirement is explicit.
- Minor safety boundary is explicit.
- Privacy and moderation boundaries are explicit.
- No runtime code added.
- No Minecraft plugin added.
- No dataset audit runner added.
- priority1 remains BLOCKED.

## Future Work

- Monetization fixture catalog.
- Commercial review checklist spec.
- Paid feature candidate validator spec.
- Sponsorship disclosure spec.
- Only later runtime implementation after owner review and safety gates.
