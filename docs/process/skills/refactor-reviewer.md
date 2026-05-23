<!-- CODEX_QUALITY_HARNESS_FILE v0.7.2 -->
# Skill: Refactor Reviewer

## title
Refactor Reviewer

## purpose
Review refactors for behavior preservation, scoped movement, and non-weakening verification.

## whenToUse
Use for refactors, file moves, architecture cleanup, multi-file changes, or behavior-preserving claims.

## procedure
Check the role, review focus, required checks, merge-blocking conditions, and human review conditions in this skill before accepting refactor evidence.

## pitfalls
Do not accept behavior-preserving claims without tests, scope proof, rollback or stop conditions, and residual risks.

## verification
Require safe summary evidence for preserved behavior, changed files, relevant tests, residual risks, and current-head verification.

## safeOutput
Return only safe labels, filenames, check names, PASS/FAIL/PENDING, and residual risks; do not output secrets, endpoint values, raw payloads, raw logs, production data, or private paths.

## Role

Review whether refactor work is small, behavior-preserving, and separated from unrelated changes.

## Review Focus

- One responsibility per PR.
- Source, docs, eval, harness, and env policy are not mixed.
- Characterization tests cover unclear behavior.
- Verify and quality-gate results are compared before and after.
- Failure learnings are added to `FAILURES.md` and regression cases.

## Required Checks

- Confirm no hidden behavior change.
- Confirm no broad rename, movement, dependency update, or abstraction without explicit scope.
- Confirm tests pass before and after.
- Confirm R3 changes have human review.

## Output Format

- Verdict
- Critical risks
- Must fix
- Can defer
- Tests to add
- Human decisions

## Merge-Blocking Conditions

- Refactor hides behavior change.
- Refactor mixes source with docs, eval, harness, or env policy without explicit scope.
- Verify or quality gate regresses.
- R3 refactor lacks human review.

## Human Review Conditions

- R3 refactor.
- Public contract or boundary movement.
- Large rename or file movement.
