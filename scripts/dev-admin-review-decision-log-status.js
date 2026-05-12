import {
  assertAdminReviewDecisionLogStatusSafe,
  createJsonAdminReviewDecisionLog,
} from "../src/services/dev/adminReviewDecisionLog.js";

const ADMIN_REVIEW_DECISION_LOG_STATUS_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "admin_review_decision_log_status",
  "boundary_policy",
]);
const ADMIN_REVIEW_DECISION_LOG_STATUS_CLI_BOUNDARY_FIELDS = [
  "counts_only",
  "env_name_only_when_unconfigured",
  "no_store_paths",
  "no_raw_candidates",
  "no_approved_records",
  "no_endpoint_values",
  "no_secret_values",
  "no_commands",
];

const logPath = String(process.env.IRIS_ADMIN_REVIEW_DECISION_LOG_PATH ?? "").trim();
const status = logPath
  ? createJsonAdminReviewDecisionLog(logPath).status()
  : {
      schema: "iris_admin_review_decision_log_status_v1",
      health: "attention",
      store_available: false,
      read_error: true,
      error_kind: "env_path_not_configured",
      entry_count: 0,
      latest_decision_at_ms: null,
      action_counts: {
        approve_memory_candidate: 0,
        reject_memory_candidate: 0,
        approve_relationship_candidate: 0,
        reject_relationship_candidate: 0,
      },
      max_entries: 0,
      retention_enabled: false,
      recovery: "in_memory",
      boundary_policy: {
        counts_only: true,
        decision_summaries_only: true,
        no_raw_candidates: true,
        no_approved_records: true,
        no_memory_or_relationship_store_write: true,
        no_validator_commit: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_payloads: true,
        no_commands: true,
        no_raw_frames: true,
        no_store_paths: true,
      },
    };

assertAdminReviewDecisionLogStatusSafe(status, "admin review decision log CLI");

const cliReport = {
  ok: true,
  schema: "iris_admin_review_decision_log_status_cli_v1",
  admin_review_decision_log_status: status,
  boundary_policy: {
    counts_only: true,
    env_name_only_when_unconfigured: true,
    no_store_paths: true,
    no_raw_candidates: true,
    no_approved_records: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_commands: true,
  },
};
assertAdminReviewDecisionLogStatusCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertAdminReviewDecisionLogStatusCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("admin review decision log status CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!ADMIN_REVIEW_DECISION_LOG_STATUS_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`admin review decision log status CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_admin_review_decision_log_status_cli_v1"
  ) {
    throw new Error("admin review decision log status CLI status mismatch");
  }
  for (const field of ADMIN_REVIEW_DECISION_LOG_STATUS_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`admin review decision log status CLI boundary flag failed: ${field}`);
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
    throw new Error(`admin review decision log status CLI leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
