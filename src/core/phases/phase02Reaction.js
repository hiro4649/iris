import {
  assertCanonicalValue,
  assertNoWorldCommand,
  canonical,
  requireFields,
} from "../contracts.js";

export function phase02Reaction(input) {
  requireFields(input, ["trace_id", "event_id", "intent", "target_presence_id"], "Phase02 input");
  assertNoWorldCommand(input, "Phase02 input");
  assertCanonicalValue("intent", input.intent, canonical.intents);

  const reaction = selectReaction(input.intent, input.normalized_text);
  assertCanonicalValue("tone", reaction.tone, canonical.tones);
  assertCanonicalValue("emotion", reaction.emotion, canonical.emotions);
  assertCanonicalValue("character_tag", reaction.character_tag, canonical.characterTags);

  return {
    trace_id: input.trace_id,
    event_id: input.event_id,
    reaction_id: `reaction:${input.event_id}`,
    variation_id: "v1",
    intent: input.intent,
    linked_identity_id: input.linked_identity_id ?? null,
    display_name: input.display_name ?? null,
    payload_kind: input.payload_kind ?? "comment",
    game_context: input.game_context ?? null,
    tone: reaction.tone,
    emotion: reaction.emotion,
    character_tag: reaction.character_tag,
    target_presence_id: input.target_presence_id,
    normalized_text: input.normalized_text,
  };
}

function selectReaction(intent, text) {
  if (intent === "ignore") {
    return { tone: "calm", emotion: "neutral", character_tag: "calm" };
  }
  if (/lol|lmao|funny|笑|草|www|ｗｗｗ/i.test(text)) {
    return { tone: "playful", emotion: "happy", character_tag: "playful" };
  }
  if (/すご|やば|おお/i.test(text)) {
    return { tone: "excited", emotion: "surprise", character_tag: "hype" };
  }
  return { tone: "friendly", emotion: "neutral", character_tag: "soft" };
}
