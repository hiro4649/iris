#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VALIDATOR = 'iris_external_module_audit_mapping_validator';
const SCHEMA_VERSION = 'iris_external_module_audit_mapping_v1';
const SOURCE_SCHEMA_VERSION = 'iris_external_module_fixture_v1';
const DEFAULT_FIXTURE_DIR = 'docs/specs/IRIS_20240425/fixtures/external_modules';
const MAPPING_FILE = 'iris_external_module_audit_mapping_fixtures.jsonl';
const SOURCE_FILES = [
  'iris_external_module_safe_summary_positive_fixtures.jsonl',
  'iris_external_module_safe_summary_negative_fixtures.jsonl',
  'iris_external_module_safe_summary_boundary_fixtures.jsonl',
  'iris_external_module_safe_summary_redline_fixtures.jsonl',
];
const REQUIRED_FIELDS = [
  'schema_version',
  'mapping_id',
  'source_fixture_id',
  'source_fixture_group',
  'k_ids',
  'target_policy_ids',
  'module_name',
  'audit_auditor',
  'expected_verdict',
  'expected_severity',
  'expected_issue_codes',
  'expected_actions',
  'classification_only',
  'expected_blocking',
  'safe_rationale',
  'must_not_include',
  'trace_id',
];
const REQUIRED_ACTIONS = ['exclude_from_train', 'exclude_from_eval', 'human_review', 'quarantine'];
const REQUIRED_K_IDS = Array.from({ length: 10 }, (_, index) => `K${1021 + index}`);
const ALLOWED_MODULES = new Set(['VOXWEAVE', 'LIVE2D', 'CRIPTO-TIP', 'COMMUNITY_WORLD_ADAPTER', 'SHARED_EXTERNAL_ENVELOPE']);
const REQUIRED_AUDITORS = [
  'privacy_or_confidential',
  'adapter_boundary_violation',
  'production_readiness_sweetening',
  'memory_privacy_boundary',
  'parasocial_dependency_risk',
  'monetization_pressure_risk',
  'safety_risk',
  'persona_consistency',
  'candidate_execution_boundary',
  'format_violation',
  'task_definition_mismatch',
];
const ALLOWED_AUDITORS = new Set(REQUIRED_AUDITORS);
const ALLOWED_VERDICTS = new Set(['pass', 'reject', 'needs_review']);
const ALLOWED_SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);
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
  'oauth',
  'api_key',
  'password',
  'connection_string',
  'raw_screen_body',
  'raw_ocr_text',
  'raw_minecraft_chat_text',
  'raw_discord_export',
  'raw_youtube_chat_export',
  'production_ready_true',
  'production_go_true',
  'mojang_approved',
  'microsoft_approved',
];
const REDLINE_PASS_ISSUE_CODES = new Set([
  'CAND_EXECUTABLE_FIELD_PRESENT',
  'ADP_CANDIDATE_SCHEMA_ACCEPTED',
  'READY_FIXTURE_AS_PRODUCTION',
  'MEM_PRIVATE_DETAIL_EXPOSED',
  'PARA_EXCLUSIVE_RELATIONSHIP_CLAIM',
  'MON_PAYMENT_PRESSURE',
  'PRV_SECRET_EXPOSED',
  'SAF_DIRECT_SIDE_EFFECT_EXECUTION',
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeFailure(file, line, mappingId, reasonCode) {
  return { file, line, mapping_id: mappingId || 'unknown', reason_code: reasonCode };
}

function parseJsonlFile(filePath, displayFile = path.basename(filePath), idField = 'mapping_id') {
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
  return { rows, failures, idField };
}

function loadSourceFixtures(fixtureDir) {
  const failures = [];
  const sources = new Map();
  let sourceFixtureRowsChecked = 0;
  for (const file of SOURCE_FILES) {
    const fullPath = path.join(fixtureDir, file);
    if (!fs.existsSync(fullPath)) {
      failures.push(safeFailure(file, 0, 'unknown', 'MISSING_SOURCE_FIXTURE_FILE'));
      continue;
    }
    const parsed = parseJsonlFile(fullPath, file, 'fixture_id');
    failures.push(...parsed.failures);
    for (const { line, value } of parsed.rows) {
      sourceFixtureRowsChecked += 1;
      if (value.schema_version !== SOURCE_SCHEMA_VERSION) failures.push(safeFailure(file, line, value.fixture_id, 'BAD_SOURCE_SCHEMA_VERSION'));
      if (sources.has(value.fixture_id)) failures.push(safeFailure(file, line, value.fixture_id, 'DUPLICATE_SOURCE_FIXTURE_ID'));
      sources.set(value.fixture_id, value);
    }
  }
  return { failures, sources, sourceFixtureRowsChecked };
}

function scanForbiddenValues(value, onForbidden) {
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    for (const forbidden of FORBIDDEN_STRINGS) {
      if (lowered.includes(forbidden)) onForbidden(forbidden);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) scanForbiddenValues(item, onForbidden);
  } else if (isObject(value)) {
    for (const item of Object.values(value)) scanForbiddenValues(item, onForbidden);
  }
}

function validateCrossMapping(row, source, context) {
  const failures = [];
  const file = context.file;
  const line = context.line;
  const id = row.mapping_id;
  const sourceId = row.source_fixture_id;
  const issueCodes = new Set(Array.isArray(row.expected_issue_codes) ? row.expected_issue_codes : []);

  if (row.expected_verdict === 'pass') {
    for (const code of issueCodes) {
      if (REDLINE_PASS_ISSUE_CODES.has(code)) failures.push(safeFailure(file, line, id, 'PASS_MAPPING_WITH_REDLINE_ISSUE_CODE'));
    }
    if (row.expected_blocking !== false) failures.push(safeFailure(file, line, id, 'PASS_MAPPING_BLOCKING'));
  }
  if (row.expected_verdict === 'reject' && row.expected_blocking !== true) failures.push(safeFailure(file, line, id, 'REJECT_MAPPING_NOT_BLOCKING'));
  if (sourceId.includes('raw_audio') || sourceId.includes('voice_model_path')) {
    if (row.audit_auditor !== 'privacy_or_confidential' || row.expected_verdict !== 'reject') failures.push(safeFailure(file, line, id, 'RAW_AUDIO_OR_VOICE_MODEL_WRONG_MAPPING'));
  }
  if (sourceId.includes('live2d_model_path') && row.audit_auditor !== 'privacy_or_confidential') failures.push(safeFailure(file, line, id, 'LIVE2D_PATH_WRONG_AUDITOR'));
  if (sourceId.includes('renderer_payload') && row.audit_auditor !== 'adapter_boundary_violation') failures.push(safeFailure(file, line, id, 'RENDERER_PAYLOAD_WRONG_AUDITOR'));
  if (sourceId.includes('raw_payment_record') || sourceId.includes('wallet_address') || sourceId.includes('transaction_hash')) {
    if (row.audit_auditor !== 'privacy_or_confidential' || row.expected_verdict !== 'reject') failures.push(safeFailure(file, line, id, 'PAYMENT_PRIVATE_DATA_WRONG_MAPPING'));
  }
  if (sourceId.includes('payment_relationship_delta') || sourceId.includes('monetization_pressure')) {
    if (row.audit_auditor !== 'monetization_pressure_risk' || row.expected_verdict !== 'reject') failures.push(safeFailure(file, line, id, 'PAYMENT_RELATIONSHIP_WRONG_MAPPING'));
  }
  if (sourceId.includes('stale_observation_memory') && row.audit_auditor !== 'memory_privacy_boundary') failures.push(safeFailure(file, line, id, 'STALE_MEMORY_WRONG_AUDITOR'));
  if (sourceId.includes('stale_observation_game_action') && row.audit_auditor !== 'candidate_execution_boundary') failures.push(safeFailure(file, line, id, 'STALE_ACTION_WRONG_AUDITOR'));
  if (sourceId.includes('ai_owner_authority') && row.audit_auditor !== 'safety_risk') failures.push(safeFailure(file, line, id, 'OWNER_AUTHORITY_WRONG_AUDITOR'));
  if (sourceId.includes('production_readiness') && row.audit_auditor !== 'production_readiness_sweetening') failures.push(safeFailure(file, line, id, 'PRODUCTION_READINESS_WRONG_AUDITOR'));
  if (sourceId.includes('official_minecraft_claim') && row.audit_auditor !== 'persona_consistency') failures.push(safeFailure(file, line, id, 'OFFICIAL_AFFILIATION_WRONG_AUDITOR'));
  if (sourceId.includes('identity_drift_high') && row.audit_auditor !== 'persona_consistency') failures.push(safeFailure(file, line, id, 'IDENTITY_DRIFT_WRONG_AUDITOR'));
  if (sourceId.includes('license_status_unknown') && !['safety_risk', 'privacy_or_confidential'].includes(row.audit_auditor)) failures.push(safeFailure(file, line, id, 'LICENSE_UNKNOWN_WRONG_AUDITOR'));
  if (sourceId.includes('newcomer_recap') && row.audit_auditor !== 'persona_consistency') failures.push(safeFailure(file, line, id, 'NEWCOMER_RECAP_WRONG_AUDITOR'));
  if (sourceId.includes('raw_screen_truth') && row.audit_auditor !== 'task_definition_mismatch') failures.push(safeFailure(file, line, id, 'RAW_SCREEN_TRUTH_WRONG_AUDITOR'));
  if (source?.expected_result_state === 'pass' && row.expected_verdict !== 'pass') failures.push(safeFailure(file, line, id, 'POSITIVE_SOURCE_NOT_PASS_MAPPING'));
  return failures;
}

function validateMappingRow(row, context) {
  const failures = [];
  const file = context.file;
  const line = context.line;
  const id = row?.mapping_id;
  if (!isObject(row)) return [safeFailure(file, line, id, 'ROW_NOT_OBJECT')];
  for (const field of REQUIRED_FIELDS) {
    if (!(field in row)) failures.push(safeFailure(file, line, id, `MISSING_REQUIRED_FIELD_${field}`));
  }
  if (failures.length) return failures;

  if (row.schema_version !== SCHEMA_VERSION) failures.push(safeFailure(file, line, id, 'BAD_SCHEMA_VERSION'));
  if (!ALLOWED_MODULES.has(row.module_name)) failures.push(safeFailure(file, line, id, 'BAD_MODULE_NAME'));
  if (!ALLOWED_AUDITORS.has(row.audit_auditor)) failures.push(safeFailure(file, line, id, 'BAD_AUDITOR'));
  if (!ALLOWED_VERDICTS.has(row.expected_verdict)) failures.push(safeFailure(file, line, id, 'BAD_EXPECTED_VERDICT'));
  if (!ALLOWED_SEVERITIES.has(row.expected_severity)) failures.push(safeFailure(file, line, id, 'BAD_EXPECTED_SEVERITY'));
  if (row.classification_only !== true) failures.push(safeFailure(file, line, id, 'CLASSIFICATION_ONLY_NOT_TRUE'));
  if (!Array.isArray(row.k_ids) || row.k_ids.length === 0) failures.push(safeFailure(file, line, id, 'EMPTY_K_IDS'));
  if (!Array.isArray(row.target_policy_ids) || row.target_policy_ids.length === 0) failures.push(safeFailure(file, line, id, 'EMPTY_TARGET_POLICY_IDS'));
  if (!Array.isArray(row.expected_issue_codes)) failures.push(safeFailure(file, line, id, 'BAD_EXPECTED_ISSUE_CODES'));
  if (!isObject(row.expected_actions)) failures.push(safeFailure(file, line, id, 'BAD_EXPECTED_ACTIONS'));
  for (const action of REQUIRED_ACTIONS) {
    if (typeof row.expected_actions?.[action] !== 'boolean') failures.push(safeFailure(file, line, id, `BAD_EXPECTED_ACTION_${action}`));
  }
  if (typeof row.safe_rationale !== 'string' || row.safe_rationale.length < 8 || row.safe_rationale.length > 160) failures.push(safeFailure(file, line, id, 'BAD_SAFE_RATIONALE'));
  if (!Array.isArray(row.must_not_include)) failures.push(safeFailure(file, line, id, 'BAD_MUST_NOT_INCLUDE'));
  scanForbiddenValues({ safe_rationale: row.safe_rationale, expected_actions: row.expected_actions }, (forbidden) => {
    failures.push(safeFailure(file, line, id, `FORBIDDEN_STRING_${forbidden.toUpperCase()}`));
  });
  return failures;
}

export function buildExternalModuleAuditMappingValidationReport(options = {}) {
  const fixtureDir = options.fixtureDir || DEFAULT_FIXTURE_DIR;
  const mappingFile = options.mappingFile || MAPPING_FILE;
  const sourceLoaded = loadSourceFixtures(fixtureDir);
  const failures = [...sourceLoaded.failures];
  const fullMappingPath = path.join(fixtureDir, mappingFile);
  if (!fs.existsSync(fullMappingPath)) failures.push(safeFailure(mappingFile, 0, 'unknown', 'MISSING_MAPPING_FILE'));
  const parsed = fs.existsSync(fullMappingPath) ? parseJsonlFile(fullMappingPath, mappingFile) : { rows: [], failures: [] };
  failures.push(...parsed.failures);

  const mappingIds = new Set();
  const kIds = new Set();
  const auditors = new Set();
  const modules = new Set();
  let classificationOnlyFailed = false;
  let crossMappingFailed = false;
  let forbiddenFailed = false;
  let sourceRefFailed = false;

  for (const { line, value } of parsed.rows) {
    const rowFailures = validateMappingRow(value, { file: mappingFile, line });
    for (const failure of rowFailures) {
      if (failure.reason_code === 'CLASSIFICATION_ONLY_NOT_TRUE') classificationOnlyFailed = true;
      if (failure.reason_code.startsWith('FORBIDDEN_STRING_')) forbiddenFailed = true;
    }
    failures.push(...rowFailures);
    if (mappingIds.has(value.mapping_id)) failures.push(safeFailure(mappingFile, line, value.mapping_id, 'DUPLICATE_MAPPING_ID'));
    mappingIds.add(value.mapping_id);
    const source = sourceLoaded.sources.get(value.source_fixture_id);
    if (!source) {
      sourceRefFailed = true;
      failures.push(safeFailure(mappingFile, line, value.mapping_id, 'UNKNOWN_SOURCE_FIXTURE'));
    } else {
      if (source.fixture_group !== value.source_fixture_group) {
        sourceRefFailed = true;
        failures.push(safeFailure(mappingFile, line, value.mapping_id, 'SOURCE_GROUP_MISMATCH'));
      }
      const crossFailures = validateCrossMapping(value, source, { file: mappingFile, line });
      if (crossFailures.length) crossMappingFailed = true;
      failures.push(...crossFailures);
    }
    for (const kId of Array.isArray(value.k_ids) ? value.k_ids : []) kIds.add(kId);
    if (value.audit_auditor) auditors.add(value.audit_auditor);
    if (value.module_name) modules.add(value.module_name);
  }
  for (const kId of REQUIRED_K_IDS) if (!kIds.has(kId)) failures.push(safeFailure(mappingFile, 0, 'coverage', `MISSING_K_COVERAGE_${kId}`));
  for (const auditor of REQUIRED_AUDITORS) if (!auditors.has(auditor)) failures.push(safeFailure(mappingFile, 0, 'coverage', `MISSING_AUDITOR_COVERAGE_${auditor}`));
  for (const moduleName of ALLOWED_MODULES) if (!modules.has(moduleName)) failures.push(safeFailure(mappingFile, 0, 'coverage', `MISSING_MODULE_COVERAGE_${moduleName}`));

  const kCoverageStatus = REQUIRED_K_IDS.every((kId) => kIds.has(kId)) ? 'pass' : 'fail';
  const auditorCoverageStatus = REQUIRED_AUDITORS.every((auditor) => auditors.has(auditor)) ? 'pass' : 'fail';
  const moduleCoverageStatus = [...ALLOWED_MODULES].every((moduleName) => modules.has(moduleName)) ? 'pass' : 'fail';
  const ok = failures.length === 0;
  return {
    ok,
    validator: VALIDATOR,
    schemaVersion: SCHEMA_VERSION,
    mappingRowsChecked: parsed.rows.length,
    sourceFixtureRowsChecked: sourceLoaded.sourceFixtureRowsChecked,
    auditorCoverageStatus,
    kCoverageStatus,
    moduleCoverageStatus,
    sourceFixtureReferenceStatus: sourceRefFailed ? 'fail' : 'pass',
    classificationOnlyStatus: classificationOnlyFailed ? 'fail' : 'pass',
    crossMappingStatus: crossMappingFailed ? 'fail' : 'pass',
    forbiddenContentStatus: forbiddenFailed ? 'fail' : 'pass',
    priority1Status: 'BLOCKED',
    datasetAuditRunnerImplemented: false,
    realDatasetProcessing: false,
    runtimeImplemented: false,
    voxweaveImplementation: false,
    live2dImplementation: false,
    criptoTipImplementation: false,
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
  const report = buildExternalModuleAuditMappingValidationReport(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
