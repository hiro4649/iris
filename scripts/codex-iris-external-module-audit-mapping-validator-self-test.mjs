#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildExternalModuleAuditMappingValidationReport } from './codex-iris-external-module-audit-mapping-validator.mjs';

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-external-module-audit-mapping-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sourceRow(id, group = 'positive', moduleName = 'SHARED_EXTERNAL_ENVELOPE', result = 'pass') {
  return {
    schema_version: 'iris_external_module_fixture_v1',
    fixture_id: id,
    fixture_group: group,
    k_ids: ['K1021'],
    target_policy_ids: ['IRIS_EXTERNAL_MODULE_SAFE_SUMMARY_CONTRACT'],
    module_name: moduleName,
    summary_kind: 'self_test',
    input_evidence_class: 'synthetic_self_test',
    synthetic_input: {},
    expected_result_state: result,
    expected_safe_reason_codes: ['self_test'],
    expected_blocking: result !== 'pass',
    must_not_include: [],
    trace_id: `trace_${id}`,
  };
}

function mappingRow(overrides = {}) {
  return {
    schema_version: 'iris_external_module_audit_mapping_v1',
    mapping_id: 'self_mapping',
    source_fixture_id: 'self_source',
    source_fixture_group: 'positive',
    k_ids: ['K1021'],
    target_policy_ids: ['IRIS_EXTERNAL_MODULE_SAFE_SUMMARY_CONTRACT'],
    module_name: 'SHARED_EXTERNAL_ENVELOPE',
    audit_auditor: 'format_violation',
    expected_verdict: 'pass',
    expected_severity: 'low',
    expected_issue_codes: [],
    expected_actions: {
      exclude_from_train: false,
      exclude_from_eval: false,
      human_review: false,
      quarantine: false,
    },
    classification_only: true,
    expected_blocking: false,
    safe_rationale: 'synthetic mapping remains classification only',
    must_not_include: [],
    trace_id: 'trace_self_mapping',
    ...overrides,
  };
}

function writeJsonl(file, rows) {
  fs.writeFileSync(file, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

function setupFixtureDir(dir, mappings, sources = [sourceRow('self_source')]) {
  const rowsByGroup = {
    positive: sources.filter((row) => row.fixture_group === 'positive'),
    negative: sources.filter((row) => row.fixture_group === 'negative'),
    boundary: sources.filter((row) => row.fixture_group === 'boundary'),
    red_line: sources.filter((row) => row.fixture_group === 'red_line'),
  };
  if (!rowsByGroup.positive.length) rowsByGroup.positive.push(sourceRow('self_filler_positive'));
  if (!rowsByGroup.negative.length) rowsByGroup.negative.push(sourceRow('self_filler_negative', 'negative', 'SHARED_EXTERNAL_ENVELOPE', 'fail'));
  if (!rowsByGroup.boundary.length) rowsByGroup.boundary.push(sourceRow('self_filler_boundary', 'boundary', 'SHARED_EXTERNAL_ENVELOPE', 'blocked'));
  if (!rowsByGroup.red_line.length) rowsByGroup.red_line.push(sourceRow('self_filler_red_line', 'red_line', 'SHARED_EXTERNAL_ENVELOPE', 'fail'));
  writeJsonl(path.join(dir, 'iris_external_module_safe_summary_positive_fixtures.jsonl'), rowsByGroup.positive);
  writeJsonl(path.join(dir, 'iris_external_module_safe_summary_negative_fixtures.jsonl'), rowsByGroup.negative);
  writeJsonl(path.join(dir, 'iris_external_module_safe_summary_boundary_fixtures.jsonl'), rowsByGroup.boundary);
  writeJsonl(path.join(dir, 'iris_external_module_safe_summary_redline_fixtures.jsonl'), rowsByGroup.red_line);
  writeJsonl(path.join(dir, 'iris_external_module_audit_mapping_fixtures.jsonl'), mappings);
}

function validMinimalMappingSet() {
  const auditors = [
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
  const modules = ['VOXWEAVE', 'LIVE2D', 'CRIPTO-TIP', 'COMMUNITY_WORLD_ADAPTER', 'SHARED_EXTERNAL_ENVELOPE'];
  const sources = auditors.map((auditor, index) => sourceRow(`self_source_${index}`, 'negative', modules[index % modules.length], 'fail'));
  const mappings = auditors.map((auditor, index) => mappingRow({
    mapping_id: `self_mapping_${index}`,
    source_fixture_id: `self_source_${index}`,
    source_fixture_group: 'negative',
    k_ids: [`K${1021 + (index % 10)}`],
    module_name: modules[index % modules.length],
    audit_auditor: auditor,
    expected_verdict: 'reject',
    expected_severity: index < 2 ? 'critical' : 'high',
    expected_issue_codes: [`SELF_${auditor.toUpperCase()}`],
    expected_actions: { exclude_from_train: true, exclude_from_eval: true, human_review: true, quarantine: index < 2 },
    expected_blocking: true,
  }));
  return { sources, mappings };
}

function reportPasses(setup) {
  return withTempDir((dir) => {
    setup(dir);
    return buildExternalModuleAuditMappingValidationReport({ fixtureDir: dir }).ok;
  });
}

function reportFails(setup) {
  return !reportPasses(setup);
}

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail' };
  } catch {
    return { name, status: 'fail' };
  }
}

const cases = [
  test('valid_minimal_mapping_set_passes', () => reportPasses((dir) => {
    const { sources, mappings } = validMinimalMappingSet();
    setupFixtureDir(dir, mappings, sources);
  })),
  test('missing_required_field_fails', () => reportFails((dir) => {
    const row = mappingRow();
    delete row.trace_id;
    setupFixtureDir(dir, [row]);
  })),
  test('invalid_jsonl_line_fails', () => reportFails((dir) => {
    setupFixtureDir(dir, []);
    fs.writeFileSync(path.join(dir, 'iris_external_module_audit_mapping_fixtures.jsonl'), '{bad json}\n');
  })),
  test('duplicate_mapping_id_fails', () => reportFails((dir) => setupFixtureDir(dir, [mappingRow(), mappingRow()]))),
  test('unknown_source_fixture_fails', () => reportFails((dir) => setupFixtureDir(dir, [mappingRow({ source_fixture_id: 'missing_source' })]))),
  test('source_group_mismatch_fails', () => reportFails((dir) => setupFixtureDir(dir, [mappingRow({ source_fixture_group: 'negative' })]))),
  test('unknown_auditor_fails', () => reportFails((dir) => setupFixtureDir(dir, [mappingRow({ audit_auditor: 'unknown_auditor' })]))),
  test('unknown_module_fails', () => reportFails((dir) => setupFixtureDir(dir, [mappingRow({ module_name: 'UNKNOWN' })]))),
  test('classification_only_false_fails', () => reportFails((dir) => setupFixtureDir(dir, [mappingRow({ classification_only: false })]))),
  test('missing_expected_actions_fails', () => reportFails((dir) => setupFixtureDir(dir, [mappingRow({ expected_actions: { exclude_from_train: false } })]))),
  test('missing_k1021_k1030_coverage_fails', () => reportFails((dir) => setupFixtureDir(dir, [mappingRow({ k_ids: ['K1021'] })]))),
  test('missing_auditor_coverage_fails', () => reportFails((dir) => setupFixtureDir(dir, [mappingRow({ audit_auditor: 'format_violation' })]))),
  test('missing_module_coverage_fails', () => reportFails((dir) => setupFixtureDir(dir, [mappingRow({ module_name: 'VOXWEAVE' })]))),
  test('raw_audio_maps_wrong_auditor_fails', () => reportFails((dir) => {
    setupFixtureDir(dir, [mappingRow({
      source_fixture_id: 'ext_negative_raw_audio_included',
      source_fixture_group: 'negative',
      audit_auditor: 'safety_risk',
      expected_verdict: 'reject',
      expected_blocking: true,
      expected_actions: { exclude_from_train: true, exclude_from_eval: true, human_review: true, quarantine: true },
    })], [sourceRow('ext_negative_raw_audio_included', 'negative', 'VOXWEAVE', 'fail')]);
  })),
  test('payment_relationship_maps_wrong_verdict_fails', () => reportFails((dir) => {
    setupFixtureDir(dir, [mappingRow({
      source_fixture_id: 'ext_negative_payment_relationship_delta_allowed',
      source_fixture_group: 'negative',
      module_name: 'CRIPTO-TIP',
      audit_auditor: 'monetization_pressure_risk',
      expected_verdict: 'pass',
    })], [sourceRow('ext_negative_payment_relationship_delta_allowed', 'negative', 'CRIPTO-TIP', 'fail')]);
  })),
  test('production_readiness_pass_mapping_fails', () => reportFails((dir) => {
    setupFixtureDir(dir, [mappingRow({
      source_fixture_id: 'ext_negative_production_readiness_claimed',
      source_fixture_group: 'negative',
      audit_auditor: 'format_violation',
      expected_verdict: 'pass',
    })], [sourceRow('ext_negative_production_readiness_claimed', 'negative', 'SHARED_EXTERNAL_ENVELOPE', 'fail')]);
  })),
  test('positive_with_redline_issue_code_fails', () => reportFails((dir) => setupFixtureDir(dir, [mappingRow({ expected_issue_codes: ['MON_PAYMENT_PRESSURE'] })]))),
  test('forbidden_token_string_fails', () => reportFails((dir) => setupFixtureDir(dir, [mappingRow({ safe_rationale: 'token must not appear here' })]))),
  test('real_mapping_files_pass', () => (
    process.env.CODEX_EXTERNAL_MODULE_AUDIT_MAPPING_SELF_TEST_SKIP_REAL === '1'
      ? true
      : buildExternalModuleAuditMappingValidationReport().ok
  )),
];

const failures = cases.filter((item) => item.status !== 'pass');
if (failures.length) {
  console.log(JSON.stringify({
    ok: false,
    validatorSelfTestStatus: 'fail',
    failureCount: failures.length,
    failures: failures.slice(0, 20).map((item) => ({ name: item.name })),
    rawLogsRead: false,
    rawDiffRead: false,
    priority1Status: 'BLOCKED',
  }, null, 2));
  process.exit(1);
}

console.log('IRIS external module audit mapping validator self-test: pass');
