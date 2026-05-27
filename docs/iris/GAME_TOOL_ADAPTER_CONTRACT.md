# IRIS Game/Tool Adapter Contract

This specification documents the IRIS-safe interpretation of a game/tool adapter
design pattern. External game API articles may inspire the high-level separation
between context, intent, approval, and adapter execution, but this document does
not add compatibility with any external Game API, SDK, message protocol, action
model, or force semantics.

This specification does not perform production go. It does not resolve
priority1. priority1 remains BLOCKED until real fresh evidence and owner
confirmation are present.

## Core Principle

External worlds provide safe context.

Core can produce intent or candidate only.

Only approved action schemas can be executed.

Adapters execute approved actions only.

Adapters return safe result summaries only.

IRIS does not allow Core, LLM, Planner, or any candidate-producing phase to
execute game or tool actions directly. Core must not call SDKs, OS input,
OBS commands, game commands, or external tool commands. Core must not introduce
`world_command`.

Candidate objects are not executable. `input_action_candidate` and any other
candidate payload must not reach any Adapter. A candidate must be validated and
converted into an approved schema before any side-effect handoff.

## GameContextEnvelope

`GameContextEnvelope` is an observation envelope, not truth. It carries safe
context from an external world into IRIS.

Required fields:

- `trace_id`
- `event_id`
- `source_adapter`
- `observed_at_ms`
- `freshness_status`
- `confidence`
- `safe_situation_summary`
- `available_action_labels`
- `unavailable_reason_labels`
- `manual_approval_required`
- `privacy_risk_label`
- `rights_risk_label`

Forbidden fields:

- raw screen
- raw frame
- raw SDK object
- raw API response
- raw command
- `world_command`
- endpoint
- token
- private path
- raw payload
- candidate payload

Rules:

- `freshness_status` must be present before Core may reason about action
  candidates.
- `confidence` must be bounded and must not expose raw observation details.
- `safe_situation_summary` must be compact and public-safe.
- `available_action_labels` must come from an approved Adapter Capability
  Manifest.
- `unavailable_reason_labels` must use safe labels only.

## GameActionCandidate

`GameActionCandidate` is a proposal. It is not executable.

Required fields:

- `candidate_id`
- `trace_id`
- `source_context_id`
- `action_label`
- `reason_summary`
- `required_capability`
- `safety_precheck_status`
- `stale_observation_status`
- `manual_approval_required`
- `cooldown_status`

Rules:

- A candidate is never executable.
- A candidate cannot be sent to an Adapter.
- A candidate cannot be public.
- A candidate cannot be persisted as an approved action.
- A candidate cannot contain raw OS input, raw game operation details, SDK
  objects, `world_command`, endpoint values, tokens, private paths, or raw
  payloads.
- A candidate with stale observation status cannot be promoted.
- A candidate with failed safety precheck cannot be promoted.

## ApprovedGameInputAction

`ApprovedGameInputAction` is the only execution handoff schema for game input.

Required fields:

- `approved_action_id`
- `candidate_id`
- `trace_id`
- `approved_by_role`
- `approval_status`
- `adapter_target_label`
- `safe_action_label`
- `capability_label`
- `freshness_status`
- `cooldown_status`
- `emergency_stop_ready`
- `audit_ref`

Rules:

- Only an approved schema can reach an Adapter.
- Manual approval is the default for real control.
- `approved_safe_adapter` mode requires fresh evidence, a safe action map,
  emergency stop readiness, and audit readiness.
- `world_command` remains adapter-internal only after conversion.
- Raw OS command, key, click, SDK operation, or tool payload must not appear in
  Core, public surfaces, or ordinary Admin views.
- `approval_status` must reject unapproved, expired, stale, unsafe, or
  cooldown-blocked actions.
- `audit_ref` is required for all approved side-effect execution.

## GameActionResultSafeSummary

`GameActionResultSafeSummary` reports status only. It is the only result shape
that may return from an Adapter to Core or operator-facing summaries.

Required fields:

- `trace_id`
- `approved_action_id`
- `result_status`
- `safe_result_label`
- `observed_at_ms`
- `next_attention_label`
- `adapter_health_label`
- `retry_allowed`

Forbidden fields:

- raw response
- raw command
- raw screen
- raw error body
- endpoint
- token
- private path
- payload
- `world_command`

Rules:

- Adapter errors must be summarized with safe labels only.
- Retry decisions must be label-based and must not expose raw response details.
- Public and ordinary Admin surfaces must receive safe summaries only.

## Adapter Capability Manifest

`Adapter Capability Manifest` is the source of allowed game/tool action labels
for a specific adapter.

Required fields:

- `adapter_id`
- `world_label`
- `capability_label`
- `allowed_action_labels`
- `requires_manual_approval`
- `requires_emergency_stop`
- `requires_fresh_observation`
- `requires_safe_map`
- `cooldown_ms`
- `risk_level`
- `public_summary_allowed`

Rules:

- `available_game_actions` must come from the manifest.
- Unknown action labels are rejected.
- Missing safe map means BLOCKED or attention.
- Dynamic capability registration is not trusted without audit and approval.
- Capability changes are governance-significant and require review before
  use by real adapters.
- Public summaries must not include raw capability payloads, raw commands, raw
  SDK shapes, endpoint values, tokens, or private paths.

## Simulator / Mock Backend Classification

Backend types:

- `fixture_backend`
- `manual_operator_backend`
- `llm_mock_backend`
- `local_model_mock_backend`
- `real_adapter_backend`

Rules:

- `fixture_backend` PASS does not mean real ready.
- mock backend PASS does not mean production ready.
- `manual_operator_backend` PASS does not mean owner confirmed production go.
- `real_adapter_backend` still requires fresh evidence and owner confirmation.
- Fixture, mock, simulator, and manual test backends are not production
  readiness evidence by themselves.

## Real-Time Control Policy

LLM direct frame-level control is forbidden.

Core may emit high-level intent only.

Low-level timing, movement, key/click conversion, SDK calls, game commands, OS
input, and tool operation conversion belong to the Adapter.

Real control starts in manual approval mode.

`approved_safe_adapter` requires emergency stop readiness, audit readiness,
fresh evidence, safe action map readiness, and owner-approved operating mode.

## External Observation Policy

`screen_capture`, `game_state`, and `media_watch_observation` are External
Observation.

External Observation is not truth.

Low confidence observation cannot create action or memory commit.

Stale observation cannot create an action candidate.

Media/watch observation cannot create long quotes, lyrics, subtitles, or
copyrighted reconstruction.

External Observation may provide safe reference context only. It must not
rewrite Character, Runtime State, or Persistent Memory.

## Manual Approval / Audit

Real side-effect action requires approval or `approved_safe_adapter` mode.

Destructive or live side-effect action requires `confirmation_required`.

All approved action execution must have `audit_ref`.

Audit summary must use safe labels only.

Audit summaries must not include raw screen, raw SDK objects, raw API responses,
raw commands, endpoint values, tokens, private paths, raw payloads, candidate
payloads, or `world_command`.

## Production Readiness

Fixture success does not resolve priority1.

Real fresh evidence is required.

Owner confirmation is required.

Production go is not performed by this specification.

priority1 remains BLOCKED.

Runtime readiness is not claimed by this specification. Production readiness is
not claimed by this specification.

## K Requirement Alignment

This contract aligns with the following existing K requirements:

- K006 input_action_candidate approved boundary
- K079 external observation non-truth boundary
- K082 manual approval default
- K083 approved game input schema separation
- K171 available action allowlist
- K172 stale observation guard
- K177 manual approval audit cue
- K178 approved safe adapter readiness gate
- K346 game adapter approved input packet
- K529 game adapter approved input E2E
- K603 fixture mode isolation
- K814 fixture evidence separation
- K891 priority1 blocker persistence
- K992 priority1 BLOCKED persistence after K900
