# IRIS System Map

Status: spec governance map
Authority: subordinate to `IRIS_SPEC_AUTHORITY.md`, Phase00, numbered Phase specs, and active cross-phase addenda.

This map is an index for future IRIS changes. It does not implement runtime behavior, does not claim production readiness, and does not replace the parent `IRIS_SPEC.md`.

## Global Rules

- Every PR that changes a feature, boundary, public surface, readiness decision, eval, skill policy, Curator plan, growth report plan, trace optimizer plan, Hermes-style operations or expansion plan, or Codex harness behavior must update the relevant spec and `IRIS_FEATURE_REGISTRY.md`.
- Public surfaces may expose only safe summaries: status, component label, count, safe reason label, safe reference label, and safe next action label.
- Internal-only data includes secrets, endpoints, tokens, raw payloads, raw responses, raw diagnostics, raw comments, raw memory, candidates, commands, `world_command`, private IDs, hidden scores, and `inner_intent`.
- Memory status remains exactly `candidate`, `accepted`, `protected`, `stale`, and `rejected`.
- Natural memory use remains limited to `accepted` and `protected`.
- `approved` remains a schema or review concept only; it is not an IRIS memory status.
- Missing worker, engine, OBS, TTS, Live2D, DB, YouTube, Game, subtitle, bridge, or fresh evidence must not be classified as production ready.
- Priority1 real-operation blockers remain blocked until real evidence and human confirmation exist.

## Areas

### Personality / SOUL

- Purpose: preserve IRIS as a specific character OS rather than a generic assistant voice.
- Canonical spec files: `docs/iris/IRIS_SPEC.md`, `docs/iris/IRIS_SOUL.md`.
- Implementation candidate files: response planning and avatar response modules.
- Public allowed information: final user-facing response text and safe personality style.
- Internal-only information: private reasoning, hidden policy state, `inner_intent`.
- Prohibited: generic persona drift, unsupported certainty, fabricated intimacy, public `inner_intent`.
- Missing or blocked: broad real-response character-quality evals remain missing.
- Related eval: `node scripts/run-iris-evals.mjs`.

### Memory / memory

- Purpose: maintain bounded continuity without unsafe recall or direct commits.
- Canonical spec files: `docs/iris/IRIS_MEMORY_POLICY.md`, `IRIS_SPEC_AUTHORITY.md`.
- Implementation candidate files: `src/services/memory/irisMemoryRecordContract.js`, memory persistence and recall modules.
- Public allowed information: safe memory summaries when explicitly allowed.
- Internal-only information: raw memory, raw candidate payload, hidden relationship score, private viewer data.
- Prohibited: restoring `approved` as memory status, natural use of `candidate`, `stale`, or `rejected`, direct candidate commit.
- Missing or blocked: full runtime recall enforcement is partial; candidate direct commit remains prohibited and production memory evidence is not claimed.
- Related eval: `node scripts/run-iris-evals.mjs`.

### Skill / skill

- Purpose: keep skills useful while preserving Phase ownership and Adapter boundaries.
- Canonical spec files: `IRIS_SPEC_AUTHORITY.md`, relevant Phase specs, `docs/iris/IRIS_FEATURE_REGISTRY.md`.
- Implementation candidate files: skill policy modules and eval harnesses.
- Public allowed information: safe skill name, status, and operator-approved summary.
- Internal-only information: raw tool payloads, hidden prompts, private traces, unsafe commands.
- Prohibited: skill self-modification without review, command execution shortcut, candidate bypass.
- Missing or blocked: self-improvement and skill Curator flows are planned or spec-only.
- Related eval: future skill policy evals.

### Avatar / avatar

- Purpose: map speech, expression, gesture, gaze, and voice guidance without turning guidance into execution.
- Canonical spec files: `docs/iris/IRIS_AVATAR_BEHAVIOR_MAP.md`, `docs/iris/IRIS_SPEC.md`.
- Implementation candidate files: `src/services/avatar/irisAvatarResponseContract.js`, adapter guidance modules.
- Public allowed information: safe speech, visible expression labels, safe motion labels when allowed.
- Internal-only information: `inner_intent`, raw renderer payload, model paths, endpoint values, raw voice samples.
- Prohibited: public `inner_intent`, fabricated speech for silent output, renderer command leakage.
- Missing or blocked: full adapter integration proof remains partial.
- Related eval: `node scripts/run-iris-evals.mjs`.

### Public Output

- Purpose: ensure public response, public JSON, overlay state, reports, and logs remain safe.
- Canonical spec files: `IRIS_SPEC_AUTHORITY.md`, `docs/iris/IRIS_SPEC.md`.
- Implementation candidate files: public projection, report, overlay, and safe summary helpers.
- Public allowed information: status, component label, count, safe reason label, safe next action label.
- Internal-only information: secrets, endpoints, tokens, raw payloads, raw responses, candidates, commands, `world_command`.
- Prohibited: raw comment text, raw source response, raw memory, hidden scores, endpoint values, public `inner_intent`.
- Missing or blocked: D3/D4/scenario residual tests are cleared; full real-operation public surface evidence remains incomplete.
- Related eval: `node scripts/run-tests.js`.

### Admin / operator

- Purpose: give operators safe visibility and approved controls without exposing private or raw data.
- Canonical spec files: Admin addenda under the authority order, `IRIS_SPEC_AUTHORITY.md`, this map.
- Implementation candidate files: admin dashboard, operator widget, and setup/report modules.
- Public allowed information: safe setting labels, configured/missing state, booleans, counts.
- Internal-only information: secret values, endpoint values, raw support messages, raw jobs, hidden scores, raw commands.
- Prohibited: ordinary Admin view exposing payloads, operator actions bypassing validation, direct world commands.
- Missing or blocked: PR-F3 admin/operator public safe summary remains unapproved.
- Related eval: admin/operator tests in `node scripts/run-tests.js`.

### Runtime / bridge / server

- Purpose: coordinate local runtime, bridge, server, worker, and health state without fake readiness.
- Canonical spec files: `IRIS_SPEC_AUTHORITY.md`, runtime and bridge Phase specs, `docs/iris/IRIS_RUNTIME_OPERATION_RUNBOOK.md`.
- Implementation candidate files: `src/server/localBridgeServer.js`, `src/server/localBridgeEngineWorker.js`, health probes, runtime schedulers.
- Public allowed information: safe component status, stale/degraded/blocked labels, safe artifact references.
- Internal-only information: raw bridge payload, raw command, raw path, endpoint value, token, raw diagnostic.
- Prohibited: treating missing worker/engine/stale artifact as ready, hiding unsafe packets behind auth errors.
- Missing or blocked: PR-F3 and PR-F4 runtime/bridge follow-up remains unapproved.
- Related eval: bridge, runtime, server, health subsets in `node scripts/run-tests.js`.

### Adapter / source boundary

- Purpose: preserve Core / Adapter separation and safe source normalization.
- Canonical spec files: `IRIS_SPEC_AUTHORITY.md`, Phase04, source-specific addenda, this map.
- Implementation candidate files: `src/adapters/*`, runtime ingest source modules, source normalizers.
- Public allowed information: safe adapter result, safe source status, safe error code, counts.
- Internal-only information: raw adapter packet, raw response, endpoint value, token, candidate, command, `world_command`.
- Prohibited: candidate direct Adapter handoff, unknown adapter execution, External Observation as truth.
- Missing or blocked: source-specific real-operation proof remains blocked for Game, OBS/TTS/Live2D, and related public-state paths.
- Related eval: adapter/source subsets in `node scripts/run-tests.js`.

### YouTube / OBS / TTS / Live2D / Game / DB

- Purpose: keep source and adapter integrations isolated, safe, and non-authoritative.
- Canonical spec files: source-specific specs/addenda under `IRIS_SPEC_AUTHORITY.md`, this map.
- Implementation candidate files: `src/adapters/youtube/*`, OBS bridge modules, TTS modules, Live2D modules, Game source/adapters, DB persistence modules.
- Public allowed information: configured/missing status, safe source labels, safe counts, safe artifact references.
- Internal-only information: OAuth token, API key, endpoint, raw comment, raw support message, private IDs, raw frames, raw voice samples, raw SQL.
- Prohibited: source data as truth, donation amount as rank, raw integration output in public/Admin/logs.
- Missing or blocked: Game source cleanup, OBS/TTS/Live2D cleanup, DB real-operation proof, and priority1 real residency proof remain blocked.
- Related eval: integration-specific subsets in `node scripts/run-tests.js`.

### Readiness / production blocker

- Purpose: distinguish fixture rehearsal, local dry-run, and real production evidence.
- Canonical spec files: `docs/iris/IRIS_RELEASE_GATE.md`, `docs/iris/IRIS_RUNTIME_OPERATION_RUNBOOK.md`, `IRIS_SPEC_AUTHORITY.md`.
- Implementation candidate files: production readiness, config doctor, integration status, local engine health probes.
- Public allowed information: safe readiness status, blocked reason label, count, operator action label.
- Internal-only information: endpoint values, env values, raw diagnostic, raw path, raw response.
- Prohibited: readiness sweetening, fixture pass as real ready, missing health endpoint as ready.
- Missing or blocked: priority1 real worker/engine/OBS/TTS/Live2D/DB/YouTube/Game proof remains blocked.
- Related eval: production, readiness, preflight, probe subsets in `node scripts/run-tests.js`.

### Eval / regression

- Purpose: preserve behavior, boundary, and safety checks across PRs.
- Canonical spec files: `docs/iris/IRIS_EVALS.md`, `docs/iris/IRIS_KNOWN_RESIDUAL_TEST_FAILURES.md`.
- Implementation candidate files: `scripts/run-iris-evals.mjs`, `scripts/lint-iris-docs.mjs`, `scripts/run-tests.js`.
- Public allowed information: test name, component label, pass/fail, safe reason label, count.
- Internal-only information: raw logs that contain secrets, endpoints, raw payloads, raw memory, raw commands.
- Prohibited: test deletion to hide failure, skip-only pass, raw log reporting.
- Missing or blocked: `npm test` passes; production proof and future coverage expansion remain outside regression pass.
- Related eval: all required local and remote quality checks.

### Growth / Curator / trace optimizer

- Purpose: future governed improvement and review loops for IRIS quality.
- Canonical spec files: `docs/iris/IRIS_HERMES_OPERATIONS_SPEC.md` for operations-layer boundaries, future spec addenda, and `docs/iris/IRIS_FEATURE_REGISTRY.md`.
- Implementation candidate files: future Curator, trace optimizer, growth review, failure memory, and PR advisor modules.
- Public allowed information: safe improvement status, reviewed capability label, blocked reason label.
- Internal-only information: raw traces, private prompts, dataset paths, raw failures, unsafe suggestions.
- Prohibited: claiming planned features are complete, using raw traces as public output, automatic production changes without review, mixing IRIS memory DB with operations Skill DB or Trace DB.
- Missing or blocked: Curator, growth report, real response-quality eval, GEPA-style optimizer, Skill DB, Trace DB, and Hermes-style expansion remain planned or spec-only.
- Related eval: future growth and trace safety evals.

### Hermes-style operations layer

- Purpose: specify safe development operations for Codex instructions, PR splitting, R3 confirmation, audits, quality gate response, merge/refresh-main procedures, and recurrence prevention.
- Canonical spec files: `docs/iris/IRIS_HERMES_OPERATIONS_SPEC.md`, `docs/iris/IRIS_FEATURE_REGISTRY.md`.
- Implementation candidate files: future operations Skill DB, Trace DB, Curator, and optimizer modules.
- Public allowed information: safe scope labels, file lists, status labels, check result labels, PR numbers, and safe next action labels.
- Internal-only information: raw logs, secrets, endpoint values, tokens, raw paths, raw diagnostics, raw payloads, raw memory, raw candidates, raw commands, private connector data, and `inner_intent`.
- Prohibited: writing to IRIS memory DB, treating Skill DB as user relationship memory, storing raw Trace DB logs, automatic deletion by Curator, direct commits or PRs by a GEPA-style optimizer, and quality gate weakening.
- Missing or blocked: operations layer is `spec_only`; Skill DB, Trace DB, Curator, growth report, GEPA-style optimizer, and Hermes-style performance expansion are not implemented.
- Related eval: future operations safety and trace governance evals.

### Codex / harness / PR workflow

- Purpose: keep Codex-driven changes small, reviewable, and authority-aware.
- Canonical spec files: `docs/process/CODEX_HARNESS_MANIFEST.json`, `AGENTS.md`, `IRIS_SPEC_AUTHORITY.md`, this map.
- Implementation candidate files: `scripts/codex-*`, quality gate policy files, PR templates or generated PR summaries.
- Public allowed information: safe PR scope, changed file list, check result labels, residual risk summaries.
- Internal-only information: secrets, raw logs, raw payloads, raw memory, raw commands, private connector data.
- Prohibited: broad mixed-scope PRs, R3 approval spoofing, quality gate weakening, hidden npm failures.
- Missing or blocked: automated PR split advisor and R3 packet generator are future governed features.
- Related eval: local quality gate, secret scan, docs lint, IRIS eval, npm test.
