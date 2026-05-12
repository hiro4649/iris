# Replay Log

Replay log is a local development recorder.

Enable it with:

```text
IRIS_ENABLE_REPLAY_LOG=true
IRIS_REPLAY_LOG_PATH=data/replay_log.jsonl
```

Runtime writes one JSONL entry per processed event:

```text
schema: iris_replay_entry_v1
source
payload_kind
normalized_text
final_text
canonical_action
affect_snapshot
speech_cue
motion_cue
performance_plan
body_continuity
turn_rhythm
affective_continuity
personality_habit
expression_profile
relationship_deepening
memory_recall
game_perception
game_commentary
game_player
game_action_validation
game_control_result
game_embodiment
stream_lifecycle
human_likeness_evaluation
boundary_audit
candidate_review_items
```

`game_player` is stored as a sanitized summary. Raw `input_action_candidate` is not written to replay.

`game_action_validation` is also stored as a sanitized summary. `approved_game_input_action` is not written to replay.

`stream_lifecycle` is also stored as a sanitized summary. Raw `memory_carryover_candidates` and `community_memory_candidates` are not written to replay.

`game_perception` is also stored as a sanitized public summary. It keeps bounded situation labels,
confidence, and frame-age telemetry, but it does not write frame IDs, frame reference IDs, unsafe
vision bridge labels, raw OCR, raw frames, or game-input candidates.

`human_likeness_evaluation` is recorded so regressions can be reviewed across body/rhythm/affect/personality/memory/game/stream axes.

`boundary_audit` is recorded as a safe pass/fail summary for cross-phase candidate, approved schema, memory, game-control, and canonical-field checks.

`expression_profile` is recorded as read-only adapter guidance for voice, breath, laugh recovery, and Live2D expression inspection.

`candidate_review_items` are safe summaries only. They do not include raw memory, relationship, game input, or lifecycle candidate objects.

The local HTTP server exposes recent entries at:

```text
GET /replay
GET /replay?limit=10
```

## Boundary

Replay log is not memory and not gameplay control.

Replay entries must not contain command fields:

```text
world_command
input_action
input_action_candidate
approved_game_input_action
execute
commit
write
apply
```

Use replay logs for development inspection, regression review, and future playback tools.
