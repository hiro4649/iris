# IRIS

IRIS is a realtime AI VTuber system built from the `IRIS_20240425` specifications.

Current development has the first safe Core MVP path through Phase15 plus Phase16-27 internal runtime exports:

```text
YouTube comment event
-> Phase01 intent
-> Phase02 reaction
-> Phase03 context
-> Phase04 action
-> Phase05 persistence evaluation
-> Phase06 state sync
-> Phase07 task/value review
-> Phase08 goal layer
-> Phase09 constraint layer
-> Phase10 strategy layer
-> Phase11 isolated economy/dependency guard
-> Phase12 staged self-improvement guard
-> Phase13 canon/continuity layer
-> Phase14 surface text
-> Phase15 final guard
-> Phase16-27 presence, personality, memory, game, stream, and evaluation profiles
-> Expression and autonomous profiles for voice, breath, laughter, scream, humming, dance, and Live2D expression
-> Phase24 game action validator and simulated mock game-control boundary
-> TTS / Live2D / subtitle adapter handoff
```

The canonical specification is stored in:

```text
docs/specs/IRIS_20240425/
```

## First Commands

```bash
npm test
npm start
npm run dev:chat
npm run dev:config:doctor
npm run dev:production:attention-digest
npm run dev:engine:failure-roundtrip
npm run dev:engine:invalid-json-roundtrip
npm run dev:engine:probe
npm run dev:engine:unsafe-roundtrip
npm run dev:foundation:runtime-status
npm run dev:foundation:runtime-summary
npm run dev:foundation:live-readiness
npm run dev:foundation:readiness-rehearsal
npm run dev:foundation:blocked-worker-roundtrip
npm run dev:game-control:failure-roundtrip
npm run dev:game-control:roundtrip
npm run dev:game-control:unsafe-roundtrip
npm run dev:gameplay:preflight
npm run dev:gameplay:launch-plan
npm run dev:gameplay:local-env-profile
npm run dev:gameplay:local-env-apply
npm run dev:gameplay:env-setup-plan
npm run dev:gameplay:runtime-status
npm run dev:gameplay:readiness-rehearsal
npm run dev:gameplay:runtime-roundtrip
npm run dev:gameplay:policy-gate-roundtrip
npm run dev:gameplay:validation-gate-roundtrip
npm run dev:vision:game-roundtrip
npm run dev:vision:unsafe-roundtrip
npm run dev:bridge
npm run dev:bridge:artifact-roundtrip
npm run dev:bridge:render-manifest
npm run dev:bridge:roundtrip
npm run dev:bridge:engine-roundtrip
npm run dev:bridge:error-roundtrip
npm run dev:bridge:outbox-corrupt-roundtrip
npm run dev:bridge:status-roundtrip
npm run dev:bridge:worker
npm run dev:streaming:local-runtime
npm run dev:obs:failure-roundtrip
npm run dev:obs:probe
npm run dev:obs:roundtrip
npm run dev:obs:setup
npm run dev:obs:unsafe-roundtrip
npm run dev:youtube:direct-live-chat-roundtrip
npm run dev:youtube:cursor-roundtrip
npm run dev:youtube:failure-roundtrip
npm run dev:youtube:roundtrip
npm run dev:youtube:relay-roundtrip
npm run dev:youtube:relay-status-roundtrip
npm run dev:youtube:local-env-profile
npm run dev:youtube:local-env-apply
npm run dev:youtube:env-setup-plan
npm run dev:youtube:runtime-ingest-roundtrip
npm run dev:youtube:support-gate-roundtrip
npm run dev:youtube:runtime-status
npm run dev:youtube:live-readiness
npm run dev:youtube:readiness-rehearsal
npm run dev:youtube:ingest-once
npm run dev:youtube:status-roundtrip
npm run dev:ingest:http
npm run dev:persistence:backup-roundtrip
npm run dev:persistence:candidate-gate-roundtrip
npm run dev:persistence:failure-roundtrip
npm run dev:persistence:local-env-profile
npm run dev:persistence:local-env-apply
npm run dev:persistence:env-setup-plan
npm run dev:persistence:policy-gate-roundtrip
npm run dev:persistence:preflight
npm run dev:persistence:roundtrip
npm run dev:persistence:restart-roundtrip
npm run dev:persistence:runtime-status
npm run dev:persistence:live-readiness
npm run dev:persistence:readiness-rehearsal
npm run dev:persistence:status-roundtrip
npm run dev:memory-vector:bridge
npm run dev:memory-vector:roundtrip
npm run dev:production-loop:roundtrip
npm run dev:production:live-readiness
npm run dev:production:next-task
npm run dev:production:probe
npm run dev:production:runbook
npm run dev:production:scheduler-enablement
npm run dev:admin:character-voice-settings
npm run dev:admin:dashboard
npm run dev:admin:integration-checklist
npm run dev:admin:operations-summary
npm run dev:admin:review-decision-gate
npm run dev:admin:review-decision-log-status
npm run dev:admin:review-auth-gate
npm run dev:admin:review-queue
npm run dev:admin:review-validator-handoff
npm run dev:admin:review-validator-preflight
npm run dev:admin:review-validator-run-plan
npm run dev:admin:safety-controls
npm run dev:probe
npm run dev:server
npm run preflight
npm run scenario
npm run scenario:suite
npm run smoke
```

For a low-output restart path during long-running development, start with
`npm run dev:admin:operations-summary`, then use
`npm run dev:production:attention-digest` for the focused production handoff.
Use `npm run dev:foundation:runtime-summary` and the lighter
`npm run dev:foundation:status` as the secondary foundation check. Use
`npm run dev:foundation:blocked-worker-roundtrip` only when those summaries
point at a runtime handoff issue. `npm run preflight` includes the same
required and missing lightweight script counts used by the public boundary
audit, and `npm run dev:public-report-boundary-audit` is the focused
counts-only boundary check when the catalog itself needs confirmation. This
lets operators confirm the compact restart catalog without opening large logs
or private payloads. The Admin Dashboard also shows the same script/count
restart path in its `Low Output Restart` section.

The Admin Operations Summary and Admin Dashboard also show anime identity
surface counts across anime reference profile, expression and motion, voice and
speech, IP governance, and voice license use categories. The dashboard label is
`Anime Identity Surfaces Ready`. This is for checking long-form anime character
identity readiness without exposing character reference materials, voice samples,
animation cuts, policy payloads, endpoints, candidates, commands, or setting
values.
The browser Admin Dashboard's Anime Character/Voice settings widget also shows
`IP Governance Ready` and `Voice License Ready` cards so operators can confirm
the anime/IP governance and voice-use license surfaces without opening raw
setting payloads.
The compact `npm run dev:admin:character-voice-settings:summary` check exposes
the same five-surface count for character, voice, performance, IP governance,
and voice license setup reviews.
The local HTTP `/admin/character-voice-settings/summary` endpoint returns the
same compact five-surface count for management UI and API checks without
including raw settings.

Response generation defaults to the local mock provider. Copy `.env.example` to `.env`
or `.env.local` if you want to wire a generic HTTP provider or local production-style
bridges later. IRIS dev CLIs and bridge/server entrypoints load `.env` first and
`.env.local` second, only for `IRIS_` variables; already exported shell variables win,
and readiness reports still expose env names only, never endpoint or secret values.
Use `IRIS_CHARACTER_PROFILE_ID=iris_game_comedian_mvp` for the more game-commentator-heavy IRIS
persona preset during local testing.

`npm run dev:bridge` starts a local HTTP receiver for TTS, Live2D, and subtitle adapter packets.
It is the safe stand-in bridge for wiring real engines: replace its internals with a real TTS
engine or Live2D SDK while keeping the same request/ack boundary. `npm run dev:bridge:roundtrip`
starts that bridge on a random local port and processes one IRIS comment through HTTP adapters.
For production-style readiness, the runtime handoff itself is now checked separately: set
`IRIS_TTS_ADAPTER=http`, `IRIS_TTS_ENDPOINT`, `IRIS_LIVE2D_ADAPTER=http`,
`IRIS_LIVE2D_ENDPOINT`, `IRIS_SUBTITLE_ADAPTER=http`, `IRIS_SUBTITLE_ENDPOINT`,
`IRIS_LOCAL_BRIDGE_OUTBOX_DIR`, and `IRIS_LOCAL_BRIDGE_ARTIFACT_DIR` so runtime packets can reach
the local bridge before the worker posts to real TTS/Live2D engines. Config reports expose only
those env names and booleans, never endpoint or key values.
The production config doctor also checks that side-effect-capable bridge targets are local in
scope. TTS/Live2D/subtitle bridge endpoints, local engine endpoints and health endpoints, OBS
origin/setup bridge targets, HTTP relay live-chat, media-watch, external-topic, vision capture,
and game-control bridges must classify as `loopback` or `private_network` before they are
considered ready. External or malformed targets are reported only as safe scope/status labels, not
as URL values.
The same local-scope policy is enforced before fixture adapter posts, TTS/Live2D engine health
probes, OBS health checks, OBS setup posts, and local engine worker POSTs. A blocked target returns
summary-only attention status and is not fetched.
The local bridge also exposes `/game-control`, which accepts only validator-approved game actions
and returns a simulated ACK without sending OS/game input. Engine-facing bridge jobs are written to
`IRIS_LOCAL_BRIDGE_OUTBOX_DIR` for TTS/Live2D/subtitle workers to consume. `npm run
dev:bridge:worker` drains pending jobs until the outbox is idle and writes local artifacts to
`IRIS_LOCAL_BRIDGE_ARTIFACT_DIR`: silent WAV/viseme placeholders for TTS, Live2D cue JSON, and VTT
subtitle files. Its public report contains only job IDs, counts, artifact availability, and
boundary flags. Set `IRIS_LOCAL_TTS_ENGINE_ENDPOINT` and `IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT` to
make the worker POST validated local engine requests to real local TTS/Live2D bridges. Optional
`IRIS_LOCAL_TTS_ENGINE_VOICE_ID`, `IRIS_LOCAL_TTS_ENGINE_MODEL`,
`IRIS_LOCAL_TTS_ENGINE_LOCALE`, `IRIS_LOCAL_LIVE2D_MODEL_ID`, and
`IRIS_LOCAL_LIVE2D_SCENE_ID` are forwarded only inside the outbound engine request as
`engine_preferences`; public status, probe, and worker reports show only env names or configured
booleans, never preference values. Use
`npm run dev:bridge:worker -- --watch` or `IRIS_LOCAL_BRIDGE_WORKER_WATCH=true` to keep draining
new jobs during a live dev session. `npm run dev:streaming:local-runtime` starts both the local
bridge and the worker watch loop as one supervised local streaming runtime. `npm run
dev:bridge:engine-roundtrip` starts fixture TTS/Live2D engines and verifies the full
runtime -> bridge -> outbox -> engine worker -> artifact path. The TTS engine response may use
`audio_base64` plus an `audio/*` `audio_mime` or an `audio_data_url` with an `audio/*` base64 data
URL. Live2D engine responses must include a `cue` object. Engine health probes can also declare
`supported_response_fields` so IRIS catches response-shape mismatches before a live job is sent.
`/integrations/fixtures` includes matching synthetic local TTS/Live2D engine requests, response
examples, and an operator-only OBS setup request so real bridge implementations can verify their
parser before live jobs are enabled.
`npm run dev:voicevox:bridge` starts a small VOICEVOX/AivisSpeech-compatible local TTS bridge. Set
`IRIS_LOCAL_TTS_ENGINE_ENDPOINT=http://127.0.0.1:9110/tts-engine`,
`IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT=http://127.0.0.1:9110/health`, and
`IRIS_VOICEVOX_ENDPOINT` to the local engine origin. The bridge blocks external or malformed
`IRIS_VOICEVOX_ENDPOINT` values before `/version`, `/audio_query`, or `/synthesis` is fetched, and
startup/health reports expose only local endpoint policy status plus scope labels.
It maps IRIS speech-rate labels and expression cues into conservative VOICEVOX `speedScale`,
`intonationScale`, `pitchScale`, `volumeScale`, and phoneme-pause controls, so fast speech,
laughter recovery, and high-energy delivery can reach a real TTS engine without exposing text or
endpoint values in public reports.
`npm run dev:voicevox:unsafe-roundtrip` verifies that unsafe runtime fields are rejected before
the bridge fetches the VOICEVOX-compatible engine, while the public error stays fixed and
summary-only.
`npm run dev:live2d:bridge` starts the companion Live2D cue bridge. It can run in cue-only mode or
forward validated `iris_live2d_renderer_cue_v1` payloads to
`IRIS_LIVE2D_RENDERER_ENDPOINT`; both renderer and renderer-health targets are limited to
loopback/private-network scope before any health or cue-delivery fetch is made.
The cue bridge now maps Phase16 autonomous expression IDs such as `surprise_scream`,
`happy_humming`, `happy_dance`, and `happy_loud_sing` into bounded renderer motion, expression,
gaze, breathing, and camera cues. These remain visual guidance only; they do not become OBS
commands, game input, memory writes, or canonical Core fields.
`npm run dev:live2d:unsafe-roundtrip` verifies that unsafe renderer acknowledgements are rejected
without returning renderer bodies, endpoints, candidates, commands, or secrets to IRIS reports.
`npm run dev:bridge:status-roundtrip` verifies that local bridge `/status` and engine-worker
status remain summary-only after TTS, Live2D, and subtitle jobs are queued and drained. It hides
endpoint values, raw packets, raw jobs, text payloads, candidates, commands, and secrets.
The bridge also exposes `/event-render-manifests/status`, a counts-only view of completed
event-level TTS/Live2D/subtitle render manifests for OBS/operator tooling, and
`/event-render-manifests/latest`, a safe latest-manifest report with per-adapter artifact
availability booleans. Both endpoints hide artifact paths, raw jobs, text payloads, candidates,
commands, endpoint values, and secrets.
Set `IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS` to make OBS/local pickup reject stale render
groups. Stale reports expose only freshness status and return a fixed `stale_manifest` artifact
delivery error, with no local paths or payloads.
Set `IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS` to reject a complete render group when the
TTS, Live2D, and subtitle artifacts were produced too far apart in time. Skewed groups return the
fixed `artifact_sync_skew` readiness error so OBS does not pick up mouth motion, audio, and
subtitles that are visibly out of sync.
The foundation doctor, runbook, preflight, and launch-plan gates treat both render guards as
required for the local adapter bridge before OBS pickup is considered ready.
When the latest manifest is complete, the local bridge can also serve the actual latest artifacts at
`/event-render-manifests/latest/artifact/tts`, `/event-render-manifests/latest/artifact/live2d`,
and `/event-render-manifests/latest/artifact/subtitle`. These delivery routes are local read-only
artifact pickup points for OBS/engine tooling; they reject arbitrary paths and their error responses
still hide local paths, raw jobs, text payloads, candidates, commands, endpoint values, and secrets.
OBS/browser pickup can pass the latest summary's `manifest_id` as `?manifest_id=...`; the bridge
rejects mismatches with a fixed readiness error so TTS, Live2D, and subtitle artifacts are not mixed
across render groups.
`npm run dev:bridge:artifact-roundtrip` verifies the delivery boundary without printing artifact
contents.
`npm run dev:bridge:render-manifest` prints the same operator-oriented render manifest report:
summary-only by default, with artifact paths included only when `IRIS_SHOW_LOCAL_PATHS=true` is
explicitly set for local debugging.
If an outbox JSONL line is malformed, the worker skips that line, continues processing valid jobs,
and reports only `invalid_json_line_count`; `npm run dev:bridge:outbox-corrupt-roundtrip` verifies
that malformed line contents and tokens never enter public reports.
Rejected bridge requests return fixed error kinds only, so invalid JSON or unsafe packet payloads
cannot echo raw error messages, text, candidates, endpoint values, or secrets back to callers.
`npm run dev:bridge:error-roundtrip` verifies that rejection path directly.
`npm run dev:bridge:worker` also hides local outbox/artifact path values by default; set
`IRIS_SHOW_LOCAL_PATHS=true` only during local operator debugging when those paths are needed.
`npm run dev:engine:probe` uses the same path against configured
`IRIS_LOCAL_TTS_ENGINE_ENDPOINT` and/or `IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT`; without those env vars
it exits cleanly with the required env names. Worker reports include attempted, processed, failed,
and pending counts; failed real-engine requests stay summary-only and remain pending for retry.
If `IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT` or `IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT` is set,
`dev:engine:probe` first performs a read-only JSON health check and reports only readiness,
compatibility, HTTP status, and fixed error kinds. Health responses must not echo text, jobs,
endpoints, tokens, candidates, or commands. Failed health responses are summarized without reading
their response body, and invalid `IRIS_LOCAL_ENGINE_TIMEOUT_MS` falls back to 5000 ms.
`npm run dev:production:probe` and `/integrations/status` include the same health readiness as
summary-only metadata, using env names and statuses only.
Retries are bounded by `IRIS_LOCAL_BRIDGE_WORKER_MAX_RETRY_ATTEMPTS` and delayed by
`IRIS_LOCAL_BRIDGE_WORKER_RETRY_BACKOFF_MS` / `IRIS_LOCAL_BRIDGE_WORKER_RETRY_MAX_BACKOFF_MS`;
backoff and blocked jobs are reported as counts only so watch mode cannot hammer a failing engine
forever. Invalid numeric worker settings fall back to the documented defaults instead of expanding
retry or drain bounds.
Set `IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS` to reject stale outbox jobs before they reach a real
TTS/Live2D engine. Expired jobs are persisted as summary-only receipts with fixed freshness status,
age, and max-age fields; raw text, local paths, endpoints, and secrets remain hidden.
`/integrations/status` and `npm run dev:production:probe` expose only whether this freshness guard
is configured and the fixed summary-only policy name, never the configured max-age value.
`npm run dev:engine:failure-roundtrip` verifies that behavior against a fixture failing TTS engine.
`npm run dev:engine:invalid-json-roundtrip` verifies that a `200 OK` non-JSON engine response is
rejected as `invalid_json` without retaining response text.
`npm run dev:engine:unsafe-roundtrip` verifies that even a `200 OK` engine response is rejected
when it echoes text, candidates, commands, or secrets, and that the failed job remains pending for
bounded retry with summary-only reporting. Non-JSON successful engine responses are classified as
`invalid_json`; invalid audio response shapes are classified as `invalid_audio_response`, invalid
Live2D cue shapes as `invalid_live2d_response`; public reports keep only fixed error kinds, counts,
IDs, and retry state.

`npm run dev:obs:roundtrip` starts a fixture OBS setup bridge and POSTs a safe
`iris_obs_bridge_setup_request_v1` generated from `/obs/browser-source`. This is operator setup
only: it can configure an OBS Browser Source URL and dimensions, but it is not a runtime expression
command and carries no live text, candidates, memory writes, game actions, or secrets.
`npm run dev:obs:setup` sends the same setup request to `IRIS_OBS_BRIDGE_ENDPOINT` when a real local
OBS setup bridge is configured. By default `IRIS_OBS_SETUP_CONTINUE_ON_ERROR=true` makes setup
failures return a summary-only `attention` report instead of exposing bridge response bodies; use
`npm run dev:obs:failure-roundtrip` to verify that boundary against a failing fixture bridge.
Operators can set `IRIS_OBS_SOURCE_NAME`, `IRIS_OBS_SCENE_NAME`, `IRIS_OBS_SOURCE_WIDTH`,
`IRIS_OBS_SOURCE_HEIGHT`, `IRIS_OBS_SOURCE_FPS`,
`IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE`, and
`IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE` before setup; dimensions are clamped to safe
OBS browser-source ranges, and public status/probe reports expose configured env names or booleans
instead of scene/source values.
`npm run dev:obs:unsafe-roundtrip` verifies that even a successful OBS setup ACK is rejected when
it echoes text, candidates, commands, endpoint values, authorization fields, or secrets.
If `IRIS_OBS_BRIDGE_HEALTH_ENDPOINT` is set, `npm run dev:obs:probe` performs a read-only JSON
health check before setup work. It reports only bridge readiness, setup-schema compatibility,
setup-ack compatibility, HTTP status, and fixed error kinds. If health declares
`supported_response_fields`, `response_fields`, `supported_ack_fields`, or `ack_fields`, IRIS
checks that setup ACKs can return either `bridge_status` plus `configured`, or `request_id` plus
`bridge_status`; raw bridge bodies, endpoint values, secrets, text, candidates, and commands are
rejected or omitted. Failed OBS health/setup responses are summarized without reading their
response bodies, and invalid `IRIS_OBS_BRIDGE_TIMEOUT_MS` falls back to 5000 ms.
`npm run dev:production:probe` includes the same OBS bridge
health status as counts/status metadata only.

`npm run dev:ingest:http` pulls one bounded batch from `IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT`,
`IRIS_GAME_OBSERVATION_ENDPOINT`, `IRIS_MEDIA_WATCH_ENDPOINT`, and/or
`IRIS_EXTERNAL_TOPIC_ENDPOINT`, then processes those events through the same scheduler and runtime
boundary used by the dev server.
`IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR=true` lets one failing source produce a summary-only
source error while the remaining sources continue; these reports omit raw payloads, text, endpoint
values, secrets, candidates, commands, and game actions.
Non-OK YouTube relay/API, vision, media-watch, and external-topic bridge responses are reduced to
fixed HTTP-status summaries without reading their response bodies.
HTTP relay live-chat, media-watch, external-topic, and vision bridge endpoints are treated as local
bridge targets: external or malformed URLs are blocked before fetch and reported only through fixed
local endpoint policy statuses. Direct YouTube Data API polling remains the external platform API
path.
The production config doctor uses the same local-scope rule for those HTTP relay/source bridges,
so a configured external relay URL stays `attention` instead of being treated as production-ready.
For a local on-demand vision bridge, set `IRIS_GAME_OBSERVATION_METHOD=POST`; IRIS sends only a
bounded `iris_vision_capture_request_v1` with capture-region and summary preferences, never raw
frames, pixels, OCR transcripts, game commands, candidates, or memory writes.
Use `IRIS_GAME_OBSERVATION_API_KEY` and `IRIS_GAME_OBSERVATION_TIMEOUT_MS` when the local vision
bridge needs operator-owned auth or a non-default request timeout; production config reports only
the env names and readiness booleans, never the endpoint or key values.
Use `IRIS_GAME_CAPTURE_REGION` JSON or scalar `IRIS_GAME_CAPTURE_X`,
`IRIS_GAME_CAPTURE_Y`, `IRIS_GAME_CAPTURE_WIDTH`, and `IRIS_GAME_CAPTURE_HEIGHT` to configure the
screen region for that request.
Vision bridge source status uses fixed error kinds only. Transport errors, endpoint values, API
keys, raw response text, raw frames, candidates, and commands are not exposed through status.
Failures apply bounded retry backoff with `IRIS_GAME_OBSERVATION_ERROR_BACKOFF_MS` and
`IRIS_GAME_OBSERVATION_MAX_ERROR_BACKOFF_MS`, so a failing vision bridge is not hammered.
Invalid vision numeric settings fall back to the documented safe defaults: 5000ms request timeout,
5000..60000ms backoff, and 8 detected events. POST capture regions are clamped to non-negative
coordinates and a bounded 1..16384px width/height before reaching a vision bridge. The HTTP
game-control adapter also clamps invalid `IRIS_GAME_CONTROL_TIMEOUT_MS` to a 5000ms default before
sending an approved action.

For direct YouTube Data API-style polling, use `IRIS_YOUTUBE_LIVE_CHAT_SOURCE=youtube_api` with a
live chat ID or video ID. It can authenticate with `IRIS_YOUTUBE_DATA_API_KEY`,
`IRIS_YOUTUBE_OAUTH_TOKEN`, or an OAuth refresh setup using `IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN`,
`IRIS_YOUTUBE_OAUTH_CLIENT_ID`, and `IRIS_YOUTUBE_OAUTH_CLIENT_SECRET`.
`npm run dev:youtube:direct-live-chat-roundtrip` verifies the production path where the operator
already knows `IRIS_YOUTUBE_LIVE_CHAT_ID`: it polls the liveChatMessages endpoint directly, confirms
that video discovery is not called, and keeps live chat IDs, page tokens, endpoints, credentials,
moderation terms, raw text, candidates, and commands out of the report.
`npm run dev:youtube:roundtrip` starts fixture YouTube/OAuth endpoints and verifies comment,
support-event, moderation-ignore, safe source counters, and approved persistence behavior without
exposing secrets. The OAuth refresh provider rejects unsafe successful refresh echoes containing
endpoint values, authorization fields, commands, candidates, or secret-bearing fields. OAuth
refresh failures expose fixed error kinds only, never raw transport messages, refresh tokens,
client secrets, access tokens, or endpoint values. Concurrent access-token requests are coalesced
into one in-flight refresh, so a burst of scheduler ticks cannot fan out multiple refresh-token
posts; public status exposes only cache/refresh counters and booleans.
The direct API source suppresses repeated YouTube item IDs before they reach the runtime, so
overlapping pages or retries cannot trigger duplicate reactions or duplicate persistence
candidates; public status reports duplicate counts only. Set
`IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW` to bound how many recent item IDs are remembered; the same
setting applies to the HTTP relay source.
Set `IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH` to persist the direct API `nextPageToken` locally
between restarts. The token is used only as the next upstream `pageToken`; source status reports
only whether a cursor exists plus read/write counts and fixed store error kinds. It never exposes
the page token, live chat ID, cursor file path, endpoint values, credentials, raw text, candidates,
or commands. `npm run dev:youtube:cursor-roundtrip` verifies that a second source instance resumes
from the saved cursor without leaking it in public reports.
Set `IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS` and/or `IRIS_YOUTUBE_BLOCKED_TEXT_TERMS` to apply an
operator-owned moderation filter before comments or support events reach the runtime. Public source
status reports only filtered counts and fixed reason counters; it never exposes blocked author IDs,
blocked terms, viewer text, support messages, or raw payloads.
Invalid YouTube numeric settings fall back to safe defaults: 5000ms request/refresh timeouts,
200 API max results, 5000 recent IDs for duplicate suppression, 5000..60000ms error backoff,
500..300000ms clamps for upstream `pollingIntervalMillis`, and 3600s OAuth expiry when a refresh
response returns an invalid `expires_in`. Public status exposes only the clamp policy and whether
the last interval was clamped, never the raw out-of-range upstream value.
After a transport or contract failure, including video-to-live-chat discovery failures, direct API
polling applies bounded backoff using `IRIS_YOUTUBE_LIVE_CHAT_ERROR_BACKOFF_MS` and
`IRIS_YOUTUBE_LIVE_CHAT_MAX_ERROR_BACKOFF_MS`. When YouTube returns a bounded `Retry-After` value
on a retryable HTTP failure, IRIS uses it as the minimum retry delay while still clamping to the
configured max backoff.
Public status exposes only retry timing, fixed error kinds, and counts; it never includes upstream
error messages, live chat IDs, endpoint values, page tokens, or secrets.
`npm run dev:youtube:failure-roundtrip` verifies that a failing YouTube API poll produces only a
summary source error, while unsafe response bodies, live chat IDs, page tokens, endpoint values,
transport error messages, and OAuth secrets stay out of reports.
`npm run dev:youtube:status-roundtrip` verifies that direct source status uses only boolean/count
fields and never exposes live chat IDs, video IDs, page tokens, endpoint values, or API keys.
`npm run dev:youtube:relay-roundtrip` verifies the alternate HTTP relay path for deployments where
an external bridge owns upstream YouTube access and IRIS receives read-only YouTube-like items. The
relay path accepts both YouTube-style `snippet` support events and flatter `author` / `message` /
`amount_display_string` support-event summaries, plus normalized `payload_kind: donation_event`
bridge summaries that are counted as `normalizedSupportEvent` when no native YouTube event type is
present. Direct and relay fixtures also cover gifted-membership receipt events; those are counted
as `giftMembershipReceivedEvent` with `membership_count` amount-source telemetry. Repeated relay
item IDs are suppressed before they reach the runtime, so duplicate relay pages cannot
double-trigger comments, support reactions, or persistence candidates.
`IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW` uses the same bounded duplicate memory for relay polling.
`npm run dev:youtube:relay-status-roundtrip` verifies that the relay source public status remains
counts-only and hides relay endpoint values, API keys, viewer text, support comments, raw payloads,
candidates, commands, moderation terms, and game actions. Relay source failures use fixed
`last_error` kinds and timestamps only, not raw transport or bridge error text; duplicate and
moderation status reports counts only, not seen item IDs, blocked authors, or blocked terms.
`npm run dev:youtube:policy-gate-roundtrip` verifies the configuration side of the relay path:
an external relay target blocks preflight, launch plan, and runtime polling before scheduler
handoff, while public diagnostics expose only fixed target-policy labels.
`npm run dev:youtube:runtime-status` and `GET /production/youtube-runtime-status` combine the
YouTube preflight, source adapter status, and HTTP ingest scheduler status. They report whether
polling is active, waiting for scheduler start, or blocked by configuration, with a poll-flow
summary plus scheduler counts only, including support-event type counts and amount-source counts,
plus the support-candidate gate status from stream state. The policy keeps ordinary comments as
comment events and support events as donation events, so support payloads cannot be counted as
comments or bypass the donation/candidate gate. A top-level `api_cursor_auth_flow`
separates the direct YouTube API production lane from the relay lane and reports, as booleans,
fixed statuses, and counts only, whether auth is ready, the chat target is configured/resolved,
the restart cursor store is healthy, upstream cooldown/backoff/operator action is blocking, and
the scheduler has produced comment/support events. A top-level live-chat ingest flow joins
source polling, scheduler state, runtime comment/support observation, donation reaction handoff, and
the support-candidate gate into one fixed summary. A top-level ingest hygiene flow reports duplicate,
ignored, and moderation-filtered item counts, plus fixed policy flags proving those items cannot
double-trigger reactions or bypass the pre-runtime moderation boundary. The support-candidate section repeats the
support-event type and amount-source counts beside donation reaction, candidate validation, and
approved persistence progress, all as counts, statuses, and booleans only. The live-chat ingest
flow confirms comment handoff into the reaction pipeline and support-event handoff into the
donation pipeline after duplicate suppression and moderation filtering. It does this without live
comments, support messages, cursor values, endpoint values, secrets, raw stream state, candidates,
or commands. Runtime status now also exposes `next_runtime_check_script` plus each runtime flow's
`next_check_script`; these values are derived from the blocking stage and are script-name-only, so
operators can jump to the next safe diagnostic without receiving endpoints, shell fragments, or
live payload data.
`npm run dev:youtube:live-readiness` and `GET /production/youtube-live-readiness` fold that
runtime status into a production gate for comments and support: source config, direct API auth or
relay selection, scheduler activity, runtime handoff, and donation/candidate safety all have to be
ready before it reports `ready_for_youtube_live_ingest`. It stays read-only and emits only fixed
statuses, booleans, counts, and script names. It also exposes `next_gate_id` and top-level
`next_check_script`, and each gate carries its own `check_script` plus attention-only
`next_check_script`, so operators can jump directly from the first attention gate to the correct
safe diagnostic. Each gate also carries a safe `diagnostic_detail` with booleans/counts/status
labels for source config, access/auth/cursor state, scheduler activity, runtime handoff, and the
support candidate pipeline. Its support pipeline gate includes
support-event type counts and amount-source-kind counts, so Super Chat, stickers, memberships,
gifts, and other support events can be monitored without exposing message text, IDs, exact
amounts, or payloads.
`npm run dev:youtube:readiness-rehearsal` and
`GET /production/youtube-readiness-rehearsal` sit between live-readiness and the real poll. They
do not call YouTube or the relay. Instead they combine preflight, launch/env setup, source status,
runtime status, and live-readiness into a rehearsal that distinguishes a configured channel that is
safe to test with `npm run dev:youtube:ingest-once` from a server that is already live-polling.
The report exposes only env names, safe script names, booleans, counts, and fixed status labels,
and it keeps live payloads, support messages, platform IDs, cursor values, endpoints, secrets,
candidates, and commands out of the response.
`npm run dev:youtube:ingest-once` is the production operator one-shot for configured YouTube
ingest. It refuses to poll until the YouTube preflight is ready, then pulls only the YouTube source
through the scheduler and reports processed/comment/support/error counts without platform IDs,
cursor values, endpoint values, message text, candidates, or commands. The same CLI now embeds a
compact live-readiness summary after the attempt, including source/access/scheduler/runtime/support
gate statuses and support-event type counts, so the operator can see whether the one-shot poll
moved the channel toward `ready_for_youtube_live_ingest`. The compact runtime and live-readiness
summaries include only safe next-check script names or `null` when no operator action is needed.
`npm run dev:youtube:runtime-ingest-roundtrip` verifies the same production runtime path against
local fixtures by polling direct YouTube comments/support through the HTTP ingest scheduler,
updating stream state and approved persistence, then requiring `/production/youtube-runtime-status`
to report active scheduler telemetry with comment/support counts, support-event category counts,
runtime reaction handoff, donation-pipeline handoff, ingest hygiene counts, and validation-gated
persistence progress only.
`npm run dev:youtube:support-gate-roundtrip` verifies the negative operator case: support events
are ingested and donation reactions are created, but disabled candidate persistence is reported as
a validator-stage block without exposing the support message or candidate objects.

`npm run dev:production-loop:roundtrip` runs a fixture production-style tick across YouTube API
ingest, POST vision capture, safe game-control approval, local TTS/Live2D/subtitle bridge handoff,
engine-worker artifacts, and approved memory/relationship persistence. It now also exposes a
summary-only `production_live_readiness_summary`: foundation, YouTube, persistence, and gameplay
safe-control must all reach ready, with no next gate remaining and without exposing raw vision,
candidates, approved actions, endpoints, or commands.

`npm run dev:production:next-task` and `GET /production/next-task` collapse the four deployment
priorities into one read-only next-task gate: TTS/Live2D/OBS foundation, YouTube comments/support,
memory/relationship persistence, then game vision/safe control. The report returns the first
blocked priority, the matching status/preflight/launch-plan scripts, the runtime verification
script, the first blocked launch step's safe launch/readiness scripts plus env names to configure,
the fixed expected runtime status, and the required runtime flow summary/schema/success status
without endpoint values, secrets, live payloads, records, candidates, commands, or raw frames.
Each gate now also carries a safe `diagnostic_detail`, and the first blocked gate is mirrored as
top-level `next_diagnostic_detail`. These details are limited to booleans, counts, and fixed status
labels for configuration, launch-step progress, runtime-flow expectations, and stage-specific
readiness such as YouTube auth/cursor state, persistence/vector-memory flags, or gameplay
vision/control setup.
For the foundation priority, the same report also includes `operator_startup_summary` and mirrors
it as top-level `next_operator_startup_summary` when that priority is blocked. This is a compact
startup classification only: persistent services, the watch worker, one-shot OBS setup, dedicated
terminal count, and the next startup script/env names. The foundation gate also exposes
`startup_checklist_script`, mirrored as top-level `next_startup_checklist_script`, so the
production next-task view can point directly to `npm run dev:foundation:startup-checklist`.
Non-foundation gates keep this field `null`.

`npm run dev:production:scheduler-enablement` and
`GET /production/scheduler-enablement` focus on the shared HTTP ingest scheduler used by YouTube
live polling and gameplay vision polling. The plan separates env review, source/configuration
attention, scheduler runtime availability, scheduler start, and runtime rehearsal status for those
two stages. It never starts polling, never controls the game, and returns only statuses, booleans,
counts, safe script names, and `IRIS_*` env names.

`npm run dev:production:live-readiness` and `GET /production/live-readiness` sit on top of the
four runtime live-readiness reports. They keep the same priority order but use the stricter live
gates, showing the first attention gate and expected live-ready status without exposing endpoints,
payloads, memory/relationship records, candidates, approved actions, raw frames, or commands. Each
gate summary includes both the normal safe `npm run dev:*` check script and the current
`next_check_script`; the latter follows the first blocked live gate or runtime flow and is `null`
for ready gates, so operators can jump to the next local verification step without publishing
target values. The aggregate also mirrors `/production/next-task` through top-level
`next_launch_script`, `next_readiness_script`, `next_startup_checklist_script`, and
`next_configure_env`, all limited to safe local script names and `IRIS_*` env names. It also mirrors
`next_operator_startup_summary` when the foundation priority is blocked, so the live-readiness view
can show service/worker/setup counts and the next startup/checklist script without exposing
endpoints or payloads. Each stage carries `startup_checklist_script`; only the foundation stage
points at `npm run dev:foundation:startup-checklist`, while later priorities keep it `null`. Each
aggregate verification script catalog also includes `npm run dev:admin:review-auth-gate` and
`npm run dev:admin:review-validator-run-plan` so the private validator runner path remains visible
from the live-readiness surface without starting the runner or materializing validator input. Each
gate now also carries a
`diagnostic_detail` object with only fixed statuses, booleans, and counts such as engine-health
pass counts, OBS health status, and artifact pickup readiness.

`npm run dev:production:probe` aggregates the config doctor, readiness runbook, integration status,
and adapter probe into one priority-ordered report. It is read-only by default and reports only env
names, statuses, counts, and next commands; use `npm run dev:production:probe -- --fixture-post`
only when you want to send synthetic adapter packets to configured HTTP adapter endpoints.
It now also embeds the same next-task summary as `/production/next-task`, including the first
blocked deployment priority, launch/readiness scripts, env-name-only setup list, the runtime
verification script, the required runtime flow summary, and the fixed expected runtime status using
script/status/schema names only. The embedded summary also carries the same safe
`next_diagnostic_detail`, `next_startup_checklist_script`, `next_operator_startup_summary`, and
per-gate diagnostic/startup summaries, so the aggregate probe can show why the current priority is
blocked and what kind of local process/checklist comes next without exposing endpoints, payloads,
records, candidates, approved actions, or commands.
Its `verification_status` separates "configuration is present" from "real bridge probes are clean",
so health endpoint failures, TTS/Live2D request or response compatibility mismatches, and OBS health
attention stay visible without exposing endpoint values or payloads.
It also aggregates local endpoint policy counts at the top level and per priority stage, so
operators can distinguish missing local bridge configuration from an external or malformed
side-effect target without seeing URL values.

`npm run dev:config:doctor` prints a production wiring checklist using environment variable names
only. It never prints endpoint values, OAuth tokens, API keys, live text, candidates, or record
payloads.
`npm run dev:production:runbook` groups the same checks by deployment priority:
TTS/Live2D/OBS foundation, YouTube comments/support events plus media/topic summary ingestion,
persistence, then vision/game-control.
The first stage includes both the runtime HTTP adapter handoff into the local bridge and the
downstream real TTS/Live2D engine health checks, so a configured engine cannot mask a missing
runtime bridge endpoint.
The runbook is read-only and exposes env names plus verification scripts only.
Its `operator_launch_plan` also exposes the first blocked foundation step as `next_step_id`,
`next_step_order`, `next_launch_script`, `next_readiness_script`, and `next_configure_env`, using
safe local script names and env names only.
The same launch plan now embeds `operator_startup_plan`, a compact live-session startup map for
the VOICEVOX helper, Live2D helper, local bridge, bridge worker, dev server, and OBS setup. It
classifies each process as a long-running service, watch worker, or one-shot setup and mirrors the
next blocked startup step without exposing endpoint values or live payloads.
`npm run dev:foundation:preflight` and `GET /production/foundation-preflight` provide the compact
operator view for that first stage. They show launch readiness plus TTS/Live2D/OBS integration
ready/attention counts, mode labels, missing env counts, and verification script counts without
printing endpoint values, secrets, adapter packets, subtitle text, or render artifacts. If required
env names are present but a side-effect target violates the local endpoint policy, the preflight is
`blocked_by_configuration` instead of ready.
`npm run dev:foundation:launch-plan` and `GET /production/foundation-launch-plan` expose the
same safe launch sequence for the local VOICEVOX/Live2D helpers, local bridge, worker, dev server,
and OBS setup. They show process IDs, required env names, missing env names, safe local npm script
names, and the first blocked step's top-level next launch/readiness scripts plus env names to
configure. The local bridge launch step requires both stale-manifest and artifact-sync render guard
env names, so operators cannot launch an OBS handoff that silently reuses old or desynchronized
artifacts. The detailed `foundation_launch_plan` also flags local-target policy attention for
engine, runtime bridge, and OBS setup targets without exposing their configured values. It now also
includes `operator_startup_plan`, a schema-checked startup view that classifies each foundation
process as a long-running service, watch worker, or one-shot setup, counts dedicated terminal
requirements, and mirrors the next blocked startup step using safe script names and `IRIS_*` env
names only.
`npm run dev:foundation:startup-checklist` and
`GET /production/foundation-startup-checklist` turn that startup map into a single operator
checklist. It reports the required terminal labels, service/worker/setup counts, next startup
script, readiness script, and env-name-only configuration hints for the first blocked foundation
process. The checklist is read-only and forbids endpoint values, secrets, text payloads, memory or
relationship candidates, game input candidates, raw commands, and configured target values.
`npm run dev:foundation:env-setup-plan` and
`GET /production/foundation-env-setup-plan` group the real TTS/Live2D/OBS setup into seven
env-only lanes: runtime HTTP adapters, local bridge storage, real TTS engine, real Live2D engine,
bridge worker, IRIS dev server, and OBS overlay. Each lane reports only `IRIS_*` env names,
connector IDs, safe npm script names, fixed guidance labels, and ready/attention counts. The
top-level next item mirrors the first blocked lane, so operators can fill the next env group before
running the connector handoff, without exposing endpoint values, secrets, packets, candidates,
commands, or payloads.
`npm run dev:foundation:local-env-profile` and
`GET /production/foundation-local-env-profile` expose the matching safe local profile for the first
stage. The default CLI and HTTP surfaces list only env names, safe scripts, local route paths, and
operator labels. To render the concrete `.env.local` template for the local bridge, VOICEVOX helper,
Live2D cue helper, dev server, and OBS Browser Source, run
`npm run dev:foundation:local-env-profile -- --print-env`; that explicit flag is the only surface
that prints local URL values.
`npm run dev:foundation:local-env-roundtrip` and
`GET /production/foundation-local-env-roundtrip` parse that rendered template in memory and prove
that it would make the first-stage foundation checks and env setup lanes ready, without creating or
editing `.env.local` and without printing the template text or endpoint values.
`npm run dev:foundation:local-env-apply` and
`GET /production/foundation-local-env-apply-plan` add the final safe handoff into a local file. The
HTTP route and default CLI are dry-run only and expose env names/counts. The CLI materializes
`.env.local` only when run with `--materialize`; if `.env.local` already exists, it blocks instead
of replacing it unless `--replace-existing` is also provided.
`npm run dev:foundation:local-env-rehearsal` and
`GET /production/foundation-local-env-rehearsal` rehearse that generated local profile against the
foundation connector handoff, env setup, launch plan, startup checklist, and status gates without
creating files or calling engines. The report shows whether the next operator step is to
materialize `.env.local`, review an existing file, or start the first foundation process, using
only file names, env names, counts, booleans, and safe npm script names. If `.env.local` already
exists, the rehearsal checks that file's parsed `IRIS_*` values internally, so a non-local bridge
target or incomplete file blocks startup before TTS/Live2D/OBS processes are launched, without
printing the configured values.
`npm run dev:foundation:connector-handoff` and
`GET /production/foundation-connector-handoff` provide the matching external-connector map for
the same stage. It lists the runtime TTS/Live2D/subtitle HTTP adapters, local bridge, worker, dev
server, real TTS/Live2D engine contracts, OBS Browser Source, and optional OBS setup bridge as
ordered connector items. Each item exposes only readiness, fixed attention reason, `IRIS_*` env
names, safe npm scripts, and schema names, so a real engine or OBS bridge implementer can see the
next connection point without seeing endpoint values, secrets, runtime text, packets, candidates,
or commands.
`npm run dev:foundation:status` and `GET /production/foundation-status` summarize the configured
runtime HTTP adapter handoff, local bridge worker, render-manifest store, real TTS/Live2D engine
mode, and OBS Browser Source paths before any engine or OBS setup side effects run. It exposes only
booleans, counts, fixed status labels, and local path names; endpoints, secrets, adapter packets,
text payloads, artifact paths, candidates, and commands stay hidden.
`npm run dev:foundation:runtime-status` and `GET /production/foundation-runtime-status` add the
live handoff view for the same first stage. They combine foundation readiness, sanitized overlay
runtime health, overlay event stream counts, local bridge worker readiness/queue counts, real
TTS/Live2D engine handoff status, and OBS Browser Source readiness plus render-manifest pickup
status. The render handoff summary includes per-adapter TTS/Live2D/subtitle artifact availability,
artifact content-type class, nonempty-size status, artifact-contract status, pickup status, and OBS
blocking status as booleans or fixed labels only. It also exposes a boolean guard showing that
artifact pickup must match the latest manifest ID without revealing the ID value. The runtime
summary now includes `next_runtime_check_script`, and each flow summary includes
`next_check_script`, so operators can continue from the current blocked diagnostic using script
names only.
The `runtime_handoff_flow` section summarizes the full first-stage sequence from local bridge
worker, real TTS/Live2D engine handoff, OBS browser source, overlay runtime, event stream, and
render-manifest pickup to the final OBS runtime handoff using only counts, booleans, and fixed
statuses. Its `next_check_script` points to the first matching foundation, worker, engine, OBS,
overlay, or render-handoff check.
The `real_engine_worker_flow` section focuses on the local worker and real TTS/Live2D engine lane:
engine configuration, adapter readiness, pending/retry/blocked queue counts, job-expiry guard, and
operator-action state are visible as counts/statuses only, while raw jobs, engine request values,
endpoints, text, artifacts, candidates, and commands remain hidden. Its `next_check_script` follows
the current worker blocking stage without exposing queue contents.
The `obs_render_artifact_flow` section narrows that view to the OBS pickup lane: latest manifest,
TTS/Live2D/subtitle artifact availability, artifact render sync, artifact contracts, grouped pickup
readiness, and worker queue gating, again without artifact bodies, local paths, event IDs, text,
endpoints, or raw jobs. Its `next_check_script` stays a safe local npm script name.
The final `ready_for_obs_runtime_handoff` gate now requires a clear local worker queue, a ready or
active real-engine handoff, and OBS Browser Source readiness before overlay/render readiness can
pass. It does this without exposing stream state, display text, event IDs, endpoint values, route
values, local paths, artifacts, raw jobs, candidates, or commands.
`npm run dev:foundation:live-readiness` and
`GET /production/foundation-live-readiness` combine that runtime handoff gate with the configured
production probe. The report reaches `ready_for_live_obs_operation` only when the runtime handoff is
ready, both real TTS/Live2D health probes pass their declared request/response contracts, any
configured OBS setup bridge health probe passes, and local endpoint policy has no blocked targets.
It also exposes separate `real_engine_gate` and `obs_gate` summaries so operators can distinguish
TTS/Live2D engine health or worker-queue blockers from OBS Browser Source/artifact-pickup blockers.
The same report embeds `connector_handoff_summary`, a compact env-name/script-name-only view of the
next runtime adapter, local bridge, worker, real engine, or OBS connector that must be configured.
It also embeds `env_setup_plan_summary`, the same seven-lane env setup view reduced to counts,
booleans, fixed statuses, safe scripts, and the next env group.
It exposes `next_gate_id`, top-level `next_check_script`, and per-gate `check_script` plus
`next_check_script` values, but only as booleans, counts, fixed statuses, and script names. Ready
gates must keep their `next_check_script` as `null`; endpoint values, artifacts, text, jobs,
candidates, and secrets remain hidden.
`npm run dev:foundation:readiness-rehearsal` and
`GET /production/foundation-readiness-rehearsal` add the priority-1 dry rehearsal over the same
TTS/Live2D/OBS path. It recomputes status, launch/env setup, runtime handoff, and live-readiness
without starting bridges, calling engines, updating OBS, posting adapter packets, or creating local
files. The report keeps all attempt flags false and publishes only env names, safe script names,
fixed statuses, counts, and booleans.
`npm run dev:production:live-readiness` and `GET /production/live-readiness` aggregate the four
live readiness gates in priority order: TTS/Live2D/OBS foundation, YouTube comments/support,
memory/relationship persistence, then game vision/safe control. The aggregate reports the next
blocking priority, first attention gate, gate-specific normal check script, gate-specific
`next_check_script`, runtime-status script, expected live-ready status, and `/production/next-task`
launch guidance via `next_launch_script`, `next_readiness_script`, and `next_configure_env` without
embedding the underlying endpoint values, payloads, records, candidates, raw frames, commands, or
secret values.
`npm run dev:foundation:blocked-worker-roundtrip` verifies the negative case: a malformed worker
outbox blocks `ready_for_obs_runtime_handoff` even when a render manifest and overlay runtime are
otherwise present, and the report stays summary-only.
`npm run dev:foundation:policy-gate-roundtrip` verifies the configuration negative case: an
external runtime bridge target blocks foundation startup before TTS/Live2D/OBS handoff, while the
report exposes only fixed target-policy labels. It also checks the foundation runtime-status view
so operator handoff stays blocked with the same `local_target_policy_attention` reason.
`npm run dev:youtube:preflight` and `GET /production/youtube-preflight` provide the same compact
operator view for YouTube comments/support ingest. They show source/auth/cursor readiness plus the
whole comments/support stage, including media/topic ingest status and verification script counts,
without printing video IDs, cursor values, endpoints, secrets, live chat text, support messages, or
candidates.
`npm run dev:youtube:launch-plan` and `GET /production/youtube-launch-plan` expand that into a
safe startup sequence for direct Data API or local relay ingest. The plan lists source selection,
live-chat target, credential option groups, cursor resume, and scheduler steps using env names and
local npm script names only; it never prints endpoint values, OAuth/API secrets, chat text, support
messages, candidates, or payloads.
It repeats the first blocked step as top-level `next_step_id`, `next_step_order`,
`next_launch_script`, `next_readiness_script`, and `next_configure_env`, so operators can continue
the ingest setup loop from env names and safe local script names only.
`npm run dev:youtube:local-env-profile` and
`GET /production/youtube-local-env-profile` provide the priority-2 local env template profile for
direct YouTube API polling or a trusted relay. The JSON surface lists only env names, source-mode
labels, safe scripts, and operator labels; `-- --print-env` is required before any template values
are printed for local editing.
`npm run dev:youtube:local-env-apply` and
`GET /production/youtube-local-env-apply-plan` provide the guarded local-file handoff for those
same env names. The default mode is a dry run; the CLI appends or creates `.env.local` only with an
explicit `-- --materialize` flag and reports names/counts only, so endpoint values, secrets,
cursor values, payloads, candidates, commands, comments, and support messages stay out of the
operator JSON.
`npm run dev:youtube:env-setup-plan` and `GET /production/youtube-env-setup-plan` add the
matching env-group view for the same comments/support lane. It groups source selection, live-chat
target, credentials, cursor resume, and HTTP ingest scheduler setup, then exposes the first blocked
group through env names, safe script names, fixed IDs, and guidance labels only.
It also includes a runtime poll verification summary that connects source status, ingest-once,
runtime status, scheduler roundtrip, cursor-resume checks, and the source-specific API/relay
roundtrip while requiring support events to enter the donation pipeline without direct memory or
relationship commits.
The comment adapter rejects structured support markers such as Super Chat detail objects,
`payload_kind: donation_event`, amount fields, and membership gift counts, so support-shaped
upstream items cannot silently fall back into ordinary comment handling.
`npm run dev:youtube:source-status` and `GET /production/youtube-source-status` instantiate the
configured live chat source in read-only mode and return its public adapter status without polling.
The report exposes only readiness labels, auth mode labels, count telemetry, cursor-store health
flags, support-event type counts, support amount-source counts, and local-target scope labels; IDs,
cursor values, endpoints, secrets, live text, support messages, candidates, and commands remain
hidden.
`npm run dev:persistence:preflight` and `GET /production/persistence-preflight` show approved
memory, relationship, and vector-memory readiness as a stage-level operator gate. They expose only
status labels, booleans, env names, and script counts; store paths, record summaries, candidates,
endpoint values, and secrets stay hidden.
`npm run dev:persistence:launch-plan` and `GET /production/persistence-launch-plan` expand that
gate into JSON store, candidate/relationship flag, vector-memory bridge, and verification steps.
It reports env names, fixed target-policy labels, and safe local scripts only; memory records,
relationship profiles, store paths, vector endpoint values, candidates, and secrets stay hidden.
It also repeats the first blocked persistence setup step through top-level next launch/readiness
scripts plus the env-name-only configuration list, matching the foundation launch handoff contract.
`npm run dev:persistence:local-env-profile` and
`GET /production/persistence-local-env-profile` provide the priority-3 local env template profile
for approved memory/relationship persistence. The JSON report stays names/counts/scripts only, and
`-- --print-env` is required before any local template values are printed for operator editing.
`npm run dev:persistence:local-env-apply` and
`GET /production/persistence-local-env-apply-plan` provide the guarded `.env.local` handoff for the
same persistence env names. It is a dry run by default; the CLI appends or creates `.env.local` only
with an explicit `-- --materialize` flag, never overwrites existing values, and reports names/counts
only so store paths, endpoint values, records, profiles, summaries, candidates, commands, and secrets
do not enter public JSON.
`npm run dev:persistence:env-setup-plan` and `GET /production/persistence-env-setup-plan` add the
matching env-group view for persistence. It groups JSON store files, approval-gated persistence
flags, vector-memory search setup, and verification into the first blocked env group with env names,
safe script names, fixed IDs, and guidance labels only.
The launch plan also includes runtime persistence verification for runtime status, approved-record
flow, candidate-gate flow, relationship-value flow, long-term recall flow, lifecycle flow,
policy-gate checks, restart survival, backup health, HTTP persistence, and vector search checks
while keeping candidate validation as the only route to approved memory or relationship schemas.
`npm run dev:persistence:policy-gate-roundtrip` verifies that an external vector-memory bridge
target blocks preflight, launch plan, and runtime-status gates before any memory-search request,
while store paths, endpoint values, records, candidates, and secrets remain hidden.
`npm run dev:persistence:runtime-status` and
`GET /production/persistence-runtime-status` combine that preflight with live runtime persistence
status. They expose capability flags, store health, activity age, operation counts, backup-write
counts, public record/profile counts, an approved-record flow summary, identity-scope summary,
candidate commit flow summary, relationship-value flow, long-term recall flow, and a
memory/relationship lifecycle flow.
The relationship-value flow reports only relationship-level count distribution, profile/activity
counts, store health, and policy booleans proving relationship changes stay identity-scoped and
validation-gated. The long-term recall flow reports whether approved memory and per-user
relationship profiles can be read back after restart, including memory type/owner-scope counts,
store durability labels, vector-recall readiness, and fixed policy booleans only. The lifecycle flow ties
configuration, approved records, user-scoped relationship memory, store durability, and candidate
gate state into one counts/statuses/policy-only operator view. The candidate commit flow also
carries memory/relationship store operation and backup-write health labels so a commit cannot look
clean while durability is in attention; records, profiles, summaries, store paths, endpoint values,
candidates, and commands stay hidden.
The runtime status now includes `next_runtime_check_script`, and each blocking runtime flow includes
`next_check_script`. These values are derived from fixed blocking stages and remain script-name-only,
so operators can move from configuration, runtime, store, candidate-gate, relationship-profile, or
recall blockers to the next safe diagnostic without seeing records, profiles, paths, endpoints,
candidates, or shell fragments.
Candidate persistence results are contract-checked as approved-schema-only, summary-shaped commit
results, preventing raw candidate or approved-record details from entering public runtime surfaces.
`npm run dev:persistence:live-readiness` and `GET /production/persistence-live-readiness` combine
that runtime surface into the priority-3 production gate. It requires configured JSON stores,
healthy memory/relationship store operation and backups, approved record availability,
validation-gated candidate persistence, relationship-value readiness, long-term recall, and restart
survival before reporting `ready_for_persistence_operation`. It now exposes the first blocked
gate as `next_gate_id` plus top-level `next_check_script`, and each gate carries a safe
`check_script` plus attention-only `next_check_script`. Each gate also includes a safe
`diagnostic_detail` with only booleans, counts, and fixed status labels for configuration,
runtime counts, store health, candidate validation/commit, relationship readiness, recall, and
lifecycle state, while records, relationship profiles, store paths, summaries, candidates, and
commands stay hidden.
The live-readiness report also embeds a compact persistence env setup summary so the priority-3
operator view can jump directly from a blocked production gate to the exact env group and safe
diagnostic script without revealing store paths, endpoint values, records, profiles, or candidates.
`npm run dev:persistence:readiness-rehearsal` and
`GET /production/persistence-readiness-rehearsal` add the read-only rehearsal for that same gate.
It combines preflight, env setup, runtime status, and live readiness into one operator report while
setting `candidate_commit_attempt_performed` and `approved_record_commit_attempt_performed` to
`false`. The report distinguishes configuration/runtime/store blockers from a configured
validation-gated rehearsal path, and points to `dev:persistence:candidate-gate-roundtrip` without
exposing memory records, relationship profiles, candidates, store paths, endpoint values, or
commands.
`npm run dev:gameplay:preflight` and `GET /production/gameplay-preflight` do the same for
screen/vision ingest and approved game control. They show method/scheduler/action-count readiness
and per-integration stage status without raw frames, OCR text, input candidates, approved actions,
endpoint values, or secrets.
`npm run dev:gameplay:launch-plan` and `GET /production/gameplay-launch-plan` expand that gate
into launch steps for the vision source, capture metadata, approved-control bridge, rate/stale
guards, and verification. It reports only env names, fixed target-policy labels, safe local
scripts, and count booleans, including the required game-control adapter runtime status and
expiry-guard counter checks; raw frames, OCR text, candidates, approved actions, endpoint values,
and secrets remain hidden.
The plan also publishes the first blocked launch step as top-level next launch/readiness scripts
and env names only, keeping model action candidates and approved actions out of setup guidance.
`npm run dev:gameplay:local-env-profile` and
`GET /production/gameplay-local-env-profile` provide the priority-4 local env template profile for
vision capture and safe game-control setup. The public report lists only env names, counts, scripts,
and labels; `-- --print-env` is required before local template values are rendered.
`npm run dev:gameplay:local-env-apply` and
`GET /production/gameplay-local-env-apply-plan` provide the guarded `.env.local` handoff for those
gameplay env names. It is dry-run by default, materializes only with `-- --materialize`, appends
missing names only, and keeps endpoint values, raw frames, OCR text, input candidates, approved
actions, commands, and secrets out of public JSON. Game control is not made operational by the
template alone; the operator still has to explicitly enable it and provide an approved local
control bridge plus allowed actions.
`npm run dev:gameplay:env-setup-plan` and `GET /production/gameplay-env-setup-plan` add the
matching env-group view for gameplay. It groups the vision source, capture metadata, approved
control adapter, rate/stale safety guards, and verification so operators can continue from the
first blocked env group with env names, fixed IDs, guidance labels, and safe scripts only.
The launch plan also includes runtime safe-control verification for gameplay runtime status,
gameplay runtime roundtrip, policy-gate blocking, validation-gate blocking, vision unsafe checks,
game-control failure/unsafe checks, and the production loop, with validator-before-adapter and
no-approved-action-publication requirements. It also requires fresh observation, summary-only
vision handoff, approved-schema-only game actions, no direct OS input, and no game actions being
sent to non-game adapters.
`npm run dev:gameplay:policy-gate-roundtrip` verifies that external vision and game-control
targets block preflight, launch plan, and runtime-status gates before polling or approved-action
adapter handoff can occur.
`npm run dev:gameplay:runtime-status` and
`GET /production/gameplay-runtime-status` combine that gate with live scheduler and stream-state
summaries. They expose only source counts, vision confidence counts, game-observation status,
validator status, safe-control status, boundary-audit status, safe-control flow, a
vision-to-safe-action flow, and safe-action lifecycle status that pinpoint the current blocking
stage with counts/statuses only.
The runtime report now includes `next_runtime_check_script`, and each blocking vision/control
flow includes `next_check_script`, derived from the fixed blocking stage. These values stay local
script names only, pointing operators from configuration, scheduler, vision capture, confidence,
validator, adapter-status, adapter-ack, or boundary-audit blockers to the next safe diagnostic
without exposing frames, OCR, candidates, approved actions, endpoints, or shell fragments.
The vision-to-safe-action flow ties capture, observation, perception, player proposal, validation,
and adapter acknowledgement into one read-only summary proving raw vision and model proposals never
control the game directly. Its policy mirrors the adapter boundary: fresh observations are required,
low confidence blocks before adapter handoff, only approved schemas can reach game control, direct
OS input is forbidden, and non-game adapters never receive game actions.
Game-action validation now contract-checks validator-before-adapter, approved-schema-only, no direct
OS input, rate-limit, and fresh-observation boundary flags; approved actions also require the fixed
`approved_schema_only_no_os_direct_input` safety policy.
The same report now includes the game-control adapter runtime summary and expiry-guard counters,
so expired approved actions surface as runtime attention without exposing the approved action.
Raw frames, OCR text, operation candidates, approved actions, endpoints, secrets, and scheduler
result payloads stay hidden.
`npm run dev:gameplay:live-readiness` and
`GET /production/gameplay-live-readiness` turn those runtime summaries into the priority-4
production gate. It reports `ready_for_gameplay_safe_control` only after configuration,
scheduler, vision capture, validation, adapter readiness, adapter acknowledgement, safe-control
lifecycle, and vision-to-safe-action gates are all ready. It exposes `next_gate_id`,
top-level `next_check_script`, and per-gate `check_script` plus `next_check_script` values, but
remains read-only and never polls, controls the game, exposes frames/OCR, or publishes candidates
or approved actions. Each gate also carries a safe `diagnostic_detail` for config, scheduler,
vision capture, validation, adapter ACK, safe-control lifecycle, and vision-to-action counts.
`npm run dev:gameplay:readiness-rehearsal` and
`GET /production/gameplay-readiness-rehearsal` add the no-capture/no-control rehearsal for the same
priority-4 path. It combines preflight, env setup, runtime status, and live readiness while keeping
`capture_attempt_performed`, `game_control_attempt_performed`, and
`adapter_handoff_attempt_performed` false. It also reports that input-action candidates were not
forwarded to the adapter, and points to the next safe validation/vision/control diagnostic without
exposing frames, OCR text, candidates, approved actions, endpoint values, or commands.
`npm run dev:gameplay:runtime-roundtrip` runs a local fixture vision bridge through the HTTP
ingest scheduler into runtime and confirms the runtime status reaches `safe_control_active`
with vision-to-safe-action status, lifecycle status, and adapter request/accept/expiry counters available in the public report,
without exposing the bridge endpoint, raw frame references, operation candidates, or approved
action payloads.
`npm run dev:gameplay:validation-gate-roundtrip` runs a low-confidence vision fixture through the
same scheduler and confirms the safe-control flow stops at the validator gate with zero control
bridge requests. The report keeps endpoints, raw frames, OCR text, operation candidates, approved
actions, scheduler payloads, commands, and secrets hidden.

`npm run dev:server` can also run a polling ingest loop when
`IRIS_ENABLE_HTTP_INGEST_SCHEDULER=true`. The debug server exposes `/ingest/status`,
`/ingest/tick`, `/ingest/start`, and `/ingest/stop` for local bridge checks. `/ingest/status`
includes source-level count telemetry for YouTube comments/support events and vision requests
plus media-watch/topic item counts without exposing live chat IDs, page tokens, endpoints, raw
text, frame references, OCR text, candidates, or game actions. YouTube support-event type counts and
direct API request counters plus vision confidence/metadata telemetry are surfaced as fixed count
maps only.
Invalid ingest scheduler numeric settings fall back to 3000ms interval, 10 events per batch, and a
bounded duplicate-event window, while invalid idle scheduler intervals fall back to 8000ms.
Invalid dev-server HTTP port values fall back to 8787 before binding.
Rejected debug-server requests return fixed error kinds only; invalid JSON or unsafe scenario
payloads cannot echo raw request text, commands, candidates, endpoints, or secrets.

`npm run dev:probe` prints the safe TTS/Live2D/subtitle bridge readiness report. Run
`npm run dev:probe -- --fixture-post` only when local HTTP bridges are ready for synthetic fixture
packets. The report also summarizes local bridge worker and real TTS/Live2D engine readiness using
environment variable names only.
`npm run dev:foundation:runtime-status` and
`GET /production/foundation-runtime-status` add a read-only real-engine handoff summary for
TTS/Live2D engine modes, preference flags, worker queue counts, and completed manifest counts; it
also includes `real_engine_worker_flow` for retry backoff, operator action, and runtime-job
rendering state. The runtime summary and flow summaries expose only safe next-check script names
for the current blocker. It does not call engines and keeps engine request values, endpoints,
secrets, raw jobs, text payloads, artifact paths, candidates, and commands hidden.

Memory search defaults to local lexical ranking. `npm run dev:memory-vector:bridge` starts the
local vector-memory bridge surface for operator-owned endpoint wiring, and
`npm run dev:memory-vector:roundtrip` verifies the same IDs/scores-only bridge contract with a
fixture. Set `IRIS_MEMORY_SEARCH_ADAPTER=http_vector` and `IRIS_MEMORY_SEARCH_ENDPOINT` to test a
local vector-memory bridge that returns IDs/scores only.
The HTTP vector-memory endpoint is also limited to loopback/private-network scope because approved
public memory summaries still should not be sent to arbitrary external services.
Malformed vector-memory timeouts fall back to 5000ms, and malformed search limits fall back to 5.
Non-OK vector-memory responses are reduced to fixed HTTP-status failures without reading response
bodies, so private memory summaries, candidates, endpoints, and secrets cannot echo through errors.
Media-watch and external-topic HTTP sources use the same 5000ms safe timeout fallback and clamp
batch limits to bounded local polling windows with at most one bridge fetch per batch call. Their
public status is counts-only, and failed bridge response bodies are omitted.
`npm run dev:persistence:roundtrip` verifies local JSON memory and relationship persistence across
two runtime instances using approved schemas only. It uses a temporary directory by default; set
`IRIS_PERSISTENCE_ROUNDTRIP_DIR` to inspect a fixed local store, while the public report still
prints only storage availability, counts, retention limits, and relationship level telemetry.
The public status also includes latest activity timestamp/age telemetry for memory and relationship
stores, so operators can see that persistence is moving without reading stored summaries.
Approved memory writes are idempotent by stable memory/event key, so replayed candidates do not
create duplicate memory records or replace the first approved summary. Relationship writes apply
the same duplicate-record guard for approved relationship records.
`npm run dev:persistence:failure-roundtrip` verifies that malformed/unavailable JSON persistence
stores are reduced to summary-only commit failures. The runtime continues without exposing store
paths, raw error messages, approved record payloads, candidate payloads, live text, endpoint values,
or secrets. Public store status also reports only `health`, `read_error`, and fixed
`error_kind` values such as `store_parse_failed` or `store_contract_failed`.
The JSON writers reject direct unapproved memory/relationship record shapes; manually mixed
candidate records are treated as `store_contract_failed` and are never surfaced in public reports.
Relationship store reads also validate persisted profiles before using them as relationship
context. Hidden internal familiarity/affinity scores may remain in the private store, but command,
candidate, direct commit, endpoint, and secret-bearing fields make the store `attention` instead
of entering runtime context.
`npm run dev:persistence:status-roundtrip` writes approved memory and relationship records, then
verifies that the public persistence status still contains only enabled flags, counts, retention
limits, memory-type counts, owner-scope counts, relationship-level counts, latest activity
timestamps/ages, fixed store health/error kinds, and boundary flags. It must not expose memory text,
relationship summaries, hidden scores,
candidate payloads, approved record payloads, store paths, endpoint values, raw error messages, or
secrets.
Public memory summaries also sanitize metadata labels such as memory IDs, event IDs, display names,
store labels, source phases, and candidate-kind labels before they reach debug/API surfaces.
`npm run dev:persistence:restart-roundtrip` verifies the same stores after a fresh runtime instance
loads them and recalls a prior approved support memory without exposing summaries, candidates,
store paths, hidden scores, or commit/write authority.
Set `IRIS_MEMORY_STORE_MAX_RECORDS` and `IRIS_MEMORY_STORE_DEDUPE` to control the local memory
store retention policy; the default keeps the newest 5000 stable memory keys.
Set `IRIS_RELATIONSHIP_STORE_MAX_PROFILES` and `IRIS_RELATIONSHIP_RECENT_SUMMARY_LIMIT` to keep
local relationship memory bounded; the defaults keep 5000 profiles and 5 recent summaries each.
Invalid numeric retention values fall back to those defaults instead of expanding retention.
Relationship records are also idempotent by event/source key, so replayed approved records do not
double-increase familiarity or affinity.
`npm run dev:persistence:candidate-gate-roundtrip` verifies the runtime gate that turns only
validated persistence candidates into approved store side effects, then checks
`/production/persistence-runtime-status` style output for `candidate_commit_flow` and
`identity_scope_flow`, `relationship_value_flow`, `long_term_recall_flow`, and the
memory/relationship lifecycle flow
without printing live text, IDs, store paths, approved record payloads, raw candidates, commands,
endpoints, or secrets. The
identity-scope summary reports only policy booleans and store statuses, including that user-scoped
memory/relationship updates require approved records and candidates remain review-only.
For production readiness, `npm run dev:config:doctor` expects both
`IRIS_ENABLE_CANDIDATE_PERSISTENCE=true` and `IRIS_ENABLE_RELATIONSHIP_MEMORY=true` in addition to
the memory and relationship store paths.
The production persistence stage also checks `admin_review_private_runner_gate`, so
`npm run dev:production:runbook`, `npm run dev:production:next-task`,
`npm run dev:production:probe`, `npm run dev:production:live-readiness`, and persistence preflight
reports include the Admin Review auth-gate / validator run-plan script names before marking the
private validator runner path ready. These aggregate reports state that they do not start the
private runner or materialize validator input.
`npm run dev:game-control:roundtrip` verifies the read-only game observation -> validator ->
approved game-control bridge path while the local bridge remains simulated and the report hides the
local bridge URL and API key.
Set `IRIS_GAME_CONTROL_MIN_INTERVAL_MS` above `0` when a real game bridge should receive a bounded
action rate; otherwise valid actions are rejected as `action_rate_limited` before adapter handoff.
`npm run dev:game-control:failure-roundtrip` verifies that a failing HTTP game-control bridge is
reduced to a summary-only failed result without exposing response bodies, raw candidates, commands,
endpoint values, or secrets.
`npm run dev:game-control:unsafe-roundtrip` verifies that even a `200 OK` game-control bridge
response is converted to a failed `unsafe_response` result if it echoes candidates, commands,
endpoint values, authorization fields, or secrets.
`npm run dev:vision:game-roundtrip` verifies the POST vision capture request -> read-only
observation -> validator-approved game-control bridge path with no raw frame or raw candidate
payload entering Core; vision source status also hides endpoint and secret values.
`npm run dev:vision:unsafe-roundtrip` verifies that even a `200 OK` vision bridge response is
rejected when it echoes candidates, commands, raw frames, endpoint values, or secrets; source status
stays summary-only.

`npm run dev:server` starts a local HTTP entry point:

```text
GET  http://127.0.0.1:8787/health
GET  http://127.0.0.1:8787/capabilities
GET  http://127.0.0.1:8787/candidate-reviews
GET  http://127.0.0.1:8787/admin
GET  http://127.0.0.1:8787/admin/character-voice-settings
GET  http://127.0.0.1:8787/admin/dashboard
GET  http://127.0.0.1:8787/admin/integration-checklist
GET  http://127.0.0.1:8787/admin/operations-summary
GET  http://127.0.0.1:8787/admin/review-queue
GET  http://127.0.0.1:8787/admin/review-queue/decision-log-status
GET  http://127.0.0.1:8787/admin/review-queue/auth-gate
GET  http://127.0.0.1:8787/admin/review-queue/validator-handoff
GET  http://127.0.0.1:8787/admin/review-queue/validator-preflight
GET  http://127.0.0.1:8787/admin/review-queue/validator-run-plan
GET  http://127.0.0.1:8787/admin/safety-controls
GET  http://127.0.0.1:8787/debug
GET  http://127.0.0.1:8787/integrations/contracts
GET  http://127.0.0.1:8787/integrations/fixtures
GET  http://127.0.0.1:8787/integrations/status
GET  http://127.0.0.1:8787/readiness
GET  http://127.0.0.1:8787/relationships?level=recognized&q=Hiro
GET  http://127.0.0.1:8787/memories?type=game_experience&q=Minecraft
GET  http://127.0.0.1:8787/memory-search?query=game
GET  http://127.0.0.1:8787/persona-profiles
GET  http://127.0.0.1:8787/persistence/status
GET  http://127.0.0.1:8787/production/config-doctor
GET  http://127.0.0.1:8787/production/foundation-preflight
GET  http://127.0.0.1:8787/production/foundation-launch-plan
GET  http://127.0.0.1:8787/production/foundation-startup-checklist
GET  http://127.0.0.1:8787/production/foundation-env-setup-plan
GET  http://127.0.0.1:8787/production/foundation-local-env-profile
GET  http://127.0.0.1:8787/production/foundation-local-env-roundtrip
GET  http://127.0.0.1:8787/production/foundation-local-env-apply-plan
GET  http://127.0.0.1:8787/production/foundation-local-env-rehearsal
GET  http://127.0.0.1:8787/production/foundation-connector-handoff
GET  http://127.0.0.1:8787/production/foundation-status
GET  http://127.0.0.1:8787/production/foundation-runtime-status
GET  http://127.0.0.1:8787/production/foundation-live-readiness
GET  http://127.0.0.1:8787/production/foundation-readiness-rehearsal
GET  http://127.0.0.1:8787/production/live-readiness
GET  http://127.0.0.1:8787/production/gameplay-preflight
GET  http://127.0.0.1:8787/production/gameplay-launch-plan
GET  http://127.0.0.1:8787/production/gameplay-local-env-profile
GET  http://127.0.0.1:8787/production/gameplay-local-env-apply-plan
GET  http://127.0.0.1:8787/production/gameplay-env-setup-plan
GET  http://127.0.0.1:8787/production/gameplay-runtime-status
GET  http://127.0.0.1:8787/production/gameplay-live-readiness
GET  http://127.0.0.1:8787/production/gameplay-readiness-rehearsal
GET  http://127.0.0.1:8787/production/persistence-launch-plan
GET  http://127.0.0.1:8787/production/persistence-local-env-profile
GET  http://127.0.0.1:8787/production/persistence-local-env-apply-plan
GET  http://127.0.0.1:8787/production/persistence-env-setup-plan
GET  http://127.0.0.1:8787/production/persistence-preflight
GET  http://127.0.0.1:8787/production/persistence-runtime-status
GET  http://127.0.0.1:8787/production/persistence-live-readiness
GET  http://127.0.0.1:8787/production/persistence-readiness-rehearsal
GET  http://127.0.0.1:8787/production/readiness-runbook
GET  http://127.0.0.1:8787/production/youtube-preflight
GET  http://127.0.0.1:8787/production/youtube-launch-plan
GET  http://127.0.0.1:8787/production/youtube-local-env-profile
GET  http://127.0.0.1:8787/production/youtube-local-env-apply-plan
GET  http://127.0.0.1:8787/production/youtube-env-setup-plan
GET  http://127.0.0.1:8787/production/youtube-source-status
GET  http://127.0.0.1:8787/production/youtube-runtime-status
GET  http://127.0.0.1:8787/production/youtube-live-readiness
GET  http://127.0.0.1:8787/production/youtube-readiness-rehearsal
GET  http://127.0.0.1:8787/replay
GET  http://127.0.0.1:8787/state
GET  http://127.0.0.1:8787/overlay
GET  http://127.0.0.1:8787/overlay/event
GET  http://127.0.0.1:8787/overlay/events
GET  http://127.0.0.1:8787/overlay/events/status
GET  http://127.0.0.1:8787/overlay/status
GET  http://127.0.0.1:8787/obs/browser-source
POST http://127.0.0.1:8787/comment
POST http://127.0.0.1:8787/candidate-reviews/clear
POST http://127.0.0.1:8787/donation
POST http://127.0.0.1:8787/external-topic
POST http://127.0.0.1:8787/game-observation
POST http://127.0.0.1:8787/idle-tick
POST http://127.0.0.1:8787/idle/start
POST http://127.0.0.1:8787/idle/stop
POST http://127.0.0.1:8787/integrations/probe
POST http://127.0.0.1:8787/media-watch
POST http://127.0.0.1:8787/scenario/run
POST http://127.0.0.1:8787/admin/safety-controls/action
POST http://127.0.0.1:8787/admin/character-voice-settings/apply-plan
POST http://127.0.0.1:8787/admin/review-queue/action-plan
POST http://127.0.0.1:8787/admin/review-queue/decision
```

The `/admin` page is the first read-only Operator Admin Panel dashboard. It shows safe global
operation widgets, module readiness, and the next recommended setup action using fixed labels,
counts, and script names only. `/admin/dashboard` returns the same dashboard as safe JSON, and
`/admin/integration-checklist` returns the operator-facing integration readiness checklist.
`/admin/safety-controls` exposes emergency stop and pause state; mutating safety actions require
explicit confirmation where appropriate and write only safe in-memory audit summaries.
`/admin/character-voice-settings` exposes safe character and voice setting readiness; its apply
plan route is dry-run only and hides setting values, raw voice data, dataset paths, model paths,
secrets, endpoints, candidates, and commands.
`/admin/review-queue` exposes memory and relationship review summaries only. Its action-plan
route is dry-run only and returns operator review intent without exposing raw candidates or
committing approved memory or relationship records.
`/admin/review-queue/decision` records only a confirmed approve/reject decision summary for
validator handoff. It does not commit memory or relationship records, does not expose raw
candidates, and keeps approved records hidden.
Set `IRIS_ADMIN_REVIEW_DECISION_LOG_PATH` to persist those decision summaries across restarts.
`/admin/review-queue/decision-log-status` and `npm run dev:admin:review-decision-log-status`
report only counts and health, never the log path or decision payloads.
`/admin/review-queue/auth-gate` and `npm run dev:admin:review-auth-gate` report only
owner/admin confirmation status and required env names before any private runner handoff. Set
`IRIS_ADMIN_REVIEW_ADMIN_AUTHENTICATED=true`, `IRIS_ADMIN_REVIEW_OWNER_CONFIRMED=true`, and
`IRIS_ADMIN_REVIEW_ACTOR_ROLE=owner` or `admin` for the dry-run plan to become ready.
The Admin Dashboard also includes an Operator/Admin/Owner selector for review decisions, decision-log
health, validator handoff and preflight status, auth-gate status, and validator run-plan status.
You can preselect it with
`/admin?actor_role=owner`, `/admin?actor_role=admin`, or
`/admin?actor_role=operator`; `/admin/dashboard` remains the read-only JSON source.
`/admin/review-queue/validator-handoff` and
`npm run dev:admin:review-validator-handoff` compare recorded decisions against the current
safe review queue and report only validator handoff readiness, stale decision counts, and IDs.
`/admin/review-queue/validator-preflight` and
`npm run dev:admin:review-validator-preflight` are the final read-only gate before private
validator execution. They verify handoff readiness without materializing validator input or
committing memory/relationship records.
`/admin/review-queue/validator-run-plan` and
`npm run dev:admin:review-validator-run-plan` create a dry-run private runner plan. The plan
counts decisions that would be sent to a private validator runner but never materializes raw
candidate input, calls the validator, or commits approved records. It remains blocked until the
admin review auth gate confirms an owner or admin session.
The `/debug` page is the local development console for sending test events, replaying short scenarios, and inspecting cues.
The `/overlay` page is intended as the first OBS Browser Source target for local development.
The `/obs/browser-source` endpoint returns safe OBS Browser Source dimensions, overlay URL, event
paths, local render-manifest status/latest paths, and class hints without live text or candidates.
The overlay page also polls the latest render manifest and plays the latest ready TTS artifact from
the fixed same-origin `/event-render-manifests/latest/artifact/tts` route through a hidden audio
element. It checks the same manifest header for TTS, Live2D, and subtitle artifacts before applying
them as one group, and does not accept arbitrary artifact paths or expose local filesystem paths.
The manifest paths are read-only monitoring hints for synchronized TTS/Live2D/subtitle artifacts
and file-availability checks; they do not expose artifact paths. The local artifact pickup paths
under `/event-render-manifests/latest/artifact/*` are included separately for OBS/operator tooling
that needs the rendered audio, Live2D cue JSON, or subtitle VTT after the manifest is complete.
Use `IRIS_HTTP_ORIGIN` plus `IRIS_OBS_SOURCE_NAME`, `IRIS_OBS_SCENE_NAME`,
`IRIS_OBS_SOURCE_WIDTH`, `IRIS_OBS_SOURCE_HEIGHT`, and `IRIS_OBS_SOURCE_FPS` to make the manual
OBS Browser Source config stable. `npm run dev:obs:browser-source` prints the same config-only
report for operator checks.
Use `IRIS_OBS_BRIDGE_ENDPOINT` with an external local OBS setup bridge when you want to automate
that operator setup step. The setup request is config-only and must remain separate from runtime
Live2D expression or subtitle events.
`npm run dev:obs:runtime-render-roundtrip` verifies the full local runtime path from comment to
TTS/Live2D/subtitle artifacts, OBS same-origin artifact pickup, and
`/production/foundation-runtime-status` reaching `ready_for_obs_runtime_handoff`, while keeping
endpoint values, local paths, text payloads, raw jobs, and artifact bodies out of the report.
It also verifies `obs_render_artifact_flow` reaches `ready_for_obs_artifact_pickup` with all three
adapter artifacts available for grouped OBS pickup.
`npm run dev:foundation:launch-plan` also includes a runtime handoff verification summary that
ties the foundation status, runtime status, bridge/engine checks, and OBS runtime render roundtrip
into the first-stage launch gate using only safe script names and fixed readiness expectations.
`POST /integrations/probe` defaults to a dry run. Send `{ "mode": "fixture_post" }` only to a
local TTS/Live2D/subtitle bridge that is ready to receive synthetic fixture packets.

## Hard Boundaries

- Core never emits `world_command`.
- Only Phase04 decides canonical `action_type`.
- Adapters convert validated actions; they do not decide intent, memory, relation, personality, or action type.
- Candidate objects are not execution or commit commands.
- Game input candidates cannot reach game adapters without `approved_game_input_action`.
- Gameplay runtime status includes a `game_vision_capture_flow` summary so operators can track screen-capture polling, vision observation counts, low-confidence blocks, and source health without exposing frames, OCR text, frame references, endpoints, or vision payloads.
- Gameplay runtime status includes an `action_gate_flow` summary so operators can distinguish observation, player proposal, validation, and adapter handoff states without exposing candidates or approved payloads.
- Gameplay runtime status also includes a `safe_action_lifecycle_flow` summary that joins scheduler, observation, perception, validator, adapter ACK, and boundary-audit stages with counts/statuses only.
- Gameplay live readiness adds a read-only final gate over configuration, scheduler, vision capture, validation, adapter readiness, adapter ACK, safe-control lifecycle, and vision-to-safe-action status before reporting `ready_for_gameplay_safe_control`.
- `press_key` approved actions use the game-safe key hint allowlist exposed by `/integrations/contracts`; unknown key hints are rejected before adapter handoff.
- Approved game actions carry a short expiry window; the HTTP game-control adapter rejects expired actions before fetch, and the local bridge rejects expired approved actions before simulated ACK.
- TTS/Live2D packets, replay logs, and public state never expose raw or approved game-control objects.
- Candidate review entries are safe summaries, not raw candidates or approvals.
- Phase16+ internal profiles must never enter canonical enum fields.

## Current Status

- Phase01-15: minimal contract-safe Core path implemented.
- Phase05/12 candidates remain validation-gated and are not committed.
- Phase08/10 labels are phase-local and never become canonical actions.
- Phase14/15 preserve Phase04 `action_type`.
- Real platform, TTS engine, Live2D SDK, persistence service, and LLM production integrations are
  still replaceable bridge work. OBS browser-source overlay and local bridge artifact workers exist
  as local integration foundations.
- A mock response generator is wired in before Phase14.
- A generic HTTP response provider exists behind a firewall, including summary-only context handoff and nested response-payload side-effect checks.
- A local JSON memory store exists, but it only writes approved records after validation.
- A local relationship memory store can track viewer familiarity only through approved records.
- A short-term affect state can modulate performance cues without becoming canonical state.
- A static IRIS persona profile guides response providers without defining canonical enum fields.
- A speech cue layer can guide TTS prosody, pauses, laugh breaths, and mouth timing.
- A subtitle adapter packet can send validated subtitle text, timing, script direction, and safe-area guidance to an OBS/browser subtitle bridge.
- A motion cue layer can drive breathing, blinking, gaze, and Live2D movement hints.
- A performance plan layer synchronizes speech and motion on a shared timeline.
- A Phase16 MVP body continuity layer creates internal body profiles for Live2D guidance.
- A Phase17 MVP turn rhythm layer creates internal timing, pause, and laughter recovery guidance.
- A Phase18 MVP affective continuity layer carries mood, laughter, and recovery without changing canonical emotion.
- A Phase19 MVP personality habit layer selects safe IRIS-like habits with cooldown.
- An expression profile layer maps laughter, breath recovery, voice style, and Live2D expression into adapter-readable profiles.
- An autonomous expression layer adds bounded screams, humming, short dance, short original vocalise, self-directed micro-actions, and latency bridge behavior.
- A Phase20 MVP relationship deepening layer creates validation-gated relationship update candidates without writing memory.
- Donation, media-watch, and external-topic inputs are normalized as read-only observations/reactions with safety guards.
- A generic HTTP media-watch source can ingest rights-safe summaries from a local video-analysis bridge while rejecting transcripts, subtitles, lyrics, raw media, commands, and candidates.
- A generic HTTP external-topic source can ingest summary-only trend/news observations from a local bridge while rejecting raw articles, commands, candidates, canonical fields, and direct writes.
- A Phase21 MVP memory recall layer selects read-only memory references with privacy filtering and cooldown.
- An approved-memory prompt summary can feed sanitized past moments into response generation without memory IDs, raw candidates, or commit authority.
- A Phase22 MVP game perception layer detects danger, opportunity, and funny moments from read-only observations.
- A Phase23 MVP game commentary layer selects IRIS-like commentary modes, safe viewer relationship context, and validation-gated laughter candidates.
- A Phase24 MVP game player layer creates validation-gated input action candidates and safe viewer coordination hints without adapter handoff.
- A Phase24 game action validator can convert safe game-input candidates into `approved_game_input_action` only when game control is explicitly enabled.
- `/production/gameplay-runtime-status` reports `game_vision_capture_flow` as a counts/status-only view of screen capture, vision telemetry, low-confidence observation handling, and no-payload capture boundaries.
- `/production/gameplay-runtime-status` reports the Phase24 validation gate as booleans/statuses only through `action_gate_flow`, including low-confidence/stale/future-observation blocks before adapter handoff.
- `/production/gameplay-runtime-status` also reports `safe_action_lifecycle_flow` as a top-level operator view from game observation to safe control, without exposing candidates, approved actions, frames, commands, endpoints, or secrets.
- `/production/gameplay-live-readiness` reports priority-4 readiness as fixed gate statuses only and confirms safe game control is ready without performing polling or control side effects.
- Game action parameter hints are rejected if they contain unsafe key combinations, command-like text, candidate names, or secret-bearing tokens.
- A local mock game-control adapter accepts only approved game actions and remains simulated with no OS/game input.
- An optional HTTP game-control adapter can POST approved game actions to a local bridge while rejecting unsafe response echoes, including endpoint and authorization echoes.
- A Phase25 MVP game embodiment layer maps game situations into voice, breath, gaze, posture, and safe motion plans.
- A Phase26 MVP stream lifecycle layer creates validation-gated carryover/community memory candidates and next-stream seeds.
- A Phase27 MVP human-likeness evaluation layer scores integrated behavior and fails candidate/adapter boundary bypasses.
- A Phase27 boundary audit summarizes cross-phase candidate, approval, memory, game-control, and canonical-field safety checks.
- A local candidate review queue records safe summaries of validation-gated candidates without exposing raw candidates.
- A candidate validator can convert safe runtime candidates into `approved_*` records before persistence when explicitly enabled.
- Candidate persistence commit failures are summarized by count and error kind only; store paths, raw error messages, approved record payloads, and candidate payloads stay private.
- Sanitized `/relationships` and `/memories` endpoints expose filterable public summaries for local development.
- A sanitized `/memory-search` endpoint ranks approved public memories through a local lexical index.
- An optional HTTP vector-memory search adapter can rank approved public memory IDs through a local bridge.
- A local vector-memory bridge can serve approved public memory ID/score hits without exposing
  records, summaries, candidates, commands, secrets, or endpoint values in its public reports.
- A sanitized `/persistence/status` endpoint exposes enabled flags, counts, and store retention limits only, without records, hidden scores, candidates, or writes.
- Shared privacy guards classify and redact sensitive/private summaries across memory, lifecycle, and review surfaces.
- A readiness report and spec manifest preflight check verify local MVP capability and IRIS_20240425 00-27 presence.
- A safe integration status endpoint shows bridge configuration, scheduler state, and missing env names without exposing secret values or endpoint URLs.
- A safe integration contracts endpoint describes TTS/Live2D/subtitle packets, bundled VOICEVOX/Live2D helper bridge local-target policies, OBS overlay events, and bridge source contracts for external implementers.
- A safe integration fixtures endpoint returns synthetic adapter packets and overlay events for bridge implementation tests.
- A safe integration probe can dry-run bridge readiness or post synthetic fixture packets to configured TTS/Live2D/subtitle HTTP bridges.
- A local bridge server can receive TTS/Live2D/subtitle HTTP adapter packets, write engine-facing outbox jobs, and expose safe packet summaries for real-engine integration work.
- A local bridge engine worker can consume those outbox jobs and generate local TTS/Live2D/subtitle
  artifacts with safe receipts, without exposing raw text or payloads in public reports.
- The local bridge engine worker now writes event render manifests when TTS, Live2D, and subtitle
  artifacts for the same event are complete, giving OBS/engine-side tooling a local sync handoff
  while public reports stay summary-only.
- The local bridge can accept `approved_game_input_action` on `/game-control` and keeps it simulated for safe game-control adapter testing.
- Adapter packets wrap TTS/Live2D payloads before console or HTTP handoff. HTTP adapter responses are guarded against candidate, commit, command, canonical-field, endpoint, authorization, and secret echoes; failed bridge responses are summarized without reading unsafe bodies, and non-JSON text acknowledgements are omitted from runtime results and reduced to `response_kind: text` summaries.
- A local runtime loop can process queued comments and hand off to mock TTS/Live2D adapters.
- The event queue and HTTP ingest scheduler prioritize urgent game, donation, and direct-mention events while skipping duplicate `event_id` values to avoid double reactions.
- A local HTTP dev server can accept comments and expose an OBS-style overlay state.
- Safe `/overlay/event` and `/overlay/events` surfaces expose subtitle display events with heartbeat stream monitoring, without raw final text, candidates, commits, or game actions.
- A sanitized `/overlay/status` endpoint exposes overlay health and class hints without raw text.
- A local debug console can send comments/game observations and inspect state/cues.
- A generic HTTP live-chat source can ingest YouTube-style comment items while keeping viewer input read-only.
- The YouTube API source maps Super Chat, Super Sticker, Super Thanks, member milestones, new memberships, and gift membership events into the donation/support reaction path.
- The YouTube API source can refresh OAuth access tokens from a refresh token without exposing token values in public status.
- A read-only game observation adapter can produce commentary without game input execution.
- A generic HTTP game-observation source can ingest read-only screen/vision bridge output or request bounded POST vision summaries while enforcing loopback/private-network endpoints and rejecting command, candidate, raw-frame, direct-OCR, endpoint, and secret payloads.
- A local HTTP ingest scheduler can poll live-chat and game-observation bridge sources into the runtime and overlay state.
- An idle presence path can produce silent breathing motion between comments.
- An optional idle scheduler can trigger safe idle-breath ticks during quiet periods.
- A scenario runner can replay comments, game observations, donations, media-watch observations, external topics, and idle ticks for regression checks.
- The HTTP dev server exposes local capabilities, relationship profiles, replay data, and scenario playback.
