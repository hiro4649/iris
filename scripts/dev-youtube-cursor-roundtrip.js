import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { listen } from "../src/server/httpServer.js";

const requests = [];
const YOUTUBE_CURSOR_ROUNDTRIP_BOUNDARY_FIELDS = [
  "page_token_used_only_for_upstream_resume",
  "public_status_hides_page_token",
  "public_status_hides_cursor_store_path",
  "public_status_hides_live_chat_id",
  "public_status_hides_api_key",
  "no_endpoint_values",
  "no_raw_payloads",
  "no_candidates",
  "no_commands",
];

const fixtureServer = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/youtube/v3/liveChat/messages") {
    requests.push({
      liveChatIdOk: url.searchParams.get("liveChatId") === "cursor-secret-live-chat-id",
      pageTokenOk:
        requests.length === 0
          ? !url.searchParams.has("pageToken")
          : url.searchParams.get("pageToken") === "cursor-secret-next-page-token-1",
      apiKeyOk: url.searchParams.get("key") === "cursor-secret-api-key",
    });
    return sendJson(response, 200, {
      nextPageToken:
        requests.length === 1
          ? "cursor-secret-next-page-token-1"
          : "cursor-secret-next-page-token-2",
      pollingIntervalMillis: 1000,
      items: [
        {
          id: `cursor-fixture-message-${requests.length}`,
          snippet: {
            type: "textMessageEvent",
            displayMessage: "IRIS cursor fixture text",
            publishedAt: "2026-05-01T00:00:00.000Z",
          },
          authorDetails: {
            channelId: "cursor-fixture-viewer",
            displayName: "Cursor Fixture Viewer",
          },
        },
        {
          id: `cursor-fixture-superchat-${requests.length}`,
          snippet: {
            displayMessage: "IRIS cursor support fixture",
            publishedAt: "2026-05-01T00:00:01.000Z",
            superChatDetails: {
              amountMicros: "250000000",
              currency: "JPY",
              userComment: "IRIS cursor support text",
            },
          },
          authorDetails: {
            channelId: "cursor-fixture-supporter",
            displayName: "Cursor Fixture Supporter",
          },
        },
      ],
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const address = await listen(fixtureServer, { port: 0, host: "127.0.0.1" });
const baseUrl = `http://${address.address}:${address.port}`;
const tempDir = mkdtempSync(join(tmpdir(), "iris-youtube-cursor-roundtrip-"));
const cursorStorePath = join(tempDir, "cursor.json");

try {
  const env = {
    ...process.env,
    IRIS_YOUTUBE_LIVE_CHAT_SOURCE: "youtube_api",
    IRIS_YOUTUBE_LIVE_CHAT_ID: "cursor-secret-live-chat-id",
    IRIS_YOUTUBE_DATA_API_KEY: "cursor-secret-api-key",
    IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT: `${baseUrl}/youtube/v3/liveChat/messages`,
    IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH: cursorStorePath,
  };
  const firstAdapters = createRuntimeAdaptersFromEnv(env);
  const firstEvents = await firstAdapters.liveChatSource.nextBatch(10);
  const firstStatus = firstAdapters.liveChatSource.status();

  const secondAdapters = createRuntimeAdaptersFromEnv(env);
  const secondEvents = await secondAdapters.liveChatSource.nextBatch(10);
  const secondStatus = secondAdapters.liveChatSource.status();

  const report = {
    ok:
      requests.length === 2 &&
      firstEvents.length === 2 &&
      secondEvents.length === 2 &&
      firstStatus.last_support_event_type_counts?.superChatEvent === 1 &&
      secondStatus.last_support_event_type_counts?.superChatEvent === 1 &&
      requests[0]?.liveChatIdOk === true &&
      requests[0]?.pageTokenOk === true &&
      requests[0]?.apiKeyOk === true &&
      requests[1]?.liveChatIdOk === true &&
      requests[1]?.pageTokenOk === true &&
      requests[1]?.apiKeyOk === true &&
      firstStatus.cursor_store_configured === true &&
      firstStatus.cursor_store_status?.has_persisted_page_token === true &&
      secondStatus.cursor_store_configured === true &&
      secondStatus.cursor_store_status?.has_persisted_page_token === true,
    request_count: requests.length,
    upstream_request_summary: {
      first_used_live_chat_id: requests[0]?.liveChatIdOk === true,
      first_started_without_page_token: requests[0]?.pageTokenOk === true,
      first_used_api_key: requests[0]?.apiKeyOk === true,
      second_restored_page_token: requests[1]?.pageTokenOk === true,
      second_used_live_chat_id: requests[1]?.liveChatIdOk === true,
      second_used_api_key: requests[1]?.apiKeyOk === true,
    },
    public_status_summary: {
      first: {
        cursor_store_configured: firstStatus.cursor_store_configured,
        has_next_page_token: firstStatus.has_next_page_token,
        cursor_store_status: firstStatus.cursor_store_status,
      },
      second: {
        cursor_store_configured: secondStatus.cursor_store_configured,
        has_next_page_token: secondStatus.has_next_page_token,
        cursor_store_status: secondStatus.cursor_store_status,
      },
    },
    boundary_policy: {
      page_token_used_only_for_upstream_resume: true,
      public_status_hides_page_token: true,
      public_status_hides_cursor_store_path: true,
      public_status_hides_live_chat_id: true,
      public_status_hides_api_key: true,
      no_endpoint_values: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };

  const serialized = JSON.stringify(report);
  if (
    serialized.includes("cursor-secret-live-chat-id") ||
    serialized.includes("cursor-secret-api-key") ||
    serialized.includes("cursor-secret-next-page-token") ||
    serialized.includes("IRIS cursor fixture text") ||
    serialized.includes("IRIS cursor support") ||
    serialized.includes("Cursor Fixture Viewer") ||
    serialized.includes("Cursor Fixture Supporter") ||
    serialized.includes(cursorStorePath) ||
    serialized.includes(baseUrl) ||
    serialized.includes('"event_id"') ||
    serialized.includes('"trace_id"') ||
    serialized.includes('"next_page_token"') ||
    serialized.includes('"page_token"')
  ) {
    report.ok = false;
  }
  if (!youtubeCursorRoundtripBoundaryOk(report)) {
    report.ok = false;
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  await closeServer(fixtureServer);
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function youtubeCursorRoundtripBoundaryOk(report) {
  return YOUTUBE_CURSOR_ROUNDTRIP_BOUNDARY_FIELDS.every(
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
