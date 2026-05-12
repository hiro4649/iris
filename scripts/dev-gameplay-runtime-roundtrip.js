import { createServer } from "node:http";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createHttpIngestScheduler } from "../src/runtime/httpIngestScheduler.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createStreamState } from "../src/runtime/streamState.js";
import {
  assertGameplayRuntimeStatusReportSafe,
  createGameplayRuntimeStatusReport,
} from "../src/services/dev/gameplayRuntimeStatus.js";
import { listen } from "../src/server/httpServer.js";
import { createLocalBridgeServer } from "../src/server/localBridgeServer.js";

let visionCaptureCount = 0;
let lastCaptureRequest = null;

const visionServer = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "POST" && url.pathname === "/vision/latest") {
    visionCaptureCount += 1;
    lastCaptureRequest = await readRequestJson(request);
    return sendJson(response, 200, {
      schema: "iris_vision_observation_batch_v1",
      observations: [
        {
          trace_id: "gameplay-runtime-roundtrip-vision-1",
          event_id: "gameplay-runtime-roundtrip-game-1",
          game_title: "Minecraft",
          scene_summary:
            "The player finds a clear safe path toward diamonds with chat cheering.",
          detected_events: ["safe path", "diamonds visible", "chat cheering"],
          player_state: "standing still with a clear route",
          screen_confidence: 0.96,
          vision_source_kind: "fixture_screen_capture_bridge",
          frame_id: "gameplay-runtime-frame-1",
          frame_reference_id: "gameplay-runtime-frame-ref-1",
          frame_age_ms: 36,
          capture_region: { x: 0, y: 0, width: 1280, height: 720 },
          ocr_text_summary: "diamond nearby",
          ui_focus_areas: ["diamond", "safe_path", "hotbar"],
          raw_frame_available: false,
        },
      ],
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const bridgeServer = createLocalBridgeServer({ logger: { error() {} } });
const visionAddress = await listen(visionServer, { port: 0, host: "127.0.0.1" });
const bridgeAddress = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });
const visionUrl = `http://${visionAddress.address}:${visionAddress.port}/vision/latest`;
const bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;
let scheduler = null;

try {
  const env = {
    ...process.env,
    IRIS_ENABLE_HTTP_INGEST_SCHEDULER: "true",
    IRIS_HTTP_INGEST_INTERVAL_MS: "60000",
    IRIS_HTTP_INGEST_LIMIT: "5",
    IRIS_GAME_OBSERVATION_ENDPOINT: visionUrl,
    IRIS_GAME_OBSERVATION_METHOD: "POST",
    IRIS_GAME_OBSERVATION_MAX_EVENTS: "3",
    IRIS_GAME_CAPTURE_REGION: JSON.stringify({ x: 0, y: 0, width: 1280, height: 720 }),
    IRIS_GAME_OBSERVATION_INCLUDE_OCR_SUMMARY: "true",
    IRIS_GAME_OBSERVATION_INCLUDE_UI_FOCUS_AREAS: "true",
    IRIS_ENABLE_GAME_CONTROL: "true",
    IRIS_GAME_CONTROL_ADAPTER: "http",
    IRIS_GAME_CONTROL_ENDPOINT: `${bridgeUrl}/game-control`,
    IRIS_AVAILABLE_GAME_ACTIONS: "wait,move_axis",
    IRIS_GAME_CONTROL_MIN_INTERVAL_MS: "0",
    IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS: "5000",
  };
  const adapters = createRuntimeAdaptersFromEnv(env);
  const streamState = createStreamState();
  const runtime = createIrisRuntime({
    runtimeConfig: createRuntimeConfig(env),
    ...adapters,
    ttsAdapter() {
      return { spoken: true, adapter: "quiet_gameplay_runtime_roundtrip_tts" };
    },
    live2dAdapter() {
      return { sent: true, adapter: "quiet_gameplay_runtime_roundtrip_live2d" };
    },
    subtitleAdapter() {
      return { displayed: true, adapter: "quiet_gameplay_runtime_roundtrip_subtitle" };
    },
    logger: { log() {}, error() {} },
  });
  scheduler = createHttpIngestScheduler({
    runtime,
    streamState,
    sources: [{ name: "vision_game_observation", source: adapters.gameObservationSource }],
    intervalMs: 60_000,
    batchLimit: 5,
    continueOnSourceError: true,
    logger: { warn() {}, error() {} },
  });

  scheduler.start();
  const tick = await scheduler.tickNow("manual_gameplay_runtime_roundtrip");
  const runtimeStatus = createGameplayRuntimeStatusReport({
    env,
    httpIngestScheduler: scheduler,
    streamState,
    runtime,
    generatedAtMs: Date.now(),
  });
  assertGameplayRuntimeStatusReportSafe(
    runtimeStatus,
    "gameplay runtime roundtrip runtime status"
  );

  const sourceStatus = adapters.gameObservationSource.status();
  const state = streamState.get();
  const telemetry =
    runtimeStatus.scheduler_summary.gameplay_source_telemetry_counts;
  const report = {
    schema: "iris_gameplay_runtime_roundtrip_report_v1",
    ok: false,
    fixture_counts: {
      vision_capture_count: visionCaptureCount,
    },
    vision_request_summary: {
      request_received: Boolean(lastCaptureRequest),
      request_schema: safeStatus(lastCaptureRequest?.schema),
      request_kind: safeStatus(lastCaptureRequest?.request_kind),
      capture_region_configured:
        lastCaptureRequest?.capture_region !== null &&
        lastCaptureRequest?.capture_region !== undefined,
      include_ocr_summary: lastCaptureRequest?.include_ocr_summary === true,
      include_ui_focus_areas: lastCaptureRequest?.include_ui_focus_areas === true,
      frame_blob_returned_to_core: false,
    },
    tick_summary: {
      ok: tick.ok === true,
      processed_count: tick.processed_count,
      duplicate_count: tick.duplicate_count,
      source_error_count: tick.source_error_count,
      processed_payload_kind_counts: countBy(
        tick.processed.map((item) => item.payload_kind)
      ),
      processed_final_decision_counts: countBy(
        tick.processed.map((item) => item.final_decision)
      ),
      last_priority_summary: tick.status?.last_priority_summary ?? null,
    },
    runtime_status_summary: {
      schema: runtimeStatus.schema,
      runtime_status: runtimeStatus.runtime_status,
      preflight_status: runtimeStatus.preflight_status,
      scheduler_available: runtimeStatus.scheduler_summary.scheduler_available,
      scheduler_running: runtimeStatus.scheduler_summary.running,
      scheduler_source_count: runtimeStatus.scheduler_summary.source_count,
      scheduler_game_observation_source_count:
        runtimeStatus.scheduler_summary.game_observation_source_count,
      scheduler_processed_count: runtimeStatus.scheduler_summary.processed_count,
      scheduler_source_error_count: runtimeStatus.scheduler_summary.source_error_count,
      scheduler_telemetry_counts: telemetry,
      game_control_adapter_runtime:
        runtimeStatus.game_control_adapter_runtime,
      game_vision_capture_flow: runtimeStatus.game_vision_capture_flow,
      safe_control_flow: runtimeStatus.safe_control_flow,
      action_gate_flow: runtimeStatus.action_gate_flow,
      vision_to_safe_action_flow: runtimeStatus.vision_to_safe_action_flow,
      safe_action_lifecycle_flow: runtimeStatus.safe_action_lifecycle_flow,
      game_state: {
        latest_is_game_observation:
          runtimeStatus.gameplay_state.latest_is_game_observation,
        vision_summary_available:
          runtimeStatus.gameplay_state.vision_summary_available,
        danger_level: runtimeStatus.gameplay_state.danger_level,
        player_proposal_status:
          runtimeStatus.gameplay_state.player_proposal_status,
        validation_status: runtimeStatus.gameplay_state.validation_status,
        validated_control_available:
          runtimeStatus.gameplay_state.validated_control_available,
        control_status: runtimeStatus.gameplay_state.control_status,
        control_accepted: runtimeStatus.gameplay_state.control_accepted,
        boundary_audit_status: runtimeStatus.gameplay_state.boundary_audit_status,
        history_safe_control_count:
          runtimeStatus.gameplay_state.history_safe_control_count,
      },
    },
    source_status_summary: {
      source_kind: sourceStatus.source_kind,
      ingest_readiness_status: sourceStatus.ingest_readiness_status,
      request_count: sourceStatus.request_count,
      last_observation_count: sourceStatus.last_observation_count,
      observation_count:
        sourceStatus.last_observation_telemetry?.observation_count ?? 0,
      low_confidence_count:
        sourceStatus.last_observation_telemetry?.low_confidence_count ?? 0,
      with_frame_age_count:
        sourceStatus.last_observation_telemetry?.with_frame_age_count ?? 0,
      frame_reference_count:
        sourceStatus.last_observation_telemetry?.with_frame_reference_count ?? 0,
      ocr_summary_count:
        sourceStatus.last_observation_telemetry?.with_ocr_summary_count ?? 0,
      ui_focus_area_count:
        sourceStatus.last_observation_telemetry?.with_ui_focus_areas_count ?? 0,
      frame_blob_available_count:
        sourceStatus.last_observation_telemetry?.raw_frame_available_count ?? 0,
      capture_request_configured:
        sourceStatus.capture_request_summary?.capture_region_configured === true,
      local_endpoint_policy_status: sourceStatus.local_endpoint_policy_status,
      vision_endpoint_scope: sourceStatus.vision_endpoint_scope,
      vision_endpoint_locality_ok: sourceStatus.vision_endpoint_locality_ok,
    },
    public_state_summary: {
      status: state.status,
      last_payload_kind: state.last_payload_kind,
      latest_is_game_observation: state.last_payload_kind === "game_observation",
      player_proposal_status:
        state.last_game_player?.input_action_candidate_status ?? null,
      validation_status: state.last_game_action_validation?.validation_status ?? null,
      control_status: state.last_game_control_result?.control_status ?? null,
      boundary_audit_status: state.last_boundary_audit?.audit_status ?? null,
    },
    safe_control_policy: {
      scheduler_path_used: true,
      validator_output_required_for_adapter: true,
      bridge_receives_validated_control_only: true,
      public_report_counts_only: true,
    },
    boundary_policy: {
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_payloads: true,
      no_text_payloads: true,
      no_raw_frames: true,
      no_ocr_text: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      no_raw_scheduler_results: true,
    },
    unsafe_report_leak_detected: false,
  };

  report.unsafe_report_leak_detected = hasUnsafeReportLeak(report, {
    visionUrl,
    bridgeUrl,
  });
  report.ok =
    report.unsafe_report_leak_detected === false &&
    visionCaptureCount === 1 &&
    tick.ok === true &&
    tick.processed_count === 1 &&
    tick.source_error_count === 0 &&
    tick.duplicate_count === 0 &&
    runtimeStatus.runtime_status === "safe_control_active" &&
    runtimeStatus.preflight_status === "ready_to_poll_game_and_approve_control" &&
    runtimeStatus.scheduler_summary.scheduler_available === true &&
    runtimeStatus.scheduler_summary.running === true &&
    runtimeStatus.scheduler_summary.game_observation_source_count === 1 &&
    runtimeStatus.scheduler_summary.processed_count === 1 &&
    runtimeStatus.game_control_adapter_runtime.adapter_status_available === true &&
    runtimeStatus.game_control_adapter_runtime.request_count === 1 &&
    runtimeStatus.game_control_adapter_runtime.accepted_count === 1 &&
    runtimeStatus.game_control_adapter_runtime.failed_count === 0 &&
    runtimeStatus.game_control_adapter_runtime.expired_action_count === 0 &&
    telemetry.request_count === 1 &&
    telemetry.last_observation_count === 1 &&
    telemetry.observation_count === 1 &&
    runtimeStatus.game_vision_capture_flow.schema ===
      "iris_gameplay_vision_capture_flow_summary_v1" &&
    runtimeStatus.game_vision_capture_flow.flow_status ===
      "vision_observation_active" &&
    runtimeStatus.game_vision_capture_flow.blocking_stage === "none" &&
    runtimeStatus.game_vision_capture_flow.capture_request_seen === true &&
    runtimeStatus.game_vision_capture_flow.capture_request_count === 1 &&
    runtimeStatus.game_vision_capture_flow.observation_count === 1 &&
    runtimeStatus.game_vision_capture_flow.low_confidence_observed === false &&
    runtimeStatus.game_vision_capture_flow.capture_policy
      .validation_required_before_adapter === true &&
    runtimeStatus.game_vision_capture_flow.boundary_policy.no_raw_frames === true &&
    runtimeStatus.safe_control_flow.flow_status === "safe_control_active" &&
    runtimeStatus.safe_control_flow.blocking_stage === "none" &&
    runtimeStatus.safe_control_flow.adapter_status_available === true &&
    runtimeStatus.safe_control_flow.adapter_request_count === 1 &&
    runtimeStatus.safe_control_flow.adapter_accepted_count === 1 &&
    runtimeStatus.safe_control_flow.adapter_failed_count === 0 &&
    runtimeStatus.safe_control_flow.adapter_expired_action_count === 0 &&
    runtimeStatus.safe_control_flow.adapter_expiry_guard_observed === false &&
    runtimeStatus.action_gate_flow.flow_status === "adapter_handoff_active" &&
    runtimeStatus.action_gate_flow.validation_passed === true &&
    runtimeStatus.action_gate_flow.adapter_handoff_accepted === true &&
    runtimeStatus.vision_to_safe_action_flow.flow_status ===
      "safe_control_active" &&
    runtimeStatus.vision_to_safe_action_flow.blocking_stage === "none" &&
    runtimeStatus.vision_to_safe_action_flow.game_observation_seen === true &&
    runtimeStatus.vision_to_safe_action_flow.validation_passed === true &&
    runtimeStatus.vision_to_safe_action_flow.adapter_handoff_accepted === true &&
    runtimeStatus.vision_to_safe_action_flow.vision_to_action_policy
      .raw_vision_never_controls_game === true &&
    runtimeStatus.vision_to_safe_action_flow.boundary_policy.no_raw_frames ===
      true &&
    runtimeStatus.safe_action_lifecycle_flow.flow_status ===
      "safe_control_active" &&
    runtimeStatus.safe_action_lifecycle_flow.blocking_stage === "none" &&
    runtimeStatus.safe_action_lifecycle_flow.validation_passed === true &&
    runtimeStatus.safe_action_lifecycle_flow.adapter_handoff_accepted === true &&
    runtimeStatus.safe_action_lifecycle_flow.lifecycle_policy
      .validation_required_before_adapter === true &&
    runtimeStatus.gameplay_state.latest_is_game_observation === true &&
    runtimeStatus.gameplay_state.validation_status === "approved" &&
    runtimeStatus.gameplay_state.control_status === "accepted" &&
    runtimeStatus.gameplay_state.boundary_audit_status === "pass" &&
    state.last_payload_kind === "game_observation";

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  scheduler?.stop();
  await closeServer(visionServer);
  await closeServer(bridgeServer);
}

async function readRequestJson(request) {
  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function countBy(items) {
  const counts = {};
  for (const item of items) {
    const key = safeStatus(item ?? "unknown");
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function safeStatus(value) {
  return String(value ?? "unknown")
    .replace(/[^a-zA-Z0-9_:-]/g, "_")
    .slice(0, 120);
}

function hasUnsafeReportLeak(report, { visionUrl, bridgeUrl }) {
  const serialized = JSON.stringify(report);
  const unsafeValueLeak = [
    visionUrl,
    bridgeUrl,
    "gameplay-runtime-frame-1",
    "gameplay-runtime-frame-ref-1",
  ].some((needle) => serialized.includes(needle));
  const unsafeFieldLeak =
    /"(event_id|trace_id|input_action_candidate|approved_game_input_action|world_command|execute|commit_memory|authorization|api_key|apiKey|token|secret)"\s*:/.test(
      serialized
    );
  return unsafeValueLeak || unsafeFieldLeak;
}
