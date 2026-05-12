import "../src/config/loadIrisEnv.js";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createIdleScheduler } from "../src/runtime/idleScheduler.js";
import { createHttpIngestScheduler } from "../src/runtime/httpIngestScheduler.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createStreamState } from "../src/runtime/streamState.js";
import { createIrisHttpServer, listen } from "../src/server/httpServer.js";
import {
  createOverlayDisplayEvent,
  createOverlayEventBus,
} from "../src/server/overlayDisplayEvent.js";
import { createOperatorPolicyAdminAsyncSaveGate } from "../src/services/dev/operatorPolicyAdminAsyncSaveGate.js";
import { createJsonOperatorPolicyAuditLog } from "../src/services/persistence/operatorPolicyAuditLog.js";
import { createJsonOperatorPolicyStore } from "../src/services/persistence/operatorPolicyStore.js";
import { createMockPostgresPersistenceAdapter } from "../src/services/persistence/mockPostgresPersistenceAdapter.js";

const port = clampInteger(process.env.IRIS_HTTP_PORT ?? 8787, 0, 65_535, 8787);
const host = process.env.IRIS_HTTP_HOST ?? "127.0.0.1";
const enableIdleScheduler = process.env.IRIS_ENABLE_IDLE_SCHEDULER === "true";
const idleIntervalMs = Number(process.env.IRIS_IDLE_INTERVAL_MS ?? 8000);
const httpIngestSchedulerSetting = process.env.IRIS_ENABLE_HTTP_INGEST_SCHEDULER;
const httpIngestIntervalMs = Number(process.env.IRIS_HTTP_INGEST_INTERVAL_MS ?? 3000);
const httpIngestBatchLimit = Number(process.env.IRIS_HTTP_INGEST_LIMIT ?? 10);
const httpIngestContinueOnSourceError =
  (
    process.env.IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR ??
    (process.env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true" ? "false" : "true")
  ) === "true";
const adapters = createRuntimeAdaptersFromEnv();
const operatorPolicyAsyncSaveGateSetup =
  createOperatorPolicyAsyncSaveGateSetupFromEnv(process.env);

const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(),
  ...adapters,
});
const streamState = createStreamState();
const overlayEventBus = createOverlayEventBus();
const publishOverlayState = (state) => {
  overlayEventBus.publish(createOverlayDisplayEvent(state));
};
const idleScheduler = createIdleScheduler({
  runtime,
  streamState,
  intervalMs: idleIntervalMs,
  onStateUpdate: publishOverlayState,
});
if (enableIdleScheduler) {
  idleScheduler.start();
}
const httpIngestScheduler = createHttpIngestScheduler({
  runtime,
  streamState,
  sources: [
    { name: "live_chat", source: adapters.liveChatSource },
    { name: "game_observation", source: adapters.gameObservationSource },
    { name: "media_watch", source: adapters.mediaWatchSource },
    { name: "external_topic", source: adapters.externalTopicSource },
  ],
  intervalMs: httpIngestIntervalMs,
  batchLimit: httpIngestBatchLimit,
  continueOnSourceError: httpIngestContinueOnSourceError,
  onStateUpdate: publishOverlayState,
});
const enableHttpIngestScheduler = shouldStartHttpIngestScheduler({
  setting: httpIngestSchedulerSetting,
  sourceCount: httpIngestScheduler.status().source_count,
  env: process.env,
});
if (enableHttpIngestScheduler && httpIngestScheduler.status().source_count > 0) {
  httpIngestScheduler.start();
}
const server = createIrisHttpServer({
  runtime,
  streamState,
  idleScheduler,
  httpIngestScheduler,
  operatorPolicyAsyncSaveGate: operatorPolicyAsyncSaveGateSetup.gate,
  overlayEventBus,
});

await listen(server, { port, host });
publishStartupOverlayRuntimeReadyState({ streamState, publishOverlayState });
void tickStartupIdleUntilReady(idleScheduler);
if (enableHttpIngestScheduler && httpIngestScheduler.status().source_count > 0) {
  void tickStartupHttpIngestUntilReady(httpIngestScheduler);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_dev_server_startup_v1",
      service: "iris_dev_server",
      listening: {
        status: "listening",
        host_env_name: "IRIS_HTTP_HOST",
        port_env_name: "IRIS_HTTP_PORT",
      },
      route_paths: {
        debug_console_path: "/debug",
        comment_path: "/comment",
        donation_path: "/donation",
        game_observation_path: "/game-observation",
        idle_tick_path: "/idle-tick",
        idle_status_path: "/idle/status",
        ingest_status_path: "/ingest/status",
        integration_status_path: "/integrations/status",
        integration_contracts_path: "/integrations/contracts",
        integration_fixtures_path: "/integrations/fixtures",
        integration_probe_path: "/integrations/probe",
        production_probe_path: "/production/probe",
        obs_overlay_path: "/overlay",
        operator_policy_async_save_gate_path: "/admin/operator-policy/async-save-gate",
      },
      configured_env: [
        "IRIS_HTTP_HOST",
        "IRIS_HTTP_PORT",
        "IRIS_ENABLE_IDLE_SCHEDULER",
        "IRIS_IDLE_INTERVAL_MS",
        "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
        "IRIS_HTTP_INGEST_INTERVAL_MS",
        "IRIS_HTTP_INGEST_LIMIT",
        "IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR",
        "IRIS_OPERATOR_POLICY_ASYNC_SAVE_GATE_ENABLED",
        "IRIS_OPERATOR_POLICY_POSTGRES_MOCK_SAVE_ENABLED",
        "IRIS_OPERATOR_POLICY_ADMIN_AUTHENTICATED",
        "IRIS_OPERATOR_POLICY_STORE_PATH",
        "IRIS_OPERATOR_POLICY_AUDIT_LOG_PATH",
      ],
      scheduler_status: {
        idle_scheduler_enabled: enableIdleScheduler,
        http_ingest_scheduler_enabled: enableHttpIngestScheduler,
        http_ingest_source_count: httpIngestScheduler.status().source_count,
        operator_policy_async_save_gate_status:
          operatorPolicyAsyncSaveGateSetup.status,
      },
      boundary_policy: {
        no_endpoint_values: true,
        no_listening_target_values: true,
        no_secret_values: true,
        no_store_path_values: true,
        no_live_payloads: true,
        no_candidates: true,
        no_commands: true,
        route_paths_only: true,
      },
    },
    null,
    2
  )
);

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

async function tickStartupIdleUntilReady(
  scheduler,
  { attempts = 20, delayMs = 500 } = {}
) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const tick = await scheduler.tickNow("startup_idle_tick");
    if (tick?.ok === true) return tick;
    if (attempt < attempts) await sleep(delayMs);
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function publishStartupOverlayRuntimeReadyState({ streamState, publishOverlayState }) {
  const nowMs = Date.now();
  const eventId = `startup_overlay_runtime_${nowMs}`;
  const subtitleCue = createStartupOverlaySubtitleCue({ eventId, nowMs });
  const state = streamState.updateFromRuntimeResult({
    processed: true,
    subtitle_cue: subtitleCue,
    candidate_review_items: [],
    event: {
      event_id: eventId,
      trace_id: eventId,
      source: "iris_dev_server",
      payload: {
        payload_kind: "overlay_runtime_startup",
      },
    },
    core: {
      phase01: {
        source: "iris_dev_server",
        payload_kind: "overlay_runtime_startup",
      },
      phase15: {
        event_id: eventId,
        trace_id: eventId,
        final_text: subtitleCue.subtitle_text,
      },
    },
  });
  publishOverlayState(state);
  return state;
}

function createStartupOverlaySubtitleCue({ eventId }) {
  return {
    schema: "iris_subtitle_cue_v1",
    trace_id: eventId,
    event_id: eventId,
    internal_profile: true,
    subtitle_text: "IRIS runtime is ready.",
    subtitle_language: "en",
    display_start_ms: 0,
    display_end_ms: 2200,
    line_break_plan: [
      {
        segment_index: 0,
        segment_text: "IRIS runtime is ready.",
        display_start_ms: 0,
        display_end_ms: 2200,
        direction: "ltr",
        line_count: 1,
      },
    ],
    max_line_count: 2,
    safe_area_policy: {
      placement: "bottom_center",
      avoid_game_ui: true,
      avoid_face_closeup_occlusion: true,
      keep_camera_proximity_readable: true,
    },
    sync_source: "dev_server_startup_overlay_runtime",
    reading_speed_guard: {
      guard_status: "ok",
      estimated_chars_per_second: 10.5,
      max_chars_per_second: 18,
    },
    readability_profile: {
      safe_for_overlay: true,
      chunk_count: 1,
      average_chars_per_second: 10.5,
    },
    script_direction: "ltr",
    adapter_validation_required: true,
  };
}

async function tickStartupHttpIngestUntilReady(
  scheduler,
  { attempts = 5, delayMs = 1000 } = {}
) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const tick = await scheduler.tickNow("startup_http_ingest_tick");
    if (tick?.processed?.some((item) => item.source === "live_chat")) return tick;
    if (tick?.ok === true && !hasLiveInputConfigured(process.env)) return tick;
    if (attempt < attempts) await sleep(delayMs);
  }
  return null;
}

function shouldStartHttpIngestScheduler({ setting, sourceCount, env }) {
  if (setting === "true") return true;
  if (setting === "false") return hasLiveInputConfigured(env);
  return Number(sourceCount) > 0;
}

function hasLiveInputConfigured(env) {
  return Boolean(
    env.IRIS_YOUTUBE_LIVE_CHAT_ID ||
      env.IRIS_YOUTUBE_VIDEO_ID ||
      env.IRIS_YOUTUBE_VIDEO_URL ||
      env.IRIS_YOUTUBE_WATCH_URL ||
      env.IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT ||
      env.IRIS_YOUTUBE_DATA_API_KEY ||
      env.IRIS_YOUTUBE_LIVE_CHAT_API_KEY ||
      env.IRIS_YOUTUBE_OAUTH_TOKEN ||
      env.IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN
  );
}

function createOperatorPolicyAsyncSaveGateSetupFromEnv(env) {
  const gateEnabled = env.IRIS_OPERATOR_POLICY_ASYNC_SAVE_GATE_ENABLED === "true";
  const mockPostgresEnabled =
    env.IRIS_OPERATOR_POLICY_POSTGRES_MOCK_SAVE_ENABLED === "true";
  const storePath = String(env.IRIS_OPERATOR_POLICY_STORE_PATH ?? "").trim();
  const auditPath = String(env.IRIS_OPERATOR_POLICY_AUDIT_LOG_PATH ?? "").trim();
  const configured = gateEnabled && mockPostgresEnabled && storePath && auditPath;
  if (!configured) {
    return {
      gate: null,
      status: gateEnabled ? "configuration_waiting" : "disabled",
    };
  }
  const policyStore = createJsonOperatorPolicyStore(storePath);
  const auditLog = createJsonOperatorPolicyAuditLog(auditPath);
  const postgresAdapter = createMockPostgresPersistenceAdapter();
  return {
    gate: ({ body }) =>
      createOperatorPolicyAdminAsyncSaveGate({
        body,
        authContext: {
          admin_authenticated:
            env.IRIS_OPERATOR_POLICY_ADMIN_AUTHENTICATED === "true",
        },
        policyStore,
        auditLog,
        postgresAdapter,
        postgresWriteEnabled: true,
      }),
    status: "mock_postgres_ready",
  };
}
