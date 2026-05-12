import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { listen } from "../src/server/httpServer.js";

let videoDiscoveryCount = 0;
let liveChatPollCount = 0;
const received = {
  liveChatIdSent: false,
  videoIdSent: false,
  authCredentialSent: false,
};
const YOUTUBE_DIRECT_LIVE_CHAT_ROUNDTRIP_BOUNDARY_FIELDS = [
  "direct_live_chat_id_bypasses_video_discovery",
  "upstream_ids_used_in_requests_only",
  "public_status_hides_live_chat_id",
  "public_status_hides_video_id",
  "public_status_hides_page_token",
  "public_status_hides_api_key",
  "moderation_terms_not_reported",
  "candidates_commit_only_after_validation",
  "no_raw_payloads",
  "no_text_payloads",
  "no_candidates",
  "no_commands",
];

const fixtureServer = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/youtube/v3/videos") {
    videoDiscoveryCount += 1;
    received.videoIdSent = url.searchParams.has("id");
    return sendJson(response, 500, {
      error: "video_discovery_must_not_be_called_for_direct_live_chat_id",
    });
  }
  if (request.method === "GET" && url.pathname === "/youtube/v3/liveChat/messages") {
    liveChatPollCount += 1;
    received.liveChatIdSent =
      url.searchParams.get("liveChatId") === "direct-secret-live-chat-id";
    received.authCredentialSent = url.searchParams.get("key") === "direct-secret-api-key";
    return sendJson(response, 200, {
      nextPageToken: "direct-secret-next-page-token",
      pollingIntervalMillis: 10_000,
      items: createFixtureLiveChatItems(),
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const address = await listen(fixtureServer, { port: 0, host: "127.0.0.1" });
const baseUrl = `http://${address.address}:${address.port}`;
const persistenceDir = mkdtempSync(join(tmpdir(), "iris-youtube-direct-live-chat-"));

try {
  const env = {
    ...process.env,
    IRIS_YOUTUBE_LIVE_CHAT_SOURCE: "youtube_api",
    IRIS_YOUTUBE_LIVE_CHAT_ID: "direct-secret-live-chat-id",
    IRIS_YOUTUBE_DATA_API_KEY: "direct-secret-api-key",
    IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT: `${baseUrl}/youtube/v3/liveChat/messages`,
    IRIS_YOUTUBE_VIDEOS_API_ENDPOINT: `${baseUrl}/youtube/v3/videos`,
    IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS: "20",
    IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW: "20",
    IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS: "direct-blocked-author",
    IRIS_YOUTUBE_BLOCKED_TEXT_TERMS: "direct blocked phrase",
    IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
    IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
    IRIS_GAME_CONTROL_ADAPTER: "mock",
    IRIS_ENABLE_GAME_CONTROL: "false",
    IRIS_MEMORY_SEARCH_ADAPTER: "local",
    IRIS_MEMORY_STORE_PATH: join(persistenceDir, "memory.json"),
    IRIS_RELATIONSHIP_STORE_PATH: join(persistenceDir, "relationships.json"),
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

  const events = await adapters.liveChatSource.nextBatch(20);
  const processed = [];
  for (const event of events) {
    const result = await runtime.processEvent(event);
    processed.push({
      payload_kind: result.core.phase01.payload_kind,
      final_decision: result.core.phase15.final_decision,
      boundary_audit_status: result.boundary_audit.audit_status,
    });
  }

  const sourceStatus = adapters.liveChatSource.status();
  const memoryRecords = runtime.memoryRecords(100);
  const relationshipProfiles = runtime.relationshipProfiles();
  const report = {
    ok:
      adapters.liveChatSource.source_kind === "youtube_live_chat_api_source" &&
      events.length === 4 &&
      processed.length === 4 &&
      videoDiscoveryCount === 0 &&
      liveChatPollCount === 1 &&
      received.liveChatIdSent === true &&
      received.videoIdSent === false &&
      received.authCredentialSent === true &&
      sourceStatus.live_chat_id_configured === true &&
      sourceStatus.video_id_configured === false &&
      sourceStatus.live_chat_id_resolved === true &&
      sourceStatus.video_discovery_request_count === 0 &&
      sourceStatus.live_chat_request_count === 1 &&
      sourceStatus.last_item_count === 8 &&
      sourceStatus.last_comment_count === 1 &&
      sourceStatus.last_support_event_count === 3 &&
      sourceStatus.last_support_event_type_counts.giftMembershipReceivedEvent === 1 &&
      sourceStatus.last_support_event_type_counts.memberMilestoneChatEvent === 1 &&
      sourceStatus.last_support_amount_source_counts.membership_count === 1 &&
      sourceStatus.last_duplicate_count === 1 &&
      sourceStatus.last_moderation_filtered_count === 2 &&
      sourceStatus.last_ignored_count === 4 &&
      sourceStatus.last_ignored_event_type_counts.messageDeletedEvent === 1 &&
      !Object.hasOwn(sourceStatus, "live_chat_id") &&
      !Object.hasOwn(sourceStatus, "video_id") &&
      !Object.hasOwn(sourceStatus, "next_page_token"),
    fixture_counts: {
      video_discovery_count: videoDiscoveryCount,
      live_chat_poll_count: liveChatPollCount,
    },
    upstream_request_summary: {
      direct_live_chat_id_sent: received.liveChatIdSent,
      video_id_sent: received.videoIdSent,
      auth_credential_sent: received.authCredentialSent,
    },
    source_status_summary: {
      source_kind: sourceStatus.source_kind,
      auth_mode: sourceStatus.auth_mode,
      live_chat_id_configured: sourceStatus.live_chat_id_configured,
      video_id_configured: sourceStatus.video_id_configured,
      live_chat_id_resolved: sourceStatus.live_chat_id_resolved,
      request_count: sourceStatus.request_count,
      video_discovery_request_count: sourceStatus.video_discovery_request_count,
      live_chat_request_count: sourceStatus.live_chat_request_count,
      has_next_page_token: sourceStatus.has_next_page_token,
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
    processed_count: processed.length,
    processed_payload_kind_counts: countBy(processed.map((item) => item.payload_kind)),
    processed_final_decision_counts: countBy(processed.map((item) => item.final_decision)),
    public_persistence_counts: {
      memory_record_count: memoryRecords.length,
      relationship_profile_count: relationshipProfiles.length,
    },
    boundary_policy: {
      direct_live_chat_id_bypasses_video_discovery: true,
      upstream_ids_used_in_requests_only: true,
      public_status_hides_live_chat_id: true,
      public_status_hides_video_id: true,
      public_status_hides_page_token: true,
      public_status_hides_api_key: true,
      moderation_terms_not_reported: true,
      candidates_commit_only_after_validation: true,
      no_raw_payloads: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };

  const serialized = JSON.stringify(report);
  if (
    serialized.includes("direct-secret-live-chat-id") ||
    serialized.includes("direct-secret-api-key") ||
    serialized.includes("direct-secret-next-page-token") ||
    serialized.includes("direct-blocked-author") ||
    serialized.includes("direct blocked phrase") ||
    serialized.includes("Direct IRIS hello") ||
    serialized.includes("Direct Super Chat") ||
    serialized.includes("Direct gifted membership") ||
    serialized.includes(baseUrl) ||
    serialized.includes('"event_id"') ||
    serialized.includes('"trace_id"') ||
    serialized.includes('"live_chat_id"') ||
    serialized.includes('"video_id"') ||
    serialized.includes('"next_page_token"') ||
    serialized.includes('"input_action_candidate"') ||
    serialized.includes('"approved_memory_record"') ||
    serialized.includes('"approved_relationship_record"')
  ) {
    report.ok = false;
  }
  if (!youtubeDirectLiveChatRoundtripBoundaryOk(report)) {
    report.ok = false;
  }

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  await closeServer(fixtureServer);
}

function createFixtureLiveChatItems() {
  return [
    {
      id: "direct-comment-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "Direct IRIS hello from chat",
        publishedAt: "2026-04-30T00:00:01Z",
      },
      authorDetails: {
        channelId: "direct-viewer-commenter",
        displayName: "Direct Comment Viewer",
      },
    },
    {
      id: "direct-superchat-1",
      snippet: {
        displayMessage: "Direct Super Chat",
        publishedAt: "2026-04-30T00:00:02Z",
        superChatDetails: {
          amountMicros: "250000000",
          currency: "JPY",
          userComment: "Direct support for IRIS",
        },
      },
      authorDetails: {
        channelId: "direct-viewer-supporter",
        displayName: "Direct Support Viewer",
      },
    },
    {
      id: "direct-member-1",
      snippet: {
        displayMessage: "Direct member milestone",
        publishedAt: "2026-04-30T00:00:03Z",
        memberMilestoneChatDetails: {
          userComment: "Direct member milestone message",
        },
      },
      authorDetails: {
        channelId: "direct-viewer-member",
        displayName: "Direct Member Viewer",
      },
    },
    {
      id: "direct-gift-received-1",
      snippet: {
        displayMessage: "Direct gifted membership",
        publishedAt: "2026-04-30T00:00:03.500Z",
        giftMembershipReceivedDetails: {
          memberLevelName: "Gold",
        },
      },
      authorDetails: {
        channelId: "direct-viewer-gift-receiver",
        displayName: "Direct Gift Receiver",
      },
    },
    {
      id: "direct-comment-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "Duplicate direct comment",
        publishedAt: "2026-04-30T00:00:04Z",
      },
      authorDetails: {
        channelId: "direct-viewer-commenter",
        displayName: "Direct Comment Viewer",
      },
    },
    {
      id: "direct-deleted-1",
      snippet: {
        publishedAt: "2026-04-30T00:00:05Z",
        messageDeletedDetails: {
          deletedMessageId: "direct-deleted-message-id",
        },
      },
      authorDetails: {
        channelId: "direct-viewer-deleted",
        displayName: "Deleted Viewer",
      },
    },
    {
      id: "direct-blocked-author-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "This author should be filtered before runtime",
        publishedAt: "2026-04-30T00:00:06Z",
      },
      authorDetails: {
        channelId: "direct-blocked-author",
        displayName: "Blocked Author Viewer",
      },
    },
    {
      id: "direct-blocked-text-1",
      snippet: {
        displayMessage: "Filtered direct support",
        publishedAt: "2026-04-30T00:00:07Z",
        superChatDetails: {
          amountMicros: "500000000",
          currency: "JPY",
          userComment: "Please repeat direct blocked phrase.",
        },
      },
      authorDetails: {
        channelId: "direct-viewer-filtered-support",
        displayName: "Filtered Support Viewer",
      },
    },
  ];
}

function youtubeDirectLiveChatRoundtripBoundaryOk(report) {
  return YOUTUBE_DIRECT_LIVE_CHAT_ROUNDTRIP_BOUNDARY_FIELDS.every(
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
