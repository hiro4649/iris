import { ContractError } from "../../core/contracts.js";
import {
  assertYouTubeIngestEnvSetupPlanSafe,
  createYouTubeIngestEnvSetupPlan,
} from "./youtubeIngestEnvSetupPlan.js";
import {
  assertYouTubeIngestLaunchPlanSafe,
  createYouTubeIngestLaunchPlan,
} from "./youtubeIngestLaunchPlan.js";
import {
  assertYouTubeIngestLiveReadinessReportSafe,
  createYouTubeIngestLiveReadinessReport,
} from "./youtubeIngestLiveReadiness.js";
import {
  assertYouTubeIngestPreflightReportSafe,
  createYouTubeIngestPreflightReport,
} from "./youtubeIngestPreflight.js";
import {
  assertYouTubeIngestRuntimeStatusReportSafe,
  createYouTubeIngestRuntimeStatusReport,
} from "./youtubeIngestRuntimeStatus.js";
import {
  assertYouTubeIngestSourceStatusReportSafe,
  createYouTubeIngestSourceStatusReport,
} from "./youtubeIngestSourceStatus.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const SAFE_ENV_NAME_PATTERN = /^IRIS_[A-Z0-9_]+$/;
const SAFE_STATUS_PATTERN = /^[a-z0-9_]+$/;
const SAFE_SCRIPT_PATTERN =
  /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i;

const FORBIDDEN_YOUTUBE_REHEARSAL_FIELDS = new Set([
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
  "memory_candidate",
  "memory_candidates",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "relationship_update_candidate",
  "approved_memory_record",
  "approved_relationship_record",
  "internal_profile",
  "canonical_profile",
  "profile_enum",
  "canonical",
  "canonical_envelope",
  "final_text",
  "last_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
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
  "path",
  "cursor_path",
]);

const YOUTUBE_INGEST_READINESS_REHEARSAL_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "rehearsal_status",
  "source_mode",
  "configured_poll_path_ready",
  "manual_ingest_once_allowed",
  "server_live_polling_ready",
  "poll_attempt_performed",
  "poll_attempt_required_for_runtime_proof",
  "preflight_status",
  "preflight_attention_reason_count",
  "preflight_next_attention_reason",
  "launch_plan_status",
  "env_setup_plan_status",
  "source_instantiation_status",
  "source_kind",
  "source_ingest_readiness_status",
  "source_auth_mode",
  "runtime_status",
  "live_readiness_status",
  "next_step_id",
  "next_step_script",
  "next_check_script",
  "next_configure_env",
  "runtime_flow_summary",
  "gate_summary",
  "verification_scripts",
  "support_event_policy",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);

const REHEARSAL_STATUSES = new Set([
  "ready_for_configured_ingest_once",
  "ready_for_live_youtube_ingest",
  "configuration_rehearsal_attention",
  "source_rehearsal_attention",
  "access_rehearsal_attention",
]);
const SOURCE_MODES = new Set(["youtube_api", "http_relay", "not_configured"]);
const PREFLIGHT_STATUSES = new Set([
  "ready_to_poll_youtube_ingest",
  "blocked_by_configuration",
]);
const LAUNCH_PLAN_STATUSES = new Set([
  "ready_to_launch_youtube_ingest",
  "configure_youtube_ingest_env_first",
]);
const ENV_SETUP_PLAN_STATUSES = new Set([
  "ready_for_youtube_ingest_env_setup",
  "configure_youtube_ingest_env_first",
]);
const SOURCE_INSTANTIATION_STATUSES = new Set([
  "ready",
  "not_configured",
  "configuration_error",
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
const RUNTIME_STATUSES = new Set([
  "attention_required",
  "scheduler_unavailable",
  "configured_waiting_for_scheduler_start",
  "polling_active",
]);
const LIVE_READINESS_STATUSES = new Set([
  "configuration_attention",
  "source_attention",
  "access_attention",
  "scheduler_attention",
  "runtime_ingest_attention",
  "support_pipeline_attention",
  "ready_for_youtube_live_ingest",
]);
const NEXT_STEP_IDS = new Set([
  "review_youtube_preflight",
  "review_youtube_source_status",
  "review_youtube_access_flow",
  "run_youtube_ingest_once",
  "monitor_youtube_runtime_status",
]);
const MANUAL_INGEST_ALLOWED_ACCESS_BLOCKING_STAGES = new Set([
  "none",
  "scheduler",
  "live_chat_resolution",
]);
const MANUAL_INGEST_ALLOWED_SOURCE_READINESS = new Set(["idle", "active"]);
const ACCESS_GATE_READY_STATUSES = new Set([
  "relay_source_selected",
  "api_polling_waiting_for_items",
  "api_polling_with_comments",
  "api_polling_with_support",
  "api_polling_with_comments_and_support",
  "waiting_for_scheduler_start",
]);

export function createYouTubeIngestReadinessRehearsal({
  env = process.env,
  httpIngestScheduler = null,
  streamState = null,
  generatedAtMs = Date.now(),
} = {}) {
  const preflight = createYouTubeIngestPreflightReport({ env, generatedAtMs });
  const launchPlan = createYouTubeIngestLaunchPlan({ env, generatedAtMs });
  const envSetupPlan = createYouTubeIngestEnvSetupPlan({ env, generatedAtMs });
  const sourceStatus = createYouTubeIngestSourceStatusReport({ env, generatedAtMs });
  const runtimeStatus = createYouTubeIngestRuntimeStatusReport({
    env,
    httpIngestScheduler,
    streamState,
    generatedAtMs,
  });
  const liveReadiness = createYouTubeIngestLiveReadinessReport({
    env,
    httpIngestScheduler,
    streamState,
    generatedAtMs,
  });

  assertYouTubeIngestPreflightReportSafe(
    preflight,
    "youtube ingest rehearsal preflight"
  );
  assertYouTubeIngestLaunchPlanSafe(
    launchPlan,
    "youtube ingest rehearsal launch plan"
  );
  assertYouTubeIngestEnvSetupPlanSafe(
    envSetupPlan,
    "youtube ingest rehearsal env setup plan"
  );
  assertYouTubeIngestSourceStatusReportSafe(
    sourceStatus,
    "youtube ingest rehearsal source status"
  );
  assertYouTubeIngestRuntimeStatusReportSafe(
    runtimeStatus,
    "youtube ingest rehearsal runtime status"
  );
  assertYouTubeIngestLiveReadinessReportSafe(
    liveReadiness,
    "youtube ingest rehearsal live readiness"
  );

  const preflightReady = preflight.preflight_status === "ready_to_poll_youtube_ingest";
  const configuredIngestOncePreflightReady =
    isConfiguredIngestOncePreflightReady(preflight);
  const sourceReady = sourceStatus.instantiation_status === "ready";
  const sourceReadinessAllowed = MANUAL_INGEST_ALLOWED_SOURCE_READINESS.has(
    runtimeStatus.source_ingest_readiness_status
  );
  const accessFlow = runtimeStatus.api_cursor_auth_flow;
  const manualIngestOnceAllowed =
    configuredIngestOncePreflightReady &&
    sourceReady &&
    sourceReadinessAllowed &&
    MANUAL_INGEST_ALLOWED_ACCESS_BLOCKING_STAGES.has(accessFlow.blocking_stage);
  const serverLivePollingReady =
    liveReadiness.live_readiness_status === "ready_for_youtube_live_ingest";
  const gateSummary = createGateSummary(liveReadiness);
  const nextStep = summarizeNextStep({
      manualIngestOnceAllowed,
      serverLivePollingReady,
      preflight,
      configuredIngestOncePreflightReady,
      sourceStatus,
      runtimeStatus,
    });

  const rehearsal = {
    schema: "iris_youtube_ingest_readiness_rehearsal_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "youtube_comments_and_support",
    target_stage_priority: 2,
    rehearsal_status: summarizeRehearsalStatus({
      preflightReady,
      configuredIngestOncePreflightReady,
      sourceReady,
      sourceReadinessAllowed,
      manualIngestOnceAllowed,
      serverLivePollingReady,
    }),
    source_mode: preflight.source_mode,
    configured_poll_path_ready: configuredIngestOncePreflightReady && sourceReady,
    manual_ingest_once_allowed: manualIngestOnceAllowed,
    server_live_polling_ready: serverLivePollingReady,
    poll_attempt_performed: false,
    poll_attempt_required_for_runtime_proof: manualIngestOnceAllowed && !serverLivePollingReady,
    preflight_status: preflight.preflight_status,
    preflight_attention_reason_count: preflight.attention_reason_count,
    preflight_next_attention_reason: preflight.next_attention_reason,
    launch_plan_status: launchPlan.plan_status,
    env_setup_plan_status: envSetupPlan.plan_status,
    source_instantiation_status: sourceStatus.instantiation_status,
    source_kind: sourceStatus.source_kind,
    source_ingest_readiness_status: runtimeStatus.source_ingest_readiness_status,
    source_auth_mode: runtimeStatus.source_auth_mode,
    runtime_status: runtimeStatus.runtime_status,
    live_readiness_status: liveReadiness.live_readiness_status,
    next_step_id: nextStep.next_step_id,
    next_step_script: nextStep.next_step_script,
    next_check_script: nextStep.next_check_script,
    next_configure_env: nextStep.next_configure_env,
    runtime_flow_summary: {
      schema: "iris_youtube_ingest_rehearsal_runtime_flow_summary_v1",
      api_cursor_auth_flow_status: accessFlow.flow_status,
      api_cursor_auth_blocking_stage: accessFlow.blocking_stage,
      poll_flow_status: runtimeStatus.poll_flow.flow_status,
      poll_flow_blocking_stage: runtimeStatus.poll_flow.blocking_stage,
      live_chat_ingest_flow_status:
        runtimeStatus.live_chat_ingest_flow.flow_status,
      live_chat_ingest_blocking_stage:
        runtimeStatus.live_chat_ingest_flow.blocking_stage,
      support_candidate_flow_status:
        runtimeStatus.support_candidate_flow.flow_status,
      support_candidate_blocking_stage:
        runtimeStatus.support_candidate_flow.blocking_stage,
      scheduler_available: runtimeStatus.scheduler_summary.scheduler_available,
      scheduler_running: runtimeStatus.scheduler_summary.running,
      scheduler_youtube_source_count:
        runtimeStatus.scheduler_summary.youtube_source_count,
      scheduler_source_error_count:
        runtimeStatus.scheduler_summary.source_error_count,
      source_request_count: runtimeStatus.source_request_count,
      source_live_chat_request_count: runtimeStatus.source_live_chat_request_count,
      source_support_event_count: runtimeStatus.source_support_event_count,
      comments_enter_reaction_pipeline:
        runtimeStatus.live_chat_ingest_flow.comments_enter_reaction_pipeline,
      support_events_enter_donation_pipeline:
        runtimeStatus.live_chat_ingest_flow.support_events_enter_donation_pipeline,
      boundary_policy: {
        counts_statuses_and_booleans_only: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_live_payloads: true,
        no_text_payloads: true,
        no_support_message_text: true,
        no_platform_ids: true,
        no_platform_cursor_values: true,
        no_candidates: true,
        no_commands: true,
      },
    },
    gate_summary: gateSummary,
    verification_scripts: {
      schema: "iris_youtube_ingest_rehearsal_scripts_v1",
      rehearsal_script: "npm run dev:youtube:readiness-rehearsal",
      preflight_script: "npm run dev:youtube:preflight",
      source_status_script: "npm run dev:youtube:source-status",
      runtime_status_script: "npm run dev:youtube:runtime-status",
      live_readiness_script: "npm run dev:youtube:live-readiness",
      configured_ingest_script: "npm run dev:youtube:ingest-once",
      support_gate_roundtrip_script: "npm run dev:youtube:support-gate-roundtrip",
      runtime_ingest_roundtrip_script:
        "npm run dev:youtube:runtime-ingest-roundtrip",
      boundary_policy: {
        script_names_only: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
      },
    },
    support_event_policy: {
      comment_events_remain_comment_events: true,
      support_events_enter_donation_pipeline: true,
      support_events_not_normalized_as_comments: true,
      support_messages_not_exposed_in_rehearsal: true,
      relationship_and_memory_candidates_validation_gated: true,
    },
    production_handoff_summary: {
      schema: "iris_youtube_ingest_rehearsal_handoff_summary_v1",
      rehearsal_report_only: true,
      poll_attempt_not_performed: true,
      direct_youtube_api_not_called_by_rehearsal: true,
      oauth_flow_not_started_by_rehearsal: true,
      scheduler_not_started_by_rehearsal: true,
      support_messages_not_exposed: true,
      memory_and_relationship_candidates_remain_gated: true,
      rehearsal_status: summarizeRehearsalStatus({
        preflightReady,
        configuredIngestOncePreflightReady,
        sourceReady,
        sourceReadinessAllowed,
        manualIngestOnceAllowed,
        serverLivePollingReady,
      }),
      ready_gate_count: gateSummary.ready_gate_count,
      attention_gate_count: gateSummary.attention_gate_count,
      manual_ingest_once_allowed: manualIngestOnceAllowed,
      server_live_polling_ready: serverLivePollingReady,
      source_request_count: runtimeStatus.source_request_count,
      source_support_event_count: runtimeStatus.source_support_event_count,
      next_step_id: nextStep.next_step_id,
      next_step_script: nextStep.next_step_script,
      next_check_script: nextStep.next_check_script,
    },
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      booleans_counts_and_fixed_statuses_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_support_message_text: true,
      no_platform_ids: true,
      no_platform_cursor_values: true,
      no_candidates: true,
      no_commands: true,
      no_raw_scheduler_results: true,
      no_raw_stream_state: true,
      no_polling_side_effects: true,
      read_only_rehearsal: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeIngestReadinessRehearsalSafe(rehearsal);
  return rehearsal;
}

export function assertYouTubeIngestReadinessRehearsalSafe(
  rehearsal,
  context = "youtube ingest readiness rehearsal"
) {
  if (!rehearsal || typeof rehearsal !== "object" || Array.isArray(rehearsal)) {
    throw new ContractError(`${context}: rehearsal is required`);
  }
  assertNoForbiddenFields(rehearsal, context);
  assertNoUrlStrings(rehearsal, context);
  if (rehearsal.schema !== "iris_youtube_ingest_readiness_rehearsal_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(rehearsal)) {
    if (!YOUTUBE_INGEST_READINESS_REHEARSAL_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected rehearsal field`, { field });
    }
  }
  if (!Number.isInteger(rehearsal.generated_at_ms) || rehearsal.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (rehearsal.target_stage_id !== "youtube_comments_and_support") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (rehearsal.target_stage_priority !== 2) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!REHEARSAL_STATUSES.has(rehearsal.rehearsal_status)) {
    throw new ContractError(`${context}: invalid rehearsal status`);
  }
  if (!SOURCE_MODES.has(rehearsal.source_mode)) {
    throw new ContractError(`${context}: invalid source mode`);
  }
  for (const field of [
    "configured_poll_path_ready",
    "manual_ingest_once_allowed",
    "server_live_polling_ready",
    "poll_attempt_performed",
    "poll_attempt_required_for_runtime_proof",
  ]) {
    assertBoolean(rehearsal[field], `${context}: invalid ${field}`);
  }
  if (rehearsal.poll_attempt_performed !== false) {
    throw new ContractError(`${context}: rehearsal must not poll`);
  }
  if (!PREFLIGHT_STATUSES.has(rehearsal.preflight_status)) {
    throw new ContractError(`${context}: invalid preflight status`);
  }
  assertNonNegativeInteger(
    rehearsal.preflight_attention_reason_count,
    `${context}: invalid attention reason count`
  );
  assertOptionalStatus(
    rehearsal.preflight_next_attention_reason,
    `${context}: invalid next attention reason`
  );
  if (!LAUNCH_PLAN_STATUSES.has(rehearsal.launch_plan_status)) {
    throw new ContractError(`${context}: invalid launch status`);
  }
  if (!ENV_SETUP_PLAN_STATUSES.has(rehearsal.env_setup_plan_status)) {
    throw new ContractError(`${context}: invalid env setup status`);
  }
  if (!SOURCE_INSTANTIATION_STATUSES.has(rehearsal.source_instantiation_status)) {
    throw new ContractError(`${context}: invalid source instantiation status`);
  }
  assertStatus(rehearsal.source_kind, `${context}: invalid source kind`);
  if (!SOURCE_READINESS_STATUSES.has(rehearsal.source_ingest_readiness_status)) {
    throw new ContractError(`${context}: invalid source readiness`);
  }
  assertStatus(rehearsal.source_auth_mode, `${context}: invalid source auth mode`);
  if (!RUNTIME_STATUSES.has(rehearsal.runtime_status)) {
    throw new ContractError(`${context}: invalid runtime status`);
  }
  if (!LIVE_READINESS_STATUSES.has(rehearsal.live_readiness_status)) {
    throw new ContractError(`${context}: invalid live readiness status`);
  }
  if (!NEXT_STEP_IDS.has(rehearsal.next_step_id)) {
    throw new ContractError(`${context}: invalid next step id`);
  }
  assertSafeOptionalScriptName(rehearsal.next_step_script, `${context}: next step script`);
  assertSafeOptionalScriptName(rehearsal.next_check_script, `${context}: next check script`);
  assertEnvNameList(rehearsal.next_configure_env, `${context}: next configure env`);
  assertRuntimeFlowSummarySafe(rehearsal.runtime_flow_summary, context);
  assertGateSummarySafe(rehearsal.gate_summary, context);
  assertVerificationScriptsSafe(rehearsal.verification_scripts, context);
  assertSupportEventPolicySafe(rehearsal.support_event_policy, context);
  assertProductionHandoffSummarySafe(rehearsal.production_handoff_summary, rehearsal, context);
  assertBoundaryPolicy(
    rehearsal.boundary_policy,
    [
      "env_names_only",
      "script_names_only",
      "booleans_counts_and_fixed_statuses_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_live_payloads",
      "no_text_payloads",
      "no_support_message_text",
      "no_platform_ids",
      "no_platform_cursor_values",
      "no_candidates",
      "no_commands",
      "no_raw_scheduler_results",
      "no_raw_stream_state",
      "no_polling_side_effects",
      "read_only_rehearsal",
    ],
    `${context}: boundary policy`
  );
  if (rehearsal.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
  if (
    rehearsal.manual_ingest_once_allowed === true &&
    (!isConfiguredIngestOncePreflightReady(rehearsal) ||
      rehearsal.source_instantiation_status !== "ready")
  ) {
    throw new ContractError(`${context}: invalid manual ingest allowance`);
  }
  if (
    rehearsal.server_live_polling_ready === true &&
    rehearsal.live_readiness_status !== "ready_for_youtube_live_ingest"
  ) {
    throw new ContractError(`${context}: invalid server live readiness`);
  }
  if (
    rehearsal.rehearsal_status === "ready_for_live_youtube_ingest" &&
    rehearsal.server_live_polling_ready !== true
  ) {
    throw new ContractError(`${context}: live-ready status mismatch`);
  }
  if (
    rehearsal.rehearsal_status === "ready_for_configured_ingest_once" &&
    rehearsal.manual_ingest_once_allowed !== true
  ) {
    throw new ContractError(`${context}: ingest-once-ready status mismatch`);
  }
}

function assertProductionHandoffSummarySafe(summary, rehearsal, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_youtube_ingest_rehearsal_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of [
    "rehearsal_report_only",
    "poll_attempt_not_performed",
    "direct_youtube_api_not_called_by_rehearsal",
    "oauth_flow_not_started_by_rehearsal",
    "scheduler_not_started_by_rehearsal",
    "support_messages_not_exposed",
    "memory_and_relationship_candidates_remain_gated",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (
    summary.rehearsal_status !== rehearsal.rehearsal_status ||
    summary.ready_gate_count !== rehearsal.gate_summary.ready_gate_count ||
    summary.attention_gate_count !== rehearsal.gate_summary.attention_gate_count ||
    summary.manual_ingest_once_allowed !== rehearsal.manual_ingest_once_allowed ||
    summary.server_live_polling_ready !== rehearsal.server_live_polling_ready ||
    summary.source_request_count !== rehearsal.runtime_flow_summary.source_request_count ||
    summary.source_support_event_count !==
      rehearsal.runtime_flow_summary.source_support_event_count ||
    summary.next_step_id !== rehearsal.next_step_id ||
    summary.next_step_script !== rehearsal.next_step_script ||
    summary.next_check_script !== rehearsal.next_check_script
  ) {
    throw new ContractError(`${context}: invalid production handoff totals`);
  }
  assertNonNegativeInteger(summary.ready_gate_count, `${context}: invalid ready gate count`);
  assertNonNegativeInteger(
    summary.attention_gate_count,
    `${context}: invalid attention gate count`
  );
  assertNonNegativeInteger(
    summary.source_request_count,
    `${context}: invalid source request count`
  );
  assertNonNegativeInteger(
    summary.source_support_event_count,
    `${context}: invalid support event count`
  );
  if (!NEXT_STEP_IDS.has(summary.next_step_id)) {
    throw new ContractError(`${context}: invalid production handoff next step`);
  }
  assertSafeScriptName(summary.next_step_script, `${context}: handoff next step script`);
  assertSafeScriptName(summary.next_check_script, `${context}: handoff next check script`);
}

function summarizeRehearsalStatus({
  preflightReady,
  configuredIngestOncePreflightReady = preflightReady,
  sourceReady,
  sourceReadinessAllowed,
  manualIngestOnceAllowed,
  serverLivePollingReady,
}) {
  if (!configuredIngestOncePreflightReady) return "configuration_rehearsal_attention";
  if (!sourceReady || !sourceReadinessAllowed) return "source_rehearsal_attention";
  if (!manualIngestOnceAllowed) return "access_rehearsal_attention";
  if (serverLivePollingReady) return "ready_for_live_youtube_ingest";
  return "ready_for_configured_ingest_once";
}

function summarizeNextStep({
  manualIngestOnceAllowed,
  serverLivePollingReady,
  preflight,
  configuredIngestOncePreflightReady,
  sourceStatus,
  runtimeStatus,
}) {
  if (!configuredIngestOncePreflightReady) {
    return {
      next_step_id: "review_youtube_preflight",
      next_step_script: "npm run dev:youtube:preflight",
      next_check_script: "npm run dev:youtube:readiness-rehearsal",
      next_configure_env: [...preflight.missing_required_env],
    };
  }
  if (
    sourceStatus.instantiation_status !== "ready" ||
    !MANUAL_INGEST_ALLOWED_SOURCE_READINESS.has(
      runtimeStatus.source_ingest_readiness_status
    )
  ) {
    return {
      next_step_id: "review_youtube_source_status",
      next_step_script: "npm run dev:youtube:source-status",
      next_check_script: "npm run dev:youtube:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  if (!manualIngestOnceAllowed) {
    return {
      next_step_id: "review_youtube_access_flow",
      next_step_script:
        runtimeStatus.api_cursor_auth_flow.next_check_script ??
        "npm run dev:youtube:runtime-status",
      next_check_script: "npm run dev:youtube:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  if (serverLivePollingReady) {
    return {
      next_step_id: "monitor_youtube_runtime_status",
      next_step_script: "npm run dev:youtube:runtime-status",
      next_check_script: "npm run dev:youtube:runtime-status",
      next_configure_env: [],
    };
  }
  return {
    next_step_id: "run_youtube_ingest_once",
    next_step_script: "npm run dev:youtube:ingest-once",
    next_check_script: "npm run dev:youtube:ingest-once",
    next_configure_env: [],
  };
}

function isConfiguredIngestOncePreflightReady(preflight) {
  if (preflight.preflight_status === "ready_to_poll_youtube_ingest") return true;
  const attentionReasonCount = Array.isArray(preflight.attention_reasons)
    ? preflight.attention_reasons.length
    : preflight.preflight_attention_reason_count;
  const nextAttentionReason = Array.isArray(preflight.attention_reasons)
    ? preflight.attention_reasons[0] ?? null
    : preflight.preflight_next_attention_reason;
  return (
    preflight.preflight_status === "blocked_by_configuration" &&
    attentionReasonCount === 1 &&
    nextAttentionReason === "scheduler_disabled"
  );
}

function createGateSummary(liveReadiness) {
  const gates = [
    liveReadiness.source_gate,
    liveReadiness.access_gate,
    liveReadiness.scheduler_gate,
    liveReadiness.runtime_ingest_gate,
    liveReadiness.support_pipeline_gate,
  ];
  const sourceGateReady =
    liveReadiness.source_gate.gate_status === "ready" &&
    liveReadiness.source_gate.preflight_ready === true &&
    liveReadiness.source_gate.source_ready === true;
  const accessGateReady =
    ACCESS_GATE_READY_STATUSES.has(liveReadiness.access_gate.gate_status) &&
    (liveReadiness.access_gate.blocking_stage === "none" ||
      liveReadiness.access_gate.blocking_stage === "scheduler") &&
    liveReadiness.access_gate.source_ready === true;
  const schedulerGateReady =
    liveReadiness.scheduler_gate.gate_status === "ready" &&
    liveReadiness.scheduler_gate.scheduler_running === true &&
    liveReadiness.scheduler_gate.youtube_source_count > 0;
  const runtimeIngestGateReady =
    liveReadiness.runtime_ingest_gate.gate_status === "ready" &&
    liveReadiness.runtime_ingest_gate.live_chat_ingest_blocking_stage ===
      "none" &&
    liveReadiness.runtime_ingest_gate.runtime_event_seen === true;
  const supportPipelineGateReady =
    liveReadiness.support_pipeline_gate.ready === true;
  const readyGateCount = [
    sourceGateReady,
    accessGateReady,
    schedulerGateReady,
    runtimeIngestGateReady,
    supportPipelineGateReady,
  ].filter(Boolean).length;
  return {
    schema: "iris_youtube_ingest_rehearsal_gate_summary_v1",
    gate_count: gates.length,
    ready_gate_count: readyGateCount,
    attention_gate_count: gates.length - readyGateCount,
    source_gate_ready: sourceGateReady,
    access_gate_ready: accessGateReady,
    scheduler_gate_ready: schedulerGateReady,
    runtime_ingest_gate_ready: runtimeIngestGateReady,
    support_pipeline_gate_ready: supportPipelineGateReady,
    source_gate_status: liveReadiness.source_gate.gate_status,
    access_gate_status: liveReadiness.access_gate.gate_status,
    scheduler_gate_status: liveReadiness.scheduler_gate.gate_status,
    runtime_ingest_gate_status: liveReadiness.runtime_ingest_gate.gate_status,
    support_pipeline_gate_status:
      liveReadiness.support_pipeline_gate.gate_status,
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_platform_ids: true,
      no_platform_cursor_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function assertRuntimeFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: runtime flow summary is required`);
  }
  if (summary.schema !== "iris_youtube_ingest_rehearsal_runtime_flow_summary_v1") {
    throw new ContractError(`${context}: invalid runtime flow summary schema`);
  }
  for (const field of [
    "api_cursor_auth_flow_status",
    "api_cursor_auth_blocking_stage",
    "poll_flow_status",
    "poll_flow_blocking_stage",
    "live_chat_ingest_flow_status",
    "live_chat_ingest_blocking_stage",
    "support_candidate_flow_status",
    "support_candidate_blocking_stage",
  ]) {
    assertStatus(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "scheduler_available",
    "scheduler_running",
    "comments_enter_reaction_pipeline",
    "support_events_enter_donation_pipeline",
  ]) {
    assertBoolean(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "scheduler_youtube_source_count",
    "scheduler_source_error_count",
    "source_request_count",
    "source_live_chat_request_count",
    "source_support_event_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_booleans_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_live_payloads",
    "no_text_payloads",
    "no_support_message_text",
    "no_platform_ids",
    "no_platform_cursor_values",
    "no_candidates",
    "no_commands",
  ], context);
}

function assertGateSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: gate summary is required`);
  }
  if (summary.schema !== "iris_youtube_ingest_rehearsal_gate_summary_v1") {
    throw new ContractError(`${context}: invalid gate summary schema`);
  }
  for (const field of ["gate_count", "ready_gate_count", "attention_gate_count"]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (summary.gate_count !== 5) {
    throw new ContractError(`${context}: invalid gate count`);
  }
  if (summary.ready_gate_count + summary.attention_gate_count !== summary.gate_count) {
    throw new ContractError(`${context}: invalid gate count summary`);
  }
  for (const field of [
    "source_gate_ready",
    "access_gate_ready",
    "scheduler_gate_ready",
    "runtime_ingest_gate_ready",
    "support_pipeline_gate_ready",
  ]) {
    assertBoolean(summary[field], `${context}: invalid ${field}`);
  }
  const expectedReadyGateCount = [
    summary.source_gate_ready,
    summary.access_gate_ready,
    summary.scheduler_gate_ready,
    summary.runtime_ingest_gate_ready,
    summary.support_pipeline_gate_ready,
  ].filter(Boolean).length;
  if (
    summary.ready_gate_count !== expectedReadyGateCount ||
    summary.attention_gate_count !== summary.gate_count - expectedReadyGateCount
  ) {
    throw new ContractError(`${context}: gate counts must match gate readiness flags`);
  }
  for (const field of [
    "source_gate_status",
    "access_gate_status",
    "scheduler_gate_status",
    "runtime_ingest_gate_status",
    "support_pipeline_gate_status",
  ]) {
    assertStatus(summary[field], `${context}: invalid ${field}`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_booleans_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_live_payloads",
    "no_text_payloads",
    "no_platform_ids",
    "no_platform_cursor_values",
    "no_candidates",
    "no_commands",
  ], context);
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_youtube_ingest_rehearsal_scripts_v1") {
    throw new ContractError(`${context}: invalid scripts schema`);
  }
  for (const field of [
    "rehearsal_script",
    "preflight_script",
    "source_status_script",
    "runtime_status_script",
    "live_readiness_script",
    "configured_ingest_script",
    "support_gate_roundtrip_script",
    "runtime_ingest_roundtrip_script",
  ]) {
    assertSafeScriptName(scripts[field], `${context}: invalid ${field}`);
  }
  assertBoundaryPolicy(scripts.boundary_policy, [
    "script_names_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_payloads",
    "no_candidates",
    "no_commands",
  ], context);
}

function assertSupportEventPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: support event policy is required`);
  }
  for (const field of [
    "comment_events_remain_comment_events",
    "support_events_enter_donation_pipeline",
    "support_events_not_normalized_as_comments",
    "support_messages_not_exposed_in_rehearsal",
    "relationship_and_memory_candidates_validation_gated",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid support event policy`);
    }
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

function assertNoForbiddenFields(value, context, path = []) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFields(item, context, [...path, String(index)])
    );
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_YOUTUBE_REHEARSAL_FIELDS.has(key)) {
      throw new ContractError(`${context}: forbidden field`, {
        field: [...path, key].join("."),
      });
    }
    assertNoForbiddenFields(nested, context, [...path, key]);
  }
}

function assertNoUrlStrings(value, context) {
  if (URL_PATTERN.test(JSON.stringify(value))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
}

function assertEnvNameList(names, context) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of names) {
    if (typeof name !== "string" || !SAFE_ENV_NAME_PATTERN.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
  if (new Set(names).size !== names.length) {
    throw new ContractError(`${context}: duplicate env name`);
  }
}

function assertSafeScriptName(script, context) {
  if (typeof script !== "string" || !SAFE_SCRIPT_PATTERN.test(script)) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function assertSafeOptionalScriptName(script, context) {
  if (script === null) return;
  assertSafeScriptName(script, context);
}

function assertStatus(value, context) {
  if (typeof value !== "string" || !SAFE_STATUS_PATTERN.test(value)) {
    throw new ContractError(context);
  }
}

function assertOptionalStatus(value, context) {
  if (value === null) return;
  assertStatus(value, context);
}

function assertBoolean(value, context) {
  if (typeof value !== "boolean") {
    throw new ContractError(context);
  }
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}
