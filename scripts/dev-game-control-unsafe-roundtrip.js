import { createServer } from "node:http";
import { normalizeGameObservation } from "../src/adapters/game/gameObservationAdapter.js";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { listen } from "../src/server/httpServer.js";

const GAME_CONTROL_UNSAFE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "fixture_counts",
  "received_request_summary",
  "game_action_validation_summary",
  "game_control_result",
  "game_control_adapter_status",
  "boundary_policy",
]);

let received = null;
let gameControlRequestCount = 0;
const unsafeBridge = createServer(async (request, response) => {
  gameControlRequestCount += 1;
  received = await readRequestJson(request);
  response.writeHead(200, { "content-type": "application/json" });
  response.end(
    JSON.stringify({
      executed: true,
      bridge_status: "accepted_with_unsafe_echo",
      input_action_candidate: { execute: "press_w" },
      authorization: "Bearer unsafe-game-control-token",
      endpoint: "http://unsafe.example/game-control",
      reason: "unsafe bridge response body must not appear in reports",
    })
  );
});

const address = await listen(unsafeBridge, { port: 0, host: "127.0.0.1" });
const endpoint = `http://${address.address}:${address.port}/game-control`;

try {
  const env = {
    ...process.env,
    IRIS_ENABLE_GAME_CONTROL: "true",
    IRIS_AVAILABLE_GAME_ACTIONS: "wait,move_axis",
    IRIS_GAME_CONTROL_ADAPTER: "http",
    IRIS_GAME_CONTROL_ENDPOINT: endpoint,
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
  const result = await runtime.processEvent(
    normalizeGameObservation({
      game_title: "Minecraft",
      scene_summary: "The player is at one heart near lava and needs a safe retreat.",
      detected_events: ["low health", "lava nearby", "danger"],
      player_state: "one heart",
      screen_confidence: 0.92,
      frame_age_ms: 120,
    })
  );
  const report = {
    ok:
      gameControlRequestCount === 1 &&
      received?.schema === "approved_game_input_action" &&
      received?.approved === true &&
      result.game_action_validation.validation_status === "approved" &&
      result.game_control_result.control_status === "failed" &&
      result.game_control_result.accepted === false &&
      result.game_control_result.executed === false &&
      result.game_control_result.error_kind === "unsafe_response" &&
      result.game_control_result.adapter_response_summary?.status === 200,
    fixture_counts: {
      game_control_request_count: gameControlRequestCount,
    },
    received_request_summary: {
      approved_schema_received: received?.schema === "approved_game_input_action",
      approved: received?.approved === true,
      action_kind: received?.action_kind ?? null,
      validation_route: received?.validation_route ?? null,
      observation_freshness_status:
        received?.observation_context?.freshness_status ?? null,
      observation_frame_age_ms: received?.observation_context?.frame_age_ms ?? null,
      raw_frame_available: Object.hasOwn(received?.observation_context ?? {}, "raw_frame"),
      raw_candidate_received: Object.hasOwn(received ?? {}, "input_action_candidate"),
      adapter_validation_required: received?.adapter_validation_required === true,
    },
    game_action_validation_summary: {
      schema: "iris_game_action_validation_summary_v1",
      validation_status: result.game_action_validation.validation_status,
      approved_action_kind:
        result.game_action_validation.approved_game_input_action?.action_kind ?? null,
      approved_observation_context: summarizeApprovedObservationContext(
        result.game_action_validation.approved_game_input_action?.observation_context
      ),
      rejected_candidate_count:
        result.game_action_validation.rejected_candidates?.length ?? 0,
      boundary_policy: result.game_action_validation.boundary_policy,
    },
    game_control_result: summarizeGameControlResult(result.game_control_result),
    game_control_adapter_status: adapters.gameControlAdapter.status?.() ?? null,
    boundary_policy: {
      approved_schema_only: true,
      observation_context_summary_only: true,
      unsafe_success_response_summarized: true,
      no_raw_candidate_in_report: true,
      no_endpoint_or_secret_values_in_report: true,
    },
  };
  assertGameControlUnsafeRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  await closeServer(unsafeBridge);
}

async function readRequestJson(request) {
  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function summarizeApprovedObservationContext(context) {
  if (!context) return null;
  return {
    schema: context.schema,
    observation_id_present: String(context.game_observation_id ?? "").trim() !== "",
    perception_confidence: context.perception_confidence,
    frame_age_ms: context.frame_age_ms,
    max_observation_age_ms: context.max_observation_age_ms,
    freshness_status: context.freshness_status,
    stale_observation_rejected_before_adapter:
      context.stale_observation_rejected_before_adapter === true,
    raw_frame_available: false,
  };
}

function summarizeGameControlResult(result) {
  if (!result) return null;
  const adapterResponse = result.adapter_response_summary ?? {};
  const traceIdPresent = String(result.trace_id ?? "").trim() !== "";
  const eventIdPresent = String(result.event_id ?? "").trim() !== "";
  return {
    schema: result.schema,
    adapter: result.adapter,
    runtime_ids_present:
      traceIdPresent ||
      eventIdPresent,
    trace_id_present: traceIdPresent,
    event_id_present: eventIdPresent,
    accepted: result.accepted === true,
    executed: result.executed === true,
    simulated: result.simulated === true,
    control_status: result.control_status,
    action_kind: result.action_kind,
    game_title: result.game_title,
    adapter_target_hint: result.adapter_target_hint,
    error_kind: result.error_kind,
    reason: result.reason,
    adapter_response_summary: {
      status: adapterResponse.status,
      ok: adapterResponse.ok === true,
      response_kind: adapterResponse.response_kind,
      response_omitted: adapterResponse.response_omitted === true,
      error_kind: adapterResponse.error_kind ?? null,
      request_id_present: String(adapterResponse.request_id ?? "").trim() !== "",
      bridge_status: adapterResponse.bridge_status,
    },
  };
}

function assertGameControlUnsafeRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("game control unsafe roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!GAME_CONTROL_UNSAFE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`game control unsafe roundtrip unexpected report field ${field}`);
    }
  }
  if (report.ok !== true || report.fixture_counts?.game_control_request_count !== 1) {
    throw new Error("game control unsafe roundtrip status mismatch");
  }
  for (const field of [
    "approved_schema_only",
    "observation_context_summary_only",
    "unsafe_success_response_summarized",
    "no_raw_candidate_in_report",
    "no_endpoint_or_secret_values_in_report",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`game control unsafe roundtrip boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    endpoint,
    "unsafe-game-control-token",
    "press_w",
    "unsafe bridge response body",
    "http://unsafe.example/game-control",
    '"input_action_candidate"',
    '"authorization"',
    '"endpoint"',
    '"trace_id"',
    '"event_id"',
    '"request_id"',
    '"game_observation_id"',
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`game control unsafe roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
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
