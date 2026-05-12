import { createServer } from "node:http";
import { createHttpGameObservationSource } from "../src/adapters/game/httpGameObservationSource.js";
import { ContractError } from "../src/core/contracts.js";
import { listen } from "../src/server/httpServer.js";

const VISION_UNSAFE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "fixture_counts",
  "rejection_status",
  "capture_request_summary",
  "source_status",
  "boundary_policy",
]);

let captureRequest = null;
let requestCount = 0;

const unsafeVisionBridge = createServer(async (request, response) => {
  requestCount += 1;
  captureRequest = await readRequestJson(request);
  response.writeHead(200, { "content-type": "application/json" });
  response.end(
    JSON.stringify({
      schema: "iris_vision_observation_batch_v1",
      observations: [
        {
          game_title: "Minecraft",
          scene_summary: "unsafe bridge payload must not appear in reports",
          input_action_candidate: { execute: "press_w" },
          endpoint: "http://127.0.0.1:9999/unsafe-vision",
          token: "unsafe-vision-token",
          raw_frame: "unsafe-raw-frame-bytes",
        },
      ],
    })
  );
});

const address = await listen(unsafeVisionBridge, { port: 0, host: "127.0.0.1" });
const endpoint = `http://${address.address}:${address.port}/vision/latest`;

try {
  const source = createHttpGameObservationSource({
    endpoint,
    apiKey: "unsafe-vision-secret",
    method: "POST",
    captureRequest: {
      capture_region: { x: 0, y: 0, width: 1280, height: 720 },
      include_ocr_summary: true,
      include_ui_focus_areas: true,
      max_detected_events: 8,
    },
  });

  let rejected = false;
  let errorKind = null;
  try {
    await source.nextBatch(1);
  } catch (error) {
    rejected = error instanceof ContractError;
    errorKind = error?.name ?? "unknown_error";
  }

  const status = source.status();
  const report = {
    ok:
      rejected === true &&
      requestCount === 1 &&
      status.last_observation_count === 0 &&
      status.ingest_readiness_status === "retry_backoff" &&
      hasBoundaryPolicy(status.boundary_policy, [
        "no_raw_frames",
        "no_candidates",
        "no_commands",
      ]),
    fixture_counts: {
      vision_request_count: requestCount,
    },
    rejection_status: {
      rejected,
      error_kind: errorKind,
      last_error: status.last_error,
    },
    capture_request_summary: {
      schema: captureRequest?.schema ?? null,
      request_kind: captureRequest?.request_kind ?? null,
      raw_frame_policy: captureRequest?.raw_frame_policy ?? null,
      include_ocr_summary: captureRequest?.include_ocr_summary === true,
      include_ui_focus_areas: captureRequest?.include_ui_focus_areas === true,
      max_detected_events: captureRequest?.max_detected_events ?? null,
    },
    source_status: status,
    boundary_policy: {
      unsafe_success_rejected: true,
      no_raw_frame_returned_to_core: true,
      no_candidate_in_report: true,
      no_endpoint_or_secret_values_in_report: true,
    },
  };

  assertVisionUnsafeRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  await closeServer(unsafeVisionBridge);
}

async function readRequestJson(request) {
  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function assertVisionUnsafeRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("vision unsafe roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!VISION_UNSAFE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`vision unsafe roundtrip unexpected report field ${field}`);
    }
  }
  if (report.ok !== true || report.fixture_counts?.vision_request_count !== 1) {
    throw new Error("vision unsafe roundtrip status mismatch");
  }
  assertBoundaryPolicy(report.boundary_policy, [
    "unsafe_success_rejected",
    "no_raw_frame_returned_to_core",
    "no_candidate_in_report",
    "no_endpoint_or_secret_values_in_report",
  ], "vision unsafe roundtrip");
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

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    endpoint,
    "unsafe-vision-token",
    "unsafe-vision-secret",
    "unsafe-raw-frame-bytes",
    "unsafe bridge payload",
    "press_w",
    "\"input_action_candidate\"",
    "\"approved_game_input_action\"",
    "\"raw_frame\"",
    "\"endpoint\"",
    "\"token\"",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`vision unsafe roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
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
