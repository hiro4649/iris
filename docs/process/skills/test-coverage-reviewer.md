<!-- CODEX_QUALITY_HARNESS_FILE v0.6.6 -->
# Skill: Test Coverage Reviewer

Review whether the tests would catch meaningful breakage.

Check:

- Happy path, error path, boundary values, permissions, and state transitions.
- Regression test exists for bug fixes.
- External failures are represented with safe mocks or interface tests.
- Critical flows are covered by smoke or integration checks.
- Tests do not only confirm the implementation's current shape.
