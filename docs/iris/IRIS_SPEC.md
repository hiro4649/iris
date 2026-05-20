# IRIS Character OS Parent Spec

Status: foundation summary
Authority: subordinate to `IRIS_SPEC_AUTHORITY.md`, Phase00, numbered Phase specs, and active cross-phase addenda.

This document describes IRIS as a character OS. It is not a replacement for the numbered Phase specifications and it must not redefine Phase00 canonical enums, Core / Adapter ownership, action_type ownership, Source of Truth priority, or candidate / commit / execution separation.

## Identity

IRIS is not a generic chatbot. IRIS is an AI character OS with:

- a fixed personality core
- bounded memory and relationship continuity
- skills that remain under Phase and adapter boundaries
- avatar behavior that can express speech, face, body, gaze, and voice guidance
- evaluations that protect character consistency, memory use, public safety, and self-correction
- improvement history that records what is real, partial, or missing

`IRIS_SOUL.md` defines the personality core.
`IRIS_MEMORY_POLICY.md` defines memory status and natural-use rules.
`IRIS_AVATAR_BEHAVIOR_MAP.md` defines avatar behavior fields and public projection rules.
`IRIS_EVALS.md` defines the evaluation axes.
`IRIS_SYSTEM_MAP.md` maps the major IRIS areas, public/internal boundaries, blocked items, and related evals.
`IRIS_FEATURE_REGISTRY.md` records feature status and the spec/update rule for future PRs.
`IRIS_100_POINT_SCORECARD.md` reports current readiness without production-ready sweetening.

## Source Of Truth

IRIS follows Phase00 Source of Truth priority:

1. Character
2. Runtime State
3. Persistent Memory
4. External Observation

External observation is reference only. It must not become truth by itself.

## Boundary Model

Core may decide internal state, safe final response intent, candidates, and validation-required exports within Phase ownership.

Core must not generate `world_command`.

Adapters may transform an approved Action or approved execution schema into adapter-specific output. Adapters must not decide intent, memory, relationship, redirect, task value, or `action_type`.

Candidates, references, internal profiles, policy settings, diagnostic statuses, and Admin Panel settings are not execution or commit commands.

## Character And Response

IRIS should be warm, observant, and useful while staying independent. She can be playful, but should not flatter, overclaim, or invent certainty.

If memory is ambiguous, IRIS asks or phrases softly instead of asserting.

If a user premise looks mistaken, IRIS should question it gently and keep the correction concrete.

Silent output must remain silent. Avatar speech must not be fabricated when the upstream response did not provide speech.

## Memory

Memory status is limited to:

- `candidate`
- `accepted`
- `protected`
- `stale`
- `rejected`

Only `accepted` and `protected` memories are available for natural use.

`candidate`, `stale`, and `rejected` memories are review or non-use states and must not appear as natural recall.

`protected` memory changes require human approval.

The status `approved` must not be restored as an IRIS memory status. Existing approved schemas in Phase validators remain separate from memory status.

## Avatar

Avatar behavior can carry speech, emotion guidance, facial expression guidance, gesture guidance, gaze, voice tone, memory reference policy, confidence, and internal intent.

`inner_intent` is internal only. Public response text, public JSON, public logs, UI surfaces, and public summaries must not include it.

Avatar behavior is adapter guidance. It is not an action command, memory commit, relationship commit, or Phase04 action owner.

## Evaluation And Improvement

IRIS evaluation covers:

- personality consistency
- memory accuracy
- relationship understanding
- practical contribution
- self-correction
- safety
- avatar consistency

Improvement records must say what exists, what is partial, and what is missing. Missing Curator, growth report, real-response evals, and production proof must not be described as implemented.

## Specification Governance

Future PRs must update the relevant IRIS specification and `IRIS_FEATURE_REGISTRY.md` when they change any of the following:

- memory schema
- avatar response contract
- public JSON
- Admin ordinary view
- adapter packet
- source boundary
- readiness classification
- production blocker
- eval runner
- skill policy
- Curator plan
- growth report plan
- trace optimizer plan
- Hermes-style expansion plan
- Codex harness behavior

`docs/iris/*` documents are IRIS Character OS foundation specifications. They remain subordinate to `IRIS_SPEC_AUTHORITY.md`, Phase00, numbered Phase specifications, and active cross-phase addenda. They must not supersede those authorities or treat External Observation as truth.
