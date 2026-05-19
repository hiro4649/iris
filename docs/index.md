---
project: IRIS
role: documentation index
status: source-of-truth
last_verified: 2026-05-19
verification_command: bash scripts/lint-iris-docs.sh
owner: human
---
<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->

# IRIS Documentation Index

## Authority

1. `IRIS_SPEC_AUTHORITY.md`
2. `docs/iris/SPEC.md`
3. `docs/iris/BEHAVIOR.md`
4. `docs/iris/PROMPT_RULES.md`
5. `docs/iris/EVALS.md`
6. `docs/iris/FAILURES.md`
7. `docs/iris/QUALITY_SCORE.md`
8. `docs/iris/ENV_POLICY_DECISION.md`
9. `docs/iris/QUESTIONS.md`

`IRIS_SPEC_AUTHORITY.md` at the repository root is the formal IRIS specification authority.
The workspace-level path `C:\Users\HIRO-001\Documents\IRIS_SPEC_AUTHORITY.md` is not authoritative for this repository.
The clone directory name is not authoritative for the harness version.
The files under `docs/iris/` organize Codex development work and must not rewrite that authority.

## Process

- Use `bash scripts/verify-iris.sh` as the project-level Codex verification entrypoint.
- On Windows, use `node scripts/verify-iris.mjs` to avoid depending on the WSL `bash` launcher.
- Use `bash scripts/lint-iris-docs.sh` after IRIS markdown changes.
- Use `bash scripts/check-iris-boundaries.sh` to detect IRIS / FUNKY mixing.
- Use `bash scripts/run-iris-evals.sh` to run the lightweight golden and regression case checks.

## Reports

Generated local reports belong under `reports/iris/`.
Do not commit raw logs, secrets, payloads, or environment values.
