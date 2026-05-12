import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeYouTubeComment } from "../src/adapters/youtube/commentAdapter.js";
import { normalizeYouTubeDonation } from "../src/adapters/youtube/donationAdapter.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import {
  assertPersistenceStatusSafe,
  createPersistenceStatus,
} from "../src/services/dev/persistenceStatus.js";

const PERSISTENCE_STATUS_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "storage_configured",
  "fixture_storage",
  "persistence_status",
  "production_handoff_summary",
  "boundary_policy",
]);

const configuredBaseDir = process.env.IRIS_PERSISTENCE_STATUS_ROUNDTRIP_DIR;
const baseDir = configuredBaseDir ?? mkdtempSync(join(tmpdir(), "iris-dev-persistence-status-"));
mkdirSync(baseDir, { recursive: true });

const env = {
  ...process.env,
  IRIS_ENABLE_PERSISTENCE: "true",
  IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
  IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
  IRIS_MEMORY_STORE_PATH: process.env.IRIS_MEMORY_STORE_PATH ?? join(baseDir, "memory.json"),
  IRIS_RELATIONSHIP_STORE_PATH:
    process.env.IRIS_RELATIONSHIP_STORE_PATH ?? join(baseDir, "relationships.json"),
};

const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(env),
  ttsAdapter() {
    return { spoken: true, adapter: "quiet_dev_tts" };
  },
  live2dAdapter() {
    return { sent: true, adapter: "quiet_dev_live2d" };
  },
  subtitleAdapter() {
    return { displayed: true, adapter: "quiet_dev_subtitle" };
  },
  logger: { log() {} },
});

await runtime.processEvent(
  normalizeYouTubeDonation({
    event_id: "dev-persistence-status-donation-1",
    author_channel_id: "persistence-status-tester",
    display_name: "Persistence Status Tester",
    message_text: "IRIS, keep going through this stream check.",
    amount_tier: "medium",
    currency: "JPY",
    support_event_type: "superChatEvent",
  })
);

await runtime.processEvent(
  normalizeYouTubeComment({
    event_id: "dev-persistence-status-comment-1",
    author_channel_id: "persistence-status-tester",
    display_name: "Persistence Status Tester",
    text: "IRIS, do you remember this stream check?",
  })
);

const persistenceStatus = createPersistenceStatus({
  capabilities: runtime.capabilities(),
  memoryRecordCount: runtime.memoryRecords(10_000).length,
  relationshipProfileCount: runtime.relationshipProfiles().length,
  replayEntryCount: runtime.replayEntries(10_000).length,
  candidateReviewStats: runtime.candidateReviewStats(),
  memoryStoreStatus: runtime.memoryStoreStatus(),
  relationshipStoreStatus: runtime.relationshipStoreStatus(),
});

assertPersistenceStatusSafe(persistenceStatus, "dev persistence status roundtrip");

const report = {
  ok: true,
  storage_configured: baseDir !== "",
  fixture_storage: !configuredBaseDir,
  persistence_status: persistenceStatus,
  production_handoff_summary: {
    schema: "iris_persistence_status_roundtrip_handoff_summary_v1",
    fixture_or_operator_storage_only: true,
    runtime_fixture_events_only: true,
    memory_candidates_not_committed_directly: true,
    relationship_candidates_not_committed_directly: true,
    validated_memory_records_only: true,
    validated_relationship_records_only: true,
    relationship_profiles_not_canonical_enums: true,
    no_memory_text_exposed: true,
    no_relationship_payloads_exposed: true,
    no_candidates_exposed: true,
    no_storage_locations_exposed: true,
    no_secret_values_exposed: true,
    memory_record_count: persistenceStatus.public_counts.memory_record_count,
    relationship_profile_count:
      persistenceStatus.public_counts.relationship_profile_count,
    replay_entry_count: persistenceStatus.public_counts.replay_entry_count,
    candidate_review_item_count:
      persistenceStatus.public_counts.candidate_review_item_count,
    next_runtime_status_script: "npm run dev:persistence:runtime-status",
    next_candidate_gate_script: "npm run dev:persistence:candidate-gate-roundtrip",
  },
  boundary_policy: {
    counts_only: true,
    no_memory_text: true,
    no_relationship_payloads: true,
    no_candidates: true,
    no_secret_values: true,
    no_path_values: true,
    production_handoff_summary_counts_only: true,
  },
};
assertPersistenceStatusRoundtripReportSafe(report);
assertNoUnsafeStatusLeak(report);

console.log(JSON.stringify(report, null, 2));

function assertPersistenceStatusRoundtripReportSafe(status) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new Error("persistence status roundtrip report missing");
  }
  for (const field of Object.keys(status)) {
    if (!PERSISTENCE_STATUS_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`persistence status roundtrip unexpected report field ${field}`);
    }
  }
  if (status.ok !== true || status.storage_configured !== true) {
    throw new Error("persistence status roundtrip status mismatch");
  }
  assertBoundaryPolicy(status.boundary_policy, [
    "counts_only",
    "no_memory_text",
    "no_relationship_payloads",
    "no_candidates",
    "no_secret_values",
    "no_path_values",
    "production_handoff_summary_counts_only",
  ], "persistence status");
}

function assertNoUnsafeStatusLeak(status) {
  const serialized = JSON.stringify(status);
  const forbiddenFragments = [
    "Persistence Status Tester",
    "keep going through this stream check",
    "do you remember this stream check",
    "approved_memory_record",
    "approved_relationship_record",
    "relationship_update_candidate",
    "memory_carryover_candidates",
    "community_memory_candidates",
    "input_action_candidate",
    "recent_summaries",
    "\"summary\"",
    "password-value",
    "token-value",
    "secret-value",
    baseDir,
    env.IRIS_MEMORY_STORE_PATH,
    env.IRIS_RELATIONSHIP_STORE_PATH,
    "persistence_dir",
    "filePath",
    "store_path",
  ];
  assertProductionHandoffSummarySafe(status.production_handoff_summary);
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`persistence status leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

function assertProductionHandoffSummarySafe(summary) {
  if (
    !summary ||
    summary.schema !== "iris_persistence_status_roundtrip_handoff_summary_v1"
  ) {
    throw new Error("persistence status handoff summary missing");
  }
  for (const field of [
    "fixture_or_operator_storage_only",
    "runtime_fixture_events_only",
    "memory_candidates_not_committed_directly",
    "relationship_candidates_not_committed_directly",
    "validated_memory_records_only",
    "validated_relationship_records_only",
    "relationship_profiles_not_canonical_enums",
    "no_memory_text_exposed",
    "no_relationship_payloads_exposed",
    "no_candidates_exposed",
    "no_storage_locations_exposed",
    "no_secret_values_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new Error(`persistence status handoff flag failed: ${field}`);
    }
  }
  for (const field of [
    "memory_record_count",
    "relationship_profile_count",
    "replay_entry_count",
    "candidate_review_item_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new Error(`persistence status handoff count invalid: ${field}`);
    }
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
