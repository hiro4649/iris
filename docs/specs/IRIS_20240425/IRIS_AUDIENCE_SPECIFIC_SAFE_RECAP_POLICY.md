# IRIS Audience-Specific Safe Recap Policy

## Status

Status: proposal
Scope: specification only
Runtime implementation: not started
Dataset audit runner implementation: not started
Production readiness: not claimed
Legal compliance: not claimed
YouTube policy compliance: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define audience-specific recap modes that preserve privacy, safety, newcomer
friendliness, and non-ranking recognition without publishing raw chat, private
IDs, payment ranking, or relationship ranking.

## Recap Principle

Recaps are safe summaries. A recap is not raw evidence, owner approval, legal
compliance, platform compliance, production readiness, or production go.

## Recap Shape

`iris_audience_safe_recap`:

- `recap_id`
- `audience_mode`
- `safe_summary`
- `included_safe_keys`
- `excluded_private_fields`
- `review_required`
- `ranking_present=false`
- `payment_rank_present=false`
- `relationship_rank_present=false`
- `raw_chat_included=false`
- `private_id_included=false`
- `trace_id`

## Audience Modes

- `viewer`
- `operator`
- `newcomer`
- `shorts`
- `guardian_style_safety`
- `moderator`
- `owner`

## Viewer Recap

Viewer recap should be warm, short, and public-safe. It may thank a group or
mention safe contribution types. It must not rank viewers or expose private
details.

## Operator Recap

Operator recap may include safe attention labels, counts, risk flags, and review
needs. It must not include raw chat, private IDs, secrets, endpoints, or raw
external module payloads.

## Newcomer Recap

Newcomer recap should explain context without insider hierarchy. It must avoid
relationship ladders, paid status, private jokes that exclude newcomers, and
hidden knowledge claims.

## Shorts Recap

Shorts recap should be public-safe and context-light. It must not include raw
chat, private IDs, exact private coordinates, unreleased assets, or payment
ranking.

## Guardian-Style Safety Recap

Guardian-style safety recap may summarize safety posture and moderation
attention using safe labels only. It must not claim legal compliance, platform
compliance, or production readiness.

## Moderator Recap

Moderator recap may include safe moderation attention labels. It must not publish
raw accusations, raw grief evidence, private IDs, or automatic punishment.

## Owner Recap

Owner recap may include blocked items and one safe next action. It must preserve
owner-only authority and cannot convert agent review into owner approval.

## Recognition Boundary

Recognition is non-ranking. Recaps may say thank you. They must not imply
closest friend, top supporter, public hierarchy, payment rank, or relationship
score.

## Monetization Boundary

Payment may be bucketed for safe gratitude review. Payment must not affect
memory, relationship, rank, server access, or recap prominence.

## Negative Examples

- Public recap includes private viewer ID.
- Donation amount creates top supporter rank.
- Newcomer recap describes insiders as closest friends.
- Moderator recap publishes raw grief evidence.
- Shorts recap claims production ready.

## Validation Plan

Future validation should check audience mode, forbidden fields, ranking flags,
review requirements, public claim boundary, and owner authority preservation.

## Non Goals

- No recap publisher implementation.
- No YouTube compliance claim.
- No legal compliance claim.
- No dataset audit runner.
- No production readiness.
- No production go.

## Acceptance Criteria

- Audience modes are defined.
- Recap shape is defined.
- Private IDs, raw chat, payment ranking, and relationship ranking are excluded.
- Owner and moderator review boundaries are explicit.
- priority1 remains BLOCKED.

## Future Work

- Audience recap fixtures.
- Recap boundary validator.
- Operator UI recap specification.
