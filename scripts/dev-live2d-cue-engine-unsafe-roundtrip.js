import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createLive2dCueEngineBridgeServer } from "../src/server/live2dCueEngineBridge.js";
import { listen } from "../src/server/httpServer.js";

const LIVE2D_CUE_ENGINE_UNSAFE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "response_status",
  "safe_error_kind",
  "fixture_renderer_request_count",
  "boundary_policy",
]);

let rendererRequestCount = 0;
const rendererServer = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, "http://127.0.0.1");
  if (request.method === "POST" && requestUrl.pathname === "/cue") {
    rendererRequestCount += 1;
    return sendJson(response, 200, {
      ok: true,
      endpoint: "http://127.0.0.1/private-renderer",
      input_action_candidate: { kind: "press_key", key: "space" },
    });
  }
  sendJson(response, 404, { ok: false });
});

let bridgeServer = null;
const rendererAddress = await listen(rendererServer, { host: "127.0.0.1", port: 0 });
const rendererBase = `http://${rendererAddress.address}:${rendererAddress.port}`;

try {
  bridgeServer = createLive2dCueEngineBridgeServer({
    rendererEndpoint: `${rendererBase}/cue`,
    timeoutMs: 5000,
    logger: { error() {} },
  });
  const bridgeAddress = await listen(bridgeServer, { host: "127.0.0.1", port: 0 });
  const bridgeBase = `http://${bridgeAddress.address}:${bridgeAddress.port}`;

  const response = await fetch(`${bridgeBase}/live2d-engine`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      schema: "iris_local_live2d_engine_request_v1",
      job_id: "unsafe-live2d-job",
      event_id: "unsafe-live2d-event",
      motion_style: "laugh_big",
      motion_intensity: "high",
      body_state_id: "body-laugh",
      camera_proximity_profile: "close_face",
      expression_profile_id: "expression-laugh",
      autonomous_state_id: "idle-breath",
      timing: {
        total_duration_ms: 1200,
        start_delay_ms: 0,
        sync_policy: "speech_motion_timeline",
      },
      tracks: [],
    }),
  });
  const body = await response.json();
  const report = {
    ok: response.status === 502 && body.error_kind === "renderer_invalid_response",
    schema: "iris_live2d_cue_engine_unsafe_roundtrip_report_v1",
    response_status: response.status,
    safe_error_kind: body.error_kind,
    fixture_renderer_request_count: rendererRequestCount,
    boundary_policy: {
      unsafe_renderer_ack_rejected: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_cue_body_in_report: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assert.equal(report.ok, true);
  assertLive2dCueEngineUnsafeRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report, { bridgeBase, rendererBase });
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (bridgeServer) await closeServer(bridgeServer);
  await closeServer(rendererServer);
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function assertLive2dCueEngineUnsafeRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("Live2D unsafe roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!LIVE2D_CUE_ENGINE_UNSAFE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`Live2D unsafe unexpected report field ${field}`);
    }
  }
  if (
    report.ok !== true ||
    report.schema !== "iris_live2d_cue_engine_unsafe_roundtrip_report_v1" ||
    report.fixture_renderer_request_count !== 1
  ) {
    throw new Error("Live2D unsafe roundtrip status mismatch");
  }
  for (const field of [
    "unsafe_renderer_ack_rejected",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_cue_body_in_report",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`Live2D unsafe boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(report, { bridgeBase, rendererBase }) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    bridgeBase,
    rendererBase,
    "unsafe-live2d-job",
    "unsafe-live2d-event",
    "input_action_candidate",
    "press_key",
    "space",
    "http://127.0.0.1/private-renderer",
    "token-value",
    "secret-value",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`Live2D unsafe roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
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
