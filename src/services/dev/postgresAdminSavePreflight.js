import { ContractError } from "../../core/contracts.js";
import {
  assertPostgresPoolFactoryPlanSafe,
  createPostgresPoolFactoryPlan,
} from "../persistence/postgresPoolFactoryPlan.js";

const REPORT_SCHEMA = "iris_postgres_admin_save_preflight_v1";
const POSTGRES_ADMIN_SAVE_PREFLIGHT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "postgres_pool_factory_plan",
  "admin_async_save_gate_preflight",
  "boundary_policy",
]);
const ADMIN_ASYNC_SAVE_GATE_PREFLIGHT_FIELDS = new Set([
  "schema",
  "readiness_status",
  "gate_enabled",
  "mock_postgres_save_enabled",
  "admin_authenticated_flag_enabled",
  "store_path_configured",
  "audit_log_path_configured",
  "real_postgres_pool_required_for_this_preflight",
  "real_postgres_pool_created_by_preflight",
  "db_connection_attempted_by_preflight",
  "required_env_names",
  "missing_required_env_names",
  "next_operator_step_id",
  "next_safe_verification_script",
  "operator_guidance_summary",
]);
const ADMIN_ASYNC_SAVE_GATE_GUIDANCE_FIELDS = new Set([
  "schema",
  "guidance_status",
  "env_names_only",
  "next_step_id",
  "missing_required_env_count",
  "missing_required_env_names",
  "next_safe_verification_script",
  "real_database_connection_required_for_guidance",
]);
const DB_PREFLIGHT_ROUTE_CONTRACT_MANIFEST_FIELDS = new Set([
  "schema",
  "contract_status",
  "route_count",
  "routes",
  "boundary_policy",
]);
const DB_PREFLIGHT_ROUTE_CONTRACT_FIELDS = new Set([
  "schema",
  "route_id",
  "required_status_fields",
  "required_summary_fields",
  "safe_summary_required",
  "db_connection_required_for_validation",
]);
const DB_PREFLIGHT_COMPONENT_LABEL_SUMMARY_FIELDS = new Set([
  "schema",
  "component_count",
  "component_labels",
  "boundary_policy",
]);
const DB_PREFLIGHT_BACKEND_CLASSIFIER_FIELDS = new Set([
  "schema",
  "environment_label",
  "backend_label",
  "classifier_status",
  "production_persistence_ready",
  "postgres_verified",
  "fallback_backend",
  "attention_reason",
  "boundary_policy",
]);
const DB_PREFLIGHT_LOCAL_FALLBACK_CLASSIFIER_FIELDS = new Set([
  "schema",
  "mode_label",
  "backend_label",
  "classifier_status",
  "safe_fallback_backend",
  "production_recommended_backend",
  "production_persistence_ready",
  "attention_reason",
  "boundary_policy",
]);
const DB_PREFLIGHT_SCHEMA_MISSING_SUMMARY_FIELDS = new Set([
  "schema",
  "schema_readiness_status",
  "missing_schema_count",
  "missing_schema_names",
  "boundary_policy",
]);
const DB_PREFLIGHT_MIGRATION_PENDING_SUMMARY_FIELDS = new Set([
  "schema",
  "migration_readiness_status",
  "pending_count",
  "applied_count",
  "missing_count",
  "migration_statuses",
  "boundary_policy",
]);
const DB_PREFLIGHT_MIGRATION_STATUS_FIELDS = new Set([
  "migration_name",
  "migration_status",
]);
const DB_PREFLIGHT_INDEX_MISSING_SUMMARY_FIELDS = new Set([
  "schema",
  "index_readiness_status",
  "missing_index_count",
  "missing_index_names",
  "boundary_policy",
]);
const DB_PREFLIGHT_BACKUP_REHEARSAL_SUMMARY_FIELDS = new Set([
  "schema",
  "rehearsal_status",
  "pass_count",
  "fail_count",
  "stale_count",
  "boundary_policy",
]);
const DB_PREFLIGHT_ADMIN_PAGE_SUMMARY_FIELDS = new Set([
  "schema",
  "page_status",
  "schema_status",
  "index_status",
  "migration_status",
  "backup_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const DB_PREFLIGHT_RESTORE_DRY_RUN_GUARD_FIELDS = new Set([
  "schema",
  "restore_readiness_status",
  "dry_run_completed",
  "schema_validation_passed",
  "ready_for_restore_rehearsal",
  "attention_reason",
  "boundary_policy",
]);
const DB_PREFLIGHT_SLOW_QUERY_DIAGNOSTIC_FIELDS = new Set([
  "schema",
  "diagnostic_status",
  "slow_query_count",
  "threshold_label",
  "boundary_policy",
]);
const DB_PREFLIGHT_COMPONENT_LABEL_BOUNDARY_FIELDS = new Set([
  "safe_component_labels_only",
  "storage_connection_values_excluded",
  "identity_values_excluded",
  "credential_values_excluded",
]);
const DB_PREFLIGHT_ADMIN_PAGE_BOUNDARY_FIELDS = new Set([
  "status_only",
  "schema_index_migration_backup_status_only",
  "no_connection_values",
  "no_credential_values",
  "no_sql_values",
  "no_query_values",
]);
const DB_PREFLIGHT_SAFE_COMPONENT_LABELS = new Set([
  "postgres",
  "json",
  "fallback",
  "cache",
  "index",
  "migration",
  "backup",
]);
const DB_PREFLIGHT_REQUIRED_STATUS_FIELDS = [
  "readiness_status",
  "db_connection_attempted_by_preflight",
  "real_postgres_pool_created_by_preflight",
];
const DB_PREFLIGHT_REQUIRED_SUMMARY_FIELDS = [
  "schema",
  "guidance_status",
  "env_names_only",
  "missing_required_env_count",
  "next_safe_verification_script",
];

export function createPostgresAdminSavePreflightReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const poolPlan = createPostgresPoolFactoryPlan({ env, generatedAtMs });
  assertPostgresPoolFactoryPlanSafe(poolPlan);

  const gateEnabled =
    env.IRIS_OPERATOR_POLICY_ASYNC_SAVE_GATE_ENABLED === "true";
  const postgresMockEnabled =
    env.IRIS_OPERATOR_POLICY_POSTGRES_MOCK_SAVE_ENABLED === "true";
  const adminAuthenticated =
    env.IRIS_OPERATOR_POLICY_ADMIN_AUTHENTICATED === "true";
  const storePathConfigured = Boolean(
    String(env.IRIS_OPERATOR_POLICY_STORE_PATH ?? "").trim()
  );
  const auditPathConfigured = Boolean(
    String(env.IRIS_OPERATOR_POLICY_AUDIT_LOG_PATH ?? "").trim()
  );
  const gateReady =
    gateEnabled &&
    postgresMockEnabled &&
    adminAuthenticated &&
    storePathConfigured &&
    auditPathConfigured;
  const requiredEnvReadiness = [
    ["IRIS_OPERATOR_POLICY_ASYNC_SAVE_GATE_ENABLED", gateEnabled],
    ["IRIS_OPERATOR_POLICY_POSTGRES_MOCK_SAVE_ENABLED", postgresMockEnabled],
    ["IRIS_OPERATOR_POLICY_ADMIN_AUTHENTICATED", adminAuthenticated],
    ["IRIS_OPERATOR_POLICY_STORE_PATH", storePathConfigured],
    ["IRIS_OPERATOR_POLICY_AUDIT_LOG_PATH", auditPathConfigured],
  ];
  const missingRequiredEnvNames = requiredEnvReadiness
    .filter(([, configured]) => configured !== true)
    .map(([envName]) => envName);

  const report = {
    schema: REPORT_SCHEMA,
    generated_at_ms: generatedAtMs,
    postgres_pool_factory_plan: poolPlan,
    admin_async_save_gate_preflight: {
      schema: "iris_operator_policy_admin_async_save_gate_preflight_v1",
      readiness_status: gateReady
        ? "ready_for_mock_postgres_save_gate"
        : "configuration_waiting",
      gate_enabled: gateEnabled,
      mock_postgres_save_enabled: postgresMockEnabled,
      admin_authenticated_flag_enabled: adminAuthenticated,
      store_path_configured: storePathConfigured,
      audit_log_path_configured: auditPathConfigured,
      real_postgres_pool_required_for_this_preflight: false,
      real_postgres_pool_created_by_preflight: false,
      db_connection_attempted_by_preflight: false,
      required_env_names: requiredEnvReadiness.map(([envName]) => envName),
      missing_required_env_names: missingRequiredEnvNames,
      next_operator_step_id:
        missingRequiredEnvNames.length > 0
          ? "configure_admin_async_save_gate_env"
          : "run_postgres_admin_save_preflight",
      next_safe_verification_script:
        "npm run dev:operator-policy:async-save-gate-roundtrip",
      operator_guidance_summary: {
        schema: "iris_operator_policy_admin_async_save_gate_guidance_v1",
        guidance_status: gateReady
          ? "ready_for_preflight_recheck"
          : "configuration_waiting",
        env_names_only: true,
        next_step_id:
          missingRequiredEnvNames.length > 0
            ? "configure_admin_async_save_gate_env"
            : "run_postgres_admin_save_preflight",
        missing_required_env_count: missingRequiredEnvNames.length,
        missing_required_env_names: missingRequiredEnvNames,
        next_safe_verification_script:
          "npm run dev:operator-policy:async-save-gate-roundtrip",
        real_database_connection_required_for_guidance: false,
      },
    },
    boundary_policy: createBoundaryPolicy(),
  };

  assertPostgresAdminSavePreflightReportSafe(report);
  return report;
}

export function createDbPreflightRouteContractManifest({
  routes = null,
} = {}) {
  const routeContracts =
    routes ??
    [
      dbPreflightRouteContract({
        routeId: "postgres_admin_save_preflight",
      }),
      dbPreflightRouteContract({
        routeId: "persistence_preflight",
      }),
    ];
  const manifest = {
    schema: "iris_db_preflight_route_contract_manifest_v1",
    contract_status: "manifest_ready",
    route_count: routeContracts.length,
    routes: routeContracts,
    boundary_policy: {
      manifest_only: true,
      route_ids_only: true,
      field_names_only: true,
      safe_summary_required: true,
      no_connection_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_sql_values: true,
    },
  };
  assertDbPreflightRouteContractManifestSafe(manifest);
  return manifest;
}

export function createDbPreflightSafeComponentLabelSummary({
  components = [],
} = {}) {
  const componentList = Array.isArray(components) ? components : [];
  const componentLabels = [
    ...new Set(
      componentList
        .map((component) => safeDbPreflightComponentLabel(component))
        .filter(Boolean)
    ),
  ].sort();
  const summary = {
    schema: "iris_db_preflight_safe_component_label_summary_v1",
    component_count: componentLabels.length,
    component_labels: componentLabels,
    boundary_policy: {
      safe_component_labels_only: true,
      storage_connection_values_excluded: true,
      identity_values_excluded: true,
      credential_values_excluded: true,
    },
  };
  assertDbPreflightSafeComponentLabelSummarySafe(summary);
  return summary;
}

export function createDbPreflightProductionBackendClassifier({
  environment = "production",
  backend = "json",
  postgresVerified = false,
} = {}) {
  const environmentLabel = safeDbPreflightEnvironmentLabel(environment);
  const backendLabel = safeDbPreflightBackendLabel(backend);
  const productionMode = environmentLabel === "production";
  const postgresReady =
    productionMode && backendLabel === "postgres" && postgresVerified === true;
  const classifier = {
    schema: "iris_db_preflight_production_backend_classifier_v1",
    environment_label: environmentLabel,
    backend_label: backendLabel,
    classifier_status: postgresReady
      ? "ready"
      : productionMode
        ? "BLOCKED"
        : "attention",
    production_persistence_ready: postgresReady,
    postgres_verified: postgresVerified === true,
    fallback_backend: backendLabel !== "postgres",
    attention_reason: postgresReady
      ? null
      : backendLabel === "postgres"
        ? "postgres_unverified"
        : "production_backend_not_postgres",
    boundary_policy: {
      labels_only: true,
      no_connection_values: true,
      no_credential_values: true,
      no_network_values: true,
      no_ready_sweetening: true,
    },
  };
  assertDbPreflightProductionBackendClassifierSafe(classifier);
  return classifier;
}

export function createDbPreflightLocalFallbackClassifier({
  mode = "local",
  backend = "json",
} = {}) {
  const modeLabel = safeDbPreflightFallbackModeLabel(mode);
  const backendLabel = safeDbPreflightBackendLabel(backend);
  const safeFallbackBackend =
    backendLabel === "json" || backendLabel === "fallback";
  const classifier = {
    schema: "iris_db_preflight_local_fallback_classifier_v1",
    mode_label: modeLabel,
    backend_label: backendLabel,
    classifier_status: safeFallbackBackend
      ? "safe_fallback"
      : "attention",
    safe_fallback_backend: safeFallbackBackend,
    production_recommended_backend: "postgres",
    production_persistence_ready: false,
    attention_reason: safeFallbackBackend
      ? null
      : "fallback_backend_not_json",
    boundary_policy: {
      labels_only: true,
      fallback_separated_from_production: true,
      no_connection_values: true,
      no_credential_values: true,
      no_ready_sweetening: true,
    },
  };
  assertDbPreflightLocalFallbackClassifierSafe(classifier);
  return classifier;
}

export function createDbPreflightSchemaMissingSafeSummary({
  missingSchemas = [],
} = {}) {
  const schemaNames = [
    ...new Set(
      (Array.isArray(missingSchemas) ? missingSchemas : [])
        .map((schemaName) => safeDbPreflightSchemaName(schemaName))
        .filter(Boolean)
    ),
  ].sort();
  const summary = {
    schema: "iris_db_preflight_schema_missing_safe_summary_v1",
    schema_readiness_status:
      schemaNames.length > 0 ? "schema_missing" : "schema_ready",
    missing_schema_count: schemaNames.length,
    missing_schema_names: schemaNames,
    boundary_policy: {
      schema_names_only: true,
      count_only: true,
      no_sql_values: true,
      no_connection_values: true,
      no_credential_values: true,
    },
  };
  assertDbPreflightSchemaMissingSafeSummarySafe(summary);
  return summary;
}

export function createDbPreflightMigrationPendingSafeSummary({
  migrations = [],
} = {}) {
  const migrationStatuses = (Array.isArray(migrations) ? migrations : [])
    .map((migration) => safeDbPreflightMigrationStatus(migration))
    .filter(Boolean)
    .sort((a, b) => a.migration_name.localeCompare(b.migration_name));
  const pendingCount = migrationStatuses.filter(
    (migration) => migration.migration_status === "pending"
  ).length;
  const appliedCount = migrationStatuses.filter(
    (migration) => migration.migration_status === "applied"
  ).length;
  const missingCount = migrationStatuses.filter(
    (migration) => migration.migration_status === "missing"
  ).length;
  const summary = {
    schema: "iris_db_preflight_migration_pending_safe_summary_v1",
    migration_readiness_status:
      pendingCount > 0 || missingCount > 0
        ? "migration_attention"
        : "migration_ready",
    pending_count: pendingCount,
    applied_count: appliedCount,
    missing_count: missingCount,
    migration_statuses: migrationStatuses,
    boundary_policy: {
      migration_names_and_status_only: true,
      counts_only: true,
      no_sql_values: true,
      no_connection_values: true,
      no_credential_values: true,
    },
  };
  assertDbPreflightMigrationPendingSafeSummarySafe(summary);
  return summary;
}

export function createDbPreflightIndexMissingSafeSummary({
  missingIndexes = [],
} = {}) {
  const indexNames = [
    ...new Set(
      (Array.isArray(missingIndexes) ? missingIndexes : [])
        .map((indexName) => safeDbPreflightIndexName(indexName))
        .filter(Boolean)
    ),
  ].sort();
  const summary = {
    schema: "iris_db_preflight_index_missing_safe_summary_v1",
    index_readiness_status:
      indexNames.length > 0 ? "index_missing" : "index_ready",
    missing_index_count: indexNames.length,
    missing_index_names: indexNames,
    boundary_policy: {
      index_names_only: true,
      status_only: true,
      no_query_values: true,
      no_connection_values: true,
      no_credential_values: true,
    },
  };
  assertDbPreflightIndexMissingSafeSummarySafe(summary);
  return summary;
}

export function createDbPreflightBackupRehearsalSafeSummary({
  checks = [],
} = {}) {
  const safeChecks = (Array.isArray(checks) ? checks : []).map((check) =>
    safeDbPreflightBackupCheckStatus(check)
  );
  const passCount = safeChecks.filter((status) => status === "pass").length;
  const failCount = safeChecks.filter((status) => status === "fail").length;
  const staleCount = safeChecks.filter((status) => status === "stale").length;
  const summary = {
    schema: "iris_db_preflight_backup_rehearsal_safe_summary_v1",
    rehearsal_status:
      failCount > 0 ? "fail" : staleCount > 0 ? "stale" : "pass",
    pass_count: passCount,
    fail_count: failCount,
    stale_count: staleCount,
    boundary_policy: {
      status_and_counts_only: true,
      no_location_values: true,
      no_dump_values: true,
      no_credential_values: true,
    },
  };
  assertDbPreflightBackupRehearsalSafeSummarySafe(summary);
  return summary;
}

export function createDbPreflightAdminPageSummary({
  schemaSummary = null,
  indexSummary = null,
  migrationSummary = null,
  backupSummary = null,
} = {}) {
  const safeSchemaSummary =
    schemaSummary ?? createDbPreflightSchemaMissingSafeSummary();
  const safeIndexSummary =
    indexSummary ?? createDbPreflightIndexMissingSafeSummary();
  const safeMigrationSummary =
    migrationSummary ?? createDbPreflightMigrationPendingSafeSummary();
  const safeBackupSummary =
    backupSummary ?? createDbPreflightBackupRehearsalSafeSummary();
  assertDbPreflightSchemaMissingSafeSummarySafe(
    safeSchemaSummary,
    "DB preflight admin page schema summary"
  );
  assertDbPreflightIndexMissingSafeSummarySafe(
    safeIndexSummary,
    "DB preflight admin page index summary"
  );
  assertDbPreflightMigrationPendingSafeSummarySafe(
    safeMigrationSummary,
    "DB preflight admin page migration summary"
  );
  assertDbPreflightBackupRehearsalSafeSummarySafe(
    safeBackupSummary,
    "DB preflight admin page backup summary"
  );
  const statuses = {
    schema_status: safeSchemaSummary.schema_readiness_status,
    index_status: safeIndexSummary.index_readiness_status,
    migration_status: safeMigrationSummary.migration_readiness_status,
    backup_status: safeBackupSummary.rehearsal_status,
  };
  const pageReady =
    statuses.schema_status === "schema_ready" &&
    statuses.index_status === "index_ready" &&
    statuses.migration_status === "migration_ready" &&
    statuses.backup_status === "pass";
  const summary = {
    schema: "iris_db_preflight_admin_page_summary_v1",
    page_status: pageReady ? "ready" : "attention",
    ...statuses,
    boundary_policy: Object.fromEntries(
      [...DB_PREFLIGHT_ADMIN_PAGE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertDbPreflightAdminPageSummarySafe(summary);
  return summary;
}

export function assertDbPreflightAdminPageSummarySafe(
  summary,
  context = "DB preflight admin page summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_db_preflight_admin_page_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!DB_PREFLIGHT_ADMIN_PAGE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (!["ready", "attention"].includes(summary.page_status)) {
    throw new ContractError(`${context}: invalid page status`);
  }
  if (!["schema_ready", "schema_missing"].includes(summary.schema_status)) {
    throw new ContractError(`${context}: invalid schema status`);
  }
  if (!["index_ready", "index_missing"].includes(summary.index_status)) {
    throw new ContractError(`${context}: invalid index status`);
  }
  if (!["migration_ready", "migration_attention"].includes(summary.migration_status)) {
    throw new ContractError(`${context}: invalid migration status`);
  }
  if (!["pass", "fail", "stale"].includes(summary.backup_status)) {
    throw new ContractError(`${context}: invalid backup status`);
  }
  const expectedReady =
    summary.schema_status === "schema_ready" &&
    summary.index_status === "index_ready" &&
    summary.migration_status === "migration_ready" &&
    summary.backup_status === "pass";
  if (summary.page_status !== (expectedReady ? "ready" : "attention")) {
    throw new ContractError(`${context}: invalid page aggregate status`);
  }
  assertDbPreflightAdminPageBoundaryPolicy(summary.boundary_policy, context);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
  assertNoDbPreflightUnsafeText(summary, context);
}

export function createDbPreflightRestoreDryRunGuard({
  dryRunCompleted = false,
  schemaValidationPassed = false,
} = {}) {
  const dryRunReady = dryRunCompleted === true;
  const schemaReady = schemaValidationPassed === true;
  const readyForRestoreRehearsal = dryRunReady && schemaReady;
  const guard = {
    schema: "iris_db_preflight_restore_dry_run_guard_v1",
    restore_readiness_status: readyForRestoreRehearsal
      ? "restore_rehearsal_ready"
      : "restore_rehearsal_blocked",
    dry_run_completed: dryRunReady,
    schema_validation_passed: schemaReady,
    ready_for_restore_rehearsal: readyForRestoreRehearsal,
    attention_reason: readyForRestoreRehearsal
      ? null
      : !dryRunReady
        ? "dry_run_required"
        : "schema_validation_required",
    boundary_policy: {
      status_and_booleans_only: true,
      no_backup_values: true,
      no_connection_values: true,
      no_credential_values: true,
      no_restore_execution: true,
    },
  };
  assertDbPreflightRestoreDryRunGuardSafe(guard);
  return guard;
}

export function createDbPreflightSlowQueryDiagnosticSafeSummary({
  slowQueryCount = 0,
  threshold = "default",
} = {}) {
  const count = clampDbPreflightCount(slowQueryCount);
  const summary = {
    schema: "iris_db_preflight_slow_query_diagnostic_safe_summary_v1",
    diagnostic_status: count > 0 ? "attention" : "ok",
    slow_query_count: count,
    threshold_label: safeDbPreflightThresholdLabel(threshold),
    boundary_policy: {
      status_count_threshold_only: true,
      no_sql_values: true,
      no_query_values: true,
      no_connection_values: true,
      no_credential_values: true,
    },
  };
  assertDbPreflightSlowQueryDiagnosticSafeSummarySafe(summary);
  return summary;
}

export function assertDbPreflightRouteContractManifestSafe(
  manifest,
  context = "DB preflight route contract manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest required`);
  }
  if (manifest.schema !== "iris_db_preflight_route_contract_manifest_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(manifest)) {
    if (!DB_PREFLIGHT_ROUTE_CONTRACT_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`);
    }
  }
  if (manifest.contract_status !== "manifest_ready") {
    throw new ContractError(`${context}: invalid contract status`);
  }
  if (!Array.isArray(manifest.routes) || manifest.routes.length === 0) {
    throw new ContractError(`${context}: routes required`);
  }
  if (manifest.route_count !== manifest.routes.length) {
    throw new ContractError(`${context}: route count mismatch`);
  }
  const seen = new Set();
  for (const route of manifest.routes) {
    assertDbPreflightRouteContractSafe(route, context);
    if (seen.has(route.route_id)) {
      throw new ContractError(`${context}: duplicate route`);
    }
    seen.add(route.route_id);
  }
  assertDbPreflightBoundaryPolicy(manifest.boundary_policy, context);
  assertNoDbPreflightUnsafeText(manifest, context);
}

export function assertDbPreflightSafeComponentLabelSummarySafe(
  summary,
  context = "DB preflight component label summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_db_preflight_safe_component_label_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!DB_PREFLIGHT_COMPONENT_LABEL_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (!Array.isArray(summary.component_labels)) {
    throw new ContractError(`${context}: component labels required`);
  }
  if (summary.component_count !== summary.component_labels.length) {
    throw new ContractError(`${context}: component count mismatch`);
  }
  const seen = new Set();
  for (const label of summary.component_labels) {
    if (!DB_PREFLIGHT_SAFE_COMPONENT_LABELS.has(label)) {
      throw new ContractError(`${context}: unsafe component label`);
    }
    if (seen.has(label)) {
      throw new ContractError(`${context}: duplicate component label`);
    }
    seen.add(label);
  }
  assertDbPreflightComponentLabelBoundaryPolicy(
    summary.boundary_policy,
    context
  );
  assertNoDbPreflightUnsafeText(summary, context);
}

export function assertDbPreflightProductionBackendClassifierSafe(
  classifier,
  context = "DB preflight production backend classifier"
) {
  if (!classifier || typeof classifier !== "object" || Array.isArray(classifier)) {
    throw new ContractError(`${context}: classifier required`);
  }
  if (
    classifier.schema !== "iris_db_preflight_production_backend_classifier_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(classifier)) {
    if (!DB_PREFLIGHT_BACKEND_CLASSIFIER_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected classifier field`);
    }
  }
  if (
    classifier.environment_label !== "production" &&
    classifier.environment_label !== "local"
  ) {
    throw new ContractError(`${context}: invalid environment label`);
  }
  if (!DB_PREFLIGHT_SAFE_COMPONENT_LABELS.has(classifier.backend_label)) {
    throw new ContractError(`${context}: invalid backend label`);
  }
  if (!["ready", "BLOCKED", "attention"].includes(classifier.classifier_status)) {
    throw new ContractError(`${context}: invalid classifier status`);
  }
  for (const field of [
    "production_persistence_ready",
    "postgres_verified",
    "fallback_backend",
  ]) {
    if (typeof classifier[field] !== "boolean") {
      throw new ContractError(`${context}: invalid boolean ${field}`);
    }
  }
  const productionMode = classifier.environment_label === "production";
  const postgresReady =
    productionMode &&
    classifier.backend_label === "postgres" &&
    classifier.postgres_verified === true;
  if (classifier.production_persistence_ready !== postgresReady) {
    throw new ContractError(`${context}: invalid production readiness`);
  }
  if (productionMode && !postgresReady && classifier.classifier_status !== "BLOCKED") {
    throw new ContractError(`${context}: production backend must stay blocked`);
  }
  if (!productionMode && classifier.classifier_status === "ready") {
    throw new ContractError(`${context}: local fallback cannot be production ready`);
  }
  if (!postgresReady && typeof classifier.attention_reason !== "string") {
    throw new ContractError(`${context}: attention reason required`);
  }
  assertDbPreflightClassifierBoundaryPolicy(classifier.boundary_policy, context);
  assertNoDbPreflightUnsafeText(classifier, context);
}

export function assertDbPreflightLocalFallbackClassifierSafe(
  classifier,
  context = "DB preflight local fallback classifier"
) {
  if (!classifier || typeof classifier !== "object" || Array.isArray(classifier)) {
    throw new ContractError(`${context}: classifier required`);
  }
  if (classifier.schema !== "iris_db_preflight_local_fallback_classifier_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(classifier)) {
    if (!DB_PREFLIGHT_LOCAL_FALLBACK_CLASSIFIER_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected classifier field`);
    }
  }
  if (!["local", "mvp", "rehearsal", "fallback"].includes(classifier.mode_label)) {
    throw new ContractError(`${context}: invalid mode label`);
  }
  if (!DB_PREFLIGHT_SAFE_COMPONENT_LABELS.has(classifier.backend_label)) {
    throw new ContractError(`${context}: invalid backend label`);
  }
  if (!["safe_fallback", "attention"].includes(classifier.classifier_status)) {
    throw new ContractError(`${context}: invalid classifier status`);
  }
  if (classifier.production_recommended_backend !== "postgres") {
    throw new ContractError(`${context}: invalid production backend label`);
  }
  for (const field of [
    "safe_fallback_backend",
    "production_persistence_ready",
  ]) {
    if (typeof classifier[field] !== "boolean") {
      throw new ContractError(`${context}: invalid boolean ${field}`);
    }
  }
  if (classifier.production_persistence_ready !== false) {
    throw new ContractError(`${context}: fallback must not be production ready`);
  }
  const expectedSafeFallback =
    classifier.backend_label === "json" || classifier.backend_label === "fallback";
  if (classifier.safe_fallback_backend !== expectedSafeFallback) {
    throw new ContractError(`${context}: invalid fallback status`);
  }
  if (!expectedSafeFallback && typeof classifier.attention_reason !== "string") {
    throw new ContractError(`${context}: attention reason required`);
  }
  assertDbPreflightLocalFallbackBoundaryPolicy(
    classifier.boundary_policy,
    context
  );
  assertNoDbPreflightUnsafeText(classifier, context);
}

export function assertDbPreflightSchemaMissingSafeSummarySafe(
  summary,
  context = "DB preflight schema missing safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_db_preflight_schema_missing_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!DB_PREFLIGHT_SCHEMA_MISSING_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (!["schema_missing", "schema_ready"].includes(summary.schema_readiness_status)) {
    throw new ContractError(`${context}: invalid schema status`);
  }
  if (!Array.isArray(summary.missing_schema_names)) {
    throw new ContractError(`${context}: missing schema names required`);
  }
  if (summary.missing_schema_count !== summary.missing_schema_names.length) {
    throw new ContractError(`${context}: missing schema count mismatch`);
  }
  const seen = new Set();
  for (const schemaName of summary.missing_schema_names) {
    if (!isSafeDbPreflightSchemaName(schemaName)) {
      throw new ContractError(`${context}: unsafe schema name`);
    }
    if (seen.has(schemaName)) {
      throw new ContractError(`${context}: duplicate schema name`);
    }
    seen.add(schemaName);
  }
  if (
    (summary.missing_schema_count > 0 &&
      summary.schema_readiness_status !== "schema_missing") ||
    (summary.missing_schema_count === 0 &&
      summary.schema_readiness_status !== "schema_ready")
  ) {
    throw new ContractError(`${context}: invalid schema readiness status`);
  }
  assertDbPreflightSchemaMissingBoundaryPolicy(
    summary.boundary_policy,
    context
  );
  assertNoDbPreflightUnsafeText(summary, context);
}

export function assertDbPreflightMigrationPendingSafeSummarySafe(
  summary,
  context = "DB preflight migration pending safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (
    summary.schema !== "iris_db_preflight_migration_pending_safe_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!DB_PREFLIGHT_MIGRATION_PENDING_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (!["migration_ready", "migration_attention"].includes(summary.migration_readiness_status)) {
    throw new ContractError(`${context}: invalid migration status`);
  }
  if (!Array.isArray(summary.migration_statuses)) {
    throw new ContractError(`${context}: migration statuses required`);
  }
  let pendingCount = 0;
  let appliedCount = 0;
  let missingCount = 0;
  const seen = new Set();
  for (const migration of summary.migration_statuses) {
    assertDbPreflightMigrationStatusSafe(migration, context);
    if (seen.has(migration.migration_name)) {
      throw new ContractError(`${context}: duplicate migration`);
    }
    seen.add(migration.migration_name);
    if (migration.migration_status === "pending") pendingCount += 1;
    if (migration.migration_status === "applied") appliedCount += 1;
    if (migration.migration_status === "missing") missingCount += 1;
  }
  if (
    summary.pending_count !== pendingCount ||
    summary.applied_count !== appliedCount ||
    summary.missing_count !== missingCount
  ) {
    throw new ContractError(`${context}: invalid migration counts`);
  }
  const expectedStatus =
    pendingCount > 0 || missingCount > 0
      ? "migration_attention"
      : "migration_ready";
  if (summary.migration_readiness_status !== expectedStatus) {
    throw new ContractError(`${context}: invalid readiness status`);
  }
  assertDbPreflightMigrationPendingBoundaryPolicy(
    summary.boundary_policy,
    context
  );
  assertNoDbPreflightUnsafeText(summary, context);
}

export function assertDbPreflightIndexMissingSafeSummarySafe(
  summary,
  context = "DB preflight index missing safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_db_preflight_index_missing_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!DB_PREFLIGHT_INDEX_MISSING_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (!["index_missing", "index_ready"].includes(summary.index_readiness_status)) {
    throw new ContractError(`${context}: invalid index status`);
  }
  if (!Array.isArray(summary.missing_index_names)) {
    throw new ContractError(`${context}: missing index names required`);
  }
  if (summary.missing_index_count !== summary.missing_index_names.length) {
    throw new ContractError(`${context}: missing index count mismatch`);
  }
  const seen = new Set();
  for (const indexName of summary.missing_index_names) {
    if (!isSafeDbPreflightIndexName(indexName)) {
      throw new ContractError(`${context}: unsafe index name`);
    }
    if (seen.has(indexName)) {
      throw new ContractError(`${context}: duplicate index name`);
    }
    seen.add(indexName);
  }
  if (
    (summary.missing_index_count > 0 &&
      summary.index_readiness_status !== "index_missing") ||
    (summary.missing_index_count === 0 &&
      summary.index_readiness_status !== "index_ready")
  ) {
    throw new ContractError(`${context}: invalid index readiness status`);
  }
  assertDbPreflightIndexMissingBoundaryPolicy(summary.boundary_policy, context);
  assertNoDbPreflightUnsafeText(summary, context);
}

export function assertDbPreflightBackupRehearsalSafeSummarySafe(
  summary,
  context = "DB preflight backup rehearsal safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_db_preflight_backup_rehearsal_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!DB_PREFLIGHT_BACKUP_REHEARSAL_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (!["pass", "fail", "stale"].includes(summary.rehearsal_status)) {
    throw new ContractError(`${context}: invalid rehearsal status`);
  }
  for (const field of ["pass_count", "fail_count", "stale_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid count`);
    }
  }
  const expectedStatus =
    summary.fail_count > 0
      ? "fail"
      : summary.stale_count > 0
        ? "stale"
        : "pass";
  if (summary.rehearsal_status !== expectedStatus) {
    throw new ContractError(`${context}: invalid status aggregate`);
  }
  assertDbPreflightBackupRehearsalBoundaryPolicy(
    summary.boundary_policy,
    context
  );
  assertNoDbPreflightUnsafeText(summary, context);
}

export function assertDbPreflightRestoreDryRunGuardSafe(
  guard,
  context = "DB preflight restore dry-run guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard required`);
  }
  if (guard.schema !== "iris_db_preflight_restore_dry_run_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(guard)) {
    if (!DB_PREFLIGHT_RESTORE_DRY_RUN_GUARD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected guard field`);
    }
  }
  if (
    !["restore_rehearsal_ready", "restore_rehearsal_blocked"].includes(
      guard.restore_readiness_status
    )
  ) {
    throw new ContractError(`${context}: invalid restore status`);
  }
  for (const field of [
    "dry_run_completed",
    "schema_validation_passed",
    "ready_for_restore_rehearsal",
  ]) {
    if (typeof guard[field] !== "boolean") {
      throw new ContractError(`${context}: invalid boolean ${field}`);
    }
  }
  const expectedReady =
    guard.dry_run_completed === true && guard.schema_validation_passed === true;
  if (guard.ready_for_restore_rehearsal !== expectedReady) {
    throw new ContractError(`${context}: invalid restore readiness`);
  }
  if (
    expectedReady &&
    guard.restore_readiness_status !== "restore_rehearsal_ready"
  ) {
    throw new ContractError(`${context}: invalid ready status`);
  }
  if (
    !expectedReady &&
    (guard.restore_readiness_status !== "restore_rehearsal_blocked" ||
      typeof guard.attention_reason !== "string")
  ) {
    throw new ContractError(`${context}: missing blocked status`);
  }
  assertDbPreflightRestoreDryRunBoundaryPolicy(guard.boundary_policy, context);
  assertNoDbPreflightUnsafeText(guard, context);
}

export function assertDbPreflightSlowQueryDiagnosticSafeSummarySafe(
  summary,
  context = "DB preflight slow query diagnostic safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (
    summary.schema !==
    "iris_db_preflight_slow_query_diagnostic_safe_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!DB_PREFLIGHT_SLOW_QUERY_DIAGNOSTIC_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (!["ok", "attention"].includes(summary.diagnostic_status)) {
    throw new ContractError(`${context}: invalid diagnostic status`);
  }
  if (!Number.isInteger(summary.slow_query_count) || summary.slow_query_count < 0) {
    throw new ContractError(`${context}: invalid slow query count`);
  }
  if (!["default", "strict", "relaxed"].includes(summary.threshold_label)) {
    throw new ContractError(`${context}: invalid threshold label`);
  }
  const expectedStatus = summary.slow_query_count > 0 ? "attention" : "ok";
  if (summary.diagnostic_status !== expectedStatus) {
    throw new ContractError(`${context}: invalid diagnostic aggregate`);
  }
  assertDbPreflightSlowQueryDiagnosticBoundaryPolicy(
    summary.boundary_policy,
    context
  );
  assertNoDbPreflightUnsafeText(summary, context);
}

export function assertPostgresAdminSavePreflightReportSafe(
  report,
  context = "postgres admin save preflight"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report must be an object`);
  }
  if (report.schema !== REPORT_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!POSTGRES_ADMIN_SAVE_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected preflight field ${field}`);
    }
  }
  assertPostgresPoolFactoryPlanSafe(
    report.postgres_pool_factory_plan,
    `${context} pool plan`
  );
  assertAdminGatePreflightSafe(
    report.admin_async_save_gate_preflight,
    `${context}: admin async save gate preflight`
  );
  assertBoundaryPolicy(report.boundary_policy, context);
  const serialized = JSON.stringify(report);
  if (
    /\b(postgres:\/\/|postgresql:\/\/|secret|password|token|api[_-]?key|endpoint|https?:\/\/|select |insert |update |delete |event_id|trace_id|subtitle_text|input_action_candidate|world_command)\b/i.test(
      serialized
    )
  ) {
    throw new ContractError(`${context}: unsafe public text detected`);
  }
}

function assertAdminGatePreflightSafe(gate, context) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate preflight required`);
  }
  if (gate.schema !== "iris_operator_policy_admin_async_save_gate_preflight_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(gate)) {
    if (!ADMIN_ASYNC_SAVE_GATE_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate preflight field ${field}`);
    }
  }
  if (
    ![
      "configuration_waiting",
      "ready_for_mock_postgres_save_gate",
    ].includes(gate.readiness_status)
  ) {
    throw new ContractError(`${context}: invalid readiness status`);
  }
  for (const field of [
    "gate_enabled",
    "mock_postgres_save_enabled",
    "admin_authenticated_flag_enabled",
    "store_path_configured",
    "audit_log_path_configured",
    "real_postgres_pool_required_for_this_preflight",
    "real_postgres_pool_created_by_preflight",
    "db_connection_attempted_by_preflight",
  ]) {
    if (typeof gate[field] !== "boolean") {
      throw new ContractError(`${context}: invalid boolean ${field}`);
    }
  }
  if (
    gate.real_postgres_pool_required_for_this_preflight !== false ||
    gate.real_postgres_pool_created_by_preflight !== false ||
    gate.db_connection_attempted_by_preflight !== false
  ) {
    throw new ContractError(`${context}: preflight must not touch database`);
  }
  assertEnvNameListSafe(gate.required_env_names, `${context}: required env`);
  assertEnvNameListSafe(
    gate.missing_required_env_names,
    `${context}: missing required env`
  );
  for (const name of gate.missing_required_env_names) {
    if (!gate.required_env_names.includes(name)) {
      throw new ContractError(`${context}: missing env must be required`);
    }
  }
  const expectedMissing = [
    ["IRIS_OPERATOR_POLICY_ASYNC_SAVE_GATE_ENABLED", gate.gate_enabled],
    [
      "IRIS_OPERATOR_POLICY_POSTGRES_MOCK_SAVE_ENABLED",
      gate.mock_postgres_save_enabled,
    ],
    [
      "IRIS_OPERATOR_POLICY_ADMIN_AUTHENTICATED",
      gate.admin_authenticated_flag_enabled,
    ],
    ["IRIS_OPERATOR_POLICY_STORE_PATH", gate.store_path_configured],
    ["IRIS_OPERATOR_POLICY_AUDIT_LOG_PATH", gate.audit_log_path_configured],
  ]
    .filter(([, configured]) => configured !== true)
    .map(([envName]) => envName);
  if (
    JSON.stringify(gate.missing_required_env_names) !==
    JSON.stringify(expectedMissing)
  ) {
    throw new ContractError(`${context}: invalid missing env summary`);
  }
  const expectedStep =
    expectedMissing.length > 0
      ? "configure_admin_async_save_gate_env"
      : "run_postgres_admin_save_preflight";
  if (gate.next_operator_step_id !== expectedStep) {
    throw new ContractError(`${context}: invalid next operator step`);
  }
  assertSafeScriptName(
    gate.next_safe_verification_script,
    `${context}: next verification script`
  );
  if (
    gate.next_safe_verification_script !==
    "npm run dev:operator-policy:async-save-gate-roundtrip"
  ) {
    throw new ContractError(`${context}: invalid next verification script`);
  }
  assertAdminGateGuidanceSafe(
    gate.operator_guidance_summary,
    expectedStep,
    expectedMissing,
    `${context}: operator guidance`
  );
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const required = Object.keys(createBoundaryPolicy());
  const allowed = new Set(required);
  for (const key of Object.keys(policy)) {
    if (!allowed.has(key)) {
      throw new ContractError(`${context}: unexpected boundary policy ${key}`);
    }
  }
  for (const key of required) {
    if (policy[key] !== true) {
      throw new ContractError(`${context}: boundary policy ${key} must be true`);
    }
  }
}

function dbPreflightRouteContract({ routeId }) {
  return {
    schema: "iris_db_preflight_route_contract_v1",
    route_id: routeId,
    required_status_fields: DB_PREFLIGHT_REQUIRED_STATUS_FIELDS,
    required_summary_fields: DB_PREFLIGHT_REQUIRED_SUMMARY_FIELDS,
    safe_summary_required: true,
    db_connection_required_for_validation: false,
  };
}

function assertDbPreflightRouteContractSafe(route, context) {
  if (!route || typeof route !== "object" || Array.isArray(route)) {
    throw new ContractError(`${context}: route contract required`);
  }
  if (route.schema !== "iris_db_preflight_route_contract_v1") {
    throw new ContractError(`${context}: invalid route schema`);
  }
  for (const field of Object.keys(route)) {
    if (!DB_PREFLIGHT_ROUTE_CONTRACT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected route field`);
    }
  }
  if (typeof route.route_id !== "string" || !/^[a-z0-9_]+$/.test(route.route_id)) {
    throw new ContractError(`${context}: invalid route id`);
  }
  assertSafeFieldList(route.required_status_fields, context);
  assertSafeFieldList(route.required_summary_fields, context);
  for (const field of DB_PREFLIGHT_REQUIRED_STATUS_FIELDS) {
    if (!route.required_status_fields.includes(field)) {
      throw new ContractError(`${context}: missing status field`);
    }
  }
  for (const field of DB_PREFLIGHT_REQUIRED_SUMMARY_FIELDS) {
    if (!route.required_summary_fields.includes(field)) {
      throw new ContractError(`${context}: missing summary field`);
    }
  }
  if (
    route.safe_summary_required !== true ||
    route.db_connection_required_for_validation !== false
  ) {
    throw new ContractError(`${context}: invalid route boundary`);
  }
}

function assertSafeFieldList(fields, context) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new ContractError(`${context}: field list required`);
  }
  for (const field of fields) {
    if (typeof field !== "string" || !/^[a-z0-9_]+$/.test(field)) {
      throw new ContractError(`${context}: unsafe field name`);
    }
  }
}

function assertDbPreflightBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const required = [
    "manifest_only",
    "route_ids_only",
    "field_names_only",
    "safe_summary_required",
    "no_connection_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_sql_values",
  ];
  for (const field of Object.keys(policy)) {
    if (!required.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of required) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertNoDbPreflightUnsafeText(value, context) {
  const serialized = JSON.stringify(value);
  if (
    /\b(postgres:\/\/|postgresql:\/\/|password|token|secret|host|user|endpoint|https?:\/\/|select |insert |update |delete )\b/i.test(
      serialized
    )
  ) {
    throw new ContractError(`${context}: unsafe DB material exposed`);
  }
}

function safeDbPreflightComponentLabel(component) {
  const rawLabel =
    typeof component === "string"
      ? component
      : component?.component_label ?? component?.component ?? component?.name;
  const label = String(rawLabel ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (label === "postgresql") {
    return "postgres";
  }
  if (label === "json_store" || label === "local_json") {
    return "json";
  }
  if (DB_PREFLIGHT_SAFE_COMPONENT_LABELS.has(label)) {
    return label;
  }
  return null;
}

function safeDbPreflightEnvironmentLabel(environment) {
  return String(environment ?? "").trim().toLowerCase() === "production"
    ? "production"
    : "local";
}

function safeDbPreflightBackendLabel(backend) {
  const label = safeDbPreflightComponentLabel(backend);
  return label ?? "fallback";
}

function safeDbPreflightFallbackModeLabel(mode) {
  const label = String(mode ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return ["local", "mvp", "rehearsal", "fallback"].includes(label)
    ? label
    : "local";
}

function safeDbPreflightSchemaName(schemaName) {
  const name = String(schemaName ?? "").trim().toLowerCase();
  return isSafeDbPreflightSchemaName(name) ? name : null;
}

function isSafeDbPreflightSchemaName(schemaName) {
  return (
    typeof schemaName === "string" &&
    /^[a-z][a-z0-9_]{0,79}$/.test(schemaName) &&
    !/(password|token|secret|host|user|endpoint|select|insert|update|delete)/i.test(
      schemaName
    )
  );
}

function safeDbPreflightMigrationStatus(migration) {
  const migrationName = safeDbPreflightSchemaName(
    typeof migration === "string"
      ? migration
      : migration?.migration_name ?? migration?.name
  );
  const migrationStatus = String(
    typeof migration === "string" ? "pending" : migration?.migration_status ?? migration?.status
  )
    .trim()
    .toLowerCase();
  if (
    !migrationName ||
    !["pending", "applied", "missing"].includes(migrationStatus)
  ) {
    return null;
  }
  return {
    migration_name: migrationName,
    migration_status: migrationStatus,
  };
}

function assertDbPreflightMigrationStatusSafe(migration, context) {
  if (!migration || typeof migration !== "object" || Array.isArray(migration)) {
    throw new ContractError(`${context}: migration status required`);
  }
  for (const field of Object.keys(migration)) {
    if (!DB_PREFLIGHT_MIGRATION_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected migration field`);
    }
  }
  if (!isSafeDbPreflightSchemaName(migration.migration_name)) {
    throw new ContractError(`${context}: unsafe migration name`);
  }
  if (!["pending", "applied", "missing"].includes(migration.migration_status)) {
    throw new ContractError(`${context}: unsafe migration status`);
  }
}

function safeDbPreflightBackupCheckStatus(check) {
  const status = String(
    typeof check === "string" ? check : check?.status ?? check?.rehearsal_status
  )
    .trim()
    .toLowerCase();
  return ["pass", "fail", "stale"].includes(status) ? status : "fail";
}

function safeDbPreflightThresholdLabel(threshold) {
  const label = String(threshold ?? "").trim().toLowerCase();
  return ["default", "strict", "relaxed"].includes(label) ? label : "default";
}

function clampDbPreflightCount(value) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) return 0;
  return Math.min(count, 1000000);
}

function safeDbPreflightIndexName(indexName) {
  const name = String(indexName ?? "").trim().toLowerCase();
  return isSafeDbPreflightIndexName(name) ? name : null;
}

function isSafeDbPreflightIndexName(indexName) {
  return (
    typeof indexName === "string" &&
    /^[a-z][a-z0-9_]{0,79}$/.test(indexName) &&
    !/(password|token|secret|host|user|endpoint|query|where|select|insert|update|delete)/i.test(
      indexName
    )
  );
}

function assertDbPreflightComponentLabelBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!DB_PREFLIGHT_COMPONENT_LABEL_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of DB_PREFLIGHT_COMPONENT_LABEL_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDbPreflightLocalFallbackBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const required = [
    "labels_only",
    "fallback_separated_from_production",
    "no_connection_values",
    "no_credential_values",
    "no_ready_sweetening",
  ];
  for (const field of Object.keys(policy)) {
    if (!required.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of required) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDbPreflightSchemaMissingBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const required = [
    "schema_names_only",
    "count_only",
    "no_sql_values",
    "no_connection_values",
    "no_credential_values",
  ];
  for (const field of Object.keys(policy)) {
    if (!required.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of required) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDbPreflightSlowQueryDiagnosticBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const required = [
    "status_count_threshold_only",
    "no_sql_values",
    "no_query_values",
    "no_connection_values",
    "no_credential_values",
  ];
  for (const field of Object.keys(policy)) {
    if (!required.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of required) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDbPreflightBackupRehearsalBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const required = [
    "status_and_counts_only",
    "no_location_values",
    "no_dump_values",
    "no_credential_values",
  ];
  for (const field of Object.keys(policy)) {
    if (!required.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of required) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDbPreflightAdminPageBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!DB_PREFLIGHT_ADMIN_PAGE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of DB_PREFLIGHT_ADMIN_PAGE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDbPreflightRestoreDryRunBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const required = [
    "status_and_booleans_only",
    "no_backup_values",
    "no_connection_values",
    "no_credential_values",
    "no_restore_execution",
  ];
  for (const field of Object.keys(policy)) {
    if (!required.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of required) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDbPreflightIndexMissingBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const required = [
    "index_names_only",
    "status_only",
    "no_query_values",
    "no_connection_values",
    "no_credential_values",
  ];
  for (const field of Object.keys(policy)) {
    if (!required.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of required) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDbPreflightMigrationPendingBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const required = [
    "migration_names_and_status_only",
    "counts_only",
    "no_sql_values",
    "no_connection_values",
    "no_credential_values",
  ];
  for (const field of Object.keys(policy)) {
    if (!required.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of required) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDbPreflightClassifierBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const required = [
    "labels_only",
    "no_connection_values",
    "no_credential_values",
    "no_network_values",
    "no_ready_sweetening",
  ];
  for (const field of Object.keys(policy)) {
    if (!required.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of required) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertAdminGateGuidanceSafe(guidance, expectedStep, expectedMissing, context) {
  if (!guidance || typeof guidance !== "object" || Array.isArray(guidance)) {
    throw new ContractError(`${context}: guidance required`);
  }
  if (
    guidance.schema !==
    "iris_operator_policy_admin_async_save_gate_guidance_v1"
  ) {
    throw new ContractError(`${context}: invalid guidance schema`);
  }
  for (const field of Object.keys(guidance)) {
    if (!ADMIN_ASYNC_SAVE_GATE_GUIDANCE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected guidance field ${field}`);
    }
  }
  if (
    ![
      "configuration_waiting",
      "ready_for_preflight_recheck",
    ].includes(guidance.guidance_status)
  ) {
    throw new ContractError(`${context}: invalid guidance status`);
  }
  if (guidance.env_names_only !== true) {
    throw new ContractError(`${context}: env names only required`);
  }
  if (guidance.next_step_id !== expectedStep) {
    throw new ContractError(`${context}: invalid guidance next step`);
  }
  assertSafeScriptName(
    guidance.next_safe_verification_script,
    `${context}: guidance next verification script`
  );
  if (
    guidance.next_safe_verification_script !==
    "npm run dev:operator-policy:async-save-gate-roundtrip"
  ) {
    throw new ContractError(`${context}: invalid guidance verification script`);
  }
  if (guidance.missing_required_env_count !== expectedMissing.length) {
    throw new ContractError(`${context}: invalid missing env count`);
  }
  assertEnvNameListSafe(
    guidance.missing_required_env_names,
    `${context}: missing env`
  );
  if (
    JSON.stringify(guidance.missing_required_env_names) !==
    JSON.stringify(expectedMissing)
  ) {
    throw new ContractError(`${context}: invalid guidance missing env`);
  }
  if (guidance.real_database_connection_required_for_guidance !== false) {
    throw new ContractError(`${context}: guidance must not require database`);
  }
}

function assertEnvNameListSafe(names, context) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of names) {
    if (typeof name !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
}

function assertSafeScriptName(script, context) {
  if (
    typeof script !== "string" ||
    !/^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      script
    )
  ) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function createBoundaryPolicy() {
  return {
    preflight_only: true,
    env_names_and_booleans_only: true,
    script_names_only: true,
    no_secret_values: true,
    no_connection_values: true,
    no_endpoint_values: true,
    no_store_path_values: true,
    no_sql_statements: true,
    no_policy_payloads: true,
    no_policy_numeric_values: true,
    no_candidates: true,
    no_commands: true,
    no_db_connection_attempted: true,
    no_pool_created: true,
  };
}
