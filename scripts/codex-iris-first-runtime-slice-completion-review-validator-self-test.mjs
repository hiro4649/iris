#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.6

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildFirstRuntimeSliceCompletionReviewReport } from './codex-iris-first-runtime-slice-completion-review-validator.mjs';

const REAL_DOC = 'docs/specs/IRIS_20240425/IRIS_FIRST_RUNTIME_VERTICAL_SLICE_COMPLETION_REVIEW.md';

function readRealDoc() {
  return fs.readFileSync(REAL_DOC, 'utf8');
}

function withDoc(text, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-first-slice-review-'));
  const file = path.join(dir, 'review.md');
  try {
    fs.writeFileSync(file, text);
    return fn(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function passes(text) {
  return withDoc(text, (file) => buildFirstRuntimeSliceCompletionReviewReport({ doc: file }).ok);
}

function fails(text) {
  return !passes(text);
}

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail' };
  } catch {
    return { name, status: 'fail' };
  }
}

const base = readRealDoc();
const cases = [
  test('real_completion_review_passes', () => buildFirstRuntimeSliceCompletionReviewReport().ok),
  test('missing_runtime_complete_fails', () => fails(base.replace('Runtime slice implementation: complete', 'Runtime slice implementation: missing'))),
  test('missing_regression_registration_fails', () => fails(base.replace('Regression self-test registration: complete', 'Regression self-test registration: missing'))),
  test('runtime_readiness_claim_fails', () => fails(base.replace('Runtime readiness: not claimed', 'Runtime readiness: claimed'))),
  test('production_readiness_claim_fails', () => fails(base.replace('Production readiness: not claimed', 'Production readiness: claimed'))),
  test('production_go_performed_fails', () => fails(base.replace('Production go: not performed', 'Production go: performed'))),
  test('priority1_resolved_fails', () => fails(base.replace('priority1: BLOCKED', 'priority1: RESOLVED'))),
  test('real_youtube_confirmed_fails', () => fails(base.replace('Real YouTube evidence: not confirmed', 'Real YouTube evidence: confirmed'))),
  test('real_obs_confirmed_fails', () => fails(base.replace('Real OBS pickup evidence: not confirmed', 'Real OBS pickup evidence: confirmed'))),
  test('real_tts_confirmed_fails', () => fails(base.replace('Real TTS evidence: not confirmed', 'Real TTS evidence: confirmed'))),
  test('real_live2d_confirmed_fails', () => fails(base.replace('Real Live2D evidence: not confirmed', 'Real Live2D evidence: confirmed'))),
  test('real_database_confirmed_fails', () => fails(base.replace('Real database evidence: not confirmed', 'Real database evidence: confirmed'))),
  test('real_game_confirmed_fails', () => fails(base.replace('Real Game evidence: not confirmed', 'Real Game evidence: confirmed'))),
  test('missing_pr227_head_fails', () => fails(base.replace('PR #227 head: `bba84a6f30f9c12c3622921430ff170a2922dd46`', 'PR #227 head: `missing`'))),
  test('missing_test_count_fails', () => fails(base.replace('standard test count: 471', 'standard test count: unknown'))),
];

const failures = cases.filter((item) => item.status !== 'pass');
if (failures.length) {
  console.log(JSON.stringify({
    ok: false,
    validatorSelfTestStatus: 'fail',
    failureCount: failures.length,
    failures: failures.slice(0, 20).map((item) => ({ name: item.name })),
    rawLogsRead: false,
    rawDiffRead: false,
    priority1Status: 'BLOCKED',
  }, null, 2));
  process.exit(1);
}

console.log('IRIS first runtime slice completion review validator self-test: pass');
