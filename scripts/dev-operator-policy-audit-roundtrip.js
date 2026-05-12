import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertOperatorPolicyAuditLogStatusSafe,
  createJsonOperatorPolicyAuditLog,
  createOperatorPolicyAuditEntry,
} from "../src/services/persistence/operatorPolicyAuditLog.js";

const OPERATOR_POLICY_AUDIT_ROUNDTRIP_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "operator_policy_audit_public_entry",
  "operator_policy_audit_status",
  "boundary_policy",
]);
const OPERATOR_POLICY_AUDIT_ROUNDTRIP_CLI_BOUNDARY_FIELDS = [
  "temp_store_only",
  "no_audit_payloads",
  "no_policy_payloads",
  "no_policy_numeric_values",
  "no_secret_values",
  "no_endpoint_values",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
];

const tempDir = mkdtempSync(join(tmpdir(), "iris-operator-policy-audit-"));
try {
  const auditLog = createJsonOperatorPolicyAuditLog(join(tempDir, "audit.json"));
  const publicEntry = auditLog.append(
    createOperatorPolicyAuditEntry({
      eventId: "operator_policy_audit_fixture",
      settingId: "donation_amount_proportional_formula",
      settingGroup: "relationship_delta",
      policyVersion: "v1",
      policyDigest: "sha256:29cb7aa8d59d0f241facdeb8",
      decision: "validated",
      actorRole: "owner",
      ownerConfirmed: true,
      eventAtMs: 1000,
    })
  );
  const status = auditLog.status();
  assertOperatorPolicyAuditLogStatusSafe(status);
  assertOperatorPolicyAuditPublicEntrySafe(publicEntry);
  const cliReport = {
    ok: true,
    schema: "iris_operator_policy_audit_roundtrip_cli_v1",
    operator_policy_audit_public_entry: publicEntry,
    operator_policy_audit_status: status,
    boundary_policy: {
      temp_store_only: true,
      no_audit_payloads: true,
      no_policy_payloads: true,
      no_policy_numeric_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
    },
  };
  assertOperatorPolicyAuditRoundtripCliReportSafe(cliReport);
  process.stdout.write(`${JSON.stringify(cliReport, null, 2)}\n`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function assertOperatorPolicyAuditRoundtripCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("operator policy audit roundtrip CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!OPERATOR_POLICY_AUDIT_ROUNDTRIP_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`operator policy audit roundtrip CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_operator_policy_audit_roundtrip_cli_v1"
  ) {
    throw new Error("operator policy audit roundtrip CLI status mismatch");
  }
  for (const field of OPERATOR_POLICY_AUDIT_ROUNDTRIP_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`operator policy audit roundtrip CLI boundary flag failed: ${field}`);
    }
  }
}

function assertOperatorPolicyAuditPublicEntrySafe(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error("operator policy audit public entry missing");
  }
  if (
    entry.schema !== "iris_operator_policy_audit_public_summary_v1" ||
    entry.policy_payload_hidden !== true
  ) {
    throw new Error("operator policy audit public entry status mismatch");
  }
  for (const field of [
    "no_audit_payloads",
    "no_policy_payloads",
    "no_policy_numeric_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_candidates",
    "no_commands",
    "no_raw_frames",
  ]) {
    if (entry.boundary_policy?.[field] !== true) {
      throw new Error(`operator policy audit public entry boundary flag failed: ${field}`);
    }
  }
}
