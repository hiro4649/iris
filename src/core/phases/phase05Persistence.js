import {
  assertCandidateNotExecutable,
  assertCanonicalValue,
  assertCoreBoundary,
  assertScore,
  canonical,
  requireFields,
} from "../contracts.js";

export function phase05Persistence(action, runtime = {}) {
  requireFields(action, ["trace_id", "event_id", "action_type"], "Phase05 input");
  assertCoreBoundary(action, "Phase05 input");

  const memory_candidate = {
    candidate_kind: "experience_log",
    requires_validation: true,
    trace_id: action.trace_id,
    event_id: action.event_id,
    summary: summarizeAction(action),
    source_text: action.parameters?.normalized_text ?? null,
  };
  assertCandidateNotExecutable(memory_candidate, "Phase05 memory_candidate");
  const relationship_candidate = buildRelationshipCandidate(action);
  if (relationship_candidate) {
    assertCandidateNotExecutable(relationship_candidate, "Phase05 relationship_candidate");
  }

  const phase05_importance = action.action_type === "SPEAK" ? 0.45 : 0.15;
  const phase05_character_relevance = action.character_tag ? 0.75 : 0.5;
  const phase05_character_persistence_score = 0.9;
  const phase05_drift_score = 0.05;
  const updated_store = "experience_log";
  const commit_status = runtime.enablePersistence === true ? "committed" : "rejected";

  assertCanonicalValue("updated_store", updated_store, canonical.updatedStores);
  for (const [name, value] of Object.entries({
    phase05_importance,
    phase05_character_relevance,
    phase05_character_persistence_score,
    phase05_drift_score,
  })) {
    assertScore(name, value);
  }

  return {
    trace_id: action.trace_id,
    event_id: action.event_id,
    phase05_importance,
    phase05_character_relevance,
    phase05_character_persistence_score,
    phase05_drift_score,
    updated_store,
    commit_status,
    linked_identity_id: action.linked_identity_id ?? null,
    relationship_hint: action.relationship_hint ?? "neutral",
    topic_key: action.topic_key ?? "general",
    memory_candidate,
    relationship_candidate,
  };
}

function summarizeAction(action) {
  if (action.action_type === "SPEAK") return "IRIS replied to a viewer comment.";
  if (action.action_type === "NOOP") return "IRIS ignored a non-target event.";
  return `IRIS planned ${action.action_type}.`;
}

function buildRelationshipCandidate(action) {
  if (!action.linked_identity_id || action.action_type !== "SPEAK") return null;
  const isPlayful = action.tone === "playful" || action.character_tag === "playful";
  const signal = classifyRelationshipSignal(action.parameters?.normalized_text ?? "");
  return {
    candidate_kind: "relationship_memory",
    requires_validation: true,
    trace_id: action.trace_id,
    event_id: action.event_id,
    linked_identity_id: action.linked_identity_id,
    display_name: action.display_name ?? "viewer",
    relationship_store: "relationship_memory",
    affinity_delta: signal.affinity_delta ?? (isPlayful ? 0.04 : 0.03),
    familiarity_delta: signal.familiarity_delta ?? 0.05,
    relationship_signal: signal.signal,
    topic_key: action.topic_key ?? "general",
    relationship_hint: action.relationship_hint ?? "new_or_unknown",
    source_text: action.parameters?.normalized_text ?? null,
    summary: summarizeRelationship(action, signal),
  };
}

function classifyRelationshipSignal(text) {
  const normalized = String(text ?? "").toLowerCase();
  if (
    /hate|stupid|idiot|annoying|shut up|go away|die|kill yourself|繧ゅ≧|うざ|嫌い|きらい|バカ|ばか|黙れ|消えろ/.test(
      normalized
    )
  ) {
    return {
      signal: "boundary_needed",
      affinity_delta: -0.04,
      familiarity_delta: 0.01,
    };
  }
  return {
    signal: "warm_interaction",
    affinity_delta: null,
    familiarity_delta: null,
  };
}

function summarizeRelationship(action, signal = { signal: "warm_interaction" }) {
  const name = action.display_name ?? "viewer";
  if (signal.signal === "boundary_needed") {
    return `IRIS kept a calm boundary with ${name}.`;
  }
  if (action.tone === "playful") return `IRIS shared a playful moment with ${name}.`;
  return `IRIS responded warmly to ${name}.`;
}
