import { createServer } from "node:http";
import { createHttpLiveChatSource } from "../src/adapters/youtube/httpLiveChatSource.js";
import { listen } from "../src/server/httpServer.js";

const YOUTUBE_RELAY_STATUS_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "fixture_counts",
  "event_summary",
  "public_source_status",
  "boundary_policy",
]);

let relayPollCount = 0;
const relayServer = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/relay/live-chat") {
    relayPollCount += 1;
    return sendJson(response, 200, {
      items: [
        {
          id: "relay-status-comment-1",
          snippet: {
            type: "textMessageEvent",
            displayMessage: "IRIS, relay status should hide this text.",
            publishedAt: "2026-04-30T02:00:01Z",
          },
          authorDetails: {
            channelId: "relay-status-commenter",
            displayName: "Relay Status Commenter",
          },
        },
        {
          id: "relay-status-support-1",
          snippet: {
            displayMessage: "Relay status support message",
            publishedAt: "2026-04-30T02:00:02Z",
            superChatDetails: {
              amountMicros: "2000000000",
              currency: "JPY",
              userComment: "IRIS, support text must not enter status.",
            },
          },
          authorDetails: {
            channelId: "relay-status-supporter",
            displayName: "Relay Status Supporter",
          },
        },
        {
          id: "relay-status-superthanks-1",
          snippet: {
            displayMessage: "Relay status Super Thanks message",
            publishedAt: "2026-04-30T02:00:02.500Z",
            superThanksDetails: {
              amountMicros: "300000000",
              currency: "JPY",
              userComment: "IRIS, Super Thanks text must not enter status.",
            },
          },
          authorDetails: {
            channelId: "relay-status-superthanks",
            displayName: "Relay Status Super Thanks",
          },
        },
        {
          id: "relay-status-deleted-1",
          snippet: {
            publishedAt: "2026-04-30T02:00:03Z",
            messageDeletedDetails: {
              deletedMessageId: "relay-status-deleted-message-id",
            },
          },
        },
      ],
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const address = await listen(relayServer, { port: 0, host: "127.0.0.1" });
const relayUrl = `http://${address.address}:${address.port}`;

try {
  const source = createHttpLiveChatSource({
    endpoint: `${relayUrl}/relay/live-chat`,
    apiKey: "relay-status-secret-key",
  });
  const events = await source.nextBatch(10);
  const status = source.status();
  if (status.last_error !== null || status.last_error_at_ms !== null) {
    throw new Error("relay status roundtrip expected a clean source status");
  }
  if (status.last_duplicate_count !== 0 || status.duplicate_item_count !== 0) {
    throw new Error("relay status roundtrip expected no duplicate relay items");
  }
  if (
    status.last_ignored_event_type_counts?.messageDeletedEvent !== 1 ||
    status.ignored_event_type_counts?.messageDeletedEvent !== 1 ||
    status.last_ignored_event_type_counts?.userBannedEvent !== 0
  ) {
    throw new Error("relay status roundtrip expected fixed moderation-only ignored type counts");
  }
  if (
    status.last_support_event_type_counts?.superChatEvent !== 1 ||
    status.support_event_type_counts?.superChatEvent !== 1
  ) {
    throw new Error("relay status roundtrip expected details-only Super Chat support counts");
  }
  assertNoUnsafeStatusLeak(status);
  const report = {
    ok: true,
    fixture_counts: {
      relay_poll_count: relayPollCount,
    },
    event_summary: {
      event_count: events.length,
      comment_count: events.filter((event) => event.source === "youtube_live_chat").length,
      support_event_count: events.filter(
        (event) => event.payload?.payload_kind === "donation_event"
      ).length,
      super_thanks_count: events.filter(
        (event) => event.payload?.support_event_type === "superThanksEvent"
      ).length,
    },
    public_source_status: status,
    boundary_policy: {
      http_relay_status_counts_only: true,
      public_status_hides_endpoint: true,
      public_status_hides_api_key: true,
      public_status_hides_text: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertYouTubeRelayStatusRoundtripReportSafe(report);
  assertNoUnsafeStatusLeak(report);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await closeServer(relayServer);
}

function assertYouTubeRelayStatusRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("relay status roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!YOUTUBE_RELAY_STATUS_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`relay status unexpected report field ${field}`);
    }
  }
  if (report.ok !== true || report.fixture_counts?.relay_poll_count !== 1) {
    throw new Error("relay status roundtrip status mismatch");
  }
  for (const field of [
    "http_relay_status_counts_only",
    "public_status_hides_endpoint",
    "public_status_hides_api_key",
    "public_status_hides_text",
    "no_raw_payloads",
    "no_candidates",
    "no_commands",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`relay status boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeStatusLeak(status) {
  const serialized = JSON.stringify(status);
  const forbiddenFragments = [
    relayUrl,
    "relay-status-secret-key",
    "relay status should hide this text",
    "support text must not enter status",
    "Super Thanks text must not enter status",
    "Relay Status Commenter",
    "Relay Status Supporter",
    "Relay Status Super Thanks",
    '"endpoint"',
    '"url"',
    '"api_key"',
    '"token"',
    '"secret"',
    '"text"',
    '"event_id"',
    '"trace_id"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"seen_event_ids"',
    '"seen_item_ids"',
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`relay status leaked unsafe fragment(s): ${leaked.join(", ")}`);
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
