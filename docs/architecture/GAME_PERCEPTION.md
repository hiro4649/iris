# Game Perception

Game perception is the current Phase22 MVP export.

It turns read-only game observations into a bounded situation summary:

```text
schema: iris_game_perception_v1
internal_profile: true
game_observation_id
game_situation_summary
danger_level
opportunity_score
funny_event_score
commentary_trigger
control_hint
perception_confidence
perception_reject_reason
```

## Boundary

Game perception is observation only. It must not create game input, OS commands, or canonical Core fields.

Forbidden fields include:

```text
world_command
input_action
input_action_candidate
execute
commit
write
apply
action_type
intent
task_type
```

`control_hint` is a descriptive hint for later planning. It is not an input action candidate and is never passed to a game adapter.

Public stream state and replay logs use a sanitized game-perception summary. Vision bridge labels
such as `source_kind` are reduced to safe local labels, while unsafe values containing endpoints,
tokens, candidate markers, commit/write markers, or command markers fall back to
`vision_source_omitted`. Frame IDs and frame reference IDs are never exposed in public state or
replay; only availability booleans and bounded `frame_age_ms` telemetry may remain.

## Confidence

If `perception_confidence` is low, the export avoids strong claims:

```text
danger_level: unknown
commentary_trigger: focus
perception_reject_reason: low_confidence
```

This keeps IRIS from pretending uncertain screen observations are confirmed facts.
