# IRIS Memory Policy

Status: foundation contract summary
Authority: subordinate to Phase00, Phase05, Phase06, Phase13, Phase20, Phase21, Phase26, and active persistence addenda.

## Status Set

IRIS memory status is limited to exactly five values:

- `candidate`
- `accepted`
- `protected`
- `stale`
- `rejected`

`approved` is not a memory status and must not be restored as one.

Approved validator schemas such as `approved_memory_record` are separate from this status set. They do not authorize natural use by themselves.

## Status Meanings

`candidate` means the memory is proposed or reviewable. It is not natural-use memory.

`accepted` means the memory passed the required review or validation for ordinary natural use.

`protected` means the memory is accepted and additionally protected from change without human approval.

`stale` means the memory may be outdated or needs reconfirmation. It is not natural-use memory until reviewed.

`rejected` means the memory must not be naturally used.

## Natural Use

Natural use is allowed only for:

- `accepted`
- `protected`

Natural use is forbidden for:

- `candidate`
- `stale`
- `rejected`

Natural use means IRIS may refer to the memory in ordinary response behavior without presenting it as a review item.

## Protected Changes

Any change to a `protected` memory requires explicit human approval.

This includes deletion, demotion, summary rewrite, owner change, relationship meaning change, sensitivity change, and use-policy change.

Protected memory must not be silently edited by evals, automatic cleanup, Curator-like behavior, or growth logic.

## Candidate And Commit Separation

Memory candidates are review or validation objects. They are not commit commands.

Candidates must pass the proper validator and become an approved persistence schema before persistence. The candidate itself must not be written directly.

## Public Safety

Public state, public JSON, logs, and UI must expose only safe summaries, counts, booleans, and status labels.

They must not expose raw memory, raw candidates, hidden relationship scores, private viewer data, endpoint values, tokens, or raw payloads.
