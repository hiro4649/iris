# Integration Status

`/integrations/status` is a local development endpoint for checking whether production-facing
bridges are configured without exposing secrets or runtime payloads.

`/production/config-doctor` and `npm run dev:config:doctor` provide a higher-level production
wiring checklist for real TTS, Live2D, OBS setup, YouTube API ingest, persistence, vision, and
game-control configuration. They report only environment variable names, status, and recommended
commands. They never report endpoint values, API keys, OAuth tokens, live text, candidates, or
record payloads.
`npm run dev:env:example-check` verifies that `.env.example` includes every environment variable
name used by the production configuration doctor. The check reports env names only, so setup
documentation can stay complete without leaking configured values.
Dev CLIs and the local bridge/server entrypoints load `.env` and then `.env.local` for `IRIS_`
variables before reading `process.env`. Existing shell variables are left intact, and public
readiness/config reports still surface only env names, status labels, counts, and scripts.
For side-effect-capable local bridges, the doctor also classifies configured targets by safe scope
without printing target values. Runtime TTS/Live2D/subtitle bridges, local TTS/Live2D engine
endpoints and health endpoints, OBS Browser Source origin/setup bridge targets, HTTP relay
live-chat, media-watch, external-topic, vision capture bridges, and game-control bridges are
production-ready only when their targets resolve to `loopback` or `private_network`. External or
malformed targets stay `attention` even when every required env name is present, preventing
accidental live packets, source polling, or approved game actions from being aimed at an unintended
public service.
`/integrations/status` exposes the same policy for local side-effect bridge items as fixed
`local_endpoint_policy_status` plus scope counts only. This lets an operator see `blocked` or
`not_configured` during ordinary dev-server checks without printing the configured URL. The top
level summary also aggregates applicable, allowed, missing, and blocked local endpoint policy counts
for quick dashboard checks.
For persistence, the recommended checks include `npm run dev:persistence:roundtrip`,
`npm run dev:persistence:candidate-gate-roundtrip`,
`npm run dev:persistence:http-roundtrip`, `npm run dev:persistence:backup-roundtrip`,
`npm run dev:persistence:failure-roundtrip`,
`npm run dev:persistence:local-env-profile`, `npm run dev:persistence:local-env-apply`,
`npm run dev:persistence:env-setup-plan`,
`npm run dev:persistence:policy-gate-roundtrip`, and
`npm run dev:persistence:status-roundtrip`, so
operators can verify the approved JSON write path, validation-before-store candidate gate, the
main HTTP persistence endpoints, sidecar backup recovery, malformed-store failure handling, local
env setup handoff, persisted relationship-profile validation, vector target policy blocking, and the
counts-only public status path separately.
Their public reports use storage booleans, counts, and safe error kinds only; store paths, raw
error messages, record payloads, summaries, candidates, hidden scores, and secrets stay out of the
report.
Production vector memory is tracked separately as `production_vector_memory`. It becomes ready only
when `IRIS_MEMORY_SEARCH_ADAPTER=http_vector` and `IRIS_MEMORY_SEARCH_ENDPOINT` are configured;
the endpoint must also classify as `loopback` or `private_network`, because even approved public
memory summaries should stay inside an operator-owned bridge. Public reports still expose only env
names, the adapter mode, and fixed local endpoint scope/status labels, never endpoint values, API
keys, memory summaries, or vector hit payloads.
`npm run dev:memory-vector:bridge` starts the local vector-memory bridge surface with startup JSON
limited to env names, paths, and policy labels.
`npm run dev:memory-vector:roundtrip` runs a fixture HTTP vector-search bridge and verifies that
only approved public memory records are sent while private summaries stay filtered.
`npm run dev:persistence:policy-gate-roundtrip` verifies the opposite configuration path: an
external vector bridge target remains blocked at preflight, launch-plan, and runtime-status gates
before memory search can run.
For YouTube relay deployments, the recommended checks include both
`npm run dev:youtube:relay-roundtrip` and `npm run dev:youtube:relay-status-roundtrip`, separating
event normalization from the relay source's counts-only public status boundary.
They also include `npm run dev:youtube:policy-gate-roundtrip`, which verifies that an external
relay target stays blocked at preflight, launch-plan, and runtime-status gates before polling.
For direct YouTube API deployments, the same diagnostics also track custom API endpoint, video
discovery endpoint, OAuth refresh timeout, initial page token, cursor store, polling,
dedupe, Retry-After/backoff behavior, OAuth refresh coalescing, and moderation env names. Their
values are never printed, because endpoints, OAuth cursors, cursor-store paths, moderation filters,
token refreshes, and operator credentials are treated as configuration-only data.
Production readiness now requires the HTTP ingest scheduler to be enabled for live polling, and
requires `IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH` for direct YouTube API deployments so restarts
can resume from the saved cursor without publishing the token. HTTP relay live-chat, media/topic,
and game-observation source readiness uses the same scheduler-enabled check plus local endpoint
scope checks for bridge targets.
When `IRIS_YOUTUBE_LIVE_CHAT_ID` is already known, `npm run
dev:youtube:direct-live-chat-roundtrip` verifies the no-discovery path separately and confirms that
the public report stays limited to booleans, counts, fixed type counters, and boundary flags.
`npm run dev:youtube:cursor-roundtrip` verifies that a persisted direct API cursor is restored
only into the next upstream request while public status hides the cursor value and local path.
`npm run dev:youtube:cursor-backup-roundtrip` verifies that the same cursor can recover from a
sidecar backup when the primary JSON is corrupt, again without exposing the cursor value, cursor
path, or backup path.
Direct API status also exposes `cursor_store_write_attention` and `last_cursor_write_result` so
operators can detect cursor persistence failures without seeing the page token, cursor-store path,
backup path, endpoint, or credentials.
`npm run dev:youtube:http-ingest-roundtrip` verifies the production-facing HTTP server path:
`POST /ingest/tick` pulls YouTube API comments/support events through the scheduler, then
`/ingest/status` and `/persistence/status` expose only counts, fixed statuses, and boundary flags.
`npm run dev:youtube:ingest-once` is the configured-channel one-shot: it refuses to poll until
preflight is ready, runs a YouTube-only scheduler tick, returns counts-only operator status, and
embeds a compact live-readiness summary for source/access/scheduler/runtime/support gates after the
attempt.
`npm run dev:youtube:readiness-rehearsal` and
`/production/youtube-readiness-rehearsal` are the read-only dry rehearsal before that one-shot. They
combine preflight, launch/env setup, source status, runtime status, and live-readiness without
calling YouTube or a relay, then separate "safe to run ingest-once" from "server already live
polling" using only env names, script names, fixed statuses, booleans, and counts.
`npm run dev:youtube:runtime-ingest-roundtrip` covers the in-process runtime path: fixture YouTube
comments/support enter the scheduler, update stream state and validation-gated persistence, and
`/production/youtube-runtime-status` exposes active scheduler telemetry plus the support-candidate
gate summary as counts, statuses, and booleans only.
That runtime status now also exposes `api_cursor_auth_flow`, a counts-only production access lane
summary for direct API vs relay selection, auth readiness, live-chat target resolution,
cursor-store health, upstream cooldown/backoff, operator-action blocks, and scheduler-produced
comment/support counts.
It also exposes `ingest_hygiene_flow`, which summarizes duplicate suppression, ignored items, and
moderation-filtered counts with fixed policy booleans so operators can verify those items never
double-trigger reactions or bypass moderation before runtime processing.
`npm run dev:youtube:support-gate-roundtrip` covers the negative persistence gate: a support event
is processed, donation reaction is observed, and disabled candidate persistence is reported as a
validator-stage block without support text or candidate payloads.
`/production/persistence-preflight` and `npm run dev:persistence:preflight` provide the same
compact operator gate for approved memory, relationship, and vector-memory readiness. It reports
only JSON-store status, relationship/candidate persistence booleans, vector adapter readiness,
missing env names, fixed attention reasons, and safe verification script names; store paths,
endpoint values, records, summaries, candidates, and secrets remain hidden.
The same report includes a persistence stage summary with per-integration ready/attention status
for the JSON memory/relationship store and vector-memory adapter, plus verification script counts
only.
`/production/persistence-launch-plan` and `npm run dev:persistence:launch-plan` expand that gate
into JSON store, candidate/relationship enablement, vector-memory search, and verification steps.
It reports only env names, fixed target-policy labels, and safe npm script names. Store paths,
memory records, relationship profiles, vector endpoint values, candidates, commands, and secrets
stay out of the report.
The launch plan repeats the first blocked step as top-level `next_step_id`, `next_step_order`,
`next_launch_script`, `next_readiness_script`, and `next_configure_env`, all env-name/script-name
only.
`/production/persistence-env-setup-plan` and `npm run dev:persistence:env-setup-plan` convert the
same launch steps into env groups for JSON store files, approval-gated persistence flags,
vector-memory search, and verification. It exposes only the next blocked group, env names, safe
script names, fixed IDs, and guidance labels.
`/production/persistence-local-env-profile` and `npm run dev:persistence:local-env-profile` add the
local `.env.local` profile for the same priority-3 persistence setup without exposing configured
values. It lists only env names, counts, safe script names, and operator labels; `-- --print-env`
is required before any template values are rendered locally.
`/production/persistence-local-env-apply-plan` and `npm run dev:persistence:local-env-apply` add
the dry-run/apply handoff for missing persistence env names. Materialization requires an explicit
CLI flag, appends missing names only, and keeps store paths, endpoint values, records, profiles,
summaries, candidates, commands, and secrets out of public JSON.
The launch plan also includes runtime persistence verification for runtime status, approved-record
flow, candidate-gate flow, relationship-value flow, long-term recall flow, lifecycle flow,
restart survival, backup health, HTTP persistence, and vector-search roundtrips, while keeping
candidate validation as the only route into approved memory or relationship schemas.
`/production/persistence-runtime-status` and `npm run dev:persistence:runtime-status` combine the
preflight gate with live runtime persistence status. They report capability flags, public counts,
store health, activity age, operation counts, backup-write counts, an approved-record flow summary,
identity-scope summary, candidate commit flow summary, relationship-value flow, and
long-term recall flow, and memory/relationship lifecycle flow without exposing records, profiles,
summaries, paths, endpoints, candidates, hidden scores, or commands. The relationship-value flow
adds relationship-level distribution counts and validation-gated policy booleans only. The
long-term recall flow reports approved-memory readback, per-user relationship recall, restart
durability, memory type/owner-scope counts, and vector-recall readiness without record payloads.
The lifecycle flow is the compact priority-3 operator signal for user-scoped long-term memory plus
relationship growth: it reports only configuration readiness, active counts, store health, and fixed
gate labels.
Runtime status also exposes `next_runtime_check_script`, and each blocking runtime flow exposes a
derived `next_check_script`. These are script-name-only fixed diagnostics for configuration,
runtime, store, candidate-gate, relationship-profile, and recall blockers; unsafe fragments or
mismatched blocker/script pairs are rejected by the contract.
`/production/persistence-live-readiness` and `npm run dev:persistence:live-readiness` fold those
runtime sections into the priority-3 production gate. It reports
`ready_for_persistence_operation` only after store health, approved records, validation-gated
candidate persistence, relationship values, long-term recall, and restart durability are all ready;
the surface remains counts/statuses/booleans only. The first blocked gate is exposed through
`next_gate_id` and top-level `next_check_script`, with per-gate `check_script` plus
`next_check_script` values. Each gate includes a safe `diagnostic_detail` for configuration,
runtime counts, store health, candidate validation/commit, relationship readiness, recall, and
lifecycle status without leaking records, profiles, summaries, store paths, candidates, or
commands.
The live-readiness surface carries the same env setup summary so production operators can continue
from the exact blocked persistence env group without seeing store paths, endpoint values, records,
profiles, summaries, candidates, or commands.
`/production/persistence-readiness-rehearsal` and
`npm run dev:persistence:readiness-rehearsal` add a read-only rehearsal between configuration and
live operation. It proves the persistence path without committing memory or relationship candidates:
candidate and approved-record commit attempt flags are always false, direct candidate commit is
explicitly disallowed, and the next safe step is reported as a script name such as the candidate-gate
roundtrip. The report hides memory records, relationship profiles, store paths, summaries,
candidates, endpoint values, and commands.

`/production/readiness-runbook` and `npm run dev:production:runbook` group the same production
checks by deployment priority: TTS/Live2D/OBS foundation first, YouTube comments/support events
plus media/topic summary ingestion second, persistence third, then vision and safe game control.
The runbook is read-only and exposes only env names, status summaries, and verification script
names.
It also includes `verification_plan`, a script-name-only execution plan for the next attention
stage. When every stage is ready, the plan reports `all_stages_ready`; otherwise it returns the
next stage ID, priority, stage summaries, and that stage's verification script list without
endpoint values, secrets, live payloads, candidates, commands, or adapter packets.
The same runbook includes `operator_launch_plan` for the TTS/Live2D/OBS foundation. It lists only
safe local npm scripts, process IDs, required/optional environment variable names, and missing env
names for the local helper bridges, worker, dev server, and OBS Browser Source setup. It does not
launch processes, expose endpoint values, or grant adapter authority.
Each launch step also carries a fixed `launch_readiness_status`, and the plan exposes ready and
attention step counts plus the first blocked step ID/order. It also exposes `next_launch_script`,
`next_readiness_script`, and `next_configure_env`, all restricted to safe script names and env names.
This lets operators catch missing foundation env names before starting bridge processes, still
without printing any configured values. The local bridge step requires both the stale-manifest guard
and artifact-sync guard env names before an OBS handoff launch can become ready.
The launch plan also embeds `operator_startup_plan`, the same live-session startup classification
used by the dedicated foundation launch plan. It marks each process as a long-running service,
watch worker, or one-shot OBS setup, reports dedicated terminal needs, and mirrors the first blocked
startup step using safe npm script names and `IRIS_*` env names only.
`/production/foundation-preflight` and `npm run dev:foundation:preflight` expose a compact
pass/fail foundation startup report with the first blocked process and missing env names only.
The same report also includes a foundation stage summary for the TTS/Live2D/OBS integrations:
per-integration ready/attention status, adapter mode labels, missing env counts, and verification
script counts only. If the env names are complete but a side-effect target violates the local
endpoint policy, the report stays blocked as `blocked_by_configuration`. It still hides endpoint
values, secrets, adapter payloads, subtitle text, and render artifacts.
`npm run dev:foundation:launch-plan` and `GET /production/foundation-launch-plan` print the full
launch plan plus the next verification plan for the foundation stage, using the same env-name-only
and command-name-only boundary. The response now includes a dedicated `foundation_launch_plan`
with VOICEVOX helper, Live2D helper, local bridge, worker, dev server, and OBS setup steps plus
fixed local-target policy labels; endpoint values, credentials, payloads, and artifacts stay hidden.
It repeats the first blocked step's next launch/readiness scripts and env-name-only configuration
list at the top level so operators do not have to inspect every launch step to continue safely.
`operator_startup_plan` summarizes the same sequence for live operation: long-running services,
the watch worker, one-shot OBS setup, dedicated terminal count, and the next blocked startup step.
It remains read-only and publishes only fixed labels, counts, safe local npm script names, and
`IRIS_*` env names.
`npm run dev:foundation:startup-checklist` and
`GET /production/foundation-startup-checklist` provide the operator-facing checklist derived from
that plan. It includes terminal labels, startup counts, next startup/readiness scripts, and
env-name-only hints for the first blocked process, with validators blocking endpoint values,
secrets, raw text, memory or relationship candidates, game input candidates, and command payloads.
`npm run dev:foundation:env-setup-plan` and
`GET /production/foundation-env-setup-plan` add an env-group view for the same foundation stage.
Runtime HTTP adapters, local bridge storage, real TTS engine, real Live2D engine, bridge worker,
IRIS dev server, and OBS overlay each report required/missing env names, connector IDs,
ready/attention counts, safe scripts, and fixed guidance labels only. The top-level next group
points to the next env names to fill before connector handoff, without exposing configured values.
`npm run dev:foundation:local-env-profile` and
`GET /production/foundation-local-env-profile` add the safe local profile for the same first-stage
wiring. The default report stays env-name-only and script-name-only, listing local route paths and
startup order without endpoint values. Operators must pass `--print-env` to the CLI to render the
actual `.env.local` template for the local bridge, VOICEVOX helper, Live2D cue helper, dev server,
and OBS Browser Source.
`npm run dev:foundation:local-env-roundtrip` and
`GET /production/foundation-local-env-roundtrip` parse that template in memory and verify that the
first-stage production doctor checks and env setup lanes become ready. The roundtrip remains
read-only: it does not create `.env.local`, launch processes, print endpoint values, or expose the
template text.
`npm run dev:foundation:local-env-apply` and
`GET /production/foundation-local-env-apply-plan` add the guarded local-file handoff. The HTTP
surface and default CLI stay dry-run and env-name-only; the CLI writes `.env.local` only with the
explicit `--materialize` flag and refuses to replace an existing file unless `--replace-existing`
is also passed.
`npm run dev:foundation:local-env-rehearsal` and
`GET /production/foundation-local-env-rehearsal` rehearse that local profile across connector,
env setup, launch, startup, and foundation-status gates without creating files or calling engines.
It reports only file names, env names, counts, booleans, fixed statuses, and safe npm script names,
so the operator can see whether to materialize `.env.local`, review an existing file, or start the
first foundation process. When `.env.local` already exists, the rehearsal parses that file
internally and runs the same local-target and launch gates against the existing values, while still
withholding endpoint values and template text from the report.
`npm run dev:foundation:connector-handoff` and
`GET /production/foundation-connector-handoff` add the corresponding integration handoff for real
TTS, Live2D, and OBS implementers. It lists each connector in handoff order with fixed readiness
status, attention reason, schema names, safe scripts, and `IRIS_*` env names only; runtime text,
adapter packets, endpoint values, secrets, candidates, and commands are rejected.
The same plan now carries a runtime handoff verification summary for the foundation status,
foundation runtime status, live-readiness gate, bridge status/engine roundtrips, engine probe, and
OBS runtime render roundtrip, exposing only safe script names and fixed expected readiness labels.
`npm run dev:foundation:status` and `GET /production/foundation-status` add the read-only status
view for that foundation. It reports HTTP adapter readiness, local bridge worker status, event
render-manifest counts, TTS/Live2D engine modes, OBS Browser Source dimensions, and local route
paths only. It does not call engines or configure OBS, and it hides endpoints, secrets, packets,
text payloads, artifact paths, candidates, and commands.
`npm run dev:foundation:runtime-status` and `GET /production/foundation-runtime-status` add the
runtime handoff view after the dev server is running. It reports foundation readiness, overlay
health, overlay event stream counts, local bridge worker readiness/queue counts, real TTS/Live2D
engine handoff status, and OBS Browser Source readiness plus render-manifest OBS pickup readiness
as counts, booleans, and fixed status labels only. `ready_for_obs_runtime_handoff` requires the
local worker to be ready with a clear queue, real-engine handoff to be ready or active, OBS Browser
Source readiness, overlay runtime/event stream readiness, and render-manifest pickup readiness. It
hides raw stream state, display text, event IDs, endpoint values, route values, artifact paths,
raw jobs, engine request values, candidates, and commands. The runtime summary exposes
`next_runtime_check_script`, and each detailed flow exposes a matching `next_check_script`, but
only as safe local npm script names.
The `runtime_handoff_flow` section exposes the same production sequence as one blocking-stage
summary so operators can tell whether the next action is worker, engine, OBS, overlay, event stream,
or render-manifest related without exposing any route, endpoint, artifact, text, or job payload.
The `real_engine_worker_flow` section isolates the real TTS/Live2D worker lane: engine mode and
preference readiness, adapter readiness, pending/retry/backoff/blocked queue counts, job-expiry
guard state, and operator-action requirements are counts/statuses only. It gives operators a
clear distinction between "waiting for a runtime job", "retry backoff", and "worker attention"
without publishing raw jobs, engine request values, endpoints, artifacts, text, candidates, or
commands, and points to the worker or engine diagnostic script for its current blocker.
The `obs_render_artifact_flow` section narrows that to OBS pickup readiness, including grouped
TTS/Live2D/subtitle artifact availability, contract validity, latest-manifest freshness, and
worker/engine gating. It remains counts/statuses/booleans only and publishes no artifact body,
local path, event ID, text, endpoint, or raw job; its next-check script stays a script-name-only
OBS/render diagnostic.
`npm run dev:foundation:live-readiness` and
`GET /production/foundation-live-readiness` combine the runtime handoff status with the configured
production probe. The live gate is ready only when runtime handoff is ready, both real TTS/Live2D
health probes pass their declared contracts, any configured OBS setup bridge health probe passes,
and no local endpoint policy checks are blocked. The same report now splits that view into
`real_engine_gate` and `obs_gate`, distinguishing TTS/Live2D health or worker-queue blockers from
OBS Browser Source and grouped artifact-pickup blockers. It also embeds
`env_setup_plan_summary` and `connector_handoff_summary`, which mirror the next env-group and
connector-level setup points using only counts, fixed statuses, env names, and script names. It exposes `next_gate_id`, top-level
`next_check_script`, and per-gate `check_script` plus `next_check_script` values, while staying
read-only with no endpoint values, payloads, candidates, commands, artifacts, or secrets. Ready
gates expose no next check; attention gates point to the blocked runtime flow or gate diagnostic.
`/production/foundation-readiness-rehearsal` and
`npm run dev:foundation:readiness-rehearsal` add the matching priority-1 dry rehearsal over the
same TTS/Live2D/OBS path. It recomputes foundation status, launch/env setup, runtime handoff, and
live readiness, but never starts bridge processes, calls TTS/Live2D engines, posts adapter packets,
updates OBS, materializes env files, or writes render manifests. Attempt flags remain false, and
the surface stays limited to fixed statuses, booleans, counts, env names, and safe script names.
`/production/live-readiness` and `npm run dev:production:live-readiness` aggregate the live gates
for the production priority order. The report points to the first blocking priority and
gate-specific normal check script plus actionable `next_check_script`, then mirrors
`/production/next-task` with top-level `next_launch_script`, `next_readiness_script`, and
`next_configure_env` while keeping endpoints, secrets, live payloads, records, candidates, approved
actions, raw frames, and commands out of the public surface.
`npm run dev:foundation:blocked-worker-roundtrip` covers the negative runtime gate where a
malformed worker outbox line keeps the first-stage runtime status at
`waiting_for_local_bridge_worker` instead of allowing OBS handoff readiness to pass.
`npm run dev:foundation:policy-gate-roundtrip` covers the matching configuration gate where an
external runtime bridge target prevents foundation startup and runtime-status handoff before any
adapter call can proceed.
`/production/youtube-preflight` and `npm run dev:youtube:preflight` provide the same compact
operator gate for YouTube comments/support ingest: source mode, auth readiness, scheduler/cursor
readiness, missing env names, and safe verification script names only.
The report also summarizes the full comments/support stage, so operators can see whether
media-watch and external-topic ingestion are ready or still need attention without exposing
endpoint values, live text, support messages, cursors, secrets, or candidates.
`/production/youtube-launch-plan` and `npm run dev:youtube:launch-plan` expand that gate into a
startup sequence for direct YouTube Data API polling or a local relay. It reports the source-path,
upstream target, credential, cursor, and HTTP ingest scheduler steps using only fixed process IDs,
env names, status labels, and safe npm script names. Endpoint values, YouTube IDs, OAuth/API
secrets, cursor values, comments, support messages, payloads, candidates, and commands remain out
of the report.
The same top-level next-step fields identify the first blocked ingest launch script, readiness
script, and env-name-only configuration list without exposing live chat targets or credential
values.
`/production/youtube-local-env-profile` and `npm run dev:youtube:local-env-profile` add the
matching local env template profile for that priority-2 lane. The default JSON response exposes
only env names, source-mode labels, operator labels, and safe script names; the env template itself
is printed only with the explicit `-- --print-env` flag.
`/production/youtube-local-env-apply-plan` and `npm run dev:youtube:local-env-apply` add the
guarded local-file handoff. The HTTP route is dry-run only, while the CLI requires `-- --materialize`
before it creates or appends `.env.local`; the report remains names/counts/scripts only and never
returns endpoint values, credentials, cursor values, payloads, candidates, commands, comments, or
support-message text.
`/production/youtube-env-setup-plan` and `npm run dev:youtube:env-setup-plan` convert that launch
gate into an env-group handoff for source selection, live-chat target, credentials, cursor resume,
and HTTP ingest scheduler setup. It repeats the first blocked group with env names, fixed IDs,
safe script names, and guidance labels only, while continuing to suppress endpoint values,
platform IDs, credentials, cursor values, live payloads, support messages, candidates, and
commands.
The launch plan also carries a runtime poll verification summary for source status, configured
ingest, runtime status, runtime ingest roundtrip, scheduler roundtrip, cursor resume/backup checks,
and the source-specific API/relay roundtrip. The summary keeps support-event donation handoff and
memory/relationship validation gates explicit without exposing live payloads or cursor values.
`/production/youtube-source-status` and `npm run dev:youtube:source-status` add the matching
read-only adapter status check before polling starts. It exposes only source kind, readiness/auth
labels, request/support counters, cursor-store health flags, retry state, and relay scope labels;
IDs, cursor values, endpoints, credentials, live text, support messages, candidates, and commands
remain out of the report.
For vision/game-control, `npm run dev:vision:unsafe-roundtrip` and
`npm run dev:game-control:unsafe-roundtrip` cover unsafe-success cases: a bridge returning
candidates, commands, raw frames, endpoint values, authorization fields, or secrets is rejected or
converted to a failed summary before unsafe payloads enter public runtime state. Expired approved
game actions are also rejected before fetch, so delayed handoff cannot use stale screen
observations.
`/production/gameplay-preflight` and `npm run dev:gameplay:preflight` add a compact operator gate
for that same stage. It reports only vision/game-control readiness, scheduler/method booleans,
available action counts, fixed local-target policy statuses, missing env names, attention reasons,
and safe verification script names; raw frames, OCR text, action candidates, approved actions,
endpoint values, credentials, and adapter payloads are never exposed.
`/production/gameplay-launch-plan` and `npm run dev:gameplay:launch-plan` expand the gate into
operator launch steps for the vision source, capture metadata, approved-control bridge, rate/stale
guards, and verification. The output remains read-only and reports only env names, fixed
target-policy labels, safe script names, counts, and booleans; it never exposes frames, OCR text,
action candidates, approved actions, endpoint values, credentials, or adapter payloads.
It also exposes the first blocked launch step as top-level next launch/readiness scripts and env
names only, preserving the no-candidate/no-approved-action boundary in operator guidance.
`/production/gameplay-local-env-profile` and `npm run dev:gameplay:local-env-profile` provide the
local `.env.local` profile for the same priority-4 setup without exposing configured values. It
lists env names, counts, safe scripts, and operator labels only; `-- --print-env` is required before
template values are rendered locally.
`/production/gameplay-local-env-apply-plan` and `npm run dev:gameplay:local-env-apply` provide the
dry-run/apply handoff for missing gameplay env names. Materialization requires an explicit CLI flag,
appends missing names only, never overwrites existing values, and keeps endpoint values, frames, OCR
text, input candidates, approved actions, commands, and secrets out of public JSON. The template does
not make game control operational by itself: control still requires explicit enablement, an approved
local bridge, allowed actions, and validator approval before adapter handoff.
`/production/gameplay-env-setup-plan` and `npm run dev:gameplay:env-setup-plan` convert the same
launch steps into env groups for the vision source, capture metadata, approved-control adapter,
rate/stale safety guards, and verification. It exposes only the next blocked group, env names,
safe script names, fixed IDs, and guidance labels.
It also carries runtime safe-control verification for gameplay runtime status, gameplay runtime
roundtrip, policy-gate blocking, validation-gate blocking, vision unsafe checks, game-control
failure/unsafe checks, and the production loop, making validator-before-adapter and no
approved-action publication explicit. The same verification requires fresh observation,
summary-only vision handoff, approved-schema-only actions, no direct OS input, and no game-action
delivery to non-game adapters.
`npm run dev:gameplay:policy-gate-roundtrip` verifies that external vision and game-control
targets stay blocked at preflight, launch-plan, and runtime-status gates before polling or adapter
handoff.
`/production/gameplay-runtime-status` and `npm run dev:gameplay:runtime-status` add the live
runtime check for the same boundary. It reports scheduler/source counts, vision telemetry counts,
latest game-observation status, validator status, safe-control status, boundary-audit status, and
a `game_vision_capture_flow` summary plus `vision_to_safe_action_flow`, safe-control, and
safe-action lifecycle summaries for the active blocking stage only. The vision-capture flow separates
screen polling, observation presence, low-confidence handling, and no-payload capture boundaries from
the downstream action gate; the vision-to-safe-action flow joins capture, perception, proposal,
validation, and adapter acknowledgement while keeping raw vision and proposals non-authoritative. Action
candidates, approved action payloads, raw frames, OCR text, endpoints, secrets, and scheduler
results stay hidden; direct OS input is forbidden and non-game adapters never receive game actions.
Runtime status also publishes `next_runtime_check_script`, and each blocking vision/control flow
publishes a fixed-stage-derived `next_check_script`. These script-name-only diagnostics cover
configuration, scheduler, vision capture, confidence, validator, adapter-status, adapter-ack, and
boundary-audit blockers without exposing frames, OCR, candidates, approved actions, endpoints, or
shell fragments.
`/production/gameplay-live-readiness` and `npm run dev:gameplay:live-readiness` fold that runtime
surface into the priority-4 live gate. They require configuration, scheduler, vision capture,
validation, adapter readiness, adapter acknowledgement, safe-control lifecycle, and
vision-to-safe-action status before reporting `ready_for_gameplay_safe_control`, and the report is
strictly read-only with no polling or control side effects. The first blocked gate is published as
`next_gate_id` plus top-level `next_check_script`, and each gate carries a safe `check_script` plus
attention-only `next_check_script` without exposing frames, OCR, candidates, approved actions,
endpoints, or commands. Each gate also includes a safe `diagnostic_detail` for configuration,
scheduler, vision capture, validation, adapter ACK, safe-control lifecycle, and vision-to-action
counts.
The live-readiness surface carries the same gameplay env setup summary so production operators can
continue from the exact blocked vision/control env group without seeing frames, OCR text,
candidates, approved actions, endpoint values, or commands.
`/production/gameplay-readiness-rehearsal` and
`npm run dev:gameplay:readiness-rehearsal` add the no-capture/no-control rehearsal for that
priority-4 gate. The report recomputes gameplay preflight, launch-plan, env setup, runtime-status,
and live-readiness summaries, but keeps capture, adapter handoff, and game-control attempt flags
false. It also makes the Phase24 boundary explicit: action proposals are review-only and never sent
to the adapter unless a separate approved game action has passed validation. The rehearsal publishes
only fixed statuses, booleans, counts, env names, and safe script names; frames, OCR text, vision
payloads, operation candidates, approved action payloads, endpoints, credentials, and commands stay
out of the surface.
`npm run dev:gameplay:runtime-roundtrip` verifies that boundary with a local fixture vision bridge:
the scheduler processes one game observation, runtime validates control before adapter handoff, and
the runtime status reaches `safe_control_active` without publishing endpoints, frame references,
operation candidates, approved action payloads, or raw scheduler results.
`npm run dev:gameplay:validation-gate-roundtrip` covers the blocking path: a low-confidence
observation reaches runtime, `game_vision_capture_flow` marks the confidence block, safe-control
remains at the validator stage, and no game-control bridge request is sent. The public report stays
limited to counts, booleans, and fixed statuses.
The report also includes a gameplay stage summary with per-integration ready/attention status for
screen capture/vision ingestion and approved game control, plus verification script counts only.
The production config doctor only marks vision ready when both `IRIS_GAME_OBSERVATION_ENDPOINT`
and `IRIS_GAME_OBSERVATION_METHOD` are configured, the method is one of the supported request
modes, the endpoint is local-scoped, and the HTTP ingest scheduler is enabled. It reports method,
scheduler, and endpoint-scope support as booleans/fixed scope labels, not raw configured values.
The same fixed local-scope reporting is used for HTTP relay live-chat, media-watch, and
external-topic source bridges.

`npm run dev:production:probe` combines the config doctor, readiness runbook, integration status,
and guarded adapter probe into one priority-ordered report. Its default `dry_run` mode is read-only.
`npm run dev:production:probe -- --fixture-post` sends only synthetic adapter packets to configured
HTTP adapter endpoints. The report must not expose endpoint values, API keys, OAuth tokens, live
payloads, raw adapter packets, candidates, commands, memory records, or game actions.
`readiness_status` reports whether required configuration groups are present. `verification_status`
then reports whether the configured probes themselves are clean: engine health request-schema and
response-shape mismatches, missing health endpoints, adapter probe failures, and OBS health
attention all keep the report in `configured_probe_attention` until the real bridge side is fixed.
The report also carries the runbook `verification_plan`, so operators can read the next priority
stage and script-name-only verification list from the aggregate probe without exposing endpoints,
secrets, payloads, or shell fragments.
It also carries a compact `next_task_summary` aligned with `/production/next-task`, including the
first blocked priority, gate counts, next launch/readiness scripts, env-name-only setup list,
runtime verification script, and fixed expected runtime status. That summary remains
script/status/env-name-only and does not expose live targets, records, candidates, payloads, or
approved actions.
The same summary includes `next_diagnostic_detail` for the first blocked priority plus
per-gate `diagnostic_detail` objects. These are schema-validated booleans, counts, and fixed labels
only: launch-step progress, env/config counts, runtime-flow expectations, and stage-specific
readiness such as YouTube source/auth/cursor state, persistence/vector-memory flags, or gameplay
vision/control setup. Endpoint values, secrets, live text, records, candidates, approved actions,
raw frames, and commands remain excluded.
It also carries the same `operator_launch_plan` so the aggregate probe can show the intended local
startup order for real TTS/Live2D/OBS scaffolding using script/env names only. That includes the
embedded `operator_startup_plan`, so the probe can distinguish persistent helper services, the
watch worker, and one-shot OBS setup without exposing endpoint values or payloads.
The production probe carries the same local endpoint policy as scope counts and a fixed
`local_endpoint_policy_status`, so an operator can see that a configured check is blocked by an
external or malformed side-effect target without seeing any URL value.
Its top-level and per-stage summaries aggregate allowed, missing, and blocked local endpoint
policy counts, plus fixed scope counts, so release checks can fail fast before any TTS, Live2D,
OBS, relay/source polling, vector-memory lookup, vision, or game-control side effect is attempted.
Fixture-post probes, local TTS/Live2D engine health probes, OBS health checks, OBS setup posts,
local engine worker POSTs, HTTP relay live-chat, media-watch, external-topic, and vision bridge
sources also enforce the same policy before calling `fetch`. External or malformed targets become
summary-only attention/failure results with `local_endpoint_policy_blocked` instead of making a
network request.

`npm run dev:production:next-task` and `GET /production/next-task` provide the compact operator
loop for continuing work in deployment-priority order. They summarize the existing foundation,
YouTube ingest, persistence, and gameplay preflight/status reports into four gates and return only
the first blocked priority plus script-name-only next checks, launch-plan next scripts,
env-name-only next configuration hints, runtime verification script, and fixed expected runtime
status. Each gate also names the required runtime flow summary, schema, success status, and `none`
blocking stage so operators can verify the same safe lifecycle surface across priorities. The
report is read-only and hides endpoints, secrets, live payloads, records, candidates, commands, and
raw frames. It also publishes schema-checked `diagnostic_detail` objects for every priority gate and
mirrors the first blocked one as `next_diagnostic_detail`, limited to safe booleans, counts, and
fixed labels.
When the foundation priority is the current blocker, it also mirrors a compact
`next_operator_startup_summary`: startup kind counts, dedicated terminal count, and the next
startup/readiness scripts plus `IRIS_*` env names. It does not expose endpoint values, command
payloads, or full adapter packets. The same foundation gate exposes `startup_checklist_script`,
mirrored as top-level `next_startup_checklist_script`, so operators can jump to
`npm run dev:foundation:startup-checklist`; non-foundation gates keep that pointer `null`.

`npm run dev:production:scheduler-enablement` and
`GET /production/scheduler-enablement` provide the narrower scheduler activation view for the two
stages that depend on the HTTP ingest scheduler: YouTube comments/support and gameplay
vision/safe-control. It tells the operator whether the next blocker is source/configuration,
`IRIS_ENABLE_HTTP_INGEST_SCHEDULER`, scheduler runtime availability, scheduler start, or runtime
rehearsal. The report has no polling or control side effects and exposes no endpoint values,
secrets, live payloads, support messages, candidates, approved actions, raw frames, or raw
scheduler results.

`npm run dev:production:live-readiness` and `GET /production/live-readiness` apply the same
priority order to the stricter live-operation gates. They return the first blocking live stage,
first attention gate, gate-specific normal check script, gate-specific `next_check_script`,
runtime-status script, expected live-ready status, and `/production/next-task` launch guidance via
`next_launch_script`, `next_readiness_script`, `next_startup_checklist_script`, and
`next_configure_env` without copying the underlying live payloads, records, candidates, approved
actions, raw frames, endpoints, commands, or secret values. When the foundation priority is
blocked, it also mirrors `next_operator_startup_summary`, limited to service/worker/setup counts,
dedicated terminal count, safe startup/readiness/checklist scripts, and `IRIS_*` env names. Each
stage carries `startup_checklist_script`; only the foundation stage may point at
`npm run dev:foundation:startup-checklist`.

`npm run dev:youtube:runtime-status` and `GET /production/youtube-runtime-status` add the matching
runtime view for production YouTube ingest. It combines the YouTube source status, preflight, and
HTTP ingest scheduler status, then reports only fixed readiness labels, scheduler counts, a
poll-flow blocking stage, an API/cursor/auth flow, an ingest hygiene flow, support event type counts,
amount-source counts, and a support-candidate flow summary for donation reaction, validation, and
approved persistence progress. Its policy keeps comments as comment events and support events as
donation events, preventing support payloads from being counted as ordinary comments or bypassing
donation/candidate validation. It does not
poll, does not expose live comments or support messages, and hides endpoints, credentials, cursor
values, raw stream state, candidates, and commands.

`npm run dev:youtube:live-readiness` and `GET /production/youtube-live-readiness` turn the runtime
view into the priority-2 production gate. They require source config, direct API auth or relay
selection, scheduler activity, runtime comment/support handoff, and donation/candidate safety
before reporting `ready_for_youtube_live_ingest`, while keeping the response to fixed statuses,
booleans, counts, and script names. The report exposes `next_gate_id`, `next_check_script`, and
gate-level `check_script` plus `next_check_script` values so production monitoring can move from
the first attention gate to the right diagnostic without live payloads. Each gate also carries a
safe `diagnostic_detail` for source config, direct API/relay access, cursor health, scheduler
activity, runtime handoff, and support candidate counts. The support pipeline gate
carries support-event type and amount-source-kind counts so production monitoring can distinguish
Super Chat, stickers, memberships, gifts, and normalized support events without exposing messages,
IDs, exact amounts, payloads, candidates, or commands.

`npm run dev:youtube:readiness-rehearsal` and
`GET /production/youtube-readiness-rehearsal` add a no-poll rehearsal for the same priority-2
surface. It reports whether configuration is complete enough to run the operator one-shot, whether
the long-running scheduler is already live-ready, which safe script comes next, and the blocking
runtime flow stage. It remains read-only and publishes no live payloads, support messages,
platform IDs, cursor values, endpoints, secrets, candidates, or commands.

`npm run dev:foundation:readiness-rehearsal` and
`GET /production/foundation-readiness-rehearsal` provide the priority-1 dry rehearsal for the real
TTS/Live2D/OBS foundation. They check local bridge, worker, real-engine, OBS, runtime, and probe
gates without starting processes, calling engines, updating OBS, posting fixtures, or creating
files.

`npm run dev:persistence:readiness-rehearsal` and
`GET /production/persistence-readiness-rehearsal` provide the matching priority-3 dry rehearsal.
They check configuration, runtime, and store gates without committing memory or relationship
candidates, keep commit-attempt flags false, and point to the next safe persistence diagnostic.

`npm run dev:gameplay:readiness-rehearsal` and
`GET /production/gameplay-readiness-rehearsal` provide the matching priority-4 dry rehearsal.
They check configuration, runtime, vision, validation, and adapter gates without capturing the
screen, sending candidates to the adapter, or performing game-control side effects.

`/integrations/contracts` is the companion manifest for external implementers. It describes the
TTS, Live2D, subtitle, bundled VOICEVOX/Live2D helper bridges, OBS overlay, OBS setup bridge, and
source-bridge contracts without exposing live payloads.

`/integrations/fixtures` returns synthetic adapter packets, local TTS/Live2D engine request and
response examples, an operator-only OBS setup request example, and one synthetic overlay display
event so bridge implementers can validate request parsing without waiting for a real stream event.

`POST /integrations/probe` is the guarded bridge check for TTS, Live2D, and subtitle adapters. It
defaults to `dry_run`, which reports whether each HTTP bridge is ready to receive fixture probes
without sending network traffic. With `{ "mode": "fixture_post" }`, it posts only the synthetic
fixture packets to configured local HTTP bridges and returns safe acknowledgement summaries. The
probe report also includes local bridge engine-worker readiness for outbox/artifact paths and real
TTS/Live2D engine modes, again using environment variable names only.

`npm run dev:bridge` starts a local receiver for `/tts`, `/live2d`, `/subtitle`, and
`/game-control`. It validates `iris_adapter_packet_v1` for TTS/Live2D/subtitle, validates only
`approved_game_input_action` for game control, returns small acknowledgement payloads, and exposes
`/status` with safe counts and timing summaries only. It is meant as the first replaceable bridge
boundary for real TTS engines, Live2D SDK calls, subtitle renderers, and approved game-control
adapters.
Its `/health` route returns `iris_local_bridge_health_v1`: fixed bridge readiness, accepted adapter
kinds, outbox/artifact-storage configured booleans, manifest/artifact-delivery route availability,
the stale-guard configured boolean, and local route paths only. It does not expose local directory
paths, endpoint values, packets, jobs, text payloads, candidates, commands, or secrets.
`npm run dev:bridge:status-roundtrip` posts synthetic TTS/Live2D/subtitle packets, drains the local
engine worker, and verifies that both bridge `/status` and worker status remain summary-only. The
report must not expose endpoint values, raw packets, raw jobs, text payloads, candidates, commands,
or secrets.
The local bridge also exposes `/event-render-manifests/status` and
`/event-render-manifests/latest` for synchronized render handoff monitoring. They report completed
manifest counts, latest safe IDs, artifact kinds, engine modes, `obs_pickup_status`,
fixed `obs_handoff_readiness_status`, `obs_pickup_ready`, per-adapter safe-reference flags,
artifact-file availability booleans, content types, per-adapter artifact freshness status, and byte
counts plus `obs_pickup_blocking_adapter_*` summaries so OBS/operator tooling can confirm that TTS,
Live2D, and subtitle artifacts are being grouped by event ID, are ready for local pickup, and which
adapter blocks pickup when they are not ready; artifact paths, packet text, raw jobs, candidates,
commands, endpoints, and secrets stay local. `obs_handoff_readiness_status` is one of
`ready`, `waiting_for_manifest`, `waiting_for_complete_artifacts`, `waiting_for_fresh_render`,
`operator_action_required`, or `attention`, while `obs_pickup_status` keeps the more specific
blocker kind. If a local manifest is tampered to point outside
`IRIS_LOCAL_BRIDGE_ARTIFACT_DIR`, the latest report marks that adapter as
`unsafe_reference` / `unsafe_artifact_reference` and does not check the external file.
When `IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS` is configured, the latest report also exposes
only freshness status, max age, and stale-rejection booleans; stale manifests are not OBS-pickup
ready, and artifact delivery returns a fixed 409 `stale_manifest` summary without paths or payloads.
The same max-age guard is applied to each grouped artifact's `rendered_at_ms`; a fresh manifest with
one stale, unknown, or future-clock-skewed artifact returns `stale_artifact`, marks the whole group
not ready, and blocks all latest-artifact routes with summary-only 409 responses.
When `IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS` is configured, the latest report also compares
the grouped TTS, Live2D, and subtitle `rendered_at_ms` values. A group whose artifacts were rendered
too far apart returns `artifact_sync_skew`, marks OBS pickup as waiting for a fresh render, and keeps
all path, payload, text, and artifact bodies hidden.
Before local OBS delivery, artifact bodies are also checked against their expected local contracts.
Malformed WAV, Live2D cue JSON, Live2D engine cue schemas, or VTT artifacts return
`invalid_artifact`, mark the whole group not ready, and block all latest-artifact routes without
exposing artifact bodies or paths.
For local content pickup after that readiness check, `/event-render-manifests/latest/artifact/tts`,
`/event-render-manifests/latest/artifact/live2d`, and
`/event-render-manifests/latest/artifact/subtitle` serve only the latest complete manifest's
artifact bodies by adapter kind. They do not accept arbitrary file paths, and failed requests return
fixed error summaries with `artifact_delivery_readiness_status`, without path values or payload
echoes.
`npm run dev:obs:render-handoff-roundtrip` verifies the same latest-manifest and artifact delivery
paths through the main IRIS HTTP server origin advertised by `/obs/browser-source`.
`npm run dev:obs:invalid-artifact-roundtrip` verifies that malformed grouped artifacts cannot be
delivered through that same origin even when the latest manifest is fresh.
`npm run dev:obs:stale-artifact-roundtrip` verifies that an old grouped artifact cannot be delivered
through that same origin even when the latest manifest file itself is fresh.
`npm run dev:obs:runtime-render-roundtrip` verifies the stronger local integration path where
`POST /comment` creates adapter packets, the local bridge writes outbox jobs, the engine worker
renders grouped artifacts, and the main HTTP server serves the latest OBS artifacts with only
summary metadata in the report. It also verifies that
`/production/foundation-runtime-status` reaches `ready_for_obs_runtime_handoff`, so operators can
trust the production foundation status after a successful OBS artifact pickup path.
Rejected local bridge requests also remain summary-only. Invalid JSON, oversized bodies, contract
errors, and unsafe packet payloads are reduced to fixed `error_kind` values with boundary flags;
the response must not include raw exception messages, request text, candidates, endpoint values, or
secret values. `npm run dev:bridge:error-roundtrip` verifies this rejection path directly.

`npm run dev:bridge:worker` is the matching local artifact worker. It reads validated outbox jobs,
drains pending batches until the outbox is idle, renders local development artifacts, and writes
safe receipts:

```text
<artifacts>/tts/*.wav
<artifacts>/tts/*.visemes.json
<artifacts>/live2d/*.live2d.json
<artifacts>/subtitle/*.vtt
<artifacts>/<kind>/receipts.jsonl
<artifacts>/<kind>/latest_receipt.json
<artifacts>/event_render_manifests.jsonl
<artifacts>/latest_event_render_manifest.json
```

The current TTS artifact is a silent WAV placeholder plus viseme data so the integration path can
be exercised before a real TTS engine is selected. Live2D output is a cue JSON file for SDK
adapters, and subtitle output is a WebVTT file. Worker reports and receipts expose artifact
availability and IDs only; they must not expose raw jobs, text payloads, candidates, commands,
approved game actions, memory records, relationship records, endpoint values, authorization
echoes, or secrets.
When the worker has rendered TTS, Live2D, and subtitle artifacts for the same `event_id`, it also
writes an event render manifest. The manifest is a local operator artifact that groups the three
validated artifact paths for OBS or bridge-side synchronization. Public worker reports expose only
manifest IDs, event IDs, adapter kinds, artifact kinds, engine modes, and counts; they do not expose
artifact paths, text, job payloads, candidates, commands, endpoints, or secrets.

For a live local session, run `npm run dev:bridge:worker -- --watch` or set
`IRIS_LOCAL_BRIDGE_WORKER_WATCH=true`. Watch mode repeatedly drains pending jobs and prints one
summary-only drain report per tick. `IRIS_LOCAL_BRIDGE_WORKER_INTERVAL_MS`,
`IRIS_LOCAL_BRIDGE_WORKER_MAX_PASSES`, and `IRIS_LOCAL_BRIDGE_WORKER_LIMIT_PER_KIND` control the
poll interval and per-tick drain bounds. `IRIS_LOCAL_BRIDGE_WORKER_CONTINUE_ON_ERROR=true` keeps
the worker alive when a real engine request fails; the failed job remains pending and the public
report exposes only attempted, processed, failed, skipped, and pending counts. Retry behavior is
bounded by `IRIS_LOCAL_BRIDGE_WORKER_MAX_RETRY_ATTEMPTS`,
`IRIS_LOCAL_BRIDGE_WORKER_RETRY_BACKOFF_MS`, and
`IRIS_LOCAL_BRIDGE_WORKER_RETRY_MAX_BACKOFF_MS`. Backoff-waiting and retry-blocked jobs remain
summary-only counts in worker status; the failure ledger stores only job IDs, event IDs, attempt
counts, timing, and failure kind, never job payloads, text, candidates, commands, endpoint values,
or secrets. Invalid numeric worker settings fall back to safe defaults: 5000 ms engine timeout,
3 retry attempts, 5000 ms retry backoff, 300000 ms max retry backoff, 5 watch passes, and 50 jobs
per adapter kind.
If `IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS` is set, stale outbox jobs are expired before any real
engine request. Public reports expose only expired counts, freshness status, job age, max age, and
fixed bridge status; raw job text, artifacts, endpoints, and secrets remain hidden.

For real local engines, configure:

```text
IRIS_LOCAL_TTS_ENGINE_ENDPOINT=http://127.0.0.1:9101/tts-engine
IRIS_LOCAL_TTS_ENGINE_API_KEY=...
IRIS_LOCAL_TTS_ENGINE_VOICE_ID=...
IRIS_LOCAL_TTS_ENGINE_MODEL=...
IRIS_LOCAL_TTS_ENGINE_LOCALE=ja-JP
IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT=http://127.0.0.1:9102/live2d-engine
IRIS_LOCAL_LIVE2D_ENGINE_API_KEY=...
IRIS_LOCAL_LIVE2D_MODEL_ID=...
IRIS_LOCAL_LIVE2D_SCENE_ID=...
IRIS_LOCAL_ENGINE_TIMEOUT_MS=5000
```

For a VOICEVOX/AivisSpeech-compatible local TTS engine, IRIS includes a small bridge that converts
`iris_local_tts_engine_request_v1` into the engine's `audio_query` and `synthesis` calls, then
returns `audio_base64` plus `audio/wav` to the local engine worker:

```text
npm run dev:voicevox:bridge
IRIS_LOCAL_TTS_ENGINE_ENDPOINT=http://127.0.0.1:9110/tts-engine
IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT=http://127.0.0.1:9110/health
IRIS_VOICEVOX_ENDPOINT=http://127.0.0.1:50021
IRIS_VOICEVOX_SPEAKER_ID=3
IRIS_VOICEVOX_TIMEOUT_MS=10000
```

`npm run dev:voicevox:roundtrip` verifies this bridge against a fixture VOICEVOX-compatible
engine. The bridge forwards speech text only inside the internal engine call, maps numeric and
label-based speech rates into bounded `speedScale`, and maps laughter/scream/high-energy
expression hints into bounded intonation, pitch, volume, and phoneme-pause controls. This gives the
real TTS bridge a practical foundation for fast speech, breathless laughter recovery, and energetic
reactions without treating expression hints as commands. It also checks the compatible engine's
`/version` route from its own `/health` route so IRIS does not report the TTS engine as ready when
only the bridge process is alive. Startup, health, and roundtrip reports stay free of text payloads,
endpoint values, audio bodies, candidates, commands, and secrets.
`npm run dev:voicevox:unsafe-roundtrip` verifies the sibling boundary where an unsafe local-engine
request is rejected before any VOICEVOX-compatible engine fetch, and the error response still omits
raw text, candidates, commands, endpoint values, and secrets.
`IRIS_VOICEVOX_ENDPOINT` is treated as a local engine target. The bundled bridge reports
`local_endpoint_policy_status`, `engine_endpoint_scope`, and `engine_endpoint_locality_ok`, and it
blocks external or malformed endpoints before health, `audio_query`, or `synthesis` requests are
made.

For a Live2D cue bridge, IRIS includes a companion local engine bridge that converts
`iris_local_live2d_engine_request_v1` into `iris_live2d_renderer_cue_v1`. It can run in `cue_only`
mode for OBS/local artifact pickup, or forward the validated cue to an operator-owned renderer
relay:

```text
npm run dev:live2d:bridge
IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT=http://127.0.0.1:9112/live2d-engine
IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT=http://127.0.0.1:9112/health
IRIS_LIVE2D_RENDERER_ENDPOINT=http://127.0.0.1:9120/cue
IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT=http://127.0.0.1:9120/health
IRIS_LIVE2D_CUE_BRIDGE_TIMEOUT_MS=5000
```

`npm run dev:live2d:roundtrip` verifies health probing, renderer cue delivery, cue shape, camera
proximity guidance, motion style forwarding, autonomous scream/hum/dance cue mapping, and
summary-only reporting. Phase16 autonomous expression IDs such as `surprise_scream`,
`happy_humming`, `happy_dance`, and `happy_loud_sing` become bounded renderer motion,
expression, gaze, breathing, and camera hints only. The bridge never treats Live2D cue data as a
game command or memory write, and it does not pass renderer response bodies back into IRIS reports.
`npm run dev:live2d:unsafe-roundtrip` verifies that a renderer acknowledgement which echoes
endpoint values, candidates, commands, or secrets is rejected as a safe fixed error without carrying
that renderer body into reports.
Renderer forwarding is also held to the local endpoint policy. `IRIS_LIVE2D_RENDERER_ENDPOINT` and
`IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT` may point to loopback/private-network renderer relays; an
external or malformed renderer target makes bridge health `attention` and returns
`local_endpoint_policy_blocked` before any fetch.

Use `npm run dev:engine:probe` after setting one or both engine endpoints. The command creates a
temporary local bridge/outbox, sends one validated runtime TTS/Live2D/subtitle handoff, and lets the
worker call only the configured engine endpoints. Its report exposes engine modes, receipt IDs,
artifact availability, and boundary flags only; it does not expose raw text, jobs, endpoint values,
or secrets. If an engine returns an error, the probe reports `failed_count` and leaves the failed
job pending for bounded retry without exposing the engine response body or local job payload.
Read-only TTS/Live2D engine health probes also omit failed health response bodies and use a 5000 ms
timeout fallback when `IRIS_LOCAL_ENGINE_TIMEOUT_MS` is malformed. Health responses may declare
readiness with `ok`, `ready`, `bridge_status`, `status`, or `engine_status`; explicit unhealthy or
attention states block a production probe pass even when schemas match. Public reports expose only
readiness status, a boolean/null readiness flag, and a redacted fixed engine-status label, not target
details. Unsafe successful `engine_status` values containing endpoints, tokens, secrets, candidate
names, commit/write markers, or canonical envelope markers are replaced with
`engine_status_omitted`. If a health response declares
`supported_response_fields`, `response_fields`, or `supported_response_formats`, IRIS checks that
TTS can return either `audio_base64` plus an `audio/*` `audio_mime`, or an `audio_data_url` with an
`audio/*` base64 data URL, and that Live2D can return a `cue` object. The public probe reports only
compatibility status booleans, never response payloads or sample audio/cue data.
If a TTS health response also declares `supported_audio_mimes`, `audio_mimes`,
`supported_output_mimes`, `supported_mime_types`, or `supported_audio_formats`, IRIS checks whether
at least one OBS/local-delivery-friendly output is available: `audio/wav`, `audio/mpeg`, or
`audio/ogg`. The report exposes only compatibility status and counts, not the declared MIME list.
If a Live2D health response declares `supported_cue_schemas`, `cue_schemas`,
`supported_live2d_cue_schemas`, or `live2d_cue_schemas`, IRIS checks for
`iris_live2d_renderer_cue_v1` before production probe pass. The report exposes only cue-schema
compatibility status and counts, not the declared schema list.
The optional voice/model/locale/model-id/scene-id settings are passed only as
`engine_preferences` in the outbound local engine request. Public worker status, production probes,
and integration status expose env names or configured booleans only, so operator preference values
do not leak into reports.
Original anime voice readiness follows the same boundary. `IRIS_LICENSED_VOICE_SOURCE_STATUS` and
the four use-category status names for stream speech, prerecorded lines, voice products, and sponsor
campaigns may be supplied to the local TTS engine path, but `dev:engine:probe`, TTS health reports,
and production handoff summaries expose only configured/missing counts and the
`no_voice_license_values` boundary. Contract review labels, license text, raw voice samples,
datasets, model paths, endpoints, secrets, runtime payloads, candidates, and commands stay out of
public reports.
The Admin Integration Checklist status summary also carries anime identity surface counts across
reference profile, expression and motion, voice and speech, IP governance, and voice license use
categories. These are ready/missing counts only and do not expose character reference materials,
voice samples, animation cuts, policy payloads, endpoints, candidates, commands, or setting values.
The Admin Operations Summary anime performance module mirrors the same five-surface counts for the
low-output restart entry point, so operators can compare operations summary, dashboard, preflight,
production attention digest, and checklist views without opening private settings.
Production probe check rows for runtime handoff, TTS, Live2D, and OBS also include
`local_bridge_worker_diagnostics`. It reports only fixed modes, configured booleans, render-manifest
support, and the `adapter_readiness_public_status` capability; it does not inspect local jobs or
expose paths, payloads, endpoints, preference values, candidates, commands, or secrets.
The same diagnostics include only a boolean for whether `IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS`
is configured and the fixed `expire_before_engine_call_summary_only` policy name; they do not expose
the max-age value or scan local outbox contents.
`npm run dev:engine:failure-roundtrip` exercises the same failure boundary with a fixture TTS
engine that returns an error. `npm run dev:engine:invalid-json-roundtrip` verifies that a `200 OK`
non-JSON engine response is classified as `invalid_json` and reduced to receipt summaries without
retaining raw response text. `npm run dev:engine:invalid-audio-roundtrip` verifies that declared
TTS audio MIME and returned bytes match the local artifact contract before any artifact is written.
`npm run dev:engine:invalid-live2d-roundtrip` verifies that Live2D engine cues carry an accepted
cue schema before local artifact write. `npm run dev:engine:unsafe-roundtrip` verifies the sibling
boundary where an engine returns `200 OK` but echoes unsafe text, candidates, commands, or secrets;
IRIS rejects the response and reports only summary counts.

`npm run dev:production-loop:roundtrip` is the wider fixture check for production wiring. It runs
one scheduler tick through YouTube API ingest, POST vision capture, safe game-control approval,
TTS/Live2D/subtitle bridge handoff, engine-worker artifacts, and approved persistence, while keeping
all public reports summary-only. The report now includes a compact
`production_live_readiness_summary`, confirming foundation, YouTube, persistence, and gameplay
safe-control readiness with no remaining next gate, without leaking raw vision, action candidates,
approved actions, endpoints, or commands.
The underlying `/production/live-readiness` gate summaries include a safe `diagnostic_detail`
object, so real TTS/Live2D engine health, OBS health, and render artifact pickup can be inspected as
fixed statuses, booleans, and counts only.

The TTS engine receives `iris_local_tts_engine_request_v1` and must return `audio_base64` plus an
`audio/*` `audio_mime`, or `audio_data_url` as an `audio/*` base64 data URL. Before writing a
local artifact, the worker validates the declared MIME against lightweight content signatures:
WAV must be RIFF/WAVE, MP3 must have an ID3/header frame marker, and OGG must start with OggS.
It may also return optional `duration_ms`, `sample_rate_hz`, `visemes`, and `bridge_status`. The Live2D engine
receives `iris_local_live2d_engine_request_v1` and must return a `cue` object with an accepted
schema (`iris_live2d_renderer_cue_v1` for the bundled cue bridge, or synthetic
`iris_live2d_fixture_cue_v1` in local fixtures), optional `duration_ms`, and `bridge_status`.
Engine responses are rejected if they echo commands, candidates, approved game actions, memory
writes, relationship writes, canonical fields, or text payloads back into public surfaces. Missing,
malformed, unsupported, or MIME-mismatched audio responses are reported only as
`invalid_audio_response`; missing or unsupported Live2D cue schemas are reported only as
`invalid_live2d_response`; and failed jobs remain pending for bounded retry. Failure receipts expose
fixed `error_kind` values only, not engine response bodies.
Successful engine responses are still untrusted at the value level. Public receipts, render
artifacts, and OBS-facing Live2D cue artifacts redact unsafe string values that look like endpoints,
tokens, secrets, candidate names, commit/write markers, or canonical envelope markers; unsafe
`bridge_status`, viseme shape, and renderer cue strings fall back to fixed local placeholders before
they are written for pickup.
`/integrations/contracts` exposes the required field lists for both local engine request schemas and
the health-check declaration fields that production probes read, including summary-only TTS output
MIME compatibility. It also exposes the bundled helper bridge policy fields for
`IRIS_VOICEVOX_ENDPOINT`, `IRIS_LIVE2D_RENDERER_ENDPOINT`, and
`IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT`, so external TTS/Live2D implementers can validate request,
response, and local-target compatibility without reading live jobs from IRIS.

It returns:

```text
schema: iris_integration_status_v1
integrations
schedulers
overlay_event_stream
summary
boundary_policy
```

Each integration item reports only:

```text
integration
mode
status
configured_env
missing_env
auth_configured
boundary_policy
```

`configured_env` and `missing_env` contain environment variable names only. The endpoint must not
return API keys, OAuth tokens, endpoint URLs, raw adapter packets, comments, subtitles, game
observations, candidates, approved game actions, memory records, relationship records, commands, or
canonical Core envelopes.

The endpoint is read-only. It helps prepare real TTS, Live2D, subtitle, response-provider,
YouTube/chat, vision, media, topic, memory-search, persistence, replay, and game-control bridges
while keeping all side-effect authority behind the existing validators and adapter contracts.

`obs_bridge` appears when `IRIS_OBS_BRIDGE_ENDPOINT` is set. Its configured status reports only env
names and auth presence, never the endpoint value or API key. The bridge contract uses
`iris_obs_bridge_setup_request_v1` and `iris_obs_bridge_setup_report_v1`; those are config-only
operator setup schemas for Browser Source creation, not runtime expression or subtitle commands.
Browser Source setup can be parameterized with `IRIS_OBS_SOURCE_NAME`, `IRIS_OBS_SCENE_NAME`,
`IRIS_OBS_SOURCE_WIDTH`, `IRIS_OBS_SOURCE_HEIGHT`, `IRIS_OBS_SOURCE_FPS`,
`IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE`, and
`IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE`; integration status exposes only the matching
env names plus `scene_configured` / `source_dimensions_configured` booleans.
If `IRIS_OBS_BRIDGE_HEALTH_ENDPOINT` is configured, integration status exposes only
`health_configured: true` and the env name. The read-only OBS health probe reports readiness,
setup-schema compatibility, setup-ack compatibility, HTTP status, and fixed error kinds without
endpoint values, API keys, raw bridge bodies, text, candidates, or commands. When a health response
declares `supported_response_fields`, `response_fields`, `supported_ack_fields`, or `ack_fields`,
IRIS checks that the setup acknowledgement can return either `bridge_status` plus `configured`, or
`request_id` plus `bridge_status`.
Failed OBS health and setup responses are summarized without reading their response bodies, and
malformed `IRIS_OBS_BRIDGE_TIMEOUT_MS` values fall back to 5000 ms.
Use `npm run dev:obs:setup` to send that operator-only setup request to a configured real local OBS
setup bridge. With `IRIS_OBS_SETUP_CONTINUE_ON_ERROR=true`, failed or unsafe bridge responses become
summary-only `attention` reports; `npm run dev:obs:failure-roundtrip` verifies that no bridge
response body, subtitle text, candidate, command, endpoint value, or secret appears in the report.
`npm run dev:obs:unsafe-roundtrip` verifies the same boundary for a `200 OK` acknowledgement that
echoes unsafe fields.
Successful OBS setup acknowledgements are also value-filtered: unsafe `request_id` or
`bridge_status` strings containing endpoint, token, secret, candidate, commit/write, or canonical
markers are replaced with fixed local placeholders before they enter setup reports.

`game_control_bridge` reports side-effect enablement and approval requirements, but it does not
expose raw configured action names. For `IRIS_AVAILABLE_GAME_ACTIONS`, integration status reports
only whether it is configured, how many supported action kinds survived normalization, how many
unsupported names were ignored, and whether the safe `wait` fallback is active. This keeps unsafe
operator mistakes such as desktop commands out of public diagnostics while preserving enough
readiness signal for setup. It also reports whether action rate limiting and the fresh-observation
gate are configured, without exposing raw timing values.

The contract manifest shape is:

```text
schema: iris_integration_contracts_v1
adapter_packets
obs_overlay
obs_bridge
bridge_sources
memory_search_bridge
game_control
local_engine_worker
boundary_policy
```

Adapter contracts identify required request fields for `iris_adapter_packet_v1` and the small set
of bridge acknowledgement fields that IRIS will summarize. OBS contracts identify `/overlay`,
`/overlay/event`, `/overlay/events`, `/overlay/events/status`, `/event-render-manifests/status`,
`/event-render-manifests/latest`, the local bridge `/health` readiness route, and the allowed
display event fields.
OBS bridge contracts identify the operator-only Browser Source setup request, accepted setup
acknowledgement shapes, read-only health readiness declarations, and the safe setup report.
Source contracts identify summary-only event shapes for live chat, game observation, media watch,
and external topics.
The memory search bridge contract identifies the HTTP vector-memory request and response fields.
It requires a local/private endpoint, approved public records only, and expects the bridge to
return IDs/scores, not raw memory summaries or selected memory state.

The contract manifest is also read-only. It must not include endpoint URLs, API keys, OAuth tokens,
live comments, subtitle text, adapter packets, candidates, approved game actions, memory records,
relationship records, commands, or canonical Core envelopes.

The fixture manifest shape is:

```text
schema: iris_integration_fixtures_v1
fixture_policy
adapter_packets.tts
adapter_packets.live2d
adapter_packets.subtitle
local_engine_requests.tts
local_engine_requests.live2d
local_engine_response_examples
obs_bridge_setup_request
overlay_display_event
safe_ack_examples
boundary_policy
```

Fixture packets are valid `iris_adapter_packet_v1` examples built from synthetic text only. They are
not live viewer input, not memory, not game input, and not adapter authority. The local engine
examples match `iris_local_tts_engine_request_v1` and `iris_local_live2d_engine_request_v1`, with
synthetic audio/cue responses that show accepted return shapes without echoing runtime text. They
also include one `iris_obs_bridge_setup_request_v1` example for configuring the OBS Browser Source;
that request is operator setup only and not runtime expression authority. Fixture examples must not
include candidates, approved game actions, memory writes, relationship writes, commands, API keys,
OAuth tokens, or production payloads.
For game control, fixtures expose only the accepted ACK shape. They intentionally do not include an
`approved_game_input_action` request, because that request may only be produced by the runtime game
action validator after a fresh Phase24 candidate passes the approval boundary.

The probe report shape is:

```text
schema: iris_integration_probe_report_v1
probe_mode
fixture_event_id
probes
engine_worker
summary
boundary_policy
```

Probe reports expose only environment variable names, adapter modes, statuses, fixture event IDs,
engine-worker readiness, engine health compatibility flags, and small response summaries. They must
not include endpoint values, API keys, OAuth tokens, raw adapter packets, raw engine jobs, live
comments, subtitle text, game observations, candidates, approved game actions, memory records,
relationship records, commands, or canonical Core envelopes.

The local bridge status shape is:

```text
schema: iris_local_bridge_status_v1
bridge_status
accepted_adapter_kinds
total_received
adapters
recent
boundary_policy
```

Local bridge status must not expose raw packets, final text, subtitle text, candidates, approved
game actions, memory or relationship writes, commands, endpoint values, endpoint secrets, or
adapter authority.

When `IRIS_LOCAL_BRIDGE_OUTBOX_DIR` is set, the local bridge writes engine-facing jobs:

```text
<outbox>/tts/jobs.jsonl
<outbox>/tts/latest.json
<outbox>/live2d/jobs.jsonl
<outbox>/live2d/latest.json
<outbox>/subtitle/jobs.jsonl
<outbox>/subtitle/latest.json
```

These outbox files are internal bridge payloads for local engines and may contain the validated
TTS/subtitle text needed by those engines. The public `/status` response must expose only job IDs,
counts, timing, and adapter status.

The local bridge engine worker `status()` also exposes `outbox_queue` counts:

```text
worker_readiness_status
adapter_readiness_status.<kind>
total_job_count
total_pending_count
total_invalid_json_line_count
adapters.<kind>.job_count
adapters.<kind>.processed_count
adapters.<kind>.pending_count
adapters.<kind>.invalid_json_line_count
event_render_manifests.manifest_count
event_render_manifests.complete_manifest_count
event_render_manifests.invalid_json_line_count
```

These queue counters are for detecting a stuck TTS/Live2D/subtitle worker. They are counts only and
must not expose raw jobs, malformed JSONL line contents, text payloads, candidates, commands,
endpoint values, or secrets. Malformed lines keep `reached_idle=false` until an operator clears or
rebuilds the local outbox.
`worker_readiness_status` is a fixed enum for operator dashboards:
`not_configured`, `idle`, `work_pending`, `retry_backoff`, `operator_action_required`, `active`, or
`attention`. It is derived only from counts, retry state, artifact-dir configuration, and manifest
store status, never from job payloads.
`adapter_readiness_status.tts`, `adapter_readiness_status.live2d`, and
`adapter_readiness_status.subtitle` use the same fixed enum so an operator can distinguish "TTS is
retrying" from "Live2D already rendered" without opening local job files or exposing text,
endpoints, paths, candidates, commands, or secrets.
Event render manifest counters show whether the worker has grouped all three artifacts for an
event. The status and latest-report surfaces remain summary-only and do not expose artifact paths;
the latest report adds safe-reference booleans, artifact availability booleans, content types, byte
counts, per-adapter artifact freshness, artifact contract status, blocking-adapter summaries, and
OBS pickup readiness for operator checks.
The local manifest files under the artifact directory are the operator-side synchronization handoff.
`npm run dev:bridge:artifact-roundtrip` verifies the local artifact delivery routes while keeping
the public report free of artifact bodies and local paths.
`npm run dev:bridge:render-manifest` reads the latest local manifest and reports artifact
availability by adapter without paths. Set `IRIS_SHOW_LOCAL_PATHS=true` only for local operator
debugging when the actual artifact paths are needed.

`/integrations/status` also includes `local_bridge_engine_worker` so local setup can confirm
whether `IRIS_LOCAL_BRIDGE_OUTBOX_DIR` and `IRIS_LOCAL_BRIDGE_ARTIFACT_DIR` are configured without
showing their values. It reports TTS/Live2D worker modes as `local_*` or `http`, but never reports
actual target values or secrets.
If `IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS` is configured, the same item reports only
`render_manifest_stale_guard_configured: true` and a fixed freshness-status policy. The configured
age value and artifact paths are not exposed.
If `IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS` is configured, it similarly reports only
`render_artifact_sync_guard_configured: true` and a fixed sync-status policy without publishing the
configured target value, artifact paths, or payloads.
Production readiness treats both render guard env names as first-stage local bridge requirements;
public reports expose only booleans and fixed status labels for those guards.

Local helper script references for package-script registration checks:
`npm run dev:game-control:roundtrip`,
`npm run dev:server`,
`npm run dev:streaming:local-runtime`,
`npm run dev:bridge:roundtrip`.
