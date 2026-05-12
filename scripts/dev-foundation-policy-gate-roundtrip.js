import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertFoundationLaunchPlanSafe,
  createFoundationLaunchPlan,
} from "../src/services/dev/foundationLaunchPlan.js";
import {
  assertFoundationPreflightReportSafe,
  createFoundationPreflightReport,
} from "../src/services/dev/foundationPreflight.js";
import {
  assertFoundationRuntimeStatusReportSafe,
  createFoundationRuntimeStatusReport,
} from "../src/services/dev/foundationRuntimeStatus.js";
import {
  assertFoundationStatusReportSafe,
  createFoundationStatusReport,
} from "../src/services/dev/foundationStatus.js";

const FOUNDATION_POLICY_GATE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "preflight",
  "launch_plan",
  "foundation_status",
  "runtime_status",
  "boundary_policy",
]);

const tempDir = mkdtempSync(join(tmpdir(), "iris-foundation-policy-gate-"));
const outboxDir = join(tempDir, "outbox");
const artifactDir = join(tempDir, "artifacts");

const env = {
  ...process.env,
  IRIS_TTS_ADAPTER: "http",
  IRIS_TTS_ENDPOINT: "https://example.com/unsafe-tts",
  IRIS_LIVE2D_ADAPTER: "http",
  IRIS_LIVE2D_ENDPOINT: "http://127.0.0.1:9100/live2d",
  IRIS_SUBTITLE_ADAPTER: "http",
  IRIS_SUBTITLE_ENDPOINT: "http://127.0.0.1:9100/subtitle",
  IRIS_LOCAL_BRIDGE_OUTBOX_DIR: outboxDir,
  IRIS_LOCAL_BRIDGE_ARTIFACT_DIR: artifactDir,
  IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS: "60000",
  IRIS_LOCAL_TTS_ENGINE_ENDPOINT: "http://127.0.0.1:9101/tts-engine",
  IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT: "http://127.0.0.1:9101/health",
  IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT: "http://127.0.0.1:9102/live2d-engine",
  IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT: "http://127.0.0.1:9102/health",
  IRIS_HTTP_ORIGIN: "http://127.0.0.1:8787",
  IRIS_OBS_SOURCE_WIDTH: "1280",
  IRIS_OBS_SOURCE_HEIGHT: "720",
  IRIS_OBS_SOURCE_FPS: "30",
};

try {
  const preflight = createFoundationPreflightReport({
    env,
    generatedAtMs: 1000,
  });
  assertFoundationPreflightReportSafe(preflight);
  assert.equal(preflight.preflight_status, "blocked_by_configuration");
  assert.equal(preflight.ready_step_count, 6);
  assert.equal(preflight.attention_step_count, 0);
  assert.equal(preflight.next_step, null);
  assert.equal(preflight.target_policy_attention, true);
  assert.equal(
    preflight.foundation_status_summary.next_attention_reason,
    "local_target_policy_attention"
  );
  assert.equal(
    preflight.foundation_status_summary.local_target_policy_attention,
    true
  );

  const launchPlan = createFoundationLaunchPlan({ env, generatedAtMs: 1000 });
  assertFoundationLaunchPlanSafe(launchPlan);
  const runtimeServerStep = launchPlan.launch_sequence.find(
    (step) => step.process_id === "iris_dev_server"
  );
  assert.equal(runtimeServerStep.launch_readiness_status, "configuration_attention");
  assert.equal(runtimeServerStep.tts_bridge_target_policy_status, "attention");

  const foundationStatus = createFoundationStatusReport({ env, generatedAtMs: 1000 });
  assertFoundationStatusReportSafe(foundationStatus);
  assert.equal(foundationStatus.foundation_readiness_status, "attention_required");
  assert.equal(
    foundationStatus.foundation_summary.local_target_policy_attention,
    true
  );
  assert.equal(
    foundationStatus.foundation_summary.next_attention_reason,
    "local_target_policy_attention"
  );

  const runtimeStatus = createFoundationRuntimeStatusReport({
    env,
    generatedAtMs: 1000,
  });
  assertFoundationRuntimeStatusReportSafe(runtimeStatus);
  assert.equal(runtimeStatus.runtime_status, "attention_required");
  assert.equal(
    runtimeStatus.foundation_next_attention_reason,
    "local_target_policy_attention"
  );
  assert.equal(
    runtimeStatus.runtime_summary.next_runtime_attention,
    "local_target_policy_attention"
  );
  assert.equal(runtimeStatus.runtime_summary.foundation_ready, false);

  const report = {
    ok: true,
    schema: "iris_foundation_policy_gate_roundtrip_report_v1",
    preflight: {
      preflight_status: preflight.preflight_status,
      ready_step_count: preflight.ready_step_count,
      attention_step_count: preflight.attention_step_count,
      target_policy_attention: preflight.target_policy_attention,
      next_attention_reason:
        preflight.foundation_status_summary.next_attention_reason,
    },
    launch_plan: {
      plan_status: launchPlan.plan_status,
      runtime_server_launch_status:
        runtimeServerStep.launch_readiness_status,
      tts_bridge_target_policy_status:
        runtimeServerStep.tts_bridge_target_policy_status,
      attention_step_count: launchPlan.attention_step_count,
      next_step_id: launchPlan.next_step_id,
    },
    foundation_status: {
      foundation_readiness_status: foundationStatus.foundation_readiness_status,
      local_target_policy_attention:
        foundationStatus.foundation_summary.local_target_policy_attention,
      attention_reason_count:
        foundationStatus.foundation_summary.attention_reason_count,
      next_attention_reason:
        foundationStatus.foundation_summary.next_attention_reason,
    },
    runtime_status: {
      runtime_status: runtimeStatus.runtime_status,
      foundation_next_attention_reason:
        runtimeStatus.foundation_next_attention_reason,
      next_runtime_attention:
        runtimeStatus.runtime_summary.next_runtime_attention,
      foundation_ready: runtimeStatus.runtime_summary.foundation_ready,
    },
    boundary_policy: {
      external_targets_block_foundation_start: true,
      external_targets_block_runtime_status_handoff: true,
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_paths: true,
    },
  };
  assertFoundationPolicyGateRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report);
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function assertFoundationPolicyGateRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("foundation policy gate roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!FOUNDATION_POLICY_GATE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`foundation policy gate unexpected report field ${field}`);
    }
  }
  if (report.ok !== true || report.schema !== "iris_foundation_policy_gate_roundtrip_report_v1") {
    throw new Error("foundation policy gate status mismatch");
  }
  for (const field of [
    "external_targets_block_foundation_start",
    "external_targets_block_runtime_status_handoff",
    "env_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_payloads",
    "no_candidates",
    "no_commands",
    "no_paths",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`foundation policy gate boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    "https://example.com",
    "http://127.0.0.1",
    tempDir,
    outboxDir,
    artifactDir,
    "unsafe-tts",
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"approved_memory_record"',
    '"approved_relationship_record"',
    "token-value",
    "secret-value",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(
      `foundation policy gate leaked unsafe fragment(s): ${leaked.join(", ")}`
    );
  }
}
