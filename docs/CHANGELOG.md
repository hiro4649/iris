# IRIS Changelog

## 2026-06-27
- Established authoritative project-memory documentation:
  - `docs/PROJECT_SPEC.md`
  - `docs/PROJECT_STATUS.md`
  - `docs/NEXT_TASK.md`
  - `docs/CHANGELOG.md`
- Recorded v1.2.8 rollout on main via PR #235.
- Recorded v1.2.9 rollout on main via PR #236.
- Recorded main workflow/artifact head binding repair on main via PR #237.
- Recorded current main SHA `bbb4eeac9eeda654093973e7492f47af438df5e2`.
- Recorded that Harness v1.3.0 target files are missing from current main and
  classified the state as `target_v130_not_installed`.
- Recorded PR #239 as the open v1.3.0 target metadata candidate.
- Recorded PR #230 as pending and intentionally untouched by this docs-only
  project-memory task.
- Recorded PR #240 latest same-head remote quality-gate failure:
  `unknown_no_safe_artifact`, safe artifact absent, no rerun performed.
- Recorded PR #239 v1.3.0 spec gap: `docs/process/CODEX_V130_SPEC.md` is
  required by AGENTS.md and active policy but absent from the PR head.
