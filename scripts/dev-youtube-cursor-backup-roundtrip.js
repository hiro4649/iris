import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { listen } from "../src/server/httpServer.js";

const requests = [];
const YOUTUBE_CURSOR_BACKUP_ROUNDTRIP_BOUNDARY_FIELDS = [
  "page_token_used_only_for_upstream_resume",
  "corrupt_primary_recovered_from_backup",
  "public_status_hides_page_token",
  "public_status_hides_cursor_store_path",
  "public_status_hides_cursor_backup_path",
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
      liveChatIdOk: url.searchParams.get("liveChatId") === "cursor-backup-secret-live-chat-id",
      pageTokenOk:
        requests.length === 0
          ? !url.searchParams.has("pageToken")
          : url.searchParams.get("pageToken") === "cursor-backup-secret-next-page-token-1",
      apiKeyOk: url.searchParams.get("key") === "cursor-backup-secret-api-key",
    });
    return sendJson(response, 200, {
      nextPageToken:
        requests.length === 1
          ? "cursor-backup-secret-next-page-token-1"
          : "cursor-backup-secret-next-page-token-2",
      pollingIntervalMillis: 1000,
      items: [
        {
          id: `cursor-backup-fixture-message-${requests.length}`,
          snippet: {
            type: "textMessageEvent",
            displayMessage: "IRIS cursor backup fixture text",
            publishedAt: "2026-05-01T00:00:00.000Z",
          },
          authorDetails: {
            channelId: "cursor-backup-fixture-viewer",
            displayName: "Cursor Backup Fixture Viewer",
          },
        },
        {
          id: `cursor-backup-fixture-deleted-${requests.length}`,
          snippet: {
            messageDeletedDetails: {
              deletedMessageId: "cursor-backup-deleted-message-id",
            },
          },
          authorDetails: {
            channelId: "cursor-backup-fixture-moderator",
            displayName: "Cursor Backup Fixture Moderator",
          },
        },
      ],
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const address = await listen(fixtureServer, { port: 0, host: "127.0.0.1" });
const baseUrl = `http://${address.address}:${address.port}`;
const tempDir = mkdtempSync(join(tmpdir(), "iris-youtube-cursor-backup-roundtrip-"));
const cursorStorePath = join(tempDir, "cursor.json");
const cursorBackupPath = `${cursorStorePath}.bak`;

try {
  const env = {
    ...process.env,
    IRIS_YOUTUBE_LIVE_CHAT_SOURCE: "youtube_api",
    IRIS_YOUTUBE_LIVE_CHAT_ID: "cursor-backup-secret-live-chat-id",
    IRIS_YOUTUBE_DATA_API_KEY: "cursor-backup-secret-api-key",
    IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT: `${baseUrl}/youtube/v3/liveChat/messages`,
    IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH: cursorStorePath,
  };
  const firstAdapters = createRuntimeAdaptersFromEnv(env);
  const firstEvents = await firstAdapters.liveChatSource.nextBatch(10);
  const firstStatus = firstAdapters.liveChatSource.status();

  writeFileSync(cursorStorePath, "{ broken cursor json", "utf8");

  const secondAdapters = createRuntimeAdaptersFromEnv(env);
  const secondEvents = await secondAdapters.liveChatSource.nextBatch(10);
  const secondStatus = secondAdapters.liveChatSource.status();
  const repairedCursor = JSON.parse(readFileSync(cursorStorePath, "utf8"));

  const report = {
    ok:
      requests.length === 2 &&
      firstEvents.length === 1 &&
      secondEvents.length === 1 &&
      firstStatus.last_item_count === 2 &&
      firstStatus.last_ignored_event_type_counts?.messageDeletedEvent === 1 &&
      secondStatus.last_item_count === 2 &&
      secondStatus.last_ignored_event_type_counts?.messageDeletedEvent === 1 &&
      requests[0]?.liveChatIdOk === true &&
      requests[0]?.pageTokenOk === true &&
      requests[0]?.apiKeyOk === true &&
      requests[1]?.liveChatIdOk === true &&
      requests[1]?.pageTokenOk === true &&
      requests[1]?.apiKeyOk === true &&
      existsSync(cursorBackupPath) &&
      repairedCursor.schema === "iris_youtube_live_chat_cursor_store_v1" &&
      firstStatus.cursor_store_status?.durability?.backup_available === true &&
      secondStatus.cursor_store_status?.durability?.recovered_from_backup === true &&
      secondStatus.cursor_store_status?.error_kind === "store_parse_failed",
    request_count: requests.length,
    upstream_request_summary: {
      first_started_without_page_token: requests[0]?.pageTokenOk === true,
      second_restored_page_token_from_backup: requests[1]?.pageTokenOk === true,
      second_used_live_chat_id: requests[1]?.liveChatIdOk === true,
      second_used_api_key: requests[1]?.apiKeyOk === true,
    },
    public_status_summary: {
      first: {
        cursor_store_configured: firstStatus.cursor_store_configured,
        cursor_store_health: firstStatus.cursor_store_status?.health,
        durability: firstStatus.cursor_store_status?.durability,
      },
      second: {
        cursor_store_configured: secondStatus.cursor_store_configured,
        cursor_store_health: secondStatus.cursor_store_status?.health,
        read_error: secondStatus.cursor_store_status?.read_error,
        error_kind: secondStatus.cursor_store_status?.error_kind,
        durability: secondStatus.cursor_store_status?.durability,
      },
    },
    boundary_policy: {
      page_token_used_only_for_upstream_resume: true,
      corrupt_primary_recovered_from_backup: true,
      public_status_hides_page_token: true,
      public_status_hides_cursor_store_path: true,
      public_status_hides_cursor_backup_path: true,
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
    serialized.includes("cursor-backup-secret-live-chat-id") ||
    serialized.includes("cursor-backup-secret-api-key") ||
    serialized.includes("cursor-backup-secret-next-page-token") ||
    serialized.includes("IRIS cursor backup fixture text") ||
    serialized.includes("Cursor Backup Fixture Viewer") ||
    serialized.includes("cursor-backup-deleted-message-id") ||
    serialized.includes("Cursor Backup Fixture Moderator") ||
    serialized.includes(cursorStorePath) ||
    serialized.includes(cursorBackupPath) ||
    serialized.includes(baseUrl) ||
    serialized.includes('"event_id"') ||
    serialized.includes('"trace_id"') ||
    serialized.includes('"next_page_token"') ||
    serialized.includes('"page_token"')
  ) {
    report.ok = false;
  }
  if (!youtubeCursorBackupRoundtripBoundaryOk(report)) {
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

function youtubeCursorBackupRoundtripBoundaryOk(report) {
  return YOUTUBE_CURSOR_BACKUP_ROUNDTRIP_BOUNDARY_FIELDS.every(
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
