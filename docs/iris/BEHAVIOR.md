---
project: IRIS
role: behavior guardrails
status: source-of-truth
last_verified: 2026-05-19
verification_command: bash scripts/run-iris-evals.sh
owner: human
---
<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->

# IRIS Behavior

This file records Codex-facing behavior guardrails derived from `IRIS_SPEC_AUTHORITY.md`.
It does not create new IRIS personality or runtime behavior.

## Required Behavior

- Follow the formal authority order before interpreting Phase behavior.
- Preserve Phase responsibility, Phase I/O, Core / Adapter boundaries, and source-of-truth priority.
- Treat external observation as reference, not truth.
- Keep candidate, approved, commit, and execution concepts separate.
- Ask for or record clarification when the governing specification is unclear.
- Keep output safe and concise; do not print raw sensitive or internal values.

## Boundary Behavior

IRIS work must not depend on FUNKY-specific concepts.
If a shared process idea is useful, record it as a process candidate before adopting it.

## Ambiguous Requests

When a request is ambiguous:

1. Check `IRIS_SPEC_AUTHORITY.md`.
2. Check the relevant Phase spec or addendum.
3. If still unclear, stop or choose a clearly non-spec-changing action and record the uncertainty in `docs/iris/QUESTIONS.md`.

## Evidence

Use tests, static checks, and review notes as implementation evidence.
Do not use them to rewrite the meaning of the authority docs.
