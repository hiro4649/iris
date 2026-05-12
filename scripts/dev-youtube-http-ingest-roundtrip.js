import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createHttpIngestScheduler } from "../src/runtime/httpIngestScheduler.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createStreamState } from "../src/runtime/streamState.js";
import { createIrisHttpServer, listen } from "../src/server/httpServer.js";

const YOUTUBE_HTTP_INGEST_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "platform_counts",
  "ingest_tick",
  "source_status_summary",
  "persistence_summary",
  "boundary_policy",
]);

const tempDir = mkdtempSync(join(tmpdir(), "iris-youtube-http-ingest-roundtrip-"));
const memoryPath = join(tempDir, "memory.json");
const relationshipPath = join(tempDir, "relationships.json");
const platformCounts = {
  oauth_refresh: 0,
  video_discovery: 0,
  live_chat_poll: 0,
};

const platformServer = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "POST" && url.pathname === "/oauth/token") {
    platformCounts.oauth_refresh += 1;
    await readRequestText(request);
    return sendJson(response, 200, {
      access_token: "fixture-http-ingest-access-token",
      expires_in: 3600,
      token_type: "Bearer",
    });
  }
  if (request.method === "GET" && url.pathname === "/youtube/v3/videos") {
    platformCounts.video_discovery += 1;
    return sendJson(response, 200, {
      items: [
        {
          id: "fixture-http-ingest-video",
          liveStreamingDetails: {
            activeLiveChatId: "fixture-http-ingest-live-chat",
          },
        },
      ],
    });
  }
  if (request.method === "GET" && url.pathname === "/youtube/v3/liveChat/messages") {
    platformCounts.live_chat_poll += 1;
    return sendJson(response, 200, {
      nextPageToken: "fixture-http-ingest-next-page",
      pollingIntervalMillis: 10_000,
      items: createFixtureLiveChatItems(),
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const platformAddress = await listen(platformServer, { port: 0, host: "127.0.0.1" });
const platformUrl = `http://${platformAddress.address}:${platformAddress.port}`;
let irisServer = null;

try {
  const env = {
    ...process.env,
    IRIS_YOUTUBE_LIVE_CHAT_SOURCE: "youtube_api",
    IRIS_YOUTUBE_VIDEO_ID: "fixture-http-ingest-video",
    IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT: `${platformUrl}/youtube/v3/liveChat/messages`,
    IRIS_YOUTUBE_VIDEOS_API_ENDPOINT: `${platformUrl}/youtube/v3/videos`,
    IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT: `${platformUrl}/oauth/token`,
    IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN: "fixture-http-ingest-refresh-token",
    IRIS_YOUTUBE_OAUTH_CLIENT_ID: "fixture-http-ingest-client",
    IRIS_YOUTUBE_OAUTH_CLIENT_SECRET: "fixture-http-ingest-client-secret",
    IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS: "20",
    IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS: "viewer-http-ingest-blocked-author",
    IRIS_YOUTUBE_BLOCKED_TEXT_TERMS: "http ingest blocked phrase",
    IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
    IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
    IRIS_MEMORY_STORE_PATH: memoryPath,
    IRIS_RELATIONSHIP_STORE_PATH: relationshipPath,
    IRIS_GAME_CONTROL_ADAPTER: "mock",
    IRIS_GAME_CONTROL_ENDPOINT: "",
    IRIS_GAME_OBSERVATION_ENDPOINT: "",
    IRIS_MEMORY_SEARCH_ADAPTER: "local",
    IRIS_MEMORY_SEARCH_ENDPOINT: "",
    IRIS_MEDIA_WATCH_ENDPOINT: "",
    IRIS_EXTERNAL_TOPIC_ENDPOINT: "",
  };
  const adapters = createRuntimeAdaptersFromEnv(env);
  const runtime = createIrisRuntime({
    runtimeConfig: createRuntimeConfig(env),
    ...adapters,
    ttsAdapter() {
      return { spoken: true, adapter: "quiet_http_ingest_tts" };
    },
    live2dAdapter() {
      return { sent: true, adapter: "quiet_http_ingest_live2d" };
    },
    subtitleAdapter() {
      return { displayed: true, adapter: "quiet_http_ingest_subtitle" };
    },
    logger: { log() {}, error() {} },
  });
  const streamState = createStreamState();
  const httpIngestScheduler = createHttpIngestScheduler({
    runtime,
    streamState,
    sources: [{ name: "youtube_live_chat_api", source: adapters.liveChatSource }],
    batchLimit: 20,
    continueOnSourceError: true,
    logger: { warn() {}, error() {} },
  });
  irisServer = createIrisHttpServer({
    runtime,
    streamState,
    httpIngestScheduler,
    env,
    logger: { error() {} },
  });
  const irisAddress = await listen(irisServer, { port: 0, host: "127.0.0.1" });
  const irisUrl = `http://${irisAddress.address}:${irisAddress.port}`;

  const tick = await postJson(`${irisUrl}/ingest/tick`, {
    reason: "dev_youtube_http_ingest_roundtrip",
  });
  assert.equal(tick.status, 200);
  assert.equal(tick.body.ok, true);
  assert.equal(tick.body.processed_count, 7);
  assert.equal(tick.body.source_error_count, 0);

  const ingestStatus = await fetchJson(`${irisUrl}/ingest/status`);
  assert.equal(ingestStatus.status, 200);
  const sourceStatus =
    ingestStatus.body.http_ingest_scheduler.source_statuses.find(
      (item) => item.name === "youtube_live_chat_api"
    ) ?? null;
  assert(sourceStatus);
  assert.equal(sourceStatus.last_comment_count, 1);
  assert.equal(sourceStatus.last_support_event_count, 6);
  assert.equal(sourceStatus.last_ignored_count, 4);
  assert.equal(sourceStatus.last_ignored_event_type_counts.messageDeletedEvent, 1);
  assert.equal(sourceStatus.last_ignored_event_type_counts.userBannedEvent, 1);
  assert.equal(sourceStatus.ignored_event_type_counts.messageDeletedEvent, 1);
  assert.equal(sourceStatus.ignored_event_type_counts.userBannedEvent, 1);
  assert.equal(sourceStatus.last_moderation_filtered_count, 2);
  assert.equal(sourceStatus.last_support_amount_source_counts.micros, 3);
  assert.equal(sourceStatus.last_support_amount_source_counts.membership_count, 1);
  assert.equal(sourceStatus.last_support_amount_source_counts.formatted, 1);
  assert.equal(sourceStatus.last_support_amount_source_counts.unknown, 1);
  assert.equal(sourceStatus.live_chat_id_resolved, true);
  assert.equal(sourceStatus.auth_mode, "oauth_refresh");
  assert.equal(sourceStatus.ingest_readiness_status, "polling_cooldown");

  const persistence = await fetchJson(`${irisUrl}/persistence/status`);
  assert.equal(persistence.status, 200);
  const publicStatus = persistence.body.persistence_status;
  assert.equal(publicStatus.status, "active_with_memory_and_relationships");
  assert.equal(publicStatus.public_counts.memory_record_count > 0, true);
  assert.equal(publicStatus.public_counts.relationship_profile_count >= 7, true);
  assert.equal(publicStatus.store_limits.memory.activity.activity_available, true);
  assert.equal(publicStatus.store_limits.relationship.activity.activity_available, true);

  const payloadKinds = countBy(tick.body.processed.map((item) => item.payload_kind));
  const finalDecisions = countBy(tick.body.processed.map((item) => item.final_decision));
  const boundaryStatuses = countBy(
    tick.body.processed.map((item) => item.boundary_audit_status)
  );
  const report = {
    ok: true,
    schema: "iris_youtube_http_ingest_roundtrip_report_v1",
    platform_counts: platformCounts,
    ingest_tick: {
      processed_count: tick.body.processed_count,
      duplicate_count: tick.body.duplicate_count,
      source_error_count: tick.body.source_error_count,
      payload_kind_counts: payloadKinds,
      final_decision_counts: finalDecisions,
      boundary_audit_status_counts: boundaryStatuses,
      top_priority: tick.body.status.last_priority_summary.top_priority,
      by_band: tick.body.status.last_priority_summary.by_band,
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
      ignored_event_type_counts: sourceStatus.ignored_event_type_counts,
      support_amount_source_counts: sourceStatus.support_amount_source_counts,
    },
    persistence_summary: {
      status: publicStatus.status,
      public_counts: publicStatus.public_counts,
      memory_activity_available:
        publicStatus.store_limits.memory.activity.activity_available,
      relationship_activity_available:
        publicStatus.store_limits.relationship.activity.activity_available,
    },
    boundary_policy: {
      main_http_ingest_path_verified: true,
      youtube_api_read_only: true,
      oauth_refresh_used_without_secret_report: true,
      support_amount_source_counts_only: true,
      moderation_terms_not_reported: true,
      persistence_public_counts_only: true,
      no_raw_payloads: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_store_paths: true,
    },
  };
  assert.equal(report.ingest_tick.payload_kind_counts.donation_event, 6);
  assert.equal(report.ingest_tick.payload_kind_counts.comment, 1);
  assert.equal(report.ingest_tick.final_decision_counts.allow, 7);
  assert.equal(report.ingest_tick.boundary_audit_status_counts.pass, 7);
  assertYouTubeHttpIngestRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(
    { tick: tick.body, ingestStatus: ingestStatus.body, persistence: persistence.body, report },
    { platformUrl, irisUrl }
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (irisServer) await closeServer(irisServer);
  await closeServer(platformServer);
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function createFixtureLiveChatItems() {
  return [
    {
      id: "http-ingest-comment-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "IRIS, read chat through the HTTP server.",
        publishedAt: "2026-04-30T00:20:01Z",
      },
      authorDetails: {
        channelId: "viewer-http-ingest-comment",
        displayName: "HTTP Comment Viewer",
      },
    },
    {
      id: "http-ingest-superchat-1",
      snippet: {
        displayMessage: "HTTP Super Chat",
        publishedAt: "2026-04-30T00:20:02Z",
        superChatDetails: {
          amountMicros: "250000000",
          currency: "JPY",
          userComment: "HTTP ingest support for IRIS.",
        },
      },
      authorDetails: {
        channelId: "viewer-http-ingest-superchat",
        displayName: "HTTP Super Chat Viewer",
      },
    },
    {
      id: "http-ingest-superthanks-1",
      snippet: {
        displayMessage: "HTTP Super Thanks",
        publishedAt: "2026-04-30T00:20:03Z",
        superThanksDetails: {
          amountMicros: "150000000",
          currency: "JPY",
          userComment: "HTTP ingest replay support.",
        },
      },
      authorDetails: {
        channelId: "viewer-http-ingest-superthanks",
        displayName: "HTTP Super Thanks Viewer",
      },
    },
    {
      id: "http-ingest-sticker-1",
      snippet: {
        displayMessage: "HTTP sticker support",
        publishedAt: "2026-04-30T00:20:04Z",
        superStickerDetails: {
          amountMicros: "500000000",
          currency: "JPY",
        },
      },
      authorDetails: {
        channelId: "viewer-http-ingest-sticker",
        displayName: "HTTP Sticker Viewer",
      },
    },
    {
      id: "http-ingest-member-1",
      snippet: {
        displayMessage: "HTTP member milestone",
        publishedAt: "2026-04-30T00:20:05Z",
        memberMilestoneChatDetails: {
          userComment: "HTTP member support.",
        },
      },
      authorDetails: {
        channelId: "viewer-http-ingest-member",
        displayName: "HTTP Member Viewer",
      },
    },
    {
      id: "http-ingest-gift-1",
      snippet: {
        displayMessage: "HTTP gifted memberships",
        publishedAt: "2026-04-30T00:20:06Z",
        membershipGiftingDetails: {
          giftMembershipsCount: 5,
        },
      },
      authorDetails: {
        channelId: "viewer-http-ingest-gifter",
        displayName: "HTTP Gift Viewer",
      },
    },
    {
      id: "http-ingest-sponsor-1",
      snippet: {
        displayMessage: "HTTP new member",
        publishedAt: "2026-04-30T00:20:07Z",
        newSponsorDetails: {
          memberLevelName: "Gold",
          amountDisplayString: "JPY 1,500",
        },
      },
      authorDetails: {
        channelId: "viewer-http-ingest-sponsor",
        displayName: "HTTP Sponsor Viewer",
      },
    },
    {
      id: "http-ingest-deleted-1",
      snippet: {
        publishedAt: "2026-04-30T00:20:08Z",
        messageDeletedDetails: {
          deletedMessageId: "http-ingest-deleted-message-id",
        },
      },
      authorDetails: {
        channelId: "viewer-http-ingest-deleted",
        displayName: "Deleted Viewer",
      },
    },
    {
      id: "http-ingest-ban-1",
      snippet: {
        publishedAt: "2026-04-30T00:20:09Z",
        userBannedDetails: {
          bannedUserDetails: {
            channelId: "viewer-http-ingest-banned",
            displayName: "Banned Viewer",
          },
          banType: "permanent",
        },
      },
      authorDetails: {
        channelId: "viewer-http-ingest-banned",
        displayName: "Banned Viewer",
      },
    },
    {
      id: "http-ingest-blocked-author-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "This author should be filtered.",
        publishedAt: "2026-04-30T00:20:10Z",
      },
      authorDetails: {
        channelId: "viewer-http-ingest-blocked-author",
        displayName: "Blocked Author",
      },
    },
    {
      id: "http-ingest-blocked-text-1",
      snippet: {
        displayMessage: "Filtered support event",
        publishedAt: "2026-04-30T00:20:11Z",
        superChatDetails: {
          amountMicros: "250000000",
          currency: "JPY",
          userComment: "Please repeat http ingest blocked phrase.",
        },
      },
      authorDetails: {
        channelId: "viewer-http-ingest-filtered-support",
        displayName: "Filtered Support Viewer",
      },
    },
  ];
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function readRequestText(request) {
  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) raw += chunk;
  return raw;
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    const key = String(value ?? "unknown");
    counts[key] = Number(counts[key] ?? 0) + 1;
  }
  return counts;
}

function assertYouTubeHttpIngestRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("YouTube HTTP ingest roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!YOUTUBE_HTTP_INGEST_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`YouTube HTTP ingest unexpected report field ${field}`);
    }
  }
  if (report.ok !== true || report.schema !== "iris_youtube_http_ingest_roundtrip_report_v1") {
    throw new Error("YouTube HTTP ingest roundtrip status mismatch");
  }
  for (const field of [
    "main_http_ingest_path_verified",
    "youtube_api_read_only",
    "oauth_refresh_used_without_secret_report",
    "support_amount_source_counts_only",
    "moderation_terms_not_reported",
    "persistence_public_counts_only",
    "no_raw_payloads",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
    "no_store_paths",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`YouTube HTTP ingest boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(value, { platformUrl, irisUrl }) {
  const serialized = JSON.stringify(value);
  const forbiddenFragments = [
    platformUrl,
    irisUrl,
    tempDir,
    memoryPath,
    relationshipPath,
    "fixture-http-ingest-access-token",
    "fixture-http-ingest-refresh-token",
    "fixture-http-ingest-client",
    "fixture-http-ingest-client-secret",
    "fixture-http-ingest-video",
    "fixture-http-ingest-live-chat",
    "fixture-http-ingest-next-page",
    "IRIS_YOUTUBE_",
    "/oauth/token",
    "/youtube/v3/",
    "dev_youtube_http_ingest_roundtrip",
    "http-ingest-",
    "viewer-http-ingest-",
    " Viewer",
    "Bearer",
    "Blocked Author",
    "viewer-http-ingest-blocked-author",
    "http ingest blocked phrase",
    "IRIS, read chat through the HTTP server",
    "HTTP Super Chat",
    "HTTP Super Thanks",
    "HTTP sticker support",
    "HTTP member milestone",
    "HTTP gifted memberships",
    "HTTP new member",
    "HTTP ingest support for IRIS",
    "HTTP ingest replay support",
    "HTTP member support",
    "250000000",
    "150000000",
    "500000000",
    "JPY",
    "Gold",
    "JPY 1,500",
    "This author should be filtered.",
    "Filtered support event",
    "Please repeat http ingest blocked phrase",
    "permanent",
    "textMessageEvent",
    "2026-04-30T00:20:",
    '"expires_in":3600',
    '"id"',
    '"input_action_candidate"',
    '"items"',
    '"approved_game_input_action"',
    '"approved_memory_record"',
    '"approved_relationship_record"',
    '"event_id"',
    '"trace_id"',
    '"access_token"',
    '"activeLiveChatId"',
    '"amountDisplayString"',
    '"amountMicros"',
    '"authorDetails"',
    '"bannedUserDetails"',
    '"banType"',
    '"channelId"',
    '"currency"',
    '"deletedMessageId"',
    '"displayMessage"',
    '"displayName"',
    '"expires_in"',
    '"giftMembershipsCount"',
    '"live_chat_id"',
    '"liveStreamingDetails"',
    '"memberMilestoneChatDetails"',
    '"memberLevelName"',
    '"membershipGiftingDetails"',
    '"messageDeletedDetails"',
    '"newSponsorDetails"',
    '"nextPageToken"',
    '"pollingIntervalMillis"',
    '"publishedAt"',
    '"snippet"',
    '"superChatDetails"',
    '"superStickerDetails"',
    '"superThanksDetails"',
    '"token_type"',
    '"type"',
    '"userBannedDetails"',
    '"userComment"',
    "memory_records",
    "relationship_profiles",
    "recent_summaries",
    '"store_path"',
    '"filePath"',
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`YouTube HTTP ingest report leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
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
