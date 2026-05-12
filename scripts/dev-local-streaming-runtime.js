import "../src/config/loadIrisEnv.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createLocalStreamingRuntimePlan,
  startLocalStreamingRuntime,
} from "../src/server/localStreamingRuntimeSupervisor.js";

const dryRun = process.argv.includes("--dry-run");
const checkMode = process.argv.includes("--check");
const keepRunningAfterCheck =
  process.argv.includes("--keep-running") ||
  process.env.IRIS_LOCAL_STREAMING_RUNTIME_CHECK_KEEP_RUNNING === "true";

if (dryRun) {
  console.log(JSON.stringify(createLocalStreamingRuntimePlan(), null, 2));
} else if (checkMode) {
  const report = await checkLocalStreamingRuntime({
    env: createCheckRuntimeEnv(process.env),
    keepRunning: keepRunningAfterCheck,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`, () => {
    if (!keepRunningAfterCheck || report.ok !== true) {
      process.exit(report.ok === true ? 0 : 1);
    }
  });
} else {
  const runtime = startLocalStreamingRuntime();
  console.log(JSON.stringify(runtime.plan, null, 2));
}

function createCheckRuntimeEnv(env) {
  const checkTempDir = mkdtempSync(join(tmpdir(), "iris-local-streaming-runtime-check-"));
  const useConfiguredStorage =
    env.IRIS_LOCAL_STREAMING_RUNTIME_CHECK_USE_CONFIGURED_STORAGE === "true";
  const useConfiguredPorts =
    env.IRIS_LOCAL_STREAMING_RUNTIME_CHECK_USE_CONFIGURED_PORTS === "true";
  const useConfiguredYouTube =
    env.IRIS_LOCAL_STREAMING_RUNTIME_CHECK_USE_CONFIGURED_YOUTUBE === "true";
  const portBase = 18_000 + (process.pid % 10_000);
  const cleanEnv = {
    ...env,
    IRIS_HTTP_PORT:
      useConfiguredPorts && env.IRIS_HTTP_PORT ? env.IRIS_HTTP_PORT : String(portBase + 0),
    IRIS_LOCAL_BRIDGE_PORT:
      useConfiguredPorts && env.IRIS_LOCAL_BRIDGE_PORT
        ? env.IRIS_LOCAL_BRIDGE_PORT
        : String(portBase + 1),
    IRIS_YOUTUBE_RELAY_PORT:
      useConfiguredPorts && env.IRIS_YOUTUBE_RELAY_PORT
        ? env.IRIS_YOUTUBE_RELAY_PORT
        : String(portBase + 2),
    IRIS_LOCAL_RESPONSE_PROVIDER_PORT:
      useConfiguredPorts && env.IRIS_LOCAL_RESPONSE_PROVIDER_PORT
        ? env.IRIS_LOCAL_RESPONSE_PROVIDER_PORT
        : String(portBase + 3),
    IRIS_VOICEVOX_BRIDGE_PORT:
      useConfiguredPorts && env.IRIS_VOICEVOX_BRIDGE_PORT
        ? env.IRIS_VOICEVOX_BRIDGE_PORT
        : String(portBase + 4),
    IRIS_LIVE2D_CUE_BRIDGE_PORT:
      useConfiguredPorts && env.IRIS_LIVE2D_CUE_BRIDGE_PORT
        ? env.IRIS_LIVE2D_CUE_BRIDGE_PORT
        : String(portBase + 5),
    IRIS_LOCAL_SUBTITLE_ENGINE_PORT:
      useConfiguredPorts && env.IRIS_LOCAL_SUBTITLE_ENGINE_PORT
        ? env.IRIS_LOCAL_SUBTITLE_ENGINE_PORT
        : String(portBase + 6),
    IRIS_MEMORY_VECTOR_BRIDGE_PORT:
      useConfiguredPorts && env.IRIS_MEMORY_VECTOR_BRIDGE_PORT
        ? env.IRIS_MEMORY_VECTOR_BRIDGE_PORT
        : String(portBase + 7),
    IRIS_LOCAL_GAME_BRIDGE_PORT:
      useConfiguredPorts && env.IRIS_LOCAL_GAME_BRIDGE_PORT
        ? env.IRIS_LOCAL_GAME_BRIDGE_PORT
        : String(portBase + 8),
    IRIS_LOCAL_BRIDGE_OUTBOX_DIR:
      useConfiguredStorage && env.IRIS_LOCAL_BRIDGE_OUTBOX_DIR
        ? env.IRIS_LOCAL_BRIDGE_OUTBOX_DIR
        : join(checkTempDir, "outbox"),
    IRIS_LOCAL_BRIDGE_ARTIFACT_DIR:
      useConfiguredStorage && env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR
        ? env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR
        : join(checkTempDir, "artifacts"),
    IRIS_LOCAL_GAME_BRIDGE_SIMULATED: "true",
    IRIS_LOCAL_GAME_OBSERVATION_SIMULATED: "true",
    IRIS_LIVE2D_REQUIRE_RENDERER:
      env.IRIS_LIVE2D_REQUIRE_RENDERER || "false",
    IRIS_VOICEVOX_ALLOW_LOCAL_PREVIEW_FALLBACK:
      env.IRIS_VOICEVOX_ALLOW_LOCAL_PREVIEW_FALLBACK || "true",
  };
  if (!useConfiguredYouTube) {
    return {
      ...cleanEnv,
      IRIS_YOUTUBE_LIVE_CHAT_SOURCE: "http_relay",
      IRIS_YOUTUBE_RELAY_USE_FIXTURES: "true",
      IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT: "",
      IRIS_YOUTUBE_LIVE_CHAT_ID: "",
      IRIS_YOUTUBE_VIDEO_ID: "",
      IRIS_YOUTUBE_VIDEO_URL: "",
      IRIS_YOUTUBE_WATCH_URL: "",
    };
  }
  if (
    cleanEnv.IRIS_YOUTUBE_RELAY_USE_FIXTURES ||
    cleanEnv.IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT ||
    cleanEnv.IRIS_YOUTUBE_LIVE_CHAT_ID ||
    cleanEnv.IRIS_YOUTUBE_VIDEO_ID ||
    cleanEnv.IRIS_YOUTUBE_VIDEO_URL ||
    cleanEnv.IRIS_YOUTUBE_WATCH_URL
  ) {
    return cleanEnv;
  }
  return {
    ...cleanEnv,
    IRIS_YOUTUBE_RELAY_USE_FIXTURES: "true",
  };
}

async function checkLocalStreamingRuntime({ env, keepRunning = false }) {
  const host = optionalEnvValue(env.IRIS_HTTP_HOST) ?? "127.0.0.1";
  const port = formatUrlPort(optionalEnvValue(env.IRIS_HTTP_PORT) ?? "8787", "8787");
  const bridgeHost = optionalEnvValue(env.IRIS_LOCAL_BRIDGE_HOST) ?? "127.0.0.1";
  const bridgePort = formatUrlPort(optionalEnvValue(env.IRIS_LOCAL_BRIDGE_PORT) ?? "8790", "8790");
  const runtimeHost = formatUrlHost(host);
  const bridgeUrlHost = formatUrlHost(bridgeHost);
  const statusUrl = `http://${runtimeHost}:${port}/overlay/status`;
  const streamUrl = `http://${runtimeHost}:${port}/overlay/events/status`;
  const ingestUrl = `http://${runtimeHost}:${port}/ingest/status`;
  const stateUrl = `http://${runtimeHost}:${port}/state`;
  const gameplayRuntimeUrl = `http://${runtimeHost}:${port}/production/gameplay-runtime-status`;
  const manifestUrl = `http://${bridgeUrlHost}:${bridgePort}/event-render-manifests/latest`;

  const checkResult = await checkOrStartRuntime({
    env,
    statusUrl,
    streamUrl,
    ingestUrl,
    stateUrl,
    gameplayRuntimeUrl,
    manifestUrl,
    keepRunning,
  });
  if (checkResult.already_running) {
    return {
      ok: true,
      schema: "iris_local_streaming_runtime_check_v1",
      already_running: true,
      started: false,
      stopped: false,
      keep_running: true,
      status_url: statusUrl,
      stream_url: streamUrl,
      ingest_url: ingestUrl,
      state_url: stateUrl,
      gameplay_runtime_url: gameplayRuntimeUrl,
      manifest_url: manifestUrl,
    };
  }
  if (!checkResult.ready) {
    return {
      ok: false,
      schema: "iris_local_streaming_runtime_check_v1",
      already_running: false,
      started: checkResult.started === true,
      stopped: checkResult.stopped === true,
      keep_running: false,
      status_url: statusUrl,
      stream_url: streamUrl,
      ingest_url: ingestUrl,
      state_url: stateUrl,
      gameplay_runtime_url: gameplayRuntimeUrl,
      manifest_url: manifestUrl,
      reason: checkResult.reason ?? "runtime_readiness_not_reached",
    };
  }
  return {
    ok: true,
    schema: "iris_local_streaming_runtime_check_v1",
    already_running: false,
    started: true,
    stopped: checkResult.stopped,
    keep_running: checkResult.keep_running === true,
    status_url: statusUrl,
    stream_url: streamUrl,
    ingest_url: ingestUrl,
    state_url: stateUrl,
    gameplay_runtime_url: gameplayRuntimeUrl,
    manifest_url: manifestUrl,
  };
}

function optionalEnvValue(value) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function formatUrlHost(host) {
  let urlHost = host.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  if (urlHost === "0.0.0.0" || urlHost === "*" || urlHost === "::" || urlHost === "[::]") {
    return "127.0.0.1";
  }
  if (urlHost.startsWith("[") && urlHost.includes("]")) {
    const bracketHost = urlHost.slice(0, urlHost.indexOf("]") + 1);
    return bracketHost === "[::]" ? "127.0.0.1" : bracketHost;
  }
  if (/^[^:]+:\d+$/.test(urlHost)) {
    urlHost = urlHost.replace(/:\d+$/, "");
  }
  if (urlHost === "0.0.0.0" || urlHost === "*" || urlHost === "::") return "127.0.0.1";
  if (urlHost.startsWith("[") && urlHost.endsWith("]")) return urlHost;
  return urlHost.includes(":") ? `[${urlHost.replace(/^\[|\]$/g, "")}]` : urlHost;
}

function formatUrlPort(port, fallbackPort) {
  const portSource = port.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  const portMatch = portSource.startsWith("[")
    ? portSource.match(/\]:(\d+)$/)
    : portSource.match(/^[^:]+:(\d+)$/);
  const urlPort = portMatch?.[1] ?? portSource.replace(/^:/, "").match(/^\d+$/)?.[0];
  const portNumber = Number(urlPort);
  return portNumber > 0 && portNumber <= 65_535 ? urlPort : fallbackPort;
}

async function checkOrStartRuntime({
  env,
  statusUrl,
  streamUrl,
  ingestUrl,
  stateUrl,
  gameplayRuntimeUrl,
  manifestUrl,
  keepRunning,
}) {
  const initialReadiness = await inspectRuntimeReadiness({
      statusUrl,
      streamUrl,
      ingestUrl,
      stateUrl,
      gameplayRuntimeUrl,
      manifestUrl,
    });
  if (initialReadiness.ready) {
    return { ready: true, already_running: true };
  }
  const handle = startLocalStreamingRuntime({
    env,
    stdio: "ignore",
    logger: { ...console, error: () => undefined, info: () => undefined },
  });
  let ready = false;
  try {
    const readiness = await waitForRuntimeReadiness({
      statusUrl,
      streamUrl,
      ingestUrl,
      stateUrl,
      gameplayRuntimeUrl,
      manifestUrl,
    });
    ready = readiness.ready;
    return {
      ready: readiness.ready,
      already_running: false,
      started: true,
      stopped: !readiness.ready || !keepRunning,
      keep_running: readiness.ready && keepRunning,
      reason: readiness.ready ? null : readiness.reason,
    };
  } finally {
    if (!keepRunning || !ready) {
      handle.stopAll();
    }
  }
}

async function isRuntimeReady({
  statusUrl,
  streamUrl,
  ingestUrl,
  stateUrl,
  gameplayRuntimeUrl,
  manifestUrl,
}) {
  return (
    await inspectRuntimeReadiness({
      statusUrl,
      streamUrl,
      ingestUrl,
      stateUrl,
      gameplayRuntimeUrl,
      manifestUrl,
    })
  ).ready;
}

async function inspectRuntimeReadiness({
  statusUrl,
  streamUrl,
  ingestUrl,
  stateUrl,
  gameplayRuntimeUrl,
  manifestUrl,
}) {
  try {
    const endpoints = [
      ["overlay_status_endpoint_unreachable", statusUrl],
      ["overlay_event_stream_endpoint_unreachable", streamUrl],
      ["ingest_status_endpoint_unreachable", ingestUrl],
      ["state_endpoint_unreachable", stateUrl],
      ["gameplay_runtime_endpoint_unreachable", gameplayRuntimeUrl],
      ["manifest_endpoint_unreachable", manifestUrl],
    ];
    const responses = await Promise.all(
      endpoints.map(async ([reason, url]) => {
        try {
          return [reason, await fetch(url)];
        } catch {
          return [reason, null];
        }
      })
    );
    const failedEndpoint = responses.find(
      ([, response]) => !response?.ok
    )?.[0];
    if (failedEndpoint) return { ready: false, reason: failedEndpoint };
    const [
      [, statusResponse],
      [, streamResponse],
      [, ingestResponse],
      [, stateResponse],
      [, gameplayRuntimeResponse],
      [, manifestResponse],
    ] = responses;
    const bodies = await Promise.all(
      [
        ["overlay_status_body_unreadable", statusResponse],
        ["overlay_event_stream_body_unreadable", streamResponse],
        ["ingest_status_body_unreadable", ingestResponse],
        ["state_body_unreadable", stateResponse],
        ["gameplay_runtime_body_unreadable", gameplayRuntimeResponse],
        ["manifest_body_unreadable", manifestResponse],
      ].map(async ([reason, response]) => {
        try {
          return [reason, await response.json()];
        } catch {
          return [reason, null];
        }
      })
    );
    const unreadableBody = bodies.find(([, body]) => body === null)?.[0];
    if (unreadableBody) return { ready: false, reason: unreadableBody };
    const [
      [, statusBody],
      [, streamBody],
      [, ingestBody],
      [, stateBody],
      [, gameplayRuntimeBody],
      [, manifestBody],
    ] = bodies;
    const overlayStatus = statusBody?.overlay_status ?? statusBody?.overlayStatus ?? statusBody ?? {};
    const eventStreamStatus =
      streamBody?.overlay_event_stream_status ??
      streamBody?.overlayEventStreamStatus ??
      streamBody?.overlay_event_stream ??
      streamBody?.overlayEventStream ??
      streamBody ??
      {};
    const ingestStatus =
      ingestBody?.http_ingest_scheduler ??
      ingestBody?.httpIngestScheduler ??
      ingestBody?.ingest_status ??
      ingestBody?.ingestStatus ??
      ingestBody?.http_ingest ??
      ingestBody?.httpIngest ??
      ingestBody ??
      {};
    const runtimeState = stateBody?.runtime_state ?? stateBody?.runtimeState ?? stateBody?.state ?? stateBody ?? {};
    const runtimeHistory = Array.isArray(runtimeState?.history)
      ? runtimeState.history
      : Array.isArray(runtimeState?.events)
        ? runtimeState.events
        : Array.isArray(runtimeState?.event_history)
          ? runtimeState.event_history
          : Array.isArray(runtimeState?.eventHistory)
            ? runtimeState.eventHistory
            : Array.isArray(runtimeState?.recent_events)
              ? runtimeState.recent_events
              : Array.isArray(runtimeState?.recentEvents)
                ? runtimeState.recentEvents
                : [];
    const overlayRuntimeSeedSeen = runtimeHistory.some(
      (item) => runtimePayloadKind(item) === "overlay_runtime_startup"
    ) || runtimePayloadKind(overlayStatus) === "overlay_runtime_startup";
    const overlayHealth = normalizeRuntimeStatus(
      overlayStatus.health ?? overlayStatus.health_status ?? overlayStatus.healthStatus
    );
    const runtimeHistoryKinds = runtimeHistory.map(runtimePayloadKind);
    const runtimeIngestEventSeen =
      overlayRuntimeSeedSeen ||
      (runtimeProcessedCount(ingestStatus) > 0 &&
        runtimeHistoryKinds.some((kind) => kind === "comment" || kind === "youtube_comment") &&
        runtimeHistoryKinds.some((kind) => kind === "donation_event" || kind === "donation"));
    const missingSignal = [
      [
        "overlay_event_missing",
        ["fresh", "stale"].includes(overlayHealth) || runtimeIngestEventSeen,
      ],
      ["overlay_health_empty", ["fresh", "stale"].includes(overlayHealth)],
      [
        "overlay_event_stream_not_ready",
          eventStreamStatus.stream_ready === true ||
          eventStreamStatus.streamReady === true ||
          eventStreamStatus.ready === true ||
          eventStreamStatus.connected === true ||
          eventStreamStatus.open === true ||
          isReadyStatus(
            normalizeRuntimeStatus(
              eventStreamStatus.status ??
                eventStreamStatus.stream_status ??
                eventStreamStatus.streamStatus ??
                eventStreamStatus.connection_status ??
                eventStreamStatus.connectionStatus
            )
          ),
      ],
      ["gameplay_runtime_empty", hasRuntimeObjectBody(gameplayRuntimeBody)],
      ["manifest_empty", hasReadyObjectBody(manifestBody)],
      ["runtime_ingest_event_missing", runtimeIngestEventSeen === true],
    ].find(([, ready]) => !ready)?.[0];
    const ready = !missingSignal;
    return {
      ready,
      reason: ready ? null : missingSignal,
    };
  } catch {
    return { ready: false, reason: "runtime_status_endpoint_unreachable" };
  }
}

function runtimePayloadKind(item) {
  return normalizeRuntimeStatus(
      item?.payload_kind ??
      item?.payloadKind ??
      item?.event_kind ??
      item?.eventKind ??
      item?.event_type ??
      item?.eventType ??
      item?.event_name ??
      item?.eventName ??
      item?.kind ??
      item?.type ??
      item?.payload?.payload_kind ??
      item?.payload?.payloadKind ??
      item?.payload?.event_kind ??
      item?.payload?.eventKind ??
      item?.payload?.event_type ??
      item?.payload?.eventType ??
      item?.payload?.event_name ??
      item?.payload?.eventName ??
      item?.payload?.kind ??
      item?.payload?.type
  );
}

function runtimeProcessedCount(status) {
  const value =
    status?.processed_count ??
    status?.processedCount ??
    status?.processed_total ??
    status?.processedTotal ??
    status?.total_processed_count ??
    status?.totalProcessedCount ??
    status?.received_count ??
    status?.receivedCount ??
    status?.ingested_count ??
    status?.ingestedCount ??
    status?.processed ??
    status?.received ??
    status?.ingested ??
    status?.count ??
    status?.total ??
    status?.totalCount ??
    0;
  return Math.max(0, Number(String(value).match(/-?\d+/)?.[0] ?? 0));
}

function hasNonEmptyObjectBody(body) {
  return Boolean(
    body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      Object.keys(body).length > 0
  );
}

function hasReadyObjectBody(body) {
  if (!hasNonEmptyObjectBody(body)) return false;
  const report =
    body.event_render_manifest_report ??
    body.eventRenderManifestReport ??
    body.render_manifest_report ??
    body.renderManifestReport ??
    body.manifest_report ??
    body.manifestReport ??
    body.latest_manifest ??
    body.latestManifest ??
    body.manifest;
  const runtimeReport =
    body.gameplay_runtime_status ??
    body.gameplayRuntimeStatus ??
    body.gameplay_runtime_report ??
    body.gameplayRuntimeReport ??
    body.runtime_status_report ??
    body.runtimeStatusReport;
  if (hasFailureSignal(body) || hasFailureSignal(report) || hasFailureSignal(runtimeReport)) return false;
  const status = normalizeRuntimeStatus(firstRuntimeStatus(body, report, runtimeReport));
  if (isUnreadyStatus(status)) return false;
  return !status || isReadyStatus(status);
}

function normalizeRuntimeStatus(status) {
  return String(status ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[\s/.-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function firstRuntimeStatus(...bodies) {
  const statusKeys = [
    "status",
    "readiness_status",
    "readinessStatus",
    "readiness_state",
    "readinessState",
    "readiness_phase",
    "readinessPhase",
    "readiness_stage",
    "readinessStage",
    "readiness_mode",
    "readinessMode",
    "readiness_condition",
    "readinessCondition",
    "readiness_lifecycle",
    "readinessLifecycle",
    "render_status",
    "renderStatus",
    "render_state",
    "renderState",
    "render_phase",
    "renderPhase",
    "render_stage",
    "renderStage",
    "render_mode",
    "renderMode",
    "render_condition",
    "renderCondition",
    "render_lifecycle",
    "renderLifecycle",
    "manifest_status",
    "manifestStatus",
    "manifest_state",
    "manifestState",
    "manifest_phase",
    "manifestPhase",
    "manifest_stage",
    "manifestStage",
    "manifest_mode",
    "manifestMode",
    "manifest_condition",
    "manifestCondition",
    "manifest_lifecycle",
    "manifestLifecycle",
    "bridge_status",
    "bridgeStatus",
    "bridge_state",
    "bridgeState",
    "bridge_phase",
    "bridgePhase",
    "bridge_stage",
    "bridgeStage",
    "bridge_mode",
    "bridgeMode",
    "bridge_condition",
    "bridgeCondition",
    "bridge_lifecycle",
    "bridgeLifecycle",
    "runtime_status",
    "runtimeStatus",
    "runtime_state",
    "runtimeState",
    "runtime_phase",
    "runtimePhase",
    "runtime_stage",
    "runtimeStage",
    "runtime_mode",
    "runtimeMode",
    "runtime_condition",
    "runtimeCondition",
    "runtime_lifecycle",
    "runtimeLifecycle",
    "gameplay_runtime_status",
    "gameplayRuntimeStatus",
    "gameplay_runtime_state",
    "gameplayRuntimeState",
    "gameplay_runtime_phase",
    "gameplayRuntimePhase",
    "gameplay_runtime_stage",
    "gameplayRuntimeStage",
    "gameplay_runtime_mode",
    "gameplayRuntimeMode",
    "gameplay_runtime_condition",
    "gameplayRuntimeCondition",
    "gameplay_runtime_lifecycle",
    "gameplayRuntimeLifecycle",
    "event_render_manifest_status",
    "eventRenderManifestStatus",
    "event_render_manifest_state",
    "eventRenderManifestState",
    "event_render_manifest_phase",
    "eventRenderManifestPhase",
    "event_render_manifest_stage",
    "eventRenderManifestStage",
    "event_render_manifest_mode",
    "eventRenderManifestMode",
    "event_render_manifest_condition",
    "eventRenderManifestCondition",
    "event_render_manifest_lifecycle",
    "eventRenderManifestLifecycle",
    "state_status",
    "stateStatus",
    "health_status",
    "healthStatus",
    "health_state",
    "healthState",
    "health_phase",
    "healthPhase",
    "health_stage",
    "healthStage",
    "health_mode",
    "healthMode",
    "health_condition",
    "healthCondition",
    "health_lifecycle",
    "healthLifecycle",
    "overlay_status",
    "overlayStatus",
    "overlay_state",
    "overlayState",
    "overlay_phase",
    "overlayPhase",
    "overlay_stage",
    "overlayStage",
    "overlay_mode",
    "overlayMode",
    "overlay_condition",
    "overlayCondition",
    "overlay_lifecycle",
    "overlayLifecycle",
    "stream_status",
    "streamStatus",
    "stream_state",
    "streamState",
    "stream_phase",
    "streamPhase",
    "stream_stage",
    "streamStage",
    "stream_mode",
    "streamMode",
    "stream_condition",
    "streamCondition",
    "stream_lifecycle",
    "streamLifecycle",
    "event_stream_status",
    "eventStreamStatus",
    "overlay_event_stream_status",
    "overlayEventStreamStatus",
    "event_stream_state",
    "eventStreamState",
    "overlay_event_stream_state",
    "overlayEventStreamState",
    "event_stream_phase",
    "eventStreamPhase",
    "overlay_event_stream_phase",
    "overlayEventStreamPhase",
    "event_stream_stage",
    "eventStreamStage",
    "overlay_event_stream_stage",
    "overlayEventStreamStage",
    "event_stream_mode",
    "eventStreamMode",
    "overlay_event_stream_mode",
    "overlayEventStreamMode",
    "event_stream_condition",
    "eventStreamCondition",
    "overlay_event_stream_condition",
    "overlayEventStreamCondition",
    "event_stream_lifecycle",
    "eventStreamLifecycle",
    "overlay_event_stream_lifecycle",
    "overlayEventStreamLifecycle",
    "ingest_status",
    "ingestStatus",
    "ingest_state",
    "ingestState",
    "ingest_phase",
    "ingestPhase",
    "ingest_stage",
    "ingestStage",
    "ingest_mode",
    "ingestMode",
    "ingest_condition",
    "ingestCondition",
    "ingest_lifecycle",
    "ingestLifecycle",
    "http_ingest_status",
    "httpIngestStatus",
    "http_ingest_state",
    "httpIngestState",
    "http_ingest_phase",
    "httpIngestPhase",
    "http_ingest_stage",
    "httpIngestStage",
    "http_ingest_mode",
    "httpIngestMode",
    "http_ingest_condition",
    "httpIngestCondition",
    "http_ingest_lifecycle",
    "httpIngestLifecycle",
    "scheduler_status",
    "schedulerStatus",
    "scheduler_state",
    "schedulerState",
    "scheduler_phase",
    "schedulerPhase",
    "scheduler_stage",
    "schedulerStage",
    "scheduler_mode",
    "schedulerMode",
    "scheduler_condition",
    "schedulerCondition",
    "scheduler_lifecycle",
    "schedulerLifecycle",
    "http_ingest_scheduler_status",
    "httpIngestSchedulerStatus",
    "http_ingest_scheduler_state",
    "httpIngestSchedulerState",
    "http_ingest_scheduler_phase",
    "httpIngestSchedulerPhase",
    "http_ingest_scheduler_stage",
    "httpIngestSchedulerStage",
    "http_ingest_scheduler_mode",
    "httpIngestSchedulerMode",
    "http_ingest_scheduler_condition",
    "httpIngestSchedulerCondition",
    "http_ingest_scheduler_lifecycle",
    "httpIngestSchedulerLifecycle",
    "state",
    "health",
    "phase",
    "stage",
    "mode",
    "condition",
    "lifecycle",
  ];
  const reportKeyBases = [
    "readiness",
    "runtime",
    "gameplayRuntime",
    "manifest",
    "render",
    "bridge",
    "state",
    "health",
    "status",
    "overlay",
    "ingest",
    "event_render_manifest",
    "gameplay_runtime",
    "overlay_event_stream",
    "http_ingest",
    "http_ingest_scheduler",
  ];
  const reportKeys = reportKeyBases.flatMap((name) => [
    `${name}_report`,
    `${name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())}Report`,
  ]);
  const nestedKeys = [
    "readiness",
    "runtime",
    "body",
    "response",
    "responseBody",
    "envelope",
    "wrapper",
    "content",
    "contents",
    "gameplay_runtime",
    "gameplayRuntime",
    "manifest",
    "event_render_manifest",
    "eventRenderManifest",
    "render",
    "bridge",
    "state",
    "health",
    "scheduler",
    "overlay",
    "stream",
    "eventStream",
    "overlay_event_stream",
    "overlayEventStream",
    "http_ingest",
    "httpIngest",
    "http_ingest_scheduler",
    "httpIngestScheduler",
    "report",
    "result",
    "data",
    "payload",
    "summary",
    "metadata",
    "meta",
    "details",
    "detail",
    "diagnostics",
    "diagnostic",
    ...reportKeys,
  ];
  for (const body of bodies) {
    for (const key of statusKeys) {
      const status = body?.[key];
      if (status !== undefined && status !== null && status !== "") return status;
    }
    for (const nestedKey of nestedKeys) {
      for (const statusKey of statusKeys) {
        const status = body?.[nestedKey]?.[statusKey];
        if (status !== undefined && status !== null && status !== "") return status;
      }
    }
  }
  return "";
}

function isUnreadyStatus(status) {
  return [
    "attention",
    "action_required",
    "blocked",
    "blocked_by_configuration",
    "config_error",
    "configuration_error",
    "degraded",
    "disabled",
    "aborted",
    "canceled",
    "cancelled",
    "connecting",
    "disconnected",
    "not_connected",
    "error",
    "errored",
    "expired",
    "discarded",
    "invalidated",
    "failure",
    "failed",
    "startup_failed",
    "timed_out",
    "timeout",
    "in_progress",
    "scheduled",
    "generating",
    "building",
    "rendering",
    "unavailable",
    "unknown",
    "undefined",
    "unset",
    "missing",
    "dependency_missing",
    "misconfigured",
    "empty",
    "not_ready",
    "not_ready_to_publish",
    "not_publishable",
    "not_available",
    "not_usable",
    "not_enabled",
    "not_healthy",
    "not_online",
    "not_live",
    "not_operational",
    "not_active",
    "not_running",
    "not_open",
    "not_serving",
    "not_settled",
    "not_stable",
    "not_initialized",
    "not_allowed",
    "not_passed",
    "not_successful",
    "not_complete",
    "not_processed",
    "not_received",
    "not_ingested",
    "not_queued",
    "not_scheduled",
    "not_checking",
    "not_processing",
    "not_retrying",
    "not_generating",
    "not_validating",
    "not_valid",
    "not_validated",
    "not_configured",
    "not_generated",
    "not_rendered",
    "not_published",
    "not_displayed",
    "not_sent",
    "not_delivered",
    "not_stored",
    "not_persisted",
    "not_written",
    "not_flushed",
    "not_loaded",
    "not_mounted",
    "not_attached",
    "not_synced",
    "not_streaming",
    "not_broadcasting",
    "not_streamable",
    "not_broadcastable",
    "not_listening",
    "not_receiving",
    "not_accepting",
    "not_sending",
    "not_emitting",
    "not_prepared",
    "not_committed",
    "not_visible",
    "not_shown",
    "not_presented",
    "not_displayable",
    "not_presentable",
    "not_applied",
    "not_built",
    "not_created",
    "not_completed",
    "not_finished",
    "not_done",
    "out_of_sync",
    "not_started",
    "skipped",
    "shutdown",
    "stopped",
    "terminated",
    "closed",
    "unhealthy",
    "offline",
    "unauthorized",
    "forbidden",
    "stale",
    "outdated",
    "out_of_date",
    "not_current",
    "partial",
    "incomplete",
    "paused",
    "held",
    "operator_action_required",
    "pending",
    "preparing",
    "queued",
    "processing",
    "checking",
    "validating",
    "retrying",
    "rate_limited",
    "resource_exhausted",
    "requires_action",
    "starting",
    "warming_up",
    "initializing",
    "uninitialized",
    "waiting",
    "waiting_for_runtime",
  ].includes(status);
}

function isReadyStatus(status) {
  return [
    "ok",
    "pass",
    "ready",
    "ready_to_publish",
    "rendered",
    "render_complete",
    "render_completed",
    "running",
    "started",
    "serving",
    "available",
    "usable",
    "enabled",
    "active",
    "generated",
    "created",
    "built",
    "healthy",
    "stable",
    "settled",
    "initialized",
    "loaded",
    "live",
    "online",
    "operational",
    "all_allowed",
    "connected",
    "complete",
    "completed",
    "done",
    "finished",
    "success",
    "succeeded",
    "synced",
    "up_to_date",
    "current",
    "streaming",
    "broadcasting",
    "on_air",
    "listening",
    "passed",
    "prepared",
    "published",
    "applied",
    "committed",
    "displayed",
    "visible",
    "shown",
    "presented",
    "mounted",
    "attached",
  ].includes(status);
}

function hasRuntimeObjectBody(body) {
  if (!hasNonEmptyObjectBody(body)) return false;
  const runtimeReport =
    body.gameplay_runtime_status ??
    body.gameplayRuntimeStatus ??
    body.gameplay_runtime_report ??
    body.gameplayRuntimeReport ??
    body.runtime_status_report ??
    body.runtimeStatusReport;
  return !hasFailureSignal(body) && !hasFailureSignal(runtimeReport);
}

function hasFailureSignal(body, seen = new Set()) {
  if (!body || typeof body !== "object") return false;
  if (seen.has(body)) return false;
  seen.add(body);
  if (isUnreadyStatus(normalizeRuntimeStatus(firstRuntimeStatus(body)))) return true;
  if (
    hasFailureSignal(body.result, seen) ||
    hasFailureSignal(body.data, seen) ||
    hasFailureSignal(body.payload, seen) ||
    hasFailureSignal(body.report, seen) ||
    hasFailureSignal(body.body, seen) ||
    hasFailureSignal(body.response, seen) ||
    hasFailureSignal(body.responseBody, seen) ||
    hasFailureSignal(body.envelope, seen) ||
    hasFailureSignal(body.wrapper, seen) ||
    hasFailureSignal(body.content, seen) ||
    hasFailureSignal(body.contents, seen) ||
    hasFailureSignal(body.summary, seen) ||
    hasFailureSignal(body.metadata, seen) ||
    hasFailureSignal(body.meta, seen) ||
    hasFailureSignal(body.details, seen) ||
    hasFailureSignal(body.detail, seen) ||
    hasFailureSignal(body.diagnostics, seen) ||
    hasFailureSignal(body.diagnostic, seen) ||
    hasFailureSignal(body.error, seen) ||
    hasFailureSignal(body.errors, seen) ||
    hasFailureSignal(body.error_list, seen) ||
    hasFailureSignal(body.errorList, seen) ||
    hasFailureSignal(body.last_error, seen) ||
    hasFailureSignal(body.lastError, seen) ||
    hasFailureSignal(body.latest_error, seen) ||
    hasFailureSignal(body.latestError, seen) ||
    hasFailureSignal(body.latest_error_kind, seen) ||
    hasFailureSignal(body.latestErrorKind, seen) ||
    hasFailureSignal(body.latest_manifest_error_kind, seen) ||
    hasFailureSignal(body.latestManifestErrorKind, seen) ||
    hasFailureSignal(body.fatal_error, seen) ||
    hasFailureSignal(body.fatalError, seen) ||
    hasFailureSignal(body.fatal_errors, seen) ||
    hasFailureSignal(body.fatalErrors, seen) ||
    hasFailureSignal(body.failure, seen) ||
    hasFailureSignal(body.failure_reason, seen) ||
    hasFailureSignal(body.failureReason, seen) ||
    hasFailureSignal(body.failures, seen) ||
    hasFailureSignal(body.error_kind, seen) ||
    hasFailureSignal(body.errorKind, seen) ||
    hasFailureSignal(body.exception, seen) ||
    hasFailureSignal(body.exceptions, seen) ||
    hasFailureSignal(body.warning, seen) ||
    hasFailureSignal(body.warnings, seen) ||
    hasFailureSignal(body.alert, seen) ||
    hasFailureSignal(body.alerts, seen) ||
    hasFailureSignal(body.notice, seen) ||
    hasFailureSignal(body.notices, seen) ||
    hasFailureSignal(body.issue, seen) ||
    hasFailureSignal(body.issues, seen) ||
    hasFailureSignal(body.problem, seen) ||
    hasFailureSignal(body.problems, seen) ||
    hasFailureSignal(body.advisory, seen) ||
    hasFailureSignal(body.advisories, seen) ||
    hasFailureSignal(body.blocker, seen) ||
    hasFailureSignal(body.blockers, seen) ||
    hasFailureSignal(body.cause, seen) ||
    hasFailureSignal(body.causes, seen) ||
    hasFailureSignal(body.root_cause, seen) ||
    hasFailureSignal(body.rootCause, seen) ||
    hasFailureSignal(body.root_causes, seen) ||
    hasFailureSignal(body.rootCauses, seen) ||
    hasFailureSignal(body.remediation, seen) ||
    hasFailureSignal(body.remediations, seen) ||
    hasFailureSignal(body.action_required, seen) ||
    hasFailureSignal(body.actionRequired, seen) ||
    hasFailureSignal(body.action, seen) ||
    hasFailureSignal(body.actions, seen) ||
    hasFailureSignal(body.required_action, seen) ||
    hasFailureSignal(body.requiredAction, seen) ||
    hasFailureSignal(body.required_actions, seen) ||
    hasFailureSignal(body.requiredActions, seen) ||
    hasFailureSignal(body.actions_required, seen) ||
    hasFailureSignal(body.actionsRequired, seen) ||
    (Array.isArray(body.required_actions) && body.required_actions.some((item) => hasFailureSignal(item, seen))) ||
    (Array.isArray(body.requiredActions) && body.requiredActions.some((item) => hasFailureSignal(item, seen))) ||
    (Array.isArray(body.actions_required) && body.actions_required.some((item) => hasFailureSignal(item, seen))) ||
    (Array.isArray(body.actionsRequired) && body.actionsRequired.some((item) => hasFailureSignal(item, seen)))
  ) return true;
  const statusCode = Math.max(
    0,
    ...Array.from(
      [
        body.status_code,
        body.statusCode,
        body.status_codes,
        body.statusCodes,
        body.http_status,
        body.httpStatus,
        body.http_status_codes,
        body.httpStatusCodes,
        body.report?.status_code,
        body.report?.statusCode,
        body.report?.http_status,
        body.report?.httpStatus,
        body.body?.status_code,
        body.body?.statusCode,
        body.body?.http_status,
        body.body?.httpStatus,
        body.response?.status_code,
        body.response?.statusCode,
        body.response?.http_status,
        body.response?.httpStatus,
        body.responseBody?.status_code,
        body.responseBody?.statusCode,
        body.responseBody?.http_status,
        body.responseBody?.httpStatus,
        body.envelope?.status_code,
        body.envelope?.statusCode,
        body.envelope?.http_status,
        body.envelope?.httpStatus,
        body.wrapper?.status_code,
        body.wrapper?.statusCode,
        body.wrapper?.http_status,
        body.wrapper?.httpStatus,
        body.content?.status_code,
        body.content?.statusCode,
        body.content?.http_status,
        body.content?.httpStatus,
        body.contents?.status_code,
        body.contents?.statusCode,
        body.contents?.http_status,
        body.contents?.httpStatus,
        body.summary?.status_code,
        body.summary?.statusCode,
        body.summary?.http_status,
        body.summary?.httpStatus,
        body.metadata?.status_code,
        body.metadata?.statusCode,
        body.metadata?.http_status,
        body.metadata?.httpStatus,
        body.meta?.status_code,
        body.meta?.statusCode,
        body.meta?.http_status,
        body.meta?.httpStatus,
        body.details?.status_code,
        body.details?.statusCode,
        body.details?.http_status,
        body.details?.httpStatus,
        body.detail?.status_code,
        body.detail?.statusCode,
        body.detail?.http_status,
        body.detail?.httpStatus,
        body.diagnostics?.status_code,
        body.diagnostics?.statusCode,
        body.diagnostics?.http_status,
        body.diagnostics?.httpStatus,
        body.diagnostic?.status_code,
        body.diagnostic?.statusCode,
        body.diagnostic?.http_status,
        body.diagnostic?.httpStatus,
        body.error?.status_code,
        body.error?.statusCode,
        body.error?.http_status,
        body.error?.httpStatus,
        body.errors?.status_code,
        body.errors?.statusCode,
        body.errors?.http_status,
        body.errors?.httpStatus,
        body.error_list?.status_code,
        body.error_list?.statusCode,
        body.error_list?.http_status,
        body.error_list?.httpStatus,
        body.errorList?.status_code,
        body.errorList?.statusCode,
        body.errorList?.http_status,
        body.errorList?.httpStatus,
        body.last_error?.status_code,
        body.last_error?.statusCode,
        body.last_error?.http_status,
        body.last_error?.httpStatus,
        body.lastError?.status_code,
        body.lastError?.statusCode,
        body.lastError?.http_status,
        body.lastError?.httpStatus,
        body.latest_error?.status_code,
        body.latest_error?.statusCode,
        body.latest_error?.http_status,
        body.latest_error?.httpStatus,
        body.latestError?.status_code,
        body.latestError?.statusCode,
        body.latestError?.http_status,
        body.latestError?.httpStatus,
        body.latest_error_kind?.status_code,
        body.latest_error_kind?.statusCode,
        body.latest_error_kind?.http_status,
        body.latest_error_kind?.httpStatus,
        body.latestErrorKind?.status_code,
        body.latestErrorKind?.statusCode,
        body.latestErrorKind?.http_status,
        body.latestErrorKind?.httpStatus,
        body.latest_manifest_error_kind?.status_code,
        body.latest_manifest_error_kind?.statusCode,
        body.latest_manifest_error_kind?.http_status,
        body.latest_manifest_error_kind?.httpStatus,
        body.latestManifestErrorKind?.status_code,
        body.latestManifestErrorKind?.statusCode,
        body.latestManifestErrorKind?.http_status,
        body.latestManifestErrorKind?.httpStatus,
        body.fatal_error?.status_code,
        body.fatal_error?.statusCode,
        body.fatal_error?.http_status,
        body.fatal_error?.httpStatus,
        body.fatalError?.status_code,
        body.fatalError?.statusCode,
        body.fatalError?.http_status,
        body.fatalError?.httpStatus,
        body.fatal_errors?.status_code,
        body.fatal_errors?.statusCode,
        body.fatal_errors?.http_status,
        body.fatal_errors?.httpStatus,
        body.fatalErrors?.status_code,
        body.fatalErrors?.statusCode,
        body.fatalErrors?.http_status,
        body.fatalErrors?.httpStatus,
        body.failure?.status_code,
        body.failure?.statusCode,
        body.failure?.http_status,
        body.failure?.httpStatus,
        body.failures?.status_code,
        body.failures?.statusCode,
        body.failures?.http_status,
        body.failures?.httpStatus,
        body.failure_reason?.status_code,
        body.failure_reason?.statusCode,
        body.failure_reason?.http_status,
        body.failure_reason?.httpStatus,
        body.failureReason?.status_code,
        body.failureReason?.statusCode,
        body.failureReason?.http_status,
        body.failureReason?.httpStatus,
        body.error_kind?.status_code,
        body.error_kind?.statusCode,
        body.error_kind?.http_status,
        body.error_kind?.httpStatus,
        body.errorKind?.status_code,
        body.errorKind?.statusCode,
        body.errorKind?.http_status,
        body.errorKind?.httpStatus,
        body.exception?.status_code,
        body.exception?.statusCode,
        body.exception?.http_status,
        body.exception?.httpStatus,
        body.exceptions?.status_code,
        body.exceptions?.statusCode,
        body.exceptions?.http_status,
        body.exceptions?.httpStatus,
        body.warning?.status_code,
        body.warning?.statusCode,
        body.warning?.http_status,
        body.warning?.httpStatus,
        body.warnings?.status_code,
        body.warnings?.statusCode,
        body.warnings?.http_status,
        body.warnings?.httpStatus,
        body.alert?.status_code,
        body.alert?.statusCode,
        body.alert?.http_status,
        body.alert?.httpStatus,
        body.alerts?.status_code,
        body.alerts?.statusCode,
        body.alerts?.http_status,
        body.alerts?.httpStatus,
        body.notice?.status_code,
        body.notice?.statusCode,
        body.notice?.http_status,
        body.notice?.httpStatus,
        body.notices?.status_code,
        body.notices?.statusCode,
        body.notices?.http_status,
        body.notices?.httpStatus,
        body.issue?.status_code,
        body.issue?.statusCode,
        body.issue?.http_status,
        body.issue?.httpStatus,
        body.issues?.status_code,
        body.issues?.statusCode,
        body.issues?.http_status,
        body.issues?.httpStatus,
        body.problem?.status_code,
        body.problem?.statusCode,
        body.problem?.http_status,
        body.problem?.httpStatus,
        body.problems?.status_code,
        body.problems?.statusCode,
        body.problems?.http_status,
        body.problems?.httpStatus,
        body.advisory?.status_code,
        body.advisory?.statusCode,
        body.advisory?.http_status,
        body.advisory?.httpStatus,
        body.advisories?.status_code,
        body.advisories?.statusCode,
        body.advisories?.http_status,
        body.advisories?.httpStatus,
        body.blocker?.status_code,
        body.blocker?.statusCode,
        body.blocker?.http_status,
        body.blocker?.httpStatus,
        body.blockers?.status_code,
        body.blockers?.statusCode,
        body.blockers?.http_status,
        body.blockers?.httpStatus,
        body.cause?.status_code,
        body.cause?.statusCode,
        body.cause?.http_status,
        body.cause?.httpStatus,
        body.causes?.status_code,
        body.causes?.statusCode,
        body.causes?.http_status,
        body.causes?.httpStatus,
        body.root_cause?.status_code,
        body.root_cause?.statusCode,
        body.root_cause?.http_status,
        body.root_cause?.httpStatus,
        body.rootCause?.status_code,
        body.rootCause?.statusCode,
        body.rootCause?.http_status,
        body.rootCause?.httpStatus,
        body.root_causes?.status_code,
        body.root_causes?.statusCode,
        body.root_causes?.http_status,
        body.root_causes?.httpStatus,
        body.rootCauses?.status_code,
        body.rootCauses?.statusCode,
        body.rootCauses?.http_status,
        body.rootCauses?.httpStatus,
        body.remediation?.status_code,
        body.remediation?.statusCode,
        body.remediation?.http_status,
        body.remediation?.httpStatus,
        body.remediations?.status_code,
        body.remediations?.statusCode,
        body.remediations?.http_status,
        body.remediations?.httpStatus,
        body.action_required?.status_code,
        body.action_required?.statusCode,
        body.action_required?.http_status,
        body.action_required?.httpStatus,
        body.actionRequired?.status_code,
        body.actionRequired?.statusCode,
        body.actionRequired?.http_status,
        body.actionRequired?.httpStatus,
        body.action?.status_code,
        body.action?.statusCode,
        body.action?.http_status,
        body.action?.httpStatus,
        body.actions?.status_code,
        body.actions?.statusCode,
        body.actions?.http_status,
        body.actions?.httpStatus,
        body.required_action?.status_code,
        body.required_action?.statusCode,
        body.required_action?.http_status,
        body.required_action?.httpStatus,
        body.requiredAction?.status_code,
        body.requiredAction?.statusCode,
        body.requiredAction?.http_status,
        body.requiredAction?.httpStatus,
        body.required_actions?.status_code,
        body.required_actions?.statusCode,
        body.required_actions?.http_status,
        body.required_actions?.httpStatus,
        body.requiredActions?.status_code,
        body.requiredActions?.statusCode,
        body.requiredActions?.http_status,
        body.requiredActions?.httpStatus,
        body.actions_required?.status_code,
        body.actions_required?.statusCode,
        body.actions_required?.http_status,
        body.actions_required?.httpStatus,
        body.actionsRequired?.status_code,
        body.actionsRequired?.statusCode,
        body.actionsRequired?.http_status,
        body.actionsRequired?.httpStatus,
      ].join(" ").matchAll(/\b[1-5]\d{2}\b/g),
      (match) => Number(match[0])
    )
  );
  if (statusCode >= 400) return true;
  const failureFlagBodies = [body, body.report, body.body, body.response, body.responseBody, body.envelope, body.wrapper, body.content, body.contents, body.summary, body.metadata, body.meta, body.details, body.detail, body.diagnostics, body.diagnostic, body.error, body.errors, body.error_list, body.errorList, body.last_error, body.lastError, body.latest_error, body.latestError, body.latest_error_kind, body.latestErrorKind, body.latest_manifest_error_kind, body.latestManifestErrorKind, body.fatal_error, body.fatalError, body.fatal_errors, body.fatalErrors, body.failure, body.failure_reason, body.failureReason, body.failures, body.error_kind, body.errorKind, body.exception, body.exceptions, body.warning, body.warnings, body.alert, body.alerts, body.notice, body.notices, body.issue, body.issues, body.problem, body.problems, body.advisory, body.advisories, body.blocker, body.blockers, body.cause, body.causes, body.root_cause, body.rootCause, body.root_causes, body.rootCauses, body.remediation, body.remediations, body.action_required, body.actionRequired, body.action, body.actions, body.required_action, body.requiredAction, body.required_actions, body.requiredActions, body.actions_required, body.actionsRequired];
  const falseFailureFlagBases = [
    "ok",
    "ready",
    "ready_to_publish",
    "success",
    "healthy",
    "available",
    "usable",
    "enabled",
    "configured",
    "valid",
    "validated",
    "rendered",
    "published",
    "publishable",
    "deployable",
    "deployed",
    "installed",
    "registered",
    "subscribed",
    "loaded",
    "mounted",
    "attached",
    "connected",
    "streaming",
    "streamable",
    "broadcastable",
    "synced",
    "active",
    "started",
    "running",
    "runnable",
    "executable",
    "serving",
    "open",
    "listening",
    "receiving",
    "accepting",
    "sending",
    "emitting",
    "prepared",
    "committed",
    "stored",
    "persisted",
    "written",
    "flushed",
    "displayed",
    "displayable",
    "presented",
    "presentable",
    "visible",
    "shown",
    "delivered",
    "sent",
    "complete",
    "completed",
    "finished",
    "done",
    "initialized",
    "settled",
    "stable",
    "current",
    "up_to_date",
    "fresh",
    "reachable",
    "accessible",
    "online",
    "live",
    "operational",
    "allowed",
    "permitted",
    "authenticated",
    "authorized",
    "created",
    "built",
    "processed",
    "received",
    "ingested",
    "queued",
    "scheduled",
    "checked",
    "processing",
    "generating",
    "building",
    "rendering",
    "publishing",
    "applying",
    "validating",
    "retrying",
  ];
  const falseFailureFlags = falseFailureFlagBases.flatMap((name) => {
    const camelName = name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    return [name, camelName, name === "ok" ? name : `is${camelName[0].toUpperCase()}${camelName.slice(1)}`];
  });
  if (
    failureFlagBodies.some((item) =>
      falseFailureFlags.some((name) => item?.[name] === false || normalizeRuntimeStatus(item?.[name]) === "false")
    )
  ) return true;
  const trueFailureFlagBases = [
    "operator_action_required",
    "action_required",
    "requires_action",
    "blocked",
    "degraded",
    "disabled",
    "unhealthy",
    "failed",
    "startup_failed",
    "initialization_failed",
    "fatal",
    "errored",
    "timeout",
    "timed_out",
    "timedOut",
    "rate_limited",
    "resource_exhausted",
    "missing",
    "dependency_missing",
    "empty",
    "invalid",
    "invalidated",
    "stale",
    "partial",
    "incomplete",
    "paused",
    "held",
    "expired",
    "discarded",
    "aborted",
    "canceled",
    "cancelled",
    "stopped",
    "closed",
    "disconnected",
    "offline",
    "misconfigured",
    "not_configured",
    "unauthorized",
    "forbidden",
  ];
  const trueFailureFlags = trueFailureFlagBases.flatMap((name) => [
    name,
    name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
  ]);
  if (
    failureFlagBodies.some((item) =>
      trueFailureFlags.some((name) => item?.[name] === true || normalizeRuntimeStatus(item?.[name]) === "true")
    )
  ) return true;
  if ([
    body.error,
    body.error?.code,
    body.error?.reason,
    body.error?.message,
    body.error?.detail,
    body.error?.details,
    body.message,
    body.detail,
    body.details,
    body.reason,
    body.warning,
    body.warning?.reason,
    body.warning?.message,
    body.warning?.detail,
    body.warning?.details,
    body.warning?.code,
    body.alert,
    body.alert?.reason,
    body.alert?.message,
    body.alert?.detail,
    body.alert?.details,
    body.alert?.code,
    body.alert?.error_kind,
    body.alert?.errorKind,
    body.notice,
    body.notice?.reason,
    body.notice?.message,
    body.notice?.detail,
    body.notice?.details,
    body.notice?.code,
    body.notice?.error_kind,
    body.notice?.errorKind,
    body.advisory,
    body.advisory?.reason,
    body.advisory?.message,
    body.advisory?.detail,
    body.advisory?.details,
    body.advisory?.code,
    body.advisory?.error_kind,
    body.advisory?.errorKind,
    body.blocker,
    body.blocker?.reason,
    body.blocker?.message,
    body.blocker?.detail,
    body.blocker?.details,
    body.blocker?.code,
    body.blocker?.error_kind,
    body.blocker?.errorKind,
    body.cause,
    body.cause?.reason,
    body.cause?.message,
    body.cause?.detail,
    body.cause?.details,
    body.cause?.code,
    body.cause?.error_kind,
    body.cause?.errorKind,
    body.root_cause,
    body.root_cause?.reason,
    body.root_cause?.message,
    body.root_cause?.detail,
    body.root_cause?.details,
    body.root_cause?.code,
    body.root_cause?.error_kind,
    body.root_cause?.errorKind,
    body.rootCause,
    body.rootCause?.reason,
    body.rootCause?.message,
    body.rootCause?.detail,
    body.rootCause?.details,
    body.rootCause?.code,
    body.rootCause?.error_kind,
    body.rootCause?.errorKind,
    body.remediation,
    body.remediation?.reason,
    body.remediation?.message,
    body.remediation?.detail,
    body.remediation?.details,
    body.remediation?.code,
    body.remediation?.error_kind,
    body.remediation?.errorKind,
    body.action_required,
    body.action_required?.reason,
    body.action_required?.message,
    body.action_required?.detail,
    body.action_required?.details,
    body.action_required?.code,
    body.action_required?.error_kind,
    body.action_required?.errorKind,
    body.actionRequired,
    body.actionRequired?.reason,
    body.actionRequired?.message,
    body.actionRequired?.detail,
    body.actionRequired?.details,
    body.actionRequired?.code,
    body.actionRequired?.error_kind,
    body.actionRequired?.errorKind,
    body.failure?.reason,
    body.failure?.message,
    body.failure?.detail,
    body.failure?.details,
    body.failure?.code,
    body.failure?.error_kind,
    body.failure?.errorKind,
    body.error_kind,
    body.errorKind,
    body.fatal_error,
    body.fatal_error?.reason,
    body.fatal_error?.message,
    body.fatalError,
    body.fatalError?.reason,
    body.fatalError?.message,
    body.exception,
    body.exception?.reason,
    body.exception?.message,
    body.exception?.detail,
    body.exception?.details,
    body.exception?.code,
    body.exception?.error_kind,
    body.exception?.errorKind,
    body.failure_reason,
    body.failureReason,
    body.last_error,
    body.last_error?.reason,
    body.last_error?.message,
    body.last_error?.detail,
    body.last_error?.details,
    body.lastError,
    body.lastError?.reason,
    body.lastError?.message,
    body.lastError?.detail,
    body.lastError?.details,
    body.latest_manifest_error_kind,
    body.latest_manifest_error_kind?.reason,
    body.latest_manifest_error_kind?.message,
    body.latestManifestErrorKind,
    body.latestManifestErrorKind?.reason,
    body.latestManifestErrorKind?.message,
    body.latest_error_kind,
    body.latest_error_kind?.reason,
    body.latest_error_kind?.message,
    body.latestErrorKind,
    body.latestErrorKind?.reason,
    body.latestErrorKind?.message,
  ].some(hasFailureText)) return true;
  if (
    (Array.isArray(body.errors) && body.errors.length > 0) ||
    (Array.isArray(body.error_list) && body.error_list.length > 0) ||
    (Array.isArray(body.errorList) && body.errorList.length > 0) ||
    (Array.isArray(body.error?.errors) && body.error.errors.length > 0) ||
    (Array.isArray(body.error?.failures) && body.error.failures.length > 0) ||
    (Array.isArray(body.failures) && body.failures.length > 0) ||
    (Array.isArray(body.fatal_errors) && body.fatal_errors.length > 0) ||
    (Array.isArray(body.fatalErrors) && body.fatalErrors.length > 0) ||
    (Array.isArray(body.failure?.errors) && body.failure.errors.length > 0) ||
    (Array.isArray(body.issues) && body.issues.length > 0) ||
    (Array.isArray(body.problems) && body.problems.length > 0) ||
    (Array.isArray(body.warnings) && body.warnings.length > 0) ||
    (Array.isArray(body.alerts) && body.alerts.length > 0) ||
    (Array.isArray(body.notices) && body.notices.length > 0) ||
    (Array.isArray(body.advisories) && body.advisories.length > 0) ||
    (Array.isArray(body.blockers) && body.blockers.length > 0) ||
    (Array.isArray(body.causes) && body.causes.length > 0) ||
    (Array.isArray(body.root_causes) && body.root_causes.length > 0) ||
    (Array.isArray(body.rootCauses) && body.rootCauses.length > 0) ||
    (Array.isArray(body.remediations) && body.remediations.length > 0) ||
    (Array.isArray(body.required_actions) && body.required_actions.length > 0) ||
    (Array.isArray(body.requiredActions) && body.requiredActions.length > 0) ||
    (Array.isArray(body.actions_required) && body.actions_required.length > 0) ||
    (Array.isArray(body.actionsRequired) && body.actionsRequired.length > 0) ||
    (Array.isArray(body.exceptions) && body.exceptions.length > 0) ||
    (Array.isArray(body.diagnostics) && body.diagnostics.length > 0) ||
    (Array.isArray(body.diagnostic) && body.diagnostic.length > 0)
  ) return true;
  return runtimeProcessedCount({
    count:
      body.error_count ??
      body.errorCount ??
      body.error?.count ??
      body.error?.error_count ??
      body.error?.errorCount ??
      body.error?.errors ??
      body.error?.failures ??
      body.failure_count ??
      body.failureCount ??
      body.fatal_count ??
      body.fatalCount ??
      body.fatal_errors ??
      body.fatalErrors ??
      body.failure?.count ??
      body.failure?.error_count ??
      body.failure?.errorCount ??
      body.failure?.failed_count ??
      body.failure?.failedCount ??
      body.failed_count ??
      body.failedCount ??
      body.error_list ??
      body.errorList ??
      body.failures ??
      body.failure?.errors ??
      body.issue_count ??
      body.issueCount ??
      body.issues ??
      body.problem_count ??
      body.problemCount ??
      body.problems ??
      body.exception_count ??
      body.exceptionCount ??
      body.exceptions ??
      body.warning_count ??
      body.warningCount ??
      body.warnings ??
      body.alert_count ??
      body.alertCount ??
      body.alerts ??
      body.notice_count ??
      body.noticeCount ??
      body.notices ??
      body.advisory_count ??
      body.advisoryCount ??
      body.advisories ??
      body.blocker_count ??
      body.blockerCount ??
      body.blockers ??
      body.cause_count ??
      body.causeCount ??
      body.causes ??
      body.root_cause_count ??
      body.rootCauseCount ??
      body.root_causes ??
      body.rootCauses ??
      body.remediation_count ??
      body.remediationCount ??
      body.remediations ??
      body.required_action_count ??
      body.requiredActionCount ??
      body.required_actions ??
      body.requiredActions ??
      body.actions_required_count ??
      body.actionsRequiredCount ??
      body.actions_required ??
      body.actionsRequired ??
      body.diagnostics ??
      body.diagnostic ??
      body.errors,
  }) > 0;
}

function hasFailureText(value) {
  if (value && typeof value === "object") return false;
  const text = normalizeRuntimeStatus(value);
  return Boolean(text && !NON_FAILURE_TEXTS.has(text) && !isReadyStatus(text));
}

const NON_FAILURE_TEXTS = new Set([
  "none",
  "null",
  "nil",
  "ok",
  "false",
  "enabled",
  "disabled",
  "available",
  "usable",
  "reachable",
  "accessible",
  "connected",
  "online",
  "open",
  "healthy",
  "nominal",
  "green",
  "normal",
  "stable",
  "operational",
  "running",
  "runnable",
  "executable",
  "starting",
  "warming_up",
  "initializing",
  "started",
  "serving",
  "restarted",
  "primed",
  "bootstrapped",
  "reloaded",
  "refreshed",
  "renewed",
  "reacquired",
  "revalidated",
  "resynced",
  "reconnected",
  "reattached",
  "unsealed",
  "relocked",
  "reselected",
  "reassigned",
  "reallocated",
  "rescheduled",
  "rerouted",
  "redirected",
  "forwarded",
  "relayed",
  "routed",
  "bridged",
  "unbridged",
  "bypassed",
  "short_circuited",
  "active",
  "activated",
  "deactivated",
  "muted",
  "unmuted",
  "suppressed",
  "unsuppressed",
  "silenced",
  "unsilenced",
  "quieted",
  "unquieted",
  "blocked",
  "unblocked",
  "filtered",
  "live",
  "streaming",
  "streamable",
  "broadcasting",
  "broadcastable",
  "on_air",
  "listening",
  "receiving",
  "accepting",
  "sending",
  "emitting",
  "preview",
  "displayed",
  "displayable",
  "visible",
  "shown",
  "presented",
  "presentable",
  "prelive",
  "upcoming",
  "created",
  "built",
  "configured",
  "preparing",
  "prepared",
  "armed",
  "authorized",
  "authenticated",
  "permitted",
  "allowed",
  "all_allowed",
  "accepted",
  "ack",
  "acknowledged",
  "received",
  "ingested",
  "processed",
  "processing",
  "generating",
  "building",
  "rendering",
  "publishing",
  "checked",
  "checking",
  "saved",
  "stored",
  "persisted",
  "updated",
  "applied",
  "applying",
  "committed",
  "flushed",
  "written",
  "sent",
  "uploaded",
  "downloaded",
  "fetched",
  "delivered",
  "resolved",
  "recovered",
  "resumed",
  "restored",
  "repaired",
  "corrected",
  "normalized",
  "formatted",
  "optimized",
  "compressed",
  "encoded",
  "decoded",
  "parsed",
  "generated",
  "rendered",
  "render_complete",
  "render_completed",
  "exported",
  "published",
  "publishable",
  "deployable",
  "deployed",
  "installed",
  "registered",
  "unregistered",
  "subscribed",
  "unsubscribed",
  "attached",
  "detached",
  "released",
  "disposed",
  "destroyed",
  "cleaned",
  "cleared",
  "removed",
  "deleted",
  "archived",
  "rotated",
  "pruned",
  "compacted",
  "evicted",
  "expired",
  "retired",
  "deprecated",
  "replaced",
  "swapped",
  "relocated",
  "renamed",
  "copied",
  "cloned",
  "split",
  "merged",
  "joined",
  "linked",
  "unlinked",
  "bound",
  "unbound",
  "mounted",
  "unmounted",
  "opened",
  "reopened",
  "sealed",
  "locked",
  "unlocked",
  "pinned",
  "unpinned",
  "selected",
  "deselected",
  "chosen",
  "assigned",
  "unassigned",
  "reserved",
  "unreserved",
  "allocated",
  "deallocated",
  "provisioned",
  "deprovisioned",
  "migrated",
  "promoted",
  "demoted",
  "approved",
  "granted",
  "ready",
  "ready_to_publish",
  "initialized",
  "synced",
  "up_to_date",
  "current",
  "synchronized",
  "settled",
  "loaded",
  "cached",
  "fresh",
  "warm",
  "warmed",
  "inactive",
  "idle",
  "standby",
  "n_a",
  "na",
  "_",
  "not_applicable",
  "not_configured",
  "not_required",
  "not_needed",
  "not_used",
  "unused",
  "skipped",
  "deferred",
  "pending",
  "queued",
  "waiting",
  "waiting_for_runtime",
  "retrying",
  "scheduled",
  "not_started",
  "not_running",
  "shutdown",
  "stopped",
  "terminated",
  "closed",
  "complete",
  "completed",
  "finished",
  "done",
  "success",
  "succeeded",
  "pass",
  "passed",
  "verified",
  "validated",
  "validating",
  "valid",
  "not_active",
  "not_set",
  "not_provided",
  "unset",
  "no_action",
  "no_actions",
  "no_action_required",
  "no_action_needed",
  "no_operator_action_required",
  "no_required",
  "no_required_action",
  "no_required_actions",
  "no_requires_action",
  "no_actions_required",
  "no_pending",
  "no_pending_action",
  "no_pending_actions",
  "no_pending_work",
  "no_retry",
  "no_retrying",
  "no_retries",
  "no_rate_limit",
  "no_rate_limited",
  "no_rate_limits",
  "no_timeout",
  "no_timed_out",
  "no_timeouts",
  "no_expired",
  "no_expiry",
  "no_expiration",
  "no_resource_exhausted",
  "no_resources_exhausted",
  "no_auth_error",
  "no_auth_errors",
  "no_unauthorized",
  "no_forbidden",
  "no_unhealthy",
  "no_degraded",
  "no_failed",
  "no_startup_failed",
  "no_initialization_failed",
  "no_fatal",
  "no_errored",
  "no_discarded",
  "no_aborted",
  "no_canceled",
  "no_cancelled",
  "no_invalid",
  "no_invalids",
  "no_invalidated",
  "no_stale",
  "no_staleness",
  "no_out_of_date",
  "no_outdated",
  "no_missing",
  "no_dependency_missing",
  "no_dependencies_missing",
  "no_missing_dependency",
  "no_missing_dependencies",
  "no_misconfigured",
  "no_misconfiguration",
  "empty",
  "blank",
  "no_blank",
  "no_blanks",
  "no_empty",
  "no_empties",
  "partial",
  "no_partial",
  "no_partials",
  "incomplete",
  "no_incomplete",
  "no_incompletes",
  "paused",
  "no_paused",
  "held",
  "suspended",
  "no_suspended",
  "no_held",
  "not_connected",
  "unconnected",
  "no_unconnected",
  "disconnected",
  "no_disconnect",
  "no_disconnected",
  "no_disconnection",
  "offline",
  "no_offline",
  "no_remediation",
  "no_remediation_required",
  "no_remediation_needed",
  "no_issue",
  "no_issues",
  "no_problem",
  "no_problems",
  "no_error",
  "no_errors",
  "no_last_error",
  "no_latest_error",
  "no_error_kind",
  "no_fatal_error",
  "no_fatal_errors",
  "no_failure",
  "no_failures",
  "no_warned",
  "no_warning",
  "no_warnings",
  "no_alerted",
  "no_alert",
  "no_alerts",
  "no_noticed",
  "no_notice",
  "no_notices",
  "no_advised",
  "no_advisory",
  "no_advisories",
  "no_blocked",
  "no_blocker",
  "no_blockers",
  "no_caused",
  "no_cause",
  "no_causes",
  "no_root_cause",
  "no_root_causes",
  "no_exception",
  "no_exceptions",
  "no_diagnostic",
  "no_diagnostics",
  "no_report",
  "no_reports",
  "no_detail",
  "no_details",
  "no_metadata",
  "no_meta",
  "none_detected",
  "not_detected",
  "not_available",
  "not_present",
  "not_found",
  "none_found",
  "nothing_found",
  "none_to_report",
  "nothing_to_report",
  "clear",
  "all_clear",
  "all_ok",
  "ok_all",
  "all_good",
  "all_good_go",
  "all_good_ready",
  "all_go",
  "all_go_good",
  "all_go_ready",
  "go_all",
  "go_all_go",
  "go_all_good",
  "go_all_ready",
  "good",
  "good_all",
  "good_all_go",
  "good_all_ready",
  "good_go",
  "good_go_all",
  "good_go_ready",
  "good_good",
  "go_good",
  "go_good_all",
  "go_good_go",
  "go_good_ready",
  "good_ready",
  "good_ready_all",
  "good_ready_go",
  "ready_good",
  "ready_good_all",
  "ready_good_go",
  "all_ready",
  "all_ready_all",
  "all_ready_good",
  "all_ready_go",
  "ready_all",
  "ready_all_ready",
  "ready_all_good",
  "ready_all_go",
  "ready_ready",
  "ready_to_go",
  "ready_go",
  "ready_go_all",
  "ready_go_clean",
  "ready_go_cleaned",
  "ready_go_good",
  "ready_go_ready",
  "go_ready",
  "go_ready_all",
  "go_ready_clean",
  "go_ready_cleaned",
  "go_ready_good",
  "go_ready_go",
  "go_ready_ready",
  "go",
  "go_go",
  "go_go_all",
  "go_go_ready",
  "go_live",
  "go_live_all",
  "go_live_clean",
  "go_live_cleaned",
  "go_live_go",
  "go_live_ready",
  "go_live_ready_all",
  "go_live_ready_clean",
  "go_live_ready_cleaned",
  "go_live_ready_go",
  "go_live_ready_ready",
  "live_live",
  "live_live_all",
  "live_live_ready",
  "live_go",
  "live_go_all",
  "live_go_ready",
  "ready_live",
  "ready_live_go",
  "ready_live_ready",
  "live_ready",
  "live_ready_go",
  "live_ready_live",
  "live_ready_on_air",
  "on_air_ready",
  "on_air_ready_go",
  "on_air_ready_live",
  "on_air_ready_on_air",
  "on_air_on_air",
  "on_air_live",
  "on_air_live_ready",
  "live_on_air",
  "live_on_air_ready",
  "on_air_go",
  "on_air_go_ready",
  "ready_on_air",
  "ready_on_air_go",
  "ready_on_air_ready",
  "ready_air",
  "ready_air_go",
  "ready_air_ready",
  "air_air",
  "air_ready",
  "air_ready_air",
  "air_ready_go",
  "air_go",
  "air_go_ready",
  "ready_to_stream",
  "ready_stream",
  "ready_stream_go",
  "ready_stream_ready",
  "stream_ready",
  "stream_ready_go",
  "stream_ready_stream",
  "stream_stream",
  "stream_go",
  "stream_go_ready",
  "go_stream",
  "go_stream_ready",
  "ready_to_broadcast",
  "ready_broadcast",
  "ready_broadcast_go",
  "ready_broadcast_ready",
  "broadcast_broadcast",
  "broadcast_ready",
  "broadcast_ready_broadcast",
  "broadcast_ready_go",
  "broadcast_go",
  "broadcast_go_ready",
  "go_broadcast",
  "go_broadcast_ready",
  "all_set",
  "set",
  "set_set",
  "set_ready",
  "set_ready_go",
  "set_ready_set",
  "ready_set",
  "ready_set_go",
  "ready_set_ready",
  "all_clean",
  "all_clean_all",
  "all_clean_clean",
  "all_clean_cleaned",
  "all_clean_go",
  "all_clean_go_clean",
  "all_clean_go_cleaned",
  "all_clean_go_ready",
  "all_clean_ready",
  "all_clean_ready_clean",
  "all_clean_ready_cleaned",
  "all_clean_ready_go",
  "all_cleaned",
  "all_cleaned_all",
  "all_cleaned_clean",
  "all_cleaned_cleaned",
  "all_cleaned_go",
  "all_cleaned_go_clean",
  "all_cleaned_go_cleaned",
  "all_cleaned_go_ready",
  "all_cleaned_ready",
  "all_cleaned_ready_all",
  "all_cleaned_ready_clean",
  "all_cleaned_ready_cleaned",
  "all_cleaned_ready_go",
  "all_cleaned_ready_ready",
  "clean_all",
  "clean_all_all",
  "clean_all_clean",
  "clean_all_cleaned",
  "clean_all_go",
  "clean_all_go_all",
  "clean_all_go_clean",
  "clean_all_go_cleaned",
  "clean_all_go_ready",
  "clean_all_ready",
  "clean_all_ready_all",
  "clean_all_ready_clean",
  "clean_all_ready_cleaned",
  "clean_all_ready_go",
  "clean_all_ready_ready",
  "cleaned_all",
  "cleaned_all_all",
  "cleaned_all_clean",
  "cleaned_all_cleaned",
  "cleaned_all_go",
  "cleaned_all_go_all",
  "cleaned_all_go_clean",
  "cleaned_all_go_cleaned",
  "cleaned_all_go_ready",
  "cleaned_all_ready",
  "cleaned_all_ready_all",
  "cleaned_all_ready_clean",
  "cleaned_all_ready_cleaned",
  "cleaned_all_ready_go",
  "cleaned_all_ready_ready",
  "clean_clean",
  "clean_clean_all",
  "clean_clean_clean",
  "clean_clean_cleaned",
  "clean_clean_go",
  "clean_clean_go_all",
  "clean_clean_go_clean",
  "clean_clean_go_cleaned",
  "clean_clean_go_ready",
  "clean_clean_ready",
  "clean_clean_ready_all",
  "clean_clean_ready_clean",
  "clean_clean_ready_cleaned",
  "clean_clean_ready_go",
  "clean_clean_ready_ready",
  "clean_ready",
  "clean_ready_all",
  "clean_ready_clean",
  "clean_ready_cleaned",
  "clean_ready_go",
  "clean_ready_go_all",
  "clean_ready_go_clean",
  "clean_ready_go_cleaned",
  "clean_ready_go_ready",
  "clean_ready_ready",
  "ready_clean",
  "ready_clean_all",
  "ready_clean_clean",
  "ready_clean_cleaned",
  "ready_clean_go",
  "ready_clean_go_all",
  "ready_clean_go_clean",
  "ready_clean_go_cleaned",
  "ready_clean_go_ready",
  "ready_clean_ready",
  "ready_clean_ready_all",
  "ready_clean_ready_clean",
  "ready_clean_ready_cleaned",
  "ready_clean_ready_go",
  "ready_clean_ready_ready",
  "ready_cleaned",
  "ready_cleaned_all",
  "ready_cleaned_clean",
  "ready_cleaned_cleaned",
  "ready_cleaned_go",
  "ready_cleaned_go_all",
  "ready_cleaned_go_clean",
  "ready_cleaned_go_cleaned",
  "ready_cleaned_go_ready",
  "ready_cleaned_ready",
  "ready_cleaned_ready_all",
  "ready_cleaned_ready_clean",
  "ready_cleaned_ready_cleaned",
  "ready_cleaned_ready_go",
  "ready_cleaned_ready_ready",
  "cleaned_ready",
  "cleaned_ready_all",
  "cleaned_ready_clean",
  "cleaned_ready_cleaned",
  "cleaned_ready_go",
  "cleaned_ready_go_all",
  "cleaned_ready_go_clean",
  "cleaned_ready_go_cleaned",
  "cleaned_ready_go_ready",
  "cleaned_ready_ready",
  "cleaned_ready_ready_all",
  "cleaned_ready_ready_clean",
  "cleaned_ready_ready_cleaned",
  "cleaned_ready_ready_go",
  "cleaned_ready_ready_ready",
  "cleaned_clean",
  "cleaned_clean_all",
  "cleaned_clean_clean",
  "cleaned_clean_cleaned",
  "cleaned_clean_go",
  "cleaned_clean_go_all",
  "cleaned_clean_go_clean",
  "cleaned_clean_go_cleaned",
  "cleaned_clean_go_ready",
  "cleaned_clean_ready",
  "cleaned_clean_ready_all",
  "cleaned_clean_ready_clean",
  "cleaned_clean_ready_cleaned",
  "cleaned_clean_ready_go",
  "cleaned_clean_ready_ready",
  "cleaned_cleaned",
  "cleaned_cleaned_all",
  "cleaned_cleaned_clean",
  "cleaned_cleaned_cleaned",
  "cleaned_cleaned_go",
  "cleaned_cleaned_go_all",
  "cleaned_cleaned_go_clean",
  "cleaned_cleaned_go_cleaned",
  "cleaned_cleaned_go_ready",
  "cleaned_cleaned_ready",
  "cleaned_cleaned_ready_all",
  "cleaned_cleaned_ready_clean",
  "cleaned_cleaned_ready_cleaned",
  "cleaned_cleaned_ready_go",
  "cleaned_cleaned_ready_ready",
  "clean_set",
  "clean_set_all",
  "clean_set_clean",
  "clean_set_cleaned",
  "clean_set_go",
  "clean_set_go_all",
  "clean_set_go_clean",
  "clean_set_go_cleaned",
  "clean_set_go_ready",
  "clean_set_ready",
  "clean_set_ready_all",
  "clean_set_ready_clean",
  "clean_set_ready_cleaned",
  "clean_set_ready_go",
  "clean_set_ready_ready",
  "set_clean",
  "set_clean_all",
  "set_clean_clean",
  "set_clean_cleaned",
  "set_clean_go",
  "set_clean_go_all",
  "set_clean_go_clean",
  "set_clean_go_cleaned",
  "set_clean_go_ready",
  "set_clean_ready",
  "set_clean_ready_all",
  "set_clean_ready_clean",
  "set_clean_ready_cleaned",
  "set_clean_ready_go",
  "set_clean_ready_ready",
  "set_cleaned",
  "set_cleaned_all",
  "set_cleaned_clean",
  "set_cleaned_cleaned",
  "set_cleaned_go",
  "set_cleaned_go_all",
  "set_cleaned_go_clean",
  "set_cleaned_go_cleaned",
  "set_cleaned_go_ready",
  "set_cleaned_ready",
  "set_cleaned_ready_all",
  "set_cleaned_ready_clean",
  "set_cleaned_ready_cleaned",
  "set_cleaned_ready_go",
  "set_cleaned_ready_ready",
  "cleaned_set",
  "cleaned_set_all",
  "cleaned_set_clean",
  "cleaned_set_cleaned",
  "cleaned_set_go",
  "cleaned_set_go_all",
  "cleaned_set_go_clean",
  "cleaned_set_go_cleaned",
  "cleaned_set_go_ready",
  "cleaned_set_ready",
  "cleaned_set_ready_all",
  "cleaned_set_ready_clean",
  "cleaned_set_ready_cleaned",
  "cleaned_set_ready_go",
  "cleaned_set_ready_ready",
  "clean_go",
  "clean_go_all",
  "clean_go_clean",
  "clean_go_cleaned",
  "clean_go_go",
  "clean_go_ready",
  "clean_go_ready_all",
  "clean_go_ready_clean",
  "clean_go_ready_cleaned",
  "clean_go_ready_go",
  "clean_go_ready_ready",
  "cleaned_go",
  "cleaned_go_all",
  "cleaned_go_clean",
  "cleaned_go_cleaned",
  "cleaned_go_go",
  "cleaned_go_ready",
  "cleaned_go_ready_all",
  "cleaned_go_ready_clean",
  "cleaned_go_ready_cleaned",
  "cleaned_go_ready_go",
  "cleaned_go_ready_ready",
  "go_clean",
  "go_clean_all",
  "go_clean_clean",
  "go_clean_cleaned",
  "go_clean_go",
  "go_clean_ready",
  "go_clean_ready_all",
  "go_clean_ready_clean",
  "go_clean_ready_cleaned",
  "go_clean_ready_go",
  "go_clean_ready_ready",
  "go_cleaned",
  "go_cleaned_all",
  "go_cleaned_clean",
  "go_cleaned_cleaned",
  "go_cleaned_go",
  "go_cleaned_ready",
  "go_cleaned_ready_all",
  "go_cleaned_ready_clean",
  "go_cleaned_ready_cleaned",
  "go_cleaned_ready_go",
  "go_cleaned_ready_ready",
  "go_set",
  "go_set_all",
  "go_set_ready",
  "go_set_ready_all",
  "go_set_ready_clean",
  "go_set_ready_cleaned",
  "go_set_ready_go",
  "go_set_ready_ready",
  "set_go",
  "set_go_all",
  "set_go_ready",
  "set_go_ready_all",
  "set_go_ready_clean",
  "set_go_ready_cleaned",
  "set_go_ready_go",
  "set_go_ready_ready",
  "clean",
]);

async function waitForRuntimeReadiness({
  statusUrl,
  streamUrl,
  ingestUrl,
  stateUrl,
  gameplayRuntimeUrl,
  manifestUrl,
  timeoutMs = Number(process.env.IRIS_LOCAL_STREAMING_RUNTIME_CHECK_TIMEOUT_MS ?? 25_000),
  intervalMs = 250,
}) {
  const readinessTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.min(timeoutMs, 60_000) : 25_000;
  const deadline = Date.now() + readinessTimeoutMs;
  const pollIntervalMs =
    Number.isFinite(intervalMs) && intervalMs > 0
      ? Math.min(intervalMs, 1_000, Math.max(1, Math.floor(readinessTimeoutMs / 4)))
      : 250;
  while (Date.now() < deadline) {
    const readiness = await inspectRuntimeReadiness({
        statusUrl,
        streamUrl,
        ingestUrl,
        stateUrl,
        gameplayRuntimeUrl,
        manifestUrl,
      });
    if (readiness.ready) {
      return readiness;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return await inspectRuntimeReadiness({
    statusUrl,
    streamUrl,
    ingestUrl,
    stateUrl,
    gameplayRuntimeUrl,
    manifestUrl,
  });
}
