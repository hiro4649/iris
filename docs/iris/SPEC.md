---
project: IRIS
role: Codex-facing specification index
status: source-of-truth
last_verified: 2026-05-19
verification_command: bash scripts/lint-iris-docs.sh
owner: human
---
<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->

# IRIS Spec

This file is the Codex-facing IRIS specification index.
It does not replace `IRIS_SPEC_AUTHORITY.md`.

## Formal Authority

`IRIS_SPEC_AUTHORITY.md` is the formal authority for IRIS.
It defines the current specification set, authority order, Phase boundaries, canonical enum rules, Core / Adapter separation, candidate / approved / commit / execution separation, and source-of-truth priority.

## Current Development Goal

IRIS development must improve the existing IRIS behavior without changing the formal specification by accident.
Changes must be small, testable, and anchored to the relevant Phase specification or cross-phase addendum.

## Scope

Codex may work on IRIS source, tests, docs, and harness files only when the task explicitly allows that scope.
IRIS-live2d-renderer is a sibling renderer project and is not the IRIS body.
FUNKY-specific rules are not IRIS authority.

## Non-Goals

- Do not rewrite IRIS personality, behavior, or Phase contracts without formal authority.
- Do not import another project's asset, chain, token, wallet, or transaction rules into IRIS.
- Do not treat README, reports, comments, code, tests, or old notes as specification authority.
- Do not resolve specification conflicts by guessing.

## Conflict Handling

If a task, implementation, or older document conflicts with `IRIS_SPEC_AUTHORITY.md`, stop and record the issue in `docs/iris/QUESTIONS.md`.
Do not silently choose a convenient interpretation.

## Completion Standard

For harness work, run `bash scripts/verify-iris.sh`.
For implementation work, run the smallest relevant tests plus the local quality gate required by the task.
