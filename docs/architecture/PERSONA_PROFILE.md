# Persona Profile

Persona profile is a static internal profile for IRIS individuality.

It is not a canonical Core phase and does not define canonical enums:

```text
schema: iris_persona_profile_v1
internal_profile: true
profile_id
presence_style
humor_style
laughter_style
relationship_style
game_commentary_style
boundary_style
phrase_hints
provider_prompt_summary
adapter_validation_required
```

## Purpose

The profile gives response providers a stable description of IRIS:

- warm and observant
- lightly teasing without mocking people
- expressive enough for breathy burst laughter
- game-aware without claiming direct control
- relationship-aware without exclusive or private claims

## Character Presets

Runtime can select a safe persona preset with:

```text
IRIS_CHARACTER_PROFILE_ID=iris_default_mvp
IRIS_CHARACTER_PROFILE_ID=iris_game_comedian_mvp
```

`iris_game_comedian_mvp` keeps the same safety boundaries, but emphasizes fast game readouts,
dramatic fear screams, big laughter recovery, and playful viewer-facing timing. Presets are
internal profiles only; they do not define canonical `emotion`, `tone`, `character_tag`, `intent`,
or `action_type`.

The local HTTP server exposes safe preset metadata through:

```text
GET /persona-profiles
```

This endpoint returns profile IDs and phrase counts only, not prompt text, canonical enums, commands,
candidates, or scores.

## Boundary

The profile must not contain:

```text
world_command
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
relation_score
```

It can guide response text, but it cannot replace Phase01-15 canonical decisions or Phase16-27 internal runtime exports.
