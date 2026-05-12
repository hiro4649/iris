# Affect State

Affect state is a short-term internal performance layer.

It is not canonical state, not memory, and not a command.

## Snapshot

The runtime keeps an in-memory snapshot:

```text
schema: iris_affect_snapshot_v1
energy
amusement
focus
warmth
affect_label
turns_since_rest
last_trigger
updated_at_ms
```

The snapshot may influence:

```text
performance_cue.intensity
performance_cue.affect_hint
surface wording variation
affective_continuity
```

It must not define canonical or command fields:

```text
action_type
intent
emotion
tone
character_tag
world_command
input_action
input_action_candidate
execute
commit
write
apply
```

## Boundary

Runtime creates an affect state by default.

Direct pipeline calls may pass `affectState` or a read-only `affectSnapshot`, but the pipeline rejects snapshots that contain canonical fields. This keeps Phase16+ internal personality or mood systems from becoming canonical enum sources.

Phase18 MVP then converts this snapshot into `affective_continuity`, which can carry laughter recovery and mood decay guidance to adapters without becoming memory, relationship state, or canonical emotion authority.
