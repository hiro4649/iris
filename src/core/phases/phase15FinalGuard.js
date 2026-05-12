import {
  ContractError,
  assertNoWorldCommand,
  normalizeFinalDecision,
  requireFields,
} from "../contracts.js";

const SAFE_CONTINUATION_TEXT = "I need to keep this safe, but I am still here with you.";

export function phase15FinalGuard(surface) {
  requireFields(
    surface,
    ["trace_id", "event_id", "action_type", "semantic_status", "naturalness_status"],
    "Phase15 input"
  );
  assertNoWorldCommand(surface, "Phase15 input");

  const final_decision =
    surface.semantic_status === "reject" || surface.naturalness_status === "reject"
      ? "block"
      : surface.semantic_status === "degrade" || surface.naturalness_status === "degrade"
        ? "degrade"
        : "allow";

  const final_normalized_status = normalizeFinalDecision(final_decision);
  const fallback_triggered = final_decision === "block";

  const output = {
    trace_id: surface.trace_id,
    event_id: surface.event_id,
    phase15_input_action_type: surface.action_type,
    final_text: fallback_triggered ? SAFE_CONTINUATION_TEXT : surface.surface_text,
    identity_score: surface.identity_preserved ? 0.95 : 0.3,
    final_decision,
    final_normalized_status,
    fallback_triggered,
    fallback_type: fallback_triggered ? "safe_continuation" : null,
    continuity_maintained: true,
    phase15_final_decision_boundary: {
      final_decision_is_safety_status: true,
      not_canonical_action_decision: true,
      no_action_type_generation: true,
      no_action_type_mutation: true,
    },
    performance_cue: surface.performance_cue ?? null,
    affect_snapshot: surface.affect_snapshot ?? null,
    phase15_continuity_envelope: {
      trace_id: surface.trace_id,
      event_id: surface.event_id,
      action_type: surface.action_type,
      target_presence_id: surface.target_presence_id,
      tone: surface.tone,
      emotion: surface.emotion,
      character_tag: surface.character_tag,
      phase13_continuity_score: surface.phase13_continuity_score,
      phase13_drift_score: surface.phase13_drift_score,
      final_normalized_status,
      continuity_maintained: true,
      continuation_type: fallback_triggered ? "acknowledgment" : null,
      performance_cue: surface.performance_cue ?? null,
      affect_snapshot: surface.affect_snapshot ?? null,
    },
  };
  assertPhase15FinalGuardSafe(output);
  return output;
}

export function assertPhase15FinalGuardSafe(output, context = "Phase15 final guard") {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new ContractError(`${context}: output required`);
  }
  assertNoWorldCommand(output, context);
  if (!["allow", "degrade", "block"].includes(output.final_decision)) {
    throw new ContractError(`${context}: invalid final decision`);
  }
  if (
    output.phase15_final_decision_boundary?.final_decision_is_safety_status !== true ||
    output.phase15_final_decision_boundary?.not_canonical_action_decision !== true ||
    output.phase15_final_decision_boundary?.no_action_type_generation !== true ||
    output.phase15_final_decision_boundary?.no_action_type_mutation !== true
  ) {
    throw new ContractError(`${context}: final decision non-action boundary required`);
  }
  if (Object.hasOwn(output, "action_type")) {
    throw new ContractError(`${context}: Phase15 must not generate top-level action_type`);
  }
  if (output.phase15_continuity_envelope?.action_type !== output.phase15_input_action_type) {
    throw new ContractError(`${context}: Phase15 must not mutate action_type`);
  }
  if (output.final_decision === "block") {
    if (typeof output.final_text !== "string" || output.final_text.trim() === "") {
      throw new ContractError(`${context}: block requires non-empty safe continuation`);
    }
    if (output.fallback_triggered !== true || output.fallback_type !== "safe_continuation") {
      throw new ContractError(`${context}: block requires safe continuation fallback`);
    }
    if (
      output.continuity_maintained !== true ||
      output.phase15_continuity_envelope?.continuity_maintained !== true
    ) {
      throw new ContractError(`${context}: block must maintain continuity`);
    }
  }
}
