import { ContractError } from "../core/contracts.js";

const LOCAL_BRIDGE_WORKER_CLI_PAYLOAD_FIELDS = new Set([
  "ok",
  "mode",
  "local_outbox_configured",
  "local_artifact_storage_configured",
  "report",
  "interval_ms",
  "continue_on_error",
  "worker_readiness_status",
  "adapter_readiness_status",
  "processed_job_count",
  "engine_modes",
  "retry_policy",
  "job_freshness_policy",
  "outbox_queue",
  "event_render_manifests",
  "production_handoff_summary",
  "boundary_policy",
  "local_debug_paths",
]);
const BRIDGE_HEARTBEAT_SAFE_STATUS_FIELDS = new Set([
  "schema",
  "last_seen_ms",
  "status",
  "age_bucket",
  "boundary_policy",
]);

export function createBridgeHeartbeatSafeStatus({
  lastSeenMs = null,
  nowMs = Date.now(),
  staleAfterMs = 15_000,
} = {}) {
  const normalizedLastSeenMs = safeNonNegativeNumber(lastSeenMs);
  const normalizedNowMs = safeNonNegativeNumber(nowMs) ?? Date.now();
  const normalizedStaleAfterMs = safeNonNegativeNumber(staleAfterMs) ?? 15_000;
  const ageMs =
    normalizedLastSeenMs === null ? null : Math.max(0, normalizedNowMs - normalizedLastSeenMs);
  const status =
    ageMs === null ? "missing" : ageMs > normalizedStaleAfterMs ? "stale" : "connected";
  const summary = {
    schema: "iris_bridge_heartbeat_safe_status_v1",
    last_seen_ms: normalizedLastSeenMs,
    status,
    age_bucket: summarizeHeartbeatAgeBucket(ageMs, normalizedStaleAfterMs),
    boundary_policy: {
      last_seen_status_age_bucket_only: true,
      no_raw_bridge_payload: true,
    },
  };
  assertBridgeHeartbeatSafeStatus(summary);
  return summary;
}

export function assertBridgeHeartbeatSafeStatus(
  summary,
  context = "bridge heartbeat safe status"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary object required`);
  }
  for (const field of Object.keys(summary)) {
    if (!BRIDGE_HEARTBEAT_SAFE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (summary.schema !== "iris_bridge_heartbeat_safe_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["connected", "stale", "missing"].includes(summary.status)) {
    throw new ContractError(`${context}: invalid status`);
  }
  if (!["fresh", "stale", "missing"].includes(summary.age_bucket)) {
    throw new ContractError(`${context}: invalid age bucket`);
  }
  if (
    summary.boundary_policy?.last_seen_status_age_bucket_only !== true ||
    summary.boundary_policy?.no_raw_bridge_payload !== true
  ) {
    throw new ContractError(`${context}: unsafe boundary policy`);
  }
}

export function createLocalBridgeWorkerCliPayload({
  report,
  outboxDir,
  artifactDir,
  showLocalPaths = false,
} = {}) {
  const outboxConfigured = outboxDir !== "";
  const artifactDirConfigured = artifactDir !== "";
  const payload = {
    ok: isLocalBridgeWorkerReportOk(report),
    mode: "drain_until_idle",
    local_outbox_configured: outboxConfigured,
    local_artifact_storage_configured: artifactDirConfigured,
    report: createPublicWorkerReport(report),
    production_handoff_summary: createWorkerProductionHandoffSummary({
      report,
      status: report?.final_status,
      mode: "drain_until_idle",
    }),
    boundary_policy: createLocalPathBoundaryPolicy(),
  };
  maybeAttachLocalDebugPaths(payload, { outboxDir, artifactDir, showLocalPaths });
  assertLocalBridgeWorkerCliPayloadSafe(payload, "local bridge worker CLI payload");
  return payload;
}

export function isLocalBridgeWorkerReportOk(report) {
  return (
    report?.failed_count === 0 &&
    report?.reached_idle !== false &&
    isLocalBridgeWorkerReadinessOk(report?.worker_readiness_status) &&
    areLocalBridgeAdapterReadinessStatusesOk(report?.adapter_readiness_status) &&
    hasCompleteManifestWhenArtifactsWereProcessed(report) &&
    hasNoInvalidEventRenderManifestJson(report?.final_status) &&
    report?.final_status?.outbox_queue?.total_retry_blocked_count === 0 &&
    report?.final_status?.outbox_queue?.total_invalid_json_line_count === 0
  );
}

export function createLocalBridgeWorkerWatchPayload({
  worker,
  outboxDir,
  artifactDir,
  intervalMs,
  continueOnError,
  showLocalPaths = false,
} = {}) {
  const status = worker.status();
  const outboxConfigured = outboxDir !== "";
  const artifactDirConfigured = artifactDir !== "";
  const payload = {
    ok:
      outboxConfigured &&
      artifactDirConfigured &&
      isLocalBridgeWorkerReadinessOk(status.worker_readiness_status) &&
      areLocalBridgeAdapterReadinessStatusesOk(status.adapter_readiness_status) &&
      hasCompleteManifestWhenWorkerIsActive(status) &&
      hasNoInvalidEventRenderManifestJson(status) &&
      status.outbox_queue?.total_retry_blocked_count === 0 &&
      status.outbox_queue?.total_invalid_json_line_count === 0,
    mode: "watch",
    local_outbox_configured: outboxConfigured,
    local_artifact_storage_configured: artifactDirConfigured,
    interval_ms: intervalMs,
    continue_on_error: continueOnError,
    worker_readiness_status: status.worker_readiness_status,
    adapter_readiness_status: status.adapter_readiness_status,
    processed_job_count: Number(status.processed_job_count ?? 0),
    engine_modes: status.engine_modes,
    retry_policy: status.retry_policy,
    job_freshness_policy: status.job_freshness_policy,
    outbox_queue: status.outbox_queue,
    event_render_manifests: createPublicEventRenderManifestStoreStatus(
      status.event_render_manifests
    ),
    production_handoff_summary: createWorkerProductionHandoffSummary({
      status,
      mode: "watch",
    }),
    boundary_policy: createLocalPathBoundaryPolicy(),
  };
  maybeAttachLocalDebugPaths(payload, { outboxDir, artifactDir, showLocalPaths });
  assertLocalBridgeWorkerCliPayloadSafe(payload, "local bridge worker watch payload");
  return payload;
}

function isLocalBridgeWorkerReadinessOk(status) {
  return ["idle", "active", "work_pending"].includes(status);
}

function areLocalBridgeAdapterReadinessStatusesOk(statuses) {
  if (!statuses || typeof statuses !== "object" || Array.isArray(statuses)) return false;
  return ["tts", "live2d", "subtitle"].every((kind) =>
    isLocalBridgeWorkerReadinessOk(statuses[kind])
  );
}

function hasCompleteManifestWhenArtifactsWereProcessed(report) {
  const processedCount = Number(report?.processed_count ?? 0);
  if (processedCount <= 0) return true;
  return Number(report?.final_status?.event_render_manifests?.complete_manifest_count ?? 0) > 0;
}

function hasCompleteManifestWhenWorkerIsActive(status) {
  if (
    status?.worker_readiness_status !== "active" &&
    Number(status?.processed_job_count ?? 0) <= 0
  ) {
    return true;
  }
  return Number(status?.event_render_manifests?.complete_manifest_count ?? 0) > 0;
}

function hasNoInvalidEventRenderManifestJson(status) {
  return Number(status?.event_render_manifests?.invalid_json_line_count ?? 0) === 0;
}

function createPublicWorkerReport(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) return report;
  const finalStatus =
    report.final_status && typeof report.final_status === "object"
      ? {
          ...report.final_status,
          event_render_manifests: createPublicEventRenderManifestStoreStatus(
            report.final_status.event_render_manifests
          ),
        }
      : report.final_status;
  return {
    ...report,
    final_status: finalStatus,
  };
}

function createPublicEventRenderManifestStoreStatus(status) {
  if (!status || typeof status !== "object" || Array.isArray(status)) return status;
  const publicStatus = { ...status };
  delete publicStatus.latest_manifest_id;
  return publicStatus;
}

export function assertLocalBridgeWorkerCliPayloadSafe(
  payload,
  context = "local bridge worker CLI payload"
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ContractError(`${context}: payload object required`);
  }
  if (!["drain_until_idle", "watch"].includes(payload.mode)) {
    throw new ContractError(`${context}: invalid mode`);
  }
  for (const field of Object.keys(payload)) {
    if (!LOCAL_BRIDGE_WORKER_CLI_PAYLOAD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected payload field ${field}`);
    }
  }
  if (
    typeof payload.ok !== "boolean" ||
    typeof payload.local_outbox_configured !== "boolean" ||
    typeof payload.local_artifact_storage_configured !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid top-level status`);
  }
  assertLocalBridgeWorkerCliBoundaryPolicySafe(payload.boundary_policy, context);
  assertWorkerProductionHandoffSummarySafe(
    payload.production_handoff_summary,
    context,
    payload
  );
  if (payload.local_debug_paths && payload.local_debug_paths.explicitly_enabled !== true) {
    throw new ContractError(`${context}: local debug paths require explicit enablement`);
  }
}

function assertLocalBridgeWorkerCliBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const requiredFields = [
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
    "no_path_values_by_default",
    "production_handoff_summary_counts_only",
  ];
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary flag ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary flag required ${field}`);
    }
  }
}

function assertWorkerProductionHandoffSummarySafe(summary, context, payload) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary required`);
  }
  if (
    summary.schema !== "iris_local_bridge_worker_cli_handoff_summary_v1" ||
    summary.mode !== payload.mode ||
    summary.worker_cli_report_only !== true ||
    summary.real_engine_processes_not_started_by_cli !== true ||
    summary.real_obs_operation_not_started_by_cli !== true ||
    summary.no_runtime_adapter_posts_by_cli !== true ||
    summary.no_game_or_os_input_by_cli !== true ||
    summary.raw_jobs_not_exposed !== true ||
    summary.endpoint_values_not_exposed !== true ||
    summary.secret_values_not_exposed !== true ||
    summary.path_values_hidden_by_default !== true ||
    summary.validated_jobs_only_reach_engine_worker !== true ||
    summary.obs_pickup_requires_complete_render_manifest !== true
  ) {
    throw new ContractError(`${context}: unsafe production handoff summary`);
  }
  const report = payload.report ?? null;
  const status = payload.mode === "drain_until_idle" ? report?.final_status : payload;
  const outboxQueue = status?.outbox_queue ?? report?.final_status?.outbox_queue ?? null;
  const eventRenderManifests =
    status?.event_render_manifests ?? report?.final_status?.event_render_manifests ?? null;
  for (const [field, expected] of [
    [
      "processed_count",
      Number(report?.processed_count ?? status?.processed_job_count ?? 0),
    ],
    ["failed_count", Number(report?.failed_count ?? 0)],
    ["skipped_count", Number(report?.skipped_count ?? 0)],
    ["expired_count", Number(report?.expired_count ?? outboxQueue?.total_expired_count ?? 0)],
    ["pending_count", Number(outboxQueue?.total_pending_count ?? 0)],
    ["retry_blocked_count", Number(outboxQueue?.total_retry_blocked_count ?? 0)],
    ["invalid_json_line_count", Number(outboxQueue?.total_invalid_json_line_count ?? 0)],
    [
      "manifest_invalid_json_line_count",
      Number(eventRenderManifests?.invalid_json_line_count ?? 0),
    ],
    ["render_manifest_count", Number(eventRenderManifests?.manifest_count ?? 0)],
    [
      "complete_render_manifest_count",
      Number(eventRenderManifests?.complete_manifest_count ?? 0),
    ],
  ]) {
    if (summary[field] !== expected) {
      throw new ContractError(`${context}: handoff ${field} mismatch`);
    }
  }
}

function createLocalPathBoundaryPolicy() {
  return {
    no_raw_jobs: true,
    no_text_payloads: true,
    no_candidates: true,
    no_commands: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_path_values_by_default: true,
    production_handoff_summary_counts_only: true,
  };
}

function summarizeHeartbeatAgeBucket(ageMs, staleAfterMs) {
  if (ageMs === null) return "missing";
  return ageMs > staleAfterMs ? "stale" : "fresh";
}

function safeNonNegativeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function createWorkerProductionHandoffSummary({ report = null, status = null, mode }) {
  const outboxQueue = status?.outbox_queue ?? null;
  const eventRenderManifests = status?.event_render_manifests ?? null;
  return {
    schema: "iris_local_bridge_worker_cli_handoff_summary_v1",
    mode,
    worker_cli_report_only: true,
    real_engine_processes_not_started_by_cli: true,
    real_obs_operation_not_started_by_cli: true,
    no_runtime_adapter_posts_by_cli: true,
    no_game_or_os_input_by_cli: true,
    raw_jobs_not_exposed: true,
    endpoint_values_not_exposed: true,
    secret_values_not_exposed: true,
    path_values_hidden_by_default: true,
    validated_jobs_only_reach_engine_worker: true,
    obs_pickup_requires_complete_render_manifest: true,
    worker_readiness_status: status?.worker_readiness_status ?? null,
    tts_readiness_status: status?.adapter_readiness_status?.tts ?? null,
    live2d_readiness_status: status?.adapter_readiness_status?.live2d ?? null,
    subtitle_readiness_status: status?.adapter_readiness_status?.subtitle ?? null,
    processed_count: Number(report?.processed_count ?? status?.processed_job_count ?? 0),
    failed_count: Number(report?.failed_count ?? 0),
    skipped_count: Number(report?.skipped_count ?? 0),
    expired_count: Number(report?.expired_count ?? outboxQueue?.total_expired_count ?? 0),
    pending_count: Number(outboxQueue?.total_pending_count ?? 0),
    retry_blocked_count: Number(outboxQueue?.total_retry_blocked_count ?? 0),
    invalid_json_line_count: Number(outboxQueue?.total_invalid_json_line_count ?? 0),
    manifest_invalid_json_line_count: Number(
      eventRenderManifests?.invalid_json_line_count ?? 0
    ),
    render_manifest_count: Number(eventRenderManifests?.manifest_count ?? 0),
    complete_render_manifest_count: Number(
      eventRenderManifests?.complete_manifest_count ?? 0
    ),
    reached_idle: report?.reached_idle ?? null,
  };
}

function maybeAttachLocalDebugPaths(payload, { outboxDir, artifactDir, showLocalPaths }) {
  if (!showLocalPaths) return;
  payload.local_debug_paths = {
    outbox_dir: outboxDir,
    artifact_dir: artifactDir,
    explicitly_enabled: true,
  };
}
