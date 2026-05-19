---
project: IRIS
role: Codex entrypoint and permanent repo rules
status: source-of-truth
last_verified: 2026-05-19
verification_command: bash scripts/verify-iris.sh
owner: human
---
<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->

# AGENTS.md

This repository is for IRIS only.
Do not use FUNKY, other repositories, old projects, or unrelated specs as IRIS authority.

## Read First

Before IRIS work, read these files in order:

1. `IRIS_SPEC_AUTHORITY.md`
2. `docs/index.md`
3. `docs/iris/SPEC.md`
4. `docs/iris/BEHAVIOR.md`
5. `docs/iris/EVALS.md`
6. `docs/iris/FAILURES.md`
7. `docs/iris/QUESTIONS.md`
8. `docs/iris/QUALITY_SCORE.md`
9. `docs/iris/PROMPT_RULES.md`

`IRIS_SPEC_AUTHORITY.md` at this repository root remains the formal specification authority.
Do not use `C:\Users\HIRO-001\Documents\IRIS_SPEC_AUTHORITY.md` or the clone directory name as authority.
If `docs/iris/*` conflicts with it, stop and record the conflict in `docs/iris/QUESTIONS.md`.

## Permanent Rules

- Keep changes small and scoped to one purpose.
- Do not expose, create, save, or commit secrets, API keys, private keys, DB URLs, JWTs, cookies, Authorization headers, raw env, raw logs, raw payloads, raw memory, raw OBS events, raw frames, OCR text, voice samples, dataset paths, or internal model paths.
- Do not mix FUNKY-specific behavior, assets, BSC, NFT, wallet, token, or transaction rules into IRIS.
- Do not use code, tests, README, reports, comments, or old notes to rewrite specification meaning.
- Do not change Phase ownership, I/O contracts, Core / Adapter boundaries, candidate / approved / commit / execution separation, or canonical enums unless the formal authority explicitly allows it.
- Do not use policy exceptions unless explicitly approved by a human.

## Completion Commands

Run the smallest relevant checks for the task.
For IRIS harness or cross-cutting work, run:

```bash
bash scripts/verify-iris.sh
```

On Windows, prefer the Node wrapper so the check does not depend on Windows' WSL `bash` launcher:

```bash
node scripts/verify-iris.mjs
```

For PR-ready evidence, also run:

```bash
node scripts/codex-secret-safety-scan.mjs
node scripts/codex-local-quality-gate.mjs
CODEX_RUN_PROFILE_REQUIRED_CHECKS=1 node scripts/codex-local-quality-gate.mjs
CODEX_QUALITY_REPORT=json node scripts/codex-local-quality-gate.mjs
git diff --check
git diff --cached --check
```

Report changed files, successful checks, failed checks, and residual risks.
