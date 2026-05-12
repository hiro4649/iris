import { ContractError } from "../../core/contracts.js";
import {
  assertPostgresPoolFactoryPlanSafe,
  createPostgresPoolFactoryPlan,
} from "../persistence/postgresPoolFactoryPlan.js";

const REPORT_SCHEMA = "iris_postgres_admin_save_preflight_v1";
const POSTGRES_ADMIN_SAVE_PREFLIGHT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "postgres_pool_factory_plan",
  "admin_async_save_gate_preflight",
  "boundary_policy",
]);
const ADMIN_ASYNC_SAVE_GATE_PREFLIGHT_FIELDS = new Set([
  "schema",
  "readiness_status",
  "gate_enabled",
  "mock_postgres_save_enabled",
  "admin_authenticated_flag_enabled",
  "store_path_configured",
  "audit_log_path_configured",
  "real_postgres_pool_required_for_this_preflight",
  "real_postgres_pool_created_by_preflight",
  "db_connection_attempted_by_preflight",
  "required_env_names",
  "missing_required_env_names",
  "next_operator_step_id",
  "next_safe_verification_script",
  "operator_guidance_summary",
]);
const ADMIN_ASYNC_SAVE_GATE_GUIDANCE_FIELDS = new Set([
  "schema",
  "guidance_status",
  "env_names_only",
  "next_step_id",
  "missing_required_env_count",
  "missing_required_env_names",
  "next_safe_verification_script",
  "real_database_connection_required_for_guidance",
]);

export function createPostgresAdminSavePreflightReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const poolPlan = createPostgresPoolFactoryPlan({ env, generatedAtMs });
  assertPostgresPoolFactoryPlanSafe(poolPlan);

  const gateEnabled =
    env.IRIS_OPERATOR_POLICY_ASYNC_SAVE_GATE_ENABLED === "true";
  const postgresMockEnabled =
    env.IRIS_OPERATOR_POLICY_POSTGRES_MOCK_SAVE_ENABLED === "true";
  const adminAuthenticated =
    env.IRIS_OPERATOR_POLICY_ADMIN_AUTHENTICATED === "true";
  const storePathConfigured = Boolean(
    String(env.IRIS_OPERATOR_POLICY_STORE_PATH ?? "").trim()
  );
  const auditPathConfigured = Boolean(
    String(env.IRIS_OPERATOR_POLICY_AUDIT_LOG_PATH ?? "").trim()
  );
  const gateReady =
    gateEnabled &&
    postgresMockEnabled &&
    adminAuthenticated &&
    storePathConfigured &&
    auditPathConfigured;
  const requiredEnvReadiness = [
    ["IRIS_OPERATOR_POLICY_ASYNC_SAVE_GATE_ENABLED", gateEnabled],
    ["IRIS_OPERATOR_POLICY_POSTGRES_MOCK_SAVE_ENABLED", postgresMockEnabled],
    ["IRIS_OPERATOR_POLICY_ADMIN_AUTHENTICATED", adminAuthenticated],
    ["IRIS_OPERATOR_POLICY_STORE_PATH", storePathConfigured],
    ["IRIS_OPERATOR_POLICY_AUDIT_LOG_PATH", auditPathConfigured],
  ];
  const missingRequiredEnvNames = requiredEnvReadiness
    .filter(([, configured]) => configured !== true)
    .map(([envName]) => envName);

  const report = {
    schema: REPORT_SCHEMA,
    generated_at_ms: generatedAtMs,
    postgres_pool_factory_plan: poolPlan,
    admin_async_save_gate_preflight: {
      schema: "iris_operator_policy_admin_async_save_gate_preflight_v1",
      readiness_status: gateReady
        ? "ready_for_mock_postgres_save_gate"
        : "configuration_waiting",
      gate_enabled: gateEnabled,
      mock_postgres_save_enabled: postgresMockEnabled,
      admin_authenticated_flag_enabled: adminAuthenticated,
      store_path_configured: storePathConfigured,
      audit_log_path_configured: auditPathConfigured,
      real_postgres_pool_required_for_this_preflight: false,
      real_postgres_pool_created_by_preflight: false,
      db_connection_attempted_by_preflight: false,
      required_env_names: requiredEnvReadiness.map(([envName]) => envName),
      missing_required_env_names: missingRequiredEnvNames,
      next_operator_step_id:
        missingRequiredEnvNames.length > 0
          ? "configure_admin_async_save_gate_env"
          : "run_postgres_admin_save_preflight",
      next_safe_verification_script:
        "npm run dev:operator-policy:async-save-gate-roundtrip",
      operator_guidance_summary: {
        schema: "iris_operator_policy_admin_async_save_gate_guidance_v1",
        guidance_status: gateReady
          ? "ready_for_preflight_recheck"
          : "configuration_waiting",
        env_names_only: true,
        next_step_id:
          missingRequiredEnvNames.length > 0
            ? "configure_admin_async_save_gate_env"
            : "run_postgres_admin_save_preflight",
        missing_required_env_count: missingRequiredEnvNames.length,
        missing_required_env_names: missingRequiredEnvNames,
        next_safe_verification_script:
          "npm run dev:operator-policy:async-save-gate-roundtrip",
        real_database_connection_required_for_guidance: false,
      },
    },
    boundary_policy: createBoundaryPolicy(),
  };

  assertPostgresAdminSavePreflightReportSafe(report);
  return report;
}

export function assertPostgresAdminSavePreflightReportSafe(
  report,
  context = "postgres admin save preflight"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report must be an object`);
  }
  if (report.schema !== REPORT_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!POSTGRES_ADMIN_SAVE_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected preflight field ${field}`);
    }
  }
  assertPostgresPoolFactoryPlanSafe(
    report.postgres_pool_factory_plan,
    `${context} pool plan`
  );
  assertAdminGatePreflightSafe(
    report.admin_async_save_gate_preflight,
    `${context}: admin async save gate preflight`
  );
  assertBoundaryPolicy(report.boundary_policy, context);
  const serialized = JSON.stringify(report);
  if (
    /\b(postgres:\/\/|postgresql:\/\/|secret|password|token|api[_-]?key|endpoint|https?:\/\/|select |insert |update |delete |event_id|trace_id|subtitle_text|input_action_candidate|world_command)\b/i.test(
      serialized
    )
  ) {
    throw new ContractError(`${context}: unsafe public text detected`);
  }
}

function assertAdminGatePreflightSafe(gate, context) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate preflight required`);
  }
  if (gate.schema !== "iris_operator_policy_admin_async_save_gate_preflight_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(gate)) {
    if (!ADMIN_ASYNC_SAVE_GATE_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate preflight field ${field}`);
    }
  }
  if (
    ![
      "configuration_waiting",
      "ready_for_mock_postgres_save_gate",
    ].includes(gate.readiness_status)
  ) {
    throw new ContractError(`${context}: invalid readiness status`);
  }
  for (const field of [
    "gate_enabled",
    "mock_postgres_save_enabled",
    "admin_authenticated_flag_enabled",
    "store_path_configured",
    "audit_log_path_configured",
    "real_postgres_pool_required_for_this_preflight",
    "real_postgres_pool_created_by_preflight",
    "db_connection_attempted_by_preflight",
  ]) {
    if (typeof gate[field] !== "boolean") {
      throw new ContractError(`${context}: invalid boolean ${field}`);
    }
  }
  if (
    gate.real_postgres_pool_required_for_this_preflight !== false ||
    gate.real_postgres_pool_created_by_preflight !== false ||
    gate.db_connection_attempted_by_preflight !== false
  ) {
    throw new ContractError(`${context}: preflight must not touch database`);
  }
  assertEnvNameListSafe(gate.required_env_names, `${context}: required env`);
  assertEnvNameListSafe(
    gate.missing_required_env_names,
    `${context}: missing required env`
  );
  for (const name of gate.missing_required_env_names) {
    if (!gate.required_env_names.includes(name)) {
      throw new ContractError(`${context}: missing env must be required`);
    }
  }
  const expectedMissing = [
    ["IRIS_OPERATOR_POLICY_ASYNC_SAVE_GATE_ENABLED", gate.gate_enabled],
    [
      "IRIS_OPERATOR_POLICY_POSTGRES_MOCK_SAVE_ENABLED",
      gate.mock_postgres_save_enabled,
    ],
    [
      "IRIS_OPERATOR_POLICY_ADMIN_AUTHENTICATED",
      gate.admin_authenticated_flag_enabled,
    ],
    ["IRIS_OPERATOR_POLICY_STORE_PATH", gate.store_path_configured],
    ["IRIS_OPERATOR_POLICY_AUDIT_LOG_PATH", gate.audit_log_path_configured],
  ]
    .filter(([, configured]) => configured !== true)
    .map(([envName]) => envName);
  if (
    JSON.stringify(gate.missing_required_env_names) !==
    JSON.stringify(expectedMissing)
  ) {
    throw new ContractError(`${context}: invalid missing env summary`);
  }
  const expectedStep =
    expectedMissing.length > 0
      ? "configure_admin_async_save_gate_env"
      : "run_postgres_admin_save_preflight";
  if (gate.next_operator_step_id !== expectedStep) {
    throw new ContractError(`${context}: invalid next operator step`);
  }
  assertSafeScriptName(
    gate.next_safe_verification_script,
    `${context}: next verification script`
  );
  if (
    gate.next_safe_verification_script !==
    "npm run dev:operator-policy:async-save-gate-roundtrip"
  ) {
    throw new ContractError(`${context}: invalid next verification script`);
  }
  assertAdminGateGuidanceSafe(
    gate.operator_guidance_summary,
    expectedStep,
    expectedMissing,
    `${context}: operator guidance`
  );
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const required = Object.keys(createBoundaryPolicy());
  const allowed = new Set(required);
  for (const key of Object.keys(policy)) {
    if (!allowed.has(key)) {
      throw new ContractError(`${context}: unexpected boundary policy ${key}`);
    }
  }
  for (const key of required) {
    if (policy[key] !== true) {
      throw new ContractError(`${context}: boundary policy ${key} must be true`);
    }
  }
}

function assertAdminGateGuidanceSafe(guidance, expectedStep, expectedMissing, context) {
  if (!guidance || typeof guidance !== "object" || Array.isArray(guidance)) {
    throw new ContractError(`${context}: guidance required`);
  }
  if (
    guidance.schema !==
    "iris_operator_policy_admin_async_save_gate_guidance_v1"
  ) {
    throw new ContractError(`${context}: invalid guidance schema`);
  }
  for (const field of Object.keys(guidance)) {
    if (!ADMIN_ASYNC_SAVE_GATE_GUIDANCE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected guidance field ${field}`);
    }
  }
  if (
    ![
      "configuration_waiting",
      "ready_for_preflight_recheck",
    ].includes(guidance.guidance_status)
  ) {
    throw new ContractError(`${context}: invalid guidance status`);
  }
  if (guidance.env_names_only !== true) {
    throw new ContractError(`${context}: env names only required`);
  }
  if (guidance.next_step_id !== expectedStep) {
    throw new ContractError(`${context}: invalid guidance next step`);
  }
  assertSafeScriptName(
    guidance.next_safe_verification_script,
    `${context}: guidance next verification script`
  );
  if (
    guidance.next_safe_verification_script !==
    "npm run dev:operator-policy:async-save-gate-roundtrip"
  ) {
    throw new ContractError(`${context}: invalid guidance verification script`);
  }
  if (guidance.missing_required_env_count !== expectedMissing.length) {
    throw new ContractError(`${context}: invalid missing env count`);
  }
  assertEnvNameListSafe(
    guidance.missing_required_env_names,
    `${context}: missing env`
  );
  if (
    JSON.stringify(guidance.missing_required_env_names) !==
    JSON.stringify(expectedMissing)
  ) {
    throw new ContractError(`${context}: invalid guidance missing env`);
  }
  if (guidance.real_database_connection_required_for_guidance !== false) {
    throw new ContractError(`${context}: guidance must not require database`);
  }
}

function assertEnvNameListSafe(names, context) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of names) {
    if (typeof name !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
}

function assertSafeScriptName(script, context) {
  if (
    typeof script !== "string" ||
    !/^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      script
    )
  ) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function createBoundaryPolicy() {
  return {
    preflight_only: true,
    env_names_and_booleans_only: true,
    script_names_only: true,
    no_secret_values: true,
    no_connection_values: true,
    no_endpoint_values: true,
    no_store_path_values: true,
    no_sql_statements: true,
    no_policy_payloads: true,
    no_policy_numeric_values: true,
    no_candidates: true,
    no_commands: true,
    no_db_connection_attempted: true,
    no_pool_created: true,
  };
}
