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
  expected_reason_code: 'safe_dry_run_pass',
  expected_blocking: false,
  expected_operator_attention_required: false,
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
  approved_game_input_action_included: false,
  world_command_included: false,
  game_command_included: false,
  direct_memory_commit: false,
  direct_relationship_commit: false,
  public_publish_performed: false,
  external_call_performed: false,
  owner_authority_created_by_ai: false,
  runtime_readiness_claimed: false,
  production_readiness_claimed: false,
  production_go_performed: false,
  priority1_status: 'BLOCKED',
  trace_id: 'trace_self_positive_comment',
};

function row(overrides = {}) {
  return { ...BASE, trace_id: `trace_${overrides.scenario_id || BASE.scenario_id}`, ...overrides };
}

function minimumRows(extraRows = []) {
  const rows = [
    row({ scenario_id: 'self_positive_comment', scenario_kind: 'comment', fixture_group: 'positive' }),
    row({ scenario_id: 'self_positive_game', scenario_kind: 'game_observation', fixture_group: 'positive', observation_confidence: 'high', observation_freshness: 'fresh', memory_candidate_allowed: false }),
    row({ scenario_id: 'self_positive_donation', scenario_kind: 'donation', fixture_group: 'positive', relationship_candidate_allowed: false }),
    row({ scenario_id: 'self_positive_media', scenario_kind: 'media_watch', fixture_group: 'positive' }),
    row({ scenario_id: 'self_positive_topic', scenario_kind: 'external_topic', fixture_group: 'positive', memory_candidate_allowed: false }),
    row({ scenario_id: 'self_positive_idle', scenario_kind: 'idle', fixture_group: 'positive', memory_candidate_allowed: false }),
    row({ scenario_id: 'self_boundary_low_confidence', fixture_group: 'boundary', scenario_kind: 'game_observation', observation_confidence: 'low', expected_result_state: 'blocked', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'low_confidence_observation_blocks_assertion', memory_candidate_allowed: false }),
    row({ scenario_id: 'self_boundary_stale', fixture_group: 'boundary', scenario_kind: 'game_observation', observation_confidence: 'high', observation_freshness: 'stale', expected_result_state: 'blocked', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'stale_observation_blocks_memory_and_action', memory_candidate_allowed: false }),
    row({ scenario_id: 'self_boundary_blocked', fixture_group: 'boundary', blocked_viewer: true, expected_result_state: 'blocked', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'blocked_viewer_blocks_personalization', memory_candidate_allowed: false }),
    row({ scenario_id: 'self_boundary_echo', fixture_group: 'boundary', echo_risk: true, expected_result_state: 'blocked', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'echo_risk_blocks_memory', memory_candidate_allowed: false }),
    row({ scenario_id: 'self_negative_raw_chat', fixture_group: 'negative', raw_chat_included: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'raw_chat_rejected' }),
    row({ scenario_id: 'self_negative_private_id', fixture_group: 'negative', private_id_included: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'private_id_rejected' }),
    row({ scenario_id: 'self_negative_raw_audio', fixture_group: 'negative', raw_audio_included: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'raw_audio_rejected' }),
    row({ scenario_id: 'self_negative_asset', fixture_group: 'negative', raw_asset_path_included: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'raw_asset_path_rejected' }),
    row({ scenario_id: 'self_negative_payment', fixture_group: 'negative', scenario_kind: 'donation', raw_payment_data_included: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'raw_payment_data_rejected' }),
    row({ scenario_id: 'self_negative_payment_delta', fixture_group: 'negative', scenario_kind: 'donation', payment_relationship_delta: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'payment_relationship_delta_rejected' }),
    row({ scenario_id: 'self_negative_action', fixture_group: 'negative', scenario_kind: 'game_observation', input_action_candidate_included: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'input_action_candidate_rejected' }),
    row({ scenario_id: 'self_negative_memory', fixture_group: 'negative', direct_memory_commit: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'direct_memory_commit_rejected' }),
    row({ scenario_id: 'self_negative_owner', fixture_group: 'negative', owner_authority_created_by_ai: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'owner_authority_created_by_ai_rejected' }),
    row({ scenario_id: 'self_negative_ready', fixture_group: 'negative', production_readiness_claimed: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'production_readiness_claim_rejected' }),
  ];
  return [...rows, ...extraRows];
}

function withFixture(rows, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-live-loop-self-test-'));
  const file = path.join(dir, 'fixtures.jsonl');
  try {
    fs.writeFileSync(file, rows.map((item) => JSON.stringify(item)).join('\n') + '\n');
    return fn(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function reportFor(rows, options = {}) {
  return withFixture(rows, (fixturePath) => buildSyntheticLiveLoopDryRunReport({ fixturePath, ...options }));
}

function passes(rows) {
  return reportFor(rows).ok;
}

function fails(rows) {
  return !passes(rows);
}

function mutate(id, changes) {
  return minimumRows().map((item) => item.scenario_id === id ? { ...item, ...changes } : item);
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
  test('safe_expected_fail_does_not_force_actual_fail', () => fails(mutate('self_positive_comment', { expected_result_state: 'fail', expected_blocking: true }))),
  test('safe_expected_blocking_does_not_force_actual_blocking', () => fails(mutate('self_positive_comment', { expected_blocking: true }))),
  test('negative_group_without_violation_fails', () => fails(mutate('self_negative_raw_chat', { raw_chat_included: false, expected_reason_code: 'safe_dry_run_pass' }))),
  test('unsafe_expected_pass_still_fails', () => fails(mutate('self_negative_raw_chat', { expected_result_state: 'pass', expected_blocking: false, expected_operator_attention_required: false }))),
  test('missing_required_field_fails', () => {
    const rows = minimumRows();
    delete rows[0].expected_operator_attention_required;
    return fails(rows);
  }),
  test('invalid_field_type_fails', () => fails(mutate('self_positive_comment', { expected_blocking: 'false' }))),
  test('duplicate_scenario_id_fails', () => fails(mutate('self_positive_game', { scenario_id: 'self_positive_comment' }))),
  test('duplicate_trace_id_fails', () => fails(mutate('self_positive_game', { trace_id: 'trace_self_positive_comment' }))),
  test('approved_game_input_action_fails', () => passes(minimumRows([row({ scenario_id: 'self_negative_approved_action', fixture_group: 'negative', scenario_kind: 'game_observation', approved_game_input_action_included: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'approved_game_input_action_rejected' })]))),
  test('world_command_fails', () => passes(minimumRows([row({ scenario_id: 'self_negative_world_command', fixture_group: 'negative', scenario_kind: 'game_observation', world_command_included: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'world_command_rejected' })]))),
  test('public_publish_fails', () => passes(minimumRows([row({ scenario_id: 'self_negative_public_publish', fixture_group: 'negative', public_publish_performed: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'public_publish_rejected' })]))),
  test('external_call_fails', () => passes(minimumRows([row({ scenario_id: 'self_negative_external_call', fixture_group: 'negative', external_call_performed: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'external_call_rejected' })]))),
  test('production_go_fails', () => passes(minimumRows([row({ scenario_id: 'self_negative_production_go', fixture_group: 'negative', production_go_performed: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'production_go_rejected' })]))),
  test('donation_relationship_candidate_fails', () => passes(minimumRows([row({ scenario_id: 'self_negative_donation_relationship', fixture_group: 'negative', scenario_kind: 'donation', relationship_candidate_allowed: true, expected_result_state: 'fail', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'donation_relationship_candidate_rejected' })]))),
  test('muted_viewer_blocks_personalization', () => passes(minimumRows([row({ scenario_id: 'self_boundary_muted', fixture_group: 'boundary', muted_viewer: true, memory_candidate_allowed: true, relationship_candidate_allowed: true, expected_result_state: 'blocked', expected_blocking: true, expected_operator_attention_required: true, expected_reason_code: 'muted_viewer_blocks_personalization' })]))),
  test('actual_report_omits_expected_oracle_fields', () => {
    const report = reportFor(minimumRows(), { includeReports: true });
    return report.ok && report.reports.every((item) => !Object.hasOwn(item, 'expected_blocking') && Object.hasOwn(item, 'blocking'));
  }),
  test('raw_chat_fails', () => fails(mutate('self_negative_raw_chat', { expected_reason_code: 'safe_dry_run_pass' }))),
  test('private_id_fails', () => fails(mutate('self_negative_private_id', { expected_reason_code: 'safe_dry_run_pass' }))),
  test('raw_audio_fails', () => fails(mutate('self_negative_raw_audio', { expected_reason_code: 'safe_dry_run_pass' }))),
  test('raw_asset_path_fails', () => fails(mutate('self_negative_asset', { expected_reason_code: 'safe_dry_run_pass' }))),
  test('raw_payment_fails', () => fails(mutate('self_negative_payment', { expected_reason_code: 'safe_dry_run_pass' }))),
  test('payment_relationship_delta_fails', () => fails(mutate('self_negative_payment_delta', { expected_reason_code: 'safe_dry_run_pass' }))),
  test('input_action_candidate_fails', () => fails(mutate('self_negative_action', { expected_reason_code: 'safe_dry_run_pass' }))),
  test('direct_memory_commit_fails', () => fails(mutate('self_negative_memory', { expected_reason_code: 'safe_dry_run_pass' }))),
  test('owner_authority_created_by_ai_fails', () => fails(mutate('self_negative_owner', { expected_reason_code: 'safe_dry_run_pass' }))),
  test('production_readiness_claim_fails', () => fails(mutate('self_negative_ready', { expected_reason_code: 'safe_dry_run_pass' }))),
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
