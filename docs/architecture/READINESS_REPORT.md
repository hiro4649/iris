# Readiness Report

Readiness report is a local development summary for checking whether the MVP is ready for safe local iteration.

It is available through:

```text
GET /readiness
node scripts/run-preflight.js
npm run preflight
```

The report shape is:

```text
schema: iris_readiness_report_v1
readiness_status
core_status
capability_gates
safety_gates
spec_gates
integration_gaps
integration_gap_statuses
next_recommended_steps
```

## Gates

Capability gates confirm that the current local runtime exposes Phase16-27 MVP systems, camera proximity, autonomous expression, donation reaction, media-watch reaction, external-topic reaction, adapter packets, subtitle adapter packets, integration status, contract, fixture reporting, integration probes, local bridge engine worker, local engine health probe, VOICEVOX TTS bridge, Live2D cue bridge, OBS setup/handoff scaffolding, HTTP adapter response guards, HTTP live-chat source scaffolding, direct YouTube Data API-style live-chat source scaffolding, OAuth refresh support, HTTP media-watch source scaffolding, HTTP external-topic source scaffolding, HTTP ingest scheduling, event-priority scheduling, overlay status monitoring, overlay display events, overlay event streaming, expression profiles, speech-rate profiles, language profiles, subtitle cues, tongue-twister guidance, relationship public filters, memory recall, approved-memory prompt summaries, memory public filters, local memory search indexing, HTTP vector-memory search foundation, candidate review queue, candidate validator, boundary audit, game relationship coordination, game action validator, mock game-control adapter, HTTP game-control status contract, persona profile and preset metadata, game observation, HTTP game-observation source scaffolding, and idle presence.

Safety gates summarize the latest human-likeness score, whether review is required, boundary audit status, and candidate review item counts.

Spec gates confirm that `IRIS_20240425_00.txt` through `IRIS_20240425_27.txt` are present when preflight runs.

`npm run preflight` also prints a compact production-readiness summary from the production
runbook. This does not change the local `ready_for_local_dev` gate: it simply shows the next
production stage and missing environment variable names for real TTS/Live2D/OBS, YouTube ingest,
persistence, vision, and game control. It also includes the runbook verification plan with the
next priority stage and script-name-only verification commands, without endpoint values, secrets,
payloads, or shell fragments.
For the TTS/Live2D/OBS foundation, preflight includes the operator launch plan as safe local npm
script names plus env names only, so startup order can be reviewed without exposing bridge targets
or starting side-effect processes. It also summarizes ready/attention launch-step counts and the
first step blocked by missing required env names, so setup errors can be found before any bridge is
started.
`npm run dev:foundation:preflight` exposes the same startup gate as a compact report for operators
who only need the current pass/fail state and first blocked local process.

Preflight also carries compact admin attention hints for the anime-linked
performance settings and growth/business operations. `next_attention_area_id`
names the first missing setup area, for example `anime_reference_profile` or
`fan_community`, and `next_attention_area_missing_setting_count` gives only the
number of missing settings in that area. Setting values, policy payloads, voice
materials, animation assets, endpoints, secrets, candidates, and commands remain
hidden. The same safe area IDs and counts flow through the admin dashboard,
production next-task, production probe, and production attention digest so
long-running operators can resume from the same first missing area without
reading full private settings.

The anime-linked summaries also expose only ready/total identity surface counts.
These counts group the reference profile, expression and motion, voice and
speech, IP governance, and voice license use categories so operators can see
whether the anime character identity is configured across management surfaces.
The Admin Integration Checklist status summary mirrors these same five
surfaces as count-only fields, so checklist reviews, dashboard cards,
Production Attention Digest, and preflight can be compared without opening
private settings.
They do not expose character reference materials, voice samples, animation cuts,
policy payloads, script text, endpoints, candidates, commands, or setting
values.

## Boundary

Readiness report is inspection only. It must not expose raw candidates, approved records, commands, canonical Core fields, or side-effect authority.

The production summary printed by preflight is also inspection only and uses environment variable
names only. It must not expose endpoint values, secrets, live payloads, raw packets, candidates,
commands, memory records, relationship records, or approved game actions.

It intentionally lists integration gaps such as real TTS, real Live2D, OBS, vector memory,
screen/vision ingestion, production YouTube moderation/hardening, production media/topic
ingestion, and approved game control adapters. `integration_gap_statuses` then separates code
boundary availability from operator setup: `boundary_available` means the local safe boundary is
present, while `operator_configuration_required: true` means production endpoints, keys, scenes,
engines, or bridge processes still have to be configured and verified before live use.
