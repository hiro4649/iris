---
name: External readiness proof
about: Track an external proof item that cannot be resolved by fixture or local bridge evidence.
title: "External readiness: <component_label>"
labels: external-readiness, no-go
assignees: ""
---

## Target BLOCKED Component

```text
<safe component label only>
```

## Release Condition

```text
<safe release condition label>
```

## Human Preparation Required

- [ ] API/account preparation
- [ ] Real device or renderer preparation
- [ ] Owner confirmation
- [ ] Operator review
- [ ] Admin/private runner gate review
- [ ] Other safe preparation label:

## Required Env Names

Names only. Do not paste values.

```text
<ENV_NAME_1>
<ENV_NAME_2>
```

## Required Proof Logs

Safe summaries only. Do not paste secret values, endpoint values, raw payloads, raw commands, raw memory, raw vectors, raw OBS events, raw frames, OCR text, or raw chat payloads.

```text
<proof log label or script label>
```

## Go / No-Go Impact

- [ ] Keeps `production_ready_allowed=false` until proof is accepted.
- [ ] Keeps `go_no_go=no_go` until owner-approved production decision.
- [ ] Fixture/local bridge evidence cannot resolve this issue.

## Notes

```text
<safe notes only>
```

