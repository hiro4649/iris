import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationStatusReportSafe,
  createFoundationStatusReport,
} from "./foundationStatus.js";
import {
  assertLocalBridgeRenderManifestOperatorReportSafe,
  createLocalBridgeRenderManifestOperatorReport,
} from "../../server/localBridgeRenderManifestReport.js";
import {
  assertOverlayEventStreamStatusSafe,
} from "../../server/overlayDisplayEvent.js";
import { assertOverlayStatusSafe, createOverlayStatus } from "../../server/overlayStatus.js";

const FORBIDDEN_FOUNDATION_RUNTIME_STATUS_FIELDS = new Set([
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

const RUNTIME_STATUSES = new Set([
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
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const OVERLAY_HEALTH_STATUSES = new Set(["fresh", "stale", "empty", "unavailable"]);
const OVERLAY_VISIBILITY_STATUSES = new Set(["visible", "hidden", "unavailable"]);
const LOCAL_BRIDGE_WORKER_READINESS_STATUSES = new Set([
  "not_configured",
  "idle",
  "work_pending",
  "retry_backoff",
  "operator_action_required",
  "active",
  "attention",
  "unavailable",
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
const RUNTIME_HANDOFF_FLOW_STATUSES = new Set([
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
const RUNTIME_HANDOFF_BLOCKING_STAGES = new Set([
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
const OBS_RENDER_ARTIFACT_FLOW_STATUSES = new Set([
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
const OBS_RENDER_ARTIFACT_BLOCKING_STAGES = new Set([
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
const LOCAL_BRIDGE_ADAPTER_KINDS = ["tts", "live2d", "subtitle"];
const RUNTIME_CHECK_SCRIPTS = {
  foundation_configuration: "npm run dev:foundation:status",
  local_bridge_worker: "npm run dev:bridge:status-roundtrip",
  real_engine_handoff: "npm run dev:engine:probe",
  obs_browser_source: "npm run dev:obs:browser-source",
  overlay_runtime: "npm run dev:streaming:local-runtime:check",
  runtime_event: "npm run dev:bridge:engine-roundtrip",
  overlay_event_stream: "npm run dev:obs:runtime-render-roundtrip",
  render_handoff: "npm run dev:obs:render-handoff-roundtrip",
  worker_status: "npm run dev:bridge:status-roundtrip",
  real_engine_configuration: "npm run dev:foundation:launch-plan",
  worker_storage: "npm run dev:foundation:status",
  runtime_jobs: "npm run dev:bridge:engine-roundtrip",
  worker_queue: "npm run dev:bridge:status-roundtrip",
  retry_backoff: "npm run dev:bridge:status-roundtrip",
  operator_action: "npm run dev:bridge:status-roundtrip",
  worker_attention: "npm run dev:bridge:status-roundtrip",
  render_manifest_store: "npm run dev:bridge:status-roundtrip",
  render_manifest: "npm run dev:bridge:render-manifest",
  artifact_availability: "npm run dev:obs:render-handoff-roundtrip",
  artifact_contract: "npm run dev:obs:render-handoff-roundtrip",
  obs_pickup: "npm run dev:obs:runtime-render-roundtrip",
  none: null,
};
const URL_PATTERN = /https?:\/\//i;
const UNSAFE_LABEL_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory|relationship|candidate|canonical|secret|token|password|authorization|endpoint|url|payload|text)\b|https?:\/\//i;

const FOUNDATION_RUNTIME_STATUS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "runtime_status",
  "next_readiness_state",
  "readiness_state_counts",
  "foundation_readiness_status",
  "foundation_attention_reason_count",
  "foundation_next_attention_reason",
  "overlay_runtime",
  "render_handoff",
  "local_bridge_worker_runtime",
  "real_engine_handoff",
  "real_engine_worker_flow",
  "obs_browser_source_runtime",
  "runtime_handoff_flow",
  "obs_render_artifact_flow",
  "runtime_summary",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);

const FOUNDATION_RUNTIME_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "runtime_status_report_only",
  "real_processes_not_started_by_report",
  "real_engine_calls_not_started_by_report",
  "real_obs_operation_not_started_by_report",
  "runtime_adapter_packets_not_exposed",
  "raw_stream_state_not_exposed",
  "raw_overlay_events_not_exposed",
  "text_payloads_not_exposed",
  "artifact_paths_not_exposed",
  "endpoint_values_not_exposed",
  "secret_values_not_exposed",
  "commands_not_exposed",
  "candidates_not_exposed",
  "runtime_status",
  "next_readiness_state",
  "readiness_state_counts",
  "foundation_ready_for_obs_runtime_handoff",
  "overlay_runtime_ready",
  "overlay_event_stream_ready",
  "local_bridge_worker_ready",
  "real_engine_handoff_ready",
  "obs_browser_source_ready",
  "obs_handoff_ready",
  "render_manifest_available",
  "obs_pickup_ready",
  "artifact_pickup_ready_adapter_count",
  "configured_real_engine_count",
  "rendered_manifest_count",
  "pending_worker_job_count",
  "retry_blocked_worker_job_count",
  "local_bridge_worker_attention_reason",
  "local_bridge_worker_next_operator_action_id",
  "event_stream_client_count",
  "event_stream_published_count",
  "local_bridge_handoff_route_count",
  "real_engine_worker_flow_status",
  "next_runtime_attention",
  "next_runtime_check_script",
]);

export function createFoundationRuntimeStatusReport({
  env = process.env,
  streamState = null,
  overlayEventBus = null,
  generatedAtMs = Date.now(),
} = {}) {
  const foundation = createFoundationStatusReport({ env, generatedAtMs });
  const renderReport = createLocalBridgeRenderManifestOperatorReport({
    artifactDir: env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR || "data/local_bridge_artifacts",
    showLocalPaths: false,
    maxManifestAgeMs: env.IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS ?? null,
    maxArtifactRenderSkewMs:
      env.IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS ?? null,
    nowMs: generatedAtMs,
  });
  assertFoundationStatusReportSafe(foundation, "foundation runtime foundation input");
  assertLocalBridgeRenderManifestOperatorReportSafe(
    renderReport,
    "foundation runtime render manifest input"
  );

  const overlayRuntime = createOverlayRuntimeSummary({
    streamState,
    overlayEventBus,
    generatedAtMs,
  });
  const renderHandoff = createRenderHandoffSummary(renderReport);
  const workerRuntime = createLocalBridgeWorkerRuntimeSummary(
    foundation.local_bridge_engine_status
  );
  const realEngineHandoff = createRealEngineHandoffRuntimeSummary({
    foundation,
    workerStatus: foundation.local_bridge_engine_status,
    workerRuntime,
  });
  const realEngineWorkerFlow = createRealEngineWorkerFlowSummary({
    foundation,
    workerRuntime,
    realEngineHandoff,
  });
  const obsBrowserSourceRuntime = createObsBrowserSourceRuntimeSummary(
    foundation.obs_browser_source_status
  );
  const runtimeStatus = summarizeRuntimeStatus({
    foundation,
    overlayRuntime,
    renderHandoff,
    workerRuntime,
    realEngineHandoff,
    obsBrowserSourceRuntime,
  });
  const nextReadinessState = readinessStateForRuntimeStatus(runtimeStatus);
  const readinessStateCounts = countReadinessStates([nextReadinessState]);
  const runtimeSummary = createRuntimeSummary({
    foundation,
    overlayRuntime,
    renderHandoff,
    workerRuntime,
    realEngineHandoff,
    obsBrowserSourceRuntime,
    runtimeStatus,
  });
  const report = {
    schema: "iris_foundation_runtime_status_report_v1",
    generated_at_ms: generatedAtMs,
    runtime_status: runtimeStatus,
    next_readiness_state: nextReadinessState,
    readiness_state_counts: readinessStateCounts,
    foundation_readiness_status: foundation.foundation_readiness_status,
    foundation_attention_reason_count:
      foundation.foundation_summary.attention_reason_count,
    foundation_next_attention_reason:
      foundation.foundation_summary.next_attention_reason,
    overlay_runtime: overlayRuntime,
    render_handoff: renderHandoff,
    local_bridge_worker_runtime: workerRuntime,
    real_engine_handoff: realEngineHandoff,
    real_engine_worker_flow: realEngineWorkerFlow,
    obs_browser_source_runtime: obsBrowserSourceRuntime,
    runtime_handoff_flow: createRuntimeHandoffFlowSummary({
      foundation,
      overlayRuntime,
      renderHandoff,
      workerRuntime,
      realEngineHandoff,
      obsBrowserSourceRuntime,
      runtimeStatus,
    }),
    obs_render_artifact_flow: createObsRenderArtifactFlowSummary({
      foundation,
      overlayRuntime,
      renderHandoff,
      workerRuntime,
      realEngineHandoff,
      obsBrowserSourceRuntime,
    }),
    runtime_summary: runtimeSummary,
    production_handoff_summary: createFoundationRuntimeProductionHandoffSummary({
      runtimeStatus,
      runtimeSummary,
      overlayRuntime,
      renderHandoff,
      workerRuntime,
      realEngineHandoff,
      realEngineWorkerFlow,
      obsBrowserSourceRuntime,
      nextReadinessState,
      readinessStateCounts,
    }),
    boundary_policy: {
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_artifact_paths: true,
      no_candidates: true,
      no_commands: true,
      no_raw_stream_state: true,
      no_raw_overlay_events: true,
      read_only_runtime_status: true,
      no_engine_calls: true,
      no_obs_setup_side_effects: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertFoundationRuntimeStatusReportSafe(report);
  return report;
}

export function assertFoundationRuntimeStatusReportSafe(
  report,
  context = "foundation runtime status report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenFoundationRuntimeFields(report, context);
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_foundation_runtime_status_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!FOUNDATION_RUNTIME_STATUS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated time`);
  }
  if (!RUNTIME_STATUSES.has(report.runtime_status)) {
    throw new ContractError(`${context}: invalid runtime status`);
  }
  assertSafeReadinessState(report.next_readiness_state, context);
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  if (
    report.next_readiness_state !==
      readinessStateForRuntimeStatus(report.runtime_status) ||
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      countReadinessStates([report.next_readiness_state])
    )
  ) {
    throw new ContractError(`${context}: invalid runtime readiness labels`);
  }
  if (
    !["ready_for_runtime_handoff", "attention_required"].includes(
      report.foundation_readiness_status
    )
  ) {
    throw new ContractError(`${context}: invalid foundation readiness`);
  }
  assertNonNegativeInteger(
    report.foundation_attention_reason_count,
    `${context}: invalid foundation attention count`
  );
  if (
    report.foundation_next_attention_reason !== null &&
    !isSafeStatusLabel(report.foundation_next_attention_reason)
  ) {
    throw new ContractError(`${context}: invalid foundation attention reason`);
  }
  assertOverlayRuntimeSummarySafe(report.overlay_runtime, context);
  assertRenderHandoffSummarySafe(report.render_handoff, context);
  assertLocalBridgeWorkerRuntimeSummarySafe(
    report.local_bridge_worker_runtime,
    context
  );
  assertRealEngineHandoffRuntimeSummarySafe(
    report.real_engine_handoff,
    context
  );
  assertRealEngineWorkerFlowSummarySafe(report.real_engine_worker_flow, context);
  assertObsBrowserSourceRuntimeSummarySafe(
    report.obs_browser_source_runtime,
    context
  );
  assertRuntimeHandoffFlowSummarySafe(report.runtime_handoff_flow, context);
  assertObsRenderArtifactFlowSummarySafe(report.obs_render_artifact_flow, context);
  assertRuntimeSummarySafe(report.runtime_summary, context);
  assertFoundationRuntimeProductionHandoffSummarySafe(
    report.production_handoff_summary,
    report,
    context
  );
  assertBoundaryPolicy(
    report.boundary_policy,
    [
      "env_names_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_live_payloads",
      "no_text_payloads",
      "no_artifact_paths",
      "no_candidates",
      "no_commands",
      "no_raw_stream_state",
      "no_raw_overlay_events",
      "read_only_runtime_status",
      "no_engine_calls",
      "no_obs_setup_side_effects",
      "script_names_only",
    ],
    `${context}: boundary policy`
  );
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

function createOverlayRuntimeSummary({ streamState, overlayEventBus, generatedAtMs }) {
  const state = readStreamState(streamState);
  const overlayStatus = state
    ? createOverlayStatus(state, { nowMs: generatedAtMs })
    : null;
  if (overlayStatus) {
    assertOverlayStatusSafe(overlayStatus, "foundation runtime overlay status input");
  }
  const eventStreamStatus = readOverlayEventStreamStatus({
    overlayEventBus,
    generatedAtMs,
  });
  const runtimeEventAvailable = hasRuntimeEventEvidence({
    overlayStatus,
    state,
  });
  const streamStateAvailable =
    runtimeEventAvailable ||
    safeOptionalStatusLabel(state?.status) !== null ||
    safeOptionalStatusLabel(state?.last_payload_kind) !== null ||
    safeNullableNonNegativeNumber(overlayStatus?.state_age_ms) !== null;
  const overlayEventStreamAvailable =
    eventStreamStatus?.stream_ready === true ||
    safeNonNegativeNumber(eventStreamStatus?.client_count) !== null ||
    safeNonNegativeNumber(eventStreamStatus?.published_count) !== null ||
    safeNullableNonNegativeNumber(eventStreamStatus?.latest_event_age_ms) !== null;
  const overlayArtifactAvailable = (kind) =>
    overlayStatus?.[`${kind}_artifact_available`] === true ||
    safeOptionalStatusLabel(overlayStatus?.[`${kind}_artifact_kind`]) !== null;
  const summary = {
    schema: "iris_foundation_overlay_runtime_summary_v1",
    stream_state_available: streamStateAvailable,
    overlay_status_available: streamStateAvailable && overlayStatus !== null,
    overlay_event_stream_available: overlayEventStreamAvailable,
    overlay_health: overlayStatus?.health ?? "unavailable",
    overlay_visibility_state: overlayStatus?.visibility_state ?? "unavailable",
    subtitle_visible: overlayStatus?.subtitle_visible === true,
    runtime_event_available: runtimeEventAvailable,
    latest_payload_kind: safeOptionalStatusLabel(overlayStatus?.last_payload_kind),
    state_age_ms: safeNullableNonNegativeNumber(overlayStatus?.state_age_ms),
    planned_visible_ms: safeNullableNonNegativeNumber(overlayStatus?.planned_visible_ms),
    event_stream_ready: overlayEventStreamAvailable,
    event_stream_client_count:
      safeNonNegativeNumber(eventStreamStatus?.client_count) ?? 0,
    event_stream_published_count:
      safeNonNegativeNumber(eventStreamStatus?.published_count) ?? 0,
    event_stream_latest_event_age_ms: safeNullableNonNegativeNumber(
      eventStreamStatus?.latest_event_age_ms
    ),
    tts_bridge_status: safeOptionalStatusLabel(overlayStatus?.tts_bridge_status),
    tts_artifact_available: overlayArtifactAvailable("tts"),
    live2d_bridge_status: safeOptionalStatusLabel(overlayStatus?.live2d_bridge_status),
    live2d_artifact_available: overlayArtifactAvailable("live2d"),
    subtitle_bridge_status: safeOptionalStatusLabel(
      overlayStatus?.subtitle_bridge_status
    ),
    subtitle_artifact_available: overlayArtifactAvailable("subtitle"),
    boundary_policy: {
      booleans_counts_and_fixed_statuses_only: true,
      no_raw_stream_state: true,
      no_raw_overlay_events: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertOverlayRuntimeSummarySafe(summary, "foundation runtime overlay summary");
  return summary;
}

function createFoundationRuntimeProductionHandoffSummary({
  runtimeStatus,
  runtimeSummary,
  overlayRuntime,
  renderHandoff,
  workerRuntime,
  realEngineHandoff,
  realEngineWorkerFlow,
  obsBrowserSourceRuntime,
  nextReadinessState,
  readinessStateCounts,
}) {
  const renderManifestAvailable =
    renderHandoff.render_manifest_store_configured === true &&
    renderHandoff.latest_manifest_available === true;
  const obsPickupReady =
    renderHandoff.obs_handoff_readiness_status === "ready" &&
    renderManifestAvailable &&
    renderHandoff.latest_manifest_fresh === true &&
    renderHandoff.artifact_render_sync_ready === true &&
    renderHandoff.all_artifact_files_available === true &&
    renderHandoff.all_artifacts_contract_valid_for_pickup === true &&
    renderHandoff.obs_pickup_blocking_adapter_count === 0;
  const obsBrowserSourceReady =
    obsBrowserSourceRuntime.origin_configured === true &&
    obsBrowserSourceRuntime.source_dimensions_configured === true &&
    obsBrowserSourceRuntime.overlay_routes_ready === true &&
    obsBrowserSourceRuntime.local_bridge_handoff_routes_ready === true &&
    obsBrowserSourceRuntime.required_adapter_kind_count ===
      LOCAL_BRIDGE_ADAPTER_KINDS.length;
  const overlayEventStreamReady =
    overlayRuntime.event_stream_ready === true ||
    overlayRuntime.event_stream_client_count > 0 ||
    overlayRuntime.event_stream_published_count > 0 ||
    overlayRuntime.event_stream_latest_event_age_ms !== null;
  const overlayRuntimeReady =
    overlayRuntime.stream_state_available === true &&
    overlayRuntime.overlay_status_available === true;
  const localBridgeWorkerReady =
    ["idle", "active"].includes(workerRuntime.worker_readiness_status) ||
    (workerRuntime.worker_readiness_status === "attention" &&
      LOCAL_BRIDGE_ADAPTER_KINDS.every((kind) =>
        ["idle", "active"].includes(workerRuntime.adapter_readiness_status[kind])
      ) &&
      activeWorkerPendingJobCount(workerRuntime) === 0 &&
      workerRuntime.queue_retry_ready_count === 0 &&
      workerRuntime.queue_retry_waiting_count === 0 &&
      workerRuntime.queue_retry_blocked_count === 0 &&
      workerRuntime.queue_invalid_json_line_count === 0);
  const realEngineHandoffReady =
    (realEngineHandoff.handoff_status === "active" ||
      realEngineHandoff.handoff_status === "ready_waiting_for_runtime_event") &&
    realEngineHandoff.queue_clear === true;
  return {
    schema: "iris_foundation_runtime_status_handoff_summary_v1",
    runtime_status_report_only: true,
    real_processes_not_started_by_report: true,
    real_engine_calls_not_started_by_report: true,
    real_obs_operation_not_started_by_report: true,
    runtime_adapter_packets_not_exposed: true,
    raw_stream_state_not_exposed: true,
    raw_overlay_events_not_exposed: true,
    text_payloads_not_exposed: true,
    artifact_paths_not_exposed: true,
    endpoint_values_not_exposed: true,
    secret_values_not_exposed: true,
    commands_not_exposed: true,
    candidates_not_exposed: true,
    runtime_status: runtimeStatus,
    next_readiness_state: nextReadinessState,
    readiness_state_counts: readinessStateCounts,
    foundation_ready_for_obs_runtime_handoff:
      runtimeStatus === "ready_for_obs_runtime_handoff" &&
      runtimeSummary.local_bridge_worker_ready === true,
    overlay_runtime_ready: overlayRuntimeReady,
    overlay_event_stream_ready: overlayEventStreamReady,
    local_bridge_worker_ready: localBridgeWorkerReady,
    real_engine_handoff_ready: realEngineHandoffReady,
    obs_browser_source_ready: obsBrowserSourceReady,
    obs_handoff_ready: obsPickupReady,
    render_manifest_available: renderManifestAvailable,
    obs_pickup_ready: obsPickupReady,
    artifact_pickup_ready_adapter_count: countAdapterStatus(
      renderHandoff.artifact_pickup_status_by_adapter,
      "ready"
    ),
    configured_real_engine_count:
      realEngineHandoff.configured_real_engine_count,
    rendered_manifest_count: realEngineHandoff.complete_manifest_count,
    pending_worker_job_count: activeWorkerPendingJobCount(workerRuntime),
    retry_blocked_worker_job_count: workerRuntime.queue_retry_blocked_count,
    local_bridge_worker_attention_reason:
      workerRuntime.operator_action_reason,
    local_bridge_worker_next_operator_action_id:
      workerRuntime.operator_action_id,
    event_stream_client_count: overlayRuntime.event_stream_client_count,
    event_stream_published_count: overlayRuntime.event_stream_published_count,
    local_bridge_handoff_route_count:
      obsBrowserSourceRuntime.local_bridge_handoff_route_count,
    real_engine_worker_flow_status: realEngineWorkerFlow.flow_status,
    next_runtime_attention: runtimeSummary.next_runtime_attention,
    next_runtime_check_script: runtimeSummary.next_runtime_check_script,
  };
}

function createRenderHandoffSummary(renderReport) {
  const latest = renderReport.latest_manifest_summary ?? null;
  const store = renderReport.store_status ?? {};
  const manifestCount = requiredRenderManifestStoreCount(
    store,
    "manifest_count",
    "foundation render manifest store count"
  );
  const completeManifestCount = requiredRenderManifestStoreCount(
    store,
    "complete_manifest_count",
    "foundation render complete manifest store count"
  );
  const invalidJsonLineCount = requiredRenderManifestStoreCount(
    store,
    "invalid_json_line_count",
    "foundation render manifest invalid JSON line count"
  );
  const artifactFileAvailableByAdapter = summarizeRenderAdapterBooleanMap(
    latest?.artifact_file_available_by_adapter
  );
  const allArtifactFilesAvailable = LOCAL_BRIDGE_ADAPTER_KINDS.every(
    (kind) => artifactFileAvailableByAdapter[kind] === true
  );
  const artifactRenderSyncReady = ["not_enforced", "synchronized"].includes(
    safeOptionalStatusLabel(latest?.artifact_render_sync_status)
  );
  const obsPickupBlockingAdapterCount =
    safeNonNegativeNumber(latest?.obs_pickup_blocking_adapter_count) ?? null;
  const obsPickupReady =
    safeRequiredStatusLabel(renderReport.obs_pickup_status) === "ready" &&
    latest?.manifest_fresh === true &&
    artifactRenderSyncReady &&
    allArtifactFilesAvailable &&
    latest?.all_artifacts_contract_valid_for_pickup === true &&
    obsPickupBlockingAdapterCount === 0;
  const summary = {
    schema: "iris_foundation_render_handoff_runtime_summary_v1",
    render_manifest_store_configured:
      manifestCount > 0 || completeManifestCount > 0 || invalidJsonLineCount > 0,
    manifest_count: manifestCount,
    complete_manifest_count: completeManifestCount,
    invalid_json_line_count: invalidJsonLineCount,
    latest_manifest_available:
      latest !== null && typeof latest === "object" && !Array.isArray(latest),
    latest_manifest_error_kind: safeOptionalStatusLabel(
      renderReport.latest_manifest_error_kind
    ),
    obs_pickup_status: safeRequiredStatusLabel(renderReport.obs_pickup_status),
    obs_handoff_readiness_status: safeRequiredStatusLabel(
      renderReport.obs_handoff_readiness_status
    ),
    latest_manifest_freshness_status: safeOptionalStatusLabel(
      latest?.manifest_freshness_status
    ),
    latest_manifest_fresh: latest?.manifest_fresh ?? null,
    latest_artifact_render_sync_status: safeOptionalStatusLabel(
      latest?.artifact_render_sync_status
    ),
    artifact_render_sync_ready: artifactRenderSyncReady,
    artifact_render_sync_rejected_for_obs_pickup:
      latest?.artifact_render_sync_rejected_for_obs_pickup === true,
    artifact_render_skew_ms: safeNullableNonNegativeNumber(
      latest?.artifact_render_skew_ms
    ),
    max_artifact_render_skew_ms: safeNullableNonNegativeNumber(
      latest?.max_artifact_render_skew_ms
    ),
    manifest_id_match_required_for_artifact_pickup: true,
    obs_pickup_ready: obsPickupReady,
    all_artifact_files_available: allArtifactFilesAvailable,
    all_artifacts_contract_valid_for_pickup:
      latest?.all_artifacts_contract_valid_for_pickup === true,
    artifact_file_available_by_adapter: artifactFileAvailableByAdapter,
    artifact_content_type_status_by_adapter: summarizeRenderAdapterContentTypeStatusMap(
      latest?.artifact_content_type_by_adapter
    ),
    artifact_size_status_by_adapter: summarizeRenderAdapterSizeStatusMap(
      latest?.artifact_size_bytes_by_adapter
    ),
    artifact_contract_status_by_adapter: summarizeRenderAdapterStatusMap(
      latest?.artifact_contract_status_by_adapter
    ),
    artifact_pickup_status_by_adapter: summarizeRenderAdapterStatusMap(
      latest?.artifact_pickup_status_by_adapter
    ),
    obs_pickup_blocking_status_by_adapter: summarizeRenderAdapterStatusMap(
      latest?.obs_pickup_blocking_status_by_adapter
    ),
    obs_pickup_blocking_adapter_count: obsPickupBlockingAdapterCount,
    boundary_policy: {
      booleans_counts_and_fixed_statuses_only: true,
      no_artifact_paths: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertRenderHandoffSummarySafe(summary, "foundation runtime render handoff summary");
  return summary;
}

function requiredRenderManifestStoreCount(store, field, context) {
  if (store?.artifact_dir_configured !== true) return 0;
  const number = safeNonNegativeNumber(store?.[field]);
  if (number === null) {
    throw new ContractError(`${context}: ${field} is required`);
  }
  return number;
}

function createLocalBridgeWorkerRuntimeSummary(workerStatus) {
  const queue = workerStatus?.outbox_queue ?? {};
  const manifestStore = workerStatus?.event_render_manifests ?? {};
  const adapterReadiness = workerStatus?.adapter_readiness_status ?? {};
  const engineModes = summarizeLocalBridgeEngineModes(workerStatus?.engine_modes);
  const manifestCount = requiredWorkerRuntimeCount(
    workerStatus,
    manifestStore,
    "manifest_count",
    "foundation worker manifest count"
  );
  const completeManifestCount = requiredWorkerRuntimeCount(
    workerStatus,
    manifestStore,
    "complete_manifest_count",
    "foundation worker complete manifest count"
  );
  const manifestInvalidJsonLineCount = requiredWorkerRuntimeCount(
    workerStatus,
    manifestStore,
    "invalid_json_line_count",
    "foundation worker manifest invalid JSON line count"
  );
  const queueTotalJobCount = requiredWorkerRuntimeCount(
    workerStatus,
    queue,
    "total_job_count",
    "foundation worker queue total job count"
  );
  const queuePendingJobCount = requiredWorkerRuntimeCount(
    workerStatus,
    queue,
    "total_pending_count",
    "foundation worker queue pending count"
  );
  const queueExpiredJobCount = requiredWorkerRuntimeCount(
    workerStatus,
    queue,
    "total_expired_count",
    "foundation worker queue expired count"
  );
  const queueExpiredPendingJobCount = requiredWorkerRuntimeCount(
    workerStatus,
    queue,
    "total_expired_pending_count",
    "foundation worker queue expired pending count"
  );
  const queueRetryReadyCount = requiredWorkerRuntimeCount(
    workerStatus,
    queue,
    "total_retry_ready_count",
    "foundation worker queue retry ready count"
  );
  const queueRetryWaitingCount = requiredWorkerRuntimeCount(
    workerStatus,
    queue,
    "total_retry_waiting_count",
    "foundation worker queue retry waiting count"
  );
  const queueRetryBlockedCount = requiredWorkerRuntimeCount(
    workerStatus,
    queue,
    "total_retry_blocked_count",
    "foundation worker queue retry blocked count"
  );
  const queueInvalidJsonLineCount = requiredWorkerRuntimeCount(
    workerStatus,
    queue,
    "total_invalid_json_line_count",
    "foundation worker queue invalid JSON line count"
  );
  const queueActivePendingJobCount = Math.max(
    0,
    queuePendingJobCount - queueExpiredPendingJobCount
  );
  const latestCompleteManifestReady =
    completeManifestCount > 0 &&
    manifestInvalidJsonLineCount === 0 &&
    queueRetryBlockedCount === 0 &&
    queueInvalidJsonLineCount === 0;
  const workerReadinessStatus = safeRequiredWorkerReadinessStatus(
    workerStatus?.worker_readiness_status
  );
  const adapterReadinessStatus = summarizeLocalBridgeAdapterReadiness(
    adapterReadiness
  );
  const workerStatusAvailable =
    workerReadinessStatus !== "unavailable" ||
    manifestStore.artifact_dir_configured === true ||
    workerStatus?.artifact_dir_configured === true ||
    queueTotalJobCount > 0 ||
    queuePendingJobCount > 0 ||
    queueExpiredJobCount > 0 ||
    queueRetryReadyCount > 0 ||
    queueRetryWaitingCount > 0 ||
    queueRetryBlockedCount > 0 ||
    queueInvalidJsonLineCount > 0;
  const adaptersReadyForHandoff = LOCAL_BRIDGE_ADAPTER_KINDS.every((kind) =>
    ["idle", "active"].includes(adapterReadinessStatus[kind])
  );
  const summary = {
    schema: "iris_foundation_local_bridge_worker_runtime_summary_v1",
    worker_status_available: workerStatusAvailable,
    worker_readiness_status: workerReadinessStatus,
    worker_ready_for_handoff:
      ["idle", "active"].includes(workerReadinessStatus) ||
      (workerReadinessStatus === "attention" &&
        adaptersReadyForHandoff &&
        queueActivePendingJobCount === 0 &&
        queueRetryReadyCount === 0 &&
        queueRetryWaitingCount === 0 &&
        queueRetryBlockedCount === 0 &&
        queueInvalidJsonLineCount === 0),
    adapter_readiness_status: adapterReadinessStatus,
    engine_modes: engineModes,
    engine_mode_summary: summarizeLocalBridgeWorkerEngineModeSummary(engineModes),
    artifact_store_configured:
      queueTotalJobCount > 0 ||
      queuePendingJobCount > 0 ||
      queueExpiredJobCount > 0 ||
      queueRetryReadyCount > 0 ||
      queueRetryWaitingCount > 0 ||
      queueRetryBlockedCount > 0 ||
      queueInvalidJsonLineCount > 0,
    render_manifest_store_configured:
      manifestStore.artifact_dir_configured === true,
    manifest_count: manifestCount,
    complete_manifest_count: completeManifestCount,
    manifest_invalid_json_line_count: manifestInvalidJsonLineCount,
    queue_total_job_count: queueTotalJobCount,
    queue_pending_job_count: queuePendingJobCount,
    queue_expired_job_count: queueExpiredJobCount,
    queue_expired_pending_job_count: queueExpiredPendingJobCount,
    queue_retry_ready_count: queueRetryReadyCount,
    queue_retry_waiting_count: queueRetryWaitingCount,
    queue_retry_blocked_count: queueRetryBlockedCount,
    queue_invalid_json_line_count: queueInvalidJsonLineCount,
    queue_clear:
      (latestCompleteManifestReady || queueActivePendingJobCount === 0) &&
      queueRetryReadyCount === 0 &&
      queueRetryWaitingCount === 0 &&
      queueRetryBlockedCount === 0 &&
      queueInvalidJsonLineCount === 0,
    operator_action_required:
      workerStatus?.worker_readiness_status === "operator_action_required" ||
      queueRetryBlockedCount > 0,
    operator_action_reason: summarizeWorkerOperatorActionReason({
      workerReadinessStatus: workerStatus?.worker_readiness_status,
      adapterReadiness,
      queueRetryBlockedCount,
      queueInvalidJsonLineCount,
    }),
    operator_action_id: summarizeWorkerOperatorActionId({
      workerReadinessStatus: workerStatus?.worker_readiness_status,
      adapterReadiness,
      queueRetryBlockedCount,
      queueInvalidJsonLineCount,
    }),
    boundary_policy: {
      booleans_counts_and_fixed_statuses_only: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_artifact_paths: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertLocalBridgeWorkerRuntimeSummarySafe(
    summary,
    "foundation runtime worker summary"
  );
  return summary;
}

function requiredWorkerRuntimeCount(workerStatus, source, field, context) {
  if (!workerStatus) return 0;
  const number = safeNonNegativeNumber(source?.[field]);
  if (number === null) {
    throw new ContractError(`${context}: ${field} is required`);
  }
  return number;
}

function activeWorkerPendingJobCount(workerRuntime) {
  return Math.max(
    0,
    (workerRuntime?.queue_pending_job_count ?? 0) -
      (workerRuntime?.queue_expired_pending_job_count ?? 0)
  );
}

function summarizeLocalBridgeWorkerEngineModeSummary(engineModes) {
  const realHttpEngineCount = LOCAL_BRIDGE_ADAPTER_KINDS.filter(
    (kind) => engineModes[kind] === "http"
  ).length;
  const localPlaceholderEngineCount = LOCAL_BRIDGE_ADAPTER_KINDS.filter((kind) =>
    engineModes[kind] === "local_placeholder"
  ).length;
  return {
    schema: "iris_foundation_local_bridge_worker_engine_mode_summary_v1",
    tts_engine_real_http_configured: engineModes.tts === "http",
    live2d_engine_real_http_configured: engineModes.live2d === "http",
    subtitle_engine_local_vtt: engineModes.subtitle === "local_vtt",
    real_http_engine_count: realHttpEngineCount,
    local_placeholder_engine_count: localPlaceholderEngineCount,
    all_real_http_engines_configured:
      engineModes.tts === "http" && engineModes.live2d === "http",
    placeholder_mode_active: localPlaceholderEngineCount > 0,
    production_engine_handoff_state:
      engineModes.tts === "http" && engineModes.live2d === "http"
        ? "real_tts_live2d_configured"
        : localPlaceholderEngineCount > 0
          ? "local_placeholder_mode_active"
          : "local_artifact_handoff_active",
    boundary_policy: {
      modes_and_counts_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_artifact_paths: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function summarizeWorkerOperatorActionReason({
  workerReadinessStatus,
  adapterReadiness,
  queueRetryBlockedCount,
  queueInvalidJsonLineCount,
}) {
  if (queueRetryBlockedCount > 0) return "retry_blocked_jobs";
  if (queueInvalidJsonLineCount > 0) return "invalid_queue_lines";
  const adapterStatuses = summarizeLocalBridgeAdapterReadiness(adapterReadiness);
  if (
    Object.values(adapterStatuses).some(
      (status) => status === "operator_action_required"
    )
  ) {
    return "adapter_operator_action_required";
  }
  if (workerReadinessStatus === "operator_action_required") {
    return "worker_reported_operator_action";
  }
  return null;
}

function summarizeWorkerOperatorActionId({
  workerReadinessStatus,
  adapterReadiness,
  queueRetryBlockedCount,
  queueInvalidJsonLineCount,
}) {
  if (queueRetryBlockedCount > 0) return "review_retry_blocked_engine_jobs";
  if (queueInvalidJsonLineCount > 0) return "review_worker_queue_format";
  const adapterStatuses = summarizeLocalBridgeAdapterReadiness(adapterReadiness);
  if (
    Object.values(adapterStatuses).some(
      (status) => status === "operator_action_required"
    )
  ) {
    return "review_adapter_operator_action";
  }
  if (workerReadinessStatus === "operator_action_required") {
    return "review_worker_operator_action";
  }
  return null;
}

function createRealEngineHandoffRuntimeSummary({
  foundation,
  workerStatus,
  workerRuntime,
}) {
  const engineModes = summarizeLocalBridgeEngineModes(workerStatus?.engine_modes);
  const enginePreferences = summarizeEnginePreferencesConfigured(
    workerStatus?.engine_preferences_configured
  );
  const ttsEngineHttpReady =
    foundation.foundation_summary.real_tts_engine_configured === true &&
    engineModes.tts === "http";
  const live2dEngineHttpReady =
    foundation.foundation_summary.real_live2d_engine_configured === true &&
    engineModes.live2d === "http";
  const configuredRealEngineCount =
    (ttsEngineHttpReady ? 1 : 0) + (live2dEngineHttpReady ? 1 : 0);
  const adapterReadyCount = LOCAL_BRIDGE_ADAPTER_KINDS.filter((kind) =>
    ["idle", "active"].includes(workerRuntime.adapter_readiness_status[kind])
  ).length;
  const workerReadyForHandoff =
    ["idle", "active"].includes(workerRuntime.worker_readiness_status) ||
    (workerRuntime.worker_readiness_status === "attention" &&
      LOCAL_BRIDGE_ADAPTER_KINDS.every((kind) =>
        ["idle", "active"].includes(workerRuntime.adapter_readiness_status[kind])
      ) &&
      activeWorkerPendingJobCount(workerRuntime) === 0 &&
      workerRuntime.queue_retry_ready_count === 0 &&
      workerRuntime.queue_retry_waiting_count === 0 &&
      workerRuntime.queue_retry_blocked_count === 0 &&
      workerRuntime.queue_invalid_json_line_count === 0);
  const queueClear =
    activeWorkerPendingJobCount(workerRuntime) === 0 &&
    workerRuntime.queue_retry_ready_count === 0 &&
    workerRuntime.queue_retry_waiting_count === 0 &&
    workerRuntime.queue_retry_blocked_count === 0 &&
    workerRuntime.queue_invalid_json_line_count === 0;
  const summary = {
    schema: "iris_foundation_real_engine_handoff_runtime_summary_v1",
    handoff_status: summarizeRealEngineHandoffStatus({
      configuredRealEngineCount,
      workerRuntime,
    }),
    tts_engine_mode: engineModes.tts,
    live2d_engine_mode: engineModes.live2d,
    subtitle_engine_mode: engineModes.subtitle,
    tts_engine_http_ready: ttsEngineHttpReady,
    live2d_engine_http_ready: live2dEngineHttpReady,
    subtitle_renderer_ready: ["local_vtt", "http"].includes(engineModes.subtitle),
    tts_engine_preferences_configured: enginePreferences.tts,
    live2d_engine_preferences_configured: enginePreferences.live2d,
    required_real_engine_count: 2,
    configured_real_engine_count: configuredRealEngineCount,
    adapter_ready_count: adapterReadyCount,
    worker_ready_for_handoff: workerReadyForHandoff,
    queue_clear: queueClear,
    queue_pending_job_count: activeWorkerPendingJobCount(workerRuntime),
    queue_retry_ready_count: workerRuntime.queue_retry_ready_count,
    queue_retry_waiting_count: workerRuntime.queue_retry_waiting_count,
    queue_retry_blocked_count: workerRuntime.queue_retry_blocked_count,
    queue_invalid_json_line_count: workerRuntime.queue_invalid_json_line_count,
    artifact_store_configured: workerRuntime.artifact_store_configured,
    render_manifest_store_configured:
      workerRuntime.render_manifest_store_configured,
    complete_manifest_count: workerRuntime.complete_manifest_count,
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_engine_request_values: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_artifact_paths: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertRealEngineHandoffRuntimeSummarySafe(
    summary,
    "foundation runtime real engine handoff summary"
  );
  return summary;
}

function summarizeRealEngineHandoffStatus({
  configuredRealEngineCount,
  workerRuntime,
}) {
  const queueClear =
    activeWorkerPendingJobCount(workerRuntime) === 0 &&
    workerRuntime.queue_retry_ready_count === 0 &&
    workerRuntime.queue_retry_waiting_count === 0 &&
    workerRuntime.queue_retry_blocked_count === 0 &&
    workerRuntime.queue_invalid_json_line_count === 0;
  const workerReadyForHandoff =
    ["idle", "active"].includes(workerRuntime.worker_readiness_status) ||
    (workerRuntime.worker_readiness_status === "attention" &&
      LOCAL_BRIDGE_ADAPTER_KINDS.every((kind) =>
        ["idle", "active"].includes(workerRuntime.adapter_readiness_status[kind])
      ) &&
      activeWorkerPendingJobCount(workerRuntime) === 0 &&
      workerRuntime.queue_retry_ready_count === 0 &&
      workerRuntime.queue_retry_waiting_count === 0 &&
      workerRuntime.queue_retry_blocked_count === 0 &&
      workerRuntime.queue_invalid_json_line_count === 0);
  if (workerRuntime.worker_status_available !== true) return "unavailable";
  if (
    configuredRealEngineCount < 2 ||
    workerRuntime.artifact_store_configured !== true ||
    workerRuntime.render_manifest_store_configured !== true
  ) {
    return "not_configured";
  }
  if (workerRuntime.operator_action_required === true) {
    return "operator_action_required";
  }
  if (
    !workerReadyForHandoff &&
    (workerRuntime.worker_readiness_status === "attention" ||
      workerRuntime.queue_invalid_json_line_count > 0)
  ) {
    return "attention";
  }
  if (workerRuntime.queue_retry_waiting_count > 0) return "retry_backoff";
  if (
    workerReadyForHandoff &&
    queueClear &&
    workerRuntime.complete_manifest_count > 0
  ) {
    return "active";
  }
  if (
    activeWorkerPendingJobCount(workerRuntime) > 0 ||
    workerRuntime.queue_retry_ready_count > 0
  ) {
    return "work_pending";
  }
  if (
    workerRuntime.worker_readiness_status === "active" ||
    workerRuntime.complete_manifest_count > 0
  ) {
    return "active";
  }
  return "ready_waiting_for_runtime_event";
}

function createRealEngineWorkerFlowSummary({
  foundation,
  workerRuntime,
  realEngineHandoff,
}) {
  const workerStatus = foundation.local_bridge_engine_status ?? {};
  const retryPolicy = workerStatus.retry_policy ?? {};
  const jobFreshnessPolicy = workerStatus.job_freshness_policy ?? {};
  const foundationReady =
    foundation.foundation_readiness_status === "ready_for_runtime_handoff";
  const localBridgeStorageConfigured =
    foundation.foundation_summary.local_bridge_storage_configured === true;
  const runtimeHttpAdaptersConfigured =
    foundation.foundation_summary.runtime_http_adapters_configured === true;
  const realEngineConfigured =
    realEngineHandoff.configured_real_engine_count >=
    realEngineHandoff.required_real_engine_count;
  const workerStorageConfigured =
    workerRuntime.artifact_store_configured === true &&
    workerRuntime.render_manifest_store_configured === true;
  const workerReadyForHandoff =
    ["idle", "active"].includes(workerRuntime.worker_readiness_status) ||
    (workerRuntime.worker_readiness_status === "attention" &&
      LOCAL_BRIDGE_ADAPTER_KINDS.every((kind) =>
        ["idle", "active"].includes(workerRuntime.adapter_readiness_status[kind])
      ) &&
      activeWorkerPendingJobCount(workerRuntime) === 0 &&
      workerRuntime.queue_retry_ready_count === 0 &&
      workerRuntime.queue_retry_waiting_count === 0 &&
      workerRuntime.queue_retry_blocked_count === 0 &&
      workerRuntime.queue_invalid_json_line_count === 0);
  const workerQueueClear =
    activeWorkerPendingJobCount(workerRuntime) === 0 &&
    workerRuntime.queue_retry_ready_count === 0 &&
    workerRuntime.queue_retry_waiting_count === 0 &&
    workerRuntime.queue_retry_blocked_count === 0 &&
    workerRuntime.queue_invalid_json_line_count === 0;
  const workerAttention =
    !workerReadyForHandoff &&
    (workerRuntime.worker_readiness_status === "attention" ||
      workerRuntime.queue_invalid_json_line_count > 0);
  const retryBackoffActive = workerRuntime.queue_retry_waiting_count > 0;
  const pendingWork =
    activeWorkerPendingJobCount(workerRuntime) > 0 ||
    workerRuntime.queue_retry_ready_count > 0;
  const runtimeJobsRendered = realEngineHandoff.complete_manifest_count > 0;
  const context = {
    foundationReady,
    runtimeHttpAdaptersConfigured,
    localBridgeStorageConfigured,
    workerStatusAvailable: workerRuntime.worker_status_available,
    realEngineConfigured,
    workerStorageConfigured,
    operatorActionRequired: workerRuntime.operator_action_required,
    workerAttention,
    retryBackoffActive,
    pendingWork,
    runtimeJobsRendered,
  };
  const flowStatus = summarizeRealEngineWorkerFlowStatus(context);
  const blockingStage = summarizeRealEngineWorkerBlockingStage(context);
  const summary = {
    schema: "iris_foundation_real_engine_worker_flow_summary_v1",
    flow_status: flowStatus,
    blocking_stage: blockingStage,
    next_check_script: checkScriptForBlockingStage(blockingStage),
    foundation_ready: foundationReady,
    runtime_http_adapters_configured: runtimeHttpAdaptersConfigured,
    local_bridge_storage_configured: localBridgeStorageConfigured,
    worker_status_available: workerRuntime.worker_status_available,
    worker_readiness_status: workerRuntime.worker_readiness_status,
    worker_ready_for_handoff: workerReadyForHandoff,
    worker_queue_clear: workerQueueClear,
    operator_action_required: workerRuntime.operator_action_required,
    adapter_ready_count: realEngineHandoff.adapter_ready_count,
    adapter_readiness_status: workerRuntime.adapter_readiness_status,
    engine_modes: workerRuntime.engine_modes,
    real_engine_handoff_status: realEngineHandoff.handoff_status,
    real_engine_configured: realEngineConfigured,
    required_real_engine_count: realEngineHandoff.required_real_engine_count,
    configured_real_engine_count:
      realEngineHandoff.configured_real_engine_count,
    tts_engine_http_ready: realEngineHandoff.tts_engine_http_ready,
    live2d_engine_http_ready: realEngineHandoff.live2d_engine_http_ready,
    subtitle_renderer_ready: realEngineHandoff.subtitle_renderer_ready,
    tts_engine_preferences_configured:
      realEngineHandoff.tts_engine_preferences_configured,
    live2d_engine_preferences_configured:
      realEngineHandoff.live2d_engine_preferences_configured,
    artifact_store_configured: workerRuntime.artifact_store_configured,
    render_manifest_store_configured:
      workerRuntime.render_manifest_store_configured,
    complete_manifest_count: realEngineHandoff.complete_manifest_count,
    runtime_jobs_rendered: runtimeJobsRendered,
    queue_total_job_count: workerRuntime.queue_total_job_count,
    queue_pending_job_count: activeWorkerPendingJobCount(workerRuntime),
    queue_retry_ready_count: workerRuntime.queue_retry_ready_count,
    queue_retry_waiting_count: workerRuntime.queue_retry_waiting_count,
    queue_retry_blocked_count: workerRuntime.queue_retry_blocked_count,
    queue_invalid_json_line_count: workerRuntime.queue_invalid_json_line_count,
    queue_expired_job_count: workerRuntime.queue_expired_job_count,
    queue_expired_pending_job_count:
      workerRuntime.queue_expired_pending_job_count,
    retry_policy_configured: Boolean(workerStatus.retry_policy),
    retry_base_backoff_ms: safePositiveNumber(
      retryPolicy.base_backoff_ms
    ),
    retry_max_backoff_ms: safePositiveNumber(
      retryPolicy.max_backoff_ms
    ),
    max_retry_attempt_count:
      safeNonNegativeNumber(retryPolicy.max_attempts) ?? null,
    job_expiry_guard_configured:
      jobFreshnessPolicy.expiry_enabled === true,
    expired_jobs_rejected_before_engine:
      jobFreshnessPolicy.expired_jobs_rejected_before_engine === true,
    max_job_age_ms: safePositiveNumber(
      jobFreshnessPolicy.max_job_age_ms
    ),
    worker_flow_policy: {
      validated_adapter_packets_required: true,
      worker_drains_outbox_before_engine_handoff: true,
      retry_backoff_prevents_engine_hammering: true,
      retry_blocked_requires_operator_action: true,
      expired_jobs_rejected_before_engine: true,
      real_tts_and_live2d_engines_required_for_production: true,
      engine_requests_hidden_from_status: true,
      raw_jobs_hidden_from_status: true,
      obs_pickup_waits_for_worker_clear: true,
    },
    boundary_policy: {
      booleans_counts_and_fixed_statuses_only: true,
      no_engine_request_values: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_artifact_paths: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertRealEngineWorkerFlowSummarySafe(
    summary,
    "foundation real engine worker flow"
  );
  return summary;
}

function summarizeRealEngineWorkerFlowStatus(context) {
  if (
    !context.foundationReady ||
    !context.runtimeHttpAdaptersConfigured ||
    !context.localBridgeStorageConfigured
  ) {
    return "configuration_attention";
  }
  if (!context.workerStatusAvailable) return "worker_unavailable";
  if (!context.realEngineConfigured) return "waiting_for_real_engine_configuration";
  if (!context.workerStorageConfigured) return "waiting_for_worker_storage";
  if (context.operatorActionRequired) return "operator_action_required";
  if (context.workerAttention) return "worker_attention";
  if (context.retryBackoffActive) return "retry_backoff";
  if (context.pendingWork) return "work_pending";
  if (!context.runtimeJobsRendered) return "waiting_for_runtime_jobs";
  return "real_engine_worker_active";
}

function summarizeRealEngineWorkerBlockingStage(context) {
  const status = summarizeRealEngineWorkerFlowStatus(context);
  switch (status) {
    case "configuration_attention":
      return "foundation_configuration";
    case "worker_unavailable":
      return "worker_status";
    case "waiting_for_real_engine_configuration":
      return "real_engine_configuration";
    case "waiting_for_worker_storage":
      return "worker_storage";
    case "waiting_for_runtime_jobs":
      return "runtime_jobs";
    case "work_pending":
      return "worker_queue";
    case "retry_backoff":
      return "retry_backoff";
    case "operator_action_required":
      return "operator_action";
    case "worker_attention":
      return "worker_attention";
    default:
      return "none";
  }
}

function createObsBrowserSourceRuntimeSummary(obsStatus) {
  const setupBridgeConfigured = obsStatus?.obs_setup_bridge_configured === true;
  const overlayRouteCount = countConfiguredRoutes(obsStatus?.overlay_paths);
  const handoffRouteCount = countConfiguredRoutes(obsStatus?.local_bridge_handoff_paths);
  const requiredAdapterKindCount = Array.isArray(obsStatus?.required_adapter_kinds)
    ? obsStatus.required_adapter_kinds.filter((kind) =>
        LOCAL_BRIDGE_ADAPTER_KINDS.includes(kind)
      ).length
    : 0;
  const width = requiredObsBrowserSourceRuntimeDimension(obsStatus, "width");
  const height = requiredObsBrowserSourceRuntimeDimension(obsStatus, "height");
  const fps = requiredObsBrowserSourceRuntimeDimension(obsStatus, "fps");
  const originConfigured =
    setupBridgeConfigured || obsStatus?.origin_configured === true;
  const obsStatusAvailable =
    width > 0 ||
    height > 0 ||
    fps > 0 ||
    overlayRouteCount > 0 ||
    handoffRouteCount > 0 ||
    requiredAdapterKindCount > 0 ||
    originConfigured ||
    obsStatus?.source_name_configured === true ||
    obsStatus?.scene_name_configured === true ||
    obsStatus?.source_dimensions_configured === true;
  const summary = {
    schema: "iris_foundation_obs_browser_source_runtime_summary_v1",
    obs_status_available: obsStatusAvailable,
    origin_configured: originConfigured,
    source_name_configured:
      overlayRouteCount > 0 ||
      handoffRouteCount > 0 ||
      requiredAdapterKindCount > 0,
    scene_name_configured: setupBridgeConfigured && handoffRouteCount > 0,
    source_dimensions_configured: width > 0 && height > 0 && fps > 0,
    width,
    height,
    fps,
    shutdown_source_when_not_visible:
      obsStatus?.shutdown_source_when_not_visible === true,
    refresh_browser_when_scene_becomes_active:
      obsStatus?.refresh_browser_when_scene_becomes_active === true,
    overlay_route_count: overlayRouteCount,
    local_bridge_handoff_route_count: handoffRouteCount,
    required_adapter_kind_count: requiredAdapterKindCount,
    overlay_routes_ready: overlayRouteCount >= 5,
    local_bridge_handoff_routes_ready: handoffRouteCount >= 5,
    obs_browser_source_ready:
      width > 0 &&
      height > 0 &&
      fps > 0 &&
      overlayRouteCount >= 5 &&
      handoffRouteCount >= 5 &&
      requiredAdapterKindCount === LOCAL_BRIDGE_ADAPTER_KINDS.length &&
      originConfigured,
    boundary_policy: {
      booleans_counts_dimensions_and_fixed_statuses_only: true,
      no_origin_values: true,
      no_route_values: true,
      no_scene_or_source_names: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertObsBrowserSourceRuntimeSummarySafe(
    summary,
    "foundation runtime OBS browser source summary"
  );
  return summary;
}

function requiredObsBrowserSourceRuntimeDimension(obsStatus, field) {
  if (!obsStatus) return 0;
  const number = safePositiveNumber(obsStatus[field]);
  if (number === null) {
    throw new ContractError(`foundation OBS browser source ${field} is required`);
  }
  return number;
}

function createRuntimeSummary({
  foundation,
  overlayRuntime,
  renderHandoff,
  workerRuntime,
  realEngineHandoff,
  obsBrowserSourceRuntime,
  runtimeStatus,
}) {
  const foundationReady =
    foundation.foundation_readiness_status === "ready_for_runtime_handoff";
  const overlayRuntimeAvailable =
    overlayRuntime.stream_state_available && overlayRuntime.overlay_status_available;
  const overlayStreamAvailable =
    overlayRuntime.event_stream_ready === true ||
    overlayRuntime.event_stream_client_count > 0 ||
    overlayRuntime.event_stream_published_count > 0 ||
    overlayRuntime.event_stream_latest_event_age_ms !== null;
  const runtimeEventAvailable = overlayRuntime.runtime_event_available;
  const renderManifestAvailable =
    renderHandoff.render_manifest_store_configured === true &&
    renderHandoff.latest_manifest_available === true;
  const renderHandoffReady =
    renderHandoff.obs_handoff_readiness_status === "ready" &&
    renderManifestAvailable &&
    renderHandoff.latest_manifest_fresh === true &&
    renderHandoff.artifact_render_sync_ready === true &&
    renderHandoff.all_artifact_files_available === true &&
    renderHandoff.all_artifacts_contract_valid_for_pickup === true &&
    renderHandoff.obs_pickup_blocking_adapter_count === 0;
  const localBridgeWorkerReady =
    ["idle", "active"].includes(workerRuntime.worker_readiness_status) ||
    (workerRuntime.worker_readiness_status === "attention" &&
      LOCAL_BRIDGE_ADAPTER_KINDS.every((kind) =>
        ["idle", "active"].includes(workerRuntime.adapter_readiness_status[kind])
      ) &&
      activeWorkerPendingJobCount(workerRuntime) === 0 &&
      workerRuntime.queue_retry_ready_count === 0 &&
      workerRuntime.queue_retry_waiting_count === 0 &&
      workerRuntime.queue_retry_blocked_count === 0 &&
      workerRuntime.queue_invalid_json_line_count === 0);
  const localBridgeWorkerQueueClear =
    activeWorkerPendingJobCount(workerRuntime) === 0 &&
    workerRuntime.queue_retry_ready_count === 0 &&
    workerRuntime.queue_retry_waiting_count === 0 &&
    workerRuntime.queue_retry_blocked_count === 0 &&
    workerRuntime.queue_invalid_json_line_count === 0;
  const realEngineHandoffReady =
    (realEngineHandoff.handoff_status === "active" ||
      realEngineHandoff.handoff_status === "ready_waiting_for_runtime_event") &&
    realEngineHandoff.queue_clear === true;
  const obsBrowserSourceReady =
    obsBrowserSourceRuntime.origin_configured === true &&
    obsBrowserSourceRuntime.source_dimensions_configured === true &&
    obsBrowserSourceRuntime.overlay_routes_ready === true &&
    obsBrowserSourceRuntime.local_bridge_handoff_routes_ready === true &&
    obsBrowserSourceRuntime.required_adapter_kind_count ===
      LOCAL_BRIDGE_ADAPTER_KINDS.length;
  const obsPickupReady =
    renderHandoff.obs_handoff_readiness_status === "ready" &&
    renderManifestAvailable &&
    renderHandoff.latest_manifest_fresh === true &&
    renderHandoff.artifact_render_sync_ready === true &&
    renderHandoff.all_artifact_files_available === true &&
    renderHandoff.all_artifacts_contract_valid_for_pickup === true &&
    renderHandoff.obs_pickup_blocking_adapter_count === 0;
  const overlayEventStreamAvailable =
    overlayRuntime.event_stream_ready === true ||
    overlayRuntime.event_stream_client_count > 0 ||
    overlayRuntime.event_stream_published_count > 0 ||
    overlayRuntime.event_stream_latest_event_age_ms !== null;
  const nextRuntimeAttention = summarizeNextRuntimeAttention({
    foundationReady,
    overlayRuntimeAvailable,
    runtimeEventAvailable,
    overlayStreamAvailable,
    renderHandoffReady,
    runtimeStatus,
    foundationNextAttentionReason:
      foundation.foundation_summary.next_attention_reason,
    renderHandoffStatus: renderHandoff.obs_handoff_readiness_status,
    localBridgeWorkerReady,
    localBridgeWorkerQueueClear,
    realEngineHandoffReady,
    realEngineHandoffStatus: realEngineHandoff.handoff_status,
    obsBrowserSourceReady,
  });
  const summary = {
    schema: "iris_foundation_runtime_summary_v1",
    foundation_ready: foundationReady,
    overlay_runtime_available: overlayRuntimeAvailable,
    overlay_stream_available: overlayStreamAvailable,
    runtime_event_available: runtimeEventAvailable,
    render_manifest_available: renderManifestAvailable,
    obs_handoff_ready: renderHandoffReady,
    local_bridge_worker_ready: localBridgeWorkerReady,
    local_bridge_worker_queue_clear: localBridgeWorkerQueueClear,
    local_bridge_worker_pending_job_count:
      activeWorkerPendingJobCount(workerRuntime),
    local_bridge_worker_retry_blocked_count:
      workerRuntime.queue_retry_blocked_count,
    local_bridge_worker_invalid_json_line_count:
      workerRuntime.queue_invalid_json_line_count,
    real_engine_handoff_ready: realEngineHandoffReady,
    real_engine_handoff_status: realEngineHandoff.handoff_status,
    real_engine_configured_count:
      realEngineHandoff.configured_real_engine_count,
    real_engine_pending_job_count: realEngineHandoff.queue_pending_job_count,
    real_engine_retry_blocked_count:
      realEngineHandoff.queue_retry_blocked_count,
    obs_browser_source_ready: obsBrowserSourceReady,
    obs_browser_source_origin_configured:
      obsBrowserSourceRuntime.origin_configured,
    obs_browser_source_overlay_routes_ready:
      obsBrowserSourceRuntime.overlay_routes_ready,
    obs_browser_source_handoff_routes_ready:
      obsBrowserSourceRuntime.local_bridge_handoff_routes_ready,
    next_runtime_attention: nextRuntimeAttention,
    next_runtime_check_script:
      nextRuntimeAttention === null
        ? null
        : checkScriptForRuntimeStatus(runtimeStatus),
    boundary_policy: {
      booleans_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      script_names_only: true,
    },
  };
  assertRuntimeSummarySafe(summary, "foundation runtime summary");
  return summary;
}

function createRuntimeHandoffFlowSummary({
  foundation,
  overlayRuntime,
  renderHandoff,
  workerRuntime,
  realEngineHandoff,
  obsBrowserSourceRuntime,
  runtimeStatus,
}) {
  const foundationReady =
    foundation.foundation_readiness_status === "ready_for_runtime_handoff";
  const localBridgeWorkerReady =
    ["idle", "active"].includes(workerRuntime.worker_readiness_status) ||
    (workerRuntime.worker_readiness_status === "attention" &&
      LOCAL_BRIDGE_ADAPTER_KINDS.every((kind) =>
        ["idle", "active"].includes(workerRuntime.adapter_readiness_status[kind])
      ) &&
      activeWorkerPendingJobCount(workerRuntime) === 0 &&
      workerRuntime.queue_retry_ready_count === 0 &&
      workerRuntime.queue_retry_waiting_count === 0 &&
      workerRuntime.queue_retry_blocked_count === 0 &&
      workerRuntime.queue_invalid_json_line_count === 0);
  const localBridgeWorkerQueueClear =
    activeWorkerPendingJobCount(workerRuntime) === 0 &&
    workerRuntime.queue_retry_ready_count === 0 &&
    workerRuntime.queue_retry_waiting_count === 0 &&
    workerRuntime.queue_retry_blocked_count === 0 &&
    workerRuntime.queue_invalid_json_line_count === 0;
  const realEngineHandoffReady =
    (realEngineHandoff.handoff_status === "active" ||
      realEngineHandoff.handoff_status === "ready_waiting_for_runtime_event") &&
    realEngineHandoff.queue_clear === true;
  const obsBrowserSourceReady =
    obsBrowserSourceRuntime.origin_configured === true &&
    obsBrowserSourceRuntime.source_dimensions_configured === true &&
    obsBrowserSourceRuntime.overlay_routes_ready === true &&
    obsBrowserSourceRuntime.local_bridge_handoff_routes_ready === true &&
    obsBrowserSourceRuntime.required_adapter_kind_count ===
      LOCAL_BRIDGE_ADAPTER_KINDS.length;
  const overlayRuntimeAvailable =
    overlayRuntime.stream_state_available === true &&
    overlayRuntime.overlay_status_available === true;
  const runtimeEventAvailable = overlayRuntime.runtime_event_available === true;
  const overlayEventStreamAvailable =
    overlayRuntime.event_stream_ready === true ||
    overlayRuntime.event_stream_client_count > 0 ||
    overlayRuntime.event_stream_published_count > 0 ||
    overlayRuntime.event_stream_latest_event_age_ms !== null;
  const renderManifestAvailable =
    renderHandoff.render_manifest_store_configured === true &&
    renderHandoff.latest_manifest_available === true;
  const renderHandoffReady =
    renderHandoff.obs_handoff_readiness_status === "ready" &&
    renderManifestAvailable &&
    renderHandoff.latest_manifest_fresh === true &&
    renderHandoff.artifact_render_sync_ready === true &&
    renderHandoff.all_artifact_files_available === true &&
    renderHandoff.all_artifacts_contract_valid_for_pickup === true &&
    renderHandoff.obs_pickup_blocking_adapter_count === 0;
  const flowStatus = summarizeRuntimeHandoffFlowStatus({
    foundationReady,
    localBridgeWorkerReady,
    localBridgeWorkerQueueClear,
    realEngineHandoffReady,
    obsBrowserSourceReady,
    overlayRuntimeAvailable,
    runtimeEventAvailable,
    overlayEventStreamAvailable,
    renderHandoffReady,
  });
  const blockingStage = summarizeRuntimeHandoffBlockingStage(flowStatus);
  const summary = {
    schema: "iris_foundation_runtime_handoff_flow_summary_v1",
    flow_status: flowStatus,
    blocking_stage: blockingStage,
    next_check_script: checkScriptForBlockingStage(blockingStage),
    runtime_status: runtimeStatus,
    foundation_ready: foundationReady,
    local_bridge_worker_ready: localBridgeWorkerReady,
    local_bridge_worker_queue_clear: localBridgeWorkerQueueClear,
    real_engine_handoff_ready: realEngineHandoffReady,
    real_engine_handoff_status: realEngineHandoff.handoff_status,
    obs_browser_source_ready: obsBrowserSourceReady,
    overlay_runtime_available: overlayRuntimeAvailable,
    runtime_event_available: runtimeEventAvailable,
    overlay_event_stream_available: overlayEventStreamAvailable,
    render_manifest_available: renderManifestAvailable,
    render_handoff_ready: renderHandoffReady,
    obs_pickup_ready: renderHandoffReady,
    manifest_id_match_required_for_artifact_pickup:
      renderHandoff.manifest_id_match_required_for_artifact_pickup === true,
    all_artifact_files_available:
      renderHandoff.all_artifact_files_available === true,
    all_artifacts_contract_valid_for_pickup:
      renderHandoff.all_artifacts_contract_valid_for_pickup === true,
    artifact_ready_adapter_count: countTrueAdapterValues(
      renderHandoff.artifact_file_available_by_adapter
    ),
    artifact_pickup_ready_adapter_count: countAdapterStatus(
      renderHandoff.artifact_pickup_status_by_adapter,
      "ready"
    ),
    artifact_blocking_adapter_count:
      renderHandoff.obs_pickup_blocking_adapter_count === null
        ? countNonReadyAdapterStatus(renderHandoff.obs_pickup_blocking_status_by_adapter)
        : renderHandoff.obs_pickup_blocking_adapter_count,
    worker_pending_job_count: activeWorkerPendingJobCount(workerRuntime),
    worker_retry_blocked_count: workerRuntime.queue_retry_blocked_count,
    worker_invalid_json_line_count: workerRuntime.queue_invalid_json_line_count,
    real_engine_configured_count:
      realEngineHandoff.configured_real_engine_count,
    real_engine_pending_job_count: realEngineHandoff.queue_pending_job_count,
    real_engine_retry_blocked_count:
      realEngineHandoff.queue_retry_blocked_count,
    handoff_policy: {
      local_bridge_worker_required_before_obs_pickup: true,
      real_tts_and_live2d_engines_required_for_production_handoff: true,
      obs_browser_source_required_before_overlay_runtime: true,
      overlay_event_stream_required_before_obs_handoff: true,
      render_manifest_required_before_artifact_pickup: true,
      manifest_id_match_required_for_artifact_pickup: true,
      artifact_contract_required_before_obs_pickup: true,
    },
    boundary_policy: {
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_text_payloads: true,
      no_artifact_paths: true,
      no_raw_jobs: true,
      no_candidates: true,
      no_commands: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertRuntimeHandoffFlowSummarySafe(summary, "foundation runtime handoff flow");
  return summary;
}

function summarizeRuntimeHandoffFlowStatus({
  foundationReady,
  localBridgeWorkerReady,
  localBridgeWorkerQueueClear,
  realEngineHandoffReady,
  obsBrowserSourceReady,
  overlayRuntimeAvailable,
  runtimeEventAvailable,
  overlayEventStreamAvailable,
  renderHandoffReady,
}) {
  if (!foundationReady) return "configuration_attention";
  if (!localBridgeWorkerReady || !localBridgeWorkerQueueClear) {
    return "waiting_for_local_bridge_worker";
  }
  if (!realEngineHandoffReady) return "waiting_for_real_engine_handoff";
  if (!obsBrowserSourceReady) return "waiting_for_obs_browser_source";
  if (!overlayRuntimeAvailable) return "waiting_for_overlay_runtime";
  if (!runtimeEventAvailable) return "waiting_for_runtime_event";
  if (!overlayEventStreamAvailable) return "waiting_for_overlay_event_stream";
  if (!renderHandoffReady) return "waiting_for_obs_render_handoff";
  return "ready_for_obs_runtime_handoff";
}

function summarizeRuntimeHandoffBlockingStage(flowStatus) {
  switch (flowStatus) {
    case "configuration_attention":
      return "foundation_configuration";
    case "waiting_for_local_bridge_worker":
      return "local_bridge_worker";
    case "waiting_for_real_engine_handoff":
      return "real_engine_handoff";
    case "waiting_for_obs_browser_source":
      return "obs_browser_source";
    case "waiting_for_overlay_runtime":
      return "overlay_runtime";
    case "waiting_for_runtime_event":
      return "runtime_event";
    case "waiting_for_overlay_event_stream":
      return "overlay_event_stream";
    case "waiting_for_obs_render_handoff":
      return "render_handoff";
    default:
      return "none";
  }
}

function createObsRenderArtifactFlowSummary({
  foundation,
  overlayRuntime,
  renderHandoff,
  workerRuntime,
  realEngineHandoff,
  obsBrowserSourceRuntime,
}) {
  const foundationReady =
    foundation.foundation_readiness_status === "ready_for_runtime_handoff";
  const obsBrowserSourceReady =
    obsBrowserSourceRuntime.origin_configured === true &&
    obsBrowserSourceRuntime.source_dimensions_configured === true &&
    obsBrowserSourceRuntime.overlay_routes_ready === true &&
    obsBrowserSourceRuntime.local_bridge_handoff_routes_ready === true &&
    obsBrowserSourceRuntime.required_adapter_kind_count ===
      LOCAL_BRIDGE_ADAPTER_KINDS.length;
  const overlayRuntimeAvailable =
    overlayRuntime.stream_state_available === true &&
    overlayRuntime.overlay_status_available === true;
  const runtimeEventAvailable = overlayRuntime.runtime_event_available === true;
  const overlayEventStreamAvailable =
    overlayRuntime.event_stream_ready === true ||
    overlayRuntime.event_stream_client_count > 0 ||
    overlayRuntime.event_stream_published_count > 0 ||
    overlayRuntime.event_stream_latest_event_age_ms !== null;
  const renderManifestStoreConfigured =
    renderHandoff.render_manifest_store_configured === true;
  const latestManifestAvailable =
    renderManifestStoreConfigured &&
    renderHandoff.latest_manifest_available === true;
  const latestManifestFresh = renderHandoff.latest_manifest_fresh === true;
  const allArtifactFilesAvailable =
    renderHandoff.all_artifact_files_available === true;
  const allArtifactsContractValid =
    renderHandoff.all_artifacts_contract_valid_for_pickup === true;
  const artifactRenderSyncReady =
    renderHandoff.artifact_render_sync_ready === true;
  const obsPickupReady =
    renderHandoff.obs_handoff_readiness_status === "ready" &&
    latestManifestAvailable &&
    latestManifestFresh &&
    artifactRenderSyncReady &&
    allArtifactFilesAvailable &&
    allArtifactsContractValid &&
    renderHandoff.obs_pickup_blocking_adapter_count === 0;
  const localBridgeWorkerQueueClear =
    activeWorkerPendingJobCount(workerRuntime) === 0 &&
    workerRuntime.queue_retry_ready_count === 0 &&
    workerRuntime.queue_retry_waiting_count === 0 &&
    workerRuntime.queue_retry_blocked_count === 0 &&
    workerRuntime.queue_invalid_json_line_count === 0;
  const realEngineHandoffReady =
    (realEngineHandoff.handoff_status === "active" ||
      realEngineHandoff.handoff_status === "ready_waiting_for_runtime_event") &&
    realEngineHandoff.queue_clear === true;
  const artifactAvailableCount = countTrueAdapterValues(
    renderHandoff.artifact_file_available_by_adapter
  );
  const artifactContractReadyCount = countAdapterStatus(
    renderHandoff.artifact_contract_status_by_adapter,
    "valid"
  );
  const artifactPickupReadyCount = countAdapterStatus(
    renderHandoff.artifact_pickup_status_by_adapter,
    "ready"
  );
  const artifactBlockingCount =
    renderHandoff.obs_pickup_blocking_adapter_count === null
      ? countNonReadyAdapterStatus(renderHandoff.obs_pickup_blocking_status_by_adapter)
      : renderHandoff.obs_pickup_blocking_adapter_count;
  const context = {
    foundationReady,
    obsBrowserSourceReady,
    overlayRuntimeAvailable,
    runtimeEventAvailable,
    renderManifestStoreConfigured,
    localBridgeWorkerQueueClear,
    realEngineHandoffReady,
    latestManifestAvailable,
    latestManifestFresh,
    allArtifactFilesAvailable,
    allArtifactsContractValid,
    artifactRenderSyncReady,
    obsPickupReady,
  };
  const flowStatus = summarizeObsRenderArtifactFlowStatus(context);
  const blockingStage = summarizeObsRenderArtifactBlockingStage(context);
  const summary = {
    schema: "iris_foundation_obs_render_artifact_flow_summary_v1",
    flow_status: flowStatus,
    blocking_stage: blockingStage,
    next_check_script: checkScriptForBlockingStage(blockingStage),
    foundation_ready: foundationReady,
    obs_browser_source_ready: obsBrowserSourceReady,
    overlay_runtime_available: overlayRuntimeAvailable,
    runtime_event_available: runtimeEventAvailable,
    overlay_event_stream_available: overlayEventStreamAvailable,
    render_manifest_store_configured: renderManifestStoreConfigured,
    latest_manifest_available: latestManifestAvailable,
    latest_manifest_fresh: latestManifestFresh,
    obs_pickup_ready: obsPickupReady,
    obs_handoff_readiness_status: renderHandoff.obs_handoff_readiness_status,
    all_artifact_files_available: allArtifactFilesAvailable,
    all_artifacts_contract_valid_for_pickup: allArtifactsContractValid,
    artifact_render_sync_ready: artifactRenderSyncReady,
    artifact_render_sync_rejected_for_obs_pickup:
      renderHandoff.artifact_render_sync_rejected_for_obs_pickup === true,
    latest_artifact_render_sync_status:
      renderHandoff.latest_artifact_render_sync_status,
    artifact_render_skew_ms: renderHandoff.artifact_render_skew_ms,
    max_artifact_render_skew_ms: renderHandoff.max_artifact_render_skew_ms,
    manifest_id_match_required_for_artifact_pickup:
      renderHandoff.manifest_id_match_required_for_artifact_pickup === true,
    artifact_file_available_by_adapter:
      renderHandoff.artifact_file_available_by_adapter,
    artifact_content_type_status_by_adapter:
      renderHandoff.artifact_content_type_status_by_adapter,
    artifact_size_status_by_adapter:
      renderHandoff.artifact_size_status_by_adapter,
    artifact_contract_status_by_adapter:
      renderHandoff.artifact_contract_status_by_adapter,
    artifact_pickup_status_by_adapter:
      renderHandoff.artifact_pickup_status_by_adapter,
    obs_pickup_blocking_status_by_adapter:
      renderHandoff.obs_pickup_blocking_status_by_adapter,
    artifact_available_adapter_count: artifactAvailableCount,
    artifact_contract_ready_adapter_count: artifactContractReadyCount,
    artifact_pickup_ready_adapter_count: artifactPickupReadyCount,
    artifact_blocking_adapter_count: artifactBlockingCount,
    overlay_tts_artifact_available:
      overlayRuntime.tts_artifact_available === true,
    overlay_live2d_artifact_available:
      overlayRuntime.live2d_artifact_available === true,
    overlay_subtitle_artifact_available:
      overlayRuntime.subtitle_artifact_available === true,
    overlay_tts_bridge_status: overlayRuntime.tts_bridge_status,
    overlay_live2d_bridge_status: overlayRuntime.live2d_bridge_status,
    overlay_subtitle_bridge_status: overlayRuntime.subtitle_bridge_status,
    local_bridge_worker_queue_clear: localBridgeWorkerQueueClear,
    worker_pending_job_count: activeWorkerPendingJobCount(workerRuntime),
    worker_retry_blocked_count: workerRuntime.queue_retry_blocked_count,
    real_engine_handoff_ready: realEngineHandoffReady,
    real_engine_handoff_status: realEngineHandoff.handoff_status,
    real_engine_configured_count:
      realEngineHandoff.configured_real_engine_count,
    artifact_flow_policy: {
      obs_picks_up_latest_manifest_group_only: true,
      manifest_id_match_required_for_artifact_pickup: true,
      tts_live2d_subtitle_artifacts_required_together: true,
      artifact_render_sync_required_before_obs_pickup: true,
      artifact_contract_required_before_obs_pickup: true,
      artifact_bodies_hidden_from_status: true,
      local_paths_hidden_from_status: true,
    },
    boundary_policy: {
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_text_payloads: true,
      no_artifact_paths: true,
      no_artifact_bodies: true,
      no_raw_jobs: true,
      no_candidates: true,
      no_commands: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertObsRenderArtifactFlowSummarySafe(
    summary,
    "foundation OBS render artifact flow"
  );
  return summary;
}

function summarizeObsRenderArtifactFlowStatus(context) {
  if (!context.foundationReady) return "configuration_attention";
  if (!context.localBridgeWorkerQueueClear) {
    return "waiting_for_local_bridge_worker";
  }
  if (!context.realEngineHandoffReady) return "waiting_for_real_engine_handoff";
  if (!context.obsBrowserSourceReady) return "waiting_for_obs_browser_source";
  if (!context.overlayRuntimeAvailable || !context.runtimeEventAvailable) {
    return "waiting_for_runtime_event";
  }
  if (!context.renderManifestStoreConfigured) {
    return "waiting_for_render_manifest_store";
  }
  if (!context.latestManifestAvailable || context.latestManifestFresh !== true) {
    return "waiting_for_render_manifest";
  }
  if (!context.allArtifactFilesAvailable) return "waiting_for_artifact_files";
  if (!context.artifactRenderSyncReady) return "waiting_for_obs_pickup";
  if (!context.allArtifactsContractValid) return "waiting_for_artifact_contracts";
  if (!context.obsPickupReady) return "waiting_for_obs_pickup";
  return "ready_for_obs_artifact_pickup";
}

function summarizeObsRenderArtifactBlockingStage(context) {
  const status = summarizeObsRenderArtifactFlowStatus(context);
  switch (status) {
    case "configuration_attention":
      return "foundation_configuration";
    case "waiting_for_local_bridge_worker":
      return "local_bridge_worker";
    case "waiting_for_real_engine_handoff":
      return "real_engine_handoff";
    case "waiting_for_obs_browser_source":
      return "obs_browser_source";
    case "waiting_for_runtime_event":
      return "runtime_event";
    case "waiting_for_render_manifest_store":
      return "render_manifest_store";
    case "waiting_for_render_manifest":
      return "render_manifest";
    case "waiting_for_artifact_files":
      return "artifact_availability";
    case "waiting_for_artifact_contracts":
      return "artifact_contract";
    case "waiting_for_obs_pickup":
      return "obs_pickup";
    default:
      return "none";
  }
}

function summarizeRuntimeStatus({
  foundation,
  overlayRuntime,
  renderHandoff,
  workerRuntime,
  realEngineHandoff,
  obsBrowserSourceRuntime,
}) {
  const workerQueueClear =
    activeWorkerPendingJobCount(workerRuntime) === 0 &&
    workerRuntime.queue_retry_ready_count === 0 &&
    workerRuntime.queue_retry_waiting_count === 0 &&
    workerRuntime.queue_retry_blocked_count === 0 &&
    workerRuntime.queue_invalid_json_line_count === 0;
  const workerReadyForHandoff =
    ["idle", "active"].includes(workerRuntime.worker_readiness_status) ||
    (workerRuntime.worker_readiness_status === "attention" &&
      LOCAL_BRIDGE_ADAPTER_KINDS.every((kind) =>
        ["idle", "active"].includes(workerRuntime.adapter_readiness_status[kind])
      ) &&
      activeWorkerPendingJobCount(workerRuntime) === 0 &&
      workerRuntime.queue_retry_ready_count === 0 &&
      workerRuntime.queue_retry_waiting_count === 0 &&
      workerRuntime.queue_retry_blocked_count === 0 &&
      workerRuntime.queue_invalid_json_line_count === 0);
  const realEngineHandoffReady =
    (realEngineHandoff.handoff_status === "active" ||
      realEngineHandoff.handoff_status === "ready_waiting_for_runtime_event") &&
    realEngineHandoff.queue_clear === true;
  const obsBrowserSourceReady =
    obsBrowserSourceRuntime.origin_configured === true &&
    obsBrowserSourceRuntime.source_dimensions_configured === true &&
    obsBrowserSourceRuntime.overlay_routes_ready === true &&
    obsBrowserSourceRuntime.local_bridge_handoff_routes_ready === true &&
    obsBrowserSourceRuntime.required_adapter_kind_count ===
      LOCAL_BRIDGE_ADAPTER_KINDS.length;
  const renderManifestAvailable =
    renderHandoff.render_manifest_store_configured === true &&
    renderHandoff.latest_manifest_available === true;
  const obsPickupReady =
    renderHandoff.obs_handoff_readiness_status === "ready" &&
    renderManifestAvailable &&
    renderHandoff.latest_manifest_fresh === true &&
    renderHandoff.artifact_render_sync_ready === true &&
    renderHandoff.all_artifact_files_available === true &&
    renderHandoff.all_artifacts_contract_valid_for_pickup === true &&
    renderHandoff.obs_pickup_blocking_adapter_count === 0;
  const overlayEventStreamAvailable =
    overlayRuntime.event_stream_ready === true ||
    overlayRuntime.event_stream_client_count > 0 ||
    overlayRuntime.event_stream_published_count > 0 ||
    overlayRuntime.event_stream_latest_event_age_ms !== null;
  if (foundation.foundation_readiness_status !== "ready_for_runtime_handoff") {
    return "attention_required";
  }
  if (
    !workerReadyForHandoff ||
    !workerQueueClear
  ) {
    return "waiting_for_local_bridge_worker";
  }
  if (!realEngineHandoffReady) {
    return "waiting_for_real_engine_handoff";
  }
  if (!obsBrowserSourceReady) {
    return "waiting_for_obs_browser_source";
  }
  if (!overlayRuntime.stream_state_available || !overlayRuntime.overlay_status_available) {
    return "waiting_for_overlay_runtime";
  }
  if (!overlayRuntime.runtime_event_available || overlayRuntime.overlay_health === "empty") {
    return "waiting_for_runtime_event";
  }
  if (!overlayEventStreamAvailable) {
    return "waiting_for_overlay_event_stream";
  }
  if (!obsPickupReady) {
    return "waiting_for_obs_render_handoff";
  }
  return "ready_for_obs_runtime_handoff";
}

function summarizeNextRuntimeAttention({
  foundationReady,
  overlayRuntimeAvailable,
  runtimeEventAvailable,
  overlayStreamAvailable,
  renderHandoffReady,
  runtimeStatus,
  foundationNextAttentionReason,
  renderHandoffStatus,
  localBridgeWorkerReady,
  localBridgeWorkerQueueClear,
  realEngineHandoffReady,
  realEngineHandoffStatus,
  obsBrowserSourceReady,
}) {
  if (runtimeStatus === "attention_required") {
    return foundationNextAttentionReason ?? "foundation_configuration_attention";
  }
  if (!localBridgeWorkerReady || !localBridgeWorkerQueueClear) {
    return "local_bridge_worker_runtime_attention";
  }
  if (!realEngineHandoffReady) {
    return realEngineHandoffStatus ?? "real_engine_handoff_attention";
  }
  if (!obsBrowserSourceReady) return "obs_browser_source_runtime_attention";
  if (!overlayRuntimeAvailable) return "start_iris_http_runtime";
  if (!runtimeEventAvailable) return "send_or_wait_for_runtime_event";
  if (!overlayStreamAvailable) return "start_overlay_event_stream";
  if (!renderHandoffReady) return renderHandoffStatus ?? "wait_for_render_manifest";
  return null;
}

function checkScriptForRuntimeStatus(runtimeStatus) {
  switch (runtimeStatus) {
    case "attention_required":
      return RUNTIME_CHECK_SCRIPTS.foundation_configuration;
    case "waiting_for_local_bridge_worker":
      return RUNTIME_CHECK_SCRIPTS.local_bridge_worker;
    case "waiting_for_real_engine_handoff":
      return RUNTIME_CHECK_SCRIPTS.real_engine_handoff;
    case "waiting_for_obs_browser_source":
      return RUNTIME_CHECK_SCRIPTS.obs_browser_source;
    case "waiting_for_overlay_runtime":
      return RUNTIME_CHECK_SCRIPTS.overlay_runtime;
    case "waiting_for_runtime_event":
      return RUNTIME_CHECK_SCRIPTS.runtime_event;
    case "waiting_for_overlay_event_stream":
      return RUNTIME_CHECK_SCRIPTS.overlay_event_stream;
    case "waiting_for_obs_render_handoff":
      return RUNTIME_CHECK_SCRIPTS.render_handoff;
    default:
      return null;
  }
}

function checkScriptForBlockingStage(blockingStage) {
  return RUNTIME_CHECK_SCRIPTS[blockingStage] ?? null;
}

function readStreamState(streamState) {
  if (!streamState) return null;
  try {
    if (typeof streamState.get === "function") {
      const state = streamState.get();
      return state && typeof state === "object" && !Array.isArray(state) ? state : null;
    }
    return typeof streamState === "object" && !Array.isArray(streamState)
      ? structuredClone(streamState)
      : null;
  } catch {
    return null;
  }
}

function hasRuntimeEventEvidence({ overlayStatus, state }) {
  if (
    state?.last_event_id ||
    state?.last_event_id_present ||
    state?.last_payload_kind ||
    state?.last_trace_id ||
    state?.last_trace_id_present ||
    state?.last_source
  ) {
    return true;
  }
  return Array.isArray(state?.history)
    ? state.history.some((item) =>
        Boolean(
          item?.event_id ||
            item?.event_id_present ||
            item?.trace_id ||
            item?.trace_id_present ||
            item?.payload_kind ||
            item?.source ||
            item?.decision ||
            item?.text
        )
      )
    : false;
}

function readOverlayEventStreamStatus({ overlayEventBus, generatedAtMs }) {
  if (!overlayEventBus || typeof overlayEventBus.status !== "function") return null;
  try {
    const status = overlayEventBus.status({ nowMs: generatedAtMs });
    assertOverlayEventStreamStatusSafe(
      status,
      "foundation runtime overlay event stream input"
    );
    return status;
  } catch (error) {
    if (error instanceof ContractError || error?.name === "ContractError") {
      throw error;
    }
    return null;
  }
}

function assertOverlayRuntimeSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: overlay summary is required`);
  }
  if (summary.schema !== "iris_foundation_overlay_runtime_summary_v1") {
    throw new ContractError(`${context}: invalid overlay summary schema`);
  }
  for (const field of [
    "stream_state_available",
    "overlay_status_available",
    "overlay_event_stream_available",
    "subtitle_visible",
    "runtime_event_available",
    "event_stream_ready",
    "tts_artifact_available",
    "live2d_artifact_available",
    "subtitle_artifact_available",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid overlay flag`);
    }
  }
  if (!OVERLAY_HEALTH_STATUSES.has(summary.overlay_health)) {
    throw new ContractError(`${context}: invalid overlay health`);
  }
  if (!OVERLAY_VISIBILITY_STATUSES.has(summary.overlay_visibility_state)) {
    throw new ContractError(`${context}: invalid overlay visibility`);
  }
  for (const field of [
    "latest_payload_kind",
    "tts_bridge_status",
    "live2d_bridge_status",
    "subtitle_bridge_status",
  ]) {
    if (summary[field] !== null && !isSafeStatusLabel(summary[field])) {
      throw new ContractError(`${context}: invalid overlay status label`);
    }
  }
  for (const field of [
    "state_age_ms",
    "planned_visible_ms",
    "event_stream_latest_event_age_ms",
  ]) {
    if (summary[field] !== null) {
      assertNonNegativeInteger(summary[field], `${context}: invalid overlay ${field}`);
    }
  }
  for (const field of [
    "event_stream_client_count",
    "event_stream_published_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid overlay ${field}`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "booleans_counts_and_fixed_statuses_only",
    "no_raw_stream_state",
    "no_raw_overlay_events",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ], `${context}: boundary policy`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: overlay adapter validation required`);
  }
}

function assertFoundationRuntimeProductionHandoffSummarySafe(
  summary,
  report,
  context
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_foundation_runtime_status_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!FOUNDATION_RUNTIME_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected production handoff field`, {
        field,
      });
    }
  }
  for (const field of [
    "runtime_status_report_only",
    "real_processes_not_started_by_report",
    "real_engine_calls_not_started_by_report",
    "real_obs_operation_not_started_by_report",
    "runtime_adapter_packets_not_exposed",
    "raw_stream_state_not_exposed",
    "raw_overlay_events_not_exposed",
    "text_payloads_not_exposed",
    "artifact_paths_not_exposed",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
    "commands_not_exposed",
    "candidates_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (summary.runtime_status !== report.runtime_status) {
    throw new ContractError(`${context}: handoff runtime status mismatch`);
  }
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  if (
    summary.next_readiness_state !== report.next_readiness_state ||
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: handoff readiness labels mismatch`);
  }
  for (const field of [
    "foundation_ready_for_obs_runtime_handoff",
    "overlay_runtime_ready",
    "overlay_event_stream_ready",
    "local_bridge_worker_ready",
    "real_engine_handoff_ready",
    "obs_browser_source_ready",
    "obs_handoff_ready",
    "render_manifest_available",
    "obs_pickup_ready",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid production handoff boolean`);
    }
  }
  for (const field of [
    "artifact_pickup_ready_adapter_count",
    "configured_real_engine_count",
    "rendered_manifest_count",
    "pending_worker_job_count",
    "retry_blocked_worker_job_count",
    "event_stream_client_count",
    "event_stream_published_count",
    "local_bridge_handoff_route_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid production handoff count`
    );
  }
  if (!REAL_ENGINE_WORKER_FLOW_STATUSES.has(summary.real_engine_worker_flow_status)) {
    throw new ContractError(`${context}: invalid handoff worker flow status`);
  }
  if (
    summary.next_runtime_attention !== null &&
    !isSafeStatusLabel(summary.next_runtime_attention)
  ) {
    throw new ContractError(`${context}: invalid handoff next runtime attention`);
  }
  assertSafeOptionalScriptName(summary.next_runtime_check_script, context);
  if (
    summary.overlay_runtime_ready !==
      report.runtime_summary.overlay_runtime_available ||
    summary.overlay_event_stream_ready !==
      report.runtime_summary.overlay_stream_available ||
    summary.local_bridge_worker_ready !==
      report.runtime_summary.local_bridge_worker_ready ||
    summary.real_engine_handoff_ready !==
      report.runtime_summary.real_engine_handoff_ready ||
    summary.obs_browser_source_ready !==
      report.runtime_summary.obs_browser_source_ready ||
    summary.obs_handoff_ready !== report.runtime_summary.obs_handoff_ready ||
    summary.render_manifest_available !==
      report.render_handoff.latest_manifest_available ||
    summary.obs_pickup_ready !== report.render_handoff.obs_pickup_ready ||
    summary.artifact_pickup_ready_adapter_count !==
      countAdapterStatus(
        report.render_handoff.artifact_pickup_status_by_adapter,
        "ready"
      ) ||
    summary.configured_real_engine_count !==
      report.real_engine_handoff.configured_real_engine_count ||
    summary.rendered_manifest_count !==
      report.real_engine_handoff.complete_manifest_count ||
    summary.pending_worker_job_count !==
      activeWorkerPendingJobCount(report.local_bridge_worker_runtime) ||
    summary.retry_blocked_worker_job_count !==
      report.local_bridge_worker_runtime.queue_retry_blocked_count ||
    summary.event_stream_client_count !==
      report.overlay_runtime.event_stream_client_count ||
    summary.event_stream_published_count !==
      report.overlay_runtime.event_stream_published_count ||
    summary.local_bridge_handoff_route_count !==
      report.obs_browser_source_runtime.local_bridge_handoff_route_count ||
    summary.real_engine_worker_flow_status !==
      report.real_engine_worker_flow.flow_status ||
    summary.next_runtime_attention !==
      report.runtime_summary.next_runtime_attention ||
    summary.next_runtime_check_script !==
      report.runtime_summary.next_runtime_check_script
  ) {
    throw new ContractError(`${context}: production handoff summary mismatch`);
  }
}

function readinessStateForRuntimeStatus(status) {
  switch (status) {
    case "ready_for_obs_runtime_handoff":
      return "ready";
    case "attention_required":
      return "configuration_waiting";
    case "waiting_for_real_engine_handoff":
    case "waiting_for_obs_browser_source":
      return "real_device_waiting";
    case "waiting_for_local_bridge_worker":
    case "waiting_for_overlay_runtime":
    case "waiting_for_runtime_event":
    case "waiting_for_overlay_event_stream":
    case "waiting_for_obs_render_handoff":
      return "runtime_waiting";
    default:
      return "operator_review_required";
  }
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
    assertNonNegativeInteger(
      counts[state],
      `${context}: invalid readiness state count`
    );
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

function summarizeLocalBridgeAdapterReadiness(adapterReadiness) {
  return Object.fromEntries(
    LOCAL_BRIDGE_ADAPTER_KINDS.map((kind) => [
      kind,
      safeRequiredWorkerReadinessStatus(adapterReadiness?.[kind]),
    ])
  );
}

function summarizeRenderAdapterBooleanMap(value) {
  return Object.fromEntries(
    LOCAL_BRIDGE_ADAPTER_KINDS.map((kind) => [kind, value?.[kind] === true])
  );
}

function summarizeRenderAdapterStatusMap(value) {
  return Object.fromEntries(
    LOCAL_BRIDGE_ADAPTER_KINDS.map((kind) => [
      kind,
      safeRequiredStatusLabel(value?.[kind] ?? "unavailable"),
    ])
  );
}

function summarizeRenderAdapterContentTypeStatusMap(value) {
  return Object.fromEntries(
    LOCAL_BRIDGE_ADAPTER_KINDS.map((kind) => [
      kind,
      classifySafeContentTypeStatus(value?.[kind]),
    ])
  );
}

function summarizeRenderAdapterSizeStatusMap(value) {
  return Object.fromEntries(
    LOCAL_BRIDGE_ADAPTER_KINDS.map((kind) => [
      kind,
      classifyArtifactSizeStatus(value?.[kind]),
    ])
  );
}

function summarizeLocalBridgeEngineModes(engineModes) {
  return Object.fromEntries(
    LOCAL_BRIDGE_ADAPTER_KINDS.map((kind) => [
      kind,
      safeOptionalStatusLabel(engineModes?.[kind]) ?? "unavailable",
    ])
  );
}

function summarizeEnginePreferencesConfigured(preferences) {
  return Object.fromEntries(
    LOCAL_BRIDGE_ADAPTER_KINDS.map((kind) => [
      kind,
      preferences?.[kind] === true,
    ])
  );
}

function assertLocalBridgeWorkerRuntimeSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: worker summary is required`);
  }
  if (
    summary.schema !==
    "iris_foundation_local_bridge_worker_runtime_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid worker summary schema`);
  }
  for (const field of [
    "worker_status_available",
    "worker_ready_for_handoff",
    "artifact_store_configured",
    "render_manifest_store_configured",
    "queue_clear",
    "operator_action_required",
    "operator_action_reason",
    "operator_action_id",
  ]) {
    if (
      field === "operator_action_reason" || field === "operator_action_id"
        ? summary[field] !== null && !isSafeStatusLabel(summary[field])
        : typeof summary[field] !== "boolean"
    ) {
      throw new ContractError(`${context}: invalid worker flag`);
    }
  }
  assertWorkerReadinessStatusSafe(summary.worker_readiness_status, context);
  assertLocalBridgeAdapterStatusMapSafe(
    summary.adapter_readiness_status,
    context
  );
  assertSafeStatusMap(summary.engine_modes, context);
  assertLocalBridgeWorkerEngineModeSummarySafe(
    summary.engine_mode_summary,
    `${context}: engine mode summary`
  );
  for (const field of [
    "manifest_count",
    "complete_manifest_count",
    "manifest_invalid_json_line_count",
    "queue_total_job_count",
    "queue_pending_job_count",
    "queue_expired_job_count",
    "queue_expired_pending_job_count",
    "queue_retry_ready_count",
    "queue_retry_waiting_count",
    "queue_retry_blocked_count",
    "queue_invalid_json_line_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid worker ${field}`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "booleans_counts_and_fixed_statuses_only",
    "no_raw_jobs",
    "no_text_payloads",
    "no_artifact_paths",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ], `${context}: boundary policy`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: worker adapter validation required`);
  }
}

function assertLocalBridgeWorkerEngineModeSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  if (
    summary.schema !==
    "iris_foundation_local_bridge_worker_engine_mode_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of [
    "tts_engine_real_http_configured",
    "live2d_engine_real_http_configured",
    "subtitle_engine_local_vtt",
    "all_real_http_engines_configured",
    "placeholder_mode_active",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "real_http_engine_count",
    "local_placeholder_engine_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (
    ![
      "real_tts_live2d_configured",
      "local_artifact_handoff_active",
      "local_placeholder_mode_active",
    ].includes(summary.production_engine_handoff_state)
  ) {
    throw new ContractError(`${context}: invalid production handoff state`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "modes_and_counts_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_raw_jobs",
      "no_text_payloads",
      "no_artifact_paths",
      "no_candidates",
      "no_commands",
    ],
    `${context}: engine mode boundary policy`
  );
}

function assertRealEngineHandoffRuntimeSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: real engine handoff summary is required`);
  }
  if (
    summary.schema !==
    "iris_foundation_real_engine_handoff_runtime_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid real engine handoff schema`);
  }
  if (!REAL_ENGINE_HANDOFF_STATUSES.has(summary.handoff_status)) {
    throw new ContractError(`${context}: invalid real engine handoff status`);
  }
  for (const field of [
    "tts_engine_mode",
    "live2d_engine_mode",
    "subtitle_engine_mode",
  ]) {
    if (!isSafeStatusLabel(summary[field])) {
      throw new ContractError(`${context}: invalid real engine mode`);
    }
  }
  for (const field of [
    "tts_engine_http_ready",
    "live2d_engine_http_ready",
    "subtitle_renderer_ready",
    "tts_engine_preferences_configured",
    "live2d_engine_preferences_configured",
    "worker_ready_for_handoff",
    "queue_clear",
    "artifact_store_configured",
    "render_manifest_store_configured",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid real engine flag ${field}`);
    }
  }
  for (const field of [
    "required_real_engine_count",
    "configured_real_engine_count",
    "adapter_ready_count",
    "queue_pending_job_count",
    "queue_retry_ready_count",
    "queue_retry_waiting_count",
    "queue_retry_blocked_count",
    "queue_invalid_json_line_count",
    "complete_manifest_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (summary.required_real_engine_count !== 2) {
    throw new ContractError(`${context}: invalid required real engine count`);
  }
  if (summary.configured_real_engine_count > summary.required_real_engine_count) {
    throw new ContractError(`${context}: invalid configured real engine count`);
  }
  const expectedConfiguredRealEngineCount =
    (summary.tts_engine_http_ready === true ? 1 : 0) +
    (summary.live2d_engine_http_ready === true ? 1 : 0);
  if (summary.configured_real_engine_count !== expectedConfiguredRealEngineCount) {
    throw new ContractError(`${context}: configured real engine count mismatch`);
  }
  if (summary.tts_engine_http_ready !== (summary.tts_engine_mode === "http")) {
    throw new ContractError(`${context}: TTS engine readiness mismatch`);
  }
  if (summary.live2d_engine_http_ready !== (summary.live2d_engine_mode === "http")) {
    throw new ContractError(`${context}: Live2D engine readiness mismatch`);
  }
  if (
    summary.subtitle_renderer_ready !==
    ["local_vtt", "http"].includes(summary.subtitle_engine_mode)
  ) {
    throw new ContractError(`${context}: subtitle renderer readiness mismatch`);
  }
  if (summary.adapter_ready_count > LOCAL_BRIDGE_ADAPTER_KINDS.length) {
    throw new ContractError(`${context}: invalid adapter ready count`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_booleans_only",
    "no_engine_request_values",
    "no_raw_jobs",
    "no_text_payloads",
    "no_artifact_paths",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ], `${context}: boundary policy`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: real engine adapter validation required`);
  }
}

function assertRealEngineWorkerFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: real engine worker flow summary is required`);
  }
  if (summary.schema !== "iris_foundation_real_engine_worker_flow_summary_v1") {
    throw new ContractError(`${context}: invalid real engine worker flow schema`);
  }
  if (!REAL_ENGINE_WORKER_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid real engine worker flow status`);
  }
  if (!REAL_ENGINE_WORKER_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid real engine worker blocking stage`);
  }
  assertNextCheckScriptMatchesBlockingStage(
    summary,
    context,
    "real engine worker"
  );
  for (const field of [
    "foundation_ready",
    "runtime_http_adapters_configured",
    "local_bridge_storage_configured",
    "worker_status_available",
    "worker_ready_for_handoff",
    "worker_queue_clear",
    "operator_action_required",
    "real_engine_configured",
    "tts_engine_http_ready",
    "live2d_engine_http_ready",
    "subtitle_renderer_ready",
    "tts_engine_preferences_configured",
    "live2d_engine_preferences_configured",
    "artifact_store_configured",
    "render_manifest_store_configured",
    "runtime_jobs_rendered",
    "retry_policy_configured",
    "job_expiry_guard_configured",
    "expired_jobs_rejected_before_engine",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid real engine worker flag ${field}`);
    }
  }
  assertWorkerReadinessStatusSafe(summary.worker_readiness_status, context);
  assertLocalBridgeAdapterStatusMapSafe(
    summary.adapter_readiness_status,
    context
  );
  assertSafeStatusMap(summary.engine_modes, context);
  if (!REAL_ENGINE_HANDOFF_STATUSES.has(summary.real_engine_handoff_status)) {
    throw new ContractError(`${context}: invalid real engine worker handoff status`);
  }
  for (const field of [
    "adapter_ready_count",
    "required_real_engine_count",
    "configured_real_engine_count",
    "complete_manifest_count",
    "queue_total_job_count",
    "queue_pending_job_count",
    "queue_retry_ready_count",
    "queue_retry_waiting_count",
    "queue_retry_blocked_count",
    "queue_invalid_json_line_count",
    "queue_expired_job_count",
    "queue_expired_pending_job_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid real engine worker ${field}`
    );
  }
  for (const field of [
    "retry_base_backoff_ms",
    "retry_max_backoff_ms",
    "max_retry_attempt_count",
    "max_job_age_ms",
  ]) {
    if (summary[field] !== null) {
      assertNonNegativeInteger(
        summary[field],
        `${context}: invalid real engine worker ${field}`
      );
    }
  }
  if (summary.required_real_engine_count !== 2) {
    throw new ContractError(`${context}: invalid required real engine count`);
  }
  if (summary.configured_real_engine_count > summary.required_real_engine_count) {
    throw new ContractError(`${context}: invalid configured real engine count`);
  }
  if (summary.adapter_ready_count > LOCAL_BRIDGE_ADAPTER_KINDS.length) {
    throw new ContractError(`${context}: invalid adapter ready count`);
  }
  for (const field of [
    "validated_adapter_packets_required",
    "worker_drains_outbox_before_engine_handoff",
    "retry_backoff_prevents_engine_hammering",
    "retry_blocked_requires_operator_action",
    "expired_jobs_rejected_before_engine",
    "real_tts_and_live2d_engines_required_for_production",
    "engine_requests_hidden_from_status",
    "raw_jobs_hidden_from_status",
    "obs_pickup_waits_for_worker_clear",
  ]) {
    if (summary.worker_flow_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid real engine worker policy`);
    }
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "booleans_counts_and_fixed_statuses_only",
    "no_engine_request_values",
    "no_raw_jobs",
    "no_text_payloads",
    "no_artifact_paths",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
    "script_names_only",
  ], `${context}: boundary policy`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: real engine worker adapter validation required`);
  }
}

function assertObsBrowserSourceRuntimeSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: OBS browser source summary is required`);
  }
  if (
    summary.schema !==
    "iris_foundation_obs_browser_source_runtime_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid OBS browser source summary schema`);
  }
  for (const field of [
    "obs_status_available",
    "origin_configured",
    "source_name_configured",
    "scene_name_configured",
    "source_dimensions_configured",
    "shutdown_source_when_not_visible",
    "refresh_browser_when_scene_becomes_active",
    "overlay_routes_ready",
    "local_bridge_handoff_routes_ready",
    "obs_browser_source_ready",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid OBS browser source flag`);
    }
  }
  for (const field of ["width", "height", "fps"]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid OBS ${field}`);
  }
  for (const field of [
    "overlay_route_count",
    "local_bridge_handoff_route_count",
    "required_adapter_kind_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid OBS ${field}`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "booleans_counts_dimensions_and_fixed_statuses_only",
    "no_origin_values",
    "no_route_values",
    "no_scene_or_source_names",
    "no_live_payloads",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ], `${context}: boundary policy`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: OBS adapter validation required`);
  }
}

function assertRuntimeHandoffFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: runtime handoff flow summary is required`);
  }
  if (summary.schema !== "iris_foundation_runtime_handoff_flow_summary_v1") {
    throw new ContractError(`${context}: invalid runtime handoff flow schema`);
  }
  if (!RUNTIME_HANDOFF_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid runtime handoff flow status`);
  }
  if (!RUNTIME_HANDOFF_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid runtime handoff blocking stage`);
  }
  assertNextCheckScriptMatchesBlockingStage(summary, context, "runtime handoff");
  if (!RUNTIME_STATUSES.has(summary.runtime_status)) {
    throw new ContractError(`${context}: invalid runtime handoff runtime status`);
  }
  if (!REAL_ENGINE_HANDOFF_STATUSES.has(summary.real_engine_handoff_status)) {
    throw new ContractError(`${context}: invalid runtime handoff engine status`);
  }
  for (const field of [
    "foundation_ready",
    "local_bridge_worker_ready",
    "local_bridge_worker_queue_clear",
    "real_engine_handoff_ready",
    "obs_browser_source_ready",
    "overlay_runtime_available",
    "runtime_event_available",
    "overlay_event_stream_available",
    "render_manifest_available",
    "render_handoff_ready",
    "obs_pickup_ready",
    "manifest_id_match_required_for_artifact_pickup",
    "all_artifact_files_available",
    "all_artifacts_contract_valid_for_pickup",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid runtime handoff flag ${field}`);
    }
  }
  for (const field of [
    "artifact_ready_adapter_count",
    "artifact_pickup_ready_adapter_count",
    "artifact_blocking_adapter_count",
    "worker_pending_job_count",
    "worker_retry_blocked_count",
    "worker_invalid_json_line_count",
    "real_engine_configured_count",
    "real_engine_pending_job_count",
    "real_engine_retry_blocked_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "local_bridge_worker_required_before_obs_pickup",
    "real_tts_and_live2d_engines_required_for_production_handoff",
    "obs_browser_source_required_before_overlay_runtime",
    "overlay_event_stream_required_before_obs_handoff",
    "render_manifest_required_before_artifact_pickup",
    "manifest_id_match_required_for_artifact_pickup",
    "artifact_contract_required_before_obs_pickup",
  ]) {
    if (summary.handoff_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid runtime handoff policy`);
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "booleans_counts_and_fixed_statuses_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_text_payloads",
      "no_artifact_paths",
      "no_raw_jobs",
      "no_candidates",
      "no_commands",
      "script_names_only",
    ],
    `${context}: runtime handoff boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: runtime handoff adapter validation required`);
  }
}

function assertObsRenderArtifactFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: OBS render artifact flow summary is required`);
  }
  if (summary.schema !== "iris_foundation_obs_render_artifact_flow_summary_v1") {
    throw new ContractError(`${context}: invalid OBS render artifact flow schema`);
  }
  if (!OBS_RENDER_ARTIFACT_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid OBS render artifact flow status`);
  }
  if (!OBS_RENDER_ARTIFACT_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid OBS render artifact blocking stage`);
  }
  assertNextCheckScriptMatchesBlockingStage(
    summary,
    context,
    "OBS render artifact"
  );
  if (!REAL_ENGINE_HANDOFF_STATUSES.has(summary.real_engine_handoff_status)) {
    throw new ContractError(`${context}: invalid OBS render artifact engine status`);
  }
  for (const field of [
    "foundation_ready",
    "obs_browser_source_ready",
    "overlay_runtime_available",
    "runtime_event_available",
    "overlay_event_stream_available",
    "render_manifest_store_configured",
    "latest_manifest_available",
    "latest_manifest_fresh",
    "obs_pickup_ready",
    "all_artifact_files_available",
    "all_artifacts_contract_valid_for_pickup",
    "artifact_render_sync_ready",
    "artifact_render_sync_rejected_for_obs_pickup",
    "manifest_id_match_required_for_artifact_pickup",
    "overlay_tts_artifact_available",
    "overlay_live2d_artifact_available",
    "overlay_subtitle_artifact_available",
    "local_bridge_worker_queue_clear",
    "real_engine_handoff_ready",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid OBS render artifact flag ${field}`);
    }
  }
  for (const field of [
    "obs_handoff_readiness_status",
    "latest_artifact_render_sync_status",
    "overlay_tts_bridge_status",
    "overlay_live2d_bridge_status",
    "overlay_subtitle_bridge_status",
  ]) {
    if (summary[field] !== null && !isSafeStatusLabel(summary[field])) {
      throw new ContractError(`${context}: invalid OBS render artifact label ${field}`);
    }
  }
  assertAdapterBooleanMapSafe(
    summary.artifact_file_available_by_adapter,
    `${context}: invalid artifact file availability map`
  );
  assertSafeStatusMap(
    summary.artifact_content_type_status_by_adapter,
    `${context}: invalid artifact content type status map`
  );
  assertSafeStatusMap(
    summary.artifact_size_status_by_adapter,
    `${context}: invalid artifact size status map`
  );
  assertSafeStatusMap(
    summary.artifact_contract_status_by_adapter,
    `${context}: invalid artifact contract status map`
  );
  assertSafeStatusMap(
    summary.artifact_pickup_status_by_adapter,
    `${context}: invalid artifact pickup status map`
  );
  assertSafeStatusMap(
    summary.obs_pickup_blocking_status_by_adapter,
    `${context}: invalid OBS pickup blocking status map`
  );
  for (const field of [
    "artifact_available_adapter_count",
    "artifact_contract_ready_adapter_count",
    "artifact_pickup_ready_adapter_count",
    "artifact_blocking_adapter_count",
    "worker_pending_job_count",
    "worker_retry_blocked_count",
    "real_engine_configured_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid OBS render artifact ${field}`
    );
  }
  for (const field of ["artifact_render_skew_ms", "max_artifact_render_skew_ms"]) {
    if (summary[field] !== null) {
      assertNonNegativeInteger(
        summary[field],
        `${context}: invalid OBS render artifact ${field}`
      );
    }
  }
  for (const field of [
    "obs_picks_up_latest_manifest_group_only",
    "manifest_id_match_required_for_artifact_pickup",
    "tts_live2d_subtitle_artifacts_required_together",
    "artifact_render_sync_required_before_obs_pickup",
    "artifact_contract_required_before_obs_pickup",
    "artifact_bodies_hidden_from_status",
    "local_paths_hidden_from_status",
  ]) {
    if (summary.artifact_flow_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid OBS render artifact policy`);
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "booleans_counts_and_fixed_statuses_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_text_payloads",
      "no_artifact_paths",
      "no_artifact_bodies",
      "no_raw_jobs",
      "no_candidates",
      "no_commands",
      "script_names_only",
    ],
    `${context}: OBS render artifact boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: OBS render artifact adapter validation required`);
  }
}

function assertLocalBridgeAdapterStatusMapSafe(statuses, context) {
  if (!statuses || typeof statuses !== "object" || Array.isArray(statuses)) {
    throw new ContractError(`${context}: adapter readiness map is required`);
  }
  for (const kind of LOCAL_BRIDGE_ADAPTER_KINDS) {
    assertWorkerReadinessStatusSafe(statuses[kind], `${context}.${kind}`);
  }
}

function assertSafeStatusMap(statuses, context) {
  if (!statuses || typeof statuses !== "object" || Array.isArray(statuses)) {
    throw new ContractError(`${context}: status map is required`);
  }
  for (const kind of LOCAL_BRIDGE_ADAPTER_KINDS) {
    if (!isSafeStatusLabel(statuses[kind])) {
      throw new ContractError(`${context}: invalid status map value`);
    }
  }
}

function assertAdapterBooleanMapSafe(values, context) {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new ContractError(`${context}: boolean map is required`);
  }
  for (const kind of LOCAL_BRIDGE_ADAPTER_KINDS) {
    if (typeof values[kind] !== "boolean") {
      throw new ContractError(`${context}: invalid boolean map value`);
    }
  }
}

function assertRenderHandoffSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: render handoff summary is required`);
  }
  if (summary.schema !== "iris_foundation_render_handoff_runtime_summary_v1") {
    throw new ContractError(`${context}: invalid render handoff summary schema`);
  }
  for (const field of [
    "render_manifest_store_configured",
    "latest_manifest_available",
    "manifest_id_match_required_for_artifact_pickup",
    "obs_pickup_ready",
    "all_artifact_files_available",
    "all_artifacts_contract_valid_for_pickup",
    "artifact_render_sync_ready",
    "artifact_render_sync_rejected_for_obs_pickup",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid render handoff flag`);
    }
  }
  for (const field of [
    "manifest_count",
    "complete_manifest_count",
    "invalid_json_line_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid render ${field}`);
  }
  for (const field of [
    "latest_manifest_error_kind",
    "obs_pickup_status",
    "obs_handoff_readiness_status",
    "latest_manifest_freshness_status",
    "latest_artifact_render_sync_status",
  ]) {
    if (summary[field] !== null && !isSafeStatusLabel(summary[field])) {
      throw new ContractError(`${context}: invalid render status label`);
    }
  }
  if (
    summary.latest_manifest_fresh !== null &&
    typeof summary.latest_manifest_fresh !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid manifest freshness flag`);
  }
  if (summary.obs_pickup_blocking_adapter_count !== null) {
    assertNonNegativeInteger(
      summary.obs_pickup_blocking_adapter_count,
      `${context}: invalid blocking adapter count`
    );
  }
  for (const field of ["artifact_render_skew_ms", "max_artifact_render_skew_ms"]) {
    if (summary[field] !== null) {
      assertNonNegativeInteger(summary[field], `${context}: invalid render ${field}`);
    }
  }
  assertAdapterBooleanMapSafe(
    summary.artifact_file_available_by_adapter,
    `${context}: invalid artifact availability map`
  );
  assertSafeStatusMap(
    summary.artifact_contract_status_by_adapter,
    `${context}: invalid artifact contract status map`
  );
  assertSafeStatusMap(
    summary.artifact_content_type_status_by_adapter,
    `${context}: invalid artifact content type status map`
  );
  assertSafeStatusMap(
    summary.artifact_size_status_by_adapter,
    `${context}: invalid artifact size status map`
  );
  assertSafeStatusMap(
    summary.artifact_pickup_status_by_adapter,
    `${context}: invalid artifact pickup status map`
  );
  assertSafeStatusMap(
    summary.obs_pickup_blocking_status_by_adapter,
    `${context}: invalid OBS pickup blocking status map`
  );
  assertBoundaryPolicy(summary.boundary_policy, [
    "booleans_counts_and_fixed_statuses_only",
    "no_artifact_paths",
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ], `${context}: boundary policy`);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: render adapter validation required`);
  }
}

function assertRuntimeSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: runtime summary is required`);
  }
  if (summary.schema !== "iris_foundation_runtime_summary_v1") {
    throw new ContractError(`${context}: invalid runtime summary schema`);
  }
  for (const field of [
    "foundation_ready",
    "overlay_runtime_available",
    "overlay_stream_available",
    "runtime_event_available",
    "render_manifest_available",
    "obs_handoff_ready",
    "local_bridge_worker_ready",
    "local_bridge_worker_queue_clear",
    "real_engine_handoff_ready",
    "obs_browser_source_ready",
    "obs_browser_source_origin_configured",
    "obs_browser_source_overlay_routes_ready",
    "obs_browser_source_handoff_routes_ready",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid runtime flag`);
    }
  }
  for (const field of [
    "local_bridge_worker_pending_job_count",
    "local_bridge_worker_retry_blocked_count",
    "local_bridge_worker_invalid_json_line_count",
    "real_engine_configured_count",
    "real_engine_pending_job_count",
    "real_engine_retry_blocked_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (!REAL_ENGINE_HANDOFF_STATUSES.has(summary.real_engine_handoff_status)) {
    throw new ContractError(`${context}: invalid real engine handoff status`);
  }
  if (
    summary.next_runtime_attention !== null &&
    !isSafeStatusLabel(summary.next_runtime_attention)
  ) {
    throw new ContractError(`${context}: invalid next runtime attention`);
  }
  assertNextRuntimeCheckScriptMatches(summary, context);
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "booleans_and_fixed_statuses_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "script_names_only",
    ],
    `${context}: runtime summary boundary policy`
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

function assertNextRuntimeCheckScriptMatches(summary, context) {
  const derivedRuntimeStatus = runtimeStatusFromSummary(summary);
  const expected =
    derivedRuntimeStatus === "ready_for_obs_runtime_handoff"
      ? null
      : checkScriptForRuntimeStatus(derivedRuntimeStatus);
  if ((summary.next_runtime_attention === null) !== (expected === null)) {
    throw new ContractError(`${context}: invalid next runtime attention state`);
  }
  if (summary.next_runtime_check_script !== expected) {
    throw new ContractError(`${context}: invalid next runtime check script`);
  }
  assertSafeOptionalScriptName(
    summary.next_runtime_check_script,
    `${context}: next runtime check script`
  );
}

function runtimeStatusFromSummary(summary) {
  if (summary.foundation_ready !== true) return "attention_required";
  if (
    summary.local_bridge_worker_ready !== true ||
    summary.local_bridge_worker_queue_clear !== true
  ) {
    return "waiting_for_local_bridge_worker";
  }
  if (summary.real_engine_handoff_ready !== true) {
    return "waiting_for_real_engine_handoff";
  }
  if (summary.obs_browser_source_ready !== true) {
    return "waiting_for_obs_browser_source";
  }
  if (summary.overlay_runtime_available !== true) {
    return "waiting_for_overlay_runtime";
  }
  if (summary.runtime_event_available !== true) {
    return "waiting_for_runtime_event";
  }
  if (summary.overlay_stream_available !== true) {
    return "waiting_for_overlay_event_stream";
  }
  if (summary.obs_handoff_ready !== true) {
    return "waiting_for_obs_render_handoff";
  }
  return "ready_for_obs_runtime_handoff";
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

function safeOptionalStatusLabel(value) {
  if (value === null || value === undefined || value === "") return null;
  return safeRequiredStatusLabel(value);
}

function safeRequiredStatusLabel(value) {
  const label = String(value ?? "unavailable").replace(/\s+/g, "_").trim().slice(0, 80);
  return isSafeStatusLabel(label) ? label : "redacted_status";
}

function safeRequiredWorkerReadinessStatus(value) {
  const status = safeRequiredStatusLabel(value);
  return LOCAL_BRIDGE_WORKER_READINESS_STATUSES.has(status)
    ? status
    : "unavailable";
}

function classifySafeContentTypeStatus(value) {
  const contentType = String(value ?? "").toLowerCase();
  if (contentType.startsWith("audio/wav")) return "audio_wav";
  if (contentType.startsWith("audio/mpeg")) return "audio_mpeg";
  if (contentType.startsWith("audio/ogg")) return "audio_ogg";
  if (contentType.startsWith("application/json")) return "application_json";
  if (contentType.startsWith("text/vtt")) return "text_vtt";
  if (contentType.startsWith("application/octet-stream")) {
    return "application_octet_stream";
  }
  return "unavailable";
}

function classifyArtifactSizeStatus(value) {
  if (value === null || value === undefined || value === "") return "missing";
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return "unknown";
  if (Math.trunc(number) === 0) return "empty";
  return "nonempty";
}

function assertWorkerReadinessStatusSafe(status, context) {
  if (!LOCAL_BRIDGE_WORKER_READINESS_STATUSES.has(status)) {
    throw new ContractError(`${context}: invalid worker readiness status`);
  }
}

function isSafeStatusLabel(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    /^[a-zA-Z0-9_:-]+$/.test(value) &&
    !UNSAFE_LABEL_PATTERN.test(value)
  );
}

function safeNullableNonNegativeNumber(value) {
  const number = safeNonNegativeNumber(value);
  return number === null ? null : number;
}

function safePositiveNumber(value) {
  const number = safeNonNegativeNumber(value);
  return number === null || number <= 0 ? null : number;
}

function safeNonNegativeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.trunc(number);
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function countConfiguredRoutes(routes) {
  if (!routes || typeof routes !== "object" || Array.isArray(routes)) return 0;
  return Object.values(routes).filter(
    (item) => typeof item === "string" && item.startsWith("/") && !URL_PATTERN.test(item)
  ).length;
}

function countTrueAdapterValues(values) {
  return LOCAL_BRIDGE_ADAPTER_KINDS.filter((kind) => values?.[kind] === true).length;
}

function countAdapterStatus(values, status) {
  return LOCAL_BRIDGE_ADAPTER_KINDS.filter((kind) => values?.[kind] === status).length;
}

function countNonReadyAdapterStatus(values) {
  return LOCAL_BRIDGE_ADAPTER_KINDS.filter((kind) => values?.[kind] !== "ready").length;
}

function assertNoForbiddenFoundationRuntimeFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFoundationRuntimeFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const field of Object.keys(value)) {
    if (FORBIDDEN_FOUNDATION_RUNTIME_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { path, field });
    }
    assertNoForbiddenFoundationRuntimeFields(value[field], context, `${path}.${field}`);
  }
}
