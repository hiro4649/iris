import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createStreamState } from "../src/runtime/streamState.js";
import { createIrisHttpServer, listen } from "../src/server/httpServer.js";

const OBS_RENDER_HANDOFF_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "obs_browser_source_handoff_paths_valid",
  "manifest_status",
  "latest_manifest",
  "artifact_delivery",
  "missing_artifact_event_id_present",
  "boundary_policy",
]);

const tempDir = mkdtempSync(join(tmpdir(), "iris-obs-render-handoff-roundtrip-"));
const artifactDir = join(tempDir, "artifacts");
const renderManifestMaxAgeMs = 60_000;
const eventId = "obs-render-handoff-fixture";

createRenderManifestFixture({
  artifactDir,
  eventId,
  createdAtMs: Date.now(),
});

const env = {
  ...process.env,
  IRIS_LOCAL_BRIDGE_ARTIFACT_DIR: artifactDir,
  IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS: String(renderManifestMaxAgeMs),
  IRIS_HAS_OPENED: "true",
};
const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(env),
  logger: { log() {}, error() {} },
});
const server = createIrisHttpServer({
  runtime,
  streamState: createStreamState(),
  env,
  logger: { error() {} },
});
const address = await listen(server, { port: 0, host: "127.0.0.1" });
const serverUrl = `http://${address.address}:${address.port}`;
env.IRIS_HTTP_ORIGIN = serverUrl;

try {
  const browserSource = await fetchJson(`${serverUrl}/obs/browser-source`);
  assert.equal(browserSource.status, 200);
  const obsConfig = browserSource.body.obs_overlay_config;
  assert.equal(browserSource.body.ok, true);
  assert.equal(obsConfig.schema, "iris_obs_browser_source_config_v1");
  const browserSourceUrl = new URL(obsConfig.obs_browser_source.browser_source_url);
  assert.equal(`${browserSourceUrl.origin}${browserSourceUrl.pathname}`, `${serverUrl}/overlay`);
  assert.equal(
    browserSourceUrl.searchParams.get("artifact_live2d"),
    "/event-render-manifests/latest/artifact/live2d?allow_partial_visual=true"
  );
  assert.equal(
    browserSourceUrl.searchParams.get("artifact_subtitle"),
    "/event-render-manifests/latest/artifact/subtitle?allow_partial_visual=true"
  );
  assertHandoffPaths(obsConfig);

  const status = await fetchJson(`${serverUrl}/event-render-manifests/status`);
  assert.equal(status.status, 200);
  const storeStatus = status.body.event_render_manifest_store;
  assert.equal(storeStatus.schema, "iris_local_bridge_event_render_manifest_store_status_v1");
  assert.equal(storeStatus.manifest_count, 1);
  assert.equal(storeStatus.complete_manifest_count, 1);
  assert.equal(storeStatus.boundary_policy.no_artifact_paths, true);
  assertNoUnsafeReportLeak(storeStatus, "manifest store status");

  const latest = await fetchJson(`${serverUrl}/event-render-manifests/latest`);
  assert.equal(latest.status, 200);
  const manifestReport = latest.body.event_render_manifest_report;
  const summary = manifestReport.latest_manifest_summary;
  assert.equal(latest.body.ok, true);
  assert.equal(manifestReport.obs_pickup_status, "ready");
  assert.equal(manifestReport.obs_handoff_readiness_status, "ready");
  assert.equal(summary.obs_pickup_ready, true);
  assert.equal(summary.obs_handoff_readiness_status, "ready");
  assert.equal(summary.manifest_freshness_status, "fresh");
  assert.equal(summary.artifact_freshness_status_by_adapter.tts, "fresh");
  assert.equal(summary.artifact_freshness_status_by_adapter.live2d, "fresh");
  assert.equal(summary.artifact_freshness_status_by_adapter.subtitle, "fresh");
  assert.equal(summary.all_artifacts_fresh_for_pickup, true);
  assert.equal(summary.artifact_contract_status_by_adapter.tts, "valid");
  assert.equal(summary.artifact_contract_status_by_adapter.live2d, "valid");
  assert.equal(summary.artifact_contract_status_by_adapter.subtitle, "valid");
  assert.equal(summary.all_artifacts_contract_valid_for_pickup, true);
  assert.equal(summary.max_manifest_age_ms, renderManifestMaxAgeMs);
  assert.equal(summary.artifact_content_type_by_adapter.tts, "audio/wav");
  assert.equal(summary.artifact_content_type_by_adapter.live2d, "application/json; charset=utf-8");
  assert.equal(summary.artifact_content_type_by_adapter.subtitle, "text/vtt; charset=utf-8");
  assert.equal(Object.hasOwn(manifestReport.store_status, "latest_manifest_id"), false);
  assert.equal(Object.hasOwn(summary, "manifest_id"), false);
  assert.equal(Object.hasOwn(summary, "artifact_byte_hash_by_adapter"), false);
  assertNoUnsafeReportLeak(manifestReport, "latest render manifest report");

  const manifestId = `manifest-${eventId}`;
  const artifactDelivery = {
    tts: await fetchArtifactSummary(
      `${serverUrl}/event-render-manifests/latest/artifact/tts`,
      manifestId
    ),
    live2d: await fetchArtifactSummary(
      `${serverUrl}/event-render-manifests/latest/artifact/live2d`,
      manifestId
    ),
    subtitle: await fetchArtifactSummary(
      `${serverUrl}/event-render-manifests/latest/artifact/subtitle`,
      manifestId
    ),
  };
  assert.equal(artifactDelivery.tts.status, 200);
  assert.equal(artifactDelivery.live2d.status, 200);
  assert.equal(artifactDelivery.subtitle.status, 200);
  assert.equal(artifactDelivery.tts.content_type, "audio/wav");
  assert.equal(artifactDelivery.live2d.content_type, "application/json; charset=utf-8");
  assert.equal(artifactDelivery.subtitle.content_type, "text/vtt; charset=utf-8");
  assert.equal(artifactDelivery.tts.adapter_kind, "tts");
  assert.equal(artifactDelivery.live2d.adapter_kind, "live2d");
  assert.equal(artifactDelivery.subtitle.adapter_kind, "subtitle");
  assert.equal(artifactDelivery.tts.artifact_kind, "audio_wav");
  assert.equal(artifactDelivery.live2d.artifact_kind, "live2d_cue_json");
  assert.equal(artifactDelivery.subtitle.artifact_kind, "subtitle_vtt");
  assert.equal(artifactDelivery.tts.manifest_id_matched, true);
  assert.equal(artifactDelivery.live2d.manifest_id_matched, true);
  assert.equal(artifactDelivery.subtitle.manifest_id_matched, true);

  const missingArtifact = await fetchJson(
    `${serverUrl}/event-render-manifests/latest/artifact/unknown`
  );
  assert.equal(missingArtifact.status, 404);
  assert.equal(missingArtifact.headers.get("cache-control"), "no-store");
  assert.equal(missingArtifact.body.ok, false);
  assert.equal(missingArtifact.body.error_kind, "missing_artifact");
  assert.equal(
    missingArtifact.body.artifact_delivery_readiness_status,
    "waiting_for_complete_artifacts"
  );
  assert.equal(missingArtifact.body.boundary_policy.no_path_values, true);
  assertNoUnsafeReportLeak(missingArtifact.body, "missing OBS artifact response");

  const report = {
    ok: true,
    schema: "iris_obs_render_handoff_roundtrip_report_v1",
    obs_browser_source_handoff_paths_valid: true,
    manifest_status: {
      manifest_count: storeStatus.manifest_count,
      complete_manifest_count: storeStatus.complete_manifest_count,
      invalid_json_line_count: storeStatus.invalid_json_line_count,
    },
    latest_manifest: {
      obs_pickup_status: manifestReport.obs_pickup_status,
      obs_handoff_readiness_status: manifestReport.obs_handoff_readiness_status,
      obs_pickup_ready: summary.obs_pickup_ready,
      manifest_id_present: manifestId.trim() !== "",
      event_id_present: eventId.trim() !== "",
      manifest_freshness_status: summary.manifest_freshness_status,
      max_manifest_age_ms: summary.max_manifest_age_ms,
      artifact_freshness_status_by_adapter: summary.artifact_freshness_status_by_adapter,
      artifact_age_ms_by_adapter: summary.artifact_age_ms_by_adapter,
      all_artifacts_fresh_for_pickup: summary.all_artifacts_fresh_for_pickup,
      artifact_contract_status_by_adapter: summary.artifact_contract_status_by_adapter,
      all_artifacts_contract_valid_for_pickup: summary.all_artifacts_contract_valid_for_pickup,
      artifact_content_type_by_adapter: summary.artifact_content_type_by_adapter,
      artifact_size_bytes_by_adapter: summary.artifact_size_bytes_by_adapter,
      artifact_pickup_status_by_adapter: summary.artifact_pickup_status_by_adapter,
    },
    artifact_delivery: artifactDelivery,
    missing_artifact_event_id_present:
      String(missingArtifact.body.event_id ?? "").trim() !== "",
    boundary_policy: {
      main_http_server_origin: true,
      obs_browser_source_paths_verified: true,
      no_path_values: true,
      no_artifact_bodies_in_report: true,
      latest_manifest_only: true,
      manifest_id_match_required_for_group_pickup: true,
      stale_manifest_guard_configured: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
  };
  assertObsRenderHandoffRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report, "OBS render handoff report");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await closeServer(server);
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function createRenderManifestFixture({ artifactDir, eventId, createdAtMs }) {
  mkdirSync(join(artifactDir, "tts"), { recursive: true });
  mkdirSync(join(artifactDir, "live2d"), { recursive: true });
  mkdirSync(join(artifactDir, "subtitle"), { recursive: true });
  writeFileSync(join(artifactDir, "tts", "fixture.wav"), "RIFF1234WAVEdata", "binary");
  writeFileSync(
    join(artifactDir, "live2d", "fixture.live2d.json"),
    JSON.stringify({ schema: "iris_local_live2d_cue_artifact_v1", motion_style: "talk" }),
    "utf8"
  );
  writeFileSync(
    join(artifactDir, "subtitle", "fixture.vtt"),
    "WEBVTT\n\n00:00.000 --> 00:01.000\nOBS handoff fixture subtitle\n",
    "utf8"
  );
  const manifest = {
    schema: "iris_local_bridge_event_render_manifest_v1",
    manifest_id: `manifest-${eventId}`,
    event_id: eventId,
    created_at_ms: createdAtMs,
    complete: true,
    required_adapter_kinds: ["tts", "live2d", "subtitle"],
    artifact_set: {
      tts: {
        adapter_kind: "tts",
        job_id: `${eventId}-tts`,
        artifact_kind: "audio_wav",
        artifact_path: "tts/fixture.wav",
        engine_mode: "local_fixture_wav",
        rendered_at_ms: createdAtMs,
      },
      live2d: {
        adapter_kind: "live2d",
        job_id: `${eventId}-live2d`,
        artifact_kind: "live2d_cue_json",
        artifact_path: "live2d/fixture.live2d.json",
        engine_mode: "local_fixture_cue_json",
        rendered_at_ms: createdAtMs,
      },
      subtitle: {
        adapter_kind: "subtitle",
        job_id: `${eventId}-subtitle`,
        artifact_kind: "subtitle_vtt",
        artifact_path: "subtitle/fixture.vtt",
        engine_mode: "local_fixture_vtt",
        rendered_at_ms: createdAtMs,
      },
    },
    sync_policy: {
      event_id_grouped: true,
      tts_live2d_subtitle_required: true,
      obs_can_poll_manifest_artifacts: true,
      adapter_receipts_remain_source_of_truth: true,
    },
    boundary_policy: {
      local_artifacts_only: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  const serialized = `${JSON.stringify(manifest)}\n`;
  writeFileSync(join(artifactDir, "event_render_manifests.jsonl"), serialized, "utf8");
  writeFileSync(join(artifactDir, "latest_event_render_manifest.json"), serialized, "utf8");
}

function assertHandoffPaths(obsConfig) {
  assert.equal(
    obsConfig.endpoints.local_bridge_event_render_manifest_status_path,
    "/event-render-manifests/status"
  );
  assert.equal(
    obsConfig.endpoints.local_bridge_event_render_manifest_latest_path,
    "/event-render-manifests/latest"
  );
  assert.deepEqual(obsConfig.local_bridge_handoff.latest_artifact_paths, {
    tts: "/event-render-manifests/latest/artifact/tts",
    live2d: "/event-render-manifests/latest/artifact/live2d?allow_partial_visual=true",
    subtitle: "/event-render-manifests/latest/artifact/subtitle?allow_partial_visual=true",
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    headers: response.headers,
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
  assert.equal(response.headers.get("x-iris-event-id-present"), "true");
  return {
    status: response.status,
    content_type: response.headers.get("content-type") ?? "",
    adapter_kind: response.headers.get("x-iris-adapter-kind") ?? "",
    artifact_kind: response.headers.get("x-iris-artifact-kind") ?? "",
    manifest_id_present: responseManifestId.trim() !== "",
    event_id_present: responseEventId.trim() !== "",
    manifest_id_matched: responseManifestId === manifestId,
    bytes_available: bytes.length > 0,
    content_length: bytes.length,
  };
}

function assertObsRenderHandoffRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("OBS render handoff roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!OBS_RENDER_HANDOFF_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`OBS render handoff roundtrip unexpected report field ${field}`);
    }
  }
  if (
    report.ok !== true ||
    report.schema !== "iris_obs_render_handoff_roundtrip_report_v1" ||
    report.obs_browser_source_handoff_paths_valid !== true
  ) {
    throw new Error("OBS render handoff roundtrip status mismatch");
  }
  for (const field of [
    "main_http_server_origin",
    "obs_browser_source_paths_verified",
    "no_path_values",
    "no_artifact_bodies_in_report",
    "latest_manifest_only",
    "manifest_id_match_required_for_group_pickup",
    "stale_manifest_guard_configured",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`OBS render handoff roundtrip boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(value, context) {
  const serialized = JSON.stringify(value);
  const forbiddenFragments = [
    serverUrl,
    tempDir,
    artifactDir,
    "tts/fixture.wav",
    "live2d/fixture.live2d.json",
    "subtitle/fixture.vtt",
    "RIFF1234WAVEdata",
    "WEBVTT",
    "OBS handoff fixture subtitle",
    '"raw_packet"',
    '"job_payload"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"approved_memory_record"',
    '"approved_relationship_record"',
    '"event_id"',
    '"latest_manifest_id"',
    '"artifact_byte_hash_by_adapter"',
    '"trace_id"',
    "token-value",
    "secret-value",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`${context} leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
