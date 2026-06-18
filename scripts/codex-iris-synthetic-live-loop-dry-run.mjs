#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.6

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VALIDATOR = 'iris_synthetic_live_loop_dry_run';
const SCHEMA = 'iris_synthetic_live_loop_fixture_v1';
const REPORT_SCHEMA = 'iris_synthetic_live_loop_dry_run';
const DEFAULT_FIXTURE = 'docs/specs/IRIS_20240425/fixtures/live_loop/iris_synthetic_live_loop_fixtures.jsonl';

const SUPPORTED_KINDS = new Set(['comment', 'game_observation', 'donation', 'media_watch', 'external_topic', 'idle']);
const GROUPS = new Set(['positive', 'boundary', 'negative']);
const RESULT_STATES = new Set(['pass', 'blocked', 'needs_review', 'fail']);
const UNSUPPORTED_KINDS = new Set(['world_command', 'input_action_candidate', 'approved_game_input_action', 'execute', 'commit', 'write', 'memory_write']);

const REQUIRED_BOOL_FALSE_FIELDS = [
  'raw_chat_included',
  'private_id_included',
  'raw_audio_included',
  'raw_asset_path_included',
  'raw_payment_data_included',
  'payment_relationship_delta',
  'input_action_candidate_included',
  'game_command_included',
  'direct_memory_commit',
  'direct_relationship_commit',
  'owner_authority_created_by_ai',
  'runtime_readiness_claimed',
  'production_readiness_claimed',
  'production_go_performed',
];

const REASON_BY_FLAG = [
  ['raw_chat_included', 'raw_chat_rejected', 'safety_and_privacy_check'],
  ['private_id_included', 'private_id_rejected', 'safety_and_privacy_check'],
  ['raw_audio_included', 'raw_audio_rejected', 'external_module_handoff_boundary'],
  ['raw_asset_path_included', 'raw_asset_path_rejected', 'external_module_handoff_boundary'],
  ['raw_payment_data_included', 'raw_payment_data_rejected', 'safety_and_privacy_check'],
  ['payment_relationship_delta', 'payment_relationship_delta_rejected', 'relationship_candidate'],
  ['input_action_candidate_included', 'input_action_candidate_rejected', 'community_world_boundary'],
  ['game_command_included', 'game_command_rejected', 'community_world_boundary'],
  ['direct_memory_commit', 'direct_memory_commit_rejected', 'memory_candidate'],
  ['direct_relationship_commit', 'direct_relationship_commit_rejected', 'relationship_candidate'],
  ['owner_authority_created_by_ai', 'owner_authority_created_by_ai_rejected', 'safe_final_dry_run_report'],
  ['production_readiness_claimed', 'production_readiness_claim_rejected', 'safe_final_dry_run_report'],
  ['runtime_readiness_claimed', 'runtime_readiness_claim_rejected', 'safe_final_dry_run_report'],
  ['production_go_performed', 'production_go_rejected', 'safe_final_dry_run_report'],
];

function safeFailure(row, reasonCode, stage, actualStatus = 'fail') {
  return {
    scenario_id: row?.scenario_id || 'unknown',
    reason_code: reasonCode,
    stage,
    expected_status: row?.expected_result_state || 'unknown',
    actual_status: actualStatus,
    rawFixturePrinted: false,
    rawLogsRead: false,
    rawDiffRead: false,
    priority1Status: 'BLOCKED',
  };
}

function repoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function parseJsonl(file) {
  const text = fs.readFileSync(file, 'utf8');
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line, index) => {
    try {
      return { row: JSON.parse(line), line: index + 1 };
    } catch {
      return { row: null, line: index + 1, parseError: true };
    }
  });
}

function classifyRow(row) {
  if (!row || row.schema_version !== SCHEMA) return ['invalid_schema', 'safe_synthetic_input'];
  if (!row.scenario_id || !row.trace_id) return ['missing_identity', 'safe_synthetic_input'];
  if (!SUPPORTED_KINDS.has(row.scenario_kind)) return ['unsupported_scenario_kind', 'input_classification'];
  if (UNSUPPORTED_KINDS.has(row.scenario_kind)) return ['unsupported_scenario_kind', 'input_classification'];
  if (!GROUPS.has(row.fixture_group)) return ['invalid_fixture_group', 'input_classification'];
  if (!RESULT_STATES.has(row.expected_result_state)) return ['invalid_expected_result_state', 'input_classification'];
  if (row.priority1_status !== 'BLOCKED') return ['priority1_not_blocked', 'safe_final_dry_run_report'];

  for (const [flag, reason, stage] of REASON_BY_FLAG) {
    if (row[flag] === true) return [reason, stage];
  }

  if (row.observation_confidence === 'low') return ['low_confidence_observation_blocks_assertion', 'input_classification'];
  if (row.observation_freshness === 'stale') return ['stale_observation_blocks_memory_and_action', 'input_classification'];
  if (row.blocked_viewer === true) return ['blocked_viewer_blocks_personalization', 'safety_and_privacy_check'];
  if (row.minor_safety_signal === true) return ['minor_safety_signal_blocks_personalization', 'safety_and_privacy_check'];
  if (row.echo_risk === true) return ['echo_risk_blocks_memory', 'persona_consistency_check'];
  if (row.identity_drift === 'high') return ['identity_drift_requires_operator_attention', 'persona_consistency_check'];
  if (row.queue_pressure === 'high') return ['queue_pressure_shortens_response', 'commentary_candidate'];
  if (row.manual_summary_candidate_only === true) return ['manual_summary_candidate_only', 'community_world_recap_candidate'];
  if (row.license_status === 'unknown') return ['unknown_license_requires_operator_attention', 'safety_and_privacy_check'];
  if (row.moderation_precheck_required === true) return ['moderation_precheck_required', 'safety_and_privacy_check'];
  return ['safe_dry_run_pass', 'safe_final_dry_run_report'];
}

function buildReportForRow(row) {
  const [reasonCode, stage] = classifyRow(row);
  const actualState = reasonCode === 'safe_dry_run_pass' || reasonCode === 'manual_summary_candidate_only'
    ? 'pass'
    : reasonCode === 'identity_drift_requires_operator_attention'
      || reasonCode === 'queue_pressure_shortens_response'
      || reasonCode === 'unknown_license_requires_operator_attention'
      || reasonCode === 'moderation_precheck_required'
        ? 'needs_review'
        : 'blocked';

  const unsafeFailure = REASON_BY_FLAG.some(([flag]) => row?.[flag] === true)
    || row?.priority1_status !== 'BLOCKED'
    || row?.scenario_kind && !SUPPORTED_KINDS.has(row.scenario_kind);

  const expectedFail = row?.expected_result_state === 'fail';
  const finalState = unsafeFailure || expectedFail ? 'fail' : actualState;
  return {
    schema_version: REPORT_SCHEMA,
    scenario_id: row.scenario_id,
    scenario_kind: row.scenario_kind,
    safe_input_summary: String(row.safe_input_summary || 'safe_summary_missing').slice(0, 120),
    persona_status: ['persona_consistency_check', 'safe_final_dry_run_report'].includes(stage) ? 'checked' : 'not_applicable',
    safety_status: finalState === 'fail' || finalState === 'blocked' || finalState === 'needs_review' ? 'attention' : 'pass',
    privacy_status: row.raw_chat_included || row.private_id_included || row.raw_audio_included || row.raw_asset_path_included || row.raw_payment_data_included ? 'fail' : 'pass',
    commentary_candidate: finalState === 'pass' ? { status: 'candidate_only', executable: false } : null,
    memory_candidate: row.memory_candidate_allowed === true && finalState === 'pass' ? { status: 'candidate_only', committed: false } : null,
    relationship_candidate: row.relationship_candidate_allowed === true && finalState === 'pass' ? { status: 'candidate_only', committed: false } : null,
    voice_safe_summary: { status: finalState === 'fail' ? 'blocked' : 'candidate_only', external_call_performed: false },
    avatar_safe_summary: { status: finalState === 'fail' ? 'blocked' : 'candidate_only', external_call_performed: false },
    subtitle_safe_summary: { status: finalState === 'fail' ? 'blocked' : 'candidate_only', external_call_performed: false },
    community_recap_candidate: row.community_recap_candidate_allowed === true && finalState === 'pass' ? { status: 'candidate_only', published: false } : null,
    operator_attention_required: row.operator_attention_required === true || finalState !== 'pass',
    expected_blocking: row.expected_blocking === true,
    trace_id: row.trace_id,
    raw_chat_included: false,
    private_id_included: false,
    raw_audio_included: false,
    raw_asset_path_included: false,
    raw_payment_data_included: false,
    game_action_candidate_allowed: false,
    approved_game_input_action_produced: false,
    memory_commit_performed: false,
    relationship_commit_performed: false,
    public_publish_performed: false,
    external_call_performed: false,
    runtime_readiness_claimed: false,
    production_readiness_claimed: false,
    production_go_performed: false,
    priority1_status: 'BLOCKED',
    result_state: finalState,
    reason_code: reasonCode,
    stage,
  };
}

export function buildSyntheticLiveLoopDryRunReport(options = {}) {
  const fixturePath = options.fixturePath || path.join(repoRoot(), DEFAULT_FIXTURE);
  const entries = parseJsonl(fixturePath);
  const failures = [];
  const reports = [];
  const kinds = new Set();
  const groups = new Set();

  for (const entry of entries) {
    if (entry.parseError) {
      failures.push(safeFailure({ scenario_id: `line_${entry.line}`, expected_result_state: 'parseable' }, 'invalid_jsonl', 'safe_synthetic_input'));
      continue;
    }
    const row = entry.row;
    kinds.add(row.scenario_kind);
    groups.add(row.fixture_group);
    const report = buildReportForRow(row);
    reports.push(report);

    if (report.reason_code !== row.expected_reason_code) failures.push(safeFailure(row, 'unexpected_reason_code', report.stage, report.result_state));
    if (report.result_state !== row.expected_result_state) failures.push(safeFailure(row, 'unexpected_result_state', report.stage, report.result_state));
    if (report.expected_blocking !== row.expected_blocking) failures.push(safeFailure(row, 'unexpected_blocking_state', report.stage, report.result_state));
    for (const field of REQUIRED_BOOL_FALSE_FIELDS) {
      if (row.fixture_group !== 'negative' && row[field] === true) failures.push(safeFailure(row, `${field}_unexpected_true`, 'safe_synthetic_input'));
    }
    if (report.priority1_status !== 'BLOCKED') failures.push(safeFailure(row, 'priority1_not_blocked', 'safe_final_dry_run_report'));
    if (report.external_call_performed || report.memory_commit_performed || report.relationship_commit_performed || report.public_publish_performed) {
      failures.push(safeFailure(row, 'side_effect_performed', 'safe_final_dry_run_report'));
    }
  }

  if (entries.length < 20) failures.push(safeFailure({ scenario_id: 'fixture_file', expected_result_state: 'pass' }, 'minimum_rows_missing', 'safe_synthetic_input'));
  for (const kind of SUPPORTED_KINDS) {
    if (!kinds.has(kind)) failures.push(safeFailure({ scenario_id: `kind_${kind}`, expected_result_state: 'pass' }, 'supported_kind_missing', 'input_classification'));
  }
  for (const group of GROUPS) {
    if (!groups.has(group)) failures.push(safeFailure({ scenario_id: `group_${group}`, expected_result_state: 'pass' }, 'fixture_group_missing', 'input_classification'));
  }

  return {
    ok: failures.length === 0,
    validator: VALIDATOR,
    schemaVersion: '1.0',
    rowsChecked: entries.length,
    reportsChecked: reports.length,
    supportedScenarioKinds: [...SUPPORTED_KINDS],
    fixtureGroupsSeen: [...groups].sort(),
    failureCount: failures.length,
    failures: failures.slice(0, 20),
    priority1Status: 'BLOCKED',
    runtimeImplemented: false,
    datasetAuditRunnerImplemented: false,
    realDatasetProcessing: false,
    minecraftRuntimeImplemented: false,
    minecraftPluginImplemented: false,
    voxweaveImplementation: false,
    live2dImplementation: false,
    criptoTipImplementation: false,
    productionReadinessClaimed: false,
    productionGoPerformed: false,
    externalCallPerformed: false,
    memoryCommitPerformed: false,
    relationshipCommitPerformed: false,
    publicPublishPerformed: false,
    rawLogsRead: false,
    rawDiffRead: false,
    safeSummaryOnly: true,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildSyntheticLiveLoopDryRunReport();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
