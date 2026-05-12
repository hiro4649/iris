# Turn Rhythm

Turn rhythm is the current Phase17 MVP export.

It creates internal timing guidance for IRIS's conversational presence:

```text
schema: iris_turn_rhythm_v1
internal_profile: true
rhythm_state_id
response_mode
response_timing_plan
backchannel_plan
repair_plan
topic_turn_plan
laughter_recovery_plan
rhythm_naturalness_score
```

## Current Modes

```text
normal_reply
instant_reaction
thoughtful_reply
playful_reply
recovery_reply
quiet_presence
```

These are internal Phase17 labels. They are not canonical conversation state, action, emotion, tone, character tag, or task type.

## Use

Runtime attaches `turn_rhythm` to TTS and Live2D adapter packets so external adapters can coordinate:

```text
pre-response delay
first audio offset
post-response silence
laughter recovery pause
backchannel allowance
repair allowance
topic turn mix
```

The local overlay already reads `post_response_silence_ms` so laughter can linger longer than a normal reply.

When runtime processing becomes slow, `autonomous_expression.latency_bridge_plan` can add a short
safe filler phrase and visual hold. Turn rhythm remains timing guidance; the bridge does not mutate
Phase04 actions or create side effects.

## Boundary

Turn rhythm must not contain:

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

Turn rhythm is timing guidance only. It cannot execute game input, commit memory, or rewrite Core decisions.
