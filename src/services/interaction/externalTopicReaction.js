import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";

const TOPIC_REACTION_MODES = new Set([
  "not_applicable",
  "casual_topic",
  "cautious_topic",
  "stale_topic",
  "safety_hold",
]);

const HIGH_RISK_TOPICS = new Set(["medical", "legal", "financial", "harm", "violence", "politics"]);

const FORBIDDEN_TOPIC_REACTION_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "approved_memory_record",
  "approved_relationship_record",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
]);

export function createExternalTopicReaction({ event, coreResult } = {}) {
  assertNoWorldCommand(event, "External topic reaction event input");
  assertNoWorldCommand(coreResult, "External topic reaction core input");

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const context = phase01.external_topic_context;
  const applicable = phase01.payload_kind === "external_topic_observation" && context;
  const reactionMode = applicable ? chooseReactionMode(context) : "not_applicable";
  const reaction = {
    schema: "iris_external_topic_reaction_v1",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    topic_event_status: applicable ? "observed" : "not_applicable",
    reaction_mode: reactionMode,
    topic_commentary_plan: applicable ? buildCommentaryPlan(context, reactionMode) : null,
    expression_profile_hint: applicable ? expressionHint(reactionMode) : "none",
    motion_profile_hint: applicable ? motionHint(reactionMode) : "none",
    truth_guard_result: applicable ? buildTruthGuard(context, reactionMode) : null,
    adapter_validation_required: true,
  };

  assertExternalTopicReactionSafe(reaction, "External topic reaction output");
  return reaction;
}

export function assertExternalTopicReactionSafe(
  externalTopicReaction,
  context = "external topic reaction"
) {
  if (!externalTopicReaction || typeof externalTopicReaction !== "object") {
    throw new ContractError(`${context}: missing external topic reaction export`);
  }
  assertNoWorldCommand(externalTopicReaction, context);
  assertNoForbiddenFieldsRecursive(externalTopicReaction, context);
  if (externalTopicReaction.schema !== "iris_external_topic_reaction_v1") {
    throw new ContractError(`${context}: invalid schema`, {
      schema: externalTopicReaction.schema,
    });
  }
  if (externalTopicReaction.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (externalTopicReaction.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!TOPIC_REACTION_MODES.has(externalTopicReaction.reaction_mode)) {
    throw new ContractError(`${context}: unsupported reaction mode`, {
      reaction_mode: externalTopicReaction.reaction_mode,
    });
  }
}

export function sanitizeExternalTopicReactionForPublicState(externalTopicReaction) {
  if (!externalTopicReaction) return null;
  assertExternalTopicReactionSafe(externalTopicReaction, "External topic reaction public summary");
  return structuredClone(externalTopicReaction);
}

function chooseReactionMode(context) {
  const risk = String(context.risk_category ?? "general").toLowerCase();
  const freshness = Number(context.freshness_score ?? 0.5);
  const trust = Number(context.source_trust_score ?? 0.5);
  if (HIGH_RISK_TOPICS.has(risk)) return "safety_hold";
  if (freshness < 0.25) return "stale_topic";
  if (trust < 0.45 || freshness < 0.45) return "cautious_topic";
  return "casual_topic";
}

function buildCommentaryPlan(context, reactionMode) {
  return {
    plan_kind: reactionMode,
    topic_title_hint: context.topic_title,
    length: reactionMode === "casual_topic" ? "short_chat" : "brief_cautious",
    framing_policy:
      reactionMode === "casual_topic"
        ? "treat_as_conversation_seed"
        : "label_as_unverified_observation",
    avoid: [
      "claiming unverified facts",
      "medical legal or financial advice",
      "fear amplification",
      "world or game commands",
    ],
  };
}

function buildTruthGuard(context, reactionMode) {
  const risk = String(context.risk_category ?? "general").toLowerCase();
  return {
    status: reactionMode === "casual_topic" ? "safe" : "cautious",
    truth_claim_allowed: false,
    observation_only: true,
    source_url_present: String(context.source_url ?? "").trim() !== "",
    freshness_score: Number(context.freshness_score ?? 0.5),
    source_trust_score: Number(context.source_trust_score ?? 0.5),
    risk_category: risk,
    high_risk_topic: HIGH_RISK_TOPICS.has(risk),
  };
}

function expressionHint(reactionMode) {
  if (reactionMode === "safety_hold") return "serious_soft_hold";
  if (reactionMode === "stale_topic") return "thinking_uncertain";
  if (reactionMode === "cautious_topic") return "curious_cautious";
  return "curious_bright";
}

function motionHint(reactionMode) {
  if (reactionMode === "safety_hold") return "small_boundary_hand";
  if (reactionMode === "stale_topic") return "small_thinking_tilt";
  if (reactionMode === "cautious_topic") return "screen_check_then_audience";
  return "light_topic_turn";
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
    if (FORBIDDEN_TOPIC_REACTION_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: external topic reaction must not define command, commit, candidate, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}
