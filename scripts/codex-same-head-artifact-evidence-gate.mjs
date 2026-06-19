#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.0.7
import { fileURLToPath } from 'node:url';
import { isPrContext, normalizePath, prBodyText, simpleStatus, writeJsonReport, exitFor } from './codex-v080-lib.mjs';

function parseInput(env = process.env) {
  if (env.CODEX_SAME_HEAD_EVIDENCE_JSON) {
    try { return JSON.parse(env.CODEX_SAME_HEAD_EVIDENCE_JSON); }
    catch { return { invalidInput: true }; }
  }
  const prContext = isPrContext(env);
  const explicitLocalHead = env.CODEX_LOCAL_HEAD_SHA || (prContext ? env.CODEX_PR_HEAD_SHA : '') || env.GITHUB_SHA || '';
  return {
    localHeadSha: explicitLocalHead,
    prHeadSha: env.CODEX_PR_HEAD_SHA || env.GITHUB_SHA || '',
    workflowHeadSha: env.CODEX_WORKFLOW_HEAD_SHA || env.CODEX_REMOTE_RUN_HEAD_SHA || env.GITHUB_SHA || env.CODEX_PR_HEAD_SHA || '',
    evidencePackHeadSha: env.CODEX_EVIDENCE_PACK_HEAD_SHA || env.CODEX_PR_HEAD_SHA || env.GITHUB_SHA || '',
    manualConfirmationHeadSha: env.CODEX_MANUAL_CONFIRMATION_HEAD_SHA || env.CODEX_PR_HEAD_SHA || env.GITHUB_SHA || '',
    remoteRunHeadSha: env.CODEX_REMOTE_RUN_HEAD_SHA || env.CODEX_PR_HEAD_SHA || env.GITHUB_SHA || '',
    artifactHeadSha: env.CODEX_ARTIFACT_HEAD_SHA || '',
    safeSummaryHeadSha: env.CODEX_SAFE_SUMMARY_HEAD_SHA || '',
    workflowRunId: env.CODEX_QUALITY_GATE_RUN_ID || env.GITHUB_RUN_ID || '',
    artifactName: env.CODEX_SAFE_ARTIFACT_NAME || 'codex-quality-gate-safe-artifacts',
    artifactPointer: env.CODEX_ARTIFACT_POINTER || (env.GITHUB_RUN_ID ? `github-actions://${env.GITHUB_REPOSITORY || env.CODEX_REPOSITORY || 'unknown'}/runs/${env.GITHUB_RUN_ID}/artifacts/${env.CODEX_SAFE_ARTIFACT_NAME || 'codex-quality-gate-safe-artifacts'}` : ''),
    artifactRequired: env.CODEX_ARTIFACT_REQUIRED === '1',
    mergeReady: env.CODEX_MERGE_READY === '1',
  };
}

export function buildSameHeadArtifactEvidenceReport(input = parseInput(), env = process.env) {
  const prContext = isPrContext(env) || Boolean(input.forcePrContext);
  if (!prContext && !input.forceCheck && !input.localHeadSha) {
    return simpleStatus('sameHeadArtifactEvidenceStatus', 'pass', { reasonCodes: ['same_head_not_required_for_local_non_pr'], sameHeadRequired: false });
  }
  const requiredLabels = ['localHeadSha', 'prHeadSha', 'workflowHeadSha', 'artifactHeadSha'];
  const optionalBoundLabels = ['evidencePackHeadSha', 'manualConfirmationHeadSha', 'remoteRunHeadSha'];
  const optionalObservedLabels = ['safeSummaryHeadSha'];
  const heads = [...requiredLabels, ...optionalBoundLabels, ...optionalObservedLabels].map((key) => [key, input[key]]).filter(([, value]) => value);
  const expected = input.prHeadSha || input.localHeadSha;
  const reasonCodes = [];
  if (input.invalidInput || !expected) reasonCodes.push('same_head_artifact_missing');
  for (const key of requiredLabels) {
    if (!input[key]) reasonCodes.push(`${key}_missing`);
  }
  const boundHeads = [...requiredLabels, ...optionalBoundLabels].map((key) => [key, input[key]]).filter(([, value]) => value);
  for (const [key, value] of boundHeads) {
    if (expected && value && value !== expected) reasonCodes.push(key === 'manualConfirmationHeadSha' ? 'manual_confirmation_stale_head' : 'same_head_artifact_mismatch');
  }
  if ((input.artifactRequired || prContext || input.forceCheck) && !input.artifactHeadSha) reasonCodes.push('same_head_artifact_missing');
  if (input.artifactHeadSha && expected && input.artifactHeadSha !== expected) reasonCodes.push('same_head_artifact_mismatch');
  if (input.sameHeadEvidencePending && input.mergeReady) reasonCodes.push('same_head_artifact_missing');
  const allRequiredHeadsPresent = requiredLabels.every((key) => Boolean(input[key]));
  const allRequiredHeadsMatch = allRequiredHeadsPresent && requiredLabels.every((key) => input[key] === expected);
  return simpleStatus('sameHeadArtifactEvidenceStatus', reasonCodes.length ? 'fail' : 'pass', {
    expectedHeadSha: expected || '',
    localHeadSha: input.localHeadSha || '',
    prHeadSha: input.prHeadSha || '',
    workflowHeadSha: input.workflowHeadSha || '',
    artifactHeadSha: input.artifactHeadSha || '',
    evidencePackHeadSha: input.evidencePackHeadSha || '',
    manualConfirmationHeadSha: input.manualConfirmationHeadSha || '',
    remoteRunHeadSha: input.remoteRunHeadSha || '',
    safeSummaryHeadSha: input.safeSummaryHeadSha || '',
    allRequiredHeadsPresent,
    allRequiredHeadsMatch,
    sameHead: allRequiredHeadsMatch,
    workflowRunId: input.workflowRunId || '',
    artifactName: input.artifactName || '',
    artifactPointer: input.artifactPointer || '',
    requiredHeads: requiredLabels,
    observedHeads: heads.map(([key]) => key),
    reasonCodes: [...new Set(reasonCodes)],
    sameHeadRequired: true,
    safeSummaryOnly: true,
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = buildSameHeadArtifactEvidenceReport();
  writeJsonReport(report, 'CODEX_SAME_HEAD_ARTIFACT_EVIDENCE_REPORT');
  exitFor(report);
}
