# Idle Presence

Idle presence is the silent motion path for making IRIS feel alive between comments.

The local server accepts:

```text
POST /idle-tick
POST /idle/start
POST /idle/stop
GET  /idle/status
```

It creates:

```text
source: presence_idle
payload_kind: presence_idle
```

The Core path treats this as `ignore`, which becomes a `NOOP` action. Runtime still creates safe adapter output:

```text
speech_cue: silent / zero-duration speech data
motion_cue: idle_breath
performance_plan: idle breathing timeline
```

## Boundary

Idle ticks must not contain:

```text
world_command
input_action
input_action_candidate
execute
commit
write
apply
```

Idle presence is only for breathing, blinking, gaze, and idle motion. It is not autonomous game control.

## Scheduler

The development server can start an optional scheduler:

```text
IRIS_ENABLE_IDLE_SCHEDULER=true
IRIS_IDLE_INTERVAL_MS=8000
```

The scheduler calls the same `/idle-tick` path internally and updates the stream state after each tick. It does not bypass Phase01-15, and it cannot emit speech, memory writes, game input, or world commands.
Invalid interval values fall back to 8000ms and are clamped to 1000..3600000ms so a malformed env
value cannot create an immediate idle loop.
