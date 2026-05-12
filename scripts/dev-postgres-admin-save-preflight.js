import {
  assertPostgresAdminSavePreflightReportSafe,
  createPostgresAdminSavePreflightReport,
} from "../src/services/dev/postgresAdminSavePreflight.js";

const POSTGRES_ADMIN_SAVE_PREFLIGHT_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "postgres_admin_save_preflight",
  "boundary_policy",
]);
const POSTGRES_ADMIN_SAVE_PREFLIGHT_CLI_BOUNDARY_FIELDS = [
  "cli_wrapper_only",
  "preflight_only",
  "env_names_and_booleans_only",
  "no_secret_values",
  "no_connection_values",
  "no_endpoint_values",
  "no_store_path_values",
  "no_sql_statements",
  "no_policy_payloads",
  "no_policy_numeric_values",
  "no_candidates",
  "no_commands",
  "no_db_connection_attempted",
  "no_pool_created",
];

const report = createPostgresAdminSavePreflightReport({
  env: process.env,
  generatedAtMs: 1000,
});
assertPostgresAdminSavePreflightReportSafe(report);

const cliReport = {
  ok: true,
  schema: "iris_postgres_admin_save_preflight_cli_v1",
  postgres_admin_save_preflight: report,
  boundary_policy: {
    cli_wrapper_only: true,
    preflight_only: true,
    env_names_and_booleans_only: true,
    no_secret_values: true,
    no_connection_values: true,
    no_endpoint_values: true,
    no_store_path_values: true,
    no_sql_statements: true,
    no_policy_payloads: true,
    no_policy_numeric_values: true,
    no_candidates: true,
    no_commands: true,
    no_db_connection_attempted: true,
    no_pool_created: true,
  },
};
assertPostgresAdminSavePreflightCliReportSafe(cliReport);
process.stdout.write(`${JSON.stringify(cliReport, null, 2)}\n`);

function assertPostgresAdminSavePreflightCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("postgres admin save preflight CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!POSTGRES_ADMIN_SAVE_PREFLIGHT_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`postgres admin save preflight CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_postgres_admin_save_preflight_cli_v1"
  ) {
    throw new Error("postgres admin save preflight CLI status mismatch");
  }
  for (const field of POSTGRES_ADMIN_SAVE_PREFLIGHT_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`postgres admin save preflight CLI boundary flag failed: ${field}`);
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
    throw new Error(`postgres admin save preflight CLI leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
