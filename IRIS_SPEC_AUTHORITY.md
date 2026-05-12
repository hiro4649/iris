# IRIS Spec Authority

Status: formal authority index
Source: formalized from IRIS_SPEC_AUTHORITY_DRAFT.md

This file defines the current reading order and authority order for the existing IRIS specification set.

This file does not rewrite existing specifications.
This file does not resolve conflicts unless an explicit supersession clause is already present in the governing specification or addendum.
This file does not change Phase responsibility.
This file does not delete stale text.
This file does not modify code.

Conflicts not covered by an explicit supersession clause remain unresolved and should be tracked in IRIS_SPEC_CONFLICTS.md.

## Current Specification Set

IRIS_20240425_00 through IRIS_20240425_27 are the current numbered Phase specifications.

The 20260430 through 20260504 cross-phase addenda are current active addenda where their own scope says they apply.

Phase00 remains the root authority.

No interpretation may violate Phase00 canonical enums, Core / Adapter boundary, action_type ownership, candidate / commit / execution separation, review path separation, side input rules, or Source of Truth priority.

Addenda are specification addenda.
Addenda are not replacements for Phase00.
Addenda do not override Phase00 unless a future explicit root-level revision says so.

## Critical Interpretation Rules

Phase00 is the root authority for canonical enums, Phase I/O, source-of-truth rules, side input rules, route constraints, undefined-behavior prohibition, Core / Adapter boundary, EventBus boundary, review path separation, and CI boundary checks.

action_type ownership belongs to Phase04 only.
No earlier or later Phase may create, overwrite, reinterpret, or bypass canonical action_type ownership.

Core must not generate world_command.
Adapter may transform approved Action or approved execution schema into world_command, but Adapter must not decide intent, memory, relation, redirect, task value, or action_type.

candidate, reference, internal profile, policy setting, diagnostic status, and Admin Panel setting are not execution or commit commands.

Any object marked as candidate or requiring validation must pass the proper validator and be converted into an approved schema before execution or persistence.

Source of Truth priority is fixed as:

Character
Runtime State
Persistent Memory
External Observation

External Observation is reference only and must not become truth.

## Authority Order

### A01 Root Authority

IRIS_20240425_00.txt

This is the root authority for canonical enums, Phase I/O, source-of-truth rules, side input rules, route constraints, undefined-behavior prohibition, and global fail rules.

No addendum changes Phase00 canonical enums unless a future explicit root-level revision says so.

### A02 Numbered Phase Specifications

IRIS_20240425_01.txt through IRIS_20240425_27.txt

These are the authority for each Phase responsibility, input ownership, output ownership, non-scope, required tests, and Phase-local boundaries.

Later Phases do not inherit permission to rewrite earlier Phase ownership.

A later Phase may consume only the outputs allowed by Phase00 and its governing Phase contract.

### A03 Explicit Cross-Phase Addenda

Explicit cross-phase addenda are active where their own scope says they apply.

Addenda remain subordinate to Phase00 unless they are a future explicit root-level revision.

When addenda overlap, use the newer and more domain-specific addendum only for that domain.

This does not delete, rename, rewrite, or globally supersede older addenda.

### A04 Explicit Supersession Clauses Inside Addenda

Supersession applies only to the named target and environment.

Example:

IRIS_20240425_cross_phase_addendum_20260503_relationship_scale_postgresql.txt supersedes earlier small-store relationship level guidance for production-scale persistence.

JSON persistence remains acceptable only where the PostgreSQL addendum allows local development, fixtures, small-scale MVP rehearsal, or emergency fallback.

### A05 Architecture Documents Under docs/architecture

Use architecture documents as implementation guidance, status guidance, and evidence of current code mapping.

Do not use architecture documents to override numbered Phase specifications or cross-phase addenda unless a specification explicitly grants that authority.

### A06 Progress And Status Documents

PHASE_01_15_STATUS.md and DEVELOPMENT_PROGRESS.md are evidence of implementation and verification history.

They are not normative authority for new behavior unless they cite a governing specification or addendum.

### A07 Code And Tests

Code and tests are evidence of current implementation.

Code and tests must not be used to rewrite specification meaning during specification cleanup.

If code conflicts with the current authority order, the conflict is an implementation issue unless an explicit specification revision says otherwise.

## Domain-Specific Authority Notes

### Canonical Core Fields

Use Phase00 first.

Then use the owning numbered Phase specification.

Phase-local labels, profiles, modes, statuses, policy settings, diagnostics, and Admin Panel settings must not become Phase00 canonical enums.

### Action Execution And Adapter Handoff

Use Phase04 first.

Use Phase24 and game validator addenda only where game input candidates, approved game input actions, game adapters, or manual approval modes are involved.

Use Adapter architecture documents only as implementation guidance after Phase00 and Phase04 boundaries are preserved.

### Persistence And Memory Commit

Use Phase05, Phase06, and Phase13 first.

Use Phase20, Phase21, and Phase26 for domain-specific relationship candidates, recall references, stream carryover candidates, game memory candidates, media watch candidates, and community memory candidates.

Use PostgreSQL and operator policy addenda for production persistence requirements.

No memory candidate, selected_memory_ids, recall candidate, relationship update candidate, community memory candidate, memory carryover candidate, or next_stream_seed may be committed directly.

### Relationship Behavior

Use Phase20 first.

Then use operator policy decisions, PostgreSQL relationship scale, anime fan relationship rules, and growth/business addenda.

All relationship behavior remains under Phase00, privacy boundaries, candidate validation, and anti-pay-to-rank rules.

Donation amount may influence bounded relationship candidates only under operator-configured policy, caps, moderation checks, safety checks, and approved validation.

Donation amount alone must not create deep friendship, ranking, exclusive treatment, or direct commit.

### Voice, Body, Expression, Language, Camera, And Subtitle

Use Phase16 through Phase19, Phase25, and Phase27 first.

Then use multilingual, original voice, camera/proximity, anime IP, and Admin Panel addenda.

voice_profile, language_profile, speech_rate_profile, subtitle_cue, camera_proximity_profile, body_state, response_mode, laughter_state, habit, game_embodied_state, and similar labels are internal profile or adapter guidance unless a future root-level revision explicitly says otherwise.

They must not become canonical intent, conversation_state, action_type, tone, emotion, character_tag, task_type, or updated_store.

### Admin And Operator Surfaces

Use the Admin Panel addendum first for operator surfaces.

Then use operator policy, original voice, PostgreSQL, anime IP, and growth/business addenda for their specific settings.

Admin Panel surfaces must expose safe summaries, status labels, booleans, counts, configured/missing states, and approved operator settings.

Admin Panel surfaces must not expose secrets, endpoint values, raw comments, support messages, raw candidates, commands, raw frames, raw voice samples, dataset paths, internal model paths, raw jobs, raw SQL, hidden relationship scores, or private viewer data in ordinary views.

Admin Panel actions must not bypass validators, approved schemas, role authorization, explicit confirmation, or audit logging where required.

### Public Reporting And Privacy

Use Phase00 and candidate / commit / execution boundaries first.

Then use Admin Panel, operator policy, original voice, PostgreSQL, anime IP, growth/business, multilingual, and media/copyright addenda.

Public reports, readiness reports, overlay state, replay logs, diagnostics, and public JSON must use safe summaries.

They must not expose raw payloads, secrets, endpoint values, OAuth tokens, raw viewer text, support messages, private viewer IDs, hidden relationship scores, raw memories, candidate payloads, commands, raw frames, raw voice samples, dataset paths, internal model paths, raw SQL, raw jobs, raw story bible text, unreleased plot details, raw animation cuts, voice actor contract text, sponsor negotiation notes, or revenue contracts.

## Non-Canonical Domain Policy

The following are domain-specific policy, internal guidance, adapter guidance, readiness state, review state, or operator setting unless an explicit future root-level revision says otherwise:

donation amount
relationship delta
support tier
membership duration
Admin Panel setting
voice profile
voice source status
language profile
speech rate profile
subtitle cue
camera proximity profile
lifecycle state
fan growth state
anime IP label
canon layer
spoiler release mode
community lore state
business model setting
cost governance status
operator role
moderation state
game control mode
manual approval mode
approved safe adapter mode

These must not become Phase00 canonical enums.

These must not bypass candidate / validator / approved schema boundaries.

These must not directly create world_command, memory commit, relationship commit, game input, OBS command, OS input, or public ranking behavior.

## Exception Duration

No observed cross-phase addendum has an explicit end or sunset condition.

Addenda remain active until a later explicit specification or addendum revokes or supersedes them.

Temporary local, MVP, rehearsal, fixture, and emergency fallback clauses remain limited to those contexts when a later production addendum names a production requirement.

## Conflict Handling

If specifications conflict and no explicit supersession clause resolves the conflict, do not merge, reinterpret, or rewrite the conflict during implementation.

Report the conflict as residual risk.

Implementation work may proceed only when the selected behavior is clearly governed by Phase00, the owning numbered Phase specification, or an explicit domain-specific addendum.

If a conflict affects Phase responsibility, canonical enum, action_type ownership, candidate / commit / execution separation, Source of Truth, or Core / Adapter boundary, stop and report residual risk.

## Unresolved Authority Questions

These questions are non-blocking unless the current task touches the affected area.

U01 Whether IRIS_20240425_cross_phase_addendum_20260430.txt has any specific supersession text not captured in the current high-level extraction.

U02 Whether a formal index should distinguish normative specification, exception/addendum, architecture guidance, and implementation status more explicitly.

U03 Whether broad Phase00-27 addenda should be decomposed by affected surface before large implementation work.

U04 Whether per-spec test ownership should be declared outside scripts/run-tests.js.

## Developer Handling Rule

For ordinary implementation tasks, read this file first.

Then read only the owning Phase specification and the directly relevant domain-specific addendum.

Do not read every Phase specification unless the task explicitly concerns cross-phase authority, route contract, canonical enum ownership, candidate / commit / execution separation, or Source of Truth.

Do not change specifications, docs, reports, routes, names, file layout, or broad abstractions unless explicitly instructed.

For implementation completion, prefer code enforcement, targeted tests, and reproducible evidence over documentation-only changes.