#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildIrisNonruntimeValidatorSuiteReport,
} from './codex-iris-nonruntime-validator-suite.mjs';

function writeScript(dir, name, body) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, body);
  return file;
}

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-nonruntime-suite-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function validScriptBody(extra = {}) {
  return [
    "console.log(JSON.stringify({",
    "  ok: true,",
    "  validator: 'self_validator',",
    "  priority1Status: 'BLOCKED',",
    "  runtimeImplemented: false,",
    "  datasetAuditRunnerImplemented: false,",
    "  productionReadinessClaimed: false,",
    "  productionGoPerformed: false,",
    `  ...${JSON.stringify(extra)}`,
    "}));",
  ].join('\n');
}

function validatorsFor(dir, scripts = ['a.mjs', 'b.mjs', 'c.mjs', 'd.mjs', 'e.mjs']) {
  return scripts.map((script, index) => ({
    id: `self_validator_${index}`,
    command: path.join(dir, script),
    passText: 'self_validator',
  }));
}

function reportPasses(setup) {
  return withTempDir((dir) => {
    writeScript(dir, 'a.mjs', validScriptBody());
    writeScript(dir, 'b.mjs', validScriptBody());
    writeScript(dir, 'c.mjs', validScriptBody());
    writeScript(dir, 'd.mjs', validScriptBody());
    writeScript(dir, 'e.mjs', validScriptBody());
    setup?.(dir);
    return buildIrisNonruntimeValidatorSuiteReport({ validators: validatorsFor(dir) }).ok;
  });
}

function reportFails(setup, validatorsFactory = validatorsFor) {
  return withTempDir((dir) => {
    writeScript(dir, 'a.mjs', validScriptBody());
    writeScript(dir, 'b.mjs', validScriptBody());
    writeScript(dir, 'c.mjs', validScriptBody());
    writeScript(dir, 'd.mjs', validScriptBody());
    writeScript(dir, 'e.mjs', validScriptBody());
    setup?.(dir);
    return !buildIrisNonruntimeValidatorSuiteReport({ validators: validatorsFactory(dir) }).ok;
  });
}

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail' };
  } catch {
    return { name, status: 'fail' };
  }
}

const cases = [
  test('valid_all_validators_pass', () => reportPasses()),
  test('missing_validator_fails', () => reportFails((dir) => {
    fs.rmSync(path.join(dir, 'b.mjs'));
  })),
  test('validator_nonzero_exit_fails', () => reportFails((dir) => {
    writeScript(dir, 'b.mjs', 'process.exit(1);');
  })),
  test('validator_unparseable_output_fails', () => reportFails((dir) => {
    writeScript(dir, 'b.mjs', "console.log('unexpected output');");
  })),
  test('priority1_not_blocked_fails', () => {
    return reportFails((dir) => {
      writeScript(dir, 'b.mjs', validScriptBody({ priority1Status: 'RESOLVED' }));
    });
  }),
  test('runtime_implemented_true_fails', () => {
    return reportFails((dir) => {
      writeScript(dir, 'b.mjs', validScriptBody({ runtimeImplemented: true }));
    });
  }),
  test('dataset_audit_runner_true_fails', () => {
    return reportFails((dir) => {
      writeScript(dir, 'b.mjs', validScriptBody({ datasetAuditRunnerImplemented: true }));
    });
  }),
  test('production_readiness_claimed_true_fails', () => {
    return reportFails((dir) => {
      writeScript(dir, 'b.mjs', validScriptBody({ productionReadinessClaimed: true }));
    });
  }),
  test('production_go_true_fails', () => {
    return reportFails((dir) => {
      writeScript(dir, 'b.mjs', validScriptBody({ productionGoPerformed: true }));
    });
  }),
  test('real_repo_suite_passes', () => (
    process.env.CODEX_IRIS_NONRUNTIME_SUITE_SELF_TEST_SKIP_REAL === '1'
      ? true
      : buildIrisNonruntimeValidatorSuiteReport().ok
  )),
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

console.log('IRIS nonruntime validator suite self-test: pass');
