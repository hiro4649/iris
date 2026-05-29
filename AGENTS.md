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
CODEX_QUALITY_HARNESS_FILE v1.0.0

## Source Harness Boundary

Target rollout work uses the source harness as the parent authority, but this repository remains a target consumer. Keep product authority outside the harness block intact.

## Codex Target Harness Boundary

This target repository consumes Codex Development Harness v1.0.0 through
`docs/process/CODEX_HARNESS_MANIFEST.json`; do not copy or create
`CODEX_SOURCE_HARNESS_MANIFEST.json` here. Keep product authority outside this
block intact.

## Target Doctrine And Skill Routing

Keep AGENTS.md compact: doctrine, routing map, and links only. Put detailed
policy in `docs/process`. Load only task-needed skills, normally four or fewer
and never more than five. Use `docs/process/CODEX_AGENTS_DOCTRINE_POLICY.md`,
`docs/process/CODEX_SKILL_ROUTING_POLICY.md`,
`docs/process/CODEX_SUBAGENT_GOVERNANCE_POLICY.md`, and related v0.9.5-v1.0.0
files for detailed rules. Use `docs/process/CODEX_OPENAI_CODEX_METHOD_POLICY.md`
for Codex Method requirements.

## Target Safety Rules

Harness-only work must stay in harness-managed files. Do not modify product
source, product tests, runtime assets, package files, lockfiles, profiles,
`scripts/run-tests.js`, or product config not owned by harness unless the
project owner explicitly requests product work and required verification evidence
is available.

Maintain source/target sequencing, parent-harness preservation, profile/core separation, plan-first discipline, workflow scope, worker file ownership, stop conditions, merge-ready claim evidence, manual confirmation limits, and safe output rules. Manual confirmation cannot override non-overridable harness
failures. Do not print raw logs, raw diffs, raw runtime data, raw model paths,
secrets, endpoints, private paths, production data, or personal data.

Do not treat targetQualityScoreStatus or a passing harness gate as product
runtime readiness. Fixture pass, browser smoke pass, dataset audit readiness,
Game/Tool Adapter fixture pass, beloved avatar audit readiness, Application
Intelligence maps, and handover documents are not runtime readiness.

Maintain Profile/Core Separation: target rollout uses target mode while source harness core remains separate.

Run target quality gates with `CODEX_HARNESS_MODE=target`,
`CODEX_PROFILE_COMPAT_MODE=off`, and `CODEX_QUALITY_REPORT=json`. Preserve target
hotfixes and target-specific adaptations during rollout. Require same-head
evidence for PR evidence, manual confirmation, remote runs, artifact summaries,
and product-relevant PR context.

<!-- CODEX_QUALITY_HARNESS_END -->
