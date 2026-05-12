import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationLaunchPlanSafe,
  createFoundationLaunchPlan,
} from "./foundationLaunchPlan.js";
import {
  assertFoundationConnectorHandoffSafe,
  createFoundationConnectorHandoff,
} from "./foundationConnectorHandoff.js";
import {
  assertFoundationEnvSetupPlanSafe,
  createFoundationEnvSetupPlan,
} from "./foundationEnvSetupPlan.js";
import {
  assertFoundationRuntimeStatusReportSafe,
  createFoundationRuntimeStatusReport,
} from "./foundationRuntimeStatus.js";
import {
  assertProductionProbeReportSafe,
  createProductionProbeReport,
} from "./productionProbe.js";
import { ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES } from "./adminCharacterVoiceSettings.js";

const FORBIDDEN_FOUNDATION_LIVE_READINESS_FIELDS = new Set([
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
  "audio_url",
  "artifact_url",
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

const LIVE_READINESS_STATUSES = new Set([
  "configuration_attention",
  "runtime_handoff_attention",
  "configured_probe_attention",
  "ready_for_live_obs_operation",
]);
const GATE_IDS = new Set([
  "runtime_gate",
  "real_engine_gate",
  "obs_gate",
  "production_probe_gate",
]);
const CHECK_SCRIPTS = {
  runtime_gate: "npm run dev:foundation:runtime-status",
  real_engine_gate: "npm run dev:engine:probe",
  obs_gate: "npm run dev:obs:runtime-render-roundtrip",
  production_probe_gate: "npm run dev:production:probe",
};
const PROBE_MODES = new Set(["dry_run", "fixture_post"]);
const PRODUCTION_PROBE_VERIFICATION_STATUSES = new Set([
  "configuration_attention",
  "configured_probe_attention",
  "configured_probe_ready",
]);
const PRODUCTION_PROBE_READINESS_STATUSES = new Set([
  "ready_for_configured_production_probe",
  "attention_required",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const FOUNDATION_RUNTIME_STATUSES = new Set([
  "attention_required",
  "waiting_for_local_bridge_worker",
  "waiting_for_real_engine_handoff",
  "waiting_for_obs_browser_source",
  "waiting_for_overlay_runtime",
  "waiting_for_runtime_event",
  "waiting_for_overlay_event_stream",
  "waiting_for_obs_render_handoff",
  "ready_for_obs_runtime_handoff",
]);
const FLOW_STATUSES = new Set([
  "configuration_attention",
  "waiting_for_local_bridge_worker",
  "waiting_for_real_engine_handoff",
  "waiting_for_obs_browser_source",
  "waiting_for_overlay_runtime",
  "waiting_for_runtime_event",
  "waiting_for_overlay_event_stream",
  "waiting_for_obs_render_handoff",
  "ready_for_obs_runtime_handoff",
]);
const OBS_ARTIFACT_FLOW_STATUSES = new Set([
  "configuration_attention",
  "waiting_for_local_bridge_worker",
  "waiting_for_real_engine_handoff",
  "waiting_for_obs_browser_source",
  "waiting_for_runtime_event",
  "waiting_for_render_manifest_store",
  "waiting_for_render_manifest",
  "waiting_for_artifact_files",
  "waiting_for_artifact_contracts",
  "waiting_for_obs_pickup",
  "ready_for_obs_artifact_pickup",
]);
const REAL_ENGINE_GATE_STATUSES = new Set([
  "configuration_attention",
  "worker_unavailable",
  "waiting_for_real_engine_configuration",
  "waiting_for_worker_storage",
  "waiting_for_runtime_jobs",
  "work_pending",
  "retry_backoff",
  "operator_action_required",
  "worker_attention",
  "real_engine_worker_active",
  "configured_probe_attention",
  "ready",
]);
const REAL_ENGINE_HANDOFF_STATUSES = new Set([
  "not_configured",
  "ready_waiting_for_runtime_event",
  "work_pending",
  "retry_backoff",
  "operator_action_required",
  "active",
  "attention",
  "unavailable",
]);
const REAL_ENGINE_WORKER_FLOW_STATUSES = new Set([
  "configuration_attention",
  "worker_unavailable",
  "waiting_for_real_engine_configuration",
  "waiting_for_worker_storage",
  "waiting_for_runtime_jobs",
  "work_pending",
  "retry_backoff",
  "operator_action_required",
  "worker_attention",
  "real_engine_worker_active",
]);
const REAL_ENGINE_WORKER_BLOCKING_STAGES = new Set([
  "foundation_configuration",
  "worker_status",
  "real_engine_configuration",
  "worker_storage",
  "runtime_jobs",
  "worker_queue",
  "retry_backoff",
  "operator_action",
  "worker_attention",
  "none",
]);
const OBS_GATE_STATUSES = new Set([
  "configuration_attention",
  "waiting_for_local_bridge_worker",
  "waiting_for_real_engine_handoff",
  "waiting_for_obs_browser_source",
  "waiting_for_runtime_event",
  "waiting_for_render_manifest_store",
  "waiting_for_render_manifest",
  "waiting_for_artifact_files",
  "waiting_for_artifact_contracts",
  "waiting_for_obs_pickup",
  "ready_for_obs_artifact_pickup",
  "configured_probe_attention",
  "ready",
]);
const BLOCKING_STAGES = new Set([
  "foundation_configuration",
  "local_bridge_worker",
  "real_engine_handoff",
  "obs_browser_source",
  "overlay_runtime",
  "runtime_event",
  "overlay_event_stream",
  "render_handoff",
  "none",
]);
const OBS_ARTIFACT_BLOCKING_STAGES = new Set([
  "foundation_configuration",
  "local_bridge_worker",
  "real_engine_handoff",
  "obs_browser_source",
  "runtime_event",
  "render_manifest_store",
  "render_manifest",
  "artifact_availability",
  "artifact_contract",
  "obs_pickup",
  "none",
]);
const CHECK_STATUSES = new Set(["ready", "attention"]);
const PROBE_HEALTH_STATUSES = new Set([
  "pass",
  "attention",
  "health_endpoint_not_configured",
  "not_configured",
  "not_applicable",
]);
const CONNECTOR_HANDOFF_STATUSES = new Set([
  "ready_for_foundation_connector_handoff",
  "configure_foundation_connectors_first",
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
const CONNECTOR_KINDS = new Set([
  "runtime_adapter",
  "local_bridge",
  "worker",
  "real_engine",
  "obs_overlay",
  "obs_setup_bridge",
]);
const CONNECTOR_ATTENTION_REASONS = new Set([
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
const ENV_SETUP_PLAN_STATUSES = new Set([
  "ready_for_foundation_env_setup",
  "configure_foundation_env_first",
]);
const ENV_SETUP_GROUP_IDS = new Set([
  "runtime_http_adapters",
  "local_bridge_storage",
  "real_tts_engine",
  "real_live2d_engine",
  "local_bridge_worker",
  "iris_dev_server",
  "obs_overlay",
]);
const ENV_SETUP_GROUP_KINDS = new Set([
  "runtime_adapter_config",
  "local_bridge_config",
  "real_engine_config",
  "worker_config",
  "runtime_server_config",
  "obs_overlay_config",
]);
const ENV_SETUP_ATTENTION_REASONS = new Set([
  "ready",
  "missing_required_env",
  "connector_attention",
  "local_target_policy_attention",
]);
const FOUNDATION_STARTUP_PROCESS_IDS = new Set([
  "voicevox_tts_engine_bridge",
  "live2d_cue_engine_bridge",
  "local_adapter_bridge",
  "local_bridge_worker",
  "iris_dev_server",
  "obs_browser_source_setup",
]);
const OBS_PICKUP_STARTUP_STATES = new Set([
  "obs_pickup_startup_ready",
  "obs_pickup_startup_waiting",
]);
const URL_PATTERN = /https?:\/\//i;
const VOICE_LICENSE_USE_CATEGORY_ENV_NAMES =
  ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES;

const FOUNDATION_LIVE_READINESS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "live_readiness_status",
  "foundation_launch_plan_status",
  "env_setup_plan_summary",
  "connector_handoff_summary",
  "next_gate_id",
  "next_check_script",
  "next_readiness_state",
  "readiness_state_counts",
  "runtime_gate",
  "real_engine_gate",
  "obs_gate",
  "production_probe_gate",
  "obs_pickup_startup_summary",
  "production_handoff_summary",
  "verification_scripts",
  "boundary_policy",
  "adapter_validation_required",
]);

const FOUNDATION_LIVE_READINESS_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "live_readiness_check_only",
  "real_processes_not_started_by_report",
  "runtime_packets_remain_adapter_gated",
  "live_payloads_not_exposed",
  "artifact_locations_not_exposed",
  "next_gate_id",
  "next_check_script",
  "next_readiness_state",
  "readiness_state_counts",
  "runtime_gate_ready",
  "real_engine_gate_ready",
  "obs_gate_ready",
  "production_probe_gate_ready",
  "local_bridge_worker_required",
  "real_engine_health_required",
  "render_manifest_required_for_obs_pickup",
  "obs_pickup_required",
  "obs_pickup_startup_summary",
]);

export async function createFoundationLiveReadinessReport({
  env = process.env,
  streamState = null,
  overlayEventBus = null,
  probeMode = "dry_run",
  fetchImpl = globalThis.fetch,
  generatedAtMs = Date.now(),
} = {}) {
  const foundationLaunchPlan = createFoundationLaunchPlan({ env, generatedAtMs });
  const foundationEnvSetupPlan = createFoundationEnvSetupPlan({
    env,
    generatedAtMs,
  });
  const foundationConnectorHandoff = createFoundationConnectorHandoff({
    env,
    generatedAtMs,
  });
  const foundationRuntime = createFoundationRuntimeStatusReport({
    env,
    streamState,
    overlayEventBus,
    generatedAtMs,
  });
  const productionProbe = await createProductionProbeReport({
    env,
    mode: probeMode,
    fetchImpl,
    generatedAtMs,
  });

  assertFoundationLaunchPlanSafe(
    foundationLaunchPlan,
    "foundation live readiness launch plan"
  );
  assertFoundationEnvSetupPlanSafe(
    foundationEnvSetupPlan,
    "foundation live readiness env setup plan"
  );
  assertFoundationConnectorHandoffSafe(
    foundationConnectorHandoff,
    "foundation live readiness connector handoff"
  );
  assertFoundationRuntimeStatusReportSafe(
    foundationRuntime,
    "foundation live readiness runtime status"
  );
  assertProductionProbeReportSafe(
    productionProbe,
    "foundation live readiness production probe"
  );

  const runtimeGate = summarizeRuntimeGate(foundationRuntime);
  const productionProbeGate = summarizeProductionProbeGate({
    env,
    productionProbe,
  });
  const obsPickupStartupSummary = summarizeObsPickupStartupSummary(
    foundationLaunchPlan.operator_startup_plan?.obs_pickup_startup_summary
  );
  const realEngineGate = summarizeRealEngineGate({
    env,
    foundationRuntime,
    productionProbeGate,
  });
  const obsGate = summarizeObsGate({
    foundationRuntime,
    productionProbeGate,
    obsPickupStartupSummary,
  });
  const liveReadinessStatus = summarizeLiveReadinessStatus({
    runtimeGate,
    realEngineGate,
    obsGate,
    productionProbe,
    productionProbeGate,
  });
  const nextGate = firstAttentionGate([
    ["runtime_gate", runtimeGate],
    ["real_engine_gate", realEngineGate],
    ["obs_gate", obsGate],
    ["production_probe_gate", productionProbeGate],
  ]);

  const report = {
    schema: "iris_foundation_live_readiness_report_v1",
    generated_at_ms: generatedAtMs,
    live_readiness_status: liveReadinessStatus,
    foundation_launch_plan_status: foundationLaunchPlan.plan_status,
    env_setup_plan_summary: summarizeEnvSetupPlan(foundationEnvSetupPlan),
    connector_handoff_summary: summarizeConnectorHandoff(
      foundationConnectorHandoff
    ),
    next_gate_id: nextGate?.gate_id ?? null,
    next_check_script: nextGate?.next_check_script ?? null,
    next_readiness_state: nextGate?.readiness_state ?? null,
    readiness_state_counts: summarizeReadinessStateCounts([
      runtimeGate,
      realEngineGate,
      obsGate,
      productionProbeGate,
    ]),
    runtime_gate: runtimeGate,
    real_engine_gate: realEngineGate,
    obs_gate: obsGate,
    production_probe_gate: productionProbeGate,
    obs_pickup_startup_summary: obsPickupStartupSummary,
    production_handoff_summary: {
      schema: "iris_foundation_live_readiness_production_handoff_summary_v1",
      live_readiness_check_only: true,
      real_processes_not_started_by_report: true,
      runtime_packets_remain_adapter_gated: true,
      live_payloads_not_exposed: true,
      artifact_locations_not_exposed: true,
      next_gate_id: nextGate?.gate_id ?? null,
      next_check_script: nextGate?.next_check_script ?? null,
      next_readiness_state: nextGate?.readiness_state ?? null,
      readiness_state_counts: summarizeReadinessStateCounts([
        runtimeGate,
        realEngineGate,
        obsGate,
        productionProbeGate,
      ]),
      runtime_gate_ready: runtimeGate.ready,
      real_engine_gate_ready: realEngineGate.ready,
      obs_gate_ready: obsGate.ready,
      production_probe_gate_ready: productionProbeGate.ready,
      local_bridge_worker_required: true,
      real_engine_health_required: true,
      render_manifest_required_for_obs_pickup: true,
      obs_pickup_required: true,
      obs_pickup_startup_summary: obsPickupStartupSummary,
    },
    verification_scripts: {
      schema: "iris_foundation_live_readiness_scripts_v1",
      local_env_apply_plan_script: "npm run dev:foundation:local-env-apply",
      launch_plan_script: "npm run dev:foundation:launch-plan",
      env_setup_plan_script: "npm run dev:foundation:env-setup-plan",
      connector_handoff_script: "npm run dev:foundation:connector-handoff",
      startup_checklist_script: "npm run dev:foundation:startup-checklist",
      runtime_status_script: "npm run dev:foundation:runtime-status",
      readiness_rehearsal_script: "npm run dev:foundation:readiness-rehearsal",
      configured_probe_script: "npm run dev:production:probe",
      fixture_post_probe_script: "npm run dev:production:probe -- --fixture-post",
      bridge_status_roundtrip_script:
        foundationLaunchPlan.runtime_handoff_verification_summary
          .bridge_status_roundtrip_script,
      bridge_engine_roundtrip_script:
        foundationLaunchPlan.runtime_handoff_verification_summary
          .bridge_engine_roundtrip_script,
      obs_runtime_render_roundtrip_script:
        foundationLaunchPlan.runtime_handoff_verification_summary
          .obs_runtime_render_roundtrip_script,
      expected_runtime_status:
        foundationLaunchPlan.runtime_handoff_verification_summary
          .foundation_runtime_status_expected,
      expected_configured_probe_status: "configured_probe_ready",
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
      no_artifact_paths: true,
      no_raw_jobs: true,
      no_candidates: true,
      no_commands: true,
      read_only_live_readiness: true,
      synthetic_fixture_post_only: true,
    },
    adapter_validation_required: true,
  };
  assertFoundationLiveReadinessReportSafe(report);
  return report;
}

export function assertFoundationLiveReadinessReportSafe(
  report,
  context = "foundation live readiness report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenFoundationLiveReadinessFields(report, context);
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_foundation_live_readiness_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!FOUNDATION_LIVE_READINESS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated time`);
  }
  if (!LIVE_READINESS_STATUSES.has(report.live_readiness_status)) {
    throw new ContractError(`${context}: invalid live readiness status`);
  }
  if (
    !["ready_to_launch_foundation", "configure_foundation_env_first"].includes(
      report.foundation_launch_plan_status
    )
  ) {
    throw new ContractError(`${context}: invalid launch plan status`);
  }
  if (report.next_gate_id !== null && !GATE_IDS.has(report.next_gate_id)) {
    throw new ContractError(`${context}: invalid next gate`);
  }
  if (report.next_check_script !== null) {
    assertSafeScriptName(report.next_check_script, `${context}: next check script`);
  }
  assertSafeOptionalReadinessState(report.next_readiness_state, context);
  assertReadinessStateCountsSafe(report.readiness_state_counts, report, context);
  assertRuntimeGateSafe(report.runtime_gate, context);
  assertEnvSetupPlanSummarySafe(report.env_setup_plan_summary, context);
  assertConnectorHandoffSummarySafe(report.connector_handoff_summary, context);
  assertRealEngineGateSafe(report.real_engine_gate, context);
  assertObsGateSafe(report.obs_gate, context);
  assertProductionProbeGateSafe(report.production_probe_gate, context);
  assertObsPickupStartupSummarySafe(
    report.obs_pickup_startup_summary,
    context
  );
  assertProductionHandoffSummarySafe(
    report.production_handoff_summary,
    report,
    context
  );
  assertVerificationScriptsSafe(report.verification_scripts, context);
  const nextGate = firstAttentionGate([
    ["runtime_gate", report.runtime_gate],
    ["real_engine_gate", report.real_engine_gate],
    ["obs_gate", report.obs_gate],
    ["production_probe_gate", report.production_probe_gate],
  ]);
  if (!nextGate) {
    if (
      report.next_gate_id !== null ||
      report.next_check_script !== null ||
      report.next_readiness_state !== null
    ) {
      throw new ContractError(`${context}: ready report must not expose next gate`);
    }
  } else if (
    report.next_gate_id !== nextGate.gate_id ||
    report.next_check_script !== nextGate.next_check_script ||
    report.next_readiness_state !== nextGate.readiness_state
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
      "no_artifact_paths",
      "no_raw_jobs",
      "no_candidates",
      "no_commands",
      "read_only_live_readiness",
      "synthetic_fixture_post_only",
    ],
    `${context}: boundary policy`
  );
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertProductionHandoffSummarySafe(summary, report, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (
    summary.schema !==
    "iris_foundation_live_readiness_production_handoff_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!FOUNDATION_LIVE_READINESS_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected production handoff field`, {
        field,
      });
    }
  }
  for (const field of [
    "live_readiness_check_only",
    "real_processes_not_started_by_report",
    "runtime_packets_remain_adapter_gated",
    "live_payloads_not_exposed",
    "artifact_locations_not_exposed",
    "local_bridge_worker_required",
    "real_engine_health_required",
    "render_manifest_required_for_obs_pickup",
    "obs_pickup_required",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  for (const field of [
    "runtime_gate_ready",
    "real_engine_gate_ready",
    "obs_gate_ready",
    "production_probe_gate_ready",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid production handoff gate flag`);
    }
  }
  if (summary.next_gate_id !== null && !GATE_IDS.has(summary.next_gate_id)) {
    throw new ContractError(`${context}: invalid production handoff next gate`);
  }
  if (summary.next_check_script !== null) {
    assertSafeScriptName(
      summary.next_check_script,
      `${context}: production handoff next check script`
    );
  }
  assertSafeOptionalReadinessState(summary.next_readiness_state, context);
  if (summary.next_readiness_state !== report.next_readiness_state) {
    throw new ContractError(`${context}: invalid production handoff next readiness`);
  }
  assertReadinessStateCountsObjectSafe(
    summary.readiness_state_counts,
    `${context}: production handoff readiness counts`
  );
  assertReadinessStateCountsObjectMatches(
    summary.readiness_state_counts,
    report.readiness_state_counts,
    `${context}: production handoff readiness counts`
  );
  assertObsPickupStartupSummarySafe(
    summary.obs_pickup_startup_summary,
    `${context}: production handoff OBS pickup startup summary`
  );
  if (
    JSON.stringify(summary.obs_pickup_startup_summary) !==
    JSON.stringify(report.obs_pickup_startup_summary)
  ) {
    throw new ContractError(
      `${context}: production handoff OBS pickup startup summary must match report`
    );
  }
}

function summarizeRuntimeGate(foundationRuntime) {
  const runtimeFlow = foundationRuntime.runtime_handoff_flow;
  const obsArtifactFlow = foundationRuntime.obs_render_artifact_flow;
  const overlayRuntime = foundationRuntime.overlay_runtime;
  const obsRuntime = foundationRuntime.obs_browser_source_runtime;
  const workerRuntime = foundationRuntime.local_bridge_worker_runtime;
  const realEngineHandoff = foundationRuntime.real_engine_handoff;
  const requiredAdapterKinds = ["tts", "live2d", "subtitle"];
  const overlayEventStreamAvailable =
    overlayRuntime.event_stream_ready === true ||
    overlayRuntime.event_stream_client_count > 0 ||
    overlayRuntime.event_stream_published_count > 0 ||
    overlayRuntime.event_stream_latest_event_age_ms !== null;
  const localBridgeWorkerActivePendingJobCount = Math.max(
    0,
    workerRuntime.queue_pending_job_count -
      (workerRuntime.queue_expired_pending_job_count ?? 0)
  );
  const localBridgeWorkerReady =
    ["idle", "active"].includes(workerRuntime.worker_readiness_status) ||
    (workerRuntime.worker_readiness_status === "attention" &&
      requiredAdapterKinds.every((kind) =>
        ["idle", "active"].includes(workerRuntime.adapter_readiness_status[kind])
      ) &&
      localBridgeWorkerActivePendingJobCount === 0 &&
      workerRuntime.queue_retry_ready_count === 0 &&
      workerRuntime.queue_retry_waiting_count === 0 &&
      workerRuntime.queue_retry_blocked_count === 0 &&
      workerRuntime.queue_invalid_json_line_count === 0);
  const localBridgeWorkerQueueClear =
    localBridgeWorkerActivePendingJobCount === 0 &&
    workerRuntime.queue_retry_ready_count === 0 &&
    workerRuntime.queue_retry_waiting_count === 0 &&
    workerRuntime.queue_retry_blocked_count === 0 &&
    workerRuntime.queue_invalid_json_line_count === 0;
  const latestManifestAvailable =
    obsArtifactFlow.render_manifest_store_configured === true &&
    obsArtifactFlow.latest_manifest_available === true;
  const renderHandoffReady =
    obsArtifactFlow.flow_status === "ready_for_obs_artifact_pickup" &&
    obsArtifactFlow.blocking_stage === "none" &&
    latestManifestAvailable &&
    obsArtifactFlow.latest_manifest_fresh === true &&
    obsArtifactFlow.artifact_render_sync_ready === true &&
    obsArtifactFlow.all_artifact_files_available === true &&
    obsArtifactFlow.all_artifacts_contract_valid_for_pickup === true &&
    obsArtifactFlow.artifact_pickup_ready_adapter_count ===
      requiredAdapterKinds.length &&
    obsArtifactFlow.artifact_blocking_adapter_count === 0;
  const realEngineHandoffReady =
    (realEngineHandoff.handoff_status === "active" ||
      realEngineHandoff.handoff_status === "ready_waiting_for_runtime_event") &&
    realEngineHandoff.queue_clear === true;
  const ready =
    foundationRuntime.runtime_status === "ready_for_obs_runtime_handoff" &&
    runtimeFlow.flow_status === "ready_for_obs_runtime_handoff" &&
    runtimeFlow.blocking_stage === "none" &&
    localBridgeWorkerReady &&
    localBridgeWorkerQueueClear &&
    realEngineHandoffReady &&
    renderHandoffReady;
  return {
    schema: "iris_foundation_live_readiness_runtime_gate_v1",
    check_script: CHECK_SCRIPTS.runtime_gate,
    next_check_script: ready
      ? null
      : runtimeFlow.next_check_script ?? CHECK_SCRIPTS.runtime_gate,
    ready,
    readiness_state: ready ? "ready" : summarizeRuntimeReadinessState(runtimeFlow),
    runtime_status: foundationRuntime.runtime_status,
    runtime_flow_status: runtimeFlow.flow_status,
    runtime_flow_blocking_stage: runtimeFlow.blocking_stage,
    obs_artifact_flow_status: obsArtifactFlow.flow_status,
    obs_artifact_blocking_stage: obsArtifactFlow.blocking_stage,
    foundation_ready:
      foundationRuntime.foundation_readiness_status === "ready_for_runtime_handoff" &&
      foundationRuntime.foundation_attention_reason_count === 0,
    local_bridge_worker_ready: localBridgeWorkerReady,
    local_bridge_worker_queue_clear: localBridgeWorkerQueueClear,
    real_engine_handoff_ready: realEngineHandoffReady,
    obs_browser_source_ready:
      obsRuntime.origin_configured === true &&
      obsRuntime.source_dimensions_configured === true &&
      obsRuntime.overlay_routes_ready === true &&
      obsRuntime.local_bridge_handoff_routes_ready === true &&
      obsRuntime.required_adapter_kind_count === requiredAdapterKinds.length,
    overlay_runtime_available:
      overlayRuntime.stream_state_available === true &&
      overlayRuntime.overlay_status_available === true,
    runtime_event_available: overlayRuntime.runtime_event_available === true,
    overlay_event_stream_available: overlayEventStreamAvailable,
    render_handoff_ready: renderHandoffReady,
    artifact_pickup_ready_adapter_count:
      runtimeFlow.artifact_pickup_ready_adapter_count,
    required_artifact_pickup_ready_adapter_count: requiredAdapterKinds.length,
    boundary_policy: {
      script_names_only: true,
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_artifact_paths: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeEnvSetupPlan(envSetupPlan) {
  const envGroups = envSetupPlan.env_groups;
  return {
    schema: "iris_foundation_live_readiness_env_setup_summary_v1",
    check_script: "npm run dev:foundation:env-setup-plan",
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
    runtime_adapter_group_ready:
      envGroups.find((group) => group.env_group_id === "runtime_http_adapters")
        ?.setup_status === "ready",
    local_bridge_storage_group_ready:
      envGroups.find((group) => group.env_group_id === "local_bridge_storage")
        ?.setup_status === "ready",
    real_engine_group_ready_count: envGroups.filter(
      (group) =>
        ["real_tts_engine", "real_live2d_engine"].includes(group.env_group_id) &&
        group.setup_status === "ready"
    ).length,
    worker_group_ready:
      envGroups.find((group) => group.env_group_id === "local_bridge_worker")
        ?.setup_status === "ready",
    obs_overlay_group_ready:
      envGroups.find((group) => group.env_group_id === "obs_overlay")
        ?.setup_status === "ready",
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeConnectorHandoff(handoff) {
  const connectors = handoff.connectors;
  const isConnectorReady = (connector) => connector.connector_status === "ready";
  return {
    schema: "iris_foundation_live_readiness_connector_handoff_summary_v1",
    check_script: "npm run dev:foundation:connector-handoff",
    handoff_status: handoff.handoff_status,
    connector_count: handoff.connector_count,
    ready_connector_count: handoff.ready_connector_count,
    attention_connector_count: handoff.attention_connector_count,
    blocking_connector_count: handoff.blocking_connector_count,
    next_connector_id: handoff.next_connector_id,
    next_connector_kind: handoff.next_connector_kind,
    next_attention_reason: handoff.next_attention_reason,
    next_launch_script: handoff.next_launch_script,
    next_readiness_script: handoff.next_readiness_script,
    next_configure_env: handoff.next_configure_env,
    runtime_adapter_ready_count: connectors.filter(
      (connector) =>
        connector.connector_kind === "runtime_adapter" &&
        isConnectorReady(connector)
    ).length,
    local_bridge_ready:
      connectors.find((connector) => connector.connector_id === "local_adapter_bridge")
        ?.connector_status === "ready",
    worker_ready:
      connectors.find((connector) => connector.connector_id === "local_bridge_worker")
        ?.connector_status === "ready",
    real_engine_ready_count: connectors.filter(
      (connector) =>
        connector.connector_kind === "real_engine" && isConnectorReady(connector)
    ).length,
    obs_pickup_connector_ready:
      connectors.find((connector) => connector.connector_id === "obs_browser_source")
        ?.connector_status === "ready",
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeProductionProbeGate({ env, productionProbe }) {
  const foundationStage = productionProbe.stages.find(
    (stage) => stage.stage_id === "tts_live2d_obs_foundation"
  );
  const ttsCheck = findCheck(foundationStage, "real_tts_engine");
  const live2dCheck = findCheck(foundationStage, "real_live2d_bridge");
  const obsCheck = findCheck(foundationStage, "production_obs_overlay");
  const engineHealthStatuses = [
    ttsCheck?.engine_health_status ?? "not_applicable",
    live2dCheck?.engine_health_status ?? "not_applicable",
  ];
  const obsBridgeHealthRequired = Boolean(env.IRIS_OBS_BRIDGE_ENDPOINT);
  const obsBridgeHealthStatus =
    obsCheck?.obs_bridge_health_status ?? "not_applicable";
  const engineHealthPassCount = engineHealthStatuses.filter(
    (status) => status === "pass"
  ).length;
  const engineHealthAttentionCount = engineHealthStatuses.filter((status) =>
    ["attention", "health_endpoint_not_configured", "not_configured"].includes(status)
  ).length;
  const obsBridgeHealthPassedOrNotRequired = obsBridgeHealthRequired
    ? obsBridgeHealthStatus === "pass"
    : ["not_configured", "not_applicable", "pass"].includes(obsBridgeHealthStatus);
  const localRuntimeProbeSatisfied =
    foundationStage?.status === "ready" &&
    obsBridgeHealthPassedOrNotRequired &&
    productionProbe.summary.local_endpoint_policy_blocked_check_count === 0;
  const configuredProbeReady =
    productionProbe.verification_status === "configured_probe_ready" &&
    engineHealthPassCount === 2 &&
    engineHealthAttentionCount === 0;
  const ready =
    configuredProbeReady && localRuntimeProbeSatisfied;
  return {
    schema: "iris_foundation_live_readiness_production_probe_gate_v1",
    check_script: CHECK_SCRIPTS.production_probe_gate,
    next_check_script: ready ? null : CHECK_SCRIPTS.production_probe_gate,
    ready,
    readiness_state: ready
      ? "ready"
      : summarizeProductionProbeReadinessState(productionProbe),
    probe_mode: productionProbe.probe_mode,
    production_probe_readiness_status: productionProbe.readiness_status,
    production_probe_verification_status: productionProbe.verification_status,
    foundation_stage_status: foundationStage?.status ?? "attention",
    foundation_stage_ready_check_count:
      foundationStage?.checks?.filter((check) => check.status === "ready").length ?? 0,
    foundation_stage_attention_check_count:
      foundationStage?.checks?.filter((check) => check.status === "attention").length ??
      0,
    engine_health_pass_count: engineHealthPassCount,
    engine_health_attention_count: engineHealthAttentionCount,
    engine_health_required_pass_count: 2,
    tts_engine_health_status: ttsCheck?.engine_health_status ?? "not_applicable",
    live2d_engine_health_status:
      live2dCheck?.engine_health_status ?? "not_applicable",
    obs_bridge_health_required: obsBridgeHealthRequired,
    obs_bridge_health_status: obsBridgeHealthStatus,
    obs_bridge_health_passed_or_not_required: obsBridgeHealthPassedOrNotRequired,
    local_endpoint_policy_all_allowed_required: true,
    local_endpoint_policy_blocked_check_count:
      productionProbe.summary.local_endpoint_policy_blocked_check_count,
    adapter_probe_attention_count: productionProbe.summary.adapter_probe_attention_count,
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeRealEngineGate({ env, foundationRuntime, productionProbeGate }) {
  const flow = foundationRuntime.real_engine_worker_flow;
  const handoff = foundationRuntime.real_engine_handoff;
  const healthReady =
    productionProbeGate.tts_engine_health_status === "pass" &&
    productionProbeGate.live2d_engine_health_status === "pass" &&
    productionProbeGate.engine_health_pass_count ===
      productionProbeGate.engine_health_required_pass_count;
  const realEnginesConfigured =
    handoff.configured_real_engine_count === handoff.required_real_engine_count;
  const handoffActivePendingJobCount = Math.max(
    0,
    handoff.queue_pending_job_count - (flow.queue_expired_pending_job_count ?? 0)
  );
  const handoffQueueClear =
    handoffActivePendingJobCount === 0 &&
    handoff.queue_retry_ready_count === 0 &&
    handoff.queue_retry_waiting_count === 0 &&
    handoff.queue_retry_blocked_count === 0 &&
    handoff.queue_invalid_json_line_count === 0;
  const workerHandoffReady =
    flow.flow_status === "real_engine_worker_active" &&
    flow.blocking_stage === "none" &&
    handoff.handoff_status === "active" &&
    realEnginesConfigured &&
    handoffQueueClear;
  const runtimeArtifactsReady = handoff.complete_manifest_count > 0;
  const ready =
    workerHandoffReady &&
    (healthReady || runtimeArtifactsReady);
  const voiceLicenseUseCategoryConfiguredCount =
    VOICE_LICENSE_USE_CATEGORY_ENV_NAMES.filter((name) => Boolean(env[name]))
      .length;
  return {
    schema: "iris_foundation_live_readiness_real_engine_gate_v1",
    check_script: CHECK_SCRIPTS.real_engine_gate,
    next_check_script: ready
      ? null
      : flow.next_check_script ?? CHECK_SCRIPTS.real_engine_gate,
    ready,
    readiness_state: ready
      ? "ready"
      : summarizeRealEngineReadinessState({ flow, handoff, productionProbeGate }),
    gate_status: ready
      ? "ready"
      : flow.flow_status !== "real_engine_worker_active"
        ? flow.flow_status
        : "configured_probe_attention",
    real_engine_worker_flow_status: flow.flow_status,
    real_engine_worker_blocking_stage: flow.blocking_stage,
    handoff_status: handoff.handoff_status,
    tts_engine_http_ready: handoff.tts_engine_http_ready,
    tts_engine_preferences_configured: handoff.tts_engine_preferences_configured,
    original_voice_profile_configured:
      Boolean(env.IRIS_CHARACTER_VOICE_PROFILE_ID),
    original_voice_style_profile_configured:
      Boolean(env.IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID),
    licensed_voice_source_status_configured:
      Boolean(env.IRIS_LICENSED_VOICE_SOURCE_STATUS),
    voice_license_use_category_count: VOICE_LICENSE_USE_CATEGORY_ENV_NAMES.length,
    voice_license_use_category_configured_count:
      voiceLicenseUseCategoryConfiguredCount,
    voice_license_use_category_missing_count:
      VOICE_LICENSE_USE_CATEGORY_ENV_NAMES.length -
      voiceLicenseUseCategoryConfiguredCount,
    original_voice_source_status: summarizeOriginalVoiceSourceStatus(
      env.IRIS_LICENSED_VOICE_SOURCE_STATUS
    ),
    original_voice_engine_preferences_configured:
      handoff.tts_engine_preferences_configured === true,
    live2d_engine_http_ready: handoff.live2d_engine_http_ready,
    subtitle_renderer_ready: handoff.subtitle_renderer_ready,
    configured_real_engine_count: handoff.configured_real_engine_count,
    required_real_engine_count: handoff.required_real_engine_count,
    worker_ready_for_handoff: workerHandoffReady,
    worker_queue_clear: handoffQueueClear,
    queue_pending_job_count: handoffActivePendingJobCount,
    queue_retry_ready_count: handoff.queue_retry_ready_count,
    queue_retry_waiting_count: handoff.queue_retry_waiting_count,
    queue_retry_blocked_count: handoff.queue_retry_blocked_count,
    queue_invalid_json_line_count: handoff.queue_invalid_json_line_count,
    complete_manifest_count: handoff.complete_manifest_count,
    engine_health_pass_count: productionProbeGate.engine_health_pass_count,
    engine_health_attention_count:
      productionProbeGate.engine_health_attention_count,
    engine_health_required_pass_count:
      productionProbeGate.engine_health_required_pass_count,
    tts_engine_health_status: productionProbeGate.tts_engine_health_status,
    live2d_engine_health_status:
      productionProbeGate.live2d_engine_health_status,
    boundary_policy: {
      script_names_only: true,
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_artifact_paths: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeObsGate({
  foundationRuntime,
  productionProbeGate,
  obsPickupStartupSummary,
}) {
  const obsRuntime = foundationRuntime.obs_browser_source_runtime;
  const artifactFlow = foundationRuntime.obs_render_artifact_flow;
  const requiredAdapterKinds = ["tts", "live2d", "subtitle"];
  const obsHealthReady =
    productionProbeGate.obs_bridge_health_passed_or_not_required === true;
  const obsBrowserSourceReady =
    obsRuntime.origin_configured === true &&
    obsRuntime.source_dimensions_configured === true &&
    obsRuntime.overlay_routes_ready === true &&
    obsRuntime.local_bridge_handoff_routes_ready === true &&
    obsRuntime.required_adapter_kind_count === requiredAdapterKinds.length;
  const latestManifestAvailable =
    artifactFlow.render_manifest_store_configured === true &&
    artifactFlow.latest_manifest_available === true;
  const obsPickupReady =
    artifactFlow.flow_status === "ready_for_obs_artifact_pickup" &&
    artifactFlow.blocking_stage === "none" &&
    latestManifestAvailable &&
    artifactFlow.latest_manifest_fresh === true &&
    artifactFlow.artifact_render_sync_ready === true &&
    artifactFlow.all_artifact_files_available === true &&
    artifactFlow.all_artifacts_contract_valid_for_pickup === true &&
    artifactFlow.artifact_pickup_ready_adapter_count ===
      requiredAdapterKinds.length &&
    artifactFlow.artifact_blocking_adapter_count === 0;
  const ready =
    obsBrowserSourceReady &&
    obsPickupReady &&
    obsHealthReady;
  return {
    schema: "iris_foundation_live_readiness_obs_gate_v1",
    check_script: CHECK_SCRIPTS.obs_gate,
    next_check_script: ready
      ? null
      : artifactFlow.next_check_script ?? CHECK_SCRIPTS.obs_gate,
    ready,
    readiness_state: ready
      ? "ready"
      : summarizeObsReadinessState({ artifactFlow, productionProbeGate }),
    gate_status: ready
      ? "ready"
      : artifactFlow.flow_status !== "ready_for_obs_artifact_pickup"
        ? artifactFlow.flow_status
        : "configured_probe_attention",
    obs_browser_source_ready: obsBrowserSourceReady,
    origin_configured: obsRuntime.origin_configured,
    source_dimensions_configured: obsRuntime.source_dimensions_configured,
    overlay_routes_ready: obsRuntime.overlay_routes_ready,
    local_bridge_handoff_routes_ready:
      obsRuntime.local_bridge_handoff_routes_ready,
    overlay_route_count: obsRuntime.overlay_route_count,
    local_bridge_handoff_route_count:
      obsRuntime.local_bridge_handoff_route_count,
    required_adapter_kind_count: obsRuntime.required_adapter_kind_count,
    artifact_flow_status: artifactFlow.flow_status,
    artifact_blocking_stage: artifactFlow.blocking_stage,
    latest_manifest_available: latestManifestAvailable,
    artifact_pickup_ready_adapter_count:
      artifactFlow.artifact_pickup_ready_adapter_count,
    required_artifact_pickup_ready_adapter_count: requiredAdapterKinds.length,
    obs_pickup_ready: obsPickupReady,
    obs_bridge_health_required: productionProbeGate.obs_bridge_health_required,
    obs_bridge_health_status: productionProbeGate.obs_bridge_health_status,
    obs_bridge_health_passed_or_not_required:
      productionProbeGate.obs_bridge_health_passed_or_not_required,
    obs_pickup_startup_summary: obsPickupStartupSummary,
    boundary_policy: {
      script_names_only: true,
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_artifact_paths: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeObsPickupStartupSummary(summary) {
  const blockingStepCount = nonNegativeIntegerOrZero(
    summary?.obs_pickup_blocking_step_count
  );
  const readyBlockingStepCount = nonNegativeIntegerOrZero(
    summary?.ready_obs_pickup_blocking_step_count
  );
  const attentionBlockingStepCount = nonNegativeIntegerOrZero(
    summary?.attention_obs_pickup_blocking_step_count
  );
  const nextReadinessState =
    attentionBlockingStepCount > 0 ? "operator_review_required" : "ready";
  const nextBlockingStepId = FOUNDATION_STARTUP_PROCESS_IDS.has(
    summary?.next_obs_pickup_blocking_step_id
  )
    ? summary.next_obs_pickup_blocking_step_id
    : null;
  const nextBlockingStepOrder = Number.isInteger(
    summary?.next_obs_pickup_blocking_step_order
  )
    ? summary.next_obs_pickup_blocking_step_order
    : null;
  return {
    schema: "iris_foundation_live_readiness_obs_pickup_startup_summary_v1",
    obs_pickup_guidance_only: true,
    real_obs_operation_not_started: true,
    startup_scripts_are_names_only: true,
    env_names_only: true,
    local_bridge_required_before_obs_pickup:
      summary?.local_bridge_required_before_obs_pickup === true,
    worker_required_before_obs_pickup:
      summary?.worker_required_before_obs_pickup === true,
    obs_setup_required_before_obs_pickup:
      summary?.obs_setup_required_before_obs_pickup === true,
    obs_pickup_blocking_step_count: blockingStepCount,
    ready_obs_pickup_blocking_step_count: readyBlockingStepCount,
    attention_obs_pickup_blocking_step_count: attentionBlockingStepCount,
    next_obs_pickup_readiness_state: nextReadinessState,
    next_obs_pickup_blocking_step_id: nextBlockingStepId,
    next_obs_pickup_blocking_step_order: nextBlockingStepOrder,
    next_obs_pickup_blocking_launch_script:
      isSafeOptionalScriptName(summary?.next_obs_pickup_blocking_launch_script)
        ? summary.next_obs_pickup_blocking_launch_script
        : null,
    next_obs_pickup_blocking_readiness_script:
      isSafeOptionalScriptName(summary?.next_obs_pickup_blocking_readiness_script)
        ? summary.next_obs_pickup_blocking_readiness_script
        : null,
    obs_pickup_startup_state:
      attentionBlockingStepCount === 0
        ? "obs_pickup_startup_ready"
        : "obs_pickup_startup_waiting",
    boundary_policy: {
      booleans_counts_and_script_names_only: true,
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_artifact_paths: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeLiveReadinessStatus({
  runtimeGate,
  realEngineGate,
  obsGate,
  productionProbe,
  productionProbeGate,
}) {
  if (
    runtimeGate.readiness_state === "ready" &&
    realEngineGate.readiness_state === "ready" &&
    obsGate.readiness_state === "ready" &&
    productionProbeGate.readiness_state === "ready"
  ) {
    return "ready_for_live_obs_operation";
  }
  if (
    productionProbe.readiness_status !== "ready_for_configured_production_probe" ||
    productionProbe.verification_status === "configuration_attention"
  ) {
    return "configuration_attention";
  }
  if (runtimeGate.ready !== true) return "runtime_handoff_attention";
  if (
    realEngineGate.ready !== true ||
    obsGate.ready !== true ||
    productionProbeGate.ready !== true
  ) {
    return "configured_probe_attention";
  }
  return "ready_for_live_obs_operation";
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

function findCheck(stage, integration) {
  return stage?.checks?.find((check) => check.integration === integration) ?? null;
}

function assertRuntimeGateSafe(gate, context) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: runtime gate is required`);
  }
  if (gate.schema !== "iris_foundation_live_readiness_runtime_gate_v1") {
    throw new ContractError(`${context}: invalid runtime gate schema`);
  }
  assertSafeScriptName(gate.check_script, `${context}: runtime gate check script`);
  assertGateNextCheckScriptSafe(gate, `${context}: runtime gate next check script`);
  for (const field of [
    "ready",
    "foundation_ready",
    "local_bridge_worker_ready",
    "local_bridge_worker_queue_clear",
    "real_engine_handoff_ready",
    "obs_browser_source_ready",
    "overlay_runtime_available",
    "runtime_event_available",
    "overlay_event_stream_available",
    "render_handoff_ready",
  ]) {
    if (typeof gate[field] !== "boolean") {
      throw new ContractError(`${context}: invalid runtime gate flag ${field}`);
    }
  }
  assertSafeReadinessState(gate.readiness_state, `${context}: runtime gate readiness`);
  if (gate.readiness_state === "ready" && gate.ready !== true) {
    throw new ContractError(`${context}: ready runtime gate readiness mismatch`);
  }
  if (gate.ready === true && gate.readiness_state !== "ready") {
    throw new ContractError(`${context}: runtime gate ready flag mismatch`);
  }
  if (!FOUNDATION_RUNTIME_STATUSES.has(gate.runtime_status)) {
    throw new ContractError(`${context}: invalid runtime status`);
  }
  if (!FLOW_STATUSES.has(gate.runtime_flow_status)) {
    throw new ContractError(`${context}: invalid runtime flow status`);
  }
  if (!OBS_ARTIFACT_FLOW_STATUSES.has(gate.obs_artifact_flow_status)) {
    throw new ContractError(`${context}: invalid OBS artifact flow status`);
  }
  if (!BLOCKING_STAGES.has(gate.runtime_flow_blocking_stage)) {
    throw new ContractError(`${context}: invalid runtime blocking stage`);
  }
  if (!OBS_ARTIFACT_BLOCKING_STAGES.has(gate.obs_artifact_blocking_stage)) {
    throw new ContractError(`${context}: invalid OBS artifact blocking stage`);
  }
  for (const field of [
    "artifact_pickup_ready_adapter_count",
    "required_artifact_pickup_ready_adapter_count",
  ]) {
    assertNonNegativeInteger(gate[field], `${context}: invalid ${field}`);
  }
  if (gate.required_artifact_pickup_ready_adapter_count !== 3) {
    throw new ContractError(`${context}: invalid required artifact adapter count`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    [
      "script_names_only",
      "booleans_counts_and_fixed_statuses_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "no_artifact_paths",
    ],
    `${context}: runtime gate boundary policy`
  );
  if (gate.adapter_validation_required !== true) {
    throw new ContractError(`${context}: runtime gate adapter validation required`);
  }
}

function assertEnvSetupPlanSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: env setup summary is required`);
  }
  if (
    summary.schema !== "iris_foundation_live_readiness_env_setup_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid env setup summary schema`);
  }
  assertSafeScriptName(summary.check_script, `${context}: env setup check script`);
  if (!ENV_SETUP_PLAN_STATUSES.has(summary.plan_status)) {
    throw new ContractError(`${context}: invalid env setup plan status`);
  }
  for (const field of [
    "env_group_count",
    "ready_env_group_count",
    "attention_env_group_count",
    "real_engine_group_ready_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (
    summary.ready_env_group_count + summary.attention_env_group_count !==
    summary.env_group_count
  ) {
    throw new ContractError(`${context}: invalid env group count summary`);
  }
  for (const field of [
    "runtime_adapter_group_ready",
    "local_bridge_storage_group_ready",
    "worker_group_ready",
    "obs_overlay_group_ready",
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
  if (summary.plan_status === "ready_for_foundation_env_setup") {
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
      "no_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: env setup boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: env setup adapter validation required`);
  }
}

function assertConnectorHandoffSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: connector handoff summary is required`);
  }
  if (
    summary.schema !==
    "iris_foundation_live_readiness_connector_handoff_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid connector handoff summary schema`);
  }
  assertSafeScriptName(
    summary.check_script,
    `${context}: connector handoff check script`
  );
  if (!CONNECTOR_HANDOFF_STATUSES.has(summary.handoff_status)) {
    throw new ContractError(`${context}: invalid connector handoff status`);
  }
  for (const field of [
    "connector_count",
    "ready_connector_count",
    "attention_connector_count",
    "blocking_connector_count",
    "runtime_adapter_ready_count",
    "real_engine_ready_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (
    summary.ready_connector_count + summary.attention_connector_count !==
    summary.connector_count
  ) {
    throw new ContractError(`${context}: invalid connector count summary`);
  }
  for (const field of [
    "local_bridge_ready",
    "worker_ready",
    "obs_pickup_connector_ready",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid connector flag ${field}`);
    }
  }
  if (summary.next_connector_id !== null && !CONNECTOR_IDS.has(summary.next_connector_id)) {
    throw new ContractError(`${context}: invalid next connector id`);
  }
  if (
    summary.next_connector_kind !== null &&
    !CONNECTOR_KINDS.has(summary.next_connector_kind)
  ) {
    throw new ContractError(`${context}: invalid next connector kind`);
  }
  if (
    summary.next_attention_reason !== null &&
    !CONNECTOR_ATTENTION_REASONS.has(summary.next_attention_reason)
  ) {
    throw new ContractError(`${context}: invalid connector attention reason`);
  }
  for (const field of ["next_launch_script", "next_readiness_script"]) {
    if (summary[field] !== null) {
      assertSafeScriptName(summary[field], `${context}: ${field}`);
    }
  }
  assertEnvNameListSafe(
    summary.next_configure_env,
    `${context}: connector next configure env`
  );
  if (summary.handoff_status === "ready_for_foundation_connector_handoff") {
    if (
      summary.next_connector_id !== null ||
      summary.next_connector_kind !== null ||
      summary.next_attention_reason !== null ||
      summary.next_launch_script !== null ||
      summary.next_readiness_script !== null ||
      summary.next_configure_env.length !== 0 ||
      summary.attention_connector_count !== 0 ||
      summary.blocking_connector_count !== 0
    ) {
      throw new ContractError(`${context}: unexpected ready connector handoff next item`);
    }
  } else if (
    summary.next_connector_id === null ||
    summary.next_connector_kind === null ||
    summary.next_attention_reason === null
  ) {
    throw new ContractError(`${context}: connector handoff attention needs next item`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "env_names_only",
      "script_names_only",
      "booleans_counts_and_fixed_statuses_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: connector handoff boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: connector handoff adapter validation required`);
  }
}

function assertRealEngineGateSafe(gate, context) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: real engine gate is required`);
  }
  if (gate.schema !== "iris_foundation_live_readiness_real_engine_gate_v1") {
    throw new ContractError(`${context}: invalid real engine gate schema`);
  }
  assertSafeScriptName(gate.check_script, `${context}: real engine gate check script`);
  assertGateNextCheckScriptSafe(
    gate,
    `${context}: real engine gate next check script`
  );
  if (!REAL_ENGINE_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid real engine gate status`);
  }
  if (!REAL_ENGINE_WORKER_FLOW_STATUSES.has(gate.real_engine_worker_flow_status)) {
    throw new ContractError(`${context}: invalid real engine flow status`);
  }
  if (
    !REAL_ENGINE_WORKER_BLOCKING_STAGES.has(
      gate.real_engine_worker_blocking_stage
    )
  ) {
    throw new ContractError(`${context}: invalid real engine blocking stage`);
  }
  if (!REAL_ENGINE_HANDOFF_STATUSES.has(gate.handoff_status)) {
    throw new ContractError(`${context}: invalid real engine handoff status`);
  }
  for (const field of [
    "ready",
    "tts_engine_http_ready",
    "tts_engine_preferences_configured",
    "original_voice_profile_configured",
    "original_voice_style_profile_configured",
    "licensed_voice_source_status_configured",
    "original_voice_engine_preferences_configured",
    "live2d_engine_http_ready",
    "subtitle_renderer_ready",
    "worker_ready_for_handoff",
    "worker_queue_clear",
  ]) {
    if (typeof gate[field] !== "boolean") {
      throw new ContractError(`${context}: invalid real engine flag ${field}`);
    }
  }
  for (const field of [
    "configured_real_engine_count",
    "required_real_engine_count",
    "queue_pending_job_count",
    "queue_retry_ready_count",
    "queue_retry_waiting_count",
    "queue_retry_blocked_count",
    "queue_invalid_json_line_count",
    "complete_manifest_count",
    "engine_health_pass_count",
    "engine_health_attention_count",
    "engine_health_required_pass_count",
    "voice_license_use_category_count",
    "voice_license_use_category_configured_count",
    "voice_license_use_category_missing_count",
  ]) {
    assertNonNegativeInteger(gate[field], `${context}: invalid ${field}`);
  }
  if (
    gate.voice_license_use_category_configured_count +
      gate.voice_license_use_category_missing_count !==
    gate.voice_license_use_category_count
  ) {
    throw new ContractError(`${context}: voice license use category count mismatch`);
  }
  for (const field of ["tts_engine_health_status", "live2d_engine_health_status"]) {
    if (!PROBE_HEALTH_STATUSES.has(gate[field])) {
      throw new ContractError(`${context}: invalid real engine health status`);
    }
  }
  if (
    !["not_configured", "licensed", "placeholder", "operator_attention_required"].includes(
      gate.original_voice_source_status
    )
  ) {
    throw new ContractError(`${context}: invalid original voice source status`);
  }
  assertSafeReadinessState(
    gate.readiness_state,
    `${context}: real engine gate readiness`
  );
  if (gate.readiness_state === "ready" && gate.ready !== true) {
    throw new ContractError(`${context}: ready real engine gate readiness mismatch`);
  }
  if (gate.ready === true && gate.readiness_state !== "ready") {
    throw new ContractError(`${context}: real engine gate ready flag mismatch`);
  }
  if (gate.required_real_engine_count !== 2) {
    throw new ContractError(`${context}: invalid required real engine count`);
  }
  if (gate.engine_health_required_pass_count !== 2) {
    throw new ContractError(`${context}: invalid required engine health count`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    [
      "script_names_only",
      "booleans_counts_and_fixed_statuses_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "no_artifact_paths",
    ],
    `${context}: real engine gate boundary policy`
  );
  if (gate.adapter_validation_required !== true) {
    throw new ContractError(`${context}: real engine gate adapter validation required`);
  }
}

function assertObsGateSafe(gate, context) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: OBS gate is required`);
  }
  if (gate.schema !== "iris_foundation_live_readiness_obs_gate_v1") {
    throw new ContractError(`${context}: invalid OBS gate schema`);
  }
  assertSafeScriptName(gate.check_script, `${context}: OBS gate check script`);
  assertGateNextCheckScriptSafe(gate, `${context}: OBS gate next check script`);
  if (!OBS_GATE_STATUSES.has(gate.gate_status)) {
    throw new ContractError(`${context}: invalid OBS gate status`);
  }
  if (!OBS_ARTIFACT_FLOW_STATUSES.has(gate.artifact_flow_status)) {
    throw new ContractError(`${context}: invalid OBS artifact flow status`);
  }
  if (!OBS_ARTIFACT_BLOCKING_STAGES.has(gate.artifact_blocking_stage)) {
    throw new ContractError(`${context}: invalid OBS artifact blocking stage`);
  }
  for (const field of [
    "ready",
    "obs_browser_source_ready",
    "origin_configured",
    "source_dimensions_configured",
    "overlay_routes_ready",
    "local_bridge_handoff_routes_ready",
    "latest_manifest_available",
    "obs_pickup_ready",
    "obs_bridge_health_required",
    "obs_bridge_health_passed_or_not_required",
  ]) {
    if (typeof gate[field] !== "boolean") {
      throw new ContractError(`${context}: invalid OBS gate flag ${field}`);
    }
  }
  for (const field of [
    "overlay_route_count",
    "local_bridge_handoff_route_count",
    "required_adapter_kind_count",
    "artifact_pickup_ready_adapter_count",
    "required_artifact_pickup_ready_adapter_count",
  ]) {
    assertNonNegativeInteger(gate[field], `${context}: invalid ${field}`);
  }
  if (!PROBE_HEALTH_STATUSES.has(gate.obs_bridge_health_status)) {
    throw new ContractError(`${context}: invalid OBS health status`);
  }
  assertSafeReadinessState(gate.readiness_state, `${context}: OBS gate readiness`);
  if (gate.readiness_state === "ready" && gate.ready !== true) {
    throw new ContractError(`${context}: ready OBS gate readiness mismatch`);
  }
  if (gate.ready === true && gate.readiness_state !== "ready") {
    throw new ContractError(`${context}: OBS gate ready flag mismatch`);
  }
  if (gate.required_artifact_pickup_ready_adapter_count !== 3) {
    throw new ContractError(`${context}: invalid required OBS artifact count`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    [
      "script_names_only",
      "booleans_counts_and_fixed_statuses_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "no_artifact_paths",
    ],
    `${context}: OBS gate boundary policy`
  );
  if (gate.adapter_validation_required !== true) {
    throw new ContractError(`${context}: OBS gate adapter validation required`);
  }
  assertObsPickupStartupSummarySafe(
    gate.obs_pickup_startup_summary,
    `${context}: OBS gate pickup startup summary`
  );
}

function assertProductionProbeGateSafe(gate, context) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: production probe gate is required`);
  }
  if (gate.schema !== "iris_foundation_live_readiness_production_probe_gate_v1") {
    throw new ContractError(`${context}: invalid production probe gate schema`);
  }
  assertSafeScriptName(
    gate.check_script,
    `${context}: production probe gate check script`
  );
  assertGateNextCheckScriptSafe(
    gate,
    `${context}: production probe gate next check script`
  );
  for (const field of [
    "ready",
    "obs_bridge_health_required",
    "obs_bridge_health_passed_or_not_required",
    "local_endpoint_policy_all_allowed_required",
  ]) {
    if (typeof gate[field] !== "boolean") {
      throw new ContractError(`${context}: invalid production probe flag ${field}`);
    }
  }
  if (!PROBE_MODES.has(gate.probe_mode)) {
    throw new ContractError(`${context}: invalid production probe mode`);
  }
  if (!PRODUCTION_PROBE_READINESS_STATUSES.has(gate.production_probe_readiness_status)) {
    throw new ContractError(`${context}: invalid production probe readiness`);
  }
  if (
    !PRODUCTION_PROBE_VERIFICATION_STATUSES.has(
      gate.production_probe_verification_status
    )
  ) {
    throw new ContractError(`${context}: invalid production probe verification`);
  }
  if (!CHECK_STATUSES.has(gate.foundation_stage_status)) {
    throw new ContractError(`${context}: invalid foundation stage status`);
  }
  for (const field of [
    "tts_engine_health_status",
    "live2d_engine_health_status",
    "obs_bridge_health_status",
  ]) {
    if (!PROBE_HEALTH_STATUSES.has(gate[field])) {
      throw new ContractError(`${context}: invalid health status ${field}`);
    }
  }
  for (const field of [
    "foundation_stage_ready_check_count",
    "foundation_stage_attention_check_count",
    "engine_health_pass_count",
    "engine_health_attention_count",
    "engine_health_required_pass_count",
    "local_endpoint_policy_blocked_check_count",
    "adapter_probe_attention_count",
  ]) {
    assertNonNegativeInteger(gate[field], `${context}: invalid ${field}`);
  }
  if (gate.engine_health_required_pass_count !== 2) {
    throw new ContractError(`${context}: invalid required engine health count`);
  }
  assertSafeReadinessState(
    gate.readiness_state,
    `${context}: production probe gate readiness`
  );
  if (gate.readiness_state === "ready" && gate.ready !== true) {
    throw new ContractError(
      `${context}: ready production probe gate readiness mismatch`
    );
  }
  if (gate.ready === true && gate.readiness_state !== "ready") {
    throw new ContractError(`${context}: production probe gate ready flag mismatch`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    [
      "env_names_only",
      "script_names_only",
      "booleans_counts_and_fixed_statuses_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: production probe gate boundary policy`
  );
  if (gate.adapter_validation_required !== true) {
    throw new ContractError(`${context}: probe gate adapter validation required`);
  }
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_foundation_live_readiness_scripts_v1") {
    throw new ContractError(`${context}: invalid verification scripts schema`);
  }
  for (const field of [
    "local_env_apply_plan_script",
    "launch_plan_script",
    "env_setup_plan_script",
    "connector_handoff_script",
    "startup_checklist_script",
    "runtime_status_script",
    "readiness_rehearsal_script",
    "configured_probe_script",
    "fixture_post_probe_script",
    "bridge_status_roundtrip_script",
    "bridge_engine_roundtrip_script",
    "obs_runtime_render_roundtrip_script",
  ]) {
    assertSafeScriptName(scripts[field], `${context}: ${field}`);
  }
  if (scripts.expected_runtime_status !== "ready_for_obs_runtime_handoff") {
    throw new ContractError(`${context}: invalid expected runtime status`);
  }
  if (scripts.expected_configured_probe_status !== "configured_probe_ready") {
    throw new ContractError(`${context}: invalid expected configured probe status`);
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

function assertObsPickupStartupSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: OBS pickup startup summary is required`);
  }
  if (
    summary.schema !==
    "iris_foundation_live_readiness_obs_pickup_startup_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid OBS pickup startup summary schema`);
  }
  for (const field of [
    "obs_pickup_guidance_only",
    "real_obs_operation_not_started",
    "startup_scripts_are_names_only",
    "env_names_only",
    "local_bridge_required_before_obs_pickup",
    "worker_required_before_obs_pickup",
    "obs_setup_required_before_obs_pickup",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid OBS pickup startup flag ${field}`);
    }
  }
  if (
    summary.obs_pickup_guidance_only !== true ||
    summary.real_obs_operation_not_started !== true ||
    summary.startup_scripts_are_names_only !== true ||
    summary.env_names_only !== true
  ) {
    throw new ContractError(`${context}: OBS pickup startup safety flags required`);
  }
  for (const field of [
    "obs_pickup_blocking_step_count",
    "ready_obs_pickup_blocking_step_count",
    "attention_obs_pickup_blocking_step_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (
    summary.ready_obs_pickup_blocking_step_count +
      summary.attention_obs_pickup_blocking_step_count !==
    summary.obs_pickup_blocking_step_count
  ) {
    throw new ContractError(`${context}: invalid OBS pickup blocking count summary`);
  }
  assertSafeReadinessState(
    summary.next_obs_pickup_readiness_state,
    `${context}: OBS pickup readiness state`
  );
  if (
    !OBS_PICKUP_STARTUP_STATES.has(summary.obs_pickup_startup_state)
  ) {
    throw new ContractError(`${context}: invalid OBS pickup startup state`);
  }
  if (
    summary.next_obs_pickup_blocking_step_id !== null &&
    !FOUNDATION_STARTUP_PROCESS_IDS.has(summary.next_obs_pickup_blocking_step_id)
  ) {
    throw new ContractError(`${context}: invalid OBS pickup blocking step id`);
  }
  if (summary.next_obs_pickup_blocking_step_order !== null) {
    assertNonNegativeInteger(
      summary.next_obs_pickup_blocking_step_order,
      `${context}: invalid OBS pickup blocking step order`
    );
  }
  for (const field of [
    "next_obs_pickup_blocking_launch_script",
    "next_obs_pickup_blocking_readiness_script",
  ]) {
    if (summary[field] !== null) {
      assertSafeScriptName(summary[field], `${context}: ${field}`);
    }
  }
  if (summary.attention_obs_pickup_blocking_step_count === 0) {
    if (
      summary.obs_pickup_startup_state !== "obs_pickup_startup_ready" ||
      summary.next_obs_pickup_readiness_state !== "ready" ||
      summary.next_obs_pickup_blocking_step_id !== null ||
      summary.next_obs_pickup_blocking_step_order !== null ||
      summary.next_obs_pickup_blocking_launch_script !== null ||
      summary.next_obs_pickup_blocking_readiness_script !== null
    ) {
      throw new ContractError(`${context}: ready OBS pickup startup has next item`);
    }
  } else if (
    summary.obs_pickup_startup_state !== "obs_pickup_startup_waiting" ||
    summary.next_obs_pickup_blocking_step_id === null ||
    summary.next_obs_pickup_blocking_step_order === null ||
    summary.next_obs_pickup_blocking_launch_script === null ||
    summary.next_obs_pickup_blocking_readiness_script === null
  ) {
    throw new ContractError(`${context}: waiting OBS pickup startup needs next item`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "booleans_counts_and_script_names_only",
      "env_names_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "no_artifact_paths",
    ],
    `${context}: OBS pickup startup boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(
      `${context}: OBS pickup startup adapter validation required`
    );
  }
}

function summarizeRuntimeReadinessState(runtimeFlow) {
  if (runtimeFlow.flow_status === "configuration_attention") {
    return "configuration_waiting";
  }
  if (runtimeFlow.blocking_stage === "foundation_configuration") {
    return "configuration_waiting";
  }
  if (
    ["real_engine_handoff", "obs_browser_source"].includes(
      runtimeFlow.blocking_stage
    )
  ) {
    return "real_device_waiting";
  }
  if (runtimeFlow.blocking_stage === "operator_action") {
    return "operator_review_required";
  }
  return "runtime_waiting";
}

function summarizeProductionProbeReadinessState(productionProbe) {
  if (
    productionProbe.readiness_status !== "ready_for_configured_production_probe" ||
    productionProbe.verification_status === "configuration_attention"
  ) {
    return "configuration_waiting";
  }
  if (productionProbe.verification_status === "configured_probe_attention") {
    return "real_device_waiting";
  }
  return "operator_review_required";
}

function summarizeOriginalVoiceSourceStatus(status) {
  if (!status) return "not_configured";
  if (["licensed", "placeholder", "operator_attention_required"].includes(status)) {
    return status;
  }
  return "operator_attention_required";
}

function summarizeRealEngineReadinessState({
  flow,
  handoff,
  productionProbeGate,
}) {
  if (
    flow.flow_status === "configuration_attention" ||
    flow.blocking_stage === "foundation_configuration" ||
    flow.blocking_stage === "real_engine_configuration" ||
    handoff.handoff_status === "not_configured"
  ) {
    return "configuration_waiting";
  }
  if (flow.blocking_stage === "operator_action") {
    return "operator_review_required";
  }
  if (
    productionProbeGate.tts_engine_health_status !== "pass" ||
    productionProbeGate.live2d_engine_health_status !== "pass"
  ) {
    return "real_device_waiting";
  }
  return "runtime_waiting";
}

function summarizeObsReadinessState({ artifactFlow, productionProbeGate }) {
  if (artifactFlow.flow_status === "configuration_attention") {
    return "configuration_waiting";
  }
  if (
    artifactFlow.blocking_stage === "obs_pickup" ||
    productionProbeGate.obs_bridge_health_passed_or_not_required !== true
  ) {
    return "real_device_waiting";
  }
  return "runtime_waiting";
}

function summarizeReadinessStateCounts(gates) {
  const counts = {
    ready: 0,
    configuration_waiting: 0,
    runtime_waiting: 0,
    real_device_waiting: 0,
    operator_review_required: 0,
  };
  for (const gate of gates) {
    const state = READINESS_STATES.has(gate?.readiness_state)
      ? gate.readiness_state
      : "operator_review_required";
    counts[state] += 1;
  }
  return counts;
}

function assertSafeReadinessState(state, context) {
  if (!READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
}

function assertSafeOptionalReadinessState(state, context) {
  if (state !== null) {
    assertSafeReadinessState(state, `${context}: readiness state`);
  }
}

function assertReadinessStateCountsSafe(counts, report, context) {
  assertReadinessStateCountsObjectSafe(counts, `${context}: readiness counts`);
  const expected = summarizeReadinessStateCounts([
    report.runtime_gate,
    report.real_engine_gate,
    report.obs_gate,
    report.production_probe_gate,
  ]);
  assertReadinessStateCountsObjectMatches(
    counts,
    expected,
    `${context}: readiness counts`
  );
}

function assertReadinessStateCountsObjectSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: readiness counts are required`);
  }
  for (const state of READINESS_STATES) {
    assertNonNegativeInteger(counts[state], `${context}: invalid ${state}`);
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: invalid readiness count key`);
    }
  }
}

function assertReadinessStateCountsObjectMatches(actual, expected, context) {
  for (const state of READINESS_STATES) {
    if (actual[state] !== expected[state]) {
      throw new ContractError(`${context}: mismatched ${state}`);
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

function isSafeOptionalScriptName(script) {
  return (
    typeof script === "string" &&
    /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      script
    )
  );
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

function assertGateNextCheckScriptSafe(gate, context) {
  if (gate.readiness_state === "ready") {
    if (gate.next_check_script !== null) {
      throw new ContractError(`${context}: ready gate must not expose next check`);
    }
    return;
  }
  assertSafeScriptName(gate.next_check_script, context);
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function nonNegativeIntegerOrZero(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function assertNoForbiddenFoundationLiveReadinessFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFoundationLiveReadinessFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FOUNDATION_LIVE_READINESS_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { field, path });
    }
    assertNoForbiddenFoundationLiveReadinessFields(child, context, `${path}.${field}`);
  }
}
