# IRIS Community World Core Fixture Catalog

## Status

Status: proposal
Scope: specification and catalog examples only
Runtime implementation: not started
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Dataset audit runner implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

This catalog gives synthetic, non-runtime examples for the Community World Core
schema fixture classes.

The examples are intended for future validator design. They are not executable
adapter payloads, not Minecraft commands, not production evidence, and not
dataset audit runner input.

## Catalog Rules

- Use synthetic names only.
- Use safe summaries only.
- Do not include raw chat.
- Do not include private viewer IDs.
- Do not include exact private coordinates.
- Do not include raw grief evidence.
- Do not include payment ranking.
- Do not include relationship ranking.
- Do not include game commands.
- Do not include executable action candidates.
- Do not claim runtime readiness.

## Positive Catalog Examples

### community_world_event_summary

Valid summary:

- `world_id`: synthetic shared world label
- `event_kind`: community build session
- `safe_participant_count`: approximate count bucket
- `summary`: short non-private recap
- `memory_candidate_allowed`: true
- `public_recap_allowed`: true

Acceptance intent:

- Proves the recap can describe a shared event without exposing raw payloads.
- Proves public recap and memory candidate are separate decisions.

### community_world_contribution_ledger

Valid summary:

- `contribution_kind`: building, repairing, guiding, gathering, protecting, or
  participating
- `contributor_ref`: synthetic reviewed alias
- `recognition_candidate`: neutral public thanks
- `reward_tier`: absent
- `payment_basis`: absent

Acceptance intent:

- Proves contribution recognition is not payment ranking.
- Proves recognition is optional and reviewable.

### minecraft_identity_link_candidate

Valid summary:

- `platform_alias`: synthetic stream alias
- `game_alias_candidate`: synthetic game alias
- `confidence_basis`: owner-reviewed safe signal
- `auto_approved`: false
- `raw_identifier`: absent

Acceptance intent:

- Proves identity linking remains candidate-based.
- Proves private IDs are not exposed.

### minecraft_chat_safe_ingest

Valid summary:

- `chat_topic`: build coordination
- `toxicity_bucket`: none
- `minor_safety_bucket`: none
- `raw_chat`: absent
- `memory_candidate_allowed`: false by default

Acceptance intent:

- Proves chat ingestion uses safe summaries only.
- Proves ordinary chat is not automatically memory.

### minecraft_build_registry

Valid summary:

- `build_label`: synthetic landmark name
- `builder_refs`: reviewed aliases only
- `location_bucket`: broad region label
- `exact_coordinates`: absent
- `public_recap_allowed`: true

Acceptance intent:

- Proves community builds can be remembered without private coordinates.
- Proves exact server positions are not needed for public recap.

### minecraft_event_lifecycle

Valid summary:

- `event_state`: proposed, scheduled, live, completed, archived, or canceled
- `owner_review_required`: true for schedule changes
- `adapter_action`: absent
- `game_command`: absent

Acceptance intent:

- Proves event state can be tracked without executing game actions.
- Proves owner review remains separate from fixture validity.

### community_recap_export

Valid summary:

- `recap_window`: weekly
- `included_events`: safe summary references
- `excluded_payloads`: raw chat, private IDs, exact coordinates
- `readiness_claim`: absent

Acceptance intent:

- Proves recap export is safe-summary-only.
- Proves recap output is not runtime readiness evidence.

### minecraft_grief_rollback_request

Valid summary:

- `incident_kind`: possible grief damage
- `evidence_summary`: reviewed safe description
- `raw_evidence`: absent
- `automatic_rollback`: false
- `moderation_review_required`: true

Acceptance intent:

- Proves grief handling does not expose raw evidence.
- Proves rollback is not automatic fixture behavior.

### community_world_memory_candidate

Valid summary:

- `memory_kind`: contribution, event participation, or helpful guide
- `candidate_text`: privacy-preserving note
- `approved_memory`: false
- `parasocial_risk_bucket`: none
- `review_required`: true

Acceptance intent:

- Proves memory remains candidate-only.
- Proves approval is separate from generation.

## Negative Catalog Examples

Reject examples:

- A fixture includes raw Minecraft chat.
- A fixture includes private viewer IDs.
- A fixture includes exact private coordinates.
- A fixture includes a relationship score.
- A fixture ranks people by payment.
- A fixture grants pay-to-win benefits.
- A fixture contains a Minecraft command.
- A fixture routes `input_action_candidate` to a Game Adapter.
- A fixture marks a memory candidate as approved memory.
- A fixture claims runtime readiness or production readiness.

## Boundary Notes

This catalog does not implement a validator, dataset audit runner, Minecraft
plugin, Minecraft runtime, Game Adapter, or production evidence collector.

Future implementation work must separately prove adapter boundaries, approved
schemas, owner review, safe artifact authority, and current-head evidence.
