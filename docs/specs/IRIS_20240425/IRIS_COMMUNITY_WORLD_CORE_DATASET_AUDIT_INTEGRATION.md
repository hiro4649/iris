# IRIS Community World Core Dataset Audit Integration Specification

## Status

Status: proposal
Scope: specification only
Dataset audit runner implementation: not started
Validator implementation: not started
Runtime implementation: not started
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Map IRIS Community World Core fixture and gate semantics to dataset audit
classification labels before any dataset audit runner or runtime integration is
implemented.

## Integration Principle

Dataset audit integration is classification-only. It may describe how future
auditors should classify synthetic Community World cases, but it must not
execute candidates, auto-fix data, write memory, publish recognition, perform
moderation, run rollback, connect to Minecraft, or claim readiness.

## Source Inputs

- Community World Core K1001-K1020 traceability matrix.
- Community World Core gate validation specification.
- Community World Core fixture JSONL catalog specification.
- Community World Core positive, negative, boundary, red-line, and completion
  review JSONL fixtures.
- Local Community World fixture validator safe summary.

## Dataset Audit Classification Map

| Community World Condition | Dataset Audit Classification |
| --- | --- |
| Candidate is executed or treated as executable | `candidate_execution_boundary` |
| Candidate crosses Game Adapter or Minecraft adapter boundary | `adapter_boundary_violation` |
| Fixture, mock, local, target gate, or remote gate PASS is framed as readiness | `production_readiness_sweetening` |
| Raw chat, private memory, exact location, or suppressed recall is exposed | `memory_privacy_boundary` |
| Relationship rank, exclusivity, dependency, or closeness pressure appears | `parasocial_dependency_risk` |
| Payment creates rank, power, friendship, or participation advantage | `monetization_pressure_risk` |
| Private identifiers, secrets, endpoint values, or raw evidence appear | `privacy_or_confidential` |
| Minor safety, moderation, grief, rollback, or public participation ambiguity appears | `safety_risk` |
| IRIS tone, role, unofficial notice, or Community World purpose drifts | `persona_consistency` |

## Fixture Group Mapping

- `positive`: expected safe cases; audit should confirm no reject
  classification is triggered.
- `negative`: expected failure cases; audit should emit the matching reject
  classification.
- `boundary`: expected blocked or needs-review cases; audit should emit a
  bounded risk label and avoid pass-through.
- `red_line`: expected hard reject cases; audit should emit the strongest
  matching reject classification.
- `completion_review`: expected completion-state cases; audit should preserve
  `priority1=BLOCKED`, no runtime claim, and no production go.

## Gate Mapping

- `community_world_no_direct_command_gate` maps to
  `candidate_execution_boundary`.
- `community_world_no_raw_chat_memory_gate` maps to
  `memory_privacy_boundary`.
- `community_world_anti_parasocial_gate` maps to
  `parasocial_dependency_risk`.
- `minecraft_monetization_no_pay_to_win_gate` and
  `community_world_pay_to_rank_guard` map to
  `monetization_pressure_risk`.
- `minecraft_identity_link_gate` and `community_world_minor_safety_gate` map to
  `privacy_or_confidential` and `safety_risk`.
- `minecraft_moderation_grief_rollback_gate` maps to `safety_risk`.
- `minecraft_unofficial_commercial_policy_gate` maps to
  `persona_consistency` and commercial disclosure review.
- `community_world_owner_review_gate` maps to owner-authority preservation and
  must not create approval.

## Future Audit Row Shape

`community_world_dataset_audit_candidate`:

- `schema_version`
- `fixture_id`
- `source_fixture_group`
- `target_gate_ids`
- `audit_classification`
- `expected_reject`
- `expected_blocking`
- `safe_reason_codes`
- `auto_fix_allowed=false`
- `runtime_execution_allowed=false`
- `production_readiness_claimed=false`
- `production_go_performed=false`
- `priority1_status`
- `trace_id`

## Fail-Closed Rules

Future audit classification must reject or block when any row indicates
candidate execution, adapter boundary violation, production readiness
sweetening, memory privacy leak, parasocial dependency, monetization pressure,
eval contamination, secret leak, PII leak, raw command leakage, owner authority
fabrication, or priority1 resolution.

## No Auto-Fix Rule

Dataset audit integration must not auto-fix fixture rows, rewrite user data,
rewrite memory, publish recognition, update moderation state, or alter runtime
state. Final acceptance remains a separate aggregation and owner-review path.

## Validation Plan

Future validators may compare fixture IDs, gate IDs, and expected safe reason
codes against this classification map. The validator output must be a safe
summary only and must not include raw fixture bodies, raw chat, private
identifiers, secrets, endpoint values, raw logs, or raw diffs.

## Non Goals

- No dataset audit runner implementation.
- No runtime implementation.
- No Minecraft runtime implementation.
- No Minecraft plugin implementation.
- No Game Adapter implementation.
- No package or workflow change.
- No production readiness claim.
- No production go.
- No priority1 resolution.

## Acceptance Criteria

- Community World fixture groups are mapped to audit behavior.
- Required dataset audit classifications are mapped.
- Candidate execution and adapter boundary violations fail closed.
- Production readiness sweetening fails closed.
- Memory privacy, parasocial, monetization, safety, and confidentiality risks
  are explicit.
- Auto-fix remains disallowed.
- Dataset audit runner implementation remains not started.
- Runtime implementation remains not started.
- Minecraft plugin implementation remains not started.
- Production readiness is not claimed.
- priority1 remains BLOCKED.

## Future Work

- Add a dataset audit validator design specification.
- Add synthetic audit classification fixtures after owner-scoped approval.
- Implement a runner only after a separate owner-scoped task authorizes it.
