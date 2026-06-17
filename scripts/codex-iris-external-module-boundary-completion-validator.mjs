#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VALIDATOR = 'iris_external_module_boundary_completion_validator';
const SCHEMA_VERSION = 'iris_external_module_completion_review_fixture_v1';
const DEFAULT_FIXTURE_DIR = 'docs/specs/IRIS_20240425/fixtures/external_modules';
const COMPLETION_FILE = 'iris_external_module_completion_review_fixtures.jsonl';
const REQUIRED_FIELDS = [
  'schema_version',
  'fixture_id',
  'fixture_group',
  'k_ids',
  'target_policy_ids',
  'completion_area',
  'synthetic_input',
  'expected_completion_state',
  'expected_result_state',
  'expected_safe_reason_codes',
  'expected_blocking',
  'must_not_include',
  'trace_id',
];
const REQUIRED_K_IDS = Array.from({ length: 10 }, (_, index) => `K${1021 + index}`);
const ALLOWED_GROUPS = new Set(['completion_review', 'blocked_completion', 'needs_review_completion', 'red_line_completion']);
const REQUIRED_COMPLETION_AREAS = [
  'external_module_safe_summary_contract',
  'character_identity_continuity',
  'realtime_perception_latency',
  'turn_taking_interruption',
  'audience_specific_recap',
  'text_state_adapter',
  'brand_character_oversight',
  'external_module_fixtures',
  'safe_summary_validator',
  'audit_mapping_fixtures',
  'audit_mapping_validator',
  'nonruntime_suite_registration',
  'overall_external_module_boundary',
];
const ALLOWED_COMPLETION_AREAS = new Set([...REQUIRED_COMPLETION_AREAS, 'k1021_k1030_traceability']);
const ALLOWED_COMPLETION_STATES = new Set([
  'not_started',
  'spec_complete',
  'fixture_complete',
  'validator_complete',
  'suite_registered',
  'blocked',
  'needs_review',
  'complete_nonruntime',
]);
const ALLOWED_RESULT_STATES = new Set(['pass', 'blocked', 'needs_review', 'fail']);
const FORBIDDEN_STRINGS = [
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
  'token',
  'secret',
  'oauth',
  'api_key',
  'endpoint',
  'password',
  'connection_string',
  'raw_screen_body',
  'raw_ocr_text',
  'raw_minecraft_chat_text',
  'raw_discord_export',
  'raw_youtube_chat_export',
  'input_action_candidate',
  'approved_game_input_action',
  'production_ready_true',
  'production_go_true',
  'official_minecraft_server',
  'mojang_approved',
  'microsoft_approved',
];
const PASS_FORBIDDEN_TRUE_FLAGS = [
  'runtime_implemented',
  'voxweave_implementation',
  'live2d_implementation',
  'cripto_tip_implementation',
  'dataset_audit_runner_implemented',
  'real_dataset_processing',
  'minecraft_runtime_implemented',
  'minecraft_plugin_implemented',
  'production_readiness_claimed',
  'production_go_performed',
  'owner_authority_created_by_ai',
  'github_approval_review_by_agent',
];

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeFailure(file, line, fixtureId, reasonCode) {
  return { file, line, fixture_id: fixtureId || 'unknown', reason_code: reasonCode };
}

function hasTrueFlag(value, flagName) {
  if (!isObject(value)) return false;
  if (value[flagName] === true) return true;
  return Object.values(value).some((item) => isObject(item) && hasTrueFlag(item, flagName));
}

function parseJsonlFile(filePath, displayFile = path.basename(filePath)) {
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

function validateRow(row, context) {
  const failures = [];
  const file = context.file;
  const line = context.line;
  const id = row?.fixture_id;
  if (!isObject(row)) return [safeFailure(file, line, id, 'ROW_NOT_OBJECT')];
  for (const field of REQUIRED_FIELDS) {
    if (!(field in row)) failures.push(safeFailure(file, line, id, `MISSING_REQUIRED_FIELD_${field}`));
  }
  if (failures.length) return failures;
  if (row.schema_version !== SCHEMA_VERSION) failures.push(safeFailure(file, line, id, 'BAD_SCHEMA_VERSION'));
  if (!ALLOWED_GROUPS.has(row.fixture_group)) failures.push(safeFailure(file, line, id, 'BAD_FIXTURE_GROUP'));
  if (!ALLOWED_COMPLETION_AREAS.has(row.completion_area)) failures.push(safeFailure(file, line, id, 'BAD_COMPLETION_AREA'));
  if (!ALLOWED_COMPLETION_STATES.has(row.expected_completion_state)) failures.push(safeFailure(file, line, id, 'BAD_COMPLETION_STATE'));
  if (!ALLOWED_RESULT_STATES.has(row.expected_result_state)) failures.push(safeFailure(file, line, id, 'BAD_RESULT_STATE'));
  if (!Array.isArray(row.k_ids) || row.k_ids.length === 0) failures.push(safeFailure(file, line, id, 'EMPTY_K_IDS'));
  if (!Array.isArray(row.target_policy_ids) || row.target_policy_ids.length === 0) failures.push(safeFailure(file, line, id, 'EMPTY_TARGET_POLICY_IDS'));
  if (!Array.isArray(row.expected_safe_reason_codes)) failures.push(safeFailure(file, line, id, 'BAD_REASON_CODES'));
  if (!Array.isArray(row.must_not_include)) failures.push(safeFailure(file, line, id, 'BAD_MUST_NOT_INCLUDE'));
  if (!isObject(row.synthetic_input)) failures.push(safeFailure(file, line, id, 'BAD_SYNTHETIC_INPUT'));

  const serialized = JSON.stringify(row).toLowerCase();
  for (const forbidden of FORBIDDEN_STRINGS) {
    if (serialized.includes(forbidden)) failures.push(safeFailure(file, line, id, `FORBIDDEN_STRING_${forbidden.toUpperCase()}`));
  }
  if (row.expected_result_state === 'pass') {
    for (const flag of PASS_FORBIDDEN_TRUE_FLAGS) {
      if (hasTrueFlag(row.synthetic_input, flag)) failures.push(safeFailure(file, line, id, `PASS_ROW_FORBIDDEN_TRUE_${flag.toUpperCase()}`));
    }
    if (row.synthetic_input.priority1_status !== 'BLOCKED') failures.push(safeFailure(file, line, id, 'PASS_ROW_PRIORITY1_NOT_BLOCKED'));
    if (row.expected_blocking !== false) failures.push(safeFailure(file, line, id, 'PASS_ROW_BLOCKING'));
  }
  if (id?.includes('runtime_claim_rejected') && !['fail', 'blocked'].includes(row.expected_result_state)) failures.push(safeFailure(file, line, id, 'RUNTIME_CLAIM_NOT_REJECTED'));
  if (id?.includes('priority1_resolved_rejected') && !['fail', 'blocked'].includes(row.expected_result_state)) failures.push(safeFailure(file, line, id, 'PRIORITY1_RESOLVED_NOT_REJECTED'));
  if (id?.includes('raw_payload_leak_rejected') && row.expected_result_state !== 'fail') failures.push(safeFailure(file, line, id, 'RAW_PAYLOAD_LEAK_NOT_FAILED'));
  if (id?.includes('owner_authority_created_rejected') && row.expected_result_state !== 'fail') failures.push(safeFailure(file, line, id, 'OWNER_AUTHORITY_NOT_FAILED'));
  if (id?.includes('production_go_rejected') && row.expected_result_state !== 'fail') failures.push(safeFailure(file, line, id, 'PRODUCTION_GO_NOT_FAILED'));
  return failures;
}

export function buildExternalModuleBoundaryCompletionValidationReport(options = {}) {
  const fixtureDir = options.fixtureDir || DEFAULT_FIXTURE_DIR;
  const file = options.completionFile || COMPLETION_FILE;
  const fullPath = path.join(fixtureDir, file);
  const failures = [];
  if (!fs.existsSync(fullPath)) failures.push(safeFailure(file, 0, 'unknown', 'MISSING_COMPLETION_FILE'));
  const parsed = fs.existsSync(fullPath) ? parseJsonlFile(fullPath, file) : { rows: [], failures: [] };
  failures.push(...parsed.failures);
  const ids = new Set();
  const kIds = new Set();
  const areas = new Set();
  let completionStateFailed = false;
  let forbiddenFailed = false;
  for (const { line, value } of parsed.rows) {
    const rowFailures = validateRow(value, { file, line });
    for (const failure of rowFailures) {
      if (failure.reason_code.startsWith('FORBIDDEN_STRING_')) forbiddenFailed = true;
      if (failure.reason_code.includes('PASS_ROW') || failure.reason_code.includes('NOT_REJECTED') || failure.reason_code.includes('NOT_FAILED')) completionStateFailed = true;
    }
    failures.push(...rowFailures);
    if (ids.has(value.fixture_id)) failures.push(safeFailure(file, line, value.fixture_id, 'DUPLICATE_FIXTURE_ID'));
    ids.add(value.fixture_id);
    for (const kId of Array.isArray(value.k_ids) ? value.k_ids : []) kIds.add(kId);
    if (value.completion_area) areas.add(value.completion_area);
  }
  if (parsed.rows.length < 28) failures.push(safeFailure(file, 0, 'coverage', 'TOO_FEW_ROWS'));
  for (const kId of REQUIRED_K_IDS) if (!kIds.has(kId)) failures.push(safeFailure(file, 0, 'coverage', `MISSING_K_COVERAGE_${kId}`));
  for (const area of REQUIRED_COMPLETION_AREAS) if (!areas.has(area)) failures.push(safeFailure(file, 0, 'coverage', `MISSING_COMPLETION_AREA_${area}`));
  const requiredIds = [
    'ext_completion_runtime_claim_rejected',
    'ext_completion_priority1_resolved_rejected',
    'ext_completion_raw_payload_leak_rejected',
    'ext_completion_owner_authority_created_rejected',
    'ext_completion_production_go_rejected',
    'ext_completion_voxweave_not_implemented_pass',
    'ext_completion_live2d_not_implemented_pass',
    'ext_completion_cripto_tip_not_implemented_pass',
  ];
  for (const id of requiredIds) if (!ids.has(id)) failures.push(safeFailure(file, 0, id, 'MISSING_REQUIRED_COMPLETION_CASE'));
  const ok = failures.length === 0;
  return {
    ok,
    validator: VALIDATOR,
    schemaVersion: SCHEMA_VERSION,
    rowsChecked: parsed.rows.length,
    kCoverageStatus: REQUIRED_K_IDS.every((kId) => kIds.has(kId)) ? 'pass' : 'fail',
    completionAreaCoverageStatus: REQUIRED_COMPLETION_AREAS.every((area) => areas.has(area)) ? 'pass' : 'fail',
    completionStateSemanticsStatus: completionStateFailed ? 'fail' : 'pass',
    forbiddenContentStatus: forbiddenFailed ? 'fail' : 'pass',
    priority1Status: 'BLOCKED',
    runtimeImplemented: false,
    voxweaveImplementation: false,
    live2dImplementation: false,
    criptoTipImplementation: false,
    datasetAuditRunnerImplemented: false,
    realDatasetProcessing: false,
    minecraftRuntimeImplemented: false,
    minecraftPluginImplemented: false,
    productionReadinessClaimed: false,
    productionGoPerformed: false,
    ...(ok ? {} : {
      failureCount: failures.length,
      failures: failures.slice(0, 20),
      rawRowsPrinted: false,
      rawLogsRead: false,
      rawDiffRead: false,
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
  const report = buildExternalModuleBoundaryCompletionValidationReport(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
