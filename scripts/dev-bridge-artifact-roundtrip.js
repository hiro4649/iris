import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIntegrationFixtures } from "../src/services/dev/integrationFixtures.js";
import { createLocalBridgeEngineWorker } from "../src/server/localBridgeEngineWorker.js";
import { createLocalBridgeServer } from "../src/server/localBridgeServer.js";
import { listen } from "../src/server/httpServer.js";

const BRIDGE_ARTIFACT_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "local_bridge_configured",
  "local_artifact_delivery_verified",
  "render_manifest_readiness",
  "artifact_summary",
  "missing_artifact_route_status",
  "missing_artifact_event_id_present",
  "manifest_mismatch_rejected",
  "manifest_mismatch_event_id_present",
  "stale_audio_artifact_rejected",
  "stale_audio_event_id_present",
  "boundary_policy",
]);

const tempDir = mkdtempSync(join(tmpdir(), "iris-bridge-artifact-roundtrip-"));
const outboxDir = join(tempDir, "outbox");
const artifactDir = join(tempDir, "artifacts");
const bridgeServer = createLocalBridgeServer({
  outboxDir,
  artifactDir,
  logger: { error() {} },
});
const bridgeAddress = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });
const bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;

try {
  const fixtures = createIntegrationFixtures({ generatedAtMs: Date.now() });
  await postJson(`${bridgeUrl}/tts`, fixtures.adapter_packets.tts);
  await postJson(`${bridgeUrl}/live2d`, fixtures.adapter_packets.live2d);
  await postJson(`${bridgeUrl}/subtitle`, fixtures.adapter_packets.subtitle);

  const worker = createLocalBridgeEngineWorker({ outboxDir, artifactDir });
  const workerReport = worker.processOnce();
  assert.equal(workerReport.processed_count, 3);
  assert.equal(workerReport.event_render_manifest_count, 1);

  const statusResponse = await fetch(`${bridgeUrl}/event-render-manifests/status`);
  assert.equal(statusResponse.status, 200);
  const statusBody = await statusResponse.json();
  assert.equal(Object.hasOwn(statusBody.event_render_manifest_store, "latest_manifest_id"), false);
  assertNoUnsafeReportLeak(statusBody);

  const readinessResponse = await fetch(`${bridgeUrl}/event-render-manifests/latest`);
  assert.equal(readinessResponse.status, 200);
  const readinessBody = await readinessResponse.json();
  const readinessReport = readinessBody.event_render_manifest_report;
  assert.equal(readinessBody.ok, true);
  assert.equal(readinessReport.obs_pickup_status, "ready");
  assert.equal(readinessReport.obs_handoff_readiness_status, "ready");
  assert.equal(readinessReport.latest_manifest_summary.obs_pickup_ready, true);
  assert.equal(
    readinessReport.latest_manifest_summary.obs_handoff_readiness_status,
    "ready"
  );
  assert.equal(
    readinessReport.latest_manifest_summary.manifest_freshness_status,
    "not_enforced"
  );
  assert.equal(
    readinessReport.latest_manifest_summary.artifact_content_type_by_adapter.tts,
    "audio/wav"
  );
  assert.equal(
    readinessReport.latest_manifest_summary.artifact_size_bytes_by_adapter.tts > 0,
    true
  );
  assert.equal(Object.hasOwn(readinessReport.store_status, "latest_manifest_id"), false);
  assert.equal(Object.hasOwn(readinessReport.latest_manifest_summary, "manifest_id"), false);
  assert.equal(
    Object.hasOwn(readinessReport.latest_manifest_summary, "artifact_byte_hash_by_adapter"),
    false
  );
  assertNoUnsafeReportLeak(readinessReport);

  const manifestPath = join(artifactDir, "latest_event_render_manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const manifestId = manifest.manifest_id;
  const artifacts = {
    tts: await fetchArtifact(
      `${bridgeUrl}/event-render-manifests/latest/artifact/tts`,
      manifestId
    ),
    live2d: await fetchArtifact(
      `${bridgeUrl}/event-render-manifests/latest/artifact/live2d`,
      manifestId
    ),
    subtitle: await fetchArtifact(
      `${bridgeUrl}/event-render-manifests/latest/artifact/subtitle`,
      manifestId
    ),
  };
  assert.equal(artifacts.tts.bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(JSON.parse(artifacts.live2d.bytes.toString("utf8")).schema, "iris_local_live2d_cue_artifact_v1");
  assert.equal(artifacts.subtitle.bytes.toString("utf8").startsWith("WEBVTT"), true);
  assert.equal(artifacts.tts.manifestIdMatched, true);
  assert.equal(artifacts.live2d.manifestIdMatched, true);
  assert.equal(artifacts.subtitle.manifestIdMatched, true);

  const missingResponse = await fetch(
    `${bridgeUrl}/event-render-manifests/latest/artifact/unknown`
  );
  const missingBody = await missingResponse.json();
  assert.equal(missingResponse.status, 404);
  assert.equal(missingResponse.headers.get("cache-control"), "no-store");
  assert.equal(missingBody.error_kind, "missing_artifact");
  assert.equal(
    missingBody.artifact_delivery_readiness_status,
    "waiting_for_complete_artifacts"
  );
  assertLocalArtifactErrorBodySafe(missingBody);
  assertNoUnsafeReportLeak(missingBody);
  const manifestMismatchResponse = await fetch(
    `${bridgeUrl}/event-render-manifests/latest/artifact/tts?manifest_id=wrong-manifest`
  );
  const manifestMismatchBody = await manifestMismatchResponse.json();
  assert.equal(manifestMismatchResponse.status, 409);
  assert.equal(manifestMismatchResponse.headers.get("cache-control"), "no-store");
  assert.equal(manifestMismatchBody.error_kind, "manifest_mismatch");
  assert.equal(
    manifestMismatchBody.artifact_delivery_readiness_status,
    "waiting_for_fresh_render"
  );
  assertLocalArtifactErrorBodySafe(manifestMismatchBody);
  assertNoUnsafeReportLeak(manifestMismatchBody);

  manifest.artifact_set.tts.rendered_at_ms = null;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const staleAudioResponse = await fetch(
    `${bridgeUrl}/event-render-manifests/latest/artifact/tts?manifest_id=${encodeURIComponent(
      manifestId
    )}`
  );
  const staleAudioBody = await staleAudioResponse.json();
  assert.equal(staleAudioResponse.status, 404);
  assert.equal(staleAudioResponse.headers.get("cache-control"), "no-store");
  assert.equal(staleAudioBody.ok, false);
  assertLocalArtifactErrorBodySafe(staleAudioBody);
  assertNoUnsafeReportLeak(staleAudioBody);
  const partialVisualArtifact = await fetchArtifact(
    `${bridgeUrl}/event-render-manifests/latest/artifact/live2d?allow_partial_visual=true`,
    manifestId
  );
  assert.equal(partialVisualArtifact.manifestIdMatched, true);

  const report = {
    ok: true,
    local_bridge_configured: true,
    local_artifact_delivery_verified: true,
    render_manifest_readiness: {
      obs_pickup_status: readinessReport.obs_pickup_status,
      obs_handoff_readiness_status: readinessReport.obs_handoff_readiness_status,
      obs_pickup_ready: readinessReport.latest_manifest_summary.obs_pickup_ready,
      manifest_id_present: String(manifestId ?? "").trim() !== "",
      event_id_present: String(manifest.event_id ?? "").trim() !== "",
      manifest_freshness_status:
        readinessReport.latest_manifest_summary.manifest_freshness_status,
      stale_manifest_guard_enabled:
        readinessReport.latest_manifest_summary.max_manifest_age_ms !== null,
      artifact_content_type_by_adapter:
        readinessReport.latest_manifest_summary.artifact_content_type_by_adapter,
      artifact_size_bytes_by_adapter:
        readinessReport.latest_manifest_summary.artifact_size_bytes_by_adapter,
    },
    artifact_summary: Object.fromEntries(
      Object.entries(artifacts).map(([kind, artifact]) => [
        kind,
        {
          status: artifact.status,
          content_type: artifact.contentType,
          adapter_kind: artifact.adapterKind,
          artifact_kind: artifact.artifactKind,
          event_id_present: String(artifact.eventIdHeader ?? "").trim() !== "",
          manifest_id_present: String(artifact.manifestIdHeader ?? "").trim() !== "",
          manifest_id_matched: artifact.manifestIdMatched,
          bytes_available: artifact.bytes.length > 0,
          content_length: artifact.bytes.length,
        },
      ])
    ),
    missing_artifact_route_status: missingResponse.status,
    missing_artifact_event_id_present: String(missingBody.event_id ?? "").trim() !== "",
    manifest_mismatch_rejected: manifestMismatchResponse.status === 409,
    manifest_mismatch_event_id_present: String(manifestMismatchBody.event_id ?? "").trim() !== "",
    stale_audio_artifact_rejected: staleAudioResponse.status === 404,
    stale_audio_event_id_present: String(staleAudioBody.event_id ?? "").trim() !== "",
    boundary_policy: {
      local_artifacts_only: true,
      latest_manifest_only: true,
      manifest_id_match_required_for_group_pickup: true,
      no_path_values: true,
      no_raw_payloads_in_report: true,
      no_text_payloads_in_report: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
  };
  assertBridgeArtifactRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await closeServer(bridgeServer);
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`fixture post failed: ${response.status}`);
  }
}

async function fetchArtifact(url, manifestId) {
  const artifactUrl = new URL(url);
  if (manifestId) artifactUrl.searchParams.set("manifest_id", manifestId);
  const response = await fetch(artifactUrl);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-iris-event-id-present"), "true");
  const responseManifestId = response.headers.get("x-iris-manifest-id") ?? "";
  const responseEventId = response.headers.get("x-iris-event-id") ?? "";
  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    adapterKind: response.headers.get("x-iris-adapter-kind") ?? "",
    artifactKind: response.headers.get("x-iris-artifact-kind") ?? "",
    eventIdHeader: responseEventId,
    eventIdPresent: responseEventId.trim() !== "",
    manifestIdHeader: responseManifestId,
    manifestIdPresent: responseManifestId.trim() !== "",
    manifestIdMatched: responseManifestId === manifestId,
    bytes,
  };
}

function assertBridgeArtifactRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("bridge artifact roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!BRIDGE_ARTIFACT_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`bridge artifact roundtrip unexpected report field ${field}`);
    }
  }
  if (
    report.ok !== true ||
    report.local_bridge_configured !== true ||
    report.local_artifact_delivery_verified !== true ||
    report.manifest_mismatch_rejected !== true ||
    report.stale_audio_artifact_rejected !== true ||
    report.missing_artifact_route_status !== 404
  ) {
    throw new Error("bridge artifact roundtrip status mismatch");
  }
  for (const field of [
    "local_artifacts_only",
    "latest_manifest_only",
    "manifest_id_match_required_for_group_pickup",
    "no_path_values",
    "no_raw_payloads_in_report",
    "no_text_payloads_in_report",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`bridge artifact roundtrip boundary flag failed: ${field}`);
    }
  }
}

function assertLocalArtifactErrorBodySafe(body) {
  assert.equal(body.ok, false);
  assert.equal(body.adapter_validation_required, true);
  for (const field of [
    "local_artifact_delivery",
    "no_path_values",
    "no_raw_manifest",
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ]) {
    if (body.boundary_policy?.[field] !== true) {
      throw new Error(`bridge artifact error boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    bridgeUrl,
    tempDir,
    outboxDir,
    artifactDir,
    "IRIS bridge fixture voice check",
    "WEBVTT",
    '"text"',
    '"subtitle_text"',
    '"raw_packet"',
    '"job_payload"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"event_id"',
    '"latest_event_id"',
    '"latest_manifest_id"',
    '"artifact_byte_hash_by_adapter"',
    '"trace_id"',
    "token-value",
    "secret-value",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`bridge artifact roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
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
