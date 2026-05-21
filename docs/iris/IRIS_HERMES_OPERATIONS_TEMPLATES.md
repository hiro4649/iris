# IRIS Hermes Operations Templates

Status: spec_only
Authority: subordinate to `IRIS_SPEC_AUTHORITY.md`, Phase00, numbered Phase specs, active cross-phase addenda, and `docs/iris/IRIS_HERMES_OPERATIONS_SPEC.md`.

This document records safe operating templates for Codex-driven IRIS work. It is not runtime code, not automation, not a Skill DB, not a Trace DB, and not production readiness evidence.

## Common Rules

Every template in this document follows these rules:

- Codex performs GitHub checks, Git Bash or shell commands, PR checks, browser or GitHub state checks, and remote quality gate checks when a task asks for them.
- ChatGPT-side verbal confirmation is not enough when repository or GitHub evidence is required.
- Start from latest `main`: `HEAD == origin/main`, ahead/behind `0/0`, and clean worktree.
- Use repo-local `IRIS_SPEC_AUTHORITY.md` as the repository authority.
- Treat the old external absolute-path authority as deprecated and historical only.
- Do not create an external authority mirror without explicit owner approval.
- When repo-local `IRIS_SPEC_AUTHORITY.md` exists, do not report a missing external authority path as an active residual.
- Keep one scope per PR. Audit, fixture, implementation, policy, docs/spec, and merge work stay separate unless explicitly approved together.
- Do not expose secrets, endpoint values, tokens, raw paths, raw diagnostics, raw payloads, raw candidates, raw memory, raw relationship records, private viewer IDs, relationship scores, commands, `world_command`, or `inner_intent`.
- Do not treat `npm test` PASS as production ready.
- Do not treat fixture PASS as real ready.
- Keep priority1 BLOCKED until real worker, engine, OBS, TTS, Live2D, DB, YouTube, and Game fresh evidence is present and human-confirmed.
- Keep production go/no-go as a separate real-operation confirmation flow.
- Do not restore `approved` as an IRIS memory status. Valid memory statuses remain `candidate`, `accepted`, `protected`, `stale`, and `rejected`.
- Hermes operations layer does not replace the IRIS memory DB and must not write directly to it.
- Skill DB is future procedural memory only. Trace DB is future safe-summary history only.
- Curator is future Skill DB maintenance only. GEPA-style optimizer is future proposal generation only.
- SPEC-HERMES2 does not implement Skill DB, Trace DB, Curator, growth report, trace optimizer, GEPA-style optimizer, Hermes-style performance expansion, Codex auto-run, auto-PR, or auto-commit.

## Template Field Set

Use the following field set for every operation template:

- Purpose
- Target scope
- Target branch
- Target files
- Unauthorized scope
- First Git and GitHub checks
- Allowed changes
- Prohibited changes
- Required verification
- Quality gate and R3 conditions
- Safety checks
- Completion conditions
- Completion report format

## Codex Work Instruction Template

Purpose: define a single Codex task with bounded scope and required evidence.

Target scope: one named task, such as docs-only, fixture-only, implementation-only, policy-only, audit-only, PR-create-only, or merge-only.

Target branch: name the expected starting branch and the new branch if work creates one.

Target files: list exact files or file families that may change.

Unauthorized scope: list every category that must not be touched, including `src/*`, `scripts/*`, `.env.example`, `package.json`, docs, harness, runtime, or production readiness when out of scope.

First Git and GitHub checks:

```powershell
git switch main
git pull --ff-only origin main
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git rev-list --left-right --count HEAD...origin/main
git diff --name-status
```

Also confirm relevant PR states through GitHub tooling, not verbal memory.

Allowed changes: name the exact behavior, fixture, policy, or docs wording allowed by the task.

Prohibited changes: forbid scope expansion, readiness sweetening, test deletion, quality gate weakening, implementation claims, raw data exposure, and unrelated files.

Required verification: include the task-specific subset plus IRIS eval, docs lint, spec-only lint, secret scan, local quality gate, diff check, syntax check, and `npm test` when requested.

Quality gate and R3 conditions: state whether R3 is expected, and require current-head human confirmation for R3.

Safety checks: confirm safe public surface, no raw data, no production-ready claim, priority1 BLOCKED maintained, memory contract maintained, and `inner_intent` not public.

Completion conditions: state exact branch, files, checks, and residual risk requirements.

Completion report format: include branch, commit or HEAD, PR URL when present, changed files, verification result, safety confirmations, residual risks, and next PR candidate.

## R3 Confirmation Template

Purpose: record human confirmation for a specific current-head R3 scope.

Target scope: exactly one approved task. Do not combine unrelated scopes.

Target branch: current task branch or PR head branch.

Target files: exact changed files approved for R3.

Unauthorized scope: every file, feature, implementation, policy, readiness, or production area not approved.

First Git and GitHub checks: confirm current HEAD, PR head SHA, remote quality gate state, and whether a prior R3 packet is stale.

Allowed changes: only the approved scope and files.

Prohibited changes: approval spoofing, stale HEAD approval, broad manual override, quality gate weakening, and hidden residual failures.

Required verification: local checks and remote quality gate evidence, or explicit remote gate pending status when the packet is a request.

Quality gate and R3 conditions: generated text is not approval. Human confirmation must include current HEAD and approved files.

Safety checks: confirm priority1 BLOCKED, production-ready separation, memory contract, and safe public surface.

Completion conditions: confirmation applies only when the packet HEAD equals the PR head.

Completion report format:

```text
R3 confirmation request
Scope:
HEAD:
Files:
Impact:
Safety boundary:
Tests:
Residual risks:
Human confirmation needed: yes
Codex confirmation status: not confirmed by human
```

## Audit-Only Template

Purpose: investigate a suspected drift or risk without changing code.

Target scope: one risk class or one drift group.

Target branch: usually `main`, unless auditing a PR branch.

Target files: read-only candidate files and safe logs.

Unauthorized scope: implementation, fixtures, policy changes, docs rewrites, and PR merge.

First Git and GitHub checks: confirm `main` freshness, target PR state, and clean worktree.

Allowed changes: `.tmp` safe audit artifacts only when needed.

Prohibited changes: tracked file edits, code fixes, test edits, policy edits, and hidden failure treatment.

Required verification: relevant subsets, local quality checks if requested, and safe grep output with no raw values in the report.

Quality gate and R3 conditions: audit may request R3 later, but audit itself does not approve changes.

Safety checks: report safe labels, file names, test names, and risk labels only.

Completion conditions: no tracked changes and a clear classification.

Completion report format: include tracked change status, `.tmp` artifacts, safe summary, suspected cause, whether fixture, implementation, or policy work is needed, residual failures, and next recommended PR.

## Fixture Correction Template

Purpose: update tests or fixtures to match approved existing safe behavior.

Target scope: one fixture drift group.

Target branch: new branch from latest `main`.

Target files: normally `scripts/run-tests.js` only, unless explicitly approved otherwise.

Unauthorized scope: implementation code, docs drift, policy changes, readiness sweetening, and unrelated fixtures.

First Git and GitHub checks: confirm latest `main`, clean worktree, and relevant PR states.

Allowed changes: nearest fixture expectations and negative assertions required for the drift.

Prohibited changes: raw readiness count substitution, test deletion, broad fixture rewrites, making missing systems ready, or treating fixture PASS as real ready.

Required verification: named subset tests, full required checks, `git diff --check`, syntax check, and `npm test`.

Quality gate and R3 conditions: R3 is required when fixture changes touch readiness, public surface, memory, persistence, policy, or env boundary.

Safety checks: confirm no raw secret, endpoint, token, path, payload, candidate, memory, command, `world_command`, or `inner_intent` appears.

Completion conditions: target fixture passes or remaining failures are classified outside scope.

Completion report format: changed files, branch, subset results, fixed failures, moved failures, safety confirmations, quality gate result, R3 status, `npm test` result, residual risk, next PR.

## Implementation Fix Template

Purpose: change runtime or service behavior for one approved bug or boundary defect.

Target scope: exact module and behavior.

Target branch: new branch from latest `main`.

Target files: exact implementation and test files.

Unauthorized scope: unrelated refactors, docs-only status claims, harness changes, dependency changes, and production go/no-go.

First Git and GitHub checks: confirm latest `main`, clean worktree, PR dependency state, and no pending unrelated diff.

Allowed changes: minimal implementation and focused tests.

Prohibited changes: boundary weakening, direct candidate commit, adapter bypass, raw public output, readiness sweetening, and broad abstractions.

Required verification: target tests, safety subsets, local gate, syntax checks, and `npm test`.

Quality gate and R3 conditions: R3 when public surface, persistence, adapter, readiness, env, or safety boundary changes.

Safety checks: confirm Core / Adapter boundaries, memory contract, no raw data exposure, no production-ready claim, and priority1 BLOCKED when real evidence is absent.

Completion conditions: behavior fixed, tests pass or residual failures classified, and no out-of-scope changes.

Completion report format: files, behavior fixed, tests, safety confirmations, residual risk, PR URL if created.

## Policy Change Template

Purpose: change quality gate, blocked path, secret scan, PR governance, or harness policy in a narrow way.

Target scope: exact policy behavior.

Target branch: new branch from latest `main`.

Target files: policy docs, quality gate policy, harness policy files, and tests explicitly approved.

Unauthorized scope: product implementation, `.env.example`, runtime, feature status inflation, and broad blocked path overrides.

First Git and GitHub checks: confirm latest `main`, affected PR state, and clean worktree.

Allowed changes: narrow policy logic and fixtures that prove allowed and rejected cases.

Prohibited changes: broad manual override, secret scan weakening, blocked path blanket release, hidden checks, or production-ready claims.

Required verification: quality gate subsets, secret scan, full local gate, syntax checks, and `npm test`.

Quality gate and R3 conditions: policy changes are R3 and require current-head human confirmation.

Safety checks: verify rejected cases remain rejected and safe cases are exact path or exact scope only.

Completion conditions: policy is narrow, tests cover pass and fail fixtures, and remote gate can validate.

Completion report format: policy changed, allowed cases, rejected cases, quality gate result, residual risk, next step.

## Docs And Spec Change Template

Purpose: update specification or status docs without implementation.

Target scope: exact spec or status topic.

Target branch: new branch from latest `main`.

Target files: approved docs only.

Unauthorized scope: `src/*`, `scripts/*`, `.env.example`, `package.json`, harness manifest, implementation, runtime, and production readiness changes.

First Git and GitHub checks: confirm latest `main`, clean worktree, and dependent PR merge state.

Allowed changes: docs wording, spec-only entries, status clarification, and safe references.

Prohibited changes: implemented status increase without code/tests, priority1 release, production-ready claim, or future component implementation claim.

Required verification: docs lint, spec-only lint, IRIS eval, secret scan, local quality gate, diff check, syntax check, and `npm test`.

Quality gate and R3 conditions: R3 when authority-adjacent, boundary, readiness, memory, public surface, or operations governance meaning changes.

Safety checks: confirm spec-only/planned wording, no raw data, no `inner_intent`, no memory status expansion.

Completion conditions: docs-only diff and all required checks reported.

Completion report format: changed files, status changes, implemented status check, priority1 check, verification, R3 status, residual risk.

## PR Creation Template

Purpose: commit, push, and open a standalone PR after approved work.

Target scope: already approved current branch changes.

Target branch: current branch, not `main`.

Target files: exact approved changed files.

Unauthorized scope: new edits, extra cleanup, unrelated formatting, and additional commits beyond approved changes.

First Git and GitHub checks: status, diff names, diff stat, branch, HEAD, origin/main, ahead/behind, and target PR dependency state.

Allowed changes: commit existing approved diff and push branch.

Prohibited changes: main direct commit, scope broadening, hidden residual failures, and unverified PR body claims.

Required verification: repeat required local checks immediately before commit.

Quality gate and R3 conditions: use the approved R3 file or PR comment only for the approved scope.

Safety checks: confirm changed file list and no out-of-scope files.

Completion conditions: PR open, remote quality gate checked, worktree clean.

Completion report format: branch, commit SHA, PR URL, remote gate result, worktree state, test result, changed files, safety confirmations, residual risk, next PR.

## Merge And Refresh Main Template

Purpose: merge an approved PR and update local `main`.

Target scope: one approved PR.

Target branch: PR branch before merge; local branch becomes `main` after merge.

Target files: files already present in the approved PR.

Unauthorized scope: direct main commits, extra commits, unrelated PRs, and post-merge implementation work.

First Git and GitHub checks: confirm PR number, head SHA, remote gate success, approval scope, and no local dirty worktree.

Allowed changes: merge PR through GitHub, switch to `main`, pull ff-only.

Prohibited changes: merging unapproved PRs, adding commits, changing files, or hiding failed checks.

Required verification: after refresh, run required local checks and `npm test`.

Quality gate and R3 conditions: remote quality gate must be success or the task must explicitly say how to handle it.

Safety checks: confirm approved scope only, no production-ready claim, priority1 BLOCKED maintained, memory contract maintained.

Completion conditions: PR merged, `HEAD == origin/main`, ahead/behind `0/0`, clean worktree, checks reported.

Completion report format: merge result, main HEAD, sync status, worktree, check results, scope reflection, safety confirmations, residual risk, next PR candidate.

## Remote Quality Gate Failure Template

Purpose: classify a remote quality gate failure without hiding or weakening it.

Target scope: one PR and one failed run.

Target branch: PR branch or `main` for audit only.

Target files: no tracked changes unless a later fix is separately approved.

Unauthorized scope: merging, policy weakening, test deletion, and unrelated fixes.

First Git and GitHub checks: confirm PR open or merged state, failed run, job logs, current head, and local clean worktree.

Allowed changes: `.tmp` safe summaries only.

Prohibited changes: additional commits, broad policy exceptions, or treating failure as pass.

Required verification: inspect failed job logs, rerun only when formally appropriate, and run local checks if requested.

Quality gate and R3 conditions: distinguish R3 missing, blocked path, hard block, stale base, secret scan, profile check, and required check failure.

Safety checks: do not paste raw logs containing secrets, endpoints, tokens, paths, payloads, candidates, commands, or `inner_intent`.

Completion conditions: root cause is safely classified and next formal action is clear.

Completion report format: PR not merged confirmation, safe failure summary, hard block or R3 status, local check result, recommended next step.

## Blocked Path Response Template

Purpose: handle a blocked path without broadening policy.

Target scope: exact blocked path and approved reason.

Target branch: audit branch or policy branch if a policy change is approved.

Target files: policy files and fixtures only when explicitly approved.

Unauthorized scope: product implementation, hidden path changes, blocked path blanket override, and direct merge of failed PR.

First Git and GitHub checks: confirm blocked path log, PR diff, hard block versus R3-overridable status, and current main policy.

Allowed changes: exact path, exact safe condition, exact R3 requirement, with negative fixtures.

Prohibited changes: allowing `.env`, `.env.*`, values in examples, endpoint values, tokens, secrets, local absolute paths, shell bodies, or raw paths.

Required verification: policy subset, blocked path subset, secret scan, local gate, and `npm test`.

Quality gate and R3 conditions: policy exception work is R3 and must not waive R3 for future sensitive changes.

Safety checks: confirm blocked paths remain blocked unless every safe condition is met.

Completion conditions: the original PR can rerun against the updated policy, or the design is reported impossible.

Completion report format: blocked path cause, allowed case, rejected cases, gate result, original PR status, residual risk.

## Scope-Mixing Detection Template

Purpose: detect and stop a mixed-scope PR before merge.

Target scope: one PR diff under audit.

Target branch: `main` or local audit branch.

Target files: read-only diff and `.tmp` audit artifacts.

Unauthorized scope: merge, extra commits, and opportunistic fixes.

First Git and GitHub checks: fetch PR branch, compare `main...branch`, record changed file families, and confirm PR state.

Allowed changes: safe audit notes only.

Prohibited changes: broadening approval to fit the diff or marking unsafe mix as safe.

Required verification: classify every changed hunk into allowed scope or split candidates.

Quality gate and R3 conditions: any mixed R3 areas need separate approval or separate PRs.

Safety checks: identify readiness sweetening, candidate direct commit, persistence shortcuts, blocked path policy weakening, public-surface leakage, or status inflation.

Completion conditions: recommendation is merge, split, or close and recreate.

Completion report format: PR not merged confirmation, categories found, safety concerns, split recommendation, next PR.

## A/B/C/D Split Template

Purpose: split a broad residual into independently reviewable groups.

Target scope: named groups such as A runbook, B foundation worker, C YouTube source, D persistence flow.

Target branch: one new branch per group.

Target files: exact group-specific files only.

Unauthorized scope: applying another group in the current branch.

First Git and GitHub checks: save pending patches, restore clean `main`, refresh main, then create the group branch.

Allowed changes: only the selected group and nearest tests or docs.

Prohibited changes: cherry-picking the full mixed diff, merging unsafe PRs, or treating dependent groups as approved.

Required verification: group subset, adjacent safety subsets, local gate, and `npm test` result.

Quality gate and R3 conditions: each group may need its own R3 packet.

Safety checks: confirm no other group terms appear as changed lines unless already merged into main.

Completion conditions: group either passes or stops with the next group classified.

Completion report format: group applied, excluded groups, subset results, remaining group, safety confirmations, residual risk.

## Production Ready Misread Prevention Template

Purpose: prevent regression evidence from becoming a production go/no-go claim.

Target scope: any task reporting readiness, tests, runbook, env, or operations status.

Target branch: any branch.

Target files: docs, tests, or reports that mention readiness.

Unauthorized scope: priority1 release, production go/no-go, and real-operation claims unless explicitly approved.

First Git and GitHub checks: confirm whether the task is regression, fixture, rehearsal, dry-run, or real production evidence.

Allowed changes: wording that separates regression PASS, fixture PASS, rehearsal PASS, dry-run status, and real readiness.

Prohibited changes: "production ready" claims based on `npm test`, fixture pass, synthetic relay, dry-run probe, missing service, or stale evidence.

Required verification: docs lint, relevant readiness tests, local gate, and `npm test`.

Quality gate and R3 conditions: R3 when readiness meaning changes.

Safety checks: priority1 BLOCKED remains until fresh real evidence and human confirmation.

Completion conditions: docs and reports say PASS only for the evidence type actually observed.

Completion report format: evidence type, what is not claimed, priority1 status, fresh evidence status, residual risk.

## Safe Summary Completion Report Template

Purpose: provide concise completion evidence without leaking raw data.

Target scope: current task only.

Target branch: branch used for the task.

Target files: changed files or "none" for audit.

Unauthorized scope: unrelated findings and unapproved next work.

First Git and GitHub checks: include HEAD, origin/main sync, PR state, and worktree state.

Allowed changes: final report text only.

Prohibited changes: raw logs, endpoint values, tokens, local absolute paths, raw payloads, raw candidates, raw memory, raw commands, or `inner_intent`.

Required verification: list commands by safe labels and PASS/FAIL status.

Quality gate and R3 conditions: report R3 required, R3 accepted, or not required. Do not claim Codex approved human confirmation.

Safety checks: include production-ready separation, priority1 BLOCKED, memory contract, future component status, and public-safe surface.

Completion conditions: user can see what changed, what passed, what remains, and what should happen next.

Completion report format:

```text
branch:
HEAD:
PR:
changed files:
verification:
quality gate:
safety:
residual risks:
next PR:
```
