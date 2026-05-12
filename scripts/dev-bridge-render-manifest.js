import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  assertLocalBridgeRenderManifestOperatorReportSafe,
  createLocalBridgeRenderManifestOperatorReport,
} from "../src/server/localBridgeRenderManifestReport.js";

const BRIDGE_RENDER_MANIFEST_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "generated_at_ms",
  "manifest_available",
  "latest_manifest_error_kind",
  "obs_pickup_status",
  "obs_handoff_readiness_status",
  "store_status",
  "latest_manifest_summary",
  "boundary_policy",
  "adapter_validation_required",
  "local_debug_paths",
]);

const artifactDir =
  process.env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR ?? "data/local_bridge_artifacts";
const showLocalPaths = process.env.IRIS_SHOW_LOCAL_PATHS === "true";
const maxManifestAgeMs = parseOptionalInteger(
  process.env.IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS
);
const report = createLocalBridgeRenderManifestOperatorReport({
  artifactDir,
  showLocalPaths,
  maxManifestAgeMs,
});

assertLocalBridgeRenderManifestOperatorReportSafe(report, "dev bridge render manifest report");
const publicReport = summarizeRenderManifestCliReport(report);
assertBridgeRenderManifestCliReportSafe(publicReport);
assertNoUnsafeReportLeak(publicReport, { showLocalPaths });
console.log(JSON.stringify(publicReport, null, 2));
if (!report.ok) process.exitCode = 1;

function summarizeRenderManifestCliReport(reportValue) {
  return {
    ok: reportValue.ok,
    schema: reportValue.schema,
    generated_at_ms: reportValue.generated_at_ms,
    manifest_available: reportValue.manifest_available,
    latest_manifest_error_kind: reportValue.latest_manifest_error_kind,
    obs_pickup_status: reportValue.obs_pickup_status,
    obs_handoff_readiness_status: reportValue.obs_handoff_readiness_status,
    store_status: summarizeStoreStatus(reportValue.store_status),
    latest_manifest_summary: summarizeManifestSummary(reportValue.latest_manifest_summary),
    boundary_policy: reportValue.boundary_policy,
    adapter_validation_required: reportValue.adapter_validation_required,
    ...(reportValue.local_debug_paths
      ? { local_debug_paths: reportValue.local_debug_paths }
      : {}),
  };
}

function summarizeStoreStatus(status) {
  if (!status || typeof status !== "object" || Array.isArray(status)) return status;
  return {
    schema: status.schema,
    artifact_dir_configured: status.artifact_dir_configured,
    manifest_count: status.manifest_count,
    complete_manifest_count: status.complete_manifest_count,
    invalid_json_line_count: status.invalid_json_line_count,
    latest_render_manifest_label_present: latestManifestIdPresent(),
    required_adapter_kinds: status.required_adapter_kinds,
    boundary_policy: status.boundary_policy,
    adapter_validation_required: status.adapter_validation_required,
  };
}

function latestManifestIdPresent() {
  try {
    const manifest = JSON.parse(
      readFileSync(join(artifactDir, "latest_event_render_manifest.json"), "utf8")
    );
    return String(manifest.manifest_id ?? "").trim() !== "";
  } catch {
    return false;
  }
}

function summarizeManifestSummary(summary) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return summary;
  const manifestIdPresent = String(summary.manifest_id ?? "").trim() !== "";
  return {
    ...summary,
    render_manifest_label_present: manifestIdPresent,
    render_event_label_present: latestManifestEventIdPresent(),
    manifest_id: undefined,
    event_id: undefined,
    artifact_byte_hash_by_adapter: undefined,
  };
}

function latestManifestEventIdPresent() {
  try {
    const manifest = JSON.parse(
      readFileSync(join(artifactDir, "latest_event_render_manifest.json"), "utf8")
    );
    return String(manifest.event_id ?? "").trim() !== "";
  } catch {
    return false;
  }
}

function assertBridgeRenderManifestCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("bridge render manifest CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!BRIDGE_RENDER_MANIFEST_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`bridge render manifest CLI unexpected report field ${field}`);
    }
  }
  if (reportValue.schema !== "iris_local_bridge_render_manifest_operator_report_v1") {
    throw new Error("bridge render manifest CLI schema mismatch");
  }
}

function assertNoUnsafeReportLeak(reportValue, { showLocalPaths }) {
  const serialized = JSON.stringify(reportValue);
  const forbiddenFragments = [
    '"text"',
    '"subtitle_text"',
    '"raw_packet"',
    '"job_payload"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"approved_memory_record"',
    '"approved_relationship_record"',
    "token-value",
    "secret-value",
    '"latest_manifest_id"',
    '"manifest_id"',
    '"event_id"',
    '"artifact_byte_hash_by_adapter"',
  ];
  if (!showLocalPaths) {
    forbiddenFragments.push(artifactDir, "tts/", "live2d/", "subtitle/");
  }
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`render manifest report leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

function parseOptionalInteger(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error("IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS must be a positive integer");
  }
  return Math.trunc(number);
}
