# Game Embodiment

Game embodiment is the current Phase25 MVP export.

It maps game perception, commentary, and player planning into compact body and voice guidance:

```text
schema: iris_game_embodiment_v1
internal_profile: true
game_embodied_state
voice_affect_plan
game_breath_plan
posture_plan
gaze_focus_plan
motion_visibility_result
embodied_recovery_plan
adapter_validation_required
```

## States

```text
calm_play
focused
panic_light
celebration
mistake_freeze
horror_tension
burst_laugh_game
recovery
not_observed
```

These are Phase25 internal labels. They do not replace Phase04 `action_type`, Phase02 `emotion`/`tone`, or any future game-control schema.

## Boundary

Game embodiment is expression planning only. It must not contain:

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

The raw Phase24 `input_action_candidate` remains internal to `game_player` and is never copied into Phase25.

## Motion Visibility

The MVP always returns a `motion_visibility_result` with `status: safe`.

Large celebratory or laugh motions are bounded with:

```text
avatar_motion_scale_limit
game_screen_priority: primary
rejected_motions
```

This keeps IRIS expressive while avoiding avatar motion that hides important game information.

## Recovery

Panic, serious-focus, and burst-laugh game moments create an `embodied_recovery_plan` so IRIS can breathe, return gaze, stabilize posture, and soften voice before continuing.
