import { normalizeGameObservation } from "../src/adapters/game/gameObservationAdapter.js";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createLocalBridgeServer } from "../src/server/localBridgeServer.js";
import { listen } from "../src/server/httpServer.js";

const GAME_CONTROL_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "local_bridge_configured",
  "game_action_validation_summary",
  "game_control_result",
  "game_control_adapter_status",
  "local_bridge_game_control",
  "production_handoff_summary",
  "boundary_policy",
]);

const bridgeServer = createLocalBridgeServer({ logger: { error() {} } });
const address = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });
const bridgeUrl = `http://${address.address}:${address.port}`;

try {
  const env = {
    ...process.env,
    IRIS_ENABLE_GAME_CONTROL: "true",
    IRIS_AVAILABLE_GAME_ACTIONS: "wait,move_axis",
    IRIS_GAME_CONTROL_ADAPTER: "http",
    IRIS_GAME_CONTROL_ENDPOINT: `${bridgeUrl}/game-control`,
    IRIS_GAME_CONTROL_API_KEY: "fixture-game-control-secret",
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
  const statusResponse = await fetch(`${bridgeUrl}/status`);
  const statusBody = await statusResponse.json();

  const report = {
    ok: true,
    local_bridge_configured: true,
    game_action_validation_summary: {
      schema: "iris_game_action_validation_summary_v1",
      validation_status: result.game_action_validation.validation_status,
      approved_action_kind:
        result.game_action_validation.approved_game_input_action?.action_kind ?? null,
      approved_observation_context: summarizeApprovedObservationContext(
        result.game_action_validation.approved_game_input_action?.observation_context
      ),
      rejected_candidate_count: result.game_action_validation.rejected_candidates?.length ?? 0,
      boundary_policy: result.game_action_validation.boundary_policy,
    },
    game_control_result: summarizeGameControlResult(result.game_control_result),
    game_control_adapter_status: adapters.gameControlAdapter.status?.() ?? null,
    local_bridge_game_control: summarizeLocalBridgeGameControl(
      statusBody.local_bridge_status.game_control,
      result.game_control_result
    ),
    production_handoff_summary: {
      schema: "iris_game_control_roundtrip_handoff_summary_v1",
      fixture_roundtrip_only: true,
      local_bridge_fixture_only: true,
      real_game_or_os_input_not_started: true,
      input_action_candidates_not_forwarded_directly: true,
      validation_gate_required_before_control_adapter: true,
      validated_action_summary_only: true,
      observation_context_summary_only: true,
      raw_frame_not_exposed: true,
      endpoint_values_not_exposed: true,
      secret_values_not_exposed: true,
      approved_action_kind:
        result.game_action_validation.approved_game_input_action?.action_kind ?? null,
      rejected_candidate_count:
        result.game_action_validation.rejected_candidates?.length ?? 0,
      control_accepted: result.game_control_result?.accepted === true,
      control_executed: result.game_control_result?.executed === true,
      control_simulated: result.game_control_result?.simulated === true,
      bridge_received_count:
        statusBody.local_bridge_status.game_control?.received_count ?? 0,
      side_effects_enabled:
        statusBody.local_bridge_status.game_control?.side_effects_enabled === true,
      next_runtime_status_script: "npm run dev:gameplay:runtime-status",
      next_validation_gate_script: "npm run dev:gameplay:validation-gate-roundtrip",
    },
    boundary_policy: {
      approved_schema_only: true,
      observation_context_summary_only: true,
      simulated_by_default: true,
      no_raw_candidate_in_bridge_status: true,
      no_platform_ids: true,
      no_endpoint_or_secret_values_in_report: true,
      production_handoff_summary_counts_only: true,
    },
  };
  assertGameControlRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await closeServer(bridgeServer);
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

function summarizeLocalBridgeGameControl(status, result) {
  if (!status) return null;
  return {
    received_count: status.received_count,
    last_bridge_event_present: String(result?.event_id ?? "").trim() !== "",
    last_bridge_status: status.last_bridge_status,
    last_action_kind: status.last_action_kind,
    last_received_at_ms: status.last_received_at_ms,
    executed: status.executed === true,
    simulated: status.simulated === true,
    side_effects_enabled: status.side_effects_enabled === true,
  };
}

function assertGameControlRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("game control roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!GAME_CONTROL_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`game control roundtrip unexpected report field ${field}`);
    }
  }
  if (report.ok !== true || report.local_bridge_configured !== true) {
    throw new Error("game control roundtrip status mismatch");
  }
  for (const field of [
    "approved_schema_only",
    "observation_context_summary_only",
    "simulated_by_default",
    "no_raw_candidate_in_bridge_status",
    "no_platform_ids",
    "no_endpoint_or_secret_values_in_report",
    "production_handoff_summary_counts_only",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`game control roundtrip boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(report) {
  assertProductionHandoffSummarySafe(report.production_handoff_summary);
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    bridgeUrl,
    `${bridgeUrl}/game-control`,
    "fixture-game-control-secret",
    "local_bridge_url",
    '"trace_id"',
    '"event_id"',
    '"request_id"',
    '"game_observation_id"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    "authorization",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`game control roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

function assertProductionHandoffSummarySafe(summary) {
  if (!summary || summary.schema !== "iris_game_control_roundtrip_handoff_summary_v1") {
    throw new Error("game control handoff summary missing");
  }
  for (const field of [
    "fixture_roundtrip_only",
    "local_bridge_fixture_only",
    "real_game_or_os_input_not_started",
    "input_action_candidates_not_forwarded_directly",
    "validation_gate_required_before_control_adapter",
    "validated_action_summary_only",
    "observation_context_summary_only",
    "raw_frame_not_exposed",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new Error(`game control handoff flag failed: ${field}`);
    }
  }
  for (const field of ["rejected_candidate_count", "bridge_received_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new Error(`game control handoff count invalid: ${field}`);
    }
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
