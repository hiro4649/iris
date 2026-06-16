#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VALIDATOR = 'community_world_audit_mapping_validator';
const SCHEMA_VERSION = 'community_world_audit_mapping_v1';
const DEFAULT_FIXTURE_DIR = 'docs/specs/IRIS_20240425/fixtures/community_world_core';
const DEFAULT_MAPPING_FILE = path.join(DEFAULT_FIXTURE_DIR, 'community_world_core_audit_mapping_fixtures.jsonl');
const REQUIRED_FIELDS = [
  'schema_version',
  'mapping_id',
  'source_fixture_id',
  'source_fixture_group',
  'k_ids',
  'target_gate_ids',
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
const SOURCE_FILES = [
  ['community_world_core_positive_fixtures.jsonl', 'positive'],
  ['community_world_core_negative_fixtures.jsonl', 'negative'],
  ['community_world_core_boundary_fixtures.jsonl', 'boundary'],
  ['community_world_core_redline_fixtures.jsonl', 'red_line'],
  ['community_world_core_completion_review_fixtures.jsonl', 'completion_review'],
];
const APPROVED_AUDITORS = new Set([
  'factual_error',
  'format_violation',
  'duplicate_or_near_duplicate',
  'label_error',
  'too_easy',
  'over_leading_answer',
  'safety_risk',
  'privacy_or_confidential',
  'japanese_naturalness',
  'task_definition_mismatch',
  'eval_data_contamination',
  'hallucination',
  'over_template',
  'boundary_case_gap',
  'unusable_in_production',
  'parasocial_dependency_risk',
  'monetization_pressure_risk',
  'candidate_execution_boundary',
  'adapter_boundary_violation',
  'production_readiness_sweetening',
  'memory_privacy_boundary',
  'persona_consistency',
]);
const REQUIRED_AUDITORS = [
  'candidate_execution_boundary',
  'adapter_boundary_violation',
  'production_readiness_sweetening',
  'memory_privacy_boundary',
  'parasocial_dependency_risk',
  'monetization_pressure_risk',
  'privacy_or_confidential',
  'safety_risk',
  'persona_consistency',
  'format_violation',
  'task_definition_mismatch',
];
const REQUIRED_K_IDS = Array.from({ length: 20 }, (_, index) => `K${1001 + index}`);
const REQUIRED_SOURCE_GROUPS = ['positive', 'negative', 'boundary', 'red_line', 'completion_review'];
const REQUIRED_MAPPING_IDS = [
  'cw_audit_map_positive_safe_summary_pass',
  'cw_audit_map_raw_chat_reject_memory_privacy',
  'cw_audit_map_private_id_reject_privacy',
  'cw_audit_map_exact_coordinates_reject_privacy',
  'cw_audit_map_payment_ranking_reject_monetization',
  'cw_audit_map_relationship_ranking_reject_parasocial',
  'cw_audit_map_minecraft_command_reject_candidate_execution',
  'cw_audit_map_input_action_candidate_reject_adapter_boundary',
  'cw_audit_map_approved_action_too_early_reject_adapter_boundary',
  'cw_audit_map_production_readiness_claim_reject_sweetening',
  'cw_audit_map_official_minecraft_claim_needs_review_or_reject',
  'cw_audit_map_identity_auto_whitelist_reject_task_boundary',
  'cw_audit_map_ai_owner_approval_reject_safety',
  'cw_audit_map_memory_direct_commit_reject_memory_boundary',
  'cw_audit_map_public_recognition_publish_reject_adapter_boundary',
  'cw_audit_map_moderation_execution_reject_safety',
  'cw_audit_map_rollback_execution_reject_safety',
  'cw_audit_map_minor_private_contact_reject_safety',
  'cw_audit_map_pay_to_friendship_reject_monetization',
  'cw_audit_map_completion_priority1_resolved_reject_sweetening',
  'cw_audit_map_completion_runtime_claim_reject_sweetening',
  'cw_audit_map_newcomer_friendliness_needs_review_persona',
  'cw_audit_map_commercial_review_missing_needs_review',
  'cw_audit_map_unofficial_notice_missing_needs_review',
  'cw_audit_map_recall_cooldown_missing_needs_review',
];
const REQUIRED_ACTION_KEYS = ['exclude_from_train', 'exclude_from_eval', 'human_review', 'quarantine'];
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
const REDLINE_ISSUE_CODES = [
  'candidate_execution_boundary',
  'adapter_boundary_violation',
  'production_readiness_sweetening',
  'memory_privacy_boundary',
  'parasocial_dependency_risk',
  'monetization_pressure_risk',
];
const VALID_VERDICTS = new Set(['pass', 'reject', 'needs_review']);
const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeFailure(file, line, mappingId, reasonCode) {
  return { file, line, mapping_id: mappingId || 'unknown', reason_code: reasonCode };
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

function loadSourceFixtures(fixtureDir) {
  const failures = [];
  const sourceById = new Map();
  let rowsChecked = 0;
  for (const [file, group] of SOURCE_FILES) {
    const fullPath = path.join(fixtureDir, file);
    if (!fs.existsSync(fullPath)) {
      failures.push(safeFailure(file, 0, 'unknown', 'MISSING_SOURCE_FIXTURE_FILE'));
      continue;
    }
    const parsed = parseJsonlFile(fullPath, file);
    failures.push(...parsed.failures);
    rowsChecked += parsed.rows.length;
    for (const { line, value } of parsed.rows) {
      if (!isObject(value) || typeof value.fixture_id !== 'string') {
        failures.push(safeFailure(file, line, 'unknown', 'BAD_SOURCE_FIXTURE_ROW'));
        continue;
      }
      sourceById.set(value.fixture_id, { group: value.fixture_group || group, file, line });
    }
  }
  return { failures, sourceById, rowsChecked };
}

function forbiddenScanText(row) {
  return JSON.stringify({
    safe_rationale: row.safe_rationale,
    expected_issue_codes: row.expected_issue_codes,
    expected_actions: row.expected_actions,
  }).toLowerCase();
}

export function validateMappingRow(row, context = {}) {
  const failures = [];
  const file = context.file || 'unknown';
  const line = context.line || 0;
  const mappingId = row?.mapping_id;

  if (!isObject(row)) return [safeFailure(file, line, mappingId, 'ROW_NOT_OBJECT')];
  for (const field of REQUIRED_FIELDS) {
    if (!(field in row)) failures.push(safeFailure(file, line, mappingId, `MISSING_REQUIRED_FIELD_${field}`));
  }
  if (failures.length) return failures;

  if (row.schema_version !== SCHEMA_VERSION) failures.push(safeFailure(file, line, mappingId, 'BAD_SCHEMA_VERSION'));
  if (!Array.isArray(row.k_ids) || row.k_ids.length === 0) failures.push(safeFailure(file, line, mappingId, 'EMPTY_K_IDS'));
  if (!Array.isArray(row.target_gate_ids) || row.target_gate_ids.length === 0) failures.push(safeFailure(file, line, mappingId, 'EMPTY_TARGET_GATE_IDS'));
  if (!APPROVED_AUDITORS.has(row.audit_auditor)) failures.push(safeFailure(file, line, mappingId, 'UNKNOWN_AUDITOR'));
  if (!VALID_VERDICTS.has(row.expected_verdict)) failures.push(safeFailure(file, line, mappingId, 'BAD_EXPECTED_VERDICT'));
  if (!VALID_SEVERITIES.has(row.expected_severity)) failures.push(safeFailure(file, line, mappingId, 'BAD_EXPECTED_SEVERITY'));
  if (!Array.isArray(row.expected_issue_codes)) failures.push(safeFailure(file, line, mappingId, 'BAD_EXPECTED_ISSUE_CODES'));
  if (!Array.isArray(row.must_not_include)) failures.push(safeFailure(file, line, mappingId, 'BAD_MUST_NOT_INCLUDE'));
  if (row.classification_only !== true) failures.push(safeFailure(file, line, mappingId, 'CLASSIFICATION_ONLY_NOT_TRUE'));
  if (typeof row.expected_blocking !== 'boolean') failures.push(safeFailure(file, line, mappingId, 'BAD_EXPECTED_BLOCKING'));
  if (typeof row.safe_rationale !== 'string' || row.safe_rationale.trim().length === 0 || row.safe_rationale.length > 180) failures.push(safeFailure(file, line, mappingId, 'BAD_SAFE_RATIONALE'));
  if (!isObject(row.expected_actions)) {
    failures.push(safeFailure(file, line, mappingId, 'BAD_EXPECTED_ACTIONS'));
  } else {
    for (const key of REQUIRED_ACTION_KEYS) {
      if (typeof row.expected_actions[key] !== 'boolean') failures.push(safeFailure(file, line, mappingId, `BAD_EXPECTED_ACTION_${key.toUpperCase()}`));
    }
  }

  const source = context.sourceById?.get(row.source_fixture_id);
  if (!source) {
    failures.push(safeFailure(file, line, mappingId, 'UNKNOWN_SOURCE_FIXTURE'));
  } else if (source.group !== row.source_fixture_group) {
    failures.push(safeFailure(file, line, mappingId, 'SOURCE_FIXTURE_GROUP_MISMATCH'));
  }

  if (row.source_fixture_group === 'red_line' && row.expected_verdict === 'pass') {
    failures.push(safeFailure(file, line, mappingId, 'REDLINE_MAPPING_MUST_NOT_PASS'));
  }
  if (row.expected_verdict === 'pass' && Array.isArray(row.expected_issue_codes)) {
    for (const code of row.expected_issue_codes) {
      if (REDLINE_ISSUE_CODES.includes(code)) failures.push(safeFailure(file, line, mappingId, 'PASS_MAPPING_HAS_REDLINE_ISSUE_CODE'));
    }
  }
  const scanText = forbiddenScanText(row);
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    if (scanText.includes(forbidden)) failures.push(safeFailure(file, line, mappingId, `FORBIDDEN_CONTENT_${forbidden.toUpperCase()}`));
  }

  return failures;
}

export function validateMappingSet(options = {}) {
  const fixtureDir = options.fixtureDir || DEFAULT_FIXTURE_DIR;
  const mappingFile = options.mappingFile || DEFAULT_MAPPING_FILE;
  const source = loadSourceFixtures(fixtureDir);
  const failures = [...source.failures];
  const parsed = fs.existsSync(mappingFile)
    ? parseJsonlFile(mappingFile, path.basename(mappingFile))
    : { rows: [], failures: [safeFailure(path.basename(mappingFile), 0, 'unknown', 'MISSING_MAPPING_FILE')] };
  failures.push(...parsed.failures);
  if (parsed.rows.length < 25) failures.push(safeFailure(path.basename(mappingFile), 0, 'coverage', 'TOO_FEW_MAPPING_ROWS'));

  const ids = new Set();
  const auditors = new Set();
  const kIds = new Set();
  const sourceGroups = new Set();

  for (const { line, value } of parsed.rows) {
    failures.push(...validateMappingRow(value, {
      file: path.basename(mappingFile),
      line,
      sourceById: source.sourceById,
    }));
    if (ids.has(value.mapping_id)) failures.push(safeFailure(path.basename(mappingFile), line, value.mapping_id, 'DUPLICATE_MAPPING_ID'));
    ids.add(value.mapping_id);
    if (typeof value.audit_auditor === 'string') auditors.add(value.audit_auditor);
    if (typeof value.source_fixture_group === 'string') sourceGroups.add(value.source_fixture_group);
    for (const kId of Array.isArray(value.k_ids) ? value.k_ids : []) kIds.add(kId);
  }

  for (const id of REQUIRED_MAPPING_IDS) {
    if (!ids.has(id)) failures.push(safeFailure(path.basename(mappingFile), 0, id, 'MISSING_REQUIRED_MAPPING_ID'));
  }
  for (const auditor of REQUIRED_AUDITORS) {
    if (!auditors.has(auditor)) failures.push(safeFailure(path.basename(mappingFile), 0, auditor, 'MISSING_AUDITOR_COVERAGE'));
  }
  for (const kId of REQUIRED_K_IDS) {
    if (!kIds.has(kId)) failures.push(safeFailure(path.basename(mappingFile), 0, kId, 'MISSING_K_COVERAGE'));
  }
  for (const group of REQUIRED_SOURCE_GROUPS) {
    if (!sourceGroups.has(group)) failures.push(safeFailure(path.basename(mappingFile), 0, group, 'MISSING_SOURCE_GROUP_COVERAGE'));
  }

  return {
    failures,
    mappingRowsChecked: parsed.rows.length,
    sourceFixtureRowsChecked: source.rowsChecked,
    auditorCoverageStatus: REQUIRED_AUDITORS.every((auditor) => auditors.has(auditor)) ? 'pass' : 'fail',
    kCoverageStatus: REQUIRED_K_IDS.every((kId) => kIds.has(kId)) ? 'pass' : 'fail',
    sourceFixtureReferenceStatus: failures.some((failure) => ['UNKNOWN_SOURCE_FIXTURE', 'SOURCE_FIXTURE_GROUP_MISMATCH'].includes(failure.reason_code)) ? 'fail' : 'pass',
    classificationOnlyStatus: failures.some((failure) => failure.reason_code === 'CLASSIFICATION_ONLY_NOT_TRUE') ? 'fail' : 'pass',
    forbiddenContentStatus: failures.some((failure) => failure.reason_code.startsWith('FORBIDDEN_CONTENT_')) ? 'fail' : 'pass',
  };
}

export function buildCommunityWorldAuditMappingValidationReport(options = {}) {
  const result = validateMappingSet(options);
  const ok = result.failures.length === 0;
  return {
    ok,
    validator: VALIDATOR,
    schemaVersion: SCHEMA_VERSION,
    ...(ok ? {
      mappingRowsChecked: result.mappingRowsChecked,
      sourceFixtureRowsChecked: result.sourceFixtureRowsChecked,
      auditorCoverageStatus: 'pass',
      kCoverageStatus: 'pass',
      sourceFixtureReferenceStatus: 'pass',
      classificationOnlyStatus: 'pass',
      forbiddenContentStatus: 'pass',
      priority1Status: 'BLOCKED',
      datasetAuditRunnerImplemented: false,
      runtimeImplemented: false,
      minecraftRuntimeImplemented: false,
      minecraftPluginImplemented: false,
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
    if (arg === '--fixture-dir') {
      options.fixtureDir = argv[index + 1];
      index += 1;
    } else if (arg === '--mapping-file') {
      options.mappingFile = argv[index + 1];
      index += 1;
    }
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildCommunityWorldAuditMappingValidationReport(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
