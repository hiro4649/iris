# Game Player

Game player is the current Phase24 MVP planning export.

It creates a validation-gated input action candidate for future game adapters:

```text
schema: iris_game_player_v1
internal_profile: true
game_goal
game_strategy
viewer_coordination_context
input_action_candidate
adapter_target_hint
safety_stop_result
mistake_recovery_plan
action_explanation_hint
```

## Boundary

`input_action_candidate` is not a command and is not sent to a game adapter.

It must keep:

```text
schema: iris_input_action_candidate_v1
candidate_kind: input_action_candidate
requires_validation: true
adapter_validation_required: true
```

It must not contain:

```text
world_command
execute
commit
write
apply
approved_game_input_action
```

Only `game_action_validator` may convert it into `approved_game_input_action`.

The validator is still gated by `IRIS_ENABLE_GAME_CONTROL=true` and `IRIS_AVAILABLE_GAME_ACTIONS`.
When game control is disabled, it returns `validation_status: disabled` and no approved action.

## Viewer Coordination

Phase24 can receive the Phase20 relationship summary, but only converts it into safe coordination
hints:

```text
familiarity_level
coordination_style
public_reference_style
private_detail_policy
score_visibility_policy
```

This lets IRIS explain game decisions differently for new, familiar, or boundary-needed viewers
without exposing relationship scores or raw relationship candidates. `coordination_style` can guide
wording such as `shared_strategy_hint`, but it never changes adapter approval or bypasses the game
action validator.

## Public State And Replay

Runtime returns the full internal export to server-side code and tests. Public stream state and replay logs use a sanitized summary:

```text
game_goal
game_strategy
viewer_coordination_context
input_action_candidate_status
adapter_target_hint
safety_stop_result
mistake_recovery_plan
action_explanation_hint
```

They do not expose the raw `input_action_candidate` or `approved_game_input_action`.

## Safety Stop

The MVP stops instead of creating a candidate when:

```text
not_game_observation
low_confidence
commentary_safety_reject
risk_level_high
adapter_action_unavailable
```

This keeps Phase24 planning separate from adapter execution. The local mock game-control adapter accepts only `approved_game_input_action` and remains simulated with `executed: false`.
