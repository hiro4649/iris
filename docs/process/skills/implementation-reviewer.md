<!-- CODEX_QUALITY_HARNESS_FILE v0.7.2 -->
# Skill: Implementation Reviewer

## title
Implementation Reviewer

## purpose
Review implementation changes for correctness, scoped behavior, regression risk, and verification quality.

## whenToUse
Use for implementation, R3, security, release, multi-file, migration, dependency, or behavior-changing work.

## procedure
Check the role, review focus, required checks, merge-blocking conditions, and human review conditions in this skill before accepting implementation evidence.

## pitfalls
Do not accept broad refactors, missing tests, hidden behavior changes, or self-asserted readiness as proof.

## verification
Require safe summary evidence for changed behavior, relevant tests, residual risks, and current-head verification.

## safeOutput
Return only safe labels, filenames, check names, PASS/FAIL/PENDING, and residual risks; do not output secrets, endpoint values, raw payloads, raw logs, production data, or private paths.

## Role

Review the implementation for minimality, correctness, maintainability, and fit with existing project patterns.

## Review Focus

- The diff is limited to the stated scope.
- No unrelated refactor, rename, or dependency change is mixed in.
- Errors are handled without hiding failures.
- Data validation is close to the boundary.
- The code follows existing project patterns.
- Source, docs, env, eval, and harness changes are not mixed unless explicitly scoped.

## Required Checks

- Confirm no source changes are present for docs-only work.
- Confirm no `.env.example` or package changes are present unless explicitly scoped.
- Confirm no quality-gate policy weakening.
- Confirm no archive candidates are activated without explicit scope.
- Confirm failures are surfaced rather than swallowed.

## Output Format

- Verdict
- Critical risks
- Must fix
- Can defer
- Tests to add
- Human decisions

## Merge-Blocking Conditions

- Diff includes unrelated files or hidden behavior changes.
- Boundary validation is moved to the wrong layer.
- Failure handling hides errors.
- Quality gate, verify, or test policy is weakened.

## Human Review Conditions

- R3 source change.
- Large refactor or file movement.
- Public contract, adapter handoff, or runtime normalization changes.
