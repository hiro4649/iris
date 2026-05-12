import { ContractError } from "../../core/contracts.js";
import { assertCandidateReviewItemSafe } from "./candidateReviewQueue.js";

const URL_PATTERN = /https?:\/\/|postgres:\/\/|postgresql:\/\//i;
const FORBIDDEN_FIELD_NAMES = new Set([
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
  "raw_frame",
  "ocr_text",
  "payload",
  "raw_candidate_payload",
  "raw_comment",
  "raw_comments",
  "raw_support",
  "raw_support_text",
  "support_text",
  "hidden_score",
  "hidden_scores",
  "hidden_rank",
]);
const REVIEW_ACTIONS = new Set([
  "approve_memory_candidate",
  "reject_memory_candidate",
  "approve_relationship_candidate",
  "reject_relationship_candidate",
]);
const QUEUE_STATUSES = new Set(["empty", "review_required", "blocked_only"]);
const ADMIN_REVIEW_QUEUE_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "queue_status",
  "review_item_count",
  "actionable_item_count",
  "memory_review_count",
  "relationship_review_count",
  "game_review_count",
  "other_review_count",
  "next_review_id",
  "next_recommended_action_id",
  "items",
  "boundary_policy",
]);
const ADMIN_REVIEW_QUEUE_ACTION_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "action_status",
  "dry_run_only",
  "store_write_performed",
  "validator_commit_performed",
  "review_id",
  "action_id",
  "review_item_found",
  "review_group",
  "values_hidden",
  "raw_candidate_exposed",
  "approved_record_exposed",
  "owner_confirmation_required_before_commit",
  "boundary_policy",
]);
const ADMIN_REVIEW_QUEUE_DECISION_RESULT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "decision_status",
  "recorded",
  "review_id",
  "action_id",
  "review_group",
  "review_item_found",
  "dry_run_only",
  "decision_store_write_performed",
  "validator_commit_performed",
  "memory_store_write_performed",
  "relationship_store_write_performed",
  "raw_candidate_exposed",
  "approved_record_exposed",
  "owner_confirmation_required_before_commit",
  "decision",
  "decision_summary",
  "boundary_policy",
]);
const ADMIN_REVIEW_QUEUE_ITEM_FIELDS = new Set([
  "schema",
  "review_id",
  "review_group",
  "item_kind",
  "status",
  "source_phase",
  "source_candidate_kind_label",
  "public_summary",
  "subject_hint",
  "risk_tag_count",
  "review_route_label",
  "actionable_by_admin",
  "recommended_action_id",
  "raw_candidate_exposed",
  "approved_record_exposed",
  "boundary_policy",
]);
const ADMIN_REVIEW_QUEUE_DECISION_FIELDS = new Set([
  "schema",
  "decision_id",
  "review_id",
  "action_id",
  "review_group",
  "decision_status",
  "actor_role_label",
  "created_at_ms",
  "raw_candidate_exposed",
  "approved_record_exposed",
  "boundary_policy",
]);
const ADMIN_REVIEW_QUEUE_DECISION_SUMMARY_FIELDS = new Set([
  "schema",
  "decision_count",
  "approve_memory_count",
  "reject_memory_count",
  "approve_relationship_count",
  "reject_relationship_count",
  "latest_decision_id",
  "raw_candidate_exposed",
  "approved_record_exposed",
]);
const ADMIN_CANDIDATE_REVIEW_COUNT_SURFACE_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "queue_status",
  "review_item_count",
  "actionable_item_count",
  "memory_review_count",
  "relationship_review_count",
  "game_review_count",
  "other_review_count",
  "has_actionable_items",
  "next_action_label",
  "boundary_policy",
]);
const ADMIN_CANDIDATE_REVIEW_COUNT_SURFACE_BOUNDARY = {
  counts_status_and_safe_labels_only: true,
  no_item_values: true,
  no_raw_candidates: true,
  no_raw_comments: true,
  no_raw_support_text: true,
  no_hidden_scores: true,
  no_commands: true,
};

export function createAdminReviewQueueReport({
  reviewItems = [],
  generatedAtMs = Date.now(),
  limit = 50,
} = {}) {
  const safeLimit = clampInteger(limit, 1, 200, 50);
  const safeItems = reviewItems.slice(-safeLimit).map(summarizeReviewItem);
  const actionableItems = safeItems.filter((item) => item.actionable_by_admin);
  const report = {
    schema: "iris_admin_review_queue_v1",
    generated_at_ms: generatedAtMs,
    queue_status:
      safeItems.length === 0
        ? "empty"
        : actionableItems.length > 0
          ? "review_required"
          : "blocked_only",
    review_item_count: safeItems.length,
    actionable_item_count: actionableItems.length,
    memory_review_count: safeItems.filter((item) => item.review_group === "memory")
      .length,
    relationship_review_count: safeItems.filter(
      (item) => item.review_group === "relationship"
    ).length,
    game_review_count: safeItems.filter((item) => item.review_group === "game").length,
    other_review_count: safeItems.filter((item) => item.review_group === "other").length,
    next_review_id: actionableItems[0]?.review_id ?? null,
    next_recommended_action_id: actionableItems[0]?.recommended_action_id ?? null,
    items: safeItems,
    boundary_policy: reportBoundaryPolicy(),
  };
  assertAdminReviewQueueReportSafe(report);
  return report;
}

export function createAdminCandidateReviewCountSurface({
  reviewItems = [],
  generatedAtMs = Date.now(),
  limit = 200,
} = {}) {
  const report = createAdminReviewQueueReport({ reviewItems, generatedAtMs, limit });
  const surface = {
    schema: "iris_admin_candidate_review_count_surface_v1",
    generated_at_ms: generatedAtMs,
    queue_status: report.queue_status,
    review_item_count: report.review_item_count,
    actionable_item_count: report.actionable_item_count,
    memory_review_count: report.memory_review_count,
    relationship_review_count: report.relationship_review_count,
    game_review_count: report.game_review_count,
    other_review_count: report.other_review_count,
    has_actionable_items: report.actionable_item_count > 0,
    next_action_label: report.next_recommended_action_id
      ? safeLabel(report.next_recommended_action_id)
      : null,
    boundary_policy: { ...ADMIN_CANDIDATE_REVIEW_COUNT_SURFACE_BOUNDARY },
  };
  assertAdminCandidateReviewCountSurfaceSafe(surface);
  return surface;
}

export function createAdminReviewQueueActionPlan({
  body = {},
  reviewItems = [],
  generatedAtMs = Date.now(),
} = {}) {
  const action = String(body?.action ?? "").trim();
  const reviewId = String(body?.review_id ?? "").trim();
  const item = reviewItems.find((candidate) => candidate?.review_id === reviewId) ?? null;
  if (item) assertCandidateReviewItemSafe(item, "admin review action item");
  const actionAllowed = REVIEW_ACTIONS.has(action);
  const itemSummary = item ? summarizeReviewItem(item) : null;
  const actionMatchesItem =
    actionAllowed && itemSummary
      ? isActionAllowedForGroup(action, itemSummary.review_group)
      : false;
  const plan = {
    schema: "iris_admin_review_queue_action_plan_v1",
    generated_at_ms: generatedAtMs,
    action_status:
      actionAllowed && itemSummary && actionMatchesItem
        ? "validated_for_operator_review"
        : "blocked",
    dry_run_only: true,
    store_write_performed: false,
    validator_commit_performed: false,
    review_id: safeReviewId(reviewId),
    action_id: actionAllowed ? action : "unsupported_action",
    review_item_found: Boolean(itemSummary),
    review_group: itemSummary?.review_group ?? null,
    values_hidden: true,
    raw_candidate_exposed: false,
    approved_record_exposed: false,
    owner_confirmation_required_before_commit: true,
    boundary_policy: {
      dry_run_only: true,
      action_and_review_id_only: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_store_write: true,
      no_validator_commit: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_commands: true,
      no_game_or_os_input: true,
    },
  };
  assertAdminReviewQueueActionPlanSafe(plan);
  return plan;
}

export function createInMemoryAdminReviewDecisionStore({ limit = 200 } = {}) {
  const decisions = [];
  const maxItems = clampInteger(limit, 1, 1000, 200);
  return {
    append(decision) {
      assertAdminReviewQueueDecisionSafe(decision);
      decisions.push(structuredClone(decision));
      while (decisions.length > maxItems) decisions.shift();
      return structuredClone(decision);
    },
    list(limitCount = maxItems) {
      const safeLimit = clampInteger(limitCount, 1, maxItems, maxItems);
      return structuredClone(decisions.slice(-safeLimit));
    },
    summary() {
      return summarizeDecisions(decisions);
    },
  };
}

export function applyAdminReviewQueueDecision({
  store,
  body = {},
  reviewItems = [],
  actorRole = "operator",
  confirmed = false,
  nowMs = Date.now(),
} = {}) {
  const plan = createAdminReviewQueueActionPlan({
    body,
    reviewItems,
    generatedAtMs: nowMs,
  });
  const confirmationOk = confirmed === true;
  const canRecord =
    Boolean(store) &&
    plan.action_status === "validated_for_operator_review" &&
    confirmationOk;
  const decision = canRecord
    ? store.append(
        createDecisionRecord({
          plan,
          actorRole,
          createdAtMs: nowMs,
        })
      )
    : null;
  const result = {
    schema: "iris_admin_review_queue_decision_result_v1",
    generated_at_ms: nowMs,
    decision_status: canRecord
      ? "recorded_for_validator_handoff"
      : confirmationOk
        ? "blocked"
        : "blocked_confirmation_required",
    recorded: canRecord,
    review_id: plan.review_id,
    action_id: plan.action_id,
    review_group: plan.review_group,
    review_item_found: plan.review_item_found,
    dry_run_only: false,
    decision_store_write_performed: canRecord,
    validator_commit_performed: false,
    memory_store_write_performed: false,
    relationship_store_write_performed: false,
    raw_candidate_exposed: false,
    approved_record_exposed: false,
    owner_confirmation_required_before_commit: true,
    decision,
    decision_summary: store?.summary?.() ?? summarizeDecisions([]),
    boundary_policy: {
      decision_summary_only: true,
      owner_confirmation_required: true,
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
  assertAdminReviewQueueDecisionResultSafe(result);
  return result;
}

export function assertAdminReviewQueueReportSafe(
  report,
  context = "admin review queue"
) {
  assertSafeObject(report, context);
  if (report.schema !== "iris_admin_review_queue_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!ADMIN_REVIEW_QUEUE_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field ${field}`);
    }
  }
  if (!QUEUE_STATUSES.has(report.queue_status)) {
    throw new ContractError(`${context}: invalid queue status`);
  }
  if (!Array.isArray(report.items)) {
    throw new ContractError(`${context}: items required`);
  }
  report.items.forEach((item) => assertReviewSummarySafe(item, context));
  const counts = {
    review_item_count: report.items.length,
    actionable_item_count: report.items.filter((item) => item.actionable_by_admin)
      .length,
    memory_review_count: report.items.filter((item) => item.review_group === "memory")
      .length,
    relationship_review_count: report.items.filter(
      (item) => item.review_group === "relationship"
    ).length,
    game_review_count: report.items.filter((item) => item.review_group === "game")
      .length,
    other_review_count: report.items.filter((item) => item.review_group === "other")
      .length,
  };
  for (const [field, value] of Object.entries(counts)) {
    if (report[field] !== value) {
      throw new ContractError(`${context}: ${field} mismatch`);
    }
  }
  if (
    report.memory_review_count +
      report.relationship_review_count +
      report.game_review_count +
      report.other_review_count !==
    report.review_item_count
  ) {
    throw new ContractError(`${context}: review group counts mismatch`);
  }
  const expectedQueueStatus =
    report.review_item_count === 0
      ? "empty"
      : report.actionable_item_count > 0
        ? "review_required"
        : "blocked_only";
  if (report.queue_status !== expectedQueueStatus) {
    throw new ContractError(`${context}: queue status mismatch`);
  }
  const firstActionable = report.items.find((item) => item.actionable_by_admin) ?? null;
  if (
    report.next_review_id !== (firstActionable?.review_id ?? null) ||
    report.next_recommended_action_id !==
      (firstActionable?.recommended_action_id ?? null)
  ) {
    throw new ContractError(`${context}: next review mismatch`);
  }
  assertBoundaryPolicy(report.boundary_policy, reportBoundaryPolicy(), context);
}

export function assertAdminReviewQueueActionPlanSafe(
  plan,
  context = "admin review action plan"
) {
  assertSafeObject(plan, context);
  if (plan.schema !== "iris_admin_review_queue_action_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!ADMIN_REVIEW_QUEUE_ACTION_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected action plan field ${field}`);
    }
  }
  if (!["validated_for_operator_review", "blocked"].includes(plan.action_status)) {
    throw new ContractError(`${context}: invalid action status`);
  }
  if (plan.dry_run_only !== true || plan.store_write_performed !== false) {
    throw new ContractError(`${context}: dry-run no-write boundary required`);
  }
  if (
    plan.validator_commit_performed !== false ||
    plan.raw_candidate_exposed !== false ||
    plan.approved_record_exposed !== false
  ) {
    throw new ContractError(`${context}: raw candidate or approved record exposed`);
  }
  if (plan.values_hidden !== true || plan.owner_confirmation_required_before_commit !== true) {
    throw new ContractError(`${context}: hidden value confirmation boundary required`);
  }
  if (plan.action_id !== "unsupported_action" && !REVIEW_ACTIONS.has(plan.action_id)) {
    throw new ContractError(`${context}: invalid action id`);
  }
  if (!["memory", "relationship", null].includes(plan.review_group)) {
    throw new ContractError(`${context}: invalid review group`);
  }
  const actionMatchesGroup =
    plan.action_id !== "unsupported_action" &&
    plan.review_group !== null &&
    isActionAllowedForGroup(plan.action_id, plan.review_group);
  if (
    plan.action_status === "validated_for_operator_review" &&
    (!plan.review_item_found || !actionMatchesGroup)
  ) {
    throw new ContractError(`${context}: validated action mismatch`);
  }
  if (
    plan.action_status === "blocked" &&
    plan.review_item_found &&
    actionMatchesGroup
  ) {
    throw new ContractError(`${context}: blocked action mismatch`);
  }
  assertBoundaryPolicy(
    plan.boundary_policy,
    {
      dry_run_only: true,
      action_and_review_id_only: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_store_write: true,
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

export function assertAdminReviewQueueDecisionSafe(
  decision,
  context = "admin review queue decision"
) {
  assertSafeObject(decision, context);
  if (decision.schema !== "iris_admin_review_queue_decision_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(decision)) {
    if (!ADMIN_REVIEW_QUEUE_DECISION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected decision field ${field}`);
    }
  }
  if (
    decision.decision_status !== "recorded_for_validator_handoff" ||
    decision.raw_candidate_exposed !== false ||
    decision.approved_record_exposed !== false
  ) {
    throw new ContractError(`${context}: unsafe decision status`);
  }
  if (!REVIEW_ACTIONS.has(decision.action_id)) {
    throw new ContractError(`${context}: invalid action`);
  }
  if (!["memory", "relationship"].includes(decision.review_group)) {
    throw new ContractError(`${context}: invalid review group`);
  }
  if (!isActionAllowedForGroup(decision.action_id, decision.review_group)) {
    throw new ContractError(`${context}: action review group mismatch`);
  }
  if (
    typeof decision.decision_id !== "string" ||
    decision.decision_id.length < 1 ||
    typeof decision.review_id !== "string" ||
    decision.review_id.length < 1 ||
    typeof decision.actor_role_label !== "string" ||
    !/^[a-zA-Z0-9:_-]{1,80}$/.test(decision.actor_role_label) ||
    !Number.isInteger(decision.created_at_ms) ||
    decision.created_at_ms < 0
  ) {
    throw new ContractError(`${context}: invalid decision identifiers`);
  }
  assertBoundaryPolicy(
    decision.boundary_policy,
    {
      decision_summary_only: true,
      validator_handoff_only: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_store_write: true,
      no_validator_commit: true,
    },
    context
  );
}

export function assertAdminReviewQueueDecisionResultSafe(
  result,
  context = "admin review queue decision result"
) {
  assertSafeObject(result, context);
  if (result.schema !== "iris_admin_review_queue_decision_result_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(result)) {
    if (!ADMIN_REVIEW_QUEUE_DECISION_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected decision result field ${field}`);
    }
  }
  if (
    ![
      "recorded_for_validator_handoff",
      "blocked_confirmation_required",
      "blocked",
    ].includes(result.decision_status)
  ) {
    throw new ContractError(`${context}: invalid decision status`);
  }
  if (
    result.validator_commit_performed !== false ||
    result.memory_store_write_performed !== false ||
    result.relationship_store_write_performed !== false ||
    result.raw_candidate_exposed !== false ||
    result.approved_record_exposed !== false
  ) {
    throw new ContractError(`${context}: persistence or raw exposure boundary failed`);
  }
  if (result.recorded !== (result.decision_status === "recorded_for_validator_handoff")) {
    throw new ContractError(`${context}: recorded flag mismatch`);
  }
  if (
    result.decision_store_write_performed !== result.recorded ||
    result.owner_confirmation_required_before_commit !== true ||
    result.dry_run_only !== false
  ) {
    throw new ContractError(`${context}: decision write boundary mismatch`);
  }
  if (result.recorded !== Boolean(result.decision)) {
    throw new ContractError(`${context}: decision presence mismatch`);
  }
  if (result.decision) {
    assertAdminReviewQueueDecisionSafe(result.decision, context);
    if (
      result.decision.review_id !== result.review_id ||
      result.decision.action_id !== result.action_id ||
      result.decision.review_group !== result.review_group
    ) {
      throw new ContractError(`${context}: decision result mismatch`);
    }
  }
  assertDecisionSummarySafe(result.decision_summary, context);
  if (
    result.recorded &&
    result.decision_summary.latest_decision_id !== result.decision.decision_id
  ) {
    throw new ContractError(`${context}: latest decision summary mismatch`);
  }
  assertBoundaryPolicy(
    result.boundary_policy,
    {
      decision_summary_only: true,
      owner_confirmation_required: true,
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

export function assertAdminCandidateReviewCountSurfaceSafe(
  surface,
  context = "admin candidate review count surface"
) {
  assertSafeObject(surface, context);
  if (surface.schema !== "iris_admin_candidate_review_count_surface_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(surface)) {
    if (!ADMIN_CANDIDATE_REVIEW_COUNT_SURFACE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!QUEUE_STATUSES.has(surface.queue_status)) {
    throw new ContractError(`${context}: invalid queue status`);
  }
  for (const field of [
    "review_item_count",
    "actionable_item_count",
    "memory_review_count",
    "relationship_review_count",
    "game_review_count",
    "other_review_count",
  ]) {
    if (!Number.isInteger(surface[field]) || surface[field] < 0) {
      throw new ContractError(`${context}: invalid count ${field}`);
    }
  }
  if (
    surface.memory_review_count +
      surface.relationship_review_count +
      surface.game_review_count +
      surface.other_review_count !==
    surface.review_item_count
  ) {
    throw new ContractError(`${context}: review group counts mismatch`);
  }
  if (surface.has_actionable_items !== (surface.actionable_item_count > 0)) {
    throw new ContractError(`${context}: actionable flag mismatch`);
  }
  if (
    surface.next_action_label !== null &&
    !["approve_memory_candidate", "approve_relationship_candidate"].includes(
      surface.next_action_label
    )
  ) {
    throw new ContractError(`${context}: invalid next action label`);
  }
  assertBoundaryPolicy(
    surface.boundary_policy,
    ADMIN_CANDIDATE_REVIEW_COUNT_SURFACE_BOUNDARY,
    context
  );
  assertNoUnsafeSurfaceText(surface, context);
}

function summarizeReviewItem(item) {
  assertCandidateReviewItemSafe(item, "admin review source item");
  const reviewGroup = classifyReviewGroup(item.item_kind);
  const actionableByAdmin =
    ["memory", "relationship"].includes(reviewGroup) &&
    item.status === "validation_required";
  return {
    schema: "iris_admin_review_queue_item_v1",
    review_id: safeReviewId(item.review_id),
    review_group: reviewGroup,
    item_kind: item.item_kind,
    status: item.status,
    source_phase: safeLabel(item.source_phase),
    source_candidate_kind_label: safeLabel(item.source_candidate_kind),
    public_summary: safeLabel(`${reviewGroup}_${item.status}_review`),
    subject_hint: item.subject_hint ? "subject_present" : null,
    risk_tag_count: Array.isArray(item.risk_tags) ? item.risk_tags.length : 0,
    review_route_label: safeLabel(item.review_route),
    actionable_by_admin: actionableByAdmin,
    recommended_action_id: actionableByAdmin
      ? reviewGroup === "memory"
        ? "approve_memory_candidate"
        : "approve_relationship_candidate"
      : null,
    raw_candidate_exposed: false,
    approved_record_exposed: false,
    boundary_policy: {
      summary_only: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_commit_authority: true,
      validator_required_before_commit: true,
    },
  };
}

function createDecisionRecord({ plan, actorRole, createdAtMs }) {
  const decision = {
    schema: "iris_admin_review_queue_decision_v1",
    decision_id: safeReviewId(`decision:${createdAtMs}:${plan.review_id}`),
    review_id: plan.review_id,
    action_id: plan.action_id,
    review_group: plan.review_group,
    decision_status: "recorded_for_validator_handoff",
    actor_role_label: safeLabel(actorRole),
    created_at_ms: createdAtMs,
    raw_candidate_exposed: false,
    approved_record_exposed: false,
    boundary_policy: {
      decision_summary_only: true,
      validator_handoff_only: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_store_write: true,
      no_validator_commit: true,
    },
  };
  assertAdminReviewQueueDecisionSafe(decision);
  return decision;
}

function summarizeDecisions(decisions) {
  const safeDecisions = decisions.map((decision) => {
    assertAdminReviewQueueDecisionSafe(decision, "admin review decision summary source");
    return decision;
  });
  const summary = {
    schema: "iris_admin_review_queue_decision_summary_v1",
    decision_count: safeDecisions.length,
    approve_memory_count: safeDecisions.filter(
      (decision) => decision.action_id === "approve_memory_candidate"
    ).length,
    reject_memory_count: safeDecisions.filter(
      (decision) => decision.action_id === "reject_memory_candidate"
    ).length,
    approve_relationship_count: safeDecisions.filter(
      (decision) => decision.action_id === "approve_relationship_candidate"
    ).length,
    reject_relationship_count: safeDecisions.filter(
      (decision) => decision.action_id === "reject_relationship_candidate"
    ).length,
    latest_decision_id: safeDecisions.at(-1)?.decision_id ?? null,
    raw_candidate_exposed: false,
    approved_record_exposed: false,
  };
  assertDecisionSummarySafe(summary);
  return summary;
}

function assertDecisionSummarySafe(summary, context = "admin review decision summary") {
  assertSafeObject(summary, context);
  if (summary.schema !== "iris_admin_review_queue_decision_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ADMIN_REVIEW_QUEUE_DECISION_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected decision summary field ${field}`);
    }
  }
  if (summary.raw_candidate_exposed !== false || summary.approved_record_exposed !== false) {
    throw new ContractError(`${context}: raw decision data exposed`);
  }
  const countFields = [
    "decision_count",
    "approve_memory_count",
    "reject_memory_count",
    "approve_relationship_count",
    "reject_relationship_count",
  ];
  for (const field of countFields) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid decision count`);
    }
  }
  if (
    summary.latest_decision_id !== null &&
    (typeof summary.latest_decision_id !== "string" ||
      summary.latest_decision_id.length < 1)
  ) {
    throw new ContractError(`${context}: invalid latest decision id`);
  }
  const expectedCount =
    summary.approve_memory_count +
    summary.reject_memory_count +
    summary.approve_relationship_count +
    summary.reject_relationship_count;
  if (summary.decision_count !== expectedCount) {
    throw new ContractError(`${context}: decision count mismatch`);
  }
}

function assertReviewSummarySafe(item, context) {
  assertSafeObject(item, context);
  if (item.schema !== "iris_admin_review_queue_item_v1") {
    throw new ContractError(`${context}: invalid review item schema`);
  }
  for (const field of Object.keys(item)) {
    if (!ADMIN_REVIEW_QUEUE_ITEM_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected review item field ${field}`);
    }
  }
  if (!["memory", "relationship", "game", "other"].includes(item.review_group)) {
    throw new ContractError(`${context}: invalid review group`);
  }
  if (typeof item.actionable_by_admin !== "boolean") {
    throw new ContractError(`${context}: invalid actionable flag`);
  }
  if (item.raw_candidate_exposed !== false || item.approved_record_exposed !== false) {
    throw new ContractError(`${context}: raw candidate exposed`);
  }
  assertBoundaryPolicy(
    item.boundary_policy,
    {
      summary_only: true,
      no_raw_candidates: true,
      no_approved_records: true,
      no_commit_authority: true,
      validator_required_before_commit: true,
    },
    context
  );
}

function classifyReviewGroup(kind) {
  if (
    [
      "memory_candidate_review",
      "donation_appreciation_review",
      "media_watch_memory_review",
      "memory_carryover_review",
      "community_memory_review",
    ].includes(kind)
  ) {
    return "memory";
  }
  if (
    [
      "relationship_candidate_review",
      "relationship_update_review",
    ].includes(kind)
  ) {
    return "relationship";
  }
  if (
    [
      "game_laughter_review",
      "game_input_review",
      "game_action_validation_review",
    ].includes(kind)
  ) {
    return "game";
  }
  return "other";
}

function isActionAllowedForGroup(action, group) {
  if (group === "memory") {
    return action === "approve_memory_candidate" || action === "reject_memory_candidate";
  }
  if (group === "relationship") {
    return (
      action === "approve_relationship_candidate" ||
      action === "reject_relationship_candidate"
    );
  }
  return false;
}

function reportBoundaryPolicy() {
  return {
    read_only_review_queue: true,
    summaries_only: true,
    counts_status_and_safe_labels_only: true,
    no_raw_candidates: true,
    no_approved_records: true,
    no_raw_comments: true,
    no_raw_support_text: true,
    no_hidden_scores: true,
    no_direct_commit: true,
    validator_required_before_commit: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_live_payloads: true,
    no_viewer_messages: true,
    no_support_message_text: true,
    no_hidden_relationship_scores: true,
    no_commands: true,
    no_game_or_os_input: true,
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
    if (FORBIDDEN_FIELD_NAMES.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { field, path });
    }
    assertNoForbiddenFields(child, context, `${path}.${field}`);
  }
}

function assertNoUnsafeSurfaceText(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?(candidate|comment|support)|support[_ -]?text|hidden[_ -]?score|world[_ -]?command|command/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe text leaked`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeSurfaceText(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUnsafeSurfaceText(child, context, `${path}.${field}`);
  }
}

function safeReviewId(value) {
  return String(value ?? "")
    .replace(/[^a-zA-Z0-9:_-]/g, "_")
    .slice(0, 160);
}

function safeLabel(value) {
  return String(value ?? "unknown")
    .replace(/[^a-zA-Z0-9:_-]/g, "_")
    .slice(0, 80);
}

function safeSummary(value) {
  return String(value ?? "")
    .replace(URL_PATTERN, "[redacted]")
    .replace(/[<>]/g, "")
    .replace(/(?:api[_-]?key|token|secret|password|authorization)\s*[:=]\s*\S+/gi, "[redacted]")
    .replace(/\s+/g, " ")
    .slice(0, 220);
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}
