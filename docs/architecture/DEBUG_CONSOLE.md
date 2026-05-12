# Debug Console

The local debug console is available at:

```text
http://127.0.0.1:8787/debug
```

It is a development surface for:

```text
comment input
game observation input
scenario playback
idle scheduler control
live state
persona profile preview
affect meters
speech cue preview
motion cue preview
body continuity preview
turn rhythm preview
affective continuity preview
personality habit preview
expression profile preview
relationship deepening preview
memory recall preview
game perception preview
game commentary preview
game player preview
game action validation preview
game control result preview
game embodiment preview
stream lifecycle preview
human likeness evaluation preview
boundary audit preview
candidate review item preview
performance timeline preview
expression breath timeline preview
event history
admin dashboard links
admin review queue links
```

The page only calls local development endpoints:

```text
GET  /state
GET  /overlay/status
GET  /languages
GET  /candidate-reviews
GET  /readiness
GET  /idle/status
GET  /ingest/status
POST /comment
POST /candidate-reviews/clear
POST /game-observation
POST /idle-tick
POST /idle/start
POST /idle/stop
POST /ingest/tick
POST /ingest/start
POST /ingest/stop
POST /scenario/run
```

It also links to read-only admin and production inspection surfaces such as
`/admin`, `/admin/operations-summary`, `/admin/review-queue`,
`/admin/review-queue/auth-gate`, and
`/admin/review-queue/validator-run-plan`.

For long-running low-output operations, start with:

```text
npm run dev:admin:operations-summary
npm run dev:production:attention-digest
npm run dev:foundation:runtime-summary
npm run dev:foundation:status
npm run dev:foundation:blocked-worker-roundtrip
npm run dev:public-report-boundary-audit
```

The same operator flow is visible from the browser surfaces:

```text
GET /production/foundation-runtime-summary
GET /production/runtime-handoff-status
GET /production/live-readiness
GET /admin/operations-summary
GET /admin/public-report-boundary-audit
```

The Admin Dashboard also renders a `Low Output Restart` section using the same
safe script/count fields from the Admin Operations Summary and public boundary
audit. This keeps the compact restart path available in the browser without
opening verbose logs or private payloads.
The restart summary separates the `entry_check_script`
(`npm run dev:admin:operations-summary`) from the first deeper production check,
so operators can begin with the smallest whole-system summary before drilling
into focused production readiness.
The dashboard labels this entry point as `Start Here`.

The Admin Operations Summary also exposes the first non-ready module's
`next_attention_area_id` and `next_attention_area_missing_setting_count` at the
top level when available. These are safe IDs and counts only, so operators can
resume setup without opening private anime, voice, policy, or analytics values.
Its anime performance module also reports anime identity surface ready/missing
counts, matching the dashboard and preflight count-only view.

These surfaces report script names, fixed labels, counts, booleans, and route
paths only. They do not expose live text, raw worker jobs, endpoints, local
paths, candidates, commands, voice samples, animation assets, or secrets.
`npm run dev:admin:operations-summary`, `npm run dev:production:attention-digest`,
and `npm run preflight` include the public boundary audit's
required and missing lightweight script counts, while
`npm run dev:public-report-boundary-audit` is the focused counts-only boundary
check for confirming the compact restart catalog before opening the detailed
audit route.

It does not execute game input, write memory directly, start private validator
runners, or mutate Core contracts. It is a browser client for the same safe
runtime boundaries used by tests.

Scenario playback accepts a short JSON scenario with these step kinds:

```text
comment
game_observation
idle
```

The server rejects scenario payloads that include command fields such as `execute`, `commit`, `write`, `apply`, `world_command`, or `input_action_candidate`.
