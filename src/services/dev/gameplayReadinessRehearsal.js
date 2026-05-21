import { ContractError } from "../../core/contracts.js";
import {
  assertGameplayEnvSetupPlanSafe,
  createGameplayEnvSetupPlan,
} from "./gameplayEnvSetupPlan.js";
import {
  assertGameplayLaunchPlanSafe,
  createGameplayLaunchPlan,
} from "./gameplayLaunchPlan.js";
import {
  assertGameplayLiveReadinessReportSafe,
  createGameplayLiveReadinessReport,
} from "./gameplayLiveReadiness.js";
import {
  assertGameplayPreflightReportSafe,
  createGameplayPreflightReport,
} from "./gameplayPreflight.js";
import {
  assertGameplayRuntimeStatusReportSafe,
  createGameplayRuntimeStatusReport,
} from "./gameplayRuntimeStatus.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const SAFE_ENV_NAME_PATTERN = /^IRIS_[A-Z0-9_]+$/;
const SAFE_STATUS_PATTERN = /^[a-z0-9_]+$/;
const SAFE_SCRIPT_PATTERN =
  /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i;

const FORBIDDEN_GAMEPLAY_REHEARSAL_FIELDS = new Set([
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
  "raw_frame",
  "image",
  "frame",
  "ocr_text",
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

const GAMEPLAY_READINESS_REHEARSAL_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "rehearsal_status",
  "preflight_status",
  "preflight_attention_reason_count",
  "preflight_next_attention_reason",
  "launch_plan_status",
  "env_setup_plan_status",
  "runtime_status",
  "live_readiness_status",
  "configured_gameplay_path_ready",
  "configured_rehearsal_ready",
  "scheduler_rehearsal_ready",
  "vision_rehearsal_ready",
  "action_gate_rehearsal_ready",
  "adapter_rehearsal_ready",
  "safe_control_rehearsal_ready",
  "live_safe_control_ready",
  "capture_attempt_performed",
  "game_control_attempt_performed",
  "adapter_handoff_attempt_performed",
  "input_action_candidate_forwarded_to_adapter",
  "approved_game_action_forwarded_to_adapter",
  "rehearsal_requires_validation_gate_roundtrip",
  "next_step_id",
  "next_step_script",
  "next_check_script",
  "next_readiness_state",
  "readiness_state_counts",
  "next_configure_env",
  "runtime_flow_summary",
  "gate_summary",
  "verification_scripts",
  "safe_control_policy",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);

const REHEARSAL_STATUSES = new Set([
  "ready_for_gameplay_safe_control",
  "ready_for_configured_gameplay_rehearsal",
  "configuration_rehearsal_attention",
  "scheduler_rehearsal_attention",
  "vision_rehearsal_attention",
  "action_gate_rehearsal_attention",
  "adapter_rehearsal_attention",
  "safe_control_rehearsal_attention",
]);
const PREFLIGHT_STATUSES = new Set([
  "ready_to_poll_game_and_approve_control",
  "blocked_by_configuration",
]);
const LAUNCH_PLAN_STATUSES = new Set([
  "ready_to_launch_gameplay_control",
  "configure_gameplay_env_first",
]);
const ENV_SETUP_PLAN_STATUSES = new Set([
  "ready_for_gameplay_env_setup",
  "configure_gameplay_env_first",
]);
const RUNTIME_STATUSES = new Set([
  "attention_required",
  "scheduler_unavailable",
  "configured_waiting_for_scheduler_start",
  "polling_active_waiting_for_game_observation",
  "game_observation_active",
  "safe_control_active",
  "gameplay_runtime_attention",
]);
const LIVE_READINESS_STATUSES = new Set([
  "configuration_attention",
  "scheduler_attention",
  "vision_attention",
  "action_gate_attention",
  "adapter_attention",
  "safe_control_attention",
  "ready_for_gameplay_safe_control",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const NEXT_STEP_IDS = new Set([
  "review_gameplay_preflight",
  "review_gameplay_runtime_status",
  "run_vision_game_roundtrip",
  "run_gameplay_validation_gate_roundtrip",
  "run_game_control_roundtrip",
  "run_gameplay_runtime_roundtrip",
  "monitor_gameplay_live_readiness",
]);

export function createGameplayReadinessRehearsal({
  env = process.env,
  runtime = null,
  httpIngestScheduler = null,
  streamState = null,
  gameControlAdapterStatus = null,
  generatedAtMs = Date.now(),
} = {}) {
  const preflight = createGameplayPreflightReport({ env, generatedAtMs });
  const launchPlan = createGameplayLaunchPlan({ env, generatedAtMs });
  const envSetupPlan = createGameplayEnvSetupPlan({ env, generatedAtMs });
  const runtimeStatus = createGameplayRuntimeStatusReport({
    env,
    runtime,
    httpIngestScheduler,
    streamState,
    gameControlAdapterStatus,
    generatedAtMs,
  });
  const liveReadiness = createGameplayLiveReadinessReport({
    env,
    runtime,
    httpIngestScheduler,
    streamState,
    gameControlAdapterStatus,
    generatedAtMs,
  });

  assertGameplayPreflightReportSafe(preflight, "gameplay rehearsal preflight");
  assertGameplayLaunchPlanSafe(launchPlan, "gameplay rehearsal launch plan");
  assertGameplayEnvSetupPlanSafe(
    envSetupPlan,
    "gameplay rehearsal env setup plan"
  );
  assertGameplayRuntimeStatusReportSafe(
    runtimeStatus,
    "gameplay rehearsal runtime status"
  );
  assertGameplayLiveReadinessReportSafe(
    liveReadiness,
    "gameplay rehearsal live readiness"
  );

  const configurationReady =
    preflight.preflight_status === "ready_to_poll_game_and_approve_control" &&
    launchPlan.plan_status === "ready_to_launch_gameplay_control" &&
    envSetupPlan.plan_status === "ready_for_gameplay_env_setup";
  const schedulerReady = liveReadiness.scheduler_gate.ready === true;
  const visionReady = liveReadiness.vision_capture_gate.ready === true;
  const actionGateReady = liveReadiness.action_gate.ready === true;
  const adapterReady = liveReadiness.adapter_gate.ready === true;
  const safeControlReady = liveReadiness.safe_control_gate.ready === true;
  const liveControlReady =
    liveReadiness.live_readiness_status === "ready_for_gameplay_safe_control";
  const configuredRehearsalReady =
    configurationReady &&
    preflight.vision_target_policy_status === "allowed" &&
    preflight.game_control_target_policy_status === "allowed" &&
    preflight.approved_action_kind_count > 0 &&
    preflight.unsupported_action_name_count === 0;
  const rehearsalStatus = summarizeRehearsalStatus({
    configurationReady,
    schedulerReady,
    visionReady,
    actionGateReady,
    adapterReady,
    safeControlReady,
    liveControlReady,
    configuredRehearsalReady,
  });
  const nextStep = summarizeNextStep({
    rehearsalStatus,
    preflight,
    envSetupPlan,
    runtimeStatus,
    liveReadiness,
  });

  const rehearsal = {
    schema: "iris_gameplay_readiness_rehearsal_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "vision_and_safe_game_control",
    target_stage_priority: 4,
    rehearsal_status: rehearsalStatus,
    preflight_status: preflight.preflight_status,
    preflight_attention_reason_count: preflight.attention_reason_count,
    preflight_next_attention_reason: preflight.next_attention_reason,
    launch_plan_status: launchPlan.plan_status,
    env_setup_plan_status: envSetupPlan.plan_status,
    runtime_status: runtimeStatus.runtime_status,
    live_readiness_status: liveReadiness.live_readiness_status,
    configured_gameplay_path_ready: configurationReady,
    configured_rehearsal_ready: configuredRehearsalReady,
    scheduler_rehearsal_ready: schedulerReady,
    vision_rehearsal_ready: visionReady,
    action_gate_rehearsal_ready: actionGateReady,
    adapter_rehearsal_ready: adapterReady,
    safe_control_rehearsal_ready: safeControlReady,
    live_safe_control_ready: liveControlReady,
    capture_attempt_performed: false,
    game_control_attempt_performed: false,
    adapter_handoff_attempt_performed: false,
    input_action_candidate_forwarded_to_adapter: false,
    approved_game_action_forwarded_to_adapter: false,
    rehearsal_requires_validation_gate_roundtrip:
      configuredRehearsalReady && !liveControlReady,
    next_step_id: nextStep.next_step_id,
    next_step_script: nextStep.next_step_script,
    next_check_script: nextStep.next_check_script,
    next_readiness_state: readinessStateForRehearsalStatus(rehearsalStatus),
    readiness_state_counts: countReadinessStates([
      { readiness_state: readinessStateForRehearsalStatus(rehearsalStatus) },
      runtimeStatus.game_vision_capture_flow,
      runtimeStatus.action_gate_flow,
      runtimeStatus.safe_control_flow,
      runtimeStatus.vision_to_safe_action_flow,
      runtimeStatus.safe_action_lifecycle_flow,
      liveReadiness.configuration_gate,
      liveReadiness.scheduler_gate,
      liveReadiness.vision_capture_gate,
      liveReadiness.action_gate,
      liveReadiness.adapter_gate,
      liveReadiness.safe_control_gate,
      liveReadiness.lifecycle_gate,
      liveReadiness.vision_to_action_gate,
    ]),
    next_configure_env: nextStep.next_configure_env,
    runtime_flow_summary: {
      schema: "iris_gameplay_rehearsal_runtime_flow_summary_v1",
      next_runtime_check_script: runtimeStatus.next_runtime_check_script,
      next_readiness_state: runtimeStatus.next_readiness_state,
      readiness_state_counts: runtimeStatus.readiness_state_counts,
      scheduler_available:
        runtimeStatus.scheduler_summary.scheduler_available,
      scheduler_running: runtimeStatus.scheduler_summary.running,
      scheduler_ticking: runtimeStatus.scheduler_summary.ticking,
      game_observation_source_count:
        runtimeStatus.scheduler_summary.game_observation_source_count,
      scheduler_processed_count: runtimeStatus.scheduler_summary.processed_count,
      scheduler_source_error_count:
        runtimeStatus.scheduler_summary.source_error_count,
      vision_capture_flow_status:
        runtimeStatus.game_vision_capture_flow.flow_status,
      vision_capture_readiness_state:
        runtimeStatus.game_vision_capture_flow.readiness_state,
      vision_capture_blocking_stage:
        runtimeStatus.game_vision_capture_flow.blocking_stage,
      capture_request_seen:
        runtimeStatus.game_vision_capture_flow.capture_request_seen,
      game_observation_seen:
        runtimeStatus.game_vision_capture_flow.game_observation_seen,
      low_confidence_observed:
        runtimeStatus.game_vision_capture_flow.low_confidence_observed,
      action_gate_flow_status: runtimeStatus.action_gate_flow.flow_status,
      action_gate_readiness_state: runtimeStatus.action_gate_flow.readiness_state,
      validation_seen: runtimeStatus.action_gate_flow.validation_seen,
      validation_passed: runtimeStatus.action_gate_flow.validation_passed,
      validated_control_available:
        runtimeStatus.action_gate_flow.validated_control_available,
      adapter_handoff_seen:
        runtimeStatus.action_gate_flow.adapter_handoff_seen,
      adapter_handoff_accepted:
        runtimeStatus.action_gate_flow.adapter_handoff_accepted,
      rejected_before_adapter:
        runtimeStatus.action_gate_flow.rejected_before_adapter,
      safe_control_flow_status: runtimeStatus.safe_control_flow.flow_status,
      safe_control_readiness_state:
        runtimeStatus.safe_control_flow.readiness_state,
      safe_control_blocking_stage:
        runtimeStatus.safe_control_flow.blocking_stage,
      vision_to_action_flow_status:
        runtimeStatus.vision_to_safe_action_flow.flow_status,
      vision_to_action_readiness_state:
        runtimeStatus.vision_to_safe_action_flow.readiness_state,
      vision_to_action_blocking_stage:
        runtimeStatus.vision_to_safe_action_flow.blocking_stage,
      lifecycle_flow_status:
        runtimeStatus.safe_action_lifecycle_flow.flow_status,
      lifecycle_readiness_state:
        runtimeStatus.safe_action_lifecycle_flow.readiness_state,
      lifecycle_blocking_stage:
        runtimeStatus.safe_action_lifecycle_flow.blocking_stage,
      adapter_readiness_status:
        runtimeStatus.game_control_adapter_runtime.game_control_readiness_status,
      adapter_request_count:
        runtimeStatus.game_control_adapter_runtime.request_count,
      adapter_accepted_count:
        runtimeStatus.game_control_adapter_runtime.accepted_count,
      adapter_failed_count:
        runtimeStatus.game_control_adapter_runtime.failed_count,
      adapter_expired_action_count:
        runtimeStatus.game_control_adapter_runtime.expired_action_count,
      boundary_policy: {
        counts_statuses_and_booleans_only: true,
        no_raw_stream_state: true,
        no_raw_scheduler_results: true,
        no_raw_frames: true,
        no_raw_ocr_text: true,
        no_vision_payloads: true,
        no_action_candidates: true,
        no_approved_actions: true,
        no_commands: true,
        script_names_only: true,
      },
    },
    gate_summary: createGateSummary(liveReadiness),
    verification_scripts: {
      schema: "iris_gameplay_rehearsal_scripts_v1",
      rehearsal_script: "npm run dev:gameplay:readiness-rehearsal",
      preflight_script: "npm run dev:gameplay:preflight",
      env_setup_plan_script: "npm run dev:gameplay:env-setup-plan",
      launch_plan_script: "npm run dev:gameplay:launch-plan",
      runtime_status_script: "npm run dev:gameplay:runtime-status",
      live_readiness_script: "npm run dev:gameplay:live-readiness",
      validation_gate_roundtrip_script:
        "npm run dev:gameplay:validation-gate-roundtrip",
      runtime_roundtrip_script: "npm run dev:gameplay:runtime-roundtrip",
      vision_roundtrip_script: "npm run dev:vision:game-roundtrip",
      game_control_roundtrip_script: "npm run dev:game-control:roundtrip",
      boundary_policy: {
        script_names_only: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_raw_frames: true,
        no_raw_ocr_text: true,
        no_vision_payloads: true,
        no_candidates: true,
        no_approved_actions: true,
        no_commands: true,
      },
    },
    safe_control_policy: {
      input_action_candidates_are_review_only: true,
      input_action_candidates_never_forwarded_to_adapter: true,
      approved_game_action_required_before_adapter: true,
      rehearsal_never_captures_screen: true,
      rehearsal_never_controls_game: true,
      viewer_comments_cannot_directly_control_game: true,
      fresh_observation_required_before_adapter: true,
      stale_future_or_low_confidence_blocks_before_adapter: true,
      adapter_ack_shape_only: true,
    },
    production_handoff_summary: {
      schema: "iris_gameplay_rehearsal_handoff_summary_v1",
      rehearsal_report_only: true,
      capture_attempt_not_performed: true,
      game_control_attempt_not_performed: true,
      adapter_handoff_attempt_not_performed: true,
      input_action_candidates_never_forwarded_directly: true,
      approved_actions_not_forwarded_by_rehearsal: true,
      no_real_game_or_os_input_started_by_rehearsal: true,
      no_control_side_effects_by_rehearsal: true,
      raw_frames_not_exposed: true,
      raw_ocr_text_not_exposed: true,
      rehearsal_status: rehearsalStatus,
      ready_gate_count: createGateSummary(liveReadiness).ready_gate_count,
      attention_gate_count: createGateSummary(liveReadiness).attention_gate_count,
      adapter_request_count:
        runtimeStatus.game_control_adapter_runtime.request_count,
      adapter_accepted_count:
        runtimeStatus.game_control_adapter_runtime.accepted_count,
      adapter_failed_count:
        runtimeStatus.game_control_adapter_runtime.failed_count,
      adapter_expired_action_count:
        runtimeStatus.game_control_adapter_runtime.expired_action_count,
      next_step_id: nextStep.next_step_id,
      next_step_script: nextStep.next_step_script,
      next_check_script: nextStep.next_check_script,
      next_readiness_state: readinessStateForRehearsalStatus(rehearsalStatus),
      readiness_state_counts: countReadinessStates([
        { readiness_state: readinessStateForRehearsalStatus(rehearsalStatus) },
        liveReadiness.configuration_gate,
        liveReadiness.scheduler_gate,
        liveReadiness.vision_capture_gate,
        liveReadiness.action_gate,
        liveReadiness.adapter_gate,
        liveReadiness.safe_control_gate,
        liveReadiness.lifecycle_gate,
        liveReadiness.vision_to_action_gate,
      ]),
    },
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      booleans_counts_and_fixed_statuses_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_raw_frames: true,
      no_raw_ocr_text: true,
      no_vision_payloads: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      no_raw_stream_state: true,
      no_raw_scheduler_results: true,
      no_polling_side_effects: true,
      no_control_side_effects: true,
      read_only_rehearsal: true,
    },
    adapter_validation_required: true,
  };
  assertGameplayReadinessRehearsalSafe(rehearsal);
  return rehearsal;
}

export function assertGameplayReadinessRehearsalSafe(
  rehearsal,
  context = "gameplay readiness rehearsal"
) {
  if (!rehearsal || typeof rehearsal !== "object" || Array.isArray(rehearsal)) {
    throw new ContractError(`${context}: rehearsal is required`);
  }
  assertNoForbiddenFields(rehearsal, context);
  assertNoUrlStrings(rehearsal, context);
  if (rehearsal.schema !== "iris_gameplay_readiness_rehearsal_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(rehearsal)) {
    if (!GAMEPLAY_READINESS_REHEARSAL_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected rehearsal field`, { field });
    }
  }
  assertNonNegativeInteger(
    rehearsal.generated_at_ms,
    `${context}: invalid generated timestamp`
  );
  if (rehearsal.target_stage_id !== "vision_and_safe_game_control") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (rehearsal.target_stage_priority !== 4) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!REHEARSAL_STATUSES.has(rehearsal.rehearsal_status)) {
    throw new ContractError(`${context}: invalid rehearsal status`);
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
  if (!RUNTIME_STATUSES.has(rehearsal.runtime_status)) {
    throw new ContractError(`${context}: invalid runtime status`);
  }
  if (!LIVE_READINESS_STATUSES.has(rehearsal.live_readiness_status)) {
    throw new ContractError(`${context}: invalid live readiness status`);
  }
  for (const field of [
    "configured_gameplay_path_ready",
    "configured_rehearsal_ready",
    "scheduler_rehearsal_ready",
    "vision_rehearsal_ready",
    "action_gate_rehearsal_ready",
    "adapter_rehearsal_ready",
    "safe_control_rehearsal_ready",
    "live_safe_control_ready",
    "capture_attempt_performed",
    "game_control_attempt_performed",
    "adapter_handoff_attempt_performed",
    "input_action_candidate_forwarded_to_adapter",
    "approved_game_action_forwarded_to_adapter",
    "rehearsal_requires_validation_gate_roundtrip",
  ]) {
    assertBoolean(rehearsal[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "capture_attempt_performed",
    "game_control_attempt_performed",
    "adapter_handoff_attempt_performed",
    "input_action_candidate_forwarded_to_adapter",
    "approved_game_action_forwarded_to_adapter",
  ]) {
    if (rehearsal[field] !== false) {
      throw new ContractError(`${context}: rehearsal side effect boundary failed`);
    }
  }
  if (!NEXT_STEP_IDS.has(rehearsal.next_step_id)) {
    throw new ContractError(`${context}: invalid next step id`);
  }
  assertSafeScriptName(rehearsal.next_step_script, `${context}: next step script`);
  assertSafeScriptName(rehearsal.next_check_script, `${context}: next check script`);
  assertSafeReadinessState(rehearsal.next_readiness_state, context);
  if (
    rehearsal.next_readiness_state !==
    readinessStateForRehearsalStatus(rehearsal.rehearsal_status)
  ) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  assertReadinessStateCountsSafe(rehearsal.readiness_state_counts, context);
  assertEnvNameList(rehearsal.next_configure_env, `${context}: next configure env`);
  assertRuntimeFlowSummarySafe(rehearsal.runtime_flow_summary, context);
  assertGateSummarySafe(rehearsal.gate_summary, context);
  assertVerificationScriptsSafe(rehearsal.verification_scripts, context);
  assertSafeControlPolicySafe(rehearsal.safe_control_policy, context);
  assertProductionHandoffSummarySafe(
    rehearsal.production_handoff_summary,
    rehearsal,
    context
  );
  assertBoundaryPolicy(rehearsal.boundary_policy, [
    "env_names_only",
    "script_names_only",
    "booleans_counts_and_fixed_statuses_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_raw_frames",
    "no_raw_ocr_text",
    "no_vision_payloads",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
    "no_raw_stream_state",
    "no_raw_scheduler_results",
    "no_polling_side_effects",
    "no_control_side_effects",
    "read_only_rehearsal",
  ], context);
  if (rehearsal.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
  if (
    rehearsal.rehearsal_status === "ready_for_gameplay_safe_control" &&
    rehearsal.live_safe_control_ready !== true
  ) {
    throw new ContractError(`${context}: live-ready rehearsal mismatch`);
  }
  if (
    rehearsal.rehearsal_status === "ready_for_configured_gameplay_rehearsal" &&
    rehearsal.configured_rehearsal_ready !== true
  ) {
    throw new ContractError(`${context}: configured rehearsal mismatch`);
  }
}

function assertProductionHandoffSummarySafe(summary, rehearsal, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_gameplay_rehearsal_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of [
    "rehearsal_report_only",
    "capture_attempt_not_performed",
    "game_control_attempt_not_performed",
    "adapter_handoff_attempt_not_performed",
    "input_action_candidates_never_forwarded_directly",
    "approved_actions_not_forwarded_by_rehearsal",
    "no_real_game_or_os_input_started_by_rehearsal",
    "no_control_side_effects_by_rehearsal",
    "raw_frames_not_exposed",
    "raw_ocr_text_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (
    summary.rehearsal_status !== rehearsal.rehearsal_status ||
    summary.ready_gate_count !== rehearsal.gate_summary.ready_gate_count ||
    summary.attention_gate_count !== rehearsal.gate_summary.attention_gate_count ||
    summary.adapter_request_count !==
      rehearsal.runtime_flow_summary.adapter_request_count ||
    summary.adapter_accepted_count !==
      rehearsal.runtime_flow_summary.adapter_accepted_count ||
    summary.adapter_failed_count !==
      rehearsal.runtime_flow_summary.adapter_failed_count ||
    summary.adapter_expired_action_count !==
      rehearsal.runtime_flow_summary.adapter_expired_action_count ||
    summary.next_step_id !== rehearsal.next_step_id ||
    summary.next_step_script !== rehearsal.next_step_script ||
    summary.next_check_script !== rehearsal.next_check_script ||
    summary.next_readiness_state !== rehearsal.next_readiness_state
  ) {
    throw new ContractError(`${context}: invalid production handoff totals`);
  }
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  const expectedHandoffReadinessCounts = {
    ...rehearsal.gate_summary.readiness_state_counts,
  };
  expectedHandoffReadinessCounts[rehearsal.next_readiness_state] += 1;
  if (
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      expectedHandoffReadinessCounts
    )
  ) {
    throw new ContractError(`${context}: invalid production handoff readiness counts`);
  }
  assertNonNegativeInteger(summary.ready_gate_count, `${context}: invalid ready gate count`);
  assertNonNegativeInteger(
    summary.attention_gate_count,
    `${context}: invalid attention gate count`
  );
  assertNonNegativeInteger(
    summary.adapter_request_count,
    `${context}: invalid adapter request count`
  );
  assertNonNegativeInteger(
    summary.adapter_accepted_count,
    `${context}: invalid adapter accepted count`
  );
  assertNonNegativeInteger(
    summary.adapter_failed_count,
    `${context}: invalid adapter failed count`
  );
  assertNonNegativeInteger(
    summary.adapter_expired_action_count,
    `${context}: invalid adapter expired action count`
  );
  if (!NEXT_STEP_IDS.has(summary.next_step_id)) {
    throw new ContractError(`${context}: invalid production handoff next step`);
  }
  assertSafeScriptName(summary.next_step_script, `${context}: handoff next step script`);
  assertSafeScriptName(summary.next_check_script, `${context}: handoff next check script`);
}

function summarizeRehearsalStatus({
  configurationReady,
  schedulerReady,
  visionReady,
  actionGateReady,
  adapterReady,
  safeControlReady,
  liveControlReady,
  configuredRehearsalReady,
}) {
  if (!configurationReady) return "configuration_rehearsal_attention";
  if (liveControlReady) return "ready_for_gameplay_safe_control";
  if (configuredRehearsalReady && !schedulerReady) {
    return "ready_for_configured_gameplay_rehearsal";
  }
  if (!schedulerReady) return "scheduler_rehearsal_attention";
  if (!visionReady) return "vision_rehearsal_attention";
  if (configuredRehearsalReady && !actionGateReady) {
    return "ready_for_configured_gameplay_rehearsal";
  }
  if (!actionGateReady) return "action_gate_rehearsal_attention";
  if (!adapterReady) return "adapter_rehearsal_attention";
  if (!safeControlReady) return "safe_control_rehearsal_attention";
  return "ready_for_configured_gameplay_rehearsal";
}

function summarizeNextStep({
  rehearsalStatus,
  preflight,
  envSetupPlan,
  runtimeStatus,
  liveReadiness,
}) {
  if (rehearsalStatus === "configuration_rehearsal_attention") {
    return {
      next_step_id: "review_gameplay_preflight",
      next_step_script: "npm run dev:gameplay:preflight",
      next_check_script: "npm run dev:gameplay:readiness-rehearsal",
      next_configure_env:
        envSetupPlan.next_configure_env.length > 0
          ? [...envSetupPlan.next_configure_env]
          : [...preflight.missing_required_env],
    };
  }
  if (rehearsalStatus === "scheduler_rehearsal_attention") {
    return {
      next_step_id: "review_gameplay_runtime_status",
      next_step_script:
        runtimeStatus.next_runtime_check_script ??
        "npm run dev:gameplay:runtime-status",
      next_check_script: "npm run dev:gameplay:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  if (rehearsalStatus === "vision_rehearsal_attention") {
    return {
      next_step_id: "run_vision_game_roundtrip",
      next_step_script:
        liveReadiness.vision_capture_gate.next_check_script ??
        "npm run dev:vision:game-roundtrip",
      next_check_script: "npm run dev:gameplay:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  if (rehearsalStatus === "adapter_rehearsal_attention") {
    return {
      next_step_id: "run_game_control_roundtrip",
      next_step_script:
        liveReadiness.adapter_gate.next_check_script ??
        "npm run dev:game-control:roundtrip",
      next_check_script: "npm run dev:gameplay:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  if (rehearsalStatus === "safe_control_rehearsal_attention") {
    return {
      next_step_id: "run_gameplay_runtime_roundtrip",
      next_step_script:
        liveReadiness.safe_control_gate.next_check_script ??
        "npm run dev:gameplay:runtime-roundtrip",
      next_check_script: "npm run dev:gameplay:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  if (rehearsalStatus === "ready_for_gameplay_safe_control") {
    return {
      next_step_id: "monitor_gameplay_live_readiness",
      next_step_script: "npm run dev:gameplay:live-readiness",
      next_check_script: "npm run dev:gameplay:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  return {
    next_step_id: "run_gameplay_validation_gate_roundtrip",
    next_step_script: "npm run dev:gameplay:validation-gate-roundtrip",
    next_check_script: "npm run dev:gameplay:readiness-rehearsal",
    next_configure_env: [],
  };
}

function createGateSummary(liveReadiness) {
  const gates = [
    liveReadiness.configuration_gate,
    liveReadiness.scheduler_gate,
    liveReadiness.vision_capture_gate,
    liveReadiness.action_gate,
    liveReadiness.adapter_gate,
    liveReadiness.safe_control_gate,
    liveReadiness.lifecycle_gate,
    liveReadiness.vision_to_action_gate,
  ];
  const configurationGateReady =
    liveReadiness.configuration_gate.gate_status === "ready" &&
    liveReadiness.configuration_gate.readiness_state === "ready";
  const schedulerGateReady =
    liveReadiness.scheduler_gate.gate_status === "ready" &&
    liveReadiness.scheduler_gate.scheduler_available === true &&
    liveReadiness.scheduler_gate.scheduler_running === true;
  const visionCaptureGateReady =
    liveReadiness.vision_capture_gate.gate_status === "ready" &&
    liveReadiness.vision_capture_gate.blocking_stage === "none" &&
    liveReadiness.vision_capture_gate.game_observation_seen === true;
  const actionGateReady =
    liveReadiness.action_gate.gate_status === "ready" &&
    liveReadiness.action_gate.validation_passed === true &&
    liveReadiness.action_gate.validated_control_available === true;
  const adapterGateReady =
    liveReadiness.adapter_gate.gate_status === "ready" &&
    liveReadiness.adapter_gate.adapter_status_available === true &&
    liveReadiness.adapter_gate.accepted_count > 0;
  const safeControlGateReady =
    liveReadiness.safe_control_gate.gate_status === "ready" &&
    liveReadiness.safe_control_gate.blocking_stage === "none" &&
    liveReadiness.safe_control_gate.control_accepted === true;
  const lifecycleGateReady =
    liveReadiness.lifecycle_gate.gate_status === "ready" &&
    liveReadiness.lifecycle_gate.blocking_stage === "none" &&
    liveReadiness.lifecycle_gate.adapter_handoff_accepted === true;
  const visionToActionGateReady =
    liveReadiness.vision_to_action_gate.gate_status === "ready" &&
    liveReadiness.vision_to_action_gate.blocking_stage === "none" &&
    liveReadiness.vision_to_action_gate.control_accepted === true;
  const readyGateCount = [
    configurationGateReady,
    schedulerGateReady,
    visionCaptureGateReady,
    actionGateReady,
    adapterGateReady,
    safeControlGateReady,
    lifecycleGateReady,
    visionToActionGateReady,
  ].filter(Boolean).length;
  return {
    schema: "iris_gameplay_rehearsal_gate_summary_v1",
    gate_count: gates.length,
    ready_gate_count: readyGateCount,
    attention_gate_count: gates.length - readyGateCount,
    readiness_state_counts: countReadinessStates(gates),
    configuration_gate_ready: configurationGateReady,
    scheduler_gate_ready: schedulerGateReady,
    vision_capture_gate_ready: visionCaptureGateReady,
    action_gate_ready: actionGateReady,
    adapter_gate_ready: adapterGateReady,
    safe_control_gate_ready: safeControlGateReady,
    lifecycle_gate_ready: lifecycleGateReady,
    vision_to_action_gate_ready: visionToActionGateReady,
    configuration_gate_status: liveReadiness.configuration_gate.gate_status,
    configuration_gate_readiness_state:
      liveReadiness.configuration_gate.readiness_state,
    scheduler_gate_status: liveReadiness.scheduler_gate.gate_status,
    scheduler_gate_readiness_state: liveReadiness.scheduler_gate.readiness_state,
    vision_capture_gate_status:
      liveReadiness.vision_capture_gate.gate_status,
    vision_capture_gate_readiness_state:
      liveReadiness.vision_capture_gate.readiness_state,
    action_gate_status: liveReadiness.action_gate.gate_status,
    action_gate_readiness_state: liveReadiness.action_gate.readiness_state,
    adapter_gate_status: liveReadiness.adapter_gate.gate_status,
    adapter_gate_readiness_state: liveReadiness.adapter_gate.readiness_state,
    safe_control_gate_status: liveReadiness.safe_control_gate.gate_status,
    safe_control_gate_readiness_state:
      liveReadiness.safe_control_gate.readiness_state,
    lifecycle_gate_status: liveReadiness.lifecycle_gate.gate_status,
    lifecycle_gate_readiness_state:
      liveReadiness.lifecycle_gate.readiness_state,
    vision_to_action_gate_status:
      liveReadiness.vision_to_action_gate.gate_status,
    vision_to_action_gate_readiness_state:
      liveReadiness.vision_to_action_gate.readiness_state,
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_frames: true,
      no_raw_ocr_text: true,
      no_vision_payloads: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
    },
  };
}

function assertRuntimeFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: runtime flow summary is required`);
  }
  if (summary.schema !== "iris_gameplay_rehearsal_runtime_flow_summary_v1") {
    throw new ContractError(`${context}: invalid runtime flow summary schema`);
  }
  assertSafeOptionalScriptName(
    summary.next_runtime_check_script,
    `${context}: invalid next runtime check script`
  );
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  for (const field of [
    "vision_capture_flow_status",
    "vision_capture_blocking_stage",
    "action_gate_flow_status",
    "safe_control_flow_status",
    "safe_control_blocking_stage",
    "vision_to_action_flow_status",
    "vision_to_action_blocking_stage",
    "lifecycle_flow_status",
    "lifecycle_blocking_stage",
    "adapter_readiness_status",
  ]) {
    assertStatus(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "vision_capture_readiness_state",
    "action_gate_readiness_state",
    "safe_control_readiness_state",
    "vision_to_action_readiness_state",
    "lifecycle_readiness_state",
  ]) {
    assertSafeReadinessState(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "scheduler_available",
    "scheduler_running",
    "scheduler_ticking",
    "capture_request_seen",
    "game_observation_seen",
    "low_confidence_observed",
    "validation_seen",
    "validation_passed",
    "validated_control_available",
    "adapter_handoff_seen",
    "adapter_handoff_accepted",
    "rejected_before_adapter",
  ]) {
    assertBoolean(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "game_observation_source_count",
    "scheduler_processed_count",
    "scheduler_source_error_count",
    "adapter_request_count",
    "adapter_accepted_count",
    "adapter_failed_count",
    "adapter_expired_action_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_booleans_only",
    "no_raw_stream_state",
    "no_raw_scheduler_results",
    "no_raw_frames",
    "no_raw_ocr_text",
    "no_vision_payloads",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
    "script_names_only",
  ], context);
}

function assertGateSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: gate summary is required`);
  }
  if (summary.schema !== "iris_gameplay_rehearsal_gate_summary_v1") {
    throw new ContractError(`${context}: invalid gate summary schema`);
  }
  for (const field of ["gate_count", "ready_gate_count", "attention_gate_count"]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (summary.gate_count !== 8) {
    throw new ContractError(`${context}: invalid gate count`);
  }
  if (summary.ready_gate_count + summary.attention_gate_count !== summary.gate_count) {
    throw new ContractError(`${context}: invalid gate count summary`);
  }
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  for (const field of [
    "configuration_gate_ready",
    "scheduler_gate_ready",
    "vision_capture_gate_ready",
    "action_gate_ready",
    "adapter_gate_ready",
    "safe_control_gate_ready",
    "lifecycle_gate_ready",
    "vision_to_action_gate_ready",
  ]) {
    assertBoolean(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "configuration_gate_status",
    "scheduler_gate_status",
    "vision_capture_gate_status",
    "action_gate_status",
    "adapter_gate_status",
    "safe_control_gate_status",
    "lifecycle_gate_status",
    "vision_to_action_gate_status",
  ]) {
    assertStatus(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "configuration_gate_readiness_state",
    "scheduler_gate_readiness_state",
    "vision_capture_gate_readiness_state",
    "action_gate_readiness_state",
    "adapter_gate_readiness_state",
    "safe_control_gate_readiness_state",
    "lifecycle_gate_readiness_state",
    "vision_to_action_gate_readiness_state",
  ]) {
    assertSafeReadinessState(summary[field], `${context}: invalid ${field}`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_booleans_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_frames",
    "no_raw_ocr_text",
    "no_vision_payloads",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
  ], context);
  const gateReadyFields = [
    "configuration_gate_ready",
    "scheduler_gate_ready",
    "vision_capture_gate_ready",
    "action_gate_ready",
    "adapter_gate_ready",
    "safe_control_gate_ready",
    "lifecycle_gate_ready",
    "vision_to_action_gate_ready",
  ];
  const expectedReadyGateCount = gateReadyFields.filter(
    (field) => summary[field] === true
  ).length;
  if (
    summary.ready_gate_count !== expectedReadyGateCount ||
    summary.attention_gate_count !== summary.gate_count - expectedReadyGateCount
  ) {
    throw new ContractError(`${context}: gate counts must match gate readiness flags`);
  }
  const expectedReadinessCounts = countReadinessStates([
    { readiness_state: summary.configuration_gate_readiness_state },
    { readiness_state: summary.scheduler_gate_readiness_state },
    { readiness_state: summary.vision_capture_gate_readiness_state },
    { readiness_state: summary.action_gate_readiness_state },
    { readiness_state: summary.adapter_gate_readiness_state },
    { readiness_state: summary.safe_control_gate_readiness_state },
    { readiness_state: summary.lifecycle_gate_readiness_state },
    { readiness_state: summary.vision_to_action_gate_readiness_state },
  ]);
  if (!sameReadinessStateCounts(summary.readiness_state_counts, expectedReadinessCounts)) {
    throw new ContractError(`${context}: invalid gate readiness counts`);
  }
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_gameplay_rehearsal_scripts_v1") {
    throw new ContractError(`${context}: invalid scripts schema`);
  }
  for (const field of [
    "rehearsal_script",
    "preflight_script",
    "env_setup_plan_script",
    "launch_plan_script",
    "runtime_status_script",
    "live_readiness_script",
    "validation_gate_roundtrip_script",
    "runtime_roundtrip_script",
    "vision_roundtrip_script",
    "game_control_roundtrip_script",
  ]) {
    assertSafeScriptName(scripts[field], `${context}: invalid ${field}`);
  }
  assertBoundaryPolicy(scripts.boundary_policy, [
    "script_names_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_frames",
    "no_raw_ocr_text",
    "no_vision_payloads",
    "no_candidates",
    "no_approved_actions",
    "no_commands",
  ], context);
}

function assertSafeControlPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: safe control policy is required`);
  }
  for (const field of [
    "input_action_candidates_are_review_only",
    "input_action_candidates_never_forwarded_to_adapter",
    "approved_game_action_required_before_adapter",
    "rehearsal_never_captures_screen",
    "rehearsal_never_controls_game",
    "viewer_comments_cannot_directly_control_game",
    "fresh_observation_required_before_adapter",
    "stale_future_or_low_confidence_blocks_before_adapter",
    "adapter_ack_shape_only",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid safe control policy`);
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
    if (FORBIDDEN_GAMEPLAY_REHEARSAL_FIELDS.has(key)) {
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

function readinessStateForRehearsalStatus(status) {
  if (status === "ready_for_gameplay_safe_control") return "ready";
  if (status === "configuration_rehearsal_attention") {
    return "configuration_waiting";
  }
  if (status === "ready_for_configured_gameplay_rehearsal") {
    return "runtime_waiting";
  }
  return "operator_review_required";
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
    throw new ContractError(`${context}: readiness counts are required`);
  }
  for (const state of READINESS_STATES) {
    assertNonNegativeInteger(
      counts[state],
      `${context}: invalid readiness count for ${state}`
    );
  }
  for (const state of Object.keys(counts)) {
    if (!READINESS_STATES.has(state)) {
      throw new ContractError(`${context}: unknown readiness count state`);
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
