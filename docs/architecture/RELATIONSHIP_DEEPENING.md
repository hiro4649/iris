# Relationship Deepening

Relationship deepening is the current Phase20 MVP export.

It creates a relationship update candidate for a known viewer, but it does not write to memory or the relationship store:

```text
schema: iris_relationship_deepening_v1
internal_profile: true
user_id
relationship_update_candidate
proposed_relation_score_delta
familiarity_level
shared_memory_links
distance_balance_result
relationship_reject_reason
```

## Boundary

`relationship_update_candidate` must keep:

```text
requires_validation: true
candidate_kind: relationship_update_candidate
```

It must not contain:

```text
execute
commit
write
apply
world_command
memory_write
direct_memory_write
commit_memory
```

Phase20 never calls the persistence writer. The existing Phase05 -> Phase15 -> `approved_relationship_record` path remains the only local write path.

## Public State

Runtime returns the full internal export to server-side code and tests. Public stream state is sanitized:

```text
familiarity_level
candidate_status
evidence_tags
shared_memory_link_count
distance_balance_result
relationship_reject_reason
```

It does not expose `proposed_relation_score_delta` or the raw `relationship_update_candidate`.

## Distance Balance

The MVP keeps relation depth useful but quiet:

```text
community_openness: preserved
private_detail_policy: do_not_surface_sensitive_details
exclusivity_guard: no_special_treatment_claims
```

This keeps IRIS warm toward returning viewers without ranking fans, showing hidden scores, or creating exclusive relationships.

Relationship updates may be positive or negative within the bounded range:

```text
-0.1 <= proposed_relation_score_delta <= 0.1
```

Negative candidates are used for boundary-needed interactions, not punishment. They let IRIS cool
the affinity signal while preserving community openness and keeping familiarity/history available
for safer future interactions.

## Donation Support

Donation events from known viewers can add a small support-event boost to the validation-gated
relationship update candidate:

```text
source_context_kind: donation_event
evidence_tags includes support_event
```

This is not a direct write and not an amount ranking. The boost represents a shared gratitude moment,
keeps the same `requires_validation: true` boundary, and still needs approval before any relationship
store update.
