#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

export const currentVersion = '1.2.5';
export const previousVersion = '1.2.4';
export const activeSelfTestStatusKey = 'v125SelfTestStatus';
export const activeSelfTestSuite = 'v125';
export const legacyAdvisorySuites = ['v124', 'v123', 'v122', 'v121', 'v120', 'v119', 'v118', 'v117', 'v116', 'v115', 'v114', 'v113', 'v112', 'v111', 'v110', 'v109', 'v108', 'v107', 'v106', 'v105', 'v104', 'v103'];
export const knownVersions = ['1.0.3', '1.0.4', '1.0.5', '1.0.6', '1.0.7', '1.0.8', '1.0.9', '1.1.0', '1.1.1', '1.1.2', '1.1.3', '1.1.4', '1.1.5', '1.1.6', '1.1.7', '1.1.8', '1.1.9', '1.2.0', '1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5'];
export const versionLineagePolicy = {
  sourceOnlyRelease: false,
  targetRollout: 'v1.2.5_active',
  representativeLivePrValidation: 'not_required_for_metadata_rollout',
  representativeRealPrReplay: 'not_required_for_metadata_rollout',
  decisionLedger: 'preserved',
  evidenceConvergence: 'preserved',
  tokenEconomy: 'preserved',
  operationalClosure: 'preserved',
  tokenHardCap: 'preserved',
  contextCapsule: 'preserved',
  failureClosure: 'preserved',
  conversationSurfaceMinimization: 'preserved',
  evidenceFidelity: 'preserved',
  minimalSurface: 'preserved',
  fastGates: 'preserved',
  typedDecisions: 'preserved',
  compatibilityProof: 'required',
  runtimeReadinessClaimed: false,
  productionReadinessClaimed: false,
  safeSummaryOnly: true,
};

export function buildHarnessVersionRegistry() {
  return {
    currentVersion,
    previousVersion,
    activeSelfTestStatusKey,
    activeSelfTestSuite,
    legacyAdvisorySuites,
    knownVersions,
    versionLineagePolicy,
    safeSummaryOnly: true,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(buildHarnessVersionRegistry(), null, 2));
}
