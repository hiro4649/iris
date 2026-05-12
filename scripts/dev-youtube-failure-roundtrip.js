import { createServer } from "node:http";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createHttpIngestScheduler } from "../src/runtime/httpIngestScheduler.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createStreamState } from "../src/runtime/streamState.js";
import { listen } from "../src/server/httpServer.js";

let oauthRefreshCount = 0;
let videoDiscoveryCount = 0;
let liveChatPollCount = 0;
const YOUTUBE_FAILURE_ROUNDTRIP_BOUNDARY_FIELDS = [
  "youtube_api_failure_summary_only",
  "scheduler_continues_on_source_error",
  "no_raw_response_body",
  "no_live_chat_ids",
  "no_page_tokens",
  "no_endpoint_or_secret_values",
  "no_candidates",
  "no_commands",
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
    return sendJson(response, 403, {
      error: {
        code: 403,
        message: "unsafe live chat response body must not appear",
        errors: [
          {
            domain: "youtube.liveChat",
            reason: "liveChatEnded",
            message: "unsafe live chat nested response body must not appear",
          },
        ],
      },
      input_action_candidate: { execute: "press_w" },
      token: "unsafe-youtube-token",
      nextPageToken: "unsafe-page-token",
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const address = await listen(fixtureServer, { port: 0, host: "127.0.0.1" });
const baseUrl = `http://${address.address}:${address.port}`;

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
  const scheduler = createHttpIngestScheduler({
    runtime,
    streamState: createStreamState(),
    sources: [{ name: "youtube_live_chat_api", source: adapters.liveChatSource }],
    continueOnSourceError: true,
    logger: { warn() {}, error() {} },
  });
  const tick = await scheduler.tickNow("youtube_api_failure_fixture");
  const status = scheduler.status();
  const report = {
    ok:
      tick.ok === false &&
      tick.processed_count === 0 &&
      tick.source_error_count === 1 &&
      oauthRefreshCount === 1 &&
      videoDiscoveryCount === 1 &&
      liveChatPollCount === 1 &&
      tick.source_errors?.[0]?.error_kind === "live_chat_ended" &&
      tick.source_errors?.[0]?.retryable === false &&
      tick.source_errors?.[0]?.operator_action_required === true &&
      status.source_statuses?.[0]?.last_error_retryable === false &&
      status.source_statuses?.[0]?.last_error_operator_action_required === true &&
      status.source_statuses?.[0]?.last_error_recovery_hint_available === true &&
      status.source_statuses?.[0]?.ingest_readiness_status === "operator_action_required" &&
      status.source_statuses?.[0]?.live_chat_id_resolved === true,
    fixture_counts: {
      oauth_refresh_count: oauthRefreshCount,
      video_discovery_count: videoDiscoveryCount,
      live_chat_poll_count: liveChatPollCount,
    },
    tick_summary: {
      ok: tick.ok,
      processed_count: tick.processed_count,
      source_error_count: tick.source_error_count,
      source_errors: tick.source_errors,
    },
    source_status_summary: status.source_statuses?.[0] ?? null,
    boundary_policy: {
      youtube_api_failure_summary_only: true,
      scheduler_continues_on_source_error: true,
      no_raw_response_body: true,
      no_live_chat_ids: true,
      no_page_tokens: true,
      no_endpoint_or_secret_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  const serialized = JSON.stringify(report);
  if (
    serialized.includes("unsafe live chat response body") ||
    serialized.includes("unsafe live chat nested response body") ||
    serialized.includes("unsafe-youtube-token") ||
    serialized.includes("unsafe-page-token") ||
    serialized.includes("fixture-refresh-token") ||
    serialized.includes("fixture-client-secret") ||
    serialized.includes("fixture-live-chat-id") ||
    serialized.includes(baseUrl) ||
    serialized.includes('"event_id"') ||
    serialized.includes('"trace_id"') ||
    serialized.includes('"input_action_candidate"') ||
    serialized.includes("press_w")
  ) {
    report.ok = false;
  }
  if (!youtubeFailureRoundtripBoundaryOk(report)) {
    report.ok = false;
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  await closeServer(fixtureServer);
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

function youtubeFailureRoundtripBoundaryOk(report) {
  return YOUTUBE_FAILURE_ROUNDTRIP_BOUNDARY_FIELDS.every(
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
