# Performance Plan

Performance plan is the shared playback timeline for TTS, Live2D, and subtitle overlays.

It combines safe `speech_cue` and `motion_cue` data after Phase15:

```text
schema: iris_performance_plan_v1
total_duration_ms
sync_mode
tracks.speech
tracks.mouth
tracks.breath
tracks.expression
tracks.motion
tracks.subtitle
adapter_validation_required
```

## Purpose

The plan lets adapters coordinate:

```text
voice timing
mouth shapes
laugh breaths
ambient breathing
expression
gaze
body motion
gesture hints
subtitle segment timing
```

## Boundary

Performance plan is not canonical action, not game input, and not memory.

It must not contain these fields at any depth:

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

Adapters may consume it only as a validated playback plan. Future real TTS, Live2D SDK, and OBS/browser subtitle integrations should attach here instead of reading Core internals directly.
