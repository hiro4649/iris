import { ContractError } from "../../core/contracts.js";
import {
  assertGameplayPreflightReportSafe,
  createGameplayPreflightReport,
} from "./gameplayPreflight.js";

const FORBIDDEN_GAMEPLAY_RUNTIME_STATUS_FIELDS = new Set([
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

const RUNTIME_STATUSES = new Set([
  "attention_required",
  "scheduler_unavailable",
  "configured_waiting_for_scheduler_start",
  "polling_active_waiting_for_game_observation",
  "game_observation_active",
  "safe_control_active",
  "gameplay_runtime_attention",
]);
const PREFLIGHT_STATUSES = new Set([
  "ready_to_poll_game_and_approve_control",
  "blocked_by_configuration",
]);
const CHECK_STATUSES = new Set(["ready", "attention"]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const VISION_MODES = new Set(["http_game_observation", "not_configured"]);
const GAME_CONTROL_MODES = new Set(["http", "mock", "unsupported_adapter"]);
const TARGET_POLICY_STATUSES = new Set(["allowed", "attention", "not_applicable"]);
const GAMEPLAY_RUNTIME_STATUS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "runtime_status",
  "preflight_status",
  "preflight_attention_reason_count",
  "preflight_next_attention_reason",
  "vision_status",
  "game_control_status",
  "vision_mode",
  "game_control_mode",
  "ingest_scheduler_enabled_by_env",
  "vision_target_policy_status",
  "game_control_target_policy_status",
  "allowed_control_kind_count",
  "unsupported_control_kind_count",
  "rate_limit_env_configured",
  "stale_observation_guard_env_configured",
  "next_runtime_check_script",
  "next_readiness_state",
  "readiness_state_counts",
  "scheduler_summary",
  "gameplay_state",
  "game_control_adapter_runtime",
  "game_vision_capture_flow",
  "safe_control_flow",
  "action_gate_flow",
  "vision_to_safe_action_flow",
  "safe_action_lifecycle_flow",
  "production_handoff_summary",
  "safe_control_policy",
  "boundary_policy",
  "adapter_validation_required",
]);
const GAME_CONTROL_ADAPTER_READINESS_STATUSES = new Set([
  "idle",
  "active",
  "attention",
  "unavailable",
]);
const SAFE_CONTROL_FLOW_STATUSES = new Set([
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
]);
const SAFE_CONTROL_BLOCKING_STAGES = new Set([
  "configuration",
  "scheduler",
  "game_observation_source",
  "game_observation",
  "perception",
  "player_step",
  "validator",
  "adapter_status",
  "adapter_ack",
  "boundary_audit",
  "none",
]);
const GAME_VISION_CAPTURE_FLOW_STATUSES = new Set([
  "configuration_attention",
  "scheduler_unavailable",
  "waiting_for_scheduler_start",
  "waiting_for_game_observation_source",
  "waiting_for_capture_request",
  "waiting_for_game_observation",
  "vision_observation_active",
  "vision_observation_low_confidence",
  "runtime_attention",
]);
const GAME_VISION_CAPTURE_BLOCKING_STAGES = new Set([
  "configuration",
  "scheduler",
  "game_observation_source",
  "capture_request",
  "game_observation",
  "confidence",
  "boundary_audit",
  "none",
]);
const ACTION_GATE_FLOW_STATUSES = new Set([
  "configuration_attention",
  "waiting_for_game_observation",
  "waiting_for_player_proposal",
  "waiting_for_validation",
  "blocked_before_adapter",
  "ready_for_adapter_handoff",
  "adapter_handoff_active",
  "runtime_attention",
]);
const SAFE_ACTION_LIFECYCLE_FLOW_STATUSES = new Set([
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
]);
const SAFE_ACTION_LIFECYCLE_BLOCKING_STAGES = new Set([
  "configuration",
  "scheduler",
  "game_observation_source",
  "game_observation",
  "perception",
  "player_proposal",
  "validator",
  "adapter_status",
  "adapter_ack",
  "boundary_audit",
  "none",
]);
const VISION_TO_SAFE_ACTION_FLOW_STATUSES = new Set([
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
]);
const VISION_TO_SAFE_ACTION_BLOCKING_STAGES = new Set([
  "configuration",
  "runtime",
  "vision",
  "confidence",
  "perception",
  "player_proposal",
  "validator",
  "adapter_ack",
  "none",
]);
const RUNTIME_CHECK_SCRIPTS = {
  configuration: "npm run dev:gameplay:preflight",
  scheduler: "npm run dev:gameplay:runtime-status",
  runtime: "npm run dev:gameplay:runtime-status",
  game_observation_source: "npm run dev:vision:game-roundtrip",
  capture_request: "npm run dev:vision:game-roundtrip",
  game_observation: "npm run dev:vision:game-roundtrip",
  vision: "npm run dev:vision:game-roundtrip",
  confidence: "npm run dev:gameplay:validation-gate-roundtrip",
  perception: "npm run dev:gameplay:validation-gate-roundtrip",
  player_step: "npm run dev:gameplay:validation-gate-roundtrip",
  player_proposal: "npm run dev:gameplay:validation-gate-roundtrip",
  validator: "npm run dev:gameplay:validation-gate-roundtrip",
  adapter_status: "npm run dev:game-control:roundtrip",
  adapter_ack: "npm run dev:gameplay:runtime-roundtrip",
  boundary_audit: "npm run dev:gameplay:runtime-roundtrip",
  none: null,
};
const URL_PATTERN = /https?:\/\//i;
const UNSAFE_STATUS_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|raw_frame|ocr_text)\b|https?:\/\//i;

export function createGameplayRuntimeStatusReport({
  env = process.env,
  httpIngestScheduler = null,
  streamState = null,
  runtime = null,
  gameControlAdapterStatus = null,
  generatedAtMs = Date.now(),
} = {}) {
  const preflight = createGameplayPreflightReport({ env, generatedAtMs });
  assertGameplayPreflightReportSafe(preflight, "gameplay runtime preflight");

  const schedulerSummary = createSchedulerSummary(httpIngestScheduler);
  const gameplayState = createGameplayStateSummary({ streamState, generatedAtMs });
  const gameControlAdapterRuntime = createGameControlAdapterRuntimeSummary(
    gameControlAdapterStatus ?? readGameControlAdapterStatus(runtime)
  );
  const gameVisionCaptureFlow = createGameVisionCaptureFlowSummary({
    preflight,
    schedulerSummary,
    gameplayState,
  });
  const runtimeStatus = summarizeRuntimeStatus({
    preflight,
    schedulerSummary,
    gameplayState,
    gameControlAdapterRuntime,
  });
  const safeControlFlow = createSafeControlFlowSummary({
    preflight,
    schedulerSummary,
    gameplayState,
    gameControlAdapterRuntime,
  });
  const actionGateFlow = createActionGateFlowSummary({
    preflight,
    gameplayState,
    safeControlFlow,
    gameControlAdapterRuntime,
  });
  const safeActionLifecycleFlow = createSafeActionLifecycleFlowSummary({
    safeControlFlow,
    actionGateFlow,
    gameControlAdapterRuntime,
  });
  const visionToSafeActionFlow = createVisionToSafeActionFlowSummary({
    gameVisionCaptureFlow,
    safeControlFlow,
    actionGateFlow,
    safeActionLifecycleFlow,
  });
  const runtimeFlows = [
    gameVisionCaptureFlow,
    visionToSafeActionFlow,
    safeActionLifecycleFlow,
    safeControlFlow,
  ];
  const nextRuntimeFlow =
    runtimeFlows.find((flow) => flow.next_check_script !== null) ?? null;
  const report = {
    schema: "iris_gameplay_runtime_status_report_v1",
    generated_at_ms: generatedAtMs,
    runtime_status: runtimeStatus,
    preflight_status: preflight.preflight_status,
    preflight_attention_reason_count: preflight.attention_reason_count,
    preflight_next_attention_reason: preflight.next_attention_reason,
    vision_status: preflight.vision_status,
    game_control_status: preflight.game_control_status,
    vision_mode: preflight.vision_mode,
    game_control_mode: preflight.game_control_mode,
    ingest_scheduler_enabled_by_env: preflight.ingest_scheduler_enabled,
    vision_target_policy_status: preflight.vision_target_policy_status,
    game_control_target_policy_status: preflight.game_control_target_policy_status,
    allowed_control_kind_count: preflight.approved_action_kind_count,
    unsupported_control_kind_count: preflight.unsupported_action_name_count,
    rate_limit_env_configured: preflight.rate_limit_env_configured,
    stale_observation_guard_env_configured:
      preflight.stale_observation_guard_env_configured,
    next_runtime_check_script: firstRuntimeCheckScript([
      gameVisionCaptureFlow,
      visionToSafeActionFlow,
      safeActionLifecycleFlow,
      safeControlFlow,
    ]),
    next_readiness_state:
      nextRuntimeFlow?.readiness_state ?? readinessStateForRuntimeStatus(runtimeStatus),
    readiness_state_counts: countReadinessStates(runtimeFlows),
    scheduler_summary: schedulerSummary,
    gameplay_state: gameplayState,
    game_control_adapter_runtime: gameControlAdapterRuntime,
    game_vision_capture_flow: gameVisionCaptureFlow,
    safe_control_flow: safeControlFlow,
    action_gate_flow: actionGateFlow,
    vision_to_safe_action_flow: visionToSafeActionFlow,
    safe_action_lifecycle_flow: safeActionLifecycleFlow,
    production_handoff_summary: createGameplayRuntimeProductionHandoffSummary({
      runtimeStatus,
      preflight,
      schedulerSummary,
      gameplayState,
      gameControlAdapterRuntime,
      gameVisionCaptureFlow,
      safeControlFlow,
      actionGateFlow,
      visionToSafeActionFlow,
      safeActionLifecycleFlow,
    }),
    safe_control_policy: {
      model_proposals_never_sent_to_adapter: true,
      validator_output_required_for_adapter: true,
      viewer_comments_cannot_directly_control_game: true,
      fresh_observation_required_before_adapter: true,
      stale_observation_rejected_before_adapter: true,
      future_observation_rejected_before_adapter: true,
      observation_summary_only_before_player_and_validator: true,
      approved_schema_only_no_os_direct_input: true,
      direct_os_input_forbidden: true,
      non_game_adapters_do_not_receive_actions: true,
      control_rate_limit_enforced_before_adapter: true,
      approved_action_expiry_enforced_by_adapter: true,
      expired_actions_surface_as_runtime_attention: true,
      bridge_ack_shape_only: true,
      runtime_status_counts_only: true,
    },
    boundary_policy: {
      env_names_only: true,
      counts_statuses_and_booleans_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_raw_frames: true,
      no_ocr_text: true,
      no_vision_payloads: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      no_raw_stream_state: true,
      no_raw_scheduler_results: true,
      read_only_runtime_status: true,
      no_polling_side_effects: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertGameplayRuntimeStatusReportSafe(report);
  return report;
}

export function assertGameplayRuntimeStatusReportSafe(
  report,
  context = "gameplay runtime status report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenGameplayRuntimeStatusFields(report, context);
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_gameplay_runtime_status_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!GAMEPLAY_RUNTIME_STATUS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (!RUNTIME_STATUSES.has(report.runtime_status)) {
    throw new ContractError(`${context}: invalid runtime status`);
  }
  if (!PREFLIGHT_STATUSES.has(report.preflight_status)) {
    throw new ContractError(`${context}: invalid preflight status`);
  }
  if (!CHECK_STATUSES.has(report.vision_status)) {
    throw new ContractError(`${context}: invalid vision status`);
  }
  if (!CHECK_STATUSES.has(report.game_control_status)) {
    throw new ContractError(`${context}: invalid game control status`);
  }
  if (!VISION_MODES.has(report.vision_mode)) {
    throw new ContractError(`${context}: invalid vision mode`);
  }
  if (!GAME_CONTROL_MODES.has(report.game_control_mode)) {
    throw new ContractError(`${context}: invalid game control mode`);
  }
  for (const field of [
    "ingest_scheduler_enabled_by_env",
    "rate_limit_env_configured",
    "stale_observation_guard_env_configured",
  ]) {
    if (typeof report[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of ["vision_target_policy_status", "game_control_target_policy_status"]) {
    if (!TARGET_POLICY_STATUSES.has(report[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "preflight_attention_reason_count",
    "allowed_control_kind_count",
    "unsupported_control_kind_count",
  ]) {
    assertNonNegativeInteger(report[field], `${context}: invalid ${field}`);
  }
  assertSafeNullableLabel(
    report.preflight_next_attention_reason,
    `${context}: invalid next attention reason`
  );
  assertSafeOptionalScriptName(
    report.next_runtime_check_script,
    `${context}: next runtime check script`
  );
  assertSafeReadinessState(report.next_readiness_state, context);
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  if (
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      countReadinessStates([
        report.game_vision_capture_flow,
        report.vision_to_safe_action_flow,
        report.safe_action_lifecycle_flow,
        report.safe_control_flow,
      ])
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  assertSchedulerSummarySafe(report.scheduler_summary, context);
  assertGameplayStateSummarySafe(report.gameplay_state, context);
  assertGameControlAdapterRuntimeSummarySafe(report.game_control_adapter_runtime, context);
  assertGameVisionCaptureFlowSummarySafe(report.game_vision_capture_flow, context);
  assertSafeControlFlowSummarySafe(report.safe_control_flow, context);
  assertActionGateFlowSummarySafe(report.action_gate_flow, context);
  assertVisionToSafeActionFlowSummarySafe(
    report.vision_to_safe_action_flow,
    context
  );
  assertSafeActionLifecycleFlowSummarySafe(
    report.safe_action_lifecycle_flow,
    context
  );
  assertGameplayRuntimeProductionHandoffSummarySafe(
    report.production_handoff_summary,
    report,
    context
  );
  if (
    report.next_runtime_check_script !==
    firstRuntimeCheckScript([
      report.game_vision_capture_flow,
      report.vision_to_safe_action_flow,
      report.safe_action_lifecycle_flow,
      report.safe_control_flow,
    ])
  ) {
    throw new ContractError(`${context}: invalid next runtime check script`);
  }
  assertSafeControlPolicy(report.safe_control_policy, context);
  assertBoundaryPolicy(report.boundary_policy, [
    "env_names_only",
    "counts_statuses_and_booleans_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_raw_frames",
    "no_ocr_text",
    "no_vision_payloads",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
    "no_raw_stream_state",
    "no_raw_scheduler_results",
    "read_only_runtime_status",
    "no_polling_side_effects",
    "script_names_only",
  ], context);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set([
    ...requiredFields,
    "booleans_counts_and_fixed_statuses_only",
    "counts_only",
    "counts_statuses_and_booleans_only",
    "env_names_only",
    "no_action_candidates",
    "no_action_payloads",
    "no_approved_actions",
    "no_commands",
    "no_endpoint_values",
    "no_live_payloads",
    "no_ocr_text",
    "no_polling_side_effects",
    "no_raw_payloads",
    "no_raw_frames",
    "no_raw_scheduler_results",
    "no_raw_stream_state",
    "no_secret_values",
    "no_source_names",
    "no_text_payloads",
    "no_vision_payloads",
    "read_only_runtime_status",
    "script_names_only",
  ]);
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

function summarizeRuntimeStatus({
  preflight,
  schedulerSummary,
  gameplayState,
  gameControlAdapterRuntime,
}) {
  if (preflight.preflight_status !== "ready_to_poll_game_and_approve_control") {
    return "attention_required";
  }
  if (!schedulerSummary.scheduler_available) return "scheduler_unavailable";
  if (schedulerSummary.scheduler_status_error || schedulerSummary.source_error_count > 0) {
    return "gameplay_runtime_attention";
  }
  if (
    gameControlAdapterRuntime.adapter_status_available === true &&
    (gameControlAdapterRuntime.game_control_readiness_status === "attention" ||
      gameControlAdapterRuntime.expired_action_count > 0)
  ) {
    return "gameplay_runtime_attention";
  }
  if (!schedulerSummary.running) return "configured_waiting_for_scheduler_start";
  if (gameplayState.boundary_audit_status === "fail") return "gameplay_runtime_attention";
  if (gameplayState.control_status === "failed") return "gameplay_runtime_attention";
  if (
    gameplayState.validation_status === "approved" &&
    gameplayState.control_status === "accepted"
  ) {
    return "safe_control_active";
  }
  if (
    gameplayState.latest_is_game_observation ||
    gameplayState.game_perception_available ||
    gameplayState.game_commentary_available
  ) {
    return "game_observation_active";
  }
  return "polling_active_waiting_for_game_observation";
}

function createSafeControlFlowSummary({
  preflight,
  schedulerSummary,
  gameplayState,
  gameControlAdapterRuntime,
}) {
  const preflightReady =
    preflight.preflight_status === "ready_to_poll_game_and_approve_control";
  const schedulerHealthy =
    schedulerSummary.scheduler_available === true &&
    schedulerSummary.scheduler_status_error === null &&
    schedulerSummary.source_error_count === 0;
  const gameObservationSourceConfigured =
    schedulerSummary.game_observation_source_count > 0;
  const gameObservationSeen =
    gameplayState.latest_is_game_observation === true ||
    gameplayState.vision_summary_available === true ||
    gameplayState.history_game_observation_count > 0;
  const validationPassed =
    gameplayState.validation_status === "approved" &&
    gameplayState.validated_control_available === true;
  const boundaryAuditPassed = gameplayState.boundary_audit_status === "pass";
  const boundaryAuditFailed = gameplayState.boundary_audit_status === "fail";
  const controlFailed = gameplayState.control_status === "failed";
  const controlAccepted =
    gameplayState.control_status === "accepted" && gameplayState.control_accepted === true;
  const adapterAttention =
    gameControlAdapterRuntime.adapter_status_available === true &&
    (gameControlAdapterRuntime.game_control_readiness_status === "attention" ||
      gameControlAdapterRuntime.expired_action_count > 0);
  const context = {
    preflightReady,
    schedulerHealthy,
    schedulerAvailable: schedulerSummary.scheduler_available,
    schedulerRunning: schedulerSummary.running,
    gameObservationSourceConfigured,
    gameObservationSeen,
    perceptionSeen: gameplayState.game_perception_available,
    playerStepSeen: gameplayState.game_player_available,
    validationSeen: gameplayState.game_action_validation_available,
    validationPassed,
    controlResultSeen: gameplayState.game_control_result_available,
    controlAccepted,
    boundaryAuditSeen: gameplayState.boundary_audit_available,
    boundaryAuditPassed,
    boundaryAuditFailed,
    controlFailed,
    adapterAttention,
  };
  return {
    schema: "iris_gameplay_safe_control_flow_summary_v1",
    flow_status: summarizeSafeControlFlowStatus(context),
    readiness_state: readinessStateForFlowStatus(
      summarizeSafeControlFlowStatus(context)
    ),
    blocking_stage: summarizeSafeControlBlockingStage(context),
    next_check_script: checkScriptForBlockingStage(
      summarizeSafeControlBlockingStage(context)
    ),
    preflight_ready: preflightReady,
    scheduler_available: schedulerSummary.scheduler_available,
    scheduler_running: schedulerSummary.running,
    scheduler_healthy: schedulerHealthy,
    game_observation_source_configured: gameObservationSourceConfigured,
    runtime_state_available: gameplayState.stream_state_available,
    game_observation_seen: gameObservationSeen,
    latest_is_game_observation: gameplayState.latest_is_game_observation,
    game_perception_seen: gameplayState.game_perception_available,
    player_step_seen: gameplayState.game_player_available,
    validation_seen: gameplayState.game_action_validation_available,
    validation_status: gameplayState.validation_status,
    validation_passed: validationPassed,
    validated_control_available: gameplayState.validated_control_available,
    control_result_seen: gameplayState.game_control_result_available,
    control_status: gameplayState.control_status,
    control_accepted: controlAccepted,
    control_simulated: gameplayState.control_simulated,
    adapter_status_available: gameControlAdapterRuntime.adapter_status_available,
    adapter_readiness_status:
      gameControlAdapterRuntime.game_control_readiness_status,
    adapter_request_count: gameControlAdapterRuntime.request_count,
    adapter_accepted_count: gameControlAdapterRuntime.accepted_count,
    adapter_failed_count: gameControlAdapterRuntime.failed_count,
    adapter_expired_action_count:
      gameControlAdapterRuntime.expired_action_count,
    adapter_expiry_guard_observed:
      gameControlAdapterRuntime.expired_action_count > 0,
    boundary_audit_seen: gameplayState.boundary_audit_available,
    boundary_audit_status: gameplayState.boundary_audit_status,
    boundary_audit_passed: boundaryAuditPassed,
    stale_observation_guard_configured:
      preflight.stale_observation_guard_env_configured,
    rate_limit_guard_configured: preflight.rate_limit_env_configured,
    stale_observation_rejected_before_adapter:
      gameplayState.stale_observation_rejected_before_adapter,
    future_observation_rejected_before_adapter:
      gameplayState.future_observation_rejected_before_adapter,
    low_confidence_rejected_before_adapter:
      gameplayState.low_confidence_rejected_before_adapter,
    game_observation_source_count: schedulerSummary.game_observation_source_count,
    scheduler_processed_count: schedulerSummary.processed_count,
    scheduler_source_error_count: schedulerSummary.source_error_count,
    observation_count:
      schedulerSummary.gameplay_source_telemetry_counts.observation_count,
    low_confidence_count:
      schedulerSummary.gameplay_source_telemetry_counts.low_confidence_count,
    recent_game_observation_count: gameplayState.history_game_observation_count,
    recent_safe_control_count: gameplayState.history_safe_control_count,
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_raw_stream_state: true,
      no_raw_frames: true,
      no_ocr_text: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
}

function createGameVisionCaptureFlowSummary({
  preflight,
  schedulerSummary,
  gameplayState,
}) {
  const telemetry = schedulerSummary.gameplay_source_telemetry_counts;
  const visionConfigured =
    preflight.vision_status === "ready" &&
    preflight.vision_mode === "http_game_observation" &&
    preflight.vision_target_policy_status === "allowed";
  const schedulerHealthy =
    schedulerSummary.scheduler_available === true &&
    schedulerSummary.scheduler_status_error === null &&
    schedulerSummary.source_error_count === 0 &&
    telemetry.consecutive_error_count === 0;
  const gameObservationSourceConfigured =
    schedulerSummary.game_observation_source_count > 0;
  const captureRequestSeen = telemetry.request_count > 0;
  const gameObservationSeen =
    gameplayState.latest_is_game_observation === true ||
    gameplayState.vision_summary_available === true ||
    gameplayState.history_game_observation_count > 0 ||
    telemetry.observation_count > 0 ||
    telemetry.last_observation_count > 0;
  const lowConfidenceObserved =
    telemetry.low_confidence_count > 0 ||
    gameplayState.low_confidence_rejected_before_adapter === true;
  const boundaryAuditFailed = gameplayState.boundary_audit_status === "fail";
  const context = {
    visionConfigured,
    schedulerAvailable: schedulerSummary.scheduler_available,
    schedulerRunning: schedulerSummary.running,
    schedulerHealthy,
    gameObservationSourceConfigured,
    captureRequestSeen,
    gameObservationSeen,
    lowConfidenceObserved,
    boundaryAuditFailed,
  };
  const summary = {
    schema: "iris_gameplay_vision_capture_flow_summary_v1",
    flow_status: summarizeGameVisionCaptureFlowStatus(context),
    readiness_state: readinessStateForFlowStatus(
      summarizeGameVisionCaptureFlowStatus(context)
    ),
    blocking_stage: summarizeGameVisionCaptureBlockingStage(context),
    next_check_script: checkScriptForBlockingStage(
      summarizeGameVisionCaptureBlockingStage(context)
    ),
    vision_configured: visionConfigured,
    vision_mode: preflight.vision_mode,
    vision_target_policy_status: preflight.vision_target_policy_status,
    ingest_scheduler_enabled_by_env: preflight.ingest_scheduler_enabled,
    scheduler_available: schedulerSummary.scheduler_available,
    scheduler_running: schedulerSummary.running,
    scheduler_healthy: schedulerHealthy,
    game_observation_source_configured: gameObservationSourceConfigured,
    runtime_state_available: gameplayState.stream_state_available,
    capture_request_seen: captureRequestSeen,
    game_observation_seen: gameObservationSeen,
    latest_is_game_observation: gameplayState.latest_is_game_observation,
    vision_summary_available: gameplayState.vision_summary_available,
    game_perception_seen: gameplayState.game_perception_available,
    low_confidence_observed: lowConfidenceObserved,
    low_confidence_rejected_before_adapter:
      gameplayState.low_confidence_rejected_before_adapter,
    stale_observation_rejected_before_adapter:
      gameplayState.stale_observation_rejected_before_adapter,
    future_observation_rejected_before_adapter:
      gameplayState.future_observation_rejected_before_adapter,
    boundary_audit_seen: gameplayState.boundary_audit_available,
    boundary_audit_passed: gameplayState.boundary_audit_status === "pass",
    game_observation_source_count: schedulerSummary.game_observation_source_count,
    capture_request_count: telemetry.request_count,
    source_last_observation_count: telemetry.last_observation_count,
    observation_count: telemetry.observation_count,
    low_confidence_count: telemetry.low_confidence_count,
    with_frame_age_count: telemetry.with_frame_age_count,
    without_frame_age_count: telemetry.without_frame_age_count,
    frame_reference_count: telemetry.frame_reference_count,
    ocr_summary_count: telemetry.ocr_summary_count,
    ui_focus_area_count: telemetry.ui_focus_area_count,
    frame_blob_available_count: telemetry.frame_blob_available_count,
    consecutive_error_count: telemetry.consecutive_error_count,
    scheduler_processed_count: schedulerSummary.processed_count,
    scheduler_source_error_count: schedulerSummary.source_error_count,
    vision_source_kind: gameplayState.vision_source_kind,
    vision_frame_age_ms: gameplayState.vision_frame_age_ms,
    vision_ui_focus_count: gameplayState.vision_ui_focus_count,
    perception_confidence: gameplayState.perception_confidence,
    boundary_audit_violation_count:
      gameplayState.boundary_audit_violation_count,
    capture_policy: {
      configured_source_required: true,
      scheduler_poll_required: true,
      capture_request_shape_only: true,
      raw_frame_not_exposed: true,
      ocr_text_not_exposed: true,
      frame_reference_values_not_exposed: true,
      low_confidence_blocks_before_adapter: true,
      vision_only_never_controls_game: true,
      validation_required_before_adapter: true,
    },
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_raw_stream_state: true,
      no_raw_frames: true,
      no_ocr_text: true,
      no_vision_payloads: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertGameVisionCaptureFlowSummarySafe(summary, "game vision capture flow");
  return summary;
}

function summarizeGameVisionCaptureFlowStatus(context) {
  if (!context.visionConfigured) return "configuration_attention";
  if (!context.schedulerAvailable) return "scheduler_unavailable";
  if (!context.schedulerHealthy || context.boundaryAuditFailed) {
    return "runtime_attention";
  }
  if (!context.schedulerRunning) return "waiting_for_scheduler_start";
  if (!context.gameObservationSourceConfigured) {
    return "waiting_for_game_observation_source";
  }
  if (!context.captureRequestSeen) return "waiting_for_capture_request";
  if (!context.gameObservationSeen) return "waiting_for_game_observation";
  if (context.lowConfidenceObserved) return "vision_observation_low_confidence";
  return "vision_observation_active";
}

function summarizeGameVisionCaptureBlockingStage(context) {
  if (!context.visionConfigured) return "configuration";
  if (!context.schedulerAvailable || !context.schedulerRunning || !context.schedulerHealthy) {
    return "scheduler";
  }
  if (context.boundaryAuditFailed) return "boundary_audit";
  if (!context.gameObservationSourceConfigured) return "game_observation_source";
  if (!context.captureRequestSeen) return "capture_request";
  if (!context.gameObservationSeen) return "game_observation";
  if (context.lowConfidenceObserved) return "confidence";
  return "none";
}

function summarizeSafeControlFlowStatus(context) {
  if (!context.preflightReady) return "configuration_attention";
  if (!context.schedulerAvailable) return "scheduler_unavailable";
  if (
    !context.schedulerHealthy ||
    context.boundaryAuditFailed ||
    context.controlFailed ||
    context.adapterAttention
  ) {
    return "runtime_attention";
  }
  if (!context.schedulerRunning) return "waiting_for_scheduler_start";
  if (!context.gameObservationSourceConfigured) {
    return "waiting_for_game_observation_source";
  }
  if (!context.gameObservationSeen) return "waiting_for_game_observation";
  if (!context.perceptionSeen) return "waiting_for_perception";
  if (!context.playerStepSeen) return "waiting_for_player_step";
  if (!context.validationSeen) return "waiting_for_validation";
  if (!context.validationPassed) return "waiting_for_safe_control";
  if (!context.controlResultSeen || !context.controlAccepted) {
    return "waiting_for_adapter_ack";
  }
  return "safe_control_active";
}

function summarizeSafeControlBlockingStage(context) {
  if (!context.preflightReady) return "configuration";
  if (!context.schedulerAvailable || !context.schedulerRunning || !context.schedulerHealthy) {
    return "scheduler";
  }
  if (context.adapterAttention) return "adapter_status";
  if (!context.gameObservationSourceConfigured) return "game_observation_source";
  if (!context.gameObservationSeen) return "game_observation";
  if (!context.perceptionSeen) return "perception";
  if (!context.playerStepSeen) return "player_step";
  if (!context.validationSeen || !context.validationPassed) return "validator";
  if (!context.controlResultSeen || !context.controlAccepted) return "adapter_ack";
  if (context.boundaryAuditFailed) return "boundary_audit";
  return "none";
}

function createActionGateFlowSummary({
  preflight,
  gameplayState,
  safeControlFlow,
  gameControlAdapterRuntime,
}) {
  const preflightReady =
    preflight.preflight_status === "ready_to_poll_game_and_approve_control";
  const gameObservationSeen = safeControlFlow.game_observation_seen === true;
  const proposalSeen = safeControlFlow.player_step_seen === true;
  const validationSeen = safeControlFlow.validation_seen === true;
  const validationPassed = safeControlFlow.validation_passed === true;
  const controlStatus = safeControlFlow.control_status;
  const adapterHandoffSeen =
    gameControlAdapterRuntime.request_count > 0 ||
    (safeControlFlow.control_result_seen === true &&
      controlStatus !== null &&
      controlStatus !== "not_created");
  const adapterHandoffAccepted = safeControlFlow.control_accepted === true;
  const adapterAttention =
    gameControlAdapterRuntime.adapter_status_available === true &&
    (gameControlAdapterRuntime.game_control_readiness_status === "attention" ||
      gameControlAdapterRuntime.failed_count > 0 ||
      gameControlAdapterRuntime.expired_action_count > 0);
  const rejectedBeforeAdapter =
    validationSeen === true &&
    validationPassed !== true &&
    adapterHandoffSeen !== true;
  const summary = {
    schema: "iris_gameplay_action_gate_flow_summary_v1",
    flow_status: summarizeActionGateFlowStatus({
      preflightReady,
      gameObservationSeen,
      proposalSeen,
      validationSeen,
      validationPassed,
      adapterHandoffSeen,
      adapterHandoffAccepted,
      adapterAttention,
      controlStatus,
      boundaryAuditFailed:
        safeControlFlow.boundary_audit_seen === true &&
        safeControlFlow.boundary_audit_passed !== true,
    }),
    readiness_state: readinessStateForFlowStatus(
      summarizeActionGateFlowStatus({
        preflightReady,
        gameObservationSeen,
        proposalSeen,
        validationSeen,
        validationPassed,
        adapterHandoffSeen,
        adapterHandoffAccepted,
        adapterAttention,
        controlStatus,
        boundaryAuditFailed:
          safeControlFlow.boundary_audit_seen === true &&
          safeControlFlow.boundary_audit_passed !== true,
      })
    ),
    preflight_ready: preflightReady,
    game_observation_seen: gameObservationSeen,
    player_proposal_seen: proposalSeen,
    validation_seen: validationSeen,
    validation_status: safeControlFlow.validation_status,
    validation_passed: validationPassed,
    validated_control_available:
      safeControlFlow.validated_control_available === true,
    adapter_handoff_seen: adapterHandoffSeen,
    adapter_handoff_accepted: adapterHandoffAccepted,
    rejected_before_adapter: rejectedBeforeAdapter,
    stale_observation_rejected_before_adapter:
      gameplayState.stale_observation_rejected_before_adapter,
    future_observation_rejected_before_adapter:
      gameplayState.future_observation_rejected_before_adapter,
    low_confidence_rejected_before_adapter:
      gameplayState.low_confidence_rejected_before_adapter,
    boundary_audit_passed: safeControlFlow.boundary_audit_passed,
    adapter_request_count: gameControlAdapterRuntime.request_count,
    adapter_accepted_count: gameControlAdapterRuntime.accepted_count,
    adapter_failed_count: gameControlAdapterRuntime.failed_count,
    adapter_expired_action_count:
      gameControlAdapterRuntime.expired_action_count,
    gate_policy: {
      proposal_requires_validation: true,
      proposal_not_sent_to_adapter: true,
      validated_control_required_for_adapter: true,
      viewer_comments_cannot_directly_control_game: true,
      stale_future_or_low_confidence_blocks_before_adapter: true,
      validated_control_payload_hidden_from_status: true,
      adapter_ack_shape_only: true,
    },
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_raw_stream_state: true,
      no_raw_frames: true,
      no_ocr_text: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertActionGateFlowSummarySafe(summary, "gameplay action gate flow");
  return summary;
}

function summarizeActionGateFlowStatus({
  preflightReady,
  gameObservationSeen,
  proposalSeen,
  validationSeen,
  validationPassed,
  adapterHandoffSeen,
  adapterHandoffAccepted,
  adapterAttention,
  controlStatus,
  boundaryAuditFailed,
}) {
  if (!preflightReady) return "configuration_attention";
  if (adapterAttention || controlStatus === "failed" || boundaryAuditFailed === true) {
    return "runtime_attention";
  }
  if (!gameObservationSeen) return "waiting_for_game_observation";
  if (!proposalSeen) return "waiting_for_player_proposal";
  if (!validationSeen) return "waiting_for_validation";
  if (!validationPassed) return "blocked_before_adapter";
  if (!adapterHandoffSeen) return "ready_for_adapter_handoff";
  if (adapterHandoffAccepted) return "adapter_handoff_active";
  return "ready_for_adapter_handoff";
}

function createSafeActionLifecycleFlowSummary({
  safeControlFlow,
  actionGateFlow,
  gameControlAdapterRuntime,
}) {
  const context = {
    safeControlStatus: safeControlFlow.flow_status,
    safeControlBlockingStage: safeControlFlow.blocking_stage,
    actionGateStatus: actionGateFlow.flow_status,
    preflightReady: safeControlFlow.preflight_ready,
    schedulerAvailable: safeControlFlow.scheduler_available,
    schedulerRunning: safeControlFlow.scheduler_running,
    schedulerHealthy: safeControlFlow.scheduler_healthy,
    gameObservationSourceConfigured:
      safeControlFlow.game_observation_source_configured,
    gameObservationSeen: safeControlFlow.game_observation_seen,
    perceptionSeen: safeControlFlow.game_perception_seen,
    proposalSeen: actionGateFlow.player_proposal_seen,
    validationSeen: actionGateFlow.validation_seen,
    validationPassed: actionGateFlow.validation_passed,
    rejectedBeforeAdapter: actionGateFlow.rejected_before_adapter,
    adapterHandoffSeen: actionGateFlow.adapter_handoff_seen,
    adapterHandoffAccepted: actionGateFlow.adapter_handoff_accepted,
    controlResultSeen: safeControlFlow.control_result_seen,
    controlAccepted: safeControlFlow.control_accepted,
    adapterAttention:
      gameControlAdapterRuntime.adapter_status_available === true &&
      (gameControlAdapterRuntime.game_control_readiness_status === "attention" ||
        gameControlAdapterRuntime.failed_count > 0 ||
        gameControlAdapterRuntime.expired_action_count > 0),
    boundaryAuditFailed:
      safeControlFlow.boundary_audit_seen === true &&
      safeControlFlow.boundary_audit_passed !== true,
  };
  const summary = {
    schema: "iris_gameplay_safe_action_lifecycle_flow_summary_v1",
    flow_status: summarizeSafeActionLifecycleFlowStatus(context),
    readiness_state: readinessStateForFlowStatus(
      summarizeSafeActionLifecycleFlowStatus(context)
    ),
    blocking_stage: summarizeSafeActionLifecycleBlockingStage(context),
    next_check_script: checkScriptForBlockingStage(
      summarizeSafeActionLifecycleBlockingStage(context)
    ),
    preflight_ready: safeControlFlow.preflight_ready,
    scheduler_available: safeControlFlow.scheduler_available,
    scheduler_running: safeControlFlow.scheduler_running,
    scheduler_healthy: safeControlFlow.scheduler_healthy,
    game_observation_source_configured:
      safeControlFlow.game_observation_source_configured,
    runtime_state_available: safeControlFlow.runtime_state_available,
    game_observation_seen: safeControlFlow.game_observation_seen,
    game_perception_seen: safeControlFlow.game_perception_seen,
    player_proposal_seen: actionGateFlow.player_proposal_seen,
    validation_seen: actionGateFlow.validation_seen,
    validation_status: actionGateFlow.validation_status,
    validation_passed: actionGateFlow.validation_passed,
    validated_control_available: actionGateFlow.validated_control_available,
    rejected_before_adapter: actionGateFlow.rejected_before_adapter,
    adapter_handoff_seen: actionGateFlow.adapter_handoff_seen,
    adapter_handoff_accepted: actionGateFlow.adapter_handoff_accepted,
    adapter_status_available: gameControlAdapterRuntime.adapter_status_available,
    adapter_readiness_status:
      gameControlAdapterRuntime.game_control_readiness_status,
    adapter_request_count: gameControlAdapterRuntime.request_count,
    adapter_accepted_count: gameControlAdapterRuntime.accepted_count,
    adapter_failed_count: gameControlAdapterRuntime.failed_count,
    adapter_expired_action_count: gameControlAdapterRuntime.expired_action_count,
    control_result_seen: safeControlFlow.control_result_seen,
    control_status: safeControlFlow.control_status,
    control_accepted: safeControlFlow.control_accepted,
    control_simulated: safeControlFlow.control_simulated,
    boundary_audit_seen: safeControlFlow.boundary_audit_seen,
    boundary_audit_passed: safeControlFlow.boundary_audit_passed,
    stale_observation_guard_configured:
      safeControlFlow.stale_observation_guard_configured,
    rate_limit_guard_configured: safeControlFlow.rate_limit_guard_configured,
    stale_observation_rejected_before_adapter:
      actionGateFlow.stale_observation_rejected_before_adapter,
    future_observation_rejected_before_adapter:
      actionGateFlow.future_observation_rejected_before_adapter,
    low_confidence_rejected_before_adapter:
      actionGateFlow.low_confidence_rejected_before_adapter,
    observation_count: safeControlFlow.observation_count,
    low_confidence_count: safeControlFlow.low_confidence_count,
    recent_game_observation_count:
      safeControlFlow.recent_game_observation_count,
    recent_safe_control_count: safeControlFlow.recent_safe_control_count,
    safe_control_flow_status: safeControlFlow.flow_status,
    safe_control_blocking_stage: safeControlFlow.blocking_stage,
    action_gate_flow_status: actionGateFlow.flow_status,
    lifecycle_policy: {
      viewer_comments_cannot_directly_control_game: true,
      model_proposals_review_only: true,
      validation_required_before_adapter: true,
      blocked_proposals_stop_before_adapter: true,
      adapter_receives_validated_control_only: true,
      adapter_ack_shape_only: true,
      lifecycle_status_counts_only: true,
    },
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_raw_stream_state: true,
      no_raw_frames: true,
      no_ocr_text: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertSafeActionLifecycleFlowSummarySafe(
    summary,
    "gameplay safe action lifecycle flow"
  );
  return summary;
}

function createVisionToSafeActionFlowSummary({
  gameVisionCaptureFlow,
  safeControlFlow,
  actionGateFlow,
  safeActionLifecycleFlow,
}) {
  const context = {
    preflightReady:
      gameVisionCaptureFlow.vision_configured === true &&
      safeActionLifecycleFlow.preflight_ready === true,
    runtimeAttention:
      gameVisionCaptureFlow.flow_status === "runtime_attention" ||
      safeActionLifecycleFlow.flow_status === "runtime_attention" ||
      actionGateFlow.flow_status === "runtime_attention" ||
      safeControlFlow.flow_status === "runtime_attention",
    gameObservationSeen:
      gameVisionCaptureFlow.game_observation_seen === true &&
      safeActionLifecycleFlow.game_observation_seen === true,
    lowConfidenceObserved:
      gameVisionCaptureFlow.low_confidence_observed === true ||
      safeActionLifecycleFlow.low_confidence_rejected_before_adapter === true,
    perceptionSeen: safeActionLifecycleFlow.game_perception_seen === true,
    proposalSeen: safeActionLifecycleFlow.player_proposal_seen === true,
    validationSeen: safeActionLifecycleFlow.validation_seen === true,
    validationPassed: safeActionLifecycleFlow.validation_passed === true,
    rejectedBeforeAdapter:
      safeActionLifecycleFlow.rejected_before_adapter === true ||
      actionGateFlow.rejected_before_adapter === true,
    adapterHandoffSeen: safeActionLifecycleFlow.adapter_handoff_seen === true,
    adapterHandoffAccepted:
      safeActionLifecycleFlow.adapter_handoff_accepted === true,
    controlAccepted: safeActionLifecycleFlow.control_accepted === true,
  };
  const summary = {
    schema: "iris_gameplay_vision_to_safe_action_flow_summary_v1",
    flow_status: summarizeVisionToSafeActionFlowStatus(context),
    readiness_state: readinessStateForFlowStatus(
      summarizeVisionToSafeActionFlowStatus(context)
    ),
    blocking_stage: summarizeVisionToSafeActionBlockingStage(context),
    next_check_script: checkScriptForBlockingStage(
      summarizeVisionToSafeActionBlockingStage(context)
    ),
    vision_configured: gameVisionCaptureFlow.vision_configured,
    capture_request_seen: gameVisionCaptureFlow.capture_request_seen,
    game_observation_seen: context.gameObservationSeen,
    low_confidence_observed: context.lowConfidenceObserved,
    low_confidence_rejected_before_adapter:
      safeActionLifecycleFlow.low_confidence_rejected_before_adapter,
    runtime_state_available: safeActionLifecycleFlow.runtime_state_available,
    game_perception_seen: safeActionLifecycleFlow.game_perception_seen,
    player_proposal_seen: safeActionLifecycleFlow.player_proposal_seen,
    validation_seen: safeActionLifecycleFlow.validation_seen,
    validation_status: safeActionLifecycleFlow.validation_status,
    validation_passed: safeActionLifecycleFlow.validation_passed,
    validated_control_available:
      safeActionLifecycleFlow.validated_control_available,
    rejected_before_adapter: safeActionLifecycleFlow.rejected_before_adapter,
    adapter_handoff_seen: safeActionLifecycleFlow.adapter_handoff_seen,
    adapter_handoff_accepted:
      safeActionLifecycleFlow.adapter_handoff_accepted,
    control_result_seen: safeActionLifecycleFlow.control_result_seen,
    control_status: safeActionLifecycleFlow.control_status,
    control_accepted: safeActionLifecycleFlow.control_accepted,
    boundary_audit_passed: safeActionLifecycleFlow.boundary_audit_passed,
    capture_request_count: gameVisionCaptureFlow.capture_request_count,
    observation_count: gameVisionCaptureFlow.observation_count,
    low_confidence_count: gameVisionCaptureFlow.low_confidence_count,
    adapter_request_count: safeActionLifecycleFlow.adapter_request_count,
    adapter_accepted_count: safeActionLifecycleFlow.adapter_accepted_count,
    adapter_failed_count: safeActionLifecycleFlow.adapter_failed_count,
    adapter_expired_action_count:
      safeActionLifecycleFlow.adapter_expired_action_count,
    recent_game_observation_count:
      safeActionLifecycleFlow.recent_game_observation_count,
    recent_safe_control_count:
      safeActionLifecycleFlow.recent_safe_control_count,
    game_vision_capture_flow_status: gameVisionCaptureFlow.flow_status,
    safe_control_flow_status: safeControlFlow.flow_status,
    action_gate_flow_status: actionGateFlow.flow_status,
    safe_action_lifecycle_flow_status: safeActionLifecycleFlow.flow_status,
    vision_to_action_policy: {
      raw_vision_never_controls_game: true,
      screen_observation_requires_player_and_validator: true,
      fresh_observation_required_before_adapter: true,
      low_confidence_blocks_before_adapter: true,
      only_validated_control_reaches_adapter: true,
      approved_schema_only_no_os_direct_input: true,
      direct_os_input_forbidden: true,
      non_game_adapters_never_receive_game_actions: true,
      adapter_ack_shape_only: true,
      public_status_counts_only: true,
    },
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_raw_stream_state: true,
      no_raw_frames: true,
      no_ocr_text: true,
      no_vision_payloads: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertVisionToSafeActionFlowSummarySafe(
    summary,
    "gameplay vision to safe action flow"
  );
  return summary;
}

function summarizeVisionToSafeActionFlowStatus(context) {
  if (!context.preflightReady) return "configuration_attention";
  if (context.runtimeAttention) return "runtime_attention";
  if (!context.gameObservationSeen) return "vision_waiting";
  if (
    context.lowConfidenceObserved &&
    (!context.validationPassed || context.rejectedBeforeAdapter)
  ) {
    return "vision_low_confidence_blocked";
  }
  if (!context.perceptionSeen) return "waiting_for_perception";
  if (!context.proposalSeen) return "waiting_for_player_proposal";
  if (!context.validationSeen) return "waiting_for_validation";
  if (context.rejectedBeforeAdapter || !context.validationPassed) {
    return "blocked_before_adapter";
  }
  if (!context.adapterHandoffSeen) return "ready_for_adapter_handoff";
  if (context.adapterHandoffAccepted && context.controlAccepted) {
    return "safe_control_active";
  }
  return "waiting_for_adapter_ack";
}

function summarizeVisionToSafeActionBlockingStage(context) {
  if (!context.preflightReady) return "configuration";
  if (context.runtimeAttention) return "runtime";
  if (!context.gameObservationSeen) return "vision";
  if (
    context.lowConfidenceObserved &&
    (!context.validationPassed || context.rejectedBeforeAdapter)
  ) {
    return "confidence";
  }
  if (!context.perceptionSeen) return "perception";
  if (!context.proposalSeen) return "player_proposal";
  if (!context.validationSeen || context.rejectedBeforeAdapter || !context.validationPassed) {
    return "validator";
  }
  if (!context.adapterHandoffSeen || !context.adapterHandoffAccepted) {
    return "adapter_ack";
  }
  return "none";
}

function summarizeSafeActionLifecycleFlowStatus(context) {
  if (!context.preflightReady) return "configuration_attention";
  if (!context.schedulerAvailable) return "scheduler_unavailable";
  if (
    !context.schedulerHealthy ||
    context.adapterAttention ||
    context.safeControlStatus === "runtime_attention" ||
    context.actionGateStatus === "runtime_attention" ||
    context.boundaryAuditFailed === true
  ) {
    return "runtime_attention";
  }
  if (!context.schedulerRunning) return "waiting_for_scheduler_start";
  if (!context.gameObservationSourceConfigured) {
    return "waiting_for_game_observation_source";
  }
  if (!context.gameObservationSeen) return "waiting_for_game_observation";
  if (!context.perceptionSeen) return "waiting_for_perception";
  if (!context.proposalSeen) return "waiting_for_player_proposal";
  if (!context.validationSeen) return "waiting_for_validation";
  if (context.rejectedBeforeAdapter || !context.validationPassed) {
    return "blocked_before_adapter";
  }
  if (!context.adapterHandoffSeen) return "ready_for_adapter_handoff";
  if (context.adapterHandoffAccepted && context.controlAccepted) {
    return "safe_control_active";
  }
  if (!context.controlResultSeen || !context.controlAccepted) {
    return "waiting_for_adapter_ack";
  }
  return "safe_control_active";
}

function summarizeSafeActionLifecycleBlockingStage(context) {
  if (!context.preflightReady) return "configuration";
  if (!context.schedulerAvailable || !context.schedulerRunning || !context.schedulerHealthy) {
    return "scheduler";
  }
  if (context.adapterAttention) return "adapter_status";
  if (context.boundaryAuditFailed) return "boundary_audit";
  if (!context.gameObservationSourceConfigured) return "game_observation_source";
  if (!context.gameObservationSeen) return "game_observation";
  if (!context.perceptionSeen) return "perception";
  if (!context.proposalSeen) return "player_proposal";
  if (!context.validationSeen || !context.validationPassed) return "validator";
  if (!context.adapterHandoffSeen || !context.controlResultSeen || !context.controlAccepted) {
    return "adapter_ack";
  }
  return "none";
}

function readGameControlAdapterStatus(runtime) {
  if (!runtime || typeof runtime.gameControlAdapterStatus !== "function") return null;
  try {
    const status = runtime.gameControlAdapterStatus();
    return status && typeof status === "object" && !Array.isArray(status) ? status : null;
  } catch {
    return null;
  }
}

function createGameControlAdapterRuntimeSummary(status) {
  const source = status && typeof status === "object" && !Array.isArray(status) ? status : null;
  const gameControlReadinessStatus = safeAdapterReadinessStatus(
    source?.game_control_readiness_status
  );
  const requestCount = requiredGameControlAdapterRuntimeCount(source, "request_count");
  const acceptedCount = requiredGameControlAdapterRuntimeCount(source, "accepted_count");
  const failedCount = requiredGameControlAdapterRuntimeCount(source, "failed_count");
  const unsafeResponseCount = requiredGameControlAdapterRuntimeCount(
    source,
    "unsafe_response_count"
  );
  const httpStatusFailureCount = requiredGameControlAdapterRuntimeCount(
    source,
    "http_status_failure_count"
  );
  const timeoutCount = requiredGameControlAdapterRuntimeCount(source, "timeout_count");
  const requestErrorCount = requiredGameControlAdapterRuntimeCount(
    source,
    "request_error_count"
  );
  const expiredActionCount = requiredGameControlAdapterRuntimeCount(
    source,
    "expired_action_count"
  );
  const lastControlStatus = safeNullableLabel(source?.last_control_status);
  const lastErrorKind = safeNullableLabel(source?.last_error_kind);
  const localEndpointPolicyStatus = safeNullableLabel(
    source?.local_endpoint_policy_status
  );
  const gameControlEndpointScope = safeNullableLabel(
    source?.game_control_endpoint_scope
  );
  const gameControlEndpointLocalityOk =
    typeof source?.game_control_endpoint_locality_ok === "boolean"
      ? source.game_control_endpoint_locality_ok
      : null;
  const requestTargetConfigured =
    localEndpointPolicyStatus === "all_allowed" &&
    gameControlEndpointScope !== null &&
    gameControlEndpointLocalityOk === true;
  const adapterStatusAvailable =
    gameControlReadinessStatus !== "unavailable" ||
    requestTargetConfigured ||
    requestCount > 0 ||
    acceptedCount > 0 ||
    failedCount > 0 ||
    unsafeResponseCount > 0 ||
    httpStatusFailureCount > 0 ||
    timeoutCount > 0 ||
    requestErrorCount > 0 ||
    expiredActionCount > 0 ||
    lastControlStatus !== null ||
    lastErrorKind !== null;
  return {
    schema: "iris_gameplay_game_control_adapter_runtime_summary_v1",
    adapter_status_available: adapterStatusAvailable,
    game_control_readiness_status: gameControlReadinessStatus,
    request_target_configured: requestTargetConfigured,
    local_endpoint_policy_status: localEndpointPolicyStatus,
    game_control_endpoint_scope: gameControlEndpointScope,
    game_control_endpoint_locality_ok: gameControlEndpointLocalityOk,
    request_count: requestCount,
    accepted_count: acceptedCount,
    failed_count: failedCount,
    unsafe_response_count: unsafeResponseCount,
    http_status_failure_count: httpStatusFailureCount,
    timeout_count: timeoutCount,
    request_error_count: requestErrorCount,
    expired_action_count: expiredActionCount,
    last_control_status: lastControlStatus,
    last_error_kind: lastErrorKind,
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_action_payloads: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
}

function requiredGameControlAdapterRuntimeCount(source, field) {
  if (!source) return 0;
  const count = safeNullableInteger(source[field]);
  if (count === null) {
    throw new ContractError(
      `gameplay game control adapter runtime: ${field} is required`
    );
  }
  return count;
}

function safeAdapterReadinessStatus(value) {
  const label = safeNullableLabel(value);
  return GAME_CONTROL_ADAPTER_READINESS_STATUSES.has(label) ? label : "unavailable";
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
  const gameplaySourceTelemetryCounts = summarizeGameplaySourceTelemetryCounts(
    status.source_statuses
  );
  return {
    schema: "iris_gameplay_scheduler_runtime_summary_v1",
    scheduler_available: true,
    scheduler_status_error: null,
    running: status.running === true,
    ticking: status.ticking === true,
    interval_ms: safeNullableInteger(status.interval_ms),
    batch_limit: safeNullableInteger(status.batch_limit),
    continue_on_source_error: status.continue_on_source_error === true,
    source_count: safeCount(status.source_count),
    game_observation_source_count: sourceKindCounts.game_observation_source_count,
    source_kind_counts: sourceKindCounts.source_kind_counts,
    gameplay_source_telemetry_counts: gameplaySourceTelemetryCounts,
    processed_count: safeCount(status.processed_count),
    duplicate_count: safeCount(status.duplicate_count),
    source_error_count: safeCount(status.source_error_count),
    last_error: safeNullableLabel(status.last_error),
    priority_sort: safeNullableLabel(status.priority_sort),
    last_priority_summary: summarizePrioritySummary(
      sourceKindCounts.game_observation_source_count > 0
        ? status.last_priority_summary
        : null
    ),
    boundary_policy: schedulerBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function emptySchedulerSummary() {
  return {
    schema: "iris_gameplay_scheduler_runtime_summary_v1",
    scheduler_available: false,
    scheduler_status_error: null,
    running: false,
    ticking: false,
    interval_ms: null,
    batch_limit: null,
    continue_on_source_error: false,
    source_count: 0,
    game_observation_source_count: 0,
    source_kind_counts: {
      http_game_observation_source: 0,
      other_source: 0,
    },
    gameplay_source_telemetry_counts: emptyGameplaySourceTelemetryCounts(),
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

function countSourceKinds(sourceStatuses) {
  const sourceKindCounts = {
    http_game_observation_source: 0,
    other_source: 0,
  };
  for (const item of Array.isArray(sourceStatuses) ? sourceStatuses : []) {
    const kind = item?.source_kind;
    if (kind === "http_game_observation_source") {
      sourceKindCounts.http_game_observation_source += 1;
    } else {
      sourceKindCounts.other_source += 1;
    }
  }
  return {
    source_kind_counts: sourceKindCounts,
    game_observation_source_count: sourceKindCounts.http_game_observation_source,
  };
}

function summarizeGameplaySourceTelemetryCounts(sourceStatuses) {
  const totals = emptyGameplaySourceTelemetryCounts();
  for (const item of Array.isArray(sourceStatuses) ? sourceStatuses : []) {
    if (item?.source_kind !== "http_game_observation_source") continue;
    const telemetry =
      item.last_observation_telemetry &&
      typeof item.last_observation_telemetry === "object" &&
      !Array.isArray(item.last_observation_telemetry)
        ? item.last_observation_telemetry
        : {};
    totals.request_count += requiredGameplaySourceTelemetryCount(
      item,
      "request_count"
    );
    totals.last_observation_count += requiredGameplaySourceTelemetryCount(
      item,
      "last_observation_count"
    );
    totals.observation_count += requiredGameplayObservationTelemetryCount(
      telemetry,
      "observation_count"
    );
    totals.low_confidence_count += requiredGameplayObservationTelemetryCount(
      telemetry,
      "low_confidence_count"
    );
    totals.with_frame_age_count += safeCount(telemetry.with_frame_age_count);
    totals.without_frame_age_count += safeCount(telemetry.without_frame_age_count);
    totals.frame_reference_count += safeCount(telemetry.with_frame_reference_count);
    totals.ocr_summary_count += safeCount(telemetry.with_ocr_summary_count);
    totals.ui_focus_area_count += safeCount(telemetry.with_ui_focus_areas_count);
    totals.frame_blob_available_count += safeCount(telemetry.raw_frame_available_count);
    totals.consecutive_error_count += requiredGameplaySourceTelemetryCount(
      item,
      "consecutive_error_count"
    );
  }
  return totals;
}

function requiredGameplaySourceTelemetryCount(sourceStatus, field) {
  const count = safeNullableInteger(sourceStatus?.[field]);
  if (count === null) {
    throw new ContractError(`gameplay runtime source telemetry: ${field} is required`);
  }
  return count;
}

function requiredGameplayObservationTelemetryCount(telemetry, field) {
  const count = safeNullableInteger(telemetry?.[field]);
  if (count === null) {
    throw new ContractError(
      `gameplay runtime observation telemetry: ${field} is required`
    );
  }
  return count;
}

function emptyGameplaySourceTelemetryCounts() {
  return {
    schema: "iris_gameplay_scheduler_source_telemetry_counts_v1",
    request_count: 0,
    last_observation_count: 0,
    observation_count: 0,
    low_confidence_count: 0,
    with_frame_age_count: 0,
    without_frame_age_count: 0,
    frame_reference_count: 0,
    ocr_summary_count: 0,
    ui_focus_area_count: 0,
    frame_blob_available_count: 0,
    consecutive_error_count: 0,
  };
}

function createGameplayStateSummary({ streamState, generatedAtMs }) {
  const state = readStreamState(streamState);
  if (!state) return emptyGameplayStateSummary();
  const latestPayloadKind = safeNullableLabel(state.last_payload_kind);
  const latestIsGameObservation = latestPayloadKind === "game_observation";
  const vision = state.last_vision_metadata_summary ?? {};
  const perception = state.last_game_perception ?? {};
  const commentary = state.last_game_commentary ?? {};
  const player = state.last_game_player ?? {};
  const validation = state.last_game_action_validation ?? {};
  const observationValidation = validation.observation_validation_summary ?? {};
  const control = state.last_game_control_result ?? {};
  const embodiment = state.last_game_embodiment ?? {};
  const boundaryAudit = state.last_boundary_audit ?? {};
  const history = Array.isArray(state.history) ? state.history : [];
  const recentGameHistory = summarizeRecentGameHistory(history);
  const latestValidationStatus = latestIsGameObservation
    ? safeNullableLabel(validation.validation_status)
    : null;
  const latestControlStatus = latestIsGameObservation
    ? safeNullableLabel(control.control_status)
    : null;
  const latestBoundaryAuditStatus = latestIsGameObservation
    ? safeNullableLabel(boundaryAudit.audit_status)
    : null;
  const validationStatus =
    latestValidationStatus ?? recentGameHistory.latest_validation_status;
  const controlStatus = latestControlStatus ?? recentGameHistory.latest_control_status;
  const boundaryAuditStatus =
    latestBoundaryAuditStatus ?? recentGameHistory.latest_boundary_audit_status;
  return {
    schema: "iris_gameplay_stream_state_runtime_summary_v1",
    stream_state_available: true,
    state_status: safeNullableLabel(state.status),
    state_age_ms: safeStateAge(state.updated_at_ms, generatedAtMs),
    latest_payload_kind: latestPayloadKind,
    latest_is_game_observation: latestIsGameObservation,
    vision_summary_available:
      (latestIsGameObservation && Boolean(state.last_vision_metadata_summary)) ||
      recentGameHistory.vision_summary_seen,
    vision_source_kind:
      (latestIsGameObservation ? safeNullableLabel(vision.source_kind) : null) ??
      recentGameHistory.latest_vision_source_kind,
    vision_frame_age_ms:
      (latestIsGameObservation ? safeNullableInteger(vision.frame_age_ms) : null) ??
      recentGameHistory.latest_vision_frame_age_ms,
    vision_ui_focus_count:
      (latestIsGameObservation ? safeCount(vision.ui_focus_count) : 0) ||
      recentGameHistory.latest_vision_ui_focus_count,
    game_perception_available:
      (latestIsGameObservation && Boolean(state.last_game_perception)) ||
      recentGameHistory.perception_seen,
    danger_level:
      (latestIsGameObservation ? safeNullableLabel(perception.danger_level) : null) ??
      recentGameHistory.latest_danger_level,
    perception_confidence: latestIsGameObservation
      ? safeNullableScore(perception.perception_confidence)
      : null,
    commentary_trigger:
      (latestIsGameObservation
        ? safeNullableLabel(perception.commentary_trigger)
        : null) ??
      recentGameHistory.latest_commentary_trigger,
    control_hint: latestIsGameObservation
      ? safeNullableLabel(perception.control_hint)
      : null,
    game_commentary_available:
      (latestIsGameObservation && Boolean(state.last_game_commentary)) ||
      recentGameHistory.commentary_seen,
    commentary_mode:
      (latestIsGameObservation
        ? safeNullableLabel(commentary.commentary_mode)
        : null) ??
      recentGameHistory.latest_commentary_mode,
    game_personality_tag_count:
      latestIsGameObservation && Array.isArray(commentary.game_personality_tags)
      ? commentary.game_personality_tags.length
      : 0,
    game_player_available:
      (latestIsGameObservation && Boolean(state.last_game_player)) ||
      recentGameHistory.player_step_seen,
    game_goal:
      (latestIsGameObservation ? safeNullableLabel(player.game_goal) : null) ??
      recentGameHistory.latest_game_goal,
    player_proposal_status:
      (latestIsGameObservation
        ? safeNullableLabel(player.input_action_candidate_status)
        : null) ??
      recentGameHistory.latest_player_proposal_status,
    game_safety_stop_status: latestIsGameObservation
      ? safeNullableLabel(player.safety_stop_result?.status)
      : null,
    game_action_validation_available:
      (latestIsGameObservation && Boolean(state.last_game_action_validation)) ||
      recentGameHistory.validation_seen,
    validation_status: validationStatus,
    validated_control_available:
      (latestIsGameObservation &&
        validation.approved_game_action_available === true) ||
      validationStatus === "approved",
    rejected_control_reason_count: Array.isArray(validation.rejected_reasons)
      && latestIsGameObservation
      ? validation.rejected_reasons.length
      : latestIsGameObservation
        ? safeCount(validation.rejected_candidate_count)
        : 0,
    observation_freshness_status: safeNullableLabel(
      latestIsGameObservation ? observationValidation.freshness_status : null
    ),
    stale_observation_rejected_before_adapter:
      latestIsGameObservation &&
      observationValidation.stale_observation_rejected_before_adapter === true,
    future_observation_rejected_before_adapter:
      latestIsGameObservation &&
      observationValidation.future_observation_rejected_before_adapter === true,
    low_confidence_rejected_before_adapter:
      latestIsGameObservation &&
      observationValidation.low_confidence_rejected_before_adapter === true,
    game_control_result_available:
      (latestIsGameObservation && Boolean(state.last_game_control_result)) ||
      recentGameHistory.control_result_seen,
    control_status: controlStatus,
    control_adapter: latestIsGameObservation
      ? safeNullableLabel(control.adapter)
      : null,
    control_accepted:
      (latestIsGameObservation && control.accepted === true) ||
      (latestControlStatus === null && recentGameHistory.control_accepted),
    control_executed: latestIsGameObservation && control.executed === true,
    control_simulated: latestIsGameObservation && control.simulated === true,
    game_embodiment_available:
      latestIsGameObservation && Boolean(state.last_game_embodiment),
    game_embodied_state: latestIsGameObservation
      ? safeNullableLabel(embodiment.game_embodied_state)
      : null,
    boundary_audit_available:
      (latestIsGameObservation && Boolean(state.last_boundary_audit)) ||
      recentGameHistory.boundary_audit_seen,
    boundary_audit_status: boundaryAuditStatus,
    boundary_audit_violation_count: Array.isArray(boundaryAudit.critical_violations)
      ? boundaryAudit.critical_violations.length
      : 0,
    history_game_observation_count: recentGameHistory.game_observation_count,
    history_safe_control_count: recentGameHistory.safe_control_count,
    boundary_policy: {
      booleans_counts_and_fixed_statuses_only: true,
      no_raw_stream_state: true,
      no_raw_frames: true,
      no_ocr_text: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeRecentGameHistory(history) {
  const summary = {
    game_observation_count: 0,
    safe_control_count: 0,
    vision_summary_seen: false,
    perception_seen: false,
    commentary_seen: false,
    player_step_seen: false,
    validation_seen: false,
    control_result_seen: false,
    control_accepted: false,
    boundary_audit_seen: false,
    latest_vision_source_kind: null,
    latest_vision_frame_age_ms: null,
    latest_vision_ui_focus_count: 0,
    latest_danger_level: null,
    latest_commentary_trigger: null,
    latest_commentary_mode: null,
    latest_game_goal: null,
    latest_player_proposal_status: null,
    latest_validation_status: null,
    latest_control_status: null,
    latest_boundary_audit_status: null,
  };
  for (const item of history) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    if (item.payload_kind !== "game_observation") continue;
    summary.game_observation_count += 1;
    if (
      item.vision_source_kind ||
      (item.vision_frame_age_ms !== undefined && item.vision_frame_age_ms !== null)
    ) {
      summary.vision_summary_seen = true;
      summary.latest_vision_source_kind =
        safeNullableLabel(item.vision_source_kind) ??
        summary.latest_vision_source_kind;
      summary.latest_vision_frame_age_ms =
        safeNullableInteger(item.vision_frame_age_ms) ??
        summary.latest_vision_frame_age_ms;
      summary.latest_vision_ui_focus_count =
        safeCount(item.vision_ui_focus_count) ||
        summary.latest_vision_ui_focus_count;
    }
    if (item.danger_level || item.commentary_trigger) {
      summary.perception_seen = true;
      summary.latest_danger_level =
        safeNullableLabel(item.danger_level) ?? summary.latest_danger_level;
      summary.latest_commentary_trigger =
        safeNullableLabel(item.commentary_trigger) ??
        summary.latest_commentary_trigger;
    }
    if (item.commentary_mode) {
      summary.commentary_seen = true;
      summary.latest_commentary_mode =
        safeNullableLabel(item.commentary_mode) ?? summary.latest_commentary_mode;
    }
    if (item.game_goal || item.input_action_candidate_status) {
      summary.player_step_seen = true;
      summary.latest_game_goal =
        safeNullableLabel(item.game_goal) ?? summary.latest_game_goal;
      summary.latest_player_proposal_status =
        safeNullableLabel(item.input_action_candidate_status) ??
        summary.latest_player_proposal_status;
    }
    if (item.game_action_validation_status) {
      summary.validation_seen = true;
      summary.latest_validation_status =
        safeNullableLabel(item.game_action_validation_status) ??
        summary.latest_validation_status;
    }
    if (item.game_control_status) {
      summary.control_result_seen = true;
      summary.latest_control_status =
        safeNullableLabel(item.game_control_status) ?? summary.latest_control_status;
      if (item.game_control_status === "accepted") summary.control_accepted = true;
    }
    if (
      item.game_action_validation_status === "approved" &&
      item.game_control_status === "accepted"
    ) {
      summary.safe_control_count += 1;
    }
    if (item.boundary_audit_status) {
      summary.boundary_audit_seen = true;
      summary.latest_boundary_audit_status =
        safeNullableLabel(item.boundary_audit_status) ??
        summary.latest_boundary_audit_status;
    }
  }
  return summary;
}

function emptyGameplayStateSummary() {
  return {
    schema: "iris_gameplay_stream_state_runtime_summary_v1",
    stream_state_available: false,
    state_status: null,
    state_age_ms: null,
    latest_payload_kind: null,
    latest_is_game_observation: false,
    vision_summary_available: false,
    vision_source_kind: null,
    vision_frame_age_ms: null,
    vision_ui_focus_count: 0,
    game_perception_available: false,
    danger_level: null,
    perception_confidence: null,
    commentary_trigger: null,
    control_hint: null,
    game_commentary_available: false,
    commentary_mode: null,
    game_personality_tag_count: 0,
    game_player_available: false,
    game_goal: null,
    player_proposal_status: null,
    game_safety_stop_status: null,
    game_action_validation_available: false,
    validation_status: null,
    validated_control_available: false,
    rejected_control_reason_count: 0,
    observation_freshness_status: null,
    stale_observation_rejected_before_adapter: false,
    future_observation_rejected_before_adapter: false,
    low_confidence_rejected_before_adapter: false,
    game_control_result_available: false,
    control_status: null,
    control_adapter: null,
    control_accepted: false,
    control_executed: false,
    control_simulated: false,
    game_embodiment_available: false,
    game_embodied_state: null,
    boundary_audit_available: false,
    boundary_audit_status: null,
    boundary_audit_violation_count: 0,
    history_game_observation_count: 0,
    history_safe_control_count: 0,
    boundary_policy: {
      booleans_counts_and_fixed_statuses_only: true,
      no_raw_stream_state: true,
      no_raw_frames: true,
      no_ocr_text: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
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

function summarizePrioritySummary(summary) {
  const sourceAvailable =
    summary && typeof summary === "object" && !Array.isArray(summary);
  const source = sourceAvailable ? summary : {};
  const byBand =
    source.by_band && typeof source.by_band === "object" && !Array.isArray(source.by_band)
      ? source.by_band
      : {};
  return {
    batch_count: requiredPrioritySummaryCount(sourceAvailable, source, "batch_count"),
    top_priority: safeNullableInteger(source.top_priority),
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
  const count = safeNullableInteger(source[field]);
  if (count === null) {
    throw new ContractError(`gameplay runtime priority summary: ${field} is required`);
  }
  return count;
}

function requiredPriorityBandCount(sourceAvailable, byBand, field) {
  if (!sourceAvailable) return 0;
  const count = safeNullableInteger(byBand?.[field]);
  if (count === null) {
    throw new ContractError(
      `gameplay runtime priority band summary: ${field} is required`
    );
  }
  return count;
}

function assertSchedulerSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: scheduler summary is required`);
  }
  if (summary.schema !== "iris_gameplay_scheduler_runtime_summary_v1") {
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
    "game_observation_source_count",
    "processed_count",
    "duplicate_count",
    "source_error_count",
  ]) {
    if (summary[field] !== null) {
      assertNonNegativeInteger(summary[field], `${context}: invalid scheduler ${field}`);
    }
  }
  assertSourceKindCountsSafe(summary.source_kind_counts, context);
  assertGameplaySourceTelemetryCountsSafe(
    summary.gameplay_source_telemetry_counts,
    context
  );
  for (const field of ["last_error", "priority_sort"]) {
    assertSafeNullableLabel(summary[field], `${context}: invalid scheduler ${field}`);
  }
  assertPrioritySummarySafe(summary.last_priority_summary, context);
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_only",
    "no_source_names",
    "no_raw_payloads",
    "no_text_payloads",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ], `${context}: scheduler`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: scheduler adapter validation required`);
  }
}

function assertSourceKindCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: source kind counts required`);
  }
  for (const field of ["http_game_observation_source", "other_source"]) {
    assertNonNegativeInteger(counts[field], `${context}: invalid ${field} count`);
  }
}

function assertGameplaySourceTelemetryCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: gameplay source telemetry counts required`);
  }
  if (counts.schema !== "iris_gameplay_scheduler_source_telemetry_counts_v1") {
    throw new ContractError(`${context}: invalid gameplay source telemetry schema`);
  }
  for (const field of [
    "request_count",
    "last_observation_count",
    "observation_count",
    "low_confidence_count",
    "with_frame_age_count",
    "without_frame_age_count",
    "frame_reference_count",
    "ocr_summary_count",
    "ui_focus_area_count",
    "frame_blob_available_count",
    "consecutive_error_count",
  ]) {
    assertNonNegativeInteger(
      counts[field],
      `${context}: invalid gameplay source telemetry ${field}`
    );
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

function assertGameplayStateSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: gameplay state summary is required`);
  }
  if (summary.schema !== "iris_gameplay_stream_state_runtime_summary_v1") {
    throw new ContractError(`${context}: invalid gameplay state summary schema`);
  }
  for (const field of [
    "stream_state_available",
    "latest_is_game_observation",
    "vision_summary_available",
    "game_perception_available",
    "game_commentary_available",
    "game_player_available",
    "game_action_validation_available",
    "validated_control_available",
    "stale_observation_rejected_before_adapter",
    "future_observation_rejected_before_adapter",
    "low_confidence_rejected_before_adapter",
    "game_control_result_available",
    "control_accepted",
    "control_executed",
    "control_simulated",
    "game_embodiment_available",
    "boundary_audit_available",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid state ${field}`);
    }
  }
  for (const field of [
    "state_status",
    "latest_payload_kind",
    "vision_source_kind",
    "danger_level",
    "commentary_trigger",
    "control_hint",
    "commentary_mode",
    "game_goal",
    "player_proposal_status",
    "game_safety_stop_status",
    "validation_status",
    "observation_freshness_status",
    "control_status",
    "control_adapter",
    "game_embodied_state",
    "boundary_audit_status",
  ]) {
    assertSafeNullableLabel(summary[field], `${context}: invalid state ${field}`);
  }
  for (const field of [
    "state_age_ms",
    "vision_frame_age_ms",
    "vision_ui_focus_count",
    "game_personality_tag_count",
    "rejected_control_reason_count",
    "boundary_audit_violation_count",
    "history_game_observation_count",
    "history_safe_control_count",
  ]) {
    if (summary[field] !== null) {
      assertNonNegativeInteger(summary[field], `${context}: invalid state ${field}`);
    }
  }
  if (summary.perception_confidence !== null) {
    assertScore(summary.perception_confidence, `${context}: invalid perception confidence`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    ["no_raw_stream_state"],
    `${context}: state`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: state adapter validation required`);
  }
}

function assertGameVisionCaptureFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: game vision capture flow summary is required`);
  }
  if (summary.schema !== "iris_gameplay_vision_capture_flow_summary_v1") {
    throw new ContractError(`${context}: invalid game vision capture flow schema`);
  }
  if (!GAME_VISION_CAPTURE_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid game vision capture status`);
  }
  assertSafeReadinessState(summary.readiness_state, context);
  if (summary.readiness_state !== readinessStateForFlowStatus(summary.flow_status)) {
    throw new ContractError(`${context}: invalid game vision capture readiness`);
  }
  if (!GAME_VISION_CAPTURE_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid game vision capture blocking stage`);
  }
  assertNextCheckScriptMatchesBlockingStage(
    summary,
    context,
    "game vision capture flow"
  );
  for (const field of [
    "vision_configured",
    "ingest_scheduler_enabled_by_env",
    "scheduler_available",
    "scheduler_running",
    "scheduler_healthy",
    "game_observation_source_configured",
    "runtime_state_available",
    "capture_request_seen",
    "game_observation_seen",
    "latest_is_game_observation",
    "vision_summary_available",
    "game_perception_seen",
    "low_confidence_observed",
    "low_confidence_rejected_before_adapter",
    "stale_observation_rejected_before_adapter",
    "future_observation_rejected_before_adapter",
    "boundary_audit_seen",
    "boundary_audit_passed",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid game vision capture ${field}`);
    }
  }
  if (!VISION_MODES.has(summary.vision_mode)) {
    throw new ContractError(`${context}: invalid game vision capture mode`);
  }
  if (!TARGET_POLICY_STATUSES.has(summary.vision_target_policy_status)) {
    throw new ContractError(`${context}: invalid game vision target policy`);
  }
  for (const field of [
    "vision_source_kind",
  ]) {
    assertSafeNullableLabel(
      summary[field],
      `${context}: invalid game vision capture ${field}`
    );
  }
  for (const field of [
    "game_observation_source_count",
    "capture_request_count",
    "source_last_observation_count",
    "observation_count",
    "low_confidence_count",
    "with_frame_age_count",
    "without_frame_age_count",
    "frame_reference_count",
    "ocr_summary_count",
    "ui_focus_area_count",
    "frame_blob_available_count",
    "consecutive_error_count",
    "scheduler_processed_count",
    "scheduler_source_error_count",
    "vision_ui_focus_count",
    "boundary_audit_violation_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid game vision capture ${field}`
    );
  }
  if (summary.vision_frame_age_ms !== null) {
    assertNonNegativeInteger(
      summary.vision_frame_age_ms,
      `${context}: invalid game vision capture frame age`
    );
  }
  if (summary.perception_confidence !== null) {
    assertScore(
      summary.perception_confidence,
      `${context}: invalid game vision capture confidence`
    );
  }
  for (const field of [
    "configured_source_required",
    "scheduler_poll_required",
    "capture_request_shape_only",
    "raw_frame_not_exposed",
    "ocr_text_not_exposed",
    "frame_reference_values_not_exposed",
    "low_confidence_blocks_before_adapter",
    "vision_only_never_controls_game",
    "validation_required_before_adapter",
  ]) {
    if (summary.capture_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid game vision capture policy`);
    }
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_booleans_only",
    "no_raw_stream_state",
    "no_raw_frames",
    "no_ocr_text",
    "no_vision_payloads",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
    "script_names_only",
  ], `${context}: game vision capture`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: game vision adapter validation required`);
  }
}

function assertSafeControlFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: safe control flow summary is required`);
  }
  if (summary.schema !== "iris_gameplay_safe_control_flow_summary_v1") {
    throw new ContractError(`${context}: invalid safe control flow schema`);
  }
  if (!SAFE_CONTROL_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid safe control flow status`);
  }
  assertSafeReadinessState(summary.readiness_state, context);
  if (summary.readiness_state !== readinessStateForFlowStatus(summary.flow_status)) {
    throw new ContractError(`${context}: invalid safe control readiness`);
  }
  if (!SAFE_CONTROL_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid safe control blocking stage`);
  }
  assertNextCheckScriptMatchesBlockingStage(summary, context, "safe control flow");
  for (const field of [
    "preflight_ready",
    "scheduler_available",
    "scheduler_running",
    "scheduler_healthy",
    "game_observation_source_configured",
    "runtime_state_available",
    "game_observation_seen",
    "latest_is_game_observation",
    "game_perception_seen",
    "player_step_seen",
    "validation_seen",
    "validation_passed",
    "validated_control_available",
    "control_result_seen",
    "control_accepted",
    "control_simulated",
    "boundary_audit_seen",
    "boundary_audit_passed",
    "stale_observation_guard_configured",
    "rate_limit_guard_configured",
    "stale_observation_rejected_before_adapter",
    "future_observation_rejected_before_adapter",
    "low_confidence_rejected_before_adapter",
    "adapter_status_available",
    "adapter_expiry_guard_observed",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid safe control flow ${field}`);
    }
  }
  for (const field of [
    "validation_status",
    "control_status",
    "adapter_readiness_status",
    "boundary_audit_status",
  ]) {
    assertSafeNullableLabel(
      summary[field],
      `${context}: invalid safe control flow ${field}`
    );
  }
  for (const field of [
    "game_observation_source_count",
    "scheduler_processed_count",
    "scheduler_source_error_count",
    "observation_count",
    "low_confidence_count",
    "recent_game_observation_count",
    "recent_safe_control_count",
    "adapter_request_count",
    "adapter_accepted_count",
    "adapter_failed_count",
    "adapter_expired_action_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid safe control flow ${field}`
    );
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_booleans_only",
    "no_raw_stream_state",
    "no_action_candidates",
    "no_approved_actions",
    "script_names_only",
  ], `${context}: safe control flow`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: safe control flow adapter validation required`);
  }
}

function assertActionGateFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: action gate flow summary is required`);
  }
  if (summary.schema !== "iris_gameplay_action_gate_flow_summary_v1") {
    throw new ContractError(`${context}: invalid action gate flow schema`);
  }
  if (!ACTION_GATE_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid action gate flow status`);
  }
  assertSafeReadinessState(summary.readiness_state, context);
  if (summary.readiness_state !== readinessStateForFlowStatus(summary.flow_status)) {
    throw new ContractError(`${context}: invalid action gate readiness`);
  }
  for (const field of [
    "preflight_ready",
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
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid action gate flow ${field}`);
    }
  }
  assertSafeNullableLabel(
    summary.validation_status,
    `${context}: invalid action gate validation status`
  );
  for (const field of [
    "adapter_request_count",
    "adapter_accepted_count",
    "adapter_failed_count",
    "adapter_expired_action_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid action gate flow ${field}`
    );
  }
  for (const field of [
    "proposal_requires_validation",
    "proposal_not_sent_to_adapter",
    "validated_control_required_for_adapter",
    "viewer_comments_cannot_directly_control_game",
    "stale_future_or_low_confidence_blocks_before_adapter",
    "validated_control_payload_hidden_from_status",
    "adapter_ack_shape_only",
  ]) {
    if (summary.gate_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid action gate policy`);
    }
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_booleans_only",
    "no_raw_stream_state",
    "no_raw_frames",
    "no_ocr_text",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ], `${context}: action gate`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: action gate adapter validation required`);
  }
}

function assertVisionToSafeActionFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: vision to safe action summary is required`);
  }
  if (
    summary.schema !==
    "iris_gameplay_vision_to_safe_action_flow_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid vision to safe action schema`);
  }
  if (!VISION_TO_SAFE_ACTION_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid vision to safe action status`);
  }
  assertSafeReadinessState(summary.readiness_state, context);
  if (summary.readiness_state !== readinessStateForFlowStatus(summary.flow_status)) {
    throw new ContractError(`${context}: invalid vision to safe action readiness`);
  }
  if (!VISION_TO_SAFE_ACTION_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(
      `${context}: invalid vision to safe action blocking stage`
    );
  }
  assertNextCheckScriptMatchesBlockingStage(
    summary,
    context,
    "vision to safe action flow"
  );
  for (const field of [
    "vision_configured",
    "capture_request_seen",
    "game_observation_seen",
    "low_confidence_observed",
    "low_confidence_rejected_before_adapter",
    "runtime_state_available",
    "game_perception_seen",
    "player_proposal_seen",
    "validation_seen",
    "validation_passed",
    "validated_control_available",
    "rejected_before_adapter",
    "adapter_handoff_seen",
    "adapter_handoff_accepted",
    "control_result_seen",
    "control_accepted",
    "boundary_audit_passed",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid vision to action ${field}`);
    }
  }
  for (const field of [
    "validation_status",
    "control_status",
    "game_vision_capture_flow_status",
    "safe_control_flow_status",
    "action_gate_flow_status",
    "safe_action_lifecycle_flow_status",
  ]) {
    assertSafeNullableLabel(
      summary[field],
      `${context}: invalid vision to action ${field}`
    );
  }
  if (!GAME_VISION_CAPTURE_FLOW_STATUSES.has(summary.game_vision_capture_flow_status)) {
    throw new ContractError(`${context}: invalid nested vision flow status`);
  }
  if (!SAFE_CONTROL_FLOW_STATUSES.has(summary.safe_control_flow_status)) {
    throw new ContractError(`${context}: invalid nested safe control status`);
  }
  if (!ACTION_GATE_FLOW_STATUSES.has(summary.action_gate_flow_status)) {
    throw new ContractError(`${context}: invalid nested action gate status`);
  }
  if (
    !SAFE_ACTION_LIFECYCLE_FLOW_STATUSES.has(
      summary.safe_action_lifecycle_flow_status
    )
  ) {
    throw new ContractError(`${context}: invalid nested safe lifecycle status`);
  }
  for (const field of [
    "capture_request_count",
    "observation_count",
    "low_confidence_count",
    "adapter_request_count",
    "adapter_accepted_count",
    "adapter_failed_count",
    "adapter_expired_action_count",
    "recent_game_observation_count",
    "recent_safe_control_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid vision to action ${field}`
    );
  }
  for (const field of [
    "raw_vision_never_controls_game",
    "screen_observation_requires_player_and_validator",
    "fresh_observation_required_before_adapter",
    "low_confidence_blocks_before_adapter",
    "only_validated_control_reaches_adapter",
    "approved_schema_only_no_os_direct_input",
    "direct_os_input_forbidden",
    "non_game_adapters_never_receive_game_actions",
    "adapter_ack_shape_only",
    "public_status_counts_only",
  ]) {
    if (summary.vision_to_action_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid vision to action policy`);
    }
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_booleans_only",
    "no_raw_stream_state",
    "no_raw_frames",
    "no_ocr_text",
    "no_vision_payloads",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
    "script_names_only",
  ], `${context}: vision to safe action`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(
      `${context}: vision to safe action adapter validation required`
    );
  }
}

function assertSafeActionLifecycleFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: safe action lifecycle summary is required`);
  }
  if (summary.schema !== "iris_gameplay_safe_action_lifecycle_flow_summary_v1") {
    throw new ContractError(`${context}: invalid safe action lifecycle schema`);
  }
  if (!SAFE_ACTION_LIFECYCLE_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid safe action lifecycle status`);
  }
  assertSafeReadinessState(summary.readiness_state, context);
  if (summary.readiness_state !== readinessStateForFlowStatus(summary.flow_status)) {
    throw new ContractError(`${context}: invalid safe action lifecycle readiness`);
  }
  if (!SAFE_ACTION_LIFECYCLE_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid safe action lifecycle blocking stage`);
  }
  assertNextCheckScriptMatchesBlockingStage(
    summary,
    context,
    "safe action lifecycle flow"
  );
  for (const field of [
    "preflight_ready",
    "scheduler_available",
    "scheduler_running",
    "scheduler_healthy",
    "game_observation_source_configured",
    "runtime_state_available",
    "game_observation_seen",
    "game_perception_seen",
    "player_proposal_seen",
    "validation_seen",
    "validation_passed",
    "validated_control_available",
    "rejected_before_adapter",
    "adapter_handoff_seen",
    "adapter_handoff_accepted",
    "adapter_status_available",
    "control_result_seen",
    "control_accepted",
    "control_simulated",
    "boundary_audit_seen",
    "boundary_audit_passed",
    "stale_observation_guard_configured",
    "rate_limit_guard_configured",
    "stale_observation_rejected_before_adapter",
    "future_observation_rejected_before_adapter",
    "low_confidence_rejected_before_adapter",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid safe action lifecycle ${field}`);
    }
  }
  for (const field of [
    "validation_status",
    "adapter_readiness_status",
    "control_status",
    "safe_control_flow_status",
    "safe_control_blocking_stage",
    "action_gate_flow_status",
  ]) {
    assertSafeNullableLabel(
      summary[field],
      `${context}: invalid safe action lifecycle ${field}`
    );
  }
  if (!SAFE_CONTROL_FLOW_STATUSES.has(summary.safe_control_flow_status)) {
    throw new ContractError(`${context}: invalid nested safe control status`);
  }
  if (!SAFE_CONTROL_BLOCKING_STAGES.has(summary.safe_control_blocking_stage)) {
    throw new ContractError(`${context}: invalid nested safe control blocking stage`);
  }
  if (!ACTION_GATE_FLOW_STATUSES.has(summary.action_gate_flow_status)) {
    throw new ContractError(`${context}: invalid nested action gate status`);
  }
  for (const field of [
    "adapter_request_count",
    "adapter_accepted_count",
    "adapter_failed_count",
    "adapter_expired_action_count",
    "observation_count",
    "low_confidence_count",
    "recent_game_observation_count",
    "recent_safe_control_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid safe action lifecycle ${field}`
    );
  }
  for (const field of [
    "viewer_comments_cannot_directly_control_game",
    "model_proposals_review_only",
    "validation_required_before_adapter",
    "blocked_proposals_stop_before_adapter",
    "adapter_receives_validated_control_only",
    "adapter_ack_shape_only",
    "lifecycle_status_counts_only",
  ]) {
    if (summary.lifecycle_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid safe action lifecycle policy`);
    }
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_booleans_only",
    "no_raw_stream_state",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
    "script_names_only",
  ], `${context}: safe action lifecycle`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(
      `${context}: safe action lifecycle adapter validation required`
    );
  }
}

function assertGameControlAdapterRuntimeSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: game control adapter runtime summary required`);
  }
  if (summary.schema !== "iris_gameplay_game_control_adapter_runtime_summary_v1") {
    throw new ContractError(`${context}: invalid game control adapter runtime schema`);
  }
  for (const field of ["adapter_status_available", "request_target_configured"]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid game control adapter ${field}`);
    }
  }
  for (const field of [
    "game_control_readiness_status",
    "local_endpoint_policy_status",
    "game_control_endpoint_scope",
    "last_control_status",
    "last_error_kind",
  ]) {
    assertSafeNullableLabel(
      summary[field],
      `${context}: invalid game control adapter ${field}`
    );
  }
  if (
    !GAME_CONTROL_ADAPTER_READINESS_STATUSES.has(
      summary.game_control_readiness_status
    )
  ) {
    throw new ContractError(`${context}: invalid game control adapter readiness`);
  }
  if (
    summary.game_control_endpoint_locality_ok !== null &&
    typeof summary.game_control_endpoint_locality_ok !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid game control adapter locality`);
  }
  for (const field of [
    "request_count",
    "accepted_count",
    "failed_count",
    "unsafe_response_count",
    "http_status_failure_count",
    "timeout_count",
    "request_error_count",
    "expired_action_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid game control adapter ${field}`
    );
  }
  if (summary.accepted_count + summary.failed_count > summary.request_count) {
    throw new ContractError(`${context}: game control adapter count mismatch`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_booleans_only",
    "no_endpoint_values",
    "no_action_candidates",
    "no_approved_actions",
  ], `${context}: game control adapter`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: game control adapter validation required`);
  }
}

function assertSafeControlPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: safe control policy required`);
  }
  for (const field of [
    "model_proposals_never_sent_to_adapter",
    "validator_output_required_for_adapter",
    "viewer_comments_cannot_directly_control_game",
    "fresh_observation_required_before_adapter",
    "stale_observation_rejected_before_adapter",
    "future_observation_rejected_before_adapter",
    "observation_summary_only_before_player_and_validator",
    "approved_schema_only_no_os_direct_input",
    "direct_os_input_forbidden",
    "non_game_adapters_do_not_receive_actions",
    "control_rate_limit_enforced_before_adapter",
    "approved_action_expiry_enforced_by_adapter",
    "expired_actions_surface_as_runtime_attention",
    "bridge_ack_shape_only",
    "runtime_status_counts_only",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid safe control policy`);
    }
  }
}

function createGameplayRuntimeProductionHandoffSummary({
  runtimeStatus,
  preflight,
  schedulerSummary,
  gameplayState,
  gameControlAdapterRuntime,
  gameVisionCaptureFlow,
  safeControlFlow,
  actionGateFlow,
  visionToSafeActionFlow,
  safeActionLifecycleFlow,
}) {
  return {
    schema: "iris_gameplay_runtime_status_handoff_summary_v1",
    runtime_status_report_only: true,
    no_polling_side_effects_by_report: true,
    no_real_capture_started_by_report: true,
    no_real_game_or_os_input_started_by_report: true,
    no_control_side_effects_by_report: true,
    input_action_candidates_never_forwarded_directly: true,
    model_proposals_review_only: true,
    validation_gate_required_before_control_adapter: true,
    only_validated_control_reaches_adapter: true,
    approved_actions_not_forwarded_by_report: true,
    stale_future_or_low_confidence_blocks_before_adapter: true,
    viewer_comments_cannot_directly_control_game: true,
    raw_frames_not_exposed: true,
    raw_ocr_text_not_exposed: true,
    vision_payloads_not_exposed: true,
    control_payloads_not_exposed: true,
    endpoint_values_not_exposed: true,
    secret_values_not_exposed: true,
    runtime_status: runtimeStatus,
    preflight_status: preflight.preflight_status,
    vision_status: preflight.vision_status,
    game_control_status: preflight.game_control_status,
    scheduler_available: schedulerSummary.scheduler_available,
    scheduler_running: schedulerSummary.running,
    runtime_state_available: gameplayState.stream_state_available,
    game_observation_seen: safeControlFlow.game_observation_seen,
    game_perception_seen: safeControlFlow.game_perception_seen,
    player_proposal_seen: actionGateFlow.player_proposal_seen,
    validation_seen: actionGateFlow.validation_seen,
    validation_passed: actionGateFlow.validation_passed,
    rejected_before_adapter: actionGateFlow.rejected_before_adapter,
    adapter_handoff_seen: actionGateFlow.adapter_handoff_seen,
    adapter_handoff_accepted: actionGateFlow.adapter_handoff_accepted,
    control_accepted: safeActionLifecycleFlow.control_accepted,
    control_simulated: safeActionLifecycleFlow.control_simulated,
    boundary_audit_passed: safeActionLifecycleFlow.boundary_audit_passed,
    vision_capture_flow_status: gameVisionCaptureFlow.flow_status,
    action_gate_flow_status: actionGateFlow.flow_status,
    safe_action_lifecycle_flow_status: safeActionLifecycleFlow.flow_status,
    vision_to_safe_action_flow_status: visionToSafeActionFlow.flow_status,
    observation_count: gameVisionCaptureFlow.observation_count,
    low_confidence_count: gameVisionCaptureFlow.low_confidence_count,
    adapter_request_count: gameControlAdapterRuntime.request_count,
    adapter_accepted_count: gameControlAdapterRuntime.accepted_count,
    adapter_failed_count: gameControlAdapterRuntime.failed_count,
    adapter_expired_action_count: gameControlAdapterRuntime.expired_action_count,
    next_runtime_check_script: firstRuntimeCheckScript([
      gameVisionCaptureFlow,
      visionToSafeActionFlow,
      safeActionLifecycleFlow,
      safeControlFlow,
    ]),
    next_readiness_state:
      [gameVisionCaptureFlow, visionToSafeActionFlow, safeActionLifecycleFlow, safeControlFlow].find(
        (flow) => flow.next_check_script !== null
      )?.readiness_state ?? readinessStateForRuntimeStatus(runtimeStatus),
    readiness_state_counts: countReadinessStates([
      gameVisionCaptureFlow,
      visionToSafeActionFlow,
      safeActionLifecycleFlow,
      safeControlFlow,
    ]),
  };
}

function assertGameplayRuntimeProductionHandoffSummarySafe(
  summary,
  report,
  context
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary required`);
  }
  if (summary.schema !== "iris_gameplay_runtime_status_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff summary schema`);
  }
  for (const field of [
    "runtime_status_report_only",
    "no_polling_side_effects_by_report",
    "no_real_capture_started_by_report",
    "no_real_game_or_os_input_started_by_report",
    "no_control_side_effects_by_report",
    "input_action_candidates_never_forwarded_directly",
    "model_proposals_review_only",
    "validation_gate_required_before_control_adapter",
    "only_validated_control_reaches_adapter",
    "approved_actions_not_forwarded_by_report",
    "stale_future_or_low_confidence_blocks_before_adapter",
    "viewer_comments_cannot_directly_control_game",
    "raw_frames_not_exposed",
    "raw_ocr_text_not_exposed",
    "vision_payloads_not_exposed",
    "control_payloads_not_exposed",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff ${field}`);
    }
  }
  if (!RUNTIME_STATUSES.has(summary.runtime_status)) {
    throw new ContractError(`${context}: invalid production handoff runtime status`);
  }
  if (!PREFLIGHT_STATUSES.has(summary.preflight_status)) {
    throw new ContractError(`${context}: invalid production handoff preflight status`);
  }
  for (const field of ["vision_status", "game_control_status"]) {
    if (!CHECK_STATUSES.has(summary[field])) {
      throw new ContractError(`${context}: invalid production handoff ${field}`);
    }
  }
  for (const field of [
    "scheduler_available",
    "scheduler_running",
    "runtime_state_available",
    "game_observation_seen",
    "game_perception_seen",
    "player_proposal_seen",
    "validation_seen",
    "validation_passed",
    "rejected_before_adapter",
    "adapter_handoff_seen",
    "adapter_handoff_accepted",
    "control_accepted",
    "control_simulated",
    "boundary_audit_passed",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid production handoff ${field}`);
    }
  }
  if (!GAME_VISION_CAPTURE_FLOW_STATUSES.has(summary.vision_capture_flow_status)) {
    throw new ContractError(`${context}: invalid production handoff vision status`);
  }
  if (!ACTION_GATE_FLOW_STATUSES.has(summary.action_gate_flow_status)) {
    throw new ContractError(`${context}: invalid production handoff action gate status`);
  }
  if (
    !SAFE_ACTION_LIFECYCLE_FLOW_STATUSES.has(
      summary.safe_action_lifecycle_flow_status
    )
  ) {
    throw new ContractError(`${context}: invalid production handoff lifecycle status`);
  }
  if (
    !VISION_TO_SAFE_ACTION_FLOW_STATUSES.has(
      summary.vision_to_safe_action_flow_status
    )
  ) {
    throw new ContractError(
      `${context}: invalid production handoff vision to action status`
    );
  }
  for (const field of [
    "observation_count",
    "low_confidence_count",
    "adapter_request_count",
    "adapter_accepted_count",
    "adapter_failed_count",
    "adapter_expired_action_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid production handoff ${field}`
    );
  }
  assertSafeOptionalScriptName(
    summary.next_runtime_check_script,
    `${context}: production handoff next runtime check script`
  );
  const expectedNextScript = firstRuntimeCheckScript([
    report.game_vision_capture_flow,
    report.vision_to_safe_action_flow,
    report.safe_action_lifecycle_flow,
    report.safe_control_flow,
  ]);
  const expectedPairs = {
    runtime_status: report.runtime_status,
    preflight_status: report.preflight_status,
    vision_status: report.vision_status,
    game_control_status: report.game_control_status,
    scheduler_available: report.scheduler_summary.scheduler_available,
    scheduler_running: report.scheduler_summary.running,
    runtime_state_available: report.gameplay_state.stream_state_available,
    game_observation_seen: report.safe_control_flow.game_observation_seen,
    game_perception_seen: report.safe_control_flow.game_perception_seen,
    player_proposal_seen: report.action_gate_flow.player_proposal_seen,
    validation_seen: report.action_gate_flow.validation_seen,
    validation_passed: report.action_gate_flow.validation_passed,
    rejected_before_adapter: report.action_gate_flow.rejected_before_adapter,
    adapter_handoff_seen: report.action_gate_flow.adapter_handoff_seen,
    adapter_handoff_accepted: report.action_gate_flow.adapter_handoff_accepted,
    control_accepted: report.safe_action_lifecycle_flow.control_accepted,
    control_simulated: report.safe_action_lifecycle_flow.control_simulated,
    boundary_audit_passed: report.safe_action_lifecycle_flow.boundary_audit_passed,
    vision_capture_flow_status: report.game_vision_capture_flow.flow_status,
    action_gate_flow_status: report.action_gate_flow.flow_status,
    safe_action_lifecycle_flow_status:
      report.safe_action_lifecycle_flow.flow_status,
    vision_to_safe_action_flow_status:
      report.vision_to_safe_action_flow.flow_status,
    observation_count: report.game_vision_capture_flow.observation_count,
    low_confidence_count: report.game_vision_capture_flow.low_confidence_count,
    adapter_request_count: report.game_control_adapter_runtime.request_count,
    adapter_accepted_count: report.game_control_adapter_runtime.accepted_count,
    adapter_failed_count: report.game_control_adapter_runtime.failed_count,
    adapter_expired_action_count:
      report.game_control_adapter_runtime.expired_action_count,
    next_runtime_check_script: expectedNextScript,
  };
  for (const [field, expected] of Object.entries(expectedPairs)) {
    if (summary[field] !== expected) {
      throw new ContractError(
        `${context}: production handoff ${field} mismatch`
      );
    }
  }
  if (summary.next_readiness_state !== report.next_readiness_state) {
    throw new ContractError(`${context}: production handoff readiness mismatch`);
  }
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  if (
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: production handoff readiness counts mismatch`);
  }
}

function firstRuntimeCheckScript(flows) {
  for (const flow of flows) {
    if (flow?.next_check_script) return flow.next_check_script;
  }
  return null;
}

function readinessStateForRuntimeStatus(status) {
  if (status === "safe_control_active") return "ready";
  if (status === "attention_required" || status === "gameplay_runtime_attention") {
    return "operator_review_required";
  }
  if (status === "configured_waiting_for_scheduler_start") {
    return "runtime_waiting";
  }
  if (
    status === "scheduler_unavailable" ||
    status === "polling_active_waiting_for_game_observation" ||
    status === "game_observation_active"
  ) {
    return "runtime_waiting";
  }
  return "configuration_waiting";
}

function readinessStateForFlowStatus(status) {
  if (
    status === "safe_control_active" ||
    status === "vision_observation_active" ||
    status === "adapter_handoff_active"
  ) {
    return "ready";
  }
  if (
    status === "configuration_attention" ||
    status === "blocked_before_adapter" ||
    status === "vision_low_confidence_blocked" ||
    status === "vision_observation_low_confidence" ||
    status === "runtime_attention"
  ) {
    return "operator_review_required";
  }
  if (
    status === "scheduler_unavailable" ||
    status?.startsWith("waiting_") ||
    status === "vision_waiting" ||
    status === "ready_for_adapter_handoff"
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

function checkScriptForBlockingStage(blockingStage) {
  return RUNTIME_CHECK_SCRIPTS[blockingStage] ?? null;
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
    no_action_candidates: true,
    no_approved_actions: true,
    no_commands: true,
    no_endpoint_values: true,
    no_secret_values: true,
  };
}

function safeStateAge(updatedAtMs, generatedAtMs) {
  const updated = Number(updatedAtMs);
  const generated = Number(generatedAtMs);
  if (!Number.isFinite(updated) || !Number.isFinite(generated)) return null;
  return Math.max(0, Math.trunc(generated - updated));
}

function safeNullableInteger(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.trunc(number);
}

function safeNullableScore(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(1, Number(number.toFixed(4))));
}

function safeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function safeNullableLabel(value) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).replace(/\s+/g, "_").trim().slice(0, 120);
  if (!text || UNSAFE_STATUS_PATTERN.test(text)) return "unsafe_status_omitted";
  return text;
}

function assertSafeNullableLabel(value, context) {
  if (value === null) return;
  if (typeof value !== "string" || value.length === 0 || value.length > 120) {
    throw new ContractError(context);
  }
  if (UNSAFE_STATUS_PATTERN.test(value) || URL_PATTERN.test(value)) {
    throw new ContractError(context);
  }
}

function assertScore(value, context) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    throw new ContractError(context);
  }
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function assertNoForbiddenGameplayRuntimeStatusFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenGameplayRuntimeStatusFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_GAMEPLAY_RUNTIME_STATUS_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: report must not expose gameplay candidates, commands, raw frames, secrets, endpoints, or payloads`,
        { field, path }
      );
    }
    assertNoForbiddenGameplayRuntimeStatusFields(child, context, `${path}.${field}`);
  }
}
