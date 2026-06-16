#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommunityWorldFixtureValidationReport } from './codex-community-world-fixture-validator.mjs';
import { buildCommunityWorldAuditMappingValidationReport } from './codex-community-world-audit-mapping-validator.mjs';
import { buildCommunityWorldGateValidationReport } from './codex-community-world-gate-validator.mjs';

const VALIDATOR = 'community_world_completion_review_validator';
const SCHEMA_VERSION = 'community_world_fixture_v1';
const DEFAULT_FIXTURE_DIR = 'docs/specs/IRIS_20240425/fixtures/community_world_core';
const COMPLETION_FILE = 'community_world_core_completion_review_fixtures.jsonl';
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
const REQUIRED_FIXTURE_IDS = [
  'cw_completion_spec_complete_runtime_not_started',
  'cw_completion_missing_k_mapping_blocked',
  'cw_completion_missing_gate_semantics_blocked',
  'cw_completion_fixture_spec_complete_no_validator',
  'cw_completion_validator_not_started_blocked',
  'cw_completion_runtime_claim_rejected',
  'cw_completion_priority1_blocked_preserved',
  'cw_completion_dataset_audit_runner_not_started',
  'cw_completion_minecraft_plugin_not_started',
  'cw_completion_ready_for_owner_review_candidate',
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

export function validateCompletionReviewRow(row, context = {}) {
  const failures = [];
  const file = context.file || COMPLETION_FILE;
  const line = context.line || 0;
  const fixtureId = row?.fixture_id;
  if (!isObject(row)) return [safeFailure(file, line, fixtureId, 'ROW_NOT_OBJECT')];
  for (const field of REQUIRED_FIELDS) {
    if (!(field in row)) failures.push(safeFailure(file, line, fixtureId, `MISSING_REQUIRED_FIELD_${field}`));
  }
  if (failures.length) return failures;

  if (row.schema_version !== SCHEMA_VERSION) failures.push(safeFailure(file, line, fixtureId, 'BAD_SCHEMA_VERSION'));
  if (row.fixture_group !== 'completion_review') failures.push(safeFailure(file, line, fixtureId, 'BAD_FIXTURE_GROUP'));
  if (!Array.isArray(row.k_ids) || !row.k_ids.includes('K1020')) failures.push(safeFailure(file, line, fixtureId, 'K1020_REQUIRED'));
  if (!Array.isArray(row.target_gate_ids) || !row.target_gate_ids.includes('community_world_owner_review_gate')) failures.push(safeFailure(file, line, fixtureId, 'OWNER_REVIEW_GATE_REQUIRED'));
  if (!['pass', 'blocked', 'fail', 'needs_review'].includes(row.expected_result_state)) failures.push(safeFailure(file, line, fixtureId, 'BAD_EXPECTED_RESULT_STATE'));
  if (row.expected_result_state === 'pass' && row.expected_blocking !== false) failures.push(safeFailure(file, line, fixtureId, 'PASS_MUST_NOT_BLOCK'));
  if (['blocked', 'fail'].includes(row.expected_result_state) && row.expected_blocking !== true) failures.push(safeFailure(file, line, fixtureId, 'BLOCK_OR_FAIL_MUST_BLOCK'));
  if (!isObject(row.synthetic_input)) failures.push(safeFailure(file, line, fixtureId, 'BAD_SYNTHETIC_INPUT'));
  if (!Array.isArray(row.expected_safe_reason_codes)) failures.push(safeFailure(file, line, fixtureId, 'BAD_REASON_CODES'));

  const input = row.synthetic_input || {};
  if (input.priority1_status !== 'BLOCKED') failures.push(safeFailure(file, line, fixtureId, 'PRIORITY1_NOT_BLOCKED'));
  if (hasTrueFlag(input, 'runtime_implemented')) failures.push(safeFailure(file, line, fixtureId, 'RUNTIME_IMPLEMENTED'));
  if (hasTrueFlag(input, 'minecraft_plugin_implemented')) failures.push(safeFailure(file, line, fixtureId, 'MINECRAFT_PLUGIN_IMPLEMENTED'));
  if (hasTrueFlag(input, 'dataset_audit_runner_implemented')) failures.push(safeFailure(file, line, fixtureId, 'DATASET_AUDIT_RUNNER_IMPLEMENTED'));
  if (hasTrueFlag(input, 'production_readiness_claimed')) failures.push(safeFailure(file, line, fixtureId, 'PRODUCTION_READINESS_CLAIMED'));
  if (hasTrueFlag(input, 'production_go_performed')) failures.push(safeFailure(file, line, fixtureId, 'PRODUCTION_GO_PERFORMED'));
  if (row.expected_result_state === 'pass') {
    if (input.spec_complete !== true) failures.push(safeFailure(file, line, fixtureId, 'PASS_REQUIRES_SPEC_COMPLETE'));
    if (input.fixture_spec_complete !== true) failures.push(safeFailure(file, line, fixtureId, 'PASS_REQUIRES_FIXTURE_SPEC_COMPLETE'));
    if (input.validator_spec_complete !== true) failures.push(safeFailure(file, line, fixtureId, 'PASS_REQUIRES_VALIDATOR_SPEC_COMPLETE'));
  }

  const serialized = JSON.stringify(row).toLowerCase();
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    if (serialized.includes(forbidden)) failures.push(safeFailure(file, line, fixtureId, `FORBIDDEN_CONTENT_${forbidden.toUpperCase()}`));
  }
  return failures;
}

export function buildCommunityWorldCompletionReviewValidationReport(options = {}) {
  const fixtureDir = options.fixtureDir || DEFAULT_FIXTURE_DIR;
  const filePath = path.join(fixtureDir, COMPLETION_FILE);
  const parsed = fs.existsSync(filePath)
    ? parseJsonlFile(filePath, COMPLETION_FILE)
    : { rows: [], failures: [safeFailure(COMPLETION_FILE, 0, 'unknown', 'MISSING_COMPLETION_FIXTURE_FILE')] };
  const failures = [...parsed.failures];
  const ids = new Set();

  for (const { line, value } of parsed.rows) {
    failures.push(...validateCompletionReviewRow(value, { file: COMPLETION_FILE, line }));
    if (ids.has(value.fixture_id)) failures.push(safeFailure(COMPLETION_FILE, line, value.fixture_id, 'DUPLICATE_FIXTURE_ID'));
    ids.add(value.fixture_id);
  }
  if (parsed.rows.length < 10) failures.push(safeFailure(COMPLETION_FILE, 0, 'coverage', 'TOO_FEW_COMPLETION_ROWS'));
  for (const fixtureId of REQUIRED_FIXTURE_IDS) {
    if (!ids.has(fixtureId)) failures.push(safeFailure(COMPLETION_FILE, 0, fixtureId, 'MISSING_REQUIRED_COMPLETION_FIXTURE'));
  }

  const fixtureReport = options.skipDependentReports ? { ok: true } : buildCommunityWorldFixtureValidationReport({ fixtureDir });
  const auditReport = options.skipDependentReports ? { ok: true } : buildCommunityWorldAuditMappingValidationReport({ fixtureDir });
  const gateReport = options.skipDependentReports ? { ok: true } : buildCommunityWorldGateValidationReport({ fixtureDir });
  if (!fixtureReport.ok) failures.push(safeFailure('dependent_report', 0, 'community_world_fixture_validator', 'FIXTURE_VALIDATOR_NOT_PASS'));
  if (!auditReport.ok) failures.push(safeFailure('dependent_report', 0, 'community_world_audit_mapping_validator', 'AUDIT_MAPPING_VALIDATOR_NOT_PASS'));
  if (!gateReport.ok) failures.push(safeFailure('dependent_report', 0, 'community_world_gate_validator', 'GATE_VALIDATOR_NOT_PASS'));

  const ok = failures.length === 0;
  return {
    ok,
    validator: VALIDATOR,
    schemaVersion: SCHEMA_VERSION,
    ...(ok ? {
      rowsChecked: parsed.rows.length,
      completionCoverageStatus: 'pass',
      dependentValidatorStatus: 'pass',
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
    } else if (argv[index] === '--skip-dependent-reports') {
      options.skipDependentReports = true;
    }
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildCommunityWorldCompletionReviewValidationReport(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
