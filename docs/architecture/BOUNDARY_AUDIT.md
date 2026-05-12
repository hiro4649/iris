# Boundary Audit

Boundary audit is a Phase27 enforcement layer for local CI and runtime inspection.

It checks the current runtime result for cross-phase safety failures:

```text
adapter_packets_no_raw_candidates_or_approved_actions
candidate_review_items_safe_summaries
game_control_requires_approved_schema
relationship_candidate_validation_gated
phase24_input_candidate_validation_gated
phase26_lifecycle_candidates_validation_gated
memory_recall_read_only
candidate_persistence_requires_approved_records
internal_profiles_no_canonical_or_side_effect_fields
```

## Output

```text
schema: iris_boundary_audit_v1
audit_status: pass | fail
checks
critical_violations
ci_fail_reasons
boundary_policy
```

The audit is safe to expose through `/state`, replay logs, debug UI, and scenario summaries.

## Boundary

The audit never exposes raw candidates, approved game actions, approved memory records, or approved relationship records.

It reports only status, check names, and short details. Any of these fields are forbidden inside the audit object:

```text
input_action_candidate
approved_game_input_action
relationship_update_candidate
memory_carryover_candidates
community_memory_candidates
execute
commit
write
apply
action_type
intent
emotion
tone
character_tag
task_type
conversation_state
relation_score
```

This makes the Phase27 addendum executable as a regression surface rather than only a document rule.

## Public Report Boundary Audit

`npm run dev:public-report-boundary-audit` also verifies that long-running
operators keep compact, low-output development entry points available:

```text
npm run dev:admin:operations-summary
npm run dev:admin:character-voice-settings:summary
npm run dev:engine:probe
npm run dev:production:attention-digest
npm run dev:foundation:runtime-summary
npm run dev:foundation:blocked-worker-roundtrip
```

The public audit exposes only counts and public script names. The admin HTTP
route and dashboard may show the required lightweight script catalog as safe
relative script names so operators can see which checks are protected. The
preflight summary remains lower-output and carries only counts. Neither surface
exposes file contents, env values, runtime commands, endpoint values,
candidates, jobs, voice samples, voice license values, contract review labels,
animation assets, or private configuration.
