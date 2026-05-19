import {
  ContractError,
  assertNoDirectCandidateCommit,
  assertNoDirectMemoryWrite,
  assertNoWorldCommand,
} from "../../core/contracts.js";

const POSTGRES_ENV_NAMES = [
  "IRIS_PERSISTENCE_BACKEND",
  "IRIS_POSTGRES_CONNECTION_STRING",
  "IRIS_POSTGRES_MIGRATIONS_READY",
  "IRIS_POSTGRES_INDEXES_READY",
  "IRIS_POSTGRES_BACKUP_READY",
  "IRIS_POSTGRES_TARGET_VIEWER_PROFILE_CAPACITY",
  "IRIS_MODERATION_STORE_ENABLED",
  "IRIS_MODERATION_BLOCKLIST_ENABLED",
];

const REPORT_FIELDS = new Set([
  "schema",
  "ok",
  "status",
  "external_real_evidence_status",
  "next_readiness_state",
  "production_ready_allowed",
  "go_no_go",
  "postgres_evidence_summary",
  "migration_readiness_summary",
  "backup_restore_rehearsal_summary",
  "million_profile_readiness_summary",
  "candidate_boundary_summary",
  "raw_leak_guard_summary",
  "production_handoff_summary",
  "boundary_policy",
]);

const POSTGRES_EVIDENCE_FIELDS = new Set([
  "schema",
  "configured_env",
  "missing_env",
  "configured_env_count",
  "missing_env_count",
  "postgres_backend_selected",
  "postgres_connection_configured",
  "real_db_connection_attempted",
  "migration_execution_attempted",
  "backup_execution_attempted",
  "restore_execution_attempted",
  "real_db_evidence_status",
  "operator_confirmation_status",
]);

const MIGRATION_READINESS_FIELDS = new Set([
  "schema",
  "readiness_status",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "check_results",
]);

const BACKUP_RESTORE_FIELDS = new Set([
  "schema",
  "backup_rehearsal_status",
  "restore_rehearsal_status",
  "backup_evidence_status",
  "restore_evidence_status",
  "safe_status_only",
]);

const MILLION_PROFILE_FIELDS = new Set([
  "schema",
  "readiness_status",
  "target_profile_band",
  "index_status",
  "page_status",
  "cache_status",
  "migration_status",
  "backup_status",
  "production_ready_allowed",
]);

const CANDIDATE_BOUNDARY_FIELDS = new Set([
  "schema",
  "candidate_to_relationship_event_ledger_count",
  "selected_memory_ids_commit_input_count",
  "recall_candidate_commit_input_count",
  "relationship_update_candidate_to_aggregate_count",
  "memory_carryover_candidates_writer_count",
  "approved_schema_required",
]);

const RAW_LEAK_GUARD_FIELDS = new Set([
  "schema",
  "safe_summary_only",
  "raw_db_value_count",
  "connection_string_value_count",
  "db_credential_value_count",
  "endpoint_value_count",
  "raw_sql_count",
  "backup_path_value_count",
  "raw_db_dump_count",
  "raw_memory_body_count",
  "private_viewer_id_count",
  "unsafe_value_leak_detected",
]);

const HANDOFF_FIELDS = new Set([
  "schema",
  "real_db_not_connected",
  "migration_not_executed",
  "backup_not_executed",
  "restore_not_executed",
  "json_local_fixture_not_real_ready",
  "safe_summary_only",
  "production_ready_allowed",
  "go_no_go",
  "next_validation_script",
  "next_preflight_script",
  "next_status_script",
]);

const BOUNDARY_FIELDS = new Set([
  "migration_status_check_count_result_only",
  "backup_restore_safe_status_only",
  "million_profile_index_page_cache_migration_backup_status_only",
  "env_names_only",
  "no_raw_db_values",
  "no_connection_string_values",
  "no_db_credential_values",
  "no_endpoint_values",
  "no_raw_sql",
  "no_backup_paths",
  "no_raw_db_dump",
  "no_raw_memory_body",
  "no_private_viewer_ids",
  "candidate_requires_approved_validator",
  "selected_memory_ids_not_commit_input",
  "recall_candidate_not_commit_input",
  "relationship_update_candidate_not_direct_aggregate",
  "memory_carryover_candidates_not_direct_writer",
  "json_local_fixture_not_production_ready",
  "production_ready_not_allowed",
]);

export function createPostgresMigrationBackupEvidenceBoundaryReport({
  env = process.env,
} = {}) {
  const configuredEnv = POSTGRES_ENV_NAMES.filter((name) => env[name]);
  const missingEnv = POSTGRES_ENV_NAMES.filter((name) => !env[name]);
  const postgresBackendSelected = env.IRIS_PERSISTENCE_BACKEND === "postgresql";
  const postgresConnectionConfigured = Boolean(env.IRIS_POSTGRES_CONNECTION_STRING);
  const migrationsReady = env.IRIS_POSTGRES_MIGRATIONS_READY === "true";
  const indexesReady = env.IRIS_POSTGRES_INDEXES_READY === "true";
  const backupReady = env.IRIS_POSTGRES_BACKUP_READY === "true";
  const capacityReady =
    safeInteger(env.IRIS_POSTGRES_TARGET_VIEWER_PROFILE_CAPACITY) >= 1_000_000;
  const moderationReady =
    env.IRIS_MODERATION_STORE_ENABLED === "true" &&
    env.IRIS_MODERATION_BLOCKLIST_ENABLED === "true";
  const checkResults = [
    postgresBackendSelected ? "postgres_backend_configured" : "postgres_backend_waiting",
    postgresConnectionConfigured ? "connection_env_configured" : "connection_env_waiting",
    migrationsReady ? "migration_status_configured" : "migration_evidence_waiting",
    backupReady ? "backup_status_configured" : "backup_evidence_waiting",
    indexesReady ? "index_status_configured" : "index_evidence_waiting",
    capacityReady ? "capacity_status_configured" : "capacity_evidence_waiting",
    moderationReady ? "moderation_status_configured" : "moderation_evidence_waiting",
  ];
  const readyCheckCount = checkResults.filter((result) =>
    result.endsWith("_configured")
  ).length;

  const report = {
    schema: "iris_postgres_migration_backup_evidence_boundary_v1",
    ok: false,
    status: "blocked",
    external_real_evidence_status: "external_real_evidence_blocked",
    next_readiness_state: "operator_review_required",
    production_ready_allowed: false,
    go_no_go: "no_go",
    postgres_evidence_summary: {
      schema: "iris_postgres_real_evidence_summary_v1",
      configured_env: configuredEnv,
      missing_env: missingEnv,
      configured_env_count: configuredEnv.length,
      missing_env_count: missingEnv.length,
      postgres_backend_selected: postgresBackendSelected,
      postgres_connection_configured: postgresConnectionConfigured,
      real_db_connection_attempted: false,
      migration_execution_attempted: false,
      backup_execution_attempted: false,
      restore_execution_attempted: false,
      real_db_evidence_status: "external_real_evidence_blocked",
      operator_confirmation_status: "operator_review_required",
    },
    migration_readiness_summary: {
      schema: "iris_postgres_migration_readiness_safe_summary_v1",
      readiness_status: "configuration_waiting",
      check_count: checkResults.length,
      ready_check_count: readyCheckCount,
      attention_check_count: checkResults.length - readyCheckCount,
      check_results: checkResults,
    },
    backup_restore_rehearsal_summary: {
      schema: "iris_postgres_backup_restore_rehearsal_safe_summary_v1",
      backup_rehearsal_status: "external_real_evidence_blocked",
      restore_rehearsal_status: "external_real_evidence_blocked",
      backup_evidence_status: "operator_review_required",
      restore_evidence_status: "operator_review_required",
      safe_status_only: true,
    },
    million_profile_readiness_summary: {
      schema: "iris_postgres_million_profile_readiness_safe_summary_v1",
      readiness_status: "external_real_evidence_blocked",
      target_profile_band: capacityReady
        ? "million_plus_configured"
        : "million_plus_evidence_waiting",
      index_status: indexesReady ? "configured" : "evidence_waiting",
      page_status: "evidence_waiting",
      cache_status: "evidence_waiting",
      migration_status: migrationsReady ? "configured" : "evidence_waiting",
      backup_status: backupReady ? "configured" : "evidence_waiting",
      production_ready_allowed: false,
    },
    candidate_boundary_summary: {
      schema: "iris_postgres_candidate_boundary_summary_v1",
      candidate_to_relationship_event_ledger_count: 0,
      selected_memory_ids_commit_input_count: 0,
      recall_candidate_commit_input_count: 0,
      relationship_update_candidate_to_aggregate_count: 0,
      memory_carryover_candidates_writer_count: 0,
      approved_schema_required: true,
    },
    raw_leak_guard_summary: {
      schema: "iris_postgres_raw_leak_guard_summary_v1",
      safe_summary_only: true,
      raw_db_value_count: 0,
      connection_string_value_count: 0,
      db_credential_value_count: 0,
      endpoint_value_count: 0,
      raw_sql_count: 0,
      backup_path_value_count: 0,
      raw_db_dump_count: 0,
      raw_memory_body_count: 0,
      private_viewer_id_count: 0,
      unsafe_value_leak_detected: false,
    },
    production_handoff_summary: {
      schema: "iris_postgres_migration_backup_handoff_summary_v1",
      real_db_not_connected: true,
      migration_not_executed: true,
      backup_not_executed: true,
      restore_not_executed: true,
      json_local_fixture_not_real_ready: true,
      safe_summary_only: true,
      production_ready_allowed: false,
      go_no_go: "no_go",
      next_validation_script:
        "node scripts/dev-postgres-migration-backup-evidence-boundary.js",
      next_preflight_script: "npm run dev:persistence:preflight",
      next_status_script: "npm run dev:persistence:status-roundtrip",
    },
    boundary_policy: {
      migration_status_check_count_result_only: true,
      backup_restore_safe_status_only: true,
      million_profile_index_page_cache_migration_backup_status_only: true,
      env_names_only: true,
      no_raw_db_values: true,
      no_connection_string_values: true,
      no_db_credential_values: true,
      no_endpoint_values: true,
      no_raw_sql: true,
      no_backup_paths: true,
      no_raw_db_dump: true,
      no_raw_memory_body: true,
      no_private_viewer_ids: true,
      candidate_requires_approved_validator: true,
      selected_memory_ids_not_commit_input: true,
      recall_candidate_not_commit_input: true,
      relationship_update_candidate_not_direct_aggregate: true,
      memory_carryover_candidates_not_direct_writer: true,
      json_local_fixture_not_production_ready: true,
      production_ready_not_allowed: true,
    },
  };

  report.raw_leak_guard_summary.unsafe_value_leak_detected =
    hasUnsafeValueLeak(report);
  report.ok =
    report.production_ready_allowed === false &&
    report.go_no_go === "no_go" &&
    report.postgres_evidence_summary.real_db_connection_attempted === false &&
    report.postgres_evidence_summary.migration_execution_attempted === false &&
    report.postgres_evidence_summary.backup_execution_attempted === false &&
    report.postgres_evidence_summary.restore_execution_attempted === false &&
    report.postgres_evidence_summary.real_db_evidence_status ===
      "external_real_evidence_blocked" &&
    report.million_profile_readiness_summary.production_ready_allowed === false &&
    report.candidate_boundary_summary
      .candidate_to_relationship_event_ledger_count === 0 &&
    report.candidate_boundary_summary.selected_memory_ids_commit_input_count === 0 &&
    report.candidate_boundary_summary.recall_candidate_commit_input_count === 0 &&
    report.candidate_boundary_summary
      .relationship_update_candidate_to_aggregate_count === 0 &&
    report.candidate_boundary_summary.memory_carryover_candidates_writer_count === 0 &&
    report.raw_leak_guard_summary.raw_db_value_count === 0 &&
    report.raw_leak_guard_summary.connection_string_value_count === 0 &&
    report.raw_leak_guard_summary.db_credential_value_count === 0 &&
    report.raw_leak_guard_summary.endpoint_value_count === 0 &&
    report.raw_leak_guard_summary.raw_sql_count === 0 &&
    report.raw_leak_guard_summary.backup_path_value_count === 0 &&
    report.raw_leak_guard_summary.raw_db_dump_count === 0 &&
    report.raw_leak_guard_summary.raw_memory_body_count === 0 &&
    report.raw_leak_guard_summary.private_viewer_id_count === 0 &&
    report.raw_leak_guard_summary.unsafe_value_leak_detected === false;

  assertPostgresMigrationBackupEvidenceBoundaryReportSafe(report);
  return report;
}

export function assertPostgresMigrationBackupEvidenceBoundaryReportSafe(
  report,
  context = "postgres migration backup evidence boundary"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  if (report.schema !== "iris_postgres_migration_backup_evidence_boundary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  assertFields(report, REPORT_FIELDS, context, "report");
  if (
    report.ok !== true ||
    report.status !== "blocked" ||
    report.external_real_evidence_status !== "external_real_evidence_blocked" ||
    report.next_readiness_state !== "operator_review_required" ||
    report.production_ready_allowed !== false ||
    report.go_no_go !== "no_go"
  ) {
    throw new ContractError(`${context}: no-go invariant mismatch`);
  }
  assertPostgresEvidenceSummarySafe(report.postgres_evidence_summary, context);
  assertMigrationReadinessSummarySafe(report.migration_readiness_summary, context);
  assertBackupRestoreSummarySafe(report.backup_restore_rehearsal_summary, context);
  assertMillionProfileSummarySafe(report.million_profile_readiness_summary, context);
  assertCandidateBoundarySummarySafe(report.candidate_boundary_summary, context);
  assertRawLeakGuardSummarySafe(report.raw_leak_guard_summary, context);
  assertProductionHandoffSummarySafe(report.production_handoff_summary, context);
  assertBoundaryPolicySafe(report.boundary_policy, context);
  assertNoWorldCommand(report, context);
  assertNoDirectMemoryWrite(report, context);
  assertNoDirectCandidateCommit(report, context);
  assertNoUnsafeReportLeak(report, context);
}

function assertPostgresEvidenceSummarySafe(summary, context) {
  assertFields(summary, POSTGRES_EVIDENCE_FIELDS, context, "postgres evidence");
  assertEnvNameList(summary.configured_env, context, "configured_env");
  assertEnvNameList(summary.missing_env, context, "missing_env");
  if (
    summary.schema !== "iris_postgres_real_evidence_summary_v1" ||
    summary.configured_env_count !== summary.configured_env.length ||
    summary.missing_env_count !== summary.missing_env.length ||
    summary.configured_env_count + summary.missing_env_count !==
      POSTGRES_ENV_NAMES.length ||
    typeof summary.postgres_backend_selected !== "boolean" ||
    typeof summary.postgres_connection_configured !== "boolean" ||
    summary.real_db_connection_attempted !== false ||
    summary.migration_execution_attempted !== false ||
    summary.backup_execution_attempted !== false ||
    summary.restore_execution_attempted !== false ||
    summary.real_db_evidence_status !== "external_real_evidence_blocked" ||
    summary.operator_confirmation_status !== "operator_review_required"
  ) {
    throw new ContractError(`${context}: postgres evidence summary mismatch`);
  }
}

function assertMigrationReadinessSummarySafe(summary, context) {
  assertFields(summary, MIGRATION_READINESS_FIELDS, context, "migration readiness");
  if (
    summary.schema !== "iris_postgres_migration_readiness_safe_summary_v1" ||
    summary.readiness_status !== "configuration_waiting" ||
    !Array.isArray(summary.check_results) ||
    summary.check_count !== summary.check_results.length ||
    summary.ready_check_count + summary.attention_check_count !== summary.check_count
  ) {
    throw new ContractError(`${context}: migration readiness summary mismatch`);
  }
  assertSafeLabelList(summary.check_results, context, "check_results");
}

function assertBackupRestoreSummarySafe(summary, context) {
  assertFields(summary, BACKUP_RESTORE_FIELDS, context, "backup restore");
  if (
    summary.schema !== "iris_postgres_backup_restore_rehearsal_safe_summary_v1" ||
    summary.backup_rehearsal_status !== "external_real_evidence_blocked" ||
    summary.restore_rehearsal_status !== "external_real_evidence_blocked" ||
    summary.backup_evidence_status !== "operator_review_required" ||
    summary.restore_evidence_status !== "operator_review_required" ||
    summary.safe_status_only !== true
  ) {
    throw new ContractError(`${context}: backup restore summary mismatch`);
  }
}

function assertMillionProfileSummarySafe(summary, context) {
  assertFields(summary, MILLION_PROFILE_FIELDS, context, "million profile");
  if (
    summary.schema !== "iris_postgres_million_profile_readiness_safe_summary_v1" ||
    summary.readiness_status !== "external_real_evidence_blocked" ||
    summary.production_ready_allowed !== false
  ) {
    throw new ContractError(`${context}: million profile summary mismatch`);
  }
  for (const field of [
    "target_profile_band",
    "index_status",
    "page_status",
    "cache_status",
    "migration_status",
    "backup_status",
  ]) {
    if (!isSafeLabel(summary[field])) {
      throw new ContractError(`${context}: unsafe million profile label`, {
        field,
      });
    }
  }
}

function assertCandidateBoundarySummarySafe(summary, context) {
  assertFields(summary, CANDIDATE_BOUNDARY_FIELDS, context, "candidate boundary");
  for (const field of [
    "candidate_to_relationship_event_ledger_count",
    "selected_memory_ids_commit_input_count",
    "recall_candidate_commit_input_count",
    "relationship_update_candidate_to_aggregate_count",
    "memory_carryover_candidates_writer_count",
  ]) {
    if (summary[field] !== 0) {
      throw new ContractError(`${context}: candidate boundary count must remain zero`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_postgres_candidate_boundary_summary_v1" ||
    summary.approved_schema_required !== true
  ) {
    throw new ContractError(`${context}: candidate boundary summary mismatch`);
  }
}

function assertRawLeakGuardSummarySafe(summary, context) {
  assertFields(summary, RAW_LEAK_GUARD_FIELDS, context, "raw leak guard");
  if (
    summary.schema !== "iris_postgres_raw_leak_guard_summary_v1" ||
    summary.safe_summary_only !== true ||
    summary.unsafe_value_leak_detected !== false
  ) {
    throw new ContractError(`${context}: raw leak guard mismatch`);
  }
  for (const field of [
    "raw_db_value_count",
    "connection_string_value_count",
    "db_credential_value_count",
    "endpoint_value_count",
    "raw_sql_count",
    "backup_path_value_count",
    "raw_db_dump_count",
    "raw_memory_body_count",
    "private_viewer_id_count",
  ]) {
    if (summary[field] !== 0) {
      throw new ContractError(`${context}: raw leak count must remain zero`, {
        field,
      });
    }
  }
}

function assertProductionHandoffSummarySafe(summary, context) {
  assertFields(summary, HANDOFF_FIELDS, context, "production handoff");
  for (const field of [
    "real_db_not_connected",
    "migration_not_executed",
    "backup_not_executed",
    "restore_not_executed",
    "json_local_fixture_not_real_ready",
    "safe_summary_only",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: handoff flag failed`, { field });
    }
  }
  if (
    summary.schema !== "iris_postgres_migration_backup_handoff_summary_v1" ||
    summary.production_ready_allowed !== false ||
    summary.go_no_go !== "no_go" ||
    summary.next_validation_script !==
      "node scripts/dev-postgres-migration-backup-evidence-boundary.js" ||
    summary.next_preflight_script !== "npm run dev:persistence:preflight" ||
    summary.next_status_script !== "npm run dev:persistence:status-roundtrip"
  ) {
    throw new ContractError(`${context}: handoff no-go mismatch`);
  }
}

function assertBoundaryPolicySafe(policy, context) {
  assertFields(policy, BOUNDARY_FIELDS, context, "boundary policy");
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary flag failed`, { field });
    }
  }
}

function assertFields(value, expectedFields, context, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: ${label} required`);
  }
  for (const field of Object.keys(value)) {
    if (!expectedFields.has(field)) {
      throw new ContractError(`${context}: unexpected ${label} field`, { field });
    }
  }
  for (const field of expectedFields) {
    if (!(field in value)) {
      throw new ContractError(`${context}: missing ${label} field`, { field });
    }
  }
}

function assertEnvNameList(names, context, field) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: ${field} must be an array`);
  }
  for (const name of names) {
    if (!POSTGRES_ENV_NAMES.includes(name) || !isSafeEnvName(name)) {
      throw new ContractError(`${context}: unsafe env name`, { field });
    }
  }
}

function assertSafeLabelList(labels, context, field) {
  if (!Array.isArray(labels)) {
    throw new ContractError(`${context}: ${field} must be an array`);
  }
  for (const label of labels) {
    if (!isSafeLabel(label)) {
      throw new ContractError(`${context}: unsafe label`, { field });
    }
  }
}

function hasUnsafeValueLeak(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return unsafeStringValue(value);
  if (Array.isArray(value)) return value.some((item) => hasUnsafeValueLeak(item));
  if (typeof value === "object") {
    return Object.values(value).some((item) => hasUnsafeValueLeak(item));
  }
  return false;
}

function assertNoUnsafeReportLeak(report, context) {
  if (hasUnsafeValueLeak(report)) {
    throw new ContractError(`${context}: unsafe value leak detected`);
  }
}

function unsafeStringValue(value) {
  const text = String(value ?? "");
  if (isSafeEnvName(text) || isSafeScriptName(text) || isSafeLabel(text)) {
    return false;
  }
  return (
    /https?:\/\//i.test(text) ||
    /\b(authorization|bearer|api[_-]?key|oauth|password|secret|token)\b/i.test(
      text
    ) ||
    /\b(connection string|db credential|endpoint value|raw sql|backup path)\b/i.test(
      text
    ) ||
    /\b(raw db|db dump|raw memory|private viewer|viewer_id|candidate payload)\b/i.test(
      text
    )
  );
}

function isSafeEnvName(value) {
  return /^IRIS_[A-Z0-9_]+$/.test(String(value ?? ""));
}

function isSafeScriptName(value) {
  return /^npm run dev:[a-z0-9:-]+$/.test(String(value ?? "")) ||
    /^node scripts\/dev-[a-z0-9-]+\.js$/.test(String(value ?? ""));
}

function isSafeLabel(value) {
  return /^[a-z0-9_]+$/.test(String(value ?? ""));
}

function safeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.trunc(number));
}
