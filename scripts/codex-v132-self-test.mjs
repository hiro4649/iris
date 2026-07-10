#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.3.2

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SOURCE_SHA = '891ff534901ffc3cae40be0a5ca9d09b88f87097';
const REPOSITORY = 'hiro4649/iris';
const PROFILE = 'complex_fixture_target';
const ALLOWED = new Set(['AGENTS.md','docs/process/CODEX_HARNESS_MANIFEST.json','docs/process/CODEX_ACTIVE_POLICY_INDEX.json','docs/process/CODEX_V132_SPEC.md','scripts/codex-harness-version.mjs','scripts/codex-local-quality-gate.mjs','scripts/codex-v132-self-test.mjs']);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const changedFiles = () => [...new Set([...git(['diff','--name-only','origin/main','--']).split(/\r?\n/), ...git(['ls-files','--others','--exclude-standard']).split(/\r?\n/)].filter(Boolean).map((file) => file.replaceAll('\\','/')))];
const test = (name, fn) => { try { return { name, status: fn() ? 'pass' : 'fail', safeSummaryOnly: true }; } catch { return { name, status: 'fail', reasonCodes: ['self_test_exception'], safeSummaryOnly: true }; } };

const manifest = readJson('docs/process/CODEX_HARNESS_MANIFEST.json');
const policy = readJson('docs/process/CODEX_ACTIVE_POLICY_INDEX.json');
const agents = fs.readFileSync('AGENTS.md','utf8');
const version = fs.readFileSync('scripts/codex-harness-version.mjs','utf8');
const candidate = manifest.v132TargetCandidate || {};
const rollback = candidate.rollbackChain || {};
const files = changedFiles();
const cases = [
  ['candidate_tuple_is_provisional', () => manifest.candidateVersion === '1.3.2' && manifest.candidateLifecycleState === 'provisional_local_install' && manifest.installationState === 'provisional_local_candidate'],
  ['source_candidate_is_exact_and_unaccepted', () => manifest.sourceCandidateSha === SOURCE_SHA && manifest.installedSourceCandidateSha === SOURCE_SHA && manifest.sourceReleaseAccepted === false && manifest.requiresRevalidationAfterSourceMerge === true],
  ['repository_identity_and_profile_match', () => manifest.targetRepository === REPOSITORY && manifest.targetRepoProfile === 'IRIS' && candidate.repositoryFullName === REPOSITORY && candidate.profileClass === PROFILE],
  ['candidate_never_claims_activation_or_merge', () => manifest.activationAllowed === false && manifest.remoteValidationState === 'not_observed' && manifest.mergeAllowed === false && candidate.activationAllowed === false && candidate.mergeAllowed === false],
  ['rollback_projection_materialization_is_truthful', () => candidate.rollbackMaterialization?.v131 === 'projection_only' && candidate.rollbackMaterialization?.v130 === 'projection_only' && candidate.rollbackMaterialization?.v129 === 'installed_active_baseline'],
  ['rollout_is_local_preparation_only', () => manifest.targetRolloutState === 'local_preparation' && candidate.targetRolloutState === 'local_preparation' && candidate.lifecycleState === 'provisional_local_install'],
  ['rollback_chain_is_preserved', () => rollback.v131 === 'immediate_rollback' && rollback.v130 === 'secondary_rollback' && rollback.v129 === 'emergency_legacy_rollback' && rollback.v128 === 'blocking_compatibility' && rollback.v127 === 'readable_compatibility'],
  ['authority_and_mutation_are_false', () => manifest.authorityCreated === false && manifest.automaticTargetMutation === false && manifest.productMutationCount === 0 && candidate.authorityCreated === false && candidate.observedProductMutationCount === 0],
  ['deferred_surfaces_remain_non_authoritative', () => manifest.PerformanceTrack === 'deferred' && manifest.superiorityClaimState === 'not_proven'],
  ['policy_projection_matches_manifest', () => policy.v132TargetCandidate?.repositoryFullName === REPOSITORY && policy.v132TargetCandidate?.profileClass === PROFILE && policy.v132TargetCandidate?.sourceCandidateSha === SOURCE_SHA && policy.v132TargetCandidate?.mergeAllowed === false],
  ['agents_declares_correct_candidate', () => agents.includes('Provisional HARNESS v1.3.2 Candidate') && agents.includes('IRIS') && agents.includes(PROFILE)],
  ['version_registry_declares_candidate_only', () => version.includes("candidateVersion = '1.3.2'") && version.includes("candidateLifecycleState = 'provisional_local_install'") && version.includes('mergeAllowed: false')],
  ['source_manifest_is_absent', () => !fs.existsSync('CODEX_SOURCE_HARNESS_MANIFEST.json')],
  ['changed_files_are_allowlisted', () => files.every((file) => ALLOWED.has(file))],
].map(([name, fn]) => test(name, fn));
const failed = cases.filter((item) => item.status !== 'pass');
const status = failed.length ? 'fail' : 'pass';
const report = { marker:'CODEX_QUALITY_HARNESS_FILE v1.3.2',harnessVersion:'1.3.2',status,v132SelfTestStatus:{status,suite:'v132',lifecycleState:'provisional_local_install',caseCount:cases.length,failedCaseCount:failed.length,reasonCodes:failed.length?['v132_provisional_target_candidate_self_test_failed']:[],safeSummaryOnly:true},changedFiles:files,authorityCreated:false,productMutationCount:0,activationAllowed:false,mergeAllowed:false,remoteValidationState:'not_observed',cases,safeSummaryOnly:true };
if (process.env.CODEX_V132_SELF_TEST_REPORT === 'json' || process.env.CODEX_QUALITY_REPORT === 'json') console.log(JSON.stringify(report,null,2)); else console.log(`v132SelfTestStatus: ${status}`);
process.exit(status === 'pass' ? 0 : 1);
