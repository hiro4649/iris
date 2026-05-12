import {
  assertCanonicalValue,
  assertCoreBoundary,
  assertScore,
  canonical,
  requireFields,
} from "../contracts.js";

export function phase06Sync(phase05, context = {}) {
  requireFields(
    phase05,
    [
      "trace_id",
      "event_id",
      "phase05_importance",
      "phase05_character_relevance",
      "phase05_character_persistence_score",
      "phase05_drift_score",
      "updated_store",
      "commit_status",
    ],
    "Phase06 input"
  );
  assertCoreBoundary(phase05, "Phase06 input");
  assertCanonicalValue("updated_store", phase05.updated_store, canonical.updatedStores);

  const phase06_state_validity_score = phase05.commit_status === "rolled_back" ? 0.65 : 0.9;
  const phase06_intent_consistency_score = 0.88;
  const phase06_memory_sync_score = phase05.commit_status === "committed" ? 0.85 : 0.75;
  const phase06_external_trust_score = 0.5;
  const phase06_character_sync_score = phase05.phase05_character_persistence_score;
  const phase06_relationship_sync_score = 0.7;
  const phase06_conflict_resolution_score = 0.9;

  const scores = {
    phase06_state_validity_score,
    phase06_intent_consistency_score,
    phase06_memory_sync_score,
    phase06_external_trust_score,
    phase06_character_sync_score,
    phase06_relationship_sync_score,
    phase06_conflict_resolution_score,
  };
  for (const [name, value] of Object.entries(scores)) assertScore(name, value);

  return {
    trace_id: phase05.trace_id,
    event_id: phase05.event_id,
    sync_status: "synced",
    ...scores,
    active_intent: context.intent ?? "respond",
    target_presence_id: context.target_presence_id ?? "presence:main",
    linked_identity_id: phase05.linked_identity_id,
    external_summary: null,
    source: context.source ?? "core",
    timestamp_ms: context.timestamp_ms ?? Date.now(),
    relationship_hint: phase05.relationship_hint,
    topic_key: phase05.topic_key,
  };
}
