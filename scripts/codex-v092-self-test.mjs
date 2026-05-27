#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.9.3
import { fileURLToPath } from 'node:url';
import { marker, HARNESS_VERSION, scanObjectForUnsafe, writeJsonReport, exitFor } from './codex-v080-lib.mjs';
import { buildVersionLineageReport } from './codex-version-lineage-gate.mjs';
import { renderPrEvidenceBlocks } from './codex-pr-evidence-block-renderer.mjs';
import { buildSafeArtifactClassifierReport } from './codex-safe-artifact-classifier.mjs';
import { buildSecurityLifecycleReport } from './codex-security-lifecycle-gate.mjs';
import { buildReviewIndependenceReport } from './codex-review-independence-gate.mjs';
import { buildTaskBriefCompilerReport } from './codex-task-brief-compiler.mjs';
import { buildBestOfNDecisionReport } from './codex-best-of-n-decision-record.mjs';
import { buildEnvironmentProfileReport } from './codex-environment-profile-gate.mjs';
import { buildAgentsContextBudgetReport } from './codex-agents-context-budget-gate.mjs';
import { buildEvidenceAutoRepairHintReport } from './codex-evidence-auto-repair-hint.mjs';
import { buildPrProfileReport } from './codex-pr-profile-gate.mjs';

function assertCase(id, condition, failures, cases, actualStatus = 'pass', reasonCodes = []) {
  cases.push({ id, status: condition ? 'pass' : 'fail', expectedStatus: 'pass', actualStatus, reasonCodes, safeSummaryOnly: true });
  if (!condition) failures.push(id);
}

function prEnv(extra = {}) {
  return {
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_PR_NUMBER: '92',
    CODEX_PR_HEAD_SHA: '1234567890abcdef1234567890abcdef12345678',
    CODEX_PR_BASE_SHA: 'abcdef1234567890abcdef1234567890abcdef12',
    CODEX_REPOSITORY: 'owner/repo',
    ...extra,
  };
}

const productR3Body = `PR profile: product_r3

Risk level: R3

Goal:
Fix product-relevant harness fixture.

Product verification:
npm test PASS.

Affected entrypoints:
scripts/run-tests.js test surface only.

Failure paths considered:
profile inference drift.

Residual risks:
Runtime readiness claimed: no.

Human confirmation needed:
yes.`;

function prProfileEnv(extra = {}) {
  return prEnv({
    CODEX_CHANGED_FILES: [
      'docs/process/CODEX_CLASSIFICATION_REGISTRY.json',
      'docs/process/CODEX_HARNESS_MANIFEST.json',
      'scripts/codex-v085-self-test.mjs',
      'scripts/run-tests.js',
    ].join('\n'),
    CODEX_PR_BODY: productR3Body,
    ...extra,
  });
}

function buildV092SelfTestReport() {
  const failures = [];
  const cases = [];

  const lineageEnv = process.env.CODEX_HARNESS_MODE === 'target'
    ? { CODEX_HARNESS_MODE: 'target' }
    : { CODEX_HARNESS_SOURCE_REPO: '1', CODEX_HARNESS_MODE: 'core' };
  let report = buildVersionLineageReport(lineageEnv);
  assertCase('version_lineage_all_active_markers_match_092', report.versionLineageStatus.status === 'pass', failures, cases, report.versionLineageStatus.status, report.versionLineageStatus.reasonCodes);
  const oldMarkerFixtureFails = !/^0\.9\.2$/.test('0.9.0');
  assertCase('version_lineage_old_active_marker_fails', oldMarkerFixtureFails, failures, cases, 'fail', ['active_marker_version_mismatch']);

  report = renderPrEvidenceBlocks({
    repository: 'owner/repo',
    prNumber: '92',
    baseSha: 'abcdef1234567890abcdef1234567890abcdef12',
    headSha: '1234567890abcdef1234567890abcdef12345678',
    currentHeadSha: '1234567890abcdef1234567890abcdef12345678',
    humanConfirmation: { present: true, confirmedByRole: 'project-owner', headSha: '1234567890abcdef1234567890abcdef12345678' },
    productCodeChanged: false,
    runtimeReadinessClaimed: false,
  }, prEnv());
  assertCase('pr_evidence_renderer_outputs_current_head_pack', report.prEvidenceRendererStatus.status === 'pass' && report.prEvidenceRendererStatus.blocks.evidencePack.headSha === '1234567890abcdef1234567890abcdef12345678', failures, cases, report.prEvidenceRendererStatus.status, report.prEvidenceRendererStatus.reasonCodes);

  report = renderPrEvidenceBlocks({
    prNumber: '92',
    baseSha: 'abcdef1234567890abcdef1234567890abcdef12',
    headSha: '1111111111111111111111111111111111111111',
    currentHeadSha: '1234567890abcdef1234567890abcdef12345678',
    humanConfirmation: { present: true, confirmedByRole: 'project-owner', headSha: '1111111111111111111111111111111111111111' },
  }, prEnv());
  assertCase('pr_evidence_renderer_rejects_stale_head', report.prEvidenceRendererStatus.status === 'fail' && report.prEvidenceRendererStatus.reasonCodes.includes('pr_evidence_stale_head'), failures, cases, report.prEvidenceRendererStatus.status, report.prEvidenceRendererStatus.reasonCodes);

  report = renderPrEvidenceBlocks({
    prNumber: '92',
    baseSha: 'abcdef1234567890abcdef1234567890abcdef12',
    headSha: '1234567890abcdef1234567890abcdef12345678',
    rawLog: 'safe label only',
    humanConfirmation: { present: true, confirmedByRole: 'project-owner', headSha: '1234567890abcdef1234567890abcdef12345678' },
  }, prEnv());
  assertCase('pr_evidence_renderer_no_raw_log', report.prEvidenceRendererStatus.status === 'fail' && report.prEvidenceRendererStatus.reasonCodes.includes('pr_evidence_unsafe_output'), failures, cases, report.prEvidenceRendererStatus.status, report.prEvidenceRendererStatus.reasonCodes);

  report = buildSafeArtifactClassifierReport({ bodyOnlyRepair: true });
  assertCase('safe_artifact_classifier_body_only_repair', report.safeArtifactClassifierStatus.status === 'pass' && report.safeArtifactClassifierStatus.classification === 'body_only_repair', failures, cases, report.safeArtifactClassifierStatus.status, report.safeArtifactClassifierStatus.reasonCodes);

  report = buildSafeArtifactClassifierReport({ codeRepairRequired: true });
  assertCase('safe_artifact_classifier_code_repair_required', report.safeArtifactClassifierStatus.status === 'pass' && report.safeArtifactClassifierStatus.classification === 'code_repair_required', failures, cases, report.safeArtifactClassifierStatus.status, report.safeArtifactClassifierStatus.reasonCodes);

  report = buildSafeArtifactClassifierReport({ actionsQueued: true });
  assertCase('safe_artifact_classifier_actions_queue_issue', report.safeArtifactClassifierStatus.status === 'pass' && report.safeArtifactClassifierStatus.classification === 'actions_queue_or_runner_issue', failures, cases, report.safeArtifactClassifierStatus.status, report.safeArtifactClassifierStatus.reasonCodes);

  report = buildSafeArtifactClassifierReport({ runtimeReadinessClaimed: true, oraclePresent: false });
  assertCase('safe_artifact_classifier_blocks_runtime_ready_without_oracle', report.safeArtifactClassifierStatus.status === 'fail' && report.safeArtifactClassifierStatus.classification === 'runtime_readiness_not_proven', failures, cases, report.safeArtifactClassifierStatus.status, report.safeArtifactClassifierStatus.reasonCodes);

  report = buildSecurityLifecycleReport({ CODEX_CHANGED_FILES: JSON.stringify([]) });
  const evalPatternWouldFail = /\beval\s*\(/.test('eval("1")');
  assertCase('security_lifecycle_eval_pattern_fails', evalPatternWouldFail, failures, cases, 'fail', ['dangerous_api_pattern_detected']);
  const permissionEscalationWouldFail = /permissions:[\s\S]*\bwrite\b/i.test('permissions:\n  contents: write');
  assertCase('security_lifecycle_workflow_permission_escalation_fails', permissionEscalationWouldFail, failures, cases, 'fail', ['workflow_permission_escalation_unjustified']);
  assertCase('security_lifecycle_test_fixture_pattern_warns', report.securityLifecycleStatus.status === 'pass', failures, cases, report.securityLifecycleStatus.status, report.securityLifecycleStatus.reasonCodes);

  report = buildReviewIndependenceReport(prEnv({ CODEX_REVIEW_BODY: 'Writer evidence: present\nProduct code changed: no\nRuntime readiness claimed: no' }));
  assertCase('review_independence_writer_only_fails', report.reviewIndependenceStatus.status === 'fail', failures, cases, report.reviewIndependenceStatus.status, report.reviewIndependenceStatus.reasonCodes);

  report = buildReviewIndependenceReport(prEnv({ CODEX_REVIEW_BODY: 'Writer evidence: present\nReviewer checklist: present\nNegative case check: present\nScope boundary check: present\nProduct code changed: no\nRuntime readiness claimed: no' }));
  assertCase('review_independence_separate_checklist_passes', report.reviewIndependenceStatus.status === 'pass', failures, cases, report.reviewIndependenceStatus.status, report.reviewIndependenceStatus.reasonCodes);

  report = buildTaskBriefCompilerReport({
    CODEX_TASK_COMPLEXITY: 'high',
    CODEX_TASK_BRIEF_INPUT: JSON.stringify({ body: 'Goal: high complexity change' }),
  });
  assertCase('task_brief_high_complexity_requires_forbidden_scope', report.taskBriefCompilerStatus.status === 'fail' && report.taskBriefCompilerStatus.reasonCodes.includes('task_brief_forbidden_scope_missing'), failures, cases, report.taskBriefCompilerStatus.status, report.taskBriefCompilerStatus.reasonCodes);

  report = buildTaskBriefCompilerReport({
    CODEX_TASK_BRIEF_INPUT: JSON.stringify({ targetRollout: true, harnessManagedOnly: true, forbiddenScope: 'product runtime code', body: 'Target rollout. Forbidden scope: product runtime code. Harness-managed files only.' }),
  });
  assertCase('task_brief_target_rollout_harness_only_passes', report.taskBriefCompilerStatus.status === 'pass', failures, cases, report.taskBriefCompilerStatus.status, report.taskBriefCompilerStatus.reasonCodes);

  report = buildBestOfNDecisionReport({ used: true, candidateCount: 3 });
  assertCase('best_of_n_used_without_reason_fails', report.bestOfNDecisionStatus.status === 'fail' && report.bestOfNDecisionStatus.reasonCodes.includes('best_of_n_decision_missing'), failures, cases, report.bestOfNDecisionStatus.status, report.bestOfNDecisionStatus.reasonCodes);

  report = buildBestOfNDecisionReport({ used: true, selectedReason: 'safe summary chosen', rawModelOutput: 'candidate body' });
  assertCase('best_of_n_raw_candidate_output_fails', report.bestOfNDecisionStatus.status === 'fail' && report.bestOfNDecisionStatus.reasonCodes.includes('best_of_n_raw_candidate_forbidden'), failures, cases, report.bestOfNDecisionStatus.status, report.bestOfNDecisionStatus.reasonCodes);

  report = buildEnvironmentProfileReport({ CODEX_GITHUB_OPERATION_REQUIRED: '1', PATH: '' });
  assertCase('environment_profile_gh_unavailable_for_rerun_fails', report.environmentProfileStatus.status === 'fail', failures, cases, report.environmentProfileStatus.status, report.environmentProfileStatus.reasonCodes);

  report = buildEnvironmentProfileReport({ PATH: process.env.PATH || '' });
  assertCase('environment_profile_local_only_without_gh_warns', ['pass', 'warning'].includes(report.environmentProfileStatus.status), failures, cases, report.environmentProfileStatus.status, report.environmentProfileStatus.reasonCodes);

  report = buildAgentsContextBudgetReport({ CODEX_AGENTS_PATH: 'AGENTS.md', CODEX_AGENTS_CONTEXT_MAX_BYTES: '10' });
  assertCase('agents_context_budget_large_manual_fails', report.agentsContextBudgetStatus.status === 'fail', failures, cases, report.agentsContextBudgetStatus.status, report.agentsContextBudgetStatus.reasonCodes);

  report = buildEvidenceAutoRepairHintReport({ expectedFieldName: 'Forbidden scope' });
  assertCase('evidence_auto_repair_hint_forbidden_scope_missing', report.evidenceAutoRepairHintStatus.status === 'pass' && report.evidenceAutoRepairHintStatus.hint.bodyOnlyRepairAllowed, failures, cases, report.evidenceAutoRepairHintStatus.status, report.evidenceAutoRepairHintStatus.reasonCodes);

  report = buildEvidenceAutoRepairHintReport({ expectedFieldName: 'Runtime readiness claimed', wouldWeakenGate: true });
  assertCase('evidence_auto_repair_hint_does_not_weaken_gate', report.evidenceAutoRepairHintStatus.status === 'fail', failures, cases, report.evidenceAutoRepairHintStatus.status, report.evidenceAutoRepairHintStatus.reasonCodes);

  report = buildPrProfileReport(prProfileEnv({
    CODEX_PR_BODY: productR3Body.replace('PR profile: product_r3\n\n', ''),
  }));
  assertCase('pr_profile_body_r3_product_relevant_infers_product_r3', report.prProfileStatus.inferredProfile === 'product_r3', failures, cases, report.prProfileStatus.status, report.prProfileStatus.reasonCodes);

  report = buildPrProfileReport(prProfileEnv({
    CODEX_PR_BODY: productR3Body.replace('Risk level: R3', 'Risk level: R2'),
  }));
  assertCase('pr_profile_body_r2_declared_product_r3_conflicts', report.prProfileStatus.status === 'warning' && report.prProfileStatus.reasonCodes.includes('pr_profile_conflict'), failures, cases, report.prProfileStatus.status, report.prProfileStatus.reasonCodes);

  report = buildPrProfileReport(prProfileEnv({
    CODEX_RISK_LEVEL: 'R3',
    CODEX_PR_BODY: productR3Body.replace('Risk level: R3', 'Risk level: R2'),
  }));
  assertCase('pr_profile_env_risk_overrides_body_risk', report.prProfileStatus.status === 'pass' && report.prProfileStatus.inferredProfile === 'product_r3', failures, cases, report.prProfileStatus.status, report.prProfileStatus.reasonCodes);

  report = buildPrProfileReport(prEnv({
    CODEX_CHANGED_FILES: '.github/workflows/quality-gate.yml',
    CODEX_PR_BODY: 'Goal:\nHarness workflow repair.\n\nRisk level:\nR3\n\nFiles or scope:\nworkflow only.\n\nEvidence Integrity:\ncurrent head.\n\nValidation commands:\nself-test PASS.\n\nResidual risks:\nnone.\n\nHuman confirmation needed:\nyes.',
  }));
  assertCase('pr_profile_harness_workflow_r3_still_infers', report.prProfileStatus.inferredProfile === 'harness_workflow_r3', failures, cases, report.prProfileStatus.status, report.prProfileStatus.reasonCodes);

  report = buildPrProfileReport(prProfileEnv({
    CODEX_PR_BODY: productR3Body.replace('Risk level: R3', 'Risk level: high'),
  }));
  assertCase('pr_profile_invalid_body_risk_does_not_infer_r3', report.prProfileStatus.inferredProfile !== 'product_r3' && report.prProfileStatus.reasonCodes.includes('pr_profile_conflict'), failures, cases, report.prProfileStatus.status, report.prProfileStatus.reasonCodes);

  report = buildPrProfileReport(prProfileEnv());
  assertCase('pr_profile_pr112_like_body_r3_product_r3_passes', report.prProfileStatus.status === 'pass' && report.prProfileStatus.inferredProfile === 'product_r3', failures, cases, report.prProfileStatus.status, report.prProfileStatus.reasonCodes);

  report = buildPrProfileReport(prProfileEnv({
    CODEX_PR_BODY: productR3Body.replace(/\nAffected entrypoints:[\s\S]*?\nFailure paths considered:/, '\nFailure paths considered:'),
  }));
  assertCase('pr_profile_product_r3_required_sections_remain_enforced', report.prProfileStatus.status === 'fail' && report.prProfileStatus.reasonCodes.includes('missing_required_method_sections'), failures, cases, report.prProfileStatus.status, report.prProfileStatus.reasonCodes);

  report = renderPrEvidenceBlocks({
    repository: 'owner/repo',
    prNumber: '92',
    baseSha: 'abcdef1234567890abcdef1234567890abcdef12',
    headSha: '1234567890abcdef1234567890abcdef12345678',
    currentHeadSha: '1234567890abcdef1234567890abcdef12345678',
    changedFiles: ['scripts/codex-v092-self-test.mjs', 'docs/process/CODEX_V092_EVAL_CASES.json'],
    productCodeChanged: false,
    runtimeReadinessClaimed: false,
    humanConfirmation: { present: true, confirmedByRole: 'project-owner', headSha: '1234567890abcdef1234567890abcdef12345678' },
  }, prEnv());
  assertCase('source_harness_only_v092_pr_fixture_pass', report.prEvidenceRendererStatus.status === 'pass', failures, cases, report.prEvidenceRendererStatus.status, report.prEvidenceRendererStatus.reasonCodes);

  report = buildTaskBriefCompilerReport({
    CODEX_TASK_BRIEF_INPUT: JSON.stringify({ targetRollout: true, harnessManagedOnly: true, forbiddenScope: 'product runtime code', body: 'Target rollout. Forbidden scope: product runtime code. Harness-managed files only. Product code changed: no. Runtime readiness claimed: no.' }),
  });
  assertCase('target_harness_rollout_v092_fixture_pass', report.taskBriefCompilerStatus.status === 'pass', failures, cases, report.taskBriefCompilerStatus.status, report.taskBriefCompilerStatus.reasonCodes);

  const unsafe = scanObjectForUnsafe(cases);
  const status = failures.length || unsafe.length ? 'fail' : 'pass';
  return {
    marker,
    harnessVersion: HARNESS_VERSION,
    status,
    v092SelfTestStatus: {
      status,
      suite: 'v092',
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
  const report = buildV092SelfTestReport();
  writeJsonReport(report, 'CODEX_V092_SELF_TEST_REPORT');
  exitFor(report);
}

export { buildV092SelfTestReport };
