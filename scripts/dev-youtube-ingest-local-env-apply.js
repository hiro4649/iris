import {
  assertYouTubeIngestLocalEnvApplyPlanSafe,
  createYouTubeIngestLocalEnvApplyPlan,
} from "../src/services/dev/youtubeIngestLocalEnvApplyPlan.js";

const YOUTUBE_INGEST_LOCAL_ENV_APPLY_PLAN_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "youtube_ingest_local_env_apply_plan",
  "boundary_policy",
]);

const applyMode = process.argv.includes("--materialize") ? "materialize" : "dry_run";
const plan = createYouTubeIngestLocalEnvApplyPlan({ applyMode });
assertYouTubeIngestLocalEnvApplyPlanSafe(plan, "YouTube ingest local env apply CLI");
const cliReport = {
  ok: true,
  schema: "iris_youtube_ingest_local_env_apply_plan_cli_v1",
  youtube_ingest_local_env_apply_plan: plan,
  boundary_policy: {
    env_names_only: true,
    env_counts_only: true,
    file_names_only: true,
    script_names_only: true,
    no_env_values: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_platform_cursor_values: true,
    no_live_payloads: true,
    no_support_message_text: true,
    no_payloads: true,
    no_candidates: true,
    no_commands: true,
    no_template_text: true,
    materialization_requires_explicit_cli_flag: true,
    read_only_when_dry_run: applyMode === "dry_run",
  },
};
assertYouTubeIngestLocalEnvApplyPlanCliReportSafe(cliReport);

console.log(JSON.stringify(cliReport, null, 2));

function assertYouTubeIngestLocalEnvApplyPlanCliReportSafe(cliReport) {
  if (
    !cliReport ||
    cliReport.ok !== true ||
    cliReport.schema !== "iris_youtube_ingest_local_env_apply_plan_cli_v1"
  ) {
    throw new Error("YouTube ingest local env apply CLI report mismatch");
  }
  for (const field of Object.keys(cliReport)) {
    if (!YOUTUBE_INGEST_LOCAL_ENV_APPLY_PLAN_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(
        `YouTube ingest local env apply CLI unexpected report field: ${field}`
      );
    }
  }
  const serialized = JSON.stringify(cliReport);
  if (serialized.includes('"event_id"') || serialized.includes('"trace_id"')) {
    throw new Error("YouTube ingest local env apply CLI exposed platform event id");
  }
  assertYouTubeIngestLocalEnvApplyPlanSafe(
    cliReport.youtube_ingest_local_env_apply_plan,
    "YouTube ingest local env apply CLI report"
  );
  for (const field of [
    "env_names_only",
    "env_counts_only",
    "file_names_only",
    "script_names_only",
    "no_env_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_platform_cursor_values",
    "no_live_payloads",
    "no_support_message_text",
    "no_payloads",
    "no_candidates",
    "no_commands",
    "no_template_text",
    "materialization_requires_explicit_cli_flag",
  ]) {
    if (cliReport.boundary_policy?.[field] !== true) {
      throw new Error(`YouTube ingest local env apply CLI boundary failed: ${field}`);
    }
  }
  if (applyMode === "dry_run" && cliReport.boundary_policy.read_only_when_dry_run !== true) {
    throw new Error("YouTube ingest local env apply dry-run boundary failed");
  }
}
