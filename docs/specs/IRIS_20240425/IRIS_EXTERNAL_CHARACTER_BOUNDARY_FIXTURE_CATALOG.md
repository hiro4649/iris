# IRIS External Character Boundary Fixture Catalog Specification

## Status

Status: proposal
Scope: specification only
Fixture JSONL implementation: not started
Validator implementation: not started
Runtime implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define the future fixture catalog for K1021-K1030 external module and realtime
character boundaries. This document specifies fixture groups and expected
semantics only; it does not create JSONL fixture files or validators.

## Relation To K1021-K1030

K1021-K1030 define safe summary contracts, identity continuity, realtime
latency, turn-taking, echo guard, audience recap, text-state adapter priority,
brand oversight, AI character disclosure, and license status boundaries. This
catalog describes future synthetic fixtures for those requirements.

## Fixture Catalog Principle

All fixtures are synthetic. Fixtures must not include raw audio, raw model paths,
raw payment records, private IDs, tokens, endpoints, real actor data, real
viewer data, real payment details, raw screen, raw chat, production readiness
claims, or production go claims.

## Fixture Groups

- `external_module_safe_summary`
- `identity_continuity`
- `realtime_latency`
- `turn_taking`
- `echo_guard`
- `audience_recap`
- `text_state_adapter`
- `brand_character_oversight`
- `license_status_boundary`

## Positive Fixtures

- safe VOXWEAVE summary accepted
- safe LIVE2D summary accepted
- safe CRIPTO-TIP summary accepted
- stable identity continuity accepted
- fresh observation commentary accepted
- manual summary accepted
- newcomer recap accepted
- text-state summary accepted
- brand oversight disclosure accepted

Positive fixtures must use safe summaries, safe statuses, booleans, buckets,
candidate IDs, trace IDs, and review flags only.

## Negative Fixtures

- raw audio included
- raw Live2D model path included
- raw payment record included
- token included
- endpoint included
- private viewer ID included
- payment increases relationship
- stale observation creates game action
- IRIS claims official Minecraft approval
- AI reviewer creates owner authority

Negative fixtures should encode unsafe conditions through safe boolean flags and
labels, not raw payload examples.

## Boundary Fixtures

- voice placeholder requires attention
- identity drift high requires operator review
- echo risk blocks memory
- viewer queue pressure shortens monologue
- manual summary creates candidate only
- screen summary cannot be truth
- donation gratitude allowed but relationship delta forbidden
- newcomer recap requires context

Boundary fixtures may expect `blocked`, `needs_review`, `not_applicable`, or
scoped `pass` depending on the exact safe state.

## Red-Line Fixtures

- raw audio leak
- raw asset path leak
- raw payment secret leak
- production readiness sweetening
- owner authority creation
- candidate execution
- adapter boundary violation
- parasocial dependency
- monetization pressure
- official affiliation claim

Red-line fixtures must fail closed and remain blocking.

## Expected Result Semantics

- `pass`
- `fail`
- `blocked`
- `needs_review`
- `not_applicable`

A `pass` applies only to the synthetic fixture evidence class. It is not runtime
readiness, production readiness, owner approval, legal compliance, YouTube
policy compliance, Minecraft compliance, or production go.

## Fixture Row Sketch

`iris_external_character_boundary_fixture_row`:

- `schema_version`
- `fixture_id`
- `fixture_group`
- `k_ids`
- `target_policy_ids`
- `synthetic_input`
- `expected_result_state`
- `expected_safe_reason_codes`
- `expected_blocking`
- `must_not_include`
- `priority1_status`
- `trace_id`

## Required Must-Not-Include Labels

- `raw_audio`
- `raw_live2d_model_path`
- `raw_motion_file`
- `raw_payment_record`
- `private_viewer_id`
- `token`
- `endpoint`
- `secret`
- `raw_screen`
- `raw_chat`
- `relationship_ranking`
- `payment_ranking`
- `production_readiness_claim`
- `official_affiliation_claim`

## Validation Plan

Current validation is documentation-only:

- docs lint
- spec-only docs lint
- secret scan
- v124 self-test

Future validation should check row shape, group semantics, K1021-K1030
coverage, forbidden labels, fail-closed red-line cases, priority1 preservation,
and no readiness claims.

## Non Goals

- No JSONL fixture file.
- No validator implementation.
- No runtime implementation.
- No external module implementation.
- No VOXWEAVE implementation.
- No LIVE2D implementation.
- No CRIPTO-TIP implementation.
- No production readiness.
- No production go.

## Acceptance Criteria

- Fixture groups are defined.
- Positive, negative, boundary, and red-line examples exist.
- K1021-K1030 linkage exists.
- Expected result semantics are defined.
- Forbidden labels are defined.
- priority1 remains BLOCKED.

## Future Work

- Actual JSONL fixture files.
- External character boundary validator.
- External module safe summary validator.
- Realtime latency fixture validator.
- Turn-taking fixture validator.
- Audience recap fixture validator.
- Text-state adapter fixture validator.
