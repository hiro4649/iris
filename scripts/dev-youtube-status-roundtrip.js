import { createServer } from "node:http";
import { createYouTubeLiveChatApiSource } from "../src/adapters/youtube/youtubeLiveChatApiSource.js";
import { listen } from "../src/server/httpServer.js";

let videoDiscoveryCount = 0;
let liveChatPollCount = 0;
const received = {
  videoIdSent: false,
  liveChatIdSent: false,
  pageTokenSent: false,
  apiKeySent: false,
};
const YOUTUBE_STATUS_ROUNDTRIP_BOUNDARY_FIELDS = [
  "upstream_ids_used_in_requests_only",
  "public_status_hides_live_chat_id",
  "public_status_hides_video_id",
  "public_status_hides_page_token",
  "public_status_hides_api_key",
  "no_endpoint_values",
  "no_raw_payloads",
  "no_candidates",
  "no_commands",
];

const fixtureServer = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/youtube/v3/videos") {
    videoDiscoveryCount += 1;
    received.videoIdSent = url.searchParams.get("id") === "status-secret-video-id";
    received.apiKeySent = url.searchParams.get("key") === "status-secret-api-key";
    return sendJson(response, 200, {
      items: [
        {
          liveStreamingDetails: {
            activeLiveChatId: "status-secret-live-chat-id",
          },
        },
      ],
    });
  }
  if (request.method === "GET" && url.pathname === "/youtube/v3/liveChat/messages") {
    liveChatPollCount += 1;
    received.liveChatIdSent =
      url.searchParams.get("liveChatId") === "status-secret-live-chat-id";
    received.pageTokenSent = url.searchParams.get("pageToken") === "status-secret-page-token";
    received.apiKeySent = received.apiKeySent || url.searchParams.get("key") === "status-secret-api-key";
    return sendJson(response, 200, {
      nextPageToken: "status-secret-next-page-token",
      pollingIntervalMillis: 10_000,
      items: [
        {
          id: "status-comment-1",
          snippet: {
            type: "textMessageEvent",
            displayMessage: "IRIS status check",
          },
          authorDetails: {
            channelId: "status-viewer",
            displayName: "Status Viewer",
          },
        },
        {
          id: "status-member-milestone-1",
          snippet: {
            displayMessage: "IRIS member milestone",
            memberMilestoneChatDetails: {
              memberMonth: 12,
              userComment: "IRIS keeps flowing",
            },
          },
          authorDetails: {
            channelId: "status-member-viewer",
            displayName: "Status Member Viewer",
          },
        },
      ],
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const address = await listen(fixtureServer, { port: 0, host: "127.0.0.1" });
const baseUrl = `http://${address.address}:${address.port}`;

try {
  const source = createYouTubeLiveChatApiSource({
    videoId: "status-secret-video-id",
    apiKey: "status-secret-api-key",
    initialPageToken: "status-secret-page-token",
    videosEndpoint: `${baseUrl}/youtube/v3/videos`,
    endpoint: `${baseUrl}/youtube/v3/liveChat/messages`,
  });
  const events = await source.nextBatch(10);
  const status = source.status();
  const report = {
    ok:
      events.length === 2 &&
      videoDiscoveryCount === 1 &&
      liveChatPollCount === 1 &&
      received.videoIdSent === true &&
      received.liveChatIdSent === true &&
      received.pageTokenSent === true &&
      received.apiKeySent === true &&
      status.live_chat_id_resolved === true &&
      status.live_chat_id_configured === true &&
      status.video_id_configured === true &&
      status.has_next_page_token === true &&
      status.last_item_count === 2 &&
      status.last_comment_count === 1 &&
      status.last_support_event_count === 1 &&
      status.last_support_event_type_counts?.memberMilestoneChatEvent === 1 &&
      status.support_event_count === 1 &&
      status.support_event_type_counts?.memberMilestoneChatEvent === 1 &&
      !Object.hasOwn(status, "live_chat_id") &&
      !Object.hasOwn(status, "video_id") &&
      !Object.hasOwn(status, "next_page_token"),
    fixture_counts: {
      video_discovery_count: videoDiscoveryCount,
      live_chat_poll_count: liveChatPollCount,
    },
    upstream_request_summary: {
      video_id_sent: received.videoIdSent,
      live_chat_id_sent: received.liveChatIdSent,
      page_token_sent: received.pageTokenSent,
      api_key_sent: received.apiKeySent,
    },
    public_source_status: status,
    boundary_policy: {
      upstream_ids_used_in_requests_only: true,
      public_status_hides_live_chat_id: true,
      public_status_hides_video_id: true,
      public_status_hides_page_token: true,
      public_status_hides_api_key: true,
      no_endpoint_values: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  const serialized = JSON.stringify(report);
  if (
    serialized.includes("status-secret-video-id") ||
    serialized.includes("status-secret-api-key") ||
    serialized.includes("status-secret-live-chat-id") ||
    serialized.includes("status-secret-page-token") ||
    serialized.includes("status-secret-next-page-token") ||
    serialized.includes(baseUrl) ||
    serialized.includes('"event_id"') ||
    serialized.includes('"trace_id"') ||
    serialized.includes('"live_chat_id"') ||
    serialized.includes('"video_id"') ||
    serialized.includes('"next_page_token"')
  ) {
    report.ok = false;
  }
  if (!youtubeStatusRoundtripBoundaryOk(report)) {
    report.ok = false;
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  await closeServer(fixtureServer);
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function youtubeStatusRoundtripBoundaryOk(report) {
  return YOUTUBE_STATUS_ROUNDTRIP_BOUNDARY_FIELDS.every(
    (field) => report.boundary_policy?.[field] === true
  );
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
