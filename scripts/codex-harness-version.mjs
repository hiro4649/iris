#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.3.0

export const currentVersion = '1.3.0';
export const previousVersion = '1.2.9';
export const activeSelfTestStatusKey = 'v130SelfTestStatus';
export const activeSelfTestSuite = 'v130';
export const legacyAdvisorySuites = ['v129', 'v128', 'v127', 'v126', 'v125', 'v124', 'v123', 'v122', 'v121', 'v120', 'v119', 'v118', 'v117', 'v116', 'v115', 'v114', 'v113'];
export const versionLineagePolicy = { sourceOnlyRelease: false, targetRollout: 'completed', rolloutClass: 'metadata_gate_target', materialization: 'target_quality_gate_active_path', previousRollbackAvailable: true, sourceFullBundleCopied: false, workflowChanged: false, productCodeChanged: false, packageOrLockfileChanged: false, routineColdArtifactRead: 0, routineSelectedSkillMax: 0, routineReviewerFanout: 0, runtimeReadinessClaimed: false, productionReadinessClaimed: false, safeSummaryOnly: true };
export function buildHarnessVersionRegistry() { return { currentVersion, previousVersion, activeSelfTestStatusKey, activeSelfTestSuite, legacyAdvisorySuites, versionLineagePolicy, safeSummaryOnly: true }; }
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(buildHarnessVersionRegistry(), null, 2));
