import { ContractError } from "../../core/contracts.js";
import {
  assertProductionConfigDoctorSafe,
  createProductionConfigDoctor,
} from "./productionConfigDoctor.js";
import {
  assertProductionReadinessRunbookSafe,
  createProductionReadinessRunbook,
} from "./productionReadinessRunbook.js";
import { ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES } from "./adminCharacterVoiceSettings.js";

const FORBIDDEN_FOUNDATION_LAUNCH_PLAN_FIELDS = new Set([
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
]);

const PLAN_STATUSES = new Set([
  "ready_to_launch_foundation",
  "configure_foundation_env_first",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const STEP_STATUSES = new Set(["ready", "missing_required_env", "configuration_attention"]);
const PROCESS_IDS = new Set([
  "voicevox_tts_engine_bridge",
  "live2d_cue_engine_bridge",
  "local_adapter_bridge",
  "local_bridge_worker",
  "iris_dev_server",
  "obs_browser_source_setup",
]);
const PURPOSES = new Set([
  "tts_engine_adapter",
  "live2d_cue_adapter",
  "adapter_packet_receiver",
  "engine_artifact_worker",
  "runtime_http_server",
  "obs_browser_source_configuration",
]);
const STARTUP_KINDS = new Set([
  "long_running_service",
  "watch_worker",
  "one_shot_setup",
]);
const OPERATOR_ACTIONS = new Set([
  "start_service",
  "start_watch_worker",
  "run_setup_once",
]);
const STARTUP_METADATA_BY_PROCESS = {
  voicevox_tts_engine_bridge: {
    startup_kind: "long_running_service",
    operator_action: "start_service",
    requires_dedicated_terminal: true,
    blocks_runtime_handoff: false,
    blocks_obs_pickup: false,
  },
  live2d_cue_engine_bridge: {
    startup_kind: "long_running_service",
    operator_action: "start_service",
    requires_dedicated_terminal: true,
    blocks_runtime_handoff: false,
    blocks_obs_pickup: false,
  },
  local_adapter_bridge: {
    startup_kind: "long_running_service",
    operator_action: "start_service",
    requires_dedicated_terminal: true,
    blocks_runtime_handoff: true,
    blocks_obs_pickup: true,
  },
  local_bridge_worker: {
    startup_kind: "watch_worker",
    operator_action: "start_watch_worker",
    requires_dedicated_terminal: true,
    blocks_runtime_handoff: true,
    blocks_obs_pickup: true,
  },
  iris_dev_server: {
    startup_kind: "long_running_service",
    operator_action: "start_service",
    requires_dedicated_terminal: true,
    blocks_runtime_handoff: true,
    blocks_obs_pickup: false,
  },
  obs_browser_source_setup: {
    startup_kind: "one_shot_setup",
    operator_action: "run_setup_once",
    requires_dedicated_terminal: false,
    blocks_runtime_handoff: true,
    blocks_obs_pickup: true,
  },
};
const FOUNDATION_INTEGRATIONS = new Set([
  "validated_runtime_bridge_handoff",
  "real_tts_engine",
  "real_live2d_bridge",
  "production_obs_overlay",
]);
const TARGET_POLICY_STATUSES = new Set(["allowed", "attention", "not_applicable"]);
const OBS_PICKUP_STARTUP_BOUNDARY_FIELDS = [
  "booleans_counts_and_script_names_only",
  "env_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
];
const RUNTIME_HANDOFF_VERIFICATION_SCRIPT_FIELDS = [
  "foundation_status_script",
  "foundation_runtime_status_script",
  "foundation_live_readiness_script",
  "foundation_readiness_rehearsal_script",
  "bridge_status_roundtrip_script",
  "bridge_engine_roundtrip_script",
  "engine_probe_script",
  "obs_render_handoff_script",
  "obs_runtime_render_roundtrip_script",
];

const FOUNDATION_LAUNCH_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "plan_status",
  "target_stage_id",
  "target_stage_priority",
  "next_readiness_state",
  "readiness_state_counts",
  "launch_sequence",
  "ready_step_count",
  "attention_step_count",
  "next_step_id",
  "next_step_order",
  "next_launch_script",
  "next_readiness_script",
  "next_configure_env",
  "missing_required_env_count",
  "operator_startup_plan",
  "foundation_stage_summary",
  "integration_readiness",
  "verification_plan_summary",
  "runtime_handoff_verification_summary",
  "boundary_policy",
  "adapter_validation_required",
]);

export function createFoundationLaunchPlan({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const doctor = createProductionConfigDoctor({ env, generatedAtMs });
  const runbook = createProductionReadinessRunbook({ env, generatedAtMs });
  assertProductionConfigDoctorSafe(doctor, "foundation launch plan doctor");
  assertProductionReadinessRunbookSafe(runbook, "foundation launch plan runbook");

  const checks = new Map(doctor.checks.map((check) => [check.integration, check]));
  const foundationStage = runbook.stages.find(
    (stage) => stage.stage_id === "tts_live2d_obs_foundation"
  );
  if (!foundationStage) {
    throw new ContractError("foundation launch plan: missing foundation stage");
  }

  const launchSequence = buildFoundationLaunchSequence({ env, checks, foundationStage });
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
  const operatorStartupPlan = buildOperatorStartupPlan(launchSequence);
  const launchReadinessStates = launchSequence.map(readinessStateForLaunchStep);

  const plan = {
    schema: "iris_foundation_launch_plan_v1",
    generated_at_ms: generatedAtMs,
    plan_status:
      foundationStage.status === "ready" && attentionStepCount === 0
        ? "ready_to_launch_foundation"
        : "configure_foundation_env_first",
    target_stage_id: "tts_live2d_obs_foundation",
    target_stage_priority: 1,
    next_readiness_state: firstReadinessState(launchReadinessStates) ?? "ready",
    readiness_state_counts: countReadinessStates(launchReadinessStates),
    launch_sequence: launchSequence,
    ready_step_count: readyStepCount,
    attention_step_count: attentionStepCount,
    next_step_id: nextStep?.process_id ?? null,
    next_step_order: nextStep?.sequence_order ?? null,
    next_launch_script: nextStep?.launch_script ?? null,
    next_readiness_script: nextStep?.readiness_script ?? null,
    next_configure_env: nextStep ? nextConfigureEnv(nextStep) : [],
    missing_required_env_count: missingRequiredEnvCount,
    operator_startup_plan: operatorStartupPlan,
    foundation_stage_summary: {
      schema: "iris_foundation_launch_stage_summary_v1",
      stage_id: foundationStage.stage_id,
      stage_status: foundationStage.status,
      integration_count: foundationStage.integrations.length,
      ready_integration_count: foundationStage.integrations.filter(
        (integration) => integration.status === "ready"
      ).length,
      attention_integration_count: foundationStage.integrations.filter(
        (integration) => integration.status === "attention"
      ).length,
      missing_required_env_count: foundationStage.missing_required_env.length,
      first_verification_script: foundationStage.verification_scripts[0] ?? null,
      verification_script_count: foundationStage.verification_scripts.length,
    },
    integration_readiness: foundationStage.integrations.map((integration) => ({
      schema: "iris_foundation_launch_integration_readiness_v1",
      integration: integration.integration,
      status: integration.status,
      mode: integration.mode,
      readiness_state: readinessStateForIntegration(integration),
    })),
    verification_plan_summary: {
      schema: "iris_foundation_launch_verification_summary_v1",
      stage_id: "tts_live2d_obs_foundation",
      stage_status: foundationStage.status,
      first_verification_script: foundationStage.verification_scripts[0] ?? null,
      verification_script_count: foundationStage.verification_scripts.length,
      bridge_engine_fixture_script: "npm run dev:bridge:engine-roundtrip",
      engine_probe_script: "npm run dev:engine:probe",
      foundation_readiness_rehearsal_script:
        "npm run dev:foundation:readiness-rehearsal",
      foundation_policy_gate_roundtrip_script:
        "npm run dev:foundation:policy-gate-roundtrip",
      obs_render_handoff_script: "npm run dev:obs:render-handoff-roundtrip",
      obs_runtime_render_roundtrip_script: "npm run dev:obs:runtime-render-roundtrip",
      obs_setup_script: "npm run dev:obs:setup",
    },
    runtime_handoff_verification_summary: {
      schema: "iris_foundation_launch_runtime_handoff_verification_v1",
      stage_id: "tts_live2d_obs_foundation",
      foundation_status_script: "npm run dev:foundation:status",
      foundation_runtime_status_script: "npm run dev:foundation:runtime-status",
      foundation_live_readiness_script: "npm run dev:foundation:live-readiness",
      foundation_readiness_rehearsal_script:
        "npm run dev:foundation:readiness-rehearsal",
      bridge_status_roundtrip_script: "npm run dev:bridge:status-roundtrip",
      bridge_engine_roundtrip_script: "npm run dev:bridge:engine-roundtrip",
      engine_probe_script: "npm run dev:engine:probe",
      obs_render_handoff_script: "npm run dev:obs:render-handoff-roundtrip",
      obs_runtime_render_roundtrip_script: "npm run dev:obs:runtime-render-roundtrip",
      script_count: RUNTIME_HANDOFF_VERIFICATION_SCRIPT_FIELDS.length,
      foundation_status_expected: "ready_for_runtime_handoff",
      foundation_runtime_status_expected: "ready_for_obs_runtime_handoff",
      foundation_live_readiness_expected: "ready_for_live_obs_operation",
      obs_runtime_roundtrip_expected: "ready_for_obs_runtime_handoff",
      local_bridge_worker_runtime_summary_required: true,
      real_engine_handoff_summary_required: true,
      obs_browser_source_runtime_summary_required: true,
      render_manifest_handoff_summary_required: true,
      configured_production_probe_required: true,
      engine_health_probe_pass_required: true,
      obs_bridge_health_probe_pass_required_when_configured: true,
      boundary_policy: {
        safe_local_scripts_only: true,
        env_names_only: true,
        script_names_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
        read_only_plan: true,
      },
    },
    boundary_policy: {
      safe_local_scripts_only: true,
      env_names_only: true,
      script_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_plan: true,
    },
    adapter_validation_required: true,
  };
  assertFoundationLaunchPlanSafe(plan);
  return plan;
}

export function assertFoundationLaunchPlanSafe(
  plan,
  context = "foundation launch plan"
) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: plan is required`);
  }
  assertNoForbiddenFoundationLaunchPlanFields(plan, context);
  if (plan.schema !== "iris_foundation_launch_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!FOUNDATION_LAUNCH_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected plan field`, { field });
    }
  }
  if (!Number.isInteger(plan.generated_at_ms) || plan.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (!PLAN_STATUSES.has(plan.plan_status)) {
    throw new ContractError(`${context}: invalid plan status`);
  }
  if (plan.target_stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (plan.target_stage_priority !== 1) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  assertSafeReadinessState(plan.next_readiness_state, context);
  assertReadinessStateCountsSafe(plan.readiness_state_counts, context);
  if (!Array.isArray(plan.launch_sequence) || plan.launch_sequence.length === 0) {
    throw new ContractError(`${context}: launch sequence is required`);
  }
  plan.launch_sequence.forEach((step, index) =>
    assertFoundationLaunchStepSafe(step, context, index + 1)
  );
  const expectedLaunchReadinessStates = plan.launch_sequence.map(
    readinessStateForLaunchStep
  );
  if (
    plan.next_readiness_state !==
      (firstReadinessState(expectedLaunchReadinessStates) ?? "ready") ||
    !sameReadinessStateCounts(
      plan.readiness_state_counts,
      countReadinessStates(expectedLaunchReadinessStates)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state summary`);
  }
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
      !Array.isArray(plan.next_configure_env) ||
      plan.next_configure_env.length !== 0
    ) {
      throw new ContractError(`${context}: unexpected next step`);
    }
  } else if (
    plan.next_step_id !== firstAttentionStep?.process_id ||
    plan.next_step_order !== firstAttentionStep?.sequence_order ||
    plan.next_launch_script !== firstAttentionStep?.launch_script ||
    plan.next_readiness_script !== firstAttentionStep?.readiness_script
  ) {
    throw new ContractError(`${context}: invalid next step`);
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
  if (plan.plan_status === "ready_to_launch_foundation" && plan.attention_step_count !== 0) {
    throw new ContractError(`${context}: ready launch plan has attention steps`);
  }
  if (
    plan.plan_status === "configure_foundation_env_first" &&
    plan.attention_step_count === 0
  ) {
    throw new ContractError(`${context}: configure plan has no attention steps`);
  }
  assertFoundationStageSummarySafe(plan.foundation_stage_summary, context);
  assertFoundationIntegrationReadinessListSafe(plan.integration_readiness, context);
  assertOperatorStartupPlanSafe(plan.operator_startup_plan, context);
  assertVerificationSummarySafe(plan.verification_plan_summary, context);
  assertRuntimeHandoffVerificationSummarySafe(
    plan.runtime_handoff_verification_summary,
    context
  );
  assertBoundaryPolicySafe(plan.boundary_policy, context);
  if (plan.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function buildOperatorStartupPlan(launchSequence) {
  const steps = launchSequence.map((step) => buildOperatorStartupStep(step));
  const nextStep = steps.find((step) => step.ready_to_start !== true) ?? null;
  const startupReadinessStates = steps.map((step) => step.readiness_state);
  const obsPickupStartupSummary = buildObsPickupStartupSummary(steps);
  return {
    schema: "iris_foundation_operator_startup_plan_v1",
    startup_step_count: steps.length,
    ready_to_start_count: steps.filter((step) => step.ready_to_start).length,
    attention_startup_count: steps.filter((step) => !step.ready_to_start).length,
    next_readiness_state:
      firstReadinessState(startupReadinessStates) ?? "ready",
    startup_readiness_state_counts: countReadinessStates(startupReadinessStates),
    long_running_service_count: steps.filter(
      (step) => step.startup_kind === "long_running_service"
    ).length,
    watch_worker_count: steps.filter((step) => step.startup_kind === "watch_worker").length,
    one_shot_setup_count: steps.filter((step) => step.startup_kind === "one_shot_setup").length,
    dedicated_terminal_count: steps.filter(
      (step) => step.requires_dedicated_terminal
    ).length,
    next_startup_step_id: nextStep?.process_id ?? null,
    next_startup_step_order: nextStep?.sequence_order ?? null,
    next_startup_script: nextStep?.launch_script ?? null,
    next_readiness_script: nextStep?.readiness_script ?? null,
    next_configure_env: nextStep ? nextConfigureEnvForStartupStep(nextStep) : [],
    local_bridge_required_before_dev_server: true,
    worker_required_before_obs_pickup: true,
    obs_setup_can_be_manual: true,
    obs_pickup_startup_summary: obsPickupStartupSummary,
    steps,
    boundary_policy: {
      script_names_only: true,
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_startup_plan: true,
    },
    adapter_validation_required: true,
  };
}

function buildObsPickupStartupSummary(steps) {
  const blockingSteps = steps.filter((step) => step.blocks_obs_pickup === true);
  const attentionBlockingSteps = blockingSteps.filter(
    (step) => step.ready_to_start !== true
  );
  const nextBlockingStep = attentionBlockingSteps[0] ?? null;
  const readinessStates = blockingSteps.map((step) => step.readiness_state);
  return {
    schema: "iris_foundation_obs_pickup_startup_summary_v1",
    obs_pickup_guidance_only: true,
    real_obs_operation_not_started: true,
    launch_scripts_are_names_only: true,
    env_names_only: true,
    local_bridge_required_before_obs_pickup: true,
    worker_required_before_obs_pickup: true,
    obs_setup_required_before_obs_pickup: true,
    obs_pickup_blocking_step_count: blockingSteps.length,
    ready_obs_pickup_blocking_step_count: blockingSteps.length - attentionBlockingSteps.length,
    attention_obs_pickup_blocking_step_count: attentionBlockingSteps.length,
    obs_pickup_readiness_state_counts: countReadinessStates(readinessStates),
    next_obs_pickup_readiness_state: firstReadinessState(readinessStates) ?? "ready",
    next_obs_pickup_blocking_step_id: nextBlockingStep?.process_id ?? null,
    next_obs_pickup_blocking_step_order: nextBlockingStep?.sequence_order ?? null,
    next_obs_pickup_blocking_launch_script: nextBlockingStep?.launch_script ?? null,
    next_obs_pickup_blocking_readiness_script: nextBlockingStep?.readiness_script ?? null,
    obs_pickup_startup_state:
      attentionBlockingSteps.length === 0
        ? "obs_pickup_startup_ready"
        : "obs_pickup_startup_waiting",
    boundary_policy: {
      booleans_counts_and_script_names_only: true,
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function buildOperatorStartupStep(step) {
  const metadata = STARTUP_METADATA_BY_PROCESS[step.process_id];
  return {
    schema: "iris_foundation_operator_startup_step_v1",
    sequence_order: step.sequence_order,
    process_id: step.process_id,
    purpose: step.purpose,
    startup_kind: metadata.startup_kind,
    operator_action: metadata.operator_action,
    launch_readiness_status: step.launch_readiness_status,
    readiness_state: readinessStateForLaunchStep(step),
    ready_to_start: step.launch_readiness_status === "ready",
    requires_dedicated_terminal: metadata.requires_dedicated_terminal,
    blocks_runtime_handoff: metadata.blocks_runtime_handoff,
    blocks_obs_pickup: metadata.blocks_obs_pickup,
    launch_script: step.launch_script,
    readiness_script: step.readiness_script,
    missing_required_env_count: step.missing_required_env.length,
    configure_next_env: step.configure_next_env,
    missing_required_env: step.missing_required_env,
  };
}

function buildFoundationLaunchSequence({ env, checks }) {
  const runtimeBridge = checks.get("validated_runtime_bridge_handoff");
  const ttsEngine = checks.get("real_tts_engine");
  const live2dEngine = checks.get("real_live2d_bridge");
  const obsOverlay = checks.get("production_obs_overlay");
  return [
    buildVoicevoxBridgeStep(),
    buildLive2dCueBridgeStep(),
    buildLocalAdapterBridgeStep(env, runtimeBridge),
    buildLocalBridgeWorkerStep(env, ttsEngine, live2dEngine),
    buildIrisDevServerStep(env, runtimeBridge),
    buildObsSetupStep(env, obsOverlay),
  ].map((step, index) => ({ ...step, sequence_order: index + 1 }));
}

function buildVoicevoxBridgeStep() {
  return buildStep({
    process_id: "voicevox_tts_engine_bridge",
    purpose: "tts_engine_adapter",
    launchScript: "npm run dev:voicevox:bridge",
    readinessScript: "npm run dev:voicevox:roundtrip",
    requiredEnv: [],
    configuredRequiredEnv: [],
    missingRequiredEnv: [],
    optionalEnv: [
      "IRIS_VOICEVOX_ENDPOINT",
      "IRIS_VOICEVOX_SPEAKER_ID",
      "IRIS_VOICEVOX_TIMEOUT_MS",
      "IRIS_VOICEVOX_API_KEY",
      "IRIS_LOCAL_TTS_ENGINE_VOICE_ID",
      "IRIS_LOCAL_TTS_ENGINE_MODEL",
      "IRIS_LOCAL_TTS_ENGINE_LOCALE",
      "IRIS_CHARACTER_VOICE_PROFILE_ID",
      "IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID",
      "IRIS_LICENSED_VOICE_SOURCE_STATUS",
      ...ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES,
    ],
    configureNextEnv: [
      "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
      "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
    ],
    extra: {
      helper_bridge_optional_for_fixture: true,
      configure_next_engine_env: true,
    },
  });
}

function buildLive2dCueBridgeStep() {
  return buildStep({
    process_id: "live2d_cue_engine_bridge",
    purpose: "live2d_cue_adapter",
    launchScript: "npm run dev:live2d:bridge",
    readinessScript: "npm run dev:live2d:roundtrip",
    requiredEnv: [],
    configuredRequiredEnv: [],
    missingRequiredEnv: [],
    optionalEnv: [
      "IRIS_LIVE2D_RENDERER_ENDPOINT",
      "IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT",
      "IRIS_LIVE2D_RENDERER_API_KEY",
      "IRIS_LIVE2D_CUE_BRIDGE_TIMEOUT_MS",
      "IRIS_LOCAL_LIVE2D_MODEL_ID",
      "IRIS_LOCAL_LIVE2D_SCENE_ID",
    ],
    configureNextEnv: [
      "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
      "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
    ],
    extra: {
      helper_bridge_optional_for_fixture: true,
      configure_next_engine_env: true,
    },
  });
}

function buildLocalAdapterBridgeStep(env, runtimeBridge) {
  const requiredEnv = [
    "IRIS_LOCAL_BRIDGE_OUTBOX_DIR",
    "IRIS_LOCAL_BRIDGE_ARTIFACT_DIR",
    "IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS",
    "IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS",
  ];
  const missingRequiredEnv = missingEnv(requiredEnv, env);
  return buildStep({
    process_id: "local_adapter_bridge",
    purpose: "adapter_packet_receiver",
    launchScript: "npm run dev:bridge",
    readinessScript: "npm run dev:bridge:status-roundtrip",
    requiredEnv,
    configuredRequiredEnv: configuredEnv(requiredEnv, env),
    missingRequiredEnv,
    optionalEnv: [
      "IRIS_LOCAL_BRIDGE_HOST",
      "IRIS_LOCAL_BRIDGE_PORT",
      "IRIS_SHOW_LOCAL_PATHS",
    ],
    configureNextEnv: [
      "IRIS_TTS_ENDPOINT",
      "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT",
      "IRIS_LIVE2D_ENDPOINT",
      "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT",
      "IRIS_SUBTITLE_ENDPOINT",
      "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT",
      "IRIS_GAME_CONTROL_ENDPOINT",
    ],
    statusOverride:
      missingRequiredEnv.length > 0
        ? "missing_required_env"
        : "ready",
    extra: {
      render_manifest_stale_guard_expected: true,
      render_artifact_sync_guard_expected: true,
      bridge_status_roundtrip_expected: true,
    },
  });
}

function buildLocalBridgeWorkerStep(env, ttsEngine, live2dEngine) {
  const requiredEnv = [
    "IRIS_LOCAL_BRIDGE_OUTBOX_DIR",
    "IRIS_LOCAL_BRIDGE_ARTIFACT_DIR",
    "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
    "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
    "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
    "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
  ];
  const missingRequiredEnv = missingEnv(requiredEnv, env);
  const ttsTargetPolicyStatus = targetPolicyStatus(
    ttsEngine?.engine_endpoint_scope,
    ttsEngine?.engine_endpoint_locality_ok
  );
  const live2dTargetPolicyStatus = targetPolicyStatus(
    live2dEngine?.engine_endpoint_scope,
    live2dEngine?.engine_endpoint_locality_ok
  );
  return buildStep({
    process_id: "local_bridge_worker",
    purpose: "engine_artifact_worker",
    launchScript: "npm run dev:bridge:worker -- --watch",
    readinessScript: "npm run dev:bridge:engine-roundtrip",
    requiredEnv,
    configuredRequiredEnv: configuredEnv(requiredEnv, env),
    missingRequiredEnv,
    optionalEnv: [
      "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_RETRY_BACKOFF_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_RETRY_MAX_BACKOFF_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_MAX_RETRY_ATTEMPTS",
      "IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS",
    ],
    statusOverride:
      missingRequiredEnv.length > 0
        ? "missing_required_env"
        : ttsTargetPolicyStatus === "attention" || live2dTargetPolicyStatus === "attention"
          ? "configuration_attention"
          : "ready",
    extra: {
      tts_engine_target_policy_status: ttsTargetPolicyStatus,
      live2d_engine_target_policy_status: live2dTargetPolicyStatus,
      engine_health_probe_required: true,
      event_render_manifest_expected: true,
    },
  });
}

function buildIrisDevServerStep(env, runtimeBridge) {
  const ttsEndpointEnv = env.IRIS_TTS_ENDPOINT
    ? "IRIS_TTS_ENDPOINT"
    : "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT";
  const live2dEndpointEnv = env.IRIS_LIVE2D_ENDPOINT
    ? "IRIS_LIVE2D_ENDPOINT"
    : "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT";
  const subtitleEndpointEnv = env.IRIS_SUBTITLE_ENDPOINT
    ? "IRIS_SUBTITLE_ENDPOINT"
    : "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT";
  const requiredEnv = [
    "IRIS_TTS_ADAPTER",
    ttsEndpointEnv,
    "IRIS_LIVE2D_ADAPTER",
    live2dEndpointEnv,
    "IRIS_SUBTITLE_ADAPTER",
    subtitleEndpointEnv,
    "IRIS_HTTP_ORIGIN",
  ];
  const missingRequiredEnv = [
    env.IRIS_TTS_ADAPTER === "http" ? null : "IRIS_TTS_ADAPTER",
    env.IRIS_TTS_ENDPOINT || env.IRIS_LOCAL_TTS_BRIDGE_ENDPOINT ? null : ttsEndpointEnv,
    env.IRIS_LIVE2D_ADAPTER === "http" ? null : "IRIS_LIVE2D_ADAPTER",
    env.IRIS_LIVE2D_ENDPOINT || env.IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT
      ? null
      : live2dEndpointEnv,
    env.IRIS_SUBTITLE_ADAPTER === "http" ? null : "IRIS_SUBTITLE_ADAPTER",
    env.IRIS_SUBTITLE_ENDPOINT || env.IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT
      ? null
      : subtitleEndpointEnv,
    env.IRIS_HTTP_ORIGIN ? null : "IRIS_HTTP_ORIGIN",
  ].filter(Boolean);
  const configuredRequiredEnv = requiredEnv.filter(
    (name) => !missingRequiredEnv.includes(name)
  );
  const ttsBridgeTargetPolicyStatus = targetPolicyStatus(
    runtimeBridge?.tts_bridge_endpoint_scope,
    runtimeBridge?.tts_bridge_endpoint_locality_ok
  );
  const live2dBridgeTargetPolicyStatus = targetPolicyStatus(
    runtimeBridge?.live2d_bridge_endpoint_scope,
    runtimeBridge?.live2d_bridge_endpoint_locality_ok
  );
  const subtitleBridgeTargetPolicyStatus = targetPolicyStatus(
    runtimeBridge?.subtitle_bridge_endpoint_scope,
    runtimeBridge?.subtitle_bridge_endpoint_locality_ok
  );
  const hasTargetAttention = [
    ttsBridgeTargetPolicyStatus,
    live2dBridgeTargetPolicyStatus,
    subtitleBridgeTargetPolicyStatus,
  ].includes("attention");
  return buildStep({
    process_id: "iris_dev_server",
    purpose: "runtime_http_server",
    launchScript: "npm run dev:server",
    readinessScript: "npm run dev:production:probe",
    requiredEnv,
    configuredRequiredEnv,
    missingRequiredEnv,
    optionalEnv: [
      "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
      "IRIS_ENABLE_IDLE_SCHEDULER",
    ],
    statusOverride:
      missingRequiredEnv.length > 0
        ? "missing_required_env"
        : hasTargetAttention
          ? "configuration_attention"
          : "ready",
    extra: {
      tts_bridge_target_policy_status: ttsBridgeTargetPolicyStatus,
      live2d_bridge_target_policy_status: live2dBridgeTargetPolicyStatus,
      subtitle_bridge_target_policy_status: subtitleBridgeTargetPolicyStatus,
      handoff_requires_http_adapters: true,
    },
  });
}

function buildObsSetupStep(env, obsOverlay) {
  const requiredEnv = env.IRIS_OBS_BRIDGE_ENDPOINT
    ? ["IRIS_HTTP_ORIGIN", "IRIS_OBS_BRIDGE_ENDPOINT", "IRIS_OBS_BRIDGE_HEALTH_ENDPOINT"]
    : ["IRIS_HTTP_ORIGIN"];
  const missingRequiredEnv = missingEnv(requiredEnv, env);
  const browserSourceTargetPolicyStatus = targetPolicyStatus(
    obsOverlay?.manual_browser_source_endpoint_scope,
    obsOverlay?.manual_browser_source_locality_ok
  );
  const obsSetupBridgeTargetPolicyStatus = targetPolicyStatus(
    obsOverlay?.obs_setup_bridge_endpoint_scope,
    obsOverlay?.obs_setup_bridge_endpoint_locality_ok
  );
  const obsSetupHealthTargetPolicyStatus = targetPolicyStatus(
    obsOverlay?.obs_setup_bridge_health_endpoint_scope,
    obsOverlay?.obs_setup_bridge_health_endpoint_locality_ok
  );
  const hasTargetAttention = [
    browserSourceTargetPolicyStatus,
    obsSetupBridgeTargetPolicyStatus,
    obsSetupHealthTargetPolicyStatus,
  ].includes("attention");
  return buildStep({
    process_id: "obs_browser_source_setup",
    purpose: "obs_browser_source_configuration",
    launchScript: "npm run dev:obs:browser-source",
    readinessScript: "npm run dev:obs:render-handoff-roundtrip",
    requiredEnv,
    configuredRequiredEnv: configuredEnv(requiredEnv, env),
    missingRequiredEnv,
    optionalEnv: [
      "IRIS_OBS_BRIDGE_API_KEY",
      "IRIS_OBS_BRIDGE_TIMEOUT_MS",
      "IRIS_OBS_SOURCE_NAME",
      "IRIS_OBS_SCENE_NAME",
      "IRIS_OBS_SOURCE_WIDTH",
      "IRIS_OBS_SOURCE_HEIGHT",
      "IRIS_OBS_SOURCE_FPS",
      "IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE",
      "IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE",
    ],
    statusOverride:
      missingRequiredEnv.length > 0
        ? "missing_required_env"
        : hasTargetAttention
          ? "configuration_attention"
          : "ready",
    extra: {
      browser_source_target_policy_status: browserSourceTargetPolicyStatus,
      obs_setup_bridge_target_policy_status: obsSetupBridgeTargetPolicyStatus,
      obs_setup_health_target_policy_status: obsSetupHealthTargetPolicyStatus,
      obs_setup_bridge_optional_for_manual_source: true,
      render_handoff_expected: true,
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
  configureNextEnv = [],
  statusOverride = null,
  extra = {},
}) {
  const launchReadinessStatus =
    statusOverride ?? (missingRequiredEnv.length === 0 ? "ready" : "missing_required_env");
  return {
    schema: "iris_foundation_launch_step_v1",
    sequence_order: 0,
    process_id,
    purpose,
    launch_readiness_status: launchReadinessStatus,
    readiness_state: readinessStateForStepStatus(launchReadinessStatus),
    launch_script: launchScript,
    readiness_script: readinessScript,
    required_env: requiredEnv,
    optional_env: optionalEnv,
    configure_next_env: configureNextEnv,
    configured_required_env: configuredRequiredEnv,
    missing_required_env: missingRequiredEnv,
    ...extra,
  };
}

function assertFoundationLaunchStepSafe(step, context, expectedOrder) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: invalid launch step`);
  }
  if (step.schema !== "iris_foundation_launch_step_v1") {
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
    throw new ContractError(`${context}: invalid step status`);
  }
  assertSafeReadinessState(step.readiness_state, context);
  if (step.readiness_state !== readinessStateForLaunchStep(step)) {
    throw new ContractError(`${context}: invalid step readiness state`);
  }
  assertSafeScriptName(step.launch_script, context);
  assertSafeScriptName(step.readiness_script, context);
  for (const field of [
    "required_env",
    "optional_env",
    "configure_next_env",
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
  for (const field of [
    "tts_engine_target_policy_status",
    "live2d_engine_target_policy_status",
    "tts_bridge_target_policy_status",
    "live2d_bridge_target_policy_status",
    "subtitle_bridge_target_policy_status",
    "browser_source_target_policy_status",
    "obs_setup_bridge_target_policy_status",
    "obs_setup_health_target_policy_status",
  ]) {
    if (
      step[field] !== undefined &&
      !TARGET_POLICY_STATUSES.has(step[field])
    ) {
      throw new ContractError(`${context}: invalid target policy`);
    }
  }
  for (const field of [
    "helper_bridge_optional_for_fixture",
    "configure_next_engine_env",
    "render_manifest_stale_guard_expected",
    "render_artifact_sync_guard_expected",
    "bridge_status_roundtrip_expected",
    "engine_health_probe_required",
    "event_render_manifest_expected",
    "handoff_requires_http_adapters",
    "obs_setup_bridge_optional_for_manual_source",
    "render_handoff_expected",
  ]) {
    if (step[field] !== undefined && step[field] !== true) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
}

function assertOperatorStartupPlanSafe(plan, context) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: operator startup plan is required`);
  }
  if (plan.schema !== "iris_foundation_operator_startup_plan_v1") {
    throw new ContractError(`${context}: invalid operator startup plan schema`);
  }
  if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
    throw new ContractError(`${context}: operator startup steps are required`);
  }
  plan.steps.forEach((step, index) =>
    assertOperatorStartupStepSafe(step, context, index + 1)
  );
  assertSafeReadinessState(plan.next_readiness_state, context);
  assertReadinessStateCountsSafe(
    plan.startup_readiness_state_counts,
    context
  );
  const expectedStartupReadinessStates = plan.steps.map(
    (step) => step.readiness_state
  );
  if (
    plan.next_readiness_state !==
      (firstReadinessState(expectedStartupReadinessStates) ?? "ready") ||
    !sameReadinessStateCounts(
      plan.startup_readiness_state_counts,
      countReadinessStates(expectedStartupReadinessStates)
    )
  ) {
    throw new ContractError(`${context}: invalid startup readiness summary`);
  }
  for (const field of [
    "startup_step_count",
    "ready_to_start_count",
    "attention_startup_count",
    "long_running_service_count",
    "watch_worker_count",
    "one_shot_setup_count",
    "dedicated_terminal_count",
  ]) {
    if (!Number.isInteger(plan[field]) || plan[field] < 0) {
      throw new ContractError(`${context}: invalid operator startup ${field}`);
    }
  }
  if (plan.startup_step_count !== plan.steps.length) {
    throw new ContractError(`${context}: invalid operator startup step count`);
  }
  if (
    plan.ready_to_start_count + plan.attention_startup_count !==
    plan.startup_step_count
  ) {
    throw new ContractError(`${context}: invalid operator startup readiness counts`);
  }
  if (
    plan.long_running_service_count +
      plan.watch_worker_count +
      plan.one_shot_setup_count !==
    plan.startup_step_count
  ) {
    throw new ContractError(`${context}: invalid operator startup kind counts`);
  }
  if (
    plan.dedicated_terminal_count !==
    plan.steps.filter((step) => step.requires_dedicated_terminal).length
  ) {
    throw new ContractError(`${context}: invalid dedicated terminal count`);
  }
  const firstAttentionStep =
    plan.steps.find((step) => step.ready_to_start !== true) ?? null;
  if (!firstAttentionStep) {
    if (
      plan.next_startup_step_id !== null ||
      plan.next_startup_step_order !== null ||
      plan.next_startup_script !== null ||
      plan.next_readiness_script !== null ||
      !Array.isArray(plan.next_configure_env) ||
      plan.next_configure_env.length !== 0
    ) {
      throw new ContractError(`${context}: unexpected operator startup next step`);
    }
  } else {
    if (
      plan.next_startup_step_id !== firstAttentionStep.process_id ||
      plan.next_startup_step_order !== firstAttentionStep.sequence_order ||
      plan.next_startup_script !== firstAttentionStep.launch_script ||
      plan.next_readiness_script !== firstAttentionStep.readiness_script ||
      JSON.stringify(plan.next_configure_env) !==
        JSON.stringify(nextConfigureEnvForStartupStep(firstAttentionStep))
    ) {
      throw new ContractError(`${context}: invalid operator startup next step`);
    }
  }
  if (plan.next_startup_script !== null) {
    assertSafeScriptName(plan.next_startup_script, context);
  }
  if (plan.next_readiness_script !== null) {
    assertSafeScriptName(plan.next_readiness_script, context);
  }
  assertEnvNameListSafe(plan.next_configure_env, `${context}: startup next configure env`);
  for (const field of [
    "local_bridge_required_before_dev_server",
    "worker_required_before_obs_pickup",
    "obs_setup_can_be_manual",
  ]) {
    if (plan[field] !== true) {
      throw new ContractError(`${context}: invalid operator startup policy`);
    }
  }
  assertObsPickupStartupSummarySafe(
    plan.obs_pickup_startup_summary,
    plan,
    context
  );
  assertExactBoundaryPolicy(
    plan.boundary_policy,
    [
      "script_names_only",
      "env_names_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "read_only_startup_plan",
    ],
    `${context}: boundary policy`
  );
  if (plan.adapter_validation_required !== true) {
    throw new ContractError(`${context}: operator startup adapter validation required`);
  }
}

function assertObsPickupStartupSummarySafe(summary, plan, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: OBS pickup startup summary is required`);
  }
  if (summary.schema !== "iris_foundation_obs_pickup_startup_summary_v1") {
    throw new ContractError(`${context}: invalid OBS pickup startup summary schema`);
  }
  for (const field of [
    "obs_pickup_guidance_only",
    "real_obs_operation_not_started",
    "launch_scripts_are_names_only",
    "env_names_only",
    "local_bridge_required_before_obs_pickup",
    "worker_required_before_obs_pickup",
    "obs_setup_required_before_obs_pickup",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid OBS pickup startup flag`);
    }
  }
  const blockingSteps = plan.steps.filter((step) => step.blocks_obs_pickup === true);
  const attentionBlockingSteps = blockingSteps.filter(
    (step) => step.ready_to_start !== true
  );
  const nextBlockingStep = attentionBlockingSteps[0] ?? null;
  const readinessStates = blockingSteps.map((step) => step.readiness_state);
  const expected = {
    obs_pickup_blocking_step_count: blockingSteps.length,
    ready_obs_pickup_blocking_step_count:
      blockingSteps.length - attentionBlockingSteps.length,
    attention_obs_pickup_blocking_step_count: attentionBlockingSteps.length,
    next_obs_pickup_readiness_state: firstReadinessState(readinessStates) ?? "ready",
    next_obs_pickup_blocking_step_id: nextBlockingStep?.process_id ?? null,
    next_obs_pickup_blocking_step_order: nextBlockingStep?.sequence_order ?? null,
    next_obs_pickup_blocking_launch_script: nextBlockingStep?.launch_script ?? null,
    next_obs_pickup_blocking_readiness_script: nextBlockingStep?.readiness_script ?? null,
    obs_pickup_startup_state:
      attentionBlockingSteps.length === 0
        ? "obs_pickup_startup_ready"
        : "obs_pickup_startup_waiting",
  };
  for (const [field, value] of Object.entries(expected)) {
    if (summary[field] !== value) {
      throw new ContractError(`${context}: invalid OBS pickup startup summary`);
    }
  }
  for (const field of [
    "obs_pickup_blocking_step_count",
    "ready_obs_pickup_blocking_step_count",
    "attention_obs_pickup_blocking_step_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid OBS pickup startup count`);
    }
  }
  assertReadinessStateCountsSafe(
    summary.obs_pickup_readiness_state_counts,
    context
  );
  if (
    !sameReadinessStateCounts(
      summary.obs_pickup_readiness_state_counts,
      countReadinessStates(readinessStates)
    )
  ) {
    throw new ContractError(`${context}: invalid OBS pickup readiness counts`);
  }
  assertSafeReadinessState(summary.next_obs_pickup_readiness_state, context);
  if (summary.next_obs_pickup_blocking_launch_script !== null) {
    assertSafeScriptName(summary.next_obs_pickup_blocking_launch_script, context);
  }
  if (summary.next_obs_pickup_blocking_readiness_script !== null) {
    assertSafeScriptName(
      summary.next_obs_pickup_blocking_readiness_script,
      context
    );
  }
  assertExactBoundaryPolicy(
    summary.boundary_policy,
    OBS_PICKUP_STARTUP_BOUNDARY_FIELDS,
    `${context} OBS pickup startup boundary policy`
  );
}

function assertExactBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid boundary field ${field}`);
    }
  }
}

function assertOperatorStartupStepSafe(step, context, expectedOrder) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: invalid operator startup step`);
  }
  if (step.schema !== "iris_foundation_operator_startup_step_v1") {
    throw new ContractError(`${context}: invalid operator startup step schema`);
  }
  if (step.sequence_order !== expectedOrder) {
    throw new ContractError(`${context}: invalid operator startup order`);
  }
  if (!PROCESS_IDS.has(step.process_id)) {
    throw new ContractError(`${context}: invalid operator startup process`);
  }
  if (!PURPOSES.has(step.purpose)) {
    throw new ContractError(`${context}: invalid operator startup purpose`);
  }
  if (!STARTUP_KINDS.has(step.startup_kind)) {
    throw new ContractError(`${context}: invalid operator startup kind`);
  }
  if (!OPERATOR_ACTIONS.has(step.operator_action)) {
    throw new ContractError(`${context}: invalid operator startup action`);
  }
  if (!STEP_STATUSES.has(step.launch_readiness_status)) {
    throw new ContractError(`${context}: invalid operator startup readiness`);
  }
  assertSafeReadinessState(step.readiness_state, context);
  if (step.readiness_state !== readinessStateForLaunchStep(step)) {
    throw new ContractError(`${context}: invalid operator startup readiness state`);
  }
  if (typeof step.ready_to_start !== "boolean") {
    throw new ContractError(`${context}: invalid operator startup ready flag`);
  }
  if (step.ready_to_start !== (step.launch_readiness_status === "ready")) {
    throw new ContractError(`${context}: inconsistent operator startup ready flag`);
  }
  for (const field of [
    "requires_dedicated_terminal",
    "blocks_runtime_handoff",
    "blocks_obs_pickup",
  ]) {
    if (typeof step[field] !== "boolean") {
      throw new ContractError(`${context}: invalid operator startup ${field}`);
    }
  }
  assertSafeScriptName(step.launch_script, context);
  assertSafeScriptName(step.readiness_script, context);
  if (
    !Number.isInteger(step.missing_required_env_count) ||
    step.missing_required_env_count < 0
  ) {
    throw new ContractError(`${context}: invalid operator startup missing env count`);
  }
  assertEnvNameListSafe(step.configure_next_env, `${context}: startup configure env`);
  assertEnvNameListSafe(step.missing_required_env, `${context}: startup missing env`);
  if (step.missing_required_env_count !== step.missing_required_env.length) {
    throw new ContractError(`${context}: invalid operator startup missing env summary`);
  }
}

function assertFoundationStageSummarySafe(stage, context) {
  if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
    throw new ContractError(`${context}: stage summary is required`);
  }
  if (stage.schema !== "iris_foundation_launch_stage_summary_v1") {
    throw new ContractError(`${context}: invalid stage schema`);
  }
  if (stage.stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid stage id`);
  }
  if (!["ready", "attention"].includes(stage.stage_status)) {
    throw new ContractError(`${context}: invalid stage status`);
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

function assertFoundationIntegrationReadinessListSafe(readiness, context) {
  if (!Array.isArray(readiness) || readiness.length === 0) {
    throw new ContractError(`${context}: integration readiness is required`);
  }
  const seen = new Set();
  for (const item of readiness) {
    assertFoundationIntegrationReadinessSafe(item, context);
    seen.add(item.integration);
  }
  for (const integration of FOUNDATION_INTEGRATIONS) {
    if (!seen.has(integration)) {
      throw new ContractError(`${context}: missing integration`);
    }
  }
}

function assertFoundationIntegrationReadinessSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: invalid integration readiness`);
  }
  if (item.schema !== "iris_foundation_launch_integration_readiness_v1") {
    throw new ContractError(`${context}: invalid integration readiness schema`);
  }
  if (!FOUNDATION_INTEGRATIONS.has(item.integration)) {
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

function readinessStateForLaunchStep(step) {
  return readinessStateForStepStatus(step.launch_readiness_status);
}

function readinessStateForStepStatus(status) {
  if (status === "ready") return "ready";
  if (status === "missing_required_env") return "configuration_waiting";
  return "operator_review_required";
}

function readinessStateForIntegration(integration) {
  if (integration.status === "ready") return "ready";
  if (integration.integration === "validated_runtime_bridge_handoff") {
    return "configuration_waiting";
  }
  if (
    integration.integration === "real_tts_engine" ||
    integration.integration === "real_live2d_bridge" ||
    integration.integration === "production_obs_overlay"
  ) {
    return "real_device_waiting";
  }
  return "operator_review_required";
}

function firstReadinessState(states) {
  return states.find((state) => state !== "ready") ?? null;
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
    throw new ContractError(`${context}: readiness state counts are required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness state count`);
    }
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: invalid readiness state count key`);
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
  if (summary.schema !== "iris_foundation_launch_verification_summary_v1") {
    throw new ContractError(`${context}: invalid verification schema`);
  }
  if (summary.stage_id !== "tts_live2d_obs_foundation") {
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
  assertSafeScriptName(summary.bridge_engine_fixture_script, context);
  assertSafeScriptName(summary.engine_probe_script, context);
  assertSafeScriptName(summary.foundation_readiness_rehearsal_script, context);
  assertSafeScriptName(summary.foundation_policy_gate_roundtrip_script, context);
  assertSafeScriptName(summary.obs_render_handoff_script, context);
  assertSafeScriptName(summary.obs_runtime_render_roundtrip_script, context);
  assertSafeScriptName(summary.obs_setup_script, context);
}

function assertRuntimeHandoffVerificationSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: runtime handoff verification summary is required`);
  }
  if (summary.schema !== "iris_foundation_launch_runtime_handoff_verification_v1") {
    throw new ContractError(`${context}: invalid runtime handoff verification schema`);
  }
  if (summary.stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid runtime handoff verification stage`);
  }
  for (const field of RUNTIME_HANDOFF_VERIFICATION_SCRIPT_FIELDS) {
    assertSafeScriptName(summary[field], context);
  }
  if (summary.script_count !== RUNTIME_HANDOFF_VERIFICATION_SCRIPT_FIELDS.length) {
    throw new ContractError(`${context}: invalid runtime handoff script count`);
  }
  if (summary.foundation_status_expected !== "ready_for_runtime_handoff") {
    throw new ContractError(`${context}: invalid foundation status expectation`);
  }
  if (summary.foundation_runtime_status_expected !== "ready_for_obs_runtime_handoff") {
    throw new ContractError(`${context}: invalid foundation runtime status expectation`);
  }
  if (summary.foundation_live_readiness_expected !== "ready_for_live_obs_operation") {
    throw new ContractError(`${context}: invalid foundation live readiness expectation`);
  }
  if (summary.obs_runtime_roundtrip_expected !== "ready_for_obs_runtime_handoff") {
    throw new ContractError(`${context}: invalid OBS runtime roundtrip expectation`);
  }
  for (const field of [
    "local_bridge_worker_runtime_summary_required",
    "real_engine_handoff_summary_required",
    "obs_browser_source_runtime_summary_required",
    "render_manifest_handoff_summary_required",
    "configured_production_probe_required",
    "engine_health_probe_pass_required",
    "obs_bridge_health_probe_pass_required_when_configured",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertBoundaryPolicySafe(summary.boundary_policy, context);
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
    "no_payloads",
    "no_candidates",
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

function configuredEnv(requiredEnv, env) {
  return requiredEnv.filter((name) => Boolean(env[name]));
}

function missingEnv(requiredEnv, env) {
  return requiredEnv.filter((name) => !Boolean(env[name]));
}

function targetPolicyStatus(scope, localityOk) {
  if (scope === "not_configured" || scope === undefined) return "not_applicable";
  return localityOk === true ? "allowed" : "attention";
}

function nextConfigureEnv(step) {
  if (!step) return [];
  const candidates =
    step.missing_required_env.length > 0
      ? step.missing_required_env
      : step.configure_next_env.length > 0
        ? step.configure_next_env
        : step.required_env;
  return uniqueEnvNames(candidates);
}

function nextConfigureEnvForStartupStep(step) {
  if (!step) return [];
  const candidates =
    step.missing_required_env.length > 0
      ? step.missing_required_env
      : step.configure_next_env.length > 0
        ? step.configure_next_env
        : [];
  return uniqueEnvNames(candidates);
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

function uniqueEnvNames(names) {
  return [...new Set(names)].filter((name) => /^IRIS_[A-Z0-9_]+$/.test(name));
}

function assertNoForbiddenFoundationLaunchPlanFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFoundationLaunchPlanFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FOUNDATION_LAUNCH_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe launch plan field`, { field, path });
    }
    assertNoForbiddenFoundationLaunchPlanFields(child, context, `${path}.${field}`);
  }
}
