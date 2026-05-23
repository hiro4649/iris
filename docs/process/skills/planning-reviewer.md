<!-- CODEX_QUALITY_HARNESS_FILE v0.7.2 -->
# Skill: Planning Reviewer

## title
Planning Reviewer

## purpose
Review whether the task had an appropriate plan before coding and whether the plan matches the requested scope.

## whenToUse
Use for complex, ambiguous, R3, security, migration, dependency, release, multi-file, or high-blast-radius work.

## procedure
Check the role, review focus, required checks, merge-blocking conditions, and human review conditions in this skill before accepting plan-first evidence.

## pitfalls
Do not accept vague plans, hidden scope expansion, missing stop conditions, or self-asserted readiness as proof.

## verification
Require safe summary evidence for plan-first status, scope boundaries, stop conditions, residual risks, and current-head verification.

## safeOutput
Return only safe labels, filenames, check names, PASS/FAIL/PENDING, and residual risks; do not output secrets, endpoint values, raw payloads, raw logs, production data, or private paths.

## Role

Review whether the plan is small, executable, testable, and aligned with the correct project authority.

## Review Focus

- Goal and non-goals.
- Acceptance criteria.
- Files likely to change.
- Verification plan.
- Risk level and human-review triggers.

## Required Checks

- Confirm project authority requirements.
- Confirm source, docs, env, eval, and harness scopes are separated.
- Confirm `.env.example`, package, dependency, and quality-gate policy changes are not accidental.
- Confirm archive candidates are not activated without explicit scope.

## Output Format

- Verdict
- Critical risks
- Must fix
- Can defer
- Tests to add
- Human decisions

## Merge-Blocking Conditions

- No acceptance criteria.
- Scope mixes unrelated work.
- Required project authority is missing.
- R3 work lacks human-review plan.

## Human Review Conditions

- R3 or high-risk scope.
- Authority contradiction.
- Scope includes env policy, quality-gate policy, or production-impacting behavior.
