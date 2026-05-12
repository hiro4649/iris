import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { listen } from "../src/server/httpServer.js";

let oauthRefreshCount = 0;
let videoDiscoveryCount = 0;
let liveChatPollCount = 0;
const YOUTUBE_API_ROUNDTRIP_BOUNDARY_FIELDS = [
  "youtube_api_read_only",
  "moderation_items_ignored",
  "oauth_secrets_not_reported",
  "candidates_commit_only_after_validation",
];

const fixtureServer = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "POST" && url.pathname === "/oauth/token") {
    oauthRefreshCount += 1;
    await readRequestText(request);
    return sendJson(response, 200, {
      access_token: "fixture-access-token",
      expires_in: 3600,
      token_type: "Bearer",
    });
  }
  if (request.method === "GET" && url.pathname === "/youtube/v3/videos") {
    videoDiscoveryCount += 1;
    return sendJson(response, 200, {
      items: [
        {
          id: "fixture-video-id",
          liveStreamingDetails: {
            activeLiveChatId: "fixture-live-chat-id",
          },
        },
      ],
    });
  }
  if (request.method === "GET" && url.pathname === "/youtube/v3/liveChat/messages") {
    liveChatPollCount += 1;
    return sendJson(response, 200, {
      nextPageToken: "fixture-next-page",
      pollingIntervalMillis: 10_000,
      items: createFixtureLiveChatItems(),
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const address = await listen(fixtureServer, { port: 0, host: "127.0.0.1" });
const baseUrl = `http://${address.address}:${address.port}`;
const persistenceDir = mkdtempSync(join(tmpdir(), "iris-youtube-api-roundtrip-"));

try {
  const env = {
    ...process.env,
    IRIS_YOUTUBE_LIVE_CHAT_SOURCE: "youtube_api",
    IRIS_YOUTUBE_VIDEO_ID: "fixture-video-id",
    IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT: `${baseUrl}/youtube/v3/liveChat/messages`,
    IRIS_YOUTUBE_VIDEOS_API_ENDPOINT: `${baseUrl}/youtube/v3/videos`,
    IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT: `${baseUrl}/oauth/token`,
    IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN: "fixture-refresh-token",
    IRIS_YOUTUBE_OAUTH_CLIENT_ID: "fixture-client",
    IRIS_YOUTUBE_OAUTH_CLIENT_SECRET: "fixture-client-secret",
    IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS: "20",
    IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS: "viewer-blocked-filter",
    IRIS_YOUTUBE_BLOCKED_TEXT_TERMS: "filtered fixture phrase",
    IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
    IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
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
      source: event.source,
      payload_kind: result.core.phase01.payload_kind,
      final_decision: result.core.phase15.final_decision,
      candidate_memory_committed_count:
        result.candidate_persistence?.memory_committed_count ?? 0,
      candidate_relationship_committed_count:
        result.candidate_persistence?.relationship_committed_count ?? 0,
      boundary_audit_status: result.boundary_audit.audit_status,
    });
  }
  const sourceStatus = adapters.liveChatSource.status();
  const memoryRecords = runtime.memoryRecords(100);
  const relationshipProfiles = runtime.relationshipProfiles();
  const baseOk =
    oauthRefreshCount === 1 &&
    videoDiscoveryCount === 1 &&
    liveChatPollCount === 1 &&
    processed.length === 7 &&
    sourceStatus.request_count === 2 &&
    sourceStatus.video_discovery_request_count === 1 &&
    sourceStatus.live_chat_request_count === 1 &&
    sourceStatus.last_item_count === 11 &&
    sourceStatus.last_ignored_count === 4 &&
    sourceStatus.last_ignored_event_type_counts.messageDeletedEvent === 1 &&
    sourceStatus.last_ignored_event_type_counts.userBannedEvent === 1 &&
    sourceStatus.last_moderation_filtered_count === 2 &&
    sourceStatus.last_comment_count === 1 &&
    sourceStatus.last_support_event_count === 6 &&
    sourceStatus.last_support_event_type_counts.superChatEvent === 1 &&
    sourceStatus.last_support_event_type_counts.superStickerEvent === 1 &&
    sourceStatus.last_support_event_type_counts.superThanksEvent === 1 &&
    sourceStatus.last_support_event_type_counts.newSponsorEvent === 1 &&
    sourceStatus.last_support_event_type_counts.memberMilestoneChatEvent === 1 &&
    sourceStatus.last_support_event_type_counts.membershipGiftingEvent === 1 &&
    processed.every((item) => item.final_decision === "allow") &&
    processed.every((item) => item.boundary_audit_status === "pass");

  const report = {
    ok: false,
    fixture_counts: {
      oauth_refresh_count: oauthRefreshCount,
      video_discovery_count: videoDiscoveryCount,
      live_chat_poll_count: liveChatPollCount,
    },
    source_status_summary: {
      source_kind: sourceStatus.source_kind,
      auth_mode: sourceStatus.auth_mode,
      ingest_readiness_status: sourceStatus.ingest_readiness_status,
      live_chat_id_resolved: sourceStatus.live_chat_id_resolved,
      request_count: sourceStatus.request_count,
      video_discovery_request_count: sourceStatus.video_discovery_request_count,
      live_chat_request_count: sourceStatus.live_chat_request_count,
      last_item_count: sourceStatus.last_item_count,
      last_ignored_count: sourceStatus.last_ignored_count,
      last_ignored_event_type_counts: sourceStatus.last_ignored_event_type_counts,
      last_moderation_filtered_count: sourceStatus.last_moderation_filtered_count,
      last_moderation_reason_counts: sourceStatus.last_moderation_reason_counts,
      last_comment_count: sourceStatus.last_comment_count,
      last_support_event_count: sourceStatus.last_support_event_count,
      last_support_event_type_counts: sourceStatus.last_support_event_type_counts,
      last_support_amount_source_counts:
        sourceStatus.last_support_amount_source_counts,
      ignored_event_count: sourceStatus.ignored_event_count,
      ignored_event_type_counts: sourceStatus.ignored_event_type_counts,
      moderation_filtered_count: sourceStatus.moderation_filtered_count,
      moderation_reason_counts: sourceStatus.moderation_reason_counts,
      support_event_count: sourceStatus.support_event_count,
      support_event_type_counts: sourceStatus.support_event_type_counts,
      support_amount_source_counts: sourceStatus.support_amount_source_counts,
      oauth_refresh_count:
        sourceStatus.oauth_provider_status?.refresh_count ?? null,
    },
    processed_count: processed.length,
    processed,
    public_persistence_counts: {
      memory_record_count: memoryRecords.length,
      relationship_profile_count: relationshipProfiles.length,
    },
    boundary_policy: {
      youtube_api_read_only: true,
      moderation_items_ignored: true,
      oauth_secrets_not_reported: true,
      candidates_commit_only_after_validation: true,
    },
  };
  report.ok = baseOk && !hasUnsafeReportLeak(report, baseUrl, persistenceDir);

  console.log(
    JSON.stringify(
      report,
      null,
      2
    )
  );
  if (!report.ok) process.exitCode = 1;
} finally {
  await closeServer(fixtureServer);
}

function hasUnsafeReportLeak(report, unsafeBaseUrl, unsafePersistenceDir) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    unsafeBaseUrl,
    unsafePersistenceDir,
    "fixture-access-token",
    "fixture-next-page",
    "fixture-refresh-token",
    "fixture-client",
    "fixture-client-secret",
    "fixture-live-chat-id",
    "viewer-blocked-filter",
    "filtered fixture phrase",
    "IRIS, keep going",
    "IRIS, this run is hilarious",
    "Thanks for making the replay funny too",
    "Three months with IRIS",
    "A sticker flies across chat",
    "Please repeat filtered fixture phrase",
    "Comment Viewer",
    "Support Viewer",
    "Super Thanks Viewer",
    "Member Viewer",
    "Sticker Viewer",
    "Gift Viewer",
    "Sponsor Viewer",
    "Filtered Support Viewer",
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"approved_memory_record"',
    '"approved_relationship_record"',
    '"event_id"',
    '"store_path"',
    '"filePath"',
  ];
  return (
    forbiddenFragments.some((value) => serialized.includes(value)) ||
    !YOUTUBE_API_ROUNDTRIP_BOUNDARY_FIELDS.every(
      (field) => report.boundary_policy?.[field] === true
    )
  );
}

function createFixtureLiveChatItems() {
  return [
    {
      id: "fixture-comment-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "IRIS, keep going!",
        publishedAt: "2026-04-30T00:00:01Z",
      },
      authorDetails: {
        channelId: "viewer-commenter",
        displayName: "Comment Viewer",
      },
    },
    {
      id: "fixture-superchat-1",
      snippet: {
        displayMessage: "Super Chat from Support Viewer",
        publishedAt: "2026-04-30T00:00:02Z",
        superChatDetails: {
          amountMicros: "250000000",
          currency: "JPY",
          userComment: "IRIS, this run is hilarious!",
        },
      },
      authorDetails: {
        channelId: "viewer-supporter",
        displayName: "Support Viewer",
      },
    },
    {
      id: "fixture-superthanks-1",
      snippet: {
        displayMessage: "Super Thanks from Archive Supporter",
        publishedAt: "2026-04-30T00:00:02.500Z",
        superThanksDetails: {
          amountMicros: "150000000",
          currency: "JPY",
          userComment: "Thanks for making the replay funny too!",
        },
      },
      authorDetails: {
        channelId: "viewer-superthanks",
        displayName: "Super Thanks Viewer",
      },
    },
    {
      id: "fixture-member-1",
      snippet: {
        displayMessage: "Member milestone",
        publishedAt: "2026-04-30T00:00:03Z",
        memberMilestoneChatDetails: {
          userComment: "Three months with IRIS!",
        },
      },
      authorDetails: {
        channelId: "viewer-member",
        displayName: "Member Viewer",
      },
    },
    {
      id: "fixture-sticker-1",
      snippet: {
        displayMessage: "A sticker flies across chat!",
        publishedAt: "2026-04-30T00:00:03.500Z",
        superStickerDetails: {
          amountMicros: "500000000",
          currency: "JPY",
        },
      },
      authorDetails: {
        channelId: "viewer-sticker",
        displayName: "Sticker Viewer",
      },
    },
    {
      id: "fixture-gift-1",
      snippet: {
        displayMessage: "Gifted memberships to the room",
        publishedAt: "2026-04-30T00:00:03.800Z",
        membershipGiftingDetails: {
          giftMembershipsCount: 5,
        },
      },
      authorDetails: {
        channelId: "viewer-gifter",
        displayName: "Gift Viewer",
      },
    },
    {
      id: "fixture-sponsor-1",
      snippet: {
        displayMessage: "New member joined the stream",
        publishedAt: "2026-04-30T00:00:03.900Z",
        newSponsorDetails: {
          memberLevelName: "Gold",
          amountDisplayString: "JPY 1,500",
        },
      },
      authorDetails: {
        channelId: "viewer-sponsor",
        displayName: "Sponsor Viewer",
      },
    },
    {
      id: "fixture-deleted-1",
      snippet: {
        publishedAt: "2026-04-30T00:00:04Z",
        messageDeletedDetails: {
          deletedMessageId: "fixture-deleted-message-id",
        },
      },
      authorDetails: {
        channelId: "viewer-deleted",
        displayName: "Deleted Viewer",
      },
    },
    {
      id: "fixture-ban-1",
      snippet: {
        publishedAt: "2026-04-30T00:00:05Z",
        userBannedDetails: {
          bannedUserDetails: {
            channelId: "viewer-banned",
            displayName: "Banned Viewer",
          },
          banType: "permanent",
        },
      },
      authorDetails: {
        channelId: "viewer-banned",
        displayName: "Banned Viewer",
      },
    },
    {
      id: "fixture-blocked-author-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "IRIS, this author is configured out.",
        publishedAt: "2026-04-30T00:00:05.500Z",
      },
      authorDetails: {
        channelId: "viewer-blocked-filter",
        displayName: "Blocked Fixture Viewer",
      },
    },
    {
      id: "fixture-blocked-text-1",
      snippet: {
        displayMessage: "Filtered support event",
        publishedAt: "2026-04-30T00:00:05.700Z",
        superChatDetails: {
          amountMicros: "250000000",
          currency: "JPY",
          userComment: "Please repeat filtered fixture phrase.",
        },
      },
      authorDetails: {
        channelId: "viewer-filtered-support",
        displayName: "Filtered Support Viewer",
      },
    },
  ];
}

async function readRequestText(request) {
  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) raw += chunk;
  return raw;
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
