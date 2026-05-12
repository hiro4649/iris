import {
  ContractError,
  assertCoreBoundary,
  assertScore,
  normalizeStatus,
  requireFields,
} from "../contracts.js";

const PHASE11_UPSTREAM_PROPAGATION_FIELDS = new Set([
  "phase07_update",
  "phase08_update",
  "phase10_update",
  "upstream_feedback",
  "memory_update",
  "memory_commit",
  "relationship_update",
  "relationship_commit",
  "personality_update",
  "strategy_update",
  "private_viewer_id",
  "viewer_private_id",
  "raw_comments",
  "raw_comment",
  "raw_viewer_text",
  "hidden_score",
  "hidden_dependency_score",
]);

export function phase11Economy({ phase07, phase09, phase10 }) {
  requireFields(phase07, ["trace_id", "event_id", "phase07_reward_score"], "Phase11 phase07 input");
  requireFields(phase09, ["phase09_constraint_status"], "Phase11 phase09 input");
  requireFields(phase10, ["strategy_mode"], "Phase11 phase10 input");
  assertCoreBoundary(phase07, "Phase11 phase07 input");
  assertCoreBoundary(phase09, "Phase11 phase09 input");
  assertCoreBoundary(phase10, "Phase11 phase10 input");

  const phase11_economy_health_score = phase09.phase09_constraint_status === "reject" ? 0.55 : 0.9;
  const phase11_dependency_guard_status =
    phase07.phase07_reward_score > 0.9 ? "degrade" : "pass";
  const user_dependency_score = Math.min(1, Math.max(0, phase07.phase07_reward_score));
  const dependency_risk = user_dependency_score > 0.95
    ? "critical"
    : user_dependency_score > 0.9
      ? "warning"
      : "safe";
  assertScore("phase11_economy_health_score", phase11_economy_health_score);
  assertScore("user_dependency_score", user_dependency_score);

  const output = {
    trace_id: phase07.trace_id,
    event_id: phase07.event_id,
    phase11_evaluation_summary: "read-only economy and dependency guard complete",
    phase11_isolation_status: "read_only_non_propagating",
    phase11_visibility: "read_only_non_propagating",
    phase11_economy_health_score,
    phase11_dependency_guard_status,
    user_dependency_score,
    dependency_risk,
    phase11_dependency_guard_safe_summary: {
      status: phase11_dependency_guard_status,
      dependency_risk,
      safe_summary_only: true,
    },
    phase11_normalized_status: normalizeStatus(phase11_dependency_guard_status),
    phase10_strategy_mode: phase10.strategy_mode,
    phase09_constraint_status: phase09.phase09_constraint_status,
    phase11_isolation_boundary: {
      read_only_non_propagating: true,
      no_phase10_feedback: true,
      no_phase08_feedback: true,
      no_phase07_feedback: true,
      no_memory_relationship_personality_update: true,
    },
    phase11_dependency_public_boundary: {
      safe_summary_only: true,
      no_private_viewer_id: true,
      no_raw_comments: true,
      no_hidden_score: true,
    },
  };
  assertPhase11EconomySafe(output);
  return output;
}

export function assertPhase11EconomySafe(output, context = "Phase11 economy") {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new ContractError(`${context}: output required`);
  }
  assertCoreBoundary(output, context);
  assertNoPhase11UpstreamPropagation(output, context);
  if (
    output.phase11_isolation_status !== "read_only_non_propagating" ||
    output.phase11_visibility !== "read_only_non_propagating"
  ) {
    throw new ContractError(`${context}: isolation status required`);
  }
  if (
    output.phase11_isolation_boundary?.read_only_non_propagating !== true ||
    output.phase11_isolation_boundary?.no_phase10_feedback !== true ||
    output.phase11_isolation_boundary?.no_phase08_feedback !== true ||
    output.phase11_isolation_boundary?.no_phase07_feedback !== true ||
    output.phase11_isolation_boundary?.no_memory_relationship_personality_update !== true
  ) {
    throw new ContractError(`${context}: isolation boundary required`);
  }
  assertScore("user_dependency_score", output.user_dependency_score);
  if (!["safe", "warning", "critical"].includes(output.dependency_risk)) {
    throw new ContractError(`${context}: invalid dependency risk`);
  }
  if (
    output.phase11_dependency_guard_safe_summary?.safe_summary_only !== true ||
    output.phase11_dependency_guard_safe_summary?.status !== output.phase11_dependency_guard_status ||
    output.phase11_dependency_guard_safe_summary?.dependency_risk !== output.dependency_risk
  ) {
    throw new ContractError(`${context}: dependency safe summary required`);
  }
  if (
    output.phase11_dependency_public_boundary?.safe_summary_only !== true ||
    output.phase11_dependency_public_boundary?.no_private_viewer_id !== true ||
    output.phase11_dependency_public_boundary?.no_raw_comments !== true ||
    output.phase11_dependency_public_boundary?.no_hidden_score !== true
  ) {
    throw new ContractError(`${context}: dependency public boundary required`);
  }
}

function assertNoPhase11UpstreamPropagation(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPhase11UpstreamPropagation(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (PHASE11_UPSTREAM_PROPAGATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: Phase11 output must not propagate upstream`, {
        field,
        path,
      });
    }
    assertNoPhase11UpstreamPropagation(child, context, `${path}.${field}`);
  }
}
