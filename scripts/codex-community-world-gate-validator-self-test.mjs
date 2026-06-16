#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildCommunityWorldGateValidationReport,
} from './codex-community-world-gate-validator.mjs';

const REQUIRED_GATES = [
  'community_world_core_schema_gate',
  'minecraft_identity_link_gate',
  'minecraft_server_participation_policy_gate',
  'minecraft_chat_safe_ingest_gate',
  'minecraft_contribution_ledger_gate',
  'minecraft_build_registry_gate',
  'minecraft_event_lifecycle_gate',
  'minecraft_moderation_grief_rollback_gate',
  'minecraft_memory_recall_policy_gate',
  'minecraft_public_recognition_no_ranking_gate',
  'minecraft_monetization_no_pay_to_win_gate',
  'minecraft_unofficial_commercial_policy_gate',
  'community_recap_safe_export_gate',
  'community_world_anti_parasocial_gate',
  'community_world_minor_safety_gate',
  'community_world_no_direct_command_gate',
  'community_world_no_raw_chat_memory_gate',
  'community_world_owner_review_gate',
  'community_world_pay_to_rank_guard',
  'community_world_newcomer_friendliness_gate',
  'community_world_recall_cooldown_gate',
];
const MUST_NOT_INCLUDE = [
  'raw_minecraft_chat',
  'private_viewer_id',
  'exact_private_coordinates',
  'raw_grief_evidence',
  'payment_ranking',
  'relationship_ranking',
  'minecraft_command',
  'input_action_candidate',
  'approved_game_input_action',
  'production_readiness_claim',
  'official_minecraft_affiliation_claim',
];

function baseRow(group, index, overrides = {}) {
  const state = group === 'positive' ? 'pass' : 'fail';
  const row = {
    schema_version: 'community_world_fixture_v1',
    fixture_id: `self_gate_${group}_${index}`,
    fixture_group: group,
    k_ids: [`K${1001 + (index % 20)}`],
    target_gate_ids: [REQUIRED_GATES[index % REQUIRED_GATES.length]],
    input_evidence_class: 'synthetic_fixture',
    synthetic_input: {
      safe_summary: `safe gate fixture ${index}`,
      priority1_status: 'BLOCKED',
      game_command_included: false,
      raw_chat_included: false,
      payment_ranking_included: false,
      relationship_ranking_included: false,
      production_readiness_claimed: false,
    },
    expected_result_state: state,
    expected_safe_reason_codes: ['safe_gate_fixture'],
    expected_blocking: group !== 'positive',
    must_not_include: MUST_NOT_INCLUDE,
    trace_id: `trace_gate_${group}_${index}`,
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
  const positive = Array.from({ length: 20 }, (_, index) => baseRow('positive', index, {
    k_ids: [`K${1001 + index}`],
    target_gate_ids: [REQUIRED_GATES[index % REQUIRED_GATES.length]],
  }));
  positive[0].target_gate_ids.push(REQUIRED_GATES[20]);
  return {
    'community_world_core_positive_fixtures.jsonl': positive,
    'community_world_core_negative_fixtures.jsonl': Array.from({ length: 20 }, (_, index) => baseRow('negative', index)),
    'community_world_core_boundary_fixtures.jsonl': Array.from({ length: 15 }, (_, index) => baseRow('boundary', index, {
      expected_result_state: index % 2 === 0 ? 'blocked' : 'needs_review',
      expected_blocking: true,
    })),
    'community_world_core_redline_fixtures.jsonl': Array.from({ length: 10 }, (_, index) => baseRow('red_line', index)),
    'community_world_core_completion_review_fixtures.jsonl': Array.from({ length: 10 }, (_, index) => baseRow('completion_review', index, {
      target_gate_ids: ['community_world_owner_review_gate'],
      expected_result_state: index % 3 === 0 ? 'pass' : 'blocked',
      expected_blocking: index % 3 !== 0,
      synthetic_input: {
        runtime_implemented: false,
        minecraft_plugin_implemented: false,
        dataset_audit_runner_implemented: false,
        production_go_performed: false,
      },
    })),
  };
}

function writeFixtureDir(files, mutateText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-cw-gate-fixtures-'));
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
  return withFixtureDir(files, (dir) => buildCommunityWorldGateValidationReport({ fixtureDir: dir }).ok, mutateText);
}

function reportFails(files, mutateText) {
  return withFixtureDir(files, (dir) => !buildCommunityWorldGateValidationReport({ fixtureDir: dir }).ok, mutateText);
}

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail' };
  } catch {
    return { name, status: 'fail' };
  }
}

const cases = [
  test('valid_gate_fixture_set_passes', () => reportPasses()),
  test('missing_required_field_fails', () => {
    const files = validFixtureFiles();
    delete files['community_world_core_positive_fixtures.jsonl'][0].trace_id;
    return reportFails(files);
  }),
  test('invalid_jsonl_line_fails', () => reportFails(validFixtureFiles(), (file, text) => (
    file === 'community_world_core_positive_fixtures.jsonl' ? `${text}\n{bad` : text
  ))),
  test('positive_non_pass_fails', () => {
    const files = validFixtureFiles();
    files['community_world_core_positive_fixtures.jsonl'][0].expected_result_state = 'blocked';
    return reportFails(files);
  }),
  test('negative_pass_fails', () => {
    const files = validFixtureFiles();
    files['community_world_core_negative_fixtures.jsonl'][0].expected_result_state = 'pass';
    return reportFails(files);
  }),
  test('boundary_blocked_nonblocking_fails', () => {
    const files = validFixtureFiles();
    files['community_world_core_boundary_fixtures.jsonl'][0].expected_blocking = false;
    return reportFails(files);
  }),
  test('completion_pass_blocking_fails', () => {
    const files = validFixtureFiles();
    files['community_world_core_completion_review_fixtures.jsonl'][0].expected_blocking = true;
    return reportFails(files);
  }),
  test('k1001_k1020_coverage_missing_fails', () => {
    const files = validFixtureFiles();
    for (const rows of Object.values(files)) {
      for (const row of rows) row.k_ids = ['K1001'];
    }
    return reportFails(files);
  }),
  test('gate_coverage_missing_fails', () => {
    const files = validFixtureFiles();
    for (const rows of Object.values(files)) {
      for (const row of rows) row.target_gate_ids = ['community_world_core_schema_gate'];
    }
    return reportFails(files);
  }),
  test('direct_command_gate_pass_flag_fails', () => {
    const files = validFixtureFiles();
    files['community_world_core_positive_fixtures.jsonl'][0].target_gate_ids = ['community_world_no_direct_command_gate'];
    files['community_world_core_positive_fixtures.jsonl'][0].synthetic_input.execution_allowed = true;
    return reportFails(files);
  }),
  test('monetization_gate_pass_flag_fails', () => {
    const files = validFixtureFiles();
    files['community_world_core_positive_fixtures.jsonl'][0].target_gate_ids = ['community_world_pay_to_rank_guard'];
    files['community_world_core_positive_fixtures.jsonl'][0].synthetic_input.pay_to_friendship_allowed = true;
    return reportFails(files);
  }),
  test('raw_chat_memory_gate_pass_flag_fails', () => {
    const files = validFixtureFiles();
    files['community_world_core_positive_fixtures.jsonl'][0].target_gate_ids = ['community_world_no_raw_chat_memory_gate'];
    files['community_world_core_positive_fixtures.jsonl'][0].synthetic_input.raw_chat_memory_allowed = true;
    return reportFails(files);
  }),
  test('owner_review_gate_pass_flag_fails', () => {
    const files = validFixtureFiles();
    files['community_world_core_positive_fixtures.jsonl'][0].target_gate_ids = ['community_world_owner_review_gate'];
    files['community_world_core_positive_fixtures.jsonl'][0].synthetic_input.owner_authority_created_by_ai = true;
    return reportFails(files);
  }),
  test('commercial_gate_pass_flag_fails', () => {
    const files = validFixtureFiles();
    files['community_world_core_positive_fixtures.jsonl'][0].target_gate_ids = ['minecraft_unofficial_commercial_policy_gate'];
    files['community_world_core_positive_fixtures.jsonl'][0].synthetic_input.commercial_policy_review_bypassed = true;
    return reportFails(files);
  }),
  test('parasocial_gate_pass_flag_fails', () => {
    const files = validFixtureFiles();
    files['community_world_core_positive_fixtures.jsonl'][0].target_gate_ids = ['community_world_anti_parasocial_gate'];
    files['community_world_core_positive_fixtures.jsonl'][0].synthetic_input.exclusive_friendship_claimed = true;
    return reportFails(files);
  }),
  test('minor_safety_gate_pass_flag_fails', () => {
    const files = validFixtureFiles();
    files['community_world_core_positive_fixtures.jsonl'][0].target_gate_ids = ['community_world_minor_safety_gate'];
    files['community_world_core_positive_fixtures.jsonl'][0].synthetic_input.minor_safety_bypass_allowed = true;
    return reportFails(files);
  }),
  test('forbidden_string_fails', () => {
    const files = validFixtureFiles();
    files['community_world_core_positive_fixtures.jsonl'][0].synthetic_input.safe_summary = 'private_viewer_id_value';
    return reportFails(files);
  }),
  test('real_fixture_files_pass', () => (
    process.env.CODEX_COMMUNITY_WORLD_GATE_SELF_TEST_SKIP_REAL === '1'
      ? true
      : buildCommunityWorldGateValidationReport().ok
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

console.log('Community World gate validator self-test: pass');
