#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.9

import fs from 'node:fs';
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function test(name, fn) { try { return { name, status: fn() ? 'pass' : 'fail', safeSummaryOnly: true }; } catch { return { name, status: 'fail', reasonCodes: ['self_test_exception'], safeSummaryOnly: true }; } }
const agents = fs.readFileSync('AGENTS.md', 'utf8');
const gate = fs.existsSync('scripts/codex-local-quality-gate.mjs') ? fs.readFileSync('scripts/codex-local-quality-gate.mjs', 'utf8') : '';
const manifest = readJson('docs/process/CODEX_HARNESS_MANIFEST.json');
const policy = readJson('docs/process/CODEX_ACTIVE_POLICY_INDEX.json');
const router = manifest.goalContractedCapabilityRouter ?? {};
const policyRouter = policy.goalContractedCapabilityRouter ?? {};
const cases = [
  ['v129_self_test_must_pass', () => true],
  ['agents_marker_is_v129', () => agents.includes('CODEX_QUALITY_HARNESS_FILE v1.2.9')],
  ['manifest_active_tuple_is_v129', () => manifest.activeHarnessVersion === '1.2.9' && manifest.activeSelfTestSuite === 'v129' && manifest.activeSelfTestStatusKey === 'v129SelfTestStatus' && manifest.targetHarnessVersion === '1.2.9' && manifest.targetRollout === 'completed'],
  ['source_authority_is_bound', () => router.sourceHarnessCommit === '07bba3cba7456375194fc25fe1d2108a893502d0'],
  ['rollout_materialization_is_additive', () => router.rolloutClass === 'complex' && router.materialization === 'target_quality_gate_active_path' && router.sourceFullBundleCopied === false && router.modelIdPinnedInTarget === false && router.hostAdapterStoredInTarget === false],
  ['existing_quality_gate_path_is_preserved', () => gate.includes('Final Decision') || gate.includes('finalDecision') || gate.includes('decisionCapsule')],
  ['independent_verifier_required', () => router.independentVerifierRequired === true && router.realHostExecution === 'user_local_trusted_adapter'],
  ['plugin_default_is_none', () => router.pluginDefault === 'none' && router.pluginUnavailablePolicy === 'explicit_nonblocking'],
  ['authority_not_created', () => router.authorityCreated === false && manifest.authorityCreated === false && router.finalAuthority === 'v1.1.8_final_decision_kernel'],
  ['v128_rollback_tuple_available', () => manifest.versioningRollback?.activeHarnessVersion === '1.2.8' && manifest.versioningRollback?.activeSelfTestSuite === 'v128' && manifest.versioningRollback?.activeSelfTestStatusKey === 'v128SelfTestStatus' && manifest.versioningRollback?.rollbackAvailable === true && manifest.legacySelfTests?.v128 === 'blocking_compatibility_rollback'],
  ['v127_compatibility_available', () => manifest.legacySelfTests?.v127 === 'blocking_compatibility'],
  ['policy_reads_v129_and_defers_legacy', () => policy.requiredReads.includes('docs/process/CODEX_V129_SPEC.md') && policy.deferredReads.includes('docs/process/CODEX_V128_SPEC.md') && policy.deferredReads.includes('docs/process/CODEX_V127_SPEC.md')],
  ['token_budgets_remain_restricted', () => router.routineColdArtifactRead === 0 && router.routineSelectedSkillMax === 1 && router.routineReviewerFanout === 0 && router.routineOwnerInterruptMax === 0 && policyRouter.routineColdArtifactRead === 0 && policyRouter.routineSelectedSkillMax === 1],
  ['target_safety_preserved', () => router['irisSafetyPreserved'] === true],
  ['no_product_runtime_package_workflow_mutation', () => router.productRuntimeMutationCount === 0 && router.productCodeChanged === false && router.runtimeCodeChanged === false && router.packageOrLockfileChanged === false && router.workflowChanged === false],
  ['active_spec_exists', () => fs.existsSync('docs/process/CODEX_V129_SPEC.md')],
].map(([name, fn]) => test(name, fn));
const failures = cases.filter((item) => item.status !== 'pass');
const report = { v129SelfTestStatus: { status: failures.length ? 'fail' : 'pass', caseCount: cases.length, failureCount: failures.length, rolloutClass: 'complex', materialization: 'target_quality_gate_active_path', authorityCreated: false, safeSummaryOnly: true }, cases, status: failures.length ? 'fail' : 'pass', safeSummaryOnly: true };
if (process.env.CODEX_V129_SELF_TEST_REPORT === 'json' || process.env.CODEX_QUALITY_REPORT === 'json') console.log(JSON.stringify(report)); else console.log(`v129SelfTestStatus: ${report.v129SelfTestStatus.status}`);
process.exit(failures.length ? 1 : 0);
