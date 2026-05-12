import {
  assertYouTubeIngestPostStartChecklistSafe,
  createYouTubeIngestPostStartChecklist,
} from "../src/services/dev/youtubeIngestPostStartChecklist.js";

const YOUTUBE_INGEST_POST_START_CHECKLIST_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "youtube_ingest_post_start_checklist",
  "boundary_policy",
]);
const YOUTUBE_INGEST_POST_START_CHECKLIST_CLI_BOUNDARY_FIELDS = [
  "read_only_cli",
  "script_names_only",
  "ids_counts_and_fixed_statuses_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_support_message_text",
  "no_support_amount_values",
  "no_platform_cursor_values",
  "no_platform_ids",
  "no_candidates",
  "no_commands",
  "no_real_poll_executed",
  "no_network_request_attempted",
  "no_youtube_api_request_attempted",
  "no_candidate_commit_attempted",
];

const checklist = createYouTubeIngestPostStartChecklist();
assertYouTubeIngestPostStartChecklistSafe(
  checklist,
  "youtube ingest post-start checklist CLI"
);

const cliReport = {
  ok: true,
  schema: "iris_youtube_ingest_post_start_checklist_cli_v1",
  youtube_ingest_post_start_checklist: checklist,
  boundary_policy: {
    read_only_cli: true,
    script_names_only: true,
    ids_counts_and_fixed_statuses_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_support_message_text: true,
    no_support_amount_values: true,
    no_platform_cursor_values: true,
    no_platform_ids: true,
    no_candidates: true,
    no_commands: true,
    no_real_poll_executed: true,
    no_network_request_attempted: true,
    no_youtube_api_request_attempted: true,
    no_candidate_commit_attempted: true,
  },
};
assertYouTubeIngestPostStartChecklistCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertYouTubeIngestPostStartChecklistCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("youtube ingest post-start checklist CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!YOUTUBE_INGEST_POST_START_CHECKLIST_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(
        `youtube ingest post-start checklist CLI unexpected report field ${field}`
      );
    }
  }
  const serialized = JSON.stringify(reportValue);
  if (serialized.includes('"event_id"') || serialized.includes('"trace_id"')) {
    throw new Error("youtube ingest post-start checklist CLI exposed platform event id");
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_youtube_ingest_post_start_checklist_cli_v1"
  ) {
    throw new Error("youtube ingest post-start checklist CLI status mismatch");
  }
  for (const field of YOUTUBE_INGEST_POST_START_CHECKLIST_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(
        `youtube ingest post-start checklist CLI boundary flag failed: ${field}`
      );
    }
  }
}
