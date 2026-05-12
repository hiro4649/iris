import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeYouTubeDonation } from "../src/adapters/youtube/donationAdapter.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createStreamState } from "../src/runtime/streamState.js";
import {
  assertPersistenceRuntimeStatusReportSafe,
  createPersistenceRuntimeStatusReport,
} from "../src/services/dev/persistenceRuntimeStatus.js";

const PERSISTENCE_CANDIDATE_GATE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "runtime_status_summary",
  "store_status_summary",
  "production_handoff_summary",
  "boundary_policy",
  "unsafe_report_leak_detected",
]);

const tempDir = mkdtempSync(join(tmpdir(), "iris-persistence-candidate-gate-"));
const memoryPath = join(tempDir, "memory.json");
const relationshipPath = join(tempDir, "relationships.json");
const memorySearchEndpoint = "http://127.0.0.1:9109/memory-search";

try {
  const env = {
    ...process.env,
    IRIS_ENABLE_PERSISTENCE: "true",
    IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
    IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
    IRIS_MEMORY_STORE_PATH: memoryPath,
    IRIS_RELATIONSHIP_STORE_PATH: relationshipPath,
    IRIS_MEMORY_SEARCH_ADAPTER: "http_vector",
    IRIS_MEMORY_SEARCH_ENDPOINT: memorySearchEndpoint,
  };
  const streamState = createStreamState();
  const runtime = createIrisRuntime({
    runtimeConfig: createRuntimeConfig(env),
    ttsAdapter() {
      return { spoken: true, adapter: "quiet_persistence_candidate_gate_tts" };
    },
    live2dAdapter() {
      return { sent: true, adapter: "quiet_persistence_candidate_gate_live2d" };
    },
    subtitleAdapter() {
      return { displayed: true, adapter: "quiet_persistence_candidate_gate_subtitle" };
    },
    logger: { log() {}, error() {} },
  });

  const result = await runtime.processEvent(
    normalizeYouTubeDonation({
      event_id: "dev-persistence-candidate-gate-donation-1",
      author_channel_id: "persistence-candidate-gate-viewer",
      display_name: "Persistence Candidate Gate Viewer",
      message_text: "IRIS, keep this candidate gate stream moment private.",
      amount_tier: "medium",
      currency: "JPY",
      support_event_type: "superChatEvent",
    })
  );
  streamState.updateFromRuntimeResult(result);

  const runtimeStatus = createPersistenceRuntimeStatusReport({
    env,
    runtime,
    streamState,
  });
  assertPersistenceRuntimeStatusReportSafe(
    runtimeStatus,
    "persistence candidate gate roundtrip runtime status"
  );

  const flow = runtimeStatus.candidate_commit_flow;
  const report = {
    ok: false,
    schema: "iris_persistence_candidate_gate_roundtrip_report_v1",
    runtime_status_summary: {
      runtime_status: runtimeStatus.runtime_status,
      approved_record_flow_status: runtimeStatus.approved_record_flow.flow_status,
      candidate_commit_flow_status: flow.flow_status,
      candidate_commit_blocking_stage: flow.blocking_stage,
      validation_status: flow.validation_status,
      validation_passed: flow.validation_passed,
      persistence_committed: flow.persistence_committed,
      memory_validated_count: flow.memory_validated_count,
      relationship_validated_count: flow.relationship_validated_count,
      memory_committed_count: flow.memory_committed_count,
      relationship_committed_count: flow.relationship_committed_count,
      persistence_error_count: flow.persistence_error_count,
      boundary_audit_status: flow.boundary_audit_status,
      relationship_value_flow: runtimeStatus.relationship_value_flow,
      long_term_recall_flow: runtimeStatus.long_term_recall_flow,
      memory_relationship_lifecycle_flow:
        runtimeStatus.memory_relationship_lifecycle_flow,
    },
    store_status_summary: {
      memory_record_count: runtimeStatus.runtime_counts.memory_record_count,
      relationship_profile_count:
        runtimeStatus.runtime_counts.relationship_profile_count,
      memory_activity_available:
        runtimeStatus.store_health.memory.activity_available,
      relationship_activity_available:
        runtimeStatus.store_health.relationship.activity_available,
      memory_operation_health: runtimeStatus.store_health.memory.operation_health,
      relationship_operation_health:
        runtimeStatus.store_health.relationship.operation_health,
    },
    production_handoff_summary: {
      schema: "iris_persistence_candidate_gate_handoff_summary_v1",
      fixture_roundtrip_only: true,
      validation_gate_required_before_store_side_effect: true,
      memory_candidates_not_committed_directly: true,
      relationship_candidates_not_committed_directly: true,
      validated_memory_records_only: true,
      validated_relationship_records_only: true,
      relationship_profiles_not_canonical_enums: true,
      vector_search_is_read_only_recall: true,
      no_storage_locations_exposed: true,
      no_record_payloads_exposed: true,
      no_raw_candidates_exposed: true,
      no_live_text_exposed: true,
      no_endpoint_values_exposed: true,
      no_secret_values_exposed: true,
      flow_status: flow.flow_status,
      blocking_stage: flow.blocking_stage,
      validation_status: flow.validation_status,
      validation_passed: flow.validation_passed === true,
      persistence_committed: flow.persistence_committed === true,
      memory_validated_count: flow.memory_validated_count,
      relationship_validated_count: flow.relationship_validated_count,
      memory_committed_count: flow.memory_committed_count,
      relationship_committed_count: flow.relationship_committed_count,
      persistence_error_count: flow.persistence_error_count,
      memory_record_count: runtimeStatus.runtime_counts.memory_record_count,
      relationship_profile_count:
        runtimeStatus.runtime_counts.relationship_profile_count,
      next_runtime_status_script: "npm run dev:persistence:runtime-status",
      next_status_roundtrip_script: "npm run dev:persistence:status-roundtrip",
    },
    boundary_policy: {
      candidate_validation_required_before_store_side_effect: true,
      runtime_status_exposes_gate_status_only: true,
      counts_statuses_and_booleans_only: true,
      no_store_paths: true,
      no_record_payloads: true,
      no_raw_candidates: true,
      no_live_text: true,
      no_commands: true,
      no_secret_values: true,
      production_handoff_summary_counts_only: true,
    },
    unsafe_report_leak_detected: false,
  };

  report.unsafe_report_leak_detected = hasUnsafeReportLeak(report);
  report.ok =
    report.unsafe_report_leak_detected === false &&
    runtimeStatus.runtime_status === "active_with_memory_and_relationships" &&
    runtimeStatus.approved_record_flow.flow_status ===
      "active_with_memory_and_relationships" &&
    flow.flow_status === "memory_commit_active" &&
    flow.blocking_stage === "none" &&
    flow.validation_status === "validated" &&
    flow.validation_passed === true &&
    flow.persistence_committed === true &&
    flow.memory_validated_count > 0 &&
    flow.relationship_validated_count === 0 &&
    flow.memory_committed_count > 0 &&
    flow.relationship_committed_count === 0 &&
    flow.persistence_error_count === 0 &&
    runtimeStatus.memory_relationship_lifecycle_flow.flow_status ===
      "memory_and_relationship_active" &&
    runtimeStatus.memory_relationship_lifecycle_flow.blocking_stage === "none" &&
    runtimeStatus.memory_relationship_lifecycle_flow.identity_scope_enforced === true &&
    runtimeStatus.memory_relationship_lifecycle_flow.relationship_memory_complete === true &&
    runtimeStatus.relationship_value_flow.flow_status ===
      "relationship_values_active" &&
    runtimeStatus.relationship_value_flow.blocking_stage === "none" &&
    runtimeStatus.relationship_value_flow.identity_scope_enforced === true &&
    runtimeStatus.relationship_value_flow.approved_records_only === true &&
    runtimeStatus.relationship_value_flow.direct_candidate_persistence_blocked === true &&
    runtimeStatus.relationship_value_flow.relationship_profile_count > 0 &&
    runtimeStatus.relationship_value_flow.relationship_level_known_count > 0 &&
    runtimeStatus.relationship_value_flow.boundary_policy.no_relationship_scores === true &&
    runtimeStatus.long_term_recall_flow.flow_status ===
      "memory_relationship_recall_ready" &&
    runtimeStatus.long_term_recall_flow.blocking_stage === "none" &&
    runtimeStatus.long_term_recall_flow.public_memory_recall_available === true &&
    runtimeStatus.long_term_recall_flow.per_user_relationship_recall_available ===
      true &&
    runtimeStatus.long_term_recall_flow.durable_restart_recall_ready === true &&
    runtimeStatus.long_term_recall_flow.long_term_recall_policy
      .candidate_objects_never_recalled === true &&
    runtimeStatus.long_term_recall_flow.boundary_policy.no_memory_summaries ===
      true &&
    runtimeStatus.runtime_counts.memory_record_count > 0 &&
    runtimeStatus.runtime_counts.relationship_profile_count > 0;

  assertPersistenceCandidateGateRoundtripReportSafe(report);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function assertPersistenceCandidateGateRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("persistence candidate gate roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!PERSISTENCE_CANDIDATE_GATE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`persistence candidate gate unexpected report field ${field}`);
    }
  }
  if (
    report.ok !== true ||
    report.schema !== "iris_persistence_candidate_gate_roundtrip_report_v1" ||
    report.unsafe_report_leak_detected !== false
  ) {
    throw new Error("persistence candidate gate status mismatch");
  }
  for (const field of [
    "candidate_validation_required_before_store_side_effect",
    "runtime_status_exposes_gate_status_only",
    "counts_statuses_and_booleans_only",
    "no_store_paths",
    "no_record_payloads",
    "no_raw_candidates",
    "no_live_text",
    "no_commands",
    "no_secret_values",
    "production_handoff_summary_counts_only",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`persistence candidate gate boundary flag failed: ${field}`);
    }
  }
}

function hasUnsafeReportLeak(report) {
  assertProductionHandoffSummarySafe(report.production_handoff_summary);
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    tempDir,
    memoryPath,
    relationshipPath,
    memorySearchEndpoint,
    "Persistence Candidate Gate Viewer",
    "persistence-candidate-gate-viewer",
    "candidate gate stream moment",
    "event_id",
    "trace_id",
    "memory_id",
    "linked_identity_id",
    "approved_memory_record",
    "approved_relationship_record",
    "relationship_update_candidate",
    "gratitude_memory_candidate",
    "memory_carryover_candidates",
    "community_memory_candidates",
    "input_action_candidate",
    "approved_game_input_action",
    "\"summary\"",
    "\"text\"",
    "\"payload\"",
    "\"endpoint\"",
    "\"url\"",
    "\"token\"",
    "\"secret\"",
    "\"password\"",
  ];
  return forbiddenFragments.some((fragment) => serialized.includes(fragment));
}

function assertProductionHandoffSummarySafe(summary) {
  if (!summary || summary.schema !== "iris_persistence_candidate_gate_handoff_summary_v1") {
    throw new Error("persistence candidate gate handoff summary missing");
  }
  for (const field of [
    "fixture_roundtrip_only",
    "validation_gate_required_before_store_side_effect",
    "memory_candidates_not_committed_directly",
    "relationship_candidates_not_committed_directly",
    "validated_memory_records_only",
    "validated_relationship_records_only",
    "relationship_profiles_not_canonical_enums",
    "vector_search_is_read_only_recall",
    "no_storage_locations_exposed",
    "no_record_payloads_exposed",
    "no_raw_candidates_exposed",
    "no_live_text_exposed",
    "no_endpoint_values_exposed",
    "no_secret_values_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new Error(`persistence candidate gate handoff flag failed: ${field}`);
    }
  }
  for (const field of [
    "memory_validated_count",
    "relationship_validated_count",
    "memory_committed_count",
    "relationship_committed_count",
    "persistence_error_count",
    "memory_record_count",
    "relationship_profile_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new Error(`persistence candidate gate handoff count invalid: ${field}`);
    }
  }
}
