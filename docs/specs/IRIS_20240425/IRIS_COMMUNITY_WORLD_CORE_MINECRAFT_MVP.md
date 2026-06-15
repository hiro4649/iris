# IRIS Community World Core / Minecraft MVP Specification

## Status

Status: proposal
Scope: specification only
Runtime implementation: not started
Minecraft runtime implementation: not started
Minecraft plugin implementation: not started
Dataset audit runner implementation: not started
Production readiness: not claimed
Production go: not performed
priority1: BLOCKED

## Purpose

IRIS Community World Core defines a persistent shared world where viewers can
participate, contribute, be safely remembered, and return to deepen their
relationship with IRIS.

Minecraft is the first adapter target, not the whole architecture. The
architecture must remain reusable for Roblox, VRChat, UEFN, and future worlds.
The goal is relationship continuity, not strong autonomous gameplay.

## Core Principle

IRIS should not primarily become a game-playing AI. IRIS should become a
character who notices viewers, remembers safe contributions, reacts to shared
events, and helps the community build a persistent world together.

Minecraft is used first because building, exploration, visible contribution,
event history, and community continuity fit IRIS.

## Relationship Goal

A healthy Community World loop is:

1. Viewer joins world.
2. Viewer contributes by building, exploring, protecting, gathering, guiding,
   repairing, supporting, or participating.
3. IRIS receives a safe summary.
4. IRIS reacts during stream.
5. A safe memory candidate may be created.
6. A public recognition candidate may be created.
7. The next stream can reference the safe contribution naturally.

The viewer should feel remembered without privacy leakage, ranking pressure,
payment pressure, or exclusive attachment.

## Non Goals

- No autonomous Minecraft control.
- No real Minecraft server runtime.
- No Minecraft plugin.
- No public server launch.
- No dataset audit runner.
- No direct game command execution.
- No `input_action_candidate` to Game Adapter.
- No Minecraft commands from viewer suggestions.
- No payment-based relationship growth.
- No pay-to-win.
- No pay-to-rank.
- No pay-to-friendship.
- No Mojang or Microsoft affiliation claim.
- No production readiness claim.
- No production go.

## Architecture Layers

- Community World Core: shared abstraction for persistent community worlds.
- Minecraft Adapter: first future adapter target for Minecraft-specific events.
- Identity Link: review-based candidate mapping between community identity and
  game username.
- Moderation Gate: prevents unsafe chat, grief claims, doxxing, harassment, and
  minor-safety risks from becoming ordinary memory or public recognition.
- Memory Gate: separates memory candidates from approved memory.
- Event Engine: turns approved safe summaries into stream reactions and recap
  candidates.
- Recap Engine: exports safe community summaries without raw payloads.
- Compliance Gate: blocks unofficial affiliation, monetization, privacy, and
  readiness overclaims.

## Required Schemas

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

## Minecraft MVP

The Minecraft MVP must include:

- IRIS dedicated Minecraft world policy.
- Whitelist participation policy.
- Manual or fixture-based Minecraft event summary ingest.
- YouTube chat to Community World event reference.
- Optional Discord role or YouTube membership eligibility status.
- Minecraft username link candidate.
- Viewer contribution ledger.
- Build registry safe summary.
- Weekly resident record.
- IRIS memory candidate from safe contribution.
- Public recognition candidate.
- Moderation and rollback request summary.
- No direct Minecraft command execution.
- No autonomous real game control.
- No real server automation.
- No production readiness claim.

## Memory Policy

- IRIS may remember safe contribution summaries.
- IRIS must not remember raw Minecraft chat.
- IRIS must not remember private identifiers.
- IRIS must not expose exact coordinates that reveal private structures.
- IRIS must not expose moderation raw notes.
- IRIS must not expose raw grief evidence.
- IRIS must not store sensitive personal disclosures as ordinary memory.
- IRIS must separate `memory_candidate` from approved memory.
- IRIS must support suppression, correction, and forget paths.
- IRIS must use recall cooldown.
- IRIS must preserve newcomer friendliness.

## Public Recognition Policy

Recognition is contribution-based, safe, non-exclusive, and non-ranking.

Allowed examples:

- first member memorial marker
- weekly build introduction
- thanks for collaborative work
- short praise for event participants
- thanks for first support

Forbidden examples:

- payment ranking
- relationship ranking
- exclusive friendship
- romantic escalation
- public shame
- grief accusation without moderator review
- minor-targeted special intimacy
- private identity exposure
- ranking by play time
- ranking by money
- ranking by closeness to IRIS

## Monetization Policy

- No pay-to-win.
- No pay-to-rank.
- No pay-to-friendship.
- Payment must not grant gameplay advantage.
- Payment must not increase relationship.
- Payment must not grant exclusive intimate access.
- Paid access or benefits require Minecraft commercial policy review before
  launch.

## Minecraft Unofficial Notice Policy

This is an unofficial Minecraft community project.

This project is not approved by, sponsored by, or associated with Mojang or
Microsoft.

No IRIS page may imply Mojang or Microsoft sponsorship, approval, affiliation,
or official status without written permission.

## YouTube Transparency and Live Moderation Policy

IRIS is an AI character that talks and reacts with operator-supervised safety
boundaries.

Use subscriber-only chat, members-only chat, approved users, moderators,
held-for-review chat controls, and slow mode when needed.

Operator escalation is required for minor safety, harassment, doxxing, grief
reports, and privacy risk.

## Safety Policy

- `candidate` is not executable.
- `input_action_candidate` must not reach Game Adapter.
- `approved_game_input_action` is the only schema accepted by Game Adapter.
- Viewer suggestion is not a command.
- Minecraft chat is not stored as raw memory.
- Private viewer IDs are not public.
- Relationship score is not public.
- Payment does not increase relationship.
- Payment does not grant game advantage.
- Public recognition is not ranking.
- Owner confirmation is required before production go.
- Fresh real evidence is required before production readiness.
- Fixture PASS is not production readiness.
- Mock PASS is not production readiness.
- Local PASS is not production readiness.
- Target gate PASS is not production readiness.
- priority1 remains BLOCKED.

## Required Gates

- `community_world_core_schema_gate`
- `minecraft_identity_link_gate`
- `minecraft_server_participation_policy_gate`
- `minecraft_chat_safe_ingest_gate`
- `minecraft_contribution_ledger_gate`
- `minecraft_build_registry_gate`
- `minecraft_event_lifecycle_gate`
- `minecraft_moderation_grief_rollback_gate`
- `minecraft_memory_recall_policy_gate`
- `minecraft_public_recognition_no_ranking_gate`
- `minecraft_monetization_no_pay_to_win_gate`
- `minecraft_unofficial_commercial_policy_gate`
- `community_recap_safe_export_gate`
- `community_world_anti_parasocial_gate`
- `community_world_minor_safety_gate`
- `community_world_no_direct_command_gate`
- `community_world_no_raw_chat_memory_gate`
- `community_world_owner_review_gate`
- `community_world_pay_to_rank_guard`
- `community_world_newcomer_friendliness_gate`
- `community_world_recall_cooldown_gate`

## K1001-K1020 Proposed New Chapter

- K1001 Community World Core schema
- K1002 Game account identity link candidate
- K1003 Minecraft participation whitelist gate
- K1004 Minecraft in-game chat safe ingest
- K1005 Minecraft contribution ledger
- K1006 Minecraft build registry
- K1007 Minecraft world event ledger
- K1008 Minecraft event lifecycle plan
- K1009 Minecraft grief rollback moderation gate
- K1010 Minecraft public recognition no-ranking policy
- K1011 Minecraft memory recall policy
- K1012 Community recap safe export
- K1013 Minecraft unofficial notice gate
- K1014 Minecraft commercial policy gate
- K1015 Community World anti-parasocial guard
- K1016 Community World minor safety guard
- K1017 Community World monetization no-pay-to-win guard
- K1018 Minecraft server rule disclosure gate
- K1019 Community World fixture regression pack
- K1020 Community World MVP completion review hook

## MVP Acceptance Criteria

- Specification exists.
- No runtime implementation is added.
- No Minecraft plugin is added.
- No production readiness is claimed.
- No direct game command execution is introduced.
- No raw chat storage is introduced.
- No private IDs are exposed.
- No pay-to-win path exists.
- No pay-to-rank path exists.
- No pay-to-friendship path exists.
- Minecraft unofficial notice policy is specified.
- Commercial policy review is required for paid access or benefits.
- Identity linking is candidate and review based.
- Contribution ledger is safe summary only.
- Memory candidates are separated from approved memory.
- Public recognition is non-ranking and non-exclusive.
- Moderation and rollback policy exists.
- Anti-parasocial policy exists.
- Minor safety policy exists.
- priority1 remains BLOCKED.

## Future Implementation Order

1. Spec-only addition.
2. Schema fixtures only.
3. Manual event summary ingest.
4. Identity link candidate.
5. Minecraft server policy.
6. Optional Minecraft adapter after safety fixture pass.
7. Real server preflight only after owner authorization and fresh evidence.
