#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildExternalModuleBoundaryCompletionValidationReport } from './codex-iris-external-module-boundary-completion-validator.mjs';

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-external-module-completion-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function row(overrides = {}) {
  return {
    schema_version: 'iris_external_module_completion_review_fixture_v1',
    fixture_id: 'self_completion',
    fixture_group: 'completion_review',
    k_ids: ['K1021'],
    target_policy_ids: ['IRIS_EXTERNAL_MODULE_BOUNDARY_COMPLETION_REVIEW'],
    completion_area: 'overall_external_module_boundary',
    synthetic_input: {
      runtime_implemented: false,
      voxweave_implementation: false,
      live2d_implementation: false,
      cripto_tip_implementation: false,
      dataset_audit_runner_implemented: false,
      real_dataset_processing: false,
      production_readiness_claimed: false,
      production_go_performed: false,
      priority1_status: 'BLOCKED',
    },
    expected_completion_state: 'complete_nonruntime',
    expected_result_state: 'pass',
    expected_safe_reason_codes: ['self_completion_safe'],
    expected_blocking: false,
    must_not_include: [],
    trace_id: 'trace_self_completion',
    ...overrides,
  };
}

function writeJsonl(file, rows) {
  fs.writeFileSync(file, `${rows.map((item) => JSON.stringify(item)).join('\n')}\n`);
}

function validRows() {
  const areas = [
    'external_module_safe_summary_contract',
    'character_identity_continuity',
    'realtime_perception_latency',
    'turn_taking_interruption',
    'audience_specific_recap',
    'text_state_adapter',
    'brand_character_oversight',
    'external_module_fixtures',
    'safe_summary_validator',
    'audit_mapping_fixtures',
    'audit_mapping_validator',
    'nonruntime_suite_registration',
    'overall_external_module_boundary',
  ];
  const rows = areas.map((area, index) => row({
    fixture_id: `self_area_${index}`,
    completion_area: area,
    k_ids: [`K${1021 + (index % 10)}`],
  }));
  rows.push(row({ fixture_id: 'ext_completion_runtime_claim_rejected', fixture_group: 'blocked_completion', expected_completion_state: 'blocked', expected_result_state: 'fail', expected_blocking: true, synthetic_input: { runtime_implemented: true, priority1_status: 'BLOCKED' } }));
  rows.push(row({ fixture_id: 'ext_completion_priority1_resolved_rejected', fixture_group: 'blocked_completion', expected_completion_state: 'blocked', expected_result_state: 'fail', expected_blocking: true, synthetic_input: { priority1_status: 'RESOLVED', priority1_resolved: true } }));
  rows.push(row({ fixture_id: 'ext_completion_raw_payload_leak_rejected', fixture_group: 'red_line_completion', expected_completion_state: 'blocked', expected_result_state: 'fail', expected_blocking: true, synthetic_input: { raw_audio_included: true, priority1_status: 'BLOCKED' } }));
  rows.push(row({ fixture_id: 'ext_completion_owner_authority_created_rejected', fixture_group: 'red_line_completion', expected_completion_state: 'blocked', expected_result_state: 'fail', expected_blocking: true, synthetic_input: { owner_authority_created_by_ai: true, priority1_status: 'BLOCKED' } }));
  rows.push(row({ fixture_id: 'ext_completion_production_go_rejected', fixture_group: 'red_line_completion', expected_completion_state: 'blocked', expected_result_state: 'fail', expected_blocking: true, synthetic_input: { production_go_performed: true, priority1_status: 'BLOCKED' } }));
  rows.push(row({ fixture_id: 'ext_completion_voxweave_not_implemented_pass', synthetic_input: { voxweave_implementation: false, priority1_status: 'BLOCKED' } }));
  rows.push(row({ fixture_id: 'ext_completion_live2d_not_implemented_pass', synthetic_input: { live2d_implementation: false, priority1_status: 'BLOCKED' } }));
  rows.push(row({ fixture_id: 'ext_completion_cripto_tip_not_implemented_pass', synthetic_input: { cripto_tip_implementation: false, priority1_status: 'BLOCKED' } }));
  while (rows.length < 28) rows.push(row({ fixture_id: `self_extra_${rows.length}` }));
  return rows;
}

function reportPasses(rows) {
  return withTempDir((dir) => {
    writeJsonl(path.join(dir, 'iris_external_module_completion_review_fixtures.jsonl'), rows);
    return buildExternalModuleBoundaryCompletionValidationReport({ fixtureDir: dir }).ok;
  });
}

function reportFails(rows) {
  return !reportPasses(rows);
}

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail' };
  } catch {
    return { name, status: 'fail' };
  }
}

const cases = [
  test('valid_minimal_completion_set_passes', () => reportPasses(validRows())),
  test('missing_required_field_fails', () => {
    const rows = validRows();
    delete rows[0].trace_id;
    return reportFails(rows);
  }),
  test('invalid_jsonl_line_fails', () => withTempDir((dir) => {
    fs.writeFileSync(path.join(dir, 'iris_external_module_completion_review_fixtures.jsonl'), '{bad json}\n');
    return !buildExternalModuleBoundaryCompletionValidationReport({ fixtureDir: dir }).ok;
  })),
  test('duplicate_fixture_id_fails', () => {
    const rows = validRows();
    rows[1].fixture_id = rows[0].fixture_id;
    return reportFails(rows);
  }),
  test('unknown_completion_area_fails', () => reportFails([row({ completion_area: 'unknown_area' }), ...validRows().slice(1)])),
  test('unknown_completion_state_fails', () => reportFails([row({ expected_completion_state: 'unknown_state' }), ...validRows().slice(1)])),
  test('missing_k1021_k1030_coverage_fails', () => reportFails(validRows().map((item) => ({ ...item, k_ids: ['K1021'] })))),
  test('pass_with_runtime_implemented_true_fails', () => reportFails([row({ synthetic_input: { runtime_implemented: true, priority1_status: 'BLOCKED' } }), ...validRows().slice(1)])),
  test('pass_with_voxweave_implementation_true_fails', () => reportFails([row({ synthetic_input: { voxweave_implementation: true, priority1_status: 'BLOCKED' } }), ...validRows().slice(1)])),
  test('pass_with_live2d_implementation_true_fails', () => reportFails([row({ synthetic_input: { live2d_implementation: true, priority1_status: 'BLOCKED' } }), ...validRows().slice(1)])),
  test('pass_with_cripto_tip_implementation_true_fails', () => reportFails([row({ synthetic_input: { cripto_tip_implementation: true, priority1_status: 'BLOCKED' } }), ...validRows().slice(1)])),
  test('pass_with_dataset_runner_true_fails', () => reportFails([row({ synthetic_input: { dataset_audit_runner_implemented: true, priority1_status: 'BLOCKED' } }), ...validRows().slice(1)])),
  test('pass_with_production_readiness_true_fails', () => reportFails([row({ synthetic_input: { production_readiness_claimed: true, priority1_status: 'BLOCKED' } }), ...validRows().slice(1)])),
  test('pass_with_priority1_resolved_fails', () => reportFails([row({ synthetic_input: { priority1_status: 'RESOLVED' } }), ...validRows().slice(1)])),
  test('owner_authority_created_by_ai_fails', () => reportFails([row({ synthetic_input: { owner_authority_created_by_ai: true, priority1_status: 'BLOCKED' } }), ...validRows().slice(1)])),
  test('raw_audio_sentinel_fails', () => reportFails([row({ must_not_include: ['raw_audio_body'] }), ...validRows().slice(1)])),
  test('token_sentinel_fails', () => reportFails([row({ must_not_include: ['token'] }), ...validRows().slice(1)])),
  test('real_completion_fixture_file_passes', () => (
    process.env.CODEX_EXTERNAL_MODULE_COMPLETION_SELF_TEST_SKIP_REAL === '1'
      ? true
      : buildExternalModuleBoundaryCompletionValidationReport().ok
  )),
];

const failures = cases.filter((item) => item.status !== 'pass');
if (failures.length) {
  console.log(JSON.stringify({
    ok: false,
    validatorSelfTestStatus: 'fail',
    failureCount: failures.length,
    failures: failures.slice(0, 20).map((item) => ({ name: item.name })),
    rawLogsRead: false,
    rawDiffRead: false,
    priority1Status: 'BLOCKED',
  }, null, 2));
  process.exit(1);
}

console.log('IRIS external module boundary completion validator self-test: pass');
