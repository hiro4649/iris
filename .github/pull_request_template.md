# IRIS Pull Request Checklist

## Scope

- [ ] This PR is limited to the requested task.
- [ ] No broad refactor, rename, move, deletion, or dependency addition is included.
- [ ] IRIS runtime/readiness logic is unchanged unless explicitly requested.
- [ ] Docs/report/spec files are unchanged unless explicitly requested.

## Readiness Safety

- [ ] No readiness sweetening.
- [ ] Fixture/local bridge evidence is not treated as real ready evidence.
- [ ] `production_ready_allowed=false` is maintained.
- [ ] `go_no_go=no_go` is maintained unless a separate owner-approved production decision is in scope.
- [ ] No production ready declaration is made.

## Secret And Artifact Safety

- [ ] No secret/API key/token/private key values are added.
- [ ] `.env.local` is not committed.
- [ ] Runtime artifacts are not committed.
- [ ] Live2D SDK/model assets are not committed unless explicitly approved for that repository.
- [ ] No raw payload, raw command, raw memory, raw vector, raw OBS event, raw frame, or OCR text is exposed.

## Validation

Targeted Node verification:

```text
<script or check label only, no secret values, no endpoint values>
```

Result:

```text
<PASS / BLOCKED / NOT RUN with reason>
```

`git diff --check`:

```text
<PASS / NOT RUN with reason>
```

## Residual Risk

```text
<remaining BLOCKED items, external proof waiting, owner/operator review waiting, or none>
```

