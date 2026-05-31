# IRIS Implementation Schedule

This document records implementation schedules that are specification-only until
a later PR explicitly adds tests or runtime code. It does not perform production
go. priority1 remains BLOCKED.

## Licensed Character Voice Implementation Schedule

This schedule implements the IRIS licensed character voice boundary in staged
work. It preserves TTS adapter boundary, official voice license gate,
placeholder/fallback separation, and fixture/real evidence separation.

### Stage A: Docs/Spec-Only

- Add Character Voice Source Policy.
- Add this implementation schedule.
- Do not change runtime code.
- Do not change workflows.
- Do not change package or lockfiles.
- Do not perform production go.
- Keep priority1 BLOCKED.

### Stage B: Configuration and Profile Contract Fixtures

Official voice config accepts:

- `IRIS_LOCAL_TTS_ENGINE_VOICE_ID`
- `IRIS_LOCAL_TTS_ENGINE_MODEL`
- `IRIS_LOCAL_TTS_ENGINE_LOCALE`
- `IRIS_CHARACTER_VOICE_PROFILE_ID`
- `IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID`
- `IRIS_LICENSED_VOICE_SOURCE_STATUS`

- VOICEVOX-fixed Core assumptions fail.
- VOICEVOX-specific speaker ID remains adapter-internal only.
- Phase00 canonical enum is not expanded.
- Unknown or unsafe voice keys fail or are ignored safely.

### Stage C: License Gate Fixtures

- `licensed` allows official voice selection.
- `missing`, `unverified`, `expired`, `blocked`, and
  `operator_attention_required` do not allow production official voice.
- Unsafe license status falls back to placeholder or voice-disabled state.
- Placeholder success does not become production voice readiness.
- Owner confirmation and fresh evidence remain required for production
  readiness.

### Stage D: TTS Packet Sanitizer Fixtures

TTS packet allows only safe voice/model/locale/profile/style hints.

TTS packet rejects:

- `world_command`
- `input_action_candidate`
- `approved_game_input_action`
- memory commit
- relationship commit
- endpoint
- API key
- token
- raw audio
- dataset path
- internal model path
- raw phoneme debug log
- raw vendor diagnostics

### Stage E: Public/Admin Redaction Fixtures

- Public logs expose safe status labels only.
- Admin ordinary view exposes safe status labels only.
- Readiness reports expose configured/missing/licensed/placeholder/
  operator_attention_required only.
- raw voice sample, generated audio body, training dataset, model path,
  endpoint, token, API key, contract detail, and voice actor personal
  information never appear.

### Stage F: Adapter Integration

- VOICEVOX support, if present, remains inside a VOICEVOX adapter.
- Core remains vendor-neutral.
- Licensed official voice source remains selectable by config.
- Unsupported engine/model/locale/profile combinations safely degrade.
- Real voice readiness remains separate from fixture pass.

### Stage G: Production Readiness Integration

Official licensed voice requires:

- license status licensed
- fresh TTS engine evidence
- voice source readiness
- owner confirmation
- audit readiness
- safe fallback path

Fixture success, placeholder success, mock success, and local synthetic voice
success do not claim production readiness by themselves.
priority1 remains BLOCKED until real evidence and owner confirmation are
present.

## Licensed Character Voice K Requirement Alignment

- K001 TTS adapter guidance sanitization boundary
- K002 voice readiness safe summary
- K011 TTS voice source safe status boundary
- K012 TTS packet unsafe field sanitizer
- K021 TTS voice env public summary
- K022 TTS voice profile allowlist
- K023 TTS raw audio leak guard
- K029 voice readiness operator attention status
- K030 voice fallback placeholder policy
- K236 voice product license readiness
- K265 voice quality match status
- K268 voice license category readiness
- K294 TTS fixture packet preview sanitizer
- K327 TTS adapter voice hint allowlist
- K328 TTS adapter unsupported voice reject
- K329 TTS adapter raw audio rejection
- K330 TTS adapter source status fallback
- K441 Voice pipeline contract manifest
- K443 Voice pipeline unsupported locale degrade
- K450 Voice pipeline operator attention summary
- K558 voice rights status E2E
- K596 Voice license anime E2E
- K621 TTS real engine connector preflight
- K623 TTS real engine placeholder separation
- K624 TTS real engine rights gate
- K731 TTS live readiness checklist
- K733 TTS live readiness license gate
- K734 TTS live readiness placeholder separation

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
