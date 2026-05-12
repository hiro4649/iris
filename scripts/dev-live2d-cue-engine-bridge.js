import "../src/config/loadIrisEnv.js";
import { pathToFileURL } from "node:url";
import { createLive2dCueEngineBridgeServer } from "../src/server/live2dCueEngineBridge.js";
import {
  summarizeLocalEndpointPolicyStatus,
  summarizeLocalEndpointScope,
} from "../src/core/localEndpointPolicy.js";
import { listen } from "../src/server/httpServer.js";

const CONFIGURED_ENV_NAMES = Object.freeze([
  "IRIS_LIVE2D_CUE_BRIDGE_HOST",
  "IRIS_LIVE2D_CUE_BRIDGE_PORT",
  "IRIS_LIVE2D_RENDERER_ENDPOINT",
  "IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT",
  "IRIS_LOCAL_ENGINE_API_KEY",
  "IRIS_LIVE2D_RENDERER_API_KEY",
  "IRIS_LIVE2D_CUE_BRIDGE_TIMEOUT_MS",
  "IRIS_LOCAL_LIVE2D_MODEL_ID",
  "IRIS_LOCAL_LIVE2D_SCENE_ID",
]);

const LIVE2D_CUE_BRIDGE_STARTUP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "service",
  "listening",
  "configure_iris_with",
  "configured_env",
  "bridge_target",
  "local_endpoint_policy",
  "local_endpoint_policy_status",
  "renderer_endpoint_scope",
  "renderer_endpoint_locality_ok",
  "renderer_health_endpoint_scope",
  "renderer_health_endpoint_locality_ok",
  "production_handoff_summary",
  "boundary_policy",
]);

if (isDirectExecution()) {
  await main();
}

async function main() {
  const config = createLive2dCueBridgeConfig(process.env);
  const server = createLive2dCueEngineBridgeServer({
    rendererEndpoint: config.rendererEndpoint,
    rendererHealthEndpoint: config.rendererHealthEndpoint,
    rendererApiKey: config.rendererApiKey,
    timeoutMs: config.timeoutMs,
    defaultModelId: config.defaultModelId,
    defaultSceneId: config.defaultSceneId,
    requireRendererEndpoint: config.requireRendererEndpoint,
  });
  await listen(server, { host: config.host, port: config.port });
  console.log(JSON.stringify(createLive2dCueBridgeStartupReport(config), null, 2));
}

export function createLive2dCueBridgeConfig(env = process.env) {
  return {
    host: optionalEnvValue(env.IRIS_LIVE2D_CUE_BRIDGE_HOST) ?? "127.0.0.1",
    port: Number(optionalEnvValue(env.IRIS_LIVE2D_CUE_BRIDGE_PORT) ?? 9113),
    rendererEndpoint: optionalEnvValue(env.IRIS_LIVE2D_RENDERER_ENDPOINT) ?? "",
    rendererHealthEndpoint:
      optionalEnvValue(env.IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT) ?? "",
    rendererApiKey:
      optionalEnvValue(env.IRIS_LIVE2D_RENDERER_API_KEY) ??
      optionalEnvValue(env.IRIS_LOCAL_ENGINE_API_KEY) ??
      "",
    timeoutMs: Number(optionalEnvValue(env.IRIS_LIVE2D_CUE_BRIDGE_TIMEOUT_MS) ?? 5000),
    defaultModelId: optionalEnvValue(env.IRIS_LOCAL_LIVE2D_MODEL_ID) ?? "",
    defaultSceneId: optionalEnvValue(env.IRIS_LOCAL_LIVE2D_SCENE_ID) ?? "",
    requireRendererEndpoint:
      env.IRIS_LIVE2D_REQUIRE_RENDERER === "true" ||
      (env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true" &&
        env.IRIS_LIVE2D_REQUIRE_RENDERER !== "false"),
  };
}

function optionalEnvValue(value) {
  const text = String(value ?? "").trim();
  return text ? value : undefined;
}

export function createLive2dCueBridgeStartupReport(config) {
  const rendererEndpointScope = summarizeLocalEndpointScope(config.rendererEndpoint);
  const rendererHealthEndpointScope = summarizeLocalEndpointScope(
    config.rendererHealthEndpoint
  );
  const localEndpointPolicyStatus =
    !config.rendererEndpoint && !config.rendererHealthEndpoint
      ? "not_configured"
      : summarizeLocalEndpointPolicyStatus(rendererEndpointScope) === "blocked" ||
          summarizeLocalEndpointPolicyStatus(rendererHealthEndpointScope) === "blocked"
        ? "blocked"
        : "all_allowed";
  const report = {
    ok: true,
    schema: "iris_live2d_cue_engine_bridge_startup_v1",
    service: "live2d_cue_engine_bridge",
    listening: {
      status: "listening",
      host_env_name: "IRIS_LIVE2D_CUE_BRIDGE_HOST",
      port_env_name: "IRIS_LIVE2D_CUE_BRIDGE_PORT",
      health_path: "/health",
      live2d_engine_path: "/live2d-engine",
    },
    configure_iris_with: {
      local_live2d_engine_path: "/live2d-engine",
      local_live2d_health_path: "/health",
    },
    configured_env: [...CONFIGURED_ENV_NAMES],
    bridge_target: {
      renderer_configured: config.rendererEndpoint !== "",
      renderer_health_configured: config.rendererHealthEndpoint !== "",
      auth_configured: config.rendererApiKey !== "",
      model_configured: config.defaultModelId !== "",
      scene_configured: config.defaultSceneId !== "",
    },
    local_endpoint_policy: "loopback_or_private_network_only",
    local_endpoint_policy_status: localEndpointPolicyStatus,
    renderer_endpoint_scope: rendererEndpointScope.endpoint_scope,
    renderer_endpoint_locality_ok: rendererEndpointScope.local_endpoint_allowed,
    renderer_health_endpoint_scope: rendererHealthEndpointScope.endpoint_scope,
    renderer_health_endpoint_locality_ok:
      rendererHealthEndpointScope.local_endpoint_allowed,
    production_handoff_summary: {
      schema: "iris_live2d_cue_bridge_startup_handoff_summary_v1",
      bridge_startup_report_only: true,
      starts_local_bridge_server_when_executed: true,
      starts_live2d_renderer_process: false,
      starts_obs_process: false,
      runtime_adapter_packets_not_exposed: true,
      no_game_or_os_input: true,
      endpoint_values_not_exposed: true,
      secret_values_not_exposed: true,
      text_payloads_not_exposed: true,
      renderer_endpoint_scope: rendererEndpointScope.endpoint_scope,
      renderer_health_endpoint_scope: rendererHealthEndpointScope.endpoint_scope,
      local_endpoint_policy_status: localEndpointPolicyStatus,
      configured_env_count: CONFIGURED_ENV_NAMES.length,
      health_path: "/health",
      live2d_engine_path: "/live2d-engine",
      next_probe_script: "npm run dev:engine:probe",
    },
    boundary_policy: {
      no_endpoint_values: true,
      no_listening_target_values: true,
      no_renderer_target_values: true,
      no_secret_values: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      production_handoff_summary_counts_only: true,
    },
  };
  assertLive2dCueBridgeStartupReportSafe(report);
  return report;
}

export function assertLive2dCueBridgeStartupReportSafe(
  report,
  context = "Live2D cue bridge startup report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error(`${context}: report missing`);
  }
  if (report.schema !== "iris_live2d_cue_engine_bridge_startup_v1") {
    throw new Error(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!LIVE2D_CUE_BRIDGE_STARTUP_REPORT_FIELDS.has(field)) {
      throw new Error(`${context}: unexpected report field ${field}`);
    }
  }
  if (report.service !== "live2d_cue_engine_bridge" || report.ok !== true) {
    throw new Error(`${context}: invalid service status`);
  }
  assertLive2dStartupPathsSafe(report, context);
  assertLive2dStartupConfiguredEnvSafe(report.configured_env, context);
  assertLive2dBridgeTargetSafe(report.bridge_target, context);
  const summary = report?.production_handoff_summary;
  if (
    !summary ||
    summary.schema !== "iris_live2d_cue_bridge_startup_handoff_summary_v1"
  ) {
    throw new Error(`${context}: handoff summary missing`);
  }
  for (const field of [
    "bridge_startup_report_only",
    "starts_local_bridge_server_when_executed",
    "runtime_adapter_packets_not_exposed",
    "no_game_or_os_input",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
    "text_payloads_not_exposed",
  ]) {
    if (summary[field] !== true) throw new Error(`${context}: flag failed ${field}`);
  }
  if (summary.starts_live2d_renderer_process !== false || summary.starts_obs_process !== false) {
    throw new Error(`${context}: bridge must not claim to start renderer or OBS`);
  }
  if (summary.configured_env_count !== report.configured_env.length) {
    throw new Error(`${context}: configured env count mismatch`);
  }
  if (
    summary.health_path !== report.listening.health_path ||
    summary.live2d_engine_path !== report.listening.live2d_engine_path ||
    summary.next_probe_script !== "npm run dev:engine:probe"
  ) {
    throw new Error(`${context}: handoff path or script mismatch`);
  }
  if (
    summary.renderer_endpoint_scope !== report.renderer_endpoint_scope ||
    summary.renderer_health_endpoint_scope !== report.renderer_health_endpoint_scope ||
    summary.local_endpoint_policy_status !== report.local_endpoint_policy_status
  ) {
    throw new Error(`${context}: endpoint policy totals mismatch`);
  }
  if (
    report.local_endpoint_policy !== "loopback_or_private_network_only" ||
    typeof report.renderer_endpoint_scope !== "string" ||
    typeof report.renderer_endpoint_locality_ok !== "boolean" ||
    typeof report.renderer_health_endpoint_scope !== "string" ||
    typeof report.renderer_health_endpoint_locality_ok !== "boolean"
  ) {
    throw new Error(`${context}: invalid endpoint policy summary`);
  }
  for (const field of [
    "no_endpoint_values",
    "no_listening_target_values",
    "no_renderer_target_values",
    "no_secret_values",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "production_handoff_summary_counts_only",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`${context}: boundary flag failed ${field}`);
    }
  }
}

function assertLive2dStartupPathsSafe(report, context) {
  if (
    report.listening?.status !== "listening" ||
    report.listening?.host_env_name !== "IRIS_LIVE2D_CUE_BRIDGE_HOST" ||
    report.listening?.port_env_name !== "IRIS_LIVE2D_CUE_BRIDGE_PORT" ||
    report.listening?.health_path !== "/health" ||
    report.listening?.live2d_engine_path !== "/live2d-engine" ||
    report.configure_iris_with?.local_live2d_engine_path !== "/live2d-engine" ||
    report.configure_iris_with?.local_live2d_health_path !== "/health"
  ) {
    throw new Error(`${context}: invalid path summary`);
  }
}

function assertLive2dStartupConfiguredEnvSafe(configuredEnv, context) {
  if (
    !Array.isArray(configuredEnv) ||
    JSON.stringify(configuredEnv) !== JSON.stringify(CONFIGURED_ENV_NAMES)
  ) {
    throw new Error(`${context}: configured env catalog mismatch`);
  }
}

function assertLive2dBridgeTargetSafe(target, context) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new Error(`${context}: bridge target missing`);
  }
  for (const field of [
    "renderer_configured",
    "renderer_health_configured",
    "auth_configured",
    "model_configured",
    "scene_configured",
  ]) {
    if (typeof target[field] !== "boolean") {
      throw new Error(`${context}: bridge target flag mismatch`);
    }
  }
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}
