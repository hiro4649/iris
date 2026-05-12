import { ContractError } from "../../core/contracts.js";
import {
  assertYouTubeIngestPreflightReportSafe,
  createYouTubeIngestPreflightReport,
} from "./youtubeIngestPreflight.js";
import {
  assertYouTubeIngestSourceStatusReportSafe,
  createYouTubeIngestSourceStatusReport,
} from "./youtubeIngestSourceStatus.js";

const FORBIDDEN_YOUTUBE_RUNTIME_STATUS_FIELDS = new Set([
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

const RUNTIME_STATUSES = new Set([
  "attention_required",
  "scheduler_unavailable",
  "configured_waiting_for_scheduler_start",
  "polling_active",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const SOURCE_KINDS = new Set([
  "youtube_live_chat_api_source",
  "http_youtube_live_chat_source",
  "not_configured",
  "configuration_error",
]);
const SOURCE_INSTANTIATION_STATUSES = new Set([
  "ready",
  "not_configured",
  "configuration_error",
]);
const PREFLIGHT_STATUSES = new Set([
  "ready_to_poll_youtube_ingest",
  "blocked_by_configuration",
]);
const YOUTUBE_INGEST_RUNTIME_STATUS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "runtime_status",
  "next_readiness_state",
  "readiness_state_counts",
  "source_configured",
  "source_kind",
  "source_instantiation_status",
  "source_ingest_readiness_status",
  "source_auth_mode",
  "source_request_count",
  "source_live_chat_request_count",
  "source_support_event_count",
  "source_last_error",
  "source_last_error_operator_action_required",
  "preflight_status",
  "preflight_attention_reason_count",
  "preflight_next_attention_reason",
  "ingest_scheduler_enabled_by_env",
  "next_runtime_check_script",
  "scheduler_summary",
  "youtube_runtime_state",
  "api_cursor_auth_flow",
  "poll_flow",
  "ingest_hygiene_flow",
  "support_candidate_flow",
  "live_chat_ingest_flow",
  "production_handoff_summary",
  "support_event_policy",
  "boundary_policy",
  "adapter_validation_required",
]);
const SOURCE_READINESS_STATUSES = new Set([
  "idle",
  "active",
  "attention",
  "polling_cooldown",
  "retry_backoff",
  "operator_action_required",
  "not_configured",
  "configuration_error",
]);
const POLL_FLOW_STATUSES = new Set([
  "configuration_attention",
  "source_unavailable",
  "scheduler_unavailable",
  "waiting_for_scheduler_start",
  "polling_active_waiting_for_items",
  "polling_active_with_comments",
  "polling_active_with_support",
  "polling_active_with_comments_and_support",
  "polling_cooldown",
  "retry_backoff",
  "operator_action_required",
  "runtime_attention",
]);
const POLL_FLOW_BLOCKING_STAGES = new Set([
  "configuration",
  "source",
  "scheduler",
  "upstream_cooldown",
  "retry_backoff",
  "operator_action",
  "none",
]);
const INGEST_HYGIENE_FLOW_STATUSES = new Set([
  "configuration_attention",
  "source_unavailable",
  "scheduler_unavailable",
  "waiting_for_scheduler_start",
  "runtime_attention",
  "hygiene_active_clean",
  "hygiene_active_with_filtered_items",
]);
const INGEST_HYGIENE_BLOCKING_STAGES = new Set([
  "configuration",
  "source",
  "scheduler",
  "runtime_attention",
  "none",
]);
const SUPPORT_CANDIDATE_FLOW_STATUSES = new Set([
  "no_support_events_seen",
  "waiting_for_runtime_support_event",
  "waiting_for_donation_reaction",
  "waiting_for_candidate_validation",
  "validation_blocked_or_disabled",
  "waiting_for_candidate_persistence",
  "persistence_attention",
  "validation_gated_persistence_active",
  "review_only_validation_gated",
]);
const SUPPORT_CANDIDATE_BLOCKING_STAGES = new Set([
  "source_telemetry",
  "runtime_state",
  "donation_reaction",
  "validator",
  "persistence",
  "none",
]);
const LIVE_CHAT_INGEST_FLOW_STATUSES = new Set([
  "configuration_attention",
  "source_unavailable",
  "scheduler_unavailable",
  "waiting_for_scheduler_start",
  "polling_cooldown",
  "retry_backoff",
  "operator_action_required",
  "runtime_attention",
  "polling_active_waiting_for_events",
  "waiting_for_runtime_comment",
  "waiting_for_runtime_support_event",
  "runtime_active_with_comments",
  "runtime_active_with_support",
  "runtime_active_with_comments_and_support",
]);
const LIVE_CHAT_INGEST_FLOW_BLOCKING_STAGES = new Set([
  "configuration",
  "source",
  "scheduler",
  "upstream_cooldown",
  "retry_backoff",
  "operator_action",
  "runtime_state",
  "none",
]);
const API_CURSOR_AUTH_FLOW_STATUSES = new Set([
  "configuration_attention",
  "source_unavailable",
  "relay_source_selected",
  "waiting_for_auth",
  "waiting_for_chat_target",
  "waiting_for_cursor_store",
  "cursor_store_attention",
  "operator_action_required",
  "upstream_retry_backoff",
  "upstream_polling_cooldown",
  "waiting_for_scheduler_start",
  "waiting_for_live_chat_resolution",
  "api_polling_waiting_for_items",
  "api_polling_with_comments",
  "api_polling_with_support",
  "api_polling_with_comments_and_support",
]);
const API_CURSOR_AUTH_FLOW_BLOCKING_STAGES = new Set([
  "configuration",
  "source",
  "auth",
  "chat_target",
  "cursor_store",
  "operator_action",
  "retry_backoff",
  "upstream_cooldown",
  "scheduler",
  "live_chat_resolution",
  "none",
]);
const API_CURSOR_AUTH_MODES = new Set([
  "api_key",
  "oauth_token",
  "oauth_refresh",
  "bearer",
  "query_key",
  "not_applicable",
  "unknown",
]);
const API_CURSOR_STORE_HEALTH_STATUSES = new Set([
  "ready",
  "attention",
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
const RUNTIME_CHECK_SCRIPTS = {
  configuration: "npm run dev:youtube:preflight",
  source: "npm run dev:youtube:source-status",
  scheduler: "npm run dev:youtube:runtime-status",
  upstream_cooldown: "npm run dev:youtube:source-status",
  retry_backoff: "npm run dev:youtube:source-status",
  operator_action: "npm run dev:youtube:source-status",
  runtime_attention: "npm run dev:youtube:runtime-ingest-roundtrip",
  runtime_state: "npm run dev:youtube:runtime-ingest-roundtrip",
  source_telemetry: "npm run dev:youtube:source-status",
  donation_reaction: "npm run dev:youtube:support-gate-roundtrip",
  validator: "npm run dev:youtube:support-gate-roundtrip",
  persistence: "npm run dev:persistence:runtime-status",
  auth: "npm run dev:youtube:ingest-once",
  chat_target: "npm run dev:youtube:ingest-once",
  cursor_store: "npm run dev:youtube:cursor-roundtrip",
  live_chat_resolution: "npm run dev:youtube:direct-live-chat-roundtrip",
  none: null,
};
const SUPPORT_CANDIDATE_NON_BLOCKING_STATUSES = new Set([
  "no_support_events_seen",
  "validation_blocked_or_disabled",
  "validation_gated_persistence_active",
  "review_only_validation_gated",
]);
const URL_PATTERN = /https?:\/\//i;
const UNSAFE_STATUS_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|live_chat_id|video_id|next_page_token)\b|https?:\/\//i;
const SAFE_OPTIONAL_STATUS_ALLOWLIST = new Set([
  "api_key",
  "oauth_token",
  "oauth_refresh",
  "bearer",
  "query_key",
  "not_applicable",
  "not_configured",
  "configuration_error",
  "unknown",
]);

export function createYouTubeIngestRuntimeStatusReport({
  env = process.env,
  httpIngestScheduler = null,
  streamState = null,
  generatedAtMs = Date.now(),
} = {}) {
  const preflight = createYouTubeIngestPreflightReport({ env, generatedAtMs });
  const sourceStatus = createYouTubeIngestSourceStatusReport({
    env,
    generatedAtMs,
  });
  assertYouTubeIngestPreflightReportSafe(preflight, "youtube runtime preflight");
  assertYouTubeIngestSourceStatusReportSafe(sourceStatus, "youtube runtime source status");

  const schedulerSummary = createSchedulerSummary(httpIngestScheduler);
  const youtubeRuntimeState = createYouTubeRuntimeStateSummary({
    streamState,
    generatedAtMs,
  });
  const sourceReady = sourceStatus.instantiation_status === "ready";
  const preflightReady = preflight.preflight_status === "ready_to_poll_youtube_ingest";
  const apiAccessPreflightReady =
    preflightReady || isSchedulerOnlyPreflightAttention(preflight);
  const runtimeStatus = summarizeRuntimeStatus({
    sourceReady,
    preflightReady: apiAccessPreflightReady,
    schedulerSummary,
  });
  const pollFlow = createPollFlowSummary({
    preflight,
    sourceStatus,
    schedulerSummary,
  });
  const apiCursorAuthFlow = createApiCursorAuthFlowSummary({
    preflight,
    sourceStatus,
    schedulerSummary,
  });
  const ingestHygieneFlow = createIngestHygieneFlowSummary({
    preflight,
    sourceStatus,
    schedulerSummary,
  });
  const supportCandidateFlow = createSupportCandidateFlowSummary({
    schedulerSummary,
    youtubeRuntimeState,
  });
  const liveChatIngestFlow = createLiveChatIngestFlowSummary({
    pollFlow,
    youtubeRuntimeState,
    supportCandidateFlow,
  });
  const report = {
    schema: "iris_youtube_ingest_runtime_status_report_v1",
    generated_at_ms: generatedAtMs,
    runtime_status: runtimeStatus,
    next_readiness_state: firstReadinessState([
      apiCursorAuthFlow,
      pollFlow,
      liveChatIngestFlow,
      ingestHygieneFlow,
      supportCandidateFlow,
    ]),
    readiness_state_counts: countReadinessStates([
      apiCursorAuthFlow,
      pollFlow,
      ingestHygieneFlow,
      supportCandidateFlow,
      liveChatIngestFlow,
    ]),
    source_configured: sourceStatus.source_configured,
    source_kind: sourceStatus.source_kind,
    source_instantiation_status: sourceStatus.instantiation_status,
    source_ingest_readiness_status:
      sourceStatus.status_summary.ingest_readiness_status,
    source_auth_mode: sourceStatus.status_summary.auth_mode,
    source_request_count: sourceStatus.status_summary.request_count,
    source_live_chat_request_count:
      sourceStatus.status_summary.live_chat_request_count,
    source_support_event_count: sourceStatus.status_summary.support_event_count,
    source_last_error: sourceStatus.status_summary.last_error,
    source_last_error_operator_action_required:
      sourceStatus.status_summary.last_error_operator_action_required,
    preflight_status: preflight.preflight_status,
    preflight_attention_reason_count: preflight.attention_reason_count,
    preflight_next_attention_reason: preflight.next_attention_reason,
    ingest_scheduler_enabled_by_env: preflight.ingest_scheduler_enabled,
    next_runtime_check_script: firstRuntimeCheckScript([
      apiCursorAuthFlow,
      pollFlow,
      liveChatIngestFlow,
      ingestHygieneFlow,
      supportCandidateFlow,
    ]),
    scheduler_summary: schedulerSummary,
    youtube_runtime_state: youtubeRuntimeState,
    api_cursor_auth_flow: apiCursorAuthFlow,
    poll_flow: pollFlow,
    ingest_hygiene_flow: ingestHygieneFlow,
    support_candidate_flow: supportCandidateFlow,
    live_chat_ingest_flow: liveChatIngestFlow,
    production_handoff_summary: createYouTubeRuntimeProductionHandoffSummary({
      runtimeStatus,
      sourceStatus,
      schedulerSummary,
      youtubeRuntimeState,
      apiCursorAuthFlow,
      pollFlow,
      supportCandidateFlow,
      liveChatIngestFlow,
      ingestHygieneFlow,
      nextRuntimeCheckScript: firstRuntimeCheckScript([
        apiCursorAuthFlow,
        pollFlow,
        liveChatIngestFlow,
        ingestHygieneFlow,
        supportCandidateFlow,
      ]),
    }),
    support_event_policy: {
      comment_events_enter_reaction_pipeline: true,
      support_events_enter_donation_pipeline: true,
      support_events_not_counted_as_comments: true,
      relationship_and_memory_candidates_validation_gated: true,
      runtime_status_reports_candidate_gate_summary: true,
      live_chat_ingest_flow_reports_comment_and_support_handoff: true,
      source_events_deduped_and_moderated_before_runtime: true,
      support_messages_not_exposed_in_status: true,
      scheduler_runtime_status_counts_only: true,
    },
    boundary_policy: {
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_platform_cursor_values: true,
      no_candidates: true,
      no_commands: true,
      no_raw_stream_state: true,
      no_raw_scheduler_results: true,
      read_only_runtime_status: true,
      no_polling_side_effects: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeIngestRuntimeStatusReportSafe(report);
  return report;
}

export function assertYouTubeIngestRuntimeStatusReportSafe(
  report,
  context = "youtube ingest runtime status report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenYouTubeRuntimeStatusFields(report, context);
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_youtube_ingest_runtime_status_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!YOUTUBE_INGEST_RUNTIME_STATUS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated time`);
  }
  if (!RUNTIME_STATUSES.has(report.runtime_status)) {
    throw new ContractError(`${context}: invalid runtime status`);
  }
  if (!READINESS_STATES.has(report.next_readiness_state)) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  assertReadinessStateCountsSafe(
    report.readiness_state_counts,
    `${context}: readiness state counts`
  );
  if (typeof report.source_configured !== "boolean") {
    throw new ContractError(`${context}: invalid source configured flag`);
  }
  if (!SOURCE_KINDS.has(report.source_kind)) {
    throw new ContractError(`${context}: invalid source kind`);
  }
  if (!SOURCE_INSTANTIATION_STATUSES.has(report.source_instantiation_status)) {
    throw new ContractError(`${context}: invalid source instantiation status`);
  }
  if (!SOURCE_READINESS_STATUSES.has(report.source_ingest_readiness_status)) {
    throw new ContractError(`${context}: invalid source readiness`);
  }
  if (typeof report.source_auth_mode !== "string") {
    throw new ContractError(`${context}: invalid source auth mode`);
  }
  for (const field of [
    "source_request_count",
    "source_live_chat_request_count",
    "source_support_event_count",
    "preflight_attention_reason_count",
  ]) {
    assertNonNegativeInteger(report[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "source_last_error",
    "preflight_next_attention_reason",
  ]) {
    if (report[field] !== null && typeof report[field] !== "string") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (typeof report.source_last_error_operator_action_required !== "boolean") {
    throw new ContractError(`${context}: invalid source operator-action flag`);
  }
  if (!PREFLIGHT_STATUSES.has(report.preflight_status)) {
    throw new ContractError(`${context}: invalid preflight status`);
  }
  if (typeof report.ingest_scheduler_enabled_by_env !== "boolean") {
    throw new ContractError(`${context}: invalid scheduler env flag`);
  }
  assertSafeOptionalScriptName(
    report.next_runtime_check_script,
    `${context}: next runtime check script`
  );
  assertSchedulerSummarySafe(report.scheduler_summary, context);
  assertYouTubeRuntimeStateSummarySafe(report.youtube_runtime_state, context);
  assertApiCursorAuthFlowSummarySafe(report.api_cursor_auth_flow, context);
  assertPollFlowSummarySafe(report.poll_flow, context);
  assertIngestHygieneFlowSummarySafe(report.ingest_hygiene_flow, context);
  assertSupportCandidateFlowSummarySafe(report.support_candidate_flow, context);
  assertLiveChatIngestFlowSummarySafe(report.live_chat_ingest_flow, context);
  assertYouTubeRuntimeProductionHandoffSummarySafe(
    report.production_handoff_summary,
    report,
    context
  );
  if (
    report.next_runtime_check_script !==
    firstRuntimeCheckScript([
      report.api_cursor_auth_flow,
      report.poll_flow,
      report.live_chat_ingest_flow,
      report.ingest_hygiene_flow,
      report.support_candidate_flow,
    ])
  ) {
    throw new ContractError(`${context}: invalid next runtime check script`);
  }
  assertSupportEventPolicySafe(report.support_event_policy, context);
  assertBoundaryPolicy(
    report.boundary_policy,
    [
      "env_names_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_live_payloads",
      "no_support_message_text",
      "no_platform_cursor_values",
      "no_candidates",
      "no_commands",
      "no_raw_stream_state",
      "no_raw_scheduler_results",
      "read_only_runtime_status",
      "no_polling_side_effects",
      "script_names_only",
    ],
    `${context}: boundary policy`
  );
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

function assertYouTubeRuntimeProductionHandoffSummarySafe(
  summary,
  report,
  context
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (
    summary.schema !==
    "iris_youtube_ingest_runtime_status_handoff_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of [
    "runtime_status_report_only",
    "live_polling_not_started_by_report",
    "direct_youtube_api_not_called_by_report",
    "oauth_flow_not_started_by_report",
    "scheduler_tick_not_started_by_report",
    "support_messages_not_exposed",
    "platform_cursor_values_not_exposed",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
    "raw_scheduler_results_not_exposed",
    "memory_and_relationship_candidates_remain_gated",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (summary.runtime_status !== report.runtime_status) {
    throw new ContractError(`${context}: handoff runtime status mismatch`);
  }
  if (!SOURCE_KINDS.has(summary.source_kind)) {
    throw new ContractError(`${context}: invalid handoff source kind`);
  }
  if (!SOURCE_INSTANTIATION_STATUSES.has(summary.source_instantiation_status)) {
    throw new ContractError(`${context}: invalid handoff source instantiation`);
  }
  if (!SOURCE_READINESS_STATUSES.has(summary.source_ingest_readiness_status)) {
    throw new ContractError(`${context}: invalid handoff source readiness`);
  }
  if (!API_CURSOR_AUTH_MODES.has(summary.auth_mode)) {
    throw new ContractError(`${context}: invalid handoff auth mode`);
  }
  for (const field of [
    "scheduler_available",
    "scheduler_running",
    "scheduler_ticking",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid handoff scheduler flag`);
    }
  }
  for (const field of [
    "youtube_source_count",
    "request_count",
    "live_chat_request_count",
    "comment_event_count",
    "support_event_count",
    "ignored_event_count",
    "runtime_history_comment_count",
    "runtime_history_support_event_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid handoff count`);
  }
  if (!SUPPORT_CANDIDATE_FLOW_STATUSES.has(summary.support_candidate_flow_status)) {
    throw new ContractError(`${context}: invalid handoff support candidate flow`);
  }
  if (!LIVE_CHAT_INGEST_FLOW_STATUSES.has(summary.live_chat_ingest_flow_status)) {
    throw new ContractError(`${context}: invalid handoff live chat flow`);
  }
  if (!API_CURSOR_AUTH_FLOW_STATUSES.has(summary.api_cursor_auth_flow_status)) {
    throw new ContractError(`${context}: invalid handoff auth flow`);
  }
  if (!POLL_FLOW_STATUSES.has(summary.poll_flow_status)) {
    throw new ContractError(`${context}: invalid handoff poll flow`);
  }
  if (!READINESS_STATES.has(summary.next_readiness_state)) {
    throw new ContractError(`${context}: invalid handoff next readiness state`);
  }
  assertReadinessStateCountsSafe(
    summary.readiness_state_counts,
    `${context}: handoff readiness state counts`
  );
  assertSafeOptionalScriptName(
    summary.next_runtime_check_script,
    `${context}: handoff next runtime check script`
  );
  if (
    summary.source_kind !== report.source_kind ||
    summary.source_instantiation_status !== report.source_instantiation_status ||
    summary.source_ingest_readiness_status !==
      report.source_ingest_readiness_status ||
    summary.auth_mode !== report.source_auth_mode ||
    summary.scheduler_available !== report.scheduler_summary.scheduler_available ||
    summary.scheduler_running !== report.scheduler_summary.running ||
    summary.scheduler_ticking !== report.scheduler_summary.ticking ||
    summary.youtube_source_count !== report.scheduler_summary.youtube_source_count ||
    summary.request_count !==
      report.scheduler_summary.youtube_source_telemetry_counts.request_count ||
    summary.live_chat_request_count !==
      report.scheduler_summary.youtube_source_telemetry_counts
        .live_chat_request_count ||
    summary.comment_event_count !==
      report.scheduler_summary.youtube_source_telemetry_counts.comment_event_count ||
    summary.support_event_count !==
      report.scheduler_summary.youtube_source_telemetry_counts.support_event_count ||
    summary.ignored_event_count !==
      report.scheduler_summary.youtube_source_telemetry_counts.ignored_event_count ||
    summary.runtime_history_comment_count !==
      report.youtube_runtime_state.history_comment_count ||
    summary.runtime_history_support_event_count !==
      report.youtube_runtime_state.history_support_event_count ||
    summary.support_candidate_flow_status !==
      report.support_candidate_flow.flow_status ||
    summary.live_chat_ingest_flow_status !==
      report.live_chat_ingest_flow.flow_status ||
    summary.api_cursor_auth_flow_status !==
      report.api_cursor_auth_flow.flow_status ||
    summary.poll_flow_status !== report.poll_flow.flow_status ||
    summary.next_readiness_state !== report.next_readiness_state ||
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.readiness_state_counts
    ) ||
    summary.next_runtime_check_script !== report.next_runtime_check_script
  ) {
    throw new ContractError(`${context}: production handoff summary mismatch`);
  }
}

function summarizeRuntimeStatus({ sourceReady, preflightReady, schedulerSummary }) {
  if (!sourceReady || !preflightReady) return "attention_required";
  if (!schedulerSummary.scheduler_available) return "scheduler_unavailable";
  return schedulerSummary.running
    ? "polling_active"
    : "configured_waiting_for_scheduler_start";
}

function createYouTubeRuntimeProductionHandoffSummary({
  runtimeStatus,
  sourceStatus,
  schedulerSummary,
  youtubeRuntimeState,
  apiCursorAuthFlow,
  pollFlow,
  supportCandidateFlow,
  liveChatIngestFlow,
  ingestHygieneFlow,
  nextRuntimeCheckScript,
}) {
  const telemetry = schedulerSummary.youtube_source_telemetry_counts;
  const flowSummaries = [
    apiCursorAuthFlow,
    pollFlow,
    ingestHygieneFlow,
    supportCandidateFlow,
    liveChatIngestFlow,
  ];
  return {
    schema: "iris_youtube_ingest_runtime_status_handoff_summary_v1",
    runtime_status_report_only: true,
    live_polling_not_started_by_report: true,
    direct_youtube_api_not_called_by_report: true,
    oauth_flow_not_started_by_report: true,
    scheduler_tick_not_started_by_report: true,
    support_messages_not_exposed: true,
    platform_cursor_values_not_exposed: true,
    endpoint_values_not_exposed: true,
    secret_values_not_exposed: true,
    raw_scheduler_results_not_exposed: true,
    memory_and_relationship_candidates_remain_gated: true,
    runtime_status: runtimeStatus,
    source_kind: sourceStatus.source_kind,
    source_instantiation_status: sourceStatus.instantiation_status,
    source_ingest_readiness_status:
      sourceStatus.status_summary.ingest_readiness_status,
    auth_mode: safeOptionalStatus(sourceStatus.status_summary.auth_mode) ?? "unknown",
    scheduler_available: schedulerSummary.scheduler_available,
    scheduler_running: schedulerSummary.running,
    scheduler_ticking: schedulerSummary.ticking,
    youtube_source_count: schedulerSummary.youtube_source_count,
    request_count: telemetry.request_count,
    live_chat_request_count: telemetry.live_chat_request_count,
    comment_event_count: telemetry.comment_event_count,
    support_event_count: telemetry.support_event_count,
    ignored_event_count: telemetry.ignored_event_count,
    runtime_history_comment_count: youtubeRuntimeState.history_comment_count,
    runtime_history_support_event_count:
      youtubeRuntimeState.history_support_event_count,
    support_candidate_flow_status: supportCandidateFlow.flow_status,
    live_chat_ingest_flow_status: liveChatIngestFlow.flow_status,
    api_cursor_auth_flow_status: apiCursorAuthFlow.flow_status,
    poll_flow_status: pollFlow.flow_status,
    next_readiness_state: firstReadinessState([
      apiCursorAuthFlow,
      pollFlow,
      liveChatIngestFlow,
      ingestHygieneFlow,
      supportCandidateFlow,
    ]),
    readiness_state_counts: countReadinessStates(flowSummaries),
    next_runtime_check_script: nextRuntimeCheckScript,
  };
}

function createPollFlowSummary({ preflight, sourceStatus, schedulerSummary }) {
  const statusSummary = sourceStatus.status_summary;
  const source =
    sourceStatus.source_status && typeof sourceStatus.source_status === "object"
      ? sourceStatus.source_status
      : {};
  const telemetry = schedulerSummary.youtube_source_telemetry_counts;
  const preflightReady = preflight.preflight_status === "ready_to_poll_youtube_ingest";
  const pollPreflightReady =
    preflightReady || isSchedulerOnlyPreflightAttention(preflight);
  const sourceReady = sourceStatus.instantiation_status === "ready";
  const directApiSourceActive =
    sourceStatus.source_kind === "youtube_live_chat_api_source";
  const relaySourceActive =
    sourceStatus.source_kind === "http_youtube_live_chat_source";
  const cursorStore =
    source.cursor_store_status &&
    typeof source.cursor_store_status === "object" &&
    !Array.isArray(source.cursor_store_status)
      ? source.cursor_store_status
      : null;
  const cursorStoreConfigured =
    directApiSourceActive &&
    (safeCursorStoreHealth(cursorStore?.health) === "ready" ||
      typeof cursorStore?.has_persisted_page_token === "boolean" ||
      typeof cursorStore?.read_error === "boolean");
  const operatorActionRequired =
    statusSummary.last_error_operator_action_required === true ||
    statusSummary.ingest_readiness_status === "operator_action_required";
  const retryBackoff =
    statusSummary.has_retry_backoff === true ||
    statusSummary.ingest_readiness_status === "retry_backoff";
  const pollingCooldown = statusSummary.ingest_readiness_status === "polling_cooldown";
  const commentEventCount = telemetry.comment_event_count;
  const supportEventCount = telemetry.support_event_count;
  const context = {
    preflightReady: pollPreflightReady,
    sourceReady,
    schedulerAvailable: schedulerSummary.scheduler_available,
    schedulerRunning: schedulerSummary.running,
    schedulerStatusError: schedulerSummary.scheduler_status_error,
    schedulerSourceErrorCount: schedulerSummary.source_error_count,
    operatorActionRequired,
    retryBackoff,
    pollingCooldown,
    commentEventCount,
    supportEventCount,
  };
  const flowStatus = summarizePollFlowStatus(context);
  const blockingStage = summarizePollFlowBlockingStage(context);
  return {
    schema: "iris_youtube_ingest_poll_flow_summary_v1",
    flow_status: flowStatus,
    blocking_stage: blockingStage,
    readiness_state: readinessStateForBlockingStage(blockingStage),
    next_check_script: checkScriptForBlockingStage(blockingStage),
    preflight_ready: pollPreflightReady,
    source_ready: sourceReady,
    direct_api_source_active: directApiSourceActive,
    relay_source_active: relaySourceActive,
    auth_mode: safeOptionalStatus(statusSummary.auth_mode) ?? "unknown",
    cursor_store_configured: cursorStoreConfigured,
    cursor_store_write_attention:
      statusSummary.cursor_store_write_attention === true,
    scheduler_available: schedulerSummary.scheduler_available,
    scheduler_running: schedulerSummary.running,
    youtube_source_count: schedulerSummary.youtube_source_count,
    scheduler_processed_count: schedulerSummary.processed_count,
    scheduler_duplicate_count: schedulerSummary.duplicate_count,
    scheduler_source_error_count: schedulerSummary.source_error_count,
    request_count: telemetry.request_count,
    live_chat_request_count: telemetry.live_chat_request_count,
    last_item_count: telemetry.last_item_count,
    last_comment_count: telemetry.last_comment_count,
    last_support_event_count: telemetry.last_support_event_count,
    comment_event_count: commentEventCount,
    support_event_count: supportEventCount,
    support_events_ready_for_donation_pipeline: supportEventCount > 0,
    operator_action_required: operatorActionRequired,
    retry_backoff_active: retryBackoff,
    polling_cooldown_active: pollingCooldown,
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_source_names: true,
      no_platform_ids: true,
      no_platform_cursor_values: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
}

function createIngestHygieneFlowSummary({
  preflight,
  sourceStatus,
  schedulerSummary,
}) {
  const statusSummary = sourceStatus.status_summary;
  const telemetry = schedulerSummary.youtube_source_telemetry_counts;
  const preflightReady =
    preflight.preflight_status === "ready_to_poll_youtube_ingest";
  const hygienePreflightReady =
    preflightReady || isSchedulerOnlyPreflightAttention(preflight);
  const configuredEnv = Array.isArray(preflight.configured_env)
    ? preflight.configured_env
    : [];
  const sourceReady = sourceStatus.instantiation_status === "ready";
  const schedulerHealthy =
    schedulerSummary.scheduler_status_error === null &&
    schedulerSummary.running === true &&
    schedulerSummary.youtube_source_count > 0 &&
    schedulerSummary.source_error_count === 0;
  const ignoredOrFilteredCount =
    telemetry.ignored_event_count +
    telemetry.duplicate_item_count +
    telemetry.moderation_filtered_count +
    schedulerSummary.duplicate_count;
  const context = {
    preflightReady: hygienePreflightReady,
    sourceReady,
    schedulerAvailable: schedulerSummary.scheduler_available,
    schedulerRunning: schedulerSummary.running,
    schedulerHealthy,
    ignoredOrFilteredCount,
  };
  const flowStatus = summarizeIngestHygieneFlowStatus(context);
  const blockingStage = summarizeIngestHygieneBlockingStage(context);
  return {
    schema: "iris_youtube_ingest_hygiene_flow_summary_v1",
    flow_status: flowStatus,
    blocking_stage: blockingStage,
    readiness_state: readinessStateForBlockingStage(blockingStage),
    next_check_script: checkScriptForBlockingStage(blockingStage),
    preflight_ready: hygienePreflightReady,
    source_ready: sourceReady,
    direct_api_source_active:
      sourceStatus.source_kind === "youtube_live_chat_api_source",
    relay_source_active:
      sourceStatus.source_kind === "http_youtube_live_chat_source",
    moderation_filter_configured:
      configuredEnv.includes("IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS") ||
      configuredEnv.includes("IRIS_YOUTUBE_BLOCKED_TEXT_TERMS"),
    scheduler_available: schedulerSummary.scheduler_available,
    scheduler_running: schedulerSummary.running,
    scheduler_healthy: schedulerHealthy,
    scheduler_processed_count: schedulerSummary.processed_count,
    scheduler_duplicate_count: schedulerSummary.duplicate_count,
    scheduler_source_error_count: schedulerSummary.source_error_count,
    request_count: telemetry.request_count,
    last_item_count: telemetry.last_item_count,
    last_ignored_count: telemetry.last_ignored_count,
    last_duplicate_count: telemetry.last_duplicate_count,
    last_moderation_filtered_count:
      telemetry.last_moderation_filtered_count,
    ignored_event_count: telemetry.ignored_event_count,
    duplicate_item_count: telemetry.duplicate_item_count,
    moderation_filtered_count: telemetry.moderation_filtered_count,
    comment_event_count: telemetry.comment_event_count,
    support_event_count: telemetry.support_event_count,
    filtered_or_duplicate_item_count: ignoredOrFilteredCount,
    support_event_type_counts: telemetry.support_event_type_counts,
    support_amount_source_counts: telemetry.support_amount_source_counts,
    hygiene_policy: {
      duplicate_platform_items_do_not_double_trigger: true,
      moderation_filter_runs_before_runtime: true,
      ignored_items_do_not_enter_reaction_pipeline: true,
      support_events_keep_type_counts_without_messages: true,
      scheduler_duplicate_counts_are_summary_only: true,
    },
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_source_names: true,
      no_platform_ids: true,
      no_platform_cursor_values: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_support_message_text: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
}

function createApiCursorAuthFlowSummary({
  preflight,
  sourceStatus,
  schedulerSummary,
}) {
  const statusSummary = sourceStatus.status_summary;
  const source = sourceStatus.source_status && typeof sourceStatus.source_status === "object"
    ? sourceStatus.source_status
    : {};
  const preflightReady = preflight.preflight_status === "ready_to_poll_youtube_ingest";
  const apiAccessPreflightReady =
    preflightReady || isSchedulerOnlyPreflightAttention(preflight);
  const sourceReady = sourceStatus.instantiation_status === "ready";
  const directApiSourceActive =
    sourceStatus.source_kind === "youtube_live_chat_api_source";
  const relaySourceActive =
    sourceStatus.source_kind === "http_youtube_live_chat_source";
  const authMode = safeApiCursorAuthMode(statusSummary.auth_mode);
  const configuredEnv = Array.isArray(preflight.configured_env)
    ? preflight.configured_env
    : [];
  const authReady =
    relaySourceActive ||
    (directApiSourceActive === true &&
      (configuredEnv.includes("IRIS_YOUTUBE_DATA_API_KEY") ||
        configuredEnv.includes("IRIS_YOUTUBE_OAUTH_TOKEN") ||
        (configuredEnv.includes("IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN") &&
          configuredEnv.includes("IRIS_YOUTUBE_OAUTH_CLIENT_ID") &&
          configuredEnv.includes("IRIS_YOUTUBE_OAUTH_CLIENT_SECRET"))));
  const cursorStore = source.cursor_store_status &&
    typeof source.cursor_store_status === "object" &&
    !Array.isArray(source.cursor_store_status)
    ? source.cursor_store_status
    : null;
  const cursorStoreHealth = directApiSourceActive
    ? safeCursorStoreHealth(cursorStore?.health)
    : "not_applicable";
  const cursorStoreConfigured =
    directApiSourceActive &&
    configuredEnv.includes("IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH");
  const cursorStoreReadAttention =
    directApiSourceActive && cursorStore?.read_error === true;
  const cursorStoreWriteAttention =
    directApiSourceActive &&
    statusSummary.cursor_store_write_attention === true;
  const cursorStoreAttention =
    cursorStoreReadAttention ||
    cursorStoreWriteAttention ||
    cursorStoreHealth === "attention";
  const cursorStoreStatusAvailable =
    directApiSourceActive &&
    cursorStoreConfigured &&
    (cursorStoreHealth === "ready" ||
      cursorStoreHealth === "attention" ||
      typeof cursorStore?.has_persisted_page_token === "boolean" ||
      typeof cursorStore?.read_error === "boolean");
  const operatorActionRequired =
    statusSummary.last_error_operator_action_required === true ||
    statusSummary.ingest_readiness_status === "operator_action_required";
  const retryBackoff =
    statusSummary.has_retry_backoff === true ||
    statusSummary.ingest_readiness_status === "retry_backoff";
  const pollingCooldown =
    statusSummary.ingest_readiness_status === "polling_cooldown";
  const apiDirectChatTargetConfigured =
    directApiSourceActive && configuredEnv.includes("IRIS_YOUTUBE_LIVE_CHAT_ID");
  const apiVideoTargetConfigured =
    directApiSourceActive &&
    (configuredEnv.includes("IRIS_YOUTUBE_VIDEO_ID") ||
      configuredEnv.includes("IRIS_YOUTUBE_VIDEO_URL") ||
      configuredEnv.includes("IRIS_YOUTUBE_WATCH_URL"));
  const apiChatTargetConfigured =
    apiDirectChatTargetConfigured || apiVideoTargetConfigured;
  const telemetry = schedulerSummary.youtube_source_telemetry_counts;
  const apiLiveChatResolved =
    directApiSourceActive &&
    (source.live_chat_id_resolved === true ||
      telemetry.live_chat_request_count > 0);
  const apiLiveChatResolutionNeeded =
    directApiSourceActive &&
    apiVideoTargetConfigured &&
    apiLiveChatResolved !== true;
  const context = {
    preflightReady: apiAccessPreflightReady,
    sourceReady,
    directApiSourceActive,
    relaySourceActive,
    authReady,
    apiChatTargetConfigured,
    cursorStoreConfigured,
    cursorStoreAttention,
    operatorActionRequired,
    retryBackoff,
    pollingCooldown,
    schedulerAvailable: schedulerSummary.scheduler_available,
    schedulerRunning: schedulerSummary.running,
    schedulerStatusError: schedulerSummary.scheduler_status_error,
    schedulerSourceErrorCount: schedulerSummary.source_error_count,
    apiLiveChatResolutionNeeded,
    commentEventCount: telemetry.comment_event_count,
    supportEventCount: telemetry.support_event_count,
  };
  const flowStatus = summarizeApiCursorAuthFlowStatus(context);
  const blockingStage = summarizeApiCursorAuthBlockingStage(context);
  return {
    schema: "iris_youtube_api_cursor_auth_flow_summary_v1",
    flow_status: flowStatus,
    blocking_stage: blockingStage,
    readiness_state: readinessStateForBlockingStage(blockingStage),
    next_check_script: checkScriptForBlockingStage(blockingStage),
    preflight_ready: apiAccessPreflightReady,
    source_ready: sourceReady,
    direct_api_source_active: directApiSourceActive,
    relay_source_active: relaySourceActive,
    auth_mode: authMode,
    auth_ready: authReady,
    api_chat_target_configured: apiChatTargetConfigured,
    api_direct_chat_target_configured: apiDirectChatTargetConfigured,
    api_video_target_configured: apiVideoTargetConfigured,
    api_live_chat_resolved: apiLiveChatResolved,
    api_live_chat_resolution_needed: apiLiveChatResolutionNeeded,
    cursor_store_configured: cursorStoreConfigured,
    cursor_store_status_available: cursorStoreStatusAvailable,
    cursor_store_health: cursorStoreHealth,
    saved_cursor_available:
      directApiSourceActive && cursorStore?.has_persisted_page_token === true,
    cursor_store_read_attention: cursorStoreReadAttention,
    cursor_store_write_attention: cursorStoreWriteAttention,
    cursor_store_attention: cursorStoreAttention,
    scheduler_available: schedulerSummary.scheduler_available,
    scheduler_running: schedulerSummary.running,
    request_count: telemetry.request_count,
    video_discovery_request_count:
      telemetry.video_discovery_request_count,
    live_chat_request_count: telemetry.live_chat_request_count,
    last_comment_count: telemetry.last_comment_count,
    last_support_event_count: telemetry.last_support_event_count,
    comment_event_count: telemetry.comment_event_count,
    support_event_count: telemetry.support_event_count,
    operator_action_required: operatorActionRequired,
    retry_backoff_active: retryBackoff,
    polling_cooldown_active: pollingCooldown,
    source_last_error_seen: statusSummary.last_error !== null,
    source_recovery_hint_seen:
      statusSummary.last_error_recovery_hint !== null,
    source_access_policy: {
      direct_api_uses_live_chat_or_video_target: true,
      cursor_store_required_for_restart_resume: true,
      relay_source_bypasses_direct_api_cursor: true,
      scheduler_tick_required_for_polling: true,
    },
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_live_chat_id: true,
      no_video_id: true,
      no_platform_cursor_values: true,
      no_cursor_store_path: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_support_message_text: true,
      no_candidates: true,
      no_commands: true,
      read_only_runtime_status: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
}

function createYouTubeRuntimeStateSummary({ streamState, generatedAtMs }) {
  const state = readStreamState(streamState);
  if (!state) return emptyYouTubeRuntimeStateSummary();
  const latestPayloadKind = safeOptionalStatus(state.last_payload_kind);
  const latestSource = safeOptionalStatus(state.last_source);
  const history = Array.isArray(state.history) ? state.history : [];
  const candidateValidation = state.last_candidate_validation ?? {};
  const candidatePersistence = state.last_candidate_persistence ?? {};
  const relationshipDeepening = state.last_relationship_deepening ?? {};
  const donationReaction = state.last_donation_reaction ?? {};
  const boundaryAudit = state.last_boundary_audit ?? {};
  const supportHistory = history.filter((item) => item?.payload_kind === "donation_event");
  const supportDonationReactionCount = supportHistory.filter(
    (item) =>
      item?.donation_reaction_style &&
      item.donation_reaction_style !== "not_applicable"
  ).length;
  const supportCandidateValidatedCount = supportHistory.filter(
    (item) => item?.candidate_validation_status === "validated"
  ).length;
  const supportCandidatePersistedCount = supportHistory.filter(
    (item) => safeNonNegativeNumber(item?.candidate_memory_committed_count) > 0
  ).length;
  const latestIsSupport = latestPayloadKind === "donation_event";
  const latestIsComment =
    latestPayloadKind === "comment" &&
    (latestSource === null ||
      latestSource === "youtube_live_chat" ||
      latestSource === "youtube_comment");
  const donationEventStatus = safeOptionalStatus(donationReaction.donation_event_status);
  const donationReactionStyle = safeOptionalStatus(donationReaction.reaction_style);
  const relationshipCandidateStatus = safeOptionalStatus(
    relationshipDeepening.candidate_status
  );
  const relationshipDeepeningAvailable =
    relationshipCandidateStatus !== null ||
    relationshipDeepening.schema === "iris_relationship_deepening_v1";
  const candidateValidationStatus = safeOptionalStatus(
    candidateValidation.validation_status
  );
  const approvedMemoryRecordCount =
    safeNonNegativeNumber(candidateValidation.approved_memory_record_count) ?? 0;
  const approvedRelationshipRecordCount =
    safeNonNegativeNumber(candidateValidation.approved_relationship_record_count) ?? 0;
  const rejectedCandidateCount =
    safeNonNegativeNumber(candidateValidation.rejected_candidate_count) ?? 0;
  const memoryCommittedCount =
    safeNonNegativeNumber(candidatePersistence.memory_committed_count) ?? 0;
  const relationshipCommittedCount =
    safeNonNegativeNumber(candidatePersistence.relationship_committed_count) ?? 0;
  const persistenceErrorCount =
    safeNonNegativeNumber(candidatePersistence.persistence_error_count) ?? 0;
  const boundaryAuditStatus = safeOptionalStatus(boundaryAudit.audit_status);
  const boundaryAuditAvailable =
    boundaryAuditStatus !== null ||
    boundaryAudit.schema === "iris_boundary_audit_v1";
  return {
    schema: "iris_youtube_runtime_state_summary_v1",
    stream_state_available: true,
    state_status: safeOptionalStatus(state.status),
    state_age_ms: safeStateAge(state.updated_at_ms, generatedAtMs),
    latest_payload_kind: latestPayloadKind,
    latest_is_youtube_comment: latestIsComment,
    latest_is_youtube_support: latestIsSupport,
    history_comment_count: history.filter((item) => item?.payload_kind === "comment").length,
    history_support_event_count: supportHistory.length,
    history_support_donation_reaction_count: supportDonationReactionCount,
    history_support_candidate_validated_count: supportCandidateValidatedCount,
    history_support_candidate_persisted_count: supportCandidatePersistedCount,
    donation_reaction_available:
      donationEventStatus !== null || donationReactionStyle !== null,
    donation_event_status: donationEventStatus,
    donation_reaction_style: donationReactionStyle,
    relationship_deepening_available: relationshipDeepeningAvailable,
    relationship_candidate_status: relationshipCandidateStatus,
    candidate_validation_available:
      candidateValidationStatus !== null ||
      approvedMemoryRecordCount > 0 ||
      approvedRelationshipRecordCount > 0 ||
      rejectedCandidateCount > 0,
    candidate_validation_status: candidateValidationStatus,
    approved_memory_record_count: approvedMemoryRecordCount,
    approved_relationship_record_count: approvedRelationshipRecordCount,
    rejected_candidate_count: rejectedCandidateCount,
    candidate_persistence_available:
      memoryCommittedCount > 0 ||
      relationshipCommittedCount > 0 ||
      persistenceErrorCount > 0,
    memory_committed_count: memoryCommittedCount,
    relationship_committed_count: relationshipCommittedCount,
    persistence_error_count: persistenceErrorCount,
    candidate_review_item_count: Array.isArray(state.last_candidate_review_items)
      ? state.last_candidate_review_items.length
      : 0,
    boundary_audit_available: boundaryAuditAvailable,
    boundary_audit_status: boundaryAuditStatus,
    boundary_policy: youtubeRuntimeStateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function emptyYouTubeRuntimeStateSummary() {
  return {
    schema: "iris_youtube_runtime_state_summary_v1",
    stream_state_available: false,
    state_status: null,
    state_age_ms: null,
    latest_payload_kind: null,
    latest_is_youtube_comment: false,
    latest_is_youtube_support: false,
    history_comment_count: 0,
    history_support_event_count: 0,
    history_support_donation_reaction_count: 0,
    history_support_candidate_validated_count: 0,
    history_support_candidate_persisted_count: 0,
    donation_reaction_available: false,
    donation_event_status: null,
    donation_reaction_style: null,
    relationship_deepening_available: false,
    relationship_candidate_status: null,
    candidate_validation_available: false,
    candidate_validation_status: null,
    approved_memory_record_count: 0,
    approved_relationship_record_count: 0,
    rejected_candidate_count: 0,
    candidate_persistence_available: false,
    memory_committed_count: 0,
    relationship_committed_count: 0,
    persistence_error_count: 0,
    candidate_review_item_count: 0,
    boundary_audit_available: false,
    boundary_audit_status: null,
    boundary_policy: youtubeRuntimeStateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function createSupportCandidateFlowSummary({ schedulerSummary, youtubeRuntimeState }) {
  const telemetry = schedulerSummary.youtube_source_telemetry_counts;
  const sourceSupportSeen = telemetry.support_event_count > 0;
  const runtimeSupportSeen =
    youtubeRuntimeState.history_support_event_count > 0 ||
    youtubeRuntimeState.latest_is_youtube_support === true;
  const donationReactionSeen =
    youtubeRuntimeState.history_support_donation_reaction_count > 0 ||
    (youtubeRuntimeState.latest_is_youtube_support === true &&
      youtubeRuntimeState.donation_event_status === "observed" &&
      youtubeRuntimeState.donation_reaction_style !== null &&
      youtubeRuntimeState.donation_reaction_style !== "not_applicable");
  const validationSeen =
    youtubeRuntimeState.history_support_candidate_validated_count > 0 ||
    youtubeRuntimeState.candidate_validation_status !== null;
  const validationStatus = youtubeRuntimeState.candidate_validation_status;
  const validationPassed =
    youtubeRuntimeState.history_support_candidate_validated_count > 0 ||
    (validationStatus === "validated" &&
      (youtubeRuntimeState.approved_memory_record_count > 0 ||
        youtubeRuntimeState.approved_relationship_record_count > 0));
  const persistenceSeen =
    youtubeRuntimeState.memory_committed_count > 0 ||
    youtubeRuntimeState.relationship_committed_count > 0 ||
    youtubeRuntimeState.persistence_error_count > 0;
  const persistenceCommitted =
    youtubeRuntimeState.history_support_candidate_persisted_count > 0 ||
    youtubeRuntimeState.memory_committed_count > 0 ||
    youtubeRuntimeState.relationship_committed_count > 0;
  const persistenceHealthy = youtubeRuntimeState.persistence_error_count === 0;
  const context = {
    sourceSupportSeen,
    runtimeSupportSeen,
    donationReactionSeen,
    validationSeen,
    validationStatus,
    validationPassed,
    persistenceSeen,
    persistenceCommitted,
    persistenceHealthy,
    candidateReviewItemsAvailable: youtubeRuntimeState.candidate_review_item_count > 0,
  };
  const flowStatus = summarizeSupportCandidateFlowStatus(context);
  const blockingStage = summarizeSupportCandidateBlockingStage(context);
  return {
    schema: "iris_youtube_support_candidate_flow_summary_v1",
    flow_status: flowStatus,
    blocking_stage: blockingStage,
    readiness_state:
      blockingStage === "none" ||
      SUPPORT_CANDIDATE_NON_BLOCKING_STATUSES.has(flowStatus)
        ? "ready"
        : readinessStateForBlockingStage(blockingStage),
    next_check_script: checkScriptForSupportCandidateFlow({
      flowStatus,
      blockingStage,
    }),
    source_support_event_seen: sourceSupportSeen,
    runtime_support_event_seen: runtimeSupportSeen,
    donation_reaction_seen: donationReactionSeen,
    source_support_event_type_counts: telemetry.support_event_type_counts,
    source_support_amount_source_counts: telemetry.support_amount_source_counts,
    source_last_support_event_type_counts: telemetry.last_support_event_type_counts,
    source_last_support_amount_source_counts: telemetry.last_support_amount_source_counts,
    candidate_validation_seen: validationSeen,
    candidate_validation_status: validationStatus,
    validation_passed: validationPassed,
    approved_memory_record_count: youtubeRuntimeState.approved_memory_record_count,
    approved_relationship_record_count:
      youtubeRuntimeState.approved_relationship_record_count,
    rejected_candidate_count: youtubeRuntimeState.rejected_candidate_count,
    history_support_candidate_validated_count:
      youtubeRuntimeState.history_support_candidate_validated_count,
    candidate_persistence_seen: persistenceSeen,
    memory_committed_count: youtubeRuntimeState.memory_committed_count,
    relationship_committed_count: youtubeRuntimeState.relationship_committed_count,
    persistence_error_count: youtubeRuntimeState.persistence_error_count,
    history_support_candidate_persisted_count:
      youtubeRuntimeState.history_support_candidate_persisted_count,
    persistence_committed: persistenceCommitted,
    candidate_review_items_available: context.candidateReviewItemsAvailable,
    candidate_review_item_count: youtubeRuntimeState.candidate_review_item_count,
    relationship_candidate_status:
      youtubeRuntimeState.relationship_candidate_status,
    boundary_audit_status: youtubeRuntimeState.boundary_audit_status,
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_platform_ids: true,
      no_raw_stream_state: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
}

function createLiveChatIngestFlowSummary({
  pollFlow,
  youtubeRuntimeState,
  supportCandidateFlow,
}) {
  const sourceCommentSeen = pollFlow.comment_event_count > 0;
  const sourceSupportSeen = pollFlow.support_event_count > 0;
  const runtimeCommentSeen =
    youtubeRuntimeState.history_comment_count > 0 ||
    youtubeRuntimeState.latest_is_youtube_comment === true;
  const runtimeSupportSeen =
    youtubeRuntimeState.history_support_event_count > 0 ||
    youtubeRuntimeState.latest_is_youtube_support === true;
  const runtimeEventSeen = runtimeCommentSeen || runtimeSupportSeen;
  const context = {
    pollFlowStatus: pollFlow.flow_status,
    pollFlowBlockingStage: pollFlow.blocking_stage,
    sourceCommentSeen,
    sourceSupportSeen,
    runtimeEventSeen,
    runtimeCommentSeen,
    runtimeSupportSeen,
  };
  const flowStatus = summarizeLiveChatIngestFlowStatus(context);
  const blockingStage = summarizeLiveChatIngestFlowBlockingStage(context);
  return {
    schema: "iris_youtube_live_chat_ingest_flow_summary_v1",
    flow_status: flowStatus,
    blocking_stage: blockingStage,
    readiness_state: readinessStateForBlockingStage(blockingStage),
    next_check_script: checkScriptForBlockingStage(blockingStage),
    preflight_ready: pollFlow.preflight_ready,
    source_ready: pollFlow.source_ready,
    direct_api_source_active: pollFlow.direct_api_source_active,
    relay_source_active: pollFlow.relay_source_active,
    scheduler_available: pollFlow.scheduler_available,
    scheduler_running: pollFlow.scheduler_running,
    source_polling_active: pollFlow.blocking_stage === "none",
    source_comment_event_seen: sourceCommentSeen,
    source_support_event_seen: sourceSupportSeen,
    runtime_state_available: youtubeRuntimeState.stream_state_available,
    runtime_event_seen: runtimeEventSeen,
    runtime_comment_seen: runtimeCommentSeen,
    runtime_support_event_seen: runtimeSupportSeen,
    runtime_donation_reaction_seen:
      supportCandidateFlow.donation_reaction_seen === true,
    support_candidate_gate_seen:
      supportCandidateFlow.candidate_validation_seen === true,
    support_candidate_gate_status: supportCandidateFlow.flow_status,
    support_candidate_gate_blocking_stage: supportCandidateFlow.blocking_stage,
    comments_enter_reaction_pipeline: runtimeCommentSeen,
    support_events_enter_donation_pipeline:
      runtimeSupportSeen && supportCandidateFlow.donation_reaction_seen === true,
    comment_event_count: pollFlow.comment_event_count,
    support_event_count: pollFlow.support_event_count,
    runtime_history_comment_count: youtubeRuntimeState.history_comment_count,
    runtime_history_support_event_count:
      youtubeRuntimeState.history_support_event_count,
    scheduler_processed_count: pollFlow.scheduler_processed_count,
    scheduler_duplicate_count: pollFlow.scheduler_duplicate_count,
    scheduler_source_error_count: pollFlow.scheduler_source_error_count,
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_support_message_text: true,
      no_platform_ids: true,
      no_platform_cursor_values: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      read_only_runtime_status: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeSupportCandidateFlowStatus(context) {
  if (!context.sourceSupportSeen && !context.runtimeSupportSeen) {
    return "no_support_events_seen";
  }
  if (!context.runtimeSupportSeen) return "waiting_for_runtime_support_event";
  if (!context.donationReactionSeen) return "waiting_for_donation_reaction";
  if (!context.validationSeen) return "waiting_for_candidate_validation";
  if (!context.validationPassed) return "validation_blocked_or_disabled";
  if (!context.persistenceSeen) return "waiting_for_candidate_persistence";
  if (!context.persistenceHealthy) return "persistence_attention";
  if (context.persistenceCommitted) return "validation_gated_persistence_active";
  return "review_only_validation_gated";
}

function summarizeSupportCandidateBlockingStage(context) {
  if (!context.sourceSupportSeen && !context.runtimeSupportSeen) return "source_telemetry";
  if (!context.runtimeSupportSeen) return "runtime_state";
  if (!context.donationReactionSeen) return "donation_reaction";
  if (!context.validationSeen || !context.validationPassed) return "validator";
  if (!context.persistenceSeen || !context.persistenceHealthy) return "persistence";
  return "none";
}

function summarizeLiveChatIngestFlowStatus(context) {
  if (context.pollFlowStatus === "configuration_attention") {
    return "configuration_attention";
  }
  if (context.pollFlowStatus === "source_unavailable") return "source_unavailable";
  if (context.pollFlowStatus === "scheduler_unavailable") {
    return "scheduler_unavailable";
  }
  if (context.pollFlowStatus === "waiting_for_scheduler_start") {
    return "waiting_for_scheduler_start";
  }
  if (context.pollFlowStatus === "polling_cooldown") return "polling_cooldown";
  if (context.pollFlowStatus === "retry_backoff") return "retry_backoff";
  if (context.pollFlowStatus === "operator_action_required") {
    return "operator_action_required";
  }
  if (context.pollFlowStatus === "runtime_attention") return "runtime_attention";
  if (!context.runtimeEventSeen) return "runtime_attention";
  if (context.sourceCommentSeen && !context.runtimeCommentSeen) {
    return "waiting_for_runtime_comment";
  }
  if (context.sourceSupportSeen && !context.runtimeSupportSeen) {
    return "waiting_for_runtime_support_event";
  }
  if (context.runtimeCommentSeen && context.runtimeSupportSeen) {
    return "runtime_active_with_comments_and_support";
  }
  if (context.runtimeSupportSeen) return "runtime_active_with_support";
  if (context.runtimeCommentSeen) return "runtime_active_with_comments";
  return "polling_active_waiting_for_events";
}

function summarizeLiveChatIngestFlowBlockingStage(context) {
  if (context.pollFlowBlockingStage !== "none") return context.pollFlowBlockingStage;
  if (!context.runtimeEventSeen) return "runtime_state";
  if (
    (context.sourceCommentSeen && !context.runtimeCommentSeen) ||
    (context.sourceSupportSeen && !context.runtimeSupportSeen)
  ) {
    return "runtime_state";
  }
  return "none";
}

function summarizePollFlowStatus(context) {
  if (!context.preflightReady) return "configuration_attention";
  if (!context.sourceReady) return "source_unavailable";
  if (context.operatorActionRequired) return "operator_action_required";
  if (context.retryBackoff) return "retry_backoff";
  if (context.pollingCooldown) return "polling_cooldown";
  if (!context.schedulerAvailable) return "scheduler_unavailable";
  if (context.schedulerStatusError || context.schedulerSourceErrorCount > 0) {
    return "runtime_attention";
  }
  if (!context.schedulerRunning) return "waiting_for_scheduler_start";
  if (context.commentEventCount > 0 && context.supportEventCount > 0) {
    return "polling_active_with_comments_and_support";
  }
  if (context.supportEventCount > 0) return "polling_active_with_support";
  if (context.commentEventCount > 0) return "polling_active_with_comments";
  return "polling_active_waiting_for_items";
}

function summarizeApiCursorAuthFlowStatus(context) {
  if (!context.preflightReady) return "configuration_attention";
  if (!context.sourceReady) return "source_unavailable";
  if (context.relaySourceActive) return "relay_source_selected";
  if (!context.directApiSourceActive) return "source_unavailable";
  if (!context.authReady) return "waiting_for_auth";
  if (!context.apiChatTargetConfigured) return "waiting_for_chat_target";
  if (!context.cursorStoreConfigured) return "waiting_for_cursor_store";
  if (context.cursorStoreAttention) return "cursor_store_attention";
  if (context.operatorActionRequired) return "operator_action_required";
  if (context.retryBackoff) return "upstream_retry_backoff";
  if (context.pollingCooldown) return "upstream_polling_cooldown";
  if (
    !context.schedulerAvailable ||
    !context.schedulerRunning ||
    context.schedulerStatusError ||
    context.schedulerSourceErrorCount > 0
  ) {
    return "waiting_for_scheduler_start";
  }
  if (context.apiLiveChatResolutionNeeded) {
    return "waiting_for_live_chat_resolution";
  }
  if (context.commentEventCount > 0 && context.supportEventCount > 0) {
    return "api_polling_with_comments_and_support";
  }
  if (context.supportEventCount > 0) return "api_polling_with_support";
  if (context.commentEventCount > 0) return "api_polling_with_comments";
  return "api_polling_waiting_for_items";
}

function summarizeApiCursorAuthBlockingStage(context) {
  if (!context.preflightReady) return "configuration";
  if (!context.sourceReady) return "source";
  if (context.relaySourceActive) return "none";
  if (!context.directApiSourceActive) return "source";
  if (!context.authReady) return "auth";
  if (!context.apiChatTargetConfigured) return "chat_target";
  if (!context.cursorStoreConfigured || context.cursorStoreAttention) {
    return "cursor_store";
  }
  if (context.operatorActionRequired) return "operator_action";
  if (context.retryBackoff) return "retry_backoff";
  if (context.pollingCooldown) return "upstream_cooldown";
  if (
    !context.schedulerAvailable ||
    !context.schedulerRunning ||
    context.schedulerStatusError ||
    context.schedulerSourceErrorCount > 0
  ) {
    return "scheduler";
  }
  if (context.apiLiveChatResolutionNeeded) return "live_chat_resolution";
  return "none";
}

function isSchedulerOnlyPreflightAttention(preflight) {
  return (
    preflight.preflight_status === "blocked_by_configuration" &&
    Array.isArray(preflight.attention_reasons) &&
    preflight.attention_reasons.length === 1 &&
    preflight.attention_reasons[0] === "scheduler_disabled"
  );
}

function summarizeIngestHygieneFlowStatus(context) {
  if (!context.preflightReady) return "configuration_attention";
  if (!context.sourceReady) return "source_unavailable";
  if (!context.schedulerAvailable) return "scheduler_unavailable";
  if (!context.schedulerHealthy) return "runtime_attention";
  if (!context.schedulerRunning) return "waiting_for_scheduler_start";
  if (context.ignoredOrFilteredCount > 0) {
    return "hygiene_active_with_filtered_items";
  }
  return "hygiene_active_clean";
}

function summarizeIngestHygieneBlockingStage(context) {
  if (!context.preflightReady) return "configuration";
  if (!context.sourceReady) return "source";
  if (!context.schedulerAvailable || !context.schedulerRunning) return "scheduler";
  if (!context.schedulerHealthy) return "runtime_attention";
  return "none";
}

function summarizePollFlowBlockingStage(context) {
  if (!context.preflightReady) return "configuration";
  if (!context.sourceReady) return "source";
  if (context.operatorActionRequired) return "operator_action";
  if (context.retryBackoff) return "retry_backoff";
  if (context.pollingCooldown) return "upstream_cooldown";
  if (
    !context.schedulerAvailable ||
    !context.schedulerRunning ||
    context.schedulerStatusError ||
    context.schedulerSourceErrorCount > 0
  ) {
    return "scheduler";
  }
  return "none";
}

function firstRuntimeCheckScript(flows) {
  for (const flow of flows) {
    if (flow?.next_check_script) return flow.next_check_script;
  }
  return null;
}

function checkScriptForBlockingStage(blockingStage) {
  return RUNTIME_CHECK_SCRIPTS[blockingStage] ?? null;
}

function checkScriptForSupportCandidateFlow({ flowStatus, blockingStage }) {
  if (SUPPORT_CANDIDATE_NON_BLOCKING_STATUSES.has(flowStatus)) return null;
  return checkScriptForBlockingStage(blockingStage);
}

function createSchedulerSummary(httpIngestScheduler) {
  if (!httpIngestScheduler || typeof httpIngestScheduler.status !== "function") {
    return emptySchedulerSummary();
  }
  let status;
  try {
    status = httpIngestScheduler.status();
  } catch {
    return {
      ...emptySchedulerSummary(),
      scheduler_available: true,
      scheduler_status_error: "status_unavailable",
    };
  }
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    return {
      ...emptySchedulerSummary(),
      scheduler_available: true,
      scheduler_status_error: "status_unavailable",
    };
  }
  const sourceKindCounts = countSourceKinds(status.source_statuses);
  const youtubeSourceTelemetryCounts = summarizeYoutubeSourceTelemetryCounts(
    status.source_statuses
  );
  return {
    schema: "iris_youtube_ingest_scheduler_runtime_summary_v1",
    scheduler_available: true,
    scheduler_status_error: null,
    running: status.running === true,
    ticking: status.ticking === true,
    interval_ms: safeNonNegativeNumber(status.interval_ms),
    batch_limit: safeNonNegativeNumber(status.batch_limit),
    continue_on_source_error: status.continue_on_source_error === true,
    source_count: safeNonNegativeNumber(status.source_count),
    youtube_source_count: sourceKindCounts.youtube_source_count,
    source_kind_counts: sourceKindCounts.source_kind_counts,
    youtube_source_telemetry_counts: youtubeSourceTelemetryCounts,
    processed_count: safeNonNegativeNumber(status.processed_count),
    duplicate_count: safeNonNegativeNumber(status.duplicate_count),
    source_error_count: safeNonNegativeNumber(status.source_error_count),
    last_error: safeOptionalStatus(status.last_error),
    priority_sort: safeOptionalStatus(status.priority_sort),
    last_priority_summary: summarizePrioritySummary(
      sourceKindCounts.youtube_source_count > 0
        ? status.last_priority_summary
        : null
    ),
    boundary_policy: schedulerBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function emptySchedulerSummary() {
  return {
    schema: "iris_youtube_ingest_scheduler_runtime_summary_v1",
    scheduler_available: false,
    scheduler_status_error: null,
    running: false,
    ticking: false,
    interval_ms: null,
    batch_limit: null,
    continue_on_source_error: false,
    source_count: 0,
    youtube_source_count: 0,
    source_kind_counts: {
      youtube_live_chat_api_source: 0,
      http_youtube_live_chat_source: 0,
      other_source: 0,
    },
    youtube_source_telemetry_counts: emptyYoutubeSourceTelemetryCounts(),
    processed_count: 0,
    duplicate_count: 0,
    source_error_count: 0,
    last_error: null,
    priority_sort: null,
    last_priority_summary: summarizePrioritySummary(null),
    boundary_policy: schedulerBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeYoutubeSourceTelemetryCounts(sourceStatuses) {
  const totals = emptyYoutubeSourceTelemetryCounts();
  for (const item of Array.isArray(sourceStatuses) ? sourceStatuses : []) {
    const kind = item?.source_kind;
    if (
      kind !== "youtube_live_chat_api_source" &&
      kind !== "http_youtube_live_chat_source"
    ) {
      continue;
    }
    totals.request_count += requiredYoutubeSourceTelemetryCount(item, "request_count");
    totals.video_discovery_request_count +=
      requiredYoutubeSourceTelemetryCount(item, "video_discovery_request_count");
    totals.live_chat_request_count +=
      requiredYoutubeSourceTelemetryCount(item, "live_chat_request_count");
    totals.last_item_count += requiredYoutubeSourceTelemetryCount(
      item,
      "last_item_count"
    );
    totals.last_ignored_count += requiredYoutubeSourceTelemetryCount(
      item,
      "last_ignored_count"
    );
    totals.last_duplicate_count += requiredYoutubeSourceTelemetryCount(
      item,
      "last_duplicate_count"
    );
    totals.last_moderation_filtered_count +=
      requiredYoutubeSourceTelemetryCount(item, "last_moderation_filtered_count");
    totals.last_comment_count += requiredYoutubeSourceTelemetryCount(
      item,
      "last_comment_count"
    );
    totals.last_support_event_count +=
      requiredYoutubeSourceTelemetryCount(item, "last_support_event_count");
    totals.ignored_event_count += safeNonNegativeNumber(item?.ignored_event_count) ?? 0;
    totals.duplicate_item_count += safeNonNegativeNumber(item?.duplicate_item_count) ?? 0;
    totals.moderation_filtered_count +=
      safeNonNegativeNumber(item?.moderation_filtered_count) ?? 0;
    totals.comment_event_count += requiredYoutubeSourceTelemetryCount(
      item,
      "comment_event_count"
    );
    totals.support_event_count += requiredYoutubeSourceTelemetryCount(
      item,
      "support_event_count"
    );
    mergeCountMap(
      totals.last_support_event_type_counts,
      item?.last_support_event_type_counts,
      SUPPORT_EVENT_TYPES
    );
    mergeCountMap(
      totals.support_event_type_counts,
      item?.support_event_type_counts,
      SUPPORT_EVENT_TYPES
    );
    mergeCountMap(
      totals.last_support_amount_source_counts,
      item?.last_support_amount_source_counts,
      SUPPORT_AMOUNT_SOURCE_KINDS
    );
    mergeCountMap(
      totals.support_amount_source_counts,
      item?.support_amount_source_counts,
      SUPPORT_AMOUNT_SOURCE_KINDS
    );
  }
  return totals;
}

function requiredYoutubeSourceTelemetryCount(sourceStatus, field) {
  const count = safeNonNegativeNumber(sourceStatus?.[field]);
  if (count === null) {
    throw new ContractError(
      `youtube ingest runtime source telemetry: ${field} is required`
    );
  }
  return count;
}

function emptyYoutubeSourceTelemetryCounts() {
  return {
    schema: "iris_youtube_ingest_scheduler_source_telemetry_counts_v1",
    request_count: 0,
    video_discovery_request_count: 0,
    live_chat_request_count: 0,
    last_item_count: 0,
    last_ignored_count: 0,
    last_duplicate_count: 0,
    last_moderation_filtered_count: 0,
    last_comment_count: 0,
    last_support_event_count: 0,
    ignored_event_count: 0,
    duplicate_item_count: 0,
    moderation_filtered_count: 0,
    comment_event_count: 0,
    support_event_count: 0,
    last_support_event_type_counts: emptyCountMap(SUPPORT_EVENT_TYPES),
    support_event_type_counts: emptyCountMap(SUPPORT_EVENT_TYPES),
    last_support_amount_source_counts: emptyCountMap(SUPPORT_AMOUNT_SOURCE_KINDS),
    support_amount_source_counts: emptyCountMap(SUPPORT_AMOUNT_SOURCE_KINDS),
  };
}

function countSourceKinds(sourceStatuses) {
  const sourceKindCounts = {
    youtube_live_chat_api_source: 0,
    http_youtube_live_chat_source: 0,
    other_source: 0,
  };
  for (const item of Array.isArray(sourceStatuses) ? sourceStatuses : []) {
    const kind = item?.source_kind;
    if (kind === "youtube_live_chat_api_source") {
      sourceKindCounts.youtube_live_chat_api_source += 1;
    } else if (kind === "http_youtube_live_chat_source") {
      sourceKindCounts.http_youtube_live_chat_source += 1;
    } else {
      sourceKindCounts.other_source += 1;
    }
  }
  return {
    source_kind_counts: sourceKindCounts,
    youtube_source_count:
      sourceKindCounts.youtube_live_chat_api_source +
      sourceKindCounts.http_youtube_live_chat_source,
  };
}

function summarizePrioritySummary(summary) {
  const sourceAvailable =
    summary && typeof summary === "object" && !Array.isArray(summary);
  const source = sourceAvailable ? summary : {};
  const byBand = source.by_band && typeof source.by_band === "object"
    ? source.by_band
    : {};
  return {
    batch_count: requiredPrioritySummaryCount(sourceAvailable, source, "batch_count"),
    top_priority: safeNonNegativeNumber(source.top_priority),
    processed_count: requiredPrioritySummaryCount(
      sourceAvailable,
      source,
      "processed_count"
    ),
    duplicate_count: requiredPrioritySummaryCount(
      sourceAvailable,
      source,
      "duplicate_count"
    ),
    source_error_count: requiredPrioritySummaryCount(
      sourceAvailable,
      source,
      "source_error_count"
    ),
    by_band: {
      urgent: requiredPriorityBandCount(sourceAvailable, byBand, "urgent"),
      high: requiredPriorityBandCount(sourceAvailable, byBand, "high"),
      contextual: requiredPriorityBandCount(sourceAvailable, byBand, "contextual"),
      normal: requiredPriorityBandCount(sourceAvailable, byBand, "normal"),
      idle: requiredPriorityBandCount(sourceAvailable, byBand, "idle"),
    },
  };
}

function requiredPrioritySummaryCount(sourceAvailable, source, field) {
  if (!sourceAvailable) return 0;
  const count = safeNonNegativeNumber(source[field]);
  if (count === null) {
    throw new ContractError(
      `youtube ingest runtime priority summary: ${field} is required`
    );
  }
  return count;
}

function requiredPriorityBandCount(sourceAvailable, byBand, field) {
  if (!sourceAvailable) return 0;
  const count = safeNonNegativeNumber(byBand?.[field]);
  if (count === null) {
    throw new ContractError(
      `youtube ingest runtime priority band summary: ${field} is required`
    );
  }
  return count;
}

function assertSchedulerSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: scheduler summary is required`);
  }
  if (summary.schema !== "iris_youtube_ingest_scheduler_runtime_summary_v1") {
    throw new ContractError(`${context}: invalid scheduler summary schema`);
  }
  for (const field of [
    "scheduler_available",
    "running",
    "ticking",
    "continue_on_source_error",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid scheduler ${field}`);
    }
  }
  if (
    summary.scheduler_status_error !== null &&
    summary.scheduler_status_error !== "status_unavailable"
  ) {
    throw new ContractError(`${context}: invalid scheduler status error`);
  }
  for (const field of [
    "interval_ms",
    "batch_limit",
    "source_count",
    "youtube_source_count",
    "processed_count",
    "duplicate_count",
    "source_error_count",
  ]) {
    if (summary[field] !== null) {
      assertNonNegativeInteger(summary[field], `${context}: invalid scheduler ${field}`);
    }
  }
  assertSourceKindCountsSafe(summary.source_kind_counts, context);
  assertYoutubeSourceTelemetryCountsSafe(
    summary.youtube_source_telemetry_counts,
    context
  );
  for (const field of ["last_error", "priority_sort"]) {
    if (summary[field] !== null && typeof summary[field] !== "string") {
      throw new ContractError(`${context}: invalid scheduler ${field}`);
    }
  }
  assertPrioritySummarySafe(summary.last_priority_summary, context);
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "counts_only",
      "no_source_names",
      "no_raw_payloads",
      "no_text_payloads",
      "no_support_message_text",
      "no_candidates",
      "no_commands",
      "no_endpoint_values",
      "no_secret_values",
    ],
    `${context}: scheduler boundary`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: scheduler adapter validation required`);
  }
}

function assertYoutubeSourceTelemetryCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: youtube source telemetry counts required`);
  }
  if (
    counts.schema !== "iris_youtube_ingest_scheduler_source_telemetry_counts_v1"
  ) {
    throw new ContractError(`${context}: invalid youtube source telemetry schema`);
  }
  for (const field of [
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
  ]) {
    assertNonNegativeInteger(
      counts[field],
      `${context}: invalid youtube source telemetry ${field}`
    );
  }
  assertCountMapSafe(
    counts.last_support_event_type_counts,
    SUPPORT_EVENT_TYPES,
    `${context}: last support event type counts`
  );
  assertCountMapSafe(
    counts.support_event_type_counts,
    SUPPORT_EVENT_TYPES,
    `${context}: support event type counts`
  );
  assertCountMapSafe(
    counts.last_support_amount_source_counts,
    SUPPORT_AMOUNT_SOURCE_KINDS,
    `${context}: last support amount source counts`
  );
  assertCountMapSafe(
    counts.support_amount_source_counts,
    SUPPORT_AMOUNT_SOURCE_KINDS,
    `${context}: support amount source counts`
  );
}

function emptyCountMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function mergeCountMap(target, source, keys) {
  if (!target || typeof target !== "object") return;
  const sourceMap = source && typeof source === "object" && !Array.isArray(source)
    ? source
    : {};
  for (const key of keys) {
    target[key] = (target[key] ?? 0) + (safeNonNegativeNumber(sourceMap[key]) ?? 0);
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

function countReadinessStates(items) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const item of items) {
    const state = item.readiness_state;
    if (READINESS_STATES.has(state)) counts[state] += 1;
  }
  return counts;
}

function firstReadinessState(items) {
  for (const item of items) {
    const state = item.readiness_state;
    if (READINESS_STATES.has(state) && state !== "ready") return state;
  }
  return "ready";
}

function readinessStateForBlockingStage(blockingStage) {
  switch (blockingStage) {
    case "none":
      return "ready";
    case "configuration":
    case "source":
    case "chat_target":
    case "cursor_store":
    case "auth":
      return "configuration_waiting";
    case "scheduler":
      return "runtime_waiting";
    case "live_chat_resolution":
      return "runtime_waiting";
    case "upstream_cooldown":
    case "retry_backoff":
    case "runtime_attention":
    case "runtime_state":
    case "source_telemetry":
    case "donation_reaction":
    case "validator":
    case "persistence":
      return "runtime_waiting";
    case "operator_action":
      return "operator_review_required";
    default:
      return "runtime_waiting";
  }
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: counts required`);
  }
  for (const state of READINESS_STATES) {
    assertNonNegativeInteger(counts[state], `${context}: invalid ${state}`);
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: unexpected state ${key}`);
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

function assertSourceKindCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: source kind counts required`);
  }
  for (const field of [
    "youtube_live_chat_api_source",
    "http_youtube_live_chat_source",
    "other_source",
  ]) {
    assertNonNegativeInteger(counts[field], `${context}: invalid ${field} count`);
  }
}

function assertPrioritySummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: priority summary required`);
  }
  for (const field of [
    "batch_count",
    "top_priority",
    "processed_count",
    "duplicate_count",
    "source_error_count",
  ]) {
    if (summary[field] !== null) {
      assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
    }
  }
  const byBand = summary.by_band;
  if (!byBand || typeof byBand !== "object" || Array.isArray(byBand)) {
    throw new ContractError(`${context}: priority band counts required`);
  }
  for (const field of ["urgent", "high", "contextual", "normal", "idle"]) {
    assertNonNegativeInteger(byBand[field], `${context}: invalid ${field} band count`);
  }
}

function assertPollFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: poll flow summary is required`);
  }
  if (summary.schema !== "iris_youtube_ingest_poll_flow_summary_v1") {
    throw new ContractError(`${context}: invalid poll flow schema`);
  }
  if (!POLL_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid poll flow status`);
  }
  if (!POLL_FLOW_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid poll flow blocking stage`);
  }
  if (!READINESS_STATES.has(summary.readiness_state)) {
    throw new ContractError(`${context}: invalid poll flow readiness state`);
  }
  if (summary.readiness_state !== readinessStateForBlockingStage(summary.blocking_stage)) {
    throw new ContractError(`${context}: poll flow readiness mismatch`);
  }
  assertNextCheckScriptMatchesBlockingStage(summary, context, "poll flow");
  for (const field of [
    "preflight_ready",
    "source_ready",
    "direct_api_source_active",
    "relay_source_active",
    "cursor_store_configured",
    "cursor_store_write_attention",
    "scheduler_available",
    "scheduler_running",
    "support_events_ready_for_donation_pipeline",
    "operator_action_required",
    "retry_backoff_active",
    "polling_cooldown_active",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid poll flow ${field}`);
    }
  }
  if (typeof summary.auth_mode !== "string" || !/^[a-zA-Z0-9_:-]+$/.test(summary.auth_mode)) {
    throw new ContractError(`${context}: invalid poll flow auth mode`);
  }
  for (const field of [
    "youtube_source_count",
    "scheduler_processed_count",
    "scheduler_duplicate_count",
    "scheduler_source_error_count",
    "request_count",
    "live_chat_request_count",
    "last_item_count",
    "last_comment_count",
    "last_support_event_count",
    "comment_event_count",
    "support_event_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid poll flow ${field}`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "counts_statuses_and_booleans_only",
      "no_source_names",
      "no_platform_ids",
      "no_platform_cursor_values",
      "no_live_payloads",
      "no_support_message_text",
      "no_candidates",
      "no_commands",
      "no_endpoint_values",
      "no_secret_values",
      "script_names_only",
    ],
    `${context}: poll flow`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: poll flow adapter validation required`);
  }
}

function assertIngestHygieneFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: ingest hygiene flow summary is required`);
  }
  if (summary.schema !== "iris_youtube_ingest_hygiene_flow_summary_v1") {
    throw new ContractError(`${context}: invalid ingest hygiene flow schema`);
  }
  if (!INGEST_HYGIENE_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid ingest hygiene flow status`);
  }
  if (!INGEST_HYGIENE_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid ingest hygiene blocking stage`);
  }
  if (!READINESS_STATES.has(summary.readiness_state)) {
    throw new ContractError(`${context}: invalid ingest hygiene readiness state`);
  }
  if (summary.readiness_state !== readinessStateForBlockingStage(summary.blocking_stage)) {
    throw new ContractError(`${context}: ingest hygiene readiness mismatch`);
  }
  assertNextCheckScriptMatchesBlockingStage(
    summary,
    context,
    "ingest hygiene flow"
  );
  for (const field of [
    "preflight_ready",
    "source_ready",
    "direct_api_source_active",
    "relay_source_active",
    "moderation_filter_configured",
    "scheduler_available",
    "scheduler_running",
    "scheduler_healthy",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ingest hygiene ${field}`);
    }
  }
  for (const field of [
    "scheduler_processed_count",
    "scheduler_duplicate_count",
    "scheduler_source_error_count",
    "request_count",
    "last_item_count",
    "last_ignored_count",
    "last_duplicate_count",
    "last_moderation_filtered_count",
    "ignored_event_count",
    "duplicate_item_count",
    "moderation_filtered_count",
    "comment_event_count",
    "support_event_count",
    "filtered_or_duplicate_item_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid ingest hygiene ${field}`
    );
  }
  assertCountMapSafe(
    summary.support_event_type_counts,
    SUPPORT_EVENT_TYPES,
    `${context}: invalid ingest hygiene support type counts`
  );
  assertCountMapSafe(
    summary.support_amount_source_counts,
    SUPPORT_AMOUNT_SOURCE_KINDS,
    `${context}: invalid ingest hygiene support amount counts`
  );
  for (const field of [
    "duplicate_platform_items_do_not_double_trigger",
    "moderation_filter_runs_before_runtime",
    "ignored_items_do_not_enter_reaction_pipeline",
    "support_events_keep_type_counts_without_messages",
    "scheduler_duplicate_counts_are_summary_only",
  ]) {
    if (summary.hygiene_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid ingest hygiene policy`);
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "counts_statuses_and_booleans_only",
      "no_source_names",
      "no_platform_ids",
      "no_platform_cursor_values",
      "no_live_payloads",
      "no_text_payloads",
      "no_support_message_text",
      "no_candidates",
      "no_commands",
      "no_endpoint_values",
      "no_secret_values",
      "script_names_only",
    ],
    `${context}: ingest hygiene boundary`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: ingest hygiene adapter validation required`);
  }
}

function assertApiCursorAuthFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: API cursor/auth flow summary is required`);
  }
  if (summary.schema !== "iris_youtube_api_cursor_auth_flow_summary_v1") {
    throw new ContractError(`${context}: invalid API cursor/auth flow schema`);
  }
  if (!API_CURSOR_AUTH_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid API cursor/auth flow status`);
  }
  if (!API_CURSOR_AUTH_FLOW_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid API cursor/auth blocking stage`);
  }
  if (!READINESS_STATES.has(summary.readiness_state)) {
    throw new ContractError(`${context}: invalid API cursor/auth readiness state`);
  }
  if (summary.readiness_state !== readinessStateForBlockingStage(summary.blocking_stage)) {
    throw new ContractError(`${context}: API cursor/auth readiness mismatch`);
  }
  assertNextCheckScriptMatchesBlockingStage(
    summary,
    context,
    "API cursor/auth flow"
  );
  if (!API_CURSOR_AUTH_MODES.has(summary.auth_mode)) {
    throw new ContractError(`${context}: invalid API cursor/auth mode`);
  }
  if (!API_CURSOR_STORE_HEALTH_STATUSES.has(summary.cursor_store_health)) {
    throw new ContractError(`${context}: invalid API cursor store health`);
  }
  for (const field of [
    "preflight_ready",
    "source_ready",
    "direct_api_source_active",
    "relay_source_active",
    "auth_ready",
    "api_chat_target_configured",
    "api_direct_chat_target_configured",
    "api_video_target_configured",
    "api_live_chat_resolved",
    "api_live_chat_resolution_needed",
    "cursor_store_configured",
    "cursor_store_status_available",
    "saved_cursor_available",
    "cursor_store_read_attention",
    "cursor_store_write_attention",
    "cursor_store_attention",
    "scheduler_available",
    "scheduler_running",
    "operator_action_required",
    "retry_backoff_active",
    "polling_cooldown_active",
    "source_last_error_seen",
    "source_recovery_hint_seen",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid API cursor/auth ${field}`);
    }
  }
  for (const field of [
    "request_count",
    "video_discovery_request_count",
    "live_chat_request_count",
    "last_comment_count",
    "last_support_event_count",
    "comment_event_count",
    "support_event_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid API cursor/auth ${field}`
    );
  }
  for (const field of [
    "direct_api_uses_live_chat_or_video_target",
    "cursor_store_required_for_restart_resume",
    "relay_source_bypasses_direct_api_cursor",
    "scheduler_tick_required_for_polling",
  ]) {
    if (summary.source_access_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid API cursor/auth policy ${field}`);
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "counts_statuses_and_booleans_only",
      "no_live_chat_id",
      "no_video_id",
      "no_platform_cursor_values",
      "no_cursor_store_path",
      "no_endpoint_values",
      "no_secret_values",
      "no_live_payloads",
      "no_text_payloads",
      "no_support_message_text",
      "no_candidates",
      "no_commands",
      "read_only_runtime_status",
      "script_names_only",
    ],
    `${context}: API cursor/auth boundary`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: API cursor/auth adapter validation required`);
  }
}

function assertYouTubeRuntimeStateSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: youtube runtime state summary is required`);
  }
  if (summary.schema !== "iris_youtube_runtime_state_summary_v1") {
    throw new ContractError(`${context}: invalid youtube runtime state schema`);
  }
  for (const field of [
    "stream_state_available",
    "latest_is_youtube_comment",
    "latest_is_youtube_support",
    "donation_reaction_available",
    "relationship_deepening_available",
    "candidate_validation_available",
    "candidate_persistence_available",
    "boundary_audit_available",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid youtube runtime state ${field}`);
    }
  }
  for (const field of [
    "state_status",
    "latest_payload_kind",
    "donation_event_status",
    "donation_reaction_style",
    "relationship_candidate_status",
    "candidate_validation_status",
    "boundary_audit_status",
  ]) {
    assertSafeOptionalStatus(
      summary[field],
      `${context}: invalid youtube runtime state ${field}`
    );
  }
  for (const field of [
    "state_age_ms",
    "history_comment_count",
    "history_support_event_count",
    "history_support_donation_reaction_count",
    "history_support_candidate_validated_count",
    "history_support_candidate_persisted_count",
    "approved_memory_record_count",
    "approved_relationship_record_count",
    "rejected_candidate_count",
    "memory_committed_count",
    "relationship_committed_count",
    "persistence_error_count",
    "candidate_review_item_count",
  ]) {
    if (summary[field] !== null) {
      assertNonNegativeInteger(
        summary[field],
        `${context}: invalid youtube runtime state ${field}`
      );
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "counts_statuses_and_booleans_only",
      "no_raw_stream_state",
      "no_live_payloads",
      "no_text_payloads",
      "no_support_message_text",
      "no_platform_ids",
      "no_platform_cursor_values",
      "no_candidates",
      "no_commands",
      "no_endpoint_values",
      "no_secret_values",
    ],
    `${context}: youtube runtime state boundary`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: youtube runtime state adapter validation required`);
  }
}

function assertSupportCandidateFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: support candidate flow summary is required`);
  }
  if (summary.schema !== "iris_youtube_support_candidate_flow_summary_v1") {
    throw new ContractError(`${context}: invalid support candidate flow schema`);
  }
  if (!SUPPORT_CANDIDATE_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid support candidate flow status`);
  }
  if (!SUPPORT_CANDIDATE_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid support candidate blocking stage`);
  }
  if (!READINESS_STATES.has(summary.readiness_state)) {
    throw new ContractError(`${context}: invalid support candidate readiness state`);
  }
  if (
    summary.readiness_state !==
    (summary.blocking_stage === "none" ||
    SUPPORT_CANDIDATE_NON_BLOCKING_STATUSES.has(summary.flow_status)
      ? "ready"
      : readinessStateForBlockingStage(summary.blocking_stage))
  ) {
    throw new ContractError(`${context}: support candidate readiness mismatch`);
  }
  assertSupportCandidateNextCheckScriptMatches(summary, context);
  for (const field of [
    "source_support_event_seen",
    "runtime_support_event_seen",
    "donation_reaction_seen",
    "candidate_validation_seen",
    "validation_passed",
    "candidate_persistence_seen",
    "persistence_committed",
    "candidate_review_items_available",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid support candidate flow ${field}`);
    }
  }
  for (const field of [
    "candidate_validation_status",
    "relationship_candidate_status",
    "boundary_audit_status",
  ]) {
    assertSafeOptionalStatus(
      summary[field],
      `${context}: invalid support candidate flow ${field}`
    );
  }
  assertCountMapSafe(
    summary.source_support_event_type_counts,
    SUPPORT_EVENT_TYPES,
    `${context}: support candidate source support event type counts`
  );
  assertCountMapSafe(
    summary.source_support_amount_source_counts,
    SUPPORT_AMOUNT_SOURCE_KINDS,
    `${context}: support candidate source support amount source counts`
  );
  assertCountMapSafe(
    summary.source_last_support_event_type_counts,
    SUPPORT_EVENT_TYPES,
    `${context}: support candidate last support event type counts`
  );
  assertCountMapSafe(
    summary.source_last_support_amount_source_counts,
    SUPPORT_AMOUNT_SOURCE_KINDS,
    `${context}: support candidate last support amount source counts`
  );
  for (const field of [
    "approved_memory_record_count",
    "approved_relationship_record_count",
    "rejected_candidate_count",
    "history_support_candidate_validated_count",
    "memory_committed_count",
    "relationship_committed_count",
    "persistence_error_count",
    "history_support_candidate_persisted_count",
    "candidate_review_item_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid support candidate flow ${field}`
    );
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "counts_statuses_and_booleans_only",
      "no_live_payloads",
      "no_support_message_text",
      "no_platform_ids",
      "no_raw_stream_state",
      "no_candidates",
      "no_commands",
      "no_endpoint_values",
      "no_secret_values",
      "script_names_only",
    ],
    `${context}: support candidate flow`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: support candidate flow adapter validation required`);
  }
}

function assertLiveChatIngestFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: live chat ingest flow summary is required`);
  }
  if (summary.schema !== "iris_youtube_live_chat_ingest_flow_summary_v1") {
    throw new ContractError(`${context}: invalid live chat ingest flow schema`);
  }
  if (!LIVE_CHAT_INGEST_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid live chat ingest flow status`);
  }
  if (!LIVE_CHAT_INGEST_FLOW_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid live chat ingest blocking stage`);
  }
  if (!READINESS_STATES.has(summary.readiness_state)) {
    throw new ContractError(`${context}: invalid live chat ingest readiness state`);
  }
  if (summary.readiness_state !== readinessStateForBlockingStage(summary.blocking_stage)) {
    throw new ContractError(`${context}: live chat ingest readiness mismatch`);
  }
  assertNextCheckScriptMatchesBlockingStage(
    summary,
    context,
    "live chat ingest flow"
  );
  for (const field of [
    "preflight_ready",
    "source_ready",
    "direct_api_source_active",
    "relay_source_active",
    "scheduler_available",
    "scheduler_running",
    "source_polling_active",
    "source_comment_event_seen",
    "source_support_event_seen",
    "runtime_state_available",
    "runtime_event_seen",
    "runtime_comment_seen",
    "runtime_support_event_seen",
    "runtime_donation_reaction_seen",
    "support_candidate_gate_seen",
    "comments_enter_reaction_pipeline",
    "support_events_enter_donation_pipeline",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid live chat ingest ${field}`);
    }
  }
  if (!SUPPORT_CANDIDATE_FLOW_STATUSES.has(summary.support_candidate_gate_status)) {
    throw new ContractError(`${context}: invalid live chat support gate status`);
  }
  if (
    !SUPPORT_CANDIDATE_BLOCKING_STAGES.has(
      summary.support_candidate_gate_blocking_stage
    )
  ) {
    throw new ContractError(`${context}: invalid live chat support gate stage`);
  }
  for (const field of [
    "comment_event_count",
    "support_event_count",
    "runtime_history_comment_count",
    "runtime_history_support_event_count",
    "scheduler_processed_count",
    "scheduler_duplicate_count",
    "scheduler_source_error_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid live chat ingest ${field}`
    );
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "counts_statuses_and_booleans_only",
      "no_live_payloads",
      "no_text_payloads",
      "no_support_message_text",
      "no_platform_ids",
      "no_platform_cursor_values",
      "no_candidates",
      "no_commands",
      "no_endpoint_values",
      "no_secret_values",
      "read_only_runtime_status",
      "script_names_only",
    ],
    `${context}: live chat ingest`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: live chat ingest adapter validation required`);
  }
}

function assertSupportEventPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: support event policy is required`);
  }
  for (const field of [
    "comment_events_enter_reaction_pipeline",
    "support_events_enter_donation_pipeline",
    "support_events_not_counted_as_comments",
    "relationship_and_memory_candidates_validation_gated",
    "runtime_status_reports_candidate_gate_summary",
    "live_chat_ingest_flow_reports_comment_and_support_handoff",
    "source_events_deduped_and_moderated_before_runtime",
    "support_messages_not_exposed_in_status",
    "scheduler_runtime_status_counts_only",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid support event policy`);
    }
  }
}

function assertNextCheckScriptMatchesBlockingStage(summary, context, label) {
  const expected = checkScriptForBlockingStage(summary.blocking_stage);
  if (summary.next_check_script !== expected) {
    throw new ContractError(`${context}: invalid ${label} next check script`);
  }
  assertSafeOptionalScriptName(
    summary.next_check_script,
    `${context}: ${label} next check script`
  );
}

function assertSupportCandidateNextCheckScriptMatches(summary, context) {
  const expected = checkScriptForSupportCandidateFlow({
    flowStatus: summary.flow_status,
    blockingStage: summary.blocking_stage,
  });
  if (summary.next_check_script !== expected) {
    throw new ContractError(`${context}: invalid support candidate next check script`);
  }
  assertSafeOptionalScriptName(
    summary.next_check_script,
    `${context}: support candidate next check script`
  );
}

function assertSafeOptionalScriptName(script, context) {
  if (script === null) return;
  assertSafeScriptName(script, context);
}

function assertSafeScriptName(script, context) {
  if (
    typeof script !== "string" ||
    !/^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      script
    )
  ) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function schedulerBoundaryPolicy() {
  return {
    counts_only: true,
    no_source_names: true,
    no_raw_payloads: true,
    no_text_payloads: true,
    no_support_message_text: true,
    no_candidates: true,
    no_commands: true,
    no_endpoint_values: true,
    no_secret_values: true,
  };
}

function youtubeRuntimeStateBoundaryPolicy() {
  return {
    counts_statuses_and_booleans_only: true,
    no_raw_stream_state: true,
    no_live_payloads: true,
    no_text_payloads: true,
    no_support_message_text: true,
    no_platform_ids: true,
    no_platform_cursor_values: true,
    no_candidates: true,
    no_commands: true,
    no_endpoint_values: true,
    no_secret_values: true,
  };
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

function readStreamState(streamState) {
  if (!streamState || typeof streamState.get !== "function") return null;
  try {
    const state = streamState.get();
    return state && typeof state === "object" && !Array.isArray(state) ? state : null;
  } catch {
    return null;
  }
}

function safeStateAge(updatedAtMs, generatedAtMs) {
  const updated = Number(updatedAtMs);
  const generated = Number(generatedAtMs);
  if (!Number.isFinite(updated) || !Number.isFinite(generated)) return null;
  return Math.max(0, Math.trunc(generated - updated));
}

function safeOptionalStatus(value) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).replace(/\s+/g, "_").trim().slice(0, 80);
  if (SAFE_OPTIONAL_STATUS_ALLOWLIST.has(text)) return text;
  if (
    !/^[a-zA-Z0-9_:-]+$/.test(text) ||
    URL_PATTERN.test(text) ||
    UNSAFE_STATUS_PATTERN.test(text)
  ) {
    return "attention";
  }
  return text;
}

function safeApiCursorAuthMode(value) {
  const text = String(value ?? "unknown");
  return API_CURSOR_AUTH_MODES.has(text) ? text : "unknown";
}

function safeCursorStoreHealth(value) {
  const text = String(value ?? "unknown");
  return API_CURSOR_STORE_HEALTH_STATUSES.has(text) ? text : "unknown";
}

function assertSafeOptionalStatus(value, context) {
  if (value === null) return;
  if (typeof value !== "string" || value.length === 0 || value.length > 80) {
    throw new ContractError(context);
  }
  if (SAFE_OPTIONAL_STATUS_ALLOWLIST.has(value)) return;
  if (!/^[a-zA-Z0-9_:-]+$/.test(value) || UNSAFE_STATUS_PATTERN.test(value)) {
    throw new ContractError(context);
  }
}

function safeNonNegativeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.trunc(number);
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function assertNoForbiddenYouTubeRuntimeStatusFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenYouTubeRuntimeStatusFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const field of Object.keys(value)) {
    if (FORBIDDEN_YOUTUBE_RUNTIME_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { path, field });
    }
    assertNoForbiddenYouTubeRuntimeStatusFields(value[field], context, `${path}.${field}`);
  }
}
