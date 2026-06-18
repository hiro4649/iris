#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.6

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VALIDATOR = 'iris_synthetic_live_loop_dry_run';
const FIXTURE_SCHEMA = 'iris_synthetic_live_loop_fixture_v1';
const REPORT_SCHEMA = 'iris_synthetic_live_loop_dry_run_v1';
const DEFAULT_FIXTURE = 'docs/specs/IRIS_20240425/fixtures/live_loop/iris_synthetic_live_loop_fixtures.jsonl';

const SUPPORTED_KINDS = new Set(['comment', 'game_observation', 'donation', 'media_watch', 'external_topic', 'idle']);
const GROUPS = new Set(['positive', 'boundary', 'negative']);
const RESULT_STATES = new Set(['pass', 'blocked', 'needs_review', 'fail']);

const REQUIRED_FIELDS = [
  'schema_version',
  'scenario_id',
  'scenario_kind',
  'fixture_group',
  'safe_input_summary',
  'expected_result_state',
  'expected_reason_code',
  'expected_blocking',
  'expected_operator_attention_required',
  'memory_candidate_allowed',
  'relationship_candidate_allowed',
  'community_recap_candidate_allowed',
  'raw_chat_included',
  'private_id_included',
  'raw_audio_included',
  'raw_asset_path_included',
  'raw_payment_data_included',
  'payment_relationship_delta',
  'input_action_candidate_included',
  'approved_game_input_action_included',
  'world_command_included',
  'game_command_included',
  'direct_memory_commit',
  'direct_relationship_commit',
  'public_publish_performed',
  'external_call_performed',
  'owner_authority_created_by_ai',
  'runtime_readiness_claimed',
  'production_readiness_claimed',
  'production_go_performed',
  'priority1_status',
  'trace_id',
];

const BOOLEAN_FIELDS = [
  'expected_blocking',
  'expected_operator_attention_required',
  'memory_candidate_allowed',
  'relationship_candidate_allowed',
  'community_recap_candidate_allowed',
  'raw_chat_included',
  'private_id_included',
  'raw_audio_included',
  'raw_asset_path_included',
  'raw_payment_data_included',
  'payment_relationship_delta',
  'input_action_candidate_included',
  'approved_game_input_action_included',
  'world_command_included',
  'game_command_included',
  'direct_memory_commit',
  'direct_relationship_commit',
  'public_publish_performed',
  'external_call_performed',
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
  ['approved_game_input_action_included', 'approved_game_input_action_rejected', 'community_world_boundary'],
  ['world_command_included', 'world_command_rejected', 'community_world_boundary'],
  ['game_command_included', 'game_command_rejected', 'community_world_boundary'],
  ['direct_memory_commit', 'direct_memory_commit_rejected', 'memory_candidate'],
  ['direct_relationship_commit', 'direct_relationship_commit_rejected', 'relationship_candidate'],
  ['public_publish_performed', 'public_publish_rejected', 'safe_final_dry_run_report'],
  ['external_call_performed', 'external_call_rejected', 'external_module_handoff_boundary'],
  ['owner_authority_created_by_ai', 'owner_authority_created_by_ai_rejected', 'safe_final_dry_run_report'],
  ['runtime_readiness_claimed', 'runtime_readiness_claim_rejected', 'safe_final_dry_run_report'],
  ['production_readiness_claimed', 'production_readiness_claim_rejected', 'safe_final_dry_run_report'],
  ['production_go_performed', 'production_go_rejected', 'safe_final_dry_run_report'],
];

const FAIL_REASONS = new Set([
  'invalid_schema',
  'missing_required_field',
  'invalid_field_type',
  'duplicate_scenario_id',
  'duplicate_trace_id',
  'unsupported_scenario_kind',
  ...REASON_BY_FLAG.map(([, reason]) => reason),
  'donation_relationship_candidate_rejected',
]);

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

function safeFailure(row, reasonCode, stage, actualStatus = 'fail', actualBlocking = true) {
  return {
    scenario_id: row?.scenario_id || 'unknown',
    reason_code: reasonCode,
    stage,
    expected_status: row?.expected_result_state || 'unknown',
    actual_status: actualStatus,
    expected_blocking: typeof row?.expected_blocking === 'boolean' ? row.expected_blocking : 'unknown',
    actual_blocking: actualBlocking,
    rawFixturePrinted: false,
    rawLogsRead: false,
    rawDiffRead: false,
    priority1Status: 'BLOCKED',
  };
}

export function validateFixtureShape(row, seen = { scenarioIds: new Set(), traceIds: new Set() }) {
  if (!row || row.schema_version !== FIXTURE_SCHEMA) return ['invalid_schema', 'safe_synthetic_input'];

  for (const field of REQUIRED_FIELDS) {
    if (!Object.hasOwn(row, field)) return ['missing_required_field', 'safe_synthetic_input'];
  }

  const stringFields = ['schema_version', 'scenario_id', 'scenario_kind', 'fixture_group', 'safe_input_summary', 'expected_result_state', 'expected_reason_code', 'priority1_status', 'trace_id'];
  if (stringFields.some((field) => typeof row[field] !== 'string' || row[field].length === 0)) {
    return ['invalid_field_type', 'safe_synthetic_input'];
  }
  if (BOOLEAN_FIELDS.some((field) => typeof row[field] !== 'boolean')) {
    return ['invalid_field_type', 'safe_synthetic_input'];
  }
  if (!RESULT_STATES.has(row.expected_result_state)) return ['invalid_field_type', 'safe_synthetic_input'];
  if (!GROUPS.has(row.fixture_group)) return ['invalid_field_type', 'safe_synthetic_input'];
  if (!SUPPORTED_KINDS.has(row.scenario_kind)) return ['unsupported_scenario_kind', 'input_classification'];
  if (seen.scenarioIds.has(row.scenario_id)) return ['duplicate_scenario_id', 'safe_synthetic_input'];
  if (seen.traceIds.has(row.trace_id)) return ['duplicate_trace_id', 'safe_synthetic_input'];
  seen.scenarioIds.add(row.scenario_id);
  seen.traceIds.add(row.trace_id);
  if (row.priority1_status !== 'BLOCKED') return ['priority1_not_blocked', 'safe_final_dry_run_report'];
  return null;
}

export function deriveActualReason(row) {
  if (!SUPPORTED_KINDS.has(row.scenario_kind)) return ['unsupported_scenario_kind', 'input_classification'];
  if (row.priority1_status !== 'BLOCKED') return ['priority1_not_blocked', 'safe_final_dry_run_report'];

  for (const [flag, reason, stage] of REASON_BY_FLAG) {
    if (row[flag] === true) return [reason, stage];
  }

  if (row.scenario_kind === 'donation' && row.relationship_candidate_allowed === true) {
    return ['donation_relationship_candidate_rejected', 'relationship_candidate'];
  }
  if (row.observation_freshness === 'stale' && (row.memory_candidate_allowed === true || row.relationship_candidate_allowed === true || row.input_action_candidate_included === true)) {
    return ['stale_observation_blocks_memory_and_action', 'input_classification'];
  }
  if (row.blocked_viewer === true) return ['blocked_viewer_blocks_personalization', 'safety_and_privacy_check'];
  if (row.muted_viewer === true) return ['muted_viewer_blocks_personalization', 'safety_and_privacy_check'];
  if (row.observation_confidence === 'low') return ['low_confidence_observation_blocks_assertion', 'input_classification'];
  if (row.observation_freshness === 'stale') return ['stale_observation_blocks_memory_and_action', 'input_classification'];
  if (row.minor_safety_signal === true) return ['minor_safety_signal_blocks_personalization', 'safety_and_privacy_check'];
  if (row.echo_risk === true) return ['echo_risk_blocks_memory', 'persona_consistency_check'];
  if (row.identity_drift === 'high') return ['identity_drift_requires_operator_attention', 'persona_consistency_check'];
  if (row.queue_pressure === 'high') return ['queue_pressure_shortens_response', 'commentary_candidate'];
  if (row.manual_summary_candidate_only === true) return ['manual_summary_candidate_only', 'community_world_recap_candidate'];
  if (row.license_status === 'unknown') return ['unknown_license_requires_operator_attention', 'safety_and_privacy_check'];
  if (row.moderation_precheck_required === true) return ['moderation_precheck_required', 'safety_and_privacy_check'];
  return ['safe_dry_run_pass', 'safe_final_dry_run_report'];
}

export function deriveActualState(_row, reasonCode) {
  if (reasonCode === 'safe_dry_run_pass' || reasonCode === 'manual_summary_candidate_only') return 'pass';
  if (FAIL_REASONS.has(reasonCode) || reasonCode === 'priority1_not_blocked') return 'fail';
  if ([
    'identity_drift_requires_operator_attention',
    'queue_pressure_shortens_response',
    'unknown_license_requires_operator_attention',
    'moderation_precheck_required',
  ].includes(reasonCode)) return 'needs_review';
  return 'blocked';
}

export function deriveActualBlocking(actualState) {
  return actualState !== 'pass';
}

export function deriveActualOperatorAttention(row, actualState, reasonCode) {
  return actualState !== 'pass'
    || [
      'identity_drift_requires_operator_attention',
      'queue_pressure_shortens_response',
      'unknown_license_requires_operator_attention',
      'moderation_precheck_required',
    ].includes(reasonCode)
    || row.community_recap_candidate_allowed === true;
}

function buildActualEvaluation(row, seen) {
  const shapeFailure = validateFixtureShape(row, seen);
  if (shapeFailure) {
    const [reasonCode, stage] = shapeFailure;
    const state = deriveActualState(row, reasonCode);
    return {
      reasonCode,
      stage,
      resultState: state,
      blocking: deriveActualBlocking(state),
      operatorAttentionRequired: deriveActualOperatorAttention(row || {}, state, reasonCode),
    };
  }
  const [reasonCode, stage] = deriveActualReason(row);
  const state = deriveActualState(row, reasonCode);
  return {
    reasonCode,
    stage,
    resultState: state,
    blocking: deriveActualBlocking(state),
    operatorAttentionRequired: deriveActualOperatorAttention(row, state, reasonCode),
  };
}

export function buildSafeScenarioReport(row, actualEvaluation) {
  const finalState = actualEvaluation.resultState;
  const pass = finalState === 'pass';
  const handoffStatus = pass ? 'candidate_only' : actualEvaluation.resultState === 'needs_review' ? 'review_required' : 'blocked';
  return {
    schema_version: REPORT_SCHEMA,
    scenario_id: row?.scenario_id || 'unknown',
    scenario_kind: row?.scenario_kind || 'unknown',
    safe_input_summary: String(row?.safe_input_summary || 'safe_summary_missing').slice(0, 120),
    persona_status: ['persona_consistency_check', 'safe_final_dry_run_report'].includes(actualEvaluation.stage) ? 'checked' : 'not_applicable',
    safety_status: pass ? 'pass' : 'attention',
    privacy_status: row?.raw_chat_included || row?.private_id_included || row?.raw_audio_included || row?.raw_asset_path_included || row?.raw_payment_data_included ? 'fail' : 'pass',
    commentary_candidate: pass ? { status: 'candidate_only', executable: false } : null,
    memory_candidate: row?.memory_candidate_allowed === true && pass ? { status: 'candidate_only', committed: false } : null,
    relationship_candidate: row?.relationship_candidate_allowed === true && row?.scenario_kind !== 'donation' && pass ? { status: 'candidate_only', committed: false } : null,
    voice_safe_summary: { status: handoffStatus, external_call_performed: false },
    avatar_safe_summary: { status: handoffStatus, external_call_performed: false },
    subtitle_safe_summary: { status: handoffStatus, external_call_performed: false },
    community_recap_candidate: row?.community_recap_candidate_allowed === true && pass ? { status: 'candidate_only', published: false } : null,
    operator_attention_required: actualEvaluation.operatorAttentionRequired,
    blocking: actualEvaluation.blocking,
    trace_id: row?.trace_id || 'unknown',
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
    reason_code: actualEvaluation.reasonCode,
    stage: actualEvaluation.stage,
  };
}

export function compareActualToExpected(row, actualEvaluation) {
  const failures = [];
  if (actualEvaluation.reasonCode !== row?.expected_reason_code) {
    failures.push(safeFailure(row, 'unexpected_reason_code', actualEvaluation.stage, actualEvaluation.resultState, actualEvaluation.blocking));
  }
  if (actualEvaluation.resultState !== row?.expected_result_state) {
    failures.push(safeFailure(row, 'unexpected_result_state', actualEvaluation.stage, actualEvaluation.resultState, actualEvaluation.blocking));
  }
  if (actualEvaluation.blocking !== row?.expected_blocking) {
    failures.push(safeFailure(row, 'unexpected_blocking_state', actualEvaluation.stage, actualEvaluation.resultState, actualEvaluation.blocking));
  }
  if (actualEvaluation.operatorAttentionRequired !== row?.expected_operator_attention_required) {
    failures.push(safeFailure(row, 'unexpected_operator_attention_state', actualEvaluation.stage, actualEvaluation.resultState, actualEvaluation.blocking));
  }
  if (row?.fixture_group === 'negative' && actualEvaluation.resultState !== 'fail') {
    failures.push(safeFailure(row, 'negative_fixture_without_detected_violation', actualEvaluation.stage, actualEvaluation.resultState, actualEvaluation.blocking));
  }
  return failures;
}

export function buildSyntheticLiveLoopDryRunReport(options = {}) {
  const fixturePath = options.fixturePath || path.join(repoRoot(), DEFAULT_FIXTURE);
  const entries = parseJsonl(fixturePath);
  const failures = [];
  const reports = [];
  const kinds = new Set();
  const groups = new Set();
  const seen = { scenarioIds: new Set(), traceIds: new Set() };

  for (const entry of entries) {
    if (entry.parseError) {
      failures.push(safeFailure({ scenario_id: `line_${entry.line}`, expected_result_state: 'parseable' }, 'invalid_jsonl', 'safe_synthetic_input'));
      continue;
    }
    const row = entry.row;
    if (typeof row?.scenario_kind === 'string') kinds.add(row.scenario_kind);
    if (typeof row?.fixture_group === 'string') groups.add(row.fixture_group);
    const actualEvaluation = buildActualEvaluation(row, seen);
    const report = buildSafeScenarioReport(row, actualEvaluation);
    reports.push(report);

    failures.push(...compareActualToExpected(row, actualEvaluation));
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
    fixtureSchemaVersion: FIXTURE_SCHEMA,
    reportSchemaVersion: REPORT_SCHEMA,
    rowsChecked: entries.length,
    reportsChecked: reports.length,
    supportedScenarioKinds: [...SUPPORTED_KINDS],
    fixtureGroupsSeen: [...groups].sort(),
    failureCount: failures.length,
    failures: failures.slice(0, 20),
    reports: options.includeReports === true ? reports : undefined,
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
