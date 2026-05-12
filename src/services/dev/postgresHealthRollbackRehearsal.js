import { ContractError } from "../../core/contracts.js";
import {
  assertPostgresPrivateMigrationRunnerDryRunSafe,
  createPostgresPrivateMigrationRunnerDryRun,
} from "./postgresPrivateMigrationRunnerDryRun.js";

const SCHEMA = "iris_postgres_health_rollback_rehearsal_v1";

const FORBIDDEN_FIELDS = new Set([
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
  "summary",
  "text",
  "message_text",
  "display_name",
  "payload",
  "value",
  "values",
  "params",
  "parameters",
  "sql",
  "raw_sql",
  "query",
  "statement",
  "command",
  "endpoint",
  "url",
  "connection_string",
  "connectionString",
  "dsn",
  "database_url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "message",
  "detail",
  "hint",
  "where",
  "stack",
]);

const UNSAFE_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|postgres:\/\/|postgresql:\/\/|select |insert |update |delete |alter |drop |create table|constraint |violates )\b|https?:\/\//i;
const POSTGRES_HEALTH_ROLLBACK_REHEARSAL_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "rehearsal_status",
  "runner_dry_run_status",
  "private_runner_allowed",
  "db_connection_attempted_by_rehearsal",
  "migration_applied_by_rehearsal",
  "rollback_executed_by_rehearsal",
  "destructive_migration_allowed",
  "backup_ready",
  "rollback_rehearsal_ready",
  "restore_rehearsal_ready",
  "health_check_ready",
  "planned_migration_step_count",
  "planned_table_name_count",
  "planned_index_id_count",
  "rehearsal_steps",
  "verification_scripts",
  "boundary_policy",
]);
const POSTGRES_HEALTH_ROLLBACK_REHEARSAL_STEP_FIELDS = new Set([
  "schema",
  "step_id",
  "readiness_state",
]);
const POSTGRES_HEALTH_ROLLBACK_REHEARSAL_SCRIPT_FIELDS = new Set([
  "schema",
  "migration_runner_dry_run_script",
  "health_rollback_rehearsal_script",
  "migration_review_gate_script",
]);
const POSTGRES_BACKUP_RESTORE_REHEARSAL_STATUS_FIELDS = new Set([
  "schema",
  "rehearsal_status",
  "backup_ready",
  "restore_rehearsal_ready",
  "safe_status_only",
  "raw_detail_exposed",
  "boundary_policy",
]);

export function createPostgresHealthRollbackRehearsal({
  env = process.env,
  generatedAtMs = Date.now(),
  operatorReviewApproved = false,
} = {}) {
  const runnerDryRun = createPostgresPrivateMigrationRunnerDryRun({
    env,
    generatedAtMs,
    operatorReviewApproved,
  });
  assertPostgresPrivateMigrationRunnerDryRunSafe(
    runnerDryRun,
    "postgres health rollback rehearsal runner dry-run"
  );

  const backupReady = env.IRIS_POSTGRES_BACKUP_READY === "true";
  const rollbackRehearsalReady =
    env.IRIS_POSTGRES_ROLLBACK_REHEARSAL_READY === "true";
  const healthCheckReady = env.IRIS_POSTGRES_HEALTH_CHECK_READY === "true";
  const restoreRehearsalReady =
    env.IRIS_POSTGRES_RESTORE_REHEARSAL_READY === "true";
  const preconditionsReady =
    runnerDryRun.private_runner_allowed === true &&
    backupReady &&
    rollbackRehearsalReady &&
    healthCheckReady &&
    restoreRehearsalReady;

  const rehearsal = {
    schema: SCHEMA,
    generated_at_ms: generatedAtMs,
    rehearsal_status: preconditionsReady
      ? "ready_for_operator_runbook"
      : "configuration_waiting",
    runner_dry_run_status: runnerDryRun.dry_run_status,
    private_runner_allowed: runnerDryRun.private_runner_allowed,
    db_connection_attempted_by_rehearsal: false,
    migration_applied_by_rehearsal: false,
    rollback_executed_by_rehearsal: false,
    destructive_migration_allowed: false,
    backup_ready: backupReady,
    rollback_rehearsal_ready: rollbackRehearsalReady,
    restore_rehearsal_ready: restoreRehearsalReady,
    health_check_ready: healthCheckReady,
    planned_migration_step_count: runnerDryRun.planned_migration_step_count,
    planned_table_name_count: runnerDryRun.planned_table_name_count,
    planned_index_id_count: runnerDryRun.planned_index_id_count,
    rehearsal_steps: [
      {
        schema: "iris_postgres_health_rollback_rehearsal_step_v1",
        step_id: "pre_migration_health_snapshot",
        readiness_state: healthCheckReady ? "ready" : "configuration_waiting",
      },
      {
        schema: "iris_postgres_health_rollback_rehearsal_step_v1",
        step_id: "backup_restore_rehearsal",
        readiness_state:
          backupReady && restoreRehearsalReady ? "ready" : "configuration_waiting",
      },
      {
        schema: "iris_postgres_health_rollback_rehearsal_step_v1",
        step_id: "migration_runner_dry_run_review",
        readiness_state: runnerDryRun.private_runner_allowed
          ? "ready"
          : "configuration_waiting",
      },
      {
        schema: "iris_postgres_health_rollback_rehearsal_step_v1",
        step_id: "rollback_rehearsal_review",
        readiness_state: rollbackRehearsalReady ? "ready" : "configuration_waiting",
      },
    ],
    verification_scripts: {
      schema: "iris_postgres_health_rollback_rehearsal_scripts_v1",
      migration_runner_dry_run_script:
        "npm run dev:persistence:postgres-migration-runner-dry-run",
      health_rollback_rehearsal_script:
        "npm run dev:persistence:postgres-health-rollback-rehearsal",
      migration_review_gate_script:
        "npm run dev:persistence:postgres-migration-review-gate",
    },
    boundary_policy: createBoundaryPolicy(),
  };
  assertPostgresHealthRollbackRehearsalSafe(rehearsal);
  return rehearsal;
}

export function createPostgresBackupRestoreRehearsalStatus({
  backupReady = false,
  restoreRehearsalReady = false,
} = {}) {
  const ready = backupReady === true && restoreRehearsalReady === true;
  const status = {
    schema: "iris_postgres_backup_restore_rehearsal_status_v1",
    rehearsal_status: ready ? "ready" : "operator_attention_required",
    backup_ready: backupReady === true,
    restore_rehearsal_ready: restoreRehearsalReady === true,
    safe_status_only: true,
    raw_detail_exposed: false,
    boundary_policy: {
      safe_status_only: true,
      no_backup_locations: true,
      no_database_dump_values: true,
      no_credentials: true,
      no_connection_values: true,
      no_statement_text: true,
    },
  };
  assertPostgresBackupRestoreRehearsalStatusSafe(status);
  return status;
}

export function assertPostgresBackupRestoreRehearsalStatusSafe(
  status,
  context = "postgres backup restore rehearsal status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  if (status.schema !== "iris_postgres_backup_restore_rehearsal_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!POSTGRES_BACKUP_RESTORE_REHEARSAL_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field ${field}`);
    }
  }
  if (!["ready", "operator_attention_required"].includes(status.rehearsal_status)) {
    throw new ContractError(`${context}: invalid rehearsal status`);
  }
  for (const field of ["backup_ready", "restore_rehearsal_ready"]) {
    if (typeof status[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (status.safe_status_only !== true || status.raw_detail_exposed !== false) {
    throw new ContractError(`${context}: raw detail boundary invalid`);
  }
  const ready = status.backup_ready === true && status.restore_rehearsal_ready === true;
  if (status.rehearsal_status !== (ready ? "ready" : "operator_attention_required")) {
    throw new ContractError(`${context}: status must match backup restore readiness`);
  }
  const required = {
    safe_status_only: true,
    no_backup_locations: true,
    no_database_dump_values: true,
    no_credentials: true,
    no_connection_values: true,
    no_statement_text: true,
  };
  for (const [field, value] of Object.entries(required)) {
    if (status.boundary_policy?.[field] !== value) {
      throw new ContractError(`${context}: boundary policy ${field} must be true`);
    }
  }
  const serialized = JSON.stringify(status);
  if (
    /postgres:\/\//i.test(serialized) ||
    /https?:\/\//i.test(serialized) ||
    /\b(raw[_-]?db[_-]?dump|db[_-]?dump|backup[_-]?path|raw[_-]?backup[_-]?path|secret|token|password|select |insert |update |delete )\b/i.test(
      serialized
    )
  ) {
    throw new ContractError(`${context}: unsafe backup detail exposed`);
  }
}

export function assertPostgresHealthRollbackRehearsalSafe(
  rehearsal,
  context = "postgres health rollback rehearsal"
) {
  if (!rehearsal || typeof rehearsal !== "object" || Array.isArray(rehearsal)) {
    throw new ContractError(`${context}: rehearsal must be an object`);
  }
  if (rehearsal.schema !== SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(rehearsal)) {
    if (!POSTGRES_HEALTH_ROLLBACK_REHEARSAL_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected rehearsal field ${field}`);
    }
  }
  if (
    rehearsal.rehearsal_status !== "ready_for_operator_runbook" &&
    rehearsal.rehearsal_status !== "configuration_waiting"
  ) {
    throw new ContractError(`${context}: invalid rehearsal status`);
  }
  assertSafeObject(rehearsal, context);
  assertNoUnsafeText(rehearsal, context);
  assertBoundaryPolicy(rehearsal.boundary_policy, context);
  if (rehearsal.db_connection_attempted_by_rehearsal !== false) {
    throw new ContractError(`${context}: rehearsal must not attempt DB connections`);
  }
  if (rehearsal.migration_applied_by_rehearsal !== false) {
    throw new ContractError(`${context}: rehearsal must not apply migrations`);
  }
  if (rehearsal.rollback_executed_by_rehearsal !== false) {
    throw new ContractError(`${context}: rehearsal must not execute rollback`);
  }
  assertRehearsalStepsSafe(rehearsal.rehearsal_steps, context);
  assertVerificationScriptsSafe(rehearsal.verification_scripts, context);
}

function assertRehearsalStepsSafe(steps, context) {
  if (!Array.isArray(steps) || steps.length !== 4) {
    throw new ContractError(`${context}: rehearsal steps required`);
  }
  for (const step of steps) {
    if (!step || typeof step !== "object" || Array.isArray(step)) {
      throw new ContractError(`${context}: rehearsal step required`);
    }
    if (step.schema !== "iris_postgres_health_rollback_rehearsal_step_v1") {
      throw new ContractError(`${context}: invalid rehearsal step schema`);
    }
    for (const field of Object.keys(step)) {
      if (!POSTGRES_HEALTH_ROLLBACK_REHEARSAL_STEP_FIELDS.has(field)) {
        throw new ContractError(`${context}: unexpected rehearsal step field ${field}`);
      }
    }
    if (
      ![
        "pre_migration_health_snapshot",
        "backup_restore_rehearsal",
        "migration_runner_dry_run_review",
        "rollback_rehearsal_review",
      ].includes(step.step_id)
    ) {
      throw new ContractError(`${context}: invalid rehearsal step id`);
    }
    if (!["ready", "configuration_waiting"].includes(step.readiness_state)) {
      throw new ContractError(`${context}: invalid rehearsal step readiness`);
    }
  }
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

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts required`);
  }
  if (scripts.schema !== "iris_postgres_health_rollback_rehearsal_scripts_v1") {
    throw new ContractError(`${context}: invalid verification scripts schema`);
  }
  for (const field of Object.keys(scripts)) {
    if (!POSTGRES_HEALTH_ROLLBACK_REHEARSAL_SCRIPT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected verification script field ${field}`);
    }
  }
  if (
    scripts.migration_runner_dry_run_script !==
      "npm run dev:persistence:postgres-migration-runner-dry-run" ||
    scripts.health_rollback_rehearsal_script !==
      "npm run dev:persistence:postgres-health-rollback-rehearsal" ||
    scripts.migration_review_gate_script !==
      "npm run dev:persistence:postgres-migration-review-gate"
  ) {
    throw new ContractError(`${context}: invalid verification script`);
  }
}

function createBoundaryPolicy() {
  return {
    read_only_rehearsal: true,
    private_runner_required: true,
    ids_and_counts_only: true,
    script_names_only: true,
    no_secret_values: true,
    no_connection_values: true,
    no_endpoint_values: true,
    no_sql_statements: true,
    no_public_parameter_values: true,
    no_record_payloads: true,
    no_candidate_payloads: true,
    no_commands: true,
    no_db_connection_attempted: true,
    no_migration_applied: true,
    no_rollback_executed: true,
    no_destructive_migration: true,
  };
}

function assertSafeObject(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertSafeObject(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe public field ${field}`, { path });
    }
    assertSafeObject(child, context, `${path}.${field}`);
  }
}

function assertNoUnsafeText(value, context) {
  const serialized = JSON.stringify(value);
  if (UNSAFE_TEXT_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: unsafe public text detected`);
  }
}
