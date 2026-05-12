import {
  assertYouTubeIngestRuntimeStatusReportSafe,
  createYouTubeIngestRuntimeStatusReport,
} from "../src/services/dev/youtubeIngestRuntimeStatus.js";

const YOUTUBE_INGEST_RUNTIME_STATUS_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "youtube_ingest_runtime_status",
  "boundary_policy",
]);
const YOUTUBE_INGEST_RUNTIME_STATUS_CLI_BOUNDARY_FIELDS = [
  "env_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_support_message_text",
  "no_platform_cursor_values",
  "no_candidates",
  "no_commands",
  "no_raw_scheduler_results",
  "read_only_cli",
  "no_polling_side_effects",
  "script_names_only",
  "production_handoff_summary_counts_only",
];

const report = createYouTubeIngestRuntimeStatusReport();
assertYouTubeIngestRuntimeStatusReportSafe(
  report,
  "youtube ingest runtime status CLI"
);

const cliReport = {
  ok: true,
  schema: "iris_youtube_ingest_runtime_status_cli_v1",
  youtube_ingest_runtime_status: report,
  boundary_policy: {
    env_names_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_support_message_text: true,
    no_platform_cursor_values: true,
    no_candidates: true,
    no_commands: true,
    no_raw_scheduler_results: true,
    read_only_cli: true,
    no_polling_side_effects: true,
    script_names_only: true,
    production_handoff_summary_counts_only: true,
  },
};
assertYouTubeIngestRuntimeStatusCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertYouTubeIngestRuntimeStatusCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("youtube ingest runtime status CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!YOUTUBE_INGEST_RUNTIME_STATUS_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`youtube ingest runtime status CLI unexpected report field ${field}`);
    }
  }
  const serialized = JSON.stringify(reportValue);
  if (serialized.includes('"event_id"') || serialized.includes('"trace_id"')) {
    throw new Error("youtube ingest runtime status CLI exposed platform event id");
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_youtube_ingest_runtime_status_cli_v1"
  ) {
    throw new Error("youtube ingest runtime status CLI status mismatch");
  }
  for (const field of YOUTUBE_INGEST_RUNTIME_STATUS_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`youtube ingest runtime status CLI boundary flag failed: ${field}`);
    }
  }
}
