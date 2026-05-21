project: IRIS
role: runtime operation runbook
status: authority
last_verified: 2026-05-20
verification_command: node scripts/codex-local-quality-gate.mjs
owner: human

# IRIS Runtime Operation Runbook

Use a clean clone or an explicit PR branch. Do not use a dirty worktree as the development baseline.

## Authority

- The repo-local `IRIS_SPEC_AUTHORITY.md` is the IRIS authority.
- The old external absolute-path authority is deprecated and historical only.
- Do not create an external authority mirror unless the owner explicitly approves it.
- When repo-local `IRIS_SPEC_AUTHORITY.md` exists, the missing external authority path is not an active repository residual and does not need routine completion-report repetition.
- Do not use old README files, reports, comments, or launch notes as higher authority.

## Runtime Layer Contracts

- Keep phase responsibility explicit.
- Keep phase input and output contracts stable.
- Preserve one-way direction from inner logic to integration contracts.
- Inner logic must not depend on server, runtime bridge, renderer, or integration details.
- Integration-specific handling belongs in the integration layer.
- Runtime bridge behavior must be treated as layer-contract sensitive.

## Action Lifecycle

- Keep proposal, reviewer-accepted, persistence, and runtime-operation states separate.
- Do not treat a proposal as reviewer-accepted.
- Do not operate from unreviewed proposal output.
- Do not generate a world command field from IRIS unless the active authority explicitly allows it.
- Outside inputs are reference-only unless an accepted phase contract says otherwise.

## Safe Operation

- Distinguish mock, real, and runtime bridge paths.
- Use sanitized summaries for runtime failures.
- Do not expose secret values, endpoint values, API keys, tokens, raw payloads, raw memory, raw logs, or DB connection information.
- Do not make production or deployment claims from local checks.

## Dirty Worktree Rule

If a worktree is dirty:

- inspect and classify the diff first;
- do not reset, restore, clean, or stash unconfirmed work;
- use a clean clone or fresh branch for new Codex work;
- record residual risk if the dirty worktree cannot be classified.
