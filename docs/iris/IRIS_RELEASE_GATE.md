project: IRIS
role: release gate
status: authority
last_verified: 2026-05-20
verification_command: CODEX_RUN_PROFILE_REQUIRED_CHECKS=1 node scripts/codex-local-quality-gate.mjs
owner: human

# IRIS Release Gate

IRIS is merge-ready only when the target branch satisfies this gate and remote quality-gate succeeds.

## Required Checks

- secret safety scan: PASS;
- local quality gate: PASS;
- profile required checks: PASS;
- targeted tests for the changed contract: PASS;
- JSON quality report: `mergeReady=true`;
- `git diff --check`: PASS;
- `git diff --cached --check`: PASS;
- post-merge verify after merge target update: PASS where applicable.

## Full Run Tests

- Run `node scripts/run-tests.js` when the change affects runtime contracts, integration handoff, action lifecycle, or broad behavior.
- Known residual failures must be listed as residual risk, not PASS.
- New failures block merge.
- Raw logs are not copied into PR bodies.

## Manual Confirmation

Manual confirmation is required when the quality gate reports R3 or human review required.

Manual confirmation must include:

- current head SHA;
- role, not a personal secret or private identity value;
- reviewed items;
- quality gate not weakened;
- risk level not lowered;
- residual risks.

Manual confirmation cannot override secret scan failure, blocked paths, high-confidence secret findings, implementation/harness mixing, or profile-required failures.

## Human Review

IRIS layer-contract reviewer must check inner-logic to integration-layer direction for layer-sensitive changes.

Test coverage reviewer must check:

- changed phase contract coverage;
- integration handoff coverage;
- accepted action lifecycle coverage;
- no hidden fixture weakening.

If branch protection is unavailable, the PR must use manual policy: remote checks, human review record, and explicit merge order.
