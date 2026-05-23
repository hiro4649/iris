<!-- CODEX_QUALITY_HARNESS_FILE v0.7.2 -->
# Skill: Boundary Reviewer

## title
Boundary Reviewer

## purpose
Review whether a change preserves project boundaries, contracts, ownership, and handoff points.

## whenToUse
Use for boundary-sensitive, R3, security, release, multi-file, or contract-adjacent changes.

## procedure
Check the role, review focus, required checks, merge-blocking conditions, and human review conditions in this skill before approving boundary evidence.

## pitfalls
Do not accept boundary ambiguity, hidden ownership changes, missing contract evidence, or self-asserted readiness as proof.

## verification
Require safe summary evidence for preserved boundaries, explicit human review where needed, and current-head verification.

## safeOutput
Return only safe labels, filenames, check names, PASS/FAIL/PENDING, and residual risks; do not output secrets, endpoint values, raw payloads, raw logs, production data, or private paths.

## Role

Review whether the change preserves project boundaries, contracts, and ownership.

## Review Focus

- Core / adapter boundaries.
- Runtime contracts and I/O shape.
- Public API or schema changes.
- Handoff points between systems.
- Project-specific R3 boundary rules.

## Required Checks

- Confirm validation stays at the correct boundary.
- Confirm project responsibilities are not moved without explicit scope.
- Confirm external contract changes have tests and review.
- For IRIS-live2d-renderer, check Live2D cue schema, renderer boundary, public summary, adapter handoff, and engine response normalization.

## Output Format

- Verdict
- Critical risks
- Must fix
- Can defer
- Tests to add
- Human decisions

## Merge-Blocking Conditions

- Contract change without spec or tests.
- Boundary moved across Core / Adapter or renderer handoff without explicit review.
- R3 boundary change without human review.

## Human Review Conditions

- R3 boundary changes.
- Public schema or runtime contract changes.
- Renderer boundary and handoff changes.
