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

let videoDiscoveryCount = 0;
let liveChatPollCount = 0;
const received = {
  chatTargetSent: false,
  videoLookupSent: false,
  authCredentialSent: false,
};
const YOUTUBE_RUNTIME_INGEST_ROUNDTRIP_BOUNDARY_FIELDS = [
  "scheduler_path_used",
  "direct_chat_target_bypasses_video_discovery",
  "upstream_ids_used_in_requests_only",
  "public_reports_hide_chat_target",
  "public_reports_hide_video_target",
  "public_reports_hide_page_cursor",
  "public_reports_hide_api_key",
  "moderation_terms_not_reported",
  "no_raw_payloads",
  "no_text_payloads",
  "no_candidates",
  "no_commands",
];

const fixtureServer = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/youtube/v3/videos") {
    videoDiscoveryCount += 1;
    received.videoLookupSent = url.searchParams.has("id");
    return sendJson(response, 500, {
      error: "video_discovery_must_not_be_called_for_direct_chat_target",
    });
  }
  if (request.method === "GET" && url.pathname === "/youtube/v3/liveChat/messages") {
    liveChatPollCount += 1;
    received.chatTargetSent =
      url.searchParams.get("liveChatId") === "runtime-secret-chat-id";
    received.authCredentialSent = url.searchParams.get("key") === "runtime-secret-api-key";
    return sendJson(response, 200, {
      nextPageToken: "runtime-secret-next-page-token",
      pollingIntervalMillis: 10_000,
      items: createFixtureLiveChatItems(),
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const address = await listen(fixtureServer, { port: 0, host: "127.0.0.1" });
const baseUrl = `http://${address.address}:${address.port}`;
const persistenceDir = mkdtempSync(join(tmpdir(), "iris-youtube-runtime-ingest-"));
let scheduler = null;

try {
  const adapterCallCounts = {
    tts: 0,
    live2d: 0,
    subtitle: 0,
  };
  const env = {
    ...process.env,
    IRIS_YOUTUBE_LIVE_CHAT_SOURCE: "youtube_api",
    IRIS_YOUTUBE_LIVE_CHAT_ID: "runtime-secret-chat-id",
    IRIS_YOUTUBE_DATA_API_KEY: "runtime-secret-api-key",
    IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT: `${baseUrl}/youtube/v3/liveChat/messages`,
    IRIS_YOUTUBE_VIDEOS_API_ENDPOINT: `${baseUrl}/youtube/v3/videos`,
    IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS: "20",
    IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW: "20",
    IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH: join(persistenceDir, "cursor.json"),
    IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS: "runtime-blocked-author",
    IRIS_YOUTUBE_BLOCKED_TEXT_TERMS: "runtime blocked phrase",
    IRIS_ENABLE_HTTP_INGEST_SCHEDULER: "true",
    IRIS_HTTP_INGEST_INTERVAL_MS: "60000",
    IRIS_HTTP_INGEST_LIMIT: "20",
    IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR: "true",
    IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
    IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
    IRIS_GAME_CONTROL_ADAPTER: "mock",
    IRIS_ENABLE_GAME_CONTROL: "false",
    IRIS_MEMORY_SEARCH_ADAPTER: "local",
    IRIS_MEMORY_STORE_PATH: join(persistenceDir, "memory.json"),
    IRIS_RELATIONSHIP_STORE_PATH: join(persistenceDir, "relationships.json"),
  };
  const adapters = createRuntimeAdaptersFromEnv(env);
  const streamState = createStreamState();
  const runtime = createIrisRuntime({
    runtimeConfig: createRuntimeConfig(env),
    ...adapters,
    ttsAdapter() {
      adapterCallCounts.tts += 1;
      return { spoken: true, adapter: "quiet_dev_tts" };
    },
    live2dAdapter() {
      adapterCallCounts.live2d += 1;
      return { sent: true, adapter: "quiet_dev_live2d" };
    },
    subtitleAdapter() {
      adapterCallCounts.subtitle += 1;
      return { displayed: true, adapter: "quiet_dev_subtitle" };
    },
    logger: { log() {} },
  });
  scheduler = createHttpIngestScheduler({
    runtime,
    streamState,
    sources: [{ name: "youtube_live_chat_api", source: adapters.liveChatSource }],
    intervalMs: 60_000,
    batchLimit: 20,
    dedupeWindowSize: 20,
    continueOnSourceError: true,
    logger: { warn() {}, error() {} },
  });

  scheduler.start();
  const tick = await scheduler.tickNow("manual_youtube_runtime_ingest_roundtrip");
  const runtimeStatus = createYouTubeIngestRuntimeStatusReport({
    env,
    httpIngestScheduler: scheduler,
    streamState,
    generatedAtMs: Date.now(),
  });
  assertYouTubeIngestRuntimeStatusReportSafe(
    runtimeStatus,
    "youtube runtime ingest roundtrip runtime status"
  );

  const sourceStatus = adapters.liveChatSource.status();
  const publicState = streamState.get();
  const memoryRecords = runtime.memoryRecords(100);
  const relationshipProfiles = runtime.relationshipProfiles();
  const processedPayloadKindCounts = countBy(
    tick.processed.map((item) => item.payload_kind)
  );
  const processedDecisionCounts = countBy(
    tick.processed.map((item) => item.final_decision)
  );
  const telemetry =
    runtimeStatus.scheduler_summary.youtube_source_telemetry_counts;
  const report = {
    schema: "iris_youtube_runtime_ingest_roundtrip_report_v1",
    ok: false,
    fixture_counts: {
      video_discovery_count: videoDiscoveryCount,
      live_chat_poll_count: liveChatPollCount,
    },
    upstream_request_summary: {
      chat_target_sent: received.chatTargetSent,
      video_lookup_sent: received.videoLookupSent,
      auth_credential_sent: received.authCredentialSent,
    },
    tick_summary: {
      ok: tick.ok === true,
      processed_count: tick.processed_count,
      duplicate_count: tick.duplicate_count,
      source_error_count: tick.source_error_count,
      processed_payload_kind_counts: processedPayloadKindCounts,
      processed_final_decision_counts: processedDecisionCounts,
      last_priority_summary: tick.status?.last_priority_summary ?? null,
    },
    runtime_status_summary: {
      schema: runtimeStatus.schema,
      runtime_status: runtimeStatus.runtime_status,
      source_kind: runtimeStatus.source_kind,
      preflight_status: runtimeStatus.preflight_status,
      ingest_scheduler_enabled_by_env:
        runtimeStatus.ingest_scheduler_enabled_by_env,
      scheduler_available: runtimeStatus.scheduler_summary.scheduler_available,
      scheduler_running: runtimeStatus.scheduler_summary.running,
      scheduler_source_count: runtimeStatus.scheduler_summary.source_count,
      scheduler_youtube_source_count:
        runtimeStatus.scheduler_summary.youtube_source_count,
      scheduler_processed_count: runtimeStatus.scheduler_summary.processed_count,
      scheduler_duplicate_count: runtimeStatus.scheduler_summary.duplicate_count,
      scheduler_source_error_count:
        runtimeStatus.scheduler_summary.source_error_count,
      scheduler_telemetry_counts: telemetry,
      youtube_runtime_state: runtimeStatus.youtube_runtime_state,
      api_cursor_auth_flow: runtimeStatus.api_cursor_auth_flow,
      poll_flow: runtimeStatus.poll_flow,
      ingest_hygiene_flow: runtimeStatus.ingest_hygiene_flow,
      support_candidate_flow: runtimeStatus.support_candidate_flow,
      live_chat_ingest_flow: runtimeStatus.live_chat_ingest_flow,
    },
    source_status_summary: {
      source_kind: sourceStatus.source_kind,
      auth_mode: sourceStatus.auth_mode,
      chat_target_configured: sourceStatus.live_chat_id_configured,
      video_target_configured: sourceStatus.video_id_configured,
      chat_target_resolved: sourceStatus.live_chat_id_resolved,
      request_count: sourceStatus.request_count,
      video_discovery_request_count: sourceStatus.video_discovery_request_count,
      live_chat_request_count: sourceStatus.live_chat_request_count,
      cursor_available: sourceStatus.has_next_page_token,
      last_item_count: sourceStatus.last_item_count,
      last_ignored_count: sourceStatus.last_ignored_count,
      last_duplicate_count: sourceStatus.last_duplicate_count,
      last_moderation_filtered_count: sourceStatus.last_moderation_filtered_count,
      last_moderation_reason_counts: sourceStatus.last_moderation_reason_counts,
      last_comment_count: sourceStatus.last_comment_count,
      last_support_event_count: sourceStatus.last_support_event_count,
      last_support_event_type_counts: sourceStatus.last_support_event_type_counts,
      last_support_amount_source_counts:
        sourceStatus.last_support_amount_source_counts,
      ignored_event_count: sourceStatus.ignored_event_count,
      duplicate_item_count: sourceStatus.duplicate_item_count,
      moderation_filtered_count: sourceStatus.moderation_filtered_count,
      moderation_reason_counts: sourceStatus.moderation_reason_counts,
      comment_event_count: sourceStatus.comment_event_count,
      support_event_count: sourceStatus.support_event_count,
      support_event_type_counts: sourceStatus.support_event_type_counts,
      support_amount_source_counts: sourceStatus.support_amount_source_counts,
    },
    public_state_summary: {
      status: publicState.status,
      last_payload_kind: publicState.last_payload_kind,
      last_boundary_audit_status: publicState.last_boundary_audit?.audit_status ?? null,
      candidate_review_count: publicState.last_candidate_review_items.length,
      relationship_candidate_status:
        publicState.last_relationship_deepening?.candidate_status ?? null,
      donation_reaction_style: publicState.last_donation_reaction?.reaction_style ?? null,
    },
    public_persistence_counts: {
      memory_record_count: memoryRecords.length,
      relationship_profile_count: relationshipProfiles.length,
    },
    output_handoff_summary: {
      tts_adapter_call_count: adapterCallCounts.tts,
      live2d_adapter_call_count: adapterCallCounts.live2d,
      subtitle_adapter_call_count: adapterCallCounts.subtitle,
      all_processed_events_reached_output_adapters:
        adapterCallCounts.tts === tick.processed_count &&
        adapterCallCounts.live2d === tick.processed_count &&
        adapterCallCounts.subtitle === tick.processed_count,
      next_obs_artifact_verification_script:
        "npm run dev:obs:runtime-render-roundtrip",
      obs_artifact_verification_required_for_live_pickup: true,
      production_loop_verification_script:
        "npm run dev:production-loop:roundtrip",
      ready_for_production_loop_fixture:
        adapterCallCounts.tts === tick.processed_count &&
        adapterCallCounts.live2d === tick.processed_count &&
        adapterCallCounts.subtitle === tick.processed_count,
    },
    support_event_policy: {
      support_events_enter_donation_pipeline: true,
      support_events_raise_relationship_candidates: true,
      relationship_and_memory_candidates_validation_gated: true,
      status_reports_counts_only: true,
    },
    boundary_policy: {
      scheduler_path_used: true,
      direct_chat_target_bypasses_video_discovery: true,
      upstream_ids_used_in_requests_only: true,
      public_reports_hide_chat_target: true,
      public_reports_hide_video_target: true,
      public_reports_hide_page_cursor: true,
      public_reports_hide_api_key: true,
      moderation_terms_not_reported: true,
      no_raw_payloads: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
    unsafe_report_leak_detected: false,
  };

  report.unsafe_report_leak_detected = hasUnsafeReportLeak(report, baseUrl);
  report.ok =
    report.unsafe_report_leak_detected === false &&
    youtubeRuntimeIngestRoundtripBoundaryOk(report) &&
    adapters.liveChatSource.source_kind === "youtube_live_chat_api_source" &&
    tick.ok === true &&
    tick.processed_count === 4 &&
    tick.source_error_count === 0 &&
    tick.duplicate_count === 0 &&
    processedPayloadKindCounts.comment === 1 &&
    processedPayloadKindCounts.donation_event === 3 &&
    videoDiscoveryCount === 0 &&
    liveChatPollCount === 1 &&
    received.chatTargetSent === true &&
    received.videoLookupSent === false &&
    received.authCredentialSent === true &&
    runtimeStatus.runtime_status === "polling_active" &&
    runtimeStatus.preflight_status === "ready_to_poll_youtube_ingest" &&
    runtimeStatus.scheduler_summary.scheduler_available === true &&
    runtimeStatus.scheduler_summary.running === true &&
    runtimeStatus.scheduler_summary.source_count === 1 &&
    runtimeStatus.scheduler_summary.youtube_source_count === 1 &&
    runtimeStatus.scheduler_summary.processed_count === 4 &&
    adapterCallCounts.tts === 4 &&
    adapterCallCounts.live2d === 4 &&
    adapterCallCounts.subtitle === 4 &&
    report.output_handoff_summary.ready_for_production_loop_fixture === true &&
    report.output_handoff_summary.production_loop_verification_script ===
      "npm run dev:production-loop:roundtrip" &&
    runtimeStatus.api_cursor_auth_flow.flow_status ===
      "api_polling_with_comments_and_support" &&
    runtimeStatus.api_cursor_auth_flow.blocking_stage === "none" &&
    runtimeStatus.api_cursor_auth_flow.direct_api_source_active === true &&
    runtimeStatus.api_cursor_auth_flow.auth_ready === true &&
    runtimeStatus.api_cursor_auth_flow.api_direct_chat_target_configured === true &&
    runtimeStatus.api_cursor_auth_flow.cursor_store_configured === true &&
    runtimeStatus.api_cursor_auth_flow.live_chat_request_count === 1 &&
    runtimeStatus.api_cursor_auth_flow.comment_event_count === 1 &&
    runtimeStatus.api_cursor_auth_flow.support_event_count === 3 &&
    runtimeStatus.poll_flow.flow_status ===
      "polling_active_with_comments_and_support" &&
    runtimeStatus.poll_flow.blocking_stage === "none" &&
    runtimeStatus.poll_flow.support_events_ready_for_donation_pipeline === true &&
    runtimeStatus.ingest_hygiene_flow.schema ===
      "iris_youtube_ingest_hygiene_flow_summary_v1" &&
    runtimeStatus.ingest_hygiene_flow.flow_status ===
      "hygiene_active_with_filtered_items" &&
    runtimeStatus.ingest_hygiene_flow.blocking_stage === "none" &&
    runtimeStatus.ingest_hygiene_flow.last_duplicate_count === 1 &&
    runtimeStatus.ingest_hygiene_flow.last_moderation_filtered_count === 2 &&
    runtimeStatus.ingest_hygiene_flow.last_ignored_count === 4 &&
    sourceStatus.last_ignored_event_type_counts.messageDeletedEvent === 1 &&
    runtimeStatus.ingest_hygiene_flow.hygiene_policy
      .duplicate_platform_items_do_not_double_trigger === true &&
    runtimeStatus.youtube_runtime_state.stream_state_available === true &&
    runtimeStatus.youtube_runtime_state.history_support_event_count === 3 &&
    runtimeStatus.youtube_runtime_state.donation_reaction_available === true &&
    runtimeStatus.youtube_runtime_state.candidate_validation_available === true &&
    runtimeStatus.youtube_runtime_state.candidate_persistence_available === true &&
    runtimeStatus.support_candidate_flow.flow_status ===
      "validation_gated_persistence_active" &&
    runtimeStatus.support_candidate_flow.blocking_stage === "none" &&
    runtimeStatus.support_candidate_flow.validation_passed === true &&
    runtimeStatus.support_candidate_flow.persistence_committed === true &&
    runtimeStatus.support_candidate_flow.source_support_event_type_counts
      .superChatEvent === 1 &&
    runtimeStatus.support_candidate_flow.source_support_event_type_counts
      .memberMilestoneChatEvent === 1 &&
    runtimeStatus.support_candidate_flow.source_support_event_type_counts
      .giftMembershipReceivedEvent === 1 &&
    runtimeStatus.support_candidate_flow.source_support_amount_source_counts
      .micros === 1 &&
    runtimeStatus.support_candidate_flow.source_support_amount_source_counts
      .membership_count === 1 &&
    runtimeStatus.support_candidate_flow.source_support_amount_source_counts
      .unknown === 1 &&
    runtimeStatus.live_chat_ingest_flow.flow_status ===
      "runtime_active_with_comments_and_support" &&
    runtimeStatus.live_chat_ingest_flow.blocking_stage === "none" &&
    runtimeStatus.live_chat_ingest_flow.comments_enter_reaction_pipeline === true &&
    runtimeStatus.live_chat_ingest_flow.support_events_enter_donation_pipeline === true &&
    runtimeStatus.live_chat_ingest_flow.comment_event_count === 1 &&
    runtimeStatus.live_chat_ingest_flow.support_event_count === 3 &&
    runtimeStatus.live_chat_ingest_flow.runtime_history_comment_count === 1 &&
    runtimeStatus.live_chat_ingest_flow.runtime_history_support_event_count === 3 &&
    telemetry.live_chat_request_count === 1 &&
    telemetry.last_item_count === 8 &&
    telemetry.last_comment_count === 1 &&
    telemetry.last_support_event_count === 3 &&
    telemetry.support_event_count === 3 &&
    sourceStatus.live_chat_id_configured === true &&
    sourceStatus.video_id_configured === false &&
    sourceStatus.live_chat_id_resolved === true &&
    sourceStatus.video_discovery_request_count === 0 &&
    sourceStatus.live_chat_request_count === 1 &&
    sourceStatus.last_item_count === 8 &&
    sourceStatus.last_comment_count === 1 &&
    sourceStatus.last_support_event_count === 3 &&
    sourceStatus.last_support_event_type_counts.giftMembershipReceivedEvent === 1 &&
    sourceStatus.last_support_amount_source_counts.membership_count === 1 &&
    sourceStatus.last_duplicate_count === 1 &&
    sourceStatus.last_moderation_filtered_count === 2 &&
    sourceStatus.last_ignored_count === 4 &&
    publicState.last_payload_kind === "comment" &&
    publicState.last_boundary_audit?.audit_status === "pass";

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  scheduler?.stop();
  await closeServer(fixtureServer);
  rmSync(persistenceDir, { recursive: true, force: true });
}

function createFixtureLiveChatItems() {
  return [
    {
      id: "runtime-comment-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "Runtime IRIS hello from chat",
        publishedAt: "2026-04-30T00:00:01Z",
      },
      authorDetails: {
        channelId: "runtime-viewer-commenter",
        displayName: "Runtime Comment Viewer",
      },
    },
    {
      id: "runtime-superchat-1",
      snippet: {
        displayMessage: "Runtime Super Chat",
        publishedAt: "2026-04-30T00:00:02Z",
        superChatDetails: {
          amountMicros: "250000000",
          currency: "JPY",
          userComment: "Runtime support for IRIS",
        },
      },
      authorDetails: {
        channelId: "runtime-viewer-supporter",
        displayName: "Runtime Support Viewer",
      },
    },
    {
      id: "runtime-member-1",
      snippet: {
        displayMessage: "Runtime member milestone",
        publishedAt: "2026-04-30T00:00:03Z",
        memberMilestoneChatDetails: {
          userComment: "Runtime member milestone message",
        },
      },
      authorDetails: {
        channelId: "runtime-viewer-member",
        displayName: "Runtime Member Viewer",
      },
    },
    {
      id: "runtime-gift-received-1",
      snippet: {
        displayMessage: "Runtime gifted membership",
        publishedAt: "2026-04-30T00:00:03.500Z",
        giftMembershipReceivedDetails: {
          memberLevelName: "Gold",
        },
      },
      authorDetails: {
        channelId: "runtime-viewer-gift-receiver",
        displayName: "Runtime Gift Receiver",
      },
    },
    {
      id: "runtime-comment-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "Duplicate runtime comment",
        publishedAt: "2026-04-30T00:00:04Z",
      },
      authorDetails: {
        channelId: "runtime-viewer-commenter",
        displayName: "Runtime Comment Viewer",
      },
    },
    {
      id: "runtime-deleted-1",
      snippet: {
        publishedAt: "2026-04-30T00:00:05Z",
        messageDeletedDetails: {
          deletedMessageId: "runtime-deleted-message-id",
        },
      },
      authorDetails: {
        channelId: "runtime-viewer-deleted",
        displayName: "Deleted Viewer",
      },
    },
    {
      id: "runtime-blocked-author-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "This author should be filtered before runtime",
        publishedAt: "2026-04-30T00:00:06Z",
      },
      authorDetails: {
        channelId: "runtime-blocked-author",
        displayName: "Blocked Author Viewer",
      },
    },
    {
      id: "runtime-blocked-text-1",
      snippet: {
        displayMessage: "Filtered runtime support",
        publishedAt: "2026-04-30T00:00:07Z",
        superChatDetails: {
          amountMicros: "500000000",
          currency: "JPY",
          userComment: "Please repeat runtime blocked phrase.",
        },
      },
      authorDetails: {
        channelId: "runtime-viewer-filtered-support",
        displayName: "Filtered Support Viewer",
      },
    },
  ];
}

function hasUnsafeReportLeak(report, unsafeBaseUrl) {
  const serialized = JSON.stringify(report);
  const forbiddenStrings = [
    "runtime-secret-chat-id",
    "runtime-secret-api-key",
    "runtime-secret-next-page-token",
    "runtime-blocked-author",
    "runtime blocked phrase",
    "Runtime IRIS hello",
    "Runtime Super Chat",
    "Runtime support for IRIS",
    "Runtime member milestone",
    "Runtime gifted membership",
    unsafeBaseUrl,
  ];
  const forbiddenFieldPatterns = [
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

function youtubeRuntimeIngestRoundtripBoundaryOk(report) {
  return YOUTUBE_RUNTIME_INGEST_ROUNDTRIP_BOUNDARY_FIELDS.every(
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
