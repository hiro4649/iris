#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.6

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VALIDATOR = 'iris_first_runtime_slice_completion_review_validator';
const DEFAULT_DOC = 'docs/specs/IRIS_20240425/IRIS_FIRST_RUNTIME_VERTICAL_SLICE_COMPLETION_REVIEW.md';

const REQUIRED_PHRASES = [
  'Status: completed local slice review',
  'Runtime slice implementation: complete',
  'Regression self-test registration: complete',
  'External calls: not performed',
  'Real YouTube evidence: not confirmed',
  'Real OBS pickup evidence: not confirmed',
  'Real TTS evidence: not confirmed',
  'Real Live2D evidence: not confirmed',
  'Real database evidence: not confirmed',
  'Real Game evidence: not confirmed',
  'Dataset audit runner: not implemented',
  'Real dataset processing: not performed',
  'Runtime readiness: not claimed',
  'Production readiness: not claimed',
  'Production go: not performed',
  'priority1: BLOCKED',
  'PR #226 merged the first in-process runtime vertical slice.',
  'PR #227 merged the regression registration for the first runtime slice.',
  'PR #227 head: `bba84a6f30f9c12c3622921430ff170a2922dd46`',
  'PR #227 merge commit: `8e964957a654cdfe1d9bddbde1d757c9df0d0731`',
  '`npm test`: pass',
  'standard test count: 471',
  'Fixture, mock, local, target-gate, and remote-gate PASS must not be interpreted',
  '`complete_first_in_process_slice_with_regression_registration`',
];

const FORBIDDEN_PATTERNS = [
  [/Runtime readiness:\s*(claimed|ready|pass)/i, 'RUNTIME_READINESS_CLAIMED'],
  [/Production readiness:\s*(claimed|ready|pass)/i, 'PRODUCTION_READINESS_CLAIMED'],
  [/Production go:\s*(performed|done|pass)/i, 'PRODUCTION_GO_PERFORMED'],
  [/priority1:\s*(READY|RESOLVED|PASS)/i, 'PRIORITY1_NOT_BLOCKED'],
  [/Real YouTube evidence:\s*(confirmed|pass|ready)/i, 'REAL_YOUTUBE_EVIDENCE_CLAIMED'],
  [/Real OBS pickup evidence:\s*(confirmed|pass|ready)/i, 'REAL_OBS_EVIDENCE_CLAIMED'],
  [/Real TTS evidence:\s*(confirmed|pass|ready)/i, 'REAL_TTS_EVIDENCE_CLAIMED'],
  [/Real Live2D evidence:\s*(confirmed|pass|ready)/i, 'REAL_LIVE2D_EVIDENCE_CLAIMED'],
  [/Real database evidence:\s*(confirmed|pass|ready)/i, 'REAL_DATABASE_EVIDENCE_CLAIMED'],
  [/Real Game evidence:\s*(confirmed|pass|ready)/i, 'REAL_GAME_EVIDENCE_CLAIMED'],
  [/owner approval:\s*(created|granted|pass)/i, 'OWNER_APPROVAL_CREATED'],
  [/raw logs read:\s*yes/i, 'RAW_LOGS_READ'],
  [/raw diff read:\s*yes/i, 'RAW_DIFF_READ'],
];

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--doc') {
      options.doc = argv[index + 1];
      index += 1;
    }
  }
  return options;
}

function safeFailure(reasonCode) {
  return { validator: VALIDATOR, reason_code: reasonCode };
}

export function buildFirstRuntimeSliceCompletionReviewReport(options = {}) {
  const docPath = options.doc || DEFAULT_DOC;
  const failures = [];
  if (!fs.existsSync(docPath)) {
    failures.push(safeFailure('MISSING_COMPLETION_REVIEW_DOC'));
  }

  const text = fs.existsSync(docPath) ? fs.readFileSync(docPath, 'utf8') : '';
  for (const phrase of REQUIRED_PHRASES) {
    if (!text.includes(phrase)) {
      failures.push(safeFailure(`MISSING_REQUIRED_PHRASE_${phrase.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toUpperCase()}`));
    }
  }
  for (const [pattern, reasonCode] of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) failures.push(safeFailure(reasonCode));
  }

  const ok = failures.length === 0;
  return {
    ok,
    validator: VALIDATOR,
    documentChecked: path.basename(docPath),
    completionReviewStatus: ok ? 'pass' : 'fail',
    implementationEvidenceStatus: text.includes('Runtime slice implementation: complete') ? 'pass' : 'fail',
    regressionRegistrationStatus: text.includes('Regression self-test registration: complete') ? 'pass' : 'fail',
    realEvidenceBoundaryStatus: failures.some((item) => item.reason_code.startsWith('REAL_')) ? 'fail' : 'pass',
    readinessBoundaryStatus: failures.some((item) => item.reason_code.includes('READINESS') || item.reason_code === 'PRODUCTION_GO_PERFORMED') ? 'fail' : 'pass',
    priority1Status: 'BLOCKED',
    runtimeImplemented: false,
    datasetAuditRunnerImplemented: false,
    realDatasetProcessing: false,
    minecraftRuntimeImplemented: false,
    minecraftPluginImplemented: false,
    voxweaveImplementation: false,
    live2dImplementation: false,
    criptoTipImplementation: false,
    productionReadinessClaimed: false,
    productionGoPerformed: false,
    rawLogsRead: false,
    rawDiffRead: false,
    ...(ok ? {} : {
      failureCount: failures.length,
      failures: failures.slice(0, 20),
    }),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildFirstRuntimeSliceCompletionReviewReport(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
