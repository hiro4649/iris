#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.1.7

import { readFileSync } from 'node:fs';
import { writeJsonReport, exitFor } from './codex-v080-lib.mjs';
import {
  OPERATOR_STATUS_KEYS,
  buildDecisionCapsuleV117,
  buildDefaultVerifierCapsule,
  buildV117Report,
  validateBoundaryProfileFixture,
  validateDecisionCapsuleAuthority,
  validateLegacyCompressionFixture,
  validateScopeGrantFixture,
  validateVerifierCapsule,
} from './codex-verifier-capsule.mjs';
import {
  buildDefaultOutcomeContract,
  validateOutcomeContract,
} from './codex-outcome-contract.mjs';
import {
  buildArtifactConsistencyReport,
  classifySafeDetailUnavailable,
  validateArtifactConsistency,
  validateDeltaOnlyFinalizer,
} from './codex-artifact-consistency-contract.mjs';
import {
  pickSafeFailureEvidence,
  validateSafeFailureReader,
} from './codex-read-safe-failure.mjs';
import { validateDecisionCapsule } from './codex-decision-capsule.mjs';

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail', safeSummaryOnly: true };
  } catch {
    return { name, status: 'fail', reasonCodes: ['self_test_exception'], safeSummaryOnly: true };
  }
}

const goodOutcome = buildDefaultOutcomeContract({
  ownerMergeInstructionPresent: true,
  successExitCriteria: ['same_head_checks_pass', 'quality_score_100'],
});
const goodCapsule = buildDecisionCapsuleV117({
  decision: 'blocked',
  mergeAllowed: false,
  primaryClass: 'owner_decision_required',
  primaryBlocker: 'owner_decision_required',
  ownerMergeScope: false,
  sameHeadRequiredChecks: { sameHead: true, allPass: false, headSha: 'abc' },
});
const allowedCapsule = buildDecisionCapsuleV117({
  decision: 'allowed',
  mergeAllowed: true,
  ownerMergeScope: true,
  sameHeadRequiredChecks: { sameHead: true, allPass: true, headSha: 'abc' },
  primaryClass: 'owner_merge_instruction_present',
  primaryBlocker: 'none',
  safeNextAction: 'merge_after_same_head_required_checks',
});

const cases = [
  test('decision_capsule_authority_preserved', () => validateDecisionCapsuleAuthority(goodCapsule).status === 'pass'),
  test('decision_capsule_must_not_delegate_to_pr_body', () => validateDecisionCapsuleAuthority({ ...goodCapsule, prBodyMachineEvidence: true }).status === 'fail'),
  test('decision_capsule_allowed_requires_merge_allowed', () => validateDecisionCapsuleAuthority({ ...goodCapsule, decision: 'allowed', mergeAllowed: false }).reasonCodes.includes('allowed_with_merge_false')),
  test('decision_capsule_legacy_v116_guard_still_fails_allowed_merge_false', () => validateDecisionCapsule({ ...goodCapsule, harnessVersion: '1.1.6', decision: 'allowed', mergeAllowed: false }).status === 'fail'),
  test('outcome_contract_passes_with_exit_criteria_and_owner_merge_instruction', () => validateOutcomeContract(goodOutcome).status === 'pass'),
  test('outcome_contract_blocks_vague_goal', () => validateOutcomeContract({ ...goodOutcome, goalSummary: 'improve everything' }).status === 'fail'),
  test('outcome_contract_requires_verifier', () => validateOutcomeContract({ ...goodOutcome, verifierRequired: false }).reasonCodes.includes('outcome_verifier_required')),
  test('verifier_capsule_passes_independent_read_only_fixture', () => validateVerifierCapsule(buildDefaultVerifierCapsule({ decisionCapsule: allowedCapsule })).status === 'pass'),
  test('verifier_capsule_blocks_same_actor_author_merge_verify', () => validateVerifierCapsule(buildDefaultVerifierCapsule({ actorIsolation: false })).status === 'fail'),
  test('verifier_capsule_blocks_raw_log_reader', () => validateVerifierCapsule(buildDefaultVerifierCapsule({ rawLogsRead: true })).reasonCodes.includes('raw_logs_read')),
  test('artifact_consistency_requires_generated_indexed_uploaded_observed', () => buildArtifactConsistencyReport().artifactConsistencyStatus.status === 'pass'),
  test('artifact_consistency_blocks_index_without_safe_summary', () => buildArtifactConsistencyReport({ safeSummaryPresent: false }).artifactConsistencyStatus.reasonCodes.includes('safe_summary_missing')),
  test('artifact_consistency_blocks_stale_head', () => buildArtifactConsistencyReport({ remoteHeadMatches: false }).artifactConsistencyStatus.reasonCodes.includes('artifact_head_mismatch')),
  test('artifact_index_present_but_artifact_missing_fails', () => buildArtifactConsistencyReport({ artifacts: [{ artifactName: 'codex-decision-capsule.safe.json', artifactGeneratedStatus: 'fail', artifactIndexedStatus: 'pass', artifactUploadedStatus: 'pass', artifactDownloadObservedStatus: 'pass', artifactHeadMatchStatus: 'pass' }] }).artifactConsistencyStatus.primaryClass === 'artifact_index_consistency_failure'),
  test('artifact_exists_but_stale_head_fails_as_stale_head', () => buildArtifactConsistencyReport({ artifacts: [{ artifactName: 'codex-decision-capsule.safe.json', artifactGeneratedStatus: 'pass', artifactIndexedStatus: 'pass', artifactUploadedStatus: 'pass', artifactDownloadObservedStatus: 'pass', artifactHeadMatchStatus: 'fail' }] }).artifactConsistencyStatus.primaryClass === 'artifact_stale_head'),
  test('artifact_uploaded_status_is_checked', () => buildArtifactConsistencyReport({ artifacts: [{ artifactName: 'codex-decision-capsule.safe.json', artifactGeneratedStatus: 'pass', artifactIndexedStatus: 'pass', artifactUploadedStatus: 'fail', artifactDownloadObservedStatus: 'pass', artifactHeadMatchStatus: 'pass' }] }).artifactConsistencyStatus.reasonCodes.includes('artifact_index_consistency_failure')),
  test('artifact_download_observed_status_is_checked', () => buildArtifactConsistencyReport({ artifacts: [{ artifactName: 'codex-decision-capsule.safe.json', artifactGeneratedStatus: 'pass', artifactIndexedStatus: 'pass', artifactUploadedStatus: 'pass', artifactDownloadObservedStatus: 'fail', artifactHeadMatchStatus: 'pass' }] }).artifactConsistencyStatus.reasonCodes.includes('artifact_download_not_observed')),
  test('all_load_bearing_artifacts_are_checked', () => buildArtifactConsistencyReport().checkedArtifacts === 4),
  test('delta_only_finalizer_allows_changed_fields_only', () => validateDeltaOnlyFinalizer({ emittedFields: ['state', 'safeNextAction'], changedFields: ['state', 'safeNextAction'] }).status === 'pass'),
  test('delta_only_finalizer_blocks_unchanged_history', () => validateDeltaOnlyFinalizer({ emittedFields: ['oldHistory'], changedFields: ['state'] }).status === 'fail'),
  test('safe_failure_reader_prefers_decision_capsule', () => pickSafeFailureEvidence({ decisionCapsule: { decision: 'blocked' }, artifactConsistency: { primaryClass: 'other' } }).selected === 'codex-decision-capsule.safe.json'),
  test('safe_failure_reader_blocks_raw_log_fallback', () => validateSafeFailureReader({ rawLogFallbackAttempted: true }).status === 'fail'),
  test('safe_detail_unavailable_subclass_requires_real_safe_detail', () => classifySafeDetailUnavailable({ safeSummaryPresent: false }).status === 'fail'),
  test('safe_detail_unavailable_not_used_when_fallback_allowed', () => classifySafeDetailUnavailable({ safeSummaryPresent: false, fallbackSafeDetailReason: 'remote_artifact_expired' }).status === 'pass'),
  test('runtime_readiness_claim_negative_fixture', () => buildV117Report({ safetyClaims: { runtimeReadinessClaimed: true } }).safeFailureReaderStatus.status === 'fail'),
  test('production_readiness_claim_negative_fixture', () => buildV117Report({ safetyClaims: { productionReadinessClaimed: true } }).safeFailureReaderStatus.status === 'fail'),
  test('legal_compliance_claim_negative_fixture', () => buildV117Report({ safetyClaims: { legalComplianceClaimed: true } }).safeFailureReaderStatus.status === 'fail'),
  test('youtube_policy_claim_negative_fixture', () => buildV117Report({ safetyClaims: { youtubePolicyComplianceClaimed: true } }).safeFailureReaderStatus.status === 'fail'),
  test('wallet_rpc_deploy_negative_fixture', () => buildV117Report({ safetyClaims: { walletRpcDeployAccess: true } }).safeFailureReaderStatus.status === 'fail'),
  test('raw_log_access_negative_fixture', () => buildV117Report({ safetyClaims: { rawLogsRead: true } }).safeFailureReaderStatus.status === 'fail'),
  test('same_head_required_checks_failure_negative_fixture', () => buildV117Report({ sameHeadRequiredChecks: { sameHead: false, allPass: true } }).decisionCapsuleAuthorityStatus.status === 'fail'),
  test('pr_body_attempting_remote_evidence_negative_fixture', () => buildV117Report({ prBodyMachineEvidence: true }).decisionCapsuleAuthorityStatus.status === 'fail'),
  test('legacy_shadow_cannot_hide_true_blocker_fixture', () => buildV117Report({ legacyShadowAttemptsHide: true }).decisionCapsuleAuthorityStatus.status === 'fail'),
  test('scope_grant_matrix_fixture_only', () => validateScopeGrantFixture({ requestedScope: 'source_harness_body', grantedScopes: ['source_harness_body'] }).status === 'pass'),
  test('scope_grant_matrix_blocks_target_rollout_scope', () => validateScopeGrantFixture({ requestedScope: 'source_harness_body', grantedScopes: ['target_rollout'] }).status === 'fail'),
  test('legacy_compatibility_compression_fixture_only', () => validateLegacyCompressionFixture({ emittedLegacyStatuses: 0, maxLegacyStatuses: 0 }).status === 'pass'),
  test('boundary_registry_compression_fixture_only', () => validateBoundaryProfileFixture({ policyIds: ['raw_logs_no', 'eight_session_no'], repeatedForbiddenTextCount: 0 }).status === 'pass'),
  test('boundary_registry_blocks_repeated_forbidden_text', () => validateBoundaryProfileFixture({ repeatedForbiddenTextCount: 1 }).status === 'fail'),
  test('operator_visible_status_limit_under_12', () => OPERATOR_STATUS_KEYS.length <= 12),
  test('p0_status_surface_exactly_six', () => OPERATOR_STATUS_KEYS.length === 6),
  test('token_budget_status_preserved_as_metrics', () => buildV117Report({ tokenBudget: { operatorVisibleStatuses: OPERATOR_STATUS_KEYS.length, safeArtifactReads: 2 } }).tokenBudgetStatus?.metrics?.safeArtifactReads === 2),
  test('validation_fast_path_source_fixture', () => buildV117Report({ fastPathEligible: true }).validationFastPathStatus?.status === 'pass'),
  test('verified_memory_rules_spec_fixture', () => buildV117Report({ memoryConsulted: false }).verifiedMemoryRulesStatus?.status === 'pass'),
  test('repair_experiment_ledger_spec_fixture', () => buildV117Report({ repairExperimentCount: 0 }).repairExperimentLedgerStatus?.status === 'pass'),
  test('method_gate_accepts_current_compact_pr_template_shape', () => {
    const methodGate = readFileSync('scripts/codex-openai-method-gate.mjs', 'utf8');
    const prTemplate = readFileSync('.github/pull_request_template.md', 'utf8');
    const agents = readFileSync('AGENTS.md', 'utf8');
    const runTests = readFileSync('scripts/run-tests.js', 'utf8');
    const v080Lib = readFileSync('scripts/codex-v080-lib.mjs', 'utf8');
    const agentsContextGate = readFileSync('scripts/codex-agents-context-gate.mjs', 'utf8');
    const v080SelfTest = readFileSync('scripts/codex-v080-self-test.mjs', 'utf8');
    const v081SelfTest = readFileSync('scripts/codex-v081-self-test.mjs', 'utf8');
    const v082SelfTest = readFileSync('scripts/codex-v082-self-test.mjs', 'utf8');
    const v083SelfTest = readFileSync('scripts/codex-v083-self-test.mjs', 'utf8');
    const v085SelfTest = readFileSync('scripts/codex-v085-self-test.mjs', 'utf8');
    const v087SelfTest = readFileSync('scripts/codex-v087-self-test.mjs', 'utf8');
    const v090SelfTest = readFileSync('scripts/codex-v090-self-test.mjs', 'utf8');
    const v092SelfTest = readFileSync('scripts/codex-v092-self-test.mjs', 'utf8');
    const v100SelfTest = readFileSync('scripts/codex-v100-self-test.mjs', 'utf8');
    const v101SelfTest = readFileSync('scripts/codex-v101-self-test.mjs', 'utf8');
    const v102SelfTest = readFileSync('scripts/codex-v102-self-test.mjs', 'utf8');
    const v103SelfTest = readFileSync('scripts/codex-v103-self-test.mjs', 'utf8');
    return (
      /HARNESS_VERSION = '1\.1\.7'/.test(v080Lib) &&
      /CODEX_QUALITY_HARNESS_FILE v\$\{HARNESS_VERSION\}/.test(agentsContextGate) &&
      /process\.chdir\(tmp\)/.test(v080SelfTest) &&
      /process\.chdir\(previousCwd\)/.test(v080SelfTest) &&
      /process\.chdir\(tmp\)/.test(v081SelfTest) &&
      /buildEvidenceIntegrityReport\(structuredEnv\)/.test(v081SelfTest) &&
      /2099-01-01T00:00:00Z/.test(v082SelfTest) &&
      /2099-01-01T00:00:00Z/.test(v083SelfTest) &&
      /CODEX_V083_RUN_LEGACY_RECHECKS/.test(v083SelfTest) &&
      /CODEX_CHANGED_FILES: 'scripts\/codex-local-quality-gate\.mjs'/.test(v085SelfTest) &&
      /function withTempCwd/.test(v087SelfTest) &&
      /function promptEvalFixture/.test(v087SelfTest) &&
      /function knowledgeMapFixture/.test(v087SelfTest) &&
      /schemaVersion: HARNESS_VERSION/.test(v087SelfTest) &&
      /CODEX_PROMPT_EVAL_SUITE_PATH: tempJson\(promptEvalFixture\(\)\)/.test(v087SelfTest) &&
      /CODEX_KNOWLEDGE_MAP_PATH: tempJson\(knowledgeMapFixture\(\)\)/.test(v087SelfTest) &&
      /withTempCwd\(\(\) => buildEvidencePackReport/.test(v087SelfTest) &&
      /function withTempCwd/.test(v090SelfTest) &&
      /\['not_applicable', 'pass'\]\.includes\(workflowDispatchEvidenceStatus\)/.test(v090SelfTest) &&
      /const strictPrEvidenceStatus = withTempCwd/.test(v090SelfTest) &&
      /function withVersionLineageFixture/.test(v092SelfTest) &&
      /Version: v\$\{HARNESS_VERSION\}/.test(v092SelfTest) &&
      /codex-v095-self-test\.mjs/.test(v092SelfTest) &&
      /withVersionLineageFixture\(\(\) => buildVersionLineageReport/.test(v092SelfTest) &&
      /function withV100RegistrationFixture/.test(v100SelfTest) &&
      /CODEX_V100_EVAL_CASES\.json/.test(v100SelfTest) &&
      /new_v100_self_test_registered_pass/.test(v100SelfTest) &&
      /version_succession_v099_to_v100_pass/.test(v100SelfTest) &&
      /function withV101RegistrationFixture/.test(v101SelfTest) &&
      /codex-v101-self-test\.mjs/.test(v101SelfTest) &&
      /v101SelfTestStatus/.test(v101SelfTest) &&
      /name === 'v101_self_test_registered_pass'/.test(v101SelfTest) &&
      /function withV102RegistrationFixture/.test(v102SelfTest) &&
      /codex-v102-self-test\.mjs/.test(v102SelfTest) &&
      /v102SelfTestStatus/.test(v102SelfTest) &&
      /name === 'v102_self_test_registered_pass'/.test(v102SelfTest) &&
      /function withV103RegistrationFixture/.test(v103SelfTest) &&
      /codex-v103-self-test\.mjs/.test(v103SelfTest) &&
      /v103SelfTestStatus/.test(v103SelfTest) &&
      /name === 'v103_self_test_registered_pass'/.test(v103SelfTest) &&
      /HARNESS_VERSION = '1\.0\.7'/.test(methodGate) &&
      /profileTemplateMarker = 'CODEX_QUALITY_HARNESS_FILE v1\.0\.8'/.test(methodGate) &&
      /agentsDoctrineMarker = 'CODEX_QUALITY_HARNESS_FILE v1\.1\.7'/.test(methodGate) &&
      /Owner Summary/i.test(prTemplate) &&
      /Evidence Source/i.test(prTemplate) &&
      /Risk And Readiness/i.test(prTemplate) &&
      /CODEX_QUALITY_HARNESS_FILE v1\.0\.8/.test(prTemplate) &&
      /CODEX_QUALITY_HARNESS_FILE v1\.1\.7/.test(agents) &&
      /Array\.from\(\{ length: 38 \}/.test(runTests) &&
      /CODEX_SKIP_V\$\{version\}_SELF_TEST/.test(runTests) &&
      /collectScriptImports/.test(runTests) &&
      /collectScriptImports\("scripts\/codex-local-quality-gate\.mjs"\)/.test(runTests) &&
      /collectScriptImports\("scripts\/codex-v117-self-test\.mjs"\)/.test(runTests) &&
      /buildMethodGateFixtureReport/.test(runTests) &&
      /fixture_product_verification_required/.test(runTests) &&
      /Owner Summary/i.test(methodGate) &&
      /Evidence Source/i.test(methodGate) &&
      /Risk And Readiness/i.test(methodGate) &&
      !/prTemplate:\s*\[\/Codex Method Compliance/i.test(methodGate)
    );
  }),
];

const failures = cases.filter((item) => item.status !== 'pass');
const report = {
  v117SelfTestStatus: {
    status: failures.length ? 'fail' : 'pass',
    caseCount: cases.length,
    failureCount: failures.length,
    safeSummaryOnly: true,
  },
  cases,
  status: failures.length ? 'fail' : 'pass',
  safeSummaryOnly: true,
};

writeJsonReport(report, 'CODEX_V117_SELF_TEST_REPORT');
if (!process.env.CODEX_V117_SELF_TEST_REPORT && process.env.CODEX_QUALITY_REPORT !== 'json') {
  console.log(`v117SelfTestStatus: ${report.v117SelfTestStatus.status}`);
}
exitFor(report);
