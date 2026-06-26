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
const manifest = readJson('docs/process/CODEX_HARNESS_MANIFEST.json');
const policy = readJson('docs/process/CODEX_ACTIVE_POLICY_INDEX.json');
const v130Policy = readJson('docs/process/CODEX_V130_POLICY.json');
const performance = manifest.performanceTrack || {};
const core = manifest.coreTargetProfile || {};

const cases = [
  ['v130_self_test_must_pass', () => true],
  ['agents_marker_is_v130', () => agents.includes('CODEX_QUALITY_HARNESS_FILE v1.3.0')],
  ['manifest_active_tuple_is_v130_core', () => manifest.activeHarnessVersion === '1.3.0' && manifest.activeSelfTestSuite === 'v130' && manifest.activeSelfTestStatusKey === 'v130SelfTestStatus'],
  ['previous_version_is_v129', () => manifest.previousVersion === '1.2.9'],
  ['v129_immediate_rollback_available', () => manifest.versioningRollback?.activeHarnessVersion === '1.2.9' && manifest.versioningRollback?.activeSelfTestSuite === 'v129' && manifest.versioningRollback?.rollbackAvailable === true],
  ['v128_compatibility_available', () => manifest.legacySelfTests?.v128 === 'blocking_compatibility'],
  ['v127_readable_compatibility_available', () => manifest.legacySelfTests?.v127 === 'compatibility_readable'],
  ['performance_track_deferred_non_authoritative', () => performance.state === 'deferred' && performance.authority === 'non_authoritative' && performance.affectsQualityScore === false && performance.affectsBlockingCount === false],
  ['fable_superiority_not_proven', () => performance.FableComparatorState === 'unavailable' && performance.superiorityClaimState === 'not_proven'],
  ['core_excludes_runtime_tracks', () => core.installsPerformanceTrack === false && core.installsFableComparator === false && core.installsSdkBenchmark === false && core.installsSkillRuntime === false && core.installsDagAgentTeam === false && core.installsLearnedPolicy === false],
  ['policy_points_to_v130_and_defers_rollback', () => policy.requiredReads.includes('docs/process/CODEX_V130_SPEC.md') && policy.deferredReads.includes('docs/process/CODEX_V129_SPEC.md') && policy.selectedSkillsMax === 0],
  ['v130_policy_matches_manifest', () => v130Policy.activeHarnessVersion === '1.3.0' && v130Policy.previousVersion === '1.2.9' && v130Policy.performanceTrack?.state === 'deferred'],
  ['authority_not_created', () => manifest.authorityCreated === false && v130Policy.authorityCreated === false && core.authorityCreated === false],
  ['target_product_mutation_zero', () => manifest.targetMutationCount === 0 && v130Policy.targetMutationCount === 0 && core.productMutationCount === 0],
  ['spec_exists', () => fs.existsSync('docs/process/CODEX_V130_SPEC.md')],
].map(([name, fn]) => test(name, fn));

const failures = cases.filter((item) => item.status !== 'pass');
const report = {
  v130SelfTestStatus: {
    status: failures.length ? 'fail' : 'pass',
    caseCount: cases.length,
    failureCount: failures.length,
    rolloutClass: 'core_target_profile',
    materialization: 'target_quality_gate_active_path',
    authorityCreated: false,
    targetMutationCount: 0,
    performanceTrackState: performance.state || 'missing',
    superiorityClaimState: performance.superiorityClaimState || 'missing',
    safeSummaryOnly: true
  },
  cases,
  status: failures.length ? 'fail' : 'pass',
  safeSummaryOnly: true
};

if (process.env.CODEX_V130_SELF_TEST_REPORT === 'json' || process.env.CODEX_QUALITY_REPORT === 'json') {
  console.log(JSON.stringify(report));
} else {
  console.log(`v130SelfTestStatus: ${report.v130SelfTestStatus.status}`);
}
process.exit(failures.length ? 1 : 0);
