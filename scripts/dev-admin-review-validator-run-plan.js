import { createJsonAdminReviewDecisionLog } from "../src/services/dev/adminReviewDecisionLog.js";
import {
  assertAdminReviewValidatorRunPlanSafe,
  createAdminReviewValidatorRunPlan,
} from "../src/services/dev/adminReviewValidatorRunPlan.js";

const ADMIN_REVIEW_VALIDATOR_RUN_PLAN_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "admin_review_validator_run_plan",
  "boundary_policy",
]);
const ADMIN_REVIEW_VALIDATOR_RUN_PLAN_CLI_BOUNDARY_FIELDS = [
  "read_only_cli",
  "dry_run_plan_only",
  "admin_authentication_required",
  "owner_confirmation_required",
  "decision_counts_only",
  "private_runner_input_not_materialized",
  "no_raw_candidates",
  "no_approved_records",
  "no_memory_or_relationship_store_write",
  "no_private_validator_call",
  "no_validator_execution",
  "no_validator_commit",
  "no_endpoint_values",
  "no_secret_values",
  "no_commands",
  "no_game_or_os_input",
];

const logPath = String(process.env.IRIS_ADMIN_REVIEW_DECISION_LOG_PATH ?? "").trim();
const decisionLog = logPath ? createJsonAdminReviewDecisionLog(logPath) : null;
const runPlan = createAdminReviewValidatorRunPlan({
  decisionLog,
  reviewItems: [],
  actorRole: process.env.IRIS_ADMIN_REVIEW_ACTOR_ROLE ?? "operator",
});

assertAdminReviewValidatorRunPlanSafe(runPlan, "admin review validator run plan CLI");

const cliReport = {
  ok: true,
  schema: "iris_admin_review_validator_run_plan_cli_v1",
  admin_review_validator_run_plan: runPlan,
  boundary_policy: {
    read_only_cli: true,
    dry_run_plan_only: true,
    admin_authentication_required: true,
    owner_confirmation_required: true,
    decision_counts_only: true,
    private_runner_input_not_materialized: true,
    no_raw_candidates: true,
    no_approved_records: true,
    no_memory_or_relationship_store_write: true,
    no_private_validator_call: true,
    no_validator_execution: true,
    no_validator_commit: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_commands: true,
    no_game_or_os_input: true,
  },
};
assertAdminReviewValidatorRunPlanCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertAdminReviewValidatorRunPlanCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("admin review validator run plan CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!ADMIN_REVIEW_VALIDATOR_RUN_PLAN_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`admin review validator run plan CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_admin_review_validator_run_plan_cli_v1"
  ) {
    throw new Error("admin review validator run plan CLI status mismatch");
  }
  for (const field of ADMIN_REVIEW_VALIDATOR_RUN_PLAN_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`admin review validator run plan CLI boundary flag failed: ${field}`);
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
    throw new Error(`admin review validator run plan CLI leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
