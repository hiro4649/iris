# IRIS Community World Core Public Recognition / Recap Specification

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

Define safe public recognition and recap policy for Community World
contributions before any runtime publishing path exists.

## Relation To Community World Core

This specification follows the Community World Core MVP, fixture catalog,
manual ingest, operator review, identity link, participation, and moderation
specifications. It defines public-surface candidate rules only and does not
implement publishing automation, YouTube metadata changes, Minecraft runtime,
or public recognition execution.

## Recognition Principle

Recognition is non-ranking.
Recognition is non-exclusive.
Recognition is contribution-based.
Recognition is reviewable.
Recognition does not imply special relationship.
Recognition does not imply payment rank.
Recognition must remain newcomer-friendly.

## Recap Principle

Recap is safe highlights only.

Forbidden recap content:

- raw chat
- private IDs
- raw moderation evidence
- exact private coordinates
- payment ranking
- relationship ranking
- production readiness claim

## Recognition Candidate Shape

`community_world_public_recognition_candidate`:

- `candidate_id`
- `world_id`
- `session_id`
- `viewer_safe_keys`
- `public_display_names_optional`
- `contribution_refs`
- `safe_title`
- `safe_summary`
- `recognition_type`
- `non_ranking_confirmed`
- `payment_derived=false`
- `relationship_rank_included=false`
- `private_id_included=false`
- `moderation_precheck_status`
- `owner_or_operator_review_required`
- `public_surface_allowed`
- `trace_id`

## Weekly Resident Record Shape

`community_world_weekly_resident_record`:

- `record_id`
- `world_id`
- `week_bucket`
- `safe_highlights`
- `build_highlights`
- `event_highlights`
- `newcomer_friendly_summary`
- `participant_mentions_safe`
- `private_data_excluded=true`
- `raw_chat_excluded=true`
- `moderation_detail_excluded=true`
- `payment_ranking_excluded=true`
- `owner_review_required`
- `trace_id`

## Shorts Recap Candidate Shape

`community_world_shorts_recap_candidate`:

- `candidate_id`
- `source_record_id`
- `safe_hook`
- `safe_highlights`
- `allowed_mentions`
- `forbidden_mentions`
- `privacy_precheck_status`
- `moderation_precheck_status`
- `copyright_precheck_status`
- `owner_review_required`
- `public_surface_allowed=false`
- `trace_id`

## Allowed Recognition

- Initial member memorial if non-ranking.
- Weekly build highlight.
- Community effort thanks.
- Newcomer support thanks.
- Repair or protection thanks.
- Event participation thanks.
- Collaborative area unlock celebration.

## Forbidden Recognition

- payment ranking
- relationship ranking
- exclusive friendship
- romantic escalation
- public shame
- grief accusation
- minor-targeted intimacy
- private ID exposure
- playtime ranking
- money ranking
- closeness ranking
- official Minecraft affiliation claim

## Newcomer Friendliness

Recap must be understandable to new viewers.
Do not rely only on inside jokes.
Do not imply newcomers are outsiders.
Community memory should include short context.
Regulars can be acknowledged without excluding newcomers.

## Privacy Boundaries

Forbidden public recognition or recap content:

- private IDs
- raw chat
- exact private coordinates
- private DMs
- moderation raw notes
- raw grief evidence
- payment details
- sensitive personal data

## Monetization Boundaries

Payment cannot create recognition priority.
Payment cannot create rank.
Payment cannot create relationship growth.
Payment cannot create exclusive recap mention.
Member status may be mentioned only if public-safe and policy allows.
No pay-to-win.
No pay-to-rank.
No pay-to-friendship.

## Moderation Boundaries

Muted, blocked, or limited viewers are not used for personalized recognition.
Grief suspects are not publicly named.
Moderation public statement requires owner or moderator approved policy.
Recap cannot publish unresolved allegations.

## Review Requirements

Public recognition requires review.
Weekly resident record requires review before public export.
Shorts recap candidate requires owner or operator review before publishing.
AI reviewer may recommend but cannot publish.
No direct YouTube metadata change.
No direct Shorts publishing.

## Negative Examples

Reject examples:

- top donor gets biggest monument
- closest friend list
- viewer ranked by relationship score
- viewer ranked by money
- public grief accusation
- raw chat quoted
- private ID exposed
- minor singled out for special closeness
- Mojang or Microsoft official approval implied
- production readiness claimed

## Validation Plan

Required validation:

- docs lint
- spec-only docs lint
- secret scan
- v124 self-test

## Non Goals

- No runtime.
- No publishing automation.
- No YouTube metadata change.
- No Minecraft plugin.
- No dataset audit runner.
- No production readiness.
- No production go.

## Acceptance Criteria

- Spec exists.
- Recognition candidate shape exists.
- Weekly resident record shape exists.
- Shorts recap candidate shape exists.
- Allowed and forbidden recognition are defined.
- Newcomer friendliness is defined.
- Privacy, monetization, and moderation boundaries are defined.
- No runtime code added.
- No Minecraft plugin added.
- priority1 remains BLOCKED.

## Future Work

- Recap fixture catalog.
- Recognition validator spec.
- Operator review UI spec.
- Shorts export safe summary spec.
- Only later runtime publishing path after safety gates.
