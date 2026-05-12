# Stream Lifecycle

Stream lifecycle is the current Phase26 MVP export.

It creates a bounded stream/session continuity profile:

```text
schema: iris_stream_lifecycle_v1
internal_profile: true
stream_lifecycle_state
post_stream_summary
memory_carryover_candidates
community_memory_candidates
next_stream_seed
reflection_safety_result
adapter_validation_required
```

## Session State

```text
pre_stream
opening
active
winding_down
post_stream
archived
```

The runtime currently derives `active` by default, can read phase hints from development text, and can transition idle after `winding_down` into `post_stream`.

## Candidate Boundary

Phase26 may propose:

```text
memory_carryover_candidate
community_memory_candidate
```

Both require validation and must not contain direct write or commit authority.

They are not `approved_memory_record`, not `approved_relationship_record`, and not written by Phase26. Future persistence must still pass through the approved writer boundary.

For game observations, carryover summaries include bounded gameplay context:

```text
game title
game embodiment state
scene summary
player state
detected event labels
```

They never include raw screenshots, pixels, OCR transcripts, game input candidates, approved game
actions, or direct memory writes. When candidate persistence is enabled, these summaries can become
`game_experience` memory records only after validator approval.

## Public State And Replay

Runtime returns the full internal export to server-side code and tests. Public stream state and replay logs expose only:

```text
memory_carryover_candidate_count
community_memory_candidate_count
next_stream_seed
reflection_safety_result
```

Raw carryover/community candidates are not exposed through `/state` or replay JSONL.

## Safety

`reflection_safety_result` keeps next-stream continuity from turning into private memory leakage or inside-joke exclusion.

Private-signal detection uses the shared `privacyGuards` helpers, matching Phase21 memory recall and candidate review summary redaction.

The export rejects command, commit, canonical Core, and relationship score fields at any depth.
