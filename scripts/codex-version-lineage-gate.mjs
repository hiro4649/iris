#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.1.3
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HARNESS_VERSION, marker, readJson, scanObjectForUnsafe, simpleStatus, writeJsonReport, exitFor, normalizePath } from './codex-v080-lib.mjs';

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  } catch {
    return '';
  }
}

function firstMarkerVersion(file) {
  const match = readText(file).match(/CODEX_QUALITY_HARNESS_FILE v([0-9]+\.[0-9]+\.[0-9]+)/);
  return match ? match[1] : '';
}

function listRepoFiles(dir = '.') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', 'build'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const normalized = normalizePath(full);
    if (normalized.startsWith('profiles/')) continue;
    if (entry.isDirectory()) out.push(...listRepoFiles(full));
    else out.push(normalized);
  }
  return out;
}

function manifestPath(env = process.env) {
  if (env.CODEX_HARNESS_MODE === 'target' && fs.existsSync('docs/process/CODEX_HARNESS_MANIFEST.json')) {
    return 'docs/process/CODEX_HARNESS_MANIFEST.json';
  }
  if (fs.existsSync('CODEX_SOURCE_HARNESS_MANIFEST.json')) return 'CODEX_SOURCE_HARNESS_MANIFEST.json';
  return 'docs/process/CODEX_HARNESS_MANIFEST.json';
}

function requiredPaths(env = process.env) {
  const target = env.CODEX_HARNESS_MODE === 'target' && fs.existsSync('docs/process/CODEX_HARNESS_MANIFEST.json');
  const manifest = manifestPath(env);
  return [
    ...(target ? ['docs/process/CODEX_HARNESS_MANIFEST.json', 'AGENTS.md'] : ['README.md', manifest]),
    'docs/process/CODEX_KNOWLEDGE_MAP.json',
    'scripts/codex-v080-lib.mjs',
    'scripts/codex-local-quality-gate.mjs',
    'scripts/codex-v092-self-test.mjs',
    'scripts/codex-v093-self-test.mjs',
    'scripts/codex-v094-self-test.mjs',
    'scripts/codex-v095-self-test.mjs',
  ];
}

function selfTestPresent(version, manifest = {}) {
  const name = `codex-${version}-self-test.mjs`;
  const file = `scripts/${name}`;
  const scriptNames = Array.isArray(manifest.scriptNames) ? manifest.scriptNames : [];
  const scripts = Array.isArray(manifest.scripts) ? manifest.scripts : [];
  const legacy = manifest.legacySelfTests && typeof manifest.legacySelfTests === 'object'
    ? Object.keys(manifest.legacySelfTests)
    : [];
  return fs.existsSync(file) ||
    scriptNames.includes(name) ||
    scripts.includes(file) ||
    legacy.includes(version);
}

function shouldRequireReadmeVersion(env = process.env) {
  return env.CODEX_VERSION_LINEAGE_REQUIRE_README_VERSION === '1';
}

function shouldCheckMarker(file) {
  const normalized = normalizePath(file);
  if (/scripts\/codex-v0(?:9[2-5])?-self-test\.mjs$/.test(normalized)) return false;
  if (normalized.startsWith('.github/workflows/')) return false;
  if (normalized === 'README.md') return false;
  return true;
}

export function buildVersionLineageReport(env = process.env) {
  const failures = [];
  const warnings = [];
  const paths = requiredPaths(env);
  const manifestFile = manifestPath(env);
  const manifestJson = readJson(manifestFile);

  if (!manifestJson.ok) failures.push('version_lineage_manifest_missing');
  else {
    const manifest = manifestJson.value;
    if (manifest.marker !== marker) failures.push('active_marker_version_mismatch');
    if (manifest.harnessVersion !== HARNESS_VERSION) failures.push('version_lineage_failed');
    if (manifest.sourceHarnessVersion && manifest.sourceHarnessVersion !== HARNESS_VERSION) failures.push('version_lineage_failed');
    if (!selfTestPresent('v092', manifest)) failures.push('version_lineage_v092_self_test_missing');
    if (!selfTestPresent('v093', manifest)) failures.push('version_lineage_v093_self_test_missing');
    if (!selfTestPresent('v094', manifest)) failures.push('version_lineage_v094_self_test_missing');
    if (!selfTestPresent('v095', manifest)) failures.push('version_lineage_v095_self_test_missing');
  }

  const missing = paths.filter((file) => !fs.existsSync(file));
  for (const file of missing) failures.push(`missing:${file}`);

  const readme = readText('README.md');
  if (shouldRequireReadmeVersion(env) && fs.existsSync('README.md') && !readme.includes(`Version: v${HARNESS_VERSION}`)) {
    failures.push('version_lineage_readme_mismatch');
  } else if (fs.existsSync('README.md') && !readme.includes(`Version: v${HARNESS_VERSION}`)) {
    warnings.push('version_lineage_readme_unversioned');
  }

  const localGate = readText('scripts/codex-local-quality-gate.mjs');
  const lib = readText('scripts/codex-v080-lib.mjs');
  if (!localGate.includes(`HARNESS_VERSION = '${HARNESS_VERSION}'`)) failures.push('version_lineage_local_gate_mismatch');
  if (!lib.includes(`HARNESS_VERSION = '${HARNESS_VERSION}'`)) failures.push('version_lineage_lib_mismatch');

  for (const file of paths.filter((item) => fs.existsSync(item) && shouldCheckMarker(item))) {
    const version = firstMarkerVersion(file);
    if (version && version !== HARNESS_VERSION) failures.push(`active_marker_version_mismatch:${file}`);
  }

  const status = failures.length ? 'fail' : 'pass';
  const report = simpleStatus('versionLineageStatus', status, {
    reasonCodes: [...new Set(failures.map((item) => item.split(':')[0]))],
    warnings,
    checkedFiles: paths.length,
  });
  if (scanObjectForUnsafe(report).length) return simpleStatus('versionLineageStatus', 'fail', { reasonCodes: ['version_lineage_failed'] });
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = buildVersionLineageReport();
  writeJsonReport(report, 'CODEX_VERSION_LINEAGE_REPORT');
  exitFor(report);
}
