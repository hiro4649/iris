import { appendFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIntegrationFixtures } from "../src/services/dev/integrationFixtures.js";
import {
  assertLocalBridgeEngineDrainReportSafe,
  assertLocalBridgeEngineStatusSafe,
  createLocalBridgeEngineWorker,
} from "../src/server/localBridgeEngineWorker.js";
import { createLocalBridgeServer } from "../src/server/localBridgeServer.js";
import { listen } from "../src/server/httpServer.js";

const BRIDGE_OUTBOX_CORRUPT_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "fixture_storage",
  "processed_count",
  "reached_idle",
  "worker_status",
  "boundary_policy",
]);

const tempDir = mkdtempSync(join(tmpdir(), "iris-bridge-outbox-corrupt-"));
const outboxDir = join(tempDir, "outbox");
const artifactDir = join(tempDir, "artifacts");
const bridgeServer = createLocalBridgeServer({ outboxDir, logger: { error() {} } });
const bridgeAddress = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });
const bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;

try {
  const fixtures = createIntegrationFixtures({ generatedAtMs: Date.now() });
  await postJson(`${bridgeUrl}/tts`, fixtures.adapter_packets.tts);
  appendFileSync(
    join(outboxDir, "tts", "jobs.jsonl"),
    "{ invalid_json_line_with_secret_token_and_text input_action_candidate\n",
    "utf8"
  );

  const worker = createLocalBridgeEngineWorker({ outboxDir, artifactDir });
  const report = await worker.processUntilIdle({ maxPasses: 2 });
  const status = worker.status();

  assertLocalBridgeEngineDrainReportSafe(report, "dev corrupt outbox roundtrip report");
  assertLocalBridgeEngineStatusSafe(status, "dev corrupt outbox roundtrip status");

  const publicReport = {
    ok:
      report.processed_count === 1 &&
      report.failed_count === 0 &&
      report.reached_idle === false &&
      status.outbox_queue.total_invalid_json_line_count === 1 &&
      status.outbox_queue.adapters.tts.invalid_json_line_count === 1 &&
      status.outbox_queue.adapters.tts.processed_count === 1 &&
      status.outbox_queue.adapters.live2d.invalid_json_line_count === 0 &&
      status.outbox_queue.adapters.subtitle.invalid_json_line_count === 0,
    fixture_storage: true,
    processed_count: report.processed_count,
    reached_idle: report.reached_idle,
    worker_status: summarizeWorkerStatus(status),
    boundary_policy: {
      corrupt_outbox_summary_only: true,
      valid_jobs_continue: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
  };
  assertBridgeOutboxCorruptRoundtripReportSafe(publicReport);
  assertNoUnsafeReportLeak(publicReport);
  console.log(JSON.stringify(publicReport, null, 2));
  if (!publicReport.ok) process.exitCode = 1;
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

function assertBridgeOutboxCorruptRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("corrupt outbox roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!BRIDGE_OUTBOX_CORRUPT_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`corrupt outbox roundtrip unexpected report field ${field}`);
    }
  }
  if (
    report.ok !== true ||
    report.fixture_storage !== true ||
    report.processed_count !== 1 ||
    report.reached_idle !== false
  ) {
    throw new Error("corrupt outbox roundtrip status mismatch");
  }
  for (const field of [
    "corrupt_outbox_summary_only",
    "valid_jobs_continue",
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`corrupt outbox roundtrip boundary flag failed: ${field}`);
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
    "invalid_json_line_with_secret",
    "IRIS bridge fixture voice check",
    '"text"',
    '"subtitle_text"',
    '"raw_packet"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"latest_manifest_id"',
    "token-value",
    "secret-value",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`corrupt outbox roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

function summarizeWorkerStatus(status) {
  if (!status || typeof status !== "object" || Array.isArray(status)) return status;
  return {
    ...status,
    event_render_manifests: status.event_render_manifests
      ? {
          ...status.event_render_manifests,
          latest_manifest_id: undefined,
          latest_manifest_id_present: latestManifestIdPresent(),
        }
      : status.event_render_manifests,
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

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
