import { ContractError } from "../../core/contracts.js";

const SCHEMA = "iris_postgres_persistence_migration_plan_v1";
const TARGET_CAPACITY = 1_000_000;
const INTERNAL_RELATIONSHIP_STAGE_COUNT = 100;
const PUBLIC_RELATIONSHIP_LEVEL_COUNT = 8;

const FORBIDDEN_FIELDS = new Set([
  "connection_string",
  "dsn",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "value",
  "payload",
  "raw",
  "raw_sql",
  "sql",
  "command",
  "input_action_candidate",
  "memory_carryover_candidate",
  "relationship_update_candidate",
  "approved_memory_record",
  "approved_relationship_record",
  "youtube_text",
  "support_message",
  "policy_config",
  "policy_payload",
]);
const POSTGRES_PERSISTENCE_MIGRATION_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "plan_status",
  "target_stage_id",
  "target_stage_priority",
  "postgres_connection_configured",
  "postgres_migrations_ready",
  "postgres_indexes_ready",
  "postgres_backup_ready",
  "target_capacity_band",
  "target_capacity_ready",
  "moderation_store_enabled",
  "moderation_blocklist_enabled",
  "internal_relationship_stage_policy",
  "internal_relationship_stage_count_ready",
  "public_relationship_level_policy",
  "public_relationship_level_count_ready",
  "moderation_state_policy",
  "table_groups",
  "table_name_count",
  "migration_steps",
  "migration_step_count",
  "index_plan",
  "index_id_count",
  "backup_plan",
  "operator_policy_storage_plan",
  "readiness_summary",
  "verification_scripts",
  "boundary_policy",
]);
const POSTGRES_MIGRATION_READINESS_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "readiness_status",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "check_results",
  "boundary_policy",
]);
const POSTGRES_CAPACITY_READINESS_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "readiness_status",
  "target_capacity_band",
  "index_status",
  "page_status",
  "cache_status",
  "migration_status",
  "backup_status",
  "raw_detail_exposed",
  "boundary_policy",
]);
const POSTGRES_MIGRATION_READINESS_CHECK_IDS = Object.freeze([
  "migration_configuration",
  "index_configuration",
  "backup_configuration",
  "capacity_configuration",
]);

const TABLE_GROUPS = [
  {
    group_id: "viewer_identity",
    purpose_id: "stable_viewer_lookup",
    table_names: ["viewer_identity_profiles"],
  },
  {
    group_id: "relationship_state",
    purpose_id: "approved_relationship_state",
    table_names: ["relationship_aggregates", "relationship_event_ledger"],
  },
  {
    group_id: "approved_memory",
    purpose_id: "approved_long_term_memory",
    table_names: [
      "approved_memory_summaries",
      "memory_summary_index",
      "stream_session_history",
      "gameplay_memory_summaries",
      "media_watch_memory_summaries",
      "support_event_summaries",
    ],
  },
  {
    group_id: "moderation",
    purpose_id: "viewer_safety_and_blocklist",
    table_names: ["moderation_state", "moderation_event_ledger"],
  },
  {
    group_id: "operator_policy",
    purpose_id: "admin_operator_policy_storage",
    table_names: ["operator_policy_records", "operator_policy_versions"],
  },
  {
    group_id: "audit",
    purpose_id: "operator_and_candidate_review_audit",
    table_names: ["candidate_review_audit", "operator_audit_trail"],
  },
];

const INDEX_PLAN = [
  {
    index_id: "idx_viewer_identity_stable_key",
    table_name: "viewer_identity_profiles",
    purpose_id: "deduplicate_viewers",
  },
  {
    index_id: "idx_viewer_identity_last_seen",
    table_name: "viewer_identity_profiles",
    purpose_id: "admin_recent_viewer_scan",
  },
  {
    index_id: "idx_relationship_public_level",
    table_name: "relationship_aggregates",
    purpose_id: "public_level_filtering",
  },
  {
    index_id: "idx_relationship_internal_stage",
    table_name: "relationship_aggregates",
    purpose_id: "operator_only_stage_distribution",
  },
  {
    index_id: "idx_relationship_last_interaction",
    table_name: "relationship_aggregates",
    purpose_id: "relationship_recency_scan",
  },
  {
    index_id: "idx_relationship_event_viewer_time",
    table_name: "relationship_event_ledger",
    purpose_id: "approved_relationship_history",
  },
  {
    index_id: "idx_memory_viewer_time",
    table_name: "approved_memory_summaries",
    purpose_id: "approved_memory_recall",
  },
  {
    index_id: "idx_memory_summary_topic",
    table_name: "memory_summary_index",
    purpose_id: "bounded_topic_recall",
  },
  {
    index_id: "idx_stream_session_viewer_time",
    table_name: "stream_session_history",
    purpose_id: "stream_history_recall",
  },
  {
    index_id: "idx_gameplay_memory_viewer_time",
    table_name: "gameplay_memory_summaries",
    purpose_id: "gameplay_recall",
  },
  {
    index_id: "idx_media_watch_viewer_time",
    table_name: "media_watch_memory_summaries",
    purpose_id: "media_watch_recall",
  },
  {
    index_id: "idx_support_event_viewer_time",
    table_name: "support_event_summaries",
    purpose_id: "support_event_recall",
  },
  {
    index_id: "idx_moderation_state",
    table_name: "moderation_state",
    purpose_id: "blocklist_and_limited_interaction_lookup",
  },
  {
    index_id: "idx_moderation_event_time",
    table_name: "moderation_event_ledger",
    purpose_id: "moderation_audit_review",
  },
  {
    index_id: "idx_operator_policy_setting_version",
    table_name: "operator_policy_records",
    purpose_id: "operator_policy_lookup",
  },
  {
    index_id: "idx_operator_policy_group_time",
    table_name: "operator_policy_versions",
    purpose_id: "operator_policy_history",
  },
  {
    index_id: "idx_candidate_review_audit_time",
    table_name: "candidate_review_audit",
    purpose_id: "candidate_gate_audit",
  },
  {
    index_id: "idx_operator_audit_time",
    table_name: "operator_audit_trail",
    purpose_id: "admin_operator_audit",
  },
];

const MIGRATION_STEPS = [
  {
    migration_id: "001_viewer_identity_profiles",
    table_names: ["viewer_identity_profiles"],
    index_ids: ["idx_viewer_identity_stable_key", "idx_viewer_identity_last_seen"],
  },
  {
    migration_id: "002_relationship_state",
    table_names: ["relationship_aggregates", "relationship_event_ledger"],
    index_ids: [
      "idx_relationship_public_level",
      "idx_relationship_internal_stage",
      "idx_relationship_last_interaction",
      "idx_relationship_event_viewer_time",
    ],
  },
  {
    migration_id: "003_approved_memory_summaries",
    table_names: ["approved_memory_summaries", "memory_summary_index"],
    index_ids: ["idx_memory_viewer_time", "idx_memory_summary_topic"],
  },
  {
    migration_id: "004_stream_and_gameplay_memory",
    table_names: [
      "stream_session_history",
      "gameplay_memory_summaries",
      "media_watch_memory_summaries",
      "support_event_summaries",
    ],
    index_ids: [
      "idx_stream_session_viewer_time",
      "idx_gameplay_memory_viewer_time",
      "idx_media_watch_viewer_time",
      "idx_support_event_viewer_time",
    ],
  },
  {
    migration_id: "005_moderation_state",
    table_names: ["moderation_state", "moderation_event_ledger"],
    index_ids: ["idx_moderation_state", "idx_moderation_event_time"],
  },
  {
    migration_id: "006_operator_and_candidate_audit",
    table_names: ["candidate_review_audit", "operator_audit_trail"],
    index_ids: ["idx_candidate_review_audit_time", "idx_operator_audit_time"],
  },
  {
    migration_id: "007_operator_policy_records",
    table_names: ["operator_policy_records", "operator_policy_versions"],
    index_ids: [
      "idx_operator_policy_setting_version",
      "idx_operator_policy_group_time",
    ],
  },
];

export function createPostgresPersistenceMigrationPlan({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const postgresConnectionConfigured = Boolean(env.IRIS_POSTGRES_CONNECTION_STRING);
  const migrationsReady = env.IRIS_POSTGRES_MIGRATIONS_READY === "true";
  const indexesReady = env.IRIS_POSTGRES_INDEXES_READY === "true";
  const backupReady = env.IRIS_POSTGRES_BACKUP_READY === "true";
  const targetCapacity = parsePositiveInteger(
    env.IRIS_POSTGRES_TARGET_VIEWER_PROFILE_CAPACITY
  );
  const internalStageCount = parsePositiveInteger(
    env.IRIS_INTERNAL_RELATIONSHIP_STAGE_COUNT
  );
  const publicLevelCount = parsePositiveInteger(
    env.IRIS_PUBLIC_RELATIONSHIP_LEVEL_COUNT
  );
  const moderationStoreEnabled = env.IRIS_MODERATION_STORE_ENABLED === "true";
  const moderationBlocklistEnabled =
    env.IRIS_MODERATION_BLOCKLIST_ENABLED === "true";
  const targetCapacityReady = targetCapacity >= TARGET_CAPACITY;
  const internalStagePolicyReady =
    internalStageCount === INTERNAL_RELATIONSHIP_STAGE_COUNT;
  const publicLevelPolicyReady =
    publicLevelCount === PUBLIC_RELATIONSHIP_LEVEL_COUNT;
  const ready =
    postgresConnectionConfigured &&
    migrationsReady &&
    indexesReady &&
    backupReady &&
    targetCapacityReady &&
    moderationStoreEnabled &&
    moderationBlocklistEnabled &&
    internalStagePolicyReady &&
    publicLevelPolicyReady;
  const migrationSteps = MIGRATION_STEPS.map((step, index) => ({
    schema: "iris_postgres_persistence_migration_step_v1",
    sequence_order: index + 1,
    migration_id: step.migration_id,
    table_names: [...step.table_names],
    table_name_count: step.table_names.length,
    index_ids: [...step.index_ids],
    index_id_count: step.index_ids.length,
    destructive_migration_allowed: false,
    data_backfill_requires_operator_review: true,
    readiness_state: migrationsReady ? "ready" : "configuration_waiting",
  }));
  const plan = {
    schema: SCHEMA,
    generated_at_ms: generatedAtMs,
    plan_status: ready ? "ready_for_operator_review" : "configuration_waiting",
    target_stage_id: "postgres_relationship_memory_persistence",
    target_stage_priority: 3,
    postgres_connection_configured: postgresConnectionConfigured,
    postgres_migrations_ready: migrationsReady,
    postgres_indexes_ready: indexesReady,
    postgres_backup_ready: backupReady,
    target_capacity_band: targetCapacityReady
      ? "one_million_plus"
      : targetCapacity > 0
        ? "below_one_million"
        : "not_configured",
    target_capacity_ready: targetCapacityReady,
    moderation_store_enabled: moderationStoreEnabled,
    moderation_blocklist_enabled: moderationBlocklistEnabled,
    internal_relationship_stage_policy: "0_to_99",
    internal_relationship_stage_count_ready: internalStagePolicyReady,
    public_relationship_level_policy: "8_plus_bounded",
    public_relationship_level_count_ready: publicLevelPolicyReady,
    moderation_state_policy: [
      "allowed",
      "watch",
      "limited",
      "muted",
      "blocked",
      "appeal_pending",
      "archived",
    ],
    table_groups: TABLE_GROUPS.map((group) => ({
      schema: "iris_postgres_persistence_table_group_v1",
      group_id: group.group_id,
      purpose_id: group.purpose_id,
      table_names: [...group.table_names],
      table_name_count: group.table_names.length,
    })),
    table_name_count: uniqueStrings(
      TABLE_GROUPS.flatMap((group) => group.table_names)
    ).length,
    migration_steps: migrationSteps,
    migration_step_count: migrationSteps.length,
    index_plan: INDEX_PLAN.map((index) => ({
      schema: "iris_postgres_persistence_index_plan_v1",
      index_id: index.index_id,
      table_name: index.table_name,
      purpose_id: index.purpose_id,
      readiness_state: indexesReady ? "ready" : "configuration_waiting",
    })),
    index_id_count: INDEX_PLAN.length,
    backup_plan: {
      schema: "iris_postgres_persistence_backup_plan_v1",
      backup_readiness_state: backupReady ? "ready" : "configuration_waiting",
      point_in_time_recovery_required: true,
      restore_rehearsal_required: true,
      backup_health_visible_in_admin_panel: true,
      retention_policy_requires_operator_review: true,
    },
    operator_policy_storage_plan: {
      schema: "iris_postgres_operator_policy_storage_plan_v1",
      policy_record_tables: ["operator_policy_records", "operator_policy_versions"],
      policy_record_table_count: 2,
      stores_policy_payloads_privately: true,
      public_reports_policy_digest_only: true,
      admin_authentication_required: true,
      owner_confirmation_required_for_gameplay_control: true,
      audit_log_required_for_save: true,
      postgres_policy_write_requires_private_runner: true,
    },
    readiness_summary: {
      schema: "iris_postgres_persistence_readiness_summary_v1",
      ready,
      next_readiness_state: ready
        ? "operator_review_required"
        : "configuration_waiting",
      connection_configuration_required: !postgresConnectionConfigured,
      migration_configuration_required: !migrationsReady,
      index_configuration_required: !indexesReady,
      backup_configuration_required: !backupReady,
      moderation_configuration_required:
        !moderationStoreEnabled || !moderationBlocklistEnabled,
      scale_policy_configuration_required:
        !targetCapacityReady || !internalStagePolicyReady || !publicLevelPolicyReady,
    },
    verification_scripts: {
      schema: "iris_postgres_persistence_verification_scripts_v1",
      migration_plan_script:
        "npm run dev:persistence:postgres-migration-plan",
      migration_review_gate_script:
        "npm run dev:persistence:postgres-migration-review-gate",
      migration_runner_dry_run_script:
        "npm run dev:persistence:postgres-migration-runner-dry-run",
      health_rollback_rehearsal_script:
        "npm run dev:persistence:postgres-health-rollback-rehearsal",
      persistence_preflight_script: "npm run dev:persistence:preflight",
      production_config_doctor_script: "npm run dev:config:doctor",
    },
    boundary_policy: {
      read_only_plan: true,
      env_names_only: true,
      script_names_only: true,
      no_connection_values: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_viewer_text: true,
      no_support_messages: true,
      no_policy_payloads: true,
      no_candidate_payloads: true,
      no_commands: true,
      no_sql_statements: true,
      no_db_connection_attempted: true,
      memory_candidates_not_committed_directly: true,
      relationship_candidates_not_committed_directly: true,
    },
  };

  assertPostgresPersistenceMigrationPlanSafe(plan);
  return plan;
}

export function createPostgresMigrationReadinessSafeSummary({
  migrationsReady = false,
  indexesReady = false,
  backupReady = false,
  targetCapacityReady = false,
} = {}) {
  const readiness = {
    migration_configuration: migrationsReady === true,
    index_configuration: indexesReady === true,
    backup_configuration: backupReady === true,
    capacity_configuration: targetCapacityReady === true,
  };
  const checkResults = POSTGRES_MIGRATION_READINESS_CHECK_IDS.map((checkId) => ({
    check_id: checkId,
    result: readiness[checkId] ? "ready" : "attention_required",
  }));
  const readyCheckCount = checkResults.filter((check) => check.result === "ready").length;
  const summary = {
    schema: "iris_postgres_migration_readiness_safe_summary_v1",
    readiness_status:
      readyCheckCount === checkResults.length ? "ready" : "operator_attention_required",
    check_count: checkResults.length,
    ready_check_count: readyCheckCount,
    attention_check_count: checkResults.length - readyCheckCount,
    check_results: checkResults,
    boundary_policy: {
      status_counts_and_results_only: true,
      no_database_values: true,
      no_connection_values: true,
      no_endpoint_values: true,
      no_credentials: true,
      no_statement_text: true,
    },
  };
  assertPostgresMigrationReadinessSafeSummary(summary);
  return summary;
}

export function createPostgresCapacityReadinessSafeSummary({
  targetCapacityReady = false,
  indexesReady = false,
  pageStrategyReady = false,
  cacheReady = false,
  migrationsReady = false,
  backupReady = false,
} = {}) {
  const ready =
    targetCapacityReady === true &&
    indexesReady === true &&
    pageStrategyReady === true &&
    cacheReady === true &&
    migrationsReady === true &&
    backupReady === true;
  const summary = {
    schema: "iris_postgres_capacity_readiness_safe_summary_v1",
    readiness_status: ready ? "ready" : "operator_attention_required",
    target_capacity_band:
      targetCapacityReady === true ? "one_million_plus" : "capacity_attention",
    index_status: indexesReady === true ? "ready" : "attention_required",
    page_status: pageStrategyReady === true ? "ready" : "attention_required",
    cache_status: cacheReady === true ? "ready" : "attention_required",
    migration_status: migrationsReady === true ? "ready" : "attention_required",
    backup_status: backupReady === true ? "ready" : "attention_required",
    raw_detail_exposed: false,
    boundary_policy: {
      status_only: true,
      index_page_cache_migration_backup_only: true,
      no_database_values: true,
      no_connection_values: true,
      no_endpoint_values: true,
      no_credentials: true,
      no_statement_text: true,
      no_candidate_payloads: true,
    },
  };
  assertPostgresCapacityReadinessSafeSummary(summary);
  return summary;
}

export function assertPostgresCapacityReadinessSafeSummary(
  summary,
  context = "postgres capacity readiness safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context} must be an object`);
  }
  if (summary.schema !== "iris_postgres_capacity_readiness_safe_summary_v1") {
    throw new ContractError(`${context} has invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!POSTGRES_CAPACITY_READINESS_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context} unexpected summary field ${field}`);
    }
  }
  assertSafeObject(summary, context);
  const serialized = JSON.stringify(summary);
  if (
    /postgres:\/\//i.test(serialized) ||
    /https?:\/\//i.test(serialized) ||
    /\b(select |insert |update |delete |connection_string|raw_db_value|db_value|secret|token|password)\b/i.test(
      serialized
    )
  ) {
    throw new ContractError(`${context} must not expose database detail`);
  }
  if (!["ready", "operator_attention_required"].includes(summary.readiness_status)) {
    throw new ContractError(`${context} invalid readiness status`);
  }
  if (!["one_million_plus", "capacity_attention"].includes(summary.target_capacity_band)) {
    throw new ContractError(`${context} invalid target capacity band`);
  }
  for (const field of [
    "index_status",
    "page_status",
    "cache_status",
    "migration_status",
    "backup_status",
  ]) {
    if (!["ready", "attention_required"].includes(summary[field])) {
      throw new ContractError(`${context} invalid ${field}`);
    }
  }
  if (summary.raw_detail_exposed !== false) {
    throw new ContractError(`${context} raw detail must not be exposed`);
  }
  const ready =
    summary.target_capacity_band === "one_million_plus" &&
    summary.index_status === "ready" &&
    summary.page_status === "ready" &&
    summary.cache_status === "ready" &&
    summary.migration_status === "ready" &&
    summary.backup_status === "ready";
  if (summary.readiness_status !== (ready ? "ready" : "operator_attention_required")) {
    throw new ContractError(`${context} readiness status mismatch`);
  }
  for (const [field, value] of Object.entries({
    status_only: true,
    index_page_cache_migration_backup_only: true,
    no_database_values: true,
    no_connection_values: true,
    no_endpoint_values: true,
    no_credentials: true,
    no_statement_text: true,
    no_candidate_payloads: true,
  })) {
    if (summary.boundary_policy?.[field] !== value) {
      throw new ContractError(`${context} boundary ${field} must be true`);
    }
  }
}

export function assertPostgresMigrationReadinessSafeSummary(
  summary,
  context = "postgres migration readiness safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context} must be an object`);
  }
  if (summary.schema !== "iris_postgres_migration_readiness_safe_summary_v1") {
    throw new ContractError(`${context} has invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!POSTGRES_MIGRATION_READINESS_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context} unexpected summary field ${field}`);
    }
  }
  assertSafeObject(summary, context);
  const serialized = JSON.stringify(summary);
  if (
    /postgres:\/\//i.test(serialized) ||
    /https?:\/\//i.test(serialized) ||
    /\b(select |insert |update |delete |connection_string|raw_db_value|db_value)\b/i.test(
      serialized
    )
  ) {
    throw new ContractError(`${context} must not expose database detail`);
  }
  if (!["ready", "operator_attention_required"].includes(summary.readiness_status)) {
    throw new ContractError(`${context} invalid readiness status`);
  }
  for (const field of ["check_count", "ready_check_count", "attention_check_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context} invalid ${field}`);
    }
  }
  if (
    !Array.isArray(summary.check_results) ||
    summary.check_results.length !== summary.check_count
  ) {
    throw new ContractError(`${context} check result count mismatch`);
  }
  const seen = new Set();
  for (const result of summary.check_results) {
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new ContractError(`${context} check result must be an object`);
    }
    if (!POSTGRES_MIGRATION_READINESS_CHECK_IDS.includes(result.check_id)) {
      throw new ContractError(`${context} invalid check id`);
    }
    if (!["ready", "attention_required"].includes(result.result)) {
      throw new ContractError(`${context} invalid check result`);
    }
    seen.add(result.check_id);
  }
  if (seen.size !== POSTGRES_MIGRATION_READINESS_CHECK_IDS.length) {
    throw new ContractError(`${context} check ids must be complete and unique`);
  }
  const readyCount = summary.check_results.filter((check) => check.result === "ready").length;
  if (
    summary.ready_check_count !== readyCount ||
    summary.attention_check_count !== summary.check_count - readyCount
  ) {
    throw new ContractError(`${context} check counts mismatch`);
  }
  for (const [field, value] of Object.entries({
    status_counts_and_results_only: true,
    no_database_values: true,
    no_connection_values: true,
    no_endpoint_values: true,
    no_credentials: true,
    no_statement_text: true,
  })) {
    if (summary.boundary_policy?.[field] !== value) {
      throw new ContractError(`${context} boundary ${field} must be true`);
    }
  }
}

export function assertPostgresPersistenceMigrationPlanSafe(
  plan,
  context = "postgres persistence migration plan"
) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context} must be an object`);
  }
  if (plan.schema !== SCHEMA) {
    throw new ContractError(`${context} has invalid schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!POSTGRES_PERSISTENCE_MIGRATION_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context} unexpected plan field ${field}`);
    }
  }
  assertSafeObject(plan, context);
  const serialized = JSON.stringify(plan);
  if (/postgres:\/\//i.test(serialized) || /https?:\/\//i.test(serialized)) {
    throw new ContractError(`${context} must not expose connection or endpoint strings`);
  }
  for (const group of plan.table_groups) {
    assertSafeId(group.group_id, `${context} group_id`);
    assertSafeId(group.purpose_id, `${context} purpose_id`);
    for (const tableName of group.table_names) {
      assertSafeTableName(tableName, `${context} table_name`);
    }
  }
  for (const step of plan.migration_steps) {
    if (!/^[0-9]{3}_[a-z0-9_]+$/.test(step.migration_id)) {
      throw new ContractError(`${context} has unsafe migration_id`);
    }
    if (step.destructive_migration_allowed !== false) {
      throw new ContractError(`${context} must not allow destructive migrations`);
    }
    for (const tableName of step.table_names) {
      assertSafeTableName(tableName, `${context} migration table_name`);
    }
    for (const indexId of step.index_ids) {
      assertSafeIndexId(indexId, `${context} migration index_id`);
    }
  }
  for (const index of plan.index_plan) {
    assertSafeIndexId(index.index_id, `${context} index_id`);
    assertSafeTableName(index.table_name, `${context} index table_name`);
    assertSafeId(index.purpose_id, `${context} index purpose_id`);
  }
  const requiredTruePolicies = [
    "read_only_plan",
    "env_names_only",
    "script_names_only",
    "no_connection_values",
    "no_endpoint_values",
    "no_secret_values",
    "no_viewer_text",
    "no_support_messages",
    "no_policy_payloads",
    "no_candidate_payloads",
    "no_commands",
    "no_sql_statements",
    "no_db_connection_attempted",
    "memory_candidates_not_committed_directly",
    "relationship_candidates_not_committed_directly",
  ];
  for (const key of requiredTruePolicies) {
    if (plan.boundary_policy[key] !== true) {
      throw new ContractError(`${context} boundary policy ${key} must be true`);
    }
  }
}

function assertSafeObject(value, context) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeObject(item, `${context}[${index}]`));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(key)) {
      throw new ContractError(`${context} exposes forbidden field ${key}`);
    }
    assertSafeObject(nested, `${context}.${key}`);
  }
}

function assertSafeTableName(value, context) {
  if (!/^[a-z][a-z0-9_]+$/.test(value)) {
    throw new ContractError(`${context} must be a safe table name`);
  }
}

function assertSafeIndexId(value, context) {
  if (!/^idx_[a-z0-9_]+$/.test(value)) {
    throw new ContractError(`${context} must be a safe index id`);
  }
}

function assertSafeId(value, context) {
  if (!/^[a-z][a-z0-9_]+$/.test(value)) {
    throw new ContractError(`${context} must be a safe id`);
  }
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function uniqueStrings(values) {
  return [...new Set(values)];
}
