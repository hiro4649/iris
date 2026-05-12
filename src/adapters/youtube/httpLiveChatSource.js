import { ContractError } from "../../core/contracts.js";
import {
  summarizeLocalEndpointPolicyStatus,
  summarizeLocalEndpointScope,
} from "../../core/localEndpointPolicy.js";
import { normalizeYouTubeComment } from "./commentAdapter.js";
import { normalizeYouTubeDonation } from "./donationAdapter.js";
import {
  applyYouTubeModeration,
  createYouTubeModerationFilter,
  emptyModerationReasonCounts,
  mergeModerationReasonCounts,
} from "./moderationFilter.js";

const FORBIDDEN_LIVE_CHAT_FIELDS = new Set([
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
]);

const SUPPORT_EVENT_TYPES = new Set([
  "superChatEvent",
  "superStickerEvent",
  "superThanksEvent",
  "newSponsorEvent",
  "memberMilestoneChatEvent",
  "membershipGiftingEvent",
  "giftMembershipReceivedEvent",
  "normalizedSupportEvent",
]);

const SUPPORT_EVENT_TYPE_ALIASES = new Map([
  ["paidmessageevent", "superChatEvent"],
  ["paidmessage", "superChatEvent"],
  ["paid_message", "superChatEvent"],
  ["superchat", "superChatEvent"],
  ["super_chat", "superChatEvent"],
  ["paidstickerevent", "superStickerEvent"],
  ["paidsticker", "superStickerEvent"],
  ["paid_sticker", "superStickerEvent"],
  ["supersticker", "superStickerEvent"],
  ["super_sticker", "superStickerEvent"],
  ["superthanks", "superThanksEvent"],
  ["super_thanks", "superThanksEvent"],
  ["sponsorevent", "newSponsorEvent"],
  ["sponsor", "newSponsorEvent"],
  ["membership", "newSponsorEvent"],
  ["membershipevent", "newSponsorEvent"],
  ["newmemberevent", "newSponsorEvent"],
  ["newmembershipevent", "newSponsorEvent"],
  ["new_member", "newSponsorEvent"],
  ["new_membership", "newSponsorEvent"],
  ["membermilestoneevent", "memberMilestoneChatEvent"],
  ["membermilestonechat", "memberMilestoneChatEvent"],
  ["membermilestonechatmessage", "memberMilestoneChatEvent"],
  ["membershipmilestoneevent", "memberMilestoneChatEvent"],
  ["member_milestone", "memberMilestoneChatEvent"],
  ["membership_milestone", "memberMilestoneChatEvent"],
  ["membershipgiftevent", "membershipGiftingEvent"],
  ["membershipgift", "membershipGiftingEvent"],
  ["membership_gift", "membershipGiftingEvent"],
  ["membershipgifting", "membershipGiftingEvent"],
  ["giftmembershipevent", "membershipGiftingEvent"],
  ["giftmembershipsevent", "membershipGiftingEvent"],
  ["giftedmembershipevent", "membershipGiftingEvent"],
  ["giftedmembership", "membershipGiftingEvent"],
  ["giftedmemberships", "membershipGiftingEvent"],
  ["giftmembershipreceived", "giftMembershipReceivedEvent"],
  ["giftmembershipreceivedevent", "giftMembershipReceivedEvent"],
  ["gift_received_membership", "giftMembershipReceivedEvent"],
  ["receivedmembershipgift", "giftMembershipReceivedEvent"],
  ["normalizedsupportevent", "normalizedSupportEvent"],
  ["supportevent", "normalizedSupportEvent"],
  ["support_event", "normalizedSupportEvent"],
  ["donation", "normalizedSupportEvent"],
]);

const SUPPORT_AMOUNT_SOURCE_KINDS = new Set([
  "micros",
  "formatted",
  "tier",
  "membership_count",
  "unknown",
]);

const IGNORED_MODERATION_EVENT_TYPES = new Set([
  "messageDeletedEvent",
  "userBannedEvent",
  "tombstone",
  "moderationEvent",
]);
const HTTP_LIVE_CHAT_INGEST_READINESS_STATUSES = new Set(["idle", "active", "attention"]);
const LOCAL_ENDPOINT_POLICY_STATUSES = new Set(["all_allowed", "blocked", "not_configured"]);
const HTTP_LIVE_CHAT_ENDPOINT_SCOPES = new Set([
  "loopback",
  "private_network",
  "external",
  "invalid",
  "not_configured",
]);
const HTTP_LIVE_CHAT_AUTH_MODES = new Set(["none", "bearer", "query_key"]);
const HTTP_LIVE_CHAT_SOURCE_ERROR_KINDS = new Set([
  "http_live_chat_timeout",
  "http_live_chat_http_status",
  "http_live_chat_invalid_json",
  "http_live_chat_unsafe_payload",
  "http_live_chat_contract_error",
  "http_live_chat_request_error",
  "local_endpoint_policy_blocked",
]);
const HTTP_LIVE_CHAT_PUBLIC_STATUS_COUNT_FIELDS = [
  "request_count",
  "last_item_count",
  "last_ignored_count",
  "last_duplicate_count",
  "last_moderation_filtered_count",
  "last_comment_count",
  "last_support_event_count",
  "ignored_event_count",
  "duplicate_item_count",
  "moderation_filtered_count",
  "comment_event_count",
  "support_event_count",
];
const HTTP_LIVE_CHAT_STATUS_URL_PATTERN = /https?:\/\//i;

export function createHttpLiveChatSource({
  endpoint,
  apiKey = "",
  authMode = "bearer",
  timeoutMs = 5000,
  dedupeWindow = 5000,
  blockedAuthorIds = [],
  blockedTextTerms = [],
  nowMs = () => Date.now(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!endpoint) {
    throw new ContractError("HTTP live chat endpoint is required");
  }
  if (typeof fetchImpl !== "function") {
    throw new ContractError("HTTP live chat source requires fetch");
  }

  const bufferedEvents = [];
  const seenEventIds = new Set();
  const seenEventOrder = [];
  const dedupeLimit = clampInteger(dedupeWindow, 0, 50_000, 5000);
  const safeTimeoutMs = clampInteger(timeoutMs, 100, 60_000, 5000);
  const moderationFilter = createYouTubeModerationFilter({
    blockedAuthorIds,
    blockedTextTerms,
  });
  const endpointScopeSummary = summarizeLocalEndpointScope(endpoint);
  const localEndpointPolicyStatus = summarizeLocalEndpointPolicyStatus(endpointScopeSummary);
  const status = {
    source_kind: "http_youtube_live_chat_source",
    auth_mode: summarizeHttpLiveChatAuthMode(apiKey, authMode),
    local_endpoint_policy: "loopback_or_private_network_only",
    local_endpoint_policy_status: localEndpointPolicyStatus,
    bridge_endpoint_scope: endpointScopeSummary.endpoint_scope,
    bridge_endpoint_locality_ok: endpointScopeSummary.local_endpoint_allowed,
    moderation_configured: moderationFilter.configured,
    request_count: 0,
    last_item_count: 0,
    last_ignored_count: 0,
    last_ignored_event_type_counts: emptyIgnoredEventTypeCounts(),
    last_duplicate_count: 0,
    last_moderation_filtered_count: 0,
    last_moderation_reason_counts: emptyModerationReasonCounts(),
    last_comment_count: 0,
    last_support_event_count: 0,
    last_support_event_type_counts: emptySupportEventTypeCounts(),
    last_support_amount_source_counts: emptySupportAmountSourceCounts(),
    ignored_event_count: 0,
    ignored_event_type_counts: emptyIgnoredEventTypeCounts(),
    duplicate_item_count: 0,
    moderation_filtered_count: 0,
    moderation_reason_counts: emptyModerationReasonCounts(),
    comment_event_count: 0,
    support_event_count: 0,
    support_event_type_counts: emptySupportEventTypeCounts(),
    support_amount_source_counts: emptySupportAmountSourceCounts(),
    last_error: null,
    last_error_at_ms: null,
    polling_interval_ms: null,
    last_poll_at_ms: null,
    next_page_token: "",
  };

  async function next() {
    if (bufferedEvents.length > 0) {
      return bufferedEvents.shift();
    }
    if (!shouldPollHttpLiveChatSource(status, nowMs())) return null;

    const events = await fetchChatBatch({
      endpoint,
      apiKey,
      authMode,
      timeoutMs: safeTimeoutMs,
      nowMs,
      fetchImpl,
      status,
      seenEventIds,
      seenEventOrder,
      dedupeLimit,
      moderationFilter,
    });
    bufferedEvents.push(...events);
    if (bufferedEvents.length === 0) return null;
    return bufferedEvents.shift();
  }

  return {
    source_kind: "http_youtube_live_chat_source",
    next,
    async nextBatch(limit = 20) {
      const events = [];
      if (bufferedEvents.length === 0) {
        if (!shouldPollHttpLiveChatSource(status, nowMs())) return events;
        const fetched = await fetchChatBatch({
          endpoint,
          apiKey,
          authMode,
          timeoutMs: safeTimeoutMs,
          nowMs,
          fetchImpl,
          status,
          seenEventIds,
          seenEventOrder,
          dedupeLimit,
          moderationFilter,
        });
        bufferedEvents.push(...fetched);
      }
      while (events.length < limit && bufferedEvents.length > 0) {
        events.push(bufferedEvents.shift());
      }
      return events;
    },
    status() {
      return createPublicStatus(status);
    },
  };
}

function createPublicStatus(status) {
  const publicStatus = {
    schema: "iris_http_live_chat_source_status_v1",
    source_kind: status.source_kind,
    ingest_readiness_status: summarizeHttpLiveChatReadiness(status),
    auth_mode: status.auth_mode,
    local_endpoint_policy: status.local_endpoint_policy,
    local_endpoint_policy_status: status.local_endpoint_policy_status,
    bridge_endpoint_scope: status.bridge_endpoint_scope,
    bridge_endpoint_locality_ok: status.bridge_endpoint_locality_ok,
    moderation_configured: status.moderation_configured === true,
    request_count: status.request_count,
    last_item_count: status.last_item_count,
    last_ignored_count: status.last_ignored_count,
    last_ignored_event_type_counts: structuredClone(status.last_ignored_event_type_counts),
    last_duplicate_count: status.last_duplicate_count,
    last_moderation_filtered_count: status.last_moderation_filtered_count,
    last_moderation_reason_counts: structuredClone(status.last_moderation_reason_counts),
    last_comment_count: status.last_comment_count,
    last_support_event_count: status.last_support_event_count,
    last_support_event_type_counts: structuredClone(status.last_support_event_type_counts),
    last_support_amount_source_counts: structuredClone(
      status.last_support_amount_source_counts
    ),
    ignored_event_count: status.ignored_event_count,
    ignored_event_type_counts: structuredClone(status.ignored_event_type_counts),
    duplicate_item_count: status.duplicate_item_count,
    moderation_filtered_count: status.moderation_filtered_count,
    moderation_reason_counts: structuredClone(status.moderation_reason_counts),
    comment_event_count: status.comment_event_count,
    support_event_count: status.support_event_count,
    support_event_type_counts: structuredClone(status.support_event_type_counts),
    support_amount_source_counts: structuredClone(status.support_amount_source_counts),
    last_error: status.last_error,
    last_error_at_ms: status.last_error_at_ms,
    boundary_policy: {
      counts_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_payloads: true,
      no_text_payloads: true,
      no_moderation_terms: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertHttpLiveChatSourceStatusSafe(publicStatus);
  return publicStatus;
}

function summarizeHttpLiveChatReadiness(status) {
  if (status.last_error) return "attention";
  if (status.request_count <= 0) return "idle";
  return "active";
}

export function assertHttpLiveChatSourceStatusSafe(
  status,
  context = "HTTP live chat source status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  assertLiveChatPayloadSafe(status, context);
  if (status.schema !== "iris_http_live_chat_source_status_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: status.schema });
  }
  if (status.source_kind !== "http_youtube_live_chat_source") {
    throw new ContractError(`${context}: invalid source kind`, {
      source_kind: status.source_kind,
    });
  }
  if (!HTTP_LIVE_CHAT_INGEST_READINESS_STATUSES.has(status.ingest_readiness_status)) {
    throw new ContractError(`${context}: invalid ingest readiness status`, {
      ingest_readiness_status: status.ingest_readiness_status,
    });
  }
  if (status.local_endpoint_policy !== "loopback_or_private_network_only") {
    throw new ContractError(`${context}: invalid local endpoint policy`, {
      local_endpoint_policy: status.local_endpoint_policy,
    });
  }
  if (!LOCAL_ENDPOINT_POLICY_STATUSES.has(status.local_endpoint_policy_status)) {
    throw new ContractError(`${context}: invalid local endpoint policy status`, {
      local_endpoint_policy_status: status.local_endpoint_policy_status,
    });
  }
  if (!HTTP_LIVE_CHAT_ENDPOINT_SCOPES.has(status.bridge_endpoint_scope)) {
    throw new ContractError(`${context}: invalid bridge endpoint scope`, {
      bridge_endpoint_scope: status.bridge_endpoint_scope,
    });
  }
  if (!HTTP_LIVE_CHAT_AUTH_MODES.has(status.auth_mode)) {
    throw new ContractError(`${context}: invalid auth mode`, {
      auth_mode: status.auth_mode,
    });
  }
  assertBoolean(
    status.bridge_endpoint_locality_ok,
    `${context}: bridge endpoint locality`,
    "bridge_endpoint_locality_ok"
  );
  assertBoolean(status.moderation_configured, `${context}: moderation`, "moderation_configured");
  for (const field of HTTP_LIVE_CHAT_PUBLIC_STATUS_COUNT_FIELDS) {
    assertNonNegativeInteger(status[field], `${context}: ${field}`, field);
  }
  assertCountMapSafe(status.last_ignored_event_type_counts, IGNORED_MODERATION_EVENT_TYPES, context);
  assertCountMapSafe(status.ignored_event_type_counts, IGNORED_MODERATION_EVENT_TYPES, context);
  assertCountMapSafe(status.last_support_event_type_counts, SUPPORT_EVENT_TYPES, context);
  assertCountMapSafe(status.support_event_type_counts, SUPPORT_EVENT_TYPES, context);
  assertCountMapSafe(status.last_support_amount_source_counts, SUPPORT_AMOUNT_SOURCE_KINDS, context);
  assertCountMapSafe(status.support_amount_source_counts, SUPPORT_AMOUNT_SOURCE_KINDS, context);
  assertModerationReasonCountsSafe(status.last_moderation_reason_counts, context);
  assertModerationReasonCountsSafe(status.moderation_reason_counts, context);
  if (status.last_error !== null && !HTTP_LIVE_CHAT_SOURCE_ERROR_KINDS.has(status.last_error)) {
    throw new ContractError(`${context}: invalid last error`, { last_error: status.last_error });
  }
  assertOptionalNonNegativeNumber(status.last_error_at_ms, `${context}: last_error_at_ms`, "last_error_at_ms");
  assertBoundaryPolicyFlags(status.boundary_policy, [
    "counts_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_payloads",
    "no_text_payloads",
    "no_moderation_terms",
    "no_candidates",
    "no_commands",
  ], context);
  if (status.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation is required`);
  }
  if (HTTP_LIVE_CHAT_STATUS_URL_PATTERN.test(JSON.stringify(status))) {
    throw new ContractError(`${context}: status must not expose endpoint values`);
  }
}

function assertBoolean(value, context, field) {
  if (typeof value !== "boolean") {
    throw new ContractError(context, { field, value });
  }
}

function assertNonNegativeInteger(value, context, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context, { field, value });
  }
}

function assertOptionalNonNegativeNumber(value, context, field) {
  if (value === null || value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ContractError(context, { field, value });
  }
}

function assertCountMapSafe(value, allowedKeys, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: count map must be an object`);
  }
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new ContractError(`${context}: unexpected count key`, { key });
    }
    assertNonNegativeInteger(value[key], `${context}: count map value`, key);
  }
  for (const key of allowed) {
    if (!Object.hasOwn(value, key)) {
      throw new ContractError(`${context}: missing count key`, { key });
    }
  }
}

function assertModerationReasonCountsSafe(value, context) {
  assertCountMapSafe(value, new Set(["blocked_author", "blocked_text"]), context);
}

function assertBoundaryPolicyFlags(policy, requiredFlags, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy must be an object`);
  }
  const expectedFlags = new Set(requiredFlags);
  for (const flag of Object.keys(policy)) {
    if (!expectedFlags.has(flag)) {
      throw new ContractError(`${context}: unexpected boundary policy flag`, { flag });
    }
  }
  for (const flag of requiredFlags) {
    if (policy[flag] !== true) {
      throw new ContractError(`${context}: boundary policy flag must be true`, { flag });
    }
  }
}

async function fetchChatBatch({
  endpoint,
  apiKey,
  authMode,
  timeoutMs,
  nowMs,
  fetchImpl,
  status,
  seenEventIds,
  seenEventOrder,
  dedupeLimit,
  moderationFilter,
}) {
  const endpointScopeSummary = summarizeLocalEndpointScope(endpoint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const pollStartedAtMs = nowMs();
    status.request_count += 1;
    status.last_poll_at_ms = pollStartedAtMs;
    status.local_endpoint_policy_status =
      summarizeLocalEndpointPolicyStatus(endpointScopeSummary);
    status.bridge_endpoint_scope = endpointScopeSummary.endpoint_scope;
    status.bridge_endpoint_locality_ok = endpointScopeSummary.local_endpoint_allowed;
    if (!endpointScopeSummary.local_endpoint_allowed) {
      throw new ContractError("HTTP live chat source endpoint must be local", {
        error_kind: "local_endpoint_policy_blocked",
        endpoint_scope: endpointScopeSummary.endpoint_scope,
        retryable: false,
        operator_action_required: true,
      });
    }
    const response = await fetchImpl(createHttpLiveChatFetchUrl(endpoint, status.next_page_token, apiKey, authMode), {
      method: "GET",
      headers: {
        accept: "application/json",
        ...createHttpLiveChatFetchAuthHeaders(apiKey, authMode),
      },
      signal: controller.signal,
    });
    if (response.status === 204) {
      recordEmptyHttpLiveChatBatch(status);
      return [];
    }
    if (!response.ok) {
      throw new ContractError("HTTP live chat source request failed", {
        status: response.status,
        response_kind: "omitted",
        error_kind: "http_status",
      });
    }
    const responseText = await response.text();
    const parsed = parseJsonResponse(responseText);
    assertLiveChatPayloadSafe(parsed, "HTTP live chat response");
    assertHttpLiveChatBridgeAccepted(parsed);
    status.polling_interval_ms = extractHttpLiveChatPollingIntervalMs(parsed);
    status.next_page_token = extractHttpLiveChatNextPageToken(parsed);
    const rawItems = extractChatItems(parsed);
    const converted = rawItems.map(toRuntimeEvent);
    const candidateEvents = converted.filter(Boolean);
    const ignoredEventTypeCounts = createIgnoredEventTypeCounts(rawItems);
    const { freshEvents: events, duplicateCount } = filterDuplicateEvents(candidateEvents, {
      seenEventIds,
      seenEventOrder,
      dedupeLimit,
    });
    const moderated = applyYouTubeModeration(events, moderationFilter);
    const acceptedEvents = moderated.events;
    const ignored =
      converted.length - candidateEvents.length + duplicateCount + moderated.filtered_count;
    const commentCount = acceptedEvents.filter((event) => event.source === "youtube_live_chat").length;
    const supportEventCount = acceptedEvents.filter(
      (event) => event.payload?.payload_kind === "donation_event"
    ).length;
    const supportEventTypeCounts = createSupportEventTypeCounts(acceptedEvents);
    const supportAmountSourceCounts = createSupportAmountSourceCounts(acceptedEvents);
    status.last_item_count = converted.length;
    status.last_ignored_count = ignored;
    status.last_ignored_event_type_counts = ignoredEventTypeCounts;
    status.last_duplicate_count = duplicateCount;
    status.last_moderation_filtered_count = moderated.filtered_count;
    status.last_moderation_reason_counts = moderated.reason_counts;
    status.last_comment_count = commentCount;
    status.last_support_event_count = supportEventCount;
    status.last_support_event_type_counts = supportEventTypeCounts;
    status.last_support_amount_source_counts = supportAmountSourceCounts;
    status.ignored_event_count += ignored;
    mergeIgnoredEventTypeCounts(status.ignored_event_type_counts, ignoredEventTypeCounts);
    status.duplicate_item_count += duplicateCount;
    status.moderation_filtered_count += moderated.filtered_count;
    mergeModerationReasonCounts(status.moderation_reason_counts, moderated.reason_counts);
    status.comment_event_count += commentCount;
    status.support_event_count += supportEventCount;
    mergeSupportEventTypeCounts(status.support_event_type_counts, supportEventTypeCounts);
    mergeSupportAmountSourceCounts(
      status.support_amount_source_counts,
      supportAmountSourceCounts
    );
    status.last_error = null;
    status.last_error_at_ms = null;
    return acceptedEvents;
  } catch (error) {
    status.last_error = classifyHttpLiveChatError(error);
    status.last_error_at_ms = nowMs();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function shouldPollHttpLiveChatSource(status, now) {
  const interval = Number(status?.polling_interval_ms);
  const lastPollAt = Number(status?.last_poll_at_ms);
  if (!Number.isFinite(interval) || interval <= 0) return true;
  if (!Number.isFinite(lastPollAt) || lastPollAt <= 0) return true;
  return Number(now) - lastPollAt >= interval;
}

function createHttpLiveChatFetchUrl(endpoint, pageToken, apiKey = "", authMode = "bearer") {
  const token = safeText(pageToken, 300);
  const url = new URL(endpoint);
  if (token) url.searchParams.set("pageToken", token);
  if (safeText(authMode, 40) === "query_key") {
    const key = safeText(apiKey, 300);
    if (key) url.searchParams.set("key", key);
  }
  return url.toString();
}

function createHttpLiveChatFetchAuthHeaders(apiKey = "", authMode = "bearer") {
  const key = safeText(apiKey, 300);
  if (!key || safeText(authMode, 40) === "query_key") return {};
  return { authorization: `Bearer ${key}` };
}

function summarizeHttpLiveChatAuthMode(apiKey = "", authMode = "bearer") {
  if (!safeText(apiKey, 300)) return "none";
  return safeText(authMode, 40) === "query_key" ? "query_key" : "bearer";
}

function recordEmptyHttpLiveChatBatch(status) {
  status.last_item_count = 0;
  status.last_ignored_count = 0;
  status.last_ignored_event_type_counts = emptyIgnoredEventTypeCounts();
  status.last_duplicate_count = 0;
  status.last_moderation_filtered_count = 0;
  status.last_moderation_reason_counts = emptyModerationReasonCounts();
  status.last_comment_count = 0;
  status.last_support_event_count = 0;
  status.last_support_event_type_counts = emptySupportEventTypeCounts();
  status.last_support_amount_source_counts = emptySupportAmountSourceCounts();
  status.last_error = null;
  status.last_error_at_ms = null;
}

function filterDuplicateEvents(events, { seenEventIds, seenEventOrder, dedupeLimit }) {
  if (dedupeLimit <= 0) return { freshEvents: events, duplicateCount: 0 };
  const freshEvents = [];
  let duplicateCount = 0;
  for (const event of events) {
    const eventId = safeOptionalText(event?.event_id);
    if (!eventId) {
      freshEvents.push(event);
      continue;
    }
    if (seenEventIds.has(eventId)) {
      duplicateCount += 1;
      continue;
    }
    seenEventIds.add(eventId);
    seenEventOrder.push(eventId);
    freshEvents.push(event);
    while (seenEventOrder.length > dedupeLimit) {
      const oldest = seenEventOrder.shift();
      if (oldest) seenEventIds.delete(oldest);
    }
  }
  return { freshEvents, duplicateCount };
}

function assertHttpLiveChatBridgeAccepted(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
  const bridgeStatus = safeText(
    parsed.bridge_status ?? parsed.bridgeStatus ?? parsed.status ?? parsed.state ?? "",
    80
  )
    .toLowerCase()
    .replace(/[\s-]+/gu, "_");
  if (
    parsed.ok === false ||
    parsed.success === false ||
    parsed.accepted === false ||
    ["failed", "rejected", "error", "target_failed", "target_unreachable"].includes(
      bridgeStatus
    )
  ) {
    throw new ContractError("HTTP live chat bridge returned failure", {
      status: 200,
      error_kind: "http_live_chat_http_status",
      response_kind: "omitted",
    });
  }
}

function emptySupportEventTypeCounts() {
  return Object.fromEntries([...SUPPORT_EVENT_TYPES].map((type) => [type, 0]));
}

function createSupportEventTypeCounts(events) {
  const counts = emptySupportEventTypeCounts();
  for (const event of events) {
    if (event?.payload?.payload_kind !== "donation_event") continue;
    const supportEventType = safeText(event.payload.support_event_type, 80);
    if (Object.hasOwn(counts, supportEventType)) counts[supportEventType] += 1;
  }
  return counts;
}

function mergeSupportEventTypeCounts(totalCounts, nextCounts) {
  for (const type of SUPPORT_EVENT_TYPES) {
    totalCounts[type] = Number(totalCounts[type] ?? 0) + Number(nextCounts[type] ?? 0);
  }
}

function emptyIgnoredEventTypeCounts() {
  return Object.fromEntries([...IGNORED_MODERATION_EVENT_TYPES].map((type) => [type, 0]));
}

function createIgnoredEventTypeCounts(items) {
  const counts = emptyIgnoredEventTypeCounts();
  for (const item of Array.isArray(items) ? items : []) {
    const type = ignoredModerationEventType(item);
    if (type) counts[type] += 1;
  }
  return counts;
}

function mergeIgnoredEventTypeCounts(totalCounts, nextCounts) {
  for (const type of IGNORED_MODERATION_EVENT_TYPES) {
    totalCounts[type] = Number(totalCounts[type] ?? 0) + Number(nextCounts[type] ?? 0);
  }
}

function ignoredModerationEventType(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "";
  const snippet = raw.snippet && typeof raw.snippet === "object" ? raw.snippet : {};
  const type = safeText(snippet.type ?? raw.type ?? raw.event_type ?? raw.eventType ?? "", 80);
  if (IGNORED_MODERATION_EVENT_TYPES.has(type)) return type;
  if (snippet.messageDeletedDetails || raw.messageDeletedDetails) return "messageDeletedEvent";
  if (snippet.userBannedDetails || raw.userBannedDetails) return "userBannedEvent";
  return "";
}

function emptySupportAmountSourceCounts() {
  return Object.fromEntries([...SUPPORT_AMOUNT_SOURCE_KINDS].map((kind) => [kind, 0]));
}

function createSupportAmountSourceCounts(events) {
  const counts = emptySupportAmountSourceCounts();
  for (const event of events) {
    if (event?.payload?.payload_kind !== "donation_event") continue;
    const amountSourceKind = safeSupportAmountSourceKind(event.payload.amount_source_kind);
    counts[amountSourceKind] += 1;
  }
  return counts;
}

function mergeSupportAmountSourceCounts(totalCounts, nextCounts) {
  for (const kind of SUPPORT_AMOUNT_SOURCE_KINDS) {
    totalCounts[kind] = Number(totalCounts[kind] ?? 0) + Number(nextCounts[kind] ?? 0);
  }
}

function extractHttpLiveChatPollingIntervalMs(parsed) {
  const value = firstWrappedHttpLiveChatValue(httpLiveChatResponseObjects(parsed), [
    "pollingIntervalMillis",
    "polling_interval_millis",
    "pollingIntervalMs",
    "polling_interval_ms",
    "pollingInterval",
    "polling_interval",
  ]);
  const number = Number(value);
  if (Number.isFinite(number) && number >= 0) return Math.round(number);
  const seconds = Number(firstWrappedHttpLiveChatValue(httpLiveChatResponseObjects(parsed), [
    "pollingIntervalSeconds",
    "polling_interval_seconds",
    "pollingSeconds",
    "polling_seconds",
  ]));
  return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1000) : null;
}

function extractHttpLiveChatNextPageToken(parsed) {
  return safeText(
    firstWrappedHttpLiveChatValue(httpLiveChatResponseObjects(parsed), [
      "nextPageToken",
      "next_page_token",
      "next_page",
      "pageToken",
      "page_token",
      "cursor",
      "nextCursor",
      "next_cursor",
    ]) ??
      "",
    300
  );
}

function httpLiveChatResponseObjects(parsed) {
  return [
    parsed,
    parsed?.data,
    parsed?.result,
    parsed?.payload,
    parsed?.response,
    parsed?.body,
  ].filter((value) => value && typeof value === "object" && !Array.isArray(value));
}

function firstWrappedHttpLiveChatValue(objects, fields) {
  for (const object of objects) {
    for (const field of fields) {
      if (object[field] !== undefined && object[field] !== null && object[field] !== "") {
        return object[field];
      }
    }
  }
  return undefined;
}

function classifyHttpLiveChatError(error) {
  if (error?.name === "AbortError") return "http_live_chat_timeout";
  if (error instanceof ContractError) {
    if (error.details?.error_kind === "local_endpoint_policy_blocked") {
      return "local_endpoint_policy_blocked";
    }
    if (typeof error.details?.status === "number") return "http_live_chat_http_status";
    if (String(error.message ?? "").includes("requires JSON")) {
      return "http_live_chat_invalid_json";
    }
    if (String(error.message ?? "").includes("read-only")) {
      return "http_live_chat_unsafe_payload";
    }
    return "http_live_chat_contract_error";
  }
  return "http_live_chat_request_error";
}

function parseJsonResponse(text) {
  const raw = String(text ?? "");
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new ContractError("HTTP live chat source requires JSON response");
  }
}

function extractChatItems(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  for (const source of [
    parsed,
    parsed.data,
    parsed.payload,
    parsed.result,
    parsed.response,
    parsed.body,
  ]) {
    const items = extractChatItemsFromObject(source);
    if (items) return items;
  }
  if (parsed.comment && typeof parsed.comment === "object") return [parsed.comment];
  if (parsed.message && typeof parsed.message === "object") return [parsed.message];
  if (parsed.event && typeof parsed.event === "object") return [parsed.event];
  if (parsed.entry && typeof parsed.entry === "object") return [parsed.entry];
  if (parsed.result && typeof parsed.result === "object") return [parsed.result];
  if (isStandaloneChatItemObject(parsed)) return [parsed];
  return [];
}

function extractChatItemsFromObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  for (const field of [
    "items",
    "comments",
    "messages",
    "events",
    "entries",
    "results",
    "contents",
    "actions",
    "records",
    "live_chat_items",
    "liveChatItems",
    "live_chat_messages",
    "liveChatMessages",
  ]) {
    if (Array.isArray(value[field])) return value[field];
  }
  if (value.liveChat && typeof value.liveChat === "object") return extractChatItems(value.liveChat);
  if (value.live_chat && typeof value.live_chat === "object") return extractChatItems(value.live_chat);
  for (const field of ["item", "comment", "message", "event", "entry", "result"]) {
    if (isChatItemObject(value[field])) return [value[field]];
  }
  return null;
}

function isChatItemObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isStandaloneChatItemObject(value) {
  if (!isChatItemObject(value)) return false;
  return [
    value.id,
    value.snippet ||
      value.type ||
      value.kind ||
      value.payload_kind ||
      value.payloadKind ||
      value.text ||
      value.message ||
      value.message_text ||
      value.messageText,
  ].some((marker) => (typeof marker === "string" ? marker.trim() !== "" : marker != null));
}

function toRuntimeEvent(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ContractError("HTTP live chat item must be an object");
  }
  const snippet = raw.snippet && typeof raw.snippet === "object" ? raw.snippet : {};
  const type = safeText(snippet.type ?? raw.type ?? raw.event_type ?? raw.eventType ?? "", 80);
  if (IGNORED_MODERATION_EVENT_TYPES.has(type)) return null;
  if (isSupportEvent(raw, snippet, type)) {
    return normalizeYouTubeDonation(toDonationInput(raw, snippet));
  }
  const comment = toCommentInput(raw, snippet);
  if (!comment.text) return null;
  return normalizeYouTubeComment(comment);
}

function toCommentInput(raw, snippet) {
  const authorDetails =
    raw.authorDetails && typeof raw.authorDetails === "object"
      ? raw.authorDetails
      : snippet.authorDetails && typeof snippet.authorDetails === "object"
        ? snippet.authorDetails
        : {};
  const author = raw.author && typeof raw.author === "object" ? raw.author : {};
  const user = raw.user && typeof raw.user === "object" ? raw.user : {};
  const sender = raw.sender && typeof raw.sender === "object" ? raw.sender : {};
  const profile = raw.profile && typeof raw.profile === "object" ? raw.profile : {};
  const viewer = raw.viewer && typeof raw.viewer === "object" ? raw.viewer : {};
  const publishedAt =
    raw.published_at ??
    raw.publishedAt ??
    raw.created_at ??
    raw.createdAt ??
    raw.timestamp ??
    raw.time ??
    snippet.published_at ??
    snippet.publishedAt ??
    snippet.created_at ??
    snippet.createdAt ??
    snippet.timestamp ??
    snippet.time ??
    null;
  const timestampMs =
    raw.timestamp_ms ??
    raw.timestampMs ??
    raw.published_at_ms ??
    raw.publishedAtMs ??
    raw.created_at_ms ??
    raw.createdAtMs ??
    (publishedAt ? Date.parse(String(publishedAt)) : undefined);
  const comment = {
    trace_id: safeOptionalText(raw.trace_id),
    event_id: safeOptionalText(
      raw.event_id ??
        raw.eventId ??
        raw.platform_event_id ??
        raw.platformEventId ??
        raw.message_id ??
        raw.messageId ??
        raw.external_id ??
        raw.externalId ??
        raw.chat_id ??
        raw.chatId ??
        raw.id ??
        snippet.id ??
        snippet.event_id ??
        snippet.eventId ??
        snippet.platform_event_id ??
        snippet.platformEventId ??
        snippet.message_id ??
        snippet.messageId ??
        snippet.external_id ??
        snippet.externalId ??
        snippet.chat_id ??
        snippet.chatId
    ),
    timestamp_ms: Number.isFinite(timestampMs) ? timestampMs : undefined,
    author_channel_id: resolveYouTubeAuthorChannelId({
      raw,
      user,
      sender,
      profile,
      viewer,
      author,
      snippet,
      authorDetails,
    }),
    display_name: safeText(
      raw.display_name ??
        raw.displayName ??
        raw.username ??
        raw.user_name ??
        raw.userName ??
        raw.name ??
        raw.author_name ??
        raw.authorName ??
        user.display_name ??
        user.displayName ??
        user.name ??
        user.username ??
        sender.display_name ??
        sender.displayName ??
        sender.name ??
        sender.username ??
        profile.display_name ??
        profile.displayName ??
        profile.name ??
        profile.username ??
        viewer.display_name ??
        viewer.displayName ??
        viewer.name ??
        viewer.username ??
        author.display_name ??
        author.displayName ??
        author.name ??
        author.username ??
        snippet.author_display_name ??
        snippet.authorDisplayName ??
        snippet.author_name ??
        snippet.authorName ??
        authorDetails.display_name ??
        authorDetails.displayName ??
        authorDetails.name ??
        authorDetails.username ??
        authorDetails.author_name ??
        authorDetails.authorName ??
        "viewer",
      120
    ),
    text: safeText(
      raw.text ??
        raw.message_text ??
        raw.messageText ??
        raw.message ??
        raw.text ??
        raw.body ??
        raw.content ??
        raw.comment_text ??
        raw.commentText ??
        raw.displayMessage ??
        snippet.displayMessage ??
        snippet.text ??
        snippet.message ??
        snippet.body ??
        snippet.content ??
        snippet.comment_text ??
        snippet.commentText ??
        snippet.textMessageDetails?.messageText ??
        snippet.textMessageDetails?.message_text ??
        snippet.textMessageDetails?.text ??
        snippet.textMessageDetails?.body ??
        snippet.textMessageDetails?.content ??
        textFromYouTubeMessageRuns(
          snippet.textMessageDetails?.messageRuns ??
            snippet.textMessageDetails?.runs ??
            snippet.messageRuns ??
            snippet.runs ??
            raw.messageRuns ??
            raw.runs
        ) ??
        "",
      500
    ),
  };
  if (!comment.trace_id) delete comment.trace_id;
  if (!comment.event_id) delete comment.event_id;
  if (comment.timestamp_ms === undefined) delete comment.timestamp_ms;
  return comment;
}

function toDonationInput(raw, snippet) {
  const authorDetails =
    raw.authorDetails && typeof raw.authorDetails === "object"
      ? raw.authorDetails
      : snippet.authorDetails && typeof snippet.authorDetails === "object"
        ? snippet.authorDetails
        : {};
  const author = raw.author && typeof raw.author === "object" ? raw.author : {};
  const user = raw.user && typeof raw.user === "object" ? raw.user : {};
  const sender = raw.sender && typeof raw.sender === "object" ? raw.sender : {};
  const profile = raw.profile && typeof raw.profile === "object" ? raw.profile : {};
  const viewer = raw.viewer && typeof raw.viewer === "object" ? raw.viewer : {};
  const details = pickSupportDetails(raw, snippet);
  const amountMicros = Number(
    details.amountMicros ?? details.amount_micros ?? raw.amount_micros ?? raw.amountMicros ?? NaN
  );
  const normalizedSupportEventType = supportEventType(raw, snippet);
  const membershipCount =
    details.giftMembershipsCount ??
    details.giftMembershipCount ??
    details.giftedMembershipCount ??
    details.gifted_memberships_count ??
    details.gift_memberships_count ??
    details.gift_membership_count ??
    details.gift_count ??
    details.giftCount ??
    details.membershipCount ??
    details.membership_count ??
    details.memberCount ??
    details.member_count ??
    raw.giftMembershipsCount ??
    raw.giftMembershipCount ??
    raw.giftedMembershipCount ??
    raw.gifted_memberships_count ??
    raw.gift_memberships_count ??
    raw.gift_membership_count ??
    raw.gift_count ??
    raw.giftCount ??
    raw.membershipCount ??
    raw.membership_count ??
    raw.memberCount ??
    raw.member_count;
  const amount = Number.isFinite(amountMicros)
    ? amountMicros / 1_000_000
    : raw.amount_tier ??
      raw.amountTier ??
      raw.tier ??
      details.amountTier ??
      details.tier ??
      raw.amount ??
      raw.value ??
      raw.price ??
      raw.amountText ??
      raw.amount_text ??
      raw.amountString ??
      raw.amount_string ??
      raw.amountDisplayString ??
      raw.amount_display_string ??
      raw.purchaseAmountText ??
      raw.purchase_amount_text ??
      raw.display_amount ??
      raw.formatted_amount ??
      raw.formattedAmount ??
      raw.localized_amount ??
      raw.localizedAmount ??
      raw.displayAmount ??
      details.amount ??
      details.value ??
      details.price ??
      details.amountText ??
      details.amount_text ??
      details.amountString ??
      details.amount_string ??
      details.amountDisplayString ??
      details.amount_display_string ??
      details.purchaseAmountText ??
      details.purchase_amount_text ??
      details.display_amount ??
      details.formatted_amount ??
      details.formattedAmount ??
      details.localized_amount ??
      details.localizedAmount ??
      details.displayAmount ??
      membershipCount;
  const publishedAt =
    raw.published_at ??
    raw.publishedAt ??
    raw.created_at ??
    raw.createdAt ??
    raw.timestamp ??
    raw.time ??
    snippet.published_at ??
    snippet.publishedAt ??
    snippet.created_at ??
    snippet.createdAt ??
    snippet.timestamp ??
    snippet.time ??
    null;
  const timestampMs =
    raw.timestamp_ms ??
    raw.timestampMs ??
    raw.published_at_ms ??
    raw.publishedAtMs ??
    raw.created_at_ms ??
    raw.createdAtMs ??
    (publishedAt ? Date.parse(String(publishedAt)) : undefined);
  const donation = {
    trace_id: safeOptionalText(raw.trace_id),
    event_id: safeOptionalText(
      raw.event_id ??
        raw.eventId ??
        raw.platform_event_id ??
        raw.platformEventId ??
        raw.message_id ??
        raw.messageId ??
        raw.external_id ??
        raw.externalId ??
        raw.chat_id ??
        raw.chatId ??
        raw.id ??
        snippet.id ??
        snippet.event_id ??
        snippet.eventId ??
        snippet.platform_event_id ??
        snippet.platformEventId ??
        snippet.message_id ??
        snippet.messageId ??
        snippet.external_id ??
        snippet.externalId ??
        snippet.chat_id ??
        snippet.chatId
    ),
    timestamp_ms: Number.isFinite(timestampMs) ? timestampMs : undefined,
    author_channel_id: resolveYouTubeAuthorChannelId({
      raw,
      user,
      sender,
      profile,
      viewer,
      author,
      snippet,
      authorDetails,
    }),
    display_name: safeText(
      raw.display_name ??
        raw.displayName ??
        raw.username ??
        raw.user_name ??
        raw.userName ??
        raw.name ??
        raw.author_name ??
        raw.authorName ??
        user.display_name ??
        user.displayName ??
        user.name ??
        user.username ??
        sender.display_name ??
        sender.displayName ??
        sender.name ??
        sender.username ??
        profile.display_name ??
        profile.displayName ??
        profile.name ??
        profile.username ??
        viewer.display_name ??
        viewer.displayName ??
        viewer.name ??
        viewer.username ??
        author.display_name ??
        author.displayName ??
        author.name ??
        author.username ??
        snippet.author_display_name ??
        snippet.authorDisplayName ??
        snippet.author_name ??
        snippet.authorName ??
        authorDetails.display_name ??
        authorDetails.displayName ??
        authorDetails.name ??
        authorDetails.username ??
        authorDetails.author_name ??
        authorDetails.authorName ??
        "viewer",
      120
    ),
    message_text: safeText(
      raw.message_text ??
        raw.messageText ??
        raw.message ??
        raw.text ??
        raw.body ??
        raw.content ??
        raw.comment_text ??
        raw.commentText ??
        details.userComment ??
        details.user_comment ??
        details.text ??
        details.message ??
        details.body ??
        details.content ??
        details.comment_text ??
        details.commentText ??
        details.messageText ??
        details.message_text ??
        snippet.displayMessage ??
        snippet.superChatDetails?.userComment ??
        snippet.superStickerDetails?.userComment ??
        snippet.superStickerDetails?.superStickerMetadata?.altText ??
        snippet.superStickerDetails?.superStickerMetadata?.alt_text ??
        details.superStickerMetadata?.altText ??
        details.superStickerMetadata?.alt_text ??
        details.stickerMetadata?.altText ??
        details.stickerMetadata?.alt_text ??
        details.altText ??
        details.alt_text ??
        textFromYouTubeMessageRuns(
          details.messageRuns ??
            details.runs ??
            snippet.messageRuns ??
            snippet.runs ??
            raw.messageRuns ??
            raw.runs
        ) ??
        "",
      500
    ),
    amount_tier: amount,
    amount_source_kind: supportAmountSourceKind(
      raw,
      details,
      amountMicros,
      normalizedSupportEventType
    ),
    currency: safeText(
      details.currency ??
        details.currencyCode ??
        details.currency_code ??
        details.currencySymbol ??
        details.currency_symbol ??
        details.displayCurrency ??
        details.display_currency ??
        details.amountCurrency ??
        details.amount_currency ??
        raw.currency ??
        raw.currencyCode ??
        raw.currency_code ??
        raw.currencySymbol ??
        raw.currency_symbol ??
        raw.displayCurrency ??
        raw.display_currency ??
        raw.amountCurrency ??
        raw.amount_currency ??
        "unknown",
      24
    ),
    support_event_type: normalizedSupportEventType,
    is_public_event: true,
  };
  if (!donation.trace_id) delete donation.trace_id;
  if (!donation.event_id) delete donation.event_id;
  if (donation.timestamp_ms === undefined) delete donation.timestamp_ms;
  return donation;
}

function isSupportEvent(raw, snippet, type) {
  const normalizedType = normalizeSupportEventType(type);
  if (normalizedType !== "normalizedSupportEvent" && SUPPORT_EVENT_TYPES.has(normalizedType)) {
    return true;
  }
  const payloadKind = safeText(raw.payload_kind ?? raw.payloadKind, 80);
  const kind = safeText(raw.kind ?? raw.event_kind ?? raw.eventKind, 80);
  if (payloadKind === "donation_event") return true;
  if (["donation", "support_event", "youtube_donation"].includes(kind)) return true;
  if (
    raw.support_event_type !== undefined ||
    raw.supportEventType !== undefined ||
    snippet.support_event_type !== undefined ||
    snippet.supportEventType !== undefined
  ) return true;
  if (Object.keys(pickSupportDetails(raw, snippet)).length > 0) return true;
  return [
    "amount_tier",
    "amountTier",
    "tier",
    "amount",
    "value",
    "price",
    "amountText",
    "amount_text",
    "amountString",
    "amount_string",
    "amount_micros",
    "amountMicros",
    "amount_display_string",
    "amountDisplayString",
    "display_amount",
    "formattedAmount",
    "displayAmount",
  ].some((field) => raw[field] !== undefined && raw[field] !== null);
}

function supportAmountSourceKind(raw, details, amountMicros, supportEventType = "") {
  const explicit = safeSupportAmountSourceKind(raw.amount_source_kind ?? raw.amountSourceKind);
  if (explicit !== "unknown") return explicit;
  if (Number.isFinite(amountMicros)) return "micros";
  if (
    supportEventType === "membershipGiftingEvent" ||
    supportEventType === "giftMembershipReceivedEvent"
  ) {
    return "membership_count";
  }
  if (
    hasValue(details.giftMembershipsCount) ||
    hasValue(details.giftMembershipCount) ||
    hasValue(details.giftedMembershipCount) ||
    hasValue(details.gifted_memberships_count) ||
    hasValue(details.gift_memberships_count) ||
    hasValue(details.gift_membership_count) ||
    hasValue(details.gift_count) ||
    hasValue(details.giftCount) ||
    hasValue(details.membershipCount) ||
    hasValue(details.membership_count) ||
    hasValue(details.memberCount) ||
    hasValue(details.member_count) ||
    hasValue(raw.giftMembershipsCount) ||
    hasValue(raw.giftMembershipCount) ||
    hasValue(raw.giftedMembershipCount) ||
    hasValue(raw.gifted_memberships_count) ||
    hasValue(raw.gift_memberships_count) ||
    hasValue(raw.gift_membership_count) ||
    hasValue(raw.gift_count) ||
    hasValue(raw.giftCount) ||
    hasValue(raw.membershipCount) ||
    hasValue(raw.membership_count) ||
    hasValue(raw.memberCount) ||
    hasValue(raw.member_count)
  ) {
    return "membership_count";
  }
  if (
    hasValue(raw.amount_tier) ||
    hasValue(raw.amountTier) ||
    hasValue(raw.tier) ||
    hasValue(details.amountTier) ||
    hasValue(details.tier)
  ) {
    return "tier";
  }
  if (
    hasValue(raw.amount) ||
    hasValue(raw.amountDisplayString) ||
    hasValue(raw.amount_display_string) ||
    hasValue(raw.amountString) ||
    hasValue(raw.amount_string) ||
    hasValue(raw.display_amount) ||
    hasValue(raw.formattedAmount) ||
    hasValue(raw.displayAmount) ||
    hasValue(details.amountDisplayString) ||
    hasValue(details.amount_display_string) ||
    hasValue(details.amountString) ||
    hasValue(details.amount_string) ||
    hasValue(details.display_amount) ||
    hasValue(details.formattedAmount) ||
    hasValue(details.displayAmount)
  ) {
    return "formatted";
  }
  return "unknown";
}

function safeSupportAmountSourceKind(value) {
  const text = safeText(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (SUPPORT_AMOUNT_SOURCE_KINDS.has(text)) return text;
  return "unknown";
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function supportEventType(raw, snippet) {
  const explicit = safeText(
    raw.support_event_type ??
      raw.supportEventType ??
      snippet.support_event_type ??
      snippet.supportEventType ??
      snippet.type ??
      raw.type ??
      raw.event_type ??
      raw.eventType ??
      "",
    80
  );
  const normalized = normalizeSupportEventType(explicit);
  if (normalized !== "normalizedSupportEvent") return normalized;
  if (snippet.superChatDetails || raw.superChatDetails || snippet.paidMessageDetails || raw.paidMessageDetails) {
    return "superChatEvent";
  }
  if (snippet.superStickerDetails || raw.superStickerDetails || snippet.paidStickerDetails || raw.paidStickerDetails) {
    return "superStickerEvent";
  }
  if (snippet.superThanksDetails || raw.superThanksDetails) return "superThanksEvent";
  if (snippet.membershipGiftingDetails || raw.membershipGiftingDetails) return "membershipGiftingEvent";
  if (snippet.giftMembershipReceivedDetails || raw.giftMembershipReceivedDetails) {
    return "giftMembershipReceivedEvent";
  }
  if (snippet.memberMilestoneChatDetails || raw.memberMilestoneChatDetails) {
    return "memberMilestoneChatEvent";
  }
  if (
    snippet.newSponsorDetails ||
    raw.newSponsorDetails ||
    snippet.sponsorDetails ||
    raw.sponsorDetails ||
    snippet.sponsorshipDetails ||
    raw.sponsorshipDetails ||
    snippet.membershipDetails ||
    raw.membershipDetails
  ) {
    return "newSponsorEvent";
  }
  return normalized;
}

function normalizeSupportEventType(value) {
  const explicit = safeText(value, 80);
  if (!explicit || explicit === "textMessageEvent") return "normalizedSupportEvent";
  if (SUPPORT_EVENT_TYPES.has(explicit)) return explicit;
  const key = explicit
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return SUPPORT_EVENT_TYPE_ALIASES.get(key) ?? "normalizedSupportEvent";
}

function textFromYouTubeMessageRuns(runs) {
  if (!Array.isArray(runs)) return null;
  const text = runs
    .map((run) => {
      if (typeof run === "string") return run;
      if (!run || typeof run !== "object") return "";
      return run.text ?? run.message ?? run.displayText ?? run.content ?? "";
    })
    .join("")
    .trim();
  return text || null;
}

function pickSupportDetails(raw, snippet) {
  const candidates = [
    snippet.superChatDetails,
    snippet.superStickerDetails,
    snippet.superThanksDetails,
    snippet.paidMessageDetails,
    snippet.paidStickerDetails,
    snippet.memberMilestoneChatDetails,
    snippet.newSponsorDetails,
    snippet.sponsorDetails,
    snippet.sponsorshipDetails,
    snippet.membershipDetails,
    snippet.membershipGiftingDetails,
    snippet.giftMembershipReceivedDetails,
    snippet.membershipGiftDetails,
    snippet.giftMembershipDetails,
    snippet.giftDetails,
    raw.superChatDetails,
    raw.superStickerDetails,
    raw.superThanksDetails,
    raw.paidMessageDetails,
    raw.paidStickerDetails,
    raw.memberMilestoneChatDetails,
    raw.newSponsorDetails,
    raw.sponsorDetails,
    raw.sponsorshipDetails,
    raw.membershipDetails,
    raw.membershipGiftingDetails,
    raw.giftMembershipReceivedDetails,
    raw.membershipGiftDetails,
    raw.giftMembershipDetails,
    raw.giftDetails,
    raw.support_details,
    raw.supportDetails,
  ];
  return candidates.find((item) => item && typeof item === "object" && !Array.isArray(item)) ?? {};
}

function resolveYouTubeAuthorChannelId({
  raw,
  user,
  sender,
  profile,
  viewer,
  author,
  snippet,
  authorDetails,
}) {
  return (
    firstSafeText(
      raw.author_channel_id,
      raw.authorChannelId,
      raw.channel_id,
      raw.channelId,
      raw.user_id,
      raw.userId,
      raw.author_id,
      raw.authorId,
      user.channel_id,
      user.channelId,
      user.id,
      user.user_id,
      user.userId,
      sender.channel_id,
      sender.channelId,
      sender.id,
      profile.channel_id,
      profile.channelId,
      profile.id,
      viewer.channel_id,
      viewer.channelId,
      viewer.id,
      author.channel_id,
      author.channelId,
      author.id,
      author.user_id,
      author.userId,
      snippet.author_channel_id,
      snippet.authorChannelId,
      authorDetails.channel_id,
      authorDetails.channelID,
      authorDetails.author_channel_id,
      authorDetails.authorChannelId,
      authorDetails.channelId
    ) || "unknown"
  );
}

function firstSafeText(...values) {
  for (const value of values) {
    const text = safeOptionalText(unwrapYouTubeChannelId(value));
    if (text) return text;
  }
  return "";
}

function unwrapYouTubeChannelId(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return (
    value.value ??
    value.channelId ??
    value.channel_id ??
    value.id ??
    value.userId ??
    value.user_id ??
    ""
  );
}

function safeOptionalText(value) {
  if (value === undefined || value === null || value === "") return "";
  return safeText(value, 160);
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function assertLiveChatPayloadSafe(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertLiveChatPayloadSafe(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_LIVE_CHAT_FIELDS.has(field)) {
      throw new ContractError(`${context}: live chat bridge must be read-only`, { field, path });
    }
    assertLiveChatPayloadSafe(child, context, `${path}.${field}`);
  }
}
