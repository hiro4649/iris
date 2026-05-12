import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertOperatorPolicyAdminSaveGateSafe,
  createOperatorPolicyAdminSaveGate,
} from "../src/services/dev/operatorPolicyAdminSaveGate.js";
import {
  assertJsonOperatorPolicyStoreStatusSafe,
  createJsonOperatorPolicyStore,
} from "../src/services/persistence/operatorPolicyStore.js";
import {
  assertOperatorPolicyAuditLogStatusSafe,
  createJsonOperatorPolicyAuditLog,
} from "../src/services/persistence/operatorPolicyAuditLog.js";

const OPERATOR_POLICY_SAVE_GATE_ROUNDTRIP_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "operator_policy_admin_save_gate",
  "operator_policy_store_status",
  "operator_policy_audit_status",
  "boundary_policy",
]);
const OPERATOR_POLICY_SAVE_GATE_ROUNDTRIP_CLI_BOUNDARY_FIELDS = [
  "temp_store_only",
  "authenticated_gate_required",
  "public_summaries_only",
  "no_postgres_write",
  "no_policy_payloads",
  "no_policy_numeric_values",
  "no_secret_values",
  "no_endpoint_values",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
];

const tempDir = mkdtempSync(join(tmpdir(), "iris-operator-policy-save-gate-"));
try {
  const policyStore = createJsonOperatorPolicyStore(join(tempDir, "policy.json"));
  const auditLog = createJsonOperatorPolicyAuditLog(join(tempDir, "audit.json"));
  const gate = createOperatorPolicyAdminSaveGate({
    body: {
      setting_id: "donation_amount_proportional_formula",
      setting_group: "relationship_delta",
      policy_version: "v1",
      policy_config: {
        formula_id: "bounded_amount_proportional_growth",
        amount_basis: "support_amount_tier",
        cap_policy: "per_event_stream_day_window",
      },
      summary_label: "operator policy saved",
    },
    authContext: { admin_authenticated: true },
    policyStore,
    auditLog,
    generatedAtMs: 1000,
  });
  assertOperatorPolicyAdminSaveGateSafe(gate);
  const storeStatus = policyStore.status();
  const auditStatus = auditLog.status();
  assertJsonOperatorPolicyStoreStatusSafe(
    storeStatus,
    "operator policy save gate roundtrip store status"
  );
  assertOperatorPolicyAuditLogStatusSafe(
    auditStatus,
    "operator policy save gate roundtrip audit status"
  );
  const cliReport = {
    ok: true,
    schema: "iris_operator_policy_save_gate_roundtrip_cli_v1",
    operator_policy_admin_save_gate: gate,
    operator_policy_store_status: storeStatus,
    operator_policy_audit_status: auditStatus,
    boundary_policy: {
      temp_store_only: true,
      authenticated_gate_required: true,
      public_summaries_only: true,
      no_postgres_write: true,
      no_policy_payloads: true,
      no_policy_numeric_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
    },
  };
  assertOperatorPolicySaveGateRoundtripCliReportSafe(cliReport);
  process.stdout.write(`${JSON.stringify(cliReport, null, 2)}\n`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function assertOperatorPolicySaveGateRoundtripCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("operator policy save gate roundtrip CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!OPERATOR_POLICY_SAVE_GATE_ROUNDTRIP_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`operator policy save gate roundtrip CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_operator_policy_save_gate_roundtrip_cli_v1"
  ) {
    throw new Error("operator policy save gate roundtrip CLI status mismatch");
  }
  for (const field of OPERATOR_POLICY_SAVE_GATE_ROUNDTRIP_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`operator policy save gate roundtrip CLI boundary flag failed: ${field}`);
    }
  }
}
