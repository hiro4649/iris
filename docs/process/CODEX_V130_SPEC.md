# CODEX v1.3.0 Core Metadata Target Spec

This target materializes HARNESS v1.3.0 Core metadata for hiro4649/iris.
It is a metadata gate target bridge only. It does not create new owner,
runtime, production, deploy, wallet, RPC, secret, package, lockfile, workflow,
or product authority.

## Target Profile

- Repository profile: IRIS.
- Target profile class: metadata gate target.
- Active harness tuple: v1.3.0 / v130.
- Previous version: v1.2.9.
- v1.2.9 remains immediate rollback.
- v1.2.8 remains blocking compatibility.
- v1.2.7 remains readable compatibility.
- v080-v112 remains target shadow legacy count only.

## Authority

v1.1.8 Final Decision remains final pass, block, mergeAllowed, and exit-code
authority. HARNESS v1.3.0 Core does not create a second final authority and
does not grant owner authority.

## Scope Boundary

This target does not authorize changes to:

- product code
- runtime code
- package files
- lockfiles
- workflows
- deploy, wallet, RPC, or secret handling
- external adapter runtime behavior
- readiness, production, or production-go claims

## Artifact And Status Boundary

- New P0 artifacts: no.
- New top-level statuses: no.
- New Skills: no.
- Existing target quality gate path remains the active path.
- Existing repo-specific product/runtime boundaries remain preserved.

## Deferred Non-Authoritative Tracks

- Performance Track: deferred.
- Fable comparator: unavailable.
- SDK benchmark runner: unavailable.
- 60-task benchmark: not required for core activation.
- Skill runtime activation: deferred.
- DAG agent team runtime: deferred.
- learned policy activation: shadow only.
- Cyber specialist runtime: deferred.

These tracks do not affect quality score, required checks, merge authority, or
blocking status for the v1.3.0 Core metadata target.

## Token And Routing Budget

- Routine cold artifact reads: 0.
- Routine selected skills: 0.
- Routine reviewer fanout: 0.
- Routine owner interrupts: 0.
- Safe summaries and profile identifiers are preferred over repeated policy
  text.

## Readiness Boundary

Fixture PASS, mock PASS, local PASS, remote gate PASS, and target gate PASS do
not imply runtime readiness or production readiness. Production go requires
fresh real evidence plus owner confirmation. `priority1` remains BLOCKED.
