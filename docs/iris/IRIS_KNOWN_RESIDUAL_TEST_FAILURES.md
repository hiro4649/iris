project: IRIS
role: known residual test failure handling
status: authority
last_verified: 2026-05-20
verification_command: node scripts/run-tests.js
owner: human

# IRIS Known Residual Test Failures

This file records how Codex must handle full `run-tests` failures on clean main or an explicit PR branch.

## Rules

- Do not call a known residual failure PASS.
- Separate known residual failures from new failures.
- Do not paste raw logs, raw payloads, raw memory, endpoint values, tokens, or secrets.
- Use sanitized summaries: command, phase, category, expected owner, and whether the failure is known or new.
- PR bodies must state any remaining known residual failures.
- New failures block merge until fixed or explicitly classified by a human.
- Do not weaken tests, skip tests, or change fixtures only to hide failures.

## Classification

- `known_residual`: already documented, unchanged, and accepted only as a residual risk.
- `new_failure`: not previously documented, changed in count, or changed in behavior.
- `unknown`: cannot be classified without human review.

## Required PR Summary

Every IRIS PR that runs `node scripts/run-tests.js` must report:

- total result;
- known residual count;
- new failure count;
- affected phase or layer contract;
- sanitized summary only;
- whether the PR changes the failing area.

## Current Baseline

No residual is automatically accepted by this file. The current branch must run the required checks and report the result for that branch.
