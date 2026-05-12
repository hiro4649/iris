import assert from "node:assert/strict";
import {
  assertYouTubeIngestLaunchPlanSafe,
  createYouTubeIngestLaunchPlan,
} from "../src/services/dev/youtubeIngestLaunchPlan.js";
import {
  assertYouTubeIngestPreflightReportSafe,
  createYouTubeIngestPreflightReport,
} from "../src/services/dev/youtubeIngestPreflight.js";
import {
  assertYouTubeIngestRuntimeStatusReportSafe,
  createYouTubeIngestRuntimeStatusReport,
} from "../src/services/dev/youtubeIngestRuntimeStatus.js";

const YOUTUBE_POLICY_GATE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "preflight",
  "launch_plan",
  "runtime_status",
  "boundary_policy",
]);

const env = {
  ...process.env,
  IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT: "https://example.com/live-chat",
  IRIS_YOUTUBE_LIVE_CHAT_API_KEY: "youtube-policy-secret",
  IRIS_ENABLE_HTTP_INGEST_SCHEDULER: "true",
};

const preflight = createYouTubeIngestPreflightReport({ env, generatedAtMs: 1000 });
assertYouTubeIngestPreflightReportSafe(preflight);
assert.equal(preflight.preflight_status, "blocked_by_configuration");
assert.equal(preflight.source_mode, "http_relay");
assert.equal(preflight.local_target_policy_status, "attention");
assert.equal(preflight.missing_required_env.length, 0);
assert.equal(
  preflight.attention_reasons.includes("local_target_policy_attention"),
  true
);

const launchPlan = createYouTubeIngestLaunchPlan({ env, generatedAtMs: 1000 });
assertYouTubeIngestLaunchPlanSafe(launchPlan);
const targetStep = launchPlan.launch_sequence.find(
  (step) => step.process_id === "youtube_upstream_target"
);
assert.equal(launchPlan.plan_status, "configure_youtube_ingest_env_first");
assert.equal(targetStep.launch_readiness_status, "configuration_attention");
assert.equal(targetStep.local_target_policy_status, "attention");
assert.equal(launchPlan.next_step_id, "youtube_upstream_target");

const runtimeStatus = createYouTubeIngestRuntimeStatusReport({
  env,
  httpIngestScheduler: null,
  streamState: null,
  generatedAtMs: 1000,
});
assertYouTubeIngestRuntimeStatusReportSafe(runtimeStatus);
assert.equal(runtimeStatus.runtime_status, "attention_required");
assert.equal(runtimeStatus.preflight_status, "blocked_by_configuration");
assert.equal(runtimeStatus.api_cursor_auth_flow.flow_status, "configuration_attention");
assert.equal(runtimeStatus.api_cursor_auth_flow.blocking_stage, "configuration");
assert.equal(runtimeStatus.poll_flow.flow_status, "configuration_attention");
assert.equal(runtimeStatus.poll_flow.blocking_stage, "configuration");

const report = {
  ok: true,
  schema: "iris_youtube_policy_gate_roundtrip_report_v1",
  preflight: {
    preflight_status: preflight.preflight_status,
    source_mode: preflight.source_mode,
    local_target_policy_status: preflight.local_target_policy_status,
    missing_required_env_count: preflight.missing_required_env.length,
    next_attention_reason: preflight.next_attention_reason,
  },
  launch_plan: {
    plan_status: launchPlan.plan_status,
    target_step_status: targetStep.launch_readiness_status,
    local_target_policy_status: targetStep.local_target_policy_status,
    next_step_id: launchPlan.next_step_id,
  },
  runtime_status: {
    runtime_status: runtimeStatus.runtime_status,
    preflight_status: runtimeStatus.preflight_status,
    api_cursor_auth_flow_status: runtimeStatus.api_cursor_auth_flow.flow_status,
    api_cursor_auth_flow_blocking_stage:
      runtimeStatus.api_cursor_auth_flow.blocking_stage,
    poll_flow_status: runtimeStatus.poll_flow.flow_status,
    poll_flow_blocking_stage: runtimeStatus.poll_flow.blocking_stage,
  },
  boundary_policy: {
    external_relay_blocked_before_polling: true,
    env_names_only: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_live_payloads: true,
    no_support_message_text: true,
    no_candidates: true,
    no_commands: true,
  },
};
assertYouTubePolicyGateRoundtripReportSafe(report);
assertNoUnsafeReportLeak(report);
console.log(JSON.stringify(report, null, 2));

function assertYouTubePolicyGateRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("youtube policy gate roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!YOUTUBE_POLICY_GATE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`youtube policy gate unexpected report field ${field}`);
    }
  }
  if (report.ok !== true || report.schema !== "iris_youtube_policy_gate_roundtrip_report_v1") {
    throw new Error("youtube policy gate status mismatch");
  }
  for (const field of [
    "external_relay_blocked_before_polling",
    "env_names_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_live_payloads",
    "no_support_message_text",
    "no_candidates",
    "no_commands",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`youtube policy gate boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    "https://example.com",
    "youtube-policy-secret",
    "live-chat",
    '"endpoint"',
    '"url"',
    '"payload"',
    '"text"',
    '"event_id"',
    '"trace_id"',
    '"input_action_candidate"',
    '"approved_memory_record"',
    '"approved_relationship_record"',
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`youtube policy gate leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
