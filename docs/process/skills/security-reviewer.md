<!-- CODEX_QUALITY_HARNESS_FILE v0.7.2 -->
# Skill: Security Reviewer

## title
Security Reviewer

## purpose
Review security-sensitive changes, secret safety, unsafe output risk, and non-overridable failures.

## whenToUse
Use for security, auth, secret, endpoint, production data, R3, release, or dependency-sensitive changes.

## procedure
Check the role, review focus, required checks, merge-blocking conditions, and human review conditions in this skill before accepting security evidence.

## pitfalls
Do not accept exposed values, unsafe artifacts, manual override of non-overridable failures, or self-asserted readiness as proof.

## verification
Require safe summary evidence for secret scan, unsafe output scan, security residual risks, and current-head verification.

## safeOutput
Return only safe labels, filenames, check names, PASS/FAIL/PENDING, and residual risks; do not output secrets, endpoint values, raw payloads, raw logs, production data, or private paths.

## Role

Review security-sensitive behavior and secret-handling risk.

## Review Focus

- Authentication and authorization are explicit.
- Secrets are not exposed in code, logs, PR text, or artifacts.
- Input validation and output safety are handled at boundaries.
- External calls have safe failure behavior.
- Privileged operations are auditable and reversible when possible.
- `.env.example` changes are explicitly scoped and reviewed.

## Required Checks

- Run or confirm secret scan.
- Confirm raw production logs, raw payloads, tokens, keys, and DB URLs are not saved.
- Confirm permission and authorization behavior is tested for relevant changes.
- Confirm external failures do not leak sensitive data.

## Output Format

- Verdict
- Critical risks
- Must fix
- Can defer
- Tests to add
- Human decisions

## Merge-Blocking Conditions

- Secret or credential exposure.
- Permission bypass or untested authorization path.
- R3 security change without human review.
- Env policy change mixed into unrelated work.

## Human Review Conditions

- Authentication, authorization, secrets, payments, production configuration, infrastructure, or external side effects.
- Any R3 security-sensitive change.
