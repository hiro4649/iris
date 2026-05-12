import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createHttpIngestScheduler } from "../src/runtime/httpIngestScheduler.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createStreamState } from "../src/runtime/streamState.js";
import { createLocalBridgeServer } from "../src/server/localBridgeServer.js";
import { createLocalBridgeEngineWorker } from "../src/server/localBridgeEngineWorker.js";
import {
  createOverlayDisplayEvent,
  createOverlayEventBus,
} from "../src/server/overlayDisplayEvent.js";
import { listen } from "../src/server/httpServer.js";
import {
  assertPersistenceStatusSafe,
  createPersistenceStatus,
} from "../src/services/dev/persistenceStatus.js";
import {
  assertProductionLiveReadinessReportSafe,
  createProductionLiveReadinessReport,
} from "../src/services/dev/productionLiveReadiness.js";

const tempDir = mkdtempSync(join(tmpdir(), "iris-production-loop-roundtrip-"));
const outboxDir = join(tempDir, "outbox");
const artifactDir = join(tempDir, "artifacts");
const memoryPath = join(tempDir, "memory.json");
const relationshipPath = join(tempDir, "relationships.json");
const youtubeCursorPath = join(tempDir, "youtube-live-chat-cursor.json");

const PRODUCTION_LOOP_REPORT_FIELDS = new Set([
  "ok",
  "platform_counts",
  "engine_counts",
  "ingest_summary",
  "youtube_status_summary",
  "vision_capture_summary",
  "persistence_summary",
  "game_control_summary",
  "game_control_adapter_status",
  "production_live_readiness_summary",
  "bridge_summary",
  "worker_summary",
  "render_manifest_summary",
  "artifact_delivery_summary",
  "final_state_summary",
  "production_handoff_summary",
  "boundary_policy"
]);

const platformCounts = {
  oauth_refresh: 0,
  video_discovery: 0,
  live_chat_poll: 0,
  vision_capture: 0,
};
const engineCounts = {
  tts: 0,
  live2d: 0,
  subtitle: 0,
};
let lastVisionCaptureRequest = null;

const platformServer = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "POST" && url.pathname === "/oauth/token") {
    platformCounts.oauth_refresh += 1;
    await readRequestText(request);
    return sendJson(response, 200, {
      access_token: "fixture-production-loop-access-token",
      expires_in: 3600,
      token_type: "Bearer",
    });
  }
  if (request.method === "GET" && url.pathname === "/youtube/v3/videos") {
    platformCounts.video_discovery += 1;
    return sendJson(response, 200, {
      items: [
        {
          id: "fixture-production-video",
          liveStreamingDetails: {
            activeLiveChatId: "fixture-production-live-chat",
          },
        },
      ],
    });
  }
  if (request.method === "GET" && url.pathname === "/youtube/v3/liveChat/messages") {
    platformCounts.live_chat_poll += 1;
    return sendJson(response, 200, {
      nextPageToken: "fixture-production-next-page",
      pollingIntervalMillis: 10_000,
      items: createLiveChatItems(),
    });
  }
  if (request.method === "POST" && url.pathname === "/vision/latest") {
    platformCounts.vision_capture += 1;
    lastVisionCaptureRequest = await readRequestJson(request);
    return sendJson(response, 200, {
      schema: "iris_vision_observation_batch_v1",
      observations: [
        {
          trace_id: "production-loop-vision-1",
          event_id: "production-loop-game-1",
          game_title: "Minecraft",
          scene_summary:
            "The player is at one heart near lava while the chat is reacting excitedly.",
          detected_events: ["low health", "lava nearby", "danger", "chat hype"],
          player_state: "one heart, edge of lava pool",
          screen_confidence: 0.94,
          vision_source_kind: "fixture_screen_capture_bridge",
          frame_id: "prod-frame-1",
          frame_reference_id: "prod-frame-ref-1",
          frame_age_ms: 38,
          capture_region: { x: 0, y: 0, width: 1280, height: 720 },
          ocr_text_summary: "one heart, lava visible",
          ui_focus_areas: ["health_bar", "lava_edge", "hotbar"],
          raw_frame_available: false,
        },
      ],
    });
  }
  if (request.method === "POST" && url.pathname === "/memory-search") {
    await readRequestJson(request);
    return sendJson(response, 200, {
      vector_provider: "production_loop_vector_bridge",
      hits: [],
    });
  }
  if (request.method === "GET" && url.pathname === "/media/latest") {
    return sendJson(response, 200, {
      schema: "iris_media_watch_summary_batch_v1",
      summaries: [],
    });
  }
  if (request.method === "GET" && url.pathname === "/topics/latest") {
    return sendJson(response, 200, {
      schema: "iris_external_topic_summary_batch_v1",
      topics: [],
    });
  }
  if (request.method === "GET" && url.pathname === "/obs/health") {
    return sendJson(response, 200, {
      ok: true,
      supported_setup_schemas: ["iris_obs_bridge_setup_request_v1"],
      supported_ack_fields: ["bridge_status", "configured"],
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const engineServer = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/tts-health") {
    return sendJson(response, 200, {
      ok: true,
      supported_request_schemas: ["iris_local_tts_engine_request_v1"],
      supported_response_fields: ["audio_base64", "audio_mime"],
      supported_audio_mimes: ["audio/wav"],
    });
  }
  if (request.method === "GET" && request.url === "/live2d-health") {
    return sendJson(response, 200, {
      ok: true,
      supported_request_schemas: ["iris_local_live2d_engine_request_v1"],
      supported_response_fields: ["cue"],
      supported_cue_schemas: ["iris_live2d_renderer_cue_v1"],
    });
  }
  if (request.method === "GET" && request.url === "/subtitle-health") {
    return sendJson(response, 200, {
      ok: true,
      supported_request_schemas: ["iris_local_subtitle_engine_request_v1"],
      supported_response_fields: ["vtt"],
      supported_subtitle_formats: ["text/vtt"],
    });
  }
  const body = await readRequestJson(request);
  if (request.url === "/tts-engine") {
    engineCounts.tts += 1;
    return sendJson(response, 200, {
      audio_base64: Buffer.from("RIFF1234WAVEdata", "ascii").toString("base64"),
      audio_mime: "audio/wav",
      duration_ms: body.estimated_duration_ms ?? 1200,
      sample_rate_hz: 48000,
      visemes: [{ at_ms: 0, shape: "a" }],
      bridge_status: "rendered",
    });
  }
  if (request.url === "/live2d-engine") {
    engineCounts.live2d += 1;
    return sendJson(response, 200, {
      bridge_status: "rendered",
      duration_ms: body.timing?.total_duration_ms ?? 1200,
      cue: createRendererCue(body),
    });
  }
  if (request.url === "/subtitle-engine") {
    engineCounts.subtitle += 1;
    return sendJson(response, 200, {
      bridge_status: "rendered",
      duration_ms: body.timing?.total_duration_ms ?? 1200,
      vtt: createSubtitleVtt(body),
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

const renderManifestMaxAgeMs = 60_000;
const artifactRenderMaxSkewMs = 1_500;
const bridgeServer = createLocalBridgeServer({
  outboxDir,
  artifactDir,
  maxRenderManifestAgeMs: renderManifestMaxAgeMs,
  maxArtifactRenderSkewMs: artifactRenderMaxSkewMs,
  logger: { error() {} },
});
let scheduler = null;
const platformAddress = await listen(platformServer, { port: 0, host: "127.0.0.1" });
const engineAddress = await listen(engineServer, { port: 0, host: "127.0.0.1" });
const bridgeAddress = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });
const platformUrl = `http://${platformAddress.address}:${platformAddress.port}`;
const engineUrl = `http://${engineAddress.address}:${engineAddress.port}`;
const bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;

try {
  const env = {
    ...process.env,
    IRIS_TTS_ADAPTER: "http",
    IRIS_TTS_ENDPOINT: `${bridgeUrl}/tts`,
    IRIS_LIVE2D_ADAPTER: "http",
    IRIS_LIVE2D_ENDPOINT: `${bridgeUrl}/live2d`,
    IRIS_SUBTITLE_ADAPTER: "http",
    IRIS_SUBTITLE_ENDPOINT: `${bridgeUrl}/subtitle`,
    IRIS_LOCAL_BRIDGE_OUTBOX_DIR: outboxDir,
    IRIS_LOCAL_BRIDGE_ARTIFACT_DIR: artifactDir,
    IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS: String(renderManifestMaxAgeMs),
    IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS: String(
      artifactRenderMaxSkewMs
    ),
    IRIS_LOCAL_TTS_ENGINE_ENDPOINT: `${engineUrl}/tts-engine`,
    IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT: `${engineUrl}/tts-health`,
    IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT: `${engineUrl}/live2d-engine`,
    IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT: `${engineUrl}/live2d-health`,
    IRIS_LOCAL_SUBTITLE_ENGINE_ENDPOINT: `${engineUrl}/subtitle-engine`,
    IRIS_LOCAL_SUBTITLE_ENGINE_HEALTH_ENDPOINT: `${engineUrl}/subtitle-health`,
    IRIS_OBS_BRIDGE_ENDPOINT: `${platformUrl}/obs/setup`,
    IRIS_OBS_BRIDGE_HEALTH_ENDPOINT: `${platformUrl}/obs/health`,
    IRIS_HTTP_ORIGIN: "http://127.0.0.1:8787",
    IRIS_OBS_SOURCE_NAME: "IRIS Overlay",
    IRIS_OBS_SCENE_NAME: "IRIS Scene",
    IRIS_OBS_SOURCE_WIDTH: "1280",
    IRIS_OBS_SOURCE_HEIGHT: "720",
    IRIS_OBS_SOURCE_FPS: "30",
    IRIS_ENABLE_HTTP_INGEST_SCHEDULER: "true",
    IRIS_YOUTUBE_LIVE_CHAT_SOURCE: "youtube_api",
    IRIS_YOUTUBE_VIDEO_ID: "fixture-production-video",
    IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT: `${platformUrl}/youtube/v3/liveChat/messages`,
    IRIS_YOUTUBE_VIDEOS_API_ENDPOINT: `${platformUrl}/youtube/v3/videos`,
    IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT: `${platformUrl}/oauth/token`,
    IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN: "fixture-production-refresh-token",
    IRIS_YOUTUBE_OAUTH_CLIENT_ID: "fixture-production-client",
    IRIS_YOUTUBE_OAUTH_CLIENT_SECRET: "fixture-production-client-secret",
    IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS: "20",
    IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH: youtubeCursorPath,
    IRIS_MEDIA_WATCH_ENDPOINT: `${platformUrl}/media/latest`,
    IRIS_EXTERNAL_TOPIC_ENDPOINT: `${platformUrl}/topics/latest`,
    IRIS_GAME_OBSERVATION_ENDPOINT: `${platformUrl}/vision/latest`,
    IRIS_GAME_OBSERVATION_METHOD: "POST",
    IRIS_GAME_OBSERVATION_MAX_EVENTS: "8",
    IRIS_GAME_CAPTURE_REGION: JSON.stringify({ x: 0, y: 0, width: 1280, height: 720 }),
    IRIS_ENABLE_GAME_CONTROL: "true",
    IRIS_AVAILABLE_GAME_ACTIONS: "wait,move_axis",
    IRIS_GAME_CONTROL_ADAPTER: "http",
    IRIS_GAME_CONTROL_ENDPOINT: `${bridgeUrl}/game-control`,
    IRIS_GAME_CONTROL_MIN_INTERVAL_MS: "250",
    IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS: "5000",
    IRIS_ENABLE_CANDIDATE_PERSISTENCE: "true",
    IRIS_ENABLE_RELATIONSHIP_MEMORY: "true",
    IRIS_MEMORY_STORE_PATH: memoryPath,
    IRIS_RELATIONSHIP_STORE_PATH: relationshipPath,
    IRIS_MEMORY_SEARCH_ADAPTER: "http_vector",
    IRIS_MEMORY_SEARCH_ENDPOINT: `${platformUrl}/memory-search`,
  };
  const adapters = createRuntimeAdaptersFromEnv(env);
  const streamState = createStreamState();
  const overlayEventBus = createOverlayEventBus();
  const runtime = createIrisRuntime({
    runtimeConfig: createRuntimeConfig(env),
    ...adapters,
    logger: { log() {} },
  });
  scheduler = createHttpIngestScheduler({
    runtime,
    streamState,
    sources: [
      { name: "youtube_live_chat_api", source: adapters.liveChatSource },
      { name: "vision_game_observation", source: adapters.gameObservationSource },
    ],
    batchLimit: 10,
    logger: { error() {} },
  });
  scheduler.start();
  const tick = await scheduler.tickNow("production_loop_fixture_tick");
  const worker = createLocalBridgeEngineWorker({
    outboxDir,
    artifactDir,
    ttsEngineEndpoint: `${engineUrl}/tts-engine`,
    live2dEngineEndpoint: `${engineUrl}/live2d-engine`,
    subtitleEngineEndpoint: `${engineUrl}/subtitle-engine`,
  });
  const workerReport = await worker.processUntilIdle({ maxPasses: 3, limitPerKind: 20 });
  const manifestResponse = await fetch(`${bridgeUrl}/event-render-manifests/latest`);
  const manifestBody = await manifestResponse.json();
  const manifestReport = manifestBody.event_render_manifest_report;
  const latestManifest = JSON.parse(
    readFileSync(join(artifactDir, "latest_event_render_manifest.json"), "utf8")
  );
  const artifactDelivery = {
    tts: await fetchArtifactSummary(`${bridgeUrl}/event-render-manifests/latest/artifact/tts`),
    live2d: await fetchArtifactSummary(
      `${bridgeUrl}/event-render-manifests/latest/artifact/live2d`
    ),
    subtitle: await fetchArtifactSummary(
      `${bridgeUrl}/event-render-manifests/latest/artifact/subtitle`
    ),
  };
  const bridgeStatusResponse = await fetch(`${bridgeUrl}/status`);
  const bridgeStatusBody = await bridgeStatusResponse.json();
  const liveChatStatus = adapters.liveChatSource.status();
  const memoryRecords = runtime.memoryRecords(200);
  const relationshipProfiles = runtime.relationshipProfiles();
  const persistenceStatus = createPersistenceStatus({
    capabilities: runtime.capabilities(),
    memoryRecordCount: memoryRecords.length,
    relationshipProfileCount: relationshipProfiles.length,
    replayEntryCount: runtime.replayEntries(200).length,
    candidateReviewStats: runtime.candidateReviewStats(),
    memoryStoreStatus: runtime.memoryStoreStatus(),
    relationshipStoreStatus: runtime.relationshipStoreStatus(),
  });
  assertPersistenceStatusSafe(persistenceStatus, "production loop persistence status");
  const state = streamState.get();
  overlayEventBus.publish(createOverlayDisplayEvent(state));
  const productionLiveReadiness = await createProductionLiveReadinessReport({
    env,
    runtime,
    streamState,
    httpIngestScheduler: scheduler,
    overlayEventBus,
    gameControlAdapterStatus: adapters.gameControlAdapter.status?.() ?? null,
    probeMode: "fixture_post",
  });
  assertProductionLiveReadinessReportSafe(
    productionLiveReadiness,
    "production loop live readiness"
  );

  const report = {
        ok: tick.ok === true,
        platform_counts: platformCounts,
        engine_counts: engineCounts,
        ingest_summary: {
          processed_count: tick.processed_count,
          duplicate_count: tick.duplicate_count,
          top_priority: tick.status.last_priority_summary.top_priority,
          by_band: tick.status.last_priority_summary.by_band,
          processed: tick.processed.map((item) => ({
            source: item.source,
            payload_kind: item.payload_kind,
            event_priority: item.event_priority,
            final_decision: item.final_decision,
            boundary_audit_status: item.boundary_audit_status,
          })),
          source_statuses: tick.status.source_statuses.map((sourceStatus) => ({
            name: sourceStatus.name,
            source_kind: sourceStatus.source_kind,
            telemetry_available: sourceStatus.telemetry_available,
            ingest_readiness_status: sourceStatus.ingest_readiness_status,
            local_endpoint_policy: sourceStatus.local_endpoint_policy,
            local_endpoint_policy_status: sourceStatus.local_endpoint_policy_status,
            vision_endpoint_scope: sourceStatus.vision_endpoint_scope,
            vision_endpoint_locality_ok: sourceStatus.vision_endpoint_locality_ok,
            last_comment_count: sourceStatus.last_comment_count,
            last_support_event_count: sourceStatus.last_support_event_count,
            last_support_event_type_counts: sourceStatus.last_support_event_type_counts,
            support_event_type_counts: sourceStatus.support_event_type_counts,
            last_support_amount_source_counts:
              sourceStatus.last_support_amount_source_counts,
            support_amount_source_counts: sourceStatus.support_amount_source_counts,
            last_ignored_count: sourceStatus.last_ignored_count,
            last_ignored_event_type_counts: sourceStatus.last_ignored_event_type_counts,
            ignored_event_type_counts: sourceStatus.ignored_event_type_counts,
            request_count: sourceStatus.request_count,
            video_discovery_request_count: sourceStatus.video_discovery_request_count,
            live_chat_request_count: sourceStatus.live_chat_request_count,
            cursor_store_configured: sourceStatus.cursor_store_configured,
            cursor_store_status: sourceStatus.cursor_store_status,
            cursor_store_write_attention: sourceStatus.cursor_store_write_attention,
            last_cursor_write_result: sourceStatus.last_cursor_write_result,
            last_observation_count: sourceStatus.last_observation_count,
            last_observation_telemetry: sourceStatus.last_observation_telemetry,
            capture_request_summary: sourceStatus.capture_request_summary,
          })),
        },
        youtube_status_summary: {
          auth_mode: liveChatStatus.auth_mode,
          ingest_readiness_status: liveChatStatus.ingest_readiness_status,
          live_chat_id_resolved: liveChatStatus.live_chat_id_resolved,
          request_count: liveChatStatus.request_count,
          video_discovery_request_count: liveChatStatus.video_discovery_request_count,
          live_chat_request_count: liveChatStatus.live_chat_request_count,
          last_item_count: liveChatStatus.last_item_count,
          last_ignored_count: liveChatStatus.last_ignored_count,
          last_ignored_event_type_counts: liveChatStatus.last_ignored_event_type_counts,
          last_comment_count: liveChatStatus.last_comment_count,
          last_support_event_count: liveChatStatus.last_support_event_count,
          last_support_event_type_counts: liveChatStatus.last_support_event_type_counts,
          last_support_amount_source_counts:
            liveChatStatus.last_support_amount_source_counts,
          ignored_event_count: liveChatStatus.ignored_event_count,
          ignored_event_type_counts: liveChatStatus.ignored_event_type_counts,
          support_event_count: liveChatStatus.support_event_count,
          support_event_type_counts: liveChatStatus.support_event_type_counts,
          support_amount_source_counts: liveChatStatus.support_amount_source_counts,
          cursor_store_configured: liveChatStatus.cursor_store_configured,
          cursor_store_status: liveChatStatus.cursor_store_status,
          cursor_store_write_attention: liveChatStatus.cursor_store_write_attention,
          last_cursor_write_result: liveChatStatus.last_cursor_write_result,
          oauth_refresh_count: liveChatStatus.oauth_provider_status?.refresh_count ?? null,
        },
        vision_capture_summary: {
          schema: lastVisionCaptureRequest?.schema ?? null,
          request_kind: lastVisionCaptureRequest?.request_kind ?? null,
          raw_frame_policy: lastVisionCaptureRequest?.raw_frame_policy ?? null,
          max_detected_events: lastVisionCaptureRequest?.max_detected_events ?? null,
        },
        persistence_summary: {
          memory_record_count: memoryRecords.length,
          relationship_profile_count: relationshipProfiles.length,
          public_status: {
            status: persistenceStatus.status,
            persistence_readiness_status: persistenceStatus.persistence_readiness_status,
            public_counts: persistenceStatus.public_counts,
            memory_activity_available:
              persistenceStatus.store_limits.memory.activity.activity_available,
            memory_latest_activity_age_ms:
              persistenceStatus.store_limits.memory.activity.latest_activity_age_ms,
            relationship_activity_available:
              persistenceStatus.store_limits.relationship.activity.activity_available,
            relationship_latest_activity_age_ms:
              persistenceStatus.store_limits.relationship.activity.latest_activity_age_ms,
            boundary_policy: persistenceStatus.boundary_policy,
          },
          relationship_level_counts:
            summarizeRelationshipLevelCounts(relationshipProfiles),
          relationship_interaction_summary:
            summarizeRelationshipInteractionCounts(relationshipProfiles),
        },
        game_control_summary: summarizeGameControlStatus(
          bridgeStatusBody.local_bridge_status.game_control
        ),
        game_control_adapter_status: adapters.gameControlAdapter.status?.() ?? null,
        production_live_readiness_summary: {
          overall_status: productionLiveReadiness.overall_status,
          next_priority: productionLiveReadiness.next_priority,
          next_stage_id: productionLiveReadiness.next_stage_id,
          next_check_script: productionLiveReadiness.next_check_script,
          next_launch_script: productionLiveReadiness.next_launch_script,
          next_readiness_script: productionLiveReadiness.next_readiness_script,
          next_configure_env_count:
            productionLiveReadiness.next_configure_env.length,
          ready_stage_count: productionLiveReadiness.ready_stage_count,
          attention_stage_count: productionLiveReadiness.attention_stage_count,
          stage_statuses: productionLiveReadiness.priority_stages.map((stage) => ({
            stage_id: stage.stage_id,
            ready: stage.ready,
            stage_live_readiness_status: stage.stage_live_readiness_status,
            gate_count: stage.gate_count,
            ready_gate_count: stage.ready_gate_count,
            attention_gate_count: stage.attention_gate_count,
            first_attention_gate_id: stage.first_attention_gate_id,
            first_attention_gate_status: stage.first_attention_gate_status,
            first_attention_blocking_stage: stage.first_attention_blocking_stage,
            first_attention_check_script: stage.first_attention_check_script,
            gate_statuses: stage.gate_summaries.map((gate) => ({
              gate_id: gate.gate_id,
              ready: gate.ready,
              gate_status: gate.gate_status,
              blocking_stage: gate.blocking_stage,
            })),
          })),
        },
        bridge_summary: {
          total_received: bridgeStatusBody.local_bridge_status.total_received,
          tts_received_count: bridgeStatusBody.local_bridge_status.adapters.tts.received_count,
          live2d_received_count:
            bridgeStatusBody.local_bridge_status.adapters.live2d.received_count,
          subtitle_received_count:
            bridgeStatusBody.local_bridge_status.adapters.subtitle.received_count,
        },
        worker_summary: {
          worker_readiness_status: workerReport.worker_readiness_status,
          adapter_readiness_status: workerReport.adapter_readiness_status,
          processed_count: workerReport.processed_count,
          by_adapter: workerReport.by_adapter,
          engine_modes: workerReport.engine_modes,
          event_render_manifest_count: workerReport.event_render_manifest_count,
          final_event_render_manifest_count:
            workerReport.final_status.event_render_manifests.manifest_count,
          reached_idle: workerReport.reached_idle,
          final_pending_count: workerReport.final_status.outbox_queue.total_pending_count,
        },
        render_manifest_summary: {
          report_status: manifestResponse.status,
          report_ok: manifestBody.ok === true,
          obs_pickup_status: manifestReport?.obs_pickup_status ?? null,
          obs_handoff_readiness_status:
            manifestReport?.obs_handoff_readiness_status ?? null,
          obs_pickup_ready:
            manifestReport?.latest_manifest_summary?.obs_pickup_ready === true,
          manifest_id_present: String(latestManifest.manifest_id ?? "").trim() !== "",
          event_id_present: String(latestManifest.event_id ?? "").trim() !== "",
          obs_pickup_blocking_adapter_kinds:
            manifestReport?.latest_manifest_summary?.obs_pickup_blocking_adapter_kinds ?? null,
          obs_pickup_blocking_adapter_count:
            manifestReport?.latest_manifest_summary?.obs_pickup_blocking_adapter_count ?? null,
          obs_pickup_blocking_status_by_adapter:
            manifestReport?.latest_manifest_summary?.obs_pickup_blocking_status_by_adapter ?? null,
          manifest_freshness_status:
            manifestReport?.latest_manifest_summary?.manifest_freshness_status ?? null,
          max_manifest_age_ms:
            manifestReport?.latest_manifest_summary?.max_manifest_age_ms ?? null,
          stale_manifest_guard_enabled:
            manifestReport?.latest_manifest_summary?.max_manifest_age_ms !== null,
          artifact_freshness_status_by_adapter:
            manifestReport?.latest_manifest_summary?.artifact_freshness_status_by_adapter ?? null,
          all_artifacts_fresh_for_pickup:
            manifestReport?.latest_manifest_summary?.all_artifacts_fresh_for_pickup === true,
          artifact_contract_status_by_adapter:
            manifestReport?.latest_manifest_summary?.artifact_contract_status_by_adapter ?? null,
          all_artifacts_contract_valid_for_pickup:
            manifestReport?.latest_manifest_summary?.all_artifacts_contract_valid_for_pickup === true,
          artifact_content_type_by_adapter:
            manifestReport?.latest_manifest_summary?.artifact_content_type_by_adapter ?? null,
          artifact_size_bytes_by_adapter:
            manifestReport?.latest_manifest_summary?.artifact_size_bytes_by_adapter ?? null,
        },
        artifact_delivery_summary: artifactDelivery,
        final_state_summary: {
          last_payload_kind: state.last_payload_kind,
          overlay_health: state.overlay_health ?? null,
          human_likeness_score:
            state.last_human_likeness_evaluation?.total_human_likeness_score ?? null,
        },
        production_handoff_summary: {
          schema: "iris_production_loop_handoff_summary_v1",
          fixture_loop_only: true,
          direct_youtube_api_fixture_only: true,
          oauth_fixture_only: true,
          real_obs_operation_not_started: true,
          real_live2d_process_not_started: true,
          real_voicevox_process_not_started: true,
          real_game_or_os_input_not_started: true,
          runtime_packets_remain_adapter_gated: true,
          memory_and_relationship_candidates_remain_gated: true,
          input_action_candidates_never_forwarded_directly: true,
          approved_game_actions_schema_only: true,
          raw_frames_not_exposed: true,
          raw_youtube_text_not_exposed: true,
          endpoint_values_not_exposed: true,
          secret_values_not_exposed: true,
          production_live_readiness_status:
            productionLiveReadiness.overall_status,
          ready_stage_count: productionLiveReadiness.ready_stage_count,
          attention_stage_count: productionLiveReadiness.attention_stage_count,
          foundation_ready:
            readyStageById(productionLiveReadiness, "tts_live2d_obs_foundation"),
          youtube_ready:
            readyStageById(productionLiveReadiness, "youtube_comments_and_support"),
          persistence_ready: readyStageById(
            productionLiveReadiness,
            "memory_and_relationship_persistence"
          ),
          gameplay_ready: readyStageById(
            productionLiveReadiness,
            "vision_and_safe_game_control"
          ),
          youtube_poll_count: platformCounts.live_chat_poll,
          vision_capture_count: platformCounts.vision_capture,
          tts_engine_fixture_call_count: engineCounts.tts,
          live2d_engine_fixture_call_count: engineCounts.live2d,
          subtitle_engine_fixture_call_count: engineCounts.subtitle,
          processed_event_count: tick.processed_count,
          support_event_count: liveChatStatus.support_event_count,
          memory_record_count: memoryRecords.length,
          relationship_profile_count: relationshipProfiles.length,
          bridge_received_count: bridgeStatusBody.local_bridge_status.total_received,
          worker_processed_count: workerReport.processed_count,
          render_manifest_count: workerReport.event_render_manifest_count,
          output_adapter_job_count:
            bridgeStatusBody.local_bridge_status.adapters.tts.received_count +
            bridgeStatusBody.local_bridge_status.adapters.live2d.received_count +
            bridgeStatusBody.local_bridge_status.adapters.subtitle.received_count,
          expected_output_adapter_job_count: tick.processed_count * 3,
          obs_pickup_ready:
            manifestReport?.latest_manifest_summary?.obs_pickup_ready === true,
          streaming_loop_verified_through_obs_pickup:
            platformCounts.live_chat_poll === 1 &&
            tick.processed_count > 0 &&
            bridgeStatusBody.local_bridge_status.adapters.tts.received_count ===
              tick.processed_count &&
            bridgeStatusBody.local_bridge_status.adapters.live2d.received_count ===
              tick.processed_count &&
            bridgeStatusBody.local_bridge_status.adapters.subtitle.received_count ===
              tick.processed_count &&
            workerReport.event_render_manifest_count === tick.processed_count &&
            manifestReport?.latest_manifest_summary?.obs_pickup_ready === true,
          next_stage_id: productionLiveReadiness.next_stage_id,
          next_check_script: productionLiveReadiness.next_check_script,
        },
        boundary_policy: {
          youtube_api_read_only: true,
          moderation_items_ignored: true,
          vision_bridge_read_only: true,
          game_control_approved_schema_only: true,
          tts_live2d_jobs_validated_before_engine: true,
          persistence_approved_schema_only: true,
          no_endpoint_or_secret_values_in_report: true,
          render_manifest_paths_hidden: true,
          stale_render_manifest_rejected_when_guard_configured: true,
          stale_render_artifact_rejected_when_guard_configured: true,
          invalid_render_artifact_rejected_before_delivery: true,
          production_handoff_summary_counts_only: true,
        },
      };
  scheduler.stop();
  assertProductionLoopReportSafe(report);
  console.log(JSON.stringify(report, null, 2));
} finally {
  scheduler?.stop?.();
  await closeServer(bridgeServer);
  await closeServer(engineServer);
  await closeServer(platformServer);
  if (process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function createLiveChatItems() {
  return [
    {
      id: "production-loop-comment-1",
      snippet: {
        type: "textMessageEvent",
        displayMessage: "IRIS, tell us what you see!",
        publishedAt: "2026-04-30T00:10:01Z",
      },
      authorDetails: {
        channelId: "viewer-comment-prod",
        displayName: "Loop Commenter",
      },
    },
    {
      id: "production-loop-superchat-1",
      snippet: {
        displayMessage: "Super Chat from Loop Supporter",
        publishedAt: "2026-04-30T00:10:02Z",
        superChatDetails: {
          amountMicros: "1000000000",
          currency: "JPY",
          userComment: "Big laugh for that lava panic!",
        },
      },
      authorDetails: {
        channelId: "viewer-support-prod",
        displayName: "Loop Supporter",
      },
    },
    {
      id: "production-loop-member-1",
      snippet: {
        displayMessage: "Member milestone",
        publishedAt: "2026-04-30T00:10:03Z",
        memberMilestoneChatDetails: {
          userComment: "IRIS, remember our clutch moments.",
        },
      },
      authorDetails: {
        channelId: "viewer-member-prod",
        displayName: "Loop Member",
      },
    },
    {
      id: "production-loop-sticker-1",
      snippet: {
        displayMessage: "Super Sticker",
        publishedAt: "2026-04-30T00:10:04Z",
        superStickerDetails: {
          amountMicros: "500000000",
          currency: "JPY",
        },
      },
      authorDetails: {
        channelId: "viewer-sticker-prod",
        displayName: "Loop Sticker Fan",
      },
    },
    {
      id: "production-loop-gift-1",
      snippet: {
        displayMessage: "Gifted memberships to chat",
        publishedAt: "2026-04-30T00:10:05Z",
        membershipGiftingDetails: {
          giftMembershipsCount: 5,
        },
      },
      authorDetails: {
        channelId: "viewer-gift-prod",
        displayName: "Loop Gift Giver",
      },
    },
    {
      id: "production-loop-deleted-1",
      snippet: {
        publishedAt: "2026-04-30T00:10:06Z",
        messageDeletedDetails: {
          deletedMessageId: "production-loop-deleted-message-id",
        },
      },
      authorDetails: {
        channelId: "viewer-deleted-prod",
        displayName: "Deleted Viewer",
      },
    },
    {
      id: "production-loop-ban-1",
      snippet: {
        publishedAt: "2026-04-30T00:10:07Z",
        userBannedDetails: {
          bannedUserDetails: {
            channelId: "viewer-ban-prod",
            displayName: "Banned Viewer",
          },
          banType: "permanent",
        },
      },
      authorDetails: {
        channelId: "viewer-ban-prod",
        displayName: "Banned Viewer",
      },
    },
  ];
}

async function readRequestJson(request) {
  const raw = await readRequestText(request);
  return raw ? JSON.parse(raw) : {};
}

async function readRequestText(request) {
  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) raw += chunk;
  return raw;
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function createRendererCue(body) {
  return {
    schema: "iris_live2d_renderer_cue_v1",
    motion: {
      style: body.motion_style || "idle_breath",
      intensity: Number(body.motion_intensity ?? 0),
      body_state_id: body.body_state_id || "",
    },
    expression: {
      profile_id: body.expression_profile_id || "neutral",
      autonomous_state_id: body.autonomous_state_id || "none",
    },
    timing: {
      total_duration_ms: Number(body.timing?.total_duration_ms ?? 1200),
      hold_ms: Number(body.timing?.hold_ms ?? 0),
    },
    boundary_policy: {
      renderer_cue_only: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function createSubtitleVtt(body) {
  const durationMs = Number(body.timing?.total_duration_ms ?? 1200);
  const endMs = Math.max(1000, Math.min(60_000, durationMs));
  return `WEBVTT

00:00:00.000 --> ${formatVttTimestamp(endMs)}
IRIS subtitle engine check
`;
}

function formatVttTimestamp(ms) {
  const value = Math.max(0, Number(ms) || 0);
  const hours = Math.floor(value / 3_600_000);
  const minutes = Math.floor((value % 3_600_000) / 60_000);
  const seconds = Math.floor((value % 60_000) / 1000);
  const millis = Math.floor(value % 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

async function fetchArtifactSummary(url) {
  const response = await fetch(url);
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    status: response.status,
    content_type: response.headers.get("content-type") ?? "",
    adapter_kind: response.headers.get("x-iris-adapter-kind") ?? "",
    artifact_kind: response.headers.get("x-iris-artifact-kind") ?? "",
    manifest_id_present: String(response.headers.get("x-iris-manifest-id") ?? "").trim() !== "",
    event_id_present: String(response.headers.get("x-iris-event-id") ?? "").trim() !== "",
    bytes_available: bytes.length > 0,
    content_length: bytes.length,
  };
}

function summarizeRelationshipLevelCounts(profiles) {
  const counts = {};
  for (const profile of profiles) {
    const level =
      typeof profile.relationship_level === "string" &&
      profile.relationship_level.length > 0
        ? profile.relationship_level
        : "unknown";
    counts[level] = (counts[level] ?? 0) + 1;
  }
  return counts;
}

function summarizeRelationshipInteractionCounts(profiles) {
  const interactionCounts = profiles
    .map((profile) => profile.interaction_count)
    .filter((count) => Number.isInteger(count) && count >= 0);
  const total_interaction_count = interactionCounts.reduce(
    (sum, count) => sum + count,
    0
  );
  return {
    profile_count: profiles.length,
    total_interaction_count,
    min_interaction_count:
      interactionCounts.length > 0 ? Math.min(...interactionCounts) : 0,
    max_interaction_count:
      interactionCounts.length > 0 ? Math.max(...interactionCounts) : 0,
  };
}

function summarizeGameControlStatus(status) {
  return {
    received_count: status.received_count,
    last_bridge_status: status.last_bridge_status,
    last_action_kind: status.last_action_kind,
    executed: status.executed,
    simulated: status.simulated,
    side_effects_enabled: status.side_effects_enabled,
  };
}

function assertProductionLoopReportSafe(report) {
  for (const field of Object.keys(report)) {
    if (!PRODUCTION_LOOP_REPORT_FIELDS.has(field)) {
      throw new Error(`Unexpected production loop report field: ${field}`);
    }
  }

  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    platformUrl,
    engineUrl,
    bridgeUrl,
    tempDir,
    outboxDir,
    artifactDir,
    memoryPath,
    relationshipPath,
    youtubeCursorPath,
    "fixture-production-refresh-token",
    "fixture-production-client-secret",
    "fixture-production-loop-access-token",
    "fixture-production-next-page",
    "IRIS, tell us what you see",
    "Big laugh for that lava panic",
    "remember our clutch moments",
    "one heart, lava visible",
    "RIFF1234WAVEdata",
    "WEBVTT",
    "viewer:",
    "viewer-support-prod",
    "viewer-member-prod",
    "viewer-sticker-prod",
    "viewer-gift-prod",
    "viewer-comment-prod",
    "linked_identity_id",
    "production-loop-game-1",
    "last_event_id",
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"approved_memory_record"',
    '"approved_relationship_record"',
    '"event_id"',
    '"trace_id"',
    "memory_records",
    "relationship_profiles",
    "recent_summaries",
    '"store_path"',
    '"filePath"',
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`production loop report leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
  if (report.render_manifest_summary.obs_pickup_status !== "ready") {
    throw new Error("production loop render manifest was not ready for OBS pickup");
  }
  if (report.render_manifest_summary.obs_handoff_readiness_status !== "ready") {
    throw new Error("production loop OBS handoff readiness was not ready");
  }
  if (report.render_manifest_summary.max_manifest_age_ms !== renderManifestMaxAgeMs) {
    throw new Error("production loop render manifest stale guard max age was not reported");
  }
  if (report.render_manifest_summary.all_artifacts_fresh_for_pickup !== true) {
    throw new Error("production loop render artifacts were not fresh for OBS pickup");
  }
  if (report.render_manifest_summary.all_artifacts_contract_valid_for_pickup !== true) {
    throw new Error("production loop render artifacts were not contract-valid for OBS pickup");
  }
  if (report.render_manifest_summary.obs_pickup_blocking_adapter_count !== 0) {
    throw new Error("production loop render manifest reported unexpected OBS pickup blockers");
  }
  for (const [kind, summary] of Object.entries(report.artifact_delivery_summary)) {
    if (summary.status !== 200 || summary.bytes_available !== true) {
      throw new Error(`production loop artifact delivery failed for ${kind}`);
    }
  }
  const youtubeSource = report.ingest_summary.source_statuses.find(
    (sourceStatus) => sourceStatus.name === "youtube_live_chat_api"
  );
  if (!youtubeSource) {
    throw new Error("production loop report missing YouTube source status");
  }
  if (
    youtubeSource.ingest_readiness_status !== "polling_cooldown" ||
    report.youtube_status_summary.ingest_readiness_status !== "polling_cooldown"
  ) {
    throw new Error("production loop report missing YouTube ingest readiness status");
  }
  if (
    youtubeSource.cursor_store_configured !== true ||
    report.youtube_status_summary.cursor_store_configured !== true ||
    youtubeSource.cursor_store_write_attention !== false ||
    report.youtube_status_summary.cursor_store_write_attention !== false ||
    youtubeSource.cursor_store_status?.has_persisted_cursor !== true ||
    report.youtube_status_summary.cursor_store_status?.has_persisted_page_token !== true ||
    youtubeSource.last_cursor_write_result?.written !== true ||
    report.youtube_status_summary.last_cursor_write_result?.written !== true
  ) {
    throw new Error("production loop report missing safe YouTube cursor-store telemetry");
  }
  if (
    youtubeSource.last_support_amount_source_counts?.micros !== 2 ||
    youtubeSource.last_support_amount_source_counts?.membership_count !== 1 ||
    youtubeSource.last_support_amount_source_counts?.unknown !== 1 ||
    youtubeSource.support_amount_source_counts?.micros !== 2 ||
    youtubeSource.support_amount_source_counts?.membership_count !== 1 ||
    report.youtube_status_summary.last_support_amount_source_counts?.micros !== 2 ||
    report.youtube_status_summary.last_support_amount_source_counts?.membership_count !== 1 ||
    report.youtube_status_summary.support_amount_source_counts?.unknown !== 1
  ) {
    throw new Error("production loop report missing support amount source telemetry");
  }
  const visionSource = report.ingest_summary.source_statuses.find(
    (sourceStatus) => sourceStatus.name === "vision_game_observation"
  );
  const telemetry = visionSource?.last_observation_telemetry;
  if (visionSource?.ingest_readiness_status !== "active") {
    throw new Error("production loop report missing vision ingest readiness status");
  }
  if (
    visionSource.local_endpoint_policy !== "loopback_or_private_network_only" ||
    visionSource.local_endpoint_policy_status !== "all_allowed" ||
    visionSource.vision_endpoint_scope !== "loopback" ||
    visionSource.vision_endpoint_locality_ok !== true
  ) {
    throw new Error("production loop report missing safe vision local endpoint policy telemetry");
  }
  if (
    telemetry?.observation_count !== 1 ||
    telemetry?.with_frame_age_count !== 1 ||
    telemetry?.without_frame_age_count !== 0 ||
    telemetry?.average_frame_age_ms !== 38 ||
    telemetry?.max_frame_age_ms !== 38
  ) {
    throw new Error("production loop report missing vision frame-age telemetry");
  }
  if (
    report.persistence_summary.public_status?.status !==
      "active_with_memory_and_relationships" ||
    report.persistence_summary.public_status?.persistence_readiness_status !==
      "active_with_memory_and_relationships" ||
    report.persistence_summary.public_status?.public_counts?.memory_record_count !==
      report.persistence_summary.memory_record_count ||
    report.persistence_summary.public_status?.public_counts?.relationship_profile_count !==
      report.persistence_summary.relationship_profile_count ||
    report.persistence_summary.public_status?.memory_activity_available !== true ||
    report.persistence_summary.public_status?.relationship_activity_available !== true
  ) {
    throw new Error("production loop report missing persistence public activity telemetry");
  }
  if (
    report.persistence_summary.relationship_level_counts?.bounded !==
      report.persistence_summary.relationship_profile_count ||
    report.persistence_summary.relationship_interaction_summary?.profile_count !==
      report.persistence_summary.relationship_profile_count ||
    report.persistence_summary.relationship_interaction_summary
      ?.total_interaction_count !==
      report.persistence_summary.relationship_profile_count ||
    report.persistence_summary.relationship_interaction_summary
      ?.min_interaction_count !== 1 ||
    report.persistence_summary.relationship_interaction_summary
      ?.max_interaction_count !== 1
  ) {
    throw new Error(
      "production loop report missing counts-only relationship telemetry"
    );
  }
  if (
    report.game_control_summary?.received_count !== 1 ||
    report.game_control_summary?.last_bridge_status !== "accepted_simulated" ||
    report.game_control_summary?.last_action_kind !== "move_axis" ||
    report.game_control_summary?.executed !== false ||
    report.game_control_summary?.simulated !== true ||
    report.game_control_summary?.side_effects_enabled !== false
  ) {
    throw new Error("production loop report missing safe game-control telemetry");
  }
  const liveReadinessReady =
    report.production_live_readiness_summary?.overall_status ===
      "ready_for_live_operation" &&
    report.production_live_readiness_summary?.ready_stage_count === 4 &&
    report.production_live_readiness_summary?.attention_stage_count === 0 &&
    report.production_live_readiness_summary?.next_priority === null &&
    report.production_live_readiness_summary?.next_stage_id === null &&
    report.production_live_readiness_summary?.next_configure_env_count === 0;
  const liveReadinessFixtureAttention =
    report.production_live_readiness_summary?.overall_status ===
      "foundation_attention" &&
    report.production_live_readiness_summary?.ready_stage_count === 3 &&
    report.production_live_readiness_summary?.attention_stage_count === 1 &&
    report.production_live_readiness_summary?.next_priority === 1 &&
    report.production_live_readiness_summary?.next_stage_id ===
      "tts_live2d_obs_foundation" &&
    report.production_live_readiness_summary?.next_check_script ===
      "npm run dev:production:probe" &&
    report.production_live_readiness_summary?.next_configure_env_count === 0;
  if (!liveReadinessReady && !liveReadinessFixtureAttention) {
    throw new Error("production loop report missing safe live-readiness handoff telemetry");
  }
  const expectedFoundationReady = liveReadinessReady;
  if (
    report.production_live_readiness_summary?.overall_status !==
    report.production_handoff_summary?.production_live_readiness_status
  ) {
    throw new Error("production loop live-readiness handoff status mismatch");
  }
  const readyStages = new Map(
    report.production_live_readiness_summary.stage_statuses.map((stage) => [
      stage.stage_id,
      stage.ready,
    ])
  );
  const stageGateCounts = new Map(
    report.production_live_readiness_summary.stage_statuses.map((stage) => [
      stage.stage_id,
      {
        gateCount: stage.gate_count,
        readyGateCount: stage.ready_gate_count,
        attentionGateCount: stage.attention_gate_count,
      },
    ])
  );
  if (
    readyStages.get("tts_live2d_obs_foundation") !== expectedFoundationReady ||
    readyStages.get("youtube_comments_and_support") !== true ||
    readyStages.get("memory_and_relationship_persistence") !== true ||
    readyStages.get("vision_and_safe_game_control") !== true
  ) {
    throw new Error("production loop report missing expected live-readiness stage statuses");
  }
  if (
    stageGateCounts.get("tts_live2d_obs_foundation")?.readyGateCount !==
      (expectedFoundationReady ? 4 : 3) ||
    stageGateCounts.get("youtube_comments_and_support")?.readyGateCount !== 5 ||
    stageGateCounts.get("memory_and_relationship_persistence")?.readyGateCount !== 8 ||
    stageGateCounts.get("vision_and_safe_game_control")?.readyGateCount !== 8 ||
    report.production_live_readiness_summary.stage_statuses.some(
      (stage) =>
        (stage.stage_id === "tts_live2d_obs_foundation"
          ? stage.attention_gate_count !== (expectedFoundationReady ? 0 : 1)
          : stage.attention_gate_count !== 0) ||
        !Array.isArray(stage.gate_statuses) ||
        stage.gate_statuses.length !== stage.gate_count ||
        stage.gate_statuses.some((gate) =>
          stage.stage_id === "tts_live2d_obs_foundation" &&
          gate.gate_id === "production_probe_gate" &&
          expectedFoundationReady !== true
            ? gate.ready !== false
            : gate.ready !== true
        )
    )
  ) {
    throw new Error("production loop report missing live-readiness gate count telemetry");
  }
  assertBoundaryPolicy(report.boundary_policy, [
    "youtube_api_read_only",
    "moderation_items_ignored",
    "vision_bridge_read_only",
    "game_control_approved_schema_only",
    "tts_live2d_jobs_validated_before_engine",
    "persistence_approved_schema_only",
    "no_endpoint_or_secret_values_in_report",
    "render_manifest_paths_hidden",
    "stale_render_manifest_rejected_when_guard_configured",
    "stale_render_artifact_rejected_when_guard_configured",
    "invalid_render_artifact_rejected_before_delivery",
    "production_handoff_summary_counts_only",
  ], "production loop report");
  assertProductionHandoffSummarySafe(report.production_handoff_summary, report);
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error(`${context}: boundary policy required`);
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new Error(`${context}: ${field} boundary required`);
    }
  }
}

function readyStageById(productionLiveReadiness, stageId) {
  return (
    productionLiveReadiness.priority_stages.find(
      (stage) => stage.stage_id === stageId
    )?.ready === true
  );
}

function assertProductionHandoffSummarySafe(summary, report) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new Error("production loop handoff summary is required");
  }
  if (summary.schema !== "iris_production_loop_handoff_summary_v1") {
    throw new Error("production loop handoff summary schema mismatch");
  }
  for (const field of [
    "fixture_loop_only",
    "direct_youtube_api_fixture_only",
    "oauth_fixture_only",
    "real_obs_operation_not_started",
    "real_live2d_process_not_started",
    "real_voicevox_process_not_started",
    "real_game_or_os_input_not_started",
    "runtime_packets_remain_adapter_gated",
    "memory_and_relationship_candidates_remain_gated",
    "input_action_candidates_never_forwarded_directly",
    "approved_game_actions_schema_only",
    "raw_frames_not_exposed",
    "raw_youtube_text_not_exposed",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
    "youtube_ready",
    "persistence_ready",
    "gameplay_ready",
    "obs_pickup_ready",
    "streaming_loop_verified_through_obs_pickup",
  ]) {
    if (summary[field] !== true) {
      throw new Error(`production loop handoff flag failed: ${field}`);
    }
  }
  if (summary.foundation_ready !== (report.production_live_readiness_summary.ready_stage_count === 4)) {
    throw new Error("production loop handoff foundation readiness mismatch");
  }
  for (const field of [
    "ready_stage_count",
    "attention_stage_count",
    "youtube_poll_count",
    "vision_capture_count",
    "tts_engine_fixture_call_count",
    "live2d_engine_fixture_call_count",
    "processed_event_count",
    "support_event_count",
    "memory_record_count",
    "relationship_profile_count",
    "bridge_received_count",
    "worker_processed_count",
    "render_manifest_count",
    "output_adapter_job_count",
    "expected_output_adapter_job_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new Error(`production loop handoff count invalid: ${field}`);
    }
  }
  if (
    summary.production_live_readiness_status !==
      report.production_live_readiness_summary.overall_status ||
    summary.ready_stage_count !==
      report.production_live_readiness_summary.ready_stage_count ||
    summary.attention_stage_count !==
      report.production_live_readiness_summary.attention_stage_count ||
    summary.youtube_poll_count !== report.platform_counts.live_chat_poll ||
    summary.vision_capture_count !== report.platform_counts.vision_capture ||
    summary.tts_engine_fixture_call_count !== report.engine_counts.tts ||
    summary.live2d_engine_fixture_call_count !== report.engine_counts.live2d ||
    summary.processed_event_count !== report.ingest_summary.processed_count ||
    summary.support_event_count !==
      report.youtube_status_summary.support_event_count ||
    summary.memory_record_count !== report.persistence_summary.memory_record_count ||
    summary.relationship_profile_count !==
      report.persistence_summary.relationship_profile_count ||
    summary.bridge_received_count !== report.bridge_summary.total_received ||
    summary.worker_processed_count !== report.worker_summary.processed_count ||
    summary.render_manifest_count !==
      report.worker_summary.event_render_manifest_count ||
    summary.output_adapter_job_count !==
      report.bridge_summary.tts_received_count +
        report.bridge_summary.live2d_received_count +
        report.bridge_summary.subtitle_received_count ||
    summary.expected_output_adapter_job_count !==
      report.ingest_summary.processed_count * 3 ||
    summary.output_adapter_job_count !==
      summary.expected_output_adapter_job_count ||
    summary.next_stage_id !== report.production_live_readiness_summary.next_stage_id ||
    summary.next_check_script !==
      report.production_live_readiness_summary.next_check_script
  ) {
    throw new Error("production loop handoff summary totals mismatch");
  }
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
