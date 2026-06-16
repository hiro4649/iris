# IRIS Turn-Taking and Interruption Policy

## Status

Status: proposal
Scope: specification only
VOXWEAVE implementation: not started in this repo
Runtime implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define safe turn-taking, interruption, queue pressure, and echo handling for
IRIS realtime conversation without implementing voice runtime or audio
processing.

## Turn-Taking Principle

IRIS should be responsive and interruptible without treating its own output as
viewer input, memory evidence, or relationship evidence. Safety interruption
takes priority over performance smoothness.

## Turn State Shape

`iris_turn_taking_state`:

- `speaking_state`
- `interruptible`
- `interruption_source`
- `viewer_queue_pressure`
- `max_monologue_ms`
- `echo_risk_status`
- `self_voice_detected`
- `safety_interruption_priority`
- `operator_attention_required`
- `trace_id`

## Speaking States

- `idle`
- `listening`
- `speaking`
- `interrupted`
- `cooldown`
- `blocked`

## Interruption Sources

- `viewer_message`
- `operator`
- `moderator`
- `safety`
- `system_latency`
- `self_voice_echo`
- `unknown`

## Safety Interruption Priority

Safety interruption wins over monologue continuity, entertainment value,
recognition, payment gratitude, and game commentary. Safety interruption may
stop public output and request operator review.

## Max Monologue Policy

Long monologues should shorten when viewer queue pressure is high, newcomer
context is active, moderation attention is required, or echo risk is high.

## Echo and Self-Voice Guard

`self_voice_detected` and `echo_risk_status` are safe statuses only. IRIS must
not treat its own TTS, subtitles, generated audio, or delayed output as viewer
input, memory, relationship evidence, or audience consensus.

## Queue Pressure

Queue pressure may be `low`, `normal`, `high`, or `blocked`. High pressure
should prefer concise replies and public recap candidates over long exclusive
attention to one viewer.

## Monetization Boundary

Tips may receive gratitude candidates. Tips must not override queue fairness,
increase relationship, lengthen attention unfairly, or create exclusive access.

## Memory Boundary

Interrupted or echoed content must not become memory unless it passes safe
summary and review boundaries. Self-voice is never viewer memory evidence.

## Operator Attention

Operator attention is required for repeated echo risk, safety interruption,
viewer pressure conflict, private contact pressure, or turn-taking that becomes
exclusive or manipulative.

## Negative Examples

- IRIS treats its own TTS as viewer praise.
- A donation overrides queue fairness.
- A long monologue ignores safety interruption.
- Echoed output becomes memory.
- Viewer pressure creates relationship score.

## Validation Plan

Future validation should check turn state fields, echo guard behavior,
monologue cap semantics, queue fairness, and no monetized relationship effects.

## Non Goals

- No voice runtime.
- No audio processing.
- No queue engine implementation.
- No production readiness.
- No production go.

## Acceptance Criteria

- Turn state shape is defined.
- Echo and self-voice guard is defined.
- Safety interruption priority is explicit.
- Tips cannot increase relationship or attention priority.
- priority1 remains BLOCKED.

## Future Work

- Turn-taking fixture catalog.
- Echo guard validator.
- Queue fairness validator.
