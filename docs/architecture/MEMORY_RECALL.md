# Memory Recall

Memory recall is the current Phase21 MVP export.

It reads approved memory records and selects read-only references for possible recall:

```text
schema: iris_memory_recall_v1
internal_profile: true
recall_decision
selected_memory_ids
recall_reference_policy
recall_phrase_hint
privacy_filter_result
community_memory_mix
recall_reject_reason
```

## Boundary

`selected_memory_ids` are references only. They are not commit inputs and are not used to update or delete memory.

The export must not contain:

```text
world_command
input_action
input_action_candidate
execute
commit
write
apply
memory_write
direct_memory_write
commit_memory
approved_memory_record
memory_candidate
relation_score
```

## Selection

The MVP scores approved records against the current text, filters private or sensitive summaries, then applies a short runtime cooldown so the same memory is not recalled repeatedly.

Privacy filtering uses the shared `privacyGuards` helpers so Phase21, Phase26, and candidate review summaries apply the same conservative sensitive/private signal checks.

The response provider can also receive an `iris_approved_memory_prompt_summary_v1` summary when the
current text or game observation is relevant to a public/low-sensitivity memory. This prompt
contains only sanitized summaries, never memory IDs, selected-memory arrays, raw candidates,
approved records, or private records. It lets IRIS naturally mention a past game moment during live
play while Phase21 still keeps its own read-only recall audit.
Approved-memory summaries that contain endpoint-like text, token-like text, credential labels,
candidate markers, command markers, or commit/write markers are treated as sensitive and are not
selected for prompt summaries or public memory views.

Recall can happen when:

```text
topic overlap is high
the viewer asks to remember something
the memory is public or low sensitivity
the memory was not just recalled
```

Supported long-term memory types include:

```text
game_experience
stream_experience
media_watch_experience
community
relationship
episodic
semantic
short_term
```

`media_watch_experience` recall must stay rights-safe: it can mention IRIS's reaction or the shared stream moment, but it must not reproduce dialogue, subtitles, lyrics, or existing melodies.

`game_experience` records come from approved Phase26 carryover candidates. They keep bounded
gameplay context such as title, scene, player state, and detected labels so IRIS can later refer to
past play without storing screenshots, raw OCR, or input-action candidates.

## Public State

Runtime returns the full internal export to server-side code and tests. Public stream state is sanitized:

```text
recall_decision
selected_memory_count
recall_phrase_hint
privacy_filter_result
community_memory_mix
recall_reject_reason
```

It does not expose raw `selected_memory_ids`.

## Local Search Index

`searchApprovedMemoryRecords(...)` provides a local lexical search surface for approved memory
records. It is intended as a safe development substitute before a production vector memory backend
is connected.

The HTTP server exposes:

```text
GET /memories?type=game_experience&owner_scope=shared_stream&q=Minecraft
GET /memory-search?query=game&limit=5
```

Memory lists and search results are read-only public summaries. They include:

```text
memory_id
memory_type
owner_scope
relevance_score
freshness
summary_hint
```

Private/sensitive records are filtered through the same privacy guards used by Phase21 recall. The
search result never exposes raw approved records, selected recall IDs, candidates, commands, commits,
or canonical Core fields.

`IRIS_MEMORY_SEARCH_ADAPTER=http_vector` can connect a local vector-search bridge. The runtime sends
only sanitized public approved-memory summaries and requires the bridge to return memory IDs and
scores only. Runtime then maps those IDs back to local approved-memory summaries, so the bridge
cannot inject raw memory, commits, candidates, or canonical fields into public search results.
The vector bridge endpoint must be loopback/private-network scoped. External or malformed targets
are rejected before fetch as `local_endpoint_policy_blocked`, and public status/probe surfaces
expose only fixed scope/status labels rather than the configured URL.
`IRIS_MEMORY_SEARCH_TIMEOUT_MS` falls back to 5000ms when malformed and is clamped to 100..60000ms;
search limits fall back to 5 and are clamped to 1..20 before the bridge request is built.
Non-OK vector bridge responses are summarized without reading their response bodies, so failed
searches cannot echo private memory summaries, candidates, endpoint values, or secrets through
error details.
Successful vector bridge responses are also treated as untrusted: `vector_provider` / provider
labels are reduced to safe local labels, and unsafe label values containing endpoints, tokens,
candidate markers, commit/write markers, or canonical envelope markers fall back to fixed defaults
before they reach public search results.
