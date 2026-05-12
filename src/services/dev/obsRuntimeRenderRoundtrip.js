import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntimeAdaptersFromEnv } from "../../adapters/runtimeAdapters.js";
import { createIrisRuntime } from "../../runtime/irisRuntime.js";
import { createRuntimeConfig } from "../../runtime/runtimeConfig.js";
import { createStreamState } from "../../runtime/streamState.js";
import { createLocalBridgeEngineWorker } from "../../server/localBridgeEngineWorker.js";
import { createLocalBridgeServer } from "../../server/localBridgeServer.js";
import { createIrisHttpServer, listen } from "../../server/httpServer.js";

const OBS_RUNTIME_RENDER_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "runtime_http_comment_processed",
  "bridge_handoff",
  "engine_request_counts",
  "engine_preferences_received",
  "worker_summary",
  "render_manifest_summary",
  "artifact_delivery",
  "foundation_runtime_status",
  "final_state_summary",
  "production_handoff_summary",
  "boundary_policy",
]);

export async function createObsRuntimeRenderRoundtripReport({
  baseEnv = {},
  keepDevArtifacts = baseEnv.IRIS_KEEP_DEV_ARTIFACTS === "true",
} = {}) {
  const tempDir = mkdtempSync(join(tmpdir(), "iris-obs-runtime-render-roundtrip-"));
  const outboxDir = join(tempDir, "outbox");
  const artifactDir = join(tempDir, "artifacts");
  const renderManifestMaxAgeMs = 60_000;
  const artifactRenderMaxSkewMs = 1_500;
  const engineCounts = { tts: 0, live2d: 0, subtitle: 0 };
  const enginePreferencesReceived = { tts: false, live2d: false };

  const engineServer = createServer(async (request, response) => {
    const body = await readRequestJson(request);
    if (request.method === "POST" && request.url === "/tts-engine") {
      engineCounts.tts += 1;
      const ttsPreferences =
        body.engine_preferences &&
        typeof body.engine_preferences === "object" &&
        !Array.isArray(body.engine_preferences)
          ? body.engine_preferences
          : {};
      enginePreferencesReceived.tts = ["voice_id", "model", "locale"].every((field) =>
        Object.hasOwn(ttsPreferences, field)
      );
      return sendJson(response, 200, {
        audio_base64: Buffer.from("RIFF1234WAVEdata", "ascii").toString("base64"),
        audio_mime: "audio/wav",
        duration_ms: body.estimated_duration_ms ?? 1200,
        sample_rate_hz: 48000,
        visemes: [{ at_ms: 0, shape: "a" }],
        bridge_status: "rendered",
      });
    }
    if (request.method === "POST" && request.url === "/live2d-engine") {
      engineCounts.live2d += 1;
      const live2dPreferences =
        body.engine_preferences &&
        typeof body.engine_preferences === "object" &&
        !Array.isArray(body.engine_preferences)
          ? body.engine_preferences
          : {};
      enginePreferencesReceived.live2d = ["model_id", "scene_id"].every((field) =>
        Object.hasOwn(live2dPreferences, field)
      );
      return sendJson(response, 200, {
        bridge_status: "rendered",
        duration_ms: body.timing?.total_duration_ms ?? 1200,
        cue: createRendererCue(body),
      });
    }
    if (request.method === "POST" && request.url === "/subtitle-engine") {
      engineCounts.subtitle += 1;
      return sendJson(response, 200, {
        bridge_status: "rendered",
        duration_ms: body.timing?.total_duration_ms ?? 1200,
        vtt: createSubtitleVtt(body),
      });
    }
    return sendJson(response, 404, { ok: false, error: "not_found" });
  });

  const bridgeServer = createLocalBridgeServer({
    outboxDir,
    artifactDir,
    maxRenderManifestAgeMs: renderManifestMaxAgeMs,
    maxArtifactRenderSkewMs: artifactRenderMaxSkewMs,
    logger: { error() {} },
  });
  let irisServer = null;
  let engineUrl = "";
  let bridgeUrl = "";
  let irisUrl = "";

  try {
    const engineAddress = await listen(engineServer, {
      port: 0,
      host: "127.0.0.1",
    });
    const bridgeAddress = await listen(bridgeServer, {
      port: 0,
      host: "127.0.0.1",
    });
    engineUrl = `http://${engineAddress.address}:${engineAddress.port}`;
    bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;
    const env = {
      ...baseEnv,
      IRIS_TTS_ADAPTER: "http",
      IRIS_TTS_ENDPOINT: "",
      IRIS_LOCAL_TTS_BRIDGE_ENDPOINT: `${bridgeUrl}/tts`,
      IRIS_LIVE2D_ADAPTER: "http",
      IRIS_LIVE2D_ENDPOINT: "",
      IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT: `${bridgeUrl}/live2d`,
      IRIS_SUBTITLE_ADAPTER: "http",
      IRIS_SUBTITLE_ENDPOINT: "",
      IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT: `${bridgeUrl}/subtitle`,
      IRIS_LOCAL_BRIDGE_OUTBOX_DIR: outboxDir,
      IRIS_LOCAL_BRIDGE_ARTIFACT_DIR: artifactDir,
      IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS: String(
        renderManifestMaxAgeMs
      ),
      IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS: String(
        artifactRenderMaxSkewMs
      ),
      IRIS_LOCAL_TTS_ENGINE_ENDPOINT: `${engineUrl}/tts-engine`,
      IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT: `${engineUrl}/health`,
      IRIS_LOCAL_TTS_ENGINE_VOICE_ID: "fixture-runtime-iris-voice",
      IRIS_LOCAL_TTS_ENGINE_MODEL: "fixture-runtime-tts-model",
      IRIS_LOCAL_TTS_ENGINE_LOCALE: "ja-JP",
      IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT: `${engineUrl}/live2d-engine`,
      IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT: `${engineUrl}/health`,
      IRIS_LOCAL_LIVE2D_MODEL_ID: "fixture-runtime-live2d-model",
      IRIS_LOCAL_LIVE2D_SCENE_ID: "fixture-runtime-stream-scene",
      IRIS_LOCAL_SUBTITLE_ENGINE_ENDPOINT: `${engineUrl}/subtitle-engine`,
      IRIS_LOCAL_SUBTITLE_ENGINE_HEALTH_ENDPOINT: `${engineUrl}/health`,
      IRIS_MEMORY_SEARCH_ADAPTER: "local",
      IRIS_ENABLE_GAME_CONTROL: "false",
      IRIS_GAME_CONTROL_ADAPTER: "mock",
      IRIS_HAS_OPENED: "true",
    };
    const runtime = createIrisRuntime({
      runtimeConfig: createRuntimeConfig(env),
      ...createRuntimeAdaptersFromEnv(env),
      logger: { log() {}, error() {} },
    });
    const streamState = createStreamState();
    irisServer = createIrisHttpServer({
      runtime,
      streamState,
      env,
      logger: { error() {} },
    });
    const irisAddress = await listen(irisServer, { port: 0, host: "127.0.0.1" });
    irisUrl = `http://${irisAddress.address}:${irisAddress.port}`;
    env.IRIS_HTTP_ORIGIN = irisUrl;

    const comment = await postJson(`${irisUrl}/comment`, {
      text: "IRIS, render this through OBS runtime handoff.",
      display_name: "Runtime Render Tester",
      author_channel_id: "runtime-render-tester",
    });
    assert.equal(comment.status, 200);
    assert.equal(comment.body.ok, true);
    assert.equal(comment.body.final_decision, "allow");

    const bridgeStatus = await fetchJson(`${bridgeUrl}/status`);
    assert.equal(bridgeStatus.status, 200);
    assert.equal(bridgeStatus.body.local_bridge_status.total_received, 3);

    const worker = createLocalBridgeEngineWorker({
      outboxDir,
      artifactDir,
      ttsEngineEndpoint: `${engineUrl}/tts-engine`,
      ttsEngineVoiceId: "fixture-runtime-iris-voice",
      ttsEngineModel: "fixture-runtime-tts-model",
      ttsEngineLocale: "ja-JP",
      live2dEngineEndpoint: `${engineUrl}/live2d-engine`,
      live2dEngineModelId: "fixture-runtime-live2d-model",
      live2dEngineSceneId: "fixture-runtime-stream-scene",
      subtitleEngineEndpoint: `${engineUrl}/subtitle-engine`,
    });
    const workerReport = await worker.processUntilIdle({ maxPasses: 3 });
    assert.equal(workerReport.processed_count, 3);
    assert.equal(workerReport.event_render_manifest_count, 1);
    assert.equal(workerReport.reached_idle, true);
    assert.equal(engineCounts.tts, 1);
    assert.equal(engineCounts.live2d, 1);
    assert.equal(engineCounts.subtitle, 1);

    const browserSource = await fetchJson(`${irisUrl}/obs/browser-source`);
    assert.equal(browserSource.status, 200);
    const obsConfig = browserSource.body.obs_overlay_config;
    const browserSourceUrl = new URL(obsConfig.obs_browser_source.browser_source_url);
    assert.equal(browserSourceUrl.origin + browserSourceUrl.pathname, `${irisUrl}/overlay`);
    assert.equal(browserSourceUrl.searchParams.get("manifest"), "/event-render-manifests/latest");
    assert.equal(
      browserSourceUrl.searchParams.get("artifact_tts"),
      "/event-render-manifests/latest/artifact/tts"
    );
    assert.equal(
      browserSourceUrl.searchParams.get("artifact_live2d"),
      "/event-render-manifests/latest/artifact/live2d?allow_partial_visual=true"
    );
    assert.equal(
      browserSourceUrl.searchParams.get("artifact_subtitle"),
      "/event-render-manifests/latest/artifact/subtitle?allow_partial_visual=true"
    );

    const manifestStatus = await fetchJson(
      `${irisUrl}/event-render-manifests/status`
    );
    assert.equal(manifestStatus.status, 200);
    const storeStatus = manifestStatus.body.event_render_manifest_store;
    assert.equal(storeStatus.manifest_count, 1);
    assert.equal(storeStatus.complete_manifest_count, 1);
    assert.equal(storeStatus.boundary_policy.no_artifact_paths, true);

    const latestManifest = await fetchJson(
      `${irisUrl}/event-render-manifests/latest`
    );
    assert.equal(latestManifest.status, 200);
    const manifestReport = latestManifest.body.event_render_manifest_report;
    const manifestSummary = manifestReport.latest_manifest_summary;
    assert.equal(manifestReport.obs_pickup_status, "ready");
    assert.equal(manifestReport.obs_handoff_readiness_status, "ready");
    assert.equal(Object.hasOwn(storeStatus, "latest_manifest_id"), false);
    assert.equal(Object.hasOwn(manifestSummary, "manifest_id"), false);
    assert.equal(Object.hasOwn(manifestSummary, "artifact_byte_hash_by_adapter"), false);

    const latestManifestData = JSON.parse(
      readFileSync(join(artifactDir, "latest_event_render_manifest.json"), "utf8")
    );
    const manifestId = latestManifestData.manifest_id;
    const artifacts = {
      tts: await fetchArtifactSummary(
        `${irisUrl}/event-render-manifests/latest/artifact/tts`,
        manifestId
      ),
      live2d: await fetchArtifactSummary(
        `${irisUrl}/event-render-manifests/latest/artifact/live2d`,
        manifestId
      ),
      subtitle: await fetchArtifactSummary(
        `${irisUrl}/event-render-manifests/latest/artifact/subtitle`,
        manifestId
      ),
    };
    assert.equal(artifacts.tts.status, 200);
    assert.equal(artifacts.live2d.status, 200);
    assert.equal(artifacts.subtitle.status, 200);
    assert.equal(artifacts.tts.manifest_id_matched, true);
    assert.equal(artifacts.live2d.manifest_id_matched, true);
    assert.equal(artifacts.subtitle.manifest_id_matched, true);
    assert.equal(artifacts.tts.content_type, "audio/wav");
    assert.equal(artifacts.live2d.content_type, "application/json; charset=utf-8");
    assert.equal(artifacts.subtitle.content_type, "text/vtt; charset=utf-8");
    assert.equal(artifacts.tts.artifact_kind, "audio_wav");
    assert.equal(artifacts.live2d.artifact_kind, "live2d_engine_cue_json");
    assert.equal(artifacts.subtitle.artifact_kind, "subtitle_vtt");

    const foundationRuntimeStatus = await fetchJson(
      `${irisUrl}/production/foundation-runtime-status`
    );
    assert.equal(foundationRuntimeStatus.status, 200);
    const foundationRuntime =
      foundationRuntimeStatus.body.foundation_runtime_status;
    assert.equal(foundationRuntime.runtime_status, "ready_for_obs_runtime_handoff");
    assert.equal(foundationRuntime.render_handoff.obs_pickup_ready, true);
    assert.equal(foundationRuntime.runtime_summary.obs_handoff_ready, true);
    assert.equal(foundationRuntime.runtime_summary.local_bridge_worker_ready, true);
    assert.equal(foundationRuntime.runtime_summary.real_engine_handoff_ready, true);
    assert.equal(foundationRuntime.runtime_summary.obs_browser_source_ready, true);
    assert.equal(foundationRuntime.runtime_handoff_flow.blocking_stage, "none");

    const report = {
      ok: true,
      schema: "iris_obs_runtime_render_roundtrip_report_v1",
      runtime_http_comment_processed: true,
      bridge_handoff: {
        total_received: bridgeStatus.body.local_bridge_status.total_received,
        tts_received_count:
          bridgeStatus.body.local_bridge_status.adapters.tts.received_count,
        live2d_received_count:
          bridgeStatus.body.local_bridge_status.adapters.live2d.received_count,
        subtitle_received_count:
          bridgeStatus.body.local_bridge_status.adapters.subtitle.received_count,
      },
      engine_request_counts: engineCounts,
      engine_preferences_received: enginePreferencesReceived,
      worker_summary: {
        processed_count: workerReport.processed_count,
        event_render_manifest_count: workerReport.event_render_manifest_count,
        reached_idle: workerReport.reached_idle,
        final_pending_count:
          workerReport.final_status.outbox_queue.total_pending_count,
      },
      render_manifest_summary: {
        manifest_count: storeStatus.manifest_count,
        complete_manifest_count: storeStatus.complete_manifest_count,
        obs_pickup_status: manifestReport.obs_pickup_status,
        obs_handoff_readiness_status: manifestReport.obs_handoff_readiness_status,
        obs_pickup_ready: manifestSummary.obs_pickup_ready,
        manifest_id_present: String(manifestId ?? "").trim() !== "",
        event_id_present: String(latestManifestData.event_id ?? "").trim() !== "",
        manifest_freshness_status: manifestSummary.manifest_freshness_status,
        artifact_file_available_by_adapter:
          foundationRuntime.render_handoff.artifact_file_available_by_adapter,
        artifact_contract_status_by_adapter:
          foundationRuntime.render_handoff.artifact_contract_status_by_adapter,
      },
      artifact_delivery: artifacts,
      foundation_runtime_status: {
        runtime_status: foundationRuntime.runtime_status,
        foundation_readiness_status: foundationRuntime.foundation_readiness_status,
        obs_handoff_ready: foundationRuntime.runtime_summary.obs_handoff_ready,
        local_bridge_worker_ready:
          foundationRuntime.runtime_summary.local_bridge_worker_ready,
        real_engine_handoff_ready:
          foundationRuntime.runtime_summary.real_engine_handoff_ready,
        obs_browser_source_ready:
          foundationRuntime.runtime_summary.obs_browser_source_ready,
        runtime_handoff_flow_status:
          foundationRuntime.runtime_handoff_flow.flow_status,
        runtime_handoff_blocking_stage:
          foundationRuntime.runtime_handoff_flow.blocking_stage,
      },
      final_state_summary: {
        last_payload_kind: streamState.get().last_payload_kind,
        boundary_audit_status:
          streamState.get().last_boundary_audit?.audit_status ?? null,
      },
      production_handoff_summary: {
        schema: "iris_obs_runtime_render_roundtrip_production_handoff_summary_v1",
        fixture_loopback_only: true,
        real_obs_operation_not_started: true,
        real_tts_process_not_started: true,
        real_live2d_process_not_started: true,
        runtime_packets_adapter_gated: true,
        render_manifest_created: workerReport.event_render_manifest_count > 0,
        obs_pickup_ready_verified:
          manifestReport.obs_pickup_status === "ready" &&
          manifestReport.obs_handoff_readiness_status === "ready",
        artifact_delivery_verified: Object.values(artifacts).every(
          (artifact) =>
            artifact.status === 200 &&
            artifact.manifest_id_matched === true &&
            artifact.event_id_present === true &&
            artifact.bytes_available === true
        ),
        foundation_runtime_handoff_verified:
          foundationRuntime.runtime_status === "ready_for_obs_runtime_handoff" &&
          foundationRuntime.runtime_summary.local_bridge_worker_ready === true &&
          foundationRuntime.runtime_handoff_flow.blocking_stage === "none",
        next_live_check_script: "npm run dev:foundation:live-readiness",
        next_obs_check_script: "npm run dev:obs:runtime-render-roundtrip",
      },
      boundary_policy: {
        main_http_comment_path_verified: true,
        local_bridge_outbox_verified: true,
        local_engine_worker_verified: true,
        main_http_obs_artifact_delivery_verified: true,
        no_endpoint_values: true,
        no_raw_engine_requests: true,
        no_raw_jobs: true,
        no_artifact_bodies_in_report: true,
        no_text_payloads: true,
        no_candidates: true,
        no_commands: true,
        no_secret_values: true,
        latest_manifest_only: true,
        production_foundation_runtime_status_verified: true,
        script_names_only: true,
        no_real_obs_operation: true,
      },
    };
    assertObsRuntimeRenderRoundtripReportSafe(report, {
      irisUrl,
      bridgeUrl,
      engineUrl,
      tempDir,
      outboxDir,
      artifactDir,
    });
    return report;
  } finally {
    if (irisServer) await closeServer(irisServer);
    await closeServer(bridgeServer);
    await closeServer(engineServer);
    if (!keepDevArtifacts) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

export function assertObsRuntimeRenderRoundtripReportSafe(
  report,
  { irisUrl = "", bridgeUrl = "", engineUrl = "", tempDir = "", outboxDir = "", artifactDir = "" } = {}
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("OBS runtime render roundtrip report must be an object");
  }
  if (report.schema !== "iris_obs_runtime_render_roundtrip_report_v1") {
    throw new Error("OBS runtime render roundtrip report has invalid schema");
  }
  for (const field of Object.keys(report)) {
    if (!OBS_RUNTIME_RENDER_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`OBS runtime render roundtrip report has unexpected field: ${field}`);
    }
  }
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    irisUrl,
    bridgeUrl,
    engineUrl,
    tempDir,
    outboxDir,
    artifactDir,
    "IRIS, render this through OBS runtime handoff",
    "Runtime Render Tester",
    "runtime-render-tester",
    "fixture-runtime-iris-voice",
    "fixture-runtime-tts-model",
    "fixture-runtime-live2d-model",
    "fixture-runtime-stream-scene",
    "RIFF1234WAVEdata",
    "WEBVTT",
    '"final_text"',
    '"text"',
    '"subtitle_text"',
    '"raw_packet"',
    '"job_payload"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"approved_memory_record"',
    '"approved_relationship_record"',
    '"event_id"',
    '"trace_id"',
    "token-value",
    "secret-value",
  ].filter(Boolean);
  const leaked = forbiddenFragments.filter((fragment) =>
    serialized.includes(fragment)
  );
  if (leaked.length > 0) {
    throw new Error(
      `OBS runtime render roundtrip leaked unsafe fragment(s): ${[
        ...new Set(leaked),
      ].join(", ")}`
    );
  }
  assertObsRuntimeProductionHandoffSummarySafe(report.production_handoff_summary);
}

function assertObsRuntimeProductionHandoffSummarySafe(summary) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new Error("OBS runtime render roundtrip production summary is required");
  }
  assert.equal(
    summary.schema,
    "iris_obs_runtime_render_roundtrip_production_handoff_summary_v1"
  );
  for (const field of [
    "fixture_loopback_only",
    "real_obs_operation_not_started",
    "real_tts_process_not_started",
    "real_live2d_process_not_started",
    "runtime_packets_adapter_gated",
    "render_manifest_created",
    "obs_pickup_ready_verified",
    "artifact_delivery_verified",
    "foundation_runtime_handoff_verified",
  ]) {
    assert.equal(summary[field], true);
  }
  assert.equal(
    summary.next_live_check_script,
    "npm run dev:foundation:live-readiness"
  );
  assert.equal(
    summary.next_obs_check_script,
    "npm run dev:obs:runtime-render-roundtrip"
  );
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function fetchArtifactSummary(url, manifestId) {
  const artifactUrl = new URL(url);
  if (manifestId) artifactUrl.searchParams.set("manifest_id", manifestId);
  const response = await fetch(artifactUrl);
  const bytes = Buffer.from(await response.arrayBuffer());
  const responseManifestId = response.headers.get("x-iris-manifest-id") ?? "";
  const responseEventId = response.headers.get("x-iris-event-id") ?? "";
  return {
    status: response.status,
    content_type: response.headers.get("content-type") ?? "",
    adapter_kind: response.headers.get("x-iris-adapter-kind") ?? "",
    artifact_kind: response.headers.get("x-iris-artifact-kind") ?? "",
    manifest_id_present: String(responseManifestId ?? "").trim() !== "",
    manifest_id_matched: responseManifestId === manifestId,
    event_id_present: String(responseEventId ?? "").trim() !== "",
    bytes_available: bytes.length > 0,
    content_length: bytes.length,
  };
}

async function readRequestJson(request) {
  const raw = await readRequestText(request);
  return raw ? JSON.parse(raw) : {};
}

async function readRequestText(request) {
  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) raw += chunk;
  return raw;
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
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

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
