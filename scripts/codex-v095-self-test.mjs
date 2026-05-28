#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.9.5

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { marker, HARNESS_VERSION, scanObjectForUnsafe, writeJsonReport, exitFor } from './codex-v080-lib.mjs';
import { classifyChange } from './codex-change-classification-gate.mjs';
import { buildProductVerificationEvidenceReport } from './codex-product-verification-evidence-normalize.mjs';
import { buildProductVerificationReport } from './codex-product-verification-gate.mjs';
import { buildRemoteProductBaselineReport } from './codex-remote-product-baseline-gate.mjs';
import { buildRemoteNpmDiagnosticReport } from './codex-remote-npm-diagnostic-classify.mjs';
import { buildPrProfileReport } from './codex-pr-profile-gate.mjs';
import { buildCodeReviewMonitorReport } from './codex-code-review-monitor.mjs';
import { buildComplexityGovernanceReport } from './codex-complexity-governance-gate.mjs';
import { buildStalePrAuditReport } from './codex-stale-pr-audit-gate.mjs';
import {
  buildAgentsDoctrineReport,
  buildSkillRoutingReport,
  buildSkillLoadBudgetReport,
  buildSkillDriftReport,
  buildAgentSessionGovernanceReport,
  buildAgentContainmentBoundaryReport,
  buildEvalTraceHarvestReport,
  buildOperatorVisibleDeltaReport,
  buildTraceToEvalCandidateReport,
  buildSubagentGovernanceReport,
  buildSubagentReviewMatrixReport,
  buildPrismaStateMachineSchemaReport,
  buildStateTransitionHelperReport,
  buildReceiptEvidenceSchemaReport,
  buildWorkerReadinessSequenceReport,
  buildEvidenceMinimalityReport,
  buildEvidenceDedupReport,
  buildSafeArtifactNextActionReport,
  buildSkillEvidenceLinkReport,
} from './codex-v095-gate-lib.mjs';

const HEAD = '1234567890abcdef1234567890abcdef12345678';
const OTHER = 'abcdef1234567890abcdef1234567890abcdef12';
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(here);

function assertCase(id, condition, failures, cases, actualStatus = 'pass', reasonCodes = []) {
  cases.push({ id, status: condition ? 'pass' : 'fail', actualStatus, reasonCodes, safeSummaryOnly: true });
  if (!condition) failures.push(id);
}

function statusOf(report, key) {
  return report[key]?.status || report.status || 'missing';
}

function reasonsOf(report, key) {
  return report[key]?.reasonCodes || [];
}

function productEvidence(result = 'pass') {
  return {
    schemaVersion: '0.8.3',
    harnessVersion: HARNESS_VERSION,
    repository: 'example/repo',
    prNumber: '112',
    headSha: HEAD,
    source: 'remote',
    commands: [{
      name: 'npm test',
      required: true,
      result,
      source: 'remote',
      durationMs: 1000,
      testCount: null,
      safeSummary: result === 'pass'
        ? 'remote product verification completed with safe pass status'
        : 'remote product verification completed with safe fail status',
    }],
    safeSummaryOnly: true,
    rawValuesStored: false,
  };
}

function remoteBaseline(result = 'pass') {
  return {
    schemaVersion: '0.8.3',
    harnessVersion: HARNESS_VERSION,
    repository: 'example/repo',
    baseSha: OTHER,
    baselineType: 'npm_test',
    commands: [{ name: 'npm test', result }],
    result,
    date: '2026-05-28T00:00:00.000Z',
    source: 'remote',
    safeSummary: result === 'pass'
      ? 'remote product baseline completed with safe pass status'
      : 'remote product baseline completed with safe fail status',
    knownFailures: result === 'fail' ? ['test_assertion_failure'] : [],
    expiresAt: '2099-01-01T00:00:00.000Z',
    rawValuesStored: false,
    safeSummaryOnly: true,
  };
}

function withRemoteProductEvidence(result, callback) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-v095-product-evidence-'));
  const evidencePath = path.join(tmp, 'codex-product-verification-evidence.safe.json');
  const baselinePath = path.join(tmp, 'codex-remote-product-baseline.safe.json');
  fs.writeFileSync(evidencePath, JSON.stringify(productEvidence(result), null, 2));
  fs.writeFileSync(baselinePath, JSON.stringify(remoteBaseline(result), null, 2));
  const env = {
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_REPOSITORY: 'example/repo',
    CODEX_PR_NUMBER: '112',
    CODEX_PR_HEAD_SHA: HEAD,
    CODEX_PR_BASE_SHA: OTHER,
    CODEX_SKIP_NPM: '0',
    CODEX_PRODUCT_VERIFICATION_EVIDENCE_PATH: evidencePath,
    CODEX_REMOTE_PRODUCT_BASELINE_PATH: baselinePath,
    CODEX_PRODUCT_VERIFICATION_COMMANDS: 'npm test',
    CODEX_PRODUCT_VERIFICATION_RESULT: result,
    CODEX_PRODUCT_VERIFICATION_SOURCE: 'remote',
  };
  try {
    return callback(env);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function workflowText() {
  return fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'quality-gate.yml'), 'utf8');
}

function pr112LikeBody(overrides = {}) {
  const omit = new Set(overrides.omit || []);
  const section = (name, text) => omit.has(name) ? '' : `\n## ${name}\n${text}\n`;
  return `PR profile: product_r3
Task mode: bugfix
Risk level: R3
${section('Goal', 'Update the v0.9.5 baseline source manifest fixture expectation only.')}
${section('Files or scope', 'Changed files:\ndocs/process/CODEX_CLASSIFICATION_REGISTRY.json\nscripts/codex-v085-self-test.mjs\nscripts/run-tests.js')}
${section('Product verification', 'Product verification commands: npm test.\nProduct verification result: PASS, 470 tests.\nRemote product verification evidence: present.\nRemote product baseline: PASS.\nRemote npm diagnostic: PASS.')}
${section('Affected entrypoints', 'Repository test runner surface: scripts/run-tests.js.\nRuntime entrypoints changed: no.\nPublic API changed: no.\nAdmin API changed: no.\nAdapter API changed: no.')}
${section('Failure paths considered', 'Target repo source manifest absence could be incorrectly treated as a baseline failure.\nscripts/run-tests.js could lose product-relevant classification.\nProduction readiness could be accidentally claimed from fixture/local/remote gate success.')}
${section('API / Contract Compatibility Summary', 'API surface changed: no.\nRuntime API behavior changed: no.\nRequest/response compatibility changed: no.\nRuntime route behavior changed: no.\nPublic API changed: no.\nAdmin API changed: no.\nAdapter API changed: no.\nExternal integration API changed: no.')}
${section('Solvability', overrides.vagueSolvability ? 'no problem' : 'Solvability: pass.\nExecution interface: local Node validation and GitHub Actions quality-gate.\nAlgorithmic artifact: deterministic fixture update and classification follow-through.\nExternal services required: no.\nProduction runtime required: no.\nRemaining required verification: same-head remote quality gate.')}
${section('Task Contract', 'Task Mode: bugfix\nGoal: update the source manifest baseline fixture while preserving product-relevant classification for scripts/run-tests.js.\nDone criteria: npm test PASS 470 tests; current self-test PASS; target gate PASS score 95.\nVerification surface: source manifest fixture, classification registry follow-through, v085 fixture context.\nRisk surface: product-relevant test runner classification, harness fixture behavior.\nAllowed scope: docs/process/CODEX_CLASSIFICATION_REGISTRY.json, scripts/codex-v085-self-test.mjs, scripts/run-tests.js.\nForbidden scope: docs/iris files, workflows, src runtime code, AGENTS.md, Postgres files.\nStop condition: stop if same-head remote quality gate fails.')}
${section('Load-bearing evidence', 'Component: v0.9.5 baseline source manifest fixture.\nIssue mode covered: target repository incorrectly treated as requiring CODEX_SOURCE_HARNESS_MANIFEST.json.\nPositive fixture: scripts/run-tests.js remains product-relevant and requires product verification.\nNegative fixture: source harness manifest expectations remain guarded.')}
${section('Test Coverage Evidence', 'Changed area: source manifest fixture baseline and v085 fixture context.\nTest command: npm test.\nWhat the test covers: target source manifest fixture path and classification registry follow-through.')}
${section('Best of N Evidence', 'Candidate count: 2\nSelected candidate: narrow source manifest fixture update with scripts/run-tests.js product-relevant classification intact.\nReason selected: preserves product verification requirements.\nRejected candidate: force CODEX_HARNESS_MANIFEST.json back into the PR after rebase.\nReason rejected: latest main no longer requires that file in this PR shape.')}
${section('Complexity Governance', 'Complexity regime: high.\nOracle required: yes.\nOracle provided: npm test PASS 470 tests, current self-test PASS, classification coverage PASS.')}
${section('Fast Path / Full Verification', 'Fast path used: no.\nFull verification required: yes.\nFull local verification was run for current head.\nNo CODEX_SKIP_NPM sweetening was used.')}
${section('Import Smoke Config', 'Import smoke config: present.\nImport smoke status: pass.\nImport smoke scope: changed scripts only.\nChanged scripts:\nscripts/codex-v085-self-test.mjs\nscripts/run-tests.js\nImport/syntax verification:\nnode --check scripts/codex-v085-self-test.mjs PASS\nnode --check scripts/run-tests.js PASS\nRuntime import surface changed: no.')}
${section('Runtime Risk Register', 'Runtime risk register: present.\nRuntime behavior changed: no.\nRuntime readiness claimed: no.\nProduction readiness claimed: no.\nProduction go: no.\npriority1 remains BLOCKED.\nRuntime risks closed by this PR: none.\nRuntime risks introduced by this PR: none.')}
${section('Code Review Monitor', 'Writer evidence: present.\nReviewer checklist: present.\nIndependent checklist: present.\nReview scope: source manifest fixture baseline update, scripts/run-tests.js product-relevant test surface.')}
${section('Evidence Integrity', 'Base SHA: abcdef1234567890abcdef1234567890abcdef12\nHead SHA: 1234567890abcdef1234567890abcdef12345678\nCurrent head local evidence: pass.\nRemote product verification evidence: present.\nRemote product baseline: pass.\nRaw logs read: no.\nRaw diff pasted: no.')}
${section('Remote/Local Evidence', 'Local checks PASS on current head 1234567890abcdef1234567890abcdef12345678.\nRemote product verification evidence present: yes.\nRemote product baseline: pass.\nRemote npm diagnostic: pass.')}
${section('R3 confirmation', 'profile: product_r3\nriskLevel: R3\nbaseMainSha: abcdef1234567890abcdef1234567890abcdef12\nheadSha: 1234567890abcdef1234567890abcdef12345678\nconfirmedBy: project-owner\nreviewedItems:\nremote product verification evidence present\nremote product baseline PASS\nremote npm diagnostic PASS\nno runtime product behavior change\nno API surface behavior change\nno production go\npriority1 remains BLOCKED')}
${section('Residual risks', 'Runtime readiness is not claimed.\nProduction readiness is not claimed.\npriority1 remains BLOCKED.')}

Human confirmation needed:
yes.

BEGIN_CODEX_MANUAL_CONFIRMATION_JSON
{"codexManualConfirmation":{"target":"pull_request","repository":"example/repo","prNumber":"112","headSha":"1234567890abcdef1234567890abcdef12345678","riskLevel":"R3","confirmedByRole":"project-owner","reviewedItems":["remote product verification evidence present","remote product baseline PASS","remote npm diagnostic PASS","no production go","priority1 remains BLOCKED"],"qualityGateNotWeakened":true,"riskLevelNotLowered":true}}
END_CODEX_MANUAL_CONFIRMATION_JSON`;
}

function runV085StatusForBody(body) {
  const result = spawnSync(process.execPath, ['scripts/codex-v085-stability-gate.mjs'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CODEX_EVENT_NAME: 'pull_request',
      CODEX_PR_BODY: body,
      CODEX_CHANGED_FILES: 'docs/process/CODEX_CLASSIFICATION_REGISTRY.json\nscripts/codex-v085-self-test.mjs\nscripts/run-tests.js',
      CODEX_QUALITY_REPORT: 'json',
      CODEX_V085_STABILITY_REPORT: 'json',
      CODEX_PRODUCT_VERIFICATION_JSON: JSON.stringify({ productVerificationStatus: { status: 'pass', reasonCodes: [], safeSummaryOnly: true } }),
      CODEX_FAST_PATH_JSON: JSON.stringify({ fastPathStatus: { status: 'pass', fastPathAllowed: false, reasonCodes: [], safeSummaryOnly: true } }),
    },
  });
  try {
    return JSON.parse(result.stdout).v085StabilityStatus;
  } catch {
    return { status: 'fail', reasonCodes: ['unexpected_error'], safeSummaryOnly: true };
  }
}

export function buildV095SelfTestReport() {
  const failures = [];
  const cases = [];
  let report;

  report = buildAgentsDoctrineReport({ doctrineSectionExists: true, routingMapExists: true, docsProcessLinksExist: true, size: 1800 });
  assertCase('agents_doctrine_short_map_pass', statusOf(report, 'agentsDoctrineStatus') === 'pass', failures, cases, statusOf(report, 'agentsDoctrineStatus'), reasonsOf(report, 'agentsDoctrineStatus'));
  report = buildAgentsDoctrineReport({ doctrineSectionExists: true, routingMapExists: true, docsProcessLinksExist: true, largeManual: true });
  assertCase('agents_doctrine_large_manual_fails', statusOf(report, 'agentsDoctrineStatus') === 'fail', failures, cases, statusOf(report, 'agentsDoctrineStatus'), reasonsOf(report, 'agentsDoctrineStatus'));
  report = buildAgentsDoctrineReport({ doctrineSectionExists: true, routingMapExists: true, docsProcessLinksExist: true, policyBodyInAgents: false });
  assertCase('agents_doctrine_policy_in_docs_pass', statusOf(report, 'agentsDoctrineStatus') === 'pass', failures, cases, statusOf(report, 'agentsDoctrineStatus'), reasonsOf(report, 'agentsDoctrineStatus'));

  report = buildSkillRoutingReport({ taskMode: 'target_rollout', selectedSkills: ['target-harness', 'evidence-integrity'] });
  assertCase('skill_routing_harness_rollout_limited_skills_pass', statusOf(report, 'skillRoutingStatus') === 'pass', failures, cases, statusOf(report, 'skillRoutingStatus'), reasonsOf(report, 'skillRoutingStatus'));
  report = buildSkillRoutingReport({ selectedSkills: ['a', 'b', 'c', 'd', 'e', 'f'] });
  assertCase('skill_routing_too_many_skills_fails', statusOf(report, 'skillRoutingStatus') === 'fail', failures, cases, statusOf(report, 'skillRoutingStatus'), reasonsOf(report, 'skillRoutingStatus'));
  report = buildSkillRoutingReport({ riskClasses: ['runtime_relevant'], selectedSkills: ['evidence-integrity'] });
  assertCase('skill_routing_runtime_pr_requires_runtime_safety', statusOf(report, 'skillRoutingStatus') === 'fail', failures, cases, statusOf(report, 'skillRoutingStatus'), reasonsOf(report, 'skillRoutingStatus'));

  report = buildSkillLoadBudgetReport({ loadedSkillCount: 6 });
  assertCase('skill_load_budget_more_than_five_fails', statusOf(report, 'skillLoadBudgetStatus') === 'fail', failures, cases, statusOf(report, 'skillLoadBudgetStatus'), reasonsOf(report, 'skillLoadBudgetStatus'));
  report = buildSkillDriftReport({ oldHarnessVersion: true });
  assertCase('skill_drift_old_marker_fails', statusOf(report, 'skillDriftStatus') === 'fail', failures, cases, statusOf(report, 'skillDriftStatus'), reasonsOf(report, 'skillDriftStatus'));
  report = buildSkillDriftReport({ targetHotfixPreserved: true });
  assertCase('skill_drift_target_hotfix_preserved_pass', statusOf(report, 'skillDriftStatus') === 'pass', failures, cases, statusOf(report, 'skillDriftStatus'), reasonsOf(report, 'skillDriftStatus'));

  report = buildAgentSessionGovernanceReport({ forceCheck: true, sameBranchMultiplePushers: true });
  assertCase('agent_session_parallel_same_branch_fails', statusOf(report, 'agentSessionGovernanceStatus') === 'fail', failures, cases, statusOf(report, 'agentSessionGovernanceStatus'), reasonsOf(report, 'agentSessionGovernanceStatus'));
  report = buildAgentSessionGovernanceReport({ forceCheck: true, needsInputMerged: true });
  assertCase('agent_session_needs_input_merge_fails', statusOf(report, 'agentSessionGovernanceStatus') === 'fail', failures, cases, statusOf(report, 'agentSessionGovernanceStatus'), reasonsOf(report, 'agentSessionGovernanceStatus'));

  report = buildAgentContainmentBoundaryReport({});
  assertCase('agent_containment_external_content_untrusted_pass', statusOf(report, 'agentContainmentBoundaryStatus') === 'pass', failures, cases, statusOf(report, 'agentContainmentBoundaryStatus'), reasonsOf(report, 'agentContainmentBoundaryStatus'));
  report = buildAgentContainmentBoundaryReport({ egressCapabilityMissing: true });
  assertCase('agent_containment_egress_capability_missing_fails', statusOf(report, 'agentContainmentBoundaryStatus') === 'fail', failures, cases, statusOf(report, 'agentContainmentBoundaryStatus'), reasonsOf(report, 'agentContainmentBoundaryStatus'));
  report = buildAgentContainmentBoundaryReport({ writePermissionForReadOnly: true });
  assertCase('agent_containment_write_permission_for_readonly_fails', statusOf(report, 'agentContainmentBoundaryStatus') === 'fail', failures, cases, statusOf(report, 'agentContainmentBoundaryStatus'), reasonsOf(report, 'agentContainmentBoundaryStatus'));

  report = buildEvalTraceHarvestReport({ forceCheck: true, observedBehavior: 'observed', safeScope: 'harness', doNotTouchList: ['src'] });
  assertCase('eval_trace_expected_observed_pair_required', statusOf(report, 'evalTraceHarvestStatus') === 'fail', failures, cases, statusOf(report, 'evalTraceHarvestStatus'), reasonsOf(report, 'evalTraceHarvestStatus'));
  report = buildEvalTraceHarvestReport({ forceCheck: true, observedBehavior: 'observed', expectedBehavior: 'expected', safeScope: 'harness', doNotTouchList: ['src'], rawProductionDataIncluded: true });
  assertCase('eval_trace_raw_production_data_fails', statusOf(report, 'evalTraceHarvestStatus') === 'fail', failures, cases, statusOf(report, 'evalTraceHarvestStatus'), reasonsOf(report, 'evalTraceHarvestStatus'));

  report = buildOperatorVisibleDeltaReport({ productVisibleChange: true });
  assertCase('operator_visible_delta_product_change_required', statusOf(report, 'operatorVisibleDeltaStatus') === 'fail', failures, cases, statusOf(report, 'operatorVisibleDeltaStatus'), reasonsOf(report, 'operatorVisibleDeltaStatus'));
  report = buildOperatorVisibleDeltaReport({ harnessOnly: true });
  assertCase('operator_visible_delta_harness_only_not_applicable', statusOf(report, 'operatorVisibleDeltaStatus') === 'not_applicable', failures, cases, statusOf(report, 'operatorVisibleDeltaStatus'), reasonsOf(report, 'operatorVisibleDeltaStatus'));

  report = buildTraceToEvalCandidateReport({ forceCheck: true, sourceEvidence: 'safe evidence', observedFailure: 'failure', expectedBehavior: 'expected', regressionEvalCommand: 'node test', safeScope: 'harness', doNotTouchList: ['src'] });
  assertCase('trace_to_eval_candidate_requires_targeted_eval', statusOf(report, 'traceToEvalCandidateStatus') === 'fail', failures, cases, statusOf(report, 'traceToEvalCandidateStatus'), reasonsOf(report, 'traceToEvalCandidateStatus'));
  report = buildTraceToEvalCandidateReport({ forceCheck: true, sourceEvidence: 'safe evidence', observedFailure: 'failure', expectedBehavior: 'expected', targetedEvalCommand: 'node test', safeScope: 'harness', doNotTouchList: ['src'] });
  assertCase('trace_to_eval_candidate_requires_regression_eval', statusOf(report, 'traceToEvalCandidateStatus') === 'fail', failures, cases, statusOf(report, 'traceToEvalCandidateStatus'), reasonsOf(report, 'traceToEvalCandidateStatus'));

  report = buildSubagentGovernanceReport({ riskClasses: ['security_relevant'], roles: ['evidence_integrity'] });
  assertCase('subagent_security_required_for_security_pr', statusOf(report, 'subagentGovernanceStatus') === 'fail', failures, cases, statusOf(report, 'subagentGovernanceStatus'), reasonsOf(report, 'subagentGovernanceStatus'));
  report = buildSubagentGovernanceReport({ riskClasses: ['runtime_relevant'], roles: ['evidence_integrity'] });
  assertCase('subagent_runtime_required_for_runtime_pr', statusOf(report, 'subagentGovernanceStatus') === 'fail', failures, cases, statusOf(report, 'subagentGovernanceStatus'), reasonsOf(report, 'subagentGovernanceStatus'));
  report = buildSubagentGovernanceReport({ forceCheck: true, rawOutputIncluded: true });
  assertCase('subagent_raw_output_forbidden', statusOf(report, 'subagentGovernanceStatus') === 'fail', failures, cases, statusOf(report, 'subagentGovernanceStatus'), reasonsOf(report, 'subagentGovernanceStatus'));
  report = buildSubagentGovernanceReport({ riskClasses: ['docs_only'], roles: [] });
  assertCase('subagent_docs_only_light_pass', statusOf(report, 'subagentGovernanceStatus') === 'pass', failures, cases, statusOf(report, 'subagentGovernanceStatus'), reasonsOf(report, 'subagentGovernanceStatus'));

  report = buildPrismaStateMachineSchemaReport({ forceCheck: true, processedBooleanOnly: true });
  assertCase('state_machine_processed_boolean_only_fails', statusOf(report, 'stateMachineSchemaStatus') === 'fail', failures, cases, statusOf(report, 'stateMachineSchemaStatus'), reasonsOf(report, 'stateMachineSchemaStatus'));
  report = buildPrismaStateMachineSchemaReport({ runtimeReadinessClaimed: true, fields: ['status', 'attempt', 'lockedBy', 'updatedAt'] });
  assertCase('state_machine_schema_fields_pass', statusOf(report, 'stateMachineSchemaStatus') === 'pass', failures, cases, statusOf(report, 'stateMachineSchemaStatus'), reasonsOf(report, 'stateMachineSchemaStatus'));

  report = buildStateTransitionHelperReport({ stateFieldsAdded: true });
  assertCase('state_transition_helper_missing_fails', statusOf(report, 'stateTransitionHelperStatus') === 'fail', failures, cases, statusOf(report, 'stateTransitionHelperStatus'), reasonsOf(report, 'stateTransitionHelperStatus'));
  report = buildStateTransitionHelperReport({ stateFieldsAdded: true, helperPresent: true, helperMutatesDbDirectly: true, transitionTestPresent: true, invalidTransitionTested: true, safeErrorStatesPresent: true });
  assertCase('state_transition_helper_mutates_db_fails', statusOf(report, 'stateTransitionHelperStatus') === 'fail', failures, cases, statusOf(report, 'stateTransitionHelperStatus'), reasonsOf(report, 'stateTransitionHelperStatus'));

  report = buildReceiptEvidenceSchemaReport({ forceCheck: true, privateKeyIncluded: true });
  assertCase('receipt_evidence_private_key_fails', statusOf(report, 'receiptEvidenceSchemaStatus') === 'fail', failures, cases, statusOf(report, 'receiptEvidenceSchemaStatus'), reasonsOf(report, 'receiptEvidenceSchemaStatus'));
  report = buildReceiptEvidenceSchemaReport({ receiptEvidencePresent: true, chainIdPresent: true, storagePolicyPresent: true });
  assertCase('receipt_evidence_safe_public_fields_pass', statusOf(report, 'receiptEvidenceSchemaStatus') === 'pass', failures, cases, statusOf(report, 'receiptEvidenceSchemaStatus'), reasonsOf(report, 'receiptEvidenceSchemaStatus'));

  report = buildWorkerReadinessSequenceReport({ workerRelevant: true, workerEntrypointBeforeSchemaHelper: true });
  assertCase('worker_readiness_wrong_sequence_fails', statusOf(report, 'workerReadinessSequenceStatus') === 'fail', failures, cases, statusOf(report, 'workerReadinessSequenceStatus'), reasonsOf(report, 'workerReadinessSequenceStatus'));
  report = buildWorkerReadinessSequenceReport({ workerRelevant: true });
  assertCase('worker_readiness_schema_first_pass', statusOf(report, 'workerReadinessSequenceStatus') === 'pass', failures, cases, statusOf(report, 'workerReadinessSequenceStatus'), reasonsOf(report, 'workerReadinessSequenceStatus'));

  report = buildEvidenceMinimalityReport({ rawLogsInPrBody: true });
  assertCase('evidence_minimality_raw_log_fails', statusOf(report, 'evidenceMinimalityStatus') === 'fail', failures, cases, statusOf(report, 'evidenceMinimalityStatus'), reasonsOf(report, 'evidenceMinimalityStatus'));
  report = buildEvidenceMinimalityReport({ harnessOnly: true });
  assertCase('evidence_minimality_harness_only_compact_pass', statusOf(report, 'evidenceMinimalityStatus') === 'pass', failures, cases, statusOf(report, 'evidenceMinimalityStatus'), reasonsOf(report, 'evidenceMinimalityStatus'));

  report = buildEvidenceDedupReport({ conflictingHeadSha: true });
  assertCase('evidence_dedup_conflicting_head_fails', statusOf(report, 'evidenceDedupStatus') === 'fail', failures, cases, statusOf(report, 'evidenceDedupStatus'), reasonsOf(report, 'evidenceDedupStatus'));
  report = buildSafeArtifactNextActionReport({ failureArtifact: true });
  assertCase('safe_artifact_next_action_missing_fails', statusOf(report, 'safeArtifactNextActionStatus') === 'fail', failures, cases, statusOf(report, 'safeArtifactNextActionStatus'), reasonsOf(report, 'safeArtifactNextActionStatus'));
  report = buildSafeArtifactNextActionReport({ failureArtifact: true, classification: 'body_only_repair' });
  assertCase('safe_artifact_next_action_body_only_pass', statusOf(report, 'safeArtifactNextActionStatus') === 'pass', failures, cases, statusOf(report, 'safeArtifactNextActionStatus'), reasonsOf(report, 'safeArtifactNextActionStatus'));

  report = buildSkillEvidenceLinkReport({ missingLink: true });
  assertCase('skill_evidence_link_missing_fails', statusOf(report, 'skillEvidenceLinkStatus') === 'fail', failures, cases, statusOf(report, 'skillEvidenceLinkStatus'), reasonsOf(report, 'skillEvidenceLinkStatus'));
  report = buildSkillEvidenceLinkReport({ oldEvidence: true });
  assertCase('skill_evidence_obsolete_warning', statusOf(report, 'skillEvidenceLinkStatus') === 'warning', failures, cases, statusOf(report, 'skillEvidenceLinkStatus'), reasonsOf(report, 'skillEvidenceLinkStatus'));

  const pr112Body = pr112LikeBody();
  report = buildPrProfileReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'docs/process/CODEX_CLASSIFICATION_REGISTRY.json\nscripts/codex-v085-self-test.mjs\nscripts/run-tests.js',
    CODEX_PR_BODY: pr112Body,
  });
  assertCase('pr112_like_current_sections_pass_profile_detection', report.prProfileStatus.status === 'pass' && report.prProfileStatus.inferredProfile === 'product_r3', failures, cases, report.prProfileStatus.status, report.prProfileStatus.reasonCodes);

  report = buildPrProfileReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_PR_BODY: pr112LikeBody({ omit: ['Failure paths considered'] }),
  });
  assertCase('pr112_like_missing_failure_paths_still_fails', report.prProfileStatus.status === 'fail' && report.prProfileStatus.reasonCodes.includes('missing_required_method_sections'), failures, cases, report.prProfileStatus.status, report.prProfileStatus.reasonCodes);

  let v085 = runV085StatusForBody(pr112Body);
  assertCase('pr112_like_import_smoke_config_section_passes', v085.importSmokeMicroStatus?.status === 'pass', failures, cases, v085.importSmokeMicroStatus?.status, v085.importSmokeMicroStatus?.reasonCodes);
  assertCase('pr112_like_runtime_risk_register_section_passes', v085.runtimeRiskRegisterStatus?.status === 'pass', failures, cases, v085.runtimeRiskRegisterStatus?.status, v085.runtimeRiskRegisterStatus?.reasonCodes);

  v085 = runV085StatusForBody(pr112LikeBody({ omit: ['Import Smoke Config'] }));
  assertCase('pr112_like_missing_import_smoke_section_still_fails', v085.importSmokeMicroStatus?.status !== 'pass' && v085.reasonCodes.includes('import_smoke_config_absent'), failures, cases, v085.importSmokeMicroStatus?.status, v085.reasonCodes);

  v085 = runV085StatusForBody(pr112LikeBody({ omit: ['Runtime Risk Register'] }));
  assertCase('pr112_like_missing_runtime_risk_register_still_fails', v085.runtimeRiskRegisterStatus?.status !== 'pass' && v085.reasonCodes.includes('runtime_risk_register_absent'), failures, cases, v085.runtimeRiskRegisterStatus?.status, v085.reasonCodes);

  report = buildComplexityGovernanceReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'docs/process/CODEX_CLASSIFICATION_REGISTRY.json\nscripts/codex-v085-self-test.mjs\nscripts/run-tests.js',
    CODEX_PR_BODY: pr112Body,
    CODEX_PRODUCT_VERIFICATION_JSON: JSON.stringify({ productVerificationStatus: { status: 'pass', reasonCodes: [], safeSummaryOnly: true } }),
  });
  assertCase('pr112_like_current_sections_pass_solvability', report.complexityGovernanceStatus.solvabilityStatus.status === 'pass', failures, cases, report.complexityGovernanceStatus.status, report.complexityGovernanceStatus.reasonCodes);

  report = buildComplexityGovernanceReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_PR_BODY: pr112LikeBody({ vagueSolvability: true }),
    CODEX_PRODUCT_VERIFICATION_JSON: JSON.stringify({ productVerificationStatus: { status: 'pass', reasonCodes: [], safeSummaryOnly: true } }),
  });
  assertCase('vague_solvability_text_does_not_pass', report.complexityGovernanceStatus.status !== 'pass', failures, cases, report.complexityGovernanceStatus.status, report.complexityGovernanceStatus.reasonCodes);

  report = buildComplexityGovernanceReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_PR_BODY: 'Task mode: harness_change\nGoal: target rollout with target repo changes\nForbidden scope: target repos\n## Task Contract\nDone criteria: done\nVerification surface: gate\nRisk surface: target rollout\nAllowed scope: source harness\nStop condition: stop\nOracle provided: test',
    CODEX_PRODUCT_VERIFICATION_JSON: JSON.stringify({ productVerificationStatus: { status: 'pass', reasonCodes: [], safeSummaryOnly: true } }),
  });
  assertCase('unresolved_solvability_conflict_wording_still_fails', report.complexityGovernanceStatus.reasonCodes.includes('solvability_constraints_conflict'), failures, cases, report.complexityGovernanceStatus.status, report.complexityGovernanceStatus.reasonCodes);

  report = buildPrProfileReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_PR_BODY: pr112Body.replace('PR profile: product_r3', 'PR profile: invalid_profile'),
  });
  assertCase('invalid_profile_still_fails', report.prProfileStatus.status === 'fail' && report.prProfileStatus.reasonCodes.includes('pr_profile_invalid'), failures, cases, report.prProfileStatus.status, report.prProfileStatus.reasonCodes);

  report = buildStalePrAuditReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_PR_HEAD_SHA: HEAD,
    CODEX_PR_BODY: pr112Body.replace(HEAD, OTHER),
  });
  assertCase('stale_head_evidence_still_fails', report.stalePrAuditStatus.status === 'fail' && report.stalePrAuditStatus.reasonCodes.includes('stale_confirmation_detected'), failures, cases, report.stalePrAuditStatus.status, report.stalePrAuditStatus.reasonCodes);

  report = buildCodeReviewMonitorReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_PR_BODY: pr112Body,
    CODEX_PRODUCT_VERIFICATION_JSON: JSON.stringify({ productVerificationStatus: { status: 'pass', reasonCodes: [], safeSummaryOnly: true } }),
    CODEX_V085_STABILITY_JSON: JSON.stringify({ v085StabilityStatus: { status: 'fail', bugfixEvidenceStatus: { status: 'fail', reasonCodes: ['bugfix_reproduction_missing'] }, reasonCodes: ['bugfix_reproduction_missing'], safeSummaryOnly: true } }),
  });
  assertCase('code_review_monitor_accepts_pr112_like_bugfix_body_evidence', report.codeReviewMonitorStatus.status !== 'fail', failures, cases, report.codeReviewMonitorStatus.status, report.codeReviewMonitorStatus.reasonCodes);

  const workflow = workflowText();
  const uploadBlock = workflow.slice(workflow.indexOf('Upload safe quality artifacts'));
  assertCase('remote_product_evidence_step_present', workflow.includes('Prepare remote product verification context'), failures, cases);
  assertCase('product_relevant_target_pr_clears_skip_npm', workflow.includes('CODEX_SKIP_NPM=0') && workflow.includes('productRequired'), failures, cases);
  assertCase('product_relevant_target_pr_gets_evidence_path', workflow.includes('CODEX_PRODUCT_VERIFICATION_EVIDENCE_PATH='), failures, cases);
  assertCase('product_relevant_target_pr_gets_remote_baseline_path', workflow.includes('CODEX_REMOTE_PRODUCT_BASELINE_PATH='), failures, cases);
  assertCase('product_relevant_target_pr_gets_remote_package_diagnostic_path', workflow.includes('CODEX_REMOTE_NPM_DIAGNOSTIC_PATH='), failures, cases);
  assertCase('uploaded_artifact_allowlist_excludes_raw_package_log', !/(raw[-_ ]?npm|npm[-_ ]?(?:raw[-_ ]?)?log|remote-npm-output)/i.test(uploadBlock), failures, cases);
  assertCase('uploaded_artifact_allowlist_includes_product_evidence', uploadBlock.includes('codex-product-verification-evidence.safe.json'), failures, cases);
  assertCase('uploaded_artifact_allowlist_includes_remote_baseline', uploadBlock.includes('codex-remote-product-baseline.safe.json'), failures, cases);
  assertCase('uploaded_artifact_allowlist_includes_remote_npm_diagnostic', uploadBlock.includes('codex-remote-npm-diagnostic.safe.json'), failures, cases);

  const pr112Classification = classifyChange(['scripts/run-tests.js'], { CODEX_EVENT_NAME: 'pull_request' });
  assertCase('pr112_like_changed_files_require_remote_product_evidence', pr112Classification.productRelevantChanged === true, failures, cases, pr112Classification.status, pr112Classification.reasonCodes);
  assertCase('safe_product_evidence_contains_no_unsafe_values', scanObjectForUnsafe(productEvidence('pass')).length === 0 && scanObjectForUnsafe(remoteBaseline('pass')).length === 0, failures, cases);

  withRemoteProductEvidence('pass', (env) => {
    report = buildProductVerificationEvidenceReport(env);
    assertCase('package_test_pass_fixture_writes_pass_evidence', report.productVerificationEvidenceStatus.status === 'pass', failures, cases, report.productVerificationEvidenceStatus.status, report.productVerificationEvidenceStatus.reasonCodes);
    report = buildRemoteProductBaselineReport(env);
    assertCase('package_test_pass_fixture_writes_pass_baseline', report.remoteProductBaselineStatus.status === 'pass' && report.remoteProductBaselineStatus.baselineResult === 'pass', failures, cases, report.remoteProductBaselineStatus.status, report.remoteProductBaselineStatus.reasonCodes);
    report = buildProductVerificationReport(env);
    assertCase('product_relevant_remote_evidence_passes_without_skip', report.productVerificationStatus.status === 'pass' && env.CODEX_SKIP_NPM !== '1', failures, cases, report.productVerificationStatus.status, report.productVerificationStatus.reasonCodes);
  });

  withRemoteProductEvidence('fail', (env) => {
    report = buildProductVerificationEvidenceReport(env);
    const failedCommand = report.productVerificationEvidenceStatus.normalizedEvidence?.commands?.some((item) => item.result === 'fail');
    assertCase('package_test_fail_fixture_writes_fail_evidence', failedCommand === true, failures, cases, report.productVerificationEvidenceStatus.status, report.productVerificationEvidenceStatus.reasonCodes);
    report = buildRemoteProductBaselineReport(env);
    assertCase('package_test_fail_fixture_writes_fail_baseline', report.remoteProductBaselineStatus.baselineResult === 'fail', failures, cases, report.remoteProductBaselineStatus.status, report.remoteProductBaselineStatus.reasonCodes);
    report = buildProductVerificationReport(env);
    assertCase('package_test_fail_fixture_forces_gate_failure', report.productVerificationStatus.status !== 'pass' && report.productVerificationStatus.reasonCodes.includes('baseline_failure'), failures, cases, report.productVerificationStatus.status, report.productVerificationStatus.reasonCodes);
  });

  report = buildRemoteNpmDiagnosticReport({
    CODEX_NPM_TEST_SAFE_SUMMARY_JSON: JSON.stringify({
      npmExitCode: 1,
      safeFailureCategory: 'test_assertion_failure',
      nodeMajor: 20,
      platform: 'ubuntu-latest',
      packageManager: 'npm',
      commandClass: 'npm_test',
      safeSummaryOnly: true,
    }),
  });
  assertCase('remote_package_diagnostic_safe_object_passes', report.remoteNpmDiagnosticStatus.status === 'pass', failures, cases, report.remoteNpmDiagnosticStatus.status, report.remoteNpmDiagnosticStatus.reasonCodes);

  report = buildProductVerificationReport({
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_CHANGED_FILES: 'scripts/codex-local-quality-gate.mjs',
    CODEX_SKIP_NPM: '1',
  });
  assertCase('harness_only_target_pr_allows_safe_skip_path', report.productVerificationStatus.status === 'pass', failures, cases, report.productVerificationStatus.status, report.productVerificationStatus.reasonCodes);

  report = buildSkillRoutingReport({ taskMode: 'harness_change', selectedSkills: ['harness', 'evidence'] });
  assertCase('source_harness_only_v095_fixture_pass', statusOf(report, 'skillRoutingStatus') === 'pass', failures, cases, statusOf(report, 'skillRoutingStatus'), reasonsOf(report, 'skillRoutingStatus'));
  report = buildSkillRoutingReport({ taskMode: 'target_rollout', selectedSkills: ['target-harness', 'evidence-integrity'] });
  assertCase('target_harness_rollout_v095_fixture_pass', statusOf(report, 'skillRoutingStatus') === 'pass', failures, cases, statusOf(report, 'skillRoutingStatus'), reasonsOf(report, 'skillRoutingStatus'));

  const unsafe = scanObjectForUnsafe(cases);
  const status = failures.length || unsafe.length ? 'fail' : 'pass';
  return {
    marker,
    harnessVersion: HARNESS_VERSION,
    status,
    v095SelfTestStatus: {
      status,
      suite: 'v095',
      caseCount: cases.length,
      failedCaseCount: failures.length,
      failedCases: failures,
      cases,
      reasonCodes: unsafe.length ? ['unsafe_output_detected'] : [],
      safeSummaryOnly: true,
    },
    cases,
    safeSummaryOnly: true,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = buildV095SelfTestReport();
  writeJsonReport(report, 'CODEX_V095_SELF_TEST_REPORT');
  exitFor(report);
}
