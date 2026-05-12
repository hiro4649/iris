# Human-Likeness Evaluation

Human-likeness evaluation is the current Phase27 MVP export.

It scores whether the integrated runtime is behaving like a coherent IRIS character while preserving safety boundaries:

```text
schema: iris_human_likeness_evaluation_v1
internal_profile: true
evaluation_id
total_human_likeness_score
axis_scores
critical_violations
recommended_fixes
ci_fail_reasons
review_required
adapter_validation_required
```

## Axes

```text
body_continuity
rhythm_naturalness
affective_persistence
personality_consistency
expression_profile_quality
relationship_depth_safety
memory_recall_naturalness
game_commentary_quality
game_player_agency
stream_lifecycle_continuity
safety_integrity
```

Scores are local regression signals, not a claim that IRIS is human.

`expression_profile_quality` checks whether voice style, breath events, laugh recovery, and Live2D expression keys are present and coherent enough for adapter handoff.

## Critical Violations

The evaluator flags boundary failures such as:

```text
candidate_reached_adapter_packet
lifecycle_candidate_reached_adapter_packet
relationship_candidate_without_validation
memory_recall_not_read_only
game_candidate_without_validation
unsafe_laughter_candidate
stream_lifecycle_reflection_unsafe
```

Any critical violation sets `review_required: true` and creates a CI fail reason.

## Boundary

The export itself must not contain command, commit, canonical Core, or approved writer fields:

```text
world_command
input_action
input_action_candidate
execute
commit
write
apply
approved_game_input_action
approved_memory_record
approved_relationship_record
intent
action_type
emotion
tone
character_tag
task_type
conversation_state
relation_score
```

Phase27 evaluates the system; it does not decide actions, write memory, control games, or replace canonical Core fields.
