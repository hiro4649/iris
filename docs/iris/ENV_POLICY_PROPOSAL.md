---
project: IRIS
role: env policy proposal
status: draft
last_verified: 2026-05-19
verification_command: node scripts/codex-local-quality-gate.mjs
owner: human
---
<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->

# IRIS Env Policy Proposal

## Current Decision

`.env.example` changes are not approved for the current repair.
The file was restored to remove the blocked-path diff.

## Proposed Env Names

These env names were considered for future sample coverage:

- `IRIS_LOCAL_TTS_BRIDGE_ENDPOINT`
- `IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT`
- `IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT`
- `IRIS_YOUTUBE_VIDEO_URL`
- `IRIS_YOUTUBE_WATCH_URL`

## Why They May Be Needed

- Bridge endpoint env names can make local TTS, Live2D, and subtitle bridge setup more discoverable.
- YouTube URL aliases can document operator-friendly input forms while keeping live IDs and URLs out of safe reports.

## Risk

- `.env.example` is a blocked path under the current quality gate.
- Env sample changes can be mistaken for runtime configuration approval.
- Public examples must not contain secrets, raw tokens, DB URLs, cookies, Authorization headers, or live targets.

## Preferred Alternative

Document env-name proposals in IRIS docs until a human approves an env policy PR.
Do not add these names back to `.env.example` in a source repair or harness docs PR.

## Human Approval Needed

Approve or reject a dedicated IRIS env policy PR for these env sample names.
If approved, run secret scan, local quality gate, profile required checks, JSON quality report, and diff checks on that env-only scope.
