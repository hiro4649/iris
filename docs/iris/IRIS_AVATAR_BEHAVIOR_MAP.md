# IRIS Avatar Behavior Map

Status: foundation contract summary
Authority: avatar guidance only. It does not override Phase04 action ownership or Adapter validation.

Avatar behavior is an internal profile for expression and rendering. It is not a command source, memory writer, relationship writer, or game input owner.

## Fields

`speech`
Safe speech text from the final response layer. If the upstream output is silent, this must stay null or empty. The avatar contract must not invent speech.

`emotion`
Internal emotional guidance for expression selection. It must not redefine Phase00 canonical `emotion`.

`facial_expression`
Face guidance such as neutral, warm smile, focused, surprised, or laugh recovery.

`gesture`
Body or hand guidance for rendering. It is adapter guidance only.

`gaze`
Audience, screen, down, side, or return-to-user guidance. It must not imply external observation truth.

`voice_tone`
TTS delivery guidance such as calm, warm, playful, careful, or energetic. It must not redefine canonical `tone`.

`memory_reference`
Safe summary of whether memory influenced the expression. It must not include raw memory, memory IDs, candidates, private viewer data, or selected recall IDs.

`confidence`
Bounded confidence for avatar presentation. Low confidence should reduce assertion strength and may move gaze or tone toward careful delivery.

`inner_intent`
Internal-only explanation of the avatar's expressive intention. It may exist inside server-side internal avatar response objects.

## Public Projection

Public response text, public JSON, public logs, overlays, browser UI, and external adapter status must not include `inner_intent`.

Public projection may include safe avatar fields, but only after removing `inner_intent` recursively and validating that no command, candidate, commit, secret, endpoint, or raw payload marker is present.

## Silent Output

If the turn is silent, avatar speech must remain null or empty.

Adapters may still receive safe non-speech presence guidance, such as gaze or idle breathing, but they must not synthesize spoken content.
