# Camera Proximity

Camera proximity is the current implementation of the 2026-04-30-03 addendum.

It creates read-only Live2D / overlay guidance for IRIS moving closer to the viewer:

```text
schema: iris_camera_proximity_v1
internal_profile: true
camera_proximity_profile
proximity_level
framing_plan
visibility_result
comfort_guard_result
recovery_plan
```

## Profiles

```text
camera_neutral
camera_approach_micro
camera_approach_close
camera_face_near
camera_face_extreme_closeup
camera_return_neutral
```

`camera_face_extreme_closeup` is bounded to a short duration and always requires recovery.

## Boundary

Camera proximity is not an OS camera command, OBS command, game input, memory write, or relationship update.

It is attached only to the Live2D adapter packet as validated visual guidance. It must not contain command, commit, candidate, score, or canonical Core fields.

Viewer comfort mode downgrades face-near and extreme closeups. Serious focus, unsafe status, and game visibility constraints suppress strong proximity.
