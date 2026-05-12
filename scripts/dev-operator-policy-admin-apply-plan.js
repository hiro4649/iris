import {
  assertOperatorPolicyAdminApplyPlanSafe,
  createOperatorPolicyAdminApplyPlan,
} from "../src/services/dev/operatorPolicyAdminApplyPlan.js";

const OPERATOR_POLICY_ADMIN_APPLY_PLAN_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "operator_policy_admin_apply_plan",
  "boundary_policy",
]);
const OPERATOR_POLICY_ADMIN_APPLY_PLAN_CLI_BOUNDARY_FIELDS = [
  "dry_run_only",
  "no_store_write",
  "no_postgres_write",
  "no_policy_payloads",
  "no_policy_numeric_values",
  "no_secret_values",
  "no_endpoint_values",
  "no_support_message_text",
  "no_hidden_relationship_scores",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
];

const plan = createOperatorPolicyAdminApplyPlan({
  body: {
    dry_run: true,
    setting_id: "donation_amount_proportional_formula",
    setting_group: "relationship_delta",
    policy_version: "v1",
    policy_config: {
      formula_id: "bounded_amount_proportional_growth",
      amount_basis: "support_amount_tier",
      cap_policy: "per_event_stream_day_window",
    },
    summary_label: "operator policy dry run validated",
  },
});
assertOperatorPolicyAdminApplyPlanSafe(plan);

const cliReport = {
  ok: true,
  schema: "iris_operator_policy_admin_apply_plan_cli_v1",
  operator_policy_admin_apply_plan: plan,
  boundary_policy: {
    dry_run_only: true,
    no_store_write: true,
    no_postgres_write: true,
    no_policy_payloads: true,
    no_policy_numeric_values: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_support_message_text: true,
    no_hidden_relationship_scores: true,
    no_candidates: true,
    no_commands: true,
    no_raw_frames: true,
  },
};
assertOperatorPolicyAdminApplyPlanCliReportSafe(cliReport);
process.stdout.write(`${JSON.stringify(cliReport, null, 2)}\n`);

function assertOperatorPolicyAdminApplyPlanCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("operator policy admin apply plan CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!OPERATOR_POLICY_ADMIN_APPLY_PLAN_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`operator policy admin apply plan CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_operator_policy_admin_apply_plan_cli_v1"
  ) {
    throw new Error("operator policy admin apply plan CLI status mismatch");
  }
  for (const field of OPERATOR_POLICY_ADMIN_APPLY_PLAN_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`operator policy admin apply plan CLI boundary flag failed: ${field}`);
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
    throw new Error(`operator policy admin apply plan CLI leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
