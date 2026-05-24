#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.8.2
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HARNESS_VERSION, marker, parseArgs, scanObjectForUnsafe, simpleStatus, writeJsonReport } from './codex-v080-lib.mjs';
import { buildCompactReasonSummary } from './codex-reason-summary.mjs';

const sourceRequiredPass = [
  'sourceHarnessValidationStatus',
  'profileTemplateCompatibilityStatus',
  'genericHarnessCoreStatus',
  'agentsContextStatus',
  'environmentReadinessStatus',
  'goldenSetStatus',
  'changeClassificationStatus',
  'productVerificationStatus',
  'productVerificationEvidenceStatus',
  'testMetricsStatus',
  'stalePrAuditStatus',
  'reasonSummaryStatus',
  'bestOfNEvidenceStatus',
  'taskQueueLiteStatus',
  'safeTraceSchemaStatus',
  'curatorReportStatus',
  'offlineEvolutionProposalStatus',
  'testCoverageEvidenceStatus',
  'performanceEvidenceStatus',
  'agentMemoryPolicyStatus',
  'skillLifecyclePolicyStatus',
  'curatorSuggestionStatus',
  'selfEvolutionPolicyStatus',
  'safeArtifactValidation',
  'outputShapeStatus',
  'openaiCodexMethodStatus',
  'methodSupportStatus',
  'productionReadinessStatus',
  'evidenceIntegrityStatus',
  'hermesInvariantStatus',
  'evidencePackStatus',
  'humanConfirmationObjectStatus',
  'safeOutputScanStatus',
  'ciReplayStatus',
  'prBodyLintStatus',
  'failureReasonCatalogStatus',
  'v071SelfTestStatus',
  'v072SelfTestStatus',
  'v080SelfTestStatus',
  'v081SelfTestStatus',
  'v082SelfTestStatus',
  'qualityScoreStatus',
];

const targetRequiredPass = [
  'targetManifestStatus',
  'secretScan',
  'agentsContextStatus',
  'environmentReadinessStatus',
  'changeClassificationStatus',
  'productVerificationStatus',
  'productVerificationEvidenceStatus',
  'testMetricsStatus',
  'stalePrAuditStatus',
  'reasonSummaryStatus',
  'safeOutputScanStatus',
  'v080SelfTestStatus',
  'v081SelfTestStatus',
  'v082SelfTestStatus',
  'safeArtifactValidation',
  'outputShapeStatus',
  'targetQualityScoreStatus',
];

const optionalNotApplicable = new Set([
  'agentMemoryPolicyStatus',
  'skillLifecyclePolicyStatus',
  'curatorSuggestionStatus',
  'selfEvolutionPolicyStatus',
  'taskQueueLiteStatus',
  'safeTraceSchemaStatus',
  'curatorReportStatus',
  'offlineEvolutionProposalStatus',
  'testCoverageEvidenceStatus',
  'performanceEvidenceStatus',
  'bestOfNEvidenceStatus',
  'changeClassificationStatus',
  'productVerificationStatus',
  'productVerificationEvidenceStatus',
  'testMetricsStatus',
  'stalePrAuditStatus',
  'goldenSetStatus',
  'evidencePackStatus',
  'ciReplayStatus',
  'prBodyLintStatus',
  'openaiCodexMethodStatus',
  'productionReadinessStatus',
  'evidenceIntegrityStatus',
  'hermesInvariantStatus',
]);

const forbiddenWorkflowFieldNames = new Set([
  'rawDiff',
  'rawLogs',
  'secretValue',
  'endpointValue',
  'privatePath',
  'rawPayload',
  'payload',
  'productionData',
  'personalData',
  'rawCommand',
  'raw_command',
]);

const safeLabelValues = new Set([
  'pass',
  'fail',
  'warning',
  'missing',
  'not_applicable',
  'not_required',
  'manual_confirmation_required',
  'workflow_runner_invalid_report',
  'workflow_runner_failed',
  'workflow_required_status_failure',
  'workflow_runner_unsafe_field',
  'workflow_runner_unsafe_value',
  'workflow_runner_safe_metadata',
  'safe_policy_vocabulary',
  'local',
  'remote_quality_gate',
  'github_actions',
  'npm test',
]);

function safePathLabel(pathLabel) {
  return String(pathLabel || 'report')
    .split('.')
    .map((segment) => (/^[A-Za-z][A-Za-z0-9_[\]-]{0,80}$/.test(segment) ? segment : 'field'))
    .join('.');
}

function safeReasonCode(value, fallback = 'quality_gate_failure') {
  const text = String(value || fallback).replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 96);
  return text || fallback;
}

function isSafePublicGithubUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return false;
    return parsed.protocol === 'https:' && ['github.com', 'api.github.com'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function workflowValueFindings(value, pathLabel) {
  const text = String(value || '');
  if (!text || safeLabelValues.has(text.trim())) return [];
  const findings = [];
  const urlMatches = text.match(/\b(?:https?|postgres(?:ql)?|mysql|mongodb):\/\/[^\s<>"'`]+/gi) || [];
  for (const url of urlMatches) {
    if (!isSafePublicGithubUrl(url)) {
      findings.push({ reasonCode: 'workflow_runner_unsafe_value', path: safePathLabel(pathLabel) });
    }
  }
  const concreteRules = [
    /\b(?:gh[pousr]_|sk-|AKIA|glpat-|npm_|xox[baprs]-)[A-Za-z0-9_-]{8,}\b/,
    /-----BEGIN [^-]+PRIVATE KEY-----/i,
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    /\b[A-Za-z]:\\Users\\[^"'`\s]+|\/home\/[^"'`\s]+/i,
  ];
  for (const pattern of concreteRules) {
    if (pattern.test(text)) findings.push({ reasonCode: 'workflow_runner_unsafe_value', path: safePathLabel(pathLabel) });
  }
  return findings;
}

function workflowReportUnsafeFindings(value, pathLabel = 'report') {
  const findings = [];
  const visit = (node, label) => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
      findings.push(...workflowValueFindings(node, label));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${label}[${index}]`));
      return;
    }
    if (typeof node === 'object') {
      for (const [key, nested] of Object.entries(node)) {
        const nestedLabel = `${label}.${key}`;
        if (forbiddenWorkflowFieldNames.has(key)) {
          findings.push({ reasonCode: 'workflow_runner_unsafe_field', path: safePathLabel(nestedLabel) });
        }
        visit(nested, nestedLabel);
      }
    }
  };
  visit(value, pathLabel);
  return findings;
}

function safeFailureLabel(item) {
  if (typeof item === 'string') return safeReasonCode(item);
  if (!item || typeof item !== 'object') return 'quality_gate_failure';
  return safeReasonCode(item.id || item.reasonCode);
}

function readReport(file) {
  if (!file) return { ok: false, report: null, reasonCode: 'workflow_runner_invalid_report' };
  try {
    const report = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    return { ok: true, report };
  } catch {
    return { ok: false, report: null, reasonCode: 'workflow_runner_invalid_report' };
  }
}

function statusAllowed(key, status, eventName) {
  if (status === 'pass') return true;
  if (key === 'humanConfirmationObjectStatus' && status === 'not_required') return true;
  if (status === 'not_applicable' && optionalNotApplicable.has(key)) {
    if (['evidencePackStatus', 'ciReplayStatus', 'prBodyLintStatus', 'productionReadinessStatus', 'evidenceIntegrityStatus', 'hermesInvariantStatus'].includes(key)) {
      return eventName !== 'pull_request';
    }
    return true;
  }
  return false;
}

export function evaluateWorkflowReport(report, options = {}) {
  const mode = report.targetQualityScoreStatus && !report.sourceHarnessValidationStatus ? 'target' : 'source';
  const required = mode === 'target' ? targetRequiredPass : sourceRequiredPass;
  const failures = [];
  const unsafeFindings = workflowReportUnsafeFindings(report);
  for (const finding of unsafeFindings) failures.push(`${finding.reasonCode}:${finding.path}`);
  for (const key of required) {
    const status = report[key]?.status || 'missing';
    if (!statusAllowed(key, status, options.eventName || process.env.CODEX_EVENT_NAME)) failures.push(`${key}=${status}`);
  }
  if (options.gateExit && options.gateExit !== 0 && !['pass', 'manual_confirmation_required'].includes(report.status)) {
    failures.push(`report.status=${report.status || 'missing'}`);
  }
  const reasonSummary = buildCompactReasonSummary(report).summary || {
    status: 'fail',
    mode,
    score: null,
    blockingReasons: [{ reasonCode: 'reason_summary_invalid', gate: 'reasonSummaryStatus' }],
    manualReasons: [],
    optionalNotApplicable: [],
    topNextActions: ['Review reason summary generation.'],
    safeSummaryOnly: true,
  };
  const safeSummary = {
    marker,
    harnessVersion: HARNESS_VERSION,
    mode,
    status: report.status || 'missing',
    mergeReady: Boolean(report.mergeReady),
    targetMergeReady: report.targetMergeReady ?? null,
    humanReviewRequired: Boolean(report.humanReviewRequired),
    qualityScoreStatus: report.qualityScoreStatus || report.targetQualityScoreStatus || { status: 'missing' },
    reasonSummary,
    failureCount: Array.isArray(report.failures) ? report.failures.length : 0,
    warningCount: Array.isArray(report.warnings) ? report.warnings.length : 0,
    safeSummaryOnly: true,
  };
  const failureReasons = [
    ...(Array.isArray(report.failures) ? report.failures : []).slice(0, 50).map((item) => ({
      reasonCode: safeFailureLabel(item),
      gate: 'localQualityGate',
      severity: 'error',
      safeMessage: 'Quality gate failure.',
    })),
    ...failures.map((item) => ({
      reasonCode: 'workflow_required_status_failure',
      gate: 'workflowQualityRunner',
      severity: 'error',
      safeMessage: safeReasonCode(item),
    })),
  ];
  if (scanObjectForUnsafe(safeSummary).length || scanObjectForUnsafe(failureReasons).length) {
    failures.push('workflow_runner_invalid_report');
  }
  return {
    mode,
    failures: [...new Set(failures)],
    safeSummary,
    failureReasons,
    status: failures.length ? 'fail' : 'pass',
  };
}

function writeArtifacts(result, report) {
  fs.writeFileSync('codex-quality-gate-safe-summary.json', JSON.stringify(result.safeSummary, null, 2));
  fs.writeFileSync('codex-failure-reasons.json', JSON.stringify(result.failureReasons, null, 2));
  fs.writeFileSync('codex-evidence-pack.normalized.json', JSON.stringify({
    evidencePackStatus: report.evidencePackStatus || { status: 'missing' },
    normalizedEvidencePackPresent: Boolean(report.normalizedEvidencePack),
    safeSummaryOnly: true,
  }, null, 2));
  if (result.mode === 'target') {
    fs.writeFileSync('codex-target-quality-summary.json', JSON.stringify({
      targetQualityScoreStatus: report.targetQualityScoreStatus || { status: 'missing' },
      targetMergeReady: Boolean(report.targetMergeReady),
      safeSummaryOnly: true,
    }, null, 2));
  }
}

export function buildWorkflowQualityRunnerReport(report, options = {}) {
  const result = evaluateWorkflowReport(report, options);
  return simpleStatus('workflowQualityRunnerStatus', result.status, {
    mode: result.mode,
    reasonCodes: result.failures.length ? ['workflow_runner_failed'] : [],
    failures: result.failures,
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = parseArgs();
  const file = args.report || process.env.CODEX_WORKFLOW_REPORT_PATH || process.argv[2];
  const loaded = readReport(file);
  if (!loaded.ok) {
    const report = simpleStatus('workflowQualityRunnerStatus', 'fail', { reasonCodes: [loaded.reasonCode] });
    writeJsonReport(report, 'CODEX_WORKFLOW_RUNNER_REPORT');
    process.exit(1);
  }
  const result = evaluateWorkflowReport(loaded.report, {
    gateExit: Number(args['gate-exit'] || process.env.CODEX_GATE_EXIT || 0),
    eventName: process.env.CODEX_EVENT_NAME,
  });
  writeArtifacts(result, loaded.report);
  const out = buildWorkflowQualityRunnerReport(loaded.report, {
    gateExit: Number(args['gate-exit'] || process.env.CODEX_GATE_EXIT || 0),
    eventName: process.env.CODEX_EVENT_NAME,
  });
  writeJsonReport(out, 'CODEX_WORKFLOW_RUNNER_REPORT');
  if (result.failures.length) {
    for (const item of result.failures.slice(0, 20)) {
      const safe = String(item).replace(/[^A-Za-z0-9_.:= -]/g, '_').slice(0, 180);
      console.error(`::error title=codex-quality-gate::${safe}`);
    }
    process.exit(1);
  }
}
