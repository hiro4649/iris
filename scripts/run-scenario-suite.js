import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { loadScenarioFile, runScenario } from "../src/runtime/scenarioRunner.js";

const SCENARIO_SUITE_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "scenario_count",
  "results",
  "boundary_policy"
]);
const SCENARIO_SUITE_RESULT_FIELDS = new Set([
  "file",
  "name",
  "step_count",
  "response_languages",
  "tongue_twister_step_count",
  "min_human_likeness_score",
  "candidate_review_item_count"
]);

const SCENARIO_SUITE_BOUNDARY_POLICY_FIELDS = new Set([
  "scenario_file_names_only",
  "no_raw_step_payloads",
  "no_text_payloads",
  "no_memory_records",
  "no_relationship_records",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
  "no_raw_runtime_state"
]);

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

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
}

function assertPublicToken(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) {
    throw new Error(`${label} must be a safe public token`);
  }
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${label} must be a string array`);
  }
}

function assertLanguageCodeArray(value, label) {
  assertStringArray(value, label);
  for (const item of value) {
    if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(item)) {
      throw new Error(`${label} must contain public language codes only`);
    }
  }
}

function assertScenarioFileName(value) {
  assertString(value, "Scenario suite file");
  if (!/^scenarios\/[A-Za-z0-9_-]+\.json$/.test(value)) {
    throw new Error("Scenario suite file must be a public scenario JSON path");
  }
}

function toPublicScenarioFileName(file) {
  return file.replace(/\\/g, "/");
}

export function assertScenarioSuiteReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("Scenario suite report must be an object");
  }
  for (const field of Object.keys(report)) {
    if (!SCENARIO_SUITE_REPORT_FIELDS.has(field)) {
      throw new Error(`Unexpected scenario suite report field: ${field}`);
    }
  }
  assert.equal(report.ok, true);
  assert.equal(report.schema, "iris_scenario_suite_report_v1");
  assertNonNegativeInteger(report.scenario_count, "Scenario suite scenario count");
  assertArray(report.results, "Scenario suite results");
  assert.equal(report.scenario_count, report.results.length);
  for (const result of report.results) {
    assertOnlyFields(result, SCENARIO_SUITE_RESULT_FIELDS, "scenario suite result");
    assertScenarioFileName(result.file);
    assertPublicToken(result.name, "Scenario suite result name");
    assertNonNegativeInteger(result.step_count, "Scenario suite result step count");
    assertLanguageCodeArray(
      result.response_languages,
      "Scenario suite response languages"
    );
    assertNonNegativeInteger(
      result.tongue_twister_step_count,
      "Scenario suite tongue twister step count"
    );
    if (result.step_count <= 0) {
      throw new Error("Scenario suite result step count must be positive");
    }
    if (result.tongue_twister_step_count > result.step_count) {
      throw new Error(
        "Scenario suite tongue twister step count must not exceed step count"
      );
    }
    if (
      typeof result.min_human_likeness_score !== "number" ||
      !Number.isFinite(result.min_human_likeness_score) ||
      result.min_human_likeness_score < 0
    ) {
      throw new Error(
        "Scenario suite min human likeness score must be a finite non-negative number"
      );
    }
    assertNonNegativeInteger(
      result.candidate_review_item_count,
      "Scenario suite candidate review item count"
    );
    if (result.candidate_review_item_count < result.step_count) {
      throw new Error(
        "Scenario suite candidate review item count must be at least the step count"
      );
    }
  }
  assertOnlyFields(
    report.boundary_policy,
    SCENARIO_SUITE_BOUNDARY_POLICY_FIELDS,
    "scenario suite boundary policy"
  );
  for (const field of SCENARIO_SUITE_BOUNDARY_POLICY_FIELDS) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`Scenario suite boundary policy ${field} must be true`);
    }
  }
}

export async function createScenarioSuiteReport({
  scenarioDir = "scenarios",
} = {}) {
const files = readdirSync(scenarioDir)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => join(scenarioDir, name));

assert.ok(files.length > 0, "scenario suite requires at least one scenario file");

const results = [];
for (const file of files) {
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
  const scenario = loadScenarioFile(file);
  const result = await runScenario(runtime, scenario);
  assert.equal(result.schema, "iris_scenario_result_v1");
  assert.equal(result.step_count, scenario.steps.length);
  for (const step of result.results) {
    assert.equal(step.final_decision, "allow");
    assert.equal(step.review_required, false);
    assert.equal(typeof step.human_likeness_score, "number");
    assert.ok(step.human_likeness_score >= 0.75);
    assert.ok(step.candidate_review_count >= 1);
    assert.equal(typeof step.expression_profile_id, "string");
    assert.equal(Object.hasOwn(step, "input_action_candidate"), false);
    assert.equal(Object.hasOwn(step, "memory_carryover_candidates"), false);
  }
  results.push({
    file: toPublicScenarioFileName(file),
    name: result.name,
    step_count: result.step_count,
    response_languages: [
      ...new Set(result.results.map((step) => step.response_language).filter(Boolean)),
    ],
    tongue_twister_step_count: result.results.filter(
      (step) => step.tongue_twister_enabled === true
    ).length,
    min_human_likeness_score: Math.min(
      ...result.results.map((step) => step.human_likeness_score)
    ),
    candidate_review_item_count: runtime.candidateReviewStats().total_items,
  });
}

const report = {
  ok: true,
  schema: "iris_scenario_suite_report_v1",
  scenario_count: results.length,
  results,
  boundary_policy: {
    scenario_file_names_only: true,
    no_raw_step_payloads: true,
    no_text_payloads: true,
    no_memory_records: true,
    no_relationship_records: true,
    no_candidates: true,
    no_commands: true,
    no_raw_frames: true,
    no_raw_runtime_state: true,
  },
};

assertScenarioSuiteReportSafe(report);

return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await createScenarioSuiteReport({
    scenarioDir: process.argv[2] ?? "scenarios",
  });
  console.log(JSON.stringify(report, null, 2));
}
