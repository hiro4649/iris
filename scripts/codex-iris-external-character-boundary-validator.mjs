#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VALIDATOR = 'iris_external_character_boundary_validator';
const SCHEMA_VERSION = 'iris_external_character_fixture_v1';
const DEFAULT_FIXTURE_DIR = 'docs/specs/IRIS_20240425/fixtures/external_character';
const REQUIRED_FIELDS = [
  'schema_version',
  'fixture_id',
  'fixture_group',
  'k_ids',
  'target_policy_ids',
  'input_evidence_class',
  'synthetic_input',
  'expected_result_state',
  'expected_safe_reason_codes',
  'expected_blocking',
  'must_not_include',
  'trace_id',
];
const REQUIRED_K_IDS = Array.from({ length: 10 }, (_, index) => `K${1021 + index}`);
const ALLOWED_EVIDENCE_CLASSES = new Set(['synthetic_fixture', 'fixture_spec', 'spec_only']);
const FILE_SPECS = [
  {
    file: 'iris_external_character_positive_fixtures.jsonl',
    group: 'positive',
    minRows: 9,
    states: new Set(['pass']),
    expectedBlocking: false,
  },
  {
    file: 'iris_external_character_negative_fixtures.jsonl',
    group: 'negative',
    minRows: 10,
    states: new Set(['fail']),
    expectedBlocking: true,
  },
  {
    file: 'iris_external_character_boundary_fixtures.jsonl',
    group: 'boundary',
    minRows: 8,
    states: new Set(['pass', 'blocked', 'needs_review', 'not_applicable']),
  },
  {
    file: 'iris_external_character_redline_fixtures.jsonl',
    group: 'red_line',
    minRows: 10,
    states: new Set(['fail']),
    expectedBlocking: true,
  },
];
const REQUIRED_MUST_NOT_INCLUDE = [
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
const FORBIDDEN_SENTINELS = [
  'raw_audio_body',
  'raw_phoneme_debug',
  'voice_model_path_value',
  'voice_dataset_path_value',
  'live2d_model_path_value',
  'live2d_motion_path_value',
  'renderer_endpoint_value',
  'raw_payment_record_value',
  'wallet_address_value',
  'transaction_hash_value',
  'payer_private_id_value',
  'private_viewer_id_value',
  'api_key',
  'raw_screen_body',
  'raw_minecraft_chat_text',
  'input_action_candidate',
  'approved_game_input_action',
  'production_ready_true',
  'production_go_true',
  'official_minecraft_server',
  'mojang_approved',
  'microsoft_approved',
];
const REJECT_TRUE_FLAGS = [
  'raw_audio_included',
  'raw_voice_sample_included',
  'voice_model_path_included',
  'raw_model_path_included',
  'raw_motion_file_included',
  'renderer_payload_included',
  'raw_payment_record_included',
  'wallet_or_transaction_value_included',
  'private_payer_id_included',
  'token_included',
  'endpoint_included',
  'private_viewer_id_included',
  'raw_chat_included',
  'raw_screen_included',
  'relationship_delta_from_payment',
  'game_action_candidate_created',
  'official_affiliation_claimed',
  'minecraft_compliance_claimed',
  'legal_compliance_claimed',
  'owner_authority_created_by_ai',
  'merge_or_release_authorized_by_ai',
  'production_readiness_claimed',
  'production_go_performed',
  'candidate_executed',
  'adapter_boundary_crossed',
  'core_received_raw_payload',
  'input_action_candidate_reached_adapter',
  'dependency_pressure_detected',
  'relationship_exclusivity_claimed',
  'payment_pressure_detected',
  'payment_increases_attention',
  'payment_ranking_included',
];

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeFailure(file, line, fixtureId, reasonCode) {
  return {
    file,
    line,
    fixture_id: fixtureId || 'unknown',
    reason_code: reasonCode,
  };
}

function hasTrueFlag(value, flagName) {
  if (!isObject(value)) return false;
  if (value[flagName] === true) return true;
  return Object.values(value).some((item) => isObject(item) && hasTrueFlag(item, flagName));
}

function syntheticText(row) {
  return JSON.stringify(row?.synthetic_input || {}).toLowerCase();
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
  if (!Array.isArray(row.target_policy_ids) || row.target_policy_ids.length === 0) failures.push(safeFailure(file, line, fixtureId, 'EMPTY_TARGET_POLICY_IDS'));
  if (!Array.isArray(row.expected_safe_reason_codes)) failures.push(safeFailure(file, line, fixtureId, 'BAD_REASON_CODES'));
  if (!Array.isArray(row.must_not_include)) failures.push(safeFailure(file, line, fixtureId, 'BAD_MUST_NOT_INCLUDE'));
  if (!isObject(row.synthetic_input)) failures.push(safeFailure(file, line, fixtureId, 'BAD_SYNTHETIC_INPUT'));
  if (!ALLOWED_EVIDENCE_CLASSES.has(row.input_evidence_class)) failures.push(safeFailure(file, line, fixtureId, 'BAD_EVIDENCE_CLASS'));
  if (context.states && !context.states.has(row.expected_result_state)) failures.push(safeFailure(file, line, fixtureId, 'BAD_EXPECTED_RESULT_STATE'));
  if ('expectedBlocking' in context && row.expected_blocking !== context.expectedBlocking) failures.push(safeFailure(file, line, fixtureId, 'BAD_EXPECTED_BLOCKING'));
  for (const label of REQUIRED_MUST_NOT_INCLUDE) {
    if (!row.must_not_include.includes(label)) failures.push(safeFailure(file, line, fixtureId, `MISSING_MUST_NOT_INCLUDE_${label.toUpperCase()}`));
  }

  const text = syntheticText(row);
  for (const sentinel of FORBIDDEN_SENTINELS) {
    if (text.includes(sentinel)) failures.push(safeFailure(file, line, fixtureId, `FORBIDDEN_SENTINEL_${sentinel.toUpperCase()}`));
  }
  if (row.expected_result_state !== 'fail') {
    for (const flag of REJECT_TRUE_FLAGS) {
      if (hasTrueFlag(row.synthetic_input, flag)) failures.push(safeFailure(file, line, fixtureId, `REJECTED_TRUE_FLAG_${flag.toUpperCase()}`));
    }
    if (hasTrueFlag(row.synthetic_input, 'runtime_implemented')) failures.push(safeFailure(file, line, fixtureId, 'RUNTIME_IMPLEMENTED'));
    if (hasTrueFlag(row.synthetic_input, 'VOXWEAVEImplementation')) failures.push(safeFailure(file, line, fixtureId, 'VOXWEAVE_IMPLEMENTED'));
    if (hasTrueFlag(row.synthetic_input, 'LIVE2DImplementation')) failures.push(safeFailure(file, line, fixtureId, 'LIVE2D_IMPLEMENTED'));
    if (hasTrueFlag(row.synthetic_input, 'CRIPTOTIPImplementation')) failures.push(safeFailure(file, line, fixtureId, 'CRIPTOTIP_IMPLEMENTED'));
    if (hasTrueFlag(row.synthetic_input, 'dataset_audit_runner_implemented')) failures.push(safeFailure(file, line, fixtureId, 'DATASET_AUDIT_RUNNER_IMPLEMENTED'));
    if (hasTrueFlag(row.synthetic_input, 'minecraft_runtime_implemented')) failures.push(safeFailure(file, line, fixtureId, 'MINECRAFT_RUNTIME_IMPLEMENTED'));
    if (hasTrueFlag(row.synthetic_input, 'minecraft_plugin_implemented')) failures.push(safeFailure(file, line, fixtureId, 'MINECRAFT_PLUGIN_IMPLEMENTED'));
  }

  return failures;
}

export function validateFixtureSet(fixtureDir = DEFAULT_FIXTURE_DIR) {
  const failures = [];
  const fixtureIds = new Set();
  const kIds = new Set();
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
    }
  }

  for (const kId of REQUIRED_K_IDS) {
    if (!kIds.has(kId)) failures.push(safeFailure('all', 0, 'coverage', `MISSING_K_COVERAGE_${kId}`));
  }

  return {
    failures,
    filesChecked: FILE_SPECS.length,
    rowsChecked,
    fixtureGroups,
    kCoverage: Object.fromEntries(REQUIRED_K_IDS.map((kId) => [kId, kIds.has(kId)])),
    kCoverageStatus: REQUIRED_K_IDS.every((kId) => kIds.has(kId)) ? 'pass' : 'fail',
  };
}

export function buildExternalCharacterBoundaryValidationReport(options = {}) {
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
      kCoverageStatus: result.kCoverageStatus,
      forbiddenContentStatus: 'pass',
      priority1Status: 'BLOCKED',
      runtimeImplemented: false,
      VOXWEAVEImplementation: false,
      LIVE2DImplementation: false,
      CRIPTOTIPImplementation: false,
      datasetAuditRunnerImplemented: false,
      minecraftRuntimeImplemented: false,
      minecraftPluginImplemented: false,
      productionReadinessClaimed: false,
      productionGoPerformed: false,
    } : {
      failureCount: result.failures.length,
      failures: result.failures.slice(0, 50),
      filesChecked: result.filesChecked,
      rowsChecked: result.rowsChecked,
      kCoverageStatus: result.kCoverageStatus,
      forbiddenContentStatus: 'fail',
      priority1Status: 'BLOCKED',
      runtimeImplemented: false,
      VOXWEAVEImplementation: false,
      LIVE2DImplementation: false,
      CRIPTOTIPImplementation: false,
      datasetAuditRunnerImplemented: false,
      minecraftRuntimeImplemented: false,
      minecraftPluginImplemented: false,
      productionReadinessClaimed: false,
      productionGoPerformed: false,
    }),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = buildExternalCharacterBoundaryValidationReport({ fixtureDir: process.argv[2] || DEFAULT_FIXTURE_DIR });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
