import {
  assertGameplayRuntimeStatusReportSafe,
  createGameplayRuntimeStatusReport,
} from "../src/services/dev/gameplayRuntimeStatus.js";

const GAMEPLAY_RUNTIME_STATUS_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "gameplay_runtime_status",
  "boundary_policy",
]);
const GAMEPLAY_RUNTIME_STATUS_CLI_BOUNDARY_FIELDS = [
  "env_names_only",
  "counts_statuses_and_booleans_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_raw_frames",
  "no_ocr_text",
  "no_vision_payloads",
  "no_action_candidates",
  "no_approved_actions",
  "no_commands",
  "no_raw_stream_state",
  "no_raw_scheduler_results",
  "read_only_cli",
  "no_polling_side_effects",
  "script_names_only",
  "production_handoff_summary_counts_only",
];

const report = createGameplayRuntimeStatusReport();
assertGameplayRuntimeStatusReportSafe(report, "gameplay runtime status CLI");

const cliReport = {
  ok: true,
  schema: "iris_gameplay_runtime_status_cli_v1",
  gameplay_runtime_status: report,
  boundary_policy: {
    env_names_only: true,
    counts_statuses_and_booleans_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_raw_frames: true,
    no_ocr_text: true,
    no_vision_payloads: true,
    no_action_candidates: true,
    no_approved_actions: true,
    no_commands: true,
    no_raw_stream_state: true,
    no_raw_scheduler_results: true,
    read_only_cli: true,
    no_polling_side_effects: true,
    script_names_only: true,
    production_handoff_summary_counts_only: true,
  },
};
assertGameplayRuntimeStatusCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertGameplayRuntimeStatusCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("gameplay runtime status CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!GAMEPLAY_RUNTIME_STATUS_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`gameplay runtime status CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_gameplay_runtime_status_cli_v1"
  ) {
    throw new Error("gameplay runtime status CLI status mismatch");
  }
  for (const field of GAMEPLAY_RUNTIME_STATUS_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`gameplay runtime status CLI boundary flag failed: ${field}`);
    }
  }
}
