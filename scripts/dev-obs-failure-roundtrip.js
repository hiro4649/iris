import { createServer } from "node:http";
import { postObsBridgeSetup } from "../src/server/obsBridgeSetup.js";

let received = null;
const obsBridgeFailureAck = {
  bridge_status: "failed",
  subtitle_text: "unsafe echo should never appear in report",
  input_action_candidate: { action_kind: "press_key" },
  event_id: "unsafe-obs-failure-event",
  trace_id: "unsafe-obs-failure-trace",
};
const obsBridge = createServer(async (request, response) => {
  received = await readRequestJson(request);
  response.writeHead(500, { "content-type": "application/json", "status-text": "fixture failure" });
  response.end(JSON.stringify(obsBridgeFailureAck));
});

const address = await listen(obsBridge, { port: 0, host: "127.0.0.1" });
const endpoint = `http://${address.address}:${address.port}/obs/setup-browser-source`;

try {
  const report = await postObsBridgeSetup({
    endpoint,
    origin: process.env.IRIS_HTTP_ORIGIN ?? "http://127.0.0.1:8787",
    continueOnError: true,
    generatedAtMs: 3000,
  });
  const publicReport = summarizeObsBridgeReport(report, obsBridgeFailureAck);
  const serializedReport = JSON.stringify(publicReport);
  const ok =
    report.bridge_status === "attention" &&
    report.configured === false &&
    report.setup_status === "bridge_setup_request_failed" &&
    report.failure_kind === "http_status" &&
    report.http_status === 500 &&
    hasBoundaryPolicy(report.boundary_policy, ["failure_report_summary_only"]) &&
    received?.operator_setup_only === true &&
    hasBoundaryPolicy(received?.boundary_policy, ["not_runtime_expression_command"]) &&
    !serializedReport.includes("unsafe echo") &&
    !serializedReport.includes("subtitle_text") &&
    !serializedReport.includes("input_action_candidate") &&
    !serializedReport.includes("event_id") &&
    !serializedReport.includes("trace_id") &&
    !serializedReport.includes('"request_id"');

  console.log(
    JSON.stringify(
      {
        ok,
        report: publicReport,
        received_request_summary: {
          schema: received?.schema ?? null,
          setup_kind: received?.setup_kind ?? null,
          source_name: received?.obs_browser_source?.source_name ?? null,
          operator_setup_only: received?.operator_setup_only === true,
          not_runtime_expression_command:
            hasBoundaryPolicy(received?.boundary_policy, ["not_runtime_expression_command"]),
        },
        boundary_policy: {
          failure_report_summary_only: true,
          no_raw_bridge_response_body: true,
          no_live_payloads: true,
          no_text_payloads: true,
          no_candidates: true,
          no_commands: true,
          no_secret_values: true,
        },
      },
      null,
      2
    )
  );
  if (!ok) process.exitCode = 1;
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

function hasBoundaryPolicy(policy, fields) {
  return Boolean(policy) && fields.every((field) => policy[field] === true);
}
