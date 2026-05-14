import { createLiveChatSourceFromEnv } from "../../adapters/runtimeAdapters.js";
import { assertHttpLiveChatSourceStatusSafe } from "../../adapters/youtube/httpLiveChatSource.js";
import { assertYouTubeLiveChatApiSourceStatusSafe } from "../../adapters/youtube/youtubeLiveChatApiSource.js";
import { ContractError } from "../../core/contracts.js";

const FORBIDDEN_YOUTUBE_SOURCE_STATUS_FIELDS = new Set([
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
  "final_text",
  "text",
  "subtitle_text",
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
  "value",
  "payload",
  "raw_comment",
  "rawComment",
  "comment_text",
  "commentText",
  "api_body",
  "apiBody",
  "raw_api_body",
  "rawApiBody",
]);

const YOUTUBE_INGEST_SOURCE_STATUS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "next_readiness_state",
  "readiness_state_counts",
  "source_configured",
  "source_kind",
  "source_status_available",
  "source_status",
  "instantiation_status",
  "error_kind",
  "status_summary",
  "support_event_policy",
  "boundary_policy",
  "adapter_validation_required",
]);
const YOUTUBE_API_CONFIGURED_STATUS_FIELDS = new Set([
  "schema",
  "api_configured",
  "oauth_configured",
  "configured_status",
  "boundary_policy",
]);
const OAUTH_TOKEN_REDACTION_STATUS_FIELDS = new Set([
  "schema",
  "redaction_status",
  "oauth_readiness_status",
  "oauth_configured",
  "oauth_missing",
  "oauth_expired",
  "logs_safe",
  "public_view_safe",
  "admin_ordinary_view_safe",
  "diagnostics_safe",
  "boundary_policy",
]);
const LIVE_CHAT_ID_DISCOVERY_STATUS_FIELDS = new Set([
  "schema",
  "discovery_status",
  "discovery_request_count",
  "resolved_count",
  "boundary_policy",
]);
const INGEST_DEDUPE_WINDOW_SUMMARY_FIELDS = new Set([
  "schema",
  "dedupe_status",
  "window_label",
  "duplicate_count",
  "boundary_policy",
]);
const MODERATION_FILTER_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "filter_status",
  "blocked_author_count",
  "blocked_text_rule_count",
  "filtered_count",
  "boundary_policy",
]);
const YOUTUBE_INGEST_PREFLIGHT_ADMIN_PAGE_SUMMARY_FIELDS = new Set([
  "schema",
  "page_status",
  "oauth_status",
  "chat_status",
  "dedupe_status",
  "moderation_status",
  "configured_count",
  "attention_count",
  "boundary_policy",
]);
const SUPPORT_DONATION_NORMALIZER_SAFE_OUTPUT_FIELDS = new Set([
  "schema",
  "normalizer_status",
  "output_kind",
  "support_event_type",
  "amount_source",
  "support_event_count",
  "moderation_precheck_status",
  "relationship_growth_suppressed",
  "boundary_policy",
]);
const INGEST_BACKOFF_STATUS_FIELDS = new Set([
  "schema",
  "backoff_status",
  "retry_count",
  "next_safe_action",
  "boundary_policy",
]);
const SOURCE_FAILURE_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "component",
  "status",
  "error_code",
  "boundary_policy",
]);
const LATEST_SAFE_EVENT_COUNTS_FIELDS = new Set([
  "schema",
  "source",
  "event_type_counts",
  "total_count",
  "boundary_policy",
]);
const YOUTUBE_INGEST_PACKET_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "source",
  "ingest_status",
  "event_count",
  "boundary_policy",
]);
const SUPPORT_MESSAGE_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "summary_status",
  "message_class",
  "summary_label",
  "surface_policy",
  "boundary_policy",
]);
const SAFE_EVENT_COUNT_SOURCE_LABELS = [
  "youtube_live_chat",
  "youtube_donation",
  "support_ingest",
  "relay_source",
];
const SAFE_EVENT_COUNT_TYPES = [
  "comment",
  "support",
  "moderation",
  "ignored",
  "duplicate",
  "source_error",
];

const SOURCE_KINDS = new Set([
  "youtube_live_chat_api_source",
  "http_youtube_live_chat_source",
  "not_configured",
  "configuration_error",
]);
const INSTANTIATION_STATUSES = new Set(["ready", "not_configured", "configuration_error"]);
const ERROR_KINDS = new Set([
  "source_not_configured",
  "youtube_source_contract_error",
  "unsupported_source_status",
]);
const INGEST_READINESS_STATUSES = new Set([
  "idle",
  "active",
  "attention",
  "polling_cooldown",
  "retry_backoff",
  "operator_action_required",
  "not_configured",
  "configuration_error",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const AUTH_MODES = new Set([
  "api_key",
  "oauth_token",
  "oauth_refresh",
  "bearer",
  "query_key",
  "not_applicable",
  "unknown",
]);
const SUPPORT_EVENT_TYPES = [
  "superChatEvent",
  "superStickerEvent",
  "superThanksEvent",
  "newSponsorEvent",
  "memberMilestoneChatEvent",
  "membershipGiftingEvent",
  "giftMembershipReceivedEvent",
  "normalizedSupportEvent",
];
const SUPPORT_AMOUNT_SOURCE_KINDS = [
  "micros",
  "formatted",
  "tier",
  "membership_count",
  "unknown",
];
const SUPPORT_MODERATION_STATES = ["allowed", "watch", "limited", "blocked", "muted"];
const URL_PATTERN = /https?:\/\//i;

export function createYouTubeApiConfiguredStatus({ env = process.env } = {}) {
  const apiConfigured =
    hasConfiguredEnv(env, "IRIS_YOUTUBE_API_KEY") ||
    hasConfiguredEnv(env, "IRIS_YOUTUBE_LIVE_CHAT_API_KEY");
  const oauthConfigured =
    hasConfiguredEnv(env, "IRIS_YOUTUBE_OAUTH_TOKEN") ||
    hasConfiguredEnv(env, "IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN");
  const status = {
    schema: "iris_youtube_api_configured_status_v1",
    api_configured: apiConfigured,
    oauth_configured: oauthConfigured,
    configured_status:
      apiConfigured || oauthConfigured ? "configured" : "missing",
    boundary_policy: {
      configured_missing_status_only: true,
      no_oauth_token: true,
      no_endpoint_values: true,
      no_response_body: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertYouTubeApiConfiguredStatusSafe(status);
  return status;
}

export function assertYouTubeApiConfiguredStatusSafe(
  status,
  context = "youtube api configured status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status is required`);
  }
  for (const field of Object.keys(status)) {
    if (!YOUTUBE_API_CONFIGURED_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`, { field });
    }
  }
  if (status.schema !== "iris_youtube_api_configured_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of ["api_configured", "oauth_configured"]) {
    if (typeof status[field] !== "boolean") {
      throw new ContractError(`${context}: invalid configured flag`, { field });
    }
  }
  if (!["configured", "missing"].includes(status.configured_status)) {
    throw new ContractError(`${context}: invalid configured status`);
  }
  if (
    status.configured_status !==
    (status.api_configured || status.oauth_configured ? "configured" : "missing")
  ) {
    throw new ContractError(`${context}: configured status mismatch`);
  }
  assertBoundaryPolicy(
    status.boundary_policy,
    [
      "configured_missing_status_only",
      "no_oauth_token",
      "no_endpoint_values",
      "no_response_body",
      "no_raw_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoYouTubeApiConfiguredStatusLeak(status, context);
}

export function createOAuthTokenRedactionStatus({
  configured = false,
  expired = false,
} = {}) {
  const isConfigured = configured === true;
  const isExpired = isConfigured && expired === true;
  const status = {
    schema: "iris_auth_secret_redaction_status_v1",
    redaction_status: "redacted",
    oauth_readiness_status: isExpired
      ? "expired"
      : isConfigured
        ? "configured"
        : "missing",
    oauth_configured: isConfigured,
    oauth_missing: !isConfigured,
    oauth_expired: isExpired,
    logs_safe: true,
    public_view_safe: true,
    admin_ordinary_view_safe: true,
    diagnostics_safe: true,
    boundary_policy: {
      readiness_status_only: true,
      no_oauth_token: true,
      no_refresh_token: true,
      no_access_token: true,
      no_authorization_header: true,
      no_secret_values: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertOAuthTokenRedactionStatusSafe(status);
  return status;
}

export function assertOAuthTokenRedactionStatusSafe(
  status,
  context = "oauth token redaction status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status is required`);
  }
  for (const field of Object.keys(status)) {
    if (!OAUTH_TOKEN_REDACTION_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`, { field });
    }
  }
  if (status.schema !== "iris_auth_secret_redaction_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (status.redaction_status !== "redacted") {
    throw new ContractError(`${context}: invalid redaction status`);
  }
  if (!["configured", "missing", "expired"].includes(status.oauth_readiness_status)) {
    throw new ContractError(`${context}: invalid OAuth readiness status`);
  }
  for (const field of ["oauth_configured", "oauth_missing", "oauth_expired"]) {
    if (typeof status[field] !== "boolean") {
      throw new ContractError(`${context}: invalid OAuth readiness flag`, { field });
    }
  }
  if (
    (status.oauth_readiness_status === "configured" &&
      (status.oauth_configured !== true ||
        status.oauth_missing !== false ||
        status.oauth_expired !== false)) ||
    (status.oauth_readiness_status === "missing" &&
      (status.oauth_configured !== false ||
        status.oauth_missing !== true ||
        status.oauth_expired !== false)) ||
    (status.oauth_readiness_status === "expired" &&
      (status.oauth_configured !== true ||
        status.oauth_missing !== false ||
        status.oauth_expired !== true))
  ) {
    throw new ContractError(`${context}: OAuth readiness status mismatch`);
  }
  for (const field of [
    "logs_safe",
    "public_view_safe",
    "admin_ordinary_view_safe",
    "diagnostics_safe",
  ]) {
    if (status[field] !== true) {
      throw new ContractError(`${context}: unsafe surface`, { field });
    }
  }
  assertBoundaryPolicy(
    status.boundary_policy,
    [
      "readiness_status_only",
      "no_oauth_token",
      "no_refresh_token",
      "no_access_token",
      "no_authorization_header",
      "no_secret_values",
      "no_raw_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoOAuthTokenRedactionLeak(status, context);
}

export function createLiveChatIdDiscoveryStatus({
  discoveryRequestCount = 0,
  resolved = false,
} = {}) {
  const requestCount = safeNonNegativeInteger(discoveryRequestCount);
  const resolvedCount = resolved === true ? 1 : 0;
  const status = {
    schema: "iris_chat_discovery_status_v1",
    discovery_status:
      resolvedCount > 0
        ? "resolved"
        : requestCount > 0
          ? "pending"
          : "not_started",
    discovery_request_count: requestCount,
    resolved_count: resolvedCount,
    boundary_policy: {
      status_and_count_only: true,
      no_live_chat_id: true,
      no_raw_api_response: true,
      no_private_channel_data: true,
      no_endpoint_values: true,
      no_tokens: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertLiveChatIdDiscoveryStatusSafe(status);
  return status;
}

export function assertLiveChatIdDiscoveryStatusSafe(
  status,
  context = "live chat id discovery status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status is required`);
  }
  for (const field of Object.keys(status)) {
    if (!LIVE_CHAT_ID_DISCOVERY_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`, { field });
    }
  }
  if (status.schema !== "iris_chat_discovery_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["not_started", "pending", "resolved"].includes(status.discovery_status)) {
    throw new ContractError(`${context}: invalid discovery status`);
  }
  assertNonNegativeInteger(
    status.discovery_request_count,
    `${context}: discovery_request_count`
  );
  assertNonNegativeInteger(status.resolved_count, `${context}: resolved_count`);
  if (status.resolved_count > status.discovery_request_count && status.discovery_request_count > 0) {
    throw new ContractError(`${context}: invalid discovery counts`);
  }
  if (status.resolved_count > 1) {
    throw new ContractError(`${context}: invalid resolved count`);
  }
  if (
    (status.discovery_status === "resolved" && status.resolved_count !== 1) ||
    (status.discovery_status === "pending" &&
      (status.discovery_request_count < 1 || status.resolved_count !== 0)) ||
    (status.discovery_status === "not_started" &&
      (status.discovery_request_count !== 0 || status.resolved_count !== 0))
  ) {
    throw new ContractError(`${context}: discovery status/count mismatch`);
  }
  assertBoundaryPolicy(
    status.boundary_policy,
    [
      "status_and_count_only",
      "no_live_chat_id",
      "no_raw_api_response",
      "no_private_channel_data",
      "no_endpoint_values",
      "no_tokens",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoLiveChatIdDiscoveryLeak(status, context);
}

export function createIngestDedupeWindowSummary({
  windowMs = 5000,
  duplicateCount = 0,
  enabled = true,
} = {}) {
  const duplicateTotal = safeNonNegativeInteger(duplicateCount);
  const summary = {
    schema: "iris_ingest_dedupe_window_summary_v1",
    dedupe_status: enabled === true ? "enabled" : "disabled",
    window_label: safeDedupeWindowLabel(windowMs),
    duplicate_count: duplicateTotal,
    boundary_policy: {
      status_window_count_only: true,
      no_raw_comment_body: true,
      no_raw_youtube_text: true,
      no_author_private_ids: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertIngestDedupeWindowSummarySafe(summary);
  return summary;
}

export function assertIngestDedupeWindowSummarySafe(
  summary,
  context = "ingest dedupe window summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  for (const field of Object.keys(summary)) {
    if (!INGEST_DEDUPE_WINDOW_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (summary.schema !== "iris_ingest_dedupe_window_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["enabled", "disabled"].includes(summary.dedupe_status)) {
    throw new ContractError(`${context}: invalid dedupe status`);
  }
  if (!["disabled", "short", "standard", "extended"].includes(summary.window_label)) {
    throw new ContractError(`${context}: invalid window label`);
  }
  assertNonNegativeInteger(summary.duplicate_count, `${context}: duplicate_count`);
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "status_window_count_only",
      "no_raw_comment_body",
      "no_raw_youtube_text",
      "no_author_private_ids",
      "no_raw_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoIngestDedupeWindowLeak(summary, context);
}

export function createModerationFilterSafeSummary({
  configured = false,
  blockedAuthorCount = 0,
  blockedTextRuleCount = 0,
  filteredCount = 0,
} = {}) {
  const summary = {
    schema: "iris_moderation_filter_safe_summary_v1",
    filter_status: configured === true ? "configured" : "missing",
    blocked_author_count: safeNonNegativeInteger(blockedAuthorCount),
    blocked_text_rule_count: safeNonNegativeInteger(blockedTextRuleCount),
    filtered_count: safeNonNegativeInteger(filteredCount),
    boundary_policy: {
      safe_status_and_counts_only: true,
      no_raw_terms: true,
      no_raw_blocked_phrases: true,
      no_private_notes: true,
      no_raw_comment_text: true,
      no_author_private_ids: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertModerationFilterSafeSummary(summary);
  return summary;
}

export function assertModerationFilterSafeSummary(
  summary,
  context = "moderation filter safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  for (const field of Object.keys(summary)) {
    if (!MODERATION_FILTER_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (summary.schema !== "iris_moderation_filter_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["configured", "missing"].includes(summary.filter_status)) {
    throw new ContractError(`${context}: invalid filter status`);
  }
  for (const field of [
    "blocked_author_count",
    "blocked_text_rule_count",
    "filtered_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: ${field}`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "safe_status_and_counts_only",
      "no_raw_terms",
      "no_raw_blocked_phrases",
      "no_private_notes",
      "no_raw_comment_text",
      "no_author_private_ids",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoModerationFilterSummaryLeak(summary, context);
}

export function createYouTubeIngestPreflightAdminPageSummary({
  oauthStatus = "missing",
  chatStatus = "attention",
  dedupeStatus = "disabled",
  moderationStatus = "missing",
} = {}) {
  const normalizedOauthStatus = safeOAuthAdminStatus(oauthStatus);
  const normalizedChatStatus = safeAdminReadyAttentionStatus(chatStatus);
  const normalizedDedupeStatus = dedupeStatus === "enabled" ? "enabled" : "disabled";
  const normalizedModerationStatus =
    moderationStatus === "configured" ? "configured" : "missing";
  const attentionCount =
    (normalizedOauthStatus === "configured" ? 0 : 1) +
    (normalizedChatStatus === "ready" ? 0 : 1) +
    (normalizedDedupeStatus === "enabled" ? 0 : 1) +
    (normalizedModerationStatus === "configured" ? 0 : 1);
  const summary = {
    schema: "iris_youtube_ingest_preflight_admin_page_summary_v1",
    page_status: attentionCount === 0 ? "ready" : "attention",
    oauth_status: normalizedOauthStatus,
    chat_status: normalizedChatStatus,
    dedupe_status: normalizedDedupeStatus,
    moderation_status: normalizedModerationStatus,
    configured_count: 4 - attentionCount,
    attention_count: attentionCount,
    boundary_policy: {
      oauth_chat_dedupe_moderation_status_only: true,
      no_oauth_token: true,
      no_refresh_token: true,
      no_api_key: true,
      no_raw_comment_text: true,
      no_api_body: true,
      no_endpoint_values: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_preflight: true,
    },
  };
  assertYouTubeIngestPreflightAdminPageSummarySafe(summary);
  return summary;
}

export function assertYouTubeIngestPreflightAdminPageSummarySafe(
  summary,
  context = "youtube ingest preflight admin page summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  for (const field of Object.keys(summary)) {
    if (!YOUTUBE_INGEST_PREFLIGHT_ADMIN_PAGE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (summary.schema !== "iris_youtube_ingest_preflight_admin_page_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["ready", "attention"].includes(summary.page_status)) {
    throw new ContractError(`${context}: invalid page status`);
  }
  if (!["configured", "missing", "expired"].includes(summary.oauth_status)) {
    throw new ContractError(`${context}: invalid oauth status`);
  }
  if (!["ready", "attention"].includes(summary.chat_status)) {
    throw new ContractError(`${context}: invalid chat status`);
  }
  if (!["enabled", "disabled"].includes(summary.dedupe_status)) {
    throw new ContractError(`${context}: invalid dedupe status`);
  }
  if (!["configured", "missing"].includes(summary.moderation_status)) {
    throw new ContractError(`${context}: invalid moderation status`);
  }
  for (const field of ["configured_count", "attention_count"]) {
    assertNonNegativeInteger(summary[field], `${context}: ${field}`);
  }
  const expectedAttentionCount =
    (summary.oauth_status === "configured" ? 0 : 1) +
    (summary.chat_status === "ready" ? 0 : 1) +
    (summary.dedupe_status === "enabled" ? 0 : 1) +
    (summary.moderation_status === "configured" ? 0 : 1);
  if (
    summary.attention_count !== expectedAttentionCount ||
    summary.configured_count !== 4 - expectedAttentionCount ||
    summary.page_status !== (expectedAttentionCount === 0 ? "ready" : "attention")
  ) {
    throw new ContractError(`${context}: status count mismatch`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "oauth_chat_dedupe_moderation_status_only",
      "no_oauth_token",
      "no_refresh_token",
      "no_api_key",
      "no_raw_comment_text",
      "no_api_body",
      "no_endpoint_values",
      "no_raw_payloads",
      "no_candidates",
      "no_commands",
      "read_only_preflight",
    ],
    `${context}: boundary policy`
  );
  assertNoYouTubeIngestPreflightAdminPageLeak(summary, context);
}

export function createSupportDonationNormalizerSafeOutput({
  normalized = true,
  supportEventType = "normalizedSupportEvent",
  amountSource = "unknown",
  supportEventCount = 0,
  moderationState = "allowed",
} = {}) {
  const moderationPrecheckStatus = safeSupportModerationState(moderationState);
  const output = {
    schema: "iris_support_donation_normalizer_safe_output_v1",
    normalizer_status: normalized === true ? "normalized" : "attention_required",
    output_kind: "summary_candidate",
    support_event_type: safeSupportDonationEventType(supportEventType),
    amount_source: safeSupportDonationAmountSource(amountSource),
    support_event_count: safeNonNegativeInteger(supportEventCount),
    moderation_precheck_status: moderationPrecheckStatus,
    relationship_growth_suppressed: ["blocked", "limited", "muted"].includes(
      moderationPrecheckStatus
    ),
    boundary_policy: {
      safe_normalized_labels_only: true,
      summary_candidate_only: true,
      moderation_prechecked_before_relationship_growth: true,
      relationship_growth_suppressed_when_limited_or_blocked: true,
      no_raw_support_message: true,
      no_private_ids: true,
      no_amount_comparison: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertSupportDonationNormalizerSafeOutput(output);
  return output;
}

export function assertSupportDonationNormalizerSafeOutput(
  output,
  context = "support donation normalizer safe output"
) {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new ContractError(`${context}: output is required`);
  }
  for (const field of Object.keys(output)) {
    if (!SUPPORT_DONATION_NORMALIZER_SAFE_OUTPUT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected output field`, { field });
    }
  }
  if (output.schema !== "iris_support_donation_normalizer_safe_output_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["normalized", "attention_required"].includes(output.normalizer_status)) {
    throw new ContractError(`${context}: invalid normalizer status`);
  }
  if (output.output_kind !== "summary_candidate") {
    throw new ContractError(`${context}: output must remain summary candidate`);
  }
  if (!SUPPORT_EVENT_TYPES.includes(output.support_event_type)) {
    throw new ContractError(`${context}: invalid support event type`);
  }
  if (!SUPPORT_AMOUNT_SOURCE_KINDS.includes(output.amount_source)) {
    throw new ContractError(`${context}: invalid amount source`);
  }
  assertNonNegativeInteger(output.support_event_count, `${context}: support_event_count`);
  if (!SUPPORT_MODERATION_STATES.includes(output.moderation_precheck_status)) {
    throw new ContractError(`${context}: invalid moderation precheck status`);
  }
  if (typeof output.relationship_growth_suppressed !== "boolean") {
    throw new ContractError(`${context}: relationship growth suppression must be boolean`);
  }
  if (
    ["blocked", "limited", "muted"].includes(output.moderation_precheck_status) &&
    output.relationship_growth_suppressed !== true
  ) {
    throw new ContractError(`${context}: moderation state must suppress relationship growth`);
  }
  assertBoundaryPolicy(
    output.boundary_policy,
    [
      "safe_normalized_labels_only",
      "summary_candidate_only",
      "moderation_prechecked_before_relationship_growth",
      "relationship_growth_suppressed_when_limited_or_blocked",
      "no_raw_support_message",
      "no_private_ids",
      "no_amount_comparison",
      "no_raw_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoSupportDonationNormalizerLeak(output, context);
}

export function createIngestBackoffStatus({
  active = false,
  retryCount = 0,
  operatorActionRequired = false,
} = {}) {
  const status = {
    schema: "iris_ingest_backoff_status_v1",
    backoff_status: active === true ? "retry_backoff" : "idle",
    retry_count: safeNonNegativeInteger(retryCount),
    next_safe_action:
      operatorActionRequired === true
        ? "operator_review"
        : active === true
          ? "wait_for_retry_window"
          : "continue_polling",
    boundary_policy: {
      safe_status_retry_count_action_only: true,
      no_raw_error_body: true,
      no_endpoint_values: true,
      no_tokens: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertIngestBackoffStatusSafe(status);
  return status;
}

export function assertIngestBackoffStatusSafe(
  status,
  context = "ingest backoff status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status is required`);
  }
  for (const field of Object.keys(status)) {
    if (!INGEST_BACKOFF_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`, { field });
    }
  }
  if (status.schema !== "iris_ingest_backoff_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["idle", "retry_backoff"].includes(status.backoff_status)) {
    throw new ContractError(`${context}: invalid backoff status`);
  }
  assertNonNegativeInteger(status.retry_count, `${context}: retry_count`);
  if (
    !["continue_polling", "wait_for_retry_window", "operator_review"].includes(
      status.next_safe_action
    )
  ) {
    throw new ContractError(`${context}: invalid next safe action`);
  }
  if (
    status.backoff_status === "idle" &&
    status.next_safe_action === "wait_for_retry_window"
  ) {
    throw new ContractError(`${context}: idle status/action mismatch`);
  }
  assertBoundaryPolicy(
    status.boundary_policy,
    [
      "safe_status_retry_count_action_only",
      "no_raw_error_body",
      "no_endpoint_values",
      "no_tokens",
      "no_raw_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoIngestBackoffStatusLeak(status, context);
}

export function createSourceFailureSafeSummary({
  component = "youtube_ingest",
  status = "failed",
  errorCode = "source_unavailable",
} = {}) {
  const summary = {
    schema: "iris_source_failure_safe_summary_v1",
    component: safeSourceFailureComponent(component),
    status: safeSourceFailureStatus(status),
    error_code: safeSourceFailureErrorCode(errorCode),
    boundary_policy: {
      component_status_error_code_only: true,
      no_endpoint_values: true,
      no_tokens: true,
      no_raw_response: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertSourceFailureSafeSummary(summary);
  return summary;
}

export function assertSourceFailureSafeSummary(
  summary,
  context = "source failure safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  for (const field of Object.keys(summary)) {
    if (!SOURCE_FAILURE_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (summary.schema !== "iris_source_failure_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["youtube_ingest", "support_ingest", "relay_source"].includes(summary.component)) {
    throw new ContractError(`${context}: invalid component`);
  }
  if (!["failed", "degraded", "recovered"].includes(summary.status)) {
    throw new ContractError(`${context}: invalid status`);
  }
  if (!/^[a-z0-9_]{1,80}$/.test(summary.error_code)) {
    throw new ContractError(`${context}: invalid error code`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "component_status_error_code_only",
      "no_endpoint_values",
      "no_tokens",
      "no_raw_response",
      "no_raw_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoSourceFailureSummaryLeak(summary, context);
}

export function createLatestSafeEventCounts({
  source = "youtube_live_chat",
  eventTypeCounts = {},
} = {}) {
  const eventCounts = {};
  for (const type of SAFE_EVENT_COUNT_TYPES) {
    eventCounts[type] = safeNonNegativeInteger(eventTypeCounts[type]);
  }
  const summary = {
    schema: "iris_latest_safe_event_counts_v1",
    source: safeEventCountSource(source),
    event_type_counts: eventCounts,
    total_count: Object.values(eventCounts).reduce((total, count) => total + count, 0),
    boundary_policy: {
      source_type_count_only: true,
      no_raw_event_payload: true,
      no_raw_comment_text: true,
      no_support_message_text: true,
      no_private_ids: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertLatestSafeEventCounts(summary);
  return summary;
}

export function createYouTubeIngestPacketSafeSummary({
  source = "youtube_live_chat",
  ingestStatus = "received",
  eventCount = 0,
} = {}) {
  const summary = {
    schema: "iris_youtube_ingest_packet_safe_summary_v1",
    source: safeEventCountSource(source),
    ingest_status: safeIngestPacketStatus(ingestStatus),
    event_count: safeNonNegativeInteger(eventCount),
    boundary_policy: {
      source_status_count_only: true,
      no_raw_comment_text: true,
      no_tokens: true,
      no_api_response: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertYouTubeIngestPacketSafeSummary(summary);
  return summary;
}

export function assertYouTubeIngestPacketSafeSummary(
  summary,
  context = "youtube ingest packet safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  for (const field of Object.keys(summary)) {
    if (!YOUTUBE_INGEST_PACKET_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (summary.schema !== "iris_youtube_ingest_packet_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!SAFE_EVENT_COUNT_SOURCE_LABELS.includes(summary.source)) {
    throw new ContractError(`${context}: invalid source`);
  }
  if (!["received", "normalized", "ignored", "error"].includes(summary.ingest_status)) {
    throw new ContractError(`${context}: invalid ingest status`);
  }
  assertNonNegativeInteger(summary.event_count, `${context}: event_count`);
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "source_status_count_only",
      "no_raw_comment_text",
      "no_tokens",
      "no_api_response",
      "no_raw_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoYouTubeIngestPacketSummaryLeak(summary, context);
}

export function assertLatestSafeEventCounts(
  summary,
  context = "latest safe event counts"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  for (const field of Object.keys(summary)) {
    if (!LATEST_SAFE_EVENT_COUNTS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (summary.schema !== "iris_latest_safe_event_counts_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!SAFE_EVENT_COUNT_SOURCE_LABELS.includes(summary.source)) {
    throw new ContractError(`${context}: invalid source`);
  }
  assertCountMapSafe(summary.event_type_counts, SAFE_EVENT_COUNT_TYPES, `${context}: event type counts`);
  assertNonNegativeInteger(summary.total_count, `${context}: total_count`);
  const computedTotal = Object.values(summary.event_type_counts).reduce(
    (total, count) => total + count,
    0
  );
  if (summary.total_count !== computedTotal) {
    throw new ContractError(`${context}: count mismatch`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "source_type_count_only",
      "no_raw_event_payload",
      "no_raw_comment_text",
      "no_support_message_text",
      "no_private_ids",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoLatestSafeEventCountsLeak(summary, context);
}

export function createSupportMessageSafeSummary({
  messageClass = "support_message",
  summaryLabel = "support_message_received",
} = {}) {
  const summary = {
    schema: "iris_support_message_safe_summary_v1",
    summary_status: "summarized",
    message_class: safeSupportMessageClass(messageClass),
    summary_label: safeSupportMessageSummaryLabel(summaryLabel),
    surface_policy: {
      ordinary_view_safe: true,
      public_view_safe: true,
      report_safe: true,
      replay_safe: true,
    },
    boundary_policy: {
      summary_only: true,
      no_raw_support_message_text: true,
      no_raw_viewer_text: true,
      no_private_ids: true,
      no_raw_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertSupportMessageSafeSummary(summary);
  return summary;
}

export function assertSupportMessageSafeSummary(
  summary,
  context = "support message safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  for (const field of Object.keys(summary)) {
    if (!SUPPORT_MESSAGE_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (summary.schema !== "iris_support_message_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (summary.summary_status !== "summarized") {
    throw new ContractError(`${context}: invalid summary status`);
  }
  if (!["support_message", "donation_message", "membership_message"].includes(summary.message_class)) {
    throw new ContractError(`${context}: invalid message class`);
  }
  if (!/^[a-z0-9_]{1,80}$/.test(summary.summary_label)) {
    throw new ContractError(`${context}: invalid summary label`);
  }
  assertBoundaryPolicy(
    summary.surface_policy,
    ["ordinary_view_safe", "public_view_safe", "report_safe", "replay_safe"],
    `${context}: surface policy`
  );
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "summary_only",
      "no_raw_support_message_text",
      "no_raw_viewer_text",
      "no_private_ids",
      "no_raw_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoSupportMessageSummaryLeak(summary, context);
}

export function createYouTubeIngestSourceStatusReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const sourceResult = createSourceResult(env);
  const sourceStatus = sourceResult.source ? readSourceStatus(sourceResult.source) : null;
  const sourceKind = sourceStatus?.source_kind ?? sourceResult.source_kind;
  const statusSummary = createStatusSummary({
    sourceKind,
    sourceStatus,
    instantiationStatus: sourceResult.instantiation_status,
  });
  const report = {
    schema: "iris_youtube_ingest_source_status_report_v1",
    generated_at_ms: generatedAtMs,
    next_readiness_state: readinessStateForSourceStatus(statusSummary),
    readiness_state_counts: countReadinessStates([
      readinessStateForSourceStatus(statusSummary),
    ]),
    source_configured: Boolean(sourceResult.source),
    source_kind: sourceKind,
    source_status_available: sourceStatus !== null,
    source_status: sourceStatus,
    instantiation_status: sourceResult.instantiation_status,
    error_kind: sourceResult.error_kind,
    status_summary: statusSummary,
    support_event_policy: {
      normalized_as_donation_event: true,
      relationship_and_memory_candidates_validation_gated: true,
      support_messages_not_exposed_in_status: true,
      status_counts_only: true,
    },
    boundary_policy: {
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_platform_cursor_values: true,
      no_candidates: true,
      no_commands: true,
      no_instantiation_error_message: true,
      read_only_status: true,
      no_polling_side_effects: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeIngestSourceStatusReportSafe(report);
  return report;
}

export function assertYouTubeIngestSourceStatusReportSafe(
  report,
  context = "youtube ingest source status report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenYouTubeSourceStatusFields(report, context);
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_youtube_ingest_source_status_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!YOUTUBE_INGEST_SOURCE_STATUS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated time`);
  }
  assertSafeReadinessState(report.next_readiness_state, context);
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  if (typeof report.source_configured !== "boolean") {
    throw new ContractError(`${context}: invalid source configured flag`);
  }
  if (!SOURCE_KINDS.has(report.source_kind)) {
    throw new ContractError(`${context}: invalid source kind`);
  }
  if (typeof report.source_status_available !== "boolean") {
    throw new ContractError(`${context}: invalid source status flag`);
  }
  if (!INSTANTIATION_STATUSES.has(report.instantiation_status)) {
    throw new ContractError(`${context}: invalid instantiation status`);
  }
  if (report.error_kind !== null && !ERROR_KINDS.has(report.error_kind)) {
    throw new ContractError(`${context}: invalid error kind`);
  }
  if (report.instantiation_status === "ready") {
    if (
      report.source_configured !== true ||
      report.source_status_available !== true ||
      report.source_status === null ||
      report.error_kind !== null
    ) {
      throw new ContractError(`${context}: invalid ready source status`);
    }
  } else {
    if (
      report.source_configured !== false ||
      report.source_status_available !== false ||
      report.source_status !== null ||
      report.error_kind === null
    ) {
      throw new ContractError(`${context}: invalid non-ready source status`);
    }
  }
  if (report.source_status !== null) {
    assertSourceStatusSafe(report.source_status, context);
  }
  assertStatusSummarySafe(report.status_summary, context);
  const expectedReadinessState = readinessStateForSourceStatus(report.status_summary);
  if (
    report.next_readiness_state !== expectedReadinessState ||
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      countReadinessStates([expectedReadinessState])
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state summary`);
  }
  assertSupportEventPolicySafe(report.support_event_policy, context);
  assertBoundaryPolicy(report.boundary_policy, [
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_support_message_text",
    "no_platform_cursor_values",
    "no_candidates",
    "no_commands",
    "no_instantiation_error_message",
    "read_only_status",
    "no_polling_side_effects",
  ], `${context}: boundary policy`);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function readinessStateForSourceStatus(statusSummary) {
  switch (statusSummary?.ingest_readiness_status) {
    case "idle":
    case "active":
      return "ready";
    case "not_configured":
    case "configuration_error":
      return "configuration_waiting";
    case "operator_action_required":
      return "operator_review_required";
    case "attention":
    case "polling_cooldown":
    case "retry_backoff":
      return "runtime_waiting";
    default:
      return "runtime_waiting";
  }
}

function countReadinessStates(states) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const state of states) {
    if (READINESS_STATES.has(state)) counts[state] += 1;
  }
  return counts;
}

function assertSafeReadinessState(state, context) {
  if (!READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: readiness state counts required`);
  }
  for (const state of READINESS_STATES) {
    assertNonNegativeInteger(counts[state], `${context}: invalid ${state}`);
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: unexpected readiness state ${key}`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  if (!left || !right) return false;
  for (const state of READINESS_STATES) {
    if (left[state] !== right[state]) return false;
  }
  return true;
}

function createSourceResult(env) {
  try {
    const source = createLiveChatSourceFromEnv(env);
    if (!source) {
      return {
        source: null,
        source_kind: "not_configured",
        instantiation_status: "not_configured",
        error_kind: "source_not_configured",
      };
    }
    return {
      source,
      source_kind: source.source_kind ?? "configuration_error",
      instantiation_status: "ready",
      error_kind: null,
    };
  } catch (error) {
    if (error instanceof ContractError) {
      return {
        source: null,
        source_kind: "configuration_error",
        instantiation_status: "configuration_error",
        error_kind: "youtube_source_contract_error",
      };
    }
    throw error;
  }
}

function readSourceStatus(source) {
  if (typeof source?.status !== "function") {
    return null;
  }
  const status = source.status();
  assertSourceStatusSafe(status, "youtube ingest source status");
  return status;
}

function assertSourceStatusSafe(status, context) {
  if (status?.source_kind === "youtube_live_chat_api_source") {
    assertYouTubeLiveChatApiSourceStatusSafe(status, `${context}: api source`);
    return;
  }
  if (status?.source_kind === "http_youtube_live_chat_source") {
    assertHttpLiveChatSourceStatusSafe(status, `${context}: relay source`);
    return;
  }
  throw new ContractError(`${context}: unsupported source status`);
}

function createStatusSummary({ sourceKind, sourceStatus, instantiationStatus }) {
  if (!sourceStatus) {
    return {
      schema: "iris_youtube_ingest_source_status_summary_v1",
      source_kind: sourceKind,
      ingest_readiness_status:
        instantiationStatus === "not_configured" ? "not_configured" : "configuration_error",
      auth_mode: "unknown",
      request_count: 0,
      live_chat_request_count: 0,
      video_discovery_request_count: 0,
      last_comment_count: 0,
      last_support_event_count: 0,
      support_event_count: 0,
      last_support_event_type_counts: emptyCountMap(SUPPORT_EVENT_TYPES),
      support_event_type_counts: emptyCountMap(SUPPORT_EVENT_TYPES),
      last_support_amount_source_counts: emptyCountMap(SUPPORT_AMOUNT_SOURCE_KINDS),
      support_amount_source_counts: emptyCountMap(SUPPORT_AMOUNT_SOURCE_KINDS),
      cursor_store_configured: false,
      cursor_store_write_attention: false,
      has_retry_backoff: false,
      last_error: null,
      last_error_recovery_hint: null,
      last_error_operator_action_required: false,
      bridge_endpoint_scope: null,
      bridge_endpoint_locality_ok: null,
    };
  }
  return {
    schema: "iris_youtube_ingest_source_status_summary_v1",
    source_kind: sourceStatus.source_kind,
    ingest_readiness_status: sourceStatus.ingest_readiness_status,
    auth_mode: sourceStatus.auth_mode ?? "not_applicable",
    request_count: sourceStatus.request_count,
    live_chat_request_count: sourceStatus.live_chat_request_count ?? 0,
    video_discovery_request_count: sourceStatus.video_discovery_request_count ?? 0,
    last_comment_count: sourceStatus.last_comment_count,
    last_support_event_count: sourceStatus.last_support_event_count,
    support_event_count: sourceStatus.support_event_count,
    last_support_event_type_counts: safeCountMap(
      sourceStatus.last_support_event_type_counts,
      SUPPORT_EVENT_TYPES
    ),
    support_event_type_counts: safeCountMap(
      sourceStatus.support_event_type_counts,
      SUPPORT_EVENT_TYPES
    ),
    last_support_amount_source_counts: safeCountMap(
      sourceStatus.last_support_amount_source_counts,
      SUPPORT_AMOUNT_SOURCE_KINDS
    ),
    support_amount_source_counts: safeCountMap(
      sourceStatus.support_amount_source_counts,
      SUPPORT_AMOUNT_SOURCE_KINDS
    ),
    cursor_store_configured: sourceStatus.cursor_store_configured ?? false,
    cursor_store_write_attention: sourceStatus.cursor_store_write_attention ?? false,
    has_retry_backoff: sourceStatus.has_retry_backoff ?? false,
    last_error: sourceStatus.last_error,
    last_error_recovery_hint: sourceStatus.last_error_recovery_hint ?? null,
    last_error_operator_action_required:
      sourceStatus.last_error_operator_action_required ?? false,
    bridge_endpoint_scope: sourceStatus.bridge_endpoint_scope ?? null,
    bridge_endpoint_locality_ok: sourceStatus.bridge_endpoint_locality_ok ?? null,
  };
}

function assertStatusSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  if (summary.schema !== "iris_youtube_ingest_source_status_summary_v1") {
    throw new ContractError(`${context}: invalid summary schema`);
  }
  if (!SOURCE_KINDS.has(summary.source_kind)) {
    throw new ContractError(`${context}: invalid summary source kind`);
  }
  if (!INGEST_READINESS_STATUSES.has(summary.ingest_readiness_status)) {
    throw new ContractError(`${context}: invalid summary readiness status`);
  }
  if (!AUTH_MODES.has(summary.auth_mode)) {
    throw new ContractError(`${context}: invalid summary auth mode`);
  }
  for (const field of [
    "request_count",
    "live_chat_request_count",
    "video_discovery_request_count",
    "last_comment_count",
    "last_support_event_count",
    "support_event_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: ${field}`);
  }
  assertCountMapSafe(
    summary.last_support_event_type_counts,
    SUPPORT_EVENT_TYPES,
    `${context}: last support event type counts`
  );
  assertCountMapSafe(
    summary.support_event_type_counts,
    SUPPORT_EVENT_TYPES,
    `${context}: support event type counts`
  );
  assertCountMapSafe(
    summary.last_support_amount_source_counts,
    SUPPORT_AMOUNT_SOURCE_KINDS,
    `${context}: last support amount source counts`
  );
  assertCountMapSafe(
    summary.support_amount_source_counts,
    SUPPORT_AMOUNT_SOURCE_KINDS,
    `${context}: support amount source counts`
  );
  for (const field of [
    "cursor_store_configured",
    "cursor_store_write_attention",
    "has_retry_backoff",
    "last_error_operator_action_required",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of ["last_error", "last_error_recovery_hint", "bridge_endpoint_scope"]) {
    if (summary[field] !== null && typeof summary[field] !== "string") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    summary.bridge_endpoint_locality_ok !== null &&
    typeof summary.bridge_endpoint_locality_ok !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid bridge locality`);
  }
}

function assertSupportEventPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: support event policy is required`);
  }
  for (const field of [
    "normalized_as_donation_event",
    "relationship_and_memory_candidates_validation_gated",
    "support_messages_not_exposed_in_status",
    "status_counts_only",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid support event policy`);
    }
  }
}

function emptyCountMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function safeCountMap(source, keys) {
  const sourceMap = source && typeof source === "object" && !Array.isArray(source)
    ? source
    : {};
  return Object.fromEntries(
    keys.map((key) => [key, safeNonNegativeInteger(sourceMap[key])])
  );
}

function safeNonNegativeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function safeDedupeWindowLabel(value) {
  const windowMs = safeNonNegativeInteger(value);
  if (windowMs === 0) return "disabled";
  if (windowMs < 1000) return "short";
  if (windowMs <= 10_000) return "standard";
  return "extended";
}

function safeOAuthAdminStatus(value) {
  return ["configured", "expired"].includes(value) ? value : "missing";
}

function safeAdminReadyAttentionStatus(value) {
  return value === "ready" ? "ready" : "attention";
}

function hasConfiguredEnv(env, name) {
  return String(env?.[name] ?? "").trim().length > 0;
}

function assertNoYouTubeApiConfiguredStatusLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /https?:\/\/|oauth[_ -]?token|refresh[_ -]?token|access[_ -]?token|bearer|authorization|api[_ -]?key|endpoint|response[_ -]?body|raw[_ -]?response|raw[_ -]?payload|secret/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe API readiness material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoYouTubeApiConfiguredStatusLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoYouTubeApiConfiguredStatusLeak(child, context, `${path}.${field}`);
  }
}

function assertNoOAuthTokenRedactionLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /oauth[_ -]?token|refresh[_ -]?token|access[_ -]?token|bearer\s+|authorization|client[_ -]?secret|token[_ -]?value|secret[_ -]?value|raw[_ -]?payload/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: OAuth token material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoOAuthTokenRedactionLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoOAuthTokenRedactionLeak(child, context, `${path}.${field}`);
  }
}

function assertNoLiveChatIdDiscoveryLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /live[_ -]?chat[_ -]?id|activeLiveChatId|raw[_ -]?api[_ -]?response|response[_ -]?body|private[_ -]?channel|channel[_ -]?id|oauth|token|authorization|endpoint|https?:\/\//i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: live chat discovery material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoLiveChatIdDiscoveryLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoLiveChatIdDiscoveryLeak(child, context, `${path}.${field}`);
  }
}

function assertNoIngestDedupeWindowLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?comment|comment[_ -]?body|raw[_ -]?youtube[_ -]?text|displayMessage|author[_ -]?private|author[_ -]?id|channel[_ -]?id|raw[_ -]?payload|payload/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: raw dedupe material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoIngestDedupeWindowLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoIngestDedupeWindowLeak(child, context, `${path}.${field}`);
  }
}

function assertNoModerationFilterSummaryLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?term|blocked[_ -]?phrase|moderation[_ -]?term|private[_ -]?note|raw[_ -]?comment|comment[_ -]?text|author[_ -]?private|author[_ -]?id|viewer[_ -]?id/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: moderation filter material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoModerationFilterSummaryLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoModerationFilterSummaryLeak(child, context, `${path}.${field}`);
  }
}

function assertNoYouTubeIngestPreflightAdminPageLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /https?:\/\/|oauth[_ -]?token|refresh[_ -]?token|access[_ -]?token|api[_ -]?key|bearer\s+|authorization|secret|raw[_ -]?comment|comment[_ -]?text|displayMessage|api[_ -]?body|response[_ -]?body|raw[_ -]?payload|endpoint/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe admin page material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoYouTubeIngestPreflightAdminPageLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (path.endsWith(".boundary_policy")) {
      continue;
    }
    if (
      /oauth[_-]?token|refresh[_-]?token|access[_-]?token|api[_-]?key|raw[_-]?comment|comment[_-]?text|api[_-]?body|raw[_-]?payload|endpoint|url|payload/i.test(
        field
      )
    ) {
      throw new ContractError(`${context}: unsafe admin page field leaked`, {
        path: `${path}.${field}`,
      });
    }
    assertNoYouTubeIngestPreflightAdminPageLeak(child, context, `${path}.${field}`);
  }
}

function safeSupportDonationEventType(value) {
  const normalized = String(value ?? "").trim();
  return SUPPORT_EVENT_TYPES.includes(normalized)
    ? normalized
    : "normalizedSupportEvent";
}

function safeSupportDonationAmountSource(value) {
  const normalized = String(value ?? "").trim();
  return SUPPORT_AMOUNT_SOURCE_KINDS.includes(normalized) ? normalized : "unknown";
}

function safeSupportModerationState(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return SUPPORT_MODERATION_STATES.includes(normalized) ? normalized : "allowed";
}

function assertNoSupportDonationNormalizerLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?support|support[_ -]?message|message[_ -]?text|private[_ -]?id|private[_ -]?viewer|author[_ -]?id|channel[_ -]?id|amount[_ -]?comparison|viewer[_ -]?ranking|pay[_ -]?to[_ -]?rank|higher[_ -]?than|raw[_ -]?payload|payload/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe support normalizer material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSupportDonationNormalizerLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoSupportDonationNormalizerLeak(child, context, `${path}.${field}`);
  }
}

function assertNoIngestBackoffStatusLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?error|error[_ -]?body|response[_ -]?body|stack[_ -]?trace|exception|endpoint|https?:\/\/|oauth|token|authorization|raw[_ -]?payload|payload|world[_ -]?command|input[_ -]?action[_ -]?candidate/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe backoff material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoIngestBackoffStatusLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoIngestBackoffStatusLeak(child, context, `${path}.${field}`);
  }
}

function safeSourceFailureComponent(value) {
  const normalized = String(value ?? "").trim();
  return ["youtube_ingest", "support_ingest", "relay_source"].includes(normalized)
    ? normalized
    : "youtube_ingest";
}

function safeSourceFailureStatus(value) {
  const normalized = String(value ?? "").trim();
  return ["failed", "degraded", "recovered"].includes(normalized)
    ? normalized
    : "failed";
}

function safeSourceFailureErrorCode(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return normalized || "source_unavailable";
}

function assertNoSourceFailureSummaryLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /endpoint|https?:\/\/|oauth|refresh[_ -]?token|access[_ -]?token|bearer\s+|authorization|secret|raw[_ -]?response|response[_ -]?body|raw[_ -]?payload|payload|world[_ -]?command|input[_ -]?action[_ -]?candidate/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe source failure material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSourceFailureSummaryLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoSourceFailureSummaryLeak(child, context, `${path}.${field}`);
  }
}

function safeEventCountSource(value) {
  const normalized = String(value ?? "").trim();
  return SAFE_EVENT_COUNT_SOURCE_LABELS.includes(normalized)
    ? normalized
    : "youtube_live_chat";
}

function safeIngestPacketStatus(value) {
  const normalized = String(value ?? "").trim();
  return ["received", "normalized", "ignored", "error"].includes(normalized)
    ? normalized
    : "received";
}

function assertNoYouTubeIngestPacketSummaryLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?comment|comment[_ -]?text|displayMessage|message[_ -]?text|oauth|refresh[_ -]?token|access[_ -]?token|bearer\s+|authorization|api[_ -]?response|response[_ -]?body|raw[_ -]?payload|payload|world[_ -]?command|input[_ -]?action[_ -]?candidate/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe ingest packet material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoYouTubeIngestPacketSummaryLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoYouTubeIngestPacketSummaryLeak(child, context, `${path}.${field}`);
  }
}

function assertNoLatestSafeEventCountsLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?event|event[_ -]?payload|raw[_ -]?payload|payload|raw[_ -]?comment|comment[_ -]?text|support[_ -]?message|message[_ -]?text|private[_ -]?id|author[_ -]?id|channel[_ -]?id|viewer[_ -]?id|world[_ -]?command|input[_ -]?action[_ -]?candidate/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe event count material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoLatestSafeEventCountsLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoLatestSafeEventCountsLeak(child, context, `${path}.${field}`);
  }
}

function safeSupportMessageClass(value) {
  const normalized = String(value ?? "").trim();
  return ["support_message", "donation_message", "membership_message"].includes(
    normalized
  )
    ? normalized
    : "support_message";
}

function safeSupportMessageSummaryLabel(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return normalized || "support_message_received";
}

function assertNoSupportMessageSummaryLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?support|support[_ -]?message[_ -]?text|raw[_ -]?viewer|viewer[_ -]?text|message[_ -]?text|private[_ -]?id|author[_ -]?id|channel[_ -]?id|viewer[_ -]?id|raw[_ -]?payload|payload|world[_ -]?command|input[_ -]?action[_ -]?candidate/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe support message material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSupportMessageSummaryLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoSupportMessageSummaryLeak(child, context, `${path}.${field}`);
  }
}

function assertCountMapSafe(counts, keys, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: count map required`);
  }
  for (const key of keys) {
    assertNonNegativeInteger(counts[key], `${context}: invalid ${key}`);
  }
  for (const key of Object.keys(counts)) {
    if (!keys.includes(key)) {
      throw new ContractError(`${context}: unexpected count key`);
    }
  }
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function assertNoForbiddenYouTubeSourceStatusFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenYouTubeSourceStatusFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const field of Object.keys(value)) {
    if (FORBIDDEN_YOUTUBE_SOURCE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { path, field });
    }
    assertNoForbiddenYouTubeSourceStatusFields(value[field], context, `${path}.${field}`);
  }
}
