import { ContractError } from "../../core/contracts.js";
import {
  assertAdminReviewValidatorPreflightSafe,
  createAdminReviewValidatorPreflight,
} from "./adminReviewValidatorPreflight.js";
import {
  assertAdminReviewAuthGateSafe,
  createAdminReviewAuthGateReport,
} from "./adminReviewAuthGate.js";

const URL_PATTERN = /https?:\/\/|postgres:\/\/|postgresql:\/\//i;
const RUN_PLAN_STATUSES = new Set([
  "not_needed",
  "ready_for_private_runner",
  "blocked_before_private_runner",
]);
const NEXT_SAFE_SCRIPTS = new Set([
  "npm run dev:admin:review-queue",
  "npm run dev:admin:review-auth-gate",
  "npm run dev:admin:review-validator-handoff",
  "npm run dev:admin:review-validator-preflight",
  "npm run dev:admin:review-validator-run-plan",
]);
const BLOCKING_REASONS = new Set([
  "stale_or_missing_review_items",
  "blocked_handoff_items",
  "admin_review_auth_gate_blocked",
]);
const REQUIRED_AUTH_ENV_COUNT = 2;
const FORBIDDEN_FIELDS = new Set([
  "world_command",
  "event_id",
  "trace_id",
  "subtitle_text",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "memory_candidate",
  "relationship_candidate",
  "relationship_update_candidate",
  "approved_memory_record",
  "approved_relationship_record",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "payload",
  "raw_frame",
  "ocr_text",
]);
const ADMIN_REVIEW_VALIDATOR_RUN_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "run_plan_status",
  "planned_private_runner_item_count",
  "blocked_runner_item_count",
  "decision_count",
  "ready_handoff_count",
  "blocking_reasons",
  "private_runner_input_materialized",
  "private_validator_called",
  "validator_execution_performed",
  "validator_commit_performed",
  "memory_store_write_performed",
  "relationship_store_write_performed",
  "raw_candidate_exposed",
  "approved_record_exposed",
  "next_safe_script",
  "preflight_summary",
  "auth_gate_summary",
  "boundary_policy",
]);
const ADMIN_REVIEW_VALIDATOR_RUN_PLAN_PREFLIGHT_SUMMARY_FIELDS = new Set([
  "schema",
  "preflight_status",
  "ready_for_private_validator",
  "decision_count",
  "ready_handoff_count",
  "blocked_handoff_count",
  "raw_candidate_exposed",
  "approved_record_exposed",
]);
const ADMIN_REVIEW_VALIDATOR_RUN_PLAN_AUTH_GATE_SUMMARY_FIELDS = new Set([
  "schema",
  "auth_gate_status",
  "private_runner_allowed",
  "actor_role_label",
  "configured_required_env_count",
  "missing_required_env_count",
  "raw_candidate_exposed",
  "approved_record_exposed",
]);

export function createAdminReviewValidatorRunPlan({
  preflight = null,
  authGateReport = null,
  decisionLog = null,
  reviewItems = [],
  env = process.env,
  actorRole = "operator",
  generatedAtMs = Date.now(),
} = {}) {
  const safePreflight =
    preflight ??
    createAdminReviewValidatorPreflight({
      decisionLog,
      reviewItems,
      generatedAtMs,
    });
  assertAdminReviewValidatorPreflightSafe(
    safePreflight,
    "admin review validator run plan preflight"
  );
  const safeAuthGate =
    authGateReport ??
    createAdminReviewAuthGateReport({
      env,
      actorRole,
      generatedAtMs,
    });
  assertAdminReviewAuthGateSafe(
    safeAuthGate,
    "admin review validator run plan auth gate"
  );
  const preflightReady = safePreflight.ready_for_private_validator === true;
  const noDecisionsWaiting =
    safePreflight.preflight_status === "no_decisions_waiting";
  const ready = preflightReady && safeAuthGate.private_runner_allowed === true;
  const authGateBlocked = preflightReady && !safeAuthGate.private_runner_allowed;
  const blockingReasons = noDecisionsWaiting
    ? safePreflight.blocking_reasons
    : [
        ...safePreflight.blocking_reasons,
        ...(authGateBlocked ? ["admin_review_auth_gate_blocked"] : []),
      ];
  const plan = {
    schema: "iris_admin_review_validator_run_plan_v1",
    generated_at_ms: generatedAtMs,
    run_plan_status:
      noDecisionsWaiting
        ? "not_needed"
        : ready
          ? "ready_for_private_runner"
          : "blocked_before_private_runner",
    planned_private_runner_item_count: ready
      ? safePreflight.ready_handoff_count
      : 0,
    blocked_runner_item_count: safePreflight.blocked_handoff_count,
    decision_count: safePreflight.decision_count,
    ready_handoff_count: safePreflight.ready_handoff_count,
    blocking_reasons: ready ? [] : blockingReasons,
    private_runner_input_materialized: false,
    private_validator_called: false,
    validator_execution_performed: false,
    validator_commit_performed: false,
    memory_store_write_performed: false,
    relationship_store_write_performed: false,
    raw_candidate_exposed: false,
    approved_record_exposed: false,
    next_safe_script: ready
      ? "npm run dev:admin:review-validator-run-plan"
      : authGateBlocked
        ? "npm run dev:admin:review-auth-gate"
      : safePreflight.next_safe_script,
    preflight_summary: {
      schema: "iris_admin_review_validator_run_plan_preflight_summary_v1",
      preflight_status: safePreflight.preflight_status,
      ready_for_private_validator: safePreflight.ready_for_private_validator,
      decision_count: safePreflight.decision_count,
      ready_handoff_count: safePreflight.ready_handoff_count,
      blocked_handoff_count: safePreflight.blocked_handoff_count,
      raw_candidate_exposed: false,
      approved_record_exposed: false,
    },
    auth_gate_summary: {
      schema: "iris_admin_review_validator_run_plan_auth_gate_summary_v1",
      auth_gate_status: safeAuthGate.auth_gate_status,
      private_runner_allowed: safeAuthGate.private_runner_allowed,
      actor_role_label: safeAuthGate.actor_role_label,
      configured_required_env_count: safeAuthGate.configured_required_env_count,
      missing_required_env_count: safeAuthGate.missing_required_env_names.length,
      raw_candidate_exposed: false,
      approved_record_exposed: false,
    },
    boundary_policy: {
      dry_run_plan_only: true,
      admin_authentication_required: true,
      owner_confirmation_required: true,
      decision_counts_only: true,
      private_runner_input_not_materialized: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_memory_or_relationship_store_write: true,
      no_private_validator_call: true,
      no_validator_execution: true,
      no_validator_commit: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_commands: true,
      no_game_or_os_input: true,
    },
  };
  assertAdminReviewValidatorRunPlanSafe(plan);
  return plan;
}

export function assertAdminReviewValidatorRunPlanSafe(
  plan,
  context = "admin review validator run plan"
) {
  assertSafeObject(plan, context);
  if (plan.schema !== "iris_admin_review_validator_run_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!ADMIN_REVIEW_VALIDATOR_RUN_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected run plan field ${field}`);
    }
  }
  if (!RUN_PLAN_STATUSES.has(plan.run_plan_status)) {
    throw new ContractError(`${context}: invalid run plan status`);
  }
  if (
    plan.private_runner_input_materialized !== false ||
    plan.private_validator_called !== false ||
    plan.validator_execution_performed !== false ||
    plan.validator_commit_performed !== false ||
    plan.memory_store_write_performed !== false ||
    plan.relationship_store_write_performed !== false ||
    plan.raw_candidate_exposed !== false ||
    plan.approved_record_exposed !== false
  ) {
    throw new ContractError(`${context}: execution, write, or exposure boundary failed`);
  }
  if (!Array.isArray(plan.blocking_reasons)) {
    throw new ContractError(`${context}: blocking reasons required`);
  }
  if (plan.blocking_reasons.some((reason) => !BLOCKING_REASONS.has(reason))) {
    throw new ContractError(`${context}: invalid blocking reason`);
  }
  for (const field of [
    "planned_private_runner_item_count",
    "blocked_runner_item_count",
    "decision_count",
    "ready_handoff_count",
  ]) {
    if (!Number.isInteger(plan[field]) || plan[field] < 0) {
      throw new ContractError(`${context}: invalid count`);
    }
  }
  if (
    plan.run_plan_status === "ready_for_private_runner" &&
    plan.planned_private_runner_item_count !== plan.ready_handoff_count
  ) {
    throw new ContractError(`${context}: ready count mismatch`);
  }
  if (
    plan.run_plan_status !== "ready_for_private_runner" &&
    plan.planned_private_runner_item_count !== 0
  ) {
    throw new ContractError(`${context}: blocked plan cannot include runner items`);
  }
  if (
    plan.blocked_runner_item_count !==
    plan.preflight_summary?.blocked_handoff_count
  ) {
    throw new ContractError(`${context}: blocked runner count mismatch`);
  }
  if (plan.decision_count !== plan.ready_handoff_count + plan.blocked_runner_item_count) {
    throw new ContractError(`${context}: decision count mismatch`);
  }
  const expectedStatus =
    plan.decision_count === 0
      ? "not_needed"
      : plan.preflight_summary?.ready_for_private_validator === true &&
          plan.auth_gate_summary?.private_runner_allowed === true
        ? "ready_for_private_runner"
        : "blocked_before_private_runner";
  if (plan.run_plan_status !== expectedStatus) {
    throw new ContractError(`${context}: run plan status mismatch`);
  }
  if (
    plan.run_plan_status === "ready_for_private_runner" &&
    plan.blocking_reasons.length !== 0
  ) {
    throw new ContractError(`${context}: ready plan cannot have blocking reasons`);
  }
  if (
    plan.run_plan_status !== "ready_for_private_runner" &&
    plan.decision_count > 0 &&
    plan.blocking_reasons.length < 1
  ) {
    throw new ContractError(`${context}: blocked plan requires blocking reason`);
  }
  if (
    plan.preflight_summary?.schema !==
      "iris_admin_review_validator_run_plan_preflight_summary_v1" ||
    plan.preflight_summary?.decision_count !== plan.decision_count ||
    plan.preflight_summary?.ready_handoff_count !== plan.ready_handoff_count ||
    plan.preflight_summary?.raw_candidate_exposed !== false ||
    plan.preflight_summary?.approved_record_exposed !== false ||
    plan.auth_gate_summary?.schema !==
      "iris_admin_review_validator_run_plan_auth_gate_summary_v1" ||
    plan.auth_gate_summary?.raw_candidate_exposed !== false ||
    plan.auth_gate_summary?.approved_record_exposed !== false
  ) {
    throw new ContractError(`${context}: run plan summary mismatch`);
  }
  assertPreflightSummarySafe(plan.preflight_summary, context);
  assertAuthGateSummarySafe(plan.auth_gate_summary, context);
  if (
    !["ready", "blocked"].includes(plan.auth_gate_summary.auth_gate_status) ||
    plan.auth_gate_summary.private_runner_allowed !==
      (plan.auth_gate_summary.auth_gate_status === "ready") ||
    plan.auth_gate_summary.configured_required_env_count +
      plan.auth_gate_summary.missing_required_env_count !==
      REQUIRED_AUTH_ENV_COUNT
  ) {
    throw new ContractError(`${context}: auth gate summary mismatch`);
  }
  if (
    typeof plan.next_safe_script !== "string" ||
    !NEXT_SAFE_SCRIPTS.has(plan.next_safe_script)
  ) {
    throw new ContractError(`${context}: invalid next safe script`);
  }
  assertBoundaryPolicy(
    plan.boundary_policy,
    {
      dry_run_plan_only: true,
      admin_authentication_required: true,
      owner_confirmation_required: true,
      decision_counts_only: true,
      private_runner_input_not_materialized: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_memory_or_relationship_store_write: true,
      no_private_validator_call: true,
      no_validator_execution: true,
      no_validator_commit: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_commands: true,
      no_game_or_os_input: true,
    },
    context
  );
}

function assertPreflightSummarySafe(
  summary,
  context = "admin review validator run plan preflight summary"
) {
  assertSafeObject(summary, context);
  for (const field of Object.keys(summary)) {
    if (!ADMIN_REVIEW_VALIDATOR_RUN_PLAN_PREFLIGHT_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected preflight summary field ${field}`);
    }
  }
}

function assertAuthGateSummarySafe(
  summary,
  context = "admin review validator run plan auth gate summary"
) {
  assertSafeObject(summary, context);
  for (const field of Object.keys(summary)) {
    if (!ADMIN_REVIEW_VALIDATOR_RUN_PLAN_AUTH_GATE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected auth gate summary field ${field}`);
    }
  }
}

function assertBoundaryPolicy(actual, expected, context) {
  assertSafeObject(actual, `${context}: boundary policy`);
  const allowedFields = new Set(Object.keys(expected));
  for (const field of Object.keys(actual)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const [field, value] of Object.entries(expected)) {
    if (actual?.[field] !== value) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertSafeObject(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: object required`);
  }
  if (URL_PATTERN.test(JSON.stringify(value))) {
    throw new ContractError(`${context}: endpoint value leaked`);
  }
  assertNoForbiddenFields(value, context);
}

function assertNoForbiddenFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { field, path });
    }
    assertNoForbiddenFields(child, context, `${path}.${field}`);
  }
}
