#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.8.8
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { HARNESS_VERSION, marker, simpleStatus, writeJsonReport, exitFor } from './codex-v080-lib.mjs';
import { buildComplexityGovernanceReport, buildComplexityEvalSuiteReport } from './codex-complexity-governance-gate.mjs';

function assertCase(name, ok, failures, cases, detail = '') {
  cases.push({ name, status: ok ? 'pass' : 'fail', detail: String(detail || '').slice(0, 120), safeSummaryOnly: true });
  if (!ok) failures.push(name);
}

function prEnv(overrides = {}) {
  return {
    CODEX_EVENT_NAME: 'pull_request',
    CODEX_PR_NUMBER: '88',
    CODEX_PR_HEAD_SHA: 'v088-fixture-head',
    CODEX_COMPLEXITY_GOVERNANCE_MODE: 'enforce',
    CODEX_CHANGED_FILES: 'README.md',
    CODEX_PR_BODY: 'Task mode: docs_only\nGoal: docs update\nVerification: static check pass',
    ...overrides,
  };
}

function runLocalGate(overrides = {}) {
  const result = spawnSync('node', ['scripts/codex-local-quality-gate.mjs'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      CODEX_QUALITY_REPORT: 'json',
      CODEX_HARNESS_MODE: 'target',
      CODEX_PROFILE_COMPAT_MODE: 'off',
      CODEX_EVENT_NAME: 'pull_request',
      CODEX_PR_NUMBER: '88',
      CODEX_PR_HEAD_SHA: 'v088-fixture-head',
      CODEX_PR_BASE_SHA: '',
      CODEX_COMPLEXITY_GOVERNANCE_MODE: 'enforce',
      CODEX_SKIP_NPM: '',
      CODEX_NPM_SKIP_REASON: '',
      CODEX_PRODUCT_VERIFICATION_COMMANDS: '',
      CODEX_PRODUCT_VERIFICATION_RESULT: '',
      CODEX_PRODUCT_VERIFICATION_SOURCE: '',
      CODEX_REMOTE_PRODUCT_BASELINE_COMMANDS: '',
      CODEX_REMOTE_PRODUCT_BASELINE_RESULT: '',
      CODEX_REMOTE_PRODUCT_BASELINE_SOURCE: '',
      CODEX_REMOTE_PRODUCT_BASELINE_JSON: '',
      CODEX_REMOTE_PRODUCT_BASELINE_PATH: '',
      CODEX_TEST_METRICS_COMMAND: '',
      CODEX_TEST_METRICS_RESULT: '',
      CODEX_TEST_METRICS_SOURCE: '',
      CODEX_TEST_METRICS_TEST_COUNT: '',
      CODEX_SKIP_V081_SELF_TEST: '1',
      CODEX_SKIP_V082_SELF_TEST: '1',
      CODEX_SKIP_V083_SELF_TEST: '1',
      CODEX_SKIP_V084_SELF_TEST: '1',
      CODEX_SKIP_V085_SELF_TEST: '1',
      CODEX_SKIP_V086_SELF_TEST: '1',
      CODEX_SKIP_V087_SELF_TEST: '1',
      CODEX_SKIP_V088_SELF_TEST: '1',
      ...overrides,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    return { status: result.status, report: JSON.parse(result.stdout || '{}') };
  } catch {
    return { status: result.status, report: { status: 'fail' } };
  }
}

function productCoverageBody(result = 'PASS') {
  return `PR profile: product_minor_r2

Task mode: test_coverage

Goal:
Import smoke coverage.

Files or scope:
scripts/run-tests.js test coverage evidence path only.

Product verification:
npm test ${result}.

Tests or checks run:
npm test ${result}.

## Task Contract
Goal: validate product-relevant test coverage evidence path.
Done criteria: product verification pass evidence and remote baseline pass evidence produce target quality pass.
Verification surface: local target gate simulation.
Risk surface: product evidence interpretation and target score.
Allowed scope: test coverage evidence path.
Forbidden scope: product runtime implementation and external-p1 implementation areas.
Stop condition: stop if product verification, remote baseline, or target score fails.

## Load-bearing evidence
Component: product evidence simulation.
Failure mode caught: product-relevant pass evidence failing to clear product verification or remote baseline.
Not covered by existing gates: v0.8.8 product evidence hydration in self-test context.
Negative fixture: skip-only evidence remains fail.
Positive fixture: pass evidence reaches target score 95.
Runtime cost: low.
Default mode: enforce for PR context.

## Complexity Governance
Complexity regime: high.
Oracle required: yes.
Oracle provided: local target gate simulation, v088 self-test.
Split required: no, self-test fixture only.

Residual risks:
Runtime behavior not proven.

Human confirmation needed:
yes.`;
}

function harnessWorkflowBody() {
  return `PR profile: harness_workflow_r3

Task mode: harness_change

Risk level:
R3

Goal:
Restore v0.8.8 remote product evidence path.

Files or scope:
Harness workflow and gate files.

Evidence Integrity:
Safe evidence only.

Validation commands:
v088 self-test PASS.

Best of N Evidence:
Candidate count: 2
Selected candidate: restore remote product evidence path.
Reason selected: product-relevant changes need trustworthy remote evidence.
Rejected candidate: proceed to npm baseline first.
Reason rejected: remote product evidence path is required before product-relevant baseline repair.

Complexity Governance:
Complexity regime: high
Oracle required: yes
Oracle provided: v088 self-test; simulation A/B/C; local target gate
Split required: no, harness evidence path only

Task Contract:
Goal: restore remote product evidence path
Done criteria: v088 self-test pass; simulations pass
Verification surface: harness self-tests and local gate simulations
Risk surface: workflow evidence path
Allowed scope: workflow/local gate/v088 self-test
Forbidden scope: product runtime/admin/auth/DB/Live2D
Stop condition: stop if target gate fails

Residual risks:
NPM baseline repair remains pending.

Human confirmation needed:
yes.`;
}

function sourceHarnessPrBody() {
  return `PR profile: harness_workflow_r3
Risk level: R3

## Goal
Upgrade Codex Development Harness source to v0.8.8 Complexity-Aware Verification and Oracle Gate.

## Task Mode
Task mode: harness_change

## Complexity Governance
Complexity regime: high
Oracle required: yes
Oracle provided: v088 self-test; complexity eval cases; source/core local gate
Split required: no, source harness-only governance update with bounded files

## Task Contract
Goal: add v0.8.8 source harness complexity governance only
Done criteria: v088 self-test pass; source/core local gate pass; complexityGovernanceStatus pass
Verification surface: source harness validation commands
Risk surface: source harness gate behavior, PR body/evidence interpretation, complexity classification and oracle requirement
Allowed scope: source harness managed files
Forbidden scope: target repos, product runtime code, package/lockfile changes, profiles/*
Stop condition: stop if remote gate fails or current-head owner confirmation is missing

## Load-bearing evidence
Component: v0.8.8 complexity governance
Failure mode caught: high-complexity work without oracle
Not covered by existing gates: complexity classification and oracle requirement
Negative fixture: v088 self-test negative cases
Positive fixture: v088 self-test source harness-only v0.8.8 fixture
Runtime cost: low
Default mode: enforce for PR context

## Testing
v088 self-test pass; complexity eval cases pass; source/core local gate pass

## Constraints
No target rollout.
No product runtime code.
No package or lockfile changes.
No runtime readiness claim.
`;
}

export function buildV088SelfTestReport() {
  const failures = [];
  const cases = [];
  let result;

  result = buildComplexityGovernanceReport({ CODEX_COMPLEXITY_GOVERNANCE_MODE: 'report' }).complexityGovernanceStatus;
  assertCase('no PR context -> not_applicable or pass', ['not_applicable', 'pass'].includes(result.status), failures, cases, result.status);

  result = buildComplexityGovernanceReport(prEnv()).complexityGovernanceStatus;
  assertCase('low_docs_only_pass', result.status === 'pass' && result.regime === 'low', failures, cases, `${result.status}/${result.regime}`);

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'scripts/codex-bug.mjs',
    CODEX_PR_BODY: 'Task mode: bugfix\n## Bugfix Evidence\nReproduced: yes\nRoot cause: fixture\nVerification: test pass\nDone criteria: bug fixed',
  })).complexityGovernanceStatus;
  assertCase('medium_bugfix_with_evidence_pass', result.status === 'pass' && result.regime === 'medium', failures, cases, `${result.status}/${result.regime}`);

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'scripts/codex-bug.mjs',
    CODEX_PR_BODY: 'Task mode: bugfix\n## Bugfix Evidence\nReproduced: yes\nVerification: test pass',
  })).complexityGovernanceStatus;
  assertCase('medium_bugfix_missing_root_cause_fail', result.status === 'fail' && result.reasonCodes.includes('bugfix_review_evidence_missing'), failures, cases, result.reasonCodes?.join(','));

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'src/auth/login.ts',
    CODEX_PR_BODY: 'Task mode: feature\nGoal: auth change\n## Task Contract\nDone criteria: pass\nVerification surface: test pass\nRisk surface: auth\nAllowed scope: auth\nForbidden scope: package\nStop condition: stop\nOracle provided: test\n',
  })).complexityGovernanceStatus;
  assertCase('high_auth_without_negative_test_fail', result.status === 'fail' && result.reasonCodes.includes('oracle_required_for_auth_surface'), failures, cases, result.reasonCodes?.join(','));

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'src/db/repository.ts',
    CODEX_PR_BODY: 'Task mode: feature\nGoal: storage change\n## Task Contract\nDone criteria: pass\nVerification surface: manual check\nRisk surface: storage\nAllowed scope: storage\nForbidden scope: package\nStop condition: stop\nOracle provided: manual_check\n',
  })).complexityGovernanceStatus;
  assertCase('high_storage_without_integrity_evidence_manual', result.status === 'manual_confirmation_required' && result.reasonCodes.includes('oracle_required_for_storage_surface'), failures, cases, result.reasonCodes?.join(','));

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'scripts/codex-release.mjs',
    CODEX_PR_BODY: 'Task mode: release_gate\nProduction readiness claimed: yes\n## Task Contract\nDone criteria: release\nVerification surface: review\nRisk surface: release\nAllowed scope: release\nForbidden scope: product\nStop condition: stop',
  })).complexityGovernanceStatus;
  assertCase('high_release_claim_without_oracle_fail', result.status === 'fail' && result.reasonCodes.includes('high_complexity_oracle_missing'), failures, cases, result.reasonCodes?.join(','));

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'src/runtime/server.ts',
    CODEX_PR_BODY: 'Task mode: release_gate\nRuntime readiness claimed: yes\nOracle provided: fixture\nVerification: fixture pass\n## Task Contract\nDone criteria: ready\nVerification surface: fixture\nRisk surface: runtime\nAllowed scope: runtime\nForbidden scope: package\nStop condition: stop',
  })).complexityGovernanceStatus;
  assertCase('runtime_ready_fixture_only_fail', result.status === 'fail' && result.reasonCodes.includes('fixture_not_sufficient_for_runtime_claim'), failures, cases, result.reasonCodes?.join(','));

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'scripts/codex-rollout.mjs',
    CODEX_PR_BODY: 'Task mode: harness_change\nGoal: target rollout with target repo changes\nForbidden scope: target repos\n## Task Contract\nDone criteria: done\nVerification surface: gate\nRisk surface: target rollout\nAllowed scope: source harness\nStop condition: stop\nOracle provided: test',
  })).complexityGovernanceStatus;
  assertCase('constraint_conflict_fail', result.status === 'fail' && result.reasonCodes.includes('solvability_constraints_conflict'), failures, cases, result.reasonCodes?.join(','));

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'scripts/codex-tool.mjs',
    CODEX_PR_BODY: 'Task mode: feature\nGoal: browser check\nRequired tools: browser\nMissing tools: browser\nOracle provided: unavailable_with_reason\n## Task Contract\nDone criteria: document risk\nVerification surface: manual check\nRisk surface: tool availability\nAllowed scope: harness\nForbidden scope: product\nStop condition: stop',
  })).complexityGovernanceStatus;
  assertCase('tool_unavailable_weakens_evidence_manual', result.status === 'manual_confirmation_required' && result.reasonCodes.includes('verification_weakened_by_missing_tool'), failures, cases, result.reasonCodes?.join(','));

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'src/runtime/server.ts',
    CODEX_PR_BODY: 'Task mode: release_gate\nRuntime readiness claimed: yes\nRequired tools: smoke\nMissing tools: smoke\nVerification: pass\n## Task Contract\nDone criteria: ready\nVerification surface: smoke\nRisk surface: runtime\nAllowed scope: runtime\nForbidden scope: package\nStop condition: stop\nOracle provided: smoke',
  })).complexityGovernanceStatus;
  assertCase('tool_unavailable_blocks_runtime_ready_fail', result.status === 'fail' && result.reasonCodes.includes('verification_blocked_by_missing_tool'), failures, cases, result.reasonCodes?.join(','));

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'scripts/codex-large.mjs',
    CODEX_PR_BODY: 'Task mode: feature\nGoal: many-step large output task\n## Task Contract\nDone criteria: done\nVerification surface: manual explanation\nRisk surface: large output\nAllowed scope: harness\nForbidden scope: product\nStop condition: stop\nOracle provided: manual_check\nmanual explanation only',
  })).complexityGovernanceStatus;
  assertCase('algorithmic_artifact_required_fail', result.status === 'fail' && result.reasonCodes.includes('algorithmic_artifact_required'), failures, cases, result.reasonCodes?.join(','));

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: Array.from({ length: 16 }, (_, i) => `src/module${i}.ts`).join('\n'),
    CODEX_DIFF_NUMSTAT: Array.from({ length: 16 }, (_, i) => `10\t10\tsrc/module${i}.ts`).join('\n'),
    CODEX_PR_BODY: 'Task mode: feature\nGoal: large product diff\n## Task Contract\nDone criteria: done\nVerification surface: test pass\nRisk surface: runtime\nAllowed scope: product\nForbidden scope: package\nStop condition: stop\nOracle provided: test\nVerification: test pass',
  })).complexityGovernanceStatus;
  assertCase('split_required_for_large_product_diff_manual', result.status === 'manual_confirmation_required' && result.reasonCodes.includes('split_required_for_large_diff'), failures, cases, result.reasonCodes?.join(','));

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'scripts/codex-complexity-governance-gate.mjs\ndocs/process/CODEX_COMPLEXITY_GOVERNANCE_POLICY.md',
    CODEX_PR_BODY: sourceHarnessPrBody(),
  })).complexityGovernanceStatus;
  assertCase('harness_only_gate_change_with_self_test_pass', result.status === 'pass' && result.regime === 'high', failures, cases, `${result.status}/${result.regime}/${result.reasonCodes?.join(',')}`);

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'scripts/codex-complexity-governance-gate.mjs\nsrc/runtime/server.ts',
    CODEX_PR_BODY: 'Task mode: harness_change\nGoal: mixed harness and product\n## Task Contract\nDone criteria: done\nVerification surface: test\nRisk surface: mixed\nAllowed scope: harness\nForbidden scope: product\nStop condition: stop\nOracle provided: test\nVerification: test pass',
  })).complexityGovernanceStatus;
  assertCase('harness_change_mixed_with_product_files_fail', result.status === 'fail' && result.reasonCodes.includes('harness_change_mixed_with_product_files'), failures, cases, result.reasonCodes?.join(','));

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'src/runtime/server.ts',
    CODEX_PR_BODY: 'Task mode: feature\nGoal: product change\n## Task Contract\nDone criteria: done\nVerification surface: test\nRisk surface: runtime\nAllowed scope: product\nForbidden scope: package\nStop condition: stop\nOracle provided: test\nVerification: test pass',
    CODEX_PRODUCT_VERIFICATION_JSON: JSON.stringify({ productVerificationStatus: { status: 'fail', reasonCodes: ['product_verification_failed'], safeSummaryOnly: true } }),
  })).complexityGovernanceStatus;
  assertCase('product_verification_fail_remains_fail', result.status === 'fail' && result.reasonCodes.includes('product_verification_failed'), failures, cases, result.reasonCodes?.join(','));

  result = runLocalGate({
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_PRODUCT_VERIFICATION_COMMANDS: 'npm test',
    CODEX_PRODUCT_VERIFICATION_RESULT: 'pass',
    CODEX_PRODUCT_VERIFICATION_SOURCE: 'remote_quality_gate',
    CODEX_REMOTE_PRODUCT_BASELINE_COMMANDS: 'npm test',
    CODEX_REMOTE_PRODUCT_BASELINE_RESULT: 'pass',
    CODEX_REMOTE_PRODUCT_BASELINE_SOURCE: 'remote_quality_gate',
    CODEX_TEST_METRICS_COMMAND: 'npm test',
    CODEX_TEST_METRICS_RESULT: 'pass',
    CODEX_TEST_METRICS_SOURCE: 'remote',
    CODEX_TEST_METRICS_TEST_COUNT: '467',
    CODEX_PR_BODY: productCoverageBody('PASS'),
  }).report;
  assertCase('v088 product-relevant remote npm pass evidence passes product verification', result.productVerificationStatus?.status === 'pass', failures, cases, result.productVerificationStatus?.status);
  assertCase('v088 product-relevant remote npm pass evidence passes remote baseline', result.remoteProductBaselineStatus?.status === 'pass', failures, cases, result.remoteProductBaselineStatus?.status);
  assertCase('v088 pass evidence target gate reaches score 95', result.targetQualityScoreStatus?.status === 'pass' && result.targetQualityScoreStatus?.score === 95, failures, cases, `${result.targetQualityScoreStatus?.status}/${result.targetQualityScoreStatus?.score}`);

  result = runLocalGate({
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_SKIP_NPM: '1',
    CODEX_NPM_SKIP_REASON: 'unsafe skip attempt',
    CODEX_PR_BODY: productCoverageBody('not run'),
  }).report;
  assertCase('v088 product-relevant CODEX_SKIP_NPM only fails', result.productVerificationStatus?.status === 'fail' && result.targetQualityScoreStatus?.status === 'fail', failures, cases, `${result.productVerificationStatus?.status}/${result.targetQualityScoreStatus?.status}`);
  assertCase('v088 product evidence explain reports skip_not_allowed safely', result.v085StabilityStatus?.productEvidenceExplainStatus?.explanation?.skipNotAllowed === true, failures, cases, result.v085StabilityStatus?.productEvidenceExplainStatus?.nextBestFix);

  result = runLocalGate({
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_PRODUCT_VERIFICATION_COMMANDS: 'npm test',
    CODEX_PRODUCT_VERIFICATION_RESULT: 'fail',
    CODEX_PRODUCT_VERIFICATION_SOURCE: 'remote_quality_gate',
    CODEX_REMOTE_PRODUCT_BASELINE_COMMANDS: 'npm test',
    CODEX_REMOTE_PRODUCT_BASELINE_RESULT: 'fail',
    CODEX_REMOTE_PRODUCT_BASELINE_SOURCE: 'remote_quality_gate',
    CODEX_TEST_METRICS_COMMAND: 'npm test',
    CODEX_TEST_METRICS_RESULT: 'fail',
    CODEX_TEST_METRICS_SOURCE: 'remote',
    CODEX_PR_BODY: productCoverageBody('FAIL'),
  }).report;
  assertCase('v088 remote npm fail evidence remains failure score 70', result.productVerificationStatus?.status === 'fail' && result.remoteProductBaselineStatus?.status === 'fail' && result.targetQualityScoreStatus?.status === 'fail' && result.targetQualityScoreStatus?.score === 70, failures, cases, `${result.productVerificationStatus?.status}/${result.remoteProductBaselineStatus?.status}/${result.targetQualityScoreStatus?.score}`);

  result = runLocalGate({
    CODEX_CHANGED_FILES: 'scripts/run-tests.js',
    CODEX_PRODUCT_VERIFICATION_COMMANDS: 'npm test',
    CODEX_PRODUCT_VERIFICATION_RESULT: 'pass',
    CODEX_PRODUCT_VERIFICATION_SOURCE: 'remote_quality_gate',
    CODEX_PR_BODY: productCoverageBody('PASS'),
  }).report;
  assertCase('v088 product evidence explain reports missing_baseline safely', result.productVerificationStatus?.reasonCodes?.includes('remote_product_baseline_missing') && result.v085StabilityStatus?.productEvidenceExplainStatus?.explanation?.remoteBaselineMissing === true, failures, cases, result.productVerificationStatus?.reasonCodes?.join(','));

  result = runLocalGate({
    CODEX_CHANGED_FILES: '.github/workflows/quality-gate.yml,scripts/codex-local-quality-gate.mjs,scripts/codex-v088-self-test.mjs',
    CODEX_SKIP_NPM: '1',
    CODEX_NPM_SKIP_REASON: 'harness-only remote product evidence fix',
    CODEX_PR_BODY: harnessWorkflowBody(),
  }).report;
  assertCase('v088 harness-only fast path can skip npm with safe reason', result.productVerificationStatus?.status === 'pass' && result.fastPathStatus?.status === 'pass', failures, cases, `${result.productVerificationStatus?.status}/${result.fastPathStatus?.status}`);
  assertCase('v088 raw values are not emitted by local gate simulations', result.valuesPrinted !== true, failures, cases, String(result.valuesPrinted));

  const evalSuite = buildComplexityEvalSuiteReport().complexityEvalSuiteStatus;
  assertCase('complexity eval suite fixtures -> pass', evalSuite.status === 'pass', failures, cases, evalSuite.failures?.join(','));

  result = buildComplexityGovernanceReport(prEnv({
    CODEX_CHANGED_FILES: 'docs/process/CODEX_COMPLEXITY_GOVERNANCE_POLICY.md\ndocs/process/CODEX_COMPLEXITY_EVAL_CASES.json\nscripts/codex-complexity-governance-gate.mjs\nscripts/codex-v088-self-test.mjs',
    CODEX_PR_BODY: sourceHarnessPrBody(),
  })).complexityGovernanceStatus;
  assertCase('source harness-only v0.8.8 PR fixture pass', result.status === 'pass' && result.regime === 'high', failures, cases, `${result.status}/${result.regime}/${result.reasonCodes?.join(',')}`);

  return {
    marker,
    harnessVersion: HARNESS_VERSION,
    v088SelfTestStatus: {
      status: failures.length ? 'fail' : 'pass',
      casesRun: cases.length,
      failures,
      cases,
      safeSummaryOnly: true,
    },
    valuesPrinted: false,
    status: failures.length ? 'fail' : 'pass',
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const report = buildV088SelfTestReport();
    writeJsonReport(report, 'CODEX_V088_SELF_TEST_REPORT');
    exitFor(report);
  } catch {
    const report = simpleStatus('v088SelfTestStatus', 'fail', { failures: ['unexpected_error'] });
    writeJsonReport(report, 'CODEX_V088_SELF_TEST_REPORT');
    process.exit(1);
  }
}
