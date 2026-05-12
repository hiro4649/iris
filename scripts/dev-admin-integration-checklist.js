import {
  assertAdminIntegrationChecklistSafe,
  createAdminIntegrationChecklist,
} from "../src/services/dev/adminIntegrationChecklist.js";

const ADMIN_INTEGRATION_CHECKLIST_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "admin_integration_checklist",
  "boundary_policy",
]);
const ADMIN_INTEGRATION_CHECKLIST_CLI_BOUNDARY_FIELDS = [
  "read_only_cli",
  "env_names_and_counts_only",
  "script_names_only",
  "fixed_status_labels_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_connection_values",
  "no_live_payloads",
  "no_viewer_messages",
  "no_support_message_text",
  "no_memory_records",
  "no_relationship_records",
  "no_hidden_relationship_scores",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
  "no_raw_voice_samples",
  "no_dataset_paths",
  "no_internal_model_paths",
  "no_raw_jobs",
  "no_real_process_started",
  "no_database_connection_attempted",
  "no_game_or_os_input",
];

const report = createAdminIntegrationChecklist();
assertAdminIntegrationChecklistSafe(report, "admin integration checklist CLI");

const cliReport = {
  ok: true,
  schema: "iris_admin_integration_checklist_cli_v1",
  admin_integration_checklist: report,
  boundary_policy: {
    read_only_cli: true,
    env_names_and_counts_only: true,
    script_names_only: true,
    fixed_status_labels_only: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_connection_values: true,
    no_live_payloads: true,
    no_viewer_messages: true,
    no_support_message_text: true,
    no_memory_records: true,
    no_relationship_records: true,
    no_hidden_relationship_scores: true,
    no_candidates: true,
    no_commands: true,
    no_raw_frames: true,
    no_raw_voice_samples: true,
    no_dataset_paths: true,
    no_internal_model_paths: true,
    no_raw_jobs: true,
    no_real_process_started: true,
    no_database_connection_attempted: true,
    no_game_or_os_input: true,
  },
};
assertAdminIntegrationChecklistCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertAdminIntegrationChecklistCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("admin integration checklist CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!ADMIN_INTEGRATION_CHECKLIST_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`admin integration checklist CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_admin_integration_checklist_cli_v1"
  ) {
    throw new Error("admin integration checklist CLI status mismatch");
  }
  for (const field of ADMIN_INTEGRATION_CHECKLIST_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`admin integration checklist CLI boundary flag failed: ${field}`);
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
    throw new Error(`admin integration checklist CLI leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
