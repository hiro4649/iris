# IRIS Implementation Schedule

This document records implementation schedules that are specification-only until
a later PR explicitly adds tests or runtime code. It does not perform production
go. priority1 remains BLOCKED.

## Game/Tool Adapter Contract Implementation Schedule

This schedule implements the IRIS Game/Tool Adapter Contract in staged work. It
preserves the Core/Adapter boundary, candidate/approved action separation, and
fixture/real evidence separation.

### Stage A: Docs/Spec-Only

- Add the Game/Tool Adapter Contract.
- Add this implementation schedule.
- Do not change runtime code.
- Do not change workflows.
- Do not change package or lockfiles.
- Do not perform production go.
- Keep priority1 BLOCKED.

### Stage B: Contract Fixtures

- Candidate direct Adapter handoff fails.
- Approved action handoff passes.
- Raw `world_command`, endpoint, token, raw command, and raw payload leaks fail.
- Stale observation action candidate fails.
- Fixture pass does not become real ready.
- `input_action_candidate` cannot reach any Adapter.
- Candidate payload cannot be public or persisted as approved execution.

### Stage C: Adapter Capability Manifest Preflight

- Action allowlist.
- Safe map status.
- Manual approval default.
- Emergency stop requirement.
- Cooldown requirement.
- Public safe summary.
- Unknown action labels rejected.
- Dynamic capability registration requires audit and approval before trust.

### Stage D: Game Adapter Integration

- `approved_game_input_action` only.
- Adapter-internal `world_command` conversion only.
- Safe result summary only.
- No raw command public/Admin ordinary output.
- No raw response, raw screen, endpoint, token, private path, or payload in
  Core, public output, or ordinary Admin output.
- Adapter execution requires approved schema, fresh observation, cooldown pass,
  emergency stop readiness, and audit reference.

### Stage E: Production Readiness Integration

- Real adapter fresh evidence.
- Owner confirmation.
- Emergency stop.
- Audit readiness.
- Fixture/real split.
- Manual approval or approved_safe_adapter operating mode.
- priority1 remains BLOCKED until real evidence and owner confirmation are
  present.
- Fixture success, mock success, simulator success, and manual operator testing
  do not claim production readiness by themselves.

### Stage F: Future E2E

- Game observation to commentary.
- Commentary not directly input.
- Candidate to approved action.
- Adapter handoff.
- Public leak scan.
- Production no-sweetening.
- Real readiness remains separate from fixture pass.

## K Requirement Alignment

This schedule aligns with:

- K006 input_action_candidate approved boundary
- K079 external observation non-truth boundary
- K082 manual approval default
- K083 approved game input schema separation
- K171 available action allowlist
- K172 stale observation guard
- K177 manual approval audit cue
- K178 approved safe adapter readiness gate
- K346 game adapter approved input packet
- K529 game adapter approved input E2E
- K603 fixture mode isolation
- K814 fixture evidence separation
- K891 priority1 blocker persistence
- K992 priority1 BLOCKED persistence after K900

## Readiness Boundary

This schedule does not claim runtime readiness. It does not claim production
readiness. It does not perform production go. It keeps priority1 BLOCKED until
the required real evidence, owner confirmation, emergency stop readiness, and
audit readiness are present.
