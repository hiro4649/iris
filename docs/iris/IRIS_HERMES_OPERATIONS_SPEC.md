# IRIS Hermes Operations Spec

Status: spec_only
Authority: subordinate to `IRIS_SPEC_AUTHORITY.md`, Phase00, numbered Phase specs, and active cross-phase addenda.

This document specifies a future Hermes-style operations layer for IRIS development work. It is not runtime implementation, not production readiness evidence, and not permission to weaken quality gates.

## Purpose

SPEC-HERMES1 defines an operations layer for Codex-driven IRIS development. Its job is to make recurring development operations safer and more repeatable:

- Codex task instruction templates
- PR split and scope planning
- R3 confirmation packet templates
- audit runbooks and safe summaries
- quality gate failure response
- merge and refresh-main procedure
- GitHub, Git Bash, shell, and remote quality-gate confirmation procedure
- recurrence prevention for scope mixing and stale evidence

The layer is a specification for future tooling and operating practice. It must not be treated as implemented until a later approved implementation PR provides code, tests, and remote gate evidence.

## Non-Collision With IRIS Memory DB

The Hermes-style operations layer does not replace the IRIS memory DB.

The Hermes-style operations layer must not write directly to the IRIS memory DB.

IRIS memory DB is the authoritative memory domain for user, viewer, stream, relationship, memory, and context records. Natural use remains limited to `accepted` and `protected` memory records. `candidate`, `stale`, and `rejected` records are not available for natural use. `approved` must not be restored as an IRIS memory status.

Skill DB and Trace DB are operations stores only. They are not user relationship memory, stream memory, viewer memory, or natural recall material.

## Skill DB

Skill DB stores reviewed operations knowledge, not user memory. It may store safe procedural material such as:

- Codex task templates
- PR split procedures
- R3 confirmation templates
- audit procedures
- failure-avoidance procedures
- quality gate response procedures
- merge and refresh-main procedures
- GitHub verification procedures
- Git Bash and shell execution procedures

Skill DB must not store raw user memory, raw viewer records, raw relationship records, raw comments, raw payloads, commands, `world_command`, or `inner_intent`.

Skill DB content can inform future Codex work instructions only after review. It must not bypass Phase ownership, Adapter boundaries, R3 confirmation, or quality gates.

## Trace DB

Trace DB stores safe operational history only:

- PR history
- safe failure summaries
- quality gate stop reasons
- recurrence patterns
- scope-mixing detection history
- R3 waiting history
- safe audit summaries

Trace DB must store safe summaries only. It must not store raw logs, secrets, endpoint values, tokens, raw paths, raw diagnostics, raw payloads, raw candidates, raw memory, raw relationship records, raw commands, `world_command`, private viewer IDs, hidden scores, or `inner_intent`.

Trace DB entries are evidence for process improvement, not production readiness. A passing regression trace is not real worker, engine, OBS, TTS, Live2D, DB, YouTube, or Game fresh evidence.

## Curator

Curator is a future component for organizing Skill DB only.

Curator must not touch the IRIS memory DB. It must not edit, delete, archive, consolidate, or rewrite user memory, viewer memory, stream memory, relationship memory, or natural recall records.

Curator is review-first. Its allowed future actions are limited to proposing archive, review, consolidate, or rename candidates for Skill DB entries. Automatic deletion is prohibited. Removing an operations skill requires owner confirmation.

Curator is not implemented by this spec.

## GEPA-Style Optimizer

The GEPA-style optimizer is a future proposal generator over Trace DB safe summaries.

It may propose:

- improved Codex task instructions
- safer PR split recommendations
- R3 packet wording improvements
- audit checklist updates
- recurrence-prevention notes

It must not directly commit. It must not directly create PRs. It must not write to Skill DB or Trace DB without review. It must not write to the IRIS memory DB. It must not weaken quality gates, blocked path policy, secret scans, R3 requirements, public-surface restrictions, or readiness boundaries.

The GEPA-style optimizer is not implemented by this spec.

## Operations SOUL

Operations SOUL is not IRIS character personality. It is a fixed operating posture for future development agents:

- short, direct, practical
- read before writing
- confirm latest GitHub main before changes
- do not say done before tests
- never hide failure
- do not weaken safety boundaries
- keep PR scope small
- separate audit, fixture, implementation, policy, and spec work
- report residual risk plainly

Operations SOUL must not become public `inner_intent`, character memory, or user relationship memory.

## R3 Confirmation Templates

R3 templates are drafts only. A generated template is not approval. A future R3 packet helper may draft safe JSON or plain-text packets, but it must not spoof human confirmation and must not mark itself as owner approval.

R3 packets must include current HEAD, scope, files, impact, checks, residual risks, and confirmation status. A stale packet must not satisfy current-head confirmation.

## Codex Task Templates

Codex task templates may record safe instructions for:

- checking GitHub latest main
- separating PRE-RUNBOOK, fixture, implementation, policy, and spec scopes
- saving pending patches before cleanup
- running required local checks
- checking remote quality gate status
- reporting npm PASS without production-ready claims

Templates must not contain secrets, endpoint values, tokens, local absolute paths, shell bodies with private values, raw diagnostics, raw payloads, raw candidates, or raw memory.

## GitHub And Shell Operations

The operating rule is that Codex performs GitHub verification, Git Bash operations, shell execution, PR checks, remote quality-gate checks, and browser or GitHub state checks when requested. A ChatGPT-side verbal confirmation is not enough when the task requires repository or GitHub evidence.

Operations procedures must keep safe command summaries and results. They must not publish raw logs that contain secrets, endpoints, tokens, raw paths, raw payloads, raw memory, raw candidates, commands, `world_command`, or `inner_intent`.

## PR Scope Rules

PRs must stay single-scope:

- audit-only PRs do not implement fixes
- fixture PRs do not change runtime behavior
- implementation PRs do not include unrelated docs or harness policy changes
- policy PRs do not change product behavior
- spec PRs do not claim implementation

If A/B/C/D style drift groups appear, they must be split unless explicitly approved together. Safe fixture correction is not evidence of real readiness.

## Scope-Mixing Detection

Scope mixing is suspected when a diff includes:

- unrelated file families
- status wording that claims implementation without code and tests
- readiness labels becoming more permissive
- fixture pass treated as production ready
- candidate direct commit path changes
- persistence writer shortcuts
- relationship aggregate shortcuts
- blocked path or secret policy weakening

When scope mixing is suspected, stop and audit. Do not merge the mixed PR until the scope is split or explicitly approved.

## Quality Gate Failure Handling

Quality gate failures must be classified before fixing:

- manual confirmation required
- blocked path
- secret scan failure
- out-of-scope diff
- test weakening
- domain invariant risk
- stale branch or stale evidence
- profile required check failure

Do not weaken the quality gate to pass. Do not delete tests to hide failures. For R3, use current-head human confirmation only. For blocked paths, follow formal policy paths and do not rely on broad manual override.

## Sensitive Data Rules

Hermes-style operations stores and reports must not contain:

- secrets
- endpoint values
- tokens
- raw paths
- local absolute paths
- shell bodies with private values
- raw diagnostics
- raw payloads
- raw candidates
- raw memory
- raw relationship records
- relationship scores
- private viewer IDs
- commands
- `world_command`
- `inner_intent`

Only safe labels, counts, filenames, PR numbers, status summaries, and current-head confirmation metadata may be stored.

## Readiness Rules

Regression PASS is not production ready.

Fixture PASS is not real ready.

Priority1 remains blocked until real worker, engine, OBS pickup, TTS, Live2D, DB, YouTube, and Game evidence is fresh and human-confirmed.

Production go/no-go requires a separate real-operation confirmation flow. This spec does not perform that flow.

## Implementation Status

Hermes-style operations layer: `spec_only`.

Hermes-style performance expansion: not implemented.

Curator: not implemented.

Growth report: not implemented.

Trace optimizer: not implemented.

Skill DB and Trace DB: not implemented by this spec.

No runtime, server, adapter, persistence, memory, relationship, or harness code is changed by SPEC-HERMES1.
