import {
  assertAdminSafetyControlsReportSafe,
  createAdminSafetyControlsReport,
  createInMemoryAdminSafetyControlStore,
} from "../src/services/dev/adminSafetyControls.js";

const ADMIN_SAFETY_CONTROLS_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "admin_safety_controls",
  "boundary_policy",
]);
const ADMIN_SAFETY_CONTROLS_CLI_BOUNDARY_FIELDS = [
  "read_only_cli",
  "safe_control_state_only",
  "audit_summaries_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
  "no_real_device_operation",
  "no_game_or_os_input",
];

const store = createInMemoryAdminSafetyControlStore();
const report = createAdminSafetyControlsReport({ store });
assertAdminSafetyControlsReportSafe(report, "admin safety controls CLI");

const cliReport = {
  ok: true,
  schema: "iris_admin_safety_controls_cli_v1",
  admin_safety_controls: report,
  boundary_policy: {
    read_only_cli: true,
    safe_control_state_only: true,
    audit_summaries_only: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_payloads: true,
    no_candidates: true,
    no_commands: true,
    no_real_device_operation: true,
    no_game_or_os_input: true,
  },
};
assertAdminSafetyControlsCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertAdminSafetyControlsCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("admin safety controls CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!ADMIN_SAFETY_CONTROLS_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`admin safety controls CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_admin_safety_controls_cli_v1"
  ) {
    throw new Error("admin safety controls CLI status mismatch");
  }
  for (const field of ADMIN_SAFETY_CONTROLS_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`admin safety controls CLI boundary flag failed: ${field}`);
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
    throw new Error(`admin safety controls CLI leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
