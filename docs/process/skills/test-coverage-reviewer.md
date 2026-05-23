<!-- CODEX_QUALITY_HARNESS_FILE v0.7.2 -->
# Skill: Test Coverage Reviewer

## title
Test Coverage Reviewer

## purpose
Review whether tests and verification evidence match the risk and changed behavior.

## whenToUse
Use for implementation, behavior, R3, security, release, multi-file, dependency, or regression-prone changes.

## procedure
Check the role, review focus, required checks, merge-blocking conditions, and human review conditions in this skill before accepting test evidence.

## pitfalls
Do not accept missing tests, skipped checks without reason, weakened assertions, or self-asserted readiness as proof.

## verification
Require safe summary evidence for command, result, exit code or pass/fail, skipped-check reason, residual risks, and current-head verification.

## safeOutput
Return only safe labels, filenames, check names, PASS/FAIL/PENDING, and residual risks; do not output secrets, endpoint values, raw payloads, raw logs, production data, or private paths.

## Role

Review whether the test plan and final tests would catch meaningful breakage.

## Review Focus

- Happy path, error path, boundary values, permissions, and state transitions.
- Regression test exists for bug fixes.
- External failures are represented with safe mocks or contract tests.
- Critical flows are covered by smoke or integration checks.
- Tests do not only confirm the implementation's current shape.
- `regression_cases.yaml` additions are identified when recurrence risk exists.

## Required Checks

- Confirm the test plan was written before implementation.
- Confirm added tests match acceptance criteria.
- Confirm existing tests that cover the change are named.
- Confirm unverified risks are recorded.
- Confirm skipped, todo, or deleted tests are not used to pass.

## Output Format

- Verdict
- Critical risks
- Must fix
- Can defer
- Tests to add
- Human decisions

## Merge-Blocking Conditions

- No test plan for implementation work.
- Required happy path, error path, boundary, permission, state, regression, external failure, or smoke coverage is missing without risk acceptance.
- Failed tests are hidden by skips, todos, deletion, or weakened assertions.

## Human Review Conditions

- R3 test gaps.
- External system risk cannot be simulated locally.
- Coverage tradeoff requires product or security judgment.
