import { ContractError } from "../../core/contracts.js";

const PRODUCTION_RUNBOOK_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "step_count",
  "steps",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_RUNBOOK_SAFE_STEP_FIELDS = new Set([
  "step_label",
  "script_name",
  "status",
]);
const PRODUCTION_RUNBOOK_BLOCKER_MAPPING_FIELDS = new Set([
  "schema",
  "blocker_label",
  "step_label",
  "script_name",
  "status",
  "operation_executed",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_RUNBOOK_E2E_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "mapping_count",
  "mappings",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_RUNBOOK_BLOCKER_LABELS = new Set([
  "worker_missing",
  "engine_attention",
  "obs_missing",
  "db_missing",
  "adapter_missing",
  "youtube_attention",
  "game_attention",
]);
const PRODUCTION_RUNBOOK_STEP_STATUSES = new Set([
  "pending",
  "ready",
  "attention",
  "BLOCKED",
  "done",
]);
const PRODUCTION_RUNBOOK_BOUNDARY_FIELDS = new Set([
  "safe_step_label_only",
  "safe_script_name_only",
  "safe_status_only",
  "shell_body_redacted",
  "endpoint_redacted",
  "token_redacted",
]);
const PRODUCTION_RUNBOOK_BLOCKER_MAPPING_BOUNDARY_FIELDS = new Set([
  "safe_blocker_label_only",
  "safe_step_label_only",
  "safe_script_name_only",
  "no_real_operation_executed",
  "shell_body_redacted",
  "endpoint_redacted",
  "token_redacted",
]);
const PRODUCTION_RUNBOOK_E2E_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "blocker_mapping_safe_only",
  "raw_path_redacted",
  "endpoint_redacted",
  "token_redacted",
  "command_redacted",
  "no_real_operation_executed",
]);
const UNSAFE_RUNBOOK_TEXT =
  /\b(shell|command|cmd|endpoint|token|secret|credential|password|raw[_-]?payload|path)\s*[:=]|https?:\/\/|postgres:\/\//i;

export function createProductionRunbookSafeSummary({ steps = [] } = {}) {
  const safeSteps = (Array.isArray(steps) ? steps : []).map((step) => ({
    step_label: safeRunbookLabel(step?.stepLabel ?? step?.label),
    script_name: safeRunbookScriptName(step?.scriptName ?? step?.script),
    status: safeRunbookStatus(step?.status),
  }));
  const summary = {
    schema: "iris_production_runbook_safe_summary_v1",
    step_count: safeSteps.length,
    steps: safeSteps,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_RUNBOOK_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
    adapter_validation_required: true,
  };
  assertProductionRunbookSafeSummary(summary);
  return summary;
}

export function assertProductionRunbookSafeSummary(
  summary,
  context = "production runbook safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_production_runbook_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_RUNBOOK_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (!Array.isArray(summary.steps) || summary.step_count !== summary.steps.length) {
    throw new ContractError(`${context}: invalid step count`);
  }
  for (const step of summary.steps) assertRunbookStepSafe(step, context);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
  assertRunbookBoundaryPolicy(summary.boundary_policy, context);
  assertNoUnsafeRunbookText(summary, context);
}

export function createProductionRunbookBlockerMapping({
  blockerLabel = "worker_missing",
} = {}) {
  const blocker = safeRunbookBlockerLabel(blockerLabel);
  const step = RUNBOOK_STEP_BY_BLOCKER[blocker] ?? RUNBOOK_STEP_BY_BLOCKER.worker_missing;
  const mapping = {
    schema: "iris_production_runbook_blocker_mapping_v1",
    blocker_label: blocker,
    step_label: step.step_label,
    script_name: step.script_name,
    status: step.status,
    operation_executed: false,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_RUNBOOK_BLOCKER_MAPPING_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertProductionRunbookBlockerMappingSafe(mapping);
  return mapping;
}

export function assertProductionRunbookBlockerMappingSafe(
  mapping,
  context = "production runbook blocker mapping"
) {
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
    throw new ContractError(`${context}: mapping required`);
  }
  if (mapping.schema !== "iris_production_runbook_blocker_mapping_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(mapping)) {
    if (!PRODUCTION_RUNBOOK_BLOCKER_MAPPING_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected mapping field`);
    }
  }
  if (
    !PRODUCTION_RUNBOOK_BLOCKER_LABELS.has(mapping.blocker_label) ||
    !isSafeRunbookLabel(mapping.step_label) ||
    !isSafeRunbookScriptName(mapping.script_name) ||
    !PRODUCTION_RUNBOOK_STEP_STATUSES.has(mapping.status) ||
    mapping.operation_executed !== false ||
    mapping.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid mapping`);
  }
  assertRunbookBlockerMappingBoundaryPolicy(mapping.boundary_policy, context);
  assertNoUnsafeRunbookText(mapping, context);
}

export function createProductionRunbookE2EFixturePack({
  blockerLabels = [...PRODUCTION_RUNBOOK_BLOCKER_LABELS],
} = {}) {
  const labels = Array.isArray(blockerLabels)
    ? blockerLabels
    : [...PRODUCTION_RUNBOOK_BLOCKER_LABELS];
  const mappings = labels.map((blockerLabel) =>
    createProductionRunbookBlockerMapping({ blockerLabel })
  );
  const pack = {
    schema: "iris_production_runbook_e2e_fixture_pack_v1",
    mapping_count: mappings.length,
    mappings,
    boundary_policy: Object.fromEntries(
      [...PRODUCTION_RUNBOOK_E2E_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertProductionRunbookE2EFixturePackSafe(pack);
  return pack;
}

export function assertProductionRunbookE2EFixturePackSafe(
  pack,
  context = "production runbook E2E fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: fixture pack required`);
  }
  if (pack.schema !== "iris_production_runbook_e2e_fixture_pack_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(pack)) {
    if (!PRODUCTION_RUNBOOK_E2E_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture pack field`);
    }
  }
  if (!Array.isArray(pack.mappings) || pack.mapping_count !== pack.mappings.length) {
    throw new ContractError(`${context}: invalid mapping count`);
  }
  for (const mapping of pack.mappings) {
    assertProductionRunbookBlockerMappingSafe(mapping, `${context}: mapping`);
    if (mapping.operation_executed !== false) {
      throw new ContractError(`${context}: operation executed`);
    }
  }
  if (pack.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
  assertRunbookE2EFixturePackBoundaryPolicy(pack.boundary_policy, context);
  assertNoUnsafeRunbookText(pack, context);
}

function assertRunbookStepSafe(step, context) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: step required`);
  }
  for (const field of Object.keys(step)) {
    if (!PRODUCTION_RUNBOOK_SAFE_STEP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected step field`);
    }
  }
  if (
    !isSafeRunbookLabel(step.step_label) ||
    !isSafeRunbookScriptName(step.script_name) ||
    !PRODUCTION_RUNBOOK_STEP_STATUSES.has(step.status)
  ) {
    throw new ContractError(`${context}: invalid step`);
  }
}

function assertRunbookBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!PRODUCTION_RUNBOOK_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of PRODUCTION_RUNBOOK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRunbookBlockerMappingBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!PRODUCTION_RUNBOOK_BLOCKER_MAPPING_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of PRODUCTION_RUNBOOK_BLOCKER_MAPPING_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRunbookE2EFixturePackBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!PRODUCTION_RUNBOOK_E2E_FIXTURE_PACK_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of PRODUCTION_RUNBOOK_E2E_FIXTURE_PACK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function safeRunbookLabel(value) {
  const label = String(value ?? "").trim();
  return isSafeRunbookLabel(label) ? label : "operator_step";
}

function safeRunbookScriptName(value) {
  const script = String(value ?? "").trim();
  return isSafeRunbookScriptName(script) ? script : "operator_review";
}

function safeRunbookStatus(value) {
  const status = String(value ?? "").trim();
  return PRODUCTION_RUNBOOK_STEP_STATUSES.has(status) ? status : "pending";
}

function safeRunbookBlockerLabel(value) {
  const label = String(value ?? "").trim().toLowerCase();
  return PRODUCTION_RUNBOOK_BLOCKER_LABELS.has(label) ? label : "worker_missing";
}

function isSafeRunbookLabel(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 80 &&
    /^[A-Za-z0-9_.-]+$/.test(value) &&
    !UNSAFE_RUNBOOK_TEXT.test(value)
  );
}

function isSafeRunbookScriptName(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 80 &&
    /^[A-Za-z0-9:_.-]+$/.test(value) &&
    !UNSAFE_RUNBOOK_TEXT.test(value)
  );
}

function assertNoUnsafeRunbookText(value, context) {
  if (UNSAFE_RUNBOOK_TEXT.test(JSON.stringify(value))) {
    throw new ContractError(`${context}: unsafe runbook material`);
  }
}

const RUNBOOK_STEP_BY_BLOCKER = Object.freeze({
  worker_missing: {
    step_label: "check_worker_status",
    script_name: "dev:production:check",
    status: "BLOCKED",
  },
  engine_attention: {
    step_label: "review_engine_health",
    script_name: "dev:engine:check",
    status: "attention",
  },
  obs_missing: {
    step_label: "review_obs_pickup",
    script_name: "dev:obs:check",
    status: "BLOCKED",
  },
  db_missing: {
    step_label: "review_db_preflight",
    script_name: "dev:db:check",
    status: "BLOCKED",
  },
  adapter_missing: {
    step_label: "review_adapter_preflight",
    script_name: "dev:adapter:check",
    status: "BLOCKED",
  },
  youtube_attention: {
    step_label: "review_youtube_ingest",
    script_name: "dev:youtube:check",
    status: "attention",
  },
  game_attention: {
    step_label: "review_game_adapter",
    script_name: "dev:game:check",
    status: "attention",
  },
});
