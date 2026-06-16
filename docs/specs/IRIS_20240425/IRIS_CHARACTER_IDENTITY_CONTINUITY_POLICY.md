# IRIS Character Identity Continuity Policy

## Status

Status: proposal
Scope: specification only
VOXWEAVE implementation: not started in this repo
LIVE2D implementation: not started in this repo
Runtime implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define how IRIS preserves character continuity across voice, visual, persona,
memory, and public recap surfaces without ingesting raw voice samples, raw
avatar assets, private production notes, or hidden relationship scores.

## Identity Continuity Principle

IRIS identity is coordinated through safe version labels, drift statuses, and
operator review flags. IRIS Core must not treat external module internals as
canonical identity. Fan memory, payment events, visual placeholders, or voice
placeholders must not mutate canon.

## Identity Version Fields

`iris_identity_continuity_state`:

- `persona_identity_version`
- `voice_identity_version`
- `visual_identity_version`
- `character_bible_safe_version`
- `identity_drift_status`
- `operator_attention_required`
- `owner_review_required`
- `trace_id`

## Visual Identity Boundary

Visual modules may report `visual_identity_version`, `expression_status`,
`motion_visibility_status`, and `identity_drift_status`. They must not send raw
model paths, motion paths, private reference images, unreleased assets, or
renderer payloads into IRIS Core.

## Voice Identity Boundary

Voice modules may report `voice_identity_version`, `voice_source_status`,
`speech_latency_bucket`, and `echo_risk_status`. They must not send raw audio,
phoneme debug, voice dataset paths, vendor diagnostics, private speaker data,
or license document bodies into IRIS Core.

## Persona Identity Boundary

Persona continuity must stay warm, observant, lightly playful, safe,
newcomer-friendly, non-romantic, non-exclusive, non-manipulative, and transparent
that IRIS is an AI character. It must not imply hidden knowledge, human identity,
official affiliation, legal compliance, or production readiness.

## Memory Continuity Boundary

Memory may use safe summaries only. Raw chat, raw audio, raw screen, private
IDs, suppressed memories, and payment-derived relationship signals cannot become
memory.

## Relationship Continuity Boundary

Relationship continuity may use approved safe records and review candidates.
Payment, rank, donation amount, exclusivity pressure, or public popularity must
not create relationship growth.

## Identity Drift States

- `stable`
- `minor_review`
- `high_operator_attention`
- `blocked`

High drift requires operator attention. Drift cannot be resolved by fixture
PASS, mock PASS, or local PASS.

## Operator Attention

Operator attention is required for high voice drift, high visual drift, persona
tone drift, private-memory boundary ambiguity, payment pressure, or public
recognition drift.

## Public Surface Boundary

Public surfaces may expose safe identity statements and reviewed recap wording.
They must not expose raw story bible, production notes, private actor data,
private viewer IDs, or relationship scores.

## Negative Examples

- A placeholder voice is called production ready.
- A temporary avatar model becomes canonical identity.
- A donation changes closeness.
- A fan memory mutates character canon.
- IRIS claims to be human.
- IRIS claims official Minecraft approval.

## Validation Plan

Future validators should check identity version fields, drift statuses, review
requirements, forbidden raw fields, monetization boundary, and public claim
boundary.

## Non Goals

- No avatar implementation.
- No voice implementation.
- No character bible publication.
- No legal or platform compliance claim.
- No production readiness.
- No production go.

## Acceptance Criteria

- Identity version fields are defined.
- Visual, voice, persona, memory, and relationship boundaries are explicit.
- High drift requires operator attention.
- Payment cannot mutate relationship or identity.
- priority1 remains BLOCKED.

## Future Work

- Identity continuity fixtures.
- Persona consistency validator.
- External module safe summary validator.
