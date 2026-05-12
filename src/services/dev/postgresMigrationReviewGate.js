import { ContractError } from "../../core/contracts.js";
import {
  assertPostgresPersistenceMigrationPlanSafe,
  createPostgresPersistenceMigrationPlan,
} from "./postgresPersistenceMigrationPlan.js";

const SCHEMA = "iris_postgres_migration_review_gate_v1";

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
const POSTGRES_MIGRATION_REVIEW_GATE_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "gate_status",
  "plan_status",
  "operator_review_approved",
  "private_runner_allowed",
  "db_connection_attempted_by_gate",
  "destructive_migration_allowed",
  "target_stage_id",
  "migration_step_count",
  "migration_ids",
  "table_name_count",
  "index_id_count",
  "readiness_summary",
  "boundary_policy",
]);
const POSTGRES_MIGRATION_REVIEW_READINESS_SUMMARY_FIELDS = new Set([
  "schema",
  "configuration_ready",
  "operator_review_required",
  "private_runner_waiting",
  "backup_ready",
  "moderation_ready",
  "capacity_ready",
  "relationship_stage_policy_ready",
  "operator_policy_storage_ready",
]);

export function createPostgresMigrationReviewGate({
  env = process.env,
  generatedAtMs = Date.now(),
  operatorReviewApproved = false,
} = {}) {
  const plan = createPostgresPersistenceMigrationPlan({ env, generatedAtMs });
  assertPostgresPersistenceMigrationPlanSafe(plan, "postgres migration review gate plan");
  const planReady = plan.plan_status === "ready_for_operator_review";
  const reviewApproved = operatorReviewApproved === true;
  const migrationReadinessState = planReady
    ? reviewApproved
      ? "ready_for_private_migration_runner"
      : "operator_review_required"
    : "configuration_waiting";
  const gate = {
    schema: SCHEMA,
    generated_at_ms: generatedAtMs,
    gate_status: migrationReadinessState,
    plan_status: plan.plan_status,
    operator_review_approved: reviewApproved,
    private_runner_allowed: planReady && reviewApproved,
    db_connection_attempted_by_gate: false,
    destructive_migration_allowed: false,
    target_stage_id: plan.target_stage_id,
    migration_step_count: plan.migration_step_count,
    migration_ids: plan.migration_steps.map((step) => step.migration_id),
    table_name_count: plan.table_name_count,
    index_id_count: plan.index_id_count,
    readiness_summary: {
      schema: "iris_postgres_migration_review_readiness_summary_v1",
      configuration_ready: planReady,
      operator_review_required: planReady && !reviewApproved,
      private_runner_waiting: !planReady || !reviewApproved,
      backup_ready: plan.postgres_backup_ready,
      moderation_ready:
        plan.moderation_store_enabled && plan.moderation_blocklist_enabled,
      capacity_ready: plan.target_capacity_ready,
      relationship_stage_policy_ready:
        plan.internal_relationship_stage_count_ready &&
        plan.public_relationship_level_count_ready,
      operator_policy_storage_ready:
        plan.operator_policy_storage_plan?.public_reports_policy_digest_only === true &&
        plan.operator_policy_storage_plan?.admin_authentication_required === true &&
        plan.operator_policy_storage_plan?.owner_confirmation_required_for_gameplay_control ===
          true &&
        plan.operator_policy_storage_plan?.audit_log_required_for_save === true &&
        plan.operator_policy_storage_plan?.postgres_policy_write_requires_private_runner ===
          true,
    },
    boundary_policy: createBoundaryPolicy(),
  };
  assertPostgresMigrationReviewGateSafe(gate);
  return gate;
}

export function assertPostgresMigrationReviewGateSafe(
  gate,
  context = "postgres migration review gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate must be an object`);
  }
  if (gate.schema !== SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(gate)) {
    if (!POSTGRES_MIGRATION_REVIEW_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected review gate field ${field}`);
    }
  }
  if (
    gate.gate_status !== "ready_for_private_migration_runner" &&
    gate.gate_status !== "operator_review_required" &&
    gate.gate_status !== "configuration_waiting"
  ) {
    throw new ContractError(`${context}: invalid gate status`);
  }
  assertSafeObject(gate, context);
  assertNoUnsafeText(gate, context);
  assertBoundaryPolicy(gate.boundary_policy, context);
  if (gate.db_connection_attempted_by_gate !== false) {
    throw new ContractError(`${context}: gate must not attempt DB connections`);
  }
  if (gate.destructive_migration_allowed !== false) {
    throw new ContractError(`${context}: destructive migration must remain blocked`);
  }
  assertReadinessSummarySafe(gate.readiness_summary, context);
}

function assertReadinessSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: readiness summary required`);
  }
  if (summary.schema !== "iris_postgres_migration_review_readiness_summary_v1") {
    throw new ContractError(`${context}: invalid readiness summary schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!POSTGRES_MIGRATION_REVIEW_READINESS_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected readiness summary field ${field}`);
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
    review_gate_only: true,
    private_runner_required: true,
    env_names_only: true,
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
