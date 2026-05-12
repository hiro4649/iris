import { ContractError } from "../../core/contracts.js";
import {
  assertPostgresMigrationReviewGateSafe,
  createPostgresMigrationReviewGate,
} from "./postgresMigrationReviewGate.js";

const SCHEMA = "iris_postgres_private_migration_runner_dry_run_v1";

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
const POSTGRES_PRIVATE_MIGRATION_RUNNER_DRY_RUN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "dry_run_status",
  "review_gate_status",
  "private_runner_allowed",
  "db_connection_attempted_by_dry_run",
  "migration_applied_by_dry_run",
  "destructive_migration_allowed",
  "planned_migration_step_count",
  "planned_migration_ids",
  "planned_table_name_count",
  "planned_index_id_count",
  "private_runner_contract",
  "boundary_policy",
]);
const POSTGRES_PRIVATE_MIGRATION_RUNNER_CONTRACT_FIELDS = new Set([
  "schema",
  "requires_operator_review_gate",
  "requires_private_pool_factory",
  "requires_backup_ready",
  "requires_destructive_migration_false",
  "prepared_statements_or_private_migration_files_only",
  "public_report_ids_and_counts_only",
]);

export function createPostgresPrivateMigrationRunnerDryRun({
  env = process.env,
  generatedAtMs = Date.now(),
  operatorReviewApproved = false,
} = {}) {
  const reviewGate = createPostgresMigrationReviewGate({
    env,
    generatedAtMs,
    operatorReviewApproved,
  });
  assertPostgresMigrationReviewGateSafe(
    reviewGate,
    "postgres private migration runner dry-run review gate"
  );
  const runnerAllowed = reviewGate.private_runner_allowed === true;
  const result = {
    schema: SCHEMA,
    generated_at_ms: generatedAtMs,
    dry_run_status: runnerAllowed
      ? "ready_for_private_runner"
      : "blocked_before_private_runner",
    review_gate_status: reviewGate.gate_status,
    private_runner_allowed: runnerAllowed,
    db_connection_attempted_by_dry_run: false,
    migration_applied_by_dry_run: false,
    destructive_migration_allowed: false,
    planned_migration_step_count: reviewGate.migration_step_count,
    planned_migration_ids: [...reviewGate.migration_ids],
    planned_table_name_count: reviewGate.table_name_count,
    planned_index_id_count: reviewGate.index_id_count,
    private_runner_contract: {
      schema: "iris_postgres_private_migration_runner_contract_v1",
      requires_operator_review_gate: true,
      requires_private_pool_factory: true,
      requires_backup_ready: true,
      requires_destructive_migration_false: true,
      prepared_statements_or_private_migration_files_only: true,
      public_report_ids_and_counts_only: true,
    },
    boundary_policy: createBoundaryPolicy(),
  };
  assertPostgresPrivateMigrationRunnerDryRunSafe(result);
  return result;
}

export function assertPostgresPrivateMigrationRunnerDryRunSafe(
  result,
  context = "postgres private migration runner dry-run"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result must be an object`);
  }
  if (result.schema !== SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(result)) {
    if (!POSTGRES_PRIVATE_MIGRATION_RUNNER_DRY_RUN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected dry-run field ${field}`);
    }
  }
  if (
    result.dry_run_status !== "ready_for_private_runner" &&
    result.dry_run_status !== "blocked_before_private_runner"
  ) {
    throw new ContractError(`${context}: invalid dry-run status`);
  }
  assertSafeObject(result, context);
  assertNoUnsafeText(result, context);
  assertBoundaryPolicy(result.boundary_policy, context);
  if (result.db_connection_attempted_by_dry_run !== false) {
    throw new ContractError(`${context}: dry-run must not attempt DB connections`);
  }
  if (result.migration_applied_by_dry_run !== false) {
    throw new ContractError(`${context}: dry-run must not apply migrations`);
  }
  if (result.destructive_migration_allowed !== false) {
    throw new ContractError(`${context}: destructive migration must remain blocked`);
  }
  assertPrivateRunnerContractSafe(result.private_runner_contract, context);
}

function assertPrivateRunnerContractSafe(contract, context) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: private runner contract required`);
  }
  if (contract.schema !== "iris_postgres_private_migration_runner_contract_v1") {
    throw new ContractError(`${context}: invalid private runner contract schema`);
  }
  for (const field of Object.keys(contract)) {
    if (!POSTGRES_PRIVATE_MIGRATION_RUNNER_CONTRACT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected private runner contract field ${field}`);
    }
  }
  for (const field of [
    "requires_operator_review_gate",
    "requires_private_pool_factory",
    "requires_backup_ready",
    "requires_destructive_migration_false",
    "prepared_statements_or_private_migration_files_only",
    "public_report_ids_and_counts_only",
  ]) {
    if (contract[field] !== true) {
      throw new ContractError(`${context}: private runner contract ${field} required`);
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

function createBoundaryPolicy() {
  return {
    dry_run_only: true,
    review_gate_required: true,
    private_runner_required: true,
    ids_only: true,
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
