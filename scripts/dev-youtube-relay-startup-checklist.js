import {
  assertYouTubeRelayStartupChecklistSafe,
  createYouTubeRelayStartupChecklist,
} from "../src/services/dev/youtubeRelayStartupChecklist.js";

const YOUTUBE_RELAY_STARTUP_CHECKLIST_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "youtube_relay_startup_checklist",
  "boundary_policy",
]);

const checklist = createYouTubeRelayStartupChecklist();
assertYouTubeRelayStartupChecklistSafe(checklist, "YouTube relay startup checklist CLI");
const cliReport = {
  ok: true,
  schema: "iris_youtube_relay_startup_checklist_cli_v1",
  youtube_relay_startup_checklist: checklist,
  boundary_policy: {
    local_relay_only: true,
    env_names_only: true,
    script_names_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_support_message_text: true,
    no_candidates: true,
    no_commands: true,
    read_only_cli: true,
  },
};
assertYouTubeRelayStartupChecklistCliReportSafe(cliReport);

console.log(JSON.stringify(cliReport, null, 2));

function assertYouTubeRelayStartupChecklistCliReportSafe(cliReport) {
  if (
    !cliReport ||
    cliReport.ok !== true ||
    cliReport.schema !== "iris_youtube_relay_startup_checklist_cli_v1"
  ) {
    throw new Error("YouTube relay startup checklist CLI report mismatch");
  }
  for (const field of Object.keys(cliReport)) {
    if (!YOUTUBE_RELAY_STARTUP_CHECKLIST_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`YouTube relay startup checklist CLI unexpected report field: ${field}`);
    }
  }
  const serialized = JSON.stringify(cliReport);
  if (serialized.includes('"event_id"') || serialized.includes('"trace_id"')) {
    throw new Error("YouTube relay startup checklist CLI exposed platform event id");
  }
  assertYouTubeRelayStartupChecklistSafe(
    cliReport.youtube_relay_startup_checklist,
    "YouTube relay startup checklist CLI report"
  );
  for (const field of [
    "local_relay_only",
    "env_names_only",
    "script_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_support_message_text",
    "no_candidates",
    "no_commands",
    "read_only_cli",
  ]) {
    if (cliReport.boundary_policy?.[field] !== true) {
      throw new Error(`YouTube relay startup checklist CLI boundary failed: ${field}`);
    }
  }
}
