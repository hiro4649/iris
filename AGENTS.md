# AGENTS.md

## IRIS Authority Boundary

???????AGENTS???????????????IRIS_SPEC_AUTHORITY.md???????????????????????

For IRIS product behavior, specifications, phase rules, or runtime changes,
use `IRIS_SPEC_AUTHORITY.md` as the canonical authority. If the authority file
is missing, ambiguous, or conflicts with the task, stop and report the risk
instead of inventing rules.

Harness-only work must stay in harness-managed files. Do not modify IRIS
product source, tests, specs, package files, lockfiles, runtime files, or
`scripts/run-tests.js` unless the project owner explicitly requests product
work and required verification evidence is available.
<!-- CODEX_QUALITY_HARNESS_BEGIN -->
CODEX_QUALITY_HARNESS_FILE v0.9.5

## Codex Target Harness Boundary

This target repository consumes Codex Development Harness v0.9.5 through
`docs/process/CODEX_HARNESS_MANIFEST.json`; do not copy or create
`CODEX_SOURCE_HARNESS_MANIFEST.json` here. Keep product authority outside this
block intact.

## Target Doctrine And Skill Routing

Keep AGENTS.md compact: doctrine, routing map, and links only. Put detailed
policy in `docs/process`. Load only task-needed skills, normally four or fewer
and never more than five. Use `docs/process/CODEX_AGENTS_DOCTRINE_POLICY.md`,
`docs/process/CODEX_SKILL_ROUTING_POLICY.md`,
`docs/process/CODEX_SUBAGENT_GOVERNANCE_POLICY.md`, and related v0.9.5 files
for detailed rules.

## Target Safety Rules

Harness-only work must stay in harness-managed files. Do not modify product
source, product tests, runtime assets, package files, lockfiles, profiles, or
product config not owned by harness unless the project owner explicitly requests
product work and required verification evidence is available.

Maintain the source harness boundary and profile/core separation. Use a
plan-first workflow for nontrivial work, keep safe output in evidence artifacts,
and require manual confirmation before any merge-ready claim. Do not print raw logs.
Manual confirmation cannot override non-overridable failures.

Run target quality gates with `CODEX_HARNESS_MODE=target`,
`CODEX_PROFILE_COMPAT_MODE=off`, and `CODEX_QUALITY_REPORT=json`. Preserve target
hotfixes and target-specific adaptations during rollout. Require same-head
evidence for PR evidence, manual confirmation, remote runs, artifact summaries,
and product-relevant PR context.

Do not treat targetQualityScoreStatus or a passing harness gate as product
runtime readiness. Fixture pass is not runtime readiness.

<!-- CODEX_QUALITY_HARNESS_END -->
