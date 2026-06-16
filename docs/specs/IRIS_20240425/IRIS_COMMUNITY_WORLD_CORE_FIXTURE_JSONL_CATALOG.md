# IRIS Community World Core Fixture JSONL Catalog Specification

## Status

Status: proposal
Scope: specification only
Fixture file implementation: not started
Validator implementation: not started
Runtime implementation: not started
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Dataset audit runner implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define the future JSONL fixture catalog format for Community World Core gates.
This document specifies row shape, fixture groups, expected result semantics,
and red-line cases without creating fixture files or validators.

## Relation To Gate Validation

Gate validation defines the gate semantics. The fixture JSONL catalog will
provide synthetic inputs for those gates. A fixture row is not runtime evidence,
does not execute Minecraft commands, and does not prove production readiness.

## JSONL Fixture Principle

Each JSONL line should represent exactly one synthetic fixture row. Rows must be
safe, minimal, deterministic, and traceable to one or more gate IDs. Raw chat,
private identifiers, secrets, endpoint values, and real server payloads are not
valid fixture content.

## Common Fixture Row Shape

`community_world_fixture_row`:

- `schema_version`
- `fixture_id`
- `fixture_group`
- `target_gate_ids`
- `input_evidence_class`
- `synthetic_input`
- `expected_result_state`
- `expected_safe_reason_codes`
- `expected_blocking`
- `must_not_include`
- `trace_id`

## Fixture Groups

- `core_schema`
- `identity_link`
- `participation_policy`
- `chat_safe_ingest`
- `contribution_ledger`
- `build_registry`
- `event_lifecycle`
- `moderation_rollback`
- `memory_recall`
- `recognition_recap`
- `monetization_commercial`
- `unofficial_notice`
- `minor_safety`
- `anti_parasocial`
- `direct_command_boundary`
- `raw_chat_memory_boundary`
- `owner_review_boundary`
- `newcomer_friendliness`
- `recall_cooldown`
- `mvp_completion_review`

## Positive Fixtures

Positive fixtures should cover safe candidates such as:

- A spec-only core schema candidate with no runtime fields.
- A reversible identity link candidate with no private identifier exposure.
- A whitelist participation candidate with rule disclosure and owner review
  required.
- A manual chat summary with no raw chat text.
- A contribution ledger entry that records contribution type without ranking.
- A build registry entry that avoids ownership pressure.
- An event lifecycle candidate in `needs_owner_review`.
- A recap candidate that thanks participants without leaderboard ordering.
- A memory recall candidate with cooldown and suppression available.
- An unofficial notice candidate with clear non-affiliation language.
- A commercial policy candidate with no paid rank or paid power.

## Negative Fixtures

Negative fixtures should cover unsafe candidates such as:

- Raw chat included as memory input.
- Private account ID exposed in public output.
- Exact private coordinates included in a recap.
- Payment amount used as rank.
- Friendship or closeness inferred from donation.
- Public recognition sorted as a popularity ladder.
- Operator review treated as owner approval.
- Fixture PASS described as production readiness.
- Missing unofficial notice on a public server rule surface.
- Missing minor safety review for open participation.

## Boundary Fixtures

Boundary fixtures should cover ambiguous but recoverable cases such as:

- A safe manual summary with a missing owner review.
- A recognition recap with neutral ordering but unclear newcomer language.
- A memory recall request within cooldown.
- A commercial mention that needs policy review.
- A rollback candidate with insufficient moderator summary.
- An identity link candidate that is reversible but lacks expiry.
- A server event candidate that is scheduled but not approved.

## Red-Line Fixtures

Red-line fixtures must be expected to fail or block:

- `input_action_candidate` reaches a game adapter boundary.
- A Minecraft command is embedded in synthetic input.
- Raw chat is stored as memory.
- Payment grants gameplay power, rank, or friendship.
- Official Minecraft, Mojang, or Microsoft affiliation is claimed.
- Production readiness or production go is claimed.
- Owner approval is fabricated.
- GitHub approval review is treated as owner decision.
- priority1 is marked resolved.

## Expected Result Semantics

`expected_result_state` must be one of:

- `pass`
- `fail`
- `blocked`
- `not_applicable`
- `needs_review`

`expected_blocking` is true when the validator must stop the candidate from
advancing. A `needs_review` result is not a pass. A `pass` result is scoped to
the fixture evidence class only.

## No Runtime Rule

Fixture rows must not launch a server, execute a command, contact a Minecraft
runtime, read real chat, read raw logs, create remote evidence, or claim live
operation. The catalog is synthetic and documentation-scoped until a separately
approved validator implementation exists.

## Validation Plan

Future validation should load JSONL rows, validate the row shape, run only safe
gate semantics, and emit safe summaries with fixture ID, target gate IDs,
expected state, actual state, safe reason codes, and trace ID. It must not emit
raw input payloads when the payload could contain private or sensitive data.

## Non Goals

- No JSONL fixture file implementation.
- No validator implementation.
- No runtime implementation.
- No Minecraft plugin implementation.
- No dataset audit runner implementation.
- No production readiness claim.
- No production go.
- No priority1 resolution.

## Acceptance Criteria

- Common row shape is defined.
- Fixture groups are defined.
- Positive, negative, boundary, and red-line fixture expectations are defined.
- Runtime and plugin implementation remain not started.
- Dataset audit runner implementation remains not started.
- Production readiness is not claimed.
- Production go is not performed.
- priority1 remains BLOCKED.

## Future Work

- Create fixture JSONL files after owner-scoped approval.
- Implement a safe validator after fixture files are approved.
- Link fixture results to the K1001-K1020 traceability matrix.
