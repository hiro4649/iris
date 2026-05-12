import { ContractError } from "../../core/contracts.js";
import {
  assertYouTubeIngestLaunchPlanSafe,
  createYouTubeIngestLaunchPlan,
} from "./youtubeIngestLaunchPlan.js";
import {
  assertYouTubeIngestEnvSetupPlanSafe,
  createYouTubeIngestEnvSetupPlan,
} from "./youtubeIngestEnvSetupPlan.js";
import {
  assertYouTubeIngestRuntimeStatusReportSafe,
  createYouTubeIngestRuntimeStatusReport,
} from "./youtubeIngestRuntimeStatus.js";

const FORBIDDEN_YOUTUBE_LIVE_READINESS_FIELDS = new Set([
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

const LIVE_READINESS_STATUSES = new Set([
  "configuration_attention",
  "source_attention",
  "access_attention",
  "scheduler_attention",
  "runtime_ingest_attention",
  "support_pipeline_attention",
  "ready_for_youtube_live_ingest",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const GATE_IDS = new Set([
  "source_gate",
  "access_gate",
  "scheduler_gate",
  "runtime_ingest_gate",
  "support_pipeline_gate",
]);
const YOUTUBE_INGEST_LIVE_READINESS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "live_readiness_status",
  "next_readiness_state",
  "readiness_state_counts",
  "youtube_launch_plan_status",
  "env_setup_plan_summary",
  "source_mode",
  "target_stage_id",
  "next_gate_id",
  "next_check_script",
  "source_gate",
  "access_gate",
  "scheduler_gate",
  "runtime_ingest_gate",
  "support_pipeline_gate",
  "production_handoff_summary",
  "verification_scripts",
  "boundary_policy",
  "adapter_validation_required",
]);
const CHECK_SCRIPTS = {
  source_gate: "npm run dev:youtube:source-status",
  access_gate: "npm run dev:youtube:ingest-once",
  scheduler_gate: "npm run dev:youtube:runtime-status",
  runtime_ingest_gate: "npm run dev:youtube:runtime-ingest-roundtrip",
  support_pipeline_gate: "npm run dev:youtube:support-gate-roundtrip",
};
const SOURCE_GATE_STATUSES = new Set([
  "configuration_attention",
  "source_attention",
  "ready",
]);
const ACCESS_GATE_STATUSES = new Set([
  "configuration_attention",
  "source_unavailable",
  "waiting_for_auth",
  "waiting_for_chat_target",
  "waiting_for_cursor_store",
  "cursor_store_attention",
  "operator_action_required",
  "upstream_retry_backoff",
  "upstream_polling_cooldown",
  "waiting_for_scheduler_start",
  "waiting_for_live_chat_resolution",
  "relay_source_selected",
  "api_polling_waiting_for_items",
  "api_polling_with_comments",
  "api_polling_with_support",
  "api_polling_with_comments_and_support",
]);
const ACCESS_BLOCKING_STAGES = new Set([
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
const SCHEDULER_GATE_STATUSES = new Set([
  "configuration_attention",
  "scheduler_unavailable",
  "waiting_for_scheduler_start",
  "scheduler_attention",
  "ready",
]);
const RUNTIME_GATE_STATUSES = new Set([
  "configuration_attention",
  "source_unavailable",
  "scheduler_unavailable",
  "waiting_for_scheduler_start",
  "polling_cooldown",
  "retry_backoff",
  "operator_action_required",
  "runtime_attention",
  "waiting_for_runtime_comment",
  "waiting_for_runtime_support_event",
  "ready",
]);
const SUPPORT_PIPELINE_GATE_STATUSES = new Set([
  "policy_attention",
  "waiting_for_runtime_support_event",
  "waiting_for_donation_reaction",
  "waiting_for_candidate_gate",
  "ready_waiting_for_support_events",
  "ready_with_safe_candidate_block",
  "ready_with_validation_gated_persistence",
]);
const SOURCE_KINDS = new Set([
  "youtube_live_chat_api_source",
  "http_youtube_live_chat_source",
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
const LIVE_CHAT_FLOW_STATUSES = new Set([
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
const LIVE_CHAT_FLOW_BLOCKING_STAGES = new Set([
  "configuration",
  "source",
  "scheduler",
  "upstream_cooldown",
  "retry_backoff",
  "operator_action",
  "runtime_state",
  "none",
]);
const SUPPORT_CANDIDATE_STATUSES = new Set([
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
const ACCEPTABLE_SOURCE_READINESS = new Set(["idle", "active"]);
const ACCESS_READY_STATUSES = new Set([
  "relay_source_selected",
  "api_polling_waiting_for_items",
  "api_polling_with_comments",
  "api_polling_with_support",
  "api_polling_with_comments_and_support",
]);
const LIVE_INGEST_READY_STATUSES = new Set([
  "polling_active_waiting_for_events",
  "runtime_active_with_comments",
  "runtime_active_with_support",
  "runtime_active_with_comments_and_support",
]);
const SUPPORT_CANDIDATE_READY_STATUSES = new Set([
  "validation_blocked_or_disabled",
  "validation_gated_persistence_active",
  "review_only_validation_gated",
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
const ENV_SETUP_PLAN_STATUSES = new Set([
  "ready_for_youtube_ingest_env_setup",
  "configure_youtube_ingest_env_first",
]);
const ENV_SETUP_GROUP_IDS = new Set([
  "youtube_source_selection",
  "youtube_live_chat_target",
  "youtube_credentials",
  "youtube_cursor_resume",
  "youtube_http_ingest_scheduler",
]);
const ENV_SETUP_GROUP_KINDS = new Set([
  "source_selection_config",
  "target_config",
  "credential_config",
  "cursor_resume_config",
  "scheduler_config",
]);
const ENV_SETUP_ATTENTION_REASONS = new Set([
  "ready",
  "missing_required_env",
  "configuration_attention",
  "local_target_policy_attention",
]);
const URL_PATTERN = /https?:\/\//i;

export function createYouTubeIngestLiveReadinessReport({
  env = process.env,
  httpIngestScheduler = null,
  streamState = null,
  generatedAtMs = Date.now(),
} = {}) {
  const launchPlan = createYouTubeIngestLaunchPlan({ env, generatedAtMs });
  const envSetupPlan = createYouTubeIngestEnvSetupPlan({ env, generatedAtMs });
  const runtimeStatus = createYouTubeIngestRuntimeStatusReport({
    env,
    httpIngestScheduler,
    streamState,
    generatedAtMs,
  });
  assertYouTubeIngestLaunchPlanSafe(launchPlan, "youtube live readiness launch plan");
  assertYouTubeIngestEnvSetupPlanSafe(
    envSetupPlan,
    "youtube live readiness env setup plan"
  );
  assertYouTubeIngestRuntimeStatusReportSafe(
    runtimeStatus,
    "youtube live readiness runtime status"
  );

  const sourceGate = summarizeSourceGate(runtimeStatus);
  const accessGate = summarizeAccessGate(runtimeStatus);
  const schedulerGate = summarizeSchedulerGate(runtimeStatus);
  const runtimeIngestGate = summarizeRuntimeIngestGate(runtimeStatus);
  const supportPipelineGate = summarizeSupportPipelineGate(runtimeStatus);
  const liveReadinessStatus = summarizeLiveReadinessStatus({
    sourceGate,
    accessGate,
    schedulerGate,
    runtimeIngestGate,
    supportPipelineGate,
  });
  const nextGate = firstAttentionGate([
    ["source_gate", sourceGate],
    ["access_gate", accessGate],
    ["scheduler_gate", schedulerGate],
    ["runtime_ingest_gate", runtimeIngestGate],
    ["support_pipeline_gate", supportPipelineGate],
  ]);

  const report = {
    schema: "iris_youtube_ingest_live_readiness_report_v1",
    generated_at_ms: generatedAtMs,
    live_readiness_status: liveReadinessStatus,
    next_readiness_state: nextGate?.readiness_state ?? "ready",
    readiness_state_counts: countReadinessStates([
      sourceGate,
      accessGate,
      schedulerGate,
      runtimeIngestGate,
      supportPipelineGate,
    ]),
    youtube_launch_plan_status: launchPlan.plan_status,
    env_setup_plan_summary: summarizeEnvSetupPlan(envSetupPlan),
    source_mode: launchPlan.source_mode,
    target_stage_id: "youtube_comments_and_support",
    next_gate_id: nextGate?.gate_id ?? null,
    next_check_script: nextGate?.next_check_script ?? null,
    source_gate: sourceGate,
    access_gate: accessGate,
    scheduler_gate: schedulerGate,
    runtime_ingest_gate: runtimeIngestGate,
    support_pipeline_gate: supportPipelineGate,
    production_handoff_summary: summarizeProductionHandoff({
      liveReadinessStatus,
      nextGate,
      sourceGate,
      accessGate,
      schedulerGate,
      runtimeIngestGate,
      supportPipelineGate,
    }),
    verification_scripts: {
      schema: "iris_youtube_ingest_live_readiness_scripts_v1",
      launch_plan_script: "npm run dev:youtube:launch-plan",
      env_setup_plan_script: "npm run dev:youtube:env-setup-plan",
      source_status_script: "npm run dev:youtube:source-status",
      runtime_status_script: "npm run dev:youtube:runtime-status",
      live_readiness_script: "npm run dev:youtube:live-readiness",
      configured_ingest_script:
        launchPlan.runtime_poll_verification_summary.configured_ingest_script,
      source_specific_roundtrip_script:
        launchPlan.runtime_poll_verification_summary
          .source_specific_roundtrip_script,
      runtime_ingest_roundtrip_script:
        launchPlan.runtime_poll_verification_summary.runtime_ingest_roundtrip_script,
      support_gate_roundtrip_script:
        launchPlan.runtime_poll_verification_summary.support_gate_roundtrip_script,
      policy_gate_roundtrip_script:
        launchPlan.runtime_poll_verification_summary.policy_gate_roundtrip_script,
      http_ingest_roundtrip_script:
        launchPlan.runtime_poll_verification_summary.http_ingest_roundtrip_script,
      cursor_roundtrip_script:
        launchPlan.runtime_poll_verification_summary.cursor_roundtrip_script,
      cursor_backup_roundtrip_script:
        launchPlan.runtime_poll_verification_summary.cursor_backup_roundtrip_script,
      expected_runtime_status: "polling_active",
      expected_live_chat_ingest_blocking_stage: "none",
      expected_live_readiness_status: "ready_for_youtube_live_ingest",
      boundary_policy: {
        script_names_only: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
      },
    },
    boundary_policy: {
      env_names_only: true,
      booleans_counts_and_fixed_statuses_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_support_message_text: true,
      no_platform_cursor_values: true,
      no_platform_ids: true,
      no_candidates: true,
      no_commands: true,
      no_raw_scheduler_results: true,
      no_raw_stream_state: true,
      read_only_live_readiness: true,
      no_polling_side_effects: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeIngestLiveReadinessReportSafe(report);
  return report;
}

export function assertYouTubeIngestLiveReadinessReportSafe(
  report,
  context = "youtube ingest live readiness report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenYouTubeLiveReadinessFields(report, context);
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_youtube_ingest_live_readiness_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!YOUTUBE_INGEST_LIVE_READINESS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated time`);
  }
  if (!LIVE_READINESS_STATUSES.has(report.live_readiness_status)) {
    throw new ContractError(`${context}: invalid live readiness status`);
  }
  if (!READINESS_STATES.has(report.next_readiness_state)) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  assertReadinessStateCountsSafe(
    report.readiness_state_counts,
    `${context}: readiness state counts`
  );
  if (
    ![
      "ready_to_launch_youtube_ingest",
      "configure_youtube_ingest_env_first",
    ].includes(report.youtube_launch_plan_status)
  ) {
    throw new ContractError(`${context}: invalid launch plan status`);
  }
  if (!["youtube_api", "http_relay", "not_configured"].includes(report.source_mode)) {
    throw new ContractError(`${context}: invalid source mode`);
  }
  if (report.target_stage_id !== "youtube_comments_and_support") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (report.next_gate_id !== null && !GATE_IDS.has(report.next_gate_id)) {
    throw new ContractError(`${context}: invalid next gate`);
  }
  if (report.next_check_script !== null) {
    assertSafeScriptName(report.next_check_script, `${context}: next check script`);
  }
  assertEnvSetupPlanSummarySafe(report.env_setup_plan_summary, context);
  assertSourceGateSafe(report.source_gate, context);
  assertAccessGateSafe(report.access_gate, context);
  assertSchedulerGateSafe(report.scheduler_gate, context);
  assertRuntimeIngestGateSafe(report.runtime_ingest_gate, context);
  assertSupportPipelineGateSafe(report.support_pipeline_gate, context);
  assertProductionHandoffSummarySafe(report.production_handoff_summary, report, context);
  assertVerificationScriptsSafe(report.verification_scripts, context);
  const nextGate = firstAttentionGate([
    ["source_gate", report.source_gate],
    ["access_gate", report.access_gate],
    ["scheduler_gate", report.scheduler_gate],
    ["runtime_ingest_gate", report.runtime_ingest_gate],
    ["support_pipeline_gate", report.support_pipeline_gate],
  ]);
  if (!nextGate) {
    if (report.next_gate_id !== null || report.next_check_script !== null) {
      throw new ContractError(`${context}: ready report must not expose next gate`);
    }
  } else if (
    report.next_gate_id !== nextGate.gate_id ||
    report.next_check_script !== nextGate.next_check_script
  ) {
    throw new ContractError(`${context}: next gate must match first attention gate`);
  }
  assertBoundaryPolicy(
    report.boundary_policy,
    [
      "env_names_only",
      "booleans_counts_and_fixed_statuses_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_live_payloads",
      "no_text_payloads",
      "no_support_message_text",
      "no_platform_cursor_values",
      "no_platform_ids",
      "no_candidates",
      "no_commands",
      "no_raw_scheduler_results",
      "no_raw_stream_state",
      "read_only_live_readiness",
      "no_polling_side_effects",
    ],
    `${context}: boundary policy`
  );
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function summarizeProductionHandoff({
  liveReadinessStatus,
  nextGate,
  sourceGate,
  accessGate,
  schedulerGate,
  runtimeIngestGate,
    supportPipelineGate,
}) {
  const gates = [
    sourceGate,
    accessGate,
    schedulerGate,
    runtimeIngestGate,
    supportPipelineGate,
  ];
  return {
    schema: "iris_youtube_ingest_live_readiness_handoff_summary_v1",
    live_readiness_report_only: true,
    real_polling_not_started_by_report: true,
    direct_youtube_api_not_called_by_report: true,
    oauth_flow_not_started_by_report: true,
    scheduler_not_started_by_report: true,
    support_messages_not_exposed: true,
    support_candidates_remain_validation_gated: true,
    memory_and_relationship_candidates_not_committed_directly: true,
    live_readiness_status: liveReadinessStatus,
    next_readiness_state: nextGate?.readiness_state ?? "ready",
    readiness_state_counts: countReadinessStates(gates),
    ready_gate_count: gates.filter((gate) => gate.ready === true).length,
    attention_gate_count: gates.filter((gate) => gate.ready !== true).length,
    comment_event_count: runtimeIngestGate.comment_event_count,
    support_event_count: runtimeIngestGate.support_event_count,
    runtime_history_comment_count: runtimeIngestGate.runtime_history_comment_count,
    runtime_history_support_event_count:
      runtimeIngestGate.runtime_history_support_event_count,
    approved_memory_record_count:
      supportPipelineGate.approved_memory_record_count,
    approved_relationship_record_count:
      supportPipelineGate.approved_relationship_record_count,
    rejected_candidate_count: supportPipelineGate.rejected_candidate_count,
    persistence_error_count: supportPipelineGate.persistence_error_count,
    next_gate_id: nextGate?.gate_id ?? null,
    next_check_script: nextGate?.next_check_script ?? null,
  };
}

function assertProductionHandoffSummarySafe(summary, report, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_youtube_ingest_live_readiness_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of [
    "live_readiness_report_only",
    "real_polling_not_started_by_report",
    "direct_youtube_api_not_called_by_report",
    "oauth_flow_not_started_by_report",
    "scheduler_not_started_by_report",
    "support_messages_not_exposed",
    "support_candidates_remain_validation_gated",
    "memory_and_relationship_candidates_not_committed_directly",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (summary.live_readiness_status !== report.live_readiness_status) {
    throw new ContractError(`${context}: invalid production handoff status`);
  }
  if (!READINESS_STATES.has(summary.next_readiness_state)) {
    throw new ContractError(`${context}: invalid production handoff readiness state`);
  }
  assertReadinessStateCountsSafe(
    summary.readiness_state_counts,
    `${context}: production handoff readiness counts`
  );
  for (const field of [
    "ready_gate_count",
    "attention_gate_count",
    "comment_event_count",
    "support_event_count",
    "runtime_history_comment_count",
    "runtime_history_support_event_count",
    "approved_memory_record_count",
    "approved_relationship_record_count",
    "rejected_candidate_count",
    "persistence_error_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (summary.ready_gate_count + summary.attention_gate_count !== GATE_IDS.size) {
    throw new ContractError(`${context}: invalid production handoff gate counts`);
  }
  const readyGateCount = [
    report.source_gate,
    report.access_gate,
    report.scheduler_gate,
    report.runtime_ingest_gate,
    report.support_pipeline_gate,
  ].filter((gate) => gate.ready === true).length;
  if (
    summary.ready_gate_count !== readyGateCount ||
    summary.attention_gate_count !== GATE_IDS.size - readyGateCount ||
    summary.comment_event_count !== report.runtime_ingest_gate.comment_event_count ||
    summary.support_event_count !== report.runtime_ingest_gate.support_event_count ||
    summary.runtime_history_comment_count !==
      report.runtime_ingest_gate.runtime_history_comment_count ||
    summary.runtime_history_support_event_count !==
      report.runtime_ingest_gate.runtime_history_support_event_count ||
    summary.approved_memory_record_count !==
      report.support_pipeline_gate.approved_memory_record_count ||
    summary.approved_relationship_record_count !==
      report.support_pipeline_gate.approved_relationship_record_count ||
    summary.rejected_candidate_count !==
      report.support_pipeline_gate.rejected_candidate_count ||
    summary.persistence_error_count !==
      report.support_pipeline_gate.persistence_error_count ||
    summary.next_readiness_state !== report.next_readiness_state ||
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: invalid production handoff totals`);
  }
  if (summary.next_gate_id !== report.next_gate_id) {
    throw new ContractError(`${context}: invalid production handoff next gate`);
  }
  if (summary.next_check_script !== report.next_check_script) {
    throw new ContractError(`${context}: invalid production handoff next script`);
  }
  if (summary.next_gate_id !== null && !GATE_IDS.has(summary.next_gate_id)) {
    throw new ContractError(`${context}: invalid production handoff gate`);
  }
  if (summary.next_check_script !== null) {
    assertSafeScriptName(
      summary.next_check_script,
      `${context}: production handoff next check script`
    );
  }
}

function summarizeEnvSetupPlan(envSetupPlan) {
  const envGroups = envSetupPlan.env_groups;
  return {
    schema: "iris_youtube_live_readiness_env_setup_summary_v1",
    check_script: "npm run dev:youtube:env-setup-plan",
    plan_status: envSetupPlan.plan_status,
    env_group_count: envSetupPlan.env_group_count,
    ready_env_group_count: envSetupPlan.ready_env_group_count,
    attention_env_group_count: envSetupPlan.attention_env_group_count,
    next_env_group_id: envSetupPlan.next_env_group_id,
    next_env_group_kind: envSetupPlan.next_env_group_kind,
    next_attention_reason: envSetupPlan.next_attention_reason,
    next_configure_env: envSetupPlan.next_configure_env,
    next_launch_script: envSetupPlan.next_launch_script,
    next_readiness_script: envSetupPlan.next_readiness_script,
    source_selection_group_ready:
      envGroups.find((group) => group.env_group_id === "youtube_source_selection")
        ?.setup_status === "ready",
    live_chat_target_group_ready:
      envGroups.find((group) => group.env_group_id === "youtube_live_chat_target")
        ?.setup_status === "ready",
    credential_group_ready:
      envGroups.find((group) => group.env_group_id === "youtube_credentials")
        ?.setup_status === "ready",
    cursor_resume_group_ready:
      envGroups.find((group) => group.env_group_id === "youtube_cursor_resume")
        ?.setup_status === "ready",
    scheduler_group_ready:
      envGroups.find(
        (group) => group.env_group_id === "youtube_http_ingest_scheduler"
      )?.setup_status === "ready",
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_platform_cursor_values: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeSourceGate(runtimeStatus) {
  const preflightReady =
    runtimeStatus.preflight_status === "ready_to_poll_youtube_ingest" ||
    isSchedulerOnlyRuntimePreflightAttention(runtimeStatus);
  const sourceReady = runtimeStatus.source_instantiation_status === "ready";
  const sourceReadinessAllowed = ACCEPTABLE_SOURCE_READINESS.has(
    runtimeStatus.source_ingest_readiness_status
  );
  const sourceConfigured =
    runtimeStatus.source_kind === "youtube_live_chat_api_source" ||
    runtimeStatus.source_kind === "http_youtube_live_chat_source";
  const ready = preflightReady && sourceReady && sourceReadinessAllowed;
  const gateStatus = !preflightReady
    ? "configuration_attention"
    : ready
      ? "ready"
      : "source_attention";
  return {
    schema: "iris_youtube_live_readiness_source_gate_v1",
    check_script: CHECK_SCRIPTS.source_gate,
    next_check_script: ready ? null : CHECK_SCRIPTS.source_gate,
    ready,
    readiness_state: ready ? "ready" : "configuration_waiting",
    gate_status: gateStatus,
    preflight_ready: preflightReady,
    source_configured: sourceConfigured,
    source_ready: sourceReady,
    source_kind: runtimeStatus.source_kind,
    source_ingest_readiness_status:
      runtimeStatus.source_ingest_readiness_status,
    source_auth_mode: runtimeStatus.source_auth_mode,
    direct_api_source_active:
      runtimeStatus.source_kind === "youtube_live_chat_api_source",
    relay_source_active:
      runtimeStatus.source_kind === "http_youtube_live_chat_source",
    preflight_attention_reason_count:
      runtimeStatus.preflight_attention_reason_count,
    diagnostic_detail: createGateDiagnosticDetail("source_gate", {
      preflight_ready: preflightReady,
      source_configured: sourceConfigured,
      source_ready: sourceReady,
      source_kind: runtimeStatus.source_kind,
      source_ingest_readiness_status:
        runtimeStatus.source_ingest_readiness_status,
      source_auth_mode: runtimeStatus.source_auth_mode,
      direct_api_source_active:
        runtimeStatus.source_kind === "youtube_live_chat_api_source",
      relay_source_active:
        runtimeStatus.source_kind === "http_youtube_live_chat_source",
      preflight_attention_reason_count:
        runtimeStatus.preflight_attention_reason_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function isSchedulerOnlyRuntimePreflightAttention(runtimeStatus) {
  return (
    runtimeStatus.preflight_status === "blocked_by_configuration" &&
    runtimeStatus.preflight_attention_reason_count === 1 &&
    runtimeStatus.preflight_next_attention_reason === "scheduler_disabled"
  );
}

function summarizeAccessGate(runtimeStatus) {
  const flow = runtimeStatus.api_cursor_auth_flow;
  const sourceReady =
    runtimeStatus.source_instantiation_status === "ready" &&
    ACCEPTABLE_SOURCE_READINESS.has(runtimeStatus.source_ingest_readiness_status);
  const preflightReady =
    runtimeStatus.preflight_status === "ready_to_poll_youtube_ingest";
  const ready =
    sourceReady &&
    ((flow.blocking_stage === "none" &&
      ACCESS_READY_STATUSES.has(flow.flow_status) &&
      preflightReady) ||
      (flow.blocking_stage === "scheduler" &&
        flow.flow_status === "waiting_for_scheduler_start"));
  return {
    schema: "iris_youtube_live_readiness_access_gate_v1",
    check_script: CHECK_SCRIPTS.access_gate,
    next_check_script: ready
      ? null
      : flow.next_check_script ?? CHECK_SCRIPTS.access_gate,
    ready,
    readiness_state: ready
      ? "ready"
      : readinessStateForBlockingStage(flow.blocking_stage),
    gate_status: flow.flow_status,
    blocking_stage: flow.blocking_stage,
    direct_api_source_active: flow.direct_api_source_active,
    relay_source_active: flow.relay_source_active,
    auth_ready: flow.auth_ready,
    api_chat_target_configured: flow.api_chat_target_configured,
    api_live_chat_resolved: flow.api_live_chat_resolved,
    api_live_chat_resolution_needed: flow.api_live_chat_resolution_needed,
    cursor_store_configured: flow.cursor_store_configured,
    cursor_store_attention: flow.cursor_store_attention,
    operator_action_required: flow.operator_action_required,
    retry_backoff_active: flow.retry_backoff_active,
    polling_cooldown_active: flow.polling_cooldown_active,
    request_count: flow.request_count,
    live_chat_request_count: flow.live_chat_request_count,
    comment_event_count: flow.comment_event_count,
    support_event_count: flow.support_event_count,
    diagnostic_detail: createGateDiagnosticDetail("access_gate", {
      access_ready: ready,
      blocking_stage: flow.blocking_stage,
      auth_ready: flow.auth_ready,
      direct_api_source_active: flow.direct_api_source_active,
      relay_source_active: flow.relay_source_active,
      api_chat_target_configured: flow.api_chat_target_configured,
      api_live_chat_resolved: flow.api_live_chat_resolved,
      api_live_chat_resolution_needed: flow.api_live_chat_resolution_needed,
      cursor_store_configured: flow.cursor_store_configured,
      cursor_store_attention: flow.cursor_store_attention,
      operator_action_required: flow.operator_action_required,
      retry_backoff_active: flow.retry_backoff_active,
      polling_cooldown_active: flow.polling_cooldown_active,
      request_count: flow.request_count,
      live_chat_request_count: flow.live_chat_request_count,
      comment_event_count: flow.comment_event_count,
      support_event_count: flow.support_event_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeSchedulerGate(runtimeStatus) {
  const scheduler = runtimeStatus.scheduler_summary;
  const ready =
    scheduler.scheduler_status_error === null &&
    scheduler.running === true &&
    scheduler.youtube_source_count > 0 &&
    scheduler.source_error_count === 0;
  return {
    schema: "iris_youtube_live_readiness_scheduler_gate_v1",
    check_script: CHECK_SCRIPTS.scheduler_gate,
    next_check_script: ready
      ? null
      : schedulerGateNextCheckScript(runtimeStatus),
    ready,
    readiness_state: ready
      ? "ready"
      : readinessStateForSchedulerGate({ runtimeStatus, scheduler }),
    gate_status: summarizeSchedulerGateStatus({ runtimeStatus, scheduler, ready }),
    scheduler_available: scheduler.scheduler_available,
    scheduler_running: scheduler.running,
    scheduler_ticking: scheduler.ticking,
    scheduler_status_error_seen: scheduler.scheduler_status_error !== null,
    source_count: scheduler.source_count,
    youtube_source_count: scheduler.youtube_source_count,
    processed_count: scheduler.processed_count,
    duplicate_count: scheduler.duplicate_count,
    source_error_count: scheduler.source_error_count,
    diagnostic_detail: createGateDiagnosticDetail("scheduler_gate", {
      scheduler_available: scheduler.scheduler_available,
      scheduler_running: scheduler.running,
      scheduler_ticking: scheduler.ticking,
      scheduler_status_error_seen: scheduler.scheduler_status_error !== null,
      source_count: scheduler.source_count,
      youtube_source_count: scheduler.youtube_source_count,
      processed_count: scheduler.processed_count,
      duplicate_count: scheduler.duplicate_count,
      source_error_count: scheduler.source_error_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeRuntimeIngestGate(runtimeStatus) {
  const pollFlow = runtimeStatus.poll_flow;
  const liveFlow = runtimeStatus.live_chat_ingest_flow;
  const ready =
    runtimeStatus.runtime_status === "polling_active" &&
    pollFlow.blocking_stage === "none" &&
    liveFlow.blocking_stage === "none" &&
    LIVE_INGEST_READY_STATUSES.has(liveFlow.flow_status) &&
    liveFlow.runtime_event_seen === true;
  return {
    schema: "iris_youtube_live_readiness_runtime_ingest_gate_v1",
    check_script: CHECK_SCRIPTS.runtime_ingest_gate,
    next_check_script: ready
      ? null
      : liveFlow.next_check_script ??
        pollFlow.next_check_script ??
        CHECK_SCRIPTS.runtime_ingest_gate,
    ready,
    readiness_state: ready
      ? "ready"
      : liveFlow.blocking_stage === "none" &&
          liveFlow.runtime_event_seen !== true
        ? "runtime_waiting"
      : readinessStateForBlockingStage(liveFlow.blocking_stage),
    gate_status: ready
      ? "ready"
      : liveFlow.blocking_stage === "none" && liveFlow.runtime_event_seen !== true
        ? "runtime_attention"
        : liveFlow.flow_status,
    runtime_status: runtimeStatus.runtime_status,
    poll_flow_status: pollFlow.flow_status,
    live_chat_ingest_flow_status: liveFlow.flow_status,
    live_chat_ingest_blocking_stage: liveFlow.blocking_stage,
    source_polling_active: liveFlow.source_polling_active,
    runtime_state_available: liveFlow.runtime_state_available,
    runtime_event_seen: liveFlow.runtime_event_seen,
    runtime_comment_seen: liveFlow.runtime_comment_seen,
    runtime_support_event_seen: liveFlow.runtime_support_event_seen,
    comments_enter_reaction_pipeline: liveFlow.comments_enter_reaction_pipeline,
    support_events_enter_donation_pipeline:
      liveFlow.support_events_enter_donation_pipeline,
    comment_event_count: liveFlow.comment_event_count,
    support_event_count: liveFlow.support_event_count,
    runtime_history_comment_count: liveFlow.runtime_history_comment_count,
    runtime_history_support_event_count:
      liveFlow.runtime_history_support_event_count,
    diagnostic_detail: createGateDiagnosticDetail("runtime_ingest_gate", {
      runtime_status: runtimeStatus.runtime_status,
      poll_flow_status: pollFlow.flow_status,
      live_chat_ingest_flow_status: liveFlow.flow_status,
      live_chat_ingest_blocking_stage: liveFlow.blocking_stage,
      source_polling_active: liveFlow.source_polling_active,
      runtime_state_available: liveFlow.runtime_state_available,
      runtime_event_seen: liveFlow.runtime_event_seen,
      runtime_comment_seen: liveFlow.runtime_comment_seen,
      runtime_support_event_seen: liveFlow.runtime_support_event_seen,
      comments_enter_reaction_pipeline: liveFlow.comments_enter_reaction_pipeline,
      support_events_enter_donation_pipeline:
        liveFlow.support_events_enter_donation_pipeline,
      comment_event_count: liveFlow.comment_event_count,
      support_event_count: liveFlow.support_event_count,
      runtime_history_comment_count: liveFlow.runtime_history_comment_count,
      runtime_history_support_event_count:
        liveFlow.runtime_history_support_event_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeSupportPipelineGate(runtimeStatus) {
  const policyReady = supportEventPolicyReady(runtimeStatus.support_event_policy);
  const supportFlow = runtimeStatus.support_candidate_flow;
  const liveFlow = runtimeStatus.live_chat_ingest_flow;
  const supportEventSeen =
    liveFlow.source_support_event_seen === true ||
    liveFlow.runtime_support_event_seen === true ||
    supportFlow.source_support_event_seen === true ||
    supportFlow.runtime_support_event_seen === true;
  const candidateGateAcceptable = supportEventSeen
    ? SUPPORT_CANDIDATE_READY_STATUSES.has(supportFlow.flow_status)
    : supportFlow.flow_status === "no_support_events_seen";
  const donationPipelineReady =
    supportEventSeen !== true ||
    liveFlow.support_events_enter_donation_pipeline === true;
  const ready =
    policyReady && candidateGateAcceptable && donationPipelineReady === true;
  return {
    schema: "iris_youtube_live_readiness_support_pipeline_gate_v1",
    check_script: CHECK_SCRIPTS.support_pipeline_gate,
    next_check_script: ready
      ? null
      : supportFlow.next_check_script ??
        liveFlow.next_check_script ??
        CHECK_SCRIPTS.support_pipeline_gate,
    ready,
    readiness_state: ready
      ? "ready"
      : readinessStateForSupportPipelineGate({ supportFlow, liveFlow }),
    gate_status: summarizeSupportPipelineGateStatus({
      policyReady,
      supportEventSeen,
      donationPipelineReady,
      supportFlow,
    }),
    policy_ready: policyReady,
    support_event_seen: supportEventSeen,
    runtime_support_event_seen: liveFlow.runtime_support_event_seen,
    donation_reaction_seen: supportFlow.donation_reaction_seen,
    support_events_enter_donation_pipeline:
      liveFlow.support_events_enter_donation_pipeline,
    source_support_event_type_counts: sanitizeCountMap(
      supportFlow.source_support_event_type_counts,
      SUPPORT_EVENT_TYPES
    ),
    source_support_amount_source_counts: sanitizeCountMap(
      supportFlow.source_support_amount_source_counts,
      SUPPORT_AMOUNT_SOURCE_KINDS
    ),
    source_last_support_event_type_counts: sanitizeCountMap(
      supportFlow.source_last_support_event_type_counts,
      SUPPORT_EVENT_TYPES
    ),
    source_last_support_amount_source_counts: sanitizeCountMap(
      supportFlow.source_last_support_amount_source_counts,
      SUPPORT_AMOUNT_SOURCE_KINDS
    ),
    candidate_gate_status: supportFlow.flow_status,
    candidate_gate_blocking_stage: supportFlow.blocking_stage,
    candidate_gate_acceptable: candidateGateAcceptable,
    validation_passed: supportFlow.validation_passed,
    persistence_committed: supportFlow.persistence_committed,
    approved_memory_record_count: supportFlow.approved_memory_record_count,
    approved_relationship_record_count:
      supportFlow.approved_relationship_record_count,
    rejected_candidate_count: supportFlow.rejected_candidate_count,
    persistence_error_count: supportFlow.persistence_error_count,
    diagnostic_detail: createGateDiagnosticDetail("support_pipeline_gate", {
      policy_ready: policyReady,
      support_event_seen: supportEventSeen,
      runtime_support_event_seen: liveFlow.runtime_support_event_seen,
      donation_reaction_seen: supportFlow.donation_reaction_seen,
      support_events_enter_donation_pipeline:
        liveFlow.support_events_enter_donation_pipeline,
      candidate_gate_status: supportFlow.flow_status,
      candidate_gate_blocking_stage: supportFlow.blocking_stage,
      candidate_gate_acceptable: candidateGateAcceptable,
      validation_passed: supportFlow.validation_passed,
      persistence_committed: supportFlow.persistence_committed,
      approved_memory_record_count: supportFlow.approved_memory_record_count,
      approved_relationship_record_count:
        supportFlow.approved_relationship_record_count,
      rejected_candidate_count: supportFlow.rejected_candidate_count,
      persistence_error_count: supportFlow.persistence_error_count,
      source_support_event_type_counts: sanitizeCountMap(
        supportFlow.source_support_event_type_counts,
        SUPPORT_EVENT_TYPES
      ),
      source_support_amount_source_counts: sanitizeCountMap(
        supportFlow.source_support_amount_source_counts,
        SUPPORT_AMOUNT_SOURCE_KINDS
      ),
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeSchedulerGateStatus({ runtimeStatus, scheduler, ready }) {
  if (
    runtimeStatus.preflight_status !== "ready_to_poll_youtube_ingest" &&
    !isSchedulerOnlyRuntimePreflightAttention(runtimeStatus)
  ) {
    return "configuration_attention";
  }
  if (scheduler.scheduler_available !== true) return "scheduler_unavailable";
  if (scheduler.running !== true) return "waiting_for_scheduler_start";
  if (
    scheduler.scheduler_status_error !== null ||
    scheduler.source_error_count > 0 ||
    scheduler.youtube_source_count === 0
  ) {
    return "scheduler_attention";
  }
  return ready ? "ready" : "scheduler_attention";
}

function summarizeSupportPipelineGateStatus({
  policyReady,
  supportEventSeen,
  donationPipelineReady,
  supportFlow,
}) {
  if (policyReady !== true) return "policy_attention";
  if (supportEventSeen !== true) return "ready_waiting_for_support_events";
  if (donationPipelineReady !== true) {
    return supportFlow.blocking_stage === "runtime_state"
      ? "waiting_for_runtime_support_event"
      : "waiting_for_donation_reaction";
  }
  if (!SUPPORT_CANDIDATE_READY_STATUSES.has(supportFlow.flow_status)) {
    return "waiting_for_candidate_gate";
  }
  if (supportFlow.flow_status === "validation_gated_persistence_active") {
    return "ready_with_validation_gated_persistence";
  }
  return "ready_with_safe_candidate_block";
}

function summarizeLiveReadinessStatus({
  sourceGate,
  accessGate,
  schedulerGate,
  runtimeIngestGate,
  supportPipelineGate,
}) {
  if (sourceGate.gate_status === "configuration_attention") {
    return "configuration_attention";
  }
  if (sourceGate.ready !== true) return "source_attention";
  if (accessGate.ready !== true) return "access_attention";
  if (schedulerGate.ready !== true) return "scheduler_attention";
  if (runtimeIngestGate.ready !== true) return "runtime_ingest_attention";
  if (supportPipelineGate.ready !== true) return "support_pipeline_attention";
  return "ready_for_youtube_live_ingest";
}

function firstAttentionGate(gates) {
  for (const [gateId, gate] of gates) {
    if (gate?.ready !== true) {
      return {
        gate_id: gateId,
        readiness_state: gate.readiness_state,
        next_check_script:
          gate?.next_check_script ?? gate?.check_script ?? CHECK_SCRIPTS[gateId],
      };
    }
  }
  return null;
}

function assertEnvSetupPlanSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: env setup summary is required`);
  }
  if (summary.schema !== "iris_youtube_live_readiness_env_setup_summary_v1") {
    throw new ContractError(`${context}: invalid env setup summary schema`);
  }
  assertSafeScriptName(summary.check_script, `${context}: env setup check script`);
  if (summary.check_script !== "npm run dev:youtube:env-setup-plan") {
    throw new ContractError(`${context}: invalid env setup check script`);
  }
  if (!ENV_SETUP_PLAN_STATUSES.has(summary.plan_status)) {
    throw new ContractError(`${context}: invalid env setup plan status`);
  }
  for (const field of [
    "env_group_count",
    "ready_env_group_count",
    "attention_env_group_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (
    summary.ready_env_group_count + summary.attention_env_group_count !==
    summary.env_group_count
  ) {
    throw new ContractError(`${context}: invalid env setup group counts`);
  }
  for (const field of [
    "source_selection_group_ready",
    "live_chat_target_group_ready",
    "credential_group_ready",
    "cursor_resume_group_ready",
    "scheduler_group_ready",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid env setup flag ${field}`);
    }
  }
  if (
    summary.next_env_group_id !== null &&
    !ENV_SETUP_GROUP_IDS.has(summary.next_env_group_id)
  ) {
    throw new ContractError(`${context}: invalid next env group id`);
  }
  if (
    summary.next_env_group_kind !== null &&
    !ENV_SETUP_GROUP_KINDS.has(summary.next_env_group_kind)
  ) {
    throw new ContractError(`${context}: invalid next env group kind`);
  }
  if (
    summary.next_attention_reason !== null &&
    !ENV_SETUP_ATTENTION_REASONS.has(summary.next_attention_reason)
  ) {
    throw new ContractError(`${context}: invalid env setup attention reason`);
  }
  for (const field of ["next_launch_script", "next_readiness_script"]) {
    if (summary[field] !== null) {
      assertSafeScriptName(summary[field], `${context}: ${field}`);
    }
  }
  assertEnvNameListSafe(
    summary.next_configure_env,
    `${context}: env setup next configure env`
  );
  if (summary.plan_status === "ready_for_youtube_ingest_env_setup") {
    if (
      summary.next_env_group_id !== null ||
      summary.next_env_group_kind !== null ||
      summary.next_attention_reason !== null ||
      summary.next_launch_script !== null ||
      summary.next_readiness_script !== null ||
      summary.next_configure_env.length !== 0 ||
      summary.attention_env_group_count !== 0
    ) {
      throw new ContractError(`${context}: unexpected ready env setup next item`);
    }
  } else if (
    summary.next_env_group_id === null ||
    summary.next_env_group_kind === null ||
    summary.next_attention_reason === null
  ) {
    throw new ContractError(`${context}: env setup attention needs next item`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "env_names_only",
      "script_names_only",
      "booleans_counts_and_fixed_statuses_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_platform_cursor_values",
      "no_live_payloads",
      "no_support_message_text",
      "no_candidates",
      "no_commands",
    ],
    `${context}: env setup`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: env setup adapter validation required`);
  }
}

function supportEventPolicyReady(policy) {
  return [
    "comment_events_enter_reaction_pipeline",
    "support_events_enter_donation_pipeline",
    "support_events_not_counted_as_comments",
    "relationship_and_memory_candidates_validation_gated",
    "runtime_status_reports_candidate_gate_summary",
    "live_chat_ingest_flow_reports_comment_and_support_handoff",
    "source_events_deduped_and_moderated_before_runtime",
    "support_messages_not_exposed_in_status",
    "scheduler_runtime_status_counts_only",
  ].every((field) => policy?.[field] === true);
}

function countReadinessStates(items) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const item of items) {
    const state = item.readiness_state;
    if (READINESS_STATES.has(state)) counts[state] += 1;
  }
  return counts;
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
    case "live_chat_resolution":
      return "runtime_waiting";
    case "upstream_cooldown":
    case "retry_backoff":
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

function readinessStateForSchedulerGate({ runtimeStatus, scheduler }) {
  if (
    runtimeStatus.preflight_status !== "ready_to_poll_youtube_ingest" &&
    !isSchedulerOnlyRuntimePreflightAttention(runtimeStatus)
  ) {
    return "configuration_waiting";
  }
  if (scheduler.scheduler_available !== true || scheduler.running !== true) {
    return "runtime_waiting";
  }
  if (
    scheduler.scheduler_status_error !== null ||
    scheduler.source_error_count > 0 ||
    scheduler.youtube_source_count === 0
  ) {
    return "runtime_waiting";
  }
  return "ready";
}

function schedulerGateNextCheckScript(runtimeStatus) {
  if (runtimeStatus.api_cursor_auth_flow?.blocking_stage === "scheduler") {
    return runtimeStatus.api_cursor_auth_flow.next_check_script;
  }
  return runtimeStatus.poll_flow?.next_check_script ?? CHECK_SCRIPTS.scheduler_gate;
}

function readinessStateForSupportPipelineGate({ supportFlow, liveFlow }) {
  const stage =
    supportFlow.blocking_stage === "none"
      ? liveFlow.blocking_stage
      : supportFlow.blocking_stage;
  return readinessStateForBlockingStage(stage);
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

function gateBoundaryPolicy() {
  return {
    booleans_counts_and_fixed_statuses_only: true,
    script_names_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_text_payloads: true,
    no_support_message_text: true,
    no_platform_cursor_values: true,
    no_platform_ids: true,
    no_candidates: true,
    no_commands: true,
  };
}

function assertSourceGateSafe(gate, context) {
  assertGateObject(gate, "iris_youtube_live_readiness_source_gate_v1", context);
  if (!SOURCE_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid source gate status`);
  }
  if (!SOURCE_KINDS.has(gate.source_kind)) {
    throw new ContractError(`${context}: invalid source kind`);
  }
  if (!SOURCE_READINESS_STATUSES.has(gate.source_ingest_readiness_status)) {
    throw new ContractError(`${context}: invalid source readiness`);
  }
  for (const field of [
    "ready",
    "preflight_ready",
    "source_configured",
    "source_ready",
    "direct_api_source_active",
    "relay_source_active",
  ]) {
    assertBoolean(gate[field], `${context}: invalid source gate flag ${field}`);
  }
  assertStringStatus(gate.source_auth_mode, `${context}: invalid source auth mode`);
  assertNonNegativeInteger(
    gate.preflight_attention_reason_count,
    `${context}: invalid preflight attention reason count`
  );
  assertGateDiagnosticDetailSafe(gate.diagnostic_detail, "source_gate", context);
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertAccessGateSafe(gate, context) {
  assertGateObject(gate, "iris_youtube_live_readiness_access_gate_v1", context);
  if (!ACCESS_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid access gate status`);
  }
  if (!ACCESS_BLOCKING_STAGES.has(gate.blocking_stage)) {
    throw new ContractError(`${context}: invalid access gate blocking stage`);
  }
  for (const field of [
    "ready",
    "direct_api_source_active",
    "relay_source_active",
    "auth_ready",
    "api_chat_target_configured",
    "api_live_chat_resolved",
    "api_live_chat_resolution_needed",
    "cursor_store_configured",
    "cursor_store_attention",
    "operator_action_required",
    "retry_backoff_active",
    "polling_cooldown_active",
  ]) {
    assertBoolean(gate[field], `${context}: invalid access gate flag ${field}`);
  }
  assertGateCounts(gate, context, [
    "request_count",
    "live_chat_request_count",
    "comment_event_count",
    "support_event_count",
  ]);
  assertGateDiagnosticDetailSafe(gate.diagnostic_detail, "access_gate", context);
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertSchedulerGateSafe(gate, context) {
  assertGateObject(gate, "iris_youtube_live_readiness_scheduler_gate_v1", context);
  if (!SCHEDULER_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid scheduler gate status`);
  }
  for (const field of [
    "ready",
    "scheduler_available",
    "scheduler_running",
    "scheduler_ticking",
    "scheduler_status_error_seen",
  ]) {
    assertBoolean(gate[field], `${context}: invalid scheduler gate flag ${field}`);
  }
  assertGateCounts(gate, context, [
    "source_count",
    "youtube_source_count",
    "processed_count",
    "duplicate_count",
    "source_error_count",
  ]);
  assertGateDiagnosticDetailSafe(gate.diagnostic_detail, "scheduler_gate", context);
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertRuntimeIngestGateSafe(gate, context) {
  assertGateObject(gate, "iris_youtube_live_readiness_runtime_ingest_gate_v1", context);
  if (!RUNTIME_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid runtime gate status`);
  }
  if (!RUNTIME_STATUSES.has(gate.runtime_status)) {
    throw new ContractError(`${context}: invalid runtime status`);
  }
  if (!POLL_FLOW_STATUSES.has(gate.poll_flow_status)) {
    throw new ContractError(`${context}: invalid poll flow status`);
  }
  if (!LIVE_CHAT_FLOW_STATUSES.has(gate.live_chat_ingest_flow_status)) {
    throw new ContractError(`${context}: invalid live chat flow status`);
  }
  if (!LIVE_CHAT_FLOW_BLOCKING_STAGES.has(gate.live_chat_ingest_blocking_stage)) {
    throw new ContractError(`${context}: invalid live chat flow blocking stage`);
  }
  for (const field of [
    "ready",
    "source_polling_active",
    "runtime_state_available",
    "runtime_event_seen",
    "runtime_comment_seen",
    "runtime_support_event_seen",
    "comments_enter_reaction_pipeline",
    "support_events_enter_donation_pipeline",
  ]) {
    assertBoolean(gate[field], `${context}: invalid runtime gate flag ${field}`);
  }
  assertGateCounts(gate, context, [
    "comment_event_count",
    "support_event_count",
    "runtime_history_comment_count",
    "runtime_history_support_event_count",
  ]);
  assertGateDiagnosticDetailSafe(
    gate.diagnostic_detail,
    "runtime_ingest_gate",
    context
  );
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertSupportPipelineGateSafe(gate, context) {
  assertGateObject(
    gate,
    "iris_youtube_live_readiness_support_pipeline_gate_v1",
    context
  );
  if (!SUPPORT_PIPELINE_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid support pipeline gate status`);
  }
  if (!SUPPORT_CANDIDATE_STATUSES.has(gate.candidate_gate_status)) {
    throw new ContractError(`${context}: invalid support candidate status`);
  }
  if (!SUPPORT_CANDIDATE_BLOCKING_STAGES.has(gate.candidate_gate_blocking_stage)) {
    throw new ContractError(`${context}: invalid support candidate blocking stage`);
  }
  for (const field of [
    "ready",
    "policy_ready",
    "support_event_seen",
    "runtime_support_event_seen",
    "donation_reaction_seen",
    "support_events_enter_donation_pipeline",
    "candidate_gate_acceptable",
    "validation_passed",
    "persistence_committed",
  ]) {
    assertBoolean(gate[field], `${context}: invalid support gate flag ${field}`);
  }
  assertGateCounts(gate, context, [
    "approved_memory_record_count",
    "approved_relationship_record_count",
    "rejected_candidate_count",
    "persistence_error_count",
  ]);
  assertCountMapSafe(
    gate.source_support_event_type_counts,
    SUPPORT_EVENT_TYPES,
    context
  );
  assertCountMapSafe(
    gate.source_support_amount_source_counts,
    SUPPORT_AMOUNT_SOURCE_KINDS,
    context
  );
  assertCountMapSafe(
    gate.source_last_support_event_type_counts,
    SUPPORT_EVENT_TYPES,
    context
  );
  assertCountMapSafe(
    gate.source_last_support_amount_source_counts,
    SUPPORT_AMOUNT_SOURCE_KINDS,
    context
  );
  assertGateDiagnosticDetailSafe(
    gate.diagnostic_detail,
    "support_pipeline_gate",
    context
  );
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_youtube_ingest_live_readiness_scripts_v1") {
    throw new ContractError(`${context}: invalid verification scripts schema`);
  }
  for (const field of [
    "launch_plan_script",
    "env_setup_plan_script",
    "source_status_script",
    "runtime_status_script",
    "live_readiness_script",
    "configured_ingest_script",
    "source_specific_roundtrip_script",
    "runtime_ingest_roundtrip_script",
    "support_gate_roundtrip_script",
    "policy_gate_roundtrip_script",
    "http_ingest_roundtrip_script",
    "cursor_roundtrip_script",
    "cursor_backup_roundtrip_script",
  ]) {
    assertSafeScriptName(scripts[field], `${context}: ${field}`);
  }
  if (scripts.expected_runtime_status !== "polling_active") {
    throw new ContractError(`${context}: invalid expected runtime status`);
  }
  if (scripts.expected_live_chat_ingest_blocking_stage !== "none") {
    throw new ContractError(`${context}: invalid expected live chat stage`);
  }
  if (scripts.expected_live_readiness_status !== "ready_for_youtube_live_ingest") {
    throw new ContractError(`${context}: invalid expected live readiness status`);
  }
  assertBoundaryPolicy(
    scripts.boundary_policy,
    [
      "script_names_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: verification scripts boundary policy`
  );
}

function assertGateObject(gate, schema, context) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate is required`);
  }
  if (gate.schema !== schema) {
    throw new ContractError(`${context}: invalid gate schema`);
  }
  if (typeof gate.ready !== "boolean") {
    throw new ContractError(`${context}: invalid gate ready flag`);
  }
  if (!READINESS_STATES.has(gate.readiness_state)) {
    throw new ContractError(`${context}: invalid gate readiness state`);
  }
  if (gate.readiness_state === "ready" && gate.ready !== true) {
    throw new ContractError(`${context}: ready gate readiness mismatch`);
  }
  if (gate.ready !== true && gate.readiness_state === "ready") {
    throw new ContractError(`${context}: attention gate readiness mismatch`);
  }
  assertSafeScriptName(gate.check_script, `${context}: gate check script`);
  assertGateNextCheckScriptSafe(gate, `${context}: gate next check script`);
}

function assertGateNextCheckScriptSafe(gate, context) {
  if (gate.readiness_state === "ready") {
    if (gate.next_check_script !== null) {
      throw new ContractError(`${context}: ready gate must not expose next check`);
    }
    return;
  }
  assertSafeScriptName(gate.next_check_script, context);
}

function assertGateCounts(gate, context, fields) {
  for (const field of fields) {
    assertNonNegativeInteger(gate[field], `${context}: invalid ${field}`);
  }
}

function createGateDiagnosticDetail(gateId, fields) {
  const detail = {
    schema: "iris_youtube_live_readiness_gate_diagnostic_detail_v1",
    gate_id: gateId,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "boolean") {
      detail[key] = value;
    } else if (Number.isInteger(value) && value >= 0) {
      detail[key] = value;
    } else if (typeof value === "string") {
      detail[key] = safeDiagnosticLabel(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      detail[key] = sanitizeDiagnosticCountMap(value);
    }
  }
  return detail;
}

function assertGateDiagnosticDetailSafe(detail, gateId, context) {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
    throw new ContractError(`${context}: gate diagnostic detail is required`);
  }
  if (detail.schema !== "iris_youtube_live_readiness_gate_diagnostic_detail_v1") {
    throw new ContractError(`${context}: invalid gate diagnostic detail schema`);
  }
  if (detail.gate_id !== gateId) {
    throw new ContractError(`${context}: invalid gate diagnostic detail id`);
  }
  for (const [key, value] of Object.entries(detail)) {
    if (!/^[a-zA-Z0-9_:-]+$/.test(key)) {
      throw new ContractError(`${context}: invalid gate diagnostic key`);
    }
    if (key === "schema" || key === "gate_id") continue;
    if (typeof value === "boolean") continue;
    if (Number.isInteger(value) && value >= 0) continue;
    if (typeof value === "string") {
      assertStringStatus(value, `${context}: invalid gate diagnostic label`);
      continue;
    }
    assertDiagnosticCountMapSafe(value, context);
  }
}

function sanitizeDiagnosticCountMap(source) {
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key]) => /^[a-zA-Z0-9_:-]+$/.test(key))
      .map(([key, value]) => [key, safeNonNegativeInteger(value)])
  );
}

function assertDiagnosticCountMapSafe(map, context) {
  if (!map || typeof map !== "object" || Array.isArray(map)) {
    throw new ContractError(`${context}: invalid gate diagnostic detail value`);
  }
  const keys = Object.keys(map);
  if (keys.length > 32) {
    throw new ContractError(`${context}: gate diagnostic count map too large`);
  }
  for (const key of keys) {
    if (!/^[a-zA-Z0-9_:-]+$/.test(key)) {
      throw new ContractError(`${context}: invalid gate diagnostic count key`);
    }
    assertNonNegativeInteger(
      map[key],
      `${context}: invalid gate diagnostic count`
    );
  }
}

function assertGateBoundaryPolicySafe(policy, context) {
  assertBoundaryPolicy(
    policy,
    [
      "booleans_counts_and_fixed_statuses_only",
      "script_names_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_live_payloads",
      "no_text_payloads",
      "no_support_message_text",
      "no_platform_cursor_values",
      "no_platform_ids",
      "no_candidates",
      "no_commands",
    ],
    `${context}: gate boundary policy`
  );
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

function assertAdapterValidation(value, context) {
  if (value.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertBoolean(value, context) {
  if (typeof value !== "boolean") {
    throw new ContractError(context);
  }
}

function assertStringStatus(value, context) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 80 ||
    !/^[a-zA-Z0-9_:-]+$/.test(value)
  ) {
    throw new ContractError(context);
  }
}

function assertEnvNameListSafe(value, context) {
  if (!Array.isArray(value)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of value) {
    if (typeof name !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
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

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function sanitizeCountMap(source, allowedKeys) {
  const safeSource =
    source && typeof source === "object" && !Array.isArray(source) ? source : {};
  return Object.fromEntries(
    allowedKeys.map((key) => [key, safeNonNegativeInteger(safeSource[key])])
  );
}

function assertCountMapSafe(map, allowedKeys, context) {
  if (!map || typeof map !== "object" || Array.isArray(map)) {
    throw new ContractError(`${context}: invalid support count map`);
  }
  const keys = Object.keys(map);
  if (keys.length !== allowedKeys.length) {
    throw new ContractError(`${context}: invalid support count map size`);
  }
  for (const key of allowedKeys) {
    assertNonNegativeInteger(map[key], `${context}: invalid support count`);
  }
  for (const key of keys) {
    if (!allowedKeys.includes(key)) {
      throw new ContractError(`${context}: unexpected support count key`);
    }
  }
}

function safeNonNegativeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function safeDiagnosticLabel(value) {
  const text = String(value).replace(/\s+/g, "_").trim().slice(0, 80);
  return /^[a-zA-Z0-9_:-]+$/.test(text) ? text : "attention";
}

function assertNoForbiddenYouTubeLiveReadinessFields(
  value,
  context,
  path = "root"
) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenYouTubeLiveReadinessFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_YOUTUBE_LIVE_READINESS_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { field, path });
    }
    assertNoForbiddenYouTubeLiveReadinessFields(child, context, `${path}.${field}`);
  }
}
