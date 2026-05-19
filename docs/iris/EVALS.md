---
project: IRIS
role: evaluation plan
status: source-of-truth
last_verified: 2026-05-19
verification_command: bash scripts/run-iris-evals.sh
owner: human
---
<!-- CODEX_QUALITY_HARNESS_FILE v0.6.5 -->

# IRIS Evals

IRIS evals guard specification interpretation, behavior stability, and project boundaries.

## Files

- `evals/iris/golden_cases.yaml`
- `evals/iris/regression_cases.yaml`

## Golden Cases

Golden cases cover behavior that IRIS must always preserve:

- formal authority is read first
- Phase boundaries are preserved
- ambiguous requests are held or clarified
- safe output avoids sensitive raw values
- FUNKY-specific behavior is not imported

## Regression Cases

Regression cases cover known or likely failures:

- FUNKY / IRIS specification mixing
- missing authority handling
- candidate / execution boundary collapse
- code or tests used as authority
- unsafe raw output in reports

## Running

Run:

```bash
bash scripts/run-iris-evals.sh
```

The current eval runner is a lightweight static harness.
It verifies case structure and required safety expectations.
It does not simulate the full IRIS runtime.
