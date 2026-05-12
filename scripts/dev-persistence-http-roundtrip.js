import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createStreamState } from "../src/runtime/streamState.js";
import { createIrisHttpServer, listen } from "../src/server/httpServer.js";

const PERSISTENCE_HTTP_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "http_events_processed",
  "persistence_status_summary",
  "public_endpoint_summary",
  "boundary_policy",
]);

const tempDir = mkdtempSync(join(tmpdir(), "iris-persistence-http-roundtrip-"));
const memoryPath = join(tempDir, "memory.json");
const relationshipPath = join(tempDir, "relationships.json");
let server = null;

try {
  const env = {
    ...process.env,
    IRIS_ENABLE_PERSISTENCE: "true",
    IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
    IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
    IRIS_MEMORY_STORE_PATH: memoryPath,
    IRIS_RELATIONSHIP_STORE_PATH: relationshipPath,
    IRIS_HAS_OPENED: "true",
  };
  const runtime = createIrisRuntime({
    runtimeConfig: createRuntimeConfig(env),
    ttsAdapter() {
      return { spoken: true, adapter: "quiet_http_persistence_tts" };
    },
    live2dAdapter() {
      return { sent: true, adapter: "quiet_http_persistence_live2d" };
    },
    subtitleAdapter() {
      return { displayed: true, adapter: "quiet_http_persistence_subtitle" };
    },
    logger: { log() {}, error() {} },
  });
  const streamState = createStreamState();
  server = createIrisHttpServer({
    runtime,
    streamState,
    env,
    logger: { error() {} },
  });
  const address = await listen(server, { port: 0, host: "127.0.0.1" });
  const serverUrl = `http://${address.address}:${address.port}`;

  const donation = await postJson(`${serverUrl}/donation`, {
    event_id: "http-persistence-donation-1",
    author_channel_id: "http-persistence-viewer",
    display_name: "HTTP Persistence Viewer",
    message_text: "IRIS, keep this HTTP persistence stream moment.",
    amount_tier: "medium",
    currency: "JPY",
    support_event_type: "superChatEvent",
  });
  assert.equal(donation.status, 200);
  assert.equal(donation.body.ok, true);

  const followup = await postJson(`${serverUrl}/comment`, {
    event_id: "http-persistence-comment-1",
    author_channel_id: "http-persistence-viewer",
    display_name: "HTTP Persistence Viewer",
    text: "IRIS, do you remember this HTTP persistence stream?",
  });
  assert.equal(followup.status, 200);
  assert.equal(followup.body.ok, true);

  const persistence = await fetchJson(`${serverUrl}/persistence/status`);
  assert.equal(persistence.status, 200);
  const persistenceStatus = persistence.body.persistence_status;
  assert.equal(persistenceStatus.status, "active_with_memory_and_relationships");
  assert.equal(
    persistenceStatus.persistence_readiness_status,
    "active_with_memory_and_relationships"
  );
  assert.equal(persistenceStatus.public_counts.memory_record_count > 0, true);
  assert.equal(persistenceStatus.public_counts.relationship_profile_count > 0, true);
  assert.equal(persistenceStatus.store_limits.memory.activity.activity_available, true);
  assert.equal(persistenceStatus.store_limits.relationship.activity.activity_available, true);

  const relationships = await fetchJson(
    `${serverUrl}/relationships?query=http-persistence-viewer`
  );
  assert.equal(relationships.status, 200);
  assert.equal(relationships.body.profiles.length, 1);
  assert.equal(relationships.body.profiles[0].relationship_level, "bounded");
  assert.equal(relationships.body.profiles[0].interaction_count >= 1, true);

  const memories = await fetchJson(`${serverUrl}/memories?limit=20`);
  assert.equal(memories.status, 200);
  assert.equal(memories.body.records.length > 0, true);
  const streamMemories = await fetchJson(
    `${serverUrl}/memories?type=stream_experience&limit=20`
  );
  assert.equal(streamMemories.status, 200);
  assert.equal(streamMemories.body.records.length > 0, true);

  const memorySearch = await fetchJson(`${serverUrl}/memory-search?query=stream&limit=5`);
  assert.equal(memorySearch.status, 200);
  assert.equal(memorySearch.body.result.schema, "iris_memory_search_result_v1");
  assert.equal(memorySearch.body.result.result_count > 0, true);
  assertPublicHttpPersistenceSurfacesSafe({
    persistence: persistence.body,
    relationships: relationships.body,
    memories: memories.body,
    streamMemories: streamMemories.body,
    memorySearch: memorySearch.body,
  });

  const report = {
    ok: true,
    schema: "iris_persistence_http_roundtrip_report_v1",
    http_events_processed: {
      donation_ok: donation.body.ok === true,
      followup_comment_ok: followup.body.ok === true,
      final_state_payload_kind: streamState.get().last_payload_kind,
      boundary_audit_status: streamState.get().last_boundary_audit?.audit_status ?? null,
    },
    persistence_status_summary: {
      status: persistenceStatus.status,
      persistence_readiness_status: persistenceStatus.persistence_readiness_status,
      public_counts: persistenceStatus.public_counts,
      memory_activity_available:
        persistenceStatus.store_limits.memory.activity.activity_available,
      relationship_activity_available:
        persistenceStatus.store_limits.relationship.activity.activity_available,
    },
    public_endpoint_summary: {
      relationship_profile_count: relationships.body.profiles.length,
      relationship_level: relationships.body.profiles[0]?.relationship_level ?? null,
      relationship_interaction_count: relationships.body.profiles[0]?.interaction_count ?? 0,
      memory_record_count: memories.body.records.length,
      stream_memory_record_count: streamMemories.body.records.length,
      memory_search_result_count: memorySearch.body.result.result_count,
    },
    boundary_policy: {
      main_http_persistence_path_verified: true,
      approved_schema_only: true,
      public_counts_only_in_report: true,
      public_endpoints_safe_checked: true,
      no_store_paths: true,
      no_raw_candidates: true,
      no_hidden_relationship_scores: true,
      no_record_payload_dump: true,
      no_text_payloads: true,
      no_commands: true,
      no_secret_values: true,
    },
  };
  assertPersistenceHttpRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report, { serverUrl });
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (server) await closeServer(server);
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.json(),
  };
}

function assertPersistenceHttpRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("HTTP persistence roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!PERSISTENCE_HTTP_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`HTTP persistence roundtrip unexpected report field ${field}`);
    }
  }
  if (report.ok !== true || report.schema !== "iris_persistence_http_roundtrip_report_v1") {
    throw new Error("HTTP persistence roundtrip status mismatch");
  }
  for (const field of [
    "main_http_persistence_path_verified",
    "approved_schema_only",
    "public_counts_only_in_report",
    "public_endpoints_safe_checked",
    "no_store_paths",
    "no_raw_candidates",
    "no_hidden_relationship_scores",
    "no_record_payload_dump",
    "no_text_payloads",
    "no_commands",
    "no_secret_values",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`HTTP persistence roundtrip boundary flag failed: ${field}`);
    }
  }
}

function assertPublicHttpPersistenceSurfacesSafe(surfaces) {
  const serialized = JSON.stringify(surfaces);
  const forbiddenFragments = [
    tempDir,
    memoryPath,
    relationshipPath,
    '"approved_relationship_record"',
    '"relationship_update_candidate"',
    '"gratitude_memory_candidate"',
    '"memory_carryover_candidates"',
    '"community_memory_candidates"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"affinity_score"',
    '"familiarity_score"',
    '"relation_score"',
    '"store_path"',
    '"filePath"',
    '"memory_store_path"',
    '"relationship_store_path"',
    '"token"',
    '"secret"',
    '"password"',
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`HTTP persistence surface leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

function assertNoUnsafeReportLeak(report, { serverUrl }) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    serverUrl,
    tempDir,
    memoryPath,
    relationshipPath,
    "IRIS, keep this HTTP persistence stream moment",
    "IRIS, do you remember this HTTP persistence stream",
    "HTTP Persistence Viewer",
    "http-persistence-viewer",
    "recent_summaries",
    "memory_id",
    "event_id",
    "linked_identity_id",
    "approved_memory_record",
    "approved_relationship_record",
    "relationship_update_candidate",
    "gratitude_memory_candidate",
    "input_action_candidate",
    "approved_game_input_action",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`HTTP persistence report leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

function closeServer(activeServer) {
  return new Promise((resolve, reject) => {
    activeServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
