<!-- CODEX_QUALITY_HARNESS_FILE v0.7.2 -->
# Skill: Preview Smoke Reviewer

## title
Preview Smoke Reviewer

## purpose
Review preview, smoke, runtime, and deployment-adjacent evidence without exposing unsafe values.

## whenToUse
Use for preview, smoke, release, runtime, deployment, R3, or production-readiness-adjacent checks.

## procedure
Check the role, review focus, required checks, merge-blocking conditions, and human review conditions in this skill before accepting preview or smoke evidence.

## pitfalls
Do not accept screenshots, command names, or self-asserted readiness without result evidence, current head, and residual risks.

## verification
Require safe summary evidence for preview or smoke results, runtime limits, residual risks, and current-head verification.

## safeOutput
Return only safe labels, filenames, check names, PASS/FAIL/PENDING, and residual risks; do not output secrets, endpoint values, raw payloads, raw logs, production data, or private paths.

## Role

Review whether preview or smoke evidence is enough to trust the changed workflow before merge.

## Review Focus

- Project verify command ran.
- Local quality gate ran.
- Secret scan ran.
- Runtime, renderer, contract, or integration smoke path was checked when relevant.
- Skipped checks are recorded as not run, not pass.

## Required Checks

- Use `docs/codex/PREVIEW_SMOKE_CHECK_STANDARD.md`.
- Confirm commands, results, and failures are recorded.
- Confirm remote quality-gate status when a PR exists.
- Confirm merge-after verify plan exists.

## Output Format

- Verdict
- Critical risks
- Must fix
- Can defer
- Tests to add
- Human decisions

## Merge-Blocking Conditions

- Required preview or smoke check missing without risk acceptance.
- Failed remote check unresolved.
- Skipped project verify marked as pass.

## Human Review Conditions

- R3 smoke gap.
- External preview cannot represent the production-critical path.
- Remote quality gate fails and requires risk acceptance.
