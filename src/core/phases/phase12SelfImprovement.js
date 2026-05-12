import {
  assertCandidateNotExecutable,
  assertCoreBoundary,
  assertScore,
  ContractError,
  normalizeStatus,
  requireFields,
} from "../contracts.js";

const PHASE12_IMMEDIATE_EFFECT_FIELDS = new Set([
  "runtime_behavior_update",
  "runtime_behavior",
  "personality_update",
  "personality_patch",
  "policy_update",
  "policy_patch",
  "memory_update",
  "memory_commit",
  "strategy_update",
  "action_type",
  "world_command",
]);

export function phase12SelfImprovement({ phase09, phase10, phase11 }) {
  requireFields(phase09, ["trace_id", "event_id", "phase09_constraint_status"], "Phase12 phase09 input");
  requireFields(phase10, ["strategy_mode"], "Phase12 phase10 input");
  requireFields(phase11, ["phase11_isolation_status"], "Phase12 phase11 input");
  assertCoreBoundary(phase09, "Phase12 phase09 input");
  assertCoreBoundary(phase10, "Phase12 phase10 input");
  assertCoreBoundary(phase11, "Phase12 phase11 input");

  const regression_detected = phase09.phase09_constraint_status === "reject";
  const safety_status = regression_detected ? "degrade" : "pass";
  const identity_match_score = regression_detected ? 0.75 : 0.95;
  assertScore("identity_match_score", identity_match_score);

  const phase12_improvement_candidate = {
    candidate_kind: "self_improvement_staging",
    requires_validation: true,
    scope: "response",
    note: regression_detected ? "tighten final guard fallback" : "no immediate change",
    staging_only: true,
    immediate_runtime_effect: false,
    sandbox_status: "pending",
    rollback_available: true,
  };
  assertCandidateNotExecutable(phase12_improvement_candidate, "Phase12 improvement candidate");

  const output = {
    trace_id: phase09.trace_id,
    event_id: phase09.event_id,
    phase12_safety_status: safety_status,
    phase12_normalized_status: normalizeStatus(safety_status),
    phase12_identity_match_score: identity_match_score,
    phase12_regression_detected: regression_detected,
    phase12_improvement_candidate,
    safety_status,
    identity_match_score,
    regression_detected,
    simulation_status: safety_status,
    approval_status: "pending",
    rollback_available: phase12_improvement_candidate.rollback_available,
    phase12_staging_boundary: {
      staging_only: true,
      no_runtime_behavior_reflection: true,
      no_personality_reflection: true,
      no_policy_reflection: true,
      no_memory_reflection: true,
    },
    phase12_approval_guard: {
      rollback_required_for_approval: true,
      sandbox_pass_required_for_approval: true,
    },
  };
  assertPhase12SelfImprovementSafe(output);
  return output;
}

export function assertPhase12SelfImprovementSafe(output, context = "Phase12 self improvement") {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new ContractError(`${context}: output required`);
  }
  assertCoreBoundary(output, context);
  assertNoPhase12ImmediateEffect(output, context);
  assertCandidateNotExecutable(output.phase12_improvement_candidate, `${context} candidate`);
  if (
    output.phase12_improvement_candidate?.staging_only !== true ||
    output.phase12_improvement_candidate?.immediate_runtime_effect !== false ||
    !["pending", "rejected", "approved"].includes(output.approval_status)
  ) {
    throw new ContractError(`${context}: improvement candidate must remain staged`);
  }
  assertPhase12ApprovalGuard(output, context);
  if (
    output.phase12_staging_boundary?.staging_only !== true ||
    output.phase12_staging_boundary?.no_runtime_behavior_reflection !== true ||
    output.phase12_staging_boundary?.no_personality_reflection !== true ||
    output.phase12_staging_boundary?.no_policy_reflection !== true ||
    output.phase12_staging_boundary?.no_memory_reflection !== true
  ) {
    throw new ContractError(`${context}: staging boundary required`);
  }
  if (
    output.phase12_approval_guard?.rollback_required_for_approval !== true ||
    output.phase12_approval_guard?.sandbox_pass_required_for_approval !== true
  ) {
    throw new ContractError(`${context}: approval guard required`);
  }
}

export function assertPhase12ApprovalGuard(output, context = "Phase12 approval") {
  if (output?.approval_status !== "approved") return;
  const candidate = output.phase12_improvement_candidate ?? {};
  if (output.rollback_available !== true || candidate.rollback_available !== true) {
    throw new ContractError(`${context}: rollback unavailable candidate cannot be approved`);
  }
  if (candidate.sandbox_status !== "pass" && output.simulation_status !== "pass") {
    throw new ContractError(`${context}: sandbox must pass before approval`);
  }
}

function assertNoPhase12ImmediateEffect(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPhase12ImmediateEffect(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (PHASE12_IMMEDIATE_EFFECT_FIELDS.has(field)) {
      throw new ContractError(`${context}: improvement candidate must not apply immediately`, {
        field,
        path,
      });
    }
    assertNoPhase12ImmediateEffect(child, context, `${path}.${field}`);
  }
}
