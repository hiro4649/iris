#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.8.3
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HARNESS_VERSION, marker, parseArgs, scanObjectForUnsafe, simpleStatus, writeJsonReport } from './codex-v080-lib.mjs';
import { buildCompactReasonSummary } from './codex-reason-summary.mjs';
import { buildSafeArtifactIndex } from './codex-safe-artifact-index.mjs';
import { buildFinalSummary } from './codex-target-final-summary.mjs';

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
  'remoteProductBaselineStatus',
  'remoteNpmDiagnosticStatus',
  'workflowPreflightStatus',
  'safeArtifactIndexStatus',
  'openPrHygieneStatus',
  'targetFinalSummaryStatus',
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
  'v083SelfTestStatus',
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
  'remoteProductBaselineStatus',
  'remoteNpmDiagnosticStatus',
  'workflowPreflightStatus',
  'safeArtifactIndexStatus',
  'openPrHygieneStatus',
  'targetFinalSummaryStatus',
  'stalePrAuditStatus',
  'reasonSummaryStatus',
  'safeOutputScanStatus',
  'v080SelfTestStatus',
  'v081SelfTestStatus',
  'v082SelfTestStatus',
  'v083SelfTestStatus',
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
  'remoteProductBaselineStatus',
  'remoteNpmDiagnosticStatus',
  'safeArtifactIndexStatus',
  'openPrHygieneStatus',
  'targetFinalSummaryStatus',
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

const unsafeReportFieldNames = new Set([
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
]);

const unsafeReportFieldLabels = new Map([
  ['rawPayload', 'raw_payload_field'],
  ['payload', 'raw_payload_field'],
  ['rawLogs', 'raw_logs_field'],
  ['rawDiff', 'raw_diff_field'],
  ['secretValue', 'secret_value_field'],
  ['endpointValue', 'endpoint_value_field'],
  ['privatePath', 'private_path_field'],
  ['rawCommand', 'raw_command_field'],
]);

const invalidReportReasons = new Set([
  'unsafe_report_field',
  'unsafe_report_value',
  'quality_report_parse_failed',
  'quality_report_missing',
  'unknown_invalid_report',
]);

const unsafeValuePathClassRules = [
  ['workflow_run_metadata_value', /(?:^|[.\[])(?:workflow_run|workflow_runs|run_id|run_number|jobs_url)(?:$|[.\]\[])/i],
  ['pr_metadata_value', /(?:^|[.\[])(?:pull_request|pr_number|pr_url|pr_metadata)(?:$|[.\]\[])/i],
  ['commit_metadata_value', /(?:^|[.\[])(?:head_sha|base_sha|commit_sha|sha)(?:$|[.\]\[])/i],
  ['artifact_metadata_value', /(?:^|[.\[])(?:artifact|artifacts|artifactName|path)(?:$|[.\]\[])/i],
  ['command_label_value', /(?:^|[.\[])(?:command|commands|test_command|commandClass)(?:$|[.\]\[])/i],
  ['reason_text_value', /(?:^|[.\[])(?:reason|reasonCode|reasonCodes|safeMessage)(?:$|[.\]\[])/i],
  ['summary_text_value', /(?:^|[.\[])(?:summary|safeSummary|nextAction|topNextActions)(?:$|[.\]\[])/i],
  ['evidence_source_value', /(?:^|[.\[])(?:source|evidenceSource|evidence_source)(?:$|[.\]\[])/i],
  ['public_github_url_value', /(?:^|[.\[])(?:html_url|display_url|api_url|url)(?:$|[.\]\[])/i],
];

function uniqueSafeLabels(values) {
  const labels = values
    .filter((value) => typeof value === 'string' && /^[a-z0-9_]+$/.test(value))
    .slice(0, 20);
  return [...new Set(labels)].slice(0, 10);
}

function buildInvalidReportDiagnostic(reasonCode, options = {}) {
  const safeReason = invalidReportReasons.has(options.safeInvalidReportReason)
    ? options.safeInvalidReportReason
    : reasonCode === 'quality_report_missing'
      ? 'quality_report_missing'
      : reasonCode === 'quality_report_parse_failed'
        ? 'quality_report_parse_failed'
        : 'unknown_invalid_report';
  const labels = uniqueSafeLabels(options.safeInvalidReportPathLabels || []);
  return {
    safeInvalidReportReason: safeReason,
    safeInvalidReportPathLabels: labels.length ? labels : ['unknown_report_path'],
    safeInvalidReportFindingCount: Number.isFinite(options.safeInvalidReportFindingCount)
      ? Math.max(0, Math.min(100, Math.trunc(options.safeInvalidReportFindingCount)))
      : labels.length,
    safeSummaryOnly: true,
  };
}

function collectUnsafeReportFieldLabels(value) {
  const labels = [];
  const stack = [value];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node)) {
      stack.push(...node);
      continue;
    }
    for (const [key, nested] of Object.entries(node)) {
      if (unsafeReportFieldNames.has(key)) {
        labels.push(unsafeReportFieldLabels.get(key) || 'unknown_report_path');
      }
      stack.push(nested);
    }
  }
  return uniqueSafeLabels(labels);
}

function safeInvalidReportValuePathLabel(pathLabel) {
  const safePath = String(pathLabel || '');
  const matched = unsafeValuePathClassRules.find(([, pattern]) => pattern.test(safePath));
  return matched?.[0] || 'unknown_value_path';
}

function collectUnsafeReportValuePathLabels(findings) {
  return uniqueSafeLabels(
    findings
      .slice(0, 100)
      .map((finding) => safeInvalidReportValuePathLabel(finding?.path))
  );
}

function readReport(file) {
  if (!file) {
    return {
      ok: false,
      report: null,
      reasonCode: 'quality_report_missing',
      invalidReportDiagnostic: buildInvalidReportDiagnostic('quality_report_missing'),
    };
  }
  if (!fs.existsSync(file)) {
    return {
      ok: false,
      report: null,
      reasonCode: 'quality_report_missing',
      invalidReportDiagnostic: buildInvalidReportDiagnostic('quality_report_missing'),
    };
  }
  try {
    const report = JSON.parse(fs.readFileSync(file, 'utf8'));
    const unsafeFieldLabels = collectUnsafeReportFieldLabels(report);
    if (unsafeFieldLabels.length) {
      return {
        ok: false,
        report: null,
        reasonCode: 'workflow_runner_invalid_report',
        invalidReportDiagnostic: buildInvalidReportDiagnostic('workflow_runner_invalid_report', {
          safeInvalidReportReason: 'unsafe_report_field',
          safeInvalidReportPathLabels: unsafeFieldLabels,
          safeInvalidReportFindingCount: unsafeFieldLabels.length,
        }),
      };
    }
    const unsafeFindings = scanObjectForUnsafe(report);
    if (unsafeFindings.length) {
      const unsafeValueLabels = collectUnsafeReportValuePathLabels(unsafeFindings);
      return {
        ok: false,
        report: null,
        reasonCode: 'workflow_runner_invalid_report',
        invalidReportDiagnostic: buildInvalidReportDiagnostic('workflow_runner_invalid_report', {
          safeInvalidReportReason: 'unsafe_report_value',
          safeInvalidReportPathLabels: unsafeValueLabels,
          safeInvalidReportFindingCount: unsafeFindings.length,
        }),
      };
    }
    return { ok: true, report };
  } catch {
    return {
      ok: false,
      report: null,
      reasonCode: 'quality_report_parse_failed',
      invalidReportDiagnostic: buildInvalidReportDiagnostic('quality_report_parse_failed'),
    };
  }
}

const fallbackReasonCodes = new Set([
  'workflow_runner_invalid_report',
  'quality_report_missing',
  'quality_report_parse_failed',
  'target_summary_missing',
  'safe_artifact_write_failed',
]);

function safeReasonCode(value) {
  return fallbackReasonCodes.has(value) ? value : 'workflow_runner_invalid_report';
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
      reasonCode: item.id || item.reasonCode || 'quality_gate_failure',
      gate: 'localQualityGate',
      severity: 'error',
      safeMessage: item.message || 'Quality gate failure.',
    })),
    ...failures.map((item) => ({
      reasonCode: 'workflow_required_status_failure',
      gate: 'workflowQualityRunner',
      severity: 'error',
      safeMessage: item,
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
  fs.writeFileSync('codex-reason-summary.json', JSON.stringify(result.safeSummary.reasonSummary || {
    status: 'fail',
    blockingReasons: [{ reasonCode: 'reason_summary_missing', gate: 'reasonSummaryStatus' }],
    manualReasons: [],
    optionalNotApplicable: [],
    topNextActions: ['Review safe workflow runner artifacts.'],
    safeSummaryOnly: true,
  }, null, 2));
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
  const final = buildFinalSummary(report, result.mode);
  fs.writeFileSync(`codex-${result.mode}-final-summary.json`, JSON.stringify(final.summary, null, 2));
  const index = buildSafeArtifactIndex([
    { artifactName: 'codex-quality-gate-safe-summary.json', path: 'codex-quality-gate-safe-summary.json', status: 'present' },
    { artifactName: 'codex-failure-reasons.json', path: 'codex-failure-reasons.json', status: 'present' },
    { artifactName: 'codex-reason-summary.json', path: 'codex-reason-summary.json', status: 'present' },
    { artifactName: 'codex-evidence-pack.normalized.json', path: 'codex-evidence-pack.normalized.json', status: 'present' },
    { artifactName: `codex-${result.mode}-final-summary.json`, path: `codex-${result.mode}-final-summary.json`, status: 'present' },
    { artifactName: 'codex-safe-artifact-index.json', path: 'codex-safe-artifact-index.json', status: 'present' },
    ...(result.mode === 'target' ? [{ artifactName: 'codex-target-quality-summary.json', path: 'codex-target-quality-summary.json', status: 'present' }] : []),
    { artifactName: 'codex-workflow-preflight.safe.json', path: 'codex-workflow-preflight.safe.json', status: fs.existsSync('codex-workflow-preflight.safe.json') ? 'present' : 'missing', reasonCodes: fs.existsSync('codex-workflow-preflight.safe.json') ? [] : ['safe_artifact_missing'] },
    { artifactName: 'codex-test-metrics.safe.json', path: 'codex-test-metrics.safe.json', status: fs.existsSync('codex-test-metrics.safe.json') ? 'present' : 'not_applicable' },
  ], result.mode);
  fs.writeFileSync('codex-safe-artifact-index.json', JSON.stringify(index, null, 2));
}

export function buildFallbackWorkflowArtifacts(reasonCode = 'workflow_runner_invalid_report', mode = 'target', invalidReportDiagnostic = null) {
  const safeCode = safeReasonCode(reasonCode);
  const diagnostic = invalidReportDiagnostic || buildInvalidReportDiagnostic(safeCode);
  const workflowRunnerStatus = {
    status: 'fail',
    reasonCodes: [safeCode],
    ...diagnostic,
  };
  const report = {
    status: 'fail',
    mergeReady: false,
    targetMergeReady: false,
    humanReviewRequired: true,
    targetQualityScoreStatus: {
      status: 'fail',
      score: 0,
      reasonCodes: [safeCode],
      safeSummaryOnly: true,
    },
    reasonSummaryStatus: {
      status: 'pass',
      reasonCodes: [],
      summary: {
        status: 'fail',
        mode,
        score: 0,
        blockingReasons: [{ reasonCode: safeCode, gate: 'workflowQualityRunner' }],
        manualReasons: [],
        optionalNotApplicable: [],
        topNextActions: ['Review safe workflow runner artifacts.'],
        safeSummaryOnly: true,
      },
      safeSummaryOnly: true,
    },
    targetFinalSummaryStatus: {
      status: 'fail',
      reasonCodes: [safeCode],
      safeSummaryOnly: true,
    },
    safeArtifactIndexStatus: {
      status: 'pass',
      reasonCodes: [],
      safeSummaryOnly: true,
    },
    workflowRunnerStatus,
    workflowQualityRunnerStatus: workflowRunnerStatus,
    failures: [{ id: safeCode, message: 'Workflow quality runner could not read a safe quality report.' }],
    warnings: [],
  };
  const result = {
    mode,
    failures: [safeCode],
    safeSummary: {
      marker,
      harnessVersion: HARNESS_VERSION,
      mode,
      status: 'fail',
      mergeReady: false,
      targetMergeReady: false,
      humanReviewRequired: true,
      qualityScoreStatus: report.targetQualityScoreStatus,
      workflowRunnerStatus,
      reasonSummary: report.reasonSummaryStatus.summary,
      failureCount: 1,
      warningCount: 0,
      safeSummaryOnly: true,
    },
    failureReasons: [{
      reasonCode: safeCode,
      gate: 'workflowQualityRunner',
      severity: 'error',
      safeMessage: 'Workflow quality runner could not read a safe quality report.',
      ...diagnostic,
    }],
    status: 'fail',
  };
  return { report, result };
}

export function writeFallbackArtifacts(reasonCode = 'workflow_runner_invalid_report', mode = 'target', invalidReportDiagnostic = null) {
  const fallback = buildFallbackWorkflowArtifacts(reasonCode, mode, invalidReportDiagnostic);
  writeArtifacts(fallback.result, fallback.report);
  return fallback;
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
    const report = simpleStatus('workflowQualityRunnerStatus', 'fail', {
      reasonCodes: [loaded.reasonCode],
      ...(loaded.invalidReportDiagnostic || buildInvalidReportDiagnostic(loaded.reasonCode)),
    });
    try {
      writeFallbackArtifacts(
        loaded.reasonCode,
        process.env.CODEX_HARNESS_MODE === 'source' ? 'source' : 'target',
        loaded.invalidReportDiagnostic
      );
    } catch {
      fs.writeFileSync('codex-failure-reasons.json', JSON.stringify([{
        reasonCode: 'safe_artifact_write_failed',
        gate: 'workflowQualityRunner',
        severity: 'error',
        safeMessage: 'Workflow quality runner could not write fallback safe artifacts.',
      }], null, 2));
    }
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
