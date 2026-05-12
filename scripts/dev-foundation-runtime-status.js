import {
  assertFoundationRuntimeStatusReportSafe,
  createFoundationRuntimeStatusReport,
} from "../src/services/dev/foundationRuntimeStatus.js";

const FOUNDATION_RUNTIME_STATUS_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "foundation_runtime_status",
  "boundary_policy",
]);
const FOUNDATION_RUNTIME_STATUS_CLI_BOUNDARY_FIELDS = [
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
  "read_only_cli",
  "no_engine_calls",
  "no_obs_setup_side_effects",
  "script_names_only",
  "production_handoff_summary_counts_only",
];

const runtimeReport = await readRunningRuntimeFoundationStatus();
const report = runtimeReport ?? createFoundationRuntimeStatusReport();
assertFoundationRuntimeStatusReportSafe(report, "foundation runtime status CLI");

const cliReport = {
  ok: true,
  schema: "iris_foundation_runtime_status_cli_v1",
  foundation_runtime_status: report,
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
    read_only_cli: true,
    no_engine_calls: true,
    no_obs_setup_side_effects: true,
    script_names_only: true,
    production_handoff_summary_counts_only: true,
  },
};
assertFoundationRuntimeStatusCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

async function readRunningRuntimeFoundationStatus() {
  const host = optionalEnvValue(process.env.IRIS_HTTP_HOST) ?? "127.0.0.1";
  const port = optionalEnvValue(process.env.IRIS_HTTP_PORT) ?? "8787";
  try {
    const response = await fetch(
      `http://${host}:${port}/production/foundation-runtime-status`
    );
    if (!response.ok) return null;
    const body = await response.json();
    const report = body?.foundation_runtime_status ?? null;
    assertFoundationRuntimeStatusReportSafe(
      report,
      "running foundation runtime status"
    );
    return report;
  } catch {
    return null;
  }
}

function assertFoundationRuntimeStatusCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("foundation runtime status CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!FOUNDATION_RUNTIME_STATUS_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`foundation runtime status CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_foundation_runtime_status_cli_v1"
  ) {
    throw new Error("foundation runtime status CLI status mismatch");
  }
  for (const field of FOUNDATION_RUNTIME_STATUS_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`foundation runtime status CLI boundary flag failed: ${field}`);
    }
  }
}

function optionalEnvValue(value) {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}
