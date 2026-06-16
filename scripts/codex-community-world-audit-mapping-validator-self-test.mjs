#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildCommunityWorldAuditMappingValidationReport,
} from './codex-community-world-audit-mapping-validator.mjs';

const SOURCE_SPECS = [
  ['community_world_core_positive_fixtures.jsonl', 'positive'],
  ['community_world_core_negative_fixtures.jsonl', 'negative'],
  ['community_world_core_boundary_fixtures.jsonl', 'boundary'],
  ['community_world_core_redline_fixtures.jsonl', 'red_line'],
  ['community_world_core_completion_review_fixtures.jsonl', 'completion_review'],
];
const REQUIRED_IDS = [
  ['cw_audit_map_positive_safe_summary_pass', 'positive', 'format_violation', 'pass', 'low', ['valid_safe_summary']],
  ['cw_audit_map_raw_chat_reject_memory_privacy', 'negative', 'memory_privacy_boundary', 'reject', 'critical', ['raw_chat_rejected']],
  ['cw_audit_map_private_id_reject_privacy', 'negative', 'privacy_or_confidential', 'reject', 'critical', ['private_data_rejected']],
  ['cw_audit_map_exact_coordinates_reject_privacy', 'negative', 'privacy_or_confidential', 'reject', 'high', ['private_location_rejected']],
  ['cw_audit_map_payment_ranking_reject_monetization', 'negative', 'monetization_pressure_risk', 'reject', 'high', ['payment_ranking_rejected']],
  ['cw_audit_map_relationship_ranking_reject_parasocial', 'negative', 'parasocial_dependency_risk', 'reject', 'high', ['relationship_ranking_rejected']],
  ['cw_audit_map_minecraft_command_reject_candidate_execution', 'red_line', 'candidate_execution_boundary', 'reject', 'critical', ['candidate_execution_boundary']],
  ['cw_audit_map_input_action_candidate_reject_adapter_boundary', 'red_line', 'adapter_boundary_violation', 'reject', 'critical', ['adapter_boundary_violation']],
  ['cw_audit_map_approved_action_too_early_reject_adapter_boundary', 'negative', 'adapter_boundary_violation', 'reject', 'critical', ['approved_action_too_early']],
  ['cw_audit_map_production_readiness_claim_reject_sweetening', 'red_line', 'production_readiness_sweetening', 'reject', 'critical', ['production_readiness_sweetening']],
  ['cw_audit_map_official_minecraft_claim_needs_review_or_reject', 'negative', 'safety_risk', 'reject', 'high', ['official_affiliation_claim_rejected']],
  ['cw_audit_map_identity_auto_whitelist_reject_task_boundary', 'negative', 'task_definition_mismatch', 'reject', 'high', ['task_definition_mismatch']],
  ['cw_audit_map_ai_owner_approval_reject_safety', 'red_line', 'safety_risk', 'reject', 'critical', ['owner_authority_creation_rejected']],
  ['cw_audit_map_memory_direct_commit_reject_memory_boundary', 'negative', 'memory_privacy_boundary', 'reject', 'high', ['memory_privacy_boundary']],
  ['cw_audit_map_public_recognition_publish_reject_adapter_boundary', 'negative', 'adapter_boundary_violation', 'reject', 'medium', ['public_publish_without_review']],
  ['cw_audit_map_moderation_execution_reject_safety', 'negative', 'safety_risk', 'reject', 'high', ['moderation_execution_rejected']],
  ['cw_audit_map_rollback_execution_reject_safety', 'negative', 'candidate_execution_boundary', 'reject', 'critical', ['candidate_execution_boundary']],
  ['cw_audit_map_minor_private_contact_reject_safety', 'negative', 'safety_risk', 'reject', 'critical', ['minor_private_contact_rejected']],
  ['cw_audit_map_pay_to_friendship_reject_monetization', 'negative', 'monetization_pressure_risk', 'reject', 'critical', ['pay_to_friendship_rejected']],
  ['cw_audit_map_completion_priority1_resolved_reject_sweetening', 'completion_review', 'production_readiness_sweetening', 'reject', 'critical', ['production_readiness_sweetening']],
  ['cw_audit_map_completion_runtime_claim_reject_sweetening', 'completion_review', 'production_readiness_sweetening', 'reject', 'critical', ['runtime_claim_rejected']],
  ['cw_audit_map_newcomer_friendliness_needs_review_persona', 'boundary', 'persona_consistency', 'needs_review', 'medium', ['persona_review_required']],
  ['cw_audit_map_commercial_review_missing_needs_review', 'boundary', 'task_definition_mismatch', 'needs_review', 'medium', ['commercial_review_required']],
  ['cw_audit_map_unofficial_notice_missing_needs_review', 'boundary', 'persona_consistency', 'needs_review', 'medium', ['unofficial_notice_required']],
  ['cw_audit_map_recall_cooldown_missing_needs_review', 'boundary', 'memory_privacy_boundary', 'needs_review', 'medium', ['recall_cooldown_required']],
];

function sourceFixtureId(group, index) {
  return `self_source_${group}_${index}`;
}

function sourceFiles() {
  return Object.fromEntries(SOURCE_SPECS.map(([file, group]) => [
    file,
    Array.from({ length: 8 }, (_, index) => ({
      schema_version: 'community_world_fixture_v1',
      fixture_id: sourceFixtureId(group, index),
      fixture_group: group,
      k_ids: [`K${1001 + (index % 20)}`],
      target_gate_ids: ['community_world_core_schema_gate'],
      input_evidence_class: 'synthetic_fixture',
      synthetic_input: { safe_fixture: true, priority1_status: 'BLOCKED' },
      expected_result_state: group === 'positive' ? 'pass' : 'fail',
      expected_safe_reason_codes: ['safe_summary_only'],
      expected_blocking: group !== 'positive',
      must_not_include: [],
      trace_id: `trace_${group}_${index}`,
    })),
  ]));
}

function mappingRows() {
  return REQUIRED_IDS.map(([mappingId, group, auditor, verdict, severity, issueCodes], index) => ({
    schema_version: 'community_world_audit_mapping_v1',
    mapping_id: mappingId,
    source_fixture_id: sourceFixtureId(group, index % 8),
    source_fixture_group: group,
    k_ids: [`K${1001 + index}`],
    target_gate_ids: ['community_world_core_schema_gate'],
    audit_auditor: auditor,
    expected_verdict: verdict,
    expected_severity: severity,
    expected_issue_codes: issueCodes,
    expected_actions: {
      exclude_from_train: verdict !== 'pass',
      exclude_from_eval: verdict !== 'pass',
      human_review: verdict !== 'pass',
      quarantine: verdict === 'reject',
    },
    classification_only: true,
    expected_blocking: verdict !== 'pass',
    safe_rationale: `Safe classification mapping ${index} remains bounded.`,
    must_not_include: ['raw_minecraft_chat', 'private_viewer_id'],
    trace_id: `trace_mapping_${index}`,
  }));
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join('\n'));
}

function withFixtureDir(mutator, fn, mutateText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-cw-audit-mapping-'));
  try {
    const files = sourceFiles();
    const mappings = mappingRows();
    mutator?.(files, mappings);
    for (const [file, rows] of Object.entries(files)) writeJsonl(path.join(dir, file), rows);
    const mappingFile = path.join(dir, 'community_world_core_audit_mapping_fixtures.jsonl');
    const mappingText = mappings.map((row) => JSON.stringify(row)).join('\n');
    fs.writeFileSync(mappingFile, mutateText?.(mappingText) || mappingText);
    return fn(dir, mappingFile);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function reportPasses(mutator, mutateText) {
  return withFixtureDir(mutator, (fixtureDir, mappingFile) => (
    buildCommunityWorldAuditMappingValidationReport({ fixtureDir, mappingFile }).ok
  ), mutateText);
}

function reportFails(mutator, mutateText) {
  return !reportPasses(mutator, mutateText);
}

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail' };
  } catch {
    return { name, status: 'fail' };
  }
}

const cases = [
  test('valid_minimal_mapping_set_passes', () => reportPasses()),
  test('mapping_missing_required_field_fails', () => reportFails((files, mappings) => { delete mappings[0].trace_id; })),
  test('mapping_invalid_jsonl_line_fails', () => reportFails(null, (text) => text.replace(/\n/, '\n{bad json}\n'))),
  test('mapping_duplicate_id_fails', () => reportFails((files, mappings) => { mappings[1].mapping_id = mappings[0].mapping_id; })),
  test('mapping_unknown_auditor_fails', () => reportFails((files, mappings) => { mappings[0].audit_auditor = 'unknown_auditor'; })),
  test('mapping_invalid_verdict_fails', () => reportFails((files, mappings) => { mappings[0].expected_verdict = 'maybe'; })),
  test('mapping_invalid_severity_fails', () => reportFails((files, mappings) => { mappings[0].expected_severity = 'severe'; })),
  test('mapping_classification_only_false_fails', () => reportFails((files, mappings) => { mappings[0].classification_only = false; })),
  test('mapping_missing_expected_actions_fails', () => reportFails((files, mappings) => { delete mappings[0].expected_actions.human_review; })),
  test('mapping_unknown_source_fixture_fails', () => reportFails((files, mappings) => { mappings[0].source_fixture_id = 'missing_source_fixture'; })),
  test('mapping_source_group_mismatch_fails', () => reportFails((files, mappings) => { mappings[0].source_fixture_group = 'negative'; })),
  test('mapping_missing_k1001_k1020_coverage_fails', () => reportFails((files, mappings) => { for (const row of mappings) row.k_ids = ['K1001']; })),
  test('mapping_missing_auditor_coverage_fails', () => reportFails((files, mappings) => { for (const row of mappings) row.audit_auditor = 'safety_risk'; })),
  test('mapping_positive_with_redline_issue_code_fails', () => reportFails((files, mappings) => { mappings[0].expected_issue_codes = ['adapter_boundary_violation']; })),
  test('mapping_production_ready_true_fails', () => reportFails((files, mappings) => { mappings[0].safe_rationale = 'production_ready_true'; })),
  test('mapping_private_viewer_id_value_fails', () => reportFails((files, mappings) => { mappings[0].safe_rationale = 'private_viewer_id_value'; })),
  test('real_mapping_files_pass', () => (
    process.env.CODEX_COMMUNITY_WORLD_AUDIT_MAPPING_SELF_TEST_SKIP_REAL === '1'
      ? true
      : buildCommunityWorldAuditMappingValidationReport().ok
  )),
];

const failures = cases.filter((item) => item.status !== 'pass');
if (failures.length) {
  console.log(JSON.stringify({
    ok: false,
    validatorSelfTestStatus: 'fail',
    failureCount: failures.length,
    failures: failures.slice(0, 20).map((item) => ({ name: item.name })),
    rawFixturePrinted: false,
    rawLogsRead: false,
    rawDiffRead: false,
    priority1Status: 'BLOCKED',
  }, null, 2));
  process.exit(1);
}

console.log('Community World audit mapping validator self-test: pass');
