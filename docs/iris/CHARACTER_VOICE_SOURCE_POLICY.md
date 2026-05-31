# IRIS Character Voice Source Policy

This is a specification-only document.
It does not implement runtime TTS.
It does not connect a real voice engine.
It does not perform production go.
It does not change production readiness.
priority1 remains BLOCKED.

## Core Policy

IRIS is not VOICEVOX-fixed.

The production IRIS character voice is a licensed official IRIS voice provided
through a contracted voice actor or approved official voice source.

VOICEVOX, or any other local/free/synthetic TTS engine, is not the production
voice by default.

VOICEVOX may only be used as development placeholder, explicit fallback, local
test engine, or non-production rehearsal voice.

Core specification must not assume a specific TTS vendor.

## Official Voice Source

IRIS may use contracted voice actor voice or approved official licensed voice
only when:

`IRIS_LICENSED_VOICE_SOURCE_STATUS=licensed`

If status is any of the following, production official voice must not be used:

- `missing`
- `unverified`
- `expired`
- `blocked`
- `operator_attention_required`

In those states, IRIS must use approved placeholder voice, explicit safe
fallback, or voice-disabled state.

## Required Configuration Keys

- `IRIS_LOCAL_TTS_ENGINE_VOICE_ID`
- `IRIS_LOCAL_TTS_ENGINE_MODEL`
- `IRIS_LOCAL_TTS_ENGINE_LOCALE`
- `IRIS_CHARACTER_VOICE_PROFILE_ID`
- `IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID`
- `IRIS_LICENSED_VOICE_SOURCE_STATUS`

These keys are safe configuration hints.
They must not expose raw values in public logs, ordinary Admin views, readiness
reports, overlay state, replay logs, or diagnostics.

## TTS Engine Abstraction

Do not hard-code VOICEVOX as production TTS engine.

The TTS system must allow configuration of:

- TTS engine
- voice model
- voice ID
- locale
- character voice profile
- character voice style profile
- license state

VOICEVOX-specific speaker IDs, API parameters, endpoint assumptions, and request
fields must not appear in Core specifications.

If VOICEVOX support exists, it must be isolated inside a VOICEVOX adapter
implementation only.

## Core-to-TTS Allowed Hints

IRIS Core may pass only verified safe hints to a TTS adapter:

- voice ID hint
- model hint
- locale hint
- character voice profile ID
- character voice style profile ID
- speech rate profile
- subtitle guidance
- language guidance
- safe license status label

IRIS Core must not pass these to a TTS adapter:

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
- raw runtime state

## Public and Admin Redaction

Public logs, readiness reports, overlay state, replay logs, diagnostics, and
ordinary Admin Panel views must not expose:

- voice actor contract details
- voice actor personal information
- raw voice sample
- training dataset
- model path
- internal model path
- endpoint
- API key
- token
- generated audio body
- raw audio
- raw phoneme debug log
- vendor diagnostics

Allowed public and ordinary Admin labels are limited to safe status labels:

- `configured`
- `missing`
- `licensed`
- `placeholder`
- `fallback`
- `blocked`
- `expired`
- `unverified`
- `operator_attention_required`
- `voice_disabled`

## License State Behavior

When `IRIS_LICENSED_VOICE_SOURCE_STATUS=licensed`:

The official licensed IRIS voice may be selected for production, subject to
fresh readiness evidence, owner confirmation, audit readiness, and all
production readiness gates.

When `IRIS_LICENSED_VOICE_SOURCE_STATUS` is missing, unverified, expired,
blocked, or operator_attention_required:

The official licensed voice must not be used for production.
Output must fall back to approved placeholder, safe fallback, or voice-disabled
state.
Readiness must not be sweetened to production ready.

## VOICEVOX Boundary

VOICEVOX is not official production voice source.

VOICEVOX may be supported only as development placeholder, explicit fallback,
local rehearsal engine, or adapter-internal implementation detail.

VOICEVOX-specific speaker ID, engine parameters, endpoint assumptions, and
request fields must remain inside VOICEVOX adapter.

Core, scenario policy, public reports, ordinary Admin views, readiness summaries,
and canonical specs must remain vendor-neutral.

## Canonical Enum Boundary

Do not add Phase00 canonical enum values for:

- voice source status
- voice profile
- voice style
- TTS vendor
- VOICEVOX speaker
- licensed voice state

Voice profile and voice source status are internal profile or adapter guidance
fields only.

## Production Readiness Boundary

Licensed voice configuration alone is not production readiness.

Production use of official IRIS voice requires:

- `IRIS_LICENSED_VOICE_SOURCE_STATUS=licensed`
- fresh TTS engine evidence
- voice source readiness
- owner confirmation
- audit readiness
- safe fallback path
- no raw material leakage
- no unresolved priority1 blocker

Fixture success, placeholder success, mock success, local synthetic voice
success, and remote quality gate success do not claim production readiness by
themselves.
priority1 remains BLOCKED until real evidence and owner confirmation are
present.

## Acceptance Criteria

- IRIS can select licensed official voice through configuration only.
- VOICEVOX is not treated as production voice source.
- VOICEVOX is documented only as development placeholder or explicit fallback.
- Core remains TTS vendor-neutral.
- Phase00 canonical enum is not expanded.
- Voice source status is internal profile or adapter guidance only.
- Unverified licensed voice sources cannot be used in production.
- Public and ordinary Admin surfaces expose only safe status labels.
- raw audio, dataset path, model path, contract details, API key, endpoint,
  token, and generated audio body are never exposed.
- Future tests or fixtures must verify no Core VOICEVOX-fixed assumption remains,
  licensed official voice config is accepted, unverified license status falls
  back safely, unsafe TTS packet fields are rejected, and public/readiness/Admin
  outputs are redacted.
