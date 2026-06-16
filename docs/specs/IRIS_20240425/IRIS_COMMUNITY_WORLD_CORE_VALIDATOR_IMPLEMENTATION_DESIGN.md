# IRIS Community World Core Validator Implementation Design

## Status

Status: proposal
Scope: specification only
Validator implementation: partially started for fixture and audit mapping validators
Runtime implementation: not started
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Dataset audit runner implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define how Community World Core validators should be split so future checks stay
small, local, safe-summary-only, and scoped to their evidence class.

## Relation to Community World Core

Community World Core is a relationship-building and memory-continuity
specification with Minecraft as the first adapter target. Validators may check
specification fixtures, classification mappings, gate semantics, and completion
review summaries, but they do not create a Minecraft runtime, plugin, adapter,
dataset audit runner, owner decision, production readiness claim, or production
go.

## Validator Split Principle

Each validator owns one evidence lane and one input shape. Validators must not
combine fixture validation, dataset audit integration, gate execution, runtime
readiness, and owner approval into one authority. Passing one validator means
only that the validator's local evidence class is internally consistent.

Validators are local-only unless a future owner-scoped task explicitly approves
remote operation. They use no network, no runtime connection, no package
dependency, no workflow change, and no raw payload.

## Existing Validators

- `scripts/codex-community-world-fixture-validator.mjs` checks synthetic
  Community World fixture rows only.
- `scripts/codex-community-world-audit-mapping-validator.mjs` checks synthetic
  fixture-to-dataset-audit classification mapping only.
- `scripts/codex-iris-external-character-boundary-validator.mjs` checks the
  separate external character boundary fixture pack.

## Future Validators

- Community World gate validator: future work, not implemented.
- Community World completion review validator: future work, not implemented.
- Dataset audit integration validator: future work, not a runner.
- External module safe summary validator: future work, not implemented.
- Cross-validator consistency aggregator: future work, safe-summary only.

## Validator Input Boundaries

Fixture validators may read JSONL fixture files and static specification
documents. Audit mapping validators may read mapping JSONL plus referenced
synthetic fixture JSONL. Future gate validators may read gate result candidates
only after a separate owner-scoped task defines the input schema.

Validators must not read raw logs, raw Minecraft chat, private viewer IDs, exact
private coordinates, endpoint values, secrets, wallet/RPC values, live server
payloads, or real dataset rows.

## Validator Output Boundaries

Validator output is a safe summary. It may include counts, pass/fail status,
missing coverage labels, reason codes, and one safe next action. It must not
print raw fixture bodies, raw mapping bodies, raw payloads, private values,
secret-like values, live endpoint values, or raw diffs.

Every output must preserve:

- `priority1: BLOCKED`
- `runtimeImplemented: false`
- `minecraftRuntimeImplemented: false`
- `minecraftPluginImplemented: false`
- `datasetAuditRunnerImplemented: false`
- `productionReadinessClaimed: false`
- `productionGoPerformed: false`

## Evidence Lane Boundaries

Fixture PASS is fixture evidence only. Audit mapping PASS is classification-map
evidence only. Gate validator PASS, when implemented, will be gate-semantics
evidence only. Completion review PASS, when implemented, will be owner-review
candidate evidence only. None of these lanes can become runtime readiness,
production readiness, owner approval, GitHub approval review, or merge
authorization.

## Dataset Audit Boundary

Dataset audit integration remains classification-only. The audit mapping
validator checks expected auditors, verdicts, severities, actions, fixture
references, and coverage. It does not process real datasets, auto-fix rows,
write memory, publish recognition, moderate users, execute rollback, connect to
Minecraft, or create training/eval acceptance.

## Runtime Boundary

Validators are not runtime adapters, Minecraft plugins, schedulers, bridge
workers, or command executors. They must reject candidate execution,
`input_action_candidate` reaching an adapter, premature
`approved_game_input_action`, raw chat memory, payment rank, relationship rank,
official Minecraft affiliation claims, and production readiness sweetening.

## Owner Authority Boundary

Validators cannot create owner approval, operator approval, GitHub approval
review, merge approval, legal compliance approval, YouTube compliance approval,
Minecraft compliance approval, or production go. Owner decisions remain
separate safe artifacts or explicit owner-scoped instructions.

## Implementation Order

1. Fixture validator for K1001-K1020 synthetic fixture rows.
2. Audit mapping validator for fixture-to-auditor classification mapping.
3. Gate validator design and fixture pack.
4. Completion review validator design and fixture pack.
5. Dataset audit integration validator design, still classification-only.
6. External module safe summary validator design.
7. Cross-validator consistency aggregator after all input schemas are stable.

## Validation Plan

For docs-only changes, run:

- `git diff --check`
- `node scripts/lint-iris-docs.mjs`
- `node scripts/lint-iris-docs.mjs --iris-spec-only`
- `node scripts/codex-secret-safety-scan.mjs`
- `node scripts/codex-v125-self-test.mjs`

For validator code changes, also run the changed validator, its self-test, the
related fixture validator, and the local quality gate. `npm test` may be used as
broader evidence, but a timeout with progressing ok count and no `not ok` must
be classified separately from validator failure.

## Non Goals

- No runtime implementation.
- No Minecraft runtime implementation.
- No Minecraft plugin implementation.
- No dataset audit runner implementation.
- No real dataset processing.
- No package or lockfile change.
- No workflow change.
- No network requirement.
- No production readiness claim.
- No production go.
- No priority1 resolution.

## Acceptance Criteria

- Validator responsibilities are split by evidence lane.
- Fixture validator scope is synthetic fixture rows only.
- Audit mapping validator scope is synthetic fixture-to-audit classification
  only.
- Gate validator and completion review validator remain future work.
- Dataset audit integration remains classification-only.
- External character boundary validator remains separate.
- External module safe summary validator remains future work.
- Local-only, no-network, no-runtime, no-package, and no-workflow boundaries are
  explicit.
- Owner authority, runtime readiness, production readiness, and priority1
  boundaries are preserved.

## Future Work

- Add a Community World gate validator design after owner-scoped approval.
- Add completion review validator fixtures after gate validator scope is stable.
- Add an external module safe summary validator design.
- Add a safe cross-validator consistency report without creating a new final
  authority.
