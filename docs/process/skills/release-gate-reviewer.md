<!-- CODEX_QUALITY_HARNESS_FILE v0.7.2 -->
# Skill: Release Gate Reviewer

## title
Release Gate Reviewer

## purpose
Review release, merge, and go/no-go evidence against production readiness policy.

## whenToUse
Use for release-like, merge-ready, production-adjacent, R3, security, deployment, or go/no-go claims.

## procedure
Check the role, review focus, required checks, merge-blocking conditions, and human review conditions in this skill before accepting release evidence.

## pitfalls
Do not accept production-ready, merge-ready, release-ready, or go/no-go claims without complete evidence and current-head confirmation.

## verification
Require safe summary evidence for checks, remote quality gate, rollback or merge-after verify, residual risks, and current-head verification.

## safeOutput
Return only safe labels, filenames, check names, PASS/FAIL/PENDING, and residual risks; do not output secrets, endpoint values, raw payloads, raw logs, production data, or private paths.

Review whether this change is safe to merge and operate.

Check:

- Required checks passed.
- Rollback path is practical.
- Monitoring or evidence exists for the touched critical path.
- R3 changes received human approval.
- Known risks are acceptable and documented.
