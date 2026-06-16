# IRIS Community World Core Schema Fixtures Specification

## Status

Status: proposal
Scope: specification and fixture definitions only
Runtime implementation: not started
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Dataset audit runner implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

Define safe fixture classes for the schemas introduced in IRIS Community World
Core / Minecraft MVP.

These fixtures remain specification-only. They do not implement runtime code,
Minecraft plugins, adapter execution, or dataset audit automation.

## Relation to Community World MVP

This specification follows
`docs/specs/IRIS_20240425/IRIS_COMMUNITY_WORLD_CORE_MINECRAFT_MVP.md`.

The MVP specification defines the product direction: IRIS Community World Core
is the reusable architecture, and Minecraft is the first adapter target. This
fixture specification defines how future schema validation should prove the
boundary without starting runtime work.

## Fixture Principles

- Fixture data is synthetic.
- Fixture data is safe summary only.
- No raw Minecraft chat.
- No private viewer ID.
- No exact private coordinates.
- No raw grief evidence.
- No payment ranking.
- No relationship ranking.
- No game command.
- No direct action candidate execution.
- No production readiness claim.

## Schema Fixture List

- `community_world_event_summary`
- `community_world_contribution_ledger`
- `minecraft_identity_link_candidate`
- `minecraft_server_participation_policy`
- `minecraft_chat_safe_ingest`
- `minecraft_build_registry`
- `minecraft_event_lifecycle`
- `community_recap_export`
- `minecraft_grief_rollback_request`
- `community_world_memory_candidate`

## Positive Fixture Classes

- Valid event summary.
- Valid contribution ledger.
- Valid identity link candidate.
- Valid whitelist policy.
- Valid chat safe ingest summary.
- Valid build registry.
- Valid event lifecycle.
- Valid weekly recap.
- Valid rollback request safe summary.
- Valid memory candidate.

## Negative Fixture Classes

- Raw chat included.
- Private viewer ID exposed.
- Relationship score exposed.
- Payment ranking included.
- Pay-to-win benefit included.
- Raw command included.
- `input_action_candidate` included.
- `approved_game_input_action` included before adapter gate.
- Exact private coordinates exposed.
- Raw grief evidence exposed.
- Mojang or Microsoft official affiliation implied.
- Production readiness claimed.
- Production go claimed.
- priority1 resolved without evidence.

## Boundary Fixture Classes

- New viewer friendliness.
- Public recognition without ranking.
- Memory candidate vs approved memory separation.
- Moderation precheck required.
- Owner or moderator review required.
- Minor safety.
- Anti-parasocial guard.
- Monetization no-pay-to-win.
- Unofficial notice.
- Commercial policy review required.
- Safe recap export.

## K1001-K1020 Fixture Mapping

- K1001 Community World Core schema: valid event summary, required schema list,
  no production readiness claim.
- K1002 Game account identity link candidate: valid identity link candidate,
  private viewer ID exposed, owner or moderator review required.
- K1003 Minecraft participation whitelist gate: valid whitelist policy, new
  viewer friendliness, unofficial notice.
- K1004 Minecraft in-game chat safe ingest: valid chat safe ingest summary, raw
  chat included, no private viewer ID.
- K1005 Minecraft contribution ledger: valid contribution ledger, payment
  ranking included, relationship score exposed.
- K1006 Minecraft build registry: valid build registry, exact private
  coordinates exposed, public recognition without ranking.
- K1007 Minecraft world event ledger: valid event summary, valid event lifecycle,
  safe recap export.
- K1008 Minecraft event lifecycle plan: valid event lifecycle, moderation
  precheck required, owner or moderator review required.
- K1009 Minecraft grief rollback moderation gate: valid rollback request safe
  summary, raw grief evidence exposed, moderation precheck required.
- K1010 Minecraft public recognition no-ranking policy: public recognition
  without ranking, payment ranking included, relationship score exposed.
- K1011 Minecraft memory recall policy: valid memory candidate, memory candidate
  vs approved memory separation, anti-parasocial guard.
- K1012 Community recap safe export: valid weekly recap, safe recap export, raw
  chat included.
- K1013 Minecraft unofficial notice gate: unofficial notice, Mojang or Microsoft
  official affiliation implied.
- K1014 Minecraft commercial policy gate: commercial policy review required,
  pay-to-win benefit included, monetization no-pay-to-win.
- K1015 Community World anti-parasocial guard: anti-parasocial guard,
  relationship score exposed, payment ranking included.
- K1016 Community World minor safety guard: minor safety, private viewer ID
  exposed, owner or moderator review required.
- K1017 Community World monetization no-pay-to-win guard: monetization
  no-pay-to-win, pay-to-win benefit included, payment ranking included.
- K1018 Minecraft server rule disclosure gate: valid whitelist policy,
  unofficial notice, new viewer friendliness.
- K1019 Community World fixture regression pack: all positive fixture classes,
  all negative fixture classes, all boundary fixture classes.
- K1020 Community World MVP completion review hook: no runtime implementation,
  no plugin implementation, no production readiness claim, priority1 remains
  BLOCKED.

## Validation Plan

- Docs lint.
- Spec-only docs lint.
- Secret scan.
- No runtime tests unless docs policy requires them.

## Non Goals

- No runtime.
- No plugin.
- No server.
- No adapter.
- No dataset audit runner.
- No package changes.
- No workflow changes.
- No readiness claim.
- No production go.

## Acceptance Criteria

- Spec exists.
- All required schemas have positive and negative fixture classes.
- At least one boundary fixture per K1001-K1020 group exists.
- No runtime code added.
- No raw chat or private data included.
- No game command or candidate execution fixture accepted.
- priority1 remains BLOCKED.

## Future Work

Future work may add schema examples, fixture JSON, or validators only under a
separate owner-approved task. Any future validator must remain safe-summary
first, reject direct command execution, and keep memory candidates separate from
approved memory.
