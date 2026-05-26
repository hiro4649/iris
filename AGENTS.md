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
CODEX_QUALITY_HARNESS_FILE v0.9.0

## Codex Target Harness Boundary

Source harness boundary: this target repository consumes Codex Development Harness v0.9.0 through docs/process/CODEX_HARNESS_MANIFEST.json, not CODEX_SOURCE_HARNESS_MANIFEST.json.
Plan-first: use a short plan for R3, workflow, product-relevant, security, release, or ambiguous changes before editing.
Safe output: reports and artifacts must be safe-summary only. Do not print raw logs, raw diffs, raw payloads, raw PR body, comments, endpoint values, private paths, production data, personal data, tokens, or secrets.
Merge-ready claim: do not claim merge readiness unless the current target gate, evidence, and required confirmations all support it.
Manual confirmation: R3 or owner-gated changes require current-head project-owner confirmation before merge. Manual confirmation cannot override non-overridable failures.
Profile/core separation: target mode keeps profile compatibility off unless the project owner explicitly opts in.

Task discipline: classify work as bugfix, feature, refactor, investigation, review, release-gate, harness-change, or docs-only before editing. Keep task-specific workflow detail in skills or docs/process, not in AGENTS.md.

Current target-mode requirements:
- keep this AGENTS.md readable across the whole file;
- keep exactly one current harness block;
- preserve project authority outside this block;
- run target quality gates with CODEX_HARNESS_MODE=target, CODEX_PROFILE_COMPAT_MODE=off, and CODEX_QUALITY_REPORT=json;
- allow CODEX_SKIP_NPM=1 only when change classification and product verification policy allow it;
- require product verification when product-relevant files, package files, runtime readiness claims, or performance claims are present.

v0.9.0 preserves v0.8.9 safety and adds Remote Parity, Classification Registry, and Artifact Lifeboat:
- pre-checkout safe artifact lifeboat and no-artifact failure classification;
- registry-backed classification coverage and remote/local parity checks;
- PR template compiler hints and gate decision trace;
- v090 self-test.

Do not add Agentmemory, Hermes runtime, GEPA, DSPy, MCP, SQLite memory, LLM judge, hidden chain-of-thought inspection, automatic skill rewriting, auto commit, auto push, or prompt auto-apply as part of this harness block.
Do not treat targetQualityScoreStatus or a passing harness gate as product runtime readiness.

<!-- CODEX_QUALITY_HARNESS_END -->
