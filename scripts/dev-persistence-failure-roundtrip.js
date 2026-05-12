import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeYouTubeDonation } from "../src/adapters/youtube/donationAdapter.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { sanitizeCandidatePersistenceForPublicState } from "../src/services/persistence/candidateValidator.js";

const PERSISTENCE_FAILURE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "storage_configured",
  "fixture_storage",
  "base_persistence_status",
  "base_relationship_status",
  "candidate_persistence_status",
  "memory_store_status",
  "relationship_store_status",
  "public_counts",
  "boundary_policy",
]);

const configuredBaseDir = process.env.IRIS_PERSISTENCE_FAILURE_ROUNDTRIP_DIR;
const baseDir =
  configuredBaseDir ?? mkdtempSync(join(tmpdir(), "iris-dev-persistence-failure-"));
mkdirSync(baseDir, { recursive: true });

const memoryPath = join(baseDir, "memory-broken.json");
const relationshipPath = join(baseDir, "relationships-broken.json");
writeFileSync(memoryPath, "{ broken memory json", "utf8");
writeFileSync(
  relationshipPath,
  `${JSON.stringify({ schema: "wrong_relationship_store_schema", profiles: {} }, null, 2)}\n`,
  "utf8"
);

const env = {
  ...process.env,
  IRIS_ENABLE_PERSISTENCE: "false",
  IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
  IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
  IRIS_MEMORY_STORE_PATH: memoryPath,
  IRIS_RELATIONSHIP_STORE_PATH: relationshipPath,
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

const result = await runtime.processEvent(
  normalizeYouTubeDonation({
    event_id: "dev-persistence-failure-donation-1",
    author_channel_id: "persistence-failure-tester",
    display_name: "Persistence Failure Tester",
    message_text: "IRIS, this should not leak during persistence failure.",
    amount_tier: "medium",
    currency: "JPY",
    support_event_type: "superChatEvent",
  })
);

const candidatePersistence = sanitizeCandidatePersistenceForPublicState(
  result.candidate_persistence
);
const memoryStoreStatus = runtime.memoryStoreStatus();
const relationshipStoreStatus = runtime.relationshipStoreStatus();

if (candidatePersistence.memory_committed_count !== 0) {
  throw new Error("persistence failure roundtrip unexpectedly committed memory");
}
if (candidatePersistence.relationship_committed_count !== 0) {
  throw new Error("persistence failure roundtrip unexpectedly committed relationship");
}
if (candidatePersistence.persistence_error_count < 1) {
  throw new Error("persistence failure roundtrip did not report a summarized error");
}
if (memoryStoreStatus.error_kind !== "store_parse_failed") {
  throw new Error("persistence failure roundtrip did not classify memory store status failure");
}
if (relationshipStoreStatus.error_kind !== "store_contract_failed") {
  throw new Error(
    "persistence failure roundtrip did not classify relationship store status failure"
  );
}

const report = {
  ok: true,
  storage_configured: true,
  fixture_storage: !configuredBaseDir,
  base_persistence_status: summarizeCommitResult(result.core.persistence),
  base_relationship_status: summarizeCommitResult(result.core.relationship),
  candidate_persistence_status: candidatePersistence,
  memory_store_status: memoryStoreStatus,
  relationship_store_status: relationshipStoreStatus,
  public_counts: {
    memory_record_count: runtime.memoryRecords(10_000).length,
    relationship_profile_count: runtime.relationshipProfiles().length,
  },
  boundary_policy: {
    approved_schema_only: true,
    raw_candidates_not_committed: true,
    commit_failures_summary_only: true,
    no_record_payload_dump: true,
    no_path_values: true,
    no_error_messages: true,
    no_live_text: true,
  },
};

assertPersistenceFailureRoundtripReportSafe(report);
assertNoUnsafeReportLeak(report);

console.log(JSON.stringify(report, null, 2));

function assertPersistenceFailureRoundtripReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("persistence failure roundtrip report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!PERSISTENCE_FAILURE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`persistence failure roundtrip unexpected report field ${field}`);
    }
  }
  if (reportValue.ok !== true || reportValue.storage_configured !== true) {
    throw new Error("persistence failure roundtrip status mismatch");
  }
  for (const field of [
    "approved_schema_only",
    "raw_candidates_not_committed",
    "commit_failures_summary_only",
    "no_record_payload_dump",
    "no_path_values",
    "no_error_messages",
    "no_live_text",
  ]) {
    if (reportValue.boundary_policy[field] !== true) {
      throw new Error(`persistence failure roundtrip boundary flag failed: ${field}`);
    }
  }
}

function summarizeCommitResult(result) {
  return {
    committed: result?.committed === true,
    reason: result?.reason ?? null,
    error_kind: result?.error_kind ?? null,
    retryable: result?.retryable === true,
    boundary_policy: summarizeCommitBoundaryPolicy(result?.boundary_policy),
  };
}

function summarizeCommitBoundaryPolicy(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) return null;
  const fields = [
    "commit_failures_summary_only",
    "no_store_paths",
    "no_error_messages",
  ];
  const summary = {};
  for (const field of fields) {
    summary[field] = policy[field] === true;
  }
  return summary;
}

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    baseDir,
    memoryPath,
    relationshipPath,
    "broken memory json",
    "wrong_relationship_store_schema",
    "Persistence Failure Tester",
    "this should not leak",
    "approved_memory_record",
    "approved_relationship_record",
    "relationship_update_candidate",
    "memory_carryover_candidates",
    "community_memory_candidates",
    "input_action_candidate",
    "approved_game_input_action",
    "\"summary\"",
    "filePath",
    "\"store_path\"",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`persistence failure roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
