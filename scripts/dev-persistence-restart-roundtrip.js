import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeYouTubeComment } from "../src/adapters/youtube/commentAdapter.js";
import { normalizeYouTubeDonation } from "../src/adapters/youtube/donationAdapter.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";

const PERSISTENCE_RESTART_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "before_restart",
  "after_restart",
  "boundary_policy",
]);

const tempDir = mkdtempSync(join(tmpdir(), "iris-persistence-restart-roundtrip-"));
const env = {
  ...process.env,
  IRIS_MEMORY_STORE_PATH: join(tempDir, "memory.json"),
  IRIS_RELATIONSHIP_STORE_PATH: join(tempDir, "relationship.json"),
  IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
  IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
};

try {
  const firstRuntime = createRuntime(env);
  const first = await firstRuntime.processEvent(
    normalizeYouTubeDonation({
      author_channel_id: "restart-roundtrip-viewer",
      display_name: "Restart Roundtrip Viewer",
      message_text: "IRIS, keep this stream moment in mind",
      amount_tier: "small",
      support_event_type: "memberMilestoneChatEvent",
    })
  );

  const restartedRuntime = createRuntime(env);
  const memoryBefore = restartedRuntime.memoryRecords(100);
  const profilesBefore = restartedRuntime.relationshipProfiles();
  const recall = await restartedRuntime.processEvent(
    normalizeYouTubeComment({
      author_channel_id: "restart-roundtrip-viewer",
      display_name: "Restart Roundtrip Viewer",
      text: "IRIS, remember the stream support from before?",
    })
  );

  const report = {
    ok: recall.memory_recall.recall_decision === "recall",
    schema: "iris_persistence_restart_roundtrip_report_v1",
    before_restart: {
      memory_committed_count: first.candidate_persistence.memory_committed_count,
      relationship_committed_count: first.candidate_persistence.relationship_committed_count,
    },
    after_restart: {
      memory_record_count: memoryBefore.length,
      relationship_profile_count: profilesBefore.length,
      matching_relationship_profile_count: profilesBefore.filter(
        (profile) => profile.linked_identity_id === "viewer:restart-roundtrip-viewer"
      ).length,
      recall_decision: recall.memory_recall.recall_decision,
      selected_memory_count: recall.memory_recall.selected_memory_ids.length,
    },
    boundary_policy: {
      approved_schema_only: true,
      raw_candidates_not_reported: true,
      memory_summaries_not_reported: true,
      hidden_relationship_scores_not_reported: true,
      no_store_paths: true,
      no_commands: true,
    },
  };
  assertPersistenceRestartRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report);
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function assertPersistenceRestartRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("persistence restart roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!PERSISTENCE_RESTART_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`persistence restart roundtrip unexpected report field ${field}`);
    }
  }
  if (
    report.ok !== true ||
    report.schema !== "iris_persistence_restart_roundtrip_report_v1"
  ) {
    throw new Error("persistence restart roundtrip status mismatch");
  }
  for (const field of [
    "approved_schema_only",
    "raw_candidates_not_reported",
    "memory_summaries_not_reported",
    "hidden_relationship_scores_not_reported",
    "no_store_paths",
    "no_commands",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`persistence restart roundtrip boundary flag failed: ${field}`);
    }
  }
}

function createRuntime(runtimeEnv) {
  return createIrisRuntime({
    runtimeConfig: createRuntimeConfig(runtimeEnv),
    ttsAdapter() {
      return { spoken: true };
    },
    live2dAdapter() {
      return { sent: true };
    },
    logger: { log() {} },
  });
}

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    tempDir,
    env.IRIS_MEMORY_STORE_PATH,
    env.IRIS_RELATIONSHIP_STORE_PATH,
    "IRIS, keep this stream moment in mind",
    "IRIS, remember the stream support from before?",
    "Restart Roundtrip Viewer",
    '"summary"',
    '"relationship_update_candidate"',
    '"gratitude_memory_candidate"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"commit"',
    '"write"',
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`persistence restart roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
