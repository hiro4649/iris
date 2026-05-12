import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntimeAdaptersFromEnv } from "../../adapters/runtimeAdapters.js";
import { createHttpIngestScheduler } from "../../runtime/httpIngestScheduler.js";
import { createIrisRuntime } from "../../runtime/irisRuntime.js";
import { createRuntimeConfig } from "../../runtime/runtimeConfig.js";
import { createStreamState } from "../../runtime/streamState.js";
import {
  createYouTubeRelayBridgeItems,
  createYouTubeRelayBridgeServer,
  summarizeRelayItems,
} from "../../server/youtubeRelayBridge.js";

const YOUTUBE_RELAY_READINESS_REHEARSAL_FIELDS = new Set([
  "ok",
  "schema",
  "rehearsal_status",
  "source_mode",
  "fixture_summary",
  "relay_bridge_summary",
  "source_status_summary",
  "scheduler_summary",
  "runtime_summary",
  "verification_scripts",
  "boundary_policy",
]);

export async function createYouTubeRelayReadinessRehearsal({
  env = process.env,
  keepDevArtifacts = env.IRIS_KEEP_DEV_ARTIFACTS === "true",
} = {}) {
  const items = createYouTubeRelayBridgeItems();
  const relayServer = createYouTubeRelayBridgeServer({
    items,
    logger: { warn() {} },
  });
  const address = await listenOnLoopback(relayServer);
  const relayUrl = `http://${address.address}:${address.port}`;
  const persistenceDir = mkdtempSync(join(tmpdir(), "iris-youtube-relay-readiness-"));

  try {
    const rehearsalEnv = {
      ...env,
      IRIS_YOUTUBE_LIVE_CHAT_SOURCE: "http_relay",
      IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT: `${relayUrl}/youtube/live-chat`,
      IRIS_ENABLE_HTTP_INGEST_SCHEDULER: "true",
      IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
      IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
      IRIS_ENABLE_GAME_CONTROL: "false",
      IRIS_GAME_CONTROL_ADAPTER: "mock",
      IRIS_MEMORY_SEARCH_ADAPTER: "local",
      IRIS_MEMORY_STORE_PATH: join(persistenceDir, "memory.json"),
      IRIS_RELATIONSHIP_STORE_PATH: join(persistenceDir, "relationships.json"),
    };
    const adapters = createRuntimeAdaptersFromEnv(rehearsalEnv);
    const streamState = createStreamState();
    const runtime = createIrisRuntime({
      runtimeConfig: createRuntimeConfig(rehearsalEnv),
      ...adapters,
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
    const scheduler = createHttpIngestScheduler({
      runtime,
      streamState,
      sources: [{ name: "youtube_http_relay", source: adapters.liveChatSource }],
      batchLimit: 20,
      logger: { error() {} },
    });
    const tick = await scheduler.tickNow("youtube_relay_readiness_rehearsal_tick");
    const sourceStatus = adapters.liveChatSource.status();
    const runtimeState = streamState.get();
    const memoryRecords = runtime.memoryRecords(100);
    const relationshipProfiles = runtime.relationshipProfiles();

    assert.equal(sourceStatus.last_item_count, 7);
    assert.equal(sourceStatus.last_comment_count, 1);
    assert.equal(sourceStatus.last_support_event_count, 5);
    assert.equal(sourceStatus.last_ignored_count, 1);
    const fixturePassed = tick.ok === true && tick.processed_count === 6;

    const report = {
      ok: fixturePassed,
      schema: "iris_youtube_relay_readiness_rehearsal_report_v1",
      rehearsal_status: fixturePassed
        ? "relay_runtime_rehearsal_ready"
        : "relay_runtime_rehearsal_attention",
      source_mode: "http_relay",
      fixture_summary: {
        fixture_source: "synthetic_youtube_relay_fixture",
        fixture_result_status: fixturePassed ? "pass" : "fail",
        fixture_result_count: tick.processed_count,
        real_youtube_input_used: false,
      },
      relay_bridge_summary: summarizeRelayItems(items),
      source_status_summary: {
        source_kind: sourceStatus.source_kind,
        local_endpoint_policy: sourceStatus.local_endpoint_policy,
        local_endpoint_policy_status: sourceStatus.local_endpoint_policy_status,
        bridge_endpoint_scope: sourceStatus.bridge_endpoint_scope,
        bridge_endpoint_locality_ok: sourceStatus.bridge_endpoint_locality_ok,
        request_count: sourceStatus.request_count,
        last_item_count: sourceStatus.last_item_count,
        last_comment_count: sourceStatus.last_comment_count,
        last_support_event_count: sourceStatus.last_support_event_count,
        last_support_event_type_counts: sourceStatus.last_support_event_type_counts,
        last_support_amount_source_counts:
          sourceStatus.last_support_amount_source_counts,
        last_ignored_count: sourceStatus.last_ignored_count,
        last_ignored_event_type_counts: sourceStatus.last_ignored_event_type_counts,
      },
      scheduler_summary: {
        tick_ok: tick.ok === true,
        processed_count: tick.processed_count,
        duplicate_count: tick.duplicate_count,
        source_error_count: tick.source_error_count,
        top_priority: tick.status.last_priority_summary.top_priority,
        by_band: tick.status.last_priority_summary.by_band,
      },
      runtime_summary: {
        last_payload_kind: runtimeState.last_payload_kind,
        memory_record_count: memoryRecords.length,
        relationship_profile_count: relationshipProfiles.length,
      },
      verification_scripts: {
        relay_bridge_script: "npm run dev:youtube:relay-bridge",
        relay_roundtrip_script: "npm run dev:youtube:relay-roundtrip",
        relay_status_roundtrip_script:
          "npm run dev:youtube:relay-status-roundtrip",
        runtime_ingest_roundtrip_script:
          "npm run dev:youtube:runtime-ingest-roundtrip",
        readiness_rehearsal_script: "npm run dev:youtube:readiness-rehearsal",
      },
      boundary_policy: {
        local_fixture_source_only: true,
        synthetic_fixture_results_only: true,
        scheduler_tick_performed: true,
        validation_gated_persistence: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_youtube_text: true,
        no_support_messages: true,
        no_platform_ids: true,
        no_local_path_values: true,
        no_candidates: true,
        no_commands: true,
      },
    };
    assertYouTubeRelayReadinessRehearsalSafe(report, { relayUrl, persistenceDir });
    return report;
  } finally {
    await closeServer(relayServer);
    if (!keepDevArtifacts) {
      rmSync(persistenceDir, { recursive: true, force: true });
    }
  }
}

export function assertYouTubeRelayReadinessRehearsalSafe(
  value,
  { relayUrl = "", persistenceDir = "" } = {}
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("YouTube relay readiness report must be an object");
  }
  if (value.schema !== "iris_youtube_relay_readiness_rehearsal_report_v1") {
    throw new Error("YouTube relay readiness report has invalid schema");
  }
  for (const field of Object.keys(value)) {
    if (!YOUTUBE_RELAY_READINESS_REHEARSAL_FIELDS.has(field)) {
      throw new Error(`YouTube relay readiness report has unexpected field: ${field}`);
    }
  }
  if (
    !value.fixture_summary ||
    value.fixture_summary.fixture_source !== "synthetic_youtube_relay_fixture" ||
    !["pass", "fail"].includes(value.fixture_summary.fixture_result_status) ||
    value.fixture_summary.real_youtube_input_used !== false ||
    !Number.isInteger(value.fixture_summary.fixture_result_count) ||
    value.fixture_summary.fixture_result_count < 0
  ) {
    throw new Error("YouTube relay readiness fixture summary must be synthetic and safe");
  }
  if (value.boundary_policy?.synthetic_fixture_results_only !== true) {
    throw new Error("YouTube relay readiness report must use synthetic fixture results only");
  }
  const serialized = JSON.stringify(value);
  const forbiddenFragments = [
    relayUrl,
    persistenceDir,
    "Bridge Commenter",
    "Bridge Supporter",
    "Bridge Super Thanks",
    "Bridge Sticker",
    "Bridge Raw Supporter",
    "Bridge Gift Receiver",
    "bridge-viewer",
    "IRIS relay bridge fixture comment",
    "Super Chat bridge fixture",
    "Super Thanks bridge fixture",
    "Sticker bridge fixture",
    "Bridge support fixture comment",
    "Bridge archive support fixture",
    "Bridge relay raw fixture",
    "Bridge gifted membership fixture",
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"approved_memory_record"',
    '"approved_relationship_record"',
    "memory_records",
    "relationship_profiles",
    "store_path",
    "filePath",
    "api_key=",
    "apiKey=",
    "token=",
    "youtube-token",
    "raw YouTube",
    "raw_youtube",
    "secret=",
    "authorization=",
  ].filter(Boolean);
  const leaked = forbiddenFragments.filter((fragment) =>
    serialized.includes(fragment)
  );
  if (leaked.length > 0) {
    throw new Error(
      `YouTube relay readiness report leaked unsafe fragment(s): ${leaked.join(", ")}`
    );
  }
}

function listenOnLoopback(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address());
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
