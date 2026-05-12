import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIntegrationFixtures } from "../src/services/dev/integrationFixtures.js";
import { createLocalBridgeServer } from "../src/server/localBridgeServer.js";
import { createLocalBridgeEngineWorker } from "../src/server/localBridgeEngineWorker.js";
import { listen } from "../src/server/httpServer.js";

let ttsEngineRequestCount = 0;

const engineServer = createServer(async (request, response) => {
  if (request.url === "/tts-engine") {
    ttsEngineRequestCount += 1;
    await readRequestText(request);
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(
      JSON.stringify({
        audio_data_url: `data:audio/wav;base64,${Buffer.from(
          "RIFF1234WAVEdata",
          "ascii"
        ).toString("base64")}`,
        bridge_status: "rendered",
        text: "unsafe successful engine echo must not appear",
        input_action_candidate: { execute: "press_w" },
        token: "unsafe-success-token",
      })
    );
    return;
  }
  response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "not_found" }));
});

const tempDir = mkdtempSync(join(tmpdir(), "iris-engine-unsafe-roundtrip-"));
const outboxDir = join(tempDir, "outbox");
const artifactDir = join(tempDir, "artifacts");
const bridgeServer = createLocalBridgeServer({ outboxDir, logger: { error() {} } });
const engineAddress = await listen(engineServer, { port: 0, host: "127.0.0.1" });
const bridgeAddress = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });

try {
  const fixtures = createIntegrationFixtures({ generatedAtMs: Date.now() });
  const bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;
  await postJson(`${bridgeUrl}/tts`, fixtures.adapter_packets.tts);

  const worker = createLocalBridgeEngineWorker({
    outboxDir,
    artifactDir,
    ttsEngineEndpoint: `http://${engineAddress.address}:${engineAddress.port}/tts-engine`,
    engineTimeoutMs: 500,
  });
  const report = await worker.processUntilIdle({
    maxPasses: 2,
    limitPerKind: 2,
    continueOnError: true,
  });

  const publicReport = {
    ok:
      ttsEngineRequestCount === 1 &&
      report.failed_count === 1 &&
      report.processed_count === 0 &&
      report.final_status.outbox_queue.total_pending_count === 1,
    fixture_counts: {
      tts_engine_request_count: ttsEngineRequestCount,
    },
    worker_summary: {
      schema: report.schema,
      attempted_count: report.attempted_count,
      processed_count: report.processed_count,
      failed_count: report.failed_count,
      reached_idle: report.reached_idle,
      by_adapter: report.by_adapter,
      final_pending_count: report.final_status.outbox_queue.total_pending_count,
    },
    boundary_policy: {
      unsafe_successful_engine_response_rejected: true,
      failed_job_remains_pending_for_retry: true,
      no_raw_engine_response_body: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
  };
  const serialized = JSON.stringify(publicReport);
  if (
    serialized.includes("unsafe successful engine echo") ||
    serialized.includes("unsafe-success-token") ||
    serialized.includes("press_w") ||
    serialized.includes('"input_action_candidate"') ||
    serialized.includes('"text"')
  ) {
    publicReport.ok = false;
  }
  console.log(JSON.stringify(publicReport, null, 2));
  if (!publicReport.ok) process.exitCode = 1;
} finally {
  await closeServer(bridgeServer);
  await closeServer(engineServer);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`fixture post failed: ${response.status}`);
}

async function readRequestText(request) {
  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) raw += chunk;
  return raw;
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
