import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";
import { redactSensitiveText } from "../safety/privacyGuards.js";

const REVIEW_ITEM_KINDS = new Set([
  "memory_candidate_review",
  "relationship_candidate_review",
  "self_improvement_review",
  "relationship_update_review",
  "game_laughter_review",
  "game_input_review",
  "game_action_validation_review",
  "donation_appreciation_review",
  "media_watch_memory_review",
  "memory_carryover_review",
  "community_memory_review",
]);

const REVIEW_STATUSES = new Set([
  "validation_required",
  "committed_by_approved_writer",
  "not_created",
  "validated",
  "blocked",
  "disabled",
]);
const REVIEW_ITEM_BOUNDARY_FIELDS = new Set([
  "raw_candidate_exposed",
  "not_execution",
  "not_commit",
  "validator_required_before_side_effect",
]);

const FORBIDDEN_REVIEW_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "memory_candidate",
  "relationship_candidate",
  "gratitude_memory_candidate",
  "media_memory_candidate",
  "phase12_improvement_candidate",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "approved_game_input_action",
  "approved_memory_record",
  "approved_relationship_record",
  "action_type",
  "intent",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
]);

export function createInMemoryCandidateReviewQueue({ limit = 200 } = {}) {
  const items = [];
  const maxItems = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 200;

  return {
    append(item) {
      assertCandidateReviewItemSafe(item);
      items.push(structuredClone(item));
      while (items.length > maxItems) items.shift();
      return structuredClone(item);
    },
    appendMany(nextItems) {
      if (!Array.isArray(nextItems)) {
        throw new ContractError("candidate review queue appendMany requires an item array");
      }
      const appended = [];
      for (const item of nextItems) {
        appended.push(this.append(item));
      }
      return appended;
    },
    appendFromRuntimeResult(result) {
      return this.appendMany(createCandidateReviewItems(result));
    },
    list(limitCount = maxItems) {
      const safeLimit =
        Number.isFinite(limitCount) && limitCount > 0 ? Math.floor(limitCount) : maxItems;
      return structuredClone(items.slice(-safeLimit));
    },
    stats() {
      const by_kind = {};
      const by_status = {};
      for (const item of items) {
        by_kind[item.item_kind] = (by_kind[item.item_kind] ?? 0) + 1;
        by_status[item.status] = (by_status[item.status] ?? 0) + 1;
      }
      return {
        schema: "iris_candidate_review_stats_v1",
        total_items: items.length,
        by_kind,
        by_status,
      };
    },
    clear() {
      items.length = 0;
      return this.stats();
    },
  };
}

export function createCandidateReviewItems(result, nowMs = Date.now()) {
  const phase01 = result?.core?.phase01 ?? {};
  const phase05 = result?.core?.phase05 ?? {};
  const phase12 = result?.core?.phase12 ?? {};
  const phase15 = result?.core?.phase15 ?? {};
  const streamLifecycle = result?.stream_lifecycle;
  if (!streamLifecycle || typeof streamLifecycle !== "object" || Array.isArray(streamLifecycle)) {
    throw new ContractError("candidate review items: stream lifecycle is required");
  }
  if (!Array.isArray(streamLifecycle.memory_carryover_candidates)) {
    throw new ContractError("candidate review items: memory carryover candidates are required");
  }
  if (!Array.isArray(streamLifecycle.community_memory_candidates)) {
    throw new ContractError("candidate review items: community memory candidates are required");
  }
  const base = {
    trace_id: phase15.trace_id ?? phase01.trace_id ?? result?.event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? result?.event?.event_id ?? null,
    source: result?.event?.source ?? phase01.source ?? "unknown",
    payload_kind: phase01.payload_kind ?? result?.event?.payload?.payload_kind ?? "unknown",
    created_at_ms: nowMs,
  };
  const items = [];

  if (phase05.memory_candidate) {
    items.push(
      createReviewItem({
        ...base,
        source_phase: "phase05",
        item_kind: "memory_candidate_review",
        source_candidate_kind: phase05.memory_candidate.candidate_kind,
        status: result?.persistence?.committed ? "committed_by_approved_writer" : "validation_required",
        public_summary: phase05.memory_candidate.summary,
        risk_tags: ["memory_write_boundary"],
        review_route: "approved_memory_writer_only",
      })
    );
  }

  if (phase05.relationship_candidate) {
    items.push(
      createReviewItem({
        ...base,
        source_phase: "phase05",
        item_kind: "relationship_candidate_review",
        source_candidate_kind: phase05.relationship_candidate.candidate_kind,
        status: result?.relationship?.committed
          ? "committed_by_approved_writer"
          : "validation_required",
        public_summary: phase05.relationship_candidate.summary,
        subject_hint: safeSubject(phase05.relationship_candidate.display_name),
        risk_tags: ["relationship_write_boundary"],
        review_route: "approved_relationship_writer_only",
      })
    );
  }

  if (phase12.phase12_improvement_candidate) {
    items.push(
      createReviewItem({
        ...base,
        source_phase: "phase12",
        item_kind: "self_improvement_review",
        source_candidate_kind: phase12.phase12_improvement_candidate.candidate_kind,
        status: "validation_required",
        public_summary: phase12.phase12_improvement_candidate.note,
        risk_tags: ["self_modification_boundary"],
        review_route: "manual_developer_review_only",
      })
    );
  }

  if (result?.relationship_deepening?.relationship_update_candidate) {
    items.push(
      createReviewItem({
        ...base,
        source_phase: "phase20",
        item_kind: "relationship_update_review",
        source_candidate_kind:
          result.relationship_deepening.relationship_update_candidate.candidate_kind,
        status: "validation_required",
        public_summary: `relationship update for ${safeSubject(result.relationship_deepening.display_name)}`,
        subject_hint: safeSubject(result.relationship_deepening.display_name),
        risk_tags: ["relationship_depth_boundary", "no_hidden_score_surface"],
        review_route: "future_relationship_validator",
      })
    );
  }

  if (result?.game_commentary?.laughter_candidate) {
    items.push(
      createReviewItem({
        ...base,
        source_phase: "phase23",
        item_kind: "game_laughter_review",
        source_candidate_kind: result.game_commentary.laughter_candidate.candidate_kind,
        status: "validation_required",
        public_summary: `game laughter expression: ${result.game_commentary.laughter_candidate.intensity}`,
        risk_tags: ["expression_boundary", "laugh_at_situation_not_person"],
        review_route: "future_expression_validator",
      })
    );
  }

  if (result?.game_player?.input_action_candidate) {
    items.push(
      createReviewItem({
        ...base,
        source_phase: "phase24",
        item_kind: "game_input_review",
        source_candidate_kind: result.game_player.input_action_candidate.candidate_kind,
        status: "validation_required",
        public_summary: `game planning held at review boundary: ${result.game_player.game_goal}`,
        risk_tags: ["game_input_boundary", "not_adapter_handoff"],
        review_route: "future_game_input_validator",
      })
    );
  }

  if (result?.game_player?.input_action_candidate && result?.game_action_validation) {
    const validation = result.game_action_validation;
    items.push(
      createReviewItem({
        ...base,
        source_phase: "phase24_validator",
        item_kind: "game_action_validation_review",
        source_candidate_kind:
          validation.validation_status === "approved"
            ? "approved_game_action"
            : "game_action_validation_result",
        status: reviewStatusForGameActionValidation(validation.validation_status),
        public_summary: `game action validator ${validation.validation_status}: ${validation.approved_game_input_action?.action_kind ?? validation.rejected_candidates?.[0]?.reason ?? "no_action"}`,
        risk_tags: ["game_input_boundary", "approved_schema_only", "no_raw_candidate_surface"],
        review_route: "game_action_validator_v1",
      })
    );
  }

  if (result?.donation_reaction?.gratitude_memory_candidate) {
    items.push(
      createReviewItem({
        ...base,
        source_phase: "addendum_donation",
        item_kind: "donation_appreciation_review",
        source_candidate_kind:
          result.donation_reaction.gratitude_memory_candidate.candidate_kind,
        status: "validation_required",
        public_summary:
          result.donation_reaction.gratitude_memory_candidate.summary_hint,
        subject_hint: safeSubject(result.donation_reaction.gratitude_memory_candidate.display_name),
        risk_tags: ["donation_boundary", "no_amount_ranking", "approved_memory_only"],
        review_route: "future_donation_memory_validator",
      })
    );
  }

  if (result?.media_watch_reaction?.media_memory_candidate) {
    items.push(
      createReviewItem({
        ...base,
        source_phase: "addendum_media_watch",
        item_kind: "media_watch_memory_review",
        source_candidate_kind: result.media_watch_reaction.media_memory_candidate.candidate_kind,
        status: "validation_required",
        public_summary: result.media_watch_reaction.media_memory_candidate.summary_hint,
        risk_tags: ["media_memory_boundary", "no_verbatim_reproduction"],
        review_route: "future_media_memory_validator",
      })
    );
  }

  for (const lifecycleItem of streamLifecycle.memory_carryover_candidates) {
    items.push(
      createReviewItem({
        ...base,
        source_phase: "phase26",
        item_kind: "memory_carryover_review",
        source_candidate_kind: lifecycleItem.candidate_kind,
        status: "validation_required",
        public_summary: lifecycleItem.summary_hint,
        risk_tags: ["memory_carryover_boundary"],
        review_route: "future_memory_lifecycle_validator",
      })
    );
  }

  for (const lifecycleItem of streamLifecycle.community_memory_candidates) {
    items.push(
      createReviewItem({
        ...base,
        source_phase: "phase26",
        item_kind: "community_memory_review",
        source_candidate_kind: lifecycleItem.candidate_kind,
        status: "validation_required",
        public_summary: lifecycleItem.summary_hint,
        risk_tags: ["community_memory_boundary", "new_viewer_openness"],
        review_route: "future_community_memory_validator",
      })
    );
  }

  for (const item of items) assertCandidateReviewItemSafe(item);
  return items;
}

export function assertCandidateReviewItemSafe(item, context = "candidate review item") {
  if (!item || typeof item !== "object") {
    throw new ContractError(`${context}: missing item`);
  }
  assertNoWorldCommand(item, context);
  assertNoForbiddenFieldsRecursive(item, context);
  if (item.schema !== "iris_candidate_review_item_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: item.schema });
  }
  if (!REVIEW_ITEM_KINDS.has(item.item_kind)) {
    throw new ContractError(`${context}: invalid item kind`, { item_kind: item.item_kind });
  }
  if (!REVIEW_STATUSES.has(item.status)) {
    throw new ContractError(`${context}: invalid status`, { status: item.status });
  }
  assertReviewItemBoundaryPolicySafe(item.boundary_policy, context);
}

function assertReviewItemBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REVIEW_ITEM_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  if (policy.raw_candidate_exposed !== false) {
    throw new ContractError(`${context}: raw candidate exposure must be false`);
  }
  if (policy.not_execution !== true || policy.not_commit !== true) {
    throw new ContractError(`${context}: boundary policy must deny execution and commit`);
  }
  if (policy.validator_required_before_side_effect !== true) {
    throw new ContractError(`${context}: validator boundary is required`);
  }
}

function createReviewItem({
  trace_id,
  event_id,
  source,
  payload_kind,
  source_phase,
  item_kind,
  source_candidate_kind,
  status,
  public_summary,
  subject_hint = null,
  risk_tags,
  review_route,
  created_at_ms,
}) {
  const displayedKind = displayCandidateKind(source_candidate_kind);
  const item = {
    schema: "iris_candidate_review_item_v1",
    review_id: buildReviewId({ event_id, source_phase, item_kind, source_candidate_kind: displayedKind }),
    trace_id,
    event_id,
    source,
    payload_kind,
    source_phase,
    item_kind,
    source_candidate_kind: displayedKind,
    status,
    public_summary: sanitizeSummary(public_summary),
    subject_hint,
    risk_tags: [...new Set(risk_tags)].slice(0, 8),
    review_route,
    boundary_policy: {
      raw_candidate_exposed: false,
      not_execution: true,
      not_commit: true,
      validator_required_before_side_effect: true,
    },
    created_at_ms,
  };
  assertCandidateReviewItemSafe(item);
  return item;
}

function buildReviewId({ event_id, source_phase, item_kind, source_candidate_kind }) {
  return [
    "review",
    event_id ?? "unknown_event",
    source_phase ?? "unknown_phase",
    item_kind ?? "unknown_item",
    source_candidate_kind ?? "unknown_kind",
  ]
    .map((part) =>
      String(part)
        .replace(/[^a-zA-Z0-9:_-]/g, "_")
        .slice(0, 80)
    )
    .join(":");
}

function sanitizeSummary(value) {
  return redactSensitiveText(value ?? "candidate requires validation", { maxLength: 220 });
}

function reviewStatusForGameActionValidation(validationStatus) {
  switch (validationStatus) {
    case "approved":
      return "validated";
    case "disabled":
      return "disabled";
    case "not_created":
      return "not_created";
    default:
      return "blocked";
  }
}

function displayCandidateKind(value) {
  switch (value) {
    case "input_action_candidate":
      return "game_input_planning";
    case "approved_game_action":
      return "game_action_approved_summary";
    case "game_action_validation_result":
      return "game_action_validation_summary";
    case "relationship_update_candidate":
      return "relationship_update_planning";
    case "game_laughter_candidate":
      return "game_laughter_expression";
    case "donation_appreciation_memory_candidate":
      return "donation_appreciation_planning";
    case "media_watch_memory_candidate":
      return "media_watch_memory_planning";
    case "memory_carryover_candidate":
      return "memory_carryover_planning";
    case "community_memory_candidate":
      return "community_memory_planning";
    case "relationship_memory":
      return "relationship_memory_planning";
    case "experience_log":
      return "experience_log_planning";
    case "self_improvement_staging":
      return "self_improvement_staging";
    default:
      return String(value ?? "unknown").slice(0, 80);
  }
}

function safeSubject(value) {
  return String(value ?? "viewer")
    .replace(/[^a-zA-Z0-9_. -]/g, "")
    .trim()
    .slice(0, 80) || "viewer";
}

function assertNoForbiddenFieldsRecursive(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFieldsRecursive(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_REVIEW_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: review item must not expose raw candidate, command, commit, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}
