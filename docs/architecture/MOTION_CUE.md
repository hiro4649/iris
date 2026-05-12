# Motion Cue

Motion cue is the first MVP layer for living-looking Live2D motion.

It is not canonical action, not game input, and not memory.

## Output

Runtime converts the Phase15 continuity envelope into:

```text
schema: iris_motion_cue_v1
motion_style
expression_hint
gaze_hint
breathing_rate
blink_rate
head_motion
body_sway
gesture_hint
adapter_validation_required
```

Examples:

```text
talk
focused_talk
laugh_big
idle_breath
```

## Boundary

Motion cue must not contain:

```text
action_type
intent
world_command
input_action
input_action_candidate
execute
commit
write
apply
```

It can be consumed by a Live2D adapter only after adapter validation. This keeps beautiful motion separate from Core decisions and future game-control systems.

## Local Overlay

The local overlay reads `last_motion_cue` from `/state` and applies lightweight preview classes:

```text
big-laugh
focused-talk
soft-motion
```

These are only browser preview animations for development.
