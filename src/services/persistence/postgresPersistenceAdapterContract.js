import { ContractError } from "../../core/contracts.js";
import { assertOperatorPolicyAuditEntrySafe } from "./operatorPolicyAuditLog.js";
import { assertApprovedOperatorPolicyRecordSafe } from "./operatorPolicyStore.js";

const MEMORY_WRITE_PLAN_SCHEMA = "iris_postgres_memory_write_plan_v1";
const RELATIONSHIP_WRITE_PLAN_SCHEMA = "iris_postgres_relationship_write_plan_v1";
const OPERATOR_POLICY_WRITE_PLAN_SCHEMA =
  "iris_postgres_operator_policy_write_plan_v1";

const FORBIDDEN_PUBLIC_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "relationship_update_candidate",
  "memory_carryover_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "approved_operator_policy_record",
  "operator_policy_audit_entry",
  "summary",
  "text",
  "message_text",
  "final_text",
  "display_name",
  "endpoint",
  "url",
  "connection_string",
  "dsn",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "password",
  "authorization",
  "payload",
  "policy_config",
  "policy_payload",
  "value",
  "params",
  "parameters",
  "sql",
  "raw_sql",
  "command",
]);

const UNSAFE_PUBLIC_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|postgres:\/\/|select |insert |update |delete )\b|https?:\/\//i;
const MEMORY_WRITE_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "write_plan_status",
  "record_kind",
  "target_table_name",
  "operation_id",
  "conflict_target_id",
  "stable_write_key_present",
  "linked_identity_present",
  "source_phase_id",
  "source_candidate_kind_id",
  "column_names",
  "column_name_count",
  "private_parameter_count",
  "adapter_contract",
  "boundary_policy",
]);
const RELATIONSHIP_WRITE_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "write_plan_status",
  "record_kind",
  "target_table_names",
  "operation_ids",
  "operation_count",
  "stable_write_key_present",
  "linked_identity_present",
  "source_phase_id",
  "source_candidate_kind_id",
  "internal_relationship_stage_policy",
  "public_relationship_level_policy",
  "aggregate_column_names",
  "aggregate_column_name_count",
  "event_column_names",
  "event_column_name_count",
  "private_parameter_count",
  "adapter_contract",
  "boundary_policy",
]);
const OPERATOR_POLICY_WRITE_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "write_plan_status",
  "record_kind",
  "target_table_names",
  "operation_ids",
  "operation_count",
  "stable_write_key_present",
  "audit_event_key_present",
  "setting_group_id",
  "policy_digest_present",
  "policy_column_names",
  "policy_column_name_count",
  "audit_column_names",
  "audit_column_name_count",
  "private_parameter_count",
  "adapter_contract",
  "boundary_policy",
]);
const ADAPTER_CONTRACT_FIELDS = new Set([
  "schema",
  "prepared_statement_required",
  "transaction_required",
  "idempotent_upsert_required",
  "aggregate_upsert_required",
  "event_ledger_append_required",
  "policy_record_upsert_required",
  "policy_version_append_required",
  "audit_ledger_append_required",
  "retry_safe",
  "public_report_must_remain_counts_only",
]);

const MEMORY_COLUMN_NAMES = [
  "event_id",
  "trace_id",
  "memory_type",
  "owner_scope",
  "linked_identity_id",
  "source_phase",
  "source_candidate_kind",
  "committed_at_ms",
  "summary_private",
];

const RELATIONSHIP_AGGREGATE_COLUMN_NAMES = [
  "linked_identity_id",
  "affinity_delta",
  "familiarity_delta",
  "topic_key",
  "source_phase",
  "source_candidate_kind",
  "committed_at_ms",
  "summary_private",
];

const RELATIONSHIP_EVENT_COLUMN_NAMES = [
  "event_id",
  "trace_id",
  "linked_identity_id",
  "topic_key",
  "source_phase",
  "source_candidate_kind",
  "committed_at_ms",
  "summary_private",
];

const OPERATOR_POLICY_COLUMN_NAMES = [
  "setting_id",
  "setting_group",
  "policy_version",
  "policy_digest",
  "committed_at_ms",
  "policy_config_private",
];

const OPERATOR_POLICY_AUDIT_COLUMN_NAMES = [
  "event_id",
  "setting_id",
  "setting_group",
  "policy_version",
  "policy_digest",
  "decision",
  "actor_role",
  "owner_confirmed",
  "event_at_ms",
];

export function createPostgresMemoryWritePlan(approvedRecord, { generatedAtMs = Date.now() } = {}) {
  assertApprovedMemoryInput(approvedRecord, "PostgreSQL memory write plan");
  const plan = {
    schema: MEMORY_WRITE_PLAN_SCHEMA,
    generated_at_ms: generatedAtMs,
    write_plan_status: "ready_for_private_adapter",
    record_kind: "approved_memory",
    target_table_name: "approved_memory_summaries",
    operation_id: "upsert_approved_memory_by_event",
    conflict_target_id: "memory_event_identity",
    stable_write_key_present: String(approvedRecord.event_id ?? "").trim() !== "",
    linked_identity_present: String(approvedRecord.linked_identity_id ?? "").trim() !== "",
    source_phase_id: safeId(approvedRecord.source_phase, "phase05"),
    source_candidate_kind_id: safeId(
      approvedRecord.source_candidate_kind,
      "experience_log"
    ),
    column_names: [...MEMORY_COLUMN_NAMES],
    column_name_count: MEMORY_COLUMN_NAMES.length,
    private_parameter_count: MEMORY_COLUMN_NAMES.length,
    adapter_contract: {
      schema: "iris_postgres_private_adapter_contract_v1",
      prepared_statement_required: true,
      transaction_required: true,
      idempotent_upsert_required: true,
      retry_safe: true,
      public_report_must_remain_counts_only: true,
    },
    boundary_policy: createBoundaryPolicy(),
  };
  assertPostgresMemoryWritePlanSafe(plan);
  return plan;
}

export function createPostgresRelationshipWritePlan(
  approvedRecord,
  { generatedAtMs = Date.now() } = {}
) {
  assertApprovedRelationshipInput(approvedRecord, "PostgreSQL relationship write plan");
  const plan = {
    schema: RELATIONSHIP_WRITE_PLAN_SCHEMA,
    generated_at_ms: generatedAtMs,
    write_plan_status: "ready_for_private_adapter",
    record_kind: "approved_relationship",
    target_table_names: ["relationship_aggregates", "relationship_event_ledger"],
    operation_ids: [
      "upsert_relationship_aggregate_by_viewer",
      "append_relationship_event_ledger",
    ],
    operation_count: 2,
    stable_write_key_present: String(approvedRecord.event_id ?? "").trim() !== "",
    linked_identity_present: String(approvedRecord.linked_identity_id ?? "").trim() !== "",
    source_phase_id: safeId(approvedRecord.source_phase, "phase05"),
    source_candidate_kind_id: safeId(
      approvedRecord.source_candidate_kind,
      "relationship_memory"
    ),
    internal_relationship_stage_policy: "0_to_99",
    public_relationship_level_policy: "8_plus_bounded",
    aggregate_column_names: [...RELATIONSHIP_AGGREGATE_COLUMN_NAMES],
    aggregate_column_name_count: RELATIONSHIP_AGGREGATE_COLUMN_NAMES.length,
    event_column_names: [...RELATIONSHIP_EVENT_COLUMN_NAMES],
    event_column_name_count: RELATIONSHIP_EVENT_COLUMN_NAMES.length,
    private_parameter_count:
      RELATIONSHIP_AGGREGATE_COLUMN_NAMES.length +
      RELATIONSHIP_EVENT_COLUMN_NAMES.length,
    adapter_contract: {
      schema: "iris_postgres_private_adapter_contract_v1",
      prepared_statement_required: true,
      transaction_required: true,
      aggregate_upsert_required: true,
      event_ledger_append_required: true,
      retry_safe: true,
      public_report_must_remain_counts_only: true,
    },
    boundary_policy: createBoundaryPolicy(),
  };
  assertPostgresRelationshipWritePlanSafe(plan);
  return plan;
}

export function createPostgresOperatorPolicyWritePlan(
  approvedRecord,
  auditEntry,
  { generatedAtMs = Date.now() } = {}
) {
  assertApprovedOperatorPolicyRecordSafe(
    approvedRecord,
    "PostgreSQL operator policy write plan"
  );
  assertOperatorPolicyAuditEntrySafe(
    auditEntry,
    "PostgreSQL operator policy audit write plan"
  );
  if (approvedRecord.setting_id !== auditEntry.setting_id) {
    throw new ContractError(
      "PostgreSQL operator policy write plan: setting id mismatch"
    );
  }
  if (approvedRecord.policy_digest !== auditEntry.policy_digest) {
    throw new ContractError(
      "PostgreSQL operator policy write plan: policy digest mismatch"
    );
  }
  if (auditEntry.decision !== "saved") {
    throw new ContractError(
      "PostgreSQL operator policy write plan: saved audit decision required"
    );
  }
  const plan = {
    schema: OPERATOR_POLICY_WRITE_PLAN_SCHEMA,
    generated_at_ms: generatedAtMs,
    write_plan_status: "ready_for_private_adapter",
    record_kind: "approved_operator_policy",
    target_table_names: ["operator_policy_records", "operator_policy_versions"],
    operation_ids: [
      "upsert_operator_policy_record_by_setting",
      "append_operator_policy_version",
    ],
    operation_count: 2,
    stable_write_key_present: String(approvedRecord.setting_id ?? "").trim() !== "",
    audit_event_key_present: String(auditEntry.event_id ?? "").trim() !== "",
    setting_group_id: safeId(approvedRecord.setting_group, "relationship_delta"),
    policy_digest_present: String(approvedRecord.policy_digest ?? "").trim() !== "",
    policy_column_names: [...OPERATOR_POLICY_COLUMN_NAMES],
    policy_column_name_count: OPERATOR_POLICY_COLUMN_NAMES.length,
    audit_column_names: [...OPERATOR_POLICY_AUDIT_COLUMN_NAMES],
    audit_column_name_count: OPERATOR_POLICY_AUDIT_COLUMN_NAMES.length,
    private_parameter_count:
      OPERATOR_POLICY_COLUMN_NAMES.length + OPERATOR_POLICY_AUDIT_COLUMN_NAMES.length,
    adapter_contract: {
      schema: "iris_postgres_private_adapter_contract_v1",
      prepared_statement_required: true,
      transaction_required: true,
      policy_record_upsert_required: true,
      policy_version_append_required: true,
      audit_ledger_append_required: true,
      retry_safe: true,
      public_report_must_remain_counts_only: true,
    },
    boundary_policy: {
      ...createBoundaryPolicy(),
      no_policy_payloads: true,
      no_policy_numeric_values: true,
      no_audit_payloads: true,
      digest_only_public_report: true,
      admin_authentication_required_before_plan: true,
      owner_confirmation_required_for_gameplay_control: true,
    },
  };
  assertPostgresOperatorPolicyWritePlanSafe(plan);
  return plan;
}

export function assertPostgresMemoryWritePlanSafe(
  plan,
  context = "postgres memory write plan"
) {
  assertWritePlanSafe(plan, {
    context,
    schema: MEMORY_WRITE_PLAN_SCHEMA,
    expectedRecordKind: "approved_memory",
    tableNames: ["approved_memory_summaries"],
  });
}

export function assertPostgresRelationshipWritePlanSafe(
  plan,
  context = "postgres relationship write plan"
) {
  assertWritePlanSafe(plan, {
    context,
    schema: RELATIONSHIP_WRITE_PLAN_SCHEMA,
    expectedRecordKind: "approved_relationship",
    tableNames: ["relationship_aggregates", "relationship_event_ledger"],
  });
  if (plan.internal_relationship_stage_policy !== "0_to_99") {
    throw new ContractError(`${context}: invalid internal relationship policy`);
  }
  if (plan.public_relationship_level_policy !== "8_plus_bounded") {
    throw new ContractError(`${context}: invalid public relationship policy`);
  }
}

export function assertPostgresOperatorPolicyWritePlanSafe(
  plan,
  context = "postgres operator policy write plan"
) {
  assertWritePlanSafe(plan, {
    context,
    schema: OPERATOR_POLICY_WRITE_PLAN_SCHEMA,
    expectedRecordKind: "approved_operator_policy",
    tableNames: ["operator_policy_records", "operator_policy_versions"],
  });
  for (const policy of [
    "no_policy_payloads",
    "no_policy_numeric_values",
    "no_audit_payloads",
    "digest_only_public_report",
    "admin_authentication_required_before_plan",
    "owner_confirmation_required_for_gameplay_control",
  ]) {
    if (plan.boundary_policy[policy] !== true) {
      throw new ContractError(`${context}: boundary policy ${policy} must be true`);
    }
  }
}

function assertWritePlanSafe(plan, { context, schema, expectedRecordKind, tableNames }) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: plan must be an object`);
  }
  if (plan.schema !== schema) {
    throw new ContractError(`${context}: invalid schema`);
  }
  const allowedFields = getWritePlanFields(schema);
  for (const field of Object.keys(plan)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected write plan field ${field}`);
    }
  }
  if (plan.record_kind !== expectedRecordKind) {
    throw new ContractError(`${context}: invalid record kind`);
  }
  if (plan.write_plan_status !== "ready_for_private_adapter") {
    throw new ContractError(`${context}: invalid write plan status`);
  }
  assertAdapterContractSafe(plan.adapter_contract, context);
  assertNoForbiddenPublicFields(plan, context);
  const serialized = JSON.stringify(plan);
  if (UNSAFE_PUBLIC_TEXT_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: unsafe public text detected`);
  }
  const planTableNames = plan.target_table_names ?? [plan.target_table_name];
  for (const tableName of planTableNames) {
    if (!tableNames.includes(tableName)) {
      throw new ContractError(`${context}: unexpected target table`);
    }
    assertSafeTableName(tableName, context);
  }
  for (const columnName of requiredWritePlanColumnNames(plan, { schema, context })) {
    assertSafeColumnName(columnName, context);
  }
  const requiredPolicies = [
    "private_adapter_only",
    "prepared_statement_values_hidden",
    "no_public_parameter_values",
    "no_raw_summary_in_public_plan",
    "no_viewer_text_in_public_plan",
    "no_candidate_payloads",
    "no_direct_candidate_commit",
    "no_connection_values",
    "no_endpoint_values",
    "no_sql_statements",
    "no_commands",
  ];
  const expectedBoundaryPolicy = createBoundaryPolicy();
  if (schema === OPERATOR_POLICY_WRITE_PLAN_SCHEMA) {
    Object.assign(expectedBoundaryPolicy, {
      no_policy_payloads: true,
      no_policy_numeric_values: true,
      no_audit_payloads: true,
      digest_only_public_report: true,
      admin_authentication_required_before_plan: true,
      owner_confirmation_required_for_gameplay_control: true,
    });
  }
  assertExactBoundaryPolicy(plan.boundary_policy, expectedBoundaryPolicy, context);
  for (const policy of requiredPolicies) {
    if (plan.boundary_policy[policy] !== true) {
      throw new ContractError(`${context}: boundary policy ${policy} must be true`);
    }
  }
}

function getWritePlanFields(schema) {
  if (schema === MEMORY_WRITE_PLAN_SCHEMA) return MEMORY_WRITE_PLAN_FIELDS;
  if (schema === RELATIONSHIP_WRITE_PLAN_SCHEMA) return RELATIONSHIP_WRITE_PLAN_FIELDS;
  return OPERATOR_POLICY_WRITE_PLAN_FIELDS;
}

function requiredWritePlanColumnNames(plan, { schema, context }) {
  if (schema === MEMORY_WRITE_PLAN_SCHEMA) {
    return requireColumnArray(plan.column_names, "column_names", context);
  }
  if (schema === RELATIONSHIP_WRITE_PLAN_SCHEMA) {
    return [
      ...requireColumnArray(plan.aggregate_column_names, "aggregate_column_names", context),
      ...requireColumnArray(plan.event_column_names, "event_column_names", context),
    ];
  }
  return [
    ...requireColumnArray(plan.policy_column_names, "policy_column_names", context),
    ...requireColumnArray(plan.audit_column_names, "audit_column_names", context),
  ];
}

function requireColumnArray(value, field, context) {
  if (!Array.isArray(value)) {
    throw new ContractError(`${context}: ${field} is required`);
  }
  return value;
}

function assertAdapterContractSafe(contract, context) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: adapter contract required`);
  }
  if (contract.schema !== "iris_postgres_private_adapter_contract_v1") {
    throw new ContractError(`${context}: invalid adapter contract schema`);
  }
  for (const field of Object.keys(contract)) {
    if (!ADAPTER_CONTRACT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected adapter contract field ${field}`);
    }
  }
  for (const field of [
    "prepared_statement_required",
    "transaction_required",
    "retry_safe",
    "public_report_must_remain_counts_only",
  ]) {
    if (contract[field] !== true) {
      throw new ContractError(`${context}: adapter contract ${field} required`);
    }
  }
}

function assertApprovedMemoryInput(record, context) {
  assertApprovedInputBase(record, context, "approved_memory_record");
  if (!record.event_id) {
    throw new ContractError(`${context}: event_id is required`);
  }
}

function assertApprovedRelationshipInput(record, context) {
  assertApprovedInputBase(record, context, "approved_relationship_record");
  if (!record.linked_identity_id) {
    throw new ContractError(`${context}: linked_identity_id is required`);
  }
}

function assertApprovedInputBase(record, context, schema) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new ContractError(`${context}: approved input must be an object`);
  }
  if (record.schema !== schema || record.approved !== true) {
    throw new ContractError(`${context}: only approved records can be planned`);
  }
  for (const forbidden of [
    "world_command",
    "input_action",
    "input_action_candidate",
    "execute",
    "commit",
    "write",
    "apply",
    "relationship_update_candidate",
    "memory_carryover_candidate",
    "memory_carryover_candidates",
  ]) {
    if (Object.hasOwn(record, forbidden)) {
      throw new ContractError(`${context}: direct candidate or command field rejected`);
    }
  }
}

function assertNoForbiddenPublicFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenPublicFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_PUBLIC_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe public field ${field}`, { path });
    }
    assertNoForbiddenPublicFields(child, context, `${path}.${field}`);
  }
}

function createBoundaryPolicy() {
  return {
    private_adapter_only: true,
    prepared_statement_values_hidden: true,
    no_public_parameter_values: true,
    no_raw_summary_in_public_plan: true,
    no_viewer_text_in_public_plan: true,
    no_candidate_payloads: true,
    no_direct_candidate_commit: true,
    no_connection_values: true,
    no_endpoint_values: true,
    no_sql_statements: true,
    no_commands: true,
  };
}

function assertExactBoundaryPolicy(policy, expected, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy must be an object`);
  }
  for (const key of Object.keys(policy)) {
    if (!Object.hasOwn(expected, key)) {
      throw new ContractError(`${context}: unexpected boundary policy ${key}`);
    }
  }
  for (const key of Object.keys(expected)) {
    if (!Object.hasOwn(policy, key)) {
      throw new ContractError(`${context}: missing boundary policy ${key}`);
    }
  }
}

function safeId(value, fallback) {
  const text = String(value ?? fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (!text || UNSAFE_PUBLIC_TEXT_PATTERN.test(text)) return fallback;
  return text.slice(0, 80);
}

function assertSafeTableName(value, context) {
  if (!/^[a-z][a-z0-9_]+$/.test(value)) {
    throw new ContractError(`${context}: unsafe table name`);
  }
}

function assertSafeColumnName(value, context) {
  if (!/^[a-z][a-z0-9_]+$/.test(value)) {
    throw new ContractError(`${context}: unsafe column name`);
  }
}
