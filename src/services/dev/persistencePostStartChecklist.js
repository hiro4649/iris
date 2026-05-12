import { ContractError } from "../../core/contracts.js";
import {
  assertPersistenceLiveReadinessReportSafe,
  createPersistenceLiveReadinessReport,
} from "./persistenceLiveReadiness.js";

const SCHEMA = "iris_persistence_post_start_checklist_v1";

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
  "memory_records",
  "relationship_profiles",
  "records",
  "profiles",
  "summary",
  "recent_summaries",
  "viewer_id",
  "author_id",
  "channel_id",
  "author_channel_id",
  "identity_id",
  "linked_identity_id",
  "display_name",
  "canonical",
  "canonical_envelope",
  "final_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
  "payload",
  "value",
  "values",
  "endpoint",
  "url",
  "file_path",
  "filePath",
  "memory_store_path",
  "relationship_store_path",
  "store_path",
  "connection_string",
  "database_url",
  "sql",
  "statement",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "command",
]);

const UNSAFE_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|token|secret|password|endpoint|url|payload|raw_packet|job_payload|connection[_-]?string|database[_-]?url|sql|statement|viewer[_-]?id|author[_-]?id|identity[_-]?id|display[_-]?name)\b|https?:\/\//i;

const CHECKLIST_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "checklist_status",
  "persistence_live_readiness_status",
  "next_gate_id",
  "next_readiness_state",
  "persistence_mode",
  "vector_memory_mode",
  "real_db_connection_attempted_by_checklist",
  "store_write_attempted_by_checklist",
  "candidate_commit_attempted_by_checklist",
  "memory_record_read_by_checklist",
  "relationship_profile_read_by_checklist",
  "check_count",
  "ready_check_count",
  "blocked_check_count",
  "checks",
  "verification_scripts",
  "persistence_policy",
  "boundary_policy",
]);

const POST_START_CHECKS = [
  {
    check_id: "runtime_status_after_start",
    gate_id: "runtime_gate",
    verification_script: "npm run dev:persistence:runtime-status",
  },
  {
    check_id: "store_status_after_start",
    gate_id: "store_gate",
    verification_script: "npm run dev:persistence:status-roundtrip",
  },
  {
    check_id: "candidate_gate_after_start",
    gate_id: "candidate_gate",
    verification_script: "npm run dev:persistence:candidate-gate-roundtrip",
  },
  {
    check_id: "memory_relationship_roundtrip_after_start",
    gate_id: "approved_record_gate",
    verification_script: "npm run dev:persistence:roundtrip",
  },
  {
    check_id: "restart_recall_after_start",
    gate_id: "recall_gate",
    verification_script: "npm run dev:persistence:restart-roundtrip",
  },
  {
    check_id: "backup_after_start",
    gate_id: "lifecycle_gate",
    verification_script: "npm run dev:persistence:backup-roundtrip",
  },
  {
    check_id: "postgres_health_rollback_rehearsal_after_start",
    gate_id: "postgres_health_rollback",
    verification_script:
      "npm run dev:persistence:postgres-health-rollback-rehearsal",
  },
  {
    check_id: "live_readiness_after_start",
    gate_id: "live_readiness",
    verification_script: "npm run dev:persistence:live-readiness",
  },
];

export function createPersistencePostStartChecklist({
  env = process.env,
  runtime = null,
  streamState = null,
  generatedAtMs = Date.now(),
} = {}) {
  const liveReadiness = createPersistenceLiveReadinessReport({
    env,
    runtime,
    streamState,
    generatedAtMs,
  });
  assertPersistenceLiveReadinessReportSafe(
    liveReadiness,
    "persistence post-start checklist live readiness"
  );
  const readyForPersistence =
    liveReadiness.live_readiness_status === "ready_for_persistence_operation";
  const checks = POST_START_CHECKS.map((check, index) => ({
    schema: "iris_persistence_post_start_check_v1",
    sequence_order: index + 1,
    check_id: check.check_id,
    gate_id: check.gate_id,
    verification_script: check.verification_script,
    readiness_state: readyForPersistence
      ? "operator_run_required"
      : "blocked_before_persistence_operation",
    real_db_connection_attempted_by_checklist: false,
    store_write_attempted_by_checklist: false,
    candidate_commit_attempted_by_checklist: false,
    memory_record_read_by_checklist: false,
    relationship_profile_read_by_checklist: false,
  }));
  const checklist = {
    schema: SCHEMA,
    generated_at_ms: generatedAtMs,
    checklist_status: readyForPersistence
      ? "ready_for_operator_post_start_persistence_checks"
      : "blocked_before_persistence_operation",
    persistence_live_readiness_status: liveReadiness.live_readiness_status,
    next_gate_id: liveReadiness.next_gate_id,
    next_readiness_state: liveReadiness.next_readiness_state,
    persistence_mode: liveReadiness.persistence_mode,
    vector_memory_mode: liveReadiness.vector_memory_mode,
    real_db_connection_attempted_by_checklist: false,
    store_write_attempted_by_checklist: false,
    candidate_commit_attempted_by_checklist: false,
    memory_record_read_by_checklist: false,
    relationship_profile_read_by_checklist: false,
    check_count: checks.length,
    ready_check_count: checks.filter(
      (check) => check.readiness_state === "operator_run_required"
    ).length,
    blocked_check_count: checks.filter(
      (check) => check.readiness_state !== "operator_run_required"
    ).length,
    checks,
    verification_scripts: {
      schema: "iris_persistence_post_start_scripts_v1",
      post_start_checklist_script:
        "npm run dev:persistence:post-start-checklist",
      runtime_status_script: "npm run dev:persistence:runtime-status",
      status_roundtrip_script: "npm run dev:persistence:status-roundtrip",
      candidate_gate_roundtrip_script:
        "npm run dev:persistence:candidate-gate-roundtrip",
      persistence_roundtrip_script: "npm run dev:persistence:roundtrip",
      restart_roundtrip_script: "npm run dev:persistence:restart-roundtrip",
      backup_roundtrip_script: "npm run dev:persistence:backup-roundtrip",
      postgres_health_rollback_rehearsal_script:
        "npm run dev:persistence:postgres-health-rollback-rehearsal",
      live_readiness_script: "npm run dev:persistence:live-readiness",
    },
    persistence_policy: {
      candidates_not_committed_by_checklist: true,
      approved_records_not_read_by_checklist: true,
      relationship_profiles_not_read_by_checklist: true,
      postgres_rehearsal_is_dry_run_only: true,
      status_counts_only: true,
    },
    boundary_policy: createBoundaryPolicy(),
  };
  assertPersistencePostStartChecklistSafe(checklist);
  return checklist;
}

export function assertPersistencePostStartChecklistSafe(
  checklist,
  context = "persistence post-start checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist must be an object`);
  }
  if (checklist.schema !== SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(checklist)) {
    if (!CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`, { field });
    }
  }
  if (
    checklist.checklist_status !==
      "ready_for_operator_post_start_persistence_checks" &&
    checklist.checklist_status !== "blocked_before_persistence_operation"
  ) {
    throw new ContractError(`${context}: invalid checklist status`);
  }
  assertSafeObject(checklist, context);
  assertNoUnsafeText(checklist, context);
  assertBoundaryPolicy(checklist.boundary_policy, [
    "read_only_checklist",
    "script_names_only",
    "ids_counts_and_fixed_statuses_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_store_paths",
    "no_connection_values",
    "no_sql_values",
    "no_memory_records",
    "no_relationship_records",
    "no_memory_summaries",
    "no_relationship_scores",
    "no_viewer_ids",
    "no_display_names",
    "no_candidates",
    "no_commands",
    "no_real_db_connection_attempted",
    "no_store_write_attempted",
    "no_candidate_commit_attempted",
  ], context);
  for (const flag of [
    "real_db_connection_attempted_by_checklist",
    "store_write_attempted_by_checklist",
    "candidate_commit_attempted_by_checklist",
    "memory_record_read_by_checklist",
    "relationship_profile_read_by_checklist",
  ]) {
    if (checklist[flag] !== false) {
      throw new ContractError(`${context}: ${flag} must be false`);
    }
  }
  assertPostStartChecksSafe(checklist, context);
}

function assertPostStartChecksSafe(checklist, context) {
  if (!Array.isArray(checklist.checks) || checklist.checks.length !== POST_START_CHECKS.length) {
    throw new ContractError(`${context}: invalid checks`);
  }
  checklist.checks.forEach((check, index) => {
    const expected = POST_START_CHECKS[index];
    if (
      !check ||
      typeof check !== "object" ||
      check.schema !== "iris_persistence_post_start_check_v1" ||
      check.sequence_order !== index + 1 ||
      check.check_id !== expected.check_id ||
      check.gate_id !== expected.gate_id ||
      check.verification_script !== expected.verification_script ||
      !["operator_run_required", "blocked_before_persistence_operation"].includes(
        check.readiness_state
      )
    ) {
      throw new ContractError(`${context}: invalid check`);
    }
  });
  const readyCount = checklist.checks.filter(
    (check) => check.readiness_state === "operator_run_required"
  ).length;
  if (
    checklist.check_count !== checklist.checks.length ||
    checklist.ready_check_count !== readyCount ||
    checklist.blocked_check_count !== checklist.checks.length - readyCount
  ) {
    throw new ContractError(`${context}: invalid check counts`);
  }
}

function createBoundaryPolicy() {
  return {
    read_only_checklist: true,
    script_names_only: true,
    ids_counts_and_fixed_statuses_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_store_paths: true,
    no_connection_values: true,
    no_sql_values: true,
    no_memory_records: true,
    no_relationship_records: true,
    no_memory_summaries: true,
    no_relationship_scores: true,
    no_viewer_ids: true,
    no_display_names: true,
    no_candidates: true,
    no_commands: true,
    no_real_db_connection_attempted: true,
    no_store_write_attempted: true,
    no_candidate_commit_attempted: true,
  };
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
