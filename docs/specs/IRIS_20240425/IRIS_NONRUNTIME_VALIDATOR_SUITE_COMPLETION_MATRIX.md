# IRIS Nonruntime Validator Suite Completion Matrix

## Status

Status: proposal
Scope: specification only
Harness context: v1.2.5
Nonruntime validator suite: complete for current synthetic fixture scope
Runtime implementation: not implemented by this document
Dataset audit runner implementation: not implemented
Real dataset processing: not performed
VOXWEAVE implementation: not implemented in this repo
LIVE2D implementation: not implemented in this repo
CRIPTO-TIP implementation: not implemented in this repo
Minecraft runtime implementation: not implemented
Minecraft plugin implementation: not implemented
Runtime readiness: not claimed
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

This matrix summarizes the current local-only, nonruntime validation coverage
for Community World, external character, and external module boundary work.
It is an operator-readable coverage map for synthetic fixtures and safe JSON
validators. It does not authorize runtime integration, dataset processing,
owner approval, legal compliance, production readiness, or production go.

## Validator Inventory

The nonruntime suite currently registers these validators:

| Validator | Primary surface | Completion status |
| --- | --- | --- |
| `community_world_fixture_validator` | Community World fixture catalog | complete |
| `community_world_audit_mapping_validator` | Community World audit mapping | complete |
| `community_world_gate_validator` | Community World gate fixtures | complete |
| `community_world_completion_review_validator` | Community World completion review | complete |
| `iris_external_character_boundary_validator` | External character boundary fixtures | complete |
| `iris_external_module_safe_summary_validator` | External module safe summaries | complete |
| `iris_external_module_audit_mapping_validator` | External module audit mapping | complete |
| `iris_external_module_boundary_completion_validator` | External module completion review | complete |

Completion here means the validator is present, registered in the nonruntime
suite, has local self-test coverage where applicable, and emits safe summary
results. Completion does not mean the related external module or runtime
adapter exists.

## Coverage Matrix

| Coverage area | Validator coverage | Boundary preserved |
| --- | --- | --- |
| Community World fixtures | Fixture, audit mapping, gate, and completion review validators | No Minecraft runtime or plugin is created |
| External character identity boundary | External character boundary validator | No external asset runtime or identity authority is created |
| External module safe summary envelope | Safe summary validator | Raw payloads stay outside IRIS Core |
| External module audit mapping | Audit mapping validator | Classification remains synthetic and non-executing |
| External module completion review | Boundary completion validator | Completion does not become readiness |
| Dataset audit planning | Audit mapping validators only | No dataset audit runner and no real dataset processing |
| Owner and priority boundaries | Suite-level safety checks | Owner approval is not created and priority1 remains BLOCKED |
| Production and runtime boundaries | Suite-level safety checks | Runtime readiness, production readiness, and production go are not claimed |

## K1001-K1020 Coverage

K1001-K1020 are covered by the Community World nonruntime surfaces:

- fixture catalog validation
- audit mapping validation
- gate validation
- completion review validation
- traceability through the Community World spec family

This coverage confirms synthetic, safe-summary consistency only. It does not
start a server, connect to Minecraft, create a plugin, process real community
data, or approve operational readiness.

## K1021-K1030 Coverage

K1021-K1030 are covered by the external character and external module
nonruntime surfaces:

- external character boundary validation
- external module safe summary validation
- external module audit mapping validation
- external module completion review validation
- traceability through external character and external module specs

This coverage confirms that VOXWEAVE, LIVE2D, CRIPTO-TIP, realtime
perception, turn-taking, audience recap, brand oversight, and AI disclosure
boundaries can be represented as safe synthetic summaries. It does not
implement any of those modules or claim that their real evidence exists.

## Dataset Audit Coverage

Dataset audit coverage is classification-only and fixture-only. The suite may
validate that a synthetic row maps to an audit class such as privacy,
adapter-boundary, production-readiness-sweetening, memory-privacy,
parasocial-risk, monetization-risk, safety-risk, persona-consistency, or
candidate-execution-boundary.

The suite must not:

- implement a dataset audit runner
- process a real dataset
- auto-fix dataset rows
- accept raw secrets, endpoints, wallet values, private identifiers, raw chat,
  raw screen data, raw audio, or payment records
- treat audit coverage as readiness

## Runtime Boundary

The suite is intentionally nonruntime. It must not create, start, configure, or
verify live versions of:

- VOXWEAVE
- LIVE2D
- CRIPTO-TIP
- Minecraft runtime
- Minecraft plugin
- voice runtime
- game or tool adapter runtime
- database, YouTube, Discord, OBS, or payment integrations

Synthetic PASS, fixture PASS, mock PASS, local PASS, remote gate PASS, target
gate PASS, and suite PASS are not runtime readiness or production readiness.

## Priority1 Boundary

Every validator in this matrix must preserve:

- `priority1: BLOCKED`
- no owner approval created by AI
- no GitHub approval review submitted by an agent
- no merge approval created by reviewer consensus
- no production go

If any validator reports priority1 as resolved, production readiness as true,
runtime readiness as true, or owner authority as created by AI, the suite must
fail that surface.

## Known Nonruntime Completion

The current nonruntime completion claim is narrow:

- fixture files exist for the current synthetic scope
- validators parse and reject unsafe synthetic rows
- suite registration covers the validators
- v125 self-test guards the validator surfaces
- docs describe the boundary without widening runtime scope

This is useful because it gives future work a stable map of what is already
checked locally before any separate owner-scoped runtime or data task begins.

## Blocked Runtime Areas

The following remain blocked or unimplemented:

- real worker evidence
- engine evidence
- OBS pickup evidence
- TTS evidence
- LIVE2D evidence
- database evidence
- YouTube evidence
- Game or Minecraft live evidence
- VOXWEAVE runtime evidence
- CRIPTO-TIP payment evidence
- real dataset audit evidence
- production go or go/no-go operation

These blocked areas require separate owner scope and fresh real evidence. They
cannot be inferred from this matrix.

## Future Work

Future work should stay split by scope:

- Add new synthetic fixtures only when a new nonruntime boundary is specified.
- Add validators only for safe JSON or JSONL surfaces.
- Keep dataset audit execution as a separate owner-scoped task.
- Keep runtime, package, workflow, and product changes out of harness-only
  validator branches.
- Require owner confirmation and fresh real evidence before any readiness or
  production decision.

