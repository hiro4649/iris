# Donation Reaction

Donation reaction is the current implementation of the 2026-04-30-02 donation addendum.

`normalizeYouTubeDonation` converts support events into:

```text
payload_kind: donation_event
source: youtube_donation
amount_tier
amount_source_kind
currency
support_event_type
message_text
```

Runtime then creates:

```text
schema: iris_donation_reaction_v1
internal_profile: true
reaction_style
speech_text_hint
expression_profile_hint
motion_profile_hint
reaction_variant_plan
gratitude_memory_candidate
safety_boundary
```

`reaction_variant_plan` chooses a short gratitude shape from message signal, relationship summary,
support event type, and stream context. `amount_source_kind` is intentionally coarse (`micros`,
`formatted`, `tier`, `membership_count`, `unknown`) and exists only to confirm which support-event
amount shape was recognized. The reaction plan can distinguish playful support, quiet support,
encouragement, returning viewer warmth, high support, Super Sticker visual support,
membership support, membership gifts, and
`superThanksEvent` replay/archive support, but it keeps `amount_handling_policy:
tier_only_no_ranking_no_exclusive_treatment`.
For Super Thanks, `support_event_type` is carried into the variant plan and can produce
`replay_support_thanks` with a replay-gratitude response mix. This is still only expression and
memory/relationship intent; it is not a side-effect authority.
For `newSponsorEvent` and `memberMilestoneChatEvent`, IRIS uses `membership_support_thanks`.
For `membershipGiftingEvent` and `giftMembershipReceivedEvent`, IRIS uses `community_gift_thanks`.
For `superStickerEvent`, IRIS uses `sticker_playful_thanks`.
These styles thank the support while returning attention to the whole room.

## Boundary

The gratitude memory is only a candidate:

```text
candidate_kind: donation_appreciation_memory_candidate
requires_validation: true
```

It is summarized in the candidate review queue and is never passed to memory persistence or relationship persistence directly.

Donation support can also inform Phase20 relationship deepening through a validation-gated
`relationship_update_candidate` with `source_context_kind: donation_event` and evidence such as
`support_event`. The amount tier does not create viewer ranking or exclusive treatment; the
relationship signal is the shared support/gratitude moment, and persistence still requires the
approved relationship schema.
`superThanksEvent` gets its own relation reason,
`super_thanks_gratitude_without_amount_ranking`, so later analysis can tell why the relationship
candidate was warmed without exposing amounts or creating a ranking.
Membership support and membership gifts also get separate relation reasons so candidate review can
understand the source of warmth without comparing amounts or ranking viewers.
Super Stickers also get a separate relation reason for playful visual gratitude without ranking
viewers or exposing amounts.

Donation amount alone must not create relationship depth, viewer ranking, exclusive claims, or adapter commands.
