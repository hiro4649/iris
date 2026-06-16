# IRIS Community World Core K1001-K1020 Traceability Matrix Specification

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

Define a traceability matrix for Community World Core K1001-K1020 so each
target item has a bounded source specification, expected evidence class, and
known implementation state before any runtime or Minecraft plugin work begins.

## Relation To Community World Core

Community World Core is a relationship and memory continuity design layer for
IRIS community participation. This matrix links the design intent to existing
specifications and future validation hooks without creating executable game
actions, server automation, or production readiness evidence.

## Traceability Principle

Every K item must point to a source specification and a required evidence class.
Spec coverage is not runtime coverage. Fixture coverage is not production
coverage. Validator coverage is not owner approval. Missing evidence must remain
visible as a gap instead of being inferred from adjacent documents.

## Source Specifications

- `IRIS_COMMUNITY_WORLD_CORE_MINECRAFT_MVP.md`
- `IRIS_COMMUNITY_WORLD_CORE_SCHEMA_FIXTURES.md`
- `IRIS_COMMUNITY_WORLD_CORE_FIXTURE_CATALOG.md`
- `IRIS_COMMUNITY_WORLD_CORE_OPERATOR_REVIEW.md`
- `IRIS_COMMUNITY_WORLD_CORE_IDENTITY_LINK.md`
- `IRIS_COMMUNITY_WORLD_CORE_PARTICIPATION_POLICY.md`
- `IRIS_COMMUNITY_WORLD_CORE_MANUAL_EVENT_INGEST.md`
- `IRIS_COMMUNITY_WORLD_CORE_MODERATION_ROLLBACK.md`
- `IRIS_COMMUNITY_WORLD_CORE_RECOGNITION_RECAP.md`
- `IRIS_COMMUNITY_WORLD_CORE_MEMORY_RECALL_POLICY.md`
- `IRIS_COMMUNITY_WORLD_CORE_MONETIZATION_COMMERCIAL_POLICY.md`
- `IRIS_COMMUNITY_WORLD_CORE_UNOFFICIAL_NOTICE_POLICY.md`
- `IRIS_COMMUNITY_WORLD_CORE_SERVER_EVENT_LIFECYCLE.md`

## K1001-K1020 Matrix

| K | Capability | Primary Source Specs | Coverage State | Required Evidence Class |
| --- | --- | --- | --- | --- |
| K1001 | Core schema | MVP, schema fixtures, fixture catalog | spec-only plus fixture-spec | source_spec, fixture_spec |
| K1002 | Identity link candidate | identity link, operator review, schema fixtures | spec-only plus fixture-spec | source_spec, fixture_spec, owner_review |
| K1003 | Participation whitelist gate | participation, identity link, operator review | spec-only | source_spec, owner_review |
| K1004 | Chat safe ingest | manual event ingest, MVP, schema fixtures | spec-only plus fixture-spec | source_spec, fixture_spec |
| K1005 | Contribution ledger | MVP, fixture catalog, manual ingest, recognition recap | spec-only plus fixture-spec | source_spec, fixture_spec |
| K1006 | Build registry | MVP, schema fixtures, fixture catalog, recognition recap | spec-only plus fixture-spec | source_spec, fixture_spec |
| K1007 | World event ledger | server event lifecycle, manual ingest, MVP | spec-only | source_spec |
| K1008 | Event lifecycle plan | server event lifecycle, participation, unofficial notice, commercial policy | spec-only | source_spec, owner_review |
| K1009 | Grief rollback moderation gate | moderation rollback, operator review, server event lifecycle | spec-only | source_spec, owner_review |
| K1010 | Public recognition no-ranking policy | recognition recap, operator review, monetization | spec-only | source_spec, owner_review |
| K1011 | Memory recall policy | memory recall, operator review, manual ingest | spec-only | source_spec, owner_review |
| K1012 | Recap safe export | recognition recap, server event lifecycle, manual ingest | spec-only | source_spec, fixture_spec |
| K1013 | Unofficial notice gate | unofficial notice, participation, server event lifecycle | spec-only | source_spec, owner_review |
| K1014 | Commercial policy gate | monetization, participation, unofficial notice | spec-only | source_spec, owner_review |
| K1015 | Anti-parasocial guard | recognition recap, memory recall, monetization, operator review | spec-only | source_spec, owner_review |
| K1016 | Minor safety guard | participation, operator review, moderation rollback, monetization | spec-only | source_spec, owner_review |
| K1017 | No-pay-to-win guard | monetization, participation, recognition recap | spec-only | source_spec, owner_review |
| K1018 | Server rule disclosure gate | participation, unofficial notice, server event lifecycle | spec-only | source_spec, owner_review |
| K1019 | Fixture catalog coverage | schema fixtures, fixture catalog, future fixture JSONL catalog | fixture-spec | source_spec, fixture_spec |
| K1020 | MVP completion review hook | traceability, gate validation, fixture JSONL catalog, future completion review | spec-only | source_spec, validator_report |

## Coverage States

- `spec-only`: documented behavior or policy only.
- `fixture-spec`: fixture shape or fixture expectation is documented.
- `validator-spec`: validator behavior is specified but not implemented.
- `fixture-implemented`: synthetic fixture file exists and is validated.
- `validator-implemented`: validator exists and produces safe output.
- `runtime-implemented`: runtime or adapter behavior exists.
- `blocked`: required evidence is absent or unsafe to infer.

## Required Evidence Classes

- `source_spec`: a bounded source document.
- `fixture_spec`: a documented fixture shape or catalog expectation.
- `synthetic_fixture`: non-runtime test input with expected safe result.
- `validator_report`: parseable safe validator result.
- `runtime_evidence`: real runtime evidence from an approved implementation.
- `owner_review`: explicit owner or operator review summary.

## Out Of Scope

This specification does not implement runtime code, a Minecraft plugin, a
dataset audit runner, JSONL fixture files, validators, live server checks,
remote evidence collection, production readiness, production go, or priority1
resolution.

## Gap Handling

If a K item lacks a required source or evidence class, mark it `blocked`.
Do not borrow readiness from another K item.
Do not infer runtime implementation from fixture or validator coverage.
Do not treat owner review as GitHub approval review.
Do not treat GitHub approval review as production approval.

## Validation Plan

Future validation should read this matrix as policy input and emit a safe
summary containing each K item, coverage state, required evidence class, missing
evidence, and next safe action. Validation must remain safe-summary only and
must not read raw chat, private identifiers, secrets, runtime payloads, or raw
server logs.

## Non Goals

- No runtime implementation.
- No Minecraft plugin implementation.
- No dataset audit runner implementation.
- No production readiness claim.
- No production go.
- No priority1 resolution.

## Acceptance Criteria

- K1001-K1020 are all mapped to source specifications.
- Coverage states are explicit and do not imply runtime readiness.
- Required evidence classes are explicit.
- Runtime implementation remains not started.
- Minecraft plugin implementation remains not started.
- Dataset audit runner implementation remains not started.
- Production readiness is not claimed.
- Production go is not performed.
- priority1 remains BLOCKED.

## Future Work

- Add a fixture JSONL catalog specification.
- Add a gate validation specification.
- Add an MVP completion review hook specification.
- Implement validators only after owner-scoped approval.
