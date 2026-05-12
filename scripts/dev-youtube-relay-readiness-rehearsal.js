import {
  assertYouTubeRelayReadinessRehearsalSafe,
  createYouTubeRelayReadinessRehearsal,
} from "../src/services/dev/youtubeRelayReadinessRehearsal.js";

const YOUTUBE_RELAY_READINESS_REHEARSAL_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "youtube_relay_readiness_rehearsal",
  "boundary_policy",
]);
const YOUTUBE_RELAY_READINESS_REHEARSAL_CLI_BOUNDARY_FIELDS = [
  "local_fixture_source_only",
  "scheduler_tick_performed",
  "validation_gated_persistence",
  "no_endpoint_values",
  "no_secret_values",
  "no_youtube_text",
  "no_support_messages",
  "no_platform_ids",
  "no_local_path_values",
  "no_candidates",
  "no_commands",
  "read_only_cli",
];

const report = await createYouTubeRelayReadinessRehearsal();
assertYouTubeRelayReadinessRehearsalSafe(report);

const cliReport = {
  ok: true,
  schema: "iris_youtube_relay_readiness_rehearsal_cli_v1",
  youtube_relay_readiness_rehearsal: report,
  boundary_policy: {
    local_fixture_source_only: true,
    scheduler_tick_performed: true,
    validation_gated_persistence: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_youtube_text: true,
    no_support_messages: true,
    no_platform_ids: true,
    no_local_path_values: true,
    no_candidates: true,
    no_commands: true,
    read_only_cli: true,
  },
};
assertYouTubeRelayReadinessRehearsalCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertYouTubeRelayReadinessRehearsalCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("youtube relay readiness rehearsal CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!YOUTUBE_RELAY_READINESS_REHEARSAL_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(
        `youtube relay readiness rehearsal CLI unexpected report field ${field}`
      );
    }
  }
  const serialized = JSON.stringify(reportValue);
  if (serialized.includes('"event_id"') || serialized.includes('"trace_id"')) {
    throw new Error("youtube relay readiness rehearsal CLI exposed platform event id");
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_youtube_relay_readiness_rehearsal_cli_v1"
  ) {
    throw new Error("youtube relay readiness rehearsal CLI status mismatch");
  }
  for (const field of YOUTUBE_RELAY_READINESS_REHEARSAL_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(
        `youtube relay readiness rehearsal CLI boundary flag failed: ${field}`
      );
    }
  }
}
