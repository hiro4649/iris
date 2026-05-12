import {
  assertCanonicalValue,
  assertNoWorldCommand,
  ContractError,
  canonical,
  requireFields,
  validateCanonicalAction,
} from "../contracts.js";

export function phase04Action(reaction, context) {
  requireFields(
    reaction,
    ["trace_id", "event_id", "intent", "tone", "character_tag", "target_presence_id"],
    "Phase04 reaction input"
  );
  requireFields(context, ["conversation_state", "target_presence_id"], "Phase04 context input");
  assertNoWorldCommand(reaction, "Phase04 reaction input");
  assertNoWorldCommand(context, "Phase04 context input");
  assertNoUpstreamActionType(reaction, "Phase04 reaction input");
  assertNoUpstreamActionType(context, "Phase04 context input");

  assertCanonicalValue("intent", reaction.intent, canonical.intents);
  const action_type = decideActionType(reaction.intent, context.conversation_state);

  const action = {
    trace_id: reaction.trace_id,
    event_id: reaction.event_id,
    action_type,
    skill_id: action_type === "SPEAK" ? "skill:speak.reply" : "skill:wait",
    target_presence_id: reaction.target_presence_id,
    linked_identity_id: reaction.linked_identity_id ?? null,
    display_name: reaction.display_name ?? null,
    tone: reaction.tone,
    character_tag: reaction.character_tag,
    redirected: false,
    phase04_validator_score: 0.95,
    phase04_presence_score: 0.95,
    source: "phase04",
    intent: reaction.intent,
    emotion: reaction.emotion,
    relationship_hint: context.relationship_hint ?? "new_or_unknown",
    topic_key: context.topic_key,
    payload_kind: context.payload_kind ?? "comment",
    game_context: context.game_context ?? null,
    phase03_continuity_score: context.phase03_continuity_score,
    parameters: {
      normalized_text: reaction.normalized_text,
      display_name: reaction.display_name ?? null,
      payload_kind: context.payload_kind ?? "comment",
      game_context: context.game_context ?? null,
    },
  };

  validateCanonicalAction(action);
  return action;
}

function decideActionType(intent, conversationState) {
  if (intent === "ignore") return "NOOP";
  if (conversationState === "idle") return "WAIT";
  return "SPEAK";
}

function assertNoUpstreamActionType(payload, context) {
  if (payload && Object.prototype.hasOwnProperty.call(payload, "action_type")) {
    throw new ContractError(`${context}: action_type must be decided by Phase04`);
  }
}
