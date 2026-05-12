import { ContractError } from "../../core/contracts.js";
import {
  assertGameplayPreflightReportSafe,
  createGameplayPreflightReport,
} from "./gameplayPreflight.js";

const FORBIDDEN_GAMEPLAY_LAUNCH_PLAN_FIELDS = new Set([
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
  "final_text",
  "text",
  "subtitle_text",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "value",
  "payload",
  "raw_frame",
  "image",
  "frame",
  "ocr_text",
]);

const PLAN_STATUSES = new Set([
  "ready_to_launch_gameplay_control",
  "configure_gameplay_env_first",
]);
const GAMEPLAY_LAUNCH_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "plan_status",
  "target_stage_id",
  "target_stage_priority",
  "vision_mode",
  "game_control_mode",
  "launch_sequence",
  "ready_step_count",
  "attention_step_count",
  "next_step_id",
  "next_step_order",
  "next_launch_script",
  "next_readiness_script",
  "next_readiness_state",
  "readiness_state_counts",
  "next_configure_env",
  "missing_required_env_count",
  "gameplay_stage_summary",
  "integration_readiness",
  "verification_plan_summary",
  "runtime_safe_control_verification",
  "approval_policy",
  "boundary_policy",
  "adapter_validation_required",
]);
const STEP_STATUSES = new Set(["ready", "missing_required_env", "configuration_attention"]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const PROCESS_IDS = new Set([
  "game_vision_source_bridge",
  "game_vision_capture_options",
  "game_control_adapter_gate",
  "game_control_safety_guards",
  "gameplay_verification",
]);
const PURPOSES = new Set([
  "configure_game_observation_source",
  "configure_capture_metadata",
  "configure_approved_control_bridge",
  "enforce_control_rate_and_staleness",
  "verify_gameplay_roundtrips",
]);
const TARGET_POLICY_STATUSES = new Set(["allowed", "attention", "not_applicable"]);
const GAMEPLAY_INTEGRATIONS = new Set([
  "real_screen_capture_or_vision_ingestion",
  "approved_game_control_adapter",
]);
const VISION_MODES = new Set(["http_game_observation", "not_configured"]);
const GAME_CONTROL_MODES = new Set(["http", "mock", "unsupported_adapter"]);
const RUNTIME_SAFE_CONTROL_VERIFICATION_SCRIPT_FIELDS = [
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
];

export function createGameplayLaunchPlan({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const preflight = createGameplayPreflightReport({ env, generatedAtMs });
  assertGameplayPreflightReportSafe(preflight, "gameplay launch plan preflight");

  const launchSequence = buildGameplayLaunchSequence({ env, preflight });
  const readyStepCount = launchSequence.filter(
    (step) => step.launch_readiness_status === "ready"
  ).length;
  const attentionStepCount = launchSequence.filter(
    (step) => step.launch_readiness_status !== "ready"
  ).length;
  const nextStep = launchSequence.find(
    (step) => step.launch_readiness_status !== "ready"
  );
  const missingRequiredEnvCount = uniqueEnvNames(
    launchSequence.flatMap((step) => step.missing_required_env)
  ).length;

  const plan = {
    schema: "iris_gameplay_launch_plan_v1",
    generated_at_ms: generatedAtMs,
    plan_status:
      preflight.preflight_status === "ready_to_poll_game_and_approve_control" &&
      attentionStepCount === 0
        ? "ready_to_launch_gameplay_control"
        : "configure_gameplay_env_first",
    target_stage_id: "vision_and_safe_game_control",
    target_stage_priority: 4,
    vision_mode: preflight.vision_mode,
    game_control_mode: preflight.game_control_mode,
    launch_sequence: launchSequence,
    ready_step_count: readyStepCount,
    attention_step_count: attentionStepCount,
    next_step_id: nextStep?.process_id ?? null,
    next_step_order: nextStep?.sequence_order ?? null,
    next_launch_script: nextStep?.launch_script ?? null,
    next_readiness_script: nextStep?.readiness_script ?? null,
    next_readiness_state: nextStep?.readiness_state ?? "ready",
    readiness_state_counts: countReadinessStates(launchSequence),
    next_configure_env: nextStep ? nextConfigureEnv(nextStep) : [],
    missing_required_env_count: missingRequiredEnvCount,
    gameplay_stage_summary: {
      schema: "iris_gameplay_launch_stage_summary_v1",
      stage_id: preflight.gameplay_stage_summary.stage_id,
      stage_status: preflight.gameplay_stage_summary.stage_status,
      readiness_state: preflight.gameplay_stage_summary.readiness_state,
      integration_count: preflight.gameplay_stage_summary.integration_count,
      ready_integration_count:
        preflight.gameplay_stage_summary.ready_integration_count,
      attention_integration_count:
        preflight.gameplay_stage_summary.attention_integration_count,
      missing_required_env_count:
        preflight.gameplay_stage_summary.missing_required_env_count,
      first_verification_script:
        preflight.gameplay_stage_summary.first_verification_script,
      verification_script_count:
        preflight.gameplay_stage_summary.verification_script_count,
    },
    integration_readiness: preflight.integration_readiness.map((integration) => ({
      schema: "iris_gameplay_launch_integration_readiness_v1",
      integration: integration.integration,
      status: integration.status,
      mode: integration.mode,
      readiness_state: integration.readiness_state,
    })),
    verification_plan_summary: {
      schema: "iris_gameplay_launch_verification_summary_v1",
      stage_id: "vision_and_safe_game_control",
      stage_status: preflight.gameplay_stage_summary.stage_status,
      first_verification_script:
        preflight.verification_plan_summary.first_verification_script,
      verification_script_count:
        preflight.verification_plan_summary.verification_script_count,
      vision_fixture_script:
        preflight.verification_plan_summary.vision_fixture_script,
      vision_failure_script:
        preflight.verification_plan_summary.vision_failure_script,
      game_control_fixture_script:
        preflight.verification_plan_summary.game_control_fixture_script,
      game_control_failure_script:
        preflight.verification_plan_summary.game_control_failure_script,
      production_loop_fixture_script: "npm run dev:production-loop:roundtrip",
      runtime_status_script: "npm run dev:gameplay:runtime-status",
      live_readiness_script: "npm run dev:gameplay:live-readiness",
      readiness_rehearsal_script:
        "npm run dev:gameplay:readiness-rehearsal",
      runtime_roundtrip_script: "npm run dev:gameplay:runtime-roundtrip",
      policy_gate_roundtrip_script:
        "npm run dev:gameplay:policy-gate-roundtrip",
      validation_gate_roundtrip_script:
        "npm run dev:gameplay:validation-gate-roundtrip",
      vision_unsafe_roundtrip_script: "npm run dev:vision:unsafe-roundtrip",
      game_control_unsafe_roundtrip_script:
        "npm run dev:game-control:unsafe-roundtrip",
    },
    runtime_safe_control_verification: {
      schema: "iris_gameplay_launch_runtime_safe_control_verification_v1",
      stage_id: "vision_and_safe_game_control",
      vision_mode: preflight.vision_mode,
      game_control_mode: preflight.game_control_mode,
      runtime_status_script: "npm run dev:gameplay:runtime-status",
      live_readiness_script: "npm run dev:gameplay:live-readiness",
      readiness_rehearsal_script:
        "npm run dev:gameplay:readiness-rehearsal",
      runtime_roundtrip_script: "npm run dev:gameplay:runtime-roundtrip",
      policy_gate_roundtrip_script:
        "npm run dev:gameplay:policy-gate-roundtrip",
      validation_gate_roundtrip_script:
        "npm run dev:gameplay:validation-gate-roundtrip",
      vision_roundtrip_script: "npm run dev:vision:game-roundtrip",
      vision_unsafe_roundtrip_script: "npm run dev:vision:unsafe-roundtrip",
      game_control_roundtrip_script: "npm run dev:game-control:roundtrip",
      game_control_failure_roundtrip_script:
        "npm run dev:game-control:failure-roundtrip",
      game_control_unsafe_roundtrip_script:
        "npm run dev:game-control:unsafe-roundtrip",
      production_loop_roundtrip_script: "npm run dev:production-loop:roundtrip",
      script_count: RUNTIME_SAFE_CONTROL_VERIFICATION_SCRIPT_FIELDS.length,
      runtime_waiting_status_expected: "configured_waiting_for_scheduler_start",
      runtime_observation_status_expected: "game_observation_active",
      runtime_safe_control_status_expected: "safe_control_active",
      live_readiness_status_expected: "ready_for_gameplay_safe_control",
      safe_control_flow_active_status_expected: "safe_control_active",
      safe_control_flow_blocked_status_expected: "waiting_for_safe_control",
      validator_required_before_adapter: true,
      model_proposals_never_sent_to_adapter: true,
      approved_actions_not_exposed_in_reports: true,
      fresh_observation_required_before_adapter: true,
      stale_observation_guard_required: true,
      observation_summary_only_required: true,
      approved_schema_only_no_os_direct_input: true,
      direct_os_input_forbidden: true,
      non_game_adapters_do_not_receive_actions: true,
      rate_limit_guard_required: true,
      adapter_runtime_status_required: true,
      adapter_expiry_guard_counter_required: true,
      expired_actions_surface_as_runtime_attention: true,
      boundary_audit_required: true,
      boundary_policy: {
        safe_local_scripts_only: true,
        env_names_only: true,
        script_names_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_raw_frames: true,
        no_raw_ocr_text: true,
        no_vision_payloads: true,
        no_action_candidates: true,
        no_approved_actions: true,
        no_commands: true,
        read_only_plan: true,
      },
    },
    approval_policy: preflight.approval_policy,
    boundary_policy: {
      safe_local_scripts_only: true,
      env_names_only: true,
      script_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_raw_frames: true,
      no_raw_ocr_text: true,
      no_vision_payloads: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      read_only_plan: true,
    },
    adapter_validation_required: true,
  };
  assertGameplayLaunchPlanSafe(plan);
  return plan;
}

export function assertGameplayLaunchPlanSafe(
  plan,
  context = "gameplay launch plan"
) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: plan is required`);
  }
  assertNoForbiddenGameplayLaunchPlanFields(plan, context);
  if (plan.schema !== "iris_gameplay_launch_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!GAMEPLAY_LAUNCH_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected plan field`, { field });
    }
  }
  if (!Number.isInteger(plan.generated_at_ms) || plan.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (!PLAN_STATUSES.has(plan.plan_status)) {
    throw new ContractError(`${context}: invalid plan status`);
  }
  if (plan.target_stage_id !== "vision_and_safe_game_control") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (plan.target_stage_priority !== 4) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!VISION_MODES.has(plan.vision_mode)) {
    throw new ContractError(`${context}: invalid vision mode`);
  }
  if (!GAME_CONTROL_MODES.has(plan.game_control_mode)) {
    throw new ContractError(`${context}: invalid game control mode`);
  }
  if (!Array.isArray(plan.launch_sequence) || plan.launch_sequence.length === 0) {
    throw new ContractError(`${context}: launch sequence is required`);
  }
  plan.launch_sequence.forEach((step, index) =>
    assertGameplayLaunchStepSafe(step, context, index + 1)
  );
  for (const field of [
    "ready_step_count",
    "attention_step_count",
    "missing_required_env_count",
  ]) {
    if (!Number.isInteger(plan[field]) || plan[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (plan.ready_step_count + plan.attention_step_count !== plan.launch_sequence.length) {
    throw new ContractError(`${context}: invalid launch step count summary`);
  }
  const firstAttentionStep = plan.launch_sequence.find(
    (step) => step.launch_readiness_status !== "ready"
  );
  if (plan.attention_step_count === 0) {
    if (
      plan.next_step_id !== null ||
      plan.next_step_order !== null ||
      plan.next_launch_script !== null ||
      plan.next_readiness_script !== null ||
      plan.next_readiness_state !== "ready" ||
      !Array.isArray(plan.next_configure_env) ||
      plan.next_configure_env.length !== 0
    ) {
      throw new ContractError(`${context}: unexpected next step`);
    }
  } else if (
    plan.next_step_id !== firstAttentionStep?.process_id ||
    plan.next_step_order !== firstAttentionStep?.sequence_order ||
    plan.next_launch_script !== firstAttentionStep?.launch_script ||
    plan.next_readiness_script !== firstAttentionStep?.readiness_script ||
    plan.next_readiness_state !== firstAttentionStep?.readiness_state
  ) {
    throw new ContractError(`${context}: invalid next step`);
  }
  assertSafeReadinessState(plan.next_readiness_state, context);
  assertReadinessStateCountsSafe(plan.readiness_state_counts, context);
  if (
    !sameReadinessStateCounts(
      plan.readiness_state_counts,
      countReadinessStates(plan.launch_sequence)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  if (plan.next_launch_script !== null) {
    assertSafeScriptName(plan.next_launch_script, `${context}: next launch script`);
  }
  if (plan.next_readiness_script !== null) {
    assertSafeScriptName(
      plan.next_readiness_script,
      `${context}: next readiness script`
    );
  }
  assertEnvNameListSafe(plan.next_configure_env, `${context}: next configure env`);
  if (
    firstAttentionStep &&
    JSON.stringify(plan.next_configure_env) !==
      JSON.stringify(nextConfigureEnv(firstAttentionStep))
  ) {
    throw new ContractError(`${context}: invalid next configure env`);
  }
  if (
    plan.plan_status === "ready_to_launch_gameplay_control" &&
    plan.attention_step_count !== 0
  ) {
    throw new ContractError(`${context}: ready launch plan has attention steps`);
  }
  if (
    plan.plan_status === "configure_gameplay_env_first" &&
    plan.attention_step_count === 0
  ) {
    throw new ContractError(`${context}: configure plan has no attention steps`);
  }
  assertGameplayStageSummarySafe(plan.gameplay_stage_summary, context);
  assertGameplayIntegrationReadinessListSafe(plan.integration_readiness, context);
  assertVerificationSummarySafe(plan.verification_plan_summary, context);
  assertRuntimeSafeControlVerificationSafe(
    plan.runtime_safe_control_verification,
    context
  );
  assertApprovalPolicySafe(plan.approval_policy, context);
  assertBoundaryPolicySafe(plan.boundary_policy, context);
  if (plan.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function buildGameplayLaunchSequence({ env, preflight }) {
  return [
    buildVisionSourceStep(env, preflight),
    buildCaptureOptionsStep(env, preflight),
    buildGameControlGateStep(env, preflight),
    buildControlSafetyStep(env, preflight),
    buildVerificationStep(preflight),
  ].map((step, index) => ({ ...step, sequence_order: index + 1 }));
}

function buildVisionSourceStep(env, preflight) {
  const requiredEnv = [
    "IRIS_GAME_OBSERVATION_ENDPOINT",
    "IRIS_GAME_OBSERVATION_METHOD",
    "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
  ];
  const configuredRequiredEnv = [
    env.IRIS_GAME_OBSERVATION_ENDPOINT ? "IRIS_GAME_OBSERVATION_ENDPOINT" : null,
    env.IRIS_GAME_OBSERVATION_METHOD ? "IRIS_GAME_OBSERVATION_METHOD" : null,
    env.IRIS_ENABLE_HTTP_INGEST_SCHEDULER === "true"
      ? "IRIS_ENABLE_HTTP_INGEST_SCHEDULER"
      : null,
  ].filter(Boolean);
  const missingRequiredEnv = [
    env.IRIS_GAME_OBSERVATION_ENDPOINT ? null : "IRIS_GAME_OBSERVATION_ENDPOINT",
    env.IRIS_GAME_OBSERVATION_METHOD ? null : "IRIS_GAME_OBSERVATION_METHOD",
    env.IRIS_ENABLE_HTTP_INGEST_SCHEDULER === "true"
      ? null
      : "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
  ].filter(Boolean);
  return buildStep({
    process_id: "game_vision_source_bridge",
    purpose: "configure_game_observation_source",
    launchScript: "npm run dev:gameplay:preflight",
    readinessScript: "npm run dev:vision:game-roundtrip",
    requiredEnv,
    configuredRequiredEnv,
    missingRequiredEnv,
    optionalEnv: [
      "IRIS_GAME_OBSERVATION_API_KEY",
      "IRIS_GAME_OBSERVATION_TIMEOUT_MS",
      "IRIS_GAME_OBSERVATION_ERROR_BACKOFF_MS",
      "IRIS_GAME_OBSERVATION_MAX_ERROR_BACKOFF_MS",
      "IRIS_HTTP_INGEST_INTERVAL_MS",
      "IRIS_HTTP_INGEST_LIMIT",
      "IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR",
    ],
    statusOverride:
      missingRequiredEnv.length > 0
        ? "missing_required_env"
        : preflight.vision_target_policy_status === "attention" ||
            preflight.vision_request_method_supported !== true
          ? "configuration_attention"
          : "ready",
    extra: {
      vision_target_policy_status: preflight.vision_target_policy_status,
      scheduler_expected_enabled: true,
      request_method_expected_supported: true,
      read_only_observation_required: true,
    },
  });
}

function buildCaptureOptionsStep(env, preflight) {
  return buildStep({
    process_id: "game_vision_capture_options",
    purpose: "configure_capture_metadata",
    launchScript: "npm run dev:gameplay:preflight",
    readinessScript: "npm run dev:vision:game-roundtrip",
    requiredEnv: [],
    configuredRequiredEnv: [],
    missingRequiredEnv: [],
    optionalEnv: [
      "IRIS_GAME_CAPTURE_REGION",
      "IRIS_GAME_CAPTURE_X",
      "IRIS_GAME_CAPTURE_Y",
      "IRIS_GAME_CAPTURE_WIDTH",
      "IRIS_GAME_CAPTURE_HEIGHT",
      "IRIS_GAME_OBSERVATION_INCLUDE_OCR_SUMMARY",
      "IRIS_GAME_OBSERVATION_INCLUDE_UI_FOCUS_AREAS",
      "IRIS_GAME_OBSERVATION_MAX_EVENTS",
    ],
    statusOverride:
      preflight.vision_status === "ready" ? "ready" : "configuration_attention",
    extra: {
      capture_region_env_configured: Boolean(env.IRIS_GAME_CAPTURE_REGION),
      capture_dimensions_env_configured: Boolean(
        env.IRIS_GAME_CAPTURE_WIDTH && env.IRIS_GAME_CAPTURE_HEIGHT
      ),
      ocr_summary_is_metadata_only: true,
      ui_focus_areas_are_metadata_only: true,
    },
  });
}

function buildGameControlGateStep(env, preflight) {
  const actionsEnvConfigured = Boolean(env.IRIS_AVAILABLE_GAME_ACTIONS);
  const missingRequiredEnv = [
    env.IRIS_ENABLE_GAME_CONTROL === "true" ? null : "IRIS_ENABLE_GAME_CONTROL",
    env.IRIS_GAME_CONTROL_ADAPTER === "http" ? null : "IRIS_GAME_CONTROL_ADAPTER",
    env.IRIS_GAME_CONTROL_ENDPOINT ? null : "IRIS_GAME_CONTROL_ENDPOINT",
    actionsEnvConfigured ? null : "IRIS_AVAILABLE_GAME_ACTIONS",
  ].filter(Boolean);
  const configuredRequiredEnv = [
    env.IRIS_ENABLE_GAME_CONTROL === "true" ? "IRIS_ENABLE_GAME_CONTROL" : null,
    env.IRIS_GAME_CONTROL_ADAPTER === "http" ? "IRIS_GAME_CONTROL_ADAPTER" : null,
    env.IRIS_GAME_CONTROL_ENDPOINT ? "IRIS_GAME_CONTROL_ENDPOINT" : null,
    actionsEnvConfigured ? "IRIS_AVAILABLE_GAME_ACTIONS" : null,
  ].filter(Boolean);
  const hasConfigurationAttention =
    preflight.game_control_target_policy_status === "attention" ||
    preflight.approved_action_kind_count === 0 ||
    preflight.unsupported_action_name_count > 0 ||
    preflight.fallback_to_wait_when_unconfigured === true;
  return buildStep({
    process_id: "game_control_adapter_gate",
    purpose: "configure_approved_control_bridge",
    launchScript: "npm run dev:gameplay:preflight",
    readinessScript: "npm run dev:game-control:roundtrip",
    requiredEnv: [
      "IRIS_ENABLE_GAME_CONTROL",
      "IRIS_GAME_CONTROL_ADAPTER",
      "IRIS_GAME_CONTROL_ENDPOINT",
      "IRIS_AVAILABLE_GAME_ACTIONS",
    ],
    configuredRequiredEnv,
    missingRequiredEnv,
    optionalEnv: ["IRIS_GAME_CONTROL_API_KEY", "IRIS_GAME_CONTROL_TIMEOUT_MS"],
    statusOverride:
      missingRequiredEnv.length > 0
        ? "missing_required_env"
        : hasConfigurationAttention
          ? "configuration_attention"
          : "ready",
    extra: {
      game_control_target_policy_status: preflight.game_control_target_policy_status,
      approved_action_kind_count: preflight.approved_action_kind_count,
      unsupported_action_name_count: preflight.unsupported_action_name_count,
      candidates_require_validator_approval: true,
      bridge_accepts_approved_actions_only: true,
      fallback_to_wait_when_unconfigured: preflight.fallback_to_wait_when_unconfigured,
    },
  });
}

function buildControlSafetyStep(env, preflight) {
  const configuredRequiredEnv = [
    env.IRIS_GAME_CONTROL_MIN_INTERVAL_MS ? "IRIS_GAME_CONTROL_MIN_INTERVAL_MS" : null,
    env.IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS
      ? "IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS"
      : null,
  ].filter(Boolean);
  const missingRequiredEnv = [
    env.IRIS_GAME_CONTROL_MIN_INTERVAL_MS ? null : "IRIS_GAME_CONTROL_MIN_INTERVAL_MS",
    env.IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS
      ? null
      : "IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS",
  ].filter(Boolean);
  return buildStep({
    process_id: "game_control_safety_guards",
    purpose: "enforce_control_rate_and_staleness",
    launchScript: "npm run dev:gameplay:preflight",
    readinessScript: "npm run dev:game-control:unsafe-roundtrip",
    requiredEnv: [
      "IRIS_GAME_CONTROL_MIN_INTERVAL_MS",
      "IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS",
    ],
    configuredRequiredEnv,
    missingRequiredEnv,
    optionalEnv: [],
    statusOverride:
      missingRequiredEnv.length > 0
        ? "missing_required_env"
        : preflight.game_control_status === "ready"
          ? "ready"
          : "configuration_attention",
    extra: {
      rate_limit_guard_expected: true,
      stale_observation_guard_expected: true,
      unsafe_success_response_rejected: true,
    },
  });
}

function buildVerificationStep(preflight) {
  return buildStep({
    process_id: "gameplay_verification",
    purpose: "verify_gameplay_roundtrips",
    launchScript: "npm run dev:gameplay:preflight",
    readinessScript: "npm run dev:production-loop:roundtrip",
    requiredEnv: [],
    configuredRequiredEnv: [],
    missingRequiredEnv: [],
    optionalEnv: [],
    statusOverride:
      preflight.preflight_status === "ready_to_poll_game_and_approve_control"
        ? "ready"
        : "configuration_attention",
    extra: {
      verification_is_summary_only: true,
    },
  });
}

function buildStep({
  process_id,
  purpose,
  launchScript,
  readinessScript,
  requiredEnv,
  configuredRequiredEnv,
  missingRequiredEnv,
  optionalEnv = [],
  statusOverride = null,
  extra = {},
}) {
  const launchReadinessStatus =
    statusOverride ?? (missingRequiredEnv.length === 0 ? "ready" : "missing_required_env");
  return {
    schema: "iris_gameplay_launch_step_v1",
    sequence_order: 0,
    process_id,
    purpose,
    launch_readiness_status: launchReadinessStatus,
    readiness_state: readinessStateForLaunchStatus(launchReadinessStatus),
    launch_script: launchScript,
    readiness_script: readinessScript,
    required_env: requiredEnv,
    optional_env: optionalEnv,
    configured_required_env: configuredRequiredEnv,
    missing_required_env: missingRequiredEnv,
    ...extra,
  };
}

function assertGameplayLaunchStepSafe(step, context, expectedOrder) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: invalid launch step`);
  }
  if (step.schema !== "iris_gameplay_launch_step_v1") {
    throw new ContractError(`${context}: invalid launch step schema`);
  }
  if (step.sequence_order !== expectedOrder) {
    throw new ContractError(`${context}: invalid launch step order`);
  }
  if (!PROCESS_IDS.has(step.process_id)) {
    throw new ContractError(`${context}: invalid process id`);
  }
  if (!PURPOSES.has(step.purpose)) {
    throw new ContractError(`${context}: invalid purpose`);
  }
  if (!STEP_STATUSES.has(step.launch_readiness_status)) {
    throw new ContractError(`${context}: invalid launch readiness status`);
  }
  assertSafeReadinessState(step.readiness_state, context);
  if (step.readiness_state !== readinessStateForLaunchStatus(step.launch_readiness_status)) {
    throw new ContractError(`${context}: invalid launch readiness state`);
  }
  assertSafeScriptName(step.launch_script, context);
  assertSafeScriptName(step.readiness_script, context);
  for (const field of [
    "required_env",
    "optional_env",
    "configured_required_env",
    "missing_required_env",
  ]) {
    assertEnvNameListSafe(step[field], `${context}: ${field}`);
  }
  if (step.launch_readiness_status === "ready" && step.missing_required_env.length !== 0) {
    throw new ContractError(`${context}: ready step has missing env`);
  }
  if (
    step.launch_readiness_status === "missing_required_env" &&
    step.missing_required_env.length === 0
  ) {
    throw new ContractError(`${context}: missing-env step has no missing env`);
  }
  if (
    step.vision_target_policy_status !== undefined &&
    !TARGET_POLICY_STATUSES.has(step.vision_target_policy_status)
  ) {
    throw new ContractError(`${context}: invalid vision target policy`);
  }
  if (
    step.game_control_target_policy_status !== undefined &&
    !TARGET_POLICY_STATUSES.has(step.game_control_target_policy_status)
  ) {
    throw new ContractError(`${context}: invalid control target policy`);
  }
  for (const field of [
    "capture_region_env_configured",
    "capture_dimensions_env_configured",
    "ocr_summary_is_metadata_only",
    "ui_focus_areas_are_metadata_only",
    "scheduler_expected_enabled",
    "request_method_expected_supported",
    "read_only_observation_required",
    "candidates_require_validator_approval",
    "bridge_accepts_approved_actions_only",
    "fallback_to_wait_when_unconfigured",
    "rate_limit_guard_expected",
    "stale_observation_guard_expected",
    "unsafe_success_response_rejected",
    "verification_is_summary_only",
  ]) {
    if (step[field] !== undefined && typeof step[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of ["approved_action_kind_count", "unsupported_action_name_count"]) {
    if (
      step[field] !== undefined &&
      (!Number.isInteger(step[field]) || step[field] < 0)
    ) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
}

function assertGameplayStageSummarySafe(stage, context) {
  if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
    throw new ContractError(`${context}: stage summary is required`);
  }
  if (stage.schema !== "iris_gameplay_launch_stage_summary_v1") {
    throw new ContractError(`${context}: invalid stage schema`);
  }
  if (stage.stage_id !== "vision_and_safe_game_control") {
    throw new ContractError(`${context}: invalid stage id`);
  }
  if (!["ready", "attention"].includes(stage.stage_status)) {
    throw new ContractError(`${context}: invalid stage status`);
  }
  assertSafeReadinessState(stage.readiness_state, context);
  if (stage.stage_status === "ready" && stage.readiness_state !== "ready") {
    throw new ContractError(`${context}: invalid ready stage readiness state`);
  }
  if (stage.stage_status === "attention" && stage.readiness_state === "ready") {
    throw new ContractError(`${context}: invalid attention stage readiness state`);
  }
  for (const field of [
    "integration_count",
    "ready_integration_count",
    "attention_integration_count",
    "missing_required_env_count",
    "verification_script_count",
  ]) {
    if (!Number.isInteger(stage[field]) || stage[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (stage.ready_integration_count + stage.attention_integration_count !== stage.integration_count) {
    throw new ContractError(`${context}: invalid integration count`);
  }
  if (stage.stage_status === "ready" && stage.attention_integration_count !== 0) {
    throw new ContractError(`${context}: ready stage summary has attention checks`);
  }
  if (stage.stage_status === "attention" && stage.attention_integration_count === 0) {
    throw new ContractError(`${context}: attention stage summary has no attention checks`);
  }
  if (stage.first_verification_script !== null) {
    assertSafeScriptName(stage.first_verification_script, context);
  }
}

function assertGameplayIntegrationReadinessListSafe(readiness, context) {
  if (!Array.isArray(readiness) || readiness.length === 0) {
    throw new ContractError(`${context}: integration readiness is required`);
  }
  const seen = new Set();
  for (const item of readiness) {
    assertGameplayIntegrationReadinessSafe(item, context);
    seen.add(item.integration);
  }
  for (const integration of GAMEPLAY_INTEGRATIONS) {
    if (!seen.has(integration)) {
      throw new ContractError(`${context}: missing integration`);
    }
  }
}

function assertGameplayIntegrationReadinessSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: invalid integration readiness`);
  }
  if (item.schema !== "iris_gameplay_launch_integration_readiness_v1") {
    throw new ContractError(`${context}: invalid integration readiness schema`);
  }
  if (!GAMEPLAY_INTEGRATIONS.has(item.integration)) {
    throw new ContractError(`${context}: invalid integration`);
  }
  if (!["ready", "attention"].includes(item.status)) {
    throw new ContractError(`${context}: invalid integration status`);
  }
  assertSafeReadinessState(item.readiness_state, context);
  if (item.readiness_state !== readinessStateForIntegration(item)) {
    throw new ContractError(`${context}: invalid integration readiness state`);
  }
  if (typeof item.mode !== "string" || !/^[a-z0-9_]+$/.test(item.mode)) {
    throw new ContractError(`${context}: invalid integration mode`);
  }
}

function readinessStateForLaunchStatus(status) {
  if (status === "ready") return "ready";
  if (status === "missing_required_env") return "configuration_waiting";
  if (status === "configuration_attention") return "operator_review_required";
  return "operator_review_required";
}

function readinessStateForIntegration(integration) {
  return integration.status === "ready" ? "ready" : "configuration_waiting";
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
    throw new ContractError(`${context}: readiness state counts are required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness state count`);
    }
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: unexpected readiness state count`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every(
    (state) => Number(left?.[state] ?? -1) === Number(right?.[state] ?? -2)
  );
}

function assertVerificationSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: verification summary is required`);
  }
  if (summary.schema !== "iris_gameplay_launch_verification_summary_v1") {
    throw new ContractError(`${context}: invalid verification schema`);
  }
  if (summary.stage_id !== "vision_and_safe_game_control") {
    throw new ContractError(`${context}: invalid verification stage`);
  }
  if (!["ready", "attention"].includes(summary.stage_status)) {
    throw new ContractError(`${context}: invalid verification status`);
  }
  if (summary.first_verification_script !== null) {
    assertSafeScriptName(summary.first_verification_script, context);
  }
  if (
    !Number.isInteger(summary.verification_script_count) ||
    summary.verification_script_count < 0
  ) {
    throw new ContractError(`${context}: invalid verification script count`);
  }
  assertSafeScriptName(summary.vision_fixture_script, context);
  assertSafeScriptName(summary.vision_failure_script, context);
  assertSafeScriptName(summary.game_control_fixture_script, context);
  if (summary.game_control_failure_script !== null) {
    assertSafeScriptName(summary.game_control_failure_script, context);
  }
  assertSafeScriptName(summary.production_loop_fixture_script, context);
  assertSafeScriptName(summary.runtime_status_script, context);
  assertSafeScriptName(summary.live_readiness_script, context);
  assertSafeScriptName(summary.readiness_rehearsal_script, context);
  assertSafeScriptName(summary.runtime_roundtrip_script, context);
  assertSafeScriptName(summary.policy_gate_roundtrip_script, context);
  assertSafeScriptName(summary.validation_gate_roundtrip_script, context);
  assertSafeScriptName(summary.vision_unsafe_roundtrip_script, context);
  assertSafeScriptName(summary.game_control_unsafe_roundtrip_script, context);
}

function assertRuntimeSafeControlVerificationSafe(verification, context) {
  if (!verification || typeof verification !== "object" || Array.isArray(verification)) {
    throw new ContractError(`${context}: runtime safe-control verification is required`);
  }
  if (
    verification.schema !==
    "iris_gameplay_launch_runtime_safe_control_verification_v1"
  ) {
    throw new ContractError(`${context}: invalid runtime safe-control verification schema`);
  }
  if (verification.stage_id !== "vision_and_safe_game_control") {
    throw new ContractError(`${context}: invalid runtime safe-control verification stage`);
  }
  if (!VISION_MODES.has(verification.vision_mode)) {
    throw new ContractError(`${context}: invalid runtime safe-control vision mode`);
  }
  if (!GAME_CONTROL_MODES.has(verification.game_control_mode)) {
    throw new ContractError(`${context}: invalid runtime safe-control mode`);
  }
  for (const field of RUNTIME_SAFE_CONTROL_VERIFICATION_SCRIPT_FIELDS) {
    assertSafeScriptName(verification[field], context);
  }
  if (
    verification.script_count !==
    RUNTIME_SAFE_CONTROL_VERIFICATION_SCRIPT_FIELDS.length
  ) {
    throw new ContractError(`${context}: invalid runtime safe-control script count`);
  }
  if (verification.runtime_waiting_status_expected !== "configured_waiting_for_scheduler_start") {
    throw new ContractError(`${context}: invalid waiting runtime expectation`);
  }
  if (verification.runtime_observation_status_expected !== "game_observation_active") {
    throw new ContractError(`${context}: invalid observation runtime expectation`);
  }
  if (verification.runtime_safe_control_status_expected !== "safe_control_active") {
    throw new ContractError(`${context}: invalid safe-control runtime expectation`);
  }
  if (
    verification.live_readiness_status_expected !==
    "ready_for_gameplay_safe_control"
  ) {
    throw new ContractError(`${context}: invalid live readiness expectation`);
  }
  if (verification.safe_control_flow_active_status_expected !== "safe_control_active") {
    throw new ContractError(`${context}: invalid safe-control flow expectation`);
  }
  if (
    verification.safe_control_flow_blocked_status_expected !==
    "waiting_for_safe_control"
  ) {
    throw new ContractError(`${context}: invalid blocked safe-control flow expectation`);
  }
  for (const field of [
    "validator_required_before_adapter",
    "model_proposals_never_sent_to_adapter",
    "approved_actions_not_exposed_in_reports",
    "fresh_observation_required_before_adapter",
    "stale_observation_guard_required",
    "observation_summary_only_required",
    "approved_schema_only_no_os_direct_input",
    "direct_os_input_forbidden",
    "non_game_adapters_do_not_receive_actions",
    "rate_limit_guard_required",
    "adapter_runtime_status_required",
    "adapter_expiry_guard_counter_required",
    "expired_actions_surface_as_runtime_attention",
    "boundary_audit_required",
  ]) {
    if (verification[field] !== true) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertBoundaryPolicySafe(verification.boundary_policy, context);
}

function assertApprovalPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: approval policy is required`);
  }
  for (const field of [
    "input_action_candidates_never_sent_to_adapter",
    "approved_actions_only_for_game_control_adapter",
    "viewer_text_cannot_directly_control_game",
    "fresh_observation_required_before_adapter",
    "stale_observation_rejected_before_adapter",
    "observation_summary_only_before_player_and_validator",
    "approved_schema_only_no_os_direct_input",
    "non_game_adapters_do_not_receive_actions",
    "approved_action_expiry_enforced_by_adapter",
    "bridge_ack_shape_only",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid approval policy`);
    }
  }
}

function assertBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const requiredFields = [
    "safe_local_scripts_only",
    "env_names_only",
    "script_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_raw_frames",
    "no_raw_ocr_text",
    "no_vision_payloads",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
    "read_only_plan",
  ];
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

function assertSafeScriptName(script, context) {
  if (
    typeof script !== "string" ||
    !(
      /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
        script
      ) || script === "npm test"
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

function nextConfigureEnv(step) {
  if (!step) return [];
  const candidates =
    step.missing_required_env.length > 0
      ? step.missing_required_env
      : step.required_env;
  return uniqueEnvNames(candidates);
}

function uniqueEnvNames(names) {
  return [...new Set(names)].filter((name) => /^IRIS_[A-Z0-9_]+$/.test(name));
}

function assertNoForbiddenGameplayLaunchPlanFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenGameplayLaunchPlanFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_GAMEPLAY_LAUNCH_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe launch plan field`, { field, path });
    }
    assertNoForbiddenGameplayLaunchPlanFields(child, context, `${path}.${field}`);
  }
}
