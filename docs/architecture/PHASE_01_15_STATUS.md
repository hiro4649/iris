# Phase01-15 Implementation Status

This document tracks the current code against the IRIS_20240425 specs.

## Implemented

- Phase01: canonical intent extraction from normalized comments.
- Phase02: canonical reaction selection.
- Phase03: conversation context state.
- Phase04: canonical action ownership.
- Phase05: persistence evaluation with validation-gated memory candidate.
- Phase06: state sync scores.
- Phase07: canonical task/value review.
- Phase08: phase-local goal selection.
- Phase09: constraint and status normalization.
- Phase10: phase-local strategy selection.
- Phase11: read-only economy/dependency guard.
- Phase12: staged self-improvement candidate.
- Phase13: canon/continuity scoring.
- Phase14: expression naturalization without action mutation.
- Phase15: final guard and continuity envelope.
- Performance cue: Phase14/15 can carry adapter-validated voice/Live2D hints such as `big_laugh`.
- Response generation: mock generator connected before Phase14.
- Response provider: generic HTTP provider available, with world/action/commit firewall.
- Persistence writer: local JSON writer accepts only `approved_memory_record`.
- Relationship writer: local JSON writer accepts only `approved_relationship_record`.
- Relationship memory: approved per-viewer deltas can increase or decrease affinity while public profiles expose only qualitative levels.
- Affect state: in-memory mood/performance snapshot modulates cues without owning canonical enum.
- Persona profile: static IRIS individuality guide for response providers, with canonical-field rejection.
- Speech cue: runtime converts safe final text into TTS prosody and mouth timing hints.
- Motion cue: runtime converts safe final envelopes into Live2D movement hints.
- Performance plan: runtime synchronizes speech and motion cues on one validated timeline.
- Body continuity: Phase16 MVP internal body profiles for breathing, gaze, posture, expression, and recovery.
- Turn rhythm: Phase17 MVP internal timing profiles for pauses, backchannels, repairs, and laugh recovery.
- Affective continuity: Phase18 MVP internal mood, laughter, and recovery carryover plan.
- Personality habit: Phase19 MVP internal habit selection with cooldown and boundary validation.
- Expression profile: adapter-readable voice, breath, laughter recovery, and Live2D expression profile with boundary validation.
- Relationship deepening: Phase20 MVP validation-gated relationship update candidate with public state sanitization.
- Memory recall: Phase21 MVP read-only memory reference selection with privacy filtering and cooldown.
- Game perception: Phase22 MVP read-only danger, opportunity, funny-event, and commentary trigger detection.
- Game commentary: Phase23 MVP internal commentary modes and validation-gated laughter candidate planning.
- Game player: Phase24 MVP validation-gated input action candidate planning without adapter handoff.
- Game action validator: Phase24 boundary that converts safe candidates into `approved_game_input_action` only when explicitly enabled.
- Game embodiment: Phase25 MVP game-aware voice, breath, posture, gaze, motion-visibility, and recovery planning.
- Stream lifecycle: Phase26 MVP stream/session state, next-stream seeds, and validation-gated carryover candidates.
- Human-likeness evaluation: Phase27 MVP integrated scoring with CI-style checks for expression quality and candidate/adapter boundary bypasses.
- Boundary audit: Phase27 enforcement summary for raw candidate leaks, approved schema use, memory commit boundaries, and internal-profile isolation.
- Candidate review queue: local safe summaries for validation-gated candidates without approval, commit, or execution authority.
- Privacy guards: shared conservative sensitivity/redaction helpers for memory recall, lifecycle seeds, and candidate summaries.
- Candidate persistence failure boundary: JSON store parse/schema/write failures return summary-only error kinds, health, and counts, without store paths, raw error messages, approved records, or raw candidates.
- Persistence sidecar recovery: approved memory and relationship JSON writers refresh `.bak` copies and can recover from corrupted primary files while public status remains counts-only.
- Readiness report: local capability/safety/spec gate summary for handoff and regression inspection.
- Spec manifest: verifies IRIS_20240425 phase files 00-27 are present.
- Adapter packets: runtime wraps TTS/Live2D handoff payloads behind packet validation.
- Runtime loop: queued comments can pass through Phase01-15 and mock adapters.
- Local HTTP server: accepts development comments and exposes `/state` plus `/overlay`.
- Local bridge status roundtrip: TTS/Live2D/subtitle bridge and worker status can be checked without raw packets, raw jobs, text payloads, endpoint values, candidates, commands, or secrets.
- Game-control unsafe-success boundary: HTTP game-control bridges that echo candidates, authorization fields, endpoint values, or secrets are reduced to failed `unsafe_response` summaries.
- Debug console: local browser console can send test events and inspect cues.
- Replay log: optional JSONL recorder captures safe runtime summaries for review.
- Game observation: read-only game events can produce commentary as `CREATE_CONTENT`.
- Vision metadata: game observations can carry frame IDs, frame age, capture region, OCR summaries, and UI focus areas without passing raw screenshots or pixels into Core.
- Idle presence: silent tick can produce `idle_breath` motion without speech.
- Idle scheduler: optional development scheduler can trigger safe idle ticks.
- Scenario runner: comments, game observations, and idle ticks can be replayed for local regression checks.
- Scenario suite: all local scenario JSON files can be replayed as safety summaries.
- Capability endpoint: runtime can report implemented local capabilities without changing Core state.
- Relationship endpoint: local development server can expose current relationship profiles for inspection.
- Persistence status endpoint: local development server exposes counts-only persistence health for memory, relationship, replay, and candidate review surfaces.
- OBS render handoff guard: latest TTS/Live2D/subtitle artifact delivery rejects stale or clock-skewed grouped artifacts with summary-only `stale_artifact` responses.
- OBS artifact contract guard: latest TTS/Live2D/subtitle artifact delivery rejects malformed grouped artifacts with summary-only `invalid_artifact` responses.
- Local TTS engine guard: HTTP TTS responses must match the declared audio MIME before artifact write; mismatches stay pending as summary-only `invalid_audio_response` failures.
- Local Live2D engine guard: HTTP Live2D cues must carry an accepted cue schema before artifact write; mismatches stay pending as summary-only `invalid_live2d_response` failures.
- Local engine health guard: Live2D health probes can verify accepted renderer cue schema compatibility while exposing only statuses and counts.

## Not Implemented Yet

- Production long-term memory persistence beyond the local approved JSON MVP.
- Direct production vector memory backend. A local lexical approved-memory search index and HTTP vector-memory bridge adapter exist for development.
- Production relationship memory beyond the local JSON MVP.
- Real LLM response generation.
  The provider interface exists, but no production vendor is configured.
- Production YouTube OAuth refresh, moderation actions, and deployment hardening.
  Generic HTTP live-chat relay ingestion and direct YouTube Data API-style read-only polling now exist for local development.
- Real screen capture / vision model execution.
  The read-only game observation path accepts bounded vision metadata, but a production capture/model runner is still external.
- Real game input execution.
- Real TTS engine.
- Real Live2D bridge.
- Production OBS overlay integration beyond the local browser-source prototype.
- Full production runtime systems beyond the current Phase16-27 MVP exports.
- Production-grade long-term affective history beyond the current runtime carryover plan.

## Verification

Run:

```bash
node scripts/run-tests.js
node src/main.js
```

Current checks:

- Phase01-15 path completes.
- Core rejects `world_command` before Adapter.
- Candidate objects cannot expose execute/commit/write/apply.
- Phase05 memory candidate remains validation-gated by default.
- Persistence writes only after `approved_memory_record` conversion.
- Relationship updates write only after `approved_relationship_record` conversion.
- Persistence commit failures do not crash the runtime loop and public summaries expose only failed counts plus safe error kinds.
- Persistence status remains counts-only after approved memory and relationship writes and does not expose store paths.
- Boundary-needed viewer interactions can lower approved affinity without exposing hidden scores publicly.
- Returning viewers can be summarized back into response generation.
- Big laugh expression preserves canonical `action_type`, `tone`, and `emotion`.
- Affect snapshots are rejected if they contain canonical or command fields.
- Persona profiles are rejected if they contain canonical or command fields.
- Speech cues are rejected if they contain canonical or command fields.
- Motion cues are rejected if they contain canonical or command fields.
- Performance plans are rejected if they contain canonical or command fields at any depth.
- Body continuity exports are rejected if they contain canonical or command fields at any depth.
- Turn rhythm exports are rejected if they contain canonical or command fields at any depth.
- Affective continuity exports are rejected if they contain canonical or command fields at any depth.
- Personality habit exports are rejected if they contain canonical or command fields at any depth.
- Expression profiles are rejected if they contain candidate, command, commit, or canonical fields at any depth.
- Big laughter expression profiles reach TTS and Live2D adapter packets as read-only style/recovery data.
- Relationship deepening exports reject canonical, command, and direct commit fields.
- Relationship deepening candidates stay validation-gated and do not write to the relationship store directly.
- Stream state hides raw relationship candidates and proposed relation score deltas.
- Memory recall exports reject canonical, command, and direct commit fields.
- Memory recall selected IDs stay read-only and do not write to the memory store.
- Stream state hides raw selected memory IDs.
- Game perception exports reject canonical, command, and game input candidate fields.
- HTTP game-observation source scaffolding ingests only read-only screen/vision summaries and bounded frame metadata from loopback/private-network endpoints, and rejects command/candidate bridge payloads as well as raw image/pixel/OCR transcript fields.
- Vision unsafe-success roundtrip verifies that a `200 OK` observation bridge response is still rejected when it echoes candidates, commands, raw frames, endpoint values, or secrets.
- YouTube live-chat sources normalize comments and Super Chat-style support events while rejecting command/candidate/commit bridge payloads; relay and direct API public status reports remain counts-only, and direct API cursor persistence hides page tokens plus local cursor/backup paths while supporting sidecar recovery.
- Local TTS/Live2D health probes treat explicit unhealthy readiness declarations as attention while keeping endpoints, secrets, raw payloads, and declared schema lists out of reports.
- OBS setup bridge health probes apply the same readiness guard before production probes treat setup automation as ready.
- Game commentary exports reject canonical, command, and executable laughter candidate fields.
- Game commentary keeps playful reactions out of high-danger focus situations.
- Game player raw input action candidates stay validation-gated and are not passed to adapter packets.
- Stream state and replay hide raw Phase24 input action candidates and approved game actions.
- The mock game-control adapter accepts only approved game actions and remains simulated.
- The HTTP game-control adapter posts only approved game actions and rejects unsafe response echoes, including endpoint and authorization fields.
- Generic HTTP TTS/Live2D adapters reject unsafe response echoes with candidates, commits, commands, approved game actions, canonical Core fields, endpoint values, authorization fields, or secrets, while preserving bounded operational summaries such as artifact URL, duration, sample rate, and viseme count.
- Bundled VOICEVOX helper bridge rejects unsafe request fields before engine fetch; bundled Live2D cue bridge rejects unsafe renderer acknowledgements without returning renderer bodies.
- Local bridge status rejects endpoint, URL, raw packet, text, candidate, command, and secret fields.
- Game embodiment exports reject canonical, command, and game input fields while preserving screen visibility.
- Stream lifecycle exports reject canonical, command, and direct commit fields.
- Stream state and replay hide raw Phase26 memory/community candidates.
- Human-likeness evaluation rejects command/canonical fields and flags candidate leakage into adapter packets.
- Human-likeness evaluation scores expression profile quality as part of local regression checks.
- Boundary audit reports pass/fail without exposing raw candidates, approved game actions, or approved memory records.
- Candidate review items reject raw candidate field names, command fields, commit fields, and canonical Core fields.
- Privacy guards classify and redact sensitive/private summaries before recall or review surfaces.
- Readiness reports reject raw candidate, command, commit, and canonical Core fields.
- Spec manifest confirms all 28 IRIS_20240425 phase files are present.
- Adapter packets reject command fields before console or HTTP handoff.
- Response provider output is rejected if it carries world/action/commit fields.
- HTTP response provider payloads are inspected before text extraction and reject nested side-effect fields.
- Runtime drains queued comments through mock TTS/Live2D adapters.
- HTTP server accepts comments and updates overlay state.
- Overlay status endpoint reports safe health/class hints without raw text or candidate surfaces.
- Debug console renders local controls and state/cue inspection.
- Replay entries reject command fields and are exposed through local `/replay`.
- Game observations are rejected if they contain direct command fields.
- Input action candidates stay validation-gated and non-executable.
- Idle ticks reject command fields and produce no game input.
- Idle scheduler ticks go through the same Phase01-15 path as manual idle events.
- Scenario runner rejects command fields before replay.
- Scenario suite verifies every local scenario step keeps safe review summaries.
- HTTP scenario playback updates stream state without exposing raw command authority.
