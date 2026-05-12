# Body Continuity

Body continuity is the current Phase16 MVP export.

It converts safe Phase15 output plus speech, motion, and performance cues into an internal body profile:

```text
schema: iris_body_continuity_v1
internal_profile: true
body_state_id
body_motion_plan
expression_plan
breath_plan
gaze_plan
physics_plan
continuity_envelope
body_continuity_score
rejected_body_signals
```

## Profiles

Current body profiles:

```text
body_soft_talk
body_screen_focus_talk
body_idle_breathing
body_burst_laugh_recovery
body_safe_idle
```

These are internal Phase16 labels. They are not Phase00 canonical `action_type`, `emotion`, `tone`, `character_tag`, `task_type`, or `conversation_state`.

## Boundary

Body continuity must not contain:

```text
world_command
input_action
input_action_candidate
execute
commit
write
apply
intent
action_type
emotion
tone
character_tag
task_type
conversation_state
```

The Live2D adapter packet can receive `body_continuity`, but only after validation. This keeps burst laughter, screen focus, idle breathing, and recovery motion as adapter guidance rather than Core authority.
