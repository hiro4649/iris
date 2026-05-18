import { ContractError } from "../../core/contracts.js";

const REQUIRED_ENV_NAMES = [
  "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
  "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
  "IRIS_LOCAL_TTS_ENGINE_API_KEY",
  "IRIS_LOCAL_TTS_ENGINE_VOICE_ID",
  "IRIS_LOCAL_TTS_ENGINE_MODEL",
  "IRIS_LOCAL_TTS_ENGINE_LOCALE",
  "IRIS_LICENSED_VOICE_SOURCE_STATUS",
  "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
  "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
  "IRIS_LOCAL_LIVE2D_ENGINE_API_KEY",
  "IRIS_LOCAL_LIVE2D_MODEL_ID",
  "IRIS_LOCAL_LIVE2D_SCENE_ID",
  "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
];

const REPORT_FIELDS = new Set([
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
  "tts_engine_configured_status",
  "licensed_voice_source_status",
  "live2d_renderer_configured_status",
  "local_bridge_status",
  "placeholder_voice_status",
  "fixture_renderer_status",
  "real_tts_operation_allowed",
  "real_live2d_operation_allowed",
  "operator_confirmation_required",
  "boundary_policy",
]);

const BOUNDARY_FIELDS = new Set([
  "env_names_only",
  "status_count_boolean_label_only",
  "no_endpoint_values",
  "no_api_key_values",
  "no_tokens",
  "no_raw_audio",
  "no_raw_voice_samples",
  "no_raw_tts_payloads",
  "no_raw_renderer_payloads",
  "no_raw_motion_commands",
  "no_dataset_paths",
  "no_internal_model_paths",
  "read_only_preflight",
  "local_bridge_not_real_ready",
  "placeholder_voice_not_real_ready",
  "fixture_renderer_not_real_ready",
  "production_ready_not_allowed",
  "operator_confirmation_required_for_real_operation",
]);

const SAFE_READINESS_STATES = new Set([
  "configuration_waiting",
  "operator_attention_required",
]);
const SAFE_COMPONENT_STATUSES = new Set([
  "configured",
  "not_configured",
  "placeholder",
  "licensed",
  "operator_attention_required",
  "local_bridge_only",
  "synthetic_fixture_only",
]);

export function createLive2dTtsBridgeReadinessReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const missingRequiredEnvNames = REQUIRED_ENV_NAMES.filter(
    (name) => !isConfigured(env, name)
  );
  const configuredEnvCount = REQUIRED_ENV_NAMES.length - missingRequiredEnvNames.length;
  const ttsEngineConfigured = [
    "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
    "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
    "IRIS_LOCAL_TTS_ENGINE_VOICE_ID",
  ].every((name) => isConfigured(env, name));
  const live2dRendererConfigured = [
    "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
    "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
    "IRIS_LOCAL_LIVE2D_MODEL_ID",
  ].every((name) => isConfigured(env, name));
  const licensedVoiceSourceStatus = safeLicensedVoiceSourceStatus(
    env.IRIS_LICENSED_VOICE_SOURCE_STATUS
  );
  const report = {
    schema: "iris_live2d_tts_bridge_readiness_v1",
    generated_at_ms: generatedAtMs,
    status: "blocked",
    external_real_evidence_status: "external_real_evidence_blocked",
    next_readiness_state:
      missingRequiredEnvNames.length > 0
        ? "configuration_waiting"
        : "operator_attention_required",
    production_ready_allowed: false,
    go_no_go: "no_go",
    required_env_names: REQUIRED_ENV_NAMES,
    configured_env_count: configuredEnvCount,
    missing_env_count: missingRequiredEnvNames.length,
    missing_required_env_names: missingRequiredEnvNames,
    tts_engine_configured_status: ttsEngineConfigured ? "configured" : "not_configured",
    licensed_voice_source_status: licensedVoiceSourceStatus,
    live2d_renderer_configured_status: live2dRendererConfigured
      ? "configured"
      : "not_configured",
    local_bridge_status:
      ttsEngineConfigured || live2dRendererConfigured
        ? "local_bridge_only"
        : "not_configured",
    placeholder_voice_status:
      licensedVoiceSourceStatus === "licensed" ? "licensed" : "placeholder",
    fixture_renderer_status: "synthetic_fixture_only",
    real_tts_operation_allowed: false,
    real_live2d_operation_allowed: false,
    operator_confirmation_required: true,
    boundary_policy: {
      env_names_only: true,
      status_count_boolean_label_only: true,
      no_endpoint_values: true,
      no_api_key_values: true,
      no_tokens: true,
      no_raw_audio: true,
      no_raw_voice_samples: true,
      no_raw_tts_payloads: true,
      no_raw_renderer_payloads: true,
      no_raw_motion_commands: true,
      no_dataset_paths: true,
      no_internal_model_paths: true,
      read_only_preflight: true,
      local_bridge_not_real_ready: true,
      placeholder_voice_not_real_ready: true,
      fixture_renderer_not_real_ready: true,
      production_ready_not_allowed: true,
      operator_confirmation_required_for_real_operation: true,
    },
  };
  assertLive2dTtsBridgeReadinessReportSafe(report);
  return report;
}

export function assertLive2dTtsBridgeReadinessReportSafe(
  report,
  context = "Live2D/TTS bridge readiness"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  assertNoUnsafeLive2dTtsReadinessLeak(report, context);
  if (report.schema !== "iris_live2d_tts_bridge_readiness_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!REPORT_FIELDS.has(field)) {
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
    report.real_tts_operation_allowed !== false ||
    report.real_live2d_operation_allowed !== false ||
    report.operator_confirmation_required !== true
  ) {
    throw new ContractError(`${context}: real operation boundary mismatch`);
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
    "tts_engine_configured_status",
    "licensed_voice_source_status",
    "live2d_renderer_configured_status",
    "local_bridge_status",
    "placeholder_voice_status",
    "fixture_renderer_status",
  ]) {
    if (!SAFE_COMPONENT_STATUSES.has(report[field])) {
      throw new ContractError(`${context}: invalid component status`, { field });
    }
  }
  assertBoundaryPolicySafe(report.boundary_policy, context);
}

function safeLicensedVoiceSourceStatus(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "licensed") return "licensed";
  if (normalized === "placeholder") return "placeholder";
  if (normalized === "") return "not_configured";
  return "operator_attention_required";
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
    if (!BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field`, {
        field,
      });
    }
  }
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy flag required`, {
        field,
      });
    }
  }
}

function assertNoUnsafeLive2dTtsReadinessLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (path.endsWith("required_env_names") || path.includes("missing_required_env_names")) {
      return;
    }
    if (
      /https?:\/\/|bearer\s+[a-z0-9._~+/=-]{8,}|[a-z]:\\|\/(?:tmp|var|home|users)\b/i.test(
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
      assertNoUnsafeLive2dTtsReadinessLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUnsafeLive2dTtsReadinessLeak(child, context, `${path}.${field}`);
  }
}
