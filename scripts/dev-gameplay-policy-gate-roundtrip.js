import assert from "node:assert/strict";
import {
  assertGameplayLaunchPlanSafe,
  createGameplayLaunchPlan,
} from "../src/services/dev/gameplayLaunchPlan.js";
import {
  assertGameplayPreflightReportSafe,
  createGameplayPreflightReport,
} from "../src/services/dev/gameplayPreflight.js";
import {
  assertGameplayRuntimeStatusReportSafe,
  createGameplayRuntimeStatusReport,
} from "../src/services/dev/gameplayRuntimeStatus.js";

const GAMEPLAY_POLICY_GATE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "preflight",
  "launch_plan",
  "runtime_status",
  "boundary_policy",
]);

const env = {
  ...process.env,
  IRIS_GAME_OBSERVATION_ENDPOINT: "https://example.com/vision/latest",
  IRIS_GAME_OBSERVATION_METHOD: "POST",
  IRIS_ENABLE_HTTP_INGEST_SCHEDULER: "true",
  IRIS_ENABLE_GAME_CONTROL: "true",
  IRIS_GAME_CONTROL_ADAPTER: "http",
  IRIS_GAME_CONTROL_ENDPOINT: "https://example.com/game-control",
  IRIS_AVAILABLE_GAME_ACTIONS: "wait,move_axis",
  IRIS_GAME_CONTROL_MIN_INTERVAL_MS: "250",
  IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS: "5000",
  IRIS_GAME_OBSERVATION_API_KEY: "secret-vision-key",
  IRIS_GAME_CONTROL_API_KEY: "secret-game-control-key",
};

const preflight = createGameplayPreflightReport({ env, generatedAtMs: 1000 });
assertGameplayPreflightReportSafe(preflight);
assert.equal(preflight.preflight_status, "blocked_by_configuration");
assert.equal(preflight.vision_target_policy_status, "attention");
assert.equal(preflight.game_control_target_policy_status, "attention");
assert.equal(preflight.missing_required_env.length, 0);
assert.equal(
  preflight.attention_reasons.includes("vision_target_policy_attention"),
  true
);
assert.equal(
  preflight.attention_reasons.includes("game_control_target_policy_attention"),
  true
);
assert.equal(preflight.next_attention_reason, "vision_target_policy_attention");

const launchPlan = createGameplayLaunchPlan({ env, generatedAtMs: 1000 });
assertGameplayLaunchPlanSafe(launchPlan);
const visionStep = launchPlan.launch_sequence.find(
  (step) => step.process_id === "game_vision_source_bridge"
);
const controlStep = launchPlan.launch_sequence.find(
  (step) => step.process_id === "game_control_adapter_gate"
);
assert.equal(launchPlan.plan_status, "configure_gameplay_env_first");
assert.equal(launchPlan.next_step_id, "game_vision_source_bridge");
assert.equal(visionStep.launch_readiness_status, "configuration_attention");
assert.equal(visionStep.vision_target_policy_status, "attention");
assert.equal(controlStep.launch_readiness_status, "configuration_attention");
assert.equal(controlStep.game_control_target_policy_status, "attention");
assert.equal(
  launchPlan.runtime_safe_control_verification.policy_gate_roundtrip_script,
  "npm run dev:gameplay:policy-gate-roundtrip"
);

const runtimeStatus = createGameplayRuntimeStatusReport({
  env,
  generatedAtMs: 1000,
});
assertGameplayRuntimeStatusReportSafe(runtimeStatus);
assert.equal(runtimeStatus.runtime_status, "attention_required");
assert.equal(runtimeStatus.preflight_status, "blocked_by_configuration");
assert.equal(
  runtimeStatus.preflight_next_attention_reason,
  "vision_target_policy_attention"
);
assert.equal(runtimeStatus.safe_control_flow.flow_status, "configuration_attention");
assert.equal(runtimeStatus.safe_control_flow.blocking_stage, "configuration");

const report = {
  ok: true,
  schema: "iris_gameplay_policy_gate_roundtrip_report_v1",
  preflight: {
    preflight_status: preflight.preflight_status,
    vision_target_policy_status: preflight.vision_target_policy_status,
    game_control_target_policy_status:
      preflight.game_control_target_policy_status,
    missing_required_env_count: preflight.missing_required_env.length,
    next_attention_reason: preflight.next_attention_reason,
  },
  launch_plan: {
    plan_status: launchPlan.plan_status,
    vision_step_status: visionStep.launch_readiness_status,
    control_step_status: controlStep.launch_readiness_status,
    next_step_id: launchPlan.next_step_id,
  },
  runtime_status: {
    runtime_status: runtimeStatus.runtime_status,
    preflight_status: runtimeStatus.preflight_status,
    safe_control_flow_status: runtimeStatus.safe_control_flow.flow_status,
    safe_control_blocking_stage: runtimeStatus.safe_control_flow.blocking_stage,
  },
  boundary_policy: {
    external_vision_target_blocked_before_polling: true,
    external_control_target_blocked_before_adapter: true,
    model_proposals_never_sent_to_adapter: true,
    env_names_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_raw_frames: true,
    no_ocr_text: true,
    no_action_candidates: true,
    no_approved_actions: true,
    no_commands: true,
  },
};
assertGameplayPolicyGateRoundtripReportSafe(report);
assertNoUnsafeReportLeak(report);
console.log(JSON.stringify(report, null, 2));

function assertGameplayPolicyGateRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("gameplay policy gate roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!GAMEPLAY_POLICY_GATE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`gameplay policy gate unexpected report field ${field}`);
    }
  }
  if (report.ok !== true || report.schema !== "iris_gameplay_policy_gate_roundtrip_report_v1") {
    throw new Error("gameplay policy gate status mismatch");
  }
  for (const field of [
    "external_vision_target_blocked_before_polling",
    "external_control_target_blocked_before_adapter",
    "model_proposals_never_sent_to_adapter",
    "env_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_raw_frames",
    "no_ocr_text",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`gameplay policy gate boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    "https://example.com",
    "vision/latest",
    "game-control",
    "secret-vision-key",
    "secret-game-control-key",
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"raw_frame"',
    '"ocr_text"',
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(
      `gameplay policy gate leaked unsafe fragment(s): ${leaked.join(", ")}`
    );
  }
}
