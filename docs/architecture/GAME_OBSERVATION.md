# Game Observation

Game observation is the first MVP path for IRIS as a game commentator.

## Read-Only Input

Game state enters Core through:

```text
normalizeGameObservation(...)
```

It produces a read-only event:

```text
source: game_observation
payload_kind: game_observation
```

Allowed payload information:

```text
game_title
scene_summary
detected_events
player_state
screen_confidence
vision_metadata
```

`vision_metadata` is optional and summary-only:

```text
schema: iris_vision_observation_metadata_v1
source_kind
frame_id
frame_reference_id
frame_timestamp_ms
frame_age_ms
capture_region
ocr_text_summary
ui_focus_areas
raw_frame_available
raw_frame_policy: raw_frame_not_passed_to_core
```

The raw screenshot, pixels, and OCR transcript do not enter Core. The bridge may keep a raw frame
outside IRIS and pass only a reference ID plus bounded summaries.

Forbidden payload fields:

```text
world_command
input_action
input_action_candidate
approved_game_input_action
execute
commit
write
apply
raw_frame
raw_image
image_base64
screenshot_base64
frame_pixels
pixel_data
ocr_raw_text
```

## Commentary

Phase01 treats game observations as `observe`.

In an active stream this can still produce a `SPEAK` action, but Phase07 classifies it as `CREATE_CONTENT`, so IRIS can commentate without pretending to control the game.

The runtime stream state exposes the latest read-only game context:

```text
last_payload_kind
last_game_context
```

This lets overlays or debugging tools show what IRIS is reacting to without exposing input execution.
That public context is sanitized before it is stored in stream state: frame IDs, frame reference IDs,
raw frames, and unsafe vision labels are omitted or reduced to availability/count signals. Internal
runtime code can still use the normalized observation object, but public state and replay logs must
not carry local frame handles, endpoint-like labels, token-like labels, or candidate markers.

## HTTP Vision Bridge Source

`createHttpGameObservationSource(...)` can poll a local screen-recognition or vision bridge through
HTTP `GET` or request a fresh bounded summary through HTTP `POST`, then normalize the response into
the same read-only `game_observation` event.

The endpoint must be loopback or private-network scoped. Malformed or external HTTP targets are
blocked before fetch and reported only as `local_endpoint_policy_blocked`, with endpoint scope
metadata but without the raw endpoint value.

It can also be created through env-backed runtime adapter configuration when
`IRIS_GAME_OBSERVATION_ENDPOINT` is set.

POST capture request env:

```text
IRIS_GAME_OBSERVATION_METHOD=POST
IRIS_GAME_OBSERVATION_ERROR_BACKOFF_MS=5000
IRIS_GAME_OBSERVATION_MAX_ERROR_BACKOFF_MS=60000
IRIS_GAME_CAPTURE_REGION={"x":0,"y":0,"width":1280,"height":720}
IRIS_GAME_CAPTURE_X=0
IRIS_GAME_CAPTURE_Y=0
IRIS_GAME_CAPTURE_WIDTH=1280
IRIS_GAME_CAPTURE_HEIGHT=720
IRIS_GAME_OBSERVATION_INCLUDE_OCR_SUMMARY=true
IRIS_GAME_OBSERVATION_INCLUDE_UI_FOCUS_AREAS=true
IRIS_GAME_OBSERVATION_MAX_EVENTS=8
```

`IRIS_GAME_CAPTURE_REGION` can be supplied as JSON, or the scalar `IRIS_GAME_CAPTURE_X/Y/WIDTH/HEIGHT`
values can override individual fields for easier deployment configuration.

Invalid numeric values fall back to safe defaults instead of disabling the guardrails:
`IRIS_GAME_OBSERVATION_TIMEOUT_MS=5000`, `IRIS_GAME_OBSERVATION_ERROR_BACKOFF_MS=5000`,
`IRIS_GAME_OBSERVATION_MAX_ERROR_BACKOFF_MS=60000`, and
`IRIS_GAME_OBSERVATION_MAX_EVENTS=8`. Timeouts are clamped to 100..60000ms, backoff is bounded,
and max detected events is clamped to 1..12.

POST sends only this bounded request shape:

```text
schema: iris_vision_capture_request_v1
request_kind: screen_observation_summary
capture_region
include_ocr_summary
include_ui_focus_areas
max_detected_events
raw_frame_policy: do_not_return_raw_frame_to_core
```

This request is not permission to send raw frames, direct OCR transcripts, game commands, action
candidates, canonical Core fields, or memory/relationship commits. It asks the bridge to summarize
what it sees and return only the accepted observation fields below.

The local HTTP ingest scheduler can poll this source while `npm run dev:server` is running. Enable
it with `IRIS_ENABLE_HTTP_INGEST_SCHEDULER=true`, then inspect `/ingest/status` or trigger a manual
poll through `/ingest/tick`.

POST capture regions are normalized before the bridge request is sent: `x`/`y` are clamped to
non-negative values, `width`/`height` are clamped to 1..16384, and non-numeric coordinates become
`null`. The same bounds are applied when returned vision metadata includes a capture region, so
public state cannot carry negative or unbounded screen geometry.

The source also exposes a safe local `status()` summary for diagnostics: fixed
`ingest_readiness_status`, request method, request count, last observation count, confidence
telemetry, frame-age telemetry, metadata availability counts, capture-request preferences,
retry-backoff timing, and a fixed error kind. Readiness is limited to `idle`, `active`,
`retry_backoff`, or `attention`. After a transport or contract failure, the source applies bounded
backoff before the next vision request. It does not expose observation
payloads, scene summaries, OCR text, frame IDs, raw frames, endpoint values, API keys, transport
error text, candidates, or commands. Non-OK vision bridge responses are reduced to fixed
HTTP-status failures without reading their response bodies.
The source validates this public status before returning it: request/telemetry counters must be
non-negative, readiness/policy/scope/error labels are closed enums, capture-request summaries are
bounded, all boundary flags must remain true, and URL-bearing diagnostics are rejected.
`npm run dev:gameplay:runtime-status` and `GET /production/gameplay-runtime-status` roll that
source status up with the HTTP ingest scheduler and public stream state. The report is read-only
and emits only counts, fixed statuses, validator status, safe-control status, boundary-audit
status, a `game_vision_capture_flow` summary, safe-control flow summary, and safe-action lifecycle
summary for the current blocking stage. The vision-capture flow exposes only scheduler/source
counts, capture-request presence, observation counts, low-confidence blocks, and frame/OCR
availability counts; it never emits raw frames, OCR text, frame references, action candidates,
approved action payloads, endpoints, secrets, or scheduler result payloads.
`npm run dev:gameplay:runtime-roundtrip` runs the same path with a local fixture vision bridge and
asserts that the scheduler-fed game observation reaches `safe_control_active` through the validator
boundary. The public report keeps endpoint values, frame references, action candidates, approved
action payloads, and scheduler result payloads out of output while surfacing the lifecycle status
from observation to adapter ACK.

For a local end-to-end check, run:

```bash
npm run dev:vision:game-roundtrip
```

This starts a fixture vision bridge, sends one bounded POST capture request, normalizes the returned
summary into a read-only game observation, validates any Phase24 input candidate, and sends only
`approved_game_input_action` to the simulated local `/game-control` bridge. The raw capture request,
raw frame, and raw candidate are not exposed in public bridge status.

Accepted bridge shapes:

```text
{ observation: { game_title, scene_summary, detected_events, player_state, screen_confidence } }
{ observations: [ ... ] }
{ game_title, scene_summary, ... }
{ title, vision: { summary, events, labels, objects, confidence }, frame: { reference_id } }
```

Bridge observations may also include `frame_id`, `frame_reference_id`, `frame_age_ms`,
`capture_region`, `ocr_text_summary`, `ui_focus_areas`, and `raw_frame_available`. These become
`vision_metadata` and remain read-only. Nested `vision` and `frame` objects are accepted for common
screen-recognition bridges, but only bounded summaries, labels, object names, focus-area names, and
frame references are normalized.
Public source status reduces `frame_age_ms` to counts plus min/average/max milliseconds only. It
does not expose frame IDs or raw image data, but it gives operators enough signal to notice stale
vision input before game-action approval uses it.

The source rejects any bridge payload that contains candidates, approved game actions, commands,
commits, direct memory writes, relationship writes, or canonical Core fields. The bridge may describe
what it sees, but it cannot suggest executable input or update memory. It also rejects raw image
payload fields such as base64 screenshots, frame pixels, and raw OCR transcripts.

## Input Action Candidate

The helper `createInputActionCandidate(...)` can create a future gameplay suggestion:

```text
candidate_kind: input_action_candidate
requires_validation: true
```

This candidate is not execution. It must not be passed to a game adapter until `game_action_validator` approves and converts it into `approved_game_input_action` through the separate game-control boundary.
