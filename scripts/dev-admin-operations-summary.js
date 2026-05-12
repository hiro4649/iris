import { fileURLToPath } from "node:url";
import {
  assertAdminOperationsSummarySafe,
  createAdminOperationsSummary,
} from "../src/services/dev/adminOperationsSummary.js";

const ADMIN_OPERATIONS_SUMMARY_CLI_FIELDS = new Set([
  "ok",
  "schema",
  "admin_operations_summary",
  "boundary_policy",
]);

const BOUNDARY_POLICY_FIELDS = new Set([
  "read_only_cli",
  "report_summaries_only",
  "script_names_and_route_paths_only",
  "env_names_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_connection_values",
  "no_policy_payloads",
  "no_policy_numeric_values",
  "no_live_payloads",
  "no_viewer_messages",
  "no_support_message_text",
  "no_memory_records",
  "no_relationship_records",
  "no_hidden_relationship_scores",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
  "no_real_process_started",
  "no_database_connection_attempted",
  "no_game_or_os_input",
]);

export async function createAdminOperationsSummaryCliReport(options = {}) {
  const report = await createAdminOperationsSummary(options);
  assertAdminOperationsSummarySafe(report, "admin operations summary CLI");
  const cliReport = {
    ok: true,
    schema: "iris_admin_operations_summary_cli_v1",
    admin_operations_summary: report,
    boundary_policy: {
      read_only_cli: true,
      report_summaries_only: true,
      script_names_and_route_paths_only: true,
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_connection_values: true,
      no_policy_payloads: true,
      no_policy_numeric_values: true,
      no_live_payloads: true,
      no_viewer_messages: true,
      no_support_message_text: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_hidden_relationship_scores: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_real_process_started: true,
      no_database_connection_attempted: true,
      no_game_or_os_input: true,
    },
  };
  assertAdminOperationsSummaryCliReportSafe(cliReport);
  return cliReport;
}

export function assertAdminOperationsSummaryCliReportSafe(
  report,
  context = "admin operations summary CLI report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error(`${context}: report must be an object`);
  }
  for (const field of Object.keys(report)) {
    if (!ADMIN_OPERATIONS_SUMMARY_CLI_FIELDS.has(field)) {
      throw new Error(`${context}: unexpected field ${field}`);
    }
  }
  if (report.ok !== true) {
    throw new Error(`${context}: ok must be true`);
  }
  if (report.schema !== "iris_admin_operations_summary_cli_v1") {
    throw new Error(`${context}: schema mismatch`);
  }
  assertAdminOperationsSummarySafe(
    report.admin_operations_summary,
    `${context}: admin operations summary`
  );
  assertBoundaryPolicy(report.boundary_policy, context);
  assertNoUnsafeReportLeak(report, context);
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!BOUNDARY_POLICY_FIELDS.has(field)) {
      throw new Error(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (policy[field] !== true) {
      throw new Error(`${context}: boundary policy ${field} must be true`);
    }
  }
}

function assertNoUnsafeReportLeak(report, context) {
  const serialized = JSON.stringify(report);
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
    throw new Error(`${context}: leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await createAdminOperationsSummaryCliReport();
  console.log(JSON.stringify(report, null, 2));
}
