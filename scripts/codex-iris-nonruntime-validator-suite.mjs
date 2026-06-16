#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.5

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VALIDATOR = 'iris_nonruntime_validator_suite';
const DEFAULT_VALIDATORS = [
  {
    id: 'community_world_fixture_validator',
    command: 'scripts/codex-community-world-fixture-validator.mjs',
    passText: 'community_world_fixture_validator',
  },
  {
    id: 'community_world_audit_mapping_validator',
    command: 'scripts/codex-community-world-audit-mapping-validator.mjs',
    passText: 'community_world_audit_mapping_validator',
  },
  {
    id: 'community_world_gate_validator',
    command: 'scripts/codex-community-world-gate-validator.mjs',
    passText: 'community_world_gate_validator',
  },
  {
    id: 'community_world_completion_review_validator',
    command: 'scripts/codex-community-world-completion-review-validator.mjs',
    passText: 'community_world_completion_review_validator',
  },
  {
    id: 'iris_external_character_boundary_validator',
    command: 'scripts/codex-iris-external-character-boundary-validator.mjs',
    passText: 'iris_external_character_boundary_validator',
  },
  {
    id: 'iris_external_module_safe_summary_validator',
    command: 'scripts/codex-iris-external-module-safe-summary-validator.mjs',
    passText: 'iris_external_module_safe_summary_validator',
  },
  {
    id: 'iris_external_module_audit_mapping_validator',
    command: 'scripts/codex-iris-external-module-audit-mapping-validator.mjs',
    passText: 'iris_external_module_audit_mapping_validator',
  },
];

function parseJsonFromOutput(stdout) {
  const text = String(stdout || '').trim();
  if (!text.startsWith('{')) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function safeResultFromChild(spec, result) {
  const parsed = parseJsonFromOutput(result.stdout);
  if (result.status !== 0) {
    return {
      validator: spec.id,
      status: 'fail',
      reason_code: 'VALIDATOR_EXIT_NONZERO',
      childExitCode: result.status,
    };
  }
  if (parsed && parsed.ok === true) {
    const childSafetyFailures = staticSafetyFailures({
      priority1Status: parsed.priority1Status ?? 'BLOCKED',
      runtimeImplemented: parsed.runtimeImplemented ?? false,
      datasetAuditRunnerImplemented: parsed.datasetAuditRunnerImplemented ?? false,
      realDatasetProcessing: parsed.realDatasetProcessing ?? false,
      minecraftRuntimeImplemented: parsed.minecraftRuntimeImplemented ?? false,
      minecraftPluginImplemented: parsed.minecraftPluginImplemented ?? false,
      voxweaveImplementation: parsed.voxweaveImplementation ?? false,
      live2dImplementation: parsed.live2dImplementation ?? false,
      criptoTipImplementation: parsed.criptoTipImplementation ?? false,
      productionReadinessClaimed: parsed.productionReadinessClaimed ?? false,
      productionGoPerformed: parsed.productionGoPerformed ?? false,
    });
    if (childSafetyFailures.length) {
      return {
        validator: spec.id,
        status: 'fail',
        reason_code: childSafetyFailures[0].reason_code,
      };
    }
    return {
      validator: spec.id,
      status: 'pass',
      reason_code: 'VALIDATOR_PASS',
    };
  }
  if (String(result.stdout || '').includes(spec.passText)) {
    return {
      validator: spec.id,
      status: 'pass',
      reason_code: 'VALIDATOR_PASS_TEXT',
    };
  }
  return {
    validator: spec.id,
    status: 'fail',
    reason_code: 'UNPARSEABLE_SAFE_OUTPUT',
  };
}

function staticSafetyFailures(report) {
  const failures = [];
  if (report.priority1Status !== 'BLOCKED') failures.push({ validator: VALIDATOR, reason_code: 'PRIORITY1_NOT_BLOCKED' });
  if (report.runtimeImplemented !== false) failures.push({ validator: VALIDATOR, reason_code: 'RUNTIME_IMPLEMENTED' });
  if (report.datasetAuditRunnerImplemented !== false) failures.push({ validator: VALIDATOR, reason_code: 'DATASET_AUDIT_RUNNER_IMPLEMENTED' });
  if (report.realDatasetProcessing !== false) failures.push({ validator: VALIDATOR, reason_code: 'REAL_DATASET_PROCESSING' });
  if (report.minecraftRuntimeImplemented !== false) failures.push({ validator: VALIDATOR, reason_code: 'MINECRAFT_RUNTIME_IMPLEMENTED' });
  if (report.minecraftPluginImplemented !== false) failures.push({ validator: VALIDATOR, reason_code: 'MINECRAFT_PLUGIN_IMPLEMENTED' });
  if (report.voxweaveImplementation !== false) failures.push({ validator: VALIDATOR, reason_code: 'VOXWEAVE_IMPLEMENTED' });
  if (report.live2dImplementation !== false) failures.push({ validator: VALIDATOR, reason_code: 'LIVE2D_IMPLEMENTED' });
  if (report.criptoTipImplementation !== false) failures.push({ validator: VALIDATOR, reason_code: 'CRIPTO_TIP_IMPLEMENTED' });
  if (report.productionReadinessClaimed !== false) failures.push({ validator: VALIDATOR, reason_code: 'PRODUCTION_READINESS_CLAIMED' });
  if (report.productionGoPerformed !== false) failures.push({ validator: VALIDATOR, reason_code: 'PRODUCTION_GO_PERFORMED' });
  return failures;
}

export function buildIrisNonruntimeValidatorSuiteReport(options = {}) {
  const validators = options.validators || DEFAULT_VALIDATORS;
  const results = [];
  const failures = [];

  for (const spec of validators) {
    if (!fs.existsSync(spec.command)) {
      failures.push({ validator: spec.id, reason_code: 'MISSING_VALIDATOR' });
      results.push({ validator: spec.id, status: 'missing' });
      continue;
    }
    const result = spawnSync(process.execPath, [spec.command], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: options.timeoutMs || 120000,
    });
    const safeResult = safeResultFromChild(spec, result);
    results.push(safeResult);
    if (safeResult.status !== 'pass') failures.push({
      validator: spec.id,
      reason_code: safeResult.reason_code,
    });
  }

  const baseReport = {
    ok: failures.length === 0,
    validator: VALIDATOR,
    validatorsChecked: validators.length,
    validatorsPassed: results.filter((item) => item.status === 'pass').length,
    validatorsFailed: failures.length,
    suiteStatus: failures.length ? 'fail' : 'pass',
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
  };
  const safetyFailures = staticSafetyFailures(baseReport);
  const allFailures = [...failures, ...safetyFailures];
  if (allFailures.length) {
    return {
      ...baseReport,
      ok: false,
      validatorsFailed: allFailures.length,
      suiteStatus: 'fail',
      failures: allFailures.slice(0, 20),
      rawLogsRead: false,
      rawDiffRead: false,
      priority1Status: 'BLOCKED',
    };
  }
  return baseReport;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--timeout-ms') {
      options.timeoutMs = Number(argv[index + 1]);
      index += 1;
    }
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildIrisNonruntimeValidatorSuiteReport(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
