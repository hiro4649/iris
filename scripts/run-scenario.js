import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { loadScenarioFile, runScenario } from "../src/runtime/scenarioRunner.js";
import { fileURLToPath } from "node:url";

const SCENARIO_REPORT_FIELDS = new Set([
  "schema",
  "name",
  "step_count",
  "results",
  "boundary_policy"
]);
const SCENARIO_STEP_FIELDS = new Set([
  "index",
  "kind",
  "event_id",
  "final_decision",
  "final_text",
  "action_type",
  "prosody_style",
  "motion_style",
  "body_state_id",
  "rhythm_state_id",
  "affective_state_id",
  "laughter_state",
  "selected_habit",
  "expression_profile_id",
  "laugh_kind",
  "autonomous_state_id",
  "scream_profile",
  "familiarity_level",
  "relationship_candidate_status",
  "donation_reaction_style",
  "media_watch_reaction_mode",
  "external_topic_reaction_mode",
  "memory_recall_decision",
  "selected_memory_count",
  "danger_level",
  "commentary_trigger",
  "commentary_mode",
  "game_goal",
  "input_action_candidate_status",
  "game_action_validation_status",
  "approved_game_action_kind",
  "game_control_status",
  "game_embodied_state",
  "session_phase",
  "human_likeness_score",
  "review_required",
  "boundary_audit_status",
  "candidate_validation_status",
  "candidate_memory_approved_count",
  "candidate_memory_committed_count",
  "candidate_review_count",
  "performance_duration_ms"
]);

const SCENARIO_BOUNDARY_POLICY_FIELDS = new Set([
  "summary_fields_only",
  "no_memory_records",
  "no_relationship_records",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
  "no_raw_runtime_state"
]);

const SCENARIO_STEP_STRING_FIELDS = [
  "kind",
  "event_id",
  "final_decision",
  "action_type",
  "prosody_style",
  "motion_style",
  "body_state_id",
  "rhythm_state_id",
  "affective_state_id",
  "laughter_state",
  "selected_habit",
  "expression_profile_id",
  "laugh_kind",
  "autonomous_state_id",
  "scream_profile",
  "familiarity_level",
  "relationship_candidate_status",
  "donation_reaction_style",
  "media_watch_reaction_mode",
  "external_topic_reaction_mode",
  "memory_recall_decision",
  "danger_level",
  "commentary_trigger",
  "commentary_mode",
  "game_goal",
  "input_action_candidate_status",
  "game_action_validation_status",
  "approved_game_action_kind",
  "game_control_status",
  "game_embodied_state",
  "session_phase",
  "boundary_audit_status",
  "candidate_validation_status"
];

const SCENARIO_STEP_COUNT_FIELDS = [
  "index",
  "selected_memory_count",
  "candidate_memory_approved_count",
  "candidate_memory_committed_count",
  "candidate_review_count",
  "performance_duration_ms"
];

function assertOptionalString(value, label) {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new Error(`${label} must be a string when present`);
  }
}

function assertOptionalPublicToken(value, label) {
  assertOptionalString(value, label);
  if (
    value !== undefined &&
    value !== null &&
    !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)
  ) {
    throw new Error(`${label} must be a safe public token`);
  }
}

function assertPublicToken(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) {
    throw new Error(`${label} must be a safe public token`);
  }
}

function assertOnlyFields(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  for (const field of Object.keys(value)) {
    if (!fields.has(field)) {
      throw new Error(`Unexpected ${label} field: ${field}`);
    }
  }
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

export function assertScenarioReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("Scenario report must be an object");
  }
  for (const field of Object.keys(report)) {
    if (!SCENARIO_REPORT_FIELDS.has(field)) {
      throw new Error(`Unexpected scenario report field: ${field}`);
    }
  }
  if (report.schema !== "iris_scenario_result_v1") {
    throw new Error("Scenario report schema mismatch");
  }
  assertPublicToken(report.name, "Scenario report name");
  assertNonNegativeInteger(report.step_count, "Scenario report step count");
  if (!Array.isArray(report.results)) {
    throw new Error("Scenario report results must be an array");
  }
  if (report.results.length !== report.step_count) {
    throw new Error("Scenario report step count mismatch");
  }
  for (const [index, step] of report.results.entries()) {
    assertOnlyFields(step, SCENARIO_STEP_FIELDS, "scenario step");
    for (const field of SCENARIO_STEP_STRING_FIELDS) {
      assertOptionalPublicToken(step[field], `Scenario step ${field}`);
    }
    assertPublicToken(step.event_id, "Scenario step event_id");
    assertPublicToken(step.final_decision, "Scenario step final_decision");
    assertPublicToken(
      step.boundary_audit_status,
      "Scenario step boundary_audit_status"
    );
    assertPublicToken(
      step.candidate_validation_status,
      "Scenario step candidate_validation_status"
    );
    for (const field of SCENARIO_STEP_COUNT_FIELDS) {
      assertNonNegativeInteger(step[field], `Scenario step ${field}`);
    }
    if (
      step.candidate_memory_committed_count > step.candidate_memory_approved_count
    ) {
      throw new Error(
        "Scenario step committed memory count must not exceed approved memory count"
      );
    }
    if (step.candidate_memory_approved_count > step.candidate_review_count) {
      throw new Error(
        "Scenario step approved memory count must not exceed candidate review count"
      );
    }
    if (step.index !== index) {
      throw new Error("Scenario step index must match result position");
    }
    assertOptionalString(step.final_text, "Scenario step final_text");
    if (
      typeof step.human_likeness_score !== "number" ||
      !Number.isFinite(step.human_likeness_score) ||
      step.human_likeness_score < 0
    ) {
      throw new Error(
        "Scenario step human_likeness_score must be a finite non-negative number"
      );
    }
    if (typeof step.review_required !== "boolean") {
      throw new Error("Scenario step review_required must be a boolean");
    }
  }
  assertOnlyFields(
    report.boundary_policy,
    SCENARIO_BOUNDARY_POLICY_FIELDS,
    "scenario boundary policy"
  );
  for (const field of SCENARIO_BOUNDARY_POLICY_FIELDS) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`Scenario report ${field} boundary required`);
    }
  }
}

function createScenarioCliEnv(env) {
  return {
    ...env,
    IRIS_GAME_CONTROL_ADAPTER:
      env.IRIS_GAME_CONTROL_ADAPTER === "http" && !env.IRIS_GAME_CONTROL_ENDPOINT
        ? "mock"
        : env.IRIS_GAME_CONTROL_ADAPTER,
    IRIS_MEMORY_SEARCH_ADAPTER:
      env.IRIS_MEMORY_SEARCH_ADAPTER === "http_vector" && !env.IRIS_MEMORY_SEARCH_ENDPOINT
        ? "local"
        : env.IRIS_MEMORY_SEARCH_ADAPTER,
  };
}

export async function createScenarioCliReport({
  filePath = "scenarios/dev-basic.json",
  env = process.env,
} = {}) {
const scenario = loadScenarioFile(filePath);
const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(),
  ...createRuntimeAdaptersFromEnv(createScenarioCliEnv(env)),
});

const result = await runScenario(runtime, scenario);
const report = {
  schema: result.schema,
  name: result.name,
  step_count: result.step_count,
  results: result.results.map((step) => ({
    index: step.index,
    kind: step.kind,
    event_id: step.event_id,
    final_decision: step.final_decision,
    final_text: step.final_text,
    action_type: step.action_type,
    prosody_style: step.prosody_style,
    motion_style: step.motion_style,
    body_state_id: step.body_state_id,
    rhythm_state_id: step.rhythm_state_id,
    affective_state_id: step.affective_state_id,
    laughter_state: step.laughter_state,
    selected_habit: step.selected_habit,
    expression_profile_id: step.expression_profile_id,
    laugh_kind: step.laugh_kind,
    autonomous_state_id: step.autonomous_state_id,
    scream_profile: step.scream_profile,
    familiarity_level: step.familiarity_level,
    relationship_candidate_status: step.relationship_candidate_status,
    donation_reaction_style: step.donation_reaction_style,
    media_watch_reaction_mode: step.media_watch_reaction_mode,
    external_topic_reaction_mode: step.external_topic_reaction_mode,
    memory_recall_decision: step.memory_recall_decision,
    selected_memory_count: step.selected_memory_count,
    danger_level: step.danger_level,
    commentary_trigger: step.commentary_trigger,
    commentary_mode: step.commentary_mode,
    game_goal: step.game_goal,
    input_action_candidate_status: step.input_action_candidate_status,
    game_action_validation_status: step.game_action_validation_status,
    approved_game_action_kind: step.approved_game_action_kind,
    game_control_status: step.game_control_status,
    game_embodied_state: step.game_embodied_state,
    session_phase: step.session_phase,
    human_likeness_score: step.human_likeness_score,
    review_required: step.review_required,
    boundary_audit_status: step.boundary_audit_status,
    candidate_validation_status: step.candidate_validation_status,
    candidate_memory_approved_count: step.candidate_memory_approved_count,
    candidate_memory_committed_count: step.candidate_memory_committed_count,
    candidate_review_count: step.candidate_review_count,
    performance_duration_ms: step.performance_duration_ms,
  })),
  boundary_policy: {
    summary_fields_only: true,
    no_memory_records: true,
    no_relationship_records: true,
    no_candidates: true,
    no_commands: true,
    no_raw_frames: true,
    no_raw_runtime_state: true,
  },
};

assertScenarioReportSafe(report);

return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await createScenarioCliReport({
    filePath: process.argv[2] ?? "scenarios/dev-basic.json",
  });
  console.log(JSON.stringify(report, null, 2));
}
