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
import { listen } from "../src/server/httpServer.js";

const YOUTUBE_RELAY_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "fixture_counts",
  "source_status_summary",
  "ingest_summary",
  "public_persistence_counts",
  "boundary_policy",
]);

let relayPollCount = 0;
let relayQueryKey = "";

const relayServer = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/relay/live-chat") {
    relayPollCount += 1;
    relayQueryKey = url.searchParams.get("key") || "";
    return sendJson(response, 200, {
      items: createRelayItems(),
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const address = await listen(relayServer, { port: 0, host: "127.0.0.1" });
const relayUrl = `http://${address.address}:${address.port}`;
const persistenceDir = mkdtempSync(join(tmpdir(), "iris-youtube-relay-roundtrip-"));

try {
  const env = {
    ...process.env,
    IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT: `${relayUrl}/relay/live-chat`,
    IRIS_YOUTUBE_LIVE_CHAT_API_KEY: "relay-roundtrip-key",
    IRIS_YOUTUBE_RELAY_UPSTREAM_AUTH_MODE: "query_key",
    IRIS_YOUTUBE_RELAY_UPSTREAM_API_KEY: "relay-roundtrip-key",
    IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS: "relay-viewer-blocked-filter",
    IRIS_YOUTUBE_BLOCKED_TEXT_TERMS: "relay filtered fixture phrase",
    IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
    IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
    IRIS_MEMORY_STORE_PATH: join(persistenceDir, "memory.json"),
    IRIS_RELATIONSHIP_STORE_PATH: join(persistenceDir, "relationships.json"),
    IRIS_GAME_CONTROL_ADAPTER: "mock",
    IRIS_GAME_CONTROL_ENDPOINT: "",
    IRIS_GAME_OBSERVATION_ENDPOINT: "",
    IRIS_MEMORY_SEARCH_ADAPTER: "local",
    IRIS_MEMORY_SEARCH_ENDPOINT: "",
    IRIS_MEDIA_WATCH_ENDPOINT: "",
    IRIS_EXTERNAL_TOPIC_ENDPOINT: "",
  };
  const adapters = createRuntimeAdaptersFromEnv(env);
  const streamState = createStreamState();
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
    streamState,
    sources: [{ name: "youtube_http_relay", source: adapters.liveChatSource }],
    batchLimit: 20,
    logger: { error() {} },
  });
  const tick = await scheduler.tickNow("youtube_relay_roundtrip_tick");
  const sourceStatus = adapters.liveChatSource.status();
  const memoryRecords = runtime.memoryRecords(100);
  const relationshipProfiles = runtime.relationshipProfiles();

  assert.equal(tick.ok, true);
  assert.equal(tick.processed_count, 6);
  assert.equal(tick.duplicate_count, 0);
  assert.equal(relayPollCount, 1);
  assert.equal(relayQueryKey, "relay-roundtrip-key");
  assert.equal(sourceStatus.auth_mode, "query_key");
  assert.equal(sourceStatus.local_endpoint_policy, "loopback_or_private_network_only");
  assert.equal(sourceStatus.local_endpoint_policy_status, "all_allowed");
  assert.equal(sourceStatus.bridge_endpoint_scope, "loopback");
  assert.equal(sourceStatus.bridge_endpoint_locality_ok, true);
  assert.equal(sourceStatus.last_item_count, 9);
  assert.equal(sourceStatus.last_comment_count, 1);
  assert.equal(sourceStatus.last_support_event_count, 5);
  assert.equal(sourceStatus.last_ignored_count, 3);
  assert.equal(sourceStatus.last_moderation_filtered_count, 2);
  assert.equal(sourceStatus.last_support_event_type_counts.superChatEvent, 1);
  assert.equal(sourceStatus.last_support_event_type_counts.superThanksEvent, 1);
  assert.equal(sourceStatus.last_support_event_type_counts.superStickerEvent, 1);
  assert.equal(
    sourceStatus.last_support_event_type_counts.giftMembershipReceivedEvent,
    1
  );
  assert.equal(sourceStatus.last_support_event_type_counts.normalizedSupportEvent, 1);
  assert.equal(sourceStatus.last_ignored_event_type_counts.messageDeletedEvent, 1);
  assert.equal(sourceStatus.last_support_amount_source_counts.micros, 3);
  assert.equal(sourceStatus.last_support_amount_source_counts.formatted, 1);
  assert.equal(sourceStatus.last_support_amount_source_counts.membership_count, 1);
  assert.equal(memoryRecords.length >= 11, true);
  assert.equal(relationshipProfiles.length >= 6, true);

  const payloadKindCounts = countBy(tick.processed.map((item) => item.payload_kind));
  const finalDecisionCounts = countBy(tick.processed.map((item) => item.final_decision));
  const boundaryAuditCounts = countBy(
    tick.processed.map((item) => item.boundary_audit_status)
  );
  assert.equal(payloadKindCounts.donation_event, 5);
  assert.equal(payloadKindCounts.comment, 1);
  assert.equal(finalDecisionCounts.allow, 6);
  assert.equal(boundaryAuditCounts.pass, 6);

  const report = {
        ok: tick.ok === true,
        schema: "iris_youtube_relay_roundtrip_report_v1",
        fixture_counts: {
          relay_poll_count: relayPollCount,
        },
        source_status_summary: {
          source_kind: sourceStatus.source_kind,
          auth_mode: sourceStatus.auth_mode,
          local_endpoint_policy: sourceStatus.local_endpoint_policy,
          local_endpoint_policy_status: sourceStatus.local_endpoint_policy_status,
          bridge_endpoint_scope: sourceStatus.bridge_endpoint_scope,
          bridge_endpoint_locality_ok: sourceStatus.bridge_endpoint_locality_ok,
          request_count: sourceStatus.request_count,
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
          comment_event_count: sourceStatus.comment_event_count,
          support_event_count: sourceStatus.support_event_count,
          support_event_type_counts: sourceStatus.support_event_type_counts,
          support_amount_source_counts: sourceStatus.support_amount_source_counts,
        },
        ingest_summary: {
          processed_count: tick.processed_count,
          duplicate_count: tick.duplicate_count,
          top_priority: tick.status.last_priority_summary.top_priority,
          by_band: tick.status.last_priority_summary.by_band,
          processed: tick.processed.map((item, index) => ({
            item_index: index,
            payload_kind: item.payload_kind,
            event_priority: item.event_priority,
            final_decision: item.final_decision,
            boundary_audit_status: item.boundary_audit_status,
          })),
          source_statuses: tick.status.source_statuses.map((item) => ({
            name: item.name,
            source_kind: item.source_kind,
            auth_mode: item.auth_mode,
            telemetry_available: item.telemetry_available,
            local_endpoint_policy: item.local_endpoint_policy,
            local_endpoint_policy_status: item.local_endpoint_policy_status,
            bridge_endpoint_scope: item.bridge_endpoint_scope,
            bridge_endpoint_locality_ok: item.bridge_endpoint_locality_ok,
            last_comment_count: item.last_comment_count,
            last_support_event_count: item.last_support_event_count,
            last_support_event_type_counts: item.last_support_event_type_counts,
            last_support_amount_source_counts: item.last_support_amount_source_counts,
            last_ignored_count: item.last_ignored_count,
            last_ignored_event_type_counts: item.last_ignored_event_type_counts,
            last_moderation_filtered_count: item.last_moderation_filtered_count,
            ignored_event_type_counts: item.ignored_event_type_counts,
            moderation_filtered_count: item.moderation_filtered_count,
            request_count: item.request_count,
          })),
        },
        public_persistence_counts: {
          memory_record_count: memoryRecords.length,
          relationship_profile_count: relationshipProfiles.length,
        },
        boundary_policy: {
          http_relay_read_only: true,
          one_fetch_per_scheduler_tick: true,
          support_events_normalized_as_donations: true,
          moderation_items_ignored: true,
          candidates_commit_only_after_validation: true,
          no_endpoint_or_secret_values_in_report: true,
          no_live_payloads: true,
          no_support_message_text: true,
          no_store_paths: true,
          no_commands: true,
        },
      };
  assertYouTubeRelayRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report, {
    relayUrl,
    persistenceDir,
    memoryStorePath: env.IRIS_MEMORY_STORE_PATH,
    relationshipStorePath: env.IRIS_RELATIONSHIP_STORE_PATH,
  });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await closeServer(relayServer);
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(persistenceDir, { recursive: true, force: true });
  }
}

function createRelayItems() {
  return [
    {
      id: "relay-comment-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "IRIS, the relay path is live!",
        publishedAt: "2026-04-30T01:00:01Z",
      },
      authorDetails: {
        channelId: "relay-viewer-comment",
        displayName: "Relay Commenter",
      },
    },
    {
      id: "relay-superchat-1",
      snippet: {
        displayMessage: "Super Chat from Relay Supporter",
        publishedAt: "2026-04-30T01:00:02Z",
        superChatDetails: {
          amountMicros: "500000000",
          currency: "JPY",
          userComment: "Keep the big laugh ready!",
        },
      },
      authorDetails: {
        channelId: "relay-viewer-support",
        displayName: "Relay Supporter",
      },
    },
    {
      id: "relay-superthanks-1",
      snippet: {
        displayMessage: "Super Thanks from Relay Archive Supporter",
        publishedAt: "2026-04-30T01:00:02.500Z",
        superThanksDetails: {
          amountMicros: "125000000",
          currency: "JPY",
          userComment: "Relay replay support is live too!",
        },
      },
      authorDetails: {
        channelId: "relay-viewer-superthanks",
        displayName: "Relay Super Thanks",
      },
    },
    {
      id: "relay-sticker-1",
      snippet: {
        displayMessage: "Sticker support",
        publishedAt: "2026-04-30T01:00:03Z",
        superStickerDetails: {
          amountMicros: "250000000",
          currency: "JPY",
        },
      },
      authorDetails: {
        channelId: "relay-viewer-sticker",
        displayName: "Relay Sticker",
      },
    },
    {
      id: "relay-raw-support-1",
      author: {
        channel_id: "relay-viewer-raw-support",
        display_name: "Raw Relay Supporter",
      },
      message: "Relay bridge format still reaches IRIS.",
      amount_display_string: "JPY 2,000",
      currency: "JPY",
      publishedAt: "2026-04-30T01:00:03.500Z",
    },
    {
      id: "relay-gift-received-1",
      author: {
        channel_id: "relay-viewer-gift-receiver",
        display_name: "Relay Gift Receiver",
      },
      message: "Relay gifted membership received.",
      giftMembershipReceivedDetails: {
        memberLevelName: "Gold",
      },
      publishedAt: "2026-04-30T01:00:03.750Z",
    },
    {
      id: "relay-deleted-1",
      snippet: {
        publishedAt: "2026-04-30T01:00:04Z",
        messageDeletedDetails: {
          deletedMessageId: "relay-deleted-message-id",
        },
      },
      authorDetails: {
        channelId: "relay-viewer-deleted",
        displayName: "Relay Deleted",
      },
    },
    {
      id: "relay-blocked-author-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "IRIS, this relay author is configured out.",
        publishedAt: "2026-04-30T01:00:05Z",
      },
      authorDetails: {
        channelId: "relay-viewer-blocked-filter",
        displayName: "Relay Blocked Viewer",
      },
    },
    {
      id: "relay-blocked-text-1",
      author: {
        channel_id: "relay-viewer-filtered-support",
        display_name: "Relay Filtered Supporter",
      },
      message: "Please repeat relay filtered fixture phrase.",
      amount_display_string: "JPY 1,000",
      currency: "JPY",
      publishedAt: "2026-04-30T01:00:05.500Z",
    },
  ];
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    const key = String(value ?? "unknown");
    counts[key] = Number(counts[key] ?? 0) + 1;
  }
  return counts;
}

function assertYouTubeRelayRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("YouTube relay roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!YOUTUBE_RELAY_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`YouTube relay roundtrip unexpected report field ${field}`);
    }
  }
  if (
    report.ok !== true ||
    report.schema !== "iris_youtube_relay_roundtrip_report_v1" ||
    report.fixture_counts?.relay_poll_count !== 1
  ) {
    throw new Error("YouTube relay roundtrip status mismatch");
  }
  for (const field of [
    "http_relay_read_only",
    "one_fetch_per_scheduler_tick",
    "support_events_normalized_as_donations",
    "moderation_items_ignored",
    "candidates_commit_only_after_validation",
    "no_endpoint_or_secret_values_in_report",
    "no_live_payloads",
    "no_support_message_text",
    "no_store_paths",
    "no_commands",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`YouTube relay roundtrip boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(
  value,
  { relayUrl, persistenceDir, memoryStorePath, relationshipStorePath }
) {
  const serialized = JSON.stringify(value);
  const forbiddenFragments = [
    relayUrl,
    persistenceDir,
    memoryStorePath,
    relationshipStorePath,
    "relay-viewer-blocked-filter",
    "relay filtered fixture phrase",
    "IRIS, the relay path is live",
    "Keep the big laugh ready",
    "Relay replay support is live too",
    "Relay bridge format still reaches IRIS",
    "Relay gifted membership received",
    "Please repeat relay filtered fixture phrase",
    "Relay Commenter",
    "Relay Supporter",
    "Relay Super Thanks",
    "Relay Sticker",
    "Raw Relay Supporter",
    "Relay Gift Receiver",
    "Relay Blocked Viewer",
    "Relay Filtered Supporter",
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"approved_memory_record"',
    '"approved_relationship_record"',
    '"event_id"',
    '"trace_id"',
    "memory_records",
    "relationship_profiles",
    "recent_summaries",
    '"store_path"',
    '"filePath"',
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`YouTube relay report leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
