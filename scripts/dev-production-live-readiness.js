import {
  assertProductionLiveReadinessReportSafe,
  createProductionLiveReadinessReport,
} from "../src/services/dev/productionLiveReadiness.js";
import "../src/config/loadIrisEnv.js";
import { startLocalStreamingRuntime } from "../src/server/localStreamingRuntimeSupervisor.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const probeMode = process.argv.includes("--fixture-post") ? "fixture_post" : "dry_run";
const shouldStartRuntime = process.argv.includes("--start-runtime");

let runtimeHandle = null;
let runtimeSnapshot = null;
if (shouldStartRuntime) {
  const runtimeEnv = createStartRuntimeEnv(process.env);
  runtimeHandle = startLocalStreamingRuntime({
    env: runtimeEnv,
    logger: console,
  });
  runtimeSnapshot = await waitForRuntimeReadiness({
    env: runtimeEnv,
    timeoutMs: 45_000,
    intervalMs: 250,
  });
}

const reportEnv = runtimeHandle?.env ?? process.env;
runtimeSnapshot =
  runtimeSnapshot ??
  (await waitForRuntimeReadiness({
    env: reportEnv,
    timeoutMs: 1_500,
    intervalMs: 250,
  }));

const report = await createProductionLiveReadinessReport({
  env: reportEnv,
  probeMode,
  fetchImpl: fetchWithTimeout,
  streamState: runtimeSnapshot?.streamState ?? null,
  httpIngestScheduler: runtimeSnapshot?.httpIngestScheduler ?? null,
  overlayEventBus: runtimeSnapshot?.overlayEventBus ?? null,
  gameplayRuntimeStatusOverride:
    runtimeSnapshot?.gameplayRuntimeStatus ?? null,
  persistenceRuntimeStatusOverride:
    runtimeSnapshot?.persistenceRuntimeStatus ?? null,
});
assertProductionLiveReadinessReportSafe(report, "production live readiness CLI");

if (runtimeHandle?.stopAll) {
  runtimeHandle.stopAll();
}

console.log(
  JSON.stringify(
    {
      ok:
        report.overall_status === "ready_for_live_operation" ||
        probeMode === "dry_run",
      schema: "iris_production_live_readiness_cli_v1",
      production_live_readiness: report,
      boundary_policy: {
        env_names_only: true,
        script_names_only: true,
        counts_statuses_booleans_and_policy_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_live_payloads: true,
        no_text_payloads: true,
        no_memory_records: true,
        no_relationship_records: true,
        no_candidates: true,
        no_commands: true,
        no_raw_frames: true,
        no_raw_scheduler_results: true,
        no_raw_stream_state: true,
        read_only_cli: true,
        no_polling_side_effects: true,
        no_control_side_effects: true,
        synthetic_fixture_post_only: true,
      },
    },
    null,
    2
  )
);

async function waitForRuntimeReadiness({
  env = process.env,
  timeoutMs = 3000,
  intervalMs = 250,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const snapshot = await readRuntimeSnapshot({ env });
      if (snapshot) return snapshot;
    } catch {
      // keep retrying until overlay runtime responds
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

async function readRuntimeSnapshot({ env = process.env } = {}) {
  const urls = runtimeSnapshotUrls(env);
  const [
    statusResponse,
    streamResponse,
    ingestResponse,
    stateResponse,
    gameplayRuntimeResponse,
    persistenceRuntimeResponse,
  ] = await Promise.all([
    fetchWithTimeout(`${urls.httpBase}/overlay/status`),
    fetchWithTimeout(`${urls.httpBase}/overlay/events/status`),
    fetchWithTimeout(`${urls.httpBase}/ingest/status`),
    fetchWithTimeout(`${urls.httpBase}/state`),
    fetchWithTimeout(`${urls.httpBase}/production/gameplay-runtime-status`),
    fetchWithTimeout(`${urls.httpBase}/production/persistence-runtime-status`),
  ]);
  if (
    !statusResponse.ok ||
    !streamResponse.ok ||
    !ingestResponse.ok ||
    !stateResponse.ok ||
    !gameplayRuntimeResponse.ok ||
    !persistenceRuntimeResponse.ok
  ) {
    return null;
  }
  const [
    statusBody,
    streamBody,
    ingestBody,
    stateBody,
    gameplayRuntimeBody,
    persistenceRuntimeBody,
  ] = await Promise.all([
    statusResponse.json(),
    streamResponse.json(),
    ingestResponse.json(),
    stateResponse.json(),
    gameplayRuntimeResponse.json(),
    persistenceRuntimeResponse.json(),
  ]);
  const eventStreamStatus =
    streamBody?.overlay_event_stream_status ?? streamBody?.overlay_event_stream ?? null;
  const ingestStatus = ingestBody?.http_ingest_scheduler ?? null;
  const runtimeHistory = Array.isArray(stateBody?.history) ? stateBody.history : [];
  const runtimeIngestEventSeen =
    ingestStatus?.processed_count > 0 &&
    runtimeHistory.some((item) => item?.payload_kind === "comment") &&
    runtimeHistory.some((item) => item?.payload_kind === "donation_event");
  if (eventStreamStatus?.stream_ready !== true) {
    return null;
  }
  if (
    runtimeIngestEventSeen !== true &&
    hasOverlayRuntimeStartupEvidence(runtimeHistory) !== true
  ) {
    return null;
  }
  const manifestResponse = await fetchWithTimeout(
    `${urls.bridgeBase}/event-render-manifests/latest`
  );
  if (!manifestResponse.ok) return null;
  const manifestBody = await manifestResponse.json();
  const manifestReport = manifestBody?.event_render_manifest_report ?? null;
  if (
    manifestReport?.manifest_available !== true ||
    manifestReport?.obs_handoff_readiness_status !== "ready"
  ) {
    return null;
  }
  return {
    streamState: {
      get: () => stateBody,
    },
    overlayEventBus: {
      status: () => eventStreamStatus,
    },
    httpIngestScheduler: {
      status: () => ingestStatus,
    },
    gameplayRuntimeStatus:
      gameplayRuntimeBody?.gameplay_runtime_status ?? null,
    persistenceRuntimeStatus:
      persistenceRuntimeBody?.persistence_runtime_status ?? null,
  };
}

async function fetchWithTimeout(source, init = {}) {
  const { timeoutMs = 500, ...fetchInit } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(source, { ...fetchInit, signal: fetchInit.signal ?? controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function runtimeSnapshotUrls(env) {
  const httpHost = optionalEnvValue(env.IRIS_HTTP_HOST) ?? "127.0.0.1";
  const httpPort = optionalEnvValue(env.IRIS_HTTP_PORT) ?? "8787";
  const bridgeHost = optionalEnvValue(env.IRIS_LOCAL_BRIDGE_HOST) ?? "127.0.0.1";
  const bridgePort = optionalEnvValue(env.IRIS_LOCAL_BRIDGE_PORT) ?? "8790";
  return {
    httpBase: `http://${httpHost}:${httpPort}`,
    bridgeBase: `http://${bridgeHost}:${bridgePort}`,
  };
}

function hasOverlayRuntimeStartupEvidence(runtimeHistory) {
  return runtimeHistory.some(
    (item) =>
      item?.payload_kind === "overlay_runtime_startup" ||
      item?.source === "local_streaming_runtime_startup"
  );
}

function createStartRuntimeEnv(env) {
  const checkTempDir = mkdtempSync(join(tmpdir(), "iris-production-live-readiness-runtime-"));
  const useConfiguredStorage =
    env.IRIS_LOCAL_STREAMING_RUNTIME_CHECK_USE_CONFIGURED_STORAGE === "true";
  const useConfiguredPorts =
    env.IRIS_LOCAL_STREAMING_RUNTIME_CHECK_USE_CONFIGURED_PORTS === "true";
  const isolatedPorts = createIsolatedPortEnv();
  const cleanEnv = {
    ...env,
    ...(useConfiguredPorts ? {} : isolatedPorts),
    IRIS_LOCAL_BRIDGE_OUTBOX_DIR:
      useConfiguredStorage && optionalEnvValue(env.IRIS_LOCAL_BRIDGE_OUTBOX_DIR)
        ? env.IRIS_LOCAL_BRIDGE_OUTBOX_DIR
        : join(checkTempDir, "outbox"),
    IRIS_LOCAL_BRIDGE_ARTIFACT_DIR:
      useConfiguredStorage && optionalEnvValue(env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR)
        ? env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR
        : join(checkTempDir, "artifacts"),
    IRIS_LOCAL_GAME_BRIDGE_SIMULATED:
      optionalEnvValue(env.IRIS_LOCAL_GAME_BRIDGE_SIMULATED) || "true",
    IRIS_LOCAL_GAME_OBSERVATION_SIMULATED:
      optionalEnvValue(env.IRIS_LOCAL_GAME_OBSERVATION_SIMULATED) || "true",
    IRIS_LIVE2D_REQUIRE_RENDERER:
      optionalEnvValue(env.IRIS_LIVE2D_REQUIRE_RENDERER) || "false",
    IRIS_VOICEVOX_ALLOW_LOCAL_PREVIEW_FALLBACK:
      optionalEnvValue(env.IRIS_VOICEVOX_ALLOW_LOCAL_PREVIEW_FALLBACK) || "true",
  };
  if (
    cleanEnv.IRIS_YOUTUBE_RELAY_USE_FIXTURES ||
    cleanEnv.IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT ||
    cleanEnv.IRIS_YOUTUBE_RELAY_ENDPOINT ||
    cleanEnv.IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT ||
    cleanEnv.IRIS_YOUTUBE_LIVE_CHAT_ID ||
    cleanEnv.IRIS_YOUTUBE_VIDEO_ID ||
    cleanEnv.IRIS_YOUTUBE_VIDEO_URL ||
    cleanEnv.IRIS_YOUTUBE_WATCH_URL ||
    cleanEnv.IRIS_YOUTUBE_DATA_API_KEY ||
    cleanEnv.IRIS_YOUTUBE_API_KEY ||
    cleanEnv.IRIS_YOUTUBE_LIVE_CHAT_API_KEY ||
    cleanEnv.IRIS_YOUTUBE_OAUTH_TOKEN ||
    cleanEnv.IRIS_YOUTUBE_ACCESS_TOKEN ||
    cleanEnv.IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN ||
    cleanEnv.IRIS_YOUTUBE_REFRESH_TOKEN ||
    cleanEnv.YOUTUBE_RELAY_UPSTREAM_ENDPOINT ||
    cleanEnv.YOUTUBE_RELAY_ENDPOINT ||
    cleanEnv.YOUTUBE_LIVE_CHAT_ENDPOINT ||
    cleanEnv.YOUTUBE_LIVE_CHAT_ID ||
    cleanEnv.YOUTUBE_CHAT_ID ||
    cleanEnv.YOUTUBE_ACTIVE_LIVE_CHAT_ID ||
    cleanEnv.YOUTUBE_VIDEO_ID ||
    cleanEnv.YOUTUBE_VIDEO_URL ||
    cleanEnv.YOUTUBE_WATCH_URL ||
    cleanEnv.YOUTUBE_LIVE_URL ||
    cleanEnv.YOUTUBE_STREAM_URL ||
    cleanEnv.YOUTUBE_URL ||
    cleanEnv.YOUTUBE_API_KEY ||
    cleanEnv.GOOGLE_API_KEY ||
    cleanEnv.YOUTUBE_OAUTH_TOKEN ||
    cleanEnv.YOUTUBE_ACCESS_TOKEN ||
    cleanEnv.YOUTUBE_OAUTH_REFRESH_TOKEN ||
    cleanEnv.YOUTUBE_REFRESH_TOKEN
  ) {
    return cleanEnv;
  }
  return {
    ...cleanEnv,
    IRIS_YOUTUBE_RELAY_USE_FIXTURES: "true",
  };
}

function createIsolatedPortEnv() {
  const base = 28_000 + (process.pid % 10_000);
  const bridgeBaseUrl = `http://127.0.0.1:${base + 1}`;
  return {
    IRIS_HTTP_PORT: String(base),
    IRIS_LOCAL_BRIDGE_PORT: String(base + 1),
    IRIS_YOUTUBE_RELAY_PORT: String(base + 2),
    IRIS_YOUTUBE_RELAY_BRIDGE_PORT: String(base + 2),
    IRIS_LOCAL_RESPONSE_PROVIDER_PORT: String(base + 3),
    IRIS_VOICEVOX_BRIDGE_PORT: String(base + 4),
    IRIS_LIVE2D_CUE_BRIDGE_PORT: String(base + 5),
    IRIS_LOCAL_SUBTITLE_ENGINE_PORT: String(base + 6),
    IRIS_MEMORY_VECTOR_BRIDGE_PORT: String(base + 7),
    IRIS_LOCAL_GAME_BRIDGE_PORT: String(base + 8),
    IRIS_TTS_ENDPOINT: "",
    IRIS_LOCAL_TTS_BRIDGE_ENDPOINT: `${bridgeBaseUrl}/tts`,
    IRIS_LIVE2D_ENDPOINT: "",
    IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT: `${bridgeBaseUrl}/live2d`,
    IRIS_SUBTITLE_ENDPOINT: "",
    IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT: `${bridgeBaseUrl}/subtitle`,
    IRIS_MEMORY_SEARCH_ENDPOINT: `http://127.0.0.1:${base + 7}/memory-search`,
    IRIS_GAME_OBSERVATION_ENDPOINT: `http://127.0.0.1:${base + 8}/game-observation`,
    IRIS_GAME_CONTROL_ENDPOINT: `http://127.0.0.1:${base + 8}/game-control`,
  };
}

function optionalEnvValue(value) {
  const text = String(value ?? "").trim();
  return text ? value : undefined;
}
