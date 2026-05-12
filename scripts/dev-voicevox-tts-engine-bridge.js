import "../src/config/loadIrisEnv.js";
import { pathToFileURL } from "node:url";
import { createVoicevoxTtsEngineBridgeServer } from "../src/server/voicevoxTtsEngineBridge.js";
import {
  summarizeLocalEndpointPolicyStatus,
  summarizeLocalEndpointScope,
} from "../src/core/localEndpointPolicy.js";
import { listen } from "../src/server/httpServer.js";

const CONFIGURED_ENV_NAMES = Object.freeze([
  "IRIS_VOICEVOX_BRIDGE_HOST",
  "IRIS_VOICEVOX_BRIDGE_PORT",
  "IRIS_VOICEVOX_ENDPOINT",
  "IRIS_VOICEVOX_SPEAKER_ID",
  "IRIS_VOICEVOX_TIMEOUT_MS",
  "IRIS_LOCAL_ENGINE_API_KEY",
  "IRIS_VOICEVOX_API_KEY",
]);

const VOICEVOX_BRIDGE_STARTUP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "service",
  "listening",
  "configure_iris_with",
  "configured_env",
  "bridge_target",
  "local_endpoint_policy",
  "local_endpoint_policy_status",
  "engine_endpoint_scope",
  "engine_endpoint_locality_ok",
  "production_handoff_summary",
  "boundary_policy",
]);

if (isDirectExecution()) {
  await main();
}

async function main() {
  const config = createVoicevoxBridgeConfig(process.env);
  const server = createVoicevoxTtsEngineBridgeServer({
    voicevoxEndpoint: config.voicevoxEndpoint,
    speakerId: config.speakerId,
    timeoutMs: config.timeoutMs,
    apiKey: config.apiKey,
    allowLocalPreviewFallback: config.allowLocalPreviewFallback,
  });
  await listen(server, { host: config.host, port: config.port });
  console.log(JSON.stringify(createVoicevoxBridgeStartupReport(config), null, 2));
}

export function createVoicevoxBridgeConfig(env = process.env) {
  return {
    host: optionalEnvValue(env.IRIS_VOICEVOX_BRIDGE_HOST) ?? "127.0.0.1",
    port: Number(optionalEnvValue(env.IRIS_VOICEVOX_BRIDGE_PORT) ?? 9110),
    voicevoxEndpoint:
      optionalEnvValue(env.IRIS_VOICEVOX_ENDPOINT) ?? "http://127.0.0.1:50021",
    speakerId: optionalEnvValue(env.IRIS_VOICEVOX_SPEAKER_ID) ?? "3",
    timeoutMs: Number(optionalEnvValue(env.IRIS_VOICEVOX_TIMEOUT_MS) ?? 10_000),
    apiKey:
      optionalEnvValue(env.IRIS_VOICEVOX_API_KEY) ??
      optionalEnvValue(env.IRIS_LOCAL_ENGINE_API_KEY) ??
      "",
    allowLocalPreviewFallback:
      env.IRIS_VOICEVOX_ALLOW_LOCAL_PREVIEW_FALLBACK === "true" ||
      (env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS !== "true" &&
        env.IRIS_VOICEVOX_ALLOW_LOCAL_PREVIEW_FALLBACK !== "false"),
  };
}

function optionalEnvValue(value) {
  const text = String(value ?? "").trim();
  return text ? value : undefined;
}

export function createVoicevoxBridgeStartupReport(config) {
  const engineEndpointScope = summarizeLocalEndpointScope(config.voicevoxEndpoint);
  const localEndpointPolicyStatus = summarizeLocalEndpointPolicyStatus(engineEndpointScope);
  const report = {
    ok: true,
    schema: "iris_voicevox_tts_engine_bridge_startup_v1",
    service: "voicevox_tts_engine_bridge",
    listening: {
      status: "listening",
      host_env_name: "IRIS_VOICEVOX_BRIDGE_HOST",
      port_env_name: "IRIS_VOICEVOX_BRIDGE_PORT",
      health_path: "/health",
      tts_engine_path: "/tts-engine",
    },
    configure_iris_with: {
      local_tts_engine_path: "/tts-engine",
      local_tts_health_path: "/health",
    },
    configured_env: [...CONFIGURED_ENV_NAMES],
    bridge_target: {
      configured: config.voicevoxEndpoint !== "",
      speaker_configured: config.speakerId !== "",
      auth_configured: config.apiKey !== "",
    },
    local_endpoint_policy: "loopback_or_private_network_only",
    local_endpoint_policy_status: localEndpointPolicyStatus,
    engine_endpoint_scope: engineEndpointScope.endpoint_scope,
    engine_endpoint_locality_ok: engineEndpointScope.local_endpoint_allowed,
    production_handoff_summary: {
      schema: "iris_voicevox_bridge_startup_handoff_summary_v1",
      bridge_startup_report_only: true,
      starts_local_bridge_server_when_executed: true,
      starts_voicevox_engine_process: false,
      real_obs_operation_not_started_by_bridge: true,
      runtime_adapter_packets_not_exposed: true,
      no_game_or_os_input: true,
      endpoint_values_not_exposed: true,
      secret_values_not_exposed: true,
      text_payloads_not_exposed: true,
      engine_endpoint_scope: engineEndpointScope.endpoint_scope,
      local_endpoint_policy_status: localEndpointPolicyStatus,
      configured_env_count: CONFIGURED_ENV_NAMES.length,
      health_path: "/health",
      tts_engine_path: "/tts-engine",
      next_probe_script: "npm run dev:engine:probe",
    },
    boundary_policy: {
      no_endpoint_values: true,
      no_listening_target_values: true,
      no_engine_target_values: true,
      no_secret_values: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      production_handoff_summary_counts_only: true,
    },
  };
  assertVoicevoxBridgeStartupReportSafe(report);
  return report;
}

export function assertVoicevoxBridgeStartupReportSafe(
  report,
  context = "VOICEVOX bridge startup report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error(`${context}: report missing`);
  }
  if (report.schema !== "iris_voicevox_tts_engine_bridge_startup_v1") {
    throw new Error(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!VOICEVOX_BRIDGE_STARTUP_REPORT_FIELDS.has(field)) {
      throw new Error(`${context}: unexpected report field ${field}`);
    }
  }
  if (report.service !== "voicevox_tts_engine_bridge" || report.ok !== true) {
    throw new Error(`${context}: invalid service status`);
  }
  assertVoicevoxStartupPathsSafe(report, context);
  assertVoicevoxStartupConfiguredEnvSafe(report.configured_env, context);
  assertVoicevoxBridgeTargetSafe(report.bridge_target, context);
  const summary = report?.production_handoff_summary;
  if (!summary || summary.schema !== "iris_voicevox_bridge_startup_handoff_summary_v1") {
    throw new Error(`${context}: handoff summary missing`);
  }
  for (const field of [
    "bridge_startup_report_only",
    "starts_local_bridge_server_when_executed",
    "real_obs_operation_not_started_by_bridge",
    "runtime_adapter_packets_not_exposed",
    "no_game_or_os_input",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
    "text_payloads_not_exposed",
  ]) {
    if (summary[field] !== true) throw new Error(`${context}: flag failed ${field}`);
  }
  if (summary.starts_voicevox_engine_process !== false) {
    throw new Error(`${context}: bridge must not claim to start VOICEVOX`);
  }
  if (summary.configured_env_count !== report.configured_env.length) {
    throw new Error(`${context}: configured env count mismatch`);
  }
  if (
    summary.health_path !== report.listening.health_path ||
    summary.tts_engine_path !== report.listening.tts_engine_path ||
    summary.next_probe_script !== "npm run dev:engine:probe"
  ) {
    throw new Error(`${context}: handoff path or script mismatch`);
  }
  if (
    summary.engine_endpoint_scope !== report.engine_endpoint_scope ||
    summary.local_endpoint_policy_status !== report.local_endpoint_policy_status
  ) {
    throw new Error(`${context}: endpoint policy totals mismatch`);
  }
  if (
    report.local_endpoint_policy !== "loopback_or_private_network_only" ||
    typeof report.engine_endpoint_scope !== "string" ||
    typeof report.engine_endpoint_locality_ok !== "boolean"
  ) {
    throw new Error(`${context}: invalid endpoint policy summary`);
  }
  assertBoundaryPolicy(report.boundary_policy, [
    "no_endpoint_values",
    "no_listening_target_values",
    "no_engine_target_values",
    "no_secret_values",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "production_handoff_summary_counts_only",
  ], context);
}

function assertVoicevoxStartupPathsSafe(report, context) {
  if (
    report.listening?.status !== "listening" ||
    report.listening?.host_env_name !== "IRIS_VOICEVOX_BRIDGE_HOST" ||
    report.listening?.port_env_name !== "IRIS_VOICEVOX_BRIDGE_PORT" ||
    report.listening?.health_path !== "/health" ||
    report.listening?.tts_engine_path !== "/tts-engine" ||
    report.configure_iris_with?.local_tts_engine_path !== "/tts-engine" ||
    report.configure_iris_with?.local_tts_health_path !== "/health"
  ) {
    throw new Error(`${context}: invalid path summary`);
  }
}

function assertVoicevoxStartupConfiguredEnvSafe(configuredEnv, context) {
  if (
    !Array.isArray(configuredEnv) ||
    JSON.stringify(configuredEnv) !== JSON.stringify(CONFIGURED_ENV_NAMES)
  ) {
    throw new Error(`${context}: configured env catalog mismatch`);
  }
}

function assertVoicevoxBridgeTargetSafe(target, context) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new Error(`${context}: bridge target missing`);
  }
  for (const field of ["configured", "speaker_configured", "auth_configured"]) {
    if (typeof target[field] !== "boolean") {
      throw new Error(`${context}: bridge target flag mismatch`);
    }
  }
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}

function assertBoundaryPolicy(policy, fields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error(`${context}: boundary policy missing`);
  }
  const expected = new Set(fields);
  for (const field of Object.keys(policy)) {
    if (!expected.has(field)) {
      throw new Error(`${context}: unexpected boundary flag ${field}`);
    }
  }
  for (const field of fields) {
    if (policy[field] !== true) {
      throw new Error(`${context}: boundary flag failed ${field}`);
    }
  }
}
