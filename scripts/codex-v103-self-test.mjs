#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.0.3
import { scanObjectForUnsafe, writeJsonReport, exitFor, readText } from './codex-v080-lib.mjs';
import * as gates from './codex-v103-gate-lib.mjs';

const CASES = [
  ['parent_v102_required_for_v103_pass', gates.buildActiveSelfTestArtifactSourceReport, {}, 'activeSelfTestArtifactSourceStatus', 'pass'],
  ['v102_self_test_preserved_pass', gates.buildReasonSummaryFinalAggregationReport, {}, 'reasonSummaryFinalAggregationStatus', 'pass'],
  ['v103_self_test_registered_pass', gates.buildV103SelfTestRegistrationReport, {}, 'v103SelfTestStatus', 'pass'],

  ['reason_summary_final_aggregation_pass', gates.buildReasonSummaryFinalAggregationReport, {}, 'reasonSummaryFinalAggregationStatus', 'pass'],
  ['target_quality_pass_final_status_pass', gates.buildReasonSummaryFinalAggregationReport, { targetQualityScoreStatus: 'pass', reportStatus: 'pass' }, 'reasonSummaryFinalAggregationStatus', 'pass'],
  ['legacy_advisory_not_top_level_failure', gates.buildReasonSummaryFinalAggregationReport, { legacyAdvisoryPromotedToFailure: true }, 'reasonSummaryFinalAggregationStatus', 'fail'],
  ['stale_v102_failed_reason_removed_when_v103_pass', gates.buildReasonSummaryFinalAggregationReport, { staleBlockingReasonRemains: true }, 'reasonSummaryFinalAggregationStatus', 'fail'],
  ['product_verification_fail_still_blocks', gates.buildReasonSummaryFinalAggregationReport, { productVerificationFail: true }, 'reasonSummaryFinalAggregationStatus', 'fail'],
  ['safe_output_fail_still_blocks', gates.buildReasonSummaryFinalAggregationReport, { safeOutputFail: true }, 'reasonSummaryFinalAggregationStatus', 'fail'],

  ['remote_npm_truth_executed_pass', gates.buildRemoteNpmDiagnosticTruthReport, { remoteNpmDiagnosticNpmExecuted: true, requiresProductVerification: true }, 'remoteNpmDiagnosticTruthStatus', 'pass'],
  ['remote_npm_truth_not_executed_fail', gates.buildRemoteNpmDiagnosticTruthReport, { requiresProductVerification: true }, 'remoteNpmDiagnosticTruthStatus', 'fail'],
  ['remote_npm_executed_normalizer_missing_field_classified', gates.buildRemoteNpmDiagnosticTruthReport, { remoteNpmDiagnosticNpmExecuted: true, normalizerMissingField: true }, 'remoteNpmDiagnosticTruthStatus', 'fail'],
  ['remote_npm_stale_head_fails', gates.buildRemoteNpmDiagnosticTruthReport, { remoteNpmDiagnosticNpmExecuted: true, staleHead: true }, 'remoteNpmDiagnosticTruthStatus', 'fail'],
  ['remote_npm_body_governance_missing_classified', gates.buildRemoteNpmDiagnosticTruthReport, { bodyGovernanceMissing: true }, 'remoteNpmDiagnosticTruthStatus', 'fail'],

  ['local_pass_remote_fail_delta_classified', gates.buildLocalRemoteFailureDeltaClassifierReport, { classification: 'local_pass_remote_fail_governance_body' }, 'localRemoteFailureDeltaClassifierStatus', 'pass'],
  ['local_remote_unknown_fails', gates.buildLocalRemoteFailureDeltaClassifierReport, { classification: 'unknown' }, 'localRemoteFailureDeltaClassifierStatus', 'fail'],

  ['product_surface_backend_cwd_pass', gates.buildProductSurfaceRouterReport, { changedFiles: ['apps/backend/a.js'] }, 'productSurfaceRouterStatus', 'pass'],
  ['product_surface_contracts_cwd_pass', gates.buildProductSurfaceRouterReport, { changedFiles: ['contracts/a.sol'] }, 'productSurfaceRouterStatus', 'pass'],
  ['product_surface_frontend_cwd_pass', gates.buildProductSurfaceRouterReport, { changedFiles: ['apps/frontend/a.ts'] }, 'productSurfaceRouterStatus', 'pass'],
  ['root_package_missing_never_runs_root_npm', gates.buildProductSurfaceRouterReport, { changedFiles: ['src/a.js'], rootPackageExists: false }, 'productSurfaceRouterStatus', 'pass'],
  ['scripts_run_tests_product_surface_pass', gates.buildProductSurfaceRouterReport, { changedFiles: ['scripts/run-tests.js'] }, 'productSurfaceRouterStatus', 'pass'],
  ['multi_surface_requires_multi_evidence', gates.buildProductSurfaceRouterReport, { changedFiles: ['apps/backend/a.js', 'contracts/a.sol'] }, 'productSurfaceRouterStatus', 'fail'],

  ['active_v103_self_test_selected', gates.buildActiveSelfTestArtifactSourceReport, {}, 'activeSelfTestArtifactSourceStatus', 'pass'],
  ['legacy_v102_advisory_for_v103', gates.buildActiveSelfTestArtifactSourceReport, {}, 'activeSelfTestArtifactSourceStatus', 'pass'],
  ['legacy_artifact_not_active_fails', gates.buildActiveSelfTestArtifactSourceReport, { legacyArtifactUsedAsActive: true }, 'activeSelfTestArtifactSourceStatus', 'fail'],
  ['active_artifact_missing_fails', gates.buildActiveSelfTestArtifactSourceReport, { activeArtifactMissing: true }, 'activeSelfTestArtifactSourceStatus', 'fail'],

  ['pr_body_governance_safe_patch_pass', gates.buildPrBodyGovernanceAutoRepairReport, { missingSections: ['Product verification'] }, 'prBodyGovernanceAutoRepairStatus', 'pass'],
  ['body_only_repair_allowed_pass', gates.buildPrBodyGovernanceAutoRepairReport, { missingEvidenceFields: ['commandCwd'] }, 'prBodyGovernanceAutoRepairStatus', 'pass'],
  ['implementation_failure_not_body_only_fails', gates.buildPrBodyGovernanceAutoRepairReport, { implementationFailureHiddenAsBodyOnly: true }, 'prBodyGovernanceAutoRepairStatus', 'fail'],

  ['review_taxonomy_human_independent_pass', gates.buildReviewEvidenceTaxonomyReport, { type: 'human_independent_review' }, 'reviewEvidenceTaxonomyStatus', 'pass'],
  ['review_taxonomy_chatgpt_pro_not_human_independent', gates.buildReviewEvidenceTaxonomyReport, { type: 'chatgpt_pro_technical_review' }, 'reviewEvidenceTaxonomyStatus', 'pass'],
  ['review_taxonomy_codex_comment_informational', gates.buildReviewEvidenceTaxonomyReport, { type: 'codex_operational_comment' }, 'reviewEvidenceTaxonomyStatus', 'pass'],
  ['review_taxonomy_owner_confirmation_manual_only', gates.buildReviewEvidenceTaxonomyReport, { type: 'owner_confirmation' }, 'reviewEvidenceTaxonomyStatus', 'pass'],
  ['writer_self_review_fails', gates.buildReviewEvidenceTaxonomyReport, { type: 'writer_self_review' }, 'reviewEvidenceTaxonomyStatus', 'fail'],
  ['stale_review_fails', gates.buildReviewEvidenceTaxonomyReport, { type: 'stale_review' }, 'reviewEvidenceTaxonomyStatus', 'fail'],

  ['contract_readiness_profile_pass', gates.buildContractReadinessProfileReport, { contractSourceChanged: true, contractsTestRun: true }, 'contractReadinessProfileStatus', 'pass'],
  ['contracts_npm_required', gates.buildContractReadinessProfileReport, { contractSourceChanged: true }, 'contractReadinessProfileStatus', 'fail'],
  ['funded_tx_claim_fails', gates.buildContractReadinessProfileReport, { fundedTxClaimed: true }, 'contractReadinessProfileStatus', 'fail'],
  ['governance_tx_claim_fails', gates.buildContractReadinessProfileReport, { governanceTxClaimed: true }, 'contractReadinessProfileStatus', 'fail'],
  ['chain_readiness_claim_fails', gates.buildContractReadinessProfileReport, { chainReadinessClaimed: true }, 'contractReadinessProfileStatus', 'fail'],

  ['stale_audit_input_live_body_pass_event_stale', gates.buildStaleAuditInputReport, { eventPayloadStale: true }, 'staleAuditInputStatus', 'fail'],
  ['github_event_payload_stale_classified', gates.buildGithubEventPayloadFreshnessReport, { eventPayloadStale: true }, 'githubEventPayloadFreshnessStatus', 'fail'],
  ['safe_artifact_head_mismatch_fails', gates.buildSafeArtifactHeadMatchReport, { headMismatch: true }, 'safeArtifactHeadMatchStatus', 'fail'],
  ['event_payload_vs_live_body_diff_safe_summary_pass', gates.buildEventPayloadVsLivePrBodyDiffReport, { diffFound: true, safeSummaryPresent: true }, 'eventPayloadVsLivePrBodyDiffStatus', 'pass'],
  ['rerun_uses_stale_event_payload_fails', gates.buildRerunUsesStaleEventPayloadReport, { rerunUsesStaleEventPayload: true }, 'rerunUsesStaleEventPayloadStatus', 'fail'],

  ['merge_readiness_reason_ladder_pass', gates.buildMergeReadinessReasonLadderReport, { blockingReason: 'same_head_remote_missing', nextAction: 'wait_for_same_head_remote_pass' }, 'mergeReadinessReasonLadderStatus', 'pass'],
  ['merge_readiness_external_blocked_no_merge', gates.buildMergeReadinessReasonLadderReport, { blockingReason: 'external_blocked', externalBlockedMergeReady: true }, 'mergeReadinessReasonLadderStatus', 'fail'],
  ['merge_readiness_safe_next_action_one_line', gates.buildSafeNextActionPrecisionReport, { safeNextAction: 'request_independent_review' }, 'safeNextActionPrecisionStatus', 'pass'],
  ['safe_next_action_vague_fails', gates.buildSafeNextActionPrecisionReport, { safeNextAction: 'if needed check later' }, 'safeNextActionPrecisionStatus', 'fail'],

  ['codex_action_boundary_pass', gates.buildCodexActionBoundaryReport, { state: 'codex_safe_artifact_triage_allowed' }, 'codexActionBoundaryStatus', 'pass'],
  ['user_manual_work_prohibited_pass', gates.buildUserManualWorkProhibitedReport, {}, 'userManualWorkProhibitedStatus', 'pass'],
  ['codex_pushes_user_work_back_fails', gates.buildUserManualWorkProhibitedReport, { codexWorkPushedToUser: true }, 'userManualWorkProhibitedStatus', 'fail'],

  ['design_only_pr_pass', gates.buildDesignOnlyPrReport, {}, 'designOnlyPrStatus', 'pass'],
  ['design_only_pr_runtime_change_fails', gates.buildDesignOnlyPrReport, { runtimeBehaviorChanged: true }, 'designOnlyPrStatus', 'fail'],
  ['implementation_deferred_pass', gates.buildImplementationDeferredReport, {}, 'implementationDeferredStatus', 'pass'],

  ['five_five_low_mode_pass', gates.buildFiveFiveLowModeReport, {}, 'fiveFiveLowModeStatus', 'pass'],
  ['five_five_low_multi_pr_fails', gates.buildFiveFiveLowModeReport, { multiPr: true }, 'fiveFiveLowModeStatus', 'fail'],
  ['five_five_low_raw_log_fails', gates.buildFiveFiveLowModeReport, { rawLogRead: true }, 'fiveFiveLowModeStatus', 'fail'],
  ['five_five_low_large_refactor_fails', gates.buildFiveFiveLowModeReport, { largeRefactor: true }, 'fiveFiveLowModeStatus', 'fail'],

  ['dynamic_workflow_lite_packet_schema_pass', gates.buildWorkPacketSchemaReport, {}, 'workPacketSchemaStatus', 'pass'],
  ['dynamic_workflow_lite_small_pr_not_workflow', gates.buildDynamicWorkflowDecisionReport, { smallPrForcedWorkflow: true }, 'dynamicWorkflowDecisionStatus', 'fail'],
  ['simulated_subagent_not_claimed_executed_pass', gates.buildSimulatedSubagentFallbackReport, {}, 'simulatedSubagentFallbackStatus', 'pass'],
  ['worker_file_ownership_v2_conflict_fails', gates.buildWorkerFileOwnershipV2Report, { fileOwnershipConflict: true }, 'workerFileOwnershipV2Status', 'fail'],
  ['approval_gate_required_for_tx_or_deploy', gates.buildApprovalGateReport, { txWithoutApproval: true }, 'approvalGateStatus', 'fail'],
];

const results = CASES.map(([name, builder, input, key, expected]) => {
  const report = builder(input);
  const actual = report[key]?.status || report.status;
  return { name, status: actual === expected ? 'pass' : 'fail', expected, actual, safeSummaryOnly: true };
});

const methodGateText = readText('scripts/codex-openai-method-gate.mjs') || '';
const methodGateVersionAligned = methodGateText.includes('CODEX_QUALITY_HARNESS_FILE v1.0.3') &&
  methodGateText.includes("const HARNESS_VERSION = '1.0.3';");
results.push({
  name: 'openai_method_gate_internal_version_matches_v103_marker',
  status: methodGateVersionAligned ? 'pass' : 'fail',
  expected: 'pass',
  actual: methodGateVersionAligned ? 'pass' : 'fail',
  safeSummaryOnly: true,
});

const runTestsText = readText('scripts/run-tests.js') || '';
const localQualityGateText = readText('scripts/codex-local-quality-gate.mjs') || '';
const targetSupportWithoutSourceRunner = process.env.CODEX_HARNESS_MODE === 'target' && !runTestsText;
const envFixtureHasExplicitNarrowMode = targetSupportWithoutSourceRunner || (runTestsText.includes('CODEX_NARROW_TARGET_GATE_FIXTURE') &&
  runTestsText.includes('env_example_method_gate')) ||
  (runTestsText.includes('buildFixtureReport') &&
    runTestsText.includes('methodGateProductionReadinessEvidenceIntegrityStatus'));
results.push({
  name: 'env_example_method_gate_fixture_has_explicit_target_context',
  status: envFixtureHasExplicitNarrowMode ? 'pass' : 'fail',
  expected: 'pass',
  actual: envFixtureHasExplicitNarrowMode ? 'pass' : 'fail',
  safeSummaryOnly: true,
});

const envFixtureScopesSecretScanToChangedFiles = targetSupportWithoutSourceRunner ||
  (runTestsText.includes('envExampleSafeKeyOnlyPolicyStatus') &&
    runTestsText.includes('envExampleLineUnsafe') &&
    methodGateText.includes('CODEX_QUALITY_HARNESS_FILE v1.0.3'));
results.push({
  name: 'env_example_method_gate_fixture_scopes_nested_secret_scan_to_changed_files',
  status: envFixtureScopesSecretScanToChangedFiles ? 'pass' : 'fail',
  expected: 'pass',
  actual: envFixtureScopesSecretScanToChangedFiles ? 'pass' : 'fail',
  safeSummaryOnly: true,
});

const jsonConcurrencyFixtureWaitsForWorkerExitAndBoundedCleanup =
  targetSupportWithoutSourceRunner ||
  (runTestsText.includes('function runModuleWorker') &&
    runTestsText.includes("worker.once(\"exit\"") &&
    runTestsText.includes('completedMessage === null') &&
    runTestsText.includes('removeFixtureTempDirWithRetry') &&
    runTestsText.includes('fixture_cleanup_failed_safely') &&
    runTestsText.includes('iris-json-store-concurrency-') &&
    runTestsText.includes('await removeFixtureTempDirWithRetry(tempDir)'));
results.push({
  name: 'json_concurrency_fixture_waits_for_worker_exit_and_uses_bounded_cleanup',
  status: jsonConcurrencyFixtureWaitsForWorkerExitAndBoundedCleanup ? 'pass' : 'fail',
  expected: 'pass',
  actual: jsonConcurrencyFixtureWaitsForWorkerExitAndBoundedCleanup ? 'pass' : 'fail',
  safeSummaryOnly: true,
});

const localBridgeFixtureTracksServerSockets =
  targetSupportWithoutSourceRunner ||
  (runTestsText.includes('function trackServerSockets') &&
    runTestsText.includes('server.on("connection"') &&
    runTestsText.includes('destroyOpenSockets()') &&
    runTestsText.includes('openSocketCount()') &&
    runTestsText.includes('const bridgeSockets = trackServerSockets(bridgeServer)') &&
    runTestsText.includes('const noManifestSockets = trackServerSockets(noManifestBridge)') &&
    runTestsText.includes('bridgeSockets.destroyOpenSockets()') &&
    runTestsText.includes('noManifestSockets.destroyOpenSockets()') &&
    runTestsText.includes('assert.equal(bridgeSockets.openSocketCount(), 0)') &&
    runTestsText.includes('assert.equal(noManifestSockets.openSocketCount(), 0)'));
results.push({
  name: 'local_bridge_fixture_tracks_and_drains_server_sockets',
  status: localBridgeFixtureTracksServerSockets ? 'pass' : 'fail',
  expected: 'pass',
  actual: localBridgeFixtureTracksServerSockets ? 'pass' : 'fail',
  safeSummaryOnly: true,
});

const narrowFixtureModeSafeJson = targetSupportWithoutSourceRunner ||
  (runTestsText.includes('buildFixtureReport') &&
    runTestsText.includes('JSON.stringify(report)') &&
    runTestsText.includes('safeSummaryOnly: true') &&
    runTestsText.includes('valuesPrinted: false') &&
    runTestsText.includes('runtimeReadinessClaimed: false') &&
    runTestsText.includes('productionReadinessClaimed: false') &&
    runTestsText.includes('productionGoPerformed: false') &&
    runTestsText.includes('priority1Status: "BLOCKED"') &&
    runTestsText.includes('envExampleSafeKeyOnlyPolicyStatus') &&
    runTestsText.includes('methodGateProductionReadinessEvidenceIntegrityStatus') &&
    runTestsText.includes('targetMergeReady: status === "pass"') &&
    runTestsText.includes('envExampleLineUnsafe') &&
    runTestsText.includes('fileName === ".env"') &&
    runTestsText.includes('fileName === ".env.local"') &&
    runTestsText.includes('value.trim().length > 0'));
results.push({
  name: 'env_example_narrow_target_gate_fixture_emits_safe_json_and_keeps_missing_json_failed',
  status: narrowFixtureModeSafeJson ? 'pass' : 'fail',
  expected: 'pass',
  actual: narrowFixtureModeSafeJson ? 'pass' : 'fail',
  safeSummaryOnly: true,
});

const localTargetGateProductEvidencePhaseSplit =
  localQualityGateText.includes('isLocalPrePushTargetContext') &&
  localQualityGateText.includes("env.CODEX_HARNESS_MODE === 'target'") &&
  localQualityGateText.includes('!isPullRequestContext(env)') &&
  localQualityGateText.includes('buildLocalPrePushProductVerificationEvidence') &&
  localQualityGateText.includes("spawn('npm', ['test']") &&
  localQualityGateText.includes('npmEnv.CODEX_HARNESS_MODE') &&
  localQualityGateText.includes('npmEnv.CODEX_QUALITY_REPORT') &&
  localQualityGateText.includes("source: 'local'") &&
  localQualityGateText.includes('applyLocalPrePushProductEvidencePhase') &&
  localQualityGateText.includes('remote_evidence_pending_after_push') &&
  localQualityGateText.includes('remoteEvidenceRequiredAfterPush: true') &&
  localQualityGateText.includes('localNpmIsRemoteNpm: false') &&
  localQualityGateText.includes('remoteEvidence.pendingAfterPush') &&
  localQualityGateText.includes('CODEX_PRODUCT_VERIFICATION_SOURCE') &&
  localQualityGateText.includes('applyLocalPrePushProductEvidencePhase(report, localPrePushProductEvidence, gateEnv)');
results.push({
  name: 'local_target_gate_product_evidence_phase_split_preserves_remote_requirement',
  status: localTargetGateProductEvidencePhaseSplit ? 'pass' : 'fail',
  expected: 'pass',
  actual: localTargetGateProductEvidencePhaseSplit ? 'pass' : 'fail',
  safeSummaryOnly: true,
});

const remoteContextStillStrictForMissingNpmEvidence =
  localQualityGateText.includes('!isPullRequestContext(env)') &&
  !localQualityGateText.includes("localNpmIsRemoteNpm: true") &&
  readText('scripts/codex-v099-gate-lib.mjs').includes('remote_npm_not_executed_for_product_pr') &&
  readText('scripts/codex-v098-gate-lib.mjs').includes('remote_npm_not_executed_for_product_pr');
results.push({
  name: 'remote_context_missing_npm_evidence_remains_strict',
  status: remoteContextStillStrictForMissingNpmEvidence ? 'pass' : 'fail',
  expected: 'pass',
  actual: remoteContextStillStrictForMissingNpmEvidence ? 'pass' : 'fail',
  safeSummaryOnly: true,
});

const failures = results.filter((item) => item.status !== 'pass');
const report = {
  marker: 'CODEX_QUALITY_HARNESS_FILE v1.0.3',
  status: failures.length ? 'fail' : 'pass',
  v103SelfTestStatus: {
    status: failures.length ? 'fail' : 'pass',
    caseCount: results.length,
    failures,
    safeSummaryOnly: true,
  },
  cases: results,
  safeSummaryOnly: true,
};

if (scanObjectForUnsafe(report).length) {
  report.status = 'fail';
  report.v103SelfTestStatus = { status: 'fail', reasonCodes: ['unsafe_value_detected'], safeSummaryOnly: true };
}

writeJsonReport(report, 'CODEX_V103_SELF_TEST_REPORT');
exitFor(report);
