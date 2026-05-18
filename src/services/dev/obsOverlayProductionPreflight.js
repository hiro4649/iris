import { ContractError } from "../../core/contracts.js";

const REQUIRED_ENV_NAMES = [
  "IRIS_OBS_BRIDGE_ENDPOINT",
  "IRIS_OBS_BRIDGE_HEALTH_ENDPOINT",
  "IRIS_HTTP_ORIGIN",
  "IRIS_OBS_SOURCE_NAME",
  "IRIS_OBS_SCENE_NAME",
  "IRIS_OBS_SOURCE_WIDTH",
  "IRIS_OBS_SOURCE_HEIGHT",
  "IRIS_OBS_SOURCE_FPS",
  "IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE",
  "IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE",
  "IRIS_OBS_BRIDGE_API_KEY",
  "IRIS_OBS_BRIDGE_TIMEOUT_MS",
];

const OBS_OVERLAY_PRODUCTION_PREFLIGHT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "status",
  "external_real_evidence_status",
  "next_readiness_state",
  "production_ready_allowed",
  "go_no_go",
  "required_env_names",
  "configured_env_count",
  "missing_env_count",
  "missing_required_env_names",
  "obs_bridge_readiness_status",
  "browser_source_setup_status",
  "overlay_url_configured_status",
  "subtitle_overlay_status",
  "character_overlay_status",
  "game_context_overlay_status",
  "heartbeat_status",
  "stale_artifact_guard_status",
  "fixture_preview_status",
  "real_obs_mutation_allowed",
  "operator_confirmation_required",
  "boundary_policy",
]);

const BOUNDARY_POLICY_FIELDS = new Set([
  "env_names_only",
  "status_count_boolean_label_only",
  "no_endpoint_values",
  "no_obs_credentials",
  "no_raw_overlay_events",
  "no_raw_runtime_payloads",
  "no_raw_artifact_paths",
  "no_raw_frames",
  "no_raw_jobs",
  "no_commands",
  "read_only_preflight",
  "fixture_local_bridge_not_real_ready",
  "production_ready_not_allowed",
  "operator_confirmation_required_for_real_obs_mutation",
]);

const SAFE_READINESS_STATES = new Set([
  "configuration_waiting",
  "operator_confirmation_required",
]);
const SAFE_COMPONENT_STATUSES = new Set([
  "configuration_waiting",
  "configured",
  "missing",
  "safe_summary_only",
  "synthetic_fixture_only",
  "operator_confirmation_required",
]);

export function createObsOverlayProductionPreflightReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const missingRequiredEnvNames = REQUIRED_ENV_NAMES.filter(
    (name) => !isConfigured(env, name)
  );
  const configuredEnvCount = REQUIRED_ENV_NAMES.length - missingRequiredEnvNames.length;
  const browserSourceConfigured = [
    "IRIS_HTTP_ORIGIN",
    "IRIS_OBS_SOURCE_NAME",
    "IRIS_OBS_SOURCE_WIDTH",
    "IRIS_OBS_SOURCE_HEIGHT",
    "IRIS_OBS_SOURCE_FPS",
  ].every((name) => isConfigured(env, name));
  const bridgeConfigured =
    isConfigured(env, "IRIS_OBS_BRIDGE_ENDPOINT") &&
    isConfigured(env, "IRIS_OBS_BRIDGE_HEALTH_ENDPOINT");
  const report = {
    schema: "iris_obs_overlay_production_preflight_v1",
    generated_at_ms: generatedAtMs,
    status: "blocked",
    external_real_evidence_status: "external_real_evidence_blocked",
    next_readiness_state:
      missingRequiredEnvNames.length > 0
        ? "configuration_waiting"
        : "operator_confirmation_required",
    production_ready_allowed: false,
    go_no_go: "no_go",
    required_env_names: REQUIRED_ENV_NAMES,
    configured_env_count: configuredEnvCount,
    missing_env_count: missingRequiredEnvNames.length,
    missing_required_env_names: missingRequiredEnvNames,
    obs_bridge_readiness_status: bridgeConfigured
      ? "operator_confirmation_required"
      : "configuration_waiting",
    browser_source_setup_status: browserSourceConfigured ? "configured" : "missing",
    overlay_url_configured_status: isConfigured(env, "IRIS_HTTP_ORIGIN")
      ? "configured"
      : "missing",
    subtitle_overlay_status: "safe_summary_only",
    character_overlay_status: "safe_summary_only",
    game_context_overlay_status: "safe_summary_only",
    heartbeat_status: "configuration_waiting",
    stale_artifact_guard_status: "configuration_waiting",
    fixture_preview_status: "synthetic_fixture_only",
    real_obs_mutation_allowed: false,
    operator_confirmation_required: true,
    boundary_policy: {
      env_names_only: true,
      status_count_boolean_label_only: true,
      no_endpoint_values: true,
      no_obs_credentials: true,
      no_raw_overlay_events: true,
      no_raw_runtime_payloads: true,
      no_raw_artifact_paths: true,
      no_raw_frames: true,
      no_raw_jobs: true,
      no_commands: true,
      read_only_preflight: true,
      fixture_local_bridge_not_real_ready: true,
      production_ready_not_allowed: true,
      operator_confirmation_required_for_real_obs_mutation: true,
    },
  };
  assertObsOverlayProductionPreflightReportSafe(report);
  return report;
}

export function assertObsOverlayProductionPreflightReportSafe(
  report,
  context = "OBS overlay production preflight"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  assertNoUnsafeObsOverlayProductionPreflightLeak(report, context);
  if (report.schema !== "iris_obs_overlay_production_preflight_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!OBS_OVERLAY_PRODUCTION_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (
    report.status !== "blocked" ||
    report.external_real_evidence_status !== "external_real_evidence_blocked" ||
    report.production_ready_allowed !== false ||
    report.go_no_go !== "no_go"
  ) {
    throw new ContractError(`${context}: no-go invariant mismatch`);
  }
  if (!SAFE_READINESS_STATES.has(report.next_readiness_state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
  if (
    report.real_obs_mutation_allowed !== false ||
    report.operator_confirmation_required !== true
  ) {
    throw new ContractError(`${context}: real OBS mutation boundary mismatch`);
  }
  assertEnvNamesSafe(report.required_env_names, context);
  assertEnvNamesSafe(report.missing_required_env_names, context);
  if (
    report.required_env_names.length !== REQUIRED_ENV_NAMES.length ||
    REQUIRED_ENV_NAMES.some((name) => !report.required_env_names.includes(name)) ||
    report.missing_required_env_names.some(
      (name) => !REQUIRED_ENV_NAMES.includes(name)
    ) ||
    report.configured_env_count + report.missing_env_count !==
      REQUIRED_ENV_NAMES.length ||
    report.missing_env_count !== report.missing_required_env_names.length
  ) {
    throw new ContractError(`${context}: env count mismatch`);
  }
  for (const field of [
    "obs_bridge_readiness_status",
    "browser_source_setup_status",
    "overlay_url_configured_status",
    "subtitle_overlay_status",
    "character_overlay_status",
    "game_context_overlay_status",
    "heartbeat_status",
    "stale_artifact_guard_status",
    "fixture_preview_status",
  ]) {
    if (!SAFE_COMPONENT_STATUSES.has(report[field])) {
      throw new ContractError(`${context}: invalid component status`, { field });
    }
  }
  assertBoundaryPolicySafe(report.boundary_policy, context);
}

function isConfigured(env, name) {
  return String(env?.[name] ?? "").trim().length > 0;
}

function assertEnvNamesSafe(names, context) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of names) {
    if (typeof name !== "string" || !name.startsWith("IRIS_")) {
      throw new ContractError(`${context}: unsafe env name`);
    }
  }
}

function assertBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!BOUNDARY_POLICY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field`, {
        field,
      });
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy flag required`, {
        field,
      });
    }
  }
}

function assertNoUnsafeObsOverlayProductionPreflightLeak(
  value,
  context,
  path = "root"
) {
  if (typeof value === "string") {
    if (
      /https?:\/\/|postgres(?:ql)?:\/\/|bearer\s+[a-z0-9._~+/=-]{8,}|[a-z]:\\|\/(?:tmp|var|home|users)\b/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe value leaked`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeObsOverlayProductionPreflightLeak(
        item,
        context,
        `${path}[${index}]`
      )
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUnsafeObsOverlayProductionPreflightLeak(
      child,
      context,
      `${path}.${field}`
    );
  }
}
