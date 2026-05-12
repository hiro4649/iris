import { ContractError } from "../src/core/contracts.js";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createHttpIngestScheduler } from "../src/runtime/httpIngestScheduler.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createStreamState } from "../src/runtime/streamState.js";
import { createYouTubeIngestPreflightReport } from "../src/services/dev/youtubeIngestPreflight.js";
import {
  assertYouTubeIngestRuntimeStatusReportSafe,
  createYouTubeIngestRuntimeStatusReport,
} from "../src/services/dev/youtubeIngestRuntimeStatus.js";
import {
  assertYouTubeIngestLiveReadinessReportSafe,
  createYouTubeIngestLiveReadinessReport,
} from "../src/services/dev/youtubeIngestLiveReadiness.js";

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

const YOUTUBE_INGEST_ONCE_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "ingest_attempted",
  "poll_status",
  "preflight_summary",
  "runtime_status_summary",
  "support_candidate_flow_summary",
  "live_readiness_summary",
  "tick_summary",
  "public_state_summary",
  "production_handoff_summary",
  "boundary_policy",
]);
const YOUTUBE_INGEST_ONCE_CLI_BOUNDARY_FIELDS = [
  "uses_youtube_only_scheduler_source",
  "preflight_required_before_poll",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_support_message_text",
  "no_platform_ids",
  "no_platform_cursor_values",
  "no_candidates",
  "no_commands",
  "no_raw_scheduler_results",
  "live_readiness_summary_included",
  "counts_only_operator_report",
  "script_names_only",
  "production_handoff_summary_counts_only",
];

const env = {
  ...process.env,
  IRIS_GAME_CONTROL_ADAPTER: "mock",
  IRIS_GAME_CONTROL_ENDPOINT: "",
  IRIS_GAME_OBSERVATION_ENDPOINT: "",
  IRIS_MEMORY_SEARCH_ADAPTER: "local",
  IRIS_MEMORY_SEARCH_ENDPOINT: "",
  IRIS_MEDIA_WATCH_ENDPOINT: "",
  IRIS_EXTERNAL_TOPIC_ENDPOINT: "",
};
const preflight = createYouTubeIngestPreflightReport({ env });

if (preflight.preflight_status !== "ready_to_poll_youtube_ingest") {
  const runtimeStatus = createYouTubeIngestRuntimeStatusReport({ env });
  const liveReadiness = createYouTubeIngestLiveReadinessReport({ env });
  assertYouTubeIngestLiveReadinessReportSafe(
    liveReadiness,
    "youtube ingest once live readiness"
  );
  const report = {
    ok: true,
    schema: "iris_youtube_ingest_once_cli_v1",
    ingest_attempted: false,
    poll_status: "blocked_by_preflight",
    preflight_summary: {
      preflight_status: preflight.preflight_status,
      source_mode: preflight.source_mode,
      attention_reasons: preflight.attention_reasons,
      attention_reason_count: preflight.attention_reason_count,
      next_attention_reason: preflight.next_attention_reason,
      missing_required_env: preflight.missing_required_env,
    },
    runtime_status_summary: summarizeRuntimeStatus(runtimeStatus),
    support_candidate_flow_summary: summarizeSupportCandidateFlow(
      runtimeStatus.support_candidate_flow
    ),
    live_readiness_summary: summarizeLiveReadiness(liveReadiness),
    tick_summary: emptyTickSummary(),
    production_handoff_summary: createProductionHandoffSummary({
      ingestAttempted: false,
      pollStatus: "blocked_by_preflight",
      preflightStatus: preflight.preflight_status,
      sourceMode: preflight.source_mode,
      runtimeStatus,
      liveReadiness,
      tickSummary: emptyTickSummary(),
    }),
    boundary_policy: youtubeIngestOnceBoundaryPolicy(),
  };
  assertSafeReport(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

let scheduler = null;
try {
  const adapters = createRuntimeAdaptersFromEnv(env);
  if (!adapters.liveChatSource) {
    throw new ContractError("youtube ingest once source unavailable");
  }
  const runtime = createIrisRuntime({
    runtimeConfig: createRuntimeConfig(env),
    ...adapters,
  });
  const streamState = createStreamState();
  scheduler = createHttpIngestScheduler({
    runtime,
    streamState,
    sources: [{ name: "youtube_live_chat", source: adapters.liveChatSource }],
    intervalMs: Number(env.IRIS_HTTP_INGEST_INTERVAL_MS ?? 3000),
    batchLimit: Number(env.IRIS_HTTP_INGEST_LIMIT ?? 10),
    continueOnSourceError: env.IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR === "true",
    logger: { warn() {}, error() {} },
  });

  scheduler.start();
  const tick = await scheduler.tickNow("manual_youtube_ingest_once");
  const runtimeStatus = createYouTubeIngestRuntimeStatusReport({
    env,
    httpIngestScheduler: scheduler,
    streamState,
  });
  assertYouTubeIngestRuntimeStatusReportSafe(
    runtimeStatus,
    "youtube ingest once runtime status"
  );
  const liveReadiness = createYouTubeIngestLiveReadinessReport({
    env,
    httpIngestScheduler: scheduler,
    streamState,
  });
  assertYouTubeIngestLiveReadinessReportSafe(
    liveReadiness,
    "youtube ingest once live readiness"
  );
  const publicState = streamState.get();
  const sourceErrors = Array.isArray(tick.source_errors) ? tick.source_errors : [];
  const report = {
    ok: tick.ok === true,
    schema: "iris_youtube_ingest_once_cli_v1",
    ingest_attempted: true,
    poll_status: tick.ok === true ? "poll_completed" : "poll_attention",
    preflight_summary: {
      preflight_status: preflight.preflight_status,
      source_mode: preflight.source_mode,
      attention_reasons: [],
      attention_reason_count: 0,
      next_attention_reason: null,
      missing_required_env: [],
    },
    runtime_status_summary: summarizeRuntimeStatus(runtimeStatus),
    support_candidate_flow_summary: summarizeSupportCandidateFlow(
      runtimeStatus.support_candidate_flow
    ),
    live_readiness_summary: summarizeLiveReadiness(liveReadiness),
    tick_summary: {
      ok: tick.ok === true,
      processed_count: safeInteger(tick.processed_count),
      duplicate_count: safeInteger(tick.duplicate_count),
      source_error_count: safeInteger(tick.source_error_count),
      processed_payload_kind_counts: countBy(
        tick.processed.map((item) => item.payload_kind)
      ),
      processed_final_decision_counts: countBy(
        tick.processed.map((item) => item.final_decision)
      ),
      processed_boundary_audit_counts: countBy(
        tick.processed.map((item) => item.boundary_audit_status)
      ),
      source_error_kind_counts: countBy(sourceErrors.map((item) => item.error_kind)),
      source_error_operator_action_required_count: sourceErrors.filter(
        (item) => item.operator_action_required === true
      ).length,
      last_priority_summary: summarizePrioritySummary(
        tick.status?.last_priority_summary
      ),
    },
    public_state_summary: {
      status: sanitizeStatus(publicState.status),
      last_payload_kind: sanitizeStatus(publicState.last_payload_kind),
      last_boundary_audit_status: sanitizeStatus(
        publicState.last_boundary_audit?.audit_status
      ),
      candidate_review_count: safeInteger(
        publicState.last_candidate_review_items?.length
      ),
      relationship_candidate_status: sanitizeStatus(
        publicState.last_relationship_deepening?.candidate_status
      ),
      donation_reaction_style: sanitizeStatus(
        publicState.last_donation_reaction?.reaction_style
      ),
      candidate_validation_status: sanitizeStatus(
        publicState.last_candidate_validation?.validation_status
      ),
      approved_memory_record_count: safeInteger(
        publicState.last_candidate_validation?.approved_memory_record_count
      ),
      approved_relationship_record_count: safeInteger(
        publicState.last_candidate_validation?.approved_relationship_record_count
      ),
      memory_committed_count: safeInteger(
        publicState.last_candidate_persistence?.memory_committed_count
      ),
      relationship_committed_count: safeInteger(
        publicState.last_candidate_persistence?.relationship_committed_count
      ),
      persistence_error_count: safeInteger(
        publicState.last_candidate_persistence?.persistence_error_count
      ),
    },
    production_handoff_summary: createProductionHandoffSummary({
      ingestAttempted: true,
      pollStatus: tick.ok === true ? "poll_completed" : "poll_attention",
      preflightStatus: preflight.preflight_status,
      sourceMode: preflight.source_mode,
      runtimeStatus,
      liveReadiness,
      tickSummary: {
        ok: tick.ok === true,
        processed_count: safeInteger(tick.processed_count),
        duplicate_count: safeInteger(tick.duplicate_count),
        source_error_count: safeInteger(tick.source_error_count),
      },
    }),
    boundary_policy: youtubeIngestOnceBoundaryPolicy(),
  };
  assertSafeReport(report);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} catch (error) {
  const report = {
    ok: false,
    schema: "iris_youtube_ingest_once_cli_v1",
    ingest_attempted: true,
    poll_status: "poll_failed_before_tick",
    preflight_summary: {
      preflight_status: preflight.preflight_status,
      source_mode: preflight.source_mode,
      attention_reasons: [],
      attention_reason_count: 0,
      next_attention_reason: null,
      missing_required_env: [],
    },
    runtime_status_summary: null,
    support_candidate_flow_summary: summarizeSupportCandidateFlow(null),
    live_readiness_summary: summarizeLiveReadiness(null),
    tick_summary: emptyTickSummary({
      source_error_count: 1,
      source_error_kind_counts: {
        [classifySetupError(error)]: 1,
      },
    }),
    production_handoff_summary: createProductionHandoffSummary({
      ingestAttempted: true,
      pollStatus: "poll_failed_before_tick",
      preflightStatus: preflight.preflight_status,
      sourceMode: preflight.source_mode,
      runtimeStatus: null,
      liveReadiness: null,
      tickSummary: emptyTickSummary({
        source_error_count: 1,
      }),
    }),
    boundary_policy: youtubeIngestOnceBoundaryPolicy(),
  };
  assertSafeReport(report);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  scheduler?.stop();
}

function summarizeRuntimeStatus(runtimeStatus) {
  return {
    schema: runtimeStatus.schema,
    runtime_status: runtimeStatus.runtime_status,
    source_kind: runtimeStatus.source_kind,
    source_ingest_readiness_status:
      runtimeStatus.source_ingest_readiness_status,
    source_auth_mode: runtimeStatus.source_auth_mode,
    source_request_count: runtimeStatus.source_request_count,
    source_live_chat_request_count: runtimeStatus.source_live_chat_request_count,
    source_support_event_count: runtimeStatus.source_support_event_count,
    source_last_error: runtimeStatus.source_last_error,
    preflight_status: runtimeStatus.preflight_status,
    preflight_attention_reason_count:
      runtimeStatus.preflight_attention_reason_count,
    preflight_next_attention_reason:
      runtimeStatus.preflight_next_attention_reason,
    ingest_scheduler_enabled_by_env:
      runtimeStatus.ingest_scheduler_enabled_by_env,
    next_runtime_check_script: sanitizeScriptName(
      runtimeStatus.next_runtime_check_script
    ),
    scheduler_available: runtimeStatus.scheduler_summary.scheduler_available,
    scheduler_running: runtimeStatus.scheduler_summary.running,
    scheduler_source_count: runtimeStatus.scheduler_summary.source_count,
    scheduler_youtube_source_count:
      runtimeStatus.scheduler_summary.youtube_source_count,
    scheduler_processed_count: runtimeStatus.scheduler_summary.processed_count,
    scheduler_duplicate_count: runtimeStatus.scheduler_summary.duplicate_count,
    scheduler_source_error_count:
      runtimeStatus.scheduler_summary.source_error_count,
    scheduler_telemetry_counts:
      runtimeStatus.scheduler_summary.youtube_source_telemetry_counts,
    youtube_runtime_state: runtimeStatus.youtube_runtime_state,
    poll_flow: runtimeStatus.poll_flow,
    support_candidate_flow: runtimeStatus.support_candidate_flow,
  };
}

function summarizeLiveReadiness(liveReadiness) {
  const supportGate = liveReadiness?.support_pipeline_gate;
  const supportEventSeen = supportGate?.support_event_seen === true;
  const sourceReady =
    liveReadiness?.source_gate?.gate_status === "ready" &&
    liveReadiness?.source_gate?.source_ingest_readiness_status === "ready";
  const supportPipelineReady =
    supportGate?.gate_status === "ready_waiting_for_support_events" &&
    supportGate?.candidate_gate_acceptable === true &&
    (supportEventSeen !== true ||
      supportGate?.support_events_enter_donation_pipeline === true);
  return {
    schema: "iris_youtube_ingest_once_live_readiness_summary_v1",
    live_readiness_status: sanitizeStatus(liveReadiness?.live_readiness_status),
    next_gate_id: sanitizeStatus(liveReadiness?.next_gate_id),
    next_check_script: sanitizeScriptName(liveReadiness?.next_check_script),
    source_gate_status: sanitizeStatus(liveReadiness?.source_gate?.gate_status),
    access_gate_status: sanitizeStatus(liveReadiness?.access_gate?.gate_status),
    scheduler_gate_status: sanitizeStatus(
      liveReadiness?.scheduler_gate?.gate_status
    ),
    runtime_ingest_gate_status: sanitizeStatus(
      liveReadiness?.runtime_ingest_gate?.gate_status
    ),
    support_pipeline_gate_status: sanitizeStatus(
      liveReadiness?.support_pipeline_gate?.gate_status
    ),
    source_ready: sourceReady,
    access_ready:
      sourceReady &&
      ((liveReadiness?.access_gate?.blocking_stage === "none" &&
        liveReadiness?.access_gate?.gate_status !== "configuration_attention") ||
        (liveReadiness?.access_gate?.blocking_stage === "scheduler" &&
          liveReadiness?.access_gate?.gate_status === "waiting_for_scheduler_start")),
    scheduler_ready:
      liveReadiness?.scheduler_gate?.gate_status === "ready" &&
      liveReadiness?.scheduler_gate?.scheduler_running === true &&
      liveReadiness?.scheduler_gate?.youtube_source_count > 0 &&
      liveReadiness?.scheduler_gate?.source_error_count === 0,
    runtime_ingest_ready:
      liveReadiness?.runtime_ingest_gate?.runtime_status === "polling_active" &&
      liveReadiness?.runtime_ingest_gate?.live_chat_ingest_blocking_stage === "none" &&
      liveReadiness?.runtime_ingest_gate?.runtime_event_seen === true,
    support_pipeline_ready: supportPipelineReady,
    support_event_seen:
      liveReadiness?.support_pipeline_gate?.support_event_seen === true,
    donation_reaction_seen:
      liveReadiness?.support_pipeline_gate?.donation_reaction_seen === true,
    support_events_enter_donation_pipeline:
      liveReadiness?.support_pipeline_gate
        ?.support_events_enter_donation_pipeline === true,
    source_support_event_type_counts: sanitizeCountMap(
      liveReadiness?.support_pipeline_gate?.source_support_event_type_counts,
      SUPPORT_EVENT_TYPES
    ),
    source_support_amount_source_counts: sanitizeCountMap(
      liveReadiness?.support_pipeline_gate?.source_support_amount_source_counts,
      SUPPORT_AMOUNT_SOURCE_KINDS
    ),
    expected_live_readiness_status: sanitizeStatus(
      liveReadiness?.verification_scripts?.expected_live_readiness_status
    ),
    live_readiness_script: sanitizeScriptName(
      liveReadiness?.verification_scripts?.live_readiness_script
    ),
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_support_message_text: true,
      no_platform_ids: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      script_names_only: true,
    },
  };
}

function summarizePrioritySummary(summary) {
  const byBand = summary?.by_band ?? {};
  return {
    batch_count: safeInteger(summary?.batch_count),
    top_priority: safeNullableInteger(summary?.top_priority),
    processed_count: safeInteger(summary?.processed_count),
    duplicate_count: safeInteger(summary?.duplicate_count),
    source_error_count: safeInteger(summary?.source_error_count),
    by_band: {
      urgent: safeInteger(byBand.urgent),
      high: safeInteger(byBand.high),
      contextual: safeInteger(byBand.contextual),
      normal: safeInteger(byBand.normal),
      idle: safeInteger(byBand.idle),
    },
  };
}

function summarizeSupportCandidateFlow(flow) {
  return {
    schema: "iris_youtube_ingest_once_support_candidate_flow_summary_v1",
    flow_status: sanitizeStatus(flow?.flow_status),
    blocking_stage: sanitizeStatus(flow?.blocking_stage),
    next_check_script: sanitizeScriptName(flow?.next_check_script),
    source_support_event_seen: flow?.source_support_event_seen === true,
    runtime_support_event_seen: flow?.runtime_support_event_seen === true,
    donation_reaction_seen: flow?.donation_reaction_seen === true,
    source_support_event_type_counts: sanitizeCountMap(
      flow?.source_support_event_type_counts,
      SUPPORT_EVENT_TYPES
    ),
    source_support_amount_source_counts: sanitizeCountMap(
      flow?.source_support_amount_source_counts,
      SUPPORT_AMOUNT_SOURCE_KINDS
    ),
    source_last_support_event_type_counts: sanitizeCountMap(
      flow?.source_last_support_event_type_counts,
      SUPPORT_EVENT_TYPES
    ),
    source_last_support_amount_source_counts: sanitizeCountMap(
      flow?.source_last_support_amount_source_counts,
      SUPPORT_AMOUNT_SOURCE_KINDS
    ),
    candidate_validation_seen: flow?.candidate_validation_seen === true,
    candidate_validation_status: sanitizeStatus(flow?.candidate_validation_status),
    validation_passed: flow?.validation_passed === true,
    approved_memory_record_count: safeInteger(flow?.approved_memory_record_count),
    approved_relationship_record_count: safeInteger(
      flow?.approved_relationship_record_count
    ),
    rejected_candidate_count: safeInteger(flow?.rejected_candidate_count),
    candidate_persistence_seen: flow?.candidate_persistence_seen === true,
    memory_committed_count: safeInteger(flow?.memory_committed_count),
    relationship_committed_count: safeInteger(flow?.relationship_committed_count),
    persistence_error_count: safeInteger(flow?.persistence_error_count),
    persistence_committed: flow?.persistence_committed === true,
    candidate_review_item_count: safeInteger(flow?.candidate_review_item_count),
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_support_message_text: true,
      no_platform_ids: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      script_names_only: true,
    },
  };
}

function sanitizeCountMap(source, keys) {
  const map = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  return Object.fromEntries(keys.map((key) => [key, safeInteger(map[key])]));
}

function emptyTickSummary(overrides = {}) {
  return {
    ok: false,
    processed_count: 0,
    duplicate_count: 0,
    source_error_count: 0,
    processed_payload_kind_counts: {},
    processed_final_decision_counts: {},
    processed_boundary_audit_counts: {},
    source_error_kind_counts: {},
    source_error_operator_action_required_count: 0,
    last_priority_summary: summarizePrioritySummary(null),
    ...overrides,
  };
}

function youtubeIngestOnceBoundaryPolicy() {
  return {
    uses_youtube_only_scheduler_source: true,
    preflight_required_before_poll: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_support_message_text: true,
    no_platform_ids: true,
    no_platform_cursor_values: true,
    no_candidates: true,
    no_commands: true,
    no_raw_scheduler_results: true,
    live_readiness_summary_included: true,
    counts_only_operator_report: true,
    script_names_only: true,
    production_handoff_summary_counts_only: true,
  };
}

function createProductionHandoffSummary({
  ingestAttempted,
  pollStatus,
  preflightStatus,
  sourceMode,
  runtimeStatus,
  liveReadiness,
  tickSummary,
}) {
  return {
    schema: "iris_youtube_ingest_once_handoff_summary_v1",
    ingest_once_operator_report_only: true,
    preflight_required_before_poll: true,
    ingest_attempted: ingestAttempted === true,
    scheduler_started_only_for_manual_tick: ingestAttempted === true,
    scheduler_stopped_after_cli: true,
    direct_youtube_api_requires_operator_configuration: true,
    oauth_flow_requires_operator_configuration: true,
    support_messages_not_exposed: true,
    platform_ids_not_exposed: true,
    platform_cursor_values_not_exposed: true,
    memory_candidates_not_committed_directly: true,
    relationship_candidates_not_committed_directly: true,
    candidates_not_exposed: true,
    endpoint_values_not_exposed: true,
    secret_values_not_exposed: true,
    raw_scheduler_results_not_exposed: true,
    poll_status: sanitizeStatus(pollStatus),
    preflight_status: sanitizeStatus(preflightStatus),
    source_mode: sanitizeStatus(sourceMode),
    runtime_status: sanitizeStatus(runtimeStatus?.runtime_status),
    live_readiness_status: sanitizeStatus(liveReadiness?.live_readiness_status),
    processed_count: safeInteger(tickSummary?.processed_count),
    duplicate_count: safeInteger(tickSummary?.duplicate_count),
    source_error_count: safeInteger(tickSummary?.source_error_count),
    support_event_count: safeInteger(
      runtimeStatus?.support_candidate_flow?.source_support_event_count
    ),
    approved_memory_record_count: safeInteger(
      runtimeStatus?.support_candidate_flow?.approved_memory_record_count
    ),
    approved_relationship_record_count: safeInteger(
      runtimeStatus?.support_candidate_flow?.approved_relationship_record_count
    ),
    memory_committed_count: safeInteger(
      runtimeStatus?.support_candidate_flow?.memory_committed_count
    ),
    relationship_committed_count: safeInteger(
      runtimeStatus?.support_candidate_flow?.relationship_committed_count
    ),
    next_source_status_script: "npm run dev:youtube:source-status",
    next_live_readiness_script: "npm run dev:youtube:live-readiness",
  };
}

function assertSafeReport(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError("youtube ingest once report missing");
  }
  for (const field of Object.keys(report)) {
    if (!YOUTUBE_INGEST_ONCE_CLI_REPORT_FIELDS.has(field)) {
      throw new ContractError(`youtube ingest once unexpected report field ${field}`);
    }
  }
  if (report.schema !== "iris_youtube_ingest_once_cli_v1") {
    throw new ContractError("youtube ingest once report schema mismatch");
  }
  for (const field of YOUTUBE_INGEST_ONCE_CLI_BOUNDARY_FIELDS) {
    if (report.boundary_policy?.[field] !== true) {
      throw new ContractError(`youtube ingest once boundary flag failed: ${field}`);
    }
  }
  const serialized = JSON.stringify(report);
  assertProductionHandoffSummarySafe(report.production_handoff_summary);
  const forbiddenFieldPatterns = [
    /"world_command"\s*:/,
    /"input_action"\s*:/,
    /"input_action_candidate"\s*:/,
    /"approved_game_input_action"\s*:/,
    /"execute"\s*:/,
    /"commit"\s*:/,
    /"write"\s*:/,
    /"apply"\s*:/,
    /"memory_write"\s*:/,
    /"direct_memory_write"\s*:/,
    /"commit_memory"\s*:/,
    /"relationship_update_candidate"\s*:/,
    /"memory_carryover_candidates"\s*:/,
    /"community_memory_candidates"\s*:/,
    /"approved_memory_record"\s*:/,
    /"approved_relationship_record"\s*:/,
    /"final_text"\s*:/,
    /"text"\s*:/,
    /"subtitle_text"\s*:/,
    /"endpoint"\s*:/,
    /"url"\s*:/,
    /"api_key"\s*:/,
    /"apiKey"\s*:/,
    /"oauth_token"\s*:/,
    /"oauthToken"\s*:/,
    /"access_token"\s*:/,
    /"refresh_token"\s*:/,
    /"token"\s*:/,
    /"secret"\s*:/,
    /"password"\s*:/,
    /"authorization"\s*:/,
    /"value"\s*:/,
    /"payload"\s*:/,
    /"event_id"\s*:/,
    /"trace_id"\s*:/,
    /"live_chat_id"\s*:/,
    /"video_id"\s*:/,
    /"next_page_token"\s*:/,
  ];
  if (/https?:\/\//i.test(serialized)) {
    throw new ContractError("youtube ingest once report exposed endpoint value");
  }
  if (forbiddenFieldPatterns.some((pattern) => pattern.test(serialized))) {
    throw new ContractError("youtube ingest once report exposed unsafe field");
  }
}

function assertProductionHandoffSummarySafe(summary) {
  if (!summary || summary.schema !== "iris_youtube_ingest_once_handoff_summary_v1") {
    throw new ContractError("youtube ingest once handoff summary missing");
  }
  for (const field of [
    "ingest_once_operator_report_only",
    "preflight_required_before_poll",
    "scheduler_stopped_after_cli",
    "direct_youtube_api_requires_operator_configuration",
    "oauth_flow_requires_operator_configuration",
    "support_messages_not_exposed",
    "platform_ids_not_exposed",
    "platform_cursor_values_not_exposed",
    "memory_candidates_not_committed_directly",
    "relationship_candidates_not_committed_directly",
    "candidates_not_exposed",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
    "raw_scheduler_results_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`youtube ingest once handoff flag failed: ${field}`);
    }
  }
  for (const field of [
    "processed_count",
    "duplicate_count",
    "source_error_count",
    "support_event_count",
    "approved_memory_record_count",
    "approved_relationship_record_count",
    "memory_committed_count",
    "relationship_committed_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`youtube ingest once handoff count invalid: ${field}`);
    }
  }
  for (const field of ["next_source_status_script", "next_live_readiness_script"]) {
    if (!sanitizeScriptName(summary[field])) {
      throw new ContractError(`youtube ingest once handoff script invalid: ${field}`);
    }
  }
}

function classifySetupError(error) {
  if (error?.name === "ContractError") return "configuration_contract_error";
  return "setup_failed";
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    const key = sanitizeStatus(value);
    counts[key] = Number(counts[key] ?? 0) + 1;
  }
  return counts;
}

function sanitizeStatus(value) {
  const text = String(value ?? "unknown").replace(/\s+/g, "_").trim().slice(0, 80);
  if (!text || !/^[a-zA-Z0-9_:-]+$/.test(text)) return "unknown";
  return text;
}

function sanitizeScriptName(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value ?? "").trim().slice(0, 120);
  if (!text.startsWith("npm run dev:")) return null;
  if (!/^[a-zA-Z0-9: -]+$/.test(text)) return null;
  return text;
}

function safeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function safeNullableInteger(value) {
  if (value === null || value === undefined) return null;
  return safeInteger(value);
}
