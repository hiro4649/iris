import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { postObsBridgeSetup } from "./obsBridgeSetup.js";

const DEFAULT_NODE_ARGS_BY_SERVICE = {
  youtube_relay: ["scripts/dev-youtube-relay-bridge.js"],
  response_provider: ["scripts/dev-local-response-provider.js"],
  voicevox_bridge: ["scripts/dev-voicevox-tts-engine-bridge.js"],
  live2d_cue_bridge: ["scripts/dev-live2d-cue-engine-bridge.js"],
  subtitle_engine: ["scripts/dev-local-subtitle-engine.js"],
  memory_vector: ["scripts/dev-memory-vector-bridge.js"],
  game_bridge: ["scripts/dev-local-game-bridge.js"],
  bridge: ["scripts/dev-local-bridge.js"],
  worker: ["scripts/dev-bridge-worker.js", "--watch"],
  dev_server: ["scripts/dev-server.js"],
};
const BRIDGE_READY_TIMEOUT_MS = 10_000;
const RENDER_HANDOFF_READY_TIMEOUT_MS = 45_000;
const BRIDGE_READY_POLL_MS = 250;

export function createLocalStreamingRuntimePlan({
  nodeExecutable = process.execPath,
  cwd = process.cwd(),
  env = process.env,
} = {}) {
  const runtimeEnv = createRuntimeEnvironment(env);
  return {
    ok: true,
    schema: "iris_local_streaming_runtime_startup_plan_v1",
    services: [
      ...(shouldStartYouTubeRelay(runtimeEnv)
        ? [
            createServicePlan({
              id: "youtube_relay",
              role: "youtube_live_chat_relay_bridge",
              nodeExecutable,
              cwd,
              env: runtimeEnv,
            }),
          ]
        : []),
      ...(shouldStartResponseProvider(runtimeEnv)
        ? [
            createServicePlan({
              id: "response_provider",
              role: "local_response_provider",
              nodeExecutable,
              cwd,
              env: runtimeEnv,
            }),
          ]
        : []),
      ...(shouldStartVoicevoxBridge(runtimeEnv)
        ? [
            createServicePlan({
              id: "voicevox_bridge",
              role: "voicevox_tts_engine_bridge",
              nodeExecutable,
              cwd,
              env: runtimeEnv,
            }),
          ]
        : []),
      ...(shouldStartLive2dCueBridge(runtimeEnv)
        ? [
            createServicePlan({
              id: "live2d_cue_bridge",
              role: "live2d_cue_engine_bridge",
              nodeExecutable,
              cwd,
              env: runtimeEnv,
            }),
          ]
        : []),
      ...(shouldStartSubtitleEngine(runtimeEnv)
        ? [
            createServicePlan({
              id: "subtitle_engine",
              role: "local_subtitle_engine",
              nodeExecutable,
              cwd,
              env: runtimeEnv,
            }),
          ]
        : []),
      createServicePlan({
        id: "memory_vector",
        role: "local_memory_vector_search_bridge",
        nodeExecutable,
        cwd,
        env: runtimeEnv,
      }),
      createServicePlan({
        id: "game_bridge",
        role: "local_game_observation_and_control_bridge",
        nodeExecutable,
        cwd,
        env: runtimeEnv,
      }),
      createServicePlan({
        id: "bridge",
        role: "local_adapter_bridge",
        nodeExecutable,
        cwd,
        env: runtimeEnv,
      }),
      createServicePlan({
        id: "worker",
        role: "local_bridge_engine_worker",
        nodeExecutable,
        cwd,
        env: runtimeEnv,
      }),
      createServicePlan({
        id: "dev_server",
        role: "iris_http_overlay_runtime",
        nodeExecutable,
        cwd,
        env: runtimeEnv,
      }),
    ],
    startup_contract: {
      starts_local_bridge: true,
      starts_voicevox_bridge_when_configured: shouldStartVoicevoxBridge(runtimeEnv),
      starts_live2d_cue_bridge_when_configured: shouldStartLive2dCueBridge(runtimeEnv),
      starts_worker_watch_loop: true,
      starts_http_overlay_runtime: true,
      starts_youtube_relay_when_configured: shouldStartYouTubeRelay(runtimeEnv),
      worker_watch_mode: true,
      stops_all_services_when_one_exits: true,
      forwards_interrupt_signals: true,
    },
  };
}

export function startLocalStreamingRuntime({
  nodeExecutable = process.execPath,
  cwd = process.cwd(),
  env = process.env,
  stdio = "inherit",
  logger = console,
} = {}) {
  const runtimeEnv = createRuntimeEnvironment(env);
  const plan = createLocalStreamingRuntimePlan({
    nodeExecutable,
    cwd,
    env: runtimeEnv,
  });
  const children = new Map();
  let shuttingDown = false;

  const stopAll = (signal = "SIGTERM") => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const child of children.values()) {
      if (!child.killed && child.exitCode === null) {
        child.kill(signal);
      }
    }
  };

  for (const service of plan.services) {
    if (service.id === "worker") {
      waitForStreamingDependencies({ env: runtimeEnv })
        .catch(() => null)
        .then(() => spawnServiceIfNeeded(service));
    } else if (service.id === "dev_server") {
      waitForStreamingDependencies({ env: runtimeEnv })
        .catch(() => null)
        .then(() => spawnServiceIfNeeded(service));
    } else {
      spawnServiceIfNeeded(service);
    }
  }

  async function spawnServiceIfNeeded(service) {
    if (await isReusableRunningService(service.id, runtimeEnv, cwd)) {
      if (service.id === "dev_server") {
        seedDevServerOverlayRuntime({ env: runtimeEnv }).catch(() => null);
      }
      return;
    }
    spawnService(service);
  }

  function spawnService(service) {
    if (shuttingDown) return;
    const child = spawn(service.command, service.args, {
      cwd,
      env: runtimeEnv,
      stdio,
      windowsHide: true,
    });
    if (stdio === "ignore") child.unref();
    children.set(service.id, child);
    if (service.id === "dev_server") {
      seedDevServerOverlayRuntime({ env: runtimeEnv }).catch(() => null);
    }
    child.on("exit", (code, signal) => {
      if (service.id === "worker" && code === 0 && signal === null) {
        children.delete(service.id);
        return;
      }
      logger.error?.(
        JSON.stringify({
          ok: false,
          schema: "iris_local_streaming_runtime_service_exit_v1",
          service_id: service.id,
          code,
          signal,
        })
      );
      stopAll();
    });
  }

  process.once("SIGINT", () => stopAll("SIGINT"));
  process.once("SIGTERM", () => stopAll("SIGTERM"));

  return {
    plan,
    children,
    env: runtimeEnv,
    stopAll,
  };
}

async function isReusableRunningService(serviceId, env, cwd = process.cwd()) {
  if (serviceId === "worker") return isReusableWorkerWatchLockActive(env, cwd);
  const healthUrl = serviceHealthUrl(serviceId, env);
  if (!healthUrl) return false;
  try {
    const response = await fetch(healthUrl);
    return response.ok;
  } catch {
    return false;
  }
}

function isReusableWorkerWatchLockActive(env, cwd = process.cwd()) {
  const lockPath = resolveWorkerWatchLockPath(env, cwd);
  if (!existsSync(lockPath)) return false;
  try {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    const acquiredAtMs = Number(lock.acquired_at_ms ?? 0);
    const pid = Number(lock.pid ?? 0);
    const maxAgeMs = clampNumber(
      env.IRIS_LOCAL_BRIDGE_WORKER_LOCK_MAX_AGE_MS,
      60_000,
      86_400_000,
      3_600_000
    );
    return (
      Number.isFinite(acquiredAtMs) &&
      Date.now() - acquiredAtMs <= maxAgeMs &&
      isProcessProbablyAlive(pid)
    );
  } catch {
    return false;
  }
}

export function resolveWorkerWatchLockPath(env, cwd = process.cwd()) {
  const artifactDir =
    optionalEnvValue(env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR) ?? "data/local_bridge_artifacts";
  return join(isAbsolute(artifactDir) ? artifactDir : join(cwd, artifactDir), "worker-watch.lock");
}

function isProcessProbablyAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function serviceHealthUrl(serviceId, env) {
  const healthTargets = {
    youtube_relay: [env.IRIS_YOUTUBE_RELAY_HOST, env.IRIS_YOUTUBE_RELAY_PORT, "9111"],
    response_provider: [
      env.IRIS_LOCAL_RESPONSE_PROVIDER_HOST,
      env.IRIS_LOCAL_RESPONSE_PROVIDER_PORT,
      "9120",
    ],
    voicevox_bridge: [env.IRIS_VOICEVOX_BRIDGE_HOST, env.IRIS_VOICEVOX_BRIDGE_PORT, "9110"],
    live2d_cue_bridge: [
      env.IRIS_LIVE2D_CUE_BRIDGE_HOST,
      env.IRIS_LIVE2D_CUE_BRIDGE_PORT,
      "9113",
    ],
    subtitle_engine: [
      env.IRIS_LOCAL_SUBTITLE_ENGINE_HOST,
      env.IRIS_LOCAL_SUBTITLE_ENGINE_PORT,
      "9121",
    ],
    memory_vector: [
      env.IRIS_MEMORY_VECTOR_BRIDGE_HOST,
      env.IRIS_MEMORY_VECTOR_BRIDGE_PORT,
      "9109",
    ],
    game_bridge: [env.IRIS_LOCAL_GAME_BRIDGE_HOST, env.IRIS_LOCAL_GAME_BRIDGE_PORT, "9112"],
    bridge: [env.IRIS_LOCAL_BRIDGE_HOST, env.IRIS_LOCAL_BRIDGE_PORT, "8790"],
    dev_server: [env.IRIS_HTTP_HOST, env.IRIS_HTTP_PORT, "8787"],
  };
  const target = healthTargets[serviceId];
  if (target) return `http://${target[0] ?? "127.0.0.1"}:${target[1] ?? target[2]}/health`;
  return null;
}

function createServicePlan({ id, role, nodeExecutable, cwd, env }) {
  return {
    id,
    role,
    command: nodeExecutable,
    args: DEFAULT_NODE_ARGS_BY_SERVICE[id],
    cwd_configured: cwd !== "",
    env_contract: createEnvContract({ id, env }),
  };
}

async function waitForLocalBridgeHealth({ env }) {
  const host = optionalEnvValue(env.IRIS_LOCAL_BRIDGE_HOST) ?? "127.0.0.1";
  const port = optionalEnvValue(env.IRIS_LOCAL_BRIDGE_PORT) ?? "8790";
  const deadline = Date.now() + RENDER_HANDOFF_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${host}:${port}/health`);
      if (response.ok) return true;
    } catch {
      // Keep polling until the bridge opens or timeout expires.
    }
    await sleep(BRIDGE_READY_POLL_MS);
  }
  return false;
}

async function waitForStreamingDependencies({ env }) {
  const healthChecks = [
    waitForLocalBridgeHealth({ env }),
    waitForMemoryVectorBridgeHealth({ env }),
    waitForGameBridgeHealth({ env }),
  ];
  if (shouldStartVoicevoxBridge(env)) healthChecks.push(waitForVoicevoxBridgeHealth({ env }));
  if (shouldStartLive2dCueBridge(env)) healthChecks.push(waitForLive2dCueBridgeHealth({ env }));
  if (shouldStartSubtitleEngine(env)) healthChecks.push(waitForSubtitleEngineHealth({ env }));
  if (shouldStartYouTubeRelay(env)) healthChecks.push(waitForYouTubeRelayHealth({ env }));
  if (shouldStartResponseProvider(env)) healthChecks.push(waitForResponseProviderHealth({ env }));
  await Promise.all(healthChecks);
}

async function waitForGameBridgeHealth({ env }) {
  const host = optionalEnvValue(env.IRIS_LOCAL_GAME_BRIDGE_HOST) ?? "127.0.0.1";
  const port = optionalEnvValue(env.IRIS_LOCAL_GAME_BRIDGE_PORT) ?? "9112";
  const deadline = Date.now() + RENDER_HANDOFF_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${host}:${port}/health`);
      if (response.ok) return true;
    } catch {
      // Keep polling until the local game bridge opens or timeout expires.
    }
    await sleep(BRIDGE_READY_POLL_MS);
  }
  return false;
}

async function waitForMemoryVectorBridgeHealth({ env }) {
  const host = optionalEnvValue(env.IRIS_MEMORY_VECTOR_BRIDGE_HOST) ?? "127.0.0.1";
  const port = optionalEnvValue(env.IRIS_MEMORY_VECTOR_BRIDGE_PORT) ?? "9109";
  const deadline = Date.now() + BRIDGE_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${host}:${port}/health`);
      if (response.ok) return true;
    } catch {
      // Keep polling until the vector bridge opens or timeout expires.
    }
    await sleep(BRIDGE_READY_POLL_MS);
  }
  return false;
}

async function waitForYouTubeRelayHealth({ env }) {
  const host = optionalEnvValue(env.IRIS_YOUTUBE_RELAY_HOST) ?? "127.0.0.1";
  const port = optionalEnvValue(env.IRIS_YOUTUBE_RELAY_PORT) ?? "9111";
  const deadline = Date.now() + BRIDGE_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${host}:${port}/health`);
      if (response.ok) return true;
    } catch {
      // Keep polling until the relay opens or timeout expires.
    }
    await sleep(BRIDGE_READY_POLL_MS);
  }
  return false;
}

async function waitForResponseProviderHealth({ env }) {
  const host = optionalEnvValue(env.IRIS_LOCAL_RESPONSE_PROVIDER_HOST) ?? "127.0.0.1";
  const port = optionalEnvValue(env.IRIS_LOCAL_RESPONSE_PROVIDER_PORT) ?? "9120";
  const deadline = Date.now() + BRIDGE_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${host}:${port}/health`);
      if (response.ok) return true;
    } catch {
      // Keep polling until the local response provider opens or timeout expires.
    }
    await sleep(BRIDGE_READY_POLL_MS);
  }
  return false;
}

async function waitForVoicevoxBridgeHealth({ env }) {
  const host = optionalEnvValue(env.IRIS_VOICEVOX_BRIDGE_HOST) ?? "127.0.0.1";
  const port = optionalEnvValue(env.IRIS_VOICEVOX_BRIDGE_PORT) ?? "9110";
  const deadline = Date.now() + BRIDGE_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${host}:${port}/health`);
      if (response.ok) return true;
    } catch {
      // Keep polling until the VOICEVOX bridge opens or timeout expires.
    }
    await sleep(BRIDGE_READY_POLL_MS);
  }
  return false;
}

async function waitForLive2dCueBridgeHealth({ env }) {
  const host = optionalEnvValue(env.IRIS_LIVE2D_CUE_BRIDGE_HOST) ?? "127.0.0.1";
  const port = optionalEnvValue(env.IRIS_LIVE2D_CUE_BRIDGE_PORT) ?? "9113";
  const deadline = Date.now() + BRIDGE_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${host}:${port}/health`);
      if (response.ok) return true;
    } catch {
      // Keep polling until the Live2D cue bridge opens or timeout expires.
    }
    await sleep(BRIDGE_READY_POLL_MS);
  }
  return false;
}

async function waitForSubtitleEngineHealth({ env }) {
  const host = optionalEnvValue(env.IRIS_LOCAL_SUBTITLE_ENGINE_HOST) ?? "127.0.0.1";
  const port = optionalEnvValue(env.IRIS_LOCAL_SUBTITLE_ENGINE_PORT) ?? "9121";
  const deadline = Date.now() + BRIDGE_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${host}:${port}/health`);
      if (response.ok) return true;
    } catch {
      // Keep polling until the local subtitle engine opens or timeout expires.
    }
    await sleep(BRIDGE_READY_POLL_MS);
  }
  return false;
}

async function seedDevServerOverlayRuntime({ env }) {
  await waitForDevServerHealth({ env });
  const host = optionalEnvValue(env.IRIS_HTTP_HOST) ?? "127.0.0.1";
  const port = optionalEnvValue(env.IRIS_HTTP_PORT) ?? "8787";
  const deadline = Date.now() + BRIDGE_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${host}:${port}/idle-tick`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idle_reason: "supervisor_startup_overlay_seed" }),
      });
      const overlayRuntimeEventId = response.ok
        ? await readOverlayRuntimeReadyEventId({ host, port })
        : "";
      if (overlayRuntimeEventId) {
        const renderHandoffReady = await waitForLocalBridgeRenderHandoff({
          env,
          expectedEventId: overlayRuntimeEventId,
        });
        if (!renderHandoffReady) continue;
        const obsSetupReady = await setupObsOverlayIfConfigured({
          env,
          origin: `http://${host}:${port}`,
        });
        if (env.IRIS_OBS_BRIDGE_ENDPOINT && !obsSetupReady) continue;
        return true;
      }
    } catch {
      // Keep retrying until the runtime can process the startup seed.
    }
    await sleep(BRIDGE_READY_POLL_MS);
  }
  return false;
}

async function setupObsOverlayIfConfigured({ env, origin }) {
  if (!env.IRIS_OBS_BRIDGE_ENDPOINT) return false;
  const report = await postObsBridgeSetup({
    endpoint: env.IRIS_OBS_BRIDGE_ENDPOINT,
    apiKey: env.IRIS_OBS_BRIDGE_API_KEY ?? env.IRIS_LOCAL_BRIDGE_API_KEY ?? "",
    origin: env.IRIS_HTTP_ORIGIN || origin,
    sourceName: env.IRIS_OBS_SOURCE_NAME ?? "IRIS Overlay",
    sceneName: env.IRIS_OBS_SCENE_NAME ?? "",
    width: env.IRIS_OBS_SOURCE_WIDTH ?? 1280,
    height: env.IRIS_OBS_SOURCE_HEIGHT ?? 720,
    fps: env.IRIS_OBS_SOURCE_FPS ?? 30,
    shutdownSourceWhenNotVisible:
      env.IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE === "true",
    refreshBrowserWhenSceneBecomesActive:
      env.IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE === "true",
    timeoutMs: Number(env.IRIS_OBS_BRIDGE_TIMEOUT_MS ?? 5000),
    continueOnError: env.IRIS_OBS_BRIDGE_SETUP_STRICT !== "true",
  });
  return report?.configured === true;
}

async function waitForLocalBridgeRenderHandoff({ env, expectedEventId = "" }) {
  const host = optionalEnvValue(env.IRIS_LOCAL_BRIDGE_HOST) ?? "127.0.0.1";
  const port = optionalEnvValue(env.IRIS_LOCAL_BRIDGE_PORT) ?? "8790";
  const deadline = Date.now() + BRIDGE_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(
        `http://${host}:${port}/event-render-manifests/latest`
      );
      if (response.ok) {
        const body = await response.json();
        const report = body?.event_render_manifest_report ?? {};
        if (
          report.manifest_available === true &&
          report.obs_handoff_readiness_status === "ready"
        ) {
          return true;
        }
      }
    } catch {
      // Keep waiting while the worker drains initial runtime jobs.
    }
    await sleep(BRIDGE_READY_POLL_MS);
  }
  return false;
}

async function readOverlayRuntimeReadyEventId({ host, port }) {
  const [statusResponse, eventsResponse] = await Promise.all([
    fetch(`http://${host}:${port}/overlay/status`),
    fetch(`http://${host}:${port}/overlay/events/status`),
  ]);
  if (!statusResponse.ok || !eventsResponse.ok) return "";
  const [statusBody, eventsBody] = await Promise.all([
    statusResponse.json(),
    eventsResponse.json(),
  ]);
  const overlayStatus = statusBody?.overlay_status ?? {};
  const ready =
    overlayStatus.health !== "empty" &&
    (eventsBody?.overlay_event_stream_status ?? eventsBody?.overlay_event_stream ?? {})
      .stream_ready === true;
  return ready ? "overlay_runtime_ready" : "";
}

async function waitForDevServerHealth({ env }) {
  const host = optionalEnvValue(env.IRIS_HTTP_HOST) ?? "127.0.0.1";
  const port = optionalEnvValue(env.IRIS_HTTP_PORT) ?? "8787";
  const deadline = Date.now() + BRIDGE_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${host}:${port}/health`);
      if (response.ok) return true;
    } catch {
      // Keep polling until the dev server opens or timeout expires.
    }
    await sleep(BRIDGE_READY_POLL_MS);
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createEnvContract({ id, env }) {
  if (id === "youtube_relay") {
    return {
      relay_source_configured: shouldStartYouTubeRelay(env),
      relay_host_configured:
        (env.IRIS_YOUTUBE_RELAY_HOST ?? "") !== "" ||
        (env.IRIS_YOUTUBE_RELAY_BRIDGE_HOST ?? "") !== "",
      relay_port_configured:
        (env.IRIS_YOUTUBE_RELAY_PORT ?? "") !== "" ||
        (env.IRIS_YOUTUBE_RELAY_BRIDGE_PORT ?? "") !== "",
    };
  }
  if (id === "bridge") {
    return {
      host_configured: (env.IRIS_LOCAL_BRIDGE_HOST ?? "") !== "",
      port_configured: (env.IRIS_LOCAL_BRIDGE_PORT ?? "") !== "",
      outbox_dir_configured: (env.IRIS_LOCAL_BRIDGE_OUTBOX_DIR ?? "") !== "",
      artifact_dir_configured: (env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR ?? "") !== "",
    };
  }
  if (id === "voicevox_bridge") {
    return {
      enabled: shouldStartVoicevoxBridge(env),
      host_configured: (env.IRIS_VOICEVOX_BRIDGE_HOST ?? "") !== "",
      port_configured: (env.IRIS_VOICEVOX_BRIDGE_PORT ?? "") !== "",
      voicevox_endpoint_configured: (env.IRIS_VOICEVOX_ENDPOINT ?? "") !== "",
      local_tts_engine_endpoint_configured:
        (env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT ?? "") !== "",
    };
  }
  if (id === "live2d_cue_bridge") {
    return {
      enabled: shouldStartLive2dCueBridge(env),
      host_configured: (env.IRIS_LIVE2D_CUE_BRIDGE_HOST ?? "") !== "",
      port_configured: (env.IRIS_LIVE2D_CUE_BRIDGE_PORT ?? "") !== "",
      renderer_endpoint_configured:
        (env.IRIS_LIVE2D_RENDERER_ENDPOINT ?? "") !== "" ||
        (env.IRIS_LIVE2D_CUE_ENDPOINT ?? "") !== "",
      local_live2d_engine_endpoint_configured:
        (env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT ?? "") !== "",
    };
  }
  if (id === "subtitle_engine") {
    return {
      enabled: shouldStartSubtitleEngine(env),
      host_configured: (env.IRIS_LOCAL_SUBTITLE_ENGINE_HOST ?? "") !== "",
      port_configured: (env.IRIS_LOCAL_SUBTITLE_ENGINE_PORT ?? "") !== "",
      local_subtitle_engine_endpoint_configured:
        (env.IRIS_LOCAL_SUBTITLE_ENGINE_ENDPOINT ?? "") !== "",
    };
  }
  if (id === "memory_vector") {
    return {
      host_configured: (env.IRIS_MEMORY_VECTOR_BRIDGE_HOST ?? "") !== "",
      port_configured: (env.IRIS_MEMORY_VECTOR_BRIDGE_PORT ?? "") !== "",
      memory_search_adapter_configured:
        env.IRIS_MEMORY_SEARCH_ADAPTER === "http_vector",
      memory_search_endpoint_configured:
        (env.IRIS_MEMORY_SEARCH_ENDPOINT ?? "") !== "",
    };
  }
  if (id === "game_bridge") {
    return {
      host_configured: (env.IRIS_LOCAL_GAME_BRIDGE_HOST ?? "") !== "",
      port_configured: (env.IRIS_LOCAL_GAME_BRIDGE_PORT ?? "") !== "",
      observation_endpoint_configured:
        (env.IRIS_GAME_OBSERVATION_ENDPOINT ?? "") !== "",
      control_endpoint_configured: (env.IRIS_GAME_CONTROL_ENDPOINT ?? "") !== "",
    };
  }
  if (id === "dev_server") {
    return {
      host_configured: (env.IRIS_HTTP_HOST ?? "") !== "",
      port_configured: (env.IRIS_HTTP_PORT ?? "") !== "",
      idle_scheduler_configured: env.IRIS_ENABLE_IDLE_SCHEDULER === "true",
      http_ingest_scheduler_configured:
        env.IRIS_ENABLE_HTTP_INGEST_SCHEDULER === "true",
      tts_bridge_endpoint_configured:
        (env.IRIS_TTS_ENDPOINT ?? "") !== "" ||
        (env.IRIS_LOCAL_TTS_BRIDGE_ENDPOINT ?? "") !== "",
      live2d_bridge_endpoint_configured:
        (env.IRIS_LIVE2D_ENDPOINT ?? "") !== "" ||
        (env.IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT ?? "") !== "",
      subtitle_bridge_endpoint_configured:
        (env.IRIS_SUBTITLE_ENDPOINT ?? "") !== "" ||
        (env.IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT ?? "") !== "",
    };
  }
  return {
    watch_mode_forced_by_args: true,
    tts_engine_endpoint_configured:
      (env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT ?? "") !== "",
    live2d_engine_endpoint_configured:
      (env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT ?? "") !== "",
    subtitle_engine_endpoint_configured:
      (env.IRIS_LOCAL_SUBTITLE_ENGINE_ENDPOINT ?? "") !== "",
    retry_policy_configurable: true,
  };
}

function createRuntimeEnvironment(baseEnv = process.env) {
  const localBridgeHost = optionalEnvValue(baseEnv.IRIS_LOCAL_BRIDGE_HOST) ?? "127.0.0.1";
  const localBridgePort = optionalEnvValue(baseEnv.IRIS_LOCAL_BRIDGE_PORT) ?? "8790";
  const httpHost = optionalEnvValue(baseEnv.IRIS_HTTP_HOST) ?? "127.0.0.1";
  const httpPort = optionalEnvValue(baseEnv.IRIS_HTTP_PORT) ?? "8787";
  const youTubeRelayHost =
    optionalEnvValue(baseEnv.IRIS_YOUTUBE_RELAY_HOST) ??
    optionalEnvValue(baseEnv.IRIS_YOUTUBE_RELAY_BRIDGE_HOST) ??
    "127.0.0.1";
  const youTubeRelayPort =
    optionalEnvValue(baseEnv.IRIS_YOUTUBE_RELAY_PORT) ??
    optionalEnvValue(baseEnv.IRIS_YOUTUBE_RELAY_BRIDGE_PORT) ??
    "9111";
  const outboxDir =
    optionalEnvValue(baseEnv.IRIS_LOCAL_BRIDGE_OUTBOX_DIR) ?? "data/local_bridge_outbox";
  const artifactDir =
    optionalEnvValue(baseEnv.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR) ??
    "data/local_bridge_artifacts";
  const memoryVectorBridgeHost =
    optionalEnvValue(baseEnv.IRIS_MEMORY_VECTOR_BRIDGE_HOST) ?? "127.0.0.1";
  const memoryVectorBridgePort =
    optionalEnvValue(baseEnv.IRIS_MEMORY_VECTOR_BRIDGE_PORT) ?? "9109";
  const responseProviderHost =
    optionalEnvValue(baseEnv.IRIS_LOCAL_RESPONSE_PROVIDER_HOST) ?? "127.0.0.1";
  const responseProviderPort =
    optionalEnvValue(baseEnv.IRIS_LOCAL_RESPONSE_PROVIDER_PORT) ?? "9120";
  const gameBridgeHost =
    optionalEnvValue(baseEnv.IRIS_LOCAL_GAME_BRIDGE_HOST) ?? "127.0.0.1";
  const gameBridgePort = optionalEnvValue(baseEnv.IRIS_LOCAL_GAME_BRIDGE_PORT) ?? "9112";
  const voicevoxBridgeHost =
    optionalEnvValue(baseEnv.IRIS_VOICEVOX_BRIDGE_HOST) ?? "127.0.0.1";
  const voicevoxBridgePort = optionalEnvValue(baseEnv.IRIS_VOICEVOX_BRIDGE_PORT) ?? "9110";
  const live2dCueBridgeHost =
    optionalEnvValue(baseEnv.IRIS_LIVE2D_CUE_BRIDGE_HOST) ?? "127.0.0.1";
  const live2dCueBridgePort =
    optionalEnvValue(baseEnv.IRIS_LIVE2D_CUE_BRIDGE_PORT) ?? "9113";
  const subtitleEngineHost =
    optionalEnvValue(baseEnv.IRIS_LOCAL_SUBTITLE_ENGINE_HOST) ?? "127.0.0.1";
  const subtitleEnginePort =
    optionalEnvValue(baseEnv.IRIS_LOCAL_SUBTITLE_ENGINE_PORT) ?? "9121";
  const bridgeBaseUrl = `http://${localBridgeHost}:${localBridgePort}`;
  const voicevoxBridgeBaseUrl = `http://${voicevoxBridgeHost}:${voicevoxBridgePort}`;
  const live2dCueBridgeBaseUrl = `http://${live2dCueBridgeHost}:${live2dCueBridgePort}`;
  const subtitleEngineBaseUrl = `http://${subtitleEngineHost}:${subtitleEnginePort}`;
  const youTubeRelayEndpoint =
    optionalEnvValue(baseEnv.IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT) ||
    optionalEnvValue(baseEnv.IRIS_YOUTUBE_RELAY_ENDPOINT) ||
    optionalEnvValue(baseEnv.IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT) ||
    optionalEnvValue(baseEnv.YOUTUBE_LIVE_CHAT_ENDPOINT) ||
    optionalEnvValue(baseEnv.YOUTUBE_RELAY_ENDPOINT) ||
    optionalEnvValue(baseEnv.YOUTUBE_RELAY_UPSTREAM_ENDPOINT) ||
    `http://${youTubeRelayHost}:${youTubeRelayPort}/youtube/live-chat`;
  const youTubeVideoId = resolveYouTubeVideoIdFromEnv(baseEnv);
  const youTubeLiveChatSource =
    normalizeYouTubeLiveChatSource(baseEnv.IRIS_YOUTUBE_LIVE_CHAT_SOURCE) ||
    (shouldUseYouTubeApiSource({ ...baseEnv, IRIS_YOUTUBE_VIDEO_ID: youTubeVideoId })
      ? "youtube_api"
      : "http");
  const useYouTubeApiSource = shouldUseYouTubeApiSource({
    ...baseEnv,
    IRIS_YOUTUBE_VIDEO_ID: youTubeVideoId,
  });
  const liveChatApiEndpoint = resolveYouTubeLiveChatApiEndpoint(baseEnv, {
    useYouTubeApiSource,
  });
  const memorySearchEndpoint =
    optionalEnvValue(baseEnv.IRIS_MEMORY_SEARCH_ENDPOINT) ??
    `http://${memoryVectorBridgeHost}:${memoryVectorBridgePort}/memory-search`;
  const gameBridgeBaseUrl = `http://${gameBridgeHost}:${gameBridgePort}`;
  const requireRealRuntimeAdapters =
    optionalEnvValue(baseEnv.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS) ?? "true";
  const youtubeRelayUseFixtures =
    optionalEnvValue(baseEnv.IRIS_YOUTUBE_RELAY_USE_FIXTURES) ||
    shouldUseYouTubeRelayFixtures({
      ...baseEnv,
      IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS: requireRealRuntimeAdapters,
    });
  const externalTtsEngineEndpoint = resolveExternalTtsEngineEndpoint(baseEnv);
  const hasExternalTtsEngineEndpoint =
    externalTtsEngineEndpoint !== "" &&
    !isLocalBridgeEngineEndpoint(externalTtsEngineEndpoint, {
      host: voicevoxBridgeHost,
      port: voicevoxBridgePort,
      defaultPort: "9110",
      path: "/tts-engine",
    });
  const externalLive2dEngineEndpoint = resolveExternalLive2dEngineEndpoint(baseEnv);
  const hasExternalLive2dEngineEndpoint =
    externalLive2dEngineEndpoint !== "" &&
    !isLocalBridgeEngineEndpoint(externalLive2dEngineEndpoint, {
      host: live2dCueBridgeHost,
      port: live2dCueBridgePort,
      defaultPort: "9113",
      path: "/live2d-engine",
    });
  const externalSubtitleEngineEndpoint =
    resolveExternalSubtitleEngineEndpoint(baseEnv) ||
    (!isLocalBridgeEngineEndpoint(
      optionalEnvValue(baseEnv.IRIS_SUBTITLE_ENDPOINT) ||
        optionalEnvValue(baseEnv.IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT),
      {
      host: localBridgeHost,
      port: localBridgePort,
      defaultPort: "8790",
      path: "/subtitle",
      }
    )
      ? optionalEnvValue(baseEnv.IRIS_SUBTITLE_ENDPOINT) ||
        optionalEnvValue(baseEnv.IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT)
      : "") ||
    "";
  const enableLocalSubtitleEngine =
    optionalEnvValue(baseEnv.IRIS_ENABLE_LOCAL_SUBTITLE_ENGINE) ||
    (requireRealRuntimeAdapters === "true" && !externalSubtitleEngineEndpoint
      ? "true"
      : "");
  const subtitleEngineEndpoint =
    externalSubtitleEngineEndpoint ||
    (enableLocalSubtitleEngine === "true"
      ? `${subtitleEngineBaseUrl}/subtitle-engine`
      : "");

  return {
    ...baseEnv,
    IRIS_LOCAL_BRIDGE_HOST: localBridgeHost,
    IRIS_LOCAL_BRIDGE_PORT: localBridgePort,
    IRIS_HTTP_HOST: httpHost,
    IRIS_HTTP_PORT: httpPort,
    IRIS_YOUTUBE_RELAY_HOST: youTubeRelayHost,
    IRIS_YOUTUBE_RELAY_PORT: youTubeRelayPort,
    IRIS_YOUTUBE_RELAY_BRIDGE_HOST: youTubeRelayHost,
    IRIS_YOUTUBE_RELAY_BRIDGE_PORT: youTubeRelayPort,
    IRIS_YOUTUBE_RELAY_USE_FIXTURES: youtubeRelayUseFixtures,
    IRIS_YOUTUBE_LIVE_CHAT_SOURCE: youTubeLiveChatSource,
    IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT: youTubeRelayEndpoint,
    IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT: liveChatApiEndpoint,
    IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT) ||
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_RELAY_ENDPOINT) ||
      optionalEnvValue(baseEnv.YOUTUBE_RELAY_UPSTREAM_ENDPOINT) ||
      optionalEnvValue(baseEnv.YOUTUBE_LIVE_CHAT_ENDPOINT) ||
      optionalEnvValue(baseEnv.YOUTUBE_RELAY_ENDPOINT) ||
      "",
    IRIS_YOUTUBE_RELAY_UPSTREAM_API_KEY:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_RELAY_UPSTREAM_API_KEY) ||
      optionalEnvValue(baseEnv.YOUTUBE_RELAY_UPSTREAM_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_DATA_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_LIVE_CHAT_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_GOOGLE_API_KEY) ||
      optionalEnvValue(baseEnv.YOUTUBE_DATA_API_KEY) ||
      optionalEnvValue(baseEnv.YOUTUBE_API_KEY) ||
      optionalEnvValue(baseEnv.GOOGLE_API_KEY) ||
      "",
    IRIS_YOUTUBE_RELAY_UPSTREAM_AUTH_MODE:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_RELAY_UPSTREAM_AUTH_MODE) ||
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_LIVE_CHAT_AUTH_MODE) ||
      "",
    IRIS_YOUTUBE_VIDEO_ID:
      youTubeVideoId ||
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_VIDEO_ID) ||
      optionalEnvValue(baseEnv.YOUTUBE_VIDEO_ID) ||
      "",
    IRIS_YOUTUBE_LIVE_CHAT_ID:
      resolveYouTubeLiveChatIdFromEnv(baseEnv) ||
      "",
    IRIS_YOUTUBE_DATA_API_KEY:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_DATA_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_LIVE_CHAT_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_GOOGLE_API_KEY) ||
      optionalEnvValue(baseEnv.YOUTUBE_DATA_API_KEY) ||
      optionalEnvValue(baseEnv.YOUTUBE_API_KEY) ||
      optionalEnvValue(baseEnv.GOOGLE_API_KEY) ||
      "",
    IRIS_YOUTUBE_OAUTH_TOKEN:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_OAUTH_TOKEN) ||
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_ACCESS_TOKEN) ||
      optionalEnvValue(baseEnv.YOUTUBE_OAUTH_TOKEN) ||
      optionalEnvValue(baseEnv.YOUTUBE_ACCESS_TOKEN) ||
      "",
    IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN) ||
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_REFRESH_TOKEN) ||
      optionalEnvValue(baseEnv.YOUTUBE_OAUTH_REFRESH_TOKEN) ||
      optionalEnvValue(baseEnv.YOUTUBE_REFRESH_TOKEN) ||
      "",
    IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH) ||
      optionalEnvValue(baseEnv.YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH) ||
      (useYouTubeApiSource
        ? defaultYouTubeLiveChatCursorStorePath({
            ...baseEnv,
            IRIS_YOUTUBE_VIDEO_ID: youTubeVideoId,
          })
        : ""),
    IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS) ||
      optionalEnvValue(baseEnv.YOUTUBE_LIVE_CHAT_TIMEOUT_MS) ||
      "",
    IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS) ||
      optionalEnvValue(baseEnv.YOUTUBE_LIVE_CHAT_MAX_RESULTS) ||
      "",
    IRIS_YOUTUBE_LIVE_CHAT_PAGE_TOKEN:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_LIVE_CHAT_PAGE_TOKEN) ||
      optionalEnvValue(baseEnv.YOUTUBE_LIVE_CHAT_PAGE_TOKEN) ||
      "",
    IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW) ||
      optionalEnvValue(baseEnv.YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW) ||
      "",
    IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS) ||
      optionalEnvValue(baseEnv.YOUTUBE_BLOCKED_AUTHOR_IDS) ||
      "",
    IRIS_YOUTUBE_BLOCKED_TEXT_TERMS:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_BLOCKED_TEXT_TERMS) ||
      optionalEnvValue(baseEnv.YOUTUBE_BLOCKED_TEXT_TERMS) ||
      "",
    IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT) ||
      optionalEnvValue(baseEnv.YOUTUBE_OAUTH_REFRESH_ENDPOINT) ||
      "",
    IRIS_YOUTUBE_OAUTH_REFRESH_TIMEOUT_MS:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_OAUTH_REFRESH_TIMEOUT_MS) ||
      optionalEnvValue(baseEnv.YOUTUBE_OAUTH_REFRESH_TIMEOUT_MS) ||
      "",
    IRIS_YOUTUBE_LIVE_CHAT_DRAIN_ON_READ:
      optionalEnvValue(baseEnv.IRIS_YOUTUBE_LIVE_CHAT_DRAIN_ON_READ) || "true",
    IRIS_TTS_ADAPTER:
      optionalEnvValue(baseEnv.IRIS_TTS_ADAPTER) === "voicevox"
        ? "http"
        : optionalEnvValue(baseEnv.IRIS_TTS_ADAPTER),
    IRIS_LIVE2D_ADAPTER:
      optionalEnvValue(baseEnv.IRIS_LIVE2D_ADAPTER) === "live2d_cue"
        ? "http"
        : optionalEnvValue(baseEnv.IRIS_LIVE2D_ADAPTER),
    IRIS_VOICEVOX_BRIDGE_HOST: voicevoxBridgeHost,
    IRIS_VOICEVOX_BRIDGE_PORT: voicevoxBridgePort,
    IRIS_ENABLE_VOICEVOX_BRIDGE:
      optionalEnvValue(baseEnv.IRIS_ENABLE_VOICEVOX_BRIDGE) ||
      (optionalEnvValue(baseEnv.IRIS_TTS_ADAPTER) === "voicevox" ||
      requireRealRuntimeAdapters === "true"
        ? "true"
        : ""),
    IRIS_LIVE2D_CUE_BRIDGE_HOST: live2dCueBridgeHost,
    IRIS_LIVE2D_CUE_BRIDGE_PORT: live2dCueBridgePort,
    IRIS_ENABLE_LIVE2D_CUE_BRIDGE:
      optionalEnvValue(baseEnv.IRIS_ENABLE_LIVE2D_CUE_BRIDGE) ||
      (optionalEnvValue(baseEnv.IRIS_LIVE2D_ADAPTER) === "live2d_cue" ||
      requireRealRuntimeAdapters === "true"
        ? "true"
        : ""),
    IRIS_LOCAL_SUBTITLE_ENGINE_HOST: subtitleEngineHost,
    IRIS_LOCAL_SUBTITLE_ENGINE_PORT: subtitleEnginePort,
    IRIS_ENABLE_LOCAL_SUBTITLE_ENGINE: enableLocalSubtitleEngine,
    IRIS_ENABLE_HTTP_INGEST_SCHEDULER: "true",
    IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS: requireRealRuntimeAdapters,
    IRIS_LOCAL_RESPONSE_PROVIDER_HOST: responseProviderHost,
    IRIS_LOCAL_RESPONSE_PROVIDER_PORT: responseProviderPort,
    IRIS_ENABLE_LOCAL_RESPONSE_PROVIDER:
      optionalEnvValue(baseEnv.IRIS_ENABLE_LOCAL_RESPONSE_PROVIDER) ||
      (optionalEnvValue(baseEnv.IRIS_RESPONSE_ENDPOINT) ? "false" : "true"),
    IRIS_RESPONSE_PROVIDER: optionalEnvValue(baseEnv.IRIS_RESPONSE_PROVIDER) || "http",
    IRIS_RESPONSE_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_RESPONSE_ENDPOINT) ||
      `http://${responseProviderHost}:${responseProviderPort}/respond`,
    IRIS_LOCAL_ENGINE_STRICT_HTTP:
      optionalEnvValue(baseEnv.IRIS_LOCAL_ENGINE_STRICT_HTTP) || "false",
    IRIS_LOCAL_TTS_ENGINE_STRICT_HTTP:
      optionalEnvValue(baseEnv.IRIS_LOCAL_TTS_ENGINE_STRICT_HTTP) ||
      (requireRealRuntimeAdapters === "true" ||
      optionalEnvValue(baseEnv.IRIS_TTS_ADAPTER) === "voicevox" ||
      hasExternalTtsEngineEndpoint
        ? "true"
        : "false"),
    IRIS_LOCAL_LIVE2D_ENGINE_STRICT_HTTP:
      optionalEnvValue(baseEnv.IRIS_LOCAL_LIVE2D_ENGINE_STRICT_HTTP) ||
      (requireRealRuntimeAdapters === "true" ||
      optionalEnvValue(baseEnv.IRIS_LIVE2D_ADAPTER) === "live2d_cue" ||
      hasExternalLive2dEngineEndpoint
        ? "true"
        : "false"),
    IRIS_LOCAL_SUBTITLE_ENGINE_STRICT_HTTP:
      optionalEnvValue(baseEnv.IRIS_LOCAL_SUBTITLE_ENGINE_STRICT_HTTP) ||
      (requireRealRuntimeAdapters === "true" || subtitleEngineEndpoint
        ? "true"
        : "false"),
    IRIS_LOCAL_BRIDGE_OUTBOX_DIR: outboxDir,
    IRIS_LOCAL_BRIDGE_ARTIFACT_DIR: artifactDir,
    IRIS_MEMORY_VECTOR_BRIDGE_HOST: memoryVectorBridgeHost,
    IRIS_MEMORY_VECTOR_BRIDGE_PORT: memoryVectorBridgePort,
    IRIS_MEMORY_STORE_PATH:
      optionalEnvValue(baseEnv.IRIS_MEMORY_STORE_PATH) || "data/local_runtime_memory.json",
    IRIS_RELATIONSHIP_STORE_PATH:
      optionalEnvValue(baseEnv.IRIS_RELATIONSHIP_STORE_PATH) ||
      "data/local_runtime_relationships.json",
    IRIS_ENABLE_PERSISTENCE: optionalEnvValue(baseEnv.IRIS_ENABLE_PERSISTENCE) || "true",
    IRIS_ENABLE_CANDIDATE_PERSISTENCE:
      optionalEnvValue(baseEnv.IRIS_ENABLE_CANDIDATE_PERSISTENCE) || "true",
    IRIS_ENABLE_RELATIONSHIP_MEMORY:
      optionalEnvValue(baseEnv.IRIS_ENABLE_RELATIONSHIP_MEMORY) || "true",
    IRIS_MEMORY_SEARCH_ADAPTER:
      optionalEnvValue(baseEnv.IRIS_MEMORY_SEARCH_ADAPTER) || "http_vector",
    IRIS_MEMORY_SEARCH_ENDPOINT: memorySearchEndpoint,
    IRIS_LOCAL_GAME_BRIDGE_HOST: gameBridgeHost,
    IRIS_LOCAL_GAME_BRIDGE_PORT: gameBridgePort,
    IRIS_LOCAL_GAME_BRIDGE_SIMULATED:
      optionalEnvValue(baseEnv.IRIS_LOCAL_GAME_BRIDGE_SIMULATED) || "",
    IRIS_LOCAL_GAME_OBSERVATION_SIMULATED:
      optionalEnvValue(baseEnv.IRIS_LOCAL_GAME_OBSERVATION_SIMULATED) || "",
    IRIS_ENABLE_GAME_CONTROL: "true",
    IRIS_GAME_OBSERVATION_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_GAME_OBSERVATION_ENDPOINT) ||
      `${gameBridgeBaseUrl}/game-observation`,
    IRIS_GAME_OBSERVATION_METHOD:
      optionalEnvValue(baseEnv.IRIS_GAME_OBSERVATION_METHOD) || "GET",
    IRIS_GAME_CONTROL_ADAPTER:
      optionalEnvValue(baseEnv.IRIS_GAME_CONTROL_ADAPTER) || "http",
    IRIS_GAME_CONTROL_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_GAME_CONTROL_ENDPOINT) || `${gameBridgeBaseUrl}/game-control`,
    IRIS_AVAILABLE_GAME_ACTIONS:
      optionalEnvValue(baseEnv.IRIS_AVAILABLE_GAME_ACTIONS) || "wait,move_axis,press_key",
    IRIS_GAME_CONTROL_MIN_INTERVAL_MS:
      optionalEnvValue(baseEnv.IRIS_GAME_CONTROL_MIN_INTERVAL_MS) || "0",
    IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS:
      optionalEnvValue(baseEnv.IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS) || "5000",
    IRIS_LOCAL_TTS_ENGINE_ENDPOINT:
      resolveExternalTtsEngineEndpoint(baseEnv) ||
      (shouldStartVoicevoxBridge({
        ...baseEnv,
        IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS: requireRealRuntimeAdapters,
      })
        ? `${voicevoxBridgeBaseUrl}/tts-engine`
        : ""),
    IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT) ||
      optionalEnvValue(baseEnv.IRIS_TTS_ENGINE_HEALTH_ENDPOINT) ||
      (shouldStartVoicevoxBridge({
        ...baseEnv,
        IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS: requireRealRuntimeAdapters,
      })
        ? `${voicevoxBridgeBaseUrl}/health`
        : ""),
    IRIS_VOICEVOX_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_VOICEVOX_ENDPOINT) ||
      optionalEnvValue(baseEnv.VOICEVOX_ENDPOINT) ||
      optionalEnvValue(baseEnv.TTS_ENDPOINT) ||
      "",
    IRIS_VOICEVOX_API_KEY:
      optionalEnvValue(baseEnv.IRIS_VOICEVOX_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_VOICEVOX_ENGINE_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_TTS_ENGINE_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_LOCAL_TTS_ENGINE_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_LOCAL_ENGINE_API_KEY) ||
      optionalEnvValue(baseEnv.VOICEVOX_API_KEY) ||
      optionalEnvValue(baseEnv.TTS_API_KEY) ||
      "",
    IRIS_VOICEVOX_SPEAKER_ID:
      optionalEnvValue(baseEnv.IRIS_VOICEVOX_SPEAKER_ID) ||
      optionalEnvValue(baseEnv.IRIS_VOICEVOX_VOICE_ID) ||
      optionalEnvValue(baseEnv.VOICEVOX_SPEAKER_ID) ||
      optionalEnvValue(baseEnv.VOICEVOX_VOICE_ID) ||
      optionalEnvValue(baseEnv.TTS_VOICE_ID) ||
      "",
    IRIS_VOICEVOX_MODEL:
      optionalEnvValue(baseEnv.IRIS_VOICEVOX_MODEL) ||
      optionalEnvValue(baseEnv.VOICEVOX_MODEL) ||
      optionalEnvValue(baseEnv.TTS_MODEL) ||
      "",
    IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT:
      resolveExternalLive2dEngineEndpoint(baseEnv) ||
      (shouldStartLive2dCueBridge({
        ...baseEnv,
        IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS: requireRealRuntimeAdapters,
      })
        ? `${live2dCueBridgeBaseUrl}/live2d-engine`
        : ""),
    IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT) ||
      optionalEnvValue(baseEnv.IRIS_LIVE2D_ENGINE_HEALTH_ENDPOINT) ||
      (shouldStartLive2dCueBridge({
        ...baseEnv,
        IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS: requireRealRuntimeAdapters,
      })
        ? `${live2dCueBridgeBaseUrl}/health`
        : ""),
    IRIS_LIVE2D_CUE_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_LIVE2D_CUE_ENDPOINT) ||
      optionalEnvValue(baseEnv.LIVE2D_CUE_ENDPOINT) ||
      optionalEnvValue(baseEnv.LIVE2D_ENDPOINT) ||
      "",
    IRIS_LIVE2D_CUE_API_KEY:
      optionalEnvValue(baseEnv.IRIS_LIVE2D_CUE_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_LIVE2D_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_LIVE2D_CUE_ENGINE_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_LIVE2D_ENGINE_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_LOCAL_LIVE2D_ENGINE_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_LOCAL_ENGINE_API_KEY) ||
      optionalEnvValue(baseEnv.LIVE2D_CUE_API_KEY) ||
      optionalEnvValue(baseEnv.LIVE2D_API_KEY) ||
      "",
    IRIS_LIVE2D_CUE_MODEL_ID:
      optionalEnvValue(baseEnv.IRIS_LIVE2D_CUE_MODEL_ID) ||
      optionalEnvValue(baseEnv.IRIS_LIVE2D_MODEL_ID) ||
      optionalEnvValue(baseEnv.IRIS_LIVE2D_MODEL) ||
      optionalEnvValue(baseEnv.LIVE2D_CUE_MODEL_ID) ||
      optionalEnvValue(baseEnv.LIVE2D_MODEL_ID) ||
      optionalEnvValue(baseEnv.LIVE2D_MODEL) ||
      "",
    IRIS_LIVE2D_CUE_SCENE_ID:
      optionalEnvValue(baseEnv.IRIS_LIVE2D_CUE_SCENE_ID) ||
      optionalEnvValue(baseEnv.IRIS_LIVE2D_SCENE_ID) ||
      optionalEnvValue(baseEnv.IRIS_LIVE2D_SCENE) ||
      optionalEnvValue(baseEnv.LIVE2D_CUE_SCENE_ID) ||
      optionalEnvValue(baseEnv.LIVE2D_SCENE_ID) ||
      optionalEnvValue(baseEnv.LIVE2D_SCENE) ||
      "",
    IRIS_LOCAL_SUBTITLE_ENGINE_ENDPOINT:
      subtitleEngineEndpoint,
    IRIS_LOCAL_SUBTITLE_ENGINE_HEALTH_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_LOCAL_SUBTITLE_ENGINE_HEALTH_ENDPOINT) ||
      optionalEnvValue(baseEnv.IRIS_SUBTITLE_ENGINE_HEALTH_ENDPOINT) ||
      (enableLocalSubtitleEngine === "true" ? `${subtitleEngineBaseUrl}/health` : ""),
    IRIS_SUBTITLE_RENDERER_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_SUBTITLE_RENDERER_ENDPOINT) ||
      optionalEnvValue(baseEnv.IRIS_CAPTION_ENDPOINT) ||
      optionalEnvValue(baseEnv.SUBTITLE_ENDPOINT) ||
      optionalEnvValue(baseEnv.CAPTION_ENDPOINT) ||
      "",
    IRIS_SUBTITLE_RENDERER_API_KEY:
      optionalEnvValue(baseEnv.IRIS_SUBTITLE_RENDERER_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_CAPTION_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_CAPTION_ENGINE_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_SUBTITLE_ENGINE_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_LOCAL_SUBTITLE_ENGINE_API_KEY) ||
      optionalEnvValue(baseEnv.IRIS_LOCAL_ENGINE_API_KEY) ||
      optionalEnvValue(baseEnv.SUBTITLE_API_KEY) ||
      optionalEnvValue(baseEnv.CAPTION_API_KEY) ||
      "",
    IRIS_TTS_ADAPTER:
      optionalEnvValue(baseEnv.IRIS_TTS_ADAPTER) === "voicevox"
        ? "http"
        : optionalEnvValue(baseEnv.IRIS_TTS_ADAPTER) || "http",
    IRIS_LIVE2D_ADAPTER:
      optionalEnvValue(baseEnv.IRIS_LIVE2D_ADAPTER) === "live2d_cue"
        ? "http"
        : optionalEnvValue(baseEnv.IRIS_LIVE2D_ADAPTER) || "http",
    IRIS_SUBTITLE_ADAPTER:
      optionalEnvValue(baseEnv.IRIS_SUBTITLE_ADAPTER) || "http",
    IRIS_TTS_ENDPOINT: `${bridgeBaseUrl}/tts`,
    IRIS_LOCAL_TTS_BRIDGE_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_LOCAL_TTS_BRIDGE_ENDPOINT) || `${bridgeBaseUrl}/tts`,
    IRIS_LIVE2D_ENDPOINT: `${bridgeBaseUrl}/live2d`,
    IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT) ||
      `${bridgeBaseUrl}/live2d`,
    IRIS_SUBTITLE_ENDPOINT: `${bridgeBaseUrl}/subtitle`,
    IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT:
      optionalEnvValue(baseEnv.IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT) ||
      `${bridgeBaseUrl}/subtitle`,
  };
}

function resolveYouTubeLiveChatApiEndpoint(env, { useYouTubeApiSource = false } = {}) {
  return (
    optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT) ||
    optionalEnvValue(env.YOUTUBE_LIVE_CHAT_API_ENDPOINT) ||
    (useYouTubeApiSource
      ? normalizeYouTubeLiveChatApiEndpointAlias(
          optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT) ||
            optionalEnvValue(env.YOUTUBE_LIVE_CHAT_ENDPOINT)
        )
      : "")
  );
}

function normalizeYouTubeLiveChatApiEndpointAlias(endpoint) {
  const value = optionalEnvValue(endpoint);
  if (!value) return "";
  try {
    const url = new URL(value);
    if (
      url.hostname.endsWith("googleapis.com") &&
      /\/youtube\/v3\/liveChat\/messages$/u.test(url.pathname)
    ) {
      return value;
    }
  } catch {
    return "";
  }
  return "";
}

function defaultYouTubeLiveChatCursorStorePath(env) {
  const scope = safeCursorStoreScope(
    resolveYouTubeLiveChatIdFromEnv(env) || env.IRIS_YOUTUBE_VIDEO_ID || "default"
  );
  return `data/youtube_live_chat_cursor_${scope}.json`;
}

function safeCursorStoreScope(value) {
  const text = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/gu, "_")
    .replace(/_+/gu, "_")
    .slice(0, 80);
  return text || "default";
}

function shouldStartVoicevoxBridge(env) {
  if (
    env.IRIS_ENABLE_VOICEVOX_BRIDGE !== "true" &&
    hasDirectTtsEngineEndpoint(env)
  ) {
    return false;
  }
  return (
    env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true" ||
    env.IRIS_ENABLE_VOICEVOX_BRIDGE === "true" ||
    env.IRIS_TTS_ADAPTER === "voicevox" ||
    env.IRIS_LOCAL_TTS_ENGINE === "voicevox" ||
    (env.IRIS_VOICEVOX_ENDPOINT ?? "") !== "" ||
    (env.VOICEVOX_ENDPOINT ?? "") !== "" ||
    (env.TTS_ENDPOINT ?? "") !== "" ||
    ((env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT ?? "") !== "" &&
      isLocalBridgeEngineEndpoint(env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT, {
        host: env.IRIS_VOICEVOX_BRIDGE_HOST,
        port: env.IRIS_VOICEVOX_BRIDGE_PORT,
        defaultPort: "9110",
        path: "/tts-engine",
      }))
  );
}

function resolveYouTubeVideoIdFromEnv(env) {
  return (
    parseYouTubeVideoId(env.IRIS_YOUTUBE_VIDEO_ID) ||
    parseYouTubeVideoId(env.YOUTUBE_VIDEO_ID) ||
    parseYouTubeVideoId(env.IRIS_YOUTUBE_VIDEO_URL) ||
    parseYouTubeVideoId(env.YOUTUBE_VIDEO_URL) ||
    parseYouTubeVideoId(env.IRIS_YOUTUBE_WATCH_URL) ||
    parseYouTubeVideoId(env.YOUTUBE_WATCH_URL) ||
    parseYouTubeVideoId(env.IRIS_YOUTUBE_LIVE_URL) ||
    parseYouTubeVideoId(env.YOUTUBE_LIVE_URL) ||
    parseYouTubeVideoId(env.IRIS_YOUTUBE_STREAM_URL) ||
    parseYouTubeVideoId(env.YOUTUBE_STREAM_URL) ||
    parseYouTubeVideoId(env.IRIS_YOUTUBE_URL) ||
    parseYouTubeVideoId(env.YOUTUBE_URL) ||
    ""
  );
}

function parseYouTubeVideoId(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^[a-zA-Z0-9_-]{6,}$/.test(raw) && !raw.includes("/")) return raw;
  try {
    const url = new URL(raw);
    const nestedUrl =
      optionalEnvValue(url.searchParams.get("url")) ||
      optionalEnvValue(url.searchParams.get("u")) ||
      optionalEnvValue(url.searchParams.get("redirect")) ||
      optionalEnvValue(url.searchParams.get("q")) ||
      optionalEnvValue(url.searchParams.get("target")) ||
      optionalEnvValue(url.searchParams.get("next")) ||
      optionalEnvValue(url.searchParams.get("continue"));
    if (nestedUrl) return parseYouTubeVideoId(nestedUrl);
    const host = url.hostname.replace(/^www\./u, "");
    if (host === "youtu.be") return safeYouTubeVideoId(url.pathname.split("/").filter(Boolean)[0]);
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      return (
        safeYouTubeVideoId(url.searchParams.get("v")) ||
        safeYouTubeVideoId(url.searchParams.get("video_id")) ||
        safeYouTubeVideoId(url.searchParams.get("videoId")) ||
        safeYouTubeVideoId(url.searchParams.get("videoID")) ||
        safeYouTubeVideoId(url.searchParams.get("video")) ||
        safeYouTubeVideoId(url.searchParams.get("vi")) ||
        safeYouTubeVideoId(
          url.pathname.match(/\/(?:live|shorts|embed|v|e|watch|video)\/([^/?#]+)/u)?.[1]
        )
      );
    }
  } catch {
    return "";
  }
  return "";
}

function safeYouTubeVideoId(value) {
  const text = String(value ?? "").trim();
  return /^[a-zA-Z0-9_-]{6,}$/.test(text) ? text : "";
}

function shouldStartLive2dCueBridge(env) {
  if (
    env.IRIS_ENABLE_LIVE2D_CUE_BRIDGE !== "true" &&
    hasDirectLive2dEngineEndpoint(env)
  ) {
    return false;
  }
  return (
    env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true" ||
    env.IRIS_ENABLE_LIVE2D_CUE_BRIDGE === "true" ||
    env.IRIS_LIVE2D_ADAPTER === "live2d_cue" ||
    env.IRIS_LOCAL_LIVE2D_ENGINE === "live2d_cue" ||
    (env.IRIS_LIVE2D_RENDERER_ENDPOINT ?? "") !== "" ||
    (env.IRIS_LIVE2D_CUE_ENDPOINT ?? "") !== "" ||
    (env.LIVE2D_ENDPOINT ?? "") !== "" ||
    (env.LIVE2D_CUE_ENDPOINT ?? "") !== "" ||
    ((env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT ?? "") !== "" &&
      isLocalBridgeEngineEndpoint(env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT, {
        host: env.IRIS_LIVE2D_CUE_BRIDGE_HOST,
        port: env.IRIS_LIVE2D_CUE_BRIDGE_PORT,
        defaultPort: "9113",
        path: "/live2d-engine",
      }))
  );
}

function isLocalBridgeEngineEndpoint(endpoint, { host, port, defaultPort, path }) {
  const value = String(endpoint ?? "").trim();
  if (!value) return false;
  try {
    const url = new URL(value);
    const expectedHost = String(host || "127.0.0.1").replace(/^localhost$/u, "127.0.0.1");
    const actualHost = url.hostname.replace(/^localhost$/u, "127.0.0.1");
    const expectedPorts = new Set([String(port || ""), String(defaultPort || "")].filter(Boolean));
    return actualHost === expectedHost && expectedPorts.has(url.port) && url.pathname === path;
  } catch {
    return false;
  }
}

function optionalEnvValue(value) {
  const text = String(value ?? "").trim();
  return text ? value : undefined;
}

function resolveExternalTtsEngineEndpoint(env) {
  return (
    optionalEnvValue(env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT) ||
    optionalEnvValue(env.IRIS_TTS_ENGINE_ENDPOINT) ||
    optionalEnvValue(env.IRIS_VOICEVOX_ENGINE_ENDPOINT) ||
    optionalEnvValue(env.IRIS_VOICEVOX_ENDPOINT) ||
    optionalEnvValue(env.VOICEVOX_ENDPOINT) ||
    optionalEnvValue(env.TTS_ENDPOINT) ||
    ""
  );
}

function hasDirectTtsEngineEndpoint(env) {
  return (
    optionalEnvValue(env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT) ||
      optionalEnvValue(env.IRIS_TTS_ENGINE_ENDPOINT) ||
      optionalEnvValue(env.IRIS_VOICEVOX_ENGINE_ENDPOINT) ||
      ""
  ) !== "";
}

function resolveExternalLive2dEngineEndpoint(env) {
  return (
    optionalEnvValue(env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT) ||
    optionalEnvValue(env.IRIS_LIVE2D_ENGINE_ENDPOINT) ||
    optionalEnvValue(env.IRIS_LIVE2D_CUE_ENGINE_ENDPOINT) ||
    optionalEnvValue(env.IRIS_LIVE2D_CUE_ENDPOINT) ||
    optionalEnvValue(env.LIVE2D_ENDPOINT) ||
    optionalEnvValue(env.LIVE2D_CUE_ENDPOINT) ||
    ""
  );
}

function hasDirectLive2dEngineEndpoint(env) {
  return (
    optionalEnvValue(env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT) ||
      optionalEnvValue(env.IRIS_LIVE2D_ENGINE_ENDPOINT) ||
      optionalEnvValue(env.IRIS_LIVE2D_CUE_ENGINE_ENDPOINT) ||
      ""
  ) !== "";
}

function resolveExternalSubtitleEngineEndpoint(env) {
  return (
    optionalEnvValue(env.IRIS_LOCAL_SUBTITLE_ENGINE_ENDPOINT) ||
    optionalEnvValue(env.IRIS_SUBTITLE_ENGINE_ENDPOINT) ||
    optionalEnvValue(env.IRIS_SUBTITLE_RENDERER_ENDPOINT) ||
    optionalEnvValue(env.IRIS_CAPTION_ENGINE_ENDPOINT) ||
    optionalEnvValue(env.IRIS_CAPTION_ENDPOINT) ||
    optionalEnvValue(env.SUBTITLE_ENDPOINT) ||
    optionalEnvValue(env.CAPTION_ENDPOINT) ||
    ""
  );
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function shouldStartYouTubeRelay(env) {
  if (normalizeYouTubeLiveChatSource(env.IRIS_YOUTUBE_LIVE_CHAT_SOURCE) === "youtube_api") {
    return false;
  }
  return (
    (env.IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT ?? "") !== "" ||
    (env.IRIS_YOUTUBE_RELAY_ENDPOINT ?? "") !== "" ||
    (env.IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT ?? "") !== "" ||
    (env.YOUTUBE_RELAY_UPSTREAM_ENDPOINT ?? "") !== "" ||
    (env.YOUTUBE_LIVE_CHAT_ENDPOINT ?? "") !== "" ||
    (env.YOUTUBE_RELAY_ENDPOINT ?? "") !== "" ||
    (isHttpYouTubeLiveChatSource(env.IRIS_YOUTUBE_LIVE_CHAT_SOURCE) &&
      String(env.IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT ?? "").includes(
        String(
          env.IRIS_YOUTUBE_RELAY_PORT ??
            env.IRIS_YOUTUBE_RELAY_BRIDGE_PORT ??
            "9111"
        )
      ))
  );
}

function shouldStartResponseProvider(env) {
  return env.IRIS_ENABLE_LOCAL_RESPONSE_PROVIDER === "true";
}

function shouldStartSubtitleEngine(env) {
  return env.IRIS_ENABLE_LOCAL_SUBTITLE_ENGINE === "true";
}

function isHttpYouTubeLiveChatSource(source) {
  const normalized = normalizeYouTubeLiveChatSource(source);
  return normalized === "http" || normalized === "http_relay";
}

function normalizeYouTubeLiveChatSource(source) {
  const normalized = String(source ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/gu, "_");
  if (
    normalized === "api" ||
    normalized === "youtube" ||
    normalized === "youtube_api" ||
    normalized === "youtube_live_chat_api"
  ) {
    return "youtube_api";
  }
  if (normalized === "relay" || normalized === "http_relay") return "http";
  return normalized;
}

function shouldUseYouTubeApiSource(env) {
  const hasTarget =
    resolveYouTubeLiveChatIdFromEnv(env) !== "" ||
    resolveYouTubeVideoIdFromEnv(env) !== "";
  const hasCredential = [
    env.IRIS_YOUTUBE_DATA_API_KEY,
    env.IRIS_YOUTUBE_API_KEY,
    env.IRIS_YOUTUBE_LIVE_CHAT_API_KEY,
    env.IRIS_GOOGLE_API_KEY,
    env.YOUTUBE_DATA_API_KEY,
    env.YOUTUBE_API_KEY,
    env.GOOGLE_API_KEY,
    env.IRIS_YOUTUBE_OAUTH_TOKEN,
    env.IRIS_YOUTUBE_ACCESS_TOKEN,
    env.YOUTUBE_OAUTH_TOKEN,
    env.YOUTUBE_ACCESS_TOKEN,
    env.IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN,
    env.IRIS_YOUTUBE_REFRESH_TOKEN,
    env.YOUTUBE_OAUTH_REFRESH_TOKEN,
    env.YOUTUBE_REFRESH_TOKEN,
  ].some((value) => (value ?? "") !== "");
  return hasTarget && hasCredential;
}

function resolveYouTubeLiveChatIdFromEnv(env) {
  return (
    parseYouTubeLiveChatId(env.IRIS_YOUTUBE_LIVE_CHAT_ID) ||
    parseYouTubeLiveChatId(env.IRIS_YOUTUBE_CHAT_ID) ||
    parseYouTubeLiveChatId(env.IRIS_YOUTUBE_ACTIVE_LIVE_CHAT_ID) ||
    parseYouTubeLiveChatId(env.IRIS_YOUTUBE_LIVE_CHAT_URL) ||
    parseYouTubeLiveChatId(env.IRIS_YOUTUBE_CHAT_URL) ||
    parseYouTubeLiveChatId(env.YOUTUBE_LIVE_CHAT_ID) ||
    parseYouTubeLiveChatId(env.YOUTUBE_CHAT_ID) ||
    parseYouTubeLiveChatId(env.YOUTUBE_ACTIVE_LIVE_CHAT_ID) ||
    parseYouTubeLiveChatId(env.YOUTUBE_LIVE_CHAT_URL) ||
    parseYouTubeLiveChatId(env.YOUTUBE_CHAT_URL) ||
    ""
  );
}

function parseYouTubeLiveChatId(value) {
  const raw = optionalEnvValue(value);
  if (!raw) return "";
  const text = String(raw).trim();
  if (!text.includes("/") && !text.includes("?")) return text;
  try {
    const url = new URL(text);
    const nestedUrl =
      optionalEnvValue(url.searchParams.get("url")) ||
      optionalEnvValue(url.searchParams.get("u")) ||
      optionalEnvValue(url.searchParams.get("redirect")) ||
      optionalEnvValue(url.searchParams.get("q")) ||
      optionalEnvValue(url.searchParams.get("target")) ||
      optionalEnvValue(url.searchParams.get("next")) ||
      optionalEnvValue(url.searchParams.get("continue"));
    if (nestedUrl) return parseYouTubeLiveChatId(nestedUrl);
    return (
      optionalEnvValue(url.searchParams.get("live_chat_id")) ||
      optionalEnvValue(url.searchParams.get("liveChatId")) ||
      optionalEnvValue(url.searchParams.get("active_live_chat_id")) ||
      optionalEnvValue(url.searchParams.get("activeLiveChatId")) ||
      optionalEnvValue(url.searchParams.get("chat_id")) ||
      optionalEnvValue(url.searchParams.get("chatId")) ||
      optionalEnvValue(url.searchParams.get("live_chat")) ||
      optionalEnvValue(url.searchParams.get("liveChat")) ||
      optionalEnvValue(url.searchParams.get("id")) ||
      ""
    );
  } catch {
    return text;
  }
}

function shouldUseYouTubeRelayFixtures(env) {
  if (
    shouldUseYouTubeApiSource(env) ||
    env.IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT ||
    env.IRIS_YOUTUBE_RELAY_ENDPOINT ||
    env.IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT ||
    env.YOUTUBE_RELAY_UPSTREAM_ENDPOINT ||
    env.YOUTUBE_LIVE_CHAT_ENDPOINT ||
    env.YOUTUBE_RELAY_ENDPOINT ||
    env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true"
  ) {
    return "false";
  }
  return "true";
}

