#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.4

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VALIDATOR = 'community_world_fixture_validator';
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
const ALLOWED_EVIDENCE_CLASSES = new Set(['synthetic_fixture', 'fixture_spec', 'spec_only']);
const REQUIRED_K_IDS = Array.from({ length: 20 }, (_, index) => `K${String(1001 + index)}`);
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
  {
    file: 'community_world_core_positive_fixtures.jsonl',
    group: 'positive',
    minRows: 20,
    states: new Set(['pass']),
    expectedBlocking: false,
  },
  {
    file: 'community_world_core_negative_fixtures.jsonl',
    group: 'negative',
    minRows: 20,
    states: new Set(['fail']),
    expectedBlocking: true,
  },
  {
    file: 'community_world_core_boundary_fixtures.jsonl',
    group: 'boundary',
    minRows: 15,
    states: new Set(['pass', 'blocked', 'needs_review', 'not_applicable']),
  },
  {
    file: 'community_world_core_redline_fixtures.jsonl',
    group: 'red_line',
    minRows: 10,
    states: new Set(['fail']),
    expectedBlocking: true,
  },
  {
    file: 'community_world_core_completion_review_fixtures.jsonl',
    group: 'completion_review',
    minRows: 10,
    states: new Set(['pass', 'blocked', 'fail', 'needs_review']),
  },
];
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

function safeFailure(file, line, fixtureId, reasonCode) {
  return {
    file,
    line,
    fixture_id: fixtureId || 'unknown',
    reason_code: reasonCode,
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

export function validateFixtureRow(row, context = {}) {
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
  if (context.group && row.fixture_group !== context.group) failures.push(safeFailure(file, line, fixtureId, 'BAD_FIXTURE_GROUP'));
  if (!Array.isArray(row.k_ids) || row.k_ids.length === 0) failures.push(safeFailure(file, line, fixtureId, 'EMPTY_K_IDS'));
  if (!Array.isArray(row.target_gate_ids) || row.target_gate_ids.length === 0) failures.push(safeFailure(file, line, fixtureId, 'EMPTY_TARGET_GATE_IDS'));
  if (!Array.isArray(row.expected_safe_reason_codes)) failures.push(safeFailure(file, line, fixtureId, 'BAD_REASON_CODES'));
  if (!Array.isArray(row.must_not_include)) failures.push(safeFailure(file, line, fixtureId, 'BAD_MUST_NOT_INCLUDE'));
  if (!isObject(row.synthetic_input)) failures.push(safeFailure(file, line, fixtureId, 'BAD_SYNTHETIC_INPUT'));
  if (!ALLOWED_EVIDENCE_CLASSES.has(row.input_evidence_class)) failures.push(safeFailure(file, line, fixtureId, 'BAD_EVIDENCE_CLASS'));
  if (context.states && !context.states.has(row.expected_result_state)) failures.push(safeFailure(file, line, fixtureId, 'BAD_EXPECTED_RESULT_STATE'));
  if ('expectedBlocking' in context && row.expected_blocking !== context.expectedBlocking) failures.push(safeFailure(file, line, fixtureId, 'BAD_EXPECTED_BLOCKING'));

  const passLike = row.expected_result_state === 'pass';
  const serialized = JSON.stringify(row).toLowerCase();
  if (passLike) {
    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      if (serialized.includes(forbidden)) failures.push(safeFailure(file, line, fixtureId, `FORBIDDEN_CONTENT_${forbidden.toUpperCase()}`));
    }
  }
  if (passLike && hasTrueFlag(row.synthetic_input, 'game_command_included')) failures.push(safeFailure(file, line, fixtureId, 'PASS_ROW_GAME_COMMAND_INCLUDED'));
  if (passLike && hasTrueFlag(row.synthetic_input, 'raw_chat_included')) failures.push(safeFailure(file, line, fixtureId, 'PASS_ROW_RAW_CHAT_INCLUDED'));
  if (passLike && hasTrueFlag(row.synthetic_input, 'private_id_included')) failures.push(safeFailure(file, line, fixtureId, 'PASS_ROW_PRIVATE_ID_INCLUDED'));
  if (passLike && (hasTrueFlag(row.synthetic_input, 'payment_ranking_included') || hasTrueFlag(row.synthetic_input, 'payment_ranking'))) failures.push(safeFailure(file, line, fixtureId, 'PASS_ROW_PAYMENT_RANKING_INCLUDED'));
  if (passLike && (hasTrueFlag(row.synthetic_input, 'relationship_ranking_included') || hasTrueFlag(row.synthetic_input, 'relationship_ranking'))) failures.push(safeFailure(file, line, fixtureId, 'PASS_ROW_RELATIONSHIP_RANKING_INCLUDED'));
  if (passLike && hasTrueFlag(row.synthetic_input, 'production_readiness_claimed')) failures.push(safeFailure(file, line, fixtureId, 'PASS_ROW_PRODUCTION_READINESS_CLAIMED'));
  if (row.fixture_group === 'completion_review') {
    if (row.synthetic_input.priority1_status !== 'BLOCKED') failures.push(safeFailure(file, line, fixtureId, 'PRIORITY1_NOT_BLOCKED'));
    if (passLike && hasTrueFlag(row.synthetic_input, 'minecraft_plugin_implemented')) failures.push(safeFailure(file, line, fixtureId, 'PASS_ROW_PLUGIN_IMPLEMENTED'));
    if (passLike && hasTrueFlag(row.synthetic_input, 'dataset_audit_runner_implemented')) failures.push(safeFailure(file, line, fixtureId, 'PASS_ROW_DATASET_AUDIT_RUNNER_IMPLEMENTED'));
  }
  return failures;
}

export function validateFixtureSet(fixtureDir = DEFAULT_FIXTURE_DIR) {
  const failures = [];
  const fixtureIds = new Set();
  const kIds = new Set();
  const gates = new Set();
  const fixtureGroups = {};
  let rowsChecked = 0;

  for (const spec of FILE_SPECS) {
    const fullPath = path.join(fixtureDir, spec.file);
    if (!fs.existsSync(fullPath)) {
      failures.push(safeFailure(spec.file, 0, 'unknown', 'MISSING_FIXTURE_FILE'));
      continue;
    }
    const parsed = parseJsonlFile(fullPath, spec.file);
    failures.push(...parsed.failures);
    if (parsed.rows.length < spec.minRows) failures.push(safeFailure(spec.file, 0, 'unknown', 'TOO_FEW_ROWS'));
    fixtureGroups[spec.group] = parsed.rows.length;
    rowsChecked += parsed.rows.length;

    for (const { line, value } of parsed.rows) {
      failures.push(...validateFixtureRow(value, {
        file: spec.file,
        line,
        group: spec.group,
        states: spec.states,
        ...(spec.expectedBlocking === undefined ? {} : { expectedBlocking: spec.expectedBlocking }),
      }));
      if (fixtureIds.has(value.fixture_id)) failures.push(safeFailure(spec.file, line, value.fixture_id, 'DUPLICATE_FIXTURE_ID'));
      fixtureIds.add(value.fixture_id);
      for (const kId of Array.isArray(value.k_ids) ? value.k_ids : []) kIds.add(kId);
      for (const gate of Array.isArray(value.target_gate_ids) ? value.target_gate_ids : []) gates.add(gate);
    }
  }

  for (const kId of REQUIRED_K_IDS) {
    if (!kIds.has(kId)) failures.push(safeFailure('all', 0, 'coverage', `MISSING_K_COVERAGE_${kId}`));
  }
  for (const gate of REQUIRED_GATES) {
    if (!gates.has(gate)) failures.push(safeFailure('all', 0, 'coverage', `MISSING_GATE_COVERAGE_${gate}`));
  }

  return {
    failures,
    filesChecked: FILE_SPECS.length,
    rowsChecked,
    fixtureGroups,
    kCoverage: Object.fromEntries(REQUIRED_K_IDS.map((kId) => [kId, kIds.has(kId)])),
    gateCoverageStatus: REQUIRED_GATES.every((gate) => gates.has(gate)) ? 'pass' : 'fail',
  };
}

export function buildCommunityWorldFixtureValidationReport(options = {}) {
  const result = validateFixtureSet(options.fixtureDir || DEFAULT_FIXTURE_DIR);
  const ok = result.failures.length === 0;
  return {
    ok,
    validator: VALIDATOR,
    schemaVersion: SCHEMA_VERSION,
    ...(ok ? {
      filesChecked: result.filesChecked,
      rowsChecked: result.rowsChecked,
      fixtureGroups: result.fixtureGroups,
      kCoverage: result.kCoverage,
      gateCoverageStatus: result.gateCoverageStatus,
      forbiddenContentStatus: 'pass',
      priority1Status: 'BLOCKED',
      runtimeImplemented: false,
      minecraftRuntimeImplemented: false,
      minecraftPluginImplemented: false,
      datasetAuditRunnerImplemented: false,
      productionReadinessClaimed: false,
      productionGoPerformed: false,
    } : {
      failureCount: result.failures.length,
      failures: result.failures.slice(0, 20),
      rawFixturePrinted: false,
      rawLogsRead: false,
      rawDiffRead: false,
      priority1Status: 'BLOCKED',
    }),
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--fixture-dir' || arg === '--self-test-fixture-dir') {
      options.fixtureDir = argv[index + 1];
      index += 1;
    }
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildCommunityWorldFixtureValidationReport(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
