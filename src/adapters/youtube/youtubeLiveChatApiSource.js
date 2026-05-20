import { ContractError } from "../../core/contracts.js";
import { sanitizeStoreErrorKind } from "../../services/persistence/storeStatusErrors.js";
import { normalizeYouTubeComment } from "./commentAdapter.js";
import { normalizeYouTubeDonation } from "./donationAdapter.js";
import {
  applyYouTubeModeration,
  createYouTubeModerationFilter,
  emptyModerationReasonCounts,
  mergeModerationReasonCounts,
} from "./moderationFilter.js";

const DEFAULT_YOUTUBE_LIVE_CHAT_MESSAGES_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/liveChat/messages";
const DEFAULT_YOUTUBE_VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
const POLLING_INTERVAL_MIN_MS = 500;
const POLLING_INTERVAL_MAX_MS = 300_000;
const RETRY_AFTER_MAX_MS = 24 * 3_600_000;
const YOUTUBE_API_ERROR_BODY_MAX_CHARS = 8192;
const CURSOR_STORE_STATUS_SCHEMA = "iris_youtube_live_chat_cursor_store_status_v1";
const CURSOR_WRITE_RESULT_SCHEMA = "iris_youtube_live_chat_cursor_write_result_v1";
const SAFE_CURSOR_STORE_HEALTH_VALUES = new Set(["ready", "attention"]);
const SAFE_CURSOR_WRITE_REASONS = new Set(["empty_page_token", "cursor_store_write_failed"]);
const YOUTUBE_API_INGEST_READINESS_STATUSES = new Set([
  "idle",
  "active",
  "attention",
  "polling_cooldown",
  "retry_backoff",
  "operator_action_required",
]);
const YOUTUBE_API_AUTH_MODES = new Set(["api_key", "oauth_token", "oauth_refresh"]);
const YOUTUBE_API_RECOVERY_HINTS = new Set([
  "wait_or_reduce_polling",
  "check_youtube_credentials",
  "select_active_stream",
  "enable_live_chat_or_select_stream",
  "check_live_chat_or_video_id",
  "wait_for_live_stream",
  "inspect_upstream_response_contract",
  "retry_after_backoff",
]);
const YOUTUBE_API_PUBLIC_STATUS_COUNT_FIELDS = [
  "request_count",
  "video_discovery_request_count",
  "live_chat_request_count",
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
  "consecutive_error_count",
];
const YOUTUBE_API_PUBLIC_STATUS_OPTIONAL_NUMBER_FIELDS = [
  "polling_interval_ms",
  "last_poll_at_ms",
  "next_poll_after_ms",
  "last_error_at_ms",
  "last_error_retry_after_ms",
  "next_retry_after_ms",
];
const STALE_LIVE_CHAT_DISCOVERY_GUARD_FIELDS = new Set([
  "schema",
  "discovery_status",
  "readiness_status",
  "fresh_ready",
  "resolved_count",
  "age_bucket",
  "attention_reason",
  "boundary_policy",
  "adapter_validation_required",
]);
const YOUTUBE_API_STATUS_URL_PATTERN = /https?:\/\//i;

const YOUTUBE_API_DETAIL_ERROR_KIND_BY_REASON = new Map([
  ["livechatended", "live_chat_ended"],
  ["livechatdisabled", "chat_disabled"],
  ["chatdisabled", "chat_disabled"],
  ["commentsdisabled", "chat_disabled"],
  ["livechatnotfound", "not_found"],
  ["chatnotfound", "not_found"],
  ["videonotfound", "not_found"],
  ["notfound", "not_found"],
  ["quotaexceeded", "quota_or_rate_limited"],
  ["dailylimitexceeded", "quota_or_rate_limited"],
  ["ratelimitexceeded", "quota_or_rate_limited"],
  ["userratelimitexceeded", "quota_or_rate_limited"],
  ["toomanyrequests", "quota_or_rate_limited"],
  ["autherror", "auth_required"],
  ["unauthorized", "auth_required"],
  ["invalidcredentials", "auth_required"],
  ["invalidcredential", "auth_required"],
  ["loginrequired", "auth_required"],
  ["keyinvalid", "auth_required"],
  ["apikeyinvalid", "auth_required"],
]);

const YOUTUBE_API_SOURCE_ERROR_KIND_BY_DETAIL = new Map([
  ["http_status", "youtube_live_chat_api_http_status"],
  ["quota_or_rate_limited", "youtube_live_chat_api_quota_or_rate_limited"],
  ["auth_required", "youtube_live_chat_api_auth_required"],
  ["live_chat_ended", "youtube_live_chat_api_live_chat_ended"],
  ["chat_disabled", "youtube_live_chat_api_chat_disabled"],
  ["not_found", "youtube_live_chat_api_not_found"],
  ["no_active_live_chat", "youtube_live_chat_api_no_active_live_chat"],
]);

const YOUTUBE_API_SOURCE_ERROR_KINDS = new Set([
  ...YOUTUBE_API_SOURCE_ERROR_KIND_BY_DETAIL.values(),
  "youtube_live_chat_api_timeout",
  "youtube_live_chat_api_invalid_json",
  "youtube_live_chat_api_unsafe_payload",
  "youtube_live_chat_api_contract_error",
  "youtube_live_chat_api_request_error",
  "youtube_oauth_refresh_timeout",
  "youtube_oauth_refresh_auth_required",
  "youtube_oauth_refresh_quota_or_rate_limited",
  "youtube_oauth_refresh_http_status",
  "youtube_oauth_refresh_invalid_json",
  "youtube_oauth_refresh_unsafe_response",
  "youtube_oauth_refresh_missing_access_token",
  "youtube_oauth_refresh_contract_error",
  "youtube_oauth_refresh_request_error",
]);

const YOUTUBE_API_OPERATOR_ACTION_DETAIL_KINDS = new Set([
  "auth_required",
  "live_chat_ended",
  "chat_disabled",
  "not_found",
]);

const FORBIDDEN_YOUTUBE_API_FIELDS = new Set([
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

const IGNORED_MODERATION_EVENT_TYPE_ALIASES = new Map([
  ["messagedeletedevent", "messageDeletedEvent"],
  ["message_deleted_event", "messageDeletedEvent"],
  ["message_deletion_event", "messageDeletedEvent"],
  ["deleted_message_event", "messageDeletedEvent"],
  ["userbannedevent", "userBannedEvent"],
  ["user_banned_event", "userBannedEvent"],
  ["user_ban_event", "userBannedEvent"],
  ["banned_user_event", "userBannedEvent"],
  ["tombstone", "tombstone"],
  ["tombstoneevent", "tombstone"],
  ["tombstone_event", "tombstone"],
  ["chat_tombstone_event", "tombstone"],
  ["moderationevent", "moderationEvent"],
  ["moderation_event", "moderationEvent"],
  ["moderation_action_event", "moderationEvent"],
  ["moderator_action_event", "moderationEvent"],
]);

export function createYouTubeLiveChatApiSource({
  liveChatId,
  videoId = "",
  apiKey = "",
  oauthToken = "",
  oauthTokenProvider = null,
  endpoint = DEFAULT_YOUTUBE_LIVE_CHAT_MESSAGES_ENDPOINT,
  videosEndpoint = DEFAULT_YOUTUBE_VIDEOS_ENDPOINT,
  timeoutMs = 5000,
  maxResults = 200,
  initialPageToken = "",
  cursorStore = null,
  respectPollingInterval = true,
  errorBackoffMs = 5000,
  maxErrorBackoffMs = 60_000,
  dedupeWindow = 5000,
  blockedAuthorIds = [],
  blockedTextTerms = [],
  nowMs = () => Date.now(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!liveChatId && !videoId) {
    throw new ContractError("YouTube live chat API source requires liveChatId or videoId");
  }
  if (!apiKey && !oauthToken && !oauthTokenProvider) {
    throw new ContractError("YouTube live chat API source requires apiKey or oauthToken");
  }
  if (typeof fetchImpl !== "function") {
    throw new ContractError("YouTube live chat API source requires fetch");
  }

  const bufferedEvents = [];
  const seenItemIds = new Set();
  const seenItemOrder = [];
  const dedupeLimit = clampInteger(dedupeWindow, 0, 50_000, 5000);
  const safeTimeoutMs = clampInteger(timeoutMs, 100, 60_000, 5000);
  const safeMaxResults = clampInteger(maxResults, 1, 200, 200);
  const moderationFilter = createYouTubeModerationFilter({
    blockedAuthorIds,
    blockedTextTerms,
  });
  const restoredPageToken =
    safeOptionalText(initialPageToken) || readCursorStoreInitialPageToken(cursorStore);
  const errorBackoffPolicy = {
    base_backoff_ms: clampInteger(errorBackoffMs, 0, 3_600_000, 5000),
    max_backoff_ms: clampInteger(maxErrorBackoffMs, 0, 24 * 3_600_000, 60_000),
  };
  const status = {
    source_kind: "youtube_live_chat_api_source",
    moderation_configured: moderationFilter.configured,
    live_chat_id: liveChatId ? safeText(liveChatId, 160) : null,
    video_id: videoId ? safeText(videoId, 160) : null,
    live_chat_id_resolved: liveChatId !== "",
    request_count: 0,
    video_discovery_request_count: 0,
    live_chat_request_count: 0,
    next_page_token: restoredPageToken,
    cursor_store: cursorStore,
    last_cursor_write_result: null,
    polling_interval_ms: null,
    polling_interval_policy: {
      min_ms: POLLING_INTERVAL_MIN_MS,
      max_ms: POLLING_INTERVAL_MAX_MS,
      out_of_range_policy: "clamp_without_exposing_raw_value",
    },
    last_polling_interval_clamped: false,
    last_poll_at_ms: null,
    next_poll_after_ms: null,
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
    last_error_retryable: null,
    last_error_operator_action_required: false,
    last_error_recovery_hint: null,
    last_error_retry_after_ms: null,
    consecutive_error_count: 0,
    next_retry_after_ms: null,
    error_backoff_policy: errorBackoffPolicy,
    auth_mode: oauthTokenProvider ? "oauth_refresh" : oauthToken ? "oauth_token" : "api_key",
    oauth_provider_status: oauthTokenProvider?.status?.() ?? null,
  };

  async function next() {
    if (bufferedEvents.length > 0) return bufferedEvents.shift();
    if (shouldPauseForOperatorAction(status)) return null;
    if (shouldWaitForErrorBackoff({ status, nowMs })) return null;
    if (shouldWaitForPollingInterval({ status, respectPollingInterval, nowMs })) return null;
    const activeOauthToken = await resolveOauthTokenWithBackoff({
      oauthToken,
      oauthTokenProvider,
      status,
      nowMs,
      errorBackoffPolicy,
    });
    const resolvedLiveChatId = await ensureLiveChatIdWithBackoff({
      status,
      videoId,
      apiKey,
      oauthToken: activeOauthToken,
      videosEndpoint,
      timeoutMs: safeTimeoutMs,
      fetchImpl,
      nowMs,
      errorBackoffPolicy,
    });
    const events = await fetchLiveChatBatch({
      endpoint,
      liveChatId: resolvedLiveChatId,
      apiKey,
      oauthToken: activeOauthToken,
      pageToken: status.next_page_token,
      timeoutMs: safeTimeoutMs,
      maxResults: safeMaxResults,
      fetchImpl,
      status,
      nowMs,
      seenItemIds,
      seenItemOrder,
      dedupeLimit,
      moderationFilter,
      errorBackoffPolicy,
      cursorStore,
    });
    bufferedEvents.push(...events);
    if (bufferedEvents.length === 0) return null;
    return bufferedEvents.shift();
  }

  return {
    source_kind: "youtube_live_chat_api_source",
    next,
    async nextBatch(limit = 20) {
      const events = [];
      if (bufferedEvents.length === 0) {
        if (shouldPauseForOperatorAction(status)) {
          return events;
        }
        if (shouldWaitForErrorBackoff({ status, nowMs })) {
          return events;
        }
        if (shouldWaitForPollingInterval({ status, respectPollingInterval, nowMs })) {
          return events;
        }
        const activeOauthToken = await resolveOauthTokenWithBackoff({
          oauthToken,
          oauthTokenProvider,
          status,
          nowMs,
          errorBackoffPolicy,
        });
        const resolvedLiveChatId = await ensureLiveChatIdWithBackoff({
          status,
          videoId,
          apiKey,
          oauthToken: activeOauthToken,
          videosEndpoint,
          timeoutMs: safeTimeoutMs,
          fetchImpl,
          nowMs,
          errorBackoffPolicy,
        });
        const fetched = await fetchLiveChatBatch({
          endpoint,
          liveChatId: resolvedLiveChatId,
          apiKey,
          oauthToken: activeOauthToken,
          pageToken: status.next_page_token,
          timeoutMs: safeTimeoutMs,
          maxResults: safeMaxResults,
          fetchImpl,
          status,
          nowMs,
          seenItemIds,
          seenItemOrder,
          dedupeLimit,
          moderationFilter,
          errorBackoffPolicy,
          cursorStore,
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

export function createStaleLiveChatDiscoveryGuardSummary({
  resolved = false,
  discoveredAtMs = null,
  nowMs = Date.now(),
  maxAgeMs = 300_000,
} = {}) {
  const discoveryAgeMs =
    resolved === true && Number.isFinite(Number(discoveredAtMs))
      ? Math.max(0, Number(nowMs) - Number(discoveredAtMs))
      : null;
  const safeMaxAgeMs = clampInteger(maxAgeMs, 1, 86_400_000, 300_000);
  const stale = discoveryAgeMs === null || discoveryAgeMs > safeMaxAgeMs;
  const summary = {
    schema: "iris_youtube_stale_live_chat_discovery_guard_v1",
    discovery_status: resolved === true ? (stale ? "stale" : "fresh") : "unresolved",
    readiness_status: stale ? "attention" : "ready",
    fresh_ready: stale !== true,
    resolved_count: resolved === true ? 1 : 0,
    age_bucket: summarizeDiscoveryAgeBucket(discoveryAgeMs, safeMaxAgeMs),
    attention_reason: stale ? "live_chat_discovery_stale_or_missing" : "none",
    boundary_policy: {
      status_count_age_bucket_only: true,
      no_live_chat_id: true,
      no_video_id: true,
      no_raw_discovery_result: true,
      no_api_response_body: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertStaleLiveChatDiscoveryGuardSummarySafe(summary);
  return summary;
}

export function assertStaleLiveChatDiscoveryGuardSummarySafe(
  summary,
  context = "stale live chat discovery guard summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary must be an object`);
  }
  for (const field of Object.keys(summary)) {
    if (!STALE_LIVE_CHAT_DISCOVERY_GUARD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (summary.schema !== "iris_youtube_stale_live_chat_discovery_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["fresh", "stale", "unresolved"].includes(summary.discovery_status)) {
    throw new ContractError(`${context}: invalid discovery status`);
  }
  if (!["ready", "attention"].includes(summary.readiness_status)) {
    throw new ContractError(`${context}: invalid readiness status`);
  }
  if (![0, 1].includes(summary.resolved_count)) {
    throw new ContractError(`${context}: invalid resolved count`);
  }
  if (
    summary.discovery_status !== "fresh" &&
    (summary.fresh_ready !== false || summary.readiness_status !== "attention")
  ) {
    throw new ContractError(`${context}: stale discovery must not be fresh ready`);
  }
  if (
    summary.discovery_status === "fresh" &&
    (summary.fresh_ready !== true || summary.readiness_status !== "ready")
  ) {
    throw new ContractError(`${context}: fresh discovery status mismatch`);
  }
  assertBoundaryPolicyFlags(
    summary.boundary_policy,
    [
      "status_count_age_bucket_only",
      "no_live_chat_id",
      "no_video_id",
      "no_raw_discovery_result",
      "no_api_response_body",
      "no_endpoint_values",
      "no_secret_values",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation is required`);
  }
  assertNoStaleLiveChatDiscoveryLeak(summary, context);
}

function createPublicStatus(status) {
  const cursorStoreStatus = readCursorStoreStatus(status.cursor_store);
  const cursorWriteResult = sanitizeCursorWriteResult(status.last_cursor_write_result);
  const cursorStoreWriteAttention =
    cursorWriteResult?.write_error === true ||
    cursorStoreStatus?.write_error === true ||
    cursorStoreStatus?.durability?.backup_write_error === true;
  const publicStatus = {
    schema: "iris_youtube_live_chat_api_source_status_v1",
    source_kind: status.source_kind,
    ingest_readiness_status: summarizeYouTubeApiIngestReadiness(status, {
      cursorStoreWriteAttention,
    }),
    moderation_configured: status.moderation_configured === true,
    live_chat_id_configured: status.live_chat_id !== null,
    video_id_configured: status.video_id !== null,
    live_chat_id_resolved: status.live_chat_id_resolved === true,
    request_count: status.request_count,
    video_discovery_request_count: status.video_discovery_request_count,
    live_chat_request_count: status.live_chat_request_count,
    has_next_page_token: status.next_page_token !== "",
    cursor_store_configured: cursorStoreStatus !== null,
    cursor_store_status: cursorStoreStatus,
    cursor_store_write_attention: cursorStoreWriteAttention,
    last_cursor_write_result: cursorWriteResult,
    polling_interval_ms: status.polling_interval_ms,
    polling_interval_policy: status.polling_interval_policy,
    last_polling_interval_clamped: status.last_polling_interval_clamped === true,
    last_poll_at_ms: status.last_poll_at_ms,
    next_poll_after_ms: status.next_poll_after_ms,
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
    last_error_retryable: status.last_error_retryable,
    last_error_operator_action_required: status.last_error_operator_action_required === true,
    last_error_recovery_hint: status.last_error_recovery_hint,
    last_error_retry_after_ms: status.last_error_retry_after_ms,
    consecutive_error_count: status.consecutive_error_count,
    has_retry_backoff: status.next_retry_after_ms !== null,
    next_retry_after_ms: status.next_retry_after_ms,
    error_backoff_policy: status.error_backoff_policy,
    auth_mode: status.auth_mode,
    oauth_provider_status: status.oauth_provider_status,
    boundary_policy: {
      no_live_chat_id: true,
      no_video_id: true,
      no_page_token: true,
      no_cursor_store_path: true,
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
  assertYouTubeLiveChatApiSourceStatusSafe(publicStatus);
  return publicStatus;
}

export function assertYouTubeLiveChatApiSourceStatusSafe(
  status,
  context = "YouTube live chat API source status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  assertYouTubeApiPayloadSafe(status, context);
  if (status.schema !== "iris_youtube_live_chat_api_source_status_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: status.schema });
  }
  if (status.source_kind !== "youtube_live_chat_api_source") {
    throw new ContractError(`${context}: invalid source kind`, {
      source_kind: status.source_kind,
    });
  }
  if (!YOUTUBE_API_INGEST_READINESS_STATUSES.has(status.ingest_readiness_status)) {
    throw new ContractError(`${context}: invalid ingest readiness status`, {
      ingest_readiness_status: status.ingest_readiness_status,
    });
  }
  for (const field of [
    "moderation_configured",
    "live_chat_id_configured",
    "video_id_configured",
    "live_chat_id_resolved",
    "has_next_page_token",
    "cursor_store_configured",
    "cursor_store_write_attention",
    "last_polling_interval_clamped",
    "last_error_operator_action_required",
    "has_retry_backoff",
  ]) {
    assertBoolean(status[field], `${context}: ${field}`, field);
  }
  for (const field of YOUTUBE_API_PUBLIC_STATUS_COUNT_FIELDS) {
    assertNonNegativeInteger(status[field], `${context}: ${field}`, field);
  }
  for (const field of YOUTUBE_API_PUBLIC_STATUS_OPTIONAL_NUMBER_FIELDS) {
    assertOptionalNonNegativeNumber(status[field], `${context}: ${field}`, field);
  }
  assertPollingIntervalPolicySafe(status.polling_interval_policy, context);
  assertErrorBackoffPolicySafe(status.error_backoff_policy, context);
  assertCountMapSafe(status.last_ignored_event_type_counts, IGNORED_MODERATION_EVENT_TYPES, context);
  assertCountMapSafe(status.ignored_event_type_counts, IGNORED_MODERATION_EVENT_TYPES, context);
  assertCountMapSafe(status.last_support_event_type_counts, SUPPORT_EVENT_TYPES, context);
  assertCountMapSafe(status.support_event_type_counts, SUPPORT_EVENT_TYPES, context);
  assertCountMapSafe(status.last_support_amount_source_counts, SUPPORT_AMOUNT_SOURCE_KINDS, context);
  assertCountMapSafe(status.support_amount_source_counts, SUPPORT_AMOUNT_SOURCE_KINDS, context);
  assertModerationReasonCountsSafe(status.last_moderation_reason_counts, context);
  assertModerationReasonCountsSafe(status.moderation_reason_counts, context);
  assertCursorWriteResultSafe(status.last_cursor_write_result, context);
  assertCursorStorePublicStatusSafe(status.cursor_store_status, context);
  assertOauthProviderStatusSafe(status.oauth_provider_status, context);
  if (status.last_error !== null && !YOUTUBE_API_SOURCE_ERROR_KINDS.has(status.last_error)) {
    throw new ContractError(`${context}: invalid last error`, { last_error: status.last_error });
  }
  if (status.last_error_retryable !== null && typeof status.last_error_retryable !== "boolean") {
    throw new ContractError(`${context}: invalid retryable flag`);
  }
  if (
    status.last_error_recovery_hint !== null &&
    !YOUTUBE_API_RECOVERY_HINTS.has(status.last_error_recovery_hint)
  ) {
    throw new ContractError(`${context}: invalid recovery hint`, {
      last_error_recovery_hint: status.last_error_recovery_hint,
    });
  }
  if (!YOUTUBE_API_AUTH_MODES.has(status.auth_mode)) {
    throw new ContractError(`${context}: invalid auth mode`, { auth_mode: status.auth_mode });
  }
  assertBoundaryPolicyFlags(status.boundary_policy, [
    "no_live_chat_id",
    "no_video_id",
    "no_page_token",
    "no_cursor_store_path",
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
  if (YOUTUBE_API_STATUS_URL_PATTERN.test(JSON.stringify(status))) {
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

function assertPollingIntervalPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: polling interval policy must be an object`);
  }
  assertNonNegativeInteger(policy.min_ms, `${context}: polling min`, "min_ms");
  assertNonNegativeInteger(policy.max_ms, `${context}: polling max`, "max_ms");
  if (policy.min_ms > policy.max_ms) {
    throw new ContractError(`${context}: invalid polling interval policy`);
  }
  if (policy.out_of_range_policy !== "clamp_without_exposing_raw_value") {
    throw new ContractError(`${context}: invalid polling interval policy label`);
  }
}

function assertErrorBackoffPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: error backoff policy must be an object`);
  }
  assertNonNegativeInteger(policy.base_backoff_ms, `${context}: backoff base`, "base_backoff_ms");
  assertNonNegativeInteger(policy.max_backoff_ms, `${context}: backoff max`, "max_backoff_ms");
  if (policy.base_backoff_ms > policy.max_backoff_ms) {
    throw new ContractError(`${context}: invalid error backoff policy`);
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

function assertCursorWriteResultSafe(value, context) {
  if (value === null) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: cursor write result must be an object`);
  }
  if (value.schema !== CURSOR_WRITE_RESULT_SCHEMA) {
    throw new ContractError(`${context}: invalid cursor write schema`);
  }
  assertBoolean(value.written, `${context}: cursor write written`, "written");
  if (value.reason !== null && !SAFE_CURSOR_WRITE_REASONS.has(value.reason)) {
    throw new ContractError(`${context}: invalid cursor write reason`);
  }
  assertOptionalNonNegativeNumber(value.write_count, `${context}: cursor write count`, "write_count");
  assertBoolean(value.write_error, `${context}: cursor write error`, "write_error");
  if (sanitizeStoreErrorKind(value.error_kind) !== value.error_kind) {
    throw new ContractError(`${context}: invalid cursor write error kind`);
  }
  assertBoundaryPolicyFlags(value.boundary_policy, [
    "no_page_token",
    "no_store_path",
    "no_backup_path",
    "no_secret_values",
    "summary_only",
  ], context);
  if (value.adapter_validation_required !== true) {
    throw new ContractError(`${context}: cursor write adapter validation required`);
  }
}

function assertCursorStorePublicStatusSafe(value, context) {
  if (value === null) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: cursor store status must be an object`);
  }
  if (value.schema !== CURSOR_STORE_STATUS_SCHEMA) {
    throw new ContractError(`${context}: invalid cursor store schema`);
  }
  for (const field of [
    "configured",
    "store_available",
    "read_error",
    "write_error",
    "has_persisted_page_token",
  ]) {
    assertBoolean(value[field], `${context}: cursor store ${field}`, field);
  }
  if (!SAFE_CURSOR_STORE_HEALTH_VALUES.has(value.health)) {
    throw new ContractError(`${context}: invalid cursor store health`);
  }
  if (sanitizeStoreErrorKind(value.error_kind) !== value.error_kind) {
    throw new ContractError(`${context}: invalid cursor store error kind`);
  }
  for (const field of ["read_count", "write_count", "last_read_at_ms", "last_write_at_ms"]) {
    assertOptionalNonNegativeNumber(value[field], `${context}: cursor store ${field}`, field);
  }
  assertCursorStoreDurabilitySafe(value.durability, context);
  assertBoundaryPolicyFlags(value.boundary_policy, [
    "no_page_token",
    "no_live_chat_id",
    "no_video_id",
    "no_store_path",
    "no_backup_path",
    "no_secret_values",
    "no_endpoint_values",
    "counts_only",
  ], context);
  if (value.adapter_validation_required !== true) {
    throw new ContractError(`${context}: cursor store adapter validation required`);
  }
}

function assertCursorStoreDurabilitySafe(durability, context) {
  if (!durability || typeof durability !== "object" || Array.isArray(durability)) {
    throw new ContractError(`${context}: cursor durability must be an object`);
  }
  for (const field of [
    "sidecar_backup_enabled",
    "backup_available",
    "recovered_from_backup",
    "backup_write_error",
    "no_backup_path",
  ]) {
    assertBoolean(durability[field], `${context}: cursor durability ${field}`, field);
  }
  if (!["idle", "ready", "attention"].includes(durability.backup_write_health)) {
    throw new ContractError(`${context}: invalid cursor backup write health`);
  }
  if (sanitizeStoreErrorKind(durability.backup_error_kind) !== durability.backup_error_kind) {
    throw new ContractError(`${context}: invalid cursor backup error kind`);
  }
  for (const field of [
    "backup_write_attempt_count",
    "backup_write_success_count",
    "backup_write_error_count",
  ]) {
    assertNonNegativeInteger(durability[field], `${context}: cursor durability ${field}`, field);
  }
  assertOptionalNonNegativeNumber(
    durability.last_backup_write_at_ms,
    `${context}: cursor durability last backup write`,
    "last_backup_write_at_ms"
  );
}

function assertOauthProviderStatusSafe(value, context) {
  if (value === null) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: OAuth provider status must be an object`);
  }
  if (value.schema !== "iris_youtube_oauth_token_provider_status_v1") {
    throw new ContractError(`${context}: invalid OAuth provider status schema`);
  }
  if (value.auth_mode !== "oauth_refresh") {
    throw new ContractError(`${context}: invalid OAuth provider auth mode`);
  }
  for (const field of [
    "configured",
    "cached_token_available",
    "refresh_in_flight",
  ]) {
    assertBoolean(value[field], `${context}: OAuth provider ${field}`, field);
  }
  for (const field of ["refresh_count", "cache_hit_count", "in_flight_join_count"]) {
    assertNonNegativeInteger(value[field], `${context}: OAuth provider ${field}`, field);
  }
  for (const field of ["last_refresh_at_ms", "expires_at_ms", "last_error_at_ms"]) {
    assertOptionalNonNegativeNumber(value[field], `${context}: OAuth provider ${field}`, field);
  }
  assertNonNegativeInteger(
    value.token_refresh_leeway_ms,
    `${context}: OAuth provider token refresh leeway`,
    "token_refresh_leeway_ms"
  );
  if (value.last_error !== null && !YOUTUBE_API_SOURCE_ERROR_KINDS.has(value.last_error)) {
    throw new ContractError(`${context}: invalid OAuth provider last error`);
  }
  assertBoundaryPolicyFlags(value.boundary_policy, [
    "no_secret_values",
    "no_access_token",
    "no_refresh_token",
    "no_endpoint_values",
    "env_names_only",
  ], context);
  if (value.adapter_validation_required !== true) {
    throw new ContractError(`${context}: OAuth provider adapter validation required`);
  }
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

function summarizeYouTubeApiIngestReadiness(status, { cursorStoreWriteAttention = false } = {}) {
  if (status.last_error_operator_action_required === true) {
    return "operator_action_required";
  }
  if (status.next_retry_after_ms) return "retry_backoff";
  if (cursorStoreWriteAttention === true) return "attention";
  if (status.last_error) return "attention";
  if (status.request_count <= 0) return "idle";
  if (status.next_poll_after_ms) return "polling_cooldown";
  return "active";
}

function readCursorStoreInitialPageToken(cursorStore) {
  if (!cursorStore || typeof cursorStore.readInitialPageToken !== "function") return "";
  try {
    return safeOptionalText(cursorStore.readInitialPageToken(), 512);
  } catch {
    return "";
  }
}

function persistCursorStorePageToken(cursorStore, pageToken) {
  if (!cursorStore || typeof cursorStore.writeNextPageToken !== "function") return null;
  try {
    return sanitizeCursorWriteResult(cursorStore.writeNextPageToken(pageToken));
  } catch {
    return sanitizeCursorWriteResult({
      schema: CURSOR_WRITE_RESULT_SCHEMA,
      written: false,
      reason: "cursor_store_write_failed",
      write_count: null,
      write_error: true,
      error_kind: "store_unavailable",
    });
  }
}

function readCursorStoreStatus(cursorStore) {
  if (!cursorStore || typeof cursorStore.status !== "function") return null;
  try {
    const status = cursorStore.status();
    if (!status || typeof status !== "object" || Array.isArray(status)) return null;
    return sanitizeCursorStoreStatus(status);
  } catch {
    return sanitizeCursorStoreStatus({
      schema: CURSOR_STORE_STATUS_SCHEMA,
      configured: true,
      health: "attention",
      store_available: false,
      read_error: true,
      write_error: false,
      error_kind: "store_unavailable",
      has_persisted_page_token: false,
      read_count: null,
      write_count: null,
      last_read_at_ms: null,
      last_write_at_ms: null,
      boundary_policy: {
        no_page_token: true,
        no_live_chat_id: true,
        no_video_id: true,
        no_store_path: true,
        no_secret_values: true,
        no_endpoint_values: true,
        counts_only: true,
      },
      adapter_validation_required: true,
    });
  }
}

function sanitizeCursorWriteResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const writeError = value.write_error === true;
  return {
    schema: CURSOR_WRITE_RESULT_SCHEMA,
    written: value.written === true,
    reason: safeCursorWriteReason(value.reason, writeError),
    write_count: safeOptionalNumber(value.write_count),
    write_error: writeError,
    error_kind: sanitizeStoreErrorKind(safeOptionalText(value.error_kind)),
    boundary_policy: {
      no_page_token: true,
      no_store_path: true,
      no_backup_path: true,
      no_secret_values: true,
      summary_only: true,
    },
    adapter_validation_required: true,
  };
}

function sanitizeCursorStoreStatus(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const durability =
    value.durability && typeof value.durability === "object" && !Array.isArray(value.durability)
      ? value.durability
      : {};
  return {
    schema: CURSOR_STORE_STATUS_SCHEMA,
    configured: value.configured === true,
    health: safeCursorStoreHealth(value.health),
    store_available:
      value.configured === true &&
      (value.read_error !== true || durability.recovered_from_backup === true),
    read_error: value.read_error === true,
    write_error: value.write_error === true,
    error_kind: sanitizeStoreErrorKind(safeOptionalText(value.error_kind)),
    has_persisted_page_token: value.has_persisted_page_token === true,
    read_count: safeOptionalNumber(value.read_count),
    write_count: safeOptionalNumber(value.write_count),
    last_read_at_ms: safeOptionalNumber(value.last_read_at_ms),
    last_write_at_ms: safeOptionalNumber(value.last_write_at_ms),
    durability: {
      sidecar_backup_enabled: durability.sidecar_backup_enabled === true,
      backup_available:
        safeNonNegativeInteger(durability.backup_write_success_count) > 0 ||
        durability.recovered_from_backup === true,
      recovered_from_backup: durability.recovered_from_backup === true,
      backup_write_health: safeCursorBackupWriteHealth(
        durability.backup_write_health,
        durability.backup_write_error === true
      ),
      backup_write_error: durability.backup_write_error === true,
      backup_error_kind: sanitizeStoreErrorKind(safeOptionalText(durability.backup_error_kind)),
      backup_write_attempt_count: safeNonNegativeInteger(
        durability.backup_write_attempt_count
      ),
      backup_write_success_count: safeNonNegativeInteger(
        durability.backup_write_success_count
      ),
      backup_write_error_count: safeNonNegativeInteger(durability.backup_write_error_count),
      last_backup_write_at_ms: safeOptionalNumber(durability.last_backup_write_at_ms),
      no_backup_path: true,
    },
    boundary_policy: {
      no_page_token: true,
      no_live_chat_id: true,
      no_video_id: true,
      no_store_path: true,
      no_backup_path: true,
      no_secret_values: true,
      no_endpoint_values: true,
      counts_only: true,
    },
    adapter_validation_required: true,
  };
}

function safeCursorStoreHealth(value) {
  const text = safeOptionalText(value);
  if (SAFE_CURSOR_STORE_HEALTH_VALUES.has(text)) return text;
  return "attention";
}

function safeCursorBackupWriteHealth(value, hasError) {
  const text = safeOptionalText(value);
  if (["idle", "ready", "attention"].includes(text)) return text;
  return hasError ? "attention" : "idle";
}

function safeCursorWriteReason(value, writeError) {
  const text = safeOptionalText(value);
  if (SAFE_CURSOR_WRITE_REASONS.has(text)) return text;
  return writeError ? "cursor_store_write_failed" : null;
}

async function ensureLiveChatIdWithBackoff({
  status,
  videoId,
  apiKey,
  oauthToken,
  videosEndpoint,
  timeoutMs,
  fetchImpl,
  nowMs,
  errorBackoffPolicy,
}) {
  try {
    return await ensureLiveChatId({
      status,
      videoId,
      apiKey,
      oauthToken,
      videosEndpoint,
      timeoutMs,
      fetchImpl,
      nowMs,
    });
  } catch (error) {
    markYouTubeApiFailure({ status, error, nowMs, errorBackoffPolicy });
    throw error;
  }
}

async function resolveOauthToken({ oauthToken, oauthTokenProvider, status }) {
  if (!oauthTokenProvider) return oauthToken;
  if (typeof oauthTokenProvider.getAccessToken !== "function") {
    throw new ContractError("YouTube live chat API source requires OAuth provider getAccessToken");
  }
  const token = await oauthTokenProvider.getAccessToken();
  status.oauth_provider_status = oauthTokenProvider.status?.() ?? null;
  return token;
}

async function resolveOauthTokenWithBackoff({
  oauthToken,
  oauthTokenProvider,
  status,
  nowMs,
  errorBackoffPolicy,
}) {
  try {
    return await resolveOauthToken({ oauthToken, oauthTokenProvider, status });
  } catch (error) {
    status.oauth_provider_status = oauthTokenProvider?.status?.() ?? status.oauth_provider_status;
    const summary = markYouTubeOauthRefreshFailure({
      status,
      error,
      nowMs,
      errorBackoffPolicy,
    });
    throw new ContractError("YouTube live chat OAuth refresh failed", {
      status: typeof error?.details?.status === "number" ? error.details.status : undefined,
      response_kind: "omitted",
      error_kind: toYouTubeOauthRefreshDetailKind(summary.error_kind),
      retryable: summary.retryable,
      operator_action_required: summary.operator_action_required,
      recovery_hint: summary.recovery_hint,
    });
  }
}

async function ensureLiveChatId({
  status,
  videoId,
  apiKey,
  oauthToken,
  videosEndpoint,
  timeoutMs,
  fetchImpl,
  nowMs,
}) {
  if (status.live_chat_id) return status.live_chat_id;
  status.request_count += 1;
  status.video_discovery_request_count += 1;
  const liveChatId = await resolveLiveChatIdFromVideo({
    endpoint: videosEndpoint,
    videoId,
    apiKey,
    oauthToken,
    timeoutMs,
    fetchImpl,
    nowMs,
  });
  status.live_chat_id = liveChatId;
  status.live_chat_id_resolved = true;
  return liveChatId;
}

async function resolveLiveChatIdFromVideo({
  endpoint,
  videoId,
  apiKey,
  oauthToken,
  timeoutMs,
  fetchImpl,
  nowMs,
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = buildVideosUrl({ endpoint, videoId, apiKey });
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(oauthToken ? { authorization: `Bearer ${oauthToken}` } : {}),
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorDetails = await createYouTubeApiHttpErrorDetails(response, { nowMs });
      throw new ContractError("YouTube video live chat discovery request failed", {
        ...errorDetails,
      });
    }
    const responseText = await response.text();
    const parsed = parseJsonResponse(responseText);
    assertYouTubeApiPayloadSafe(parsed, "YouTube video discovery response");
    const liveChatId = resolveDiscoveredLiveChatId(parsed);
    if (!liveChatId) {
      throw new ContractError("YouTube video has no active live chat id", {
        response_kind: "omitted",
        error_kind: "no_active_live_chat",
        retryable: true,
        operator_action_required: false,
        recovery_hint: youtubeApiRecoveryHint("no_active_live_chat"),
      });
    }
    return liveChatId;
  } finally {
    clearTimeout(timer);
  }
}

function resolveDiscoveredLiveChatId(parsed) {
  const wrapper = firstYouTubeObjectWithItems(parsed);
  const item = firstYouTubeVideoDiscoveryItem(wrapper);
  const details = item?.liveStreamingDetails ?? {};
  return safeOptionalText(
    details.activeLiveChatId ??
      details.active_live_chat_id ??
      details.liveChatId ??
      details.live_chat_id ??
      item?.activeLiveChatId ??
      item?.active_live_chat_id ??
      item?.liveChatId ??
      item?.live_chat_id ??
      parsed?.activeLiveChatId ??
      parsed?.active_live_chat_id ??
      parsed?.liveChatId ??
      parsed?.live_chat_id ??
      parsed?.data?.activeLiveChatId ??
      parsed?.data?.active_live_chat_id ??
      parsed?.data?.liveChatId ??
      parsed?.data?.live_chat_id ??
      wrapper?.activeLiveChatId ??
      wrapper?.active_live_chat_id ??
      wrapper?.liveChatId ??
      wrapper?.live_chat_id
  );
}

function firstYouTubeObjectWithItems(parsed) {
  for (const source of youtubeApiResponseObjects(parsed)) {
    if (
      Array.isArray(source.items) ||
      Array.isArray(source.videos) ||
      Array.isArray(source.videoItems) ||
      Array.isArray(source.video_items)
    ) return source;
  }
  return parsed && typeof parsed === "object" ? parsed : {};
}

function firstYouTubeVideoDiscoveryItem(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  for (const field of ["items", "videos", "videoItems", "video_items", "results"]) {
    if (Array.isArray(value[field]) && value[field][0] && typeof value[field][0] === "object") {
      return value[field][0];
    }
  }
  if (value.video && typeof value.video === "object" && !Array.isArray(value.video)) return value.video;
  return {};
}

function resolveNextPageToken(parsed, fallbackPageToken = "") {
  const wrapped = youtubeApiResponseObjects(parsed);
  return safeOptionalText(
    firstWrappedYouTubeValue(wrapped, [
      "nextPageToken",
      "next_page_token",
      "next_page",
      "pageToken",
      "page_token",
      "cursor",
      "nextCursor",
      "next_cursor",
    ]) ??
      fallbackPageToken
  );
}

function resolvePollingIntervalValue(parsed) {
  const wrapped = youtubeApiResponseObjects(parsed);
  const millisecondValue =
    firstWrappedYouTubeValue(wrapped, [
      "pollingIntervalMillis",
      "polling_interval_millis",
      "polling_interval_ms",
      "pollingIntervalMs",
      "pollingInterval",
      "polling_interval",
    ]);
  if (millisecondValue !== undefined && millisecondValue !== null && millisecondValue !== "") {
    return millisecondValue;
  }

  const secondValue =
    firstWrappedYouTubeValue(wrapped, [
      "pollingIntervalSeconds",
      "polling_interval_seconds",
      "polling_seconds",
      "pollingSeconds",
    ]);
  const seconds = safeOptionalNumber(secondValue);
  return seconds === null ? undefined : Math.trunc(seconds * 1000);
}

function youtubeApiResponseObjects(parsed) {
  return [
    parsed,
    parsed?.data,
    parsed?.payload,
    parsed?.result,
    parsed?.response,
    parsed?.body,
  ].filter((value) => value && typeof value === "object" && !Array.isArray(value));
}

function firstWrappedYouTubeValue(objects, fields) {
  for (const object of objects) {
    for (const field of fields) {
      if (object[field] !== undefined && object[field] !== null && object[field] !== "") {
        return object[field];
      }
    }
  }
  return undefined;
}

async function fetchLiveChatBatch({
  endpoint,
  liveChatId,
  apiKey,
  oauthToken,
  pageToken,
  timeoutMs,
  maxResults,
  fetchImpl,
  status,
  nowMs,
  seenItemIds,
  seenItemOrder,
  dedupeLimit,
  moderationFilter,
  errorBackoffPolicy,
  cursorStore,
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    status.request_count += 1;
    status.live_chat_request_count += 1;
    const url = buildLiveChatUrl({ endpoint, liveChatId, apiKey, pageToken, maxResults });
      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(oauthToken ? { authorization: `Bearer ${oauthToken}` } : {}),
        },
        signal: controller.signal,
      });
      if (response.status === 204) {
        recordEmptyYouTubeApiBatch(status, { nowMs });
        return [];
      }
      if (!response.ok) {
        const errorDetails = await createYouTubeApiHttpErrorDetails(response, { nowMs });
        throw new ContractError("YouTube live chat API request failed", {
          ...errorDetails,
        });
    }
    const responseText = await response.text();
    const parsed = parseJsonResponse(responseText);
    assertYouTubeApiPayloadSafe(parsed, "YouTube live chat API response");
    assertYouTubeLiveChatApiResponseAccepted(parsed);
    status.next_page_token = resolveNextPageToken(parsed, pageToken);
    status.last_cursor_write_result = persistCursorStorePageToken(
      cursorStore,
      status.next_page_token
    );
    const pollingInterval = normalizePollingIntervalMs(resolvePollingIntervalValue(parsed));
    status.polling_interval_ms = pollingInterval.interval_ms;
    status.last_polling_interval_clamped = pollingInterval.clamped;
    status.last_poll_at_ms = nowMs();
    status.next_poll_after_ms =
      status.polling_interval_ms === null ? null : status.last_poll_at_ms + status.polling_interval_ms;
    const rawItems = extractApiItems(parsed);
    const { freshItems, duplicateCount } = filterDuplicateApiItems(rawItems, {
      seenItemIds,
      seenItemOrder,
      dedupeLimit,
    });
    status.last_item_count = rawItems.length;
    status.last_error = null;
    status.last_error_retryable = null;
    status.last_error_operator_action_required = false;
    status.last_error_recovery_hint = null;
    status.last_error_retry_after_ms = null;
    const converted = freshItems.map(toRuntimeEvent);
    const candidateEvents = converted.filter(Boolean);
    const moderationIgnored = converted.length - candidateEvents.length;
    const ignoredEventTypeCounts = createIgnoredEventTypeCounts(freshItems);
    const moderated = applyYouTubeModeration(candidateEvents, moderationFilter);
    const events = moderated.events;
    const ignored = moderationIgnored + duplicateCount + moderated.filtered_count;
    const commentCount = events.filter((event) => event.source === "youtube_live_chat").length;
    const supportEventCount = events.filter(
      (event) => event.payload?.payload_kind === "donation_event"
    ).length;
    const supportEventTypeCounts = createSupportEventTypeCounts(events);
    const supportAmountSourceCounts = createSupportAmountSourceCounts(events);
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
    status.last_error_retryable = null;
    status.last_error_operator_action_required = false;
    status.last_error_recovery_hint = null;
    status.last_error_retry_after_ms = null;
    status.consecutive_error_count = 0;
    status.next_retry_after_ms = null;
    return events;
  } catch (error) {
    markYouTubeApiFailure({ status, error, nowMs, errorBackoffPolicy });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function assertYouTubeLiveChatApiResponseAccepted(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
  const responseStatus = safeText(
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
      responseStatus
    )
  ) {
    throw new ContractError("YouTube live chat API response reported failure", {
      status: 200,
      response_kind: "omitted",
      error_detail_kind: "http_status",
      retryable: true,
      operator_action_required: false,
      recovery_hint: "inspect_upstream_response_contract",
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

function recordEmptyYouTubeApiBatch(status, { nowMs }) {
  status.last_poll_at_ms = nowMs();
  status.next_poll_after_ms = null;
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
  status.last_error_retryable = null;
  status.last_error_operator_action_required = false;
  status.last_error_recovery_hint = null;
  status.last_error_retry_after_ms = null;
  status.consecutive_error_count = 0;
  status.next_retry_after_ms = null;
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
  const type = safeText(
    firstPresentValue(
      snippet.type,
      snippet.payloadKind,
      snippet.payload_kind,
      snippet.kind,
      snippet.event_type,
      snippet.event_kind,
      snippet.eventKind,
      raw.type,
      raw.payloadKind,
      raw.payload_kind,
      raw.kind,
      raw.event_type,
      raw.event_kind,
      raw.eventKind
    ) ?? "",
    80
  );
  const normalizedType = normalizeIgnoredModerationEventType(type);
  if (normalizedType) return normalizedType;
  if (
    hasObjectValue(snippet.messageDeletedDetails) ||
    hasObjectValue(snippet.message_deleted_details) ||
    hasObjectValue(snippet.deletedMessageDetails) ||
    hasObjectValue(snippet.deleted_message_details) ||
    hasObjectValue(raw.messageDeletedDetails) ||
    hasObjectValue(raw.message_deleted_details) ||
    hasObjectValue(raw.deletedMessageDetails) ||
    hasObjectValue(raw.deleted_message_details)
  ) {
    return "messageDeletedEvent";
  }
  if (
    hasValue(snippet.deletedMessageId) ||
    hasValue(snippet.deleted_message_id) ||
    hasValue(raw.deletedMessageId) ||
    hasValue(raw.deleted_message_id)
  ) {
    return "messageDeletedEvent";
  }
  if (
    hasObjectValue(snippet.userBannedDetails) ||
    hasObjectValue(snippet.user_banned_details) ||
    hasObjectValue(snippet.bannedUserDetails) ||
    hasObjectValue(snippet.banned_user_details) ||
    hasObjectValue(raw.userBannedDetails) ||
    hasObjectValue(raw.user_banned_details) ||
    hasObjectValue(raw.bannedUserDetails) ||
    hasObjectValue(raw.banned_user_details)
  ) {
    return "userBannedEvent";
  }
  if (
    hasValue(snippet.bannedUserId) ||
    hasValue(snippet.banned_user_id) ||
    hasValue(snippet.bannedUserChannelId) ||
    hasValue(snippet.banned_user_channel_id) ||
    hasValue(snippet.userBannedId) ||
    hasValue(snippet.user_banned_id) ||
    hasValue(raw.bannedUserId) ||
    hasValue(raw.banned_user_id) ||
    hasValue(raw.bannedUserChannelId) ||
    hasValue(raw.banned_user_channel_id) ||
    hasValue(raw.userBannedId) ||
    hasValue(raw.user_banned_id)
  ) {
    return "userBannedEvent";
  }
  if (
    hasObjectValue(snippet.tombstoneDetails) ||
    hasObjectValue(snippet.tombstone_details) ||
    hasObjectValue(raw.tombstoneDetails) ||
    hasObjectValue(raw.tombstone_details)
  ) {
    return "tombstone";
  }
  if (
    hasValue(snippet.tombstoneId) ||
    hasValue(snippet.tombstone_id) ||
    hasValue(raw.tombstoneId) ||
    hasValue(raw.tombstone_id)
  ) {
    return "tombstone";
  }
  if (
    hasObjectValue(snippet.moderationDetails) ||
    hasObjectValue(snippet.moderation_details) ||
    hasObjectValue(snippet.moderationActionDetails) ||
    hasObjectValue(snippet.moderation_action_details) ||
    hasObjectValue(snippet.moderatorActionDetails) ||
    hasObjectValue(snippet.moderator_action_details) ||
    hasObjectValue(raw.moderationDetails) ||
    hasObjectValue(raw.moderation_details) ||
    hasObjectValue(raw.moderationActionDetails) ||
    hasObjectValue(raw.moderation_action_details) ||
    hasObjectValue(raw.moderatorActionDetails) ||
    hasObjectValue(raw.moderator_action_details)
  ) {
    return "moderationEvent";
  }
  if (
    hasValue(snippet.moderationActionId) ||
    hasValue(snippet.moderation_action_id) ||
    hasValue(snippet.moderationId) ||
    hasValue(snippet.moderation_id) ||
    hasValue(snippet.moderatorActionId) ||
    hasValue(snippet.moderator_action_id) ||
    hasValue(raw.moderationActionId) ||
    hasValue(raw.moderation_action_id) ||
    hasValue(raw.moderationId) ||
    hasValue(raw.moderation_id) ||
    hasValue(raw.moderatorActionId) ||
    hasValue(raw.moderator_action_id)
  ) {
    return "moderationEvent";
  }
  if (
    hasValue(snippet.moderationReason) ||
    hasValue(snippet.moderation_reason) ||
    hasValue(snippet.moderationActionType) ||
    hasValue(snippet.moderation_action_type) ||
    hasValue(snippet.moderatorAction) ||
    hasValue(snippet.moderator_action) ||
    hasValue(snippet.moderatorActionType) ||
    hasValue(snippet.moderator_action_type) ||
    hasValue(raw.moderationReason) ||
    hasValue(raw.moderation_reason) ||
    hasValue(raw.moderationActionType) ||
    hasValue(raw.moderation_action_type) ||
    hasValue(raw.moderatorAction) ||
    hasValue(raw.moderator_action) ||
    hasValue(raw.moderatorActionType) ||
    hasValue(raw.moderator_action_type)
  ) {
    return "moderationEvent";
  }
  return "";
}

function normalizeIgnoredModerationEventType(value) {
  const explicit = safeText(value, 80);
  if (IGNORED_MODERATION_EVENT_TYPES.has(explicit)) return explicit;
  const key = normalizeLooseKind(explicit);
  return IGNORED_MODERATION_EVENT_TYPE_ALIASES.get(key) ?? IGNORED_MODERATION_EVENT_TYPE_ALIASES.get(key.replace(/_event$/, "")) ?? "";
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

function markYouTubeApiFailure({ status, error, nowMs, errorBackoffPolicy }) {
  const summary = summarizeYouTubeApiError(error);
  status.last_error = summary.error_kind;
  status.last_error_retryable = summary.retryable;
  status.last_error_operator_action_required = summary.operator_action_required;
  status.last_error_recovery_hint = summary.recovery_hint;
  status.last_error_retry_after_ms = summary.retry_after_ms;
  applyErrorBackoff({
    status,
    nowMs,
    errorBackoffPolicy,
    preferredBackoffMs: summary.retry_after_ms,
    scheduleRetry: summary.retryable !== false && summary.operator_action_required !== true,
  });
}

function markYouTubeOauthRefreshFailure({ status, error, nowMs, errorBackoffPolicy }) {
  const summary = summarizeYouTubeOauthRefreshError(error);
  status.last_error = summary.error_kind;
  status.last_error_retryable = summary.retryable;
  status.last_error_operator_action_required = summary.operator_action_required;
  status.last_error_recovery_hint = summary.recovery_hint;
  status.last_error_retry_after_ms = null;
  applyErrorBackoff({
    status,
    nowMs,
    errorBackoffPolicy,
    scheduleRetry: summary.retryable !== false && summary.operator_action_required !== true,
  });
  return summary;
}

function summarizeYouTubeOauthRefreshError(error) {
  const status = typeof error?.details?.status === "number" ? error.details.status : null;
  const errorKind = classifyYouTubeOauthRefreshSourceError(error, status);
  const retryable = isYouTubeOauthRefreshRetryable(errorKind, status);
  const operatorActionRequired = isYouTubeOauthRefreshOperatorActionRequired(errorKind, status);
  return {
    error_kind: errorKind,
    retryable,
    operator_action_required: operatorActionRequired,
    recovery_hint: operatorActionRequired ? "check_youtube_credentials" : "retry_after_backoff",
  };
}

function classifyYouTubeOauthRefreshSourceError(error, status) {
  if (error?.name === "AbortError") return "youtube_oauth_refresh_timeout";
  if (error instanceof ContractError) {
    if (typeof status === "number") {
      if ([400, 401, 403].includes(status)) return "youtube_oauth_refresh_auth_required";
      if (status === 429) return "youtube_oauth_refresh_quota_or_rate_limited";
      return "youtube_oauth_refresh_http_status";
    }
    const message = String(error.message ?? "");
    if (message.includes("must be JSON")) return "youtube_oauth_refresh_invalid_json";
    if (message.includes("unsafe OAuth refresh response field")) {
      return "youtube_oauth_refresh_unsafe_response";
    }
    if (message.includes("missing access token")) {
      return "youtube_oauth_refresh_missing_access_token";
    }
    return "youtube_oauth_refresh_contract_error";
  }
  return "youtube_oauth_refresh_request_error";
}

function isYouTubeOauthRefreshRetryable(errorKind, status) {
  if (
    errorKind === "youtube_oauth_refresh_timeout" ||
    errorKind === "youtube_oauth_refresh_request_error" ||
    errorKind === "youtube_oauth_refresh_quota_or_rate_limited"
  ) {
    return true;
  }
  if (errorKind === "youtube_oauth_refresh_http_status") {
    return status >= 500 || status === 408 || status === 425;
  }
  return false;
}

function isYouTubeOauthRefreshOperatorActionRequired(errorKind) {
  return [
    "youtube_oauth_refresh_auth_required",
    "youtube_oauth_refresh_invalid_json",
    "youtube_oauth_refresh_unsafe_response",
    "youtube_oauth_refresh_missing_access_token",
    "youtube_oauth_refresh_contract_error",
  ].includes(errorKind);
}

function toYouTubeOauthRefreshDetailKind(errorKind) {
  const text = safeOptionalText(errorKind, 120);
  if (text.startsWith("youtube_")) return text.slice("youtube_".length);
  return text || "oauth_refresh_request_error";
}

function summarizeYouTubeApiError(error) {
  const errorKind = classifyYouTubeApiError(error);
  const detailKind = normalizeYouTubeApiDetailErrorKind(error?.details?.error_kind);
  const status = typeof error?.details?.status === "number" ? error.details.status : null;
  const retryable =
    typeof error?.details?.retryable === "boolean"
      ? error.details.retryable
      : isYouTubeApiErrorRetryable({ errorKind, detailKind, status });
  const operatorActionRequired =
    typeof error?.details?.operator_action_required === "boolean"
      ? error.details.operator_action_required
      : isYouTubeApiOperatorActionRequired({ errorKind, detailKind });
  return {
    error_kind: errorKind,
    retryable,
    operator_action_required: operatorActionRequired,
    recovery_hint: youtubeApiRecoveryHint(detailKind || errorKind),
    retry_after_ms: safeRetryAfterMs(error?.details?.retry_after_ms),
  };
}

function classifyYouTubeApiError(error) {
  if (error?.name === "AbortError") return "youtube_live_chat_api_timeout";
  if (error instanceof ContractError) {
    const detailKind = normalizeYouTubeApiDetailErrorKind(error.details?.error_kind);
    if (YOUTUBE_API_SOURCE_ERROR_KIND_BY_DETAIL.has(detailKind)) {
      return YOUTUBE_API_SOURCE_ERROR_KIND_BY_DETAIL.get(detailKind);
    }
    if (typeof error.details?.status === "number") {
      return "youtube_live_chat_api_http_status";
    }
    if (String(error.message ?? "").includes("requires JSON")) {
      return "youtube_live_chat_api_invalid_json";
    }
    if (String(error.message ?? "").includes("read-only")) {
      return "youtube_live_chat_api_unsafe_payload";
    }
    return "youtube_live_chat_api_contract_error";
  }
  return "youtube_live_chat_api_request_error";
}

async function createYouTubeApiHttpErrorDetails(response, { nowMs = () => Date.now() } = {}) {
  const status = clampInteger(response?.status, 0, 999, 0);
  const reasonKind = await readYouTubeApiErrorReasonKind(response);
  const errorKind = classifyYouTubeApiHttpErrorKind({ status, reasonKind });
  return {
    status,
    response_kind: "omitted",
    error_kind: errorKind,
    retryable: isYouTubeApiDetailRetryable(errorKind, status),
    operator_action_required: YOUTUBE_API_OPERATOR_ACTION_DETAIL_KINDS.has(errorKind),
    recovery_hint: youtubeApiRecoveryHint(errorKind),
    youtube_error_reason_known: reasonKind !== "",
    retry_after_ms: readRetryAfterMs(response, nowMs),
  };
}

async function readYouTubeApiErrorReasonKind(response) {
  if (!response || typeof response.text !== "function") return "";
  try {
    const raw = String(await response.text()).slice(0, YOUTUBE_API_ERROR_BODY_MAX_CHARS);
    if (!raw.trim()) return "";
    const parsed = JSON.parse(raw);
    const candidates = collectYouTubeApiErrorReasonCandidates(parsed);
    for (const candidate of candidates) {
      const normalized = normalizeYouTubeApiReason(candidate);
      const mapped = YOUTUBE_API_DETAIL_ERROR_KIND_BY_REASON.get(normalized);
      if (mapped) return mapped;
    }
  } catch {
    return "";
  }
  return "";
}

function collectYouTubeApiErrorReasonCandidates(value, candidates = [], depth = 0) {
  if (!value || depth > 5) return candidates;
  if (Array.isArray(value)) {
    for (const item of value) {
      collectYouTubeApiErrorReasonCandidates(item, candidates, depth + 1);
    }
    return candidates;
  }
  if (typeof value !== "object") return candidates;
  for (const [field, child] of Object.entries(value)) {
    if (["reason", "status", "error"].includes(field) && typeof child === "string") {
      candidates.push(child);
      continue;
    }
    if (["error", "errors"].includes(field) || typeof child === "object") {
      collectYouTubeApiErrorReasonCandidates(child, candidates, depth + 1);
    }
  }
  return candidates;
}

function classifyYouTubeApiHttpErrorKind({ status, reasonKind }) {
  const safeReasonKind = normalizeYouTubeApiDetailErrorKind(reasonKind);
  if (safeReasonKind) return safeReasonKind;
  if (status === 401) return "auth_required";
  if (status === 404) return "not_found";
  if (status === 429) return "quota_or_rate_limited";
  return "http_status";
}

function normalizeYouTubeApiReason(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeYouTubeApiDetailErrorKind(value) {
  const text = safeOptionalText(value, 80);
  if (!text) return "";
  if (YOUTUBE_API_SOURCE_ERROR_KIND_BY_DETAIL.has(text)) return text;
  if (text.startsWith("youtube_live_chat_api_")) {
    const detailKind = text.slice("youtube_live_chat_api_".length);
    if (YOUTUBE_API_SOURCE_ERROR_KIND_BY_DETAIL.has(detailKind)) return detailKind;
  }
  return "";
}

function isYouTubeApiErrorRetryable({ errorKind, detailKind, status }) {
  if (detailKind) return isYouTubeApiDetailRetryable(detailKind, status);
  if (
    errorKind === "youtube_live_chat_api_timeout" ||
    errorKind === "youtube_live_chat_api_request_error"
  ) {
    return true;
  }
  if (
    errorKind === "youtube_live_chat_api_invalid_json" ||
    errorKind === "youtube_live_chat_api_unsafe_payload"
  ) {
    return false;
  }
  return true;
}

function isYouTubeApiDetailRetryable(detailKind, status) {
  if (detailKind === "quota_or_rate_limited" || detailKind === "no_active_live_chat") {
    return true;
  }
  if (YOUTUBE_API_OPERATOR_ACTION_DETAIL_KINDS.has(detailKind)) return false;
  if (detailKind === "http_status") {
    return status >= 500 || status === 408 || status === 425;
  }
  return true;
}

function isYouTubeApiOperatorActionRequired({ errorKind, detailKind }) {
  if (YOUTUBE_API_OPERATOR_ACTION_DETAIL_KINDS.has(detailKind)) return true;
  return [
    "youtube_live_chat_api_auth_required",
    "youtube_live_chat_api_live_chat_ended",
    "youtube_live_chat_api_chat_disabled",
    "youtube_live_chat_api_not_found",
  ].includes(errorKind);
}

function youtubeApiRecoveryHint(kind) {
  switch (kind) {
    case "quota_or_rate_limited":
    case "youtube_live_chat_api_quota_or_rate_limited":
      return "wait_or_reduce_polling";
    case "auth_required":
    case "youtube_live_chat_api_auth_required":
      return "check_youtube_credentials";
    case "live_chat_ended":
    case "youtube_live_chat_api_live_chat_ended":
      return "select_active_stream";
    case "chat_disabled":
    case "youtube_live_chat_api_chat_disabled":
      return "enable_live_chat_or_select_stream";
    case "not_found":
    case "youtube_live_chat_api_not_found":
      return "check_live_chat_or_video_id";
    case "no_active_live_chat":
    case "youtube_live_chat_api_no_active_live_chat":
      return "wait_for_live_stream";
    case "youtube_live_chat_api_invalid_json":
    case "youtube_live_chat_api_unsafe_payload":
      return "inspect_upstream_response_contract";
    default:
      return "retry_after_backoff";
  }
}

function shouldWaitForPollingInterval({ status, respectPollingInterval, nowMs }) {
  if (!respectPollingInterval) return false;
  if (!status.next_poll_after_ms) return false;
  return nowMs() < status.next_poll_after_ms;
}

function shouldWaitForErrorBackoff({ status, nowMs }) {
  if (!status.next_retry_after_ms) return false;
  return nowMs() < status.next_retry_after_ms;
}

function shouldPauseForOperatorAction(status) {
  return (
    status.last_error_operator_action_required === true &&
    status.last_error_retryable === false
  );
}

function applyErrorBackoff({
  status,
  nowMs,
  errorBackoffPolicy,
  preferredBackoffMs = null,
  scheduleRetry = true,
}) {
  const failedAtMs = nowMs();
  const nextCount = clampInteger(status.consecutive_error_count + 1, 1, 1000, 1);
  const baseBackoffMs = clampInteger(errorBackoffPolicy?.base_backoff_ms ?? 0, 0, 3_600_000, 0);
  const maxBackoffMs = clampInteger(
    errorBackoffPolicy?.max_backoff_ms ?? baseBackoffMs,
    0,
    24 * 3_600_000,
    baseBackoffMs
  );
  const backoffMs =
    baseBackoffMs <= 0
      ? 0
      : Math.min(maxBackoffMs, baseBackoffMs * 2 ** Math.min(nextCount - 1, 16));
  const retryAfterMs = safeRetryAfterMs(preferredBackoffMs);
  const effectiveBackoffMs =
    retryAfterMs === null ? backoffMs : Math.min(maxBackoffMs, Math.max(backoffMs, retryAfterMs));
  status.last_error_at_ms = failedAtMs;
  status.consecutive_error_count = nextCount;
  status.next_retry_after_ms =
    scheduleRetry && effectiveBackoffMs > 0 ? failedAtMs + effectiveBackoffMs : null;
}

function readRetryAfterMs(response, nowMs) {
  const raw = readResponseHeader(response, "retry-after");
  if (!raw) return null;
  const text = String(raw).trim().slice(0, 120);
  if (!text) return null;
  const seconds = Number(text);
  if (Number.isFinite(seconds)) {
    return safeRetryAfterMs(seconds * 1000);
  }
  const dateMs = Date.parse(text);
  if (!Number.isFinite(dateMs)) return null;
  return safeRetryAfterMs(dateMs - nowMs());
}

function readResponseHeader(response, name) {
  const headers = response?.headers;
  if (!headers) return "";
  if (typeof headers.get === "function") {
    return headers.get(name) ?? headers.get(name.toLowerCase()) ?? headers.get(name.toUpperCase()) ?? "";
  }
  if (typeof headers === "object") {
    return headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()] ?? "";
  }
  return "";
}

function safeRetryAfterMs(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(RETRY_AFTER_MAX_MS, Math.trunc(number)));
}

function normalizePollingIntervalMs(value) {
  if (value === undefined || value === null || value === "") {
    return { interval_ms: null, clamped: false };
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return { interval_ms: null, clamped: false };
  }
  const integer = Math.trunc(number);
  const clamped = Math.max(
    POLLING_INTERVAL_MIN_MS,
    Math.min(POLLING_INTERVAL_MAX_MS, integer)
  );
  return {
    interval_ms: clamped,
    clamped: clamped !== integer,
  };
}

function buildLiveChatUrl({ endpoint, liveChatId, apiKey, pageToken, maxResults }) {
  const url = new URL(endpoint);
  url.searchParams.set("liveChatId", liveChatId);
  url.searchParams.set("part", "snippet,authorDetails");
  url.searchParams.set("maxResults", String(clampInteger(maxResults, 1, 200, 200)));
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  if (apiKey) url.searchParams.set("key", apiKey);
  return url;
}

function buildVideosUrl({ endpoint, videoId, apiKey }) {
  const url = new URL(endpoint);
  url.searchParams.set("id", videoId);
  url.searchParams.set("part", "liveStreamingDetails");
  if (apiKey) url.searchParams.set("key", apiKey);
  return url;
}

function parseJsonResponse(text) {
  const raw = String(text ?? "");
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new ContractError("YouTube live chat API source requires JSON response");
  }
}

function extractApiItems(parsed) {
  if (!parsed) return [];
  for (const source of [
    parsed,
    parsed.data,
    parsed.payload,
    parsed.result,
    parsed.response,
    parsed.body,
  ]) {
    const items = extractApiItemsFromObject(source);
    if (items) return items;
  }
  if (isApiItemObject(parsed.item)) return [parsed.item];
  if (isApiItemObject(parsed.comment)) return [parsed.comment];
  if (isApiItemObject(parsed.message)) return [parsed.message];
  if (isApiItemObject(parsed.event)) return [parsed.event];
  if (isApiItemObject(parsed.entry)) return [parsed.entry];
  if (isApiItemObject(parsed.result)) return [parsed.result];
  if (isStandaloneApiItemObject(parsed)) return [parsed];
  return [];
}

function extractApiItemsFromObject(value) {
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
    "liveChatMessages",
    "live_chat_messages",
  ]) {
    if (Array.isArray(value[field])) return value[field];
  }
  if (value.liveChat && typeof value.liveChat === "object") return extractApiItems(value.liveChat);
  if (value.live_chat && typeof value.live_chat === "object") return extractApiItems(value.live_chat);
  for (const field of ["item", "comment", "message", "event", "entry", "result"]) {
    if (isApiItemObject(value[field])) return [value[field]];
  }
  return null;
}

function isApiItemObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isStandaloneApiItemObject(value) {
  if (!isApiItemObject(value)) return false;
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

function filterDuplicateApiItems(items, { seenItemIds, seenItemOrder, dedupeLimit }) {
  if (!Array.isArray(items) || dedupeLimit <= 0) {
    return { freshItems: Array.isArray(items) ? items : [], duplicateCount: 0 };
  }
  const freshItems = [];
  let duplicateCount = 0;
  for (const item of items) {
    const itemId = apiItemId(item);
    if (!itemId) {
      freshItems.push(item);
      continue;
    }
    if (seenItemIds.has(itemId)) {
      duplicateCount += 1;
      continue;
    }
    seenItemIds.add(itemId);
    seenItemOrder.push(itemId);
    freshItems.push(item);
    while (seenItemOrder.length > dedupeLimit) {
      const oldest = seenItemOrder.shift();
      if (oldest) seenItemIds.delete(oldest);
    }
  }
  return { freshItems, duplicateCount };
}

function apiItemId(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "";
  const snippet = raw.snippet && typeof raw.snippet === "object" ? raw.snippet : {};
  return safeOptionalText(
    raw.id ??
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
      snippet.id
  );
}

function toRuntimeEvent(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ContractError("YouTube live chat API item must be an object");
  }
  const snippet = raw.snippet && typeof raw.snippet === "object" ? raw.snippet : {};
  if (ignoredModerationEventType(raw)) return null;
  const supportSnippet = isSupportEvent(snippet) ? snippet : raw;
  if (isSupportEvent(supportSnippet)) {
    return normalizeYouTubeDonation(toDonationInput(raw, supportSnippet));
  }
  const comment = toCommentInput(raw, snippet);
  if (!comment.text) return null;
  return normalizeYouTubeComment(comment);
}

function toCommentInput(raw, snippet) {
  const authorDetails =
    raw.authorDetails && typeof raw.authorDetails === "object"
      ? raw.authorDetails
      : raw.author_details && typeof raw.author_details === "object"
        ? raw.author_details
      : snippet.authorDetails && typeof snippet.authorDetails === "object"
        ? snippet.authorDetails
        : snippet.author_details && typeof snippet.author_details === "object"
          ? snippet.author_details
        : {};
  const publishedAt = firstPresentValue(
    raw.published_at,
    raw.publishedAt,
    raw.created_at,
    raw.createdAt,
    snippet.published_at,
    snippet.publishedAt,
    snippet.created_at,
    snippet.createdAt
  );
  const explicitTimestampMs = safeOptionalNumber(
    firstPresentValue(raw.timestamp_ms, raw.timestampMs, snippet.timestamp_ms, snippet.timestampMs)
  );
  const timestampMs = Number.isFinite(explicitTimestampMs)
    ? explicitTimestampMs
    : publishedAt
      ? Date.parse(String(publishedAt))
      : undefined;
  const comment = {
    trace_id: firstPresentValue(raw.trace_id, raw.traceId, snippet.trace_id, snippet.traceId),
    event_id: firstPresentValue(raw.event_id, raw.eventId, raw.id, snippet.event_id, snippet.eventId, snippet.id),
    platform_event_id: firstPresentValue(
      raw.platform_event_id,
      raw.platformEventId,
      raw.event_id,
      raw.eventId,
      raw.id,
      snippet.platform_event_id,
      snippet.platformEventId,
      snippet.event_id,
      snippet.eventId,
      snippet.id
    ),
    author_channel_id: safeOptionalText(
      authorDetails.channelId ??
        authorDetails.channel_id ??
        raw.author_channel_id ??
        raw.authorChannelId ??
        snippet.author_channel_id ??
        snippet.authorChannelId
    ) || "unknown",
    display_name: safeText(
      authorDetails.displayName ??
        authorDetails.display_name ??
        raw.display_name ??
        raw.author_display_name ??
        raw.authorDisplayName ??
        snippet.display_name ??
        snippet.author_display_name ??
        snippet.authorDisplayName ??
        "unknown",
      120
    ),
    text: safeText(
      raw.text ??
        raw.message ??
        raw.message_text ??
        raw.messageText ??
        raw.comment_text ??
        raw.commentText ??
        raw.display_message ??
        raw.displayMessage ??
        snippet.text ??
        snippet.message ??
        snippet.display_message ??
        snippet.displayMessage ??
        snippet.comment_text ??
        snippet.commentText ??
        snippet.textMessageDetails?.messageText ??
        snippet.textMessageDetails?.message_text ??
        snippet.textMessageDetails?.text ??
        textFromYouTubeMessageRuns(
          snippet.textMessageDetails?.messageRuns ??
            snippet.textMessageDetails?.runs
        ) ??
        "",
      500
    ),
    timestamp_ms: Number.isFinite(timestampMs) ? timestampMs : undefined,
  };
  if (comment.timestamp_ms === undefined) delete comment.timestamp_ms;
  return comment;
}

function textFromYouTubeMessageRuns(runs) {
  if (!Array.isArray(runs)) return null;
  const text = runs
    .map((run) => {
      if (typeof run === "string") return run;
      if (!run || typeof run !== "object") return "";
      return run.text ?? run.displayText ?? "";
    })
    .join("")
    .trim();
  return text || null;
}

function toDonationInput(raw, snippet) {
  const authorDetails =
    raw.authorDetails && typeof raw.authorDetails === "object"
      ? raw.authorDetails
      : raw.author_details && typeof raw.author_details === "object"
        ? raw.author_details
      : snippet.authorDetails && typeof snippet.authorDetails === "object"
        ? snippet.authorDetails
        : snippet.author_details && typeof snippet.author_details === "object"
          ? snippet.author_details
        : {};
  const author = raw.author && typeof raw.author === "object" ? raw.author : {};
  const details = pickSupportDetails(snippet);
  const eventType = supportEventType(snippet);
  return {
    trace_id: firstPresentValue(
      details.trace_id,
      details.traceId,
      raw.trace_id,
      raw.traceId,
      snippet.trace_id,
      snippet.traceId
    ),
    event_id: firstPresentValue(
      details.event_id,
      details.eventId,
      details.id,
      raw.event_id,
      raw.eventId,
      raw.id,
      snippet.event_id,
      snippet.eventId,
      snippet.id
    ),
    platform_event_id: firstPresentValue(
      details.platform_event_id,
      details.platformEventId,
      details.event_id,
      details.eventId,
      details.id,
      raw.platform_event_id,
      raw.platformEventId,
      raw.event_id,
      raw.eventId,
      raw.id,
      snippet.platform_event_id,
      snippet.platformEventId,
      snippet.event_id,
      snippet.eventId,
      snippet.id
    ),
    author_channel_id: safeOptionalText(
      authorDetails.channelId ??
        authorDetails.channel_id ??
        author.channelId ??
        author.channel_id ??
        details.authorDetails?.channelId ??
        details.authorDetails?.channel_id ??
        details.author_details?.channelId ??
        details.author_details?.channel_id ??
        details.author_channel_id ??
        details.authorChannelId ??
        raw.author_channel_id ??
        raw.authorChannelId ??
        snippet.author_channel_id ??
        snippet.authorChannelId
    ) || "unknown",
    display_name: safeText(
      authorDetails.displayName ??
        authorDetails.display_name ??
        author.displayName ??
        author.display_name ??
        author.name ??
        details.authorDetails?.displayName ??
        details.authorDetails?.display_name ??
        details.author_details?.displayName ??
        details.author_details?.display_name ??
        details.display_name ??
        details.displayName ??
        details.author_display_name ??
        details.authorDisplayName ??
        raw.display_name ??
        raw.author_display_name ??
        raw.authorDisplayName ??
        snippet.display_name ??
        snippet.author_display_name ??
        snippet.authorDisplayName ??
        "unknown",
      120
    ),
    message_text: safeText(
        details.userComment ??
        details.user_comment ??
        details.messageText ??
        details.message_text ??
        details.text ??
        details.message ??
        details.display_message ??
        details.displayMessage ??
        details.textMessageDetails?.messageText ??
        details.textMessageDetails?.message_text ??
        details.textMessageDetails?.text ??
        textFromYouTubeMessageRuns(
          details.textMessageDetails?.messageRuns ??
            details.textMessageDetails?.runs
        ) ??
        raw.text ??
        raw.message ??
        raw.message_text ??
        raw.messageText ??
        raw.display_message ??
        raw.displayMessage ??
        snippet.text ??
        snippet.message ??
        snippet.message_text ??
        snippet.messageText ??
        snippet.display_message ??
        snippet.displayMessage ??
        snippet.textMessageDetails?.messageText ??
        snippet.textMessageDetails?.message_text ??
        snippet.textMessageDetails?.text ??
        textFromYouTubeMessageRuns(
          snippet.textMessageDetails?.messageRuns ??
            snippet.textMessageDetails?.runs
        ) ??
        "",
      500
    ),
    amount_micros: firstPresentValue(
      details.amountMicros,
      details.amount_micros,
      raw.amount_micros,
      raw.amountMicros,
      snippet.amount_micros,
      snippet.amountMicros
    ),
    amount_display_string: firstPresentValue(
      details.amountDisplayString,
      details.amount_display_string,
      details.amountString,
      details.amount_string,
      details.formattedAmount,
      details.display_amount,
      details.displayAmount,
      raw.amount_display_string,
      raw.amountDisplayString,
      raw.amount_string,
      raw.amountString,
      raw.formattedAmount,
      raw.display_amount,
      raw.displayAmount,
      snippet.amount_display_string,
      snippet.amountDisplayString,
      snippet.amount_string,
      snippet.amountString,
      snippet.formattedAmount,
      snippet.display_amount,
      snippet.displayAmount
    ),
    giftMembershipsCount: firstPresentValue(
      details.giftMembershipsCount,
      details.gift_memberships_count,
      details.giftMembershipCount,
      details.gift_membership_count,
      details.giftedMembershipCount,
      details.gift_count,
      details.giftCount,
      details.memberCount,
      details.member_count,
      raw.giftMembershipsCount,
      raw.gift_memberships_count,
      raw.giftMembershipCount,
      raw.gift_membership_count,
      raw.giftedMembershipCount,
      raw.gift_count,
      raw.giftCount,
      raw.memberCount,
      raw.member_count,
      snippet.giftMembershipsCount,
      snippet.gift_memberships_count,
      snippet.giftMembershipCount,
      snippet.gift_membership_count,
      snippet.giftedMembershipCount,
      snippet.gift_count,
      snippet.giftCount,
      snippet.memberCount,
      snippet.member_count
    ),
    amount_tier: firstPresentValue(
      details.amount_tier,
      details.amountTier,
      details.tier,
      details.amount,
      raw.amount_tier,
      raw.amountTier,
      raw.tier,
      raw.amount,
      snippet.amount_tier,
      snippet.amountTier,
      snippet.tier,
      snippet.amount
    ),
    amount_source_kind: firstPresentValue(
      details.amount_source_kind,
      details.amountSourceKind,
      raw.amount_source_kind,
      raw.amountSourceKind,
      snippet.amount_source_kind,
      snippet.amountSourceKind,
      eventType === "giftMembershipReceivedEvent" ? "membership_count" : null
    ),
    currency: safeText(
        details.currency ??
        details.currencyCode ??
        details.currency_code ??
        raw.currency ??
        raw.currencyCode ??
        raw.currency_code ??
        snippet.currency ??
        snippet.currencyCode ??
        snippet.currency_code ??
        "unknown",
      24
    ),
    support_event_type: eventType,
    is_public_event: !["false", "0", "no", "off"].includes(
      safeText(
        firstPresentValue(
          details.is_public_event,
          details.isPublicEvent,
          details.is_public,
          details.isPublic,
          raw.is_public_event,
          raw.isPublicEvent,
          raw.is_public,
          raw.isPublic,
          snippet.is_public_event,
          snippet.isPublicEvent,
          snippet.is_public,
          snippet.isPublic
        ),
        8
      ).toLowerCase()
    ) &&
      !["true", "1", "yes", "on"].includes(
        safeText(
          firstPresentValue(
            details.is_private,
            details.isPrivate,
            raw.is_private,
            raw.isPrivate,
            snippet.is_private,
            snippet.isPrivate
          ),
          8
        ).toLowerCase()
      ) &&
      !["private", "hidden", "unlisted"].includes(
      safeText(
        firstPresentValue(
          details.visibility,
          details.privacy_status,
          details.privacyStatus,
          raw.visibility,
          raw.privacy_status,
          raw.privacyStatus,
          snippet.visibility,
          snippet.privacy_status,
          snippet.privacyStatus
        ),
        16
      ).toLowerCase()
    ),
    timestamp_ms: firstPresentValue(
      details.timestamp_ms,
      details.timestampMs,
      raw.timestamp_ms,
      raw.timestampMs,
      snippet.timestamp_ms,
      snippet.timestampMs,
      details.published_at,
      details.publishedAt,
      details.created_at,
      details.createdAt,
      raw.published_at,
      raw.publishedAt,
      raw.created_at,
      raw.createdAt,
      snippet.published_at,
      snippet.publishedAt,
      snippet.created_at,
      snippet.createdAt
    ),
  };
}

function safeSupportAmountSourceKind(value) {
  const text = normalizeLooseKind(value);
  if (SUPPORT_AMOUNT_SOURCE_KINDS.has(text)) return text;
  return "unknown";
}

function hasValue(value) {
  return value !== undefined && value !== null && typeof value !== "object" && (typeof value !== "string" || value.trim() !== "");
}

function hasObjectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) && Object.values(value).some((item) => hasValue(item) || hasObjectValue(item));
}

function firstPresentValue(...values) {
  return values.find((value) => hasValue(value));
}

function isSupportEvent(snippet) {
  if (hasObjectValue(pickSupportDetails(snippet))) return true;
  const kind = firstPresentValue(
    snippet.payload_kind,
    snippet.payloadKind,
    snippet.support_event_type,
    snippet.supportEventType,
    snippet.event_type,
    snippet.eventType,
    snippet.kind,
    snippet.event_kind,
    snippet.eventKind,
    snippet.type
  );
  const looseKind = normalizeLooseKind(kind ?? "");
  if (looseKind === "donation_event") return true;
  return normalizeSupportEventTypeAlias(kind) !== "";
}

function supportEventType(snippet) {
  const details = pickSupportDetails(snippet);
  const explicitType = safeText(
    firstPresentValue(
      details.support_event_type,
      details.supportEventType,
      details.event_type,
      details.eventType,
      details.kind,
      details.event_kind,
      details.eventKind,
      details.type,
      snippet.support_event_type,
      snippet.supportEventType,
      snippet.event_type,
      snippet.eventType,
      snippet.kind,
      snippet.event_kind,
      snippet.eventKind,
      snippet.type
    ),
    80
  );
  const normalizedExplicitType = normalizeSupportEventTypeAlias(explicitType);
  if (normalizedExplicitType) return normalizedExplicitType;
  if (
    hasObjectValue(snippet.superChatDetails) ||
    hasObjectValue(snippet.super_chat_details) ||
    hasObjectValue(snippet.paidMessageDetails) ||
    hasObjectValue(snippet.paid_message_details)
  ) {
    return "superChatEvent";
  }
  if (
    hasObjectValue(snippet.superStickerDetails) ||
    hasObjectValue(snippet.super_sticker_details) ||
    hasObjectValue(snippet.paidStickerDetails) ||
    hasObjectValue(snippet.paid_sticker_details)
  ) {
    return "superStickerEvent";
  }
  if (hasObjectValue(snippet.superThanksDetails) || hasObjectValue(snippet.super_thanks_details)) return "superThanksEvent";
  if (
    hasObjectValue(snippet.membershipGiftingDetails) ||
    hasObjectValue(snippet.membership_gifting_details) ||
    hasObjectValue(snippet.membershipGiftDetails) ||
    hasObjectValue(snippet.membership_gift_details) ||
    hasObjectValue(snippet.giftMembershipDetails) ||
    hasObjectValue(snippet.gift_membership_details) ||
    hasObjectValue(snippet.giftDetails) ||
    hasObjectValue(snippet.gift_details)
  ) {
    return "membershipGiftingEvent";
  }
  if (hasObjectValue(snippet.giftMembershipReceivedDetails) || hasObjectValue(snippet.gift_membership_received_details)) {
    return "giftMembershipReceivedEvent";
  }
  if (hasObjectValue(snippet.memberMilestoneChatDetails) || hasObjectValue(snippet.member_milestone_chat_details)) {
    return "memberMilestoneChatEvent";
  }
  if (hasObjectValue(snippet.newSponsorDetails) || hasObjectValue(snippet.new_sponsor_details)) {
    return "newSponsorEvent";
  }
  return "normalizedSupportEvent";
}

function normalizeSupportEventTypeAlias(value) {
  const text = safeText(value, 80);
  if (!text) return "";
  if (SUPPORT_EVENT_TYPES.has(text)) return text;
  const looseValue = normalizeLooseKind(value);
  const alias = {
    paidmessageevent: "superChatEvent",
    paidmessage: "superChatEvent",
    paid_message: "superChatEvent",
    paidstickerevent: "superStickerEvent",
    paidsticker: "superStickerEvent",
    paid_sticker: "superStickerEvent",
    sponsorship: "newSponsorEvent",
    sponsorevent: "newSponsorEvent",
    sponsor: "newSponsorEvent",
    membership: "newSponsorEvent",
    membershipevent: "newSponsorEvent",
    newmemberevent: "newSponsorEvent",
    newmembershipevent: "newSponsorEvent",
    new_member: "newSponsorEvent",
    new_membership: "newSponsorEvent",
    membermilestoneevent: "memberMilestoneChatEvent",
    membershipmilestoneevent: "memberMilestoneChatEvent",
    member_milestone: "memberMilestoneChatEvent",
    membership_milestone: "memberMilestoneChatEvent",
    membershipgiftevent: "membershipGiftingEvent",
    membershipgift: "membershipGiftingEvent",
    membership_gift: "membershipGiftingEvent",
    membershipgiftdetails: "membershipGiftingEvent",
    membershipgifting: "membershipGiftingEvent",
    giftmembershipevent: "membershipGiftingEvent",
    giftmembershipsevent: "membershipGiftingEvent",
    giftmembership: "membershipGiftingEvent",
    giftmemberships: "membershipGiftingEvent",
    giftedmembershipevent: "membershipGiftingEvent",
    giftmembershipreceived: "giftMembershipReceivedEvent",
    giftmembershipreceivedevent: "giftMembershipReceivedEvent",
    gift_received_membership: "giftMembershipReceivedEvent",
    receivedmembershipgift: "giftMembershipReceivedEvent",
  }[looseValue];
  if (alias) return alias;
  for (const type of SUPPORT_EVENT_TYPES) {
    const looseType = normalizeLooseKind(type);
    if (looseType === looseValue || looseType.replace(/_event$/, "") === looseValue) return type;
  }
  return "";
}

function normalizeLooseKind(value) {
  return safeText(value, 80)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function pickSupportDetails(snippet) {
  const candidates = [
    snippet.superChatDetails,
    snippet.super_chat_details,
    snippet.paidMessageDetails,
    snippet.paid_message_details,
    snippet.superStickerDetails,
    snippet.super_sticker_details,
    snippet.paidStickerDetails,
    snippet.paid_sticker_details,
    snippet.superThanksDetails,
    snippet.super_thanks_details,
    snippet.membershipGiftingDetails,
    snippet.membership_gifting_details,
    snippet.membershipGiftDetails,
    snippet.membership_gift_details,
    snippet.giftMembershipDetails,
    snippet.gift_membership_details,
    snippet.giftDetails,
    snippet.gift_details,
    snippet.giftMembershipReceivedDetails,
    snippet.gift_membership_received_details,
    snippet.memberMilestoneChatDetails,
    snippet.member_milestone_chat_details,
    snippet.newSponsorDetails,
    snippet.new_sponsor_details,
  ];
  return candidates.find((item) => hasObjectValue(item)) ?? {};
}

function summarizeDiscoveryAgeBucket(ageMs, maxAgeMs) {
  if (!Number.isFinite(Number(ageMs))) return "missing";
  const age = Number(ageMs);
  const limit = Number(maxAgeMs);
  if (age <= limit) return "fresh";
  if (age <= limit * 2) return "stale";
  return "expired";
}

function assertNoStaleLiveChatDiscoveryLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /\b(live[_ -]?chat[_ -]?id|video[_ -]?id|raw[_ -]?discovery|api[_ -]?response|response[_ -]?body|endpoint|url|oauth|refresh[_ -]?token|access[_ -]?token|api[_ -]?key|secret|authorization|candidate|command|world[_ -]?command|input[_ -]?action[_ -]?candidate)\b|https?:\/\//iu.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe discovery summary material`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoStaleLiveChatDiscoveryLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (/^(raw|payload|live_chat_id|video_id|endpoint|token|secret|candidate|command)$/iu.test(field)) {
      throw new ContractError(`${context}: unsafe discovery summary field`, {
        path: `${path}.${field}`,
      });
    }
    assertNoStaleLiveChatDiscoveryLeak(child, context, `${path}.${field}`);
  }
}

function safeOptionalText(value) {
  if (value === undefined || value === null || value === "") return "";
  return safeText(value, 160);
}

function safeOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}

function safeNonNegativeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.trunc(number));
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

function assertYouTubeApiPayloadSafe(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertYouTubeApiPayloadSafe(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_YOUTUBE_API_FIELDS.has(field)) {
      throw new ContractError(`${context}: live chat API payload must be read-only`, {
        field,
        path,
      });
    }
    assertYouTubeApiPayloadSafe(child, context, `${path}.${field}`);
  }
}
