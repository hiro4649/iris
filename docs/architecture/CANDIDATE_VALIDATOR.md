# Candidate Validator

The candidate validator is the explicit boundary between validation-gated runtime candidates and durable persistence.

It converts safe candidates into approved schemas only when:

```text
IRIS_ENABLE_CANDIDATE_PERSISTENCE=true
```

`IRIS_ENABLE_PERSISTENCE=true` remains available for the older Phase05 base persistence path, but
candidate-derived long-term memory and relationship growth use the stricter candidate validator
gate above plus `IRIS_ENABLE_RELATIONSHIP_MEMORY=true` for relationship writes.

Current approved outputs:

```text
approved_memory_record
approved_relationship_record
```

Supported approved memory types:

```text
stream_experience
game_experience
media_watch_experience
community
```

Current candidate sources:

```text
donation_appreciation_memory_candidate
media_watch_memory_candidate
memory_carryover_candidate
community_memory_candidate
relationship_update_candidate
```

## Boundary

Candidates are never committed directly. The validator:

- rejects executable fields
- rejects raw command/canonical fields
- rejects private or sensitive summaries before redaction
- rejects cautious media rights results
- avoids double relationship commits when the Phase05 relationship writer already committed the same turn
- returns public summaries without approved record bodies

Runtime exposes:

```text
last_candidate_validation
last_candidate_persistence
/persistence/status
/production/persistence-runtime-status identity_scope_flow
/production/persistence-runtime-status relationship_value_flow
/production/persistence-runtime-status memory_relationship_lifecycle_flow
```

These contain counts and statuses only. Raw candidates and approved records are not surfaced through public state.
The `/persistence/status` surface also reports a fixed `persistence_readiness_status`:
`disabled`, `configured_waiting_for_records`, `active_with_memory`, `active_with_memory_and_relationships`,
`partial_relationship_memory`, or `attention`. This lets operators distinguish configuration,
store-health, and first-write states without exposing records, summaries, hidden relationship scores,
store paths, candidates, or commit payloads.
`identity_scope_flow` adds a public policy-only summary for the per-user memory boundary: memory
records and relationship updates require an identity scope, relationship value changes require a
validated candidate, approved records are the only durable write input, and candidates remain
review-only.
`relationship_value_flow` is the paired relationship operator view. It reports only relationship
profile counts, relationship-level count distribution, relationship activity age, store operation
health, and policy booleans proving relationship value changes are identity-scoped and
validation-gated. It never exposes viewer IDs, display names, hidden scores, relationship profiles,
record payloads, candidates, store paths, endpoints, or secrets.
`memory_relationship_lifecycle_flow` ties that policy to the approved-record counters, store
durability labels, candidate validation gate, and relationship-memory completeness as counts,
statuses, and booleans only. It is the operator-facing check that long-term memory and relationship
growth are active without exposing viewer IDs, display names, records, profiles, candidates, store
paths, endpoint values, or secrets.

## Persistence

When candidate persistence is disabled, the validator returns `validation_status=disabled` and no records are written.

When enabled, only approved records are passed to the existing persistence writers:

```text
commitApprovedMemoryRecord
commitApprovedRelationshipRecord
```

The local JSON memory and relationship writers create missing directories and replace store files
atomically through temporary files. This keeps approved-record persistence separate from candidate
validation while reducing partial-write risk during local development.
After each successful primary write, the writers also refresh a sidecar `.bak` file. If the primary
JSON file later becomes unreadable but the sidecar remains valid, reads and appends recover from the
backup while public status reports only counts, fixed error kinds, and recovery flags.
If the primary write succeeds but the sidecar backup write fails, public status reports only
`backup_write_health`, write attempt/success/error counts, and a fixed `backup_error_kind`; it does
not expose paths, raw errors, records, profiles, summaries, or hidden scores. Backup-write
attention keeps `persistence_readiness_status` at `attention` until local storage is fixed.
The writers also reject direct unapproved record shapes. If a JSON memory file is manually edited
to contain non-approved records, reads fail as a `store_contract_failed` condition and public status
reports only fixed error kinds and counts, not the unsafe record payload.

The local JSON memory store also applies a retention policy:

```text
IRIS_MEMORY_STORE_MAX_RECORDS=5000
IRIS_MEMORY_STORE_DEDUPE=true
```

The default keeps the newest 5000 stable memory keys and replaces older records with the same
`memory_id` or event/source key. This satisfies the Phase05 requirement that the memory store stays
bounded without letting raw candidates become direct writes.
Runtime candidate approval builds `memory_id` from phase, event ID, candidate kind, and a short
hash of the candidate summary. The hash keeps same-turn candidates of the same kind distinct
without exposing raw summary text in the ID, while replaying the same candidate remains idempotent.
Invalid numeric retention values fall back to the default instead of expanding the store.
The approved memory writer is also idempotent by stable memory/event key. If a replay or retry
submits the same approved memory record again through `commitApprovedMemoryRecord`, it returns
`duplicate_memory_record` and does not append a second durable record or replace the first approved
summary.

The local JSON relationship store applies the same bounded-store idea:

```text
IRIS_RELATIONSHIP_STORE_MAX_PROFILES=5000
IRIS_RELATIONSHIP_RECENT_SUMMARY_LIMIT=5
```

It keeps the newest profiles by interaction time and truncates each public recent-summary list, while
hidden affinity/familiarity scores remain internal and never appear in public status.
Invalid numeric profile or recent-summary limits fall back to the defaults.
Approved relationship records are idempotent by event/source key, so replayed persistence results do
not double-increase viewer familiarity or affinity.
Direct relationship-store upserts require `approved_relationship_record`; relationship candidates
cannot be passed into the writer as a shortcut.

Production readiness treats the persistence path as incomplete unless both candidate persistence
and relationship memory are explicitly enabled:

```text
IRIS_ENABLE_CANDIDATE_PERSISTENCE=true
IRIS_ENABLE_RELATIONSHIP_MEMORY=true
```

If an operator also wants the older base Phase05 persistence path, set
`IRIS_ENABLE_PERSISTENCE=true`; it is listed in `.env.example` and the production config inventory
as an optional legacy/base switch.

This preserves the Phase00 rule that candidate schemas and execution/commit schemas must never be the same type.
