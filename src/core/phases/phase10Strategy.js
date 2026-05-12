import {
  ContractError,
  assertCoreBoundary,
  assertScore,
  normalizeStatus,
  requireFields,
} from "../contracts.js";

const PHASE10_FORBIDDEN_FIELDS = new Set([
  "action_type",
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
]);

export function phase10Strategy({ phase06, phase08, phase09, runtime = {} }) {
  requireFields(phase06, ["trace_id", "event_id"], "Phase10 phase06 input");
  requireFields(phase08, ["phase08_primary_goal"], "Phase10 phase08 input");
  requireFields(phase09, ["phase09_constraint_status"], "Phase10 phase09 input");
  assertCoreBoundary(phase06, "Phase10 phase06 input");
  assertCoreBoundary(phase08, "Phase10 phase08 input");
  assertCoreBoundary(phase09, "Phase10 phase09 input");

  const phase10_goal_strategy_mode = mapGoalToStrategy(phase08.phase08_primary_goal);
  const phase10_previous_fallback_active =
    runtime.fallback_active === true || runtime.previous_fallback_active === true;
  const fallback_exit =
    phase10_previous_fallback_active &&
    phase09.phase09_constraint_status === "pass" &&
    0.15 < 0.2;
  const fallback_active = phase09.phase09_constraint_status === "reject" || (phase10_previous_fallback_active && !fallback_exit);
  const strategy_mode = fallback_active ? "maintain" : phase10_goal_strategy_mode;
  const stability_score = fallback_active ? 0.65 : 0.85;
  const instability_score = 1 - stability_score;

  assertScore("stability_score", stability_score);
  assertScore("instability_score", instability_score);

  const output = {
    trace_id: phase06.trace_id,
    event_id: phase06.event_id,
    phase10_strategy_label: strategy_mode,
    phase10_goal_strategy_mode,
    phase10_strategy_status: phase09.phase09_constraint_status,
    phase10_normalized_status: normalizeStatus(phase09.phase09_constraint_status),
    strategy_mode,
    fallback_active,
    fallback_exit,
    phase10_previous_fallback_active,
    selected_goal: phase08.phase08_primary_goal,
    constraint_status: phase09.phase09_constraint_status,
    stability_score,
    instability_score,
    phase10_selected_goal: phase08.phase08_primary_goal,
    phase10_stability_score: stability_score,
    phase10_instability_score: instability_score,
    phase10_fallback_exit_boundary: {
      strategy_change_forbidden_while_fallback: true,
      exit_requires_instability_below_0_2: true,
      exit_requires_phase09_pass: true,
    },
    phase10_goal_strategy_boundary: {
      phase08_primary_goal_only: true,
      single_strategy: true,
      no_action_type: true,
      no_world_command: true,
    },
  };
  assertPhase10StrategySafe(output);
  return output;
}

export function assertPhase10StrategySafe(output, context = "Phase10 strategy") {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new ContractError(`${context}: output required`);
  }
  assertCoreBoundary(output, context);
  assertNoPhase10ForbiddenFields(output, context);
  if (output.phase10_selected_goal !== output.selected_goal) {
    throw new ContractError(`${context}: selected goal alias mismatch`);
  }
  if (output.phase10_goal_strategy_mode !== mapGoalToStrategy(output.phase10_selected_goal)) {
    throw new ContractError(`${context}: goal strategy mapping mismatch`);
  }
  if (output.fallback_active !== true && output.strategy_mode !== output.phase10_goal_strategy_mode) {
    throw new ContractError(`${context}: strategy must be selected from Phase08 goal`);
  }
  if (output.fallback_active === true && output.strategy_mode !== "maintain") {
    throw new ContractError(`${context}: fallback strategy change forbidden`);
  }
  if (output.fallback_exit === true) {
    if (output.phase10_previous_fallback_active !== true) {
      throw new ContractError(`${context}: fallback exit requires previous fallback`);
    }
    if (output.constraint_status !== "pass" || output.instability_score >= 0.2 || output.fallback_active !== false) {
      throw new ContractError(`${context}: fallback exit requires pass and low instability`);
    }
  }
  if (Array.isArray(output.strategy_mode) || Array.isArray(output.phase10_strategy_label)) {
    throw new ContractError(`${context}: multiple strategies are forbidden`);
  }
  if (output.phase10_strategy_label !== output.strategy_mode) {
    throw new ContractError(`${context}: strategy alias mismatch`);
  }
  if (
    output.phase10_fallback_exit_boundary?.strategy_change_forbidden_while_fallback !== true ||
    output.phase10_fallback_exit_boundary?.exit_requires_instability_below_0_2 !== true ||
    output.phase10_fallback_exit_boundary?.exit_requires_phase09_pass !== true
  ) {
    throw new ContractError(`${context}: fallback exit boundary required`);
  }
  if (
    output.phase10_goal_strategy_boundary?.phase08_primary_goal_only !== true ||
    output.phase10_goal_strategy_boundary?.single_strategy !== true ||
    output.phase10_goal_strategy_boundary?.no_action_type !== true ||
    output.phase10_goal_strategy_boundary?.no_world_command !== true
  ) {
    throw new ContractError(`${context}: goal strategy boundary required`);
  }
}

function mapGoalToStrategy(goal) {
  switch (goal) {
    case "STRENGTHEN_RELATION":
      return "engage";
    case "CONTINUE_TOPIC":
      return "focus";
    case "EXPLORE_NEW":
      return "explore";
    case "STABILIZE_STATE":
    default:
      return "maintain";
  }
}

function assertNoPhase10ForbiddenFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPhase10ForbiddenFields(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (PHASE10_FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: Phase10 must not emit action or command`, {
        field,
        path,
      });
    }
    assertNoPhase10ForbiddenFields(child, context, `${path}.${field}`);
  }
}
