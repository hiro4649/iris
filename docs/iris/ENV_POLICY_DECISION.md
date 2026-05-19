---
project: IRIS
role: env policy decision
status: source-of-truth
last_verified: 2026-05-19
verification_command: node scripts/verify-iris.mjs
owner: human
---
<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->

# IRIS Env Policy Decision

## Current Decision

Do not add the proposed env names to `.env.example` now.
Keep `docs/iris/ENV_POLICY_PROPOSAL.md` as the proposal record.

## Why `.env.example` Stays Unchanged

- `.env.example` is a blocked path under the current quality gate.
- Env sample changes can look like runtime approval even when runtime use is not final.
- A source repair, harness docs update, or final acceptance cleanup must not carry env sample changes.
- Env examples must never include secret values, tokens, DB URLs, cookies, Authorization headers, or live targets.

## Backup Patch Review

Backup patch:
`C:\Users\HIRO-001\Documents\Codex\iris-post-merge-backups\iris-harness-v065-clean-20260519-190202\dirty-worktree.patch`

Confirmed env-policy-adjacent names from the backup:

- `IRIS_LOCAL_TTS_BRIDGE_ENDPOINT`
- `IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT`
- `IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT`
- `IRIS_YOUTUBE_VIDEO_URL`
- `IRIS_YOUTUBE_WATCH_URL`
- `IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT`
- `IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT`

The first five names were already present in `docs/iris/ENV_POLICY_PROPOSAL.md`.
The two health endpoint names are proposal-only additions in that document.
No source behavior from the backup patch is approved by this decision.

## Future `.env.example` Reflection Conditions

Reflect proposed names into `.env.example` only when all conditions are met:

- env names are stable in the IRIS body specification
- tests or runtime paths formally require those env names
- docs alone are not enough; an executable path needs the names
- blocked path policy handling is decided before the PR
- the change is a dedicated env policy PR
- local and remote quality gates pass
- human review is complete

## Dedicated Env Policy PR Rules

- Do not mix with source repair.
- Do not mix with harness docs.
- Explain why `.env.example` must change.
- Use names only; never include secret values or live targets.
- Run secret scan, local quality gate, profile required checks, JSON quality report, and diff checks.
- Do not merge before human review is complete.
