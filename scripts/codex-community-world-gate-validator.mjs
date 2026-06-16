#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VALIDATOR = 'community_world_gate_validator';
const SCHEMA_VERSION = 'community_world_fixture_v1';
const DEFAULT_FIXTURE_DIR = 'docs/specs/IRIS_20240425/fixtures/community_world_core';
const REQUIRED_FIELDS = [
  'schema_version',
  'fixture_id',
  'fixture_group',
  'k_ids',
  'target_gate_ids',
  'input_evidence_class',
  'synthetic_input',
  'expected_result_state',
  'expected_safe_reason_codes',
  'expected_blocking',
  'must_not_include',
  'trace_id',
];
const REQUIRED_K_IDS = Array.from({ length: 20 }, (_, index) => `K${1001 + index}`);
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
const FILE_SPECS = [
  ['community_world_core_positive_fixtures.jsonl', 'positive', 20],
  ['community_world_core_negative_fixtures.jsonl', 'negative', 20],
  ['community_world_core_boundary_fixtures.jsonl', 'boundary', 15],
  ['community_world_core_redline_fixtures.jsonl', 'red_line', 10],
  ['community_world_core_completion_review_fixtures.jsonl', 'completion_review', 10],
];
const RESULT_STATES_BY_GROUP = {
  positive: new Set(['pass']),
  negative: new Set(['fail']),
  red_line: new Set(['fail']),
  boundary: new Set(['pass', 'blocked', 'needs_review', 'not_applicable']),
  completion_review: new Set(['pass', 'blocked', 'fail', 'needs_review']),
};
const FORBIDDEN_SUBSTRINGS = [
  'raw_minecraft_chat_text',
  'private_viewer_id_value',
  'real_user',
  'real_username',
  'real_discord_id',
  'real_youtube_channel_id',
  'token',
  'secret',
  'oauth',
  'api_key',
  'endpoint',
  'password',
  'connection_string',
  'minecraft_command_value',
  'world_command',
  'production_ready_true',
  'production_go_true',
  'official_minecraft_server',
  'mojang_approved',
  'microsoft_approved',
];
const GATE_REJECT_FLAGS = [
  ['community_world_no_direct_command_gate', [
    'game_command_included',
    'minecraft_command_included',
    'input_action_candidate_included',
    'approved_game_input_action_included',
    'execution_allowed',
  ]],
  ['minecraft_monetization_no_pay_to_win_gate', [
    'payment_ranking_included',
    'payment_auto_whitelist',
    'relationship_growth_allowed',
    'pay_to_win_allowed',
    'pay_to_friendship_allowed',
  ]],
  ['community_world_pay_to_rank_guard', [
    'payment_ranking_included',
    'payment_auto_whitelist',
    'relationship_growth_allowed',
    'pay_to_win_allowed',
    'pay_to_friendship_allowed',
  ]],
  ['community_world_no_raw_chat_memory_gate', [
    'raw_chat_included',
    'raw_minecraft_chat_included',
    'raw_chat_memory_allowed',
  ]],
  ['community_world_owner_review_gate', [
    'ai_owner_approval',
    'owner_authority_created_by_ai',
    'owner_review_bypassed',
  ]],
  ['minecraft_unofficial_commercial_policy_gate', [
    'official_minecraft_affiliation_claimed',
    'mojang_approved',
    'microsoft_approved',
    'commercial_policy_review_bypassed',
  ]],
  ['community_world_anti_parasocial_gate', [
    'relationship_ranking_included',
    'exclusive_friendship_claimed',
    'romantic_escalation_claimed',
    'payment_relationship_delta_allowed',
  ]],
  ['community_world_minor_safety_gate', [
    'minor_private_contact_allowed',
    'minor_special_intimacy_allowed',
    'minor_safety_bypass_allowed',
  ]],
];

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeFailure(file, line, fixtureId, reasonCode, gateId = undefined) {
  return {
    file,
    line,
    fixture_id: fixtureId || 'unknown',
    reason_code: reasonCode,
    ...(gateId ? { gate_id: gateId } : {}),
  };
}

function hasTrueFlag(value, flagName) {
  if (!isObject(value)) return false;
  if (value[flagName] === true) return true;
  return Object.values(value).some((item) => isObject(item) && hasTrueFlag(item, flagName));
}

export function parseJsonlFile(filePath, displayFile = path.basename(filePath)) {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return { rows: [], failures: [safeFailure(displayFile, 1, 'unknown', 'EMPTY_JSONL_FILE')] };
  const rows = [];
  const failures = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    try {
      rows.push({ line: index + 1, value: JSON.parse(line) });
    } catch {
      failures.push(safeFailure(displayFile, index + 1, 'unknown', 'INVALID_JSONL_LINE'));
    }
  }
  return { rows, failures };
}

export function loadCommunityWorldFixtureRows(fixtureDir = DEFAULT_FIXTURE_DIR) {
  const failures = [];
  const rows = [];
  const groupCounts = {};
  for (const [file, group, minRows] of FILE_SPECS) {
    const fullPath = path.join(fixtureDir, file);
    if (!fs.existsSync(fullPath)) {
      failures.push(safeFailure(file, 0, 'unknown', 'MISSING_FIXTURE_FILE'));
      continue;
    }
    const parsed = parseJsonlFile(fullPath, file);
    failures.push(...parsed.failures);
    groupCounts[group] = parsed.rows.length;
    if (parsed.rows.length < minRows) failures.push(safeFailure(file, 0, 'coverage', 'TOO_FEW_ROWS'));
    for (const row of parsed.rows) rows.push({ ...row, file, expectedGroup: group });
  }
  return { rows, failures, groupCounts };
}

function expectedBlockingIsValid(row) {
  if (row.fixture_group === 'positive' && row.expected_result_state === 'pass') return row.expected_blocking === false;
  if (row.fixture_group === 'negative' && row.expected_result_state === 'fail') return row.expected_blocking === true;
  if (row.fixture_group === 'red_line' && row.expected_result_state === 'fail') return row.expected_blocking === true;
  if (row.fixture_group === 'boundary') {
    if (['blocked', 'needs_review'].includes(row.expected_result_state)) return row.expected_blocking === true;
    if (['pass', 'not_applicable'].includes(row.expected_result_state)) return row.expected_blocking === false;
  }
  if (row.fixture_group === 'completion_review') {
    if (['blocked', 'fail'].includes(row.expected_result_state)) return row.expected_blocking === true;
    if (row.expected_result_state === 'pass') return row.expected_blocking === false;
    if (row.expected_result_state === 'needs_review') return typeof row.expected_blocking === 'boolean';
  }
  return false;
}

export function validateCrossGateSemantics(row, context = {}) {
  const failures = [];
  const file = context.file || 'unknown';
  const line = context.line || 0;
  const fixtureId = row?.fixture_id;
  if (row?.expected_result_state !== 'pass') return failures;
  for (const [gateId, flags] of GATE_REJECT_FLAGS) {
    if (!row.target_gate_ids?.includes(gateId)) continue;
    for (const flag of flags) {
      if (hasTrueFlag(row.synthetic_input, flag)) {
        failures.push(safeFailure(file, line, fixtureId, `PASS_ROW_REJECTED_FLAG_${flag.toUpperCase()}`, gateId));
      }
    }
  }
  return failures;
}

export function validateGateFixtureRow(row, context = {}) {
  const failures = [];
  const file = context.file || 'unknown';
  const line = context.line || 0;
  const fixtureId = row?.fixture_id;

  if (!isObject(row)) return [safeFailure(file, line, fixtureId, 'ROW_NOT_OBJECT')];
  for (const field of REQUIRED_FIELDS) {
    if (!(field in row)) failures.push(safeFailure(file, line, fixtureId, `MISSING_REQUIRED_FIELD_${field}`));
  }
  if (failures.length) return failures;

  if (row.schema_version !== SCHEMA_VERSION) failures.push(safeFailure(file, line, fixtureId, 'BAD_SCHEMA_VERSION'));
  if (row.fixture_group !== context.expectedGroup) failures.push(safeFailure(file, line, fixtureId, 'BAD_FIXTURE_GROUP'));
  if (!RESULT_STATES_BY_GROUP[row.fixture_group]?.has(row.expected_result_state)) failures.push(safeFailure(file, line, fixtureId, 'BAD_EXPECTED_RESULT_STATE'));
  if (!expectedBlockingIsValid(row)) failures.push(safeFailure(file, line, fixtureId, 'BAD_EXPECTED_BLOCKING'));
  if (!Array.isArray(row.k_ids) || row.k_ids.length === 0) failures.push(safeFailure(file, line, fixtureId, 'EMPTY_K_IDS'));
  if (!Array.isArray(row.target_gate_ids) || row.target_gate_ids.length === 0) failures.push(safeFailure(file, line, fixtureId, 'EMPTY_TARGET_GATE_IDS'));
  if (!isObject(row.synthetic_input)) failures.push(safeFailure(file, line, fixtureId, 'BAD_SYNTHETIC_INPUT'));
  if (!Array.isArray(row.expected_safe_reason_codes)) failures.push(safeFailure(file, line, fixtureId, 'BAD_REASON_CODES'));
  if (!Array.isArray(row.must_not_include)) failures.push(safeFailure(file, line, fixtureId, 'BAD_MUST_NOT_INCLUDE'));

  const serialized = JSON.stringify(row).toLowerCase();
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    if (serialized.includes(forbidden)) failures.push(safeFailure(file, line, fixtureId, `FORBIDDEN_CONTENT_${forbidden.toUpperCase()}`));
  }
  failures.push(...validateCrossGateSemantics(row, context));
  return failures;
}

export function validateGateCoverage(rows) {
  const kIds = new Set();
  const gates = new Set();
  for (const { value } of rows) {
    for (const kId of Array.isArray(value?.k_ids) ? value.k_ids : []) kIds.add(kId);
    for (const gateId of Array.isArray(value?.target_gate_ids) ? value.target_gate_ids : []) gates.add(gateId);
  }
  const failures = [];
  for (const kId of REQUIRED_K_IDS) {
    if (!kIds.has(kId)) failures.push(safeFailure('all', 0, kId, 'MISSING_K_COVERAGE'));
  }
  for (const gateId of REQUIRED_GATES) {
    if (!gates.has(gateId)) failures.push(safeFailure('all', 0, gateId, 'MISSING_GATE_COVERAGE', gateId));
  }
  return {
    failures,
    gateCoverageStatus: REQUIRED_GATES.every((gateId) => gates.has(gateId)) ? 'pass' : 'fail',
    kCoverageStatus: REQUIRED_K_IDS.every((kId) => kIds.has(kId)) ? 'pass' : 'fail',
  };
}

export function buildCommunityWorldGateValidationReport(options = {}) {
  const loaded = loadCommunityWorldFixtureRows(options.fixtureDir || DEFAULT_FIXTURE_DIR);
  const failures = [...loaded.failures];
  let crossGateFailed = false;
  let forbiddenFailed = false;
  let groupFailed = false;

  for (const row of loaded.rows) {
    const rowFailures = validateGateFixtureRow(row.value, {
      file: row.file,
      line: row.line,
      expectedGroup: row.expectedGroup,
    });
    for (const failure of rowFailures) {
      if (failure.reason_code.startsWith('PASS_ROW_REJECTED_FLAG_')) crossGateFailed = true;
      if (failure.reason_code.startsWith('FORBIDDEN_CONTENT_')) forbiddenFailed = true;
      if (['BAD_FIXTURE_GROUP', 'BAD_EXPECTED_RESULT_STATE', 'BAD_EXPECTED_BLOCKING'].includes(failure.reason_code)) groupFailed = true;
    }
    failures.push(...rowFailures);
  }
  const coverage = validateGateCoverage(loaded.rows);
  failures.push(...coverage.failures);

  const ok = failures.length === 0;
  return {
    ok,
    validator: VALIDATOR,
    schemaVersion: SCHEMA_VERSION,
    ...(ok ? {
      filesChecked: FILE_SPECS.length,
      rowsChecked: loaded.rows.length,
      gateCoverageStatus: 'pass',
      kCoverageStatus: 'pass',
      groupSemanticsStatus: 'pass',
      crossGateSemanticsStatus: 'pass',
      forbiddenContentStatus: 'pass',
      priority1Status: 'BLOCKED',
      datasetAuditRunnerImplemented: false,
      runtimeImplemented: false,
      minecraftRuntimeImplemented: false,
      minecraftPluginImplemented: false,
      productionReadinessClaimed: false,
      productionGoPerformed: false,
    } : {
      failureCount: failures.length,
      failures: failures.slice(0, 20),
      gateCoverageStatus: coverage.gateCoverageStatus,
      kCoverageStatus: coverage.kCoverageStatus,
      groupSemanticsStatus: groupFailed ? 'fail' : 'pass',
      crossGateSemanticsStatus: crossGateFailed ? 'fail' : 'pass',
      forbiddenContentStatus: forbiddenFailed ? 'fail' : 'pass',
      rawRowPrinted: false,
      rawLogsRead: false,
      rawDiffRead: false,
      priority1Status: 'BLOCKED',
    }),
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--fixture-dir') {
      options.fixtureDir = argv[index + 1];
      index += 1;
    }
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildCommunityWorldGateValidationReport(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
