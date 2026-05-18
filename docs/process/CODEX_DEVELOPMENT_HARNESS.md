<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->
# Codex Development Harness

This document defines the default AI-assisted development flow.

## Flow

1. Write or confirm the short specification.
2. Write acceptance criteria and non-goals.
3. Write the test plan before implementation.
4. Implement the smallest safe change.
5. Run the local quality gate.
6. Review with the relevant skill files under docs/process/skills.
7. Open a PR with risk level, commands, evidence, and rollback plan.
8. Convert escaped bugs into regression tests and update this harness when needed.

## Required spec fields

- Goal
- Non-goals
- Acceptance criteria
- User or operator impact
- Data, permission, and side-effect boundaries
- Test plan
- Rollback plan
- Known risks

## High-risk rule

R3 changes require human approval even if AI review and tests pass.
