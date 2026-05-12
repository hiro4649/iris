import {
  assertAdminReviewAuthGateSafe,
  createAdminReviewAuthGateReport,
} from "../src/services/dev/adminReviewAuthGate.js";

const ADMIN_REVIEW_AUTH_GATE_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "admin_review_auth_gate",
  "boundary_policy",
]);
const ADMIN_REVIEW_AUTH_GATE_CLI_BOUNDARY_FIELDS = [
  "read_only_cli",
  "auth_status_only",
  "env_names_only",
  "no_raw_candidates",
  "no_approved_records",
  "no_memory_or_relationship_store_write",
  "no_private_runner_call",
  "no_validator_execution",
  "no_validator_commit",
  "no_endpoint_values",
  "no_secret_values",
  "no_commands",
  "no_game_or_os_input",
];

const report = createAdminReviewAuthGateReport({
  actorRole: process.env.IRIS_ADMIN_REVIEW_ACTOR_ROLE ?? "operator",
});

assertAdminReviewAuthGateSafe(report, "admin review auth gate CLI");

const cliReport = {
  ok: true,
  schema: "iris_admin_review_auth_gate_cli_v1",
  admin_review_auth_gate: report,
  boundary_policy: {
    read_only_cli: true,
    auth_status_only: true,
    env_names_only: true,
    no_raw_candidates: true,
    no_approved_records: true,
    no_memory_or_relationship_store_write: true,
    no_private_runner_call: true,
    no_validator_execution: true,
    no_validator_commit: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_commands: true,
    no_game_or_os_input: true,
  },
};
assertAdminReviewAuthGateCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertAdminReviewAuthGateCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("admin review auth gate CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!ADMIN_REVIEW_AUTH_GATE_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`admin review auth gate CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_admin_review_auth_gate_cli_v1"
  ) {
    throw new Error("admin review auth gate CLI status mismatch");
  }
  for (const field of ADMIN_REVIEW_AUTH_GATE_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`admin review auth gate CLI boundary flag failed: ${field}`);
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
    throw new Error(`admin review auth gate CLI leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
