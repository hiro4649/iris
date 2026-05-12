import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationConnectorHandoffSafe,
  createFoundationConnectorHandoff,
} from "./foundationConnectorHandoff.js";
import { ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES } from "./adminCharacterVoiceSettings.js";

const FORBIDDEN_FOUNDATION_ENV_SETUP_FIELDS = new Set([
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
  "final_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "value",
  "payload",
  "path",
  "artifact_path",
]);

const PLAN_STATUSES = new Set([
  "ready_for_foundation_env_setup",
  "configure_foundation_env_first",
]);
const GROUP_STATUSES = new Set(["ready", "attention"]);
const ATTENTION_REASONS = new Set([
  "ready",
  "missing_required_env",
  "connector_attention",
  "local_target_policy_attention",
]);
const ENV_GROUP_IDS = new Set([
  "runtime_http_adapters",
  "local_bridge_storage",
  "real_tts_engine",
  "real_live2d_engine",
  "local_bridge_worker",
  "iris_dev_server",
  "obs_overlay",
]);
const ENV_GROUP_KINDS = new Set([
  "runtime_adapter_config",
  "local_bridge_config",
  "real_engine_config",
  "worker_config",
  "runtime_server_config",
  "obs_overlay_config",
]);
const CONNECTOR_IDS = new Set([
  "runtime_tts_adapter",
  "runtime_live2d_adapter",
  "runtime_subtitle_adapter",
  "local_adapter_bridge",
  "local_bridge_worker",
  "iris_dev_server",
  "real_tts_engine",
  "real_live2d_engine",
  "obs_browser_source",
  "obs_setup_bridge",
  "obs_setup_bridge_health",
]);
const GUIDANCE_LABELS = new Set([
  "set_http_adapters",
  "loopback_or_private_network_only",
  "local_bridge_before_runtime_server",
  "real_engine_health_probe_required",
  "worker_watch_required",
  "event_render_manifest_required",
  "runtime_server_after_bridge",
  "manual_obs_source_allowed",
  "obs_setup_bridge_optional",
  "obs_health_probe_when_setup_bridge_enabled",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const URL_PATTERN = /\bhttps?:\/\//i;
const UNSAFE_LABEL_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory|relationship|candidate|canonical|secret|token|password|authorization|endpoint|url|payload|text)\b|https?:\/\//i;

const FOUNDATION_ENV_SETUP_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "plan_status",
  "foundation_connector_handoff_status",
  "env_group_count",
  "ready_env_group_count",
  "attention_env_group_count",
  "next_readiness_state",
  "readiness_state_counts",
  "next_env_group_id",
  "next_env_group_kind",
  "next_attention_reason",
  "next_configure_env",
  "next_launch_script",
  "next_readiness_script",
  "env_groups",
  "verification_scripts",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);

const FOUNDATION_ENV_SETUP_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "env_setup_plan_only",
  "real_tts_process_not_started",
  "real_live2d_process_not_started",
  "real_obs_process_not_started",
  "real_engine_target_values_not_required_for_plan",
  "runtime_packets_remain_adapter_gated",
  "next_production_decision_ids",
  "next_production_decision_count",
  "next_status_script",
  "next_readiness_state",
  "readiness_state_counts",
]);
const ADMIN_SETUP_WIZARD_ENV_SUMMARY_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "configured_env_count",
  "missing_env_count",
  "env_statuses",
  "boundary_policy",
  "adapter_validation_required",
]);
const ADMIN_SETUP_WIZARD_ENV_STATUS_FIELDS = new Set([
  "env_name",
  "env_status",
]);

export function createFoundationEnvSetupPlan({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const handoff = createFoundationConnectorHandoff({ env, generatedAtMs });
  assertFoundationConnectorHandoffSafe(handoff, "foundation env setup connector handoff");

  const connectorMap = new Map(
    handoff.connectors.map((connector) => [connector.connector_id, connector])
  );
  const envGroups = buildEnvGroups({ env, connectorMap });
  const nextGroup = envGroups.find((group) => group.setup_status !== "ready") ?? null;
  const readyEnvGroupCount = envGroups.filter(
    (group) => group.setup_status === "ready"
  ).length;
  const nextReadinessState =
    nextGroup === null ? "ready" : readinessStateForEnvGroup(nextGroup);
  const readinessStateCounts = countReadinessStates(envGroups);
  const plan = {
    schema: "iris_foundation_env_setup_plan_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "tts_live2d_obs_foundation",
    target_stage_priority: 1,
    plan_status:
      nextGroup === null
        ? "ready_for_foundation_env_setup"
        : "configure_foundation_env_first",
    foundation_connector_handoff_status: handoff.handoff_status,
    env_group_count: envGroups.length,
    ready_env_group_count: readyEnvGroupCount,
    attention_env_group_count: envGroups.length - readyEnvGroupCount,
    next_readiness_state: nextReadinessState,
    readiness_state_counts: readinessStateCounts,
    next_env_group_id: nextGroup?.env_group_id ?? null,
    next_env_group_kind: nextGroup?.env_group_kind ?? null,
    next_attention_reason: nextGroup?.attention_reason ?? null,
    next_configure_env: nextGroup?.next_configure_env ?? [],
    next_launch_script: nextGroup?.launch_script ?? null,
    next_readiness_script: nextGroup?.readiness_script ?? null,
    env_groups: envGroups,
    verification_scripts: {
      schema: "iris_foundation_env_setup_plan_scripts_v1",
      local_env_apply_plan_script: "npm run dev:foundation:local-env-apply",
      env_setup_plan_script: "npm run dev:foundation:env-setup-plan",
      connector_handoff_script: "npm run dev:foundation:connector-handoff",
      startup_checklist_script: "npm run dev:foundation:startup-checklist",
      launch_plan_script: "npm run dev:foundation:launch-plan",
      runtime_status_script: "npm run dev:foundation:runtime-status",
      live_readiness_script: "npm run dev:foundation:live-readiness",
      readiness_rehearsal_script: "npm run dev:foundation:readiness-rehearsal",
      production_probe_script: "npm run dev:production:probe",
      engine_probe_script: "npm run dev:engine:probe",
      bridge_status_roundtrip_script: "npm run dev:bridge:status-roundtrip",
      bridge_engine_roundtrip_script: "npm run dev:bridge:engine-roundtrip",
      obs_runtime_render_roundtrip_script:
        "npm run dev:obs:runtime-render-roundtrip",
    },
    production_handoff_summary: {
      schema: "iris_foundation_env_setup_production_handoff_summary_v1",
      env_setup_plan_only: true,
      real_tts_process_not_started: true,
      real_live2d_process_not_started: true,
      real_obs_process_not_started: true,
      real_engine_target_values_not_required_for_plan: true,
      runtime_packets_remain_adapter_gated: true,
      next_production_decision_ids: [
        "configure_runtime_http_adapters",
        "configure_local_bridge_storage",
        "choose_real_tts_engine_target",
        "choose_real_live2d_engine_target",
        "configure_obs_overlay_or_setup_bridge",
        "run_foundation_probe_before_live_output",
      ],
      next_production_decision_count: 6,
      next_status_script: "npm run dev:foundation:live-readiness",
      next_readiness_state: nextReadinessState,
      readiness_state_counts: readinessStateCounts,
    },
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      schema_names_only: true,
      fixed_ids_statuses_and_counts_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_env_setup_plan: true,
    },
    adapter_validation_required: true,
  };
  assertFoundationEnvSetupPlanSafe(plan);
  return plan;
}

export function createAdminSetupWizardEnvSafetySummary({
  env = process.env,
  generatedAtMs = Date.now(),
  plan = null,
} = {}) {
  const setupPlan = plan ?? createFoundationEnvSetupPlan({ env, generatedAtMs });
  assertFoundationEnvSetupPlanSafe(setupPlan, "admin setup wizard env safety plan");
  const statuses = new Map();
  for (const group of setupPlan.env_groups) {
    for (const name of group.required_env) {
      statuses.set(name, group.missing_required_env.includes(name) ? "missing" : "configured");
    }
    for (const name of group.optional_env) {
      if (!statuses.has(name)) statuses.set(name, "missing");
    }
  }
  const env_statuses = [...statuses.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([env_name, env_status]) => ({ env_name, env_status }));
  const summary = {
    schema: "iris_admin_setup_wizard_env_safety_summary_v1",
    generated_at_ms: generatedAtMs,
    configured_env_count: env_statuses.filter((item) => item.env_status === "configured").length,
    missing_env_count: env_statuses.filter((item) => item.env_status === "missing").length,
    env_statuses,
    boundary_policy: {
      env_names_only: true,
      configured_or_missing_only: true,
      no_env_values: true,
      no_tokens: true,
      no_endpoint_values: true,
      no_raw_paths: true,
    },
    adapter_validation_required: true,
  };
  assertAdminSetupWizardEnvSafetySummarySafe(summary);
  return summary;
}

export function assertAdminSetupWizardEnvSafetySummarySafe(
  summary,
  context = "admin setup wizard env safety summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_admin_setup_wizard_env_safety_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ADMIN_SETUP_WIZARD_ENV_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field ${field}`);
    }
  }
  for (const field of ["generated_at_ms", "configured_env_count", "missing_env_count"]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (!Array.isArray(summary.env_statuses)) {
    throw new ContractError(`${context}: env statuses required`);
  }
  for (const item of summary.env_statuses) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ContractError(`${context}: invalid env status entry`);
    }
    for (const field of Object.keys(item)) {
      if (!ADMIN_SETUP_WIZARD_ENV_STATUS_FIELDS.has(field)) {
        throw new ContractError(`${context}: unexpected env status field ${field}`);
      }
    }
    assertEnvNameListSafe([item.env_name], `${context}: env name`);
    if (!["configured", "missing"].includes(item.env_status)) {
      throw new ContractError(`${context}: invalid env status`);
    }
  }
  if (
    summary.configured_env_count !==
      summary.env_statuses.filter((item) => item.env_status === "configured").length ||
    summary.missing_env_count !==
      summary.env_statuses.filter((item) => item.env_status === "missing").length
  ) {
    throw new ContractError(`${context}: env status count mismatch`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "env_names_only",
      "configured_or_missing_only",
      "no_env_values",
      "no_tokens",
      "no_endpoint_values",
      "no_raw_paths",
    ],
    `${context}: boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function assertFoundationEnvSetupPlanSafe(
  plan,
  context = "foundation env setup plan"
) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: plan is required`);
  }
  assertNoForbiddenFoundationEnvSetupFields(plan, context);
  assertNoUrlStrings(plan, context);
  if (plan.schema !== "iris_foundation_env_setup_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!FOUNDATION_ENV_SETUP_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected plan field`, { field });
    }
  }
  if (!Number.isInteger(plan.generated_at_ms) || plan.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (plan.target_stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (plan.target_stage_priority !== 1) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!PLAN_STATUSES.has(plan.plan_status)) {
    throw new ContractError(`${context}: invalid plan status`);
  }
  if (
    ![
      "ready_for_foundation_connector_handoff",
      "configure_foundation_connectors_first",
    ].includes(plan.foundation_connector_handoff_status)
  ) {
    throw new ContractError(`${context}: invalid connector handoff status`);
  }
  if (!Array.isArray(plan.env_groups) || plan.env_groups.length === 0) {
    throw new ContractError(`${context}: env groups are required`);
  }
  plan.env_groups.forEach((group, index) =>
    assertEnvSetupGroupSafe(group, context, index + 1)
  );
  for (const field of [
    "env_group_count",
    "ready_env_group_count",
    "attention_env_group_count",
  ]) {
    assertNonNegativeInteger(plan[field], `${context}: invalid ${field}`);
  }
  if (plan.env_group_count !== plan.env_groups.length) {
    throw new ContractError(`${context}: invalid env group count`);
  }
  if (
    plan.ready_env_group_count !==
    plan.env_groups.filter((group) => group.setup_status === "ready").length
  ) {
    throw new ContractError(`${context}: invalid ready group count`);
  }
  if (
    plan.attention_env_group_count !==
    plan.env_groups.filter((group) => group.setup_status !== "ready").length
  ) {
    throw new ContractError(`${context}: invalid attention group count`);
  }
  const firstAttentionGroup =
    plan.env_groups.find((group) => group.setup_status !== "ready") ?? null;
  assertSafeReadinessState(plan.next_readiness_state, context);
  assertReadinessStateCountsSafe(plan.readiness_state_counts, context);
  if (
    plan.next_readiness_state !==
    (firstAttentionGroup === null
      ? "ready"
      : readinessStateForEnvGroup(firstAttentionGroup)) ||
    !sameReadinessStateCounts(
      plan.readiness_state_counts,
      countReadinessStates(plan.env_groups)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness labels`);
  }
  if (firstAttentionGroup === null) {
    if (
      plan.plan_status !== "ready_for_foundation_env_setup" ||
      plan.next_env_group_id !== null ||
      plan.next_env_group_kind !== null ||
      plan.next_attention_reason !== null ||
      plan.next_launch_script !== null ||
      plan.next_readiness_script !== null ||
      !Array.isArray(plan.next_configure_env) ||
      plan.next_configure_env.length !== 0
    ) {
      throw new ContractError(`${context}: unexpected next env group`);
    }
  } else if (
    plan.plan_status !== "configure_foundation_env_first" ||
    plan.next_env_group_id !== firstAttentionGroup.env_group_id ||
    plan.next_env_group_kind !== firstAttentionGroup.env_group_kind ||
    plan.next_attention_reason !== firstAttentionGroup.attention_reason ||
    plan.next_launch_script !== firstAttentionGroup.launch_script ||
    plan.next_readiness_script !== firstAttentionGroup.readiness_script ||
    JSON.stringify(plan.next_configure_env) !==
      JSON.stringify(firstAttentionGroup.next_configure_env)
  ) {
    throw new ContractError(`${context}: invalid next env group`);
  }
  assertEnvNameListSafe(plan.next_configure_env, `${context}: next configure env`);
  assertVerificationScriptsSafe(plan.verification_scripts, context);
  assertProductionHandoffSummarySafe(plan.production_handoff_summary, context);
  assertBoundaryPolicy(
    plan.boundary_policy,
    [
      "env_names_only",
      "script_names_only",
      "schema_names_only",
      "fixed_ids_statuses_and_counts_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "read_only_env_setup_plan",
    ],
    `${context}: boundary policy`
  );
  if (plan.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertProductionHandoffSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (
    summary.schema !== "iris_foundation_env_setup_production_handoff_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!FOUNDATION_ENV_SETUP_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected production handoff field`, {
        field,
      });
    }
  }
  for (const field of [
    "env_setup_plan_only",
    "real_tts_process_not_started",
    "real_live2d_process_not_started",
    "real_obs_process_not_started",
    "real_engine_target_values_not_required_for_plan",
    "runtime_packets_remain_adapter_gated",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (
    !Array.isArray(summary.next_production_decision_ids) ||
    summary.next_production_decision_ids.length !==
      summary.next_production_decision_count
  ) {
    throw new ContractError(`${context}: invalid production decision count`);
  }
  for (const decisionId of summary.next_production_decision_ids) {
    if (typeof decisionId !== "string" || !/^[a-z0-9_:-]+$/i.test(decisionId)) {
      throw new ContractError(`${context}: invalid production decision id`);
    }
  }
  assertSafeScriptName(summary.next_status_script, context);
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
}

function buildEnvGroups({ env, connectorMap }) {
  const ttsEndpointEnv = env.IRIS_TTS_ENDPOINT
    ? "IRIS_TTS_ENDPOINT"
    : "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT";
  const live2dEndpointEnv = env.IRIS_LIVE2D_ENDPOINT
    ? "IRIS_LIVE2D_ENDPOINT"
    : "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT";
  const subtitleEndpointEnv = env.IRIS_SUBTITLE_ENDPOINT
    ? "IRIS_SUBTITLE_ENDPOINT"
    : "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT";
  return [
    buildEnvGroup({
      env,
      connectorMap,
      sequenceOrder: 1,
      envGroupId: "runtime_http_adapters",
      envGroupKind: "runtime_adapter_config",
      connectorRefs: [
        "runtime_tts_adapter",
        "runtime_live2d_adapter",
        "runtime_subtitle_adapter",
      ],
      requiredEnv: [
        "IRIS_TTS_ADAPTER",
        ttsEndpointEnv,
        "IRIS_LIVE2D_ADAPTER",
        live2dEndpointEnv,
        "IRIS_SUBTITLE_ADAPTER",
        subtitleEndpointEnv,
      ],
      optionalEnv: [
        "IRIS_TTS_ENDPOINT",
        "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT",
        "IRIS_LIVE2D_ENDPOINT",
        "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT",
        "IRIS_SUBTITLE_ENDPOINT",
        "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT",
        "IRIS_TTS_API_KEY",
        "IRIS_TTS_TIMEOUT_MS",
        "IRIS_LIVE2D_API_KEY",
        "IRIS_LIVE2D_TIMEOUT_MS",
        "IRIS_SUBTITLE_API_KEY",
        "IRIS_SUBTITLE_TIMEOUT_MS",
      ],
      requiredHttpAdapterEnv: [
        "IRIS_TTS_ADAPTER",
        "IRIS_LIVE2D_ADAPTER",
        "IRIS_SUBTITLE_ADAPTER",
      ],
      launchScript: "npm run dev:server",
      readinessScript: "npm run dev:probe",
      guidanceLabels: [
        "set_http_adapters",
        "loopback_or_private_network_only",
      ],
      blocksRuntimeHandoff: true,
      blocksObsPickup: false,
    }),
    buildEnvGroup({
      env,
      connectorMap,
      sequenceOrder: 2,
      envGroupId: "local_bridge_storage",
      envGroupKind: "local_bridge_config",
      connectorRefs: ["local_adapter_bridge"],
      requiredEnv: [
        "IRIS_LOCAL_BRIDGE_OUTBOX_DIR",
        "IRIS_LOCAL_BRIDGE_ARTIFACT_DIR",
        "IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS",
        "IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS",
      ],
      optionalEnv: [
        "IRIS_LOCAL_BRIDGE_HOST",
        "IRIS_LOCAL_BRIDGE_PORT",
        "IRIS_SHOW_LOCAL_PATHS",
      ],
      launchScript: "npm run dev:bridge",
      readinessScript: "npm run dev:bridge:status-roundtrip",
      guidanceLabels: [
        "local_bridge_before_runtime_server",
        "event_render_manifest_required",
      ],
      blocksRuntimeHandoff: true,
      blocksObsPickup: true,
    }),
    buildEnvGroup({
      env,
      connectorMap,
      sequenceOrder: 3,
      envGroupId: "real_tts_engine",
      envGroupKind: "real_engine_config",
      connectorRefs: ["real_tts_engine"],
      requiredEnv: [
        "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
        "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
      ],
      optionalEnv: [
        "IRIS_LOCAL_TTS_ENGINE_API_KEY",
        "IRIS_LOCAL_TTS_ENGINE_VOICE_ID",
        "IRIS_LOCAL_TTS_ENGINE_MODEL",
        "IRIS_LOCAL_TTS_ENGINE_LOCALE",
        "IRIS_CHARACTER_VOICE_PROFILE_ID",
        "IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID",
        "IRIS_LICENSED_VOICE_SOURCE_STATUS",
        ...ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES,
        "IRIS_VOICEVOX_ENDPOINT",
        "IRIS_VOICEVOX_SPEAKER_ID",
        "IRIS_VOICEVOX_TIMEOUT_MS",
        "IRIS_VOICEVOX_API_KEY",
      ],
      launchScript: "npm run dev:voicevox:bridge",
      readinessScript: "npm run dev:engine:probe",
      guidanceLabels: [
        "real_engine_health_probe_required",
        "loopback_or_private_network_only",
      ],
      blocksRuntimeHandoff: true,
      blocksObsPickup: true,
    }),
    buildEnvGroup({
      env,
      connectorMap,
      sequenceOrder: 4,
      envGroupId: "real_live2d_engine",
      envGroupKind: "real_engine_config",
      connectorRefs: ["real_live2d_engine"],
      requiredEnv: [
        "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
        "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
      ],
      optionalEnv: [
        "IRIS_LOCAL_LIVE2D_ENGINE_API_KEY",
        "IRIS_LOCAL_LIVE2D_MODEL_ID",
        "IRIS_LOCAL_LIVE2D_SCENE_ID",
        "IRIS_LIVE2D_RENDERER_ENDPOINT",
        "IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT",
        "IRIS_LIVE2D_RENDERER_API_KEY",
        "IRIS_LIVE2D_CUE_BRIDGE_TIMEOUT_MS",
      ],
      launchScript: "npm run dev:live2d:bridge",
      readinessScript: "npm run dev:engine:probe",
      guidanceLabels: [
        "real_engine_health_probe_required",
        "loopback_or_private_network_only",
      ],
      blocksRuntimeHandoff: true,
      blocksObsPickup: true,
    }),
    buildEnvGroup({
      env,
      connectorMap,
      sequenceOrder: 5,
      envGroupId: "local_bridge_worker",
      envGroupKind: "worker_config",
      connectorRefs: ["local_bridge_worker"],
      requiredEnv: [
        "IRIS_LOCAL_BRIDGE_OUTBOX_DIR",
        "IRIS_LOCAL_BRIDGE_ARTIFACT_DIR",
        "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
        "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
        "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
        "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
      ],
      optionalEnv: [
        "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
        "IRIS_LOCAL_BRIDGE_WORKER_RETRY_BACKOFF_MS",
        "IRIS_LOCAL_BRIDGE_WORKER_RETRY_MAX_BACKOFF_MS",
        "IRIS_LOCAL_BRIDGE_WORKER_MAX_RETRY_ATTEMPTS",
        "IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS",
      ],
      launchScript: "npm run dev:bridge:worker -- --watch",
      readinessScript: "npm run dev:bridge:engine-roundtrip",
      guidanceLabels: [
        "worker_watch_required",
        "event_render_manifest_required",
        "real_engine_health_probe_required",
      ],
      blocksRuntimeHandoff: true,
      blocksObsPickup: true,
    }),
    buildEnvGroup({
      env,
      connectorMap,
      sequenceOrder: 6,
      envGroupId: "iris_dev_server",
      envGroupKind: "runtime_server_config",
      connectorRefs: ["iris_dev_server"],
      requiredEnv: [
        "IRIS_TTS_ADAPTER",
        ttsEndpointEnv,
        "IRIS_LIVE2D_ADAPTER",
        live2dEndpointEnv,
        "IRIS_SUBTITLE_ADAPTER",
        subtitleEndpointEnv,
        "IRIS_HTTP_ORIGIN",
      ],
      optionalEnv: [
        "IRIS_TTS_ENDPOINT",
        "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT",
        "IRIS_LIVE2D_ENDPOINT",
        "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT",
        "IRIS_SUBTITLE_ENDPOINT",
        "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT",
        "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
        "IRIS_ENABLE_IDLE_SCHEDULER",
      ],
      requiredHttpAdapterEnv: [
        "IRIS_TTS_ADAPTER",
        "IRIS_LIVE2D_ADAPTER",
        "IRIS_SUBTITLE_ADAPTER",
      ],
      launchScript: "npm run dev:server",
      readinessScript: "npm run dev:production:probe",
      guidanceLabels: [
        "runtime_server_after_bridge",
        "set_http_adapters",
      ],
      blocksRuntimeHandoff: true,
      blocksObsPickup: false,
    }),
    buildEnvGroup({
      env,
      connectorMap,
      sequenceOrder: 7,
      envGroupId: "obs_overlay",
      envGroupKind: "obs_overlay_config",
      connectorRefs: [
        "obs_browser_source",
        "obs_setup_bridge",
        "obs_setup_bridge_health",
      ],
      requiredEnv: obsRequiredEnv(env),
      optionalEnv: [
        "IRIS_OBS_BRIDGE_ENDPOINT",
        "IRIS_OBS_BRIDGE_HEALTH_ENDPOINT",
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
      launchScript: "npm run dev:obs:browser-source",
      readinessScript: "npm run dev:obs:runtime-render-roundtrip",
      guidanceLabels: [
        "manual_obs_source_allowed",
        "obs_setup_bridge_optional",
        "obs_health_probe_when_setup_bridge_enabled",
      ],
      blocksRuntimeHandoff: true,
      blocksObsPickup: true,
    }),
  ];
}

function buildEnvGroup({
  env,
  connectorMap,
  sequenceOrder,
  envGroupId,
  envGroupKind,
  connectorRefs,
  requiredEnv,
  optionalEnv,
  requiredHttpAdapterEnv = [],
  launchScript,
  readinessScript,
  guidanceLabels,
  blocksRuntimeHandoff,
  blocksObsPickup,
}) {
  const configuredRequiredEnv = configuredEnv(requiredEnv, env, requiredHttpAdapterEnv);
  const missingRequiredEnv = missingEnv(requiredEnv, env, requiredHttpAdapterEnv);
  const connectors = connectorRefs.map((connectorId) => {
    const connector = connectorMap.get(connectorId);
    if (!connector) {
      throw new ContractError(
        `foundation env setup ${envGroupId}: connector ${connectorId} is required`
      );
    }
    return connector;
  });
  const connectorReadyCount = connectors.filter(
    (connector) => connector.connector_status === "ready"
  ).length;
  const connectorAttentionCount = connectors.length - connectorReadyCount;
  const setupReady =
    missingRequiredEnv.length === 0 && connectorAttentionCount === 0;
  return {
    schema: "iris_foundation_env_setup_group_v1",
    sequence_order: sequenceOrder,
    env_group_id: envGroupId,
    env_group_kind: envGroupKind,
    setup_status: setupReady ? "ready" : "attention",
    readiness_state: setupReady
      ? "ready"
      : missingRequiredEnv.length > 0
        ? "configuration_waiting"
        : readinessStateForConnectorAttention(connectors),
    attention_reason: setupReady
      ? "ready"
      : missingRequiredEnv.length > 0
        ? "missing_required_env"
        : connectorAttentionReason(connectors),
    required_env: uniqueEnvNames(requiredEnv),
    optional_env: uniqueEnvNames(optionalEnv),
    configured_required_env: uniqueEnvNames(configuredRequiredEnv),
    missing_required_env: uniqueEnvNames(missingRequiredEnv),
    next_configure_env: setupReady
      ? []
      : uniqueEnvNames([
          ...missingRequiredEnv,
          ...connectors.flatMap((connector) => connector.next_configure_env),
        ]),
    connector_refs: connectorRefs,
    connector_ready_count: connectorReadyCount,
    connector_attention_count: connectorAttentionCount,
    launch_script: launchScript,
    readiness_script: readinessScript,
    guidance_labels: guidanceLabels,
    blocks_runtime_handoff: blocksRuntimeHandoff,
    blocks_obs_pickup: blocksObsPickup,
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      connector_ids_only: true,
      guidance_labels_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_env_group: true,
    },
    adapter_validation_required: true,
  };
}

function obsRequiredEnv(env) {
  return Boolean(env.IRIS_OBS_BRIDGE_ENDPOINT)
    ? [
        "IRIS_HTTP_ORIGIN",
        "IRIS_OBS_BRIDGE_ENDPOINT",
        "IRIS_OBS_BRIDGE_HEALTH_ENDPOINT",
      ]
    : ["IRIS_HTTP_ORIGIN"];
}

function configuredEnv(requiredEnv, env, requiredHttpAdapterEnv = []) {
  return requiredEnv.filter((name) =>
    isConfiguredRequiredEnv(name, env, requiredHttpAdapterEnv)
  );
}

function missingEnv(requiredEnv, env, requiredHttpAdapterEnv = []) {
  return requiredEnv.filter(
    (name) => !isConfiguredRequiredEnv(name, env, requiredHttpAdapterEnv)
  );
}

function isConfiguredRequiredEnv(name, env, requiredHttpAdapterEnv) {
  if (requiredHttpAdapterEnv.includes(name)) {
    return env[name] === "http";
  }
  return Boolean(env[name]);
}

function connectorAttentionReason(connectors) {
  if (
    connectors.some((connector) =>
      [
        "adapter_not_http",
        "missing_required_env",
        "engine_not_configured",
        "obs_manual_source_not_configured",
        "obs_setup_bridge_health_not_configured",
      ].includes(connector.attention_reason)
    )
  ) {
    return "connector_attention";
  }
  if (
    connectors.some((connector) =>
      ["local_target_policy_attention", "startup_step_attention"].includes(
        connector.attention_reason
      )
    )
  ) {
    return "local_target_policy_attention";
  }
  return "connector_attention";
}

function readinessStateForEnvGroup(group) {
  if (group.setup_status === "ready") return "ready";
  if (group.missing_required_env?.length > 0) return "configuration_waiting";
  if (group.attention_reason === "local_target_policy_attention") {
    return "operator_review_required";
  }
  if (
    ["real_tts_engine", "real_live2d_engine", "obs_overlay"].includes(
      group.env_group_id
    )
  ) {
    return "real_device_waiting";
  }
  return "configuration_waiting";
}

function readinessStateForConnectorAttention(connectors) {
  if (
    connectors.some((connector) =>
      ["local_target_policy_attention", "startup_step_attention"].includes(
        connector.attention_reason
      )
    )
  ) {
    return "operator_review_required";
  }
  if (
    connectors.some((connector) =>
      ["engine_not_configured", "obs_manual_source_not_configured"].includes(
        connector.attention_reason
      )
    )
  ) {
    return "real_device_waiting";
  }
  return "configuration_waiting";
}

function assertEnvSetupGroupSafe(group, context, expectedOrder) {
  if (!group || typeof group !== "object" || Array.isArray(group)) {
    throw new ContractError(`${context}: invalid env group`);
  }
  if (group.schema !== "iris_foundation_env_setup_group_v1") {
    throw new ContractError(`${context}: invalid env group schema`);
  }
  if (group.sequence_order !== expectedOrder) {
    throw new ContractError(`${context}: invalid env group order`);
  }
  if (!ENV_GROUP_IDS.has(group.env_group_id)) {
    throw new ContractError(`${context}: invalid env group id`);
  }
  if (!ENV_GROUP_KINDS.has(group.env_group_kind)) {
    throw new ContractError(`${context}: invalid env group kind`);
  }
  if (!GROUP_STATUSES.has(group.setup_status)) {
    throw new ContractError(`${context}: invalid setup status`);
  }
  assertSafeReadinessState(group.readiness_state, context);
  if (group.readiness_state !== readinessStateForEnvGroup(group)) {
    throw new ContractError(`${context}: invalid env group readiness state`);
  }
  if (!ATTENTION_REASONS.has(group.attention_reason)) {
    throw new ContractError(`${context}: invalid attention reason`);
  }
  if ((group.setup_status === "ready") !== (group.attention_reason === "ready")) {
    throw new ContractError(`${context}: invalid attention status pairing`);
  }
  for (const field of [
    "required_env",
    "optional_env",
    "configured_required_env",
    "missing_required_env",
    "next_configure_env",
  ]) {
    assertEnvNameListSafe(group[field], `${context}: ${field}`);
  }
  if (
    group.setup_status === "ready" &&
    (group.missing_required_env.length !== 0 ||
      group.next_configure_env.length !== 0 ||
      group.connector_attention_count !== 0)
  ) {
    throw new ContractError(`${context}: ready group has attention details`);
  }
  assertConnectorRefListSafe(group.connector_refs, `${context}: connector refs`);
  assertNonNegativeInteger(
    group.connector_ready_count,
    `${context}: invalid connector ready count`
  );
  assertNonNegativeInteger(
    group.connector_attention_count,
    `${context}: invalid connector attention count`
  );
  if (
    group.connector_ready_count + group.connector_attention_count !==
    group.connector_refs.length
  ) {
    throw new ContractError(`${context}: invalid connector count summary`);
  }
  assertSafeScriptName(group.launch_script, `${context}: launch script`);
  assertSafeScriptName(group.readiness_script, `${context}: readiness script`);
  assertGuidanceLabelListSafe(group.guidance_labels, `${context}: guidance labels`);
  for (const field of ["blocks_runtime_handoff", "blocks_obs_pickup"]) {
    if (typeof group[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertBoundaryPolicy(
    group.boundary_policy,
    [
      "env_names_only",
      "script_names_only",
      "connector_ids_only",
      "guidance_labels_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "read_only_env_group",
    ],
    `${context}: env group boundary policy`
  );
  if (group.adapter_validation_required !== true) {
    throw new ContractError(`${context}: env group validation required`);
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

function assertConnectorRefListSafe(value, context) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ContractError(`${context}: connector refs are required`);
  }
  for (const connectorId of value) {
    if (!CONNECTOR_IDS.has(connectorId)) {
      throw new ContractError(`${context}: invalid connector id`);
    }
  }
}

function assertGuidanceLabelListSafe(value, context) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ContractError(`${context}: guidance labels are required`);
  }
  for (const label of value) {
    assertSafePublicLabel(label, context);
    if (!GUIDANCE_LABELS.has(label)) {
      throw new ContractError(`${context}: unknown guidance label`);
    }
  }
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_foundation_env_setup_plan_scripts_v1") {
    throw new ContractError(`${context}: invalid verification scripts schema`);
  }
  for (const [field, value] of Object.entries(scripts)) {
    if (field === "schema") continue;
    assertSafeScriptName(value, `${context}: ${field}`);
  }
}

function uniqueEnvNames(names) {
  return [...new Set(names.filter(Boolean))];
}

function assertEnvNameListSafe(value, context) {
  if (!Array.isArray(value)) {
    throw new ContractError(`${context}: env list must be an array`);
  }
  for (const item of value) {
    if (typeof item !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(item)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
}

function assertSafeScriptName(value, context) {
  if (
    typeof value !== "string" ||
    !/^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      value
    )
  ) {
    throw new ContractError(`${context}: invalid script name`);
  }
  if (/[;&|<>]/.test(value)) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function assertSafePublicLabel(value, context) {
  if (typeof value !== "string" || value.length === 0 || value.length > 120) {
    throw new ContractError(`${context}: invalid public label`);
  }
  if (UNSAFE_LABEL_PATTERN.test(value)) {
    throw new ContractError(`${context}: unsafe public label`);
  }
  if (!/^[a-z0-9_.:-]+$/.test(value)) {
    throw new ContractError(`${context}: invalid public label shape`);
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

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function assertNoForbiddenFoundationEnvSetupFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFoundationEnvSetupFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FOUNDATION_ENV_SETUP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe field`, { field, path });
    }
    assertNoForbiddenFoundationEnvSetupFields(child, context, `${path}.${field}`);
  }
}

function assertNoUrlStrings(value, context, path = "root") {
  if (typeof value === "string") {
    if (URL_PATTERN.test(value)) {
      throw new ContractError(`${context}: endpoint values must not be exposed`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUrlStrings(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUrlStrings(child, context, `${path}.${field}`);
  }
}
