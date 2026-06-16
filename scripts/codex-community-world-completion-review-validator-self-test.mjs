#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildCommunityWorldCompletionReviewValidationReport,
} from './codex-community-world-completion-review-validator.mjs';

const REQUIRED_IDS = [
  'cw_completion_spec_complete_runtime_not_started',
  'cw_completion_missing_k_mapping_blocked',
  'cw_completion_missing_gate_semantics_blocked',
  'cw_completion_fixture_spec_complete_no_validator',
  'cw_completion_validator_not_started_blocked',
  'cw_completion_runtime_claim_rejected',
  'cw_completion_priority1_blocked_preserved',
  'cw_completion_dataset_audit_runner_not_started',
  'cw_completion_minecraft_plugin_not_started',
  'cw_completion_ready_for_owner_review_candidate',
];

function row(fixtureId, index, overrides = {}) {
  const pass = index === 0 || index === 9;
  const base = {
    schema_version: 'community_world_fixture_v1',
    fixture_id: fixtureId,
    fixture_group: 'completion_review',
    k_ids: ['K1020'],
    target_gate_ids: ['community_world_owner_review_gate'],
    input_evidence_class: 'synthetic_fixture',
    synthetic_input: {
      spec_complete: pass,
      fixture_spec_complete: true,
      validator_spec_complete: pass,
      runtime_implemented: false,
      minecraft_plugin_implemented: false,
      dataset_audit_runner_implemented: false,
      production_readiness_claimed: false,
      production_go_performed: false,
      priority1_status: 'BLOCKED',
    },
    expected_result_state: pass ? 'pass' : 'blocked',
    expected_safe_reason_codes: ['priority1_blocked_preserved'],
    expected_blocking: !pass,
    must_not_include: ['raw_minecraft_chat', 'private_viewer_id'],
    trace_id: `trace_self_completion_${index}`,
  };
  return {
    ...base,
    ...overrides,
    synthetic_input: {
      ...base.synthetic_input,
      ...(overrides.synthetic_input || {}),
    },
  };
}

function validRows() {
  return REQUIRED_IDS.map((fixtureId, index) => row(fixtureId, index));
}

function withFixtureDir(rows, fn, mutateText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-cw-completion-'));
  try {
    fs.writeFileSync(
      path.join(dir, 'community_world_core_completion_review_fixtures.jsonl'),
      mutateText?.(rows.map((item) => JSON.stringify(item)).join('\n')) || rows.map((item) => JSON.stringify(item)).join('\n'),
    );
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function reportPasses(rows = validRows(), mutateText) {
  return withFixtureDir(rows, (fixtureDir) => buildCommunityWorldCompletionReviewValidationReport({
    fixtureDir,
    skipDependentReports: true,
  }).ok, mutateText);
}

function reportFails(rows, mutateText) {
  return !reportPasses(rows, mutateText);
}

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail' };
  } catch {
    return { name, status: 'fail' };
  }
}

const cases = [
  test('valid_completion_review_set_passes', () => reportPasses()),
  test('missing_required_field_fails', () => {
    const rows = validRows();
    delete rows[0].trace_id;
    return reportFails(rows);
  }),
  test('invalid_jsonl_line_fails', () => reportFails(validRows(), (text) => `${text}\n{bad`)),
  test('missing_required_completion_fixture_fails', () => reportFails(validRows().slice(1))),
  test('priority1_resolved_fails', () => {
    const rows = validRows();
    rows[0].synthetic_input.priority1_status = 'RESOLVED';
    return reportFails(rows);
  }),
  test('runtime_implemented_fails', () => {
    const rows = validRows();
    rows[0].synthetic_input.runtime_implemented = true;
    return reportFails(rows);
  }),
  test('minecraft_plugin_implemented_fails', () => {
    const rows = validRows();
    rows[0].synthetic_input.minecraft_plugin_implemented = true;
    return reportFails(rows);
  }),
  test('dataset_audit_runner_implemented_fails', () => {
    const rows = validRows();
    rows[0].synthetic_input.dataset_audit_runner_implemented = true;
    return reportFails(rows);
  }),
  test('production_readiness_claimed_fails', () => {
    const rows = validRows();
    rows[0].synthetic_input.production_readiness_claimed = true;
    return reportFails(rows);
  }),
  test('production_go_performed_fails', () => {
    const rows = validRows();
    rows[0].synthetic_input.production_go_performed = true;
    return reportFails(rows);
  }),
  test('pass_without_spec_complete_fails', () => {
    const rows = validRows();
    rows[0].synthetic_input.spec_complete = false;
    return reportFails(rows);
  }),
  test('pass_blocking_true_fails', () => {
    const rows = validRows();
    rows[0].expected_blocking = true;
    return reportFails(rows);
  }),
  test('missing_owner_review_gate_fails', () => {
    const rows = validRows();
    rows[0].target_gate_ids = ['community_world_core_schema_gate'];
    return reportFails(rows);
  }),
  test('forbidden_string_fails', () => {
    const rows = validRows();
    rows[0].synthetic_input.safe_label = 'production_ready_true';
    return reportFails(rows);
  }),
  test('real_completion_review_files_pass', () => (
    process.env.CODEX_COMMUNITY_WORLD_COMPLETION_REVIEW_SELF_TEST_SKIP_REAL === '1'
      ? true
      : buildCommunityWorldCompletionReviewValidationReport().ok
  )),
];

const failures = cases.filter((item) => item.status !== 'pass');
if (failures.length) {
  console.log(JSON.stringify({
    ok: false,
    validatorSelfTestStatus: 'fail',
    failureCount: failures.length,
    failures: failures.slice(0, 20).map((item) => ({ name: item.name })),
    rawFixturePrinted: false,
    rawLogsRead: false,
    rawDiffRead: false,
    priority1Status: 'BLOCKED',
  }, null, 2));
  process.exit(1);
}

console.log('Community World completion review validator self-test: pass');
