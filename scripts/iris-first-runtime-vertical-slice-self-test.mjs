#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  runFirstRuntimeVerticalSlice,
  validateFirstRuntimeVerticalSliceInput,
  validateFirstRuntimeVerticalSliceResult,
} from "../src/runtime/firstRuntimeVerticalSlice.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(
  ROOT,
  "docs/specs/IRIS_20240425/fixtures/runtime/iris_first_runtime_vertical_slice_fixture.jsonl"
);
const RUNTIME_SOURCE = path.join(ROOT, "src/runtime/firstRuntimeVerticalSlice.js");

function readFixtures() {
  return fs.readFileSync(FIXTURE, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function runRow(row) {
  return runFirstRuntimeVerticalSlice(row.input, {
    emergencyStopState: row.emergency_stop_state,
  });
}

function safeRow() {
  return readFixtures().find((row) => row.fixture_id === "first_runtime_safe_comment");
}

function emergencyRow() {
  return readFixtures().find((row) => row.fixture_id === "first_runtime_emergency_stop");
}

function clone(value) {
  return structuredClone(value);
}

function hasNoSideEffects(result) {
  return Object.values(result.operator_safe_trace?.side_effect_booleans || {}).every(
    (value) => value === false
  );
}

function test(name, fn) {
  try {
    return { name, status: fn() ? "pass" : "fail" };
  } catch {
    return { name, status: "fail" };
  }
}

function invalidInput(overrides) {
  const row = clone(safeRow());
  row.input = { ...row.input, ...overrides };
  return runRow(row);
}

function forbiddenFieldFails(field) {
  return invalidInput({ [field]: "unsafe" }).reason_code === "synthetic_input_invalid";
}

const cases = [
  test("fixture_safe_comment_passes", () => {
    const result = runRow(safeRow());
    return result.result_state === "pass" && result.reason_code === "safe_response_candidate_ready";
  }),
  test("fixture_emergency_stop_blocks_first", () => {
    const result = runRow(emergencyRow());
    return result.result_state === "blocked" && result.reason_code === "emergency_stop_active";
  }),
  test("emergency_stop_produces_no_candidates", () => {
    const result = runRow(emergencyRow());
    return !result.response_candidate && !result.voice_safe_summary && !result.avatar_safe_summary && !result.subtitle_safe_summary;
  }),
  test("emergency_stop_stages_remain_not_started", () => {
    const stages = runRow(emergencyRow()).operator_safe_trace.stage_statuses;
    return Object.entries(stages).every(([key, value]) => key === "emergency_stop" || value === "not_started");
  }),
  test("safe_comment_produces_response_candidate", () => !!runRow(safeRow()).response_candidate),
  test("safe_comment_produces_voice_summary", () => !!runRow(safeRow()).voice_safe_summary),
  test("safe_comment_produces_avatar_summary", () => !!runRow(safeRow()).avatar_safe_summary),
  test("safe_comment_produces_subtitle_summary", () => !!runRow(safeRow()).subtitle_safe_summary),
  test("safe_comment_produces_operator_safe_trace", () => !!runRow(safeRow()).operator_safe_trace),
  test("operator_trace_contains_no_generated_text", () => !JSON.stringify(runRow(safeRow()).operator_safe_trace).includes("来てくれて")),
  test("operator_trace_contains_no_input_summary", () => !JSON.stringify(runRow(safeRow()).operator_safe_trace).includes("viewer_greeting")),
  test("operator_trace_contains_no_private_id", () => !JSON.stringify(runRow(safeRow()).operator_safe_trace).includes("private")),
  test("all_side_effect_booleans_false", () => hasNoSideEffects(runRow(safeRow())) && hasNoSideEffects(runRow(emergencyRow()))),
  test("priority1_remains_blocked", () => runRow(safeRow()).priority1_status === "BLOCKED"),
  test("runtime_readiness_false", () => runRow(safeRow()).runtime_readiness_claimed === false),
  test("production_readiness_false", () => runRow(safeRow()).production_readiness_claimed === false),
  test("production_go_false", () => runRow(safeRow()).production_go_performed === false),
  test("moderation_muted_blocks_candidates", () => {
    const result = invalidInput({ moderation_status: "muted" });
    return result.result_state === "blocked" && result.reason_code === "moderation_personalization_blocked" && !result.response_candidate;
  }),
  test("moderation_blocked_blocks_candidates", () => {
    const result = invalidInput({ moderation_status: "blocked" });
    return result.result_state === "blocked" && result.reason_code === "moderation_personalization_blocked" && !result.response_candidate;
  }),
  test("unexpected_input_field_fails", () => invalidInput({ extra_field: "x" }).reason_code === "synthetic_input_invalid"),
  test("raw_text_field_fails", () => forbiddenFieldFails("raw_text")),
  test("private_viewer_id_field_fails", () => forbiddenFieldFails("private_viewer_id")),
  test("endpoint_field_fails", () => forbiddenFieldFails("endpoint")),
  test("token_field_fails", () => forbiddenFieldFails("token")),
  test("secret_field_fails", () => forbiddenFieldFails("secret")),
  test("non_synthetic_input_fails", () => invalidInput({ synthetic_only: false }).reason_code === "synthetic_input_invalid"),
  test("priority1_non_blocked_input_fails", () => invalidInput({ priority1_status: "READY" }).reason_code === "synthetic_input_invalid"),
  test("missing_emergency_stop_state_blocks", () => {
    const row = clone(safeRow());
    return runFirstRuntimeVerticalSlice(row.input).reason_code === "emergency_stop_state_invalid";
  }),
  test("invalid_emergency_stop_state_blocks", () => {
    const row = clone(safeRow());
    return runFirstRuntimeVerticalSlice(row.input, { emergencyStopState: { active: "false" } }).reason_code === "emergency_stop_state_invalid";
  }),
  test("unknown_comment_kind_fails", () => invalidInput({ comment_kind: "other" }).reason_code === "synthetic_input_invalid"),
  test("same_input_is_deterministic", () => JSON.stringify(runRow(safeRow())) === JSON.stringify(runRow(safeRow()))),
  test("fixture_expected_values_do_not_enter_runtime", () => {
    const row = clone(safeRow());
    row.expected = { result_state: "fail", reason_code: "oracle_must_not_apply" };
    const result = runFirstRuntimeVerticalSlice(row.input, { emergencyStopState: row.emergency_stop_state });
    return result.result_state === "pass" && result.reason_code === "safe_response_candidate_ready";
  }),
  test("validate_input_accepts_fixture_input", () => validateFirstRuntimeVerticalSliceInput(safeRow().input).status === "pass"),
  test("validate_result_accepts_safe_result", () => validateFirstRuntimeVerticalSliceResult(runRow(safeRow())).status === "pass"),
  test("no_external_capability_imports", () => {
    const source = fs.readFileSync(RUNTIME_SOURCE, "utf8");
    return !/(node:http|node:https|node:net|node:dgram|node:child_process|worker_threads|\bfetch\b|WebSocket|createConnection|spawn|execFile|\bexec\b|\bfork\b|writeFile|appendFile|createWriteStream|database client|YouTube client|OBS client|TTS engine client|Live2D renderer client|Game Adapter)/.test(source);
  }),
];

const failures = cases.filter((item) => item.status !== "pass");

if (failures.length) {
  console.log(JSON.stringify({
    ok: false,
    selfTestStatus: "fail",
    failureCount: failures.length,
    failures,
    rawLogsRead: false,
    rawDiffRead: false,
    priority1Status: "BLOCKED",
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  selfTestStatus: "pass",
  casesRun: cases.length,
  rawLogsRead: false,
  rawDiffRead: false,
  priority1Status: "BLOCKED",
}, null, 2));
