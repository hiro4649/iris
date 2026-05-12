import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createHttpIngestScheduler } from "../src/runtime/httpIngestScheduler.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createStreamState } from "../src/runtime/streamState.js";
import {
  assertYouTubeIngestRuntimeStatusReportSafe,
  createYouTubeIngestRuntimeStatusReport,
} from "../src/services/dev/youtubeIngestRuntimeStatus.js";
import { listen } from "../src/server/httpServer.js";

let liveChatPollCount = 0;
const received = {
  chatTargetSent: false,
  authCredentialSent: false,
};
const YOUTUBE_SUPPORT_GATE_ROUNDTRIP_BOUNDARY_FIELDS = [
  "support_event_processed_without_candidate_persistence",
  "runtime_status_exposes_gate_status_only",
  "no_platform_ids",
  "no_platform_cursor_values",
  "no_endpoint_values",
  "no_secret_values",
  "no_live_payloads",
  "no_support_message_text",
  "no_candidates",
  "no_commands",
  "no_raw_stream_state",
];

const fixtureServer = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/youtube/v3/liveChat/messages") {
    liveChatPollCount += 1;
    received.chatTargetSent =
      url.searchParams.get("liveChatId") === "support-gate-secret-chat-id";
    received.authCredentialSent =
      url.searchParams.get("key") === "support-gate-secret-api-key";
    return sendJson(response, 200, {
      nextPageToken: "support-gate-secret-next-page-token",
      pollingIntervalMillis: 10_000,
      items: [
        {
          id: "support-gate-superchat-1",
          snippet: {
            displayMessage: "Support gate Super Chat",
            publishedAt: "2026-04-30T00:00:01Z",
            superChatDetails: {
              amountMicros: "150000000",
              currency: "JPY",
              userComment: "Support gate message must stay private",
            },
          },
          authorDetails: {
            channelId: "support-gate-viewer",
            displayName: "Support Gate Viewer",
          },
        },
      ],
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const address = await listen(fixtureServer, { port: 0, host: "127.0.0.1" });
const baseUrl = `http://${address.address}:${address.port}`;
const tempDir = mkdtempSync(join(tmpdir(), "iris-youtube-support-gate-"));
let scheduler = null;

try {
  const env = {
    ...process.env,
    IRIS_YOUTUBE_LIVE_CHAT_SOURCE: "youtube_api",
    IRIS_YOUTUBE_LIVE_CHAT_ID: "support-gate-secret-chat-id",
    IRIS_YOUTUBE_DATA_API_KEY: "support-gate-secret-api-key",
    IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT: `${baseUrl}/youtube/v3/liveChat/messages`,
    IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS: "10",
    IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH: join(tempDir, "cursor.json"),
    IRIS_ENABLE_HTTP_INGEST_SCHEDULER: "true",
    IRIS_HTTP_INGEST_INTERVAL_MS: "60000",
    IRIS_HTTP_INGEST_LIMIT: "10",
    IRIS_ENABLE_CANDIDATE_VALIDATION: "false",
    IRIS_ENABLE_CANDIDATE_PERSISTENCE: "false",
    IRIS_ENABLE_RELATIONSHIP_MEMORY: "false",
  };
  const adapters = createRuntimeAdaptersFromEnv(env);
  const streamState = createStreamState();
  const runtime = createIrisRuntime({
    runtimeConfig: createRuntimeConfig(env),
    ...adapters,
    ttsAdapter() {
      return { spoken: true, adapter: "quiet_support_gate_tts" };
    },
    live2dAdapter() {
      return { sent: true, adapter: "quiet_support_gate_live2d" };
    },
    subtitleAdapter() {
      return { displayed: true, adapter: "quiet_support_gate_subtitle" };
    },
    logger: { log() {}, error() {} },
  });
  scheduler = createHttpIngestScheduler({
    runtime,
    streamState,
    sources: [{ name: "youtube_live_chat_api", source: adapters.liveChatSource }],
    intervalMs: 60_000,
    batchLimit: 10,
    continueOnSourceError: true,
    logger: { warn() {}, error() {} },
  });

  scheduler.start();
  const tick = await scheduler.tickNow("manual_youtube_support_gate_roundtrip");
  const runtimeStatus = createYouTubeIngestRuntimeStatusReport({
    env,
    httpIngestScheduler: scheduler,
    streamState,
  });
  assertYouTubeIngestRuntimeStatusReportSafe(
    runtimeStatus,
    "youtube support gate roundtrip runtime status"
  );

  const state = streamState.get();
  const flow = runtimeStatus.support_candidate_flow;
  const report = {
    schema: "iris_youtube_support_gate_roundtrip_report_v1",
    ok: false,
    fixture_counts: {
      live_chat_poll_count: liveChatPollCount,
    },
    upstream_request_summary: {
      chat_target_sent: received.chatTargetSent,
      auth_credential_sent: received.authCredentialSent,
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
    },
    runtime_status_summary: {
      runtime_status: runtimeStatus.runtime_status,
      api_cursor_auth_flow: runtimeStatus.api_cursor_auth_flow,
      poll_flow_status: runtimeStatus.poll_flow.flow_status,
      ingest_hygiene_flow: runtimeStatus.ingest_hygiene_flow,
      support_event_count:
        runtimeStatus.scheduler_summary.youtube_source_telemetry_counts
          .support_event_count,
      live_chat_ingest_flow: runtimeStatus.live_chat_ingest_flow,
      support_candidate_flow: flow,
      youtube_runtime_state: runtimeStatus.youtube_runtime_state,
    },
    public_state_summary: {
      status: state.status,
      last_payload_kind: state.last_payload_kind,
      donation_reaction_style:
        state.last_donation_reaction?.reaction_style ?? null,
      candidate_validation_status:
        state.last_candidate_validation?.validation_status ?? null,
      candidate_review_count: state.last_candidate_review_items.length,
      boundary_audit_status: state.last_boundary_audit?.audit_status ?? null,
    },
    boundary_policy: {
      support_event_processed_without_candidate_persistence: true,
      runtime_status_exposes_gate_status_only: true,
      no_platform_ids: true,
      no_platform_cursor_values: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_candidates: true,
      no_commands: true,
      no_raw_stream_state: true,
    },
    unsafe_report_leak_detected: false,
  };

  report.unsafe_report_leak_detected = hasUnsafeReportLeak(report, baseUrl);
  report.ok =
    report.unsafe_report_leak_detected === false &&
    youtubeSupportGateRoundtripBoundaryOk(report) &&
    tick.ok === true &&
    tick.processed_count === 1 &&
    tick.source_error_count === 0 &&
    tick.duplicate_count === 0 &&
    report.tick_summary.processed_payload_kind_counts.donation_event === 1 &&
    liveChatPollCount === 1 &&
    received.chatTargetSent === true &&
    received.authCredentialSent === true &&
    runtimeStatus.runtime_status === "polling_active" &&
    runtimeStatus.api_cursor_auth_flow.flow_status ===
      "api_polling_with_support" &&
    runtimeStatus.api_cursor_auth_flow.blocking_stage === "none" &&
    runtimeStatus.api_cursor_auth_flow.support_event_count === 1 &&
    runtimeStatus.poll_flow.flow_status === "polling_active_with_support" &&
    runtimeStatus.ingest_hygiene_flow.schema ===
      "iris_youtube_ingest_hygiene_flow_summary_v1" &&
    runtimeStatus.ingest_hygiene_flow.flow_status === "hygiene_active_clean" &&
    runtimeStatus.ingest_hygiene_flow.blocking_stage === "none" &&
    runtimeStatus.ingest_hygiene_flow.support_event_count === 1 &&
    runtimeStatus.support_candidate_flow.source_support_event_type_counts
      .superChatEvent === 1 &&
    runtimeStatus.support_candidate_flow.source_support_amount_source_counts
      .micros === 1 &&
    runtimeStatus.ingest_hygiene_flow.hygiene_policy
      .ignored_items_do_not_enter_reaction_pipeline === true &&
    runtimeStatus.youtube_runtime_state.history_support_event_count === 1 &&
    flow.source_support_event_seen === true &&
    flow.runtime_support_event_seen === true &&
    flow.donation_reaction_seen === true &&
    flow.candidate_validation_seen === true &&
    flow.candidate_validation_status === "disabled" &&
    flow.validation_passed === false &&
    flow.flow_status === "validation_blocked_or_disabled" &&
    flow.blocking_stage === "validator" &&
    flow.persistence_committed === false &&
    runtimeStatus.live_chat_ingest_flow.flow_status ===
      "runtime_active_with_support" &&
    runtimeStatus.live_chat_ingest_flow.blocking_stage === "none" &&
    runtimeStatus.live_chat_ingest_flow.runtime_support_event_seen === true &&
    runtimeStatus.live_chat_ingest_flow.runtime_donation_reaction_seen === true &&
    runtimeStatus.live_chat_ingest_flow.support_events_enter_donation_pipeline === true &&
    runtimeStatus.live_chat_ingest_flow.support_candidate_gate_status ===
      "validation_blocked_or_disabled" &&
    state.last_candidate_validation?.validation_status === "disabled";

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  scheduler?.stop();
  await closeServer(fixtureServer);
  rmSync(tempDir, { recursive: true, force: true });
}

function hasUnsafeReportLeak(report, unsafeBaseUrl) {
  const serialized = JSON.stringify(report);
  const forbiddenStrings = [
    "support-gate-secret-chat-id",
    "support-gate-secret-api-key",
    "support-gate-secret-next-page-token",
    "support-gate-viewer",
    "Support gate Super Chat",
    "Support gate message",
    unsafeBaseUrl,
  ];
  const forbiddenFieldPatterns = [
    /"event_id"\s*:/,
    /"trace_id"\s*:/,
    /"live_chat_id"\s*:/,
    /"video_id"\s*:/,
    /"next_page_token"\s*:/,
    /"endpoint"\s*:/,
    /"url"\s*:/,
    /"payload"\s*:/,
    /"text"\s*:/,
    /"input_action_candidate"\s*:/,
    /"approved_memory_record"\s*:/,
    /"approved_relationship_record"\s*:/,
  ];
  return (
    forbiddenStrings.some((value) => serialized.includes(value)) ||
    forbiddenFieldPatterns.some((pattern) => pattern.test(serialized))
  );
}

function youtubeSupportGateRoundtripBoundaryOk(report) {
  return YOUTUBE_SUPPORT_GATE_ROUNDTRIP_BOUNDARY_FIELDS.every(
    (field) => report.boundary_policy?.[field] === true
  );
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    const key = String(value ?? "unknown");
    counts[key] = Number(counts[key] ?? 0) + 1;
  }
  return counts;
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
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
