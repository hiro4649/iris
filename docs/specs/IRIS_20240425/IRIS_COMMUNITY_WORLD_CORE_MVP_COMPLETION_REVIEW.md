# IRIS Community World Core MVP Completion Review Hook Specification

## Status

Status: proposal
Scope: specification only
Validator implementation: not started
Runtime implementation: not started
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Dataset audit runner implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define a future MVP completion review hook for Community World Core. The hook
summarizes whether K1001-K1020 have enough specification, fixture, and validator
coverage to request owner review without implying runtime implementation or
production readiness.

## Relation To K1020

K1020 requires an MVP completion review hook that can close the specification
loop across traceability, gate validation, and fixture catalog planning. This
document defines the hook shape only.

## Completion Review Principle

Completion review is a bounded safe summary. It reports coverage state, missing
items, blocked items, and one safe next action. It cannot execute game actions,
create owner approval, bypass manual confirmation, resolve priority1, or claim
production readiness.

## Required Inputs

- K1001-K1020 traceability matrix.
- Community World Core gate validation specification.
- Fixture JSONL catalog specification.
- Existing Community World Core source specifications.
- Safe validator reports when validators exist.
- Owner or operator review summaries when required.

## Completion States

- `not_started`
- `spec_complete`
- `fixture_spec_complete`
- `validator_spec_complete`
- `fixture_implemented`
- `validator_implemented`
- `runtime_candidate`
- `blocked`
- `ready_for_owner_review`

## Review Output Shape

`community_world_mvp_completion_review`:

- `review_id`
- `k_range`
- `spec_complete`
- `fixture_spec_complete`
- `validator_spec_complete`
- `runtime_implemented=false`
- `minecraft_plugin_implemented=false`
- `dataset_audit_runner_implemented=false`
- `production_readiness_claimed=false`
- `production_go_performed=false`
- `priority1_status`
- `blocked_items`
- `safe_next_action`
- `trace_id`

## Pass Conditions

The review may report `ready_for_owner_review` only when:

- K1001-K1020 source specifications are mapped.
- Gate validation semantics exist.
- Fixture JSONL catalog semantics exist.
- Required blocked items are explicit.
- Runtime implementation remains not started.
- Minecraft plugin implementation remains not started.
- Dataset audit runner implementation remains not started.
- Production readiness is not claimed.
- Production go is not performed.
- priority1 remains BLOCKED.

## Blocked Conditions

The review must report `blocked` if any of the following are present:

- Missing K1001-K1020 source mapping.
- Missing gate semantics for a required K item.
- Missing fixture catalog coverage for a required gate.
- Runtime implementation is inferred from spec or fixture status.
- Minecraft plugin implementation is inferred from documentation.
- Dataset audit runner work is mixed into the review.
- Owner review is fabricated.
- Operator review is treated as owner approval.
- Production readiness is claimed.
- Production go is claimed.
- priority1 is marked resolved.
- Raw logs, raw chat, private identifiers, or secrets are required for review.

## Runtime Boundary

The completion review hook is not a runtime adapter, not a Minecraft plugin,
not a server scheduler, not a command executor, and not a live operations gate.
It may point to future runtime work only as a separate owner-scoped candidate.

## Priority1 Boundary

priority1 remains BLOCKED. A completed MVP specification review does not unlock
priority1, production go, runtime readiness, or owner confirmation. Any future
priority1 change requires separate evidence and owner authorization.

## Negative Examples

- Reporting `ready_for_owner_review` while K1019 lacks fixture catalog coverage.
- Marking runtime implemented because fixture specifications exist.
- Treating remote quality gate PASS as production readiness.
- Treating owner decision as present because a reviewer agreed.
- Marking Minecraft plugin implemented from a docs-only PR.
- Removing manual confirmation from the review output.
- Resolving priority1 as part of MVP completion.

## Validation Plan

Future validation should read only safe artifacts and source specifications,
then emit `community_world_mvp_completion_review`. It should include pass or
blocked state, missing evidence, blocked items, and the next safe action. It
must not read raw logs, raw chat, secrets, wallet/RPC values, endpoint values,
or live server payloads.

## Non Goals

- No validator implementation.
- No runtime implementation.
- No Minecraft plugin implementation.
- No dataset audit runner implementation.
- No production readiness claim.
- No production go.
- No priority1 resolution.

## Acceptance Criteria

- Required inputs are defined.
- Completion states are defined.
- Review output shape is defined.
- Pass and blocked conditions are explicit.
- Runtime implementation remains not started.
- Minecraft plugin implementation remains not started.
- Dataset audit runner implementation remains not started.
- Production readiness is not claimed.
- Production go is not performed.
- priority1 remains BLOCKED.

## Future Work

- Implement a safe completion review validator after owner-scoped approval.
- Link the review output to future K1001-K1020 validator reports.
- Add owner-review workflow documentation without changing runtime behavior.
