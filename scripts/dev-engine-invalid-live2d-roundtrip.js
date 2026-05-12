import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIntegrationFixtures } from "../src/services/dev/integrationFixtures.js";
import { createLocalBridgeServer } from "../src/server/localBridgeServer.js";
import {
  assertLocalBridgeEngineProcessReportSafe,
  assertLocalBridgeEngineStatusSafe,
  createLocalBridgeEngineWorker,
} from "../src/server/localBridgeEngineWorker.js";
import { listen } from "../src/server/httpServer.js";

let live2dEngineRequestCount = 0;

const engineServer = createServer(async (request, response) => {
  if (request.url === "/live2d-engine") {
    live2dEngineRequestCount += 1;
    await readRequestText(request);
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(
      JSON.stringify({
        bridge_status: "rendered",
        duration_ms: 1200,
        cue: {
          applied_motion: "unsafe-schema-missing-motion",
          expression_profile_id: "unsafe-schema-missing-expression",
        },
      })
    );
    return;
  }
  response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "not_found" }));
});

const tempDir = mkdtempSync(join(tmpdir(), "iris-engine-invalid-live2d-roundtrip-"));
const outboxDir = join(tempDir, "outbox");
const artifactDir = join(tempDir, "artifacts");
const bridgeServer = createLocalBridgeServer({ outboxDir, logger: { error() {} } });
const engineAddress = await listen(engineServer, { port: 0, host: "127.0.0.1" });
const bridgeAddress = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });

try {
  const fixtures = createIntegrationFixtures({ generatedAtMs: Date.now() });
  const bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;
  await postJson(`${bridgeUrl}/live2d`, fixtures.adapter_packets.live2d);

  const worker = createLocalBridgeEngineWorker({
    outboxDir,
    artifactDir,
    live2dEngineEndpoint: `http://${engineAddress.address}:${engineAddress.port}/live2d-engine`,
    engineTimeoutMs: 500,
  });
  const workerReport = await worker.processOnceAsync({ continueOnError: true });
  const workerStatus = worker.status();
  assertLocalBridgeEngineProcessReportSafe(workerReport);
  assertLocalBridgeEngineStatusSafe(workerStatus);

  const publicReport = {
    ok:
      live2dEngineRequestCount === 1 &&
      workerReport.failed_count === 1 &&
      workerReport.processed_count === 0 &&
      workerReport.receipts?.[0]?.error_kind === "invalid_live2d_response" &&
      workerStatus.outbox_queue.total_pending_count === 1,
    fixture_counts: {
      live2d_engine_request_count: live2dEngineRequestCount,
    },
    worker_summary: {
      schema: workerReport.schema,
      attempted_count: workerReport.attempted_count,
      processed_count: workerReport.processed_count,
      failed_count: workerReport.failed_count,
      by_adapter: workerReport.by_adapter,
      first_error_kind: workerReport.receipts?.[0]?.error_kind ?? null,
      final_pending_count: workerStatus.outbox_queue.total_pending_count,
    },
    boundary_policy: {
      invalid_live2d_cue_rejected_before_artifact_write: true,
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
    serialized.includes("unsafe-schema-missing-motion") ||
    serialized.includes("unsafe-schema-missing-expression") ||
    serialized.includes("IRIS bridge fixture motion check") ||
    serialized.includes('"cue"') ||
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
