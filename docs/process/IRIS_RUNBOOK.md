<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->
# IRIS Runbook

## Purpose

This runbook is the operating procedure for IRIS development, operation,
external evidence checks, and no-go maintenance. It does not define new product
behavior.

## Authority

Check `./IRIS_SPEC_AUTHORITY.md` first. Treat Phase00 through Phase27 and the
active cross-phase addenda as the specification authority. The IRIS development
queue is an implementation queue only; it is not specification authority.
After `./IRIS_SPEC_AUTHORITY.md`, check `docs/process/RELEASE_GATE.md`.
The formal IRIS release gate is `docs/process/RELEASE_GATE.md`; do not use a
separate `IRIS_RELEASE_GATE.md` alias. Check `RELEASE_GATE.md` for all release,
merge, and PR decisions.

## Normal Development Flow

1. Confirm a clean baseline with `git status --short`.
2. Select one target task only.
3. Implement the smallest diff that satisfies that task.
4. Run the target Node verification for the changed surface.
5. Run `node scripts/codex-secret-safety-scan.mjs`.
6. Run `node scripts/codex-local-quality-gate.mjs`.
7. Run `CODEX_RUN_PROFILE_REQUIRED_CHECKS=1 node scripts/codex-local-quality-gate.mjs`.
8. Run `npm run dev:production:probe`.
9. Run `git diff --check`.
10. Decide whether the change is commit-eligible.

## No-Go Operation

Maintain `production_ready_allowed=false` and `go_no_go=no_go` until real
external evidence and owner/operator review satisfy the release gate. Do not
treat fixtures, local bridges, mocked adapters, local rehearsals, or safe
summaries as real-ready evidence. Areas without external real evidence remain
`blocked`, `external_real_evidence_blocked`, or `operator_review_required`.

## External Real Evidence Areas

Do not mark any of these ready without the named real service, real device, or
owner/operator confirmation:

- YouTube real API evidence.
- OBS real setup evidence.
- Live2D and TTS real runtime evidence.
- Game control real input approval, emergency stop, and operator confirmation.
- Vision and capture real device evidence with operator review.
- PostgreSQL real database, migration, backup, and capacity evidence.
- Admin owner/operator/private runner confirmation.
- Media and external topic configuration and safety evidence.

## Output Limits

Do not output raw diff bodies, long logs, secrets, endpoint values, API keys,
tokens, raw payloads, raw memory, raw candidates, raw vectors, raw frames, raw
voice data, raw SQL, dataset paths, or internal model paths. Use safe summaries,
status labels, counts, booleans, and configured/missing states.

## Commit, PR, And Review

Use one purpose per commit. Open a PR only after clean verification. Run
`@codex review` only after the PR exists and before merge as an additional audit.
Do not run `@codex review` while uncommitted diffs remain.
