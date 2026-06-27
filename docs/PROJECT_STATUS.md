# IRIS Project Status

## Current Main SHA
- `bbb4eeac9eeda654093973e7492f47af438df5e2`

## Active Harness Version
- Observed active target harness on `origin/main`: v1.2.9 / v129.
- Harness v1.3.0 target files are not installed on current main.
- Classification: `target_v130_not_installed`.

## Open PRs
- PR #240: `DOCS-PROJECT-MEMORY establish IRIS authoritative docs`, open.
- PR #239: `[codex] Install HARNESS v1.3.0 target metadata`, open.
- PR #230: `RUNTIME-FIRST-SLICE-REGISTRATION expose synthetic dispatch`, open.
- PR #135: `[codex] Restore IRIS HTTP post adapter`, draft.

## PR #240 Status
- State: open.
- Current branch head at last documentation update:
  `6fcf4ad52b8c312a5329949ef8e470f12360c265`.
- PR #240 remote quality gate has repeatedly failed without safe artifact.
- Last recorded no-artifact observations include run `28289029548` and run
  `28289312154`.
- Because each docs push can create a new run, run IDs in this file are
  observation history, not current machine authority.
- Current PR metadata must be checked before merge.
- Safe classification: `unknown_no_safe_artifact`.
- Classification remains `unknown_no_safe_artifact` until a safe artifact or
  visible metadata classifier exists.
- Job metadata showed the `quality-gate` job failed with zero exposed step
  summaries, so the failed step could not be identified without raw logs.
- Do not rerun remote CI until the owner explicitly approves a rerun.

## PR #230 Status
- State: open.
- Draft: no.
- Head SHA: `917833709691980adfe52a2ce53ec24eff67b279`.
- Base SHA at PR metadata read: `b5051eae667e568f9b56a3b6dd7fed0141ecdcbe`.
- This docs-only task did not modify, rebase, merge, or inspect raw diff for
  PR #230.

## JSON Store Concurrency Status
- Separate product work exists outside this docs-only task.
- Current main status needs verification before product work resumes.
- Do not mix JSON store product fixes into project-memory documentation work.

## Harness 1.3.0 Migration Status
- User requested pre-migration assessment.
- Current main still reports v1.2.9 / v129 in AGENTS.md and the harness
  manifest.
- The following v130 files are missing on current main:
  - `docs/process/CODEX_V130_SPEC.md`
  - `docs/process/CODEX_V130_POLICY.json`
  - `docs/process/CODEX_V130_SCHEMA.json`
  - `scripts/codex-v130-self-test.mjs`
- PR #239 appears to be the active v1.3.0 target metadata candidate.
- PR #239 head requires `docs/process/CODEX_V130_SPEC.md` through AGENTS.md
  and the active policy index, but that file is not present in the PR head.
- PR #239 classification: `v130_required_spec_missing`.

## Known Blockers
- PR #240 latest remote quality gate failed without safe artifacts:
  `unknown_no_safe_artifact`.
- PR #239 v1.3.0 target metadata is missing required spec file:
  `v130_required_spec_missing`.
- `target_v130_not_installed`.
- GitHub Actions cost-control window: avoid remote CI unless owner explicitly
  approves.
- `priority1` remains BLOCKED.
- Runtime/product readiness remains unproven.

## What Is Not Ready
- Runtime readiness: not claimed.
- Production readiness: not claimed.
- Production go: not performed.
- Real worker, engine, OBS pickup, TTS, Live2D, DB, YouTube, and Game live
  evidence: Needs verification.
- Harness 1.3.0 target migration: not installed on current main.

## Test Status
- Documentation-only local validation passed for this branch before PR #240 was
  opened.
- Full `npm test` is not required for this docs-only task unless a gate proves
  otherwise.

## CI Status
- PR #240 remote quality gate no-artifact run IDs are recorded as observation
  history only.
- Last recorded PR #240 no-artifact observations: `28289029548`,
  `28289312154`.
- Remote CI rerun: not performed.
