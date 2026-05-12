import { ContractError } from "../../core/contracts.js";
import {
  assertAdminReviewDecisionLogStatusSafe,
  assertAdminReviewDecisionSummarySafe,
  summarizeAdminReviewDecisions,
} from "./adminReviewDecisionLog.js";
import {
  assertAdminReviewQueueDecisionSafe,
  assertAdminReviewQueueReportSafe,
  createAdminReviewQueueReport,
} from "./adminReviewQueue.js";

const URL_PATTERN = /https?:\/\/|postgres:\/\/|postgresql:\/\//i;
const HANDOFF_STATUSES = new Set([
  "empty",
  "ready_for_validator",
  "blocked_stale_decisions",
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
const ADMIN_REVIEW_VALIDATOR_HANDOFF_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "handoff_status",
  "decision_count",
  "ready_handoff_count",
  "blocked_handoff_count",
  "missing_review_item_count",
  "action_mismatch_count",
  "items",
  "decision_summary",
  "review_queue_summary",
  "decision_log_status",
  "validator_commit_performed",
  "memory_store_write_performed",
  "relationship_store_write_performed",
  "raw_candidate_exposed",
  "approved_record_exposed",
  "boundary_policy",
]);
const ADMIN_REVIEW_VALIDATOR_HANDOFF_ITEM_FIELDS = new Set([
  "schema",
  "decision_id",
  "review_id",
  "action_id",
  "review_group",
  "handoff_item_status",
  "blocked_reason",
  "validator_commit_performed",
  "raw_candidate_exposed",
  "approved_record_exposed",
]);
const ADMIN_REVIEW_VALIDATOR_HANDOFF_QUEUE_SUMMARY_FIELDS = new Set([
  "schema",
  "queue_status",
  "review_item_count",
  "actionable_item_count",
  "memory_review_count",
  "relationship_review_count",
  "game_review_count",
  "other_review_count",
  "raw_candidate_exposed",
  "approved_record_exposed",
]);

export function createAdminReviewValidatorHandoffReport({
  decisionLog,
  decisions = null,
  reviewItems = [],
  generatedAtMs = Date.now(),
  limit = 100,
} = {}) {
  const safeDecisions = (decisions ?? decisionLog?.list?.(limit) ?? []).slice(-limit);
  safeDecisions.forEach((decision) =>
    assertAdminReviewQueueDecisionSafe(decision, "admin review validator handoff source")
  );
  const reviewQueue = createAdminReviewQueueReport({
    reviewItems,
    generatedAtMs,
    limit: 200,
  });
  const queueItemsById = new Map(
    reviewQueue.items.map((item) => [item.review_id, item])
  );
  const handoffItems = safeDecisions.map((decision) =>
    createHandoffItem({ decision, queueItemsById })
  );
  const readyItems = handoffItems.filter((item) => item.handoff_item_status === "ready");
  const blockedItems = handoffItems.filter(
    (item) => item.handoff_item_status === "blocked"
  );
  const decisionLogStatus =
    decisionLog?.status?.() ??
    createMemoryDecisionLogStatus(safeDecisions, generatedAtMs);
  assertAdminReviewDecisionLogStatusSafe(
    decisionLogStatus,
    "admin review validator handoff log status"
  );
  const report = {
    schema: "iris_admin_review_validator_handoff_v1",
    generated_at_ms: generatedAtMs,
    handoff_status:
      handoffItems.length === 0
        ? "empty"
        : blockedItems.length > 0
          ? "blocked_stale_decisions"
          : "ready_for_validator",
    decision_count: safeDecisions.length,
    ready_handoff_count: readyItems.length,
    blocked_handoff_count: blockedItems.length,
    missing_review_item_count: handoffItems.filter(
      (item) => item.blocked_reason === "review_item_missing"
    ).length,
    action_mismatch_count: handoffItems.filter(
      (item) => item.blocked_reason === "action_no_longer_matches_review_group"
    ).length,
    items: handoffItems,
    decision_summary: summarizeAdminReviewDecisions(safeDecisions),
    review_queue_summary: {
      schema: "iris_admin_review_validator_handoff_queue_summary_v1",
      queue_status: reviewQueue.queue_status,
      review_item_count: reviewQueue.review_item_count,
      actionable_item_count: reviewQueue.actionable_item_count,
      memory_review_count: reviewQueue.memory_review_count,
      relationship_review_count: reviewQueue.relationship_review_count,
      game_review_count: reviewQueue.game_review_count,
      other_review_count: reviewQueue.other_review_count,
      raw_candidate_exposed: false,
      approved_record_exposed: false,
    },
    decision_log_status: decisionLogStatus,
    validator_commit_performed: false,
    memory_store_write_performed: false,
    relationship_store_write_performed: false,
    raw_candidate_exposed: false,
    approved_record_exposed: false,
    boundary_policy: {
      read_only_handoff_report: true,
      decision_ids_and_counts_only: true,
      validator_handoff_only: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_memory_or_relationship_store_write: true,
      no_validator_commit: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_commands: true,
      no_game_or_os_input: true,
    },
  };
  assertAdminReviewValidatorHandoffSafe(report);
  assertAdminReviewQueueReportSafe(reviewQueue, "admin review validator handoff queue");
  return report;
}

export function assertAdminReviewValidatorHandoffSafe(
  report,
  context = "admin review validator handoff"
) {
  assertSafeObject(report, context);
  if (report.schema !== "iris_admin_review_validator_handoff_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!ADMIN_REVIEW_VALIDATOR_HANDOFF_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected handoff field ${field}`);
    }
  }
  if (!HANDOFF_STATUSES.has(report.handoff_status)) {
    throw new ContractError(`${context}: invalid handoff status`);
  }
  if (!Array.isArray(report.items)) {
    throw new ContractError(`${context}: items required`);
  }
  report.items.forEach((item) => assertHandoffItemSafe(item, context));
  if (
    report.decision_count !== report.items.length ||
    report.ready_handoff_count !==
      report.items.filter((item) => item.handoff_item_status === "ready").length ||
    report.blocked_handoff_count !==
      report.items.filter((item) => item.handoff_item_status === "blocked").length
  ) {
    throw new ContractError(`${context}: handoff counts mismatch`);
  }
  if (
    report.missing_review_item_count !==
      report.items.filter((item) => item.blocked_reason === "review_item_missing")
        .length ||
    report.action_mismatch_count !==
      report.items.filter(
        (item) => item.blocked_reason === "action_no_longer_matches_review_group"
      ).length
  ) {
    throw new ContractError(`${context}: blocked reason counts mismatch`);
  }
  const expectedHandoffStatus =
    report.decision_count === 0
      ? "empty"
      : report.blocked_handoff_count > 0
        ? "blocked_stale_decisions"
        : "ready_for_validator";
  if (report.handoff_status !== expectedHandoffStatus) {
    throw new ContractError(`${context}: handoff status mismatch`);
  }
  if (
    report.validator_commit_performed !== false ||
    report.memory_store_write_performed !== false ||
    report.relationship_store_write_performed !== false ||
    report.raw_candidate_exposed !== false ||
    report.approved_record_exposed !== false
  ) {
    throw new ContractError(`${context}: write or raw exposure boundary failed`);
  }
  assertAdminReviewDecisionLogStatusSafe(report.decision_log_status, context);
  assertAdminReviewDecisionSummarySafe(report.decision_summary, context);
  assertReviewQueueSummarySafe(report.review_queue_summary, context);
  if (
    report.decision_summary.decision_count !== report.decision_count ||
    report.decision_summary.approve_memory_count !==
      report.items.filter((item) => item.action_id === "approve_memory_candidate")
        .length ||
    report.decision_summary.reject_memory_count !==
      report.items.filter((item) => item.action_id === "reject_memory_candidate")
        .length ||
    report.decision_summary.approve_relationship_count !==
      report.items.filter(
        (item) => item.action_id === "approve_relationship_candidate"
      ).length ||
    report.decision_summary.reject_relationship_count !==
      report.items.filter(
        (item) => item.action_id === "reject_relationship_candidate"
      ).length
  ) {
    throw new ContractError(`${context}: decision summary mismatch`);
  }
  if (report.decision_log_status.entry_count !== report.decision_count) {
    throw new ContractError(`${context}: decision log status mismatch`);
  }
  assertBoundaryPolicy(
    report.boundary_policy,
    {
      read_only_handoff_report: true,
      decision_ids_and_counts_only: true,
      validator_handoff_only: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_memory_or_relationship_store_write: true,
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

function createHandoffItem({ decision, queueItemsById }) {
  const reviewItem = queueItemsById.get(decision.review_id) ?? null;
  const actionMatches =
    reviewItem &&
    ((reviewItem.review_group === "memory" &&
      ["approve_memory_candidate", "reject_memory_candidate"].includes(
        decision.action_id
      )) ||
      (reviewItem.review_group === "relationship" &&
        [
          "approve_relationship_candidate",
          "reject_relationship_candidate",
        ].includes(decision.action_id)));
  const item = {
    schema: "iris_admin_review_validator_handoff_item_v1",
    decision_id: sanitizeId(decision.decision_id),
    review_id: sanitizeId(decision.review_id),
    action_id: decision.action_id,
    review_group: decision.review_group,
    handoff_item_status: reviewItem && actionMatches ? "ready" : "blocked",
    blocked_reason: reviewItem
      ? actionMatches
        ? null
        : "action_no_longer_matches_review_group"
      : "review_item_missing",
    validator_commit_performed: false,
    raw_candidate_exposed: false,
    approved_record_exposed: false,
  };
  assertHandoffItemSafe(item);
  return item;
}

function assertHandoffItemSafe(item, context = "admin review handoff item") {
  assertSafeObject(item, context);
  if (item.schema !== "iris_admin_review_validator_handoff_item_v1") {
    throw new ContractError(`${context}: invalid item schema`);
  }
  for (const field of Object.keys(item)) {
    if (!ADMIN_REVIEW_VALIDATOR_HANDOFF_ITEM_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected handoff item field ${field}`);
    }
  }
  if (!["ready", "blocked"].includes(item.handoff_item_status)) {
    throw new ContractError(`${context}: invalid item status`);
  }
  if (
    item.handoff_item_status === "ready" &&
    item.blocked_reason !== null
  ) {
    throw new ContractError(`${context}: ready item cannot have blocked reason`);
  }
  if (
    item.handoff_item_status === "blocked" &&
    !["review_item_missing", "action_no_longer_matches_review_group"].includes(
      item.blocked_reason
    )
  ) {
    throw new ContractError(`${context}: invalid blocked reason`);
  }
  if (
    item.validator_commit_performed !== false ||
    item.raw_candidate_exposed !== false ||
    item.approved_record_exposed !== false
  ) {
    throw new ContractError(`${context}: unsafe item boundary`);
  }
}

function assertReviewQueueSummarySafe(
  summary,
  context = "admin review validator handoff queue summary"
) {
  assertSafeObject(summary, context);
  if (summary.schema !== "iris_admin_review_validator_handoff_queue_summary_v1") {
    throw new ContractError(`${context}: invalid queue summary schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ADMIN_REVIEW_VALIDATOR_HANDOFF_QUEUE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected queue summary field ${field}`);
    }
  }
  if (
    summary.raw_candidate_exposed !== false ||
    summary.approved_record_exposed !== false
  ) {
    throw new ContractError(`${context}: unsafe queue summary boundary`);
  }
}

function createMemoryDecisionLogStatus(decisions, generatedAtMs) {
  return {
    schema: "iris_admin_review_decision_log_status_v1",
    health: "ready",
    store_available: true,
    read_error: false,
    error_kind: null,
    entry_count: decisions.length,
    latest_decision_at_ms:
      decisions.reduce((latest, decision) => Math.max(latest, decision.created_at_ms), null),
    action_counts: {
      approve_memory_candidate: decisions.filter(
        (decision) => decision.action_id === "approve_memory_candidate"
      ).length,
      reject_memory_candidate: decisions.filter(
        (decision) => decision.action_id === "reject_memory_candidate"
      ).length,
      approve_relationship_candidate: decisions.filter(
        (decision) => decision.action_id === "approve_relationship_candidate"
      ).length,
      reject_relationship_candidate: decisions.filter(
        (decision) => decision.action_id === "reject_relationship_candidate"
      ).length,
    },
    max_entries: decisions.length,
    retention_enabled: false,
    recovery: generatedAtMs >= 0 ? "in_memory" : "in_memory",
    boundary_policy: {
      counts_only: true,
      decision_summaries_only: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_memory_or_relationship_store_write: true,
      no_validator_commit: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_commands: true,
      no_raw_frames: true,
      no_store_paths: true,
    },
  };
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

function sanitizeId(value) {
  return String(value ?? "")
    .replace(/[^a-zA-Z0-9:_-]/g, "_")
    .slice(0, 180);
}
