# External Topic Reaction

`external_topic_observation` is the read-only input shape for news, trends, and current topics that have already been fetched by an external source.

IRIS treats these topics as conversation seeds, not verified truth. The runtime creates `external_topic_reaction` with:

- `reaction_mode`
- `topic_commentary_plan`
- expression and motion hints
- `truth_guard_result`

The truth guard prevents direct factual assertion, game input generation, and memory or relationship commit. High-risk categories such as medical, legal, financial, harm, violence, and politics use a cautious hold profile.

The local HTTP endpoint is:

```text
POST /external-topic
```

The scenario runner supports:

```json
{ "kind": "external_topic" }
```

This feature is intentionally separate from real web fetching. Production news ingestion should be added behind a source adapter that provides freshness, source trust, URL, and risk metadata.

## HTTP External Topic Source

`createHttpExternalTopicSource(...)` can poll a local news/trend bridge that performs fetching and
summarization outside IRIS Core. Configure it with:

```text
IRIS_EXTERNAL_TOPIC_ENDPOINT=http://127.0.0.1:9006/topics/latest
IRIS_EXTERNAL_TOPIC_API_KEY=
IRIS_EXTERNAL_TOPIC_TIMEOUT_MS=5000
```

Invalid numeric timeout values fall back to 5000ms and are clamped to 100..60000ms. `nextBatch`
performs at most one bridge fetch per call and clamps its limit to 1..50 with a default of 10,
keeping local news/trend bridges bounded even when a caller supplies a malformed limit.
The source exposes a counts-only `status()` with request count, last item count, fixed error kind,
and error timing. Non-OK bridge responses are summarized as HTTP-status failures without reading
response bodies.

Accepted bridge shapes:

```text
{ topic: { topic_title, topic_summary, source_url, freshness_score, source_trust_score } }
{ topics: [ ... ] }
{ items: [ ... ] }
{ title, summary, url, ... }
```

The bridge must return summary-only observations. IRIS rejects raw article bodies, raw HTML,
verbatim text, commands, candidates, canonical Core fields, direct memory writes, and relationship
writes before the topic reaches runtime.
