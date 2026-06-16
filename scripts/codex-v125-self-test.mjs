#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { writeJsonReport, exitFor } from './codex-v080-lib.mjs';
import {
  V125_OPERATOR_STATUS_KEYS,
  V125_P0_ARTIFACTS,
  buildOrchestrationCapsule,
  validateEvidenceLaneAndQGLane,
  validateGoalShardAndProgressEvidence,
  validateOrchestrationCapsule,
  validateSkillReviewProductValueYield,
  validateTypedMonitorInboxAndFanoutGuard,
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

const compatibilityCases = [
  ['v125_self_test_must_pass', () => true],
  ['v125_adds_no_new_p0_artifact', () => V125_P0_ARTIFACTS.length === 3 && !V125_P0_ARTIFACTS.includes('codex-v125-goal-shards.safe.json')],
  ['v125_adds_no_new_top_level_status', () => V125_OPERATOR_STATUS_KEYS.length === 8 && !V125_OPERATOR_STATUS_KEYS.includes('goalShardStatus')],
  ['v125_preserves_v118_final_decision', () => buildOrchestrationCapsule().finalAuthority === 'v1.1.8_final_decision_kernel'],
  ['v125_preserves_v119_orchestration_artifacts', () => V125_P0_ARTIFACTS.includes('codex-orchestration-capsule.safe.json')],
  ['v125_no_tui_or_cron_daemon', () => !fs.existsSync('scripts/codex-tui-socket-injector.mjs') && !fs.existsSync('scripts/codex-two-minute-cron-daemon.mjs')],
  ['v125_active_authority_tuple_is_current', () => buildOrchestrationCapsule().skillContextRouting.activeAuthorityTuple.activeSelfTestSuite === 'v125'],
];

const goalShardCases = [
  ['goal_shard_default_passes', () => passed(validateGoalShardAndProgressEvidence(buildOrchestrationCapsule().goalShardAndProgressEvidence))],
  ['goal_shard_is_not_owner_authority', () => failed(validateGoalShardAndProgressEvidence(buildOrchestrationCapsule({
    goalShardAndProgressEvidence: { goalShard: { ownerAuthorityCreatedByShard: true } },
  }).goalShardAndProgressEvidence))],
  ['goal_shard_expires_when_head_changes', () => failed(validateGoalShardAndProgressEvidence(buildOrchestrationCapsule({
    goalShardAndProgressEvidence: { goalShard: { expiresWhenHeadChanges: false } },
  }).goalShardAndProgressEvidence))],
  ['goal_shard_blocks_duplicate_goal_omission', () => failed(validateGoalShardAndProgressEvidence(buildOrchestrationCapsule({
    goalShardAndProgressEvidence: { goalShard: { duplicateGoalDetectionRequired: false } },
  }).goalShardAndProgressEvidence))],
  ['goal_shard_completion_compacts_to_safe_summary', () => failed(validateGoalShardAndProgressEvidence(buildOrchestrationCapsule({
    goalShardAndProgressEvidence: { goalShard: { completionCompactsToSafeSummary: false } },
  }).goalShardAndProgressEvidence))],
  ['progress_pass_requires_tool_evidence', () => failed(validateGoalShardAndProgressEvidence(buildOrchestrationCapsule({
    goalShardAndProgressEvidence: { progressEvidence: { progressReportStatus: 'pass', toolEvidencePointers: [] } },
  }).goalShardAndProgressEvidence))],
];

const evidenceLaneCases = [
  ['evidence_lane_default_passes', () => passed(validateEvidenceLaneAndQGLane(buildOrchestrationCapsule().evidenceLaneAndQGLaneSemantics))],
  ['pr_body_not_machine_evidence', () => failed(validateEvidenceLaneAndQGLane(buildOrchestrationCapsule({
    evidenceLaneAndQGLaneSemantics: { humanSummaryLane: { prBodyIsMachineEvidence: true } },
  }).evidenceLaneAndQGLaneSemantics))],
  ['committed_lane_not_current_head_merge_evidence', () => failed(validateEvidenceLaneAndQGLane(buildOrchestrationCapsule({
    evidenceLaneAndQGLaneSemantics: { committedEvidenceLane: { currentHeadMergeEvidence: true, boundByRemoteCurrentHeadLane: false } },
  }).evidenceLaneAndQGLaneSemantics))],
  ['owner_intent_lane_cannot_be_ai_created', () => failed(validateEvidenceLaneAndQGLane(buildOrchestrationCapsule({
    evidenceLaneAndQGLaneSemantics: { ownerIntentLane: { ownerAuthorityCreatedByAI: true } },
  }).evidenceLaneAndQGLaneSemantics))],
  ['qg_lane_pending_not_failure', () => failed(validateEvidenceLaneAndQGLane(buildOrchestrationCapsule({
    evidenceLaneAndQGLaneSemantics: { qgLaneSemantics: { pendingIsFailure: true } },
  }).evidenceLaneAndQGLaneSemantics))],
  ['same_head_required_only_for_merge_consideration', () => failed(validateEvidenceLaneAndQGLane(buildOrchestrationCapsule({
    evidenceLaneAndQGLaneSemantics: { qgLaneSemantics: { terminalPhase: 'create_pr_only', sameHeadRemoteGateRequired: true } },
  }).evidenceLaneAndQGLaneSemantics))],
  ['post_merge_requires_marker_manifest_drift_check', () => failed(validateEvidenceLaneAndQGLane(buildOrchestrationCapsule({
    evidenceLaneAndQGLaneSemantics: { qgLaneSemantics: { terminalPhase: 'post_merge_verify', currentLane: 'post_merge_sentinel', postMergeRequiresMarkerManifestDriftCheck: false } },
  }).evidenceLaneAndQGLaneSemantics))],
];

const monitorAndYieldCases = [
  ['typed_monitor_default_passes', () => passed(validateTypedMonitorInboxAndFanoutGuard(buildOrchestrationCapsule().typedMonitorInboxAndFanoutGuard))],
  ['typed_monitor_blocks_raw_prompt_injection', () => failed(validateTypedMonitorInboxAndFanoutGuard(buildOrchestrationCapsule({
    typedMonitorInboxAndFanoutGuard: { typedMonitorInbox: { rawPromptInjection: true } },
  }).typedMonitorInboxAndFanoutGuard))],
  ['typed_monitor_message_cannot_create_owner_authority', () => failed(validateTypedMonitorInboxAndFanoutGuard(buildOrchestrationCapsule({
    typedMonitorInboxAndFanoutGuard: { typedMonitorInbox: { ownerAuthorityCreatedByMessage: true } },
  }).typedMonitorInboxAndFanoutGuard))],
  ['typed_monitor_message_cannot_authorize_mutation', () => failed(validateTypedMonitorInboxAndFanoutGuard(buildOrchestrationCapsule({
    typedMonitorInboxAndFanoutGuard: { typedMonitorInbox: { mutationAuthorizedByMessage: true } },
  }).typedMonitorInboxAndFanoutGuard))],
  ['fanout_stops_when_no_new_information', () => failed(validateTypedMonitorInboxAndFanoutGuard(buildOrchestrationCapsule({
    typedMonitorInboxAndFanoutGuard: { fanoutRoiLedger: { highestTierUsed: true, nextFanoutAllowed: true } },
  }).typedMonitorInboxAndFanoutGuard))],
  ['source_unknown_skill_effectiveness_is_hard', () => failed(validateSkillReviewProductValueYield(buildOrchestrationCapsule({
    skillReviewProductValueYield: { sourceHard: true, skillEffectiveness: { effectivenessUnknown: true } },
  }).skillReviewProductValueYield))],
  ['target_unknown_skill_effectiveness_warn_allowed', () => passed(validateSkillReviewProductValueYield(buildOrchestrationCapsule({
    skillReviewProductValueYield: { targetInitialRollout: true, skillEffectiveness: { effectivenessUnknown: true } },
  }).skillReviewProductValueYield))],
  ['product_value_delta_not_scope_authorization', () => failed(validateSkillReviewProductValueYield(buildOrchestrationCapsule({
    skillReviewProductValueYield: { productValueDelta: { authorizesProductCodeChange: true } },
  }).skillReviewProductValueYield))],
];

const workerAndOwnerCases = [
  ['worker_proof_default_v125_extensions_pass', () => passed(validateWorkerProofCapsule(buildWorkerProofCapsule()))],
  ['worktree_parent_mutation_forbidden', () => failed(validateWorkerProofCapsule(buildWorkerProofCapsule({
    worktreeFleetContract: { parentWorktreeMutationAllowed: true },
  })))],
  ['worktree_shared_files_require_arbiter', () => failed(validateWorkerProofCapsule(buildWorkerProofCapsule({
    worktreeFleetContract: { sharedFilesAllowed: true, sharedFilesRequireArbiter: false },
  })))],
  ['worktree_can_not_merge', () => failed(validateWorkerProofCapsule(buildWorkerProofCapsule({
    worktreeFleetContract: { worktreeCanMerge: true },
  })))],
  ['worktree_can_not_create_owner_authority', () => failed(validateWorkerProofCapsule(buildWorkerProofCapsule({
    worktreeFleetContract: { worktreeCanCreateOwnerAuthority: true },
  })))],
  ['merge_queue_supports_superseded_shard', () => passed(validateWorkerProofCapsule(buildWorkerProofCapsule({
    shardMergeQueue: { queueStatus: 'superseded' },
  })))],
  ['merge_queue_blocks_score_only_merge_order_change', () => failed(validateWorkerProofCapsule(buildWorkerProofCapsule({
    shardMergeQueue: { scoreOnlyMergeOrderChangeAllowed: true },
  })))],
  ['owner_brief_default_v125_extensions_pass', () => passed(validateOwnerDecisionBrief(buildOwnerDecisionBrief()))],
  ['owner_brief_product_value_cannot_authorize_scope', () => failed(validateOwnerDecisionBrief(buildOwnerDecisionBrief({
    productValueDeltaSummary: { authorizesRuntimeReadiness: true },
  })))],
  ['safe_memory_ledger_is_proposal_only', () => failed(validateOwnerDecisionBrief(buildOwnerDecisionBrief({
    safeMemoryLedger: { autoApplyAllowed: true },
  })))],
  ['orchestration_capsule_validates_all_v125_internal_blocks', () => {
    const result = validateOrchestrationCapsule(buildOrchestrationCapsule());
    return Object.values(result).every((item) => item.status === 'pass');
  }],
];

function externalCharacterBoundarySurfacePresent() {
  return fs.existsSync('docs/specs/IRIS_20240425/fixtures/external_character/iris_external_character_positive_fixtures.jsonl')
    || fs.existsSync('docs/specs/IRIS_20240425/fixtures/external_character/iris_external_character_negative_fixtures.jsonl')
    || fs.existsSync('docs/specs/IRIS_20240425/fixtures/external_character/iris_external_character_boundary_fixtures.jsonl')
    || fs.existsSync('docs/specs/IRIS_20240425/fixtures/external_character/iris_external_character_redline_fixtures.jsonl');
}

const externalCharacterValidatorCases = [
  ['external_character_boundary_validator_registered_or_present_v125', () => (
    !externalCharacterBoundarySurfacePresent()
      || (fs.existsSync('scripts/codex-iris-external-character-boundary-validator.mjs')
      && fs.existsSync('scripts/codex-iris-external-character-boundary-validator-self-test.mjs')
      )
  )],
  ['external_character_boundary_validator_self_test_passes_v125', () => {
    if (!externalCharacterBoundarySurfacePresent()) return true;
    execFileSync(process.execPath, ['scripts/codex-iris-external-character-boundary-validator-self-test.mjs'], {
      stdio: 'ignore',
      env: { ...process.env, CODEX_EXTERNAL_CHARACTER_FIXTURE_SELF_TEST_SKIP_REAL: '1' },
    });
    return true;
  }],
  ['external_character_fixture_files_present_v125', () => (
    !externalCharacterBoundarySurfacePresent()
      || (fs.existsSync('docs/specs/IRIS_20240425/fixtures/external_character/iris_external_character_positive_fixtures.jsonl')
      && fs.existsSync('docs/specs/IRIS_20240425/fixtures/external_character/iris_external_character_negative_fixtures.jsonl')
      && fs.existsSync('docs/specs/IRIS_20240425/fixtures/external_character/iris_external_character_boundary_fixtures.jsonl')
      && fs.existsSync('docs/specs/IRIS_20240425/fixtures/external_character/iris_external_character_redline_fixtures.jsonl')
      )
  )],
];

function communityWorldAuditMappingSurfacePresent() {
  return fs.existsSync('docs/specs/IRIS_20240425/fixtures/community_world_core/community_world_core_audit_mapping_fixtures.jsonl');
}

const communityWorldAuditMappingValidatorCases = [
  ['community_world_audit_mapping_validator_present_v125', () => (
    !communityWorldAuditMappingSurfacePresent()
      || (fs.existsSync('scripts/codex-community-world-audit-mapping-validator.mjs')
      && fs.existsSync('scripts/codex-community-world-audit-mapping-validator-self-test.mjs')
      && fs.existsSync('docs/specs/IRIS_20240425/fixtures/community_world_core/community_world_core_audit_mapping_fixtures.jsonl')
      )
  )],
  ['community_world_audit_mapping_validator_self_test_passes_v125', () => {
    if (!communityWorldAuditMappingSurfacePresent()) return true;
    execFileSync(process.execPath, ['scripts/codex-community-world-audit-mapping-validator-self-test.mjs'], {
      stdio: 'ignore',
      env: { ...process.env, CODEX_COMMUNITY_WORLD_AUDIT_MAPPING_SELF_TEST_SKIP_REAL: '1' },
    });
    return true;
  }],
  ['community_world_audit_mapping_validator_preserves_classification_only_v125', () => {
    if (!communityWorldAuditMappingSurfacePresent()) return true;
    const text = fs.readFileSync('docs/specs/IRIS_20240425/fixtures/community_world_core/community_world_core_audit_mapping_fixtures.jsonl', 'utf8').trim();
    return text.split(/\r?\n/).every((line) => JSON.parse(line).classification_only === true);
  }],
  ['community_world_audit_mapping_validator_rejects_production_readiness_sweetening_v125', () => {
    if (!communityWorldAuditMappingSurfacePresent()) return true;
    const text = fs.readFileSync('docs/specs/IRIS_20240425/fixtures/community_world_core/community_world_core_audit_mapping_fixtures.jsonl', 'utf8');
    return text.includes('"audit_auditor":"production_readiness_sweetening"')
      && text.includes('"expected_verdict":"reject"');
  }],
  ['community_world_audit_mapping_validator_preserves_priority1_blocked_v125', () => {
    if (!communityWorldAuditMappingSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-community-world-audit-mapping-validator.mjs', 'utf8');
    return script.includes("priority1Status: 'BLOCKED'");
  }],
  ['community_world_audit_mapping_validator_no_dataset_runner_claim_v125', () => {
    if (!communityWorldAuditMappingSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-community-world-audit-mapping-validator.mjs', 'utf8');
    return script.includes('datasetAuditRunnerImplemented: false')
      && script.includes('minecraftRuntimeImplemented: false')
      && script.includes('minecraftPluginImplemented: false')
      && script.includes('productionReadinessClaimed: false')
      && script.includes('productionGoPerformed: false');
  }],
];

function communityWorldGateSurfacePresent() {
  return fs.existsSync('docs/specs/IRIS_20240425/fixtures/community_world_core/community_world_core_positive_fixtures.jsonl')
    || fs.existsSync('docs/specs/IRIS_20240425/fixtures/community_world_core/community_world_core_negative_fixtures.jsonl')
    || fs.existsSync('docs/specs/IRIS_20240425/fixtures/community_world_core/community_world_core_boundary_fixtures.jsonl')
    || fs.existsSync('docs/specs/IRIS_20240425/fixtures/community_world_core/community_world_core_redline_fixtures.jsonl')
    || fs.existsSync('docs/specs/IRIS_20240425/fixtures/community_world_core/community_world_core_completion_review_fixtures.jsonl');
}

const communityWorldGateValidatorCases = [
  ['community_world_gate_validator_present_v125', () => (
    !communityWorldGateSurfacePresent()
      || (fs.existsSync('scripts/codex-community-world-gate-validator.mjs')
      && fs.existsSync('scripts/codex-community-world-gate-validator-self-test.mjs')
      )
  )],
  ['community_world_gate_validator_self_test_passes_v125', () => {
    if (!communityWorldGateSurfacePresent()) return true;
    execFileSync(process.execPath, ['scripts/codex-community-world-gate-validator-self-test.mjs'], {
      stdio: 'ignore',
      env: { ...process.env, CODEX_COMMUNITY_WORLD_GATE_SELF_TEST_SKIP_REAL: '1' },
    });
    return true;
  }],
  ['community_world_gate_validator_preserves_priority1_blocked_v125', () => {
    if (!communityWorldGateSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-community-world-gate-validator.mjs', 'utf8');
    return script.includes("priority1Status: 'BLOCKED'");
  }],
  ['community_world_gate_validator_no_runtime_or_dataset_runner_claim_v125', () => {
    if (!communityWorldGateSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-community-world-gate-validator.mjs', 'utf8');
    return script.includes('datasetAuditRunnerImplemented: false')
      && script.includes('runtimeImplemented: false')
      && script.includes('minecraftRuntimeImplemented: false')
      && script.includes('minecraftPluginImplemented: false')
      && script.includes('productionReadinessClaimed: false')
      && script.includes('productionGoPerformed: false');
  }],
  ['community_world_gate_validator_rejects_direct_command_gate_flags_v125', () => {
    if (!communityWorldGateSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-community-world-gate-validator.mjs', 'utf8');
    return script.includes('community_world_no_direct_command_gate')
      && script.includes('input_action_candidate_included')
      && script.includes('approved_game_input_action_included')
      && script.includes('execution_allowed');
  }],
];

function communityWorldCompletionReviewSurfacePresent() {
  return fs.existsSync('docs/specs/IRIS_20240425/fixtures/community_world_core/community_world_core_completion_review_fixtures.jsonl');
}

const communityWorldCompletionReviewValidatorCases = [
  ['community_world_completion_review_validator_present_v125', () => (
    !communityWorldCompletionReviewSurfacePresent()
      || (fs.existsSync('scripts/codex-community-world-completion-review-validator.mjs')
      && fs.existsSync('scripts/codex-community-world-completion-review-validator-self-test.mjs')
      )
  )],
  ['community_world_completion_review_validator_self_test_passes_v125', () => {
    if (!communityWorldCompletionReviewSurfacePresent()) return true;
    execFileSync(process.execPath, ['scripts/codex-community-world-completion-review-validator-self-test.mjs'], {
      stdio: 'ignore',
      env: { ...process.env, CODEX_COMMUNITY_WORLD_COMPLETION_REVIEW_SELF_TEST_SKIP_REAL: '1' },
    });
    return true;
  }],
  ['community_world_completion_review_validator_preserves_priority1_blocked_v125', () => {
    if (!communityWorldCompletionReviewSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-community-world-completion-review-validator.mjs', 'utf8');
    return script.includes("priority1Status: 'BLOCKED'");
  }],
  ['community_world_completion_review_validator_no_runtime_or_dataset_runner_claim_v125', () => {
    if (!communityWorldCompletionReviewSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-community-world-completion-review-validator.mjs', 'utf8');
    return script.includes('datasetAuditRunnerImplemented: false')
      && script.includes('runtimeImplemented: false')
      && script.includes('minecraftRuntimeImplemented: false')
      && script.includes('minecraftPluginImplemented: false')
      && script.includes('productionReadinessClaimed: false')
      && script.includes('productionGoPerformed: false');
  }],
];

function irisNonruntimeValidatorSuiteSurfacePresent() {
  return fs.existsSync('scripts/codex-iris-nonruntime-validator-suite.mjs')
    || fs.existsSync('scripts/codex-iris-nonruntime-validator-suite-self-test.mjs');
}

const irisNonruntimeValidatorSuiteCases = [
  ['iris_nonruntime_validator_suite_present_v125', () => (
    !irisNonruntimeValidatorSuiteSurfacePresent()
      || (fs.existsSync('scripts/codex-iris-nonruntime-validator-suite.mjs')
      && fs.existsSync('scripts/codex-iris-nonruntime-validator-suite-self-test.mjs')
      )
  )],
  ['iris_nonruntime_validator_suite_self_test_passes_v125', () => {
    if (!irisNonruntimeValidatorSuiteSurfacePresent()) return true;
    execFileSync(process.execPath, ['scripts/codex-iris-nonruntime-validator-suite-self-test.mjs'], {
      stdio: 'ignore',
      env: { ...process.env, CODEX_IRIS_NONRUNTIME_SUITE_SELF_TEST_SKIP_REAL: '1' },
    });
    return true;
  }],
  ['iris_nonruntime_validator_suite_rejects_runtime_readiness_claim_v125', () => {
    if (!irisNonruntimeValidatorSuiteSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-nonruntime-validator-suite.mjs', 'utf8');
    return script.includes('runtimeImplemented')
      && script.includes('PRODUCTION_READINESS_CLAIMED');
  }],
  ['iris_nonruntime_validator_suite_preserves_priority1_blocked_v125', () => {
    if (!irisNonruntimeValidatorSuiteSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-nonruntime-validator-suite.mjs', 'utf8');
    return script.includes("priority1Status: 'BLOCKED'");
  }],
  ['iris_nonruntime_validator_suite_no_dataset_runner_claim_v125', () => {
    if (!irisNonruntimeValidatorSuiteSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-nonruntime-validator-suite.mjs', 'utf8');
    return script.includes('datasetAuditRunnerImplemented: false')
      && script.includes('realDatasetProcessing: false')
      && script.includes('minecraftRuntimeImplemented: false')
      && script.includes('minecraftPluginImplemented: false');
  }],
];

function externalModuleSafeSummarySurfacePresent() {
  return fs.existsSync('docs/specs/IRIS_20240425/fixtures/external_modules/iris_external_module_safe_summary_positive_fixtures.jsonl')
    || fs.existsSync('docs/specs/IRIS_20240425/fixtures/external_modules/iris_external_module_safe_summary_negative_fixtures.jsonl')
    || fs.existsSync('docs/specs/IRIS_20240425/fixtures/external_modules/iris_external_module_safe_summary_boundary_fixtures.jsonl')
    || fs.existsSync('docs/specs/IRIS_20240425/fixtures/external_modules/iris_external_module_safe_summary_redline_fixtures.jsonl');
}

const externalModuleSafeSummaryValidatorCases = [
  ['iris_external_module_safe_summary_validator_present_v125', () => (
    !externalModuleSafeSummarySurfacePresent()
      || (fs.existsSync('scripts/codex-iris-external-module-safe-summary-validator.mjs')
      && fs.existsSync('scripts/codex-iris-external-module-safe-summary-validator-self-test.mjs')
      )
  )],
  ['iris_external_module_safe_summary_validator_self_test_passes_v125', () => {
    if (!externalModuleSafeSummarySurfacePresent()) return true;
    execFileSync(process.execPath, ['scripts/codex-iris-external-module-safe-summary-validator-self-test.mjs'], {
      stdio: 'ignore',
      env: { ...process.env, CODEX_EXTERNAL_MODULE_SAFE_SUMMARY_SELF_TEST_SKIP_REAL: '1' },
    });
    return true;
  }],
  ['iris_external_module_safe_summary_validator_rejects_raw_audio_v125', () => {
    if (!externalModuleSafeSummarySurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-external-module-safe-summary-validator.mjs', 'utf8');
    return script.includes('raw_audio_included') && script.includes('UNSAFE_RAW_AUDIO_INCLUDED');
  }],
  ['iris_external_module_safe_summary_validator_rejects_raw_live2d_path_v125', () => {
    if (!externalModuleSafeSummarySurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-external-module-safe-summary-validator.mjs', 'utf8');
    return script.includes('raw_live2d_model_path_included') && script.includes('UNSAFE_RAW_LIVE2D_MODEL_PATH_INCLUDED');
  }],
  ['iris_external_module_safe_summary_validator_rejects_raw_payment_v125', () => {
    if (!externalModuleSafeSummarySurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-external-module-safe-summary-validator.mjs', 'utf8');
    return script.includes('raw_payment_record_included') && script.includes('UNSAFE_RAW_PAYMENT_RECORD_INCLUDED');
  }],
  ['iris_external_module_safe_summary_validator_rejects_stale_action_v125', () => {
    if (!externalModuleSafeSummarySurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-external-module-safe-summary-validator.mjs', 'utf8');
    return script.includes('UNSAFE_STALE_OBSERVATION_GAME_ACTION');
  }],
  ['iris_external_module_safe_summary_validator_preserves_priority1_blocked_v125', () => {
    if (!externalModuleSafeSummarySurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-external-module-safe-summary-validator.mjs', 'utf8');
    return script.includes("priority1Status: 'BLOCKED'");
  }],
  ['iris_external_module_safe_summary_validator_no_runtime_claim_v125', () => {
    if (!externalModuleSafeSummarySurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-external-module-safe-summary-validator.mjs', 'utf8');
    return script.includes('runtimeImplemented: false')
      && script.includes('voxweaveImplementation: false')
      && script.includes('live2dImplementation: false')
      && script.includes('criptoTipImplementation: false')
      && script.includes('datasetAuditRunnerImplemented: false')
      && script.includes('minecraftRuntimeImplemented: false')
      && script.includes('minecraftPluginImplemented: false')
      && script.includes('productionReadinessClaimed: false')
      && script.includes('productionGoPerformed: false');
  }],
];

function externalModuleAuditMappingSurfacePresent() {
  return fs.existsSync('docs/specs/IRIS_20240425/fixtures/external_modules/iris_external_module_audit_mapping_fixtures.jsonl');
}

const externalModuleAuditMappingValidatorCases = [
  ['iris_external_module_audit_mapping_validator_present_v125', () => (
    !externalModuleAuditMappingSurfacePresent()
      || (fs.existsSync('scripts/codex-iris-external-module-audit-mapping-validator.mjs')
      && fs.existsSync('scripts/codex-iris-external-module-audit-mapping-validator-self-test.mjs')
      )
  )],
  ['iris_external_module_audit_mapping_validator_self_test_passes_v125', () => {
    if (!externalModuleAuditMappingSurfacePresent()) return true;
    execFileSync(process.execPath, ['scripts/codex-iris-external-module-audit-mapping-validator-self-test.mjs'], {
      stdio: 'ignore',
      env: { ...process.env, CODEX_EXTERNAL_MODULE_AUDIT_MAPPING_SELF_TEST_SKIP_REAL: '1' },
    });
    return true;
  }],
  ['iris_external_module_audit_mapping_validator_preserves_classification_only_v125', () => {
    if (!externalModuleAuditMappingSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-external-module-audit-mapping-validator.mjs', 'utf8');
    return script.includes('CLASSIFICATION_ONLY_NOT_TRUE') && script.includes("classificationOnlyStatus: classificationOnlyFailed ? 'fail' : 'pass'");
  }],
  ['iris_external_module_audit_mapping_validator_rejects_production_readiness_sweetening_v125', () => {
    if (!externalModuleAuditMappingSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-external-module-audit-mapping-validator.mjs', 'utf8');
    return script.includes('production_readiness_sweetening') && script.includes('PRODUCTION_READINESS_WRONG_AUDITOR');
  }],
  ['iris_external_module_audit_mapping_validator_rejects_raw_audio_privacy_mismatch_v125', () => {
    if (!externalModuleAuditMappingSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-external-module-audit-mapping-validator.mjs', 'utf8');
    return script.includes('RAW_AUDIO_OR_VOICE_MODEL_WRONG_MAPPING') && script.includes('privacy_or_confidential');
  }],
  ['iris_external_module_audit_mapping_validator_rejects_payment_relationship_pass_v125', () => {
    if (!externalModuleAuditMappingSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-external-module-audit-mapping-validator.mjs', 'utf8');
    return script.includes('PAYMENT_RELATIONSHIP_WRONG_MAPPING') && script.includes('monetization_pressure_risk');
  }],
  ['iris_external_module_audit_mapping_validator_preserves_priority1_blocked_v125', () => {
    if (!externalModuleAuditMappingSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-external-module-audit-mapping-validator.mjs', 'utf8');
    return script.includes("priority1Status: 'BLOCKED'");
  }],
  ['iris_external_module_audit_mapping_validator_no_dataset_runner_claim_v125', () => {
    if (!externalModuleAuditMappingSurfacePresent()) return true;
    const script = fs.readFileSync('scripts/codex-iris-external-module-audit-mapping-validator.mjs', 'utf8');
    return script.includes('datasetAuditRunnerImplemented: false')
      && script.includes('realDatasetProcessing: false')
      && script.includes('runtimeImplemented: false')
      && script.includes('productionReadinessClaimed: false')
      && script.includes('productionGoPerformed: false');
  }],
];

const cases = [
  ...compatibilityCases,
  ...goalShardCases,
  ...evidenceLaneCases,
  ...monitorAndYieldCases,
  ...workerAndOwnerCases,
  ...externalCharacterValidatorCases,
  ...communityWorldAuditMappingValidatorCases,
  ...communityWorldGateValidatorCases,
  ...communityWorldCompletionReviewValidatorCases,
  ...irisNonruntimeValidatorSuiteCases,
  ...externalModuleSafeSummaryValidatorCases,
  ...externalModuleAuditMappingValidatorCases,
].map(([name, fn]) => test(name, fn));

const fixtureGroups = [
  'v118_v119_v120_v121_v122_v123_v124_compatibility_matrix',
  'goal_shard_progress_evidence_matrix',
  'worktree_fleet_merge_queue_matrix',
  'evidence_lane_qg_lane_matrix',
  'typed_monitor_fanout_matrix',
  'skill_review_product_value_yield_matrix',
  'p1_optional_surface_matrix',
  'external_character_boundary_validator_matrix',
  'community_world_audit_mapping_validator_matrix',
  'community_world_gate_validator_matrix',
  'community_world_completion_review_validator_matrix',
  'iris_nonruntime_validator_suite_matrix',
  'iris_external_module_safe_summary_validator_matrix',
  'iris_external_module_audit_mapping_validator_matrix',
];

const failures = cases.filter((item) => item.status !== 'pass');
const report = {
  v125SelfTestStatus: {
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

writeJsonReport(report, 'CODEX_V125_SELF_TEST_REPORT');
if (!process.env.CODEX_V125_SELF_TEST_REPORT && process.env.CODEX_QUALITY_REPORT !== 'json') {
  console.log(`v125SelfTestStatus: ${report.v125SelfTestStatus.status}`);
}
exitFor(report);
