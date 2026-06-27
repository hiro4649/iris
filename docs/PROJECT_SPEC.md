# IRIS Project Spec

## Purpose
IRIS is an AI companion and runtime coordination repository. It coordinates safe
conversation, memory, persistence, bridge handoff, and adapter-facing summaries
without granting autonomous production authority.

## Non-Goals
- Do not perform production go, deployment, release, wallet/RPC access, or
  operator readiness approval from this repository state.
- Do not claim runtime readiness, production readiness, legal compliance, or
  YouTube policy compliance without explicit owner scope and fresh evidence.
- Do not turn candidate actions into executable adapter actions.
- Do not use PR bodies, stale artifacts, local npm output, or fixture passes as
  remote production evidence.

## Architecture Boundaries
- IRIS Core remains in the main repository.
- Voice, motion, Live2D assets, and external runtime assets remain outside this
  core unless separately owner-scoped.
- Product, runtime, package, lockfile, and workflow changes require explicit
  owner scope separate from documentation or harness metadata work.
- Harness authority is layered: v1.1.8 Final Decision remains final authority;
  later harness versions are compatibility, routing, projection, or target
  profile layers unless repository files prove otherwise.

## Runtime Boundary
- Runtime code must not be changed by harness or project-memory documentation
  work.
- Runtime readiness is not inferred from local tests, mock tests, fixture tests,
  target gates, or remote gates.
- Real runtime operation needs fresh evidence plus owner confirmation.

## Persistence Boundary
- Persistence writes must use approved writer paths and safe summaries.
- JSON memory and relationship store concurrency remains a known product area
  under separate validation; it is not part of this docs-only task.
- Persistence diagnostics must avoid raw paths, raw payloads, secrets, endpoint
  values, or stack output in public summaries.

## External Adapter Boundary
- Core receives safe summaries only.
- Raw payloads remain inside adapters.
- Adapters accept approved schemas only.
- `candidate` is not executable.
- `input_action_candidate` must not reach the Game Adapter.
- `approved_game_input_action` is the only accepted Game Adapter action schema.

## Safety Boundary
- Raw logs and raw PR diffs are not read for normal work.
- Do not self-approve, submit GitHub approval reviews, merge without owner
  authorization, or create owner authority.
- Do not fake GitHub auth, remote npm evidence, OBS pickup evidence, voice
  license evidence, HTTP ingest scheduler evidence, PostgreSQL evidence, or
  production evidence.
- GitHub Actions are cost-controlled: use local checks first and avoid remote CI
  reruns unless owner-approved.

## Readiness Boundary
- Fixture PASS is not production readiness.
- Mock PASS is not production readiness.
- Local PASS is not production readiness.
- Remote gate PASS is not production readiness.
- Target gate PASS is not production readiness.
- Owner confirmation and fresh real evidence are required before production go.

## Priority1 BLOCKED Rule
`priority1` remains BLOCKED until owner-scoped fresh evidence and owner
confirmation explicitly change that state.

## Complexity Reduction Rule
Prefer the smallest correct change, bounded reads, profile IDs, safe summaries,
and local validation before remote CI. Avoid widening scope or adding new
artifacts, statuses, workflows, package changes, or runtime behavior unless the
owner explicitly authorizes that scope.
