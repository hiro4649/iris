import { ContractError } from "../../core/contracts.js";
import {
  assertProductionConfigDoctorSafe,
  createProductionConfigDoctor,
} from "./productionConfigDoctor.js";
import {
  assertProductionReadinessRunbookSafe,
  createProductionReadinessRunbook,
} from "./productionReadinessRunbook.js";

const FORBIDDEN_PERSISTENCE_PREFLIGHT_FIELDS = new Set([
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
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "final_text",
  "text",
  "subtitle_text",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "value",
  "payload",
  "recent_summaries",
  "summary",
]);

const PREFLIGHT_STATUSES = new Set([
  "ready_to_persist_memory_and_relationships",
  "blocked_by_configuration",
]);
const CHECK_STATUSES = new Set(["ready", "attention"]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const PERSISTENCE_MODES = new Set(["json_store", "postgresql"]);
const VECTOR_MEMORY_MODES = new Set(["local", "http_vector", "unsupported_adapter"]);
const ATTENTION_REASONS = new Set([
  "missing_required_env",
  "candidate_persistence_disabled",
  "relationship_memory_disabled",
  "vector_memory_adapter_not_ready",
  "vector_memory_target_policy_attention",
]);
const TARGET_POLICY_STATUSES = new Set(["allowed", "attention", "not_applicable"]);
const PERSISTENCE_PREFLIGHT_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "preflight_status",
  "json_store_status",
  "vector_memory_status",
  "persistence_mode",
  "vector_memory_mode",
  "memory_store_path_configured",
  "relationship_store_path_configured",
  "production_persistence_backend",
  "postgres_adapter_mode",
  "postgres_mock_adapter_enabled",
  "postgres_real_database_required_for_production",
  "postgres_real_database_connection_attempted_by_preflight",
  "postgres_connection_configured",
  "postgres_migrations_ready",
  "postgres_indexes_ready",
  "postgres_backup_ready",
  "postgres_target_capacity_ready",
  "moderation_store_enabled",
  "moderation_blocklist_enabled",
  "internal_relationship_stage_count_ready",
  "public_relationship_level_count_ready",
  "candidate_persistence_ready",
  "relationship_memory_ready",
  "vector_memory_adapter_ready",
  "vector_memory_target_policy_status",
  "vector_memory_required_for_production_search",
  "configured_env",
  "missing_required_env",
  "attention_reasons",
  "attention_reason_count",
  "next_attention_reason",
  "next_readiness_state",
  "readiness_state_counts",
  "persistence_stage_summary",
  "integration_readiness",
  "verification_plan_summary",
  "postgres_production_boundary_manifest",
  "persistence_policy",
  "boundary_policy",
  "adapter_validation_required",
]);
const PERSISTENCE_STAGE_INTEGRATIONS = new Set([
  "memory_and_relationship_persistence",
  "admin_review_private_runner_gate",
  "production_vector_memory",
]);
const POSTGRES_FALLBACK_MODE_LABEL_FIELDS = new Set([
  "schema",
  "backend_label",
  "production_backend_recommended",
  "operator_attention_required",
  "boundary_policy",
]);
const SAFE_FALLBACK_BACKEND_LABELS = new Set([
  "json_local_mvp_fallback",
  "postgresql_production_backend",
  "unknown_fallback",
]);
const POSTGRES_PRODUCTION_BOUNDARY_MANIFEST_FIELDS = new Set([
  "schema",
  "manifest_status",
  "json_store_role",
  "real_evidence_status",
  "production_ready_allowed",
  "postgres_real_database_connection_attempted",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "next_safe_action_label",
  "boundary_policy",
]);
const POSTGRES_PRODUCTION_BOUNDARY_MANIFEST_STATUSES = new Set([
  "blocked_by_json_fallback",
  "blocked_by_missing_real_evidence",
  "operator_review_required",
]);
const POSTGRES_REAL_EVIDENCE_STATUSES = new Set([
  "external_real_evidence_blocked",
  "operator_review_required",
]);
const POSTGRES_PRODUCTION_BOUNDARY_NEXT_ACTION_LABELS = new Set([
  "select_postgresql_production_backend",
  "configure_postgres_connection_env",
  "prepare_postgres_migration_review",
  "prepare_postgres_index_manifest",
  "prepare_backup_restore_rehearsal",
  "prepare_bounded_pagination_and_capacity_manifest",
  "prepare_moderation_store_manifest",
  "operator_review_required",
]);

export function createPersistencePreflightReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const doctor = createProductionConfigDoctor({ env, generatedAtMs });
  const runbook = createProductionReadinessRunbook({ env, generatedAtMs });
  assertProductionConfigDoctorSafe(doctor, "persistence preflight doctor");
  assertProductionReadinessRunbookSafe(runbook, "persistence preflight runbook");

  const persistenceCheck = doctor.checks.find(
    (check) => check.integration === "memory_and_relationship_persistence"
  );
  const vectorCheck = doctor.checks.find(
    (check) => check.integration === "production_vector_memory"
  );
  const persistenceStage = runbook.stages.find(
    (stage) => stage.stage_id === "memory_and_relationship_persistence"
  );
  if (!persistenceCheck || !vectorCheck || !persistenceStage) {
    throw new ContractError("persistence preflight: missing persistence checks");
  }

  const attentionReasons = buildAttentionReasons({
    env,
    persistenceCheck,
    vectorCheck,
  });
  const readinessStates =
    attentionReasons.length > 0
      ? attentionReasons.map(readinessStateForAttentionReason)
      : ["ready"];
  const integrationReadiness = persistenceStage.integrations.map((integration) => ({
    schema: "iris_persistence_preflight_integration_readiness_v1",
    integration: integration.integration,
    status: integration.status,
    mode: integration.mode,
    readiness_state: readinessStateForIntegration(integration),
  }));
  const report = {
    schema: "iris_persistence_preflight_report_v1",
    generated_at_ms: generatedAtMs,
    preflight_status:
      persistenceCheck.status === "ready" &&
      vectorCheck.status === "ready" &&
      attentionReasons.length === 0
        ? "ready_to_persist_memory_and_relationships"
        : "blocked_by_configuration",
    json_store_status: persistenceCheck.status,
    vector_memory_status: vectorCheck.status,
    persistence_mode: persistenceCheck.mode,
    vector_memory_mode: normalizeVectorMemoryMode(vectorCheck.mode),
    memory_store_path_configured: Boolean(env.IRIS_MEMORY_STORE_PATH),
    relationship_store_path_configured: Boolean(env.IRIS_RELATIONSHIP_STORE_PATH),
    production_persistence_backend: normalizePersistenceBackend(env.IRIS_PERSISTENCE_BACKEND),
    postgres_adapter_mode: persistenceCheck.postgres_adapter_mode ?? "disabled",
    postgres_mock_adapter_enabled: env.IRIS_POSTGRES_MOCK_ADAPTER_ENABLED === "true",
    postgres_real_database_required_for_production:
      persistenceCheck.postgres_real_database_required_for_production === true,
    postgres_real_database_connection_attempted_by_preflight: false,
    postgres_connection_configured: Boolean(env.IRIS_POSTGRES_CONNECTION_STRING),
    postgres_migrations_ready: env.IRIS_POSTGRES_MIGRATIONS_READY === "true",
    postgres_indexes_ready: env.IRIS_POSTGRES_INDEXES_READY === "true",
    postgres_backup_ready: env.IRIS_POSTGRES_BACKUP_READY === "true",
    postgres_target_capacity_ready:
      clampInteger(env.IRIS_POSTGRES_TARGET_VIEWER_PROFILE_CAPACITY, 0, 1_000_000_000, 0) >=
      1_000_000,
    moderation_store_enabled: env.IRIS_MODERATION_STORE_ENABLED === "true",
    moderation_blocklist_enabled: env.IRIS_MODERATION_BLOCKLIST_ENABLED === "true",
    internal_relationship_stage_count_ready:
      clampInteger(env.IRIS_INTERNAL_RELATIONSHIP_STAGE_COUNT, 0, 10_000, 0) === 100,
    public_relationship_level_count_ready:
      clampInteger(env.IRIS_PUBLIC_RELATIONSHIP_LEVEL_COUNT, 0, 1000, 0) === 8,
    candidate_persistence_ready: env.IRIS_ENABLE_CANDIDATE_PERSISTENCE === "true",
    relationship_memory_ready: env.IRIS_ENABLE_RELATIONSHIP_MEMORY === "true",
    vector_memory_adapter_ready: env.IRIS_MEMORY_SEARCH_ADAPTER === "http_vector",
    vector_memory_target_policy_status: summarizeVectorMemoryTargetPolicyStatus({
      env,
      vectorCheck,
    }),
    vector_memory_required_for_production_search: true,
    configured_env: uniqueEnvNames([
      ...persistenceCheck.configured_env,
      ...vectorCheck.configured_env,
    ]),
    missing_required_env: uniqueEnvNames([
      ...persistenceCheck.missing_env,
      ...vectorCheck.missing_env,
    ]),
    attention_reasons: attentionReasons,
    attention_reason_count: attentionReasons.length,
    next_attention_reason: attentionReasons[0] ?? null,
    next_readiness_state: readinessStates[0],
    readiness_state_counts: countReadinessStates(readinessStates),
    persistence_stage_summary: {
      schema: "iris_persistence_preflight_stage_summary_v1",
      stage_id: persistenceStage.stage_id,
      stage_status: persistenceStage.status,
      readiness_state: readinessStateForStage(
        persistenceStage,
        readinessStates,
        integrationReadiness
      ),
      integration_count: persistenceStage.integrations.length,
      ready_integration_count: persistenceStage.integrations.filter(
        (integration) => integration.status === "ready"
      ).length,
      attention_integration_count: persistenceStage.integrations.filter(
        (integration) => integration.status === "attention"
      ).length,
      missing_required_env_count: persistenceStage.missing_required_env.length,
      first_verification_script: persistenceStage.verification_scripts[0] ?? null,
      verification_script_count: persistenceStage.verification_scripts.length,
    },
    integration_readiness: integrationReadiness,
    verification_plan_summary: {
      schema: "iris_persistence_preflight_verification_summary_v1",
      stage_id: persistenceStage.stage_id,
      stage_status: persistenceStage.status,
      first_verification_script: persistenceStage.verification_scripts[0] ?? null,
      verification_script_count: persistenceStage.verification_scripts.length,
      json_store_fixture_script: persistenceCheck.local_fixture_command,
      json_store_status_script: persistenceCheck.configured_command,
      json_store_failure_script: persistenceCheck.failure_command,
      vector_memory_fixture_script: vectorCheck.local_fixture_command,
    },
    postgres_production_boundary_manifest: createPostgresProductionBoundaryManifest({
      productionBackend: normalizePersistenceBackend(env.IRIS_PERSISTENCE_BACKEND),
      postgresConnectionConfigured: Boolean(env.IRIS_POSTGRES_CONNECTION_STRING),
      postgresMigrationsReady: env.IRIS_POSTGRES_MIGRATIONS_READY === "true",
      postgresIndexesReady: env.IRIS_POSTGRES_INDEXES_READY === "true",
      postgresBackupReady: env.IRIS_POSTGRES_BACKUP_READY === "true",
      postgresTargetCapacityReady:
        clampInteger(env.IRIS_POSTGRES_TARGET_VIEWER_PROFILE_CAPACITY, 0, 1_000_000_000, 0) >=
        1_000_000,
      moderationStoreEnabled: env.IRIS_MODERATION_STORE_ENABLED === "true",
      moderationBlocklistEnabled: env.IRIS_MODERATION_BLOCKLIST_ENABLED === "true",
      internalRelationshipStageCountReady:
        clampInteger(env.IRIS_INTERNAL_RELATIONSHIP_STAGE_COUNT, 0, 10_000, 0) === 100,
      publicRelationshipLevelCountReady:
        clampInteger(env.IRIS_PUBLIC_RELATIONSHIP_LEVEL_COUNT, 0, 1000, 0) === 8,
    }),
    persistence_policy: {
      memory_records_require_approval: true,
      relationship_records_require_approval: true,
      candidate_records_require_validation: true,
      direct_candidate_commit_blocked: true,
      relationship_values_require_validated_candidate: true,
      long_term_recall_uses_approved_records_only: true,
      postgres_required_for_million_profile_production: true,
      internal_relationship_stage_policy: "0_to_99",
      public_relationship_level_policy: "8_plus_bounded",
      moderation_blocklist_required_for_production: true,
      public_status_counts_only: true,
      private_summaries_filtered: true,
    },
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      no_secret_values: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
      read_only_preflight: true,
    },
    adapter_validation_required: true,
  };
  assertPersistencePreflightReportSafe(report);
  return report;
}

export function assertPersistencePreflightReportSafe(
  report,
  context = "persistence preflight report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenPersistencePreflightFields(report, context);
  if (report.schema !== "iris_persistence_preflight_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!PERSISTENCE_PREFLIGHT_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (!PREFLIGHT_STATUSES.has(report.preflight_status)) {
    throw new ContractError(`${context}: invalid preflight status`);
  }
  for (const field of ["json_store_status", "vector_memory_status"]) {
    if (!CHECK_STATUSES.has(report[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!PERSISTENCE_MODES.has(report.persistence_mode)) {
    throw new ContractError(`${context}: invalid persistence mode`);
  }
  if (!PERSISTENCE_MODES.has(report.production_persistence_backend)) {
    throw new ContractError(`${context}: invalid production persistence backend`);
  }
  if (!VECTOR_MEMORY_MODES.has(report.vector_memory_mode)) {
    throw new ContractError(`${context}: invalid vector memory mode`);
  }
  for (const field of [
    "memory_store_path_configured",
    "relationship_store_path_configured",
    "postgres_mock_adapter_enabled",
    "postgres_real_database_required_for_production",
    "postgres_real_database_connection_attempted_by_preflight",
    "postgres_connection_configured",
    "postgres_migrations_ready",
    "postgres_indexes_ready",
    "postgres_backup_ready",
    "postgres_target_capacity_ready",
    "moderation_store_enabled",
    "moderation_blocklist_enabled",
    "internal_relationship_stage_count_ready",
    "public_relationship_level_count_ready",
    "candidate_persistence_ready",
    "relationship_memory_ready",
    "vector_memory_adapter_ready",
    "vector_memory_required_for_production_search",
  ]) {
    if (typeof report[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!TARGET_POLICY_STATUSES.has(report.vector_memory_target_policy_status)) {
    throw new ContractError(`${context}: invalid vector memory target policy`);
  }
  assertEnvNameListSafe(report.configured_env, `${context}: configured env`);
  assertEnvNameListSafe(report.missing_required_env, `${context}: missing env`);
  if (!Array.isArray(report.attention_reasons)) {
    throw new ContractError(`${context}: attention reasons must be an array`);
  }
  for (const reason of report.attention_reasons) {
    if (!ATTENTION_REASONS.has(reason)) {
      throw new ContractError(`${context}: invalid attention reason`);
    }
  }
  if (
    !Number.isInteger(report.attention_reason_count) ||
    report.attention_reason_count !== report.attention_reasons.length
  ) {
    throw new ContractError(`${context}: invalid attention reason count`);
  }
  assertAttentionReasonConsistency(report, context);
  assertSafeReadinessState(report.next_readiness_state, context);
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  const expectedReadinessStates =
    report.attention_reasons.length > 0
      ? report.attention_reasons.map(readinessStateForAttentionReason)
      : ["ready"];
  if (
    report.next_readiness_state !== expectedReadinessStates[0] ||
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      countReadinessStates(expectedReadinessStates)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state summary`);
  }
  assertPersistenceStageSummarySafe(report.persistence_stage_summary, context);
  assertPersistenceIntegrationReadinessListSafe(report.integration_readiness, context);
  assertVerificationSummarySafe(report.verification_plan_summary, context);
  assertPostgresProductionBoundaryManifestSafe(
    report.postgres_production_boundary_manifest,
    context
  );
  assertPersistencePolicySafe(report.persistence_policy, context);
  assertBoundaryPolicySafe(report.boundary_policy, context);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

function createPostgresProductionBoundaryManifest({
  productionBackend,
  postgresConnectionConfigured,
  postgresMigrationsReady,
  postgresIndexesReady,
  postgresBackupReady,
  postgresTargetCapacityReady,
  moderationStoreEnabled,
  moderationBlocklistEnabled,
  internalRelationshipStageCountReady,
  publicRelationshipLevelCountReady,
}) {
  const jsonFallbackActive = productionBackend !== "postgresql";
  const checks = [
    postgresConnectionConfigured,
    postgresMigrationsReady,
    postgresIndexesReady,
    postgresBackupReady,
    postgresTargetCapacityReady,
    moderationStoreEnabled,
    moderationBlocklistEnabled,
    internalRelationshipStageCountReady,
    publicRelationshipLevelCountReady,
  ];
  const readyCheckCount = checks.filter(Boolean).length;
  const attentionCheckCount = checks.length - readyCheckCount;
  const manifest = {
    schema: "iris_postgres_production_boundary_manifest_v1",
    manifest_status: jsonFallbackActive
      ? "blocked_by_json_fallback"
      : attentionCheckCount > 0
        ? "blocked_by_missing_real_evidence"
        : "operator_review_required",
    json_store_role: "local_mvp_rehearsal_fallback_only",
    real_evidence_status: attentionCheckCount > 0
      ? "external_real_evidence_blocked"
      : "operator_review_required",
    production_ready_allowed: false,
    postgres_real_database_connection_attempted: false,
    check_count: checks.length,
    ready_check_count: readyCheckCount,
    attention_check_count: attentionCheckCount,
    next_safe_action_label: nextPostgresProductionBoundaryAction({
      jsonFallbackActive,
      postgresConnectionConfigured,
      postgresMigrationsReady,
      postgresIndexesReady,
      postgresBackupReady,
      postgresTargetCapacityReady,
      moderationStoreEnabled,
      moderationBlocklistEnabled,
      internalRelationshipStageCountReady,
      publicRelationshipLevelCountReady,
    }),
    boundary_policy: {
      safe_labels_only: true,
      read_only_manifest: true,
      json_fallback_not_production_ready: true,
      no_connection_values: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_sql: true,
      no_raw_db_values: true,
      no_raw_memory: true,
      no_raw_candidates: true,
    },
  };
  assertPostgresProductionBoundaryManifestSafe(manifest);
  return manifest;
}

function nextPostgresProductionBoundaryAction({
  jsonFallbackActive,
  postgresConnectionConfigured,
  postgresMigrationsReady,
  postgresIndexesReady,
  postgresBackupReady,
  postgresTargetCapacityReady,
  moderationStoreEnabled,
  moderationBlocklistEnabled,
  internalRelationshipStageCountReady,
  publicRelationshipLevelCountReady,
}) {
  if (jsonFallbackActive) return "select_postgresql_production_backend";
  if (!postgresConnectionConfigured) return "configure_postgres_connection_env";
  if (!postgresMigrationsReady) return "prepare_postgres_migration_review";
  if (!postgresIndexesReady) return "prepare_postgres_index_manifest";
  if (!postgresBackupReady) return "prepare_backup_restore_rehearsal";
  if (!postgresTargetCapacityReady) {
    return "prepare_bounded_pagination_and_capacity_manifest";
  }
  if (
    !moderationStoreEnabled ||
    !moderationBlocklistEnabled ||
    !internalRelationshipStageCountReady ||
    !publicRelationshipLevelCountReady
  ) {
    return "prepare_moderation_store_manifest";
  }
  return "operator_review_required";
}

function assertPostgresProductionBoundaryManifestSafe(
  manifest,
  context = "postgres production boundary manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest is required`);
  }
  assertNoForbiddenPersistencePreflightFields(manifest, context);
  if (manifest.schema !== "iris_postgres_production_boundary_manifest_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(manifest)) {
    if (!POSTGRES_PRODUCTION_BOUNDARY_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`, { field });
    }
  }
  if (!POSTGRES_PRODUCTION_BOUNDARY_MANIFEST_STATUSES.has(manifest.manifest_status)) {
    throw new ContractError(`${context}: invalid manifest status`);
  }
  if (manifest.json_store_role !== "local_mvp_rehearsal_fallback_only") {
    throw new ContractError(`${context}: invalid JSON store role`);
  }
  if (!POSTGRES_REAL_EVIDENCE_STATUSES.has(manifest.real_evidence_status)) {
    throw new ContractError(`${context}: invalid real evidence status`);
  }
  if (manifest.production_ready_allowed !== false) {
    throw new ContractError(`${context}: production ready must remain blocked`);
  }
  if (manifest.postgres_real_database_connection_attempted !== false) {
    throw new ContractError(`${context}: preflight must not connect to PostgreSQL`);
  }
  for (const field of ["check_count", "ready_check_count", "attention_check_count"]) {
    if (!Number.isInteger(manifest[field]) || manifest[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (manifest.ready_check_count + manifest.attention_check_count !== manifest.check_count) {
    throw new ContractError(`${context}: invalid check count summary`);
  }
  if (!POSTGRES_PRODUCTION_BOUNDARY_NEXT_ACTION_LABELS.has(manifest.next_safe_action_label)) {
    throw new ContractError(`${context}: invalid next safe action`);
  }
  const requiredBoundaryFields = [
    "safe_labels_only",
    "read_only_manifest",
    "json_fallback_not_production_ready",
    "no_connection_values",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_sql",
    "no_raw_db_values",
    "no_raw_memory",
    "no_raw_candidates",
  ];
  for (const field of Object.keys(manifest.boundary_policy ?? {})) {
    if (!requiredBoundaryFields.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const field of requiredBoundaryFields) {
    if (manifest.boundary_policy?.[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

export function createPostgresFallbackModeLabel({
  backend = "json_store",
} = {}) {
  const backendLabel = normalizeFallbackBackendLabel(backend);
  const label = {
    schema: "iris_postgres_fallback_mode_label_v1",
    backend_label: backendLabel,
    production_backend_recommended:
      backendLabel === "postgresql_production_backend",
    operator_attention_required:
      backendLabel !== "postgresql_production_backend",
    boundary_policy: {
      safe_label_only: true,
      fallback_not_production_recommendation: true,
      no_connection_values: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
  };
  assertPostgresFallbackModeLabelSafe(label);
  return label;
}

export function assertPostgresFallbackModeLabelSafe(
  label,
  context = "postgres fallback mode label"
) {
  if (!label || typeof label !== "object" || Array.isArray(label)) {
    throw new ContractError(`${context}: label is required`);
  }
  assertNoForbiddenPersistencePreflightFields(label, context);
  if (label.schema !== "iris_postgres_fallback_mode_label_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(label)) {
    if (!POSTGRES_FALLBACK_MODE_LABEL_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected label field`);
    }
  }
  if (!SAFE_FALLBACK_BACKEND_LABELS.has(label.backend_label)) {
    throw new ContractError(`${context}: invalid backend label`);
  }
  if (typeof label.production_backend_recommended !== "boolean") {
    throw new ContractError(`${context}: invalid production recommendation flag`);
  }
  if (typeof label.operator_attention_required !== "boolean") {
    throw new ContractError(`${context}: invalid operator attention flag`);
  }
  if (
    label.backend_label === "postgresql_production_backend" &&
    label.production_backend_recommended !== true
  ) {
    throw new ContractError(`${context}: PostgreSQL production label mismatch`);
  }
  if (
    label.backend_label !== "postgresql_production_backend" &&
    (label.production_backend_recommended !== false ||
      label.operator_attention_required !== true)
  ) {
    throw new ContractError(`${context}: fallback must not be production recommended`);
  }
  const requiredBoundaryPolicy = [
    "safe_label_only",
    "fallback_not_production_recommendation",
    "no_connection_values",
    "no_endpoint_values",
    "no_secret_values",
  ];
  for (const key of requiredBoundaryPolicy) {
    if (label.boundary_policy?.[key] !== true) {
      throw new ContractError(`${context}: boundary policy ${key} must be true`);
    }
  }
}

function buildAttentionReasons({ env, persistenceCheck, vectorCheck }) {
  const missingEnv = uniqueEnvNames([
    ...persistenceCheck.missing_env,
    ...vectorCheck.missing_env,
  ]);
  return [
    missingEnv.length > 0 ? "missing_required_env" : null,
    env.IRIS_ENABLE_CANDIDATE_PERSISTENCE !== "true"
      ? "candidate_persistence_disabled"
      : null,
    env.IRIS_ENABLE_RELATIONSHIP_MEMORY !== "true"
      ? "relationship_memory_disabled"
      : null,
    env.IRIS_MEMORY_SEARCH_ADAPTER !== "http_vector"
      ? "vector_memory_adapter_not_ready"
      : null,
    summarizeVectorMemoryTargetPolicyStatus({ env, vectorCheck }) === "attention"
      ? "vector_memory_target_policy_attention"
      : null,
  ].filter(Boolean);
}

function normalizeVectorMemoryMode(mode) {
  if (mode === "http_vector") return "http_vector";
  if (!mode || mode === "local") return "local";
  return "unsupported_adapter";
}

function normalizePersistenceBackend(value) {
  const text = String(value ?? "json_store").trim().toLowerCase();
  if (text === "postgres" || text === "postgresql") return "postgresql";
  return "json_store";
}

function normalizeFallbackBackendLabel(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "postgres" || text === "postgresql") {
    return "postgresql_production_backend";
  }
  if (["json", "json_store", "local", "mvp", "fallback"].includes(text)) {
    return "json_local_mvp_fallback";
  }
  return "unknown_fallback";
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

function summarizeVectorMemoryTargetPolicyStatus({ env, vectorCheck }) {
  if (!env.IRIS_MEMORY_SEARCH_ENDPOINT) return "not_applicable";
  return vectorCheck.memory_search_endpoint_locality_ok === true ? "allowed" : "attention";
}

function assertAttentionReasonConsistency(report, context) {
  assertReasonPresence(
    report,
    "missing_required_env",
    report.missing_required_env.length > 0,
    context
  );
  assertReasonPresence(
    report,
    "candidate_persistence_disabled",
    report.candidate_persistence_ready !== true,
    context
  );
  assertReasonPresence(
    report,
    "relationship_memory_disabled",
    report.relationship_memory_ready !== true,
    context
  );
  assertReasonPresence(
    report,
    "vector_memory_adapter_not_ready",
    report.vector_memory_adapter_ready !== true,
    context
  );
  assertReasonPresence(
    report,
    "vector_memory_target_policy_attention",
    report.vector_memory_target_policy_status === "attention",
    context
  );
  if (report.attention_reason_count === 0) {
    if (
      report.preflight_status !== "ready_to_persist_memory_and_relationships" ||
      report.next_attention_reason !== null ||
      report.json_store_status !== "ready" ||
      report.vector_memory_status !== "ready"
    ) {
      throw new ContractError(`${context}: invalid ready preflight summary`);
    }
    return;
  }
  if (
    report.preflight_status !== "blocked_by_configuration" ||
    report.next_attention_reason !== report.attention_reasons[0]
  ) {
    throw new ContractError(`${context}: invalid attention preflight summary`);
  }
}

function assertReasonPresence(report, reason, expected, context) {
  const present = report.attention_reasons.includes(reason);
  if (present !== expected) {
    throw new ContractError(`${context}: inconsistent attention reason`, { reason });
  }
}

function readinessStateForAttentionReason(reason) {
  if (reason === "vector_memory_target_policy_attention") {
    return "operator_review_required";
  }
  return reason ? "configuration_waiting" : "ready";
}

function readinessStateForIntegration(integration) {
  return integration.status === "ready" ? "ready" : "configuration_waiting";
}

function readinessStateForStage(stage, readinessStates, integrationReadiness) {
  if (stage.status === "ready") return "ready";
  const attentionState = readinessStates.find((state) => state !== "ready");
  if (attentionState) return attentionState;
  return (
    integrationReadiness.find((integration) => integration.readiness_state !== "ready")
      ?.readiness_state ?? "configuration_waiting"
  );
}

function countReadinessStates(statesOrItems) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const item of statesOrItems) {
    const state = typeof item === "string" ? item : item?.readiness_state;
    if (READINESS_STATES.has(state)) counts[state] += 1;
  }
  return counts;
}

function assertSafeReadinessState(state, context) {
  if (!READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: readiness state counts are required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness state count`);
    }
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: unexpected readiness state count`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every(
    (state) => Number(left?.[state] ?? -1) === Number(right?.[state] ?? -2)
  );
}

function assertPersistenceStageSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: persistence stage summary is required`);
  }
  if (summary.schema !== "iris_persistence_preflight_stage_summary_v1") {
    throw new ContractError(`${context}: invalid persistence stage summary schema`);
  }
  if (summary.stage_id !== "memory_and_relationship_persistence") {
    throw new ContractError(`${context}: invalid persistence stage summary id`);
  }
  if (!["ready", "attention"].includes(summary.stage_status)) {
    throw new ContractError(`${context}: invalid persistence stage status`);
  }
  assertSafeReadinessState(summary.readiness_state, context);
  if (summary.stage_status === "ready" && summary.readiness_state !== "ready") {
    throw new ContractError(`${context}: invalid ready stage readiness state`);
  }
  if (summary.stage_status === "attention" && summary.readiness_state === "ready") {
    throw new ContractError(`${context}: invalid attention stage readiness state`);
  }
  for (const field of [
    "integration_count",
    "ready_integration_count",
    "attention_integration_count",
    "missing_required_env_count",
    "verification_script_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    summary.ready_integration_count + summary.attention_integration_count !==
    summary.integration_count
  ) {
    throw new ContractError(`${context}: invalid persistence integration count`);
  }
  if (summary.stage_status === "ready" && summary.attention_integration_count !== 0) {
    throw new ContractError(`${context}: ready persistence summary has attention checks`);
  }
  if (summary.stage_status === "attention" && summary.attention_integration_count === 0) {
    throw new ContractError(`${context}: attention persistence summary has no attention checks`);
  }
  if (summary.first_verification_script !== null) {
    assertSafeScriptName(summary.first_verification_script, context);
  }
}

function assertPersistenceIntegrationReadinessListSafe(readiness, context) {
  if (!Array.isArray(readiness) || readiness.length === 0) {
    throw new ContractError(`${context}: persistence integration readiness is required`);
  }
  const seen = new Set();
  for (const item of readiness) {
    assertPersistenceIntegrationReadinessSafe(item, context);
    if (seen.has(item.integration)) {
      throw new ContractError(`${context}: duplicate persistence integration`);
    }
    seen.add(item.integration);
  }
  for (const integration of PERSISTENCE_STAGE_INTEGRATIONS) {
    if (!seen.has(integration)) {
      throw new ContractError(`${context}: missing persistence integration`);
    }
  }
}

function assertPersistenceIntegrationReadinessSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: invalid persistence integration readiness`);
  }
  if (item.schema !== "iris_persistence_preflight_integration_readiness_v1") {
    throw new ContractError(`${context}: invalid persistence integration readiness schema`);
  }
  if (!PERSISTENCE_STAGE_INTEGRATIONS.has(item.integration)) {
    throw new ContractError(`${context}: invalid persistence integration`);
  }
  if (!CHECK_STATUSES.has(item.status)) {
    throw new ContractError(`${context}: invalid persistence integration status`);
  }
  assertSafeReadinessState(item.readiness_state, context);
  if (item.readiness_state !== readinessStateForIntegration(item)) {
    throw new ContractError(`${context}: invalid persistence integration readiness state`);
  }
  if (typeof item.mode !== "string" || !/^[a-z0-9_]+$/.test(item.mode)) {
    throw new ContractError(`${context}: invalid persistence integration mode`);
  }
}

function assertVerificationSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: verification summary is required`);
  }
  if (summary.schema !== "iris_persistence_preflight_verification_summary_v1") {
    throw new ContractError(`${context}: invalid verification summary schema`);
  }
  if (summary.stage_id !== "memory_and_relationship_persistence") {
    throw new ContractError(`${context}: invalid stage id`);
  }
  if (!["ready", "attention"].includes(summary.stage_status)) {
    throw new ContractError(`${context}: invalid stage status`);
  }
  if (summary.first_verification_script !== null) {
    assertSafeScriptName(summary.first_verification_script, context);
  }
  if (
    !Number.isInteger(summary.verification_script_count) ||
    summary.verification_script_count < 0
  ) {
    throw new ContractError(`${context}: invalid verification script count`);
  }
  assertSafeScriptName(summary.json_store_fixture_script, context);
  assertSafeScriptName(summary.json_store_status_script, context);
  assertSafeScriptName(summary.json_store_failure_script, context);
  assertSafeScriptName(summary.vector_memory_fixture_script, context);
}

function assertPersistencePolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: persistence policy is required`);
  }
  for (const field of [
    "memory_records_require_approval",
    "relationship_records_require_approval",
    "candidate_records_require_validation",
    "direct_candidate_commit_blocked",
    "relationship_values_require_validated_candidate",
    "long_term_recall_uses_approved_records_only",
    "postgres_required_for_million_profile_production",
    "moderation_blocklist_required_for_production",
    "public_status_counts_only",
    "private_summaries_filtered",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid persistence policy`);
    }
  }
  if (
    policy.internal_relationship_stage_policy !== "0_to_99" ||
    policy.public_relationship_level_policy !== "8_plus_bounded"
  ) {
    throw new ContractError(`${context}: invalid relationship scale policy`);
  }
}

function assertBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const requiredFields = [
    "env_names_only",
    "script_names_only",
    "no_secret_values",
    "no_store_paths",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
    "no_candidates",
    "no_commands",
    "read_only_preflight",
  ];
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertSafeScriptName(script, context) {
  if (
    typeof script !== "string" ||
    !(
      /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
        script
      ) || script === "npm test"
    )
  ) {
    throw new ContractError(`${context}: unsafe script name`);
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

function uniqueEnvNames(names) {
  return [...new Set(names)].filter((name) => /^IRIS_[A-Z0-9_]+$/.test(name));
}

function assertNoForbiddenPersistencePreflightFields(
  value,
  context,
  path = "root"
) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenPersistencePreflightFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_PERSISTENCE_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe preflight field`, { field, path });
    }
    assertNoForbiddenPersistencePreflightFields(child, context, `${path}.${field}`);
  }
}
