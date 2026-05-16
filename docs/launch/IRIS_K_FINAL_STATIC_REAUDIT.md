# IRIS-K-FINAL Static Re-Audit and External Proof Inventory

Date: 2026-05-16 JST

Scope: static audit only. This report changes documentation only and does not modify code, specs, Phase responsibility, Adapter responsibility, memory responsibility, runtime behavior, or production readiness logic.

Checked commit: `df9d81172923c7f445a66e2e5290fa5831027f62`

Overall decision: **NO-GO**

Production ready declaration: **not made**

## Authority Baseline

Requested baseline: IRIS 2026-03-31 specification.

Static finding:

- `IRIS_SPEC_AUTHORITY.md` exists at repo root and points to `IRIS_20240425_00` through `IRIS_20240425_27` plus active 20260430 through 20260504 addenda.
- Repo-local search found no artifact named or dated `2026-03-31`.
- Because the requested 2026-03-31 authority artifact was not found, this audit cannot honestly claim full PASS against that exact baseline.
- The static code inventory below uses repo-root `IRIS_SPEC_AUTHORITY.md` and repo-local Phase00-Phase07 specs only as evidence inventory, not as a production-ready certification.

Status: **BLOCKED** for exact requested-spec conformance.

## Audited Files And Directories

- `AGENTS.md`
- `IRIS_SPEC_AUTHORITY.md`
- `docs/specs/IRIS_20240425/IRIS_20240425_00.txt`
- `docs/specs/IRIS_20240425/IRIS_20240425_01.txt`
- `docs/specs/IRIS_20240425/IRIS_20240425_02.txt`
- `docs/specs/IRIS_20240425/IRIS_20240425_03.txt`
- `docs/specs/IRIS_20240425/IRIS_20240425_04.txt`
- `docs/specs/IRIS_20240425/IRIS_20240425_05.txt`
- `docs/specs/IRIS_20240425/IRIS_20240425_06.txt`
- `docs/specs/IRIS_20240425/IRIS_20240425_07.txt`
- `src/core/contracts.js`
- `src/core/pipeline.js`
- `src/core/phases/phase01Intent.js`
- `src/core/phases/phase02Reaction.js`
- `src/core/phases/phase03Context.js`
- `src/core/phases/phase04Action.js`
- `src/core/phases/phase05Persistence.js`
- `src/core/phases/phase06Sync.js`
- `src/core/phases/phase07Task.js`
- `src/adapters/`
- `src/runtime/`
- `src/server/`
- `src/services/persistence/`
- `src/services/dev/productionProbe.js`
- `src/services/dev/productionLiveReadiness.js`
- `scripts/run-tests.js`

## PASS Items

- **Phase01 boundary**: `src/core/phases/phase01Intent.js` returns canonical intent, speaker/identity linkage, payload context, and target presence fields. Static search did not find `action_type` or `skill_id` output in Phase01. `assertNoWorldCommand(event, "Phase01 input")` blocks `world_command` input.
- **Phase02 boundary**: `src/core/phases/phase02Reaction.js` handles `reaction_id`, `variation_id`, `tone`, `emotion`, and `character_tag`. Static search did not find `action_type`, `skill_id`, or `world_command` generation in Phase02.
- **Phase03 boundary**: `src/core/phases/phase03Context.js` emits conversation helper context such as `conversation_state`, `context_tags`, and Phase03 scores. Static search did not find action decision, `skill_id`, or `world_command` generation in Phase03.
- **Phase04 action ownership**: `src/core/phases/phase04Action.js` is the Phase01-Phase07 file that decides `action_type` and derives `skill_id`. It rejects upstream `action_type` via `assertNoUpstreamActionType`.
- **Phase04 world command boundary**: `src/core/phases/phase04Action.js` validates canonical action and calls `assertNoWorldCommand`; static search did not find `world_command` generation in Phase04.
- **Core world command guard**: `src/core/contracts.js` rejects `world_command` in core payloads with `assertNoWorldCommand`.
- **Core direct memory write guard**: `src/core/contracts.js` rejects `memory_write`, `direct_memory_write`, and `commit_memory` with `assertNoDirectMemoryWrite`.
- **Phase05 candidate behavior**: `src/core/phases/phase05Persistence.js` creates `memory_candidate` and optional `relationship_candidate`; candidates require validation and are checked with `assertCandidateNotExecutable`.
- **Phase06 sync export**: `src/core/phases/phase06Sync.js` is the only Phase01-Phase07 file that emits `sync_status`.
- **Phase07 task evaluation**: `src/core/phases/phase07Task.js` emits `task_type` and value/risk/cost/reward/reputation scores. Static search did not find `world_command` or direct memory write in Phase07.
- **Adapter-side world command transform evidence**: `src/adapters/adapterPackets.js` contains adapter packet validation and the message `world_command allowed only after adapter transform`; core Phase01-Phase07 files did not generate `world_command`.
- **Mock/fixture not real proof**: `src/services/dev/productionProbe.js` carries `fixture_probe_not_production_ready` and `real_runtime_required_for_production_ready`, and computes `go_no_go_status` from `production_ready_allowed`.
- **Secret scan**: static secret-pattern scan found no private key block, real database URL, GitHub token, OpenAI-style key, Slack token, or Google API-key-shaped value in the audited source/docs subset. Env variable names and fake test placeholders remain documentation/test fixtures, not real secrets.

## BLOCKED Items

- **Requested authority mismatch**: The requested IRIS 2026-03-31 specification artifact was not found in the repo. Exact requested-baseline conformance remains **BLOCKED**.
- **External real proof**: YouTube, Minecraft/game control, VRChat, Discord, Live2D, OBS, TTS, screen capture, and media/external-topic adapters cannot be considered real-ready from static code, fixture, mock, or local bridge evidence.
- **Real deployment state**: No fresh external production logs, operator approvals, or safe real-ingest summaries were provided in this audit turn.

## No-Go Items

- **production_ready_allowed**: **NO-GO**. This audit does not grant production readiness. Static code contains readiness gates, but current real external proof is absent.
- **go_no_go**: **NO-GO**. With external real proof missing and exact 2026-03-31 authority missing, the safe decision remains no-go.
- **EventBus responsibility ambiguity**: `src/server/overlayDisplayEvent.js` defines `createOverlayEventBus()` with `publish`, `subscribe`, `latest`, `status`, and `clientCount`. If this object is the canonical EventBus governed by the rule "EventBus is publish/subscribe only", then `latest/status/clientCount` are a boundary violation. If it is only an overlay server transport helper, it still needs human/spec confirmation before PASS.
- **Exact real adapter proof**: No static fixture/local bridge/mock result may satisfy real YouTube, Minecraft, VRChat, Discord, Live2D, OBS, TTS, or screen-capture readiness.

## UNKNOWN Items

- Whether the repo-root `IRIS_SPEC_AUTHORITY.md` supersedes the user-requested IRIS 2026-03-31 baseline. This must be resolved by a human authority decision, not inferred.
- Whether `createOverlayEventBus()` is intended to be the spec-governed EventBus or an overlay-specific server stream helper.
- Whether VRChat and Discord are required launch adapters. Static search did not find dedicated real adapter proof for them.
- Whether current local bridge evidence maps to the required external proof inventory. Static audit treats it as not real proof.

## External Proof Waiting

- **YouTube**: real account/auth proof, real target live chat resolution, safe polling/cursor proof, and no-secret ingest summary.
- **Minecraft/game control**: approved safe adapter proof, manual approval proof, emergency stop proof, and owner/operator confirmation.
- **VRChat**: dedicated real adapter proof if in launch scope.
- **Discord**: dedicated real adapter proof if in launch scope.
- **Live2D**: real renderer pickup, safe cue acceptance, artifact freshness, and no raw renderer payload leakage proof.
- **OBS**: production browser source pickup, overlay heartbeat, artifact freshness, and no raw OBS event leakage proof.
- **TTS**: real engine/voice source proof, licensing/voice-source confirmation, safe audio artifact summary, and no raw audio leakage proof.
- **Screen capture / vision**: real capture source proof, operator-reviewed summary, and no raw frame/OCR leakage proof.
- **Memory/vector/persistence**: production-safe persistence proof without raw memory, raw vector, DB URL, SQL, or private viewer data.

## Mock / Fixture / Local Bridge Handling

- `mock` adapters, `fixture` runs, scenario tests, and local bridge roundtrips are useful regression evidence only.
- They must not be promoted to real external proof.
- They must not flip `production_ready_allowed` to true.
- They must not produce `go_no_go=go`.
- Any report using these artifacts must label them as rehearsal, dry run, local bridge, or fixture evidence.

## production_ready_allowed Decision

Status: **NO-GO**

Reason:

- Exact requested IRIS 2026-03-31 authority is missing.
- External real proof is missing.
- Operator go/no-go proof is missing.
- EventBus role ambiguity remains unresolved.
- Static audit cannot certify real transport, renderer, engine, or platform behavior.

## go_no_go Decision

Status: **NO-GO**

Reason:

- `production_ready_allowed` is not allowed by this audit.
- No external proof logs were supplied.
- Mock, fixture, and local bridge evidence remain non-production evidence.

## Next Human Checks

- Provide or confirm the authoritative IRIS 2026-03-31 specification artifact, or formally state that repo-root `IRIS_SPEC_AUTHORITY.md` is the current authority instead.
- Decide whether `createOverlayEventBus()` is the canonical EventBus or an overlay-local transport helper.
- Confirm which external adapters are in launch scope: YouTube, Minecraft, VRChat, Discord, Live2D, OBS, TTS, screen capture, and media/external topic.
- Confirm that no private production secrets are present outside repo-controlled files, including local `.env`, ignored files, and deployment stores.
- Confirm owner/operator production go/no-go flow with safe, non-secret logs.

## Next External Proof Logs Required

Collect only safe summaries. Do not include secret values, raw payloads, raw commands, raw memory, raw vectors, raw OBS events, raw frames, OCR text, raw chat payloads, endpoint URLs with tokens, or API keys.

- Production probe safe summary showing `production_ready_allowed=false` until all proof is complete.
- YouTube real ingest safe summary.
- OBS overlay pickup and artifact freshness safe summary.
- Live2D renderer safe cue proof.
- TTS real engine safe proof.
- Screen capture / vision safe proof.
- Minecraft/game control approved adapter and emergency stop proof.
- VRChat real adapter proof if in scope.
- Discord real adapter proof if in scope.
- Memory/persistence safe proof without raw memory or DB connection data.
- Owner/operator final go/no-go decision log.

## Static Commands Run

- `Test-Path C:\Users\HIRO-001\Documents\IRIS_SPEC_AUTHORITY.md`
- `Get-ChildItem -Path C:\Users\HIRO-001\Documents -Recurse -Filter IRIS_SPEC_AUTHORITY.md`
- `git status --short --branch`
- `git rev-parse HEAD`
- `rg -n "2026-03-31|20260331|2026_03_31" . -g "!data/**" -g "!*.tmp*" -g "!node_modules/**"`
- `rg -n "\b(action_type|skill_id|world_command)\b" src/core/phases/phase01Intent.js src/core/phases/phase02Reaction.js src/core/phases/phase03Context.js src/core/phases/phase04Action.js src/core/phases/phase05Persistence.js src/core/phases/phase06Sync.js src/core/phases/phase07Task.js src/core/contracts.js src/core/pipeline.js`
- `rg -n "world_command\s*:|world_command\s*=|create.*world_command|transform.*world_command|world_command allowed only|adapter transform" src/core src/adapters src/runtime src/server`
- `rg -n "\.addMemory|\.writeMemory|writeMemory|saveMemory|commitValidatedCandidateRecords|validateRuntimeCandidatesForPersistence|approveMemoryCandidate|approveRelationshipCandidate|createPhase05CoreExport|phase06Sync\(" src/core src/runtime src/services/persistence src/services/dev`
- `rg -n "class .*EventBus|function .*EventBus|create.*EventBus|publish\(|subscribe\(" src scripts`
- `rg -n "production_ready_allowed|go_no_go_status|fixture_probe_not_production_ready|real_runtime_required_for_production_ready" src/services/dev/productionProbe.js src/services/dev/productionLiveReadiness.js scripts/run-tests.js`
- Secret-pattern scan over `src`, `scripts`, `docs`, `.env.example`, and `package.json`, excluding `scripts/run-tests.js`, `data/**`, and temporary files. The exact regex is intentionally omitted from this report to avoid storing secret-like patterns as report content.

## Code Change Statement

Code changes: none.

Docs changes: this report only.

This audit does not modify specs, Phase00-Phase07 responsibility boundaries, Core/Adapter boundaries, EventBus implementation, memory implementation, production readiness logic, or external adapter behavior.
