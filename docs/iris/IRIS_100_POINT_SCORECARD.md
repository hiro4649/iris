# IRIS 100 Point Scorecard

Status: current repository scorecard
Production ready allowed: false
Go/no-go: no_go
Current score: 61/100

This scorecard is intentionally conservative. Local foundation docs and minimum contract evals do not make IRIS production ready while the quality gate and full test suite still have failures.

## Scale

0 means missing or failing.

50 means foundation exists but is partial, unintegrated, or not fully verified.

80 means contract is present and locally checked, but broader runtime or production proof is incomplete.

100 means implemented, integrated, tested, documented, and production-confirmed for the current head.

## Current Axes

| Axis | Current | 0 State | 50 State | 80 State | 100 State |
| --- | ---: | --- | --- | --- | --- |
| Authority anchoring | 80 | No authority file | Authority exists but unused | Authority checked and referenced | Authority enforced across PR workflow |
| Parent character spec | 50 | Missing | Foundation doc exists | Runtime mapping checked | Fully traced to specs and tests |
| Fixed soul | 50 | Missing | Personality core documented | Persona tests cover it | Integrated and regression-protected |
| Memory status contract | 80 | Missing | Five statuses documented | Code contract and evals exist | All memory paths enforce it |
| Natural memory use | 80 | Missing | Policy documented | Contract evals enforce accepted/protected only | Runtime recall fully enforces it |
| Protected memory approval | 80 | Missing | Policy documented | Contract evals require human approval | Persistence/review flows enforce it |
| Avatar response contract | 80 | Missing | Behavior map documented | Code contract and evals exist | Runtime/adapters fully enforce it |
| inner_intent privacy | 80 | Missing | Public rule documented | Public projection eval passes | All public surfaces audited |
| Eval runner | 50 | Missing | Minimum runner exists | Broad persona/memory/avatar cases exist | Real response quality evals pass |
| Docs lint | 50 | Missing | Minimum linter exists | Spec/doc coverage is broad | CI gates all required docs |
| Secret safety | 100 | Missing or failing | Script exists | Script passes locally | CI and release gates confirm |
| Codex quality gate | 50 | Missing or failing | Harness exists | Local gate passes | Remote gate passes on PR head |
| Full npm test | 0 | Failing | Residual failures classified | All local tests pass | CI confirms all tests pass |
| Production readiness | 0 | No verified readiness | Local dry-runs only | Real operator checks pending | Human-confirmed production readiness |
| Improvement history | 50 | Missing | Scorecard records gaps | Changelog and decision log are current | Continuous improvement evidence is complete |

## Not Implemented

- Curator
- growth report generation
- real response quality evals
- production-ready declaration
- clean full-test proof
- remote quality-gate success for the current PR head

## Current Blocking Risks

- `npm test` is not green.
- Local quality gate currently reports scope/manual-confirmation related failures.
- Existing uncommitted local changes predate this PR1 work and must be resolved before merge.
- Foundation evals are minimum contract checks, not character-quality proof.
- PR2 reduced several public output, endpoint response, and env-name coverage failures, but the remaining full-test failures are still blocking.
