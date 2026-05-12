import { ContractError } from "../../core/contracts.js";
import {
  assertAdminReviewValidatorHandoffSafe,
  createAdminReviewValidatorHandoffReport,
} from "./adminReviewValidatorHandoff.js";

const URL_PATTERN = /https?:\/\/|postgres:\/\/|postgresql:\/\//i;
const PREFLIGHT_STATUSES = new Set([
  "no_decisions_waiting",
  "ready_for_private_validator",
  "blocked_before_validator",
]);
const BLOCKING_REASONS = new Set([
  "stale_or_missing_review_items",
  "blocked_handoff_items",
]);
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
const ADMIN_REVIEW_VALIDATOR_PREFLIGHT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "preflight_status",
  "ready_for_private_validator",
  "decision_count",
  "ready_handoff_count",
  "blocked_handoff_count",
  "missing_review_item_count",
  "action_mismatch_count",
  "blocking_reasons",
  "next_safe_script",
  "handoff_summary",
  "validator_execution_performed",
  "validator_commit_performed",
  "memory_store_write_performed",
  "relationship_store_write_performed",
  "raw_candidate_exposed",
  "approved_record_exposed",
  "boundary_policy",
]);
const ADMIN_REVIEW_VALIDATOR_PREFLIGHT_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "handoff_status",
  "decision_count",
  "ready_handoff_count",
  "blocked_handoff_count",
  "raw_candidate_exposed",
  "approved_record_exposed",
]);

export function createAdminReviewValidatorPreflight({
  handoffReport = null,
  decisionLog = null,
  reviewItems = [],
  generatedAtMs = Date.now(),
} = {}) {
  const handoff =
    handoffReport ??
    createAdminReviewValidatorHandoffReport({
      decisionLog,
      reviewItems,
      generatedAtMs,
    });
  assertAdminReviewValidatorHandoffSafe(handoff, "admin review validator preflight handoff");
  const blockingReasons = [];
  if (handoff.handoff_status === "blocked_stale_decisions") {
    blockingReasons.push("stale_or_missing_review_items");
  }
  if (handoff.blocked_handoff_count > 0) {
    blockingReasons.push("blocked_handoff_items");
  }
  const ready = handoff.ready_handoff_count > 0 && blockingReasons.length === 0;
  const preflight = {
    schema: "iris_admin_review_validator_preflight_v1",
    generated_at_ms: generatedAtMs,
    preflight_status:
      handoff.decision_count === 0
        ? "no_decisions_waiting"
        : ready
          ? "ready_for_private_validator"
          : "blocked_before_validator",
    ready_for_private_validator: ready,
    decision_count: handoff.decision_count,
    ready_handoff_count: handoff.ready_handoff_count,
    blocked_handoff_count: handoff.blocked_handoff_count,
    missing_review_item_count: handoff.missing_review_item_count,
    action_mismatch_count: handoff.action_mismatch_count,
    blocking_reasons: blockingReasons,
    next_safe_script:
      handoff.decision_count === 0
        ? "npm run dev:admin:review-queue"
        : ready
          ? "npm run dev:admin:review-validator-preflight"
          : "npm run dev:admin:review-validator-handoff",
    handoff_summary: {
      schema: "iris_admin_review_validator_preflight_handoff_summary_v1",
      handoff_status: handoff.handoff_status,
      decision_count: handoff.decision_count,
      ready_handoff_count: handoff.ready_handoff_count,
      blocked_handoff_count: handoff.blocked_handoff_count,
      raw_candidate_exposed: false,
      approved_record_exposed: false,
    },
    validator_execution_performed: false,
    validator_commit_performed: false,
    memory_store_write_performed: false,
    relationship_store_write_performed: false,
    raw_candidate_exposed: false,
    approved_record_exposed: false,
    boundary_policy: {
      preflight_only: true,
      decision_ids_and_counts_only: true,
      validator_input_not_materialized: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_memory_or_relationship_store_write: true,
      no_validator_execution: true,
      no_validator_commit: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_commands: true,
      no_game_or_os_input: true,
    },
  };
  assertAdminReviewValidatorPreflightSafe(preflight);
  return preflight;
}

export function assertAdminReviewValidatorPreflightSafe(
  preflight,
  context = "admin review validator preflight"
) {
  assertSafeObject(preflight, context);
  if (preflight.schema !== "iris_admin_review_validator_preflight_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(preflight)) {
    if (!ADMIN_REVIEW_VALIDATOR_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected preflight field ${field}`);
    }
  }
  if (!PREFLIGHT_STATUSES.has(preflight.preflight_status)) {
    throw new ContractError(`${context}: invalid preflight status`);
  }
  if (
    preflight.ready_for_private_validator !==
    (preflight.preflight_status === "ready_for_private_validator")
  ) {
    throw new ContractError(`${context}: ready flag mismatch`);
  }
  if (
    preflight.validator_execution_performed !== false ||
    preflight.validator_commit_performed !== false ||
    preflight.memory_store_write_performed !== false ||
    preflight.relationship_store_write_performed !== false ||
    preflight.raw_candidate_exposed !== false ||
    preflight.approved_record_exposed !== false
  ) {
    throw new ContractError(`${context}: execution, write, or raw exposure boundary failed`);
  }
  if (!Array.isArray(preflight.blocking_reasons)) {
    throw new ContractError(`${context}: blocking reasons required`);
  }
  if (preflight.blocking_reasons.some((reason) => !BLOCKING_REASONS.has(reason))) {
    throw new ContractError(`${context}: invalid blocking reason`);
  }
  for (const field of [
    "decision_count",
    "ready_handoff_count",
    "blocked_handoff_count",
    "missing_review_item_count",
    "action_mismatch_count",
  ]) {
    if (!Number.isInteger(preflight[field]) || preflight[field] < 0) {
      throw new ContractError(`${context}: invalid count`);
    }
  }
  if (
    preflight.decision_count !==
    preflight.ready_handoff_count + preflight.blocked_handoff_count
  ) {
    throw new ContractError(`${context}: count mismatch`);
  }
  if (
    preflight.missing_review_item_count < 0 ||
    preflight.action_mismatch_count < 0 ||
    preflight.missing_review_item_count + preflight.action_mismatch_count >
      preflight.blocked_handoff_count
  ) {
    throw new ContractError(`${context}: blocked reason count mismatch`);
  }
  const expectedStatus =
    preflight.decision_count === 0
      ? "no_decisions_waiting"
      : preflight.ready_handoff_count > 0 &&
          preflight.blocked_handoff_count === 0 &&
          preflight.blocking_reasons.length === 0
        ? "ready_for_private_validator"
        : "blocked_before_validator";
  if (preflight.preflight_status !== expectedStatus) {
    throw new ContractError(`${context}: preflight status mismatch`);
  }
  const expectedNextScript =
    preflight.decision_count === 0
      ? "npm run dev:admin:review-queue"
      : preflight.preflight_status === "ready_for_private_validator"
        ? "npm run dev:admin:review-validator-preflight"
        : "npm run dev:admin:review-validator-handoff";
  if (preflight.next_safe_script !== expectedNextScript) {
    throw new ContractError(`${context}: next safe script mismatch`);
  }
  assertHandoffSummarySafe(preflight.handoff_summary, context);
  if (
    preflight.handoff_summary?.schema !==
      "iris_admin_review_validator_preflight_handoff_summary_v1" ||
    preflight.handoff_summary?.handoff_status !==
      (preflight.decision_count === 0
        ? "empty"
        : preflight.blocked_handoff_count > 0
          ? "blocked_stale_decisions"
          : "ready_for_validator") ||
    preflight.handoff_summary?.decision_count !== preflight.decision_count ||
    preflight.handoff_summary?.ready_handoff_count !==
      preflight.ready_handoff_count ||
    preflight.handoff_summary?.blocked_handoff_count !==
      preflight.blocked_handoff_count ||
    preflight.handoff_summary?.raw_candidate_exposed !== false ||
    preflight.handoff_summary?.approved_record_exposed !== false
  ) {
    throw new ContractError(`${context}: handoff summary mismatch`);
  }
  assertBoundaryPolicy(
    preflight.boundary_policy,
    {
      preflight_only: true,
      decision_ids_and_counts_only: true,
      validator_input_not_materialized: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_memory_or_relationship_store_write: true,
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

function assertHandoffSummarySafe(
  summary,
  context = "admin review validator preflight handoff summary"
) {
  assertSafeObject(summary, context);
  for (const field of Object.keys(summary)) {
    if (!ADMIN_REVIEW_VALIDATOR_PREFLIGHT_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected handoff summary field ${field}`);
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
