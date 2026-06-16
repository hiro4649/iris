#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildExternalModuleSafeSummaryValidationReport,
  validateExternalModuleFixtureRow,
} from './codex-iris-external-module-safe-summary-validator.mjs';

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-external-module-validator-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function baseRow(overrides = {}) {
  return {
    schema_version: 'iris_external_module_fixture_v1',
    fixture_id: 'self_valid_row',
    fixture_group: 'positive',
    k_ids: ['K1021'],
    target_policy_ids: ['IRIS_EXTERNAL_MODULE_SAFE_SUMMARY_CONTRACT'],
    module_name: 'SHARED_EXTERNAL_ENVELOPE',
    summary_kind: 'self_test',
    input_evidence_class: 'synthetic_self_test',
    synthetic_input: {
      priority1_status: 'BLOCKED',
      raw_fields_included: false,
      production_readiness_claimed: false,
      production_go_performed: false,
    },
    expected_result_state: 'pass',
    expected_safe_reason_codes: ['self_valid'],
    expected_blocking: false,
    must_not_include: ['raw_payload'],
    trace_id: 'trace_self_valid',
    ...overrides,
  };
}

function rowPasses(row) {
  return validateExternalModuleFixtureRow(row, { file: 'self.jsonl', line: 1, group: row.fixture_group }).length === 0;
}

function rowFails(row) {
  return !rowPasses(row);
}

function writeJsonl(file, rows) {
  fs.writeFileSync(file, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

function validMinimalFixtureSetPasses() {
  return withTempDir((dir) => {
    const spec = [
      { file: 'positive.jsonl', group: 'positive', minRows: 1, states: new Set(['pass']), expectedBlocking: false },
      { file: 'negative.jsonl', group: 'negative', minRows: 1, states: new Set(['fail']), expectedBlocking: true },
    ];
    writeJsonl(path.join(dir, 'positive.jsonl'), [
      baseRow({
        fixture_id: 'self_positive_voxweave',
        k_ids: ['K1021'],
        module_name: 'VOXWEAVE',
        synthetic_input: { raw_audio_included: false, endpoint_included: false, token_included: false },
      }),
      baseRow({
        fixture_id: 'self_positive_live2d',
        k_ids: ['K1022'],
        module_name: 'LIVE2D',
        synthetic_input: { raw_live2d_model_path_included: false, raw_motion_file_included: false },
      }),
      baseRow({
        fixture_id: 'self_positive_cripto',
        k_ids: ['K1023'],
        module_name: 'CRIPTO-TIP',
        synthetic_input: { raw_payment_record_included: false, relationship_delta_allowed: false },
      }),
      baseRow({
        fixture_id: 'self_positive_world',
        k_ids: ['K1024'],
        module_name: 'COMMUNITY_WORLD_ADAPTER',
        target_policy_ids: ['IRIS_COMMUNITY_WORLD_TEXT_STATE_ADAPTER_POLICY'],
        synthetic_input: { candidate_executable: false },
      }),
      baseRow({
        fixture_id: 'self_positive_shared',
        k_ids: ['K1025'],
        module_name: 'SHARED_EXTERNAL_ENVELOPE',
        target_policy_ids: [
          'IRIS_CHARACTER_IDENTITY_CONTINUITY_POLICY',
          'IRIS_REALTIME_PERCEPTION_LATENCY_POLICY',
          'IRIS_TURN_TAKING_AND_INTERRUPTION_POLICY',
          'IRIS_AUDIENCE_SPECIFIC_SAFE_RECAP_POLICY',
          'IRIS_BRAND_CHARACTER_OVERSIGHT_POLICY',
          'IRIS_EXTERNAL_MODULE_SAFE_SUMMARY_VALIDATOR_DESIGN',
        ],
      }),
    ]);
    writeJsonl(path.join(dir, 'negative.jsonl'), [
      baseRow({
        fixture_id: 'self_negative_raw_audio',
        fixture_group: 'negative',
        k_ids: ['K1026', 'K1027', 'K1028', 'K1029', 'K1030'],
        module_name: 'VOXWEAVE',
        synthetic_input: { raw_audio_included: true },
        expected_result_state: 'fail',
        expected_blocking: true,
      }),
    ]);
    return buildExternalModuleSafeSummaryValidationReport({
      fixtureDir: dir,
      fileSpecs: spec,
      requiredKIds: Array.from({ length: 10 }, (_, index) => `K${1021 + index}`),
    }).ok;
  });
}

function fixtureSetFailsFor(setup) {
  return withTempDir((dir) => {
    const spec = [{ file: 'only.jsonl', group: 'positive', minRows: 1, states: new Set(['pass']), expectedBlocking: false }];
    setup(dir);
    return !buildExternalModuleSafeSummaryValidationReport({
      fixtureDir: dir,
      fileSpecs: spec,
      requiredKIds: ['K1021', 'K1022'],
    }).ok;
  });
}

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail' };
  } catch {
    return { name, status: 'fail' };
  }
}

const cases = [
  test('valid_minimal_fixture_set_passes', () => validMinimalFixtureSetPasses()),
  test('missing_required_field_fails', () => {
    const row = baseRow();
    delete row.trace_id;
    return rowFails(row);
  }),
  test('invalid_jsonl_line_fails', () => fixtureSetFailsFor((dir) => {
    fs.writeFileSync(path.join(dir, 'only.jsonl'), '{not json}\n');
  })),
  test('duplicate_fixture_id_fails', () => fixtureSetFailsFor((dir) => {
    writeJsonl(path.join(dir, 'only.jsonl'), [baseRow(), baseRow()]);
  })),
  test('unknown_module_fails', () => rowFails(baseRow({ module_name: 'UNKNOWN_MODULE' }))),
  test('missing_k1021_k1030_coverage_fails', () => fixtureSetFailsFor((dir) => {
    writeJsonl(path.join(dir, 'only.jsonl'), [baseRow({ k_ids: ['K1021'] })]);
  })),
  test('positive_raw_audio_fails', () => rowFails(baseRow({ module_name: 'VOXWEAVE', synthetic_input: { raw_audio_included: true } }))),
  test('positive_live2d_model_path_fails', () => rowFails(baseRow({ module_name: 'LIVE2D', synthetic_input: { raw_live2d_model_path_included: true } }))),
  test('positive_raw_payment_record_fails', () => rowFails(baseRow({ module_name: 'CRIPTO-TIP', synthetic_input: { raw_payment_record_included: true } }))),
  test('positive_endpoint_token_fails', () => rowFails(baseRow({ synthetic_input: { endpoint_included: true, token_included: true } }))),
  test('stale_observation_memory_candidate_fails', () => rowFails(baseRow({ synthetic_input: { stale_observation: true, memory_candidate_allowed: true } }))),
  test('stale_observation_game_action_fails', () => rowFails(baseRow({ synthetic_input: { stale_observation: true, game_action_candidate_allowed: true } }))),
  test('echo_risk_memory_fails', () => rowFails(baseRow({ synthetic_input: { echo_risk_status: 'high', memory_candidate_allowed: true } }))),
  test('payment_relationship_delta_fails', () => rowFails(baseRow({ module_name: 'CRIPTO-TIP', synthetic_input: { relationship_delta_allowed: true } }))),
  test('owner_authority_created_by_ai_fails', () => rowFails(baseRow({ synthetic_input: { owner_authority_created_by_ai: true } }))),
  test('official_minecraft_claim_fails', () => rowFails(baseRow({ synthetic_input: { official_minecraft_affiliation_claimed: true } }))),
  test('production_ready_true_fails', () => rowFails(baseRow({ synthetic_input: { production_readiness_claimed: true } }))),
  test('real_fixture_files_pass', () => (
    process.env.CODEX_EXTERNAL_MODULE_SAFE_SUMMARY_SELF_TEST_SKIP_REAL === '1'
      ? true
      : buildExternalModuleSafeSummaryValidationReport().ok
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

console.log('IRIS external module safe summary validator self-test: pass');
