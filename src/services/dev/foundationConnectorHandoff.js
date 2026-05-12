import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationStatusReportSafe,
  createFoundationStatusReport,
} from "./foundationStatus.js";
import {
  assertFoundationStartupChecklistSafe,
  createFoundationStartupChecklist,
} from "./foundationStartupChecklist.js";
import {
  assertIntegrationContractsSafe,
  createIntegrationContracts,
} from "./integrationContracts.js";

const FORBIDDEN_FOUNDATION_CONNECTOR_HANDOFF_FIELDS = new Set([
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

const HANDOFF_STATUSES = new Set([
  "ready_for_foundation_connector_handoff",
  "configure_foundation_connectors_first",
]);
const CONNECTOR_KINDS = new Set([
  "runtime_adapter",
  "local_bridge",
  "worker",
  "real_engine",
  "obs_overlay",
  "obs_setup_bridge",
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
const CONNECTOR_STATUSES = new Set(["ready", "attention"]);
const ATTENTION_REASONS = new Set([
  "ready",
  "adapter_not_http",
  "missing_required_env",
  "local_target_policy_attention",
  "startup_step_attention",
  "engine_not_configured",
  "obs_manual_source_not_configured",
  "obs_setup_bridge_optional",
  "obs_setup_bridge_health_not_configured",
]);
const LOCAL_ENDPOINT_POLICY_STATUSES = new Set([
  "all_allowed",
  "blocked",
  "not_configured",
  "not_applicable",
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

const FOUNDATION_CONNECTOR_HANDOFF_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "handoff_status",
  "foundation_readiness_status",
  "startup_checklist_status",
  "startup_checklist_script",
  "connector_count",
  "ready_connector_count",
  "attention_connector_count",
  "blocking_connector_count",
  "next_readiness_state",
  "readiness_state_counts",
  "next_connector_id",
  "next_connector_kind",
  "next_attention_reason",
  "next_launch_script",
  "next_readiness_script",
  "next_configure_env",
  "connectors",
  "contract_manifest_refs",
  "verification_scripts",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);

const FOUNDATION_CONNECTOR_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "connector_handoff_report_only",
  "real_processes_not_started_by_report",
  "real_tts_live2d_engines_not_called_by_report",
  "obs_not_operated_by_report",
  "runtime_packets_remain_adapter_gated",
  "endpoint_values_not_exposed",
  "secret_values_not_exposed",
  "handoff_status",
  "next_connector_id",
  "next_readiness_state",
  "readiness_state_counts",
]);

export function createFoundationConnectorHandoff({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const foundationStatus = createFoundationStatusReport({ env, generatedAtMs });
  const startupChecklist = createFoundationStartupChecklist({ env, generatedAtMs });
  const contracts = createIntegrationContracts({ generatedAtMs });
  assertFoundationStatusReportSafe(
    foundationStatus,
    "foundation connector handoff foundation status input"
  );
  assertFoundationStartupChecklistSafe(
    startupChecklist,
    "foundation connector handoff startup checklist input"
  );
  assertIntegrationContractsSafe(
    contracts,
    "foundation connector handoff contract input"
  );

  const integrationMap = new Map(
    foundationStatus.foundation_integrations.map((item) => [
      item.integration,
      item,
    ])
  );
  const summary = foundationStatus.foundation_summary;
  const checklistStepMap = new Map(
    startupChecklist.steps.map((step) => [step.process_id, step])
  );
  const ttsEndpointEnv = env.IRIS_TTS_ENDPOINT
    ? "IRIS_TTS_ENDPOINT"
    : "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT";
  const live2dEndpointEnv = env.IRIS_LIVE2D_ENDPOINT
    ? "IRIS_LIVE2D_ENDPOINT"
    : "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT";
  const subtitleEndpointEnv = env.IRIS_SUBTITLE_ENDPOINT
    ? "IRIS_SUBTITLE_ENDPOINT"
    : "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT";
  const connectors = [
    buildRuntimeAdapterConnector({
      env,
      integration: integrationMap.get("tts_bridge"),
      connectorId: "runtime_tts_adapter",
      sequenceOrder: 1,
      adapterEnv: "IRIS_TTS_ADAPTER",
      endpointEnv: ttsEndpointEnv,
      optionalEnv: [
        "IRIS_TTS_ENDPOINT",
        "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT",
        "IRIS_TTS_API_KEY",
        "IRIS_TTS_TIMEOUT_MS",
      ],
      adapterKind: "tts",
    }),
    buildRuntimeAdapterConnector({
      env,
      integration: integrationMap.get("live2d_bridge"),
      connectorId: "runtime_live2d_adapter",
      sequenceOrder: 2,
      adapterEnv: "IRIS_LIVE2D_ADAPTER",
      endpointEnv: live2dEndpointEnv,
      optionalEnv: [
        "IRIS_LIVE2D_ENDPOINT",
        "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT",
        "IRIS_LIVE2D_API_KEY",
        "IRIS_LIVE2D_TIMEOUT_MS",
      ],
      adapterKind: "live2d",
    }),
    buildRuntimeAdapterConnector({
      env,
      integration: integrationMap.get("subtitle_bridge"),
      connectorId: "runtime_subtitle_adapter",
      sequenceOrder: 3,
      adapterEnv: "IRIS_SUBTITLE_ADAPTER",
      endpointEnv: subtitleEndpointEnv,
      optionalEnv: [
        "IRIS_SUBTITLE_ENDPOINT",
        "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT",
        "IRIS_SUBTITLE_API_KEY",
        "IRIS_SUBTITLE_TIMEOUT_MS",
      ],
      adapterKind: "subtitle",
    }),
    buildStartupConnector({
      env,
      connectorId: "local_adapter_bridge",
      connectorKind: "local_bridge",
      sequenceOrder: 4,
      step: checklistStepMap.get("local_adapter_bridge"),
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
      contractSchema: "iris_local_bridge_health_contract_v1",
      requestSchema: "iris_adapter_packet_v1",
      healthSchema: "iris_local_bridge_health_v1",
      localEndpointPolicyStatus:
        integrationMap.get("local_bridge_engine_worker")?.local_endpoint_policy_status ??
        "not_configured",
      blocksRuntimeHandoff: true,
      blocksObsPickup: true,
    }),
    buildStartupConnector({
      env,
      connectorId: "local_bridge_worker",
      connectorKind: "worker",
      sequenceOrder: 5,
      step: checklistStepMap.get("local_bridge_worker"),
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
      contractSchema: "iris_local_engine_worker_contract_v1",
      requestSchema: "iris_local_tts_engine_request_v1",
      secondaryRequestSchema: "iris_local_live2d_engine_request_v1",
      healthSchema: "iris_local_bridge_health_v1",
      localEndpointPolicyStatus:
        integrationMap.get("local_bridge_engine_worker")?.local_endpoint_policy_status ??
        "not_configured",
      blocksRuntimeHandoff: true,
      blocksObsPickup: true,
    }),
    buildStartupConnector({
      env,
      connectorId: "iris_dev_server",
      connectorKind: "local_bridge",
      sequenceOrder: 6,
      step: checklistStepMap.get("iris_dev_server"),
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
      contractSchema: "iris_http_server_foundation_handoff_v1",
      requestSchema: "iris_runtime_adapter_handoff_v1",
      healthSchema: "iris_http_health_v1",
      localEndpointPolicyStatus: summary.http_origin_configured
        ? "all_allowed"
        : "not_configured",
      blocksRuntimeHandoff: true,
      blocksObsPickup: false,
    }),
    buildEngineConnector({
      env,
      connectorId: "real_tts_engine",
      sequenceOrder: 7,
      ready: summary.real_tts_engine_configured,
      requiredEnv: [
        "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
        "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
      ],
      optionalEnv: [
        "IRIS_LOCAL_TTS_ENGINE_API_KEY",
        "IRIS_LOCAL_TTS_ENGINE_VOICE_ID",
        "IRIS_LOCAL_TTS_ENGINE_MODEL",
        "IRIS_LOCAL_TTS_ENGINE_LOCALE",
      ],
      requestSchema: "iris_local_tts_engine_request_v1",
      healthSchema: "iris_local_engine_health_contract_v1",
      readinessScript: "npm run dev:engine:probe",
    }),
    buildEngineConnector({
      env,
      connectorId: "real_live2d_engine",
      sequenceOrder: 8,
      ready: summary.real_live2d_engine_configured,
      requiredEnv: [
        "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
        "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
      ],
      optionalEnv: [
        "IRIS_LOCAL_LIVE2D_ENGINE_API_KEY",
        "IRIS_LOCAL_LIVE2D_MODEL_ID",
        "IRIS_LOCAL_LIVE2D_SCENE_ID",
      ],
      requestSchema: "iris_local_live2d_engine_request_v1",
      healthSchema: "iris_local_engine_health_contract_v1",
      readinessScript: "npm run dev:engine:probe",
    }),
    buildObsBrowserSourceConnector({
      env,
      summary,
      step: checklistStepMap.get("obs_browser_source_setup"),
      sequenceOrder: 9,
    }),
    buildObsSetupBridgeConnector({
      env,
      summary,
      sequenceOrder: 10,
    }),
    buildObsSetupBridgeHealthConnector({
      env,
      summary,
      sequenceOrder: 11,
    }),
  ];
  const nextConnector = connectors.find((connector) => connector.ready !== true) ?? null;
  const readyConnectorCount = connectors.filter((connector) => connector.ready).length;
  const nextReadinessState =
    nextConnector === null ? "ready" : nextConnector.readiness_state;
  const readinessStateCounts = countReadinessStates(connectors);
  const handoff = {
    schema: "iris_foundation_connector_handoff_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "tts_live2d_obs_foundation",
    target_stage_priority: 1,
    handoff_status:
      nextConnector === null
        ? "ready_for_foundation_connector_handoff"
        : "configure_foundation_connectors_first",
    foundation_readiness_status: foundationStatus.foundation_readiness_status,
    startup_checklist_status: startupChecklist.checklist_status,
    startup_checklist_script: "npm run dev:foundation:startup-checklist",
    connector_count: connectors.length,
    ready_connector_count: readyConnectorCount,
    attention_connector_count: connectors.length - readyConnectorCount,
    blocking_connector_count: connectors.filter(
      (connector) => connector.blocks_runtime_handoff && connector.ready !== true
    ).length,
    next_readiness_state: nextReadinessState,
    readiness_state_counts: readinessStateCounts,
    next_connector_id: nextConnector?.connector_id ?? null,
    next_connector_kind: nextConnector?.connector_kind ?? null,
    next_attention_reason: nextConnector?.attention_reason ?? null,
    next_launch_script: nextConnector?.launch_script ?? null,
    next_readiness_script: nextConnector?.readiness_script ?? null,
    next_configure_env: nextConnector?.next_configure_env ?? [],
    connectors,
    contract_manifest_refs: {
      schema: "iris_foundation_connector_contract_refs_v1",
      integration_contracts_script: "npm run dev:probe",
      integration_contracts_http_path: "/integrations/contracts",
      foundation_status_script: "npm run dev:foundation:status",
      foundation_runtime_status_script: "npm run dev:foundation:runtime-status",
      foundation_live_readiness_script: "npm run dev:foundation:live-readiness",
      foundation_connector_handoff_script:
        "npm run dev:foundation:connector-handoff",
      local_engine_request_schemas:
        contracts.local_engine_worker.engine_request_schemas,
      adapter_packet_schema: "iris_adapter_packet_v1",
      obs_setup_schema: "iris_obs_bridge_setup_request_v1",
      event_render_manifest_schema: "iris_local_bridge_event_render_manifest_v1",
      boundary_policy: {
        script_names_only: true,
        route_paths_only: true,
        schema_names_only: true,
        env_names_only: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
      },
    },
    verification_scripts: {
      schema: "iris_foundation_connector_handoff_scripts_v1",
      connector_handoff_script: "npm run dev:foundation:connector-handoff",
      foundation_status_script: "npm run dev:foundation:status",
      foundation_startup_checklist_script:
        "npm run dev:foundation:startup-checklist",
      foundation_runtime_status_script: "npm run dev:foundation:runtime-status",
      foundation_live_readiness_script: "npm run dev:foundation:live-readiness",
      integration_contracts_script: "npm run dev:probe",
      local_bridge_status_script: "npm run dev:bridge:status-roundtrip",
      engine_probe_script: "npm run dev:engine:probe",
      obs_probe_script: "npm run dev:obs:probe",
      obs_browser_source_script: "npm run dev:obs:browser-source",
      obs_runtime_render_roundtrip_script:
        "npm run dev:obs:runtime-render-roundtrip",
      production_next_task_script: "npm run dev:production:next-task",
      production_probe_script: "npm run dev:production:probe",
    },
    production_handoff_summary: {
      schema: "iris_foundation_connector_handoff_production_summary_v1",
      connector_handoff_report_only: true,
      real_processes_not_started_by_report: true,
      real_tts_live2d_engines_not_called_by_report: true,
      obs_not_operated_by_report: true,
      runtime_packets_remain_adapter_gated: true,
      endpoint_values_not_exposed: true,
      secret_values_not_exposed: true,
      handoff_status:
        nextConnector === null
          ? "ready_for_foundation_connector_handoff"
          : "configure_foundation_connectors_first",
      next_connector_id: nextConnector?.connector_id ?? null,
      next_readiness_state: nextReadinessState,
      readiness_state_counts: readinessStateCounts,
    },
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      schema_names_only: true,
      route_paths_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_raw_packets: true,
      no_job_payloads: true,
      read_only_connector_handoff: true,
    },
    adapter_validation_required: true,
  };
  assertFoundationConnectorHandoffSafe(handoff);
  return handoff;
}

export function assertFoundationConnectorHandoffSafe(
  handoff,
  context = "foundation connector handoff"
) {
  if (!handoff || typeof handoff !== "object" || Array.isArray(handoff)) {
    throw new ContractError(`${context}: handoff is required`);
  }
  assertNoForbiddenFoundationConnectorHandoffFields(handoff, context);
  assertNoUrlStrings(handoff, context);
  if (handoff.schema !== "iris_foundation_connector_handoff_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(handoff)) {
    if (!FOUNDATION_CONNECTOR_HANDOFF_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected handoff field`, { field });
    }
  }
  if (!Number.isInteger(handoff.generated_at_ms) || handoff.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (handoff.target_stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (handoff.target_stage_priority !== 1) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!HANDOFF_STATUSES.has(handoff.handoff_status)) {
    throw new ContractError(`${context}: invalid handoff status`);
  }
  if (
    !["ready_for_runtime_handoff", "attention_required"].includes(
      handoff.foundation_readiness_status
    )
  ) {
    throw new ContractError(`${context}: invalid foundation readiness status`);
  }
  if (
    ![
      "ready_to_follow_startup_checklist",
      "configure_foundation_startup_env_first",
    ].includes(handoff.startup_checklist_status)
  ) {
    throw new ContractError(`${context}: invalid startup checklist status`);
  }
  assertSafeScriptName(
    handoff.startup_checklist_script,
    `${context}: startup checklist script`
  );
  if (!Array.isArray(handoff.connectors) || handoff.connectors.length === 0) {
    throw new ContractError(`${context}: connectors are required`);
  }
  handoff.connectors.forEach((connector, index) =>
    assertConnectorHandoffItemSafe(connector, context, index + 1)
  );
  const ids = new Set(handoff.connectors.map((connector) => connector.connector_id));
  if (ids.size !== handoff.connectors.length) {
    throw new ContractError(`${context}: duplicate connector id`);
  }
  for (const field of [
    "connector_count",
    "ready_connector_count",
    "attention_connector_count",
    "blocking_connector_count",
  ]) {
    if (!Number.isInteger(handoff[field]) || handoff[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (handoff.connector_count !== handoff.connectors.length) {
    throw new ContractError(`${context}: invalid connector count`);
  }
  if (
    handoff.ready_connector_count !==
    handoff.connectors.filter((connector) => connector.ready).length
  ) {
    throw new ContractError(`${context}: invalid ready connector count`);
  }
  if (
    handoff.attention_connector_count !==
    handoff.connectors.filter((connector) => connector.ready !== true).length
  ) {
    throw new ContractError(`${context}: invalid attention connector count`);
  }
  if (
    handoff.blocking_connector_count !==
    handoff.connectors.filter(
      (connector) => connector.blocks_runtime_handoff && connector.ready !== true
    ).length
  ) {
    throw new ContractError(`${context}: invalid blocking connector count`);
  }
  const firstAttentionConnector =
    handoff.connectors.find((connector) => connector.ready !== true) ?? null;
  assertSafeReadinessState(handoff.next_readiness_state, context);
  assertReadinessStateCountsSafe(handoff.readiness_state_counts, context);
  if (
    handoff.next_readiness_state !==
      (firstAttentionConnector?.readiness_state ?? "ready") ||
    !sameReadinessStateCounts(
      handoff.readiness_state_counts,
      countReadinessStates(handoff.connectors)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness labels`);
  }
  if (firstAttentionConnector === null) {
    if (
      handoff.handoff_status !== "ready_for_foundation_connector_handoff" ||
      handoff.next_connector_id !== null ||
      handoff.next_connector_kind !== null ||
      handoff.next_attention_reason !== null ||
      handoff.next_launch_script !== null ||
      handoff.next_readiness_script !== null ||
      !Array.isArray(handoff.next_configure_env) ||
      handoff.next_configure_env.length !== 0
    ) {
      throw new ContractError(`${context}: unexpected next connector`);
    }
  } else {
    if (
      handoff.handoff_status !== "configure_foundation_connectors_first" ||
      handoff.next_connector_id !== firstAttentionConnector.connector_id ||
      handoff.next_connector_kind !== firstAttentionConnector.connector_kind ||
      handoff.next_attention_reason !== firstAttentionConnector.attention_reason ||
      handoff.next_launch_script !== firstAttentionConnector.launch_script ||
      handoff.next_readiness_script !== firstAttentionConnector.readiness_script ||
      JSON.stringify(handoff.next_configure_env) !==
        JSON.stringify(firstAttentionConnector.next_configure_env)
    ) {
      throw new ContractError(`${context}: invalid next connector`);
    }
  }
  assertEnvNameListSafe(handoff.next_configure_env, `${context}: next configure env`);
  assertConnectorContractRefsSafe(handoff.contract_manifest_refs, context);
  assertConnectorVerificationScriptsSafe(handoff.verification_scripts, context);
  assertProductionHandoffSummarySafe(
    handoff.production_handoff_summary,
    handoff,
    context
  );
  assertBoundaryPolicy(
    handoff.boundary_policy,
    [
      "env_names_only",
      "script_names_only",
      "schema_names_only",
      "route_paths_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "no_raw_packets",
      "no_job_payloads",
      "read_only_connector_handoff",
    ],
    `${context}: boundary policy`
  );
  if (handoff.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function buildRuntimeAdapterConnector({
  env,
  integration,
  connectorId,
  sequenceOrder,
  adapterEnv,
  endpointEnv,
  optionalEnv,
  adapterKind,
}) {
  const requiredEnv = [adapterEnv, endpointEnv];
  const mode = env[adapterEnv] ?? "console";
  const localEndpointPolicyStatus =
    integration?.local_endpoint_policy_status ??
    (mode === "http" ? "not_configured" : "not_applicable");
  const ready =
    mode === "http" &&
    integration?.status === "configured" &&
    localEndpointPolicyStatus === "all_allowed";
  const attentionReason =
    ready
      ? "ready"
      : mode !== "http"
        ? "adapter_not_http"
        : missingEnv(requiredEnv, env).length > 0
          ? "missing_required_env"
          : localEndpointPolicyStatus === "blocked"
            ? "local_target_policy_attention"
            : "startup_step_attention";
  return buildConnectorItem({
    connectorId,
    connectorKind: "runtime_adapter",
    sequenceOrder,
    mode,
    ready,
    attentionReason,
    requiredEnv,
    optionalEnv,
    configuredRequiredEnv: configuredEnv(requiredEnv, env),
    missingRequiredEnv: missingEnv(requiredEnv, env),
    launchScript: "npm run dev:server",
    readinessScript: "npm run dev:probe",
    contractSchema: "iris_adapter_packet_contract_v1",
    requestSchema: "iris_adapter_packet_v1",
    healthSchema: null,
    adapterKind,
    localEndpointPolicyStatus,
    blocksRuntimeHandoff: true,
    blocksObsPickup: false,
  });
}

function buildStartupConnector({
  env,
  connectorId,
  connectorKind,
  sequenceOrder,
  step,
  requiredEnv,
  optionalEnv,
  contractSchema,
  requestSchema,
  secondaryRequestSchema = null,
  healthSchema,
  localEndpointPolicyStatus,
  blocksRuntimeHandoff,
  blocksObsPickup,
}) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`foundation connector handoff ${connectorId}: startup step is required`);
  }
  const ready = step.ready_to_start === true;
  return buildConnectorItem({
    connectorId,
    connectorKind,
    sequenceOrder,
    mode: step.startup_kind,
    ready,
    attentionReason: ready ? "ready" : "startup_step_attention",
    requiredEnv,
    optionalEnv,
    configuredRequiredEnv: requiredEnv.filter(
      (name) => !step.missing_required_env.includes(name)
    ),
    missingRequiredEnv: step.missing_required_env,
    launchScript: step.launch_script,
    readinessScript: step.readiness_script,
    contractSchema,
    requestSchema,
    secondaryRequestSchema,
    healthSchema,
    adapterKind: null,
    localEndpointPolicyStatus,
    blocksRuntimeHandoff,
    blocksObsPickup,
  });
}

function buildEngineConnector({
  env,
  connectorId,
  sequenceOrder,
  ready,
  requiredEnv,
  optionalEnv,
  requestSchema,
  healthSchema,
  readinessScript,
}) {
  return buildConnectorItem({
    connectorId,
    connectorKind: "real_engine",
    sequenceOrder,
    mode: ready ? "http" : "not_configured",
    ready,
    attentionReason:
      ready
        ? "ready"
        : missingEnv(requiredEnv, env).length > 0
          ? "missing_required_env"
          : "engine_not_configured",
    requiredEnv,
    optionalEnv,
    configuredRequiredEnv: configuredEnv(requiredEnv, env),
    missingRequiredEnv: missingEnv(requiredEnv, env),
    launchScript: null,
    readinessScript,
    contractSchema: "iris_local_engine_worker_contract_v1",
    requestSchema,
    healthSchema,
    adapterKind: null,
    localEndpointPolicyStatus: ready ? "all_allowed" : "not_configured",
    blocksRuntimeHandoff: true,
    blocksObsPickup: true,
  });
}

function buildObsBrowserSourceConnector({ env, summary, step, sequenceOrder }) {
  const obsSetupBridgeConfigured = Boolean(env.IRIS_OBS_BRIDGE_ENDPOINT);
  const obsBrowserSourceConfigured = Boolean(env.IRIS_HTTP_ORIGIN);
  const requiredEnv = obsSetupBridgeConfigured ? [] : ["IRIS_HTTP_ORIGIN"];
  const ready = obsSetupBridgeConfigured || obsBrowserSourceConfigured;
  return buildConnectorItem({
    connectorId: "obs_browser_source",
    connectorKind: "obs_overlay",
    sequenceOrder,
    mode: "browser_source_manual",
    ready,
    attentionReason: ready ? "ready" : "obs_manual_source_not_configured",
    requiredEnv,
    optionalEnv: step?.optional_env ?? [],
    configuredRequiredEnv: configuredEnv(requiredEnv, env),
    missingRequiredEnv: missingEnv(requiredEnv, env),
    launchScript: "npm run dev:obs:browser-source",
    readinessScript: "npm run dev:obs:render-handoff-roundtrip",
    contractSchema: "iris_obs_overlay_contract_v1",
    requestSchema: "iris_overlay_display_event_v1",
    healthSchema: "iris_overlay_status_v1",
    adapterKind: null,
    localEndpointPolicyStatus: ready ? "all_allowed" : "not_configured",
    blocksRuntimeHandoff: true,
    blocksObsPickup: true,
  });
}

function buildObsSetupBridgeConnector({ env, summary, sequenceOrder }) {
  const configured = Boolean(env.IRIS_OBS_BRIDGE_ENDPOINT);
  const manualSourceReady = Boolean(env.IRIS_HTTP_ORIGIN);
  const requiredEnv = configured ? ["IRIS_OBS_BRIDGE_ENDPOINT"] : [];
  return buildConnectorItem({
    connectorId: "obs_setup_bridge",
    connectorKind: "obs_setup_bridge",
    sequenceOrder,
    mode: configured ? "http_setup" : "manual_optional",
    ready: configured || manualSourceReady,
    attentionReason: configured || manualSourceReady ? "ready" : "obs_setup_bridge_optional",
    requiredEnv,
    optionalEnv: [
      "IRIS_OBS_BRIDGE_ENDPOINT",
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
    configuredRequiredEnv: configuredEnv(requiredEnv, env),
    missingRequiredEnv: missingEnv(requiredEnv, env),
    launchScript: "npm run dev:obs:setup",
    readinessScript: "npm run dev:obs:probe",
    contractSchema: "iris_obs_bridge_contract_v1",
    requestSchema: "iris_obs_bridge_setup_request_v1",
    healthSchema: "iris_obs_bridge_health_contract_v1",
    adapterKind: null,
    localEndpointPolicyStatus: configured ? "all_allowed" : "not_configured",
    blocksRuntimeHandoff: false,
    blocksObsPickup: false,
  });
}

function buildObsSetupBridgeHealthConnector({ env, summary, sequenceOrder }) {
  const setupBridgeConfigured = Boolean(env.IRIS_OBS_BRIDGE_ENDPOINT);
  const requiredEnv = setupBridgeConfigured ? ["IRIS_OBS_BRIDGE_HEALTH_ENDPOINT"] : [];
  const ready =
    setupBridgeConfigured !== true ||
    Boolean(env.IRIS_OBS_BRIDGE_HEALTH_ENDPOINT);
  return buildConnectorItem({
    connectorId: "obs_setup_bridge_health",
    connectorKind: "obs_setup_bridge",
    sequenceOrder,
    mode: ready && setupBridgeConfigured ? "health_probe" : "not_configured",
    ready,
    attentionReason: ready ? "ready" : "obs_setup_bridge_health_not_configured",
    requiredEnv,
    optionalEnv: ["IRIS_OBS_BRIDGE_API_KEY", "IRIS_OBS_BRIDGE_TIMEOUT_MS"],
    configuredRequiredEnv: configuredEnv(requiredEnv, env),
    missingRequiredEnv: missingEnv(requiredEnv, env),
    launchScript: null,
    readinessScript: "npm run dev:obs:probe",
    contractSchema: "iris_obs_bridge_health_contract_v1",
    requestSchema: null,
    healthSchema: "iris_obs_bridge_health_contract_v1",
    adapterKind: null,
    localEndpointPolicyStatus: ready ? "all_allowed" : "not_configured",
    blocksRuntimeHandoff: false,
    blocksObsPickup: false,
  });
}

function buildConnectorItem({
  connectorId,
  connectorKind,
  sequenceOrder,
  mode,
  ready,
  attentionReason,
  requiredEnv,
  optionalEnv,
  configuredRequiredEnv,
  missingRequiredEnv,
  launchScript,
  readinessScript,
  contractSchema,
  requestSchema,
  secondaryRequestSchema = null,
  healthSchema,
  adapterKind,
  localEndpointPolicyStatus,
  blocksRuntimeHandoff,
  blocksObsPickup,
}) {
  const connectorStatus = ready ? "ready" : "attention";
  return {
    schema: "iris_foundation_connector_handoff_item_v1",
    sequence_order: sequenceOrder,
    connector_id: connectorId,
    connector_kind: connectorKind,
    mode,
    ready,
    connector_status: connectorStatus,
    readiness_state: readinessStateForConnector({
      connectorId,
      connectorKind,
      ready,
      connector_status: connectorStatus,
      attentionReason,
      missingRequiredEnv,
      localEndpointPolicyStatus,
    }),
    attention_reason: attentionReason,
    required_env: uniqueEnvNames(requiredEnv),
    optional_env: uniqueEnvNames(optionalEnv),
    configured_required_env: uniqueEnvNames(configuredRequiredEnv),
    missing_required_env: uniqueEnvNames(missingRequiredEnv),
    next_configure_env: ready ? [] : uniqueEnvNames(missingRequiredEnv),
    launch_script: launchScript,
    readiness_script: readinessScript,
    contract_schema: contractSchema,
    request_schema: requestSchema,
    secondary_request_schema: secondaryRequestSchema,
    health_schema: healthSchema,
    adapter_kind: adapterKind,
    local_endpoint_policy_status: localEndpointPolicyStatus,
    blocks_runtime_handoff: blocksRuntimeHandoff,
    blocks_obs_pickup: blocksObsPickup,
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      schema_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_connector: true,
    },
    adapter_validation_required: true,
  };
}

function assertConnectorHandoffItemSafe(item, context, expectedOrder) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: invalid connector`);
  }
  if (item.schema !== "iris_foundation_connector_handoff_item_v1") {
    throw new ContractError(`${context}: invalid connector schema`);
  }
  if (item.sequence_order !== expectedOrder) {
    throw new ContractError(`${context}: invalid connector order`);
  }
  if (!CONNECTOR_IDS.has(item.connector_id)) {
    throw new ContractError(`${context}: invalid connector id`);
  }
  if (!CONNECTOR_KINDS.has(item.connector_kind)) {
    throw new ContractError(`${context}: invalid connector kind`);
  }
  assertSafePublicLabel(item.mode, `${context}: connector mode`);
  if (typeof item.ready !== "boolean") {
    throw new ContractError(`${context}: invalid ready flag`);
  }
  if (!CONNECTOR_STATUSES.has(item.connector_status)) {
    throw new ContractError(`${context}: invalid connector status`);
  }
  assertSafeReadinessState(item.readiness_state, context);
  if (item.readiness_state !== readinessStateForConnector(item)) {
    throw new ContractError(`${context}: invalid connector readiness state`);
  }
  if ((item.connector_status === "ready") !== item.ready) {
    throw new ContractError(`${context}: connector status must match ready flag`);
  }
  if (!ATTENTION_REASONS.has(item.attention_reason)) {
    throw new ContractError(`${context}: invalid attention reason`);
  }
  if (item.ready && item.attention_reason !== "ready") {
    throw new ContractError(`${context}: ready connector must use ready reason`);
  }
  for (const field of [
    "required_env",
    "optional_env",
    "configured_required_env",
    "missing_required_env",
    "next_configure_env",
  ]) {
    assertEnvNameListSafe(item[field], `${context}: ${field}`);
  }
  if (
    JSON.stringify(item.next_configure_env) !==
    JSON.stringify(item.ready ? [] : item.missing_required_env)
  ) {
    throw new ContractError(`${context}: invalid next configure env`);
  }
  for (const field of ["launch_script", "readiness_script"]) {
    if (item[field] !== null) {
      assertSafeScriptName(item[field], `${context}: ${field}`);
    }
  }
  for (const field of [
    "contract_schema",
    "request_schema",
    "secondary_request_schema",
    "health_schema",
    "adapter_kind",
  ]) {
    if (item[field] !== null) {
      assertSafePublicLabel(item[field], `${context}: ${field}`);
    }
  }
  if (!LOCAL_ENDPOINT_POLICY_STATUSES.has(item.local_endpoint_policy_status)) {
    throw new ContractError(`${context}: invalid local policy status`);
  }
  for (const field of ["blocks_runtime_handoff", "blocks_obs_pickup"]) {
    if (typeof item[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertBoundaryPolicy(
    item.boundary_policy,
    [
      "env_names_only",
      "script_names_only",
      "schema_names_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "read_only_connector",
    ],
    `${context}: connector boundary policy`
  );
  if (item.adapter_validation_required !== true) {
    throw new ContractError(`${context}: connector validation required`);
  }
}

function assertConnectorContractRefsSafe(refs, context) {
  if (!refs || typeof refs !== "object" || Array.isArray(refs)) {
    throw new ContractError(`${context}: contract refs are required`);
  }
  if (refs.schema !== "iris_foundation_connector_contract_refs_v1") {
    throw new ContractError(`${context}: invalid contract refs schema`);
  }
  for (const field of [
    "integration_contracts_script",
    "foundation_status_script",
    "foundation_runtime_status_script",
    "foundation_live_readiness_script",
    "foundation_connector_handoff_script",
  ]) {
    assertSafeScriptName(refs[field], `${context}: ${field}`);
  }
  if (refs.integration_contracts_http_path !== "/integrations/contracts") {
    throw new ContractError(`${context}: invalid contracts route`);
  }
  assertSafePublicLabel(refs.adapter_packet_schema, `${context}: adapter packet schema`);
  assertSafePublicLabel(refs.obs_setup_schema, `${context}: obs setup schema`);
  assertSafePublicLabel(
    refs.event_render_manifest_schema,
    `${context}: render manifest schema`
  );
  if (!Array.isArray(refs.local_engine_request_schemas)) {
    throw new ContractError(`${context}: local engine schemas are required`);
  }
  for (const schema of refs.local_engine_request_schemas) {
    assertSafePublicLabel(schema, `${context}: local engine schema`);
  }
  assertBoundaryPolicy(
    refs.boundary_policy,
    [
      "script_names_only",
      "route_paths_only",
      "schema_names_only",
      "env_names_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: contract refs boundary policy`
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

function assertConnectorVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_foundation_connector_handoff_scripts_v1") {
    throw new ContractError(`${context}: invalid scripts schema`);
  }
  for (const [field, value] of Object.entries(scripts)) {
    if (field === "schema") continue;
    assertSafeScriptName(value, `${context}: ${field}`);
  }
}

function assertProductionHandoffSummarySafe(summary, handoff, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_foundation_connector_handoff_production_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!FOUNDATION_CONNECTOR_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected production handoff field`, {
        field,
      });
    }
  }
  for (const field of [
    "connector_handoff_report_only",
    "real_processes_not_started_by_report",
    "real_tts_live2d_engines_not_called_by_report",
    "obs_not_operated_by_report",
    "runtime_packets_remain_adapter_gated",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (
    summary.handoff_status !== handoff.handoff_status ||
    summary.next_connector_id !== handoff.next_connector_id ||
    summary.next_readiness_state !== handoff.next_readiness_state ||
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      handoff.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: invalid production handoff summary`);
  }
  if (!HANDOFF_STATUSES.has(summary.handoff_status)) {
    throw new ContractError(`${context}: invalid production handoff status`);
  }
  if (
    summary.next_connector_id !== null &&
    !CONNECTOR_IDS.has(summary.next_connector_id)
  ) {
    throw new ContractError(`${context}: invalid production handoff connector`);
  }
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
}

function readinessStateForConnector(connector) {
  if (connector.connector_status === "ready") {
    return "ready";
  }
  if (connector.localEndpointPolicyStatus === "blocked") {
    return "operator_review_required";
  }
  if (connector.local_endpoint_policy_status === "blocked") {
    return "operator_review_required";
  }
  const missingCount = connector.missingRequiredEnv?.length ??
    connector.missing_required_env?.length ??
    0;
  if (missingCount > 0) return "configuration_waiting";
  if (
    [
      "real_tts_engine",
      "real_live2d_engine",
      "obs_browser_source",
      "local_bridge_worker",
    ].includes(connector.connectorId ?? connector.connector_id)
  ) {
    return "real_device_waiting";
  }
  if (
    ["startup_step_attention", "obs_manual_source_not_configured"].includes(
      connector.attentionReason ?? connector.attention_reason
    )
  ) {
    return "real_device_waiting";
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
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness count`);
    }
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

function configuredEnv(names, env) {
  return names.filter((name) => Boolean(env[name]));
}

function missingEnv(names, env) {
  return names.filter((name) => !env[name]);
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

function assertNoForbiddenFoundationConnectorHandoffFields(
  value,
  context,
  path = "root"
) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFoundationConnectorHandoffFields(
        item,
        context,
        `${path}[${index}]`
      )
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FOUNDATION_CONNECTOR_HANDOFF_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe field`, { field, path });
    }
    assertNoForbiddenFoundationConnectorHandoffFields(
      child,
      context,
      `${path}.${field}`
    );
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
