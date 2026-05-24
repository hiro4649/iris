# AGENTS.md

## IRIS Authority Boundary

過去の読めないAGENTS記述は仕様権限として扱わない。IRIS_SPEC_AUTHORITY.mdを正とし、不明点は実装せず残リスクに記録する。

For IRIS product behavior, specifications, phase rules, or runtime changes,
use `IRIS_SPEC_AUTHORITY.md` as the canonical authority. If the authority file
is missing, ambiguous, or conflicts with the task, stop and report the risk
instead of inventing rules.

Harness-only work must stay in harness-managed files. Do not modify IRIS
product source, tests, specs, package files, lockfiles, runtime files, or
`scripts/run-tests.js` unless the project owner explicitly requests product
work and required verification evidence is available.
<!-- CODEX_QUALITY_HARNESS_BEGIN -->
CODEX_QUALITY_HARNESS_FILE v0.8.3

## Target Harness Boundary

This repository is a downstream target using Codex Development Harness v0.8.3.
Harness work must stay in harness-managed files unless the task explicitly asks
for product code changes. Preserve readable project authority and boundary text
outside this block.

## Source Harness Boundary

The source harness is maintained outside this target repository. Use
`docs/process/CODEX_HARNESS_MANIFEST.json` as the target manifest. Do not copy
source-only manifests, source-only profiles, or source repo README content into
target-mode work.

## Plan-First Rule

Use plan-first for R3, ambiguous, security-sensitive, migration, release,
dependency, multi-file, or architecture tradeoff work. Keep the plan short and
connect it to affected areas, entrypoints, and failure propagation risk.

## Safe Output Rule

Use safe summary only. Do not print raw PR bodies, comments, logs, diffs,
payloads, secret values, endpoint values, private paths, production data,
personal data, tokens, or credentials.

## Target Verification Rule

Target mode uses `CODEX_HARNESS_MODE=target` and `CODEX_PROFILE_COMPAT_MODE=off`.
Harness-only changes may use `CODEX_SKIP_NPM=1`. Product-relevant changes,
runtime readiness claims, package changes, lockfile changes, or performance
claims require the matching safe evidence and must not be hidden by npm skip.

## v0.8.3 Diagnostic Stability

The target quality gate includes workflow preflight, remote product baseline,
remote npm diagnostic, safe artifact index, open PR hygiene, reason summary,
final summary, AGENTS context, safe output, secret scan, product verification,
and `targetQualityScoreStatus`. These artifacts are safe-summary only and do not
prove product runtime readiness by themselves.

## Merge-Ready Claim Rule

Do not claim merge-ready unless required gates, current-head evidence, target
quality score, product verification policy, and human confirmation rules are
satisfied.

## Manual Confirmation Limit

Manual confirmation cannot override non-overridable failures: secret scan,
blocked paths, high-confidence sensitive findings, stale evidence, unsafe
output, product/harness scope mixing, unreadable AGENTS context, missing target
score, or weakened quality gates.

## Profile/Core Separation

Source harness version and profile template version are separate. Target mode
does not require source profiles unless a project explicitly opts in.

<!-- CODEX_QUALITY_HARNESS_END -->
