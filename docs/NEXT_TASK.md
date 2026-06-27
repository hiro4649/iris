# IRIS Next Task

## Highest-Priority Next Task
Complete local-first v1.3.0 target coherence review and keep PR #240 and
PR #239 merge-blocked until artifact evidence or owner no-artifact exception
exists.

## Required Files
- `AGENTS.md`
- `docs/process/CODEX_HARNESS_MANIFEST.json`
- `docs/process/CODEX_ACTIVE_POLICY_INDEX.json`
- `docs/process/CODEX_V129_SPEC.md`
- `docs/PROJECT_SPEC.md`
- `docs/PROJECT_STATUS.md`
- `docs/NEXT_TASK.md`
- `docs/CHANGELOG.md`

## Allowed Files
- Documentation and safe harness metadata required to assess v1.3.0 target
  migration.
- Project-memory docs under `docs/`.

## Forbidden Files
- `src/**`
- `apps/**`
- `contracts/**`
- package files
- lockfiles
- `.github/workflows/**`
- runtime product files
- PR #230 branch contents

## Implementation Strategy
1. Treat current main as authoritative until v1.3.0 files are merged.
2. Keep PR #240 merge-blocked while remote quality gate has no safe artifact
   unless the owner gives an explicit current-head no-artifact exception.
3. Keep PR #239 merge-blocked while remote quality gate has no safe artifact
   unless the owner gives an explicit current-head Harness no-artifact
   exception.
4. Use local validation for development and review support only, not merge
   authority.
5. Keep product runtime and PR #230 separate.
6. Run local docs/harness validation before any push or PR update.

## Expected Risks
- Confusing user-requested Harness 1.3.0 with installed target state.
- Merging PR #239 while its required v1.3.0 spec file is missing.
- Rerunning PR #240 remote quality gate without a safe-artifact root cause.
- Treating volatile run IDs in project-memory docs as current machine
  authority.
- Accidentally mixing PR #230 runtime work with docs/harness migration work.
- Triggering unnecessary GitHub Actions during the cost-control window.
- Treating PR body or stale evidence as machine authority.

## Validation
- `git diff --check`
- `node scripts/codex-secret-safety-scan.mjs`
- `node scripts/codex-v129-self-test.mjs`
- `node scripts/codex-v128-self-test.mjs`
- `node scripts/codex-v127-self-test.mjs`
- Do not run full `npm test` for docs-only work unless a gate proves it is
  required.

## Stop Conditions
- Any runtime, package, lockfile, or workflow file becomes dirty.
- v1.3.0 files are assumed installed without repository evidence.
- PR #239 is proposed for merge while `CODEX_V130_SPEC.md` is missing.
- PR #240 requires remote rerun but owner approval has not been given.
- Raw logs or raw PR diffs become necessary.
- Remote CI is needed but owner approval has not been obtained.
- Any validation failure cannot be classified from safe summaries.

## Estimated Complexity
- Medium.
- The work is primarily migration assessment and authority reconciliation, not
  product implementation.
