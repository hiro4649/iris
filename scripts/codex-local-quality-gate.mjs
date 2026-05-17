#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.3.1
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const policyPath = path.join('docs', 'process', 'CODEX_QUALITY_GATE_POLICY.json');
const defaultPolicy = {
  profile: 'generic',
  packageDirs: ['.'],
  missingScript: 'skip',
  checks: [
    { name: 'npm test', type: 'npmScript', cwd: '.', script: 'test', envFlag: 'CODEX_RUN_NPM_TEST' },
    { name: 'npm build', type: 'npmScript', cwd: '.', script: 'build', envFlag: 'CODEX_RUN_NPM_BUILD' },
    { name: 'npm lint', type: 'npmScript', cwd: '.', script: 'lint', envFlag: 'CODEX_RUN_NPM_LINT' },
    { name: 'npm smoke', type: 'npmScript', cwd: '.', script: 'smoke', envFlag: 'CODEX_RUN_NPM_SMOKE' },
  ],
};

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
function redactOutput(text, env = {}) {
  let out = text || '';
  for (const value of Object.values(env)) {
    const raw = String(value || '');
    if (!raw) continue;
    out = out.split(raw).join('[redacted policy env]');
  }
  return out;
}
function run(cmd, args, cwd = '.', name = null, env = {}) {
  const envKeys = Object.keys(env).sort();
  console.log(`== ${cwd}: ${name || [cmd, ...args].join(' ')} ==`);
  if (envKeys.length) console.log(`Policy env: ${envKeys.join(', ')}`);
  const result = spawn(cmd, args, { cwd, env });
  if (result.stdout) process.stdout.write(redactOutput(result.stdout, env));
  if (result.stderr) process.stderr.write(redactOutput(result.stderr, env));
  if (result.status !== 0) process.exit(result.status ?? 1);
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
    console.error(`Failed to parse ${file}: ${error.message}`);
    process.exit(1);
  }
}
function readPolicy() {
  if (!fs.existsSync(policyPath)) return defaultPolicy;
  try {
    return { ...defaultPolicy, ...readJsonFile(policyPath) };
  } catch (error) {
    console.error(`Failed to parse ${policyPath}: ${error.message}`);
    process.exit(1);
  }
}
function commandExists(cmd) {
  const result = spawn(cmd, ['--version'], { stdio: 'ignore' });
  return result.status === 0;
}
function envEnabled(name) {
  return Boolean(name) && process.env[name] === '1';
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
    console.error(`Policy env must be an object for check: ${check.name || check.script || check.command}`);
    process.exit(1);
  }
  const env = {};
  for (const [key, value] of Object.entries(check.env)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      console.error(`Policy env contains an invalid key for check: ${check.name || check.script || check.command}`);
      process.exit(1);
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
    console.error(`package-lock.json was created during quality gate: ${created.join(', ')}`);
    process.exit(1);
  }
}
function runCheck(check, packages, policy) {
  const cwd = check.cwd || '.';
  const missingMode = check.missingScript || policy.missingScript || 'skip';
  const env = checkEnv(check);
  if (check.type === 'npmScript') {
    if (!packages.has(cwd)) {
      if (missingMode === 'fail') {
        console.error(`Required package.json missing for check: ${check.name || check.script}`);
        process.exit(1);
      }
      console.log(`skip missing package.json: ${check.name || check.script}`);
      return;
    }
    if (!hasScript(packages, cwd, check.script)) {
      if (missingMode === 'fail') {
        console.error(`Required npm script missing: ${cwd} ${check.script}`);
        process.exit(1);
      }
      console.log(`skip missing npm script: ${cwd} ${check.script}`);
      return;
    }
    run('npm', ['run', check.script], cwd, check.name || `npm run ${check.script}`, env);
    return;
  }
  if (check.command) run(check.command, check.args || [], cwd, check.name || check.command, env);
}

console.log('== Codex local quality gate ==');
run('node', ['scripts/codex-secret-safety-scan.mjs']);

const policy = readPolicy();
const packageDirs = normalizePackageDirs(policy);
const packages = new Map();
for (const dir of packageDirs) {
  const pkg = readPackage(dir);
  if (pkg) packages.set(dir, pkg);
}

console.log(`Policy profile: ${policy.profile || 'generic'}`);
console.log(`Package directories found: ${packages.size}`);

if (process.env.CODEX_SKIP_NPM_CHECKS === '1' || process.env.CODEX_SKIP_NPM === '1') {
  console.log('npm checks skipped by environment flag.');
  console.log('Codex local quality gate passed.');
  process.exit(0);
}

const checks = Array.isArray(policy.checks) ? policy.checks : [];
const selectedChecks = checks.filter(shouldRunCheck);
const needsNpm = selectedChecks.some(checkNeedsNpm) || (packages.size > 0 && process.env.CODEX_REQUIRE_NPM === '1');
const packageLocksBefore = packageLockSet(packageDirs);

if (!packages.size) {
  console.log('No package.json found in policy packageDirs; npm checks skipped.');
  console.log('Codex local quality gate passed.');
  process.exit(0);
}

const npmAvailable = commandExists('npm');
console.log(`npm available: ${npmAvailable ? 'yes' : 'no'}`);
if (needsNpm && !npmAvailable) {
  console.error('npm was required by policy or environment, but npm was not found.');
  process.exit(1);
}
if (!npmAvailable) {
  console.log('npm checks skipped because npm is unavailable and no npm check was required.');
  console.log('Codex local quality gate passed.');
  process.exit(0);
}

if (!selectedChecks.length) {
  console.log('No npm checks selected. Use CODEX_RUN_* flags or CODEX_RUN_PROFILE_REQUIRED_CHECKS=1 to enable policy checks.');
  console.log('Codex local quality gate passed.');
  process.exit(0);
}

for (const check of selectedChecks) runCheck(check, packages, policy);
assertNoNewPackageLocks(packageLocksBefore, packageDirs);
console.log('Codex local quality gate passed.');
