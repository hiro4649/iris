# Adapter Packets

Adapter packets are the validated boundary between Runtime and external systems.

Runtime now sends:

```text
iris_adapter_packet_v1 / tts
iris_adapter_packet_v1 / live2d
iris_adapter_packet_v1 / subtitle
```

Packets contain already-validated cue data:

```text
speech_cue
motion_cue
performance_plan
body_continuity
camera_proximity
turn_rhythm
affective_continuity
personality_habit
expression_profile
autonomous_expression
speech_rate_profile
language_profile
subtitle_cue / subtitle_text
tongue_twister_mode
canonical_envelope
```

## Boundary

Adapter packets must not contain command fields at any depth:

```text
world_command
input_action
input_action_candidate
approved_game_input_action
execute
commit
write
apply
```

TTS and Live2D integrations should consume adapter packets instead of reading Core phase objects directly.

`expression_profile` is read-only style and timing guidance. It can describe voice-engine profiles, breath events, laugh recovery, and Live2D expression keys, but it cannot approve memory writes, relationship updates, game inputs, or canonical action changes.

`camera_proximity` is included only in Live2D packets. It is read-only visual guidance for bounded viewer-facing closeups and must never be treated as an OBS command, OS camera command, game input, memory write, or relationship update.

`autonomous_expression` is read-only style guidance for short screams, humming, compact dance, brief original vocalise, self-directed micro-actions, and latency bridge behavior. It is safe for TTS and Live2D adapters, but it is not a command source and cannot carry candidates or commits.

`speech_rate_profile`, `language_profile`, `subtitle_cue`, and `tongue_twister_mode` are included
in TTS packets. A separate subtitle packet carries the validated subtitle text, line-break plan,
script direction, safe-area policy, and readability guard for OBS/browser subtitle renderers. They
implement the 2026-04-30-04 addendum: natural speech-rate variation, slow-speech repair,
supported-language guidance, subtitle timing, and short bounded tongue twisters. They are read-only
adapter guidance and cannot mutate canonical enums, memory, relationships, game inputs, or OBS
scenes.

`subtitle_cue.readability_profile` gives TTS/overlay adapters a summary of chunk count, visible
character count, max chunk length, average chunk duration, fast-speech mode, and overflow risk. It is
diagnostic timing metadata only; the actual approved text remains `subtitle_text`.

## HTTP Adapters

Generic HTTP adapters can be enabled through env:

```text
IRIS_TTS_ADAPTER=http
IRIS_TTS_ENDPOINT=http://127.0.0.1:9001/tts
IRIS_LIVE2D_ADAPTER=http
IRIS_LIVE2D_ENDPOINT=http://127.0.0.1:9002/live2d
IRIS_SUBTITLE_ADAPTER=http
IRIS_SUBTITLE_ENDPOINT=http://127.0.0.1:9007/subtitle
```

The adapter sends the validated packet as JSON via POST.

HTTP adapter responses are treated as untrusted bridge acknowledgements. Runtime keeps a bounded
`response_summary` and rejects responses that echo runtime packets, raw candidates, approved game
actions, memory commits, relationship commits, commands, or canonical Core fields. A TTS or Live2D
bridge should return operational metadata such as `request_id`, `bridge_status`, `audio_url`, or
`duration_ms`, and a subtitle bridge should return display acknowledgement metadata. Bridges must
not return `canonical_envelope`, `action_type`, `input_action_candidate`, or commit-like fields.

The HTTP adapter summary keeps only bounded operational metadata:

```text
request_id
bridge_status
response_omitted
error_kind
artifact_url
duration_ms
sample_rate_hz
viseme_count
```

This is useful for real TTS/Live2D bridge debugging without giving the bridge authority over Core
decisions, game inputs, memory, relationships, or OBS scenes.
HTTP adapter success responses are still treated as untrusted bridge summaries. IRIS keeps numeric
timing/count fields, but `request_id`, `bridge_status`, generic response strings, and artifact
references are redacted or omitted when they contain endpoint strings, token/secret/password
markers, command-like words, candidate names, or canonical schema echoes. Artifact references are
published only for local `artifact://` or loopback HTTP URLs used by operator-owned bridges.
Failed HTTP bridge responses are reduced to a summary with `response_omitted: true`; their response
bodies are not parsed or copied back into runtime state.

Game control uses a separate adapter boundary, not `iris_adapter_packet_v1`. `IRIS_GAME_CONTROL_ADAPTER=http` posts only `approved_game_input_action` after the Phase24 game action validator approves it.
