import { ContractError } from "../../core/contracts.js";
import {
  assertProductionConfigDoctorSafe,
  createProductionConfigDoctor,
} from "./productionConfigDoctor.js";

const FORBIDDEN_RUNBOOK_FIELDS = new Set([
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
]);
const RUNBOOK_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "runbook_only",
  "real_processes_not_started_by_runbook",
  "real_obs_live2d_voicevox_not_operated",
  "live_polling_not_started_by_runbook",
  "real_game_or_os_input_not_started",
  "launch_steps_are_operator_guidance_only",
  "verification_scripts_are_names_only",
  "runtime_packets_remain_adapter_gated",
  "memory_and_relationship_candidates_remain_gated",
  "input_action_candidates_never_forwarded_directly",
  "stage_count",
  "ready_stage_count",
  "attention_stage_count",
  "operator_launch_step_count",
  "next_stage_id",
  "next_readiness_state",
  "readiness_state_counts",
  "next_verification_script",
  "next_launch_script",
  "next_readiness_script",
]);

const STAGE_DEFINITIONS = [
  {
    stage_id: "tts_live2d_obs_foundation",
    priority: 1,
    integration_keys: [
      "validated_runtime_bridge_handoff",
      "real_tts_engine",
      "real_live2d_bridge",
      "production_obs_overlay",
    ],
    verification_scripts: [
      "npm run dev:bridge:engine-roundtrip",
      "npm run dev:bridge:artifact-roundtrip",
      "npm run dev:bridge:error-roundtrip",
      "npm run dev:bridge:outbox-corrupt-roundtrip",
      "npm run dev:bridge:render-manifest",
      "npm run dev:bridge:status-roundtrip",
      "npm run dev:foundation:status",
      "npm run dev:foundation:startup-checklist",
      "npm run dev:foundation:env-setup-plan",
      "npm run dev:foundation:local-env-profile",
      "npm run dev:foundation:local-env-roundtrip",
      "npm run dev:foundation:local-env-apply",
      "npm run dev:foundation:local-env-rehearsal",
      "npm run dev:foundation:connector-handoff",
      "npm run dev:foundation:runtime-summary",
      "npm run dev:foundation:runtime-status",
      "npm run dev:foundation:live-readiness",
      "npm run dev:foundation:readiness-rehearsal",
      "npm run dev:foundation:blocked-worker-roundtrip",
      "npm run dev:foundation:policy-gate-roundtrip",
      "npm run dev:production:live-readiness",
      "npm run dev:production:runtime-handoff-status",
      "npm run dev:live2d:roundtrip",
      "npm run dev:live2d:unsafe-roundtrip",
      "npm run dev:production:probe",
      "npm run dev:engine:probe",
      "npm run dev:engine:invalid-audio-roundtrip",
      "npm run dev:engine:invalid-json-roundtrip",
      "npm run dev:engine:invalid-live2d-roundtrip",
      "npm run dev:engine:unsafe-roundtrip",
      "npm run dev:obs:probe",
      "npm run dev:obs:browser-source",
      "npm run dev:obs:invalid-artifact-roundtrip",
      "npm run dev:obs:render-handoff-roundtrip",
      "npm run dev:obs:runtime-render-roundtrip",
      "npm run dev:obs:stale-artifact-roundtrip",
      "npm run dev:obs:roundtrip",
      "npm run dev:obs:failure-roundtrip",
      "npm run dev:obs:setup",
      "npm run dev:obs:unsafe-roundtrip",
      "npm run dev:voicevox:roundtrip",
      "npm run dev:voicevox:unsafe-roundtrip",
    ],
  },
  {
    stage_id: "youtube_comments_and_support",
    priority: 2,
    integration_keys: ["youtube_live_chat_api", "media_and_external_topic_ingestion"],
    verification_scripts: [
      "npm run dev:youtube:direct-live-chat-roundtrip",
      "npm run dev:youtube:cursor-backup-roundtrip",
      "npm run dev:youtube:cursor-roundtrip",
      "npm run dev:youtube:failure-roundtrip",
      "npm run dev:youtube:http-ingest-roundtrip",
      "npm run dev:youtube:runtime-ingest-roundtrip",
      "npm run dev:youtube:policy-gate-roundtrip",
      "npm run dev:youtube:support-gate-roundtrip",
      "npm run dev:youtube:roundtrip",
      "npm run dev:youtube:relay-bridge",
      "npm run dev:youtube:relay-readiness-rehearsal",
      "npm run dev:youtube:relay-startup-checklist",
      "npm run dev:youtube:relay-roundtrip",
      "npm run dev:youtube:relay-status-roundtrip",
      "npm run dev:youtube:local-env-profile",
      "npm run dev:youtube:local-env-apply",
      "npm run dev:youtube:env-setup-plan",
      "npm run dev:youtube:source-status",
      "npm run dev:youtube:runtime-status",
      "npm run dev:youtube:live-readiness",
      "npm run dev:youtube:readiness-rehearsal",
      "npm run dev:youtube:ingest-once",
      "npm run dev:youtube:status-roundtrip",
      "npm run dev:ingest:http",
      "npm test",
    ],
  },
  {
    stage_id: "memory_and_relationship_persistence",
    priority: 3,
    integration_keys: [
      "memory_and_relationship_persistence",
      "admin_review_private_runner_gate",
      "production_vector_memory",
    ],
    verification_scripts: [
      "npm run dev:admin:review-auth-gate",
      "npm run dev:admin:review-validator-run-plan",
      "npm run dev:persistence:backup-roundtrip",
      "npm run dev:persistence:candidate-gate-roundtrip",
      "npm run dev:persistence:failure-roundtrip",
      "npm run dev:persistence:http-roundtrip",
      "npm run dev:persistence:postgres-admin-save-preflight",
      "npm run dev:operator-policy:async-save-gate-roundtrip",
      "npm run dev:persistence:local-env-profile",
      "npm run dev:persistence:local-env-apply",
      "npm run dev:persistence:env-setup-plan",
      "npm run dev:persistence:startup-checklist",
      "npm run dev:persistence:policy-gate-roundtrip",
      "npm run dev:persistence:restart-roundtrip",
      "npm run dev:persistence:roundtrip",
      "npm run dev:persistence:runtime-status",
      "npm run dev:persistence:live-readiness",
      "npm run dev:persistence:readiness-rehearsal",
      "npm run dev:persistence:status-roundtrip",
      "npm run dev:memory-vector:bridge",
      "npm run dev:memory-vector:roundtrip",
    ],
  },
  {
    stage_id: "vision_and_safe_game_control",
    priority: 4,
    integration_keys: [
      "real_screen_capture_or_vision_ingestion",
      "approved_game_control_adapter",
    ],
    verification_scripts: [
      "npm run dev:gameplay:local-env-profile",
      "npm run dev:gameplay:local-env-apply",
      "npm run dev:gameplay:env-setup-plan",
      "npm run dev:gameplay:startup-checklist",
      "npm run dev:gameplay:runtime-status",
      "npm run dev:gameplay:live-readiness",
      "npm run dev:gameplay:readiness-rehearsal",
      "npm run dev:gameplay:runtime-roundtrip",
      "npm run dev:gameplay:policy-gate-roundtrip",
      "npm run dev:gameplay:validation-gate-roundtrip",
      "npm run dev:vision:game-roundtrip",
      "npm run dev:vision:unsafe-roundtrip",
      "npm run dev:game-control:roundtrip",
      "npm run dev:game-control:failure-roundtrip",
      "npm run dev:game-control:unsafe-roundtrip",
      "npm run dev:production-loop:roundtrip",
    ],
  },
];
const STAGE_IDS = new Set(STAGE_DEFINITIONS.map((stage) => stage.stage_id));
const STAGE_DEFINITIONS_BY_ID = new Map(
  STAGE_DEFINITIONS.map((stage) => [stage.stage_id, stage])
);
const STAGE_IDS_BY_PRIORITY = new Map(
  STAGE_DEFINITIONS.map((stage) => [stage.priority, stage.stage_id])
);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const SAFE_NPM_DEV_SCRIPT_PATTERN =
  /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i;
const FOUNDATION_LAUNCH_SEQUENCE = [
  {
    process_id: "voicevox_tts_engine_bridge",
    launch_script: "npm run dev:voicevox:bridge",
    readiness_script: "npm run dev:voicevox:roundtrip",
    purpose: "tts_engine_adapter",
    required_env: [],
    optional_env: [
      "IRIS_VOICEVOX_ENDPOINT",
      "IRIS_VOICEVOX_SPEAKER_ID",
      "IRIS_VOICEVOX_TIMEOUT_MS",
      "IRIS_VOICEVOX_API_KEY",
    ],
    configure_next_env: [
      "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
      "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
    ],
  },
  {
    process_id: "live2d_cue_engine_bridge",
    launch_script: "npm run dev:live2d:bridge",
    readiness_script: "npm run dev:live2d:roundtrip",
    purpose: "live2d_cue_adapter",
    required_env: [],
    optional_env: [
      "IRIS_LIVE2D_RENDERER_ENDPOINT",
      "IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT",
      "IRIS_LIVE2D_RENDERER_API_KEY",
      "IRIS_LIVE2D_CUE_BRIDGE_TIMEOUT_MS",
      "IRIS_LOCAL_LIVE2D_MODEL_ID",
      "IRIS_LOCAL_LIVE2D_SCENE_ID",
    ],
    configure_next_env: [
      "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
      "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
    ],
  },
  {
    process_id: "local_adapter_bridge",
    launch_script: "npm run dev:bridge",
    readiness_script: "npm run dev:bridge:status-roundtrip",
    purpose: "adapter_packet_receiver",
    required_env: [
      "IRIS_LOCAL_BRIDGE_OUTBOX_DIR",
      "IRIS_LOCAL_BRIDGE_ARTIFACT_DIR",
      "IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS",
      "IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS",
    ],
    optional_env: [],
    configure_next_env: [
      "IRIS_TTS_ENDPOINT",
      "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT",
      "IRIS_LIVE2D_ENDPOINT",
      "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT",
      "IRIS_SUBTITLE_ENDPOINT",
      "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT",
      "IRIS_GAME_CONTROL_ENDPOINT",
    ],
  },
  {
    process_id: "local_bridge_worker",
    launch_script: "npm run dev:bridge:worker -- --watch",
    readiness_script: "npm run dev:bridge:engine-roundtrip",
    purpose: "engine_artifact_worker",
    required_env: [
      "IRIS_LOCAL_BRIDGE_OUTBOX_DIR",
      "IRIS_LOCAL_BRIDGE_ARTIFACT_DIR",
      "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
      "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
      "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
      "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
    ],
    optional_env: [
      "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_RETRY_BACKOFF_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_RETRY_MAX_BACKOFF_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_MAX_RETRY_ATTEMPTS",
      "IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS",
    ],
    configure_next_env: [],
  },
  {
    process_id: "iris_dev_server",
    launch_script: "npm run dev:server",
    readiness_script: "npm run dev:production:probe",
    purpose: "runtime_http_server",
    required_env: [
      "IRIS_TTS_ADAPTER",
      "IRIS_TTS_ENDPOINT",
      "IRIS_LIVE2D_ADAPTER",
      "IRIS_LIVE2D_ENDPOINT",
      "IRIS_SUBTITLE_ADAPTER",
      "IRIS_SUBTITLE_ENDPOINT",
      "IRIS_HTTP_ORIGIN",
    ],
    optional_env: [
      "IRIS_TTS_ENDPOINT",
      "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT",
      "IRIS_LIVE2D_ENDPOINT",
      "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT",
      "IRIS_SUBTITLE_ENDPOINT",
      "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT",
      "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
      "IRIS_ENABLE_IDLE_SCHEDULER",
    ],
    configure_next_env: [],
  },
  {
    process_id: "obs_browser_source_setup",
    launch_script: "npm run dev:obs:browser-source",
    readiness_script: "npm run dev:obs:render-handoff-roundtrip",
    purpose: "obs_browser_source_configuration",
    required_env: ["IRIS_HTTP_ORIGIN"],
    optional_env: [
      "IRIS_OBS_SOURCE_NAME",
      "IRIS_OBS_SCENE_NAME",
      "IRIS_OBS_SOURCE_WIDTH",
      "IRIS_OBS_SOURCE_HEIGHT",
      "IRIS_OBS_SOURCE_FPS",
    ],
    configure_next_env: [],
  },
];
const FOUNDATION_LAUNCH_PROCESS_IDS = new Set(
  FOUNDATION_LAUNCH_SEQUENCE.map((item) => item.process_id)
);
const FOUNDATION_LAUNCH_PURPOSES = new Set(
  FOUNDATION_LAUNCH_SEQUENCE.map((item) => item.purpose)
);
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

export function createProductionReadinessRunbook({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const doctor = createProductionConfigDoctor({ env, generatedAtMs });
  assertProductionConfigDoctorSafe(doctor, "Production runbook doctor input");
  const checksByIntegration = new Map(
    doctor.checks.map((check) => [check.integration, check])
  );
  const stages = STAGE_DEFINITIONS.map((definition) =>
    buildStage(definition, checksByIntegration)
  );
  const nextStage = stages.find((stage) => stage.status !== "ready") ?? null;
  const nextReadinessState = nextStage?.readiness_state ?? "ready";
  const readinessStateCounts = countReadinessStates(stages);
  const verificationPlan = buildVerificationPlan(stages);
  const operatorLaunchPlan = buildOperatorLaunchPlan(stages);
  const runbook = {
    schema: "iris_production_readiness_runbook_v1",
    generated_at_ms: generatedAtMs,
    readiness_status: stages.every((stage) => stage.status === "ready")
      ? "ready_for_configured_production_probe"
      : "attention_required",
    stages,
    next_stage: nextStage?.stage_id ?? null,
    next_readiness_state: nextReadinessState,
    readiness_state_counts: readinessStateCounts,
    verification_plan: verificationPlan,
    operator_launch_plan: operatorLaunchPlan,
    production_handoff_summary: {
      schema: "iris_production_readiness_runbook_handoff_summary_v1",
      runbook_only: true,
      real_processes_not_started_by_runbook: true,
      real_obs_live2d_voicevox_not_operated: true,
      live_polling_not_started_by_runbook: true,
      real_game_or_os_input_not_started: true,
      launch_steps_are_operator_guidance_only: true,
      verification_scripts_are_names_only: true,
      runtime_packets_remain_adapter_gated: true,
      memory_and_relationship_candidates_remain_gated: true,
      input_action_candidates_never_forwarded_directly: true,
      stage_count: stages.length,
      ready_stage_count: stages.filter((stage) => stage.status === "ready").length,
      attention_stage_count: stages.filter((stage) => stage.status === "attention").length,
      operator_launch_step_count: operatorLaunchPlan.launch_sequence.length,
      next_stage_id: nextStage?.stage_id ?? null,
      next_readiness_state: nextReadinessState,
      readiness_state_counts: readinessStateCounts,
      next_verification_script:
        verificationPlan.next_stage_verification_scripts[0] ?? null,
      next_launch_script: operatorLaunchPlan.next_launch_script,
      next_readiness_script: operatorLaunchPlan.next_readiness_script,
    },
    summary: {
      stage_count: stages.length,
      ready_stage_count: stages.filter((stage) => stage.status === "ready").length,
      attention_stage_count: stages.filter((stage) => stage.status === "attention").length,
      check_count: doctor.summary.total,
      ready_check_count: doctor.summary.ready,
      attention_check_count: doctor.summary.attention,
    },
    boundary_policy: {
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_runbook: true,
    },
    adapter_validation_required: true,
  };
  assertProductionReadinessRunbookSafe(runbook);
  return runbook;
}

function buildOperatorLaunchPlan(stages) {
  const foundationStage = stages.find((stage) => stage.stage_id === "tts_live2d_obs_foundation");
  if (!foundationStage) {
    throw new ContractError("production runbook: foundation stage is required");
  }
  const configuredEnv = new Set(foundationStage.configured_env);
  const missingEnv = new Set(foundationStage.missing_required_env);
  const ttsEndpointEnv = configuredEnv.has("IRIS_TTS_ENDPOINT")
    ? "IRIS_TTS_ENDPOINT"
    : "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT";
  const live2dEndpointEnv = configuredEnv.has("IRIS_LIVE2D_ENDPOINT")
    ? "IRIS_LIVE2D_ENDPOINT"
    : "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT";
  const subtitleEndpointEnv = configuredEnv.has("IRIS_SUBTITLE_ENDPOINT")
    ? "IRIS_SUBTITLE_ENDPOINT"
    : "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT";
  const launchSequence = FOUNDATION_LAUNCH_SEQUENCE.map((item, index) => {
    const requiredEnv = item.process_id === "iris_dev_server"
      ? item.required_env.map((name) => {
          if (name === "IRIS_TTS_ENDPOINT") return ttsEndpointEnv;
          if (name === "IRIS_LIVE2D_ENDPOINT") return live2dEndpointEnv;
          if (name === "IRIS_SUBTITLE_ENDPOINT") return subtitleEndpointEnv;
          return name;
        })
      : item.required_env;
    const configuredRequiredEnv = requiredEnv.filter((name) => configuredEnv.has(name));
    const missingRequiredEnv = requiredEnv.filter((name) => missingEnv.has(name));
    return {
      schema: "iris_operator_launch_step_v1",
      sequence_order: index + 1,
      process_id: item.process_id,
      purpose: item.purpose,
      launch_readiness_status:
        missingRequiredEnv.length === 0 ? "ready" : "missing_required_env",
      launch_script: item.launch_script,
      readiness_script: item.readiness_script,
      required_env: requiredEnv,
      optional_env: item.optional_env,
      configure_next_env: item.configure_next_env,
      configured_required_env: configuredRequiredEnv,
      missing_required_env: missingRequiredEnv,
    };
  });
  const readyStepCount = launchSequence.filter(
    (step) => step.launch_readiness_status === "ready"
  ).length;
  const attentionStepCount = launchSequence.length - readyStepCount;
  const nextStep = launchSequence.find(
    (step) => step.launch_readiness_status !== "ready"
  ) ?? null;
  return {
    schema: "iris_operator_launch_plan_v1",
    plan_status:
      foundationStage.status === "ready"
        ? "ready_to_launch_foundation"
        : "configure_foundation_env_first",
    target_stage_id: "tts_live2d_obs_foundation",
    target_stage_priority: 1,
    launch_sequence: launchSequence,
    ready_step_count: readyStepCount,
    attention_step_count: attentionStepCount,
    next_step_id: nextStep?.process_id ?? null,
    next_step_order: nextStep?.sequence_order ?? null,
    next_launch_script: nextStep?.launch_script ?? null,
    next_readiness_script: nextStep?.readiness_script ?? null,
    next_configure_env: nextStep ? nextConfigureEnv(nextStep) : [],
    missing_required_env_count: foundationStage.missing_required_env.length,
    operator_startup_plan: buildOperatorStartupPlan(launchSequence),
    boundary_policy: {
      safe_local_commands_only: true,
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      read_only_plan: true,
    },
    adapter_validation_required: true,
  };
}

function buildVerificationPlan(stages) {
  const nextStage = stages.find((stage) => stage.status !== "ready") ?? null;
  return {
    schema: "iris_production_verification_plan_v1",
    plan_status: nextStage ? "start_next_attention_stage" : "all_stages_ready",
    next_stage_id: nextStage?.stage_id ?? null,
    next_stage_priority: nextStage?.priority ?? null,
    next_stage_verification_scripts: nextStage?.verification_scripts ?? [],
    stage_summaries: stages.map((stage) => ({
      stage_id: stage.stage_id,
      priority: stage.priority,
      status: stage.status,
      readiness_state: stage.readiness_state,
      verification_script_count: stage.verification_scripts.length,
      first_verification_script: stage.verification_scripts[0] ?? null,
      missing_required_env_count: stage.missing_required_env.length,
    })),
    total_verification_script_count: stages.reduce(
      (sum, stage) => sum + stage.verification_scripts.length,
      0
    ),
    boundary_policy: {
      script_names_only: true,
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      read_only_plan: true,
    },
    adapter_validation_required: true,
  };
}

export function assertProductionReadinessRunbookSafe(
  runbook,
  context = "production readiness runbook"
) {
  if (!runbook || typeof runbook !== "object") {
    throw new ContractError(`${context}: missing runbook`);
  }
  assertNoForbiddenRunbookFields(runbook, context);
  if (runbook.schema !== "iris_production_readiness_runbook_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: runbook.schema });
  }
  if (!["ready_for_configured_production_probe", "attention_required"].includes(runbook.readiness_status)) {
    throw new ContractError(`${context}: invalid readiness status`, {
      readiness_status: runbook.readiness_status,
    });
  }
  if (!Array.isArray(runbook.stages) || runbook.stages.length === 0) {
    throw new ContractError(`${context}: stages are required`);
  }
  assertSafeReadinessState(runbook.next_readiness_state, context);
  assertReadinessStateCountsSafe(runbook.readiness_state_counts, context);
  if (
    !sameReadinessStateCounts(
      runbook.readiness_state_counts,
      countReadinessStates(runbook.stages)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  const firstAttentionStage =
    runbook.stages.find((stage) => stage.status !== "ready") ?? null;
  const expectedReadinessStatus = firstAttentionStage
    ? "attention_required"
    : "ready_for_configured_production_probe";
  if (
    runbook.readiness_status !== expectedReadinessStatus ||
    runbook.next_stage !== (firstAttentionStage?.stage_id ?? null) ||
    runbook.next_readiness_state !== (firstAttentionStage?.readiness_state ?? "ready")
  ) {
    throw new ContractError(`${context}: invalid derived readiness summary`);
  }
  assertVerificationPlanSafe(runbook.verification_plan, context);
  assertOperatorLaunchPlanSafe(runbook.operator_launch_plan, context);
  assertRunbookHandoffSummarySafe(
    runbook.production_handoff_summary,
    runbook,
    context
  );
  assertBoundaryPolicy(runbook.boundary_policy, [
    "env_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_candidates",
    "no_commands",
    "read_only_runbook",
  ], `${context}: boundary policy`);
  if (
    runbook.summary?.stage_count !== runbook.stages.length ||
    runbook.summary?.ready_stage_count !==
      runbook.stages.filter((stage) => stage.status === "ready").length ||
    runbook.summary?.attention_stage_count !==
      runbook.stages.filter((stage) => stage.status === "attention").length ||
    runbook.summary?.check_count !==
      runbook.stages.reduce((sum, stage) => sum + stage.integrations.length, 0) ||
    runbook.summary?.ready_check_count !==
      runbook.stages.reduce(
        (sum, stage) =>
          sum + stage.integrations.filter((item) => item.status === "ready").length,
        0
      ) ||
    runbook.summary?.attention_check_count !==
      runbook.stages.reduce(
        (sum, stage) =>
          sum + stage.integrations.filter((item) => item.status === "attention").length,
        0
      )
  ) {
    throw new ContractError(`${context}: invalid derived summary`);
  }
  if (runbook.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
  for (const stage of runbook.stages) assertRunbookStageSafe(stage, context);
}

function assertRunbookHandoffSummarySafe(summary, runbook, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_production_readiness_runbook_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!RUNBOOK_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: unexpected production handoff field ${field}`
      );
    }
  }
  for (const field of [
    "runbook_only",
    "real_processes_not_started_by_runbook",
    "real_obs_live2d_voicevox_not_operated",
    "live_polling_not_started_by_runbook",
    "real_game_or_os_input_not_started",
    "launch_steps_are_operator_guidance_only",
    "verification_scripts_are_names_only",
    "runtime_packets_remain_adapter_gated",
    "memory_and_relationship_candidates_remain_gated",
    "input_action_candidates_never_forwarded_directly",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  for (const field of [
    "stage_count",
    "ready_stage_count",
    "attention_stage_count",
    "operator_launch_step_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid production handoff count`);
    }
  }
  if (
    summary.stage_count !== runbook.stages.length ||
    summary.ready_stage_count !==
      runbook.stages.filter((stage) => stage.status === "ready").length ||
    summary.attention_stage_count !==
      runbook.stages.filter((stage) => stage.status === "attention").length ||
    summary.operator_launch_step_count !==
      runbook.operator_launch_plan.launch_sequence.length
  ) {
    throw new ContractError(`${context}: invalid production handoff totals`);
  }
  if (summary.next_stage_id !== runbook.next_stage) {
    throw new ContractError(`${context}: invalid production handoff next stage`);
  }
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  if (
    summary.next_readiness_state !== runbook.next_readiness_state ||
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      runbook.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: invalid production handoff readiness`);
  }
  if (
    summary.next_verification_script !==
    (runbook.verification_plan.next_stage_verification_scripts[0] ?? null)
  ) {
    throw new ContractError(`${context}: invalid production handoff verification`);
  }
  if (summary.next_launch_script !== runbook.operator_launch_plan.next_launch_script) {
    throw new ContractError(`${context}: invalid production handoff launch`);
  }
  if (
    summary.next_readiness_script !==
    runbook.operator_launch_plan.next_readiness_script
  ) {
    throw new ContractError(`${context}: invalid production handoff readiness`);
  }
  if (summary.next_stage_id !== null && !STAGE_IDS.has(summary.next_stage_id)) {
    throw new ContractError(`${context}: invalid production handoff stage`);
  }
  for (const field of [
    "next_verification_script",
    "next_launch_script",
    "next_readiness_script",
  ]) {
    if (summary[field] !== null) {
      assertSafeVerificationScript(summary[field], `${context}: ${field}`);
    }
  }
}

export function assertOperatorLaunchPlanSafe(plan, context) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: operator launch plan is required`);
  }
  if (plan.schema !== "iris_operator_launch_plan_v1") {
    throw new ContractError(`${context}: invalid operator launch plan schema`);
  }
  if (!["ready_to_launch_foundation", "configure_foundation_env_first"].includes(plan.plan_status)) {
    throw new ContractError(`${context}: invalid operator launch plan status`);
  }
  if (plan.target_stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid operator launch target`);
  }
  if (plan.target_stage_priority !== 1) {
    throw new ContractError(`${context}: invalid operator launch priority`);
  }
  if (!Array.isArray(plan.launch_sequence) || plan.launch_sequence.length === 0) {
    throw new ContractError(`${context}: operator launch sequence is required`);
  }
  plan.launch_sequence.forEach((step, index) =>
    assertOperatorLaunchStepSafe(step, context, index + 1)
  );
  if (!Number.isInteger(plan.ready_step_count) || plan.ready_step_count < 0) {
    throw new ContractError(`${context}: invalid operator launch ready step count`);
  }
  if (!Number.isInteger(plan.attention_step_count) || plan.attention_step_count < 0) {
    throw new ContractError(`${context}: invalid operator launch attention step count`);
  }
  if (plan.ready_step_count + plan.attention_step_count !== plan.launch_sequence.length) {
    throw new ContractError(`${context}: invalid operator launch step count summary`);
  }
  const firstAttentionStep =
    plan.launch_sequence.find((step) => step.launch_readiness_status !== "ready") ?? null;
  if (plan.attention_step_count === 0) {
    if (
      plan.next_step_id !== null ||
      plan.next_step_order !== null ||
      plan.next_launch_script !== null ||
      plan.next_readiness_script !== null ||
      !Array.isArray(plan.next_configure_env) ||
      plan.next_configure_env.length !== 0
    ) {
      throw new ContractError(`${context}: unexpected operator launch next step`);
    }
  } else if (
    plan.next_step_id !== firstAttentionStep?.process_id ||
    plan.next_step_order !== firstAttentionStep?.sequence_order ||
    plan.next_launch_script !== firstAttentionStep?.launch_script ||
    plan.next_readiness_script !== firstAttentionStep?.readiness_script
  ) {
    throw new ContractError(`${context}: invalid operator launch next step`);
  }
  if (plan.next_launch_script !== null) {
    assertSafeLaunchScript(plan.next_launch_script, context);
  }
  if (plan.next_readiness_script !== null) {
    assertSafeVerificationScript(plan.next_readiness_script, context);
  }
  assertEnvNameListSafe(plan.next_configure_env, `${context}: next_configure_env`);
  if (
    firstAttentionStep &&
    JSON.stringify(plan.next_configure_env) !==
      JSON.stringify(nextConfigureEnv(firstAttentionStep))
  ) {
    throw new ContractError(`${context}: invalid operator next configure env`);
  }
  assertOperatorStartupPlanSafe(plan.operator_startup_plan, context);
  if (!Number.isInteger(plan.missing_required_env_count) || plan.missing_required_env_count < 0) {
    throw new ContractError(`${context}: invalid operator launch missing env count`);
  }
  assertBoundaryPolicy(plan.boundary_policy, [
    "safe_local_commands_only",
    "env_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_payloads",
    "read_only_plan",
  ], `${context}: operator launch boundary policy`);
  if (plan.adapter_validation_required !== true) {
    throw new ContractError(`${context}: operator launch adapter validation required`);
  }
}

function assertOperatorLaunchStepSafe(step, context, expectedOrder) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: invalid operator launch step`);
  }
  if (step.schema !== "iris_operator_launch_step_v1") {
    throw new ContractError(`${context}: invalid operator launch step schema`);
  }
  if (step.sequence_order !== expectedOrder) {
    throw new ContractError(`${context}: invalid operator launch sequence order`);
  }
  if (!FOUNDATION_LAUNCH_PROCESS_IDS.has(step.process_id)) {
    throw new ContractError(`${context}: invalid operator launch process`);
  }
  if (!FOUNDATION_LAUNCH_PURPOSES.has(step.purpose)) {
    throw new ContractError(`${context}: invalid operator launch purpose`);
  }
  if (!["ready", "missing_required_env"].includes(step.launch_readiness_status)) {
    throw new ContractError(`${context}: invalid operator launch readiness status`);
  }
  assertSafeLaunchScript(step.launch_script, context);
  assertSafeVerificationScript(step.readiness_script, context);
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
    throw new ContractError(`${context}: ready launch step has missing env`);
  }
  if (
    step.launch_readiness_status === "missing_required_env" &&
    step.missing_required_env.length === 0
  ) {
    throw new ContractError(`${context}: missing-env launch step has no missing env`);
  }
}

function buildOperatorStartupPlan(launchSequence) {
  const steps = launchSequence.map((step) => buildOperatorStartupStep(step));
  const nextStep = steps.find((step) => step.ready_to_start !== true) ?? null;
  const obsPickupStartupSummary = buildObsPickupStartupSummary(steps);
  return {
    schema: "iris_operator_startup_plan_v1",
    startup_step_count: steps.length,
    ready_to_start_count: steps.filter((step) => step.ready_to_start).length,
    attention_startup_count: steps.filter((step) => !step.ready_to_start).length,
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
  return {
    schema: "iris_operator_obs_pickup_startup_summary_v1",
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
    schema: "iris_operator_startup_step_v1",
    sequence_order: step.sequence_order,
    process_id: step.process_id,
    purpose: step.purpose,
    startup_kind: metadata.startup_kind,
    operator_action: metadata.operator_action,
    launch_readiness_status: step.launch_readiness_status,
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

function assertOperatorStartupPlanSafe(plan, context) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: operator startup plan is required`);
  }
  if (plan.schema !== "iris_operator_startup_plan_v1") {
    throw new ContractError(`${context}: invalid operator startup plan schema`);
  }
  if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
    throw new ContractError(`${context}: operator startup steps are required`);
  }
  plan.steps.forEach((step, index) =>
    assertOperatorStartupStepSafe(step, context, index + 1)
  );
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
  } else if (
    plan.next_startup_step_id !== firstAttentionStep.process_id ||
    plan.next_startup_step_order !== firstAttentionStep.sequence_order ||
    plan.next_startup_script !== firstAttentionStep.launch_script ||
    plan.next_readiness_script !== firstAttentionStep.readiness_script ||
    JSON.stringify(plan.next_configure_env) !==
      JSON.stringify(nextConfigureEnvForStartupStep(firstAttentionStep))
  ) {
    throw new ContractError(`${context}: invalid operator startup next step`);
  }
  if (plan.next_startup_script !== null) {
    assertSafeLaunchScript(plan.next_startup_script, context);
  }
  if (plan.next_readiness_script !== null) {
    assertSafeVerificationScript(plan.next_readiness_script, context);
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
  assertBoundaryPolicy(plan.boundary_policy, [
    "script_names_only",
    "env_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_payloads",
    "no_candidates",
    "no_commands",
    "read_only_startup_plan",
  ], `${context}: operator startup boundary policy`);
  if (plan.adapter_validation_required !== true) {
    throw new ContractError(`${context}: operator startup adapter validation required`);
  }
}

function assertObsPickupStartupSummarySafe(summary, plan, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: OBS pickup startup summary is required`);
  }
  if (summary.schema !== "iris_operator_obs_pickup_startup_summary_v1") {
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
  const expected = {
    obs_pickup_blocking_step_count: blockingSteps.length,
    ready_obs_pickup_blocking_step_count:
      blockingSteps.length - attentionBlockingSteps.length,
    attention_obs_pickup_blocking_step_count: attentionBlockingSteps.length,
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
  if (summary.next_obs_pickup_blocking_launch_script !== null) {
    assertSafeLaunchScript(
      summary.next_obs_pickup_blocking_launch_script,
      context
    );
  }
  if (summary.next_obs_pickup_blocking_readiness_script !== null) {
    assertSafeVerificationScript(
      summary.next_obs_pickup_blocking_readiness_script,
      context
    );
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "booleans_counts_and_script_names_only",
    "env_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_payloads",
    "no_candidates",
    "no_commands",
  ], `${context}: OBS pickup startup boundary policy`);
}

function assertOperatorStartupStepSafe(step, context, expectedOrder) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: invalid operator startup step`);
  }
  if (step.schema !== "iris_operator_startup_step_v1") {
    throw new ContractError(`${context}: invalid operator startup step schema`);
  }
  if (step.sequence_order !== expectedOrder) {
    throw new ContractError(`${context}: invalid operator startup order`);
  }
  if (!FOUNDATION_LAUNCH_PROCESS_IDS.has(step.process_id)) {
    throw new ContractError(`${context}: invalid operator startup process`);
  }
  if (!FOUNDATION_LAUNCH_PURPOSES.has(step.purpose)) {
    throw new ContractError(`${context}: invalid operator startup purpose`);
  }
  if (!STARTUP_KINDS.has(step.startup_kind)) {
    throw new ContractError(`${context}: invalid operator startup kind`);
  }
  if (!OPERATOR_ACTIONS.has(step.operator_action)) {
    throw new ContractError(`${context}: invalid operator startup action`);
  }
  if (!["ready", "missing_required_env"].includes(step.launch_readiness_status)) {
    throw new ContractError(`${context}: invalid operator startup readiness`);
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
  assertSafeLaunchScript(step.launch_script, context);
  assertSafeVerificationScript(step.readiness_script, context);
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

function assertEnvNameListSafe(names, context) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of names) {
    if (typeof name !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(name)) {
      throw new ContractError(`${context}: invalid env name`, { name });
    }
  }
}

function assertSafeLaunchScript(script, context) {
  if (
    typeof script !== "string" ||
    !SAFE_NPM_DEV_SCRIPT_PATTERN.test(script)
  ) {
    throw new ContractError(`${context}: unsafe operator launch script`);
  }
}

function nextConfigureEnv(step) {
  if (!step) return [];
  const candidates =
    step.missing_required_env.length > 0
      ? step.missing_required_env
      : step.configure_next_env.length > 0
        ? step.configure_next_env
        : step.required_env;
  return [...new Set(candidates)].filter((name) => /^IRIS_[A-Z0-9_]+$/.test(name));
}

function nextConfigureEnvForStartupStep(step) {
  if (!step) return [];
  const candidates =
    step.missing_required_env.length > 0
      ? step.missing_required_env
      : step.configure_next_env.length > 0
        ? step.configure_next_env
        : [];
  return [...new Set(candidates)].filter((name) => /^IRIS_[A-Z0-9_]+$/.test(name));
}

function buildStage(definition, checksByIntegration) {
  const checks = definition.integration_keys
    .map((integration) => checksByIntegration.get(integration))
    .filter(Boolean);
  const readinessState = selectStageReadinessState(checks);
  const missingRequiredEnv = [
    ...new Set(checks.flatMap((check) => check.missing_env)),
  ];
  const configuredEnv = [
    ...new Set(checks.flatMap((check) => check.configured_env)),
  ];
  return {
    schema: "iris_production_readiness_stage_v1",
    stage_id: definition.stage_id,
    priority: definition.priority,
    status: checks.every((check) => check.status === "ready") ? "ready" : "attention",
    readiness_state: readinessState,
    readiness_state_counts: countReadinessStates(checks),
    integrations: checks.map((check) => ({
      integration: check.integration,
      status: check.status,
      readiness_state: check.readiness_state,
      mode: check.mode,
    })),
    configured_env: configuredEnv,
    missing_required_env: missingRequiredEnv,
    verification_scripts: definition.verification_scripts,
    fixture_available: checks.every((check) =>
      SAFE_NPM_DEV_SCRIPT_PATTERN.test(check.local_fixture_command) ||
      check.local_fixture_command === "npm test"
    ),
    boundary_policy: {
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      read_only_stage: true,
    },
  };
}

function assertRunbookStageSafe(stage, context) {
  if (!stage || typeof stage !== "object") {
    throw new ContractError(`${context}: invalid stage`);
  }
  if (stage.schema !== "iris_production_readiness_stage_v1") {
    throw new ContractError(`${context}: invalid stage schema`, { schema: stage.schema });
  }
  const stageDefinition = STAGE_DEFINITIONS_BY_ID.get(stage.stage_id);
  if (!stageDefinition) {
    throw new ContractError(`${context}: invalid stage id`);
  }
  if (
    stage.priority !== stageDefinition.priority ||
    STAGE_IDS_BY_PRIORITY.get(stage.priority) !== stage.stage_id
  ) {
    throw new ContractError(`${context}: invalid stage priority`);
  }
  if (!["ready", "attention"].includes(stage.status)) {
    throw new ContractError(`${context}: invalid stage status`, { status: stage.status });
  }
  if (!Array.isArray(stage.integrations) || stage.integrations.length === 0) {
    throw new ContractError(`${context}: stage integrations are required`);
  }
  assertSafeReadinessState(stage.readiness_state, context);
  assertReadinessStateCountsSafe(stage.readiness_state_counts, context);
  if (
    !sameReadinessStateCounts(
      stage.readiness_state_counts,
      countReadinessStates(stage.integrations)
    )
  ) {
    throw new ContractError(`${context}: invalid stage readiness counts`);
  }
  const readyIntegrationCount = stage.integrations.filter(
    (integration) => integration.status === "ready"
  ).length;
  const expectedStageStatus =
    readyIntegrationCount === stage.integrations.length ? "ready" : "attention";
  if (stage.status !== expectedStageStatus) {
    throw new ContractError(`${context}: invalid derived stage status`);
  }
  if (stage.status === "ready" && stage.readiness_state !== "ready") {
    throw new ContractError(`${context}: ready stage must have ready readiness state`);
  }
  for (const integration of stage.integrations) {
    if (!["ready", "attention"].includes(integration.status)) {
      throw new ContractError(`${context}: invalid stage integration status`);
    }
    assertSafeReadinessState(integration.readiness_state, context);
  }
  if (!Array.isArray(stage.configured_env) || !Array.isArray(stage.missing_required_env)) {
    throw new ContractError(`${context}: stage env summaries must be arrays`);
  }
  assertEnvNameListSafe(stage.configured_env, `${context}: configured env`);
  assertEnvNameListSafe(stage.missing_required_env, `${context}: missing env`);
  if (
    !Array.isArray(stage.verification_scripts) ||
    stage.verification_scripts.length !==
      stageDefinition.verification_scripts.length ||
    !stage.verification_scripts.every(
      (script, index) => script === stageDefinition.verification_scripts[index]
    )
  ) {
    throw new ContractError(`${context}: invalid stage verification scripts`);
  }
  for (const script of stage.verification_scripts) {
    assertSafeVerificationScript(script, context);
  }
  assertBoundaryPolicy(stage.boundary_policy, [
    "env_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "read_only_stage",
  ], `${context}: stage boundary policy`);
}

function assertVerificationPlanSafe(plan, context) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: verification plan is required`);
  }
  if (plan.schema !== "iris_production_verification_plan_v1") {
    throw new ContractError(`${context}: invalid verification plan schema`);
  }
  if (!["start_next_attention_stage", "all_stages_ready"].includes(plan.plan_status)) {
    throw new ContractError(`${context}: invalid verification plan status`);
  }
  if (plan.next_stage_id !== null && !STAGE_IDS.has(plan.next_stage_id)) {
    throw new ContractError(`${context}: invalid verification next stage`);
  }
  if (
    plan.next_stage_priority !== null &&
    (!Number.isInteger(plan.next_stage_priority) || plan.next_stage_priority < 1)
  ) {
    throw new ContractError(`${context}: invalid verification next stage priority`);
  }
  if (!Array.isArray(plan.next_stage_verification_scripts)) {
    throw new ContractError(`${context}: verification scripts must be an array`);
  }
  for (const script of plan.next_stage_verification_scripts) {
    assertSafeVerificationScript(script, context);
  }
  if (!Array.isArray(plan.stage_summaries) || plan.stage_summaries.length === 0) {
    throw new ContractError(`${context}: verification stage summaries are required`);
  }
  for (const summary of plan.stage_summaries) {
    assertVerificationStageSummarySafe(summary, context);
  }
  if (!Number.isInteger(plan.total_verification_script_count) || plan.total_verification_script_count < 0) {
    throw new ContractError(`${context}: invalid total verification script count`);
  }
  assertBoundaryPolicy(plan.boundary_policy, [
    "script_names_only",
    "env_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "read_only_plan",
  ], `${context}: verification plan boundary policy`);
  if (plan.adapter_validation_required !== true) {
    throw new ContractError(`${context}: verification plan adapter validation required`);
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

function assertVerificationStageSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: invalid verification stage summary`);
  }
  if (!STAGE_IDS.has(summary.stage_id)) {
    throw new ContractError(`${context}: invalid verification stage id`);
  }
  if (!Number.isInteger(summary.priority) || summary.priority < 1) {
    throw new ContractError(`${context}: invalid verification stage priority`);
  }
  if (!["ready", "attention"].includes(summary.status)) {
    throw new ContractError(`${context}: invalid verification stage status`);
  }
  assertSafeReadinessState(summary.readiness_state, context);
  if (!Number.isInteger(summary.verification_script_count) || summary.verification_script_count < 0) {
    throw new ContractError(`${context}: invalid verification script count`);
  }
  if (summary.first_verification_script !== null) {
    assertSafeVerificationScript(summary.first_verification_script, context);
  }
  if (!Number.isInteger(summary.missing_required_env_count) || summary.missing_required_env_count < 0) {
    throw new ContractError(`${context}: invalid missing env count`);
  }
}

function assertSafeVerificationScript(script, context) {
  if (
    typeof script !== "string" ||
    !(SAFE_NPM_DEV_SCRIPT_PATTERN.test(script) || script === "npm test")
  ) {
    throw new ContractError(`${context}: invalid verification script`);
  }
}

function selectStageReadinessState(items) {
  for (const state of [
    "operator_review_required",
    "configuration_waiting",
    "runtime_waiting",
    "real_device_waiting",
  ]) {
    if (items.some((item) => item.readiness_state === state)) return state;
  }
  return "ready";
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
    throw new ContractError(`${context}: invalid readiness state`, { state });
  }
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness state count`, {
        state,
      });
    }
  }
  for (const state of Object.keys(counts)) {
    if (!READINESS_STATES.has(state)) {
      throw new ContractError(`${context}: unexpected readiness state count`, {
        state,
      });
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every((state) => left?.[state] === right?.[state]);
}

function assertNoForbiddenRunbookFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenRunbookFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_RUNBOOK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe runbook field`, { field, path });
    }
    assertNoForbiddenRunbookFields(child, context, `${path}.${field}`);
  }
}
