# IRIS Community World Text-State Adapter Policy

## Status

Status: proposal
Scope: specification only
Runtime implementation: not started
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Game Adapter runtime implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define a text-state-first policy for future Community World adapters. IRIS Core
should prefer reviewed text-state summaries over raw screen, raw OCR, raw chat,
raw game logs, or direct game commands.

## Text-State First Principle

Text-state summaries are safer, more auditable, and less ambiguous than raw
visual or chat payloads. Screen/OCR guesses are hints only and must not become
truth, memory, moderation evidence, or game actions without review.

## Adapter State Shape

`community_world_text_state_summary`:

- `state_id`
- `source_kind`
- `safe_summary`
- `freshness_bucket`
- `confidence_bucket`
- `operator_review_required`
- `moderator_review_required`
- `memory_candidate_allowed`
- `public_recognition_candidate_allowed`
- `game_action_candidate_allowed=false`
- `raw_screen_included=false`
- `raw_chat_included=false`
- `minecraft_command_included=false`
- `trace_id`

## Source Priority

Priority order:

1. operator manual summary
2. server event safe summary
3. plugin safe summary
4. game log safe summary
5. screen/OCR summary hint

Lower priority sources cannot override higher priority sources without operator
review.

## Manual Summary Boundary

Manual summaries may create candidates. They cannot directly write memory,
publish recognition, moderate users, rollback state, or execute commands.

## Plugin Summary Boundary

Future plugin summaries may provide safe status and counts only. They must not
send raw chat, exact private coordinates, raw player IDs, command payloads, or
private server internals into IRIS Core.

## Screen and OCR Boundary

Screen/OCR output is not truth. It cannot create memory, relationship,
moderation, public recognition, or game action candidates unless converted into
a reviewed safe text-state summary.

## Game Action Boundary

`candidate` is not executable. `input_action_candidate` must not reach Game
Adapter. `approved_game_input_action` remains the only schema accepted by Game
Adapter, and this spec does not implement that runtime path.

## Memory and Recognition Boundary

Text-state summaries may create review candidates. They must not directly commit
memory or publish recognition.

## Moderation Boundary

Moderation and rollback require moderator review. Raw grief evidence must not be
published or used as automatic punishment evidence.

## Negative Examples

- OCR text becomes memory.
- Raw Minecraft chat becomes public recap.
- Plugin summary includes a command.
- Manual summary directly publishes recognition.
- Screen hint triggers game action.

## Validation Plan

Future validation should check source priority, freshness, confidence, forbidden
raw fields, candidate boundaries, and no runtime readiness claims.

## Non Goals

- No Minecraft runtime.
- No Minecraft plugin.
- No Game Adapter runtime.
- No OCR implementation.
- No production readiness.
- No production go.

## Acceptance Criteria

- Text-state summary shape is defined.
- Source priority is defined.
- Raw screen/OCR/chat are not truth or memory.
- Game action boundary is preserved.
- priority1 remains BLOCKED.

## Future Work

- Text-state adapter fixtures.
- Text-state validator.
- Operator manual summary UI specification.
