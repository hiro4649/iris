# Game Action Validator

Game action validator is the Phase24 boundary between planning and game-control adapters.

`game_player` may create an internal candidate:

```text
schema: iris_input_action_candidate_v1
candidate_kind: input_action_candidate
requires_validation: true
```

That object is never sent to a game adapter. The validator is the only runtime component that may convert it into:

```text
schema: approved_game_input_action
approved: true
validation_route: game_action_validator_v1
safety_policy: approved_schema_only_no_os_direct_input
source_policy: model_decision_not_viewer_direct
observation_context:
  schema: iris_approved_game_observation_context_v1
  perception_confidence
  frame_age_ms
  max_observation_age_ms
  freshness_status
```

## Runtime Gate

Game control is off unless:

```text
IRIS_ENABLE_GAME_CONTROL=true
```

When disabled, the validator returns:

```text
validation_status: disabled
approved_game_input_action: null
```

When enabled, approval still requires:

```text
game_player.safety_stop_result.status == allow_candidate
perception_confidence >= 0.25
candidate source_policy == model_decision_not_viewer_direct
candidate risk_level != high
action_kind is supported and present in IRIS_AVAILABLE_GAME_ACTIONS
candidate has no execute/commit/write/apply fields
action parameter hints do not contain unsafe key combinations, command-like text, candidate names,
or secret/authorization tokens
the game observation is not stale according to `IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS`
the game observation does not report a future/negative frame age
the optional `IRIS_GAME_CONTROL_MIN_INTERVAL_MS` cooldown has elapsed since the last approved action
```

`IRIS_AVAILABLE_GAME_ACTIONS` is normalized to lowercase supported action names and unsupported
entries are ignored before both the game player and validator use it. If no valid action remains,
the safe fallback is `wait`.
Production config doctor uses the same normalization for readiness. If `IRIS_AVAILABLE_GAME_ACTIONS`
contains only unsupported names, `approved_game_control_adapter` stays `attention` and reports only
supported/unsupported counts, not the raw action strings.
`IRIS_GAME_CONTROL_MIN_INTERVAL_MS` is optional and defaults to `0`. When set above zero, the
validator rejects otherwise valid actions with `action_rate_limited` before they reach any
game-control adapter. This is a runtime safety brake for real bridges that should not receive rapid
repeat actions from consecutive vision ticks.
`IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS` defaults to `5000`. If the vision bridge supplies a
`frame_age_ms` older than this limit, the validator rejects the candidate with
`stale_observation` before an approved action can be created. Set it to `0` only for local fixture
tests that intentionally omit frame freshness.
If the vision bridge reports a negative `frame_age_ms`, IRIS treats it as
`future_clock_skew` and rejects the candidate with `future_observation` before any approved action
or game-control adapter handoff is created.
Approved actions carry only a summary `observation_context`: perception confidence, optional frame
age, the configured max age, and a fixed freshness status. They do not carry raw frames, OCR text,
frame references, or the raw `input_action_candidate`.
The approved action schema also validates that the freshness summary is internally consistent:
`fresh` requires a reported frame age within the max-age policy, `not_reported` cannot carry a
frame age, and `freshness_not_enforced` is allowed only when the max-age policy is zero. This lets
game-control adapters reject forged or inconsistent approved-action payloads before any bridge call.
Game observation normalization clamps public trace/event IDs, game title, scene summary, detected
event labels, and player-state text before perception or validation, preventing oversized vision
bridge text from becoming unbounded prompt or adapter context.
Every validation result also carries an `observation_validation_summary`. This is safe to expose in
local status because it contains only confidence, frame age, max-age policy, freshness status, and
fixed rejection booleans. Rejected stale, future-clock-skew, or low-confidence observations
therefore remain explainable without surfacing OCR text, raw frames, candidates, or approved action
payloads.
`/production/gameplay-runtime-status` includes a `game_vision_capture_flow` summary before the
action gate. It reports screen-capture polling readiness, observation and low-confidence counts,
frame-age/OCR-summary availability counts, and no-payload capture boundaries only, so operators can
separate vision-source issues from action-validation issues without seeing raw frames, OCR text, or
frame references.
`/production/gameplay-runtime-status` also includes an `action_gate_flow` summary. It reports only
booleans, counts, and fixed statuses for the observation -> proposal -> validation -> adapter
handoff path, making it clear when a proposal was blocked before adapter handoff without exposing
the raw candidate or approved payload.
The same report includes `safe_action_lifecycle_flow`, which combines scheduler readiness,
observation source status, perception/proposal/validation progress, adapter ACK state, and
boundary-audit state into one operator-facing lifecycle. It remains counts/statuses/booleans only:
no raw frames, OCR text, candidates, approved actions, commands, endpoint values, or secrets are
published.

## Adapter Boundary

The local mock adapter and optional HTTP game-control adapter accept only `approved_game_input_action`.

It rejects raw candidates and stays simulated:

```text
schema: iris_game_control_result_v1
adapter: mock_game_control
executed: false
simulated: true
```

The current adapter never sends OS input, game SDK commands, or browser automation.

The HTTP adapter can be selected with:

```text
IRIS_ENABLE_GAME_CONTROL=true
IRIS_GAME_CONTROL_ADAPTER=http
IRIS_GAME_CONTROL_ENDPOINT=http://127.0.0.1:9003/game-control
IRIS_GAME_CONTROL_MIN_INTERVAL_MS=250
IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS=5000
```

It sends the approved action as JSON. The approved JSON includes the bounded
`observation_context` so a real game bridge can independently see whether the action came from a
fresh or unreported frame-age summary. `IRIS_GAME_CONTROL_TIMEOUT_MS` is clamped to 100..60000ms and
falls back to 5000ms when the env value is invalid, so a bad numeric setting does not turn the HTTP
boundary into an immediate abort loop. Successful responses are converted to a failed
`unsafe_response` result if they echo raw candidates, approved actions, commands, endpoint values,
authorization fields, secrets, or commit fields. Failed HTTP responses are summarized without
parsing or exposing the response body, and become:

```text
control_status: failed
accepted: false
executed: false
```

This keeps a broken or hostile game bridge from leaking raw candidates, commands, secrets, or
debug payloads back into runtime state.
The HTTP adapter also exposes a local `status()` summary with `game_control_readiness_status`,
request/accepted/failed counts, fixed failure-kind counters, endpoint-scope labels,
`local_endpoint_policy_status`, and the last safe action kind. It does not expose endpoints,
secrets, approved action payloads, raw candidates, or commands. This makes it possible to
distinguish validator rejection, local endpoint policy blocking, bridge transport failure, unsafe
bridge echo, and a healthy approved-action handoff during production loop checks.
The status object is validated by the same adapter before publication: counts must be
non-negative, result counts cannot exceed request count, readiness/policy/scope values are closed
enums, all boundary flags must be true, and unsafe diagnostic strings such as URLs, tokens,
candidate names, command names, or commit/write markers are rejected.
Successful bridge responses are also treated as untrusted summaries. If `reason`, `request_id`,
`bridge_status`, or status-text values contain endpoint strings, token/secret/password markers,
candidate names, command-like words, or commit/write markers, IRIS replaces those values with fixed
summary text before the result reaches runtime state.

Verify the successful and failing HTTP game-control boundaries locally:

```bash
npm run dev:game-control:roundtrip
npm run dev:game-control:failure-roundtrip
npm run dev:game-control:unsafe-roundtrip
```

## Public State And Replay

Runtime result can contain the internal approved action for server-side tests and future game adapters.

Public `/state`, scenario summaries, and replay logs expose only safe summaries:

```text
validation_status
approved_game_action_kind
observation_validation_summary
rejected_reasons
game_control_result.control_status
```

They do not expose `input_action_candidate` or `approved_game_input_action`.
