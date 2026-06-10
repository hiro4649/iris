#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.0.7
import { HARNESS_VERSION, marker, prBodyText, isPrContext, simpleStatus, writeJsonReport, exitFor } from './codex-v080-lib.mjs';

function requiresBestOfN(body) {
  return /\bRisk level:\s*R3\b/i.test(body) ||
    /\b(ambiguous design|migration|security-sensitive|large refactor|architecture tradeoff|security|R3)\b/i.test(body);
}

function hasEvidence(body) {
  const hasBestOfNSection = /(^|\n)\s*(?:#{1,6}\s*)?Best of N Evidence\s*:?\s*$/im.test(body) ||
    /(^|\n)\s*(?:#{1,6}\s*)?Best of N used or skipped\s*:?\s*$/im.test(body) ||
    /Best of N Evidence:/i.test(body);
  return /Best of N used or skipped:\s*skipped with reason/i.test(body) ||
    (hasBestOfNSection && /\bskipped\b/i.test(body) && /\breason\b/i.test(body)) ||
    (hasBestOfNSection &&
      /candidate count|candidates?:/i.test(body) &&
      /selected candidate/i.test(body) &&
      /reason selected/i.test(body));
}

function hasDeterministicBugfixSkipEvidence(body) {
  const text = String(body || '');
  return /\bTask mode:\s*bugfix\b/i.test(text) &&
    /\bRisk level:\s*R3\b/i.test(text) &&
    /\bProduct runtime changed:\s*no\b/i.test(text) &&
    /\bPackage or lockfile changed:\s*no\b/i.test(text) &&
    /\bWorkflow changed:\s*no\b/i.test(text) &&
    /(^|\n)\s*(?:#{1,6}\s*)?Bugfix reproduction\s*$/im.test(text) &&
    /(^|\n)\s*(?:#{1,6}\s*)?Bugfix root cause\s*$/im.test(text) &&
    /(^|\n)\s*(?:#{1,6}\s*)?Bugfix verification\s*$/im.test(text) &&
    /npm test(?: PASS x3| PASS three consecutive times| x3| three consecutive times)?/i.test(text) &&
    /target gate(?: PASS| command exited PASS)?/i.test(text);
}

function buildReport(env = process.env) {
  const body = prBodyText(env);
  if (!isPrContext(env) && !body.trim()) {
    return simpleStatus('bestOfNEvidenceStatus', 'not_applicable', { reasonCodes: ['non_pr_context'] });
  }
  const required = requiresBestOfN(body);
  if (!required) return simpleStatus('bestOfNEvidenceStatus', 'not_applicable', { reasonCodes: ['best_of_n_not_required'] });
  const explicitEvidence = hasEvidence(body);
  const deterministicSkip = hasDeterministicBugfixSkipEvidence(body);
  const status = explicitEvidence || deterministicSkip ? 'pass' : 'fail';
  return simpleStatus('bestOfNEvidenceStatus', status, {
    reasonCodes: status === 'pass' ? [] : ['best_of_n_required'],
    evidenceMode: explicitEvidence ? 'explicit_best_of_n' : deterministicSkip ? 'deterministic_bugfix_skip' : 'missing',
    skipReason: deterministicSkip ? 'deterministic_harness_bugfix_full_verification_no_runtime_change' : '',
    required,
  });
}

try {
  const report = buildReport();
  writeJsonReport(report, 'CODEX_BEST_OF_N_EVIDENCE_REPORT');
  exitFor(report);
} catch {
  const report = {
    marker,
    harnessVersion: HARNESS_VERSION,
    bestOfNEvidenceStatus: { status: 'fail', reasonCodes: ['unexpected_error'], safeSummaryOnly: true },
    valuesPrinted: false,
    status: 'fail',
  };
  writeJsonReport(report, 'CODEX_BEST_OF_N_EVIDENCE_REPORT');
  process.exit(1);
}
