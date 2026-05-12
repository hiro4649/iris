import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertOperatorPolicyAdminAsyncSaveGateSafe,
  createOperatorPolicyAdminAsyncSaveGate,
} from "./operatorPolicyAdminAsyncSaveGate.js";
import {
  assertMockPostgresPersistenceStatusSafe,
  createMockPostgresPersistenceAdapter,
} from "../persistence/mockPostgresPersistenceAdapter.js";
import {
  assertOperatorPolicyAuditLogStatusSafe,
  createJsonOperatorPolicyAuditLog,
} from "../persistence/operatorPolicyAuditLog.js";
import {
  assertJsonOperatorPolicyStoreStatusSafe,
  createJsonOperatorPolicyStore,
} from "../persistence/operatorPolicyStore.js";

const OPERATOR_POLICY_ASYNC_SAVE_GATE_ROUNDTRIP_FIELDS = new Set([
  "ok",
  "schema",
  "roundtrip_positioning",
  "operator_policy_admin_async_save_gate",
  "operator_policy_store_status",
  "operator_policy_audit_status",
  "mock_postgres_status",
  "boundary_policy",
]);

export async function createOperatorPolicyAsyncSaveGateRoundtripCliReport({
  tempRoot = tmpdir(),
  generatedAtMs = 1000,
} = {}) {
  const tempDir = mkdtempSync(join(tempRoot, "iris-operator-policy-async-save-gate-"));
  try {
    const policyStore = createJsonOperatorPolicyStore(join(tempDir, "policy.json"));
    const auditLog = createJsonOperatorPolicyAuditLog(join(tempDir, "audit.jsonl"));
    const postgresAdapter = createMockPostgresPersistenceAdapter();
    const gate = await createOperatorPolicyAdminAsyncSaveGate({
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
      postgresAdapter,
      postgresWriteEnabled: true,
      generatedAtMs,
    });
    assertOperatorPolicyAdminAsyncSaveGateSafe(gate);
    const storeStatus = policyStore.status();
    const auditStatus = auditLog.status();
    const mockPostgresStatus = postgresAdapter.status();
    assertJsonOperatorPolicyStoreStatusSafe(
      storeStatus,
      "operator policy async save gate roundtrip store status"
    );
    assertOperatorPolicyAuditLogStatusSafe(
      auditStatus,
      "operator policy async save gate roundtrip audit status"
    );
    assertMockPostgresPersistenceStatusSafe(
      mockPostgresStatus,
      "operator policy async save gate roundtrip mock postgres status"
    );
    const report = {
      ok: true,
      schema: "iris_operator_policy_async_save_gate_roundtrip_cli_v1",
      roundtrip_positioning: {
        schema: "iris_operator_policy_async_save_gate_roundtrip_positioning_v1",
        follows_preflight_script:
          "npm run dev:persistence:postgres-admin-save-preflight",
        roundtrip_script:
          "npm run dev:operator-policy:async-save-gate-roundtrip",
        verification_scope: "mock_postgres_admin_async_save_gate",
        real_database_connection_attempted: false,
        real_postgres_pool_created: false,
        preflight_guidance_compatible: true,
      },
      operator_policy_admin_async_save_gate: gate,
      operator_policy_store_status: storeStatus,
      operator_policy_audit_status: auditStatus,
      mock_postgres_status: mockPostgresStatus,
      boundary_policy: {
        temp_store_only: true,
        script_names_only: true,
        authenticated_gate_required: true,
        explicit_postgres_enablement_required: true,
        mock_postgres_only: true,
        public_summaries_only: true,
        no_policy_payloads: true,
        no_policy_numeric_values: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_candidates: true,
        no_commands: true,
        no_raw_frames: true,
      },
    };
    assertOperatorPolicyAsyncSaveGateRoundtripCliReportSafe(report);
    return report;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export function assertOperatorPolicyAsyncSaveGateRoundtripCliReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("operator policy async save gate roundtrip CLI report required");
  }
  if (report.schema !== "iris_operator_policy_async_save_gate_roundtrip_cli_v1") {
    throw new Error("invalid operator policy async save gate roundtrip CLI schema");
  }
  if (report.ok !== true) {
    throw new Error("operator policy async save gate roundtrip CLI report must be ok");
  }
  for (const field of Object.keys(report)) {
    if (!OPERATOR_POLICY_ASYNC_SAVE_GATE_ROUNDTRIP_FIELDS.has(field)) {
      throw new Error(`unexpected operator policy async save gate roundtrip field ${field}`);
    }
  }
  const positioning = report.roundtrip_positioning;
  if (
    !positioning ||
    positioning.schema !==
      "iris_operator_policy_async_save_gate_roundtrip_positioning_v1" ||
    positioning.follows_preflight_script !==
      "npm run dev:persistence:postgres-admin-save-preflight" ||
    positioning.roundtrip_script !==
      "npm run dev:operator-policy:async-save-gate-roundtrip" ||
    positioning.verification_scope !== "mock_postgres_admin_async_save_gate" ||
    positioning.real_database_connection_attempted !== false ||
    positioning.real_postgres_pool_created !== false ||
    positioning.preflight_guidance_compatible !== true
  ) {
    throw new Error("invalid operator policy async save gate roundtrip positioning");
  }
  assertOperatorPolicyAdminAsyncSaveGateSafe(
    report.operator_policy_admin_async_save_gate,
  );
  assertBoundaryPolicy(report.boundary_policy, [
    "temp_store_only",
    "script_names_only",
    "authenticated_gate_required",
    "explicit_postgres_enablement_required",
    "mock_postgres_only",
    "public_summaries_only",
    "no_policy_payloads",
    "no_policy_numeric_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_candidates",
    "no_commands",
    "no_raw_frames",
  ]);
  const serialized = JSON.stringify(report);
  if (
    /postgres:\/\/|postgresql:\/\/|"policy_config"|input_action_candidate|world_command/i.test(
      serialized,
    )
  ) {
    throw new Error("unsafe operator policy async save gate CLI report");
  }
}

function assertBoundaryPolicy(policy, requiredFields) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error("operator policy async save gate boundary policy required");
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new Error(`unexpected operator policy async save gate boundary ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new Error(`operator policy async save gate boundary ${field} required`);
    }
  }
}
