<!-- CODEX_QUALITY_HARNESS_FILE v0.7.2 -->
# Skill: Spec Reviewer

## title
Spec Reviewer

## purpose
Review whether changes preserve applicable authority, specification, and policy contracts.

## whenToUse
Use for spec-adjacent, authority-bound, contract, R3, security, release, or multi-file changes.

## procedure
Check the role, review focus, required checks, merge-blocking conditions, and human review conditions in this skill before accepting spec evidence.

## pitfalls
Do not accept old docs, comments, reports, hidden spec changes, or self-asserted readiness as proof.

## verification
Require safe summary evidence for the relevant authority, changed contracts, residual risks, and current-head verification.

## safeOutput
Return only safe labels, filenames, check names, PASS/FAIL/PENDING, and residual risks; do not output secrets, endpoint values, raw payloads, raw logs, production data, or private paths.

## Role

Review whether the proposed change solves the right problem and stays aligned with the active project authority.

## Review Focus

- Goal and non-goals are explicit.
- Acceptance criteria are testable.
- Permissions, data boundaries, and side effects are defined.
- Ambiguous assumptions are documented.
- The implementation plan is smaller than the problem statement.
- Project-specific authority was checked when project behavior or source changes.
- HARNESS workflow-only work does not require `IRIS_SPEC_AUTHORITY.md`.

## Required Checks

- Confirm the target project and risk level.
- Confirm the source-of-truth from `docs/process/CODEX_PROJECT_AUTHORITY_REGISTRY.json`.
- Check for contradictions with stated specs, change plans, or acceptance criteria.
- Check that `.env.example` or env policy changes are explicitly scoped.

## Output Format

- Verdict
- Critical risks
- Must fix
- Can defer
- Tests to add
- Human decisions

## Merge-Blocking Conditions

- Missing or contradictory acceptance criteria.
- Project authority required but not checked.
- Spec change hidden inside refactor or docs-only scope.
- R3 change without human-review plan.

## Human Review Conditions

- R3 or high-risk behavior changes.
- Unresolved authority contradiction.
- Product or operator impact not covered by acceptance criteria.
