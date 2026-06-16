# IRIS External Module Safe Summary Validator Design

## Status

Status: proposal
Scope: specification only
Validator implementation: not started for this design
VOXWEAVE implementation: not started in this repo
LIVE2D implementation: not started in this repo
CRIPTO-TIP implementation: not started in this repo
Runtime implementation: not started
Dataset audit runner implementation: not started
Production readiness: not claimed
Legal compliance: not claimed
YouTube policy compliance: not claimed
Minecraft/Mojang/Microsoft compliance: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define a future local validator split for IRIS external module safe summaries.
The validator family should check safe-summary envelopes and synthetic fixtures
for VOXWEAVE, LIVE2D, CRIPTO-TIP, External Character Boundary, realtime
latency, turn-taking, identity continuity, and brand oversight without
implementing external modules or runtime connections.

## Relation to K1021-K1030

K1021-K1030 cover external module safe summaries, identity continuity,
realtime perception, turn-taking, echo safety, audience-specific recap,
text-state adapter priority, brand character oversight, AI character
disclosure, and external license/status boundaries. Future validators should
map each K item to local synthetic evidence only.

## Validator Split Principle

Each validator owns one external-module evidence lane. A validator may check
row shape, safe field names, forbidden raw fields, expected result state,
blocking semantics, K coverage, and safe reason codes. It must not combine
voice, avatar, payment, gameplay, owner approval, runtime readiness, or
production operation into one authority.

Passing any validator means only that the local synthetic evidence lane is
internally consistent. It is not runtime readiness, production readiness, legal
compliance, YouTube compliance, Minecraft compliance, owner approval, GitHub
approval review, or production go.

## Input Boundaries

Allowed inputs:

- External Character Boundary synthetic JSONL fixtures.
- External module safe-summary specification documents.
- Future synthetic VOXWEAVE safe-summary fixtures.
- Future synthetic LIVE2D safe-summary fixtures.
- Future synthetic CRIPTO-TIP safe-summary fixtures.
- Future synthetic latency, turn-taking, identity, and brand oversight rows.
- Safe reports from local validators.

Forbidden inputs:

- raw audio
- raw phoneme debug
- raw Live2D model paths
- raw motion files
- renderer payloads
- raw payment records
- wallet/RPC values
- payment provider payloads
- private viewer IDs
- raw chat
- raw screen or OCR
- endpoint values
- tokens
- secrets
- real actor, viewer, payer, or server data

## Output Boundaries

Validator output must be a safe summary only. It may include validator name,
counts, pass/fail status, missing coverage labels, safe reason codes, and one
safe next action. It must not print raw fixture bodies, raw summaries, raw
payloads, private identifiers, endpoint values, secret-like values, raw logs,
or raw diffs.

Every success output must preserve:

- `priority1Status: BLOCKED`
- `runtimeImplemented: false`
- `VOXWEAVEImplementation: false`
- `LIVE2DImplementation: false`
- `CRIPTOTIPImplementation: false`
- `datasetAuditRunnerImplemented: false`
- `productionReadinessClaimed: false`
- `productionGoPerformed: false`

## Forbidden Raw Fields

Future validators must reject or block any field, label, or safe summary that
contains raw audio, raw phoneme debug, raw model path, raw motion path, renderer
payload, raw payment record, wallet/RPC value, transaction payload, private
viewer ID, payer private ID, raw screen, raw chat, raw OCR, endpoint, token,
secret, password, connection string, relationship score, payment rank,
production readiness claim, official affiliation claim, owner authority created
by AI, or executable candidate.

## Per-Module Validator Contracts

### VOXWEAVE Safe Summary Validator

Checks voice safe summaries only. It may validate voice identity version,
latency bucket, interruption status, echo risk status, license status as a safe
label, operator attention flag, and trace ID. It must reject raw audio, raw
phoneme debug, voice model paths, dataset paths, endpoint values, tokens,
license document bodies, and private speaker data.

### LIVE2D Safe Summary Validator

Checks avatar safe summaries only. It may validate visual identity version,
expression status, motion visibility status, recovery requirement,
identity-drift status, asset-license status as a safe label, operator attention
flag, and trace ID. It must reject raw model paths, raw motion files, renderer
payloads, internal asset source values, endpoint values, tokens, and private
reference images.

### CRIPTO-TIP Safe Summary Validator

Checks payment and support safe summaries only. It may validate amount buckets,
supporter safe keys, gratitude candidate allowance, monetization risk labels,
relationship delta disallowed status, operator attention flag, and trace ID. It
must reject raw payment records, wallet/provider secrets, payer private IDs,
transaction payloads, payment-derived rank, relationship score, endpoint
values, and tokens.

### External Character Boundary Validator

Checks K1021-K1030 synthetic fixtures. It remains separate from VOXWEAVE,
LIVE2D, and CRIPTO-TIP implementation. It validates safe fixture rows,
forbidden labels, fail-closed red-line rows, priority1 preservation, and no
readiness claims.

### Latency, Turn-Taking, Identity, and Brand Validators

These future validators check safe buckets and review labels only. They must
not read raw perception streams, raw voice streams, raw avatar assets, raw
screen captures, private production notes, or brand/legal source documents.

## Failure Semantics

Failures are safe summaries. A failure may report the validator id, fixture id
or row id, safe reason code, coverage class, and whether owner or operator
attention is required. Failures must not include raw payload text, raw values,
paths, endpoints, secrets, raw logs, or raw diffs.

All forbidden raw field detections fail closed. Missing K coverage fails.
Missing expected safe reason codes fail. Priority1 not BLOCKED fails. Any
runtime, production readiness, production go, or owner-authority fabrication
claim fails.

## Evidence Lane Boundary

External module validator PASS is local synthetic evidence only. It cannot
become remote evidence, runtime evidence, owner intent, production readiness,
legal compliance, YouTube compliance, Minecraft compliance, or merge approval.
PR body remains humanSummaryLane only. Same-head remote quality-gate remains
the remoteCurrentHeadLane for merge consideration.

## Runtime Boundary

Validators must not connect to VOXWEAVE, LIVE2D, CRIPTO-TIP, Minecraft,
YouTube, Discord, OBS, DB, wallets, RPC endpoints, payment providers, or any
external service. Validators must not execute game actions, create adapter
payloads, start schedulers, run bridge workers, ingest live data, or process
real datasets.

## Owner Authority Boundary

Validators cannot create owner approval, operator approval, GitHub approval
review, merge approval, legal compliance approval, YouTube policy approval,
Minecraft/Mojang/Microsoft approval, runtime readiness, production readiness,
or production go. Owner decisions remain separate explicit owner-scoped
evidence.

## Validation Plan

For this docs-only design shard:

- `git diff --check`
- `node scripts/lint-iris-docs.mjs`
- `node scripts/lint-iris-docs.mjs --iris-spec-only`
- `node scripts/codex-secret-safety-scan.mjs`
- `node scripts/codex-v125-self-test.mjs`

For future validator code shards, also run the changed validator, its
self-test, the External Character Boundary validator, the nonruntime validator
suite, and the local quality gate.

## Non Goals

- No VOXWEAVE implementation.
- No LIVE2D implementation.
- No CRIPTO-TIP implementation.
- No runtime implementation.
- No dataset audit runner implementation.
- No real dataset processing.
- No Minecraft runtime or plugin.
- No package or lockfile change.
- No workflow change.
- No network access.
- No legal, YouTube, Minecraft, Mojang, or Microsoft compliance claim.
- No production readiness claim.
- No production go.
- No priority1 resolution.

## Acceptance Criteria

- Future validator split is defined for VOXWEAVE, LIVE2D, CRIPTO-TIP,
  External Character Boundary, latency, turn-taking, identity continuity, and
  brand oversight.
- Input and output boundaries are safe-summary only.
- Forbidden raw fields are explicit.
- Per-module validator contracts reject raw payloads and implementation claims.
- Evidence lane, runtime, and owner authority boundaries are preserved.
- priority1 remains BLOCKED.
- No external module implementation is started.

## Future Work

- Add VOXWEAVE safe-summary synthetic fixtures after owner-scoped approval.
- Add LIVE2D safe-summary synthetic fixtures after owner-scoped approval.
- Add CRIPTO-TIP safe-summary synthetic fixtures after owner-scoped approval.
- Add a local external-module safe-summary validator after fixture schemas are
  stable.
- Add the validator to the nonruntime suite only after it exists and passes its
  self-test.
