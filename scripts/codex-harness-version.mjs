#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.9

export const currentVersion = '1.2.9';
export const previousVersion = '1.2.8';
export const activeSelfTestStatusKey = 'v129SelfTestStatus';
export const activeSelfTestSuite = 'v129';
export const candidateVersion = '1.3.2';
export const candidateSelfTestStatusKey = 'v132SelfTestStatus';
export const candidateSelfTestSuite = 'v132';
export const candidateLifecycleState = 'provisional_local_install';
export const installedSourceCandidateSha = '891ff534901ffc3cae40be0a5ca9d09b88f87097';
export const legacyAdvisorySuites = ['v127', 'v126', 'v125', 'v124', 'v123', 'v122', 'v121', 'v120', 'v119', 'v118', 'v117', 'v116', 'v115', 'v114', 'v113'];
export const versionLineagePolicy = { sourceOnlyRelease: false, targetRollout: 'completed', rolloutClass: 'complex', materialization: 'target_quality_gate_active_path', previousRollbackAvailable: true, sourceFullBundleCopied: false, workflowChanged: false, productCodeChanged: false, packageOrLockfileChanged: false, routineColdArtifactRead: 0, routineSelectedSkillMax: 1, routineReviewerFanout: 0, runtimeReadinessClaimed: false, productionReadinessClaimed: false, safeSummaryOnly: true };
export function buildHarnessVersionRegistry() { return { currentVersion, previousVersion, activeSelfTestStatusKey, activeSelfTestSuite, candidateVersion, candidateSelfTestStatusKey, candidateSelfTestSuite, candidateLifecycleState, installedSourceCandidateSha, legacyAdvisorySuites, versionLineagePolicy, activationAllowed: false, remoteValidationState: 'not_observed', mergeAllowed: false, safeSummaryOnly: true }; }
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(buildHarnessVersionRegistry(), null, 2));
