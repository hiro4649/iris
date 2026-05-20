import { scoreEventPriority } from "./eventQueue.js";
import { ContractError } from "../core/contracts.js";

const SUPPORT_EVENT_TYPE_FIELDS = [
  "superChatEvent",
  "superStickerEvent",
  "superThanksEvent",
  "newSponsorEvent",
  "memberMilestoneChatEvent",
  "membershipGiftingEvent",
  "giftMembershipReceivedEvent",
  "normalizedSupportEvent",
];

const SUPPORT_AMOUNT_SOURCE_FIELDS = [
  "micros",
  "formatted",
  "tier",
  "membership_count",
  "unknown",
];

const IGNORED_EVENT_TYPE_FIELDS = [
  "messageDeletedEvent",
  "userBannedEvent",
  "tombstone",
  "moderationEvent",
];

const MODERATION_REASON_FIELDS = ["blocked_author", "blocked_text"];
const FORBIDDEN_MODERATION_PUBLIC_FIELDS = new Set([
  "raw_harassment_text",
  "harassment_text",
  "raw_moderation_text",
  "moderation_text",
  "raw_comment",
  "private_note",
  "private_viewer_id",
  "viewer_private_id",
  "viewer_id",
  "author_id",
]);
const FORBIDDEN_MODERATION_PUBLIC_TEXT =
  /\b(?:raw[_-]?harassment|private[_-]?note|private[_-]?viewer[_-]?id|viewer[_-]?private[_-]?id)\b/i;
const CURSOR_STORE_STATUS_SCHEMA = "iris_youtube_live_chat_cursor_store_status_v1";
const CURSOR_WRITE_RESULT_SCHEMA = "iris_youtube_live_chat_cursor_write_result_v1";
const SAFE_CURSOR_STORE_HEALTH_VALUES = new Set([
  "ready",
  "ok",
  "good",
  "healthy",
  "available",
  "available_for_write",
  "read_write",
  "readable",
  "writable",
  "connected",
  "synced",
  "persisted",
  "committed",
  "saved",
  "stored",
  "flushed",
  "current",
  "up_to_date",
  "active",
  "operational",
  "up",
  "attention",
]);
const SAFE_CURSOR_WRITE_REASONS = new Set([
  "written",
  "cursor_written",
  "cursor_unchanged",
  "unchanged",
  "not_modified",
  "page_token_unchanged",
  "same_page_token",
  "already_current",
  "empty_page_token",
  "cursor_store_write_failed",
]);
const SAFE_CURSOR_STORE_ERROR_KINDS = new Set([
  "store_parse_failed",
  "store_contract_failed",
  "store_permission_failed",
  "store_capacity_failed",
  "store_location_unavailable",
  "store_unavailable",
]);
const SAFE_SOURCE_ERROR_KINDS = new Set([
  "http_status",
  "timeout",
  "source_request_error",
  "invalid_json",
  "unsafe_source_payload",
  "quota_or_rate_limited",
  "auth_required",
  "live_chat_ended",
  "chat_disabled",
  "not_found",
  "no_active_live_chat",
  "youtube_live_chat_api_auth_required",
  "youtube_live_chat_api_live_chat_ended",
  "youtube_live_chat_api_chat_disabled",
  "youtube_live_chat_api_not_found",
  "youtube_live_chat_api_no_active_live_chat",
  "youtube_live_chat_api_quota_or_rate_limited",
  "youtube_live_chat_api_http_status",
  "youtube_live_chat_api_timeout",
  "youtube_live_chat_api_request_error",
  "youtube_live_chat_api_invalid_json",
  "youtube_live_chat_api_unsafe_payload",
  "youtube_live_chat_api_contract_error",
  "oauth_refresh_timeout",
  "oauth_refresh_request_error",
  "oauth_refresh_quota_or_rate_limited",
  "oauth_refresh_auth_required",
  "oauth_refresh_http_status",
  "oauth_refresh_invalid_json",
  "oauth_refresh_unsafe_response",
  "oauth_refresh_missing_access_token",
  "oauth_refresh_contract_error",
  "local_endpoint_policy_blocked",
]);

export function createHttpIngestScheduler({
  runtime,
  streamState,
  sources = [],
  intervalMs = 3000,
  batchLimit = 10,
  dedupeWindowSize = 300,
  continueOnSourceError = false,
  onStateUpdate = null,
  logger = console,
} = {}) {
  if (!runtime) throw new Error("createHttpIngestScheduler requires runtime");
  if (!streamState) throw new Error("createHttpIngestScheduler requires streamState");

  const activeSources = normalizeSources(sources);
  const safeIntervalMs = clampInteger(intervalMs, 250, 3_600_000, 3000);
  const safeBatchLimit = clampInteger(batchLimit, 1, 100, 10);
  const safeDedupeWindowSize = clampInteger(dedupeWindowSize, 1, 10_000, 300);
  let timer = null;
  let running = false;
  let ticking = false;
  let last_tick_at_ms = null;
  let tick_count = 0;
  let processed_count = 0;
  let duplicate_count = 0;
  let last_error = null;
  let source_error_count = 0;
  let last_source_errors = [];
  let last_results = [];
  let last_priority_summary = buildPrioritySummary([]);
  const pausedSourceNames = new Set();
  let supportEventsPaused = false;
  const recentEventIds = [];
  const recentEventIdSet = new Set();

  async function tickNow(reason = "manual_http_ingest_tick") {
    if (ticking) {
      return {
        ok: false,
        error: "http_ingest_tick_already_running",
        status: buildStatus(),
      };
    }

    ticking = true;
    const processed = [];
    const skipped_duplicates = [];
    const source_errors = [];
    const eventBatch = [];
    try {
      let sequence = 0;
      for (const { name, source } of activeSources) {
        if (pausedSourceNames.has(name)) continue;
        let events;
        try {
          events = await readSourceBatch(source, safeBatchLimit);
        } catch (error) {
          const sourceError = summarizeSourceError({ name, source, error });
          source_errors.push(sourceError);
          if (!continueOnSourceError) throw error;
          logger.warn?.(sourceError);
          continue;
        }
        for (const event of events) {
          eventBatch.push({
            sourceName: name,
            event,
            priority: scoreEventPriority(event),
            sequence: sequence++,
          });
        }
      }
      eventBatch.sort(compareEventBatchItems);
      last_priority_summary = buildPrioritySummary(eventBatch);
      for (const { sourceName, event, priority } of eventBatch) {
        if (supportEventsPaused && isSupportEvent(event)) continue;
        if (isDuplicateEvent(event)) {
          duplicate_count += 1;
          skipped_duplicates.push(
            summarizeDuplicateEvent({ sourceName, event, priority })
          );
          continue;
        }
        rememberEvent(event);
        const result = await runtime.processEvent(event);
        const state = streamState.updateFromRuntimeResult(result);
        onStateUpdate?.(state, { reason, result, sourceName, priority });
        processed.push(summarizeProcessedEvent({ sourceName, event, result, priority }));
      }
      last_tick_at_ms = Date.now();
      tick_count += 1;
      processed_count += processed.length;
      source_error_count += source_errors.length;
      last_source_errors = source_errors.slice(-20);
      last_results = processed.slice(-20);
      last_priority_summary = {
        ...last_priority_summary,
        processed_count: processed.length,
        duplicate_count: skipped_duplicates.length,
        source_error_count: source_errors.length,
      };
      last_error = source_errors.length > 0 ? "http_ingest_source_errors" : null;
      return {
        ok: source_errors.length === 0,
        processed_count: processed.length,
        duplicate_count: skipped_duplicates.length,
        source_error_count: source_errors.length,
        processed,
        skipped_duplicates,
        source_errors,
        status: buildStatus(),
      };
    } catch (error) {
      last_error =
        source_errors.length > 0 ? "http_ingest_source_errors" : "http_ingest_tick_failed";
      source_error_count += source_errors.length;
      last_source_errors = source_errors.slice(-20);
      last_priority_summary = {
        ...buildPrioritySummary(eventBatch),
        processed_count: processed.length,
        duplicate_count: skipped_duplicates.length,
        source_error_count: source_errors.length,
      };
      logger.error?.(createTickErrorLogSummary({
        errorKind: last_error,
        sourceErrorCount: source_errors.length,
      }));
      return {
        ok: false,
        error: last_error,
        processed_count: processed.length,
        duplicate_count: skipped_duplicates.length,
        source_error_count: source_errors.length,
        processed,
        skipped_duplicates,
        source_errors,
        status: buildStatus(),
      };
    } finally {
      ticking = false;
    }
  }

  function scheduleNext() {
    if (!running) return;
    timer = setTimeout(async () => {
      await tickNow("scheduled_http_ingest_tick");
      scheduleNext();
    }, safeIntervalMs);
    timer.unref?.();
  }

  function buildStatus() {
    const status = {
      running,
      ticking,
      interval_ms: safeIntervalMs,
      batch_limit: safeBatchLimit,
      continue_on_source_error: continueOnSourceError,
      source_count: activeSources.length,
      sources: activeSources.map((item) => item.name),
      paused_sources: [...pausedSourceNames],
      support_events_paused: supportEventsPaused,
      source_statuses: activeSources.map(summarizeSourceStatus),
      priority_sort: "event_priority_desc_stable",
      last_tick_at_ms,
      tick_count,
      processed_count,
      duplicate_count,
      source_error_count,
      last_source_errors,
      last_error,
      last_priority_summary,
      last_results,
      boundary_policy: {
        source_status_counts_only: true,
        no_raw_payloads: true,
        no_text_payloads: true,
        no_platform_ids: true,
        no_candidates: true,
        no_commands: true,
        no_endpoint_values: true,
      },
    };
    assertHttpIngestSchedulerStatusSafe(status);
    return status;
  }

  function setSourcePaused(name, paused) {
    const sourceName = String(name ?? "");
    if (!activeSources.some((item) => item.name === sourceName)) {
      return {
        ok: false,
        schema: "iris_http_ingest_source_pause_v1",
        source_name: sourceName,
        source_paused: false,
        reason: "source_not_configured",
        status: buildStatus(),
      };
    }
    if (paused === true) pausedSourceNames.add(sourceName);
    else pausedSourceNames.delete(sourceName);
    return {
      ok: true,
      schema: "iris_http_ingest_source_pause_v1",
      source_name: sourceName,
      source_paused: pausedSourceNames.has(sourceName),
      status: buildStatus(),
    };
  }

  function setSupportEventsPaused(paused) {
    supportEventsPaused = paused === true;
    return {
      ok: true,
      schema: "iris_http_ingest_support_event_pause_v1",
      support_events_paused: supportEventsPaused,
      status: buildStatus(),
    };
  }

  function isDuplicateEvent(event) {
    const eventId = event?.event_id ?? null;
    return Boolean(eventId && recentEventIdSet.has(eventId));
  }

  function rememberEvent(event) {
    const eventId = event?.event_id ?? null;
    if (!eventId || recentEventIdSet.has(eventId)) return;
    recentEventIds.push(eventId);
    recentEventIdSet.add(eventId);
    while (recentEventIds.length > safeDedupeWindowSize) {
      const removed = recentEventIds.shift();
      recentEventIdSet.delete(removed);
    }
  }

  function isSupportEvent(event) {
    const payload = event?.payload ?? {};
    return (
      payload.payload_kind === "donation_event" ||
      SUPPORT_EVENT_TYPE_FIELDS.includes(payload.support_event_type)
    );
  }

  return {
    start() {
      if (running) return buildStatus();
      running = true;
      scheduleNext();
      return buildStatus();
    },
    stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
      return buildStatus();
    },
    async tickNow(reason = "manual_http_ingest_tick") {
      return tickNow(reason);
    },
    setSourcePaused,
    setSupportEventsPaused,
    status() {
      return buildStatus();
    },
  };
}

export function assertHttpIngestSchedulerStatusSafe(
  status,
  context = "HTTP ingest scheduler status"
) {
  if (!status || typeof status !== "object") {
    throw new ContractError(`${context}: missing status`);
  }
  assertNoForbiddenModerationPublicFields(status, context);
  for (const sourceStatus of status.source_statuses ?? []) {
    if (sourceStatus?.boundary_policy?.no_moderation_terms !== true) {
      throw new ContractError(`${context}: moderation summary must hide raw terms`);
    }
  }
}

function createTickErrorLogSummary({ errorKind, sourceErrorCount }) {
  return {
    schema: "iris_http_ingest_tick_error_log_summary_v1",
    error_kind: errorKind === "http_ingest_source_errors"
      ? "http_ingest_source_errors"
      : "http_ingest_tick_failed",
    source_error_count: safeOptionalNumber(sourceErrorCount) ?? 0,
    boundary_policy: {
      summary_only: true,
      no_raw_error_messages: true,
      no_raw_payloads: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
  };
}

function compareEventBatchItems(a, b) {
  if (b.priority !== a.priority) return b.priority - a.priority;
  return a.sequence - b.sequence;
}

function buildPrioritySummary(items) {
  const by_band = {
    urgent: 0,
    high: 0,
    contextual: 0,
    normal: 0,
    idle: 0,
  };
  for (const item of items) {
    by_band[toPriorityBand(item.priority)] += 1;
  }
  return {
    batch_count: items.length,
    top_priority: items.length > 0 ? Math.max(...items.map((item) => item.priority)) : null,
    by_band,
  };
}

function toPriorityBand(priority) {
  if (priority >= 85) return "urgent";
  if (priority >= 60) return "high";
  if (priority >= 40) return "contextual";
  if (priority <= 10) return "idle";
  return "normal";
}

function summarizeDuplicateEvent({ sourceName, event, priority }) {
  const eventId = safeOptionalText(event?.event_id, 160);
  const traceId = safeOptionalText(event?.trace_id, 160);
  const eventIdPresent = eventId !== null && eventId !== "";
  const traceIdPresent = traceId !== null && traceId !== "";
  return {
    source: safeSourceName(sourceName),
    event_id_present: eventIdPresent,
    trace_id_present: traceIdPresent,
    event_priority: priority ?? scoreEventPriority(event),
    skip_reason: "duplicate_event",
    boundary_policy: {
      summary_only: true,
      no_platform_ids: true,
      no_raw_payloads: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function summarizeSourceError({ name, source, error }) {
  return {
    schema: "iris_http_ingest_source_error_summary_v1",
    source: safeSourceName(name),
    source_kind: safeSourceName(source?.source_kind ?? name, "source"),
    error_kind: classifySourceError(error),
    retryable: classifySourceErrorRetryable(error),
    operator_action_required: classifySourceErrorOperatorActionRequired(error),
    boundary_policy: {
      summary_only: true,
      no_raw_payloads: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function classifySourceError(error) {
  if (error?.name === "AbortError") return "timeout";
  if (error?.name === "ContractError") {
    const detailKind = safeSourceErrorKind(error.details?.error_kind);
    if (detailKind) return detailKind;
  }
  if (error?.name === "ContractError" && typeof error?.details?.status === "number") {
    return "http_status";
  }
  if (String(error?.message ?? "").includes("unsafe")) return "unsafe_source_payload";
  if (String(error?.message ?? "").includes("JSON")) return "invalid_json";
  return "source_request_error";
}

function classifySourceErrorRetryable(error) {
  if (typeof error?.details?.retryable === "boolean") return error.details.retryable;
  if (
    ["http_status", "oauth_refresh_http_status"].includes(classifySourceError(error)) &&
    [400, 401, 403, 404, 410].includes(error?.details?.status)
  ) {
    return false;
  }
  return ![
    "auth_required",
    "live_chat_ended",
    "chat_disabled",
    "not_found",
    "no_active_live_chat",
    "local_endpoint_policy_blocked",
    "oauth_refresh_auth_required",
    "oauth_refresh_missing_access_token",
    "oauth_refresh_contract_error",
    "oauth_refresh_unsafe_response",
    "oauth_refresh_invalid_json",
  ].includes(classifySourceError(error));
}

function classifySourceErrorOperatorActionRequired(error) {
  if (typeof error?.details?.operator_action_required === "boolean") {
    return error.details.operator_action_required;
  }
  if (
    ["http_status", "oauth_refresh_http_status"].includes(classifySourceError(error)) &&
    [400, 401, 403, 404, 410].includes(error?.details?.status)
  ) {
    return true;
  }
  return [
    "auth_required",
    "live_chat_ended",
    "chat_disabled",
    "not_found",
    "no_active_live_chat",
    "local_endpoint_policy_blocked",
    "oauth_refresh_auth_required",
    "oauth_refresh_missing_access_token",
    "oauth_refresh_contract_error",
    "oauth_refresh_unsafe_response",
    "oauth_refresh_invalid_json",
  ].includes(classifySourceError(error));
}

function safeSourceErrorKind(value) {
  const text = safeOptionalText(value, 80);
  if (!text) return "";
  return SAFE_SOURCE_ERROR_KINDS.has(text) ? text : "";
}

function normalizeSources(sources) {
  return sources
    .map((item, index) => {
      if (!item) return null;
      if (item.source) {
        return {
          name: safeSourceName(item.name ?? item.source.source_kind ?? `source_${index}`),
          source: item.source,
        };
      }
      return {
        name: safeSourceName(item.source_kind ?? `source_${index}`),
        source: item,
      };
    })
    .filter(
      (item) =>
        item?.source &&
        (typeof item.source.next === "function" || typeof item.source.nextBatch === "function")
    );
}

async function readSourceBatch(source, batchLimit) {
  if (typeof source.nextBatch === "function") {
    return source.nextBatch(batchLimit);
  }
  const events = [];
  while (events.length < batchLimit) {
    const event = await source.next();
    if (!event) break;
    events.push(event);
  }
  return events;
}

function summarizeProcessedEvent({ sourceName, event, result, priority }) {
  if (!Array.isArray(result?.candidate_review_items)) {
    throw new ContractError("http ingest processed event: candidate review items are required");
  }
  const eventId = safeOptionalText(event?.event_id, 160);
  const traceId = safeOptionalText(event?.trace_id, 160);
  const eventIdPresent = eventId !== null && eventId !== "";
  const traceIdPresent = traceId !== null && traceId !== "";
  return {
    source: safeSourceName(sourceName),
    event_id_present: eventIdPresent,
    trace_id_present: traceIdPresent,
    event_priority: priority ?? scoreEventPriority(event),
    payload_kind: result?.core?.phase01?.payload_kind ?? event?.payload?.payload_kind ?? null,
    final_decision: result?.core?.phase15?.final_decision ?? null,
    human_likeness_score:
      result?.human_likeness_evaluation?.total_human_likeness_score ?? null,
    candidate_review_count: result.candidate_review_items.length,
    boundary_audit_status: result?.boundary_audit?.audit_status ?? null,
    boundary_policy: {
      summary_only: true,
      no_platform_ids: true,
      no_raw_payloads: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function summarizeSourceStatus({ name, source }) {
  const raw = readSourceStatus(source);
  const ingestReadinessStatus = safeIngestReadinessStatus(raw?.ingest_readiness_status);
  const lastErrorRecoveryHint = safeOptionalText(raw?.last_error_recovery_hint, 120);
  const lastErrorRecoveryHintAvailable =
    lastErrorRecoveryHint !== null && lastErrorRecoveryHint !== "";
  return {
    schema: "iris_http_ingest_source_status_summary_v1",
    name: safeSourceName(name),
    source_kind: safeSourceName(raw?.source_kind ?? source?.source_kind ?? name, "source"),
    telemetry_available:
      ingestReadinessStatus !== "attention" ||
      (safeOptionalNumber(raw?.request_count) ?? 0) > 0 ||
      (safeOptionalNumber(raw?.last_item_count) ?? 0) > 0 ||
      (safeOptionalNumber(raw?.last_comment_count) ?? 0) > 0 ||
      (safeOptionalNumber(raw?.last_support_event_count) ?? 0) > 0,
    ingest_readiness_status: ingestReadinessStatus,
    local_endpoint_policy: safeLocalEndpointPolicy(raw?.local_endpoint_policy),
    local_endpoint_policy_status: safeLocalEndpointPolicyStatus(raw?.local_endpoint_policy_status),
    bridge_endpoint_scope: safeEndpointScope(raw?.bridge_endpoint_scope),
    bridge_endpoint_locality_ok: safeOptionalBoolean(raw?.bridge_endpoint_locality_ok),
    vision_endpoint_scope: safeEndpointScope(raw?.vision_endpoint_scope),
    vision_endpoint_locality_ok: safeOptionalBoolean(raw?.vision_endpoint_locality_ok),
    request_count: safeOptionalNumber(raw?.request_count),
    video_discovery_request_count: safeOptionalNumber(raw?.video_discovery_request_count),
    live_chat_request_count: safeOptionalNumber(raw?.live_chat_request_count),
    last_item_count: safeOptionalNumber(raw?.last_item_count),
    last_ignored_count: safeOptionalNumber(raw?.last_ignored_count),
    last_duplicate_count: safeOptionalNumber(raw?.last_duplicate_count),
    last_ignored_event_type_counts: summarizeIgnoredEventTypeCounts(
      raw?.last_ignored_event_type_counts
    ),
    last_moderation_filtered_count: safeOptionalNumber(raw?.last_moderation_filtered_count),
    last_moderation_reason_counts: summarizeModerationReasonCounts(
      raw?.last_moderation_reason_counts
    ),
    last_comment_count: safeOptionalNumber(raw?.last_comment_count),
    last_support_event_count: safeOptionalNumber(raw?.last_support_event_count),
    last_support_event_type_counts: summarizeSupportEventTypeCounts(
      raw?.last_support_event_type_counts
    ),
    last_support_amount_source_counts: summarizeSupportAmountSourceCounts(
      raw?.last_support_amount_source_counts
    ),
    ignored_event_count: safeOptionalNumber(raw?.ignored_event_count),
    duplicate_item_count: safeOptionalNumber(raw?.duplicate_item_count),
    ignored_event_type_counts: summarizeIgnoredEventTypeCounts(raw?.ignored_event_type_counts),
    moderation_configured: safeOptionalBoolean(raw?.moderation_configured) === true,
    moderation_filtered_count: safeOptionalNumber(raw?.moderation_filtered_count),
    moderation_reason_counts: summarizeModerationReasonCounts(raw?.moderation_reason_counts),
    comment_event_count: safeOptionalNumber(raw?.comment_event_count),
    support_event_count: safeOptionalNumber(raw?.support_event_count),
    support_event_type_counts: summarizeSupportEventTypeCounts(raw?.support_event_type_counts),
    support_amount_source_counts: summarizeSupportAmountSourceCounts(
      raw?.support_amount_source_counts
    ),
    last_observation_count: safeOptionalNumber(raw?.last_observation_count),
    last_observation_telemetry: summarizeObservationTelemetry(raw?.last_observation_telemetry),
    polling_interval_ms: safeOptionalNumber(raw?.polling_interval_ms),
    polling_interval_policy: summarizePollingIntervalPolicy(raw?.polling_interval_policy),
    last_polling_interval_clamped:
      safeOptionalBoolean(raw?.last_polling_interval_clamped) === true,
    consecutive_error_count: safeOptionalNumber(raw?.consecutive_error_count),
    has_retry_backoff:
      safeOptionalBoolean(raw?.has_retry_backoff) === true ||
      (safeOptionalNumber(raw?.next_retry_after_ms) ?? 0) > 0,
    last_error_retryable: safeOptionalBoolean(raw?.last_error_retryable),
    last_error_operator_action_required: safeOptionalBoolean(
      raw?.last_error_operator_action_required
    ) === true,
    last_error_recovery_hint: lastErrorRecoveryHintAvailable ? lastErrorRecoveryHint : null,
    last_error_recovery_hint_available: lastErrorRecoveryHintAvailable,
    live_chat_id_resolved: safeOptionalBoolean(raw?.live_chat_id_resolved) === true,
    auth_mode: safeAuthMode(raw?.auth_mode),
    cursor_store_configured: safeOptionalBoolean(raw?.cursor_store_configured) === true,
    cursor_store_status: summarizeCursorStoreStatus(raw?.cursor_store_status),
    cursor_store_write_attention: safeOptionalBoolean(raw?.cursor_store_write_attention) === true,
    last_cursor_write_result: summarizeCursorWriteResult(raw?.last_cursor_write_result),
    last_error: safeSourceErrorKind(raw?.last_error) || null,
    capture_request_summary: summarizeCaptureRequest(raw?.capture_request_summary),
    boundary_policy: {
      counts_only: true,
      no_raw_payloads: true,
      no_text_payloads: true,
      no_moderation_terms: true,
      no_platform_cursor: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
    },
    adapter_validation_required: true,
  };
}

function safeIngestReadinessStatus(value) {
  const text = safeOptionalText(value, 80);
  if (text === "ok") return "ready";
  if (text === "available") return "ready";
  if (text === "healthy") return "ready";
  if (text === "enabled") return "ready";
  if (text === "connected") return "ready";
  if (text === "authenticated") return "ready";
  if (text === "authorized") return "ready";
  if (text === "online") return "ready";
  if (text === "initialized") return "ready";
  if (text === "offline") return "idle";
  if (text === "backoff") return "retry_backoff";
  if (text === "retrying") return "retry_backoff";
  if (text === "retry_after") return "retry_backoff";
  if (text === "retry after") return "retry_backoff";
  if (text === "retry-after") return "retry_backoff";
  if (text === "throttled") return "retry_backoff";
  if (text === "rate_limit") return "retry_backoff";
  if (text === "rate_limited") return "retry_backoff";
  if (text === "rate limited") return "retry_backoff";
  if (text === "rate limit") return "retry_backoff";
  if (text === "rate-limit") return "retry_backoff";
  if (text === "too_many_requests") return "retry_backoff";
  if (text === "too many requests") return "retry_backoff";
  if (text === "too-many-requests") return "retry_backoff";
  if (text === "http_429") return "retry_backoff";
  if (text === "http 429") return "retry_backoff";
  if (text === "http-429") return "retry_backoff";
  if (text === "status_429") return "retry_backoff";
  if (text === "status 429") return "retry_backoff";
  if (text === "status-429") return "retry_backoff";
  if (text === "quota_limited") return "retry_backoff";
  if (text === "quota_exceeded") return "retry_backoff";
  if (text === "quota_exhausted") return "retry_backoff";
  if (text === "quota exhausted") return "retry_backoff";
  if (text === "quota-exhausted") return "retry_backoff";
  if (text === "cooldown") return "polling_cooldown";
  if (text === "cool_down") return "polling_cooldown";
  if (text === "cool down") return "polling_cooldown";
  if (text === "cool-down") return "polling_cooldown";
  if (text === "cooling_down") return "polling_cooldown";
  if (text === "polling_wait") return "polling_cooldown";
  if (text === "polling wait") return "polling_cooldown";
  if (text === "polling-wait") return "polling_cooldown";
  if (text === "wait") return "polling_cooldown";
  if (text === "waiting") return "polling_cooldown";
  if (text === "pending") return "polling_cooldown";
  if (text === "queued") return "polling_cooldown";
  if (text === "delayed") return "polling_cooldown";
  if (text === "paused") return "idle";
  if (text === "disabled") return "idle";
  if (text === "enabled_false") return "idle";
  if (text === "enabled false") return "idle";
  if (text === "enabled-false") return "idle";
  if (text === "not_enabled") return "idle";
  if (text === "not enabled") return "idle";
  if (text === "not-enabled") return "idle";
  if (text === "turned_off") return "idle";
  if (text === "turned off") return "idle";
  if (text === "turned-off") return "idle";
  if (text === "off") return "idle";
  if (text === "disabled_by_config") return "idle";
  if (text === "disabled by config") return "idle";
  if (text === "disabled-by-config") return "idle";
  if (text === "config_disabled") return "idle";
  if (text === "config disabled") return "idle";
  if (text === "config-disabled") return "idle";
  if (text === "inactive") return "idle";
  if (text === "deactivated") return "idle";
  if (text === "deactivated_by_config") return "idle";
  if (text === "deactivated by config") return "idle";
  if (text === "deactivated-by-config") return "idle";
  if (text === "not_active") return "idle";
  if (text === "not active") return "idle";
  if (text === "not-active") return "idle";
  if (text === "stopped") return "idle";
  if (text === "shutdown") return "idle";
  if (text === "shut_down") return "idle";
  if (text === "shut down") return "idle";
  if (text === "shut-down") return "idle";
  if (text === "halted") return "idle";
  if (text === "suspended") return "idle";
  if (text === "standby") return "idle";
  if (text === "not_started") return "idle";
  if (text === "not started") return "idle";
  if (text === "not-started") return "idle";
  if (text === "not_running") return "idle";
  if (text === "not running") return "idle";
  if (text === "not-running") return "idle";
  if (text === "starting") return "active";
  if (text === "started") return "active";
  if (text === "resumed") return "active";
  if (text === "running") return "active";
  if (text === "recovering") return "active";
  if (text === "youtube_oauth_required") return "operator_action_required";
  if (text === "youtube oauth required") return "operator_action_required";
  if (text === "youtube-oauth-required") return "operator_action_required";
  if (text === "oauth_required") return "operator_action_required";
  if (text === "youtube_oauth_missing") return "operator_action_required";
  if (text === "youtube oauth missing") return "operator_action_required";
  if (text === "youtube-oauth-missing") return "operator_action_required";
  if (text === "oauth_missing") return "operator_action_required";
  if (text === "oauth missing") return "operator_action_required";
  if (text === "oauth-missing") return "operator_action_required";
  if (text === "oauth2_missing") return "operator_action_required";
  if (text === "oauth2 missing") return "operator_action_required";
  if (text === "oauth2-missing") return "operator_action_required";
  if (text === "oauth_2_missing") return "operator_action_required";
  if (text === "oauth 2 missing") return "operator_action_required";
  if (text === "oauth-2-missing") return "operator_action_required";
  if (text === "oauth 2 required") return "operator_action_required";
  if (text === "oauth_2_required") return "operator_action_required";
  if (text === "oauth-2-required") return "operator_action_required";
  if (text === "oauth2_required") return "operator_action_required";
  if (text === "youtube_oauth_invalid") return "operator_action_required";
  if (text === "youtube oauth invalid") return "operator_action_required";
  if (text === "youtube-oauth-invalid") return "operator_action_required";
  if (text === "oauth2_invalid") return "operator_action_required";
  if (text === "oauth2 invalid") return "operator_action_required";
  if (text === "oauth2-invalid") return "operator_action_required";
  if (text === "oauth_2_invalid") return "operator_action_required";
  if (text === "oauth 2 invalid") return "operator_action_required";
  if (text === "oauth-2-invalid") return "operator_action_required";
  if (text === "oauth_invalid") return "operator_action_required";
  if (text === "oauth invalid") return "operator_action_required";
  if (text === "oauth-invalid") return "operator_action_required";
  if (text === "client_secret_missing") return "operator_action_required";
  if (text === "client secret missing") return "operator_action_required";
  if (text === "client-secret-missing") return "operator_action_required";
  if (text === "client_secret_invalid") return "operator_action_required";
  if (text === "client secret invalid") return "operator_action_required";
  if (text === "client-secret-invalid") return "operator_action_required";
  if (text === "client_id_missing") return "operator_action_required";
  if (text === "client id missing") return "operator_action_required";
  if (text === "client-id-missing") return "operator_action_required";
  if (text === "client_id_invalid") return "operator_action_required";
  if (text === "client id invalid") return "operator_action_required";
  if (text === "client-id-invalid") return "operator_action_required";
  if (text === "client_credentials_missing") return "operator_action_required";
  if (text === "client_credentials_invalid") return "operator_action_required";
  if (text === "client credentials missing") return "operator_action_required";
  if (text === "client credentials invalid") return "operator_action_required";
  if (text === "client-credentials-missing") return "operator_action_required";
  if (text === "client-credentials-invalid") return "operator_action_required";
  if (text === "youtube_auth_required") return "operator_action_required";
  if (text === "youtube auth required") return "operator_action_required";
  if (text === "youtube-auth-required") return "operator_action_required";
  if (text === "auth_required") return "operator_action_required";
  if (text === "youtube_auth_missing") return "operator_action_required";
  if (text === "youtube auth missing") return "operator_action_required";
  if (text === "youtube-auth-missing") return "operator_action_required";
  if (text === "auth_missing") return "operator_action_required";
  if (text === "auth missing") return "operator_action_required";
  if (text === "auth-missing") return "operator_action_required";
  if (text === "authorization_missing") return "operator_action_required";
  if (text === "authorization missing") return "operator_action_required";
  if (text === "authorization-missing") return "operator_action_required";
  if (text === "auth_denied") return "operator_action_required";
  if (text === "auth denied") return "operator_action_required";
  if (text === "auth-denied") return "operator_action_required";
  if (text === "youtube_auth_error") return "operator_action_required";
  if (text === "youtube auth error") return "operator_action_required";
  if (text === "youtube-auth-error") return "operator_action_required";
  if (text === "youtube_auth_failed") return "operator_action_required";
  if (text === "youtube auth failed") return "operator_action_required";
  if (text === "youtube-auth-failed") return "operator_action_required";
  if (text === "authorization_required") return "operator_action_required";
  if (text === "authorization required") return "operator_action_required";
  if (text === "authorization-required") return "operator_action_required";
  if (text === "authorization_denied") return "operator_action_required";
  if (text === "authorization denied") return "operator_action_required";
  if (text === "authorization-denied") return "operator_action_required";
  if (text === "unauthorized") return "operator_action_required";
  if (text === "forbidden") return "operator_action_required";
  if (text === "invalid_auth") return "operator_action_required";
  if (text === "invalid auth") return "operator_action_required";
  if (text === "invalid-auth") return "operator_action_required";
  if (text === "authentication_invalid") return "operator_action_required";
  if (text === "authentication invalid") return "operator_action_required";
  if (text === "authentication-invalid") return "operator_action_required";
  if (text === "authentication_required") return "operator_action_required";
  if (text === "authentication_missing") return "operator_action_required";
  if (text === "authentication missing") return "operator_action_required";
  if (text === "authentication-missing") return "operator_action_required";
  if (text === "not_authenticated") return "operator_action_required";
  if (text === "not authenticated") return "operator_action_required";
  if (text === "not-authenticated") return "operator_action_required";
  if (text === "credentials_required") return "operator_action_required";
  if (text === "credentials required") return "operator_action_required";
  if (text === "credentials-required") return "operator_action_required";
  if (text === "youtube_credentials_missing") return "operator_action_required";
  if (text === "youtube credentials missing") return "operator_action_required";
  if (text === "youtube-credentials-missing") return "operator_action_required";
  if (text === "unauthenticated") return "operator_action_required";
  if (text === "youtube_credentials_invalid") return "operator_action_required";
  if (text === "youtube credentials invalid") return "operator_action_required";
  if (text === "youtube-credentials-invalid") return "operator_action_required";
  if (text === "invalid_credentials") return "operator_action_required";
  if (text === "invalid credentials") return "operator_action_required";
  if (text === "invalid-credentials") return "operator_action_required";
  if (text === "youtube_token_missing") return "operator_action_required";
  if (text === "youtube token missing") return "operator_action_required";
  if (text === "youtube-token-missing") return "operator_action_required";
  if (text === "youtube_token_invalid") return "operator_action_required";
  if (text === "youtube token invalid") return "operator_action_required";
  if (text === "youtube-token-invalid") return "operator_action_required";
  if (text === "token_invalid") return "operator_action_required";
  if (text === "token invalid") return "operator_action_required";
  if (text === "token-invalid") return "operator_action_required";
  if (text === "youtube_refresh_token_invalid") return "operator_action_required";
  if (text === "youtube refresh token invalid") return "operator_action_required";
  if (text === "youtube-refresh-token-invalid") return "operator_action_required";
  if (text === "refresh_token_invalid") return "operator_action_required";
  if (text === "refresh token invalid") return "operator_action_required";
  if (text === "refresh-token-invalid") return "operator_action_required";
  if (text === "expired_token") return "operator_action_required";
  if (text === "youtube_refresh_token_expired") return "operator_action_required";
  if (text === "youtube refresh token expired") return "operator_action_required";
  if (text === "youtube-refresh-token-expired") return "operator_action_required";
  if (text === "refresh_token_expired") return "operator_action_required";
  if (text === "refresh token expired") return "operator_action_required";
  if (text === "refresh-token-expired") return "operator_action_required";
  if (text === "expired token") return "operator_action_required";
  if (text === "expired-token") return "operator_action_required";
  if (text === "youtube_token_expired") return "operator_action_required";
  if (text === "youtube token expired") return "operator_action_required";
  if (text === "youtube-token-expired") return "operator_action_required";
  if (text === "token_expired") return "operator_action_required";
  if (text === "token expired") return "operator_action_required";
  if (text === "token-expired") return "operator_action_required";
  if (text === "reauth_required") return "operator_action_required";
  if (text === "reauth required") return "operator_action_required";
  if (text === "reauth-required") return "operator_action_required";
  if (text === "reauthentication_required") return "operator_action_required";
  if (text === "reauthentication required") return "operator_action_required";
  if (text === "reauthentication-required") return "operator_action_required";
  if (text === "login_required") return "operator_action_required";
  if (text === "login required") return "operator_action_required";
  if (text === "login-required") return "operator_action_required";
  if (text === "youtube_permission_required") return "operator_action_required";
  if (text === "youtube permission required") return "operator_action_required";
  if (text === "youtube-permission-required") return "operator_action_required";
  if (text === "permission_required") return "operator_action_required";
  if (text === "permission required") return "operator_action_required";
  if (text === "permission-required") return "operator_action_required";
  if (text === "youtube_permission_denied") return "operator_action_required";
  if (text === "youtube permission denied") return "operator_action_required";
  if (text === "youtube-permission-denied") return "operator_action_required";
  if (text === "permission_denied") return "operator_action_required";
  if (text === "permission denied") return "operator_action_required";
  if (text === "permission-denied") return "operator_action_required";
  if (text === "youtube_scope_required") return "operator_action_required";
  if (text === "youtube scope required") return "operator_action_required";
  if (text === "youtube-scope-required") return "operator_action_required";
  if (text === "scope_required") return "operator_action_required";
  if (text === "scope required") return "operator_action_required";
  if (text === "scope-required") return "operator_action_required";
  if (text === "youtube_scope_denied") return "operator_action_required";
  if (text === "youtube scope denied") return "operator_action_required";
  if (text === "youtube-scope-denied") return "operator_action_required";
  if (text === "scope_denied") return "operator_action_required";
  if (text === "scope denied") return "operator_action_required";
  if (text === "scope-denied") return "operator_action_required";
  if (text === "youtube_access_denied") return "operator_action_required";
  if (text === "youtube access denied") return "operator_action_required";
  if (text === "youtube-access-denied") return "operator_action_required";
  if (text === "access_denied") return "operator_action_required";
  if (text === "access denied") return "operator_action_required";
  if (text === "access-denied") return "operator_action_required";
  if (text === "youtube_access_revoked") return "operator_action_required";
  if (text === "youtube access revoked") return "operator_action_required";
  if (text === "youtube-access-revoked") return "operator_action_required";
  if (text === "access_revoked") return "operator_action_required";
  if (text === "access revoked") return "operator_action_required";
  if (text === "access-revoked") return "operator_action_required";
  if (text === "youtube_revoked") return "operator_action_required";
  if (text === "youtube revoked") return "operator_action_required";
  if (text === "youtube-revoked") return "operator_action_required";
  if (text === "revoked") return "operator_action_required";
  if (text === "youtube_consent_required") return "operator_action_required";
  if (text === "youtube consent required") return "operator_action_required";
  if (text === "youtube-consent-required") return "operator_action_required";
  if (text === "consent_required") return "operator_action_required";
  if (text === "consent required") return "operator_action_required";
  if (text === "consent-required") return "operator_action_required";
  if (text === "youtube_api_key_required") return "operator_action_required";
  if (text === "youtube api key required") return "operator_action_required";
  if (text === "youtube-api-key-required") return "operator_action_required";
  if (text === "api_key_required") return "operator_action_required";
  if (text === "api key required") return "operator_action_required";
  if (text === "api-key-required") return "operator_action_required";
  if (text === "youtube_api_key_missing") return "operator_action_required";
  if (text === "youtube api key missing") return "operator_action_required";
  if (text === "youtube-api-key-missing") return "operator_action_required";
  if (text === "api_key_missing") return "operator_action_required";
  if (text === "api key missing") return "operator_action_required";
  if (text === "api-key-missing") return "operator_action_required";
  if (text === "youtube_api_key_invalid") return "operator_action_required";
  if (text === "youtube api key invalid") return "operator_action_required";
  if (text === "youtube-api-key-invalid") return "operator_action_required";
  if (text === "api_key_invalid") return "operator_action_required";
  if (text === "api key invalid") return "operator_action_required";
  if (text === "api-key-invalid") return "operator_action_required";
  if (text === "youtube_invalid_api_key") return "operator_action_required";
  if (text === "youtube invalid api key") return "operator_action_required";
  if (text === "youtube-invalid-api-key") return "operator_action_required";
  if (text === "invalid_api_key") return "operator_action_required";
  if (text === "invalid api key") return "operator_action_required";
  if (text === "invalid-api-key") return "operator_action_required";
  if (text === "youtube_missing_api_key") return "operator_action_required";
  if (text === "youtube missing api key") return "operator_action_required";
  if (text === "youtube-missing-api-key") return "operator_action_required";
  if (text === "missing_api_key") return "operator_action_required";
  if (text === "missing api key") return "operator_action_required";
  if (text === "missing-api-key") return "operator_action_required";
  if (text === "youtube_key_missing") return "operator_action_required";
  if (text === "youtube key missing") return "operator_action_required";
  if (text === "youtube-key-missing") return "operator_action_required";
  if (text === "youtube_key_required") return "operator_action_required";
  if (text === "youtube key required") return "operator_action_required";
  if (text === "youtube-key-required") return "operator_action_required";
  if (text === "key_required") return "operator_action_required";
  if (text === "key required") return "operator_action_required";
  if (text === "key-required") return "operator_action_required";
  if (text === "youtube_key_invalid") return "operator_action_required";
  if (text === "youtube key invalid") return "operator_action_required";
  if (text === "youtube-key-invalid") return "operator_action_required";
  if (text === "youtube_operator_required") return "operator_action_required";
  if (text === "youtube operator required") return "operator_action_required";
  if (text === "youtube-operator-required") return "operator_action_required";
  if (text === "operator_required") return "operator_action_required";
  if (text === "youtube_setup_required") return "operator_action_required";
  if (text === "youtube setup required") return "operator_action_required";
  if (text === "youtube-setup-required") return "operator_action_required";
  if (text === "setup_required") return "operator_action_required";
  if (text === "setup required") return "operator_action_required";
  if (text === "setup-required") return "operator_action_required";
  if (text === "youtube_configuration_missing") return "operator_action_required";
  if (text === "youtube configuration missing") return "operator_action_required";
  if (text === "youtube-configuration-missing") return "operator_action_required";
  if (text === "youtube_config_missing") return "operator_action_required";
  if (text === "youtube config missing") return "operator_action_required";
  if (text === "youtube-config-missing") return "operator_action_required";
  if (text === "configuration_missing") return "operator_action_required";
  if (text === "configuration missing") return "operator_action_required";
  if (text === "configuration-missing") return "operator_action_required";
  if (text === "youtube_configuration_required") return "operator_action_required";
  if (text === "youtube configuration required") return "operator_action_required";
  if (text === "youtube-configuration-required") return "operator_action_required";
  if (text === "youtube_config_required") return "operator_action_required";
  if (text === "youtube config required") return "operator_action_required";
  if (text === "youtube-config-required") return "operator_action_required";
  if (text === "configuration_required") return "operator_action_required";
  if (text === "configuration required") return "operator_action_required";
  if (text === "configuration-required") return "operator_action_required";
  if (text === "youtube_misconfigured") return "operator_action_required";
  if (text === "misconfigured") return "operator_action_required";
  if (text === "youtube_bad_config") return "operator_action_required";
  if (text === "youtube bad config") return "operator_action_required";
  if (text === "youtube-bad-config") return "operator_action_required";
  if (text === "youtube_config_invalid") return "operator_action_required";
  if (text === "youtube config invalid") return "operator_action_required";
  if (text === "youtube-config-invalid") return "operator_action_required";
  if (text === "youtube_bad_configuration") return "operator_action_required";
  if (text === "youtube bad configuration") return "operator_action_required";
  if (text === "youtube-bad-configuration") return "operator_action_required";
  if (text === "youtube_invalid_config") return "operator_action_required";
  if (text === "youtube invalid config") return "operator_action_required";
  if (text === "youtube-invalid-config") return "operator_action_required";
  if (text === "youtube_configuration_invalid") return "operator_action_required";
  if (text === "youtube configuration invalid") return "operator_action_required";
  if (text === "youtube-configuration-invalid") return "operator_action_required";
  if (text === "bad_config") return "operator_action_required";
  if (text === "bad config") return "operator_action_required";
  if (text === "bad-config") return "operator_action_required";
  if (text === "youtube_video_invalid") return "operator_action_required";
  if (text === "youtube video invalid") return "operator_action_required";
  if (text === "youtube-video-invalid") return "operator_action_required";
  if (text === "youtube_video_required") return "operator_action_required";
  if (text === "youtube video required") return "operator_action_required";
  if (text === "youtube-video-required") return "operator_action_required";
  if (text === "youtube_video_id_invalid") return "operator_action_required";
  if (text === "youtube video id invalid") return "operator_action_required";
  if (text === "youtube-video-id-invalid") return "operator_action_required";
  if (text === "video_id_invalid") return "operator_action_required";
  if (text === "video id invalid") return "operator_action_required";
  if (text === "video-id-invalid") return "operator_action_required";
  if (text === "youtube_video_id_required") return "operator_action_required";
  if (text === "youtube video id required") return "operator_action_required";
  if (text === "youtube-video-id-required") return "operator_action_required";
  if (text === "youtube_video_missing") return "operator_action_required";
  if (text === "youtube video missing") return "operator_action_required";
  if (text === "youtube-video-missing") return "operator_action_required";
  if (text === "video_missing") return "operator_action_required";
  if (text === "video missing") return "operator_action_required";
  if (text === "video-missing") return "operator_action_required";
  if (text === "youtube_video_id_missing") return "operator_action_required";
  if (text === "youtube video id missing") return "operator_action_required";
  if (text === "youtube-video-id-missing") return "operator_action_required";
  if (text === "video_id_missing") return "operator_action_required";
  if (text === "video id missing") return "operator_action_required";
  if (text === "video-id-missing") return "operator_action_required";
  if (text === "youtube_live_invalid") return "operator_action_required";
  if (text === "youtube live invalid") return "operator_action_required";
  if (text === "youtube-live-invalid") return "operator_action_required";
  if (text === "youtube_live_required") return "operator_action_required";
  if (text === "youtube live required") return "operator_action_required";
  if (text === "youtube-live-required") return "operator_action_required";
  if (text === "youtube_live_id_invalid") return "operator_action_required";
  if (text === "youtube live id invalid") return "operator_action_required";
  if (text === "youtube-live-id-invalid") return "operator_action_required";
  if (text === "live_id_invalid") return "operator_action_required";
  if (text === "live id invalid") return "operator_action_required";
  if (text === "live-id-invalid") return "operator_action_required";
  if (text === "youtube_live_id_required") return "operator_action_required";
  if (text === "youtube live id required") return "operator_action_required";
  if (text === "youtube-live-id-required") return "operator_action_required";
  if (text === "youtube_live_missing") return "operator_action_required";
  if (text === "youtube live missing") return "operator_action_required";
  if (text === "youtube-live-missing") return "operator_action_required";
  if (text === "live_missing") return "operator_action_required";
  if (text === "live missing") return "operator_action_required";
  if (text === "live-missing") return "operator_action_required";
  if (text === "youtube_live_id_missing") return "operator_action_required";
  if (text === "youtube live id missing") return "operator_action_required";
  if (text === "youtube-live-id-missing") return "operator_action_required";
  if (text === "live_id_missing") return "operator_action_required";
  if (text === "live id missing") return "operator_action_required";
  if (text === "live-id-missing") return "operator_action_required";
  if (text === "youtube_stream_invalid") return "operator_action_required";
  if (text === "youtube stream invalid") return "operator_action_required";
  if (text === "youtube-stream-invalid") return "operator_action_required";
  if (text === "youtube_stream_required") return "operator_action_required";
  if (text === "youtube stream required") return "operator_action_required";
  if (text === "youtube-stream-required") return "operator_action_required";
  if (text === "youtube_stream_id_invalid") return "operator_action_required";
  if (text === "youtube stream id invalid") return "operator_action_required";
  if (text === "youtube-stream-id-invalid") return "operator_action_required";
  if (text === "stream_id_invalid") return "operator_action_required";
  if (text === "stream id invalid") return "operator_action_required";
  if (text === "stream-id-invalid") return "operator_action_required";
  if (text === "youtube_stream_id_required") return "operator_action_required";
  if (text === "youtube stream id required") return "operator_action_required";
  if (text === "youtube-stream-id-required") return "operator_action_required";
  if (text === "youtube_stream_missing") return "operator_action_required";
  if (text === "youtube stream missing") return "operator_action_required";
  if (text === "youtube-stream-missing") return "operator_action_required";
  if (text === "stream_missing") return "operator_action_required";
  if (text === "stream missing") return "operator_action_required";
  if (text === "stream-missing") return "operator_action_required";
  if (text === "youtube_stream_id_missing") return "operator_action_required";
  if (text === "youtube stream id missing") return "operator_action_required";
  if (text === "youtube-stream-id-missing") return "operator_action_required";
  if (text === "stream_id_missing") return "operator_action_required";
  if (text === "stream id missing") return "operator_action_required";
  if (text === "stream-id-missing") return "operator_action_required";
  if (text === "youtube_broadcast_invalid") return "operator_action_required";
  if (text === "youtube broadcast invalid") return "operator_action_required";
  if (text === "youtube-broadcast-invalid") return "operator_action_required";
  if (text === "youtube_broadcast_required") return "operator_action_required";
  if (text === "youtube broadcast required") return "operator_action_required";
  if (text === "youtube-broadcast-required") return "operator_action_required";
  if (text === "youtube_broadcast_id_invalid") return "operator_action_required";
  if (text === "youtube broadcast id invalid") return "operator_action_required";
  if (text === "youtube-broadcast-id-invalid") return "operator_action_required";
  if (text === "broadcast_id_invalid") return "operator_action_required";
  if (text === "broadcast id invalid") return "operator_action_required";
  if (text === "broadcast-id-invalid") return "operator_action_required";
  if (text === "youtube_broadcast_id_required") return "operator_action_required";
  if (text === "youtube broadcast id required") return "operator_action_required";
  if (text === "youtube-broadcast-id-required") return "operator_action_required";
  if (text === "youtube_broadcast_missing") return "operator_action_required";
  if (text === "youtube broadcast missing") return "operator_action_required";
  if (text === "youtube-broadcast-missing") return "operator_action_required";
  if (text === "broadcast_missing") return "operator_action_required";
  if (text === "broadcast missing") return "operator_action_required";
  if (text === "broadcast-missing") return "operator_action_required";
  if (text === "youtube_broadcast_id_missing") return "operator_action_required";
  if (text === "youtube broadcast id missing") return "operator_action_required";
  if (text === "youtube-broadcast-id-missing") return "operator_action_required";
  if (text === "broadcast_id_missing") return "operator_action_required";
  if (text === "broadcast id missing") return "operator_action_required";
  if (text === "broadcast-id-missing") return "operator_action_required";
  if (text === "youtube_channel_required") return "operator_action_required";
  if (text === "youtube channel required") return "operator_action_required";
  if (text === "youtube-channel-required") return "operator_action_required";
  if (text === "youtube_channel_id_invalid") return "operator_action_required";
  if (text === "youtube channel id invalid") return "operator_action_required";
  if (text === "youtube-channel-id-invalid") return "operator_action_required";
  if (text === "channel_id_invalid") return "operator_action_required";
  if (text === "channel id invalid") return "operator_action_required";
  if (text === "channel-id-invalid") return "operator_action_required";
  if (text === "youtube_channel_id_required") return "operator_action_required";
  if (text === "youtube channel id required") return "operator_action_required";
  if (text === "youtube-channel-id-required") return "operator_action_required";
  if (text === "youtube_channel_id_missing") return "operator_action_required";
  if (text === "youtube channel id missing") return "operator_action_required";
  if (text === "youtube-channel-id-missing") return "operator_action_required";
  if (text === "channel_id_missing") return "operator_action_required";
  if (text === "channel id missing") return "operator_action_required";
  if (text === "channel-id-missing") return "operator_action_required";
  if (text === "youtube_playlist_required") return "operator_action_required";
  if (text === "youtube playlist required") return "operator_action_required";
  if (text === "youtube-playlist-required") return "operator_action_required";
  if (text === "youtube_playlist_id_invalid") return "operator_action_required";
  if (text === "playlist_id_invalid") return "operator_action_required";
  if (text === "playlist id invalid") return "operator_action_required";
  if (text === "playlist-id-invalid") return "operator_action_required";
  if (text === "youtube_playlist_id_required") return "operator_action_required";
  if (text === "youtube playlist id required") return "operator_action_required";
  if (text === "youtube-playlist-id-required") return "operator_action_required";
  if (text === "playlist_id_missing") return "operator_action_required";
  if (text === "playlist id missing") return "operator_action_required";
  if (text === "playlist-id-missing") return "operator_action_required";
  if (text === "youtube_live_chat_invalid") return "operator_action_required";
  if (text === "youtube live chat invalid") return "operator_action_required";
  if (text === "youtube-live-chat-invalid") return "operator_action_required";
  if (text === "live_chat_id_invalid") return "operator_action_required";
  if (text === "live chat id invalid") return "operator_action_required";
  if (text === "live-chat-id-invalid") return "operator_action_required";
  if (text === "youtube_chat_missing") return "operator_action_required";
  if (text === "youtube chat missing") return "operator_action_required";
  if (text === "youtube-chat-missing") return "operator_action_required";
  if (text === "youtube_live_chat_missing") return "operator_action_required";
  if (text === "youtube live chat missing") return "operator_action_required";
  if (text === "youtube-live-chat-missing") return "operator_action_required";
  if (text === "chat_missing") return "operator_action_required";
  if (text === "chat missing") return "operator_action_required";
  if (text === "chat-missing") return "operator_action_required";
  if (text === "live_chat_id_missing") return "operator_action_required";
  if (text === "live chat id missing") return "operator_action_required";
  if (text === "live-chat-id-missing") return "operator_action_required";
  if (text === "youtube_chat_invalid") return "operator_action_required";
  if (text === "youtube chat invalid") return "operator_action_required";
  if (text === "youtube-chat-invalid") return "operator_action_required";
  if (text === "chat_id_invalid") return "operator_action_required";
  if (text === "chat id invalid") return "operator_action_required";
  if (text === "chat-id-invalid") return "operator_action_required";
  if (text === "chat_id_missing") return "operator_action_required";
  if (text === "chat id missing") return "operator_action_required";
  if (text === "chat-id-missing") return "operator_action_required";
  if (text === "invalid_config") return "operator_action_required";
  if (text === "invalid config") return "operator_action_required";
  if (text === "invalid-config") return "operator_action_required";
  if (text === "invalid_configuration") return "operator_action_required";
  if (text === "invalid configuration") return "operator_action_required";
  if (text === "invalid-configuration") return "operator_action_required";
  if (text === "not_configured") return "operator_action_required";
  if (text === "not configured") return "operator_action_required";
  if (text === "not-configured") return "operator_action_required";
  if (text === "unconfigured") return "operator_action_required";
  if (text === "live_chat_missing") return "operator_action_required";
  if (text === "live chat missing") return "operator_action_required";
  if (text === "live-chat-missing") return "operator_action_required";
  if (text === "missing_live_chat") return "operator_action_required";
  if (text === "missing live chat") return "operator_action_required";
  if (text === "missing-live-chat") return "operator_action_required";
  if (text === "live_chat_unavailable") return "operator_action_required";
  if (text === "live chat unavailable") return "operator_action_required";
  if (text === "live-chat-unavailable") return "operator_action_required";
  if (text === "chat_disabled") return "operator_action_required";
  if (text === "chat disabled") return "operator_action_required";
  if (text === "chat-disabled") return "operator_action_required";
  if (text === "chat_unavailable") return "operator_action_required";
  if (text === "chat unavailable") return "operator_action_required";
  if (text === "chat-unavailable") return "operator_action_required";
  if (text === "live_ended") return "operator_action_required";
  if (text === "live ended") return "operator_action_required";
  if (text === "live-ended") return "operator_action_required";
  if (text === "stream_ended") return "operator_action_required";
  if (text === "stream ended") return "operator_action_required";
  if (text === "stream-ended") return "operator_action_required";
  if (text === "broadcast_ended") return "operator_action_required";
  if (text === "broadcast ended") return "operator_action_required";
  if (text === "broadcast-ended") return "operator_action_required";
  if (text === "ended") return "operator_action_required";
  if (text === "not_found") return "operator_action_required";
  if (text === "not found") return "operator_action_required";
  if (text === "not-found") return "operator_action_required";
  if (text === "youtube_video_not_found") return "operator_action_required";
  if (text === "youtube video not found") return "operator_action_required";
  if (text === "youtube-video-not-found") return "operator_action_required";
  if (text === "video_not_found") return "operator_action_required";
  if (text === "video not found") return "operator_action_required";
  if (text === "video-not-found") return "operator_action_required";
  if (text === "youtube_live_not_found") return "operator_action_required";
  if (text === "youtube live not found") return "operator_action_required";
  if (text === "youtube-live-not-found") return "operator_action_required";
  if (text === "youtube_stream_not_found") return "operator_action_required";
  if (text === "youtube stream not found") return "operator_action_required";
  if (text === "youtube-stream-not-found") return "operator_action_required";
  if (text === "youtube_broadcast_not_found") return "operator_action_required";
  if (text === "youtube broadcast not found") return "operator_action_required";
  if (text === "youtube-broadcast-not-found") return "operator_action_required";
  if (text === "youtube_chat_not_found") return "operator_action_required";
  if (text === "youtube chat not found") return "operator_action_required";
  if (text === "youtube-chat-not-found") return "operator_action_required";
  if (text === "youtube_live_chat_not_found") return "operator_action_required";
  if (text === "youtube live chat not found") return "operator_action_required";
  if (text === "youtube-live-chat-not-found") return "operator_action_required";
  if (text === "not_ready") return "operator_action_required";
  if (text === "not ready") return "operator_action_required";
  if (text === "not-ready") return "operator_action_required";
  if (text === "youtube_unavailable") return "operator_action_required";
  if (text === "youtube unavailable") return "operator_action_required";
  if (text === "youtube-unavailable") return "operator_action_required";
  if (text === "unavailable") return "operator_action_required";
  if (text === "youtube_blocked") return "operator_action_required";
  if (text === "youtube blocked") return "operator_action_required";
  if (text === "youtube-blocked") return "operator_action_required";
  if (text === "blocked") return "operator_action_required";
  if (text === "youtube_failed") return "operator_action_required";
  if (text === "youtube failed") return "operator_action_required";
  if (text === "youtube-failed") return "operator_action_required";
  if (text === "failed") return "operator_action_required";
  if (text === "youtube_error") return "operator_action_required";
  if (text === "youtube error") return "operator_action_required";
  if (text === "youtube-error") return "operator_action_required";
  if (text === "error") return "operator_action_required";
  if (text === "youtube_fatal") return "operator_action_required";
  if (text === "youtube fatal") return "operator_action_required";
  if (text === "youtube-fatal") return "operator_action_required";
  if (text === "fatal") return "operator_action_required";
  if (
    [
      "ready",
      "idle",
      "active",
      "polling_cooldown",
      "retry_backoff",
      "operator_action_required",
      "attention",
    ].includes(text)
  ) {
    return text;
  }
  return text ? "attention" : null;
}

function safeLocalEndpointPolicy(value) {
  const text = safeOptionalText(value, 80);
  if (text === "loopback-or-private-network-only") return "loopback_or_private_network_only";
  if (text === "loopback-or-private-network") return "loopback_or_private_network_only";
  if (text === "loopback-or-private-only") return "loopback_or_private_only";
  if (text === "loopback-or-private") return "loopback_or_private_only";
  if (text === "loopback_private_network") return "loopback_or_private_network_only";
  if (text === "loopback_or_private") return "loopback_or_private_only";
  if (text === "loopback_private") return "loopback_or_private_only";
  if (text === "loopback_or_private_network_only") return text;
  if (text === "loopback_or_private_only") return text;
  if (text === "loopback-only") return "loopback_only";
  if (text === "loopback_only") return text;
  if (text === "localhost-only") return "localhost_only";
  if (text === "localhost_only") return text;
  if (text === "local-only") return "local_only";
  if (text === "local_only") return text;
  if (text === "private-network-only") return "private_network_only";
  if (text === "private_network_only") return text;
  if (text === "not-applicable") return "not_applicable";
  if (text === "n/a") return "not_applicable";
  if (text === "na") return "not_applicable";
  if (text === "none") return "not_applicable";
  if (text === "not_applicable") return text;
  return null;
}

function safeLocalEndpointPolicyStatus(value) {
  const text = safeOptionalText(value, 80);
  if (text === "not applicable") return "not_applicable";
  if (text === "not-applicable") return "not_applicable";
  if (text === "not set") return "not_set";
  if (text === "not-set") return "not_set";
  if (text === "not required") return "not_required";
  if (text === "not-required") return "not_required";
  if (text === "not needed") return "not_required";
  if (text === "not-needed") return "not_required";
  if (text === "not used") return "not_required";
  if (text === "not-used") return "not_required";
  if (text === "not in use") return "not_required";
  if (text === "not-in-use") return "not_required";
  if (text === "not configured") return "not_configured";
  if (text === "not-configured") return "not_configured";
  if (text === "unconfigured") return "not_configured";
  if (text === "not ready") return "not_configured";
  if (text === "not-ready") return "not_configured";
  if (text === "not enabled") return "not_enabled";
  if (text === "not-enabled") return "not_enabled";
  if (text === "disabled_by_config") return "disabled";
  if (text === "disabled by config") return "disabled";
  if (text === "disabled-by-config") return "disabled";
  if (text === "blocked_by_policy") return "blocked";
  if (text === "blocked-by-policy") return "blocked";
  if (text === "policy_blocked") return "blocked";
  if (text === "policy-blocked") return "blocked";
  if (text === "rejected_by_policy") return "blocked";
  if (text === "rejected-by-policy") return "blocked";
  if (text === "denied_by_policy") return "blocked";
  if (text === "denied-by-policy") return "blocked";
  if (text === "forbidden_by_policy") return "blocked";
  if (text === "forbidden-by-policy") return "blocked";
  if (text === "disallowed") return "blocked";
  if (text === "not allowed") return "blocked";
  if (text === "not-allowed") return "blocked";
  if (text === "invalid") return "blocked";
  if (text === "unsafe") return "blocked";
  if (text === "bad") return "blocked";
  if (text === "fail") return "blocked";
  if (text === "failed") return "blocked";
  if (text === "not active") return "inactive";
  if (text === "not-active") return "inactive";
  if (text === "not running") return "inactive";
  if (text === "not-running") return "inactive";
  if (text === "deactivated") return "inactive";
  if (text === "stopped") return "inactive";
  if (text === "paused") return "inactive";
  if (text === "unnecessary") return "not_required";
  if (
    [
      "all_allowed",
      "all_ok",
      "allowed",
      "ok",
      "pass",
      "passed",
      "permitted",
      "authorized",
      "clear",
      "unblocked",
      "valid",
      "safe",
      "local_ok",
      "localhost_ok",
      "loopback_ok",
      "private_network_ok",
      "blocked",
      "not_configured",
      "not_set",
      "unset",
      "not_required",
      "ignored",
      "skipped",
      "bypassed",
      "disabled",
      "inactive",
      "off",
      "not_enabled",
      "not_in_use",
      "unused",
      "none",
      "n/a",
      "na",
      "not_applicable",
    ].includes(text)
  ) {
    return text;
  }
  return null;
}

function safeEndpointScope(value) {
  const text = safeOptionalText(value, 80);
  if (value === "privateNetwork") return "private_network";
  if (value === "privateNetworkOnly") return "private_network";
  if (text === "private_network_only") return "private_network";
  if (text === "private-network-only") return "private_network";
  if (text === "private network") return "private_network";
  if (text === "private-network") return "private_network";
  if (text === "ipv6_loopback") return "loopback";
  if (text === "ipv6 loopback") return "loopback";
  if (text === "ipv6-loopback") return "loopback";
  if (value === "loopbackOnly") return "loopback";
  if (text === "::1") return "loopback";
  if (text === "0:0:0:0:0:0:0:1") return "loopback";
  if (text === "ipv4_loopback") return "loopback";
  if (text === "ipv4 loopback") return "loopback";
  if (text === "ipv4-loopback") return "loopback";
  if (text === "127.0.0.1") return "loopback";
  if (text === "127.0.0.0/8") return "loopback";
  if (text === "loopback_address") return "loopback";
  if (text === "loopback address") return "loopback";
  if (text === "loopback-address") return "loopback";
  if (text === "loopback only") return "loopback";
  if (text === "loopback_only") return "loopback";
  if (text === "loopback-only") return "loopback";
  if (value === "localhostOnly") return "localhost";
  if (text === "self") return "localhost";
  if (text === "self_host") return "localhost";
  if (text === "self host") return "localhost";
  if (text === "self-host") return "localhost";
  if (text === "machine_local") return "localhost";
  if (text === "machine local") return "localhost";
  if (text === "machine-local") return "localhost";
  if (text === "local_host") return "localhost";
  if (text === "local host") return "localhost";
  if (text === "local-host") return "localhost";
  if (text === "host_local") return "localhost";
  if (text === "host local") return "localhost";
  if (text === "host-local") return "localhost";
  if (text === "localhost_address") return "localhost";
  if (text === "localhost address") return "localhost";
  if (text === "localhost-address") return "localhost";
  if (text === "localhost only") return "localhost";
  if (text === "localhost_only") return "localhost";
  if (text === "localhost-only") return "localhost";
  if (value === "localOnly") return "local";
  if (text === "local only") return "local";
  if (text === "local_only") return "local";
  if (text === "local-only") return "local";
  if (text === "internal") return "local";
  if (value === "privateOnly") return "private";
  if (text === "private only") return "private";
  if (text === "private_only") return "private";
  if (text === "private-only") return "private";
  if (text === "private_address") return "private";
  if (text === "private address") return "private";
  if (text === "private-address") return "private";
  if (text === "rfc1918") return "private";
  if (text === "rfc-1918") return "private";
  if (text === "10.0.0.0/8") return "private";
  if (text === "172.16.0.0/12") return "private";
  if (text === "192.168.0.0/16") return "private";
  if (text === "169.254.0.0/16") return "private";
  if (text === "fc00::/7") return "private";
  if (text === "unique_local") return "private";
  if (text === "unique local") return "private";
  if (text === "unique-local") return "private";
  if (text === "fe80::/10") return "private";
  if (text === "fec0::/10") return "private";
  if (text === "site_local") return "private";
  if (text === "site local") return "private";
  if (text === "site-local") return "private";
  if (text === "private_lan") return "private";
  if (text === "private lan") return "private";
  if (text === "private-lan") return "private";
  if (text === "lan_only") return "private";
  if (text === "lan only") return "private";
  if (text === "lan-only") return "private";
  if (text === "local_network") return "private";
  if (text === "local network") return "private";
  if (text === "local-network") return "private";
  if (text === "lan") return "private";
  if (text === "external network") return "external";
  if (text === "external-network") return "external";
  if (text === "public internet") return "external";
  if (text === "internet") return "external";
  if (text === "internet facing") return "external";
  if (text === "internet_facing") return "external";
  if (text === "internet-facing") return "external";
  if (text === "public") return "external";
  if (text === "public_address") return "external";
  if (text === "public address") return "external";
  if (text === "public-address") return "external";
  if (text === "public_facing") return "external";
  if (text === "public facing") return "external";
  if (text === "public-facing") return "external";
  if (text === "public_network") return "external";
  if (text === "public-network") return "external";
  if (text === "open") return "external";
  if (text === "exposed") return "external";
  if (text === "publicly_accessible") return "external";
  if (text === "publicly accessible") return "external";
  if (text === "publicly-accessible") return "external";
  if (text === "remote") return "external";
  if (text === "wan") return "external";
  if (text === "0.0.0.0/0") return "external";
  if (text === "0.0.0.0") return "external";
  if (text === "::/0") return "external";
  if (text === "::") return "external";
  if (text === "any") return "external";
  if (text === "wildcard") return "external";
  if (text === "wildcard_address") return "external";
  if (text === "wildcard address") return "external";
  if (text === "wildcard-address") return "external";
  if (text === "all_interfaces") return "external";
  if (text === "all-interfaces") return "external";
  if (text === "all interfaces") return "external";
  if (text === "global") return "external";
  if (text === "world") return "external";
  if (text === "not configured") return "not_configured";
  if (text === "not-configured") return "not_configured";
  if (text === "unconfigured") return "not_configured";
  if (text === "missing") return "not_configured";
  if (text === "absent") return "not_configured";
  if (text === "empty") return "not_configured";
  if (text === "blank") return "not_configured";
  if (text === "not ready") return "not_configured";
  if (text === "not-ready") return "not_configured";
  if (text === "not_available") return "not_configured";
  if (text === "not available") return "not_configured";
  if (text === "not-available") return "not_configured";
  if (text === "unavailable") return "not_configured";
  if (text === "not_enabled") return "not_configured";
  if (text === "not enabled") return "not_configured";
  if (text === "not-enabled") return "not_configured";
  if (text === "not_set") return "not_configured";
  if (text === "not-set") return "not_configured";
  if (text === "unset") return "not_configured";
  if (text === "disabled") return "not_configured";
  if (text === "disabled_by_config") return "not_configured";
  if (text === "disabled-by-config") return "not_configured";
  if (text === "off") return "not_configured";
  if (text === "inactive") return "not_configured";
  if (text === "stopped") return "not_configured";
  if (text === "paused") return "not_configured";
  if (text === "none") return "not_configured";
  if (text === "not applicable") return "not_configured";
  if (text === "not_applicable") return "not_configured";
  if (text === "n/a") return "not_configured";
  if (text === "na") return "not_configured";
  if (text === "unknown_scope") return "invalid";
  if (text === "unknown-scope") return "invalid";
  if (text === "unknown") return "invalid";
  if (text === "bad") return "invalid";
  if (text === "invalid_scope") return "invalid";
  if (text === "invalid scope") return "invalid";
  if (text === "invalid-scope") return "invalid";
  if (text === "invalid_endpoint") return "invalid";
  if (text === "invalid endpoint") return "invalid";
  if (text === "invalid-endpoint") return "invalid";
  if (text === "unsafe_endpoint") return "invalid";
  if (text === "unsafe endpoint") return "invalid";
  if (text === "unsafe-endpoint") return "invalid";
  if (text === "unsafe_scope") return "invalid";
  if (text === "unsafe scope") return "invalid";
  if (text === "unsafe-scope") return "invalid";
  if (text === "unsafe") return "invalid";
  if (
    [
      "loopback",
      "local",
      "localhost",
      "private",
      "private_network",
      "external",
      "invalid",
      "not_configured",
    ].includes(text)
  ) {
    return text;
  }
  return null;
}

function safeAuthMode(value) {
  const text = safeOptionalText(value, 80);
  if (value === "apiKey") return "api_key";
  if (text === "key") return "api_key";
  if (text === "apikey") return "api_key";
  if (text === "api-key") return "api_key";
  if (text === "bearer") return "oauth";
  if (text === "token") return "oauth";
  if (text === "access_token") return "oauth";
  if (text === "oauth_token") return "oauth";
  if (text === "application_default_credentials") return "oauth";
  if (text === "adc") return "oauth";
  if (text === "service_account") return "oauth";
  if (text === "oauth_client") return "oauth";
  if (text === "oauth-client") return "oauth";
  if (text === "oauth 2") return "oauth2";
  if (text === "oauth-2") return "oauth2";
  if (text === "oauth_2") return "oauth2";
  if (text === "oauth2_token") return "oauth2";
  if (text === "oauth-refresh") return "oauth_refresh";
  if (text === "oauth2_refresh") return "oauth_refresh";
  if (text === "oauth2-refresh") return "oauth_refresh";
  if (text === "refresh_token") return "oauth_refresh";
  if (text === "oauth-refresh-token") return "oauth_refresh";
  if (text === "oauth_refresh_token") return "oauth_refresh";
  if (text === "oauth2_refresh_token") return "oauth_refresh";
  if (text === "oauth2-refresh-token") return "oauth_refresh";
  if (text === "no_auth") return "none";
  if (text === "anonymous") return "none";
  if (text === "unauthenticated") return "none";
  if (text === "public") return "none";
  if (text === "private") return "oauth";
  if (["api_key", "oauth", "oauth2", "oauth_refresh", "none"].includes(text)) return text;
  return text ? "unknown" : null;
}

function summarizeCursorWriteResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const writeError = safeOptionalBoolean(value.write_error) === true;
  return {
    schema: CURSOR_WRITE_RESULT_SCHEMA,
    written: safeOptionalBoolean(value.written) === true,
    reason: safeCursorWriteReason(value.reason, writeError),
    write_count: safeOptionalNumber(value.write_count),
    write_error: writeError,
    error_kind: safeCursorStoreErrorKind(value.error_kind),
    boundary_policy: {
      no_platform_cursor: true,
      no_store_path: true,
      no_backup_path: true,
      no_secret_values: true,
      summary_only: true,
    },
  };
}

function summarizeCursorStoreStatus(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    schema: CURSOR_STORE_STATUS_SCHEMA,
    configured: safeOptionalBoolean(value.configured) === true,
    health: safeCursorStoreHealth(value.health),
    store_available: safeOptionalBoolean(value.store_available) === true,
    read_error: safeOptionalBoolean(value.read_error) === true,
    write_error: safeOptionalBoolean(value.write_error) === true,
    error_kind: safeCursorStoreErrorKind(value.error_kind),
    has_persisted_cursor: safeOptionalBoolean(value.has_persisted_page_token) === true,
    read_count: safeOptionalNumber(value.read_count),
    write_count: safeOptionalNumber(value.write_count),
    boundary_policy: {
      no_platform_cursor: true,
      no_store_path: true,
      no_backup_path: true,
      no_secret_values: true,
      counts_only: true,
    },
  };
}

function safeCursorStoreHealth(value) {
  const text = safeOptionalText(value, 80);
  if (SAFE_CURSOR_STORE_HEALTH_VALUES.has(text)) return text;
  return "attention";
}

function safeCursorWriteReason(value, writeError) {
  const text = safeOptionalText(value, 80);
  if (SAFE_CURSOR_WRITE_REASONS.has(text)) return text;
  return writeError ? "cursor_store_write_failed" : null;
}

function safeCursorStoreErrorKind(value) {
  const text = safeOptionalText(value, 80);
  if (!text) return null;
  return SAFE_CURSOR_STORE_ERROR_KINDS.has(text) ? text : "store_unavailable";
}

function summarizeSupportEventTypeCounts(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    SUPPORT_EVENT_TYPE_FIELDS.map((field) => [field, safeOptionalNumber(source[field]) ?? 0])
  );
}

function summarizeSupportAmountSourceCounts(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    SUPPORT_AMOUNT_SOURCE_FIELDS.map((field) => [
      field,
      safeOptionalNumber(source[field]) ?? 0,
    ])
  );
}

function summarizeIgnoredEventTypeCounts(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    IGNORED_EVENT_TYPE_FIELDS.map((field) => [field, safeOptionalNumber(source[field]) ?? 0])
  );
}

function summarizeModerationReasonCounts(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    MODERATION_REASON_FIELDS.map((field) => [field, safeOptionalNumber(source[field]) ?? 0])
  );
}

function assertNoForbiddenModerationPublicFields(value, context, path = "root") {
  if (typeof value === "string") {
    if (FORBIDDEN_MODERATION_PUBLIC_TEXT.test(value)) {
      throw new ContractError(`${context}: moderation public summary contains unsafe text`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenModerationPublicFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_MODERATION_PUBLIC_FIELDS.has(field)) {
      throw new ContractError(`${context}: moderation public summary contains unsafe field`, {
        field,
        path,
      });
    }
    assertNoForbiddenModerationPublicFields(child, context, `${path}.${field}`);
  }
}

function summarizePollingIntervalPolicy(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    min_ms: safeOptionalNumber(source.min_ms),
    max_ms: safeOptionalNumber(source.max_ms),
    out_of_range_policy: safePollingOutOfRangePolicy(source.out_of_range_policy),
  };
}

function safePollingOutOfRangePolicy(value) {
  const text = safeOptionalText(value, 80);
  if (["clamp", "reject", "ignore"].includes(text)) return text;
  return text ? "clamp" : null;
}

function summarizeObservationTelemetry(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    observation_count: safeOptionalNumber(source.observation_count) ?? 0,
    average_confidence: safeOptionalNumber(source.average_confidence),
    min_confidence: safeOptionalNumber(source.min_confidence),
    max_confidence: safeOptionalNumber(source.max_confidence),
    low_confidence_count: safeOptionalNumber(source.low_confidence_count) ?? 0,
    with_frame_age_count: safeOptionalNumber(source.with_frame_age_count) ?? 0,
    without_frame_age_count: safeOptionalNumber(source.without_frame_age_count) ?? 0,
    average_frame_age_ms: safeOptionalNumber(source.average_frame_age_ms),
    min_frame_age_ms: safeOptionalNumber(source.min_frame_age_ms),
    max_frame_age_ms: safeOptionalNumber(source.max_frame_age_ms),
    with_frame_reference_count: safeOptionalNumber(source.with_frame_reference_count) ?? 0,
    with_ocr_summary_count: safeOptionalNumber(source.with_ocr_summary_count) ?? 0,
    with_ui_focus_areas_count: safeOptionalNumber(source.with_ui_focus_areas_count) ?? 0,
    raw_frame_available_count: safeOptionalNumber(source.raw_frame_available_count) ?? 0,
  };
}

function readSourceStatus(source) {
  if (typeof source?.status !== "function") return null;
  try {
    const status = source.status();
    if (!status || typeof status !== "object" || Array.isArray(status)) return null;
    return status;
  } catch {
    return null;
  }
}

function summarizeCaptureRequest(summary) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  return {
    schema: "iris_http_ingest_capture_request_summary_v1",
    request_kind: safeCaptureRequestKind(summary.request_kind),
    capture_region_configured: safeOptionalBoolean(summary.capture_region_configured) === true,
    include_ocr_summary: safeOptionalBoolean(summary.include_ocr_summary) === true,
    include_ui_focus_areas: safeOptionalBoolean(summary.include_ui_focus_areas) === true,
    max_detected_events: safeOptionalNumber(summary.max_detected_events),
    raw_frame_policy: safeRawFramePolicy(summary.raw_frame_policy),
  };
}

function safeRawFramePolicy(value) {
  const text = safeOptionalText(value, 80);
  if (
    [
      "forbidden",
      "do_not_return_raw_frame_to_core",
      "raw_frame_not_passed_to_core",
    ].includes(text)
  ) {
    return "forbidden";
  }
  if (["metadata_only", "redacted", "disabled"].includes(text)) return text;
  return text ? "metadata_only" : null;
}

function safeCaptureRequestKind(value) {
  const text = safeOptionalText(value, 80);
  if (
    [
      "screen_observation",
      "screen_observation_summary",
      "capture_observation",
      "vision_context",
    ].includes(text)
  ) {
    return text;
  }
  return text ? "unknown" : null;
}

function safeOptionalText(value, maxLength = 160) {
  if (value === undefined || value === null || value === "") return null;
  return safeText(value, maxLength);
}

function safeOptionalBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (text === "1") return true;
    if (text === "0") return false;
    if (text === "yes") return true;
    if (text === "no") return false;
    if (text === "ok") return true;
    if (text === "ng") return false;
    if (text === "pass") return true;
    if (text === "fail") return false;
    if (text === "allowed") return true;
    if (text === "blocked") return false;
    if (text === "available") return true;
    if (text === "unavailable") return false;
    if (text === "enabled") return true;
    if (text === "disabled") return false;
    if (text === "ready") return true;
    if (text === "not_ready") return false;
    if (text === "present") return true;
    if (text === "absent") return false;
    if (text === "on") return true;
    if (text === "off") return false;
    if (text === "valid") return true;
    if (text === "invalid") return false;
    if (text === "safe") return true;
    if (text === "unsafe") return false;
    if (text === "local") return true;
    if (text === "external") return false;
    if (text === "loopback") return true;
    if (text === "private_network") return true;
    if (text === "public") return false;
    if (text === "true") return true;
    if (text === "false") return false;
  }
  return null;
}

function safeSourceName(value, fallback = "source") {
  const text = safeText(value, 120);
  if (!text) return fallback;
  if (looksLikeSensitiveLabel(text)) return "redacted_source_name";
  return text;
}

function looksLikeSensitiveLabel(value) {
  if (/(?:^|[/\\\s])(?:database|db)[-_](?:(?:network[-_])?alias|api[-_]key|ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|cert(?:ificate)?(?:[-_](?:bundle|chain))?|client[-_](?:id|secret)|config|connect[-_](?:descriptor|id|identifier|name|string)|connection(?:[-_]string)?|credentials|(?:client|mtls|private|server|ssl|tls)[-_]key|keystore|truststore|dsn|pass(?:code|key|phrase|word)|pin(?:code)?|proxy[-_](?:(?:network[-_])?alias|api[-_]key|(?:(?:mtls|root|ssl|tls)[-_])?ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|(?:(?:client|mtls|root|server|ssl|tls)[-_])?cert(?:ificate)?(?:[-_](?:bundle|chain))?|client[-_](?:id|secret)|config|connect[-_](?:descriptor|id|identifier|name|string)|connection(?:[-_]string)?|credentials|dsn|(?:(?:client|mtls|private|server|ssl|tls)[-_])?key|keystore|truststore|pass(?:code|key|phrase|word)|pin(?:code)?|secret|service[-_]alias|(?:(?:net|network)[-_])?service[-_]name|sid|sqlnet|tns[-_]admin|tnsnames|(?:(?:access|refresh)[-_])?token|uri|url|user(?:name)?|wallet(?:[-_](?:(?:network[-_])?alias|api[-_]key|(?:(?:mtls|root|ssl|tls)[-_])?ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|(?:(?:client|mtls|root|server|ssl|tls)[-_])?cert(?:ificate)?(?:[-_](?:bundle|chain))?|client[-_](?:id|secret)|config|connect[-_](?:descriptor|id|identifier|name|string)|connection(?:[-_]string)?|credentials|dsn|(?:(?:client|mtls|private|server|ssl|tls)[-_])?key|keystore|truststore|pass(?:code|key|phrase|word)|pin(?:code)?|secret|service[-_]alias|(?:(?:net|network)[-_])?service[-_]name|sid|sqlnet|tns[-_]admin|tnsnames|(?:(?:access|refresh)[-_])?token|uri|url|user(?:name)?|wallet))?)|secret|(?:client|mtls|root|server|ssl|tls)[-_]ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|(?:client|mtls|root|server|ssl|tls)[-_]cert(?:ificate)?(?:[-_](?:bundle|chain))?|service[-_]alias|(?:(?:net|network)[-_])?service[-_]name|sid|sqlnet|tns[-_]admin|tnsnames|(?:(?:access|refresh)[-_])?token|uri|url|user(?:name)?|wallet)\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|delete\d*|deleted\d*|destroy\d*|destroyed\d*|drop\d*|dropped\d*|dup\d*|enc\d*|erase\d*|erased\d*|example\d*|held\d*|hold\d*|isolate\d*|isolated\d*|local\d*|merge\d*|merged\d*|migrate\d*|migrated\d*|new\d*|off\d*|old\d*|orig\d*|patch\d*|patched\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|quarantine\d*|quarantined\d*|release\d*|released\d*|remove\d*|removed\d*|rollback\d*|revert\d*|reverted\d*|rolledback\d*|sandbox\d*|sample\d*|save\d*|snap\d*|snapshot\d*|stage\d*|staging\d*|sw[a-p]|sync\d*|synced\d*|temp\d*|template\d*|test\d*|tmpl\d*|tmp\d*|tpl\d*|uat\d*|update\d*|updated\d*|upgrade\d*|upgraded\d*|wip\d*|work\d*)|~)?$/i.test(value)) return true;
  if (/(?:^|[/\\\s])(?:database|db)[-_]wallet[-_](?:(?:network[-_])?alias|api[-_]key|client[-_](?:id|secret)|config|connect[-_](?:descriptor|id|identifier|name|string)|connection(?:[-_]string)?|credentials|dsn|keystore|truststore|pass(?:code|key|phrase|word)|pin(?:code)?|proxy(?:[-_](?:(?:network[-_])?alias|api[-_]key|(?:(?:mtls|root|ssl|tls)[-_])?ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|(?:(?:client|mtls|root|server|ssl|tls)[-_])?cert(?:ificate)?[-_](?:bundle|chain)|(?:(?:client|mtls|root|server|ssl|tls)[-_])?cert(?:ificate)?|client[-_](?:id|secret)|config|connect[-_](?:descriptor|id|identifier|name|string)|connection(?:[-_]string)?|credentials|dsn|(?:(?:client|mtls|private|server|ssl|tls)[-_])?key|keystore|truststore|pass(?:code|key|phrase|word)|pin(?:code)?|secret|service[-_]alias|(?:(?:net|network)[-_])?service[-_]name|sid|sqlnet|tns[-_]admin|tnsnames|(?:(?:access|refresh)[-_])?token|uri|url|user(?:name)?|wallet(?:[-_](?:(?:network[-_])?alias|api[-_]key|(?:(?:mtls|root|ssl|tls)[-_])?ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|(?:(?:client|mtls|root|server|ssl|tls)[-_])?cert(?:ificate)?(?:[-_](?:bundle|chain))?|client[-_](?:id|secret)|config|connect[-_](?:descriptor|id|identifier|name|string)|connection(?:[-_]string)?|credentials|dsn|(?:(?:client|mtls|private|server|ssl|tls)[-_])?key|keystore|truststore|pass(?:code|key|phrase|word)|pin(?:code)?|secret|service[-_]alias|(?:(?:net|network)[-_])?service[-_]name|sid|sqlnet|tns[-_]admin|tnsnames|(?:(?:access|refresh)[-_])?token|uri|url|user(?:name)?|wallet))?))?|secret|service[-_]alias|(?:(?:net|network)[-_])?service[-_]name|sid|sqlnet|tns[-_]admin|tnsnames|(?:(?:access|refresh)[-_])?token|uri|url|user(?:name)?|wallet(?:[-_](?:(?:network[-_])?alias|api[-_]key|(?:(?:mtls|root|ssl|tls)[-_])?ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|(?:(?:client|mtls|root|server|ssl|tls)[-_])?cert(?:ificate)?(?:[-_](?:bundle|chain))?|client[-_](?:id|secret)|config|connect[-_](?:descriptor|id|identifier|name|string)|connection(?:[-_]string)?|credentials|dsn|(?:(?:client|mtls|private|server|ssl|tls)[-_])?key|keystore|truststore|pass(?:code|key|phrase|word)|pin(?:code)?|secret|service[-_]alias|(?:(?:net|network)[-_])?service[-_]name|sid|sqlnet|tns[-_]admin|tnsnames|(?:(?:access|refresh)[-_])?token|uri|url|user(?:name)?|wallet))?)\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?$/i.test(value)) return true;
  if (/(?:^|[/\\\s])(?:database|db)[-_]wallet[-_](?:(?:(?:client|mtls|root|server|ssl|tls)[-_])?cert(?:ificate)?(?:[-_](?:bundle|chain))?|(?:(?:client|mtls|private|server|ssl|tls)[-_])?key|(?:(?:mtls|root|ssl|tls)[-_])?ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|sqlnet|tns[-_]admin|tnsnames|truststore(?:[-_](?:(?:client|mtls|root|ssl|tls)[-_])?ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|[-_](?:(?:client|mtls|root|server|ssl|tls)[-_])?cert(?:ificate)?(?:[-_](?:bundle|chain))?|[-_](?:(?:client|mtls|private|server|ssl|tls)[-_])?key|[-_](?:(?:network[-_])?alias|api[-_]key|client[-_](?:id|secret)|config|connect[-_](?:descriptor|id|identifier|name|string)|connection(?:[-_]string)?|credentials|dsn|keystore|truststore|pass(?:code|key|phrase|word)|pin(?:code)?|proxy[-_](?:(?:network[-_])?alias|api[-_]key|(?:(?:mtls|root|ssl|tls)[-_])?ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|(?:(?:client|mtls|root|server|ssl|tls)[-_])?cert(?:ificate)?(?:[-_](?:bundle|chain))?|client[-_](?:id|secret)|config|connect[-_](?:descriptor|id|identifier|name|string)|connection(?:[-_]string)?|credentials|dsn|(?:(?:client|mtls|private|server|ssl|tls)[-_])?key|keystore|truststore|pass(?:code|key|phrase|word)|pin(?:code)?|secret|service[-_]alias|(?:(?:net|network)[-_])?service[-_]name|sid|sqlnet|tns[-_]admin|tnsnames|(?:(?:access|refresh)[-_])?token|uri|url|user(?:name)?|wallet(?:[-_](?:(?:network[-_])?alias|api[-_]key|(?:(?:mtls|root|ssl|tls)[-_])?ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|client[-_](?:id|secret)|config|connect[-_](?:descriptor|id|identifier|name|string)|connection(?:[-_]string)?|credentials|dsn|(?:(?:client|mtls|root|server|ssl|tls)[-_])?cert(?:ificate)?(?:[-_](?:bundle|chain))?|(?:(?:client|mtls|private|server|ssl|tls)[-_])?key|keystore|truststore|pass(?:code|key|phrase|word)|pin(?:code)?|secret|service[-_]alias|(?:(?:net|network)[-_])?service[-_]name|sid|sqlnet|tns[-_]admin|tnsnames|(?:(?:access|refresh)[-_])?token|uri|url|user(?:name)?|wallet))?)|secret|service[-_]alias|(?:(?:net|network)[-_])?service[-_]name|sid|sqlnet|tns[-_]admin|tnsnames|(?:(?:access|refresh)[-_])?token|uri|url|user(?:name)?|wallet(?:[-_](?:(?:network[-_])?alias|api[-_]key|(?:(?:mtls|root|ssl|tls)[-_])?ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|(?:(?:client|mtls|root|server|ssl|tls)[-_])?cert(?:ificate)?(?:[-_](?:bundle|chain))?|client[-_](?:id|secret)|config|connect[-_](?:descriptor|id|identifier|name|string)|connection(?:[-_]string)?|credentials|dsn|(?:(?:client|mtls|private|server|ssl|tls)[-_])?key|keystore|truststore|pass(?:code|key|phrase|word)|pin(?:code)?|proxy[-_](?:(?:network[-_])?alias|api[-_]key|(?:(?:mtls|root|ssl|tls)[-_])?ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|(?:(?:client|mtls|root|server|ssl|tls)[-_])?cert(?:ificate)?(?:[-_](?:bundle|chain))?|client[-_](?:id|secret)|config|connect[-_](?:descriptor|id|identifier|name|string)|connection(?:[-_]string)?|credentials|dsn|(?:(?:client|mtls|private|server|ssl|tls)[-_])?key|keystore|truststore|pass(?:code|key|phrase|word)|pin(?:code)?|secret|service[-_]alias|(?:(?:net|network)[-_])?service[-_]name|sid|sqlnet|tns[-_]admin|tnsnames|(?:(?:access|refresh)[-_])?token|uri|url|user(?:name)?|wallet(?:[-_](?:(?:network[-_])?alias|api[-_]key|(?:(?:mtls|root|ssl|tls)[-_])?ca(?:[-_]cert(?:ificate)?)?(?:[-_](?:bundle|chain))?|(?:(?:client|mtls|root|server|ssl|tls)[-_])?cert(?:ificate)?(?:[-_](?:bundle|chain))?|client[-_](?:id|secret)|config|connect[-_](?:descriptor|id|identifier|name|string)|connection(?:[-_]string)?|credentials|dsn|(?:(?:client|mtls|private|server|ssl|tls)[-_])?key|keystore|truststore|pass(?:code|key|phrase|word)|pin(?:code)?|secret|service[-_]alias|(?:(?:net|network)[-_])?service[-_]name|sid|sqlnet|tns[-_]admin|tnsnames|(?:(?:access|refresh)[-_])?token|uri|url|user(?:name)?|wallet))?)|secret|service[-_]alias|(?:(?:net|network)[-_])?service[-_]name|sid|sqlnet|tns[-_]admin|tnsnames|(?:(?:access|refresh)[-_])?token|uri|url|user(?:name)?|wallet))?))?)\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?$/i.test(value)) return true;
  return (
    /(?:https?|wss?|file|ssh|sftp|ftp|git|s3|gs|azblob|azure|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|mqtts?|amqps?|rtmps?|rtsps?):\/\//i.test(value) ||
    /\bgit@[^:\s]+:/i.test(value) ||
    /\b[^@\s]+@[^@\s]+\.[^@\s]+\b/.test(value) ||
    /\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+\b/i.test(value) ||
    /\bIRIS_[A-Z0-9_]+\b/.test(value) ||
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(value) ||
    /\b[0-9a-f]{24,}\b/i.test(value) ||
    /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(value) ||
    /\barn:(?:aws|aws-cn|aws-us-gov):[^\s]+/i.test(value) ||
    /\b[A-Za-z0-9_-]{32,}\b/.test(value) ||
    /\b\d{1,3}(?:\.\d{1,3}){3}:\d{2,5}\b/.test(value) ||
    /\[(?:::1|fe80:[^\]]*|fc[0-9a-f]{2}:[^\]]*|fd[0-9a-f]{2}:[^\]]*)\]:\d{2,5}/i.test(value) ||
    /\b(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|169\.254(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/i.test(value) ||
    /\b[a-z0-9][a-z0-9-]*:\d{2,5}\b/i.test(value) ||
    /(?:^|[\s[\]()])(?:::1|fe80:|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i.test(value) ||
    /(?:[A-Za-z]:\\|\\\\[^\\]+\\[^\\]+|\/(?:home|users|tmp|var|etc)\/)/i.test(value) ||
    /(?:^|[/\\\s])\.env(?:[.\-\w]*)?$/i.test(value) ||
    /(?:^|[/\\\s])\.(?:acme\.sh|age|aliyun|anthropic|appcenter|aws|aws-vault|azure|bitrise|bluemix|buddy|buildkite|bundle|cargo|certbot|cfssl|circleci|cloudflared|composer|config|davfs2|dbt|deno|direnv|docker|doctl|doppler|edgedb|expo|fastlane|firebase|fly|getmail|gem|gcloud|gnupg|gradle|hasura|heroku|huggingface|ibmcloud|imapfilter|infisical|ipython|ivy2|jupyter|kube|lego|letsencrypt|m2|mitmproxy|mkcert|ncftp|neon|netlify|ngrok2|npm|nuget|oci|op|openai|password-store|pip|pki|planetscale|poetry|postgresql|pulumi|railway|render|sbt|snowflake|sops|ssh|step|streamlit|stripe|subversion|supabase|tailscale|tccli|terraform|travis|tsh|twilio-cli|vault|vercel|wrangler|yarn|zerotier-one)(?:[/\\]|$)/i.test(value) ||
    /(?:^|[/\\\s])ConsoleHost_history\.txt$/i.test(value) ||
    /(?:^|[/\\\s])\.(?:authinfo(?:\.gpg)?|bash_history|boto|clickhouse-client-history|condarc|curlrc|cvspass|dockercfg|dockerconfigjson|dta|duckdb_history|fetchmailrc|fish_history|gemrc|git-credential|git-credentials|gitconfig|gitcookies(?:\.tmp)?|hgrc|htaccess|htpasswd|irb_history|k5(?:login|users)|lesshst|lftprc|mailrc|mbsyncrc|mongorc\.js|msmtprc|muttrc|my\.cnf|mylogin\.cnf|mysql_history|node_repl_history|npmrc|netrc|offlineimaprc|pg_service\.conf|pgpass|pnpmrc|psql_history|python_history|pypirc|rclone\.conf|rediscli_history|rhosts|s3cfg|sentryclirc|shosts|smbcredentials|smbpasswd|sqlite_history|wget-hsts|wgetrc|yarnrc(?:\.yml)?|zsh_history)$/i.test(value) ||
    /(?:^|[/\\\s])(?:api[-_]key\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|application_default_credentials\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|auth[-_]secret\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|authorized_keys2?(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|save))?|bookmarks\.xml|(?:access|oauth|refresh)[-_]token\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|client[-_]secret(?:[-_][^/\\\s]+)?\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|connection[-_]string\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|cookie[-_]secret\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|credentials\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|csrf[-_]secret\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|(?:(?:database|db)[-_](?:cert(?:ificate)?|credentials|dsn|key|keystore|password|private[-_]key|secret|token|truststore|wallet|wallet[-_]auth|wallet[-_]credentials|wallet[-_]key|wallet[-_]passcode|wallet[-_]passkey|wallet[-_]passphrase|wallet[-_]password|wallet[-_](?:pin|pincode)|wallet[-_]secret|wallet[-_]session|wallet[-_]tns[-_]admin|wallet[-_](?:(?:access|refresh|session)[-_])?token)|database[-_](?:connection|uri|url)|db[-_](?:connection|uri|url)|mariadb[-_](?:uri|url)|mongo(?:db)?[-_](?:uri|url)|mssql[-_](?:uri|url)|mysql[-_](?:uri|url)|postgres(?:ql)?[-_](?:uri|url)|redis[-_](?:uri|url)|oracle[-_](?:uri|url)|sqlserver[-_](?:uri|url))\.(?:accdb|arrow|avro|bak|backup|cfg|cnf|cpg|csv|conf|delta|disabled|enc|(?:(?:h2|lock|mv|trace)\.)?db3?(?:[._-](?:journal|shm|wal))?|dbf|dmp|duckdb(?:\.wal)?|feather|fgb|fst|gdb|geojson|gml|gpkg|h5|hdf|hdf5|hudi|iceberg|inceptor|ini|json|kml|kmz|leveldb|lmdb|mat|mbtiles|mdb|mvt|nc|netcdf|new|npy|npz|ods|off|old|orc|orig|parquet|pbf|pickle|pkl|pmtiles|prj|properties|qpj|qs|qvd|rda|rdata|rds|realm(?:\.(?:lock|management|note))?|rocksdb|s3db|sas7bdat|save|sav|zsav|xml|xls|xlsb|xlsm|xlsx|xpt|zarr|sbn|sbx|shp|shx|sql|sqlite3?(?:[._-](?:journal|shm|wal))?|toml|topojson|tsv|temp|tmp|ya?ml)(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|(?:decryption|encryption)[-_]key\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|filezilla\.xml|google_application_credentials\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|id_(?:dsa|ecdsa(?:_sk)?|ed25519(?:_sk)?|rsa|xmss)(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|save))?|identity(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|save))?|jwt[-_]secret\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|known_hosts2?(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|save))?|kadm5\.(?:acl|keytab)|kdc\.conf|krb5\.conf|krb5cc_[^/\\\s]+|(?:backup|master|recovery|root|unseal|vault)[-_]key\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|private[-_]key\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|putty\.reg|queue\.xml|recentservers\.xml|sitemanager\.xml|secret[-_]key\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|secrets?\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|service[-_]account(?:[-_]key)?\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|session[-_]secret\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|signing[-_]key\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|ssh_known_hosts2?(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|save))?|sshd?_config|tokens?\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|trustedcerts\.xml|(?:cwallet\.sso|datasource\.properties|freetds\.conf|hibernate\.properties|jdbc\.properties|ldap\.ora|listener\.ora|odbc(?:inst)?\.ini|ojdbc\.properties|oraaccess\.xml|persistence\.xml|spring\.datasource\.properties|sqlnet\.ora|tnsnames\.ora)(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|(?:[^/\\\s]+[-_])?webhook[-_](?:key|secret)\.json(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp\d*|tmp\d*|wip\d*|work\d*)|~)?|wg[^/\\\s]*\.conf|WinSCP\.ini|ws_ftp\.ini)$/i.test(value) ||
    /(?:^|[/\\\s])[^/\\\s]+\.(?:ccache|cer|crt|der|duck|ica|jks|kdb|key|keytab|keystore|kirbi|mobileconfig|ovpn|p8|pbk|pcf|pem|p12|pfx|ppk|pscp|rdg|rdp|remmina|sth|tblk|truststore|vmrc|vnc)(?:\.(?:archive\d*|archived\d*|bak\d*|backup\d*|bkp\d*|conflict\d*|copy\d*|demo\d*|dev\d*|disabled\d*|draft\d*|duplicate\d*|duplicated\d*|dup\d*|enc\d*|local\d*|merge\d*|merged\d*|migrate\d*|new\d*|off\d*|old\d*|orig\d*|preprod\d*|prod\d*|production\d*|purge\d*|purged\d*|qa\d*|save\d*|sw[a-p]|temp|tmp))?~?$/i.test(value) ||
    /^[\[{].*[\]}]$/.test(value.trim()) ||
    /(?:^|[?&;\s])(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?(?:id|secret)|code|password|se|sp|state|sv|(?:x-amz-)?signature|sig)=/i.test(value) ||
    /\bbasic\s+[A-Za-z0-9+/=]{8,}\b/i.test(value) ||
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(value) ||
    /\b(?:AIza|gh[pousr]_|sk-(?:proj-)?|xox[baprs]-|npm_|rk_live_|sk_live_)[A-Za-z0-9_-]{8,}\b/.test(value) ||
    /(?:BEGIN [A-Z ]*PRIVATE KEY|private[_\s-]?key)/i.test(value) ||
    /((?:account|cluster|database|deployment|environment|organization|project|resource|subscription|tenant|workspace)[_\s-]?id|(?:callback|endpoint|issuer|jwks|webhook)[_\s-]?url|redirect[_\s-]?uri|bearer|auth[_\s-]?config|authorization|api[_-]?key|cert(?:ificate)?|connection[_\s-]?string|cookie|credential[_\s-]?file|credentials?|dsn|identity|keychain|kubeconfig|oauth|principal|role[_\s-]?arn|service[_\s-]?account|session|token|secret|vault|pass(?:word|phrase))/i.test(value)
  );
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeOptionalNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}
