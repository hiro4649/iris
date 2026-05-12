import { createServer } from "node:http";
import { ContractError } from "../core/contracts.js";

const URL_PATTERN = /https?:\/\//i;
const FORBIDDEN_PUBLIC_RELAY_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "canonical",
  "canonical_envelope",
  "intent",
  "conversation_state",
  "action_type",
  "tone",
  "emotion",
  "character_tag",
  "task_type",
  "relation_score",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "password",
  "authorization",
  "payload",
  "raw",
  "text",
  "message",
  "displayMessage",
  "userComment",
]);

const ROUTE_PATHS = {
  health: "/health",
  liveChat: "/youtube/live-chat",
  relayLiveChat: "/relay/live-chat",
};

export function createYouTubeRelayBridgeServer({
  items = createYouTubeRelayBridgeItems(),
  upstreamEndpoint = "",
  upstreamApiKey = "",
  upstreamAuthMode = "bearer",
  upstreamTimeoutMs = 5000,
  upstreamContinueOnError = true,
  upstreamRequired = false,
  drainOnRead = false,
  fetchImpl = globalThis.fetch,
  nowMs = Date.now,
  logger = console,
} = {}) {
  const state = {
    request_count: 0,
    ingest_count: 0,
    upstream_error_count: 0,
    upstream_page_token: "",
    upstream_polling_interval_ms: null,
    upstream_last_poll_at_ms: null,
    started_at_ms: Number(nowMs()),
    source_summary: summarizeRelayItems(items),
  };
  const relayItems = items.map((item) => structuredClone(item));
  const relayItemIds = new Set(relayItems.map((item) => safeRelayText(item?.id, 160)));

  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      if (request.method === "GET" && requestUrl.pathname === ROUTE_PATHS.health) {
        return sendJson(response, 200, createYouTubeRelayBridgeHealth(state));
      }
      if (
        request.method === "GET" &&
        [ROUTE_PATHS.liveChat, ROUTE_PATHS.relayLiveChat].includes(requestUrl.pathname)
      ) {
        const upstreamResult = shouldPollRelayUpstream(state, nowMs())
          ? await fetchUpstreamRelayItems({
              endpoint: upstreamEndpoint,
              apiKey: upstreamApiKey,
              authMode: upstreamAuthMode,
              pageToken: state.upstream_page_token,
              timeoutMs: upstreamTimeoutMs,
              continueOnError: upstreamContinueOnError,
              required: upstreamRequired,
              fetchImpl,
              nowMs,
              onError: () => {
                state.upstream_error_count += 1;
              },
              onPoll: (pollAtMs) => {
                state.upstream_last_poll_at_ms = pollAtMs;
              },
              logger,
            })
          : createEmptyUpstreamRelayResult();
        const upstreamItems = upstreamResult.items;
        if (upstreamItems.length > 0) {
          const acceptedItems = appendUniqueRelayItems(relayItems, relayItemIds, upstreamItems);
          state.ingest_count += acceptedItems.length;
          state.source_summary = summarizeRelayItems(relayItems);
        }
        if (upstreamResult.nextPageToken) {
          state.upstream_page_token = upstreamResult.nextPageToken;
        }
        if (upstreamResult.pollingIntervalMillis !== null) {
          state.upstream_polling_interval_ms = upstreamResult.pollingIntervalMillis;
        }
        state.request_count += 1;
        const responseItems = relayItems.map((item) => structuredClone(item));
        if (drainOnRead || requestUrl.searchParams.get("drain") === "true") {
          relayItems.length = 0;
          state.source_summary = summarizeRelayItems(relayItems);
        }
        return sendJson(response, 200, {
          items: responseItems,
          nextPageToken: state.upstream_page_token || undefined,
          pollingIntervalMillis: state.upstream_polling_interval_ms ?? undefined,
        });
      }
      if (
        request.method === "POST" &&
        [ROUTE_PATHS.liveChat, ROUTE_PATHS.relayLiveChat].includes(requestUrl.pathname)
      ) {
        const body = await readJson(request);
        const newItems = normalizeRelayIngestItems(body, { nowMs });
        const acceptedItems = appendUniqueRelayItems(relayItems, relayItemIds, newItems);
        state.ingest_count += acceptedItems.length;
        state.source_summary = summarizeRelayItems(relayItems);
        return sendJson(response, 202, {
          ok: true,
          schema: "iris_youtube_relay_ingest_ack_v1",
          accepted_count: acceptedItems.length,
          total_item_count: relayItems.length,
        });
      }
      return sendJson(response, 404, createSafeErrorResponse("not_found"));
    } catch (error) {
      logger.warn?.(createSafeBridgeErrorLog(error));
      return sendJson(response, getStatusCode(error), createSafeErrorResponse(classifyError(error)));
    }
  });
}

export function createYouTubeRelayBridgeStartupReport({ sourceSummary } = {}) {
  const report = {
    ok: true,
    schema: "iris_youtube_relay_bridge_startup_v1",
    service: "youtube_relay_bridge",
    listening: {
      status: "listening",
      host_env_name: "IRIS_YOUTUBE_RELAY_BRIDGE_HOST",
      port_env_name: "IRIS_YOUTUBE_RELAY_BRIDGE_PORT",
      health_path: ROUTE_PATHS.health,
      live_chat_path: ROUTE_PATHS.liveChat,
      relay_live_chat_path: ROUTE_PATHS.relayLiveChat,
    },
    configure_iris_with: {
      source_env_name: "IRIS_YOUTUBE_LIVE_CHAT_SOURCE",
      source_mode: "http_relay",
      endpoint_env_name: "IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT",
      live_chat_path: ROUTE_PATHS.liveChat,
    },
    configured_env: [
      "IRIS_YOUTUBE_RELAY_BRIDGE_HOST",
      "IRIS_YOUTUBE_RELAY_BRIDGE_PORT",
      "IRIS_YOUTUBE_LIVE_CHAT_SOURCE",
      "IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT",
      "IRIS_YOUTUBE_LIVE_CHAT_API_KEY",
    ],
    bridge_source_summary: sourceSummary ?? summarizeRelayItems(createYouTubeRelayBridgeItems()),
    boundary_policy: {
      local_fixture_source_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_youtube_text: true,
      no_support_messages: true,
      no_raw_frames: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertYouTubeRelayBridgePublicReportSafe(report, "YouTube relay bridge startup report");
  return report;
}

export function createYouTubeRelayBridgeHealth(state = {}) {
  const report = {
    ok: true,
    schema: "iris_youtube_relay_bridge_health_v1",
    service: "youtube_relay_bridge",
    bridge_status: "ready",
    route_paths: [ROUTE_PATHS.health, ROUTE_PATHS.liveChat, ROUTE_PATHS.relayLiveChat],
    request_count: safeInteger(state.request_count),
    ingest_count: safeInteger(state.ingest_count),
    upstream_error_count: safeInteger(state.upstream_error_count),
    upstream_polling_interval_ms: safeOptionalInteger(state.upstream_polling_interval_ms),
    upstream_last_poll_at_ms: safeOptionalInteger(state.upstream_last_poll_at_ms),
    source_summary: state.source_summary ?? summarizeRelayItems(createYouTubeRelayBridgeItems()),
    boundary_policy: {
      local_fixture_source_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_youtube_text: true,
      no_support_messages: true,
      no_raw_frames: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertYouTubeRelayBridgePublicReportSafe(report, "YouTube relay bridge health");
  return report;
}

export function createYouTubeRelayBridgeItems() {
  return [
    {
      id: "bridge-comment-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "IRIS relay bridge fixture comment.",
        publishedAt: "2026-04-30T01:00:01Z",
      },
      authorDetails: {
        channelId: "bridge-viewer-comment",
        displayName: "Bridge Commenter",
      },
    },
    {
      id: "bridge-superchat-1",
      snippet: {
        type: "superChatEvent",
        displayMessage: "Super Chat bridge fixture.",
        publishedAt: "2026-04-30T01:00:02Z",
        superChatDetails: {
          amountMicros: "500000000",
          currency: "JPY",
          userComment: "Bridge support fixture comment.",
        },
      },
      authorDetails: {
        channelId: "bridge-viewer-support",
        displayName: "Bridge Supporter",
      },
    },
    {
      id: "bridge-superthanks-1",
      snippet: {
        type: "superThanksEvent",
        displayMessage: "Super Thanks bridge fixture.",
        publishedAt: "2026-04-30T01:00:02.500Z",
        superThanksDetails: {
          amountMicros: "125000000",
          currency: "JPY",
          userComment: "Bridge archive support fixture.",
        },
      },
      authorDetails: {
        channelId: "bridge-viewer-superthanks",
        displayName: "Bridge Super Thanks",
      },
    },
    {
      id: "bridge-sticker-1",
      snippet: {
        type: "superStickerEvent",
        displayMessage: "Sticker bridge fixture.",
        publishedAt: "2026-04-30T01:00:03Z",
        superStickerDetails: {
          amountMicros: "250000000",
          currency: "JPY",
        },
      },
      authorDetails: {
        channelId: "bridge-viewer-sticker",
        displayName: "Bridge Sticker",
      },
    },
    {
      id: "bridge-raw-support-1",
      type: "superChatEvent",
      author: {
        channel_id: "bridge-viewer-raw-support",
        display_name: "Bridge Raw Supporter",
      },
      message: "Bridge relay raw fixture.",
      amount_display_string: "JPY 2,000",
      currency: "JPY",
      publishedAt: "2026-04-30T01:00:03.500Z",
    },
    {
      id: "bridge-gift-received-1",
      type: "giftMembershipReceivedEvent",
      author: {
        channel_id: "bridge-viewer-gift-receiver",
        display_name: "Bridge Gift Receiver",
      },
      message: "Bridge gifted membership fixture.",
      giftMembershipReceivedDetails: {
        memberLevelName: "Gold",
      },
      publishedAt: "2026-04-30T01:00:03.750Z",
    },
    {
      id: "bridge-deleted-1",
      snippet: {
        type: "messageDeletedEvent",
        publishedAt: "2026-04-30T01:00:04Z",
      },
      authorDetails: {
        channelId: "bridge-viewer-deleted",
        displayName: "Bridge Deleted",
      },
    },
  ];
}

export function summarizeRelayItems(items) {
  if (!Array.isArray(items)) {
    throw new ContractError("YouTube relay bridge items must be an array");
  }
  const summary = {
    item_count: 0,
    comment_count: 0,
    support_event_count: 0,
    ignored_event_count: 0,
    support_event_type_counts: {
      superChatEvent: 0,
      superThanksEvent: 0,
      superStickerEvent: 0,
      giftMembershipReceivedEvent: 0,
      normalizedSupportEvent: 0,
    },
    support_amount_source_counts: {
      micros: 0,
      formatted: 0,
      membership_count: 0,
      unknown: 0,
    },
  };
  for (const item of items) {
    summary.item_count += 1;
    const type =
      item?.snippet?.type ??
      item?.snippet?.event_type ??
      item?.snippet?.eventType ??
      item?.snippet?.kind ??
      item?.type ??
      item?.event_type ??
      item?.eventType ??
      item?.kind ??
      "unknown";
    if (type === "textMessageEvent") {
      summary.comment_count += 1;
      continue;
    }
    if (type === "messageDeletedEvent" || type === "userBannedEvent" || type === "tombstone") {
      summary.ignored_event_count += 1;
      continue;
    }
    if (Object.hasOwn(summary.support_event_type_counts, type)) {
      summary.support_event_count += 1;
      summary.support_event_type_counts[type] += 1;
      const source = classifyAmountSource(item);
      summary.support_amount_source_counts[source] += 1;
    }
  }
  return summary;
}

export function assertYouTubeRelayBridgePublicReportSafe(
  report,
  context = "YouTube relay bridge public report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenPublicRelayFields(report, context);
  const serialized = JSON.stringify(report);
  if (URL_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  assertBoundaryPolicy(report.boundary_policy, [
    "local_fixture_source_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_youtube_text",
    "no_support_messages",
    "no_raw_frames",
    "no_candidates",
    "no_commands",
  ], context);
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary flag ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary flag required ${field}`);
    }
  }
}

function classifyAmountSource(item) {
  if (
    item?.snippet?.superChatDetails?.amountMicros ||
    item?.snippet?.super_chat_details?.amountMicros ||
    item?.snippet?.super_chat_details?.amount_micros ||
    item?.snippet?.superThanksDetails?.amountMicros ||
    item?.snippet?.super_thanks_details?.amountMicros ||
    item?.snippet?.super_thanks_details?.amount_micros ||
    item?.snippet?.superStickerDetails?.amountMicros ||
    item?.snippet?.super_sticker_details?.amountMicros ||
    item?.snippet?.super_sticker_details?.amount_micros ||
    item?.amountMicros ||
    item?.amount_micros ||
    item?.purchaseAmountMicros ||
    item?.purchase_amount_micros ||
    item?.paidAmountMicros ||
    item?.paid_amount_micros ||
    item?.priceAmountMicros ||
    item?.price_amount_micros
  ) {
    return "micros";
  }
  if (
    item?.amount_display_string ||
    item?.amountDisplayString ||
    item?.amount_string ||
    item?.amountString ||
    item?.display_amount ||
    item?.displayAmount ||
    item?.amount_formatted ||
    item?.amountFormatted ||
    item?.purchaseAmountText ||
    item?.purchase_amount_text ||
    item?.paidAmountText ||
    item?.paid_amount_text ||
    item?.priceText ||
    item?.price_text
  ) return "formatted";
  if (
    item?.giftMembershipReceivedDetails ||
    item?.gift_membership_received_details ||
    item?.snippet?.giftMembershipReceivedDetails ||
    item?.snippet?.gift_membership_received_details ||
    item?.membershipGiftingDetails ||
    item?.membership_gifting_details ||
    item?.snippet?.membershipGiftingDetails ||
    item?.snippet?.membership_gifting_details ||
    item?.membership_count ||
    item?.giftMembershipsCount ||
    item?.gift_memberships_count ||
    item?.giftMembershipCount ||
    item?.gift_membership_count ||
    item?.gift_count ||
    item?.giftCount
  ) return "membership_count";
  return "unknown";
}

function normalizeRelayIngestItems(body, { nowMs, requireItems = true } = {}) {
  const rawItems = extractRelayIngestItems(body);
  const items = rawItems.map((item, index) =>
    normalizeRelayIngestItem(item, {
      index,
      nowMs,
    })
  );
  if (requireItems && items.length === 0) {
    throw new ContractError("YouTube relay ingest: at least one item is required");
  }
  return items;
}

function extractRelayIngestItems(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.comments)) return body.comments;
  if (Array.isArray(body?.messages)) return body.messages;
  if (Array.isArray(body?.events)) return body.events;
  if (Array.isArray(body?.entries)) return body.entries;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.contents)) return body.contents;
  if (Array.isArray(body?.actions)) return body.actions;
  if (Array.isArray(body?.records)) return body.records;
  if (Array.isArray(body?.liveChatMessages)) return body.liveChatMessages;
  if (Array.isArray(body?.live_chat_messages)) return body.live_chat_messages;
  if (Array.isArray(body?.liveChatItems)) return body.liveChatItems;
  if (Array.isArray(body?.live_chat_items)) return body.live_chat_items;
  if (body?.data && typeof body.data === "object") {
    if (Array.isArray(body.data.items)) return body.data.items;
    if (Array.isArray(body.data.comments)) return body.data.comments;
    if (Array.isArray(body.data.messages)) return body.data.messages;
    if (Array.isArray(body.data.events)) return body.data.events;
    if (Array.isArray(body.data.entries)) return body.data.entries;
    if (Array.isArray(body.data.results)) return body.data.results;
    if (Array.isArray(body.data.contents)) return body.data.contents;
    if (Array.isArray(body.data.actions)) return body.data.actions;
    if (Array.isArray(body.data.records)) return body.data.records;
    if (Array.isArray(body.data.liveChatMessages)) return body.data.liveChatMessages;
    if (Array.isArray(body.data.live_chat_messages)) return body.data.live_chat_messages;
    if (Array.isArray(body.data.liveChatItems)) return body.data.liveChatItems;
    if (Array.isArray(body.data.live_chat_items)) return body.data.live_chat_items;
    if (isRelayItemObject(body.data.item)) return [body.data.item];
    if (isRelayItemObject(body.data.comment)) return [body.data.comment];
    if (isRelayItemObject(body.data.message)) return [body.data.message];
    if (isRelayItemObject(body.data.event)) return [body.data.event];
    if (isRelayItemObject(body.data.entry)) return [body.data.entry];
    if (isRelayItemObject(body.data.result)) return [body.data.result];
    if (isRelayItemObject(body.data.payload)) return extractRelayIngestItems(body.data.payload);
    if (isRelayItemObject(body.data.response)) return extractRelayIngestItems(body.data.response);
  }
  if (body?.result && typeof body.result === "object" && !Array.isArray(body.result)) {
    if (Array.isArray(body.result.items)) return body.result.items;
    if (Array.isArray(body.result.comments)) return body.result.comments;
    if (Array.isArray(body.result.messages)) return body.result.messages;
    if (Array.isArray(body.result.events)) return body.result.events;
    if (Array.isArray(body.result.entries)) return body.result.entries;
    if (Array.isArray(body.result.results)) return body.result.results;
    if (Array.isArray(body.result.contents)) return body.result.contents;
    if (Array.isArray(body.result.actions)) return body.result.actions;
    if (Array.isArray(body.result.records)) return body.result.records;
    if (Array.isArray(body.result.liveChatMessages)) return body.result.liveChatMessages;
    if (Array.isArray(body.result.live_chat_messages)) return body.result.live_chat_messages;
    if (Array.isArray(body.result.liveChatItems)) return body.result.liveChatItems;
    if (Array.isArray(body.result.live_chat_items)) return body.result.live_chat_items;
    if (isRelayItemObject(body.result.item)) return [body.result.item];
    if (isRelayItemObject(body.result.comment)) return [body.result.comment];
    if (isRelayItemObject(body.result.message)) return [body.result.message];
    if (isRelayItemObject(body.result.event)) return [body.result.event];
    if (isRelayItemObject(body.result.entry)) return [body.result.entry];
    if (isRelayItemObject(body.result.payload)) return extractRelayIngestItems(body.result.payload);
    if (isRelayItemObject(body.result.response)) return extractRelayIngestItems(body.result.response);
  }
  if (body?.payload && typeof body.payload === "object" && !Array.isArray(body.payload)) {
    return extractRelayIngestItems(body.payload);
  }
  if (body?.response && typeof body.response === "object" && !Array.isArray(body.response)) {
    return extractRelayIngestItems(body.response);
  }
  if (isRelayItemObject(body?.item)) return [body.item];
  if (isRelayItemObject(body?.comment)) return [body.comment];
  if (isRelayItemObject(body?.message)) return [body.message];
  if (isRelayItemObject(body?.event)) return [body.event];
  if (isRelayItemObject(body?.entry)) return [body.entry];
  if (isRelayItemObject(body?.result)) return [body.result];
  return [body];
}

function isRelayItemObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function appendUniqueRelayItems(relayItems, relayItemIds, newItems) {
  const acceptedItems = [];
  for (const item of newItems) {
    const id = safeRelayText(item?.id, 160);
    if (!id || relayItemIds.has(id)) continue;
    relayItemIds.add(id);
    relayItems.push(item);
    acceptedItems.push(item);
  }
  return acceptedItems;
}

async function fetchUpstreamRelayItems({
  endpoint,
  apiKey,
  authMode,
  pageToken,
  timeoutMs,
  continueOnError,
  required,
  fetchImpl,
  nowMs,
  onError,
  onPoll,
  logger,
}) {
  if (!endpoint) {
    if (required) throw new ContractError("YouTube relay upstream endpoint is required");
    return createEmptyUpstreamRelayResult();
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), clampTimeoutMs(timeoutMs));
  try {
    onPoll?.(Number(nowMs()));
    const response = await fetchImpl(createUpstreamFetchUrl(endpoint, pageToken, apiKey, authMode), {
      method: "GET",
      headers: createUpstreamFetchHeaders(apiKey, authMode),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ContractError("YouTube relay upstream returned non-OK status");
    }
    const body = await response.json();
    return {
      items: normalizeRelayIngestItems(body, { nowMs, requireItems: false }),
      nextPageToken: extractRelayNextPageToken(body),
      pollingIntervalMillis: extractRelayPollingIntervalMillis(body),
    };
  } catch (error) {
    if (!continueOnError) throw error;
    onError?.(error);
    logger?.warn?.("YouTube relay upstream fetch failed; continuing with local relay items");
    return createEmptyUpstreamRelayResult();
  } finally {
    clearTimeout(timer);
  }
}

function shouldPollRelayUpstream(state, now) {
  const interval = Number(state?.upstream_polling_interval_ms);
  const lastPollAt = Number(state?.upstream_last_poll_at_ms);
  if (!Number.isFinite(interval) || interval <= 0) return true;
  if (!Number.isFinite(lastPollAt) || lastPollAt <= 0) return true;
  return Number(now) - lastPollAt >= interval;
}

function createEmptyUpstreamRelayResult() {
  return {
    items: [],
    nextPageToken: "",
    pollingIntervalMillis: null,
  };
}

function createUpstreamFetchUrl(endpoint, pageToken, apiKey = "", authMode = "bearer") {
  const token = safeRelayText(pageToken, 300);
  const url = new URL(endpoint);
  if (token) url.searchParams.set("pageToken", token);
  if (safeRelayText(authMode, 40) === "query_key") {
    const key = safeRelayText(apiKey, 300);
    if (key) url.searchParams.set("key", key);
  }
  return url.toString();
}

function createUpstreamFetchHeaders(apiKey = "", authMode = "bearer") {
  const key = safeRelayText(apiKey, 300);
  if (!key || safeRelayText(authMode, 40) === "query_key") return {};
  return { authorization: `Bearer ${key}` };
}

function extractRelayNextPageToken(body) {
  return safeRelayText(
    body?.nextPageToken ??
      body?.next_page_token ??
      body?.pageToken ??
      body?.page_token ??
      body?.data?.nextPageToken ??
      body?.data?.next_page_token ??
      body?.result?.nextPageToken ??
      body?.result?.next_page_token ??
      body?.payload?.nextPageToken ??
      body?.payload?.next_page_token ??
      body?.response?.nextPageToken ??
      body?.response?.next_page_token,
    300
  );
}

function extractRelayPollingIntervalMillis(body) {
  const value =
    body?.pollingIntervalMillis ??
    body?.polling_interval_millis ??
    body?.data?.pollingIntervalMillis ??
    body?.data?.polling_interval_millis ??
    body?.result?.pollingIntervalMillis ??
    body?.result?.polling_interval_millis ??
    body?.payload?.pollingIntervalMillis ??
    body?.payload?.polling_interval_millis ??
    body?.response?.pollingIntervalMillis ??
    body?.response?.polling_interval_millis;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function normalizeRelayIngestItem(item, { index, nowMs }) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError("YouTube relay ingest item must be an object");
  }
  const type = safeRelayText(
    item.type ??
      item.event_type ??
      item.eventType ??
      item.kind ??
      item.snippet?.type ??
      item.snippet?.event_type ??
      item.snippet?.eventType ??
      item.snippet?.kind ??
      "textMessageEvent",
    80
  );
  const displayMessage = safeRelayText(
    item.displayMessage ??
      item.message ??
      item.text ??
      item.body ??
      item.content ??
      item.messageText ??
      item.message_text ??
      item.snippet?.displayMessage ??
      item.snippet?.messageText ??
      item.snippet?.message_text ??
      item.snippet?.text ??
      item.snippet?.body ??
      item.snippet?.content ??
      item.snippet?.textMessageDetails?.messageText ??
      item.snippet?.textMessageDetails?.message_text ??
      item.snippet?.textMessageDetails?.text ??
      item.snippet?.textMessageDetails?.body ??
      item.snippet?.textMessageDetails?.content,
    500
  );
  if (!displayMessage && type === "textMessageEvent") {
    throw new ContractError("YouTube relay ingest comment requires displayMessage");
  }
  const id =
    safeRelayText(
      item.id ??
        item.event_id ??
        item.eventId ??
        item.message_id ??
        item.messageId ??
        item.platform_event_id ??
        item.platformEventId ??
        item.external_id ??
        item.externalId ??
        item.chat_id ??
        item.chatId ??
        item.snippet?.id ??
        item.snippet?.event_id ??
        item.snippet?.eventId ??
        item.snippet?.message_id ??
        item.snippet?.messageId ??
        item.snippet?.platform_event_id ??
        item.snippet?.platformEventId ??
        item.snippet?.external_id ??
        item.snippet?.externalId ??
        item.snippet?.chat_id ??
        item.snippet?.chatId,
      160
    ) || `relay-ingest-${nowMs()}-${index}`;
  const snippet = {
    type,
    displayMessage,
    publishedAt:
      safeRelayText(
        item.publishedAt ??
          item.published_at ??
          item.createdAt ??
          item.created_at ??
          item.timestamp ??
          item.time ??
          item.snippet?.publishedAt ??
          item.snippet?.published_at ??
          item.snippet?.createdAt ??
          item.snippet?.created_at ??
          item.snippet?.timestamp ??
          item.snippet?.time,
        80
      ) ||
      new Date(nowMs()).toISOString(),
  };
  const supportDetails = createRelaySupportDetails(item);
  if (supportDetails) snippet[supportDetails.key] = supportDetails.value;
  return {
    id,
    snippet,
    authorDetails: {
      channelId: safeRelayText(
        item.channelId ??
          item.channel_id ??
          item.authorChannelId ??
          item.author_channel_id ??
          item.authorDetails?.channelId ??
          item.authorDetails?.channel_id ??
          item.authorDetails?.id ??
          item.authorDetails?.user_id ??
          item.authorDetails?.userId ??
          item.author?.channel_id ??
          item.author?.channelId ??
          item.author?.id ??
          item.author?.user_id ??
          item.author?.userId ??
          item.user?.channel_id ??
          item.user?.channelId ??
          item.user?.id ??
          item.user?.user_id ??
          item.user?.userId ??
          item.sender?.channel_id ??
          item.sender?.channelId ??
          item.sender?.id ??
          item.sender?.user_id ??
          item.sender?.userId ??
          item.profile?.channel_id ??
          item.profile?.channelId ??
          item.profile?.id ??
          item.viewer?.channel_id ??
          item.viewer?.channelId ??
          item.viewer?.id ??
          item.snippet?.author_channel_id ??
          item.snippet?.authorChannelId,
        160
      ),
      displayName:
        safeRelayText(
          item.displayName ??
          item.display_name ??
            item.authorName ??
            item.author_name ??
            item.authorDetails?.displayName ??
            item.authorDetails?.display_name ??
            item.authorDetails?.name ??
            item.authorDetails?.username ??
            item.author?.display_name ??
            item.author?.displayName ??
            item.author?.name ??
            item.author?.username ??
            item.user?.display_name ??
            item.user?.displayName ??
            item.user?.name ??
            item.user?.username ??
            item.sender?.display_name ??
            item.sender?.displayName ??
            item.sender?.name ??
            item.sender?.username ??
            item.profile?.display_name ??
            item.profile?.displayName ??
            item.profile?.name ??
            item.profile?.username ??
            item.viewer?.display_name ??
            item.viewer?.displayName ??
            item.viewer?.name ??
            item.viewer?.username ??
            item.snippet?.author_display_name ??
            item.snippet?.authorDisplayName ??
            item.snippet?.author_name ??
            item.snippet?.authorName,
          160
        ) || "YouTube Viewer",
    },
  };
}

function createRelaySupportDetails(item) {
  const type = safeRelayText(
    item.type ??
      item.event_type ??
      item.eventType ??
      item.kind ??
      item.snippet?.type ??
      item.snippet?.event_type ??
      item.snippet?.eventType ??
      item.snippet?.kind ??
      "",
    80
  );
  const details =
    item.superChatDetails ??
    item.super_chat_details ??
    item.superStickerDetails ??
    item.super_sticker_details ??
    item.superThanksDetails ??
    item.super_thanks_details ??
    item.giftMembershipReceivedDetails ??
    item.gift_membership_received_details ??
    item.membershipGiftingDetails ??
    item.membership_gifting_details ??
    item.snippet?.superChatDetails ??
    item.snippet?.super_chat_details ??
    item.snippet?.superStickerDetails ??
    item.snippet?.super_sticker_details ??
    item.snippet?.superThanksDetails ??
    item.snippet?.super_thanks_details ??
    item.snippet?.giftMembershipReceivedDetails ??
    item.snippet?.gift_membership_received_details ??
    item.snippet?.membershipGiftingDetails ??
    item.snippet?.membership_gifting_details ??
    ([item.amountMicros,
      item.amount_micros,
      item.purchaseAmountMicros,
      item.purchase_amount_micros,
      item.paidAmountMicros,
      item.paid_amount_micros,
      item.priceAmountMicros,
      item.price_amount_micros,
      item.amountDisplayString,
      item.amount_display_string,
      item.amountString,
      item.amount_string,
      item.display_amount,
      item.displayAmount,
      item.amount_formatted,
      item.amountFormatted,
      item.purchaseAmountText,
      item.purchase_amount_text,
      item.paidAmountText,
      item.paid_amount_text,
      item.priceText,
      item.price_text,
      item.giftMembershipsCount,
      item.gift_memberships_count,
      item.giftMembershipCount,
      item.gift_membership_count,
      item.gift_count,
      item.giftCount,
    ].some((value) => (typeof value === "string" ? value.trim() !== "" : value != null))
      ? item
      : null);
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const key = item.superStickerDetails || item.super_sticker_details || item.snippet?.superStickerDetails || item.snippet?.super_sticker_details || type === "superStickerEvent"
    ? "superStickerDetails"
    : item.superThanksDetails || item.super_thanks_details || item.snippet?.superThanksDetails || item.snippet?.super_thanks_details || type === "superThanksEvent"
      ? "superThanksDetails"
      : item.giftMembershipReceivedDetails || item.gift_membership_received_details || item.snippet?.giftMembershipReceivedDetails || item.snippet?.gift_membership_received_details || type === "giftMembershipReceivedEvent"
        ? "giftMembershipReceivedDetails"
        : item.membershipGiftingDetails || item.membership_gifting_details || item.snippet?.membershipGiftingDetails || item.snippet?.membership_gifting_details || type === "membershipGiftingEvent"
          ? "membershipGiftingDetails"
          : "superChatDetails";
  return {
    key,
    value: {
      amountMicros: safeRelayText(
        details.amountMicros ??
          details.amount_micros ??
          details.purchaseAmountMicros ??
          details.purchase_amount_micros ??
          details.paidAmountMicros ??
          details.paid_amount_micros ??
          details.priceAmountMicros ??
          details.price_amount_micros,
        80
      ),
      amountDisplayString: safeRelayText(
        details.amountDisplayString ??
          details.amount_display_string ??
          details.amountString ??
          details.amount_string ??
          details.display_amount ??
          details.displayAmount ??
          details.amount_formatted ??
          details.amountFormatted ??
          details.purchaseAmountText ??
          details.purchase_amount_text ??
          details.paidAmountText ??
          details.paid_amount_text ??
          details.priceText ??
          details.price_text,
        80
      ),
      giftMembershipCount: safeRelayText(
        details.giftMembershipCount ??
          details.gift_membership_count ??
          details.giftMembershipsCount ??
          details.gift_memberships_count ??
          details.gift_count ??
          details.giftCount,
        40
      ),
      memberLevelName: safeRelayText(
        details.memberLevelName ??
          details.member_level_name ??
          details.membershipLevelName ??
          details.membership_level_name ??
          details.levelName ??
          details.level_name ??
          details.tierName ??
          details.tier_name,
        160
      ),
      currency: safeRelayText(details.currency ?? details.currencyCode ?? details.currency_code, 16),
      userComment: safeRelayText(
        details.userComment ??
          details.user_comment ??
          details.messageText ??
          details.message_text ??
          details.commentText ??
          details.comment_text ??
          details.body ??
          details.content ??
          details.superStickerMetadata?.altText ??
          details.superStickerMetadata?.alt_text ??
          details.stickerMetadata?.altText ??
          details.stickerMetadata?.alt_text ??
          details.altText ??
          details.alt_text,
        500
      ),
    },
  };
}

function assertNoForbiddenPublicRelayFields(value, context, path = []) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenPublicRelayFields(item, context, path.concat(String(index)))
    );
    return;
  }
  for (const [field, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_PUBLIC_RELAY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe public relay field`, {
        field,
        path: path.concat(field).join("."),
      });
    }
    assertNoForbiddenPublicRelayFields(nestedValue, context, path.concat(field));
  }
}

function createSafeBridgeErrorLog(error) {
  return {
    ok: false,
    schema: "iris_youtube_relay_bridge_error_log_v1",
    service: "youtube_relay_bridge",
    error_kind: classifyError(error),
    boundary_policy: {
      no_endpoint_values: true,
      no_secret_values: true,
      no_youtube_text: true,
      no_support_messages: true,
      no_raw_frames: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function createSafeErrorResponse(errorKind) {
  return {
    ok: false,
    schema: "iris_youtube_relay_bridge_error_v1",
    error_kind: errorKind,
  };
}

function classifyError(error) {
  if (error instanceof ContractError) return "contract_error";
  return "request_error";
}

function getStatusCode(error) {
  if (error instanceof ContractError) return 400;
  return 500;
}

function safeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function safeOptionalInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function clampTimeoutMs(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 5000;
  return Math.max(100, Math.min(60_000, number));
}

function safeRelayText(value, maxLength) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 256_000) {
        reject(new ContractError("YouTube relay ingest body too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new ContractError("YouTube relay ingest invalid JSON"));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}
