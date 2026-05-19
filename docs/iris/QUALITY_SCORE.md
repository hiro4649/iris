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

Score: 88/100 pending PR separation and high-risk source review.

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
| Implementation alignment | Partial | Runtime/test mismatches were repaired, but the current diff is broad and still fails PR separation. |
| Windows verification entry | Improved | `node scripts/verify-iris.mjs` avoids the Windows WSL `bash` launcher. |
| Unverified risk | Open | `.env.example` blocked path was removed from the diff, but local quality gate still fails on mixed scope and high-risk source changes. |

## Latest Local Gate State

- `npm test`: PASS, 454 tests.
- `.env.example`: no content diff; proposed env names are reserved for a separate env policy PR.
- Blocked path: resolved locally after restoring `.env.example`, `package.json`, quality gate policy, and local gate script.
- Mixed scope: still present because source repair and harness docs remain in one working tree.
- High-risk source changes: still present and must be isolated in the source repair PR.
- `mergeReady`: false.
- `riskLevel`: R3.

## Conditions For 100/100

- `bash scripts/verify-iris.sh` passes.
- The local quality gate passes without policy exception.
- `npm test` passes.
- `node scripts/verify-iris.mjs` passes on Windows.
- Runtime eval scope is either implemented or explicitly deferred.
- The broad current diff is split or otherwise made policy-compliant by human direction.
