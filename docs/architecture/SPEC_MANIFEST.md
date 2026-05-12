# Spec Manifest

Spec manifest verifies that the local `IRIS_20240425` specification set is complete.

Current expectation:

```text
IRIS_20240425_00.txt
...
IRIS_20240425_27.txt
```

The manifest shape is:

```text
schema: iris_spec_manifest_v1
version_prefix
expected_count
found_count
complete
expected_files
found_files
addendum_files
missing_files
unexpected_files
```

`found_count` covers only the numbered phase files `IRIS_20240425_00.txt` through `IRIS_20240425_27.txt`.
Additional addendum files are reported in `addendum_files` and do not make the numbered phase set incomplete.

`node scripts/run-preflight.js` uses this check before reporting local readiness.
