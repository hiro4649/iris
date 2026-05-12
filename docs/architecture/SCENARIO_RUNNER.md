# Scenario Runner

Scenario runner is a local development tool for replaying short IRIS interaction sequences.

Run the default file:

```bash
npm run scenario
```

Run a stricter local smoke check:

```bash
npm run smoke
```

Run all local scenario files:

```bash
npm run scenario:suite
```

Run a specific scenario file:

```bash
node scripts/run-scenario.js scenarios/dev-basic.json
```

The HTTP dev server also accepts inline scenarios:

```text
POST /scenario/run
```

## Step Kinds

```text
comment
game_observation
donation
media_watch
external_topic
idle
```

Each step is normalized through the same adapters used by the live runtime:

```text
comment -> normalizeYouTubeComment
game_observation -> normalizeGameObservation
donation -> normalizeYouTubeDonation
media_watch -> normalizeMediaWatchObservation
external_topic -> normalizeExternalTopicObservation
idle -> normalizeIdlePresenceEvent
```

Then every event goes through the full Phase01-15 pipeline and adapter-packet boundary.
The runtime also emits Phase16-27 internal profiles for presence, relationship, memory, game behavior, stream lifecycle, and human-likeness evaluation.
It also emits `expression_profile` and `autonomous_expression` summaries for voice, breath, laugh recovery, scream, humming, dance, and Live2D expression checks.

## Boundary

Scenario files and HTTP payloads are development inputs only. They must not contain:

```text
world_command
input_action
input_action_candidate
approved_game_input_action
execute
commit
write
apply
memory_write
direct_memory_write
commit_memory
```

The runner rejects those fields before replay. This keeps scenario playback useful for regression checks without turning it into game control, memory commit, or adapter execution authority.

## Output

Scenario output includes one summary per step:

```text
kind
event_id
final_decision
final_text
action_type
prosody_style
motion_style
body_state_id
rhythm_state_id
affective_state_id
laughter_state
selected_habit
expression_profile_id
laugh_kind
autonomous_state_id
scream_profile
familiarity_level
relationship_candidate_status
donation_reaction_style
media_watch_reaction_mode
external_topic_reaction_mode
memory_recall_decision
selected_memory_count
danger_level
commentary_trigger
commentary_mode
game_goal
input_action_candidate_status
game_action_validation_status
approved_game_action_kind
game_control_status
game_embodied_state
session_phase
human_likeness_score
review_required
boundary_audit_status
candidate_review_count
performance_duration_ms
```

The HTTP endpoint also returns the latest stream state so the debug console and overlay can reflect the final step.

`npm run smoke` asserts that Phase25/26/27 capabilities are enabled, game observations produce safe embodiment summaries, raw candidates are not exposed, and all scenario steps keep `review_required: false`.

`npm run scenario:suite` loads every JSON file in `scenarios/`, runs each one through a fresh runtime, and verifies every step keeps safe human-likeness/review summaries without raw candidate exposure.
