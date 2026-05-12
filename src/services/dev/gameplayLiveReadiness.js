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
  assertGameplayRuntimeStatusReportSafe,
  createGameplayRuntimeStatusReport,
} from "./gameplayRuntimeStatus.js";

const FORBIDDEN_GAMEPLAY_LIVE_READINESS_FIELDS = new Set([
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
  "raw_frame",
  "image",
  "frame",
  "ocr_text",
]);

const GAMEPLAY_LIVE_READINESS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "live_readiness_status",
  "gameplay_launch_plan_status",
  "target_stage_id",
  "vision_mode",
  "game_control_mode",
  "env_setup_plan_summary",
  "next_gate_id",
  "next_check_script",
  "next_readiness_state",
  "readiness_state_counts",
  "configuration_gate",
  "scheduler_gate",
  "vision_capture_gate",
  "action_gate",
  "adapter_gate",
  "safe_control_gate",
  "lifecycle_gate",
  "vision_to_action_gate",
  "production_handoff_summary",
  "verification_scripts",
  "boundary_policy",
  "adapter_validation_required",
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
const GATE_IDS = new Set([
  "configuration_gate",
  "scheduler_gate",
  "vision_capture_gate",
  "action_gate",
  "adapter_gate",
  "safe_control_gate",
  "lifecycle_gate",
  "vision_to_action_gate",
]);
const ENV_SETUP_PLAN_STATUSES = new Set([
  "ready_for_gameplay_env_setup",
  "configure_gameplay_env_first",
]);
const ENV_SETUP_GROUP_IDS = new Set([
  "game_vision_source",
  "game_capture_options",
  "approved_control_adapter",
  "control_safety_guards",
  "gameplay_verification",
]);
const ENV_SETUP_GROUP_KINDS = new Set([
  "vision_source_config",
  "capture_metadata_config",
  "control_adapter_config",
  "safety_guard_config",
  "verification_config",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const ENV_SETUP_ATTENTION_REASONS = new Set([
  "ready",
  "missing_required_env",
  "configuration_attention",
  "vision_target_policy_attention",
  "control_target_policy_attention",
]);
const TARGET_POLICY_STATUSES = new Set(["allowed", "attention", "not_applicable"]);
const CHECK_SCRIPTS = {
  configuration_gate: "npm run dev:gameplay:preflight",
  scheduler_gate: "npm run dev:gameplay:runtime-status",
  vision_capture_gate: "npm run dev:vision:game-roundtrip",
  action_gate: "npm run dev:gameplay:validation-gate-roundtrip",
  adapter_gate: "npm run dev:game-control:roundtrip",
  safe_control_gate: "npm run dev:gameplay:runtime-roundtrip",
  lifecycle_gate: "npm run dev:gameplay:runtime-roundtrip",
  vision_to_action_gate: "npm run dev:gameplay:validation-gate-roundtrip",
};
const CONFIGURATION_GATE_STATUSES = new Set([
  "configuration_attention",
  "ready",
]);
const SCHEDULER_GATE_STATUSES = new Set([
  "configuration_attention",
  "scheduler_unavailable",
  "waiting_for_scheduler_start",
  "scheduler_attention",
  "ready",
]);
const VISION_GATE_STATUSES = new Set([
  "configuration_attention",
  "scheduler_unavailable",
  "waiting_for_scheduler_start",
  "waiting_for_game_observation_source",
  "waiting_for_capture_request",
  "waiting_for_game_observation",
  "vision_observation_active",
  "vision_observation_low_confidence",
  "runtime_attention",
  "ready",
]);
const ACTION_GATE_STATUSES = new Set([
  "configuration_attention",
  "waiting_for_game_observation",
  "waiting_for_player_proposal",
  "waiting_for_validation",
  "blocked_before_adapter",
  "ready_for_adapter_handoff",
  "adapter_handoff_active",
  "runtime_attention",
  "ready",
]);
const ADAPTER_GATE_STATUSES = new Set([
  "unavailable",
  "idle",
  "active",
  "attention",
  "adapter_attention",
  "ready",
]);
const SAFE_CONTROL_GATE_STATUSES = new Set([
  "configuration_attention",
  "scheduler_unavailable",
  "waiting_for_scheduler_start",
  "waiting_for_game_observation_source",
  "waiting_for_game_observation",
  "waiting_for_perception",
  "waiting_for_player_step",
  "waiting_for_validation",
  "waiting_for_safe_control",
  "waiting_for_adapter_ack",
  "safe_control_active",
  "runtime_attention",
  "ready",
]);
const LIFECYCLE_GATE_STATUSES = new Set([
  "configuration_attention",
  "scheduler_unavailable",
  "waiting_for_scheduler_start",
  "waiting_for_game_observation_source",
  "waiting_for_game_observation",
  "waiting_for_perception",
  "waiting_for_player_proposal",
  "waiting_for_validation",
  "blocked_before_adapter",
  "ready_for_adapter_handoff",
  "waiting_for_adapter_ack",
  "safe_control_active",
  "runtime_attention",
  "ready",
]);
const VISION_TO_ACTION_GATE_STATUSES = new Set([
  "configuration_attention",
  "vision_waiting",
  "vision_low_confidence_blocked",
  "waiting_for_perception",
  "waiting_for_player_proposal",
  "waiting_for_validation",
  "blocked_before_adapter",
  "ready_for_adapter_handoff",
  "waiting_for_adapter_ack",
  "safe_control_active",
  "runtime_attention",
  "ready",
]);
const BLOCKING_STAGES = new Set([
  "configuration",
  "scheduler",
  "game_observation_source",
  "capture_request",
  "game_observation",
  "confidence",
  "runtime",
  "vision",
  "perception",
  "player_step",
  "player_proposal",
  "validator",
  "adapter_status",
  "adapter_ack",
  "boundary_audit",
  "none",
]);
const URL_PATTERN = /https?:\/\//i;

export function createGameplayLiveReadinessReport({
  env = process.env,
  runtime = null,
  httpIngestScheduler = null,
  streamState = null,
  gameControlAdapterStatus = null,
  runtimeStatusOverride = null,
  generatedAtMs = Date.now(),
} = {}) {
  const launchPlan = createGameplayLaunchPlan({ env, generatedAtMs });
  const envSetupPlan = createGameplayEnvSetupPlan({ env, generatedAtMs });
  const runtimeStatus =
    runtimeStatusOverride ??
    createGameplayRuntimeStatusReport({
      env,
      runtime,
      httpIngestScheduler,
      streamState,
      gameControlAdapterStatus,
      generatedAtMs,
    });
  assertGameplayLaunchPlanSafe(launchPlan, "gameplay live readiness launch plan");
  assertGameplayEnvSetupPlanSafe(
    envSetupPlan,
    "gameplay live readiness env setup plan"
  );
  assertGameplayRuntimeStatusReportSafe(
    runtimeStatus,
    "gameplay live readiness runtime status"
  );

  const configurationGate = summarizeConfigurationGate({ launchPlan, runtimeStatus });
  const schedulerGate = summarizeSchedulerGate(runtimeStatus);
  const visionCaptureGate = summarizeVisionCaptureGate(runtimeStatus);
  const actionGate = summarizeActionGate(runtimeStatus);
  const adapterGate = summarizeAdapterGate(runtimeStatus);
  const safeControlGate = summarizeSafeControlGate(runtimeStatus);
  const lifecycleGate = summarizeLifecycleGate(runtimeStatus);
  const visionToActionGate = summarizeVisionToActionGate(runtimeStatus);
  const liveReadinessStatus = summarizeLiveReadinessStatus({
    configurationGate,
    schedulerGate,
    visionCaptureGate,
    actionGate,
    adapterGate,
    safeControlGate,
    lifecycleGate,
    visionToActionGate,
  });
  const nextGate = firstAttentionGate([
    ["configuration_gate", configurationGate],
    ["scheduler_gate", schedulerGate],
    ["vision_capture_gate", visionCaptureGate],
    ["action_gate", actionGate],
    ["adapter_gate", adapterGate],
    ["safe_control_gate", safeControlGate],
    ["lifecycle_gate", lifecycleGate],
    ["vision_to_action_gate", visionToActionGate],
  ]);
  const gates = [
    configurationGate,
    schedulerGate,
    visionCaptureGate,
    actionGate,
    adapterGate,
    safeControlGate,
    lifecycleGate,
    visionToActionGate,
  ];

  const report = {
    schema: "iris_gameplay_live_readiness_report_v1",
    generated_at_ms: generatedAtMs,
    live_readiness_status: liveReadinessStatus,
    gameplay_launch_plan_status: launchPlan.plan_status,
    target_stage_id: "vision_and_safe_game_control",
    vision_mode: launchPlan.vision_mode,
    game_control_mode: launchPlan.game_control_mode,
    env_setup_plan_summary: summarizeEnvSetupPlan(envSetupPlan),
    next_gate_id: nextGate?.gate_id ?? null,
    next_check_script: nextGate?.next_check_script ?? null,
    next_readiness_state: nextGate?.readiness_state ?? "ready",
    readiness_state_counts: countReadinessStates(gates),
    configuration_gate: configurationGate,
    scheduler_gate: schedulerGate,
    vision_capture_gate: visionCaptureGate,
    action_gate: actionGate,
    adapter_gate: adapterGate,
    safe_control_gate: safeControlGate,
    lifecycle_gate: lifecycleGate,
    vision_to_action_gate: visionToActionGate,
    production_handoff_summary: summarizeProductionHandoff({
      liveReadinessStatus,
      nextGate,
      configurationGate,
      schedulerGate,
      visionCaptureGate,
      actionGate,
      adapterGate,
      safeControlGate,
      lifecycleGate,
      visionToActionGate,
    }),
    verification_scripts: {
      schema: "iris_gameplay_live_readiness_scripts_v1",
      local_env_profile_script: "npm run dev:gameplay:local-env-profile",
      local_env_apply_plan_script: "npm run dev:gameplay:local-env-apply",
      env_setup_plan_script: "npm run dev:gameplay:env-setup-plan",
      launch_plan_script: "npm run dev:gameplay:launch-plan",
      runtime_status_script: "npm run dev:gameplay:runtime-status",
      live_readiness_script: "npm run dev:gameplay:live-readiness",
      readiness_rehearsal_script:
        "npm run dev:gameplay:readiness-rehearsal",
      runtime_roundtrip_script:
        launchPlan.runtime_safe_control_verification.runtime_roundtrip_script,
      policy_gate_roundtrip_script:
        launchPlan.runtime_safe_control_verification.policy_gate_roundtrip_script,
      validation_gate_roundtrip_script:
        launchPlan.runtime_safe_control_verification
          .validation_gate_roundtrip_script,
      vision_roundtrip_script:
        launchPlan.runtime_safe_control_verification.vision_roundtrip_script,
      vision_unsafe_roundtrip_script:
        launchPlan.runtime_safe_control_verification
          .vision_unsafe_roundtrip_script,
      game_control_roundtrip_script:
        launchPlan.runtime_safe_control_verification.game_control_roundtrip_script,
      game_control_failure_roundtrip_script:
        launchPlan.runtime_safe_control_verification
          .game_control_failure_roundtrip_script,
      game_control_unsafe_roundtrip_script:
        launchPlan.runtime_safe_control_verification
          .game_control_unsafe_roundtrip_script,
      production_loop_roundtrip_script:
        launchPlan.runtime_safe_control_verification
          .production_loop_roundtrip_script,
      expected_runtime_status: "safe_control_active",
      expected_vision_capture_status: "vision_observation_active",
      expected_action_gate_status: "adapter_handoff_active",
      expected_safe_control_status: "safe_control_active",
      expected_live_readiness_status: "ready_for_gameplay_safe_control",
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
    boundary_policy: {
      env_names_only: true,
      counts_statuses_booleans_and_policy_only: true,
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
      read_only_live_readiness: true,
      no_polling_side_effects: true,
      no_control_side_effects: true,
    },
    adapter_validation_required: true,
  };
  assertGameplayLiveReadinessReportSafe(report);
  return report;
}

export function assertGameplayLiveReadinessReportSafe(
  report,
  context = "gameplay live readiness report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenGameplayLiveReadinessFields(report, context);
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_gameplay_live_readiness_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!GAMEPLAY_LIVE_READINESS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (!LIVE_READINESS_STATUSES.has(report.live_readiness_status)) {
    throw new ContractError(`${context}: invalid live readiness status`);
  }
  if (
    ![
      "ready_to_launch_gameplay_control",
      "configure_gameplay_env_first",
    ].includes(report.gameplay_launch_plan_status)
  ) {
    throw new ContractError(`${context}: invalid launch plan status`);
  }
  if (report.target_stage_id !== "vision_and_safe_game_control") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (!["http_game_observation", "not_configured"].includes(report.vision_mode)) {
    throw new ContractError(`${context}: invalid vision mode`);
  }
  if (!["http", "mock", "unsupported_adapter"].includes(report.game_control_mode)) {
    throw new ContractError(`${context}: invalid game control mode`);
  }
  assertEnvSetupPlanSummarySafe(report.env_setup_plan_summary, context);
  if (report.next_gate_id !== null && !GATE_IDS.has(report.next_gate_id)) {
    throw new ContractError(`${context}: invalid next gate`);
  }
  if (report.next_check_script !== null) {
    assertSafeScriptName(report.next_check_script, `${context}: next check script`);
  }
  assertSafeReadinessState(report.next_readiness_state, context);
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  assertConfigurationGateSafe(report.configuration_gate, context);
  assertSchedulerGateSafe(report.scheduler_gate, context);
  assertVisionCaptureGateSafe(report.vision_capture_gate, context);
  assertActionGateSafe(report.action_gate, context);
  assertAdapterGateSafe(report.adapter_gate, context);
  assertSafeControlGateSafe(report.safe_control_gate, context);
  assertLifecycleGateSafe(report.lifecycle_gate, context);
  assertVisionToActionGateSafe(report.vision_to_action_gate, context);
  assertProductionHandoffSummarySafe(report.production_handoff_summary, report, context);
  assertVerificationScriptsSafe(report.verification_scripts, context);
  const nextGate = firstAttentionGate([
    ["configuration_gate", report.configuration_gate],
    ["scheduler_gate", report.scheduler_gate],
    ["vision_capture_gate", report.vision_capture_gate],
    ["action_gate", report.action_gate],
    ["adapter_gate", report.adapter_gate],
    ["safe_control_gate", report.safe_control_gate],
    ["lifecycle_gate", report.lifecycle_gate],
    ["vision_to_action_gate", report.vision_to_action_gate],
  ]);
  if (!nextGate) {
    if (report.next_gate_id !== null || report.next_check_script !== null) {
      throw new ContractError(`${context}: ready report must not expose next gate`);
    }
    if (report.next_readiness_state !== "ready") {
      throw new ContractError(`${context}: ready report has invalid readiness state`);
    }
  } else if (
    report.next_gate_id !== nextGate.gate_id ||
    report.next_check_script !== nextGate.next_check_script ||
    report.next_readiness_state !== nextGate.readiness_state
  ) {
    throw new ContractError(`${context}: next gate must match first attention gate`);
  }
  if (
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      countReadinessStates([
        report.configuration_gate,
        report.scheduler_gate,
        report.vision_capture_gate,
        report.action_gate,
        report.adapter_gate,
        report.safe_control_gate,
        report.lifecycle_gate,
        report.vision_to_action_gate,
      ])
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  assertGameplayLiveReadinessBoundaryPolicySafe(report.boundary_policy, context);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function summarizeProductionHandoff({
  liveReadinessStatus,
  nextGate,
  configurationGate,
  schedulerGate,
  visionCaptureGate,
  actionGate,
  adapterGate,
  safeControlGate,
  lifecycleGate,
  visionToActionGate,
}) {
  const gates = [
    configurationGate,
    schedulerGate,
    visionCaptureGate,
    actionGate,
    adapterGate,
    safeControlGate,
    lifecycleGate,
    visionToActionGate,
  ];
  return {
    schema: "iris_gameplay_live_readiness_handoff_summary_v1",
    live_readiness_report_only: true,
    no_real_capture_started_by_report: true,
    no_real_game_or_os_input_started_by_report: true,
    no_control_side_effects_by_report: true,
    input_action_candidates_never_forwarded_directly: true,
    approved_actions_not_forwarded_by_report: true,
    raw_frames_not_exposed: true,
    raw_ocr_text_not_exposed: true,
    live_readiness_status: liveReadinessStatus,
    ready_gate_count: gates.filter((gate) => gate.ready === true).length,
    attention_gate_count: gates.filter((gate) => gate.ready !== true).length,
    observation_count: visionCaptureGate.observation_count,
    low_confidence_count: visionCaptureGate.low_confidence_count,
    boundary_audit_violation_count:
      visionCaptureGate.boundary_audit_violation_count,
    adapter_request_count: adapterGate.request_count,
    adapter_accepted_count: adapterGate.accepted_count,
    adapter_failed_count: adapterGate.failed_count,
    safe_control_recent_count: safeControlGate.recent_safe_control_count,
    adapter_expired_action_count: adapterGate.expired_action_count,
    next_gate_id: nextGate?.gate_id ?? null,
    next_check_script: nextGate?.next_check_script ?? null,
    next_readiness_state: nextGate?.readiness_state ?? "ready",
    readiness_state_counts: countReadinessStates(gates),
  };
}

function assertProductionHandoffSummarySafe(summary, report, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_gameplay_live_readiness_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of [
    "live_readiness_report_only",
    "no_real_capture_started_by_report",
    "no_real_game_or_os_input_started_by_report",
    "no_control_side_effects_by_report",
    "input_action_candidates_never_forwarded_directly",
    "approved_actions_not_forwarded_by_report",
    "raw_frames_not_exposed",
    "raw_ocr_text_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (summary.live_readiness_status !== report.live_readiness_status) {
    throw new ContractError(`${context}: invalid production handoff status`);
  }
  for (const field of [
    "ready_gate_count",
    "attention_gate_count",
    "observation_count",
    "low_confidence_count",
    "boundary_audit_violation_count",
    "adapter_request_count",
    "adapter_accepted_count",
    "adapter_failed_count",
    "safe_control_recent_count",
    "adapter_expired_action_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (summary.ready_gate_count + summary.attention_gate_count !== GATE_IDS.size) {
    throw new ContractError(`${context}: invalid production handoff gate counts`);
  }
  const readyGateCount = [
    report.configuration_gate,
    report.scheduler_gate,
    report.vision_capture_gate,
    report.action_gate,
    report.adapter_gate,
    report.safe_control_gate,
    report.lifecycle_gate,
    report.vision_to_action_gate,
  ].filter((gate) => gate.ready === true).length;
  if (
    summary.ready_gate_count !== readyGateCount ||
    summary.attention_gate_count !== GATE_IDS.size - readyGateCount ||
    summary.observation_count !== report.vision_capture_gate.observation_count ||
    summary.low_confidence_count !==
      report.vision_capture_gate.low_confidence_count ||
    summary.boundary_audit_violation_count !==
      report.vision_capture_gate.boundary_audit_violation_count ||
    summary.adapter_request_count !== report.adapter_gate.request_count ||
    summary.adapter_accepted_count !== report.adapter_gate.accepted_count ||
    summary.adapter_failed_count !== report.adapter_gate.failed_count ||
    summary.safe_control_recent_count !==
      report.safe_control_gate.recent_safe_control_count ||
    summary.adapter_expired_action_count !==
      report.adapter_gate.expired_action_count
  ) {
    throw new ContractError(`${context}: invalid production handoff totals`);
  }
  if (summary.next_gate_id !== report.next_gate_id) {
    throw new ContractError(`${context}: invalid production handoff next gate`);
  }
  if (summary.next_check_script !== report.next_check_script) {
    throw new ContractError(`${context}: invalid production handoff next script`);
  }
  if (summary.next_readiness_state !== report.next_readiness_state) {
    throw new ContractError(`${context}: invalid production handoff readiness`);
  }
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  if (
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.readiness_state_counts
    )
  ) {
    throw new ContractError(
      `${context}: invalid production handoff readiness counts`
    );
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

function summarizeEnvSetupPlan(plan) {
  const visionSourceGroup = findEnvSetupGroup(plan, "game_vision_source");
  const captureOptionsGroup = findEnvSetupGroup(plan, "game_capture_options");
  const controlAdapterGroup = findEnvSetupGroup(plan, "approved_control_adapter");
  const safetyGuardsGroup = findEnvSetupGroup(plan, "control_safety_guards");
  const verificationGroup = findEnvSetupGroup(plan, "gameplay_verification");
  return {
    schema: "iris_gameplay_live_readiness_env_setup_summary_v1",
    check_script: "npm run dev:gameplay:env-setup-plan",
    plan_status: plan.plan_status,
    preflight_status: plan.preflight_status,
    launch_plan_status: plan.gameplay_launch_plan_status,
    env_group_count: plan.env_group_count,
    ready_env_group_count: plan.ready_env_group_count,
    attention_env_group_count: plan.attention_env_group_count,
    missing_required_env_count: plan.missing_required_env_count,
    next_env_group_id: plan.next_env_group_id,
    next_env_group_kind: plan.next_env_group_kind,
    next_attention_reason: plan.next_attention_reason,
    next_readiness_state: plan.next_readiness_state,
    readiness_state_counts: plan.readiness_state_counts,
    next_configure_env: plan.next_configure_env,
    next_launch_script: plan.next_launch_script,
    next_readiness_script: plan.next_readiness_script,
    vision_source_group_ready: visionSourceGroup?.setup_status === "ready",
    capture_options_group_ready: captureOptionsGroup?.setup_status === "ready",
    control_adapter_group_ready: controlAdapterGroup?.setup_status === "ready",
    safety_guards_group_ready: safetyGuardsGroup?.setup_status === "ready",
    verification_group_ready: verificationGroup?.setup_status === "ready",
    vision_target_policy_status:
      visionSourceGroup?.vision_target_policy_status ?? "not_applicable",
    game_control_target_policy_status:
      controlAdapterGroup?.game_control_target_policy_status ?? "not_applicable",
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      schema_names_only: true,
      fixed_ids_statuses_and_counts_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_raw_frames: true,
      no_raw_ocr_text: true,
      no_vision_payloads: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      read_only_env_setup_summary: true,
    },
    adapter_validation_required: true,
  };
}

function findEnvSetupGroup(plan, groupId) {
  return plan.env_groups.find((group) => group.env_group_id === groupId) ?? null;
}

function assertEnvSetupPlanSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: env setup plan summary is required`);
  }
  if (summary.schema !== "iris_gameplay_live_readiness_env_setup_summary_v1") {
    throw new ContractError(`${context}: invalid env setup summary schema`);
  }
  assertSafeScriptName(summary.check_script, `${context}: env setup check script`);
  if (!ENV_SETUP_PLAN_STATUSES.has(summary.plan_status)) {
    throw new ContractError(`${context}: invalid env setup plan status`);
  }
  if (
    ![
      "ready_to_poll_game_and_approve_control",
      "blocked_by_configuration",
    ].includes(summary.preflight_status)
  ) {
    throw new ContractError(`${context}: invalid env setup preflight status`);
  }
  if (
    ![
      "ready_to_launch_gameplay_control",
      "configure_gameplay_env_first",
    ].includes(summary.launch_plan_status)
  ) {
    throw new ContractError(`${context}: invalid env setup launch status`);
  }
  for (const field of [
    "env_group_count",
    "ready_env_group_count",
    "attention_env_group_count",
    "missing_required_env_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (summary.next_env_group_id !== null && !ENV_SETUP_GROUP_IDS.has(summary.next_env_group_id)) {
    throw new ContractError(`${context}: invalid next env setup group id`);
  }
  if (
    summary.next_env_group_kind !== null &&
    !ENV_SETUP_GROUP_KINDS.has(summary.next_env_group_kind)
  ) {
    throw new ContractError(`${context}: invalid next env setup group kind`);
  }
  if (
    summary.next_attention_reason !== null &&
    !ENV_SETUP_ATTENTION_REASONS.has(summary.next_attention_reason)
  ) {
    throw new ContractError(`${context}: invalid next env setup reason`);
  }
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  assertEnvNameListSafe(summary.next_configure_env, `${context}: next configure env`);
  if (summary.next_launch_script !== null) {
    assertSafeScriptName(summary.next_launch_script, `${context}: next launch script`);
  }
  if (summary.next_readiness_script !== null) {
    assertSafeScriptName(
      summary.next_readiness_script,
      `${context}: next readiness script`
    );
  }
  for (const field of [
    "vision_source_group_ready",
    "capture_options_group_ready",
    "control_adapter_group_ready",
    "safety_guards_group_ready",
    "verification_group_ready",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid env setup group readiness`);
    }
  }
  if (!TARGET_POLICY_STATUSES.has(summary.vision_target_policy_status)) {
    throw new ContractError(`${context}: invalid vision target policy status`);
  }
  if (!TARGET_POLICY_STATUSES.has(summary.game_control_target_policy_status)) {
    throw new ContractError(`${context}: invalid control target policy status`);
  }
  if (summary.plan_status === "ready_for_gameplay_env_setup") {
    if (
      summary.next_env_group_id !== null ||
      summary.next_env_group_kind !== null ||
      summary.next_attention_reason !== null ||
      summary.next_readiness_state !== "ready" ||
      summary.next_launch_script !== null ||
      summary.next_readiness_script !== null ||
      summary.next_configure_env.length !== 0 ||
      summary.attention_env_group_count !== 0
    ) {
      throw new ContractError(`${context}: invalid ready env setup summary`);
    }
  } else if (
    summary.next_env_group_id === null ||
    summary.next_env_group_kind === null ||
    summary.next_attention_reason === null ||
    summary.next_readiness_state === "ready"
  ) {
    throw new ContractError(`${context}: invalid attention env setup summary`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "env_names_only",
    "script_names_only",
    "schema_names_only",
    "fixed_ids_statuses_and_counts_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_raw_frames",
    "no_raw_ocr_text",
    "no_vision_payloads",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
    "read_only_env_setup_summary",
  ], `${context}: env setup summary`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: env setup summary validation required`);
  }
}

function summarizeConfigurationGate({ launchPlan, runtimeStatus }) {
  const preflightReady =
    runtimeStatus.preflight_status === "ready_to_poll_game_and_approve_control";
  const ready =
    launchPlan.plan_status === "ready_to_launch_gameplay_control" &&
    preflightReady &&
    runtimeStatus.vision_status === "ready" &&
    runtimeStatus.game_control_status === "ready" &&
    runtimeStatus.vision_target_policy_status === "allowed" &&
    runtimeStatus.game_control_target_policy_status === "allowed" &&
    runtimeStatus.allowed_control_kind_count > 0 &&
    runtimeStatus.unsupported_control_kind_count === 0 &&
    runtimeStatus.rate_limit_env_configured === true &&
    runtimeStatus.stale_observation_guard_env_configured === true;
  return {
    schema: "iris_gameplay_live_readiness_configuration_gate_v1",
    check_script: CHECK_SCRIPTS.configuration_gate,
    next_check_script: ready ? null : CHECK_SCRIPTS.configuration_gate,
    ready,
    gate_status: ready ? "ready" : "configuration_attention",
    readiness_state: readinessStateForGateStatus(
      ready ? "ready" : "configuration_attention"
    ),
    preflight_ready: preflightReady,
    vision_ready: runtimeStatus.vision_status === "ready",
    game_control_ready: runtimeStatus.game_control_status === "ready",
    vision_target_policy_allowed:
      runtimeStatus.vision_target_policy_status === "allowed",
    game_control_target_policy_allowed:
      runtimeStatus.game_control_target_policy_status === "allowed",
    allowed_control_kind_count: runtimeStatus.allowed_control_kind_count,
    unsupported_control_kind_count: runtimeStatus.unsupported_control_kind_count,
    rate_limit_guard_configured: runtimeStatus.rate_limit_env_configured,
    stale_observation_guard_configured:
      runtimeStatus.stale_observation_guard_env_configured,
    preflight_attention_reason_count:
      runtimeStatus.preflight_attention_reason_count,
    diagnostic_detail: createGateDiagnosticDetail("configuration_gate", {
      preflight_ready: preflightReady,
      vision_ready: runtimeStatus.vision_status === "ready",
      game_control_ready: runtimeStatus.game_control_status === "ready",
      vision_target_policy_allowed:
        runtimeStatus.vision_target_policy_status === "allowed",
      game_control_target_policy_allowed:
        runtimeStatus.game_control_target_policy_status === "allowed",
      allowed_control_kind_count: runtimeStatus.allowed_control_kind_count,
      unsupported_control_kind_count: runtimeStatus.unsupported_control_kind_count,
      rate_limit_guard_configured: runtimeStatus.rate_limit_env_configured,
      stale_observation_guard_configured:
        runtimeStatus.stale_observation_guard_env_configured,
      preflight_attention_reason_count:
        runtimeStatus.preflight_attention_reason_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeSchedulerGate(runtimeStatus) {
  const scheduler = runtimeStatus.scheduler_summary;
  const telemetry = scheduler.gameplay_source_telemetry_counts;
  const ready =
    runtimeStatus.preflight_status === "ready_to_poll_game_and_approve_control" &&
    scheduler.scheduler_available === true &&
    scheduler.scheduler_status_error === null &&
    scheduler.running === true &&
    scheduler.game_observation_source_count > 0 &&
    scheduler.source_error_count === 0 &&
    telemetry.consecutive_error_count === 0;
  return {
    schema: "iris_gameplay_live_readiness_scheduler_gate_v1",
    check_script: CHECK_SCRIPTS.scheduler_gate,
    next_check_script: ready
      ? null
      : runtimeStatus.next_runtime_check_script ?? CHECK_SCRIPTS.scheduler_gate,
    ready,
    gate_status: summarizeSchedulerGateStatus({ runtimeStatus, scheduler, telemetry, ready }),
    readiness_state: readinessStateForGateStatus(
      summarizeSchedulerGateStatus({ runtimeStatus, scheduler, telemetry, ready })
    ),
    scheduler_available: scheduler.scheduler_available,
    scheduler_running: scheduler.running,
    scheduler_ticking: scheduler.ticking,
    scheduler_status_error_seen: scheduler.scheduler_status_error !== null,
    source_count: scheduler.source_count,
    game_observation_source_count: scheduler.game_observation_source_count,
    processed_count: scheduler.processed_count,
    duplicate_count: scheduler.duplicate_count,
    source_error_count: scheduler.source_error_count,
    capture_request_count: telemetry.request_count,
    observation_count: telemetry.observation_count,
    low_confidence_count: telemetry.low_confidence_count,
    source_consecutive_error_count: telemetry.consecutive_error_count,
    diagnostic_detail: createGateDiagnosticDetail("scheduler_gate", {
      scheduler_available: scheduler.scheduler_available,
      scheduler_running: scheduler.running,
      scheduler_ticking: scheduler.ticking,
      scheduler_status_error_seen: scheduler.scheduler_status_error !== null,
      source_count: scheduler.source_count,
      game_observation_source_count: scheduler.game_observation_source_count,
      processed_count: scheduler.processed_count,
      duplicate_count: scheduler.duplicate_count,
      source_error_count: scheduler.source_error_count,
      capture_request_count: telemetry.request_count,
      observation_count: telemetry.observation_count,
      low_confidence_count: telemetry.low_confidence_count,
      source_consecutive_error_count: telemetry.consecutive_error_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeVisionCaptureGate(runtimeStatus) {
  const flow = runtimeStatus.game_vision_capture_flow;
  const state = runtimeStatus.gameplay_state;
  const ready =
    flow.flow_status === "vision_observation_active" &&
    flow.blocking_stage === "none" &&
    flow.capture_request_seen === true &&
    flow.game_observation_seen === true &&
    flow.low_confidence_observed !== true &&
    flow.boundary_audit_violation_count === 0;
  return {
    schema: "iris_gameplay_live_readiness_vision_capture_gate_v1",
    check_script: CHECK_SCRIPTS.vision_capture_gate,
    next_check_script: ready
      ? null
      : flow.next_check_script ?? CHECK_SCRIPTS.vision_capture_gate,
    ready,
    gate_status: ready ? "ready" : flow.flow_status,
    readiness_state: readinessStateForGateStatus(ready ? "ready" : flow.flow_status),
    blocking_stage: flow.blocking_stage,
    vision_configured: flow.vision_configured,
    scheduler_available: flow.scheduler_available,
    scheduler_running: flow.scheduler_running,
    scheduler_healthy: flow.scheduler_healthy,
    game_observation_source_configured:
      flow.game_observation_source_configured,
    capture_request_seen: flow.capture_request_seen,
    game_observation_seen: flow.game_observation_seen,
    low_confidence_observed: flow.low_confidence_observed,
    capture_request_count: flow.capture_request_count,
    observation_count: flow.observation_count,
    low_confidence_count: flow.low_confidence_count,
    recent_game_observation_count: state.history_game_observation_count,
    boundary_audit_violation_count: flow.boundary_audit_violation_count,
    diagnostic_detail: createGateDiagnosticDetail("vision_capture_gate", {
      game_vision_capture_flow_status: flow.flow_status,
      blocking_stage: flow.blocking_stage,
      vision_configured: flow.vision_configured,
      scheduler_available: flow.scheduler_available,
      scheduler_running: flow.scheduler_running,
      scheduler_healthy: flow.scheduler_healthy,
      game_observation_source_configured:
        flow.game_observation_source_configured,
      capture_request_seen: flow.capture_request_seen,
      game_observation_seen: flow.game_observation_seen,
      low_confidence_observed: flow.low_confidence_observed,
      capture_request_count: flow.capture_request_count,
      observation_count: flow.observation_count,
      low_confidence_count: flow.low_confidence_count,
      recent_game_observation_count: state.history_game_observation_count,
      boundary_audit_violation_count: flow.boundary_audit_violation_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeActionGate(runtimeStatus) {
  const flow = runtimeStatus.action_gate_flow;
  const ready =
    ["ready_for_adapter_handoff", "adapter_handoff_active"].includes(
      flow.flow_status
    ) &&
    flow.validation_seen === true &&
    flow.validation_passed === true &&
    flow.validated_control_available === true &&
    flow.rejected_before_adapter !== true &&
    flow.boundary_audit_passed === true;
  return {
    schema: "iris_gameplay_live_readiness_action_gate_v1",
    check_script: CHECK_SCRIPTS.action_gate,
    next_check_script: ready
      ? null
      : runtimeStatus.safe_control_flow?.next_check_script ?? CHECK_SCRIPTS.action_gate,
    ready,
    gate_status: ready ? "ready" : flow.flow_status,
    readiness_state: readinessStateForGateStatus(ready ? "ready" : flow.flow_status),
    action_gate_flow_status: flow.flow_status,
    game_observation_seen: flow.game_observation_seen,
    player_proposal_seen: flow.player_proposal_seen,
    validation_seen: flow.validation_seen,
    validation_passed: flow.validation_passed,
    validated_control_available: flow.validated_control_available,
    adapter_handoff_seen: flow.adapter_handoff_seen,
    adapter_handoff_accepted: flow.adapter_handoff_accepted,
    rejected_before_adapter: flow.rejected_before_adapter,
    stale_observation_rejected_before_adapter:
      flow.stale_observation_rejected_before_adapter,
    future_observation_rejected_before_adapter:
      flow.future_observation_rejected_before_adapter,
    low_confidence_rejected_before_adapter:
      flow.low_confidence_rejected_before_adapter,
    boundary_audit_passed: flow.boundary_audit_passed,
    adapter_request_count: flow.adapter_request_count,
    adapter_accepted_count: flow.adapter_accepted_count,
    adapter_failed_count: flow.adapter_failed_count,
    adapter_expired_action_count: flow.adapter_expired_action_count,
    diagnostic_detail: createGateDiagnosticDetail("action_gate", {
      action_gate_flow_status: flow.flow_status,
      game_observation_seen: flow.game_observation_seen,
      player_proposal_seen: flow.player_proposal_seen,
      validation_seen: flow.validation_seen,
      validation_passed: flow.validation_passed,
      validated_control_available: flow.validated_control_available,
      adapter_handoff_seen: flow.adapter_handoff_seen,
      adapter_handoff_accepted: flow.adapter_handoff_accepted,
      rejected_before_adapter: flow.rejected_before_adapter,
      stale_observation_rejected_before_adapter:
        flow.stale_observation_rejected_before_adapter,
      future_observation_rejected_before_adapter:
        flow.future_observation_rejected_before_adapter,
      low_confidence_rejected_before_adapter:
        flow.low_confidence_rejected_before_adapter,
      boundary_audit_passed: flow.boundary_audit_passed,
      adapter_request_count: flow.adapter_request_count,
      adapter_accepted_count: flow.adapter_accepted_count,
      adapter_failed_count: flow.adapter_failed_count,
      adapter_expired_action_count: flow.adapter_expired_action_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeAdapterGate(runtimeStatus) {
  const adapter = runtimeStatus.game_control_adapter_runtime;
  const ready =
    adapter.adapter_status_available === true &&
    adapter.game_control_readiness_status === "active" &&
    adapter.request_target_configured === true &&
    adapter.game_control_endpoint_locality_ok === true &&
    adapter.request_count > 0 &&
    adapter.accepted_count > 0 &&
    adapter.failed_count === 0 &&
    adapter.unsafe_response_count === 0 &&
    adapter.http_status_failure_count === 0 &&
    adapter.timeout_count === 0 &&
    adapter.request_error_count === 0 &&
    adapter.expired_action_count === 0;
  return {
    schema: "iris_gameplay_live_readiness_adapter_gate_v1",
    check_script: CHECK_SCRIPTS.adapter_gate,
    next_check_script: ready ? null : CHECK_SCRIPTS.adapter_gate,
    ready,
    gate_status: summarizeAdapterGateStatus({ adapter, ready }),
    readiness_state: readinessStateForGateStatus(
      summarizeAdapterGateStatus({ adapter, ready })
    ),
    adapter_status_available: adapter.adapter_status_available,
    adapter_readiness_status: adapter.game_control_readiness_status,
    request_target_configured: adapter.request_target_configured,
    local_endpoint_policy_status: adapter.local_endpoint_policy_status,
    game_control_endpoint_scope: adapter.game_control_endpoint_scope,
    game_control_endpoint_locality_ok:
      adapter.game_control_endpoint_locality_ok === true,
    request_count: adapter.request_count,
    accepted_count: adapter.accepted_count,
    failed_count: adapter.failed_count,
    unsafe_response_count: adapter.unsafe_response_count,
    http_status_failure_count: adapter.http_status_failure_count,
    timeout_count: adapter.timeout_count,
    request_error_count: adapter.request_error_count,
    expired_action_count: adapter.expired_action_count,
    diagnostic_detail: createGateDiagnosticDetail("adapter_gate", {
      adapter_status_available: adapter.adapter_status_available,
      adapter_readiness_status: adapter.game_control_readiness_status,
      request_target_configured: adapter.request_target_configured,
      local_endpoint_policy_status: adapter.local_endpoint_policy_status,
      game_control_endpoint_scope: adapter.game_control_endpoint_scope,
      game_control_endpoint_locality_ok:
        adapter.game_control_endpoint_locality_ok === true,
      request_count: adapter.request_count,
      accepted_count: adapter.accepted_count,
      failed_count: adapter.failed_count,
      unsafe_response_count: adapter.unsafe_response_count,
      http_status_failure_count: adapter.http_status_failure_count,
      timeout_count: adapter.timeout_count,
      request_error_count: adapter.request_error_count,
      expired_action_count: adapter.expired_action_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeSafeControlGate(runtimeStatus) {
  const flow = runtimeStatus.safe_control_flow;
  const ready =
    flow.flow_status === "safe_control_active" &&
    flow.blocking_stage === "none" &&
    flow.validation_passed === true &&
    flow.control_result_seen === true &&
    flow.control_accepted === true &&
    flow.boundary_audit_passed === true &&
    flow.adapter_failed_count === 0 &&
    flow.adapter_expired_action_count === 0;
  return {
    schema: "iris_gameplay_live_readiness_safe_control_gate_v1",
    check_script: CHECK_SCRIPTS.safe_control_gate,
    next_check_script: ready
      ? null
      : flow.next_check_script ?? CHECK_SCRIPTS.safe_control_gate,
    ready,
    gate_status: ready ? "ready" : flow.flow_status,
    readiness_state: readinessStateForGateStatus(ready ? "ready" : flow.flow_status),
    safe_control_flow_status: flow.flow_status,
    blocking_stage: flow.blocking_stage,
    runtime_state_available: flow.runtime_state_available,
    game_observation_seen: flow.game_observation_seen,
    game_perception_seen: flow.game_perception_seen,
    player_step_seen: flow.player_step_seen,
    validation_seen: flow.validation_seen,
    validation_passed: flow.validation_passed,
    control_result_seen: flow.control_result_seen,
    control_accepted: flow.control_accepted,
    control_simulated: flow.control_simulated,
    boundary_audit_seen: flow.boundary_audit_seen,
    boundary_audit_passed: flow.boundary_audit_passed,
    stale_observation_guard_configured:
      flow.stale_observation_guard_configured,
    rate_limit_guard_configured: flow.rate_limit_guard_configured,
    adapter_request_count: flow.adapter_request_count,
    adapter_accepted_count: flow.adapter_accepted_count,
    adapter_failed_count: flow.adapter_failed_count,
    adapter_expired_action_count: flow.adapter_expired_action_count,
    observation_count: flow.observation_count,
    recent_safe_control_count: flow.recent_safe_control_count,
    diagnostic_detail: createGateDiagnosticDetail("safe_control_gate", {
      safe_control_flow_status: flow.flow_status,
      blocking_stage: flow.blocking_stage,
      runtime_state_available: flow.runtime_state_available,
      game_observation_seen: flow.game_observation_seen,
      game_perception_seen: flow.game_perception_seen,
      player_step_seen: flow.player_step_seen,
      validation_seen: flow.validation_seen,
      validation_passed: flow.validation_passed,
      control_result_seen: flow.control_result_seen,
      control_accepted: flow.control_accepted,
      control_simulated: flow.control_simulated,
      boundary_audit_seen: flow.boundary_audit_seen,
      boundary_audit_passed: flow.boundary_audit_passed,
      stale_observation_guard_configured:
        flow.stale_observation_guard_configured,
      rate_limit_guard_configured: flow.rate_limit_guard_configured,
      adapter_request_count: flow.adapter_request_count,
      adapter_accepted_count: flow.adapter_accepted_count,
      adapter_failed_count: flow.adapter_failed_count,
      adapter_expired_action_count: flow.adapter_expired_action_count,
      observation_count: flow.observation_count,
      recent_safe_control_count: flow.recent_safe_control_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeLifecycleGate(runtimeStatus) {
  const flow = runtimeStatus.safe_action_lifecycle_flow;
  const ready =
    flow.flow_status === "safe_control_active" &&
    flow.blocking_stage === "none" &&
    flow.validation_passed === true &&
    flow.adapter_handoff_accepted === true &&
    flow.control_result_seen === true &&
    flow.control_accepted === true &&
    flow.boundary_audit_passed === true &&
    flow.lifecycle_policy?.validation_required_before_adapter === true &&
    flow.lifecycle_policy?.adapter_receives_validated_control_only === true;
  return {
    schema: "iris_gameplay_live_readiness_lifecycle_gate_v1",
    check_script: CHECK_SCRIPTS.lifecycle_gate,
    next_check_script: ready
      ? null
      : flow.next_check_script ?? CHECK_SCRIPTS.lifecycle_gate,
    ready,
    gate_status: ready ? "ready" : flow.flow_status,
    readiness_state: readinessStateForGateStatus(ready ? "ready" : flow.flow_status),
    lifecycle_flow_status: flow.flow_status,
    blocking_stage: flow.blocking_stage,
    runtime_state_available: flow.runtime_state_available,
    game_observation_seen: flow.game_observation_seen,
    game_perception_seen: flow.game_perception_seen,
    player_proposal_seen: flow.player_proposal_seen,
    validation_seen: flow.validation_seen,
    validation_passed: flow.validation_passed,
    rejected_before_adapter: flow.rejected_before_adapter,
    adapter_handoff_seen: flow.adapter_handoff_seen,
    adapter_handoff_accepted: flow.adapter_handoff_accepted,
    control_result_seen: flow.control_result_seen,
    control_accepted: flow.control_accepted,
    boundary_audit_passed: flow.boundary_audit_passed,
    safe_control_flow_status: flow.safe_control_flow_status,
    action_gate_flow_status: flow.action_gate_flow_status,
    adapter_failed_count: flow.adapter_failed_count,
    adapter_expired_action_count: flow.adapter_expired_action_count,
    diagnostic_detail: createGateDiagnosticDetail("lifecycle_gate", {
      lifecycle_flow_status: flow.flow_status,
      blocking_stage: flow.blocking_stage,
      runtime_state_available: flow.runtime_state_available,
      game_observation_seen: flow.game_observation_seen,
      game_perception_seen: flow.game_perception_seen,
      player_proposal_seen: flow.player_proposal_seen,
      validation_seen: flow.validation_seen,
      validation_passed: flow.validation_passed,
      rejected_before_adapter: flow.rejected_before_adapter,
      adapter_handoff_seen: flow.adapter_handoff_seen,
      adapter_handoff_accepted: flow.adapter_handoff_accepted,
      control_result_seen: flow.control_result_seen,
      control_accepted: flow.control_accepted,
      boundary_audit_passed: flow.boundary_audit_passed,
      safe_control_flow_status: flow.safe_control_flow_status,
      action_gate_flow_status: flow.action_gate_flow_status,
      adapter_failed_count: flow.adapter_failed_count,
      adapter_expired_action_count: flow.adapter_expired_action_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeVisionToActionGate(runtimeStatus) {
  const flow = runtimeStatus.vision_to_safe_action_flow;
  const ready =
    flow.flow_status === "safe_control_active" &&
    flow.blocking_stage === "none" &&
    flow.game_observation_seen === true &&
    flow.low_confidence_observed !== true &&
    flow.validation_passed === true &&
    flow.rejected_before_adapter !== true &&
    flow.adapter_handoff_accepted === true &&
    flow.control_accepted === true &&
    flow.vision_to_action_policy?.raw_vision_never_controls_game === true &&
    flow.vision_to_action_policy?.only_validated_control_reaches_adapter === true;
  return {
    schema: "iris_gameplay_live_readiness_vision_to_action_gate_v1",
    check_script: CHECK_SCRIPTS.vision_to_action_gate,
    next_check_script: ready
      ? null
      : flow.next_check_script ?? CHECK_SCRIPTS.vision_to_action_gate,
    ready,
    gate_status: ready ? "ready" : flow.flow_status,
    readiness_state: readinessStateForGateStatus(ready ? "ready" : flow.flow_status),
    vision_to_safe_action_flow_status: flow.flow_status,
    blocking_stage: flow.blocking_stage,
    capture_request_seen: flow.capture_request_seen,
    game_observation_seen: flow.game_observation_seen,
    low_confidence_observed: flow.low_confidence_observed,
    low_confidence_rejected_before_adapter:
      flow.low_confidence_rejected_before_adapter,
    runtime_state_available: flow.runtime_state_available,
    game_perception_seen: flow.game_perception_seen,
    player_proposal_seen: flow.player_proposal_seen,
    validation_seen: flow.validation_seen,
    validation_passed: flow.validation_passed,
    rejected_before_adapter: flow.rejected_before_adapter,
    adapter_handoff_seen: flow.adapter_handoff_seen,
    adapter_handoff_accepted: flow.adapter_handoff_accepted,
    control_result_seen: flow.control_result_seen,
    control_accepted: flow.control_accepted,
    boundary_audit_passed: flow.boundary_audit_passed,
    adapter_request_count: flow.adapter_request_count,
    adapter_accepted_count: flow.adapter_accepted_count,
    adapter_failed_count: flow.adapter_failed_count,
    adapter_expired_action_count: flow.adapter_expired_action_count,
    diagnostic_detail: createGateDiagnosticDetail("vision_to_action_gate", {
      vision_to_safe_action_flow_status: flow.flow_status,
      blocking_stage: flow.blocking_stage,
      capture_request_seen: flow.capture_request_seen,
      game_observation_seen: flow.game_observation_seen,
      low_confidence_observed: flow.low_confidence_observed,
      low_confidence_rejected_before_adapter:
        flow.low_confidence_rejected_before_adapter,
      runtime_state_available: flow.runtime_state_available,
      game_perception_seen: flow.game_perception_seen,
      player_proposal_seen: flow.player_proposal_seen,
      validation_seen: flow.validation_seen,
      validation_passed: flow.validation_passed,
      rejected_before_adapter: flow.rejected_before_adapter,
      adapter_handoff_seen: flow.adapter_handoff_seen,
      adapter_handoff_accepted: flow.adapter_handoff_accepted,
      control_result_seen: flow.control_result_seen,
      control_accepted: flow.control_accepted,
      boundary_audit_passed: flow.boundary_audit_passed,
      adapter_request_count: flow.adapter_request_count,
      adapter_accepted_count: flow.adapter_accepted_count,
      adapter_failed_count: flow.adapter_failed_count,
      adapter_expired_action_count: flow.adapter_expired_action_count,
    }),
    boundary_policy: gateBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function summarizeSchedulerGateStatus({ runtimeStatus, scheduler, telemetry, ready }) {
  if (runtimeStatus.preflight_status !== "ready_to_poll_game_and_approve_control") {
    return "configuration_attention";
  }
  if (scheduler.scheduler_available !== true) return "scheduler_unavailable";
  if (scheduler.running !== true) return "waiting_for_scheduler_start";
  if (
    scheduler.scheduler_status_error !== null ||
    scheduler.source_error_count > 0 ||
    scheduler.game_observation_source_count === 0 ||
    telemetry.consecutive_error_count > 0
  ) {
    return "scheduler_attention";
  }
  return ready ? "ready" : "scheduler_attention";
}

function summarizeAdapterGateStatus({ adapter, ready }) {
  if (ready) return "ready";
  if (adapter.adapter_status_available !== true) return "unavailable";
  if (
    adapter.game_control_readiness_status === "attention" ||
    adapter.failed_count > 0 ||
    adapter.unsafe_response_count > 0 ||
    adapter.http_status_failure_count > 0 ||
    adapter.timeout_count > 0 ||
    adapter.request_error_count > 0 ||
    adapter.expired_action_count > 0 ||
    adapter.game_control_endpoint_locality_ok !== true
  ) {
    return "adapter_attention";
  }
  return adapter.game_control_readiness_status;
}

function summarizeLiveReadinessStatus({
  configurationGate,
  schedulerGate,
  visionCaptureGate,
  actionGate,
  adapterGate,
  safeControlGate,
  lifecycleGate,
  visionToActionGate,
}) {
  if (configurationGate.ready !== true) return "configuration_attention";
  if (schedulerGate.ready !== true) return "scheduler_attention";
  if (visionCaptureGate.ready !== true) return "vision_attention";
  if (actionGate.ready !== true) return "action_gate_attention";
  if (adapterGate.ready !== true) return "adapter_attention";
  if (
    safeControlGate.ready !== true ||
    lifecycleGate.ready !== true ||
    visionToActionGate.ready !== true
  ) {
    return "safe_control_attention";
  }
  return "ready_for_gameplay_safe_control";
}

function firstAttentionGate(gates) {
  for (const [gateId, gate] of gates) {
    if (gate?.ready !== true) {
      return {
        gate_id: gateId,
        next_check_script:
          gate?.next_check_script ?? gate?.check_script ?? CHECK_SCRIPTS[gateId],
        readiness_state: gate?.readiness_state ?? "operator_review_required",
      };
    }
  }
  return null;
}

function gateBoundaryPolicy() {
  return {
    counts_statuses_booleans_and_policy_only: true,
    script_names_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_raw_frames: true,
    no_raw_ocr_text: true,
    no_vision_payloads: true,
    no_action_candidates: true,
    no_approved_actions: true,
    no_commands: true,
  };
}

function readinessStateForGateStatus(status) {
  if (status === "ready" || status === "safe_control_active") return "ready";
  if (
    status === "configuration_attention" ||
    status === "adapter_attention" ||
    status === "safe_control_attention" ||
    status === "action_gate_attention" ||
    status === "vision_attention" ||
    status === "runtime_attention" ||
    status === "blocked_before_adapter" ||
    status === "vision_low_confidence_blocked" ||
    status === "vision_observation_low_confidence" ||
    status === "scheduler_attention" ||
    status === "unavailable" ||
    status === "attention"
  ) {
    return "operator_review_required";
  }
  if (
    status === "scheduler_unavailable" ||
    status?.startsWith("waiting_") ||
    status === "vision_waiting" ||
    status === "ready_for_adapter_handoff" ||
    status === "idle" ||
    status === "active" ||
    status === "adapter_handoff_active" ||
    status === "vision_observation_active"
  ) {
    return "runtime_waiting";
  }
  return "configuration_waiting";
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
  return [...READINESS_STATES].every((state) => left?.[state] === right?.[state]);
}

function assertConfigurationGateSafe(gate, context) {
  assertGateObject(
    gate,
    "iris_gameplay_live_readiness_configuration_gate_v1",
    context
  );
  if (!CONFIGURATION_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid configuration gate status`);
  }
  assertBooleans(gate, context, [
    "ready",
    "preflight_ready",
    "vision_ready",
    "game_control_ready",
    "vision_target_policy_allowed",
    "game_control_target_policy_allowed",
    "rate_limit_guard_configured",
    "stale_observation_guard_configured",
  ]);
  assertGateCounts(gate, context, [
    "allowed_control_kind_count",
    "unsupported_control_kind_count",
    "preflight_attention_reason_count",
  ]);
  assertGateDiagnosticDetailSafe(
    gate.diagnostic_detail,
    "configuration_gate",
    context
  );
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertSchedulerGateSafe(gate, context) {
  assertGateObject(gate, "iris_gameplay_live_readiness_scheduler_gate_v1", context);
  if (!SCHEDULER_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid scheduler gate status`);
  }
  assertBooleans(gate, context, [
    "ready",
    "scheduler_available",
    "scheduler_running",
    "scheduler_ticking",
    "scheduler_status_error_seen",
  ]);
  assertGateCounts(gate, context, [
    "source_count",
    "game_observation_source_count",
    "processed_count",
    "duplicate_count",
    "source_error_count",
    "capture_request_count",
    "observation_count",
    "low_confidence_count",
    "source_consecutive_error_count",
  ]);
  assertGateDiagnosticDetailSafe(gate.diagnostic_detail, "scheduler_gate", context);
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertVisionCaptureGateSafe(gate, context) {
  assertGateObject(
    gate,
    "iris_gameplay_live_readiness_vision_capture_gate_v1",
    context
  );
  if (!VISION_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid vision capture gate status`);
  }
  assertBlockingStage(gate.blocking_stage, context);
  assertBooleans(gate, context, [
    "ready",
    "vision_configured",
    "scheduler_available",
    "scheduler_running",
    "scheduler_healthy",
    "game_observation_source_configured",
    "capture_request_seen",
    "game_observation_seen",
    "low_confidence_observed",
  ]);
  assertGateCounts(gate, context, [
    "capture_request_count",
    "observation_count",
    "low_confidence_count",
    "recent_game_observation_count",
    "boundary_audit_violation_count",
  ]);
  assertGateDiagnosticDetailSafe(
    gate.diagnostic_detail,
    "vision_capture_gate",
    context
  );
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertActionGateSafe(gate, context) {
  assertGateObject(gate, "iris_gameplay_live_readiness_action_gate_v1", context);
  if (!ACTION_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid action gate status`);
  }
  assertStringStatus(
    gate.action_gate_flow_status,
    `${context}: invalid action gate flow status`
  );
  assertBooleans(gate, context, [
    "ready",
    "game_observation_seen",
    "player_proposal_seen",
    "validation_seen",
    "validation_passed",
    "validated_control_available",
    "adapter_handoff_seen",
    "adapter_handoff_accepted",
    "rejected_before_adapter",
    "stale_observation_rejected_before_adapter",
    "future_observation_rejected_before_adapter",
    "low_confidence_rejected_before_adapter",
    "boundary_audit_passed",
  ]);
  assertGateCounts(gate, context, [
    "adapter_request_count",
    "adapter_accepted_count",
    "adapter_failed_count",
    "adapter_expired_action_count",
  ]);
  assertGateDiagnosticDetailSafe(gate.diagnostic_detail, "action_gate", context);
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertAdapterGateSafe(gate, context) {
  assertGateObject(gate, "iris_gameplay_live_readiness_adapter_gate_v1", context);
  if (!ADAPTER_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid adapter gate status`);
  }
  for (const field of [
    "adapter_readiness_status",
    "local_endpoint_policy_status",
    "game_control_endpoint_scope",
  ]) {
    assertNullableStringStatus(gate[field], `${context}: invalid ${field}`);
  }
  assertBooleans(gate, context, [
    "ready",
    "adapter_status_available",
    "request_target_configured",
    "game_control_endpoint_locality_ok",
  ]);
  assertGateCounts(gate, context, [
    "request_count",
    "accepted_count",
    "failed_count",
    "unsafe_response_count",
    "http_status_failure_count",
    "timeout_count",
    "request_error_count",
    "expired_action_count",
  ]);
  assertGateDiagnosticDetailSafe(gate.diagnostic_detail, "adapter_gate", context);
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertSafeControlGateSafe(gate, context) {
  assertGateObject(
    gate,
    "iris_gameplay_live_readiness_safe_control_gate_v1",
    context
  );
  if (!SAFE_CONTROL_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid safe control gate status`);
  }
  assertBlockingStage(gate.blocking_stage, context);
  assertStringStatus(
    gate.safe_control_flow_status,
    `${context}: invalid safe control flow status`
  );
  assertBooleans(gate, context, [
    "ready",
    "runtime_state_available",
    "game_observation_seen",
    "game_perception_seen",
    "player_step_seen",
    "validation_seen",
    "validation_passed",
    "control_result_seen",
    "control_accepted",
    "control_simulated",
    "boundary_audit_seen",
    "boundary_audit_passed",
    "stale_observation_guard_configured",
    "rate_limit_guard_configured",
  ]);
  assertGateCounts(gate, context, [
    "adapter_request_count",
    "adapter_accepted_count",
    "adapter_failed_count",
    "adapter_expired_action_count",
    "observation_count",
    "recent_safe_control_count",
  ]);
  assertGateDiagnosticDetailSafe(
    gate.diagnostic_detail,
    "safe_control_gate",
    context
  );
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertLifecycleGateSafe(gate, context) {
  assertGateObject(gate, "iris_gameplay_live_readiness_lifecycle_gate_v1", context);
  if (!LIFECYCLE_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid lifecycle gate status`);
  }
  assertBlockingStage(gate.blocking_stage, context);
  for (const field of [
    "lifecycle_flow_status",
    "safe_control_flow_status",
    "action_gate_flow_status",
  ]) {
    assertStringStatus(gate[field], `${context}: invalid ${field}`);
  }
  assertBooleans(gate, context, [
    "ready",
    "runtime_state_available",
    "game_observation_seen",
    "game_perception_seen",
    "player_proposal_seen",
    "validation_seen",
    "validation_passed",
    "rejected_before_adapter",
    "adapter_handoff_seen",
    "adapter_handoff_accepted",
    "control_result_seen",
    "control_accepted",
    "boundary_audit_passed",
  ]);
  assertGateCounts(gate, context, [
    "adapter_failed_count",
    "adapter_expired_action_count",
  ]);
  assertGateDiagnosticDetailSafe(gate.diagnostic_detail, "lifecycle_gate", context);
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertVisionToActionGateSafe(gate, context) {
  assertGateObject(
    gate,
    "iris_gameplay_live_readiness_vision_to_action_gate_v1",
    context
  );
  if (!VISION_TO_ACTION_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid vision-to-action gate status`);
  }
  assertBlockingStage(gate.blocking_stage, context);
  assertStringStatus(
    gate.vision_to_safe_action_flow_status,
    `${context}: invalid vision-to-action flow status`
  );
  assertBooleans(gate, context, [
    "ready",
    "capture_request_seen",
    "game_observation_seen",
    "low_confidence_observed",
    "low_confidence_rejected_before_adapter",
    "runtime_state_available",
    "game_perception_seen",
    "player_proposal_seen",
    "validation_seen",
    "validation_passed",
    "rejected_before_adapter",
    "adapter_handoff_seen",
    "adapter_handoff_accepted",
    "control_result_seen",
    "control_accepted",
    "boundary_audit_passed",
  ]);
  assertGateCounts(gate, context, [
    "adapter_request_count",
    "adapter_accepted_count",
    "adapter_failed_count",
    "adapter_expired_action_count",
  ]);
  assertGateDiagnosticDetailSafe(
    gate.diagnostic_detail,
    "vision_to_action_gate",
    context
  );
  assertGateBoundaryPolicySafe(gate.boundary_policy, context);
  assertAdapterValidation(gate, context);
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_gameplay_live_readiness_scripts_v1") {
    throw new ContractError(`${context}: invalid verification scripts schema`);
  }
  for (const field of [
    "local_env_profile_script",
    "local_env_apply_plan_script",
    "env_setup_plan_script",
    "launch_plan_script",
    "runtime_status_script",
    "live_readiness_script",
    "readiness_rehearsal_script",
    "runtime_roundtrip_script",
    "policy_gate_roundtrip_script",
    "validation_gate_roundtrip_script",
    "vision_roundtrip_script",
    "vision_unsafe_roundtrip_script",
    "game_control_roundtrip_script",
    "game_control_failure_roundtrip_script",
    "game_control_unsafe_roundtrip_script",
    "production_loop_roundtrip_script",
  ]) {
    assertSafeScriptName(scripts[field], `${context}: ${field}`);
  }
  if (scripts.expected_runtime_status !== "safe_control_active") {
    throw new ContractError(`${context}: invalid expected runtime status`);
  }
  if (scripts.expected_vision_capture_status !== "vision_observation_active") {
    throw new ContractError(`${context}: invalid expected vision status`);
  }
  if (scripts.expected_action_gate_status !== "adapter_handoff_active") {
    throw new ContractError(`${context}: invalid expected action gate status`);
  }
  if (scripts.expected_safe_control_status !== "safe_control_active") {
    throw new ContractError(`${context}: invalid expected safe control status`);
  }
  if (scripts.expected_live_readiness_status !== "ready_for_gameplay_safe_control") {
    throw new ContractError(`${context}: invalid expected live readiness status`);
  }
  assertVerificationScriptsBoundaryPolicySafe(scripts.boundary_policy, context);
}

function assertGameplayLiveReadinessBoundaryPolicySafe(policy, context) {
  assertBoundaryPolicy(policy, [
    "env_names_only",
    "counts_statuses_booleans_and_policy_only",
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
    "read_only_live_readiness",
    "no_polling_side_effects",
    "no_control_side_effects",
  ], context);
}

function assertVerificationScriptsBoundaryPolicySafe(policy, context) {
  assertBoundaryPolicy(policy, [
    "script_names_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_frames",
    "no_raw_ocr_text",
    "no_vision_payloads",
    "no_candidates",
    "no_approved_actions",
    "no_commands",
  ], `${context}: verification`);
}

function assertGateObject(gate, schema, context) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate is required`);
  }
  if (gate.schema !== schema) {
    throw new ContractError(`${context}: invalid gate schema`);
  }
  assertSafeScriptName(gate.check_script, `${context}: gate check script`);
  assertGateNextCheckScriptSafe(gate, `${context}: gate next check script`);
  assertSafeReadinessState(gate.readiness_state, context);
  if (gate.readiness_state !== readinessStateForGateStatus(gate.gate_status)) {
    throw new ContractError(`${context}: invalid gate readiness state`);
  }
}

function assertGateNextCheckScriptSafe(gate, context) {
  if (gate.ready === true) {
    if (gate.next_check_script !== null) {
      throw new ContractError(`${context}: ready gate must not expose next check`);
    }
    return;
  }
  assertSafeScriptName(gate.next_check_script, context);
}

function assertBooleans(gate, context, fields) {
  for (const field of fields) {
    if (typeof gate[field] !== "boolean") {
      throw new ContractError(`${context}: invalid flag ${field}`);
    }
  }
}

function assertGateCounts(gate, context, fields) {
  for (const field of fields) {
    assertNonNegativeInteger(gate[field], `${context}: invalid ${field}`);
  }
}

function createGateDiagnosticDetail(gateId, fields) {
  const detail = {
    schema: "iris_gameplay_live_readiness_gate_diagnostic_detail_v1",
    gate_id: gateId,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "boolean") {
      detail[key] = value;
    } else if (Number.isInteger(value) && value >= 0) {
      detail[key] = value;
    } else if (typeof value === "string") {
      detail[key] = safeDiagnosticLabel(value);
    }
  }
  return detail;
}

function assertGateDiagnosticDetailSafe(detail, gateId, context) {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
    throw new ContractError(`${context}: gate diagnostic detail is required`);
  }
  if (detail.schema !== "iris_gameplay_live_readiness_gate_diagnostic_detail_v1") {
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
    throw new ContractError(`${context}: invalid gate diagnostic value`);
  }
}

function assertBlockingStage(value, context) {
  if (!BLOCKING_STAGES.has(value)) {
    throw new ContractError(`${context}: invalid blocking stage`);
  }
}

function assertGateBoundaryPolicySafe(policy, context) {
  assertBoundaryPolicy(policy, [
    "counts_statuses_booleans_and_policy_only",
    "script_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_raw_frames",
    "no_raw_ocr_text",
    "no_vision_payloads",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
  ], `${context}: gate`);
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

function assertNullableStringStatus(value, context) {
  if (value === null) return;
  assertStringStatus(value, context);
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

function assertEnvNameListSafe(names, context) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of names) {
    if (typeof name !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function safeDiagnosticLabel(value) {
  const text = String(value).replace(/\s+/g, "_").trim().slice(0, 80);
  return /^[a-zA-Z0-9_:-]+$/.test(text) ? text : "attention";
}

function assertNoForbiddenGameplayLiveReadinessFields(
  value,
  context,
  path = "root"
) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenGameplayLiveReadinessFields(
        item,
        context,
        `${path}[${index}]`
      )
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_GAMEPLAY_LIVE_READINESS_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { field, path });
    }
    assertNoForbiddenGameplayLiveReadinessFields(child, context, `${path}.${field}`);
  }
}
