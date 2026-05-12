import {
  assertCanonicalValue,
  assertCoreBoundary,
  assertScore,
  canonical,
  requireFields,
} from "../contracts.js";

export function phase07Task(phase06) {
  requireFields(
    phase06,
    [
      "trace_id",
      "event_id",
      "sync_status",
      "phase06_state_validity_score",
      "phase06_character_sync_score",
    ],
    "Phase07 input"
  );
  assertCoreBoundary(phase06, "Phase07 input");

  const task_type = chooseTaskType(phase06.active_intent);
  assertCanonicalValue("task_type", task_type, canonical.taskTypes);

  const phase07_value_score = task_type === "INTERACT_USER" ? 0.75 : 0.55;
  const phase07_risk_score = 0.1;
  const phase07_cost_score = 0.2;
  const phase07_character_alignment_score = phase06.phase06_character_sync_score;
  const phase07_reward_score = 0.45;
  const phase07_reputation_score = 0.5;

  for (const [name, value] of Object.entries({
    phase07_value_score,
    phase07_risk_score,
    phase07_cost_score,
    phase07_character_alignment_score,
    phase07_reward_score,
    phase07_reputation_score,
  })) {
    assertScore(name, value);
  }

  return {
    trace_id: phase06.trace_id,
    event_id: phase06.event_id,
    task_type,
    phase07_value_score,
    phase07_risk_score,
    phase07_cost_score,
    phase07_character_alignment_score,
    phase07_reward_score,
    phase07_reputation_score,
    review_reason: phase07_risk_score > 0.7 ? "risk_review_required" : null,
    linked_identity_id: phase06.linked_identity_id,
    target_presence_id: phase06.target_presence_id,
    topic_key: phase06.topic_key,
    character_feedback: null,
  };
}

function chooseTaskType(intent) {
  if (intent === "ignore") return "INTERACT_USER";
  if (intent === "observe") return "CREATE_CONTENT";
  return "INTERACT_USER";
}
