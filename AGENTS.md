# AGENTS.md

## IRIS Working Guide

IRIS is an AI companion/runtime coordination repository. Use Node.js >=20.
Normal work must stay inside the owner-approved scope and should prefer the
smallest relevant verification command.

Default commands:
- Test: `npm test`
- General preflight: `npm run preflight`
- Smoke check: `npm run smoke`
- Scenario check: `npm run scenario` when behavior flow changes.
- YouTube ingest changes: use the relevant `dev:youtube:*` scripts.
- Persistence changes: use the relevant `dev:persistence:*` scripts.
- Bridge or runtime handoff changes: use the relevant `dev:bridge:*` scripts.

Do not claim runtime, production, production-go, live-readiness, or operator
readiness unless explicitly owner-scoped with current evidence. Done means the
smallest relevant verification was run or honestly reported unavailable without
raw logs or secret-like output.

<!-- CODEX_QUALITY_HARNESS_BEGIN -->
CODEX_QUALITY_HARNESS_FILE v1.2.7

## Prime Directive

Ship the smallest correct change that increases product value without weakening
truth, trust, security, or maintainability.

This AGENTS.md is a compact doctrine and routing map; detailed policy lives in
docs/process.

## Active Harness

Active target harness: v1.2.7 / v127.
Read first: AGENTS.md, docs/process/CODEX_HARNESS_MANIFEST.json,
docs/process/CODEX_V127_SPEC.md, and docs/process/CODEX_ACTIVE_POLICY_INDEX.json.
README, legacy specs, and PR history are conditional reads only.
Stable method references: docs/process/CODEX_OPENAI_CODEX_METHOD_POLICY.md and
docs/process/code_review.md.

## Authority

v1.1.8 Final Decision remains final authority.
v1.1.9 P0 artifacts and operator-visible statuses remain preserved.
v1.2.0 adaptive routing, v1.2.1 calibration, v1.2.2 read-budget routing,
and v1.2.3 observed evidence/decision closure remain compatibility layers.
v1.2.4 delegated autonomy and evidence semantics remain compatibility layers.
v1.2.5 goal shard, worktree fleet, evidence lane, typed monitor, fanout, and
yield remain compatibility layers.
v1.2.6 adds only internal observed workspace, owner/delegated receipt,
checker/builder loop, safe failure capsule, context/skill/validation budget,
and effectiveness fields inside existing P0 artifacts.
v1.2.7 adds only typed owner process and conditional merge receipts,
same-head decision evidence envelopes, content-addressed validation reuse,
and context/output/owner-interrupt compression inside existing P0 artifacts.

## Target Footprint

Do not add new P0 artifacts, top-level statuses, skills, workflow behavior,
product code, package or lockfile changes, runtime code, or readiness claims
for harness rollout unless separately scoped by the owner.
Target AGENTS.md is a compact routing map. Put detailed policy in docs/process
and use profile IDs instead of repeated forbidden-scope text.

## Safety Boundary

Use safe artifacts only. Do not read raw logs. Do not use 8-session.
Do not access wallet/RPC/deploy/secrets, submit GitHub approval review,
self-approve, release, publish, BscScan verify, or claim runtime, production,
legal, or YouTube policy compliance.
Expert agents may make technical findings and one safe next action inside the
goal scope; they cannot create owner authority or widen product/runtime/package
scope. Skeptic review is abnormal-condition only. Safe session learning is
proposal-only and owner-approval-required.

## Local Task Discipline

Start from clean default branch or clean worktree. Preserve user changes.
Run v127 self-test and the local quality gate for v1.2.7 harness work.
Run v126 only as a blocking compatibility test where required.
For product work, use repo-specific commands and keep product evidence separate
from harness evidence.
<!-- CODEX_QUALITY_HARNESS_END -->
