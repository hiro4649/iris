# IRIS External Character K1021-K1030 Traceability Specification

## Status

Status: proposal
Scope: specification only
Runtime implementation: not started
VOXWEAVE implementation: not started in this repo
LIVE2D implementation: not started in this repo
CRIPTO-TIP implementation: not started in this repo
Dataset audit runner implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Map K1021-K1030 external module and realtime character requirements to their
source specifications, success conditions, evidence classes, and current
coverage state.

## Relation To IRIS External Character Boundary Specs

K1021-K1030 extend Community World Core by defining how IRIS Core receives safe
summaries from external voice, visual, payment, game-state, and realtime
conversation modules while preserving character identity, owner authority,
privacy, and production-readiness boundaries.

## K1021-K1030 Matrix

| K | Requirement | Source Specs | Success Condition | Current State |
| --- | --- | --- | --- | --- |
| K1021 | External Module Safe Summary Contract | `IRIS_EXTERNAL_MODULE_SAFE_SUMMARY_CONTRACT.md` | VOXWEAVE, LIVE2D, CRIPTO-TIP, and adapters pass only safe summaries, statuses, counts, booleans, buckets, risk labels, candidate IDs, and trace IDs. Raw audio, raw model path, raw payment data, tokens, endpoints, private IDs, and secrets do not enter IRIS Core. | spec_only |
| K1022 | Character Identity Continuity Policy | `IRIS_CHARACTER_IDENTITY_CONTINUITY_POLICY.md` | `visual_identity_version`, `voice_identity_version`, `persona_identity_version`, and `identity_drift_status` exist. High drift requires operator attention. No raw assets or voice samples enter IRIS Core. | spec_only |
| K1023 | Realtime Latency Budget Policy | `IRIS_REALTIME_PERCEPTION_LATENCY_POLICY.md` | `perception_timestamp_ms`, `speech_start_timestamp_ms`, `observation_age_bucket`, `stale_observation`, and `latency_bucket` exist. Stale observation cannot create memory or game action candidates. | spec_only |
| K1024 | Turn-Taking and Interruption Policy | `IRIS_TURN_TAKING_AND_INTERRUPTION_POLICY.md` | `speaking_state`, `interruptible`, `interruption_source`, `viewer_queue_pressure`, `max_monologue_ms`, `echo_risk_status`, and safety interruption priority are defined. | spec_only |
| K1025 | Echo and Self-Voice Guard | `IRIS_TURN_TAKING_AND_INTERRUPTION_POLICY.md`, `IRIS_EXTERNAL_MODULE_SAFE_SUMMARY_CONTRACT.md` | `self_voice_detected` and `echo_risk_status` are safe statuses. IRIS does not treat its own TTS as viewer input, memory, or relationship evidence. | spec_only |
| K1026 | Audience-Specific Safe Recap Policy | `IRIS_AUDIENCE_SPECIFIC_SAFE_RECAP_POLICY.md` | Viewer, operator, newcomer, Shorts, guardian-style safety, moderator, and owner recap modes are defined. Private IDs, raw chat, payment ranking, and relationship ranking are excluded. | spec_only |
| K1027 | Text-State First Adapter Policy | `IRIS_COMMUNITY_WORLD_TEXT_STATE_ADAPTER_POLICY.md` | Operator manual summary, server event safe summary, plugin safe summary, game log safe summary, and text-state protocol are prioritized over screen/OCR. Raw screen and raw chat are not truth or memory. | spec_only |
| K1028 | Brand Character Oversight Policy | `IRIS_BRAND_CHARACTER_OVERSIGHT_POLICY.md` | Character bible safe summary, AI disclosure, persona consistency, owner authority boundary, visual/voice consistency, monetization boundary, and public claim boundary are defined. | spec_only |
| K1029 | AI Character Disclosure Boundary | `IRIS_BRAND_CHARACTER_OVERSIGHT_POLICY.md`, `IRIS_AUDIENCE_SPECIFIC_SAFE_RECAP_POLICY.md` | IRIS can disclose that it is an AI character that talks and reacts under operator-supervised safety boundaries. It must not imply it is human, official, legally compliant, or production ready. | spec_only |
| K1030 | External Module License Status Boundary | `IRIS_EXTERNAL_MODULE_SAFE_SUMMARY_CONTRACT.md`, `IRIS_CHARACTER_IDENTITY_CONTINUITY_POLICY.md` | Voice, visual, and payment-related license statuses are safe labels only. Contract body, fee table, raw asset, raw voice sample, secret, token, endpoint, and private actor/payment data are not ingested. | spec_only |

## Coverage States

- `spec_only`
- `fixture_spec`
- `validator_spec`
- `fixture_implemented`
- `validator_implemented`
- `runtime_implemented`
- `blocked`

K1021-K1030 are currently `spec_only` only.

## Required Evidence Classes

- `spec_file_exists`
- `required_section_exists`
- `safe_summary_contract_defined`
- `forbidden_raw_fields_defined`
- `operator_attention_defined`
- `runtime_not_started`
- `priority1_blocked_preserved`

## Out Of Scope

This traceability specification does not implement runtime behavior, external
module code, dataset audit runner behavior, Minecraft plugin behavior, VOXWEAVE,
LIVE2D, CRIPTO-TIP, payment processing, voice generation, avatar rendering, or
game adapter execution.

## Gap Handling

If a K item lacks a source spec, success condition, forbidden raw field boundary,
operator attention rule, or priority1 preservation, mark it `blocked`. Do not
infer runtime coverage from spec coverage.

## Validation Plan

Current validation is docs-only:

- docs lint
- spec-only docs lint
- secret scan
- v124 self-test

Future validation may add fixture catalog and validator checks after separate
owner-scoped approval.

## Non Goals

- No runtime implementation.
- No external module implementation.
- No dataset audit runner implementation.
- No legal, YouTube, Minecraft, runtime, or production readiness claim.
- No production go.
- No priority1 resolution.

## Acceptance Criteria

- K1021-K1030 are all listed.
- Each K maps to at least one source spec.
- Each K has a success condition.
- Each K remains runtime not started.
- priority1 remains BLOCKED.

## Future Work

- External character fixture catalog.
- External character boundary validator.
- External module safe summary validator.
