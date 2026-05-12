#!/usr/bin/env node
import {
  assertYouTubeIngestReadinessRehearsalSafe,
  createYouTubeIngestReadinessRehearsal,
} from "../src/services/dev/youtubeIngestReadinessRehearsal.js";

const YOUTUBE_INGEST_READINESS_REHEARSAL_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "youtube_ingest_readiness_rehearsal",
  "boundary_policy",
]);
const YOUTUBE_INGEST_READINESS_REHEARSAL_CLI_BOUNDARY_FIELDS = [
  "env_names_only",
  "script_names_only",
  "booleans_counts_and_fixed_statuses_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_text_payloads",
  "no_support_message_text",
  "no_platform_ids",
  "no_platform_cursor_values",
  "no_candidates",
  "no_commands",
  "no_raw_scheduler_results",
  "no_raw_stream_state",
  "no_polling_side_effects",
  "read_only_cli",
];

const report = createYouTubeIngestReadinessRehearsal();
assertYouTubeIngestReadinessRehearsalSafe(
  report,
  "youtube ingest readiness rehearsal CLI"
);

const cliReport = {
  ok: true,
  schema: "iris_youtube_ingest_readiness_rehearsal_cli_v1",
  youtube_ingest_readiness_rehearsal: report,
  boundary_policy: {
    env_names_only: true,
    script_names_only: true,
    booleans_counts_and_fixed_statuses_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_text_payloads: true,
    no_support_message_text: true,
    no_platform_ids: true,
    no_platform_cursor_values: true,
    no_candidates: true,
    no_commands: true,
    no_raw_scheduler_results: true,
    no_raw_stream_state: true,
    no_polling_side_effects: true,
    read_only_cli: true,
  },
};
assertYouTubeIngestReadinessRehearsalCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertYouTubeIngestReadinessRehearsalCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("youtube ingest readiness rehearsal CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!YOUTUBE_INGEST_READINESS_REHEARSAL_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(
        `youtube ingest readiness rehearsal CLI unexpected report field ${field}`
      );
    }
  }
  const serialized = JSON.stringify(reportValue);
  if (serialized.includes('"event_id"') || serialized.includes('"trace_id"')) {
    throw new Error("youtube ingest readiness rehearsal CLI exposed platform event id");
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_youtube_ingest_readiness_rehearsal_cli_v1"
  ) {
    throw new Error("youtube ingest readiness rehearsal CLI status mismatch");
  }
  for (const field of YOUTUBE_INGEST_READINESS_REHEARSAL_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(
        `youtube ingest readiness rehearsal CLI boundary flag failed: ${field}`
      );
    }
  }
}
