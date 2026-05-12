# Game Commentary

Game commentary is the current Phase23 MVP export.

It converts Phase22 perception into an IRIS-like commentary plan:

```text
schema: iris_game_commentary_v1
internal_profile: true
commentary_mode
commentary_text_plan
game_personality_tags
laughter_candidate
serious_focus_state
viewer_comment_reference
viewer_relation_context
commentary_safety_result
```

## Modes

```text
none
live_reaction
explanation
prediction
playful_tsukkomi
self_deprecation
serious_focus
celebration
recovery
```

These are Phase23 internal labels. They do not replace Phase04 `action_type`, Phase02 `tone`, or Phase07 `task_type`.

## Relationship Context

When Phase20 has a viewer relationship profile, Phase23 can use only the safe public shape:

```text
familiarity_level
reference_style
co_play_style
boundary_mode
private_detail_policy
score_visibility_policy
```

`relationship_update_candidate`, proposed deltas, hidden affinity/familiarity scores, and private
details are never copied into the commentary plan. A boundary-needed relationship signal forces
serious-focus commentary so game banter does not escalate viewer tension.

## Laughter Candidate

Funny game moments can create:

```text
schema: iris_game_laughter_candidate_v1
candidate_kind: game_laughter_candidate
requires_validation: true
```

The candidate is not TTS playback, not Live2D execution, and not game input. It is a safe hint for later expression planning.

## Safety

High danger and low confidence force `serious_focus`. Playful commentary is only allowed for safe situations, and the safety result keeps the rule:

```text
person_targeting_policy: never_mock_player_or_viewer
```

IRIS can laugh at the situation, but not at a person.
