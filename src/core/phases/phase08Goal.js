import {
  ContractError,
  assertCoreBoundary,
  assertScore,
  canonical,
  requireFields,
} from "../contracts.js";

const GOALS = Object.freeze([
  "STRENGTHEN_RELATION",
  "CONTINUE_TOPIC",
  "EXPLORE_NEW",
  "STABILIZE_STATE",
]);
const PHASE08_FORBIDDEN_FIELDS = new Set([
  "intent",
  "action_type",
  "task_type",
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "external_pressure",
  "memory_commit",
  "relationship_commit",
  "action_decision",
]);

export function phase08Goal(phase07, runtime = {}) {
  requireFields(
    phase07,
    ["trace_id", "event_id", "task_type", "phase07_value_score", "phase07_character_alignment_score"],
    "Phase08 input"
  );
  assertCoreBoundary(phase07, "Phase08 input");
  assertNoPhase08InputActionType(phase07, "Phase08 input");

  const goalAge = normalizeGoalAge(runtime.goal_age);
  const rotationTriggered = goalAge >= 3;
  const previousGoal = firstValidGoal([
    runtime.previous_goal,
    runtime.phase08_previous_goal,
    runtime.current_goal,
    runtime.phase08_primary_goal,
    runtime.primary_goal,
    runtime.last_goal,
  ]);
  const {
    phase08_primary_goal,
    phase08_forced_goal,
    phase08_temporarily_banned_goal,
  } = selectPhase08Goal(phase07, runtime, rotationTriggered, previousGoal);
  assertPhase08GoalLabel(phase08_primary_goal);

  const phase08_base_priority = Math.min(
    1,
    Math.max(0, phase07.phase07_value_score * 0.6 + phase07.phase07_character_alignment_score * 0.4)
  );
  const phase08_recent_goal_penalty = calculateRecentGoalPenalty(
    phase08_primary_goal,
    runtime.recent_goals
  );
  const phase08_priority = Math.max(0, phase08_base_priority - phase08_recent_goal_penalty);
  assertScore("phase08_base_priority", phase08_base_priority);
  assertScore("phase08_recent_goal_penalty", phase08_recent_goal_penalty);
  assertScore("phase08_priority", phase08_priority);

  const output = {
    trace_id: phase07.trace_id,
    event_id: phase07.event_id,
    phase08_primary_goal,
    phase08_base_priority,
    phase08_recent_goal_penalty,
    phase08_priority,
    phase08_goal_age: rotationTriggered ? 0 : goalAge + 1,
    phase08_rotation_triggered: rotationTriggered,
    primary_goal: phase08_primary_goal,
    phase08_forced_goal,
    forced_goal: phase08_forced_goal,
    phase08_temporarily_banned_goal,
    temporarily_banned_goal: phase08_temporarily_banned_goal,
    priority: phase08_priority,
    recent_goal_penalty: phase08_recent_goal_penalty,
    goal_age: rotationTriggered ? 0 : goalAge + 1,
    rotation_triggered: rotationTriggered,
    phase08_recent_goal_penalty_boundary: {
      score_correction_only: true,
      no_external_pressure: true,
      no_memory_commit: true,
      no_action_decision: true,
    },
    phase08_rotation_policy: {
      deterministic_forced_goal: true,
      random_source_used: false,
      previous_goal_temporarily_banned: phase08_temporarily_banned_goal !== null,
      next_cycle_maintains_forced_goal: true,
    },
    phase08_goal_boundary: {
      phase_local_goal_label_only: true,
      not_intent: true,
      not_action_type: true,
      not_task_type: true,
      no_world_command: true,
    },
  };
  assertPhase08GoalSafe(output);
  return output;
}

export function assertPhase08GoalSafe(output, context = "Phase08 goal") {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new ContractError(`${context}: output required`);
  }
  assertCoreBoundary(output, context);
  assertNoPhase08ForbiddenFields(output, context);
  assertPhase08GoalLabel(output.phase08_primary_goal, context);
  if (output.primary_goal !== output.phase08_primary_goal) {
    throw new ContractError(`${context}: primary goal alias mismatch`);
  }
  if (output.phase08_forced_goal !== output.forced_goal) {
    throw new ContractError(`${context}: forced goal alias mismatch`);
  }
  if (output.phase08_temporarily_banned_goal !== output.temporarily_banned_goal) {
    throw new ContractError(`${context}: temporary ban alias mismatch`);
  }
  if (output.phase08_forced_goal !== null) {
    assertPhase08GoalLabel(output.phase08_forced_goal, context);
  }
  if (output.phase08_temporarily_banned_goal !== null) {
    assertPhase08GoalLabel(output.phase08_temporarily_banned_goal, context);
  }
  if (
    output.rotation_triggered === true &&
    output.phase08_temporarily_banned_goal !== null &&
    output.phase08_temporarily_banned_goal === output.phase08_primary_goal
  ) {
    throw new ContractError(`${context}: rotated goal must not reuse temporary ban`);
  }
  if (
    output.phase08_rotation_policy?.deterministic_forced_goal !== true ||
    output.phase08_rotation_policy?.random_source_used !== false ||
    output.phase08_rotation_policy?.next_cycle_maintains_forced_goal !== true
  ) {
    throw new ContractError(`${context}: deterministic rotation policy required`);
  }
  assertScore("phase08_base_priority", output.phase08_base_priority);
  assertScore("phase08_recent_goal_penalty", output.phase08_recent_goal_penalty);
  if (output.recent_goal_penalty !== output.phase08_recent_goal_penalty) {
    throw new ContractError(`${context}: recent goal penalty alias mismatch`);
  }
  if (
    output.phase08_recent_goal_penalty_boundary?.score_correction_only !== true ||
    output.phase08_recent_goal_penalty_boundary?.no_external_pressure !== true ||
    output.phase08_recent_goal_penalty_boundary?.no_memory_commit !== true ||
    output.phase08_recent_goal_penalty_boundary?.no_action_decision !== true
  ) {
    throw new ContractError(`${context}: recent goal penalty boundary required`);
  }
  if (
    canonical.intents.has(output.phase08_primary_goal) ||
    canonical.actionTypes.has(output.phase08_primary_goal) ||
    canonical.taskTypes.has(output.phase08_primary_goal)
  ) {
    throw new ContractError(`${context}: goal label must remain phase-local`);
  }
  if (
    output.phase08_goal_boundary?.phase_local_goal_label_only !== true ||
    output.phase08_goal_boundary?.not_intent !== true ||
    output.phase08_goal_boundary?.not_action_type !== true ||
    output.phase08_goal_boundary?.not_task_type !== true ||
    output.phase08_goal_boundary?.no_world_command !== true
  ) {
    throw new ContractError(`${context}: goal boundary policy required`);
  }
}

function assertPhase08GoalLabel(goal, context = "Phase08 goal") {
  if (!GOALS.includes(goal)) {
    throw new ContractError(`${context}: invalid Phase08 goal label`);
  }
}

function selectPhase08Goal(phase07, runtime, rotationTriggered, previousGoal) {
  const defaultGoal =
    phase07.task_type === "INTERACT_USER" ? "STRENGTHEN_RELATION" : "CONTINUE_TOPIC";
  const currentGoal = firstValidGoal([
    runtime.current_goal,
    runtime.phase08_primary_goal,
    runtime.primary_goal,
    runtime.last_goal,
  ]);
  if (!rotationTriggered) {
    return {
      phase08_primary_goal: currentGoal ?? defaultGoal,
      phase08_forced_goal: null,
      phase08_temporarily_banned_goal: null,
    };
  }

  const requestedForcedGoal = firstValidGoal([runtime.forced_goal, runtime.phase08_forced_goal]);
  const phase08_forced_goal =
    requestedForcedGoal && requestedForcedGoal !== previousGoal
      ? requestedForcedGoal
      : deterministicNextGoal(previousGoal, defaultGoal);
  return {
    phase08_primary_goal: phase08_forced_goal,
    phase08_forced_goal,
    phase08_temporarily_banned_goal: previousGoal,
  };
}

function deterministicNextGoal(previousGoal, defaultGoal) {
  const orderedGoals = [
    defaultGoal,
    "EXPLORE_NEW",
    "STABILIZE_STATE",
    "CONTINUE_TOPIC",
    "STRENGTHEN_RELATION",
  ];
  return orderedGoals.find((goal, index) => orderedGoals.indexOf(goal) === index && goal !== previousGoal);
}

function firstValidGoal(values) {
  for (const value of values) {
    if (GOALS.includes(value)) return value;
  }
  return null;
}

function normalizeGoalAge(value) {
  const goalAge = Number(value ?? 0);
  if (!Number.isFinite(goalAge) || goalAge < 0) return 0;
  return Math.trunc(goalAge);
}

function calculateRecentGoalPenalty(goal, recentGoals) {
  if (!Array.isArray(recentGoals)) return 0;
  const repeats = recentGoals.filter((recentGoal) => recentGoal === goal).length;
  return Math.min(0.2, repeats * 0.05);
}

function assertNoPhase08ForbiddenFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoPhase08ForbiddenFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (PHASE08_FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: goal label crossed canonical boundary`, {
        field,
        path,
      });
    }
    assertNoPhase08ForbiddenFields(child, context, `${path}.${field}`);
  }
}

function assertNoPhase08InputActionType(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoPhase08InputActionType(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (field === "action_type") {
      throw new ContractError(`${context}: action_type must be decided by Phase04`, {
        field,
        path,
      });
    }
    assertNoPhase08InputActionType(child, context, `${path}.${field}`);
  }
}
