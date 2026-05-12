# Candidate Review Queue

Candidate review queue is a local development safety surface.

It records safe summaries of validation-gated candidates after each runtime event:

```text
schema: iris_candidate_review_item_v1
review_id
source_phase
item_kind
source_candidate_kind
status
public_summary
risk_tags
review_route
boundary_policy
```

## Item Kinds

```text
memory_candidate_review
relationship_candidate_review
self_improvement_review
relationship_update_review
game_laughter_review
game_input_review
game_action_validation_review
donation_appreciation_review
media_watch_memory_review
memory_carryover_review
community_memory_review
```

These are review summaries, not the original candidates.

## Boundary

Review items must not expose raw candidate objects or side-effect fields:

```text
input_action_candidate
relationship_update_candidate
memory_carryover_candidates
community_memory_candidates
memory_candidate
relationship_candidate
phase12_improvement_candidate
execute
commit
write
apply
approved_game_input_action
approved_memory_record
approved_relationship_record
```

Every review item must keep:

```text
raw_candidate_exposed: false
not_execution: true
not_commit: true
validator_required_before_side_effect: true
```

## Local Endpoints

```text
GET  /candidate-reviews
GET  /candidate-reviews?limit=10
POST /candidate-reviews/clear
```

The endpoint is for local inspection. It does not approve memory, update relationships, or execute game input. Durable approval is handled separately by the candidate validator.

Public summaries pass through the shared `privacyGuards` redactor before entering the queue.

## Runtime Role

The queue gives developers a place to inspect what IRIS wanted to remember, express, prepare, or validate without letting those candidates bypass Phase05/20/23/24/26 boundaries. The queue is observation; validators are the only paths from runtime candidates to `approved_*` records or approved game actions.
