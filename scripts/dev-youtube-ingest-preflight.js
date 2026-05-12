import {
  assertYouTubeIngestPreflightReportSafe,
  createYouTubeIngestPreflightReport,
} from "../src/services/dev/youtubeIngestPreflight.js";

const YOUTUBE_INGEST_PREFLIGHT_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "youtube_ingest_preflight",
  "boundary_policy",
]);

const report = createYouTubeIngestPreflightReport();
assertYouTubeIngestPreflightReportSafe(report, "youtube ingest preflight CLI");
const cliReport = {
  ok: true,
  schema: "iris_youtube_ingest_preflight_cli_v1",
  youtube_ingest_preflight: report,
  boundary_policy: {
    env_names_only: true,
    script_names_only: true,
    no_secret_values: true,
    no_platform_cursor_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_support_message_text: true,
    no_candidates: true,
    no_commands: true,
    read_only_cli: true,
  },
};
assertYouTubeIngestPreflightCliReportSafe(cliReport);

console.log(JSON.stringify(cliReport, null, 2));

function assertYouTubeIngestPreflightCliReportSafe(cliReport) {
  if (
    !cliReport ||
    cliReport.ok !== true ||
    cliReport.schema !== "iris_youtube_ingest_preflight_cli_v1"
  ) {
    throw new Error("youtube ingest preflight CLI report mismatch");
  }
  for (const field of Object.keys(cliReport)) {
    if (!YOUTUBE_INGEST_PREFLIGHT_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`youtube ingest preflight CLI unexpected report field: ${field}`);
    }
  }
  const serialized = JSON.stringify(cliReport);
  if (serialized.includes('"event_id"') || serialized.includes('"trace_id"')) {
    throw new Error("youtube ingest preflight CLI exposed platform event id");
  }
  assertYouTubeIngestPreflightReportSafe(
    cliReport.youtube_ingest_preflight,
    "youtube ingest preflight CLI report"
  );
  for (const field of [
    "env_names_only",
    "script_names_only",
    "no_secret_values",
    "no_platform_cursor_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_support_message_text",
    "no_candidates",
    "no_commands",
    "read_only_cli",
  ]) {
    if (cliReport.boundary_policy?.[field] !== true) {
      throw new Error(`youtube ingest preflight CLI boundary failed: ${field}`);
    }
  }
}
