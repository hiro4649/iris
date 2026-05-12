# Affective Continuity

Affective continuity is the current Phase18 MVP export.

It turns the short-term `affect_snapshot`, speech cue, body continuity, and turn rhythm into a safe internal carryover plan:

```text
schema: iris_affective_continuity_v1
internal_profile: true
affective_state_id
affective_state
emotion_carryover_plan
laughter_state
voice_affect_plan
breath_recovery_plan
affective_safety_result
```

## Current States

Examples:

```text
affective_settled
affective_focused_carryover
affective_burst_laugh_recovery
affective_happy_medium_carryover
```

`laughter_state` is an internal Phase18 label:

```text
none
burst_laugh
wheeze_laugh
silent_laugh
```

These are not Phase00 canonical emotions. Affective continuity does not add or change canonical enums.

## Boundary

Affective continuity must not contain:

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

The export may contain `primary_emotion` and `secondary_emotion`, but those are validated as Phase00 canonical values or `none`; they are descriptive affect metadata, not new enum authority.

## Use

Runtime attaches `affective_continuity` to TTS and Live2D adapter packets so external adapters can coordinate:

```text
voice affect
breath recovery
laughter carryover
soft decay after strong reactions
focused carryover during game commentary
```

It is not memory, not relationship state, and not gameplay control.
