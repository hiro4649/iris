#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.3.0

import fs from 'node:fs';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail', safeSummaryOnly: true };
  } catch {
    return { name, status: 'fail', reasonCodes: ['self_test_exception'], safeSummaryOnly: true };
  }
}

const agents = fs.readFileSync('AGENTS.md', 'utf8');
const gate = fs.readFileSync('scripts/codex-local-quality-gate.mjs', 'utf8');
const manifest = readJson('docs/process/CODEX_HARNESS_MANIFEST.json');
const policy = readJson('docs/process/CODEX_ACTIVE_POLICY_INDEX.json');
const v130SpecPath = 'docs/process/CODEX_V130_SPEC.md';
const v130SpecExists = fs.existsSync(v130SpecPath);
const v130Spec = v130SpecExists ? fs.readFileSync(v130SpecPath, 'utf8') : '';
const chain = manifest.targetCompatibilityBridge?.compatibilityChain || {};
const v111 = chain.v111SelfTestStatus || {};
const v130 = manifest.v130CoreTargetProfile || {};
const performanceTrack = manifest.performanceTrack || {};

const cases = [
  ['v130_self_test_must_pass', () => true],
  ['v130_required_spec_exists', () => v130SpecExists],
  ['agents_required_read_path_exists', () => agents.includes(v130SpecPath) && fs.existsSync(v130SpecPath)],
  ['policy_required_read_path_exists', () => policy.requiredReads?.includes(v130SpecPath)
    && policy.profiles?.routine?.requiredReads?.includes(v130SpecPath)
    && policy.profiles?.target_rollout?.requiredReads?.includes(v130SpecPath)
    && fs.existsSync(v130SpecPath)],
  ['v130_spec_declares_core_boundaries', () => v130Spec.includes('v1.1.8 Final Decision remains final')
    && v130Spec.includes('v1.2.9 remains immediate rollback')
    && v130Spec.includes('v1.2.8 remains blocking compatibility')
    && v130Spec.includes('v1.2.7 remains readable compatibility')
    && v130Spec.includes('New P0 artifacts: no')
    && v130Spec.includes('New top-level statuses: no')
    && v130Spec.includes('New Skills: no')
    && v130Spec.includes('Production go requires')
    && v130Spec.includes('priority1') && v130Spec.includes('BLOCKED')],
  ['agents_marker_is_v130', () => agents.includes('CODEX_QUALITY_HARNESS_FILE v1.3.0')],
  ['manifest_active_tuple_is_v130_core', () => manifest.activeHarnessVersion === '1.3.0'
    && manifest.activeSelfTestSuite === 'v130'
    && manifest.activeSelfTestStatusKey === 'v130SelfTestStatus'
    && manifest.previousVersion === '1.2.9'
    && manifest.targetHarnessVersion === '1.3.0'
    && manifest.targetRollout === 'completed'],
  ['v111_direct_projection_precedes_target_compatibility', () => v111.directProjectionRequired === true
    && v111.directProjectionPath === 'v111SelfTestStatus'
    && v111.classificationPath === 'targetModeLegacyCompatibilityStatus.classifications[]'
    && v111.projectionOrder === 'before_buildTargetModeLegacyCompatibilityReport'
    && v111.forbiddenClassification === 'missing_blocking'
    && v111.requiredEffectiveStatus === 'pass'
    && gate.indexOf('runV111Gates(report, gateEnv)') < gate.indexOf('buildTargetModeLegacyCompatibilityReport(report)')],
  ['v111_projection_shape_matches_existing_status', () => ['status', 'reasonCodes', 'blocking', 'safeSummary', 'nextSafeAction', 'safeSummaryOnly'].every((key) => v111.directProjectionShapeKeys?.includes(key))],
  ['v080_v112_shadow_compatibility_preserved', () => manifest.legacySelfTests?.v080_v112 === 'target_shadow_legacy_count_only'],
  ['v129_rollback_available', () => manifest.legacySelfTests?.v129 === 'immediate_rollback'
    && manifest.versionAuthority?.v129 === 'immediate_rollback'],
  ['v128_compatibility_available', () => manifest.versioningRollback?.activeHarnessVersion === '1.2.8'
    && manifest.versioningRollback?.activeSelfTestSuite === 'v128'
    && manifest.versionAuthority?.v128 === 'blocking_compatibility'],
  ['v127_readable_compatibility_available', () => manifest.versioning?.activeHarnessVersion === '1.2.7'
    && manifest.versioning?.activeSelfTestSuite === 'v127'
    && manifest.versionAuthority?.v127 === 'compatibility_readable'],
  ['performance_track_non_authoritative', () => performanceTrack.state === 'deferred'
    && performanceTrack.FableComparatorState === 'unavailable'
    && performanceTrack.superiorityClaimState === 'not_proven'
    && performanceTrack.affectsQualityScore === false
    && performanceTrack.affectsBlockingCount === false],
  ['core_does_not_install_excluded_runtime_surfaces', () => v130.installsPerformanceTrack === false
    && v130.installsFableComparator === false
    && v130.installsSdkBenchmarkRunner === false
    && v130.installsSixtyTaskBenchmark === false
    && v130.installsSkillRuntimeActivation === false
    && v130.installsDagAgentTeamRuntime === false
    && v130.installsLearnedPolicyActivation === false
    && v130.installsCyberSpecialistRuntime === false],
  ['token_budgets_remain_restricted', () => v130.routineColdArtifactRead === 0
    && v130.routineSelectedSkillMax === 0
    && v130.routineReviewerFanout === 0
    && v130.routineOwnerInterruptMax === 0
    && policy.selectedSkillsMax === 0
    && policy.routineColdArtifactReadMax === 0],
  ['authority_not_created_and_product_not_mutated', () => manifest.authorityCreated === false
    && manifest.targetMutationCount === 0
    && manifest.productMutationCount === 0
    && v130.authorityCreated === false
    && v130.productRuntimeMutationCount === 0],
].map(([name, fn]) => test(name, fn));

const failed = cases.filter((item) => item.status !== 'pass');
const status = failed.length ? 'fail' : 'pass';
const report = {
  marker: 'CODEX_QUALITY_HARNESS_FILE v1.3.0',
  harnessVersion: '1.3.0',
  status,
  v130SelfTestStatus: {
    status,
    suite: 'v130',
    caseCount: cases.length,
    failedCaseCount: failed.length,
    reasonCodes: failed.length ? ['v130_core_target_bridge_self_test_failed'] : [],
    safeSummaryOnly: true,
  },
  cases,
  authorityCreated: false,
  targetMutationCount: 0,
  safeSummaryOnly: true,
};

if (process.env.CODEX_V130_SELF_TEST_REPORT === 'json' || process.env.CODEX_QUALITY_REPORT === 'json') {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`v130SelfTestStatus: ${status}`);
}
process.exit(status === 'pass' ? 0 : 1);
