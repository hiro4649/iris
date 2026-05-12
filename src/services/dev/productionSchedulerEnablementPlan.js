import { ContractError } from "../../core/contracts.js";
import {
  assertGameplayPreflightReportSafe,
  createGameplayPreflightReport,
} from "./gameplayPreflight.js";
import {
  assertGameplayRuntimeStatusReportSafe,
  createGameplayRuntimeStatusReport,
} from "./gameplayRuntimeStatus.js";
import {
  assertYouTubeIngestPreflightReportSafe,
  createYouTubeIngestPreflightReport,
} from "./youtubeIngestPreflight.js";
import {
  assertYouTubeIngestRuntimeStatusReportSafe,
  createYouTubeIngestRuntimeStatusReport,
} from "./youtubeIngestRuntimeStatus.js";

const URL_PATTERN = /https?:\/\//i;
const SAFE_ENV_NAME_PATTERN = /^IRIS_[A-Z0-9_]+$/;
const SAFE_LABEL_PATTERN = /^[a-z0-9_]+$/;
const SAFE_SCRIPT_PATTERN =
  /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i;

const FORBIDDEN_SCHEDULER_PLAN_FIELDS = new Set([
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
  "canonical",
  "canonical_envelope",
  "internal_profile",
  "canonical_profile",
  "profile_enum",
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
  "raw_frame",
  "image",
  "frame",
  "ocr_text",
]);

const OVERALL_STATUSES = new Set([
  "scheduler_env_attention",
  "scheduler_runtime_attention",
  "stage_configuration_attention",
  "ready_for_runtime_rehearsal",
]);
const STAGE_IDS = new Set([
  "youtube_comments_and_support",
  "vision_and_safe_game_control",
]);
const PRODUCTION_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "scheduler_enablement_plan_only",
  "real_scheduler_not_started_by_plan",
  "live_polling_not_started_by_plan",
  "real_game_or_os_input_not_started",
  "youtube_support_messages_not_exposed",
  "memory_and_relationship_candidates_remain_gated",
  "game_action_proposals_remain_validation_gated",
  "scheduler_required_stage_count",
  "ready_stage_count",
  "attention_stage_count",
  "next_stage_id",
  "next_readiness_state",
  "readiness_state_counts",
  "next_stage_priority",
  "next_step_id",
  "next_script",
  "next_check_script",
]);
const EXPECTED_STAGE_IDS_BY_PRIORITY = Object.freeze({
  2: "youtube_comments_and_support",
  4: "vision_and_safe_game_control",
});
const EXPECTED_VERIFICATION_SCRIPTS = Object.freeze({
  scheduler_enablement_script: "npm run dev:production:scheduler-enablement",
  production_next_task_script: "npm run dev:production:next-task",
  production_runtime_handoff_status_script:
    "npm run dev:production:runtime-handoff-status",
  youtube_runtime_status_script: "npm run dev:youtube:runtime-status",
  youtube_readiness_rehearsal_script:
    "npm run dev:youtube:readiness-rehearsal",
  youtube_runtime_ingest_roundtrip_script:
    "npm run dev:youtube:runtime-ingest-roundtrip",
  gameplay_runtime_status_script: "npm run dev:gameplay:runtime-status",
  gameplay_readiness_rehearsal_script:
    "npm run dev:gameplay:readiness-rehearsal",
  gameplay_runtime_roundtrip_script: "npm run dev:gameplay:runtime-roundtrip",
});
const STAGE_STATUSES = new Set([
  "ready_for_runtime_rehearsal",
  "configuration_attention",
  "source_attention",
  "scheduler_env_disabled",
  "scheduler_unavailable",
  "waiting_for_scheduler_start",
  "runtime_event_attention",
]);
const BLOCKING_STAGES = new Set([
  "none",
  "configuration",
  "source",
  "scheduler_env",
  "scheduler_runtime",
  "scheduler_start",
  "runtime_events",
]);
const NEXT_STEP_IDS = new Set([
  "review_youtube_source",
  "enable_ingest_scheduler_env",
  "review_ingest_scheduler_runtime",
  "start_ingest_scheduler_runtime",
  "rehearse_youtube_runtime_ingest",
  "review_gameplay_configuration",
  "rehearse_gameplay_runtime",
  "monitor_runtime_rehearsal",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);

export function createProductionSchedulerEnablementPlan({
  env = process.env,
  httpIngestScheduler = null,
  streamState = null,
  runtime = null,
  gameControlAdapterStatus = null,
  generatedAtMs = Date.now(),
} = {}) {
  const youtubePreflight = createYouTubeIngestPreflightReport({
    env,
    generatedAtMs,
  });
  const youtubeRuntime = createYouTubeIngestRuntimeStatusReport({
    env,
    httpIngestScheduler,
    streamState,
    generatedAtMs,
  });
  const gameplayPreflight = createGameplayPreflightReport({ env, generatedAtMs });
  const gameplayRuntime = createGameplayRuntimeStatusReport({
    env,
    runtime,
    httpIngestScheduler,
    streamState,
    gameControlAdapterStatus,
    generatedAtMs,
  });

  assertYouTubeIngestPreflightReportSafe(
    youtubePreflight,
    "production scheduler enablement youtube preflight"
  );
  assertYouTubeIngestRuntimeStatusReportSafe(
    youtubeRuntime,
    "production scheduler enablement youtube runtime"
  );
  assertGameplayPreflightReportSafe(
    gameplayPreflight,
    "production scheduler enablement gameplay preflight"
  );
  assertGameplayRuntimeStatusReportSafe(
    gameplayRuntime,
    "production scheduler enablement gameplay runtime"
  );

  const stagePlans = [
    createYouTubeStagePlan({ preflight: youtubePreflight, runtime: youtubeRuntime }),
    createGameplayStagePlan({
      preflight: gameplayPreflight,
      runtime: gameplayRuntime,
    }),
  ];
  const nextStage = stagePlans.find((stage) => stage.ready !== true) ?? null;
  const nextReadinessState = nextStage?.readiness_state ?? "ready";
  const readinessStateCounts = countReadinessStates(stagePlans);
  const report = {
    schema: "iris_production_scheduler_enablement_plan_v1",
    generated_at_ms: generatedAtMs,
    overall_status: summarizeOverallStatus(stagePlans),
    scheduler_enabled_by_env: env.IRIS_ENABLE_HTTP_INGEST_SCHEDULER === "true",
    scheduler_required_stage_count: stagePlans.length,
    ready_stage_count: stagePlans.filter((stage) => stage.ready).length,
    attention_stage_count: stagePlans.filter((stage) => !stage.ready).length,
    next_stage_priority: nextStage?.priority ?? null,
    next_stage_id: nextStage?.stage_id ?? null,
    next_readiness_state: nextReadinessState,
    readiness_state_counts: readinessStateCounts,
    next_step_id: nextStage?.next_step_id ?? null,
    next_script: nextStage?.next_script ?? null,
    next_check_script: nextStage?.next_check_script ?? null,
    next_configure_env: nextStage?.next_configure_env ?? [],
    stage_plans: stagePlans,
    production_handoff_summary: {
      schema: "iris_production_scheduler_enablement_handoff_summary_v1",
      scheduler_enablement_plan_only: true,
      real_scheduler_not_started_by_plan: true,
      live_polling_not_started_by_plan: true,
      real_game_or_os_input_not_started: true,
      youtube_support_messages_not_exposed: true,
      memory_and_relationship_candidates_remain_gated: true,
      game_action_proposals_remain_validation_gated: true,
      scheduler_required_stage_count: stagePlans.length,
      ready_stage_count: stagePlans.filter((stage) => stage.ready).length,
      attention_stage_count: stagePlans.filter((stage) => !stage.ready).length,
      next_stage_id: nextStage?.stage_id ?? null,
      next_readiness_state: nextReadinessState,
      readiness_state_counts: readinessStateCounts,
      next_stage_priority: nextStage?.priority ?? null,
      next_step_id: nextStage?.next_step_id ?? null,
      next_script: nextStage?.next_script ?? null,
      next_check_script: nextStage?.next_check_script ?? null,
    },
    verification_scripts: {
      schema: "iris_production_scheduler_enablement_scripts_v1",
      scheduler_enablement_script:
        "npm run dev:production:scheduler-enablement",
      production_next_task_script: "npm run dev:production:next-task",
      production_runtime_handoff_status_script:
        "npm run dev:production:runtime-handoff-status",
      youtube_runtime_status_script: "npm run dev:youtube:runtime-status",
      youtube_readiness_rehearsal_script:
        "npm run dev:youtube:readiness-rehearsal",
      youtube_runtime_ingest_roundtrip_script:
        "npm run dev:youtube:runtime-ingest-roundtrip",
      gameplay_runtime_status_script: "npm run dev:gameplay:runtime-status",
      gameplay_readiness_rehearsal_script:
        "npm run dev:gameplay:readiness-rehearsal",
      gameplay_runtime_roundtrip_script: "npm run dev:gameplay:runtime-roundtrip",
      boundary_policy: {
        script_names_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
      },
    },
    scheduler_policy: {
      scheduler_env_review_required_before_live_polling: true,
      scheduler_start_is_operator_runtime_step: true,
      scheduler_plan_never_polls_sources: true,
      scheduler_plan_never_controls_game: true,
      youtube_support_messages_not_exposed: true,
      memory_and_relationship_candidates_remain_gated: true,
      game_action_proposals_remain_validation_gated: true,
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
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_raw_scheduler_results: true,
      no_raw_stream_state: true,
      no_polling_side_effects: true,
      no_control_side_effects: true,
      read_only_plan: true,
    },
    adapter_validation_required: true,
  };
  assertProductionSchedulerEnablementPlanSafe(report);
  return report;
}

export function assertProductionSchedulerEnablementPlanSafe(
  report,
  context = "production scheduler enablement plan"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenSchedulerPlanFields(report, context);
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_production_scheduler_enablement_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  assertNonNegativeInteger(report.generated_at_ms, `${context}: generated time`);
  if (!OVERALL_STATUSES.has(report.overall_status)) {
    throw new ContractError(`${context}: invalid overall status`);
  }
  if (typeof report.scheduler_enabled_by_env !== "boolean") {
    throw new ContractError(`${context}: invalid scheduler env flag`);
  }
  for (const field of [
    "scheduler_required_stage_count",
    "ready_stage_count",
    "attention_stage_count",
  ]) {
    assertNonNegativeInteger(report[field], `${context}: invalid ${field}`);
  }
  if (!Array.isArray(report.stage_plans) || report.stage_plans.length !== 2) {
    throw new ContractError(`${context}: two stage plans are required`);
  }
  assertSafeReadinessState(report.next_readiness_state, context);
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  if (
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      countReadinessStates(report.stage_plans)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  report.stage_plans.forEach((stage, index) =>
    assertSchedulerStagePlanSafe(stage, context, index === 0 ? 2 : 4)
  );
  if (report.overall_status !== summarizeOverallStatus(report.stage_plans)) {
    throw new ContractError(`${context}: invalid derived overall status`);
  }
  const firstAttentionStage =
    report.stage_plans.find((stage) => stage.ready !== true) ?? null;
  if (firstAttentionStage) {
    if (
      report.next_stage_priority !== firstAttentionStage.priority ||
      report.next_stage_id !== firstAttentionStage.stage_id ||
      report.next_readiness_state !== firstAttentionStage.readiness_state ||
      report.next_step_id !== firstAttentionStage.next_step_id ||
      report.next_script !== firstAttentionStage.next_script ||
      report.next_check_script !== firstAttentionStage.next_check_script ||
      JSON.stringify(report.next_configure_env) !==
        JSON.stringify(firstAttentionStage.next_configure_env)
    ) {
      throw new ContractError(`${context}: invalid next stage summary`);
    }
  } else if (
    report.next_stage_priority !== null ||
    report.next_stage_id !== null ||
    report.next_readiness_state !== "ready" ||
    report.next_step_id !== null ||
    report.next_script !== null ||
    report.next_check_script !== null ||
    !Array.isArray(report.next_configure_env) ||
    report.next_configure_env.length !== 0
  ) {
    throw new ContractError(`${context}: ready report has next stage`);
  }
  if (
    report.ready_stage_count !==
      report.stage_plans.filter((stage) => stage.ready).length ||
    report.attention_stage_count !==
      report.stage_plans.filter((stage) => !stage.ready).length ||
    report.scheduler_required_stage_count !== report.stage_plans.length
  ) {
    throw new ContractError(`${context}: invalid stage counts`);
  }
  assertVerificationScriptsSafe(report.verification_scripts, context);
  assertSchedulerPolicySafe(report.scheduler_policy, context);
  assertSchedulerHandoffSummarySafe(
    report.production_handoff_summary,
    report,
    context
  );
  assertBoundaryPolicy(report.boundary_policy, [
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
    "no_memory_records",
    "no_relationship_records",
    "no_candidates",
    "no_commands",
    "no_raw_frames",
    "no_raw_scheduler_results",
    "no_raw_stream_state",
    "no_polling_side_effects",
    "no_control_side_effects",
    "read_only_plan",
  ], context);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertSchedulerHandoffSummarySafe(summary, report, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (
    summary.schema !==
    "iris_production_scheduler_enablement_handoff_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: unexpected production handoff field ${field}`
      );
    }
  }
  for (const field of [
    "scheduler_enablement_plan_only",
    "real_scheduler_not_started_by_plan",
    "live_polling_not_started_by_plan",
    "real_game_or_os_input_not_started",
    "youtube_support_messages_not_exposed",
    "memory_and_relationship_candidates_remain_gated",
    "game_action_proposals_remain_validation_gated",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  for (const field of [
    "scheduler_required_stage_count",
    "ready_stage_count",
    "attention_stage_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid production handoff ${field}`
    );
  }
  if (
    summary.scheduler_required_stage_count !==
      report.scheduler_required_stage_count ||
    summary.ready_stage_count !== report.ready_stage_count ||
    summary.attention_stage_count !== report.attention_stage_count ||
    summary.ready_stage_count + summary.attention_stage_count !==
      summary.scheduler_required_stage_count
  ) {
    throw new ContractError(`${context}: invalid production handoff counts`);
  }
  if (
    summary.next_stage_id !== report.next_stage_id ||
    summary.next_readiness_state !== report.next_readiness_state ||
    summary.next_stage_priority !== report.next_stage_priority ||
    summary.next_step_id !== report.next_step_id ||
    summary.next_script !== report.next_script ||
    summary.next_check_script !== report.next_check_script
  ) {
    throw new ContractError(`${context}: invalid production handoff next step`);
  }
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  if (
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: invalid production handoff readiness`);
  }
  if (summary.next_stage_id !== null && !STAGE_IDS.has(summary.next_stage_id)) {
    throw new ContractError(`${context}: invalid production handoff stage`);
  }
  if (summary.next_step_id !== null && !NEXT_STEP_IDS.has(summary.next_step_id)) {
    throw new ContractError(`${context}: invalid production handoff step`);
  }
  for (const field of ["next_script", "next_check_script"]) {
    if (summary[field] !== null) {
      assertSafeScriptName(summary[field], `${context}: ${field}`);
    }
  }
}

function createYouTubeStagePlan({ preflight, runtime }) {
  const sourceReady = runtime.source_instantiation_status === "ready";
  const preflightReady =
    preflight.preflight_status === "ready_to_poll_youtube_ingest";
  const base = {
    schema: "iris_production_scheduler_stage_plan_v1",
    priority: 2,
    stage_id: "youtube_comments_and_support",
    scheduler_required: true,
    scheduler_enabled_by_env: preflight.ingest_scheduler_enabled,
    scheduler_available: runtime.scheduler_summary.scheduler_available,
    scheduler_running: runtime.scheduler_summary.running,
    configuration_ready: preflightReady || sourceReady,
    source_ready: sourceReady,
    preflight_status: preflight.preflight_status,
    runtime_status: runtime.runtime_status,
    stage_metric_count: runtime.scheduler_summary.youtube_source_count,
  };
  if (!sourceReady) {
    return stagePlan({
      ...base,
      ready: false,
      stage_status: "source_attention",
      blocking_stage: "source",
      next_step_id: "review_youtube_source",
      next_script: "npm run dev:youtube:source-status",
      next_check_script: "npm run dev:youtube:readiness-rehearsal",
      next_configure_env: uniqueEnvNames([
        ...preflight.missing_required_env,
        "IRIS_YOUTUBE_LIVE_CHAT_SOURCE",
      ]),
    });
  }
  if (!preflight.ingest_scheduler_enabled) {
    return stagePlan({
      ...base,
      ready: false,
      configuration_ready: preflight.missing_required_env.length === 0,
      stage_status: "scheduler_env_disabled",
      blocking_stage: "scheduler_env",
      next_step_id: "enable_ingest_scheduler_env",
      next_script: "npm run dev:youtube:preflight",
      next_check_script: "npm run dev:production:scheduler-enablement",
      next_configure_env: ["IRIS_ENABLE_HTTP_INGEST_SCHEDULER"],
    });
  }
  if (!preflightReady) {
    return stagePlan({
      ...base,
      ready: false,
      stage_status: "configuration_attention",
      blocking_stage: "configuration",
      next_step_id: "review_youtube_source",
      next_script: "npm run dev:youtube:preflight",
      next_check_script: "npm run dev:youtube:readiness-rehearsal",
      next_configure_env: preflight.missing_required_env,
    });
  }
  return stagePlanFromRuntime({
    ...base,
    readyRuntimeStatuses: new Set(["polling_active"]),
    runtimeReadyStatus: "polling_active",
    runtimeEventAttentionScript: "npm run dev:youtube:runtime-ingest-roundtrip",
    runtimeRehearsalScript: "npm run dev:youtube:readiness-rehearsal",
  });
}

function createGameplayStagePlan({ preflight, runtime }) {
  const preflightReady =
    preflight.preflight_status === "ready_to_poll_game_and_approve_control";
  const base = {
    schema: "iris_production_scheduler_stage_plan_v1",
    priority: 4,
    stage_id: "vision_and_safe_game_control",
    scheduler_required: true,
    scheduler_enabled_by_env: preflight.ingest_scheduler_enabled,
    scheduler_available: runtime.scheduler_summary.scheduler_available,
    scheduler_running: runtime.scheduler_summary.running,
    configuration_ready: preflightReady,
    source_ready:
      preflight.vision_target_configured === true &&
      preflight.vision_request_method_configured === true &&
      preflight.vision_request_method_supported === true &&
      preflight.vision_target_policy_status === "allowed" &&
      preflight.game_control_enabled === true &&
      preflight.game_control_http_adapter_ready === true &&
      preflight.game_control_target_configured === true &&
      preflight.game_control_target_policy_status === "allowed" &&
      preflight.available_actions_configured === true &&
      preflight.approved_action_kind_count > 0 &&
      preflight.unsupported_action_name_count === 0,
    preflight_status: preflight.preflight_status,
    runtime_status: runtime.runtime_status,
    stage_metric_count: runtime.scheduler_summary.game_observation_source_count,
  };
  if (!preflight.ingest_scheduler_enabled && base.source_ready) {
    return stagePlan({
      ...base,
      ready: false,
      stage_status: "scheduler_env_disabled",
      blocking_stage: "scheduler_env",
      next_step_id: "enable_ingest_scheduler_env",
      next_script: "npm run dev:gameplay:preflight",
      next_check_script: "npm run dev:production:scheduler-enablement",
      next_configure_env: ["IRIS_ENABLE_HTTP_INGEST_SCHEDULER"],
    });
  }
  if (!preflightReady) {
    return stagePlan({
      ...base,
      ready: false,
      stage_status: "configuration_attention",
      blocking_stage: "configuration",
      next_step_id: "review_gameplay_configuration",
      next_script: "npm run dev:gameplay:preflight",
      next_check_script: "npm run dev:gameplay:readiness-rehearsal",
      next_configure_env: preflight.missing_required_env,
    });
  }
  return stagePlanFromRuntime({
    ...base,
    readyRuntimeStatuses: new Set([
      "polling_active_waiting_for_game_observation",
      "game_observation_active",
      "safe_control_active",
    ]),
    runtimeReadyStatus: "ready_for_runtime_rehearsal",
    runtimeEventAttentionScript: "npm run dev:gameplay:runtime-roundtrip",
    runtimeRehearsalScript: "npm run dev:gameplay:readiness-rehearsal",
  });
}

function stagePlanFromRuntime({
  readyRuntimeStatuses,
  runtimeReadyStatus,
  runtimeEventAttentionScript,
  runtimeRehearsalScript,
  ...base
}) {
  if (!base.scheduler_available) {
    return stagePlan({
      ...base,
      ready: false,
      stage_status: "scheduler_unavailable",
      blocking_stage: "scheduler_runtime",
      next_step_id: "review_ingest_scheduler_runtime",
      next_script:
        base.stage_id === "youtube_comments_and_support"
          ? "npm run dev:youtube:runtime-status"
          : "npm run dev:gameplay:runtime-status",
      next_check_script: "npm run dev:production:scheduler-enablement",
      next_configure_env: [],
    });
  }
  if (!base.scheduler_running) {
    return stagePlan({
      ...base,
      ready: false,
      stage_status: "waiting_for_scheduler_start",
      blocking_stage: "scheduler_start",
      next_step_id: "start_ingest_scheduler_runtime",
      next_script:
        base.stage_id === "youtube_comments_and_support"
          ? "npm run dev:youtube:runtime-status"
          : "npm run dev:gameplay:runtime-status",
      next_check_script: "npm run dev:production:scheduler-enablement",
      next_configure_env: [],
    });
  }
  if (readyRuntimeStatuses.has(base.runtime_status)) {
    return stagePlan({
      ...base,
      ready: true,
      stage_status: runtimeReadyStatus,
      blocking_stage: "none",
      next_step_id: "monitor_runtime_rehearsal",
      next_script: runtimeRehearsalScript,
      next_check_script: "npm run dev:production:scheduler-enablement",
      next_configure_env: [],
    });
  }
  return stagePlan({
    ...base,
    ready: false,
    stage_status: "runtime_event_attention",
    blocking_stage: "runtime_events",
    next_step_id:
      base.stage_id === "youtube_comments_and_support"
        ? "rehearse_youtube_runtime_ingest"
        : "rehearse_gameplay_runtime",
    next_script: runtimeEventAttentionScript,
    next_check_script: runtimeRehearsalScript,
    next_configure_env: [],
  });
}

function stagePlan(plan) {
  return {
    ...plan,
    readiness_state: readinessStateForStagePlan(plan),
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      counts_statuses_and_booleans_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_support_message_text: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_raw_scheduler_results: true,
      no_raw_stream_state: true,
      no_polling_side_effects: true,
      no_control_side_effects: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeOverallStatus(stagePlans) {
  if (stagePlans.every((stage) => stage.ready)) {
    return "ready_for_runtime_rehearsal";
  }
  const first = stagePlans.find((stage) => !stage.ready);
  if (first?.blocking_stage === "scheduler_env") return "scheduler_env_attention";
  if (
    first?.blocking_stage === "scheduler_runtime" ||
    first?.blocking_stage === "scheduler_start" ||
    first?.blocking_stage === "runtime_events"
  ) {
    return "scheduler_runtime_attention";
  }
  return "stage_configuration_attention";
}

function readinessStateForStagePlan(plan) {
  if (plan.ready === true) return "ready";
  if (
    plan.blocking_stage === "scheduler_runtime" ||
    plan.blocking_stage === "runtime_events"
  ) {
    return "runtime_waiting";
  }
  if (plan.blocking_stage === "scheduler_start") return "real_device_waiting";
  if (
    plan.blocking_stage === "configuration" ||
    plan.blocking_stage === "source" ||
    plan.blocking_stage === "scheduler_env"
  ) {
    return "configuration_waiting";
  }
  return "operator_review_required";
}

function assertSchedulerStagePlanSafe(stage, context, expectedPriority) {
  if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
    throw new ContractError(`${context}: invalid stage plan`);
  }
  if (stage.schema !== "iris_production_scheduler_stage_plan_v1") {
    throw new ContractError(`${context}: invalid stage schema`);
  }
  if (stage.priority !== expectedPriority) {
    throw new ContractError(`${context}: invalid stage priority`);
  }
  if (!STAGE_IDS.has(stage.stage_id)) {
    throw new ContractError(`${context}: invalid stage id`);
  }
  if (stage.stage_id !== EXPECTED_STAGE_IDS_BY_PRIORITY[expectedPriority]) {
    throw new ContractError(`${context}: invalid stage id for priority`);
  }
  if (typeof stage.ready !== "boolean") {
    throw new ContractError(`${context}: invalid ready flag`);
  }
  assertSafeReadinessState(stage.readiness_state, context);
  if (stage.ready === true && stage.readiness_state !== "ready") {
    throw new ContractError(`${context}: ready stage must have ready readiness state`);
  }
  for (const field of [
    "scheduler_required",
    "scheduler_enabled_by_env",
    "scheduler_available",
    "scheduler_running",
    "configuration_ready",
    "source_ready",
  ]) {
    if (typeof stage[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "stage_status",
    "blocking_stage",
    "next_step_id",
    "preflight_status",
    "runtime_status",
  ]) {
    if (!isSafeLabel(stage[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!STAGE_STATUSES.has(stage.stage_status)) {
    throw new ContractError(`${context}: invalid stage status`);
  }
  if (!BLOCKING_STAGES.has(stage.blocking_stage)) {
    throw new ContractError(`${context}: invalid blocking stage`);
  }
  if (!NEXT_STEP_IDS.has(stage.next_step_id)) {
    throw new ContractError(`${context}: invalid next step`);
  }
  assertSafeScriptName(stage.next_script, `${context}: next script`);
  assertSafeScriptName(stage.next_check_script, `${context}: next check script`);
  assertEnvNameList(stage.next_configure_env, `${context}: next env`);
  assertNonNegativeInteger(stage.stage_metric_count, `${context}: stage metric count`);
  if (stage.ready === true && stage.blocking_stage !== "none") {
    throw new ContractError(`${context}: ready stage must not block`);
  }
  if (
    stage.stage_status === "scheduler_env_disabled" &&
    !stage.next_configure_env.includes("IRIS_ENABLE_HTTP_INGEST_SCHEDULER")
  ) {
    throw new ContractError(`${context}: scheduler env next step required`);
  }
  assertBoundaryPolicy(stage.boundary_policy, [
    "env_names_only",
    "script_names_only",
    "counts_statuses_and_booleans_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_text_payloads",
    "no_support_message_text",
    "no_candidates",
    "no_commands",
    "no_raw_frames",
    "no_raw_scheduler_results",
    "no_raw_stream_state",
    "no_polling_side_effects",
    "no_control_side_effects",
  ], `${context}: stage`);
  if (stage.adapter_validation_required !== true) {
    throw new ContractError(`${context}: stage adapter validation required`);
  }
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_production_scheduler_enablement_scripts_v1") {
    throw new ContractError(`${context}: invalid scripts schema`);
  }
  for (const field of [
    "scheduler_enablement_script",
    "production_next_task_script",
    "production_runtime_handoff_status_script",
    "youtube_runtime_status_script",
    "youtube_readiness_rehearsal_script",
    "youtube_runtime_ingest_roundtrip_script",
    "gameplay_runtime_status_script",
    "gameplay_readiness_rehearsal_script",
    "gameplay_runtime_roundtrip_script",
  ]) {
    assertSafeScriptName(scripts[field], `${context}: ${field}`);
    if (scripts[field] !== EXPECTED_VERIFICATION_SCRIPTS[field]) {
      throw new ContractError(`${context}: invalid verification script ${field}`);
    }
  }
  assertBoundaryPolicy(scripts.boundary_policy, [
    "script_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_payloads",
    "no_candidates",
    "no_commands",
  ], `${context}: scripts`);
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

function assertSchedulerPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: scheduler policy required`);
  }
  for (const field of [
    "scheduler_env_review_required_before_live_polling",
    "scheduler_start_is_operator_runtime_step",
    "scheduler_plan_never_polls_sources",
    "scheduler_plan_never_controls_game",
    "youtube_support_messages_not_exposed",
    "memory_and_relationship_candidates_remain_gated",
    "game_action_proposals_remain_validation_gated",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid scheduler policy ${field}`);
    }
  }
}

function uniqueEnvNames(names) {
  return [...new Set(names.filter((name) => SAFE_ENV_NAME_PATTERN.test(name)))];
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
}

function assertSafeScriptName(script, context) {
  if (typeof script !== "string" || !SAFE_SCRIPT_PATTERN.test(script)) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function isSafeLabel(value) {
  return typeof value === "string" && SAFE_LABEL_PATTERN.test(value);
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
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

function assertSafeReadinessState(state, context) {
  if (!READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  for (const state of READINESS_STATES) {
    assertNonNegativeInteger(
      counts[state],
      `${context}: invalid readiness state count`
    );
  }
  for (const state of Object.keys(counts)) {
    if (!READINESS_STATES.has(state)) {
      throw new ContractError(`${context}: unexpected readiness state count`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every((state) => left?.[state] === right?.[state]);
}

function assertNoForbiddenSchedulerPlanFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenSchedulerPlanFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_SCHEDULER_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { path, field });
    }
    assertNoForbiddenSchedulerPlanFields(child, context, `${path}.${field}`);
  }
}
