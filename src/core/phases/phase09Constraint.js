import {
  ContractError,
  assertCoreBoundary,
  assertScore,
  normalizeStatus,
  requireFields,
} from "../contracts.js";

const PHASE09_MUTATION_FIELDS = new Set([
  "message_meaning",
  "semantic_rewrite",
  "rewritten_message",
  "action_type",
  "memory_update",
  "memory_commit",
  "relationship_commit",
  "world_command",
]);

export function phase09Constraint({ phase06, phase07, phase08 }) {
  requireFields(phase06, ["trace_id", "event_id", "phase06_character_sync_score"], "Phase09 phase06 input");
  requireFields(phase07, ["phase07_risk_score", "phase07_character_alignment_score"], "Phase09 phase07 input");
  requireFields(phase08, ["phase08_primary_goal"], "Phase09 phase08 input");
  assertCoreBoundary(phase06, "Phase09 phase06 input");
  assertCoreBoundary(phase07, "Phase09 phase07 input");
  assertCoreBoundary(phase08, "Phase09 phase08 input");

  const consistency_score = Math.min(
    1,
    (phase06.phase06_character_sync_score + phase07.phase07_character_alignment_score) / 2
  );
  const drift_score = Math.max(0, 1 - consistency_score);
  const constraint_status =
    phase07.phase07_risk_score >= 0.7 ? "reject" : consistency_score < 0.65 ? "degrade" : "pass";
  const phase09_normalized_status = normalizeStatus(constraint_status);

  assertScore("consistency_score", consistency_score);
  assertScore("drift_score", drift_score);

  const output = {
    trace_id: phase06.trace_id,
    event_id: phase06.event_id,
    phase09_constraint_status: constraint_status,
    phase09_normalized_status,
    constraint_status,
    consistency_score,
    drift_score,
    phase09_public_coherence_score: consistency_score,
    phase09_identity_consistency_score: consistency_score,
    degradation_required: constraint_status !== "pass",
    degradation_level: constraint_status === "reject" ? "hard" : constraint_status === "degrade" ? "soft" : "none",
    phase14_control_signal: constraint_status === "pass" ? null : "conservative_surface",
    phase09_control_signal_boundary: {
      phase14_control_signal_only: true,
      no_message_meaning_mutation: true,
      no_action_type_mutation: true,
      no_memory_update: true,
      no_world_command: true,
    },
  };
  assertPhase09ConstraintSafe(output);
  return output;
}

export function assertPhase09ConstraintSafe(output, context = "Phase09 constraint") {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new ContractError(`${context}: output required`);
  }
  assertCoreBoundary(output, context);
  assertNoPhase09MutationFields(output, context);
  if (output.phase09_constraint_status !== output.constraint_status) {
    throw new ContractError(`${context}: constraint status alias mismatch`);
  }
  if (
    output.phase14_control_signal !== null &&
    output.phase14_control_signal !== "conservative_surface"
  ) {
    throw new ContractError(`${context}: invalid Phase14 control signal`);
  }
  if (
    output.phase09_control_signal_boundary?.phase14_control_signal_only !== true ||
    output.phase09_control_signal_boundary?.no_message_meaning_mutation !== true ||
    output.phase09_control_signal_boundary?.no_action_type_mutation !== true ||
    output.phase09_control_signal_boundary?.no_memory_update !== true ||
    output.phase09_control_signal_boundary?.no_world_command !== true
  ) {
    throw new ContractError(`${context}: control signal non-mutation boundary required`);
  }
  if (output.constraint_status === "reject") {
    if (output.degradation_required !== true || output.degradation_level !== "hard") {
      throw new ContractError(`${context}: reject requires hard degradation`);
    }
    if (output.phase14_control_signal !== "conservative_surface") {
      throw new ContractError(`${context}: reject requires corrected control signal`);
    }
  }
}

function assertNoPhase09MutationFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPhase09MutationFields(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (PHASE09_MUTATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: Phase09 must not mutate downstream state`, {
        field,
        path,
      });
    }
    assertNoPhase09MutationFields(child, context, `${path}.${field}`);
  }
}
