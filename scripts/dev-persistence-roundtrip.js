import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeYouTubeComment } from "../src/adapters/youtube/commentAdapter.js";
import { normalizeYouTubeDonation } from "../src/adapters/youtube/donationAdapter.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { sanitizeCandidatePersistenceForPublicState } from "../src/services/persistence/candidateValidator.js";

const PERSISTENCE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "storage_configured",
  "fixture_storage",
  "donation_candidate_persistence_summary",
  "memory_store_status",
  "relationship_store_status",
  "followup_payload_kind",
  "public_counts",
  "relationship_status_summary",
  "boundary_policy",
]);

const configuredBaseDir = process.env.IRIS_PERSISTENCE_ROUNDTRIP_DIR;
const baseDir = configuredBaseDir ?? mkdtempSync(join(tmpdir(), "iris-dev-persistence-roundtrip-"));
mkdirSync(baseDir, { recursive: true });

const env = {
  ...process.env,
  IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
  IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
  IRIS_MEMORY_STORE_PATH: process.env.IRIS_MEMORY_STORE_PATH ?? join(baseDir, "memory.json"),
  IRIS_RELATIONSHIP_STORE_PATH:
    process.env.IRIS_RELATIONSHIP_STORE_PATH ?? join(baseDir, "relationships.json"),
};
const quietAdapters = {
  ttsAdapter() {
    return { spoken: true, adapter: "quiet_dev_tts" };
  },
  live2dAdapter() {
    return { sent: true, adapter: "quiet_dev_live2d" };
  },
  subtitleAdapter() {
    return { displayed: true, adapter: "quiet_dev_subtitle" };
  },
};

const firstRuntime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(env),
  ...quietAdapters,
  logger: { log() {} },
});
const donationResult = await firstRuntime.processEvent(
  normalizeYouTubeDonation({
    event_id: "dev-persistence-donation-1",
    author_channel_id: "persistence-tester",
    display_name: "Persistence Tester",
    message_text: "IRIS, keep going!",
    amount_tier: "medium",
    currency: "JPY",
    support_event_type: "superChatEvent",
  })
);

const secondRuntime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(env),
  ...quietAdapters,
  logger: { log() {} },
});
const followupResult = await secondRuntime.processEvent(
  normalizeYouTubeComment({
    event_id: "dev-persistence-comment-1",
    author_channel_id: "persistence-tester",
    display_name: "Persistence Tester",
    text: "IRIS, do you remember this stream?",
  })
);

const memories = secondRuntime.memoryRecords(100);
const relationships = secondRuntime.relationshipProfiles();
const relationshipProfile =
  relationships.find((profile) => profile.linked_identity_id === "viewer:persistence-tester") ??
  null;

const report = {
  ok: true,
  storage_configured: baseDir !== "",
  fixture_storage: !configuredBaseDir,
  donation_candidate_persistence_summary: sanitizeCandidatePersistenceForPublicState(
    donationResult.candidate_persistence
  ),
  memory_store_status: secondRuntime.memoryStoreStatus(),
  relationship_store_status: secondRuntime.relationshipStoreStatus(),
  followup_payload_kind: followupResult.core.phase01.payload_kind,
  public_counts: {
    memory_record_count: memories.length,
    relationship_profile_count: relationships.length,
  },
  relationship_status_summary: relationshipProfile
    ? {
        schema: "iris_relationship_roundtrip_status_summary_v1",
        relationship_level: relationshipProfile.relationship_level,
        interaction_count: relationshipProfile.interaction_count,
        has_recent_interaction: Number.isFinite(Number(relationshipProfile.last_interaction_at_ms)),
      }
    : null,
  boundary_policy: {
    approved_schema_only: true,
    no_raw_candidates: true,
    no_hidden_scores: true,
    no_record_payload_dump: true,
    no_path_values: true,
    no_live_text: true,
  },
};

assertPersistenceRoundtripReportSafe(report);
assertNoUnsafeReportLeak(report);

console.log(JSON.stringify(report, null, 2));

function assertPersistenceRoundtripReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("persistence roundtrip report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!PERSISTENCE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`persistence roundtrip unexpected report field ${field}`);
    }
  }
  if (reportValue.ok !== true || reportValue.storage_configured !== true) {
    throw new Error("persistence roundtrip status mismatch");
  }
  for (const field of [
    "approved_schema_only",
    "no_raw_candidates",
    "no_hidden_scores",
    "no_record_payload_dump",
    "no_path_values",
    "no_live_text",
  ]) {
    if (reportValue.boundary_policy[field] !== true) {
      throw new Error(`persistence roundtrip boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    baseDir,
    env.IRIS_MEMORY_STORE_PATH,
    env.IRIS_RELATIONSHIP_STORE_PATH,
    "IRIS, keep going!",
    "IRIS, do you remember this stream?",
    "Persistence Tester",
    "recent_summaries",
    "persistence_dir",
    "memory_store_path",
    "relationship_store_path",
    "input_action_candidate",
    "approved_game_input_action",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`persistence roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
