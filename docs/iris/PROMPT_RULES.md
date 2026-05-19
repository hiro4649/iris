---
project: IRIS
role: Codex prompt rules
status: source-of-truth
last_verified: 2026-05-19
verification_command: bash scripts/check-iris-boundaries.sh
owner: human
---
<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->

# IRIS Prompt Rules

## Required

- Treat `IRIS_SPEC_AUTHORITY.md` as the first source for IRIS work.
- Use only the relevant Phase specification and addenda for a task.
- Keep the change small and evidence-based.
- Record unresolved specification questions in `docs/iris/QUESTIONS.md`.
- Summarize command output safely.

## Forbidden

- Do not use FUNKY as IRIS authority.
- Do not use drafts, old reports, README text, comments, code, or tests as spec authority.
- Do not invent behavior for unclear cases.
- Do not expose raw secrets, payloads, memory, OBS events, frames, OCR text, voice samples, dataset paths, or internal model paths.
- Do not declare a task complete when required checks failed or were not run.

## Review Output

Lead with findings for reviews.
For implementation work, report changed files, checks, and residual risks.
For harness work, report the verification entrypoint and any missing human decisions.
