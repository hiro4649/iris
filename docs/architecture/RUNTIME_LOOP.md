# Runtime Loop

The runtime loop wraps the Phase01-15 core pipeline and adapter handoff.

```text
comment source
-> event queue
-> IRIS runtime
-> Phase01-15 core
-> Phase16-27 internal runtime exports
-> expression profile
-> TTS adapter
-> Live2D adapter
-> subtitle adapter
```

The event queue prioritizes urgent game observations, donation events, and direct mentions before
ordinary comments while keeping stable order inside the same priority. It also rejects duplicate
`event_id` values while they are queued and for a short processed history window. Priority affects
only scheduling order; it is not a memory commit, game action approval, or canonical Core field.

## Local Development

Run a local scripted demo:

```bash
npm start
```

Run an interactive local comment loop:

```bash
npm run dev:chat
```

Type `/exit` to quit.

Inspect production wiring without exposing configured values:

```bash
npm run dev:config:doctor
```

Verify the game observation -> approval -> simulated game-control bridge:

```bash
npm run dev:game-control:roundtrip
npm run dev:game-control:failure-roundtrip
npm run dev:gameplay:policy-gate-roundtrip
npm run dev:gameplay:validation-gate-roundtrip
npm run dev:vision:game-roundtrip
```

Run a local HTTP development server:

```bash
npm run dev:server
```

Run the local TTS/Live2D/subtitle bridge and consume one batch of generated engine jobs:

```bash
npm run dev:bridge
npm run dev:bridge:roundtrip
npm run dev:bridge:engine-roundtrip
npm run dev:bridge:error-roundtrip
npm run dev:bridge:status-roundtrip
npm run dev:bridge:worker
npm run dev:obs:roundtrip
npm run dev:obs:failure-roundtrip
npm run dev:obs:render-handoff-roundtrip
npm run dev:obs:runtime-render-roundtrip
npm run dev:engine:probe
npm run dev:engine:invalid-audio-roundtrip
npm run dev:engine:invalid-live2d-roundtrip
npm run dev:engine:unsafe-roundtrip
npm run dev:obs:probe
npm run dev:obs:setup
npm run dev:obs:unsafe-roundtrip
npm run dev:live2d:bridge
npm run dev:live2d:roundtrip
npm run dev:live2d:unsafe-roundtrip
npm run dev:voicevox:bridge
npm run dev:voicevox:roundtrip
npm run dev:voicevox:unsafe-roundtrip
```

When original anime voice env names are configured, the local engine worker and
`dev:engine:probe` forward them only as private TTS preferences and report only
licensed-source/use-category configured counts. Voice license values, contract text, raw voice
samples, datasets, model paths, endpoints, secrets, runtime payloads, candidates, and commands
remain outside public reports.

The bundled VOICEVOX/AivisSpeech and Live2D cue helper bridges are still local-only bridge
processes. `IRIS_VOICEVOX_ENDPOINT`, `IRIS_LIVE2D_RENDERER_ENDPOINT`, and
`IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT` must classify as loopback/private-network before the helper
bridges fetch engine health, synthesize audio, or forward renderer cues; public bridge health
surfaces only policy status and scope labels.
The VOICEVOX bridge accepts both numeric rates and IRIS speech-rate labels such as `lively`,
`fast`, and `tongue_twister_fast`, then maps laughter/scream/high-energy expression hints into
bounded VOICEVOX speed, intonation, pitch, volume, and phoneme-pause controls. These are engine
parameters only and never become commands or public text payloads.
The Live2D cue bridge applies the same adapter-only rule to autonomous expression. Scream, humming,
small dance, and loud-vocalise states are translated into bounded renderer motion, expression,
gaze, breathing, and camera hints while staying separate from OBS commands, game input, memory
writes, and Core canonical fields.
The unsafe helper-bridge roundtrips verify that request-side candidates are rejected before a TTS
engine fetch, and renderer acknowledgement echoes are rejected without returning renderer bodies.

After the worker renders TTS, Live2D, and subtitle jobs for the same event, it writes
`event_render_manifests.jsonl` and `latest_event_render_manifest.json` under
`IRIS_LOCAL_BRIDGE_ARTIFACT_DIR`. These local manifests group the three artifact paths for OBS or
engine-side synchronization, while public reports expose only manifest counts and summary IDs.

Pull one batch from configured HTTP bridge sources:

```bash
npm run dev:ingest:http
```

Verify approved memory and relationship persistence across runtime restarts:

```bash
npm run dev:persistence:roundtrip
npm run dev:persistence:candidate-gate-roundtrip
npm run dev:persistence:http-roundtrip
npm run dev:persistence:policy-gate-roundtrip
npm run dev:persistence:restart-roundtrip
npm run dev:persistence:live-readiness
npm run dev:persistence:status-roundtrip
```

Or start the dev server with a polling ingest loop:

```text
IRIS_ENABLE_HTTP_INGEST_SCHEDULER=true
IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT=http://127.0.0.1:9003/live-chat
IRIS_GAME_OBSERVATION_ENDPOINT=http://127.0.0.1:9004/vision/latest
IRIS_MEDIA_WATCH_ENDPOINT=http://127.0.0.1:9005/media/latest
IRIS_EXTERNAL_TOPIC_ENDPOINT=http://127.0.0.1:9006/topics/latest
```

For a local vision bridge that captures on demand, use the same ingest loop with a bounded POST
capture request:

```text
IRIS_ENABLE_HTTP_INGEST_SCHEDULER=true
IRIS_GAME_OBSERVATION_ENDPOINT=http://127.0.0.1:9004/vision/latest
IRIS_GAME_OBSERVATION_API_KEY=...
IRIS_GAME_OBSERVATION_TIMEOUT_MS=5000
IRIS_GAME_OBSERVATION_METHOD=POST
IRIS_GAME_OBSERVATION_ERROR_BACKOFF_MS=5000
IRIS_GAME_OBSERVATION_MAX_ERROR_BACKOFF_MS=60000
IRIS_GAME_CAPTURE_REGION={"x":0,"y":0,"width":1280,"height":720}
IRIS_GAME_OBSERVATION_INCLUDE_OCR_SUMMARY=true
IRIS_GAME_OBSERVATION_INCLUDE_UI_FOCUS_AREAS=true
IRIS_GAME_OBSERVATION_MAX_EVENTS=8
```

Optional subtitle bridge:

```text
IRIS_SUBTITLE_ADAPTER=http
IRIS_SUBTITLE_ENDPOINT=http://127.0.0.1:9007/subtitle
```

The local bridge exposes a counts-only render handoff status at:

```text
GET /event-render-manifests/status
GET /event-render-manifests/latest
GET /event-render-manifests/latest/artifact/tts
GET /event-render-manifests/latest/artifact/live2d
GET /event-render-manifests/latest/artifact/subtitle
```

After the worker completes TTS, Live2D, and subtitle artifacts for the same event ID, these endpoints
report completed manifest counts, latest safe IDs, artifact kinds, engine modes,
`obs_pickup_status`, `obs_handoff_readiness_status`, `obs_pickup_ready`, safe-reference booleans,
artifact-file availability booleans, per-adapter artifact freshness status, content types, and byte
counts plus `obs_pickup_blocking_adapter_*` summaries for OBS/operator tooling. They do not expose
artifact paths, packet text, raw jobs, candidates, commands, endpoint values, or secrets.
`obs_handoff_readiness_status` is a fixed
operator enum: `ready`, `waiting_for_manifest`, `waiting_for_complete_artifacts`,
`waiting_for_fresh_render`, `operator_action_required`, or `attention`. Unsafe manifest references
outside `IRIS_LOCAL_BRIDGE_ARTIFACT_DIR` are classified as
`unsafe_artifact_reference` without probing external file existence.
Set `IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS` when OBS/local pickup tooling should reject old
render groups; stale manifests are summarized as `stale_manifest`, and stale or clock-skewed grouped
artifacts are summarized as `stale_artifact`. Neither condition is served by the latest artifact
routes.
Malformed grouped artifacts are also rejected before OBS pickup: invalid WAV headers, invalid
Live2D cue JSON, and invalid VTT subtitles are summarized as `invalid_artifact`, and no artifact in
that group is served.
For HTTP TTS engines, the worker applies the same lightweight audio contract before artifact write:
declared WAV must look like RIFF/WAVE, MP3 like ID3 or an MP3 frame, and OGG like OggS. Use
`npm run dev:engine:invalid-audio-roundtrip` to verify MIME/content mismatches become
`invalid_audio_response` and stay out of the artifact directory.
For HTTP Live2D engines, the worker requires an accepted cue schema before artifact write. Use
`npm run dev:engine:invalid-live2d-roundtrip` to verify schema-less cues become
`invalid_live2d_response` and stay out of the artifact directory.
Before configured production probes are treated as ready, local engine health checks also honor
explicit engine readiness declarations such as `ok:false`, `ready:false`, or `attention`, while
keeping endpoint values, secrets, raw payloads, and declared schema lists out of public reports.
The `/artifact/*` routes are separate local read-only content delivery routes for the latest
complete manifest only. They serve the actual audio, Live2D cue JSON, or subtitle VTT by adapter kind
without accepting arbitrary file paths. Error responses remain summary-only and hide local paths,
raw jobs, text payloads, candidates, commands, endpoint values, and secrets while exposing only a
fixed `artifact_delivery_readiness_status`.
The main IRIS HTTP server also serves the same read-only manifest status, latest report, and latest
artifact routes when `IRIS_LOCAL_BRIDGE_ARTIFACT_DIR` is configured. This keeps `/obs/browser-source`
paths valid from the Browser Source origin while preserving the same path-hiding and stale-manifest
guards.
The `/overlay` Browser Source polls that same latest-manifest report and plays the fixed
same-origin latest TTS artifact route when the grouped manifest is pickup-ready. It still uses only
the guarded route, not arbitrary artifact paths or local filesystem values.
Use `npm run dev:bridge:render-manifest` to inspect the latest local manifest from
`IRIS_LOCAL_BRIDGE_ARTIFACT_DIR`. The report is summary-only by default; `IRIS_SHOW_LOCAL_PATHS=true`
must be explicitly set before local artifact paths are printed for operator debugging.
Use `npm run dev:obs:render-handoff-roundtrip` to verify that the main IRIS HTTP server's
`/obs/browser-source` handoff paths, latest manifest report, and latest-artifact delivery routes are
all valid from the same Browser Source origin.
Use `npm run dev:obs:invalid-artifact-roundtrip` to verify that a fresh manifest with one malformed
grouped artifact blocks all latest-artifact delivery with a summary-only 409 `invalid_artifact`
response.
Use `npm run dev:obs:stale-artifact-roundtrip` to verify that a fresh manifest with one old grouped
artifact blocks all latest-artifact delivery with a summary-only 409 `stale_artifact` response.
Use `npm run dev:obs:runtime-render-roundtrip` to verify the full local runtime path from
`POST /comment` through HTTP TTS/Live2D/subtitle adapter packets, local bridge outbox jobs, engine
worker artifacts, and main HTTP `/event-render-manifests/latest/artifact/*` delivery.

Direct YouTube Data API-style live chat polling can use the same ingest loop:

```text
IRIS_ENABLE_HTTP_INGEST_SCHEDULER=true
IRIS_YOUTUBE_LIVE_CHAT_SOURCE=youtube_api
IRIS_YOUTUBE_LIVE_CHAT_ID=...
IRIS_YOUTUBE_VIDEO_ID=...
IRIS_YOUTUBE_DATA_API_KEY=...
IRIS_YOUTUBE_OAUTH_TOKEN=...
IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN=...
IRIS_YOUTUBE_OAUTH_CLIENT_ID=...
IRIS_YOUTUBE_OAUTH_CLIENT_SECRET=...
IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH=data/youtube_live_chat_cursor.json
IRIS_YOUTUBE_LIVE_CHAT_ERROR_BACKOFF_MS=5000
IRIS_YOUTUBE_LIVE_CHAT_MAX_ERROR_BACKOFF_MS=60000
IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS=...
IRIS_YOUTUBE_BLOCKED_TEXT_TERMS=...
```

Verify YouTube API-style comments, support events, moderation-only events, OAuth refresh, and
approved memory/relationship persistence against local fixtures:

```bash
npm run dev:youtube:direct-live-chat-roundtrip
npm run dev:youtube:cursor-backup-roundtrip
npm run dev:youtube:cursor-roundtrip
npm run dev:youtube:failure-roundtrip
npm run dev:youtube:http-ingest-roundtrip
npm run dev:youtube:ingest-once
npm run dev:youtube:live-readiness
npm run dev:youtube:runtime-ingest-roundtrip
npm run dev:youtube:policy-gate-roundtrip
npm run dev:youtube:support-gate-roundtrip
npm run dev:youtube:roundtrip
npm run dev:youtube:status-roundtrip
```

The direct API source respects upstream polling cooldowns and applies bounded error backoff after
transport, contract, or video-to-live-chat discovery failures. It also honors bounded
`Retry-After` delays on retryable YouTube HTTP failures, and coalesces concurrent OAuth refresh
requests into a single in-flight token refresh. Public status exposes only fixed error kinds, retry
timing, cache/refresh counters, and counts, never live chat IDs, page tokens, endpoint values,
upstream error text, OAuth token values, blocked authors, blocked terms, or secrets. Configured
YouTube moderation filters run before runtime processing and report only filtered counts plus fixed
reason keys.
Known YouTube error reasons such as ended live chat, disabled chat, quota/rate limits, missing
resources, or auth failures are reduced to fixed retryability and operator-action flags. Ended,
disabled, missing-resource, and auth failures pause repeated direct API polling until the operator
restarts with corrected configuration.
`dev:youtube:direct-live-chat-roundtrip` covers the direct liveChatId path specifically and asserts
that video discovery is bypassed when `IRIS_YOUTUBE_LIVE_CHAT_ID` is already configured.
`dev:youtube:cursor-roundtrip` verifies that a local cursor store can resume direct polling after a
restart while public status hides the page token and cursor file path.
`dev:youtube:cursor-backup-roundtrip` verifies that a corrupt primary cursor can recover from the
sidecar backup and still hide both cursor and backup paths from public status.
`dev:youtube:http-ingest-roundtrip` starts the main IRIS HTTP server and verifies that
`POST /ingest/tick` can pull YouTube API comments and support events, update approved persistence,
and return only summary counts.
`dev:youtube:ingest-once` is the safe production one-shot for configured YouTube ingest. It runs
only after the YouTube preflight is ready and reports scheduler/runtime counts without live message
text, platform IDs, cursor values, endpoint values, raw scheduler results, candidates, or commands.
It also includes a compact live-readiness summary after the attempt so operators can see whether
the one-shot advanced source, access, scheduler, runtime, and support-pipeline readiness.
`dev:youtube:runtime-ingest-roundtrip` exercises the same scheduler/runtime handoff in-process and
then requires the production YouTube runtime status report to expose active, counts-only
comment/support telemetry without raw messages, IDs, cursor values, endpoint values, or candidates.
`dev:youtube:support-gate-roundtrip` verifies that a real support event still stops at the
validator stage when candidate persistence is disabled, making the missing persistence gate visible
without exposing support text or candidate objects.
`dev:youtube:policy-gate-roundtrip` verifies that an external relay target remains blocked by
configuration policy in preflight, launch plan, and runtime status before scheduler polling starts.

Verify the combined production-style loop across YouTube API ingest, POST vision capture, safe
game-control approval, TTS/Live2D/subtitle bridge handoff, engine-worker artifacts, and approved
memory/relationship persistence:

```bash
npm run dev:production-loop:roundtrip
```

The production-loop report includes counts-only YouTube support amount-source telemetry,
summary-only vision frame-age telemetry, and the same public persistence activity summary used by
`/persistence/status`. This helps confirm that donation amount handling, game observation
freshness, and approved memory/relationship writes are wired without exposing exact support
amounts, comments, frame IDs, screenshots, OCR text, paths, endpoints, secrets, candidates,
commands, or approved game actions. It also carries a compact
`production_live_readiness_summary` so the fixture proves foundation, YouTube, persistence, and
gameplay safe-control all reach ready with no remaining next gate.

Print the read-only production readiness runbook grouped by the current deployment priority:

```bash
npm run dev:production:live-readiness
npm run dev:production:next-task
npm run dev:production:probe
npm run dev:production:runbook
npm run dev:production:scheduler-enablement
```

`dev:production:live-readiness` is the live-operation gate above the four priority-specific
readiness reports. It reports the first blocking live gate and expected live-ready status using
only counts, booleans, fixed statuses, and script names. Each gate also names a safe local check
script and a `diagnostic_detail` object for engine-health, OBS health, and artifact-pickup counts,
so an operator can move directly from the first blocking gate to the relevant verification without
seeing endpoint or payload values.

`dev:production:next-task` is the smallest "keep going" operator view. It checks the four current
priorities in order and reports the first blocked gate plus safe local script names for status,
preflight, launch-plan, verification, runtime verification, the first blocked launch step's
launch/readiness scripts, and env-name-only configuration hints, plus the fixed expected runtime
status. It never includes endpoint values, secrets, live text, memory/relationship records,
candidates, commands, approved actions, raw frames, or OCR text. Each priority gate now carries a
schema-validated `diagnostic_detail`, and the current blocker is mirrored as `next_diagnostic_detail`.
Those details are restricted to booleans, nonnegative counts, and fixed labels for config readiness,
launch progress, runtime-flow expectations, and priority-specific setup state.
For the foundation priority it also carries `operator_startup_summary`, mirrored as
`next_operator_startup_summary` when foundation is blocked. That summary is deliberately small:
service/worker/setup counts, dedicated terminal count, and the next startup/readiness scripts plus
env-name-only configuration hints. Foundation also exposes `startup_checklist_script`, mirrored as
top-level `next_startup_checklist_script`, pointing to `npm run dev:foundation:startup-checklist`;
the YouTube, persistence, and gameplay gates keep that checklist pointer `null`.

`dev:production:scheduler-enablement` is the focused operator view for the shared HTTP ingest
scheduler. It compares the YouTube comments/support stage and the gameplay vision/safe-control
stage, then reports whether the next blocker is source/configuration, the scheduler env flag,
runtime scheduler availability, runtime start, or runtime rehearsal. The report is read-only and
never polls sources or controls the game; it contains only fixed statuses, booleans, counts, script
names, and `IRIS_*` env names.

`dev:production:probe` is the compact operator view: it combines config doctor, readiness runbook,
integration status, and guarded adapter probe results while hiding endpoint values, secrets, live
payloads, raw packets, candidates, commands, and game actions.
It also embeds the same next-task summary as `dev:production:next-task`, so the aggregate report
shows the first blocked priority, next launch/readiness scripts, env-name-only setup list, runtime
verification script, fixed expected runtime status, the safe next diagnostic detail, the safe
foundation startup-checklist script pointer, and the foundation startup summary without making the
operator switch views.
For production readiness, the first stage also requires the local render-manifest stale guard
(`IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS`) and artifact sync guard
(`IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS`) so OBS/local artifact pickup cannot silently reuse
old or desynchronized TTS/Live2D/subtitle artifacts. The live-ingest stages require
`IRIS_ENABLE_HTTP_INGEST_SCHEDULER=true`; direct YouTube API readiness also requires
`IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH` so page cursors survive restarts without appearing in
public reports.
Side-effect-capable local bridges must stay on loopback or private-network targets for the
production doctor to mark them ready. The report exposes only scope labels such as `loopback`,
`private_network`, `external`, or `invalid`; it never prints the configured URL. This applies to
runtime TTS/Live2D/subtitle bridges, local engine health/render endpoints, OBS setup/origin
targets, vision capture, and game-control bridges.
The production probe repeats those safe labels as stage and top-level counts so a release checklist
can detect blocked side-effect targets before any bridge probe or runtime handoff is allowed to run.
The local adapter fixture probe, engine health probe, OBS health/setup helpers, and local engine
worker also enforce this before network calls; blocked targets are reported as fixed error/status
labels and are not fetched.
`npm run dev:foundation:preflight` and `GET /production/foundation-preflight` are the compact
first-stage gate. They show the launch sequence plus TTS/Live2D/OBS integration ready/attention
counts, mode labels, missing env counts, and verification script counts only; endpoint values,
secrets, adapter packets, subtitle text, and render artifacts stay out of the report. Required env
names alone are not enough: if a side-effect target is external or malformed, the preflight reports
`blocked_by_configuration`.
`npm run dev:foundation:launch-plan` and `GET /production/foundation-launch-plan` expose the
same first-stage process order for the local VOICEVOX/Live2D helpers, local bridge, worker, dev
server, and OBS setup with process IDs, env names, and safe local npm script names only. The
detailed `foundation_launch_plan` additionally reports fixed local-target policy labels for engine,
runtime bridge, and OBS setup targets while still hiding configured values. The local bridge step
requires both render freshness and artifact-sync guard env names before the launch plan can mark
the OBS handoff path ready.
Its `operator_startup_plan` is the live-session startup map: it marks each process as a
long-running service, watch worker, or one-shot setup, reports how many dedicated terminals are
needed, and repeats the next startup script/readiness script plus env-name-only configuration hints
for the first blocked startup step.
`npm run dev:foundation:startup-checklist` and
`GET /production/foundation-startup-checklist` expose the same map as a one-page operator
checklist. It lists terminal labels, service/worker/setup counts, next startup/readiness scripts,
and `IRIS_*` env hints only, while rejecting endpoint values, raw text, memory or relationship
candidates, game input candidates, and commands.
`npm run dev:foundation:env-setup-plan` and
`GET /production/foundation-env-setup-plan` sit between the startup checklist and connector
handoff. They group the real TTS/Live2D/OBS lane into runtime adapters, local bridge storage, TTS
engine, Live2D engine, bridge worker, dev server, and OBS overlay env groups, then expose the first
blocked group through env names, connector IDs, safe script names, and fixed guidance labels only.
`npm run dev:foundation:connector-handoff` and
`GET /production/foundation-connector-handoff` expose the external-connector view beside that
startup checklist. The report orders the runtime TTS/Live2D/subtitle adapters, local bridge,
worker, dev server, real TTS/Live2D engines, OBS Browser Source, and optional OBS setup bridge,
then points to the first connector that still needs configuration using env names, safe npm
scripts, and schema names only.
The production runbook and aggregate production probe now embed this same startup view under their
`operator_launch_plan`, so the top-level live-readiness surfaces can guide local service startup
without requiring a separate foundation-launch-plan call.
Both the production runbook's `operator_launch_plan` and the dedicated `foundation_launch_plan`
publish the first blocked process through `next_step_id`, `next_step_order`, `next_launch_script`,
`next_readiness_script`, and `next_configure_env`. These fields are script-name-only and
env-name-only, so a supervisor can continue the setup loop without reading endpoints or secrets.
It also reports a runtime handoff verification summary that links this launch gate to foundation
status, foundation runtime status, foundation live-readiness, bridge status/engine roundtrips,
engine probe, and OBS render runtime roundtrip scripts with fixed expected readiness labels only.
`npm run dev:foundation:status` and `GET /production/foundation-status` provide the matching
read-only runtime handoff status. They summarize HTTP adapter configuration, local bridge worker
readiness, render-manifest availability, TTS/Live2D engine modes, and OBS Browser Source local
paths without engine calls or OBS setup side effects; endpoint values, secrets, packets, text,
artifact paths, candidates, and commands stay hidden.
`npm run dev:foundation:runtime-status` and `GET /production/foundation-runtime-status` are the
live first-stage handoff view once the HTTP runtime is up. They summarize overlay runtime health,
overlay event stream counts, local bridge worker readiness/queue counts, real TTS/Live2D engine
handoff status, and render-manifest OBS pickup readiness plus OBS Browser Source readiness without
exposing raw stream state, subtitle/display text, event IDs, endpoint values, route values, local
paths, artifacts, raw jobs, engine request values, candidates, or commands. The runtime summary
adds `next_runtime_check_script`, and each detailed flow adds `next_check_script`, using script
names only for the current blocker.
The render handoff section carries TTS/Live2D/subtitle artifact availability, artifact render-sync
status, artifact-contract status, pickup status, and OBS blocking status as booleans or fixed
labels, so operators can see which stream-side artifact condition is blocking OBS without receiving
paths or payloads.
`runtime_handoff_flow` condenses the same path into one status and blocking stage covering
foundation configuration, local bridge worker, real-engine handoff, OBS browser source, overlay
runtime, overlay event stream, and render-manifest pickup. It contains only counts, booleans, and
fixed statuses, plus a safe local next-check script name.
`real_engine_worker_flow` narrows that view to the local worker and real TTS/Live2D engine lane.
It distinguishes real-engine configuration, worker storage, runtime-job wait, pending work,
retry backoff, operator action, and worker attention using only readiness labels, queue counts,
retry/job-expiry guard flags, and policy booleans. Raw jobs, engine request values, endpoints,
artifact paths, text, candidates, and commands stay hidden; its next-check script follows the
current worker or engine blocking stage.
`obs_render_artifact_flow` is the narrower OBS pickup lane for the same first stage. It reports
latest-manifest availability/freshness, grouped TTS/Live2D/subtitle artifact availability,
contract validity, pickup readiness, and worker/engine gating as counts, booleans, and fixed
statuses only; artifact bodies, local paths, event IDs, text, endpoints, and raw jobs stay hidden.
Its next-check script points only to a render-manifest or OBS pickup diagnostic script.
The final `ready_for_obs_runtime_handoff` status is blocked until the local worker queue is clear,
real-engine handoff is ready or active, OBS Browser Source routes are ready, overlay/event stream
runtime is present, and the latest render manifest is ready for OBS pickup.
`npm run dev:foundation:live-readiness` and
`GET /production/foundation-live-readiness` add the live-operation gate on top of that handoff:
runtime handoff must be ready, real TTS/Live2D health probes must pass declared compatibility,
configured OBS setup bridge health must pass, and local endpoint policy must have zero blocked
targets. It also separates `real_engine_gate` from `obs_gate`, so engine health/worker-queue
blockers are distinguishable from OBS Browser Source or grouped artifact-pickup blockers. It is
read-only and embeds `env_setup_plan_summary` plus `connector_handoff_summary`, compact
count/status views of the next env group and connector to configure. It also reports
`next_gate_id`, top-level `next_check_script`, and per-gate `check_script` plus
`next_check_script` values as booleans, counts, fixed statuses, env names, and script names only.
Ready gates keep their `next_check_script` as `null`; attention gates point to the blocked runtime
flow or gate diagnostic.
`npm run dev:production:live-readiness` and `GET /production/live-readiness` sit above the four
priority-specific live-readiness reports. They select the first blocking priority, expose compact
gate summaries plus gate-specific normal check scripts and actionable `next_check_script` values
for foundation, YouTube ingest, persistence, and gameplay, and keep all endpoint values, live
payloads, memory/relationship records, candidates, approved actions, raw frames, and commands out
of the operator response. The aggregate also carries the `/production/next-task` launch handoff as
top-level `next_launch_script`, `next_readiness_script`, `next_startup_checklist_script`,
`next_configure_env`, and, when foundation is blocked, `next_operator_startup_summary`. Each stage
also carries `startup_checklist_script`; only the foundation stage can point at
`npm run dev:foundation:startup-checklist`, and later stages must report `null`. These fields stay
constrained to local script names, `IRIS_*` env names, fixed labels, booleans, and counts.
Use `npm run dev:foundation:blocked-worker-roundtrip` to verify the failure side of that gate:
malformed local worker queue state keeps the runtime in `waiting_for_local_bridge_worker` without
leaking raw jobs, local paths, text, candidates, commands, endpoints, or secrets.
Use `npm run dev:foundation:policy-gate-roundtrip` for the configuration side: it verifies that an
external runtime bridge target blocks startup before adapter handoff and that public diagnostics
remain target-policy labels only. The same roundtrip also covers foundation runtime status, so
operator views stop at `local_target_policy_attention` without target values.
`npm run dev:youtube:preflight` and `GET /production/youtube-preflight` apply the same compact gate
to comments/support ingest, including YouTube source/auth/cursor readiness plus media-watch and
external-topic stage readiness without exposing IDs, cursors, endpoints, secrets, live text,
support messages, or candidates.
`npm run dev:youtube:launch-plan` and `GET /production/youtube-launch-plan` provide the matching
startup order for YouTube ingest. They summarize source path selection, direct API or relay target,
credential alternatives, cursor resume, and the HTTP ingest scheduler with env names and safe npm
script names only; endpoint values, OAuth/API secrets, live comments, support messages, payloads,
and candidates stay hidden.
The launch plan repeats the first blocked step at the top level through `next_step_id`,
`next_step_order`, `next_launch_script`, `next_readiness_script`, and `next_configure_env`, keeping
operator setup guidance to script names and env names only.
`npm run dev:youtube:env-setup-plan` and `GET /production/youtube-env-setup-plan` expose the same
handoff as five env groups: source selection, live-chat target, credentials, cursor resume, and
HTTP ingest scheduler. The report points to the first blocked group using fixed IDs, env names,
safe script names, and guidance labels only, with no platform IDs, endpoint values, credentials,
cursor values, live payloads, support messages, candidates, or commands.
The launch plan also includes a runtime poll verification summary for source status, ingest-once,
runtime status, scheduler roundtrip, cursor resume/backup checks, and the source-specific API or
relay roundtrip. It records that support events must reach the donation pipeline while relationship
and memory candidates remain validation-gated.
`npm run dev:youtube:source-status` and `GET /production/youtube-source-status` then provide a
read-only source adapter status before the scheduler starts polling. It reports only readiness
labels, auth mode labels, count telemetry, cursor-store health, retry state, and relay scope labels,
so IDs, cursor values, endpoints, credentials, live text, support messages, candidates, and
commands stay hidden.
`npm run dev:youtube:runtime-status` and `GET /production/youtube-runtime-status` add the live
operator view for that ingest path. They combine source/preflight readiness with the HTTP ingest
scheduler's counts-only status, so an operator can see whether YouTube ingest is blocked, ready but
stopped, actively polling, in retry backoff, or waiting on upstream cooldown. The same poll-flow
summary aggregates support-event type counts and amount-source counts without exposing source
names, comments, support messages, cursor values, endpoint values, secrets, candidates, or
commands. Its policy keeps comments and support events on separate runtime lanes: comments enter
the normal reaction pipeline, support events enter the donation/candidate pipeline, and both are
reported only after dedupe and moderation boundaries. The runtime report also summarizes the
support candidate gate from stream state: support
seen, donation reaction seen, candidate validation seen, persistence seen, approved-record counts,
the current blocking stage, and the same support-event type and amount-source counts, again without
raw stream state or candidate objects.
The same runtime report includes an `api_cursor_auth_flow` for the production YouTube access lane.
That flow separates direct API from relay mode and reports only fixed statuses, booleans, and
counts for auth readiness, chat-target resolution, restart cursor-store health, upstream cooldown
or retry backoff, operator-action requirements, and scheduler-produced comment/support events. It
does not expose live chat IDs, video IDs, cursor values, cursor paths, endpoint values, credential
values, payloads, text, candidates, or commands.
`npm run dev:youtube:live-readiness` and `GET /production/youtube-live-readiness` promote that
runtime view into the production gate for YouTube comments and support events. It requires source
configuration, direct API auth or relay selection, scheduler activity, runtime handoff, and
donation/candidate safety before it reports `ready_for_youtube_live_ingest`; otherwise the
blocking gate is exposed as fixed statuses, booleans, counts, and script names only. The report now
publishes the first attention gate as `next_gate_id` plus top-level `next_check_script`, and each
gate has a safe `check_script` plus an attention-only `next_check_script`, so the runtime loop can
continue from the exact blocked diagnostic. Each gate includes a safe `diagnostic_detail` for
source config, access/auth/cursor state, scheduler activity, runtime handoff, and support candidate
pipeline counts without adding payload or cursor authority. Its support pipeline gate repeats support-event type and
amount-source-kind counts so operators can see support diversity without message text, platform IDs,
exact amounts, payloads, candidates, or commands.
The runtime report also includes an `ingest_hygiene_flow` for the production ingestion boundary. It
reports duplicate, ignored, and moderation-filtered item counts plus fixed policy booleans showing
that duplicate platform items, ignored items, and moderation-filtered events cannot double-trigger
comment reactions, donation reactions, or persistence candidates. It exposes only counts, statuses,
and booleans, never platform IDs, cursor values, live payloads, text, support messages, endpoints,
secrets, candidates, or commands.
`npm run dev:persistence:preflight` and `GET /production/persistence-preflight` apply the same
gate to approved memory, relationship, and vector-memory persistence. They expose stage and
per-integration readiness plus env names and script counts only; store paths, record summaries,
candidates, endpoint values, and secrets remain hidden.
`npm run dev:persistence:launch-plan` and `GET /production/persistence-launch-plan` provide the
matching startup sequence for JSON memory/relationship files, validation-gated candidate commits,
relationship-memory enablement, vector-memory search, and summary-only verification scripts. The
plan exposes only env names, fixed target-policy labels, and local npm scripts; records, profiles,
store paths, endpoint values, candidates, and secrets remain hidden.
It also publishes the first blocked persistence setup step as top-level next launch/readiness
scripts plus env names only, matching the production next-task handoff without exposing stores or
candidate payloads.
`npm run dev:persistence:env-setup-plan` and `GET /production/persistence-env-setup-plan` convert
that launch sequence into env groups for JSON store files, approval-gated persistence flags,
vector-memory search, and verification. The report publishes the first blocked group through env
names, fixed IDs, safe npm scripts, and guidance labels only.
It also includes runtime persistence verification for runtime status, approved-record flow,
candidate-gate flow, relationship-value flow, long-term recall flow, lifecycle flow, policy-gate
checks, restart survival, backup health, HTTP persistence, the local vector-memory bridge, and
vector-search roundtrips, keeping
candidate validation as the only route into approved memory or relationship schemas.
`npm run dev:memory-vector:bridge` starts the local IDs/scores-only bridge surface for
operator-owned vector-memory endpoint wiring without logging endpoint values, summaries, records,
candidates, commands, or secrets.
`npm run dev:persistence:policy-gate-roundtrip` verifies that an external vector-memory endpoint
blocks preflight, launch plan, and runtime status before memory-search requests can leave IRIS.
`npm run dev:persistence:runtime-status` and
`GET /production/persistence-runtime-status` combine that preflight with the live runtime status.
They expose capability flags, public counts, store health, activity age, persistence-operation
counts, backup-write counts, an approved-record flow summary, an identity-scope summary, a candidate
commit flow summary, a relationship-value flow, a long-term recall flow, and a
memory/relationship lifecycle flow only. The
relationship-value flow reports relationship profile counts, relationship-level distribution,
activity age, store operation health, and policy booleans proving relationship value changes stay
identity-scoped and validation-gated. The long-term recall flow reports approved-memory readback,
per-user relationship recall, restart durability, memory type/owner-scope counts, and vector-recall
readiness as policy booleans and counts only. The lifecycle flow combines configuration, user-scoped
approved records, relationship-memory completeness, store durability, and candidate gate state as
fixed counts/statuses/policy booleans. The candidate commit flow includes memory/relationship store
operation and backup-write health labels, so durability attention blocks a clean commit signal;
records, profiles, summaries, hidden scores, store paths, endpoint values, candidates, and commands
remain hidden.
Runtime status also carries `next_runtime_check_script` plus each blocking runtime flow's
`next_check_script`, derived only from fixed blocking stages. The contract keeps those as local
script names and rejects unsafe fragments or blocker/script mismatches, preserving the no-record,
no-profile, no-candidate boundary while still giving the operator a precise next diagnostic.
`npm run dev:persistence:live-readiness` and
`GET /production/persistence-live-readiness` turn that runtime status into the priority-3
production gate. It requires configured stores, healthy memory/relationship operation and backups,
approved record availability, validation-gated candidate persistence, relationship values,
long-term recall, and restart-survival signals before reporting
`ready_for_persistence_operation`. The report exposes `next_gate_id`, top-level
`next_check_script`, and per-gate `check_script` plus `next_check_script` values so the operator can
continue from the exact blocked diagnostic. Each gate also carries a safe `diagnostic_detail` for
configuration flags, runtime counts, store health, validation-gated candidate commits,
relationship readiness, recall, and lifecycle state without exposing records, profiles, summaries,
store paths, candidates, or commands.
The live-readiness report also includes a compact env setup summary, so a blocked priority-3 gate
can point to the exact persistence env group and diagnostic script without exposing store paths,
endpoint values, records, profiles, summaries, candidates, or commands.
`npm run dev:gameplay:preflight` and `GET /production/gameplay-preflight` apply the same gate to
screen/vision ingest and approved game control. They expose stage and per-integration readiness,
method/scheduler booleans, and action counts only; raw frames, OCR text, input candidates,
approved actions, endpoint values, and secrets remain hidden.
`npm run dev:gameplay:launch-plan` and `GET /production/gameplay-launch-plan` provide the matching
startup sequence for the vision source, capture metadata, approved-control adapter gate, rate/stale
guards, and summary-only verification scripts. The plan exposes only env names, fixed
target-policy labels, safe local npm scripts, and counts, including required game-control adapter
runtime status and expiry-guard counter checks; frames, OCR text, candidates, approved actions,
endpoint values, and secrets remain hidden.
It repeats the first blocked gameplay setup step through top-level next launch/readiness scripts
and env names only, so safe-control setup never exposes raw observations, action candidates, or
approved actions.
`npm run dev:gameplay:env-setup-plan` and `GET /production/gameplay-env-setup-plan` convert that
launch sequence into env groups for the vision source, capture metadata, approved-control adapter,
rate/stale safety guards, and verification. The report exposes only the first blocked group, env
names, fixed IDs, safe npm scripts, and guidance labels.
It also includes runtime safe-control verification for gameplay runtime status, gameplay runtime
roundtrip, policy-gate blocking, validation-gate blocking, vision unsafe checks, game-control
failure/unsafe checks, and the production loop, while requiring validator-before-adapter and no
approved-action publication. It also requires fresh observation, summary-only vision handoff,
approved-schema-only game actions, no direct OS input, and no game actions being sent to non-game
adapters.
`npm run dev:gameplay:policy-gate-roundtrip` verifies that external vision and game-control
targets stop at configuration policy before screen polling or safe-control adapter handoff.
`npm run dev:gameplay:runtime-status` and
`GET /production/gameplay-runtime-status` combine the gameplay preflight with live scheduler and
stream-state summaries. They expose only source counts, vision telemetry counts, game-observation
status, validator status, safe-control status, boundary-audit status, a `game_vision_capture_flow`
summary, a `vision_to_safe_action_flow`, and a safe-control flow summary plus a safe-action lifecycle summary that names the
blocking stage with counts/statuses only. The vision-capture flow isolates screen polling,
observation availability, low-confidence handling, and frame/OCR availability counts before any
adapter decision. The vision-to-safe-action flow joins capture, observation, perception, proposal,
validation, and adapter acknowledgement while proving raw vision and model proposals never control
the game directly. The same policy requires fresh observations, blocks low confidence before the
adapter, forbids direct OS input, and keeps non-game adapters outside game-action delivery. The
report also carries the game-control adapter runtime summary and
expiry-guard counters, so expired approved actions become runtime attention without publishing the
approved action. Frames, OCR text, operation candidates, approved actions, endpoints, secrets, and
scheduler result payloads remain hidden.
The report also publishes `next_runtime_check_script`, and each blocking vision/control flow
publishes a stage-derived `next_check_script`. These are local script names only, so operators can
move from configuration, scheduler, vision capture, confidence, validator, adapter-status,
adapter-ack, or boundary-audit blockers to the correct diagnostic without exposing frames, OCR,
candidates, approved actions, endpoints, or shell fragments.
`npm run dev:gameplay:live-readiness` and
`GET /production/gameplay-live-readiness` promote that runtime status into the priority-4
production gate. It requires configuration, scheduler, vision capture, validation, adapter
readiness, adapter acknowledgement, safe-control lifecycle, and vision-to-safe-action gates before
reporting `ready_for_gameplay_safe_control`, while remaining read-only with no polling or control
side effects. The report exposes `next_gate_id`, top-level `next_check_script`, and per-gate
`check_script` plus `next_check_script` values only, so operators can continue from the blocked
diagnostic without publishing raw frames, OCR, action candidates, approved actions, endpoints, or
commands. Each gate includes a safe `diagnostic_detail` for configuration, scheduler, vision
capture, validation, adapter acknowledgement, safe-control lifecycle, and vision-to-action counts.
`npm run dev:gameplay:runtime-roundtrip` runs a fixture vision bridge through the HTTP ingest
scheduler and confirms the gameplay runtime status reaches `safe_control_active`. Its report keeps
the bridge endpoint, frame references, operation candidates, approved action payloads, and raw
scheduler results out of the public output while exposing only lifecycle status and adapter
request/accept/expiry counts.
`npm run dev:gameplay:validation-gate-roundtrip` runs a low-confidence fixture through the same
scheduler and confirms safe-control stops at the validator gate with no game-control bridge
request, while `game_vision_capture_flow` surfaces the confidence block as a status-only capture
stage. Its report keeps endpoints, frames, OCR text, operation candidates, approved actions,
commands, and raw scheduler results out of the public output.

Run the scripted regression scenario:

```bash
npm run scenario
```

Run the local readiness preflight:

```bash
npm run preflight
```

Useful endpoints:

```text
GET  http://127.0.0.1:8787/health
GET  http://127.0.0.1:8787/capabilities
GET  http://127.0.0.1:8787/candidate-reviews
GET  http://127.0.0.1:8787/debug
GET  http://127.0.0.1:8787/readiness
GET  http://127.0.0.1:8787/relationships?level=recognized&q=Hiro
GET  http://127.0.0.1:8787/memories?type=game_experience&q=Minecraft
GET  http://127.0.0.1:8787/memory-search?query=game
GET  http://127.0.0.1:8787/persona-profiles
GET  http://127.0.0.1:8787/languages
GET  http://127.0.0.1:8787/persistence/status
GET  http://127.0.0.1:8787/production/config-doctor
GET  http://127.0.0.1:8787/production/live-readiness
GET  http://127.0.0.1:8787/production/next-task
GET  http://127.0.0.1:8787/production/foundation-preflight
GET  http://127.0.0.1:8787/production/foundation-launch-plan
GET  http://127.0.0.1:8787/production/foundation-startup-checklist
GET  http://127.0.0.1:8787/production/foundation-connector-handoff
GET  http://127.0.0.1:8787/production/foundation-status
GET  http://127.0.0.1:8787/production/foundation-runtime-status
GET  http://127.0.0.1:8787/production/gameplay-preflight
GET  http://127.0.0.1:8787/production/gameplay-launch-plan
GET  http://127.0.0.1:8787/production/gameplay-env-setup-plan
GET  http://127.0.0.1:8787/production/gameplay-runtime-status
GET  http://127.0.0.1:8787/production/gameplay-live-readiness
GET  http://127.0.0.1:8787/production/persistence-launch-plan
GET  http://127.0.0.1:8787/production/persistence-env-setup-plan
GET  http://127.0.0.1:8787/production/persistence-preflight
GET  http://127.0.0.1:8787/production/persistence-runtime-status
GET  http://127.0.0.1:8787/production/persistence-live-readiness
GET  http://127.0.0.1:8787/production/readiness-runbook
GET  http://127.0.0.1:8787/production/youtube-preflight
GET  http://127.0.0.1:8787/production/youtube-launch-plan
GET  http://127.0.0.1:8787/production/youtube-env-setup-plan
GET  http://127.0.0.1:8787/production/youtube-source-status
GET  http://127.0.0.1:8787/production/youtube-runtime-status
GET  http://127.0.0.1:8787/production/youtube-live-readiness
GET  http://127.0.0.1:8787/integrations/contracts
GET  http://127.0.0.1:8787/integrations/fixtures
GET  http://127.0.0.1:8787/integrations/status
GET  http://127.0.0.1:8787/replay
GET  http://127.0.0.1:8787/state
GET  http://127.0.0.1:8787/overlay
GET  http://127.0.0.1:8787/overlay/status
GET  http://127.0.0.1:8787/obs/browser-source
GET  http://127.0.0.1:8787/ingest/status
POST http://127.0.0.1:8787/comment
POST http://127.0.0.1:8787/candidate-reviews/clear
POST http://127.0.0.1:8787/donation
POST http://127.0.0.1:8787/external-topic
POST http://127.0.0.1:8787/game-observation
POST http://127.0.0.1:8787/ingest/tick
POST http://127.0.0.1:8787/ingest/start
POST http://127.0.0.1:8787/ingest/stop
POST http://127.0.0.1:8787/idle-tick
POST http://127.0.0.1:8787/idle/start
POST http://127.0.0.1:8787/idle/stop
POST http://127.0.0.1:8787/integrations/probe
POST http://127.0.0.1:8787/media-watch
POST http://127.0.0.1:8787/scenario/run
```

Use `http://127.0.0.1:8787/debug` for local testing. It can send comments, send game observations, run short scenarios, control the idle scheduler, and inspect current affect, speech, motion, and performance cues.

Example local comment request:

```bash
curl -X POST http://127.0.0.1:8787/comment \
  -H "content-type: application/json" \
  -d "{\"text\":\"IRIS, hello\",\"display_name\":\"local_viewer\"}"
```

Use `http://127.0.0.1:8787/overlay` as the first OBS Browser Source target in local development.
Use `http://127.0.0.1:8787/obs/browser-source` to inspect the safe OBS Browser Source setup JSON.
Set `IRIS_HTTP_ORIGIN`, `IRIS_OBS_SOURCE_NAME`, `IRIS_OBS_SCENE_NAME`,
`IRIS_OBS_SOURCE_WIDTH`, `IRIS_OBS_SOURCE_HEIGHT`, and `IRIS_OBS_SOURCE_FPS` to make this
manual Browser Source config stable for OBS. `npm run dev:obs:browser-source` prints the same
configuration-only report without live payloads.
`npm run dev:obs:render-handoff-roundtrip` starts a temporary main HTTP server with a local render
manifest fixture and verifies the advertised OBS handoff paths plus local artifact delivery without
printing artifact bodies or local paths.
`npm run dev:obs:runtime-render-roundtrip` extends that check by generating the render manifest
from an actual runtime comment and local engine-worker drain, still hiding endpoint values, local
paths, text payloads, raw jobs, and artifact bodies. It also checks
`GET /production/foundation-runtime-status` after the worker drain, so the production priority view
must reach `ready_for_obs_runtime_handoff` with a clear local worker queue before the roundtrip is
considered clean. It also requires the safe OBS Browser Source runtime summary to report ready
without printing the Browser Source origin or route values.
Use `npm run dev:obs:roundtrip` to verify an external OBS setup bridge receives only operator setup
configuration and no live runtime payload. Use `npm run dev:obs:failure-roundtrip` to verify a
failing OBS setup bridge returns only a summary `attention` report with no response body, text,
candidates, commands, endpoint values, or secrets.
Use `POST /integrations/probe` or `npm run dev:probe` to verify TTS, Live2D, and subtitle bridge
readiness without exposing endpoint values or secrets. Fixture-post mode sends synthetic adapter
packets only.
The `/state` endpoint includes `last_payload_kind` and `last_game_context` for read-only game observation debugging.
HTTP game-observation source status uses fixed error kinds and bounded retry backoff only, so
transport failures cannot leak vision endpoint values, API keys, raw response text, raw frame
references, candidates, or commands, and a failing vision bridge is not polled continuously.

Example game observation request:

```bash
curl -X POST http://127.0.0.1:8787/game-observation \
  -H "content-type: application/json" \
  -d "{\"game_title\":\"Minecraft\",\"scene_summary\":\"The player is near lava with low health\",\"detected_events\":[\"lava nearby\",\"low health\"],\"player_state\":\"three hearts\"}"
```

## Current Adapters

- Input: local comment source / normalized YouTube-style comment
- Game input: read-only normalized game observation
- TTS: console adapter
- Live2D: console adapter
- OBS: local browser overlay polling `/state`
- Bridge probe: dry-run by default, optional synthetic fixture POST for HTTP TTS/Live2D/subtitle
- Local bridge: `npm run dev:bridge` accepts `/tts`, `/live2d`, `/subtitle`, and simulated
  `/game-control` requests. TTS/Live2D/subtitle jobs are written to
  `IRIS_LOCAL_BRIDGE_OUTBOX_DIR` for real engine workers. `npm run
  dev:bridge:status-roundtrip` verifies that bridge and worker status surfaces expose only counts,
  IDs, modes, artifact availability booleans, and boundary flags after jobs are queued and drained.
  `npm run dev:bridge:artifact-roundtrip` verifies local latest-artifact delivery without printing
  artifact bodies or local paths.
  Rejected bridge requests return fixed error kinds and boundary flags only, without raw exception messages, packet text,
  candidates, endpoint values, or secrets.
  Production readiness treats `IRIS_TTS_ADAPTER=http`, `IRIS_TTS_ENDPOINT`,
  `IRIS_LIVE2D_ADAPTER=http`, `IRIS_LIVE2D_ENDPOINT`, `IRIS_SUBTITLE_ADAPTER=http`,
  `IRIS_SUBTITLE_ENDPOINT`, `IRIS_LOCAL_BRIDGE_OUTBOX_DIR`, and
  `IRIS_LOCAL_BRIDGE_ARTIFACT_DIR` as a separate runtime handoff check before real engine health
  is considered complete.
- Local bridge worker: `npm run dev:bridge:worker` drains outbox jobs until idle and creates local
  artifacts in `IRIS_LOCAL_BRIDGE_ARTIFACT_DIR` with safe receipts. Use
  `npm run dev:bridge:worker -- --watch` for a live local session. TTS is currently a silent WAV
  placeholder by default, Live2D is cue JSON by default, and subtitles are WebVTT. When
  `IRIS_LOCAL_TTS_ENGINE_ENDPOINT` or `IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT` is set, the worker posts
  validated local engine requests to those bridges and stores returned audio/cue artifacts.
  Optional TTS voice/model/locale and Live2D model/scene env settings are included only as
  outbound `engine_preferences`; public reports expose configured booleans and env names only. Engine
  failures use bounded retry/backoff and expose only attempted, processed, failed, skipped,
  waiting, blocked, pending counts, fixed `worker_readiness_status`, and per-adapter
  `adapter_readiness_status` values:
  `not_configured`, `idle`, `work_pending`, `retry_backoff`, `operator_action_required`, `active`,
  or `attention`. Watch-mode startup output includes `worker_readiness_status`,
  `adapter_readiness_status`, engine modes, and retry policy without local path values. Worker
  command output hides local outbox/artifact path values by default; use
  `IRIS_SHOW_LOCAL_PATHS=true` only for local operator debugging. Optional
  `IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS` rejects stale outbox jobs before real TTS/Live2D engine
  calls and exposes only expired counts, freshness status, job age, and max-age policy. Optional
  TTS/Live2D engine health endpoints are read-only JSON probes. Their reports expose readiness,
  request/response compatibility, TTS output-format compatibility, status codes, and fixed error
  kinds only; raw health bodies, declared MIME lists, endpoints, secrets, jobs, candidates, and
  commands are rejected or omitted. The production probe and integration status surfaces carry only
  health status/counts, configured env names, and summary-only local worker diagnostics such as
  fixed engine modes and `adapter_readiness_public_status`.
- OBS setup bridge health is checked through optional `IRIS_OBS_BRIDGE_HEALTH_ENDPOINT` with
  `npm run dev:obs:probe`. It is a read-only JSON GET that reports readiness, setup-schema
  compatibility, status codes, and fixed error kinds only. It never posts setup, never touches
  overlay runtime state, and omits endpoint values, secrets, raw bridge bodies, text, candidates,
  and commands. Explicit unhealthy bridge readiness declarations such as `ok:false`,
  `ready:false`, or `attention` block a production probe pass. `dev:production:probe` carries this
  as summary counts/status only.
- OBS Browser Source manual mode is considered configured when `IRIS_HTTP_ORIGIN` is set. The
  setup bridge remains optional for automating source creation; if `IRIS_OBS_BRIDGE_ENDPOINT` is
  set, the production doctor also requires `IRIS_OBS_BRIDGE_HEALTH_ENDPOINT` before marking the
  bridge path ready.

Phase14/15 may include `performance_cue` hints such as `big_laugh`. These are adapter hints only; they do not change canonical `action_type` and cannot become direct game, memory, or world commands.
The local overlay reads the same cue and applies a small `big-laugh` animation for OBS browser-source previews.

Runtime keeps a short-term `affect_snapshot` for energy, amusement, focus, and warmth. It can adjust performance cue intensity, but the pipeline rejects it if it contains canonical or command fields.

Runtime also carries a static `persona_profile` for IRIS individuality. It is passed to response providers as a summary and rejected if it contains canonical or command fields.

`/persistence/status` reports only enabled flags, public counts, bounded-store retention limits, and
latest activity timestamps/ages for memory, relationship, replay, and candidate review surfaces. It
does not expose memory records, hidden relationship scores, candidate payloads, paths, or
commit/write authority.
`npm run dev:persistence:http-roundtrip` verifies the main HTTP server path from `/donation` and
`/comment` into approved memory/relationship persistence, then checks `/persistence/status`,
`/relationships`, `/memories`, and `/memory-search` without printing record payloads or store paths.
`npm run dev:persistence:candidate-gate-roundtrip` verifies that runtime candidate validation is
observed before memory store side effects, and that the candidate commit flow reaches a safe active
status while the memory/relationship lifecycle flow reports user-scoped approved persistence active
without printing live text, IDs, store paths, approved record payloads, raw candidates, commands,
endpoints, or secrets.
`npm run dev:persistence:status-roundtrip` verifies the same boundary after approved memory and
relationship writes have already happened.
`npm run dev:persistence:backup-roundtrip` verifies that both JSON stores create sidecar backups and
can recover from a corrupted primary file without printing memory text, relationship payloads, store
paths, or raw error messages.
`npm run dev:persistence:restart-roundtrip` verifies that approved memory and relationship records
survive a runtime restart and can be recalled without exposing summaries, raw candidates, store
paths, hidden scores, or commit/write authority.
Relationship JSON store reads validate persisted profiles before they can become runtime
relationship context. Private familiarity/affinity scores are allowed only inside the store; command,
candidate, direct-commit, endpoint, URL, or secret-bearing fields make the store report
`store_contract_failed`/`attention` and are not surfaced in public status.
The debug HTTP server's common rejection path returns fixed error kinds only, so invalid JSON,
unsafe scenario payloads, contract errors, raw request text, commands, candidates, endpoint values,
and secrets are not reflected in error responses.

Runtime creates `speech_cue` for TTS prosody, pauses, laugh breaths, and mouth timing. It is adapter-only and is rejected if it contains canonical or command fields.

Runtime creates `language_profile`, `speech_rate_profile`, `subtitle_cue`, and `tongue_twister_mode`
for multilingual voice routing, natural speech-rate variation, subtitles, and bounded short
tongue-twister attempts. Runtime also wraps `subtitle_cue` into a dedicated subtitle adapter packet
for OBS/browser subtitle bridges. `tongue_twister_mode` uses the local 21-language
`iris_tongue_twister_line_v1` catalog, and `/languages` exposes only static language metadata plus
phrase lengths and rights guards, not raw response text or side-effect candidates.

Runtime also creates `motion_cue` for Live2D breathing, blinking, gaze, and movement hints. It is adapter-only and is rejected if it contains canonical or command fields.

Runtime then creates `performance_plan`, a shared playback timeline for TTS and Live2D. It is rejected if canonical or command fields appear anywhere in the timeline.

Runtime creates `body_continuity`, a Phase16 MVP internal profile for breathing, gaze, posture, expression recovery, and physics coupling. It is rejected if canonical or command fields appear anywhere in the export.

Runtime creates `camera_proximity`, a Phase16 addendum internal profile for bounded viewer-facing closeups. It is sent only to the Live2D adapter packet as visual guidance and is rejected if it contains command, commit, candidate, score, or canonical fields.

Runtime creates `turn_rhythm`, a Phase17 MVP internal timing plan for pre-response delay, backchannels, repair allowance, topic-turn mix, and laughter recovery pauses. It is rejected if canonical or command fields appear anywhere in the export.

Runtime creates `affective_continuity`, a Phase18 MVP internal carryover plan for mood, laughter state, voice affect, and breath recovery. It is rejected if canonical or command fields appear anywhere in the export.

Runtime creates `personality_habit`, a Phase19 MVP internal habit hint for small IRIS-like reactions such as laugh aftertaste and game-focus mutters. It also includes an internal `character_catchphrase_profile` with phrase pools and repetition limits. It uses a local cooldown and is rejected if canonical or command fields appear anywhere in the export.

Runtime creates `expression_profile`, an internal adapter-readable plan for voice engine style, breath events, laughter recovery, and Live2D expression. It is rejected if candidate, command, commit, or canonical fields appear anywhere in the export, and it never approves game input or memory writes.

Runtime creates `autonomous_expression`, a Phase16/addendum internal profile for short screams, happy humming, compact dances, brief original vocalise, self-directed micro-actions, and latency bridge behavior. It is adapter guidance only, rejects command/candidate/commit/canonical fields, and cannot use copyrighted lyrics or existing melodies.

Runtime creates `relationship_deepening`, a Phase20 MVP internal relationship update candidate for known viewers. It is validation-gated, never passed to the relationship writer directly, and `/state` exposes only a sanitized summary without proposed score deltas or raw candidates.

Runtime creates `donation_reaction` for normalized donation events. It can create a validation-gated gratitude memory candidate, but it never commits memory or relationship state directly and is not passed to adapter packets.

Runtime creates `media_watch_reaction` for read-only non-game media observations. It can create a validation-gated media memory candidate and rights guard, but it never creates game input, world commands, or direct memory writes.
The optional HTTP media-watch source can feed these observations from a local video-analysis bridge,
while rejecting raw video/audio, transcripts, subtitles, lyrics, candidates, and canonical fields.

Runtime creates `external_topic_reaction` for read-only news, trend, and current-topic observations. It treats fetched topics as conversation seeds, not verified truth, and uses a truth guard for freshness, source trust, and high-risk categories.
The optional HTTP external-topic source can poll a local trend/news bridge for summary-only
observations. Raw article text, raw HTML, commands, candidates, canonical fields, and direct
memory/relationship writes are rejected before runtime.

The HTTP ingest scheduler applies the same stable priority order across source batches, then keeps a
short `event_id` dedupe window across bridge source batches. Duplicate events are skipped with
`skip_reason=duplicate_event` and are counted in `duplicate_count`; they are not passed through
runtime, memory validation, adapters, or overlay state updates.

Runtime creates `memory_recall`, a Phase21 MVP internal recall selector for approved memory records. It selects read-only memory IDs, filters private or sensitive summaries, applies a short cooldown, and `/state` exposes only counts and decision summaries.

Runtime creates `game_perception`, a Phase22 MVP read-only interpretation of game observations. It detects danger, opportunity, funny events, and commentary triggers without creating game input candidates.
Vision bridge observations may include only bounded metadata such as frame IDs, frame age,
capture region, OCR summary, and UI focus areas. Raw frames, raw pixels, and direct OCR transcripts
stay outside Core.

Runtime creates `game_commentary`, a Phase23 MVP commentary plan for game situations. It selects IRIS-like commentary modes, serious-focus states, viewer relationship context, and validation-gated laughter candidates without changing Core canonical decisions. Relationship context is reduced to safe familiarity/reference hints and never includes proposed score deltas or raw relationship candidates.

Runtime creates `game_player`, a Phase24 MVP game goal, viewer coordination context, strategy, and validation-gated `input_action_candidate`. The raw candidate is not included in adapter packets, public state, or replay logs, and relationship context cannot bypass game action validation.

Runtime creates `game_action_validation`, a Phase24 boundary validator. When `IRIS_ENABLE_GAME_CONTROL=true`, it can convert a safe `input_action_candidate` into `approved_game_input_action`; otherwise it reports `disabled`. Public state, replay logs, TTS packets, and Live2D packets never expose either raw candidates or approved game actions.
The validation result contract requires validator-before-adapter, approved-schema-only, no direct OS
input, rate-limit, and fresh-observation boundary flags. Approved actions must carry the fixed
`approved_schema_only_no_os_direct_input` safety policy before any game-control adapter can accept
them.
For `press_key`, the validator accepts only the documented game-safe `key_hint` allowlist exposed through `/integrations/contracts`; unsupported key hints are rejected before any adapter call.
If a vision observation includes `frame_age_ms` above `IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS`,
the validator rejects the action as `stale_observation`, so old screen reads cannot become fresh
game input.
Approved actions include only a bounded observation context with perception confidence, optional
frame age, max age, freshness status, and a raw-frame-forbidden flag; they do not include
screenshots, OCR text, or the raw `input_action_candidate`.
Approved actions also carry a short expiry window. The HTTP game-control adapter rejects expired
approved actions before fetch, so a delayed bridge handoff cannot execute an action from an old
screen observation.
All validation results also include an `observation_validation_summary` with confidence, frame age,
freshness status, and fixed rejection booleans only. This keeps stale and low-confidence rejections
debuggable without exposing screenshots, OCR text, raw candidates, or approved action payloads.
If `IRIS_GAME_CONTROL_MIN_INTERVAL_MS` is set above `0`, the validator also rejects otherwise valid
actions with `action_rate_limited` until the cooldown since the last approved action has elapsed.

Runtime can call a local `mock_game_control` adapter only with `approved_game_input_action`. The mock adapter is simulated and returns `executed: false`, so no OS/game input is sent during local development.

Runtime can also use `IRIS_GAME_CONTROL_ADAPTER=http` to POST only `approved_game_input_action` to a local game bridge. Successful HTTP responses are normalized into `iris_game_control_result_v1` and rejected if they echo candidates, approved action payloads, command fields, or commit fields. Failed HTTP responses are reduced to a safe `control_status: failed` summary without reading bridge response bodies, so a failing bridge cannot leak raw candidates, commands, endpoint details, or secrets back into runtime state.

Runtime creates `game_embodiment`, a Phase25 MVP body/voice plan for gameplay. It maps game danger, focus, celebration, and safe funny moments into compact breath, gaze, posture, voice affect, motion visibility, and recovery plans without creating game input.

Runtime creates `stream_lifecycle`, a Phase26 MVP stream/session continuity profile. It can propose validation-gated carryover and community memory candidates, but public state and replay logs expose only counts and safe summaries.

Runtime creates `human_likeness_evaluation`, a Phase27 MVP integrated score across body, rhythm, affect, personality, relationship, memory, game commentary/player, stream lifecycle, and safety integrity. It fails if raw candidates leak into adapter packets or if validation boundaries are bypassed.

Runtime creates `boundary_audit`, a Phase27 enforcement summary for cross-phase safety checks. It verifies adapter packets, candidate review summaries, game control approval, candidate persistence, memory recall read-only behavior, and internal-profile canonical-field isolation without exposing raw candidates or approved action objects.

Runtime appends safe candidate review summaries to the local candidate review queue. This lets developers inspect validation-gated memory, relationship, expression, game-input, and lifecycle candidates without exposing raw candidate objects or granting approval authority.

Runtime creates `candidate_validation` and `candidate_persistence` summaries. When `IRIS_ENABLE_CANDIDATE_PERSISTENCE=true`, safe donation, media, lifecycle, community, and relationship candidates can be converted into `approved_*` schemas before the existing persistence writers receive them. Public state exposes only counts and statuses.
The candidate persistence result contract requires approved-schema-only commits and summary-shaped commit results; raw candidates, record summaries, relationship scores, store paths, and exception text are rejected from that result boundary.

Runtime state also keeps bounded HTTP adapter response summaries for TTS and Live2D bridges when
those adapters return operational metadata. Public state and overlay status may show bridge status,
artifact availability, duration, sample rate, and viseme count, but never raw adapter packets,
commands, candidates, commits, or canonical Core fields. Non-JSON text acknowledgements from HTTP
TTS/Live2D/subtitle and game-control bridges are not retained as response bodies; runtime reports
only that a text response was omitted.

Runtime can also produce a readiness report for local development. It summarizes capabilities, safety gates, candidate review counts, and known production integration gaps without exposing raw candidates or side-effect authority.

Local engine health probes verify declared TTS response shape/audio MIME compatibility and Live2D
cue schema compatibility when engines advertise those capabilities. The public report exposes only
compatibility statuses and counts; endpoint values, secrets, sample audio, cue bodies, and declared
schema lists remain hidden.

Idle ticks can enter through `/idle-tick` to produce silent `idle_breath` motion between comments.
The optional idle scheduler can be enabled with `IRIS_ENABLE_IDLE_SCHEDULER=true` and controlled through `/idle/start`, `/idle/stop`, and `/idle/status`.

Scenario playback can enter through `/scenario/run`. Each scenario step is normalized as a normal comment, read-only game observation, donation event, media-watch observation, external topic observation, or idle tick; the endpoint rejects command fields before replay.
The scenario summaries include response language, subtitle language, subtitle overflow risk, and
tongue-twister enabled/language/length metadata so multilingual voice regressions can be checked
without exposing candidates or granting adapter authority. `scenarios/dev-multilingual-voice.json`
covers English, German, Urdu, and Polish local voice paths.

Viewer relationship memory can be enabled with `IRIS_ENABLE_RELATIONSHIP_MEMORY=true`. It is updated only through an `approved_relationship_record` after Phase15, then read back as a summary on the next interaction from that viewer.

Real TTS, Live2D, OBS, and vision integrations should be added behind these adapter boundaries. A
generic HTTP live-chat source, a direct YouTube Data API-style live-chat source, a generic HTTP
game-observation source, and a local HTTP ingest scheduler are available as read-only bridge
scaffolding before deeper production integrations are added. Game-observation HTTP endpoints are
also held to the same loopback/private-network policy used by local TTS/Live2D/OBS/game-control
bridges, so malformed or external vision targets are blocked before any fetch.
