# Admin Review Queue

Admin Review Queue is the operator-facing review layer above the candidate
review queue. It is for local development and private validator handoff only.

It never exposes raw candidates, commits memory or relationship records, starts
a private validator runner, or forwards game input.

## Surfaces

```text
GET  /admin/review-queue
POST /admin/review-queue/action-plan
POST /admin/review-queue/decision
GET  /admin/review-queue/decision-log-status
GET  /admin/review-queue/auth-gate
GET  /admin/review-queue/validator-handoff
GET  /admin/review-queue/validator-preflight
GET  /admin/review-queue/validator-run-plan
```

```text
npm run dev:admin:review-queue
npm run dev:admin:review-decision-gate
npm run dev:admin:review-decision-log-status
npm run dev:admin:review-auth-gate
npm run dev:admin:review-validator-handoff
npm run dev:admin:review-validator-preflight
npm run dev:admin:review-validator-run-plan
```

The Admin Dashboard page is available at `/admin`. Its `actor_role` preselect is
read from the page URL:

```text
/admin?actor_role=owner
/admin?actor_role=admin
/admin?actor_role=operator
```

`/admin/dashboard` remains the read-only JSON source for dashboard widgets.

## Flow

1. Runtime events create safe candidate review summaries.
2. Admin Review Queue groups actionable memory and relationship summaries.
3. An operator creates a dry-run action plan or records an approve/reject
   decision summary.
4. The decision log stores only bounded decision metadata and safe review IDs.
5. Validator handoff compares recorded decisions against the current safe queue.
6. Validator preflight confirms the queue is ready without materializing private
   validator input.
7. Auth gate requires owner/admin confirmation before any private-runner plan can
   become ready.
8. Validator run-plan reports the next safe script and item counts only.

## Boundary

Public reports must remain summary-only:

```text
raw_candidate_exposed: false
not_execution: true
not_commit: true
no_endpoint_values: true
no_secret_values: true
no_payloads: true
validator_required_before_side_effect: true
```

Blocked or unsafe input must not echo URLs, tokens, local paths, raw candidates,
approved records, decision payloads, or raw error text.

The private validator runner path is configuration-gated by these env names:

```text
IRIS_ADMIN_REVIEW_DECISION_LOG_PATH
IRIS_ADMIN_REVIEW_ADMIN_AUTHENTICATED
IRIS_ADMIN_REVIEW_OWNER_CONFIRMED
IRIS_ADMIN_REVIEW_ACTOR_ROLE
```

## Dashboard Fail-Safe

If the dashboard cannot load its JSON sources, the browser page renders a fixed
`dashboard_load_failed` state with schema
`iris_admin_dashboard_load_failure_v1`. The failure surface keeps endpoint
values, secrets, raw payloads, and raw error text out of the page.

## Production Aggregates

The private-runner gate is also surfaced through production operator reports:

```text
npm run dev:production:next-task
npm run dev:production:probe
npm run dev:production:live-readiness
npm run dev:production:runbook
```

These aggregate reports expose only safe script names and booleans for Admin
Review. They do not start the private runner, materialize validator input, call
the validator, expose decision payloads, or commit approved records.
