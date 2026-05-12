# IRIS Development Progress

Last updated: 2026-05-04

This memo is intentionally safe to share for review. It records statuses, env names,
script names, and decisions only. It must not include endpoint values, API keys,
OAuth tokens, YouTube chat text, support messages, raw frames, candidates, or commands.

## Current Priority State

- 2026-05-04: Hardened YouTube ingest readiness rehearsal gate summaries so
  reported ready/attention gate counts must match the emitted gate readiness
  flags, with regression coverage for drifted counts.
- 2026-05-04: Hardened foundation readiness rehearsal gate summaries with the
  same derived ready/attention count validation and regression coverage.
- 2026-05-04: Hardened readiness rehearsal next-configure env validation across
  foundation, local-env, YouTube ingest, persistence, and gameplay reports so
  duplicate env names are rejected before operator handoff.
- 2026-05-04: Hardened production runtime handoff status validation so component
  summaries, OBS pickup runtime summaries, and readiness count maps reject
  unexpected fields.
- 2026-05-04: Hardened production probe public boundaries so report, stage, and
  check summaries reject unexpected fields before publication.

- Priority 1, real TTS / Live2D / OBS foundation: implemented as a local bridge,
  adapter-packet, worker, render-manifest, OBS handoff, health-probe, and startup
  checklist foundation. The configuration gate is ready for runtime handoff. Real
  engine processes and OBS setup are still operator/runtime tasks.
- Priority 2, YouTube comments and support ingest: direct API and trusted relay
  adapters exist with donation normalization, cursor resume, OAuth refresh, safe
  status surfaces, scheduler handoff, and support-event candidate gates. The local
  env template and guarded apply plan now exist. The stage is still configuration
  attention until a source mode, live target, credential option, and scheduler
  enablement are set.
- Priority 3, memory and relationship persistence: JSON persistence and candidate
  validation gates exist. The local env profile and guarded apply plan now exist,
  the local env file has the JSON store and approval-flag names, and the local
  vector-memory bridge surface now exists. Production configuration is still
  waiting for vector-memory endpoint wiring before the whole priority can become
  ready.
- Priority 4, game screen recognition and safe action approval: game observation,
  perception, player candidates, validation, and HTTP/mock control adapter
  boundaries exist. The local env profile and guarded apply plan now exist.
  Production configuration is still waiting for the vision source bridge,
  scheduler enablement review, control target, and available-action list.

## Latest Completed Work

- Hardened post-start checklist count and check identity validation.
  `src\services\dev\youtubeIngestPostStartChecklist.js`,
  `src\services\dev\persistencePostStartChecklist.js`, and
  `src\services\dev\gameplayPostStartChecklist.js` now recalculate post-start
  check counts and reject check-id, gate-id, script, sequence, and readiness
  drift. `scripts\run-tests.js` covers count and check identity drift.
- Hardened startup checklist decision and next-step integrity.
  `src\services\dev\youtubeRelayStartupChecklist.js` now validates step order,
  startup-kind counts, next-step summaries, next env names, and duplicate
  production decision ids. Persistence and gameplay startup handoff summaries
  now also reject duplicate production decision ids. `scripts\run-tests.js`
  covers the new startup drift checks.
- Hardened integration probe readiness report integrity.
  `src\services\dev\integrationProbe.js` now rejects adapter probe order drift,
  duplicate env summary names, and engine mode summary drift from the reported
  TTS/Live2D engine modes. `scripts\run-tests.js` covers adapter-kind drift and
  engine mode count drift.
- Hardened integration contract duplicate-field validation.
  `src\services\dev\integrationContracts.js` now rejects duplicate or empty
  public contract field names for adapter packet and source bridge arrays.
  `scripts\run-tests.js` covers duplicate adapter required fields and duplicate
  source public status fields.
- Added production next-task priority gate mapping regression coverage.
  `scripts\run-tests.js` now covers priority gate stage-id drift in
  `src\services\dev\productionNextTask.js`, preserving the existing gate
  expectation contract without adding duplicate implementation logic.
- Hardened production live-readiness priority stage mapping.
  `src\services\dev\productionLiveReadiness.js` now rejects priority/stage-id
  drift in live-readiness stage summaries, and `scripts\run-tests.js` covers the
  mismatch regression.
- Hardened production probe stage integrity validation.
  `src\services\dev\productionProbe.js` now requires the four production
  priority stages exactly once and rejects priority/stage-id drift; 
  `scripts\run-tests.js` covers missing, duplicate, and mismatched stage summaries.
- Hardened admin review decision log and auth gate validation.
  `src\services\dev\adminReviewDecisionLog.js` now rejects invalid decision
  summary counts and latest decision ids, while
  `src\services\dev\adminReviewAuthGate.js` validates actor authorization and
  duplicate missing env names. `scripts\run-tests.js` covers these regressions.
- Hardened admin review validator preflight and run-plan count boundaries.
  `src\services\dev\adminReviewValidatorPreflight.js` now rejects invalid
  blocking reasons, non-integer counts, and handoff-summary status drift; the
  run-plan validator now rejects invalid runner counts, blocking reasons, and
  auth/preflight summary drift. `scripts\run-tests.js` covers these regressions.
- Hardened admin review validator handoff summary synchronization.
  `src\services\dev\adminReviewValidatorHandoff.js` now validates decision
  summary action counts and decision-log entry counts against the handoff items;
  `scripts\run-tests.js` covers summary and log-status drift.
- Hardened admin review queue decision summary validation.
  `src\services\dev\adminReviewQueue.js` now rejects negative decision-summary
  counts and stale latest decision ids before validator handoff, and
  `scripts\run-tests.js` covers those drift cases.
- Hardened admin character/voice apply-plan count validation.
  `src\services\dev\adminCharacterVoiceSettings.js` now rejects accepted/rejected
  setting count drift, duplicate accepted setting ids, and unsafe-value counts
  above the request total; `scripts\run-tests.js` covers these regressions.
- Hardened admin integration checklist aggregate boundary coverage.
  `src\services\dev\adminIntegrationChecklist.js` now validates checklist
  entries before duplicate-id checks, and `scripts\run-tests.js` covers
  check-count drift, next-check mismatch, and null checklist entries.
- Hardened admin operations/dashboard aggregate boundary coverage.
  `scripts\run-tests.js` now covers admin module/widget count drift, null
  module/widget entries, next-module mismatch, attention-widget mismatch, and
  operator-language shape validation. `src\services\dev\adminDashboard.js` now
  validates widget entries before checking duplicate widget ids.
- Expanded production handoff summary synchronization regression coverage.
  `scripts\run-tests.js` now covers production next-task handoff priority/stage
  count/script drift and live-readiness handoff stage-count/next-stage/script
  drift.
- Expanded production next-task and live-readiness priority gate regression coverage.
  `scripts\run-tests.js` now covers invalid next-priority values and null
  priority gate/stage entries for the production next-task and live-readiness
  public reports.
- Hardened production attention digest priority and stage entry validation.
  `scripts\dev-production-attention-digest.js` now rejects invalid next-priority
  values, and `scripts\run-tests.js` covers priority drift plus null stage
  summary entries.
- Expanded smoke and scenario public report entry-boundary coverage.
  `scripts\run-tests.js` now covers non-object smoke/scenario/suite reports,
  schema/name/count entry drift, and non-object boundary policies for the
  counts-only CLI report surfaces.
- Expanded preflight top-level and specs type boundary coverage.
  `scripts\run-tests.js` now covers the preflight `ok` flag type plus specs
  found-count and addendum-file array shape validation.
- Expanded preflight specs and scenario boundary coverage.
  `scripts\run-tests.js` now covers non-object specs/scenario summaries,
  scenario step/review flag types, specs missing-file shape, and specs count
  type validation at the preflight report entry boundary.
- Expanded preflight readiness summary boundary coverage.
  `scripts\run-tests.js` now covers readiness state count object shape,
  unsafe next-state labels, non-null invalid integration probe summaries, and
  integration probe count/boundary-policy validation.
- Expanded preflight production attention digest runtime/readiness boundary coverage.
  `scripts\run-tests.js` now locks digest runtime component/status labels,
  runtime check scripts, readiness labels, stage counts, and boundary-ok typing to
  public-safe validation errors.
- Expanded preflight production attention digest script and focus boundary coverage.
  `scripts\run-preflight.js` now validates digest stage ids and check scripts
  before alignment checks, and `scripts\run-tests.js` covers unsafe digest
  labels, scripts, and operator-focus worker counts.
- Expanded preflight production script and label boundary coverage.
  `scripts\run-tests.js` now rejects unsafe verification scripts, launch/readiness
  scripts, process ids, and production stage ids before deeper stage alignment.
- Expanded preflight production numeric and env-array boundary coverage.
  `scripts\run-tests.js` now locks verification priority/count fields,
  operator launch count/order fields, and launch/stage missing-env fields to
  public-safe type-boundary errors.
- Expanded preflight production/readiness array boundary coverage.
  `scripts\run-tests.js` now locks non-array verification script, launch
  sequence, stage status, and integration gap status fields, plus null array
  elements, to public-safe boundary errors before deeper alignment checks.
- Expanded preflight production boundary-policy object coverage.
  `scripts\run-tests.js` now locks null production, verification, and operator
  launch boundary policies to public-safe object-boundary errors.
- Expanded preflight production nested summary object coverage.
  `scripts\run-tests.js` now locks null `verification_plan` and
  `operator_launch_plan` failures to public-safe object-boundary errors before
  deeper production readiness checks.
- Expanded preflight production attention digest shape coverage.
  `scripts\run-preflight.js` now checks compressed production attention digest
  object shape before ID alignment, and `scripts\run-tests.js` covers non-object
  digest summaries and non-object digest boundary policies.
- Expanded production attention digest operator and boundary shape coverage.
  `scripts\run-tests.js` now rejects non-object `operator_focus` summaries and
  a null digest boundary policy before later focus and boundary-flag checks.
- Expanded production attention digest top-level and summary shape coverage.
  `scripts\run-tests.js` now rejects invalid production digest object, schema,
  and ok values, plus non-object runtime handoff, next-task, and live-readiness
  summaries before their field and count checks.
- Expanded production attention digest stage summary shape coverage.
  `scripts\run-tests.js` now rejects non-array `stage_summaries` before stage
  field, count, readiness, and identity alignment checks.
- Expanded preflight compressed public audit field-boundary coverage.
  `scripts\run-tests.js` now rejects a missing-list field injected into the
  preflight compressed public report boundary audit summary.
- Expanded production attention digest public audit summary guard coverage.
  `scripts\run-tests.js` now rejects non-object embedded public audit summaries,
  unexpected missing-list fields, non-boolean public audit ok flags, and
  representative invalid missing counts in the production attention digest.
- Expanded public boundary audit basic-shape regression coverage.
  `scripts\run-tests.js` now rejects invalid public boundary audit object,
  schema, ok-flag, and representative count shapes in both the source verifier
  and preflight compressed audit path.
- Expanded public boundary audit policy regression coverage.
  `scripts\run-tests.js` now rejects a non-object policy, another missing
  required policy flag, and an unexpected policy flag in the public boundary
  audit verifier.
- Expanded compressed public boundary audit list-omission coverage.
  `scripts\run-tests.js` now asserts production digest and preflight compressed
  public boundary audits omit run-boundary, dev-service, and server missing
  lists as well as allowlist script lists.
- Expanded public boundary audit missing-list safety coverage.
  `scripts\run-tests.js` now rejects duplicate and non-public-safe run-boundary,
  dev-service, and server missing-list names, matching the existing allowlist
  missing-name coverage.
- Expanded public boundary audit missing-list count regression coverage.
  `scripts\run-tests.js` now rejects allowlist, run-boundary, dev-service, and
  server missing-list/count mismatches in the public boundary audit verifier.
- Expanded public boundary audit numeric guard regression coverage.
  `scripts\run-tests.js` now rejects zero preflight scanned/assert counts for
  script, dev-service, and server audit surfaces, and rejects public audit
  dev-service/server missing counts above their scanned counts.
- Expanded preflight public boundary audit scanned-count positive coverage.
  `scripts\run-tests.js` now rejects zero dev-service and server scanned counts,
  matching the existing positive-count guard and run-script regression coverage.
- Expanded preflight public boundary audit missing-count ceiling coverage.
  `scripts\run-tests.js` now rejects dev-service and server missing counts that
  exceed their scanned counts, matching the existing allowlist and run-boundary
  ceiling coverage.
- Expanded preflight public boundary audit ok-count regression coverage.
  `scripts\run-tests.js` now rejects ok preflight public boundary audits with
  non-zero allowlist, run-boundary, dev-service, or server missing counts,
  matching the existing all-missing-counts zero guard.
- Added production attention digest public audit counts-only regression coverage.
  `scripts\run-tests.js` now rejects a production attention digest public audit
  summary with `counts_only` disabled, matching the existing runtime guard and
  missing-file-list omission regression coverage.
- Hardened preflight production attention digest audit compression boundary.
  `scripts\run-preflight.js` now marks the compressed production attention
  digest boundary policy as carrying only the public audit ok flag and omitting
  public audit missing file lists. The regression tests now assert both flags
  and reject disabled `public_audit_ok_only` and
  `public_audit_missing_file_lists_omitted` policies.
- Hardened production attention digest public audit summary boundary.
  `scripts\dev-production-attention-digest.js` now marks its embedded public
  boundary audit summary as counts-only with missing file lists omitted. The
  regression tests now assert those flags, keep missing script lists out of the
  digest, and reject a disabled list-omission flag.
- Hardened preflight public boundary audit list omission policy.
  `scripts\run-preflight.js` now marks the compressed public boundary audit
  summary with `missing_file_lists_omitted: true` and keeps missing file lists
  out of the preflight report. The regression tests now reject a disabled list
  omission policy and assert that missing script lists are absent.
- Hardened preflight public boundary audit not-ok consistency.
  `scripts\run-preflight.js` now rejects compressed public boundary audit
  summaries that report `ok: false` without any missing boundary counts. The
  regression tests now pin the not-ok/zero-missing mismatch to the explicit
  preflight audit consistency error.
- Expanded preflight public boundary audit count visibility.
  `scripts\run-preflight.js` now preserves dev-service and server assert counts
  in the compressed public boundary audit summary and rejects counts that exceed
  the scanned file totals. The regression tests now cover both compressed count
  fields and their overflow guards.
- Hardened public report boundary audit assert-count consistency.
  `scripts\dev-public-report-boundary-audit.js` now rejects dev-service and
  server assert counts that exceed their scanned file counts, matching the
  existing script assert-count guard. The regression tests now cover both
  dev-service and server count overflow cases.
- Hardened public report boundary audit file-name policy coverage.
  `scripts\dev-public-report-boundary-audit.js` now carries and requires a
  `public_relative_file_names_only` boundary flag, and the preflight compressed
  audit summary accepts the same policy. The regression tests now reject
  absolute path-shaped missing script entries and disabled relative-name policy.
- Hardened preflight production summary boundary policy coverage.
  `scripts\run-preflight.js` now carries and requires text-payload,
  memory-record, relationship-record, candidate, raw-frame, and
  raw-runtime-state exclusion flags on the top-level production summary while
  preserving script-name launch and verification guidance. The regression tests
  now reject a production summary with `no_raw_runtime_state` disabled.
- Hardened scenario suite aggregate boundary policy coverage.
  `scripts\run-scenario-suite.js` now carries and requires text-payload,
  memory-record, relationship-record, raw-frame, and raw-runtime-state exclusion
  flags while keeping the suite report aggregate-only. The regression tests now
  reject suite reports with `no_text_payloads` or `no_raw_frames` disabled.
- Hardened scenario CLI report boundary policy coverage.
  `scripts\run-scenario.js` now carries and requires memory-record,
  relationship-record, raw-frame, and raw-runtime-state exclusion flags while
  preserving public final text summaries. The regression tests now reject a
  scenario report with `no_raw_frames` disabled.
- Hardened smoke report boundary policy coverage.
  `scripts\run-smoke.js` now carries and requires text-payload, memory-record,
  relationship-record, raw-frame, and raw-runtime-state exclusion flags while
  keeping the smoke report counts-only. The regression tests now assert the new
  flags and reject a smoke report with `no_raw_runtime_state` disabled.
- Hardened preflight production attention digest boundary policy coverage.
  `scripts\run-preflight.js` now carries and requires memory-record,
  relationship-record, raw-frame, and raw-runtime-state exclusion flags in the
  compressed production attention digest boundary policy. The regression tests
  now reject a compressed digest with `no_raw_runtime_state` disabled.
- Hardened production attention digest boundary policy coverage.
  `scripts\dev-production-attention-digest.js` now requires the digest boundary
  policy to explicitly keep memory records, relationship records, raw frames, and
  raw runtime state out of the public report. The regression tests now reject a
  digest with `no_raw_runtime_state` disabled.
- Hardened production attention digest operator-focus label and script safety.
  `scripts\dev-production-attention-digest.js` now validates operator-focus ids,
  statuses, readiness labels, stages, reasons, urgency labels, and check scripts
  as safe public labels or npm script names when present. The regression tests
  now reject URL-shaped focus reasons and command-shaped secondary check scripts.
- Hardened production attention digest summary label and script safety.
  `scripts\dev-production-attention-digest.js` now validates runtime handoff,
  next-task, and live-readiness summary ids, statuses, readiness labels, and
  scripts as safe public labels or npm script names when present. The regression
  tests now reject URL-shaped summary labels and command-shaped next-task
  scripts.
- Hardened production attention digest stage label and script safety.
  `scripts\dev-production-attention-digest.js` now validates stage ids,
  live-readiness statuses, first-attention gate ids/statuses, and first-attention
  check scripts as safe public labels or npm script names. The regression tests
  now reject URL-shaped status values and command-shaped check scripts.
- Hardened production attention digest stage attention details.
  `scripts\dev-production-attention-digest.js` now requires stages with
  attention gates to carry first-attention gate, status, and check-script
  details, while ready stages must not carry stale first-attention details. The
  regression tests now cover both missing attention details and stale ready-stage
  details.
- Hardened production attention digest runtime-focus worker count presence.
  `scripts\dev-production-attention-digest.js` now requires pending and
  retry-blocked worker job counts whenever the operator focus is
  `runtime_handoff`. This matches the preflight compressed summary guard and
  prevents runtime focus reports from losing queue visibility upstream.
- Hardened production attention digest focus urgency and reason validation.
  `scripts\dev-production-attention-digest.js` now rejects unknown
  `focus_urgency` values and requires a focus reason whenever the digest reports
  attention urgency. This aligns the upstream digest safety checks with the
  preflight compressed summary guard.
- Hardened preflight attention-focus reason presence.
  `scripts\run-preflight.js` now requires a public-safe
  `operator_focus_reason` whenever the compressed production attention digest
  reports an attention urgency. The regression tests now reject attention focus
  summaries that lose their reason while keeping the existing URL/value leak
  guard intact.
- Hardened preflight runtime-focus worker job count presence.
  `scripts\run-preflight.js` now requires the compressed production attention
  digest to carry pending and retry-blocked worker job counts whenever
  `operator_focus_id` is `runtime_handoff`. The regression tests now reject a
  runtime-focused digest that drops queue visibility.
- Hardened preflight production attention digest next-task check alignment.
  `scripts\run-preflight.js` now requires the compressed production attention
  digest `next_task_check_script` to match the known next-readiness script for
  `next_task_stage_id`. The regression tests now reject next-task stage and
  check-script drift at the preflight boundary.
- Hardened preflight production attention digest live-readiness check alignment.
  `scripts\run-preflight.js` now requires the compressed production attention
  digest `live_readiness_next_check_script` to match the known check script for
  `live_readiness_next_stage_id`. The regression tests now reject live-readiness
  stage and check-script drift at the preflight boundary.
- Hardened preflight production attention digest runtime check-script alignment.
  `scripts\run-preflight.js` now requires the compressed production attention
  digest `runtime_next_check_script` to match the known script for
  `runtime_next_component_id`. The regression tests now reject runtime component
  and check-script drift at the preflight boundary.
- Hardened preflight production attention digest runtime component ids.
  `scripts\run-preflight.js` now restricts the compressed production attention
  digest `runtime_next_component_id` to the known runtime component ids. The
  regression tests now reject unknown runtime component labels at the preflight
  boundary.
- Hardened preflight production attention digest runtime-handoff statuses.
  `scripts\run-preflight.js` now restricts the compressed production attention
  digest `runtime_handoff_status` to the known runtime handoff statuses. The
  regression tests now reject unknown runtime-handoff labels at the preflight
  boundary.
- Hardened preflight production attention digest live-readiness statuses.
  `scripts\run-preflight.js` now restricts the compressed production attention
  digest `live_readiness_status` to the known production live-readiness overall
  statuses. The regression tests now reject unknown live-readiness status labels
  at the preflight boundary.
- Hardened preflight production attention digest next-task readiness labels.
  `scripts\run-preflight.js` now requires the compressed production attention
  digest `next_task_readiness_state` to be one of the known readiness-state count
  keys. The regression tests now reject unknown next-task readiness labels at
  the preflight boundary.
- Hardened preflight integration gap status labels.
  `scripts\run-preflight.js` now restricts readiness integration gap `status`
  values to the known public boundary statuses `boundary_available` and
  `boundary_missing`. The regression tests now reject unknown integration gap
  status labels while preserving existing safe-label coverage.
- Hardened preflight readiness state labels.
  `scripts\run-preflight.js` now requires `readiness.next_readiness_state` and
  each integration gap `readiness_state` to be one of the known readiness state
  count keys before checking counts. The regression tests now reject unknown
  readiness state labels in both places.
- Hardened preflight production stage statuses.
  `scripts\run-preflight.js` now restricts production stage `status` values to
  the known public statuses `ready` and `attention`, preventing arbitrary
  safe-looking labels from changing stage semantics. The regression tests now
  reject unknown production stage statuses.
- Hardened preflight production launch readiness statuses.
  `scripts\run-preflight.js` now restricts operator launch step
  `launch_readiness_status` values to the known public statuses `ready`,
  `missing_required_env`, and `configuration_attention`. The regression tests now
  reject unknown launch readiness statuses while preserving existing launch-count
  drift coverage.
- Hardened preflight attention digest focus urgency validation.
  `scripts\run-preflight.js` now restricts compressed production attention
  digest operator focus urgency to the known public values `ready`, `attention`,
  and `multi_gate_attention`. The regression tests now reject unknown focus
  urgency labels.
- Hardened preflight attention digest operator focus alignment.
  `scripts\run-preflight.js` now validates compressed production attention digest
  focus ids and requires `operator_focus_check_script` to match the summary
  selected by that focus mode. The regression tests now reject unknown focus ids
  and focus check-script drift at the preflight layer.
- Hardened production attention digest secondary focus guidance.
  `scripts\dev-production-attention-digest.js` now requires
  `operator_focus.secondary_check_script` to match the secondary summary implied
  by `focus_id`, and validates worker job counts as null or non-negative
  integers. The regression tests now reject secondary check-script drift and
  invalid worker counts.
- Hardened production attention digest summary count validation.
  `scripts\dev-production-attention-digest.js` now validates non-negative
  integer counts for runtime handoff, live readiness, and production next-task
  summaries before using those counts for operator focus and stage alignment. The
  regression tests now reject invalid summary counts directly.
- Hardened production attention digest operator focus target alignment.
  `scripts\dev-production-attention-digest.js` now requires
  `operator_focus.focus_stage_id` and `focus_check_script` to match the summary
  selected by `focus_id`, covering runtime handoff, live readiness, and
  production next-task focus modes. The regression tests now reject focus stage
  and check-script drift.
- Hardened production attention digest stage identity checks.
  `scripts\dev-production-attention-digest.js` now rejects duplicate
  `stage_summaries.stage_id` values before deriving stage maps and next-stage
  alignment. The regression tests now cover duplicate stage ids directly.
- Hardened production attention digest operator focus counts.
  `scripts\dev-production-attention-digest.js` now validates the operator focus
  id and requires `operator_focus.attention_count` to match the corresponding
  runtime handoff, live readiness, or production next-task summary. The
  regression tests now reject unknown focus ids, negative focus counts, and focus
  count drift.
- Hardened production attention digest next-stage alignment.
  `scripts\dev-production-attention-digest.js` now requires live-readiness
  `next_stage_id` to exist in `stage_summaries` and point at an attention stage,
  while `next_task_summary.next_stage_id` must also resolve to a known stage when
  present. The regression tests now reject unknown next-stage ids and live
  readiness pointing at an already-ready stage.
- Hardened production attention digest stage total alignment.
  `scripts\dev-production-attention-digest.js` now derives ready and attention
  stage totals from `stage_summaries` and requires them to match
  `live_readiness_summary.ready_stage_count` and `attention_stage_count`. The
  regression tests now reject both ready-stage and attention-stage total drift.
- Hardened production attention digest stage summary counts.
  `scripts\dev-production-attention-digest.js` now validates each stage summary's
  gate counts, requiring non-negative integers and `ready_gate_count` plus
  `attention_gate_count` to match `gate_count`. Ready stages are also rejected if
  they still report attention gates. The regression tests now cover gate-count
  drift and ready-stage attention drift.
- Hardened production attention digest public audit consistency.
  `scripts\dev-production-attention-digest.js` now validates the embedded public
  report boundary audit summary: `ok` must be boolean, missing counts must be
  non-negative integers, and `ok` must align with aggregate missing counts. The
  regression tests now reject both `ok: true` with missing counts and `ok: false`
  with no missing counts.
- Hardened public report boundary audit policy completeness.
  `scripts\dev-public-report-boundary-audit.js` now requires every public audit
  boundary policy flag to be present and true, rather than accepting a partial
  policy object. The regression test now rejects a missing `no_commands` policy
  flag.
- Hardened public report boundary audit missing-list uniqueness.
  `scripts\dev-public-report-boundary-audit.js` now rejects duplicate public
  names in all missing lists, preserving count semantics for dev scripts, run
  scripts, dev-service files, and server files. The regression test now rejects
  duplicate missing allowlist script names.
- Hardened public report boundary audit ok-state consistency.
  `scripts\dev-public-report-boundary-audit.js` now requires `ok` to be a
  boolean and keeps it aligned with aggregate missing counts: `ok: true` requires
  zero missing counts, while `ok: false` requires at least one missing count. The
  regression tests now reject both aligned-count drift cases.
- Hardened public report boundary audit impossible-count checks.
  `scripts\dev-public-report-boundary-audit.js` now rejects impossible public
  audit totals before preflight consumes them, including assert-script counts
  above scanned scripts and missing counts above their scanned file groups. The
  regression test now covers assert-count overflow and run-script missing-count
  overflow directly at the public audit verifier.
- Hardened preflight production boundary policy regression coverage.
  `scripts\run-tests.js` now rejects a preflight report when
  `production.boundary_policy.no_secret_values` is false, keeping the production
  summary's no-secret-values guarantee pinned by a targeted regression test.
- Hardened preflight operator launch count diagnostics.
  `scripts\run-preflight.js` now emits targeted contract errors when operator
  launch ready or attention step counts drift from the launch sequence. The
  regression tests now cover both ready-count and attention-count mismatches.
- Hardened preflight integration probe summary schema diagnostics.
  `scripts\run-preflight.js` now emits a targeted contract error when optional
  `readiness.integration_probe_readiness_summary.schema` drifts from
  `iris_integration_probe_readiness_summary_v1`. The regression test now rejects
  integration probe summary schema drift explicitly.
- Hardened preflight production attention digest schema diagnostics.
  `scripts\run-preflight.js` now emits a targeted contract error when
  `production_attention_digest.schema` drifts from
  `iris_production_attention_digest_preflight_summary_v1`. The regression test
  now rejects production attention digest schema drift explicitly.
- Hardened final preflight ok-state diagnostics.
  `scripts\run-preflight.js` now emits targeted contract errors when the final
  public-safe preflight report does not resolve to `ok: true`, even if the
  top-level report, attention digest, and boundary audit booleans drift together.
  The regression test now rejects that aligned false-ok state explicitly.
- Hardened preflight boundary audit policy regression coverage.
  `scripts\run-tests.js` now rejects a preflight report when
  `public_report_boundary_audit.boundary_policy.no_file_contents` is false,
  keeping the public audit boundary's no-file-content guarantee pinned by a
  targeted regression test.
- Hardened preflight boundary audit schema validation.
  `scripts\run-preflight.js` now emits a targeted contract error when
  `public_report_boundary_audit.schema` drifts from
  `iris_public_report_boundary_audit_v1`, making schema boundary regressions
  easier to diagnose. The regression test now rejects boundary audit schema
  drift.
- Hardened preflight boundary audit allowlist-count upper bound.
  `scripts\run-preflight.js` now requires
  `public_report_boundary_audit.missing_allowlist_count` to be no greater than
  `scanned_script_count`, extending the missing-count upper-bound checks to the
  script allowlist scan. The regression test now rejects allowlist-count
  overflow.
- Hardened preflight boundary audit missing-count upper bounds.
  `scripts\run-preflight.js` now requires boundary audit missing counts for run
  scripts, dev services, and server files to be no greater than their scanned
  counts, preventing impossible public audit totals. The regression test now
  rejects missing-count overflow.
- Hardened preflight boundary audit script-count upper bound.
  `scripts\run-preflight.js` now requires
  `public_report_boundary_audit.assert_script_count` to be no greater than
  `scanned_script_count`, preventing impossible public audit scan totals. The
  regression test now rejects assert-count overflow.
- Hardened preflight spec missing/addendum separation.
  `scripts\run-preflight.js` now rejects overlap between `specs.missing` and
  `specs.addendum_files`, preventing a spec file from being reported both
  missing and present as an addendum. The regression test now rejects
  missing/addendum overlap.
- Hardened preflight spec expected-count positivity.
  `scripts\run-preflight.js` now requires `specs.expected` to be positive,
  preventing an empty public spec manifest from passing the preflight summary.
  The regression test now rejects zero expected spec counts.
- Hardened preflight spec count upper bound.
  `scripts\run-preflight.js` now requires `specs.found` to be no greater than
  `specs.expected`, preventing impossible public spec totals before the
  found-plus-missing reconciliation. The regression test now rejects found-count
  overflow.
- Hardened preflight spec missing-file uniqueness.
  `scripts\run-preflight.js` now requires `specs.missing` to contain unique
  public spec file names, preventing duplicate missing entries from inflating the
  public spec count reconciliation. The regression test now rejects duplicate
  missing spec files.
- Hardened preflight spec addendum uniqueness.
  `scripts\run-preflight.js` now requires `specs.addendum_files` to contain
  unique public spec file names, preventing duplicate addendum entries in the
  public spec summary. The regression test now rejects duplicate addendum files.
- Hardened preflight scenario final-review consistency.
  `scripts\run-preflight.js` now requires `scenario.last_review_required` to be
  false, matching the fixed `dev-basic` scenario's final step. The regression
  test now rejects safe-but-wrong final-review flags.
- Hardened preflight scenario step-count consistency.
  `scripts\run-preflight.js` now requires `scenario.step_count` to be 7,
  matching the fixed `dev-basic` scenario used by the preflight CLI. The
  regression test now rejects safe-but-wrong scenario step counts.
- Hardened preflight scenario identity consistency.
  `scripts\run-preflight.js` now requires `scenario.name` to be `dev-basic`,
  matching the fixed preflight scenario file loaded by the CLI. The regression
  test now rejects safe-but-wrong scenario names.
- Hardened preflight top-level ok type validation.
  `scripts\run-preflight.js` now requires top-level `ok` to be a boolean before
  comparing it with `public_report_boundary_audit.ok`, preventing string or
  numeric truthy values from passing as the public preflight envelope status. The
  regression test now rejects non-boolean `ok` values.
- Hardened preflight top-level ok boundary-audit consistency.
  `scripts\run-preflight.js` now requires top-level `ok` to match
  `public_report_boundary_audit.ok`, preventing the public preflight envelope
  from disagreeing with its boundary audit. The regression test now rejects
  top-level ok drift.
- Hardened preflight attention-digest boundary-audit consistency.
  `scripts\run-preflight.js` now requires
  `production_attention_digest.public_report_boundary_ok` to match
  `public_report_boundary_audit.ok`, preventing the compact production digest
  from disagreeing with the public boundary audit. The regression test now
  rejects boundary-ok drift.
- Hardened preflight production attention-stage env consistency.
  `scripts\run-preflight.js` now requires non-ready
  `production.stage_statuses` entries to list at least one `missing_required_env`,
  preventing attention stages from appearing without an operator-facing
  configuration reason. The regression test now rejects attention-stage
  missing-env drift.
- Hardened preflight production readiness-status consistency.
  `scripts\run-preflight.js` now requires `production.readiness_status` to be
  `attention_required`, matching the public preflight shape that exposes a next
  production stage and next-stage verification plan. The regression test now
  rejects production readiness-status drift.
- Hardened preflight ready launch-plan next-step consistency.
  `scripts\run-preflight.js` now requires a
  `production.operator_launch_plan.plan_status` of `ready_to_launch_foundation`
  to have no `next_step_id`, preventing a ready public launch plan from still
  pointing at pending startup work. The regression test now rejects ready launch
  plans with a next step.
- Hardened preflight ready launch-plan consistency.
  `scripts\run-preflight.js` now requires a
  `production.operator_launch_plan.plan_status` of `ready_to_launch_foundation`
  to have zero attention steps, preventing a public launch plan from claiming
  ready status while still carrying blocked launch work. The regression test now
  rejects ready launch plans with attention steps.
- Hardened preflight production verification plan status consistency.
  `scripts\run-preflight.js` now requires
  `production.verification_plan.plan_status` to be
  `start_next_attention_stage`, matching the public preflight shape that exposes
  a next production stage and non-empty next-stage verification scripts. The
  regression test now rejects verification plan status drift.
- Hardened preflight production verification script coverage.
  `scripts\run-preflight.js` now requires
  `production.verification_plan.next_stage_verification_scripts` to be non-empty,
  preventing a public verification plan from naming a next production stage
  without any next-stage checks. The regression test now rejects empty
  next-stage verification script lists.
- Hardened preflight production verification next-stage priority.
  `scripts\run-preflight.js` now requires
  `production.verification_plan.next_stage_priority` to be positive, preventing
  the public verification plan from naming a next production stage with a zero
  priority. The regression test now rejects zero-priority verification plans.
- Hardened preflight readiness integration-gap operator review consistency.
  `scripts\run-preflight.js` now requires each
  `readiness.integration_gap_statuses` item with
  `operator_configuration_required: true` to report
  `readiness_state: operator_review_required`, preventing operator-facing gap
  summaries from marking configuration work with a non-review state. The
  regression test now rejects operator-configuration gap state drift.
- Hardened preflight readiness integration-gap uniqueness.
  `scripts\run-preflight.js` now requires `readiness.integration_gaps` to contain
  unique public gap labels, preventing duplicate operator-facing gap entries
  from weakening the gap/status alignment checks. The regression test now
  rejects duplicate integration gap labels.
- Hardened preflight readiness next-state consistency.
  `scripts\run-preflight.js` now requires
  `readiness.next_readiness_state` to have a positive count in
  `readiness.readiness_state_counts`, preventing the public preflight readiness
  summary from naming a next state that is absent from its aggregate counts. The
  regression test now rejects readiness next-state drift.
- Hardened preflight integration probe summary engine-worker state consistency.
  `scripts\run-preflight.js` now requires an emitted
  `readiness.integration_probe_readiness_summary.engine_worker_readiness_state`
  to have a positive count in its readiness-state counts when the field is not
  null, preventing optional probe summaries from naming an absent worker state.
  The regression test now rejects engine-worker readiness-state drift.
- Hardened preflight integration probe summary next-state consistency.
  `scripts\run-preflight.js` now requires an emitted
  `readiness.integration_probe_readiness_summary.next_readiness_state` to have a
  positive count in its readiness-state counts, preventing optional integration
  probe summaries from naming a next state that is absent from the aggregate.
  The regression test now rejects next-readiness-state drift.
- Hardened preflight integration probe summary count consistency.
  `scripts\run-preflight.js` now requires an emitted
  `readiness.integration_probe_readiness_summary.probe_count` to match the sum
  of its readiness-state counts, preventing optional integration probe summaries
  from carrying contradictory aggregate counts. The regression test now rejects
  probe summaries whose state-count total drifts from `probe_count`.
- Hardened preflight attention digest live-readiness stage consistency.
  `scripts\run-preflight.js` now requires
  `production_attention_digest.live_readiness_next_stage_id` to match
  `production.operator_launch_plan.target_stage_id`, preventing the compact live
  readiness digest from pointing at a different stage than the operator launch
  plan. The regression test now rejects live-readiness stage drift.
- Hardened preflight attention digest live-readiness script consistency.
  `scripts\run-preflight.js` now requires
  `production_attention_digest.live_readiness_next_check_script` to be present
  in the public operator launch step launch/readiness script surface, preventing
  the compact live-readiness digest from pointing at an unrelated command. The
  regression test now rejects live-readiness check scripts outside the launch
  sequence script set.
- Hardened preflight attention digest next-task consistency.
  `scripts\run-preflight.js` now requires
  `production_attention_digest.next_task_stage_id` to match
  `production.next_stage`, and requires `next_task_check_script` to be present
  in `production.verification_plan.next_stage_verification_scripts`. The
  regression tests now reject digest summaries that point at a different next
  stage or at a check script outside the verification plan.
- Hardened preflight verification script uniqueness.
  `scripts\run-preflight.js` now requires
  `production.verification_plan.next_stage_verification_scripts` to contain
  unique safe npm commands, preventing duplicate verification entries from
  inflating the public next-stage checklist. The regression test now rejects
  repeated verification scripts.
- Hardened preflight missing-env list uniqueness. `scripts\run-preflight.js` now
  requires every `missing_required_env` list in public production stage statuses
  and operator launch steps to contain unique env names, preventing repeated env
  labels from inflating or obscuring operator-facing summaries. The regression
  tests now reject duplicate env names in both summary surfaces.
- Hardened preflight ready launch-step env consistency.
  `scripts\run-preflight.js` now rejects any
  `operator_launch_plan.launch_sequence` entry whose `launch_readiness_status`
  is `ready` while still listing `missing_required_env`, matching the
  ready-stage missing-env guard. The regression test now rejects ready launch
  steps with contradictory missing-env summaries.
- Hardened preflight production ready-stage env consistency.
  `scripts\run-preflight.js` now rejects any public `production.stage_statuses`
  entry whose `status` is `ready` while still listing `missing_required_env`,
  preventing ready stages from carrying contradictory missing-env summaries. The
  regression test now rejects ready-stage missing-env drift.
- Hardened preflight production stage identity validation.
  `scripts\run-preflight.js` now requires every `stage_id` in
  `production.stage_statuses` to be unique, preventing duplicate stage entries
  from weakening later next-stage and attention-digest reference checks. The
  regression test now rejects repeated production stage ids.
- Hardened preflight operator launch process identity validation.
  `scripts\run-preflight.js` now requires every `process_id` in
  `operator_launch_plan.launch_sequence` to be unique, preventing duplicate
  process entries in the public operator startup summary. The regression test
  now rejects launch sequences with repeated process ids.
- Hardened preflight operator launch sequence ordering.
  `scripts\run-preflight.js` now requires each launch step `sequence_order` to
  match its one-based position in `operator_launch_plan.launch_sequence`,
  preventing duplicate or skipped launch ordering in the public preflight
  summary. The regression test now rejects mismatched launch sequence order.
- Hardened preflight operator launch next-step consistency.
  `scripts\run-preflight.js` now requires `operator_launch_plan.next_step_id`
  and `next_step_order` to be null together or set together. When set, the next
  step id must exist in `launch_sequence` and its order must match the
  referenced launch step. The regression tests now reject half-set next-step
  summaries, unknown next-step ids, and mismatched next-step orders.
- Hardened preflight attention digest stage-reference consistency.
  `scripts\run-preflight.js` now requires
  `production_attention_digest.next_task_stage_id` and
  `production_attention_digest.live_readiness_next_stage_id` to exist in the
  public `production.stage_statuses` list. The regression tests now reject
  unknown next-task and live-readiness stage ids in the compact attention digest.
- Hardened preflight operator launch target-stage reference consistency.
  `scripts\run-preflight.js` now requires
  `production.operator_launch_plan.target_stage_id` to exist in the public
  `production.stage_statuses` list, preventing the operator launch summary from
  pointing at an unknown production stage. The regression test now rejects
  unknown launch target stage ids.
- Hardened preflight production next-stage reference consistency.
  `scripts\run-preflight.js` now requires `production.next_stage` to exist in
  the public `production.stage_statuses` list and requires
  `production.verification_plan.next_stage_id` to match `production.next_stage`.
  The regression tests now reject unknown next-stage ids and verification plans
  that point at a different stage than the production summary.
- Hardened preflight production attention digest stage count consistency.
  `scripts\run-preflight.js` now requires
  `production_attention_digest.ready_stage_count +
  production_attention_digest.attention_stage_count` to match the number of
  public `production.stage_statuses`, preventing the compact attention digest
  from drifting away from the stage status list. The regression test now rejects
  mismatched digest stage totals.
- Hardened preflight readiness integration gap summary consistency.
  `scripts\run-preflight.js` now requires `integration_gap_statuses` to have the
  same count and ordered gap ids as `integration_gaps`, preventing the public
  readiness summary from drifting between the compact gap list and detailed gap
  status list. The regression tests now reject missing status entries and
  mismatched gap ids while preserving the existing unsafe-label checks.
- Hardened preflight readiness candidate review count consistency.
  `scripts\run-preflight.js` now requires the public
  `readiness.candidate_review_items` count to be at least the executed scenario
  `step_count`, matching the candidate-review coverage enforced by smoke and
  scenario-suite reports. The regression test now rejects readiness summaries
  whose candidate review total falls below the scenario step count.
- Hardened preflight scenario summary count validation.
  `scripts\run-preflight.js` now requires the public scenario `step_count` to be
  positive, matching the fact that preflight runs a real scenario before
  publishing its summary. The regression test now rejects an empty scenario
  summary count.
- Hardened preflight specs summary count consistency. `scripts\run-preflight.js`
  now requires the public specs summary to satisfy
  `found + missing.length === expected`, so the published specification manifest
  cannot silently drift between expected, found, and missing counts. The
  regression test now rejects mismatched specs summary totals.
- Hardened scenario suite CLI aggregate count consistency.
  `scripts\run-scenario-suite.js` now validates each public result as an object,
  requires positive per-scenario `step_count`, requires
  `tongue_twister_step_count` to stay at or below `step_count`, and requires
  `candidate_review_item_count` to be at least the public `step_count`. The
  regression test now rejects null result entries and impossible aggregate
  counts.
- Hardened smoke CLI public count consistency. `scripts\run-smoke.js` now
  requires `game_step_count` to be positive and no greater than `step_count`,
  and requires `candidate_review_item_count` to be at least the public
  `step_count`. The regression test now rejects zero game-step summaries,
  impossible game-step totals, and candidate review totals below the step count.
- Hardened scenario CLI required public step status validation.
  `scripts\run-scenario.js` now requires key public step status fields such as
  `final_decision`, `boundary_audit_status`, and `candidate_validation_status`
  to be present safe public tokens instead of treating them as optional labels.
  The regression test now rejects a missing final decision status.
- Hardened scenario CLI candidate count consistency. `scripts\run-scenario.js`
  now requires each public step's committed memory count to stay at or below its
  approved memory count, and approved memory count to stay at or below the
  candidate review count. The regression test now rejects both inverted summary
  count relationships.
- Hardened scenario CLI step index consistency. `scripts\run-scenario.js` now
  requires each public step `index` to match its position in the `results` array,
  ensuring the scenario report cannot silently drift between array order and
  per-step index labels. The regression test now rejects mismatched step index
  values.
- Hardened scenario CLI step object validation. `scripts\run-scenario.js` now
  validates each public `results` entry as an object with allowlisted step fields
  before reading step properties, preventing null or scalar entries from falling
  through to low-level runtime errors. The regression test now rejects `null`
  step entries explicitly.
- Hardened scenario CLI results container validation. `scripts\run-scenario.js`
  now requires the public `results` field to be an array before comparing its
  length with `step_count`, separating malformed container shape from ordinary
  count mismatches. The regression test now rejects object-shaped `results`.
- Hardened scenario CLI top-level step count validation. `scripts\run-scenario.js`
  now requires the public `step_count` field to be a non-negative integer before
  comparing it with the `results` array length. This makes malformed top-level
  count types fail with an explicit public-report boundary error instead of only
  a generic length mismatch. The regression test now rejects string-valued
  scenario step counts.
- Cleaned up preflight public-report helper drift. `scripts\run-preflight.js`
  no longer carries the unused `assertOptionalString` helper after optional
  string slots were tightened to optional safe public labels. This keeps the
  preflight public-report validation helpers aligned with the current boundary
  rules and reduces maintenance noise.
- Hardened preflight public boundary audit missing-count consistency.
  `scripts\run-preflight.js` now requires all public boundary audit missing
  counts to be zero whenever the audit summary reports `ok: true`, making the
  pass/fail flag explicit instead of relying on later generic equality checks.
  The regression test now rejects a nonzero missing run-boundary count under an
  otherwise passing audit summary.
- Hardened preflight public boundary audit scan counts.
  `scripts\run-preflight.js` now requires the main public report boundary audit
  scan counters, including script, run-script, dev-service, and server-file scan
  counts, to be positive integers. This prevents an `"ok": true` audit summary
  from passing with structurally valid but empty scan coverage. The regression
  test now rejects a zero run-script scan count.
- Hardened preflight attention digest stage count presence.
  `scripts\run-preflight.js` now rejects a public
  `production_attention_digest` summary where `ready_stage_count` and
  `attention_stage_count` add up to zero, preventing a structurally valid but
  contentless stage-count summary. The regression test now covers the empty
  stage-count case.
- Hardened preflight operator launch count consistency.
  `scripts\run-preflight.js` now requires
  `production.operator_launch_plan.ready_step_count` and `attention_step_count`
  to match the validated `launch_sequence` readiness statuses, preventing count
  drift between the public operator launch totals and their summarized steps. The
  regression test now rejects mismatched ready-step totals.
- Hardened preflight verification script count consistency.
  `scripts\run-preflight.js` now requires
  `production.verification_plan.total_verification_script_count` to cover the
  listed `next_stage_verification_scripts`, preventing a public production
  verification summary where the total script count is smaller than the next
  stage script list. The regression test now rejects undercounted totals.
- Hardened preflight production array presence validation.
  `scripts\run-preflight.js` now rejects empty public
  `production.operator_launch_plan.launch_sequence` and `production.stage_statuses`
  arrays so the preflight production summary cannot report a structurally valid
  but contentless operator launch or stage status plan. The regression test now
  covers both empty-array cases.
- Hardened preflight launch sequence order validation. `scripts\run-preflight.js`
  now requires each public `production.operator_launch_plan.launch_sequence`
  `sequence_order` to be a positive integer, matching the 1-based operator launch
  order in the generated runbook. The regression test now rejects zero-valued
  launch order entries.
- Hardened preflight optional production label validation.
  `scripts\run-preflight.js` now requires optional production summary labels
  such as `production.operator_launch_plan.next_step_id` and
  `production_attention_digest.operator_focus_reason` to be either `null` or safe
  public labels. The regression test now rejects freeform next-step text and
  endpoint-like operator focus reasons.
- Hardened preflight readiness summary validation. `scripts\run-preflight.js`
  now requires public readiness `status`, `next_readiness_state`, and
  `candidate_review_items` to be safe labels/counts, and validates the optional
  `integration_probe_readiness_summary` object with an allowlisted counts-and-
  labels-only shape when present. The regression test now rejects freeform
  readiness status text and non-finite candidate-review counts.
- Hardened preflight scenario id validation. `scripts\run-preflight.js` now
  requires the public `scenario.name` value to be a safe public token such as
  `dev-basic`, matching the scenario and smoke CLI identity boundaries and
  preventing endpoint-like or freeform values from occupying the preflight
  scenario id slot. The regression test now rejects URL-shaped scenario names.
- Hardened preflight spec file name validation. `scripts\run-preflight.js` now
  requires public `specs.missing` and `specs.addendum_files` entries to match
  `IRIS_20240425_*.txt` file names only, preventing URL-shaped values, paths, or
  freeform diagnostics from occupying spec file slots. The regression test now
  rejects endpoint-like addendum file values.
- Hardened preflight integration gap id validation. `scripts\run-preflight.js`
  now requires the public `integration_gaps` array to contain safe public labels
  only, matching the stricter `integration_gap_statuses` boundary and preventing
  endpoint-like text or freeform diagnostics from occupying gap id slots. The
  regression test now rejects URL-shaped gap values.
- Hardened preflight integration gap status validation. `scripts\run-preflight.js`
  now requires each public `integration_gap_statuses` entry to use safe public
  labels for `gap`, `status`, and `readiness_state`, and a boolean
  `operator_configuration_required` flag. The regression test now rejects
  endpoint-like status text and stringified booleans in the preflight readiness
  summary.
- Hardened preflight readiness count validation. `scripts\run-preflight.js` now
  requires each public `readiness_state_counts` value to be a non-negative
  integer after the readiness count keys are allowlisted. The regression test now
  rejects malformed count values such as `NaN` while preserving the public-safe
  preflight production summaries.
- Hardened scenario CLI step metric validation. `scripts\run-scenario.js` now
  requires each public step `human_likeness_score` to be a finite non-negative
  number, matching the smoke and scenario-suite metric boundaries and rejecting
  `NaN` or infinite values in per-step CLI output. The regression test now covers
  both malformed per-step metric cases.
- Hardened scenario-suite metric validation. `scripts\run-scenario-suite.js`
  now requires each aggregate `min_human_likeness_score` to be a finite
  non-negative number, matching the smoke report metric boundary and rejecting
  `NaN` or infinite values in public suite output. The regression test now
  covers both malformed aggregate metric cases.
- Hardened smoke report metric validation. `scripts\run-smoke.js` now requires
  the public `min_human_likeness_score` metric to be a finite non-negative
  number, rejecting `NaN` and infinite values before the smoke report can be
  treated as safe. The regression test now covers both malformed metric cases
  while keeping the smoke report counts-only and candidate-free.
- Hardened scenario-suite top-level result validation. `scripts\run-scenario-suite.js`
  now explicitly requires the public `scenario_count` to be a non-negative
  integer and `results` to be an array before comparing their sizes. The
  regression test now also checks that malformed count and result-container
  shapes are rejected, while preserving the canonical `scenarios/*.json` public
  path format.
- Normalized scenario-suite public file paths. `scripts\run-scenario-suite.js`
  now emits aggregate result `file` values as forward-slash
  `scenarios/*.json` public paths and validates the same canonical shape. This
  removes Windows backslash drift from the suite report while keeping file
  references limited to public scenario JSON names.
- Hardened scenario-suite scenario id validation. `scripts\run-scenario-suite.js`
  now requires each aggregate result `name` to be a safe public token such as
  `dev-basic`, `dev-boundaries`, or `dev-multilingual-voice`. This aligns suite
  scenario names with the smoke and scenario CLI public id boundaries and
  prevents endpoint-like values, diagnostic text, command fragments, payload
  snippets, or private runtime values from occupying suite scenario identifier
  slots.
- Hardened smoke scenario id validation. `scripts\run-smoke.js` now requires the
  smoke report's `scenario` field to be a safe public token such as `dev-basic`,
  aligning the smoke report identity check with the scenario CLI public id
  boundary. This prevents endpoint-like values, diagnostic text, command
  fragments, payload snippets, or private runtime values from occupying the smoke
  scenario identifier.
- Hardened scenario CLI public id validation. `scripts\run-scenario.js` now
  requires the scenario report name and each step `event_id` to be safe public
  token strings such as `dev-basic` and `scenario-comment-0`. This makes the
  scenario identity fields mandatory public ids and prevents endpoint-like
  strings, diagnostic text, command fragments, payload snippets, or private
  runtime values from occupying those identifier slots.
- Hardened scenario-suite response language validation.
  `scripts\run-scenario-suite.js` now requires `response_languages` to contain
  public language-code tokens such as `en`, `ja`, `de`, `ur`, or `pl`, rather
  than arbitrary strings. This prevents diagnostic text, payload snippets,
  endpoint-like values, commands, or raw response content from drifting into the
  scenario-suite aggregate language summary.
- Hardened scenario CLI public token validation. `scripts\run-scenario.js` now
  requires public step label fields such as event ids, action/status ids,
  expression/profile ids, game-control status, session phase, and candidate
  validation status to be safe token strings without spaces, URL syntax, command
  fragments, payload snippets, or diagnostic text. Optional final text remains a
  string-only summary field, while raw candidates, approved actions, commands,
  and raw runtime state remain excluded from the public report.
- Hardened scenario CLI boundary policy validation. `scripts\run-scenario.js`
  now allowlists the scenario boundary policy fields and requires
  `summary_fields_only`, `no_candidates`, `no_commands`, and
  `no_raw_runtime_state` to be explicitly `true`. This prevents diagnostics, raw
  payload markers, command text, candidate details, or non-boolean policy drift
  from being hidden inside the scenario CLI public policy object.
- Hardened scenario-suite boundary policy validation.
  `scripts\run-scenario-suite.js` now allowlists the suite boundary policy fields
  and requires each allowed flag to be explicitly `true`. This prevents future
  diagnostics, raw payload markers, command text, candidate details, or non-
  boolean policy drift from being hidden inside the scenario-suite public policy
  object.
- Hardened smoke report shape validation. `scripts\run-smoke.js` now verifies
  smoke step/game/candidate-review counts are non-negative integers, the minimum
  human-likeness score is non-negative, and the boundary policy object contains
  only the expected counts-only/no-raw-steps/no-candidates/no-commands flags with
  explicit `true` values. This keeps the smoke CLI's small public report
  well-formed while preserving its counts-only boundary.
- Hardened scenario-suite result summary shape validation.
  `scripts\run-scenario-suite.js` now verifies each aggregate result's scenario
  file reference is a public `scenarios/*.json` path, scenario name is a string,
  step/tongue-twister/candidate-review counts are non-negative integers,
  response languages are string arrays, and min human-likeness score is
  non-negative. This keeps the scenario-suite public report constrained to
  well-formed aggregate values while preserving the no raw step payload,
  no-candidate, and no-command boundaries.
- Hardened scenario CLI step summary shape validation. `scripts\run-scenario.js`
  now verifies each public step summary's string labels, optional final text,
  non-negative integer counters/durations, non-negative human-likeness score, and
  boolean review flag after checking the step field allowlist. This keeps the
  scenario CLI public report constrained to well-formed summary values while
  continuing to reject raw candidates, approved actions, commands, and raw
  runtime state.
- Added package-script regression coverage for the main run CLIs. `scripts\run-tests.js`
  now verifies `preflight`, `smoke`, `scenario`, `scenario:suite`, and `test`
  still point at the reusable `scripts\run-*.js` entrypoints. This keeps the
  package-level operator commands aligned with the newly exported report
  creation/assertion modules for preflight, smoke, scenario, and scenario-suite
  workflows.
- Added regression coverage for the scenario suite public surface.
  `scripts\run-scenario-suite.js` now exports `createScenarioSuiteReport` and
  `assertScenarioSuiteReportSafe` while preserving the CLI JSON output path.
  `scripts\run-tests.js` now imports the suite report directly and verifies the
  aggregate-only schema, scenario count, scenario file references, per-scenario
  step/candidate-review counts, boundary policy flags, and absence of raw final
  text, input candidates, approved game actions, or raw runtime state. This pins
  the scenario-suite CLI's public report contract in the full test suite.
- Made the scenario CLI reusable and resilient to incomplete local HTTP adapter
  configuration. `scripts\run-scenario.js` now exports `createScenarioCliReport`
  and `assertScenarioReportSafe` while preserving the CLI JSON output path. When
  the local env selects HTTP game control or HTTP vector memory search without
  the required endpoint, the scenario CLI falls back to mock/local adapters so
  the development scenario can still run safely on a newly restored PC.
  `scripts\run-tests.js` now verifies this fallback and the scenario report's
  public boundary flags, candidate-free fields, and absence of endpoint/raw
  runtime markers.
- Added regression coverage for the smoke public surface. `scripts\run-smoke.js`
  now exports `createSmokeReport` and `assertSmokeReportSafe` while preserving
  the CLI JSON output path. `scripts\run-tests.js` now imports the smoke report
  directly and verifies the counts-only schema, scenario name, step counts,
  candidate-review count, human-likeness floor, boundary policy flags, and
  absence of raw steps, final text, input candidates, or approved game actions.
  This pins the smoke CLI's public report contract in the full test suite.
- Added regression coverage for the main preflight public surface. `scripts\run-preflight.js`
  now exports `createPreflightReport` and `assertPreflightReportSafe` while
  preserving the CLI JSON output path. `scripts\run-tests.js` now imports the
  preflight report directly and verifies the production summary, production
  attention digest summary, public boundary audit schema/policy, safe npm-script
  references, env-name-only missing env arrays, and absence of endpoint/raw
  runtime text markers. This pins the recent preflight hardening in the full test
  suite without needing a child process.
- Hardened preflight missing-env-name arrays. `scripts\run-preflight.js` now
  verifies `missing_required_env` arrays in production launch steps and stage
  statuses contain uppercase environment variable names only. This keeps
  production preflight guidance to env-name references while preventing endpoint
  values, secret values, command fragments, diagnostics, payload snippets, or
  private runtime details from masquerading as missing environment names.
- Hardened preflight public npm-script fields. `scripts\run-preflight.js` now
  requires copied verification scripts, launch scripts, readiness scripts, and
  production-attention-digest check scripts to match safe public `npm run ...`
  script names or `npm test`. This narrows formerly generic string checks so
  shell fragments, endpoint-like strings, command output, payload snippets,
  diagnostics, or private runtime values cannot masquerade as public script
  guidance in the preflight report.
- Hardened preflight public status/schema labels. `scripts\run-preflight.js` now
  requires selected production and production-attention-digest status, stage, and
  focus ids to be safe `lower_snake_case` public labels, and it pins the copied
  public report boundary audit schema to `iris_public_report_boundary_audit_v1`.
  This narrows formerly generic string checks so malformed labels, endpoint-like
  strings, command text, payload snippets, diagnostics, or private runtime values
  cannot masquerade as public status fields.
- Hardened production runbook boundary policies copied into preflight.
  `scripts\run-preflight.js` now allowlists and requires explicit `true` values
  for `production.verification_plan.boundary_policy` and
  `production.operator_launch_plan.boundary_policy`. This keeps the copied
  production runbook policy summaries constrained to script/env-name only,
  no-secret, no-endpoint, no-payload, safe-local-command, and read-only plan
  flags while preventing future non-boolean policy drift or private operational
  details from being hidden inside those policy objects.
- Hardened preflight-owned boundary policy flag values. `scripts\run-preflight.js`
  now verifies every allowlisted flag in the preflight-owned production,
  production-attention-digest, and public-report-boundary-audit policy summaries
  is explicitly `true`, not merely present. This prevents future policy drift
  where a no-secret/no-endpoint/no-command/read-only flag could be weakened or
  replaced with a non-boolean value while still passing field allowlist checks.
- Hardened preflight Public Report Boundary Audit summary shape validation.
  `scripts\run-preflight.js` now verifies the copied audit summary's `ok` flag,
  schema string, scan counts, missing-boundary counts, and boundary-policy flags
  before printing the final preflight report. This keeps the public boundary
  audit section constrained to counts, schema names, and explicit no-file-content
  / no-env-value / no-command policy flags while preventing malformed objects,
  file contents, environment values, endpoint values, command output, or raw
  audit details from drifting into the main preflight surface.
- Hardened preflight production summary shape validation. `scripts\run-preflight.js`
  now verifies production status/stage labels, verification plan script lists and
  counts, operator launch plan counts and nullable next-step routing, each launch
  step's order/script/env-name list, and each stage status/env-name list before
  printing the final report. This keeps the production section constrained to
  expected labels, counts, script names, launch ordering, and env-name arrays
  while preventing malformed objects, diagnostics, endpoint values, command
  output, candidate details, payloads, or private runbook internals from
  drifting into the preflight surface.
- Hardened preflight Production Attention Digest compact summary shape
  validation. `scripts\run-preflight.js` now verifies the compact digest's
  status/stage/script fields are strings, optional focus reason and worker-job
  counts stay nullable-safe, ready/attention stage counts are non-negative
  integers, and the public boundary audit flag is boolean before printing the
  final preflight report. This keeps the operator-facing digest summary from
  drifting into raw objects, diagnostics, endpoint values, command payloads,
  candidate details, or private runtime state.
- Hardened preflight specs and scenario summary shape validation.
  `scripts\run-preflight.js` now verifies that spec counts and scenario step
  counts are non-negative integers, spec missing/addendum lists are string
  arrays, the scenario name is a string, and the last-review flag is boolean
  before printing the final report. This keeps the small specs/scenario preflight
  summaries constrained to expected public names, counts, and flags while
  preventing malformed objects, raw scenario payloads, diagnostics, endpoints,
  commands, candidates, or private runtime details from drifting into those
  sections.
- Hardened preflight-owned boundary policy summaries. `scripts\run-preflight.js`
  now allowlists the boundary policy flags it creates for
  `production.boundary_policy` and
  `production_attention_digest.boundary_policy`. This keeps the preflight-owned
  policy summaries to explicit env-name, script-name, count/status/boolean,
  no-secret, no-endpoint, no-live-payload, no-candidate, no-command, and
  read-only flags while preventing future diagnostics, endpoint values, command
  text, candidate details, or raw runtime/payload fields from being hidden inside
  policy objects.
- Hardened nested readiness summaries inside main preflight. `scripts\run-preflight.js`
  now allowlists the readiness-state count labels and each
  `integration_gap_statuses` item before printing the final preflight report.
  This keeps the readiness section limited to expected readiness labels, counts,
  integration ids, statuses, and operator-configuration booleans while rejecting
  future nested diagnostics, endpoint values, secret values, raw probe payloads,
  candidate details, commands, or private runtime state.
- Hardened nested production summaries inside main preflight. `scripts\run-preflight.js`
  now allowlists fields inside `production.verification_plan`,
  `production.operator_launch_plan`, each operator launch step, and each
  production stage status before printing the final preflight report. This keeps
  production preflight guidance limited to statuses, counts, script names,
  env-name lists, launch ordering, and boundary policies while rejecting future
  nested diagnostics, endpoint values, secret values, raw command output,
  candidates, payloads, or private runbook internals.
- Hardened main preflight section summary validation. `scripts\run-preflight.js`
  now allowlists the direct public fields inside its `specs`, `scenario`,
  `readiness`, and `production` summaries before accepting the final preflight
  report. This keeps the main preflight output constrained to expected counts,
  statuses, script names, env-name lists, and boundary policy summaries while
  preventing future diagnostic details, endpoint values, secrets, commands,
  candidates, raw scenario payloads, or private production runbook details from
  drifting into those sections.
- Hardened preflight Public Report Boundary Audit compact summary validation.
  `scripts\run-preflight.js` now allowlists the public fields copied into its
  `public_report_boundary_audit` summary, keeping the preflight audit surface to
  schema names, scan counts, missing-boundary counts, and boundary policy flags.
  This prevents future nested diagnostics, file contents, paths beyond public
  script/file names, commands, endpoint values, secrets, or raw report details
  from drifting into the main preflight output.
- Hardened preflight Production Attention Digest compact summary validation.
  `scripts\run-preflight.js` now allowlists the public fields inside its
  `production_attention_digest` compact summary before accepting the report,
  preserving the safe operator focus reason, urgency label, script names, stage
  counts, and public boundary status while rejecting unexpected nested
  diagnostic, endpoint, secret, command, candidate, queue payload, or raw runtime
  fields.
- Hardened Production Attention Digest nested summary validation. Runtime
  handoff, next-task, live-readiness, public-report audit, and per-stage
  summaries now each have explicit public field allowlists. The digest rejects
  unexpected nested endpoint, raw gate payload, diagnostic, command, candidate,
  secret, or runtime-state fields while preserving the existing safe status,
  count, script-name, focus reason, focus urgency, and stage attention summary
  output.
- Hardened Production Attention Digest `operator_focus` nested field validation.
  The digest now allowlists the public fields inside `operator_focus`, rejecting
  unexpected nested diagnostics before raw runtime state, queue payloads,
  endpoints, secrets, commands, candidates, or private handoff details can be
  added to the operator-facing focus summary. Regression coverage now checks
  that nested `raw_runtime_state` is rejected while preserving the safe focus
  reason, urgency label, script names, and worker job counts.
- Added operator focus urgency to Production Attention Digest. The digest now
  labels the selected `operator_focus` as `ready`, `attention`, or
  `multi_gate_attention` using only existing safe status/count fields.
  `scripts\run-preflight.js` surfaces the same `operator_focus_urgency` label in
  its compact production attention summary, so an operator can quickly tell
  whether the current whole-system focus is a single attention path or a broader
  multi-gate blocker without exposing queue payloads, endpoints, secrets,
  commands, candidates, or raw runtime state.
- Added operator focus reason and queue hints to Production Attention Digest.
  `operator_focus` now includes a safe reason label plus pending/retry-blocked
  worker job counts when the runtime handoff is blocked by the foundation local
  bridge worker path. `scripts\run-preflight.js` surfaces the same
  `operator_focus_reason`, `operator_focus_pending_worker_job_count`, and
  `operator_focus_retry_blocked_worker_job_count` fields in its compact
  production attention summary, making the next whole-system bottleneck easier to
  understand without exposing queue payloads, endpoints, secrets, commands, or
  raw runtime state.
- Added operator focus routing to Production Attention Digest. The digest now
  emits an `operator_focus` summary that selects the first whole-system attention
  surface across runtime handoff, live readiness, and production next-task
  status. `scripts\run-preflight.js` now surfaces `operator_focus_id` and
  `operator_focus_check_script` in the compact preflight digest summary, so a
  normal preflight run points to the next safest verification command without
  exposing endpoints, secrets, payloads, candidates, commands, or raw runtime
  state.
- Integrated Production Attention Digest into the main preflight output.
  `scripts\run-preflight.js` now includes a compact
  `production_attention_digest` summary with runtime handoff status, next runtime
  check script, next production-task stage/readiness/check script,
  live-readiness status, live-readiness next stage/check script, ready/attention
  stage counts, and public-report audit health. The preflight validator now
  checks this summary's schema and boundary flags, keeping the output to script
  names, counts, booleans, and statuses without endpoints, secrets, live
  payloads, candidates, commands, or child reports.
- Added a regression test for Production Attention Digest. The digest CLI now
  exposes reusable report creation and validation functions, and
  `scripts\run-tests.js` verifies the whole-system attention summary directly:
  runtime handoff status, next production priority, live-readiness status, four
  stage summaries, public-report audit health, boundary flags, and rejection of
  unexpected top-level fields. This keeps `npm run
  dev:production:attention-digest` pinned as a safe whole-system status surface
  without endpoint values, secrets, live text, candidates, or commands.
- Added a whole-system Production Attention Digest CLI. `npm run dev:production:attention-digest`
  now combines production runtime handoff,
  next-task, live-readiness, and public-report boundary audit summaries into
  `iris_production_attention_digest_v1`. The digest is read-only and reports only
  counts, statuses, booleans, env-name counts, and script names so operators can
  see the current next production bottleneck without expanding raw child reports,
  endpoints, secrets, live payloads, text payloads, memory/relationship records,
  candidates, commands, raw frames, or runtime state.
- Extended Public Report Boundary Audit to cover `src\server` public bridge and
  HTTP report validators. The audit now reports `scanned_server_file_count`,
  `server_assert_count`, `missing_server_allowlist_count`, and public-safe
  missing server file names alongside dev-script, run-script, and dev-service
  coverage. `scripts\run-preflight.js` now includes
  `missing_server_allowlist_count` in its counts-only audit summary and requires
  it to remain zero, so bridge/server public report allowlist regressions are
  caught by the normal token-light preflight path.
- Extended Public Report Boundary Audit to cover `src\services\dev` report
  services. The audit now reports `scanned_dev_service_count`,
  `dev_service_assert_count`, `missing_dev_service_allowlist_count`, and
  public-safe missing service file names alongside the existing dev-script and
  run-script coverage. `scripts\run-preflight.js` now includes
  `missing_dev_service_allowlist_count` in its counts-only audit summary and
  requires it to remain zero, so preflight catches service-level public report
  allowlist regressions without printing service source, env values, commands,
  endpoints, or secrets.
- Extended Public Report Boundary Audit to cover `scripts\run-*.js` boundary
  metadata. The audit now reports `scanned_run_script_count`,
  `missing_run_boundary_count`, and public-safe missing run-script names alongside
  the existing `scripts\dev-*.js` allowlist coverage. `scripts\run-preflight.js`
  now includes `missing_run_boundary_count` in its counts-only audit summary and
  requires it to remain zero, so normal preflight catches both dev-script report
  allowlist regressions and run-script boundary metadata regressions in one
  token-light check.
- Hardened smoke CLI public output validation. `scripts\run-smoke.js` now emits
  `iris_smoke_report_v1`, materializes its public counts-only report, validates
  top-level fields against an allowlist before printing, and declares boundary
  flags for counts-only output, no raw steps, no candidates, and no commands.
  The `scripts\run-*.js` boundary scan now reports no remaining run-script
  outputs without boundary metadata.
- Hardened scenario runner CLI public output validation. `scripts\run-scenario.js`
  now materializes its public scenario report, validates top-level fields and
  per-step summary fields against allowlists before printing, and declares
  boundary flags for summary-only output, no candidates, no commands, and no raw
  runtime state. `scripts\run-scenario-suite.js` now emits
  `iris_scenario_suite_report_v1`, validates top-level and per-scenario result
  fields, and declares boundary flags for file-name-only suite results, no raw
  step payloads, no candidates, and no commands. This keeps normal scenario
  diagnostics from drifting into raw candidate payloads, commands, or runtime
  internals while preserving useful review counts and human-likeness summaries.
- Hardened main preflight output top-level validation. `scripts\run-preflight.js`
  now builds a materialized preflight report, validates its top-level public
  fields against an allowlist before printing, and checks the embedded
  `public_report_boundary_audit` status plus production boundary flags. This
  keeps the normal preflight JSON from drifting into unexpected diagnostics,
  file contents, env values, commands, endpoints, secrets, or script bodies while
  preserving the counts-only audit summary.
- Added a regression test for Public Report Boundary Audit. `scripts\run-tests.js`
  now imports the reusable audit report creator and validator, confirms the audit
  covers the dev script surface, verifies `missing_allowlist_count: 0`, checks
  the boundary policy flags, rejects unexpected public fields, and confirms the
  `dev:public-report-boundary-audit` package script target. This pins the
  token-efficient audit path in the normal test suite without printing source
  contents, env values, commands, endpoints, or secrets.
- Integrated Public Report Boundary Audit into the main preflight path. The
  audit CLI now exposes reusable report creation and validation functions while
  preserving direct CLI execution. `scripts\run-preflight.js` now runs the audit
  and includes a counts-only `public_report_boundary_audit` summary in its safe
  JSON output, so future `scripts\dev-*.js` report-boundary regressions are
  caught during the normal preflight flow without exposing file contents, env
  values, commands, endpoints, secrets, or script bodies. Direct audit execution
  still reports `missing_allowlist_count: 0`, and preflight now reports the same
  audit status.
- Added Public Report Boundary Audit CLI. `npm run dev:public-report-boundary-audit`
  now scans `scripts\dev-*.js` for
  assert-style validators that lack allowlist-style public field constants,
  reporting only counts and script names. The audit currently reports
  `missing_allowlist_count: 0` across 151 dev scripts, with boundary flags for no
  file contents, env values, commands, endpoints, or secrets in the public
  report. This also closed the last two audit findings by adding top-level
  report allowlists to `scripts\dev-live2d-cue-engine-roundtrip.js` and
  `scripts\dev-production-loop-roundtrip.js`; the Production Loop roundtrip now
  accepts the fixture's safe foundation probe attention state while still
  validating stage counts and handoff consistency. Direct execution of the audit,
  Live2D cue engine roundtrip, and Production Loop roundtrip returned `"ok":
  true`; `node --check` passed for all three scripts. Smoke also returned `"ok":
  true`.
- Hardened YouTube Ingest Once CLI public report top-level field validation.
  The ingest-once CLI now rejects unexpected public fields before preflight,
  runtime-status, support-flow, live-readiness, tick, public-state, production
  handoff, or boundary summaries can drift into diagnostics, endpoints, secrets,
  live payloads, support text, platform ids, cursor values, candidates, commands,
  or raw scheduler results. The CLI now also pins unrelated gameplay,
  memory-search, media, and topic adapters to local-empty settings. A scan for
  `scripts\dev-*.js` files with assert functions and no allowlist-style field
  constant now returns no remaining candidates. Direct execution of
  `scripts\dev-youtube-ingest-once.js` returned `"ok": true`; `node --check`
  passed for the script; `node scripts\run-tests.js` passed: all 359 tests
  passed. Smoke also returned `"ok": true`.
- Hardened YouTube HTTP Ingest Roundtrip public report top-level field
  validation. The HTTP ingest roundtrip now rejects unexpected public fields
  before platform counts, ingest tick summaries, source status summaries,
  persistence summaries, or boundary policy can drift into platform/IRIS
  endpoints, OAuth secrets, live chat ids, page tokens, moderation terms,
  chat/support text, raw payloads, store paths, candidates, commands, or record
  payloads. The script now pins unrelated gameplay, memory-search, media, and
  topic adapters to local-empty settings so host env cannot affect this focused
  YouTube API ingest check. Direct execution of
  `scripts\dev-youtube-http-ingest-roundtrip.js` returned `"ok": true`; `node
  --check` passed for the script; `node scripts\run-tests.js` passed: all 359
  tests passed. Smoke also returned `"ok": true`.
- Hardened YouTube Relay Roundtrip public report top-level field validation.
  The relay roundtrip now rejects unexpected public fields before fixture counts,
  source status summaries, ingest summaries, public persistence counts, or
  boundary policy can drift into relay endpoints, persistence store paths,
  blocked authors/terms, chat/support text, raw payloads, dedupe internals,
  memory/relationship record payloads, candidates, or commands. The script now
  also pins unrelated gameplay, memory-search, media, and topic adapters to
  local-empty settings so host env cannot make this focused YouTube relay check
  fail for unrelated reasons, and it accepts host policy-driven increases above
  the fixture minimum memory/relationship counts. Direct execution of
  `scripts\dev-youtube-relay-roundtrip.js` returned `"ok": true`; `node --check`
  passed for the script; `node scripts\run-tests.js` passed: all 359 tests
  passed. Smoke also returned `"ok": true`.
- Hardened YouTube Policy Gate and Relay Status Roundtrip public report
  top-level field validation. The policy gate roundtrip now rejects unexpected
  public fields before preflight, launch-plan, runtime-status, or boundary
  policy summaries can drift into external relay endpoints, API keys, live
  payloads, support text, candidates, or commands. The relay status roundtrip
  now materializes a public report object and rejects unexpected fields before
  fixture counts, event summaries, public source status, or boundary policy can
  drift into relay endpoint values, API keys, chat/support text, raw payloads,
  dedupe internals, candidates, or commands. Direct checks returned `"ok": true`
  for both `scripts\dev-youtube-policy-gate-roundtrip.js` and
  `scripts\dev-youtube-relay-status-roundtrip.js`; `node --check` passed for
  both scripts; `node scripts\run-tests.js` passed: all 359 tests passed. Smoke
  also returned `"ok": true`.
- Hardened Live2D Cue Engine Unsafe Roundtrip public report top-level field
  validation. The unsafe Live2D roundtrip now rejects unexpected public fields
  before response status, safe-error kind, renderer request count, or boundary
  policy can drift into diagnostic, renderer endpoints, raw cue bodies, unsafe
  renderer ACK candidates, commands, text payloads, or secrets. Direct execution
  of `scripts\dev-live2d-cue-engine-unsafe-roundtrip.js` returned `"ok": true`;
  `node --check` passed for the script; `node scripts\run-tests.js` passed: all
  359 tests passed. Smoke also returned `"ok": true`.
- Hardened VOICEVOX TTS Engine Roundtrip and Unsafe Roundtrip public report
  top-level field validation. The normal VOICEVOX roundtrip now rejects
  unexpected public fields before fixture engine request counts, health summary,
  TTS response summary, or boundary policy can drift into diagnostic, endpoint
  values, raw text, audio bodies, raw engine requests, candidates, commands, or
  secrets. The unsafe roundtrip now does the same before response status,
  safe-error kind, fixture fetch count, or boundary policy can drift into unsafe
  request text, job/event ids, endpoint values, candidates, commands, or secrets.
  Direct checks returned `"ok": true` for both
  `scripts\dev-voicevox-tts-engine-roundtrip.js` and
  `scripts\dev-voicevox-tts-engine-unsafe-roundtrip.js`; `node --check` passed
  for both scripts; `node scripts\run-tests.js` passed: all 359 tests passed.
  Smoke also returned `"ok": true`.
- Hardened Foundation Blocked Worker Roundtrip and Bridge Render Manifest CLI
  public report top-level field validation. The blocked-worker roundtrip now
  rejects unexpected public fields before runtime status, worker readiness,
  queue state, real-engine handoff status, runtime handoff flow, OBS artifact
  flow, or boundary policy can drift into diagnostic, raw jobs, endpoint values,
  artifact paths, text payloads, candidates, commands, or secrets. The bridge
  render-manifest CLI now mirrors the operator-report top-level allowlist so the
  CLI surface cannot add diagnostic fields beyond the hardened
  `localBridgeRenderManifestReport` contract. Direct checks returned `"ok": true`
  for `scripts\dev-foundation-blocked-worker-roundtrip.js` and the expected
  render manifest schema for `scripts\dev-bridge-render-manifest.js`; `node
  --check` passed for both scripts; `node scripts\run-tests.js` passed: all 359
  tests passed. Smoke also returned `"ok": true`.
- Hardened Gameplay and Foundation Policy Gate Roundtrip public report
  top-level field validation. The gameplay policy gate now rejects unexpected
  public fields before preflight, launch-plan, runtime-status, or boundary
  policy summaries can drift into external vision/control endpoints, secrets,
  raw frames, OCR text, action candidates, approved actions, or commands. The
  foundation policy gate now does the same before preflight, launch-plan,
  foundation-status, runtime-status, or boundary policy summaries can drift into
  unsafe TTS/Live2D/subtitle/OBS targets, local paths, payloads, candidates,
  commands, or secrets. Direct checks returned `"ok": true` for both
  `scripts\dev-gameplay-policy-gate-roundtrip.js` and
  `scripts\dev-foundation-policy-gate-roundtrip.js`; `node --check` passed for
  both scripts; `node scripts\run-tests.js` passed: all 359 tests passed. Smoke
  also returned `"ok": true`.
- Hardened Vision Game and Unsafe Vision Roundtrip public report top-level field
  validation. The vision game roundtrip now rejects unexpected public fields
  before observation summaries, capture request summaries, vision source status,
  game-action validation summaries, game-control summaries, local bridge status,
  production handoff summary, or boundary policy can drift into diagnostic,
  vision endpoints, frame ids, OCR text, UI focus labels, raw frames, raw
  candidates, commands, endpoint values, or secrets. The unsafe vision roundtrip
  now does the same before fixture counts, rejection status, capture request
  summary, source status, or boundary policy can drift into unsafe payload text,
  raw frames, endpoints, tokens, or candidates. Direct checks returned
  `"ok": true` for both `scripts\dev-vision-game-roundtrip.js` and
  `scripts\dev-vision-unsafe-roundtrip.js`; `node --check` passed for both
  scripts; `node scripts\run-tests.js` passed: all 359 tests passed. Smoke also
  returned `"ok": true`.
- Hardened Game Control and Unsafe Game Control Roundtrip public report
  top-level field validation. The normal roundtrip now rejects unexpected public
  fields before validation summaries, control result summaries, adapter status,
  local bridge status, production handoff summary, or boundary policy can drift
  into diagnostic, endpoint, secret, trace/event/request ids, raw observation
  ids, raw candidates, or commands. The unsafe bridge roundtrip now does the
  same before fixture counts, received request summary, validation summary,
  unsafe-response result summary, adapter status, or boundary policy can drift
  into unsafe ACK bodies, endpoint values, authorization headers, raw candidates,
  or commands. The unsafe script now also pins unrelated memory/media/topic/
  YouTube adapters to local-empty settings so host env cannot make this focused
  game-control verification fail for unrelated reasons. Direct checks returned
  `"ok": true` for both `scripts\dev-game-control-roundtrip.js` and
  `scripts\dev-game-control-unsafe-roundtrip.js`; `node --check` passed for both
  scripts; `node scripts\run-tests.js` passed: all 359 tests passed. Smoke also
  returned `"ok": true`.
- Hardened Persistence Candidate Gate and Policy Gate Roundtrip public report
  top-level field validation. The candidate-gate roundtrip now rejects
  unexpected public fields before runtime status summaries, store status
  summaries, production handoff summary, boundary policy, or unsafe-leak status
  can drift into diagnostic, store paths, endpoint values, record payloads, raw
  candidates, live text, commands, or secrets. The policy-gate roundtrip now
  does the same before preflight, launch-plan, runtime-status, or boundary
  policy summaries can drift into external vector endpoints, store paths,
  memory/relationship records, candidates, commands, or secrets. Direct checks
  returned `"ok": true` for both
  `scripts\dev-persistence-candidate-gate-roundtrip.js` and
  `scripts\dev-persistence-policy-gate-roundtrip.js`; `node --check` passed for
  both scripts; `node scripts\run-tests.js` passed: all 359 tests passed. Smoke
  also returned `"ok": true`.
- Hardened Persistence Backup and HTTP Roundtrip public report top-level field
  validation. The backup roundtrip now rejects unexpected public fields before
  recovered counts, durability summaries, persistence status, or boundary policy
  can drift into diagnostic, record/profile payloads, store paths, error
  messages, or live text. The HTTP persistence roundtrip now does the same
  before HTTP event summaries, persistence status summaries, public endpoint
  counts, or boundary policy can drift into server origin, store paths, raw
  candidates, hidden relationship scores, record payload dumps, text payloads,
  commands, or secrets. Direct checks returned `"ok": true` for both
  `scripts\dev-persistence-backup-roundtrip.js` and
  `scripts\dev-persistence-http-roundtrip.js`; `node --check` passed for both
  scripts; `node scripts\run-tests.js` passed: all 359 tests passed. Smoke also
  returned `"ok": true`.
- Hardened Persistence Failure and Restart Roundtrip public report top-level
  field validation. The failure roundtrip now rejects unexpected public fields
  before base persistence status, relationship status, candidate persistence
  status, store statuses, public counts, or boundary policy can drift into
  diagnostic, broken store contents, error messages, record payload dumps, path
  values, candidates, or live text. It now also uses fixture-owned broken store
  paths instead of host `IRIS_MEMORY_STORE_PATH` / `IRIS_RELATIONSHIP_STORE_PATH`
  values so the failure check cannot accidentally commit into an operator store.
  The restart roundtrip now rejects unexpected public fields before
  before/after-restart summaries or boundary policy can drift into raw
  candidates, memory summaries, hidden relationship scores, store paths, or
  commands. Direct checks returned `"ok": true` for both
  `scripts\dev-persistence-failure-roundtrip.js` and
  `scripts\dev-persistence-restart-roundtrip.js`; `node --check` passed for both
  scripts; `node scripts\run-tests.js` passed: all 359 tests passed. Smoke also
  returned `"ok": true`.
- Hardened Persistence Status and Persistence Roundtrip public report top-level
  field validation. The status roundtrip now rejects unexpected public fields
  before persistence status, production handoff summary, or boundary policy can
  drift into diagnostic, memory text, relationship payload, candidate, storage
  path, or secret output. The persistence roundtrip now does the same before
  candidate persistence summaries, store statuses, follow-up payload kind,
  public counts, relationship status summary, or boundary policy can drift into
  raw candidates, hidden scores, record payload dumps, path values, or live text.
  Direct checks returned `"ok": true` for both
  `scripts\dev-persistence-status-roundtrip.js` and
  `scripts\dev-persistence-roundtrip.js`; `node --check` passed for both
  scripts; `node scripts\run-tests.js` passed: all 359 tests passed. Smoke also
  returned `"ok": true`.
- Hardened OBS Browser Source Config and Unsafe Roundtrip public report
  top-level field validation. The browser-source config CLI now rejects
  unexpected public fields before overlay config, manual setup readiness,
  optional bridge setup flag, or boundary policy can drift into diagnostic,
  live payload, raw text, candidate, command, or secret output. The unsafe OBS
  roundtrip now rejects unexpected public fields before fixture counts, sanitized
  bridge report, request summary, or boundary policy can drift into raw bridge
  response bodies, unsafe ACK text, candidates, commands, endpoint values, or
  secrets. Direct checks returned `"ok": true` for both
  `scripts\dev-obs-browser-source-config.js` and
  `scripts\dev-obs-unsafe-roundtrip.js`; `node --check` passed for both scripts;
  `node scripts\run-tests.js` passed: all 359 tests passed. Smoke also returned
  `"ok": true`.
- Hardened OBS Stale Artifact Roundtrip public report top-level field
  validation. The stale-artifact report now rejects unexpected public fields
  before latest manifest summaries, artifact delivery error summaries, or
  boundary policy can drift into diagnostic, server origin, artifact path,
  artifact body, raw job, payload, candidate, command, or secret output. The
  direct roundtrip still verifies stale artifact 409 delivery rejection and
  freshness guard summaries without exposing local paths or artifact bodies.
  `node --check` passed for `scripts\dev-obs-stale-artifact-roundtrip.js`;
  `node scripts\dev-obs-stale-artifact-roundtrip.js` returned `"ok": true`;
  `node scripts\run-tests.js` passed: all 359 tests passed. Smoke also returned
  `"ok": true`.
- Hardened OBS Render Handoff and Invalid Artifact Roundtrip public report
  top-level field validation. The render handoff report now rejects unexpected
  public fields before browser-source handoff checks, manifest status, latest
  manifest summaries, artifact delivery summaries, or boundary policy can drift
  into diagnostic, server origin, artifact path, artifact body, raw job, payload,
  candidate, command, or secret output. The invalid-artifact roundtrip now does
  the same before invalid-artifact guard summaries and artifact delivery error
  summaries. Direct roundtrip checks returned `"ok": true` for both
  `scripts\dev-obs-render-handoff-roundtrip.js` and
  `scripts\dev-obs-invalid-artifact-roundtrip.js`; `node --check` passed for
  both scripts; `node scripts\run-tests.js` passed: all 359 tests passed. Smoke
  also returned `"ok": true`.
- Hardened Local Bridge Render Manifest Operator Report top-level field
  validation. The operator report now rejects unexpected public fields before
  manifest availability, pickup/readiness status, store status, latest manifest
  summary, boundary policy, adapter-validation flag, or explicitly enabled local
  debug paths can drift into diagnostic, artifact path, raw job, payload, text,
  candidate, command, endpoint, or secret output. Regression tests cover
  unexpected `diagnostic_detail` rejection while preserving unsafe-public-label,
  stale-manifest, stale-artifact, artifact-sync-skew, invalid-artifact, local
  debug opt-in, and no-path default behavior. `node --check` passed for
  `src\server\localBridgeRenderManifestReport.js`,
  `scripts\dev-bridge-render-manifest.js`, and `scripts\run-tests.js`; `node
  scripts\dev-bridge-render-manifest.js` returned the expected operator report
  schema; `node scripts\run-tests.js` passed: all 359 tests passed. Smoke also
  returned `"ok": true`.
- Hardened Bridge Outbox Corrupt Roundtrip public report top-level field
  validation. The corrupt outbox roundtrip report now rejects unexpected public
  fields before processed counts, idle status, worker status, or boundary policy
  can drift into diagnostic, corrupt JSON line, raw job, text payload, candidate,
  command, endpoint, secret, or path output. The direct roundtrip still verifies
  that valid jobs continue processing while corrupt JSON is summarized only.
  `node --check` passed for `scripts\dev-bridge-outbox-corrupt-roundtrip.js`;
  `node scripts\dev-bridge-outbox-corrupt-roundtrip.js` returned `"ok": true`;
  `node scripts\run-tests.js` passed: all 359 tests passed. Smoke also returned
  `"ok": true`.
- Hardened Bridge Artifact Roundtrip public report top-level field validation.
  The artifact delivery roundtrip report now rejects unexpected public fields
  before render manifest readiness, artifact summaries, missing-route status,
  manifest-mismatch rejection status, or boundary policy can drift into
  diagnostic, endpoint, artifact path, raw payload, text payload, candidate,
  command, secret, or artifact byte output. The direct roundtrip still verifies
  latest-manifest artifact pickup, manifest-id matching, missing artifact 404,
  and manifest mismatch 409 without exposing local paths or artifact bodies.
  `node --check` passed for `scripts\dev-bridge-artifact-roundtrip.js`; `node
  scripts\dev-bridge-artifact-roundtrip.js` returned `"ok": true`; `node
  scripts\run-tests.js` passed: all 359 tests passed. Smoke also returned
  `"ok": true`.
- Hardened Bridge Engine Roundtrip public report top-level field validation.
  The engine roundtrip report now rejects unexpected public fields before final
  decision status, local bridge/engine fixture flags, worker readiness, adapter
  readiness, engine request counts, engine preference receipt flags, worker
  report, latest artifact summaries, or boundary policy can drift into
  diagnostic, endpoint, raw engine request, raw job, text payload, candidate,
  command, secret, or path output. The script now also pins unrelated runtime
  adapters to mock/local-empty settings so host machine gameplay, observation,
  memory, or media-watch env values cannot make this bridge/engine verification
  fail for unrelated reasons. `node --check` passed for
  `scripts\dev-bridge-engine-roundtrip.js`; `node
  scripts\dev-bridge-engine-roundtrip.js` returned `"ok": true`; `node
  scripts\run-tests.js` passed: all 359 tests passed. Smoke also returned
  `"ok": true`.
- Hardened Bridge Status Roundtrip public report top-level field validation.
  The roundtrip report now rejects unexpected public fields before bridge status,
  worker status, worker process report, manifest store status, latest render
  manifest report, production handoff summary, or boundary policy can drift into
  diagnostic, endpoint, artifact path, raw packet, raw job, text payload,
  candidate, command, or secret output. The direct roundtrip script still starts
  only the local fixture bridge and worker path, and its public output remains
  counts/status-only. `node --check` passed for
  `scripts\dev-bridge-status-roundtrip.js` and `scripts\run-tests.js`; `node
  scripts\dev-bridge-status-roundtrip.js` returned `"ok": true`; `node
  scripts\run-tests.js` passed: all 359 tests passed. Smoke also returned
  `"ok": true`.
- Hardened Local Bridge Worker CLI payload top-level field validation. The
  drain-until-idle and watch payloads now reject unexpected public fields before
  worker reports, adapter readiness, retry policy, outbox queue summaries,
  render manifest summaries, production handoff summary, boundary policy, or
  explicitly enabled local debug paths can drift into diagnostic, raw job,
  endpoint, secret, text payload, candidate, command, or path output. Regression
  tests cover unexpected `diagnostic_detail` and `raw_jobs` rejection while
  preserving no-path defaults, local debug path opt-in, worker handoff counts,
  and adapter readiness summaries. `node --check` passed for
  `src\server\localBridgeWorkerCliReport.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed. Smoke also returned
  `"ok": true`.
- Hardened Operator Policy Settings CLI top-level field validation. The CLI
  report now rejects unexpected public fields before the nested operator policy
  settings report or boundary policy can drift into diagnostic, policy value,
  endpoint, secret, support text, hidden relationship score, candidate, frame,
  command, device, or game/OS input output. Regression tests cover unexpected
  `diagnostic_detail` rejection while preserving read-only CLI flags and the
  nested operator policy settings contract. `node --check` passed for
  `scripts\dev-operator-policy-settings.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed. Smoke also returned
  `"ok": true`.
- Hardened Live2D Cue Engine Bridge Startup top-level field validation. The
  startup report now rejects unexpected public fields before listening paths,
  configured env names, bridge target flags, local endpoint policy summaries,
  renderer endpoint scope summaries, production handoff summary, or boundary
  policy can drift into diagnostic, endpoint, secret, cue payload, candidate, or
  command output. Regression tests cover unexpected `diagnostic_detail`
  rejection while preserving renderer endpoint locality summaries, bridge
  startup handoff flags, script-only checks, and endpoint/secret/payload
  redaction. `node --check` passed for
  `scripts\dev-live2d-cue-engine-bridge.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed. Smoke also returned
  `"ok": true`.
- Hardened VOICEVOX TTS Engine Bridge Startup top-level field validation. The
  startup report now rejects unexpected public fields before listening paths,
  configured env names, bridge target flags, local endpoint policy summaries,
  production handoff summary, or boundary policy can drift into diagnostic,
  endpoint, secret, text payload, candidate, or command output. Regression tests
  cover unexpected `diagnostic_detail` rejection while preserving local endpoint
  scope summaries, bridge startup handoff flags, script-only checks, and
  endpoint/secret/payload redaction. `node --check` passed for
  `scripts\dev-voicevox-tts-engine-bridge.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened YouTube Ingest Source Status CLI top-level field validation. The CLI
  wrapper now rejects unexpected public fields before the source-status payload,
  production handoff summary, or boundary policy can drift into diagnostic,
  endpoint, secret, live payload, support text, platform cursor, candidate, or
  command output. Regression tests cover unexpected `diagnostic_detail` rejection
  while preserving the underlying source-status contract, handoff summary counts,
  script-only checks, and endpoint/secret/payload redaction. `node --check`
  passed for `scripts\dev-youtube-ingest-source-status.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Spec Manifest top-level field validation. The manifest now rejects
  unexpected public fields before version prefix, expected/found counts,
  completion status, expected/found/addendum/missing/unexpected file lists can
  drift into diagnostic or private metadata. Regression tests cover unexpected
  `diagnostic_detail` rejection while preserving the IRIS_20240425 phase 00-27
  and cross-phase addendum checks. `node --check` passed for
  `src\services\dev\specManifest.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened OBS Runtime Render Roundtrip top-level field validation. The render
  roundtrip report now rejects unexpected public fields before bridge handoff
  counts, engine request counts, worker summaries, render manifest summaries,
  artifact delivery summaries, foundation runtime status, final stream state,
  production handoff summary, or boundary policy can drift into diagnostic,
  endpoint, secret, local path, raw engine request, raw job, artifact body, text
  payload, candidate, or command output. Regression tests cover unexpected
  `diagnostic_detail` rejection and update the unsafe-field expectation to stop
  at the public field boundary while preserving OBS/engine/temp path leak checks
  and render handoff count validation. `node --check` passed for
  `src\services\dev\obsRuntimeRenderRoundtrip.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Memory Vector Roundtrip top-level field validation. The vector
  memory roundtrip report now rejects unexpected public fields before request
  counts, public record counts, accepted hit counts, verification scripts, or
  boundary policy can drift into diagnostic, endpoint, secret, store path,
  memory summary, private record value, candidate, relationship record, or
  command output. Regression tests cover unexpected `diagnostic_detail` rejection
  while preserving public-record filtering, summary redaction, and
  endpoint/secret/candidate leak checks. `node --check` passed for
  `src\services\dev\memoryVectorRoundtrip.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Gameplay Validation Gate Roundtrip top-level field validation. The
  roundtrip report now rejects unexpected public fields before fixture counts,
  vision request summaries, scheduler tick summaries, runtime gate summaries,
  public stream state summaries, boundary policy, production handoff summary, or
  leak status can drift into diagnostic, endpoint, secret, raw frame, OCR text,
  action candidate, approved action, raw scheduler result, or command output.
  Regression tests cover unexpected `diagnostic_detail` rejection while
  preserving low-confidence-before-adapter behavior, no-adapter-request counts,
  production handoff counts, and endpoint/secret/frame/action redaction. `node
  --check` passed for
  `src\services\dev\gameplayValidationGateRoundtrip.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened YouTube Relay Readiness Rehearsal top-level field validation. The
  relay rehearsal report now rejects unexpected public fields before relay bridge
  summaries, source status counts, scheduler counts, runtime counts,
  verification scripts, or boundary policy can drift into diagnostic, endpoint,
  secret, local path, YouTube text, support message, platform id, memory record,
  relationship profile, action candidate, or command output. Regression tests
  cover unexpected `diagnostic_detail` rejection and update the unsafe-field
  expectation to stop at the public field boundary while preserving the existing
  leak checks for relay URLs, temp paths, tokens, fixture text, and candidate/
  record values. `node --check` passed for
  `src\services\dev\youtubeRelayReadinessRehearsal.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened YouTube Relay Startup Checklist top-level field validation. The
  startup checklist now rejects unexpected public fields before startup step
  counts, next startup/readiness scripts, env names, startup steps, verification
  scripts, production handoff summary, or boundary policy can drift into
  diagnostic, endpoint, secret, live payload, support text, action candidate, or
  command output. Regression tests cover unexpected `diagnostic_detail` rejection
  while preserving script-only checks, local relay policy, production handoff
  counts, and endpoint/secret/payload redaction. `node --check` passed for
  `src\services\dev\youtubeRelayStartupChecklist.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Gameplay Startup Checklist top-level field validation. The startup
  checklist now rejects unexpected public fields before startup step counts,
  next startup/readiness scripts, env names, startup steps, verification scripts,
  production handoff summary, or boundary policy can drift into diagnostic,
  endpoint, secret, raw frame, OCR text, vision payload, action candidate,
  approved action, or command output. Regression tests cover unexpected
  `diagnostic_detail` rejection while preserving script-only checks,
  local/private bridge policy, production handoff counts, and
  endpoint/secret/frame/action redaction. `node --check` passed for
  `src\services\dev\gameplayStartupChecklist.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Persistence Startup Checklist top-level field validation. The startup
  checklist now rejects unexpected public fields before startup step counts,
  next startup/readiness scripts, env names, startup steps, verification scripts,
  production handoff summary, or boundary policy can drift into diagnostic,
  endpoint, secret, store path, memory/relationship record, candidate, or command
  output. Regression tests cover unexpected `diagnostic_detail` rejection while
  preserving script-only checks, local/private bridge policy, production handoff
  counts, and endpoint/secret/store/record redaction. `node --check` passed for
  `src\services\dev\persistenceStartupChecklist.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Gameplay Post Start Checklist top-level field validation. The
  checklist now rejects unexpected public fields before live readiness status,
  next gate/check readiness, no-side-effect flags, check counts, operator
  verification checks, verification scripts, gameplay control policy, or boundary
  policy can drift into diagnostic, endpoint, secret, raw frame, OCR text,
  action candidate, approved action, or command output. Regression tests cover
  unexpected `diagnostic_detail` rejection while preserving the existing action
  candidate side-effect guard, script-only checks, gameplay control policy, and
  endpoint/secret/frame/action redaction. `node --check` passed for
  `src\services\dev\gameplayPostStartChecklist.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Persistence Post Start Checklist top-level field validation. The
  checklist now rejects unexpected public fields before live readiness status,
  persistence/vector modes, no-side-effect flags, check counts, operator
  verification checks, verification scripts, persistence policy, or boundary
  policy can drift into diagnostic, endpoint, secret, store path, SQL, viewer
  identity, memory/relationship record, candidate, or command output. Regression
  tests cover unexpected `diagnostic_detail` rejection while preserving the
  existing candidate-commit side-effect guard, script-only checks, persistence
  policy, and endpoint/secret/store/record redaction. `node --check` passed for
  `src\services\dev\persistencePostStartChecklist.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened YouTube Ingest Post Start Checklist top-level field validation. The
  checklist now rejects unexpected public fields before live readiness status,
  source mode, no-side-effect flags, check counts, operator verification checks,
  verification scripts, support-event policy, or boundary policy can drift into
  diagnostic, endpoint, secret, cursor, live payload, support text, candidate,
  platform id, or command output. Regression tests cover unexpected
  `diagnostic_detail` rejection while preserving the existing real-poll
  side-effect guard, script-only checks, support-event policy, and
  endpoint/secret/payload redaction. `node --check` passed for
  `src\services\dev\youtubeIngestPostStartChecklist.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Gameplay Readiness Rehearsal top-level field validation. The
  rehearsal report now rejects unexpected public fields before preflight/runtime/
  live readiness status, configured gameplay path flags, scheduler/vision/action/
  adapter/safe-control readiness, no-side-effect attempt flags, next step
  scripts, env names, runtime flow summary, gate summary, verification scripts,
  safe-control policy, production handoff summary, or boundary policy can drift
  into diagnostic, endpoint, secret, raw frame, OCR text, vision payload, action
  candidate, approved action, raw scheduler result, raw stream state, or command
  output. Regression tests cover unexpected `diagnostic_detail` rejection while
  preserving script-only checks, rehearsal side-effect guards, safe-control
  policy, and endpoint/secret/frame/action redaction. `node --check` passed for
  `src\services\dev\gameplayReadinessRehearsal.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Persistence Readiness Rehearsal top-level field validation. The
  rehearsal report now rejects unexpected public fields before preflight/runtime/
  live readiness status, persistence path readiness, candidate/approved-record
  flow flags, next step scripts, env names, runtime flow summary, gate summary,
  verification scripts, persistence safety policy, production handoff summary,
  or boundary policy can drift into diagnostic, endpoint, secret, store path,
  viewer identity, memory/relationship record, candidate, raw runtime state, or
  command output. Regression tests cover unexpected `diagnostic_detail`
  rejection while preserving script-only checks, rehearsal side-effect guards,
  persistence safety policy, and endpoint/secret/store/record redaction. `node
  --check` passed for
  `src\services\dev\persistenceReadinessRehearsal.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened YouTube Ingest Readiness Rehearsal top-level field validation. The
  rehearsal report now rejects unexpected public fields before preflight/source/
  runtime/live readiness status, next step scripts, env names, runtime flow
  summary, gate summary, verification scripts, support-event policy, production
  handoff summary, or boundary policy can drift into diagnostic, endpoint,
  secret, cursor, live payload, support text, candidate, raw scheduler result,
  raw stream state, or command output. Regression tests cover unexpected
  `diagnostic_detail` rejection while preserving script-only checks, rehearsal
  side-effect guards, support-event policy, and endpoint/secret/payload
  redaction. `node --check` passed for
  `src\services\dev\youtubeIngestReadinessRehearsal.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened YouTube Ingest Source Status top-level field validation. The source
  status report now rejects unexpected public fields before source
  configuration, source kind/status availability, instantiation status, status
  summary, support event policy, readiness counts, or boundary policy can drift
  into diagnostic, endpoint, secret, cursor, live payload, support text,
  candidate, memory/relationship record, or command output. Regression tests
  cover unexpected `diagnostic_detail` rejection while preserving source status
  summaries, support-event count policy, and endpoint/secret/payload redaction.
  `node --check` passed for
  `src\services\dev\youtubeIngestSourceStatus.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Gameplay Live Readiness top-level field validation. The live
  readiness report now rejects unexpected public fields before launch/env setup
  status, vision/control modes, configuration/scheduler/vision/action/adapter/
  safe-control/lifecycle/vision-to-action gates, production handoff summary,
  verification scripts, or boundary policy can drift into diagnostic, endpoint,
  secret, raw frame, OCR text, vision payload, action candidate, approved
  action, raw scheduler result, raw stream state, or command output. Regression
  tests cover unexpected `diagnostic_detail` rejection while preserving live
  readiness gate summaries, script-only checks, and endpoint/secret/frame/action
  redaction. `node --check` passed for
  `src\services\dev\gameplayLiveReadiness.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Persistence Live Readiness top-level field validation. The live
  readiness report now rejects unexpected public fields before launch/env
  setup status, persistence/vector modes, configuration/runtime/store/record/
  candidate/relationship/recall/lifecycle gates, production handoff summary,
  verification scripts, or boundary policy can drift into diagnostic, endpoint,
  secret, store path, memory/relationship record, viewer identity, candidate,
  raw runtime state, or command output. Regression tests cover unexpected
  `diagnostic_detail` rejection while preserving live readiness gate summaries,
  script-only checks, and endpoint/secret/store/record redaction. `node --check`
  passed for `src\services\dev\persistenceLiveReadiness.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened YouTube Ingest Live Readiness top-level field validation. The live
  readiness report now rejects unexpected public fields before launch/env
  status, source/access/scheduler/runtime/support gates, production handoff
  summary, verification scripts, or boundary policy can drift into diagnostic,
  endpoint, secret, cursor, live payload, support text, platform id, candidate,
  raw scheduler result, raw stream state, or command output. Regression tests
  cover unexpected `diagnostic_detail` rejection while preserving live readiness
  gate summaries, script-only checks, and endpoint/secret/payload redaction.
  `node --check` passed for
  `src\services\dev\youtubeIngestLiveReadiness.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Gameplay Runtime Status top-level field validation. The runtime
  status report now rejects unexpected public fields before preflight status,
  vision/control modes, scheduler state, target policies, control guard flags,
  gameplay state, adapter runtime, vision capture flow, safe-control flow,
  action gate flow, production handoff summary, safe-control policy, or
  boundary policy can drift into diagnostic, endpoint, secret, raw frame, OCR,
  vision payload, action candidate, approved action, raw scheduler result, or
  command output. Regression tests cover unexpected `diagnostic_detail`
  rejection while preserving runtime readiness summaries, script-only checks,
  and endpoint/secret/frame redaction. `node --check` passed for
  `src\services\dev\gameplayRuntimeStatus.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Persistence Runtime Status top-level field validation. The runtime
  status report now rejects unexpected public fields before preflight status,
  store/vector readiness, runtime counts, store health, approved-record flow,
  identity scope, candidate commit flow, relationship value flow, long-term
  recall flow, lifecycle flow, production handoff summary, capability flags,
  persistence policy, or boundary policy can drift into diagnostic, endpoint,
  secret, store path, memory/relationship value, candidate, raw runtime state,
  or command output. Regression tests cover unexpected `diagnostic_detail`
  rejection while preserving runtime readiness summaries, script-only checks,
  and endpoint/secret/path redaction. `node --check` passed for
  `src\services\dev\persistenceRuntimeStatus.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened YouTube Ingest Runtime Status top-level field validation. The
  runtime status report now rejects unexpected public fields before source
  status, scheduler/runtime state summaries, auth/cursor flow, poll flow,
  ingest hygiene, support candidate flow, live chat handoff, production handoff
  summary, support policy, or boundary policy can drift into diagnostic,
  endpoint, secret, cursor, live payload, support text, candidate, raw scheduler
  result, or command output. Regression tests cover unexpected
  `diagnostic_detail` rejection while preserving runtime readiness summaries,
  script-only checks, and endpoint/secret/payload redaction. `node --check`
  passed for `src\services\dev\youtubeIngestRuntimeStatus.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Gameplay Preflight top-level field validation. The preflight report
  now rejects unexpected public fields before vision/control status, scheduler
  readiness, target policies, safe-control guard flags, env-name summaries,
  attention reasons, stage/integration summaries, verification summary,
  approval policy, or boundary policy can drift into diagnostic, endpoint,
  secret, raw frame, OCR, vision payload, action candidate, approved action, or
  command output. Regression tests cover unexpected `diagnostic_detail`
  rejection while preserving vision/control readiness summaries, script-only
  verification, and endpoint/secret/frame redaction. `node --check` passed for
  `src\services\dev\gameplayPreflight.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Persistence Preflight top-level field validation. The preflight
  report now rejects unexpected public fields before persistence/vector status,
  PostgreSQL readiness flags, moderation/capacity flags, env-name summaries,
  attention reasons, stage/integration summaries, verification summary,
  persistence policy, or boundary policy can drift into diagnostic, endpoint,
  secret, store path, memory/relationship value, candidate, or command output.
  Regression tests cover unexpected `diagnostic_detail` rejection while
  preserving JSON/PostgreSQL/vector readiness summaries, script-only
  verification, and endpoint/secret/path redaction. `node --check` passed for
  `src\services\dev\persistencePreflight.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened YouTube Ingest Preflight top-level field validation. The preflight
  report now rejects unexpected public fields before source/auth mode,
  scheduler/cursor readiness, local target policy, env-name summaries,
  attention reasons, stage/integration summaries, verification summary, support
  event policy, or boundary policy can drift into diagnostic, endpoint, secret,
  cursor, live payload, support text, candidate, or command output. Regression
  tests cover unexpected `diagnostic_detail` rejection while preserving
  direct/relay readiness summaries, script-only verification, and
  endpoint/secret redaction. `node --check` passed for
  `src\services\dev\youtubeIngestPreflight.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Gameplay Launch Plan top-level field validation. The launch plan
  now rejects unexpected public fields before vision/control modes, launch
  sequence, readiness counts, next-step guidance, stage/integration summaries,
  verification summaries, runtime safe-control verification, approval policy,
  or boundary policy can drift into diagnostic, endpoint, secret, raw frame,
  OCR, vision payload, action candidate, approved action, or command output.
  Regression tests cover unexpected `diagnostic_detail` rejection while
  preserving gameplay launch readiness, script-only verification, and
  endpoint/secret/frame redaction. `node --check` passed for
  `src\services\dev\gameplayLaunchPlan.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Persistence Launch Plan top-level field validation. The launch plan
  now rejects unexpected public fields before persistence/vector modes, launch
  sequence, readiness counts, next-step guidance, stage/integration summaries,
  verification summaries, runtime persistence verification, persistence policy,
  or boundary policy can drift into diagnostic, endpoint, secret, store path,
  memory/relationship value, candidate, or command output. Regression tests
  cover unexpected `diagnostic_detail` rejection while preserving persistence
  launch readiness, script-only verification, and endpoint/secret/path
  redaction. `node --check` passed for
  `src\services\dev\persistenceLaunchPlan.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened YouTube Ingest Launch Plan top-level field validation. The launch
  plan now rejects unexpected public fields before source mode, launch sequence,
  readiness counts, next-step guidance, stage/integration summaries,
  verification summaries, runtime poll verification, support policy, or
  boundary policy can drift into diagnostic, endpoint, secret, cursor, live
  payload, support text, candidate, or command output. Regression tests cover
  unexpected `diagnostic_detail` rejection while preserving source-mode launch
  readiness, script-only verification, and endpoint/secret redaction. `node
  --check` passed for `src\services\dev\youtubeIngestLaunchPlan.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Gameplay Env Setup Plan top-level field validation. The env setup
  plan now rejects unexpected public fields before vision/control modes,
  env-group readiness counts, next env guidance, verification scripts, approval
  policy, production handoff summary, or boundary policy can drift into
  diagnostic, endpoint, secret, raw frame, OCR, vision payload, action
  candidate, approved action, or command output. Regression tests cover
  unexpected `diagnostic_detail` rejection while preserving env-name-only
  guidance, control-mode decisions, and endpoint/secret/frame redaction. `node
  --check` passed for `src\services\dev\gameplayEnvSetupPlan.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Persistence Env Setup Plan top-level field validation. The env setup
  plan now rejects unexpected public fields before persistence/vector modes,
  env-group readiness counts, next env guidance, verification scripts,
  persistence policy, production handoff summary, or boundary policy can drift
  into diagnostic, endpoint, secret, store path, memory/relationship value,
  candidate, or command output. Regression tests cover unexpected
  `diagnostic_detail` rejection while preserving env-name-only guidance,
  persistence mode decisions, and endpoint/secret/path redaction. `node
  --check` passed for `src\services\dev\persistenceEnvSetupPlan.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened YouTube Ingest Env Setup Plan top-level field validation. The env
  setup plan now rejects unexpected public fields before source/auth mode,
  env-group readiness counts, next env guidance, verification scripts, support
  event policy, production handoff summary, or boundary policy can drift into
  diagnostic, endpoint, secret, cursor, live payload, support text, candidate,
  or command output. Regression tests cover unexpected `diagnostic_detail`
  rejection while preserving env-name-only guidance, source-mode decisions, and
  endpoint/secret redaction. `node --check` passed for
  `src\services\dev\youtubeIngestEnvSetupPlan.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Gameplay Local Env Profile top-level field validation. The local env
  profile now rejects unexpected public fields before env-name inventory, env
  groups, verification scripts, template render script, operator notes, or
  boundary policy can drift into diagnostic, endpoint, secret, raw frame, OCR,
  vision payload, action candidate, approved action, or command output.
  Regression tests cover unexpected `diagnostic_detail` rejection while
  preserving env-name-only profile rendering, script-name guidance, control
  disabled defaults, and endpoint/secret/frame redaction. `node --check` passed
  for `src\services\dev\gameplayLocalEnvProfile.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Persistence Local Env Profile top-level field validation. The local
  env profile now rejects unexpected public fields before env-name inventory,
  env groups, verification scripts, template render script, operator notes, or
  boundary policy can drift into diagnostic, endpoint, secret, store path,
  memory/relationship value, candidate, or command output. Regression tests
  cover unexpected `diagnostic_detail` rejection while preserving env-name-only
  profile rendering, script-name guidance, and endpoint/secret/path redaction.
  `node --check` passed for
  `src\services\dev\persistenceLocalEnvProfile.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened YouTube Ingest Local Env Profile top-level field validation. The
  local env profile now rejects unexpected public fields before source modes,
  env-name inventory, env groups, startup/verification scripts, template render
  script, operator notes, or boundary policy can drift into diagnostic,
  endpoint, secret, cursor, live payload, support text, candidate, or command
  output. Regression tests cover unexpected `diagnostic_detail` rejection while
  preserving env-name-only profile rendering, source-mode guidance, script-name
  guidance, and endpoint/secret redaction. `node --check` passed for
  `src\services\dev\youtubeIngestLocalEnvProfile.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Gameplay Local Env Apply Plan top-level field validation. The apply
  plan now rejects unexpected public fields before env-name counts,
  default-review env-name summaries, operator-fill guidance, verification
  scripts, overwrite policy, or dry-run/materialize boundary flags can drift
  into diagnostic, endpoint, secret, raw frame, OCR, vision payload, action
  candidate, approved action, or command output. Regression tests cover
  unexpected `diagnostic_detail` rejection while preserving append-only
  materialization guidance, env-name-only reporting, and endpoint/secret/frame
  redaction. `node --check` passed for
  `src\services\dev\gameplayLocalEnvApplyPlan.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Persistence Local Env Apply Plan top-level field validation. The
  apply plan now rejects unexpected public fields before env-name counts,
  default-review env-name summaries, operator-fill guidance, verification
  scripts, or dry-run/materialize boundary flags can drift into diagnostic,
  endpoint, secret, store path, memory/relationship value, payload, candidate,
  or command output. Regression tests cover unexpected `diagnostic_detail`
  rejection while preserving append-only materialization guidance,
  env-name-only reporting, and endpoint/secret/path redaction. `node --check`
  passed for `src\services\dev\persistenceLocalEnvApplyPlan.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened YouTube Ingest Local Env Apply Plan top-level field validation. The
  apply plan now rejects unexpected public fields before env-name counts,
  default-review env-name summaries, operator-fill guidance, verification
  scripts, or dry-run/materialize boundary flags can drift into diagnostic,
  endpoint, secret, cursor, support text, payload, candidate, or command output.
  Regression tests cover unexpected `diagnostic_detail` rejection while
  preserving append-only materialization guidance, env-name-only reporting, and
  endpoint/secret redaction. `node --check` passed for
  `src\services\dev\youtubeIngestLocalEnvApplyPlan.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Foundation Preflight top-level field validation. The preflight
  report now rejects unexpected public fields before readiness states, launch
  step summaries, foundation status summaries, stage/integration readiness,
  verification summary, or boundary policy can drift into diagnostic, endpoint,
  secret, value, payload, candidate, or command output. Regression tests cover
  unexpected `diagnostic_detail` rejection while preserving ready/missing-env
  preflight states, script-only launch guidance, endpoint/secret redaction, and
  existing readiness summary checks. `node --check` passed for
  `src\services\dev\foundationPreflight.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Foundation Operator Run Gate top-level field validation. The
  operator run gate now rejects unexpected public fields before launch status,
  operator approval state, process-start allowance, process plan counts,
  no-side-effect flags, verification scripts, or boundary policy can drift into
  diagnostic, endpoint, secret, value, payload, artifact path, candidate, or
  command output. Regression tests cover unexpected `diagnostic_detail`
  rejection while preserving operator review and ready process-start states,
  no process/network/OBS side effects, script-only verification, endpoint/secret
  redaction, and existing launch-plan linkage. `node --check` passed for
  `src\services\dev\foundationOperatorRunGate.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Foundation Process Handoff Dry Run top-level field validation. The
  process handoff dry-run now rejects unexpected public fields before operator
  gate status, process-start allowance, process handoff counts, dry-run
  side-effect flags, handoff plan steps, verification scripts, or boundary
  policy can drift into diagnostic, endpoint, secret, value, payload, artifact
  path, candidate, or command output. Regression tests cover unexpected
  `diagnostic_detail` rejection while preserving blocked/ready operator
  terminal handoff states, no process/network/OBS side effects, script-only
  verification, endpoint/secret redaction, and existing operator run gate
  linkage. `node --check` passed for
  `src\services\dev\foundationProcessHandoffDryRun.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Foundation Post-Start Health Checklist top-level field validation.
  The post-start health checklist now rejects unexpected public fields before
  process handoff status, process-start allowance, health/OBS side-effect flags,
  check counts, check ids, verification scripts, or read-only boundary policy
  can drift into diagnostic, endpoint, secret, value, payload, artifact path,
  candidate, or command output. Regression tests cover unexpected
  `diagnostic_detail` rejection while preserving blocked/ready operator health
  check states, no probe/network/OBS side effects, script-only verification,
  endpoint/secret redaction, and existing handoff dry-run linkage. `node
  --check` passed for
  `src\services\dev\foundationPostStartHealthChecklist.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Foundation Startup Checklist top-level and production handoff field
  validation. The startup checklist and production handoff summary now reject
  unexpected public fields before startup step counts, terminal plans,
  next-step scripts, readiness state counts, verification scripts, startup
  policy, or checklist-only handoff flags can drift into diagnostic, endpoint,
  secret, env value, payload, candidate, or command output. Regression tests
  cover unexpected `diagnostic_detail` rejection on both the checklist and
  production handoff summary while preserving ready startup guidance, terminal
  labels, readiness counts, script-only verification, endpoint/secret redaction,
  and existing terminal/startup boundary checks. `node --check` passed for
  `src\services\dev\foundationStartupChecklist.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Foundation Local Env Readiness Rehearsal top-level and production
  handoff field validation. The local env readiness rehearsal and handoff
  summary now reject unexpected public fields before materialization status,
  existing-file checks, foundation gate statuses, readiness counts, next-step
  scripts, env-name guidance, gate summaries, runtime expectations, or
  rehearsal-only handoff flags can drift into diagnostic, endpoint, secret, env
  value, template text, payload, artifact path, candidate, or command output.
  Regression tests cover unexpected `diagnostic_detail` rejection on both the
  rehearsal and production handoff summary while preserving dry-run behavior,
  no file updates, existing-file review, env-name-only guidance, endpoint/secret
  redaction, and existing gate/runtime boundary checks. `node --check` passed
  for `src\services\dev\foundationLocalEnvReadinessRehearsal.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Foundation Local Env Roundtrip top-level field validation. The local
  env roundtrip report now rejects unexpected public fields before template
  status, parsed env-name inventory, foundation readiness check counts,
  env-setup plan status, next env group guidance, verification scripts, or
  read-only boundary flags can drift into diagnostic, endpoint, secret, env
  value, template text, payload, artifact path, candidate, or command output.
  Regression tests cover unexpected `diagnostic_detail` rejection while
  preserving rendered-template readiness, env-name-only reporting, foundation
  check counts, env-setup linkage, endpoint/secret redaction, and existing
  boundary policy checks. `node --check` passed for
  `src\services\dev\foundationLocalEnvRoundtrip.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Foundation Local Env Profile top-level field validation. The local
  env profile now rejects unexpected public fields before env group names,
  template env-name inventory, local route summaries, startup/verification
  scripts, template render script, operator notes, or read-only boundary flags
  can drift into diagnostic, endpoint, secret, env value, template text,
  payload, artifact path, candidate, or command output. Regression tests cover
  unexpected `diagnostic_detail` rejection while preserving env-name-only
  profile rendering, script-name guidance, local route path summaries,
  endpoint/secret redaction, and existing env group boundary checks. `node
  --check` passed for `src\services\dev\foundationLocalEnvProfile.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Foundation Local Env Apply Plan top-level field validation. The
  local env apply plan now rejects unexpected public fields before apply mode,
  file materialization state, env-name counts, missing env-name guidance,
  verification scripts, or dry-run/materialize boundary flags can drift into
  diagnostic, endpoint, secret, env value, payload, template text, artifact
  path, candidate, or command output. Regression tests cover unexpected
  `diagnostic_detail` rejection while preserving dry-run safety, explicit
  materialization gating, existing-file blocking, env-name-only reporting,
  endpoint/secret redaction, and existing boundary policy checks. `node
  --check` passed for `src\services\dev\foundationLocalEnvApplyPlan.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Foundation Connector Handoff top-level and production handoff field
  validation. The connector handoff report and production handoff summary now
  reject unexpected public fields before connector ids/kinds, readiness counts,
  next connector guidance, startup checklist links, contract manifest refs,
  verification scripts, endpoint-policy labels, or handoff-only flags can drift
  into diagnostic, endpoint, secret, env value, payload, artifact path, raw job,
  candidate, or command output. Regression tests cover unexpected
  `diagnostic_detail` rejection while preserving connector readiness counts,
  startup checklist linkage, contract refs, production handoff summaries,
  endpoint/secret redaction, and existing connector boundary checks. `node
  --check` passed for `src\services\dev\foundationConnectorHandoff.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Foundation Env Setup Plan top-level and production handoff field
  validation. The foundation env setup plan and production handoff summary now
  reject unexpected public fields before env group ids/kinds, connector handoff
  status, next env-name guidance, verification scripts, readiness counts,
  production decision ids, or env-setup-only handoff flags can drift into
  diagnostic, endpoint, secret, env value, payload, artifact path, candidate, or
  command output. Regression tests cover unexpected `diagnostic_detail`
  rejection while preserving env-name-only guidance, connector readiness groups,
  ready/missing env setup states, production decision counts, endpoint/secret
  redaction, and existing boundary policy checks. `node --check` passed for
  `src\services\dev\foundationEnvSetupPlan.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Foundation Launch Plan top-level field validation. The foundation
  launch plan now rejects unexpected public fields before process startup
  sequence, operator startup plan, foundation stage summary, integration
  readiness labels, verification summaries, runtime handoff scripts, readiness
  counts, next-step guidance, or boundary policy can drift into diagnostic,
  endpoint, secret, payload, env value, candidate, or command output. Regression
  tests cover unexpected `diagnostic_detail` rejection while preserving ready
  launch plans, startup process metadata, runtime handoff verification scripts,
  OBS pickup startup guidance, endpoint/secret redaction, and existing unsafe
  script/env boundary checks. `node --check` passed for
  `src\services\dev\foundationLaunchPlan.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Foundation Readiness Rehearsal top-level and production handoff
  field validation. The foundation readiness rehearsal report and rehearsal
  handoff summary now reject unexpected public fields before stage status,
  launch/env/runtime/live-readiness labels, side-effect attempt flags,
  readiness counts, next-step scripts, runtime flow summaries, gate summaries,
  verification scripts, or rehearsal-only handoff flags can drift into
  diagnostic, endpoint, secret, live payload, runtime text, artifact path,
  local env value, candidate, or command output. Regression tests cover
  unexpected `diagnostic_detail` rejection while preserving dry-run rehearsal
  behavior, no process/engine/OBS/file side effects, readiness state counts,
  next-step guidance, endpoint redaction, and production handoff boundary
  checks. `node --check` passed for
  `src\services\dev\foundationReadinessRehearsal.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Foundation Live Readiness top-level and production handoff field
  validation. The foundation live-readiness report and production handoff
  summary now reject unexpected public fields before launch/env/connector
  readiness labels, runtime/real-engine/OBS/production-probe gate states,
  readiness counts, next-check scripts, OBS pickup startup state, or check-only
  handoff flags can drift into diagnostic, endpoint, secret, live payload,
  runtime text, artifact location, candidate, or command output. Regression
  tests cover unexpected `diagnostic_detail` rejection while preserving live
  readiness gates, production probe handoff, OBS pickup startup summary,
  endpoint/artifact/text redaction, synthetic fixture-post boundaries, and
  no-real-process side-effect guarantees. `node --check` passed for
  `src\services\dev\foundationLiveReadiness.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Foundation Runtime Status top-level and handoff summary field
  validation. The runtime handoff status report, production handoff summary, and
  readiness counts now reject unexpected public fields before overlay runtime
  labels, render-handoff state, local bridge worker status, real-engine handoff
  counts, OBS browser source runtime labels, next-check scripts, or report-only
  handoff flags can drift into diagnostic, endpoint, secret, live payload,
  stream text, artifact path, candidate, or command output. Regression tests
  cover unexpected `diagnostic_detail` rejection while preserving ready OBS
  runtime handoff, real-engine worker flow, render artifact pickup state,
  overlay event stream counts, endpoint/artifact/text redaction, and no-engine
  / no-OBS side-effect guarantees. `node --check` passed for
  `src\services\dev\foundationRuntimeStatus.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Foundation Status top-level and summary field validation. The
  foundation runtime-handoff status report, foundation summary, OBS browser
  source status, readiness counts, and boundary policies now reject unexpected
  public fields before adapter readiness labels, local bridge storage flags,
  real-engine configuration flags, OBS path-only handoff values, attention
  reasons, readiness counts, or boundary assertions can drift into diagnostic,
  endpoint, secret, payload, voice-profile, artifact-path, candidate, or command
  output. Regression tests cover unexpected `diagnostic_detail` rejection while
  preserving ready foundation status, licensed voice-source summaries, OBS
  path-only overlays, local target policy attention, endpoint/secret redaction,
  and no-engine/no-OBS side-effect guarantees. `node --check` passed for
  `src\services\dev\foundationStatus.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Readiness Report top-level and nested public field validation. The
  local dev readiness report, readiness gates, integration gap statuses, and
  integration probe readiness summary now reject unexpected public fields before
  capability labels, readiness states/counts, gap boundary labels, probe counts,
  and counts-only boundary policy can drift into diagnostic, endpoint, secret,
  payload, candidate, commit, canonical, or command output. Regression tests
  cover unexpected `diagnostic_detail` rejection while preserving local-dev
  readiness summaries, integration probe state handoff, real-engine/OBS/game
  control gap status labels, endpoint redaction, and command/candidate blocking.
  `node --check` passed for `src\services\dev\readinessReport.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Persistence Status top-level field validation. The dev persistence
  status report now rejects unexpected public fields before capability flags,
  public counts, sanitized store-limit summaries, readiness state, status label,
  and counts-only boundary policy can drift into diagnostic, store-path,
  record-payload, profile-payload, summary, candidate, endpoint, token, or
  command output. Regression tests cover unexpected `diagnostic_detail`
  rejection while preserving enabled capability flags, counts-only public
  counts, sanitized memory/relationship store limit summaries, path/error
  redaction, and adapter validation requirements. `node --check` passed for
  `src\services\dev\persistenceStatus.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened JSON Memory and Relationship Store Status top-level field validation.
  The JSON memory store status, JSON relationship store status, and public
  relationship profile now reject unexpected public fields before store health,
  record/profile counts, latest timestamps, type/scope/level counters, retention
  settings, persistence operation counters, durability/backup summaries, or
  public relationship labels can drift into diagnostic, store-path, error-message,
  hidden-score, profile-payload, record-payload, candidate, endpoint, token, or
  command output. Regression tests cover unexpected `diagnostic_detail` rejection
  at memory status, relationship status, and public relationship profile surfaces
  while preserving atomic writes, backup health reporting, counts-only status,
  hidden score removal, and safe public profile summaries. `node --check` passed
  for `src\services\persistence\jsonMemoryStore.js`,
  `src\services\persistence\jsonRelationshipStore.js`, and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Candidate Validation and Candidate Persistence Result top-level field
  validation. The candidate validation result, rejected-candidate summaries,
  candidate persistence result, sanitized commit results, and public record hints
  now reject unexpected public fields before validation status, approved memory
  and relationship record arrays, rejection reasons, committed/failed counts,
  persistence error kinds, commit retryability, or approved-record hints can
  drift into diagnostic, raw-candidate, command, store-path, endpoint, token,
  relationship-score, or executable output. Regression tests cover unexpected
  `diagnostic_detail` rejection at validation, rejected-candidate, and
  persistence-result surfaces while preserving approved-schema-only persistence,
  privacy-filter rejection, raw commit detail rejection, and summary-only
  failure reporting. `node --check` passed for
  `src\services\persistence\candidateValidator.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened JSON Operator Policy Store and Audit Log top-level field validation.
  The operator policy public summary, JSON operator policy store status, audit
  public summary, and audit log status now reject unexpected public fields before
  setting ids/groups, policy versions/digests, summary labels, committed/event
  timestamps, record/entry counts, decision counts, retention settings, recovery
  state, or counts-only policy/audit boundaries can drift into diagnostic,
  endpoint, secret, viewer-message, support-message, hidden-score, raw-frame,
  policy-payload, candidate, or command output. Regression tests cover
  unexpected `diagnostic_detail` rejection at operator policy public summary,
  store status, and audit log status surfaces while preserving hidden policy
  values, counts-only status, no store paths, no payloads, and safe audit
  decisions. `node --check` passed for
  `src\services\persistence\operatorPolicyStore.js`,
  `src\services\persistence\operatorPolicyAuditLog.js`, and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened PostgreSQL Pool Factory Plan and Runtime Store Status top-level field
  validation. The pool factory plan, private factory contract, and real
  PostgreSQL runtime memory/relationship store statuses now reject unexpected
  public fields before env-name lists, pool policy, timeout settings, plan
  readiness, store health, record/profile counts, table operation counts,
  relationship policy labels, or latest write timestamps can drift into
  diagnostic, connection-value, endpoint, SQL, parameter, record-payload,
  profile-payload, candidate, or command output. Regression tests cover
  unexpected `diagnostic_detail` rejection at the pool plan, private factory
  contract, and runtime store status surfaces while preserving env-name-only
  reporting, no pool creation from the plan, no DB connection attempts from plan
  validation, and counts-only store status reporting. `node --check` passed for
  `src\services\persistence\postgresPoolFactoryPlan.js`,
  `src\services\persistence\postgresPersistenceStores.js`, and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened PostgreSQL Write Plans, Failure Result, and Prepared Statement
  Executor Status top-level field validation. The memory, relationship, and
  operator-policy write plans, private adapter contract, persistence failure
  result, and prepared statement executor status now reject unexpected public
  fields before table/column names, operation ids/counts, private parameter
  counts, relationship policy labels, policy/audit planning flags, sanitized
  failure kinds, retryability, statement counters, or table operation counters
  can drift into diagnostic, connection-value, endpoint, SQL, parameter,
  record-payload, policy-payload, audit-payload, candidate, or command output.
  Regression tests cover unexpected `diagnostic_detail` rejection at write-plan,
  adapter-contract, failure-result, and executor-status surfaces while preserving
  approved-record-only planning, private prepared-statement routing, counts-only
  public reports, sanitized failure reporting, and no DB connection attempts from
  status checks. `node --check` passed for
  `src\services\persistence\postgresPersistenceAdapterContract.js`,
  `src\services\persistence\postgresPersistenceErrors.js`,
  `src\services\persistence\postgresPreparedStatementExecutor.js`, and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Mock PostgreSQL Adapter and Runtime Store Status top-level field
  validation. The mock PostgreSQL adapter result/status and mock runtime memory
  and relationship store statuses now reject unexpected public fields before
  duplicate flags, record kinds, target table names/counts, operation ids/counts,
  operation counters, duplicate counters, store health, record/profile counts, or
  relationship policy labels can drift into diagnostic, connection-value,
  endpoint, SQL, parameter, record-payload, profile-payload, policy-payload,
  candidate, or command output. Regression tests cover unexpected
  `diagnostic_detail` rejection at mock adapter result/status and mock runtime
  store status surfaces while preserving mock-only persistence, no real DB
  connection attempts, counts-only store reporting, and candidate rejection.
  `node --check` passed for
  `src\services\persistence\mockPostgresPersistenceAdapter.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened PostgreSQL Persistence Adapter and Private Pool Factory top-level
  field validation. The real PostgreSQL adapter result/status and private pool
  factory result/status now reject unexpected public fields before record kinds,
  target table names/counts, operation ids/counts, private parameter counts,
  operation counters, failure counters, pool creation, connection configuration,
  SSL/timeout policy, or factory status can drift into diagnostic,
  connection-value, endpoint, SQL, parameter, record-payload, policy-payload,
  candidate, audit-payload, or command output. Regression tests cover unexpected
  `diagnostic_detail` rejection at adapter result/status and pool factory
  result/status surfaces while preserving prepared-statement routing,
  operator-controlled pool creation, no public parameter values, and summary-only
  pool failure reporting. `node --check` passed for
  `src\services\persistence\postgresPersistenceAdapter.js`,
  `src\services\persistence\postgresPrivatePoolFactory.js`, and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened PostgreSQL Pg Module Resolver and Runtime Persistence Factory
  top-level field validation. The injected pg module resolver and runtime
  persistence factory result now reject unexpected public fields before pool
  class availability, module-import/DB-connection attempts, pool creation, store
  creation, or real-database connection status can drift into diagnostic,
  connection-value, endpoint, SQL, parameter, record-payload, candidate, or
  command output. Regression tests cover unexpected `diagnostic_detail`
  rejection at both public result surfaces while preserving injected-module-only
  pool resolution, operator-controlled pool creation, private pool routing, and
  prepared executor handoff. `node --check` passed for
  `src\services\persistence\postgresPgModuleResolver.js`,
  `src\services\persistence\postgresRuntimePersistenceFactory.js`, and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened PostgreSQL Private Migration Runner Dry Run and Health/Rollback
  Rehearsal top-level field validation. The private migration runner dry-run,
  runner contract, health/rollback rehearsal, rehearsal steps, and verification
  scripts now reject unexpected public fields before runner readiness, migration
  ids/counts, health/backup/rollback readiness, or script routing can drift into
  diagnostic, connection-value, endpoint, SQL, parameter, record-payload,
  candidate, command, DB-connection, migration-applied, rollback-executed, or
  destructive-migration output. Regression tests cover unexpected
  `diagnostic_detail` rejection at the dry-run, contract, rehearsal, step, and
  verification-script levels while preserving no DB connection attempts, no
  migration application, no rollback execution, no destructive migration, and
  fixed script routing. `node --check` passed for
  `src\services\dev\postgresPrivateMigrationRunnerDryRun.js`,
  `src\services\dev\postgresHealthRollbackRehearsal.js`, and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened PostgreSQL Persistence Migration Plan and Review Gate top-level field
  validation. The migration plan and operator review gate now reject unexpected
  public fields before readiness flags, table/index ids, migration ids, backup
  policy, operator-policy storage planning, readiness summaries, or verification
  script names can drift into diagnostic, connection-value, endpoint, SQL,
  parameter, policy-payload, record-payload, candidate, command, DB-connection,
  destructive-migration, or private-runner output. Regression tests cover
  unexpected `diagnostic_detail` rejection at the plan, review gate, and nested
  readiness-summary levels while preserving table/index counts, migration step
  counts, operator review gating, no DB connection attempts, and no destructive
  migration allowance. `node --check` passed for
  `src\services\dev\postgresPersistenceMigrationPlan.js`,
  `src\services\dev\postgresMigrationReviewGate.js`, and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened PostgreSQL Admin Save Preflight top-level field validation. The
  preflight report, admin async save gate preflight, and operator guidance
  summary now reject unexpected public fields before pool-factory readiness,
  env-name booleans, missing env-name lists, next operator steps, or verification
  script guidance can drift into diagnostic, endpoint-like, connection-value,
  store-path, SQL, policy-payload, numeric-policy-value, candidate, command, DB
  connection, or pool-created output. Regression tests cover unexpected
  `diagnostic_detail` rejection at the report and nested gate level while
  preserving ready-for-mock-save-gate routing, env-name-only guidance, no DB
  connection attempts, no pool creation, and path/secret redaction. `node
  --check` passed for `src\services\dev\postgresAdminSavePreflight.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Operator Policy Admin Async Save Gate and roundtrip top-level field
  validation. The private async save gate and CLI roundtrip report now reject
  unexpected public fields before setting ids, policy versions, owner-confirmation
  status, blocked reasons, public policy/audit summaries, PostgreSQL result
  summaries, temp store status, audit status, mock PostgreSQL status, or
  roundtrip positioning can drift into diagnostic, endpoint-like, policy-payload,
  numeric-policy-value, viewer-message, support-message, candidate, command,
  raw-frame, game-control, or private database-call output. Regression tests
  cover unexpected `diagnostic_detail` rejection across both public surfaces
  while preserving async private gate flags, explicit PostgreSQL enablement,
  private adapter requirements, mock/real PostgreSQL result validation, preflight
  positioning, and no leaked policy values. `node --check` passed for
  `src\services\dev\operatorPolicyAdminAsyncSaveGate.js`,
  `src\services\dev\operatorPolicyAsyncSaveGateRoundtrip.js`, and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Operator Policy Admin Apply Plan and Save Gate top-level field
  validation. The dry-run apply plan and authenticated save gate now reject
  unexpected public fields before setting ids, policy versions, owner-confirmation
  status, blocked reasons, public policy summaries, audit summaries, or optional
  PostgreSQL result summaries can drift into diagnostic, endpoint-like,
  policy-payload, numeric-policy-value, viewer-message, support-message,
  candidate, command, raw-frame, game-control, or unapproved store-write output.
  Regression tests cover unexpected `diagnostic_detail` rejection across both
  public surfaces while preserving dry-run boundaries, admin authentication,
  owner confirmation for gameplay control, public summary hiding, audit writes,
  and default no-PostgreSQL-write behavior. `node --check` passed for
  `src\services\dev\operatorPolicyAdminApplyPlan.js`,
  `src\services\dev\operatorPolicyAdminSaveGate.js`, and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Admin Review Decision Log Status top-level field validation. The JSON
  decision-log status now rejects unexpected public fields before health,
  recovery, action counts, latest-decision timestamps, retention counts, or
  boundary flags can drift into diagnostic, path-like, endpoint-like,
  raw-candidate, approved-record, payload, command, raw-frame, validator-commit,
  or memory/relationship store-write output. A regression test covers
  unexpected `diagnostic_detail` rejection while preserving path redaction,
  action-count completeness, health/read-error consistency, recovery labels, and
  no-store-path/no-raw-candidate boundaries. `node --check` passed for
  `src\services\dev\adminReviewDecisionLog.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Admin Review Auth Gate and Validator Run Plan top-level field
  validation. The auth gate report and dry-run validator run plan now reject
  unexpected public fields before auth status, env-name counts, preflight
  summaries, runner item counts, blocking reasons, or next safe script routing
  can drift into diagnostic, endpoint-like, raw-candidate, approved-record,
  payload, command, private-runner input, validator-execution, validator-commit,
  or memory/relationship store-write output. Regression tests cover unexpected
  `diagnostic_detail` rejection across both public surfaces while preserving
  owner/admin confirmation gates, required env-name counts, private runner
  allowed status, no materialized runner input, no private validator call, ready
  runner item counts, auth-blocked routing, and no store writes. `node --check`
  passed for `src\services\dev\adminReviewAuthGate.js`,
  `src\services\dev\adminReviewValidatorRunPlan.js`, and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Admin Review Validator Handoff and Preflight top-level field
  validation. The validator handoff report and private-validator preflight now
  reject unexpected public fields before decision ids, handoff counts, queue
  summaries, blocking reasons, handoff summaries, or validator readiness can
  drift into diagnostic, endpoint-like, raw-candidate, approved-record, payload,
  command, store-write, validator-execution, validator-commit, or game-control
  output. Regression tests cover unexpected `diagnostic_detail` rejection across
  both public surfaces while preserving stale-decision detection, ready/blocked
  handoff counts, blocked reason counts, next safe script routing, no materialized
  validator input, and no private store writes. `node --check` passed for
  `src\services\dev\adminReviewValidatorHandoff.js`,
  `src\services\dev\adminReviewValidatorPreflight.js`, and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Admin Review Queue top-level field validation. The review queue
  report, dry-run action plan, and decision-result response now reject
  unexpected public fields before candidate summaries, recommended admin
  actions, validator handoff decisions, or decision summaries can drift into
  diagnostic, endpoint-like, raw-candidate, approved-record, payload, command,
  store-write, validator-commit, or game-control output. Regression tests cover
  unexpected `diagnostic_detail` rejection across all three public surfaces while
  preserving review group counts, next review/action routing, dry-run action
  matching, confirmation-gated decision recording, decision summary counts, and
  no raw candidate/approved record boundaries. `node --check` passed for
  `src\services\dev\adminReviewQueue.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Admin Character/Voice Settings top-level field validation. The
  guidance-only settings report and dry-run apply plan now reject unexpected
  public fields before setting ids, env-name counts, voice-source readiness, or
  accepted setting-id summaries can drift into diagnostic, endpoint-like,
  setting-value, raw-voice, dataset, model-path, candidate, command, store-write,
  or runtime-change output. Regression tests cover unexpected
  `diagnostic_detail` rejection for both the report and apply plan while
  preserving setting counts, configured/missing counts, voice source flags,
  accepted/rejected/unsafe value counts, dry-run boundaries, and canonical enum
  protections. `node --check` passed for
  `src\services\dev\adminCharacterVoiceSettings.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Admin Safety Controls top-level field validation. The safety control
  report and action-result response now reject unexpected public fields before
  pause state, emergency-stop availability, audit summaries, supported actions,
  or action outcomes can drift into diagnostic, endpoint-like, payload,
  candidate, command, raw-frame, raw-voice, raw-job, or game-control output.
  Regression tests cover unexpected `diagnostic_detail` rejection for both the
  report and action result while preserving confirmation gates, active pause
  counts, audit summary counts, supported action uniqueness, and safety boundary
  flags. `node --check` passed for
  `src\services\dev\adminSafetyControls.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Admin Integration Checklist top-level field validation. The
  integration checklist now rejects unexpected public fields before setup checks,
  status summaries, safe script catalogs, or local endpoint policy counts can
  drift into diagnostic, endpoint-like, payload, candidate, command, database,
  viewer-message, raw-frame, raw-voice, raw-job, or game-control output. A
  regression test covers unexpected `diagnostic_detail` rejection while
  preserving check counts, blocked/disabled/not-configured counts, next check
  routing, status summaries, safe script catalogs, and checklist boundary flags.
  `node --check` passed for `src\services\dev\adminIntegrationChecklist.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Admin Dashboard top-level field validation. The read-only admin
  dashboard now rejects unexpected public fields before operator widgets, module
  summaries, verification surfaces, or safe operator labels can drift into
  diagnostic, endpoint-like, payload, candidate, command, policy, database,
  viewer-message, raw-frame, raw-voice, raw-job, or game-control output. A
  regression test covers unexpected `diagnostic_detail` rejection while
  preserving widget counts, attention counts, module summaries, safe script
  catalogs, verification route/script surfaces, and dashboard boundary flags.
  `node --check` passed for `src\services\dev\adminDashboard.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Admin Operations Summary top-level field validation. The admin
  operations summary now rejects unexpected public fields before operator-facing
  readiness, runtime handoff, admin policy, or review-queue telemetry can drift
  into diagnostic, endpoint-like, payload, candidate, command, policy, database,
  viewer-message, raw-frame, or game-control output. A regression test covers
  unexpected `diagnostic_detail` rejection while preserving recomputed module
  counts, status counts, next operator action/script, verification surfaces, and
  admin boundary flags. `node --check` passed for
  `src\services\dev\adminOperationsSummary.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Production Runtime Handoff Status handoff summary field validation.
  The runtime-handoff aggregate handoff summary now rejects unexpected public
  fields before foundation, YouTube, persistence, gameplay, OBS pickup,
  PostgreSQL preflight, or operator-policy async save telemetry can drift into
  diagnostic, endpoint-like, payload, candidate, command, raw-frame, OCR, or
  private runtime output. A regression test covers unexpected handoff
  `diagnostic_detail` rejection while preserving recomputed component counts,
  readiness counts, next-check script names, and foundation OBS pickup runtime
  summary matching. `node --check` passed for
  `src\services\dev\productionRuntimeHandoffStatus.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Production Scheduler Enablement handoff summary field validation.
  The scheduler-enable plan production handoff summary now rejects unexpected
  public fields before scheduler, YouTube support, memory/relationship, or
  gameplay-control readiness can drift into diagnostic, endpoint-like, payload,
  candidate, command, support-message, or raw-control output. A regression test
  covers unexpected handoff `diagnostic_detail` rejection while preserving
  recomputed stage counts, readiness counts, next-step script names, and
  scheduler side-effect boundary flags. `node --check` passed for
  `src\services\dev\productionSchedulerEnablementPlan.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Production Probe handoff summary field validation. The aggregate
  production probe handoff summary now rejects unexpected public fields before
  runbook, next-task, adapter-probe, OBS health, PostgreSQL preflight, or
  admin-review gate telemetry can drift into diagnostic, endpoint-like, payload,
  candidate, command, or private runner output. A regression test covers
  unexpected handoff `diagnostic_detail` rejection while preserving recomputed
  stage counts, readiness counts, verification status, runtime-handoff script
  names, PostgreSQL preflight script names, and admin-review script names.
  `node --check` passed for `src\services\dev\productionProbe.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Production Next Task handoff summary field validation. The
  next-task production handoff summary now rejects unexpected public fields
  before priority guidance can drift into diagnostic, endpoint-like, payload,
  candidate, command, or private admin-runner output. A regression test covers
  unexpected handoff `diagnostic_detail` rejection while preserving recomputed
  gate counts, readiness counts, fixed runtime-handoff script names, PostgreSQL
  admin-save preflight script names, and admin-review gate script names.
  `node --check` passed for `src\services\dev\productionNextTask.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Production Readiness Runbook handoff summary field validation. The
  runbook production handoff summary now rejects unexpected public fields before
  operator guidance can drift into diagnostic, endpoint-like, payload,
  candidate, or command-shaped output. A regression test covers unexpected
  handoff `diagnostic_detail` rejection while preserving recomputed stage
  counts, readiness counts, launch scripts, and verification script names.
  `node --check` passed for
  `src\services\dev\productionReadinessRunbook.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Production Config Doctor handoff summary field validation. The
  config-doctor production handoff summary now rejects unexpected public fields
  before env-readiness diagnostics can drift into endpoint-like, payload,
  candidate, or command-shaped output. A regression test covers unexpected
  handoff `diagnostic_detail` rejection while preserving recomputed readiness
  totals and script-name-only recommended commands. `node --check` passed for
  `src\services\dev\productionConfigDoctor.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Production Live Readiness handoff summary field validation. The
  aggregate production live-readiness handoff summary now rejects unexpected
  public fields before downstream operator surfaces can carry diagnostic,
  endpoint-like, payload, candidate, or command-shaped drift. A regression test
  covers the rejection while preserving recomputed readiness counts and fixed
  script-name-only handoff. `node --check` passed for
  `src\services\dev\productionLiveReadiness.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened dev engine probe public handoff validation. The public engine probe
  report now rejects unexpected handoff summary fields and validates the fixed
  next-check script name for both configured and unconfigured states, keeping
  TTS/Live2D operator handoff output counts-and-script-only without endpoints,
  secrets, raw jobs, runtime candidates, or commands. `node --check` passed for
  `scripts\dev-engine-probe.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened dev OBS probe public handoff validation. The public OBS probe report
  now rejects unexpected handoff summary fields, validates fixed next-check and
  setup script names, and enforces required-env counts for configured vs.
  unconfigured states so operator handoff output stays counts-and-script-only.
  `node --check` passed for `scripts\dev-obs-probe.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened OBS Bridge setup request/report validation. OBS setup requests now
  validate the full operator-only configuration boundary-policy flag set and
  adapter-validation requirement, while setup reports now reject success reports
  whose configured/event-stream flags drift from successful setup semantics.
  This keeps OBS setup posts configuration-only and prevents runtime payload,
  command, candidate, endpoint, or secret surfaces from entering setup reports.
  `node --check` passed for `src\server\obsBridgeSetup.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened OBS Bridge Health Probe validation. OBS health probe reports and
  probe items now validate complete boundary-policy flags, and summaries reject
  unexpected public fields while recomputing every count from the probe item.
  This keeps OBS readiness surfaces env-name/count/status only without endpoint,
  secret, raw payload, live payload, command, or candidate leaks. `node --check`
  passed for `src\server\obsBridgeSetup.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Local Engine Health Probe validation. Health probe reports and probe
  items now validate complete boundary-policy flags, and health summaries reject
  unexpected public fields in addition to recomputing every count from probe
  items. This keeps VOICEVOX/Live2D readiness surfaces env-name/count/status
  only without endpoint, secret, raw payload, text, command, or candidate leaks.
  `node --check` passed for `src\server\localEngineHealthProbe.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Local Bridge worker CLI payload validation. Drain and watch CLI
  payloads now validate top-level mode/status, complete boundary-policy flags,
  local debug path opt-in, and production handoff summary recomputation from the
  underlying report/status counts. Watch payloads now include safe counts-only
  outbox queue and render-manifest status so handoff summaries can be validated
  without exposing local paths. `node --check` passed for
  `src\server\localBridgeWorkerCliReport.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Local Bridge outbox queue status validation. Worker status and drain
  final status now validate outbox queue schemas, complete counts-only boundary
  flags, per-adapter queue counts, total count recomputation, and adapter
  validation so retry-ready, retry-waiting, retry-blocked, expired, and invalid
  JSON summaries cannot drift from adapter queues. `node --check` passed for
  `src\server\localBridgeEngineWorker.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Local Bridge engine receipt validation. Engine receipts now validate
  allowed engine statuses, complete receipt boundary-policy flags, rendered vs.
  non-rendered artifact summary consistency, failure error-kind presence, and
  retry/expired summary-only boundary markers so worker receipts cannot drift
  into raw job, endpoint, secret, command, or candidate surfaces. `node --check`
  passed for `src\server\localBridgeEngineWorker.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Local Bridge event render manifest boundary validation. Full
  manifests, manifest summaries, and manifest-store status now validate complete
  boundary-policy flags plus adapter-validation requirements so OBS pickup
  metadata stays local-artifact/counts-only without raw jobs, text payloads,
  commands, endpoints, secrets, or candidate surfaces. `node --check` passed for
  `src\server\localBridgeEngineWorker.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Local Bridge engine worker boundary validation. Process reports,
  drain reports, and worker status now validate the complete boundary-policy
  flag set and status adapter-validation flag so worker summaries cannot drift
  into raw jobs, text payloads, commands, endpoints, secrets, or candidate
  surfaces. `node --check` passed for
  `src\server\localBridgeEngineWorker.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Local Bridge error response validation. Request and artifact-delivery
  error responses now validate safe error-kind matching, artifact-delivery
  readiness classification, complete boundary-policy flags, adapter validation,
  and forbidden-field exclusion so failure responses stay summary-only. `node
  --check` passed for `src\server\localBridgeServer.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Local Bridge runtime status validation. The status report now
  validates exact accepted adapter-kind order, per-adapter and game-control
  counters, total received count, recent packet summary shapes, simulated
  game-control effect flags, and the full status boundary-policy flag set so
  runtime status cannot drift from the public packet summaries. `node --check`
  passed for `src\server\localBridgeServer.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Local Bridge health report validation. The health report now
  validates exact accepted adapter-kind order, route availability alignment with
  artifact storage configuration, fixed local route paths, and the full
  boundary-policy flag set so health output remains route-paths-only without
  raw packets, jobs, artifact paths, endpoints, or text payloads. `node --check`
  passed for `src\server\localBridgeServer.js` and `scripts\run-tests.js`;
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Integration Probe summary consistency checks. The probe report now
  recomputes adapter pass/attention/ready/missing/local-or-disabled counts,
  engine-health totals, and local-endpoint-policy counts from its public probe
  and engine-health summaries, rejecting summary drift for both dry-run and
  fixture-post modes without exposing endpoint, secret, or artifact values.
  `node --check` passed for `src\services\dev\integrationProbe.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Live2D cue bridge startup report validation. The startup report now
  validates top-level schema and service status, exact configured env-name
  catalog, listening/configuration paths, bridge-target booleans, handoff
  path/script alignment, endpoint-policy summaries for renderer and health
  endpoints, and boundary flags so the helper startup output remains
  counts-and-paths-only without starting Live2D renderer or OBS. `node --check`
  passed for `scripts\dev-live2d-cue-engine-bridge.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened VOICEVOX bridge startup report validation. The startup report now
  validates its top-level schema and service status, exact configured env-name
  catalog, listening/configuration paths, bridge-target booleans, handoff
  path/script alignment, endpoint-policy summary shape, and boundary flags so
  the helper startup output remains counts-and-paths-only without starting the
  VOICEVOX engine. `node --check` passed for
  `scripts\dev-voicevox-tts-engine-bridge.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Integration Fixtures validation. The fixture manifest now validates
  all synthetic-only fixture policy flags, exact adapter packet and local engine
  request keys, local engine response example policies, synthetic audio/cue
  shapes, and safe ACK examples so fixture data cannot drift into live,
  executable, or effectful examples. `node --check` passed for
  `src\services\dev\integrationFixtures.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Integration Contracts manifest validation. The contracts report now
  validates adapter packet kind order, adapter response policies, OBS overlay
  local-bridge artifact policies, OBS bridge setup policies, source bridge kind
  order, source public-status policies, and the read-only boundary flags on the
  major contract items. `node --check` passed for
  `src\services\dev\integrationContracts.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Integration Status summary consistency checks. The integration
  status report now recomputes configured/local/disabled/missing totals and
  local-endpoint-policy scope counts from its public integration list, rejecting
  summary drift without exposing endpoint or secret values. `node --check`
  passed for `src\services\dev\integrationStatus.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Production Probe summary consistency checks. The probe report now
  recomputes stage, check, local-endpoint-policy, readiness-state, and next-task
  gate counts from its public stage and next-task summaries, rejecting any drift
  in the top-level summary while still keeping endpoint and secret values out of
  the report. `node --check` passed for
  `src\services\dev\productionProbe.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Production Runtime Handoff Status consistency checks. The handoff
  report now validates the ready/attention handoff status against component
  counts, and each component must align its status, readiness state, and next
  check script so ready components cannot still carry runtime scripts and
  attention components cannot masquerade as ready. `node --check` passed for
  `src\services\dev\productionRuntimeHandoffStatus.js` and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Admin Review Auth Gate consistency checks. The auth gate now
  validates required env-name catalog exactness, configured/missing counts,
  auth booleans, private-runner allowed calculation, and ready/blocked status
  alignment. `node --check` passed for
  `src\services\dev\adminReviewAuthGate.js` and `scripts\run-tests.js`; `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Admin Review Validator Preflight and Run Plan consistency checks.
  Preflight now validates status, next safe script, blocked-reason counts, and
  handoff summary counts against the source handoff. Run Plan now validates
  status, runner item counts, blocking reasons, preflight/auth summaries, and
  next safe script against fixed Admin Review script labels without using loose
  command patterns. `node --check` passed for
  `src\services\dev\adminReviewValidatorPreflight.js`,
  `src\services\dev\adminReviewValidatorRunPlan.js`, and
  `scripts\run-tests.js`; `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Admin Review Validator Handoff consistency checks. The handoff report
  now derives its expected status from decision and blocked counts, validates
  ready/blocked/missing/action-mismatch count consistency, and rejects handoff
  items whose ready status carries a blocked reason or whose blocked reason is
  not one of the fixed safe labels. `node --check` passed for
  `src\services\dev\adminReviewValidatorHandoff.js` and `scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Admin Review Decision Log status validation. The status report now
  validates health/store/read-error consistency, non-negative retention counts,
  complete action-count keys, latest-decision timestamp shape, and fixed recovery
  labels for JSON, backup, failed, and in-memory decision stores. Regression
  coverage mutates health, timestamp, action-count, recovery, and boundary
  fields to confirm the log status fails closed without exposing paths or raw
  candidates. `node --check` passed for
  `src\services\dev\adminReviewDecisionLog.js` and `scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Admin Review Queue decision-result consistency. Recorded decisions
  now require safe decision/review/action identifiers, valid actor-role labels,
  non-negative timestamps, and an action id that matches the review group.
  Decision results also cross-check recorded status, decision-store write flags,
  decision presence, owner-confirmation boundary, and decision fields against
  the public result summary. `node --check` passed for
  `src\services\dev\adminReviewQueue.js` and `scripts\run-tests.js`, and `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Admin Review Queue consistency checks. The queue report now validates
  queue status against actionable item counts and requires memory/relationship/
  game/other review counts to sum to the total. Action plans also cross-check
  validated or blocked status against the requested action, review-group match,
  item-found flag, hidden-values boundary, and owner-confirmation requirement.
  `node --check` passed for `src\services\dev\adminReviewQueue.js` and
  `scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened Admin Safety Controls consistency checks. The report now validates
  active pause counts against the public safety state, audit applied/blocked
  counts against the entry total, and the supported action catalog for exact
  coverage without duplicates. Action results also cross-check the public status,
  applied flag, and audit result status. `node --check` passed for
  `src\services\dev\adminSafetyControls.js` and `scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Admin Character and Voice Settings list integrity. The report now
  rejects duplicate setting ids, sequence-order drift, and per-setting env count
  mismatches, keeping the guidance-only settings surface stable without exposing
  configured values. Regression coverage mutates setting ids, order, and env
  counts to confirm the read-only settings report fails closed. `node --check`
  passed for `src\services\dev\adminCharacterVoiceSettings.js` and
  `scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Added Admin Integration Checklist status-summary consistency validation. The
  checklist now rejects summaries whose configured/local/disabled/missing counts
  do not add up to the integration total, and also rejects local-endpoint policy
  subtotals that exceed the applicable count. Regression coverage mutates both
  summaries to confirm the read-only admin checklist keeps its counts internally
  consistent. `node --check` passed for
  `src\services\dev\adminIntegrationChecklist.js` and `scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- Added Admin Dashboard module-summary count consistency validation. The
  dashboard now rejects summaries where ready and attention module counts do not
  add up to the declared module count, keeping the read-only admin aggregate
  internally consistent alongside the fixed-label and safe-script checks.
  `node --check` passed for `src\services\dev\adminDashboard.js` and
  `scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Hardened the Admin Dashboard module-summary contract. The dashboard now
  validates `next_module_id`, `next_admin_status`, and
  `next_operator_action_id` as fixed safe labels in addition to validating the
  inherited safe script catalog, so malformed module/status/action identifiers
  cannot enter the read-only dashboard JSON. `node --check` passed for
  `src\services\dev\adminDashboard.js` and `scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 359 tests passed.
- Pinned the `/admin/integration-checklist` HTTP contract to return per-check
  safe script catalogs for YouTube ingest and Memory Search. The regression
  fetches the endpoint, confirms the expected Priority 2/3 scripts are present,
  and rejects endpoint/payload/action-candidate leakage from the serialized JSON.
  `node --check scripts\run-tests.js` and `node scripts\run-tests.js` passed:
  all 359 tests passed.
- Hardened the Admin Review private-runner flow:
  - Added auth-gate and validator run-plan surfaces:
    - `npm run dev:admin:review-auth-gate`
    - `npm run dev:admin:review-validator-run-plan`
    - `GET /admin/review-queue/auth-gate`
    - `GET /admin/review-queue/validator-run-plan`
  - Extended the Admin Dashboard with Operator/Admin/Owner actor selection,
    decision-log health, validator handoff, validator preflight, auth-gate, and
    run-plan status cards.
  - Added a dashboard load-failure fail-safe that reports only a fixed
    `dashboard_load_failed` state and excludes endpoint values, secrets,
    payloads, and raw error text from the browser surface.
  - Updated the dashboard preselect workflow to use the page URL
    (`/admin?actor_role=owner|admin|operator`) while keeping
    `/admin/dashboard` as a read-only JSON source.
  - Added Admin Review queue and private-runner readiness widgets to the
    read-only Admin Dashboard JSON report. The widgets expose only safe labels,
    not raw candidates, decision payloads, runner input, script execution, or
    endpoint values.
  - Added Admin Review private-runner safety flags and verification script names
    to the production next-task handoff summary. The report now explicitly
    states that it does not start the private runner or materialize runner input.
  - Propagated the same Admin Review private-runner safety fields into the
    production probe next-task summary and probe handoff summary.
  - Added Admin Review auth-gate and validator run-plan checks to the production
    live-readiness verification script catalog.
  - Surfaced the Admin Review auth-gate and validator run-plan checks in the
    operations summary, production config doctor recommended command catalog,
    production runbook, debug console, and production persistence handoff
    reports.
- Added vector-memory bridge and roundtrip script names to the persistence local
  env apply plan so endpoint wiring review points directly to the safe bridge
  startup and IDs/scores-only verification steps.
- Added vision, game-control, and validation-gate roundtrip script names to the
  gameplay local env apply plan so Priority 4 endpoint/action wiring review
  points directly to the safe observation and adapter-gate checks.
- Added YouTube runtime-status, live-readiness, runtime-ingest roundtrip, and
  support-gate roundtrip script names to the YouTube ingest local env apply plan
  so Priority 2 source/credential wiring review points directly to safe runtime
  and support-pipeline checks without starting live polling.
- Added startup-checklist, runtime/live readiness, bridge status/engine
  roundtrip, and OBS runtime render roundtrip script names to the foundation
  local env apply plan so Priority 1 local env materialization points directly
  to the safe post-configuration checks.
- Added the priority-2 YouTube local env profile for direct API or trusted relay
  setup.
- Added the guarded YouTube local env apply plan:
  - `npm run dev:youtube:local-env-apply`
  - `GET /production/youtube-local-env-apply-plan`
- Added priority-3 persistence local env profile/apply:
  - `npm run dev:persistence:local-env-profile`
  - `npm run dev:persistence:local-env-apply`
  - `GET /production/persistence-local-env-profile`
  - `GET /production/persistence-local-env-apply-plan`
- Added priority-4 gameplay local env profile/apply:
  - `npm run dev:gameplay:local-env-profile`
  - `npm run dev:gameplay:local-env-apply`
  - `GET /production/gameplay-local-env-profile`
  - `GET /production/gameplay-local-env-apply-plan`
- Added a production scheduler enablement plan for the two HTTP-ingest-dependent
  stages:
  - `npm run dev:production:scheduler-enablement`
  - `GET /production/scheduler-enablement`
  - It separates source/configuration blockers, scheduler env review, scheduler
    runtime availability, scheduler start, and runtime rehearsal without polling
    sources or controlling a game.
- Added the local vector-memory bridge surface:
  - `npm run dev:memory-vector:bridge`
  - It returns IDs/scores only and keeps records, summaries, candidates, commands,
    secrets, and endpoint values out of public bridge reports.
- Added the priority-3 persistence startup checklist:
  - `npm run dev:persistence:startup-checklist`
  - It orders vector-memory bridge startup, local env review, vector roundtrip,
    runtime status, and live-readiness checks using script names and env names
    only; memory records, relationship profiles, store path values, endpoint
    values, candidates, and commands stay out of public reports.
- Tightened priority-1/2/4 startup logs for the IRIS dev server, local adapter
  bridge, VOICEVOX bridge, and Live2D cue bridge so startup output reports env
  names, route/path labels, scheduler booleans, and policy booleans without
  printing endpoint values or local path values.
- Added the local YouTube relay bridge surface:
  - `npm run dev:youtube:relay-bridge`
  - It serves deterministic local fixture comments/support events for the trusted
    HTTP relay path while startup and health reports expose only env names,
    route labels, counts, and safety booleans.
  - The YouTube local env profile/apply/setup-plan surfaces now include the
    relay bridge host/port env names and relay bridge script so priority-2
    local wiring can be rehearsed without real YouTube credentials.
- Added the local relay readiness rehearsal:
  - `npm run dev:youtube:relay-readiness-rehearsal`
  - It starts the local relay bridge on a temporary loopback target, runs one
    scheduler tick, and reports only counts/statuses for comments, support
    events, validation-gated persistence, and runtime handoff.
- Added the local relay startup checklist:
  - `npm run dev:youtube:relay-startup-checklist`
  - `GET /production/youtube-relay-startup-checklist`
  - It orders relay bridge startup, local env review, relay rehearsal, source
    status, runtime status, and live-readiness checks using script names and env
    names only.
  - It is now surfaced from `production next-task` / `production probe` as the
    priority-2 startup checklist while the stage remains blocked until a
    YouTube API or trusted relay source is configured.
- Added the gameplay startup checklist:
  - `npm run dev:gameplay:startup-checklist`
  - `GET /production/gameplay-startup-checklist`
  - It orders local env review, vision-source checks, validation/policy gate
    checks, game-control rehearsal, and runtime/live-readiness checks with env
    names and script names only.
  - It is surfaced from gameplay local env/setup reports, production runbook,
    production config doctor, production next-task, production probe, and
    production live-readiness without exposing raw frames, OCR text, action
    candidates, approved actions, endpoint values, or command payloads.
- Added `GET /production/persistence-startup-checklist` and debug-console links
  for the persistence/gameplay startup checklists so the safe operator checklist
  surfaces are available from both CLI and local HTTP inspection.
- Extracted the YouTube relay readiness rehearsal into a reusable dev service and
  added `GET /production/youtube-relay-readiness-rehearsal`.
  - The CLI and HTTP route now share the same synthetic local relay rehearsal.
  - Reports expose only counts, statuses, policy booleans, and script names; relay
    endpoint values, YouTube text, support messages, platform IDs, memory records,
    relationship profiles, candidates, and commands remain excluded.
- Extracted the vector memory roundtrip into a reusable dev service and added
  `GET /production/memory-vector-roundtrip`.
  - The CLI and HTTP route now share the same synthetic local vector-memory
    roundtrip.
  - Reports expose only request/result counts, filtered-private status, policy
    booleans, and script names; memory summaries, private records, endpoint
    values, relationship profiles, candidates, and commands remain excluded.
  - The vector roundtrip safety assertion now checks request payloads, provider
    results, and public reports for the same forbidden secret/candidate/command
    fragments.
- Extracted the gameplay validation-gate roundtrip into a reusable dev service
  and added `GET /production/gameplay-validation-gate-roundtrip`.
  - The CLI and HTTP route now share the same synthetic low-confidence vision
    rehearsal.
  - Reports confirm low-confidence observations stop before the game-control
    adapter and expose only counts, statuses, and policy booleans; endpoint
    values, raw frames, OCR text, input-action candidates, approved actions, and
    commands remain excluded.
- Extracted the OBS runtime render roundtrip into a reusable dev service while
  keeping the CLI entrypoint.
  - The service runs only local fixture HTTP servers and verifies the main HTTP
    comment path, local bridge outbox, local engine worker, render manifest,
    artifact pickup paths, and foundation runtime handoff status.
  - Reports expose only counts, statuses, artifact metadata, and policy
    booleans; endpoint values, raw engine requests, raw jobs, artifact bodies,
    user text, candidates, commands, and secrets remain excluded.
  - No real OBS, Live2D, VOICEVOX, game, or OS input process is started.
- Strengthened the YouTube relay readiness rehearsal leak assertion for
  secret-like value fragments while preserving allowed `no_secret_values` and
  `no_endpoint_values` policy keys.
- Added a production handoff summary to the YouTube relay startup checklist.
  - It explicitly marks the checklist as local-relay rehearsal only.
  - It separates direct YouTube API startup, OAuth flow, real API keys, and real
    live chat/support payloads as not started/not required for the local relay
    rehearsal.
  - It points the next production decision back to the safe env setup plan.
- Added production handoff summaries to the persistence and gameplay startup
  checklists.
  - Persistence now explicitly separates local vector-bridge rehearsal from
    production vector search and states that memory/relationship candidates are
    not committed directly.
  - Gameplay now explicitly separates local vision-bridge rehearsal from real
    game/OS input and states that input-action candidates are never forwarded
    directly to adapters.
  - Both summaries expose only fixed decision ids and safe script names.
- All apply plans are dry-run by default and materialize only with an explicit
  `-- --materialize` flag.
- The local `.env.local` file was appended with missing YouTube, persistence, and
  gameplay env names only. Existing values were not overwritten, and values that
  need real operator input remain blank or existing local defaults.
- Fixed the YouTube local env template to include `IRIS_YOUTUBE_LIVE_CHAT_API_KEY`,
  matching the relay credential env name already used by runtime adapters.
- Added test coverage for the new CLIs, HTTP routes, package scripts, production
  runbook, production live readiness, env setup script lists, and debug-console
  routes.

## Configuration Waiting On Operator Input

- `IRIS_YOUTUBE_LIVE_CHAT_SOURCE` or `IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT`
- `IRIS_YOUTUBE_LIVE_CHAT_ID` or `IRIS_YOUTUBE_VIDEO_ID`
- One credential option:
  - `IRIS_YOUTUBE_DATA_API_KEY`
  - `IRIS_YOUTUBE_OAUTH_TOKEN`
  - `IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN` plus `IRIS_YOUTUBE_OAUTH_CLIENT_ID` plus
    `IRIS_YOUTUBE_OAUTH_CLIENT_SECRET`
- `IRIS_ENABLE_HTTP_INGEST_SCHEDULER` should be reviewed before live polling.
  The foundation profile initially keeps it disabled, while YouTube live ingest
  requires it enabled.
- `IRIS_MEMORY_SEARCH_ENDPOINT` is still required to wire production
  vector-memory search to a local/private bridge target.
- `IRIS_GAME_OBSERVATION_ENDPOINT`, `IRIS_GAME_CONTROL_ENDPOINT`, and
  `IRIS_AVAILABLE_GAME_ACTIONS` are still required before gameplay safe control
  can become operational.

## Safety Decisions

- YouTube support events remain donation events and are not silently downgraded
  into ordinary comments.
- Relationship and memory updates from support events remain candidate-gated and
  are not directly committed.
- YouTube source, runtime, and live-readiness reports expose counts, statuses,
  env names, and script names only.
- `input_action_candidate` must continue to stop at validation and never go
  directly to game-control adapters.
- Phase16+ internal profiles must stay internal guidance and must not become
  canonical enum fields.

## Next Work

- Continue Priority 2 until real source credentials are the only remaining blocker:
  use the scheduler enablement plan, then run source-status, preflight,
  live-readiness, and runtime-ingest roundtrips once source values are present.
- Start and wire the local/private vector-memory bridge target, then run
  persistence preflight, vector roundtrip, live-readiness, and runtime-status
  checks.
- Configure the local/private game vision and approved-control bridge values, then
  run gameplay preflight, vision roundtrip, validation-gate roundtrip, and
  runtime-status checks.
- Keep all additions covered by `node scripts/run-tests.js`.

## Latest Verification

- After hardening production attention digest stage total alignment, `node
  --check scripts\dev-production-attention-digest.js` and `node --check
  scripts\run-tests.js` passed. `node scripts\dev-production-attention-digest.js`
  returned `"ok": true`, and `node scripts\run-preflight.js` returned
  `"ok": true`.
- After hardening production attention digest stage summary counts, `node --check
  scripts\dev-production-attention-digest.js` and `node --check
  scripts\run-tests.js` passed. `node scripts\dev-production-attention-digest.js`
  returned `"ok": true`, and `node scripts\run-preflight.js` returned
  `"ok": true`.
- After hardening production attention digest public audit consistency, `node
  --check scripts\dev-production-attention-digest.js` and `node --check
  scripts\run-tests.js` passed. `node scripts\dev-production-attention-digest.js`
  returned `"ok": true`, and `node scripts\run-preflight.js` returned
  `"ok": true`.
- After hardening public report boundary audit policy completeness, `node --check
  scripts\dev-public-report-boundary-audit.js` and `node --check
  scripts\run-tests.js` passed. `node
  scripts\dev-public-report-boundary-audit.js` returned `"ok": true`, and `node
  scripts\run-preflight.js` returned `"ok": true`.
- After hardening public report boundary audit missing-list uniqueness, `node
  --check scripts\dev-public-report-boundary-audit.js` and `node --check
  scripts\run-tests.js` passed. `node
  scripts\dev-public-report-boundary-audit.js` returned `"ok": true`, and `node
  scripts\run-preflight.js` returned `"ok": true`.
- After hardening public report boundary audit ok-state consistency, `node
  --check scripts\dev-public-report-boundary-audit.js` and `node --check
  scripts\run-tests.js` passed. `node
  scripts\dev-public-report-boundary-audit.js` returned `"ok": true`, and `node
  scripts\run-preflight.js` returned `"ok": true`.
- After hardening public report boundary audit impossible-count checks, `node
  --check scripts\dev-public-report-boundary-audit.js` and `node --check
  scripts\run-tests.js` passed. `node
  scripts\dev-public-report-boundary-audit.js` returned `"ok": true`, and `node
  scripts\run-preflight.js` returned `"ok": true`.
- After adding preflight production boundary policy regression coverage, `node
  --check scripts\run-tests.js` passed. `node scripts\run-preflight.js` returned
  `"ok": true` with production boundary policy `no_secret_values: true`.
- After hardening preflight operator launch count diagnostics, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with six ready launch
  steps and zero attention launch steps.
- After hardening preflight integration probe summary schema diagnostics, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true`; the optional
  integration probe summary remained safely nullable in the default preflight.
- After hardening preflight production attention digest schema diagnostics,
  `node --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `iris_production_attention_digest_preflight_summary_v1`.
- After hardening final preflight ok-state diagnostics, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with
  `iris_public_report_boundary_audit_v1`.
- After adding preflight boundary audit policy regression coverage, `node
  --check scripts\run-tests.js` passed. `node scripts\run-preflight.js`
  returned `"ok": true` with `iris_public_report_boundary_audit_v1`.
- After hardening preflight boundary audit schema validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned
  `iris_public_report_boundary_audit_v1`. `node scripts\run-tests.js` passed:
  all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight boundary audit allowlist-count upper bound, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned allowlist missing/scanned
  count `0/152`. `node scripts\run-tests.js` passed: all 366 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight boundary audit missing-count upper bounds, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned missing/scanned counts of
  `0/5`, `0/88`, and `0/19`. `node scripts\run-tests.js` passed: all 366 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight boundary audit script-count upper bound, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned 152 scanned scripts and 42
  assert scripts. `node scripts\run-tests.js` passed: all 366 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight spec missing/addendum separation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-preflight.js` returned no overlap between missing and addendum spec
  files. `node scripts\run-tests.js` passed: all 366 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight spec expected-count positivity, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-preflight.js` returned `expected: 28` and `found: 28`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight spec count upper bound, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-preflight.js` returned `expected: 28` and `found: 28`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight spec missing-file uniqueness, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-preflight.js` returned 0 missing spec files. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight spec addendum uniqueness, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-preflight.js` returned 8 unique addendum files. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight scenario final-review consistency, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-preflight.js` returned `last_review_required: false`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight scenario step-count consistency, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-preflight.js` returned `dev-basic` with 7 steps. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight scenario identity consistency, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-preflight.js` returned `scenario.name` as `dev-basic`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight top-level ok type validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-preflight.js` returned boolean `"ok": true`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight top-level ok boundary-audit consistency, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with audit ok
  also true. `node scripts\run-tests.js` passed: all 366 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight attention-digest boundary-audit consistency, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with digest
  boundary ok matching the public boundary audit. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true`
  with `iris_smoke_report_v1`.
- After hardening preflight production attention-stage env consistency, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with no non-ready
  stage missing its env list. `node scripts\run-tests.js` passed: all 366 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight production readiness-status consistency, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `production.readiness_status` equal to `attention_required`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight ready launch-plan next-step consistency, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `ready_to_launch_foundation` and no next step. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true`
  with `iris_smoke_report_v1`.
- After hardening preflight ready launch-plan consistency, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-preflight.js` returned `"ok": true` with
  `ready_to_launch_foundation` and 0 attention steps. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true`
  with `iris_smoke_report_v1`.
- After hardening preflight production verification plan status consistency,
  `node --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `plan_status` equal to `start_next_attention_stage`. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true`
  with `iris_smoke_report_v1`.
- After hardening preflight production verification script coverage, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with 25
  next-stage verification scripts. `node scripts\run-tests.js` passed: all 366
  tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight production verification next-stage priority, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `next_stage_priority` equal to 2. `node scripts\run-tests.js` passed: all 366
  tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight readiness integration-gap operator review
  consistency, `node --check scripts\run-preflight.js` and `node --check
  scripts\run-tests.js` passed. `node scripts\run-preflight.js` returned `"ok":
  true` with 8 operator-configuration gaps and no non-review readiness states.
  `node scripts\run-tests.js` passed: all 366 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight readiness integration-gap uniqueness, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-preflight.js` returned `"ok": true` with 8 unique integration gaps.
  `node scripts\run-tests.js` passed: all 366 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight readiness next-state consistency, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-preflight.js` returned `"ok": true` with `next_readiness_state`
  present in the readiness-state counts. `node scripts\run-tests.js` passed: all
  366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight integration probe summary engine-worker state
  consistency, `node --check scripts\run-preflight.js` and `node --check
  scripts\run-tests.js` passed. `node scripts\run-preflight.js` returned `"ok":
  true` with the optional integration probe summary currently null. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight integration probe summary next-state consistency,
  `node --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with the optional
  integration probe summary currently null. `node scripts\run-tests.js` passed:
  all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight integration probe summary count consistency, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with the optional
  integration probe summary currently null. `node scripts\run-tests.js` passed:
  all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight attention digest live-readiness stage consistency,
  `node --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `production.operator_launch_plan.target_stage_id` matching
  `production_attention_digest.live_readiness_next_stage_id`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight attention digest live-readiness script consistency,
  `node --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `live_readiness_next_check_script` set to
  `npm run dev:bridge:status-roundtrip`, listed in the operator launch sequence
  script surface. `node scripts\run-tests.js` passed: all 366 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight attention digest next-task consistency, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `next_stage: youtube_comments_and_support`, matching
  `production_attention_digest.next_task_stage_id`, and the digest next-task
  check script listed in the verification plan. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned
  `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight verification script uniqueness, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with 25 unique
  next-stage verification scripts across 25 entries. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned
  `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight missing-env list uniqueness, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with no duplicate
  missing-env names in production stage statuses or launch steps. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight ready launch-step env consistency, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with 6 ready launch
  steps and ready-step missing env counts `0,0,0,0,0,0`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight production ready-stage env consistency, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with ready-stage
  missing env count `0`. `node scripts\run-tests.js` passed: all 366 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight production stage identity validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with 4 unique production
  stage ids across 4 stage status entries. `node scripts\run-tests.js` passed:
  all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight operator launch process identity validation, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with 6 unique
  launch process ids across 6 launch sequence entries. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned
  `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight operator launch sequence ordering, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with launch sequence
  order `1,2,3,4,5,6`. `node scripts\run-tests.js` passed: all 366 tests passed.
  `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight operator launch next-step consistency, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with null
  `next_step_id`, null `next_step_order`, and 6 launch sequence steps. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight attention digest stage-reference consistency, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `next_task_stage_id: youtube_comments_and_support` and
  `live_readiness_next_stage_id: tts_live2d_obs_foundation`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight operator launch target-stage reference consistency,
  `node --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `operator_launch_plan.target_stage_id: tts_live2d_obs_foundation`, and that
  stage was present in `production.stage_statuses`. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned
  `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight production next-stage reference consistency, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `next_stage: youtube_comments_and_support`,
  `verification_plan.next_stage_id: youtube_comments_and_support`, and the stage
  present in `production.stage_statuses`. `node scripts\run-tests.js` passed:
  all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight production attention digest stage count consistency,
  `node --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with 4
  production stages, `ready_stage_count: 0`, and `attention_stage_count: 4`.
  `node scripts\run-tests.js` passed: all 366 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight readiness integration gap summary consistency, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with 8
  `integration_gaps` and 8 matching `integration_gap_statuses`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight readiness candidate review count consistency, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `step_count: 7` and `candidate_review_items: 30`. `node scripts\run-tests.js`
  passed: all 366 tests passed.
- After hardening preflight scenario summary count validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned scenario summary `name: dev-basic`,
  `step_count: 7`, and `last_review_required: false`. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- After hardening preflight specs summary count consistency, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with `expected: 28`,
  `found: 28`, and an empty `missing` list. `node scripts\run-tests.js` passed:
  all 366 tests passed.
- After hardening scenario suite CLI aggregate count consistency, `node --check
  scripts\run-scenario-suite.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-scenario-suite.js` returned
  `iris_scenario_suite_report_v1` with `scenario_count: 3` and per-scenario
  public counts of `7/30`, `5/20`, and `5/22` for step count and candidate
  review item count. `node scripts\run-tests.js` passed: all 366 tests passed.
- After hardening smoke CLI public count consistency, `node --check
  scripts\run-smoke.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`,
  `step_count: 7`, `game_step_count: 1`, and `candidate_review_item_count: 30`.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- After hardening scenario CLI required public step status validation, `node
  --check scripts\run-scenario.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-scenario.js` returned public step summaries with
  `final_decision`, `review_required`, `boundary_audit_status`, and
  `candidate_validation_status`. `node scripts\run-tests.js` passed: all 366
  tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening scenario CLI candidate count consistency, `node --check
  scripts\run-scenario.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-scenario.js` returned public candidate count summaries with
  committed counts at or below approved counts and approved counts at or below
  review counts. `node scripts\run-tests.js` passed: all 366 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening scenario CLI step index consistency, `node --check
  scripts\run-scenario.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-scenario.js` returned `iris_scenario_result_v1` with step indexes
  `0` through `6`. `node scripts\run-tests.js` passed: all 366 tests passed.
  `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening scenario CLI step object validation, `node --check
  scripts\run-scenario.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-scenario.js` returned `iris_scenario_result_v1` with a public
  `results` array and `step_count: 7`. `node scripts\run-tests.js` passed: all
  366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening scenario CLI results container validation, `node --check
  scripts\run-scenario.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-scenario.js` returned `iris_scenario_result_v1` with a public
  `results` array and `step_count: 7`. `node scripts\run-tests.js` passed: all
  366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening scenario CLI top-level step count validation, `node --check
  scripts\run-scenario.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-scenario.js` returned `iris_scenario_result_v1` with
  `step_count: 7`. `node scripts\run-tests.js` passed: all 366 tests passed.
  `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After cleaning up preflight public-report helper drift, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with the expected public
  preflight schemas. `node scripts\run-tests.js` passed: all 366 tests passed.
  `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight public boundary audit missing-count consistency,
  `node --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `missing_allowlist_count: 0` and `missing_run_boundary_count: 0`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight public boundary audit scan counts, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with positive scan
  counts including `scanned_script_count: 152`, `scanned_run_script_count: 5`,
  and `scanned_server_file_count: 19`. `node scripts\run-tests.js` passed: all
  366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight attention digest stage count presence, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with
  `ready_stage_count: 0` and `attention_stage_count: 4`. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned `"ok":
  true` with `iris_smoke_report_v1`.
- After hardening preflight operator launch count consistency, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with
  `ready_step_count: 6` and `attention_step_count: 0`. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned `"ok":
  true` with `iris_smoke_report_v1`.
- After hardening preflight verification script count consistency, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with
  `total_verification_script_count: 103`. `node scripts\run-tests.js` passed:
  all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight production array presence validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with non-empty
  `launch_sequence` and `stage_statuses`. `node scripts\run-tests.js` passed:
  all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight launch sequence order validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with 1-based
  `sequence_order` values. `node scripts\run-tests.js` passed: all 366 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight optional production label validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with `next_step_id:
  null` and public `operator_focus_reason`. `node scripts\run-tests.js` passed:
  all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight readiness summary validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with public readiness
  labels, `integration_probe_readiness_summary: null`, and
  `candidate_review_items`. `node scripts\run-tests.js` passed: all 366 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight scenario id validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with public scenario
  name `dev-basic`. `node scripts\run-tests.js` passed: all 366 tests passed.
  `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight spec file name validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with public
  `IRIS_20240425_*.txt` addendum file names. `node scripts\run-tests.js` passed:
  all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight integration gap id validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with public
  `integration_gaps`. `node scripts\run-tests.js` passed: all 366 tests passed.
  `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight integration gap status validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with public
  `integration_gap_statuses`. `node scripts\run-tests.js` passed: all 366 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight readiness count validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` with public
  `readiness_state_counts`. `node scripts\run-tests.js` passed: all 366 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening scenario CLI step metric validation, `node --check
  scripts\run-scenario.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-scenario.js` returned `iris_scenario_result_v1` with finite
  `human_likeness_score` values. `node scripts\run-tests.js` passed: all 366
  tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening scenario-suite metric validation, `node --check
  scripts\run-scenario-suite.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-scenario-suite.js` returned `"ok": true` with finite
  `min_human_likeness_score` values. `node scripts\run-tests.js` passed: all
  366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening smoke report metric validation, `node --check
  scripts\run-smoke.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-smoke.js` returned `"ok": true`, `iris_smoke_report_v1`, and a
  finite `min_human_likeness_score`. `node scripts\run-tests.js` passed: all
  366 tests passed.
- After hardening scenario-suite top-level result validation, `node --check
  scripts\run-scenario-suite.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-scenario-suite.js` returned `"ok": true`,
  `scenario_count: 3`, and forward-slash `scenarios/*.json` file paths. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After normalizing scenario-suite public file paths, `node --check
  scripts\run-scenario-suite.js` passed. `node scripts\run-scenario-suite.js`
  returned `"ok": true` with `scenarios/dev-basic.json`,
  `scenarios/dev-boundaries.json`, and `scenarios/dev-multilingual-voice.json`.
  `node --check scripts\run-tests.js` passed. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned
  `"ok": true` with `iris_smoke_report_v1`.
- After hardening scenario-suite scenario id validation, `node --check
  scripts\run-scenario-suite.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-scenario-suite.js` returned public scenario names
  `dev-basic`, `dev-boundaries`, and `dev-multilingual-voice`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening smoke scenario id validation, `node --check
  scripts\run-smoke.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-smoke.js` returned `"ok": true`, `iris_smoke_report_v1`, and
  `scenario: dev-basic`. `node scripts\run-tests.js` passed: all 366 tests
  passed.
- After hardening scenario CLI public id validation, `node --check
  scripts\run-scenario.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-scenario.js` returned `name: dev-basic`, `event_id:
  scenario-comment-0`, and `event_id: scenario-idle-6`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening scenario-suite response language validation, `node --check
  scripts\run-scenario-suite.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-scenario-suite.js` returned `"ok": true` with public
  response language codes including `en`, `ja`, `de`, `ur`, and `pl`. `node
  scripts\run-tests.js` passed: all 366 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening scenario CLI public token validation, `node --check
  scripts\run-scenario.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-scenario.js` returned `iris_scenario_result_v1` with safe event id,
  action type, and candidate-validation status tokens. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true`
  with `iris_smoke_report_v1`.
- After hardening scenario CLI boundary policy validation, `node --check
  scripts\run-scenario.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-scenario.js` returned `iris_scenario_result_v1` with
  `summary_fields_only`, `no_candidates`, `no_commands`, and
  `no_raw_runtime_state` set to true. `node scripts\run-tests.js` passed: all 366
  tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening scenario-suite boundary policy validation, `node --check
  scripts\run-scenario-suite.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-scenario-suite.js` returned `"ok": true` with
  `scenario_file_names_only`, `no_raw_step_payloads`, `no_candidates`, and
  `no_commands` set to true. `node scripts\run-tests.js` passed: all 366 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening smoke report shape validation, `node --check
  scripts\run-smoke.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-smoke.js` returned `"ok": true`, `iris_smoke_report_v1`,
  `step_count: 7`, `min_human_likeness_score: 0.9152`, and `counts_only: true`.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- After hardening scenario-suite result summary shape validation, `node --check
  scripts\run-scenario-suite.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-scenario-suite.js` returned `"ok": true`,
  `scenario_count: 3`, public scenario file names, non-negative min
  human-likeness scores, and candidate-review counts. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned `"ok":
  true` with `iris_smoke_report_v1`.
- After hardening scenario CLI step summary shape validation, `node --check
  scripts\run-scenario.js` passed. `node scripts\run-scenario.js` returned
  `iris_scenario_result_v1`, `step_count: 7`, safe human-likeness scores, and
  `review_required: false` step summaries. `node scripts\run-tests.js` passed:
  all 366 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After adding package-script regression coverage for the main run CLIs, `node
  --check scripts\run-tests.js`, `node --check scripts\run-preflight.js`, and
  `node --check scripts\run-scenario-suite.js` passed. `node scripts\run-tests.js`
  passed: all 366 tests passed. `node scripts\run-smoke.js` returned `"ok":
  true` with `iris_smoke_report_v1`.
- After adding regression coverage for the scenario suite public surface, `node
  --check scripts\run-scenario-suite.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-scenario-suite.js` returned `"ok": true`,
  `iris_scenario_suite_report_v1`, `scenario_count: 3`, and boundary policy
  output. `node scripts\run-tests.js` passed: all 365 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After making the scenario CLI reusable and resilient to incomplete local HTTP
  adapter configuration, `node --check scripts\run-scenario.js` and `node
  --check scripts\run-tests.js` passed. `node scripts\run-scenario.js` returned
  `iris_scenario_result_v1`, `name: dev-basic`, `step_count: 7`, and boundary
  policy output. `node scripts\run-tests.js` passed: all 364 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After adding regression coverage for the smoke public surface, `node --check
  scripts\run-smoke.js` and `node --check scripts\run-tests.js` passed. `node
  scripts\run-smoke.js` returned `"ok": true`, `iris_smoke_report_v1`, and
  `candidate_review_item_count: 30`. `node scripts\run-tests.js` passed: all 363
  tests passed.
- After adding regression coverage for the main preflight public surface, `node
  --check scripts\run-preflight.js` and `node --check scripts\run-tests.js`
  passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `operator_focus_urgency: multi_gate_attention` and
  `iris_public_report_boundary_audit_v1`. `node scripts\run-tests.js` passed:
  all 362 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight missing-env-name arrays, `node --check
  scripts\run-preflight.js` passed. `node scripts\run-preflight.js` returned
  `"ok": true` with safe `missing_required_env` arrays containing `IRIS_...`
  env-name references only. `node scripts\run-tests.js` passed: all 361 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight public npm-script fields, `node --check
  scripts\run-preflight.js` passed. `node scripts\run-preflight.js` returned
  `"ok": true` with safe `npm run dev:foundation:runtime-status`,
  `npm run dev:voicevox:bridge`, and `npm test` script references. `node
  scripts\run-tests.js` passed: all 361 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight public status/schema labels, `node --check
  scripts\run-preflight.js` passed. `node scripts\run-preflight.js` returned
  `"ok": true` with safe `readiness_status: attention_required`,
  `runtime_handoff_status: runtime_handoff_attention`,
  `operator_focus_urgency: multi_gate_attention`, and
  `iris_public_report_boundary_audit_v1`. `node scripts\run-tests.js` passed:
  all 361 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening production runbook boundary policies copied into preflight,
  `node --check scripts\run-preflight.js` passed. `node scripts\run-preflight.js`
  returned `"ok": true` with safe `read_only_plan`,
  `safe_local_commands_only`, `script_names_only`, `no_payloads`, and
  `no_endpoint_values` flags. `node scripts\run-tests.js` passed: all 361 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight-owned boundary policy flag values, `node --check
  scripts\run-preflight.js` passed. `node scripts\run-preflight.js` returned
  `"ok": true` with safe `read_only_summary`, `script_names_only`,
  `no_file_contents`, `no_commands`, and `no_endpoint_values` policy flags.
  `node scripts\run-tests.js` passed: all 361 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight Public Report Boundary Audit summary shape
  validation, `node --check scripts\run-preflight.js` passed. `node
  scripts\run-preflight.js` returned `"ok": true` with
  `iris_public_report_boundary_audit_v1`, `scanned_script_count: 152`,
  `missing_server_allowlist_count: 0`, and `no_file_contents: true`. `node
  scripts\run-tests.js` passed: all 361 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight production summary shape validation, `node --check
  scripts\run-preflight.js` passed. `node scripts\run-preflight.js` returned
  `"ok": true` with `production.readiness_status: attention_required`,
  `next_stage_priority: 2`, `total_verification_script_count: 103`,
  `ready_step_count: 6`, and safe `launch_readiness_status` entries. `node
  scripts\run-tests.js` passed: all 361 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight Production Attention Digest compact summary shape
  validation, `node --check scripts\run-preflight.js` passed. `node
  scripts\run-preflight.js` returned `"ok": true` with
  `operator_focus_urgency: multi_gate_attention`, ready/attention stage counts,
  and `public_report_boundary_ok: true`. `node scripts\run-tests.js` passed: all
  361 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening preflight specs and scenario summary shape validation, `node
  --check scripts\run-preflight.js` passed. `node scripts\run-preflight.js`
  returned `"ok": true` with spec counts `expected: 28`, `found: 28`,
  `scenario.step_count: 7`, and `last_review_required: false`. `node
  scripts\run-tests.js` passed: all 361 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening preflight-owned boundary policy summaries, `node --check
  scripts\run-preflight.js` passed. `node scripts\run-preflight.js` returned
  `"ok": true` with safe `read_only_summary`, `script_names_only`,
  `no_endpoint_values`, and `no_commands` policy flags. `node
  scripts\run-tests.js` passed: all 361 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening nested readiness summaries inside main preflight, `node
  --check scripts\run-preflight.js` passed. `node scripts\run-preflight.js`
  returned `"ok": true` with `readiness.status: ready_for_local_dev`, safe
  readiness-state counts, and safe `integration_gap_statuses` entries. `node
  scripts\run-tests.js` passed: all 361 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening nested production summaries inside main preflight, `node
  --check scripts\run-preflight.js` passed. `node scripts\run-preflight.js`
  returned `"ok": true` with `production.readiness_status: attention_required`,
  safe verification/operator launch `plan_status` fields, and safe
  `launch_readiness_status` entries. `node scripts\run-tests.js` passed: all 361
  tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening the main preflight section summaries, `node --check
  scripts\run-preflight.js` passed. `node scripts\run-preflight.js` returned
  `"ok": true` with `readiness.status: ready_for_local_dev`,
  `production.readiness_status: attention_required`, and
  `operator_focus_urgency: multi_gate_attention`. `node scripts\run-tests.js`
  passed: all 361 tests passed. `node scripts\run-smoke.js` returned `"ok":
  true` with `iris_smoke_report_v1`.
- After hardening the preflight Public Report Boundary Audit compact summary,
  `node --check scripts\run-preflight.js` passed. `node
  scripts\run-preflight.js` returned `"ok": true` with zero missing public
  report boundary counts and `no_file_contents: true`. `node
  scripts\run-tests.js` passed: all 361 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening the preflight Production Attention Digest compact summary,
  `node --check scripts\run-preflight.js` passed. `node
  scripts\run-preflight.js` returned `"ok": true` with the safe operator focus
  reason, `operator_focus_urgency: multi_gate_attention`, and
  `public_report_boundary_ok: true`. `node scripts\run-tests.js` passed: all 361
  tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After hardening Production Attention Digest nested summary validation, `node
  --check scripts\dev-production-attention-digest.js` and `node --check
  scripts\run-tests.js` passed. Direct digest execution returned `"ok": true`
  with the existing safe runtime handoff summary, focus urgency, and stage
  summaries. `node scripts\run-tests.js` passed: all 361 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening Production Attention Digest `operator_focus` nested field
  validation, `node --check scripts\dev-production-attention-digest.js` and
  `node --check scripts\run-tests.js` passed. Direct digest execution returned
  `"ok": true` with the safe focus reason, `focus_urgency:
  multi_gate_attention`, and worker job counts. `node scripts\run-tests.js`
  passed: all 361 tests passed. `node scripts\run-smoke.js` returned `"ok":
  true` with `iris_smoke_report_v1`.
- After adding operator focus urgency, `node --check
  scripts\dev-production-attention-digest.js`, `node --check
  scripts\run-preflight.js`, and `node --check scripts\run-tests.js` passed.
  Direct digest execution returned `"ok": true`, `focus_urgency:
  multi_gate_attention`, `focus_reason: local_bridge_worker_runtime_attention`,
  and pending/retry-blocked worker job counts. `node scripts\run-preflight.js`
  returned `"ok": true` with `operator_focus_urgency` and the matching safe
  operator focus summary. `node scripts\run-tests.js` passed: all 361 tests
  passed.
- After adding operator focus reason and queue hints, `node --check
  scripts\dev-production-attention-digest.js`, `node --check
  scripts\run-preflight.js`, and `node --check scripts\run-tests.js` passed.
  Direct digest execution returned `"ok": true`, `focus_reason:
  local_bridge_worker_runtime_attention`, and pending/retry-blocked worker job
  counts. `node scripts\run-preflight.js` returned `"ok": true` with
  `operator_focus_reason`, `operator_focus_pending_worker_job_count`, and
  `operator_focus_retry_blocked_worker_job_count`. `node scripts\run-tests.js`
  passed: all 361 tests passed. `node scripts\run-smoke.js` returned `"ok": true`
  with `iris_smoke_report_v1`.
- After adding operator focus routing to Production Attention Digest, `node
  --check scripts\dev-production-attention-digest.js`, `node --check
  scripts\run-preflight.js`, and `node --check scripts\run-tests.js` passed.
  Direct digest execution returned `"ok": true`,
  `iris_production_attention_digest_v1`, `operator_focus.focus_id:
  runtime_handoff`, and `operator_focus.focus_check_script: npm run
  dev:foundation:runtime-status`. `node scripts\run-preflight.js` returned
  `"ok": true` and included the same operator focus summary. `node
  scripts\run-tests.js` passed: all 361 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After integrating Production Attention Digest into preflight, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` and included
  `production_attention_digest` with `runtime_handoff_status`,
  `live_readiness_status`, and `public_report_boundary_ok: true`. `node
  scripts\run-tests.js` passed: all 361 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After adding the Production Attention Digest regression test, `node --check
  scripts\dev-production-attention-digest.js` and `node --check
  scripts\run-tests.js` passed. Direct digest execution returned `"ok": true`,
  `iris_production_attention_digest_v1`, and `missing_server_allowlist_count: 0`.
  `node scripts\run-tests.js` passed: all 361 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`. `node
  scripts\run-preflight.js` returned `"ok": true` with
  `missing_server_allowlist_count: 0`.
- After adding Production Attention Digest, `node --check
  scripts\dev-production-attention-digest.js` passed. Direct execution returned
  `"ok": true`, `iris_production_attention_digest_v1`, production next-stage
  status, live-readiness status, and public-report audit counts including
  `missing_server_allowlist_count: 0`. `node scripts\run-tests.js` passed: all
  360 tests passed. `node scripts\run-preflight.js` returned `"ok": true` with
  `missing_server_allowlist_count: 0`. `node scripts\run-smoke.js` returned
  `"ok": true` with `iris_smoke_report_v1`.
- After extending Public Report Boundary Audit to cover `src\server`, `node
  --check scripts\dev-public-report-boundary-audit.js`, `node --check
  scripts\run-preflight.js`, and `node --check scripts\run-tests.js` passed.
  Direct audit and preflight execution returned `"ok": true` with
  `missing_dev_service_allowlist_count: 0` and `missing_server_allowlist_count:
  0`. `node scripts\run-tests.js` passed: all 360 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true` with `iris_smoke_report_v1`.
- After extending Public Report Boundary Audit to cover `src\services\dev`,
  `node --check scripts\dev-public-report-boundary-audit.js`, `node --check
  scripts\run-preflight.js`, and `node --check scripts\run-tests.js` passed.
  Direct audit and preflight execution returned `"ok": true` with
  `missing_allowlist_count: 0`, `missing_run_boundary_count: 0`, and
  `missing_dev_service_allowlist_count: 0`. `node scripts\run-tests.js` passed:
  all 360 tests passed. `node scripts\run-smoke.js` returned `"ok": true` with
  `iris_smoke_report_v1`.
- After extending Public Report Boundary Audit to cover `scripts\run-*.js`,
  `node --check scripts\dev-public-report-boundary-audit.js`, `node --check
  scripts\run-preflight.js`, and `node --check scripts\run-tests.js` passed.
  Direct audit and preflight execution returned `"ok": true` with
  `missing_allowlist_count: 0` and `missing_run_boundary_count: 0`. `node
  scripts\run-tests.js` passed: all 360 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true` with `iris_smoke_report_v1`.
- After hardening smoke CLI public output validation, `node --check
  scripts\run-smoke.js` passed. Direct smoke execution returned `"ok": true`,
  `iris_smoke_report_v1`, `counts_only: true`, and `no_candidates: true`.
  The `scripts\run-*.js` boundary scan returned no remaining run-script
  candidates. `node scripts\run-tests.js` passed: all 360 tests passed. `node
  scripts\run-preflight.js` returned `"ok": true` with
  `missing_allowlist_count: 0`.
- After hardening scenario runner CLI public output validation, `node --check
  scripts\run-scenario.js` and `node --check scripts\run-scenario-suite.js`
  passed. Direct `scripts\run-scenario.js` execution with local-safe adapter
  settings returned `iris_scenario_result_v1` and boundary flags for
  summary-only/no-candidate output. Direct `scripts\run-scenario-suite.js`
  execution returned `"ok": true`, `iris_scenario_suite_report_v1`, and
  `no_candidates: true`. `node scripts\run-tests.js` passed: all 360 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true`.
- After hardening main preflight output top-level validation, `node --check
  scripts\run-preflight.js` and `node --check scripts\run-tests.js` passed.
  `node scripts\run-preflight.js` returned `"ok": true` and included
  `public_report_boundary_audit` with `missing_allowlist_count: 0`. `node
  scripts\run-tests.js` passed: all 360 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true`.
- After adding the Public Report Boundary Audit regression test, `node --check
  scripts\run-tests.js` and `node --check
  scripts\dev-public-report-boundary-audit.js` passed. Direct audit execution
  returned `"ok": true` with `missing_allowlist_count: 0`. `node
  scripts\run-tests.js` passed: all 360 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true`.
- After integrating Public Report Boundary Audit into preflight, `node --check
  scripts\dev-public-report-boundary-audit.js` and `node --check
  scripts\run-preflight.js` passed. Direct audit execution returned `"ok": true`
  with `missing_allowlist_count: 0`; `node scripts\run-preflight.js` returned
  `"ok": true` and included `public_report_boundary_audit` with
  `missing_allowlist_count: 0`. `node scripts\run-tests.js` passed: all 359 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true`.
- After adding Public Report Boundary Audit, `node --check
  scripts\dev-public-report-boundary-audit.js`, `node --check
  scripts\dev-live2d-cue-engine-roundtrip.js`, and `node --check
  scripts\dev-production-loop-roundtrip.js` passed. Direct execution of the
  audit, Live2D cue engine roundtrip, and Production Loop roundtrip returned
  `"ok": true`; `node scripts\run-smoke.js` returned `"ok": true`.
- After hardening YouTube Ingest Once CLI public report top-level field
  validation, `node --check scripts\dev-youtube-ingest-once.js`, direct
  execution of the script, and `node scripts\run-tests.js` passed: all 359 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true`; the remaining
  no-allowlist scan returned no `scripts\dev-*.js` candidates.
- After hardening YouTube HTTP Ingest Roundtrip public report top-level field
  validation, `node --check scripts\dev-youtube-http-ingest-roundtrip.js`, direct
  execution of the script, and `node scripts\run-tests.js` passed: all 359 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true`.
- After hardening YouTube Relay Roundtrip public report top-level field
  validation, `node --check scripts\dev-youtube-relay-roundtrip.js`, direct
  execution of the script, and `node scripts\run-tests.js` passed: all 359 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true`.
- After hardening YouTube Policy Gate and Relay Status Roundtrip public report
  top-level field validation, `node --check
  scripts\dev-youtube-policy-gate-roundtrip.js`, `node --check
  scripts\dev-youtube-relay-status-roundtrip.js`, direct execution of both
  scripts, and `node scripts\run-tests.js` passed: all 359 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true`.
- After hardening Live2D Cue Engine Unsafe Roundtrip public report top-level
  field validation, `node --check
  scripts\dev-live2d-cue-engine-unsafe-roundtrip.js`, direct execution of the
  script, and `node scripts\run-tests.js` passed: all 359 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true`.
- After hardening VOICEVOX TTS Engine Roundtrip and Unsafe Roundtrip public
  report top-level field validation, `node --check
  scripts\dev-voicevox-tts-engine-roundtrip.js`, `node --check
  scripts\dev-voicevox-tts-engine-unsafe-roundtrip.js`, direct execution of both
  scripts, and `node scripts\run-tests.js` passed: all 359 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true`.
- After hardening Foundation Blocked Worker Roundtrip and Bridge Render Manifest
  CLI public report top-level field validation, `node --check
  scripts\dev-foundation-blocked-worker-roundtrip.js`, `node --check
  scripts\dev-bridge-render-manifest.js`, direct execution of both scripts, and
  `node scripts\run-tests.js` passed: all 359 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true`.
- After hardening Gameplay and Foundation Policy Gate Roundtrip public report
  top-level field validation, `node --check
  scripts\dev-gameplay-policy-gate-roundtrip.js`, `node --check
  scripts\dev-foundation-policy-gate-roundtrip.js`, direct execution of both
  scripts, and `node scripts\run-tests.js` passed: all 359 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true`.
- After hardening Vision Game and Unsafe Vision Roundtrip public report
  top-level field validation, `node --check scripts\dev-vision-game-roundtrip.js`,
  `node --check scripts\dev-vision-unsafe-roundtrip.js`, direct execution of both
  scripts, and `node scripts\run-tests.js` passed: all 359 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true`.
- After hardening Game Control and Unsafe Game Control Roundtrip public report
  top-level field validation, `node --check scripts\dev-game-control-roundtrip.js`,
  `node --check scripts\dev-game-control-unsafe-roundtrip.js`, direct execution
  of both scripts, and `node scripts\run-tests.js` passed: all 359 tests passed.
  `node scripts\run-smoke.js` returned `"ok": true`.
- After hardening Persistence Candidate Gate and Policy Gate Roundtrip public
  report top-level field validation, `node --check
  scripts\dev-persistence-candidate-gate-roundtrip.js`, `node --check
  scripts\dev-persistence-policy-gate-roundtrip.js`, direct execution of both
  scripts, and `node scripts\run-tests.js` passed: all 359 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true`.
- After hardening Persistence Backup and HTTP Roundtrip public report top-level
  field validation, `node --check
  scripts\dev-persistence-backup-roundtrip.js`, `node --check
  scripts\dev-persistence-http-roundtrip.js`, direct execution of both scripts,
  and `node scripts\run-tests.js` passed: all 359 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true`.
- After hardening Persistence Failure and Restart Roundtrip public report
  top-level field validation, `node --check
  scripts\dev-persistence-failure-roundtrip.js`, `node --check
  scripts\dev-persistence-restart-roundtrip.js`, direct execution of both
  scripts, and `node scripts\run-tests.js` passed: all 359 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true`.
- After hardening Persistence Status and Persistence Roundtrip public report
  top-level field validation, `node --check
  scripts\dev-persistence-status-roundtrip.js`, `node --check
  scripts\dev-persistence-roundtrip.js`, direct execution of both scripts, and
  `node scripts\run-tests.js` passed: all 359 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true`.
- After hardening OBS Browser Source Config and Unsafe Roundtrip public report
  top-level field validation, `node --check
  scripts\dev-obs-browser-source-config.js`, `node --check
  scripts\dev-obs-unsafe-roundtrip.js`, direct execution of both scripts, and
  `node scripts\run-tests.js` passed: all 359 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true`.
- After hardening OBS Stale Artifact Roundtrip public report top-level field
  validation, `node --check scripts\dev-obs-stale-artifact-roundtrip.js`, `node
  scripts\dev-obs-stale-artifact-roundtrip.js`, and `node scripts\run-tests.js`
  passed: all 359 tests passed. `node scripts\run-smoke.js` returned
  `"ok": true`.
- After hardening OBS Render Handoff and Invalid Artifact Roundtrip public report
  top-level field validation, `node --check
  scripts\dev-obs-render-handoff-roundtrip.js`, `node --check
  scripts\dev-obs-invalid-artifact-roundtrip.js`, direct execution of both
  scripts, and `node scripts\run-tests.js` passed: all 359 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true`.
- After hardening Local Bridge Render Manifest Operator Report top-level field
  validation, `node --check src\server\localBridgeRenderManifestReport.js`,
  `node --check scripts\dev-bridge-render-manifest.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-bridge-render-manifest.js`, and `node
  scripts\run-tests.js` passed: all 359 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true`.
- After hardening Bridge Outbox Corrupt Roundtrip public report top-level field
  validation, `node --check scripts\dev-bridge-outbox-corrupt-roundtrip.js`,
  `node scripts\dev-bridge-outbox-corrupt-roundtrip.js`, and `node
  scripts\run-tests.js` passed: all 359 tests passed. `node scripts\run-smoke.js`
  returned `"ok": true`.
- After hardening Bridge Artifact Roundtrip public report top-level field
  validation, `node --check scripts\dev-bridge-artifact-roundtrip.js`, `node
  scripts\dev-bridge-artifact-roundtrip.js`, and `node scripts\run-tests.js`
  passed: all 359 tests passed. `node scripts\run-smoke.js` returned
  `"ok": true`.
- After hardening Bridge Engine Roundtrip public report top-level field
  validation, `node --check scripts\dev-bridge-engine-roundtrip.js`, `node
  scripts\dev-bridge-engine-roundtrip.js`, and `node scripts\run-tests.js`
  passed: all 359 tests passed. `node scripts\run-smoke.js` returned
  `"ok": true`.
- After hardening Bridge Status Roundtrip public report top-level field
  validation, `node --check scripts\dev-bridge-status-roundtrip.js`, `node
  --check scripts\run-tests.js`, `node scripts\dev-bridge-status-roundtrip.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed. `node
  scripts\run-smoke.js` returned `"ok": true`.
- After hardening Local Bridge Worker CLI payload top-level field validation,
  `node --check src\server\localBridgeWorkerCliReport.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true`.
- After hardening Operator Policy Settings CLI top-level field validation,
  `node --check scripts\dev-operator-policy-settings.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true`. A scan for
  `scripts\dev-*.js` files with exported assert functions and no allowlist-style
  field constant returned no remaining candidates.
- After hardening Live2D Cue Engine Bridge Startup top-level field validation,
  `node --check scripts\dev-live2d-cue-engine-bridge.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed. `node scripts\run-smoke.js` returned `"ok": true`.
- After hardening VOICEVOX TTS Engine Bridge Startup top-level field validation,
  `node --check scripts\dev-voicevox-tts-engine-bridge.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening YouTube Ingest Source Status CLI top-level field validation,
  `node --check scripts\dev-youtube-ingest-source-status.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Spec Manifest top-level field validation, `node --check
  src\services\dev\specManifest.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening OBS Runtime Render Roundtrip top-level field validation,
  `node --check src\services\dev\obsRuntimeRenderRoundtrip.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Memory Vector Roundtrip top-level field validation, `node
  --check src\services\dev\memoryVectorRoundtrip.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Gameplay Validation Gate Roundtrip top-level field validation,
  `node --check src\services\dev\gameplayValidationGateRoundtrip.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  359 tests passed.
- After hardening YouTube Relay Readiness Rehearsal top-level field validation,
  `node --check src\services\dev\youtubeRelayReadinessRehearsal.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  359 tests passed.
- After hardening YouTube Relay Startup Checklist top-level field validation,
  `node --check src\services\dev\youtubeRelayStartupChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Gameplay Startup Checklist top-level field validation, `node
  --check src\services\dev\gameplayStartupChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Persistence Startup Checklist top-level field validation,
  `node --check src\services\dev\persistenceStartupChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Gameplay Post Start Checklist top-level field validation,
  `node --check src\services\dev\gameplayPostStartChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Persistence Post Start Checklist top-level field validation,
  `node --check src\services\dev\persistencePostStartChecklist.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  359 tests passed.
- After hardening YouTube Ingest Post Start Checklist top-level field
  validation, `node --check
  src\services\dev\youtubeIngestPostStartChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Gameplay Readiness Rehearsal top-level field validation,
  `node --check src\services\dev\gameplayReadinessRehearsal.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Persistence Readiness Rehearsal top-level field validation,
  `node --check src\services\dev\persistenceReadinessRehearsal.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  359 tests passed.
- After hardening YouTube Ingest Readiness Rehearsal top-level field validation,
  `node --check src\services\dev\youtubeIngestReadinessRehearsal.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  359 tests passed.
- After hardening YouTube Ingest Source Status top-level field validation,
  `node --check src\services\dev\youtubeIngestSourceStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Gameplay Live Readiness top-level field validation, `node
  --check src\services\dev\gameplayLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Persistence Live Readiness top-level field validation,
  `node --check src\services\dev\persistenceLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening YouTube Ingest Live Readiness top-level field validation,
  `node --check src\services\dev\youtubeIngestLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Gameplay Runtime Status top-level field validation, `node
  --check src\services\dev\gameplayRuntimeStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Persistence Runtime Status top-level field validation, `node
  --check src\services\dev\persistenceRuntimeStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening YouTube Ingest Runtime Status top-level field validation,
  `node --check src\services\dev\youtubeIngestRuntimeStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Gameplay Preflight top-level field validation, `node --check
  src\services\dev\gameplayPreflight.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Persistence Preflight top-level field validation, `node
  --check src\services\dev\persistencePreflight.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening YouTube Ingest Preflight top-level field validation, `node
  --check src\services\dev\youtubeIngestPreflight.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Gameplay Launch Plan top-level field validation, `node
  --check src\services\dev\gameplayLaunchPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Persistence Launch Plan top-level field validation, `node
  --check src\services\dev\persistenceLaunchPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening YouTube Ingest Launch Plan top-level field validation, `node
  --check src\services\dev\youtubeIngestLaunchPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Gameplay Env Setup Plan top-level field validation, `node
  --check src\services\dev\gameplayEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Persistence Env Setup Plan top-level field validation, `node
  --check src\services\dev\persistenceEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening YouTube Ingest Env Setup Plan top-level field validation,
  `node --check src\services\dev\youtubeIngestEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Gameplay Local Env Profile top-level field validation, `node
  --check src\services\dev\gameplayLocalEnvProfile.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Persistence Local Env Profile top-level field validation,
  `node --check src\services\dev\persistenceLocalEnvProfile.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening YouTube Ingest Local Env Profile top-level field validation,
  `node --check src\services\dev\youtubeIngestLocalEnvProfile.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  359 tests passed.
- After hardening Gameplay Local Env Apply Plan top-level field validation,
  `node --check src\services\dev\gameplayLocalEnvApplyPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Persistence Local Env Apply Plan top-level field validation,
  `node --check src\services\dev\persistenceLocalEnvApplyPlan.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  359 tests passed.
- After hardening YouTube Ingest Local Env Apply Plan top-level field
  validation, `node --check
  src\services\dev\youtubeIngestLocalEnvApplyPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Preflight top-level field validation, `node
  --check src\services\dev\foundationPreflight.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Operator Run Gate top-level field validation,
  `node --check src\services\dev\foundationOperatorRunGate.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Process Handoff Dry Run top-level field
  validation, `node --check
  src\services\dev\foundationProcessHandoffDryRun.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Post-Start Health Checklist top-level field
  validation, `node --check
  src\services\dev\foundationPostStartHealthChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Startup Checklist top-level and production handoff
  field validation, `node --check
  src\services\dev\foundationStartupChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Local Env Readiness Rehearsal top-level and
  production handoff field validation, `node --check
  src\services\dev\foundationLocalEnvReadinessRehearsal.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Local Env Roundtrip top-level field validation,
  `node --check src\services\dev\foundationLocalEnvRoundtrip.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Local Env Profile top-level field validation,
  `node --check src\services\dev\foundationLocalEnvProfile.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Local Env Apply Plan top-level field validation,
  `node --check src\services\dev\foundationLocalEnvApplyPlan.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  359 tests passed.
- After hardening Foundation Connector Handoff top-level and production handoff
  field validation, `node --check
  src\services\dev\foundationConnectorHandoff.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Env Setup Plan top-level and production handoff
  field validation, `node --check
  src\services\dev\foundationEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Launch Plan top-level field validation, `node
  --check src\services\dev\foundationLaunchPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Readiness Rehearsal top-level and production
  handoff field validation, `node --check
  src\services\dev\foundationReadinessRehearsal.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Live Readiness top-level and production handoff
  field validation, `node --check
  src\services\dev\foundationLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Foundation Runtime Status top-level and handoff summary field
  validation, `node --check src\services\dev\foundationRuntimeStatus.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  359 tests passed.
- After hardening Foundation Status top-level and summary field validation,
  `node --check src\services\dev\foundationStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Readiness Report top-level and nested public field validation,
  `node --check src\services\dev\readinessReport.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Persistence Status top-level field validation, `node --check
  src\services\dev\persistenceStatus.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening JSON Memory and Relationship Store Status top-level field
  validation, `node --check
  src\services\persistence\jsonMemoryStore.js`, `node --check
  src\services\persistence\jsonRelationshipStore.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Candidate Validation and Candidate Persistence Result top-level
  field validation, `node --check
  src\services\persistence\candidateValidator.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening JSON Operator Policy Store and Audit Log top-level field
  validation, `node --check
  src\services\persistence\operatorPolicyStore.js`, `node --check
  src\services\persistence\operatorPolicyAuditLog.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening PostgreSQL Pool Factory Plan and Runtime Store Status top-level
  field validation, `node --check
  src\services\persistence\postgresPoolFactoryPlan.js`, `node --check
  src\services\persistence\postgresPersistenceStores.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening PostgreSQL Write Plans, Failure Result, and Prepared Statement
  Executor Status top-level field validation, `node --check
  src\services\persistence\postgresPersistenceAdapterContract.js`, `node --check
  src\services\persistence\postgresPersistenceErrors.js`, `node --check
  src\services\persistence\postgresPreparedStatementExecutor.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Mock PostgreSQL Adapter and Runtime Store Status top-level field
  validation, `node --check
  src\services\persistence\mockPostgresPersistenceAdapter.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening PostgreSQL Persistence Adapter and Private Pool Factory
  top-level field validation, `node --check
  src\services\persistence\postgresPersistenceAdapter.js`, `node --check
  src\services\persistence\postgresPrivatePoolFactory.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening PostgreSQL Pg Module Resolver and Runtime Persistence Factory
  top-level field validation, `node --check
  src\services\persistence\postgresPgModuleResolver.js`, `node --check
  src\services\persistence\postgresRuntimePersistenceFactory.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening PostgreSQL Private Migration Runner Dry Run and Health/Rollback
  Rehearsal top-level field validation, `node --check
  src\services\dev\postgresPrivateMigrationRunnerDryRun.js`, `node --check
  src\services\dev\postgresHealthRollbackRehearsal.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening PostgreSQL Persistence Migration Plan and Review Gate top-level
  field validation, `node --check
  src\services\dev\postgresPersistenceMigrationPlan.js`, `node --check
  src\services\dev\postgresMigrationReviewGate.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening PostgreSQL Admin Save Preflight top-level field validation,
  `node --check src\services\dev\postgresAdminSavePreflight.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Operator Policy Admin Async Save Gate and roundtrip top-level
  field validation, `node --check
  src\services\dev\operatorPolicyAdminAsyncSaveGate.js`, `node --check
  src\services\dev\operatorPolicyAsyncSaveGateRoundtrip.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Operator Policy Admin Apply Plan and Save Gate top-level field
  validation, `node --check
  src\services\dev\operatorPolicyAdminApplyPlan.js`, `node --check
  src\services\dev\operatorPolicyAdminSaveGate.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Admin Review Decision Log Status top-level field validation,
  `node --check src\services\dev\adminReviewDecisionLog.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Admin Review Auth Gate and Validator Run Plan top-level field
  validation, `node --check src\services\dev\adminReviewAuthGate.js`, `node
  --check src\services\dev\adminReviewValidatorRunPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Admin Review Validator Handoff and Preflight top-level field
  validation, `node --check
  src\services\dev\adminReviewValidatorHandoff.js`, `node --check
  src\services\dev\adminReviewValidatorPreflight.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Admin Review Queue top-level field validation, `node --check
  src\services\dev\adminReviewQueue.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Admin Character/Voice Settings top-level field validation,
  `node --check src\services\dev\adminCharacterVoiceSettings.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Admin Safety Controls top-level field validation, `node
  --check src\services\dev\adminSafetyControls.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Admin Integration Checklist top-level field validation, `node
  --check src\services\dev\adminIntegrationChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Admin Dashboard top-level field validation, `node --check
  src\services\dev\adminDashboard.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Admin Operations Summary top-level field validation, `node
  --check src\services\dev\adminOperationsSummary.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Production Runtime Handoff Status handoff summary field
  validation, `node --check
  src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Production Scheduler Enablement handoff summary field
  validation, `node --check
  src\services\dev\productionSchedulerEnablementPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Production Probe handoff summary field validation, `node
  --check src\services\dev\productionProbe.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Production Next Task handoff summary field validation,
  `node --check src\services\dev\productionNextTask.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Production Readiness Runbook handoff summary field validation,
  `node --check src\services\dev\productionReadinessRunbook.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Production Config Doctor handoff summary field validation,
  `node --check src\services\dev\productionConfigDoctor.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Production Live Readiness handoff summary field validation,
  `node --check src\services\dev\productionLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening dev engine probe public handoff validation, `node --check
  scripts\dev-engine-probe.js`, `node --check scripts\run-tests.js`, and `node
  scripts\run-tests.js` passed: all 359 tests passed.
- After hardening dev OBS probe public handoff validation, `node --check
  scripts\dev-obs-probe.js`, `node --check scripts\run-tests.js`, and `node
  scripts\run-tests.js` passed: all 359 tests passed.
- After hardening OBS Bridge setup request/report validation, `node --check
  src\server\obsBridgeSetup.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening OBS Bridge Health Probe validation, `node --check
  src\server\obsBridgeSetup.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Local Engine Health Probe validation, `node --check
  src\server\localEngineHealthProbe.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Local Bridge worker CLI payload validation, `node --check
  src\server\localBridgeWorkerCliReport.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Local Bridge outbox queue status validation, `node --check
  src\server\localBridgeEngineWorker.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Local Bridge engine receipt validation, `node --check
  src\server\localBridgeEngineWorker.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Local Bridge event render manifest boundary validation, `node
  --check src\server\localBridgeEngineWorker.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Local Bridge engine worker boundary validation, `node --check
  src\server\localBridgeEngineWorker.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Local Bridge error response validation, `node --check
  src\server\localBridgeServer.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Local Bridge runtime status validation, `node --check
  src\server\localBridgeServer.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Local Bridge health report validation, `node --check
  src\server\localBridgeServer.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Integration Probe summary consistency checks, `node --check
  src\services\dev\integrationProbe.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Live2D cue bridge startup report validation, `node --check
  scripts\dev-live2d-cue-engine-bridge.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening VOICEVOX bridge startup report validation, `node --check
  scripts\dev-voicevox-tts-engine-bridge.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Integration Fixtures validation, `node --check
  src\services\dev\integrationFixtures.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Integration Contracts manifest validation, `node --check
  src\services\dev\integrationContracts.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Integration Status summary consistency checks, `node --check
  src\services\dev\integrationStatus.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Production Probe summary consistency checks, `node --check
  src\services\dev\productionProbe.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Production Runtime Handoff Status consistency checks, `node
  --check src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Admin Review Auth Gate consistency checks, `node --check
  src\services\dev\adminReviewAuthGate.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Admin Review Validator Preflight and Run Plan consistency
  checks, `node --check src\services\dev\adminReviewValidatorPreflight.js`,
  `node --check src\services\dev\adminReviewValidatorRunPlan.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  359 tests passed.
- After hardening Admin Review Validator Handoff consistency checks, `node
  --check src\services\dev\adminReviewValidatorHandoff.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Admin Review Decision Log status validation, `node --check
  src\services\dev\adminReviewDecisionLog.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Admin Review Queue decision-result consistency, `node --check
  src\services\dev\adminReviewQueue.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Admin Review Queue consistency checks, `node --check
  src\services\dev\adminReviewQueue.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Admin Safety Controls consistency checks, `node --check
  src\services\dev\adminSafetyControls.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- After hardening Admin Character and Voice Settings list integrity, `node
  --check src\services\dev\adminCharacterVoiceSettings.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After adding Admin Integration Checklist status-summary consistency validation,
  `node --check src\services\dev\adminIntegrationChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After adding Admin Dashboard module-summary count consistency validation,
  `node --check src\services\dev\adminDashboard.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After hardening Admin Dashboard module-summary fixed-label validation,
  `node --check src\services\dev\adminDashboard.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After pinning `/admin/integration-checklist` HTTP output for Priority 2/3 safe
  script catalogs and leak guards, `node --check scripts\run-tests.js` and
  `node scripts\run-tests.js` passed: all 359 tests passed.
- After tightening Gameplay, Persistence, YouTube ingest, and Production/Postgres
  dev report safe-script validators, `node --check` passed for all touched
  services, `node scripts\run-tests.js` passed: all 359 tests passed, and `node
  scripts\run-smoke.js` passed for `dev-basic` with `min_human_likeness_score`
  0.9152.
- After adding memory-vector bridge and roundtrip scripts to Persistence live
  readiness verification scripts, `node --check
  src\services\dev\persistenceLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After adding source-specific, HTTP ingest, and cursor roundtrip scripts to
  YouTube ingest live-readiness verification scripts, `node --check
  src\services\dev\youtubeIngestLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After propagating YouTube source/cursor/http ingest and Persistence
  memory-vector scripts into production live-readiness verification scripts,
  `node --check src\services\dev\productionLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After prioritizing YouTube source/http-ingest/cursor and Persistence
  memory-vector scripts in Admin Operations safe script catalogs, `node --check
  src\services\dev\adminOperationsSummary.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After adding per-check safe script catalogs to Admin Integration Checklist
  items for YouTube Live Chat and Memory Search, `node --check
  src\services\dev\adminIntegrationChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- After rendering Admin Integration Checklist safe script catalogs on the Admin
  Dashboard HTML page, `node --check src\server\adminDashboardPage.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  359 tests passed.
- After hardening Admin Review auth-gate / validator run-plan / dashboard
  preselect behavior, `node scripts\run-tests.js` passed: all 359 tests passed,
  and `node scripts\run-smoke.js` passed for `dev-basic` with
  `min_human_likeness_score` 0.9152.
- After pinning the debug-console Admin Dashboard page link, `node
  scripts\run-tests.js` passed again: all 359 tests passed.
- After adding Admin Review widgets to the read-only Admin Dashboard JSON,
  `node scripts\run-tests.js` passed again: all 359 tests passed.
- After adding Admin Review private-runner fields to production next-task,
  `node scripts\run-tests.js`, `node scripts\run-smoke.js`, and `node
  scripts\dev-production-next-task.js` passed.
- After propagating those Admin Review fields into production probe, `node
  scripts\run-tests.js`, `node scripts\run-smoke.js`, and `node
  scripts\dev-production-probe.js` passed.
- After adding Admin Review checks to production live-readiness scripts, `node
  scripts\run-tests.js`, `node scripts\run-smoke.js`, and `node
  scripts\dev-production-live-readiness.js` passed.
- `node scripts\dev-gameplay-startup-checklist.js` passed.
- `node scripts\dev-production-next-task.js` passed.
- `node scripts\dev-production-probe.js` passed.
- `node scripts\dev-production-live-readiness.js` passed.
- `node scripts\run-tests.js` passed: all 307 tests passed.
- After adding the persistence startup HTTP route and live-readiness startup
  checklist script fields, `node scripts\run-tests.js` passed again: all 307
  tests passed.
- After adding the YouTube relay readiness rehearsal service/HTTP route, `node
  scripts\run-tests.js` passed: all 308 tests passed.
- After adding the vector memory roundtrip service/HTTP route, `node
  scripts\run-tests.js` passed: all 309 tests passed.
- After adding the gameplay validation-gate roundtrip service/HTTP route, `node
  scripts\run-tests.js` passed: all 310 tests passed.
- After strengthening vector roundtrip request-payload leak assertions, `node
  scripts\run-tests.js` passed again: all 310 tests passed.
- After extracting the OBS runtime render roundtrip service and adding direct
  service coverage, `node scripts\run-tests.js` passed: all 311 tests passed.
- After strengthening YouTube relay readiness secret-like value checks, `node
  scripts\run-tests.js` passed again: all 311 tests passed.
- After adding the YouTube relay startup production handoff summary, `node
  scripts\run-tests.js` passed again: all 311 tests passed.
- After adding persistence/gameplay startup production handoff summaries, `node
  scripts\run-tests.js` passed again: all 311 tests passed.
- After adding the YouTube ingest env setup production handoff summary, `node
  scripts\dev-youtube-ingest-env-setup-plan.js` passed and `node
  scripts\run-tests.js` passed again: all 311 tests passed.
- After adding persistence/gameplay env setup production handoff summaries,
  `node scripts\dev-persistence-env-setup-plan.js`, `node
  scripts\dev-gameplay-env-setup-plan.js`, and `node scripts\run-tests.js`
  passed again: all 311 tests passed.
- After adding the foundation env setup production handoff summary, `node
  scripts\dev-foundation-env-setup-plan.js` and `node scripts\run-tests.js`
  passed again: all 311 tests passed.
- `node scripts\dev-production-next-task.js`, `node
  scripts\dev-production-probe.js`, and `node
  scripts\dev-production-live-readiness.js` passed after the env setup handoff
  summary work. Note: `production-next-task` reports configuration-priority
  progression, while `production-live-readiness` still reports Priority 1
  attention until the local bridge worker, engine health, render manifest, and
  OBS pickup gates are actually ready.
- After adding the foundation live-readiness production handoff summary, `node
  scripts\dev-foundation-live-readiness.js` and `node scripts\run-tests.js`
  passed again: all 311 tests passed. The live-readiness summary now marks the
  report as check-only, keeps runtime packets adapter-gated, hides live payloads
  and artifact locations, and exposes only gate booleans plus the next safe
  check script.
- After adding the foundation startup checklist production handoff summary,
  `node scripts\dev-foundation-startup-checklist.js` and `node
  scripts\run-tests.js` passed again: all 311 tests passed. The startup summary
  is checklist-only, does not start real processes, preserves local bridge
  before dev server and worker before OBS pickup ordering, and exposes only
  script names, terminal labels, fixed process ids, env names, and counts.
- After adding the OBS runtime render roundtrip production handoff summary,
  `node scripts\dev-obs-runtime-render-roundtrip.js` and `node
  scripts\run-tests.js` passed again: all 311 tests passed. The roundtrip
  summary now explicitly marks fixture loopback only, no real OBS/TTS/Live2D
  process start, adapter-gated runtime packets, render manifest creation,
  artifact delivery verification, and foundation runtime handoff verification.
- After adding the production next-task handoff summary, `node
  scripts\dev-production-next-task.js`, `node
  scripts\dev-production-live-readiness.js`, and `node scripts\run-tests.js`
  passed again: all 311 tests passed. The next-task summary now explicitly
  marks the report as read-only, no real process start, no live polling, no
  game or OS input, adapter-gated runtime packets, gated memory/relationship
  candidates, and no direct forwarding of input action candidates.
- After adding the production scheduler enablement handoff summary, `node
  scripts\dev-production-scheduler-enablement.js` and `node
  scripts\run-tests.js` passed again: all 311 tests passed. The scheduler
  summary now marks the plan as enablement-only, does not start a scheduler,
  does not poll live sources, does not perform game or OS input, hides YouTube
  support messages, keeps memory/relationship candidates gated, and keeps game
  action proposals behind validation.
- After adding the production readiness runbook handoff summary, `node
  scripts\dev-production-runbook.js` and `node scripts\run-tests.js` passed
  again: all 311 tests passed. The runbook summary now marks the report as
  guidance-only, does not start real processes, does not operate OBS/Live2D/
  VOICEVOX, does not start live polling, does not perform game or OS input,
  keeps adapter packets and candidates gated, and exposes only script names,
  env names, statuses, and counts.
- After adding the production config doctor handoff summary, `node
  scripts\dev-config-doctor.js` and `node scripts\run-tests.js` passed again:
  all 311 tests passed. The config doctor summary now marks the report as
  diagnosis-only, does not start real processes or polling, does not operate
  OBS/Live2D/VOICEVOX, does not perform game or OS input, keeps
  memory/relationship candidates and input action candidates gated, and
  validates recommended command names before publication.
- After adding the production probe handoff summary, `node
  scripts\dev-production-probe.js` and `node scripts\run-tests.js` passed
  again: all 311 tests passed. The probe summary now marks the report as
  read-only, does not start real processes or live polling, does not perform
  game or OS input, keeps runtime packets, memory/relationship candidates, and
  input action candidates gated, and exposes only statuses, counts, stage ids,
  and safe script names for the next operator task.
- After adding the YouTube live-readiness production handoff summary, `node
  scripts\dev-youtube-ingest-live-readiness.js` and `node scripts\run-tests.js`
  passed again: all 311 tests passed. The YouTube live-readiness summary now
  marks the report as read-only, does not start real polling, does not call the
  direct YouTube API or OAuth flow, does not start the scheduler, hides support
  message text, and keeps support, memory, and relationship candidates behind
  validation-gated persistence.
- After adding the persistence live-readiness production handoff summary, `node
  scripts\dev-persistence-live-readiness.js` and `node scripts\run-tests.js`
  passed again: all 311 tests passed. The persistence live-readiness summary now
  marks the report as read-only, performs no store mutation, keeps memory and
  relationship candidates from direct commit, exposes only approved-record
  counts and gate statuses, and keeps relationship profiles, memory summaries,
  and viewer identity values out of public JSON.
- After adding the gameplay live-readiness production handoff summary, `node
  scripts\dev-gameplay-live-readiness.js` and `node scripts\run-tests.js`
  passed again: all 311 tests passed. The gameplay live-readiness summary now
  marks the report as read-only, starts no real capture and no real game or OS
  input, performs no control side effects, keeps input action candidates from
  direct adapter forwarding, does not forward approved actions from the report,
  and exposes only safe counts, statuses, gate ids, and script names.
- After adding the gameplay readiness rehearsal production handoff summary,
  `node --check src\services\dev\gameplayReadinessRehearsal.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-gameplay-readiness-rehearsal.js`,
  and `node scripts\run-tests.js` passed again: all 311 tests passed. The
  gameplay rehearsal summary now marks the report as rehearsal-only, performs
  no capture, adapter handoff, game control, or OS input, keeps input action
  candidates from direct adapter forwarding, keeps approved actions out of the
  rehearsal report handoff, hides raw frames and OCR text, and exposes only safe
  gate counts, adapter counts, statuses, and script names.
- After extending the HTTP production endpoint coverage for YouTube,
  persistence, and gameplay readiness rehearsals, `node --check
  scripts\run-tests.js`, `node scripts\dev-youtube-ingest-readiness-rehearsal.js`,
  `node scripts\dev-persistence-readiness-rehearsal.js`, and `node
  scripts\run-tests.js` passed again: all 311 tests passed. The server endpoint
  tests now assert that rehearsal handoff summaries remain report-only, do not
  start polling or commit side effects, hide support messages and raw gameplay
  data, and keep candidates behind validation boundaries when exposed through
  `/production/*-readiness-rehearsal`.
- After adding the foundation readiness rehearsal production handoff summary,
  `node --check src\services\dev\foundationReadinessRehearsal.js`, `node
  --check scripts\run-tests.js`, `node
  scripts\dev-foundation-readiness-rehearsal.js`, and `node scripts\run-tests.js`
  passed again: all 311 tests passed. The foundation rehearsal summary now marks
  the report as rehearsal-only, starts no bridge, worker, dev server, engine,
  OBS, adapter, fixture post, or file materialization work, uses only dry-run
  production probe data, keeps runtime packets adapter-gated, and exposes only
  safe counts, statuses, gate booleans, and script names through CLI and HTTP
  tests.
- After adding the production loop handoff summary, `node --check
  scripts\dev-production-loop-roundtrip.js`, `node
  scripts\dev-production-loop-roundtrip.js`, and `node scripts\run-tests.js`
  passed again: all 311 tests passed. The production loop summary now marks the
  roundtrip as fixture-only, uses only local fixture OAuth, YouTube, vision, TTS,
  Live2D, bridge, and OBS-health servers, starts no real OBS/Live2D/VOICEVOX
  process and no real game or OS input, keeps runtime packets and candidates
  gated, hides endpoint, secret, YouTube text, and raw-frame values, and exposes
  only stage readiness, bridge/worker/render-manifest counts, and safe next-step
  fields.
- After adding the local bridge worker CLI handoff summary, `node --check
  src\server\localBridgeWorkerCliReport.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed again: all 311 tests passed. A first
  manual `node scripts\dev-bridge-worker.js` picked up local watch mode and was
  stopped by timeout; a follow-up one-shot run with
  `IRIS_LOCAL_BRIDGE_WORKER_WATCH=false` completed and reported only safe
  counts/statuses. The worker CLI handoff summary now marks the command as a
  report/drain helper that starts no real engine process, performs no OBS
  operation, posts no runtime adapter packets, performs no game or OS input,
  hides paths by default, and exposes pending/retry/manifest counts only.
- After adding the bridge status roundtrip handoff summary, `node --check
  scripts\dev-bridge-status-roundtrip.js`, `node
  scripts\dev-bridge-status-roundtrip.js`, and `node scripts\run-tests.js`
  passed again: all 311 tests passed. The bridge status roundtrip summary now
  marks the check as fixture storage/local bridge only, starts no real engine
  process and performs no OBS operation or game/OS input, confirms validated
  adapter packets and complete render manifests are required before OBS pickup,
  and exposes only bridge receive counts, worker processed/failure counts,
  worker readiness states, manifest counts, and OBS handoff readiness status.
- After adding the engine probe production handoff summary and unconfigured
  safety regression, `node --check scripts\dev-engine-probe.js`, `node --check
  scripts\run-tests.js`, `IRIS_DISABLE_ENV_FILE_LOAD=true
  IRIS_LOCAL_TTS_ENGINE_ENDPOINT= IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT= node
  scripts\dev-engine-probe.js`, and `node scripts\run-tests.js` passed again:
  all 312 tests passed. The probe now has a direct-execution `main()` boundary,
  exposes a testable safe unconfigured report, avoids unrelated memory, media,
  topic, YouTube, game control, and game observation adapter configuration
  during engine probing, and reports only required env names, handoff flags,
  counts, statuses, and safe script names. The configured path remains real
  engine / local endpoint work and should only be run when the operator has
  intentionally configured local TTS/Live2D engine endpoints.
- After adding the OBS probe production handoff summary and unconfigured safety
  regression, `node --check scripts\dev-obs-probe.js`, `node --check
  scripts\run-tests.js`, `IRIS_OBS_BRIDGE_ENDPOINT=
  IRIS_OBS_BRIDGE_HEALTH_ENDPOINT= node scripts\dev-obs-probe.js`, and `node
  scripts\run-tests.js` passed again: all 313 tests passed. The OBS probe now
  has a direct-execution boundary, exposes a testable public report wrapper,
  marks the command as report-only, confirms it does not perform real OBS
  operation, engine startup, runtime adapter packet publication, game input, or
  OS input, and keeps endpoint values, secret values, raw payloads, candidates,
  and commands out of the public JSON while preserving required env names and
  safe next-step scripts for operators.
- After splitting the VOICEVOX TTS and Live2D cue bridge startup CLIs behind
  direct-execution `main()` boundaries, `node --check
  scripts\dev-voicevox-tts-engine-bridge.js`, `node --check
  scripts\dev-live2d-cue-engine-bridge.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed again: all 315
  tests passed. The bridge startup reports are now testable without starting
  local servers, include production handoff summaries, state that executing the
  scripts starts only the local bridge server and does not start VOICEVOX,
  Live2D renderer, OBS, game input, OS input, or runtime adapter publication,
  and expose only env names, fixed paths, endpoint scope/status labels, counts,
  and safe next-step scripts.
- After adding YouTube ingest source-status and ingest-once production handoff
  summaries, `node --check scripts\dev-youtube-ingest-source-status.js`, `node
  --check scripts\dev-youtube-ingest-once.js`, `node --check
  scripts\run-tests.js`, a preflight-blocked `node
  scripts\dev-youtube-ingest-source-status.js`, a preflight-blocked `node
  scripts\dev-youtube-ingest-once.js`, and `node scripts\run-tests.js` passed
  again: all 315 tests passed. The source status CLI now has a direct-execution
  boundary and a testable public report wrapper. Both YouTube reports identify
  report-only/preflight-gated behavior, separate source status from manual
  ingest attempts, state that direct YouTube API/OAuth requires operator
  configuration, keep the scheduler stopped unless a manual tick is explicitly
  attempted, keep support messages, platform ids, cursor values, candidates,
  endpoint values, secrets, and raw scheduler results out of public JSON, and
  restate that memory and relationship candidates are never directly committed.
- After adding persistence status and candidate-gate production handoff
  summaries, `node --check scripts\dev-persistence-status-roundtrip.js`, `node
  --check scripts\dev-persistence-candidate-gate-roundtrip.js`, `node
  scripts\dev-persistence-status-roundtrip.js`, `node
  scripts\dev-persistence-candidate-gate-roundtrip.js`, and `node
  scripts\run-tests.js` passed again: all 315 tests passed. The persistence
  status roundtrip now reports that fixture/operator storage is used, fixture
  events are the only runtime input, memory and relationship candidates are not
  directly committed, validated records are the only persistence path, internal
  relationship profiles are not canonical enums, and storage locations, record
  payloads, live text, candidates, endpoints, and secrets stay out of public
  JSON. The candidate-gate roundtrip now carries the same handoff summary while
  preserving counts and statuses for validation, commit, recall, relationship,
  and vector-search readiness.
- After adding gameplay validation-gate and game-control production handoff
  summaries, `node --check src\services\dev\gameplayValidationGateRoundtrip.js`,
  `node --check scripts\dev-game-control-roundtrip.js`, `node
  scripts\dev-gameplay-validation-gate-roundtrip.js`, `node
  scripts\dev-game-control-roundtrip.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed again: all 315 tests passed. The
  validation-gate roundtrip now reports that low-confidence fixture vision is
  blocked before any control adapter request, starts no real screen capture,
  performs no real game or OS input, exposes no raw frames or OCR text, and
  states that input action candidates are never forwarded directly. The
  game-control roundtrip now reports only validated action summaries, confirms
  the local bridge fixture accepts the approved schema in simulated mode, keeps
  side effects disabled, and hides endpoints, secrets, raw candidates, raw
  observation ids, and runtime ids from public JSON.
- After adding the vision/game roundtrip production handoff summary, `node
  --check scripts\dev-vision-game-roundtrip.js`, `node
  scripts\dev-vision-game-roundtrip.js`, and `node scripts\run-tests.js` passed
  again: all 315 tests passed. The roundtrip now remains fixture-only, starts
  no real screen capture, performs no real game or OS input, and reports only
  observation counts, validation status, simulated bridge status, and safe
  next-step script names. It also states that input action candidates are not
  forwarded directly to control adapters, validation is required before any
  adapter handoff, approved actions are summarized only, and raw frames, OCR
  text, observation ids, candidates, approved action payloads, endpoint values,
  and secrets are blocked from the public JSON report.
- After tightening the production loop roundtrip public report, `node --check
  scripts\dev-production-loop-roundtrip.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-production-loop-roundtrip.js`, and
  `node scripts\run-tests.js` passed again: all 315 tests passed. The integrated
  fixture loop still exercises YouTube API/OAuth-style ingest, vision
  observation, safe game control, persistence, local bridge worker output,
  render manifests, artifact delivery, and production live-readiness gates
  without real external services or game/OS input. Relationship telemetry in
  the public JSON is now counts-only: fixture viewer identifiers and
  `linked_identity_id` values are blocked, while relationship level counts and
  interaction count aggregates remain available for readiness checks. Game
  control telemetry in the same report is also summary-only: fixture event ids
  and `last_event_id` are blocked while accepted/simulated status, action kind,
  side-effect status, and received counts remain available.
- After adding the foundation runtime-status production handoff summary, `node
  --check src\services\dev\foundationRuntimeStatus.js`, `node --check
  scripts\dev-foundation-runtime-status.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-foundation-runtime-status.js`, and
  `node scripts\run-tests.js` passed again: all 315 tests passed. The foundation
  runtime status report now carries a counts-only handoff summary for the
  real-TTS/Live2D/OBS foundation path. It explicitly states that the report
  starts no real processes, makes no real engine calls, performs no OBS
  operation, exposes no runtime adapter packets, raw stream state, raw overlay
  events, text payloads, artifact paths, endpoints, secrets, commands, or
  candidates, while preserving readiness booleans, worker queue counts, render
  manifest counts, OBS pickup status, local bridge route counts, and the next
  safe check script.
- After adding the YouTube ingest runtime-status production handoff summary,
  `node --check src\services\dev\youtubeIngestRuntimeStatus.js`, `node --check
  scripts\dev-youtube-ingest-runtime-status.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-youtube-ingest-runtime-status.js`,
  and `node scripts\run-tests.js` passed again: all 315 tests passed. The
  YouTube runtime status report now states that it is report-only and does not
  start live polling, direct YouTube API calls, OAuth flow, or scheduler ticks.
  It keeps support messages, platform cursor values, endpoint values, secrets,
  raw scheduler results, commands, and candidates out of public JSON while
  preserving source kind/status, auth mode label, scheduler state, request and
  event counts, runtime history counts, support candidate gate status, live chat
  ingest flow status, and the next safe check script.
- After adding the persistence runtime-status production handoff summary, `node
  --check src\services\dev\persistenceRuntimeStatus.js`, `node --check
  scripts\dev-persistence-runtime-status.js`, `node --check scripts\run-tests.js`,
  `node scripts\dev-persistence-runtime-status.js`, and `node
  scripts\run-tests.js` passed again: all 315 tests passed. The persistence
  runtime status report now states that it is report-only, has no commit side
  effects, never commits memory or relationship candidates directly, requires
  validation before persistence, treats Phase16+ internal profiles as non-
  canonical, and keeps record payloads, candidate payloads, store paths,
  endpoint values, and secrets out of public JSON while preserving readiness
  statuses, store health, counts, validation/commit counters, and the next safe
  check script.
- After adding the gameplay runtime-status production handoff summary, `node
  --check src\services\dev\gameplayRuntimeStatus.js`, `node --check
  scripts\dev-gameplay-runtime-status.js`, `node --check scripts\run-tests.js`,
  `node scripts\dev-gameplay-runtime-status.js`, and `node scripts\run-tests.js`
  passed again: all 315 tests passed. The gameplay runtime status report now
  states that it is report-only, starts no polling, starts no real capture,
  performs no real game or OS input, and has no control side effects. It also
  restates that input action candidates are never forwarded directly, only
  validated control reaches the adapter, stale/future/low-confidence observations
  block before adapter handoff, and raw frames, OCR text, vision/control
  payloads, endpoint values, and secrets stay out of public JSON while
  preserving counts, flow statuses, adapter counters, and the next safe check
  script.
- After adding the production runtime handoff status aggregate, `node --check
  src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  scripts\dev-production-runtime-handoff-status.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-production-runtime-handoff-status.js`,
  and `node scripts\run-tests.js` passed: all 316 tests passed. The new
  `npm run dev:production:runtime-handoff-status` report aggregates the
  foundation, YouTube ingest, persistence, and gameplay runtime-status handoff
  summaries without embedding child reports. It reports component counts,
  attention/ready status, the next safe runtime check script, and report-only
  handoff guarantees while keeping child payloads, endpoints, secrets, raw
  frames/OCR, candidates, commands, and raw runtime state out of public JSON.
- After wiring the production runtime handoff status into HTTP, `node --check
  src\server\httpServer.js`, `node --check src\server\debugPage.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed again:
  all 316 tests passed. `/production/runtime-handoff-status` now returns the
  same safe aggregate for the debug console and HTTP callers, with child reports
  omitted and endpoint values, secrets, raw runtime state, raw frames/OCR,
  candidates, commands, and live payloads blocked from public JSON.
- After adding the runtime handoff status script to the production live
  readiness verification scripts, `node --check
  src\services\dev\productionLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed again: all 316
  tests passed. The production live readiness report now points operators to
  `npm run dev:production:runtime-handoff-status` alongside next-task and
  per-stage readiness scripts, without exposing endpoints, secrets, candidates,
  raw frames, commands, or live payloads.
- After confirming the production scheduler enablement plan also carries the
  runtime handoff status verification script, `node --check
  src\services\dev\productionSchedulerEnablementPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed again: all 316
  tests passed. The scheduler enablement plan and HTTP surface now point to
  `npm run dev:production:runtime-handoff-status` as a safe operator check while
  still remaining report-only: it starts no live polling, scheduler process,
  real game/OS input, or external service, and does not expose endpoints,
  secrets, support messages, candidates, raw frames, commands, or live payloads.
- After adding the runtime handoff status script to the production next-task
  report and handoff summary, `node --check
  src\services\dev\productionNextTask.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed again: all 316 tests passed. Production
  next-task output now always exposes the safe aggregate check script
  `npm run dev:production:runtime-handoff-status` as a script name only, so an
  operator can return to the four-component runtime handoff status before
  starting live processes. The report remains read-only and still blocks
  endpoints, secrets, live text, memory/relationship records, candidates,
  commands, raw frames, and direct game/OS input.
- After propagating the runtime handoff status script into production probe
  next-task summaries and probe handoff summaries, `node --check
  src\services\dev\productionProbe.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed again: all 316 tests passed. The production
  probe dry-run and HTTP report now expose
  `npm run dev:production:runtime-handoff-status` as a script-name-only
  verification path from the top-level production dashboard flow. The probe
  remains read-only, uses synthetic payloads only for fixture mode, and keeps
  endpoint values, secrets, live payloads, commands, candidates, and raw frames
  out of public JSON.
- After adding the runtime handoff status script to the production readiness
  runbook foundation/production verification list, `node --check
  src\services\dev\productionReadinessRunbook.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed again: all 316
  tests passed. The operator runbook now includes
  `npm run dev:production:runtime-handoff-status` in the script-name-only
  verification plan before real live operation, while the runbook remains
  guidance-only and does not start real TTS/Live2D/OBS processes, live polling,
  persistence commits, or game/OS input.
- After adding the runtime handoff status script to production config doctor
  recommended commands, `node --check
  src\services\dev\productionConfigDoctor.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed again: all 316
  tests passed. The config doctor now recommends
  `npm run dev:production:runtime-handoff-status` with the other production
  readiness commands, and its public handoff summary continues to report only
  counts, labels, safe env names, and script names without exposing endpoint
  values, secrets, payloads, candidates, commands, or direct operation hooks.
- After refining the production runtime handoff component summary, `node
  --check src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-production-runtime-handoff-status.js`,
  and `node scripts\run-tests.js` passed again: all 316 tests passed. Component
  summaries now distinguish real process startup from broader runtime side
  effects with `no_runtime_side_effects_started`, so persistence can truthfully
  report no commit side effects even though it has no real process boundary.
  The aggregate handoff summary also states
  `runtime_side_effects_not_started_by_report` while keeping endpoints,
  secrets, candidates, commands, raw frames/OCR, child reports, and raw runtime
  state out of public JSON.
- After adding component-level `readiness_state` labels to the production
  runtime handoff status report, `node --check
  src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-production-runtime-handoff-status.js`,
  and `node scripts\run-tests.js` passed again: all 316 tests passed. The
  aggregate report now separates `configuration_waiting`, `runtime_waiting`,
  `operator_review_required`, and `ready` with fixed safe labels, reducing the
  chance that implemented-but-unconfigured, runtime-waiting, and real-device-
  waiting states are overreported as complete.
- After adding `readiness_state_counts` to the production runtime handoff report
  and its handoff summary, `node --check
  src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed again: all 316
  tests passed. The aggregate now reports safe counts for ready,
  configuration-waiting, runtime-waiting, and operator-review states, so
  dashboards and external review can see the next deployment class without raw
  child reports, endpoints, secrets, payloads, candidates, or commands.
- After extending the HTTP production runtime handoff test to verify
  `readiness_state_counts`, `node --check src\server\httpServer.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed again:
  all 316 tests passed. The `/production/runtime-handoff-status` endpoint now
  has regression coverage that the public aggregate and handoff summary expose
  matching readiness-state totals while preserving the no-child-report and
  no-endpoint/candidate/command boundaries.
- After adding top-level `next_readiness_state` to the production runtime
  handoff status report and handoff summary, `node --check
  src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed again: all 316
  tests passed. Operators can now see both the next component id and whether
  that component is configuration-waiting, runtime-waiting, or needs operator
  review before any real process, polling, persistence commit, capture, or game
  control is started.
- After adding fixed `readiness_state` labels and `readiness_state_counts` to
  foundation live readiness gates, `node --check
  src\services\dev\foundationLiveReadiness.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-foundation-live-readiness.js`, and
  `node scripts\run-tests.js` passed: all 316 tests passed. The foundation live
  readiness report and handoff summary now distinguish `configuration_waiting`,
  `runtime_waiting`, `real_device_waiting`, `operator_review_required`, and
  `ready` for the runtime, real-engine, OBS, and production-probe gates. The
  report remains read-only and exposes only safe labels, counts, booleans, env
  names, and script names; it still does not start real TTS/Live2D/OBS
  processes, call engines, operate OBS, publish payloads, commit candidates, or
  expose endpoints, secrets, commands, raw jobs, artifact paths, or live text.
- After adding `readiness_state` labels and
  `startup_readiness_state_counts` to the foundation startup checklist, `node
  --check src\services\dev\foundationStartupChecklist.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-foundation-startup-checklist.js`,
  and `node scripts\run-tests.js` passed: all 316 tests passed. The startup
  checklist now separates missing configuration from operator/runtime startup
  work by reporting `configuration_waiting` for steps blocked by env review and
  `real_device_waiting` for configured steps that still require an operator to
  start local bridge, worker, dev server, VOICEVOX/Live2D bridge, or OBS setup
  scripts. The checklist remains read-only and exposes only safe labels,
  counts, terminal labels, env names, and script names; it does not start real
  TTS/Live2D/OBS processes, run setup, call engines, operate OBS, publish
  payloads, or expose endpoints, secrets, commands, candidates, paths, or live
  text.
- After propagating the foundation operator startup readiness summary into
  production next-task gates, `node --check
  src\services\dev\productionNextTask.js`, `node --check
  src\services\dev\productionProbe.js`, `node --check scripts\run-tests.js`,
  `node scripts\dev-production-next-task.js`, and `node scripts\run-tests.js`
  passed: all 316 tests passed. The production next-task report now carries
  `next_readiness_state` and `startup_readiness_state_counts` inside the
  foundation `operator_startup_summary`, so upper-level handoff views can see
  that the foundation may be configured but still `real_device_waiting` before
  real local processes are started. The summary remains counts/labels/script
  names only and does not start processes, call engines, operate OBS, poll live
  YouTube, commit candidates, or expose endpoints, secrets, payloads, commands,
  raw frames, or live text.
- After adding fixed readiness labels to the YouTube relay startup checklist,
  `node --check src\services\dev\youtubeRelayStartupChecklist.js`, `node
  --check scripts\run-tests.js`, `node scripts\dev-youtube-relay-startup-
  checklist.js`, and `node scripts\run-tests.js` passed: all 316 tests passed.
  The YouTube local relay startup checklist now reports
  `next_readiness_state` and `startup_readiness_state_counts` with
  `real_device_waiting` for the local relay bridge/rehearsal steps and
  `operator_review_required` for read-only review steps. The checklist remains
  local-relay/rehearsal-only and does not call the direct YouTube API, start an
  OAuth flow, require a real API key, poll live chat/support messages, publish
  payloads, commit candidates, or expose endpoints, secrets, commands, live
  text, support messages, or candidate data.
- After adding YouTube ingest runtime/live readiness labels, `node --check
  src\services\dev\youtubeIngestRuntimeStatus.js`, `node --check
  src\services\dev\youtubeIngestLiveReadiness.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-youtube-ingest-runtime-status.js`,
  `node scripts\dev-youtube-ingest-live-readiness.js`, and `node
  scripts\run-tests.js` passed: all 316 tests passed. The YouTube runtime
  report now exposes fixed `readiness_state` labels per safe flow plus
  `next_readiness_state` and `readiness_state_counts` in the report and
  production handoff summary. The live readiness report now exposes the same
  next/count summary for source, access/OAuth, scheduler, runtime-ingest, and
  support-pipeline gates. The labels distinguish configuration, OAuth,
  scheduler, real-API, runtime, and operator-review waiting states while keeping
  the reports read-only; no real YouTube API call, OAuth flow, scheduler tick,
  live polling, support-message exposure, candidate commit, command dispatch,
  endpoint value, secret value, platform cursor, or raw payload is exposed.
- After propagating child runtime readiness states into production runtime
  handoff, `node --check
  src\services\dev\productionRuntimeHandoffStatus.js`, `node
  scripts\dev-production-runtime-handoff-status.js`, and `node
  scripts\run-tests.js` passed: all 316 tests passed. The production runtime
  handoff component summary now accepts and forwards safe child
  `next_readiness_state` labels, including YouTube-specific OAuth, scheduler,
  and real-API waiting labels when present, while preserving the no-child-report
  boundary. The aggregate still exposes only fixed labels, counts, component
  ids, safe runtime labels, and script names; it does not expose endpoint
  values, secrets, live payloads, candidates, commands, raw frames, OCR text, or
  raw child reports.
- After adding fixed readiness labels to persistence runtime and live readiness
  reports, `node --check src\services\dev\persistenceRuntimeStatus.js`, `node
  --check src\services\dev\persistenceLiveReadiness.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-persistence-runtime-status.js`,
  `node scripts\dev-persistence-live-readiness.js`, and `node
  scripts\run-tests.js` passed: all 316 tests passed. The persistence runtime
  report now exposes per-flow `readiness_state`, top-level
  `next_readiness_state`, and `readiness_state_counts`, and mirrors them into
  the production handoff summary. The persistence live readiness report now
  exposes per-gate `readiness_state`, top-level `next_readiness_state`, and
  `readiness_state_counts`, and mirrors them into its production handoff
  summary. Labels distinguish configuration, runtime, operator-review, and
  ready states while preserving the candidate validation boundary: memory and
  relationship candidates are not committed by these reports, approved records
  remain the only commit surface, internal profiles remain non-canonical, and
  the reports expose only fixed labels, counts, booleans, env names, and script
  names. No real store mutation, real YouTube/API call, OAuth flow, OBS/Live2D/
  VOICEVOX operation, game/OS input, endpoint value, secret value, candidate
  payload, approved record payload, memory summary, relationship score, raw
  frame, command, or raw runtime state is exposed or executed.
- After adding fixed readiness labels to production probe stages and checks,
  `node --check src\services\dev\productionProbe.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-production-probe.js`, and `node
  scripts\run-tests.js` passed: all 316 tests passed. The production probe now
  exposes `readiness_state`, `next_readiness_state`, and
  `readiness_state_counts` across checks, stages, report summary, and
  production handoff summary. This lets the top-level probe distinguish
  configured-but-real-device-waiting TTS/Live2D/OBS health from missing
  configuration, runtime waiting, and operator review without exposing endpoint
  values, secrets, payloads, candidates, commands, raw frames, raw bridge jobs,
  or child reports. The probe remains dry-run/fixture-only and does not start
  real processes, poll live YouTube, operate OBS/Live2D/VOICEVOX, mutate stores,
  commit memory or relationship candidates, or send game/OS input.
- After propagating fixed readiness labels into production next-task gates,
  `node --check src\services\dev\productionNextTask.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-production-next-task.js`, and `node
  scripts\run-tests.js` passed: all 316 tests passed. The production next-task
  report now exposes each priority gate `readiness_state`, plus top-level and
  production handoff `next_readiness_state` and `readiness_state_counts`. The
  next-readiness label follows the next actionable priority gate, while the
  counts still show already-configured foundation work that is waiting for real
  local TTS/Live2D/OBS processes. The report remains read-only and exposes only
  fixed labels, counts, booleans, env names, and script names; it does not start
  real processes, poll live YouTube, operate OBS/Live2D/VOICEVOX, mutate stores,
  commit memory or relationship candidates, forward input action candidates, or
  expose endpoints, secrets, live text, support messages, payloads, commands,
  raw frames, raw bridge jobs, or child reports.
- After extending the HTTP production next-task test coverage for those fixed
  readiness labels, `node --check scripts\run-tests.js` and `node
  scripts\run-tests.js` passed: all 316 tests passed. The `/production/next-
  task` development endpoint is now covered for top-level
  `next_readiness_state`, `readiness_state_counts`, handoff readiness mirroring,
  and per-gate `readiness_state` while preserving the same read-only HTTP
  boundary. No real HTTP adapter targets, OBS/Live2D/VOICEVOX processes,
  YouTube polling, OAuth flow, memory/relationship commits, game/OS input,
  endpoint values, secrets, payloads, candidates, commands, live text, support
  messages, or raw frames are exposed or executed by the test.
- After adding fixed readiness labels to the integration probe, `node --check
  src\services\dev\integrationProbe.js`, `node --check scripts\run-tests.js`,
  `node scripts\dev-integration-probe.js`, and `node scripts\run-tests.js`
  passed: all 316 tests passed. The integration probe now exposes
  `readiness_state` for each TTS/Live2D/subtitle bridge probe and the local
  engine worker probe, plus report-level `next_readiness_state` and
  `readiness_state_counts`. Labels distinguish missing configuration,
  fixture/runtime waiting, real local engine/worker startup waiting, operator
  review, and ready fixture-post results without exposing endpoint values,
  secrets, synthetic adapter packets, raw jobs, raw artifacts, candidates,
  commands, live payloads, or text payloads. Dry-run remains read-only, and
  fixture-post sends only synthetic adapter packets to explicitly configured
  local targets.
- After connecting integration-probe readiness into the local readiness report
  and preflight summary, `node --check src\services\dev\readinessReport.js`,
  `node --check scripts\run-tests.js`, `node --check scripts\run-preflight.js`,
  `node scripts\run-preflight.js`, and `node scripts\run-tests.js` passed: all
  316 tests passed. The local readiness report now exposes safe gate-level
  `readiness_state`, top-level `next_readiness_state` and
  `readiness_state_counts`, plus an optional counts-and-labels-only integration
  probe readiness summary. `run-preflight` now prints those safe labels/counts
  so a resumed development session can distinguish local-dev ready boundaries
  from operator configuration or real-device startup waiting. The summary does
  not expose endpoint values, secrets, payloads, commands, candidates, raw
  frames, raw jobs, or live text, and it does not start real OBS/Live2D/
  VOICEVOX processes, poll YouTube, mutate stores, commit candidates, or send
  game/OS input.
- After wiring the HTTP `/readiness` endpoint to include a dry-run
  integration-probe readiness summary, `node --check src\server\httpServer.js`,
  `node --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed:
  all 316 tests passed. The endpoint now calls the integration probe in dry-run
  mode with real fetch disabled, so it can expose counts-and-labels-only
  `integration_probe_readiness_summary`, `next_readiness_state`, and
  `readiness_state_counts` without probing real OBS/Live2D/VOICEVOX processes
  or external targets. The HTTP test verifies those labels while preserving the
  no endpoint values, no secrets, no payloads, no candidates, no commands, no
  raw frames, and no live text boundaries.
- After surfacing the safe readiness labels in the debug console, `node
  --check src\server\debugPage.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 316 tests passed. `/debug` now shows
  the local readiness status, next fixed readiness label, readiness-state
  counts, and dry-run integration-probe next label from `/readiness` so manual
  operator checks can distinguish configuration waiting, runtime waiting,
  real-device startup waiting, operator review, and ready states without
  opening raw JSON first. The display uses only labels and counts; it does not
  expose endpoint values, secrets, payloads, YouTube text, support messages,
  candidates, commands, raw frames, raw bridge jobs, or live text, and it does
  not start real OBS/Live2D/VOICEVOX processes, poll YouTube, mutate stores,
  commit candidates, forward input action candidates, or send game/OS input.
- After adding fixed readiness labels to the foundation runtime status report,
  `node --check src\services\dev\foundationRuntimeStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `/production/foundation-runtime-status` now exposes
  `next_readiness_state` and `readiness_state_counts`, mirrored into its
  production handoff summary, so the TTS/Live2D/OBS runtime handoff can be
  compared directly with the broader production readiness reports. The labels
  distinguish configuration waiting, runtime waiting, real-device startup
  waiting, operator review, and ready states using only fixed labels and
  counts. The report remains read-only and does not expose endpoint values,
  secrets, payloads, YouTube text, support messages, candidates, commands, raw
  frames, raw bridge jobs, artifact paths, or live text; it also does not start
  real OBS/Live2D/VOICEVOX processes, poll YouTube, mutate stores, commit
  candidates, forward input action candidates, or send game/OS input.
- After adding fixed readiness labels to the foundation status report, `node
  --check src\services\dev\foundationStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `/production/foundation-status` now exposes
  `next_readiness_state` and `readiness_state_counts`, mirrored from its
  foundation summary, so the initial TTS/Live2D/OBS configuration status can be
  compared with foundation runtime, live readiness, production probe, and
  production next-task reports using the same fixed readiness vocabulary. The
  labels distinguish configuration waiting, real-device startup waiting,
  operator review, and ready states using only counts and fixed labels. The
  report remains read-only and does not expose endpoint values, secrets,
  payloads, YouTube text, support messages, candidates, commands, raw frames,
  raw bridge jobs, artifact paths, or live text; it also does not start real
  OBS/Live2D/VOICEVOX processes, poll YouTube, mutate stores, commit
  candidates, forward input action candidates, or send game/OS input.
- After adding fixed readiness labels to the foundation preflight report, `node
  --check src\services\dev\foundationPreflight.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `/production/foundation-preflight` now exposes
  `next_readiness_state`, `readiness_state_counts`, next-step
  `readiness_state`, launch-step `readiness_state`, and per-integration
  `readiness_state` labels while mirroring the safe foundation-status readiness
  summary. This makes the first TTS/Live2D/OBS operator check comparable with
  foundation status, runtime status, live readiness, production probe, and
  production next-task reports using the same fixed readiness vocabulary. The
  report remains read-only and exposes only fixed labels, counts, booleans, env
  names, and script names; it does not expose endpoint values, secrets,
  payloads, YouTube text, support messages, candidates, commands, raw frames,
  raw bridge jobs, artifact paths, or live text, and it does not start real
  OBS/Live2D/VOICEVOX processes, poll YouTube, mutate stores, commit
  candidates, forward input action candidates, or send game/OS input.
- After adding fixed readiness labels to the foundation launch plan, `node
  --check src\services\dev\foundationLaunchPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `/production/foundation-launch-plan` now exposes
  `next_readiness_state`, `readiness_state_counts`, per-launch-step
  `readiness_state`, operator-startup `next_readiness_state`, startup
  readiness counts, and per-startup-step `readiness_state` labels. This keeps
  the TTS/Live2D/OBS handoff path consistent from preflight through launch
  guidance, runtime status, live readiness, production probe, and production
  next-task reports. The launch plan remains operator guidance only and exposes
  only fixed labels, counts, booleans, env names, and script names; it does not
  expose endpoint values, secrets, payloads, YouTube text, support messages,
  candidates, commands, raw frames, raw bridge jobs, artifact paths, or live
  text, and it does not start real OBS/Live2D/VOICEVOX processes, poll YouTube,
  mutate stores, commit candidates, forward input action candidates, or send
  game/OS input.
- After aligning fixed readiness labels in the YouTube ingest preflight report,
  `node --check src\services\dev\youtubeIngestPreflight.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `/production/youtube-preflight` now exposes
  `next_readiness_state`, `readiness_state_counts`,
  `ingest_stage_summary.readiness_state`, and per-integration
  `readiness_state` labels using the same readiness vocabulary as the
  production foundation, runtime, probe, and next-task reports. The labels
  distinguish ready, configuration waiting, runtime waiting, real-device
  waiting, and operator review without adding OAuth-specific public states or
  leaking live YouTube content. The report remains read-only and exposes only
  fixed labels, counts, booleans, env names, and script names; it does not
  expose endpoint values, secrets, payloads, YouTube text, support messages,
  candidates, commands, raw frames, raw bridge jobs, artifact paths, or live
  text, and it does not poll YouTube, mutate stores, commit candidates, forward
  input action candidates, or send game/OS input.
- After normalizing YouTube runtime and live readiness labels, `node --check
  src\services\dev\youtubeIngestRuntimeStatus.js`, `node --check
  src\services\dev\youtubeIngestLiveReadiness.js`, `node --check
  src\services\dev\productionRuntimeHandoffStatus.js`, and `node
  scripts\run-tests.js` passed: all 316 tests passed. The YouTube runtime,
  YouTube live-readiness, and production runtime-handoff reports now use the
  shared production readiness vocabulary: ready, configuration waiting, runtime
  waiting, real-device waiting, and operator review. OAuth, scheduler, and real
  API distinctions remain represented by internal blocking-stage labels, but
  the public readiness counts no longer introduce extra canonical states. These
  reports remain counts-and-labels-only; they do not expose endpoint values,
  secrets, payloads, YouTube text, support messages, candidates, commands, raw
  frames, raw bridge jobs, artifact paths, or live text, and they do not poll
  YouTube, mutate stores, commit candidates, forward input action candidates, or
  send game/OS input.
- After adding fixed readiness labels to the YouTube ingest launch plan, `node
  --check src\services\dev\youtubeIngestLaunchPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `/production/youtube-launch-plan` now exposes
  `next_readiness_state`, `readiness_state_counts`, per-launch-step
  `readiness_state`, stage `readiness_state`, and per-integration
  `readiness_state` labels using the shared production vocabulary. The plan
  remains operator guidance only and exposes fixed labels, counts, booleans,
  env names, and script names; it does not expose endpoint values, secrets,
  payloads, YouTube text, support messages, candidates, commands, raw frames,
  raw bridge jobs, artifact paths, or live text, and it does not poll YouTube,
  mutate stores, commit candidates, forward input action candidates, or send
  game/OS input.
- After adding fixed readiness labels to the YouTube ingest env setup plan,
  `node --check src\services\dev\youtubeIngestEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `/production/youtube-env-setup-plan` now exposes
  `next_readiness_state`, `readiness_state_counts`, per-env-group
  `readiness_state`, and mirrored production handoff readiness labels using the
  shared production vocabulary. This keeps YouTube source selection, chat
  target, credential, cursor, and scheduler setup comparable with the
  preflight, launch, runtime, live-readiness, production probe, and
  production-next-task reports. The setup plan remains read-only and exposes
  fixed labels, counts, booleans, env names, script names, and guidance labels
  only; it does not expose endpoint values, secrets, payloads, YouTube text,
  support messages, candidates, commands, raw frames, raw bridge jobs, artifact
  paths, or live text, and it does not poll YouTube, mutate stores, commit
  candidates, forward input action candidates, or send game/OS input.
- After adding fixed readiness labels to the persistence preflight report,
  `node --check src\services\dev\persistencePreflight.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `/production/persistence-preflight` now exposes
  `next_readiness_state`, `readiness_state_counts`,
  `persistence_stage_summary.readiness_state`, and per-integration
  `readiness_state` labels using the shared production vocabulary. This makes
  candidate persistence, relationship memory, and vector-memory setup
  comparable with the runtime and live-readiness reports while preserving the
  rule that memory and relationship candidates are never directly committed.
  The report remains read-only and exposes fixed labels, counts, booleans, env
  names, and script names only; it does not expose store paths, endpoint values,
  secrets, payloads, memory records, relationship records, candidates, commands,
  raw frames, raw bridge jobs, artifact paths, or live text, and it does not
  mutate stores, commit candidates, forward input action candidates, or send
  game/OS input.
- After adding fixed readiness labels to the persistence launch plan, `node
  --check src\services\dev\persistenceLaunchPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `/production/persistence-launch-plan` now exposes
  `next_readiness_state`, `readiness_state_counts`, per-launch-step
  `readiness_state`, stage `readiness_state`, and per-integration
  `readiness_state` labels using the shared production vocabulary. This keeps
  JSON memory and relationship store setup, candidate/relationship flags,
  vector-memory search, and persistence verification comparable with the
  persistence preflight, runtime, live-readiness, production probe, and
  production-next-task reports. The plan remains operator guidance only and
  exposes fixed labels, counts, booleans, env names, and script names; it does
  not expose store paths, endpoint values, secrets, payloads, memory records,
  relationship records, candidates, commands, raw frames, raw bridge jobs,
  artifact paths, or live text, and it does not mutate stores, commit
  candidates, forward input action candidates, or send game/OS input.
- After adding fixed readiness labels to persistence env setup and startup
  checklist reports, `node --check
  src\services\dev\persistenceEnvSetupPlan.js`, `node --check
  src\services\dev\persistenceStartupChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `/production/persistence-env-setup-plan` now exposes
  `next_readiness_state`, `readiness_state_counts`, per-env-group
  `readiness_state`, and mirrored handoff readiness counts. The persistence
  startup checklist now exposes `next_readiness_state`,
  `startup_readiness_state_counts`, per-step `readiness_state`, and mirrored
  handoff readiness counts. Both reports remain read-only and expose fixed
  labels, counts, booleans, env names, script names, and guidance labels only;
  they do not expose store paths, endpoint values, secrets, payloads, memory
  records, relationship records, memory summaries, relationship scores,
  candidates, commands, raw frames, raw bridge jobs, artifact paths, or live
  text, and they do not mutate stores, commit candidates, forward input action
  candidates, or send game/OS input.
- After adding fixed readiness labels to gameplay preflight, launch, env setup,
  and startup checklist reports, `node --check
  src\services\dev\gameplayPreflight.js`, `node --check
  src\services\dev\gameplayLaunchPlan.js`, `node --check
  src\services\dev\gameplayEnvSetupPlan.js`, `node --check
  src\services\dev\gameplayStartupChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `/production/gameplay-preflight`,
  `/production/gameplay-launch-plan`, `/production/gameplay-env-setup-plan`,
  and `/production/gameplay-startup-checklist` now expose shared production
  readiness labels such as `next_readiness_state`, readiness state counts,
  and per-stage, per-integration, per-step, or per-env-group
  `readiness_state` where applicable. These reports remain read-only and
  expose fixed labels, counts, booleans, env names, script names, and guidance
  labels only; they do not expose endpoint values, secrets, payloads, raw
  frames, raw OCR text, vision payloads, input action candidates, approved
  actions, commands, memory or relationship candidates, raw bridge jobs,
  artifact paths, or live text, and they do not poll real game sources, mutate
  stores, commit candidates, forward input action candidates, or send game/OS
  input.
- After adding fixed readiness labels to gameplay runtime status and live
  readiness reports, `node --check
  src\services\dev\gameplayRuntimeStatus.js`, `node --check
  src\services\dev\gameplayLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `/production/gameplay-runtime-status` now exposes
  `next_readiness_state`, `readiness_state_counts`, and per-flow
  `readiness_state` labels for vision capture, safe-control, action-gate,
  lifecycle, and vision-to-action flow summaries. `/production/gameplay-live-
  readiness` now exposes `next_readiness_state`, `readiness_state_counts`,
  env setup readiness summary fields, per-gate `readiness_state`, and mirrored
  handoff readiness labels. These reports remain read-only and expose fixed
  labels, counts, booleans, env names, script names, and policy flags only;
  they do not expose endpoint values, secrets, live payloads, raw frames, raw
  OCR text, vision payloads, input action candidates, approved actions,
  commands, raw stream state, raw scheduler results, memory or relationship
  candidates, raw bridge jobs, artifact paths, or live text, and they do not
  poll real game sources, mutate stores, commit candidates, forward input
  action candidates, or send game/OS input.
- After adding fixed readiness labels to the gameplay readiness rehearsal,
  `node --check src\services\dev\gameplayReadinessRehearsal.js`, `node --check
  src\services\dev\gameplayLiveReadiness.js`, and `node scripts\run-tests.js`
  passed: all 316 tests passed. `/production/gameplay-readiness-rehearsal`
  now exposes `next_readiness_state`, `readiness_state_counts`, runtime-flow
  readiness labels, gate readiness labels, and mirrored handoff readiness
  labels. The rehearsal remains read-only and exposes fixed labels, counts,
  booleans, env names, script names, and policy flags only; it does not expose
  endpoint values, secrets, live payloads, raw frames, raw OCR text, vision
  payloads, input action candidates, approved actions, commands, raw stream
  state, raw scheduler results, memory or relationship candidates, raw bridge
  jobs, artifact paths, or live text, and it does not capture real screens,
  mutate stores, commit candidates, forward input action candidates, or send
  game/OS input.
- After wiring gameplay preflight readiness into the production next-task gate,
  `node --check src\services\dev\productionNextTask.js`, `node --check
  src\services\dev\gameplayReadinessRehearsal.js`, `node --check
  src\services\dev\gameplayLiveReadiness.js`, and `node scripts\run-tests.js`
  passed: all 316 tests passed. The priority-4 gameplay gate now prefers the
  gameplay preflight `next_readiness_state` when it is part of the shared
  readiness vocabulary, so production next-task ordering can distinguish
  configuration waiting from operator-review attention without inventing a new
  public enum. The production next-task report remains read-only and exposes
  fixed labels, counts, booleans, env names, script names, and policy flags
  only; it does not expose endpoint values, secrets, live payloads, raw frames,
  raw OCR text, vision payloads, input action candidates, approved actions,
  commands, raw bridge jobs, artifact paths, or live text, and it does not
  capture real screens, mutate stores, commit candidates, forward input action
  candidates, or send game/OS input.
- After adding HTTP regression checks for gameplay readiness labels, `node
  --check scripts\run-tests.js`, `node --check
  src\services\dev\gameplayRuntimeStatus.js`, `node --check
  src\services\dev\gameplayLiveReadiness.js`, and `node scripts\run-tests.js`
  passed: all 316 tests passed. The HTTP coverage now asserts gameplay runtime
  `next_readiness_state` and readiness counts, per-flow readiness states,
  gameplay live readiness next/gate/env readiness labels, and gameplay
  rehearsal next/runtime/gate readiness labels. This locks the shared
  production readiness vocabulary into the public HTTP surfaces while keeping
  reports summary-only and side-effect-free.
- After mirroring gameplay runtime readiness into its production handoff
  summary, `node --check src\services\dev\gameplayRuntimeStatus.js`, `node
  --check src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `/production/gameplay-runtime-status` now mirrors
  `next_readiness_state` and `readiness_state_counts` into
  `production_handoff_summary`, and the production runtime handoff aggregate
  test now verifies the gameplay component as `operator_review_required` when
  gameplay preflight is blocked by operator-review safety attention. This keeps
  runtime handoff aggregation aligned with the child report instead of
  re-inferring gameplay readiness from coarse runtime status text.
- After adding fixed readiness labels to the foundation readiness rehearsal,
  `node --check src\services\dev\foundationReadinessRehearsal.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  316 tests passed. `/production/foundation-readiness-rehearsal` now exposes
  `next_readiness_state`, `readiness_state_counts`, and mirrored handoff
  readiness labels using the shared production vocabulary. This makes the
  real TTS / Live2D / OBS rehearsal comparable with foundation runtime,
  foundation live readiness, production probe, and production-next-task
  reports while staying read-only. The rehearsal does not start bridge
  processes, call TTS or Live2D engines, update OBS, post runtime adapters,
  materialize local env files, expose endpoints, secrets, payloads, live text,
  artifact paths, raw jobs, raw packets, candidates, commands, or send
  game/OS input.
- After preserving priority-gate readiness labels inside the production probe
  next-task summary, `node --check src\services\dev\productionProbe.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  316 tests passed. `production_probe.next_task_summary.gates[]` now carries
  each gate's shared `readiness_state`, so the probe no longer drops the
  distinction between configuration waiting, runtime waiting, real-device
  waiting, operator review, and ready while summarizing the next production
  task. The field is still a fixed label only and does not expose endpoints,
  secrets, payloads, candidates, commands, raw frames, or live text.
- After adding fixed readiness labels and a handoff summary to the foundation
  local env readiness rehearsal, `node --check
  src\services\dev\foundationLocalEnvReadinessRehearsal.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `createFoundationLocalEnvReadinessRehearsal` now exposes
  `next_readiness_state`, `readiness_state_counts`, and
  `production_handoff_summary` readiness labels so the operator can distinguish
  template materialization/configuration waiting from real-device/process
  startup waiting before touching VOICEVOX, Live2D, OBS, or local bridge
  processes. The rehearsal remains read-only: it does not materialize local env
  files, start processes, call TTS or Live2D engines, update OBS, expose env
  values, endpoints, secrets, payloads, candidates, commands, artifact paths,
  or send game/OS input.
- After adding fixed readiness labels to the foundation env setup plan, `node
  --check src\services\dev\foundationEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `createFoundationEnvSetupPlan` now exposes `next_readiness_state`,
  `readiness_state_counts`, per-env-group `readiness_state`, and mirrored
  handoff readiness counts. This keeps runtime HTTP adapter setup, local
  bridge storage, real TTS/Live2D engine setup, worker setup, dev server setup,
  and OBS overlay setup comparable with the foundation status, preflight,
  startup checklist, local-env rehearsal, live readiness, and production probe
  reports. The plan remains read-only and exposes env names, script names,
  fixed labels, counts, and booleans only; it does not expose endpoint values,
  secrets, payloads, candidates, commands, artifact paths, or operate real TTS,
  Live2D, OBS, bridge, game, or OS inputs.
- After adding fixed readiness labels and a production handoff summary to the
  foundation connector handoff, `node --check
  src\services\dev\foundationConnectorHandoff.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `createFoundationConnectorHandoff` now exposes
  `next_readiness_state`, `readiness_state_counts`, per-connector
  `readiness_state`, and a mirrored production handoff summary. This keeps
  runtime adapters, local bridge, worker, real TTS/Live2D engines, OBS browser
  source, and optional OBS setup bridge decisions comparable with foundation
  env setup, local-env rehearsal, production next-task, and production probe
  reports. The handoff remains read-only and exposes only env names, script
  names, schema names, route paths, fixed labels, counts, and booleans; it
  does not expose endpoints, secrets, payloads, raw packets, job payloads,
  candidates, commands, or start real processes.
- After adding fixed readiness labels to the production config doctor, `node
  --check src\services\dev\productionConfigDoctor.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `createProductionConfigDoctor` now exposes `next_readiness_state`,
  `readiness_state_counts`, per-check `readiness_state`, and mirrored handoff
  readiness labels. Configuration gaps remain `configuration_waiting`, unsafe
  local endpoint policy or unsupported operator choices become
  `operator_review_required`, and fully configured doctor checks remain
  `ready`. The doctor remains read-only and exposes env names, script names,
  fixed labels, counts, endpoint scope classes, and booleans only; it does not
  expose endpoint values, secrets, OAuth tokens, YouTube text, support
  messages, candidates, commands, raw frames, paths, payloads, or start real
  TTS, Live2D, OBS, bridge, game, or OS operations.
- After propagating fixed readiness labels through the production readiness
  runbook, `node --check src\services\dev\productionReadinessRunbook.js`,
  `node --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed:
  all 316 tests passed. `createProductionReadinessRunbook` now exposes
  `next_readiness_state`, `readiness_state_counts`, per-stage
  `readiness_state`, per-stage readiness counts, per-integration readiness
  labels, verification stage readiness labels, and mirrored handoff readiness
  labels. The runbook now preserves the config doctor's distinction between
  `configuration_waiting`, `operator_review_required`, and `ready` while
  grouping checks by production priority. The runbook remains read-only and
  exposes env names, script names, fixed labels, counts, stage ids, priorities,
  and booleans only; it does not expose endpoint values, secrets, OAuth tokens,
  YouTube text, support messages, candidates, commands, raw frames, paths,
  payloads, or start real TTS, Live2D, OBS, bridge, game, or OS operations.
- After adding fixed readiness labels to the production scheduler enablement
  plan, `node --check
  src\services\dev\productionSchedulerEnablementPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `createProductionSchedulerEnablementPlan` now exposes
  `next_readiness_state`, `readiness_state_counts`, per-stage
  `readiness_state`, and mirrored handoff readiness labels. Scheduler env
  review stays `configuration_waiting`, missing scheduler/runtime availability
  stays `runtime_waiting`, operator scheduler-start waiting becomes
  `real_device_waiting`, and ready scheduler stages remain `ready`. The plan
  remains read-only and exposes env names, script names, fixed labels, counts,
  stage ids, priorities, and booleans only; it does not expose endpoint values,
  secrets, OAuth tokens, YouTube text, support messages, candidates, commands,
  raw frames, paths, payloads, or start live polling, real scheduler, game, or
  OS operations.
- After adding HTTP regression coverage for the new production readiness
  labels, `node --check scripts\run-tests.js` and `node scripts\run-tests.js`
  passed: all 316 tests passed. `/production/config-doctor`,
  `/production/readiness-runbook`, and `/production/scheduler-enablement` now
  have tests that verify `next_readiness_state`, `readiness_state_counts`, and
  mirrored production handoff readiness labels survive the HTTP wrapper. The
  HTTP responses remain read-only and do not expose endpoint values, secrets,
  YouTube text, support messages, input action candidates, approved actions,
  commands, raw frames, paths, payloads, or start live polling, real scheduler,
  TTS, Live2D, OBS, game, or OS operations.
- After tightening the foundation readiness rehearsal handoff mirror, `node
  --check src\services\dev\foundationReadinessRehearsal.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `createFoundationReadinessRehearsal` now computes rehearsal
  readiness counts once and mirrors the exact same counts into
  `production_handoff_summary`; the safety assertion rejects handoff summaries
  whose `readiness_state_counts` drift from the top-level report. This keeps the
  priority-1 live-readiness rehearsal from under-reporting runtime waiting
  states during production handoff. The rehearsal remains read-only and does
  not materialize env files, expose endpoints, secrets, payloads, YouTube text,
  support messages, candidates, commands, raw frames, artifact paths, or start
  real TTS, Live2D, OBS, bridge, game, or OS operations.
- After tightening the foundation local-env readiness rehearsal handoff mirror,
  `node --check src\services\dev\foundationLocalEnvReadinessRehearsal.js`,
  `node --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed:
  all 316 tests passed. The local-env rehearsal safety assertion now rejects
  `production_handoff_summary.readiness_state_counts` when it drifts from the
  top-level rehearsal counts, and tests cover both rendered-template and
  existing-local-env paths. The rehearsal remains read-only and does not write
  `.env.local`, expose env values, endpoints, secrets, payloads, candidates,
  commands, raw frames, artifact paths, or start real TTS, Live2D, OBS, bridge,
  game, or OS operations.
- After tightening the foundation startup checklist handoff mirror, `node
  --check src\services\dev\foundationStartupChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `createFoundationStartupChecklist` now computes startup readiness
  counts once and mirrors them into `production_handoff_summary`; the safety
  assertion rejects drift in next startup step, next scripts,
  `next_readiness_state`, or startup readiness counts. This keeps configured
  but not-yet-started foundation processes clearly labeled as
  `real_device_waiting` while missing setup remains `configuration_waiting`.
  The checklist remains read-only and exposes only script names, env names,
  terminal labels, counts, and fixed labels; it does not expose endpoints,
  secrets, payloads, candidates, commands, raw frames, artifact paths, or start
  real TTS, Live2D, OBS, bridge, game, or OS operations.
- After adding fixed readiness labels to the production live-readiness
  aggregate, `node --check src\services\dev\productionLiveReadiness.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  316 tests passed. `createProductionLiveReadinessReport` now exposes
  `next_readiness_state`, `readiness_state_counts`, per-stage
  `readiness_state`, per-stage readiness counts, per-gate readiness labels, and
  mirrored handoff readiness labels. The aggregate now distinguishes the
  current fixture state as foundation-first `configuration_waiting` while also
  preserving the gameplay `operator_review_required` bucket instead of
  flattening all attention into one label. The report remains read-only and
  exposes only fixed statuses, booleans, counts, script names, and env names; it
  does not expose endpoints, secrets, OAuth tokens, YouTube text, support
  messages, candidates, commands, raw frames, payloads, artifact paths, or start
  polling, real TTS, Live2D, OBS, bridge, game, or OS operations.
- After tightening the production runtime handoff status mirror, `node --check
  src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertProductionRuntimeHandoffStatusReportSafe` now rejects
  `production_handoff_summary.readiness_state_counts` when it drifts from the
  top-level runtime handoff counts, and the regression test covers the mismatch.
  The report remains read-only and exposes only component ids, fixed labels,
  counts, booleans, and script names; it does not expose endpoints, secrets,
  OAuth tokens, YouTube text, support messages, candidates, commands, raw
  frames, OCR text, payloads, or start polling, real TTS, Live2D, OBS, bridge,
  game, or OS operations.
- After tightening YouTube production handoff readiness mirrors, `node --check
  src\services\dev\youtubeRelayStartupChecklist.js`, `node --check
  src\services\dev\youtubeIngestEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. The relay startup checklist now rejects
  `production_handoff_summary.startup_readiness_state_counts` or
  `next_readiness_state` when they drift from the top-level checklist, and the
  YouTube env setup plan now rejects handoff readiness counts or next readiness
  labels that drift from the top-level plan. Regression tests cover both
  mismatch paths. These reports remain read-only and expose only env names,
  script names, fixed ids, fixed labels, booleans, and counts; they do not
  expose endpoint values, secrets, OAuth tokens, YouTube text, support
  messages, candidates, commands, raw frames, payloads, paths, or start polling,
  OAuth, direct YouTube API calls, real TTS, Live2D, OBS, game, or OS
  operations.
- After tightening the YouTube source-status CLI handoff summary, `node --check
  scripts\dev-youtube-ingest-source-status.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. The CLI production handoff summary no longer mirrors the raw
  `source_status` object; it now exposes only source kind, instantiation and
  ingest readiness labels, safe auth mode, error booleans, error kind, counts,
  and script names, and the safety assertion rejects count/status drift from
  `youtube_ingest_source_status.status_summary`. This keeps the source-status
  handoff aligned with its counts-only boundary. The CLI remains read-only and
  does not expose endpoint values, secrets, OAuth tokens, platform ids, cursor
  values, YouTube text, support messages, candidates, commands, raw payloads,
  paths, or start polling, OAuth, direct YouTube API calls, real TTS, Live2D,
  OBS, game, or OS operations.
- After adding readiness labels to the YouTube source status report, `node
  --check src\services\dev\youtubeIngestSourceStatus.js`, `node --check
  scripts\dev-youtube-ingest-source-status.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `createYouTubeIngestSourceStatusReport` now exposes
  `next_readiness_state` and one-source `readiness_state_counts` so source
  status aligns with preflight, runtime, live-readiness, and production handoff
  views. Missing or configuration-error sources are labeled
  `configuration_waiting`, idle/active sources are `ready`, operator-action
  sources are `operator_review_required`, and cooldown/retry/attention states
  remain `runtime_waiting`. The source-status CLI handoff mirrors these
  readiness labels and counts exactly and rejects drift. Reports remain
  read-only and do not expose endpoint values, secrets, OAuth tokens, platform
  ids, cursor values, YouTube text, support messages, candidates, commands, raw
  payloads, paths, or start polling, OAuth, direct YouTube API calls, real TTS,
  Live2D, OBS, game, or OS operations.
- After tightening the persistence startup checklist handoff mirror, `node
  --check src\services\dev\persistenceStartupChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertPersistenceStartupChecklistSafe` now rejects
  `production_handoff_summary.next_readiness_state` or
  `production_handoff_summary.startup_readiness_state_counts` when they drift
  from the top-level startup checklist, matching the stricter foundation and
  YouTube startup handoff contracts. The checklist remains read-only and
  exposes only env names, script names, fixed decision ids, fixed labels,
  booleans, and counts; it does not expose store paths, endpoint values,
  secrets, memory records, relationship records, relationship scores,
  candidates, commands, raw runtime state, payloads, or start vector bridge,
  persistence writes, real TTS, Live2D, OBS, game, or OS operations.
- After tightening the persistence env setup handoff mirror, `node --check
  src\services\dev\persistenceEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertPersistenceEnvSetupPlanSafe` now rejects
  `production_handoff_summary.next_readiness_state` or
  `production_handoff_summary.readiness_state_counts` when they drift from the
  top-level env setup plan, matching the YouTube env setup and production
  readiness mirror contracts. The plan remains read-only and exposes only env
  names, script names, schema names, fixed ids/statuses, booleans, and counts;
  it does not expose store paths, endpoint values, secrets, memory records,
  relationship records, summaries, relationship scores, candidates, commands,
  raw runtime state, payloads, or start vector bridge, persistence writes, real
  TTS, Live2D, OBS, game, or OS operations.
- After tightening the gameplay startup/env setup handoff mirrors, `node --check
  src\services\dev\gameplayStartupChecklist.js`, `node --check
  src\services\dev\gameplayEnvSetupPlan.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 316 tests passed.
  `assertGameplayStartupChecklistSafe` now rejects
  `production_handoff_summary.next_readiness_state` or
  `production_handoff_summary.startup_readiness_state_counts` when they drift
  from the top-level startup checklist, and `assertGameplayEnvSetupPlanSafe`
  now rejects handoff readiness labels or counts that drift from the top-level
  env setup plan. Regression tests cover both mismatch paths. These reports
  remain read-only and expose only env names, script names, fixed ids/statuses,
  booleans, and counts; they do not expose endpoint values, secrets, raw
  frames, OCR text, vision payloads, action candidates, approved actions,
  commands, or start game/OS input, game control adapter, real TTS, Live2D, OBS,
  or bridge operations.
- After tightening gameplay validation/live handoff mirrors, `node --check
  src\services\dev\gameplayLiveReadiness.js`, `node --check
  src\services\dev\gameplayValidationGateRoundtrip.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertGameplayLiveReadinessReportSafe` now rejects
  `production_handoff_summary.readiness_state_counts` when it drifts from the
  top-level live-readiness report. The gameplay validation-gate roundtrip
  handoff now rejects drift in fixture counts, tick counts, adapter counts,
  validation status, action-gate status, and fixed next scripts. The reports
  remain read-only/rehearsal-only and do not expose endpoint values, secrets,
  text payloads, raw frames, OCR text, action candidates, approved actions,
  commands, or start real capture, game/OS input, control adapter side effects,
  real TTS, Live2D, OBS, or bridge operations.
- After tightening gameplay readiness rehearsal handoff readiness counts,
  `node --check src\services\dev\gameplayReadinessRehearsal.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. The rehearsal handoff now rejects readiness-count drift from its
  intended handoff scope: live-readiness gate counts plus the rehearsal's next
  readiness state. Regression coverage verifies the expected safe mirror and a
  mismatch rejection. The report remains read-only/rehearsal-only and does not
  capture screens, control games, forward input action candidates or approved
  actions, expose endpoint values, secrets, raw frames, OCR text, vision
  payloads, commands, or start real TTS, Live2D, OBS, bridge, game, or OS
  operations.
- After tightening the production runtime handoff gameplay component boundary,
  `node --check src\services\dev\productionRuntimeHandoffStatus.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  316 tests passed. `assertProductionRuntimeHandoffStatusReportSafe` now
  rejects a `gameplay_runtime` component if its candidate gate, runtime
  side-effect, real capture/input, endpoint redaction, or secret redaction
  boundary flags drift from the gameplay runtime handoff. Regression coverage
  verifies that a gameplay component with `candidates_remain_gated: false` is
  rejected. The aggregate remains child-report-free and exposes only component
  ids, safe status labels, booleans, counts, and script names; it does not
  expose endpoint values, secrets, raw frames, OCR text, candidates, approved
  actions, commands, raw runtime state, or start real processes, polling,
  capture, game/OS input, persistence writes, TTS, Live2D, OBS, or bridge
  operations.
- After tightening production probe stage consistency, `node --check
  src\services\dev\productionProbe.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 316 tests passed.
  `assertProductionProbeStageSafe` now rejects invalid stage ids, invalid stage
  priorities, and stage check-count drift, including a regression that mutates
  the priority-4 `vision_and_safe_game_control` probe stage. The probe remains
  dry-run/read-only and exposes only safe stage ids, fixed labels, booleans,
  counts, readiness labels, env names, and script names; it does not expose
  endpoint values, secrets, raw frames, OCR text, candidates, approved actions,
  commands, live payloads, or start real processes, polling, capture, game/OS
  input, persistence writes, TTS, Live2D, OBS, or bridge operations.
- After tightening production live-readiness gameplay gate scripts, `node
  --check src\services\dev\productionLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. The priority-4 `vision_and_safe_game_control` stage now rejects gate
  summary drift when a gameplay gate reports a wrong check script, even if the
  replacement script is otherwise a safe npm script. Regression coverage mutates
  `action_gate.check_script` to prove the aggregate detects the mismatch. The
  aggregate remains read-only and exposes only safe stage ids, fixed labels,
  booleans, counts, readiness labels, env names, and script names; it does not
  expose endpoint values, secrets, YouTube text, support messages, raw frames,
  OCR text, candidates, approved actions, commands, live payloads, or start real
  processes, polling, capture, game/OS input, persistence writes, TTS, Live2D,
  OBS, or bridge operations.
- After tightening production next-task priority gate contracts, `node --check
  src\services\dev\productionNextTask.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 316 tests passed. The
  `assertProductionNextTaskReportSafe` gate validation now pins each priority
  stage to its expected label, status/preflight/launch/startup/runtime scripts,
  runtime status, and runtime-flow identifiers, while leaving the runbook-derived
  `first_verification_script` safely script-validated but not single-value
  fixed. Regression coverage mutates the priority-4 gameplay runtime
  verification script to a different safe script and confirms the aggregate
  rejects it. The report remains read-only and does not expose endpoint values,
  secrets, YouTube text, support messages, memory or relationship candidates,
  input action candidates, approved actions, raw frames, OCR text, commands, or
  start polling, persistence writes, capture, game/OS input, TTS, Live2D, OBS, or
  bridge operations.
- After tightening production scheduler-enablement contracts, `node --check
  src\services\dev\productionSchedulerEnablementPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertProductionSchedulerEnablementPlanSafe` now pins the priority-2
  stage to `youtube_comments_and_support`, the priority-4 stage to
  `vision_and_safe_game_control`, and every top-level verification script to its
  expected scheduler, next-task, runtime-handoff, YouTube, and gameplay script.
  Regression coverage verifies that a safe but wrong gameplay runtime script and
  a stage-id/priority mismatch are rejected. The plan remains read-only and does
  not expose endpoint values, secrets, YouTube text, support messages, memory or
  relationship candidates, input action candidates, approved actions, raw
  frames, OCR text, raw scheduler state, commands, or start polling, capture,
  game/OS input, persistence writes, TTS, Live2D, OBS, or bridge operations.
- After tightening production readiness runbook stage contracts, `node --check
  src\services\dev\productionReadinessRunbook.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertProductionReadinessRunbookSafe` now validates each stage
  against the fixed stage definition for id, priority, stage-id/priority
  pairing, exact verification script list/order, and safe env-name arrays.
  Regression coverage mutates the priority-4 gameplay verification list to a
  different safe script and mutates the gameplay priority to prove both drift
  paths are rejected. The runbook remains read-only and does not expose endpoint
  values, secrets, YouTube text, support messages, memory or relationship
  candidates, input action candidates, approved actions, raw frames, OCR text,
  commands, or start polling, persistence writes, capture, game/OS input, TTS,
  Live2D, OBS, or bridge operations.
- After tightening production probe verification-plan consistency, `node --check
  src\services\dev\productionProbe.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 316 tests passed.
  `assertProductionProbeReportSafe` now verifies that the embedded runbook
  verification plan has a valid fixed stage id/priority pairing, that the next
  verification stage matches the probe's runbook-derived next stage, that stage
  summaries structurally match the probe stage ids/priorities, and that total
  verification script counts match the sum of stage summaries. The check
  intentionally does not require probe-stage readiness to equal runbook
  readiness because probe stages can include dry-run health/probe outcomes.
  Regression coverage mutates the next-stage priority and a stage-summary
  priority to prove drift is rejected. The probe remains dry-run/read-only and
  does not expose endpoint values, secrets, YouTube text, support messages,
  memory or relationship candidates, input action candidates, approved actions,
  raw frames, OCR text, commands, or start polling, persistence writes, capture,
  game/OS input, TTS, Live2D, OBS, or bridge operations.
- After adding runtime handoff drift regressions, `node --check
  src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. The runtime handoff status contract now has regression coverage for
  duplicated or missing component ids in the fixed foundation, YouTube,
  persistence, gameplay component order, plus top-level boundary policy drift
  such as `no_candidates: false`, and a synthetic all-components-ready aggregate
  path that verifies the handoff-ready status, null next component/script, and
  ready count summary. The report remains read-only and does not expose endpoint
  values, secrets, YouTube text, support messages, memory or relationship
  candidates, input action candidates, approved actions, raw frames, OCR text,
  commands, child reports, or raw runtime state, and it does not start polling,
  persistence writes, capture, game/OS input, TTS, Live2D, OBS, or bridge
  operations.
- After tightening local bridge engine worker public report count contracts,
  `node --check src\server\localBridgeEngineWorker.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertLocalBridgeEngineProcessReportSafe` now validates
  attempted/processed/failed/skipped/expired counts against per-adapter
  summaries, validates receipt summary schemas and adapter kinds, and rejects
  process report manifest-count drift. `assertLocalBridgeEngineDrainReportSafe`
  now validates the same top-level/per-adapter count consistency and rejects
  impossible manifest summary counts. Regression coverage mutates the HTTP
  engine drain report's total processed count and per-adapter processed count to
  prove both drift paths are rejected. The worker reports remain counts/status
  only and do not expose endpoint values, secrets, adapter job payloads, text,
  candidates, commands, raw engine responses, or raw jobs; tests use local
  synthetic HTTP fixtures only and do not start real TTS, Live2D, OBS, game/OS
  input, YouTube polling, or persistence commits.
- After tightening local engine and OBS bridge health-probe summary contracts,
  `node --check src\server\localEngineHealthProbe.js`, `node --check
  src\server\obsBridgeSetup.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 316 tests passed.
  `assertLocalEngineHealthProbeReportSafe` now recomputes the public summary
  from the TTS and Live2D probe items and rejects summary count drift such as an
  inflated `engine_ready` count. `assertObsBridgeHealthProbeReportSafe` now
  recomputes the OBS bridge health summary from its probe item and rejects drift
  such as an inflated `bridge_ready` count. These probes remain read-only and do
  not expose endpoint values, secrets, raw health payloads, live payloads,
  candidates, commands, operator OBS source names, engine preferences, or text
  payloads; tests use local synthetic HTTP fixtures only and do not start real
  TTS, Live2D, OBS, YouTube polling, persistence writes, capture, or game/OS
  input.
- After tightening OBS setup and render-manifest pickup report contracts, `node
  --check src\server\obsBridgeSetup.js`, `node --check
  src\server\localBridgeRenderManifestReport.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertObsBridgeSetupReportSafe` now validates public bridge/request
  labels, boolean setup flags, positive source dimensions, all setup boundary
  flags, failure report boundaries, and adapter validation. Regression coverage
  rejects invalid source dimensions and boundary drift such as `no_commands:
  false`. `assertLocalBridgeRenderManifestOperatorReportSafe` now verifies that
  OBS pickup blocking adapter kinds/counts are derived from the per-adapter
  blocking status map, and regression coverage rejects a tampered blocking
  adapter count. These reports remain local/operator diagnostics and do not
  expose endpoint values, secrets, raw text, live payloads, candidates,
  commands, raw jobs, artifact paths by default, or unsafe manifest labels; tests
  use local synthetic fixtures only and do not start real OBS, TTS, Live2D,
  YouTube polling, persistence writes, capture, or game/OS input.
- After tightening foundation runtime real-engine handoff derived contracts,
  `node --check src\services\dev\foundationRuntimeStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertRealEngineHandoffRuntimeSummarySafe` now rejects configured
  real-engine count drift, TTS/Live2D ready flag and mode drift, and subtitle
  renderer readiness drift. Regression coverage mutates the ready foundation
  runtime report's configured real-engine count and TTS ready flag to prove both
  drift paths are rejected. The report remains counts/status/booleans only and
  does not expose endpoint values, secrets, raw jobs, text payloads, artifact
  paths, candidates, commands, or start real TTS, Live2D, OBS, YouTube polling,
  persistence writes, capture, or game/OS input.
- After tightening YouTube ingest env setup group mapping contracts, `node
  --check src\services\dev\youtubeIngestEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertYouTubeIngestEnvSetupPlanSafe` now verifies each public env
  setup group is derived from its `process_ref`, including the fixed group id,
  group kind, and guidance labels. Regression coverage mutates a ready env setup
  plan's first group process ref and guidance labels to prove both drift paths
  are rejected. The plan remains env-name/script-name/status/count guidance only
  and does not expose endpoint values, secrets, YouTube chat text, support
  messages, platform cursors, candidates, commands, payloads, or start live
  polling, OAuth, persistence writes, TTS, Live2D, OBS, capture, or game/OS
  input.
- After tightening the YouTube source status CLI handoff report contract, `node
  --check scripts\dev-youtube-ingest-source-status.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertYouTubeIngestSourceStatusCliReportSafe` now validates the CLI
  wrapper schema, URL-free output, production handoff script-name shape, handoff
  summary forbidden fields, and all boundary-policy flags. Regression coverage
  rejects unsafe shell-like script text, accidental source-status embedding in
  the production handoff summary, and boundary drift such as `no_commands:
  false`. The CLI report remains read-only/status-only and does not expose
  endpoint values, secrets, platform ids, platform cursors, YouTube chat text,
  support messages, candidates, commands, payloads, or start live polling,
  OAuth, scheduler execution, persistence writes, TTS, Live2D, OBS, capture, or
  game/OS input.
- After tightening the YouTube runtime status boundary-policy contract, `node
  --check src\services\dev\youtubeIngestRuntimeStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertYouTubeIngestRuntimeStatusReportSafe` now requires every
  runtime boundary flag, including no support-message text, no platform cursor
  values, no candidates, no commands, no raw stream state, no raw scheduler
  results, read-only status, no polling side effects, and script-name-only
  guidance. Regression coverage rejects boundary drift such as
  `no_support_message_text: false` and `no_commands: false`. The runtime status
  report remains read-only/counts-only and does not expose endpoint values,
  secrets, YouTube chat text, support messages, platform cursors, raw stream
  state, raw scheduler results, candidates, commands, payloads, or start live
  polling, OAuth, scheduler ticks, persistence writes, TTS, Live2D, OBS, capture,
  or game/OS input.
- After tightening the YouTube live readiness boundary-policy contract, `node
  --check src\services\dev\youtubeIngestLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertYouTubeIngestLiveReadinessReportSafe` now requires every live
  readiness boundary flag, including env-name-only guidance, fixed
  boolean/count/status output, no text payloads, no support-message text, no
  platform cursor values, no platform ids, no candidates, no commands, no raw
  scheduler results, no raw stream state, read-only status, and no polling side
  effects. Regression coverage rejects boundary drift such as
  `no_support_message_text: false` and `no_raw_stream_state: false`. The live
  readiness report remains read-only/counts-only and does not expose endpoint
  values, secrets, platform ids, platform cursors, YouTube chat text, support
  messages, raw stream state, raw scheduler results, candidates, commands,
  payloads, or start live polling, OAuth, scheduler ticks, persistence writes,
  TTS, Live2D, OBS, capture, or game/OS input.
- After tightening the persistence runtime status boundary-policy contract,
  `node --check src\services\dev\persistenceRuntimeStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertPersistenceRuntimeStatusReportSafe` now requires every runtime
  boundary flag, including env-name-only guidance, counts-only output, no store
  paths, no memory records, no relationship records, no candidates, no commands,
  no raw runtime state, read-only status, and script-name-only guidance.
  Regression coverage rejects boundary drift such as `no_memory_records: false`
  and `no_candidates: false`. The runtime status report remains
  read-only/counts-only and does not expose endpoint values, secrets, store
  paths, memory records, relationship records, raw runtime state, candidates,
  commands, payloads, or commit memory/relationship candidates directly.
- After tightening the persistence live readiness boundary-policy contract,
  `node --check src\services\dev\persistenceLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertPersistenceLiveReadinessReportSafe` now requires every live
  readiness boundary flag, including env-name-only guidance, fixed
  count/status/boolean/policy output, no store paths, no memory records, no
  relationship records, no memory summaries, no relationship scores, no viewer
  ids, no display names, no candidates, no commands, no raw runtime state, and
  read-only status. Regression coverage rejects boundary drift such as
  `no_relationship_records: false` and `no_viewer_ids: false`. The live
  readiness report remains read-only/counts-only and does not expose endpoint
  values, secrets, store paths, memory records, relationship records, memory
  summaries, relationship scores, viewer ids, display names, raw runtime state,
  candidates, commands, payloads, or commit memory/relationship candidates
  directly.
- After tightening persistence env setup group mapping contracts, `node --check
  src\services\dev\persistenceEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertPersistenceEnvSetupPlanSafe` now verifies each public env setup
  group is derived from its `process_ref`, including the fixed group id, group
  kind, and guidance labels. Regression coverage mutates a ready env setup
  plan's first group process ref and guidance labels to prove both drift paths
  are rejected. The plan remains env-name/script-name/status/count guidance only
  and does not expose endpoint values, secrets, store paths, memory records,
  relationship records, memory summaries, relationship scores, candidates,
  commands, payloads, or commit memory/relationship candidates directly.
- After tightening persistence readiness rehearsal gate-summary derived
  contracts, `node --check src\services\dev\persistenceReadinessRehearsal.js`,
  `node --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed:
  all 316 tests passed. `assertPersistenceReadinessRehearsalSafe` now verifies
  `ready_gate_count` and `attention_gate_count` are derived from the individual
  gate-ready booleans, so the rehearsal cannot overstate persistence readiness
  by changing only summary counts. Regression coverage mutates the ready
  rehearsal's gate count and candidate gate boolean to prove both drift paths are
  rejected. The rehearsal remains read-only/counts-only and does not expose
  endpoint values, secrets, store paths, memory records, relationship records,
  memory summaries, relationship scores, viewer ids, display names, candidates,
  commands, payloads, or commit memory/relationship candidates directly.
- After tightening the gameplay runtime status boundary-policy contract, `node
  --check src\services\dev\gameplayRuntimeStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertGameplayRuntimeStatusReportSafe` now requires every runtime
  boundary flag, including env-name-only guidance, fixed count/status/boolean
  output, no live payloads, no raw frames, no OCR text, no vision payloads, no
  action candidates, no approved actions, no commands, no raw stream state, no
  raw scheduler results, read-only status, no polling side effects, and
  script-name-only guidance. Regression coverage rejects boundary drift such as
  `no_action_candidates: false` and `no_raw_frames: false`. The gameplay runtime
  status remains read-only/counts-only and does not expose endpoint values,
  secrets, live payloads, raw frames, OCR text, vision payloads,
  `input_action_candidate`, approved game actions, commands, raw runtime state,
  raw scheduler results, or perform game/OS input.
- After tightening gameplay live readiness and env setup contracts, `node
  --check src\services\dev\gameplayLiveReadiness.js`, `node --check
  src\services\dev\gameplayEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertGameplayLiveReadinessReportSafe` now requires every top-level
  live readiness boundary flag and every verification-script boundary flag,
  including no raw frames, no OCR text, no vision payloads, no action
  candidates, no approved actions, no commands, read-only live readiness, no
  polling side effects, and no control side effects. Regression coverage rejects
  boundary drift such as `no_action_candidates: false` and verification
  `no_commands: false`. `assertGameplayEnvSetupPlanSafe` now verifies each
  public env setup group is derived from its `process_ref`, including fixed
  group id, group kind, and guidance labels. Regression coverage mutates a ready
  gameplay env setup plan's first group process ref and guidance labels to prove
  both drift paths are rejected. The reports remain script/env-name/status/count
  guidance only and do not expose endpoint values, secrets, raw frames, OCR
  text, vision payloads, `input_action_candidate`, approved game actions,
  commands, payloads, or perform game/OS input.
- After tightening gameplay readiness rehearsal gate-summary derived
  contracts, `node --check
  src\services\dev\gameplayReadinessRehearsal.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertGameplayReadinessRehearsalSafe` now verifies
  `gate_summary.ready_gate_count` and `attention_gate_count` are derived from
  the individual gate-ready booleans, and verifies gate readiness-state counts
  are derived from the individual gate readiness-state fields. Regression
  coverage mutates a ready rehearsal's gate count and `safe_control_gate_ready`
  boolean to prove both drift paths are rejected. The rehearsal remains
  read-only/status-count guidance only and does not expose endpoint values,
  secrets, raw frames, OCR text, vision payloads, `input_action_candidate`,
  approved game actions, commands, payloads, or perform capture, adapter handoff,
  game control, or OS input.
- After tightening production runtime handoff readiness-state aggregation,
  `node --check src\services\dev\productionRuntimeHandoffStatus.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  316 tests passed. `assertProductionRuntimeHandoffStatusReportSafe` now
  verifies top-level `readiness_state_counts` are derived from the four
  component summaries, not only that the totals add up. Regression coverage
  mutates the top-level and handoff-summary readiness counts while preserving
  the total count to prove component/count drift is rejected. The aggregate
  remains child-report-free and does not expose endpoint values, secrets, raw
  frames, OCR text, candidates, commands, payloads, raw runtime state, or start
  live polling, real processes, capture, game control, or OS input.
- After tightening production live readiness and production probe boundary
  contracts, `node --check src\services\dev\productionLiveReadiness.js`, `node
  --check src\services\dev\productionProbe.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertProductionLiveReadinessReportSafe` now requires every
  verification-script boundary flag, including no endpoint values, no secret
  values, no payloads, no candidates, and no commands. Regression coverage
  rejects verification `no_commands: false`. `assertProductionProbeReportSafe`
  now requires full boundary policies for the top-level probe, embedded next
  task summary, verification plan, stage summaries, and individual checks.
  Regression coverage rejects top-level `no_commands: false`, next-task
  `no_raw_frames: false`, and stage `no_raw_payloads: false`. The aggregate
  reports remain read-only/status-count guidance only and do not expose endpoint
  values, secrets, live payloads, raw payloads, candidates, commands,
  `input_action_candidate`, approved game actions, memory/relationship
  candidate records, or start real processes, polling, capture, game control, or
  OS input.
- After tightening production next-task aggregation and boundary contracts,
  `node --check src\services\dev\productionNextTask.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertProductionNextTaskReportSafe` now verifies ready/attention
  gate counts are derived from the individual priority gates, not only that the
  totals add up. It also requires every top-level next-task boundary flag, every
  priority-gate boundary flag, and every operator startup summary boundary flag.
  Regression coverage rejects count drift, top-level `no_commands: false`, gate
  `no_candidates: false`, and operator startup `no_commands: false`. The report
  remains read-only script/env-name/status/count guidance only and does not
  expose endpoint values, secrets, live/text payloads, raw frames, candidates,
  commands, memory/relationship records, `input_action_candidate`, approved game
  actions, or start real processes, polling, game control, or OS input.
- After tightening production scheduler enablement derived-state contracts,
  `node --check src\services\dev\productionSchedulerEnablementPlan.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  316 tests passed. `assertProductionSchedulerEnablementPlanSafe` now verifies
  `overall_status` and `next_readiness_state` are derived from the scheduler
  stage plans, so a report cannot claim runtime rehearsal readiness or a
  mismatched next readiness state while the YouTube/gameplay scheduler stages
  still require attention. Regression coverage rejects both drift paths. The
  plan remains read-only env/script/status/count guidance only and does not
  expose endpoint values, secrets, platform ids, platform cursors, support text,
  memory/relationship records, candidates, commands, raw frames, raw scheduler
  results, raw stream state, `input_action_candidate`, approved game actions, or
  start polling, game control, or OS input.
- After tightening production live readiness aggregate boundary contracts, `node
  --check src\services\dev\productionLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertProductionLiveReadinessReportSafe` now requires every top-level
  live-readiness boundary flag, every priority-stage boundary flag, every gate
  boundary flag, and exact verification-script names including the startup
  checklist scripts. The production handoff summary now has to mirror the
  top-level stage counts, not only preserve a total of four. Regression coverage
  rejects top-level `no_commands: false`, handoff count drift, stage
  `no_candidates: false`, gate `no_commands: false`, and a swapped verification
  script. The aggregate remains read-only script/env-name/status/count guidance
  only and does not expose endpoint values, secrets, live/text payloads,
  memory/relationship records, candidates, commands, raw frames, raw scheduler
  results, raw stream state, `input_action_candidate`, approved game actions, or
  start real processes, polling, game control, or OS input.
- After making the production probe HTTP wrapper explicit, `node --check
  src\server\httpServer.js`, `node --check scripts\run-tests.js`, and `node
  scripts\run-tests.js` passed: all 316 tests passed. `GET /production/probe`
  and `POST /production/probe` now return the `iris_production_probe_http_v1`
  wrapper schema and an HTTP-level boundary policy that marks the response as
  read-only, endpoint/secret-free, raw-payload-free, candidate-free,
  command-free, dry-run by default, and synthetic-fixture-only for fixture POST
  mode. The underlying probe report remains governed by its existing production
  probe contract and the HTTP wrapper does not start real processes, polling,
  game control, or OS input.
- After tightening the production config doctor OBS/setup continuation coverage,
  `node --check src\services\dev\productionConfigDoctor.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. The OBS check now reports the configured
  `IRIS_OBS_SETUP_CONTINUE_ON_ERROR` env name as configuration presence only,
  matching `.env.example` without exposing any value. Regression coverage also
  rejects top-level doctor boundary drift such as `no_commands: false` and
  per-check boundary drift such as `read_only_check: false`. The doctor remains
  read-only env-name/status/count guidance only and does not expose endpoint
  values, secrets, live payloads, memory/relationship records, candidates,
  commands, raw frames, `input_action_candidate`, approved game actions, or
  start real processes, OBS/Live2D/VOICEVOX, game control, or OS input.
- After tightening production readiness runbook aggregate contracts, `node
  --check src\services\dev\productionReadinessRunbook.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertProductionReadinessRunbookSafe` now verifies the top-level
  readiness status, next stage, next readiness state, and summary counts are
  derived from the stage/integration data. The runbook, verification plan,
  operator launch plan, operator startup plan, and stage summaries now require
  their complete boundary policies instead of checking only selected flags.
  Regression coverage rejects top-level `no_commands: false`, summary count
  drift, verification-plan `no_endpoint_values: false`, launch-plan
  `no_payloads: false`, startup-plan `no_commands: false`, and stage
  `read_only_stage: false`. The runbook remains read-only env-name/script-name/
  status/count guidance only and does not expose endpoint values, secrets, live
  payloads, memory/relationship records, candidates, commands, raw frames,
  `input_action_candidate`, approved game actions, or start real processes,
  polling, OBS/Live2D/VOICEVOX, game control, or OS input.
- After making the production config doctor and readiness runbook HTTP wrappers
  explicit, `node --check src\server\httpServer.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `GET /production/config-doctor` now returns
  `iris_production_config_doctor_http_v1` with a read-only, report-only,
  endpoint/secret-free, candidate-free, command-free HTTP boundary policy.
  `GET /production/readiness-runbook` now returns
  `iris_production_readiness_runbook_http_v1` with a read-only, runbook-only,
  script/env-name/status/count-only HTTP boundary policy and explicitly marks
  launch steps as operator guidance only. These wrappers do not start real
  processes, polling, OBS/Live2D/VOICEVOX, game control, or OS input.
- After tightening the YouTube ingest preflight boundary and HTTP wrapper,
  `node --check src\services\dev\youtubeIngestPreflight.js`, `node --check
  src\server\httpServer.js`, `node --check scripts\run-tests.js`, and `node
  scripts\run-tests.js` passed: all 316 tests passed.
  `assertYouTubeIngestPreflightReportSafe` now requires every top-level
  preflight boundary flag, including no secret values, no endpoint values, no
  platform cursor values, no support message text, no candidates, no commands,
  and read-only preflight mode. Regression coverage rejects `no_commands:
  false` and `no_support_message_text: false`. `GET
  /production/youtube-preflight` now returns
  `iris_youtube_ingest_preflight_http_v1` with a read-only, preflight-only,
  endpoint/secret/cursor/support-text-free HTTP boundary policy. The endpoint
  does not start polling, real processes, game control, or OS input.
- After tightening the YouTube ingest launch plan boundary contracts, `node
  --check src\services\dev\youtubeIngestLaunchPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertYouTubeIngestLaunchPlanSafe` now requires every top-level
  launch-plan boundary flag, including no secret values, no endpoint values, no
  support message text, no candidates, no commands, and read-only plan mode.
  Runtime poll verification now uses the same required-boundary helper and
  regression coverage rejects top-level `no_commands: false` and runtime poll
  `no_support_message_text: false`. The launch plan remains script/env-name/
  status/count guidance only and does not expose endpoint values, secrets,
  platform cursor values, support messages, candidates, commands, or start
  polling, real processes, game control, or OS input.
- After tightening the YouTube ingest source status boundary contract, `node
  --check src\services\dev\youtubeIngestSourceStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertYouTubeIngestSourceStatusReportSafe` now requires every
  top-level source-status boundary flag, including no live payloads, no support
  message text, no platform cursor values, no candidates, no commands, no raw
  instantiation error message, read-only status mode, and no polling side
  effects. Regression coverage rejects `no_commands: false` and
  `no_support_message_text: false`. The report remains status/count-only and
  does not expose endpoint values, secrets, live payloads, support messages,
  platform cursor values, candidates, commands, or start polling.
- After tightening the YouTube ingest env setup plan boundary contracts, `node
  --check src\services\dev\youtubeIngestEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertYouTubeIngestEnvSetupPlanSafe` and env-group validation now
  require every declared boundary flag through a shared helper, including env
  names only, script names only, no secret values, no endpoint values, no
  platform cursor values, no live payloads, no support message text, no
  candidates, no commands, and read-only env setup guidance. Regression coverage
  rejects top-level `no_commands: false` and env-group
  `no_support_message_text: false`. The env setup plan remains env-name/
  script-name/status/count guidance only and does not expose endpoint values,
  secrets, platform cursor values, support messages, candidates, commands, or
  start polling, OAuth, real processes, game control, or OS input.
- After tightening the YouTube ingest live readiness boundary contracts, `node
  --check src\services\dev\youtubeIngestLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertYouTubeIngestLiveReadinessReportSafe`, verification-script
  validation, and gate validation now require their complete boundary policies
  through a shared helper. Regression coverage rejects top-level
  `no_support_message_text: false`, top-level `no_raw_stream_state: false`, and
  verification-script `no_commands: false`. The live readiness report remains
  env-name/script-name/boolean/count/status guidance only and does not expose
  endpoint values, secrets, live payloads, text payloads, support message text,
  platform cursor values, platform ids, candidates, commands, raw scheduler
  results, raw stream state, or start polling.
- After tightening the YouTube ingest runtime status boundary contract, `node
  --check src\services\dev\youtubeIngestRuntimeStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertYouTubeIngestRuntimeStatusReportSafe` now requires the full
  runtime boundary policy through a shared helper, and regression coverage
  rejects `no_support_message_text: false`, `no_commands: false`, and
  `no_raw_scheduler_results: false`. The runtime status report remains env-name/
  script-name/status/count-only guidance and does not expose endpoint values,
  secrets, live payloads, support message text, platform cursor values,
  candidates, commands, raw stream state, raw scheduler results, or start
  polling.
- After tightening the YouTube ingest local env apply plan boundary contract,
  `node --check src\services\dev\youtubeIngestLocalEnvApplyPlan.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  316 tests passed. `assertYouTubeIngestLocalEnvApplyPlanSafe` now requires the
  full apply-plan boundary policy through a shared helper, and regression
  coverage rejects `no_commands: false` and `no_template_text: false`. The
  apply plan remains env-name/file-name/script-name/count guidance only, dry-run
  by default, and does not expose env values, secret values, endpoint values,
  platform cursor values, live payloads, support message text, template text,
  candidates, commands, or perform file updates without the explicit materialize
  mode.
- After tightening the YouTube ingest local env profile boundary contract, `node
  --check src\services\dev\youtubeIngestLocalEnvProfile.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertYouTubeIngestLocalEnvProfileSafe` and env-group validation now
  require their full boundary policies through a shared helper. Regression
  coverage rejects top-level `no_commands: false` and env-group
  `no_endpoint_values: false`. The local env profile remains env-name/
  source-mode/script-name/operator-label guidance only and does not expose env
  values, secret values, endpoint values, platform cursor values, live payloads,
  support message text, candidates, commands, or render template text unless the
  explicit print-env CLI mode is used.
- After tightening the YouTube ingest readiness rehearsal boundary contract,
  `node --check src\services\dev\youtubeIngestReadinessRehearsal.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  316 tests passed. `assertYouTubeIngestReadinessRehearsalSafe` now validates
  the top-level rehearsal boundary through the shared helper used by
  verification scripts. Regression coverage rejects top-level
  `no_commands: false` and verification-script `no_payloads: false`. The
  rehearsal remains report-only and does not expose endpoint values, secrets,
  live payloads, text payloads, support message text, platform ids, platform
  cursor values, candidates, commands, raw scheduler results, raw stream state,
  or start polling.
- After tightening the foundation status boundary contract for the real
  TTS/Live2D/OBS integration foundation, `node --check
  src\services\dev\foundationStatus.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 316 tests passed.
  `assertFoundationStatusReportSafe` now validates the full status boundary
  policy through a shared helper. Regression coverage rejects `no_commands:
  false` and `no_engine_calls: false`. The foundation status report remains
  read-only and does not expose endpoint values, secret values, raw packets, job
  payloads, text payloads, artifact paths, candidates, commands, or perform
  engine calls or OBS setup side effects.
- After tightening the foundation local env profile boundary contract, `node
  --check src\services\dev\foundationLocalEnvProfile.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertFoundationLocalEnvProfileSafe` and env-group validation now
  require their full boundary policies through a shared helper. Regression
  coverage rejects top-level `no_commands: false` and env-group
  `no_endpoint_values: false`. The profile remains env-name/route-path/
  script-name/operator-label guidance only and does not expose secret values,
  endpoint values, payloads, candidates, commands, or render template values
  unless the explicit print-env CLI mode is used.
- After tightening the foundation env setup plan boundary contract, `node
  --check src\services\dev\foundationEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertFoundationEnvSetupPlanSafe` and env-group validation now
  require their full boundary policies through a shared helper. Regression
  coverage rejects top-level `no_commands: false` and env-group
  `no_endpoint_values: false`. The plan remains env-name/script-name/
  connector-id/guidance-label/status/count guidance only and does not expose
  secret values, endpoint values, payloads, candidates, commands, or start real
  TTS/Live2D/OBS processes.
- After tightening the foundation connector handoff boundary contract, `node
  --check src\services\dev\foundationConnectorHandoff.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertFoundationConnectorHandoffSafe`, connector validation, and
  contract-ref validation now require their full boundary policies through a
  shared helper. Regression coverage rejects top-level `no_commands: false`,
  connector `no_endpoint_values: false`, and contract-ref `no_payloads: false`.
  The handoff remains env-name/script-name/schema-name/route-path/connector
  guidance only and does not expose secret values, endpoint values, payloads,
  candidates, commands, raw packets, job payloads, or bypass adapter gates.
- After tightening the foundation local env apply plan and roundtrip boundary
  contracts, `node --check
  src\services\dev\foundationLocalEnvApplyPlan.js`, `node --check
  src\services\dev\foundationLocalEnvRoundtrip.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertFoundationLocalEnvApplyPlanSafe` and
  `assertFoundationLocalEnvRoundtripReportSafe` now require their full boundary
  policies through shared helpers. Regression coverage rejects apply-plan
  `no_commands: false`, apply-plan `no_template_text: false`, roundtrip
  `no_commands: false`, and roundtrip `no_template_text: false`. The reports
  remain env-name/file-name/script-name/count guidance only, do not expose env
  values, secrets, endpoint values, payloads, candidates, commands, or template
  text, and only materialize local env files when the explicit materialize mode
  is used.
- After tightening the foundation local env readiness rehearsal boundary
  contract, `node --check
  src\services\dev\foundationLocalEnvReadinessRehearsal.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertFoundationLocalEnvReadinessRehearsalSafe`,
  gate-summary validation, and runtime-expectation validation now require their
  full boundary policies through a shared helper. Regression coverage rejects
  top-level `no_commands: false`, gate-summary `no_payloads: false`, and
  runtime-expectation `no_endpoint_values: false`. The rehearsal remains
  read-only and does not expose env values, secret values, endpoint values,
  payloads, candidates, commands, template text, or perform local env file
  updates.
- After tightening the foundation startup checklist boundary contract, `node
  --check src\services\dev\foundationStartupChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertFoundationStartupChecklistSafe` and terminal-plan validation
  now require their full boundary policies through a shared helper. Regression
  coverage rejects top-level `no_commands: false` and terminal-plan
  `no_endpoint_values: false`. The startup checklist remains read-only
  terminal-label/script-name/env-name guidance only and does not expose secret
  values, endpoint values, payloads, candidates, commands, or start real
  processes.
- After tightening the foundation launch plan and foundation readiness
  rehearsal boundary contracts, `node --check
  src\services\dev\foundationLaunchPlan.js`, `node --check
  src\services\dev\foundationReadinessRehearsal.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. The shared boundary-policy diagnostics now name the missing or false
  boundary flag, and the readiness rehearsal production handoff summary now
  carries and validates its own boundary policy. Regression coverage rejects
  launch-plan `no_commands: false`, launch-plan runtime handoff
  `no_endpoint_values: false`, readiness-rehearsal `no_commands: false`, and
  readiness production-handoff `no_endpoint_values: false`. These reports
  remain read-only script-name/env-name/status/count guidance only and do not
  expose secret values, endpoint values, payloads, text payloads, artifact
  paths, raw jobs, candidates, commands, or perform real TTS/Live2D/OBS/game/OS
  side effects.
- After tightening the gameplay env setup plan boundary contract, `node --check
  src\services\dev\gameplayEnvSetupPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertGameplayEnvSetupPlanSafe` and env-group validation now require
  their full boundary policies through a shared helper. Regression coverage
  rejects top-level `no_commands: false` and env-group `no_endpoint_values:
  false`. The gameplay env setup plan remains read-only env-name/script-name/
  process-id/schema-name/status/count guidance only and does not expose secret
  values, endpoint values, raw frames, raw OCR text, vision payloads, action
  candidates, approved actions, commands, or start real game/OS input.
- After tightening the gameplay launch plan, readiness rehearsal, and live
  readiness boundary contracts, `node --check
  src\services\dev\gameplayLaunchPlan.js`, `node --check
  src\services\dev\gameplayReadinessRehearsal.js`, `node --check
  src\services\dev\gameplayLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. Their boundary-policy validation now reports the exact missing or
  false boundary flag, and regression coverage rejects launch-plan
  `no_commands: false`, runtime safe-control `no_action_candidates: false`,
  readiness-rehearsal `no_commands: false`, runtime-flow
  `no_action_candidates: false`, live-readiness `no_action_candidates: false`,
  verification `no_commands: false`, env-setup summary `no_endpoint_values:
  false`, and safe-control gate `no_commands: false`. These reports remain
  read-only script-name/env-name/status/count/policy guidance only and do not
  expose secret values, endpoint values, raw frames, raw OCR text, vision
  payloads, action candidates, approved actions, commands, raw scheduler
  results, or perform polling/control/game/OS side effects.
- After tightening the gameplay local env profile and local env apply plan
  boundary contracts, `node --check
  src\services\dev\gameplayLocalEnvProfile.js`, `node --check
  src\services\dev\gameplayLocalEnvApplyPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertGameplayLocalEnvProfileSafe`, env-group validation, and
  `assertGameplayLocalEnvApplyPlanSafe` now require their full boundary
  policies through shared helpers. Regression coverage rejects profile
  `no_commands: false`, profile env-group `no_endpoint_values: false`,
  apply-plan `no_commands: false`, and apply-plan `no_template_text: false`.
  These reports remain env-name/file-name/script-name/count/operator-label
  guidance only and do not expose env values, secret values, endpoint values,
  raw frames, raw OCR text, vision payloads, action candidates, approved
  actions, commands, or template text. The apply plan only updates local env
  files when the explicit materialize mode is used.
- After tightening the gameplay preflight boundary contract, `node --check
  src\services\dev\gameplayPreflight.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 316 tests passed.
  `assertGameplayPreflightReportSafe` now reports the exact missing or false
  boundary flag. Regression coverage rejects `no_commands: false` and
  `no_action_candidates: false`. The preflight remains env-name/script-name/
  status/count/policy guidance only and does not expose secret values, endpoint
  values, raw frames, raw OCR text, vision payloads, action candidates,
  approved actions, commands, or perform polling/control/game/OS side effects.
- After tightening the gameplay runtime status top-level boundary contract,
  `node --check src\services\dev\gameplayRuntimeStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertGameplayRuntimeStatusReportSafe` now requires the top-level
  boundary policy through a shared helper and reports the exact missing or false
  boundary flag. Existing regression coverage rejects `no_action_candidates:
  false` and `no_raw_frames: false`. The runtime status report remains
  summary-only and does not expose secret values, endpoint values, live
  payloads, raw frames, OCR text, vision payloads, action candidates, approved
  actions, commands, raw stream state, raw scheduler results, or perform
  polling/control/game/OS side effects.
- After tightening gameplay runtime status internal flow boundary validation,
  `node --check src\services\dev\gameplayRuntimeStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. Scheduler, gameplay state, vision capture, safe-control,
  action-gate, vision-to-safe-action, safe-action-lifecycle, and game-control
  adapter runtime summaries now validate their boundary policies through the
  shared helper and report the exact missing or false boundary flag. Regression
  coverage rejects unsafe internal boundary changes for vision capture,
  game-control adapter runtime, vision-to-safe-action, and safe-action
  lifecycle summaries. The internal runtime flow reports remain counts/status/
  boolean/script-name summaries only and do not expose endpoint values, raw
  stream state, raw frames, OCR text, vision payloads, action candidates,
  approved actions, commands, or perform polling/control/game/OS side effects.
- After tightening persistence local env profile, local env apply plan, and
  preflight boundary contracts, `node --check
  src\services\dev\persistenceLocalEnvProfile.js`, `node --check
  src\services\dev\persistenceLocalEnvApplyPlan.js`, `node --check
  src\services\dev\persistencePreflight.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. Local env profile/env-group validation and local env apply validation
  now require their full boundary policies through shared helpers, and
  preflight validation now reports the exact missing or false boundary flag.
  Regression coverage rejects profile `no_commands: false`, profile env-group
  `no_store_paths: false`, apply-plan `no_commands: false`, apply-plan
  `no_template_text: false`, preflight `no_commands: false`, and preflight
  `no_candidates: false`. These reports remain env-name/file-name/script-name/
  status/count/policy/operator-label guidance only and do not expose env
  values, secret values, store paths, endpoint values, memory records,
  relationship records, memory summaries, relationship scores, candidates,
  commands, or template text. The apply plan only updates local env files when
  the explicit materialize mode is used.
- After tightening persistence env setup plan and launch plan boundary
  contracts, `node --check src\services\dev\persistenceEnvSetupPlan.js`,
  `node --check src\services\dev\persistenceLaunchPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. `assertPersistenceEnvSetupPlanSafe`, env-group validation, and
  `assertPersistenceLaunchPlanSafe` now report the exact missing or false
  boundary flag. Regression coverage rejects launch-plan `no_candidates:
  false`, env-setup `no_commands: false`, and env-group `no_store_paths:
  false`. These plans remain env-name/script-name/process-id/status/count/
  policy guidance only and do not expose secret values, store paths, endpoint
  values, memory records, relationship records, memory summaries, relationship
  scores, candidates, commands, or perform direct candidate/memory/relationship
  commits.
- After tightening persistence readiness rehearsal, live readiness, and runtime
  status boundary contracts, `node --check
  src\services\dev\persistenceReadinessRehearsal.js`, `node --check
  src\services\dev\persistenceLiveReadiness.js`, `node --check
  src\services\dev\persistenceRuntimeStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. Rehearsal and live readiness now require their report, nested
  verification/env-summary, and gate boundary policies through shared helpers,
  and persistence runtime status now reports the exact missing or false
  top-level boundary flag. Regression coverage rejects unsafe boundary changes
  for live readiness, env setup summaries, candidate gates, readiness
  rehearsal, verification scripts, and runtime status. These reports remain
  read-only status/count/script/policy guidance only and do not expose secret
  values, store paths, endpoint values, memory records, relationship records,
  memory summaries, relationship scores, viewer IDs, display names, candidates,
  commands, or raw runtime state, and they do not perform direct
  candidate/memory/relationship commits.
- After tightening production runtime handoff status and production scheduler
  enablement boundary contracts, `node --check
  src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  src\services\dev\productionSchedulerEnablementPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. Runtime handoff status and scheduler enablement now require their
  top-level boundary policies through shared helpers, and scheduler enablement
  also validates stage and verification-script boundary policies through the
  same missing/false field reporting path. Regression coverage rejects unsafe
  scheduler top-level, stage, and verification-script boundary changes. These
  production reports remain read-only env-name/script-name/status/count/policy
  guidance only and do not expose secret values, endpoint values, live/text
  payloads, support message text, platform identifiers/cursors, memory or
  relationship records, candidates, commands, raw frames, raw scheduler results,
  raw stream state, or child reports, and they do not start polling, control, or
  real scheduler/game/OS side effects.
- After tightening the remaining YouTube readiness rehearsal and production
  probe boundary helpers, `node --check
  src\services\dev\youtubeIngestReadinessRehearsal.js`, `node --check
  src\services\dev\productionProbe.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 316 tests passed. The remaining
  old generic boundary-policy error paths in `src/services/dev` were replaced
  with exact missing/false field reporting. Existing regression coverage
  rejects unsafe YouTube rehearsal report and verification-script boundary
  changes, and production probe report, next-task summary, and stage boundary
  changes. These reports remain read-only script/status/count/policy guidance
  only and do not expose endpoint values, secret values, live/raw payloads,
  support message text, candidates, commands, or perform polling/control/real
  scheduler side effects.
- After tightening the production loop roundtrip report boundary contract,
  `node --check scripts\dev-production-loop-roundtrip.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-production-loop-roundtrip.js`, and
  `node scripts\run-tests.js` passed: all 316 tests passed. The fixture-only
  production loop now explicitly validates its top-level boundary policy before
  printing the report. The roundtrip continues to exercise the local
  TTS/Live2D/subtitle bridge, local engine worker, render-manifest/OBS pickup
  readiness, YouTube fixture ingest with support events, memory/relationship
  persistence, vision observation ingest, and safe simulated game-control ACK
  without exposing endpoint values, secret values, raw YouTube text, raw
  frames, candidates, approved records/actions, store paths, artifact paths, or
  viewer identifiers, and without starting real OBS/Live2D/VOICEVOX or real
  game/OS input.
- After tightening the engine and OBS probe public report boundary contracts,
  `node --check scripts\dev-engine-probe.js`, `node --check
  scripts\dev-obs-probe.js`, `node --check scripts\run-tests.js`, and `node
  scripts\run-tests.js` passed: all 316 tests passed. The unconfigured engine
  probe now validates its public report before returning it, and both engine
  and OBS probes reject false boundary flags in regression tests. These probes
  remain report-only readiness checks for the real TTS/Live2D/OBS foundation:
  they expose only env names, counts, fixed statuses, and script names; they do
  not expose endpoint values, secret values, raw jobs, raw payloads, runtime
  candidates, game actions, or commands, and they do not start real engine
  processes, operate OBS, or perform game/OS input.
- After tightening foundation preflight status-summary boundary validation,
  `node --check src\services\dev\foundationPreflight.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316 tests
  passed. The real TTS/Live2D/OBS preflight now validates both top-level and
  nested foundation status boundary policies through shared exact-field checks,
  and regression coverage rejects a false nested `no_payloads` boundary. The
  preflight remains a read-only launch gate that exposes only env names, script
  names, counts, readiness states, and fixed statuses; it does not expose env
  values, endpoint values, secret values, payloads, candidates, commands, or
  start real engine/OBS/game/OS side effects.
- After tightening local env apply plan and startup checklist boundary
  contracts across the foundation, YouTube ingest, persistence, and gameplay
  startup path, `node --check` passed for the changed dev modules and
  `scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 316
  tests passed. Dry-run apply plans now require
  `read_only_when_dry_run: true` in dry-run mode, materialize mode still
  requires an explicit CLI/apply flag, and YouTube relay, persistence startup,
  gameplay startup, and production runtime handoff checks now report the exact
  missing or false boundary flag instead of a generic boundary failure.
  Regression coverage rejects unsafe dry-run, checklist-step, top-level
  YouTube relay, gameplay runtime, and template/command boundary changes.
  These reports remain env-name/script-name/status/count/policy guidance only:
  they do not expose env values, endpoint values, secret values, store paths,
  platform cursors, support message text, live payloads, memory or relationship
  records/summaries/scores, candidates, commands, raw frames, raw OCR text, or
  approved actions, and they do not start real engines, OBS, polling, game
  control, or OS input.
- After tightening boundary-contract error reporting for the IRIS env loader,
  YouTube relay bridge public reports, vector memory search bridge responses,
  and OBS bridge setup reports, `node --check` passed for the changed config
  and server modules plus `scripts\run-tests.js`, and `node
  scripts\run-tests.js` passed: all 316 tests passed. These validation paths
  now report the exact missing or false boundary flag, including OBS failure
  summary boundaries, and regression coverage rejects unsafe env-loader,
  vector-memory, YouTube-relay, OBS setup, and OBS setup failure boundary
  changes. These remain local/report-only safety contracts: they do not expose
  env values, endpoint values, secret values, support message text, YouTube
  text, raw bridge response bodies, live payloads, memory records, memory
  summaries, candidates, commands, raw frames, or runtime payloads, and they do
  not start real OBS, engines, polling, game control, or OS input.
- After tightening the YouTube ingest source-status CLI, overlay display-event,
  and local bridge Live2D renderer cue boundary contracts, `node --check`
  passed for `scripts\dev-youtube-ingest-source-status.js`,
  `src\server\overlayDisplayEvent.js`,
  `src\server\localBridgeEngineWorker.js`, and `scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 317 tests passed. The YouTube
  source-status CLI now reports the exact missing or false boundary flag,
  overlay display events validate the full subtitle display boundary policy,
  and local bridge engine worker now rejects Live2D renderer cues with drifted
  renderer/text/candidate/command/endpoint/secret boundary flags before
  artifacts can be treated as accepted. Regression coverage rejects unsafe
  source-status, overlay subtitle, and Live2D renderer cue boundary changes.
  These paths remain read-only/report-only or local-bridge validation paths:
  they do not expose endpoint values, secret values, live payloads, support
  message text, platform cursor values, raw final text, raw cue motion/timing,
  candidates, commands, or runtime payloads, and they do not start real
  YouTube polling, OBS, engines, game control, or OS input.
- After adding a safe local bridge engine mode summary to integration status,
  `node --check src\services\dev\integrationStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 317
  tests passed. The integration status for the TTS/Live2D/subtitle local bridge
  worker now includes a counts-only `engine_mode_summary` that distinguishes
  real HTTP TTS/Live2D readiness from local placeholder/cue/VTT modes, reports
  health-check configured counts, and validates its own boundary policy. This
  keeps production handoff state explicit without exposing endpoint values,
  secret values, engine preference values, payloads, commands, raw jobs,
  runtime candidates, or artifact paths, and it does not start real engines,
  OBS, polling, game control, or OS input.
- After adding the same counts-only engine mode summary to the integration
  probe engine-worker report, `node --check
  src\services\dev\integrationProbe.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 317 tests passed. Dry-run
  integration probes now distinguish configured real HTTP TTS/Live2D engines
  from local placeholder mode, expose health-check configured counts, and
  validate the summary boundary policy. This keeps the preflight handoff state
  explicit without exposing endpoint values, secret values, raw jobs, raw
  artifacts, payloads, candidates, commands, or live runtime data, and the
  probe remains read-only unless an explicit synthetic fixture-post mode is
  used.
- After adding a counts-only local bridge worker engine mode summary to
  foundation runtime status, `node --check
  src\services\dev\foundationRuntimeStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 317
  tests passed. Foundation runtime status now reports real HTTP TTS/Live2D
  mode counts, local placeholder/cue/VTT counts, and the production engine
  handoff state alongside the worker runtime summary. The summary validates
  its own boundary policy and remains limited to modes, booleans, and counts:
  it does not expose endpoint values, secret values, raw jobs, text payloads,
  artifact paths, candidates, commands, or runtime payloads, and it does not
  start real engines, OBS, polling, game control, or OS input.
- After carrying the same engine-mode diagnostics into production probe local
  bridge worker checks, `node --check
  src\services\dev\productionProbe.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 317 tests passed. Production
  probe checks for validated runtime bridge handoff, real TTS engine, real
  Live2D bridge, and OBS overlay now include a sanitized
  `engine_mode_summary` copied from integration status, with only modes,
  counts, booleans, and fixed handoff state. The production probe validator
  checks that summary boundary policy and continues to hide endpoint values,
  secret values, payloads, raw jobs, raw artifacts, candidates, commands, and
  live runtime data while remaining a read-only readiness report.
- After adding a counts-only OBS render handoff readiness summary to
  integration status and production probe local bridge worker diagnostics,
  `node --check src\services\dev\integrationStatus.js`, `node --check
  src\services\dev\productionProbe.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 317 tests passed. The local
  bridge worker status now reports whether the outbox/artifact pipeline and
  OBS pickup guards are configured, including the fixed
  `production_obs_pickup_handoff_state`; production probe carries a sanitized
  copy for validated runtime bridge, real TTS engine, real Live2D bridge, and
  OBS overlay checks. The summary is limited to booleans, counts, and fixed
  statuses and validates its boundary policy, so it does not expose endpoint
  values, secret values, artifact paths, payloads, candidates, commands, raw
  jobs, raw artifacts, or live runtime data, and it does not start real OBS,
  engines, polling, game control, or OS input.
- After adding a counts-only OBS pickup startup summary to the production
  readiness runbook operator startup plan, `node --check
  src\services\dev\productionReadinessRunbook.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 317
  tests passed. The operator startup plan now summarizes which startup steps
  still block OBS artifact pickup, the next blocking script name, and the fixed
  `obs_pickup_startup_state`, while keeping the existing launch sequence
  unchanged. This remains operator guidance only: it does not expose endpoint
  values, secret values, payloads, candidates, commands, artifact paths, raw
  jobs, raw artifacts, or live runtime data, and it does not start real OBS,
  engines, polling, game control, or OS input.
- After mirroring the OBS pickup startup summary into the foundation launch
  plan operator startup plan, `node --check
  src\services\dev\foundationLaunchPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 317
  tests passed. Foundation launch planning now reports the OBS pickup blocking
  step counts, readiness-state counts, next blocking script names, and fixed
  `obs_pickup_startup_state` using the same operator guidance boundary as the
  production runbook. The summary remains booleans/counts/script names/env
  names only and does not expose endpoint values, secret values, payloads,
  candidates, commands, artifact paths, raw jobs, raw artifacts, or live
  runtime data, and it does not start real OBS, engines, polling, game
  control, or OS input.
- After carrying the OBS pickup startup summary into production next-task
  operator startup summaries and HTTP launch-plan/next-task regression checks,
  `node --check src\services\dev\productionNextTask.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 317
  tests passed. Production next-task reports now include a sanitized
  `obs_pickup_startup_summary` under the foundation operator startup summary,
  and HTTP tests verify that both the foundation launch endpoint and production
  next-task endpoint expose only the safe OBS pickup startup state and script
  names. This remains read-only guidance and does not expose endpoint values,
  secret values, payloads, candidates, commands, artifact paths, raw jobs, raw
  artifacts, or live runtime data, and it does not start real OBS, engines,
  polling, game control, or OS input.
- After carrying the OBS pickup startup summary into foundation live readiness
  gates and production handoff summaries, `node --check
  src\services\dev\foundationLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 317
  tests passed. Foundation live readiness now includes a sanitized
  `obs_pickup_startup_summary` at report level, inside the OBS gate, and inside
  the production handoff summary so the launch plan, next-task report, and
  live readiness report agree on the operator startup blockers before OBS
  pickup. The summary is limited to booleans, counts, fixed readiness states,
  and script names; it does not expose endpoint values, secret values,
  payloads, candidates, commands, artifact paths, raw jobs, raw artifacts, or
  live runtime data, and it does not start real OBS, engines, polling, game
  control, or OS input.
- After carrying the Foundation OBS pickup startup summary into production
  live readiness aggregation, `node --check
  src\services\dev\productionLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 317
  tests passed. Production live readiness now exposes a sanitized
  `foundation_obs_pickup_startup_summary` at report level, in the Foundation
  priority stage, and in the production handoff summary, using a
  production-live-readiness schema rather than forwarding the Foundation
  object directly. This keeps the aggregate report aligned with Foundation
  live readiness and production next-task while limiting the data to booleans,
  counts, fixed readiness states, and script names; it does not expose
  endpoint values, secret values, payloads, candidates, commands, artifact
  paths, raw jobs, raw artifacts, raw frames, or live runtime data, and it does
  not start real OBS, engines, polling, game control, or OS input.
- After adding a Foundation OBS pickup runtime summary to production runtime
  handoff status, `node --check
  src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 317
  tests passed. Production runtime handoff status now exposes a sanitized
  `foundation_obs_pickup_runtime_summary` at report level and inside the
  production handoff summary, derived from the Foundation runtime handoff
  summary rather than child reports. The summary tracks only OBS pickup
  runtime prerequisites, readiness state, counts, fixed labels, and script
  names, so it aligns the Foundation runtime status with production live
  readiness without exposing endpoint values, secret values, payloads,
  candidates, commands, artifact paths, raw jobs, raw artifacts, raw frames, or
  live runtime data, and it does not start real OBS, engines, polling, game
  control, or OS input.
- After adding HTTP regression coverage for the production runtime handoff
  Foundation OBS pickup runtime summary, `node --check scripts\run-tests.js`,
  `node --check src\services\dev\productionRuntimeHandoffStatus.js`, and
  `node scripts\run-tests.js` passed: all 317 tests passed. The
  `/production/runtime-handoff-status` test now verifies that
  `foundation_obs_pickup_runtime_summary` is exposed with the production
  runtime handoff schema, safe OBS pickup state, adapter-ready count, and
  script-name-only next check, and that the production handoff copy matches the
  report-level state. This locks the HTTP surface to the same safe summary
  contract without exposing endpoint values, secret values, payloads,
  candidates, commands, artifact paths, raw jobs, raw artifacts, raw frames, or
  live runtime data, and it does not start real OBS, engines, polling, game
  control, or OS input.
- After adding HTTP regression coverage for the production probe OBS render
  handoff diagnostics, `node --check scripts\run-tests.js`, `node --check
  src\services\dev\productionProbe.js`, and `node scripts\run-tests.js`
  passed: all 317 tests passed. The `/production/probe` test now verifies that
  `local_bridge_worker_diagnostics.obs_render_handoff_summary` exposes the
  production probe schema, required pickup guard count, local bridge worker
  prerequisite, fixed OBS pickup handoff state, and boundary flags for no
  artifact paths and no candidates. This keeps the production probe HTTP
  surface aligned with the OBS pickup handoff boundary without exposing
  endpoint values, secret values, payloads, candidates, commands, artifact
  paths, raw jobs, raw artifacts, raw frames, or live runtime data, and it does
  not start real OBS, engines, polling, game control, or OS input.
- After adding the OBS artifact and render-handoff dry-run checks to the
  Foundation readiness rehearsal script summary, `node --check
  src\services\dev\foundationReadinessRehearsal.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 317
  tests passed. The rehearsal verification scripts now include
  `npm run dev:bridge:artifact-roundtrip`,
  `npm run dev:obs:render-handoff-roundtrip`, and
  `npm run dev:obs:runtime-render-roundtrip`, and both service-level and HTTP
  tests verify those script-name-only entries. This closes a pre-real-device
  operator guidance gap for OBS pickup without exposing endpoint values,
  secret values, payloads, candidates, commands, artifact paths, raw jobs, raw
  artifacts, raw frames, or live runtime data, and it does not start real OBS,
  engines, polling, game control, or OS input.
- After making original character voice support explicit in the IRIS_20240425
  specification set, `node --check scripts\run-tests.js` and `node
  scripts\run-tests.js` passed: all 317 tests passed. Added
  `IRIS_20240425_cross_phase_addendum_20260503_original_voice.txt` to define
  custom/original TTS voice support, licensed voice-source requirements,
  character voice profile env names, adapter-only voice guidance, and public
  surface boundaries for no endpoint values, secrets, raw voice samples,
  dataset paths, internal model paths, candidates, commands, or commit
  payloads. The spec manifest test now verifies that this addendum is present
  alongside the numbered Phase00-27 files.
- After carrying original character voice support into the local production
  handoff implementation, `node --check` passed for the updated production
  config doctor, Foundation local env profile, Foundation env setup plan,
  integration contracts/status, local engine health probe, local bridge engine
  worker, bridge worker CLI, engine roundtrip CLI, and test runner, and `node
  scripts\run-tests.js` passed: all 317 tests passed. The local TTS/engine
  foundation now recognizes original/custom character voice profile env names
  across `.env.example`, Foundation `.env.local` template/apply-plan surfaces,
  production readiness summaries, integration contracts/status, health probes,
  and local engine worker preference handoff. Public reports expose only
  configured booleans, env names, fixed source-status labels, and boundary
  flags; they do not expose endpoint values, secret values, raw voice samples,
  dataset paths, internal model paths, profile values, candidates, commands,
  raw jobs, or live runtime data, and no real TTS engine, Live2D renderer, OBS
  bridge, YouTube polling, game control, or OS input was started.
- After extending the Foundation launch/operator guidance for original
  character voice setup, `node --check src\services\dev\foundationLaunchPlan.js`,
  `node --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed:
  all 317 tests passed. The VOICEVOX/TTS engine bridge startup step now lists
  the original voice profile/style/license-status env names as optional
  operator configuration, and the launch-plan regression test verifies those
  env names remain present. This keeps startup guidance aligned with the
  original voice addendum and the local engine worker handoff while exposing
  only env names; it does not expose endpoint values, secret values, raw voice
  samples, dataset paths, internal model paths, profile values, candidates,
  commands, raw jobs, or live runtime data, and no real TTS engine, Live2D
  renderer, OBS bridge, YouTube polling, game control, or OS input was started.
- After adding original character voice readiness to Foundation status, `node
  --check src\services\dev\foundationStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 317 tests
  passed. Foundation status now passes the original voice profile/style/license
  env names into the local engine worker handoff and reports only safe booleans
  plus a fixed source-status label for the original voice setup. Invalid
  license-source status is summarized as an operator-review attention reason,
  while missing original voice settings remain non-blocking for generic TTS
  readiness. The public summary also carries explicit boundaries for no voice
  profile values, raw voice samples, or internal model paths; it does not expose
  endpoint values, secret values, profile values, candidates, commands, raw
  jobs, or live runtime data, and no real TTS engine, Live2D renderer, OBS
  bridge, YouTube polling, game control, or OS input was started.
- After adding a regression test for invalid original voice source status,
  `node --check src\services\dev\foundationStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 317 tests
  passed. The test confirms that an unrecognized
  `IRIS_LICENSED_VOICE_SOURCE_STATUS` value is not echoed into public reports
  and instead becomes the fixed `operator_attention_required` source-status
  label plus the `original_voice_source_status_attention` readiness reason.
  This keeps the original/custom voice path license-review gated without
  exposing raw voice-source values, profile values, endpoint values, secrets,
  candidates, commands, raw jobs, or live runtime data, and no real TTS engine,
  Live2D renderer, OBS bridge, YouTube polling, game control, or OS input was
  started.
- After propagating original character voice readiness into production
  next-task diagnostics, `node --check src\services\dev\productionNextTask.js`,
  `node --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed:
  all 317 tests passed. The Foundation priority gate diagnostic now mirrors the
  original voice profile/style/license configured booleans, the fixed source
  status label, and the engine-preference configured flag from Foundation
  status. The production next-task regression fixture now includes the
  original voice env names and verifies that profile values are not exposed.
  This lets production readiness reviewers see whether original/custom voice
  setup is ready without exposing raw voice-source values, profile values,
  endpoint values, secrets, candidates, commands, raw jobs, or live runtime
  data, and no real TTS engine, Live2D renderer, OBS bridge, YouTube polling,
  game control, or OS input was started.
- After propagating original character voice readiness into Foundation and
  production live-readiness gates, `node --check
  src\services\dev\foundationLiveReadiness.js`, `node --check
  src\services\dev\productionLiveReadiness.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 317 tests
  passed. The Foundation real-engine live gate and production live gate
  diagnostic detail now report only configured booleans, the fixed
  `original_voice_source_status` label, and the engine-preference configured
  flag for original/custom character voice setup. Empty environments report
  `not_configured`, ready fixtures report `licensed`, and raw profile values
  are not exposed. This keeps original voice readiness visible for production
  review without exposing endpoint values, secret values, raw voice-source
  values, profile values, raw voice samples, dataset paths, internal model
  paths, YouTube text, support messages, candidates, commands, raw frames, raw
  jobs, or live runtime data, and no real TTS engine, Live2D renderer, OBS
  bridge, YouTube polling, game control, or OS input was started.
- After adding the cross-phase Operator Admin Panel specification,
  `node --check scripts\run-tests.js` and `node scripts\run-tests.js` passed:
  all 317 tests passed. Added
  `IRIS_20240425_cross_phase_addendum_20260503_admin_panel.txt` to define the
  long-running non-technical operator Admin Panel across Phase00-27. The
  addendum covers role access, global dashboard, setup wizards, character and
  voice settings, Live2D/motion/camera settings, OBS/overlay settings,
  YouTube/support ingest, memory and relationship management, safety and
  moderation, game operation, stream modes, scenario rehearsal, diagnostics,
  backups, analytics, multi-character operation, notifications, audit trail,
  implementation priority, and acceptance criteria. It explicitly keeps
  Admin Panel write actions behind existing validators and adapter boundaries,
  including no direct memory/relationship candidate commits, no direct
  `input_action_candidate` handoff, and no Phase16+ internal profile promotion
  to canonical enums. The same addendum was copied to the operator-facing
  `Downloads\IRIS_20240425` specification folder. No secrets, endpoint values,
  YouTube text, support messages, candidate payloads, commands, raw frames, raw
  voice samples, dataset paths, internal model paths, raw jobs, or live runtime
  data were exposed, and no real TTS engine, Live2D renderer, OBS bridge,
  YouTube polling, game control, or OS input was started.
- After adding the PostgreSQL relationship-scale addendum, `node --check
  scripts\run-tests.js` and `node scripts\run-tests.js` passed: all 317 tests
  passed. Added
  `IRIS_20240425_cross_phase_addendum_20260503_relationship_scale_postgresql.txt`
  to require PostgreSQL-backed production persistence for 1,000,000+ viewer
  relationship profiles and long-term approved memory summaries. The addendum
  defines an owner/operator-only internal relationship stage from 0 to 99,
  public relationship levels as 8 positive/open labels plus the separate
  safety-distance `bounded` label, indexed/paginated DB access, archival and
  summary requirements, first-class moderation/blocklist states, and Admin
  Panel scale requirements. Updated the Admin Panel addendum with PostgreSQL
  readiness, 1,000,000+ capacity checklist, internal-stage distribution,
  blocklist, temporary mute, limited interaction, unblock workflow, moderation
  search, and moderation audit requirements. The new and updated addenda were
  copied to the operator-facing `Downloads\IRIS_20240425` specification folder.
  This was a specification-only change; no PostgreSQL implementation or real
  external service was started, and no secrets, endpoint values, raw viewer
  messages, support messages, candidates, commands, raw frames, raw voice
  samples, dataset paths, internal model paths, raw jobs, or live runtime data
  were exposed.
- After starting implementation of the PostgreSQL-scale relationship and
  moderation readiness path, `node --check
  src\services\dev\productionConfigDoctor.js`, `node --check
  src\services\dev\persistencePreflight.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 317 tests
  passed. Added PostgreSQL-scale env names to `.env.example`, including the
  persistence backend, PostgreSQL connection configured flag source, migration
  readiness, index readiness, backup readiness, target viewer profile capacity,
  moderation store enablement, blocklist enablement, internal relationship
  stage count, and public relationship level count. Production config doctor
  now summarizes PostgreSQL million-profile readiness using only safe booleans,
  fixed labels, env names, and capacity bands, and treats a fully configured
  PostgreSQL path as the persistence mode without exposing connection values.
  Persistence preflight now carries the same high-level PostgreSQL,
  relationship-scale, and moderation readiness flags plus policy labels for
  `0_to_99` internal relationship stages and `8_plus_bounded` public levels.
  This does not implement the PostgreSQL store yet and does not open any DB
  connection; it is a safe readiness/configuration surface only. No secrets,
  connection values, endpoint values, raw viewer messages, support messages,
  candidates, commands, raw frames, raw voice samples, dataset paths, internal
  model paths, raw jobs, or live runtime data were exposed, and no real TTS
  engine, Live2D renderer, OBS bridge, YouTube polling, game control, database
  process, or OS input was started.
- After adding a safe PostgreSQL persistence migration planning surface,
  `node --check src\services\dev\postgresPersistenceMigrationPlan.js`,
  `node --check scripts\dev-postgres-persistence-migration-plan.js`, `node
  --check scripts\run-tests.js`, `node scripts\run-tests.js`, and `node
  scripts\dev-postgres-persistence-migration-plan.js` passed: all 317 tests
  passed and the new CLI emitted only a read-only migration plan. Added
  `src\services\dev\postgresPersistenceMigrationPlan.js` and
  `scripts\dev-postgres-persistence-migration-plan.js`, plus the
  `dev:persistence:postgres-migration-plan` package script. The plan defines
  schema-only table groups, six non-destructive migration IDs, sixteen index
  IDs, moderation states including `blocked`, PostgreSQL million-profile
  readiness flags, `0_to_99` internal relationship stage policy,
  `8_plus_bounded` public relationship policy, backup-review requirements, and
  verification script names. Safety assertions reject connection strings,
  endpoint strings, secret-bearing fields, raw SQL, command fields, candidate
  payloads, viewer text, and support messages. This does not implement or run a
  PostgreSQL store yet and does not open any DB connection; it is a reviewable
  migration/readiness plan only. No secrets, connection values, endpoint values,
  raw viewer messages, support messages, candidates, commands, raw frames, raw
  voice samples, dataset paths, internal model paths, raw jobs, or live runtime
  data were exposed, and no real TTS engine, Live2D renderer, OBS bridge,
  YouTube polling, game control, database process, or OS input was started.
- After adding the first PostgreSQL private adapter contract layer, `node
  --check src\services\persistence\postgresPersistenceAdapterContract.js`,
  `node --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed:
  all 319 tests passed. Added
  `src\services\persistence\postgresPersistenceAdapterContract.js` to convert
  approved memory and approved relationship records into safe PostgreSQL write
  plans without exposing parameter values. The contract accepts only
  `approved_memory_record` and `approved_relationship_record` inputs, rejects
  direct candidate and command fields, names only target tables, operation IDs,
  and column names, requires private prepared-statement adapters and
  transactions, and keeps relationship scale policies fixed as `0_to_99`
  internal stages and `8_plus_bounded` public levels. New tests confirm that
  raw summaries, display names, approved record schema names, candidate schema
  names, command fields, SQL, connection strings, endpoint strings, and
  parameter values do not appear in public write plans. This does not implement
  the real PostgreSQL writer yet and does not open any DB connection; it is the
  contract boundary that the future private DB adapter must satisfy. No
  secrets, connection values, endpoint values, raw viewer messages, support
  messages, candidates, commands, raw frames, raw voice samples, dataset paths,
  internal model paths, raw jobs, or live runtime data were exposed, and no real
  TTS engine, Live2D renderer, OBS bridge, YouTube polling, game control,
  database process, or OS input was started.
- After adding a mock PostgreSQL persistence adapter roundtrip, `node --check
  src\services\persistence\mockPostgresPersistenceAdapter.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 321 tests
  passed. Added
  `src\services\persistence\mockPostgresPersistenceAdapter.js` to exercise the
  private PostgreSQL adapter contract without opening a DB connection. The mock
  adapter accepts only approved memory and approved relationship records,
  creates the safe PostgreSQL write plans internally, simulates idempotent
  memory upserts and relationship aggregate/event operations, tracks duplicate
  counts and per-table operation counts, and reports only counts, fixed table
  names, fixed operation IDs, and safe booleans. New tests confirm that raw
  memory summaries, relationship summaries, display names, event IDs, approved
  record schema names, candidate schema names, candidate payloads, SQL,
  endpoint strings, connection strings, and command fields do not appear in
  public mock adapter results or status. This still does not implement the real
  PostgreSQL writer, migrations, backup runner, or real DB connection; it is an
  in-process contract roundtrip for the future private DB adapter. No secrets,
  connection values, endpoint values, raw viewer messages, support messages,
  candidates, commands, raw frames, raw voice samples, dataset paths, internal
  model paths, raw jobs, or live runtime data were exposed, and no real TTS
  engine, Live2D renderer, OBS bridge, YouTube polling, game control, database
  process, or OS input was started.
- After wiring the mock PostgreSQL persistence path into runtime configuration,
  `node --check src\services\persistence\mockPostgresPersistenceAdapter.js`,
  `node --check src\runtime\runtimeConfig.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 322 tests
  passed. Runtime config now keeps the default persistence backend as
  `json_store`, and selects the PostgreSQL mock store path only when
  `IRIS_PERSISTENCE_BACKEND=postgresql` and
  `IRIS_POSTGRES_MOCK_ADAPTER_ENABLED=true` are both configured. The mock
  runtime stores preserve the existing pipeline-facing memory and relationship
  store APIs while routing approved records through the PostgreSQL write-plan
  contract and mock adapter. Public runtime status reports safe schemas,
  counts, fixed table names, `0_to_99` internal relationship policy,
  `8_plus_bounded` public relationship policy, and false real-DB connection
  flags only. Added `IRIS_POSTGRES_MOCK_ADAPTER_ENABLED=false` to
  `.env.example`. New tests confirm a full comment pipeline can commit
  approved memory and relationship records through the mock PostgreSQL path
  without exposing display names, approved record schema names, connection
  strings, endpoint strings, SQL, candidate payloads, or parameter values in
  public store status. This is still not the real PostgreSQL writer; no DB
  connection, migration, backup runner, or external service is started. No
  secrets, connection values, endpoint values, raw viewer messages, support
  messages, candidates, commands, raw frames, raw voice samples, dataset paths,
  internal model paths, raw jobs, or live runtime data were exposed, and no real
  TTS engine, Live2D renderer, OBS bridge, YouTube polling, game control,
  database process, or OS input was started.
- After adding safe PostgreSQL persistence failure classification, `node --check
  src\services\persistence\postgresPersistenceErrors.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 323 tests
  passed. Added `src\services\persistence\postgresPersistenceErrors.js` so the
  future real PostgreSQL writer can classify common database and contract
  failures into fixed public error kinds before returning status. The result
  surface reports only schema, operation status, sanitized operation kind,
  fixed error kind, retryability, false real-DB connection state for failures,
  and explicit boundary-policy booleans. Tests cover unique, foreign-key, check,
  not-null, serialization, deadlock, authentication, capacity, connection,
  timeout, contract, and generic unavailable classifications, and confirm that
  SQL, connection strings, endpoint fragments, raw error messages, stack traces,
  details, hints, parameter values, candidates, commands, and record payloads do
  not appear in public failure results. This still does not implement the real
  PostgreSQL writer or open any DB connection; it is the safe failure-reporting
  layer needed before real adapter implementation. No secrets, connection
  values, endpoint values, raw viewer messages, support messages, candidates,
  commands, raw frames, raw voice samples, dataset paths, internal model paths,
  raw jobs, or live runtime data were exposed, and no real TTS engine, Live2D
  renderer, OBS bridge, YouTube polling, game control, database process, or OS
  input was started.
- After adding the injected real PostgreSQL persistence adapter boundary,
  `node --check src\services\persistence\postgresPersistenceAdapter.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  325 tests passed. Added
  `src\services\persistence\postgresPersistenceAdapter.js` as the first real
  writer-facing adapter layer. It accepts only approved memory and approved
  relationship records through the existing PostgreSQL write-plan contract,
  calls an injected private prepared-statement executor with private parameter
  values, and returns public success or failure results that contain only fixed
  schemas, operation IDs, table names, counts, booleans, and safe error kinds.
  Tests confirm that private summaries and viewer labels reach only the injected
  executor values and never appear in public adapter results or status. Failure
  tests confirm executor errors with SQL, connection strings, secret fragments,
  and private text are converted through the safe PostgreSQL failure classifier.
  This still does not add a concrete `pg` client, connection pool, migration
  runner, backup runner, or runtime real-DB activation; those remain
  configuration/operator-controlled next steps. No secrets, connection values,
  endpoint values, raw viewer messages, support messages, candidates, commands,
  raw frames, raw voice samples, dataset paths, internal model paths, raw jobs,
  or live runtime data were exposed, and no real TTS engine, Live2D renderer,
  OBS bridge, YouTube polling, game control, database process, or OS input was
  started.
- After adding the PostgreSQL prepared-statement executor boundary, `node
  --check src\services\persistence\postgresPreparedStatementExecutor.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  327 tests passed. Added
  `src\services\persistence\postgresPreparedStatementExecutor.js` to map the
  fixed private statement IDs used by the PostgreSQL adapter to internal SQL
  text and private parameter arrays behind an injected `pool.query` compatible
  object. Public executor status reports only fixed schema IDs, executor state,
  prepared-statement count, per-statement counts, per-table counts, safe
  booleans, and boundary-policy flags. Tests confirm SQL text and private
  values are passed only to the injected private pool call and never appear in
  public status; unsupported statement IDs and invalid value counts are rejected
  before any pool call. This still does not add or import the real `pg`
  package, create a connection pool, read a connection string, run migrations,
  start a DB process, or activate runtime real-DB persistence. No secrets,
  connection values, endpoint values, raw viewer messages, support messages,
  candidates, commands, raw frames, raw voice samples, dataset paths, internal
  model paths, raw jobs, or live runtime data were exposed, and no real TTS
  engine, Live2D renderer, OBS bridge, YouTube polling, game control, database
  process, or OS input was started.
- After adding the PostgreSQL pool factory plan, `node --check
  src\services\persistence\postgresPoolFactoryPlan.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 329 tests
  passed. Added `src\services\persistence\postgresPoolFactoryPlan.js` to
  summarize real PostgreSQL pool readiness from env names without creating a
  pool or attempting a connection. The plan reports connection configured
  status, SSL mode policy, bounded pool size, bounded idle timeout, bounded
  statement timeout, missing env names, and the private pool factory contract
  while keeping connection strings and endpoint values private. Added
  `IRIS_POSTGRES_IDLE_TIMEOUT_MS` and `IRIS_POSTGRES_STATEMENT_TIMEOUT_MS` to
  `.env.example`. Tests confirm configured and missing-connection cases, numeric
  fallback behavior, unsafe SSL fallback, and rejection of any public connection
  value field. This still does not import the real `pg` package, create a
  connection pool, run migrations, start a DB process, or activate runtime
  real-DB persistence. No secrets, connection values, endpoint values, raw
  viewer messages, support messages, candidates, commands, raw frames, raw
  voice samples, dataset paths, internal model paths, raw jobs, or live runtime
  data were exposed, and no real TTS engine, Live2D renderer, OBS bridge,
  YouTube polling, game control, database process, or OS input was started.
- After adding the operator-controlled PostgreSQL private pool factory
  boundary, `node --check
  src\services\persistence\postgresPrivatePoolFactory.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 331 tests
  passed. Added `src\services\persistence\postgresPrivatePoolFactory.js` to
  create a real pool only when a private `PoolClass` is injected, the pool
  factory plan is ready, and an explicit operator-controlled flag is true. The
  private constructor receives the connection string and pool options, while
  public factory results and status expose only fixed schema IDs, pool-created
  booleans, safe configuration policy, bounded numeric settings, counts, and a
  summary-only failure kind. Tests confirm disabled operators block pool
  creation, enabled operators pass private connection options only into the
  injected constructor, and constructor failures remain summary-only without
  leaking connection strings or error messages. This still does not import the
  real `pg` package, create a real network connection, run migrations, start a
  DB process, or activate runtime real-DB persistence. No secrets, connection
  values, endpoint values, raw viewer messages, support messages, candidates,
  commands, raw frames, raw voice samples, dataset paths, internal model paths,
  raw jobs, or live runtime data were exposed, and no real TTS engine, Live2D
  renderer, OBS bridge, YouTube polling, game control, database process, or OS
  input was started.
- After adding the runtime real-PostgreSQL adapter gate, `node --check
  src\runtime\runtimeConfig.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 332 tests passed. Runtime config now
  distinguishes the requested persistence backend from the active persistence
  stores. When `IRIS_PERSISTENCE_BACKEND=postgresql` and the mock adapter is not
  enabled, runtime reports a safe `postgresRealAdapterGate` and keeps JSON
  fallback stores active unless `IRIS_POSTGRES_REAL_ADAPTER_ENABLED=true` and
  the private pool factory is later injected. Added
  `IRIS_POSTGRES_REAL_ADAPTER_ENABLED=false` to `.env.example`. Tests confirm
  that real PostgreSQL requests do not open a DB connection, do not create a
  pool, do not expose connection strings, and report either
  `real_adapter_blocked` or `real_adapter_pending` with a safe fallback reason.
  This still does not import the real `pg` package, create a real network
  connection, run migrations, start a DB process, or activate runtime real-DB
  persistence. No secrets, connection values, endpoint values, raw viewer
  messages, support messages, candidates, commands, raw frames, raw voice
  samples, dataset paths, internal model paths, raw jobs, or live runtime data
  were exposed, and no real TTS engine, Live2D renderer, OBS bridge, YouTube
  polling, game control, database process, or OS input was started.
- After adding async candidate persistence and PostgreSQL adapter-backed store
  wrappers, `node --check src\services\persistence\postgresPersistenceStores.js`,
  `node --check src\services\persistence\candidateValidator.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 333 tests
  passed. Added `commitValidatedCandidateRecordsAsync` so future real database
  writes can await approved memory and relationship commits without changing the
  existing synchronous JSON persistence path. Added
  `src\services\persistence\postgresPersistenceStores.js` to expose async
  memory and relationship store APIs backed by the PostgreSQL persistence
  adapter. Public store status remains counts-only and reports fixed schemas,
  table operation counts, relationship policies, connection-attempt booleans,
  and boundary flags only. Tests confirm approved records pass through the
  async adapter path and private summaries, viewer labels, connection strings,
  SQL, candidate payloads, and approved record payloads do not appear in public
  persistence results or store status. This still does not import the real `pg`
  package, create a real network connection, run migrations, start a DB process,
  or activate runtime real-DB persistence. No secrets, connection values,
  endpoint values, raw viewer messages, support messages, candidates, commands,
  raw frames, raw voice samples, dataset paths, internal model paths, raw jobs,
  or live runtime data were exposed, and no real TTS engine, Live2D renderer,
  OBS bridge, YouTube polling, game control, database process, or OS input was
  started.
- After adding the PostgreSQL runtime persistence composition factory, `node
  --check src\services\persistence\postgresRuntimePersistenceFactory.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  335 tests passed. Added
  `src\services\persistence\postgresRuntimePersistenceFactory.js` to compose
  the operator-controlled private pool factory, prepared-statement executor,
  PostgreSQL persistence adapter, and async PostgreSQL store wrappers. The
  factory returns safe public creation results and only builds stores when the
  private pool factory returns a pool; otherwise it blocks before store
  creation. Tests confirm the composed path can persist an approved memory
  record through private query values while public factory, persistence, and
  store status omit connection strings, SQL, private summaries, candidates, and
  record payloads. A separate test confirms operator-disabled execution does not
  construct the pool and reports no DB connection attempt. This still uses an
  injected fake PoolClass in tests and does not import the real `pg` package,
  create a real network connection, run migrations, start a DB process, or
  activate runtime real-DB persistence. No secrets, connection values, endpoint
  values, raw viewer messages, support messages, candidates, commands, raw
  frames, raw voice samples, dataset paths, internal model paths, raw jobs, or
  live runtime data were exposed, and no real TTS engine, Live2D renderer, OBS
  bridge, YouTube polling, game control, database process, or OS input was
  started.
- After wiring the PostgreSQL runtime persistence composition factory into
  runtime configuration, `node --check src\runtime\runtimeConfig.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  336 tests passed. `createRuntimeConfig` now accepts an optional private
  runtime injection object and can select real PostgreSQL-backed memory and
  relationship stores only when `IRIS_PERSISTENCE_BACKEND=postgresql`, the mock
  adapter is disabled, `IRIS_POSTGRES_REAL_ADAPTER_ENABLED=true`, a private
  PoolClass is injected, and explicit private pool creation is allowed. When
  those conditions are met, runtime reports `postgresAdapterMode=real`, marks
  the PostgreSQL gate as `real_adapter_injected`, exposes the safe factory
  result, and keeps public status counts-only. Added a runtime-level test that
  persists approved memory and relationship records through injected private
  query values while verifying public runtime gate, factory result,
  persistence result, and store status omit connection values, SQL, private
  summaries, viewer labels, candidate payloads, and approved record payloads.
  The default runtime path still keeps JSON fallback active unless the private
  injection is supplied. This still uses an injected fake PoolClass in tests and
  does not import the real `pg` package, create a real network connection, run
  migrations, start a DB process, or perform live runtime real-DB persistence.
  No secrets, connection values, endpoint values, raw viewer messages, support
  messages, candidates, commands, raw frames, raw voice samples, dataset paths,
  internal model paths, raw jobs, or live runtime data were exposed, and no
  real TTS engine, Live2D renderer, OBS bridge, YouTube polling, game control,
  database process, or OS input was started.
- After adding the injected `pg` module resolver boundary, `node --check
  src\services\persistence\postgresPgModuleResolver.js`, `node --check
  src\runtime\runtimeConfig.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 338 tests passed. Added
  `src\services\persistence\postgresPgModuleResolver.js` to safely extract a
  `Pool` constructor from an already-injected module-like object without doing
  dynamic imports, opening connections, or exposing module contents. Runtime
  config can now use either an explicitly injected `postgresPoolClass` or an
  injected `postgresModule` with `Pool`/`default.Pool` to compose real
  PostgreSQL-backed stores under the existing operator gates. Tests confirm the
  resolver reports only safe booleans/status, never exposes unsafe injected
  object values, and can drive the runtime persistence path while public
  resolver, factory, persistence, and store status omit connection values, SQL,
  private summaries, viewer labels, candidates, commands, and record payloads.
  This still does not install or import the real `pg` package, create a real
  network connection, run migrations, start a DB process, or perform live
  runtime real-DB persistence. No secrets, connection values, endpoint values,
  raw viewer messages, support messages, candidates, commands, raw frames, raw
  voice samples, dataset paths, internal model paths, raw jobs, or live runtime
  data were exposed, and no real TTS engine, Live2D renderer, OBS bridge,
  YouTube polling, game control, database process, or OS input was started.
- After adding the PostgreSQL migration review gate, `node --check
  src\services\dev\postgresMigrationReviewGate.js`, `node --check
  src\services\dev\postgresPersistenceMigrationPlan.js`, `node --check
  scripts\dev-postgres-migration-review-gate.js`, `node --check
  scripts\run-tests.js`, `node scripts\run-tests.js`, and `node
  scripts\dev-postgres-migration-review-gate.js` passed: all 338 tests passed,
  and the CLI reported `configuration_waiting` in the unconfigured local
  environment. Added `src\services\dev\postgresMigrationReviewGate.js` and
  `npm run dev:persistence:postgres-migration-review-gate` to create a
  read-only operator review boundary between the migration plan and any future
  private migration runner. The gate reports safe migration IDs, counts,
  readiness booleans, and whether the private runner is allowed only after
  configuration is ready and operator review is explicitly approved. Tests
  confirm ready plans remain blocked until review, approved ready plans become
  `ready_for_private_migration_runner`, missing configuration remains blocked,
  destructive migration stays false, and public reports omit connection values,
  SQL, viewer/support text, candidates, commands, and record payloads. This
  still does not install or import the real `pg` package, create a real network
  connection, run migrations, start a DB process, or perform live runtime
  real-DB persistence. No secrets, connection values, endpoint values, raw
  viewer messages, support messages, candidates, commands, raw frames, raw
  voice samples, dataset paths, internal model paths, raw jobs, or live runtime
  data were exposed, and no real TTS engine, Live2D renderer, OBS bridge,
  YouTube polling, game control, database process, or OS input was started.
- After adding the PostgreSQL private migration runner dry-run boundary, `node
  --check src\services\dev\postgresPrivateMigrationRunnerDryRun.js`, `node
  --check src\services\dev\postgresPersistenceMigrationPlan.js`, `node --check
  scripts\dev-postgres-private-migration-runner-dry-run.js`, `node --check
  scripts\run-tests.js`, `node scripts\run-tests.js`, and `node
  scripts\dev-postgres-private-migration-runner-dry-run.js` passed: all 338
  tests passed, and the CLI reported `blocked_before_private_runner` in the
  unconfigured local environment. Added
  `src\services\dev\postgresPrivateMigrationRunnerDryRun.js` and `npm run
  dev:persistence:postgres-migration-runner-dry-run` to model the future private
  migration runner without executing SQL, opening a DB connection, or applying
  migrations. The dry-run accepts only the safe review gate output, reports
  planned migration IDs and counts, and remains blocked until configuration and
  operator review are both complete. Tests confirm ready reviewed plans become
  `ready_for_private_runner`, unreviewed or unconfigured plans remain blocked,
  destructive migration stays false, no migration is applied, and public output
  omits connection values, SQL, viewer/support text, candidates, commands, and
  record payloads. This still does not install or import the real `pg` package,
  create a real network connection, run migrations, start a DB process, or
  perform live runtime real-DB persistence. No secrets, connection values,
  endpoint values, raw viewer messages, support messages, candidates, commands,
  raw frames, raw voice samples, dataset paths, internal model paths, raw jobs,
  or live runtime data were exposed, and no real TTS engine, Live2D renderer,
  OBS bridge, YouTube polling, game control, database process, or OS input was
  started.
- After adding the PostgreSQL health and rollback rehearsal boundary, `node
  --check src\services\dev\postgresHealthRollbackRehearsal.js`, `node --check
  src\services\dev\postgresPersistenceMigrationPlan.js`, `node --check
  scripts\dev-postgres-health-rollback-rehearsal.js`, `node --check
  scripts\run-tests.js`, `node scripts\run-tests.js`, and `node
  scripts\dev-postgres-health-rollback-rehearsal.js` passed: all 338 tests
  passed, and the CLI reported `configuration_waiting` in the unconfigured
  local environment. Added
  `src\services\dev\postgresHealthRollbackRehearsal.js` and `npm run
  dev:persistence:postgres-health-rollback-rehearsal` to model the required
  health snapshot, backup/restore rehearsal, migration dry-run review, and
  rollback review preconditions before any future private migration runner can
  be used operationally. The rehearsal report stays read-only and returns only
  readiness booleans, step IDs, script names, and migration/table/index counts.
  Tests confirm the rehearsal remains `configuration_waiting` until backup,
  restore, health check, rollback rehearsal, migration configuration, and
  operator review are all ready; when all are configured, it reports
  `ready_for_operator_runbook` without opening a DB connection, applying a
  migration, executing rollback, or allowing destructive migration. Public
  output omits connection values, SQL, viewer/support text, candidates,
  commands, and record payloads. This still does not install or import the real
  `pg` package, create a real network connection, run migrations, start a DB
  process, or perform live runtime real-DB persistence. No secrets, connection
  values, endpoint values, raw viewer messages, support messages, candidates,
  commands, raw frames, raw voice samples, dataset paths, internal model paths,
  raw jobs, or live runtime data were exposed, and no real TTS engine, Live2D
  renderer, OBS bridge, YouTube polling, game control, database process, or OS
  input was started.
- After adding the TTS/Live2D/OBS foundation operator run gate, `node --check
  src\services\dev\foundationOperatorRunGate.js`, `node --check
  scripts\dev-foundation-operator-run-gate.js`, `node --check
  scripts\run-tests.js`, `node scripts\run-tests.js`, and `node
  scripts\dev-foundation-operator-run-gate.js` passed: all 338 tests passed,
  and the CLI reported `operator_review_required` in the current local
  configuration while confirming that no process, network request, or OBS
  operation was performed. Added
  `src\services\dev\foundationOperatorRunGate.js` and `npm run
  dev:foundation:operator-run-gate` to sit between the existing foundation
  launch plan and any real TTS/Live2D/OBS process start. The gate reports only
  process IDs, readiness counts, script names, and explicit booleans for
  operator approval and process-start allowance. Tests confirm ready foundation
  configuration stays blocked until `operatorRunApproved=true`, approved ready
  configuration becomes `ready_for_operator_process_start`, missing
  configuration remains `configuration_waiting`, and public output omits
  endpoint values, secret values, raw packets, candidates, commands, runtime
  payloads, and OBS artifacts. This still does not start VOICEVOX, Live2D,
  local bridge workers, dev server, OBS setup, browser source operations, or
  any real network request. No secrets, connection values, endpoint values, raw
  viewer messages, support messages, candidates, commands, raw frames, raw
  voice samples, dataset paths, internal model paths, raw jobs, or live runtime
  data were exposed, and no real TTS engine, Live2D renderer, OBS bridge,
  YouTube polling, game control, database process, or OS input was started.
- After adding the TTS/Live2D/OBS foundation process handoff dry-run, `node
  --check src\services\dev\foundationProcessHandoffDryRun.js`, `node --check
  scripts\dev-foundation-process-handoff-dry-run.js`, `node --check
  scripts\run-tests.js`, `node scripts\run-tests.js`, and `node
  scripts\dev-foundation-process-handoff-dry-run.js` passed: all 338 tests
  passed, and the CLI reported `blocked_before_operator_terminal_handoff`
  because the operator run gate was not approved. Added
  `src\services\dev\foundationProcessHandoffDryRun.js` and `npm run
  dev:foundation:process-handoff-dry-run` to model the post-approval terminal
  handoff without starting services. The dry-run consumes the operator run gate,
  reports process IDs, readiness counts, script availability, and handoff
  states, and remains blocked until the foundation is configured and
  `IRIS_FOUNDATION_OPERATOR_RUN_APPROVED=true`. Tests confirm approved ready
  configuration becomes `ready_for_operator_terminal_handoff`, unapproved or
  missing configuration remains blocked, and no process, network request, TTS
  engine, Live2D renderer, or OBS operation is started. Public output omits
  endpoint values, secret values, raw packets, candidates, commands, runtime
  payloads, and OBS artifacts. This still does not start VOICEVOX, Live2D,
  local bridge workers, dev server, OBS setup, browser source operations, or
  any real network request. No secrets, connection values, endpoint values, raw
  viewer messages, support messages, candidates, commands, raw frames, raw
  voice samples, dataset paths, internal model paths, raw jobs, or live runtime
  data were exposed, and no real TTS engine, Live2D renderer, OBS bridge,
  YouTube polling, game control, database process, or OS input was started.
- After adding the TTS/Live2D/OBS foundation post-start health checklist,
  `node --check src\services\dev\foundationPostStartHealthChecklist.js`,
  `node --check scripts\dev-foundation-post-start-health-checklist.js`, `node
  --check scripts\run-tests.js`, `node scripts\run-tests.js`, and `node
  scripts\dev-foundation-post-start-health-checklist.js` passed: all 338 tests
  passed, and the CLI reported `blocked_before_operator_handoff` in the
  current local configuration because the operator run approval flag was not
  set. Added `src\services\dev\foundationPostStartHealthChecklist.js`,
  `scripts\dev-foundation-post-start-health-checklist.js`, and `npm run
  dev:foundation:post-start-health-checklist` to aggregate the post-start
  health verification scripts for TTS/Live2D/OBS without executing probes. The
  checklist consumes the process handoff dry-run, reports only process IDs,
  check IDs, counts, script names, and explicit booleans for probe/network/OBS
  non-execution, and remains blocked until the foundation is configured and
  `IRIS_FOUNDATION_OPERATOR_RUN_APPROVED=true`. Tests confirm ready handoff
  exposes five operator-run health checks, missing configuration keeps all five
  checks blocked, and public output omits endpoint values, secret values, raw
  packets, candidates, commands, runtime payloads, and OBS artifacts. This
  still does not start VOICEVOX, Live2D, local bridge workers, dev server, OBS
  setup, browser source operations, health probes, or any real network request.
  No secrets, connection values, endpoint values, raw viewer messages, support
  messages, candidates, commands, raw frames, raw voice samples, dataset paths,
  internal model paths, raw jobs, or live runtime data were exposed, and no
  real TTS engine, Live2D renderer, OBS bridge, YouTube polling, game control,
  database process, or OS input was started.
- After exposing the TTS/Live2D/OBS foundation post-start health checklist over
  the local HTTP debug surface, `node --check src\server\httpServer.js`, `node
  --check src\server\debugPage.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 338 tests passed. Added the
  read-only `GET /production/foundation-post-start-health-checklist` endpoint
  and debug-console link so an operator/admin surface can inspect the same
  post-start health checklist without running probes. The endpoint returns the
  checklist schema, IDs, counts, script names, and non-execution booleans only;
  tests assert the response omits endpoint values and input-action candidates
  and still passes the checklist safety contract. This does not execute health
  probes, perform network calls beyond the local test HTTP request, touch OBS,
  start TTS/Live2D/local bridge/dev-server processes, poll YouTube, operate a
  game, open a database process, or send OS input.
- After adding the YouTube ingest post-start checklist, `node --check
  src\services\dev\youtubeIngestPostStartChecklist.js`, `node --check
  scripts\dev-youtube-ingest-post-start-checklist.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-youtube-ingest-post-start-checklist.js`,
  and `node scripts\run-tests.js` passed: all 338 tests passed, and the CLI
  reported `blocked_before_youtube_ingest_start` in the current local
  configuration. Added
  `src\services\dev\youtubeIngestPostStartChecklist.js`,
  `scripts\dev-youtube-ingest-post-start-checklist.js`, and `npm run
  dev:youtube:post-start-checklist` to aggregate the post-start verification
  scripts for YouTube comments/support ingest without polling YouTube or
  reading live payloads. The checklist consumes the live readiness report,
  reports only fixed check IDs, gate IDs, counts, script names, source mode,
  and explicit non-execution booleans, and keeps all checks blocked until live
  readiness reaches `ready_for_youtube_live_ingest`. Tests confirm missing
  configuration keeps all six checks blocked, support messages and amount
  values are not exposed, and memory/relationship candidates are not committed
  by the checklist. No secrets, endpoint values, platform IDs, cursor values,
  YouTube message text, support message text, support amount values, raw
  payloads, candidates, commands, raw scheduler results, or raw stream state
  were exposed.
- After exposing the YouTube ingest post-start checklist over the local HTTP
  debug surface, `node --check src\server\httpServer.js`, `node --check
  src\server\debugPage.js`, `node --check scripts\run-tests.js`, and `node
  scripts\run-tests.js` passed: all 338 tests passed. Added the read-only
  `GET /production/youtube-post-start-checklist` endpoint and debug-console
  link so an operator/admin surface can inspect the same YouTube post-start
  checklist without starting polling. The endpoint returns IDs, counts, script
  names, source mode, fixed statuses, and non-execution booleans only; tests
  assert the response omits endpoint values and input-action candidates and
  still passes the post-start checklist safety contract. This does not poll
  YouTube, start OAuth, refresh tokens, call the YouTube API, read support
  messages, commit memory or relationship candidates, start the ingest
  scheduler, touch OBS/TTS/Live2D, operate a game, open a database process, or
  send OS input.
- After adding the persistence post-start checklist, `node --check
  src\services\dev\persistencePostStartChecklist.js`, `node --check
  scripts\dev-persistence-post-start-checklist.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-persistence-post-start-checklist.js`,
  and `node scripts\run-tests.js` passed: all 338 tests passed, and the CLI
  reported `blocked_before_persistence_operation` in the current local
  configuration. Added
  `src\services\dev\persistencePostStartChecklist.js`,
  `scripts\dev-persistence-post-start-checklist.js`, and `npm run
  dev:persistence:post-start-checklist` to aggregate the post-start
  verification scripts for memory and relationship persistence. The checklist
  consumes the live readiness report, reports only fixed check IDs, gate IDs,
  counts, script names, persistence mode, vector memory mode, and explicit
  non-execution booleans, and keeps all checks blocked until live persistence
  readiness reaches `ready_for_persistence_operation`. Tests confirm missing
  configuration keeps all eight checks blocked, candidate commits are not
  performed, approved memory records and relationship profiles are not read by
  the checklist, and store writes are not attempted. No secrets, endpoint
  values, store paths, connection values, SQL values, memory records,
  relationship records, memory summaries, relationship scores, viewer IDs,
  display names, candidates, commands, raw frames, or raw runtime data were
  exposed.
- After exposing the persistence post-start checklist over the local HTTP debug
  surface, `node --check src\server\httpServer.js`, `node --check
  src\server\debugPage.js`, `node --check scripts\run-tests.js`, and `node
  scripts\run-tests.js` passed: all 338 tests passed. Added the read-only
  `GET /production/persistence-post-start-checklist` endpoint and debug-console
  link so an operator/admin surface can inspect the same post-start persistence
  checklist without opening a database or reading persisted records. The
  endpoint returns IDs, counts, script names, fixed statuses, persistence mode,
  vector memory mode, and non-execution booleans only; tests assert the
  response omits endpoint values, approved records, and input-action candidates
  and still passes the post-start checklist safety contract. This does not
  connect to PostgreSQL, open a JSON store for writes, commit memory or
  relationship candidates, read approved memory or relationship profile
  contents, start YouTube polling, touch OBS/TTS/Live2D, operate a game, open a
  database process, or send OS input.
- After adding the gameplay post-start checklist, `node --check
  src\services\dev\gameplayPostStartChecklist.js`, `node --check
  scripts\dev-gameplay-post-start-checklist.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-gameplay-post-start-checklist.js`,
  and `node scripts\run-tests.js` passed: all 338 tests passed, and the CLI
  reported `blocked_before_gameplay_safe_control` in the current local
  configuration. Added `src\services\dev\gameplayPostStartChecklist.js`,
  `scripts\dev-gameplay-post-start-checklist.js`, and `npm run
  dev:gameplay:post-start-checklist` to aggregate post-start verification for
  game screen recognition and safe action approval. The checklist consumes the
  gameplay live-readiness report, reports only fixed check IDs, gate IDs,
  counts, script names, next readiness labels, and explicit non-execution
  booleans, and keeps all checks blocked until live gameplay readiness reaches
  `ready_for_gameplay_safe_control`. Tests confirm the checklist does not
  request real capture, does not forward action candidates, does not execute
  approved actions, does not read raw frames, and rejects unsafe script names.
  No secrets, endpoint values, raw frames, raw OCR text, vision payloads,
  action candidates, approved actions, commands, raw stream state, or scheduler
  payloads were exposed.
- After exposing the gameplay post-start checklist over the local HTTP debug
  surface, `node --check src\server\httpServer.js`, `node --check
  src\server\debugPage.js`, `node --check scripts\run-tests.js`, and `node
  scripts\run-tests.js` passed: all 338 tests passed. Added the read-only
  `GET /production/gameplay-post-start-checklist` endpoint and debug-console
  link so an operator/admin surface can inspect the same gameplay post-start
  checks without starting capture or control. The endpoint returns IDs, counts,
  script names, fixed statuses, next readiness labels, and non-execution
  booleans only; tests assert the response omits endpoint values, input-action
  candidates, approved game actions, and raw frame fields while passing the
  gameplay post-start safety contract. This does not request game capture,
  operate real game or OS input, forward an input-action candidate, execute an
  approved action, start YouTube polling, touch OBS/TTS/Live2D, open a database
  process, or send OS input.
- After making PostgreSQL mock-vs-real persistence diagnostics explicit,
  `node --check src\services\dev\productionConfigDoctor.js`, `node --check
  src\services\dev\persistencePreflight.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 322 tests
  passed. Added `IRIS_POSTGRES_MOCK_ADAPTER_ENABLED` to production config
  doctor's env-name coverage and carried safe mock/real adapter diagnostics
  through the persistence check and preflight report. The doctor now reports
  `postgres_adapter_mode` as `real_adapter_pending`, `mock_adapter`, or
  `disabled`, exposes `postgres_mock_adapter_enabled`, confirms that the
  doctor/preflight did not attempt a real DB connection, and keeps
  `postgres_production_scale_ready` false when the mock adapter is enabled even
  if all other PostgreSQL readiness flags are configured. Tests confirm that a
  fully configured real PostgreSQL env remains ready, while the same env with
  the mock adapter enabled is marked attention/configuration waiting and does
  not expose connection strings or secret fragments. This is still diagnostic
  only; no DB connection, migration, backup runner, or external service is
  started. No secrets, connection values, endpoint values, raw viewer messages,
  support messages, candidates, commands, raw frames, raw voice samples, dataset
  paths, internal model paths, raw jobs, or live runtime data were exposed, and
  no real TTS engine, Live2D renderer, OBS bridge, YouTube polling, game
  control, database process, or OS input was started.
- After wiring the latest operator policy decisions into a safe Admin-panel
  settings report, `node --check src\services\dev\operatorPolicySettings.js`,
  `node --check scripts\dev-operator-policy-settings.js`, `node --check
  src\server\httpServer.js`, `node --check src\server\debugPage.js`, `node
  --check scripts\run-tests.js`, `node scripts\dev-operator-policy-settings.js`,
  and `node scripts\run-tests.js` passed: all 338 tests passed. Added
  `npm run dev:operator-policy:settings`, the read-only `GET
  /production/operator-policy-settings` endpoint, and the Debug Console
  Operator Policies link. The report reflects the resolved owner decisions:
  donation tier deltas, donation amount proportional formula, positive and
  negative relationship delta tables, per-event caps, per-stream/day/window
  caps, memory retention classes, archive/summarize windows, initial
  Minecraft/VRChat skilled-game targets, manual-approval default gameplay
  control mode, and approved safe-adapter owner confirmation are all
  Admin-panel configurable policy items. The public CLI/HTTP report exposes
  env/config names, setting IDs, counts, fixed labels, missing/configured
  booleans, and resolved policy flags only; it does not expose actual numeric
  deltas, donation amounts, support message text, hidden relationship scores,
  endpoint values, secrets, viewer messages, candidates, commands, raw frames,
  memory records, relationship records, or live runtime data. This is still a
  configuration/reporting surface only; it does not create the final Admin UI,
  write policy rows, connect to PostgreSQL, commit memory or relationship
  candidates, change gameplay mode, start OBS/TTS/Live2D/YouTube polling,
  request game capture, operate real games, or send OS input.
- After adding the operator policy persistence contract, `node --check
  src\services\persistence\operatorPolicyStore.js`, `node --check
  scripts\dev-operator-policy-store-roundtrip.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-operator-policy-store-roundtrip.js`,
  `node scripts\dev-operator-policy-settings.js`, and `node
  scripts\run-tests.js` passed: all 339 tests passed. Added
  `src\services\persistence\operatorPolicyStore.js`, `npm run
  dev:operator-policy:store-roundtrip`, and tests for approved operator policy
  record creation, atomic JSON persistence, public summary sanitization, status
  reporting, and unsafe policy rejection. The store can persist approved
  internal policy configs such as bounded donation amount formulas and
  relationship delta caps, while public summaries and status reports expose
  only setting IDs, groups, version/digest labels, timestamps, counts, and
  boundary booleans. Tests confirm policy numeric values stay hidden from
  public summaries/status, unsafe endpoint fields are rejected, and injected
  input-action candidate fields are blocked before public serialization. This
  is still a local JSON persistence contract and temp-store roundtrip only; it
  does not create the final Admin UI, write production PostgreSQL policy rows,
  expose policy values over HTTP, change gameplay mode, commit memory or
  relationship candidates, start YouTube polling, touch OBS/TTS/Live2D, request
  capture, operate games, or send OS input.
- After adding the dry-run Admin API apply-plan surface for operator policies,
  `node --check src\services\dev\operatorPolicyAdminApplyPlan.js`, `node
  --check scripts\dev-operator-policy-admin-apply-plan.js`, `node --check
  src\server\httpServer.js`, `node --check src\server\debugPage.js`, `node
  --check scripts\run-tests.js`, `node
  scripts\dev-operator-policy-admin-apply-plan.js`, and `node
  scripts\run-tests.js` passed: all 339 tests passed. Added
  `src\services\dev\operatorPolicyAdminApplyPlan.js`, `npm run
  dev:operator-policy:admin-apply-plan`, and the dry-run HTTP surface at `GET`
  / `POST /admin/operator-policy/apply-plan`. The plan validates proposed
  operator policy updates such as the bounded donation amount relationship
  formula and gameplay control mode changes, returns only a public digest
  summary, requires owner confirmation before validating gameplay-control
  policy changes, and keeps store/PostgreSQL writes disabled. Tests confirm the
  apply plan does not serialize policy configs or numeric values, blocks unsafe
  endpoint fields, hides input-action candidate strings, keeps gameplay-control
  changes blocked until owner confirmation, and exposes only dry-run/read-only
  HTTP boundary booleans. This does not create authenticated final Admin save,
  write local or PostgreSQL policy rows, change gameplay mode, expose policy
  values, commit memory or relationship candidates, start YouTube polling,
  touch OBS/TTS/Live2D, request capture, operate games, or send OS input.
- After adding the operator policy audit-log contract, `node --check
  src\services\persistence\operatorPolicyAuditLog.js`, `node --check
  scripts\dev-operator-policy-audit-roundtrip.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-operator-policy-audit-roundtrip.js`,
  `node scripts\dev-operator-policy-admin-apply-plan.js`, and `node
  scripts\run-tests.js` passed: all 340 tests passed. Added
  `src\services\persistence\operatorPolicyAuditLog.js`, `npm run
  dev:operator-policy:audit-roundtrip`, and tests for safe audit entry
  creation, atomic JSON audit persistence, public audit sanitization, status
  reporting, and unsafe audit input rejection. The audit log records only
  setting IDs, setting groups, policy version/digest, decision, actor role,
  owner-confirmation boolean, timestamps, counts, and boundary booleans. It
  explicitly does not store policy payloads, numeric policy values, endpoint
  values, secrets, viewer messages, support message text, candidates, commands,
  raw frames, or local store paths in public status. This is still a local JSON
  audit contract and temp-store roundtrip only; it does not create
  authenticated final Admin save, write production PostgreSQL audit rows,
  expose policy values over HTTP, change gameplay mode, commit memory or
  relationship candidates, start YouTube polling, touch OBS/TTS/Live2D, request
  capture, operate games, or send OS input.
- After adding the authenticated local save-gate contract for operator
  policies, `node --check src\services\dev\operatorPolicyAdminSaveGate.js`,
  `node --check scripts\dev-operator-policy-save-gate-roundtrip.js`, `node
  --check scripts\run-tests.js`, `node
  scripts\dev-operator-policy-save-gate-roundtrip.js`, and `node
  scripts\run-tests.js` passed: all 341 tests passed. Added
  `src\services\dev\operatorPolicyAdminSaveGate.js`, `npm run
  dev:operator-policy:save-gate-roundtrip`, and tests confirming that the
  save gate blocks when admin authentication is absent, blocks gameplay-control
  changes until owner confirmation is present, writes nothing while blocked,
  and writes both the local operator policy store and audit log only when all
  gates pass. Public save-gate output exposes only setting IDs, groups,
  version/digest, owner-confirmation state, blocked reasons, write booleans,
  public policy summaries, public audit summaries, and boundary booleans. Tests
  confirm policy configs, numeric policy values, endpoint values, support text,
  input-action candidate strings, commands, and raw frames are not serialized.
  This is still a local temp-store roundtrip and contract-level auth flag only;
  it does not create the final authenticated Admin UI/API, write PostgreSQL
  policy or audit rows, expose policy values over HTTP, change gameplay mode,
  commit memory or relationship candidates, start YouTube polling, touch
  OBS/TTS/Live2D, request capture, operate games, or send OS input.
- After extending the PostgreSQL migration planning surface for operator
  policy storage, `node --check
  src\services\dev\postgresPersistenceMigrationPlan.js`, `node --check
  src\services\dev\postgresMigrationReviewGate.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 341 tests
  passed. Updated `src\services\dev\postgresPersistenceMigrationPlan.js` with
  the `operator_policy` table group, `operator_policy_records` /
  `operator_policy_versions`, two operator-policy indexes, migration step
  `007_operator_policy_records`, and an operator-policy storage readiness plan
  requiring admin authentication, owner confirmation for gameplay-control
  policy changes, audit logging on save, digest-only public reports, and a
  private runner for PostgreSQL policy writes. Updated
  `src\services\dev\postgresMigrationReviewGate.js` so the review gate reports
  operator-policy storage readiness from those boundary booleans, and updated
  tests for the new 15-table / 7-migration / 18-index plan counts. This is
  still a read-only migration plan and review gate only; it does not generate
  SQL, connect to PostgreSQL, write policy rows, expose policy payloads or
  values, expose endpoints or secrets, commit memory or relationship
  candidates, start YouTube polling, touch OBS/TTS/Live2D, request capture,
  operate games, or send OS input.
- After adding the PostgreSQL operator-policy write-plan contract, `node
  --check src\services\persistence\postgresPersistenceAdapterContract.js`,
  `node --check scripts\run-tests.js`, `node --check
  scripts\dev-postgres-operator-policy-write-plan.js`, `node
  scripts\dev-postgres-operator-policy-write-plan.js`, JSON parsing for
  `package.json`, and `node scripts\run-tests.js` passed: all 342 tests
  passed. Added `createPostgresOperatorPolicyWritePlan` and
  `assertPostgresOperatorPolicyWritePlanSafe` to the PostgreSQL persistence
  adapter contract, requiring an approved operator-policy record plus a saved
  audit entry before planning private PostgreSQL persistence. Added
  `scripts\dev-postgres-operator-policy-write-plan.js` and `npm run
  dev:persistence:postgres-operator-policy-write-plan` for a dry-run
  counts/columns-only plan. The public plan exposes only table names,
  operation IDs, safe column names, counts, digest presence, and boundary
  booleans; policy configs, policy numeric values, audit payloads, endpoint
  values, secrets, candidates, commands, viewer text, and raw frames remain out
  of the public plan. This still does not connect to PostgreSQL, generate SQL,
  execute prepared statements, write operator-policy or audit rows, expose
  policy values over HTTP, change gameplay mode, commit memory or relationship
  candidates, start YouTube polling, touch OBS/TTS/Live2D, request capture,
  operate games, or send OS input.
- After wiring the PostgreSQL operator-policy write plan into the private
  persistence adapter boundary, `node --check
  src\services\persistence\postgresPersistenceAdapter.js`, `node --check
  src\services\persistence\postgresPreparedStatementExecutor.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  342 tests passed. Updated `src\services\persistence\postgresPersistenceAdapter.js`
  with `persistApprovedOperatorPolicy`, using the previously added
  operator-policy write plan and invoking only prepared statement IDs for
  `upsert_operator_policy_record_by_setting` and
  `append_operator_policy_version`. Updated
  `src\services\persistence\postgresPreparedStatementExecutor.js` with the two
  private prepared statement definitions and table counters for
  `operator_policy_records` and `operator_policy_versions`. Tests confirm the
  real adapter can route private policy configs and audit metadata through the
  injected private executor while public adapter results and status expose only
  counts, table names, operation IDs, and boundary booleans. This does not
  create or connect to a real PostgreSQL pool in tests, run migrations, expose
  SQL or policy values in public reports, write production policy rows, expose
  endpoints or secrets, commit memory or relationship candidates, start
  YouTube polling, touch OBS/TTS/Live2D, request capture, operate games, or
  send OS input.
- After adding a no-real-DB PostgreSQL operator-policy mock persistence path,
  `node --check src\services\persistence\mockPostgresPersistenceAdapter.js`,
  `node --check src\services\dev\operatorPolicyAdminSaveGate.js`, `node
  --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all
  344 tests passed. Updated
  `src\services\persistence\mockPostgresPersistenceAdapter.js` with
  `persistApprovedOperatorPolicy`, duplicate suppression, table counters for
  `operator_policy_records` / `operator_policy_versions`, and counts-only
  public results. Updated `src\services\dev\operatorPolicyAdminSaveGate.js` so
  the Admin save gate can optionally route an already-authenticated,
  already-audited operator-policy save through an explicitly enabled
  PostgreSQL mock adapter while leaving PostgreSQL writes disabled by default.
  Tests confirm policy configs, numeric policy values, audit payloads,
  candidates, commands, endpoints, secrets, viewer messages, support message
  text, and raw frames are not serialized in public save-gate or mock adapter
  output. This does not connect to a real PostgreSQL pool, use an async real
  adapter from the sync Admin gate, run migrations, expose SQL or policy
  values, write production policy rows, change gameplay mode, commit memory or
  relationship candidates, start YouTube polling, touch OBS/TTS/Live2D,
  request capture, operate games, or send OS input.
- Added `src\services\dev\operatorPolicyAdminAsyncSaveGate.js` for the
  private async Admin save path that can await a real PostgreSQL adapter
  through an injected private executor. `node --check
  src\services\dev\operatorPolicyAdminAsyncSaveGate.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 345
  tests passed. The async gate keeps the existing admin-authentication and
  owner-confirmation checks, writes local policy/audit records first, then
  routes to PostgreSQL only when explicitly enabled and a private adapter is
  injected. Public output remains summary/counts only and hides policy configs,
  numeric policy values, audit payloads, candidates, commands, endpoints,
  secrets, viewer text, support message text, and raw frames. This still does
  not create a real PostgreSQL pool, run migrations, expose SQL or policy
  values, write production rows outside the injected test executor, change
  gameplay mode, start YouTube polling, touch OBS/TTS/Live2D, request capture,
  operate games, or send OS input.
- Added the HTTP Admin entrypoint for the private async operator-policy save
  gate. `node --check src\server\httpServer.js`, `node --check
  src\server\debugPage.js`, `node --check scripts\run-tests.js`, and `node
  scripts\run-tests.js` passed: all 345 tests passed. `POST
  /admin/operator-policy/async-save-gate` now returns a safe 503 blocked
  response unless a private async save gate is injected into the HTTP server;
  the debug page links the route. Tests confirm the fallback does not echo
  request policy configs or numeric policy values. This does not create an
  authenticated production Admin session, inject a real PostgreSQL adapter by
  default, run migrations, expose SQL or policy values, touch OBS/TTS/Live2D,
  start YouTube polling, request capture, operate games, or send OS input.
- Added dev-server wiring for the private async operator-policy save gate.
  `node --check scripts\dev-server.js` and `node scripts\run-tests.js` passed:
  all 345 tests passed. The gate stays disabled by default and is injected only
  when the operator explicitly enables the async save gate, enables the mock
  PostgreSQL save path, and provides local store/audit paths through env names.
  Startup output exposes only route/status/env-name readiness, not path values,
  endpoint values, policy configs, numeric policy values, audit payloads,
  candidates, commands, viewer text, support message text, or raw frames. This
  does not create a real PostgreSQL pool, run migrations, write production
  policy rows, expose SQL or policy values, touch OBS/TTS/Live2D, start YouTube
  polling, request capture, operate games, or send OS input.
- Added the async operator-policy save gate configuration names to
  `.env.example`. `node scripts\run-tests.js` passed: all 345 tests passed.
  The template keeps the new Admin/PostgreSQL mock save path disabled by
  default and provides only env names plus local default file paths; it does not
  add secrets, endpoint values, real PostgreSQL writes, real service startup,
  YouTube polling, OBS/TTS/Live2D operation, game operation, or OS input.
- Added `scripts\dev-operator-policy-async-save-gate-roundtrip.js`,
  `npm run dev:operator-policy:async-save-gate-roundtrip`, and a regression
  test for async Admin save gate operation with the mock PostgreSQL adapter.
  Also added `IRIS_OPERATOR_POLICY_ADMIN_AUTHENTICATED` to the dev-server
  startup env-name report. `node --check
  scripts\dev-operator-policy-async-save-gate-roundtrip.js`, `node --check
  scripts\dev-server.js`, `node --check scripts\run-tests.js`, `node
  scripts\dev-operator-policy-async-save-gate-roundtrip.js`, and `node
  scripts\run-tests.js` passed: all 345 tests passed. The CLI uses only temp
  local files and the mock adapter, accepts mock PostgreSQL results through the
  async gate's safe assertion path, and still hides policy payloads, numeric
  policy values, endpoints, secrets, candidates, commands, viewer/support text,
  raw frames, SQL, and connection values. This does not connect to a real
  PostgreSQL database, run migrations, touch OBS/TTS/Live2D, start YouTube
  polling, request capture, operate games, or send OS input.
- Added `scripts\dev-postgres-admin-save-preflight.js` and `npm run
  dev:persistence:postgres-admin-save-preflight` for a no-connection preflight
  before enabling Admin async save with PostgreSQL. `node --check
  scripts\dev-postgres-admin-save-preflight.js`, `node
  scripts\dev-postgres-admin-save-preflight.js`, and `node
  scripts\run-tests.js` passed: all 345 tests passed. The report combines the
  existing PostgreSQL pool factory plan with Admin async save gate readiness and
  exposes only env names, booleans, bounded numeric config, and readiness
  status. It does not expose connection strings, endpoint values, store path
  values, secrets, SQL, policy payloads, numeric policy values, candidates,
  commands, viewer/support text, or raw frames, and it does not create a pool,
  connect to a database, run migrations, touch OBS/TTS/Live2D, start YouTube
  polling, request capture, operate games, or send OS input.
- Exposed the PostgreSQL Admin save preflight through the HTTP/debug surface.
  Added `src\services\dev\postgresAdminSavePreflight.js` as the shared report
  builder, `GET /production/postgres-admin-save-preflight`, a Debug Console
  link, and HTTP regression coverage. `node --check
  src\services\dev\postgresAdminSavePreflight.js`, `node --check
  src\server\httpServer.js`, `node --check
  scripts\dev-postgres-admin-save-preflight.js`, `node
  scripts\dev-postgres-admin-save-preflight.js`, and `node scripts\run-tests.js`
  passed: all 345 tests passed. The HTTP report is read-only and still exposes
  only env names, booleans, bounded numeric config, and readiness status. It
  does not expose connection strings, endpoint values, store path values,
  secrets, SQL, policy payloads, numeric policy values, candidates, commands,
  viewer/support text, raw frames, or create/connect a database pool.
- Added the PostgreSQL Admin save preflight summary to the production next-task
  handoff report. `npm run dev:persistence:postgres-admin-save-preflight` is
  now surfaced as the next operator preflight script, and regression coverage
  checks that the next-task report stays summary-only and no-connection. `node
  --check src\services\dev\productionNextTask.js`, `node
  scripts\dev-production-next-task.js`, and `node scripts\run-tests.js` passed:
  all 345 tests passed. This does not expose connection strings, endpoint
  values, store path values, secrets, SQL, policy payloads, numeric policy
  values, candidates, commands, viewer/support text, raw frames, or create/connect
  a database pool.
- Surfaced the same PostgreSQL Admin save preflight script through the
  production probe next-task and handoff summaries. `node --check
  src\services\dev\productionProbe.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 345 tests passed. The probe
  remains report-only and exposes only safe script names; it does not expose
  connection strings, endpoint values, store path values, secrets, SQL, policy
  payloads, numeric policy values, candidates, commands, viewer/support text,
  raw frames, or create/connect a database pool.
- Added the PostgreSQL Admin save preflight script to production live-readiness
  verification scripts and production runtime-handoff summary. `node --check
  src\services\dev\productionLiveReadiness.js`, `node --check
  src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 345 tests
  passed. These reports still expose only safe script names and summary flags;
  they do not expose connection strings, endpoint values, store path values,
  secrets, SQL, policy payloads, numeric policy values, candidates, commands,
  viewer/support text, raw frames, or create/connect a database pool.
- Strengthened HTTP regression coverage for the production live-readiness and
  runtime-handoff reports so the PostgreSQL Admin save preflight script remains
  visible through the browser/API status surfaces. `node --check
  scripts\run-tests.js` and `node scripts\run-tests.js` passed: all 345 tests
  passed. This is still report-only and does not start live services, create a
  PostgreSQL pool, connect to a database, or expose private values.
- Added the PostgreSQL Admin save preflight script to the production config
  doctor recommended command list and the production readiness runbook
  persistence verification stage. `node --check
  src\services\dev\productionConfigDoctor.js`, `node --check
  src\services\dev\productionReadinessRunbook.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 345 tests
  passed. These additions are command-name only and do not expose connection
  strings, endpoint values, store path values, secrets, SQL, policy payloads,
  numeric policy values, candidates, commands, viewer/support text, raw frames,
  or create/connect a database pool.
- Strengthened HTTP regression coverage for `/production/config-doctor` and
  `/production/readiness-runbook` so the PostgreSQL Admin save preflight script
  is visible through browser/API status surfaces. `node --check
  scripts\run-tests.js` and `node scripts\run-tests.js` passed: all 345 tests
  passed. This remains command-name only and does not start live services,
  create a PostgreSQL pool, connect to a database, or expose private values.
- Added operator-facing configuration guidance to the PostgreSQL Admin save
  preflight report. The report now shows missing required env names, a bounded
  next operator step id, and a guidance summary while still hiding env values,
  store paths, connection strings, SQL, policy payloads, numeric policy values,
  candidates, commands, viewer/support text, and raw frames. `node --check
  src\services\dev\postgresAdminSavePreflight.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-postgres-admin-save-preflight.js`,
  and `node scripts\run-tests.js` passed: all 345 tests passed. This does not
  create a PostgreSQL pool, connect to a database, run migrations, or start live
  services.
- Added a ready-state regression for PostgreSQL Admin save preflight guidance.
  The test confirms the report switches to `ready_for_mock_postgres_save_gate`,
  clears missing env names, points to `run_postgres_admin_save_preflight`, and
  still does not attempt database access or expose connection strings, store
  paths, or audit paths. `node --check scripts\run-tests.js` and `node
  scripts\run-tests.js` passed: all 346 tests passed.
- Added a safe next-verification script hint from the PostgreSQL Admin save
  preflight guidance to `npm run dev:operator-policy:async-save-gate-roundtrip`.
  The hint is script-name only and is validated in both configuration-waiting
  and ready-state tests. `node --check
  src\services\dev\postgresAdminSavePreflight.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-postgres-admin-save-preflight.js`,
  and `node scripts\run-tests.js` passed: all 346 tests passed. This does not
  execute the roundtrip, create a PostgreSQL pool, connect to a database, expose
  private values, or start live services.
- Added explicit preflight-followup positioning to
  `scripts\dev-operator-policy-async-save-gate-roundtrip.js`. The CLI now
  reports that it follows `npm run dev:persistence:postgres-admin-save-preflight`,
  identifies its own safe roundtrip script, and states that it uses the mock
  PostgreSQL Admin async save gate without real database connection or pool
  creation. `node --check
  scripts\dev-operator-policy-async-save-gate-roundtrip.js`, `node
  scripts\dev-operator-policy-async-save-gate-roundtrip.js`, and `node
  scripts\run-tests.js` passed: all 346 tests passed. This does not create a
  PostgreSQL pool, connect to a database, run migrations, expose private values,
  or start live services.
- Refactored the operator policy async save gate roundtrip CLI into reusable
  safe report/assertion exports and added a regression that fixes its
  preflight-followup positioning in the test suite. `node --check
  scripts\dev-operator-policy-async-save-gate-roundtrip.js`, `node --check
  scripts\run-tests.js`, `node
  scripts\dev-operator-policy-async-save-gate-roundtrip.js`, and `node
  scripts\run-tests.js` passed: all 347 tests passed. The roundtrip remains
  mock-only and does not create a PostgreSQL pool, connect to a database, expose
  policy payloads, numeric policy values, connection strings, endpoint values,
  secrets, candidates, commands, viewer/support text, raw frames, or start live
  services.
- Promoted the operator policy async save gate roundtrip implementation into
  `src\services\dev\operatorPolicyAsyncSaveGateRoundtrip.js`, kept the CLI as a
  thin wrapper, and exposed a read-only HTTP surface at
  `/production/operator-policy-async-save-gate-roundtrip` with a debug-page link.
  `node --check src\services\dev\operatorPolicyAsyncSaveGateRoundtrip.js`,
  `node --check scripts\dev-operator-policy-async-save-gate-roundtrip.js`,
  `node --check src\server\httpServer.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 347 tests passed. The HTTP report
  is mock-only/read-only and does not create a PostgreSQL pool, connect to a
  database, expose policy payloads, numeric policy values, connection strings,
  endpoint values, secrets, candidates, commands, viewer/support text, raw
  frames, or start live services.
- Added the operator policy async save gate roundtrip script to the production
  config doctor recommended command list, production readiness runbook
  persistence stage, production runtime-handoff summary, and production
  live-readiness verification script set. Also hardened the live-readiness OBS
  pickup startup sanitizer so a ready pickup summary cannot retain stale next
  item fields from local environment-derived startup data. `node --check
  src\services\dev\productionConfigDoctor.js`, `node --check
  src\services\dev\productionReadinessRunbook.js`, `node --check
  src\services\dev\productionRuntimeHandoffStatus.js`, `node --check
  src\services\dev\productionLiveReadiness.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-config-doctor.js`, `node
  scripts\dev-production-runbook.js`, `node
  scripts\dev-production-runtime-handoff-status.js`, `node
  scripts\dev-production-live-readiness.js`, and `node scripts\run-tests.js`
  passed: all 347 tests passed. These reports remain script-name/read-only
  surfaces and do not create a PostgreSQL pool, connect to a database, expose
  policy payloads, numeric policy values, connection strings, endpoint values,
  secrets, candidates, commands, viewer/support text, raw frames, or start live
  services.
- Added an Admin Operations Summary service and read-only HTTP route at
  `/admin/operations-summary` with a debug-page link. The summary aggregates
  operator-facing readiness for the TTS/Live2D/OBS foundation, YouTube
  comments/support ingest, memory/relationship persistence, vision/safe game
  control, and Admin operator policy preflight surfaces into module counts,
  next safe script names, route names, and bounded operator action ids. It
  validates module ids, readiness states, safe script names, route paths, and
  count consistency. `node --check
  src\services\dev\adminOperationsSummary.js`, `node --check
  src\server\httpServer.js`, `node --check scripts\run-tests.js`, and `node
  scripts\run-tests.js` passed: all 348 tests passed. The summary is read-only
  and does not create a PostgreSQL pool, connect to a database, expose policy
  payloads, numeric policy values, connection strings, endpoint values, secrets,
  candidates, commands, viewer/support text, memory/relationship records, raw
  frames, or start live services.
- Added `scripts\dev-admin-operations-summary.js` and the package script
  `npm run dev:admin:operations-summary` so the same Admin Operations Summary
  can be inspected without starting the HTTP server. The CLI wraps the validated
  service report and exposes only readiness counts, safe script names, route
  paths, and bounded operator action ids. `node --check
  scripts\dev-admin-operations-summary.js`, `node --check
  src\services\dev\adminOperationsSummary.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-admin-operations-summary.js`, and
  `node scripts\run-tests.js` passed: all 348 tests passed. The CLI is
  read-only and does not create a PostgreSQL pool, connect to a database, expose
  policy payloads, numeric policy values, connection strings, endpoint values,
  secrets, candidates, commands, viewer/support text, memory/relationship
  records, raw frames, or start live services.
- Surfaced the Foundation local environment apply and post-config verification
  scripts in the higher-level Foundation env setup, Foundation live-readiness,
  and production live-readiness script catalogs. Operators can now find
  `npm run dev:foundation:local-env-apply`,
  `npm run dev:foundation:runtime-status`, `npm run dev:bridge:status-roundtrip`,
  and `npm run dev:bridge:engine-roundtrip` from those read-only reports, matching
  the lower-level apply plan. `node --check
  src\services\dev\foundationEnvSetupPlan.js`, `node --check
  src\services\dev\foundationLiveReadiness.js`, `node --check
  src\services\dev\productionLiveReadiness.js`, `node --check
  scripts\run-tests.js`, `node scripts\dev-foundation-env-setup-plan.js`,
  `node scripts\dev-foundation-live-readiness.js`, and `node
  scripts\dev-production-live-readiness.js` passed. The reports remain
  script-name-only/read-only and do not start live services, expose endpoints,
  secrets, payloads, candidates, commands, raw jobs, or artifact paths.
- Added bounded per-module safe script catalogs to Admin Operations Summary so
  operators can inspect the next few allowed verification scripts for each
  module without opening the full runbook. The catalog is capped, deduplicated,
  requires the module next-safe script to be present, and remains script-name
  only. `node --check src\services\dev\adminOperationsSummary.js`, `node
  --check scripts\run-tests.js`, and `node scripts\dev-admin-operations-summary.js`
  passed. The summary remains read-only and does not expose endpoints, secrets,
  connection values, payloads, candidates, commands, viewer/support text,
  memory/relationship records, raw frames, or start real processes.
- Surfaced the next module's bounded safe script catalog through Admin Dashboard
  and rendered it on the dashboard page near the next script card. The dashboard
  carries only the next module catalog, validates script names, requires the next
  safe script to be present, and caps the display list for compact operator use.
  `node --check src\services\dev\adminDashboard.js`, `node --check
  src\server\adminDashboardPage.js`, `node --check scripts\run-tests.js`, and
  `node scripts\run-tests.js` passed: all 359 tests passed. The dashboard remains
  read-only and does not expose endpoints, secrets, connection values, payloads,
  candidates, commands, raw frames, or start real processes.
- Extended the HTTP/dashboard regression coverage so `/admin` HTML and
  `/admin/dashboard` JSON both prove that the bounded safe script catalog reaches
  the browser-facing dashboard surface. The HTTP checks assert the catalog includes
  the next safe script, stays capped, and remains free of endpoint values, policy
  payloads, and candidate fields. `node --check scripts\run-tests.js` and `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Added a mechanical command catalog audit to the regression suite. The test scans
  `src` and `docs/architecture` for `npm run dev:*` references, normalizes
  allowed `-- --flag` suffixes, and asserts every referenced script exists in
  `package.json`. This guards future Admin/runbook/readiness documentation against
  stale command names. `node --check scripts\run-tests.js` and `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Added the reverse package dev script target audit to the regression suite. The
  test asserts every `dev:*` package script keeps the expected `node scripts/*.js`
  shape and points to an existing script file, closing the other side of the
  command catalog drift check. `node --check scripts\run-tests.js` and `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Added the dev script registration audit to the regression suite. The test scans
  `scripts/dev-*.js` and asserts every dev CLI is registered by a matching
  `dev:*` package script, preventing new operator-facing checks from becoming
  filesystem-only tools that are missing from the runbook catalogs. `node --check
  scripts\run-tests.js` and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Tightened Production Readiness Runbook command validation so launch and
  verification scripts must match the bounded `npm run dev:*` shape, with only a
  single explicit `-- --flag` suffix allowed for operator worker modes, or `npm
  test` for verification. This keeps runbook command surfaces aligned with the
  package-script audits while preserving the existing read-only handoff behavior.
  `node --check src\services\dev\productionReadinessRunbook.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Added a cross-source npm dev command shape audit to the regression suite. The
  test scans quoted command strings in `src` and `docs/architecture`, ignores
  explicit prefix/wildcard placeholders, and asserts real `npm run dev:*`
  commands stay within the bounded package-script shape with explicit `--` flags
  only. This extends command safety coverage beyond the runbook into all
  operator-facing dev reports and documentation. `node --check
  scripts\run-tests.js` and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Surfaced the previously filesystem-only Admin and Operator Policy dev CLIs in
  Admin Operations Summary. The verification surfaces and bounded module catalogs
  now include Admin dashboard/checklist/safety/character-voice checks plus
  Operator Policy apply/audit/save/store and PostgreSQL write-plan checks. Added
  a package dev script reachability audit so every registered `dev:*` script must
  be referenced from `src` or `docs/architecture`. `node --check
  src\services\dev\adminOperationsSummary.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- Hardened Admin Dashboard verification-surface validation. The dashboard now
  asserts its inherited Admin Operations script and route surfaces directly, so a
  tampered dashboard payload with unsafe scripts or query-bearing route paths is
  rejected even when tested independently from the operations summary. Regression
  coverage also pins the newly surfaced Admin and Operator Policy scripts in the
  dashboard JSON contract. `node --check src\services\dev\adminDashboard.js`,
  `node --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed:
  all 359 tests passed.
- Aligned the core Admin and production runbook safe-script patterns with the
  cross-source command audit. Admin Operations Summary, Admin Dashboard, Admin
  Integration Checklist, and Production Readiness Runbook now share the bounded
  `npm run dev:*` shape with explicit `--` flags, while preserving intentional
  `npm test` / `npm run smoke` verification entries where those surfaces already
  used them. `node --check` passed for the touched services and `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Tightened the remaining startup/checklist/rehearsal safe-script validators for
  gameplay, persistence, foundation, YouTube ingest/relay, and production
  scheduler enablement. These surfaces now reject loose space-bearing script
  strings and use the same bounded `npm run dev:*` shape with explicit `--` flags
  as the command audit. `node --check` passed for the touched services and `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Tightened Foundation-specific dev report script validators that still used
  `startsWith("npm run dev:")` plus loose space-bearing character checks. The
  connector handoff, env setup/profile/apply/roundtrip/rehearsal, launch plan,
  live readiness, preflight, runtime status, and startup checklist surfaces now
  all use the bounded `npm run dev:*` script shape with explicit `--` flags.
  `node --check` passed for the touched Foundation services and `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Tightened Gameplay, Persistence, YouTube ingest, and Production/Postgres dev
  report safe-script validators that still accepted loose `npm run dev:` strings.
  Env setup/profile/apply, launch, preflight, live readiness, runtime status,
  production probes, next-task, runtime handoff, and Postgres admin preflight
  surfaces now use bounded `npm run dev:*` matching with explicit `--` flags,
  preserving `npm test` only where the existing report contract already allowed
  it. `node --check` passed for the touched services and `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Exposed the memory-vector bridge and roundtrip checks from Persistence live
  readiness verification scripts, matching the existing startup/preflight/launch
  surfaces and making the Priority 3 operator flow explicit from vector bridge
  setup through live-readiness. `node --check` passed for
  `src\services\dev\persistenceLiveReadiness.js` and `scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- Exposed the source-specific, HTTP ingest, and cursor roundtrip checks from
  YouTube ingest live-readiness verification scripts, matching the runtime poll
  verification summary from the launch plan and making the Priority 2 source
  verification path visible from live-readiness without exposing live payloads,
  endpoints, cursor values, or secrets. `node --check` passed for
  `src\services\dev\youtubeIngestLiveReadiness.js` and `scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- Propagated the newly explicit Priority 2/3 verification scripts into the
  production live-readiness aggregate. The top-level production verification
  surface now includes YouTube source-specific, HTTP ingest, cursor, and cursor
  backup roundtrips plus Persistence memory-vector bridge and roundtrip scripts,
  while retaining script-name-only output and the bounded safe-script contract.
  `node --check` passed for `src\services\dev\productionLiveReadiness.js` and
  `scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Prioritized the same Priority 2/3 operator checks in Admin Operations safe
  script catalogs. YouTube source-specific/http-ingest/cursor checks and
  Persistence memory-vector bridge/roundtrip checks are now selected before the
  catalog cap can hide them, so the dashboard-facing module summaries keep the
  next source and memory-search verification path visible without exposing
  endpoints, payloads, cursor values, memory records, or candidates. `node
  --check` passed for `src\services\dev\adminOperationsSummary.js` and
  `scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 359 tests
  passed.
- Added per-check safe script catalogs to Admin Integration Checklist items.
  YouTube Live Chat now carries source-status, direct/live HTTP ingest, runtime
  ingest, and cursor roundtrip checks together, while Memory Search carries the
  memory-vector bridge, vector roundtrip, and Persistence live-readiness checks.
  Each catalog is bounded, deduped, safe-script validated, and still reports only
  script names plus counts/statuses. `node --check` passed for
  `src\services\dev\adminIntegrationChecklist.js` and `scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 359 tests passed.
- Rendered Admin Integration Checklist safe script catalogs on the Admin
  Dashboard HTML page. Each checklist card now includes a bounded escaped
  script list from `safe_script_catalog`, so operators can see the related
  verification commands in the browser without exposing endpoints, secrets,
  payloads, or candidate data. `node --check` passed for
  `src\server\adminDashboardPage.js` and `scripts\run-tests.js`, and `node
  scripts\run-tests.js` passed: all 359 tests passed.
- Hardened the Production Live Readiness aggregate public boundary with
  explicit allow-lists for top-level reports, priority stages, gate summaries,
  and the foundation OBS pickup startup summary. Unknown diagnostic fields are
  now rejected before they can become public report drift, while the existing
  forbidden-key and endpoint/secret guards remain in place. Added regression
  coverage for unexpected report, stage, gate, and OBS pickup startup fields.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Integration Status aggregate boundaries with explicit allow-lists
  for the top-level status report, aggregate summary, local bridge engine mode
  summary, and OBS render handoff summary. Unknown fields in these public
  surfaces now fail contract validation, preventing diagnostic drift from
  leaking into operator-facing status output. Added regression coverage for
  unexpected status, summary, engine, and OBS handoff fields. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Integration Probe public boundaries with explicit allow-lists for
  the top-level probe report, per-adapter probe items, the local engine worker
  probe, and its engine mode summary. Unexpected diagnostic fields are now
  rejected before dry-run or fixture-post reports can publish them. Added
  regression coverage for unexpected report, adapter probe, engine worker, and
  engine mode summary fields. `node scripts\run-tests.js` passed: all 366 tests
  passed.
- Hardened the Integration Contracts manifest root boundary with an explicit
  top-level allow-list. Unexpected root fields now fail contract validation
  before contract manifests can publish accidental diagnostic data, while the
  existing nested contract safety checks remain intact. Added regression
  coverage for unexpected top-level contract fields. `node scripts\run-tests.js`
  passed: all 366 tests passed.
- Hardened Integration Fixtures manifest boundaries with exact key validation
  for the top-level fixture manifest and fixture policy block. Synthetic
  fixture output now rejects accidental extra public fields before adapter,
  engine, OBS, overlay, or ACK examples are inspected. Added regression coverage
  for unexpected fixture root and fixture policy fields. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Admin Dashboard and Admin Integration Checklist nested public
  surfaces. Dashboard widgets and module summaries now reject unexpected fields,
  and checklist items plus status summaries use explicit field allow-lists.
  Added regression coverage for unexpected widget, module summary, checklist
  item, and checklist status summary fields. `node scripts\run-tests.js` passed:
  all 366 tests passed.
- Hardened Admin Safety Controls nested public surfaces. The public safety
  state, audit summary, and audit entry schemas now reject unexpected fields,
  and audit summary last-action metadata is validated against fixed action,
  result, and actor-role enums. Added regression coverage for unexpected state,
  audit summary, and audit entry fields. `node scripts\run-tests.js` passed: all
  366 tests passed.
- Hardened Admin Character and Voice Settings nested public surfaces. Individual
  setting rows and the voice source summary now reject unexpected fields, keeping
  the admin report limited to setting ids, env names, fixed labels, and boolean
  guidance flags. Added regression coverage for unexpected setting and voice
  source summary fields. `node scripts\run-tests.js` passed: all 366 tests
  passed.
- Hardened Admin Review Queue nested public surfaces. Review queue items,
  recorded decision summaries, and decision records now reject unexpected fields
  before validator handoff or decision logs can consume them. Added regression
  coverage for unexpected review item, decision, and decision summary fields.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Admin Review Validator Handoff nested public surfaces. Handoff items
  and the review queue summary now reject unexpected fields before private
  validator preflight can consume the report, while preserving the no-commit and
  no-candidate exposure boundaries. Added regression coverage for unexpected
  handoff item and queue summary fields. `node scripts\run-tests.js` passed: all
  366 tests passed.
- Hardened Admin Review Validator Preflight nested public surfaces. The handoff
  summary now rejects unexpected fields before any private validator run plan can
  consume it, keeping preflight output limited to status and count metadata.
  Added regression coverage for unexpected handoff summary fields. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Admin Review Validator Run Plan nested public surfaces. The preflight
  summary and auth gate summary now reject unexpected fields before the private
  runner boundary, keeping the dry-run plan limited to count, status, and auth
  readiness metadata. Added regression coverage for unexpected preflight and
  auth gate summary fields. `node scripts\run-tests.js` passed: all 366 tests
  passed.
- Hardened Admin Review Auth Gate boundary policy output. The auth gate now
  rejects unexpected boundary policy fields in addition to validating required
  policy flags, preventing accidental private runner or environment diagnostics
  from being appended to the public auth report. Added regression coverage for
  unexpected boundary policy fields. `node scripts\run-tests.js` passed: all 366
  tests passed.
- Hardened Production Runtime Handoff Status public boundaries. The top-level
  runtime handoff report, root boundary policy, and foundation OBS pickup
  runtime boundary policy now reject unexpected fields, keeping runtime handoff
  output limited to counts, statuses, booleans, and safe script names. Added
  regression coverage for unexpected root, boundary policy, and OBS pickup
  boundary fields. `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Production Probe nested public summaries. The next-task summary,
  next-task gate summaries, verification plan, and verification stage summaries
  now reject unexpected fields before production readiness or admin dashboards
  consume them. Added regression coverage for unexpected next-task, gate,
  verification plan, and verification stage fields. `node scripts\run-tests.js`
  passed: all 366 tests passed.
- Hardened Production Probe boundary policy validation. The shared production
  probe boundary-policy validator now rejects unexpected policy fields across
  root, next-task, stage, check, and nested engine/OBS summaries while preserving
  the existing required safety flags. Added regression coverage for unexpected
  root, next-task, and stage boundary fields. `node scripts\run-tests.js` passed:
  all 366 tests passed.
- Hardened Production Readiness Runbook boundary policy validation. The shared
  runbook boundary-policy validator now rejects unexpected policy fields across
  the runbook root, verification plan, operator launch plan, operator startup
  plan, OBS pickup startup summary, and stage summaries. Added regression
  coverage for unexpected root, verification, launch, and stage boundary fields.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Production Next Task boundary policy validation. The shared next-task
  boundary-policy validator now rejects unexpected policy fields across the
  report root, priority gates, PostgreSQL/Admin Review summaries, operator
  startup summaries, and OBS pickup startup summaries. Added regression coverage
  for unexpected root and gate boundary fields. `node scripts\run-tests.js`
  passed: all 366 tests passed.
- Hardened Production Scheduler Enablement boundary policy validation. The
  shared scheduler enablement boundary-policy validator now rejects unexpected
  policy fields across the report root, stage plans, and verification scripts,
  keeping scheduler enablement guidance read-only and free of runtime polling or
  control diagnostics. Added regression coverage for unexpected root, stage, and
  script boundary fields. `node scripts\run-tests.js` passed: all 366 tests
  passed.
- Hardened Production Live Readiness boundary policy validation. The shared live
  readiness boundary-policy validator now rejects unexpected policy fields across
  the report root, priority stages, gate summaries, and verification scripts,
  while the OBS pickup startup summary enforces the same exact policy-key
  contract. Added regression coverage for unexpected root, verification, OBS
  pickup, stage, and gate boundary fields. `node scripts\run-tests.js` passed:
  all 366 tests passed.
- Hardened Production Config Doctor boundary policy validation. The config
  doctor now rejects unexpected policy fields across the root report, every
  integration check, original voice source readiness policy, and PostgreSQL
  scale readiness policy. Added regression coverage for unexpected root, check,
  voice, and PostgreSQL policy fields. `node scripts\run-tests.js` passed: all
  366 tests passed.
- Hardened Foundation Local Env boundary policy validation. The local env
  profile, roundtrip, and apply-plan validators now reject unexpected policy
  fields while preserving the dry-run/materialize `read_only_when_dry_run`
  contract. Added regression coverage for unexpected profile, group, roundtrip,
  and apply-plan boundary fields. `node scripts\run-tests.js` passed: all 366
  tests passed.
- Hardened Foundation setup boundary policy validation. The env setup plan,
  startup checklist, and connector handoff validators now reject unexpected
  policy fields across root reports plus nested env-group, terminal-plan,
  connector, and contract-reference summaries. Added regression coverage for
  unexpected setup, checklist, handoff, connector, terminal, and contract
  boundary fields. `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Foundation Preflight boundary policy validation. The preflight
  validator now rejects unexpected policy fields on the root report and the
  nested foundation status summary while preserving the existing secret,
  endpoint, payload, and candidate safety flags. Added regression coverage for
  unexpected preflight and status-summary boundary fields. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- Hardened YouTube Local Env boundary policy validation. The YouTube ingest
  local env profile and apply-plan validators now reject unexpected policy
  fields across root reports and env groups while preserving the
  dry-run/materialize `read_only_when_dry_run` contract. Added regression
  coverage for unexpected profile, group, and apply-plan boundary fields. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- Hardened YouTube Preflight and Env Setup boundary policy validation. The
  YouTube ingest preflight and env setup validators now reject unexpected policy
  fields across root reports and env groups while keeping cursor, endpoint,
  support-message, and live-payload redaction flags explicit. Added regression
  coverage for unexpected preflight, env setup, and env-group boundary fields.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened YouTube Launch Plan boundary policy validation. The launch-plan
  validator now rejects unexpected policy fields on the root plan and nested
  runtime poll verification summary, keeping live polling, support event, and
  cursor boundaries exact before operator launch guidance consumes them. Added
  regression coverage for unexpected launch and runtime-poll boundary fields.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened YouTube Source/Runtime/Rehearsal boundary policy validation. Source
  status, runtime status, and readiness rehearsal validators now reject
  unexpected policy fields on root reports and nested runtime-flow, gate,
  verification-script, poll-flow, support-candidate, and live-chat-ingest
  summaries. Added regression coverage for unexpected private boundary detail
  fields across those surfaces. `node scripts\run-tests.js` passed: all 366
  tests passed.
- Hardened YouTube Live Readiness boundary policy validation. The live-readiness
  validator now rejects unexpected policy fields on the root report, env setup
  plan summary, gate summaries, and verification script summary while preserving
  live-polling, cursor, support-message, stream-state, and candidate redaction
  guarantees. Added regression coverage for unexpected live-readiness, env
  setup, gate, and script boundary fields. `node scripts\run-tests.js` passed:
  all 366 tests passed.
- Hardened Foundation Local Env Readiness Rehearsal boundary policy validation.
  The rehearsal validator now rejects unexpected policy fields on the root
  rehearsal, gate summary, and runtime expectation summaries while preserving
  file/env/script-name-only reporting and no payload/candidate/command
  guarantees. Added regression coverage for unexpected rehearsal, gate, and
  runtime boundary fields. `node scripts\run-tests.js` passed: all 366 tests
  passed.
- Hardened Foundation Live Readiness boundary policy validation. The live
  readiness validator now rejects unexpected policy fields on the root report,
  env setup summary, connector handoff summary, runtime gate, real-engine gate,
  OBS gate, production probe gate, OBS pickup startup summary, and verification
  script summary while preserving endpoint, secret, payload, artifact path,
  candidate, command, and read-only live-readiness boundaries. Added regression
  coverage for unexpected private boundary detail fields across those surfaces.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Foundation Launch Plan boundary policy validation. The launch-plan
  validator now rejects unexpected policy fields on the root launch plan and
  runtime handoff verification summary while keeping local script, env-name,
  endpoint, secret, payload, candidate, command, and read-only plan guarantees
  exact. Added regression coverage for unexpected launch and runtime handoff
  boundary fields. `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Foundation Runtime Status boundary policy validation. The runtime
  status validator now rejects unexpected policy fields on the root report,
  runtime summary, runtime handoff flow, and OBS render artifact flow while
  preserving endpoint, secret, payload, text payload, artifact path/body, raw
  job, candidate, command, script-name, read-only runtime, no-engine-call, and
  no-OBS-side-effect guarantees. Added regression coverage for unexpected
  runtime, runtime-summary, handoff-flow, and OBS-artifact boundary fields.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Admin Review boundary policy validation. The admin review queue and
  validator handoff/preflight/run-plan validators now reject unexpected policy
  fields on their root reports, action plans, and queue items while preserving
  dry-run, owner-confirmation, validator-handoff, no-raw-candidate,
  no-approved-record, no-store-write, no-validator-commit, endpoint, and secret
  boundaries. Added regression coverage for unexpected queue, queue-item,
  action-plan, validator-handoff, validator-preflight, and validator-run-plan
  boundary fields. `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Admin Character/Voice Settings boundary policy validation. The
  settings validator now rejects unexpected policy fields on root reports,
  per-setting summaries, and apply plans while preserving guidance-only,
  no-secret-value, no-endpoint-value, no-store-write, no-command, and no-live
  engine-call guarantees. Added regression coverage for unexpected settings,
  setting-item, and apply-plan boundary fields. `node scripts\run-tests.js`
  passed: all 366 tests passed.
- Hardened Admin Review Decision Log boundary policy validation. The decision
  log status validator now rejects unexpected policy fields while preserving
  counts-only, decision-summary-only, no-raw-candidate, no-approved-record,
  no-store-write, no-validator-commit, endpoint, secret, payload, command,
  raw-frame, and no-store-path guarantees. Added regression coverage for
  unexpected decision-log boundary fields. `node scripts\run-tests.js` passed:
  all 366 tests passed.
- Hardened Admin Dashboard boundary policy validation. The dashboard validator
  now rejects unexpected policy fields on the root dashboard and per-widget
  summaries while preserving read-only, counts/statuses/route-path-only,
  safe-label, env-name, endpoint, secret, connection, payload, viewer-message,
  candidate, command, raw-frame, raw-job, no-process-start, no-database-connect,
  and no-game-input guarantees. Added regression coverage for unexpected
  dashboard and widget boundary fields. `node scripts\run-tests.js` passed:
  all 366 tests passed.
- Hardened Admin Integration Checklist boundary policy validation. The
  checklist validator now rejects unexpected policy fields on the root checklist
  and per-integration checks while preserving read-only, env-name/count,
  script-name-only, fixed-status, endpoint, secret, connection, payload,
  candidate, command, raw-frame, raw-job, no-process-start, no-database-connect,
  and no-game-input guarantees. Added regression coverage for unexpected
  checklist and check-item boundary fields. `node scripts\run-tests.js` passed:
  all 366 tests passed.
- Hardened Admin Safety Controls boundary policy validation. The safety controls
  validator now rejects unexpected policy fields on root reports, action results,
  and public state summaries while preserving safe-control-state-only,
  explicit-confirmation, audit-summary-only, endpoint, secret, payload,
  candidate, command, raw-frame, raw-job, no-real-device-operation, and
  no-game-input guarantees. Added regression coverage for unexpected safety,
  action-result, and state boundary fields. `node scripts\run-tests.js` passed:
  all 366 tests passed.
- Hardened Admin Operations Summary boundary policy validation. The operations
  summary validator now rejects unexpected policy fields on the root summary and
  per-module summaries while preserving read-only, report-summary-only,
  script/route-path-only, env-name, endpoint, secret, connection, policy-payload,
  live-payload, viewer-message, candidate, command, raw-frame, no-process-start,
  no-database-connect, and no-game-input guarantees. Added regression coverage
  for unexpected operations-summary and module boundary fields.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Integration Status boundary policy validation. The integration status
  validator now rejects unexpected policy fields on root status, integration
  items, local bridge engine mode summaries, and OBS render handoff summaries
  while preserving env-name, secret, payload, command, candidate, endpoint,
  artifact-path, read-only, mode/count, and fixed-status guarantees. Added
  regression coverage for unexpected status, item, engine-mode, and OBS handoff
  boundary fields. `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Integration Probe engine-mode boundary policy validation. The
  integration probe validator now rejects unexpected policy fields on local
  bridge engine worker mode summaries while preserving mode/count, endpoint,
  secret, raw-job, raw-artifact, candidate, and command guarantees. Added
  regression coverage for unexpected engine-mode boundary fields.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Foundation Launch Plan OBS pickup startup boundary validation. The
  launch-plan validator now rejects unexpected policy fields on OBS pickup
  startup summaries while preserving boolean/count/script-name, env-name,
  endpoint, secret, payload, candidate, and command guarantees. Added regression
  coverage for unexpected OBS pickup startup boundary fields.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Production Live Readiness OBS pickup startup boundary validation. The
  live-readiness validator now routes OBS pickup startup summary policy checks
  through the exact boundary-policy helper, rejecting unexpected fields while
  preserving script-name, count/status/boolean, endpoint, secret, payload,
  artifact-path, candidate, and command guarantees. Existing regression coverage
  for unexpected OBS pickup startup boundary fields now exercises the shared
  helper. `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Foundation Runtime Status engine-mode boundary validation. The
  runtime-status validator now routes local bridge worker engine-mode summary
  policy checks through the exact boundary-policy helper, rejecting unexpected
  fields while preserving mode/count, endpoint, secret, raw-job, text-payload,
  artifact-path, candidate, and command guarantees. Added regression coverage
  for unexpected engine-mode boundary fields. `node scripts\run-tests.js`
  passed: all 366 tests passed.
- Consolidated Production Runtime Handoff OBS pickup runtime boundary
  validation. The runtime handoff validator now routes OBS pickup runtime
  summary policy checks through the shared exact boundary-policy helper,
  preserving boolean/count/status/script-name, endpoint, secret, payload,
  candidate, command, artifact-path, and raw-runtime-state guarantees while
  removing the last manual `boundary_policy?.[field]` loop in dev service
  reports. `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Candidate Review Queue item boundary validation. Candidate review
  items now reject unexpected boundary policy fields and require the
  validator-before-side-effect flag in addition to no-raw-candidate,
  no-execution, and no-commit guarantees. Added regression coverage for
  unexpected review-item boundary fields and missing validator boundary flags.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Foundation operator handoff safety boundary validation. Operator run
  gate, process handoff dry-run, and post-start health checklist reports now
  reject unexpected boundary policy fields while preserving script-name,
  id/count-only, no-secret, no-endpoint, no-payload, no-candidate, no-command,
  no-real-process/network, and no-OBS-operation guarantees. Added regression
  coverage for private boundary field injection across the three reports.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Gameplay startup and post-start checklist boundary validation.
  Gameplay startup root/step policies and post-start checklist policies now
  reject unexpected boundary fields while preserving env-name, script-name,
  no-secret, no-endpoint, no-raw-frame/OCR, no-action-candidate, no-approved-
  action, no-command, and no-real-input/capture guarantees. Added regression
  coverage for private boundary field injection across startup root, startup
  step, and post-start reports. `node scripts\run-tests.js` passed: all 366
  tests passed.
- Hardened Integration contract and fixture boundary validation. Integration
  contract root/item policies and fixture root/local-engine-request policies
  now reject unexpected boundary fields while preserving env-name, no-secret,
  no-live-payload, no-candidate, no-command, read-only manifest, synthetic
  fixture, local bridge job, no-endpoint, and engine-preference-internal
  guarantees. Added regression coverage for private boundary field injection
  across contract root/item and fixture root/engine request reports. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Persistence Runtime Status boundary validation. The runtime report
  and nested approved-record, candidate-commit, identity-scope, relationship-
  value, long-term-recall, and memory/relationship lifecycle summaries now
  share exact boundary-policy validation, rejecting unexpected fields while
  preserving counts/status/boolean/age-only, no-store-path, no-endpoint,
  no-secret, no-record, no-candidate, no-viewer/display-name, no-score, and
  script-name-only guarantees. Added regression coverage for private root
  boundary field injection. `node scripts\run-tests.js` passed: all 366 tests
  passed.
- Hardened YouTube Ingest Runtime Status boundary validation. Scheduler,
  ingest hygiene, API cursor/auth, and YouTube runtime-state summaries now use
  exact boundary-policy validation, rejecting unexpected fields while preserving
  counts/status/boolean-only, no-source-name, no-platform-id/cursor, no-live or
  text payload, no-support-message-text, no-candidate, no-command, no-endpoint,
  no-secret, read-only, and script-name-only guarantees. Existing private
  boundary injection coverage now exercises the exact helper path. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Operator Policy settings and apply-plan boundary validation.
  Operator policy settings reports and admin apply plans now reject unexpected
  boundary fields while preserving read-only/dry-run, env-name, fixed-policy-
  label, no-policy-payload/value, no-secret, no-endpoint, no-viewer/support
  message, no-hidden-score, no-candidate, no-command, no-frame, no-device, and
  no-game-input guarantees. Added regression coverage for private boundary
  field injection in both reports. `node scripts\run-tests.js` passed: all 366
  tests passed.
- Hardened Operator Policy save-gate boundary validation. Admin save gate,
  admin async save gate, and async save-gate roundtrip CLI reports now reject
  unexpected boundary fields while preserving authenticated/owner gates,
  explicit private PostgreSQL enablement, temp/mock-store-only, public-summary,
  no-policy-payload/value, no-secret, no-endpoint, no-viewer/support-message,
  no-hidden-score, no-candidate, no-command, no-frame, and no-game-input
  guarantees. Added regression coverage for private boundary field injection
  across all three reports. `node scripts\run-tests.js` passed: all 366 tests
  passed.
- Hardened Persistence status/startup/post-start/live-readiness boundary
  validation. Persistence status, startup checklist root/step policies,
  post-start checklist, and live-readiness verification/gate policies now reject
  unexpected boundary fields while preserving read-only/counts/status/script/env,
  no path/endpoint/secret, no record/summary/score/viewer/display-name/candidate/
  command, and no DB/store/candidate side-effect guarantees. Added regression
  coverage for private boundary injection across status/startup/live/post-start
  reports. `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Foundation Runtime Status nested boundary validation. Overlay runtime,
  local bridge worker runtime, real engine handoff, real engine worker flow, OBS
  browser source runtime, and render handoff summaries now use exact boundary
  policy validation, rejecting unexpected fields while preserving boolean/count/
  status/script-only, no raw stream/event/job, no text/payload/artifact path/body,
  no route/origin/scene/source, no endpoint/secret, no candidate, and no command
  guarantees. Added regression coverage for private nested boundary injection.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened Integration Probe boundary validation. Probe reports, per-adapter
  probe items, and engine-worker probes now use exact boundary policy validation,
  rejecting unexpected fields while preserving env-name, read-only, synthetic
  payload-only, no live/raw packet/job/artifact, no endpoint/secret, no candidate,
  and no command guarantees. Added regression coverage for private boundary
  injection at report, item, and engine-worker levels. `node scripts\run-tests.js`
  passed: all 366 tests passed.
- Hardened Foundation launch/status boundary validation. Operator startup plans,
  foundation summaries, and OBS browser-source status now rely on exact boundary
  policy validation instead of partial optional-chain checks, rejecting unexpected
  fields while preserving script/env-name, read-only, counts/status/path-only,
  no endpoint/secret/payload/candidate/command, and no scene/source/origin
  guarantees. Added regression coverage for private boundary injection across
  operator startup, foundation summary, and OBS status policies. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- Completed the remaining dev-report optional boundary-policy cleanup. Production
  config doctor, readiness integration-probe summaries, YouTube ingest post-start
  checks, PostgreSQL admin save preflight, private migration dry-run, migration
  review gate, and health rollback rehearsal now reject unexpected boundary
  fields via exact policy validation. `src/services/dev/*.js` no longer contains
  `boundary_policy?.` checks. `node scripts\run-tests.js` passed: all 366 tests
  passed.
- Hardened server-side boundary-policy validation. Local bridge status/health and
  artifact error responses, render manifest operator reports and manifest
  summaries, OBS setup/config reports, overlay status/event stream status, local
  bridge outbox jobs, YouTube relay reports, and memory vector bridge responses
  now reject unexpected boundary fields while preserving their existing no raw
  packet/job/text/payload/path/endpoint/secret/candidate/command guarantees.
  `src/server/*.js` no longer contains `boundary_policy?.` checks. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- Hardened IRIS env loader boundary validation. Env file load public results now
  reject unexpected boundary fields while preserving env-name/file-name-only,
  no env value/secret/endpoint/payload/command guarantees. `src/**/*.js` no
  longer contains `boundary_policy?.` checks. `node scripts\run-tests.js`
  passed: all 366 tests passed.
- Completed scripts-side boundary-policy optional-chain cleanup. Dev roundtrip,
  preflight, production attention, persistence, YouTube, OBS, bridge, VOICEVOX,
  Live2D, foundation, gameplay, and operator policy scripts now avoid
  `boundary_policy?.` checks, with the highest-risk reports using exact boundary
  helpers and the remaining checks failing hard on missing policy fields.
  `src/**/*.js` and `scripts/*.js` no longer contain `boundary_policy?.`.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Hardened overlay display event and persistence failure boundary summaries.
  Overlay display events now use the same exact boundary-policy helper as the
  event-stream status, with regression coverage for private boundary key
  injection. The persistence failure roundtrip now normalizes commit-result
  boundary summaries to public failure flags instead of copying source boundary
  objects through. `node scripts\run-tests.js` passed: all 366 tests passed.
- Continued recursive boundary-policy cleanup after switching to a full
  `Get-ChildItem -Recurse` scan. Game action validation now rejects unexpected
  validation and observation boundary keys while keeping public summaries on
  fixed policy shapes, candidate persistence summaries no longer spread source
  boundary objects, and foundation launch-plan HTTP/CLI verification summaries
  emit fixed public verification flags. `node scripts\run-tests.js` passed: all
  366 tests passed.
- Hardened YouTube live chat cursor-store boundary validation. Cursor store
  public status now emits a fixed status boundary policy and rejects unexpected
  boundary keys while preserving page-token, live-chat-id, video-id, store-path,
  backup-path, secret, endpoint, and counts-only guarantees. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- Completed recursive source/script boundary-policy optional-chain cleanup.
  Memory search, JSON memory/relationship/operator-policy stores, operator
  policy audit logs, PostgreSQL mock/real adapters, PostgreSQL write plans,
  persistence failures, runtime stores, pg-module resolver, pool factory plan,
  private pool factory, prepared executor, and runtime persistence factory now
  fail on missing policy fields and reject unexpected boundary keys. Recursive
  scans for `boundary_policy?.` and `boundaryPolicy?.` across `src` and
  `scripts` return no matches. `node scripts\run-tests.js` passed: all 366
  tests passed.
- Hardened adapter boundary flag validation. HTTP game observation, HTTP live
  chat relay, and YouTube live chat API status/public substatus validators now
  reject unexpected boundary flags instead of accepting any superset of required
  flags. Added regression coverage for private debug boundary flag injection in
  the three status-contract tests. `node scripts\run-tests.js` passed: all 366
  tests passed.
- Hardened local bridge boundary flag validation. HTTP game control adapter
  status, local bridge engine worker reports/receipts/Live2D renderer cues,
  local engine health probe reports/items, and local bridge worker CLI payloads
  now reject unexpected boundary flags while preserving conditional retry,
  stale-job, and counts-only-status flags. Added regression coverage for private
  debug boundary flag injection across game-control, engine-worker,
  health-probe, and worker-CLI status contracts. `node scripts\run-tests.js`
  passed: all 366 tests passed.
- Hardened dev-service boundary helper validation. Gameplay/persistence env
  setup, local profiles, launch plans, readiness/live readiness, runtime status,
  preflight, local apply plans, and YouTube relay startup checklist helpers now
  reject unexpected boundary fields while preserving explicit dry-run and
  runtime-status public safety flags. Gameplay runtime status now validates
  scheduler, action-gate, and lifecycle boundary policies against known public
  flags without accepting arbitrary private keys. Recursive scans for
  `boundary_policy?.` and `boundaryPolicy?.` across `src` and `scripts` return
  no matches. `node scripts\run-tests.js` passed: all 366 tests passed.
- Tightened readiness-report integration probe boundary validation. The
  integration probe readiness summary now iterates the already-required
  `boundary_policy` object directly instead of tolerating nullish fallback
  shapes, and the preflight safety regression suite now rejects injected private
  probe endpoint boundary flags. Recursive scans for nullish/optional boundary
  policy access across `src` and `scripts` return no matches. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- Tightened production config doctor check-list validation. The production
  config doctor now requires `checks` to be an array before deriving summary and
  readiness counts, removes the remaining optional access on `report.checks`,
  and adds regression coverage for malformed check-list shapes. A targeted scan
  confirms no optional/nullish `report.checks` access remains in the doctor.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Tightened production probe stage-list validation. The production probe report
  now requires `stages` to be a non-empty array before deriving next readiness
  state or readiness counts, preventing malformed reports from reaching
  fallback-style summary helpers. Added regression coverage for `stages: null`
  while preserving existing stage count, duplicate stage, and boundary-policy
  drift checks. `node scripts\run-tests.js` passed: all 366 tests passed.
- Tightened spec manifest addendum-list validation. The spec manifest validator
  now requires `addendum_files` to be present as an array instead of accepting a
  nullish fallback, and the spec manifest regression test now verifies that
  removing the addendum list is rejected. A targeted scan confirms no
  optional/nullish `addendum_files` access remains in the spec manifest. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- Tightened admin review decision log action-count validation. The decision log
  status validator now derives the entry-count cross-check from the already
  validated `action_counts` object instead of using a nullish fallback, and the
  persistence regression test now rejects `action_counts: null` explicitly. A
  targeted scan confirms no optional/nullish `action_counts` access remains in
  the decision log status validator. `node scripts\run-tests.js` passed: all 366
  tests passed.
- Tightened integration fixture adapter-packet validation. The integration
  fixture validator now iterates the required `adapter_packets` object directly
  after exact key validation instead of tolerating a nullish fallback, and the
  fixture regression test now rejects `adapter_packets: null` explicitly. A
  targeted scan confirms no optional/nullish `adapter_packets` access remains in
  the fixture validator. `node scripts\run-tests.js` passed: all 366 tests
  passed.
- Tightened local bridge engine preference summary derivation. The local bridge
  engine worker now derives `engine_preferences_configured` from the internally
  constructed preference objects directly instead of nullish fallbacks, with
  regression coverage confirming default TTS, Live2D, and subtitle preference
  flags remain false. A targeted scan confirms no optional/nullish preference
  access remains in the worker summary path. `node scripts\run-tests.js` passed:
  all 366 tests passed.
- Tightened relationship profile retention state handling. The JSON
  relationship store retention path now derives retained profiles from the
  validated `state.profiles` object directly instead of accepting a nullish
  fallback, and persisted-store regression coverage now rejects `profiles: null`
  with the existing summary-only status contract. A targeted scan confirms no
  optional/nullish `state.profiles` access remains in the relationship store.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Tightened local bridge event render manifest report validation order. Process
  and drain report validators now require `event_render_manifests` to be an
  array before iterating manifest summaries, and regressions now reject
  `event_render_manifests: null` for both report shapes. A targeted scan
  confirms the report validators no longer use a nullish manifest-list fallback
  before array validation. `node scripts\run-tests.js` passed: all 366 tests
  passed.
- Tightened local bridge drain manifest aggregation. The drain report builder
  now aggregates `event_render_manifests` and `event_render_manifest_count`
  directly from already validated process reports instead of nullish fallback
  shapes, keeping the internal handoff invariant aligned with the public report
  validators. A targeted scan confirms no optional/nullish manifest aggregate
  access remains in the drain builder. `node scripts\run-tests.js` passed: all
  366 tests passed.
- Tightened YouTube relay fixture item summarization. The relay bridge summary
  helper now requires an item array instead of treating nullish input as an
  empty fixture source, and the relay bridge regression test now rejects
  `summarizeRelayItems(null)` explicitly while preserving counts-only public
  reports. A targeted scan confirms no nullish item-list fallback remains in the
  relay bridge summarizer. `node scripts\run-tests.js` passed: all 366 tests
  passed.
- Tightened candidate review queue bulk append input validation. The in-memory
  review queue now requires `appendMany` callers to pass an item array instead
  of treating nullish input as an empty append batch, and the candidate review
  queue regression test now rejects `appendMany(null)` explicitly. A targeted
  scan confirms no nullish `nextItems` fallback remains in the queue append
  path. `node scripts\run-tests.js` passed: all 366 tests passed.
- Tightened production probe local endpoint policy aggregation. The production
  probe now requires its internal local endpoint check collection to be an array
  before deriving the endpoint policy summary, instead of accepting a nullish
  empty-check fallback. A targeted scan confirms no nullish `checks` fallback
  remains in that aggregation path. `node scripts\run-tests.js` passed: all 366
  tests passed.
- Tightened boundary audit check-list validation. The boundary audit validator
  now requires `checks` to be present as an array before validating check
  statuses, and the audit regression suite rejects `checks: null` explicitly.
  A targeted scan confirms no nullish `audit.checks` fallback remains in the
  boundary audit validator. `node scripts\run-tests.js` passed: all 366 tests
  passed.
- Tightened candidate validation list contracts. The candidate validator now
  iterates validated stream lifecycle candidate lists directly and requires
  approved memory records, approved relationship records, and rejected
  candidates to be present as arrays before commit-bound validation. Regression
  coverage now rejects null approved/rejected candidate lists explicitly. A
  targeted scan confirms no nullish fallback remains for those validation lists.
  `node scripts\run-tests.js` passed: all 366 tests passed.
- Tightened stream lifecycle and game action rejection list contracts. The
  stream lifecycle validator now requires memory carryover and community memory
  candidate lists to be present as arrays before candidate safety checks, and
  the game action validator now requires `rejected_candidates` to be an array
  before reject reason validation. Regression coverage rejects null lifecycle
  candidate lists and null game action rejection lists. `node scripts\run-tests.js`
  passed: all 366 tests passed.
- Tightened speech and expression timing list contracts. The speech cue
  validator now requires `mouth_cues` to be an array before mouth shape
  validation, and the expression profile validator now requires
  `breath_event_plan` to be an array before breath event validation. Regression
  coverage rejects null mouth cue and breath event lists explicitly. `node
  scripts\run-tests.js` passed: all 366 tests passed.
- Tightened game commentary and personality habit boundary list contracts. The
  game commentary validator now requires `game_personality_tags` to be an
  array, and the personality habit validator now requires a boundary result with
  `allowed_habits` and `blocked_habits` arrays before habit validation.
  Regression coverage rejects null game personality tags and null personality
  boundary habit lists explicitly. `node scripts\run-tests.js` passed: all 366
  tests passed.
- Tightened Phase01 game observation input contracts. Phase01 now requires
  normalized game observation payloads to carry a `detected_events` array instead
  of accepting a nullish empty-event fallback. Regression coverage rejects a
  direct game observation with `detected_events: null` before later core phases.
  `node scripts\run-tests.js` passed: all 367 tests passed.
- Tightened local bridge TTS outbox job contracts. The local bridge outbox
  validator now requires TTS jobs to carry a `mouth_timing` array before engine
  processing, and the local engine worker now forwards that validated list
  without substituting an empty fallback. Regression coverage rejects a null TTS
  mouth timing list on the persisted outbox job. `node scripts\run-tests.js`
  passed: all 367 tests passed.
- Tightened local bridge subtitle outbox job contracts. The local bridge outbox
  validator now requires subtitle jobs to carry a `line_break_plan` array before
  subtitle rendering, matching the generated job shape and preventing null
  subtitle timing plans from reaching the worker. Regression coverage rejects a
  null subtitle line break plan on the persisted outbox job. `node
  scripts\run-tests.js` passed: all 367 tests passed.
- Tightened integration fixture engine request contracts. Synthetic TTS fixture
  requests now carry validated `mouth_timing` and `pause_points` arrays without
  empty-list fallback, and synthetic Live2D fixture requests require a motion
  `tracks` array. Regression coverage rejects null fixture engine timing and
  track lists. `node scripts\run-tests.js` passed: all 367 tests passed.
- Tightened subtitle cue and overlay display line-break contracts. Subtitle cue
  validation now requires `line_break_plan` to be an array before readability
  chunk-count comparison, and overlay display events now require the sanitized
  display line-break plan to remain an array. Regression coverage rejects null
  subtitle and overlay line-break plans. `node scripts\run-tests.js` passed: all
  367 tests passed.
- Tightened runtime game-control action allowlist configuration. When game
  control is enabled, runtime startup now requires `availableGameActions` to be
  an array instead of silently treating null as an empty allowlist before
  candidate creation and validation. Regression coverage rejects null enabled
  game-control action allowlists. `node scripts\run-tests.js` passed: all 367
  tests passed.
- Tightened stream state candidate review mirroring. Stream state updates now
  require runtime results to include `candidate_review_items` as an array before
  public-state sanitization, instead of treating null as an empty review batch.
  Regression coverage rejects null candidate review items during state mirroring.
  `node scripts\run-tests.js` passed: all 367 tests passed.
- Tightened replay log candidate review item contracts. Replay entries now
  require runtime results to include `candidate_review_items` as an array before
  JSONL persistence, and replay entry validation rejects null review item lists
  on append and readback paths. Regression coverage rejects null candidate review
  items during replay append and entry validation. `node scripts\run-tests.js`
  passed: all 367 tests passed.
- Tightened scenario runner candidate review summaries. Scenario replay now
  requires each runtime step result to include `candidate_review_items` as an
  array before computing `candidate_review_count`, instead of treating missing
  review items as zero. Regression coverage rejects null candidate review items
  from a scenario runtime result before summary generation. `node
  scripts\run-tests.js` passed: all 367 tests passed.
- Tightened HTTP ingest candidate review summaries. Processed event summaries now
  require runtime results to include `candidate_review_items` as an array before
  reporting `candidate_review_count`, preventing ingest status from masking a
  missing review batch as zero. Regression coverage uses a no-op stream state to
  verify the scheduler boundary rejects null candidate review items on its own.
  `node scripts\run-tests.js` passed: all 368 tests passed.
- Tightened YouTube support gate roundtrip public-state counting. The support
  gate dev report now reads `last_candidate_review_items.length` directly from
  the validated stream public state instead of falling back to zero for a
  missing list. `node scripts\run-tests.js` passed: all 368 tests passed.
- Tightened runtime candidate review queue attachment. Runtime creation already
  supplies an in-memory review queue when none is provided; event processing now
  appends through that guaranteed queue directly instead of using an optional
  fallback, and `candidateReviewItems()` reads the queue directly. Regression
  coverage verifies a runtime without an injected review queue still records and
  exposes candidate review items. `node scripts\run-tests.js` passed: all 368
  tests passed.
- Tightened runtime candidate review queue operations. Since runtime creation
  guarantees a review queue, `candidateReviewStats()` and
  `clearCandidateReviews()` now call the queue directly instead of returning
  fallback empty stats or null. Regression coverage verifies default queue stats
  and clear behavior after a runtime event. `node scripts\run-tests.js` passed:
  all 368 tests passed.
- Tightened runtime replay log enablement. When replay logging is enabled,
  runtime startup now requires a replay log adapter with `appendRuntimeResult`
  and `readEntries` instead of silently exposing empty replay entries for a
  missing or partial adapter. `replayEntries()` now reads directly from the
  configured replay log when the feature is enabled, while keeping disabled
  replay logging as an empty public list. Regression coverage rejects enabled
  replay logging without an adapter and with an incomplete adapter. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Tightened runtime personality and memory history usage. Runtime creation
  already guarantees habit and recall history objects, so event processing now
  reads and records those histories directly instead of treating them as
  optional empty lists. Regression coverage verifies injected habit history and
  memory recall history record the expected selected habit and recalled memory
  IDs across runtime events. `node scripts\run-tests.js` passed: all 368 tests
  passed.
- Tightened HTTP candidate review endpoints. The HTTP server now calls runtime
  candidate review list, stats, and clear operations directly for public and
  admin review queue routes instead of hiding missing runtime review support
  behind empty-list or null fallbacks. `node scripts\run-tests.js` passed: all
  368 tests passed.
- Tightened HTTP public runtime data endpoints. Relationship, memory, and replay
  routes now call the runtime public read methods directly instead of treating
  missing methods as empty lists, matching the concrete `createIrisRuntime`
  surface while preserving each runtime method's own safe empty result for
  disabled or unavailable stores. `node scripts\run-tests.js` passed: all 368
  tests passed.
- Tightened local engine health probe internal config arrays. Health probe
  preference envs, required response shape groups, and required cue schema lists
  are now read directly from the static engine config instead of using nullish
  empty-list fallbacks, so incomplete internal config fails clearly while
  external health responses remain sanitized. `node scripts\run-tests.js`
  passed: all 368 tests passed.
- Tightened readiness report integration gap definitions. Integration gap
  boundary capability lists are now required static definitions rather than
  nullish empty-list fallbacks, and readiness report validation checks every
  reported gap has a boundary definition before validating required and missing
  capabilities. `node scripts\run-tests.js` passed: all 368 tests passed.
- Tightened production readiness runbook static stage contracts. The foundation
  launch plan now requires the foundation stage to exist and reads its
  configured and missing env lists directly, while stage construction reads
  validated doctor check env arrays directly instead of flattening nullish empty
  fallbacks. `node scripts\run-tests.js` passed: all 368 tests passed.
- Tightened production next-task launch step env contracts. Next configure env
  selection now reads launch step `missing_required_env`, `configure_next_env`,
  and `required_env` arrays directly from the validated production launch plan
  instead of treating absent step arrays as empty. `node scripts\run-tests.js`
  passed: all 368 tests passed.
- Tightened YouTube ingest launch step env contracts. Next configure env
  selection now reads launch step `missing_required_env`, `configure_next_env`,
  and `required_env` arrays directly from validated YouTube ingest launch steps,
  while keeping the no-next-step case as an intentional empty list. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Tightened YouTube ingest env setup plan launch-step reads. The env setup plan
  now builds groups from the validated launch sequence directly and reads each
  group's required, configured, missing, and next-configure env arrays without
  nullish empty-list fallbacks. `node scripts\run-tests.js` passed: all 368
  tests passed.
- Tightened persistence and gameplay env setup launch-step reads. Both setup
  plans now consume validated launch sequences and required/configured/missing
  env arrays directly when deriving env groups and next configure targets,
  keeping only the intentional ready/no-attention empty next-step output. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Tightened optional launch-step env reads across setup plans. Persistence,
  gameplay, and YouTube ingest env setup now read validated `optional_env`
  arrays directly, and YouTube ingest also reads validated `required_env_any_of`
  groups directly instead of masking missing launch-step fields. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Tightened live readiness setup summaries. Foundation and YouTube ingest live
  readiness summaries now read validated env setup groups directly, and
  foundation live readiness reads validated connector handoff items directly
  instead of masking missing internal summary arrays. `node scripts\run-tests.js`
  passed: all 368 tests passed.
- Tightened production live readiness state counting. Internal readiness count
  aggregation now requires callers to pass explicit readiness-state arrays
  instead of silently treating missing state lists as empty; all current callers
  already pass mapped arrays from validated stage or gate summaries. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Tightened readiness counting in foundation and gameplay setup paths.
  Foundation env setup, foundation connector handoff, and gameplay env setup
  now require explicit validated item lists when counting readiness states,
  avoiding silent empty-list fallback and optional item reads inside internal
  aggregation helpers. `node scripts\run-tests.js` passed: all 368 tests passed.
- Tightened gameplay readiness aggregation helpers. Gameplay live readiness,
  readiness rehearsal, runtime status, and startup checklist now require
  explicit gate, flow, or step lists when counting readiness states instead of
  accepting missing lists or optional item reads inside internal aggregators.
  `node scripts\run-tests.js` passed: all 368 tests passed.
- Tightened production readiness aggregation helpers. Production config doctor,
  production probe, readiness runbook, and scheduler enablement plan now count
  and select readiness states from explicit validated arrays, removing silent
  empty-list fallbacks and optional item reads from internal aggregation
  helpers. `node scripts\run-tests.js` passed: all 368 tests passed.
- Tightened foundation rehearsal readiness aggregation. Foundation local env
  readiness rehearsal and foundation readiness rehearsal now require explicit
  readiness item arrays when counting states, matching their generated and
  validated call sites rather than accepting missing lists. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Tightened persistence readiness aggregation item reads. Persistence env setup,
  launch plan, live readiness, runtime status, and startup checklist now read
  readiness state fields directly from validated aggregation items, removing
  optional item access inside internal readiness counting and selection helpers.
  `node scripts\run-tests.js` passed: all 368 tests passed.
- Tightened YouTube ingest readiness aggregation item reads. YouTube ingest env
  setup, launch plan, live readiness, and runtime status now read readiness
  state fields directly from validated aggregation items, aligning runtime,
  setup, and launch summaries with the same explicit internal contract. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Tightened remaining gameplay launch and production next-task aggregation
  reads. Gameplay launch readiness counting now reads validated launch-step
  readiness directly, and production next-task configured env counting now
  requires the validated foundation check list instead of accepting a missing
  list as empty. `node scripts\run-tests.js` passed: all 368 tests passed.
- Tightened production next-task foundation diagnostics. Foundation checks and
  foundation integrations are now consumed directly from the validated
  foundation status report when building production next-task diagnostics,
  instead of masking missing foundation report arrays as empty lists. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Tightened YouTube ingest any-of env handling. YouTube ingest launch and env
  setup next-configure derivation now read validated missing-env group options
  directly, and env setup any-of group sanitization now preserves the validated
  option list contract instead of masking absent options as empty. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Hardened foundation connector handoff startup-step consumption. Startup
  connector items now require the validated startup checklist step and read its
  mode, missing env, launch script, and readiness script directly instead of
  treating a missing step as a normal configuration gap. `node scripts\run-tests.js`
  passed: all 368 tests passed.
- Tightened gameplay startup readiness derivation. Gameplay startup checklist
  readiness now reads the validated `configure_env` list directly instead of
  treating a malformed step as having no configuration work. `node scripts\run-tests.js`
  passed: all 368 tests passed.
- Hardened foundation env setup connector references. Env setup groups now
  require every referenced connector from the validated connector handoff and
  read connector `next_configure_env` lists directly, preventing missing
  connector contracts from being flattened into empty env guidance. `node scripts\run-tests.js`
  passed: all 368 tests passed.
- Tightened env setup unique env sanitizers for gameplay, persistence, and
  YouTube ingest plans. These setup helpers now require validated env name arrays
  from launch-plan steps and any-of groups instead of treating a missing list as
  empty during dedupe. `node scripts\run-tests.js` passed: all 368 tests passed.
- Tightened production scheduler env-name dedupe. Scheduler enablement next-env
  aggregation now requires explicit env arrays from validated preflight data or
  local literals instead of accepting a missing list as empty. `node scripts\run-tests.js`
  passed: all 368 tests passed.
- Hardened candidate review lifecycle extraction. Candidate review item creation
  now requires the runtime stream lifecycle object plus explicit memory carryover
  and community memory candidate arrays, and review-item risk tag sanitization no
  longer treats missing tags as empty. `node scripts\run-tests.js` passed: all
  368 tests passed.
- Tightened admin dashboard next-module script catalog selection. The dashboard
  now preserves the intentional empty catalog when there is no next module, but
  requires a matching module summary whenever `next_module_id` is present instead
  of flattening a missing module into an empty safe-script catalog. `node scripts\run-tests.js`
  passed: all 368 tests passed.
- Hardened boundary audit lifecycle candidate checks. The boundary audit now
  requires explicit stream lifecycle candidate arrays before validating lifecycle
  candidate gating, preventing a missing lifecycle report from being counted as a
  clean zero-candidate audit. `node scripts\run-tests.js` passed: all 368 tests
  passed.
- Tightened candidate persistence public-state contracts. Candidate persistence
  result validation now requires non-negative count fields and explicit
  `persistence_error_kinds`, allowing public-state sanitization to read those
  fields directly instead of filling absent failure summaries with empty defaults.
  `node scripts\run-tests.js` passed: all 368 tests passed.
- Hardened integration endpoint scope aggregation. Integration status summary
  aggregation now requires a scope summary whenever local endpoint policy status
  is present, and the admin integration checklist reads validated scope counts
  directly instead of treating missing count fields as zero. `node scripts\run-tests.js`
  passed: all 368 tests passed.
- Tightened admin dashboard runtime list counting. The dashboard still reports
  zero records when no runtime API is available, but now rejects runtime list
  methods that return missing or non-array values instead of flattening them into
  empty public counts. `node scripts\run-tests.js` passed: all 368 tests passed.
- Hardened persistence status candidate review counts. Candidate review stats
  remain optional for runtime-less status reports, but a provided stats object
  must now include a valid non-negative `total_items` count instead of being
  treated as an empty queue. `node scripts\run-tests.js` passed: all 368 tests
  passed.
- Tightened relationship evidence tag contracts. Relationship update candidates
  now require explicit `evidence_tags`, and game commentary/player relationship
  context reads those validated tags directly while preserving the no-candidate
  empty context. `node scripts\run-tests.js` passed: all 368 tests passed.
- Hardened memory recall and prompt record inputs. Approved memory prompt
  summaries still tolerate a missing memory store, but now reject a configured
  store whose `list()` does not return an array; memory recall likewise rejects
  non-array record inputs instead of treating them as no memories. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Tightened speech cue timing array contracts. Speech cues now require explicit
  `pause_points` and `laugh_breaths` arrays alongside `mouth_cues`, allowing the
  performance plan to consume validated subtitle, mouth, and laugh-breath tracks
  directly instead of filling missing cue arrays with empties. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Hardened PostgreSQL write plan column contracts. Memory, relationship, and
  operator-policy write plan validation now requires the schema-specific column
  name arrays instead of treating missing arrays as empty during column safety
  checks. `node scripts\run-tests.js` passed: all 368 tests passed.
- Tightened production probe local endpoint scope summaries. Production probe
  checks now require complete non-negative local endpoint scope count summaries,
  and cross-stage local endpoint aggregation reads those validated counts
  directly instead of skipping missing summaries or filling absent fields with
  zero. `node scripts\run-tests.js` passed: all 368 tests passed.
- Hardened integration probe engine-health summary aggregation. Integration
  probe summaries now require complete non-negative local engine-health summary
  counts before mirroring them into the bridge readiness summary, preventing
  missing compatibility counts from being reported as zeros. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Hardened foundation worker runtime count contracts. Foundation runtime worker
  summaries still report zero counts when no worker status is available, but a
  present worker status must now provide explicit render-manifest and queue
  counts before runtime handoff aggregation consumes them. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Hardened production probe verification attention counts. Production probe
  verification status now requires explicit adapter-probe and OBS bridge-health
  attention counters before deciding configured probe readiness, and report
  validation rejects missing `*_count` summary fields instead of allowing them to
  disappear from public totals. `node scripts\run-tests.js` passed: all 368
  tests passed.
- Hardened production live-readiness OBS pickup startup counts. Live-readiness
  aggregation still emits a safe zero-count OBS pickup summary when no upstream
  startup summary exists, but a present foundation OBS pickup startup summary
  must now include explicit blocking, ready, and attention counts before live
  gate aggregation consumes it. `node scripts\run-tests.js` passed: all 368
  tests passed.
- Hardened production next-task startup count contracts. Production next-task
  summaries now require explicit operator startup counts and OBS pickup startup
  counts whenever upstream startup plans are present, preventing missing
  startup readiness totals from being treated as zeros during deployment
  priority gating. `node scripts\run-tests.js` passed: all 368 tests passed.
- Hardened YouTube ingest runtime source telemetry counts. YouTube runtime
  scheduler aggregation now requires explicit current-batch request, item,
  comment, and support event counts for YouTube source statuses before poll,
  hygiene, and support-candidate flows consume them, while retaining zero
  defaults for optional legacy cumulative hygiene totals. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Hardened YouTube ingest runtime priority summaries. YouTube runtime scheduler
  aggregation now requires explicit processed, duplicate, source-error, and
  priority-band counts when a YouTube source priority summary is present, while
  ignoring non-YouTube scheduler priority summaries and keeping `top_priority`
  optional for empty batches. `node scripts\run-tests.js` passed: all 368 tests
  passed.
- Hardened gameplay runtime scheduler telemetry and priority summaries.
  Gameplay runtime aggregation now requires explicit request, observation,
  low-confidence, and consecutive-error counts for game observation sources,
  and requires processed, duplicate, source-error, and priority-band counts when
  a game-source priority summary is present, while keeping optional frame
  metadata totals and empty priority summaries compatible. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Hardened gameplay game-control adapter runtime counts. Gameplay runtime now
  requires explicit game-control adapter request, accepted, failed, timeout,
  unsafe-response, HTTP-status failure, request-error, and expired-action counts
  whenever an adapter status is present, while preserving zero summaries when
  no adapter status exists. `node scripts\run-tests.js` passed: all 368 tests
  passed.
- Hardened foundation overlay event-stream contract propagation. Foundation
  runtime now preserves runtime-unavailable fallback for missing or throwing
  overlay event streams, but no longer masks invalid overlay event-stream
  contracts such as missing client or published counts as unavailable. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Hardened persistence runtime collection count inputs. Persistence runtime
  status now preserves zero counts when optional runtime collection methods are
  absent, but requires present `memoryRecords`, `relationshipProfiles`, and
  `replayEntries` methods to return arrays before deriving public runtime
  counts, preventing malformed runtime adapters from being summarized as empty
  stores. `node scripts\run-tests.js` passed: all 368 tests passed.
- Hardened persistence runtime candidate-review stats input. Persistence
  runtime status now preserves a zero candidate-review count when the optional
  stats method is absent, but requires a present `candidateReviewStats` method
  to return an object before deriving the public candidate-review item count,
  preventing malformed review adapters from being summarized as an empty review
  queue. `node scripts\run-tests.js` passed: all 368 tests passed.
- Hardened configured persistence store retained-count inputs. Persistence
  status now preserves zero retained counts for unconfigured memory and
  relationship stores, but requires configured memory and relationship store
  statuses to include explicit `record_count` and `profile_count` values before
  summarizing store health and public retention limits. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Hardened persistence store operation and durability counts. Persistence
  status still supports legacy store statuses with missing operation or
  durability objects, but when those objects are present it now requires
  explicit operation attempt, success, and error counts plus backup write
  attempt, success, and error counts before exposing store health summaries.
  `node scripts\run-tests.js` passed: all 368 tests passed.
- Hardened render manifest store count contracts. Local bridge render manifest
  operator reports now validate their `store_status` count fields, and
  foundation render handoff summaries preserve zero counts only for
  unconfigured stores while requiring configured stores to expose explicit
  manifest, complete-manifest, and invalid-JSON-line counts. `node
  scripts\run-tests.js` passed: all 368 tests passed.
- Hardened foundation OBS browser source runtime dimensions. Runtime summaries
  still report zero dimensions when OBS status is absent, but require present
  OBS browser source statuses to carry explicit positive width, height, and
  FPS values before deriving OBS handoff readiness. `node scripts\run-tests.js`
  passed: all 368 tests passed.
- Hardened local bridge drain count aggregation. Drain reports now require
  generated process reports and per-adapter summaries to carry explicit
  attempted, processed, failed, skipped, and expired counts before aggregation,
  preventing missing internal counts from being folded into public zero-count
  summaries. `node scripts\run-tests.js` passed: all 368 tests passed.
- Hardened local bridge readiness count inputs. Worker and adapter readiness
  classification now requires configured outbox queues, adapter queues, and
  render manifest store statuses to expose explicit count fields instead of
  treating missing values as idle zeroes. Drain manifest counts use the same
  required-count aggregation path. `node scripts\run-tests.js` passed: all 368
  tests passed.
- Hardened local bridge retry ledger recovery. Persisted failure ledger entries
  without explicit integer `retry_attempt_count` are now ignored on worker
  restart instead of being normalized to zero-attempt backoff state, preventing
  corrupt retry metadata from silently extending or resetting retry flow.
  `node scripts\run-tests.js` passed: all 369 tests passed.
- Hardened local bridge subtitle timing generation. Subtitle VTT artifact
  generation now requires explicit non-reversed `display_start_ms` and
  `display_end_ms` values at the worker boundary instead of falling back to
  0/1000ms defaults, keeping malformed subtitle jobs from producing
  plausible-looking timing metadata. `node scripts\run-tests.js` passed: all
  369 tests passed.
- Hardened HTTP engine receipt duration metadata. Successful local TTS and
  Live2D HTTP engine responses now must provide a positive `duration_ms`
  before the worker writes rendered receipts, instead of falling back to job
  estimates or timing hints and masking incomplete engine output. Added a
  regression test for missing duration metadata. `node scripts\run-tests.js`
  passed: all 370 tests passed.
- Hardened HTTP TTS viseme timing artifacts. Engine-provided viseme entries
  without explicit `at_ms` or `start_ms` are now omitted instead of being
  assigned synthetic index-based timing, preventing incomplete mouth timing
  data from looking synchronized. The HTTP engine success test now verifies
  malformed viseme timing is not written. `node scripts\run-tests.js` passed:
  all 370 tests passed.
- Hardened HTTP TTS viseme shape artifacts. Engine-provided viseme entries now
  require an explicit mouth shape label as well as explicit timing before they
  are written to the auxiliary viseme artifact, avoiding silent `neutral`
  substitution for incomplete engine timing records. `node scripts\run-tests.js`
  passed: all 370 tests passed.
- Hardened HTTP engine bridge status metadata. Successful local TTS and Live2D
  HTTP engine responses now must provide explicit `bridge_status` before the
  worker writes engine artifacts or rendered receipts, instead of defaulting
  missing status to `rendered`. Added a Live2D regression test for missing
  bridge status. `node scripts\run-tests.js` passed: all 371 tests passed.
- Hardened retry ledger recovery metadata. Persisted local bridge engine
  failure entries now require explicit `retry_status`, `retryable`,
  `adapter_kind`, and `failure_kind` in addition to `retry_attempt_count`
  before they are restored, preventing corrupt retry ledgers from silently
  becoming `waiting`/retryable entries after restart. `node scripts\run-tests.js`
  passed: all 371 tests passed.
- Hardened OBS render manifest pickup timing. Local bridge render manifests now
  require every TTS/Live2D/subtitle artifact item to carry explicit
  `rendered_at_ms` before OBS pickup is marked ready, even when stale/skew
  guards are not configured. Missing artifact render timestamps now report
  `missing_artifact_render_timestamp` and keep handoff waiting for complete
  artifacts. Added a regression test. `node scripts\run-tests.js` passed: all
  372 tests passed.
- Hardened render manifest timestamp summary validation. The local bridge
  render manifest report validator now verifies per-adapter
  `artifact_render_timestamp_present_by_adapter` maps and aggregate timestamp
  readiness flags stay internally consistent, so malformed operator summaries
  cannot claim timestamp completeness while OBS pickup remains blocked.
  `node scripts\run-tests.js` passed: all 372 tests passed.
- Hardened render manifest OBS pickup status validation. Operator reports now
  validate top-level and summary `obs_pickup_status` values against the known
  pickup state set, including `missing_artifact_render_timestamp`, and reject
  mismatches between the report and latest manifest summary. Added negative
  assertions for unknown and contradictory pickup statuses. `node
  scripts\run-tests.js` passed: all 372 tests passed.
- Hardened render manifest OBS handoff readiness consistency. Operator reports
  now require top-level and summary `obs_handoff_readiness_status` to match
  each other and to be derivable from the corresponding `obs_pickup_status`,
  preventing malformed summaries from claiming ready handoff while pickup is
  blocked. Added negative assertions for contradictory handoff readiness.
  `node scripts\run-tests.js` passed: all 372 tests passed.
- Hardened latest render artifact delivery timing. The local bridge artifact
  delivery route now rejects manifests with missing or non-numeric per-adapter
  `rendered_at_ms` values using `missing_artifact_render_timestamp`, matching
  the operator report OBS pickup contract even when stale/skew guards are not
  configured. Added route coverage for the missing timestamp response.
  `node scripts\run-tests.js` passed: all 372 tests passed.
- Published the artifact render timestamp delivery contract. Integration
  contracts now declare that latest local render artifact delivery requires
  explicit per-adapter render timestamps before delivery, and the contract
  validator rejects OBS overlay or local engine worker contracts that drop the
  policy. `node scripts\run-tests.js` passed: all 372 tests passed.
- Synchronized render timestamp fields in public integration contracts. The
  OBS overlay handoff and local engine worker report contracts now list the
  timestamp completeness fields emitted by the render manifest operator report,
  including the missing timestamp OBS pickup rejection flag. `node
  scripts\run-tests.js` passed: all 372 tests passed.
- Hardened latest artifact render generation matching. Local bridge and HTTP
  server artifact delivery now include `x-iris-rendered-at-ms`, and the OBS
  overlay checks it against `latest_manifest_summary.rendered_at_ms_by_adapter`
  before accepting a fetched TTS/Live2D/subtitle artifact group. `node
  scripts\run-tests.js` passed: all 372 tests passed.
- Updated OBS artifact pickup diagnostics for render timestamp matching. OBS
  overlay setup now names the local artifact delivery policy as requiring both
  manifest id and render timestamp matches, while integration status and
  production probe summaries expose
  `render_timestamp_match_required_for_artifact_pickup`. `node
  scripts\run-tests.js` passed: all 372 tests passed.
- Added the growth, trust, business, and long-term operations specification.
  A new cross-phase addendum now defines fan growth loops, community ritual and
  meme governance, AI transparency, content strategy, monetization safety,
  operator comfort, cost governance, companion-safety boundaries, and public
  analytics/KPIs, with every area required to be manageable from the Operator
  Admin Panel through safe summaries, settings, queues, or confirmed actions.
  The Admin Panel addendum now lists those dashboards, wizards, notifications,
  management controls, implementation priorities, and acceptance criteria.
  `node scripts\run-tests.js` passed: all 372 tests passed.
- Added the anime IP and character linkage specification. A new cross-phase
  addendum defines how IRIS operates as both an AI VTuber and a main character
  from a 120-minute original animated feature, including canon/persona
  separation, character bible governance, spoiler unlock calendars, voice actor
  and original voice rights, fan contribution credits, community lore
  governance, anime-linked content formats, merchandise and voice-product
  business models, sponsor fit checks, and Phase 27 evaluation requirements.
  The Admin Panel addendum now requires safe management of anime character
  bible status, canon separation, spoiler mode, release campaigns, voice
  licenses, community lore, fan credits, products, sponsor fit, funnel KPIs,
  and character image risk.
- Strengthened the anime IP linkage specification around the core user
  experience goal: viewers should feel they are communicating with the
  animated character rather than using a generic AI assistant with an anime
  skin. The addendum now defines in-character, spoiler-safe, non-canon,
  operational disclosure, and fallback out-of-character experience states, plus
  Admin Panel summaries for generic-assistant wording risk, disclosure
  frequency, fallback frequency, and Live2D/TTS/subtitle/response alignment.
- Added anime performance matching requirements. The anime IP linkage addendum
  now requires IRIS to match the animated feature's facial expressions, gaze,
  blink timing, mouth shapes, small gestures, posture, idle motion, breathing,
  emotional transitions, speaking style, voice quality, timbre, pitch,
  intonation, accent, breathiness, laughter, fillers, catchphrases, speech
  speed, pauses, and subtitle pacing against approved anime references. The
  Admin Panel now manages reference readiness, match status, drift queues,
  approval owner, and live promotion status without exposing raw production,
  script, or voice materials.
- Implemented Admin Panel anime performance matching settings. The character
  and voice settings report now includes safe setting IDs and env-name-only
  readiness for anime performance reference profiles, expression matching,
  gaze/blink, mouth/lip-sync, posture/gesture, idle breathing motion, voice
  quality, intonation/accent, catchphrase policy, speech timing, subtitle
  pacing, and approval status. The apply plan blocks raw animation reference
  values, and `.env.example` now lists the new configuration names without
  exposing raw production, script, voice, or model materials. `node
  scripts\run-tests.js` passed: all 372 tests passed.
- Connected anime performance matching to the Admin Dashboard. The read-only
  dashboard now includes safe widgets for anime performance reference
  readiness, expression/motion matching readiness, and voice/speech matching
  readiness. These widgets expose only configured/incomplete status labels and
  never expose raw animation, production, script, voice, endpoint, candidate,
  or command data. `node scripts\run-tests.js` passed: all 372 tests passed.
- Connected anime performance matching to Admin Operations Summary. The
  operator-facing operations summary now includes an
  `anime_performance_matching` module that tracks reference readiness,
  expression/motion readiness, and voice/speech readiness as counts and safe
  status labels only. Missing anime performance configuration now surfaces as
  `configure_anime_performance_matching` with safe verification scripts, without
  exposing raw animation, production, script, voice, endpoint, candidate, or
  command data. `node scripts\run-tests.js` passed: all 372 tests passed.
- Connected anime performance matching to the Admin Integration Checklist. The
  checklist now includes safe setup checks for anime performance references,
  anime expression/motion matching, and anime voice/speech matching. These
  checks use env-name readiness counts and safe script names only, with missing
  setup routed to `configure_anime_performance_matching`, while raw animation,
  production, script, voice, endpoint, candidate, and command data remain
  hidden. `node scripts\run-tests.js` passed: all 372 tests passed.
- Surfaced all character, voice, and anime performance settings on the Admin
  Dashboard page. The browser-facing Admin page no longer truncates the
  character/voice settings list to the first 12 entries, so the anime
  performance matching settings are visible through the same safe setting-card
  renderer. The page still displays only setting IDs, groups, and status labels,
  without raw values, production materials, voice data, endpoints, candidates,
  or commands. `node scripts\run-tests.js` passed: all 372 tests passed.
- Connected anime performance matching to the Production Next Task report as
  admin attention, not a runtime execution gate. When live runtime stages are
  otherwise ready, the report now still points operators to
  `configure_anime_performance_matching` if anime reference, expression/motion,
  voice/speech, or approval settings are missing. The summary uses only counts,
  env names, and safe script names, and explicitly avoids raw character
  reference materials, voice samples, animation materials, script text,
  endpoints, candidates, or commands. `node scripts\run-tests.js` passed: all
  372 tests passed.
- Surfaced the same anime performance admin attention in the Production
  Attention Digest. The digest now carries the anime matching module status,
  next safe script, next operator action, and configured/missing setting counts
  without env lists or raw character assets, so operator-facing daily checks do
  not miss IP/anime performance setup while still staying compact and
  publish-safe. `node scripts\run-tests.js` passed: all 372 tests passed.
- Added anime performance admin attention to the preflight summary. The
  preflight CLI now preserves anime matching status, next operator action, next
  safe script, and configured/missing setting counts from the production
  attention digest, while omitting missing env lists and all raw character,
  voice, animation, script, endpoint, candidate, and command data. `node
  scripts\run-tests.js` passed: all 372 tests passed.
- Propagated anime performance admin attention into the Production Probe next
  task summary and HTTP coverage. The `/production/probe` summary now keeps the
  anime matching module status, next operator action, next safe script, and
  configured/missing setting counts without missing env lists or raw IP assets.
  `/production/next-task` HTTP coverage now also asserts the full report carries
  the same admin attention safely. `node scripts\run-tests.js` passed: all 372
  tests passed.
- Added a dedicated Anime Performance Matching section to the Admin Dashboard
  page. The page still renders the full character/voice settings list, but now
  repeats the performance group as an operator-friendly focused section with
  configured and missing counts so anime expression, motion, voice, speech, and
  approval settings are not buried among all settings. The section uses only the
  existing safe setting IDs, groups, statuses, and counts. `node
  scripts\run-tests.js` passed: all 372 tests passed.
- Added a compact anime performance matching summary to the Admin Character
  Voice Settings CLI. The CLI still returns the full safe settings report, but
  now also includes a top-level performance-only count summary so operators and
  automated checks can read the anime matching status without scanning all 36
  settings, reducing output inspection cost while preserving the no-values,
  no-raw-voice, no-animation-material, no-script-excerpt boundary. `node
  scripts\run-tests.js` passed: all 372 tests passed.
- Hardened the Admin Character Voice Settings CLI as an importable report
  module with explicit public field allowlists. Tests now exercise the compact
  anime performance matching summary with configured and missing counts, confirm
  env values are not echoed, and verify count drift is rejected. This keeps
  future operator automation compact and token-light while preserving the
  no-values, no-raw-voice, no-animation-material, no-production-material,
  no-script-excerpt, no-candidate, and no-command boundary. Operators can use
  `npm run dev:admin:character-voice-settings:summary` when they only need the
  anime performance matching counts. `node
  scripts\dev-public-report-boundary-audit.js` passed, and `node
  scripts\run-tests.js` passed: all 372 tests passed.
- Added the dedicated lightweight CLI wrapper
  `scripts/dev-admin-character-voice-settings-summary.js` and package script
  `npm run dev:admin:character-voice-settings:summary`. This prints only the
  anime performance matching summary instead of the full 36-setting report,
  giving future long-running development loops a smaller operator check path.
  The wrapper reuses the safe CLI summary contract, and `node
  scripts\run-tests.js` passed: all 372 tests passed.
- Threaded the lightweight anime performance settings summary into Admin
  Operations and the Admin Integration Checklist. Anime performance matching
  modules and synthetic checklist items now prefer
  `npm run dev:admin:character-voice-settings:summary` as the next safe script,
  while keeping the full settings CLI in the catalog for detailed review. This
  keeps routine admin checks shorter without changing the counts-only,
  script-name-only public boundary. `node
  scripts\dev-public-report-boundary-audit.js` passed, and `node
  scripts\run-tests.js` passed: all 372 tests passed.
- Propagated the same lightweight anime performance summary script into
  Production Next Task, the Production Attention Digest, and preflight-derived
  summaries. When anime performance matching is waiting on configuration, the
  next operator script now points to the compact count summary instead of the
  full 36-setting report, while the ready path still points to the admin
  dashboard. `node scripts\dev-production-attention-digest.js` confirms the
  compact script in the digest, and `node scripts\run-tests.js` passed: all 372
  tests passed.
- Added the compact anime performance summary script to the Admin Dashboard
  Anime Performance Matching section. The dashboard now shows the summary
  script alongside the performance setting, configured, and missing counts, so
  operators can start with the lightweight count check from the visual admin
  surface before opening the full settings report. `node scripts\run-tests.js`
  passed: all 372 tests passed.
- Added package-script drift coverage for the Admin Character Voice Settings
  full and summary CLIs. The main package script test now asserts that the full
  settings script points at `scripts/dev-admin-character-voice-settings.js` and
  the lightweight summary script points at
  `scripts/dev-admin-character-voice-settings-summary.js`, preventing future
  changes from accidentally routing compact checks back through the large
  report path. `node scripts\dev-admin-character-voice-settings-summary.js`
  produced the compact counts-only report, and `node scripts\run-tests.js`
  passed: all 372 tests passed.
- Added a compact HTTP route for anime performance settings checks:
  `/admin/character-voice-settings/summary`. The route returns only the anime
  performance matching count summary and safe script name, omitting the full
  settings list and all env values, voice samples, animation references,
  production materials, script excerpts, candidates, and commands. The Debug
  page now links to this summary route beside the full Admin Character Voice
  report. `node scripts\dev-public-report-boundary-audit.js` passed, and `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Surfaced the compact HTTP summary route directly in the Admin Dashboard Anime
  Performance Matching section. Operators now see both the lightweight CLI and
  lightweight API route beside the configured/missing counts, which keeps
  routine checks short while still leaving the full settings report available
  for detailed review. `node scripts\run-tests.js` passed: all 373 tests
  passed.
- Added the compact Admin Character Voice Settings summary script and HTTP route
  to the machine-readable Admin Operations and Admin Dashboard verification
  surfaces. The summary script is now exposed as
  `admin_character_voice_settings_summary_script`, and
  `/admin/character-voice-settings/summary` is included in the safe debug route
  catalog, keeping automated admin clients aligned with the lightweight
  operator path. `node scripts\dev-public-report-boundary-audit.js` passed, and
  `node scripts\run-tests.js` passed: all 373 tests passed.
- Locked the Debug page compact Admin Character Voice Summary link in the HTTP
  server regression test. The test now verifies that
  `/admin/character-voice-settings/summary` stays discoverable from the local
  Debug page, protecting the lightweight operator route from future UI drift.
  `node scripts\run-tests.js` passed: all 373 tests passed.
- Added the lightweight Anime Performance Matching operator path to the Admin
  Panel specification. The spec now requires a compact summary CLI and API route
  before full settings views, discoverable from both the local Debug page and
  global dashboard, so long-running development can verify readiness without
  loading raw or verbose character, voice, anime reference, or production
  material settings. The spec manifest regression test now locks this
  requirement, and `node scripts\run-tests.js` passed: all 373 tests passed.
- Aligned the Anime Performance Matching compact summaries with the
  lightweight-first operator path. The CLI and service summary
  `next_safe_script` now point to
  `npm run dev:admin:character-voice-settings:summary` instead of the full
  settings report, and regression tests lock this for the full CLI, compact
  CLI, and HTTP/service summary path. `node scripts\run-tests.js` passed: all
  373 tests passed.
- Extended the public report boundary audit to track required lightweight
  operator scripts. The audit now verifies that
  `scripts/dev-admin-character-voice-settings-summary.js` exists and reports
  only counts plus public-safe relative script names if it is missing. Production
  Attention Digest and preflight summaries now carry the lightweight-script
  missing count without exposing file lists, keeping the low-token Anime
  Performance Matching route protected by the same public boundary checks.
  `node scripts\dev-public-report-boundary-audit.js`, `node
  scripts\run-preflight.js`, and `node scripts\run-tests.js` passed: all 373
  tests passed.
- Added the public report boundary audit to Admin Operations verification
  surfaces. Operators can now discover
  `npm run dev:public-report-boundary-audit` from the admin operations summary,
  alongside the compact character voice summary script and route, without
  exposing audit file lists or private paths. `node scripts\run-tests.js`
  passed: all 373 tests passed.
- Surfaced the public report boundary audit script on the Admin Dashboard
  module summary. The dashboard now renders `Boundary Audit Script` with
  `npm run dev:public-report-boundary-audit`, keeping the lightweight Anime
  Performance Matching summary route and its public-boundary guard discoverable
  from the operator UI as well as JSON verification surfaces. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added a Public Boundary Audit status widget to the Admin Dashboard. The
  widget reports only a ready/attention status and safe summary label based on
  whether the public boundary audit script is present in verification surfaces,
  keeping the audit visible in dashboard JSON without exposing file lists,
  private paths, or raw audit internals. `node scripts\run-tests.js` passed:
  all 373 tests passed.
- Exposed the public report boundary audit through a read-only Admin HTTP
  route. Operators can now open `/admin/public-report-boundary-audit` from the
  Debug page or Admin Operations route catalog and receive the same safe audit
  summary used by the CLI, with counts, statuses, public relative names, and
  boundary policy only. `node scripts\dev-public-report-boundary-audit.js`,
  `node scripts\run-preflight.js`, and `node scripts\run-tests.js` passed: all
  373 tests passed.
- Added the public report boundary audit summary to the Admin Dashboard UI. The
  dashboard now fetches `/admin/public-report-boundary-audit` and renders only
  the audit status, aggregate missing item count, scanned component counts, and
  required lightweight script count, keeping the low-token boundary check
  visible without exposing file contents, env values, commands, payloads, or
  candidates. `node scripts\dev-public-report-boundary-audit.js`, `node
  scripts\run-preflight.js`, and `node scripts\run-tests.js` passed: all 373
  tests passed.
- Added direct Admin Dashboard navigation and cards for the public boundary
  audit route and CLI script. The dashboard toolbar now links to the read-only
  audit JSON, and the audit section renders the safe route and script names
  beside the counts so operators can move between UI, HTTP, and CLI checks
  without loading private details. `node scripts\dev-public-report-boundary-audit.js`,
  `node scripts\run-preflight.js`, and `node scripts\run-tests.js` passed: all
  373 tests passed.
- Threaded the public boundary audit route and script into production attention
  summaries. Production Attention Digest and preflight now include the same
  safe audit CLI script and Admin route used by the Dashboard, allowing
  operators to jump from compact operational summaries to the read-only audit
  surface without exposing file lists, paths, env values, commands, payloads, or
  candidates. `node scripts\dev-public-report-boundary-audit.js`, `node
  scripts\run-preflight.js`, and `node scripts\run-tests.js` passed: all 373
  tests passed.
- Made the Admin Dashboard Public Boundary Audit widget reflect the actual
  audit result. The dashboard now runs the public report boundary audit
  internally and converts only the `ok` result into a safe widget status and
  label, so the operator-facing JSON reports `public_boundary_audit_ok` without
  exposing audit file lists, paths, env values, commands, payloads, or
  candidates. `node scripts\dev-public-report-boundary-audit.js`, `node
  scripts\run-preflight.js`, and `node scripts\run-tests.js` passed: all 373
  tests passed.
- Moved the public report boundary audit implementation into
  `src/services/dev/publicReportBoundaryAudit.js` and kept
  `scripts/dev-public-report-boundary-audit.js` as a thin CLI wrapper. Runtime
  and server code now depend on the dev service instead of importing from the
  scripts layer, preserving the same public-safe audit contract while improving
  long-term maintainability of the Admin Dashboard, HTTP route, preflight, and
  production attention digest paths. `node scripts\dev-public-report-boundary-audit.js`,
  `node scripts\run-preflight.js`, and `node scripts\run-tests.js` passed: all
  373 tests passed.
- Extended the public report boundary audit to detect reverse dependencies
  from `src` back into the scripts layer. The audit now scans source JS imports
  and reports only public-safe aggregate counts plus relative violation file
  names when needed, while Production Attention Digest and preflight surface the
  script-layer import violation count as zero when healthy. This protects the
  dev-service audit architecture from future drift without exposing file
  contents, env values, commands, payloads, or candidates. `node
  scripts\dev-public-report-boundary-audit.js`, `node scripts\run-preflight.js`,
  and `node scripts\run-tests.js` passed: all 373 tests passed.
- Added `npm run dev:foundation:runtime-summary` as a low-output companion to
  the detailed foundation runtime status report. The CLI emits only the
  production handoff summary plus a strict boundary policy, hiding child
  reports, raw stream/overlay state, artifact paths, endpoints, payloads,
  commands, and candidates so long-running development can check the current
  runtime blocker with fewer tokens. The new script is covered by the public
  report boundary audit and production runbook classification. `node
  scripts\dev-foundation-runtime-summary.js`, `node
  scripts\dev-public-report-boundary-audit.js`, `node scripts\run-preflight.js`,
  and `node scripts\run-tests.js` passed: all 373 tests passed.
- Exposed the same compact foundation runtime summary over HTTP at
  `/production/foundation-runtime-summary` and linked it from the Debug Console.
  The route reuses the validated foundation runtime status internally but
  returns only the production handoff summary and a counts/statuses boundary
  policy, giving operators a browser-friendly low-token check for the current
  local runtime blocker without child reports or private runtime details. `node
  scripts\dev-public-report-boundary-audit.js`, `node scripts\run-preflight.js`,
  and `node scripts\run-tests.js` passed: all 373 tests passed.
- Updated Production Attention Digest and preflight to use the compact
  foundation runtime summary as the primary operator focus check when the
  runtime handoff blocker is `foundation_runtime`. The detailed foundation
  runtime status remains the component-level check, while the operator-facing
  first hop now points to `npm run dev:foundation:runtime-summary` for lower
  output during repeated long-running development loops. `node
  scripts\dev-production-attention-digest.js`, `node scripts\run-preflight.js`,
  `node scripts\dev-public-report-boundary-audit.js`, and `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added a safe `local_bridge_worker_attention_reason` label to the foundation
  runtime handoff summary and threaded it into Production Attention Digest and
  preflight. The label is counts/statuses-only and currently identifies
  `retry_blocked_jobs` without exposing queued job bodies, artifact paths,
  endpoints, payloads, commands, or candidates, making the compact runtime
  summary more actionable while preserving the low-token reporting path. `node
  scripts\dev-production-attention-digest.js`, `node scripts\run-preflight.js`,
  `node scripts\dev-public-report-boundary-audit.js`, and `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added `local_bridge_worker_next_operator_action_id` to the compact
  foundation runtime handoff summary, Production Attention Digest, and preflight
  projection. Retry-blocked worker states now surface
  `review_retry_blocked_engine_jobs` beside the counts-only
  `retry_blocked_jobs` reason, giving operators a safe next action without
  exposing queued job bodies, artifact paths, endpoints, payloads, commands, or
  candidates. `node scripts\dev-foundation-runtime-summary.js`, `node
  scripts\dev-production-attention-digest.js`, `node scripts\run-preflight.js`,
  `node scripts\dev-public-report-boundary-audit.js`, and `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Extended `npm run dev:foundation:blocked-worker-roundtrip` with
  `operator_action_reason` and `operator_action_id` so the focused worker
  rehearsal now reports `invalid_queue_lines` / `review_worker_queue_format`
  as fixed safe labels while continuing to hide raw jobs, runtime text,
  endpoints, artifact paths, commands, candidates, and secrets. `node
  scripts\dev-foundation-blocked-worker-roundtrip.js`, `node
  scripts\dev-public-report-boundary-audit.js`, `node scripts\run-preflight.js`,
  and `node scripts\run-tests.js` passed: all 373 tests passed.
- Added the compact foundation runtime summary and blocked-worker rehearsal to
  Admin Operations verification surfaces and the Admin Dashboard module cards.
  Operators can now see `npm run dev:foundation:runtime-summary`,
  `npm run dev:foundation:blocked-worker-roundtrip`, and the
  `/production/foundation-runtime-summary` route from the management surface
  without exposing endpoints, payloads, raw jobs, paths, commands, candidates,
  or secrets. `node scripts\dev-admin-operations-summary.js`, `node
  scripts\run-preflight.js`, `node scripts\dev-public-report-boundary-audit.js`,
  and `node scripts\run-tests.js` passed: all 373 tests passed.
- Added `npm run dev:production:attention-digest` to Admin Operations
  verification surfaces and the Admin Dashboard module cards. The management
  surface now shows the whole-system attention digest, compact foundation
  runtime summary, blocked-worker rehearsal, and the foundation runtime HTTP
  route together as safe operator entry points, keeping the long-running
  development loop script-name based and low-output. `node
  scripts\dev-admin-operations-summary.js`, `node
  scripts\dev-production-attention-digest.js`, and `node scripts\run-tests.js`
  passed: all 373 tests passed.
- Added `npm run dev:production:attention-digest` and
  `npm run dev:foundation:runtime-summary` to Production Config Doctor's
  recommended command catalog. The doctor now points operators to the same
  low-output whole-system and foundation-runtime entry points as the runbook and
  admin dashboard, while keeping the report env-name and script-name only. `node
  scripts\dev-config-doctor.js`, `node scripts\run-preflight.js`, and `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Updated README First Commands and the Debug Console architecture note to list
  the low-output long-running development entry points:
  `npm run dev:production:attention-digest`,
  `npm run dev:foundation:runtime-summary`, and
  `npm run dev:foundation:blocked-worker-roundtrip`, plus the matching
  read-only browser surfaces. The docs now point operators to script-name and
  route-path only checks before detailed runtime reports, preserving the
  low-token workflow without exposing live text, raw jobs, endpoints, paths,
  candidates, commands, voice samples, animation assets, or secrets. `node
  scripts\dev-public-report-boundary-audit.js`, `node
  scripts\dev-production-attention-digest.js`, and `node scripts\run-tests.js`
  passed: all 373 tests passed.
- Added regression coverage that keeps the README First Commands and Debug
  Console documentation aligned with the low-output long-running development
  entry points: `npm run dev:production:attention-digest`, `npm run
  dev:foundation:runtime-summary`, and `npm run
  dev:foundation:blocked-worker-roundtrip`. The same test now also asserts the
  matching package script targets and the `/production/foundation-runtime-summary`
  debug route reference, preventing the token-saving operator flow from drifting
  out of docs. `node scripts\run-tests.js` and `node
  scripts\dev-public-report-boundary-audit.js` passed: all 373 tests passed.
- Strengthened the public report boundary audit's required lightweight script
  catalog so the long-running low-output operator entry points are checked as
  first-class regression surfaces: admin character voice summary, production
  attention digest, foundation runtime summary, and blocked-worker roundtrip.
  Updated `BOUNDARY_AUDIT.md` to document the script-name-only public contract
  and verified the expanded count stays leak-free. `node
  scripts\dev-public-report-boundary-audit.js` and `node scripts\run-tests.js`
  passed: all 373 tests passed.
- Added Admin Dashboard page regression coverage for the public boundary audit's
  `Required Lightweight Scripts` label so operators can see the expanded
  low-output script catalog count from the management UI. This keeps the
  token-saving restart path visible in the dashboard without exposing script
  contents, runtime jobs, env values, candidates, or private assets. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Threaded the public boundary audit required-lightweight-script count into the
  production attention digest and preflight summaries. Operators can now confirm
  the low-output restart catalog is complete from `npm run
  dev:production:attention-digest` or `npm run preflight` without opening the
  detailed audit, while the summaries remain counts-only and omit file lists,
  env values, runtime jobs, candidates, voice samples, animation materials, and
  private configuration. `node scripts\dev-production-attention-digest.js`,
  `node scripts\run-preflight.js`, `node scripts\run-tests.js`, and `node
  scripts\dev-public-report-boundary-audit.js` passed: all 373 tests passed.
- Updated the Debug Console architecture note to document that the low-output
  production attention digest and preflight summaries include the public boundary
  audit's required/missing lightweight script counts. Added regression coverage
  so this operator guidance stays visible alongside the compact restart scripts
  and browser surfaces. `node scripts\run-tests.js` and `node
  scripts\dev-public-report-boundary-audit.js` passed: all 373 tests passed.
- Added HTTP regression coverage for `/admin/public-report-boundary-audit` so
  the read-only management route must expose the required lightweight script
  count and the missing required lightweight script count as counts-only public
  fields. This keeps the browser-visible audit aligned with the low-output CLI
  summaries without exposing file contents or private runtime data. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Extended the npm dev script reference audit to include `README.md`, not only
  `src` and architecture docs. This prevents the low-output restart commands and
  other operator-facing README command references from drifting away from
  `package.json` while keeping the check script-name only. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added an explicit regression assertion that `README.md` participates in the
  npm dev script reference audit after being added to the scanned reference
  files. This makes the token-saving operator command guidance harder to drop in
  future refactors while preserving the script-name-only boundary. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added a compact README restart note that points long-running operators to the
  low-output production attention digest first, then to the foundation runtime
  summary or blocked-worker roundtrip only when needed. The regression suite now
  locks this README guidance and its required/missing lightweight script count
  wording so token-saving restart documentation stays visible. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added a machine-readable `low_output_restart_summary` to the production
  attention digest. It exposes only safe npm script names and lightweight script
  counts, letting CLI users and future management UI surfaces show the compact
  restart path without opening verbose logs, endpoint values, payloads,
  candidates, or runtime state. `node
  scripts\dev-production-attention-digest.js` and `node scripts\run-tests.js`
  passed: all 373 tests passed.
- Threaded the production attention digest's low-output restart summary into
  the preflight projection as flattened script/count fields. `npm run preflight`
  now carries the same compact restart path while preserving its public-safe
  summary boundary and omitting private file lists, endpoint values, payloads,
  candidates, and runtime state. `node scripts\run-preflight.js` and `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added the low-output restart summary to the Admin Operations Summary and
  surfaced the same compact restart path on the Admin Dashboard page. The
  browser view now shows the first check, focus check, blocked-worker check,
  boundary check, and lightweight script counts using existing safe dashboard
  and public boundary audit payloads only. `node
  scripts\dev-admin-operations-summary.js` and `node scripts\run-tests.js`
  passed: all 373 tests passed.
- Added HTTP route regression coverage for `/admin/operations-summary` so the
  low-output restart summary is guaranteed to remain available through the
  management API. The test locks the first check, focus check, full preflight,
  boundary check, and lightweight script counts while preserving the existing
  no-endpoint/no-payload/no-candidate public contract. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Updated the Debug Console architecture note to mention the Admin Dashboard's
  `Low Output Restart` section and its Admin Operations Summary/public boundary
  audit data sources. The regression suite now locks this browser-facing
  operator guidance alongside the existing CLI and route checks. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Updated the README low-output restart note so a fresh development restart can
  discover the Admin Dashboard's `Low Output Restart` section without opening
  architecture docs. The existing README/debug-console command reference
  regression now locks this browser guidance together with the compact CLI
  script/count path. `node scripts\run-tests.js` passed: all 373 tests passed.
- Threaded `low_output_restart_summary` into the Admin Dashboard JSON report and
  `/admin/dashboard` HTTP response, not only the rendered HTML. Dashboard safety
  validation now accepts `npm run preflight` only inside this restart summary and
  rejects unsafe shell fragments or impossible lightweight-script counts. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added a public-boundary regression that locks the low-output restart summary
  source contracts across Admin Operations Summary, Admin Dashboard JSON, and
  the rendered Admin Dashboard page. This keeps the management restart path
  tied to explicit summary-field allowlists and safe script validation instead
  of verbose logs or private payloads. `node scripts\run-tests.js` passed: all
  373 tests passed.
- Added `npm run dev:public-report-boundary-audit` to the documented
  low-output restart flow in README and the Debug Console architecture note,
  and locked it into the low-output command regression. Operators now see the
  focused counts-only boundary check alongside the attention digest, compact
  runtime summary, blocked-worker rehearsal, and preflight guidance. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Locked the low-output restart summary's secondary check across Admin
  Operations Summary, Admin Dashboard JSON, and HTTP dashboard regression
  coverage as `npm run dev:foundation:status`. README and Debug Console now
  document this lighter secondary foundation check before the blocked-worker
  rehearsal, keeping the repeated restart loop lower-output while preserving
  the focused worker drill-down when needed. `node scripts\run-tests.js`
  passed: all 373 tests passed.
- Updated the rendered Admin Dashboard `Low Output Restart` section to use the
  dashboard JSON `low_output_restart_summary` directly before falling back to
  verification surfaces. The browser view now shows `Secondary Check` as
  `npm run dev:foundation:status`, keeps the blocked-worker command as `Worker
  Drilldown`, and includes `Full Preflight`, so the HTML, JSON, and HTTP
  contracts describe the same low-output restart flow. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added `operator_focus_secondary_check_script` to the preflight production
  attention digest projection and validated that `low_output_secondary_check_script`
  matches it. This keeps the low-output restart summary aligned with the
  current operator focus even when the preflight context chooses a different
  secondary check than the default foundation status path. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Extended the public report boundary regression to cover the low-output
  restart secondary-check contract in both the nested production attention
  digest source and the flattened preflight projection. This keeps the
  token-saving restart path visible to the boundary audit without exposing file
  contents, commands beyond safe npm script names, runtime jobs, payloads, or
  candidates. `node scripts\run-tests.js` passed: all 373 tests passed.
- Fixed the Admin Dashboard `Low Output Restart` count fallback to preserve
  explicit zero values with nullish fallback instead of treating `0` as missing.
  The page regression now locks the `missing_required_lightweight_script_count`
  nullish fallback so counts-only restart visibility remains accurate even when
  the compact catalog is healthy. `node scripts\run-tests.js` passed: all 373
  tests passed.
- Extended the Admin Dashboard nullish count fallback cleanup to the safe script
  catalog count and public boundary missing-total calculation. This keeps zero
  values accurate across the operator dashboard's counts-only sections and adds
  page regressions for the fallback expressions. `node scripts\run-tests.js`
  passed: all 373 tests passed.
- Added category-level anime performance matching readiness counts for
  reference, expression/motion, and voice/speech settings to the compact Admin
  Character & Voice summary and CLI output, while keeping setting values, raw
  voice samples, animation cuts, production notes, script excerpts, and model
  paths hidden. The Admin Dashboard now shows the same categories as counts-only
  cards so operators can quickly see which anime-character matching area needs
  work. `node scripts\run-tests.js` passed: all 373 tests passed.
- Propagated the same anime performance matching category counts into the
  production next-task report and low-output production attention digest. This
  lets long-running restarts identify whether reference, expression/motion, or
  voice/speech matching is the remaining anime-character setup gap without
  exposing env values, character reference materials, voice samples, animation
  materials, script text, candidates, commands, or live payloads. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added Admin Panel settings and dashboard cards for anime IP governance:
  canon bible profile, spoiler release policy, non-canon label policy, and IP
  owner approval status. These are exposed as env-name/status-only controls in
  `.env.example`, the Character & Voice settings report, and the Admin
  Dashboard, so operators can manage anime canon and release boundaries without
  leaking policy values, story materials, private production notes, candidates,
  commands, or raw assets. `node scripts\run-tests.js` passed: all 373 tests
  passed.
- Threaded anime IP governance into the Admin Operations anime-performance
  module as a fourth readiness check, preventing canon/spoiler/owner-approval
  gaps from being hidden behind performance-only readiness. The preflight
  production attention digest now also exposes reference, expression/motion,
  and voice/speech anime matching counts as flattened count-only fields for
  lower-output restarts. `node scripts\run-tests.js` passed: all 373 tests
  passed.
- Expanded the production next-task anime setup summary, production attention
  digest, and preflight flattened report to include IP governance setting and
  missing counts. Production readiness now treats the anime setup surface as 16
  required items across reference, expression/motion, voice/speech, and IP
  governance while keeping reports counts-only and env-name-only. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added category-level ready/attention counts to the Admin Operations anime
  performance module for reference, expression/motion, voice/speech, and IP
  governance. This lets operators see canon/spoiler/owner-approval readiness as
  a distinct management gap without exposing setting values or production
  materials. `node scripts\run-tests.js` passed: all 373 tests passed.
- Added an Admin Dashboard top-level Anime IP Governance widget, increasing
  the read-only operator widget set to 32. The dashboard now surfaces
  canon-bible, spoiler-release, non-canon-label, and IP-owner approval
  readiness alongside the existing anime reference, expression/motion, and
  voice/speech widgets, still using status labels only. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Strengthened the spec manifest regression to lock the 2026-05-04 Anime IP
  Character Linkage and Fan Growth/Business/Operations addenda into the test
  suite, including key requirements for interactive anime character experience,
  character bible governance, spoiler control, Admin Panel management, safe fan
  growth, sustainable monetization, operator comfort, and public analytics.
  `node scripts\run-tests.js` passed: all 373 tests passed.
- Added eight Growth Business Operations settings to the Admin Character &
  Voice settings surface and `.env.example`: fan growth lifecycle, community
  ritual review, AI transparency disclosure, content strategy approval,
  monetization safety, operator comfort checklist, cost governance budget, and
  public analytics export policy. The Admin Dashboard now renders a dedicated
  counts/status-only section for these controls without exposing policy values,
  viewer data, raw support text, candidates, commands, or endpoints. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added a top-level Admin Dashboard Growth Business Operations widget and
  raised the read-only widget contract to 33 widgets. The widget reports only a
  configured/attention status and safe summary label for the eight growth,
  trust, monetization, cost, operator-comfort, and analytics policy settings.
  `node scripts\run-tests.js` passed: all 373 tests passed.
- Threaded Growth Business Operations into the production next-task report,
  low-output production attention digest, preflight flattened summary, and
  production probe next-task summary. The new summaries expose only
  status/count/script/env-name information for the eight fan growth, trust,
  monetization, cost, operator comfort, and analytics policy settings, with
  regression coverage for public boundary rejection of private fields and unsafe
  scripts. `node scripts\run-tests.js` passed: all 373 tests passed.
- Added Growth Business Operations to the Admin Operations summary as an eighth
  operator-facing module, grouped into fan/community, trust/content,
  monetization/cost, and operator/analytics readiness counts. The Admin
  Dashboard and HTTP admin operations contract now surface the module through
  counts/status/script-only summaries without policy values, viewer data,
  support text, endpoints, candidates, commands, or payloads. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Extended the Admin Integration Checklist with four Growth Business Operations
  setup checks for fan/community policy, trust/content policy,
  monetization/cost policy, and operator/analytics policy. The checklist now
  tracks 22 safe checks including anime matching and growth/business policy
  readiness, while preserving env-name/count/status/script-only output and
  rejecting endpoint values, secrets, payloads, viewer/support text, candidates,
  commands, raw voice samples, dataset paths, and model paths. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added four Anime IP Governance setup checks to the Admin Integration
  Checklist for canon bible, spoiler release policy, non-canon label policy,
  and IP owner approval. The checklist now tracks 26 safe checks and makes
  anime canon/spoiler/owner-approval readiness visible alongside performance
  matching and growth/business operations, still exposing only env-name counts,
  fixed statuses, and safe script names. `node scripts\run-tests.js` passed:
  all 373 tests passed.
- Expanded Anime IP Governance management for the Admin Panel required areas:
  canon layer policy, stream mode policy, release mode schedule, and character
  communication mode policy. These four settings are now present in
  `.env.example`, Admin Character & Voice settings, Admin Dashboard readiness,
  Admin Operations anime readiness, Production Next Task and low-output
  attention/preflight summaries, and the Admin Integration Checklist. Anime
  setup now tracks 20 required env-name-only controls, and the integration
  checklist tracks 30 safe checks without exposing story bible data, spoiler
  calendars, policy values, voice assets, production notes, endpoints, secrets,
  payloads, candidates, or commands. `node scripts\run-tests.js` passed: all
  373 tests passed.
- Added explicit Admin Dashboard Anime IP Governance cards for Canon Layer,
  Stream Mode, Release Mode, and Character Communication. This makes the new
  Admin Panel-required anime operation controls visible as first-class
  operator-facing statuses, not just hidden setting rows, and locks the labels
  in the HTTP page regression while preserving safe status-only rendering.
  `node scripts\run-tests.js` passed: all 373 tests passed.
- Added use-category voice license readiness settings for stream speech,
  prerecorded lines, voice products, and sponsor campaigns. Admin Character &
  Voice settings now expose these as env-name-only rights status controls plus
  safe aggregate counts in the voice source summary, matching the anime IP
  spec requirement for voice actor/original voice license readiness by use
  category without exposing contract text, raw voice samples, datasets, model
  paths, endpoints, secrets, payloads, candidates, or commands. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Added an Admin Integration Checklist gate for Anime Voice License Use
  Categories so stream speech, prerecorded line, voice product, and sponsor
  campaign rights readiness is visible during setup review. The checklist now
  tracks 31 safe checks and keeps the new voice-license gate env-name/count
  only with the existing no contract text, no raw voice sample, no dataset, no
  model path, no endpoint, no secret, no payload, no candidate, and no command
  boundary. `node scripts\run-tests.js` passed: all 373 tests passed.
- Added Admin Dashboard visibility for Anime Voice License Use Categories. The
  dashboard now has a dedicated safe widget plus Admin Page cards for stream
  voice, prerecorded line, voice product, and sponsor campaign license status,
  raising the widget count to 34 while continuing to expose only fixed labels,
  counts, route/script names, and setting statuses. `node scripts\run-tests.js`
  passed: all 373 tests passed.
- Extended production low-output attention surfaces with Anime Voice License
  Use Category readiness. Production Next Task, Production Attention Digest,
  Preflight, and Production Probe now include safe count-only fields for the
  four voice-license use categories, raising anime performance/admin attention
  required settings from 20 to 24 while keeping env names, counts, script names,
  and fixed statuses only. `node scripts\run-tests.js` passed: all 373 tests
  passed.
- Added Anime Voice License Use Category readiness to Admin Operations Summary.
  The anime performance matching module now treats stream speech, prerecorded
  lines, voice products, and sponsor campaign voice rights as a fifth safe
  readiness category, exposing only counts/statuses/scripts and preserving the
  no contract text, no voice sample, no dataset, no endpoint, no secret, no
  payload, no candidate, and no command boundary. `node scripts\run-tests.js`
  passed: all 373 tests passed.
- Extended Admin Character & Voice compact anime performance summaries to include
  the four Anime Voice License Use Category controls. Service, CLI, and HTTP
  summary outputs now report 16 safe count-only settings with dedicated
  voice-license use-category counts, keeping setting values, contract text, raw
  voice samples, datasets, model paths, endpoints, secrets, payloads, candidates,
  and commands hidden. `node scripts\run-tests.js` passed: all 373 tests passed.
- Added Anime Voice License Use Category visibility to Production Config Doctor
  original voice diagnostics. The real TTS engine check now includes the four
  voice-license use-category env names and count-only configured/missing fields,
  plus an explicit no voice license values boundary, without changing real engine
  readiness or exposing endpoints, secrets, contract text, raw voice samples,
  datasets, model paths, payloads, candidates, or commands. `node
  scripts\run-tests.js` passed: all 373 tests passed.
- Extended Foundation Status and Foundation Live Readiness original voice
  surfaces with Anime Voice License Use Category counts. Foundation summaries and
  the real engine live gate now report the four use-category controls as
  count-only configured/missing fields while preserving the existing fixed
  status, no endpoint, no secret, no payload, no raw voice sample, no model path,
  no candidate, and no command boundaries. `node scripts\run-tests.js` passed:
  all 373 tests passed.
- Added Anime Voice License Use Category env names to the Foundation local env
  setup path. `.env.local` profile/render/apply, Foundation Env Setup Plan, and
  Foundation Launch Plan now include stream speech, prerecorded line, voice
  product, and sponsor campaign voice license status names as optional original
  voice configuration, raising the local template from 53 to 57 env names while
  keeping rendered values out of reports. `node scripts\run-tests.js` passed:
  all 373 tests passed.
- Extended the local bridge engine worker and integration contract with Anime
  Voice License Use Category handoff. The worker now accepts the four optional
  original voice use-category statuses and forwards only count-only TTS engine
  preferences when at least one category is configured, so empty local defaults
  remain unconfigured while fixture roundtrips can verify the safe internal
  contract. `node scripts\run-tests.js` passed: all 373 tests passed.
- Extended the local engine health probe with Anime Voice License Use Category
  readiness. TTS health reports now include the licensed voice source flag and
  four use-category configured/missing counts while keeping values, contract
  text, raw voice samples, datasets, model paths, endpoints, secrets, payloads,
  candidates, and commands out of the public report. `node scripts\run-tests.js`
  passed: all 373 tests passed.
- Propagated Anime Voice License Use Category readiness into the dev engine
  probe handoff summary. `dev-engine-probe` now passes the optional original
  voice license env names into the local engine worker and mirrors the TTS
  health probe's count-only licensed voice/use-category readiness in the
  production handoff summary, with an explicit no voice-license-values boundary.
  `node scripts\run-tests.js` passed: all 373 tests passed.
- Hardened the configured dev engine probe handoff contract for original voice
  readiness. The engine probe public report builder is now directly testable,
  and configured handoff tests verify that licensed voice/use-category readiness
  remains count-only while contract review labels, local endpoints, secrets,
  raw jobs, candidates, and commands stay out of reports. `node
  scripts\run-tests.js` passed: all 374 tests passed.
- Updated runtime and integration documentation for original anime voice local
  engine operation. `INTEGRATION_STATUS.md` and `RUNTIME_LOOP.md` now describe
  that licensed voice source and use-category env names flow only through
  private TTS preferences and count-only health/handoff summaries, with voice
  license values, contract text, raw voice samples, datasets, model paths,
  endpoints, secrets, payloads, candidates, and commands excluded from public
  reports. `node scripts\run-tests.js` passed: all 374 tests passed.
- Added `dev-engine-probe` to the Public Report Boundary Audit required
  lightweight script set. The admin operations/dashboard low-output restart
  summaries now track the required lightweight scripts, keeping the original
  voice engine probe's count-only public handoff under the same audit umbrella
  as character voice settings, production attention, foundation runtime, and
  blocked-worker checks. `node scripts\run-tests.js` passed: all 374 tests
  passed.
- Documented the expanded Public Report Boundary Audit lightweight set.
  `BOUNDARY_AUDIT.md` now lists `npm run dev:engine:probe` beside the other
  long-running low-output checks and explicitly notes that voice license values
  and contract review labels remain out of public reports. Direct
  `dev-public-report-boundary-audit` execution returned `ok: true` with the
  required lightweight scripts, and `node scripts\run-tests.js` passed: all 374
  tests passed.
- Hardened required lightweight script package wiring tests. The public report
  boundary audit regression now verifies that all required low-output
  checks, including `dev:engine:probe`, are present in `package.json` and point
  at their expected script files while the audit report itself remains
  counts-only. `node scripts\run-tests.js` passed: all 374 tests passed.
- Hardened preflight public boundary count regressions. The preflight CLI test
  now directly pins the required lightweight script count and missing
  count to zero across both the production attention digest and public report
  boundary audit summary, so the long-running low-output restart path cannot
  silently drift from the expanded audit set. Direct `node scripts\run-preflight.js`
  execution returned `ok: true`, and `node scripts\run-tests.js` passed: all
  374 tests passed.
- Exposed the Public Report Boundary Audit required lightweight script catalog
  as safe relative script names. The audit report and admin dashboard can now
  show the protected low-output checks, including `dev-engine-probe`,
  without file contents, env values, commands, endpoints, or private payloads.
  Direct `node scripts\dev-public-report-boundary-audit.js` execution returned
  `ok: true`, and `node scripts\run-tests.js` passed: all 374 tests passed.
- Preserved the lower-output preflight boundary after adding the audit script
  catalog. Preflight now has an explicit regression that rejects
  `required_lightweight_scripts`, keeping the catalog available in the admin
  audit route/dashboard while the preflight summary carries counts only.
  Direct `node scripts\run-preflight.js` and
  `node scripts\dev-public-report-boundary-audit.js` executions returned
  `ok: true`, and `node scripts\run-tests.js` passed: all 374 tests passed.
- Added next attention area IDs to admin operations module summaries for anime
  performance matching and growth/business operations. Operators now get a
  compact safe ID for the first missing area, such as anime reference profile or
  fan/community policy, while values, endpoints, payloads, candidates, and
  commands remain excluded. `node scripts\run-tests.js` passed: all 374 tests
  passed.
- Propagated next attention area IDs into the admin dashboard module summary.
  The dashboard now carries and renders a safe `next_attention_area_id` for the
  next attention module, giving operators a clearer first setup area without
  exposing setting values or private configuration. `node scripts\run-tests.js`
  passed: all 374 tests passed.
- Propagated admin next attention area IDs into production next-task,
  production probe, production attention digest, and preflight summaries.
  Anime performance and growth/business attention now expose compact safe area
  IDs such as `anime_reference_profile` and `fan_community` while keeping
  values, scripts, assets, endpoints, payloads, candidates, and commands out of
  public reports. Direct `node scripts\run-preflight.js` returned `ok: true`,
  and `node scripts\run-tests.js` passed: all 374 tests passed.
- Hardened next attention area ID regressions for production surfaces. The
  production next-task contract now rejects unsafe hyphenated area IDs, and the
  HTTP production probe tests verify that anime performance and growth/business
  area IDs survive the public-safe compression path. `node scripts\run-tests.js`
  passed: all 374 tests passed.
- Documented the compact admin attention ID contract in the readiness report.
  `next_attention_area_id` is now described as the first missing setup area for
  anime performance matching or growth/business operations, with the same
  safe-ID boundary shared by admin dashboard, production next-task, production
  probe, production attention digest, and preflight. `node scripts\run-tests.js`
  passed: all 374 tests passed.
- Added compact missing-setting counts for the next admin attention area.
  Admin operations, admin dashboard, production next-task, production probe,
  production attention digest, and preflight now carry
  `next_attention_area_missing_setting_count`, so operators can estimate the
  first setup area's size without exposing setting values, policy payloads,
  voice materials, animation assets, endpoints, secrets, candidates, or
  commands. Direct `node scripts\run-preflight.js` returned `ok: true`, and
  `node scripts\run-tests.js` passed: all 374 tests passed.
- Lifted next attention area hints into the top-level admin operations summary.
  `next_attention_area_id` and `next_attention_area_missing_setting_count` now
  mirror the first non-ready module directly in the admin operations CLI/API
  summary, keeping dashboard and non-dashboard low-output restart paths aligned
  without exposing private setting values or payloads. `node scripts\run-tests.js`
  passed: all 374 tests passed.
- Hardened the HTTP Admin Operations Summary contract for top-level attention
  hints and documented the browser-facing low-output behavior. The server route
  regression now pins the safe next attention area ID/count fields, and
  `DEBUG_CONSOLE.md` notes that these remain IDs and counts only, excluding
  private anime, voice, policy, analytics, endpoint, candidate, and command
  data. `node scripts\run-tests.js` passed: all 374 tests passed.
- Refactored the Admin Operations Summary CLI wrapper to expose a reusable
  `createAdminOperationsSummaryCliReport` function while preserving direct
  JSON CLI output. The regression suite now validates the CLI report shape and
  top-level attention ID/count fields without spawning a child process, keeping
  the low-output CLI path aligned with the service and HTTP contracts.
  `node scripts\run-tests.js` passed: all 375 tests passed.
- Added an explicit Admin Operations Summary CLI report validator. The CLI
  wrapper now rejects unexpected top-level fields and missing/false boundary
  flags around the outer JSON envelope, while still delegating the nested
  operations summary to the service validator. Regression coverage pins both
  successful CLI reports and unsafe envelope drift. `node scripts\run-tests.js`
  passed: all 375 tests passed.
- Added `dev-admin-operations-summary` to the Public Report Boundary Audit
  required lightweight script catalog. The low-output restart set now protects
  the compact admin operations CLI alongside the character voice summary,
  engine probe, production attention digest, foundation runtime summary, and
  blocked-worker roundtrip. Admin Operations and Admin Dashboard now derive the
  lightweight counts from the audit result instead of a fixed number, while
  public/preflight summaries stay limited to safe names and counts.
- Updated the documented low-output restart flow to start with
  `npm run dev:admin:operations-summary` before the production attention digest.
  README, Debug Console guidance, and the npm command reference regression now
  keep the compact admin entry point visible for long-running development
  restarts without opening verbose logs or private payloads.
- Added `entry_check_script` to low-output restart summaries across Admin
  Operations, Admin Dashboard, Production Attention Digest, and preflight. The
  entry script is fixed to `npm run dev:admin:operations-summary`, while the
  existing first/focus/secondary checks remain the safe drilldown path. Dashboard
  rendering and validators reject unsafe entry script drift.
- Added regression coverage that rejects unsafe `entry_check_script` drift in
  Production Attention Digest, preflight, Admin Operations Summary, and Admin
  Dashboard contracts. This keeps the low-output restart entry point script-name
  only and blocks shell fragments before they reach public or management
  surfaces.
- Renamed the Admin Dashboard low-output entry label from `Entry Check` to
  `Start Here`, keeping the JSON field name stable while making the operator
  starting point clearer in the browser UI.
- Locked `entry_check_script` into the HTTP Admin Dashboard and Admin Operations
  Summary regressions so browser clients and management API consumers receive
  the same low-output start point as the CLI and preflight reports.
- Added safe anime identity surface counts to the Admin Character/Voice
  performance summary and CLI summary. Operators can now see how many identity
  surfaces are configured across reference profile, expression and motion,
  voice and speech, IP governance, and voice license use categories without
  exposing setting values, voice samples, animation cuts, production materials,
  script text, candidates, or commands. `node scripts\run-tests.js` passed:
  all 375 tests passed.
- Propagated safe anime identity surface counts into Production Attention
  Digest and the compact preflight production summary. Long-running operators
  can now resume from low-output reports and see whether the five production
  identity surfaces, including IP governance, are configured without opening
  private character references, voice assets, animation assets, policy payloads,
  endpoints, candidates, or commands. `node scripts\run-tests.js` passed: all
  375 tests passed.
- Added an Admin Dashboard browser card for `Anime Identity Surfaces Ready`.
  The page now aggregates reference profile, expression and motion, voice and
  speech, IP governance, and voice license use categories as a ready/total
  count, matching the latest anime-IP specification while keeping raw character
  references, voice assets, animation cuts, policy payloads, endpoints,
  candidates, and commands hidden. `node scripts\run-tests.js` passed: all 375
  tests passed.
- Reduced drift risk in anime identity surface counting by replacing hardcoded
  surface totals with named constants and a shared local counting helper in the
  service/CLI paths, and by using a named prefix catalog in Production
  Attention Digest. The management page now also uses an explicit
  `animeIdentitySurfaceCount` variable for the displayed ready/total count.
  `node scripts\run-tests.js` passed: all 375 tests passed.
- Added anime identity surface counts to the Admin Integration Checklist status
  summary. The checklist now mirrors the five identity surfaces as safe
  ready/missing counts derived from existing checklist items, so operators can
  compare checklist, dashboard, Production Attention Digest, and preflight
  without exposing env values, character references, voice samples, animation
  assets, policy payloads, endpoints, candidates, or commands. `node
  scripts\run-tests.js` passed: all 375 tests passed.
- Added the same anime identity surface counts to the Admin Operations Summary
  anime performance module. The low-output restart entry point now exposes the
  five-surface ready/missing status before operators drill into the dashboard,
  Production Attention Digest, preflight, or integration checklist, while still
  keeping private anime assets, voice materials, env values, endpoints,
  candidates, and commands out of the report. `node scripts\run-tests.js`
  passed: all 375 tests passed.
- Locked the HTTP `/admin/operations-summary` route regression to the same anime
  identity surface count fields and documented the matching low-output
  operations-summary view in `INTEGRATION_STATUS.md`. Management API consumers
  now receive the same count-only anime identity status as the CLI/service
  contract, dashboard, preflight, Production Attention Digest, and checklist.
  `node scripts\run-tests.js` passed: all 375 tests passed.
- Reduced Admin Operations Summary drift risk by centralizing the anime identity
  surface env groups into one local frozen catalog. The anime performance
  module now derives ready checks, next attention area, missing-setting counts,
  and five-surface ready/missing totals from the same catalog instead of
  duplicated arrays. `node --check src\services\dev\adminOperationsSummary.js`,
  `node --check scripts\run-tests.js`, and `node scripts\run-tests.js` passed:
  all 375 tests passed.
- Reduced Admin Integration Checklist drift risk by centralizing the anime
  identity surface check IDs into one local frozen catalog. The checklist status
  summary and validator now derive the five-surface total from that catalog
  instead of hardcoding the surface count or duplicating ID groups. `node
  --check src\services\dev\adminIntegrationChecklist.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 375 tests
  passed.
- Reduced preflight anime identity surface drift by replacing the remaining
  hardcoded five-surface check with a local frozen preflight surface catalog.
  Preflight now validates the production attention digest identity totals from
  that catalog length while preserving the existing counts-only output shape.
  `node --check scripts\run-preflight.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 375 tests passed.
- Aligned Admin Character/Voice anime performance summaries with the latest
  five-surface identity model by including IP governance counts alongside
  reference profile, expression and motion, voice and speech, and voice license
  use categories. The service summary, CLI summary, compact HTTP summary, and
  validators now report five surfaces without exposing setting values or private
  anime materials. `node --check src\services\dev\adminCharacterVoiceSettings.js`,
  `node --check scripts\dev-admin-character-voice-settings.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 375 tests
  passed.
- Documented that the compact Admin Character/Voice summary exposes the same
  five-surface count used by the dashboard and operations summary. Added README
  regression checks so future documentation changes keep the low-output
  `dev:admin:character-voice-settings:summary` path discoverable. `node --check
  scripts\run-tests.js` and `node scripts\run-tests.js` passed: all 375 tests
  passed.
- Reduced Production Attention Digest identity-surface validator drift by
  deriving category total checks from the frozen anime identity surface prefix
  catalog. Adding another managed anime identity surface now requires less
  repeated count math in the digest validator. `node --check
  scripts\dev-production-attention-digest.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 375 tests
  passed.
- Reduced anime performance category-count drift across Admin Character/Voice,
  Production Next Task, and preflight validators by deriving setting,
  configured, and missing totals from local identity surface catalogs instead
  of handwritten five-category addition. This keeps the anime/IP management
  model easier to extend while preserving counts-only public output. `node
  --check src\services\dev\adminCharacterVoiceSettings.js`, `node --check
  scripts\dev-admin-character-voice-settings.js`, `node --check
  src\services\dev\productionNextTask.js`, `node --check
  scripts\run-preflight.js`, and `node scripts\run-tests.js` passed: all 375
  tests passed.
- Reduced Production Next Task attention-area drift by centralizing the anime
  performance and growth/business attention area definitions used for
  `next_attention_area_id` and missing-setting counts. The management dashboard
  next-action guidance now has one local source for those grouped environment
  checks while keeping the existing counts-only contract. `node --check
  src\services\dev\productionNextTask.js` and `node scripts\run-tests.js`
  passed: all 375 tests passed.
- Reduced Admin Dashboard widget drift by centralizing the anime identity and
  growth/business configured-status widget definitions. The dashboard still
  exposes the same widget IDs and safe summaries, but the environment lists are
  no longer duplicated inside each widget call. `node --check
  src\services\dev\adminDashboard.js` and `node scripts\run-tests.js` passed:
  all 375 tests passed.
- Added a dashboard-to-operations regression check for anime identity surfaces.
  The Admin Dashboard test now verifies that its five anime identity widgets
  match the Admin Operations Summary anime identity surface and missing-surface
  counts, preventing future management UI drift when anime/IP setup areas
  change. `node --check scripts\run-tests.js` and `node scripts\run-tests.js`
  passed: all 375 tests passed.
- Added an Integration Checklist-to-Operations regression check for anime
  identity surfaces. The checklist test now verifies its status-summary surface
  and missing-surface counts against Admin Operations Summary, so dashboard,
  checklist, and operations management views are all guarded against anime/IP
  setup-count drift. `node --check scripts\run-tests.js` and `node
  scripts\run-tests.js` passed: all 375 tests passed.
- Strengthened the HTTP compact Admin Character/Voice summary regression by
  asserting anime identity surface, configured-surface, and missing-surface
  counts on `/admin/character-voice-settings/summary`. The HTTP management API
  now has the same five-surface guard already used by CLI, service, dashboard,
  checklist, and operations-summary checks. `node --check scripts\run-tests.js`
  and `node scripts\run-tests.js` passed: all 375 tests passed.
- Documented the HTTP compact Admin Character/Voice summary in README as a
  management UI/API path that exposes the same five-surface anime identity
  count without raw settings. Added README regression checks for the route and
  management API wording. `node --check scripts\run-tests.js` and `node
  scripts\run-tests.js` passed: all 375 tests passed.
- Made all five anime identity surfaces visible on the local Admin Dashboard by
  adding IP Governance Ready and Voice License Ready cards to the Anime
  Character/Voice settings widget. Added page regression assertions so the
  management screen continues to expose the full anime/IP setup model. `node
  --check src\server\adminDashboardPage.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 375 tests
  passed.
- Reduced Admin Dashboard widget-count drift by deriving the expected widget
  count from the approved widget id catalog instead of a duplicated literal.
  Strengthened the dashboard regression to assert `widget_count`, rendered
  widget length, and unique widget ids stay aligned. `node --check
  src\services\dev\adminDashboard.js`, `node --check scripts\run-tests.js`,
  and `node scripts\run-tests.js` passed: all 375 tests passed.
- Documented the Admin Dashboard's new `IP Governance Ready` and `Voice License
  Ready` cards in README so operators can find the anime/IP governance and
  voice-use license checks from the browser management surface. Added README
  regression assertions for both labels. `node --check scripts\run-tests.js`
  and `node scripts\run-tests.js` passed: all 375 tests passed.
- Reduced Admin Character/Voice CLI drift by exporting the anime performance
  five-surface setting catalogs from the service module and importing them into
  the CLI summary script instead of duplicating reference, expression/motion,
  voice/speech, IP governance, and voice-license category definitions. `node
  --check src\services\dev\adminCharacterVoiceSettings.js`, `node --check
  scripts\dev-admin-character-voice-settings.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 375 tests
  passed.
- Reduced browser Admin Dashboard voice-license drift by centralizing the four
  voice license use-category setting ids inside the page script and reusing that
  catalog for both Anime Character/Voice readiness and Anime IP Governance
  cards. Added a page regression assertion for the shared catalog name. `node
  --check src\server\adminDashboardPage.js`, `node --check
  scripts\run-tests.js`, and `node scripts\run-tests.js` passed: all 375 tests
  passed.
- Reduced anime identity regression drift by importing the shared
  `ANIME_PERFORMANCE_IDENTITY_SURFACE_COUNT` into the main test suite and
  replacing hard-coded five-surface expectations across production attention,
  operations summary, integration checklist, CLI summary, service summary, HTTP
  compact summary, and Admin Dashboard HTTP checks. `node --check
  scripts\run-tests.js` and `node scripts\run-tests.js` passed: all 375 tests
  passed.
- Reduced Admin Operations Summary anime identity drift by exporting the shared
  `ANIME_PERFORMANCE_IDENTITY_SURFACE_ENV_GROUPS` catalog from Admin
  Character/Voice settings and reusing it for operations-summary readiness,
  next-attention-area, and missing-setting counts. `node --check
  src\services\dev\adminCharacterVoiceSettings.js`, `node --check
  src\services\dev\adminOperationsSummary.js`, and `node scripts\run-tests.js`
  passed: all 375 tests passed.
- Reduced Production Next Task anime identity drift by deriving anime
  performance env names, attention areas, category prefixes, IP governance
  envs, and voice-license use-category envs from the shared Admin
  Character/Voice identity-surface catalogs instead of duplicating literal env
  arrays. `node --check src\services\dev\productionNextTask.js` and `node
  scripts\run-tests.js` passed: all 375 tests passed.
- Reduced Admin Integration Checklist anime identity drift by reusing the shared
  Admin Character/Voice identity-surface env catalog for the anime reference,
  expression/motion, voice/speech, and voice-license checklist items instead of
  duplicating those env arrays. `node --check
  src\services\dev\adminIntegrationChecklist.js` and `node scripts\run-tests.js`
  passed: all 375 tests passed.
- Reduced Production Attention Digest and Preflight anime identity drift by
  reusing `ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES` for production digest
  surface totals and deriving preflight anime performance surface field prefixes
  from that same catalog. `node --check
  scripts\dev-production-attention-digest.js`, `node --check
  scripts\run-preflight.js`, and `node scripts\run-tests.js` passed: all 375
  tests passed.
- Reduced original-voice license category drift by exporting
  `ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES` from Admin
  Character/Voice settings and reusing it across local engine health probes,
  foundation status, live readiness, launch planning, local env profiles,
  env setup plans, integration contracts, production config doctor, and Admin
  Dashboard readiness widgets. Targeted `node --check` runs and `node
  scripts\run-tests.js` passed: all 375 tests passed.
- Hardened the YouTube direct live chat and runtime ingest roundtrip scripts so
  they remain self-contained even when local developer env values select HTTP
  game control or HTTP vector memory search adapters. Both scripts now force the
  unused game-control path to mock/disabled and memory search to local for the
  rehearsal, and regression assertions cover those overrides. `node
  scripts\dev-youtube-direct-live-chat-roundtrip.js`, `node
  scripts\dev-youtube-runtime-ingest-roundtrip.js`, and `node
  scripts\run-tests.js` passed: all 375 tests passed.
- Strengthened the YouTube runtime ingest roundtrip toward the real streaming
  loop by counting TTS, Live2D, and subtitle adapter handoffs and requiring every
  processed comment/support event to reach all output adapters. `node
  scripts\dev-youtube-runtime-ingest-roundtrip.js` and `node scripts\run-tests.js`
  passed: all 375 tests passed.
- Linked the YouTube runtime ingest roundtrip to the next OBS pickup verification
  step by reporting `npm run dev:obs:runtime-render-roundtrip` as the required
  artifact check after all processed events reach TTS, Live2D, and subtitle
  adapters. `node scripts\dev-youtube-runtime-ingest-roundtrip.js` and `node
  scripts\run-tests.js` passed: all 375 tests passed.
- Strengthened the production loop roundtrip with a counts-only
  `streaming_loop_verified_through_obs_pickup` handoff flag and expected output
  adapter job count, proving fixture YouTube/vision events reach TTS, Live2D,
  subtitle, render manifests, and OBS pickup readiness in one loop. `node
  scripts\dev-production-loop-roundtrip.js` and `node scripts\run-tests.js`
  passed: all 375 tests passed.
- Linked the YouTube runtime ingest rehearsal directly to the production loop
  fixture by adding `ready_for_production_loop_fixture` and
  `npm run dev:production-loop:roundtrip` to the output handoff summary once all
  processed events reach TTS, Live2D, and subtitle adapters. `node
  scripts\dev-youtube-runtime-ingest-roundtrip.js` and `node scripts\run-tests.js`
  passed: all 375 tests passed.
- Made Production Next Task point operators from the current YouTube runtime
  verification directly to the full production loop fixture by adding
  `production_loop_verification_script` to the safe report and handoff summary,
  while mirroring `next_runtime_verification_script` in the handoff summary.
  `node scripts\dev-production-next-task.js` and `node scripts\run-tests.js`
  passed: all 375 tests passed.
- Propagated the same runtime-to-production-loop verification path into
  Production Probe, so the top-level probe summary and production handoff now
  show `next_task_runtime_verification_script` and
  `production_loop_verification_script` without exposing live targets. `node
  scripts\dev-production-probe.js` and `node scripts\run-tests.js` passed: all
  375 tests passed.
- Added the production loop verification path to Production Live Readiness, so
  the main live-readiness report, verification script catalog, and handoff
  summary all point to `npm run dev:production-loop:roundtrip` alongside the
  runtime handoff status check. `node scripts\dev-production-live-readiness.js`
  and `node scripts\run-tests.js` passed: all 375 tests passed.
- Added the full production loop verification script to Admin Operations
  verification surfaces, giving the main operator entry point a direct safe path
  to `npm run dev:production-loop:roundtrip` after runtime handoff checks. `node
  scripts\dev-admin-operations-summary.js` and `node scripts\run-tests.js`
  passed: all 375 tests passed.
