import { createServer } from "node:http";
import { postObsBridgeSetup } from "../src/server/obsBridgeSetup.js";

const OBS_UNSAFE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "fixture_counts",
  "report",
  "received_request_summary",
  "boundary_policy",
]);

let received = null;
let obsSetupRequestCount = 0;
const obsBridgeUnsafeAck = {
  request_id: "obs-unsafe-success-1",
  bridge_status: "configured",
  configured: true,
  subtitle_text: "unsafe successful OBS echo must not appear",
  input_action_candidate: { execute: "switch_scene" },
  token: "unsafe-obs-token",
};
const obsBridge = createServer(async (request, response) => {
  obsSetupRequestCount += 1;
  received = await readRequestJson(request);
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(obsBridgeUnsafeAck));
});

const address = await listen(obsBridge, { port: 0, host: "127.0.0.1" });
const endpoint = `http://${address.address}:${address.port}/obs/setup-browser-source`;

try {
  const report = await postObsBridgeSetup({
    endpoint,
    origin: process.env.IRIS_HTTP_ORIGIN ?? "http://127.0.0.1:8787",
    continueOnError: true,
    generatedAtMs: 4000,
  });
  const publicReport = {
    ok:
      obsSetupRequestCount === 1 &&
      received?.schema === "iris_obs_bridge_setup_request_v1" &&
      received?.operator_setup_only === true &&
      hasBoundaryPolicy(received?.boundary_policy, ["not_runtime_expression_command"]) &&
      report.bridge_status === "attention" &&
      report.configured === false &&
      report.failure_kind === "unsafe_bridge_ack" &&
      hasBoundaryPolicy(report.boundary_policy, ["failure_report_summary_only"]),
    fixture_counts: {
      obs_setup_request_count: obsSetupRequestCount,
    },
    report: summarizeObsBridgeReport(report, obsBridgeUnsafeAck),
    received_request_summary: {
      schema: received?.schema ?? null,
      setup_kind: received?.setup_kind ?? null,
      source_name: received?.obs_browser_source?.source_name ?? null,
      operator_setup_only: received?.operator_setup_only === true,
      not_runtime_expression_command: hasBoundaryPolicy(received?.boundary_policy, [
        "not_runtime_expression_command",
      ]),
    },
    boundary_policy: {
      unsafe_successful_obs_ack_rejected: true,
      failure_report_summary_only: true,
      no_raw_bridge_response_body: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
  };
  const serializedReport = JSON.stringify(publicReport);
  if (
    serializedReport.includes("unsafe successful OBS echo") ||
    serializedReport.includes("unsafe-obs-token") ||
    serializedReport.includes("switch_scene") ||
    serializedReport.includes('"subtitle_text"') ||
    serializedReport.includes('"input_action_candidate"') ||
    serializedReport.includes('"request_id"') ||
    serializedReport.includes('"event_id"') ||
    serializedReport.includes('"trace_id"') ||
    serializedReport.includes(endpoint)
  ) {
    publicReport.ok = false;
  }
  assertObsUnsafeRoundtripReportSafe(publicReport);
  console.log(JSON.stringify(publicReport, null, 2));
  if (!publicReport.ok) process.exitCode = 1;
} finally {
  await closeServer(obsBridge);
}

function summarizeObsBridgeReport(report, ack) {
  if (!report || typeof report !== "object" || Array.isArray(report)) return report;
  return {
    ...report,
    request_id_present: String(ack?.request_id ?? "").trim() !== "",
  };
}

function assertObsUnsafeRoundtripReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("OBS unsafe roundtrip report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!OBS_UNSAFE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`OBS unsafe roundtrip unexpected report field ${field}`);
    }
  }
  if (reportValue.ok !== true || reportValue.fixture_counts?.obs_setup_request_count !== 1) {
    throw new Error("OBS unsafe roundtrip status mismatch");
  }
  assertBoundaryPolicy(reportValue.boundary_policy, [
    "unsafe_successful_obs_ack_rejected",
    "failure_report_summary_only",
    "no_raw_bridge_response_body",
    "no_live_payloads",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ], "OBS unsafe roundtrip");
}

function hasBoundaryPolicy(policy, fields) {
  return Boolean(policy) && fields.every((field) => policy[field] === true);
}

function assertBoundaryPolicy(policy, fields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error(`${context} boundary policy missing`);
  }
  const allowed = new Set(fields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new Error(`${context} unexpected boundary flag: ${field}`);
    }
  }
  for (const field of fields) {
    if (policy[field] !== true) {
      throw new Error(`${context} boundary flag failed: ${field}`);
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
