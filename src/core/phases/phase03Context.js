import {
  assertCanonicalValue,
  assertNoWorldCommand,
  canonical,
  requireFields,
} from "../contracts.js";

export function phase03Context(input, runtime = {}) {
  requireFields(
    input,
    ["trace_id", "event_id", "intent", "target_presence_id"],
    "Phase03 input"
  );
  assertNoWorldCommand(input, "Phase03 input");
  assertCanonicalValue("intent", input.intent, canonical.intents);

  const conversation_state = runtime.isClosing
    ? "closing"
    : runtime.hasOpened
      ? "active"
      : "opening";
  assertCanonicalValue("conversation_state", conversation_state, canonical.conversationStates);

  return {
    trace_id: input.trace_id,
    event_id: input.event_id,
    conversation_state,
    phase03_continuity_score: 0.8,
    relationship_hint: runtime.relationship_hint ?? "new_or_unknown",
    context_tags: deriveContextTags(input.normalized_text, input),
    payload_kind: input.payload_kind ?? "comment",
    game_context: input.game_context ?? null,
    phase03_context_valid_score: 0.9,
    target_presence_id: input.target_presence_id,
    topic_key: runtime.topic_key ?? "general",
  };
}

function deriveContextTags(text = "", input = {}) {
  const tags = [];
  if (input.payload_kind === "game_observation" || /game|Minecraft/i.test(text)) tags.push("game");
  if (/lol|lmao|funny|haha|www/i.test(text)) tags.push("humor");
  return tags;
}
