import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIntegrationFixtures } from "../src/services/dev/integrationFixtures.js";
import { createLocalBridgeEngineWorker } from "../src/server/localBridgeEngineWorker.js";
import {
  assertLocalBridgeStatusSafe,
  createLocalBridgeServer,
} from "../src/server/localBridgeServer.js";
import {
  assertLocalBridgeEngineProcessReportSafe,
  assertLocalBridgeEngineStatusSafe,
} from "../src/server/localBridgeEngineWorker.js";
import { assertLocalBridgeRenderManifestOperatorReportSafe } from "../src/server/localBridgeRenderManifestReport.js";
import { listen } from "../src/server/httpServer.js";

const BRIDGE_STATUS_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "local_bridge_configured",
  "local_outbox_configured",
  "local_artifact_storage_configured",
  "fixture_storage",
  "bridge_status",
  "worker_status_before",
  "worker_report",
  "worker_status_after",
  "manifest_store_status",
  "latest_render_manifest_report",
  "production_handoff_summary",
  "boundary_policy",
]);

const tempDir = mkdtempSync(join(tmpdir(), "iris-bridge-status-roundtrip-"));
const outboxDir = join(tempDir, "outbox");
const artifactDir = join(tempDir, "artifacts");
const bridgeServer = createLocalBridgeServer({
  outboxDir,
  artifactDir,
  logger: { error() {} },
});
const bridgeAddress = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });
const bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;

try {
  const fixtures = createIntegrationFixtures({ generatedAtMs: Date.now() });
  await postJson(`${bridgeUrl}/tts`, fixtures.adapter_packets.tts);
  await postJson(`${bridgeUrl}/live2d`, fixtures.adapter_packets.live2d);
  await postJson(`${bridgeUrl}/subtitle`, fixtures.adapter_packets.subtitle);

  const bridgeStatusResponse = await fetch(`${bridgeUrl}/status`);
  const bridgeStatusBody = await bridgeStatusResponse.json();
  const bridgeStatus = bridgeStatusBody.local_bridge_status;
  assertLocalBridgeStatusSafe(bridgeStatus, "dev bridge status roundtrip");

  const worker = createLocalBridgeEngineWorker({ outboxDir, artifactDir });
  const workerStatusBefore = worker.status();
  assertLocalBridgeEngineStatusSafe(
    workerStatusBefore,
    "dev bridge status roundtrip worker before"
  );
  if (workerStatusBefore.worker_readiness_status !== "work_pending") {
    throw new Error("expected local bridge worker readiness to be work_pending before drain");
  }
  const workerReport = worker.processOnce();
  assertLocalBridgeEngineProcessReportSafe(
    workerReport,
    "dev bridge status roundtrip worker report"
  );
  const workerStatusAfter = worker.status();
  assertLocalBridgeEngineStatusSafe(
    workerStatusAfter,
    "dev bridge status roundtrip worker after"
  );
  if (workerStatusAfter.worker_readiness_status !== "active") {
    throw new Error("expected local bridge worker readiness to be active after drain");
  }
  const manifestStatusResponse = await fetch(`${bridgeUrl}/event-render-manifests/status`);
  const manifestStatusBody = await manifestStatusResponse.json();
  const manifestStoreStatus = manifestStatusBody.event_render_manifest_store;
  const manifestReportResponse = await fetch(`${bridgeUrl}/event-render-manifests/latest`);
  const manifestReportBody = await manifestReportResponse.json();
  const manifestReport = manifestReportBody.event_render_manifest_report;
  const latestManifestSummaryAvailable =
    manifestReport?.latest_manifest_summary &&
    typeof manifestReport.latest_manifest_summary === "object";
  const artifactFileAvailability =
    manifestReport?.latest_manifest_summary?.artifact_file_available_by_adapter ?? {};
  const allArtifactFilesAvailable =
    latestManifestSummaryAvailable &&
    Object.values(artifactFileAvailability).length > 0 &&
    Object.values(artifactFileAvailability).every((available) => available === true);
  assertLocalBridgeRenderManifestOperatorReportSafe(
    manifestReport,
    "dev bridge status roundtrip render manifest report"
  );

  const publicReport = {
    ok: true,
    local_bridge_configured: true,
    local_outbox_configured: true,
    local_artifact_storage_configured: true,
    fixture_storage: true,
    bridge_status: summarizeBridgeStatus(bridgeStatus),
    worker_status_before: summarizeWorkerStatus(workerStatusBefore),
    worker_report: summarizeWorkerReport(workerReport),
    worker_status_after: summarizeWorkerStatus(workerStatusAfter),
    manifest_store_status: manifestStoreStatus,
    latest_render_manifest_report: manifestReport,
    production_handoff_summary: {
      schema: "iris_bridge_status_roundtrip_handoff_summary_v1",
      fixture_storage_only: true,
      local_bridge_fixture_only: true,
      real_engine_processes_not_started: true,
      real_obs_operation_not_started: true,
      no_runtime_adapter_posts_after_fixture_setup: true,
      no_game_or_os_input: true,
      raw_packets_not_exposed: true,
      raw_jobs_not_exposed: true,
      path_values_not_exposed: true,
      endpoint_values_not_exposed: true,
      secret_values_not_exposed: true,
      validated_adapter_packets_required: true,
      obs_pickup_requires_complete_render_manifest: true,
      bridge_received_count: bridgeStatus.total_received,
      worker_processed_count: workerReport.processed_count,
      worker_failed_count: workerReport.failed_count,
      worker_readiness_before: workerStatusBefore.worker_readiness_status,
      worker_readiness_after: workerStatusAfter.worker_readiness_status,
      manifest_count: manifestStoreStatus?.manifest_count ?? 0,
      complete_manifest_count: manifestStoreStatus?.complete_manifest_count ?? 0,
      manifest_available: latestManifestSummaryAvailable,
      obs_handoff_readiness_status:
        manifestReport?.obs_handoff_readiness_status ?? null,
      all_artifact_files_available: allArtifactFilesAvailable,
    },
    boundary_policy: {
      status_only: true,
      no_endpoint_values: true,
      no_artifact_paths: true,
      no_raw_packets: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
  };
  if (
    manifestStatusResponse.status !== 200 ||
    manifestStatusBody.ok !== true ||
    manifestStoreStatus?.manifest_count !== 1 ||
    manifestStoreStatus?.complete_manifest_count !== 1 ||
    !hasBoundaryPolicy(manifestStoreStatus?.boundary_policy, ["counts_only"]) ||
    manifestReportResponse.status !== 200 ||
    manifestReportBody.ok !== true ||
    manifestReport?.manifest_available !== true ||
    manifestReport?.obs_handoff_readiness_status !== "ready" ||
    manifestReport?.latest_manifest_summary?.all_artifact_files_available !== true ||
    !hasBoundaryPolicy(manifestReport?.latest_manifest_summary?.boundary_policy, [
      "no_artifact_paths",
    ])
  ) {
    publicReport.ok = false;
  }
  assertBridgeStatusRoundtripReportSafe(publicReport);
  assertProductionHandoffSummarySafe(publicReport);
  assertNoUnsafeReportLeak(publicReport);
  console.log(JSON.stringify(publicReport, null, 2));
} finally {
  await closeServer(bridgeServer);
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`fixture post failed: ${response.status}`);
  }
}

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    bridgeUrl,
    tempDir,
    outboxDir,
    artifactDir,
    "IRIS bridge fixture voice check",
    '"text"',
    '"subtitle_text"',
    '"raw_packet"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"latest_manifest_id"',
    '"manifest_id"',
    '"event_id"',
    "token-value",
    "secret-value",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`bridge status roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

function summarizeWorkerReport(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) return report;
  const hasSafeText = (value) => typeof value === "string" && value.trim() !== "";
  return {
    ...report,
    receipts: Array.isArray(report.receipts)
      ? report.receipts.map((receipt) => ({
          ...receipt,
          job_id: undefined,
          event_id: undefined,
          job_id_present: hasSafeText(receipt.job_id),
          event_id_present: hasSafeText(receipt.event_id),
        }))
      : report.receipts,
    event_render_manifests: Array.isArray(report.event_render_manifests)
      ? report.event_render_manifests.map((manifest) => ({
          ...manifest,
          manifest_id: undefined,
          event_id: undefined,
          manifest_id_present: hasSafeText(manifest.manifest_id),
          event_id_present: hasSafeText(manifest.event_id),
        }))
      : report.event_render_manifests,
  };
}

function summarizeBridgeStatus(status) {
  if (!status || typeof status !== "object" || Array.isArray(status)) return status;
  const hasSafeText = (value) => typeof value === "string" && value.trim() !== "";
  return {
    ...status,
    adapters: Object.fromEntries(
      Object.entries(status.adapters ?? {}).map(([kind, adapter]) => [
        kind,
        {
          ...adapter,
          last_event_id: undefined,
          last_event_id_present: hasSafeText(adapter?.last_event_id),
        },
      ])
    ),
    outbox: status.outbox
      ? {
          ...status.outbox,
          adapters: Object.fromEntries(
            Object.entries(status.outbox.adapters ?? {}).map(([kind, adapter]) => [
              kind,
              {
                ...adapter,
                last_job_id: undefined,
                last_event_id: undefined,
                last_job_id_present: hasSafeText(adapter?.last_job_id),
                last_event_id_present: hasSafeText(adapter?.last_event_id),
              },
            ])
          ),
        }
      : status.outbox,
    recent: Array.isArray(status.recent)
      ? status.recent.map((item) => ({
          ...item,
          event_id: undefined,
          request_id: undefined,
          outbox_job_id: undefined,
          event_id_present: hasSafeText(item.event_id),
          request_id_present: hasSafeText(item.request_id),
          outbox_job_id_present: hasSafeText(item.outbox_job_id),
        }))
      : status.recent,
  };
}

function summarizeWorkerStatus(status) {
  if (!status || typeof status !== "object" || Array.isArray(status)) return status;
  return {
    ...status,
    event_render_manifests: status.event_render_manifests
      ? {
          ...status.event_render_manifests,
          latest_manifest_id: undefined,
          latest_manifest_id_present: latestManifestIdPresent(),
        }
      : status.event_render_manifests,
  };
}

function latestManifestIdPresent() {
  try {
    const manifest = JSON.parse(
      readFileSync(join(artifactDir, "latest_event_render_manifest.json"), "utf8")
    );
    return hasSafeText(manifest.manifest_id);
  } catch {
    return false;
  }
}

function assertBridgeStatusRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("bridge status roundtrip report missing");
  }
  if (report.ok !== true) {
    throw new Error("bridge status roundtrip readiness failed");
  }
  for (const field of Object.keys(report)) {
    if (!BRIDGE_STATUS_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`bridge status roundtrip unexpected report field ${field}`);
    }
  }
  for (const field of [
    "local_bridge_configured",
    "local_outbox_configured",
    "local_artifact_storage_configured",
    "fixture_storage",
  ]) {
    if (report[field] !== true) {
      throw new Error(`bridge status roundtrip setup flag failed: ${field}`);
    }
  }
  assertBoundaryPolicy(report.boundary_policy, [
    "status_only",
    "no_endpoint_values",
    "no_artifact_paths",
    "no_raw_packets",
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ], "bridge status roundtrip");
}

function hasBoundaryPolicy(policy, fields) {
  return Boolean(policy) && fields.every((field) => policy[field] === true);
}

function assertBoundaryPolicy(policy, fields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error(`${context} boundary policy missing`);
  }
  const allowed = new Set(fields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new Error(`${context} unexpected boundary flag: ${field}`);
    }
  }
  for (const field of fields) {
    if (policy[field] !== true) {
      throw new Error(`${context} boundary flag failed: ${field}`);
    }
  }
}

function assertProductionHandoffSummarySafe(report) {
  const summary = report.production_handoff_summary;
  if (!summary || typeof summary !== "object") {
    throw new Error("bridge status roundtrip handoff summary missing");
  }
  if (summary.schema !== "iris_bridge_status_roundtrip_handoff_summary_v1") {
    throw new Error("bridge status roundtrip handoff schema mismatch");
  }
  for (const field of [
    "fixture_storage_only",
    "local_bridge_fixture_only",
    "real_engine_processes_not_started",
    "real_obs_operation_not_started",
    "no_runtime_adapter_posts_after_fixture_setup",
    "no_game_or_os_input",
    "raw_packets_not_exposed",
    "raw_jobs_not_exposed",
    "path_values_not_exposed",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
    "validated_adapter_packets_required",
    "obs_pickup_requires_complete_render_manifest",
    "manifest_available",
    "all_artifact_files_available",
  ]) {
    if (summary[field] !== true) {
      throw new Error(`bridge status roundtrip handoff flag failed: ${field}`);
    }
  }
  for (const field of [
    "bridge_received_count",
    "worker_processed_count",
    "worker_failed_count",
    "manifest_count",
    "complete_manifest_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new Error(`bridge status roundtrip handoff count invalid: ${field}`);
    }
  }
  if (
    summary.bridge_received_count !== report.bridge_status.total_received ||
    summary.worker_processed_count !== report.worker_report.processed_count ||
    summary.worker_failed_count !== report.worker_report.failed_count ||
    summary.worker_readiness_before !==
      report.worker_status_before.worker_readiness_status ||
    summary.worker_readiness_after !==
      report.worker_status_after.worker_readiness_status ||
    summary.manifest_count !== report.manifest_store_status.manifest_count ||
    summary.complete_manifest_count !==
      report.manifest_store_status.complete_manifest_count ||
    summary.obs_handoff_readiness_status !==
      report.latest_render_manifest_report.obs_handoff_readiness_status
  ) {
    throw new Error("bridge status roundtrip handoff totals mismatch");
  }
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
