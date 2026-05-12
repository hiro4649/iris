import {
  assertYouTubeIngestEnvSetupPlanSafe,
  createYouTubeIngestEnvSetupPlan,
} from "../src/services/dev/youtubeIngestEnvSetupPlan.js";

const YOUTUBE_INGEST_ENV_SETUP_PLAN_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "youtube_ingest_env_setup_plan",
  "boundary_policy",
]);

const youtubeEnvSetupPlan = createYouTubeIngestEnvSetupPlan();
assertYouTubeIngestEnvSetupPlanSafe(
  youtubeEnvSetupPlan,
  "youtube ingest env setup plan CLI"
);
const cliReport = {
  ok: true,
  schema: "iris_youtube_ingest_env_setup_plan_cli_v1",
  youtube_ingest_env_setup_plan: youtubeEnvSetupPlan,
  boundary_policy: {
    env_names_only: true,
    script_names_only: true,
    schema_names_only: true,
    fixed_ids_statuses_and_counts_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_platform_cursor_values: true,
    no_live_payloads: true,
    no_support_message_text: true,
    no_payloads: true,
    no_candidates: true,
    no_commands: true,
    read_only_cli: true,
  },
};
assertYouTubeIngestEnvSetupPlanCliReportSafe(cliReport);

console.log(JSON.stringify(cliReport, null, 2));

function assertYouTubeIngestEnvSetupPlanCliReportSafe(cliReport) {
  if (
    !cliReport ||
    cliReport.ok !== true ||
    cliReport.schema !== "iris_youtube_ingest_env_setup_plan_cli_v1"
  ) {
    throw new Error("youtube ingest env setup plan CLI report mismatch");
  }
  for (const field of Object.keys(cliReport)) {
    if (!YOUTUBE_INGEST_ENV_SETUP_PLAN_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(
        `youtube ingest env setup plan CLI unexpected report field: ${field}`
      );
    }
  }
  const serialized = JSON.stringify(cliReport);
  if (serialized.includes('"event_id"') || serialized.includes('"trace_id"')) {
    throw new Error("youtube ingest env setup plan CLI exposed platform event id");
  }
  assertYouTubeIngestEnvSetupPlanSafe(
    cliReport.youtube_ingest_env_setup_plan,
    "youtube ingest env setup plan CLI report"
  );
  for (const field of [
    "env_names_only",
    "script_names_only",
    "schema_names_only",
    "fixed_ids_statuses_and_counts_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_platform_cursor_values",
    "no_live_payloads",
    "no_support_message_text",
    "no_payloads",
    "no_candidates",
    "no_commands",
    "read_only_cli",
  ]) {
    if (cliReport.boundary_policy?.[field] !== true) {
      throw new Error(`youtube ingest env setup plan CLI boundary failed: ${field}`);
    }
  }
}
