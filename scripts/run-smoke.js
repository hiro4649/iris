import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { loadScenarioFile, runScenario } from "../src/runtime/scenarioRunner.js";

const SMOKE_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "scenario",
  "step_count",
  "min_human_likeness_score",
  "game_step_count",
  "candidate_review_item_count",
  "boundary_policy"
]);

const SMOKE_BOUNDARY_POLICY_FIELDS = new Set([
  "counts_only",
  "no_raw_steps",
  "no_text_payloads",
  "no_memory_records",
  "no_relationship_records",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
  "no_raw_runtime_state"
]);

function assertNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
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

export function assertSmokeReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("Smoke report must be an object");
  }
  for (const field of Object.keys(report)) {
    if (!SMOKE_REPORT_FIELDS.has(field)) {
      throw new Error(`Unexpected smoke report field: ${field}`);
    }
  }
  assert.equal(report.ok, true);
  assert.equal(report.schema, "iris_smoke_report_v1");
  assertPublicToken(report.scenario, "Smoke scenario");
  assertNonNegativeInteger(report.step_count, "Smoke step count");
  assertNonNegativeInteger(report.game_step_count, "Smoke game step count");
  assertNonNegativeInteger(
    report.candidate_review_item_count,
    "Smoke candidate review item count"
  );
  if (report.game_step_count <= 0) {
    throw new Error("Smoke game step count must be positive");
  }
  if (report.game_step_count > report.step_count) {
    throw new Error("Smoke game step count must not exceed step count");
  }
  if (report.candidate_review_item_count < report.step_count) {
    throw new Error(
      "Smoke candidate review item count must be at least the step count"
    );
  }
  if (
    typeof report.min_human_likeness_score !== "number" ||
    !Number.isFinite(report.min_human_likeness_score) ||
    report.min_human_likeness_score < 0
  ) {
    throw new Error("Smoke min human likeness score must be a finite non-negative number");
  }
  assertOnlyFields(report.boundary_policy, SMOKE_BOUNDARY_POLICY_FIELDS, "smoke boundary policy");
  for (const field of SMOKE_BOUNDARY_POLICY_FIELDS) {
    assert.equal(report.boundary_policy[field], true);
  }
}

export async function createSmokeReport({
  filePath = "scenarios/dev-basic.json",
} = {}) {
const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig({ enablePersistence: false }),
  ttsAdapter(packet) {
    return { spoken: Boolean(packet.final_text), packet_schema: packet.packet_schema };
  },
  live2dAdapter(packet) {
    return { sent: true, packet_schema: packet.packet_schema };
  },
  logger: { log() {}, error: console.error },
});

const capabilities = runtime.capabilities();
assert.equal(capabilities.phase25_game_embodiment_mvp, true);
assert.equal(capabilities.phase26_stream_lifecycle_mvp, true);
assert.equal(capabilities.phase27_human_likeness_evaluation_mvp, true);
assert.equal(capabilities.candidate_review_queue, true);
assert.equal(capabilities.candidate_validator, true);
assert.equal(capabilities.persona_profile, true);
assert.equal(capabilities.expression_profile, true);
assert.equal(capabilities.autonomous_expression, true);
assert.equal(capabilities.camera_proximity, true);
assert.equal(capabilities.donation_reaction, true);
assert.equal(capabilities.media_watch_reaction, true);
assert.equal(capabilities.external_topic_reaction, true);
assert.equal(capabilities.game_action_validator, true);
assert.equal(capabilities.game_control_adapter_available, true);

const scenario = loadScenarioFile(filePath);
const result = await runScenario(runtime, scenario);
assert.equal(result.schema, "iris_scenario_result_v1");
assert.ok(result.step_count > 0);

const gameSteps = result.results.filter((step) => step.kind === "game_observation");
assert.ok(gameSteps.length > 0, "smoke scenario should include at least one game observation");
const donationSteps = result.results.filter((step) => step.kind === "donation");
const mediaSteps = result.results.filter((step) => step.kind === "media_watch");
const topicSteps = result.results.filter((step) => step.kind === "external_topic");

for (const step of result.results) {
  assert.equal(step.final_decision, "allow");
  assert.equal(typeof step.human_likeness_score, "number");
  assert.ok(step.human_likeness_score >= 0.75);
  assert.equal(step.review_required, false);
  assert.equal(step.boundary_audit_status, "pass");
  assert.ok(step.candidate_review_count >= 1);
  assert.equal(typeof step.expression_profile_id, "string");
  assert.equal(typeof step.autonomous_state_id, "string");
  assert.equal(typeof step.candidate_validation_status, "string");
  assert.equal(typeof step.game_action_validation_status, "string");
  assert.equal(typeof step.game_control_status, "string");
  assert.equal(Object.hasOwn(step, "input_action_candidate"), false);
  assert.equal(Object.hasOwn(step, "approved_game_input_action"), false);
  assert.equal(Object.hasOwn(step, "memory_carryover_candidates"), false);
}

for (const step of gameSteps) {
  assert.ok(["focused", "panic_light", "burst_laugh_game", "calm_play"].includes(step.game_embodied_state));
  assert.ok(["validation_required", "none"].includes(step.input_action_candidate_status));
  assert.ok(["disabled", "not_created", "approved", "rejected"].includes(step.game_action_validation_status));
  assert.equal(step.session_phase, "active");
}

const reviewStats = runtime.candidateReviewStats();
assert.ok(reviewStats.total_items >= result.step_count);
assert.ok((reviewStats.by_kind.game_input_review ?? 0) >= 1);
assert.ok((reviewStats.by_kind.game_action_validation_review ?? 0) >= 1);
if (donationSteps.length > 0) {
  assert.ok((reviewStats.by_kind.donation_appreciation_review ?? 0) >= 1);
}
if (mediaSteps.length > 0) {
  assert.ok((reviewStats.by_kind.media_watch_memory_review ?? 0) >= 1);
}
for (const step of topicSteps) {
  assert.ok(["casual_topic", "cautious_topic", "stale_topic", "safety_hold"].includes(step.external_topic_reaction_mode));
}

const report = {
  ok: true,
  schema: "iris_smoke_report_v1",
  scenario: result.name,
  step_count: result.step_count,
  min_human_likeness_score: Math.min(
    ...result.results.map((step) => step.human_likeness_score)
  ),
  game_step_count: gameSteps.length,
  candidate_review_item_count: reviewStats.total_items,
  boundary_policy: {
    counts_only: true,
    no_raw_steps: true,
    no_text_payloads: true,
    no_memory_records: true,
    no_relationship_records: true,
    no_candidates: true,
    no_commands: true,
    no_raw_frames: true,
    no_raw_runtime_state: true,
  },
};

assertSmokeReportSafe(report);

return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await createSmokeReport({
    filePath: process.argv[2] ?? "scenarios/dev-basic.json",
  });
  console.log(JSON.stringify(report, null, 2));
}
