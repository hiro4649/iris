# Speech Cue

Speech cue is the first MVP layer for expressive voice and lip-sync timing.

It is not canonical action, not memory, and not a command.

## Output

Runtime converts the safe Phase15 final output into:

```text
schema: iris_speech_cue_v1
prosody_style
pace
pitch
volume
breathiness
estimated_duration_ms
laugh_breaths
pause_points
mouth_cues
adapter_validation_required
```

Addendum 2026-04-30-04 adds companion read-only profiles generated from the same safe final
output:

```text
iris_speech_rate_profile_v1
iris_language_profile_v1
iris_subtitle_cue_v1
iris_tongue_twister_mode_v1
```

These profiles do not replace `speech_cue`. They refine TTS rate, pronunciation/language, subtitle
timing, and short bounded tongue-twister behavior while preserving the same adapter-only boundary.
The language profile currently targets 21 configured languages, including German, Bengali, Urdu,
Tamil, Javanese, and Polish.

Tongue-twister mode selects an `iris_tongue_twister_line_v1` entry from a local 21-language
catalog. Each entry is a short IRIS-original phrase with a max attempt duration, one-retry recovery
policy, subtitle-sync requirement, and adapter mouth-sync validation requirement. The catalog is
not a provider output and cannot contain game-input candidates, memory commits, relationship
updates, canonical action fields, or world commands.

Examples:

```text
natural_speech
laughing_speech
```

## Boundary

Speech cue must not contain:

```text
action_type
intent
world_command
input_action
input_action_candidate
execute
commit
write
apply
```

The TTS adapter can consume it only as timing/prosody guidance. Live2D lip-sync can consume `mouth_cues`, but no adapter may treat it as a command source.

Speech rate, language, subtitle, and tongue-twister profiles follow the same rule. They must not
contain canonical action fields, game input candidates, memory commits, relationship updates, or
world commands.

## Local Overlay

The local overlay reads `last_speech_cue.estimated_duration_ms` from `/state` and uses it to keep the text bubble visible for roughly the expected speech duration.
When `last_subtitle_cue` is present, the overlay displays the subtitle text and uses the cue's
language direction, safe area, and timing hints.
`subtitle_cue.readability_profile` is a safe summary for adapters and diagnostics: language,
visible character count, chunk count, max chunk length, average chunk duration, fast-speech mode,
and overflow risk. It must not contain candidates, commands, commits, or canonical Core fields.
