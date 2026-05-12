import {
  createApprovedOperatorPolicyRecord,
  sanitizeOperatorPolicyRecordForPublicState,
} from "../src/services/persistence/operatorPolicyStore.js";
import {
  createOperatorPolicyAuditEntry,
  sanitizeOperatorPolicyAuditEntryForPublicState,
} from "../src/services/persistence/operatorPolicyAuditLog.js";
import {
  assertPostgresOperatorPolicyWritePlanSafe,
  createPostgresOperatorPolicyWritePlan,
} from "../src/services/persistence/postgresPersistenceAdapterContract.js";

const POSTGRES_OPERATOR_POLICY_WRITE_PLAN_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "postgres_operator_policy_write_plan",
  "public_policy_summary",
  "public_audit_summary",
  "boundary_policy",
]);
const POSTGRES_OPERATOR_POLICY_WRITE_PLAN_CLI_BOUNDARY_FIELDS = [
  "dry_run_only",
  "private_adapter_required",
  "no_db_connection_attempted",
  "no_sql_statements",
  "no_policy_payloads",
  "no_policy_numeric_values",
  "no_audit_payloads",
  "no_endpoint_values",
  "no_secret_values",
  "no_candidates",
  "no_commands",
];

const approvedRecord = createApprovedOperatorPolicyRecord({
  settingId: "donation_amount_proportional_formula",
  settingGroup: "relationship_delta",
  policyVersion: "v1",
  policyConfig: {
    formula_id: "bounded_amount_proportional_growth",
    amount_basis: "support_amount_tier",
    cap_policy: "per_event_stream_day_window",
  },
  summaryLabel: "operator policy saved",
  committedAtMs: 1000,
});

const auditEntry = createOperatorPolicyAuditEntry({
  eventId: "operator_policy_saved_event",
  settingId: approvedRecord.setting_id,
  settingGroup: approvedRecord.setting_group,
  policyVersion: approvedRecord.policy_version,
  policyDigest: approvedRecord.policy_digest,
  decision: "saved",
  actorRole: "owner",
  ownerConfirmed: true,
  eventAtMs: 1000,
});

const plan = createPostgresOperatorPolicyWritePlan(approvedRecord, auditEntry, {
  generatedAtMs: 1000,
});

assertPostgresOperatorPolicyWritePlanSafe(plan);

const cliReport = {
  ok: true,
  schema: "iris_postgres_operator_policy_write_plan_cli_v1",
  postgres_operator_policy_write_plan: plan,
  public_policy_summary: sanitizeOperatorPolicyRecordForPublicState(approvedRecord),
  public_audit_summary: sanitizeOperatorPolicyAuditEntryForPublicState(auditEntry),
  boundary_policy: {
    dry_run_only: true,
    private_adapter_required: true,
    no_db_connection_attempted: true,
    no_sql_statements: true,
    no_policy_payloads: true,
    no_policy_numeric_values: true,
    no_audit_payloads: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_candidates: true,
    no_commands: true,
  },
};
assertPostgresOperatorPolicyWritePlanCliReportSafe(cliReport);
process.stdout.write(`${JSON.stringify(cliReport, null, 2)}\n`);

function assertPostgresOperatorPolicyWritePlanCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("postgres operator policy write plan CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!POSTGRES_OPERATOR_POLICY_WRITE_PLAN_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`postgres operator policy write plan CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_postgres_operator_policy_write_plan_cli_v1"
  ) {
    throw new Error("postgres operator policy write plan CLI status mismatch");
  }
  for (const field of POSTGRES_OPERATOR_POLICY_WRITE_PLAN_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`postgres operator policy write plan CLI boundary flag failed: ${field}`);
    }
  }
}
