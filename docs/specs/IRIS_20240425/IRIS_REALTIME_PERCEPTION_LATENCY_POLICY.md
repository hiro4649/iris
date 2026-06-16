# IRIS Realtime Perception Latency Policy

## Status

Status: proposal
Scope: specification only
Runtime implementation: not started
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define how IRIS handles stale observations, latency buckets, and realtime
perception timing before any runtime or adapter implementation is changed.

## Realtime Perception Principle

IRIS may react to fresh safe summaries. IRIS must not turn stale observations
into memory, relationship evidence, moderation action, game action, or public
truth. Latency evidence is a safe status, not readiness evidence.

## Timing Fields

`iris_realtime_perception_state`:

- `perception_timestamp_ms`
- `speech_start_timestamp_ms`
- `observation_age_bucket`
- `latency_bucket`
- `stale_observation`
- `source_summary_kind`
- `safe_reaction_allowed`
- `memory_candidate_allowed`
- `game_action_candidate_allowed=false`
- `operator_attention_required`
- `trace_id`

## Observation Freshness Buckets

- `fresh`
- `slightly_delayed`
- `stale`
- `expired`
- `unknown`

Only `fresh` or reviewed `slightly_delayed` observations may create safe
commentary candidates. `stale`, `expired`, and `unknown` cannot create memory or
game action candidates.

## Latency Buckets

- `instant`
- `normal`
- `noticeable`
- `slow`
- `blocked`

Latency buckets are operator-facing summaries only. They do not prove runtime
readiness or production readiness.

## Stale Observation Rule

If `stale_observation=true`, IRIS may acknowledge uncertainty but must not
commit memory, relationship state, public recognition, moderation outcomes, or
game actions based on the observation.

## Source Priority

Manual operator summaries and validated text-state summaries take priority over
screen/OCR guesses. Raw screen, raw OCR, raw chat, and raw game logs are not
truth inputs for IRIS Core.

## Memory Boundary

Fresh commentary is not memory. Memory requires safe summary, review eligibility,
and the existing memory candidate boundary.

## Game Action Boundary

Perception may describe a scene. It cannot create executable game action. A
candidate remains non-executable and cannot reach the Game Adapter.

## Operator Attention

Operator attention is required when stale observations conflict with current
state, latency is `slow` or `blocked`, source priority is ambiguous, or a stale
observation attempts to create memory or action.

## Negative Examples

- Stale screen summary creates a game action.
- Old chat is committed as memory.
- Latency PASS is described as runtime readiness.
- Raw OCR becomes public recap truth.
- Expired observation triggers moderation.

## Validation Plan

Future validation should check bucket values, stale observation behavior,
candidate boundaries, and no-readiness wording.

## Non Goals

- No runtime implementation.
- No adapter implementation.
- No screen/OCR processing.
- No production readiness.
- No production go.

## Acceptance Criteria

- Timing fields are defined.
- Freshness and latency buckets are defined.
- Stale observations fail closed for memory and game action.
- Text-state priority is explicit.
- priority1 remains BLOCKED.

## Future Work

- Realtime latency fixture catalog.
- Stale observation validator.
- Text-state adapter validator.
