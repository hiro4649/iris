# YouTube Live Chat Source

`normalizeYouTubeComment(...)` remains the canonical local input adapter for viewer comments.

For future live use, `createHttpLiveChatSource(...)` can poll a local YouTube API bridge or relay
through HTTP `GET` and normalize text items into:

```text
source: youtube_live_chat
payload.author_channel_id
payload.display_name
payload.text
```

It also recognizes YouTube-like support items such as Super Chat, Super Sticker, Super Thanks,
member milestone, new membership, membership gift, and received gift membership events. Those become
`youtube_donation` events with `payload.payload_kind: donation_event` and `support_event_type`, so
they enter the same donation reaction, memory-candidate, and relationship gates as direct API
support events. Relay bridges may also send already-normalized support items with
`payload_kind: donation_event`, `kind: donation`, `support_event_type`, or amount fields; these are
mapped to `support_event_type: normalizedSupportEvent` when no YouTube event type is supplied.
Bridge aliases such as `paidMessageEvent`, `paid_sticker`, `sponsorEvent`, `membershipGiftEvent`,
and received-membership-gift names are canonicalized to the matching YouTube support type before
status counters are updated. The shared `normalizeYouTubeDonation(...)` path applies the same
canonicalization, so arbitrary bridge or caller-provided support labels fall back to
`normalizedSupportEvent` instead of becoming public event-type values.

Accepted bridge shapes include:

```text
{ items: [ YouTube-like liveChatMessages items ] }
{ comments: [ { display_name, text } ] }
{ messages: [ ... ] }
{ comment: { ... } }
```

For relay support events, IRIS accepts both YouTube-style `snippet.*Details` payloads and flatter
bridge-friendly shapes such as:

```text
{
  type: superChatEvent | superThanksEvent,
  author: { channel_id, display_name },
  message,
  amount_display_string,
  currency
}
```

It also accepts normalized bridge-owned support summaries such as:

```text
{
  payload_kind: donation_event,
  author_channel_id,
  display_name,
  message_text,
  amount_tier,
  currency
}
```

Formatted amount strings are reduced to a coarse `small` / `medium` / `large` / `unknown` tier
only. Support events also carry a fixed `amount_source_kind` of `micros`, `formatted`, `tier`,
`membership_count`, or `unknown` so operators can confirm which YouTube or relay field shape was
recognized without exposing exact amounts. Raw amounts are not used for viewer ranking,
exclusivity, or direct relationship writes.
Relay or bridge fields such as `tier`, `amountTier`, `displayAmount`, `formattedAmount`,
`giftCount`, and `giftMembershipCount` are accepted only to produce those coarse source-kind
summaries and amount tiers.
Gifted-membership receipt events are treated as `membership_count` source telemetry even when the
bridge does not include an explicit gift count, so operators can distinguish membership support
from unknown amount support without exposing viewer text or raw payloads.

The source is read-only. It rejects bridge payloads that contain command fields, input-action
candidates, approved game actions, memory commits, relationship writes, or canonical Core fields.
Viewer text may ask IRIS to do something, but the adapter never turns text or bridge metadata into
side effects.

`nextBatch(...)` performs at most one HTTP fetch per scheduler tick. Its status exposes
`ingest_readiness_status` as a fixed operational summary plus counts such as request count, last item
count, comment count, support-event count, support-event type counts, support amount source counts,
ignored moderation count, and duplicate item count, plus fixed last-error kinds/timing only. The
relay source reports only `idle`, `active`, or `attention` readiness. It does not expose raw comments,
support messages, exact amounts, live chat IDs, page tokens, seen item IDs, endpoint values, raw bridge error text, or secrets. Non-OK
relay responses are summarized as fixed
HTTP-status failures without reading the response body.
The relay source validates its public status before returning it. Status maps may contain only fixed
support-event, moderation-event, amount-source, and moderation-reason keys; counters must be
non-negative; local relay scope values must remain fixed summaries; boundary flags must stay true;
and URL-bearing or secret-bearing diagnostics are rejected.

Env-backed runtime adapter configuration can create the source when
`IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT` is set. The production config doctor treats this as an
`http_relay` YouTube ingest path: the bridge is responsible for upstream YouTube access, while IRIS
still validates read-only comment/support event payloads and keeps status summary-only.
Set `IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW` to bound how many recent relay item IDs are remembered
for duplicate suppression; the default is 5000 and status reports counts only.
Invalid numeric relay settings fall back to safe defaults: 5000ms request timeout and 5000 recent
IDs for duplicate suppression.
Set `IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS` and/or `IRIS_YOUTUBE_BLOCKED_TEXT_TERMS` to apply an
operator-owned moderation filter to both relay and direct API sources before events enter runtime.
The filter can drop comments or support events from configured authors or containing configured
terms. Public status exposes only `moderation_configured`, filtered counts, and fixed reason count
keys; it never exposes blocked author IDs, blocked terms, viewer text, support messages, or raw
payloads.

Direct YouTube Data API-style polling is available through `createYouTubeLiveChatApiSource(...)`.
It is still read-only and normalizes comments plus public support events such as Super Chat, Super
Sticker, Super Thanks, member milestone chats, new memberships, membership gifts, and received gift
memberships:

```text
IRIS_YOUTUBE_LIVE_CHAT_SOURCE=youtube_api
IRIS_YOUTUBE_LIVE_CHAT_ID=...
IRIS_YOUTUBE_VIDEO_ID=...
IRIS_YOUTUBE_DATA_API_KEY=...
IRIS_YOUTUBE_OAUTH_TOKEN=...
IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN=...
IRIS_YOUTUBE_OAUTH_CLIENT_ID=...
IRIS_YOUTUBE_OAUTH_CLIENT_SECRET=...
IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT=https://oauth2.googleapis.com/token
IRIS_YOUTUBE_OAUTH_REFRESH_TIMEOUT_MS=5000
IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS=5000
IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS=200
IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW=5000
IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH=data/youtube_live_chat_cursor.json
IRIS_YOUTUBE_LIVE_CHAT_ERROR_BACKOFF_MS=5000
IRIS_YOUTUBE_LIVE_CHAT_MAX_ERROR_BACKOFF_MS=60000
IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS=...
IRIS_YOUTUBE_BLOCKED_TEXT_TERMS=...
```

`IRIS_YOUTUBE_OAUTH_TOKEN` is optional in local tests but should be supplied when the upstream API
requires OAuth authorization. For longer production streams, `IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN`
can be supplied instead; IRIS refreshes an access token through the OAuth refresh endpoint and uses
only the fresh access token in upstream Authorization headers. `/integrations/status` and source
status expose refresh counts/timing and fixed refresh error kinds only, never access token, refresh
token, client secret, raw transport error text, or endpoint values. The refresh provider caches the
current access token and coalesces concurrent refresh requests into a single in-flight POST; public
status reports only cache-hit, refresh, and join counts plus booleans, never token values. The
official YouTube Data API and Google OAuth token endpoints are used by default; blank `.env`
override values are treated as unset so template placeholders do not disable those defaults. The
endpoint can be overridden with `IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT`,
`IRIS_YOUTUBE_VIDEOS_API_ENDPOINT`, and `IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT` for a local mock or
bridge. Nonretryable OAuth refresh failures such as invalid credentials are reflected in the live
chat source as fixed `youtube_oauth_refresh_*` errors with operator-action flags, and direct API
polling pauses before any live-chat request is attempted. If `IRIS_YOUTUBE_LIVE_CHAT_ID` is not known, `IRIS_YOUTUBE_VIDEO_ID` can be used to resolve
the active live chat ID from video live-streaming metadata before polling messages. The source
tracks `nextPageToken` and `pollingIntervalMillis` internally, respects the upstream polling
cooldown before the next API request, and clamps out-of-range polling intervals to a bounded
500..300000ms policy without exposing the raw upstream value. It records only safe public status
metadata such as total request count, video-discovery request count, live-chat poll count, last
poll time, next allowed poll time, the clamp policy, whether the last interval was clamped, item
count, comment count, support-event count, support-event type counts, support amount source counts,
ignored moderation count, duplicate item count, retry-backoff timing, boolean configuration flags,
`ingest_readiness_status`, and a fixed error kind. The direct API source reports only fixed readiness
values: `idle`, `active`, `polling_cooldown`, `retry_backoff`, `attention`, or
`operator_action_required`.
The direct API source validates its public status before returning it. Status maps may contain only
fixed support-event, moderation-event, amount-source, and moderation-reason keys; counters must be
non-negative; polling/backoff policies are bounded; cursor/OAuth summaries must keep their boundary
flags true; and URL-bearing diagnostics are rejected.
For non-OK Data API responses, IRIS may read only a bounded JSON error envelope to classify known
YouTube reasons into fixed kinds such as `live_chat_ended`, `chat_disabled`,
`quota_or_rate_limited`, `auth_required`, and `not_found`. The raw error body, messages, IDs,
page tokens, credentials, candidates, and commands are never published. Public status exposes only
the fixed source error kind, whether automated retry is appropriate, whether operator action is
required, and a fixed recovery hint such as `select_active_stream` or
`check_youtube_credentials`. Operator-action failures pause additional direct API polling until the
source is restarted with corrected stream or credential configuration, preventing tight retry loops
after an ended stream or disabled chat.
When `IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH` is configured, the direct source persists the
latest `nextPageToken` to a local JSON cursor store and restores it when a new source instance
starts without an explicit `IRIS_YOUTUBE_LIVE_CHAT_PAGE_TOKEN`. The cursor value is treated as an
operator-local secret: public status exposes only cursor-store configuration, token availability,
read/write counts, and fixed store error kinds. It never exposes the cursor value, cursor path,
live chat ID, video ID, endpoint value, credentials, raw payloads, candidates, or commands.
Each successful cursor write also updates a sidecar `.bak` file. If the primary cursor JSON becomes
corrupt but the sidecar is valid, startup recovers the page token from the backup for the next
upstream request, rewrites the primary on the next successful poll, and reports only
`durability.recovered_from_backup`, fixed error kinds, and backup availability booleans. The backup
path and cursor value remain hidden.
If the primary cursor write succeeds but the sidecar backup write fails, direct API polling still
continues from the primary cursor, while public status marks `cursor_store_write_attention: true`
and reports only `durability.backup_write_health`, backup write attempt/success/error counts, and a
fixed `backup_error_kind`. It does not expose the page token, cursor path, backup path, upstream
IDs, endpoint values, raw store errors, candidates, commands, or credentials.
Production config doctor treats OAuth refresh as ready only when the refresh token, client ID, and
client secret are configured together; otherwise it reports `oauth_refresh_incomplete` with env
names only. A Data API key or static OAuth access token can still satisfy the auth gate for direct
API polling.
After a transport or contract failure, including video-to-live-chat discovery failures, the
source applies bounded backoff before the next upstream request, so repeated API failures cannot
hammer YouTube or the OAuth bridge. Public status never exposes the actual live chat ID, video ID,
page token, endpoint value, upstream error message, API key, OAuth token, refresh token, or client
secret. Non-OK video-discovery and live-chat API responses are summarized without reading response
bodies. These values never become commands or adapter authority.
If a retryable YouTube HTTP response includes `Retry-After`, the value is parsed as seconds or an
HTTP date, bounded, and used as the minimum retry delay before the next request. The raw header,
response body, endpoint, IDs, and credentials remain hidden; public status exposes only the bounded
millisecond delay and the resulting `next_retry_after_ms`.

Invalid numeric direct API settings and out-of-range API polling intervals fall back to safe defaults
or bounded clamps instead of disabling polling
guardrails: 5000ms live-chat timeout, 200 API max results, 5000 recent IDs for duplicate
suppression, 5000..60000ms error backoff, 500..300000ms API polling interval clamps, 5000ms OAuth
refresh timeout, and 3600s OAuth token expiry when the provider returns an invalid `expires_in`.
Normalized comment events clamp public event IDs, trace IDs, channel IDs, display names, and message
text before runtime ingestion, so oversized live-chat fields cannot become unbounded prompt context.
Normalized support events apply the same bounds to event IDs, trace IDs, platform event IDs, channel
IDs, display names, and support messages before donation reaction, relationship, or memory
candidate gates see them.

Text messages become `youtube_live_chat` comment events. Support items become `youtube_donation`
events with `support_event_type`, so the existing donation reaction, relationship, and memory
candidate gates can handle them without a separate side-effect path. For local API bridges that
wrap YouTube data into a normalized donation shape, `normalizedSupportEvent` is counted separately
from native YouTube support types.
The comment adapter also rejects structured support markers such as `payload_kind: donation_event`,
YouTube support `snippet.type` values, support detail objects, and amount or membership-count
fields. This keeps Super Chat, Super Sticker, membership, and bridge-owned support summaries from
falling back into ordinary comment handling when an upstream bridge sends an unexpected shape.

YouTube moderation-only API items such as message deletions, user bans, tombstones, or moderation
events are counted in source status and ignored by the runtime event batch. They do not become
comments, donations, memory commits, relationship changes, adapter packets, or game actions.
The public counters include `last_ignored_event_type_counts` and `ignored_event_type_counts` with
only the fixed keys `messageDeletedEvent`, `userBannedEvent`, `tombstone`, and `moderationEvent`, so
operators can distinguish platform moderation churn from duplicate suppression or configured
author/text filtering without exposing user text, item IDs, or moderation details.
Repeated API items with the same YouTube item ID are also suppressed inside the source before they
reach the runtime, so retries or overlapping pages cannot cause double reactions, double donation
responses, or duplicate memory/relationship candidates. Public status reports duplicate counts
only, not the seen item IDs. `IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW` controls the bounded memory for
both direct API polling and HTTP relay polling.
Configured author/text moderation is also applied before runtime processing. Filtered items count
as ignored source items, but the public reports expose only counts and fixed reason keys.
`request_count`, `video_discovery_request_count`, `live_chat_request_count`,
`last_comment_count`, `last_support_event_count`, `comment_event_count`, `support_event_count`,
`last_support_event_type_counts`, `support_event_type_counts`, `last_ignored_count`,
`ignored_event_count`, `last_ignored_event_type_counts`, `ignored_event_type_counts`,
`last_duplicate_count`, `duplicate_item_count`,
`last_support_amount_source_counts`, `support_amount_source_counts`,
`last_moderation_filtered_count`, `moderation_filtered_count`, and moderation reason-count maps are
operational counters only. Type-count keys are limited to known YouTube public support event kinds,
`normalizedSupportEvent` for bridge-owned support summaries, fixed amount source kinds, or fixed
moderation-only event kinds/reasons.

The local HTTP ingest scheduler can poll this source while `npm run dev:server` is running. Enable
it with `IRIS_ENABLE_HTTP_INGEST_SCHEDULER=true`, then inspect `/ingest/status` or trigger a manual
poll through `/ingest/tick`.
`GET /production/youtube-preflight` and `npm run dev:youtube:preflight` provide a compact
production startup check for YouTube comments and support events. The report shows source mode,
auth readiness, scheduler/cursor readiness, missing env names, and script-name-only verification
guidance; it never exposes OAuth values, cursor values, live chat IDs, endpoint values, support
messages, normalized event payloads, memory candidates, or relationship candidates.
It also includes the full comments/support stage summary, so the operator can see both
`youtube_live_chat_api` and `media_and_external_topic_ingestion` ready/attention status plus
verification script counts without seeing media/topic endpoint values or live source text.
`GET /production/youtube-launch-plan` and `npm run dev:youtube:launch-plan` add the step-by-step
startup plan for this stage. The plan separates source selection, upstream live-chat target,
credential option groups, cursor persistence, and HTTP ingest scheduler startup, while exposing only
environment variable names, fixed status labels, and safe local npm scripts. It does not expose
relay endpoints, YouTube IDs, OAuth/API secrets, cursor values, live comments, support messages,
normalized payloads, memory candidates, relationship candidates, or commands.
The launch plan also includes a runtime poll verification summary that links source status,
configured ingest, runtime status, runtime ingest, scheduler, cursor resume/backup, and
source-specific API/relay checks. Support events are explicitly required to hand off to the donation
pipeline, while memory and relationship candidates stay behind validation gates.
`GET /production/youtube-source-status` and `npm run dev:youtube:source-status` instantiate the
configured source in read-only mode and return only its public status without polling. The report
summarizes adapter kind, readiness, auth mode, request/support counters, cursor-store health, retry
backoff state, support-event type counts, support amount-source counts, and relay target scope
labels while keeping IDs, cursor values, endpoints, secrets, live text, support messages,
candidates, and commands out of the response.
`GET /production/youtube-runtime-status` and `npm run dev:youtube:runtime-status` combine source
status, preflight, and HTTP ingest scheduler status. It remains read-only and reports only whether
ingest is blocked, scheduler-unavailable, waiting for scheduler start, or actively polling, plus
counts-only scheduler telemetry. The runtime status also publishes a top-level live-chat ingest flow
summary that joins source polling, scheduler state, runtime comment/support observation, donation
reaction handoff, and support candidate gate status into fixed booleans, counts, and labels. This
lets operators confirm that direct API or relay comments and support events reached the reaction
pipeline without exposing live text, support messages, platform IDs, page cursors, endpoint values,
candidates, commands, or secrets.
The runtime status also publishes `api_cursor_auth_flow` for the production YouTube access lane.
That flow reports only fixed statuses, booleans, and aggregate counts for direct API vs relay
selection, auth readiness, chat-target resolution, restart cursor-store health, upstream cooldown or
retry backoff, operator-action blocks, and scheduler-produced comment/support counts. It never
includes live chat IDs, video IDs, page cursor values, cursor store paths, endpoint values, raw
payloads, message text, candidates, commands, or credential values.
Runtime status and each runtime flow also publish only derived next-check script names
(`next_runtime_check_script` / `next_check_script`) or `null`. The contract rejects unsafe script
fragments and mismatches, so a blocking configuration/source/scheduler/runtime stage can point to
the next diagnostic without leaking endpoints, IDs, cursors, payloads, candidates, commands, or
secrets.
`GET /production/youtube-live-readiness` and `npm run dev:youtube:live-readiness` add the final
read-only production gate for this priority. The report requires source config, direct API auth or
relay access, scheduler activity, live-chat runtime handoff, and support-event donation/candidate
safety to be ready before reporting `ready_for_youtube_live_ingest`; otherwise it points to the
blocking gate using only fixed statuses, booleans, counts, and script names. It includes
`next_gate_id` and `next_check_script`, and every gate carries a `check_script`, so the next
operator action stays explicit without exposing live data. The support pipeline gate also carries
support-event type counts and amount-source-kind counts for Super Chat, stickers, memberships,
membership gifts, and normalized support events without exposing live messages, platform IDs,
exact amounts, cursor values, endpoints, payloads, candidates, or commands.

Use:

```bash
npm run dev:youtube:preflight
npm run dev:youtube:launch-plan
npm run dev:youtube:source-status
npm run dev:youtube:runtime-status
npm run dev:youtube:live-readiness
npm run dev:youtube:ingest-once
npm run dev:youtube:direct-live-chat-roundtrip
npm run dev:youtube:cursor-backup-roundtrip
npm run dev:youtube:cursor-roundtrip
npm run dev:youtube:failure-roundtrip
npm run dev:youtube:http-ingest-roundtrip
npm run dev:youtube:runtime-ingest-roundtrip
npm run dev:youtube:policy-gate-roundtrip
npm run dev:youtube:support-gate-roundtrip
npm run dev:youtube:roundtrip
npm run dev:youtube:relay-bridge
npm run dev:youtube:relay-readiness-rehearsal
npm run dev:youtube:relay-startup-checklist
npm run dev:youtube:relay-roundtrip
npm run dev:youtube:status-roundtrip
```

to verify the production-style YouTube paths against local fixtures. `dev:youtube:roundtrip`
covers OAuth refresh, video-to-live-chat discovery, and direct Data API polling.
`dev:youtube:direct-live-chat-roundtrip` covers the operator-provided live chat ID path and asserts
that liveChatMessages polling works without calling video discovery, while public reports remain
counts-only and omit live chat IDs, page tokens, endpoint values, credentials, moderation terms,
raw text, candidates, and commands.
`dev:youtube:cursor-roundtrip` covers the restart-resume cursor path and asserts that a saved
`nextPageToken` is used only as an upstream request cursor while public status hides the token and
cursor file path.
`dev:youtube:cursor-backup-roundtrip` corrupts the primary cursor JSON after a successful poll and
verifies that the direct API source resumes from the sidecar backup without exposing the token,
cursor path, or backup path.
`dev:youtube:failure-roundtrip` covers a failing direct Data API poll and verifies source-error
summaries, including known YouTube reason classification and operator-action pausing, without raw
response bodies, live chat IDs, page tokens, endpoint values, candidates, commands, or OAuth
secrets.
`dev:youtube:status-roundtrip` verifies the public status boundary for direct Data API polling:
upstream IDs and page tokens are used only in outbound requests, while status reports booleans and
counts only.
`dev:youtube:runtime-ingest-roundtrip` covers the live scheduler/runtime path without starting the
public HTTP server: fixture YouTube comments/support enter the HTTP ingest scheduler, update stream
state and validation-gated persistence, and `/production/youtube-runtime-status` must summarize
active scheduler telemetry with comment/support counts only. Runtime status also includes the
API/cursor/auth flow, live-chat ingest flow, and support-candidate flow summary, so operators can
see whether direct API access is ready, whether comments reached runtime reaction, whether support
events reached runtime, triggered donation reaction, passed candidate validation, and committed
through approved memory/relationship schemas, while still exposing only counts, statuses, and
booleans.
`dev:youtube:support-gate-roundtrip` covers the paired negative path where support events are
ingested but candidate persistence is disabled; the support-candidate flow must stop at the
validator stage without revealing the support message, platform IDs, or candidate objects.
`dev:youtube:policy-gate-roundtrip` covers the relay configuration gate where an external HTTP
target is configured. Preflight, launch plan, and runtime status must stop at fixed
configuration-attention labels before polling can reach the scheduler.
`dev:youtube:relay-bridge` starts a local trusted relay fixture server for operator-side wiring
rehearsal. Its startup and health reports expose only env names, route labels, item/support counts,
and boundary booleans; the actual fixture comment text, support messages, platform IDs, endpoint
values, candidates, and commands stay out of public reports.
`dev:youtube:relay-readiness-rehearsal` starts that local relay bridge on a temporary loopback
target, performs one scheduler tick, and reports only source/scheduler/runtime counts. It is a
local proof for the relay path and validation-gated persistence without using real YouTube
credentials or exposing fixture messages, endpoint values, temporary paths, candidates, or
commands.
`dev:youtube:relay-startup-checklist` gives the operator-side order for the same local relay path:
start relay bridge, review env, run relay rehearsal, then review source/runtime/live readiness. The
checklist exposes only script names, env names, and fixed labels. The same safe checklist is also
available from `GET /production/youtube-relay-startup-checklist` for the local debug server.
`dev:youtube:ingest-once` is the operator command for a configured channel: it first requires
`ready_to_poll_youtube_ingest`, then performs one scheduler tick against only the YouTube source
and returns comment/support/error counts without live messages, platform IDs, cursor values,
endpoint values, candidates, or commands. It also embeds a compact live-readiness summary after the
attempt, repeating source/access/scheduler/runtime/support gate statuses and support type counts
without platform IDs, cursor values, messages, exact amounts, payloads, candidates, or commands.
The compact summaries carry only safe next-check script names or `null`, matching the runtime and
live-readiness contracts.
`dev:youtube:relay-roundtrip` covers the generic HTTP relay path where an upstream bridge owns
YouTube access. The relay fixtures verify comment normalization, support-event normalization, moderation-only
event ignoring, duplicate relay item suppression, one-fetch-per-scheduler-tick behavior where
applicable, safe counters, fixed relay status error kinds where applicable, and validation-gated
memory/relationship persistence.
