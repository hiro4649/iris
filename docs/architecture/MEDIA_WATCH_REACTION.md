# Media Watch Reaction

Media watch reaction is the current implementation of the 2026-04-30-02 non-game media addendum.

`normalizeMediaWatchObservation` converts read-only video observations into:

```text
payload_kind: media_watch_observation
source: media_watch
media_kind
media_title
observation_summary
detected_mood
confidence
rights_risk_note
```

Runtime then creates:

```text
schema: iris_media_watch_reaction_v1
internal_profile: true
reaction_mode
media_commentary_plan
expression_profile_hint
motion_profile_hint
media_memory_candidate
rights_guard_result
```

## Boundary

Media observations are read-only. They must not become game input, world commands, or direct memory writes.

The memory candidate is validation-gated:

```text
candidate_kind: media_watch_memory_candidate
requires_validation: true
memory_type: media_watch_experience
```

The rights guard blocks long dialogue, subtitles, lyrics, or existing melody reproduction. Stored summaries should capture only IRIS's reaction and the shared stream moment.

## HTTP Media Watch Source

`createHttpMediaWatchSource(...)` can poll a local media-analysis bridge and normalize the response
into the same read-only event. Configure it with:

```text
IRIS_MEDIA_WATCH_ENDPOINT=http://127.0.0.1:9005/media/latest
IRIS_MEDIA_WATCH_API_KEY=
IRIS_MEDIA_WATCH_TIMEOUT_MS=5000
```

Invalid numeric timeout values fall back to 5000ms and are clamped to 100..60000ms. `nextBatch`
performs at most one bridge fetch per call and clamps its limit to 1..50 with a default of 10, so a
bad caller value cannot disable polling or create an unbounded media bridge loop.
The source exposes a counts-only `status()` with request count, last item count, fixed error kind,
and error timing. Non-OK bridge responses are summarized as HTTP-status failures without reading
response bodies.

Accepted bridge shapes:

```text
{ observation: { media_kind, media_title, observation_summary, detected_mood, confidence } }
{ observations: [ ... ] }
{ media_watch_observation: { ... } }
{ media_title, observation_summary, ... }
```

The bridge must return bounded summaries only. IRIS rejects raw video/audio blobs, base64 media,
subtitle or caption text, transcript dumps, lyrics, commands, candidates, direct memory writes,
relationship writes, and canonical Core fields.
