#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildExternalCharacterBoundaryValidationReport,
} from './codex-iris-external-character-boundary-validator.mjs';

const MUST_NOT_INCLUDE = [
  'raw_audio',
  'raw_live2d_model_path',
  'raw_motion_file',
  'raw_payment_record',
  'private_viewer_id',
  'token',
  'endpoint',
  'secret',
  'raw_screen',
  'raw_chat',
  'relationship_ranking',
  'payment_ranking',
  'production_readiness_claim',
  'official_affiliation_claim',
];
const POLICY_IDS = [
  'external_module_safe_summary_contract',
  'character_identity_continuity_policy',
  'realtime_perception_latency_policy',
  'turn_taking_and_interruption_policy',
  'echo_and_self_voice_guard',
  'audience_specific_safe_recap_policy',
  'community_world_text_state_adapter_policy',
  'brand_character_oversight_policy',
  'ai_character_disclosure_boundary',
  'external_module_license_status_boundary',
];

function baseRow(group, index, overrides = {}) {
  const row = {
    schema_version: 'iris_external_character_fixture_v1',
    fixture_id: `self_external_character_${group}_${index}`,
    fixture_group: group,
    k_ids: [`K${1021 + (index % 10)}`],
    target_policy_ids: [POLICY_IDS[index % POLICY_IDS.length]],
    input_evidence_class: 'synthetic_fixture',
    synthetic_input: {
      case_label: `self_${group}_${index}`,
      raw_audio_included: false,
      raw_model_path_included: false,
      raw_payment_record_included: false,
      private_viewer_id_included: false,
      production_readiness_claimed: false,
      production_go_performed: false,
      priority1_status: 'BLOCKED',
    },
    expected_result_state: group === 'positive' ? 'pass' : 'fail',
    expected_safe_reason_codes: ['valid_safe_summary', 'priority1_blocked_preserved'],
    expected_blocking: group !== 'positive',
    must_not_include: MUST_NOT_INCLUDE,
    trace_id: `trace_self_external_character_${group}_${index}`,
  };
  return {
    ...row,
    ...overrides,
    synthetic_input: {
      ...row.synthetic_input,
      ...(overrides.synthetic_input || {}),
    },
  };
}

function validFixtureFiles() {
  return {
    'iris_external_character_positive_fixtures.jsonl': Array.from({ length: 10 }, (_, index) => baseRow('positive', index, {
      k_ids: [`K${1021 + index}`],
      target_policy_ids: [POLICY_IDS[index]],
    })),
    'iris_external_character_negative_fixtures.jsonl': Array.from({ length: 10 }, (_, index) => baseRow('negative', index)),
    'iris_external_character_boundary_fixtures.jsonl': Array.from({ length: 8 }, (_, index) => baseRow('boundary', index, {
      expected_result_state: index % 2 ? 'needs_review' : 'blocked',
      expected_blocking: true,
    })),
    'iris_external_character_redline_fixtures.jsonl': Array.from({ length: 10 }, (_, index) => baseRow('red_line', index, {
      expected_result_state: 'fail',
      expected_blocking: true,
    })),
  };
}

function writeFixtureDir(files, mutateText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-external-character-fixtures-'));
  for (const [file, rows] of Object.entries(files)) {
    const text = rows.map((row) => JSON.stringify(row)).join('\n');
    fs.writeFileSync(path.join(dir, file), mutateText?.(file, text) || text);
  }
  return dir;
}

function withFixtureDir(files, fn, mutateText) {
  const dir = writeFixtureDir(files, mutateText);
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function reportPasses(files = validFixtureFiles(), mutateText) {
  return withFixtureDir(files, (dir) => buildExternalCharacterBoundaryValidationReport({ fixtureDir: dir }).ok, mutateText);
}

function reportFails(files, mutateText) {
  return withFixtureDir(files, (dir) => !buildExternalCharacterBoundaryValidationReport({ fixtureDir: dir }).ok, mutateText);
}

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail' };
  } catch {
    return { name, status: 'fail' };
  }
}

const cases = [
  test('valid_fixture_set_passes', () => reportPasses()),
  test('missing_required_field_fails', () => {
    const files = validFixtureFiles();
    delete files['iris_external_character_positive_fixtures.jsonl'][0].trace_id;
    return reportFails(files);
  }),
  test('duplicate_fixture_id_fails', () => {
    const files = validFixtureFiles();
    files['iris_external_character_negative_fixtures.jsonl'][0].fixture_id = files['iris_external_character_positive_fixtures.jsonl'][0].fixture_id;
    return reportFails(files);
  }),
  test('raw_audio_sentinel_fails', () => {
    const files = validFixtureFiles();
    files['iris_external_character_positive_fixtures.jsonl'][0].synthetic_input.safe_label = 'raw_audio_body';
    return reportFails(files);
  }),
  test('raw_live2d_path_sentinel_fails', () => {
    const files = validFixtureFiles();
    files['iris_external_character_positive_fixtures.jsonl'][0].synthetic_input.safe_label = 'live2d_model_path_value';
    return reportFails(files);
  }),
  test('raw_payment_record_sentinel_fails', () => {
    const files = validFixtureFiles();
    files['iris_external_character_positive_fixtures.jsonl'][0].synthetic_input.safe_label = 'raw_payment_record_value';
    return reportFails(files);
  }),
  test('token_endpoint_secret_fails', () => {
    const files = validFixtureFiles();
    files['iris_external_character_positive_fixtures.jsonl'][0].synthetic_input.safe_label = 'api_key';
    return reportFails(files);
  }),
  test('payment_relationship_delta_fails', () => {
    const files = validFixtureFiles();
    files['iris_external_character_positive_fixtures.jsonl'][0].synthetic_input.relationship_delta_from_payment = true;
    return reportFails(files);
  }),
  test('stale_observation_action_fails', () => {
    const files = validFixtureFiles();
    files['iris_external_character_positive_fixtures.jsonl'][0].synthetic_input.game_action_candidate_created = true;
    return reportFails(files);
  }),
  test('owner_authority_creation_fails', () => {
    const files = validFixtureFiles();
    files['iris_external_character_positive_fixtures.jsonl'][0].synthetic_input.owner_authority_created_by_ai = true;
    return reportFails(files);
  }),
  test('k_coverage_missing_fails', () => {
    const files = validFixtureFiles();
    for (const rows of Object.values(files)) {
      for (const row of rows) row.k_ids = ['K1021'];
    }
    return reportFails(files);
  }),
  test('real_fixture_files_pass', () => (
    process.env.CODEX_EXTERNAL_CHARACTER_FIXTURE_SELF_TEST_SKIP_REAL === '1'
      ? true
      : buildExternalCharacterBoundaryValidationReport().ok
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

console.log('External Character boundary validator self-test: pass');
