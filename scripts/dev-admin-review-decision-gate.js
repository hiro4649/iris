import {
  applyAdminReviewQueueDecision,
  assertAdminReviewQueueDecisionResultSafe,
  assertAdminReviewQueueReportSafe,
  createAdminReviewQueueReport,
  createInMemoryAdminReviewDecisionStore,
} from "../src/services/dev/adminReviewQueue.js";

const ADMIN_REVIEW_DECISION_GATE_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "admin_review_queue",
  "admin_review_queue_decision_gate",
  "boundary_policy",
]);
const ADMIN_REVIEW_DECISION_GATE_CLI_BOUNDARY_FIELDS = [
  "decision_summary_only",
  "explicit_confirmation_required",
  "validator_handoff_only",
  "no_raw_candidates",
  "no_approved_records",
  "no_memory_or_relationship_store_write",
  "no_validator_commit",
  "no_endpoint_values",
  "no_secret_values",
  "no_commands",
  "no_game_or_os_input",
];

const store = createInMemoryAdminReviewDecisionStore();
const report = createAdminReviewQueueReport();
const blocked = applyAdminReviewQueueDecision({
  store,
  body: {
    action: "approve_memory_candidate",
    review_id: "missing_review",
  },
  reviewItems: [],
  actorRole: "operator",
  confirmed: true,
});
assertAdminReviewQueueReportSafe(report, "admin review decision gate CLI queue");
assertAdminReviewQueueDecisionResultSafe(
  blocked,
  "admin review decision gate CLI blocked decision"
);
if (
  blocked.decision_status !== "blocked" ||
  blocked.recorded !== false ||
  blocked.review_item_found !== false ||
  blocked.decision_store_write_performed !== false ||
  blocked.memory_store_write_performed !== false ||
  blocked.relationship_store_write_performed !== false ||
  blocked.validator_commit_performed !== false
) {
  throw new Error("admin review decision gate failed to block missing review");
}

const cliReport = {
  ok: true,
  schema: "iris_admin_review_decision_gate_cli_v1",
  admin_review_queue: report,
  admin_review_queue_decision_gate: blocked,
  boundary_policy: {
    decision_summary_only: true,
    explicit_confirmation_required: true,
    validator_handoff_only: true,
    no_raw_candidates: true,
    no_approved_records: true,
    no_memory_or_relationship_store_write: true,
    no_validator_commit: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_commands: true,
    no_game_or_os_input: true,
  },
};
assertAdminReviewDecisionGateCliReportSafe(cliReport);
assertNoUnsafeReportLeak(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertAdminReviewDecisionGateCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("admin review decision gate CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!ADMIN_REVIEW_DECISION_GATE_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`admin review decision gate CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_admin_review_decision_gate_cli_v1"
  ) {
    throw new Error("admin review decision gate CLI status mismatch");
  }
  assertAdminReviewQueueReportSafe(
    reportValue.admin_review_queue,
    "admin review decision gate CLI queue report"
  );
  assertAdminReviewQueueDecisionResultSafe(
    reportValue.admin_review_queue_decision_gate,
    "admin review decision gate CLI decision result"
  );
  for (const field of ADMIN_REVIEW_DECISION_GATE_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`admin review decision gate CLI boundary flag failed: ${field}`);
    }
  }
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
    throw new Error(`admin review decision gate CLI leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
