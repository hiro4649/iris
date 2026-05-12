# HTTP Ingest Scheduler

The HTTP ingest scheduler is a local development bridge for real-time-style input.

It can poll configured read-only sources:

```text
http_youtube_live_chat_source
youtube_live_chat_api_source
http_game_observation_source
http_media_watch_source
http_external_topic_source
```

Each tick pulls a bounded batch, applies stable event-priority ordering, sends the normalized events
through the normal runtime, and updates the same stream state used by `/state`, `/debug`, and
`/overlay`.

## Controls

```text
GET  /ingest/status
POST /ingest/tick
POST /ingest/start
POST /ingest/stop
```

`/ingest/status` exposes only scheduler status and processed-event summaries:

```text
source
event_id
event_priority
payload_kind
final_decision
human_likeness_score
candidate_review_count
boundary_audit_status
last_priority_summary
source_statuses
source_errors
```

It does not expose raw viewer comments, raw game observations, candidates, approved game actions,
memory records, relationship records, commands, or canonical Core envelopes.
`npm run dev:ingest:http` uses this same scheduler path for one manual tick, so local one-shot
operator checks exercise the same priority ordering, duplicate suppression, source status, and
source-error summaries as the long-running dev server.

`source_statuses` is a counts-only operational summary for production-style intake. When a source
provides safe telemetry, it can show bounded fields such as YouTube `last_comment_count`,
`last_support_event_count`, support-event type count maps, direct API request counters,
ignored-item totals, moderation filtered counts and reason-count maps, vision `request_count`,
`last_observation_count`, confidence/frame-age/metadata telemetry, POST capture-request preferences, and
media/topic `last_item_count` values. HTTP relay live-chat, game-observation, media-watch, and
external-topic source status may also show fixed local endpoint policy status and endpoint scope
(`loopback`, `private_network`, `external`, `invalid`, or `not_configured`) without exposing the
configured URL. It intentionally omits live chat IDs, page
tokens, endpoint values, blocked authors, blocked terms, raw observations, raw text, frame
references, OCR text, candidates, and approved game actions.
Source labels are public diagnostics too. If a configured source name or source-kind string looks
like an endpoint, token, API key, OAuth value, authorization header, secret, or password, the
scheduler publishes `redacted_source_name` instead of the supplied label.

When `continueOnSourceError` is enabled, one failing source does not stop other configured sources
from being processed in the same tick. The tick returns `ok: false` with
`source_error_count` and `source_errors`, but any valid events from other sources still pass through
runtime normally. Each source error is a summary-only
`iris_http_ingest_source_error_summary_v1` with source name, source kind, error kind, retryable
flag, and boundary flags only. It must not expose upstream response bodies, live text, endpoint
values, secrets, candidates, commands, or approved game actions.
Contract HTTP failures are summarized as the fixed `http_status` kind.
Local bridge sources blocked by the local endpoint policy are summarized as
`local_endpoint_policy_blocked`, marked non-retryable, and treated as operator-action-required
configuration issues.
When `continueOnSourceError` is disabled, the scheduler still records `last_error` as a fixed
summary such as `http_ingest_source_errors` or `http_ingest_tick_failed`; it does not publish or log
raw exception messages that may contain endpoints, tokens, text payloads, or bridge internals.

Priority is scheduling-only: urgent game observations, donation events, and direct mentions are
handled before ordinary comments, but the priority value never approves game input, commits memory,
or changes canonical Phase01-15 state.

## Env

```text
IRIS_ENABLE_HTTP_INGEST_SCHEDULER=true
IRIS_HTTP_INGEST_INTERVAL_MS=3000
IRIS_HTTP_INGEST_LIMIT=10
IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR=true
IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT=http://127.0.0.1:9003/live-chat
IRIS_YOUTUBE_LIVE_CHAT_SOURCE=youtube_api
IRIS_YOUTUBE_LIVE_CHAT_ID=...
IRIS_YOUTUBE_VIDEO_ID=...
IRIS_YOUTUBE_DATA_API_KEY=...
IRIS_YOUTUBE_OAUTH_TOKEN=...
IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH=data/youtube_live_chat_cursor.json
IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS=...
IRIS_YOUTUBE_BLOCKED_TEXT_TERMS=...
IRIS_GAME_OBSERVATION_ENDPOINT=http://127.0.0.1:9004/vision/latest
IRIS_GAME_OBSERVATION_METHOD=POST
IRIS_GAME_CAPTURE_REGION={"x":0,"y":0,"width":1280,"height":720}
IRIS_GAME_CAPTURE_X=0
IRIS_GAME_CAPTURE_Y=0
IRIS_GAME_CAPTURE_WIDTH=1280
IRIS_GAME_CAPTURE_HEIGHT=720
IRIS_GAME_OBSERVATION_INCLUDE_OCR_SUMMARY=true
IRIS_GAME_OBSERVATION_INCLUDE_UI_FOCUS_AREAS=true
IRIS_GAME_OBSERVATION_MAX_EVENTS=8
IRIS_MEDIA_WATCH_ENDPOINT=http://127.0.0.1:9005/media/latest
IRIS_EXTERNAL_TOPIC_ENDPOINT=http://127.0.0.1:9006/topics/latest
```

Invalid scheduler numeric values fall back to bounded defaults instead of creating an immediate or
unbounded polling loop: `IRIS_HTTP_INGEST_INTERVAL_MS=3000`, `IRIS_HTTP_INGEST_LIMIT=10`, and an
internal duplicate-event window of 300 IDs. The interval is clamped to 250..3600000ms and the batch
limit to 1..100.
Malformed `IRIS_HTTP_PORT` values for `npm run dev:server` fall back to 8787 before the HTTP server
binds.

The direct YouTube Data API-style source is still read-only: text messages become normalized comment
events, and Super Chat / Super Sticker / Super Thanks-style support events become normalized donation events. Local
API bridges can also pass already-normalized support summaries, counted as `normalizedSupportEvent`
when no native YouTube event type is supplied. It tracks pagination internally and does not expose
commands, candidates, commits, approved game actions, or canonical Core fields. It also respects
`pollingIntervalMillis`, so a scheduler tick
that arrives too early receives no events instead of making another upstream API request. The
comment normalization contract rejects structured support markers before runtime ingestion, so an
unexpected support-shaped bridge item is not silently treated as an ordinary text comment.
The
local cursor store writes a sidecar backup; if the primary cursor JSON is corrupt, direct API ingest
can resume from the backup while public status still hides page tokens, cursor paths, and backup
paths. Production readiness treats the cursor store as required for direct YouTube API polling so
the process can restart without publicly exposing or losing the upstream cursor. The
source clamps out-of-range upstream polling intervals to a bounded policy and scheduler status
exposes only the clamp policy and a boolean clamp flag, not the raw upstream value. Screen capture
and vision integrations should keep using the same read-only source contracts.
If `IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS` or `IRIS_YOUTUBE_BLOCKED_TEXT_TERMS` is configured, the
YouTube sources filter matching comments/support events before runtime receives them. Scheduler
status exposes only filtered counts and fixed reason keys, never the blocked configuration values.
Platform moderation-only items that never become runtime events expose only fixed ignored type
counters (`messageDeletedEvent`, `userBannedEvent`, `tombstone`, `moderationEvent`). These counters
are separate from duplicate suppression and configured moderation filters, so relay/API operators can
diagnose chat churn without leaking payloads or committing memory/relationship candidates.

The generic HTTP live-chat source follows the same support-event normalization and performs at most
one upstream fetch per `nextBatch(...)` call. This avoids repeated bridge polling inside a single
scheduler tick while still letting queued events drain through priority ordering.
The relay endpoint must be loopback/private-network scoped; direct YouTube Data API polling is the
separate path for external platform access. A malformed or external relay endpoint is blocked
before fetch and summarized as `local_endpoint_policy_blocked`.
Production readiness also treats external or malformed relay endpoints as `attention`, even when
the HTTP ingest scheduler is enabled.
It accepts YouTube-like `snippet` support events, flatter relay shapes with `author`, `message`, and
`amount_display_string` fields, and normalized support summaries with `payload_kind:
donation_event`; support amount details are reduced to a coarse tier and fixed amount source kind
only. Use
`npm run dev:youtube:relay-bridge` to start a local trusted relay fixture server,
`npm run dev:youtube:relay-readiness-rehearsal` to prove one safe scheduler tick through that
bridge,
`npm run dev:youtube:relay-startup-checklist` to follow the local relay startup order,
`npm run dev:youtube:relay-roundtrip` to verify this relay path against local fixtures,
and `npm run dev:youtube:relay-status-roundtrip` to verify the counts-only public source status.
Non-OK relay and direct YouTube API responses are reduced to fixed HTTP-status errors without
reading upstream response bodies.
`npm run dev:youtube:runtime-ingest-roundtrip` verifies direct YouTube comments/support through
the scheduler and runtime without exposing message text, platform IDs, cursor values, endpoint
values, raw payloads, raw stream state, candidates, or commands in the production runtime status
report. The same report now surfaces support-candidate progress through donation reaction,
candidate validation, and approved persistence as counts/statuses only.
`npm run dev:youtube:ingest-once` uses the same scheduler path for a configured live channel but
limits the source set to YouTube only and blocks before polling when the YouTube preflight is not
ready.

When `IRIS_GAME_OBSERVATION_METHOD=POST`, the scheduler sends an
`iris_vision_capture_request_v1` request that asks the local vision bridge for a bounded summary.
The request includes capture-region and summary preferences only; raw screenshots, pixels, direct
OCR transcripts, action candidates, and memory/relationship writes remain forbidden in both request
and response payloads. Vision bridge responses also must not echo endpoint URLs, API keys,
authorization headers, or other secret-bearing fields.

The HTTP game-observation source fetches at most one vision batch per scheduler tick. A bridge can
return multiple observations in that response, but IRIS does not repeatedly POST capture requests
just to fill the scheduler batch limit.
Responses may use top-level observation fields or nested `vision` / `frame` summaries. IRIS accepts
summary text, event labels, object names, UI focus names, frame references, and confidence only; raw
frames, pixels, transcripts, candidates, and commands are still rejected.
Non-OK vision bridge responses are summarized without reading response bodies.

Media-watch ingest is also read-only. A local video-analysis bridge may provide short observation
summaries for YouTube clips, anime, or other streams, but transcript dumps, subtitles, lyrics,
raw video/audio, candidates, commands, canonical fields, and direct memory/relationship writes are
rejected before runtime processing. Its endpoint must be loopback/private-network scoped. Its status
exposes request count, last item count, fixed error kind, local endpoint policy status, endpoint
scope class, and timing only; failed bridge bodies are not read. Production readiness requires the
configured media-watch endpoint to pass the same local endpoint scope check.

External-topic ingest follows the same pattern for trends and news. Fetching and summarization live
outside IRIS Core; the bridge returns title, summary, URL, freshness, trust, and risk metadata only.
Raw article bodies, raw HTML, verbatim source text, candidates, commands, canonical fields, and
direct memory/relationship writes are rejected. Its endpoint must be loopback/private-network scoped.
Its status uses the same counts-only shape, and failed bridge bodies are not read. Production
readiness requires the configured external-topic endpoint to pass the same local endpoint scope
check.
