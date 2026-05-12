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
const URL_PATTERN = /https?:\/\//i;

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
    source_status_available:
      statusSummary.ingest_readiness_status !== "not_configured" ||
      sourceResult.instantiation_status === "ready",
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
