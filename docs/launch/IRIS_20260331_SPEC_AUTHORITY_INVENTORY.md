# IRIS 2026-03-31 Spec Authority Inventory

Date: 2026-05-16 JST

Task: IRIS-K-01 Establish 2026-03-31 spec authority inventory.

Checked commit: `b8c1d41394e260ec1c94c51a97f88c0726740ad6` on `codex/iris-k-01-spec-authority-inventory`.

Scope: documentation inventory only. This file does not modify code, Phase responsibility, adapter responsibility, memory responsibility, runtime behavior, or production readiness logic.

## Search Scope

Repo-local locations checked:

- `IRIS_SPEC_AUTHORITY.md`
- `README.md`
- `docs/`
- `docs/specs/`
- `docs/specs/IRIS_20240425/`
- `docs/specs/IRIS_20240425/IRIS_20240425_00.txt` through `IRIS_20240425_07.txt`
- `docs/architecture/`
- `docs/launch/`
- repo-wide filename search for `2026-03-31`, `20260331`, `2026_03_31`, and `IRIS_20260331`
- repo-wide content search for `2026-03-31`, `20260331`, `2026_03_31`, `IRIS_20260331`, and `IRIS 2026-03-31`

## Found Spec Candidates

Found repo-local authority and candidate materials:

- `IRIS_SPEC_AUTHORITY.md`
  - Declares the current numbered Phase specification set as `IRIS_20240425_00` through `IRIS_20240425_27`.
  - Declares Phase00 as root authority.
  - Does not name `IRIS_20260331` or a 2026-03-31 spec set.
- `docs/specs/IRIS_20240425/IRIS_20240425_00.txt` through `IRIS_20240425_07.txt`
  - These are the repo-local Phase00-Phase07 numbered specifications currently referenced by `IRIS_SPEC_AUTHORITY.md`.
  - They are evidence of current repo authority, not proof of the requested 2026-03-31 baseline.
- `docs/architecture/SPEC_MANIFEST.md`
  - Describes completeness expectations for `IRIS_20240425_00.txt` through `IRIS_20240425_27.txt`.
  - Does not define a 2026-03-31 spec set.
- `README.md`
  - States that IRIS is built from `IRIS_20240425` specifications and names `docs/specs/IRIS_20240425/` as canonical.
  - README is not authority over `IRIS_SPEC_AUTHORITY.md`.
- `docs/launch/IRIS_K_FINAL_STATIC_REAUDIT.md` and `docs/launch/IRIS_K_FINAL_REAUDIT.md`
  - Record that the requested 2026-03-31 artifact was not found.
  - These are audit reports, not replacement specifications.

## Missing 2026-03-31 Authority

Not found in the repo:

- `docs/specs/IRIS_20260331/`
- `IRIS_20260331_00.txt`
- `IRIS_20260331_01.txt`
- `IRIS_20260331_02.txt`
- `IRIS_20260331_03.txt`
- `IRIS_20260331_04.txt`
- `IRIS_20260331_05.txt`
- `IRIS_20260331_06.txt`
- `IRIS_20260331_07.txt`
- Any file name containing `2026-03-31`, `20260331`, or `2026_03_31` that appears to be the requested Phase00-Phase07 authority set.
- Any `IRIS_SPEC_AUTHORITY.md` entry naming 2026-03-31 or `IRIS_20260331` as the active authority set.

## Required External Files

If the 2026-03-31 baseline is required for future exact audits, a human must supply the authoritative files. The minimum expected Phase00-Phase07 file names are:

- `IRIS_20260331_00.txt`
- `IRIS_20260331_01.txt`
- `IRIS_20260331_02.txt`
- `IRIS_20260331_03.txt`
- `IRIS_20260331_04.txt`
- `IRIS_20260331_05.txt`
- `IRIS_20260331_06.txt`
- `IRIS_20260331_07.txt`

Optional but recommended human-supplied metadata:

- `IRIS_20260331_MANIFEST.md` or equivalent source manifest
- checksum or provenance note for each supplied spec file
- explicit statement whether `IRIS_20260331` supersedes, amends, or merely archives the current `IRIS_20240425` set
- explicit statement for how 20260430-20260504 addenda interact with the 2026-03-31 baseline

This inventory intentionally does not invent the contents of any of these files.

## Non-Substitution Rule

Do not treat any of the following as the missing 2026-03-31 spec text:

- `IRIS_20240425_00.txt` through `IRIS_20240425_27.txt`
- 20260430-20260504 cross-phase addenda
- `README.md`
- `docs/architecture/*`
- launch or audit reports under `docs/launch/*`
- code or tests
- previous audit conclusions

They may be current repo evidence, but they are not a substitute for the missing 2026-03-31 authority artifact.

## Recommended Repo Placement

If a human supplies the 2026-03-31 authority set, place it in:

```text
docs/specs/IRIS_20260331/
```

Recommended file layout:

```text
docs/specs/IRIS_20260331/IRIS_20260331_00.txt
docs/specs/IRIS_20260331/IRIS_20260331_01.txt
docs/specs/IRIS_20260331/IRIS_20260331_02.txt
docs/specs/IRIS_20260331/IRIS_20260331_03.txt
docs/specs/IRIS_20260331/IRIS_20260331_04.txt
docs/specs/IRIS_20260331/IRIS_20260331_05.txt
docs/specs/IRIS_20260331/IRIS_20260331_06.txt
docs/specs/IRIS_20260331/IRIS_20260331_07.txt
docs/specs/IRIS_20260331/IRIS_20260331_MANIFEST.md
```

After the files are supplied, a separate authority-update change should decide whether and how to update `IRIS_SPEC_AUTHORITY.md`. This inventory does not make that authority change.

## Future Audit Priority

Until a human supplies the missing 2026-03-31 authority and updates authority ordering, use this priority:

1. `IRIS_SPEC_AUTHORITY.md`
2. `docs/specs/IRIS_20240425/IRIS_20240425_00.txt`
3. `docs/specs/IRIS_20240425/IRIS_20240425_01.txt` through `IRIS_20240425_07.txt` for Phase01-Phase07 scope
4. Applicable 20260430-20260504 addenda only where their own scope says they apply
5. `docs/architecture/*` as non-normative implementation guidance
6. `docs/launch/*` as audit history only
7. code and tests as implementation evidence only

After a human supplies `IRIS_20260331` and explicitly updates authority ordering, future exact 2026-03-31 audits should use:

1. updated `IRIS_SPEC_AUTHORITY.md`
2. `docs/specs/IRIS_20260331/IRIS_20260331_00.txt`
3. `docs/specs/IRIS_20260331/IRIS_20260331_01.txt` through `IRIS_20260331_07.txt`
4. any explicitly compatible or superseding addenda named by the updated authority index
5. non-normative architecture and launch documents only as supporting evidence

## Current Decision

- Current exact 2026-03-31 baseline status: `BLOCKED`
- Reason: required 2026-03-31 spec artifacts are not present in the repo and must not be reconstructed by inference.
- `production_ready_allowed=false`
- `go_no_go=NO-GO`
- Production ready declaration: not made

## Next Human Action

A human must upload or add the authoritative 2026-03-31 Phase00-Phase07 files, plus a provenance or manifest note, then make a separate authority decision about `IRIS_SPEC_AUTHORITY.md`.

Minimum upload/addition list:

- `docs/specs/IRIS_20260331/IRIS_20260331_00.txt`
- `docs/specs/IRIS_20260331/IRIS_20260331_01.txt`
- `docs/specs/IRIS_20260331/IRIS_20260331_02.txt`
- `docs/specs/IRIS_20260331/IRIS_20260331_03.txt`
- `docs/specs/IRIS_20260331/IRIS_20260331_04.txt`
- `docs/specs/IRIS_20260331/IRIS_20260331_05.txt`
- `docs/specs/IRIS_20260331/IRIS_20260331_06.txt`
- `docs/specs/IRIS_20260331/IRIS_20260331_07.txt`
- `docs/specs/IRIS_20260331/IRIS_20260331_MANIFEST.md` or equivalent provenance note

## PR Body Draft

Checked commit:

- `b8c1d41394e260ec1c94c51a97f88c0726740ad6`

Changed file:

- `docs/launch/IRIS_20260331_SPEC_AUTHORITY_INVENTORY.md`

Searched locations:

- `IRIS_SPEC_AUTHORITY.md`
- `README.md`
- `docs/`
- `docs/specs/`
- `docs/specs/IRIS_20240425/IRIS_20240425_00.txt` through `IRIS_20240425_07.txt`
- `docs/architecture/`
- `docs/launch/`
- repo-wide filename and content searches for 2026-03-31 / 20260331 / 2026_03_31 / IRIS_20260331 markers

Found:

- Current repo authority points to `IRIS_20240425_00` through `IRIS_20240425_27` and active 20260430-20260504 addenda.
- Phase00-Phase07 files exist only under `docs/specs/IRIS_20240425/`.
- Prior launch audit reports already recorded the missing 2026-03-31 baseline.

Not found:

- `docs/specs/IRIS_20260331/`
- `IRIS_20260331_00.txt` through `IRIS_20260331_07.txt`
- Any repo-local 2026-03-31 authority artifact.
- Any `IRIS_SPEC_AUTHORITY.md` entry naming 2026-03-31 or `IRIS_20260331`.

BLOCKED reason:

- Exact 2026-03-31 conformance cannot be certified because the requested authority artifact is absent and must not be inferred from `IRIS_20240425`, README, architecture docs, launch audits, code, or tests.

Next required human action:

- Add the authoritative `IRIS_20260331_00.txt` through `IRIS_20260331_07.txt` files under `docs/specs/IRIS_20260331/`.
- Add a manifest or provenance note.
- In a separate authority decision, update or confirm `IRIS_SPEC_AUTHORITY.md` ordering.

Validation:

- `git diff --check: PASS`
- Production ready declaration: not made.
