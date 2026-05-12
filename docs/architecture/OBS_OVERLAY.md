# OBS Overlay

`/overlay` is the local OBS Browser Source page. It polls `/state` and renders a compact subtitle
bubble with classes for laughter, focused game talk, soft motion, camera proximity, autonomous
expression, speech-rate hints, and right-to-left subtitle direction.
It also polls `/event-render-manifests/latest` and, when the latest grouped TTS/Live2D/subtitle
manifest is OBS-pickup ready, plays the same-origin `/event-render-manifests/latest/artifact/tts`
audio through a hidden browser audio element. The page never accepts arbitrary artifact paths and
does not inspect raw jobs, packets, subtitle files, or local filesystem paths.

For bridge integrations that should not consume full runtime state, IRIS exposes display-only
overlay events:

```text
GET /overlay/event
GET /overlay/events
GET /overlay/events/status
```

`/overlay/event` returns one latest `iris_overlay_display_event_v1` object. `/overlay/events` is an
SSE stream that emits the same safe event after runtime state updates and sends heartbeat comments
so OBS/browser clients can keep the connection warm. `/overlay/events/status` exposes only stream
health and counts.

The display event includes subtitle text only from the validated subtitle cue:

```text
schema: iris_overlay_display_event_v1
display.subtitle_text
display.subtitle_language
display.script_direction
display.line_break_plan
timing.planned_visible_ms
timing.subtitle_sync_status
class_hints
bridge.tts_bridge_status
bridge.live2d_bridge_status
bridge.subtitle_bridge_status
camera.proximity_level
boundary_policy
```

It does not expose `final_text`, `last_text`, raw runtime state, candidates, approved records,
commands, commits, game actions, memory IDs, or canonical Core fields.

`/overlay/status` is the safe monitoring endpoint for the overlay surface:

```text
schema: iris_overlay_status_v1
health: fresh | stale | empty
visibility_state: visible | hidden
text_length
subtitle_visible
subtitle_language
vision_source_kind
vision_frame_age_ms
vision_ui_focus_count
vision_raw_frame_available
speech_rate_label
speech_rate_repair_status
subtitle_sync_status
tongue_twister_enabled
tongue_twister_language
tongue_twister_phrase_length
tongue_twister_attempt_ms
tts_bridge_status
tts_artifact_available
tts_duration_ms
live2d_bridge_status
live2d_duration_ms
planned_visible_ms
class_hints
state_age_ms
```

The status endpoint intentionally does not expose raw speech text, raw runtime state, candidates,
approved game actions, memory records, relationship records, commands, commits, or canonical Core
envelopes.

For tongue-twister monitoring it exposes only enabled/language/length/timing summaries. It never
returns the phrase text, response text, or adapter candidate objects.

For HTTP TTS/Live2D bridge monitoring it exposes only bridge status, duration, and whether an audio
artifact is available. It does not expose raw adapter packets or bridge response payloads.

For vision monitoring it exposes only source kind, frame age, UI focus count, and whether a raw
frame exists outside Core. It never exposes OCR summary text, screenshots, pixels, or frame bytes.

`/overlay/events/status` returns:

```text
schema: iris_overlay_event_stream_status_v1
stream_ready
client_count
published_count
latest_event_id
latest_event_age_ms
boundary_policy
```

It never returns subtitle text, final text, adapter packets, candidates, commands, commits, memory
records, relationship records, or canonical Core envelopes.

This keeps OBS and local monitoring read-only. The overlay page can still render from `/state` for
local development, while bridge integrations can use `/overlay/event` or `/overlay/events` for a
narrower subtitle-display contract.

## OBS Setup Bridge

The local bridge `/health` route returns `iris_local_bridge_health_v1` for operator monitoring. It
reports only bridge readiness, accepted adapter kinds, whether outbox/artifact storage and manifest
delivery routes are configured, whether the render-manifest stale guard is configured, and local
route paths. It does not expose local filesystem paths, endpoint values, packets, jobs, text,
candidates, commands, or secrets.

`/obs/browser-source` returns a local Browser Source setup description:

```text
schema: iris_obs_browser_source_config_v1
obs_browser_source.browser_source_url
obs_browser_source.width
obs_browser_source.height
obs_browser_source.fps
endpoints.event_stream_path
endpoints.local_bridge_event_render_manifest_status_path
endpoints.local_bridge_event_render_manifest_latest_path
local_bridge_handoff.latest_artifact_paths
class_hints
boundary_policy
```

`local_bridge_handoff.render_manifest_status_path` points to the local bridge status path used to
monitor synchronized TTS/Live2D/subtitle render manifests.
`local_bridge_handoff.latest_render_manifest_report_path` points to the safe latest-manifest report,
which adds `obs_pickup_status`, fixed `obs_handoff_readiness_status`, `obs_pickup_ready`,
per-adapter safe-reference flags, artifact-file availability booleans, per-adapter artifact
freshness status, content types, byte counts, and `obs_pickup_blocking_adapter_*` summaries. These
are monitoring hints for operator tooling, not content delivery endpoints: they return counts, safe
IDs, artifact kinds, engine modes, readiness status, content metadata, freshness
metadata, and availability booleans, never local artifact paths, subtitle text, raw packets, raw
jobs, candidates, commands, endpoints, or secrets. A manifest that points outside
`IRIS_LOCAL_BRIDGE_ARTIFACT_DIR` is reported as `unsafe_artifact_reference` and is not used as a
file-existence probe.
The engine-worker status also exposes per-adapter `adapter_readiness_status` for `tts`, `live2d`,
and `subtitle`; it uses fixed enum values only and is intended to show whether voice, motion, or
subtitles are pending, retrying, blocked, active, idle, or attention-required without exposing
local payloads.
`obs_handoff_readiness_status` is a dashboard-friendly fixed enum:
`ready`, `waiting_for_manifest`, `waiting_for_complete_artifacts`, `waiting_for_fresh_render`,
`operator_action_required`, or `attention`. It does not replace the more specific
`obs_pickup_status`; it lets OBS/operator tooling distinguish "render more artifacts" from "operator
must fix unsafe/invalid artifacts" without reading local paths or payloads.
When `IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS` is set, OBS pickup also requires every grouped
TTS/Live2D/subtitle artifact's `rendered_at_ms` to be fresh and not clock-skewed into the future.
If one grouped artifact is stale or missing freshness metadata, the report returns
`obs_pickup_status: stale_artifact`, `obs_pickup_ready: false`, and the latest artifact routes
return a fixed 409 `stale_artifact` error for the whole group without path values or artifact
bodies.
The latest report also validates the local artifact contract before pickup: TTS WAV artifacts must
look like RIFF/WAVE, Live2D artifacts must be known local cue JSON schemas without forbidden fields,
Live2D engine artifacts must carry an accepted cue schema, and subtitle artifacts must start with
`WEBVTT`. If any grouped artifact fails that check, the report returns
`obs_pickup_status: invalid_artifact`, and all latest artifact routes return a fixed 409
`invalid_artifact` error without path values or artifact bodies.
When `IRIS_LOCAL_BRIDGE_ARTIFACT_DIR` is configured on the main IRIS HTTP server, these same
`/event-render-manifests/*` routes are available from the OBS Browser Source origin as read-only
local artifact handoff routes. This lets OBS/operator tooling monitor and fetch the latest grouped
TTS, Live2D, and subtitle artifacts without needing a separate local bridge origin in the Browser
Source config.
`local_bridge_handoff.latest_artifact_paths` lists local read-only content delivery routes for the
latest complete manifest only:

```text
/event-render-manifests/latest/artifact/tts
/event-render-manifests/latest/artifact/live2d
/event-render-manifests/latest/artifact/subtitle
```

These routes do deliver the rendered artifact body to local OBS/operator tooling, but they do not
accept arbitrary path input and their error responses remain path-free and payload-free while
including a fixed `artifact_delivery_readiness_status`.

`postObsBridgeSetup(...)` can POST a derived `iris_obs_bridge_setup_request_v1` to an external
local OBS setup bridge configured with `IRIS_OBS_BRIDGE_ENDPOINT`. This request is for operator
setup only. It may carry the overlay URL, source dimensions, event paths, safe area, and class hints;
it must not carry live subtitle text, final text, candidates, approved game actions, memory writes,
relationship writes, commands, endpoint secrets, or runtime expression authority.
Operators can override the Browser Source setup with `IRIS_OBS_SOURCE_NAME`,
`IRIS_OBS_SCENE_NAME`, `IRIS_OBS_SOURCE_WIDTH`, `IRIS_OBS_SOURCE_HEIGHT`,
`IRIS_OBS_SOURCE_FPS`, `IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE`, and
`IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE`. Width is clamped to `320..7680`,
height to `180..4320`, and FPS to `1..120`; malformed numeric values fall back to
`1280x720@30`.

The setup acknowledgement becomes `iris_obs_bridge_setup_report_v1`, which exposes only configured
status, request ID, source dimensions, event-stream availability, and boundary flags. It hides the
bridge endpoint value and any authorization secret.

`createObsBridgeHealthProbeReport(...)` can GET a read-only JSON health endpoint configured with
`IRIS_OBS_BRIDGE_HEALTH_ENDPOINT`. The report exposes only readiness, setup-schema compatibility,
setup-ack compatibility, HTTP status, fixed error kinds, configured env names, and boundary flags.
Configured env names also include operator setup choices such as `IRIS_HTTP_ORIGIN`,
`IRIS_OBS_SOURCE_NAME`, `IRIS_OBS_SCENE_NAME`, source dimensions, and Browser Source visibility
toggles when present; their values are never exposed.
When health declares `supported_response_fields`, `response_fields`, `supported_ack_fields`, or
`ack_fields`, IRIS checks that setup acknowledgements can return either `bridge_status` plus
`configured`, or `request_id` plus `bridge_status`. It rejects or omits raw bridge bodies, endpoint
values, authorization secrets, text, candidates, commands, and runtime payloads. Failed health
responses are summarized without reading their response body, and malformed
`IRIS_OBS_BRIDGE_TIMEOUT_MS` values fall back to 5000 ms before the request is sent.

When `continueOnError` is enabled, a failed or unsafe bridge response becomes a summary-only
`attention` report with `setup_status: bridge_setup_request_failed`, `failure_kind`, optional
HTTP status, and `retryable: true`. The report still hides endpoint values, secrets, live payloads,
response bodies, subtitle text, candidates, commands, and approved game actions.
Failed setup responses are also reduced to status-only summaries without reading the bridge body.

Use:

```bash
npm run dev:obs:roundtrip
npm run dev:obs:failure-roundtrip
npm run dev:obs:invalid-artifact-roundtrip
npm run dev:obs:render-handoff-roundtrip
npm run dev:obs:runtime-render-roundtrip
npm run dev:obs:stale-artifact-roundtrip
npm run dev:obs:probe
npm run dev:obs:setup
npm run dev:obs:unsafe-roundtrip
```

to verify the OBS setup boundary against local fixture bridges, then send the same operator-only
setup request to `IRIS_OBS_BRIDGE_ENDPOINT` when a real local OBS setup bridge is available.
Use `dev:obs:render-handoff-roundtrip` to verify that `/obs/browser-source` points at manifest and
latest-artifact handoff routes that are actually served by the main IRIS HTTP origin.
Use `dev:obs:runtime-render-roundtrip` to verify that a real runtime comment can produce
TTS/Live2D/subtitle jobs, grouped artifacts, and same-origin OBS artifact pickup without printing
local paths or artifact bodies. The same roundtrip now checks
`/production/foundation-runtime-status` and requires `ready_for_obs_runtime_handoff`, tying the OBS
pickup result back to the production foundation gate. That status also requires the local worker
queue to be clear and real TTS/Live2D engine handoff to be ready or active, so a stale or broken
engine worker cannot be hidden by an otherwise valid OBS manifest.
Use `dev:foundation:blocked-worker-roundtrip` for the companion failure check: malformed worker
queue state blocks OBS runtime readiness while public output remains summary-only.
Use `dev:foundation:policy-gate-roundtrip` to verify that an external runtime bridge target blocks
foundation startup before OBS handoff and is reported only as a fixed policy status.
Use `dev:obs:invalid-artifact-roundtrip` to verify that a fresh manifest with a malformed grouped
artifact is rejected before OBS can pick up any artifact from that group.
Use `dev:obs:stale-artifact-roundtrip` to verify that a fresh latest manifest with an old grouped
artifact is rejected before OBS can pick up any artifact from that group.
`IRIS_OBS_SOURCE_NAME` and `IRIS_OBS_SCENE_NAME` are sent only in that operator setup request;
production doctor and integration status expose only env names or configured booleans for those
values.
Use `dev:obs:probe` to check the optional read-only health endpoint without posting setup or
touching runtime overlay state. Explicit unhealthy readiness declarations such as `ok:false`,
`ready:false`, or `attention` are summarized as attention even when setup schema and ack shape
declarations match.
Use `dev:obs:unsafe-roundtrip` to verify that a `200 OK` setup acknowledgement is still rejected
when it echoes runtime text, candidates, commands, or secrets.
