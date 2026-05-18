import { createServer } from "node:http";
import { createRuntimeAdaptersFromEnv } from "../../adapters/runtimeAdapters.js";
import { createHttpIngestScheduler } from "../../runtime/httpIngestScheduler.js";
import { createIrisRuntime } from "../../runtime/irisRuntime.js";
import { createRuntimeConfig } from "../../runtime/runtimeConfig.js";
import { createStreamState } from "../../runtime/streamState.js";
import {
  assertGameplayRuntimeStatusReportSafe,
  createGameplayRuntimeStatusReport,
} from "./gameplayRuntimeStatus.js";
import { createLocalBridgeServer } from "../../server/localBridgeServer.js";

const GAMEPLAY_VALIDATION_GATE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "fixture_counts",
  "vision_request_summary",
  "tick_summary",
  "runtime_status_summary",
  "public_state_summary",
  "boundary_policy",
  "production_handoff_summary",
  "unsafe_report_leak_detected",
]);

export async function createGameplayValidationGateRoundtripReport({
  baseEnv = {},
  nowMs = () => Date.now(),
} = {}) {
  let visionCaptureCount = 0;
  let bridgeControlRequestCount = 0;
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
            trace_id: "gameplay-validation-gate-vision-1",
            event_id: "gameplay-validation-gate-game-1",
            game_title: "Minecraft",
            scene_summary:
              "The screen is blurry and confidence is too low for safe movement.",
            detected_events: ["blurred screen", "uncertain route"],
            player_state: "standing still while the view is unclear",
            screen_confidence: 0.2,
            vision_source_kind: "fixture_screen_capture_bridge",
            frame_id: "gameplay-validation-gate-frame-1",
            frame_reference_id: "gameplay-validation-gate-frame-ref-1",
            frame_age_ms: 42,
            raw_frame_available: false,
          },
        ],
      });
    }
    return sendJson(response, 404, { ok: false, error: "not_found" });
  });
  const bridgeServer = createLocalBridgeServer({ logger: { error() {} } });
  bridgeServer.on("request", (request) => {
    if (request.method === "POST" && request.url === "/game-control") {
      bridgeControlRequestCount += 1;
    }
  });

  const visionAddress = await listenOnLoopback(visionServer);
  const bridgeAddress = await listenOnLoopback(bridgeServer);
  const visionUrl = `http://${visionAddress.address}:${visionAddress.port}/vision/latest`;
  const bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;
  let scheduler = null;

  try {
    const env = {
      ...baseEnv,
      IRIS_ENABLE_HTTP_INGEST_SCHEDULER: "true",
      IRIS_HTTP_INGEST_INTERVAL_MS: "60000",
      IRIS_HTTP_INGEST_LIMIT: "5",
      IRIS_GAME_OBSERVATION_ENDPOINT: visionUrl,
      IRIS_GAME_OBSERVATION_METHOD: "POST",
      IRIS_GAME_OBSERVATION_MAX_EVENTS: "3",
      IRIS_ENABLE_GAME_CONTROL: "true",
      IRIS_GAME_CONTROL_ADAPTER: "http",
      IRIS_GAME_CONTROL_ENDPOINT: `${bridgeUrl}/game-control`,
      IRIS_AVAILABLE_GAME_ACTIONS: "wait,move_axis",
      IRIS_GAME_CONTROL_MIN_INTERVAL_MS: "0",
      IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS: "5000",
      IRIS_MEMORY_SEARCH_ADAPTER: "local",
    };
    const adapters = createRuntimeAdaptersFromEnv(env);
    const streamState = createStreamState();
    const runtime = createIrisRuntime({
      runtimeConfig: createRuntimeConfig(env),
      ...adapters,
      ttsAdapter() {
        return { spoken: true, adapter: "quiet_gameplay_validation_gate_tts" };
      },
      live2dAdapter() {
        return { sent: true, adapter: "quiet_gameplay_validation_gate_live2d" };
      },
      subtitleAdapter() {
        return {
          displayed: true,
          adapter: "quiet_gameplay_validation_gate_subtitle",
        };
      },
      logger: { log() {}, error() {} },
    });
    scheduler = createHttpIngestScheduler({
      runtime,
      streamState,
      sources: [
        { name: "vision_game_observation", source: adapters.gameObservationSource },
      ],
      intervalMs: 60_000,
      batchLimit: 5,
      continueOnSourceError: true,
      logger: { warn() {}, error() {} },
    });

    scheduler.start();
    const tick = await scheduler.tickNow("manual_gameplay_validation_gate_roundtrip");
    const runtimeStatus = createGameplayRuntimeStatusReport({
      env,
      httpIngestScheduler: scheduler,
      streamState,
      runtime,
      generatedAtMs: nowMs(),
    });
    assertGameplayRuntimeStatusReportSafe(
      runtimeStatus,
      "gameplay validation gate roundtrip runtime status"
    );

    const state = streamState.get();
    const visionFlow = runtimeStatus.game_vision_capture_flow;
    const safeControlFlow = runtimeStatus.safe_control_flow;
    const actionGate = runtimeStatus.action_gate_flow;
    const visionToSafeActionFlow = runtimeStatus.vision_to_safe_action_flow;
    const lifecycleFlow = runtimeStatus.safe_action_lifecycle_flow;
    const report = {
      ok: false,
      schema: "iris_gameplay_validation_gate_roundtrip_report_v1",
      fixture_counts: {
        vision_capture_count: visionCaptureCount,
        bridge_control_request_count: bridgeControlRequestCount,
      },
      vision_request_summary: {
        request_received: Boolean(lastCaptureRequest),
        request_schema: safeStatus(lastCaptureRequest?.schema),
        request_kind: safeStatus(lastCaptureRequest?.request_kind),
      },
      tick_summary: {
        ok: tick.ok === true,
        processed_count: tick.processed_count,
        source_error_count: tick.source_error_count,
        duplicate_count: tick.duplicate_count,
      },
      runtime_status_summary: {
        runtime_status: runtimeStatus.runtime_status,
        preflight_status: runtimeStatus.preflight_status,
        game_vision_capture_flow_status: visionFlow.flow_status,
        game_vision_capture_blocking_stage: visionFlow.blocking_stage,
        safe_control_flow_status: safeControlFlow.flow_status,
        safe_control_blocking_stage: safeControlFlow.blocking_stage,
        action_gate_flow_status: actionGate.flow_status,
        vision_to_safe_action_flow_status: visionToSafeActionFlow.flow_status,
        vision_to_safe_action_blocking_stage:
          visionToSafeActionFlow.blocking_stage,
        safe_action_lifecycle_flow_status: lifecycleFlow.flow_status,
        safe_action_lifecycle_blocking_stage: lifecycleFlow.blocking_stage,
        game_observation_seen: safeControlFlow.game_observation_seen,
        player_step_seen: safeControlFlow.player_step_seen,
        validation_seen: safeControlFlow.validation_seen,
        validation_status: safeControlFlow.validation_status,
        validation_passed: safeControlFlow.validation_passed,
        action_gate_rejected_before_adapter: actionGate.rejected_before_adapter,
        low_confidence_rejected_before_adapter:
          safeControlFlow.low_confidence_rejected_before_adapter,
        control_result_seen: safeControlFlow.control_result_seen,
        control_status: safeControlFlow.control_status,
        control_accepted: safeControlFlow.control_accepted,
        boundary_audit_status: safeControlFlow.boundary_audit_status,
        recent_safe_control_count: safeControlFlow.recent_safe_control_count,
        adapter_request_count: safeControlFlow.adapter_request_count,
        adapter_accepted_count: safeControlFlow.adapter_accepted_count,
        adapter_failed_count: safeControlFlow.adapter_failed_count,
      },
      public_state_summary: {
        status: state.status,
        last_payload_kind: state.last_payload_kind,
        player_proposal_status:
          state.last_game_player?.input_action_candidate_status ?? null,
        validation_status:
          state.last_game_action_validation?.validation_status ?? null,
        control_status: state.last_game_control_result?.control_status ?? null,
        boundary_audit_status: state.last_boundary_audit?.audit_status ?? null,
      },
      boundary_policy: {
        low_confidence_blocks_before_adapter: true,
        runtime_status_exposes_gate_status_only: true,
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
        approved_action_schema_required_for_adapter: true,
        manual_approval_required_for_real_control: true,
        safe_adapter_required_for_real_control: true,
        emergency_stop_required_for_real_control: true,
        fixture_bridge_not_real_ready: true,
        production_handoff_summary_counts_only: true,
      },
      production_handoff_summary: {
        schema: "iris_gameplay_validation_gate_handoff_summary_v1",
        fixture_roundtrip_only: true,
        vision_bridge_fixture_only: true,
        real_screen_capture_not_started: true,
        real_game_or_os_input_not_started: true,
        real_game_control_ready: false,
        production_ready_allowed: false,
        go_no_go: "no_go",
        operator_review_status: "operator_review_required",
        manual_approval_status: "operator_review_required",
        safe_adapter_status: "configuration_waiting",
        emergency_stop_status: "operator_review_required",
        fixture_bridge_real_ready: false,
        input_action_candidates_not_forwarded_directly: true,
        validation_gate_required_before_control_adapter: true,
        low_confidence_blocks_before_adapter: true,
        no_control_adapter_request_for_blocked_candidate: true,
        validated_actions_not_exposed: true,
        raw_frames_not_exposed: true,
        ocr_text_not_exposed: true,
        endpoint_values_not_exposed: true,
        secret_values_not_exposed: true,
        vision_capture_count: visionCaptureCount,
        bridge_control_request_count: bridgeControlRequestCount,
        processed_count: tick.processed_count,
        source_error_count: tick.source_error_count,
        adapter_request_count: safeControlFlow.adapter_request_count,
        adapter_accepted_count: safeControlFlow.adapter_accepted_count,
        adapter_failed_count: safeControlFlow.adapter_failed_count,
        validation_status: safeControlFlow.validation_status,
        action_gate_flow_status: actionGate.flow_status,
        next_runtime_status_script: "npm run dev:gameplay:runtime-status",
        next_validation_gate_script: "npm run dev:gameplay:validation-gate-roundtrip",
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
      bridgeControlRequestCount === 0 &&
      tick.ok === true &&
      tick.processed_count === 1 &&
      tick.source_error_count === 0 &&
      runtimeStatus.preflight_status ===
        "ready_to_poll_game_and_approve_control" &&
      runtimeStatus.runtime_status === "game_observation_active" &&
      visionFlow.flow_status === "vision_observation_low_confidence" &&
      visionFlow.blocking_stage === "confidence" &&
      visionFlow.low_confidence_rejected_before_adapter === true &&
      safeControlFlow.flow_status === "waiting_for_safe_control" &&
      actionGate.flow_status === "blocked_before_adapter" &&
      visionToSafeActionFlow.flow_status === "vision_low_confidence_blocked" &&
      lifecycleFlow.flow_status === "blocked_before_adapter" &&
      safeControlFlow.validation_status === "disabled" &&
      safeControlFlow.validation_passed === false &&
      safeControlFlow.control_status === "disabled" &&
      safeControlFlow.control_accepted === false &&
      safeControlFlow.adapter_request_count === 0 &&
      safeControlFlow.adapter_accepted_count === 0 &&
      safeControlFlow.adapter_failed_count === 0 &&
      safeControlFlow.recent_safe_control_count === 0 &&
      report.production_handoff_summary.real_game_control_ready === false &&
      report.production_handoff_summary.production_ready_allowed === false &&
      report.production_handoff_summary.go_no_go === "no_go" &&
      report.production_handoff_summary.operator_review_status ===
        "operator_review_required" &&
      report.production_handoff_summary.emergency_stop_status ===
        "operator_review_required" &&
      state.last_payload_kind === "game_observation";

    assertGameplayValidationGateRoundtripReportSafe(report, {
      visionUrl,
      bridgeUrl,
    });
    return report;
  } finally {
    scheduler?.stop();
    await closeServer(visionServer);
    await closeServer(bridgeServer);
  }
}

export function assertGameplayValidationGateRoundtripReportSafe(
  report,
  { visionUrl = "", bridgeUrl = "" } = {}
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("gameplay validation gate roundtrip report must be an object");
  }
  if (report.schema !== "iris_gameplay_validation_gate_roundtrip_report_v1") {
    throw new Error("gameplay validation gate roundtrip report has invalid schema");
  }
  for (const field of Object.keys(report)) {
    if (!GAMEPLAY_VALIDATION_GATE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`gameplay validation gate roundtrip report has unexpected field: ${field}`);
    }
  }
  assertProductionHandoffSummarySafe(report.production_handoff_summary, report);
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    visionUrl,
    bridgeUrl,
    "gameplay-validation-gate-frame-1",
    "gameplay-validation-gate-frame-ref-1",
    "screen is blurry",
    "confidence is too low",
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"world_command"',
    '"execute"',
    '"commit_memory"',
    '"authorization"',
    '"api_key"',
    '"apiKey"',
    '"token"',
    '"secret"',
    '"endpoint"',
    '"url"',
    '"payload"',
    '"text"',
    '"raw_frame"',
    '"ocr_text"',
  ].filter(Boolean);
  const leaked = forbiddenFragments.filter((fragment) =>
    serialized.includes(fragment)
  );
  if (leaked.length > 0) {
    throw new Error(
      `gameplay validation gate roundtrip leaked unsafe fragment(s): ${[
        ...new Set(leaked),
      ].join(", ")}`
    );
  }
}

function assertProductionHandoffSummarySafe(summary, report) {
  if (
    !summary ||
    summary.schema !== "iris_gameplay_validation_gate_handoff_summary_v1"
  ) {
    throw new Error("gameplay validation gate handoff summary missing");
  }
  for (const field of [
    "fixture_roundtrip_only",
    "vision_bridge_fixture_only",
    "real_screen_capture_not_started",
    "real_game_or_os_input_not_started",
    "input_action_candidates_not_forwarded_directly",
    "validation_gate_required_before_control_adapter",
    "low_confidence_blocks_before_adapter",
    "no_control_adapter_request_for_blocked_candidate",
    "validated_actions_not_exposed",
    "raw_frames_not_exposed",
    "ocr_text_not_exposed",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new Error(`gameplay validation gate handoff flag failed: ${field}`);
    }
  }
  for (const field of [
    "vision_capture_count",
    "bridge_control_request_count",
    "processed_count",
    "source_error_count",
    "adapter_request_count",
    "adapter_accepted_count",
    "adapter_failed_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new Error(`gameplay validation gate handoff count invalid: ${field}`);
    }
  }
  const expectedPairs = {
    real_game_control_ready: false,
    production_ready_allowed: false,
    go_no_go: "no_go",
    operator_review_status: "operator_review_required",
    manual_approval_status: "operator_review_required",
    safe_adapter_status: "configuration_waiting",
    emergency_stop_status: "operator_review_required",
    fixture_bridge_real_ready: false,
    vision_capture_count: report.fixture_counts.vision_capture_count,
    bridge_control_request_count:
      report.fixture_counts.bridge_control_request_count,
    processed_count: report.tick_summary.processed_count,
    source_error_count: report.tick_summary.source_error_count,
    adapter_request_count:
      report.runtime_status_summary.adapter_request_count,
    adapter_accepted_count:
      report.runtime_status_summary.adapter_accepted_count,
    adapter_failed_count: report.runtime_status_summary.adapter_failed_count,
    validation_status: report.runtime_status_summary.validation_status,
    action_gate_flow_status:
      report.runtime_status_summary.action_gate_flow_status,
    next_runtime_status_script: "npm run dev:gameplay:runtime-status",
    next_validation_gate_script:
      "npm run dev:gameplay:validation-gate-roundtrip",
  };
  for (const [field, expected] of Object.entries(expectedPairs)) {
    if (summary[field] !== expected) {
      throw new Error(`gameplay validation gate handoff mismatch: ${field}`);
    }
  }
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

function listenOnLoopback(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
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

function safeStatus(value) {
  return String(value ?? "unknown")
    .replace(/[^a-zA-Z0-9_:-]/g, "_")
    .slice(0, 120);
}

function hasUnsafeReportLeak(report, { visionUrl, bridgeUrl }) {
  const serialized = JSON.stringify(report);
  return [visionUrl, bridgeUrl].filter(Boolean).some((needle) =>
    serialized.includes(needle)
  );
}
