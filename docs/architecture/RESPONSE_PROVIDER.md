# Response Provider

IRIS Core does not call an LLM directly from a phase.

The response draft is produced by a provider before Phase14:

```text
Phase01-13 context
-> response provider
-> responseDraft
-> Phase14 semantic/naturalness surface
-> Phase15 final guard
```

## Providers

### mock

Default provider. It is deterministic and local.

```text
IRIS_RESPONSE_PROVIDER=mock
```

The mock provider includes a small rights-safe localized reaction catalog for the 21 configured
`language_profile` languages. It can answer short greetings, listening states, donation thanks,
media-watch holds, external-topic holds, game-observation commentary, and light funny reactions in
the requested/input language. This is local MVP behavior for testing subtitles, language routing,
and TTS adapter guidance; production personality depth still belongs behind a real response
provider.

When a comment requests a tongue twister, the mock provider uses the local
`iris_tongue_twister_line_v1` catalog instead of free-form generation. The returned text is only the
short setup, original phrase, and recovery line so subtitle timing and fast speech remain bounded.

### http

Generic HTTP provider. This is intentionally not tied to a specific vendor.

```text
IRIS_RESPONSE_PROVIDER=http
IRIS_RESPONSE_ENDPOINT=http://localhost:8787/iris-response
IRIS_RESPONSE_API_KEY=
IRIS_RESPONSE_MODEL=iris-default
IRIS_RESPONSE_TIMEOUT_MS=15000
```

The endpoint receives:

```json
{
  "model": "iris-default",
  "input": {
    "role": "IRIS",
    "constraints": [],
    "commentText": "string",
    "requestedLanguage": "ja | en | ... | null",
    "detectedLanguage": "ja | en | ... | null",
    "responseLanguageHint": "ja | en | ...",
    "intent": "respond",
    "emotion": "neutral",
    "tone": "friendly",
    "character_tag": "soft",
    "goal": "STRENGTHEN_RELATION",
    "strategy": "engage",
    "payloadKind": "comment | game_observation | donation_event | media_watch_observation | external_topic_observation",
    "displayName": "viewer display name or null",
    "recentMemorySummary": "",
    "viewerRelationshipSummary": "safe relationship summary or null",
    "gameStateSummary": "safe game observation summary or null",
    "externalTopicSummary": "safe topic summary or null",
    "affectSnapshot": {
      "schema": "iris_affect_snapshot_v1",
      "energy": 0.42,
      "amusement": 0.22,
      "focus": 0.48,
      "warmth": 0.54,
      "affect_label": "settled",
      "last_trigger": "conversation"
    },
    "personaProfileSummary": "style guidance only",
    "contextBoundary": {
      "summary_only_context": true,
      "no_raw_candidates": true,
      "no_direct_memory_commit": true,
      "no_game_input_authority": true,
      "no_adapter_authority": true
    }
  },
  "metadata": {
    "phase": "response_draft",
    "trace_id": "uuid",
    "event_id": "uuid"
  }
}
```

`recentMemorySummary` is built by `iris_approved_memory_prompt_summary_v1` when a public approved
memory is relevant to the current turn. The summary contains only sanitized text, never memory IDs,
selected-memory arrays, raw candidates, approved records, or commit/write authority. Phase21
`memory_recall` remains the auditable read-only recall export with cooldown and privacy filtering.

`personaProfileSummary` is supplied from the static IRIS persona profile. It is style guidance only and must not be treated as canonical state, memory approval, or adapter authority.

The HTTP provider also receives summary-only context for the current payload, relationship, game
state, external topic, and affect snapshot. These fields are for wording and timing only. They are
not candidates, approvals, adapter packets, memory commits, or game-control authority.

Before any provider receives context, IRIS reduces user identity and remembered context to safe
wording hints. Display names that look like endpoints, tokens, credentials, command markers,
candidate markers, or commit/write markers fall back to `viewer`. Relationship summaries, memory
summaries, game-state summaries, and vision labels with the same unsafe signals are omitted rather
than echoed into the response draft. This keeps YouTube relay data, vision bridge metadata, and
long-term memory from becoming prompt-injected speech.

The endpoint may return one of:

```json
{ "text": "response text" }
```

```json
{ "output_text": "response text" }
```

```json
{ "choices": [{ "message": { "content": "response text" } }] }
```

## Firewall

The response draft is rejected if it contains:

- `world_command`
- `execute`
- `commit`
- `write`
- `apply`

This keeps provider output from becoming an action, memory commit, or adapter command.

For HTTP providers, the raw response JSON is also checked before text extraction. It is rejected if
any nested field contains commands, game-input candidates, approved game actions, memory writes,
relationship updates, selected memory IDs, commits, or execution/apply methods. The provider may
return text, but it cannot return side-effect authority.
