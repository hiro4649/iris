import { ContractError } from "../../core/contracts.js";
import {
  assertOperatorPolicyPublicSummarySafe,
  createApprovedOperatorPolicyRecord,
} from "../persistence/operatorPolicyStore.js";
import {
  assertOperatorPolicyAuditEntrySafe,
  createOperatorPolicyAuditEntry,
} from "../persistence/operatorPolicyAuditLog.js";
import { assertMockPostgresPersistenceResultSafe } from "../persistence/mockPostgresPersistenceAdapter.js";
import { assertPostgresPersistenceAdapterResultSafe } from "../persistence/postgresPersistenceAdapter.js";

const SCHEMA = "iris_operator_policy_admin_async_save_gate_v1";

const FORBIDDEN_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "policy_config",
  "candidate",
  "command",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "viewer_id",
  "display_name",
  "message_text",
  "support_message_text",
  "raw_frame",
  "ocr_text",
]);

const UNSAFE_TEXT_PATTERN =
  /\b(world_command|input_action|approved_game_input_action|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|raw[_-]?frame|ocr[_-]?text|candidate|command)\b|https?:\/\//i;
const OPERATOR_POLICY_ADMIN_ASYNC_SAVE_GATE_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "save_status",
  "setting_id",
  "setting_group",
  "policy_version",
  "policy_digest",
  "admin_authenticated",
  "owner_confirmation_required",
  "owner_confirmation_seen",
  "blocked_reasons",
  "store_write_performed",
  "audit_write_performed",
  "postgres_write_performed",
  "public_policy_summary",
  "public_audit_entry",
  "public_postgres_result",
  "boundary_policy",
]);

export async function createOperatorPolicyAdminAsyncSaveGate({
  body = {},
  authContext = {},
  policyStore = null,
  auditLog = null,
  postgresAdapter = null,
  postgresWriteEnabled = false,
  generatedAtMs = Date.now(),
} = {}) {
  const settingGroup = sanitizeSettingGroup(body?.setting_group);
  const ownerConfirmationRequired = settingGroup === "gameplay_control";
  const ownerConfirmed =
    String(body?.operator_confirmation ?? "").trim() === "owner_confirmed";
  const adminAuthenticated = authContext?.admin_authenticated === true;
  const storesAvailable =
    policyStore &&
    typeof policyStore.upsertApproved === "function" &&
    auditLog &&
    typeof auditLog.append === "function";

  const blockedReasons = [];
  if (!adminAuthenticated) blockedReasons.push("admin_authentication_required");
  if (ownerConfirmationRequired && !ownerConfirmed) {
    blockedReasons.push("owner_confirmation_required");
  }
  if (!storesAvailable) blockedReasons.push("operator_policy_stores_required");
  if (
    postgresWriteEnabled === true &&
    (!postgresAdapter ||
      typeof postgresAdapter.persistApprovedOperatorPolicy !== "function")
  ) {
    blockedReasons.push("postgres_adapter_required");
  }

  let publicPolicySummary = null;
  let publicAuditEntry = null;
  let publicPostgresResult = null;
  let recordDigest = null;
  let storeWritePerformed = false;
  let auditWritePerformed = false;
  let postgresWritePerformed = false;

  if (blockedReasons.length === 0) {
    const approvedRecord = createApprovedOperatorPolicyRecord({
      settingId: body?.setting_id,
      settingGroup,
      policyVersion: body?.policy_version ?? "v1",
      policyConfig: body?.policy_config,
      summaryLabel: body?.summary_label ?? "operator policy saved",
      approvedByOperator: true,
      committedAtMs: generatedAtMs,
    });
    recordDigest = approvedRecord.policy_digest;
    publicPolicySummary = policyStore.upsertApproved(approvedRecord);
    storeWritePerformed = true;

    const auditEntry = createOperatorPolicyAuditEntry({
      eventId: `operator_policy_event_${generatedAtMs}`,
      settingId: approvedRecord.setting_id,
      settingGroup: approvedRecord.setting_group,
      policyVersion: approvedRecord.policy_version,
      policyDigest: approvedRecord.policy_digest,
      decision: "saved",
      actorRole: "owner",
      ownerConfirmed,
      eventAtMs: generatedAtMs,
    });
    publicAuditEntry = auditLog.append(auditEntry);
    auditWritePerformed = true;

    if (postgresWriteEnabled === true) {
      publicPostgresResult = await postgresAdapter.persistApprovedOperatorPolicy(
        approvedRecord,
        auditEntry
      );
      assertPostgresLikePersistenceResultSafe(
        publicPostgresResult,
        "operator policy async save postgres result"
      );
      postgresWritePerformed =
        publicPostgresResult.operation_result_status === "persisted_in_postgres" ||
        publicPostgresResult.operation_result_status === "persisted_in_mock";
      if (!postgresWritePerformed) {
        throw new ContractError(
          "operator policy async save gate: postgres adapter did not persist"
        );
      }
    }
  }

  const gate = {
    schema: SCHEMA,
    generated_at_ms: generatedAtMs,
    save_status: blockedReasons.length === 0 ? "saved" : "blocked",
    setting_id: sanitizePolicyId(body?.setting_id),
    setting_group: settingGroup,
    policy_version: sanitizePolicyId(body?.policy_version ?? "v1"),
    policy_digest: recordDigest,
    admin_authenticated: adminAuthenticated,
    owner_confirmation_required: ownerConfirmationRequired,
    owner_confirmation_seen: ownerConfirmed,
    blocked_reasons: blockedReasons,
    store_write_performed: storeWritePerformed,
    audit_write_performed: auditWritePerformed,
    postgres_write_performed: postgresWritePerformed,
    public_policy_summary: publicPolicySummary,
    public_audit_entry: publicAuditEntry,
    public_postgres_result: publicPostgresResult,
    boundary_policy: {
      async_private_gate: true,
      authenticated_gate_required: true,
      owner_confirmation_required_for_gameplay_control: true,
      public_summaries_only: true,
      postgres_write_requires_explicit_enablement: true,
      postgres_write_requires_private_adapter: true,
      no_policy_payloads: true,
      no_policy_numeric_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_viewer_messages: true,
      no_support_message_text: true,
      no_hidden_relationship_scores: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_game_or_os_input: true,
    },
  };
  if (publicPolicySummary) assertOperatorPolicyPublicSummarySafe(publicPolicySummary);
  if (publicAuditEntry) assertPublicAuditEntrySafe(publicAuditEntry);
  assertOperatorPolicyAdminAsyncSaveGateSafe(gate);
  return gate;
}

function assertPostgresLikePersistenceResultSafe(result, context) {
  if (result?.schema === "iris_mock_postgres_persistence_result_v1") {
    assertMockPostgresPersistenceResultSafe(result, context);
    return;
  }
  assertPostgresPersistenceAdapterResultSafe(result, context);
}

export function assertOperatorPolicyAdminAsyncSaveGateSafe(
  gate,
  context = "operator policy admin async save gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate must be an object`);
  }
  if (gate.schema !== SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(gate)) {
    if (!OPERATOR_POLICY_ADMIN_ASYNC_SAVE_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected async save gate field ${field}`);
    }
  }
  if (gate.save_status === "saved") {
    if (gate.store_write_performed !== true || gate.audit_write_performed !== true) {
      throw new ContractError(`${context}: saved status requires store and audit writes`);
    }
  } else if (gate.save_status === "blocked") {
    if (gate.store_write_performed !== false || gate.audit_write_performed !== false) {
      throw new ContractError(`${context}: blocked status must not write`);
    }
  } else {
    throw new ContractError(`${context}: invalid save status`);
  }
  assertBoundaryPolicy(gate.boundary_policy, [
    "async_private_gate",
    "authenticated_gate_required",
    "owner_confirmation_required_for_gameplay_control",
    "public_summaries_only",
    "postgres_write_requires_explicit_enablement",
    "postgres_write_requires_private_adapter",
    "no_policy_payloads",
    "no_policy_numeric_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_viewer_messages",
    "no_support_message_text",
    "no_hidden_relationship_scores",
    "no_candidates",
    "no_commands",
    "no_raw_frames",
    "no_game_or_os_input",
  ], context);
  assertNoForbiddenShape(gate, context);
  assertNoUnsafeText(gate, context);
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy ${field} must be true`);
    }
  }
}

function sanitizePolicyId(value) {
  const text = String(value ?? "").trim();
  if (!/^[a-z0-9][a-z0-9_-]{1,100}$/i.test(text)) {
    throw new ContractError("unsafe operator policy id");
  }
  return text;
}

function sanitizeSettingGroup(value) {
  const text = sanitizePolicyId(value);
  if (
    ![
      "relationship_delta",
      "memory_retention",
      "gameplay_skill",
      "gameplay_control",
    ].includes(text)
  ) {
    throw new ContractError("unsupported operator policy setting group");
  }
  return text;
}

function assertPublicAuditEntrySafe(entry) {
  if (entry?.schema !== "iris_operator_policy_audit_public_summary_v1") {
    throw new ContractError("operator policy public audit entry: invalid schema");
  }
  if (entry.policy_payload_hidden !== true) {
    throw new ContractError("operator policy public audit entry: payload must be hidden");
  }
  assertOperatorPolicyAuditEntrySafe({
    schema: "iris_operator_policy_audit_entry_v1",
    event_id: entry.event_id,
    setting_id: entry.setting_id,
    setting_group: entry.setting_group,
    policy_version: entry.policy_version,
    policy_digest: entry.policy_digest,
    decision: entry.decision,
    actor_role: entry.actor_role,
    owner_confirmed: entry.owner_confirmed,
    event_at_ms: entry.event_at_ms,
    policy_payload_stored_in_audit: false,
  });
}

function assertNoForbiddenShape(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenShape(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(key)) {
      throw new ContractError(`${context}: forbidden field ${path}.${key}`);
    }
    assertNoForbiddenShape(child, context, `${path}.${key}`);
  }
}

function assertNoUnsafeText(value, context, path = "root") {
  if (typeof value === "string") {
    if (UNSAFE_TEXT_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe text at ${path}`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeText(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertNoUnsafeText(child, context, `${path}.${key}`);
  }
}
