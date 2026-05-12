import {
  assertProductionRuntimeHandoffStatusReportSafe,
  createProductionRuntimeHandoffStatusReport,
} from "../src/services/dev/productionRuntimeHandoffStatus.js";

const PRODUCTION_RUNTIME_HANDOFF_STATUS_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "production_runtime_handoff_status",
  "boundary_policy",
]);
const PRODUCTION_RUNTIME_HANDOFF_STATUS_CLI_BOUNDARY_FIELDS = [
  "env_names_only",
  "counts_statuses_and_booleans_only",
  "no_child_reports",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_raw_frames",
  "no_ocr_text",
  "no_candidates",
  "no_commands",
  "no_raw_runtime_state",
  "read_only_cli",
  "script_names_only",
];

const report = createProductionRuntimeHandoffStatusReport();
assertProductionRuntimeHandoffStatusReportSafe(
  report,
  "production runtime handoff status CLI"
);

const cliReport = {
  ok: true,
  schema: "iris_production_runtime_handoff_status_cli_v1",
  production_runtime_handoff_status: report,
  boundary_policy: {
    env_names_only: true,
    counts_statuses_and_booleans_only: true,
    no_child_reports: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_raw_frames: true,
    no_ocr_text: true,
    no_candidates: true,
    no_commands: true,
    no_raw_runtime_state: true,
    read_only_cli: true,
    script_names_only: true,
  },
};
assertProductionRuntimeHandoffStatusCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertProductionRuntimeHandoffStatusCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("production runtime handoff status CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!PRODUCTION_RUNTIME_HANDOFF_STATUS_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`production runtime handoff status CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_production_runtime_handoff_status_cli_v1"
  ) {
    throw new Error("production runtime handoff status CLI status mismatch");
  }
  for (const field of PRODUCTION_RUNTIME_HANDOFF_STATUS_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`production runtime handoff status CLI boundary flag failed: ${field}`);
    }
  }
}
