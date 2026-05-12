import "../src/config/loadIrisEnv.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeYouTubeComment } from "../src/adapters/youtube/commentAdapter.js";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createLocalBridgeServer } from "../src/server/localBridgeServer.js";
import { createLocalBridgeEngineWorker } from "../src/server/localBridgeEngineWorker.js";
import { createLocalEngineHealthProbeReport } from "../src/server/localEngineHealthProbe.js";
import { listen } from "../src/server/httpServer.js";

const hasTtsEngine = Boolean(process.env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT);
const hasLive2dEngine = Boolean(process.env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT);
const REQUIRED_ENGINE_ENV = [
  "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
  "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
  "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
  "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
  "IRIS_LOCAL_TTS_ENGINE_API_KEY",
  "IRIS_LOCAL_LIVE2D_ENGINE_API_KEY",
  "IRIS_LOCAL_TTS_ENGINE_VOICE_ID",
  "IRIS_LOCAL_TTS_ENGINE_MODEL",
  "IRIS_LOCAL_TTS_ENGINE_LOCALE",
  "IRIS_LOCAL_LIVE2D_MODEL_ID",
  "IRIS_LOCAL_LIVE2D_SCENE_ID",
  "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
];
const EXPECTED_UNCONFIGURED_HANDOFF_FIELDS = new Set([
  "schema",
  "engine_probe_report_only",
  "configured",
  "real_engine_processes_not_started_by_probe",
  "real_obs_operation_not_started_by_probe",
  "runtime_adapter_packets_not_exposed",
  "no_game_or_os_input",
  "endpoint_values_not_exposed",
  "secret_values_not_exposed",
  "raw_jobs_not_exposed",
  "required_env_count",
  "next_check_script",
]);
const EXPECTED_CONFIGURED_HANDOFF_FIELDS = new Set([
  "schema",
  "engine_probe_report_only",
  "configured",
  "real_engine_processes_not_started_by_probe",
  "real_obs_operation_not_started_by_probe",
  "runtime_adapter_packets_not_exposed",
  "no_game_or_os_input",
  "endpoint_values_not_exposed",
  "secret_values_not_exposed",
  "raw_jobs_not_exposed",
  "engine_health_probe_count",
  "engine_health_pass_count",
  "engine_health_attention_count",
  "licensed_voice_source_status_configured",
  "voice_license_use_category_count",
  "voice_license_use_category_configured_count",
  "voice_license_use_category_missing_count",
  "attempted_count",
  "processed_count",
  "failed_count",
  "final_pending_count",
  "worker_readiness_status",
  "reached_idle",
  "next_check_script",
]);

if (isDirectExecution()) {
  await main();
}

async function main() {
  if (!hasTtsEngine && !hasLive2dEngine) {
    console.log(JSON.stringify(createUnconfiguredEngineProbeReport(), null, 2));
    return;
  }

  const baseDir = mkdtempSync(join(tmpdir(), "iris-engine-probe-"));
  const outboxDir = join(baseDir, "outbox");
  const artifactDir = join(baseDir, "artifacts");
  const bridgeServer = createLocalBridgeServer({ outboxDir, logger: { error() {} } });
  const bridgeAddress = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });
  const bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;

  try {
    const engineHealth = await createLocalEngineHealthProbeReport({ env: process.env });
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
      IRIS_MEMORY_SEARCH_ADAPTER: "local",
      IRIS_MEMORY_SEARCH_ENDPOINT: "",
      IRIS_MEDIA_WATCH_ENDPOINT: "",
      IRIS_EXTERNAL_TOPIC_ENDPOINT: "",
      IRIS_YOUTUBE_LIVE_CHAT_SOURCE: "",
      IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT: "",
      IRIS_YOUTUBE_VIDEO_ID: "",
      IRIS_YOUTUBE_LIVE_CHAT_ID: "",
      IRIS_ENABLE_GAME_CONTROL: "false",
      IRIS_GAME_CONTROL_ADAPTER: "mock",
      IRIS_GAME_CONTROL_ENDPOINT: "",
      IRIS_GAME_OBSERVATION_ENDPOINT: "",
    };
    const runtime = createIrisRuntime({
      runtimeConfig: createRuntimeConfig(env),
      ...createRuntimeAdaptersFromEnv(env),
      logger: { log() {} },
    });
    const runtimeResult = await runtime.processEvent(
      normalizeYouTubeComment({
        display_name: "engine_probe_viewer",
        author_channel_id: "engine_probe_viewer",
        text: "IRIS, say hello and move naturally for the engine probe.",
      })
    );
    const worker = createLocalBridgeEngineWorker({
      outboxDir,
      artifactDir,
      ttsEngineEndpoint: process.env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT ?? "",
      ttsEngineApiKey: process.env.IRIS_LOCAL_TTS_ENGINE_API_KEY ?? "",
      ttsEngineVoiceId: process.env.IRIS_LOCAL_TTS_ENGINE_VOICE_ID ?? "",
      ttsEngineModel: process.env.IRIS_LOCAL_TTS_ENGINE_MODEL ?? "",
      ttsEngineLocale: process.env.IRIS_LOCAL_TTS_ENGINE_LOCALE ?? "",
      ttsLicensedVoiceSourceStatus:
        process.env.IRIS_LICENSED_VOICE_SOURCE_STATUS ?? "",
      ttsVoiceLicenseStreamUseStatus:
        process.env.IRIS_VOICE_LICENSE_STREAM_USE_STATUS ?? "",
      ttsVoiceLicensePrerecordedLineUseStatus:
        process.env.IRIS_VOICE_LICENSE_PRERECORDED_LINE_USE_STATUS ?? "",
      ttsVoiceLicenseVoiceProductUseStatus:
        process.env.IRIS_VOICE_LICENSE_VOICE_PRODUCT_USE_STATUS ?? "",
      ttsVoiceLicenseSponsorCampaignUseStatus:
        process.env.IRIS_VOICE_LICENSE_SPONSOR_CAMPAIGN_USE_STATUS ?? "",
      live2dEngineEndpoint: process.env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT ?? "",
      live2dEngineApiKey: process.env.IRIS_LOCAL_LIVE2D_ENGINE_API_KEY ?? "",
      live2dEngineModelId: process.env.IRIS_LOCAL_LIVE2D_MODEL_ID ?? "",
      live2dEngineSceneId: process.env.IRIS_LOCAL_LIVE2D_SCENE_ID ?? "",
      engineTimeoutMs: Number(process.env.IRIS_LOCAL_ENGINE_TIMEOUT_MS ?? 5000),
    });
    const workerReport = await worker.processUntilIdle({
      maxPasses: 3,
      limitPerKind: 3,
      continueOnError: true,
    });

    console.log(
      JSON.stringify(
        createPublicReport({
          ok: workerReport.failed_count === 0,
          configured: true,
          engine_health: engineHealth,
          final_decision: runtimeResult.core.phase15.final_decision,
          engine_modes: workerReport.engine_modes,
          worker_readiness_status: workerReport.worker_readiness_status,
          adapter_readiness_status: workerReport.adapter_readiness_status,
          attempted_count: workerReport.attempted_count,
          processed_count: workerReport.processed_count,
          failed_count: workerReport.failed_count,
          reached_idle: workerReport.reached_idle,
          final_pending_count: workerReport.final_status.outbox_queue.total_pending_count,
          by_adapter: workerReport.by_adapter,
        }),
        null,
        2
      )
    );
  } finally {
    await closeServer(bridgeServer);
  }
}

export function createUnconfiguredEngineProbeReport() {
  const report = {
    ok: true,
    configured: false,
    reason:
      "IRIS_LOCAL_TTS_ENGINE_ENDPOINT and IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT are not set",
    required_env: REQUIRED_ENGINE_ENV,
    boundary_policy: {
      validated_bridge_jobs_only: true,
      no_runtime_candidates: true,
      no_game_actions: true,
      no_endpoint_values_in_report: true,
      no_secret_values_in_report: true,
    },
    production_handoff_summary: {
      schema: "iris_engine_probe_handoff_summary_v1",
      engine_probe_report_only: true,
      configured: false,
      real_engine_processes_not_started_by_probe: true,
      real_obs_operation_not_started_by_probe: true,
      runtime_adapter_packets_not_exposed: true,
      no_game_or_os_input: true,
      endpoint_values_not_exposed: true,
      secret_values_not_exposed: true,
      raw_jobs_not_exposed: true,
      required_env_count: REQUIRED_ENGINE_ENV.length,
      next_check_script: "npm run dev:engine:probe",
    },
  };
  assertEngineProbePublicReportSafe(report);
  return report;
}

export function createPublicReport({
  ok,
  configured,
  engine_health: engineHealth,
  final_decision: finalDecision,
  engine_modes: engineModes,
  worker_readiness_status: workerReadinessStatus,
  adapter_readiness_status: adapterReadinessStatus,
  attempted_count: attemptedCount,
  processed_count: processedCount,
  failed_count: failedCount,
  reached_idle: reachedIdle,
  final_pending_count: finalPendingCount,
  by_adapter: byAdapter,
}) {
  const ttsHealthProbe = engineHealth.probes.find(
    (probe) => probe.engine_kind === "tts"
  );
  const report = {
    ok,
    configured,
    engine_health: engineHealth,
    final_decision: finalDecision,
    engine_modes: engineModes,
    worker_readiness_status: workerReadinessStatus,
    adapter_readiness_status: adapterReadinessStatus,
    attempted_count: attemptedCount,
    processed_count: processedCount,
    failed_count: failedCount,
    reached_idle: reachedIdle,
    final_pending_count: finalPendingCount,
    by_adapter: byAdapter,
    production_handoff_summary: {
      schema: "iris_engine_probe_handoff_summary_v1",
      engine_probe_report_only: true,
      configured,
      real_engine_processes_not_started_by_probe: true,
      real_obs_operation_not_started_by_probe: true,
      runtime_adapter_packets_not_exposed: true,
      no_game_or_os_input: true,
      endpoint_values_not_exposed: true,
      secret_values_not_exposed: true,
      raw_jobs_not_exposed: true,
      engine_health_probe_count: engineHealth.probes.length,
      engine_health_pass_count: engineHealth.summary.pass,
      engine_health_attention_count: engineHealth.summary.attention,
      licensed_voice_source_status_configured:
        ttsHealthProbe?.licensed_voice_source_status_configured ?? false,
      voice_license_use_category_count:
        ttsHealthProbe?.voice_license_use_category_count ?? 0,
      voice_license_use_category_configured_count:
        ttsHealthProbe?.voice_license_use_category_configured_count ?? 0,
      voice_license_use_category_missing_count:
        ttsHealthProbe?.voice_license_use_category_missing_count ?? 0,
      attempted_count: attemptedCount,
      processed_count: processedCount,
      failed_count: failedCount,
      final_pending_count: finalPendingCount,
      worker_readiness_status: workerReadinessStatus,
      reached_idle: reachedIdle,
      next_check_script: "npm run dev:engine:probe",
    },
    boundary_policy: {
      validated_local_bridge_jobs_only: true,
      report_hides_raw_text_and_jobs: true,
      engine_failures_are_summary_only: true,
      engine_health_is_summary_only: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
      production_handoff_summary_counts_only: true,
      no_voice_license_values: true,
    },
  };
  assertEngineProbePublicReportSafe(report);
  return report;
}

export function assertEngineProbePublicReportSafe(report) {
  const summary = report.production_handoff_summary;
  if (!summary || summary.schema !== "iris_engine_probe_handoff_summary_v1") {
    throw new Error("engine probe handoff summary missing");
  }
  for (const field of [
    "engine_probe_report_only",
    "real_engine_processes_not_started_by_probe",
    "real_obs_operation_not_started_by_probe",
    "runtime_adapter_packets_not_exposed",
    "no_game_or_os_input",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
    "raw_jobs_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new Error(`engine probe handoff flag failed: ${field}`);
    }
  }
  assertBoundaryPolicy(
    report.boundary_policy,
    report.configured === false
      ? [
          "validated_bridge_jobs_only",
          "no_runtime_candidates",
          "no_game_actions",
          "no_endpoint_values_in_report",
          "no_secret_values_in_report",
        ]
      : [
          "validated_local_bridge_jobs_only",
          "report_hides_raw_text_and_jobs",
          "engine_failures_are_summary_only",
          "engine_health_is_summary_only",
          "no_endpoint_values",
          "no_candidates",
          "no_commands",
          "no_secret_values",
          "production_handoff_summary_counts_only",
          "no_voice_license_values",
        ],
    "engine probe report"
  );
  if (summary.configured !== report.configured) {
    throw new Error("engine probe handoff totals mismatch");
  }
  if (summary.next_check_script !== "npm run dev:engine:probe") {
    throw new Error("engine probe handoff script mismatch");
  }
  const expectedFields =
    report.configured === false
      ? EXPECTED_UNCONFIGURED_HANDOFF_FIELDS
      : EXPECTED_CONFIGURED_HANDOFF_FIELDS;
  for (const field of Object.keys(summary)) {
    if (!expectedFields.has(field)) {
      throw new Error(`engine probe unexpected handoff field: ${field}`);
    }
  }
  if (report.configured === false) {
    if (summary.required_env_count !== REQUIRED_ENGINE_ENV.length) {
      throw new Error("engine probe required env count mismatch");
    }
    return;
  }
  assertNonNegativeCounts(summary, [
    "engine_health_probe_count",
    "engine_health_pass_count",
    "engine_health_attention_count",
    "voice_license_use_category_count",
    "voice_license_use_category_configured_count",
    "voice_license_use_category_missing_count",
    "attempted_count",
    "processed_count",
    "failed_count",
    "final_pending_count",
  ]);
  const ttsHealthProbe = report.engine_health.probes.find(
    (probe) => probe.engine_kind === "tts"
  );
  if (
    summary.engine_health_probe_count !== report.engine_health.probes.length ||
    summary.engine_health_pass_count !== report.engine_health.summary.pass ||
    summary.engine_health_attention_count !== report.engine_health.summary.attention ||
    summary.licensed_voice_source_status_configured !==
      (ttsHealthProbe?.licensed_voice_source_status_configured ?? false) ||
    summary.voice_license_use_category_count !==
      (ttsHealthProbe?.voice_license_use_category_count ?? 0) ||
    summary.voice_license_use_category_configured_count !==
      (ttsHealthProbe?.voice_license_use_category_configured_count ?? 0) ||
    summary.voice_license_use_category_missing_count !==
      (ttsHealthProbe?.voice_license_use_category_missing_count ?? 0) ||
    summary.attempted_count !== report.attempted_count ||
    summary.processed_count !== report.processed_count ||
    summary.failed_count !== report.failed_count ||
    summary.final_pending_count !== report.final_pending_count ||
    summary.worker_readiness_status !== report.worker_readiness_status ||
    summary.reached_idle !== report.reached_idle
  ) {
    throw new Error("engine probe handoff totals mismatch");
  }
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

function assertNonNegativeCounts(value, fields) {
  for (const field of fields) {
    if (!Number.isInteger(value[field]) || value[field] < 0) {
      throw new Error(`engine probe handoff count invalid: ${field}`);
    }
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

function isDirectExecution() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}
