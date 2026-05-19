---
project: IRIS
role: quality score record
status: source-of-truth
last_verified: 2026-05-19
verification_command: bash scripts/verify-iris.sh
owner: human
---
<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->

# IRIS Quality Score

Target: 100/100 Codex development environment.

## Current Score

Score: 100/100 for the local Codex development environment after PR #8-#11 merge and post-merge closure.

## Dimensions

| Dimension | Status | Notes |
| --- | --- | --- |
| Specification clarity | Strong | Repo-local `IRIS_SPEC_AUTHORITY.md` exists and defines authority order. |
| Behavior consistency | Strong | `docs/iris/BEHAVIOR.md` records non-changing guardrails. |
| Evaluation cases | Improved | Golden and regression case files now exist. |
| Known failures | Improved | Failure log now exists and maps failures to prevention. |
| Regression tests | Pass | Static regression evals exist, and `npm test` passed on 2026-05-19. |
| Prompt stability | Improved | `docs/iris/PROMPT_RULES.md` defines Codex behavior. |
| FUNKY separation | Improved | Boundary script and regression case check separation. |
| Implementation alignment | Pass | Runtime/test mismatches were repaired and merged through separated PRs. |
| Windows verification entry | Improved | `node scripts/verify-iris.mjs` avoids the Windows WSL `bash` launcher. |
| Unverified risk | Tracked | Env sample reflection is intentionally deferred to `docs/iris/ENV_POLICY_DECISION.md`. |

## Latest Local Gate State

- `npm test`: PASS, 454 tests.
- `.env.example`: unchanged.
- Blocked path: resolved.
- Mixed scope: resolved by PR split and merge.
- High-risk source changes: reviewed and merged in source repair PR.
- `mergeReady`: true.
- `riskLevel`: R1 in the clean post-merge worktree.
- Env policy: do not reflect proposed names into `.env.example` now.

## Conditions For 100/100

- `bash scripts/verify-iris.sh` passes.
- The local quality gate passes without policy exception.
- `npm test` passes.
- `node scripts/verify-iris.mjs` passes on Windows.
- Runtime eval scope is either implemented or explicitly deferred.
- The broad current diff is split or otherwise made policy-compliant by human direction.
