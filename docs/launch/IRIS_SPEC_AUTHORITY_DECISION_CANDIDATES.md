# IRIS Spec Authority Decision Candidates

Date: 2026-05-16 JST

Task: IRIS-K-03 Inventory repo-local IRIS_20240425 specs and addenda.

Checked commit: `7e644246df596c233675321d8b14a6c0b2a89ab9` on `codex/iris-k-01-spec-authority-inventory`.

Scope: documentation inventory only. This file does not modify code, Phase responsibility, adapter responsibility, memory responsibility, runtime behavior, production readiness logic, or specification text.

## Current Decision

- `production_ready_allowed=false`
- `go_no_go=NO-GO`
- Production ready declaration: not made
- Human authority decision: still required

## Repo-Local Specification Inventory

Repo-local numbered specification set found:

```text
docs/specs/IRIS_20240425/IRIS_20240425_00.txt
docs/specs/IRIS_20240425/IRIS_20240425_01.txt
docs/specs/IRIS_20240425/IRIS_20240425_02.txt
docs/specs/IRIS_20240425/IRIS_20240425_03.txt
docs/specs/IRIS_20240425/IRIS_20240425_04.txt
docs/specs/IRIS_20240425/IRIS_20240425_05.txt
docs/specs/IRIS_20240425/IRIS_20240425_06.txt
docs/specs/IRIS_20240425/IRIS_20240425_07.txt
docs/specs/IRIS_20240425/IRIS_20240425_08.txt
docs/specs/IRIS_20240425/IRIS_20240425_09.txt
docs/specs/IRIS_20240425/IRIS_20240425_10.txt
docs/specs/IRIS_20240425/IRIS_20240425_11.txt
docs/specs/IRIS_20240425/IRIS_20240425_12.txt
docs/specs/IRIS_20240425/IRIS_20240425_13.txt
docs/specs/IRIS_20240425/IRIS_20240425_14.txt
docs/specs/IRIS_20240425/IRIS_20240425_15.txt
docs/specs/IRIS_20240425/IRIS_20240425_16.txt
docs/specs/IRIS_20240425/IRIS_20240425_17.txt
docs/specs/IRIS_20240425/IRIS_20240425_18.txt
docs/specs/IRIS_20240425/IRIS_20240425_19.txt
docs/specs/IRIS_20240425/IRIS_20240425_20.txt
docs/specs/IRIS_20240425/IRIS_20240425_21.txt
docs/specs/IRIS_20240425/IRIS_20240425_22.txt
docs/specs/IRIS_20240425/IRIS_20240425_23.txt
docs/specs/IRIS_20240425/IRIS_20240425_24.txt
docs/specs/IRIS_20240425/IRIS_20240425_25.txt
docs/specs/IRIS_20240425/IRIS_20240425_26.txt
docs/specs/IRIS_20240425/IRIS_20240425_27.txt
```

Existence status: `IRIS_20240425_00.txt` through `IRIS_20240425_27.txt` are present in the repo-local `docs/specs/IRIS_20240425/` directory.

Repo-local cross-phase addendum files found:

```text
docs/specs/IRIS_20240425/IRIS_20240425_cross_phase_addendum_20260430.txt
docs/specs/IRIS_20240425/IRIS_20240425_cross_phase_addendum_20260430_02.txt
docs/specs/IRIS_20240425/IRIS_20240425_cross_phase_addendum_20260430_03.txt
docs/specs/IRIS_20240425/IRIS_20240425_cross_phase_addendum_20260430_04.txt
docs/specs/IRIS_20240425/IRIS_20240425_cross_phase_addendum_20260503_admin_panel.txt
docs/specs/IRIS_20240425/IRIS_20240425_cross_phase_addendum_20260503_operator_policy_decisions.txt
docs/specs/IRIS_20240425/IRIS_20240425_cross_phase_addendum_20260503_original_voice.txt
docs/specs/IRIS_20240425/IRIS_20240425_cross_phase_addendum_20260503_relationship_scale_postgresql.txt
docs/specs/IRIS_20240425/IRIS_20240425_cross_phase_addendum_20260504_anime_ip_character_linkage.txt
docs/specs/IRIS_20240425/IRIS_20240425_cross_phase_addendum_20260504_growth_business_operations.txt
```

Existence status: 20260430, 20260503, and 20260504 cross-phase addendum files are present in the repo-local `docs/specs/IRIS_20240425/` directory.

## 20260331 Authority Set Status

Repo-local `IRIS_20260331` authority set status: not found.

Not found:

```text
docs/specs/IRIS_20260331/
docs/specs/IRIS_20260331/IRIS_20260331_00.txt
docs/specs/IRIS_20260331/IRIS_20260331_01.txt
docs/specs/IRIS_20260331/IRIS_20260331_02.txt
docs/specs/IRIS_20260331/IRIS_20260331_03.txt
docs/specs/IRIS_20260331/IRIS_20260331_04.txt
docs/specs/IRIS_20260331/IRIS_20260331_05.txt
docs/specs/IRIS_20260331/IRIS_20260331_06.txt
docs/specs/IRIS_20260331/IRIS_20260331_07.txt
```

`IRIS_SPEC_AUTHORITY.md` currently names the `IRIS_20240425` numbered specifications and active 20260430-20260504 addenda. It does not name `IRIS_20260331` as the active authority set.

`IRIS_20240425` must not be treated as a substitute for `IRIS_20260331` unless a human authority decision explicitly says so.

## Decision Candidate A: Add 20260331 As Canonical Authority

Candidate A: a human supplies `IRIS_20260331_00.txt` through `IRIS_20260331_07.txt`, plus provenance or manifest metadata, then separately updates authority ordering.

Merits:

- Directly resolves the requested 2026-03-31 baseline question.
- Future exact 2026-03-31 audits can reference repo-local files.
- Avoids inferring missing specification content from newer or different artifacts.

Risks:

- Requires human-provided source files and provenance before any code or audit can claim exact baseline conformance.
- May conflict with current `IRIS_20240425` authority or later addenda unless a human explicitly defines precedence.
- Cannot be completed by reconstructing or summarizing missing spec text.

## Decision Candidate B: Treat IRIS_20240425_00-27 As Canonical Authority

Candidate B: a human decides that `IRIS_20240425_00.txt` through `IRIS_20240425_27.txt` are the current canonical authority without using the missing 20260331 set.

Merits:

- Uses the complete repo-local numbered specification set already present.
- Matches the current `IRIS_SPEC_AUTHORITY.md` and `README.md` inventory.
- Avoids blocking on missing 20260331 files if they are no longer intended to govern the project.

Risks:

- Does not answer exact 2026-03-31 conformance.
- Could invalidate earlier audit requests that explicitly require 2026-03-31 unless a human records a supersession or replacement decision.
- Cross-phase addenda status still needs separate treatment.

## Decision Candidate C: Treat IRIS_20240425_00-27 Plus Addenda As Latest Canonical Authority

Candidate C: a human decides that `IRIS_20240425_00.txt` through `IRIS_20240425_27.txt`, together with the repo-local 20260430, 20260503, and 20260504 cross-phase addenda, are the latest canonical authority.

Merits:

- Matches the authority shape currently described by `IRIS_SPEC_AUTHORITY.md`.
- Uses both the complete numbered Phase set and the current repo-local cross-phase addenda.
- Provides a clear latest-current baseline for future static audits once confirmed.

Risks:

- Still does not make `IRIS_20240425` a substitute for `IRIS_20260331`.
- Addenda can introduce precedence questions that must be decided by human authority, especially where addenda overlap.
- Future audits must distinguish exact 2026-03-31 conformance from current-latest conformance.

## Required Human Decision

No recommendation in this document changes authority. A human must decide which candidate is correct:

- Candidate A: supply and use `IRIS_20260331` as canonical authority.
- Candidate B: formally treat `IRIS_20240425_00.txt` through `IRIS_20240425_27.txt` as canonical authority.
- Candidate C: formally treat `IRIS_20240425_00.txt` through `IRIS_20240425_27.txt` plus the 20260430, 20260503, and 20260504 addenda as the latest canonical authority.

Until that decision is recorded, exact 2026-03-31 authority remains `BLOCKED`.

## PR Body Draft

Changed file:

- `docs/launch/IRIS_SPEC_AUTHORITY_DECISION_CANDIDATES.md`

Confirmed spec candidates:

- `IRIS_20240425_00.txt` through `IRIS_20240425_27.txt` are present under `docs/specs/IRIS_20240425/`.
- 20260430 cross-phase addenda are present.
- 20260503 cross-phase addenda are present.
- 20260504 cross-phase addenda are present.
- `IRIS_20260331_00.txt` through `IRIS_20260331_07.txt` were not found as repo-local authority files.

Decision candidates:

- Candidate A: supply `IRIS_20260331` and make a separate authority decision.
- Candidate B: treat `IRIS_20240425_00.txt` through `IRIS_20240425_27.txt` as canonical.
- Candidate C: treat `IRIS_20240425_00.txt` through `IRIS_20240425_27.txt` plus active addenda as latest canonical.

Still BLOCKED because:

- The repo does not contain `IRIS_20260331_00.txt` through `IRIS_20260331_07.txt`.
- `IRIS_20240425` must not be treated as a substitute for `IRIS_20260331` without human authority decision.
- This PR does not change specs, code, runtime readiness, adapter responsibility, memory responsibility, or production readiness.

Next required human decision:

- Choose Candidate A, B, or C.
- If Candidate A is chosen, upload the `IRIS_20260331` files and provenance.
- If Candidate B or C is chosen, record the authority decision separately in the appropriate authority document.

Validation:

- `git diff --check: PASS`
- `production_ready_allowed=false`
- `go_no_go=NO-GO`
- Production ready declaration: not made.
