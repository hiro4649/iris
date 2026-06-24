#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.8

import fs from 'node:fs';
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function test(name, fn) { try { return { name, status: fn() ? 'pass' : 'fail', safeSummaryOnly: true }; } catch { return { name, status: 'fail', reasonCodes: ['self_test_exception'], safeSummaryOnly: true }; } }
const agents = fs.readFileSync('AGENTS.md', 'utf8');
const manifest = readJson('docs/process/CODEX_HARNESS_MANIFEST.json');
const policy = readJson('docs/process/CODEX_ACTIVE_POLICY_INDEX.json');
const cases = [
  ['v128_self_test_must_pass', () => true],
  ['agents_marker_supports_v128_rollback', () => agents.includes('CODEX_QUALITY_HARNESS_FILE v1.2.9') && agents.includes('v1.2.8 remains available')],
  ['manifest_exposes_v128_rollback_tuple', () => manifest.activeHarnessVersion === '1.2.9' && manifest.activeSelfTestSuite === 'v129' && manifest.versioningRollback?.activeHarnessVersion === '1.2.8' && manifest.versioningRollback?.activeSelfTestSuite === 'v128' && manifest.versioningRollback?.activeSelfTestStatusKey === 'v128SelfTestStatus'],
  ['target_rollout_completed', () => manifest.targetRollout === 'completed' && manifest.sourceOnlyRelease === false],
  ['v127_compatibility_available', () => manifest.legacySelfTests?.v127 === 'blocking_compatibility'],
  ['policy_index_points_to_v129_with_v128_rollback_and_v127_deferred', () => policy.schemaVersion === '1.2.9' && policy.requiredReads.includes('docs/process/CODEX_V129_SPEC.md') && policy.deferredReads.includes('docs/process/CODEX_V128_SPEC.md') && policy.deferredReads.includes('docs/process/CODEX_V127_SPEC.md') && policy.selectedSkillsMax === 1],
  ['pr_body_is_not_machine_evidence', () => manifest.prBodyMachineEvidence === false],
  ['rollback_spec_exists', () => fs.existsSync('docs/process/CODEX_V128_SPEC.md')],
].map(([name, fn]) => test(name, fn));
const failures = cases.filter((item) => item.status !== 'pass');
const report = { v128SelfTestStatus: { status: failures.length ? 'fail' : 'pass', caseCount: cases.length, failureCount: failures.length, safeSummaryOnly: true }, cases, status: failures.length ? 'fail' : 'pass', safeSummaryOnly: true };
if (process.env.CODEX_V128_SELF_TEST_REPORT === 'json' || process.env.CODEX_QUALITY_REPORT === 'json') console.log(JSON.stringify(report)); else console.log(`v128SelfTestStatus: ${report.v128SelfTestStatus.status}`);
process.exit(failures.length ? 1 : 0);
