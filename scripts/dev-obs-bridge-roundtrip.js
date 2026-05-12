import { createServer } from "node:http";
import { postObsBridgeSetup } from "../src/server/obsBridgeSetup.js";

const OBS_BRIDGE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "report",
  "received_request_summary",
]);

let received = null;
const obsBridgeAck = {
  request_id: "obs-bridge-fixture-1",
  bridge_status: "configured",
  configured: true,
};
const obsBridge = createServer(async (request, response) => {
  received = await readRequestJson(request);
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(obsBridgeAck));
});

const address = await listen(obsBridge, { port: 0, host: "127.0.0.1" });
const endpoint = `http://${address.address}:${address.port}/obs/setup-browser-source`;

try {
  const report = await postObsBridgeSetup({
    endpoint,
    origin: process.env.IRIS_HTTP_ORIGIN ?? "http://127.0.0.1:8787",
  });
  assertObsBridgeSetupRequest(received);
  const publicReport = {
    ok: true,
    report: summarizeObsBridgeReport(report, obsBridgeAck),
    received_request_summary: {
      schema: received.schema,
      setup_kind: received.setup_kind,
      source_name: received.obs_browser_source?.source_name ?? null,
      width: received.obs_browser_source?.width ?? null,
      height: received.obs_browser_source?.height ?? null,
      event_stream_path: received.endpoints?.event_stream_path ?? null,
      event_render_manifest_status_path:
        received.endpoints?.local_bridge_event_render_manifest_status_path ?? null,
      event_render_manifest_latest_path:
        received.endpoints?.local_bridge_event_render_manifest_latest_path ?? null,
      render_manifest_status_policy:
        received.local_bridge_handoff?.status_policy ?? null,
      latest_render_manifest_report_path:
        received.local_bridge_handoff?.latest_render_manifest_report_path ?? null,
      latest_tts_artifact_path:
        received.local_bridge_handoff?.latest_artifact_paths?.tts ?? null,
      artifact_delivery_policy:
        received.local_bridge_handoff?.artifact_delivery_policy ?? null,
      operator_setup_only: received.operator_setup_only === true,
      not_runtime_expression_command:
        received.boundary_policy.not_runtime_expression_command === true,
    },
  };
  assertObsBridgeRoundtripReportSafe(publicReport);
  assertNoUnsafeReportLeak(publicReport);
  console.log(JSON.stringify(publicReport, null, 2));
} finally {
  await closeServer(obsBridge);
}

function assertObsBridgeSetupRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("OBS bridge setup request missing");
  }
  if (
    request.operator_setup_only !== true ||
    request.boundary_policy?.not_runtime_expression_command !== true
  ) {
    throw new Error("OBS bridge setup request safety boundary mismatch");
  }
  if (
    request.endpoints?.local_bridge_event_render_manifest_status_path !==
      "/event-render-manifests/status" ||
    request.endpoints?.local_bridge_event_render_manifest_latest_path !==
      "/event-render-manifests/latest" ||
    request.local_bridge_handoff?.latest_render_manifest_report_path !==
      "/event-render-manifests/latest" ||
    request.local_bridge_handoff?.latest_artifact_paths?.tts !==
      "/event-render-manifests/latest/artifact/tts" ||
    request.local_bridge_handoff?.latest_artifact_paths?.live2d !==
      "/event-render-manifests/latest/artifact/live2d?allow_partial_visual=true" ||
    request.local_bridge_handoff?.latest_artifact_paths?.subtitle !==
      "/event-render-manifests/latest/artifact/subtitle?allow_partial_visual=true"
  ) {
    throw new Error("OBS bridge setup request render handoff path mismatch");
  }
}

function assertObsBridgeRoundtripReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("OBS bridge roundtrip report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!OBS_BRIDGE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`OBS bridge roundtrip unexpected report field ${field}`);
    }
  }
  if (reportValue.ok !== true) {
    throw new Error("OBS bridge roundtrip report status mismatch");
  }
}

function summarizeObsBridgeReport(report, ack) {
  if (!report || typeof report !== "object" || Array.isArray(report)) return report;
  return {
    ...report,
    request_id_present: String(ack?.request_id ?? "").trim() !== "",
  };
}

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  for (const fragment of [endpoint, '"request_id"', '"event_id"', '"trace_id"', '"subtitle_text"', '"input_action_candidate"']) {
    if (serialized.includes(fragment)) {
      throw new Error(`OBS bridge roundtrip leaked unsafe fragment: ${fragment}`);
    }
  }
}

async function readRequestJson(request) {
  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function listen(server, { port, host }) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve(server.address());
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
