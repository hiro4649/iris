# IRIS External Module Safe Summary Contract Specification

## Status

Status: proposal
Scope: specification only
VOXWEAVE implementation: not started in this repo
LIVE2D implementation: not started in this repo
CRIPTO-TIP implementation: not started in this repo
Runtime implementation: not started
Production readiness: not claimed
Legal compliance: not claimed
YouTube policy compliance: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define the only information that external modules may pass into IRIS Core.
IRIS Core may receive safe summaries, statuses, counts, booleans, buckets, risk
labels, candidate IDs, trace IDs, and review flags. IRIS Core must not receive
raw payloads from VOXWEAVE, LIVE2D, CRIPTO-TIP, Community World adapters, or
future external modules.

## External Module Principle

External modules own raw implementation details. IRIS Core owns character
behavior, safe memory, relationship continuity, public wording, candidate
review, and safety boundaries. Raw audio, raw avatar assets, raw payment
records, renderer payloads, screen captures, chat exports, endpoints, tokens,
secrets, and private IDs stay outside IRIS Core.

## Module Ownership Boundary

- VOXWEAVE owns voice implementation and audio rendering.
- LIVE2D owns avatar model, rendering, expressions, and motion implementation.
- CRIPTO-TIP owns payment and tip ingestion, verification, and raw payment
  handling.
- Community World adapter teams own future game-specific raw state.
- IRIS Core consumes safe summaries and candidates only.

## Shared Safe Summary Envelope

`iris_external_module_safe_summary`:

- `schema_version`
- `module_name`
- `module_owner`
- `summary_kind`
- `safe_summary`
- `safe_status`
- `risk_flags`
- `operator_attention_required`
- `candidate_ids`
- `trace_id`
- `created_at_ms`
- `raw_payload_included=false`
- `private_id_included=false`
- `token_included=false`
- `endpoint_included=false`
- `secret_included=false`
- `raw_audio_included=false`
- `raw_asset_path_included=false`
- `raw_payment_data_included=false`
- `raw_screen_included=false`
- `raw_chat_included=false`
- `production_readiness_claimed=false`

## VOXWEAVE Voice Safe Summary

Allowed fields:

- `voice_session_safe_summary`
- `voice_identity_version`
- `voice_source_status`
- `speech_latency_bucket`
- `interruption_status`
- `echo_risk_status`
- `license_status`
- `operator_attention_required`
- `trace_id`

Forbidden fields:

- raw audio
- raw phoneme debug
- raw vendor diagnostics
- voice model path
- voice dataset path
- endpoint
- token
- license document body
- private speaker data

## LIVE2D Avatar Safe Summary

Allowed fields:

- `avatar_state_safe_summary`
- `visual_identity_version`
- `expression_status`
- `motion_visibility_status`
- `recovery_required`
- `identity_drift_status`
- `asset_license_status`
- `operator_attention_required`
- `trace_id`

Forbidden fields:

- raw Live2D model path
- raw motion file
- raw renderer payload
- internal asset source
- unreleased production material
- endpoint
- token
- private reference images

## CRIPTO-TIP Safe Summary

Allowed fields:

- `tip_event_safe_summary`
- `tip_amount_bucket`
- `supporter_safe_key`
- `gratitude_candidate_allowed`
- `monetization_pressure_risk`
- `relationship_delta_allowed=false`
- `operator_attention_required`
- `trace_id`

Forbidden fields:

- raw payment record
- wallet address when sensitive
- payment provider secret
- payer private ID
- transaction payload
- payment amount used for rank
- relationship score
- endpoint
- token

## Community World Adapter Safe Summary

Allowed fields:

- `world_state_safe_summary`
- `event_safe_summary`
- `participant_safe_keys`
- `contribution_candidate_ids`
- `moderation_attention_required`
- `text_state_freshness_bucket`
- `operator_attention_required`
- `trace_id`

Forbidden fields:

- raw Minecraft chat
- raw screen
- raw OCR
- exact private coordinates
- game command
- input action candidate
- adapter payload
- private player ID

## Allowed Fields

Safe summaries may use counts, booleans, buckets, coarse statuses, version
labels, trace IDs, candidate IDs, safe keys, risk labels, and review-required
flags.

## Forbidden Fields

IRIS Core must reject raw audio, raw phoneme debug, raw model paths, raw motion
paths, renderer payloads, raw payments, wallet/provider secrets, tokens,
endpoints, private viewer IDs, raw chat, raw screen, raw OCR, raw memory,
relationship scores, and public-surface candidate payloads.

## Risk Flags

Risk flags are safe labels only. Recommended flags include
`identity_drift`, `echo_risk`, `latency_stale`, `raw_payload_attempted`,
`monetization_pressure`, `privacy_boundary`, `operator_review_required`, and
`owner_review_required`.

## Operator Attention

Operator attention is required when identity drift is high, a raw payload is
attempted, payment pressure appears, stale observations could affect memory or
actions, a public recap is requested, or an external module reports restricted
asset ambiguity.

## Memory and Relationship Boundary

External summaries may create review candidates. They must not directly write
memory, relationship state, public recognition, moderation consequences, or
game actions.

## Monetization Boundary

Tips may create gratitude candidates. Tips must not increase relationship,
rank, access priority, public status, friendship, or memory weight.

## Identity Boundary

Voice, visual, persona, and public wording identity versions must remain safe
labels. Raw voice samples, model assets, private production notes, and private
actor data must not enter IRIS Core.

## Failure Handling

If forbidden fields appear, the summary is blocked and reduced to a safe failure
digest with module name, safe reason code, attention flag, and trace ID.

## Audit Boundary

Audit may classify safe summaries and reason codes. Audit must not ingest raw
external module payloads or auto-fix memory, relationships, recognition, or
runtime behavior.

## Negative Examples

- VOXWEAVE sends raw audio to IRIS Core.
- LIVE2D sends a raw model path to IRIS Core.
- CRIPTO-TIP sends a raw payment record to IRIS Core.
- A tip increases relationship score.
- A game adapter sends a command candidate to IRIS Core.
- A safe summary claims production readiness.

## Validation Plan

Future validation should check required envelope fields, forbidden field flags,
safe reason codes, operator attention behavior, and priority1 preservation.
Validation must remain safe-summary only.

## Non Goals

- No VOXWEAVE implementation.
- No LIVE2D implementation.
- No CRIPTO-TIP implementation.
- No runtime adapter implementation.
- No dataset audit runner implementation.
- No legal, YouTube, Minecraft, runtime, or production readiness claim.
- No production go.

## Acceptance Criteria

- Shared safe summary envelope is defined.
- VOXWEAVE, LIVE2D, CRIPTO-TIP, and Community World boundaries are defined.
- Allowed and forbidden fields are explicit.
- Memory, relationship, monetization, and identity boundaries are explicit.
- priority1 remains BLOCKED.

## Future Work

- External character fixture catalog.
- External module safe summary validator.
- Realtime latency and turn-taking validators.
