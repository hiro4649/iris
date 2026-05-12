import {
  assertYouTubeIngestLocalEnvProfileSafe,
  createYouTubeIngestLocalEnvProfile,
  renderYouTubeIngestLocalEnvTemplate,
} from "../src/services/dev/youtubeIngestLocalEnvProfile.js";

const YOUTUBE_INGEST_LOCAL_ENV_PROFILE_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "youtube_ingest_local_env_profile",
  "boundary_policy",
]);

if (process.argv.includes("--print-env")) {
  process.stdout.write(renderYouTubeIngestLocalEnvTemplate());
} else {
  const youtubeIngestLocalEnvProfile = createYouTubeIngestLocalEnvProfile();
  assertYouTubeIngestLocalEnvProfileSafe(
    youtubeIngestLocalEnvProfile,
    "YouTube ingest local env profile CLI"
  );
  const cliReport = {
    ok: true,
    schema: "iris_youtube_ingest_local_env_profile_cli_v1",
    youtube_ingest_local_env_profile: youtubeIngestLocalEnvProfile,
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      source_modes_only: true,
      operator_labels_only: true,
      no_env_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_platform_cursor_values: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_cli: true,
      print_env_requires_explicit_cli_flag: true,
    },
  };
  assertYouTubeIngestLocalEnvProfileCliReportSafe(cliReport);

  console.log(JSON.stringify(cliReport, null, 2));
}

function assertYouTubeIngestLocalEnvProfileCliReportSafe(cliReport) {
  if (
    !cliReport ||
    cliReport.ok !== true ||
    cliReport.schema !== "iris_youtube_ingest_local_env_profile_cli_v1"
  ) {
    throw new Error("YouTube ingest local env profile CLI report mismatch");
  }
  for (const field of Object.keys(cliReport)) {
    if (!YOUTUBE_INGEST_LOCAL_ENV_PROFILE_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(
        `YouTube ingest local env profile CLI unexpected report field: ${field}`
      );
    }
  }
  const serialized = JSON.stringify(cliReport);
  if (serialized.includes('"event_id"') || serialized.includes('"trace_id"')) {
    throw new Error("YouTube ingest local env profile CLI exposed platform event id");
  }
  assertYouTubeIngestLocalEnvProfileSafe(
    cliReport.youtube_ingest_local_env_profile,
    "YouTube ingest local env profile CLI report"
  );
  for (const field of [
    "env_names_only",
    "script_names_only",
    "source_modes_only",
    "operator_labels_only",
    "no_env_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_platform_cursor_values",
    "no_live_payloads",
    "no_support_message_text",
    "no_payloads",
    "no_candidates",
    "no_commands",
    "read_only_cli",
    "print_env_requires_explicit_cli_flag",
  ]) {
    if (cliReport.boundary_policy?.[field] !== true) {
      throw new Error(`YouTube ingest local env profile CLI boundary failed: ${field}`);
    }
  }
}
