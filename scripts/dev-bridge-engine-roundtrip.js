import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { normalizeYouTubeComment } from "../src/adapters/youtube/commentAdapter.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createLocalBridgeServer } from "../src/server/localBridgeServer.js";
import { createLocalBridgeEngineWorker } from "../src/server/localBridgeEngineWorker.js";
import { listen } from "../src/server/httpServer.js";

const BRIDGE_ENGINE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "final_decision",
  "local_bridge_configured",
  "local_engine_fixture_configured",
  "local_outbox_configured",
  "local_artifact_storage_configured",
  "fixture_storage",
  "worker_readiness_status",
  "adapter_readiness_status",
  "engine_request_counts",
  "engine_preferences_received",
  "worker_report",
  "latest_artifacts",
  "boundary_policy",
]);

const tempDir = mkdtempSync(join(tmpdir(), "iris-bridge-engine-roundtrip-"));
const outboxDir = join(tempDir, "outbox");
const artifactDir = join(tempDir, "artifacts");
const received = {
  tts: 0,
  live2d: 0,
  subtitle: 0,
  tts_preferences: false,
  live2d_preferences: false,
};

const engineServer = createServer(async (request, response) => {
  const body = await readRequestJson(request);
  if (request.url === "/tts-engine") {
    received.tts += 1;
    const ttsPreferences =
      body.engine_preferences &&
      typeof body.engine_preferences === "object" &&
      !Array.isArray(body.engine_preferences)
        ? body.engine_preferences
        : {};
    received.tts_preferences = [
      "voice_id",
      "model",
      "locale",
      "character_voice_profile_id",
      "character_voice_style_profile_id",
      "licensed_voice_source_status",
      "voice_license_use_category_count",
      "voice_license_use_category_configured_count",
      "voice_license_use_category_missing_count",
    ].every((field) =>
      Object.hasOwn(ttsPreferences, field)
    );
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        voice_audio_content: {
          audio_data_base64: Buffer.from("RIFF1234WAVEdata", "ascii").toString("base64"),
          audio_mime: "audio/wav",
        },
        audio_mime: "audio/wav",
        duration_ms: body.estimated_duration_ms ?? 1200,
        sample_rate_hz: 48000,
        visemes: [{ at_ms: 0, shape: "a" }],
        bridge_status: "rendered",
      })
    );
    return;
  }
  if (request.url === "/live2d-engine") {
    received.live2d += 1;
    const live2dPreferences =
      body.engine_preferences &&
      typeof body.engine_preferences === "object" &&
      !Array.isArray(body.engine_preferences)
        ? body.engine_preferences
        : {};
    received.live2d_preferences = ["model_id", "scene_id"].every((field) =>
      Object.hasOwn(live2dPreferences, field)
    );
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        bridge_status: "rendered",
        duration_ms: body.timing?.total_duration_ms ?? 1200,
        animation_cue_data: {
          animation_cue: createRendererCue(body),
        },
      })
    );
    return;
  }
  if (request.url === "/subtitle-engine") {
    received.subtitle += 1;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        bridge_status: "rendered",
        duration_ms: body.timing?.total_duration_ms ?? 1200,
        subtitle_data: {
          vtt: createSubtitleVtt(body),
        },
      })
    );
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

const bridgeServer = createLocalBridgeServer({ outboxDir, logger: { error() {} } });
const engineAddress = await listen(engineServer, { port: 0, host: "127.0.0.1" });
const bridgeAddress = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });
const engineUrl = `http://${engineAddress.address}:${engineAddress.port}`;
const bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;

try {
  const env = {
    ...process.env,
    IRIS_TTS_ADAPTER: "http",
    IRIS_TTS_ENDPOINT: `${bridgeUrl}/tts`,
    IRIS_LIVE2D_ADAPTER: "http",
    IRIS_LIVE2D_ENDPOINT: `${bridgeUrl}/live2d`,
    IRIS_SUBTITLE_ADAPTER: "http",
    IRIS_SUBTITLE_ENDPOINT: `${bridgeUrl}/subtitle`,
    IRIS_GAME_CONTROL_ADAPTER: "mock",
    IRIS_GAME_CONTROL_ENDPOINT: "",
    IRIS_GAME_OBSERVATION_ENDPOINT: "",
    IRIS_MEMORY_SEARCH_ADAPTER: "local",
    IRIS_MEMORY_SEARCH_ENDPOINT: "",
    IRIS_MEDIA_WATCH_ENDPOINT: "",
  };
  const runtime = createIrisRuntime({
    runtimeConfig: createRuntimeConfig(env),
    ...createRuntimeAdaptersFromEnv(env),
    logger: { log() {} },
  });
  const result = await runtime.processEvent(
    normalizeYouTubeComment({
      text: process.argv.slice(2).join(" ") || "IRIS, engine bridge roundtrip",
      display_name: "local_engine_tester",
      author_channel_id: "local-engine-tester",
    })
  );
  const worker = createLocalBridgeEngineWorker({
    outboxDir,
    artifactDir,
    ttsEngineEndpoint: `${engineUrl}/tts-engine`,
    strictTtsHttpEngine: true,
    ttsEngineVoiceId: "fixture-iris-voice",
    ttsEngineModel: "fixture-tts-model",
    ttsEngineLocale: "ja-JP",
    ttsCharacterVoiceProfileId: "fixture-character-voice-profile",
    ttsCharacterVoiceStyleProfileId: "fixture-character-voice-style",
    ttsLicensedVoiceSourceStatus: "licensed",
    ttsVoiceLicenseStreamUseStatus: "licensed",
    ttsVoiceLicensePrerecordedLineUseStatus: "licensed",
    ttsVoiceLicenseVoiceProductUseStatus: "licensed",
    ttsVoiceLicenseSponsorCampaignUseStatus: "licensed",
    live2dEngineEndpoint: `${engineUrl}/live2d-engine`,
    live2dEngineModelId: "fixture-live2d-model",
    live2dEngineSceneId: "fixture-stream-scene",
    subtitleEngineEndpoint: `${engineUrl}/subtitle-engine`,
  });
  const report = await worker.processUntilIdle({ maxPasses: 3 });
  const ttsReceipt = JSON.parse(
    readFileSync(join(artifactDir, "tts", "latest_receipt.json"), "utf8")
  );
  const live2dReceipt = JSON.parse(
    readFileSync(join(artifactDir, "live2d", "latest_receipt.json"), "utf8")
  );
  const subtitleReceipt = JSON.parse(
    readFileSync(join(artifactDir, "subtitle", "latest_receipt.json"), "utf8")
  );
  assertLatestArtifactReceipt(ttsReceipt, {
    adapterKind: "tts",
    artifactKind: "audio_wav",
    engineMode: "http",
  });
  assertLatestArtifactReceipt(live2dReceipt, {
    adapterKind: "live2d",
    artifactKind: "live2d_engine_cue_json",
    engineMode: "http",
  });
  assertLatestArtifactReceipt(subtitleReceipt, {
    adapterKind: "subtitle",
    artifactKind: "subtitle_vtt",
    engineMode: "http",
  });

  console.log(
    JSON.stringify(
      createPublicReport({
        result,
        report,
        ttsReceipt,
        live2dReceipt,
        subtitleReceipt,
      }),
      null,
      2
    )
  );
} finally {
  await closeServer(bridgeServer);
  await closeServer(engineServer);
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function createPublicReport({
  result,
  report,
  ttsReceipt,
  live2dReceipt,
  subtitleReceipt,
}) {
  const publicReport = {
    ok: true,
    final_decision: result.core.phase15.final_decision,
    local_bridge_configured: true,
    local_engine_fixture_configured: true,
    local_outbox_configured: true,
    local_artifact_storage_configured: true,
    fixture_storage: true,
    worker_readiness_status: report.worker_readiness_status,
    adapter_readiness_status: report.adapter_readiness_status,
    engine_request_counts: {
      tts: received.tts,
      live2d: received.live2d,
      subtitle: received.subtitle,
    },
    engine_preferences_received: {
      tts: received.tts_preferences,
      live2d: received.live2d_preferences,
    },
    worker_report: summarizeWorkerReport(report),
    latest_artifacts: {
      tts: {
        artifact_kind: ttsReceipt.artifact_kind,
        engine_mode: ttsReceipt.engine_mode,
        artifact_available: String(ttsReceipt.artifact_path ?? "").trim() !== "",
      },
      live2d: {
        artifact_kind: live2dReceipt.artifact_kind,
        engine_mode: live2dReceipt.engine_mode,
        artifact_available: String(live2dReceipt.artifact_path ?? "").trim() !== "",
      },
      subtitle: {
        artifact_kind: subtitleReceipt.artifact_kind,
        engine_mode: subtitleReceipt.engine_mode,
        artifact_available: String(subtitleReceipt.artifact_path ?? "").trim() !== "",
      },
    },
    boundary_policy: {
      no_endpoint_values: true,
      no_raw_engine_requests: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
      ids_hidden: true,
    },
  };
  assertBridgeEngineRoundtripReportSafe(publicReport);
  assertNoUnsafeReportLeak(publicReport);
  return publicReport;
}

function summarizeWorkerReport(report) {
  if (!report) return null;
  return {
    schema: report.schema,
    worker_readiness_status: report.worker_readiness_status,
    adapter_readiness_status: report.adapter_readiness_status,
    pass_count: report.pass_count,
    attempted_count: report.attempted_count,
    processed_count: report.processed_count,
    failed_count: report.failed_count,
    skipped_count: report.skipped_count,
    expired_count: report.expired_count,
    reached_idle: report.reached_idle === true,
    by_adapter: report.by_adapter,
    engine_modes: report.engine_modes,
    engine_preferences_configured: report.engine_preferences_configured,
    job_freshness_policy: report.job_freshness_policy,
    event_render_manifest_count: report.event_render_manifest_count,
    event_render_manifests: (report.event_render_manifests ?? []).map((manifest) => ({
      schema: manifest.schema,
      manifest_id_present: String(manifest.manifest_id ?? "").trim() !== "",
      event_id_present: String(manifest.event_id ?? "").trim() !== "",
      complete: manifest.complete === true,
      adapter_kinds: manifest.adapter_kinds,
      artifact_kind_by_adapter: manifest.artifact_kind_by_adapter,
      engine_mode_by_adapter: manifest.engine_mode_by_adapter,
      boundary_policy: manifest.boundary_policy,
      adapter_validation_required: manifest.adapter_validation_required === true,
    })),
    final_status: summarizeWorkerStatus(report.final_status),
    boundary_policy: report.boundary_policy,
    adapter_validation_required: report.adapter_validation_required === true,
  };
}

function summarizeWorkerStatus(status) {
  if (!status) return null;
  return {
    schema: status.schema,
    worker_readiness_status: status.worker_readiness_status,
    adapter_readiness_status: status.adapter_readiness_status,
    processed_job_count: status.processed_job_count,
    artifact_dir_configured: String(artifactDir ?? "").trim() !== "",
    supported_adapter_kinds: status.supported_adapter_kinds,
    engine_modes: status.engine_modes,
    engine_preferences_configured: status.engine_preferences_configured,
    event_render_manifests: {
      schema: status.event_render_manifests?.schema,
      artifact_dir_configured:
        String(artifactDir ?? "").trim() !== "",
      manifest_count: status.event_render_manifests?.manifest_count ?? 0,
      complete_manifest_count:
        status.event_render_manifests?.complete_manifest_count ?? 0,
      invalid_json_line_count:
        status.event_render_manifests?.invalid_json_line_count ?? 0,
      latest_manifest_id_present: latestManifestIdPresent(),
      required_adapter_kinds: status.event_render_manifests?.required_adapter_kinds ?? [],
      boundary_policy: status.event_render_manifests?.boundary_policy,
      adapter_validation_required:
        status.event_render_manifests?.adapter_validation_required === true,
    },
    retry_policy: status.retry_policy,
    job_freshness_policy: status.job_freshness_policy,
    outbox_queue: status.outbox_queue,
    boundary_policy: status.boundary_policy,
    adapter_validation_required: status.adapter_validation_required === true,
  };
}

function latestManifestIdPresent() {
  try {
    const manifest = JSON.parse(
      readFileSync(join(artifactDir, "latest_event_render_manifest.json"), "utf8")
    );
    return String(manifest.manifest_id ?? "").trim() !== "";
  } catch {
    return false;
  }
}

function createRendererCue(body) {
  return {
    schema: "iris_live2d_renderer_cue_v1",
    motion: {
      style: body.motion_style || "idle_breath",
      intensity: Number(body.motion_intensity ?? 0),
      body_state_id: body.body_state_id || "",
    },
    expression: {
      profile_id: body.expression_profile_id || "neutral",
      autonomous_state_id: body.autonomous_state_id || "none",
    },
    timing: {
      total_duration_ms: Number(body.timing?.total_duration_ms ?? 1200),
      hold_ms: Number(body.timing?.hold_ms ?? 0),
    },
    boundary_policy: {
      renderer_cue_only: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function createSubtitleVtt(body) {
  const durationMs = Number(body.timing?.total_duration_ms ?? 1200);
  const endMs = Math.max(1000, Math.min(60_000, durationMs));
  return `WEBVTT

00:00:00.000 --> ${formatVttTimestamp(endMs)}
IRIS subtitle engine check
`;
}

function formatVttTimestamp(ms) {
  const value = Math.max(0, Number(ms) || 0);
  const hours = Math.floor(value / 3_600_000);
  const minutes = Math.floor((value % 3_600_000) / 60_000);
  const seconds = Math.floor((value % 60_000) / 1000);
  const millis = Math.floor(value % 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function assertBridgeEngineRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("bridge engine roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!BRIDGE_ENGINE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`bridge engine roundtrip unexpected report field ${field}`);
    }
  }
  for (const field of [
    "local_bridge_configured",
    "local_engine_fixture_configured",
    "local_outbox_configured",
    "local_artifact_storage_configured",
    "fixture_storage",
  ]) {
    if (report[field] !== true) {
      throw new Error(`bridge engine roundtrip setup flag failed: ${field}`);
    }
  }
  for (const field of [
    "no_endpoint_values",
    "no_raw_engine_requests",
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`bridge engine roundtrip boundary flag failed: ${field}`);
    }
  }
}

function assertLatestArtifactReceipt(receipt, { adapterKind, artifactKind, engineMode }) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    throw new Error(`bridge engine roundtrip ${adapterKind} receipt missing`);
  }
  if (receipt.adapter_kind !== adapterKind) {
    throw new Error(`bridge engine roundtrip ${adapterKind} receipt adapter mismatch`);
  }
  if (receipt.artifact_kind !== artifactKind) {
    throw new Error(`bridge engine roundtrip ${adapterKind} receipt artifact mismatch`);
  }
  if (receipt.engine_mode !== engineMode) {
    throw new Error(`bridge engine roundtrip ${adapterKind} receipt engine mode mismatch`);
  }
}

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    bridgeUrl,
    engineUrl,
    tempDir,
    outboxDir,
    artifactDir,
    "IRIS, engine bridge roundtrip",
    "local_engine_tester",
    '"text"',
    '"subtitle_text"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    "token-value",
    "secret-value",
  ].filter(Boolean);
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`bridge engine roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

async function readRequestJson(request) {
  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
