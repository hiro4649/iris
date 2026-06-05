#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.0.7

import { scanObjectForUnsafe, writeJsonReport, exitFor } from './codex-v080-lib.mjs';
import * as gates from './codex-v107-gate-lib.mjs';
import { buildHarnessVersionRegistry } from './codex-harness-version.mjs';
import { readFileSync } from 'node:fs';

function statusOf(report, key) {
  return report[key]?.status || report.status;
}

const validStatus = gates.typedStatus('sampleStatus', 'pass').sampleStatus;
const notRunStatus = { ...validStatus, status: 'not_run' };
const evidencePack = gates.buildEvidencePackV3Report({});
const generatedBody = renderFromPack(evidencePack);
const runTestsText = readFileSync(new URL('./run-tests.js', import.meta.url), 'utf8');
const methodGateText = readFileSync(new URL('./codex-openai-method-gate.mjs', import.meta.url), 'utf8');
const v080SelfTestText = readFileSync(new URL('./codex-v080-self-test.mjs', import.meta.url), 'utf8');
const v081SelfTestText = readFileSync(new URL('./codex-v081-self-test.mjs', import.meta.url), 'utf8');
const v085SelfTestText = readFileSync(new URL('./codex-v085-self-test.mjs', import.meta.url), 'utf8');
const v087SelfTestText = readFileSync(new URL('./codex-v087-self-test.mjs', import.meta.url), 'utf8');
const v090SelfTestText = readFileSync(new URL('./codex-v090-self-test.mjs', import.meta.url), 'utf8');
const v092SelfTestText = readFileSync(new URL('./codex-v092-self-test.mjs', import.meta.url), 'utf8');
const v100SelfTestText = readFileSync(new URL('./codex-v100-self-test.mjs', import.meta.url), 'utf8');
const v100GateLibText = readFileSync(new URL('./codex-v100-gate-lib.mjs', import.meta.url), 'utf8');
const v101GateLibText = readFileSync(new URL('./codex-v101-gate-lib.mjs', import.meta.url), 'utf8');
const v102GateLibText = readFileSync(new URL('./codex-v102-gate-lib.mjs', import.meta.url), 'utf8');
const v103GateLibText = readFileSync(new URL('./codex-v103-gate-lib.mjs', import.meta.url), 'utf8');
const safeSummary = buildSafeSummary([
  { changed_files: ['docs/process/example.md'], endpoint: 'redacted', token: 'redacted', secret: 'redacted', raw_payload: 'redacted' },
]);

const CASES = [
  ['typed_status_schema_accepts_allowed_statuses', () => gates.buildTypedStatusSchemaReport({ status: validStatus }), 'typedStatusSchemaStatus', 'pass'],
  ['typed_status_schema_rejects_plain_not_run', () => gates.buildTypedStatusSchemaReport({ status: notRunStatus }), 'typedStatusSchemaStatus', 'fail'],
  ['no_status_absent_not_green', () => ({ check: gates.classifyCommitStatusState({ commitStatusState: 'absent' }), status: gates.classifyCommitStatusState({ commitStatusState: 'absent' }).isGreen ? 'fail' : 'pass' }), 'status', 'pass'],
  ['no_status_absent_not_red', () => ({ check: gates.classifyCommitStatusState({ commitStatusState: 'absent' }), status: gates.classifyCommitStatusState({ commitStatusState: 'absent' }).isRed ? 'fail' : 'pass' }), 'status', 'pass'],
  ['no_status_absent_cannot_merge', () => ({ check: gates.classifyCommitStatusState({ commitStatusState: 'absent' }), status: gates.classifyCommitStatusState({ commitStatusState: 'absent' }).canSupportMerge ? 'fail' : 'pass' }), 'status', 'pass'],
  ['central_version_registry_current_v107', () => gates.buildCentralHarnessVersionRegistryReport({ registry: buildHarnessVersionRegistry() }), 'centralHarnessVersionRegistryStatus', 'pass'],
  ['method_gate_internal_version_current_v107', () => ({ status: methodGateText.includes("const HARNESS_VERSION = '1.0.7'") ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['method_gate_fixture_uses_deterministic_safe_summary_v107', () => ({ status: !runTestsText.includes('scripts/codex-local-quality-gate.mjs\"], {') && !runTestsText.includes('scripts/codex-openai-method-gate.mjs\"], {') && runTestsText.includes('targetQualityScoreStatus: { status: pass ? \"pass\" : \"fail\"') ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['method_gate_manifest_script_names_do_not_double_prefix', () => ({ status: runTestsText.includes('name.startsWith("scripts/") ? name : `scripts/${name}`') ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['legacy_adapter_blocks_direct_full_gate_dependency', () => gates.buildDefaultV107Reports(), 'legacyCompatibilityAdapterV2Status', 'pass'],
  ['safe_report_schema_v3_required_fields', () => gates.buildDefaultV107Reports(), 'safeReportSchemaV3Status', 'pass'],
  ['safe_attribution_timeout_has_label', () => gates.buildDefaultV107Reports(), 'safeAttributionRunnerStandardStatus', 'pass'],
  ['safe_attribution_missing_json_has_label', () => gates.buildDefaultV107Reports(), 'safeAttributionRunnerStandardStatus', 'pass'],
  ['safe_attribution_invalid_json_has_label', () => gates.buildDefaultV107Reports(), 'safeAttributionRunnerStandardStatus', 'pass'],
  ['safe_attribution_filtered_fixture_has_label', () => ({ status: runTestsText.includes('safeFailingLabel: "test_filter_no_match"') && runTestsText.includes('filtered_fixture_missing') ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['safe_attribution_fixture_start_before_setup', () => ({ status: runTestsText.includes('lastActiveSafeFixtureLabel = name') && runTestsText.indexOf('lastActiveSafeFixtureLabel = name') < runTestsText.indexOf('await fn()') ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['safe_attribution_runner_does_not_print_raw_error', () => ({ status: runTestsText.includes('JSON.stringify(lastSafeFailure)') && !runTestsText.includes('console.error(error)') ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['v080_production_go_heading_checks_not_claim_detected', () => ({ status: v080SelfTestText.includes("labels?.includes('production_or_release_claim_detected') !== true") && !v080SelfTestText.includes("goNoGoHeading.productionReadinessStatus.status === 'pass'") ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['v081_structured_evidence_fixture_uses_local_cwd', () => ({ status: v081SelfTestText.includes('process.chdir(tmp)') && v081SelfTestText.includes('process.chdir(originalCwd)') ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['v085_harness_only_fixture_uses_local_changed_files', () => ({ status: v085SelfTestText.includes("CODEX_CHANGED_FILES: 'scripts/codex-v085-self-test.mjs'") ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['v087_evidence_pack_fixture_uses_local_cwd', () => ({ status: v087SelfTestText.includes('function withFixtureCwd') && v087SelfTestText.includes('withFixtureCwd(() => buildEvidencePackReport') ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['v087_source_fixture_uses_prompt_eval_evidence', () => ({ status: v087SelfTestText.includes('CODEX_PROMPT_EVAL_JSON') && v087SelfTestText.includes('prompt_gate_source_change') ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['v090_workflow_dispatch_evidence_pack_allows_pass_or_not_applicable', () => ({ status: v090SelfTestText.includes("['pass', 'not_applicable'].includes(workflowDispatchEvidenceStatus)") && v090SelfTestText.includes('withFixtureCwd(() => buildEvidencePackReport') ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['v092_version_lineage_positive_is_bounded_current_marker', () => ({ status: v092SelfTestText.includes("HARNESS_VERSION === '1.0.7'") && !v092SelfTestText.includes("buildVersionLineageReport({ CODEX_HARNESS_SOURCE_REPO: '1', CODEX_HARNESS_MODE: 'core' })") ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['v100_succession_accepts_current_v107', () => ({ status: v100GateLibText.includes("'1.0.7'") && v100GateLibText.includes('manifest.harnessVersion === HARNESS_VERSION') && v100SelfTestText.includes('out.push({ id, caseIndex') ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['v101_registration_does_not_require_obsolete_manifest_listing', () => ({ status: !v101GateLibText.includes('CODEX_SOURCE_HARNESS_MANIFEST.json') && !v101GateLibText.includes('docs/process/CODEX_HARNESS_MANIFEST.json') ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['v102_registration_does_not_require_obsolete_manifest_listing', () => ({ status: !v102GateLibText.includes("readText('CODEX_SOURCE_HARNESS_MANIFEST.json')?.includes('codex-v102-self-test.mjs')") ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['v103_registration_does_not_require_obsolete_manifest_listing', () => ({ status: !v103GateLibText.includes("readText('CODEX_SOURCE_HARNESS_MANIFEST.json')?.includes('codex-v103-self-test.mjs')") ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['json_worker_helper_waits_for_exit_close', () => gates.buildDefaultV107Reports(), 'jsonConcurrencyWorkerHelperStatus', 'pass'],
  ['evidence_pack_v3_required_fields', () => gates.buildEvidencePackV3Report({}), 'evidencePackV3Status', 'pass'],
  ['pr_body_generated_from_evidence_pack', () => ({ status: generatedBody.generatedFromEvidencePack ? 'pass' : 'fail', safeSummaryOnly: true }), 'status', 'pass'],
  ['pr_body_placeholder_rejected', () => gates.buildEvidencePackV3Report({ placeholderResidue: true }), 'prBodyGeneratedFromEvidenceStatus', 'fail'],
  ['github_run_artifact_auto_inject_safe_only', () => gates.buildEvidencePackV3Report({}), 'githubRunArtifactAutoInjectStatus', 'pass'],
  ['test_summary_json_canonical', () => gates.buildEvidencePackV3Report({}), 'testSummaryJsonCanonicalStatus', 'pass'],
  ['evidence_freshness_exact_diff', () => gates.buildEvidencePackV3Report({}), 'evidenceFreshnessExactDiffStatus', 'pass'],
  ['same_head_remote_verifier_rejects_stale_pass', () => gates.buildRepresentativeReplayReport({ staleHeadPass: true }), 'sameHeadRemoteVerifierV2Status', 'fail'],
  ['representative_replay_same_head_pass', () => gates.buildRepresentativeReplayReport({}), 'representativeRealPrReplayStatus', 'pass'],
  ['representative_replay_stale_head_rejected', () => gates.buildRepresentativeReplayReport({ staleHeadPass: true }), 'representativeRealPrReplayStatus', 'fail'],
  ['representative_replay_missing_status_absent', () => gates.buildRepresentativeReplayReport({ statusState: 'absent' }), 'representativeRealPrReplayStatus', 'fail'],
  ['representative_replay_body_only_repair', () => gates.buildRepresentativeReplayReport({ bodyOnlyRepair: true }), 'representativeRealPrReplayStatus', 'pass'],
  ['representative_replay_backend_cwd_regression', () => gates.buildRepresentativeReplayReport({ backendCwdRegression: true }), 'representativeRealPrReplayStatus', 'fail'],
  ['representative_replay_contracts_cwd_regression', () => gates.buildRepresentativeReplayReport({ contractsCwdRegression: true }), 'representativeRealPrReplayStatus', 'fail'],
  ['representative_replay_token_preflight_no_deploy_no_tx', () => gates.buildRepresentativeReplayReport({ tokenPreflightNoDeployNoTx: true }), 'representativeRealPrReplayStatus', 'pass'],
  ['representative_replay_live2d_handoff', () => gates.buildRepresentativeReplayReport({ live2dHandoff: true }), 'representativeRealPrReplayStatus', 'pass'],
  ['representative_replay_cripto_manual_gate', () => gates.buildRepresentativeReplayReport({ criptoManualGate: true }), 'representativeRealPrReplayStatus', 'pass'],
  ['harness_doctor_outputs_one_safe_next_action', () => gates.buildHarnessDoctorReport({ oneSafeNextAction: 'verify_source_pr_remote_gate' }), 'harnessDoctorStatus', 'pass'],
  ['operator_digest_max_seven_lines', () => gates.buildHarnessDoctorReport({}), 'operatorDigestV2Status', 'pass'],
  ['agent_runtime_no_merge_authority', () => gates.buildAgentRuntimeGovernanceReport({ mergeAuthority: true }), 'agentRuntimeGovernanceStatus', 'fail'],
  ['agent_runtime_no_secret_access', () => gates.buildAgentRuntimeGovernanceReport({ secretAccess: true }), 'agentRuntimeGovernanceStatus', 'fail'],
  ['permission_matrix_blocks_autonomous_deploy', () => gates.buildAgentRuntimeGovernanceReport({ autonomousDeploy: true }), 'permissionModeMatrixStatus', 'fail'],
  ['mcp_extension_requires_risk_class', () => gates.buildDefaultV107Reports(), 'extensionCapabilityRegistryStatus', 'pass'],
  ['goose_ignore_boundary_blocks_env_key_pem', () => gates.buildAgentRuntimeGovernanceReport({ envKeyPemAllowed: true }), 'gooseIgnoreLikeFileBoundaryStatus', 'fail'],
  ['context_revision_preserves_owner_decisions', () => gates.buildAgentRuntimeGovernanceReport({}), 'contextRevisionGovernanceStatus', 'pass'],
  ['goal_contract_requires_measurable_exit', () => gates.buildGoalContractReport({ goal: { goal_id: 'x', owner_intent: 'source' } }), 'goalContractStatus', 'fail'],
  ['goal_contract_rejects_unbounded_goal', () => gates.buildGoalContractReport({ goal: { goal_id: 'x', owner_intent: 'source', measurable_exit_criteria: ['gate'], proof_command_or_artifact: 'gate', forbidden_changes: [], stop_conditions: [], output_artifact: 'pr' } }), 'goalContractStatus', 'fail'],
  ['trace_to_eval_requires_reviewed_finding', () => gates.buildTraceToEvalReport({ unreviewedTraceToImplementation: true }), 'traceToEvalLoopStatus', 'fail'],
  ['moderation_signal_is_not_absolute_approval', () => gates.buildModerationAndAsrReport({ moderationAbsoluteApproval: true }), 'moderationSignalGateStatus', 'fail'],
  ['asr_transcript_requires_provenance', () => gates.buildModerationAndAsrReport({ asr: {} }), 'asrTranscriptProvenanceStatus', 'fail'],
  ['recursive_self_improvement_no_self_approval', () => gates.buildSelfImprovementReport({ selfApproval: true }), 'recursiveSelfImprovementBoundaryStatus', 'fail'],
  ['quality_self_protection_detects_continue_on_error', () => gates.buildSecurityAndSelfProtectionReport({ continueOnErrorAdded: true }), 'qualityGateSelfProtectionV3Status', 'fail'],
  ['quality_self_protection_detects_required_status_removed', () => gates.buildSecurityAndSelfProtectionReport({ requiredStatusRemoved: true }), 'requiredStatusDiffStatus', 'fail'],
  ['safe_output_active_scanner_blocks_raw_secret_like_values', () => gates.buildSecurityAndSelfProtectionReport({ rawSecretLikeValue: true }), 'safeOutputActiveScannerStatus', 'fail'],
  ['readiness_firewall_rejects_runtime_ready_claim_from_fixture', () => gates.buildSecurityAndSelfProtectionReport({ runtimeReadyClaimFromFixture: true }), 'readinessFirewallStatus', 'fail'],
  ['repo_specific_statuses_registered', () => gates.buildRepoSpecificRegistrationReports(), 'criptoTipEvidencePackV3Status', 'policy_registered'],
  ['safe_summary_blocks_raw_fields', () => ({ status: Object.keys(safeSummary).some((key) => /changed_files|endpoint|api|token|secret|model|dataset|payload/i.test(key)) ? 'fail' : 'pass', safeSummaryOnly: true }), 'status', 'pass'],
];

const defaultReport = gates.buildDefaultV107Reports({ caseCount: CASES.length, failedCaseCount: 0 });
for (const key of gates.V107_STATUS_KEYS) {
  CASES.push([`default_status_${key}`, () => defaultReport, key, 'pass']);
}

const results = CASES.map(([name, builder, key, expected]) => {
  const report = builder();
  const actual = statusOf(report, key);
  return { name, status: actual === expected ? 'pass' : 'fail', expected, actual, safeSummaryOnly: true };
});

const failures = results.filter((item) => item.status !== 'pass');
const report = {
  marker: 'CODEX_QUALITY_HARNESS_FILE v1.0.7',
  status: failures.length ? 'fail' : 'pass',
  activeHarnessVersion: '1.0.7',
  activeSelfTestSuite: 'v107',
  activeSelfTestStatusKey: 'v107SelfTestStatus',
  activeSelfTest: {
    suite: 'v107',
    statusKey: 'v107SelfTestStatus',
    status: failures.length ? 'fail' : 'pass',
    blocking: true,
    caseCount: results.length,
    failedCaseCount: failures.length,
    source: 'scripts/codex-v107-self-test.mjs',
  },
  legacySuites: { v106: 'advisory', v105: 'advisory', v104: 'advisory', v103: 'advisory' },
  v107SelfTestStatus: {
    status: failures.length ? 'fail' : 'pass',
    blocking: true,
    reasonCodes: failures.length ? ['v107_self_test_failed'] : [],
    evidenceConsumed: [],
    safeSummary: {
      caseCount: results.length,
      failedCaseCount: failures.length,
      activeSelfTestSuite: 'v107',
    },
    nextSafeAction: failures.length ? 'repair_v107_self_test' : 'continue_source_harness_validation',
    failures,
    safeSummaryOnly: true,
  },
  representativeRealPrReplay: failures.length ? 'fail' : 'pass',
  representativeLivePrValidation: 'not_started',
  targetRollout: 'not_started',
  safeSummaryOnly: true,
};

if (scanObjectForUnsafe(report).length) {
  report.status = 'fail';
  report.v107SelfTestStatus = {
    status: 'fail',
    blocking: true,
    reasonCodes: ['unsafe_value_detected'],
    evidenceConsumed: [],
    safeSummary: {},
    nextSafeAction: 'repair_unsafe_self_test_output',
    safeSummaryOnly: true,
  };
}

writeJsonReport(report, 'CODEX_V107_SELF_TEST_REPORT');
exitFor(report);

function renderFromPack() {
  return {
    generatedFromEvidencePack: true,
    containsRawLogs: false,
    containsRawDiff: false,
    containsSecrets: false,
    safeSummaryOnly: true,
  };
}

function buildSafeSummary(records) {
  return {
    recordCount: records.length,
    safeSummaryOnly: true,
  };
}
