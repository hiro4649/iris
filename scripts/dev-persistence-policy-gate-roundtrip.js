import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertPersistenceLaunchPlanSafe,
  createPersistenceLaunchPlan,
} from "../src/services/dev/persistenceLaunchPlan.js";
import {
  assertPersistencePreflightReportSafe,
  createPersistencePreflightReport,
} from "../src/services/dev/persistencePreflight.js";
import {
  assertPersistenceRuntimeStatusReportSafe,
  createPersistenceRuntimeStatusReport,
} from "../src/services/dev/persistenceRuntimeStatus.js";

const PERSISTENCE_POLICY_GATE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "preflight",
  "launch_plan",
  "runtime_status",
  "boundary_policy",
]);

const tempDir = mkdtempSync(join(tmpdir(), "iris-persistence-policy-gate-"));
const memoryStorePath = join(tempDir, "memory.json");
const relationshipStorePath = join(tempDir, "relationships.json");

const env = {
  ...process.env,
  IRIS_MEMORY_STORE_PATH: memoryStorePath,
  IRIS_RELATIONSHIP_STORE_PATH: relationshipStorePath,
  IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
  IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
  IRIS_MEMORY_SEARCH_ADAPTER: "http_vector",
  IRIS_MEMORY_SEARCH_ENDPOINT: "https://example.com/memory-search",
  IRIS_MEMORY_SEARCH_API_KEY: "secret-vector-memory",
};

try {
  const preflight = createPersistencePreflightReport({ env, generatedAtMs: 1000 });
  assertPersistencePreflightReportSafe(preflight);
  assert.equal(preflight.preflight_status, "blocked_by_configuration");
  assert.equal(preflight.json_store_status, "ready");
  assert.equal(preflight.vector_memory_status, "attention");
  assert.equal(preflight.vector_memory_target_policy_status, "attention");
  assert.equal(preflight.missing_required_env.length, 0);
  assert.equal(
    preflight.attention_reasons.includes("vector_memory_target_policy_attention"),
    true
  );
  assert.equal(preflight.next_attention_reason, "vector_memory_target_policy_attention");

  const launchPlan = createPersistenceLaunchPlan({ env, generatedAtMs: 1000 });
  assertPersistenceLaunchPlanSafe(launchPlan);
  const vectorStep = launchPlan.launch_sequence.find(
    (step) => step.process_id === "vector_memory_search_bridge"
  );
  assert.equal(launchPlan.plan_status, "configure_persistence_env_first");
  assert.equal(launchPlan.next_step_id, "vector_memory_search_bridge");
  assert.equal(vectorStep.launch_readiness_status, "configuration_attention");
  assert.equal(vectorStep.vector_memory_target_policy_status, "attention");
  assert.equal(
    launchPlan.runtime_persistence_verification.policy_gate_roundtrip_script,
    "npm run dev:persistence:policy-gate-roundtrip"
  );

  const runtimeStatus = createPersistenceRuntimeStatusReport({
    env,
    generatedAtMs: 1000,
  });
  assertPersistenceRuntimeStatusReportSafe(runtimeStatus);
  assert.equal(runtimeStatus.runtime_status, "attention_required");
  assert.equal(runtimeStatus.preflight_status, "blocked_by_configuration");
  assert.equal(
    runtimeStatus.preflight_next_attention_reason,
    "vector_memory_target_policy_attention"
  );
  assert.equal(runtimeStatus.vector_memory_target_policy_status, "attention");
  assert.equal(runtimeStatus.persistence_status_available, false);

  const report = {
    ok: true,
    schema: "iris_persistence_policy_gate_roundtrip_report_v1",
    preflight: {
      preflight_status: preflight.preflight_status,
      json_store_status: preflight.json_store_status,
      vector_memory_status: preflight.vector_memory_status,
      vector_memory_target_policy_status:
        preflight.vector_memory_target_policy_status,
      missing_required_env_count: preflight.missing_required_env.length,
      next_attention_reason: preflight.next_attention_reason,
    },
    launch_plan: {
      plan_status: launchPlan.plan_status,
      vector_step_status: vectorStep.launch_readiness_status,
      vector_memory_target_policy_status:
        vectorStep.vector_memory_target_policy_status,
      next_step_id: launchPlan.next_step_id,
    },
    runtime_status: {
      runtime_status: runtimeStatus.runtime_status,
      preflight_status: runtimeStatus.preflight_status,
      preflight_next_attention_reason:
        runtimeStatus.preflight_next_attention_reason,
      vector_memory_target_policy_status:
        runtimeStatus.vector_memory_target_policy_status,
    },
    boundary_policy: {
      external_vector_target_blocked_before_search: true,
      candidate_commit_still_validation_gated: true,
      env_names_only: true,
      no_secret_values: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertPersistencePolicyGateRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report);
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function assertPersistencePolicyGateRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("persistence policy gate roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!PERSISTENCE_POLICY_GATE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`persistence policy gate unexpected report field ${field}`);
    }
  }
  if (report.ok !== true || report.schema !== "iris_persistence_policy_gate_roundtrip_report_v1") {
    throw new Error("persistence policy gate status mismatch");
  }
  assertBoundaryPolicy(report.boundary_policy, [
    "external_vector_target_blocked_before_search",
    "candidate_commit_still_validation_gated",
    "env_names_only",
    "no_secret_values",
    "no_store_paths",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
    "no_candidates",
    "no_commands",
  ], "persistence policy gate");
}

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    "https://example.com",
    "memory-search",
    "secret-vector-memory",
    tempDir,
    memoryStorePath,
    relationshipStorePath,
    '"input_action_candidate"',
    '"approved_memory_record"',
    '"approved_relationship_record"',
    '"memory_records"',
    '"relationship_profiles"',
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(
      `persistence policy gate leaked unsafe fragment(s): ${leaked.join(", ")}`
    );
  }
}

function assertBoundaryPolicy(policy, fields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error(`${context} boundary policy missing`);
  }
  const expected = new Set(fields);
  for (const field of Object.keys(policy)) {
    if (!expected.has(field)) {
      throw new Error(`${context} unexpected boundary flag ${field}`);
    }
  }
  for (const field of fields) {
    if (policy[field] !== true) {
      throw new Error(`${context} boundary flag failed: ${field}`);
    }
  }
}
