<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->
# Release Gate

This document is the formal release gate for IRIS. Do not create a separate
`IRIS_RELEASE_GATE.md`; the existing `docs/process/RELEASE_GATE.md` is formally
adopted. This release gate is not a document for declaring production ready; it
prevents production ready misdeclarations.

Before merge or deploy, confirm:

- The risk level is correct.
- Required checks passed or failures are explicitly documented.
- The PR has a rollback plan.
- R3 changes have human approval.
- Secret scan passed.
- The change does not include unrelated refactoring.
- Known risks are acceptable.

After release, monitor the critical user or operator flow touched by the PR.

## IRIS Gate

This gate prevents IRIS from being misdeclared production ready. Phase00 remains
the root authority: Core/Adapter boundaries, Phase04 action ownership,
candidate/approved/commit/execution separation, Source of Truth priority, and
safe summary output rules must hold.

Merge or release is allowed only when all applicable items hold:

- `git status --short` is clean.
- `node scripts/codex-secret-safety-scan.mjs` passes.
- `node scripts/codex-local-quality-gate.mjs` passes.
- `CODEX_RUN_PROFILE_REQUIRED_CHECKS=1 node scripts/codex-local-quality-gate.mjs` passes.
- `npm run dev:production:probe` passes.
- `git diff --check` passes.
- Target Node verification passes.
- No readiness sweetening is introduced.
- `production_ready_allowed=false` is maintained.
- `go_no_go=no_go` is maintained.
- No secrets, raw values, or endpoint values leak.
- Fixtures and local bridges are not treated as real-ready evidence.

Production ready is prohibited while any of these remain true:

- YouTube real API evidence is missing.
- OBS real setup evidence is missing.
- Live2D or TTS real runtime evidence is missing.
- Game real input, operator approval, or emergency stop evidence is missing.
- Vision real capture or operator review evidence is missing.
- PostgreSQL real database, migration, or backup evidence is missing.
- Admin owner/operator/private runner confirmation is missing.
- Media or external topic configuration is missing.

Full run-tests policy:

- A full run-tests pass is strong release-gate evidence.
- If full run-tests is unrun or has remaining failures, production release is
  prohibited.
- Small no-go-maintaining changes, including docs-only changes, safe preflight,
  safe summary, manifest guard, and external blocked label additions, may remain
  merge candidates only when target Node verification and Harness gates pass,
  remaining failures are unrelated to the diff or fully classified, and
  `production_ready_allowed=false` plus `go_no_go=no_go` are maintained.
- Remaining failures must never be treated as pass.
- Remaining failures must be classified as one of:
  `contract_error`, `type_error`, `assertion_failed`,
  `external_real_evidence_blocked`, `operator_review_required`,
  `local_capability_mismatch`, or `legacy_or_unknown`.
- If `contract_error` or `type_error` is caused by the current diff, merge is
  blocked.
- If `assertion_failed` is caused by the current diff, merge is blocked.
- `external_real_evidence_blocked` and `operator_review_required` remain
  production no-go labels.
- A PR with remaining full run-tests failures must state the failure
  classification, relation to the current diff, and production no-go
  maintenance.
- Do not declare production ready, release ready, or go while full run-tests has
  remaining failures.

Harness 0.6.5 baseline:

- Basic required checks are secret-safety-scan, local-quality-gate, required
  profile, dev-production-probe, and git diff check.
- Do not make full run-tests or whole npm test automatically required for every
  small no-go-maintaining change.
- Do not make external real connections automatically required.
- Do not use redirect-captured full run-tests; use the safe summary pipeline
  when full-run evidence is needed.

Release decision labels:

- `merge_candidate`
- `merge_blocked`
- `production_no_go`
- `external_evidence_waiting`
- `operator_review_required`
- `owner_confirmation_required`
- `fixture_only`
- `local_rehearsal_only`

Current final decision: maintain `production_ready_allowed=false` and
`go_no_go=no_go`.
