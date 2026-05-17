#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.4.0
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync, spawnSync } from 'node:child_process';

const policyPath = path.join('docs', 'process', 'CODEX_QUALITY_GATE_POLICY.json');
const knownRiskPath = path.join('docs', 'process', 'CODEX_KNOWN_RISKS.json');
const defaultPolicy = {
  profile: 'generic',
  packageDirs: ['.'],
  missingScript: 'skip',
  allowedPaths: [],
  blockedPaths: [],
  highRiskPaths: [],
  diffScope: {
    outOfScope: 'fail',
    blocked: 'fail',
    highRisk: 'warn',
  },
  riskKeywords: {
    R3: ['auth', 'authorization', 'permission', 'persistence', 'secret', 'credential', 'execution'],
    R2: ['config', 'workflow', 'script', 'dependency'],
  },
  checks: [
    { name: 'npm test', type: 'npmScript', cwd: '.', script: 'test', envFlag: 'CODEX_RUN_NPM_TEST' },
    { name: 'npm build', type: 'npmScript', cwd: '.', script: 'build', envFlag: 'CODEX_RUN_NPM_BUILD' },
    { name: 'npm lint', type: 'npmScript', cwd: '.', script: 'lint', envFlag: 'CODEX_RUN_NPM_LINT' },
    { name: 'npm smoke', type: 'npmScript', cwd: '.', script: 'smoke', envFlag: 'CODEX_RUN_NPM_SMOKE' },
  ],
};

const levels = { R1: 1, R2: 2, R3: 3 };
const report = {
  marker: 'CODEX_QUALITY_HARNESS_FILE v0.4.0',
  profile: 'generic',
  status: 'running',
  riskLevel: 'R1',
  changedPaths: {
    count: 0,
    paths: [],
    outOfScope: [],
    blocked: [],
    highRisk: [],
  },
  secretScan: { status: 'not_run' },
  localGate: { status: 'running', checksRun: [] },
  profileRequiredChecks: { enabled: false, status: 'not_run', checks: [] },
  skippedChecks: [],
  warnings: [],
  mergeReady: false,
};
const failures = [];
let failOnNewWarnings = false;

function npmCliPath() {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}
function commandSpec(cmd, args) {
  if (cmd === 'node') return { command: process.execPath, args };
  if (cmd === 'npm') {
    const cli = npmCliPath();
    if (cli) return { command: process.execPath, args: [cli, ...args] };
  }
  return { command: cmd, args };
}
function spawn(cmd, args, options = {}) {
  const spec = commandSpec(cmd, args);
  return spawnSync(spec.command, spec.args, {
    cwd: options.cwd || '.',
    stdio: options.stdio || 'pipe',
    encoding: options.encoding || 'utf8',
    env: { ...process.env, ...(options.env || {}) },
  });
}
function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}
function redactOutput(text, env = {}) {
  let out = text || '';
  for (const value of Object.values(env)) {
    const raw = String(value || '');
    if (!raw) continue;
    out = out.split(raw).join('[redacted policy env]');
  }
  return out;
}
function printCommandOutput(result, env = {}) {
  if (result.stdout) process.stdout.write(redactOutput(result.stdout, env));
  if (result.stderr) process.stderr.write(redactOutput(result.stderr, env));
}
function readJsonFile(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}
function readPackage(dir) {
  const file = path.join(dir, 'package.json');
  if (!fs.existsSync(file)) return null;
  try {
    return readJsonFile(file);
  } catch (error) {
    addFailure('packageJson.parse', `Failed to parse ${file}: ${error.message}`);
    return null;
  }
}
function readPolicy() {
  if (!fs.existsSync(policyPath)) return defaultPolicy;
  try {
    const policy = readJsonFile(policyPath);
    return {
      ...defaultPolicy,
      ...policy,
      diffScope: { ...defaultPolicy.diffScope, ...(policy.diffScope || {}) },
      riskKeywords: { ...defaultPolicy.riskKeywords, ...(policy.riskKeywords || {}) },
      checks: Array.isArray(policy.checks) ? policy.checks : defaultPolicy.checks,
    };
  } catch (error) {
    addFailure('policy.parse', `Failed to parse ${policyPath}: ${error.message}`);
    return defaultPolicy;
  }
}
function readKnownRisks() {
  if (!fs.existsSync(knownRiskPath)) return [];
  try {
    const data = readJsonFile(knownRiskPath);
    const warnings = Array.isArray(data.warnings) ? data.warnings : [];
    return warnings.map((item) => (typeof item === 'string' ? { id: item } : item)).filter(Boolean);
  } catch (error) {
    addWarning({ id: 'knownRiskBaseline.parse', message: `Failed to parse ${knownRiskPath}: ${error.message}` });
    return [];
  }
}
function commandExists(cmd) {
  const result = spawn(cmd, ['--version'], { stdio: 'ignore' });
  return result.status === 0;
}
function envEnabled(name) {
  return Boolean(name) && process.env[name] === '1';
}
function normalizePath(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\.\//, '');
}
function normalizePackageDirs(policy) {
  const dirs = Array.isArray(policy.packageDirs) && policy.packageDirs.length ? policy.packageDirs : ['.'];
  return [...new Set(dirs.map((dir) => dir || '.'))];
}
function hasScript(packages, dir, script) {
  return Boolean(packages.get(dir)?.scripts?.[script]);
}
function shouldRunCheck(check) {
  if (check.defaultRequired === true) return true;
  if (check.profileRequired === true && envEnabled('CODEX_RUN_PROFILE_REQUIRED_CHECKS')) return true;
  if (check.ciRequired === true && envEnabled('CODEX_RUN_PROFILE_REQUIRED_CHECKS')) return true;
  if (envEnabled(check.envFlag)) return true;
  return false;
}
function checkNeedsNpm(check) {
  return check.type === 'npmScript' || check.command === 'npm';
}
function checkEnv(check) {
  if (!check.env) return {};
  if (typeof check.env !== 'object' || Array.isArray(check.env)) {
    addFailure('policy.env.invalid', `Policy env must be an object for check: ${check.name || check.script || check.command}`);
    return {};
  }
  const env = {};
  for (const [key, value] of Object.entries(check.env)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      addFailure('policy.env.invalidKey', `Policy env contains an invalid key for check: ${check.name || check.script || check.command}`);
      continue;
    }
    if (value === undefined || value === null) continue;
    env[key] = String(value);
  }
  return env;
}
function packageLockSet(packageDirs) {
  return new Set(
    packageDirs
      .map((dir) => path.join(dir || '.', 'package-lock.json'))
      .filter((file) => fs.existsSync(file))
      .map((file) => path.normalize(file)),
  );
}
function assertNoNewPackageLocks(before, packageDirs) {
  const after = packageLockSet(packageDirs);
  const created = [...after].filter((file) => !before.has(file));
  if (created.length) {
    addFailure('packageLock.created', `package-lock.json was created during quality gate: ${created.map(normalizePath).join(', ')}`);
  }
}
function addFailure(id, message, extra = {}) {
  failures.push({ id, message, ...extra });
}
function warningKnown(warning, knownRisks) {
  return knownRisks.some((risk) => {
    if (!risk || risk.id !== warning.id) return false;
    if (risk.path && normalizePath(risk.path) !== normalizePath(warning.path)) return false;
    return true;
  });
}
function addWarning(warning) {
  report.warnings.push({
    id: warning.id,
    level: warning.level || 'warning',
    path: warning.path ? normalizePath(warning.path) : undefined,
    message: warning.message,
    known: Boolean(warning.known),
  });
}
function globToRegExp(pattern) {
  let out = '^';
  const text = normalizePath(pattern);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '*' && next === '*') {
      out += '.*';
      i++;
    } else if (ch === '*') {
      out += '[^/]*';
    } else {
      out += ch.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }
  return new RegExp(`${out}$`);
}
function pathMatches(file, patterns) {
  const f = normalizePath(file);
  return (patterns || []).some((pattern) => {
    const p = normalizePath(pattern);
    if (!p) return false;
    if (p.includes('*')) return globToRegExp(p).test(f);
    if (p.endsWith('/')) return f.startsWith(p);
    return f === p || f.startsWith(`${p}/`);
  });
}
function changedPathList() {
  const paths = new Set();
  for (const args of [
    ['diff', '--name-only'],
    ['diff', '--cached', '--name-only'],
    ['ls-files', '--others', '--exclude-standard'],
  ]) {
    for (const line of git(args).split(/\r?\n/)) {
      const p = normalizePath(line.trim());
      if (p) paths.add(p);
    }
  }
  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef) {
    for (const base of [`origin/${baseRef}`, baseRef]) {
      const out = git(['diff', '--name-only', `${base}...HEAD`]);
      for (const line of out.split(/\r?\n/)) {
        const p = normalizePath(line.trim());
        if (p) paths.add(p);
      }
      if (out.trim()) break;
    }
  }
  return [...paths].sort();
}
function bumpRisk(level) {
  if ((levels[level] || 0) > (levels[report.riskLevel] || 0)) report.riskLevel = level;
}
function classifyDiff(policy, knownRisks) {
  const changed = changedPathList();
  const allowed = policy.allowedPaths || policy.diffScope?.allowedPaths || [];
  const blocked = policy.blockedPaths || policy.diffScope?.blockedPaths || [];
  const highRisk = policy.highRiskPaths || policy.diffScope?.highRiskPaths || [];
  report.changedPaths.paths = changed;
  report.changedPaths.count = changed.length;
  if (changed.length) bumpRisk('R2');

  for (const file of changed) {
    if (allowed.length && !pathMatches(file, allowed)) {
      report.changedPaths.outOfScope.push(file);
      const action = policy.diffScope?.outOfScope || 'fail';
      const item = { id: 'diff.outOfScope', path: file, message: `Changed path is outside allowedPaths: ${file}` };
      if (action === 'fail') addFailure(item.id, item.message, { path: file });
      else addWarning({ ...item, known: warningKnown(item, knownRisks) });
    }
    if (pathMatches(file, blocked)) {
      report.changedPaths.blocked.push(file);
      bumpRisk('R3');
      const action = policy.diffScope?.blocked || 'fail';
      const item = { id: 'diff.blockedPath', path: file, message: `Changed path matches blockedPaths: ${file}` };
      if (action === 'fail') addFailure(item.id, item.message, { path: file });
      else addWarning({ ...item, known: warningKnown(item, knownRisks) });
    }
    if (pathMatches(file, highRisk)) {
      report.changedPaths.highRisk.push(file);
      bumpRisk('R3');
      const action = policy.diffScope?.highRisk || 'warn';
      const item = { id: 'diff.highRiskPath', path: file, message: `Changed path matches highRiskPaths: ${file}` };
      if (action === 'fail') addFailure(item.id, item.message, { path: file });
      else addWarning({ ...item, known: warningKnown(item, knownRisks) });
    }
  }

  for (const [level, terms] of Object.entries(policy.riskKeywords || {})) {
    if (!levels[level] || !Array.isArray(terms)) continue;
    for (const file of changed) {
      const lower = file.toLowerCase();
      if (terms.some((term) => term && lower.includes(String(term).toLowerCase()))) {
        bumpRisk(level);
      }
    }
  }

  const behavior = policy.riskLevelBehavior || {};
  if (behavior[report.riskLevel] === 'fail') {
    addFailure(`risk.${report.riskLevel}`, `Risk level ${report.riskLevel} is configured to fail.`);
  }
}
function runSecretScan() {
  console.log('== .: node scripts/codex-secret-safety-scan.mjs ==');
  const result = spawn('node', ['scripts/codex-secret-safety-scan.mjs']);
  printCommandOutput(result);
  report.secretScan = {
    status: result.status === 0 ? 'pass' : 'fail',
    exitCode: result.status ?? 1,
  };
  if (result.status !== 0) addFailure('secretScan.failed', 'Secret safety scan failed.');
}
function skipCheck(check, reason) {
  const item = { name: check.name || check.script || check.command || 'unnamed check', reason };
  report.skippedChecks.push(item);
  return item;
}
function runCheck(check, packages, policy) {
  const cwd = check.cwd || '.';
  const missingMode = check.missingScript || policy.missingScript || 'skip';
  const env = checkEnv(check);
  const name = check.name || check.script || check.command || 'unnamed check';
  const profileCheck = check.profileRequired === true || check.ciRequired === true;
  if (profileCheck) report.profileRequiredChecks.checks.push({ name, status: 'running' });

  if (check.type === 'npmScript') {
    if (!packages.has(cwd)) {
      if (missingMode === 'fail') {
        addFailure('check.packageMissing', `Required package.json missing for check: ${name}`, { check: name });
        if (profileCheck && report.profileRequiredChecks.checks.length) report.profileRequiredChecks.checks.at(-1).status = 'fail';
        return false;
      }
      console.log(`skip missing package.json: ${name}`);
      skipCheck(check, 'missing package.json');
      if (profileCheck) report.profileRequiredChecks.checks.at(-1).status = 'skipped';
      return true;
    }
    if (!hasScript(packages, cwd, check.script)) {
      if (missingMode === 'fail') {
        addFailure('check.scriptMissing', `Required npm script missing: ${cwd} ${check.script}`, { check: name });
        if (profileCheck && report.profileRequiredChecks.checks.length) report.profileRequiredChecks.checks.at(-1).status = 'fail';
        return false;
      }
      console.log(`skip missing npm script: ${cwd} ${check.script}`);
      skipCheck(check, 'missing npm script');
      if (profileCheck) report.profileRequiredChecks.checks.at(-1).status = 'skipped';
      return true;
    }
    return runExternal('npm', ['run', check.script], cwd, name, env, profileCheck);
  }
  if (check.command) return runExternal(check.command, check.args || [], cwd, name, env, profileCheck);
  skipCheck(check, 'no command configured');
  if (profileCheck) report.profileRequiredChecks.checks.at(-1).status = 'skipped';
  return true;
}
function runExternal(cmd, args, cwd, name, env, profileCheck) {
  const envKeys = Object.keys(env).sort();
  console.log(`== ${cwd}: ${name || [cmd, ...args].join(' ')} ==`);
  if (envKeys.length) console.log(`Policy env: ${envKeys.join(', ')}`);
  const result = spawn(cmd, args, { cwd, env });
  printCommandOutput(result, env);
  const checkResult = {
    name,
    cwd: normalizePath(cwd),
    status: result.status === 0 ? 'pass' : 'fail',
    exitCode: result.status ?? 1,
    envKeys,
  };
  report.localGate.checksRun.push(checkResult);
  if (profileCheck && report.profileRequiredChecks.checks.length) {
    report.profileRequiredChecks.checks.at(-1).status = checkResult.status;
    report.profileRequiredChecks.checks.at(-1).exitCode = checkResult.exitCode;
  }
  if (result.status !== 0) {
    addFailure('check.failed', `Check failed: ${name}`, { check: name });
    return false;
  }
  return true;
}
function writeReport() {
  report.mergeReady = failures.length === 0;
  report.status = failures.length === 0 ? 'pass' : 'fail';
  report.localGate.status = report.status;
  const profileFailures = report.profileRequiredChecks.checks.filter((check) => check.status === 'fail');
  if (!report.profileRequiredChecks.enabled) report.profileRequiredChecks.status = 'not_run';
  else report.profileRequiredChecks.status = profileFailures.length ? 'fail' : 'pass';
  const out = JSON.stringify(report, null, 2);
  const target = process.env.CODEX_QUALITY_REPORT_PATH || process.env.CODEX_LOCAL_QUALITY_REPORT_PATH || '';
  if (target) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${out}\n`, 'utf8');
  }
  if (process.env.CODEX_QUALITY_REPORT === 'json') console.log(out);
}
function finish() {
  const unknownWarnings = report.warnings.filter((warning) => !warning.known);
  if (unknownWarnings.length && (process.env.CODEX_FAIL_ON_NEW_WARNINGS === '1' || failOnNewWarnings)) {
    addFailure('warnings.new', 'New warnings were detected.');
  }
  writeReport();
  if (failures.length) {
    console.error('Codex local quality gate failed. Safe summary:');
    for (const failure of failures) console.error(`- ${failure.id}: ${failure.message}`);
    process.exit(1);
  }
  console.log('Codex local quality gate passed.');
  process.exit(0);
}

console.log('== Codex local quality gate ==');
const policy = readPolicy();
failOnNewWarnings = policy.failOnNewWarnings === true;
report.profile = policy.profile || 'generic';
const knownRisks = readKnownRisks();
classifyDiff(policy, knownRisks);
for (const warning of report.warnings) {
  if (!warning.known) warning.known = warningKnown(warning, knownRisks);
}
runSecretScan();
if (failures.length) finish();

const packageDirs = normalizePackageDirs(policy);
const packages = new Map();
for (const dir of packageDirs) {
  const pkg = readPackage(dir);
  if (pkg) packages.set(dir, pkg);
}

console.log(`Policy profile: ${policy.profile || 'generic'}`);
console.log(`Package directories found: ${packages.size}`);

if (process.env.CODEX_SKIP_NPM_CHECKS === '1' || process.env.CODEX_SKIP_NPM === '1') {
  for (const check of Array.isArray(policy.checks) ? policy.checks : []) skipCheck(check, 'npm checks skipped by environment flag');
  console.log('npm checks skipped by environment flag.');
  finish();
}

const checks = Array.isArray(policy.checks) ? policy.checks : [];
const selectedChecks = checks.filter(shouldRunCheck);
report.profileRequiredChecks.enabled = selectedChecks.some((check) => check.profileRequired === true || check.ciRequired === true);
const needsNpm = selectedChecks.some(checkNeedsNpm) || (packages.size > 0 && process.env.CODEX_REQUIRE_NPM === '1');
const packageLocksBefore = packageLockSet(packageDirs);

if (!packages.size) {
  for (const check of checks) skipCheck(check, 'no package.json found in policy packageDirs');
  console.log('No package.json found in policy packageDirs; npm checks skipped.');
  finish();
}

const npmAvailable = commandExists('npm');
console.log(`npm available: ${npmAvailable ? 'yes' : 'no'}`);
if (needsNpm && !npmAvailable) {
  addFailure('npm.unavailable', 'npm was required by policy or environment, but npm was not found.');
  finish();
}
if (!npmAvailable) {
  for (const check of checks) skipCheck(check, 'npm unavailable and not required');
  console.log('npm checks skipped because npm is unavailable and no npm check was required.');
  finish();
}

if (!selectedChecks.length) {
  for (const check of checks) skipCheck(check, 'not selected by policy or environment flags');
  console.log('No npm checks selected. Use CODEX_RUN_* flags or CODEX_RUN_PROFILE_REQUIRED_CHECKS=1 to enable policy checks.');
  finish();
}

for (const check of selectedChecks) {
  if (!runCheck(check, packages, policy)) break;
}
assertNoNewPackageLocks(packageLocksBefore, packageDirs);
finish();
