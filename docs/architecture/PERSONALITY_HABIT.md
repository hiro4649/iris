# Personality Habit

Personality habit is the current Phase19 MVP export.

It selects small, contextual IRIS-like habits without rewriting Core identity or canonical fields:

```text
schema: iris_personality_habit_v1
internal_profile: true
habit_profile_id
selected_habit
habit_text_hint
character_catchphrase_profile
habit_cooldown_update
personality_boundary_result
habit_reject_reason
```

## Current Habits

```text
none
light_self_deprecation
playful_tsukkomi
soft_boast
thinking_mutter
laugh_aftertaste
game_focus_mutter
```

These are Phase19 internal labels. They are not Phase00 `tone`, `emotion`, `character_tag`, `action_type`, or `task_type`.

## Cooldown

Runtime keeps a short in-memory habit history. The same habit is not selected repeatedly in nearby turns.

This history is not memory and is not written to relationship state. It only prevents repetitive local performance habits.

## Character Catchphrase Profile

`character_catchphrase_profile` is an internal Phase19 profile for IRIS-specific phrase tendencies.

It contains:

```text
character_profile_id
catchphrase_profile_id
selected_phrase_hint
phrase_pool
usage_contexts
forbidden_contexts
cooldown_policy
relation_safe_variants
```

The phrase pool is style guidance only. It cannot add canonical fields, rewrite the final text authority, change personality from user comments, or vary by donation amount.

## Boundary

Personality habit must not contain:

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

The export may include `habit_text_hint`, but adapters must treat it as a hint. Phase15 remains the final text authority.
