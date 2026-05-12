import "../src/config/loadIrisEnv.js";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_LIVE_BRIDGE_WORKER_MAX_JOB_AGE_MS,
  createLocalBridgeEngineWorker,
} from "../src/server/localBridgeEngineWorker.js";
import {
  createLocalBridgeWorkerCliPayload,
  createLocalBridgeWorkerWatchPayload,
  isLocalBridgeWorkerReportOk,
} from "../src/server/localBridgeWorkerCliReport.js";

const outboxDir =
  optionalEnvValue(process.env.IRIS_LOCAL_BRIDGE_OUTBOX_DIR) ?? "data/local_bridge_outbox";
const artifactDir =
  optionalEnvValue(process.env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR) ??
  "data/local_bridge_artifacts";
const bridgeHost = optionalEnvValue(process.env.IRIS_LOCAL_BRIDGE_HOST) || "127.0.0.1";
const bridgePort = optionalEnvValue(process.env.IRIS_LOCAL_BRIDGE_PORT) || "8790";
const voicevoxBridgeHost =
  optionalEnvValue(process.env.IRIS_VOICEVOX_BRIDGE_HOST) || "127.0.0.1";
const voicevoxBridgePort =
  optionalEnvValue(process.env.IRIS_VOICEVOX_BRIDGE_PORT) || "9110";
const live2dCueBridgeHost =
  optionalEnvValue(process.env.IRIS_LIVE2D_CUE_BRIDGE_HOST) || "127.0.0.1";
const live2dCueBridgePort =
  optionalEnvValue(process.env.IRIS_LIVE2D_CUE_BRIDGE_PORT) || "9113";
const subtitleEngineHost =
  optionalEnvValue(process.env.IRIS_LOCAL_SUBTITLE_ENGINE_HOST) || "127.0.0.1";
const subtitleEnginePort =
  optionalEnvValue(process.env.IRIS_LOCAL_SUBTITLE_ENGINE_PORT) || "9121";
const ttsEngineEndpoint = normalizeLocalEngineEndpoint({
  endpoint:
    optionalEnvValue(process.env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT) ||
    optionalEnvValue(process.env.IRIS_TTS_ENGINE_ENDPOINT) ||
    optionalEnvValue(process.env.IRIS_VOICEVOX_ENGINE_ENDPOINT) ||
    optionalEnvValue(process.env.IRIS_VOICEVOX_ENDPOINT) ||
    optionalEnvValue(process.env.VOICEVOX_ENDPOINT) ||
    optionalEnvValue(process.env.TTS_ENDPOINT) ||
    defaultLocalTtsEngineEndpoint(),
  bridgeHost,
  bridgePort,
  adapterPath: "/tts",
});
const live2dEngineEndpoint = normalizeLocalEngineEndpoint({
  endpoint:
    optionalEnvValue(process.env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT) ||
    optionalEnvValue(process.env.IRIS_LIVE2D_ENGINE_ENDPOINT) ||
    optionalEnvValue(process.env.IRIS_LIVE2D_CUE_ENGINE_ENDPOINT) ||
    optionalEnvValue(process.env.IRIS_LIVE2D_CUE_ENDPOINT) ||
    optionalEnvValue(process.env.LIVE2D_ENDPOINT) ||
    optionalEnvValue(process.env.LIVE2D_CUE_ENDPOINT) ||
    defaultLocalLive2dEngineEndpoint(),
  bridgeHost,
  bridgePort,
  adapterPath: "/live2d",
});
const subtitleEngineEndpoint = normalizeLocalEngineEndpoint({
  endpoint:
    optionalEnvValue(process.env.IRIS_LOCAL_SUBTITLE_ENGINE_ENDPOINT) ||
    optionalEnvValue(process.env.IRIS_SUBTITLE_ENGINE_ENDPOINT) ||
    optionalEnvValue(process.env.IRIS_SUBTITLE_RENDERER_ENDPOINT) ||
    optionalEnvValue(process.env.IRIS_CAPTION_ENGINE_ENDPOINT) ||
    optionalEnvValue(process.env.IRIS_CAPTION_ENDPOINT) ||
    optionalEnvValue(process.env.SUBTITLE_ENDPOINT) ||
    optionalEnvValue(process.env.CAPTION_ENDPOINT) ||
    defaultLocalSubtitleEngineEndpoint(),
  bridgeHost,
  bridgePort,
  adapterPath: "/subtitle",
});
const requireRealRuntimeAdapters =
  process.env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true";
const worker = createLocalBridgeEngineWorker({
  outboxDir,
  artifactDir,
  ttsEngineEndpoint,
  ttsEngineApiKey:
    optionalEnvValue(process.env.IRIS_LOCAL_TTS_ENGINE_API_KEY) ??
    optionalEnvValue(process.env.IRIS_TTS_ENGINE_API_KEY) ??
    optionalEnvValue(process.env.IRIS_VOICEVOX_ENGINE_API_KEY) ??
    optionalEnvValue(process.env.IRIS_LOCAL_ENGINE_API_KEY) ??
    optionalEnvValue(process.env.IRIS_VOICEVOX_API_KEY) ??
    optionalEnvValue(process.env.VOICEVOX_API_KEY) ??
    optionalEnvValue(process.env.TTS_API_KEY) ??
    "",
  ttsEngineVoiceId:
    optionalEnvValue(process.env.IRIS_LOCAL_TTS_ENGINE_VOICE_ID) ??
    optionalEnvValue(process.env.IRIS_TTS_ENGINE_VOICE_ID) ??
    optionalEnvValue(process.env.IRIS_VOICEVOX_SPEAKER_ID) ??
    optionalEnvValue(process.env.IRIS_VOICEVOX_VOICE_ID) ??
    optionalEnvValue(process.env.VOICEVOX_SPEAKER_ID) ??
    optionalEnvValue(process.env.VOICEVOX_VOICE_ID) ??
    optionalEnvValue(process.env.TTS_VOICE_ID) ??
    "",
  ttsEngineModel:
    optionalEnvValue(process.env.IRIS_LOCAL_TTS_ENGINE_MODEL) ??
    optionalEnvValue(process.env.IRIS_TTS_ENGINE_MODEL) ??
    optionalEnvValue(process.env.IRIS_VOICEVOX_MODEL) ??
    optionalEnvValue(process.env.VOICEVOX_MODEL) ??
    optionalEnvValue(process.env.TTS_MODEL) ??
    "",
  ttsEngineLocale:
    optionalEnvValue(process.env.IRIS_LOCAL_TTS_ENGINE_LOCALE) ??
    optionalEnvValue(process.env.IRIS_TTS_ENGINE_LOCALE) ??
    "",
  ttsCharacterVoiceProfileId:
    optionalEnvValue(process.env.IRIS_CHARACTER_VOICE_PROFILE_ID) ?? "",
  ttsCharacterVoiceStyleProfileId:
    optionalEnvValue(process.env.IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID) ?? "",
  ttsLicensedVoiceSourceStatus:
    optionalEnvValue(process.env.IRIS_LICENSED_VOICE_SOURCE_STATUS) ?? "",
  ttsVoiceLicenseStreamUseStatus:
    optionalEnvValue(process.env.IRIS_VOICE_LICENSE_STREAM_USE_STATUS) ?? "",
  ttsVoiceLicensePrerecordedLineUseStatus:
    optionalEnvValue(process.env.IRIS_VOICE_LICENSE_PRERECORDED_LINE_USE_STATUS) ?? "",
  ttsVoiceLicenseVoiceProductUseStatus:
    optionalEnvValue(process.env.IRIS_VOICE_LICENSE_VOICE_PRODUCT_USE_STATUS) ?? "",
  ttsVoiceLicenseSponsorCampaignUseStatus:
    optionalEnvValue(process.env.IRIS_VOICE_LICENSE_SPONSOR_CAMPAIGN_USE_STATUS) ?? "",
  live2dEngineEndpoint,
  live2dEngineApiKey:
    optionalEnvValue(process.env.IRIS_LOCAL_LIVE2D_ENGINE_API_KEY) ??
    optionalEnvValue(process.env.IRIS_LIVE2D_ENGINE_API_KEY) ??
    optionalEnvValue(process.env.IRIS_LIVE2D_CUE_ENGINE_API_KEY) ??
    optionalEnvValue(process.env.IRIS_LOCAL_ENGINE_API_KEY) ??
    optionalEnvValue(process.env.IRIS_LIVE2D_CUE_API_KEY) ??
    optionalEnvValue(process.env.IRIS_LIVE2D_API_KEY) ??
    optionalEnvValue(process.env.LIVE2D_CUE_API_KEY) ??
    optionalEnvValue(process.env.LIVE2D_API_KEY) ??
    "",
  live2dEngineModelId:
    optionalEnvValue(process.env.IRIS_LOCAL_LIVE2D_MODEL_ID) ??
    optionalEnvValue(process.env.IRIS_LIVE2D_MODEL_ID) ??
    optionalEnvValue(process.env.IRIS_LIVE2D_CUE_MODEL_ID) ??
    optionalEnvValue(process.env.IRIS_LIVE2D_MODEL) ??
    optionalEnvValue(process.env.LIVE2D_CUE_MODEL_ID) ??
    optionalEnvValue(process.env.LIVE2D_MODEL_ID) ??
    optionalEnvValue(process.env.LIVE2D_MODEL) ??
    "",
  live2dEngineSceneId:
    optionalEnvValue(process.env.IRIS_LOCAL_LIVE2D_SCENE_ID) ??
    optionalEnvValue(process.env.IRIS_LIVE2D_SCENE_ID) ??
    optionalEnvValue(process.env.IRIS_LIVE2D_CUE_SCENE_ID) ??
    optionalEnvValue(process.env.IRIS_LIVE2D_SCENE) ??
    optionalEnvValue(process.env.LIVE2D_CUE_SCENE_ID) ??
    optionalEnvValue(process.env.LIVE2D_SCENE_ID) ??
    optionalEnvValue(process.env.LIVE2D_SCENE) ??
    "",
  subtitleEngineEndpoint,
  subtitleEngineApiKey:
    optionalEnvValue(process.env.IRIS_LOCAL_SUBTITLE_ENGINE_API_KEY) ??
    optionalEnvValue(process.env.IRIS_SUBTITLE_ENGINE_API_KEY) ??
    optionalEnvValue(process.env.IRIS_SUBTITLE_RENDERER_API_KEY) ??
    optionalEnvValue(process.env.IRIS_CAPTION_ENGINE_API_KEY) ??
    optionalEnvValue(process.env.IRIS_LOCAL_ENGINE_API_KEY) ??
    optionalEnvValue(process.env.IRIS_CAPTION_API_KEY) ??
    optionalEnvValue(process.env.SUBTITLE_API_KEY) ??
    optionalEnvValue(process.env.CAPTION_API_KEY) ??
    "",
  engineTimeoutMs: Number(
    optionalEnvValue(process.env.IRIS_LOCAL_ENGINE_TIMEOUT_MS) ??
      optionalEnvValue(process.env.IRIS_LOCAL_TTS_ENGINE_TIMEOUT_MS) ??
      optionalEnvValue(process.env.IRIS_TTS_ENGINE_TIMEOUT_MS) ??
      optionalEnvValue(process.env.IRIS_TTS_TIMEOUT_MS) ??
      optionalEnvValue(process.env.IRIS_VOICEVOX_ENGINE_TIMEOUT_MS) ??
      optionalEnvValue(process.env.IRIS_VOICEVOX_TIMEOUT_MS) ??
      optionalEnvValue(process.env.VOICEVOX_TIMEOUT_MS) ??
      optionalEnvValue(process.env.TTS_TIMEOUT_MS) ??
      optionalEnvValue(process.env.IRIS_LOCAL_LIVE2D_ENGINE_TIMEOUT_MS) ??
      optionalEnvValue(process.env.IRIS_LIVE2D_ENGINE_TIMEOUT_MS) ??
      optionalEnvValue(process.env.IRIS_LIVE2D_TIMEOUT_MS) ??
      optionalEnvValue(process.env.IRIS_LIVE2D_CUE_ENGINE_TIMEOUT_MS) ??
      optionalEnvValue(process.env.LIVE2D_TIMEOUT_MS) ??
      optionalEnvValue(process.env.IRIS_LOCAL_SUBTITLE_ENGINE_TIMEOUT_MS) ??
      optionalEnvValue(process.env.IRIS_SUBTITLE_ENGINE_TIMEOUT_MS) ??
      optionalEnvValue(process.env.IRIS_SUBTITLE_TIMEOUT_MS) ??
      optionalEnvValue(process.env.IRIS_CAPTION_ENGINE_TIMEOUT_MS) ??
      optionalEnvValue(process.env.SUBTITLE_TIMEOUT_MS) ??
      5000
  ),
  retryBackoffMs: Number(
    optionalEnvValue(process.env.IRIS_LOCAL_BRIDGE_WORKER_RETRY_BACKOFF_MS) ?? 5000
  ),
  retryMaxBackoffMs: Number(
    optionalEnvValue(process.env.IRIS_LOCAL_BRIDGE_WORKER_RETRY_MAX_BACKOFF_MS) ?? 300000
  ),
  maxRetryAttempts: Number(
    optionalEnvValue(process.env.IRIS_LOCAL_BRIDGE_WORKER_MAX_RETRY_ATTEMPTS) ?? 3
  ),
  strictHttpEngines: process.env.IRIS_LOCAL_ENGINE_STRICT_HTTP === "true",
  strictTtsHttpEngine:
    process.env.IRIS_LOCAL_TTS_ENGINE_STRICT_HTTP === "true" ||
    requireRealRuntimeAdapters ||
    (optionalEnvValue(process.env.IRIS_LOCAL_TTS_ENGINE_STRICT_HTTP) !== "false" &&
      Boolean(ttsEngineEndpoint)),
  strictLive2dHttpEngine:
    process.env.IRIS_LOCAL_LIVE2D_ENGINE_STRICT_HTTP === "true" ||
    requireRealRuntimeAdapters ||
    (optionalEnvValue(process.env.IRIS_LOCAL_LIVE2D_ENGINE_STRICT_HTTP) !== "false" &&
      Boolean(live2dEngineEndpoint)),
  strictSubtitleHttpEngine:
    process.env.IRIS_LOCAL_SUBTITLE_ENGINE_STRICT_HTTP === "true" ||
    requireRealRuntimeAdapters ||
    (optionalEnvValue(process.env.IRIS_LOCAL_SUBTITLE_ENGINE_STRICT_HTTP) !== "false" &&
      Boolean(subtitleEngineEndpoint)),
  maxJobAgeMs:
    optionalEnvValue(process.env.IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS) ??
    DEFAULT_LIVE_BRIDGE_WORKER_MAX_JOB_AGE_MS,
});
const oneShotMode =
  process.argv.includes("--once") || process.argv.includes("--run-once");
const watchMode =
  !oneShotMode &&
  (process.argv.includes("--watch") || process.env.IRIS_LOCAL_BRIDGE_WORKER_WATCH === "true");
const maxPasses = clampInteger(
  optionalEnvValue(process.env.IRIS_LOCAL_BRIDGE_WORKER_MAX_PASSES) ?? 5,
  1,
  200,
  5
);
const limitPerKind = clampInteger(
  optionalEnvValue(process.env.IRIS_LOCAL_BRIDGE_WORKER_LIMIT_PER_KIND) ?? 50,
  1,
  500,
  50
);
const continueOnError = process.env.IRIS_LOCAL_BRIDGE_WORKER_CONTINUE_ON_ERROR === "true";
const intervalMs = clampInteger(
  optionalEnvValue(process.env.IRIS_LOCAL_BRIDGE_WORKER_INTERVAL_MS) ?? 1000,
  100,
  60_000,
  1000
);
const showLocalPaths = process.env.IRIS_SHOW_LOCAL_PATHS === "true";

if (!watchMode) {
  const report = await worker.processUntilIdle({
    maxPasses,
    limitPerKind,
    continueOnError,
  });
  const payload = createLocalBridgeWorkerCliPayload({
    report,
    outboxDir,
    artifactDir,
    showLocalPaths,
  });
  console.log(
    JSON.stringify(payload, null, 2)
  );
  if (!payload.ok) process.exitCode = 1;
} else {
  const lock = acquireWorkerWatchLock({ artifactDir });
  const payload = createLocalBridgeWorkerWatchPayload({
    worker,
    outboxDir,
    artifactDir,
    intervalMs,
    continueOnError,
    showLocalPaths,
  });
  console.log(
    JSON.stringify(payload, null, 2)
  );
  while (true) {
    try {
      const report = await worker.processUntilIdle({
        maxPasses,
        limitPerKind,
        continueOnError,
      });
      lock.refresh();
      const ok = isLocalBridgeWorkerReportOk(report);
      console.log(
        JSON.stringify(createWatchTickPayload({ ok, report }))
      );
    } catch {
      lock.refresh();
      console.log(
        JSON.stringify({
          ok: false,
          mode: "watch_tick_error",
          boundary_policy: {
            no_raw_jobs: true,
            no_text_payloads: true,
            no_candidates: true,
            no_commands: true,
            no_secret_values: true,
          },
        })
      );
    }
    await sleep(intervalMs);
  }
  lock.release();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createWatchTickPayload({ ok, report }) {
  return {
    ok,
    mode: "watch_tick",
    worker_readiness_status: report?.worker_readiness_status ?? "unknown",
    adapter_readiness_status: report?.adapter_readiness_status ?? {},
    processed_count: Number(report?.processed_count ?? 0),
    failed_count: Number(report?.failed_count ?? 0),
    skipped_count: Number(report?.skipped_count ?? 0),
    expired_count: Number(report?.expired_count ?? 0),
    pending_count: Number(report?.final_status?.outbox_queue?.total_pending_count ?? 0),
    retry_blocked_count: Number(
      report?.final_status?.outbox_queue?.total_retry_blocked_count ?? 0
    ),
    render_manifest_count: Number(
      report?.final_status?.event_render_manifests?.manifest_count ?? 0
    ),
    complete_render_manifest_count: Number(
      report?.final_status?.event_render_manifests?.complete_manifest_count ?? 0
    ),
    reached_idle: report?.reached_idle ?? null,
    boundary_policy: {
      counts_only: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
  };
}

function normalizeLocalEngineEndpoint({ endpoint, bridgeHost, bridgePort, adapterPath }) {
  const value = String(endpoint ?? "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    const hostname = url.hostname === "localhost" ? "127.0.0.1" : url.hostname;
    const expectedHost = bridgeHost === "localhost" ? "127.0.0.1" : bridgeHost;
    if (
      hostname === expectedHost &&
      url.port === String(bridgePort) &&
      url.pathname === adapterPath
    ) {
      return "";
    }
  } catch {
    return value;
  }
  return value;
}

function defaultLocalTtsEngineEndpoint() {
  if (
    process.env.IRIS_ENABLE_VOICEVOX_BRIDGE !== "true" &&
    process.env.IRIS_TTS_ADAPTER !== "voicevox"
  ) {
    return "";
  }
  return `http://${voicevoxBridgeHost}:${voicevoxBridgePort}/tts-engine`;
}

function defaultLocalLive2dEngineEndpoint() {
  if (
    process.env.IRIS_ENABLE_LIVE2D_CUE_BRIDGE !== "true" &&
    process.env.IRIS_LIVE2D_ADAPTER !== "live2d_cue"
  ) {
    return "";
  }
  return `http://${live2dCueBridgeHost}:${live2dCueBridgePort}/live2d-engine`;
}

function defaultLocalSubtitleEngineEndpoint() {
  if (process.env.IRIS_ENABLE_LOCAL_SUBTITLE_ENGINE !== "true") return "";
  return `http://${subtitleEngineHost}:${subtitleEnginePort}/subtitle-engine`;
}

function optionalEnvValue(value) {
  const text = String(value ?? "").trim();
  return text ? value : undefined;
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function acquireWorkerWatchLock({ artifactDir }) {
  mkdirSync(artifactDir, { recursive: true });
  const lockPath = join(artifactDir, "worker-watch.lock");
  removeStaleWorkerWatchLock(lockPath);
  let fd;
  try {
    fd = openSync(lockPath, "wx");
    writeFileSync(fd, createWorkerWatchLockPayload());
  } catch {
    console.log(JSON.stringify({
      ok: true,
      mode: "watch_already_running",
      boundary_policy: {
        no_raw_jobs: true,
        no_text_payloads: true,
        no_candidates: true,
        no_commands: true,
        no_secret_values: true,
      },
    }, null, 2));
    process.exit(0);
  }
  const release = () => {
    if (fd === undefined) return;
    try {
      closeSync(fd);
      rmSync(lockPath, { force: true });
    } catch {}
    fd = undefined;
  };
  process.once("exit", release);
  process.once("SIGINT", () => {
    release();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    release();
    process.exit(143);
  });
  const refresh = () => {
    if (fd === undefined) return;
    try {
      writeFileSync(lockPath, createWorkerWatchLockPayload());
    } catch {}
  };
  return { refresh, release };
}

function createWorkerWatchLockPayload() {
  return JSON.stringify({
    schema: "iris_local_bridge_worker_watch_lock_v1",
    pid: process.pid,
    acquired_at_ms: Date.now(),
  });
}

function removeStaleWorkerWatchLock(lockPath) {
  if (!existsSync(lockPath)) return;
  try {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    const ageMs = Date.now() - Number(lock.acquired_at_ms ?? 0);
    const pid = Number(lock.pid ?? 0);
    const maxAgeMs = clampInteger(
      optionalEnvValue(process.env.IRIS_LOCAL_BRIDGE_WORKER_LOCK_MAX_AGE_MS) ?? 3_600_000,
      60_000,
      86_400_000,
      3_600_000
    );
    if (ageMs > maxAgeMs || !isProcessProbablyAlive(pid)) rmSync(lockPath, { force: true });
  } catch {
    rmSync(lockPath, { force: true });
  }
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
