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
    response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    response.end(
      JSON.stringify({
        error: "fixture_tts_engine_down",
        text: "unsafe engine echo must not appear in reports",
      })
    );
    return;
  }
  response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "not_found" }));
});

const tempDir = mkdtempSync(join(tmpdir(), "iris-engine-failure-roundtrip-"));
const outboxDir = join(tempDir, "outbox");
const artifactDir = join(tempDir, "artifacts");
const bridgeServer = createLocalBridgeServer({ outboxDir, logger: { error() {} } });
const engineAddress = await listen(engineServer, { port: 0, host: "127.0.0.1" });
const bridgeAddress = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });

try {
  const fixtures = createIntegrationFixtures({ generatedAtMs: Date.now() });
  const bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;
  await postJson(`${bridgeUrl}/tts`, fixtures.adapter_packets.tts);
  await postJson(`${bridgeUrl}/live2d`, fixtures.adapter_packets.live2d);
  await postJson(`${bridgeUrl}/subtitle`, fixtures.adapter_packets.subtitle);

  const worker = createLocalBridgeEngineWorker({
    outboxDir,
    artifactDir,
    ttsEngineEndpoint: `http://${engineAddress.address}:${engineAddress.port}/tts-engine`,
    engineTimeoutMs: 500,
  });
  const report = await worker.processUntilIdle({
    maxPasses: 3,
    limitPerKind: 3,
    continueOnError: true,
  });

  console.log(
    JSON.stringify(
      {
        ok: report.failed_count === 1 && report.final_status.outbox_queue.total_pending_count === 1,
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
          failure_report_summary_only: true,
          failed_job_remains_pending_for_retry: true,
          no_raw_engine_response_body: true,
          no_raw_jobs: true,
          no_text_payloads: true,
          no_candidates: true,
          no_commands: true,
        },
      },
      null,
      2
    )
  );
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
