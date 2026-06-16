#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VALIDATOR = 'iris_external_module_safe_summary_validator';
const SCHEMA_VERSION = 'iris_external_module_fixture_v1';
const DEFAULT_FIXTURE_DIR = 'docs/specs/IRIS_20240425/fixtures/external_modules';
const REQUIRED_FIELDS = [
  'schema_version',
  'fixture_id',
  'fixture_group',
  'k_ids',
  'target_policy_ids',
  'module_name',
  'summary_kind',
  'input_evidence_class',
  'synthetic_input',
  'expected_result_state',
  'expected_safe_reason_codes',
  'expected_blocking',
  'must_not_include',
  'trace_id',
];
const REQUIRED_K_IDS = Array.from({ length: 10 }, (_, index) => `K${1021 + index}`);
const REQUIRED_POLICIES = [
  'IRIS_EXTERNAL_MODULE_SAFE_SUMMARY_CONTRACT',
  'IRIS_CHARACTER_IDENTITY_CONTINUITY_POLICY',
  'IRIS_REALTIME_PERCEPTION_LATENCY_POLICY',
  'IRIS_TURN_TAKING_AND_INTERRUPTION_POLICY',
  'IRIS_AUDIENCE_SPECIFIC_SAFE_RECAP_POLICY',
  'IRIS_COMMUNITY_WORLD_TEXT_STATE_ADAPTER_POLICY',
  'IRIS_BRAND_CHARACTER_OVERSIGHT_POLICY',
  'IRIS_EXTERNAL_MODULE_SAFE_SUMMARY_VALIDATOR_DESIGN',
];
const ALLOWED_MODULES = new Set([
  'VOXWEAVE',
  'LIVE2D',
  'CRIPTO-TIP',
  'COMMUNITY_WORLD_ADAPTER',
  'SHARED_EXTERNAL_ENVELOPE',
]);
const FILE_SPECS = [
  {
    file: 'iris_external_module_safe_summary_positive_fixtures.jsonl',
    group: 'positive',
    minRows: 12,
    states: new Set(['pass']),
    expectedBlocking: false,
  },
  {
    file: 'iris_external_module_safe_summary_negative_fixtures.jsonl',
    group: 'negative',
    minRows: 18,
    states: new Set(['fail']),
    expectedBlocking: true,
  },
  {
    file: 'iris_external_module_safe_summary_boundary_fixtures.jsonl',
    group: 'boundary',
    minRows: 10,
    states: new Set(['pass', 'blocked', 'needs_review', 'not_applicable']),
  },
  {
    file: 'iris_external_module_safe_summary_redline_fixtures.jsonl',
    group: 'red_line',
    minRows: 10,
    states: new Set(['fail']),
    expectedBlocking: true,
  },
];
const FORBIDDEN_STRING_VALUES = [
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
const MODULE_REJECT_FLAGS = {
  VOXWEAVE: [
    'raw_audio_included',
    'raw_phoneme_debug_included',
    'voice_model_path_included',
    'voice_dataset_path_included',
    'endpoint_included',
    'token_included',
  ],
  LIVE2D: [
    'raw_live2d_model_path_included',
    'raw_motion_file_included',
    'raw_renderer_payload_included',
    'private_reference_image_included',
    'endpoint_included',
    'token_included',
  ],
  'CRIPTO-TIP': [
    'raw_payment_record_included',
    'wallet_address_included',
    'transaction_hash_sensitive_included',
    'payer_private_id_included',
    'payment_rank_allowed',
    'relationship_delta_allowed',
  ],
};
const GLOBAL_REJECT_FLAGS = [
  'token_included',
  'endpoint_included',
  'private_viewer_id_included',
  'raw_minecraft_chat_included',
  'raw_screen_included',
  'raw_ocr_included',
  'owner_authority_created_by_ai',
  'official_minecraft_affiliation_claimed',
  'production_readiness_claimed',
  'runtime_readiness_claimed',
  'production_go_performed',
  'candidate_executable',
  'input_action_candidate_reaches_adapter',
  'approved_game_input_action_emitted',
  'payment_rank_allowed',
  'relationship_delta_allowed',
  'relationship_candidate_allowed',
];
const V125_REJECTION_REASON_SENTINELS = [
  'UNSAFE_RAW_AUDIO_INCLUDED',
  'UNSAFE_RAW_LIVE2D_MODEL_PATH_INCLUDED',
  'UNSAFE_RAW_PAYMENT_RECORD_INCLUDED',
  'UNSAFE_STALE_OBSERVATION_GAME_ACTION',
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

function scanStringValues(value, callback) {
  if (typeof value === 'string') {
    callback(value);
  } else if (Array.isArray(value)) {
    for (const item of value) scanStringValues(item, callback);
  } else if (isObject(value)) {
    for (const item of Object.values(value)) scanStringValues(item, callback);
  }
}

function expectedBlockingIsValid(row) {
  if (row.fixture_group === 'positive') return row.expected_result_state === 'pass' && row.expected_blocking === false;
  if (row.fixture_group === 'negative') return row.expected_result_state === 'fail' && row.expected_blocking === true;
  if (row.fixture_group === 'red_line') return row.expected_result_state === 'fail' && row.expected_blocking === true;
  if (row.fixture_group === 'boundary') {
    if (['blocked'].includes(row.expected_result_state)) return row.expected_blocking === true;
    if (['pass', 'needs_review', 'not_applicable'].includes(row.expected_result_state)) return typeof row.expected_blocking === 'boolean';
  }
  return false;
}

function unsafeFlagReasons(row) {
  const reasons = [];
  const input = row.synthetic_input || {};
  for (const flag of MODULE_REJECT_FLAGS[row.module_name] || []) {
    if (hasTrueFlag(input, flag)) reasons.push(`UNSAFE_${flag.toUpperCase()}`);
  }
  for (const flag of GLOBAL_REJECT_FLAGS) {
    if (hasTrueFlag(input, flag)) reasons.push(`UNSAFE_${flag.toUpperCase()}`);
  }
  if (hasTrueFlag(input, 'stale_observation') && hasTrueFlag(input, 'memory_candidate_allowed')) {
    reasons.push('UNSAFE_STALE_OBSERVATION_MEMORY_CANDIDATE');
  }
  if (hasTrueFlag(input, 'stale_observation') && hasTrueFlag(input, 'game_action_candidate_allowed')) {
    reasons.push('UNSAFE_STALE_OBSERVATION_GAME_ACTION');
  }
  if (input.echo_risk_status === 'high' && hasTrueFlag(input, 'memory_candidate_allowed')) {
    reasons.push('UNSAFE_ECHO_RISK_MEMORY');
  }
  if (input.echo_risk_status === 'high' && hasTrueFlag(input, 'relationship_candidate_allowed')) {
    reasons.push('UNSAFE_ECHO_RISK_RELATIONSHIP');
  }
  if (hasTrueFlag(input, 'human_identity_implied')) reasons.push('UNSAFE_HUMAN_IDENTITY_IMPLIED');
  if (hasTrueFlag(input, 'screen_truth_claimed')) reasons.push('UNSAFE_SCREEN_TRUTH_CLAIM');
  return [...new Set(reasons)];
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

export function validateExternalModuleFixtureRow(row, context = {}) {
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
  if (context.states && !context.states.has(row.expected_result_state)) failures.push(safeFailure(file, line, fixtureId, 'BAD_EXPECTED_RESULT_STATE'));
  if ('expectedBlocking' in context && row.expected_blocking !== context.expectedBlocking) failures.push(safeFailure(file, line, fixtureId, 'BAD_EXPECTED_BLOCKING'));
  if (!expectedBlockingIsValid(row)) failures.push(safeFailure(file, line, fixtureId, 'BAD_GROUP_SEMANTICS'));
  if (!ALLOWED_MODULES.has(row.module_name)) failures.push(safeFailure(file, line, fixtureId, 'BAD_MODULE_NAME'));
  if (!Array.isArray(row.k_ids) || row.k_ids.length === 0) failures.push(safeFailure(file, line, fixtureId, 'EMPTY_K_IDS'));
  if (!Array.isArray(row.target_policy_ids) || row.target_policy_ids.length === 0) failures.push(safeFailure(file, line, fixtureId, 'EMPTY_TARGET_POLICY_IDS'));
  if (!row.target_policy_ids.some((policyId) => REQUIRED_POLICIES.includes(policyId))) failures.push(safeFailure(file, line, fixtureId, 'NO_RECOGNIZED_TARGET_POLICY_ID'));
  if (!Array.isArray(row.expected_safe_reason_codes)) failures.push(safeFailure(file, line, fixtureId, 'BAD_REASON_CODES'));
  if (!Array.isArray(row.must_not_include)) failures.push(safeFailure(file, line, fixtureId, 'BAD_MUST_NOT_INCLUDE'));
  if (!isObject(row.synthetic_input)) failures.push(safeFailure(file, line, fixtureId, 'BAD_SYNTHETIC_INPUT'));

  scanStringValues(row.synthetic_input, (value) => {
    const lowered = value.toLowerCase();
    for (const forbidden of FORBIDDEN_STRING_VALUES) {
      if (lowered.includes(forbidden)) failures.push(safeFailure(file, line, fixtureId, `FORBIDDEN_STRING_VALUE_${forbidden.toUpperCase()}`));
    }
  });

  const unsafeReasons = unsafeFlagReasons(row);
  if (unsafeReasons.length && row.expected_result_state === 'pass') {
    failures.push(safeFailure(file, line, fixtureId, unsafeReasons[0]));
  }
  if ((row.fixture_group === 'negative' || row.fixture_group === 'red_line') && unsafeReasons.length === 0) {
    failures.push(safeFailure(file, line, fixtureId, 'FAIL_ROW_WITHOUT_UNSAFE_SIGNAL'));
  }
  return failures;
}

export function validateExternalModuleFixtureSet(fixtureDir = DEFAULT_FIXTURE_DIR, options = {}) {
  const fileSpecs = options.fileSpecs || FILE_SPECS;
  const requiredKIds = options.requiredKIds || REQUIRED_K_IDS;
  const failures = [];
  const fixtureIds = new Set();
  const kIds = new Set();
  const modules = new Set();
  const policies = new Set();
  const groupCounts = {};
  let rowsChecked = 0;
  let crossBoundaryFailed = false;
  let forbiddenFailed = false;
  let groupFailed = false;

  for (const spec of fileSpecs) {
    const fullPath = path.join(fixtureDir, spec.file);
    if (!fs.existsSync(fullPath)) {
      failures.push(safeFailure(spec.file, 0, 'unknown', 'MISSING_FIXTURE_FILE'));
      continue;
    }
    const parsed = parseJsonlFile(fullPath, spec.file);
    failures.push(...parsed.failures);
    if (parsed.rows.length < spec.minRows) failures.push(safeFailure(spec.file, 0, 'coverage', 'TOO_FEW_ROWS'));
    groupCounts[spec.group] = parsed.rows.length;
    rowsChecked += parsed.rows.length;
    for (const { line, value } of parsed.rows) {
      const rowFailures = validateExternalModuleFixtureRow(value, {
        file: spec.file,
        line,
        group: spec.group,
        states: spec.states,
        ...(spec.expectedBlocking === undefined ? {} : { expectedBlocking: spec.expectedBlocking }),
      });
      for (const failure of rowFailures) {
        if (failure.reason_code.startsWith('UNSAFE_') || failure.reason_code === 'FAIL_ROW_WITHOUT_UNSAFE_SIGNAL') crossBoundaryFailed = true;
        if (failure.reason_code.startsWith('FORBIDDEN_STRING_VALUE_')) forbiddenFailed = true;
        if (failure.reason_code.includes('GROUP') || failure.reason_code.includes('EXPECTED')) groupFailed = true;
      }
      failures.push(...rowFailures);
      if (fixtureIds.has(value.fixture_id)) failures.push(safeFailure(spec.file, line, value.fixture_id, 'DUPLICATE_FIXTURE_ID'));
      fixtureIds.add(value.fixture_id);
      for (const kId of Array.isArray(value.k_ids) ? value.k_ids : []) kIds.add(kId);
      for (const policyId of Array.isArray(value.target_policy_ids) ? value.target_policy_ids : []) policies.add(policyId);
      if (value.module_name) modules.add(value.module_name);
    }
  }

  for (const kId of requiredKIds) {
    if (!kIds.has(kId)) failures.push(safeFailure('all', 0, 'coverage', `MISSING_K_COVERAGE_${kId}`));
  }
  for (const moduleName of ALLOWED_MODULES) {
    if (!modules.has(moduleName)) failures.push(safeFailure('all', 0, 'coverage', `MISSING_MODULE_COVERAGE_${moduleName}`));
  }
  for (const policyId of REQUIRED_POLICIES) {
    if (!policies.has(policyId)) failures.push(safeFailure('all', 0, 'coverage', `MISSING_POLICY_COVERAGE_${policyId}`));
  }

  return {
    failures,
    filesChecked: fileSpecs.length,
    rowsChecked,
    groupCounts,
    kCoverageStatus: requiredKIds.every((kId) => kIds.has(kId)) ? 'pass' : 'fail',
    moduleCoverageStatus: [...ALLOWED_MODULES].every((moduleName) => modules.has(moduleName)) ? 'pass' : 'fail',
    policyCoverageStatus: REQUIRED_POLICIES.every((policyId) => policies.has(policyId)) ? 'pass' : 'fail',
    groupSemanticsStatus: groupFailed ? 'fail' : 'pass',
    crossBoundaryStatus: crossBoundaryFailed ? 'fail' : 'pass',
    forbiddenContentStatus: forbiddenFailed ? 'fail' : 'pass',
  };
}

export function buildExternalModuleSafeSummaryValidationReport(options = {}) {
  const result = validateExternalModuleFixtureSet(options.fixtureDir || DEFAULT_FIXTURE_DIR, options);
  const ok = result.failures.length === 0;
  return {
    ok,
    validator: VALIDATOR,
    schemaVersion: SCHEMA_VERSION,
    filesChecked: result.filesChecked,
    rowsChecked: result.rowsChecked,
    ...(ok ? {
      fixtureGroups: result.groupCounts,
      kCoverageStatus: result.kCoverageStatus,
      moduleCoverageStatus: result.moduleCoverageStatus,
      policyCoverageStatus: result.policyCoverageStatus,
      groupSemanticsStatus: 'pass',
      crossBoundaryStatus: 'pass',
      forbiddenContentStatus: 'pass',
      priority1Status: 'BLOCKED',
      runtimeImplemented: false,
      voxweaveImplementation: false,
      live2dImplementation: false,
      criptoTipImplementation: false,
      datasetAuditRunnerImplemented: false,
      minecraftRuntimeImplemented: false,
      minecraftPluginImplemented: false,
      productionReadinessClaimed: false,
      productionGoPerformed: false,
    } : {
      failureCount: result.failures.length,
      failures: result.failures.slice(0, 20),
      kCoverageStatus: result.kCoverageStatus,
      moduleCoverageStatus: result.moduleCoverageStatus,
      policyCoverageStatus: result.policyCoverageStatus,
      groupSemanticsStatus: result.groupSemanticsStatus,
      crossBoundaryStatus: result.crossBoundaryStatus,
      forbiddenContentStatus: result.forbiddenContentStatus,
      rawRowsPrinted: false,
      rawLogsRead: false,
      rawDiffRead: false,
      priority1Status: 'BLOCKED',
      runtimeImplemented: false,
      voxweaveImplementation: false,
      live2dImplementation: false,
      criptoTipImplementation: false,
      datasetAuditRunnerImplemented: false,
      minecraftRuntimeImplemented: false,
      minecraftPluginImplemented: false,
      productionReadinessClaimed: false,
      productionGoPerformed: false,
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
  const report = buildExternalModuleSafeSummaryValidationReport(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
