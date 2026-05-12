import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertFoundationRuntimeStatusReportSafe,
  createFoundationRuntimeStatusReport,
} from "../src/services/dev/foundationRuntimeStatus.js";

const FOUNDATION_BLOCKED_WORKER_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "runtime_status",
  "worker_readiness_status",
  "queue_clear",
  "invalid_json_line_count",
  "operator_action_reason",
  "operator_action_id",
  "real_engine_handoff_status",
  "real_engine_worker_flow_status",
  "real_engine_worker_blocking_stage",
  "next_runtime_attention",
  "runtime_handoff_flow_status",
  "runtime_handoff_blocking_stage",
  "obs_render_artifact_flow_status",
  "obs_render_artifact_blocking_stage",
  "boundary_policy",
]);

const tempDir = mkdtempSync(join(tmpdir(), "iris-foundation-blocked-worker-"));
const outboxDir = join(tempDir, "outbox");
const artifactDir = join(tempDir, "artifacts");
const nowMs = Date.now();

mkdirSync(join(outboxDir, "tts"), { recursive: true });
writeFileSync(
  join(outboxDir, "tts", "jobs.jsonl"),
  "raw blocked worker job text must not appear\n",
  "utf8"
);
createRenderManifestFixture({
  artifactDir,
  eventId: "foundation-blocked-worker-fixture",
  createdAtMs: nowMs,
});

const env = {
  ...process.env,
  IRIS_TTS_ADAPTER: "http",
  IRIS_TTS_ENDPOINT: "http://127.0.0.1:9100/tts",
  IRIS_LIVE2D_ADAPTER: "http",
  IRIS_LIVE2D_ENDPOINT: "http://127.0.0.1:9100/live2d",
  IRIS_SUBTITLE_ADAPTER: "http",
  IRIS_SUBTITLE_ENDPOINT: "http://127.0.0.1:9100/subtitle",
  IRIS_LOCAL_BRIDGE_OUTBOX_DIR: outboxDir,
  IRIS_LOCAL_BRIDGE_ARTIFACT_DIR: artifactDir,
  IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS: "60000",
  IRIS_LOCAL_TTS_ENGINE_ENDPOINT: "http://127.0.0.1:9101/tts-engine",
  IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT: "http://127.0.0.1:9101/health",
  IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT: "http://127.0.0.1:9102/live2d-engine",
  IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT: "http://127.0.0.1:9102/health",
  IRIS_HTTP_ORIGIN: "http://127.0.0.1:8787",
  IRIS_OBS_SOURCE_WIDTH: "1280",
  IRIS_OBS_SOURCE_HEIGHT: "720",
  IRIS_OBS_SOURCE_FPS: "30",
};

try {
  const report = createFoundationRuntimeStatusReport({
    env,
    streamState: {
      get() {
        return {
          status: "active",
          last_event_id: "blocked-worker-runtime-event",
          last_payload_kind: "comment",
          last_text: "raw runtime text must not appear",
          updated_at_ms: nowMs - 10,
          last_subtitle_cue: {
            subtitle_text: "raw subtitle must not appear",
            subtitle_language: "ja",
            reading_speed_guard: { guard_status: "fit" },
          },
          last_tts_adapter_summary: {
            bridge_status: "rendered",
            duration_ms: 1200,
          },
          last_live2d_adapter_summary: {
            bridge_status: "rendered",
            duration_ms: 900,
          },
          last_subtitle_adapter_summary: {
            bridge_status: "rendered",
            duration_ms: 1200,
          },
          last_performance_plan: { total_duration_ms: 1200 },
        };
      },
    },
    overlayEventBus: {
      status() {
        return {
          schema: "iris_overlay_event_stream_status_v1",
          generated_at_ms: nowMs,
          stream_ready: true,
          client_count: 1,
          published_count: 2,
          latest_event_age_ms: 10,
          boundary_policy: {
            no_raw_text: true,
            no_candidates: true,
            no_commands: true,
            read_only_stream_status: true,
          },
          adapter_validation_required: true,
        };
      },
    },
    generatedAtMs: nowMs,
  });

  assertFoundationRuntimeStatusReportSafe(report);
  assert.equal(report.runtime_status, "waiting_for_local_bridge_worker");
  assert.equal(report.local_bridge_worker_runtime.worker_readiness_status, "attention");
  assert.equal(report.local_bridge_worker_runtime.queue_clear, false);
  assert.equal(
    report.local_bridge_worker_runtime.operator_action_reason,
    "invalid_queue_lines"
  );
  assert.equal(
    report.local_bridge_worker_runtime.operator_action_id,
    "review_worker_queue_format"
  );
  assert.equal(report.runtime_summary.next_runtime_attention, "local_bridge_worker_runtime_attention");
  assert.equal(report.runtime_handoff_flow.flow_status, "waiting_for_local_bridge_worker");
  assert.equal(report.runtime_handoff_flow.blocking_stage, "local_bridge_worker");
  assert.equal(
    report.real_engine_worker_flow.schema,
    "iris_foundation_real_engine_worker_flow_summary_v1"
  );
  assert.equal(report.real_engine_worker_flow.flow_status, "worker_attention");
  assert.equal(report.real_engine_worker_flow.blocking_stage, "worker_attention");
  assert.equal(report.real_engine_worker_flow.queue_invalid_json_line_count, 1);
  assert.equal(report.real_engine_worker_flow.worker_flow_policy.raw_jobs_hidden_from_status, true);
  assert.equal(report.obs_render_artifact_flow.flow_status, "waiting_for_local_bridge_worker");
  assert.equal(report.obs_render_artifact_flow.blocking_stage, "local_bridge_worker");
  assertNoUnsafeReportLeak(report);

  const publicReport = {
    ok: true,
    schema: "iris_foundation_blocked_worker_roundtrip_report_v1",
    runtime_status: report.runtime_status,
    worker_readiness_status:
      report.local_bridge_worker_runtime.worker_readiness_status,
    queue_clear: report.local_bridge_worker_runtime.queue_clear,
    invalid_json_line_count:
      report.local_bridge_worker_runtime.queue_invalid_json_line_count,
    operator_action_reason:
      report.local_bridge_worker_runtime.operator_action_reason,
    operator_action_id: report.local_bridge_worker_runtime.operator_action_id,
    real_engine_handoff_status: report.real_engine_handoff.handoff_status,
    real_engine_worker_flow_status: report.real_engine_worker_flow.flow_status,
    real_engine_worker_blocking_stage:
      report.real_engine_worker_flow.blocking_stage,
    next_runtime_attention: report.runtime_summary.next_runtime_attention,
    runtime_handoff_flow_status: report.runtime_handoff_flow.flow_status,
    runtime_handoff_blocking_stage: report.runtime_handoff_flow.blocking_stage,
    obs_render_artifact_flow_status: report.obs_render_artifact_flow.flow_status,
    obs_render_artifact_blocking_stage:
      report.obs_render_artifact_flow.blocking_stage,
    boundary_policy: {
      blocked_worker_prevents_obs_runtime_ready: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_endpoint_values: true,
      no_artifact_paths: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
  };
  assertFoundationBlockedWorkerRoundtripReportSafe(publicReport);
  assertNoUnsafeReportLeak(publicReport);
  console.log(JSON.stringify(publicReport, null, 2));
} finally {
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function assertFoundationBlockedWorkerRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("foundation blocked worker roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!FOUNDATION_BLOCKED_WORKER_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`foundation blocked worker unexpected report field ${field}`);
    }
  }
  if (
    report.ok !== true ||
    report.schema !== "iris_foundation_blocked_worker_roundtrip_report_v1" ||
    report.queue_clear !== false ||
    report.operator_action_reason !== "invalid_queue_lines" ||
    report.operator_action_id !== "review_worker_queue_format"
  ) {
    throw new Error("foundation blocked worker status mismatch");
  }
  for (const field of [
    "blocked_worker_prevents_obs_runtime_ready",
    "no_raw_jobs",
    "no_text_payloads",
    "no_endpoint_values",
    "no_artifact_paths",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`foundation blocked worker boundary flag failed: ${field}`);
    }
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
    "WEBVTT\n\n00:00.000 --> 00:01.000\nFoundation blocked worker fixture subtitle\n",
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

function assertNoUnsafeReportLeak(value) {
  const serialized = JSON.stringify(value);
  const forbiddenFragments = [
    tempDir,
    outboxDir,
    artifactDir,
    "raw blocked worker job text",
    "raw runtime text",
    "raw subtitle",
    "blocked-worker-runtime-event",
    "http://127.0.0.1",
    "RIFF1234WAVEdata",
    "WEBVTT",
    "Foundation blocked worker fixture subtitle",
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"approved_memory_record"',
    '"approved_relationship_record"',
    "token-value",
    "secret-value",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`blocked worker roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
