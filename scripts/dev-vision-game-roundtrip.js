import { createServer } from "node:http";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { listen } from "../src/server/httpServer.js";
import { createLocalBridgeServer } from "../src/server/localBridgeServer.js";

const VISION_GAME_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "observation_summary",
  "capture_request_summary",
  "game_observation_source_status",
  "game_action_validation_summary",
  "game_control_result",
  "local_bridge_game_control",
  "production_handoff_summary",
  "boundary_policy",
]);

let captureRequest = null;
const visionServer = createServer(async (request, response) => {
  captureRequest = await readRequestJson(request);
  response.writeHead(200, { "content-type": "application/json" });
  response.end(
    JSON.stringify({
      schema: "iris_vision_observation_batch_v1",
      observations: [
        {
          trace_id: "vision-roundtrip-1",
          game_title: "Minecraft",
          scene_summary:
            "The player is at one heart near lava and needs a careful safe retreat.",
          detected_events: ["low health", "lava nearby", "danger"],
          player_state: "one heart, standing near lava",
          screen_confidence: 0.93,
          vision_source_kind: "fixture_vision_bridge",
          frame_id: "frame-dev-1",
          frame_reference_id: "fixture-frame-ref",
          frame_age_ms: 42,
          capture_region: { x: 0, y: 0, width: 1280, height: 720 },
          ocr_text_summary: "hearts low, lava visible",
          ui_focus_areas: ["health bar", "lava edge"],
          raw_frame_available: false,
        },
      ],
    })
  );
});

const bridgeServer = createLocalBridgeServer({ logger: { error() {} } });
const visionAddress = await listen(visionServer, { port: 0, host: "127.0.0.1" });
const bridgeAddress = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });
const visionUrl = `http://${visionAddress.address}:${visionAddress.port}/vision/latest`;
const bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;

try {
  const env = {
    ...process.env,
    IRIS_ENABLE_GAME_CONTROL: "true",
    IRIS_AVAILABLE_GAME_ACTIONS: "wait,move_axis",
    IRIS_GAME_OBSERVATION_ENDPOINT: visionUrl,
    IRIS_GAME_OBSERVATION_METHOD: "POST",
    IRIS_GAME_OBSERVATION_MAX_EVENTS: "6",
    IRIS_GAME_CAPTURE_REGION: JSON.stringify({ x: 0, y: 0, width: 1280, height: 720 }),
    IRIS_GAME_CONTROL_ADAPTER: "http",
    IRIS_GAME_CONTROL_ENDPOINT: `${bridgeUrl}/game-control`,
    IRIS_MEMORY_SEARCH_ADAPTER: "local",
    IRIS_MEMORY_SEARCH_ENDPOINT: "",
    IRIS_MEDIA_WATCH_ENDPOINT: "",
    IRIS_EXTERNAL_TOPIC_ENDPOINT: "",
    IRIS_YOUTUBE_LIVE_CHAT_SOURCE: "",
    IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT: "",
    IRIS_YOUTUBE_VIDEO_ID: "",
    IRIS_YOUTUBE_LIVE_CHAT_ID: "",
  };
  const adapters = createRuntimeAdaptersFromEnv(env);
  const runtime = createIrisRuntime({
    runtimeConfig: createRuntimeConfig(env),
    ...adapters,
    ttsAdapter() {
      return { spoken: true, adapter: "quiet_dev_tts" };
    },
    live2dAdapter() {
      return { sent: true, adapter: "quiet_dev_live2d" };
    },
    subtitleAdapter() {
      return { displayed: true, adapter: "quiet_dev_subtitle" };
    },
    logger: { log() {} },
  });
  const observations = await adapters.gameObservationSource.nextBatch(1);
  const gameObservationSourceStatus = adapters.gameObservationSource.status?.() ?? null;
  if (gameObservationSourceStatus?.ingest_readiness_status !== "active") {
    throw new Error("vision game roundtrip source did not report active ingest readiness");
  }
  const result = await runtime.processEvent(observations[0]);
  const statusResponse = await fetch(`${bridgeUrl}/status`);
  const statusBody = await statusResponse.json();

  const report = {
    ok: true,
    observation_summary: {
      count: observations.length,
      source: observations[0]?.source ?? null,
      payload_kind: observations[0]?.payload?.payload_kind ?? null,
      game_title: observations[0]?.payload?.game_title ?? null,
      screen_confidence: observations[0]?.payload?.screen_confidence ?? null,
      detected_event_count: observations[0]?.payload?.detected_events?.length ?? 0,
      raw_frame_available: Object.hasOwn(observations[0]?.payload ?? {}, "raw_frame"),
    },
    capture_request_summary: {
      schema: captureRequest?.schema ?? null,
      request_kind: captureRequest?.request_kind ?? null,
      raw_frame_policy: captureRequest?.raw_frame_policy ?? null,
      include_ocr_summary: captureRequest?.include_ocr_summary === true,
      include_ui_focus_areas: captureRequest?.include_ui_focus_areas === true,
      max_detected_events: captureRequest?.max_detected_events ?? null,
    },
    game_observation_source_status: summarizeGameObservationSourceStatus(
      gameObservationSourceStatus
    ),
    game_action_validation_summary: {
      schema: "iris_game_action_validation_summary_v1",
      validation_status: result.game_action_validation.validation_status,
      approved_action_kind:
        result.game_action_validation.approved_game_input_action?.action_kind ?? null,
      rejected_candidate_count:
        result.game_action_validation.rejected_candidates?.length ?? 0,
      boundary_policy: result.game_action_validation.boundary_policy,
    },
    game_control_result: summarizeGameControlResult(result.game_control_result),
    local_bridge_game_control: summarizeLocalBridgeGameControl(
      statusBody.local_bridge_status.game_control,
      result.game_control_result
    ),
    production_handoff_summary: {
      schema: "iris_vision_game_roundtrip_handoff_summary_v1",
      fixture_roundtrip_only: true,
      vision_bridge_fixture_only: true,
      real_screen_capture_not_started: true,
      real_game_or_os_input_not_started: true,
      input_action_candidates_not_forwarded_directly: true,
      validation_gate_required_before_control_adapter: true,
      approved_action_summary_only: true,
      raw_frames_not_exposed: true,
      ocr_text_not_exposed: true,
      endpoint_values_not_exposed: true,
      secret_values_not_exposed: true,
      observation_count: observations.length,
      detected_event_count: observations[0]?.payload?.detected_events?.length ?? 0,
      validation_status: result.game_action_validation.validation_status,
      rejected_candidate_count:
        result.game_action_validation.rejected_candidates?.length ?? 0,
      control_accepted: result.game_control_result?.accepted === true,
      control_executed: result.game_control_result?.executed === true,
      control_simulated: result.game_control_result?.simulated === true,
      bridge_received_count:
        statusBody.local_bridge_status.game_control?.received_count ?? 0,
      next_runtime_status_script: "npm run dev:gameplay:runtime-status",
      next_validation_gate_script: "npm run dev:gameplay:validation-gate-roundtrip",
    },
    boundary_policy: {
      vision_bridge_read_only: true,
      no_raw_frame_returned_to_core: true,
      approved_schema_only_for_game_control: true,
      no_raw_candidate_in_bridge_status: true,
      no_endpoint_or_secret_values_in_report: true,
      production_handoff_summary_counts_only: true,
    },
  };
  assertVisionGameRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await closeServer(visionServer);
  await closeServer(bridgeServer);
}

function summarizeGameObservationSourceStatus(status) {
  if (!status) return null;
  return {
    schema: status.schema,
    source_kind: status.source_kind,
    ingest_readiness_status: status.ingest_readiness_status,
    request_count: status.request_count,
    accepted_observation_count: status.accepted_observation_count,
    rejected_observation_count: status.rejected_observation_count,
    last_error_kind: status.last_error_kind,
    boundary_policy: status.boundary_policy,
  };
}

function summarizeGameControlResult(result) {
  if (!result) return null;
  return {
    schema: result.schema,
    adapter: result.adapter,
    accepted: result.accepted === true,
    executed: result.executed === true,
    simulated: result.simulated === true,
    control_status: result.control_status,
    action_kind: result.action_kind,
    error_kind: result.error_kind,
    reason: result.reason,
  };
}

function summarizeLocalBridgeGameControl(status, result) {
  if (!status) return null;
  return {
    received_count: status.received_count,
    last_bridge_event_present: String(result?.event_id ?? "").trim() !== "",
    last_bridge_status: status.last_bridge_status,
    last_action_kind: status.last_action_kind,
    executed: status.executed === true,
    simulated: status.simulated === true,
    side_effects_enabled: status.side_effects_enabled === true,
  };
}

function assertVisionGameRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("vision game roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!VISION_GAME_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`vision game roundtrip unexpected report field ${field}`);
    }
  }
  if (report.ok !== true) {
    throw new Error("vision game roundtrip status mismatch");
  }
  assertBoundaryPolicy(report.boundary_policy, [
    "vision_bridge_read_only",
    "no_raw_frame_returned_to_core",
    "approved_schema_only_for_game_control",
    "no_raw_candidate_in_bridge_status",
    "no_endpoint_or_secret_values_in_report",
    "production_handoff_summary_counts_only",
  ], "vision game roundtrip");
}

function assertNoUnsafeReportLeak(report) {
  assertProductionHandoffSummarySafe(report.production_handoff_summary);
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    visionUrl,
    bridgeUrl,
    `${bridgeUrl}/game-control`,
    "vision-roundtrip-1",
    "frame-dev-1",
    "fixture-frame-ref",
    "hearts low",
    "lava visible",
    "health bar",
    "lava edge",
    '"trace_id"',
    '"event_id"',
    '"request_id"',
    '"game_observation_id"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"world_command"',
    '"execute"',
    '"endpoint"',
    '"url"',
    '"authorization"',
    '"api_key"',
    '"apiKey"',
    '"token"',
    '"secret"',
    '"raw_frame"',
    '"ocr_text"',
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`vision game roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

function assertProductionHandoffSummarySafe(summary) {
  if (!summary || summary.schema !== "iris_vision_game_roundtrip_handoff_summary_v1") {
    throw new Error("vision game handoff summary missing");
  }
  for (const field of [
    "fixture_roundtrip_only",
    "vision_bridge_fixture_only",
    "real_screen_capture_not_started",
    "real_game_or_os_input_not_started",
    "input_action_candidates_not_forwarded_directly",
    "validation_gate_required_before_control_adapter",
    "approved_action_summary_only",
    "raw_frames_not_exposed",
    "ocr_text_not_exposed",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new Error(`vision game handoff flag failed: ${field}`);
    }
  }
  for (const field of [
    "observation_count",
    "detected_event_count",
    "rejected_candidate_count",
    "bridge_received_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new Error(`vision game handoff count invalid: ${field}`);
    }
  }
}

async function readRequestJson(request) {
  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function assertBoundaryPolicy(policy, fields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error(`${context} boundary policy missing`);
  }
  const expected = new Set(fields);
  for (const field of Object.keys(policy)) {
    if (!expected.has(field)) {
      throw new Error(`${context} unexpected boundary flag ${field}`);
    }
  }
  for (const field of fields) {
    if (policy[field] !== true) {
      throw new Error(`${context} boundary flag failed: ${field}`);
    }
  }
}
