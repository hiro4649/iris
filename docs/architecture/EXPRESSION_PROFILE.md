# Expression Profile

`expression_profile` is the runtime bridge between IRIS personality/presence planning and concrete TTS or Live2D rendering.

It is created after:

```text
speech_cue
motion_cue
performance_plan
affective_continuity
personality_habit
game_embodiment
```

The profile is internal and read-only:

```text
schema: iris_expression_profile_v1
internal_profile: true
adapter_validation_required: true
```

## What It Contains

```text
expression_profile_id
expression_intensity
voice_engine_profile
laugh_expression_profile
breath_event_plan
live2d_expression_profile
recovery_profile
source_summary
safety_expression_policy
```

The main local profiles are:

```text
expression_steady_talk
expression_big_laugh_recovery
expression_game_laugh_recovery
expression_game_focus
expression_game_tension
expression_game_celebration
expression_idle_breath
```

For a big laugh, the profile can provide:

```text
pre_laugh_inhale
laugh_burst
laugh_wheeze_tail
laugh_recovery_breath
```

This lets a real TTS engine and Live2D bridge render breathless laughter and recovery without giving the profile any side-effect authority.

## Boundary

Expression profiles must not contain:

```text
world_command
input_action
input_action_candidate
relationship_update_candidate
memory_carryover_candidates
community_memory_candidates
execute
commit
write
apply
memory_write
direct_memory_write
commit_memory
approved_game_input_action
approved_memory_record
approved_relationship_record
intent
action_type
emotion
tone
character_tag
task_type
conversation_state
relation_score
```

The profile cannot approve game input, commit memory, write relationship state, or redefine canonical Phase04 fields. TTS and Live2D adapters may read it only as style, timing, breath, and expression guidance.

## Surfaces

Runtime returns `expression_profile` in the processed event result and includes it in both TTS and Live2D adapter packets.

Local development surfaces expose it for inspection:

```text
GET /state
GET /debug
GET /replay
POST /scenario/run
```

Replay and public stream state store the profile as read-only safe data. Raw candidates from Phase20, Phase24, or Phase26 remain excluded.
