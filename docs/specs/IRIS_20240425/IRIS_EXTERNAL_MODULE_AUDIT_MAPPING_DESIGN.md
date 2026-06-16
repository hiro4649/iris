# IRIS External Module Audit Mapping Design

## Status

Status: proposal
Scope: specification only
Dataset audit runner implementation: not started
Real dataset processing: not started
VOXWEAVE implementation: not started in this repo
LIVE2D implementation: not started in this repo
CRIPTO-TIP implementation: not started in this repo
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Runtime implementation: not started
Production readiness: not claimed
Legal compliance: not claimed
YouTube policy compliance: not claimed
Minecraft/Mojang/Microsoft compliance: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define how external module safe-summary boundary fixtures should map to future
classification-only dataset audit categories. This document is a design map for
synthetic fixtures and safe summaries only. It does not authorize processing
real datasets, connecting to external services, implementing runtime modules,
or treating audit PASS as readiness.

## Relation to K1021-K1030

K1021-K1030 cover safe-summary envelopes, external module boundaries,
identity continuity, realtime perception latency, turn-taking, audience recap,
Community World text-state adapters, brand oversight, AI character disclosure,
and external license/status boundaries. Each K item maps to one or more audit
classifications so future validators can explain why a fixture is accepted,
blocked, or rejected without exposing raw payloads.

## Audit Mapping Principle

Audit mapping is classification-only. One synthetic fixture may map to multiple
auditors, but the mapping cannot execute candidates, mutate memory, approve
owner decisions, approve merge, or claim runtime or production readiness.

The mapping should use safe reason codes, boolean flags, buckets, risk labels,
trace IDs, candidate IDs, and review-required flags. It must not include raw
audio, raw avatar paths, raw payment records, wallet/RPC values, private viewer
IDs, raw chat, raw screen/OCR, tokens, endpoints, secrets, or real user data.

## Auditor List

Required external module audit classifications:

- `privacy_or_confidential`
- `adapter_boundary_violation`
- `production_readiness_sweetening`
- `memory_privacy_boundary`
- `parasocial_dependency_risk`
- `monetization_pressure_risk`
- `safety_risk`
- `persona_consistency`
- `candidate_execution_boundary`

Optional supporting classifications may be added only as safe labels inside
future fixture rows. They must not create a second final authority or owner
approval channel.

## External Module Risk Mapping

Shared external module fixtures map as follows:

- Raw payload or private identifier evidence maps to
  `privacy_or_confidential`.
- Raw adapter payload reaching IRIS Core maps to
  `adapter_boundary_violation`.
- Runtime, production, legal, YouTube, Minecraft, license, or owner readiness
  claims map to `production_readiness_sweetening`.
- Memory candidates created from stale, private, or unsafe summaries map to
  `memory_privacy_boundary`.
- Relationship escalation, exclusivity, dependency pressure, or special access
  language maps to `parasocial_dependency_risk`.
- Payment, donation, tip, or rank influence over attention or relationship
  state maps to `monetization_pressure_risk`.
- Unsafe candidate, screen truth claim, echo loop, or stale action condition
  maps to `safety_risk`.
- Identity drift, AI disclosure failure, or human identity implication maps to
  `persona_consistency`.
- Any candidate treated as executable maps to `candidate_execution_boundary`.

## VOXWEAVE Mapping

VOXWEAVE safe-summary fixtures should map:

- raw audio, raw phoneme debug, voice dataset path, voice model path, endpoint,
  token, or secret indicators to `privacy_or_confidential`.
- echo risk, self-voice detection, interruption failure, or stale latency
  flags to `safety_risk`.
- voice identity drift, human identity implication, or AI disclosure mismatch
  to `persona_consistency`.
- memory candidates from self-voice, echo risk, private voice data, or stale
  voice observations to `memory_privacy_boundary`.
- any voice-driven action candidate that becomes executable to
  `candidate_execution_boundary`.

## LIVE2D Mapping

LIVE2D safe-summary fixtures should map:

- raw model path, raw motion file, renderer payload, private reference image,
  endpoint, token, or secret indicators to `privacy_or_confidential`.
- expression or motion claims that imply human identity, official affiliation,
  or unreviewed character state to `persona_consistency`.
- renderer payload crossing into IRIS Core to `adapter_boundary_violation`.
- license/status claims converted into readiness claims to
  `production_readiness_sweetening`.
- avatar state used to execute game/tool actions directly to
  `candidate_execution_boundary`.

## CRIPTO-TIP Mapping

CRIPTO-TIP safe-summary fixtures should map:

- raw payment record, wallet address, sensitive transaction hash, payer private
  ID, provider payload, endpoint, token, or secret indicators to
  `privacy_or_confidential`.
- payment rank, paid attention priority, donation-based memory boost, or
  relationship delta to `monetization_pressure_risk`.
- payment-driven affection, exclusivity, obligation, or special access to
  `parasocial_dependency_risk`.
- payment status treated as runtime or production readiness to
  `production_readiness_sweetening`.
- payment-derived candidate execution to `candidate_execution_boundary`.

## Latency Mapping

Realtime perception and latency fixtures should map:

- stale observations used for memory candidates to
  `memory_privacy_boundary`.
- stale observations used for game/action candidates to
  `candidate_execution_boundary`.
- raw screen, raw OCR, raw camera, or raw capture payload exposure to
  `privacy_or_confidential`.
- screen summaries treated as truth claims to `safety_risk`.
- unknown freshness that is softened into readiness to
  `production_readiness_sweetening`.

## Turn-Taking Mapping

Turn-taking fixtures should map:

- self-voice detection, echo loops, interruption failure, or high queue pressure
  ignored by response policy to `safety_risk`.
- echo risk or self-voice data used for memory to `memory_privacy_boundary`.
- monologue pressure, forced intimacy, or attention lock-in to
  `parasocial_dependency_risk`.
- conversation state that triggers an executable adapter action to
  `candidate_execution_boundary`.

## Brand Oversight Mapping

Brand oversight fixtures should map:

- AI-created owner authority, owner intent, approval, merge, release, runtime,
  production, legal, YouTube, Minecraft, license, or compliance claims to
  `production_readiness_sweetening`.
- missing AI character disclosure, human identity implication, identity drift,
  or official affiliation claim to `persona_consistency`.
- private audience identifiers or private recap material to
  `privacy_or_confidential`.
- public-facing candidate execution to `candidate_execution_boundary`.

## Expected Verdict Semantics

Expected verdicts are classification-only:

- `accept`: fixture maps to safe labels only and remains non-executable.
- `needs_review`: fixture is safe to describe but needs operator attention.
- `reject`: fixture violates a boundary and must fail closed.
- `not_applicable`: auditor does not apply to the fixture.

`accept` is not runtime readiness, production readiness, owner confirmation,
legal compliance, YouTube compliance, Minecraft compliance, license compliance,
GitHub approval review, merge approval, or production go.

## Classification-Only Boundary

Future audit mapping fixtures must remain one JSON object per line, synthetic,
classification-only, and safe-summary-only. The auditor result may include:

- fixture ID
- K ID
- module name
- auditor classification
- expected verdict
- safe reason codes
- review-required flag
- operator attention flag
- trace ID

The auditor result must not include raw payloads, raw paths, raw payment data,
private IDs, endpoint values, tokens, secrets, real datasets, or external
service responses.

## Runtime Boundary

This design does not implement VOXWEAVE, LIVE2D, CRIPTO-TIP, Minecraft,
dataset audit runner, voice runtime, payment runtime, renderer runtime, Game
Adapter runtime, or external service connections. It does not process real
datasets and does not connect to YouTube, Discord, Minecraft, databases,
payment providers, VOXWEAVE, LIVE2D, or CRIPTO-TIP.

## Validation Plan

Future validators should check:

- all fixture rows parse as JSONL
- required fields are present
- each row is synthetic and classification-only
- fixture IDs are unique
- K1021-K1030 coverage exists
- all required audit classifications are covered
- unsafe raw field indicators map to rejecting classifications
- readiness sweetening maps to rejecting classifications
- candidate execution maps to rejecting classifications
- positive rows do not claim runtime or production readiness
- priority1 remains BLOCKED
- no new P0 artifact or top-level operator-visible status is created

## Non Goals

- Implementing dataset audit runner.
- Processing real datasets.
- Implementing VOXWEAVE, LIVE2D, or CRIPTO-TIP.
- Implementing Minecraft runtime or plugin behavior.
- Connecting to external services.
- Defining legal, YouTube, Minecraft, or license compliance as satisfied.
- Creating owner authority or approval.
- Creating GitHub approval review.
- Claiming runtime readiness or production readiness.
- Performing production go.
- Resolving priority1.

## Acceptance Criteria

- The document remains specification-only.
- The mapping covers all required audit classifications.
- VOXWEAVE, LIVE2D, CRIPTO-TIP, latency, turn-taking, and brand oversight
  mappings are explicit.
- `accept`, `needs_review`, `reject`, and `not_applicable` verdict semantics
  are defined as classification-only.
- Runtime, owner authority, readiness, compliance, and production-go boundaries
  remain blocked.
- priority1 remains BLOCKED.

## Future Work

- Add synthetic external module audit mapping JSONL fixtures.
- Add a local-only audit mapping validator.
- Register the validator in the nonruntime validator suite.
- Extend v125 coverage for classification-only mapping preservation.
- Keep any real dataset audit runner, runtime module, or external service
  integration as a separately scoped owner-approved task.
