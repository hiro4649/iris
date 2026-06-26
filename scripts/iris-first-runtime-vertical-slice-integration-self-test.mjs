#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { runFirstRuntimeVerticalSlice } from "../src/runtime/firstRuntimeVerticalSlice.js";

const FIXTURE_PATH =
  "docs/specs/IRIS_20240425/fixtures/runtime/iris_first_runtime_vertical_slice_fixture.jsonl";
const REQUIRED_CASE_COUNT = 50;
const DISABLED_ENVELOPE = {
  schema_version: "iris_first_runtime_vertical_slice_dispatch_v1",
  dispatch_status: "blocked",
  reason_code: "first_runtime_vertical_slice_disabled",
  result: null,
  runtime_readiness_claimed: false,
  production_readiness_claimed: false,
  production_go_performed: false,
  priority1_status: "BLOCKED",
};
const FORBIDDEN_WRAPPER_KEYS = [
  "safe_comment_summary",
  "final_text",
  "endpoint",
  "url",
  "token",
  "secret",
  "password",
  "command",
  "candidate_payload",
  "adapter",
  "store",
  "queue",
  "replay",
  "logger",
];
const FORBIDDEN_METHOD_TERMS = [
  "processEvent",
  "processNext",
  "runCommentPipeline",
  "eventQueue",
  "activeTtsAdapter",
  "activeLive2dAdapter",
  "activeSubtitleAdapter",
  "activeGameControlAdapter",
  "activeMemorySearchAdapter",
  "memoryStore",
  "relationshipStore",
  "candidateReviewQueue",
  "replayLog",
  "logger",
  "fetch",
  "http",
  "https",
  "WebSocket",
  "readFile",
  "writeFile",
  "spawn",
  "exec",
  "process.env",
];

function readFixtures() {
  return fs
    .readFileSync(FIXTURE_PATH, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function poisonCounters() {
  return {
    eventQueuePush: 0,
    eventQueueShift: 0,
    eventQueueSize: 0,
    ttsAdapter: 0,
    live2dAdapter: 0,
    subtitleAdapter: 0,
    gameControlAdapter: 0,
    memorySearchAdapter: 0,
    memoryStoreRead: 0,
    memoryStoreWrite: 0,
    relationshipStoreRead: 0,
    relationshipStoreWrite: 0,
    candidateReviewQueue: 0,
    replayLog: 0,
    logger: 0,
  };
}

function poison(label, counters, key) {
  return () => {
    counters[key] += 1;
    throw new Error(`poison_capability_called:${label}`);
  };
}

function adapter(label, counters, key) {
  const fn = poison(label, counters, key);
  fn.adapterKind = label;
  return fn;
}

function runtime({ enabled, counters = poisonCounters() } = {}) {
  return {
    instance: createIrisRuntime({
      runtimeConfig: {
        environment: {},
        enableSyntheticFirstRuntimeVerticalSlice: enabled,
        enablePersistence: false,
        enableCandidatePersistence: false,
        enableRelationshipMemory: false,
        enableReplayLog: false,
        enableGameControl: false,
        candidateReviewQueue: {
          list: poison("candidate_review_list", counters, "candidateReviewQueue"),
          stats: poison("candidate_review_stats", counters, "candidateReviewQueue"),
          clear: poison("candidate_review_clear", counters, "candidateReviewQueue"),
        },
        memoryStore: {
          readRecords: poison("memory_store_read", counters, "memoryStoreRead"),
          writeRecord: poison("memory_store_write", counters, "memoryStoreWrite"),
        },
        relationshipStore: {
          readProfiles: poison("relationship_store_read", counters, "relationshipStoreRead"),
          writeProfile: poison("relationship_store_write", counters, "relationshipStoreWrite"),
        },
        replayLog: {
          appendRuntimeResult: poison("replay_append", counters, "replayLog"),
          readEntries: poison("replay_read", counters, "replayLog"),
        },
      },
      eventQueue: {
        push: poison("event_queue_push", counters, "eventQueuePush"),
        shift: poison("event_queue_shift", counters, "eventQueueShift"),
        size: poison("event_queue_size", counters, "eventQueueSize"),
        drain: poison("event_queue_drain", counters, "eventQueueShift"),
      },
      ttsAdapter: adapter("synthetic_poison_tts", counters, "ttsAdapter"),
      live2dAdapter: adapter("synthetic_poison_live2d", counters, "live2dAdapter"),
      subtitleAdapter: adapter("synthetic_poison_subtitle", counters, "subtitleAdapter"),
      gameControlAdapter: adapter("synthetic_poison_game_control", counters, "gameControlAdapter"),
      memorySearchAdapter: adapter("synthetic_poison_memory_search", counters, "memorySearchAdapter"),
      logger: {
        info: poison("logger_info", counters, "logger"),
        warn: poison("logger_warn", counters, "logger"),
        error: poison("logger_error", counters, "logger"),
      },
    }),
    counters,
  };
}

function exactKeys(value, expected) {
  assert.deepEqual(Object.keys(value).sort(), Object.keys(expected).sort());
}

function directResult(row) {
  return runFirstRuntimeVerticalSlice(row.input, {
    emergencyStopState: row.emergency_stop_state,
  });
}

function dispatch(row, enabled = true) {
  return runtime({ enabled }).instance.processSyntheticFirstRuntimeVerticalSlice(row.input, {
    emergencyStopState: row.emergency_stop_state,
  });
}

function assertNoPoison(counters) {
  for (const [key, value] of Object.entries(counters)) {
    assert.equal(value, 0, key);
  }
}

function assertAllFalse(value, label) {
  assert.equal(Boolean(value) && typeof value === "object" && !Array.isArray(value), true, label);
  const entries = Object.entries(value);
  assert.notEqual(entries.length, 0, `${label}:empty`);
  for (const [key, item] of entries) {
    assert.equal(item, false, `${label}:${key}`);
  }
}

function methodSource() {
  const instance = runtime({ enabled: true }).instance;
  const method = instance.processSyntheticFirstRuntimeVerticalSlice;
  assert.equal(typeof method, "function");
  const source = Function.prototype.toString.call(method);
  assert.equal(source.includes("runFirstRuntimeVerticalSlice"), true);
  assert.equal(source.includes("first_runtime_vertical_slice_disabled"), true);
  assert.equal(source.includes("first_runtime_vertical_slice_dispatched"), true);
  return source;
}

function test(name, fn) {
  try {
    fn();
    return { name, status: "pass" };
  } catch {
    return { name, status: "fail" };
  }
}

const rows = readFixtures();
const safeRow = rows.find((row) => row.fixture_id === "first_runtime_safe_comment");
const emergencyRow = rows.find((row) => row.fixture_id === "first_runtime_emergency_stop");

const cases = [
  test("runtime_registration_method_exists", () => {
    assert.equal(typeof runtime({ enabled: true }).instance.processSyntheticFirstRuntimeVerticalSlice, "function");
  }),
  test("runtime_registration_method_source_contains_full_body", () => {
    const source = methodSource();
    assert.equal(source.includes("runFirstRuntimeVerticalSlice"), true);
    assert.equal(source.includes("first_runtime_vertical_slice_disabled"), true);
    assert.equal(source.includes("first_runtime_vertical_slice_dispatched"), true);
  }),
  test("runtime_registration_disabled_when_flag_missing", () => {
    assert.deepEqual(runtime().instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input), DISABLED_ENVELOPE);
  }),
  test("runtime_registration_disabled_when_flag_false", () => {
    assert.deepEqual(runtime({ enabled: false }).instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input), DISABLED_ENVELOPE);
  }),
  test("runtime_registration_disabled_when_flag_null", () => {
    assert.deepEqual(runtime({ enabled: null }).instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input), DISABLED_ENVELOPE);
  }),
  test("runtime_registration_disabled_when_flag_string_true", () => {
    assert.deepEqual(runtime({ enabled: "true" }).instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input), DISABLED_ENVELOPE);
  }),
  test("runtime_registration_disabled_when_flag_number_one", () => {
    assert.deepEqual(runtime({ enabled: 1 }).instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input), DISABLED_ENVELOPE);
  }),
  test("runtime_registration_disabled_when_flag_object", () => {
    assert.deepEqual(runtime({ enabled: {} }).instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input), DISABLED_ENVELOPE);
  }),
  test("runtime_registration_disabled_when_flag_array", () => {
    assert.deepEqual(runtime({ enabled: [] }).instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input), DISABLED_ENVELOPE);
  }),
  test("runtime_registration_enabled_only_when_boolean_true", () => {
    assert.equal(dispatch(safeRow, true).dispatch_status, "pass");
  }),
  test("runtime_registration_safe_fixture_passes", () => {
    assert.equal(dispatch(safeRow).result.result_state, "pass");
  }),
  test("runtime_registration_emergency_stop_blocks", () => {
    assert.equal(dispatch(emergencyRow).result.result_state, "blocked");
  }),
  test("runtime_registration_emergency_stop_produces_no_candidates", () => {
    assert.equal(dispatch(emergencyRow).result.operator_safe_trace.candidate_presence_booleans.response_candidate_present, false);
  }),
  test("runtime_registration_disabled_envelope_exact_fields", () => {
    exactKeys(DISABLED_ENVELOPE, runtime().instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input));
  }),
  test("runtime_registration_enabled_envelope_exact_fields", () => {
    exactKeys(dispatch(safeRow), {
      schema_version: "",
      dispatch_status: "",
      reason_code: "",
      result: null,
      runtime_readiness_claimed: false,
      production_readiness_claimed: false,
      production_go_performed: false,
      priority1_status: "",
    });
  }),
  test("runtime_registration_enabled_envelope_values_exact", () => {
    const wrapper = dispatch(safeRow);
    assert.equal(wrapper.schema_version, "iris_first_runtime_vertical_slice_dispatch_v1");
    assert.equal(wrapper.dispatch_status, "pass");
    assert.equal(wrapper.reason_code, "first_runtime_vertical_slice_dispatched");
    assert.equal(wrapper.runtime_readiness_claimed, false);
    assert.equal(wrapper.production_readiness_claimed, false);
    assert.equal(wrapper.production_go_performed, false);
    assert.equal(wrapper.priority1_status, "BLOCKED");
  }),
  test("runtime_registration_disabled_result_is_null", () => {
    assert.equal(runtime().instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input).result, null);
  }),
  test("runtime_registration_enabled_result_matches_direct_slice", () => {
    assert.deepEqual(dispatch(safeRow).result, directResult(safeRow));
  }),
  test("runtime_registration_emergency_result_matches_direct_slice", () => {
    assert.deepEqual(dispatch(emergencyRow).result, directResult(emergencyRow));
  }),
  ...[
    ["runtime_registration_does_not_call_tts_adapter", "ttsAdapter"],
    ["runtime_registration_does_not_call_live2d_adapter", "live2dAdapter"],
    ["runtime_registration_does_not_call_subtitle_adapter", "subtitleAdapter"],
    ["runtime_registration_does_not_call_game_adapter", "gameControlAdapter"],
    ["runtime_registration_does_not_call_memory_search_adapter", "memorySearchAdapter"],
    ["runtime_registration_does_not_read_memory_store", "memoryStoreRead"],
    ["runtime_registration_does_not_write_memory_store", "memoryStoreWrite"],
    ["runtime_registration_does_not_read_relationship_store", "relationshipStoreRead"],
    ["runtime_registration_does_not_write_relationship_store", "relationshipStoreWrite"],
    ["runtime_registration_does_not_use_candidate_review_queue", "candidateReviewQueue"],
    ["runtime_registration_does_not_write_replay_log", "replayLog"],
    ["runtime_registration_does_not_use_logger", "logger"],
    ["runtime_registration_does_not_push_event_queue", "eventQueuePush"],
    ["runtime_registration_does_not_shift_event_queue", "eventQueueShift"],
    ["runtime_registration_does_not_read_queue_size", "eventQueueSize"],
  ].map(([name, key]) => test(name, () => {
    const counters = poisonCounters();
    runtime({ enabled: true, counters }).instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input, {
      emergencyStopState: safeRow.emergency_stop_state,
    });
    assert.equal(counters[key], 0);
  })),
  test("runtime_registration_preserves_priority1_blocked", () => {
    assert.equal(dispatch(safeRow).priority1_status, "BLOCKED");
    assert.equal(dispatch(safeRow).result.priority1_status, "BLOCKED");
  }),
  test("runtime_registration_claims_no_runtime_readiness", () => {
    assert.equal(dispatch(safeRow).runtime_readiness_claimed, false);
  }),
  test("runtime_registration_claims_no_production_readiness", () => {
    assert.equal(dispatch(safeRow).production_readiness_claimed, false);
  }),
  test("runtime_registration_performs_no_production_go", () => {
    assert.equal(dispatch(safeRow).production_go_performed, false);
  }),
  test("runtime_registration_is_deterministic", () => {
    assert.deepEqual(dispatch(safeRow), dispatch(safeRow));
  }),
  test("runtime_registration_wrapper_contains_no_raw_input", () => {
    const wrapper = dispatch(safeRow);
    assert.equal(Object.hasOwn(wrapper, "input"), false);
    assert.equal(Object.hasOwn(wrapper, "safe_comment_summary"), false);
    assert.equal(Object.hasOwn(wrapper, "raw_text"), false);
  }),
  test("runtime_registration_wrapper_contains_no_top_level_response_text", () => {
    assert.equal(Object.hasOwn(dispatch(safeRow), "final_text"), false);
  }),
  test("runtime_registration_wrapper_contains_no_endpoint_token_secret", () => {
    const wrapper = dispatch(safeRow);
    for (const key of FORBIDDEN_WRAPPER_KEYS) assert.equal(Object.hasOwn(wrapper, key), false, key);
  }),
  test("runtime_registration_source_does_not_call_process_event", () => {
    assert.equal(methodSource().includes("processEvent"), false);
  }),
  test("runtime_registration_source_does_not_call_process_next", () => {
    assert.equal(methodSource().includes("processNext"), false);
  }),
  test("runtime_registration_method_source_isolated", () => {
    const source = methodSource();
    for (const term of FORBIDDEN_METHOD_TERMS) assert.equal(source.includes(term), false, term);
  }),
  test("runtime_registration_no_poison_capability_touched", () => {
    const counters = poisonCounters();
    runtime({ enabled: true, counters }).instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input, {
      emergencyStopState: safeRow.emergency_stop_state,
    });
    assertNoPoison(counters);
  }),
  test("runtime_registration_disabled_path_touches_no_capability", () => {
    const counters = poisonCounters();
    const result = runtime({ enabled: false, counters }).instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input, {
      emergencyStopState: safeRow.emergency_stop_state,
    });
    assert.deepEqual(result, DISABLED_ENVELOPE);
    assertNoPoison(counters);
  }),
  test("runtime_registration_disabled_path_does_not_dispatch_invalid_input", () => {
    const counters = poisonCounters();
    const result = runtime({ enabled: false, counters }).instance.processSyntheticFirstRuntimeVerticalSlice(null);
    assert.deepEqual(result, DISABLED_ENVELOPE);
    assertNoPoison(counters);
  }),
  test("runtime_registration_missing_emergency_stop_blocks", () => {
    const counters = poisonCounters();
    const { instance } = runtime({ enabled: true, counters });
    const result = instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input);
    assert.equal(result.dispatch_status, "pass");
    assert.equal(result.reason_code, "first_runtime_vertical_slice_dispatched");
    assert.equal(result.result.result_state, "blocked");
    assert.equal(result.result.reason_code, "emergency_stop_state_invalid");
    assertAllFalse(
      result.result.operator_safe_trace.candidate_presence_booleans,
      "missing_stop_candidate_presence"
    );
    assertAllFalse(
      result.result.operator_safe_trace.side_effect_booleans,
      "missing_stop_side_effects"
    );
    assertNoPoison(counters);
  }),
  test("runtime_registration_invalid_emergency_stop_blocks", () => {
    const counters = poisonCounters();
    const { instance } = runtime({ enabled: true, counters });
    const result = instance.processSyntheticFirstRuntimeVerticalSlice(safeRow.input, {
      emergencyStopState: { active: false, unexpected: true },
    });
    assert.equal(result.dispatch_status, "pass");
    assert.equal(result.reason_code, "first_runtime_vertical_slice_dispatched");
    assert.equal(result.result.result_state, "blocked");
    assert.equal(result.result.reason_code, "emergency_stop_state_invalid");
    assertAllFalse(
      result.result.operator_safe_trace.candidate_presence_booleans,
      "invalid_stop_candidate_presence"
    );
    assertAllFalse(
      result.result.operator_safe_trace.side_effect_booleans,
      "invalid_stop_side_effects"
    );
    assertNoPoison(counters);
  }),
];

if (cases.length < REQUIRED_CASE_COUNT) {
  console.log(JSON.stringify({
    ok: false,
    selfTestStatus: "fail",
    failureCount: 1,
    failures: ["required_case_count_floor_not_met"],
    casesRun: cases.length,
    requiredCaseCount: REQUIRED_CASE_COUNT,
    priority1Status: "BLOCKED",
    rawLogsRead: false,
    rawDiffRead: false,
  }, null, 2));
  process.exit(1);
}

const failures = cases.filter((item) => item.status !== "pass");
if (failures.length) {
  console.log(JSON.stringify({
    ok: false,
    selfTestStatus: "fail",
    failureCount: failures.length,
    failures: failures.slice(0, 20).map((item) => item.name),
    casesRun: cases.length,
    requiredCaseCount: REQUIRED_CASE_COUNT,
    priority1Status: "BLOCKED",
    rawLogsRead: false,
    rawDiffRead: false,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  selfTestStatus: "pass",
  casesRun: cases.length,
  requiredCaseCount: REQUIRED_CASE_COUNT,
  priority1Status: "BLOCKED",
  runtimeReadinessClaimed: false,
  productionReadinessClaimed: false,
  productionGoPerformed: false,
  rawLogsRead: false,
  rawDiffRead: false,
}, null, 2));
