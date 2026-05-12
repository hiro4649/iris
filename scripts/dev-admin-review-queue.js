import {
  assertAdminReviewQueueReportSafe,
  createAdminReviewQueueReport,
} from "../src/services/dev/adminReviewQueue.js";

const ADMIN_REVIEW_QUEUE_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "admin_review_queue",
  "boundary_policy",
]);
const ADMIN_REVIEW_QUEUE_CLI_BOUNDARY_FIELDS = [
  "read_only_cli",
  "summaries_only",
  "no_raw_candidates",
  "no_approved_records",
  "no_direct_commit",
  "validator_required_before_commit",
  "no_endpoint_values",
  "no_secret_values",
  "no_commands",
  "no_game_or_os_input",
];

const report = createAdminReviewQueueReport();
assertAdminReviewQueueReportSafe(report, "admin review queue CLI");

const cliReport = {
  ok: true,
  schema: "iris_admin_review_queue_cli_v1",
  admin_review_queue: report,
  boundary_policy: {
    read_only_cli: true,
    summaries_only: true,
    no_raw_candidates: true,
    no_approved_records: true,
    no_direct_commit: true,
    validator_required_before_commit: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_commands: true,
    no_game_or_os_input: true,
  },
};
assertAdminReviewQueueCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertAdminReviewQueueCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("admin review queue CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!ADMIN_REVIEW_QUEUE_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`admin review queue CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_admin_review_queue_cli_v1"
  ) {
    throw new Error("admin review queue CLI status mismatch");
  }
  for (const field of ADMIN_REVIEW_QUEUE_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`admin review queue CLI boundary flag failed: ${field}`);
    }
  }
  assertNoUnsafeReportLeak(reportValue);
}

function assertNoUnsafeReportLeak(reportValue) {
  const serialized = JSON.stringify(reportValue);
  const forbiddenFragments = [
    process.env.DATABASE_URL,
    process.env.IRIS_POSTGRES_URL,
    process.env.IRIS_OBS_BRIDGE_ENDPOINT,
    process.env.IRIS_OBS_BRIDGE_API_KEY,
    process.env.IRIS_YOUTUBE_DATA_API_KEY,
    process.env.IRIS_YOUTUBE_OAUTH_TOKEN,
    process.env.IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN,
    process.env.IRIS_TTS_API_KEY,
    process.env.IRIS_LIVE2D_API_KEY,
    '"event_id"',
    '"trace_id"',
    '"subtitle_text"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
  ].filter(Boolean);
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`admin review queue CLI leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
