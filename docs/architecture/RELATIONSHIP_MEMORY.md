# Relationship Memory

Relationship memory is currently a local MVP system for viewer-specific familiarity.

## Boundary

Phase05 creates a `relationship_candidate`.

The candidate is not a commit command and must keep:

```text
requires_validation: true
```

It must not contain:

```text
execute
commit
write
apply
world_command
```

Only after Phase15 returns a safe final output can the persistence layer convert that candidate into:

```text
approved_relationship_record
```

Only the relationship writer can update the JSON relationship store.

## Local Store

The local store is configured through:

```text
IRIS_ENABLE_RELATIONSHIP_MEMORY=true
IRIS_RELATIONSHIP_STORE_PATH=data/relationship_store.json
IRIS_RELATIONSHIP_STORE_MAX_PROFILES=5000
IRIS_RELATIONSHIP_RECENT_SUMMARY_LIMIT=5
```

The JSON writer creates parent directories and writes through a temporary file before replacing the
store file, so local development is less likely to leave a partially-written relationship store after
an interrupted process.
Each successful write also refreshes a sidecar `.bak` copy. If the primary relationship JSON becomes
unreadable and the sidecar is still valid, the store can recover profile counts and continue through
the approved writer path without exposing profile payloads, paths, or raw error messages.
The memory and relationship stores also expose a counts-only `persistence_operation_status` with
operation health, attempt count, success count, error count, latest success timestamp, and fixed
error kind. This lets `/persistence/status` show whether approved persistence is actually flowing
without revealing approved record payloads, profile summaries, local paths, candidates, or raw
exceptions.

The store is bounded for local MVP operation. It keeps the newest profiles by
`last_interaction_at_ms` and limits each profile's recent summaries to the configured count. This
keeps long-running live tests from growing the JSON file indefinitely while preserving the approval
boundary: relationship candidates are still not write commands, and only approved relationship
records can reach the writer.
Invalid numeric retention values fall back to the default 5000 profiles and 5 recent summaries.

Approved relationship records are idempotent by stable event/source key. If a replay, retry, or
overlapping ingest path submits the same approved relationship record again, the writer keeps the
existing profile and does not increase `interaction_count`, `affinity_score`, or
`familiarity_score` a second time. The internal committed-key list is not part of public
relationship summaries.
The JSON relationship writer rejects direct unapproved shapes: callers must provide an
`approved_relationship_record`. `relationship_update_candidate` objects remain validation inputs
only and cannot be used as a persistence shortcut.

The store aggregates per-viewer:

```text
display_name
affinity_score
familiarity_score
interaction_count
recent_summaries
```

Development summaries exposed to response generation are qualitative only. They must not include hidden numeric affinity, familiarity, or relation scores.
If a stored display name or relationship summary contains endpoint-like text, token-like text,
credential labels, command labels, candidate labels, or commit/write labels, the public/profile
view and response-generation summary omit that value or fall back to `viewer`. Relationship memory
can help IRIS recognize a returning viewer without echoing unsafe viewer-supplied identifiers.
The local public profile view also sanitizes unsafe `linked_identity_id` labels to `null`, so
debug/operator surfaces do not leak endpoint strings, credential-looking IDs, candidate labels, or
command markers through viewer identifiers.

Relationship deltas can move both up and down after approval:

```text
positive affinity_delta: warm interaction, shared joke, support/gratitude moment
negative affinity_delta: boundary-needed interaction such as insults or repeated hostility
familiarity_delta: may still increase slightly because IRIS has more history with the viewer
```

Public relationship profiles expose qualitative `relationship_level` only. They must not expose
`affinity_score`, `familiarity_score`, hidden relation scores, viewer ranking, or exclusive
treatment claims. Public `recent_summaries` are filtered through the same privacy guard used by
memory public summaries, so private or sensitive relationship notes are omitted from local profile
inspection output.

The local HTTP server exposes only that sanitized public shape:

```text
GET /relationships?level=recognized&q=Hiro
```

Filters are convenience metadata for local development. They do not expose hidden scores or grant
write authority.

The production readiness status path is stricter than the local profile inspection endpoint:

```text
GET /persistence/status
GET /production/persistence-runtime-status
npm run dev:persistence:runtime-status
npm run dev:persistence:candidate-gate-roundtrip
npm run dev:persistence:status-roundtrip
```

It exposes only enablement flags, counts, retention limits, approved-operation counters, latest
activity timestamps/ages, backup-write counters, runtime readiness, candidate commit flow status,
derived next-check script names, and boundary flags after records have been written. It must not expose
relationship summaries, hidden scores, raw candidates, approved record payloads, endpoint values,
paths, shell fragments, or secrets.

This is still Phase01-15 infrastructure. Phase20 relationship deepening now creates a separate `relationship_update_candidate`, but it is never passed directly to this writer. Phase21/26 long-term memory and recall lifecycle systems must reuse the same approval boundary instead of bypassing it.
