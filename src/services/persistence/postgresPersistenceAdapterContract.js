import { ContractError } from "../../core/contracts.js";
import { assertOperatorPolicyAuditEntrySafe } from "./operatorPolicyAuditLog.js";
import { assertApprovedOperatorPolicyRecordSafe } from "./operatorPolicyStore.js";

const MEMORY_WRITE_PLAN_SCHEMA = "iris_postgres_memory_write_plan_v1";
const RELATIONSHIP_WRITE_PLAN_SCHEMA = "iris_postgres_relationship_write_plan_v1";
const OPERATOR_POLICY_WRITE_PLAN_SCHEMA =
  "iris_postgres_operator_policy_write_plan_v1";
const MEMORY_SUMMARY_INDEX_ENTRY_SCHEMA =
  "iris_postgres_memory_summary_index_entry_v1";
const STREAM_SESSION_HISTORY_ENTRY_SCHEMA =
  "iris_postgres_stream_session_history_entry_v1";
const GAMEPLAY_MEMORY_SUMMARY_ENTRY_SCHEMA =
  "iris_postgres_gameplay_memory_summary_entry_v1";
const MEDIA_WATCH_MEMORY_SUMMARY_ENTRY_SCHEMA =
  "iris_postgres_media_watch_memory_summary_entry_v1";
const SUPPORT_DONATION_SUMMARY_ENTRY_SCHEMA =
  "iris_postgres_support_donation_summary_entry_v1";
const CANDIDATE_REVIEW_AUDIT_ENTRY_SCHEMA =
  "iris_postgres_candidate_review_audit_entry_v1";
const PERSISTENCE_WRITER_APPROVED_SCHEMA_REGISTRY_SCHEMA =
  "iris_persistence_writer_approved_schema_registry_v1";

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
const APPROVED_PERSISTENCE_WRITER_SCHEMAS = new Set([
  "approved_memory_record",
  "approved_relationship_record",
  "approved_community_memory_record",
]);
const PERSISTENCE_WRITER_APPROVED_SCHEMA_REGISTRY_FIELDS = new Set([
  "schema",
  "registry_status",
  "approved_schema_names",
  "approved_schema_count",
  "boundary_policy",
]);
const PERSISTENCE_WRITER_APPROVED_SCHEMA_BOUNDARY_FIELDS = new Set([
  "approved_schemas_only",
  "candidate_payloads_rejected",
  "selected_memory_ids_rejected",
  "direct_commit_rejected",
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
const MEMORY_SUMMARY_INDEX_ENTRY_FIELDS = new Set([
  "schema",
  "memory_id",
  "type",
  "summary",
  "status",
]);
const STREAM_SESSION_HISTORY_ENTRY_FIELDS = new Set([
  "schema",
  "session_id",
  "summary",
  "event_count",
  "support_event_count",
  "time_bucket",
  "status",
]);
const GAMEPLAY_MEMORY_SUMMARY_ENTRY_FIELDS = new Set([
  "schema",
  "title",
  "session",
  "summary",
  "safe_tags",
  "status",
]);
const MEDIA_WATCH_MEMORY_SUMMARY_ENTRY_FIELDS = new Set([
  "schema",
  "short_reaction",
  "rights_risk",
  "status",
]);
const SUPPORT_DONATION_SUMMARY_ENTRY_FIELDS = new Set([
  "schema",
  "gratitude_context",
  "support_event_type",
  "status",
]);
const CANDIDATE_REVIEW_AUDIT_ENTRY_FIELDS = new Set([
  "schema",
  "candidate_kind",
  "status",
  "reviewer_role",
  "safe_reason",
]);
const UNSAFE_HISTORY_TEXT_PATTERN =
  /\b(raw[_ -]?comment|comment[_ -]?body|raw[_ -]?support|support[_ -]?text|support[_ -]?message|private[_ -]?viewer[_ -]?id|viewer[_ -]?id|raw[_ -]?payload|payload|raw[_ -]?screen|screen[_ -]?capture|raw[_ -]?action|action[_ -]?candidate|world[_ -]?command|input[_ -]?action[_ -]?candidate)\b/i;
const UNSAFE_MEDIA_WATCH_TEXT_PATTERN =
  /\b(dialogue|quoted[_ -]?line|subtitle|subtitles|caption|lyrics|lyric|melody|transcript|script[_ -]?excerpt|existing[_ -]?song|existing[_ -]?music)\b/i;
const UNSAFE_SUPPORT_DONATION_TEXT_PATTERN =
  /\b(amount[_ -]?comparison|ranking|rank|pay[_ -]?to[_ -]?rank|payment[_ -]?derived|exclusive[_ -]?friendship|exclusive[_ -]?access|higher[_ -]?than|top[_ -]?supporter|biggest[_ -]?donor|currency|usd|jpy|yen|dollar|superchat[_ -]?amount|support[_ -]?amount)\b/i;
const UNSAFE_CANDIDATE_REVIEW_TEXT_PATTERN =
  /\b(raw[_ -]?candidate|candidate[_ -]?payload|payload|raw[_ -]?comment|support[_ -]?text|private[_ -]?viewer[_ -]?id|viewer[_ -]?id|hidden[_ -]?score|world[_ -]?command|input[_ -]?action[_ -]?candidate|memory[_ -]?candidate|relationship[_ -]?update[_ -]?candidate)\b/i;
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

export function createPostgresMemorySummaryIndexEntry(approvedRecord) {
  assertApprovedMemoryInput(approvedRecord, "PostgreSQL memory summary index entry");
  const entry = {
    schema: MEMORY_SUMMARY_INDEX_ENTRY_SCHEMA,
    memory_id: safePublicText(approvedRecord.memory_id ?? approvedRecord.event_id, {
      maxLength: 120,
      fallback: "memory",
    }),
    type: safeId(approvedRecord.memory_type, "memory"),
    summary: safePublicText(approvedRecord.summary, {
      maxLength: 180,
      fallback: "summary_unavailable",
    }),
    status: "approved_summary_indexed",
  };
  assertPostgresMemorySummaryIndexEntrySafe(entry);
  return entry;
}

export function createPostgresStreamSessionHistoryEntry({
  sessionId = "session",
  summary = "",
  eventCount = 0,
  supportEventCount = 0,
  timeBucket = "session_time_bucket",
  status = "approved_session_summary",
} = {}) {
  const entry = {
    schema: STREAM_SESSION_HISTORY_ENTRY_SCHEMA,
    session_id: safePublicText(sessionId, {
      maxLength: 120,
      fallback: "session",
    }),
    summary: safePublicText(summary, {
      maxLength: 180,
      fallback: "session_summary_unavailable",
    }),
    event_count: safeNonNegativeInteger(eventCount),
    support_event_count: safeNonNegativeInteger(supportEventCount),
    time_bucket: safeId(timeBucket, "session_time_bucket"),
    status: safeId(status, "approved_session_summary"),
  };
  assertPostgresStreamSessionHistoryEntrySafe(entry);
  return entry;
}

export function createPostgresGameplayMemorySummaryEntry({
  title = "game session",
  session = "game_session",
  summary = "",
  safeTags = [],
  status = "approved_gameplay_summary",
} = {}) {
  const entry = {
    schema: GAMEPLAY_MEMORY_SUMMARY_ENTRY_SCHEMA,
    title: safePublicText(title, {
      maxLength: 80,
      fallback: "game_session",
    }),
    session: safePublicText(session, {
      maxLength: 120,
      fallback: "game_session",
    }),
    summary: safePublicText(summary, {
      maxLength: 180,
      fallback: "gameplay_summary_unavailable",
    }),
    safe_tags: normalizeSafeTags(safeTags),
    status: safeId(status, "approved_gameplay_summary"),
  };
  assertPostgresGameplayMemorySummaryEntrySafe(entry);
  return entry;
}

export function createPostgresMediaWatchMemorySummaryEntry({
  shortReaction = "",
  rightsRisk = "unknown",
  status = "approved_media_watch_summary",
} = {}) {
  const entry = {
    schema: MEDIA_WATCH_MEMORY_SUMMARY_ENTRY_SCHEMA,
    short_reaction: safeMediaWatchText(shortReaction, {
      maxLength: 160,
      fallback: "media_watch_reaction_summary_unavailable",
    }),
    rights_risk: safeId(rightsRisk, "unknown"),
    status: safeId(status, "approved_media_watch_summary"),
  };
  assertPostgresMediaWatchMemorySummaryEntrySafe(entry);
  return entry;
}

export function createPostgresSupportDonationSummaryEntry({
  gratitudeContext = "",
  supportEventType = "support_event",
  status = "approved_support_summary",
} = {}) {
  const entry = {
    schema: SUPPORT_DONATION_SUMMARY_ENTRY_SCHEMA,
    gratitude_context: safeSupportDonationText(gratitudeContext, {
      maxLength: 160,
      fallback: "support_gratitude_summary",
    }),
    support_event_type: safeId(supportEventType, "support_event"),
    status: safeId(status, "approved_support_summary"),
  };
  assertPostgresSupportDonationSummaryEntrySafe(entry);
  return entry;
}

export function createPostgresCandidateReviewAuditEntry({
  candidateKind = "candidate",
  status = "review_required",
  reviewerRole = "operator",
  safeReason = "candidate_review_required",
} = {}) {
  const entry = {
    schema: CANDIDATE_REVIEW_AUDIT_ENTRY_SCHEMA,
    candidate_kind: safeCandidateReviewLabel(candidateKind, "candidate"),
    status: safeId(status, "review_required"),
    reviewer_role: safeId(reviewerRole, "operator"),
    safe_reason: safeCandidateReviewText(safeReason, {
      maxLength: 120,
      fallback: "candidate_review_required",
    }),
  };
  assertPostgresCandidateReviewAuditEntrySafe(entry);
  return entry;
}

export function createPersistenceWriterApprovedSchemaRegistry({
  approvedSchemas = null,
} = {}) {
  const schemaNames = [
    ...new Set(
      (approvedSchemas ?? [...APPROVED_PERSISTENCE_WRITER_SCHEMAS]).filter(
        (schemaName) => APPROVED_PERSISTENCE_WRITER_SCHEMAS.has(schemaName)
      )
    ),
  ].sort();
  const registry = {
    schema: PERSISTENCE_WRITER_APPROVED_SCHEMA_REGISTRY_SCHEMA,
    registry_status: "approved_schema_registry_ready",
    approved_schema_names: schemaNames,
    approved_schema_count: schemaNames.length,
    boundary_policy: {
      approved_schemas_only: true,
      candidate_payloads_rejected: true,
      selected_memory_ids_rejected: true,
      direct_commit_rejected: true,
    },
  };
  assertPersistenceWriterApprovedSchemaRegistrySafe(registry);
  return registry;
}

export function assertPersistenceWriterApprovedSchemaPayload(
  payload,
  context = "persistence writer approved schema payload"
) {
  assertApprovedInputBase(payload, context, payload?.schema);
}

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

export function assertPostgresMemorySummaryIndexEntrySafe(
  entry,
  context = "postgres memory summary index entry"
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: entry must be an object`);
  }
  if (entry.schema !== MEMORY_SUMMARY_INDEX_ENTRY_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(entry)) {
    if (!MEMORY_SUMMARY_INDEX_ENTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected index field ${field}`);
    }
  }
  if (entry.status !== "approved_summary_indexed") {
    throw new ContractError(`${context}: invalid status`);
  }
  for (const field of ["memory_id", "type", "summary"]) {
    if (typeof entry[field] !== "string" || entry[field].trim() === "") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
    if (UNSAFE_PUBLIC_TEXT_PATTERN.test(entry[field])) {
      throw new ContractError(`${context}: unsafe ${field}`);
    }
  }
}

export function assertPostgresStreamSessionHistoryEntrySafe(
  entry,
  context = "postgres stream session history entry"
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: entry must be an object`);
  }
  if (entry.schema !== STREAM_SESSION_HISTORY_ENTRY_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(entry)) {
    if (!STREAM_SESSION_HISTORY_ENTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected history field ${field}`);
    }
  }
  if (!["approved_session_summary", "safe_session_summary"].includes(entry.status)) {
    throw new ContractError(`${context}: invalid status`);
  }
  for (const field of ["session_id", "summary", "time_bucket", "status"]) {
    if (typeof entry[field] !== "string" || entry[field].trim() === "") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
    if (UNSAFE_PUBLIC_TEXT_PATTERN.test(entry[field]) || UNSAFE_HISTORY_TEXT_PATTERN.test(entry[field])) {
      throw new ContractError(`${context}: unsafe ${field}`);
    }
  }
  for (const field of ["event_count", "support_event_count"]) {
    if (!Number.isInteger(entry[field]) || entry[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
}

export function assertPostgresGameplayMemorySummaryEntrySafe(
  entry,
  context = "postgres gameplay memory summary entry"
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: entry must be an object`);
  }
  if (entry.schema !== GAMEPLAY_MEMORY_SUMMARY_ENTRY_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(entry)) {
    if (!GAMEPLAY_MEMORY_SUMMARY_ENTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gameplay summary field ${field}`);
    }
  }
  if (entry.status !== "approved_gameplay_summary") {
    throw new ContractError(`${context}: invalid status`);
  }
  for (const field of ["title", "session", "summary", "status"]) {
    if (typeof entry[field] !== "string" || entry[field].trim() === "") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
    if (
      UNSAFE_PUBLIC_TEXT_PATTERN.test(entry[field]) ||
      UNSAFE_HISTORY_TEXT_PATTERN.test(entry[field])
    ) {
      throw new ContractError(`${context}: unsafe ${field}`);
    }
  }
  if (!Array.isArray(entry.safe_tags)) {
    throw new ContractError(`${context}: safe tags must be an array`);
  }
  for (const tag of entry.safe_tags) {
    if (typeof tag !== "string" || tag.trim() === "") {
      throw new ContractError(`${context}: invalid safe tag`);
    }
    if (UNSAFE_PUBLIC_TEXT_PATTERN.test(tag) || UNSAFE_HISTORY_TEXT_PATTERN.test(tag)) {
      throw new ContractError(`${context}: unsafe safe tag`);
    }
  }
}

export function assertPostgresMediaWatchMemorySummaryEntrySafe(
  entry,
  context = "postgres media watch memory summary entry"
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: entry must be an object`);
  }
  if (entry.schema !== MEDIA_WATCH_MEMORY_SUMMARY_ENTRY_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(entry)) {
    if (!MEDIA_WATCH_MEMORY_SUMMARY_ENTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected media watch field ${field}`);
    }
  }
  if (!["approved_media_watch_summary", "rights_review_required"].includes(entry.status)) {
    throw new ContractError(`${context}: invalid status`);
  }
  for (const field of ["short_reaction", "rights_risk", "status"]) {
    if (typeof entry[field] !== "string" || entry[field].trim() === "") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
    if (
      UNSAFE_PUBLIC_TEXT_PATTERN.test(entry[field]) ||
      UNSAFE_HISTORY_TEXT_PATTERN.test(entry[field]) ||
      UNSAFE_MEDIA_WATCH_TEXT_PATTERN.test(entry[field])
    ) {
      throw new ContractError(`${context}: unsafe ${field}`);
    }
  }
}

export function assertPostgresSupportDonationSummaryEntrySafe(
  entry,
  context = "postgres support donation summary entry"
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: entry must be an object`);
  }
  if (entry.schema !== SUPPORT_DONATION_SUMMARY_ENTRY_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(entry)) {
    if (!SUPPORT_DONATION_SUMMARY_ENTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected support summary field ${field}`);
    }
  }
  if (entry.status !== "approved_support_summary") {
    throw new ContractError(`${context}: invalid status`);
  }
  for (const field of ["gratitude_context", "support_event_type", "status"]) {
    if (typeof entry[field] !== "string" || entry[field].trim() === "") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
    if (
      UNSAFE_PUBLIC_TEXT_PATTERN.test(entry[field]) ||
      UNSAFE_HISTORY_TEXT_PATTERN.test(entry[field]) ||
      UNSAFE_SUPPORT_DONATION_TEXT_PATTERN.test(entry[field])
    ) {
      throw new ContractError(`${context}: unsafe ${field}`);
    }
  }
}

export function assertPostgresCandidateReviewAuditEntrySafe(
  entry,
  context = "postgres candidate review audit entry"
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: entry must be an object`);
  }
  if (entry.schema !== CANDIDATE_REVIEW_AUDIT_ENTRY_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(entry)) {
    if (!CANDIDATE_REVIEW_AUDIT_ENTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected audit field ${field}`);
    }
  }
  for (const field of ["candidate_kind", "status", "reviewer_role", "safe_reason"]) {
    if (typeof entry[field] !== "string" || entry[field].trim() === "") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
    if (
      UNSAFE_PUBLIC_TEXT_PATTERN.test(entry[field]) ||
      UNSAFE_HISTORY_TEXT_PATTERN.test(entry[field]) ||
      UNSAFE_CANDIDATE_REVIEW_TEXT_PATTERN.test(entry[field])
    ) {
      throw new ContractError(`${context}: unsafe ${field}`);
    }
  }
}

export function assertPersistenceWriterApprovedSchemaRegistrySafe(
  registry,
  context = "persistence writer approved schema registry"
) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    throw new ContractError(`${context}: registry required`);
  }
  if (registry.schema !== PERSISTENCE_WRITER_APPROVED_SCHEMA_REGISTRY_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(registry)) {
    if (!PERSISTENCE_WRITER_APPROVED_SCHEMA_REGISTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected registry field`);
    }
  }
  if (registry.registry_status !== "approved_schema_registry_ready") {
    throw new ContractError(`${context}: invalid registry status`);
  }
  if (!Array.isArray(registry.approved_schema_names)) {
    throw new ContractError(`${context}: approved schemas required`);
  }
  if (registry.approved_schema_count !== registry.approved_schema_names.length) {
    throw new ContractError(`${context}: approved schema count mismatch`);
  }
  const seen = new Set();
  for (const schemaName of registry.approved_schema_names) {
    if (!APPROVED_PERSISTENCE_WRITER_SCHEMAS.has(schemaName)) {
      throw new ContractError(`${context}: unapproved schema exposed`);
    }
    if (seen.has(schemaName)) {
      throw new ContractError(`${context}: duplicate schema`);
    }
    seen.add(schemaName);
  }
  assertPersistenceWriterApprovedSchemaBoundaryPolicy(
    registry.boundary_policy,
    context
  );
  assertNoForbiddenPublicFields(registry, context);
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
  if (!APPROVED_PERSISTENCE_WRITER_SCHEMAS.has(record.schema)) {
    throw new ContractError(`${context}: unapproved schema rejected`);
  }
  for (const required of [
    "event_id",
    "trace_id",
    "audit_status",
    "commit_snapshot_id",
    "rollback_pointer_id",
    "moderation_precheck_status",
  ]) {
    if (typeof record[required] !== "string" || record[required].trim() === "") {
      throw new ContractError(`${context}: ${required} is required`);
    }
  }
  if (record.audit_status !== "approved") {
    throw new ContractError(`${context}: approved audit status required`);
  }
  if (record.moderation_precheck_status !== "allowed") {
    throw new ContractError(`${context}: allowed moderation precheck required`);
  }
  const personalizationKind =
    record.personalization_write_kind ?? "ordinary_personalization";
  const viewerSafetyState = record.viewer_safety_state ?? "allowed";
  if (
    personalizationKind === "ordinary_personalization" &&
    ["bounded", "muted", "blocked"].includes(viewerSafetyState)
  ) {
    throw new ContractError(`${context}: bounded viewer personalization rejected`);
  }
  for (const forbidden of [
    "world_command",
    "input_action",
    "input_action_candidate",
    "execute",
    "commit",
    "write",
    "apply",
    "memory_candidate",
    "raw_payload",
    "raw_memory_body",
    "raw_viewer_text",
    "raw_support",
    "raw_support_text",
    "raw_frame",
    "raw_audio",
    "private_viewer_id",
    "viewer_id",
    "memory_candidate_payload",
    "relationship_update_candidate",
    "memory_carryover_candidate",
    "memory_carryover_candidates",
    "community_memory_candidate",
    "community_memory_candidates",
    "selected_memory_ids",
  ]) {
    if (Object.hasOwn(record, forbidden)) {
      throw new ContractError(`${context}: direct candidate or command field rejected`);
    }
  }
}

function assertPersistenceWriterApprovedSchemaBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!PERSISTENCE_WRITER_APPROVED_SCHEMA_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of PERSISTENCE_WRITER_APPROVED_SCHEMA_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
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

function safePublicText(value, { maxLength, fallback }) {
  const text = String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (
    !text ||
    UNSAFE_PUBLIC_TEXT_PATTERN.test(text) ||
    UNSAFE_HISTORY_TEXT_PATTERN.test(text)
  ) {
    return fallback;
  }
  return text.slice(0, maxLength);
}

function safeNonNegativeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function normalizeSafeTags(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => safeId(value, ""))
    .filter(Boolean)
    .slice(0, 8);
}

function safeMediaWatchText(value, { maxLength, fallback }) {
  const text = safePublicText(value, { maxLength, fallback });
  if (UNSAFE_MEDIA_WATCH_TEXT_PATTERN.test(text)) return fallback;
  return text;
}

function safeSupportDonationText(value, { maxLength, fallback }) {
  const text = safePublicText(value, { maxLength, fallback });
  if (UNSAFE_SUPPORT_DONATION_TEXT_PATTERN.test(text)) return fallback;
  return text;
}

function safeCandidateReviewText(value, { maxLength, fallback }) {
  const text = safePublicText(value, { maxLength, fallback });
  if (UNSAFE_CANDIDATE_REVIEW_TEXT_PATTERN.test(text)) return fallback;
  return text;
}

function safeCandidateReviewLabel(value, fallback) {
  const label = safeId(value, fallback);
  if (UNSAFE_CANDIDATE_REVIEW_TEXT_PATTERN.test(label)) return fallback;
  return label;
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
