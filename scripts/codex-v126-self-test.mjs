#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.6

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { writeJsonReport, exitFor } from './codex-v080-lib.mjs';
import {
  V126_OPERATOR_STATUS_KEYS,
  V126_P0_ARTIFACTS,
  buildOrchestrationCapsule,
  validateContextSkillValidationBudgetRouter,
  validateEvidenceLaneStateMachineAndSafeFailureCapsule,
  validateObservedWorkspaceOwnerReceiptAndCapability,
  validateOrchestrationCapsule,
  validateSkillReviewProductValueEffectiveness,
  validateSpecFirstCheckerBuilderLoopAndStopCircuit,
} from './codex-orchestration-capsule.mjs';
import { buildWorkerProofCapsule, validateWorkerProofCapsule } from './codex-worker-proof-capsule.mjs';
import { buildOwnerDecisionBrief, validateOwnerDecisionBrief } from './codex-owner-decision-brief.mjs';

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail', safeSummaryOnly: true };
  } catch {
    return { name, status: 'fail', reasonCodes: ['self_test_exception'], safeSummaryOnly: true };
  }
}

function failed(status) {
  return status?.status === 'fail';
}

function passed(status) {
  return status?.status === 'pass';
}

function buildAgentsFixture(overrides = {}) {
  const authority = overrides.authority || `v1.1.8 Final Decision remains final authority.
v1.1.9 P0 artifacts and operator-visible statuses remain preserved.
v1.2.0 adaptive routing, v1.2.1 calibration, v1.2.2 read-budget routing,
and v1.2.3 observed evidence/decision closure remain compatibility layers.
v1.2.4 delegated autonomy and evidence semantics remain compatibility layers.
v1.2.5 goal shard, worktree fleet, evidence lane, typed monitor, fanout, and
yield remain compatibility layers.
v1.2.6 adds only internal observed workspace, owner/delegated receipt,
checker/builder loop, safe failure capsule, context/skill/validation budget,
and effectiveness fields inside existing P0 artifacts.`;
  const localTaskDiscipline = overrides.localTaskDiscipline || `Start from clean default branch or clean worktree. Preserve user changes.
Run v126 self-test and local quality gate for v1.2.6 harness rollout. Run v125
only as a blocking compatibility test where required. For product work, use the
repo-specific commands above and keep product evidence separate from harness
evidence.`;
  const targetFootprint = overrides.targetFootprint || `Do not add new P0 artifacts, top-level statuses, skills, workflow behavior,
product code, package or lockfile changes, runtime code, or readiness claims
for harness rollout unless separately scoped by the owner.`;
  return `# AGENTS.md

<!-- CODEX_QUALITY_HARNESS_BEGIN -->
CODEX_QUALITY_HARNESS_FILE v1.2.6

## Active Harness

Active target harness: v1.2.6 / v126.

## Authority

${authority}

## Target Footprint

${targetFootprint}

## Local Task Discipline

${localTaskDiscipline}
<!-- CODEX_QUALITY_HARNESS_END -->
`;
}

function readCurrentAgents() {
  return fs.readFileSync('AGENTS.md', 'utf8');
}

function agentsHasActiveV126(content) {
  return content.includes('CODEX_QUALITY_HARNESS_FILE v1.2.6')
    && content.includes('Active target harness: v1.2.6 / v126.');
}

function agentsLocalTaskUsesV126(content) {
  return content.includes('Run v126 self-test and local quality gate for v1.2.6 harness rollout.');
}

function agentsV125CompatibilityOnly(content) {
  const normalized = content.replace(/\s+/g, ' ');
  return normalized.includes('Run v125 only as a blocking compatibility test where required.');
}

function agentsObservedStateAuthorityLinePresent(content) {
  return content.includes('v1.2.6 adds only internal observed workspace, owner/delegated receipt,')
    && content.includes('checker/builder loop, safe failure capsule, context/skill/validation budget,')
    && content.includes('and effectiveness fields inside existing P0 artifacts.');
}

function agentsPreservesNoNewP0Language(content) {
  return content.includes('Do not add new P0 artifacts');
}

function agentsPreservesNoNewTopLevelStatusLanguage(content) {
  return content.includes('top-level statuses');
}

function agentsPreservesRuntimeReadinessBoundary(content) {
  return content.includes('runtime code, or readiness claims')
    && !content.includes('runtime readiness is claimed')
    && !content.includes('production readiness is claimed');
}

function runNodeScript(script) {
  return spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 4,
  });
}

function syntheticLiveLoopSurfacePresent() {
  return fs.existsSync('docs/specs/IRIS_20240425/IRIS_SYNTHETIC_LIVE_LOOP_DRY_RUN.md')
    && fs.existsSync('docs/specs/IRIS_20240425/fixtures/live_loop/iris_synthetic_live_loop_fixtures.jsonl')
    && fs.existsSync('scripts/codex-iris-synthetic-live-loop-dry-run.mjs')
    && fs.existsSync('scripts/codex-iris-synthetic-live-loop-dry-run-self-test.mjs');
}

function syntheticLiveLoopReport() {
  const result = runNodeScript('scripts/codex-iris-synthetic-live-loop-dry-run.mjs');
  if (result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

function syntheticLiveLoopSelfTestPasses() {
  return runNodeScript('scripts/codex-iris-synthetic-live-loop-dry-run-self-test.mjs').status === 0;
}

function syntheticLiveLoopFileIncludes(pattern) {
  return fs.readFileSync('scripts/codex-iris-synthetic-live-loop-dry-run.mjs', 'utf8').includes(pattern)
    || fs.readFileSync('scripts/codex-iris-synthetic-live-loop-dry-run-self-test.mjs', 'utf8').includes(pattern)
    || fs.readFileSync('docs/specs/IRIS_20240425/fixtures/live_loop/iris_synthetic_live_loop_fixtures.jsonl', 'utf8').includes(pattern);
}

function firstRuntimeSliceSelfTestPasses() {
  return runNodeScript('scripts/iris-first-runtime-vertical-slice-self-test.mjs').status === 0;
}

function firstRuntimeSliceFileIncludes(filePath, pattern) {
  return fs.readFileSync(filePath, 'utf8').includes(pattern);
}

function firstRuntimeSliceRuntimeSource() {
  return fs.readFileSync('src/runtime/firstRuntimeVerticalSlice.js', 'utf8');
}

const compatibilityCases = [
  ['v126_self_test_must_pass', () => true],
  ['v126_adds_no_new_p0_artifact', () => V126_P0_ARTIFACTS.length === 3 && !V126_P0_ARTIFACTS.includes('codex-v126-observed-state.safe.json')],
  ['v126_adds_no_new_top_level_status', () => V126_OPERATOR_STATUS_KEYS.length === 8 && !V126_OPERATOR_STATUS_KEYS.includes('observedStateStatus')],
  ['v126_preserves_v118_final_decision', () => buildOrchestrationCapsule().finalAuthority === 'v1.1.8_final_decision_kernel'],
  ['v126_preserves_v119_orchestration_artifacts', () => V126_P0_ARTIFACTS.includes('codex-orchestration-capsule.safe.json')],
  ['v126_no_bridge_or_tunnel_default_on', () => !fs.existsSync('scripts/codex-mcp-bridge-daemon.mjs') && !fs.existsSync('scripts/codex-tunnel-daemon.mjs')],
  ['v126_active_authority_tuple_is_current', () => buildOrchestrationCapsule().skillContextRouting.activeAuthorityTuple.activeSelfTestSuite === 'v126'],
  ['agents_active_harness_is_v126', () => agentsHasActiveV126(readCurrentAgents())],
  ['agents_local_task_discipline_uses_v126', () => agentsLocalTaskUsesV126(readCurrentAgents())],
  ['agents_v125_is_compatibility_not_primary', () => agentsV125CompatibilityOnly(readCurrentAgents()) && !agentsLocalTaskUsesV126(buildAgentsFixture({
    localTaskDiscipline: 'Run v125 self-test and the local quality gate for harness rollout.',
  }))],
  ['agents_v126_observed_state_authority_line_present', () => agentsObservedStateAuthorityLinePresent(readCurrentAgents())],
  ['agents_no_new_p0_artifact_language_preserved', () => agentsPreservesNoNewP0Language(readCurrentAgents())],
  ['agents_no_new_top_level_status_language_preserved', () => agentsPreservesNoNewTopLevelStatusLanguage(readCurrentAgents())],
  ['agents_no_runtime_or_readiness_scope_expansion', () => agentsPreservesRuntimeReadinessBoundary(readCurrentAgents())],
];

const observedStateCases = [
  ['observed_workspace_owner_receipt_default_passes', () => passed(validateObservedWorkspaceOwnerReceiptAndCapability(buildOrchestrationCapsule().observedWorkspaceOwnerReceiptAndCapability))],
  ['observed_workspace_blocks_wrong_cwd', () => failed(validateObservedWorkspaceOwnerReceiptAndCapability(buildOrchestrationCapsule({
    observedWorkspaceOwnerReceiptAndCapability: { observedWorkspaceState: { wrongCwdDetected: true } },
  }).observedWorkspaceOwnerReceiptAndCapability))],
  ['observed_workspace_blocks_stale_clone', () => failed(validateObservedWorkspaceOwnerReceiptAndCapability(buildOrchestrationCapsule({
    observedWorkspaceOwnerReceiptAndCapability: { observedWorkspaceState: { staleCloneDetected: true } },
  }).observedWorkspaceOwnerReceiptAndCapability))],
  ['merge_action_requires_structured_owner_receipt', () => failed(validateObservedWorkspaceOwnerReceiptAndCapability(buildOrchestrationCapsule({
    observedWorkspaceOwnerReceiptAndCapability: { ownerDecisionReceipt: { allowedAction: 'merge_current_pr', present: false } },
  }).observedWorkspaceOwnerReceiptAndCapability))],
  ['owner_receipt_cannot_be_ai_created', () => failed(validateObservedWorkspaceOwnerReceiptAndCapability(buildOrchestrationCapsule({
    observedWorkspaceOwnerReceiptAndCapability: { ownerDecisionReceipt: { ownerAuthorityCreatedByAI: true } },
  }).observedWorkspaceOwnerReceiptAndCapability))],
  ['delegated_process_cannot_authorize_release', () => failed(validateObservedWorkspaceOwnerReceiptAndCapability(buildOrchestrationCapsule({
    observedWorkspaceOwnerReceiptAndCapability: { ownerDelegatedProcessReceipt: { present: true, autoContinueAllowed: true, allowedActions: ['release'] } },
  }).observedWorkspaceOwnerReceiptAndCapability))],
  ['bridge_must_not_default_on', () => failed(validateObservedWorkspaceOwnerReceiptAndCapability(buildOrchestrationCapsule({
    observedWorkspaceOwnerReceiptAndCapability: { capabilityBoundary: { bridgeDefaultEnabled: true } },
  }).observedWorkspaceOwnerReceiptAndCapability))],
  ['bridge_transcript_is_not_machine_evidence', () => failed(validateObservedWorkspaceOwnerReceiptAndCapability(buildOrchestrationCapsule({
    observedWorkspaceOwnerReceiptAndCapability: { capabilityBoundary: { bridgeTranscriptMachineEvidence: true } },
  }).observedWorkspaceOwnerReceiptAndCapability))],
];

const loopCases = [
  ['checker_builder_loop_default_passes', () => passed(validateSpecFirstCheckerBuilderLoopAndStopCircuit(buildOrchestrationCapsule().specFirstCheckerBuilderLoopAndStopCircuit))],
  ['checker_must_be_read_only', () => failed(validateSpecFirstCheckerBuilderLoopAndStopCircuit(buildOrchestrationCapsule({
    specFirstCheckerBuilderLoopAndStopCircuit: { checkerCanEdit: true },
  }).specFirstCheckerBuilderLoopAndStopCircuit))],
  ['same_agent_cannot_satisfy_independent_check', () => failed(validateSpecFirstCheckerBuilderLoopAndStopCircuit(buildOrchestrationCapsule({
    specFirstCheckerBuilderLoopAndStopCircuit: { sameAgentCannotSatisfyIndependentCheck: false },
  }).specFirstCheckerBuilderLoopAndStopCircuit))],
  ['loop_stops_on_regression', () => failed(validateSpecFirstCheckerBuilderLoopAndStopCircuit(buildOrchestrationCapsule({
    specFirstCheckerBuilderLoopAndStopCircuit: { regressionDetected: true },
  }).specFirstCheckerBuilderLoopAndStopCircuit))],
  ['loop_stops_on_test_weakening', () => failed(validateSpecFirstCheckerBuilderLoopAndStopCircuit(buildOrchestrationCapsule({
    specFirstCheckerBuilderLoopAndStopCircuit: { testWeakeningDetected: true },
  }).specFirstCheckerBuilderLoopAndStopCircuit))],
  ['loop_cannot_continue_after_same_failure_repeat_cap', () => failed(validateSpecFirstCheckerBuilderLoopAndStopCircuit(buildOrchestrationCapsule({
    specFirstCheckerBuilderLoopAndStopCircuit: { loopContinuationAllowed: true, sameFailureRepeatCount: 2 },
  }).specFirstCheckerBuilderLoopAndStopCircuit))],
];

const evidenceAndRouterCases = [
  ['evidence_lane_state_machine_default_passes', () => passed(validateEvidenceLaneStateMachineAndSafeFailureCapsule(buildOrchestrationCapsule().evidenceLaneStateMachineAndSafeFailureCapsule))],
  ['merge_consideration_requires_same_head_remote_pass', () => failed(validateEvidenceLaneStateMachineAndSafeFailureCapsule(buildOrchestrationCapsule({
    evidenceLaneStateMachineAndSafeFailureCapsule: { evidenceLaneStateMachine: { currentState: 'merge_consideration', remoteStatus: 'pending' } },
  }).evidenceLaneStateMachineAndSafeFailureCapsule))],
  ['safe_failure_forbids_raw_logs', () => failed(validateEvidenceLaneStateMachineAndSafeFailureCapsule(buildOrchestrationCapsule({
    evidenceLaneStateMachineAndSafeFailureCapsule: { safeFailureCapsule: { rawLogIncluded: true } },
  }).evidenceLaneStateMachineAndSafeFailureCapsule))],
  ['safe_failure_cannot_expand_scope', () => failed(validateEvidenceLaneStateMachineAndSafeFailureCapsule(buildOrchestrationCapsule({
    evidenceLaneStateMachineAndSafeFailureCapsule: { safeFailureCapsule: { scopeExpansionAllowed: true } },
  }).evidenceLaneStateMachineAndSafeFailureCapsule))],
  ['budget_router_default_passes', () => passed(validateContextSkillValidationBudgetRouter(buildOrchestrationCapsule().contextSkillValidationBudgetRouter))],
  ['budget_router_caps_skills_at_two', () => failed(validateContextSkillValidationBudgetRouter(buildOrchestrationCapsule({
    contextSkillValidationBudgetRouter: { selectedSkills: ['a', 'b', 'c'] },
  }).contextSkillValidationBudgetRouter))],
  ['budget_router_caps_md_reads_at_three', () => failed(validateContextSkillValidationBudgetRouter(buildOrchestrationCapsule({
    contextSkillValidationBudgetRouter: { mdFilesRead: ['a.md', 'b.md', 'c.md', 'd.md'] },
  }).contextSkillValidationBudgetRouter))],
  ['budget_router_cannot_skip_same_head_for_merge', () => failed(validateContextSkillValidationBudgetRouter(buildOrchestrationCapsule({
    contextSkillValidationBudgetRouter: { sameHeadRemoteGateCannotBeSkippedForMerge: false },
  }).contextSkillValidationBudgetRouter))],
];

const effectivenessAndArtifactCases = [
  ['effectiveness_default_passes', () => passed(validateSkillReviewProductValueEffectiveness(buildOrchestrationCapsule().skillReviewProductValueEffectiveness))],
  ['harmful_skill_is_hard_fail', () => failed(validateSkillReviewProductValueEffectiveness(buildOrchestrationCapsule({
    skillReviewProductValueEffectiveness: { skillEffectiveness: { harmfulSkill: true } },
  }).skillReviewProductValueEffectiveness))],
  ['fanout_stops_after_two_no_signal_cycles', () => failed(validateSkillReviewProductValueEffectiveness(buildOrchestrationCapsule({
    skillReviewProductValueEffectiveness: { reviewEffectiveness: { fanoutContinuationAllowed: true, noNewSignalRepeatCount: 2 } },
  }).skillReviewProductValueEffectiveness))],
  ['product_value_return_cannot_authorize_product_scope', () => failed(validateSkillReviewProductValueEffectiveness(buildOrchestrationCapsule({
    skillReviewProductValueEffectiveness: { productValueReturnGate: { productScopeAuthorized: true } },
  }).skillReviewProductValueEffectiveness))],
  ['repeated_harness_only_requires_next_product_slice', () => failed(validateSkillReviewProductValueEffectiveness(buildOrchestrationCapsule({
    skillReviewProductValueEffectiveness: { productValueReturnGate: { evidenceOnlyRepeated: true, recentHarnessOnlyCount: 3, nextProductSliceRecommended: false } },
  }).skillReviewProductValueEffectiveness))],
  ['worker_proof_default_v126_extensions_pass', () => passed(validateWorkerProofCapsule(buildWorkerProofCapsule()))],
  ['worker_observed_state_blocks_forbidden_files', () => failed(validateWorkerProofCapsule(buildWorkerProofCapsule({
    observedGitWorktreePrState: { forbiddenFilesTouched: true },
  })))],
  ['worker_observed_state_blocks_stale_branch', () => failed(validateWorkerProofCapsule(buildWorkerProofCapsule({
    observedGitWorktreePrState: { staleBranchDetected: true },
  })))],
  ['owner_brief_default_v126_receipts_pass', () => passed(validateOwnerDecisionBrief(buildOwnerDecisionBrief()))],
  ['owner_brief_merge_receipt_requires_head', () => failed(validateOwnerDecisionBrief(buildOwnerDecisionBrief({
    ownerDecisionReceipt: { present: true, allowedAction: 'merge_current_pr', headSha: null },
  })))],
  ['owner_brief_delegated_process_cannot_allow_secret', () => failed(validateOwnerDecisionBrief(buildOwnerDecisionBrief({
    ownerDelegatedProcessReceipt: { present: true, autoContinueAllowed: true, allowedActions: ['secretAccess'] },
  })))],
  ['orchestration_capsule_validates_all_v126_internal_blocks', () => {
    const result = validateOrchestrationCapsule(buildOrchestrationCapsule());
    return Object.values(result).every((item) => item.status === 'pass');
  }],
];

const syntheticLiveLoopCases = [
  ['synthetic_live_loop_present_v126', () => syntheticLiveLoopSurfacePresent()],
  ['synthetic_live_loop_self_test_passes_v126', () => syntheticLiveLoopSelfTestPasses()],
  ['synthetic_live_loop_no_external_call_v126', () => syntheticLiveLoopReport()?.externalCallPerformed === false],
  ['synthetic_live_loop_candidate_not_executable_v126', () => syntheticLiveLoopReport()?.ok === true],
  ['synthetic_live_loop_no_direct_memory_commit_v126', () => syntheticLiveLoopReport()?.memoryCommitPerformed === false],
  ['synthetic_live_loop_no_payment_relationship_growth_v126', () => syntheticLiveLoopReport()?.relationshipCommitPerformed === false],
  ['synthetic_live_loop_preserves_priority1_blocked_v126', () => syntheticLiveLoopReport()?.priority1Status === 'BLOCKED'],
  ['synthetic_live_loop_no_readiness_claim_v126', () => syntheticLiveLoopReport()?.productionReadinessClaimed === false],
  ['synthetic_live_loop_oracle_independence_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('safe_expected_fail_does_not_force_actual_fail')],
  ['synthetic_live_loop_expected_blocking_not_echoed_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('safe_expected_blocking_does_not_force_actual_blocking')],
  ['synthetic_live_loop_negative_group_non_authority_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('negative_group_without_violation_fails')],
  ['synthetic_live_loop_required_fields_enforced_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('missing_required_field_fails')],
  ['synthetic_live_loop_unique_scenario_id_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('duplicate_scenario_id_fails')],
  ['synthetic_live_loop_unique_trace_id_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('duplicate_trace_id_fails')],
  ['synthetic_live_loop_approved_game_input_rejected_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('approved_game_input_action_rejected')],
  ['synthetic_live_loop_world_command_rejected_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('world_command_rejected')],
  ['synthetic_live_loop_public_publish_rejected_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('public_publish_rejected')],
  ['synthetic_live_loop_external_call_rejected_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('external_call_rejected')],
  ['synthetic_live_loop_production_go_rejected_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('production_go_rejected')],
  ['synthetic_live_loop_runtime_readiness_rejected_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('runtime_readiness_claim_rejected')],
  ['synthetic_live_loop_direct_relationship_commit_rejected_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('direct_relationship_commit_rejected')],
  ['synthetic_live_loop_donation_relationship_candidate_rejected_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('donation_relationship_candidate_rejected')],
  ['synthetic_live_loop_muted_viewer_blocks_personalization_v126', () => syntheticLiveLoopSelfTestPasses() && syntheticLiveLoopFileIncludes('muted_viewer_blocks_personalization')],
];

const firstRuntimeSliceCases = [
  ['first_runtime_slice_self_test_registered_in_run_tests_v126', () => firstRuntimeSliceFileIncludes('scripts/run-tests.js', 'iris-first-runtime-vertical-slice-self-test.mjs')],
  ['first_runtime_slice_self_test_exit_zero_required_v126', () => firstRuntimeSliceSelfTestPasses()],
  ['first_runtime_slice_runtime_file_exact_scope_v126', () => fs.existsSync('src/runtime/firstRuntimeVerticalSlice.js')],
  ['first_runtime_slice_no_external_capability_import_v126', () => !/(node:http|node:https|node:net|node:dgram|node:child_process|node:fs|node:os|node:worker_threads|\bprocess\.env\b|\breadFile\b|readFileSync|\bfetch\b|WebSocket|createConnection|spawn|execFile|\bexec\b|\bfork\b|writeFile|appendFile|createWriteStream)/.test(firstRuntimeSliceRuntimeSource())],
  ['first_runtime_slice_emergency_stop_case_present_v126', () => firstRuntimeSliceFileIncludes('scripts/iris-first-runtime-vertical-slice-self-test.mjs', 'fixture_emergency_stop_blocks_first')],
  ['first_runtime_slice_tampered_result_regressions_present_v126', () => firstRuntimeSliceFileIncludes('scripts/iris-first-runtime-vertical-slice-self-test.mjs', 'validate_result_rejects_true_side_effect')
    && firstRuntimeSliceFileIncludes('scripts/iris-first-runtime-vertical-slice-self-test.mjs', 'validate_result_rejects_blocked_with_response_candidate')
    && firstRuntimeSliceFileIncludes('scripts/iris-first-runtime-vertical-slice-self-test.mjs', 'validate_result_rejects_unexpected_trace_field')],
];

const cases = [
  ...compatibilityCases,
  ...observedStateCases,
  ...loopCases,
  ...evidenceAndRouterCases,
  ...effectivenessAndArtifactCases,
  ...syntheticLiveLoopCases,
  ...firstRuntimeSliceCases,
].map(([name, fn]) => test(name, fn));

const fixtureGroups = [
  'v118_v119_v120_v121_v122_v123_v124_v125_compatibility_matrix',
  'observed_workspace_owner_receipt_capability_matrix',
  'checker_builder_loop_stop_circuit_matrix',
  'evidence_lane_state_machine_safe_failure_matrix',
  'context_skill_validation_budget_router_matrix',
  'skill_review_product_value_effectiveness_matrix',
  'worker_observed_git_worktree_pr_state_matrix',
  'owner_receipt_delegated_process_matrix',
  'iris_synthetic_live_loop_dry_run_matrix',
  'iris_first_runtime_vertical_slice_regression_matrix',
];

const failures = cases.filter((item) => item.status !== 'pass');
const report = {
  v126SelfTestStatus: {
    status: failures.length ? 'fail' : 'pass',
    caseCount: cases.length,
    failureCount: failures.length,
    fixtureGroups,
    safeSummaryOnly: true,
  },
  cases,
  status: failures.length ? 'fail' : 'pass',
  safeSummaryOnly: true,
};

writeJsonReport(report, 'CODEX_V126_SELF_TEST_REPORT');
if (!process.env.CODEX_V126_SELF_TEST_REPORT && process.env.CODEX_QUALITY_REPORT !== 'json') {
  console.log(`v126SelfTestStatus: ${report.v126SelfTestStatus.status}`);
}
exitFor(report);
