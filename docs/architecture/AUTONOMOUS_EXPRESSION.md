# Autonomous Expression

`autonomous_expression` implements the latest cross-phase addendum items for short, human-like side behavior:

- short girlish scream / startle reactions
- happy humming
- happy short dance
- happy loud original vocalise
- looking away, screen peeking, and tiny self-directed motion
- latency bridge behavior when the reply path is under pressure

The export is `iris_autonomous_expression_v1`. It is an internal profile for TTS and Live2D adapter guidance only. It is not a canonical Core enum, not a game input source, and not a memory or relationship writer.

Safety rules:

- screams are short and recover immediately
- dance and singing durations are bounded
- humming and singing cannot use existing melodies or copyrighted lyrics
- all plans reject command, commit, candidate, and canonical fields
- adapter packets may carry the profile as read-only guidance

Latency bridge can trigger from queue pressure, comment density, or measured response latency. When
active it emits only bounded filler guidance such as a short wait phrase, blink, and screen glance;
it never creates a command, memory write, or game action.

Runtime exposes a sanitized copy through `/state` as `last_autonomous_expression`, and replay logs store the same safe structure.
