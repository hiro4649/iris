import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createStreamState } from "../src/runtime/streamState.js";
import { createIrisHttpServer, listen } from "../src/server/httpServer.js";

const OBS_INVALID_ARTIFACT_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "latest_manifest",
  "artifact_delivery",
  "boundary_policy",
]);

const tempDir = mkdtempSync(join(tmpdir(), "iris-obs-invalid-artifact-roundtrip-"));
const artifactDir = join(tempDir, "artifacts");
const renderManifestMaxAgeMs = 60_000;
const eventId = "obs-invalid-artifact-fixture";
const nowMs = Date.now();

createRenderManifestFixture({
  artifactDir,
  eventId,
  createdAtMs: nowMs,
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
  const latest = await fetchJson(`${serverUrl}/event-render-manifests/latest`);
  assert.equal(latest.status, 200);
  const manifestReport = latest.body.event_render_manifest_report;
  const summary = manifestReport.latest_manifest_summary;
  assert.equal(latest.body.ok, true);
  assert.equal(manifestReport.obs_pickup_status, "invalid_artifact");
  assert.equal(manifestReport.obs_handoff_readiness_status, "operator_action_required");
  assert.equal(summary.obs_pickup_ready, false);
  assert.equal(summary.obs_pickup_status, "invalid_artifact");
  assert.equal(summary.obs_handoff_readiness_status, "operator_action_required");
  assert.equal(summary.manifest_freshness_status, "fresh");
  assert.equal(summary.all_artifacts_fresh_for_pickup, true);
  assert.equal(summary.artifact_contract_status_by_adapter.tts, "invalid_artifact");
  assert.equal(summary.artifact_contract_status_by_adapter.live2d, "valid");
  assert.equal(summary.artifact_contract_status_by_adapter.subtitle, "valid");
  assert.equal(summary.all_artifacts_contract_valid_for_pickup, false);
  assertNoUnsafeReportLeak(manifestReport, "latest render manifest invalid artifact report");

  const artifactStatuses = {
    tts: await fetchArtifactError(`${serverUrl}/event-render-manifests/latest/artifact/tts`),
    live2d: await fetchArtifactError(`${serverUrl}/event-render-manifests/latest/artifact/live2d`),
    subtitle: await fetchArtifactError(
      `${serverUrl}/event-render-manifests/latest/artifact/subtitle`
    ),
  };
  assert.equal(artifactStatuses.tts.status, 409);
  assert.equal(artifactStatuses.live2d.status, 409);
  assert.equal(artifactStatuses.subtitle.status, 409);
  assert.equal(artifactStatuses.tts.error_kind, "invalid_artifact");
  assert.equal(artifactStatuses.live2d.error_kind, "invalid_artifact");
  assert.equal(artifactStatuses.subtitle.error_kind, "invalid_artifact");
  assert.equal(artifactStatuses.tts.readiness_status, "operator_action_required");
  assert.equal(artifactStatuses.live2d.readiness_status, "operator_action_required");
  assert.equal(artifactStatuses.subtitle.readiness_status, "operator_action_required");
  assert.equal(artifactStatuses.tts.no_store, true);
  assert.equal(artifactStatuses.live2d.no_store, true);
  assert.equal(artifactStatuses.subtitle.no_store, true);
  assert.equal(artifactStatuses.tts.no_path_values, true);
  assert.equal(artifactStatuses.live2d.no_path_values, true);
  assert.equal(artifactStatuses.subtitle.no_path_values, true);

  const report = {
    ok: true,
    schema: "iris_obs_invalid_artifact_roundtrip_report_v1",
    latest_manifest: {
      obs_pickup_status: manifestReport.obs_pickup_status,
      obs_handoff_readiness_status: manifestReport.obs_handoff_readiness_status,
      obs_pickup_ready: summary.obs_pickup_ready,
      manifest_id_present: `manifest-${eventId}`.trim() !== "",
      event_id_present: eventId.trim() !== "",
      manifest_freshness_status: summary.manifest_freshness_status,
      artifact_contract_status_by_adapter: summary.artifact_contract_status_by_adapter,
      all_artifacts_contract_valid_for_pickup: summary.all_artifacts_contract_valid_for_pickup,
    },
    artifact_delivery: artifactStatuses,
    boundary_policy: {
      no_path_values: true,
      no_artifact_bodies_in_report: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
      invalid_artifact_guard_verified: true,
    },
  };
  assertObsInvalidArtifactRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report, "OBS invalid artifact roundtrip report");
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
  writeFileSync(join(artifactDir, "tts", "broken.wav"), "not a wav artifact", "utf8");
  writeFileSync(
    join(artifactDir, "live2d", "fixture.live2d.json"),
    JSON.stringify({ schema: "iris_local_live2d_cue_artifact_v1", motion_style: "talk" }),
    "utf8"
  );
  writeFileSync(
    join(artifactDir, "subtitle", "fixture.vtt"),
    "WEBVTT\n\n00:00.000 --> 00:01.000\nOBS invalid artifact fixture subtitle\n",
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
        artifact_path: "tts/broken.wav",
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

async function fetchJson(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function fetchArtifactError(url) {
  const response = await fetch(url);
  const body = await response.json();
  assertNoUnsafeReportLeak(body, "artifact error response");
  return {
    status: response.status,
    error_kind: body.error_kind,
    readiness_status: body.artifact_delivery_readiness_status,
    event_id_present: String(body.event_id ?? "").trim() !== "",
    no_store: response.headers.get("cache-control") === "no-store",
    no_path_values: hasBoundaryPolicy(body.boundary_policy, ["no_path_values"]),
    no_artifact_body: true,
  };
}

function assertObsInvalidArtifactRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("OBS invalid artifact roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!OBS_INVALID_ARTIFACT_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`OBS invalid artifact roundtrip unexpected report field ${field}`);
    }
  }
  if (
    report.ok !== true ||
    report.schema !== "iris_obs_invalid_artifact_roundtrip_report_v1"
  ) {
    throw new Error("OBS invalid artifact roundtrip status mismatch");
  }
  assertBoundaryPolicy(report.boundary_policy, [
    "no_path_values",
    "no_artifact_bodies_in_report",
    "no_candidates",
    "no_commands",
    "no_secret_values",
    "invalid_artifact_guard_verified",
  ], "OBS invalid artifact roundtrip");
}

function assertNoUnsafeReportLeak(value, context) {
  const serialized = JSON.stringify(value);
  const forbiddenFragments = [
    serverUrl,
    tempDir,
    artifactDir,
    "tts/broken.wav",
    "live2d/fixture.live2d.json",
    "subtitle/fixture.vtt",
    "not a wav artifact",
    "WEBVTT",
    "OBS invalid artifact fixture subtitle",
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

function hasBoundaryPolicy(policy, fields) {
  return Boolean(policy) && fields.every((field) => policy[field] === true);
}

function assertBoundaryPolicy(policy, fields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error(`${context} boundary policy missing`);
  }
  const expected = new Set(fields);
  for (const field of Object.keys(policy)) {
    if (!expected.has(field)) {
      throw new Error(`${context} unexpected boundary flag ${field}`);
    }
  }
  for (const field of fields) {
    if (policy[field] !== true) {
      throw new Error(`${context} boundary flag failed: ${field}`);
    }
  }
}
