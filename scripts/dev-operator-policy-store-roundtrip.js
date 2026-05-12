import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertJsonOperatorPolicyStoreStatusSafe,
  assertOperatorPolicyPublicSummarySafe,
  createApprovedOperatorPolicyRecord,
  createJsonOperatorPolicyStore,
} from "../src/services/persistence/operatorPolicyStore.js";

const OPERATOR_POLICY_STORE_ROUNDTRIP_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "operator_policy_public_summary",
  "operator_policy_store_status",
  "boundary_policy",
]);
const OPERATOR_POLICY_STORE_ROUNDTRIP_CLI_BOUNDARY_FIELDS = [
  "temp_store_only",
  "public_summary_only",
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

const tempDir = mkdtempSync(join(tmpdir(), "iris-operator-policy-store-"));
try {
  const store = createJsonOperatorPolicyStore(join(tempDir, "operator-policy.json"));
  const publicSummary = store.upsertApproved(
    createApprovedOperatorPolicyRecord({
      settingId: "donation_amount_proportional_formula",
      settingGroup: "relationship_delta",
      policyVersion: "v1",
      policyConfig: {
        formula_id: "bounded_amount_proportional_growth",
        amount_basis: "support_amount_tier",
        cap_policy: "per_event_stream_day_window",
      },
      summaryLabel: "donation relationship formula configured",
      committedAtMs: 1000,
    })
  );
  const status = store.status();
  assertOperatorPolicyPublicSummarySafe(publicSummary);
  assertJsonOperatorPolicyStoreStatusSafe(status);
  const cliReport = {
    ok: true,
    schema: "iris_operator_policy_store_roundtrip_cli_v1",
    operator_policy_public_summary: publicSummary,
    operator_policy_store_status: status,
    boundary_policy: {
      temp_store_only: true,
      public_summary_only: true,
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
  assertOperatorPolicyStoreRoundtripCliReportSafe(cliReport);
  process.stdout.write(`${JSON.stringify(cliReport, null, 2)}\n`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function assertOperatorPolicyStoreRoundtripCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("operator policy store roundtrip CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!OPERATOR_POLICY_STORE_ROUNDTRIP_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`operator policy store roundtrip CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_operator_policy_store_roundtrip_cli_v1"
  ) {
    throw new Error("operator policy store roundtrip CLI status mismatch");
  }
  for (const field of OPERATOR_POLICY_STORE_ROUNDTRIP_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`operator policy store roundtrip CLI boundary flag failed: ${field}`);
    }
  }
}
