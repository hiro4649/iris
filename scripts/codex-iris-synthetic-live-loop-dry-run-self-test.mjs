#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.6

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSyntheticLiveLoopDryRunReport } from './codex-iris-synthetic-live-loop-dry-run.mjs';

const BASE = {
  schema_version: 'iris_synthetic_live_loop_fixture_v1',
  scenario_id: 'self_positive_comment',
  scenario_kind: 'comment',
  fixture_group: 'positive',
  safe_input_summary: 'safe synthetic comment',
  expected_result_state: 'pass',
  expected_blocking: false,
  expected_reason_code: 'safe_dry_run_pass',
  operator_attention_required: false,
  memory_candidate_allowed: true,
  relationship_candidate_allowed: false,
  community_recap_candidate_allowed: false,
  raw_chat_included: false,
  private_id_included: false,
  raw_audio_included: false,
  raw_asset_path_included: false,
  raw_payment_data_included: false,
  payment_relationship_delta: false,
  input_action_candidate_included: false,
  game_command_included: false,
  direct_memory_commit: false,
  direct_relationship_commit: false,
  owner_authority_created_by_ai: false,
  runtime_readiness_claimed: false,
  production_readiness_claimed: false,
  production_go_performed: false,
  priority1_status: 'BLOCKED',
  trace_id: 'trace_self_positive_comment',
};

function row(overrides = {}) {
  return { ...BASE, ...overrides };
}

function minimumRows(extraRows = []) {
  const rows = [
    row({ scenario_id: 'self_positive_comment', scenario_kind: 'comment', fixture_group: 'positive' }),
    row({ scenario_id: 'self_positive_game', scenario_kind: 'game_observation', fixture_group: 'positive', observation_confidence: 'high', observation_freshness: 'fresh' }),
    row({ scenario_id: 'self_positive_donation', scenario_kind: 'donation', fixture_group: 'positive' }),
    row({ scenario_id: 'self_positive_media', scenario_kind: 'media_watch', fixture_group: 'positive' }),
    row({ scenario_id: 'self_positive_topic', scenario_kind: 'external_topic', fixture_group: 'positive' }),
    row({ scenario_id: 'self_positive_idle', scenario_kind: 'idle', fixture_group: 'positive' }),
    row({ scenario_id: 'self_boundary_low_confidence', fixture_group: 'boundary', scenario_kind: 'game_observation', observation_confidence: 'low', expected_result_state: 'blocked', expected_blocking: true, expected_reason_code: 'low_confidence_observation_blocks_assertion', operator_attention_required: true, memory_candidate_allowed: false }),
    row({ scenario_id: 'self_boundary_stale', fixture_group: 'boundary', scenario_kind: 'game_observation', observation_confidence: 'high', observation_freshness: 'stale', expected_result_state: 'blocked', expected_blocking: true, expected_reason_code: 'stale_observation_blocks_memory_and_action', operator_attention_required: true, memory_candidate_allowed: false }),
    row({ scenario_id: 'self_boundary_blocked', fixture_group: 'boundary', blocked_viewer: true, expected_result_state: 'blocked', expected_blocking: true, expected_reason_code: 'blocked_viewer_blocks_personalization', operator_attention_required: true, memory_candidate_allowed: false }),
    row({ scenario_id: 'self_boundary_echo', fixture_group: 'boundary', echo_risk: true, expected_result_state: 'blocked', expected_blocking: true, expected_reason_code: 'echo_risk_blocks_memory', operator_attention_required: true, memory_candidate_allowed: false }),
    row({ scenario_id: 'self_negative_raw_chat', fixture_group: 'negative', raw_chat_included: true, expected_result_state: 'fail', expected_blocking: true, expected_reason_code: 'raw_chat_rejected', operator_attention_required: true }),
    row({ scenario_id: 'self_negative_private_id', fixture_group: 'negative', private_id_included: true, expected_result_state: 'fail', expected_blocking: true, expected_reason_code: 'private_id_rejected', operator_attention_required: true }),
    row({ scenario_id: 'self_negative_raw_audio', fixture_group: 'negative', raw_audio_included: true, expected_result_state: 'fail', expected_blocking: true, expected_reason_code: 'raw_audio_rejected', operator_attention_required: true }),
    row({ scenario_id: 'self_negative_asset', fixture_group: 'negative', raw_asset_path_included: true, expected_result_state: 'fail', expected_blocking: true, expected_reason_code: 'raw_asset_path_rejected', operator_attention_required: true }),
    row({ scenario_id: 'self_negative_payment', fixture_group: 'negative', scenario_kind: 'donation', raw_payment_data_included: true, expected_result_state: 'fail', expected_blocking: true, expected_reason_code: 'raw_payment_data_rejected', operator_attention_required: true }),
    row({ scenario_id: 'self_negative_payment_delta', fixture_group: 'negative', scenario_kind: 'donation', payment_relationship_delta: true, expected_result_state: 'fail', expected_blocking: true, expected_reason_code: 'payment_relationship_delta_rejected', operator_attention_required: true }),
    row({ scenario_id: 'self_negative_action', fixture_group: 'negative', scenario_kind: 'game_observation', input_action_candidate_included: true, expected_result_state: 'fail', expected_blocking: true, expected_reason_code: 'input_action_candidate_rejected', operator_attention_required: true }),
    row({ scenario_id: 'self_negative_memory', fixture_group: 'negative', direct_memory_commit: true, expected_result_state: 'fail', expected_blocking: true, expected_reason_code: 'direct_memory_commit_rejected', operator_attention_required: true }),
    row({ scenario_id: 'self_negative_owner', fixture_group: 'negative', owner_authority_created_by_ai: true, expected_result_state: 'fail', expected_blocking: true, expected_reason_code: 'owner_authority_created_by_ai_rejected', operator_attention_required: true }),
    row({ scenario_id: 'self_negative_ready', fixture_group: 'negative', production_readiness_claimed: true, expected_result_state: 'fail', expected_blocking: true, expected_reason_code: 'production_readiness_claim_rejected', operator_attention_required: true }),
  ];
  return [...rows, ...extraRows];
}

function withFixture(rows, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-live-loop-self-test-'));
  const file = path.join(dir, 'fixtures.jsonl');
  try {
    fs.writeFileSync(file, rows.map((item) => JSON.stringify(item)).join('\n'));
    return fn(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function passes(rows) {
  return withFixture(rows, (fixturePath) => buildSyntheticLiveLoopDryRunReport({ fixturePath }).ok);
}

function fails(rows) {
  return !passes(rows);
}

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail' };
  } catch {
    return { name, status: 'fail' };
  }
}

const cases = [
  test('valid_positive_comment_passes', () => passes(minimumRows())),
  test('valid_donation_no_relationship_growth_passes', () => passes(minimumRows([row({ scenario_id: 'self_extra_donation', scenario_kind: 'donation', payment_relationship_delta: false, relationship_candidate_allowed: false })]))),
  test('newcomer_response_preserves_openness', () => passes(minimumRows([row({ scenario_id: 'self_extra_newcomer', relationship_candidate_allowed: false, memory_candidate_allowed: false })]))),
  test('low_confidence_observation_blocks_assertion', () => passes(minimumRows())),
  test('stale_observation_blocks_memory_and_action', () => passes(minimumRows())),
  test('blocked_viewer_blocks_personalization', () => passes(minimumRows())),
  test('echo_risk_blocks_memory', () => passes(minimumRows())),
  test('raw_chat_fails', () => fails(minimumRows().map((item) => item.scenario_id === 'self_negative_raw_chat' ? { ...item, expected_reason_code: 'safe_dry_run_pass' } : item))),
  test('private_id_fails', () => fails(minimumRows().map((item) => item.scenario_id === 'self_negative_private_id' ? { ...item, expected_reason_code: 'safe_dry_run_pass' } : item))),
  test('raw_audio_fails', () => fails(minimumRows().map((item) => item.scenario_id === 'self_negative_raw_audio' ? { ...item, expected_reason_code: 'safe_dry_run_pass' } : item))),
  test('raw_asset_path_fails', () => fails(minimumRows().map((item) => item.scenario_id === 'self_negative_asset' ? { ...item, expected_reason_code: 'safe_dry_run_pass' } : item))),
  test('raw_payment_fails', () => fails(minimumRows().map((item) => item.scenario_id === 'self_negative_payment' ? { ...item, expected_reason_code: 'safe_dry_run_pass' } : item))),
  test('payment_relationship_delta_fails', () => fails(minimumRows().map((item) => item.scenario_id === 'self_negative_payment_delta' ? { ...item, expected_reason_code: 'safe_dry_run_pass' } : item))),
  test('input_action_candidate_fails', () => fails(minimumRows().map((item) => item.scenario_id === 'self_negative_action' ? { ...item, expected_reason_code: 'safe_dry_run_pass' } : item))),
  test('direct_memory_commit_fails', () => fails(minimumRows().map((item) => item.scenario_id === 'self_negative_memory' ? { ...item, expected_reason_code: 'safe_dry_run_pass' } : item))),
  test('owner_authority_created_by_ai_fails', () => fails(minimumRows().map((item) => item.scenario_id === 'self_negative_owner' ? { ...item, expected_reason_code: 'safe_dry_run_pass' } : item))),
  test('production_readiness_claim_fails', () => fails(minimumRows().map((item) => item.scenario_id === 'self_negative_ready' ? { ...item, expected_reason_code: 'safe_dry_run_pass' } : item))),
  test('real_fixture_file_passes', () => buildSyntheticLiveLoopDryRunReport().ok),
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

console.log('IRIS synthetic live loop dry-run self-test: pass');

