import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { ContractError } from "../core/contracts.js";
import { summarizeLocalEndpointScope } from "../core/localEndpointPolicy.js";
import { assertLocalBridgeOutboxJobSafe } from "./localBridgeOutbox.js";
import { validateLocalRenderArtifactForPickup } from "./localBridgeArtifactValidation.js";

const ENGINE_KINDS = ["tts", "live2d", "subtitle"];
export const DEFAULT_LIVE_BRIDGE_WORKER_MAX_JOB_AGE_MS = 15 * 60_000;
const LIVE2D_ENGINE_CUE_SCHEMAS = new Set([
  "iris_live2d_renderer_cue_v1",
]);
const FORBIDDEN_ENGINE_PUBLIC_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "final_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
  "endpoint",
  "url",
  "audio_url",
  "artifact_url",
  "authorization",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
]);
const UNSAFE_ENGINE_PUBLIC_TEXT_PATTERN =
  /(https?:\/\/|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|input_action|input_action_candidate|approved_game_input_action|commit|memory_write|relationship_update_candidate|canonical_envelope)/i;

export function createLocalBridgeEngineWorker({
  outboxDir = "data/local_bridge_outbox",
  artifactDir = "data/local_bridge_artifacts",
  nowMs = () => Date.now(),
  ttsEngineEndpoint = "",
  ttsEngineApiKey = "",
  ttsEngineVoiceId = "",
  ttsEngineModel = "",
  ttsEngineLocale = "",
  ttsCharacterVoiceProfileId = "",
  ttsCharacterVoiceStyleProfileId = "",
  ttsLicensedVoiceSourceStatus = "",
  ttsVoiceLicenseStreamUseStatus = "",
  ttsVoiceLicensePrerecordedLineUseStatus = "",
  ttsVoiceLicenseVoiceProductUseStatus = "",
  ttsVoiceLicenseSponsorCampaignUseStatus = "",
  live2dEngineEndpoint = "",
  live2dEngineApiKey = "",
  live2dEngineModelId = "",
  live2dEngineSceneId = "",
  subtitleEngineEndpoint = "",
  subtitleEngineApiKey = "",
  engineTimeoutMs = 5000,
  retryBackoffMs = 5000,
  retryMaxBackoffMs = 300_000,
  maxRetryAttempts = 3,
  maxJobAgeMs = null,
  strictHttpEngines = false,
  strictTtsHttpEngine = false,
  strictLive2dHttpEngine = false,
  strictSubtitleHttpEngine = false,
  fetchImpl = globalThis.fetch,
} = {}) {
  const processed = readExistingProcessedIds(artifactDir);
  const expired = readExistingExpiredIds(artifactDir);
  const failureLedger = readExistingFailureLedger(artifactDir);
  const retryPolicy = {
    max_attempts: clampInteger(maxRetryAttempts, 1, 50, 3),
    base_backoff_ms: clampInteger(retryBackoffMs, 0, 3_600_000, 5000),
    max_backoff_ms: clampInteger(retryMaxBackoffMs, 0, 24 * 3_600_000, 300_000),
  };
  const jobFreshnessPolicy = createJobFreshnessPolicy(maxJobAgeMs);
  const engineConfig = {
    tts: {
      mode: ttsEngineEndpoint ? "http" : "local_preview_wav",
      endpoint: ttsEngineEndpoint,
      apiKey: ttsEngineApiKey,
      preferences: compactEnginePreferences({
        voice_id: ttsEngineVoiceId,
        model: ttsEngineModel,
        locale: ttsEngineLocale,
        character_voice_profile_id: ttsCharacterVoiceProfileId,
        character_voice_style_profile_id: ttsCharacterVoiceStyleProfileId,
        licensed_voice_source_status: summarizeLicensedVoiceSourceStatus(
          ttsLicensedVoiceSourceStatus
        ),
        ...summarizeVoiceLicenseUseCategoryPreferences([
          ttsVoiceLicenseStreamUseStatus,
          ttsVoiceLicensePrerecordedLineUseStatus,
          ttsVoiceLicenseVoiceProductUseStatus,
          ttsVoiceLicenseSponsorCampaignUseStatus,
        ]),
      }),
    },
    live2d: {
      mode: live2dEngineEndpoint ? "http" : "local_live2d_cue_artifact",
      endpoint: live2dEngineEndpoint,
      apiKey: live2dEngineApiKey,
      preferences: compactEnginePreferences({
        model_id: live2dEngineModelId,
        scene_id: live2dEngineSceneId,
      }),
    },
    subtitle: {
      mode: subtitleEngineEndpoint ? "http" : "local_vtt",
      endpoint: subtitleEngineEndpoint,
      apiKey: subtitleEngineApiKey,
    },
    timeoutMs: clampInteger(engineTimeoutMs, 100, 60_000, 5000),
    strictHttpEngines: strictHttpEngines === true,
    strictHttpEnginesByAdapter: {
      tts: strictHttpEngines === true || strictTtsHttpEngine === true,
      live2d: strictHttpEngines === true || strictLive2dHttpEngine === true,
      subtitle: strictHttpEngines === true || strictSubtitleHttpEngine === true,
    },
    jobFreshnessPolicy,
    fetchImpl,
  };

  const api = {
    processOnce({ limitPerKind = 50 } = {}) {
      if (
        engineConfig.tts.mode === "http" ||
        engineConfig.live2d.mode === "http" ||
        engineConfig.subtitle.mode === "http"
      ) {
        throw new ContractError(
          "local bridge engine worker configured for HTTP engines; use processOnceAsync"
        );
      }
      const receipts = [];
      const safeLimitPerKind = clampInteger(limitPerKind, 1, 500, 50);
      for (const adapterKind of ENGINE_KINDS) {
        const jobs = readJobs(join(outboxDir, adapterKind, "jobs.jsonl"));
        for (const job of jobs) {
          if (receipts.filter((item) => item.adapter_kind === adapterKind).length >= safeLimitPerKind) {
            break;
          }
          if (processed.has(job.job_id)) continue;
          const attemptedAtMs = nowMs();
          assertLocalBridgeOutboxJobSafe(job, "Local bridge engine job input");
          const freshnessState = classifyJobFreshness(job, {
            nowMs: attemptedAtMs,
            jobFreshnessPolicy,
          });
          const receipt =
            freshnessState.job_freshness_status === "expired"
              ? buildExpiredJobReceipt(job, {
                  attemptedAtMs,
                  engineConfig,
                  freshnessState,
                })
              : processJob(job, { artifactDir, nowMs: attemptedAtMs, engineConfig });
          assertLocalBridgeEngineReceiptSafe(receipt);
          if (receipt.engine_status === "rendered" || receipt.engine_status === "expired") {
            persistReceipt(receipt, { artifactDir });
          }
          processed.add(job.job_id);
          if (receipt.engine_status === "expired") {
            expired.add(job.job_id);
            if (clearFailure(failureLedger, job)) persistFailureLedger(failureLedger, { artifactDir });
          }
          receipts.push(receipt);
        }
      }
      const eventRenderManifests = persistEventRenderManifestsForReceipts(receipts, {
        artifactDir,
        nowMs: nowMs(),
      });
      const report = buildProcessReport(receipts, engineConfig, { eventRenderManifests });
      assertLocalBridgeEngineProcessReportSafe(report);
      return report;
    },
    async processOnceAsync({ limitPerKind = 50, continueOnError = false } = {}) {
      const receipts = [];
      const safeLimitPerKind = clampInteger(limitPerKind, 1, 500, 50);
      for (const adapterKind of ENGINE_KINDS) {
        const jobs = readJobs(join(outboxDir, adapterKind, "jobs.jsonl"));
        for (const job of jobs) {
          if (receipts.filter((item) => item.adapter_kind === adapterKind).length >= safeLimitPerKind) {
            break;
          }
          if (processed.has(job.job_id)) continue;
          const attemptedAtMs = nowMs();
          assertLocalBridgeOutboxJobSafe(job, "Local bridge engine job input");
          const freshnessState = classifyJobFreshness(job, {
            nowMs: attemptedAtMs,
            jobFreshnessPolicy,
          });
          if (freshnessState.job_freshness_status === "expired") {
            const receipt = buildExpiredJobReceipt(job, {
              attemptedAtMs,
              engineConfig,
              freshnessState,
            });
            assertLocalBridgeEngineReceiptSafe(receipt);
            persistReceipt(receipt, { artifactDir });
            processed.add(job.job_id);
            expired.add(job.job_id);
            if (clearFailure(failureLedger, job)) persistFailureLedger(failureLedger, { artifactDir });
            receipts.push(receipt);
            continue;
          }
          const retryState = classifyJobRetryState(job, failureLedger, {
            nowMs: attemptedAtMs,
            retryPolicy,
          });
          if (retryState.retry_status !== "ready") {
            receipts.push(buildRetrySkippedReceipt(job, {
              attemptedAtMs,
              engineConfig,
              retryState,
            }));
            continue;
          }
          let receipt;
          try {
            receipt = await processJobAsync(job, {
              artifactDir,
              nowMs: attemptedAtMs,
              engineConfig,
            });
          } catch (error) {
            if (!continueOnError) throw error;
            const retryEntry = recordFailure(failureLedger, job, {
              attemptedAtMs,
              retryPolicy,
              error,
            });
            persistFailureLedger(failureLedger, { artifactDir });
            receipt = buildFailureReceipt(job, {
              attemptedAtMs,
              engineConfig,
              error,
              retryEntry,
            });
          }
          assertLocalBridgeEngineReceiptSafe(receipt);
          if (receipt.engine_status === "rendered") {
            persistReceipt(receipt, { artifactDir });
            processed.add(job.job_id);
            if (clearFailure(failureLedger, job)) persistFailureLedger(failureLedger, { artifactDir });
          }
          receipts.push(receipt);
        }
      }
      const eventRenderManifests = persistEventRenderManifestsForReceipts(receipts, {
        artifactDir,
        nowMs: nowMs(),
      });
      const report = buildProcessReport(receipts, engineConfig, { eventRenderManifests });
      assertLocalBridgeEngineProcessReportSafe(report);
      return report;
    },
    async processUntilIdle({ maxPasses = 3, limitPerKind = 50, continueOnError = false } = {}) {
      const passLimit = clampInteger(maxPasses, 1, 200, 3);
      const reports = [];
      for (let pass = 0; pass < passLimit; pass += 1) {
        const report = await api.processOnceAsync({ limitPerKind, continueOnError });
        reports.push(report);
        if (report.failed_count > 0) break;
        if (report.processed_count === 0) break;
      }
      const drainReport = buildDrainReport(reports, api.status(), engineConfig);
      assertLocalBridgeEngineDrainReportSafe(drainReport);
      return drainReport;
    },
    status() {
      const eventRenderManifests = summarizeEventRenderManifestStore({ artifactDir });
      const outboxQueue = summarizeOutboxQueue({
        outboxDir,
        processed,
        failureLedger,
        expired,
        retryPolicy,
        jobFreshnessPolicy,
        nowMs: nowMs(),
      });
      const artifactDirConfigured = artifactDir !== "";
      const status = {
        schema: "iris_local_bridge_engine_status_v1",
        worker_readiness_status: classifyLocalBridgeWorkerReadinessStatus({
          artifactDirConfigured,
          eventRenderManifests,
          engineConfig,
          outboxQueue,
        }),
        adapter_readiness_status: summarizeAdapterReadinessStatuses({
          artifactDirConfigured,
          eventRenderManifests,
          engineConfig,
          outboxQueue,
        }),
        processed_job_count: processed.size,
        artifact_dir_configured: artifactDirConfigured,
        supported_adapter_kinds: ENGINE_KINDS,
        engine_modes: summarizeEngineModes(engineConfig),
        engine_preferences_configured: summarizeEnginePreferencesConfigured(engineConfig),
        event_render_manifests: eventRenderManifests,
        retry_policy: retryPolicy,
        job_freshness_policy: jobFreshnessPolicy,
        outbox_queue: outboxQueue,
        boundary_policy: {
          no_raw_jobs: true,
          no_text_payloads: true,
          no_candidates: true,
          no_commands: true,
          local_artifacts_only: true,
          no_endpoint_values: true,
          no_secret_values: true,
        },
        adapter_validation_required: true,
      };
      assertLocalBridgeEngineStatusSafe(status);
      return status;
    },
  };
  return api;
}

function summarizeLicensedVoiceSourceStatus(status) {
  if (!status) return "";
  if (["licensed", "placeholder", "operator_attention_required"].includes(status)) {
    return status;
  }
  return "operator_attention_required";
}

function summarizeVoiceLicenseUseCategoryPreferences(statuses) {
  const configuredCount = statuses.filter((status) => String(status ?? "").trim() !== "").length;
  if (configuredCount === 0) return {};
  return {
    voice_license_use_category_count: String(statuses.length),
    voice_license_use_category_configured_count: String(configuredCount),
    voice_license_use_category_missing_count: String(statuses.length - configuredCount),
  };
}

export function assertLocalBridgeEngineReceiptSafe(
  receipt,
  context = "local bridge engine receipt"
) {
  if (!receipt || typeof receipt !== "object") {
    throw new ContractError(`${context}: missing receipt`);
  }
  assertNoForbiddenEnginePublicFields(receipt, context);
  if (receipt.schema !== "iris_local_bridge_engine_receipt_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: receipt.schema });
  }
  if (!ENGINE_KINDS.includes(receipt.adapter_kind)) {
    throw new ContractError(`${context}: invalid adapter kind`, {
      adapter_kind: receipt.adapter_kind,
    });
  }
  if (
    !["rendered", "attention", "retry_waiting", "retry_blocked", "expired"].includes(
      receipt.engine_status
    )
  ) {
    throw new ContractError(`${context}: invalid engine status`);
  }
  assertBoundaryPolicyFlagsSafe(receipt.boundary_policy, context, [
    "no_raw_job_payload",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "local_artifact_only",
    "no_endpoint_values",
    "no_secret_values",
  ], ["retry_report_summary_only", "stale_job_rejected_before_engine"]);
  if (receipt.engine_status === "rendered") {
    if (!receipt.artifact_path || receipt.artifact_kind === "unavailable") {
      throw new ContractError(`${context}: rendered receipt requires artifact summary`);
    }
  } else if (receipt.artifact_path !== "" || receipt.artifact_kind !== "unavailable") {
    throw new ContractError(`${context}: non-rendered receipt must not expose artifacts`);
  }
  if (receipt.engine_status === "attention" && typeof receipt.error_kind !== "string") {
    throw new ContractError(`${context}: failure receipt requires safe error kind`);
  }
  if (
    (receipt.engine_status === "retry_waiting" ||
      receipt.engine_status === "retry_blocked") &&
    receipt.boundary_policy.retry_report_summary_only !== true
  ) {
    throw new ContractError(`${context}: retry receipt must be summary only`);
  }
  if (
    receipt.engine_status === "expired" &&
    receipt.boundary_policy.stale_job_rejected_before_engine !== true
  ) {
    throw new ContractError(`${context}: expired receipt requires stale-job boundary`);
  }
  if (receipt.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

export function assertLocalBridgeEngineProcessReportSafe(
  report,
  context = "local bridge engine process report"
) {
  if (!report || typeof report !== "object") {
    throw new ContractError(`${context}: missing report`);
  }
  assertNoForbiddenEnginePublicFields(report, context);
  if (report.schema !== "iris_local_bridge_engine_process_report_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: report.schema });
  }
  assertBoundaryPolicyFlagsSafe(report.boundary_policy, context, [
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "local_artifacts_only",
    "no_endpoint_values",
    "no_secret_values",
  ]);
  assertEngineReportCountsSafe(report, context, { receiptsRequired: true });
  if (!Array.isArray(report.receipts)) {
    throw new ContractError(`${context}: receipt summaries are required`);
  }
  for (const receipt of report.receipts) {
    assertLocalBridgeEngineReceiptSummarySafe(receipt, context);
  }
  if (
    !Array.isArray(report.event_render_manifests) ||
    report.event_render_manifest_count !== report.event_render_manifests.length
  ) {
    throw new ContractError(`${context}: invalid manifest summary count`);
  }
  for (const manifest of report.event_render_manifests) {
    assertLocalBridgeEventRenderManifestSummarySafe(manifest, context);
  }
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

export function assertLocalBridgeEngineDrainReportSafe(
  report,
  context = "local bridge engine drain report"
) {
  if (!report || typeof report !== "object") {
    throw new ContractError(`${context}: missing report`);
  }
  assertNoForbiddenEnginePublicFields(report, context);
  if (report.schema !== "iris_local_bridge_engine_drain_report_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: report.schema });
  }
  assertBoundaryPolicyFlagsSafe(report.boundary_policy, context, [
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "counts_only_status",
    "local_artifacts_only",
    "no_endpoint_values",
    "no_secret_values",
  ]);
  assertOutboxQueueStatusSafe(report.final_status?.outbox_queue, `${context}: final outbox queue`);
  assertLocalBridgeWorkerReadinessStatusSafe(report.worker_readiness_status, context);
  assertLocalBridgeAdapterReadinessStatusesSafe(report.adapter_readiness_status, context);
  assertEngineReportCountsSafe(report, context);
  if (
    !Array.isArray(report.event_render_manifests) ||
    report.event_render_manifest_count < report.event_render_manifests.length
  ) {
    throw new ContractError(`${context}: invalid manifest summary count`);
  }
  for (const manifest of report.event_render_manifests) {
    assertLocalBridgeEventRenderManifestSummarySafe(manifest, context);
  }
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

export function assertLocalBridgeEngineStatusSafe(
  status,
  context = "local bridge engine status"
) {
  if (!status || typeof status !== "object") {
    throw new ContractError(`${context}: missing status`);
  }
  assertNoForbiddenEnginePublicFields(status, context);
  if (status.schema !== "iris_local_bridge_engine_status_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: status.schema });
  }
  assertBoundaryPolicyFlagsSafe(status.boundary_policy, context, [
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "local_artifacts_only",
    "no_endpoint_values",
    "no_secret_values",
  ]);
  assertOutboxQueueStatusSafe(status.outbox_queue, `${context}: outbox queue`);
  assertLocalBridgeWorkerReadinessStatusSafe(status.worker_readiness_status, context);
  assertLocalBridgeAdapterReadinessStatusesSafe(status.adapter_readiness_status, context);
  assertLocalBridgeEventRenderManifestStoreStatusSafe(
    status.event_render_manifests,
    context
  );
  if (status.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

export function assertLocalBridgeEventRenderManifestSafe(
  manifest,
  context = "local bridge event render manifest"
) {
  if (!manifest || typeof manifest !== "object") {
    throw new ContractError(`${context}: missing manifest`);
  }
  assertNoForbiddenEnginePublicFields(manifest, context);
  if (manifest.schema !== "iris_local_bridge_event_render_manifest_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: manifest.schema });
  }
  if (!manifest.event_id || !manifest.manifest_id) {
    throw new ContractError(`${context}: event and manifest identifiers are required`);
  }
  if (manifest.complete !== true) {
    throw new ContractError(`${context}: manifest must be complete`);
  }
  for (const kind of ENGINE_KINDS) {
    const item = manifest.artifact_set?.[kind];
    if (!item || item.adapter_kind !== kind || !item.artifact_path) {
      throw new ContractError(`${context}: missing artifact for adapter kind`, { adapter_kind: kind });
    }
    if (!isExpectedEngineArtifactKind(kind, item.artifact_kind)) {
      throw new ContractError(`${context}: invalid artifact kind for adapter`, {
        adapter_kind: kind,
        artifact_kind: item.artifact_kind,
      });
    }
  }
  assertBoundaryPolicyFlagsSafe(manifest.boundary_policy, context, [
    "local_artifacts_only",
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ]);
  if (manifest.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

export function assertLocalBridgeEventRenderManifestSummarySafe(
  summary,
  context = "local bridge event render manifest summary"
) {
  if (!summary || typeof summary !== "object") {
    throw new ContractError(`${context}: missing manifest summary`);
  }
  assertNoForbiddenEnginePublicFields(summary, context);
  if (summary.schema !== "iris_local_bridge_event_render_manifest_summary_v1") {
    throw new ContractError(`${context}: invalid manifest summary schema`, {
      schema: summary.schema,
    });
  }
  for (const kind of ENGINE_KINDS) {
    if (!isExpectedEngineArtifactKind(kind, summary.artifact_kind_by_adapter?.[kind])) {
      throw new ContractError(`${context}: invalid artifact kind summary`, {
        adapter_kind: kind,
        artifact_kind: summary.artifact_kind_by_adapter?.[kind],
      });
    }
  }
  assertBoundaryPolicyFlagsSafe(summary.boundary_policy, context, [
    "summary_only",
    "no_artifact_paths",
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ]);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

export function createLocalBridgeEventRenderManifestStoreStatus({ artifactDir = "" } = {}) {
  return summarizeEventRenderManifestStore({ artifactDir });
}

export function assertLocalBridgeEventRenderManifestStoreStatusSafe(
  status,
  context = "local bridge event render manifest store"
) {
  if (!status || typeof status !== "object") {
    throw new ContractError(`${context}: missing render manifest store status`);
  }
  assertNoForbiddenEnginePublicFields(status, context);
  if (status.schema !== "iris_local_bridge_event_render_manifest_store_status_v1") {
    throw new ContractError(`${context}: invalid render manifest store schema`, {
      schema: status.schema,
    });
  }
  assertBoundaryPolicyFlagsSafe(status.boundary_policy, context, [
    "counts_only",
    "no_artifact_paths",
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ]);
  if (status.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  for (const field of [
    "manifest_count",
    "complete_manifest_count",
    "invalid_json_line_count",
  ]) {
    assertSafeCount(status[field], `${context}: invalid ${field}`);
  }
}

function processJob(job, { artifactDir, nowMs, engineConfig }) {
  assertLocalBridgeOutboxJobSafe(job, "Local bridge engine job input");
  assertStrictHttpEndpointConfigured(job.adapter_kind, engineConfig);
  if (job.adapter_kind === "tts") return processTtsJob(job, { artifactDir, nowMs });
  if (job.adapter_kind === "live2d") return processLive2dJob(job, { artifactDir, nowMs });
  return processSubtitleJob(job, { artifactDir, nowMs });
}

async function processJobAsync(job, { artifactDir, nowMs, engineConfig }) {
  assertLocalBridgeOutboxJobSafe(job, "Local bridge engine job input");
  assertStrictHttpEndpointConfigured(job.adapter_kind, engineConfig);
  if (job.adapter_kind === "tts" && engineConfig.tts.mode === "http") {
    try {
      return await processTtsJobViaHttp(job, { artifactDir, nowMs, engineConfig });
    } catch (error) {
      if (isExplicitHttpEngineFailure(error)) throw error;
      if (isStrictHttpEngine(engineConfig, "tts")) throw error;
      return processTtsJob(job, { artifactDir, nowMs });
    }
  }
  if (job.adapter_kind === "live2d" && engineConfig.live2d.mode === "http") {
    try {
      return await processLive2dJobViaHttp(job, { artifactDir, nowMs, engineConfig });
    } catch (error) {
      if (isExplicitHttpEngineFailure(error)) throw error;
      if (isStrictHttpEngine(engineConfig, "live2d")) throw error;
      return processLive2dJob(job, { artifactDir, nowMs });
    }
  }
  if (job.adapter_kind === "subtitle" && engineConfig.subtitle.mode === "http") {
    try {
      return await processSubtitleJobViaHttp(job, { artifactDir, nowMs, engineConfig });
    } catch (error) {
      if (isExplicitHttpEngineFailure(error)) throw error;
      if (isStrictHttpEngine(engineConfig, "subtitle")) throw error;
      return processSubtitleJob(job, { artifactDir, nowMs });
    }
  }
  return processJob(job, { artifactDir, nowMs, engineConfig });
}

function assertStrictHttpEndpointConfigured(adapterKind, engineConfig) {
  if (
    isStrictHttpEngine(engineConfig, adapterKind) &&
    engineConfig[adapterKind]?.mode !== "http"
  ) {
    throw new ContractError("strict HTTP engine endpoint is required", {
      adapter_kind: adapterKind,
    });
  }
}

function isStrictHttpEngine(engineConfig, adapterKind) {
  return (
    engineConfig.strictHttpEngines === true ||
    engineConfig.strictHttpEnginesByAdapter?.[adapterKind] === true
  );
}

function isExplicitHttpEngineFailure(error) {
  return (
    error instanceof ContractError &&
    (String(error.message ?? "").includes("bridge_status reported failure") ||
      typeof error.details?.status === "number" ||
      String(error.message ?? "").includes("local endpoint policy") ||
      String(error.message ?? "").includes("bridge_status is required") ||
      String(error.message ?? "").includes("duration_ms is required") ||
      String(error.message ?? "").includes("unsafe engine public field") ||
      String(error.message ?? "").includes("response requires JSON") ||
      String(error.message ?? "").includes("audio") ||
      String(error.message ?? "").includes("cue"))
  );
}

function processTtsJob(job, { artifactDir, nowMs }) {
  const kindDir = join(artifactDir, "tts");
  mkdirSync(kindDir, { recursive: true });
  const durationMs = clampInteger(
    resolveEngineDurationMs(
      job.estimated_duration_ms ?? job.estimatedDurationMs ?? job.duration_ms ?? job.durationMs,
      job.estimated_duration_seconds ??
        job.estimatedDurationSeconds ??
        job.duration_seconds ??
        job.durationSeconds ??
        job.duration
    ) ?? 1000,
    100,
    10_000,
    1000
  );
  const mouthTiming =
    job.mouth_timing ??
    job.mouthTiming ??
    job.visemes ??
    job.viseme_timing ??
    job.visemeTiming ??
    job.lip_sync ??
    job.lipSync ??
    job.speech_marks ??
    job.speechMarks;
  const wavName = `${safeFileName(job.job_id)}.wav`;
  const visemeName = `${safeFileName(job.job_id)}.visemes.json`;
  const artifactPath = join(kindDir, wavName);
  writeFileSync(
    artifactPath,
    createPreviewSpeechWav({
      durationMs,
      sampleRate: 48000,
      mouthTiming,
    })
  );
  assertLocalRenderArtifactFileForPickup({
    adapterKind: "tts",
    artifactKind: "audio_wav",
    artifactPath,
    contentType: "audio/wav",
    context: "Local TTS preview artifact",
  });
  writeJsonAtomic(join(kindDir, visemeName), {
    schema: "iris_local_tts_viseme_artifact_v1",
    job_id: job.job_id,
    event_id: job.event_id,
    mouth_timing: Array.isArray(mouthTiming) ? mouthTiming : [],
    adapter_validation_required: true,
  });
  return baseReceipt(job, {
    renderedAtMs: nowMs,
    artifactKind: "audio_wav",
    artifactPath: `tts/${wavName}`,
    extra: {
      engine_mode: "local_preview_wav",
      duration_ms: durationMs,
      sample_rate_hz: 48000,
      auxiliary_artifact_path: `tts/${visemeName}`,
    },
  });
}

async function processTtsJobViaHttp(job, { artifactDir, nowMs, engineConfig }) {
  const kindDir = join(artifactDir, "tts");
  mkdirSync(kindDir, { recursive: true });
  const response = await postEngineRequest({
    endpoint: engineConfig.tts.endpoint,
    apiKey: engineConfig.tts.apiKey,
    timeoutMs: engineConfig.timeoutMs,
    fetchImpl: engineConfig.fetchImpl,
    request: createTtsEngineRequest(job, engineConfig.tts.preferences),
    context: "Local TTS engine",
  });
  const audioPayload = resolveAudioPayload(response, "Local TTS engine response");
  const audioBytes = decodeBase64Audio(audioPayload.base64, "Local TTS engine response");
  const audioMime = requireAudioMime(
    audioPayload.mime || inferAudioMimeFromBytes(audioBytes),
    "Local TTS engine response"
  );
  const normalizedAudio = normalizeTtsEngineAudioOutput({
    bytes: audioBytes,
    mime: audioMime,
    sampleRateHz: resolveTtsEngineSampleRateHz(response, audioMime),
    channelCount: resolveTtsEngineChannelCount(response, audioMime),
    sampleFormat: resolveTtsEngineSampleFormat(response, audioMime),
  });
  const extension = normalizedAudio.extension;
  const audioArtifactKind = ttsArtifactKindFromMime(normalizedAudio.mime);
  validateTtsEngineAudioBytes({
    bytes: normalizedAudio.bytes,
    audioMime: normalizedAudio.mime,
    artifactKind: audioArtifactKind,
    extension,
    context: "Local TTS engine response",
  });
  const audioName = `${safeFileName(job.job_id)}.${extension}`;
  const visemeName = `${safeFileName(job.job_id)}.visemes.json`;
  const artifactPath = join(kindDir, audioName);
  const bridgeStatus = requiredEngineBridgeStatus(response, "Local TTS engine response");
  const responseData = responseDataObject(response);
  const responseDataAudio = responsePayloadObject(responseData.audio ?? responseData.audio_url ?? responseData.audioUrl ?? responseData.audioURL);
  const responseOutput = responseOutputObject(response);
  const responseOutputAudio = responsePayloadObject(responseOutput.audio ?? responseOutput.audio_url ?? responseOutput.audioUrl ?? responseOutput.audioURL);
  const responseSpeech = responsePayloadObject(response.speech ?? response.speech_url ?? response.speechUrl ?? response.speechURL);
  const responseVoiceAudio = responsePayloadObject(response.voice_audio ?? response.voiceAudio ?? response.voice_audio_url ?? response.voiceAudioUrl ?? response.voiceAudioURL);
  const responseDataSpeech = responsePayloadObject(responseData.speech ?? responseData.speech_url ?? responseData.speechUrl ?? responseData.speechURL);
  const responseDataVoiceAudio = responsePayloadObject(
    responseData.voice_audio ?? responseData.voiceAudio ?? responseData.voice_audio_url ?? responseData.voiceAudioUrl ?? responseData.voiceAudioURL
  );
  const responseOutputSpeech = responsePayloadObject(responseOutput.speech ?? responseOutput.speech_url ?? responseOutput.speechUrl ?? responseOutput.speechURL);
  const responseOutputVoiceAudio = responsePayloadObject(
    responseOutput.voice_audio ?? responseOutput.voiceAudio ?? responseOutput.voice_audio_url ?? responseOutput.voiceAudioUrl ?? responseOutput.voiceAudioURL
  );
  const responseResult = responseDataObject(response.result);
  const responseResultAudio = responsePayloadObject(responseResult.audio ?? responseResult.audio_url ?? responseResult.audioUrl ?? responseResult.audioURL);
  const responseResultSpeech = responsePayloadObject(responseResult.speech ?? responseResult.speech_url ?? responseResult.speechUrl ?? responseResult.speechURL);
  const responseResultVoiceAudio = responsePayloadObject(
    responseResult.voice_audio ?? responseResult.voiceAudio ?? responseResult.voice_audio_url ?? responseResult.voiceAudioUrl ?? responseResult.voiceAudioURL
  );
  writeFileSync(artifactPath, normalizedAudio.bytes);
  assertLocalRenderArtifactFileForPickup({
    adapterKind: "tts",
    artifactKind: audioArtifactKind,
    artifactPath,
    contentType: normalizedAudio.mime,
    context: "Local TTS engine artifact",
  });
  writeJsonAtomic(join(kindDir, visemeName), {
    schema: "iris_local_tts_viseme_artifact_v1",
    job_id: job.job_id,
    event_id: job.event_id,
    source: "http_tts_engine",
    mouth_timing: safeVisemeList(
      response.visemes ??
        response.viseme_timing ??
        response.visemeTiming ??
        response.mouth_timing ??
        response.mouthTiming ??
        response.lip_sync ??
        response.lipSync ??
        response.markers ??
        response.speech_marks ??
        response.speechMarks ??
        response.phonemes ??
        response.phoneme_timing ??
        response.phonemeTiming ??
        response.audio?.visemes ??
        response.audio?.viseme_timing ??
        response.audio?.visemeTiming ??
        response.audio?.mouth_timing ??
        response.audio?.mouthTiming ??
        response.audio?.lip_sync ??
        response.audio?.lipSync ??
        response.audio?.markers ??
        response.audio?.speech_marks ??
        response.audio?.speechMarks ??
        response.audio?.phonemes ??
        response.audio?.phoneme_timing ??
        response.audio?.phonemeTiming ??
        responseSpeech.visemes ??
        responseSpeech.viseme_timing ??
        responseSpeech.visemeTiming ??
        responseSpeech.mouth_timing ??
        responseSpeech.mouthTiming ??
        responseSpeech.lip_sync ??
        responseSpeech.lipSync ??
        responseSpeech.markers ??
        responseSpeech.speech_marks ??
        responseSpeech.speechMarks ??
        responseSpeech.phonemes ??
        responseSpeech.phoneme_timing ??
        responseSpeech.phonemeTiming ??
        responseVoiceAudio.visemes ??
        responseVoiceAudio.viseme_timing ??
        responseVoiceAudio.visemeTiming ??
        responseVoiceAudio.mouth_timing ??
        responseVoiceAudio.mouthTiming ??
        responseVoiceAudio.lip_sync ??
        responseVoiceAudio.lipSync ??
        responseVoiceAudio.markers ??
        responseVoiceAudio.speech_marks ??
        responseVoiceAudio.speechMarks ??
        responseVoiceAudio.phonemes ??
        responseVoiceAudio.phoneme_timing ??
        responseVoiceAudio.phonemeTiming ??
        responseData.visemes ??
        responseData.viseme_timing ??
        responseData.visemeTiming ??
        responseData.mouth_timing ??
        responseData.mouthTiming ??
        responseData.lip_sync ??
        responseData.lipSync ??
        responseData.markers ??
        responseData.speech_marks ??
        responseData.speechMarks ??
        responseData.phonemes ??
        responseData.phoneme_timing ??
        responseData.phonemeTiming ??
        responseDataAudio.visemes ??
        responseDataAudio.viseme_timing ??
        responseDataAudio.visemeTiming ??
        responseDataAudio.mouth_timing ??
        responseDataAudio.mouthTiming ??
        responseDataAudio.lip_sync ??
        responseDataAudio.lipSync ??
        responseDataAudio.markers ??
        responseDataAudio.speech_marks ??
        responseDataAudio.speechMarks ??
        responseDataAudio.phonemes ??
        responseDataAudio.phoneme_timing ??
        responseDataAudio.phonemeTiming ??
        responseDataSpeech.visemes ??
        responseDataSpeech.viseme_timing ??
        responseDataSpeech.visemeTiming ??
        responseDataSpeech.mouth_timing ??
        responseDataSpeech.mouthTiming ??
        responseDataSpeech.lip_sync ??
        responseDataSpeech.lipSync ??
        responseDataSpeech.markers ??
        responseDataSpeech.speech_marks ??
        responseDataSpeech.speechMarks ??
        responseDataSpeech.phonemes ??
        responseDataSpeech.phoneme_timing ??
        responseDataSpeech.phonemeTiming ??
        responseDataVoiceAudio.visemes ??
        responseDataVoiceAudio.viseme_timing ??
        responseDataVoiceAudio.visemeTiming ??
        responseDataVoiceAudio.mouth_timing ??
        responseDataVoiceAudio.mouthTiming ??
        responseDataVoiceAudio.lip_sync ??
        responseDataVoiceAudio.lipSync ??
        responseDataVoiceAudio.markers ??
        responseDataVoiceAudio.speech_marks ??
        responseDataVoiceAudio.speechMarks ??
        responseDataVoiceAudio.phonemes ??
        responseDataVoiceAudio.phoneme_timing ??
        responseDataVoiceAudio.phonemeTiming ??
        responseOutput.visemes ??
        responseOutput.viseme_timing ??
        responseOutput.visemeTiming ??
        responseOutput.mouth_timing ??
        responseOutput.mouthTiming ??
        responseOutput.lip_sync ??
        responseOutput.lipSync ??
        responseOutput.markers ??
        responseOutput.speech_marks ??
        responseOutput.speechMarks ??
        responseOutput.phonemes ??
        responseOutput.phoneme_timing ??
        responseOutput.phonemeTiming ??
        responseOutputAudio.visemes ??
        responseOutputAudio.viseme_timing ??
        responseOutputAudio.visemeTiming ??
        responseOutputAudio.mouth_timing ??
        responseOutputAudio.mouthTiming ??
        responseOutputAudio.lip_sync ??
        responseOutputAudio.lipSync ??
        responseOutputAudio.markers ??
        responseOutputAudio.speech_marks ??
        responseOutputAudio.speechMarks ??
        responseOutputAudio.phonemes ??
        responseOutputAudio.phoneme_timing ??
        responseOutputAudio.phonemeTiming ??
        responseOutputSpeech.visemes ??
        responseOutputSpeech.viseme_timing ??
        responseOutputSpeech.visemeTiming ??
        responseOutputSpeech.mouth_timing ??
        responseOutputSpeech.mouthTiming ??
        responseOutputSpeech.lip_sync ??
        responseOutputSpeech.lipSync ??
        responseOutputSpeech.markers ??
        responseOutputSpeech.speech_marks ??
        responseOutputSpeech.speechMarks ??
        responseOutputSpeech.phonemes ??
        responseOutputSpeech.phoneme_timing ??
        responseOutputSpeech.phonemeTiming ??
        responseOutputVoiceAudio.visemes ??
        responseOutputVoiceAudio.viseme_timing ??
        responseOutputVoiceAudio.visemeTiming ??
        responseOutputVoiceAudio.mouth_timing ??
        responseOutputVoiceAudio.mouthTiming ??
        responseOutputVoiceAudio.lip_sync ??
        responseOutputVoiceAudio.lipSync ??
        responseOutputVoiceAudio.markers ??
        responseOutputVoiceAudio.speech_marks ??
        responseOutputVoiceAudio.speechMarks ??
        responseOutputVoiceAudio.phonemes ??
        responseOutputVoiceAudio.phoneme_timing ??
        responseOutputVoiceAudio.phonemeTiming ??
        responseResult.visemes ??
        responseResult.viseme_timing ??
        responseResult.visemeTiming ??
        responseResult.mouth_timing ??
        responseResult.mouthTiming ??
        responseResult.lip_sync ??
        responseResult.lipSync ??
        responseResult.markers ??
        responseResult.speech_marks ??
        responseResult.speechMarks ??
        responseResult.phonemes ??
        responseResult.phoneme_timing ??
        responseResult.phonemeTiming ??
        responseResultAudio.visemes ??
        responseResultAudio.viseme_timing ??
        responseResultAudio.visemeTiming ??
        responseResultAudio.mouth_timing ??
        responseResultAudio.mouthTiming ??
        responseResultAudio.lip_sync ??
        responseResultAudio.lipSync ??
        responseResultAudio.markers ??
        responseResultAudio.speech_marks ??
        responseResultAudio.speechMarks ??
        responseResultAudio.phonemes ??
        responseResultAudio.phoneme_timing ??
        responseResultAudio.phonemeTiming ??
        responseResultSpeech.visemes ??
        responseResultSpeech.viseme_timing ??
        responseResultSpeech.visemeTiming ??
        responseResultSpeech.mouth_timing ??
        responseResultSpeech.mouthTiming ??
        responseResultSpeech.lip_sync ??
        responseResultSpeech.lipSync ??
        responseResultSpeech.markers ??
        responseResultSpeech.speech_marks ??
        responseResultSpeech.speechMarks ??
        responseResultSpeech.phonemes ??
        responseResultSpeech.phoneme_timing ??
        responseResultSpeech.phonemeTiming ??
        responseResultVoiceAudio.visemes ??
        responseResultVoiceAudio.viseme_timing ??
        responseResultVoiceAudio.visemeTiming ??
        responseResultVoiceAudio.mouth_timing ??
        responseResultVoiceAudio.mouthTiming ??
        responseResultVoiceAudio.lip_sync ??
        responseResultVoiceAudio.lipSync ??
        responseResultVoiceAudio.markers ??
        responseResultVoiceAudio.speech_marks ??
        responseResultVoiceAudio.speechMarks ??
        responseResultVoiceAudio.phonemes ??
        responseResultVoiceAudio.phoneme_timing ??
        responseResultVoiceAudio.phonemeTiming ??
        job.mouth_timing ??
        job.mouthTiming ??
        job.visemes ??
        job.viseme_timing ??
        job.visemeTiming ??
        job.lip_sync ??
        job.lipSync ??
        job.speech_marks ??
        job.speechMarks
    ),
    adapter_validation_required: true,
  });
  return baseReceipt(job, {
    renderedAtMs: nowMs,
    artifactKind: audioArtifactKind,
    artifactPath: `tts/${audioName}`,
    extra: {
      engine_mode: "http",
      bridge_status: bridgeStatus,
      duration_ms: resolveTtsEngineDurationMs(response, normalizedAudio),
      sample_rate_hz: normalizedAudio.sampleRateHz,
      auxiliary_artifact_path: `tts/${visemeName}`,
    },
  });
}

function resolveTtsEngineDurationMs(response, normalizedAudio) {
  const durationMs = resolveOptionalEngineDurationMs(response);
  if (durationMs !== null && durationMs > 0) return durationMs;
  const wavDurationMs = inferWavDurationMs(normalizedAudio?.bytes);
  if (wavDurationMs !== null && wavDurationMs > 0) return wavDurationMs;
  throw new ContractError("Local TTS engine response: duration_ms is required");
}

function normalizeTtsEngineAudioOutput({ bytes, mime, sampleRateHz, channelCount, sampleFormat }) {
  if (isRawPcmAudioMime(mime)) {
    const safeSampleRateHz = clampInteger(sampleRateHz ?? 48000, 8000, 192000, 48000);
    const safeChannelCount = clampInteger(channelCount ?? 1, 1, 8, 1);
    const pcm16Bytes = convertRawPcmToPcm16(bytes, sampleFormat);
    return {
      bytes: wrapPcm16AsWav(pcm16Bytes, {
        sampleRateHz: safeSampleRateHz,
        channelCount: safeChannelCount,
      }),
      mime: "audio/wav",
      extension: "wav",
      sampleRateHz: safeSampleRateHz,
    };
  }
  return {
    bytes,
    mime,
    extension: audioExtensionFromMime(mime),
    sampleRateHz,
  };
}

function ttsArtifactKindFromMime(mime) {
  const text = safeText(mime, 120).toLowerCase().split(";", 1)[0].trim();
  if (text === "audio/wav" || text === "audio/x-wav" || text === "audio/wave") return "audio_wav";
  if (text === "audio/mpeg" || text === "audio/mp3" || text === "audio/mpeg3" || text === "audio/x-mp3" || text === "audio/x-mpeg" || text === "audio/x-mpeg-3") return "audio_mpeg";
  if (text === "audio/mp4" || text === "audio/m4a" || text === "audio/x-m4a") return "audio_mp4";
  if (text === "audio/aac" || text === "audio/x-aac") return "audio_aac";
  if (text === "audio/flac" || text === "audio/x-flac") return "audio_flac";
  if (text === "audio/ogg") return "audio_ogg";
  if (text === "audio/opus") return "audio_opus";
  if (text === "audio/webm" || text === "video/webm") return "audio_webm";
  return "";
}

function ttsContentTypeFromArtifactKind(artifactKind) {
  const text = safeText(artifactKind, 80);
  if (text === "audio_mpeg") return "audio/mpeg";
  if (text === "audio_mp4") return "audio/mp4";
  if (text === "audio_aac") return "audio/aac";
  if (text === "audio_flac") return "audio/flac";
  if (text === "audio_ogg") return "audio/ogg";
  if (text === "audio_opus") return "audio/opus";
  if (text === "audio_webm") return "audio/webm";
  return "audio/wav";
}

function isRawPcmAudioMime(mime) {
  const text = safeText(mime, 80).toLowerCase();
  return text.includes("l16") || text.includes("pcm");
}

function resolveTtsEngineSampleFormat(response, mime) {
  const data = responseDataObject(response);
  const dataAudio = ttsAudioPayloadObject(data, "audio");
  const dataSpeech = ttsAudioPayloadObject(data, "speech");
  const dataVoiceAudio = ttsAudioPayloadObject(data, "voice");
  const output = responseOutputObject(response);
  const outputAudio = ttsAudioPayloadObject(output, "audio");
  const outputSpeech = ttsAudioPayloadObject(output, "speech");
  const outputVoiceAudio = ttsAudioPayloadObject(output, "voice");
  const result = responseDataObject(response.result);
  const resultAudio = ttsAudioPayloadObject(result, "audio");
  const resultSpeech = ttsAudioPayloadObject(result, "speech");
  const resultVoiceAudio = ttsAudioPayloadObject(result, "voice");
  const speech = ttsAudioPayloadObject(response, "speech");
  const voiceAudio = ttsAudioPayloadObject(response, "voice");
  const explicit = safeText(
    response?.sample_format ??
      response?.sampleFormat ??
      response?.pcm_format ??
      response?.pcmFormat ??
      response?.audio_format ??
      response?.audioFormat ??
      response?.audio?.sample_format ??
      response?.audio?.sampleFormat ??
      response?.audio?.pcm_format ??
      response?.audio?.pcmFormat ??
      speech?.sample_format ??
      speech?.sampleFormat ??
      speech?.pcm_format ??
      speech?.pcmFormat ??
      speech?.audio_format ??
      speech?.audioFormat ??
      voiceAudio?.sample_format ??
      voiceAudio?.sampleFormat ??
      voiceAudio?.pcm_format ??
      voiceAudio?.pcmFormat ??
      voiceAudio?.audio_format ??
      voiceAudio?.audioFormat ??
      data?.sample_format ??
      data?.sampleFormat ??
      data?.pcm_format ??
      data?.pcmFormat ??
      data?.audio_format ??
      data?.audioFormat ??
      dataAudio?.sample_format ??
      dataAudio?.sampleFormat ??
      dataAudio?.pcm_format ??
      dataAudio?.pcmFormat ??
      dataSpeech?.sample_format ??
      dataSpeech?.sampleFormat ??
      dataSpeech?.pcm_format ??
      dataSpeech?.pcmFormat ??
      dataSpeech?.audio_format ??
      dataSpeech?.audioFormat ??
      dataVoiceAudio?.sample_format ??
      dataVoiceAudio?.sampleFormat ??
      dataVoiceAudio?.pcm_format ??
      dataVoiceAudio?.pcmFormat ??
      dataVoiceAudio?.audio_format ??
      dataVoiceAudio?.audioFormat ??
      output?.sample_format ??
      output?.sampleFormat ??
      output?.pcm_format ??
      output?.pcmFormat ??
      output?.audio_format ??
      output?.audioFormat ??
      outputAudio?.sample_format ??
      outputAudio?.sampleFormat ??
      outputAudio?.pcm_format ??
      outputAudio?.pcmFormat ??
      outputSpeech?.sample_format ??
      outputSpeech?.sampleFormat ??
      outputSpeech?.pcm_format ??
      outputSpeech?.pcmFormat ??
      outputSpeech?.audio_format ??
      outputSpeech?.audioFormat ??
      outputVoiceAudio?.sample_format ??
      outputVoiceAudio?.sampleFormat ??
      outputVoiceAudio?.pcm_format ??
      outputVoiceAudio?.pcmFormat ??
      outputVoiceAudio?.audio_format ??
      outputVoiceAudio?.audioFormat ??
      result?.sample_format ??
      result?.sampleFormat ??
      result?.pcm_format ??
      result?.pcmFormat ??
      result?.audio_format ??
      result?.audioFormat ??
      resultAudio?.sample_format ??
      resultAudio?.sampleFormat ??
      resultAudio?.pcm_format ??
      resultAudio?.pcmFormat ??
      resultSpeech?.sample_format ??
      resultSpeech?.sampleFormat ??
      resultSpeech?.pcm_format ??
      resultSpeech?.pcmFormat ??
      resultSpeech?.audio_format ??
      resultSpeech?.audioFormat ??
      resultVoiceAudio?.sample_format ??
      resultVoiceAudio?.sampleFormat ??
      resultVoiceAudio?.pcm_format ??
      resultVoiceAudio?.pcmFormat ??
      resultVoiceAudio?.audio_format ??
      resultVoiceAudio?.audioFormat,
    40
  ).toLowerCase();
  const text = `${explicit} ${safeText(mime, 120).toLowerCase()}`;
  if (text.includes("f32") || text.includes("float32")) return "f32le";
  if (text.includes("s16be") || text.includes("pcm16be")) return "s16be";
  if (text.includes("s24be") || text.includes("pcm24be")) return "s24be";
  if (text.includes("s32be") || text.includes("pcm32be")) return "s32be";
  if (text.includes("s24") || text.includes("pcm24") || text.includes("24bit")) return "s24le";
  if (text.includes("s32") || text.includes("pcm32") || text.includes("32bit")) return "s32le";
  return "s16le";
}

function resolveTtsEngineChannelCount(response, mime) {
  const data = responseDataObject(response);
  const dataAudio = ttsAudioPayloadObject(data, "audio");
  const dataSpeech = ttsAudioPayloadObject(data, "speech");
  const dataVoiceAudio = ttsAudioPayloadObject(data, "voice");
  const output = responseOutputObject(response);
  const outputAudio = ttsAudioPayloadObject(output, "audio");
  const outputSpeech = ttsAudioPayloadObject(output, "speech");
  const outputVoiceAudio = ttsAudioPayloadObject(output, "voice");
  const result = responseDataObject(response.result);
  const resultAudio = ttsAudioPayloadObject(result, "audio");
  const resultSpeech = ttsAudioPayloadObject(result, "speech");
  const resultVoiceAudio = ttsAudioPayloadObject(result, "voice");
  const speech = ttsAudioPayloadObject(response, "speech");
  const voiceAudio = ttsAudioPayloadObject(response, "voice");
  const explicit = safeOptionalNumber(
    response?.channel_count ??
      response?.channelCount ??
      response?.channels ??
      response?.audio_channels ??
      response?.audioChannels ??
      response?.audio_channel_count ??
      response?.audioChannelCount ??
      response?.audio?.channel_count ??
      response?.audio?.channelCount ??
      response?.audio?.channels ??
      response?.audio?.audio_channel_count ??
      response?.audio?.audioChannelCount ??
      speech?.channel_count ??
      speech?.channelCount ??
      speech?.channels ??
      speech?.audio_channels ??
      speech?.audioChannels ??
      speech?.audio_channel_count ??
      speech?.audioChannelCount ??
      voiceAudio?.channel_count ??
      voiceAudio?.channelCount ??
      voiceAudio?.channels ??
      voiceAudio?.audio_channels ??
      voiceAudio?.audioChannels ??
      voiceAudio?.audio_channel_count ??
      voiceAudio?.audioChannelCount ??
      data?.channel_count ??
      data?.channelCount ??
      data?.channels ??
      data?.audio_channels ??
      data?.audioChannels ??
      data?.audio_channel_count ??
      data?.audioChannelCount ??
      dataAudio?.channel_count ??
      dataAudio?.channelCount ??
      dataAudio?.channels ??
      dataSpeech?.channel_count ??
      dataSpeech?.channelCount ??
      dataSpeech?.channels ??
      dataSpeech?.audio_channels ??
      dataSpeech?.audioChannels ??
      dataSpeech?.audio_channel_count ??
      dataSpeech?.audioChannelCount ??
      dataVoiceAudio?.channel_count ??
      dataVoiceAudio?.channelCount ??
      dataVoiceAudio?.channels ??
      dataVoiceAudio?.audio_channels ??
      dataVoiceAudio?.audioChannels ??
      dataVoiceAudio?.audio_channel_count ??
      dataVoiceAudio?.audioChannelCount ??
      output?.channel_count ??
      output?.channelCount ??
      output?.channels ??
      output?.audio_channels ??
      output?.audioChannels ??
      output?.audio_channel_count ??
      output?.audioChannelCount ??
      outputAudio?.channel_count ??
      outputAudio?.channelCount ??
      outputAudio?.channels ??
      outputSpeech?.channel_count ??
      outputSpeech?.channelCount ??
      outputSpeech?.channels ??
      outputSpeech?.audio_channels ??
      outputSpeech?.audioChannels ??
      outputSpeech?.audio_channel_count ??
      outputSpeech?.audioChannelCount ??
      outputVoiceAudio?.channel_count ??
      outputVoiceAudio?.channelCount ??
      outputVoiceAudio?.channels ??
      outputVoiceAudio?.audio_channels ??
      outputVoiceAudio?.audioChannels ??
      outputVoiceAudio?.audio_channel_count ??
      outputVoiceAudio?.audioChannelCount ??
      result?.channel_count ??
      result?.channelCount ??
      result?.channels ??
      result?.audio_channels ??
      result?.audioChannels ??
      result?.audio_channel_count ??
      result?.audioChannelCount ??
      resultAudio?.channel_count ??
      resultAudio?.channelCount ??
      resultAudio?.channels ??
      resultSpeech?.channel_count ??
      resultSpeech?.channelCount ??
      resultSpeech?.channels ??
      resultSpeech?.audio_channels ??
      resultSpeech?.audioChannels ??
      resultSpeech?.audio_channel_count ??
      resultSpeech?.audioChannelCount ??
      resultVoiceAudio?.channel_count ??
      resultVoiceAudio?.channelCount ??
      resultVoiceAudio?.channels ??
      resultVoiceAudio?.audio_channels ??
      resultVoiceAudio?.audioChannels ??
      resultVoiceAudio?.audio_channel_count ??
      resultVoiceAudio?.audioChannelCount
  );
  if (explicit !== null) return explicit;
  const match = safeText(mime, 120).match(/(?:^|[;,\s])channels=(\d+)/iu);
  return match ? Number(match[1]) : null;
}

function resolveTtsEngineSampleRateHz(response, mime) {
  const data = responseDataObject(response);
  const dataAudio = ttsAudioPayloadObject(data, "audio");
  const dataSpeech = ttsAudioPayloadObject(data, "speech");
  const dataVoiceAudio = ttsAudioPayloadObject(data, "voice");
  const output = responseOutputObject(response);
  const outputAudio = ttsAudioPayloadObject(output, "audio");
  const outputSpeech = ttsAudioPayloadObject(output, "speech");
  const outputVoiceAudio = ttsAudioPayloadObject(output, "voice");
  const result = responseDataObject(response.result);
  const resultAudio = ttsAudioPayloadObject(result, "audio");
  const resultSpeech = ttsAudioPayloadObject(result, "speech");
  const resultVoiceAudio = ttsAudioPayloadObject(result, "voice");
  const speech = ttsAudioPayloadObject(response, "speech");
  const voiceAudio = ttsAudioPayloadObject(response, "voice");
  const explicit = safeOptionalNumber(
      response?.sample_rate_hz ??
      response?.sampleRateHz ??
      response?.sampleRateHZ ??
      response?.sample_rate ??
      response?.sampleRate ??
      response?.audio_sample_rate_hz ??
      response?.audioSampleRateHz ??
      response?.audioSampleRateHZ ??
      response?.audio_sample_rate ??
      response?.audioSampleRate ??
      response?.audio?.sample_rate_hz ??
      response?.audio?.sampleRateHz ??
      response?.audio?.sampleRateHZ ??
      response?.audio?.sample_rate ??
      response?.audio?.sampleRate ??
      speech?.sample_rate_hz ??
      speech?.sampleRateHz ??
      speech?.sampleRateHZ ??
      speech?.sample_rate ??
      speech?.sampleRate ??
      speech?.audio_sample_rate_hz ??
      speech?.audioSampleRateHz ??
      speech?.audioSampleRateHZ ??
      speech?.audio_sample_rate ??
      speech?.audioSampleRate ??
      voiceAudio?.sample_rate_hz ??
      voiceAudio?.sampleRateHz ??
      voiceAudio?.sampleRateHZ ??
      voiceAudio?.sample_rate ??
      voiceAudio?.sampleRate ??
      voiceAudio?.audio_sample_rate_hz ??
      voiceAudio?.audioSampleRateHz ??
      voiceAudio?.audioSampleRateHZ ??
      voiceAudio?.audio_sample_rate ??
      voiceAudio?.audioSampleRate ??
      data?.sample_rate_hz ??
      data?.sampleRateHz ??
      data?.sampleRateHZ ??
      data?.sample_rate ??
      data?.sampleRate ??
      data?.audio_sample_rate_hz ??
      data?.audioSampleRateHz ??
      data?.audioSampleRateHZ ??
      data?.audio_sample_rate ??
      data?.audioSampleRate ??
      dataAudio?.sample_rate_hz ??
      dataAudio?.sampleRateHz ??
      dataAudio?.sampleRateHZ ??
      dataAudio?.sample_rate ??
      dataAudio?.sampleRate ??
      dataSpeech?.sample_rate_hz ??
      dataSpeech?.sampleRateHz ??
      dataSpeech?.sampleRateHZ ??
      dataSpeech?.sample_rate ??
      dataSpeech?.sampleRate ??
      dataSpeech?.audio_sample_rate_hz ??
      dataSpeech?.audioSampleRateHz ??
      dataSpeech?.audioSampleRateHZ ??
      dataSpeech?.audio_sample_rate ??
      dataSpeech?.audioSampleRate ??
      dataVoiceAudio?.sample_rate_hz ??
      dataVoiceAudio?.sampleRateHz ??
      dataVoiceAudio?.sampleRateHZ ??
      dataVoiceAudio?.sample_rate ??
      dataVoiceAudio?.sampleRate ??
      dataVoiceAudio?.audio_sample_rate_hz ??
      dataVoiceAudio?.audioSampleRateHz ??
      dataVoiceAudio?.audioSampleRateHZ ??
      dataVoiceAudio?.audio_sample_rate ??
      dataVoiceAudio?.audioSampleRate ??
      output?.sample_rate_hz ??
      output?.sampleRateHz ??
      output?.sampleRateHZ ??
      output?.sample_rate ??
      output?.sampleRate ??
      output?.audio_sample_rate_hz ??
      output?.audioSampleRateHz ??
      output?.audioSampleRateHZ ??
      output?.audio_sample_rate ??
      output?.audioSampleRate ??
      outputAudio?.sample_rate_hz ??
      outputAudio?.sampleRateHz ??
      outputAudio?.sampleRateHZ ??
      outputAudio?.sample_rate ??
      outputAudio?.sampleRate ??
      outputSpeech?.sample_rate_hz ??
      outputSpeech?.sampleRateHz ??
      outputSpeech?.sampleRateHZ ??
      outputSpeech?.sample_rate ??
      outputSpeech?.sampleRate ??
      outputSpeech?.audio_sample_rate_hz ??
      outputSpeech?.audioSampleRateHz ??
      outputSpeech?.audioSampleRateHZ ??
      outputSpeech?.audio_sample_rate ??
      outputSpeech?.audioSampleRate ??
      outputVoiceAudio?.sample_rate_hz ??
      outputVoiceAudio?.sampleRateHz ??
      outputVoiceAudio?.sampleRateHZ ??
      outputVoiceAudio?.sample_rate ??
      outputVoiceAudio?.sampleRate ??
      outputVoiceAudio?.audio_sample_rate_hz ??
      outputVoiceAudio?.audioSampleRateHz ??
      outputVoiceAudio?.audioSampleRateHZ ??
      outputVoiceAudio?.audio_sample_rate ??
      outputVoiceAudio?.audioSampleRate ??
      result?.sample_rate_hz ??
      result?.sampleRateHz ??
      result?.sampleRateHZ ??
      result?.sample_rate ??
      result?.sampleRate ??
      result?.audio_sample_rate_hz ??
      result?.audioSampleRateHz ??
      result?.audioSampleRateHZ ??
      result?.audio_sample_rate ??
      result?.audioSampleRate ??
      resultAudio?.sample_rate_hz ??
      resultAudio?.sampleRateHz ??
      resultAudio?.sampleRateHZ ??
      resultAudio?.sample_rate ??
      resultAudio?.sampleRate ??
      resultSpeech?.sample_rate_hz ??
      resultSpeech?.sampleRateHz ??
      resultSpeech?.sampleRateHZ ??
      resultSpeech?.sample_rate ??
      resultSpeech?.sampleRate ??
      resultSpeech?.audio_sample_rate_hz ??
      resultSpeech?.audioSampleRateHz ??
      resultSpeech?.audioSampleRateHZ ??
      resultSpeech?.audio_sample_rate ??
      resultSpeech?.audioSampleRate ??
      resultVoiceAudio?.sample_rate_hz ??
      resultVoiceAudio?.sampleRateHz ??
      resultVoiceAudio?.sampleRateHZ ??
      resultVoiceAudio?.sample_rate ??
      resultVoiceAudio?.sampleRate ??
      resultVoiceAudio?.audio_sample_rate_hz ??
      resultVoiceAudio?.audioSampleRateHz ??
      resultVoiceAudio?.audioSampleRateHZ ??
      resultVoiceAudio?.audio_sample_rate ??
      resultVoiceAudio?.audioSampleRate
  );
  if (explicit !== null) return explicit;
  const match = safeText(mime, 160).match(
    /(?:^|[;,\s])(?:rate|sample_rate|sample-rate|samplerate)=(\d+)/iu
  );
  return match ? Number(match[1]) : null;
}

function processLive2dJob(job, { artifactDir, nowMs }) {
  const kindDir = join(artifactDir, "live2d");
  mkdirSync(kindDir, { recursive: true });
  const artifactName = `${safeFileName(job.job_id)}.live2d.json`;
  const artifactPath = join(kindDir, artifactName);
  writeJsonAtomic(artifactPath, {
    schema: "iris_local_live2d_cue_artifact_v1",
    job_id: job.job_id,
    event_id: job.event_id,
    cue: createLocalLive2dRendererCue(job),
    motion_style: job.motion_style ?? job.motionStyle ?? job.motion_key ?? job.motionKey ?? job.gesture,
    motion_intensity: safeOptionalNumber(job.motion_intensity ?? job.motionIntensity ?? job.intensity),
    body_state_id: job.body_state_id ?? job.bodyStateId ?? job.body_state ?? job.bodyState,
    camera_proximity_profile:
      job.camera_proximity_profile ?? job.cameraProximityProfile ?? job.camera_profile ?? job.cameraProfile,
    expression_profile_id:
      job.expression_profile_id ??
      job.expressionProfileId ??
      job.expression_id ??
      job.expressionId ??
      job.facial_expression ??
      job.facialExpression ??
      job.emotion,
    autonomous_state_id: job.autonomous_state_id ?? job.autonomousStateId ?? job.state_id ?? job.stateId,
    timing: job.timing,
    tracks: job.tracks,
    adapter_validation_required: true,
  });
  assertLocalRenderArtifactFileForPickup({
    adapterKind: "live2d",
    artifactKind: "live2d_cue_json",
    artifactPath,
    context: "Local Live2D cue artifact",
  });
  return baseReceipt(job, {
    renderedAtMs: nowMs,
    artifactKind: "live2d_cue_json",
    artifactPath: `live2d/${artifactName}`,
    extra: {
      engine_mode: "local_live2d_cue_artifact",
      duration_ms: resolveLocalLive2dJobDurationMs(job),
    },
  });
}

function resolveLocalLive2dJobDurationMs(job) {
  const timing =
    job.timing && typeof job.timing === "object" && !Array.isArray(job.timing)
      ? job.timing
      : {};
  return resolveEngineDurationMs(
    timing.total_duration_ms ?? timing.totalDurationMs ?? timing.duration_ms ?? timing.durationMs,
    timing.total_duration_seconds ?? timing.totalDurationSeconds ?? timing.duration_seconds ?? timing.durationSeconds ?? timing.duration
  );
}

function createLocalLive2dRendererCue(job) {
  const timing =
    job.timing && typeof job.timing === "object" && !Array.isArray(job.timing)
      ? job.timing
      : {};
  return {
    schema: "iris_live2d_renderer_cue_v1",
    motion: {
      style: safeText(
        job.motion_style ??
          job.motionStyle ??
          job.motion ??
          job.motion_key ??
          job.motionKey ??
          job.gesture ??
          job.pose ??
          job.state ??
          "idle_breath",
        80
      ),
      intensity: safeOptionalNumber(job.motion_intensity ?? job.motionIntensity) ?? 0,
      body_state_id: safeText(job.body_state_id ?? job.bodyStateId, 120),
    },
    expression: {
      profile_id: safeText(
        job.expression_profile_id ??
          job.expressionProfileId ??
          job.expression ??
          job.expression_key ??
          job.expressionKey ??
          job.facial_expression ??
          job.facialExpression ??
          job.emotion ??
          "neutral",
        120
      ),
      autonomous_state_id: safeText(job.autonomous_state_id ?? job.autonomousStateId ?? "none", 120),
    },
    camera: {
      proximity_profile: safeText(job.camera_proximity_profile ?? job.cameraProximityProfile ?? "medium", 80),
    },
    timing: {
      total_duration_ms: resolveEngineDurationMs(
        timing.total_duration_ms ?? timing.totalDurationMs ?? timing.duration_ms ?? timing.durationMs,
        timing.total_duration_seconds ?? timing.totalDurationSeconds ?? timing.duration_seconds ?? timing.durationSeconds ?? timing.duration
      ) ?? 1000,
      hold_ms: resolveEngineDurationMs(timing.hold_ms ?? timing.holdMs, timing.hold_seconds ?? timing.holdSeconds),
      transition_ms: resolveEngineDurationMs(
        timing.transition_ms ?? timing.transitionMs,
        timing.transition_seconds ?? timing.transitionSeconds
      ),
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

async function processLive2dJobViaHttp(job, { artifactDir, nowMs, engineConfig }) {
  const kindDir = join(artifactDir, "live2d");
  mkdirSync(kindDir, { recursive: true });
  const response = await postEngineRequest({
    endpoint: engineConfig.live2d.endpoint,
    apiKey: engineConfig.live2d.apiKey,
    timeoutMs: engineConfig.timeoutMs,
    fetchImpl: engineConfig.fetchImpl,
    request: createLive2dEngineRequest(job, engineConfig.live2d.preferences),
    context: "Local Live2D engine",
  });
  const cue = resolveLive2dCue(response, "Local Live2D engine response");
  validateLive2dEngineCue(cue, "Local Live2D engine response");
  const artifactName = `${safeFileName(job.job_id)}.live2d-engine.json`;
  const bridgeStatus = requiredEngineBridgeStatus(response, "Local Live2D engine response");
  const artifactPath = join(kindDir, artifactName);
  writeJsonAtomic(artifactPath, {
    schema: "iris_local_live2d_engine_artifact_v1",
    job_id: job.job_id,
    event_id: job.event_id,
    engine_mode: "http",
    bridge_status: bridgeStatus,
    cue: sanitizeEngineObject(cue),
    adapter_validation_required: true,
  });
  assertLocalRenderArtifactFileForPickup({
    adapterKind: "live2d",
    artifactKind: "live2d_engine_cue_json",
    artifactPath,
    context: "Local Live2D engine artifact",
  });
  return baseReceipt(job, {
    renderedAtMs: nowMs,
    artifactKind: "live2d_engine_cue_json",
    artifactPath: `live2d/${artifactName}`,
    extra: {
      engine_mode: "http",
      bridge_status: bridgeStatus,
      duration_ms: resolveLive2dEngineDurationMs(response, cue),
    },
  });
}

function resolveLive2dEngineDurationMs(response, cue) {
  const data = responseDataObject(response);
  const output = responseOutputObject(response);
  const durationMs = resolveEngineDurationMs(
      response?.duration_ms ??
      response?.durationMs ??
      response?.length_ms ??
      response?.lengthMs ??
      response?.motion_duration_ms ??
      response?.motionDurationMs ??
      response?.animation_duration_ms ??
      response?.animationDurationMs ??
      response?.display_duration_ms ??
      response?.displayDurationMs ??
      response?.cue_duration_ms ??
      response?.cueDurationMs ??
      response?.total_duration_ms ??
      response?.totalDurationMs ??
      data?.duration_ms ??
      data?.durationMs ??
      data?.length_ms ??
      data?.lengthMs ??
      data?.motion_duration_ms ??
      data?.motionDurationMs ??
      data?.animation_duration_ms ??
      data?.animationDurationMs ??
      data?.display_duration_ms ??
      data?.displayDurationMs ??
      data?.cue_duration_ms ??
      data?.cueDurationMs ??
      data?.total_duration_ms ??
      data?.totalDurationMs ??
      output?.duration_ms ??
      output?.durationMs ??
      output?.length_ms ??
      output?.lengthMs ??
      output?.motion_duration_ms ??
      output?.motionDurationMs ??
      output?.animation_duration_ms ??
      output?.animationDurationMs ??
      output?.display_duration_ms ??
      output?.displayDurationMs ??
      output?.cue_duration_ms ??
      output?.cueDurationMs ??
      output?.total_duration_ms ??
      output?.totalDurationMs ??
      cue?.timing?.total_duration_ms ??
      cue?.timing?.totalDurationMs ??
      cue?.timing?.length_ms ??
      cue?.timing?.lengthMs ??
      cue?.timing?.animation_duration_ms ??
      cue?.timing?.animationDurationMs ??
      cue?.timing?.display_duration_ms ??
      cue?.timing?.displayDurationMs ??
      cue?.timing?.cue_duration_ms ??
      cue?.timing?.cueDurationMs ??
      cue?.duration_ms ??
      cue?.durationMs ??
      cue?.length_ms ??
      cue?.lengthMs,
    response?.duration_seconds ??
      response?.durationSeconds ??
      response?.duration_s ??
      response?.durationS ??
      response?.length_seconds ??
      response?.lengthSeconds ??
      response?.length_s ??
      response?.lengthS ??
      response?.motion_duration_seconds ??
      response?.motionDurationSeconds ??
      response?.animation_duration_seconds ??
      response?.animationDurationSeconds ??
      response?.display_duration_seconds ??
      response?.displayDurationSeconds ??
      response?.cue_duration_seconds ??
      response?.cueDurationSeconds ??
      response?.total_duration_seconds ??
      response?.totalDurationSeconds ??
      data?.duration_seconds ??
      data?.durationSeconds ??
      data?.duration_s ??
      data?.durationS ??
      data?.length_seconds ??
      data?.lengthSeconds ??
      data?.length_s ??
      data?.lengthS ??
      data?.motion_duration_seconds ??
      data?.motionDurationSeconds ??
      data?.animation_duration_seconds ??
      data?.animationDurationSeconds ??
      data?.display_duration_seconds ??
      data?.displayDurationSeconds ??
      data?.cue_duration_seconds ??
      data?.cueDurationSeconds ??
      data?.total_duration_seconds ??
      data?.totalDurationSeconds ??
      output?.duration_seconds ??
      output?.durationSeconds ??
      output?.duration_s ??
      output?.durationS ??
      output?.length_seconds ??
      output?.lengthSeconds ??
      output?.length_s ??
      output?.lengthS ??
      output?.motion_duration_seconds ??
      output?.motionDurationSeconds ??
      output?.animation_duration_seconds ??
      output?.animationDurationSeconds ??
      output?.display_duration_seconds ??
      output?.displayDurationSeconds ??
      output?.cue_duration_seconds ??
      output?.cueDurationSeconds ??
      output?.total_duration_seconds ??
      output?.totalDurationSeconds ??
      cue?.timing?.total_duration_seconds ??
      cue?.timing?.totalDurationSeconds ??
      cue?.timing?.duration_s ??
      cue?.timing?.durationS ??
      cue?.timing?.length_seconds ??
      cue?.timing?.lengthSeconds ??
      cue?.timing?.length_s ??
      cue?.timing?.lengthS ??
      cue?.timing?.animation_duration_seconds ??
      cue?.timing?.animationDurationSeconds ??
      cue?.timing?.display_duration_seconds ??
      cue?.timing?.displayDurationSeconds ??
      cue?.timing?.cue_duration_seconds ??
      cue?.timing?.cueDurationSeconds ??
      cue?.duration_seconds ??
      cue?.durationSeconds ??
      cue?.duration_s ??
      cue?.durationS ??
      cue?.length_seconds ??
      cue?.lengthSeconds ??
      cue?.length_s ??
      cue?.lengthS
  );
  if (durationMs === null || durationMs <= 0) {
    throw new ContractError("Local Live2D engine response: duration_ms is required");
  }
  return durationMs;
}

function processSubtitleJob(job, { artifactDir, nowMs }) {
  const kindDir = join(artifactDir, "subtitle");
  mkdirSync(kindDir, { recursive: true });
  const artifactName = `${safeFileName(job.job_id)}.vtt`;
  const timing = requiredSubtitleTiming(job);
  const artifactPath = join(kindDir, artifactName);
  writeFileSync(artifactPath, renderVtt(job, timing), "utf8");
  assertLocalRenderArtifactFileForPickup({
    adapterKind: "subtitle",
    artifactKind: "subtitle_vtt",
    artifactPath,
    context: "Local subtitle artifact",
  });
  return baseReceipt(job, {
    renderedAtMs: nowMs,
    artifactKind: "subtitle_vtt",
    artifactPath: `subtitle/${artifactName}`,
    extra: {
      engine_mode: "local_vtt",
      duration_ms: timing.duration_ms,
      subtitle_language: safeText(job.subtitle_language ?? job.subtitleLanguage, 32),
      script_direction: safeText(job.script_direction ?? job.scriptDirection, 16),
    },
  });
}

async function processSubtitleJobViaHttp(job, { artifactDir, nowMs, engineConfig }) {
  const kindDir = join(artifactDir, "subtitle");
  mkdirSync(kindDir, { recursive: true });
  const response = await postEngineRequest({
    endpoint: engineConfig.subtitle.endpoint,
    apiKey: engineConfig.subtitle.apiKey,
    timeoutMs: engineConfig.timeoutMs,
    fetchImpl: engineConfig.fetchImpl,
    request: createSubtitleEngineRequest(job),
    context: "Local subtitle engine",
  });
  const timing = requiredSubtitleTiming(job);
  const vtt = resolveSubtitleEngineVtt(response, job, timing);
  const artifactName = `${safeFileName(job.job_id)}.engine.vtt`;
  const bridgeStatus = requiredEngineBridgeStatus(response, "Local subtitle engine response");
  const artifactPath = join(kindDir, artifactName);
  writeFileSync(artifactPath, vtt, "utf8");
  assertLocalRenderArtifactFileForPickup({
    adapterKind: "subtitle",
    artifactKind: "subtitle_vtt",
    artifactPath,
    context: "Local subtitle engine artifact",
  });
  return baseReceipt(job, {
    renderedAtMs: nowMs,
    artifactKind: "subtitle_vtt",
    artifactPath: `subtitle/${artifactName}`,
    extra: {
      engine_mode: "http",
      bridge_status: bridgeStatus,
      duration_ms: resolveSubtitleEngineDurationMs(response, timing),
      subtitle_language: safeText(job.subtitle_language ?? job.subtitleLanguage, 32),
      script_direction: safeText(job.script_direction ?? job.scriptDirection, 16),
    },
  });
}

function resolveSubtitleEngineDurationMs(response, timing) {
  const durationMs = resolveOptionalEngineDurationMs(response);
  if (durationMs !== null && durationMs > 0) return durationMs;
  return timing.duration_ms;
}

function resolveSubtitleEngineVtt(response, job, timing) {
  const data = responseDataObject(response);
  const output = responseOutputObject(response);
  const result = responseDataObject(response.result);
  const subtitleSources = collectSubtitlePayloadSources(response, data, output, result);
  const subtitleDataUrl = firstSubtitleTextDataUrl(...subtitleSources);
  if (subtitleDataUrl) {
    const parsed = parseSubtitleTextDataUrl(
      subtitleDataUrl.value,
      "Local subtitle engine response"
    );
    const subtitleText = requiredEnginePublicText(
      parsed.text,
      "Local subtitle engine response data URL",
      { maxLength: 20_000 }
    );
    if (
      subtitleDataUrl.kind === "srt" ||
      parsed.mime.includes("subrip") ||
      parsed.mime.includes("srt")
    ) {
      return convertSrtToVtt(subtitleText);
    }
    if (subtitleDataUrl.kind === "vtt" || subtitleText.trimStart().startsWith("WEBVTT")) {
      return subtitleText;
    }
    return renderVtt(
      {
        ...job,
        line_break_plan: splitSubtitleCaptionLines(subtitleText),
      },
      timing
    );
  }
  const subtitleBase64 = firstSubtitleTextBase64(...subtitleSources);
  if (subtitleBase64) {
    const subtitleText = requiredEnginePublicText(
      Buffer.from(subtitleBase64.value, "base64").toString("utf8"),
      "Local subtitle engine response base64",
      { maxLength: 20_000 }
    );
    if (subtitleBase64.kind === "srt") return convertSrtToVtt(subtitleText);
    if (subtitleBase64.kind === "vtt" || subtitleText.trimStart().startsWith("WEBVTT")) {
      return subtitleText;
    }
    return renderVtt(
      {
        ...job,
        line_break_plan: splitSubtitleCaptionLines(subtitleText),
      },
      timing
    );
  }
  const vtt = response.vtt ??
    response.subtitle_vtt ??
    response.subtitleVtt ??
    response.subtitleVTT ??
    response.webvtt ??
    response.webVtt ??
    response.webVTT ??
    response.vtt_text ??
    response.vttText ??
    response.vttTEXT ??
    response.caption_vtt ??
    response.captionVtt ??
    response.captionVTT ??
    response.transcript_vtt ??
    response.transcriptVtt ??
    response.transcriptVTT ??
    data.vtt ??
    data.subtitle_vtt ??
    data.subtitleVtt ??
    data.subtitleVTT ??
    data.webvtt ??
    data.webVtt ??
    data.webVTT ??
    data.vtt_text ??
    data.vttText ??
    data.vttTEXT ??
    data.caption_vtt ??
    data.captionVtt ??
    data.captionVTT ??
    data.transcript_vtt ??
    data.transcriptVtt ??
    data.transcriptVTT ??
    output.vtt ??
    output.subtitle_vtt ??
    output.subtitleVtt ??
    output.subtitleVTT ??
    output.webvtt ??
    output.webVtt ??
    output.webVTT ??
    output.vtt_text ??
    output.vttText ??
    output.vttTEXT ??
    output.caption_vtt ??
    output.captionVtt ??
    output.captionVTT ??
    output.transcript_vtt ??
    output.transcriptVtt ??
    output.transcriptVTT ??
    result.vtt ??
    result.subtitle_vtt ??
    result.subtitleVtt ??
    result.subtitleVTT ??
    result.webvtt ??
    result.webVtt ??
    result.webVTT ??
    result.vtt_text ??
    result.vttText ??
    result.vttTEXT ??
    result.caption_vtt ??
    result.captionVtt ??
    result.captionVTT ??
    result.transcript_vtt ??
    result.transcriptVtt ??
    result.transcriptVTT ??
    firstSubtitleTextValue(subtitleSources, [
      "vtt",
      "subtitle_vtt",
      "subtitleVtt",
      "subtitleVTT",
      "webvtt",
      "webVtt",
      "webVTT",
      "vtt_text",
      "vttText",
      "vttTEXT",
      "caption_vtt",
      "captionVtt",
      "captionVTT",
      "transcript_vtt",
      "transcriptVtt",
      "transcriptVTT",
    ]);
  if (vtt) {
    return requiredEnginePublicText(vtt, "Local subtitle engine response", {
      maxLength: 20_000,
    });
  }
  const srt = response.srt ??
    response.subtitle_srt ??
    response.subtitleSrt ??
    response.subtitleSRT ??
    response.srt_text ??
    response.srtText ??
    response.srtTEXT ??
    response.caption_srt ??
    response.captionSrt ??
    response.captionSRT ??
    response.transcript_srt ??
    response.transcriptSrt ??
    response.transcriptSRT ??
    data.srt ??
    data.subtitle_srt ??
    data.subtitleSrt ??
    data.subtitleSRT ??
    data.srt_text ??
    data.srtText ??
    data.srtTEXT ??
    data.caption_srt ??
    data.captionSrt ??
    data.captionSRT ??
    data.transcript_srt ??
    data.transcriptSrt ??
    data.transcriptSRT ??
    output.srt ??
    output.subtitle_srt ??
    output.subtitleSrt ??
    output.subtitleSRT ??
    output.srt_text ??
    output.srtText ??
    output.srtTEXT ??
    output.caption_srt ??
    output.captionSrt ??
    output.captionSRT ??
    output.transcript_srt ??
    output.transcriptSrt ??
    output.transcriptSRT ??
    result.srt ??
    result.subtitle_srt ??
    result.subtitleSrt ??
    result.subtitleSRT ??
    result.srt_text ??
    result.srtText ??
    result.srtTEXT ??
    result.caption_srt ??
    result.captionSrt ??
    result.captionSRT ??
    result.transcript_srt ??
    result.transcriptSrt ??
    result.transcriptSRT ??
    firstSubtitleTextValue(subtitleSources, [
      "srt",
      "subtitle_srt",
      "subtitleSrt",
      "subtitleSRT",
      "srt_text",
      "srtText",
      "srtTEXT",
      "caption_srt",
      "captionSrt",
      "captionSRT",
      "transcript_srt",
      "transcriptSrt",
      "transcriptSRT",
    ]);
  if (srt) {
    return convertSrtToVtt(
      requiredEnginePublicText(srt, "Local subtitle engine response SRT", {
        maxLength: 20_000,
      })
    );
  }
  const cueSegments = response.cues ??
    response.segments ??
    response.utterances ??
    response.subtitles ??
    response.items ??
    response.results ??
    response.words ??
    response.tokens ??
    response.word_timings ??
    response.wordTimings ??
    response.token_timings ??
    response.tokenTimings ??
    response.subtitle_cues ??
    response.subtitleCues ??
    response.subtitleCUEs ??
    response.caption_cues ??
    response.captionCues ??
    response.captionCUEs ??
    data.cues ??
    data.segments ??
    data.utterances ??
    data.subtitles ??
    data.items ??
    data.results ??
    data.words ??
    data.tokens ??
    data.word_timings ??
    data.wordTimings ??
    data.token_timings ??
    data.tokenTimings ??
    data.subtitle_cues ??
    data.subtitleCues ??
    data.subtitleCUEs ??
    data.caption_cues ??
    data.captionCues ??
    data.captionCUEs ??
    output.cues ??
    output.segments ??
    output.utterances ??
    output.subtitles ??
    output.items ??
    output.results ??
    output.words ??
    output.tokens ??
    output.word_timings ??
    output.wordTimings ??
    output.token_timings ??
    output.tokenTimings ??
    output.subtitle_cues ??
    output.subtitleCues ??
    output.subtitleCUEs ??
    output.caption_cues ??
    output.captionCues ??
    output.captionCUEs ??
    result.cues ??
    result.segments ??
    result.utterances ??
    result.subtitles ??
    result.items ??
    result.results ??
    result.words ??
    result.tokens ??
    result.word_timings ??
    result.wordTimings ??
    result.token_timings ??
    result.tokenTimings ??
    result.subtitle_cues ??
    result.subtitleCues ??
    result.subtitleCUEs ??
    result.caption_cues ??
    result.captionCues ??
    result.captionCUEs;
  if (Array.isArray(cueSegments) && cueSegments.length > 0) {
    return renderSubtitleCueSegmentsVtt(cueSegments, timing);
  }
  const captionLines = response.lines ??
    response.subtitle_lines ??
    response.subtitleLines ??
    response.subtitleLINEs ??
    response.caption_lines ??
    response.captionLines ??
    response.captionLINEs ??
    response.display_lines ??
    response.displayLines ??
    response.displayLINEs ??
    response.transcript_lines ??
    response.transcriptLines ??
    response.transcriptLINEs ??
    response.captions ??
    data.lines ??
    data.subtitle_lines ??
    data.subtitleLines ??
    data.subtitleLINEs ??
    data.caption_lines ??
    data.captionLines ??
    data.captionLINEs ??
    data.display_lines ??
    data.displayLines ??
    data.displayLINEs ??
    data.transcript_lines ??
    data.transcriptLines ??
    data.transcriptLINEs ??
    data.captions ??
    output.lines ??
    output.subtitle_lines ??
    output.subtitleLines ??
    output.subtitleLINEs ??
    output.caption_lines ??
    output.captionLines ??
    output.captionLINEs ??
    output.display_lines ??
    output.displayLines ??
    output.displayLINEs ??
    output.transcript_lines ??
    output.transcriptLines ??
    output.transcriptLINEs ??
    output.captions ??
    result.lines ??
    result.subtitle_lines ??
    result.subtitleLines ??
    result.subtitleLINEs ??
    result.caption_lines ??
    result.captionLines ??
    result.captionLINEs ??
    result.display_lines ??
    result.displayLines ??
    result.displayLINEs ??
    result.transcript_lines ??
    result.transcriptLines ??
    result.transcriptLINEs ??
    result.captions;
  if (Array.isArray(captionLines) && captionLines.length > 0) {
    return renderVtt(
      {
        ...job,
        line_break_plan: normalizeSubtitleCaptionLines(captionLines),
      },
      timing
    );
  }
  const caption = response.caption ??
    response.subtitle ??
    response.subtitle_text ??
    response.subtitleText ??
    response.subtitleTEXT ??
    response.subtitle_body ??
    response.subtitleBody ??
    response.subtitleBODY ??
    response.output ??
    response.output_text ??
    response.outputText ??
    response.outputTEXT ??
    response.plain_text ??
    response.plainText ??
    response.plainTEXT ??
    response.text ??
    response.message ??
    response.body ??
    response.caption_body ??
    response.captionBody ??
    response.captionBODY ??
    response.caption_text ??
    response.captionText ??
    response.captionTEXT ??
    response.transcript ??
    response.transcript_text ??
    response.transcriptText ??
    response.transcriptTEXT ??
    response.display_caption ??
    response.displayCaption ??
    response.display_text ??
    response.displayText ??
    response.displayTEXT ??
    data.caption ??
    data.subtitle ??
    data.subtitle_text ??
    data.subtitleText ??
    data.subtitleTEXT ??
    data.subtitle_body ??
    data.subtitleBody ??
    data.subtitleBODY ??
    data.output ??
    data.output_text ??
    data.outputText ??
    data.outputTEXT ??
    data.plain_text ??
    data.plainText ??
    data.plainTEXT ??
    data.text ??
    data.message ??
    data.body ??
    data.caption_body ??
    data.captionBody ??
    data.captionBODY ??
    data.caption_text ??
    data.captionText ??
    data.captionTEXT ??
    data.transcript ??
    data.transcript_text ??
    data.transcriptText ??
    data.transcriptTEXT ??
    data.display_caption ??
    data.displayCaption ??
    data.display_text ??
    data.displayText ??
    data.displayTEXT ??
    output.caption ??
    output.subtitle ??
    output.subtitle_text ??
    output.subtitleText ??
    output.subtitleTEXT ??
    output.subtitle_body ??
    output.subtitleBody ??
    output.subtitleBODY ??
    output.output ??
    output.output_text ??
    output.outputText ??
    output.outputTEXT ??
    output.plain_text ??
    output.plainText ??
    output.plainTEXT ??
    output.text ??
    output.message ??
    output.body ??
    output.caption_body ??
    output.captionBody ??
    output.captionBODY ??
    output.caption_text ??
    output.captionText ??
    output.captionTEXT ??
    output.transcript ??
    output.transcript_text ??
    output.transcriptText ??
    output.transcriptTEXT ??
    output.display_caption ??
    output.displayCaption ??
    output.display_text ??
    output.displayText ??
    output.displayTEXT ??
    result.caption ??
    result.subtitle ??
    result.subtitle_text ??
    result.subtitleText ??
    result.subtitleTEXT ??
    result.subtitle_body ??
    result.subtitleBody ??
    result.subtitleBODY ??
    result.output ??
    result.output_text ??
    result.outputText ??
    result.outputTEXT ??
    result.plain_text ??
    result.plainText ??
    result.plainTEXT ??
    result.text ??
    result.message ??
    result.body ??
    result.caption_body ??
    result.captionBody ??
    result.captionBODY ??
    result.caption_text ??
    result.captionText ??
    result.captionTEXT ??
    result.transcript ??
    result.transcript_text ??
    result.transcriptText ??
    result.transcriptTEXT ??
    result.display_caption ??
    result.displayCaption ??
    result.display_text ??
    result.displayText ??
    result.displayTEXT;
  if (!caption) {
    return renderVtt(job, timing);
  }
  return renderVtt(
    {
      ...job,
      line_break_plan: splitSubtitleCaptionLines(caption),
    },
    timing
  );
}

function splitSubtitleCaptionLines(value) {
  return requiredEnginePublicText(value, "Local subtitle engine response caption", {
    maxLength: 1800,
  })
    .split(/\r?\n/u)
    .map((line) => safeText(line, 220))
    .filter(Boolean)
    .slice(0, 8);
}

function firstSubtitleTextDataUrl(...sources) {
  const fields = [
    ["vtt_data_url", "vtt"],
    ["vttDataUrl", "vtt"],
    ["vttDataURL", "vtt"],
    ["webvtt_data_url", "vtt"],
    ["webvttDataUrl", "vtt"],
    ["webvttDataURL", "vtt"],
    ["subtitle_vtt_data_url", "vtt"],
    ["subtitleVttDataUrl", "vtt"],
    ["subtitleVTTDataURL", "vtt"],
    ["caption_vtt_data_url", "vtt"],
    ["captionVttDataUrl", "vtt"],
    ["captionVTTDataURL", "vtt"],
    ["transcript_vtt_data_url", "vtt"],
    ["transcriptVttDataUrl", "vtt"],
    ["transcriptVTTDataURL", "vtt"],
    ["srt_data_url", "srt"],
    ["srtDataUrl", "srt"],
    ["srtDataURL", "srt"],
    ["subtitle_srt_data_url", "srt"],
    ["subtitleSrtDataUrl", "srt"],
    ["subtitleSRTDataURL", "srt"],
    ["caption_srt_data_url", "srt"],
    ["captionSrtDataUrl", "srt"],
    ["captionSRTDataURL", "srt"],
    ["transcript_srt_data_url", "srt"],
    ["transcriptSrtDataUrl", "srt"],
    ["transcriptSRTDataURL", "srt"],
    ["subtitle_data_url", "text"],
    ["subtitleDataUrl", "text"],
    ["subtitleDataURL", "text"],
    ["caption_data_url", "text"],
    ["captionDataUrl", "text"],
    ["captionDataURL", "text"],
    ["transcript_data_url", "text"],
    ["transcriptDataUrl", "text"],
    ["transcriptDataURL", "text"],
    ["text_data_url", "text"],
    ["textDataUrl", "text"],
    ["textDataURL", "text"],
  ];
  for (const source of sources) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    for (const [field, kind] of fields) {
      const value = source[field];
      if (typeof value === "string" && value.trim().startsWith("data:")) {
        return { value, kind };
      }
    }
  }
  return null;
}

function collectSubtitlePayloadSources(...sources) {
  const collected = [];
  for (const source of sources) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    collected.push(source);
    for (const field of [
      "subtitle",
      "subtitle_data",
      "subtitleData",
      "subtitles",
      "caption",
      "caption_data",
      "captionData",
      "captions",
      "transcript",
      "transcript_data",
      "transcriptData",
      "transcripts",
      "text",
      "output_text",
      "outputText",
    ]) {
      const value = source[field];
      if (value && typeof value === "object" && !Array.isArray(value)) collected.push(value);
      if (Array.isArray(value)) {
        collected.push(
          ...value.filter((item) => item && typeof item === "object" && !Array.isArray(item))
        );
      }
    }
  }
  return collected;
}

function firstSubtitleTextValue(sources, fields) {
  for (const source of sources) {
    for (const field of fields) {
      const value = source?.[field];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return "";
}

function firstSubtitleTextBase64(...sources) {
  const fields = [
    ["vtt_base64", "vtt"],
    ["vttBase64", "vtt"],
    ["webvtt_base64", "vtt"],
    ["webvttBase64", "vtt"],
    ["subtitle_vtt_base64", "vtt"],
    ["subtitleVttBase64", "vtt"],
    ["caption_vtt_base64", "vtt"],
    ["captionVttBase64", "vtt"],
    ["transcript_vtt_base64", "vtt"],
    ["transcriptVttBase64", "vtt"],
    ["srt_base64", "srt"],
    ["srtBase64", "srt"],
    ["subtitle_srt_base64", "srt"],
    ["subtitleSrtBase64", "srt"],
    ["caption_srt_base64", "srt"],
    ["captionSrtBase64", "srt"],
    ["transcript_srt_base64", "srt"],
    ["transcriptSrtBase64", "srt"],
    ["subtitle_base64", "text"],
    ["subtitleBase64", "text"],
    ["caption_base64", "text"],
    ["captionBase64", "text"],
    ["transcript_base64", "text"],
    ["transcriptBase64", "text"],
    ["text_base64", "text"],
    ["textBase64", "text"],
  ];
  for (const source of sources) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    for (const [field, kind] of fields) {
      const value = source[field];
      if (typeof value === "string" && value.trim()) return { value, kind };
    }
  }
  return null;
}

function normalizeSubtitleCaptionLines(value) {
  return value
    .map((line) =>
      typeof line === "string"
        ? line
        : line?.text ??
          line?.caption ??
          line?.caption_text ??
          line?.captionText ??
          line?.subtitle ??
          line?.subtitle_text ??
          line?.subtitleText ??
          line?.body ??
          line?.content ??
          line?.value ??
          line?.plain_text ??
          line?.plainText ??
          line?.display_caption ??
          line?.displayCaption ??
          line?.display_text ??
          line?.displayText ??
          line?.line ??
          line?.utterance ??
          line?.phrase ??
          line?.word ??
          ""
    )
    .flatMap((line) => splitSubtitleCaptionLines(line))
    .slice(0, 8);
}

function renderSubtitleCueSegmentsVtt(value, fallbackTiming) {
  const cues = value
    .map((segment, index) => normalizeSubtitleCueSegment(segment, index, fallbackTiming))
    .filter(Boolean)
    .slice(0, 20);
  if (cues.length === 0) {
    return requiredEnginePublicText("", "Local subtitle engine response", {
      maxLength: 20_000,
    });
  }
  return `WEBVTT\n\n${cues
    .map((cue) => `${formatVttTime(cue.startMs)} --> ${formatVttTime(cue.endMs)}\n${cue.text}`)
    .join("\n\n")}\n`;
}

function normalizeSubtitleCueSegment(segment, index, fallbackTiming) {
  const text = requiredEnginePublicText(
    typeof segment === "string"
      ? segment
      : segment?.text ??
        segment?.caption ??
        segment?.caption_text ??
        segment?.captionText ??
        segment?.subtitle ??
        segment?.subtitle_text ??
        segment?.subtitleText ??
        segment?.body ??
        segment?.content ??
        segment?.value ??
        segment?.plain_text ??
        segment?.plainText ??
        segment?.display_caption ??
        segment?.displayCaption ??
        segment?.display_text ??
        segment?.displayText ??
        segment?.line ??
        segment?.utterance ??
        segment?.phrase ??
        segment?.word ??
        "",
    "Local subtitle engine response cue",
    { maxLength: 400 }
  );
  const fallbackStartMs = fallbackTiming.display_start_ms + index * 1000;
  const startMs = resolveSubtitleCueMs(segment, [
    "start_ms",
    "startMs",
    "start_time_ms",
    "startTimeMs",
    "offset_ms",
    "offsetMs",
    "from_ms",
    "fromMs",
    "begin_ms",
    "beginMs",
    "begin_time_ms",
    "beginTimeMs",
    "time_ms",
    "timeMs",
    "timestamp_ms",
    "timestampMs",
  ], [
    "start",
    "start_time",
    "startTime",
    "start_seconds",
    "startSeconds",
    "from",
    "offset",
    "begin",
    "begin_time",
    "beginTime",
    "time",
    "timestamp",
  ]) ?? fallbackStartMs;
  const endMs = resolveSubtitleCueMs(segment, [
    "end_ms",
    "endMs",
    "end_time_ms",
    "endTimeMs",
    "to_ms",
    "toMs",
    "until_ms",
    "untilMs",
    "finish_ms",
    "finishMs",
    "finish_time_ms",
    "finishTimeMs",
    "stop_ms",
    "stopMs",
    "stop_time_ms",
    "stopTimeMs",
  ], [
    "end",
    "end_time",
    "endTime",
    "end_seconds",
    "endSeconds",
    "to",
    "until",
    "finish",
    "finish_time",
    "finishTime",
    "stop",
    "stop_time",
    "stopTime",
  ]);
  const durationMs = resolveSubtitleCueDurationMs(segment);
  const safeEndMs = endMs ??
    (durationMs !== null ? startMs + durationMs : Math.min(fallbackTiming.display_end_ms, startMs + 1000));
  if (safeEndMs <= startMs) return null;
  return { startMs, endMs: safeEndMs, text };
}

function resolveSubtitleCueMs(segment, millisecondKeys, secondKeys) {
  if (!segment || typeof segment !== "object") return null;
  for (const key of millisecondKeys) {
    const value = safeOptionalNumber(segment[key]);
    if (value !== null) return value;
    const parsedTimestamp = parseSubtitleCueTimestampMs(segment[key]);
    if (parsedTimestamp !== null) return parsedTimestamp;
  }
  for (const key of secondKeys) {
    const value = safeOptionalNumber(segment[key]);
    if (value !== null) return Math.trunc(value * 1000);
    const parsedTimestamp = parseSubtitleCueTimestampMs(segment[key]);
    if (parsedTimestamp !== null) return parsedTimestamp;
  }
  return null;
}

function parseSubtitleCueTimestampMs(value) {
  const match = String(value ?? "").trim().match(/^(?:(\d{2,}):)?(\d{2}):(\d{2})[.,](\d{3})$/);
  if (!match) return null;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = Number(match[4]);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

function resolveSubtitleCueDurationMs(segment) {
  if (!segment || typeof segment !== "object") return null;
  const millisecondValue = safeOptionalNumber(
    segment.duration_ms ??
      segment.durationMs ??
      segment.duration_time_ms ??
      segment.durationTimeMs ??
      segment.display_duration_ms ??
      segment.displayDurationMs ??
      segment.length_ms ??
      segment.lengthMs
  );
  if (millisecondValue !== null) return millisecondValue;
  const parsedMillisecondDuration = parseSubtitleCueTimestampMs(
    segment.duration_ms ??
      segment.durationMs ??
      segment.duration_time_ms ??
      segment.durationTimeMs ??
      segment.display_duration_ms ??
      segment.displayDurationMs ??
      segment.length_ms ??
      segment.lengthMs
  );
  if (parsedMillisecondDuration !== null) return parsedMillisecondDuration;
  const secondValue = safeOptionalNumber(
    segment.duration ??
      segment.duration_seconds ??
      segment.durationSeconds ??
      segment.display_duration_seconds ??
      segment.displayDurationSeconds ??
      segment.length ??
      segment.length_seconds ??
      segment.lengthSeconds
  );
  if (secondValue !== null) return Math.trunc(secondValue * 1000);
  return parseSubtitleCueTimestampMs(
    segment.duration ??
      segment.duration_seconds ??
      segment.durationSeconds ??
      segment.display_duration_seconds ??
      segment.displayDurationSeconds ??
      segment.length ??
      segment.length_seconds ??
      segment.lengthSeconds
  );
}

function convertSrtToVtt(value) {
  const body = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/gu, "$1.$2")
    .trim();
  return `WEBVTT\n\n${body}\n`;
}

function requiredSubtitleTiming(job) {
  const startMs = requiredSubtitleTimingMs(job.display_start_ms ?? job.displayStartMs, "display_start_ms");
  const explicitEndMs = requiredSubtitleTimingMs(job.display_end_ms ?? job.displayEndMs, "display_end_ms");
  const durationMs =
    resolveEngineDurationMs(
      job.duration_ms ?? job.durationMs,
      job.duration_seconds ?? job.durationSeconds ?? job.duration
    ) ?? null;
  const endMs = explicitEndMs > startMs || durationMs === null ? explicitEndMs : startMs + durationMs;
  if (endMs <= startMs) {
    return {
      display_start_ms: startMs,
      display_end_ms: startMs + 1000,
      duration_ms: 1000,
    };
  }
  return {
    display_start_ms: startMs,
    display_end_ms: endMs,
    duration_ms: endMs - startMs,
  };
}

function requiredSubtitleTimingMs(value, field) {
  const timestampMs = parseSubtitleCueTimestampMs(value);
  if (timestampMs !== null) return timestampMs;
  const numberMs = safeOptionalNumber(value);
  if (numberMs !== null && numberMs >= 0) return Math.trunc(numberMs);
  throw new ContractError(`local bridge generated report ${field} is required`);
}

function requiredEngineDurationMs(response, context) {
  const durationMs = resolveOptionalEngineDurationMs(response);
  if (durationMs === null || durationMs <= 0) {
    throw new ContractError(`${context}: duration_ms is required`);
  }
  return durationMs;
}

function resolveOptionalEngineDurationMs(response) {
  const data = responseDataObject(response);
  const responseAudio = responsePayloadObject(response?.audio ?? response?.audio_url ?? response?.audioUrl ?? response?.audioURL ?? response?.speech ?? response?.speech_url ?? response?.speechUrl ?? response?.speechURL ?? response?.voice_audio ?? response?.voiceAudio ?? response?.voice_audio_url ?? response?.voiceAudioUrl ?? response?.voiceAudioURL ?? response?.artifact ?? response?.artifact_url ?? response?.artifactUrl ?? response?.artifactURL);
  const dataAudio = responsePayloadObject(data.audio ?? data.audio_url ?? data.audioUrl ?? data.audioURL ?? data.speech ?? data.speech_url ?? data.speechUrl ?? data.speechURL ?? data.voice_audio ?? data.voiceAudio ?? data.voice_audio_url ?? data.voiceAudioUrl ?? data.voiceAudioURL ?? data.artifact ?? data.artifact_url ?? data.artifactUrl ?? data.artifactURL);
  const output = responseOutputObject(response);
  const outputAudio = responsePayloadObject(output.audio ?? output.audio_url ?? output.audioUrl ?? output.audioURL ?? output.speech ?? output.speech_url ?? output.speechUrl ?? output.speechURL ?? output.voice_audio ?? output.voiceAudio ?? output.voice_audio_url ?? output.voiceAudioUrl ?? output.voiceAudioURL ?? output.artifact ?? output.artifact_url ?? output.artifactUrl ?? output.artifactURL);
  const result = responseDataObject(response?.result);
  const resultAudio = responsePayloadObject(result.audio ?? result.audio_url ?? result.audioUrl ?? result.audioURL ?? result.speech ?? result.speech_url ?? result.speechUrl ?? result.speechURL ?? result.voice_audio ?? result.voiceAudio ?? result.voice_audio_url ?? result.voiceAudioUrl ?? result.voiceAudioURL ?? result.artifact ?? result.artifact_url ?? result.artifactUrl ?? result.artifactURL);
  return resolveEngineDurationMs(
    response?.duration_ms ??
      response?.durationMs ??
      response?.length_ms ??
      response?.lengthMs ??
      response?.audio_duration_ms ??
      response?.audioDurationMs ??
      response?.audio?.duration_ms ??
      response?.audio?.durationMs ??
      response?.audio?.length_ms ??
      response?.audio?.lengthMs ??
      responseAudio?.duration_ms ??
      responseAudio?.durationMs ??
      responseAudio?.length_ms ??
      responseAudio?.lengthMs ??
      response?.motion_duration_ms ??
      response?.motionDurationMs ??
      response?.display_duration_ms ??
      response?.displayDurationMs ??
      data?.duration_ms ??
      data?.durationMs ??
      data?.length_ms ??
      data?.lengthMs ??
      data?.audio_duration_ms ??
      data?.audioDurationMs ??
      dataAudio?.duration_ms ??
      dataAudio?.durationMs ??
      dataAudio?.length_ms ??
      dataAudio?.lengthMs ??
      data?.motion_duration_ms ??
      data?.motionDurationMs ??
      data?.display_duration_ms ??
      data?.displayDurationMs ??
      output?.duration_ms ??
      output?.durationMs ??
      output?.length_ms ??
      output?.lengthMs ??
      output?.audio_duration_ms ??
      output?.audioDurationMs ??
      outputAudio?.duration_ms ??
      outputAudio?.durationMs ??
      outputAudio?.length_ms ??
      outputAudio?.lengthMs ??
      output?.motion_duration_ms ??
      output?.motionDurationMs ??
      output?.display_duration_ms ??
      output?.displayDurationMs ??
      result?.duration_ms ??
      result?.durationMs ??
      result?.length_ms ??
      result?.lengthMs ??
      result?.audio_duration_ms ??
      result?.audioDurationMs ??
      resultAudio?.duration_ms ??
      resultAudio?.durationMs ??
      resultAudio?.length_ms ??
      resultAudio?.lengthMs ??
      result?.motion_duration_ms ??
      result?.motionDurationMs ??
      result?.display_duration_ms ??
      result?.displayDurationMs,
    response?.duration_seconds ??
      response?.durationSeconds ??
      response?.duration_s ??
      response?.durationS ??
      response?.length_seconds ??
      response?.lengthSeconds ??
      response?.length_s ??
      response?.lengthS ??
      response?.audio_duration_seconds ??
      response?.audioDurationSeconds ??
      response?.audio?.duration_seconds ??
      response?.audio?.durationSeconds ??
      response?.audio?.duration_s ??
      response?.audio?.durationS ??
      response?.audio?.length_seconds ??
      response?.audio?.lengthSeconds ??
      response?.audio?.length_s ??
      response?.audio?.lengthS ??
      responseAudio?.duration_seconds ??
      responseAudio?.durationSeconds ??
      responseAudio?.duration_s ??
      responseAudio?.durationS ??
      responseAudio?.length_seconds ??
      responseAudio?.lengthSeconds ??
      responseAudio?.length_s ??
      responseAudio?.lengthS ??
      response?.motion_duration_seconds ??
      response?.motionDurationSeconds ??
      response?.display_duration_seconds ??
      response?.displayDurationSeconds ??
      data?.duration_seconds ??
      data?.durationSeconds ??
      data?.duration_s ??
      data?.durationS ??
      data?.length_seconds ??
      data?.lengthSeconds ??
      data?.length_s ??
      data?.lengthS ??
      data?.audio_duration_seconds ??
      data?.audioDurationSeconds ??
      dataAudio?.duration_seconds ??
      dataAudio?.durationSeconds ??
      dataAudio?.duration_s ??
      dataAudio?.durationS ??
      dataAudio?.length_seconds ??
      dataAudio?.lengthSeconds ??
      dataAudio?.length_s ??
      dataAudio?.lengthS ??
      data?.motion_duration_seconds ??
      data?.motionDurationSeconds ??
      data?.display_duration_seconds ??
      data?.displayDurationSeconds ??
      output?.duration_seconds ??
      output?.durationSeconds ??
      output?.duration_s ??
      output?.durationS ??
      output?.length_seconds ??
      output?.lengthSeconds ??
      output?.length_s ??
      output?.lengthS ??
      output?.audio_duration_seconds ??
      output?.audioDurationSeconds ??
      outputAudio?.duration_seconds ??
      outputAudio?.durationSeconds ??
      outputAudio?.duration_s ??
      outputAudio?.durationS ??
      outputAudio?.length_seconds ??
      outputAudio?.lengthSeconds ??
      outputAudio?.length_s ??
      outputAudio?.lengthS ??
      output?.motion_duration_seconds ??
      output?.motionDurationSeconds ??
      output?.display_duration_seconds ??
      output?.displayDurationSeconds ??
      result?.duration_seconds ??
      result?.durationSeconds ??
      result?.duration_s ??
      result?.durationS ??
      result?.length_seconds ??
      result?.lengthSeconds ??
      result?.length_s ??
      result?.lengthS ??
      result?.audio_duration_seconds ??
      result?.audioDurationSeconds ??
      resultAudio?.duration_seconds ??
      resultAudio?.durationSeconds ??
      resultAudio?.duration_s ??
      resultAudio?.durationS ??
      resultAudio?.length_seconds ??
      resultAudio?.lengthSeconds ??
      resultAudio?.length_s ??
      resultAudio?.lengthS ??
      result?.motion_duration_seconds ??
      result?.motionDurationSeconds ??
      result?.display_duration_seconds ??
      result?.displayDurationSeconds
  );
}

function resolveEngineDurationMs(msValue, secondsValue) {
  const ms = safeOptionalNumber(msValue);
  if (ms !== null) return ms;
  const parsedMs = parseEngineTimestampMs(msValue);
  if (parsedMs !== null) return parsedMs;
  const seconds = safeOptionalNumber(secondsValue);
  return seconds !== null ? Math.trunc(seconds * 1000) : null;
}

function parseEngineTimestampMs(value) {
  const match = String(value ?? "").trim().match(/^(?:(\d{2,}):)?(\d{2}):(\d{2})[.,](\d{3})$/);
  if (!match) return null;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = Number(match[4]);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

function inferWavDurationMs(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 44) return null;
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") {
    return null;
  }
  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;
  while (offset + 8 <= bytes.length) {
    const chunkId = bytes.toString("ascii", offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === "fmt " && chunkStart + 16 <= bytes.length) {
      byteRate = bytes.readUInt32LE(chunkStart + 8);
    }
    if (chunkId === "data") {
      dataSize = Math.min(chunkSize, Math.max(0, bytes.length - chunkStart));
      break;
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }
  if (!byteRate || !dataSize) return null;
  return Math.max(1, Math.trunc((dataSize / byteRate) * 1000));
}

function requiredEngineBridgeStatus(response, context) {
  const data = responseDataObject(response);
  const output = responseOutputObject(response);
  const responseResultStatus = isScalarEngineStatus(response?.result) ? response.result : null;
  const dataResultStatus = isScalarEngineStatus(data?.result) ? data.result : null;
  const source =
    response?.bridge_status ??
    response?.bridgeStatus ??
    response?.status ??
    response?.state ??
    responseResultStatus ??
    data?.bridge_status ??
    data?.bridgeStatus ??
    data?.status ??
    data?.state ??
    dataResultStatus ??
    output?.bridge_status ??
    output?.bridgeStatus ??
    output?.status ??
    output?.state ??
    (response?.ok === true || response?.success === true || response?.accepted === true
      ? "rendered"
      : data?.ok === true || data?.success === true || data?.accepted === true
        ? "rendered"
        : output?.ok === true || output?.success === true || output?.accepted === true
          ? "rendered"
      : "");
  if (source === undefined || source === null || source === "") {
    throw new ContractError(`${context}: bridge_status is required`);
  }
  const bridgeStatus = safeEnginePublicText(source, {
    maxLength: 80,
    fallback: "engine_status_omitted",
  });
  const normalizedStatus = bridgeStatus
    .toLowerCase()
    .replace(/[\s-]+/gu, "_");
  if (
    response?.ok === false ||
    response?.success === false ||
    response?.accepted === false ||
    data?.ok === false ||
    data?.success === false ||
    data?.accepted === false ||
    output?.ok === false ||
    output?.success === false ||
    output?.accepted === false ||
    ["failed", "rejected", "error", "target_failed", "target_unreachable"].includes(
      normalizedStatus
    )
  ) {
    throw new ContractError(`${context}: bridge_status reported failure`);
  }
  return bridgeStatus;
}

function isScalarEngineStatus(value) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function baseReceipt(job, { renderedAtMs, artifactKind, artifactPath, extra = {} }) {
  return {
    schema: "iris_local_bridge_engine_receipt_v1",
    adapter_kind: job.adapter_kind,
    job_id: job.job_id,
    job_id_present: safeText(job.job_id, 220) !== "",
    event_id: job.event_id,
    event_id_present: safeText(job.event_id, 160) !== "",
    rendered_at_ms: renderedAtMs,
    engine_status: "rendered",
    artifact_kind: artifactKind,
    artifact_path: artifactPath,
    ...extra,
    boundary_policy: {
      no_raw_job_payload: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      local_artifact_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function buildRetrySkippedReceipt(job, { attemptedAtMs, engineConfig, retryState }) {
  const mode = engineConfig[job.adapter_kind]?.mode ?? "local";
  return {
    schema: "iris_local_bridge_engine_receipt_v1",
    adapter_kind: job.adapter_kind,
    job_id: job.job_id,
    event_id: job.event_id,
    rendered_at_ms: attemptedAtMs,
    engine_status:
      retryState.retry_status === "blocked" ? "retry_blocked" : "retry_waiting",
    artifact_kind: "unavailable",
    artifact_path: "",
    engine_mode: mode,
    bridge_status: "retry_deferred",
    retry_status: retryState.retry_status,
    retry_attempt_count: retryState.retry_attempt_count,
    next_retry_at_ms: retryState.next_retry_at_ms,
    retryable: retryState.retry_status !== "blocked",
    boundary_policy: {
      no_raw_job_payload: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      local_artifact_only: true,
      retry_report_summary_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function buildExpiredJobReceipt(job, { attemptedAtMs, engineConfig, freshnessState }) {
  const mode = engineConfig[job.adapter_kind]?.mode ?? "local";
  return {
    schema: "iris_local_bridge_engine_receipt_v1",
    adapter_kind: job.adapter_kind,
    job_id: job.job_id,
    event_id: job.event_id,
    rendered_at_ms: attemptedAtMs,
    engine_status: "expired",
    artifact_kind: "unavailable",
    artifact_path: "",
    engine_mode: mode,
    bridge_status: "job_expired_before_engine",
    job_freshness_status: freshnessState.job_freshness_status,
    job_age_ms: freshnessState.job_age_ms,
    max_job_age_ms: freshnessState.max_job_age_ms,
    retryable: false,
    boundary_policy: {
      no_raw_job_payload: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      local_artifact_only: true,
      stale_job_rejected_before_engine: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function buildFailureReceipt(job, { attemptedAtMs, engineConfig, error, retryEntry }) {
  const mode = engineConfig[job.adapter_kind]?.mode ?? "local";
  return {
    schema: "iris_local_bridge_engine_receipt_v1",
    adapter_kind: job.adapter_kind,
    job_id: job.job_id,
    event_id: job.event_id,
    rendered_at_ms: attemptedAtMs,
    engine_status: "attention",
    artifact_kind: "unavailable",
    artifact_path: "",
    engine_mode: mode,
    bridge_status: "engine_request_failed",
    error_kind: classifyEngineFailure(error),
    retry_status: retryEntry?.retry_status ?? "waiting",
    retry_attempt_count: retryEntry?.retry_attempt_count ?? null,
    next_retry_at_ms: retryEntry?.next_retry_at_ms ?? null,
    retryable: retryEntry?.retryable !== false,
    boundary_policy: {
      no_raw_job_payload: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      local_artifact_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function buildProcessReport(receipts, engineConfig, { eventRenderManifests = [] } = {}) {
  const attemptedReceipts = receipts.filter(isEngineAttemptReceipt);
  const renderedReceipts = receipts.filter((receipt) => receipt.engine_status === "rendered");
  const failedReceipts = receipts.filter((receipt) => receipt.engine_status === "attention");
  const skippedReceipts = receipts.filter(isRetrySkippedReceipt);
  const expiredReceipts = receipts.filter(isExpiredJobReceipt);
  return {
    schema: "iris_local_bridge_engine_process_report_v1",
    attempted_count: attemptedReceipts.length,
    processed_count: renderedReceipts.length,
    failed_count: failedReceipts.length,
    skipped_count: skippedReceipts.length,
    expired_count: expiredReceipts.length,
    by_adapter: summarizeReceipts(receipts),
    engine_modes: summarizeEngineModes(engineConfig),
    engine_preferences_configured: summarizeEnginePreferencesConfigured(engineConfig),
    job_freshness_policy: engineConfig.jobFreshnessPolicy,
    receipts: receipts.map(summarizeReceipt),
    event_render_manifest_count: eventRenderManifests.length,
    event_render_manifests: eventRenderManifests.map(summarizeEventRenderManifest),
    boundary_policy: {
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      local_artifacts_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function buildDrainReport(reports, finalStatus, engineConfig) {
  const processedCount = sumRequiredReportCounts(reports, "processed_count");
  const attemptedCount = sumRequiredReportCounts(reports, "attempted_count");
  const failedCount = sumRequiredReportCounts(reports, "failed_count");
  const skippedCount = sumRequiredReportCounts(reports, "skipped_count");
  const expiredCount = sumRequiredReportCounts(reports, "expired_count");
  const eventRenderManifests = reports
    .flatMap((report) => report.event_render_manifests)
    .slice(-50);
  return {
    schema: "iris_local_bridge_engine_drain_report_v1",
    worker_readiness_status:
      finalStatus?.worker_readiness_status ??
      classifyLocalBridgeWorkerReadinessStatus({
        artifactDirConfigured: finalStatus?.artifact_dir_configured === true,
        eventRenderManifests: finalStatus?.event_render_manifests,
        engineConfig,
        outboxQueue: finalStatus?.outbox_queue,
      }),
    adapter_readiness_status:
      finalStatus?.adapter_readiness_status ??
      summarizeAdapterReadinessStatuses({
        artifactDirConfigured: finalStatus?.artifact_dir_configured === true,
        eventRenderManifests: finalStatus?.event_render_manifests,
        engineConfig,
        outboxQueue: finalStatus?.outbox_queue,
      }),
    pass_count: reports.length,
    attempted_count: attemptedCount,
    processed_count: processedCount,
    failed_count: failedCount,
    skipped_count: skippedCount,
    expired_count: expiredCount,
    reached_idle:
      failedCount === 0 &&
      finalStatus.outbox_queue.total_pending_count === 0 &&
      finalStatus.outbox_queue.total_invalid_json_line_count === 0,
    by_adapter: summarizeProcessReports(reports),
    engine_modes: summarizeEngineModes(engineConfig),
    engine_preferences_configured: summarizeEnginePreferencesConfigured(engineConfig),
    job_freshness_policy: engineConfig.jobFreshnessPolicy,
    event_render_manifest_count: sumRequiredReportCounts(
      reports,
      "event_render_manifest_count"
    ),
    event_render_manifests: eventRenderManifests,
    final_status: finalStatus,
    boundary_policy: {
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      counts_only_status: true,
      local_artifacts_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function classifyLocalBridgeWorkerReadinessStatus({
  artifactDirConfigured,
  eventRenderManifests,
  engineConfig,
  outboxQueue,
}) {
  if (artifactDirConfigured !== true) return "not_configured";
  if (
    requiredGeneratedReportCount(
      outboxQueue,
      "total_invalid_json_line_count"
    ) > 0 ||
    requiredGeneratedReportCount(outboxQueue, "total_expired_pending_count") >
      0 ||
    requiredGeneratedReportCount(eventRenderManifests, "invalid_json_line_count") >
      0
  ) {
    return "attention";
  }
  if (requiredGeneratedReportCount(outboxQueue, "total_retry_blocked_count") > 0) {
    return "operator_action_required";
  }
  if (hasMissingStrictHttpEndpoint(engineConfig)) return "operator_action_required";
  if (requiredGeneratedReportCount(outboxQueue, "total_retry_waiting_count") > 0) {
    return "retry_backoff";
  }
  if (
    requiredGeneratedReportCount(outboxQueue, "total_retry_ready_count") > 0 ||
    requiredGeneratedReportCount(outboxQueue, "total_pending_count") > 0
  ) {
    return "work_pending";
  }
  if (
    requiredGeneratedReportCount(eventRenderManifests, "complete_manifest_count") >
    0
  ) {
    return "active";
  }
  return "idle";
}

function summarizeAdapterReadinessStatuses({
  artifactDirConfigured,
  eventRenderManifests,
  engineConfig,
  outboxQueue,
}) {
  return Object.fromEntries(
    ENGINE_KINDS.map((kind) => [
      kind,
      classifyLocalBridgeAdapterReadinessStatus({
        adapterQueue: outboxQueue?.adapters?.[kind],
        artifactDirConfigured,
        eventRenderManifests,
        strictHttpEndpointMissing: isStrictHttpEndpointMissing(engineConfig, kind),
      }),
    ])
  );
}

function classifyLocalBridgeAdapterReadinessStatus({
  adapterQueue,
  artifactDirConfigured,
  eventRenderManifests,
  strictHttpEndpointMissing = false,
}) {
  if (artifactDirConfigured !== true) return "not_configured";
  if (
    requiredGeneratedReportCount(adapterQueue, "invalid_json_line_count") > 0 ||
    requiredGeneratedReportCount(adapterQueue, "expired_pending_count") > 0 ||
    requiredGeneratedReportCount(eventRenderManifests, "invalid_json_line_count") >
      0
  ) {
    return "attention";
  }
  if (requiredGeneratedReportCount(adapterQueue, "retry_blocked_count") > 0) {
    return "operator_action_required";
  }
  if (strictHttpEndpointMissing === true) return "operator_action_required";
  if (requiredGeneratedReportCount(adapterQueue, "retry_waiting_count") > 0) {
    return "retry_backoff";
  }
  if (
    requiredGeneratedReportCount(adapterQueue, "retry_ready_count") > 0 ||
    requiredGeneratedReportCount(adapterQueue, "pending_count") > 0
  ) {
    return "work_pending";
  }
  if (
    requiredGeneratedReportCount(adapterQueue, "processed_count") > 0 ||
    requiredGeneratedReportCount(eventRenderManifests, "complete_manifest_count") >
      0
  ) {
    return "active";
  }
  return "idle";
}

function hasMissingStrictHttpEndpoint(engineConfig) {
  return ENGINE_KINDS.some((kind) => isStrictHttpEndpointMissing(engineConfig, kind));
}

function isStrictHttpEndpointMissing(engineConfig, adapterKind) {
  return (
    isStrictHttpEngine(engineConfig, adapterKind) &&
    engineConfig?.[adapterKind]?.mode !== "http"
  );
}

function assertLocalBridgeWorkerReadinessStatusSafe(status, context) {
  if (
    ![
      "not_configured",
      "idle",
      "work_pending",
      "retry_backoff",
      "operator_action_required",
      "active",
      "attention",
    ].includes(status)
  ) {
    throw new ContractError(`${context}: invalid worker readiness status`, { status });
  }
}

function assertLocalBridgeAdapterReadinessStatusesSafe(statuses, context) {
  if (!statuses || typeof statuses !== "object" || Array.isArray(statuses)) {
    throw new ContractError(`${context}: missing adapter readiness status`);
  }
  for (const kind of ENGINE_KINDS) {
    assertLocalBridgeWorkerReadinessStatusSafe(statuses[kind], `${context}.${kind}`);
  }
}

function assertOutboxQueueStatusSafe(queue, context = "local bridge outbox queue status") {
  if (!queue || typeof queue !== "object" || Array.isArray(queue)) {
    throw new ContractError(`${context}: missing outbox queue status`);
  }
  assertNoForbiddenEnginePublicFields(queue, context);
  if (queue.schema !== "iris_local_bridge_engine_outbox_queue_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  assertBoundaryPolicyFlagsSafe(queue.boundary_policy, context, [
    "counts_only",
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ]);
  if (!queue.adapters || typeof queue.adapters !== "object" || Array.isArray(queue.adapters)) {
    throw new ContractError(`${context}: adapter queue summaries required`);
  }
  for (const kind of ENGINE_KINDS) {
    const summary = queue.adapters[kind];
    if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
      throw new ContractError(`${context}: missing adapter queue summary`);
    }
    if (summary.adapter_kind !== kind) {
      throw new ContractError(`${context}: adapter queue kind mismatch`);
    }
    for (const field of [
      "job_count",
      "processed_count",
      "expired_count",
      "pending_count",
      "expired_pending_count",
      "retry_ready_count",
      "retry_waiting_count",
      "retry_blocked_count",
      "invalid_json_line_count",
    ]) {
      assertSafeCount(summary[field], `${context}: invalid ${kind} ${field}`);
    }
  }
  for (const [totalField, adapterField] of [
    ["total_job_count", "job_count"],
    ["total_pending_count", "pending_count"],
    ["total_expired_count", "expired_count"],
    ["total_expired_pending_count", "expired_pending_count"],
    ["total_retry_ready_count", "retry_ready_count"],
    ["total_retry_waiting_count", "retry_waiting_count"],
    ["total_retry_blocked_count", "retry_blocked_count"],
    ["total_invalid_json_line_count", "invalid_json_line_count"],
  ]) {
    const expected = ENGINE_KINDS.reduce(
      (sum, kind) => sum + queue.adapters[kind][adapterField],
      0
    );
    if (queue[totalField] !== expected) {
      throw new ContractError(`${context}: ${totalField} mismatch`);
    }
  }
  if (queue.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

function assertLocalBridgeEngineReceiptSummarySafe(
  receipt,
  context = "local bridge engine receipt summary"
) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    throw new ContractError(`${context}: missing receipt summary`);
  }
  assertNoForbiddenEnginePublicFields(receipt, context);
  if (receipt.schema !== "iris_local_bridge_engine_receipt_summary_v1") {
    throw new ContractError(`${context}: invalid receipt summary schema`);
  }
  if (!ENGINE_KINDS.includes(receipt.adapter_kind)) {
    throw new ContractError(`${context}: invalid receipt adapter kind`);
  }
  if (receipt.adapter_validation_required !== true) {
    throw new ContractError(`${context}: receipt adapter validation required`);
  }
}

function assertBoundaryPolicyFlagsSafe(
  policy,
  context,
  requiredFields,
  optionalFields = []
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set([...requiredFields, ...optionalFields]);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary flag ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary flag required ${field}`);
    }
  }
}

function assertEngineReportCountsSafe(
  report,
  context,
  { receiptsRequired = false } = {}
) {
  for (const field of [
    "attempted_count",
    "processed_count",
    "failed_count",
    "skipped_count",
    "expired_count",
    "event_render_manifest_count",
  ]) {
    assertSafeCount(report[field], `${context}: invalid ${field}`);
  }
  if (!report.by_adapter || typeof report.by_adapter !== "object" || Array.isArray(report.by_adapter)) {
    throw new ContractError(`${context}: by_adapter summary is required`);
  }
  for (const kind of ENGINE_KINDS) {
    const summary = report.by_adapter[kind];
    if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
      throw new ContractError(`${context}: missing adapter count summary`);
    }
    for (const field of [
      "attempted_count",
      "processed_count",
      "failed_count",
      "skipped_count",
      "expired_count",
    ]) {
      assertSafeCount(summary[field], `${context}: invalid ${kind} ${field}`);
    }
  }
  for (const [field, totalField = field] of [
    ["attempted_count"],
    ["processed_count"],
    ["failed_count"],
    ["skipped_count"],
    ["expired_count"],
  ]) {
    const total = ENGINE_KINDS.reduce(
      (sum, kind) => sum + report.by_adapter[kind][field],
      0
    );
    if (report[totalField] !== total) {
      throw new ContractError(`${context}: adapter count mismatch`);
    }
  }
  if (receiptsRequired) {
    const receipts = report.receipts;
    if (!Array.isArray(receipts)) {
      throw new ContractError(`${context}: receipts are required`);
    }
    const expectedReceiptCount =
      report.attempted_count +
      report.skipped_count +
      report.expired_count;
    if (receipts.length !== expectedReceiptCount) {
      throw new ContractError(`${context}: receipt summary count mismatch`);
    }
  }
}

function assertSafeCount(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function summarizeReceipt(receipt) {
  const artifactAvailable =
    receipt.artifact_path !== "" &&
    isExpectedEngineArtifactKind(receipt.adapter_kind, receipt.artifact_kind);
  return {
    schema: "iris_local_bridge_engine_receipt_summary_v1",
    adapter_kind: receipt.adapter_kind,
    job_id: receipt.job_id,
    job_id_present: safeText(receipt.job_id, 220) !== "",
    event_id: receipt.event_id,
    event_id_present: safeText(receipt.event_id, 160) !== "",
    engine_status: receipt.engine_status,
    artifact_kind: receipt.artifact_kind,
    artifact_available: artifactAvailable,
    engine_mode: receipt.engine_mode,
    error_kind: receipt.error_kind ?? null,
    job_freshness_status: receipt.job_freshness_status ?? null,
    job_age_ms: receipt.job_age_ms ?? null,
    max_job_age_ms: receipt.max_job_age_ms ?? null,
    retry_status: receipt.retry_status,
    retry_attempt_count: receipt.retry_attempt_count,
    next_retry_at_ms: receipt.next_retry_at_ms,
    rendered_at_ms: receipt.rendered_at_ms,
    adapter_validation_required: true,
  };
}

function isExpectedEngineArtifactKind(adapterKind, artifactKind) {
  if (adapterKind === "tts") {
    return (
      artifactKind === "audio_wav" ||
      artifactKind === "audio_mpeg" ||
      artifactKind === "audio_mp4" ||
      artifactKind === "audio_aac" ||
      artifactKind === "audio_flac" ||
      artifactKind === "audio_ogg" ||
      artifactKind === "audio_opus" ||
      artifactKind === "audio_webm"
    );
  }
  if (adapterKind === "live2d") {
    return artifactKind === "live2d_cue_json" || artifactKind === "live2d_engine_cue_json";
  }
  if (adapterKind === "subtitle") return artifactKind === "subtitle_vtt" || artifactKind === "subtitle_srt";
  return false;
}

function summarizeEventRenderManifest(manifest) {
  const manifestIdPresent = safeText(manifest.manifest_id, 220) !== "";
  const eventIdPresent = safeText(manifest.event_id, 160) !== "";
  return {
    schema: "iris_local_bridge_event_render_manifest_summary_v1",
    manifest_id: safeEnginePublicText(manifest.manifest_id, {
      maxLength: 220,
      fallback: "redacted_manifest_id",
    }),
    manifest_id_present: manifestIdPresent,
    event_id: safeEnginePublicText(manifest.event_id, {
      maxLength: 160,
      fallback: "redacted_event_id",
    }),
    event_id_present: eventIdPresent,
    complete: manifest.complete === true,
    adapter_kinds: ENGINE_KINDS.filter((kind) =>
      isExpectedEngineArtifactKind(kind, manifest.artifact_set?.[kind]?.artifact_kind)
    ),
    artifact_kind_by_adapter: Object.fromEntries(
      ENGINE_KINDS.map((kind) => [
        kind,
        safeEnginePublicText(manifest.artifact_set?.[kind]?.artifact_kind, {
          maxLength: 80,
          fallback: "redacted_artifact_kind",
        }),
      ])
    ),
    engine_mode_by_adapter: Object.fromEntries(
      ENGINE_KINDS.map((kind) => [
        kind,
        safeEnginePublicText(manifest.artifact_set?.[kind]?.engine_mode, {
          maxLength: 80,
          fallback: "redacted_engine_mode",
        }),
      ])
    ),
    boundary_policy: {
      summary_only: true,
      no_artifact_paths: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function summarizeEngineModes(engineConfig) {
  return {
    tts: summarizePublicEngineMode(engineConfig.tts.mode),
    live2d: summarizePublicEngineMode(engineConfig.live2d.mode),
    subtitle: summarizePublicEngineMode(engineConfig.subtitle.mode),
  };
}

function summarizePublicEngineMode(mode) {
  if (mode === "local_preview_wav" || mode === "local_live2d_cue_artifact") {
    return "local_placeholder";
  }
  return mode;
}

function summarizeEnginePreferencesConfigured(engineConfig) {
  return {
    tts: Object.keys(engineConfig.tts.preferences).length > 0,
    live2d: Object.keys(engineConfig.live2d.preferences).length > 0,
    subtitle: false,
  };
}

function compactEnginePreferences(preferences) {
  return Object.fromEntries(
    Object.entries(preferences)
      .map(([key, value]) => [key, safeText(value, 120)])
      .filter(([, value]) => value !== "")
  );
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== "")
  );
}

function optionalEnginePreferences(preferences = {}) {
  const compacted = compactEnginePreferences(preferences);
  return Object.keys(compacted).length > 0 ? { engine_preferences: compacted } : {};
}

function createTtsEngineRequest(job, preferences = {}) {
  const voiceExpression =
    job.voice_expression && typeof job.voice_expression === "object" && !Array.isArray(job.voice_expression)
      ? job.voice_expression
      : job.voiceExpression && typeof job.voiceExpression === "object" && !Array.isArray(job.voiceExpression)
        ? job.voiceExpression
        : {};
  const mouthTiming =
    job.mouth_timing ??
    job.mouthTiming ??
    job.visemes ??
    job.viseme_timing ??
    job.visemeTiming ??
    job.lip_sync ??
    job.lipSync ??
    job.speech_marks ??
    job.speechMarks;
  const voiceExpressionRequest = {
    ...voiceExpression,
    emotion: safeText(voiceExpression.emotion ?? job.emotion ?? job.voice_emotion ?? job.voiceEmotion, 120),
    pitch: safeOptionalNumber(voiceExpression.pitch ?? job.pitch ?? job.pitch_scale ?? job.pitchScale),
    volume: safeOptionalNumber(voiceExpression.volume ?? job.volume ?? job.volume_scale ?? job.volumeScale),
  };
  const voiceId = safeText(
    preferences.voice_id ??
      preferences.voiceId ??
      preferences.speaker_id ??
      preferences.speakerId ??
      preferences.voicevox_speaker_id ??
      preferences.voicevoxSpeakerId ??
      job.voice_id ??
      job.voiceId ??
      job.speaker_id ??
      job.speakerId ??
      job.voicevox_speaker_id ??
      job.voicevoxSpeakerId,
    120
  );
  return {
    schema: "iris_local_tts_engine_request_v1",
    job_id: job.job_id,
    event_id: job.event_id,
    text:
      job.text ??
      job.speech_text ??
      job.speechText ??
      job.script_text ??
      job.scriptText ??
      job.utterance_text ??
      job.utteranceText ??
      job.line_text ??
      job.lineText,
    language: job.language,
    script_direction: job.script_direction,
    voice_id: voiceId,
    model: safeText(preferences.model, 120),
    locale: safeText(preferences.locale, 32),
    character_voice_profile_id: safeText(preferences.character_voice_profile_id, 120),
    character_voice_style_profile_id: safeText(preferences.character_voice_style_profile_id, 120),
    prosody_style: job.prosody_style ?? job.prosodyStyle,
    speech_rate: safeOptionalNumber(
      job.speech_rate ??
        job.speechRate ??
        job.speed_rate ??
        job.speedRate ??
        job.speaking_rate ??
        job.speakingRate
    ),
    estimated_duration_ms: resolveEngineDurationMs(
      job.estimated_duration_ms ??
        job.estimatedDurationMs ??
        job.duration_ms ??
        job.durationMs,
      job.estimated_duration_seconds ??
        job.estimatedDurationSeconds ??
        job.duration_seconds ??
        job.durationSeconds ??
        job.duration
    ),
    mouth_timing: Array.isArray(mouthTiming) ? mouthTiming : [],
    voice_expression: compactObject(voiceExpressionRequest),
    ...optionalEnginePreferences({ ...preferences, voice_id: voiceId }),
    boundary_policy: {
      validated_local_bridge_job: true,
      engine_internal_payload: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      engine_preferences_internal_only: true,
    },
    adapter_validation_required: true,
  };
}

function createLive2dEngineRequest(job, preferences = {}) {
  const timing = job.timing && typeof job.timing === "object" && !Array.isArray(job.timing)
    ? job.timing
    : {};
  const modelId = safeText(preferences.model_id ?? preferences.modelId ?? job.model_id ?? job.modelId, 120);
  const sceneId = safeText(preferences.scene_id ?? preferences.sceneId ?? job.scene_id ?? job.sceneId, 120);
  return {
    schema: "iris_local_live2d_engine_request_v1",
    job_id: job.job_id,
    event_id: job.event_id,
    model_id: modelId,
    scene_id: sceneId,
    motion_style: job.motion_style ?? job.motionStyle ?? job.motion_key ?? job.motionKey ?? job.gesture,
    motion_intensity: safeOptionalNumber(job.motion_intensity ?? job.motionIntensity ?? job.intensity),
    body_state_id: job.body_state_id ?? job.bodyStateId ?? job.body_state ?? job.bodyState,
    camera_proximity_profile:
      job.camera_proximity_profile ?? job.cameraProximityProfile ?? job.camera_profile ?? job.cameraProfile,
    expression_profile_id:
      job.expression_profile_id ??
      job.expressionProfileId ??
      job.expression_id ??
      job.expressionId ??
      job.facial_expression ??
      job.facialExpression ??
      job.emotion,
    autonomous_state_id: job.autonomous_state_id ?? job.autonomousStateId ?? job.state_id ?? job.stateId,
    timing: {
      total_duration_ms: resolveEngineDurationMs(
        timing.total_duration_ms ?? timing.totalDurationMs ?? timing.duration_ms ?? timing.durationMs,
        timing.total_duration_seconds ?? timing.totalDurationSeconds ?? timing.duration_seconds ?? timing.durationSeconds ?? timing.duration
      ),
      hold_ms: resolveEngineDurationMs(timing.hold_ms ?? timing.holdMs, timing.hold_seconds ?? timing.holdSeconds),
      transition_ms: resolveEngineDurationMs(
        timing.transition_ms ?? timing.transitionMs,
        timing.transition_seconds ?? timing.transitionSeconds
      ),
    },
    tracks: job.tracks,
    ...optionalEnginePreferences({ ...preferences, model_id: modelId, scene_id: sceneId }),
    boundary_policy: {
      validated_local_bridge_job: true,
      engine_internal_payload: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      engine_preferences_internal_only: true,
    },
    adapter_validation_required: true,
  };
}

function createSubtitleEngineRequest(job) {
  const displayStartMs =
    resolveEngineDurationMs(
      job.display_start_ms ?? job.displayStartMs ?? job.start_ms ?? job.startMs,
      job.display_start_seconds ?? job.displayStartSeconds ?? job.start_seconds ?? job.startSeconds
    ) ?? 0;
  const displayEndMs =
    resolveEngineDurationMs(
      job.display_end_ms ?? job.displayEndMs ?? job.end_ms ?? job.endMs,
      job.display_end_seconds ?? job.displayEndSeconds ?? job.end_seconds ?? job.endSeconds
    ) ?? 0;
  const durationMs = resolveEngineDurationMs(
    job.duration_ms ?? job.durationMs ?? job.display_duration_ms ?? job.displayDurationMs,
    job.duration_seconds ?? job.durationSeconds ?? job.duration ?? job.display_duration_seconds ?? job.displayDurationSeconds
  ) ?? Math.max(1, displayEndMs - displayStartMs);
  const lineBreakPlan =
    job.line_break_plan ??
    job.lineBreakPlan ??
    job.caption_lines ??
    job.captionLines ??
    job.subtitle_lines ??
    job.subtitleLines ??
    job.display_lines ??
    job.displayLines;
  return {
    schema: "iris_local_subtitle_engine_request_v1",
    job_id: job.job_id,
    event_id: job.event_id,
    subtitle_text:
      job.subtitle_text ??
      job.subtitleText ??
      job.caption_text ??
      job.captionText ??
      job.display_caption ??
      job.displayCaption ??
      job.display_text ??
      job.displayText ??
      job.line_text ??
      job.lineText,
    subtitle_language: job.subtitle_language ?? job.subtitleLanguage ?? job.language ?? job.locale,
    script_direction: job.script_direction ?? job.scriptDirection ?? job.direction ?? job.text_direction ?? job.textDirection,
    display_start_ms: Number.isFinite(displayStartMs) ? displayStartMs : null,
    display_end_ms: Number.isFinite(displayEndMs) ? displayEndMs : null,
    duration_ms: Number.isFinite(durationMs) ? durationMs : null,
    line_break_plan: Array.isArray(lineBreakPlan) ? lineBreakPlan : [],
    safe_area_policy: job.safe_area_policy ?? job.safeAreaPolicy ?? {},
    reading_speed_guard: job.reading_speed_guard ?? job.readingSpeedGuard ?? {},
    boundary_policy: {
      validated_local_bridge_job: true,
      engine_internal_payload: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

async function postEngineRequest({
  endpoint,
  apiKey,
  timeoutMs,
  fetchImpl,
  request,
  context,
}) {
  if (!endpoint) throw new ContractError(`${context}: missing local engine target`);
  const endpointScope = summarizeLocalEndpointScope(endpoint);
  if (endpointScope.local_endpoint_allowed !== true) {
    throw new ContractError(`${context}: blocked by local endpoint policy`);
  }
  if (typeof fetchImpl !== "function") {
    throw new ContractError(`${context}: fetch implementation is required`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response?.ok) {
      throw new ContractError(`${context}: request failed`, { status: response?.status ?? 0 });
    }
    const contentType = safeText(response.headers?.get?.("content-type"), 120);
    if (contentType.toLowerCase().startsWith("audio/") || isTtsBinaryAudioResponse({ contentType, context })) {
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 30_000_000) {
        throw new ContractError(`${context}: audio response is too large`);
      }
      const audioMime = contentType.toLowerCase().startsWith("audio/")
        ? contentType
        : inferAudioMimeFromBytes(bytes);
      if (!audioMime) {
        throw new ContractError(`${context}: binary response does not match a supported audio format`);
      }
      return {
        bridge_status: safeText(response.statusText, 80) || "rendered",
        audio_bytes: { type: "Buffer", data: [...bytes] },
        audio_mime: audioMime,
        duration_ms:
          resolveEngineDurationMs(
            response.headers?.get?.("x-iris-duration-ms") ??
              response.headers?.get?.("x-audio-duration-ms") ??
              request.estimated_duration_ms ??
              request.duration_ms,
            response.headers?.get?.("x-iris-duration-seconds") ??
              response.headers?.get?.("x-audio-duration-seconds") ??
              request.estimated_duration_seconds ??
              request.duration_seconds ??
              request.duration
          ) ?? 1000,
        sample_rate_hz:
          safeOptionalNumber(response.headers?.get?.("x-audio-sample-rate-hz")) ??
          safeOptionalNumber(response.headers?.get?.("x-sample-rate-hz")),
      };
    }
    if (
      context.toLowerCase().includes("subtitle") &&
      (contentType.toLowerCase().includes("text/vtt") ||
        contentType.toLowerCase().includes("text/plain") ||
        contentType.toLowerCase().includes("text/srt") ||
        contentType.toLowerCase().includes("application/srt") ||
        contentType.toLowerCase().includes("application/x-subrip"))
    ) {
      const body = await response.text();
      const resolvedContentType = contentType.toLowerCase().includes("text/plain")
        ? inferSubtitleContentTypeFromText(body)
        : contentType.toLowerCase();
      return {
        bridge_status: safeText(response.statusText, 80) || "rendered",
        ...(resolvedContentType.includes("text/srt") ||
        resolvedContentType.includes("application/srt") ||
        resolvedContentType.includes("application/x-subrip")
          ? { srt: body }
          : { vtt: body }),
        duration_ms:
          safeOptionalNumber(
            response.headers?.get?.("x-iris-duration-ms") ??
              response.headers?.get?.("x-subtitle-duration-ms") ??
              request.duration_ms
          ) ?? 1000,
      };
    }
    const responseText = await response.text();
    const payload = parseEngineJsonResponse(responseText, `${context} response`);
    const lowerContext = context.toLowerCase();
    const resolvedPayload = lowerContext.includes("tts")
        ? await resolveLocalTtsAudioUrlPayload({
            payload,
            baseEndpoint: endpoint,
            apiKey,
            fetchImpl,
            signal: controller.signal,
            context,
          })
      : lowerContext.includes("live2d")
        ? await resolveLocalLive2dCueUrlPayload({
            payload: normalizeLive2dCueArrayPayload(payload),
            baseEndpoint: endpoint,
            apiKey,
            fetchImpl,
            signal: controller.signal,
            context,
          })
      : lowerContext.includes("subtitle")
        ? await resolveLocalSubtitleUrlPayload({
            payload: normalizeSubtitleCueArrayPayload(payload),
            baseEndpoint: endpoint,
            apiKey,
            fetchImpl,
            signal: controller.signal,
            context,
            fallbackDurationMs: request.duration_ms,
          })
      : payload;
    assertLocalEngineResponseSafe(resolvedPayload, `${context} response`);
    return resolvedPayload;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveLocalLive2dCueUrlPayload({
  payload,
  baseEndpoint,
  apiKey,
  fetchImpl,
  signal,
  context,
}) {
  const cueUrl = resolveEngineReturnedLocalUrl(extractLive2dCueUrl(payload), baseEndpoint);
  if (!cueUrl) return payload;
  const endpointScope = summarizeLocalEndpointScope(cueUrl);
  if (endpointScope.local_endpoint_allowed !== true) {
    throw new ContractError(`${context}: blocked cue_url by local endpoint policy`);
  }
  const response = await fetchImpl(cueUrl, {
    method: "GET",
    headers: {
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    cache: "no-store",
    signal,
  });
  if (!response?.ok) {
    throw new ContractError(`${context}: cue_url request failed`, {
      status: response?.status ?? 0,
    });
  }
  const contentType = resolveJsonUrlContentType(response.headers?.get?.("content-type"), cueUrl);
  const cueText = await response.text();
  if (!isJsonContentType(contentType) && !looksLikeJsonText(cueText)) {
    throw new ContractError(`${context}: cue_url response must be application/json`);
  }
  const cue = normalizeLive2dCueArrayPayload(
    parseEngineJsonResponse(cueText, `${context} cue_url response`)
  );
  assertLocalEngineResponseSafe(cue, `${context} cue_url response`);
  return {
    ...stripEngineUrlFields(payload),
    cue,
    duration_ms:
      resolveEngineDurationMs(
        response.headers?.get?.("x-iris-duration-ms") ??
          response.headers?.get?.("x-live2d-duration-ms") ??
          payload?.duration_ms ??
          payload?.durationMs,
        payload?.duration_seconds ??
          payload?.durationSeconds ??
          payload?.duration
      ) ?? null,
  };
}

async function resolveLocalSubtitleUrlPayload({
  payload,
  baseEndpoint,
  apiKey,
  fetchImpl,
  signal,
  context,
  fallbackDurationMs,
}) {
  const subtitleUrl = resolveEngineReturnedLocalUrl(extractSubtitleUrl(payload), baseEndpoint);
  if (!subtitleUrl) return payload;
  const endpointScope = summarizeLocalEndpointScope(subtitleUrl);
  if (endpointScope.local_endpoint_allowed !== true) {
    throw new ContractError(`${context}: blocked subtitle_url by local endpoint policy`);
  }
  const response = await fetchImpl(subtitleUrl, {
    method: "GET",
    headers: {
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    cache: "no-store",
    signal,
  });
  if (!response?.ok) {
    throw new ContractError(`${context}: subtitle_url request failed`, {
      status: response?.status ?? 0,
    });
  }
  const contentType = resolveSubtitleUrlContentType(
    response.headers?.get?.("content-type"),
    subtitleUrl
  );
  const body = await response.text();
  const resolvedContentType = contentType || inferSubtitleContentTypeFromText(body);
  if (
    !resolvedContentType.includes("text/vtt") &&
    !resolvedContentType.includes("text/plain") &&
    !resolvedContentType.includes("text/srt") &&
    !resolvedContentType.includes("application/srt") &&
    !resolvedContentType.includes("application/x-subrip") &&
    !resolvedContentType.includes("application/json") &&
    !looksLikeJsonText(body)
  ) {
    throw new ContractError(`${context}: subtitle_url response must be text/vtt, text/plain, text/srt, application/srt, application/x-subrip, or application/json`);
  }
  if (resolvedContentType.includes("application/json") || looksLikeJsonText(body)) {
    const parsed = normalizeSubtitleCueArrayPayload(
      parseEngineJsonResponse(body, `${context} subtitle_url response`)
    );
    assertLocalEngineResponseSafe(parsed, `${context} subtitle_url response`);
    return {
      ...stripEngineUrlFields(payload),
      ...parsed,
      duration_ms:
        resolveEngineDurationMs(
          response.headers?.get?.("x-iris-duration-ms") ??
            response.headers?.get?.("x-subtitle-duration-ms") ??
            payload?.duration_ms ??
            payload?.durationMs ??
            payload?.display_duration_ms ??
            payload?.displayDurationMs ??
            payload?.length_ms ??
            payload?.lengthMs ??
            fallbackDurationMs,
          payload?.duration_seconds ??
            payload?.durationSeconds ??
            payload?.duration_s ??
            payload?.durationS ??
            payload?.display_duration_seconds ??
            payload?.displayDurationSeconds ??
            payload?.length_seconds ??
            payload?.lengthSeconds ??
            payload?.length_s ??
            payload?.lengthS ??
            payload?.duration
        ) ?? 1000,
    };
  }
  return {
    ...stripEngineUrlFields(payload),
    ...(resolvedContentType.includes("application/x-subrip") ||
    resolvedContentType.includes("application/srt") ||
    resolvedContentType.includes("text/srt") ? { srt: body } : { vtt: body }),
    duration_ms:
      resolveEngineDurationMs(
        response.headers?.get?.("x-iris-duration-ms") ??
          response.headers?.get?.("x-subtitle-duration-ms") ??
          payload?.duration_ms ??
          payload?.durationMs ??
          payload?.display_duration_ms ??
          payload?.displayDurationMs ??
          payload?.length_ms ??
          payload?.lengthMs ??
          fallbackDurationMs,
        payload?.duration_seconds ??
          payload?.durationSeconds ??
          payload?.duration_s ??
          payload?.durationS ??
          payload?.display_duration_seconds ??
          payload?.displayDurationSeconds ??
          payload?.length_seconds ??
          payload?.lengthSeconds ??
          payload?.length_s ??
          payload?.lengthS ??
          payload?.duration
      ) ?? 1000,
  };
}

function resolveSubtitleUrlContentType(contentType, subtitleUrl) {
  const explicit = safeText(contentType, 120).toLowerCase();
  if (
    explicit.includes("text/vtt") ||
    explicit.includes("text/plain") ||
    explicit.includes("text/srt") ||
    explicit.includes("application/srt") ||
    explicit.includes("application/x-subrip") ||
    explicit.includes("application/json")
  ) return explicit;
  if (
    explicit &&
    !["application/octet-stream", "binary/octet-stream"].some((item) => explicit.includes(item))
  ) {
    return explicit;
  }
  return inferSubtitleMimeFromUrl(subtitleUrl);
}

function inferSubtitleMimeFromUrl(subtitleUrl) {
  let pathname = "";
  try {
    pathname = new URL(String(subtitleUrl)).pathname.toLowerCase();
  } catch {
    pathname = String(subtitleUrl ?? "").toLowerCase();
  }
  if (pathname.endsWith(".vtt") || pathname.endsWith(".webvtt")) return "text/vtt";
  if (pathname.endsWith(".srt")) return "application/x-subrip";
  if (pathname.endsWith(".json")) return "application/json";
  if (pathname.endsWith(".txt")) return "text/plain";
  return "";
}

function inferSubtitleContentTypeFromText(value) {
  const text = String(value ?? "").trimStart();
  if (text.startsWith("WEBVTT")) return "text/vtt";
  if (/^\d+\s*\r?\n\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[,.]\d{3}/u.test(text)) {
    return "application/x-subrip";
  }
  return "";
}

async function resolveLocalTtsAudioUrlPayload({
  payload,
  baseEndpoint,
  apiKey,
  fetchImpl,
  signal,
  context,
}) {
  const audioUrl = resolveEngineReturnedLocalUrl(extractTtsAudioUrl(payload), baseEndpoint);
  if (!audioUrl) return payload;
  const endpointScope = summarizeLocalEndpointScope(audioUrl);
  if (endpointScope.local_endpoint_allowed !== true) {
    throw new ContractError(`${context}: blocked audio_url by local endpoint policy`);
  }
  const response = await fetchImpl(audioUrl, {
    method: "GET",
    headers: {
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    cache: "no-store",
    signal,
  });
  if (!response?.ok) {
    throw new ContractError(`${context}: audio_url request failed`, {
      status: response?.status ?? 0,
    });
  }
  const contentType = resolveAudioUrlContentType(
    response.headers?.get?.("content-type"),
    audioUrl
  );
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 30_000_000) {
    throw new ContractError(`${context}: audio_url response is too large`);
  }
  const audioMime = contentType.toLowerCase().startsWith("audio/")
    ? contentType
    : inferAudioMimeFromBytes(bytes);
  if (!audioMime) {
    throw new ContractError(`${context}: audio_url response must be audio/*`);
  }
  return {
    ...stripEngineUrlFields(payload),
    audio_bytes: { type: "Buffer", data: [...bytes] },
    audio_mime: audioMime,
    duration_ms:
      resolveEngineDurationMs(
        response.headers?.get?.("x-iris-duration-ms") ??
          response.headers?.get?.("x-audio-duration-ms") ??
          payload?.duration_ms ??
          payload?.durationMs,
        payload?.duration_seconds ??
          payload?.durationSeconds ??
          payload?.duration
      ) ?? 1000,
    sample_rate_hz:
      safeOptionalNumber(response.headers?.get?.("x-audio-sample-rate-hz")) ??
      safeOptionalNumber(response.headers?.get?.("x-sample-rate-hz")) ??
      safeOptionalNumber(
        payload?.sample_rate_hz ??
          payload?.sampleRateHz ??
          payload?.sample_rate ??
          payload?.sampleRate ??
          payload?.audio_sample_rate_hz ??
          payload?.audioSampleRateHz
      ),
  };
}

function resolveEngineReturnedLocalUrl(value, baseEndpoint) {
  const text = safeText(value, 1000);
  if (!text) return "";
  try {
    const parsed = new URL(text, String(baseEndpoint || ""));
    return parsed.href;
  } catch {
    return text;
  }
}

function resolveAudioUrlContentType(contentType, audioUrl) {
  const explicit = safeText(contentType, 120);
  if (explicit.toLowerCase().startsWith("audio/")) return explicit;
  if (
    explicit &&
    !["application/octet-stream", "binary/octet-stream"].some((item) =>
      explicit.toLowerCase().includes(item)
    )
  ) {
    return explicit;
  }
  return inferAudioMimeFromUrl(audioUrl);
}

function isTtsBinaryAudioResponse({ contentType, context }) {
  const text = safeText(contentType, 120).toLowerCase();
  return (
    context.toLowerCase().includes("tts") &&
    ["application/octet-stream", "binary/octet-stream"].some((item) => text.includes(item))
  );
}

function inferAudioMimeFromBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 4) return "";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF") return "audio/wav";
  if (bytes.subarray(0, 3).toString("ascii") === "ID3") return "audio/mpeg";
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "audio/mpeg";
  if (bytes.subarray(0, 4).toString("ascii") === "OggS") return "audio/ogg";
  if (bytes.subarray(0, 4).toString("ascii") === "fLaC") return "audio/flac";
  return "";
}

function inferAudioMimeFromUrl(audioUrl) {
  let pathname = "";
  try {
    pathname = new URL(String(audioUrl)).pathname.toLowerCase();
  } catch {
    pathname = String(audioUrl ?? "").toLowerCase();
  }
  if (pathname.endsWith(".wav") || pathname.endsWith(".wave")) return "audio/wav";
  if (pathname.endsWith(".mp3")) return "audio/mpeg";
  if (pathname.endsWith(".m4a") || pathname.endsWith(".mp4")) return "audio/mp4";
  if (pathname.endsWith(".aac")) return "audio/aac";
  if (pathname.endsWith(".flac")) return "audio/flac";
  if (pathname.endsWith(".ogg")) return "audio/ogg";
  if (pathname.endsWith(".opus")) return "audio/opus";
  if (pathname.endsWith(".webm")) return "audio/webm";
  return "";
}

function isJsonContentType(value) {
  const text = safeText(value, 120).toLowerCase();
  return text.includes("application/json") || text.includes("+json") || text.includes("text/json");
}

function looksLikeJsonText(value) {
  const text = String(value ?? "").trim();
  return text.startsWith("{") || text.startsWith("[");
}

function resolveJsonUrlContentType(contentType, sourceUrl) {
  const explicit = safeText(contentType, 120).toLowerCase();
  if (isJsonContentType(explicit)) return explicit;
  if (
    explicit &&
    !["application/octet-stream", "binary/octet-stream"].some((item) => explicit.includes(item))
  ) {
    return explicit;
  }
  return inferJsonMimeFromUrl(sourceUrl);
}

function inferJsonMimeFromUrl(sourceUrl) {
  let pathname = "";
  try {
    pathname = new URL(String(sourceUrl)).pathname.toLowerCase();
  } catch {
    pathname = String(sourceUrl ?? "").toLowerCase();
  }
  return pathname.endsWith(".json") ? "application/json" : "";
}

function extractLive2dCueUrl(payload) {
  const data = responseDataObject(payload);
  const output = responseOutputObject(payload);
  const result = responseDataObject(payload?.result);
  const cueObject = firstLive2dCueUrlObject([payload, data, output, result]);
  const artifact = responsePayloadObject(payload?.artifact);
  const file = responsePayloadObject(payload?.file);
  const dataArtifact = responsePayloadObject(data?.artifact);
  const dataFile = responsePayloadObject(data?.file);
  const outputArtifact = responsePayloadObject(output?.artifact);
  const outputFile = responsePayloadObject(output?.file);
  const resultArtifact = responsePayloadObject(result?.artifact);
  const resultFile = responsePayloadObject(result?.file);
  return safeText(
    payload?.cue_url ??
      payload?.cueUrl ??
      payload?.cueURL ??
      payload?.live2d_cue_url ??
      payload?.live2dCueUrl ??
      payload?.live2dCueURL ??
      payload?.renderer_cue_url ??
      payload?.rendererCueUrl ??
      payload?.rendererCueURL ??
      payload?.animation_url ??
      payload?.animationUrl ??
      payload?.animationURL ??
      payload?.animation_cue_url ??
      payload?.animationCueUrl ??
      payload?.animationCueURL ??
      payload?.motion_url ??
      payload?.motionUrl ??
      payload?.motionURL ??
      payload?.expression_url ??
      payload?.expressionUrl ??
      payload?.expressionURL ??
      payload?.artifact_url ??
      payload?.artifactUrl ??
      payload?.artifactURL ??
      payload?.file_url ??
      payload?.fileUrl ??
      payload?.fileURL ??
      payload?.download_url ??
      payload?.downloadUrl ??
      payload?.downloadURL ??
      payload?.content_url ??
      payload?.contentUrl ??
      payload?.contentURL ??
      payload?.asset_url ??
      payload?.assetUrl ??
      payload?.assetURL ??
      data?.cue_url ??
      data?.cueUrl ??
      data?.cueURL ??
      data?.live2d_cue_url ??
      data?.live2dCueUrl ??
      data?.live2dCueURL ??
      data?.renderer_cue_url ??
      data?.rendererCueUrl ??
      data?.rendererCueURL ??
      data?.animation_url ??
      data?.animationUrl ??
      data?.animationURL ??
      data?.animation_cue_url ??
      data?.animationCueUrl ??
      data?.animationCueURL ??
      data?.motion_url ??
      data?.motionUrl ??
      data?.motionURL ??
      data?.expression_url ??
      data?.expressionUrl ??
      data?.expressionURL ??
      data?.artifact_url ??
      data?.artifactUrl ??
      data?.artifactURL ??
      data?.file_url ??
      data?.fileUrl ??
      data?.fileURL ??
      data?.download_url ??
      data?.downloadUrl ??
      data?.downloadURL ??
      data?.content_url ??
      data?.contentUrl ??
      data?.contentURL ??
      data?.asset_url ??
      data?.assetUrl ??
      data?.assetURL ??
      output?.cue_url ??
      output?.cueUrl ??
      output?.cueURL ??
      output?.live2d_cue_url ??
      output?.live2dCueUrl ??
      output?.live2dCueURL ??
      output?.renderer_cue_url ??
      output?.rendererCueUrl ??
      output?.rendererCueURL ??
      output?.animation_url ??
      output?.animationUrl ??
      output?.animationURL ??
      output?.animation_cue_url ??
      output?.animationCueUrl ??
      output?.animationCueURL ??
      output?.motion_url ??
      output?.motionUrl ??
      output?.motionURL ??
      output?.expression_url ??
      output?.expressionUrl ??
      output?.expressionURL ??
      output?.artifact_url ??
      output?.artifactUrl ??
      output?.artifactURL ??
      output?.file_url ??
      output?.fileUrl ??
      output?.fileURL ??
      output?.download_url ??
      output?.downloadUrl ??
      output?.downloadURL ??
      output?.content_url ??
      output?.contentUrl ??
      output?.contentURL ??
      output?.asset_url ??
      output?.assetUrl ??
      output?.assetURL ??
      result?.cue_url ??
      result?.cueUrl ??
      result?.cueURL ??
      result?.live2d_cue_url ??
      result?.live2dCueUrl ??
      result?.live2dCueURL ??
      result?.renderer_cue_url ??
      result?.rendererCueUrl ??
      result?.rendererCueURL ??
      result?.animation_url ??
      result?.animationUrl ??
      result?.animationURL ??
      result?.animation_cue_url ??
      result?.animationCueUrl ??
      result?.animationCueURL ??
      result?.motion_url ??
      result?.motionUrl ??
      result?.motionURL ??
      result?.expression_url ??
      result?.expressionUrl ??
      result?.expressionURL ??
      result?.artifact_url ??
      result?.artifactUrl ??
      result?.artifactURL ??
      result?.file_url ??
      result?.fileUrl ??
      result?.fileURL ??
      result?.download_url ??
      result?.downloadUrl ??
      result?.downloadURL ??
      result?.content_url ??
      result?.contentUrl ??
      result?.contentURL ??
      result?.asset_url ??
      result?.assetUrl ??
      result?.assetURL ??
      cueObject?.url ??
      cueObject?.cue_url ??
      cueObject?.cueUrl ??
      cueObject?.cueURL ??
      cueObject?.live2d_cue_url ??
      cueObject?.live2dCueUrl ??
      cueObject?.live2dCueURL ??
      cueObject?.renderer_cue_url ??
      cueObject?.rendererCueUrl ??
      cueObject?.rendererCueURL ??
      cueObject?.animation_url ??
      cueObject?.animationUrl ??
      cueObject?.animationURL ??
      cueObject?.animation_cue_url ??
      cueObject?.animationCueUrl ??
      cueObject?.animationCueURL ??
      cueObject?.motion_url ??
      cueObject?.motionUrl ??
      cueObject?.motionURL ??
      cueObject?.expression_url ??
      cueObject?.expressionUrl ??
      cueObject?.expressionURL ??
      cueObject?.file_url ??
      cueObject?.fileUrl ??
      cueObject?.fileURL ??
      cueObject?.download_url ??
      cueObject?.downloadUrl ??
      cueObject?.downloadURL ??
      artifact?.url ??
      artifact?.cue_url ??
      artifact?.cueUrl ??
      artifact?.cueURL ??
      artifact?.live2d_cue_url ??
      artifact?.live2dCueUrl ??
      artifact?.live2dCueURL ??
      artifact?.renderer_cue_url ??
      artifact?.rendererCueUrl ??
      artifact?.rendererCueURL ??
      artifact?.file_url ??
      artifact?.fileUrl ??
      artifact?.fileURL ??
      artifact?.download_url ??
      artifact?.downloadUrl ??
      artifact?.downloadURL ??
      file?.url ??
      file?.file_url ??
      file?.fileUrl ??
      file?.fileURL ??
      file?.download_url ??
      file?.downloadUrl ??
      file?.downloadURL ??
      file?.cue_url ??
      file?.cueUrl ??
      file?.cueURL ??
      file?.live2d_cue_url ??
      file?.live2dCueUrl ??
      file?.live2dCueURL ??
      dataArtifact?.url ??
      dataArtifact?.cue_url ??
      dataArtifact?.cueUrl ??
      dataArtifact?.cueURL ??
      dataArtifact?.live2d_cue_url ??
      dataArtifact?.live2dCueUrl ??
      dataArtifact?.live2dCueURL ??
      dataArtifact?.file_url ??
      dataArtifact?.fileUrl ??
      dataArtifact?.fileURL ??
      dataArtifact?.download_url ??
      dataArtifact?.downloadUrl ??
      dataArtifact?.downloadURL ??
      dataFile?.url ??
      dataFile?.file_url ??
      dataFile?.fileUrl ??
      dataFile?.fileURL ??
      dataFile?.download_url ??
      dataFile?.downloadUrl ??
      dataFile?.downloadURL ??
      dataFile?.cue_url ??
      dataFile?.cueUrl ??
      dataFile?.cueURL ??
      outputArtifact?.url ??
      outputArtifact?.cue_url ??
      outputArtifact?.cueUrl ??
      outputArtifact?.cueURL ??
      outputArtifact?.live2d_cue_url ??
      outputArtifact?.live2dCueUrl ??
      outputArtifact?.live2dCueURL ??
      outputArtifact?.file_url ??
      outputArtifact?.fileUrl ??
      outputArtifact?.fileURL ??
      outputArtifact?.download_url ??
      outputArtifact?.downloadUrl ??
      outputArtifact?.downloadURL ??
      outputFile?.url ??
      outputFile?.file_url ??
      outputFile?.fileUrl ??
      outputFile?.fileURL ??
      outputFile?.download_url ??
      outputFile?.downloadUrl ??
      outputFile?.downloadURL ??
      outputFile?.cue_url ??
      outputFile?.cueUrl ??
      outputFile?.cueURL ??
      resultArtifact?.url ??
      resultArtifact?.cue_url ??
      resultArtifact?.cueUrl ??
      resultArtifact?.cueURL ??
      resultArtifact?.live2d_cue_url ??
      resultArtifact?.live2dCueUrl ??
      resultArtifact?.live2dCueURL ??
      resultArtifact?.file_url ??
      resultArtifact?.fileUrl ??
      resultArtifact?.fileURL ??
      resultArtifact?.download_url ??
      resultArtifact?.downloadUrl ??
      resultArtifact?.downloadURL ??
      resultFile?.url ??
      resultFile?.file_url ??
      resultFile?.fileUrl ??
      resultFile?.fileURL ??
      resultFile?.download_url ??
      resultFile?.downloadUrl ??
      resultFile?.downloadURL ??
      urlishArtifactReference(artifact) ??
      urlishArtifactReference(file) ??
      urlishArtifactReference(dataArtifact) ??
      urlishArtifactReference(dataFile) ??
      urlishArtifactReference(outputArtifact) ??
      urlishArtifactReference(outputFile) ??
      urlishArtifactReference(resultArtifact) ??
      urlishArtifactReference(resultFile) ??
      resultFile?.cue_url ??
      resultFile?.cueUrl ??
      resultFile?.cueURL,
    1000
  );
}

function firstLive2dCueUrlObject(sources) {
  for (const source of sources) {
    const object =
      responsePayloadObject(source?.cue) ||
      responsePayloadObject(source?.cue_url) ||
      responsePayloadObject(source?.cueUrl) ||
      responsePayloadObject(source?.cueURL) ||
      responsePayloadObject(source?.live2d_cue) ||
      responsePayloadObject(source?.live2d_cue_url) ||
      responsePayloadObject(source?.live2dCue) ||
      responsePayloadObject(source?.live2dCueUrl) ||
      responsePayloadObject(source?.live2dCueURL) ||
      responsePayloadObject(source?.renderer_cue) ||
      responsePayloadObject(source?.renderer_cue_url) ||
      responsePayloadObject(source?.rendererCue) ||
      responsePayloadObject(source?.rendererCueUrl) ||
      responsePayloadObject(source?.rendererCueURL) ||
      responsePayloadObject(source?.animation) ||
      responsePayloadObject(source?.animation_url) ||
      responsePayloadObject(source?.animationUrl) ||
      responsePayloadObject(source?.animationURL) ||
      responsePayloadObject(source?.animation_cue) ||
      responsePayloadObject(source?.animation_cue_url) ||
      responsePayloadObject(source?.animationCue) ||
      responsePayloadObject(source?.animationCueUrl) ||
      responsePayloadObject(source?.animationCueURL) ||
      responsePayloadObject(source?.motion) ||
      responsePayloadObject(source?.motion_url) ||
      responsePayloadObject(source?.motionUrl) ||
      responsePayloadObject(source?.motionURL) ||
      responsePayloadObject(source?.expression) ||
      responsePayloadObject(source?.expression_url) ||
      responsePayloadObject(source?.expressionUrl) ||
      responsePayloadObject(source?.expressionURL);
    if (object) return object;
  }
  return null;
}

function extractSubtitleUrl(payload) {
  const data = responseDataObject(payload);
  const output = responseOutputObject(payload);
  const result = responseDataObject(payload?.result);
  const subtitleObject = firstSubtitleArtifactObject([payload, data, output, result]);
  const artifact = responsePayloadObject(payload?.artifact);
  const file = responsePayloadObject(payload?.file);
  const dataArtifact = responsePayloadObject(data?.artifact);
  const dataFile = responsePayloadObject(data?.file);
  const outputArtifact = responsePayloadObject(output?.artifact);
  const outputFile = responsePayloadObject(output?.file);
  const resultArtifact = responsePayloadObject(result?.artifact);
  const resultFile = responsePayloadObject(result?.file);
  return safeText(
    payload?.subtitle_url ??
      payload?.subtitleUrl ??
      payload?.subtitleURL ??
      payload?.caption_url ??
      payload?.captionUrl ??
      payload?.captionURL ??
      payload?.transcript_url ??
      payload?.transcriptUrl ??
      payload?.transcriptURL ??
      payload?.srt_url ??
      payload?.srtUrl ??
      payload?.srtURL ??
      payload?.vtt_url ??
      payload?.vttUrl ??
      payload?.vttURL ??
      payload?.artifact_url ??
      payload?.artifactUrl ??
      payload?.artifactURL ??
      payload?.download_url ??
      payload?.downloadUrl ??
      payload?.downloadURL ??
      payload?.content_url ??
      payload?.contentUrl ??
      payload?.contentURL ??
      payload?.asset_url ??
      payload?.assetUrl ??
      payload?.assetURL ??
      data?.subtitle_url ??
      data?.subtitleUrl ??
      data?.subtitleURL ??
      data?.caption_url ??
      data?.captionUrl ??
      data?.captionURL ??
      data?.transcript_url ??
      data?.transcriptUrl ??
      data?.transcriptURL ??
      data?.srt_url ??
      data?.srtUrl ??
      data?.srtURL ??
      data?.vtt_url ??
      data?.vttUrl ??
      data?.vttURL ??
      data?.artifact_url ??
      data?.artifactUrl ??
      data?.artifactURL ??
      data?.download_url ??
      data?.downloadUrl ??
      data?.downloadURL ??
      data?.content_url ??
      data?.contentUrl ??
      data?.contentURL ??
      data?.asset_url ??
      data?.assetUrl ??
      data?.assetURL ??
      output?.subtitle_url ??
      output?.subtitleUrl ??
      output?.subtitleURL ??
      output?.caption_url ??
      output?.captionUrl ??
      output?.captionURL ??
      output?.transcript_url ??
      output?.transcriptUrl ??
      output?.transcriptURL ??
      output?.srt_url ??
      output?.srtUrl ??
      output?.srtURL ??
      output?.vtt_url ??
      output?.vttUrl ??
      output?.vttURL ??
      output?.artifact_url ??
      output?.artifactUrl ??
      output?.artifactURL ??
      output?.download_url ??
      output?.downloadUrl ??
      output?.downloadURL ??
      output?.content_url ??
      output?.contentUrl ??
      output?.contentURL ??
      output?.asset_url ??
      output?.assetUrl ??
      output?.assetURL ??
      result?.subtitle_url ??
      result?.subtitleUrl ??
      result?.subtitleURL ??
      result?.caption_url ??
      result?.captionUrl ??
      result?.captionURL ??
      result?.transcript_url ??
      result?.transcriptUrl ??
      result?.transcriptURL ??
      result?.srt_url ??
      result?.srtUrl ??
      result?.srtURL ??
      result?.vtt_url ??
      result?.vttUrl ??
      result?.vttURL ??
      result?.artifact_url ??
      result?.artifactUrl ??
      result?.artifactURL ??
      result?.download_url ??
      result?.downloadUrl ??
      result?.downloadURL ??
      result?.content_url ??
      result?.contentUrl ??
      result?.contentURL ??
      result?.asset_url ??
      result?.assetUrl ??
      result?.assetURL ??
      subtitleObject?.url ??
      subtitleObject?.subtitle_url ??
      subtitleObject?.subtitleUrl ??
      subtitleObject?.subtitleURL ??
      subtitleObject?.caption_url ??
      subtitleObject?.captionUrl ??
      subtitleObject?.captionURL ??
      subtitleObject?.transcript_url ??
      subtitleObject?.transcriptUrl ??
      subtitleObject?.transcriptURL ??
      subtitleObject?.srt_url ??
      subtitleObject?.srtUrl ??
      subtitleObject?.srtURL ??
      subtitleObject?.vtt_url ??
      subtitleObject?.vttUrl ??
      subtitleObject?.vttURL ??
      subtitleObject?.download_url ??
      subtitleObject?.downloadUrl ??
      subtitleObject?.downloadURL ??
      artifact?.url ??
      artifact?.subtitle_url ??
      artifact?.subtitleUrl ??
      artifact?.subtitleURL ??
      artifact?.caption_url ??
      artifact?.captionUrl ??
      artifact?.captionURL ??
      artifact?.vtt_url ??
      artifact?.vttUrl ??
      artifact?.vttURL ??
      artifact?.download_url ??
      artifact?.downloadUrl ??
      artifact?.downloadURL ??
      file?.url ??
      file?.subtitle_url ??
      file?.subtitleUrl ??
      file?.subtitleURL ??
      file?.caption_url ??
      file?.captionUrl ??
      file?.captionURL ??
      file?.vtt_url ??
      file?.vttUrl ??
      file?.vttURL ??
      file?.download_url ??
      file?.downloadUrl ??
      file?.downloadURL ??
      dataArtifact?.url ??
      dataArtifact?.subtitle_url ??
      dataArtifact?.subtitleUrl ??
      dataArtifact?.subtitleURL ??
      dataArtifact?.caption_url ??
      dataArtifact?.captionUrl ??
      dataArtifact?.captionURL ??
      dataArtifact?.download_url ??
      dataArtifact?.downloadUrl ??
      dataArtifact?.downloadURL ??
      dataFile?.url ??
      dataFile?.subtitle_url ??
      dataFile?.subtitleUrl ??
      dataFile?.subtitleURL ??
      dataFile?.download_url ??
      dataFile?.downloadUrl ??
      dataFile?.downloadURL ??
      outputArtifact?.url ??
      outputArtifact?.subtitle_url ??
      outputArtifact?.subtitleUrl ??
      outputArtifact?.subtitleURL ??
      outputArtifact?.caption_url ??
      outputArtifact?.captionUrl ??
      outputArtifact?.captionURL ??
      outputArtifact?.download_url ??
      outputArtifact?.downloadUrl ??
      outputArtifact?.downloadURL ??
      outputFile?.url ??
      outputFile?.subtitle_url ??
      outputFile?.subtitleUrl ??
      outputFile?.subtitleURL ??
      outputFile?.download_url ??
      outputFile?.downloadUrl ??
      outputFile?.downloadURL ??
      resultArtifact?.url ??
      resultArtifact?.subtitle_url ??
      resultArtifact?.subtitleUrl ??
      resultArtifact?.subtitleURL ??
      resultArtifact?.caption_url ??
      resultArtifact?.captionUrl ??
      resultArtifact?.captionURL ??
      resultArtifact?.download_url ??
      resultArtifact?.downloadUrl ??
      resultArtifact?.downloadURL ??
      resultFile?.url ??
      resultFile?.subtitle_url ??
      resultFile?.subtitleUrl ??
      resultFile?.subtitleURL ??
      resultFile?.download_url ??
      resultFile?.downloadUrl ??
      resultFile?.downloadURL ??
      urlishArtifactReference(artifact) ??
      urlishArtifactReference(file) ??
      urlishArtifactReference(dataArtifact) ??
      urlishArtifactReference(dataFile) ??
      urlishArtifactReference(outputArtifact) ??
      urlishArtifactReference(outputFile) ??
      urlishArtifactReference(resultArtifact) ??
      urlishArtifactReference(resultFile),
    1000
  );
}

function firstSubtitleArtifactObject(sources) {
  for (const source of sources) {
    const object =
      responsePayloadObject(source?.subtitle) ||
      responsePayloadObject(source?.subtitle_url) ||
      responsePayloadObject(source?.subtitleUrl) ||
      responsePayloadObject(source?.subtitleURL) ||
      responsePayloadObject(source?.caption) ||
      responsePayloadObject(source?.caption_url) ||
      responsePayloadObject(source?.captionUrl) ||
      responsePayloadObject(source?.captionURL) ||
      responsePayloadObject(source?.transcript) ||
      responsePayloadObject(source?.transcript_url) ||
      responsePayloadObject(source?.transcriptUrl) ||
      responsePayloadObject(source?.transcriptURL) ||
      responsePayloadObject(source?.srt_url) ||
      responsePayloadObject(source?.srtUrl) ||
      responsePayloadObject(source?.srtURL) ||
      responsePayloadObject(source?.vtt_url) ||
      responsePayloadObject(source?.vttUrl) ||
      responsePayloadObject(source?.vttURL);
    if (object) return object;
  }
  return null;
}

function extractTtsAudioUrl(payload) {
  const data = responseDataObject(payload);
  const output = responseOutputObject(payload);
  const result = responseDataObject(payload?.result);
  const audio = responsePayloadObject(payload?.audio ?? payload?.audio_url ?? payload?.audioUrl ?? payload?.audioURL);
  const speech = responsePayloadObject(payload?.speech ?? payload?.speech_url ?? payload?.speechUrl ?? payload?.speechURL);
  const voiceAudio = responsePayloadObject(payload?.voice_audio ?? payload?.voiceAudio ?? payload?.voice_audio_url ?? payload?.voiceAudioUrl ?? payload?.voiceAudioURL);
  const artifact = responsePayloadObject(payload?.artifact ?? payload?.artifact_url ?? payload?.artifactUrl ?? payload?.artifactURL);
  const file = responsePayloadObject(payload?.file ?? payload?.file_url ?? payload?.fileUrl ?? payload?.fileURL ?? payload?.download_url ?? payload?.downloadUrl ?? payload?.downloadURL);
  const dataAudio = responsePayloadObject(data?.audio ?? data?.audio_url ?? data?.audioUrl ?? data?.audioURL);
  const dataSpeech = responsePayloadObject(data?.speech ?? data?.speech_url ?? data?.speechUrl ?? data?.speechURL);
  const dataVoiceAudio = responsePayloadObject(data?.voice_audio ?? data?.voiceAudio ?? data?.voice_audio_url ?? data?.voiceAudioUrl ?? data?.voiceAudioURL);
  const dataArtifact = responsePayloadObject(data?.artifact ?? data?.artifact_url ?? data?.artifactUrl ?? data?.artifactURL);
  const dataFile = responsePayloadObject(data?.file ?? data?.file_url ?? data?.fileUrl ?? data?.fileURL ?? data?.download_url ?? data?.downloadUrl ?? data?.downloadURL);
  const outputAudio = responsePayloadObject(output?.audio ?? output?.audio_url ?? output?.audioUrl ?? output?.audioURL);
  const outputSpeech = responsePayloadObject(output?.speech ?? output?.speech_url ?? output?.speechUrl ?? output?.speechURL);
  const outputVoiceAudio = responsePayloadObject(output?.voice_audio ?? output?.voiceAudio ?? output?.voice_audio_url ?? output?.voiceAudioUrl ?? output?.voiceAudioURL);
  const outputArtifact = responsePayloadObject(output?.artifact ?? output?.artifact_url ?? output?.artifactUrl ?? output?.artifactURL);
  const outputFile = responsePayloadObject(output?.file ?? output?.file_url ?? output?.fileUrl ?? output?.fileURL ?? output?.download_url ?? output?.downloadUrl ?? output?.downloadURL);
  const resultAudio = responsePayloadObject(result?.audio ?? result?.audio_url ?? result?.audioUrl ?? result?.audioURL);
  const resultSpeech = responsePayloadObject(result?.speech ?? result?.speech_url ?? result?.speechUrl ?? result?.speechURL);
  const resultVoiceAudio = responsePayloadObject(result?.voice_audio ?? result?.voiceAudio ?? result?.voice_audio_url ?? result?.voiceAudioUrl ?? result?.voiceAudioURL);
  const resultArtifact = responsePayloadObject(result?.artifact ?? result?.artifact_url ?? result?.artifactUrl ?? result?.artifactURL);
  const resultFile = responsePayloadObject(result?.file ?? result?.file_url ?? result?.fileUrl ?? result?.fileURL ?? result?.download_url ?? result?.downloadUrl ?? result?.downloadURL);
  return safeText(
    payload?.audio_url ??
    payload?.audioUrl ??
      payload?.audioURL ??
      payload?.speech_url ??
      payload?.speechUrl ??
      payload?.speechURL ??
      payload?.voice_audio_url ??
      payload?.voiceAudioUrl ??
      payload?.voiceAudioURL ??
      payload?.url ??
      payload?.file_url ??
      payload?.fileUrl ??
      payload?.fileURL ??
      payload?.download_url ??
      payload?.downloadUrl ??
      payload?.downloadURL ??
      payload?.content_url ??
      payload?.contentUrl ??
      payload?.contentURL ??
      payload?.asset_url ??
      payload?.assetUrl ??
      payload?.assetURL ??
      payload?.artifact_url ??
      payload?.artifactUrl ??
      payload?.artifactURL ??
      data?.audio_url ??
      data?.audioUrl ??
      data?.audioURL ??
      data?.speech_url ??
      data?.speechUrl ??
      data?.speechURL ??
      data?.voice_audio_url ??
      data?.voiceAudioUrl ??
      data?.voiceAudioURL ??
      data?.url ??
      data?.file_url ??
      data?.fileUrl ??
      data?.fileURL ??
      data?.download_url ??
      data?.downloadUrl ??
      data?.downloadURL ??
      data?.content_url ??
      data?.contentUrl ??
      data?.contentURL ??
      data?.asset_url ??
      data?.assetUrl ??
      data?.assetURL ??
      data?.artifact_url ??
      data?.artifactUrl ??
      data?.artifactURL ??
      output?.audio_url ??
      output?.audioUrl ??
      output?.audioURL ??
      output?.speech_url ??
      output?.speechUrl ??
      output?.speechURL ??
      output?.voice_audio_url ??
      output?.voiceAudioUrl ??
      output?.voiceAudioURL ??
      output?.url ??
      output?.file_url ??
      output?.fileUrl ??
      output?.fileURL ??
      output?.download_url ??
      output?.downloadUrl ??
      output?.downloadURL ??
      output?.content_url ??
      output?.contentUrl ??
      output?.contentURL ??
      output?.asset_url ??
      output?.assetUrl ??
      output?.assetURL ??
      output?.artifact_url ??
      output?.artifactUrl ??
      output?.artifactURL ??
      result?.audio_url ??
      result?.audioUrl ??
      result?.audioURL ??
      result?.speech_url ??
      result?.speechUrl ??
      result?.speechURL ??
      result?.voice_audio_url ??
      result?.voiceAudioUrl ??
      result?.voiceAudioURL ??
      result?.url ??
      result?.file_url ??
      result?.fileUrl ??
      result?.fileURL ??
      result?.download_url ??
      result?.downloadUrl ??
      result?.downloadURL ??
      result?.content_url ??
      result?.contentUrl ??
      result?.contentURL ??
      result?.asset_url ??
      result?.assetUrl ??
      result?.assetURL ??
      result?.artifact_url ??
      result?.artifactUrl ??
      result?.artifactURL ??
      audio?.url ??
      audio?.audio_url ??
      audio?.audioUrl ??
      audio?.audioURL ??
      audio?.speech_url ??
      audio?.speechUrl ??
      audio?.speechURL ??
      audio?.voice_audio_url ??
      audio?.voiceAudioUrl ??
      audio?.voiceAudioURL ??
      speech?.url ??
      speech?.audio_url ??
      speech?.audioUrl ??
      speech?.audioURL ??
      speech?.speech_url ??
      speech?.speechUrl ??
      speech?.speechURL ??
      speech?.voice_audio_url ??
      speech?.voiceAudioUrl ??
      speech?.voiceAudioURL ??
      voiceAudio?.url ??
      voiceAudio?.audio_url ??
      voiceAudio?.audioUrl ??
      voiceAudio?.audioURL ??
      voiceAudio?.speech_url ??
      voiceAudio?.speechUrl ??
      voiceAudio?.speechURL ??
      voiceAudio?.voice_audio_url ??
      voiceAudio?.voiceAudioUrl ??
      voiceAudio?.voiceAudioURL ??
      artifact?.url ??
      artifact?.file_url ??
      artifact?.fileUrl ??
      artifact?.fileURL ??
      artifact?.audio_url ??
      artifact?.audioUrl ??
      artifact?.audioURL ??
      artifact?.speech_url ??
      artifact?.speechUrl ??
      artifact?.speechURL ??
      artifact?.voice_audio_url ??
      artifact?.voiceAudioUrl ??
      artifact?.voiceAudioURL ??
      file?.url ??
      file?.file_url ??
      file?.fileUrl ??
      file?.fileURL ??
      file?.audio_url ??
      file?.audioUrl ??
      file?.audioURL ??
      dataAudio?.url ??
      dataAudio?.audio_url ??
      dataAudio?.audioUrl ??
      dataAudio?.audioURL ??
      dataAudio?.speech_url ??
      dataAudio?.speechUrl ??
      dataAudio?.speechURL ??
      dataAudio?.voice_audio_url ??
      dataAudio?.voiceAudioUrl ??
      dataAudio?.voiceAudioURL ??
      dataSpeech?.url ??
      dataSpeech?.audio_url ??
      dataSpeech?.audioUrl ??
      dataSpeech?.audioURL ??
      dataSpeech?.speech_url ??
      dataSpeech?.speechUrl ??
      dataSpeech?.speechURL ??
      dataSpeech?.voice_audio_url ??
      dataSpeech?.voiceAudioUrl ??
      dataSpeech?.voiceAudioURL ??
      dataVoiceAudio?.url ??
      dataVoiceAudio?.audio_url ??
      dataVoiceAudio?.audioUrl ??
      dataVoiceAudio?.audioURL ??
      dataVoiceAudio?.speech_url ??
      dataVoiceAudio?.speechUrl ??
      dataVoiceAudio?.speechURL ??
      dataVoiceAudio?.voice_audio_url ??
      dataVoiceAudio?.voiceAudioUrl ??
      dataVoiceAudio?.voiceAudioURL ??
      dataArtifact?.url ??
      dataArtifact?.file_url ??
      dataArtifact?.fileUrl ??
      dataArtifact?.fileURL ??
      dataArtifact?.audio_url ??
      dataArtifact?.audioUrl ??
      dataArtifact?.audioURL ??
      dataArtifact?.speech_url ??
      dataArtifact?.speechUrl ??
      dataArtifact?.speechURL ??
      dataFile?.url ??
      dataFile?.file_url ??
      dataFile?.fileUrl ??
      dataFile?.fileURL ??
      dataFile?.audio_url ??
      dataFile?.audioUrl ??
      dataFile?.audioURL ??
      outputAudio?.url ??
      outputAudio?.audio_url ??
      outputAudio?.audioUrl ??
      outputAudio?.audioURL ??
      outputAudio?.speech_url ??
      outputAudio?.speechUrl ??
      outputAudio?.speechURL ??
      outputAudio?.voice_audio_url ??
      outputAudio?.voiceAudioUrl ??
      outputAudio?.voiceAudioURL ??
      outputSpeech?.url ??
      outputSpeech?.audio_url ??
      outputSpeech?.audioUrl ??
      outputSpeech?.audioURL ??
      outputSpeech?.speech_url ??
      outputSpeech?.speechUrl ??
      outputSpeech?.speechURL ??
      outputSpeech?.voice_audio_url ??
      outputSpeech?.voiceAudioUrl ??
      outputSpeech?.voiceAudioURL ??
      outputVoiceAudio?.url ??
      outputVoiceAudio?.audio_url ??
      outputVoiceAudio?.audioUrl ??
      outputVoiceAudio?.audioURL ??
      outputVoiceAudio?.speech_url ??
      outputVoiceAudio?.speechUrl ??
      outputVoiceAudio?.speechURL ??
      outputVoiceAudio?.voice_audio_url ??
      outputVoiceAudio?.voiceAudioUrl ??
      outputVoiceAudio?.voiceAudioURL ??
      outputArtifact?.url ??
      outputArtifact?.file_url ??
      outputArtifact?.fileUrl ??
      outputArtifact?.fileURL ??
      outputArtifact?.audio_url ??
      outputArtifact?.audioUrl ??
      outputArtifact?.audioURL ??
      outputArtifact?.speech_url ??
      outputArtifact?.speechUrl ??
      outputArtifact?.speechURL ??
      outputFile?.url ??
      outputFile?.file_url ??
      outputFile?.fileUrl ??
      outputFile?.fileURL ??
      outputFile?.audio_url ??
      outputFile?.audioUrl ??
      outputFile?.audioURL ??
      resultAudio?.url ??
      resultAudio?.audio_url ??
      resultAudio?.audioUrl ??
      resultAudio?.audioURL ??
      resultAudio?.speech_url ??
      resultAudio?.speechUrl ??
      resultAudio?.speechURL ??
      resultAudio?.voice_audio_url ??
      resultAudio?.voiceAudioUrl ??
      resultAudio?.voiceAudioURL ??
      resultSpeech?.url ??
      resultSpeech?.audio_url ??
      resultSpeech?.audioUrl ??
      resultSpeech?.audioURL ??
      resultSpeech?.speech_url ??
      resultSpeech?.speechUrl ??
      resultSpeech?.speechURL ??
      resultSpeech?.voice_audio_url ??
      resultSpeech?.voiceAudioUrl ??
      resultSpeech?.voiceAudioURL ??
      resultVoiceAudio?.url ??
      resultVoiceAudio?.audio_url ??
      resultVoiceAudio?.audioUrl ??
      resultVoiceAudio?.audioURL ??
      resultVoiceAudio?.speech_url ??
      resultVoiceAudio?.speechUrl ??
      resultVoiceAudio?.speechURL ??
      resultVoiceAudio?.voice_audio_url ??
      resultVoiceAudio?.voiceAudioUrl ??
      resultVoiceAudio?.voiceAudioURL ??
      resultArtifact?.url ??
      resultArtifact?.file_url ??
      resultArtifact?.fileUrl ??
      resultArtifact?.fileURL ??
      resultArtifact?.audio_url ??
      resultArtifact?.audioUrl ??
      resultArtifact?.audioURL ??
      resultArtifact?.speech_url ??
      resultArtifact?.speechUrl ??
      resultArtifact?.speechURL ??
      resultFile?.url ??
      resultFile?.file_url ??
      resultFile?.fileUrl ??
      resultFile?.fileURL ??
      resultFile?.audio_url ??
      resultFile?.audioUrl ??
      resultFile?.audioURL ??
      urlishArtifactReference(artifact) ??
      urlishArtifactReference(file) ??
      urlishArtifactReference(dataArtifact) ??
      urlishArtifactReference(dataFile) ??
      urlishArtifactReference(outputArtifact) ??
      urlishArtifactReference(outputFile) ??
      urlishArtifactReference(resultArtifact) ??
      urlishArtifactReference(resultFile),
    1000
  );
}

function urlishArtifactReference(value) {
  return safeText(
    value?.content_url ??
      value?.contentUrl ??
      value?.contentURL ??
      value?.asset_url ??
      value?.assetUrl ??
      value?.assetURL ??
      value?.download_url ??
      value?.downloadUrl ??
      value?.downloadURL ??
      value?.file_url ??
      value?.fileUrl ??
      value?.fileURL ??
      value?.url,
    1000
  );
}

function stripEngineUrlFields(value) {
  if (Array.isArray(value)) return value.map((item) => stripEngineUrlFields(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          ![
            "url",
            "audio_url",
            "audioUrl",
            "audioURL",
            "speech_url",
            "speechUrl",
            "speechURL",
            "voice_audio_url",
            "voiceAudioUrl",
            "voiceAudioURL",
            "file_url",
            "fileUrl",
            "fileURL",
            "download_url",
            "downloadUrl",
            "downloadURL",
            "content_url",
            "contentUrl",
            "contentURL",
            "asset_url",
            "assetUrl",
            "assetURL",
            "artifact_url",
            "artifactUrl",
            "artifactURL",
            "cue_url",
            "cueUrl",
            "cueURL",
            "live2d_cue_url",
            "live2dCueUrl",
            "live2dCueURL",
            "renderer_cue_url",
            "rendererCueUrl",
            "rendererCueURL",
            "animation_url",
            "animationUrl",
            "animationURL",
            "animation_cue_url",
            "animationCueUrl",
            "animationCueURL",
            "motion_url",
            "motionUrl",
            "motionURL",
            "expression_url",
            "expressionUrl",
            "expressionURL",
            "subtitle_url",
            "subtitleUrl",
            "subtitleURL",
            "caption_url",
            "captionUrl",
            "captionURL",
            "transcript_url",
            "transcriptUrl",
            "transcriptURL",
            "srt_url",
            "srtUrl",
            "srtURL",
            "vtt_url",
            "vttUrl",
            "vttURL",
          ].includes(key)
      )
      .map(([key, child]) => [key, stripEngineUrlFields(child)])
  );
}

function parseEngineJsonResponse(text, context) {
  const raw = String(text ?? "");
  if (!raw.trim()) {
    throw new ContractError(`${context}: response requires JSON`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new ContractError(`${context}: response requires JSON`);
  }
}

function assertLocalEngineResponseSafe(payload, context) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ContractError(`${context}: response must be a JSON object`);
  }
  assertNoForbiddenEnginePublicFields(payload, context);
}

function decodeBase64Audio(value, context) {
  if (Array.isArray(value)) {
    return decodeAudioByteArray(value, context);
  }
  if (isPlainObject(value) && Array.isArray(value.data)) {
    return decodeAudioByteArray(value.data, context);
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new ContractError(`${context}: audio_base64 is required`);
  }
  if (value.length > 40_000_000) {
    throw new ContractError(`${context}: audio_base64 is too large`);
  }
  const buffer = Buffer.from(value, "base64");
  if (buffer.length < 12) {
    throw new ContractError(`${context}: decoded audio is too small`);
  }
  return buffer;
}

function decodeAudioByteArray(value, context) {
  if (value.length > 30_000_000) {
    throw new ContractError(`${context}: audio byte array is too large`);
  }
  const buffer = Buffer.from(value.map((byte) => clampInteger(byte, 0, 255, 0)));
  if (buffer.length < 12) {
    throw new ContractError(`${context}: decoded audio is too small`);
  }
  return buffer;
}

function requireAudioMime(value, context) {
  const mime = safeText(value, 80);
  if (!mime) {
    throw new ContractError(`${context}: audio_mime is required with audio_base64`);
  }
  if (!mime.startsWith("audio/")) {
    throw new ContractError(`${context}: audio_mime must be audio/*`);
  }
  return mime;
}

function validateTtsEngineAudioBytes({ bytes, audioMime, artifactKind, extension, context }) {
  if (extension === "bin") {
    throw new ContractError(`${context}: TTS engine artifact must have a supported audio extension`, {
      audio_mime: safeText(audioMime, 80),
      extension: safeText(extension, 20),
    });
  }
  if (!isExpectedEngineArtifactKind("tts", artifactKind)) {
    throw new ContractError(`${context}: unsupported TTS engine artifact audio_mime`, {
      audio_mime: safeText(audioMime, 80),
      artifact_kind: safeText(artifactKind, 80),
    });
  }
  const validation = validateLocalRenderArtifactForPickup({
    adapterKind: "tts",
    artifact: {
      adapter_kind: "tts",
      artifact_kind: artifactKind,
    },
    contentType: audioMime,
    bytes,
  });
  if (validation.contract_valid !== true) {
    throw new ContractError(`${context}: audio content does not match declared audio_mime`);
  }
}

function assertLocalRenderArtifactFileForPickup({
  adapterKind,
  artifactKind,
  artifactPath,
  contentType = "",
  context,
}) {
  const validation = validateLocalRenderArtifactForPickup({
    adapterKind,
    artifact: {
      adapter_kind: adapterKind,
      artifact_kind: artifactKind,
    },
    contentType,
    bytes: readFileSync(artifactPath),
  });
  if (validation.contract_valid !== true) {
    throw new ContractError(`${context}: artifact content is not pickup-safe`);
  }
}

function resolveAudioPayload(response, context) {
  const data = responseDataObject(response);
  const output = responseOutputObject(response);
  const result = responseDataObject(response.result);
  const explicitDataUrl =
    response.audio_data_url ??
    response.audioDataUrl ??
    response.audioDataURL ??
    response.audio_content_data_url ??
    response.audioContentDataUrl ??
    response.audioContentDataURL ??
    response.speech_data_url ??
    response.speechDataUrl ??
    response.speechDataURL ??
    response.speech_content_data_url ??
    response.speechContentDataUrl ??
    response.speechContentDataURL ??
    response.voice_audio_data_url ??
    response.voiceAudioDataUrl ??
    response.voiceAudioDataURL ??
    response.voice_audio_content_data_url ??
    response.voiceAudioContentDataUrl ??
    response.voiceAudioContentDataURL ??
    response.data_url ??
    response.dataUrl ??
    response.dataURL ??
    data.audio_data_url ??
    data.audioDataUrl ??
    data.audioDataURL ??
    data.audio_content_data_url ??
    data.audioContentDataUrl ??
    data.audioContentDataURL ??
    data.speech_data_url ??
    data.speechDataUrl ??
    data.speechDataURL ??
    data.speech_content_data_url ??
    data.speechContentDataUrl ??
    data.speechContentDataURL ??
    data.voice_audio_data_url ??
    data.voiceAudioDataUrl ??
    data.voiceAudioDataURL ??
    data.voice_audio_content_data_url ??
    data.voiceAudioContentDataUrl ??
    data.voiceAudioContentDataURL ??
    data.data_url ??
    data.dataUrl ??
    data.dataURL ??
    output.audio_data_url ??
    output.audioDataUrl ??
    output.audioDataURL ??
    output.audio_content_data_url ??
    output.audioContentDataUrl ??
    output.audioContentDataURL ??
    output.speech_data_url ??
    output.speechDataUrl ??
    output.speechDataURL ??
    output.speech_content_data_url ??
    output.speechContentDataUrl ??
    output.speechContentDataURL ??
    output.voice_audio_data_url ??
    output.voiceAudioDataUrl ??
    output.voiceAudioDataURL ??
    output.voice_audio_content_data_url ??
    output.voiceAudioContentDataUrl ??
    output.voiceAudioContentDataURL ??
    output.data_url ??
    output.dataUrl ??
    output.dataURL ??
    result.audio_data_url ??
    result.audioDataUrl ??
    result.audioDataURL ??
    result.audio_content_data_url ??
    result.audioContentDataUrl ??
    result.audioContentDataURL ??
    result.speech_data_url ??
    result.speechDataUrl ??
    result.speechDataURL ??
    result.speech_content_data_url ??
    result.speechContentDataUrl ??
    result.speechContentDataURL ??
    result.voice_audio_data_url ??
    result.voiceAudioDataUrl ??
    result.voiceAudioDataURL ??
    result.voice_audio_content_data_url ??
    result.voiceAudioContentDataUrl ??
    result.voiceAudioContentDataURL ??
    result.data_url ??
    result.dataUrl ??
    result.dataURL ??
    "";
  const dataUrl =
    explicitDataUrl ||
    firstAudioDataUrl(
      response.output,
      data.output,
      output.output,
      result.output,
      response.audio,
      response.audioURL,
      data.audio,
      data.audioURL,
      output.audio,
      output.audioURL,
      result.audio,
      result.audioURL,
      response.speech,
      response.speechURL,
      data.speech,
      data.speechURL,
      output.speech,
      output.speechURL,
      result.speech,
      result.speechURL,
      response.voice_audio,
      response.voiceAudio,
      response.voiceAudioURL,
      data.voice_audio,
      data.voiceAudio,
      data.voiceAudioURL,
      output.voice_audio,
      output.voiceAudio,
      output.voiceAudioURL,
      result.voice_audio,
      result.voiceAudio,
      result.voiceAudioURL
    );
  if (dataUrl) return parseAudioDataUrl(dataUrl, context);
  const nestedAudio =
    (response.audio && typeof response.audio === "object" ? response.audio : null) ??
    (response.audio_data && typeof response.audio_data === "object" ? response.audio_data : null) ??
    (response.audioData && typeof response.audioData === "object" ? response.audioData : null) ??
    (response.audio_content && typeof response.audio_content === "object" ? response.audio_content : null) ??
    (response.audioContent && typeof response.audioContent === "object" ? response.audioContent : null) ??
    (response.audioURL && typeof response.audioURL === "object" ? response.audioURL : null) ??
    (response.speech && typeof response.speech === "object" ? response.speech : null) ??
    (response.speech_content && typeof response.speech_content === "object" ? response.speech_content : null) ??
    (response.speechContent && typeof response.speechContent === "object" ? response.speechContent : null) ??
    (response.speechURL && typeof response.speechURL === "object" ? response.speechURL : null) ??
    (response.voice_audio && typeof response.voice_audio === "object" ? response.voice_audio : null) ??
    (response.voiceAudio && typeof response.voiceAudio === "object" ? response.voiceAudio : null) ??
    (response.voice_audio_content && typeof response.voice_audio_content === "object" ? response.voice_audio_content : null) ??
    (response.voiceAudioContent && typeof response.voiceAudioContent === "object" ? response.voiceAudioContent : null) ??
    (response.voiceAudioURL && typeof response.voiceAudioURL === "object" ? response.voiceAudioURL : null) ??
    (response.artifact && typeof response.artifact === "object" ? response.artifact : null) ??
    (response.artifactURL && typeof response.artifactURL === "object" ? response.artifactURL : null) ??
    (response.file && typeof response.file === "object" ? response.file : null) ??
    (data.audio && typeof data.audio === "object" ? data.audio : null) ??
    (data.audio_data && typeof data.audio_data === "object" ? data.audio_data : null) ??
    (data.audioData && typeof data.audioData === "object" ? data.audioData : null) ??
    (data.audio_content && typeof data.audio_content === "object" ? data.audio_content : null) ??
    (data.audioContent && typeof data.audioContent === "object" ? data.audioContent : null) ??
    (data.audioURL && typeof data.audioURL === "object" ? data.audioURL : null) ??
    (data.speech && typeof data.speech === "object" ? data.speech : null) ??
    (data.speech_content && typeof data.speech_content === "object" ? data.speech_content : null) ??
    (data.speechContent && typeof data.speechContent === "object" ? data.speechContent : null) ??
    (data.speechURL && typeof data.speechURL === "object" ? data.speechURL : null) ??
    (data.voice_audio && typeof data.voice_audio === "object" ? data.voice_audio : null) ??
    (data.voiceAudio && typeof data.voiceAudio === "object" ? data.voiceAudio : null) ??
    (data.voice_audio_content && typeof data.voice_audio_content === "object" ? data.voice_audio_content : null) ??
    (data.voiceAudioContent && typeof data.voiceAudioContent === "object" ? data.voiceAudioContent : null) ??
    (data.voiceAudioURL && typeof data.voiceAudioURL === "object" ? data.voiceAudioURL : null) ??
    (data.artifact && typeof data.artifact === "object" ? data.artifact : null) ??
    (data.artifactURL && typeof data.artifactURL === "object" ? data.artifactURL : null) ??
    (data.file && typeof data.file === "object" ? data.file : null) ??
    (output.audio && typeof output.audio === "object" ? output.audio : null) ??
    (output.audio_data && typeof output.audio_data === "object" ? output.audio_data : null) ??
    (output.audioData && typeof output.audioData === "object" ? output.audioData : null) ??
    (output.audio_content && typeof output.audio_content === "object" ? output.audio_content : null) ??
    (output.audioContent && typeof output.audioContent === "object" ? output.audioContent : null) ??
    (output.audioURL && typeof output.audioURL === "object" ? output.audioURL : null) ??
    (output.speech && typeof output.speech === "object" ? output.speech : null) ??
    (output.speech_content && typeof output.speech_content === "object" ? output.speech_content : null) ??
    (output.speechContent && typeof output.speechContent === "object" ? output.speechContent : null) ??
    (output.speechURL && typeof output.speechURL === "object" ? output.speechURL : null) ??
    (output.voice_audio && typeof output.voice_audio === "object" ? output.voice_audio : null) ??
    (output.voiceAudio && typeof output.voiceAudio === "object" ? output.voiceAudio : null) ??
    (output.voice_audio_content && typeof output.voice_audio_content === "object" ? output.voice_audio_content : null) ??
    (output.voiceAudioContent && typeof output.voiceAudioContent === "object" ? output.voiceAudioContent : null) ??
    (output.voiceAudioURL && typeof output.voiceAudioURL === "object" ? output.voiceAudioURL : null) ??
    (output.artifact && typeof output.artifact === "object" ? output.artifact : null) ??
    (output.artifactURL && typeof output.artifactURL === "object" ? output.artifactURL : null) ??
    (output.file && typeof output.file === "object" ? output.file : null) ??
    (result.audio && typeof result.audio === "object" ? result.audio : null) ??
    (result.audio_data && typeof result.audio_data === "object" ? result.audio_data : null) ??
    (result.audioData && typeof result.audioData === "object" ? result.audioData : null) ??
    (result.audio_content && typeof result.audio_content === "object" ? result.audio_content : null) ??
    (result.audioContent && typeof result.audioContent === "object" ? result.audioContent : null) ??
    (result.audioURL && typeof result.audioURL === "object" ? result.audioURL : null) ??
    (result.speech && typeof result.speech === "object" ? result.speech : null) ??
    (result.speech_content && typeof result.speech_content === "object" ? result.speech_content : null) ??
    (result.speechContent && typeof result.speechContent === "object" ? result.speechContent : null) ??
    (result.speechURL && typeof result.speechURL === "object" ? result.speechURL : null) ??
    (result.voice_audio && typeof result.voice_audio === "object" ? result.voice_audio : null) ??
    (result.voiceAudio && typeof result.voiceAudio === "object" ? result.voiceAudio : null) ??
    (result.voice_audio_content && typeof result.voice_audio_content === "object" ? result.voice_audio_content : null) ??
    (result.voiceAudioContent && typeof result.voiceAudioContent === "object" ? result.voiceAudioContent : null) ??
    (result.voiceAudioURL && typeof result.voiceAudioURL === "object" ? result.voiceAudioURL : null) ??
    (result.artifact && typeof result.artifact === "object" ? result.artifact : null) ??
    (result.artifactURL && typeof result.artifactURL === "object" ? result.artifactURL : null) ??
    (result.file && typeof result.file === "object" ? result.file : null) ??
    {};
  const nestedAudioPayloads = [
    response.audio,
    response.audio_data,
    response.audioData,
    response.audio_content,
    response.audioContent,
    response.audioURL,
    response.speech,
    response.speech_content,
    response.speechContent,
    response.speechURL,
    response.voice_audio,
    response.voiceAudio,
    response.voice_audio_content,
    response.voiceAudioContent,
    response.voiceAudioURL,
    response.artifact,
    response.artifactURL,
    response.file,
    data.audio,
    data.audio_data,
    data.audioData,
    data.audio_content,
    data.audioContent,
    data.audioURL,
    data.speech,
    data.speech_content,
    data.speechContent,
    data.speechURL,
    data.voice_audio,
    data.voiceAudio,
    data.voice_audio_content,
    data.voiceAudioContent,
    data.voiceAudioURL,
    data.artifact,
    data.artifactURL,
    data.file,
    output.audio,
    output.audio_data,
    output.audioData,
    output.audio_content,
    output.audioContent,
    output.audioURL,
    output.speech,
    output.speech_content,
    output.speechContent,
    output.speechURL,
    output.voice_audio,
    output.voiceAudio,
    output.voice_audio_content,
    output.voiceAudioContent,
    output.voiceAudioURL,
    output.artifact,
    output.artifactURL,
    output.file,
    result.audio,
    result.audio_data,
    result.audioData,
    result.audio_content,
    result.audioContent,
    result.audioURL,
    result.speech,
    result.speech_content,
    result.speechContent,
    result.speechURL,
    result.voice_audio,
    result.voiceAudio,
    result.voice_audio_content,
    result.voiceAudioContent,
    result.voiceAudioURL,
    result.artifact,
    result.artifactURL,
    result.file,
  ].filter((item) => item && typeof item === "object" && !Array.isArray(item));
  const nestedDataUrl =
    nestedAudio.audio_data_url ??
    nestedAudio.audioDataUrl ??
    nestedAudio.audioDataURL ??
    nestedAudio.speech_data_url ??
    nestedAudio.speechDataUrl ??
    nestedAudio.speechDataURL ??
    nestedAudio.speech_content_data_url ??
    nestedAudio.speechContentDataUrl ??
    nestedAudio.speechContentDataURL ??
    nestedAudio.voice_audio_data_url ??
    nestedAudio.voiceAudioDataUrl ??
    nestedAudio.voiceAudioDataURL ??
    nestedAudio.voice_audio_content_data_url ??
    nestedAudio.voiceAudioContentDataUrl ??
    nestedAudio.voiceAudioContentDataURL ??
    nestedAudio.data_url ??
    nestedAudio.dataUrl ??
    nestedAudio.dataURL ??
    firstAudioPayloadValue(nestedAudioPayloads, [
      "audio_data_url",
      "audioDataUrl",
      "audioDataURL",
      "audio_content_data_url",
      "audioContentDataUrl",
      "audioContentDataURL",
      "speech_data_url",
      "speechDataUrl",
      "speechDataURL",
      "speech_content_data_url",
      "speechContentDataUrl",
      "speechContentDataURL",
      "voice_audio_data_url",
      "voiceAudioDataUrl",
      "voiceAudioDataURL",
      "voice_audio_content_data_url",
      "voiceAudioContentDataUrl",
      "voiceAudioContentDataURL",
      "data_url",
      "dataUrl",
      "dataURL",
    ]);
  if (nestedDataUrl) return parseAudioDataUrl(nestedDataUrl, context);
  return {
    base64:
      response.audio_base64 ??
      response.audioBase64 ??
      response.audio_data_base64 ??
      response.audioDataBase64 ??
      response.base64_audio ??
      response.base64Audio ??
      scalarAudioPayloadValue(response.audio_content) ??
      scalarAudioPayloadValue(response.audioContent) ??
      response.audio_content_base64 ??
      response.audioContentBase64 ??
      response.audio ??
      response.speech ??
      response.speech_base64 ??
      response.speechBase64 ??
      response.speech_content_base64 ??
      response.speechContentBase64 ??
      response.voice_audio_base64 ??
      response.voiceAudioBase64 ??
      response.voice_audio_content_base64 ??
      response.voiceAudioContentBase64 ??
      response.b64_json ??
      response.b64Json ??
      response.output_base64 ??
      response.outputBase64 ??
      response.wav_base64 ??
      response.wavBase64 ??
      response.mp3_base64 ??
      response.mp3Base64 ??
      response.ogg_base64 ??
      response.oggBase64 ??
      response.opus_base64 ??
      response.opusBase64 ??
      response.webm_base64 ??
      response.webmBase64 ??
      response.m4a_base64 ??
      response.m4aBase64 ??
      response.aac_base64 ??
      response.aacBase64 ??
      response.flac_base64 ??
      response.flacBase64 ??
      data.audio_base64 ??
      data.audioBase64 ??
      data.audio_data_base64 ??
      data.audioDataBase64 ??
      data.base64_audio ??
      data.base64Audio ??
      scalarAudioPayloadValue(data.audio_content) ??
      scalarAudioPayloadValue(data.audioContent) ??
      data.audio_content_base64 ??
      data.audioContentBase64 ??
      data.audio ??
      data.speech ??
      data.speech_base64 ??
      data.speechBase64 ??
      data.speech_content_base64 ??
      data.speechContentBase64 ??
      data.voice_audio_base64 ??
      data.voiceAudioBase64 ??
      data.voice_audio_content_base64 ??
      data.voiceAudioContentBase64 ??
      data.b64_json ??
      data.b64Json ??
      data.output_base64 ??
      data.outputBase64 ??
      data.wav_base64 ??
      data.wavBase64 ??
      data.mp3_base64 ??
      data.mp3Base64 ??
      data.ogg_base64 ??
      data.oggBase64 ??
      data.opus_base64 ??
      data.opusBase64 ??
      data.webm_base64 ??
      data.webmBase64 ??
      data.m4a_base64 ??
      data.m4aBase64 ??
      data.aac_base64 ??
      data.aacBase64 ??
      data.flac_base64 ??
      data.flacBase64 ??
      data.audio_bytes ??
      data.audioBytes ??
      data.audio_bytes_base64 ??
      data.audioBytesBase64 ??
      output.audio_base64 ??
      output.audioBase64 ??
      output.audio_data_base64 ??
      output.audioDataBase64 ??
      output.base64_audio ??
      output.base64Audio ??
      scalarAudioPayloadValue(output.audio_content) ??
      scalarAudioPayloadValue(output.audioContent) ??
      output.audio_content_base64 ??
      output.audioContentBase64 ??
      output.audio ??
      output.speech ??
      output.speech_base64 ??
      output.speechBase64 ??
      output.speech_content_base64 ??
      output.speechContentBase64 ??
      output.voice_audio_base64 ??
      output.voiceAudioBase64 ??
      output.voice_audio_content_base64 ??
      output.voiceAudioContentBase64 ??
      output.b64_json ??
      output.b64Json ??
      output.output_base64 ??
      output.outputBase64 ??
      output.wav_base64 ??
      output.wavBase64 ??
      output.mp3_base64 ??
      output.mp3Base64 ??
      output.ogg_base64 ??
      output.oggBase64 ??
      output.opus_base64 ??
      output.opusBase64 ??
      output.webm_base64 ??
      output.webmBase64 ??
      output.m4a_base64 ??
      output.m4aBase64 ??
      output.aac_base64 ??
      output.aacBase64 ??
      output.flac_base64 ??
      output.flacBase64 ??
      output.audio_bytes ??
      output.audioBytes ??
      output.audio_bytes_base64 ??
      output.audioBytesBase64 ??
      result.audio_base64 ??
      result.audioBase64 ??
      result.audio_data_base64 ??
      result.audioDataBase64 ??
      result.base64_audio ??
      result.base64Audio ??
      scalarAudioPayloadValue(result.audio_content) ??
      scalarAudioPayloadValue(result.audioContent) ??
      result.audio_content_base64 ??
      result.audioContentBase64 ??
      result.audio ??
      result.speech ??
      result.speech_base64 ??
      result.speechBase64 ??
      result.speech_content_base64 ??
      result.speechContentBase64 ??
      result.voice_audio_base64 ??
      result.voiceAudioBase64 ??
      result.voice_audio_content_base64 ??
      result.voiceAudioContentBase64 ??
      result.b64_json ??
      result.b64Json ??
      result.output_base64 ??
      result.outputBase64 ??
      result.wav_base64 ??
      result.wavBase64 ??
      result.mp3_base64 ??
      result.mp3Base64 ??
      result.ogg_base64 ??
      result.oggBase64 ??
      result.opus_base64 ??
      result.opusBase64 ??
      result.webm_base64 ??
      result.webmBase64 ??
      result.m4a_base64 ??
      result.m4aBase64 ??
      result.aac_base64 ??
      result.aacBase64 ??
      result.flac_base64 ??
      result.flacBase64 ??
      result.audio_bytes ??
      result.audioBytes ??
      result.audio_bytes_base64 ??
      result.audioBytesBase64 ??
      response.audio_bytes ??
      response.audioBytes ??
      response.audio_bytes_base64 ??
      response.audioBytesBase64 ??
      nestedAudio.base64 ??
      nestedAudio.base64_audio ??
      nestedAudio.base64Audio ??
      nestedAudio.audio_base64 ??
      nestedAudio.audioBase64 ??
      nestedAudio.audio_data_base64 ??
      nestedAudio.audioDataBase64 ??
      nestedAudio.audio_content_base64 ??
      nestedAudio.audioContentBase64 ??
      nestedAudio.speech_content_base64 ??
      nestedAudio.speechContentBase64 ??
      nestedAudio.voice_audio_base64 ??
      nestedAudio.voiceAudioBase64 ??
      nestedAudio.voice_audio_content_base64 ??
      nestedAudio.voiceAudioContentBase64 ??
      nestedAudio.bytes ??
      nestedAudio.audio_bytes ??
      nestedAudio.audioBytes ??
      nestedAudio.buffer ??
      nestedAudio.content_base64 ??
      nestedAudio.contentBase64 ??
      nestedAudio.b64_json ??
      nestedAudio.b64Json ??
      nestedAudio.output_base64 ??
      nestedAudio.outputBase64 ??
      nestedAudio.wav_base64 ??
      nestedAudio.wavBase64 ??
      nestedAudio.mp3_base64 ??
      nestedAudio.mp3Base64 ??
      nestedAudio.ogg_base64 ??
      nestedAudio.oggBase64 ??
      nestedAudio.opus_base64 ??
      nestedAudio.opusBase64 ??
      nestedAudio.webm_base64 ??
      nestedAudio.webmBase64 ??
      nestedAudio.m4a_base64 ??
      nestedAudio.m4aBase64 ??
      nestedAudio.aac_base64 ??
      nestedAudio.aacBase64 ??
      nestedAudio.flac_base64 ??
      nestedAudio.flacBase64 ??
      nestedAudio.content ??
      nestedAudio.data ??
      firstAudioPayloadValue(nestedAudioPayloads, [
        "base64",
        "base64_audio",
        "base64Audio",
        "audio_base64",
        "audioBase64",
        "audio_data_base64",
        "audioDataBase64",
        "audio_content_base64",
        "audioContentBase64",
        "speech_base64",
        "speechBase64",
        "speech_content_base64",
        "speechContentBase64",
        "voice_audio_base64",
        "voiceAudioBase64",
        "voice_audio_content_base64",
        "voiceAudioContentBase64",
        "b64_json",
        "b64Json",
        "bytes",
        "audio_bytes",
        "audioBytes",
        "buffer",
        "content_base64",
        "contentBase64",
        "b64_json",
        "b64Json",
        "output_base64",
        "outputBase64",
        "wav_base64",
        "wavBase64",
        "mp3_base64",
        "mp3Base64",
        "ogg_base64",
        "oggBase64",
        "opus_base64",
        "opusBase64",
        "webm_base64",
        "webmBase64",
        "m4a_base64",
        "m4aBase64",
        "aac_base64",
        "aacBase64",
        "flac_base64",
        "flacBase64",
        "content",
        "data",
      ]) ??
      "",
    mime:
      response.audio_mime ??
      response.speech_mime ??
      response.speechMime ??
      response.voice_audio_mime ??
      response.voiceAudioMime ??
      response.mime ??
      response.mimeType ??
      response.mime_type ??
      response.content_type ??
      response.contentType ??
      data.audio_mime ??
      data.speech_mime ??
      data.speechMime ??
      data.voice_audio_mime ??
      data.voiceAudioMime ??
      data.mime ??
      data.mimeType ??
      data.mime_type ??
      data.content_type ??
      data.contentType ??
      output.audio_mime ??
      output.speech_mime ??
      output.speechMime ??
      output.voice_audio_mime ??
      output.voiceAudioMime ??
      output.mime ??
      output.mimeType ??
      output.mime_type ??
      output.content_type ??
      output.contentType ??
      result.audio_mime ??
      result.speech_mime ??
      result.speechMime ??
      result.voice_audio_mime ??
      result.voiceAudioMime ??
      result.mime ??
      result.mimeType ??
      result.mime_type ??
      result.content_type ??
      result.contentType ??
      nestedAudio.audio_mime ??
      nestedAudio.speech_mime ??
      nestedAudio.speechMime ??
      nestedAudio.voice_audio_mime ??
      nestedAudio.voiceAudioMime ??
      nestedAudio.mimeType ??
      nestedAudio.mime_type ??
      nestedAudio.mime ??
      nestedAudio.content_type ??
      nestedAudio.contentType ??
      firstAudioPayloadValue(nestedAudioPayloads, [
        "audio_mime",
        "speech_mime",
        "speechMime",
        "voice_audio_mime",
        "voiceAudioMime",
        "mimeType",
        "mime_type",
        "mime",
        "content_type",
        "contentType",
      ]) ??
      inferAudioMimeFromInlinePayloads([
        response,
        data,
        output,
        result,
        nestedAudio,
        ...nestedAudioPayloads,
      ]) ??
      null,
  };
}

function inferAudioMimeFromInlinePayloads(objects) {
  const hasBase64 = (...values) =>
    values.some((value) => (typeof value === "string" ? value.trim() !== "" : value != null));
  for (const object of objects) {
    if (!object || typeof object !== "object") continue;
    if (hasBase64(object.mp3_base64, object.mp3Base64)) return "audio/mpeg";
    if (hasBase64(object.ogg_base64, object.oggBase64)) return "audio/ogg";
    if (hasBase64(object.opus_base64, object.opusBase64)) return "audio/opus";
    if (hasBase64(object.webm_base64, object.webmBase64)) return "audio/webm";
    if (hasBase64(object.m4a_base64, object.m4aBase64)) return "audio/mp4";
    if (hasBase64(object.aac_base64, object.aacBase64)) return "audio/aac";
    if (hasBase64(object.flac_base64, object.flacBase64)) return "audio/flac";
    if (hasBase64(object.wav_base64, object.wavBase64)) return "audio/wav";
    if (hasBase64(object.b64_json, object.b64Json)) return "audio/wav";
  }
  return null;
}

function firstAudioPayloadValue(objects, keys) {
  for (const object of objects) {
    for (const key of keys) {
      const value = object?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return null;
}

function scalarAudioPayloadValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? null : value;
}

function resolveLive2dCue(response, context) {
  const normalizedResponse = normalizeLive2dCueArrayPayload(response);
  if (normalizedResponse !== response) return normalizeLive2dEngineCue(normalizedResponse);
  const data = responseDataObject(response);
  const output = responseOutputObject(response);
  const result = responseDataObject(response.result);
  const cueSources = collectLive2dCuePayloadSources(response, data, output, result);
  const cueDataUrl = firstLive2dCueDataUrl(...cueSources);
  if (cueDataUrl) {
    return normalizeLive2dEngineCue(
      parseJsonDataUrl(cueDataUrl, `${context}: cue data URL`)
    );
  }
  const cueBase64 = firstLive2dCueJsonBase64(...cueSources);
  if (cueBase64) {
    return normalizeLive2dEngineCue(
      JSON.parse(Buffer.from(cueBase64, "base64").toString("utf8"))
    );
  }
  const cueObject = firstLive2dCueObject(cueSources);
  if (cueObject) {
    if (!safeText(cueObject.schema, 120)) {
      throw new ContractError(`${context}: cue schema is required`);
    }
    return normalizeLive2dEngineCue(cueObject);
  }
  const cue =
    response.cue ??
    response.cue_json ??
    response.cueJson ??
    response.cueURL ??
    response.live2d_cue ??
    response.live2dCue ??
    response.live2d_engine_cue ??
    response.live2dEngineCue ??
    response.live2d_cue_json ??
    response.live2dCueJson ??
    response.live2d_engine_cue_json ??
    response.live2dEngineCueJson ??
    response.live2dCueURL ??
    response.renderer_cue ??
    response.rendererCue ??
    response.renderer_cue_json ??
    response.rendererCueJson ??
    response.rendererCueURL ??
    response.motion_cue ??
    response.motionCue ??
    response.motionURL ??
    response.animation_cue ??
    response.animationCue ??
    response.animationCueURL ??
    response.animation ??
    response.animationURL ??
    response.expressionURL ??
    response.artifact ??
    response.artifactURL ??
    data.cue ??
    data.cue_json ??
    data.cueJson ??
    data.cueURL ??
    data.live2d_cue ??
    data.live2dCue ??
    data.live2d_engine_cue ??
    data.live2dEngineCue ??
    data.live2d_cue_json ??
    data.live2dCueJson ??
    data.live2d_engine_cue_json ??
    data.live2dEngineCueJson ??
    data.live2dCueURL ??
    data.renderer_cue ??
    data.rendererCue ??
    data.renderer_cue_json ??
    data.rendererCueJson ??
    data.rendererCueURL ??
    data.motion_cue ??
    data.motionCue ??
    data.motionURL ??
    data.animation_cue ??
    data.animationCue ??
    data.animationCueURL ??
    data.animation ??
    data.animationURL ??
    data.expressionURL ??
    data.artifact ??
    data.artifactURL ??
    output.cue ??
    output.cue_json ??
    output.cueJson ??
    output.cueURL ??
    output.live2d_cue ??
    output.live2dCue ??
    output.live2d_engine_cue ??
    output.live2dEngineCue ??
    output.live2d_cue_json ??
    output.live2dCueJson ??
    output.live2d_engine_cue_json ??
    output.live2dEngineCueJson ??
    output.live2dCueURL ??
    output.renderer_cue ??
    output.rendererCue ??
    output.renderer_cue_json ??
    output.rendererCueJson ??
    output.rendererCueURL ??
    output.motion_cue ??
    output.motionCue ??
    output.motionURL ??
    output.animation_cue ??
    output.animationCue ??
    output.animationCueURL ??
    output.animation ??
    output.animationURL ??
    output.expressionURL ??
    output.artifact ??
    output.artifactURL ??
    result.cue ??
    result.cue_json ??
    result.cueJson ??
    result.cueURL ??
    result.live2d_cue ??
    result.live2dCue ??
    result.live2d_engine_cue ??
    result.live2dEngineCue ??
    result.live2d_cue_json ??
    result.live2dCueJson ??
    result.live2d_engine_cue_json ??
    result.live2dEngineCueJson ??
    result.live2dCueURL ??
    result.renderer_cue ??
    result.rendererCue ??
    result.renderer_cue_json ??
    result.rendererCueJson ??
    result.rendererCueURL ??
    result.motion_cue ??
    result.motionCue ??
    result.motionURL ??
    result.animation_cue ??
    result.animationCue ??
    result.animationCueURL ??
    result.animation ??
    result.animationURL ??
    result.expressionURL ??
    result.artifact ??
    result.artifactURL ??
    null;
  if (!cue && hasInlineLive2dCueFields(response)) {
    assertNoForbiddenEnginePublicFields(response, context);
    return normalizeLive2dEngineCue(response);
  }
  if (!cue && hasInlineLive2dCueFields(data)) {
    assertNoForbiddenEnginePublicFields(data, context);
    return normalizeLive2dEngineCue(data);
  }
  if (!cue && hasInlineLive2dCueFields(output)) {
    assertNoForbiddenEnginePublicFields(output, context);
    return normalizeLive2dEngineCue(output);
  }
  if (!cue && hasInlineLive2dCueFields(result)) {
    assertNoForbiddenEnginePublicFields(result, context);
    return normalizeLive2dEngineCue(result);
  }
  const normalizedCue = normalizeLive2dCueArrayPayload(cue);
  if (normalizedCue !== cue) return normalizeLive2dEngineCue(normalizedCue);
  if (!cue || typeof cue !== "object" || Array.isArray(cue)) {
    throw new ContractError(`${context}: cue object is required`);
  }
  if (!safeText(cue.schema, 120)) {
    throw new ContractError(`${context}: cue schema is required`);
  }
  assertNoForbiddenEnginePublicFields(cue, context);
  return normalizeLive2dEngineCue(cue);
}

function normalizeLive2dCueArrayPayload(payload) {
  if (!Array.isArray(payload)) return payload;
  return {
    schema: "iris_live2d_renderer_cue_v1",
    motions: payload
      .map((item) => (typeof item === "string" ? { motion_key: safeText(item, 80) } : item))
      .filter((item) => item && typeof item === "object" && !Array.isArray(item)),
  };
}

function firstLive2dCueDataUrl(...sources) {
  const fields = [
    "cue_data_url",
    "cueDataUrl",
    "cueDataURL",
    "cue_json_data_url",
    "cueJsonDataUrl",
    "cueJSONDataURL",
    "live2d_cue_data_url",
    "live2dCueDataUrl",
    "live2dCueDataURL",
    "live2d_engine_cue_data_url",
    "live2dEngineCueDataUrl",
    "live2dEngineCueDataURL",
    "live2d_cue_json_data_url",
    "live2dCueJsonDataUrl",
    "live2dCueJSONDataURL",
    "live2d_engine_cue_json_data_url",
    "live2dEngineCueJsonDataUrl",
    "live2dEngineCueJSONDataURL",
    "renderer_cue_data_url",
    "rendererCueDataUrl",
    "rendererCueDataURL",
    "renderer_cue_json_data_url",
    "rendererCueJsonDataUrl",
    "rendererCueJSONDataURL",
    "animation_cue_data_url",
    "animationCueDataUrl",
    "animationCueDataURL",
    "motion_cue_data_url",
    "motionCueDataUrl",
    "motionCueDataURL",
    "json_data_url",
    "jsonDataUrl",
    "jsonDataURL",
  ];
  for (const source of sources) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    for (const field of fields) {
      const value = source[field];
      if (typeof value === "string" && value.trim().startsWith("data:")) return value;
    }
  }
  return "";
}

function collectLive2dCuePayloadSources(...sources) {
  const collected = [];
  for (const source of sources) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    collected.push(source);
    for (const field of [
      "cue_data",
      "cueData",
      "renderer_cue_data",
      "rendererCueData",
      "live2d_cue_data",
      "live2dCueData",
      "motion_cue_data",
      "motionCueData",
      "animation_cue_data",
      "animationCueData",
    ]) {
      const value = source[field];
      if (value && typeof value === "object" && !Array.isArray(value)) collected.push(value);
    }
  }
  return collected;
}

function firstLive2dCueObject(sources) {
  for (const source of sources) {
    for (const field of [
      "cue",
      "cue_json",
      "cueJson",
      "renderer_cue",
      "rendererCue",
      "renderer_cue_json",
      "rendererCueJson",
      "live2d_cue",
      "live2dCue",
      "live2d_cue_json",
      "live2dCueJson",
      "motion_cue",
      "motionCue",
      "motion_cue_json",
      "motionCueJson",
      "animation_cue",
      "animationCue",
      "animation_cue_json",
      "animationCueJson",
    ]) {
      const value = source?.[field];
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    }
  }
  return null;
}

function firstLive2dCueJsonBase64(...sources) {
  const fields = [
    "cue_json_base64",
    "cueJsonBase64",
    "live2d_cue_json_base64",
    "live2dCueJsonBase64",
    "live2d_engine_cue_json_base64",
    "live2dEngineCueJsonBase64",
    "renderer_cue_json_base64",
    "rendererCueJsonBase64",
    "animation_cue_json_base64",
    "animationCueJsonBase64",
    "motion_cue_json_base64",
    "motionCueJsonBase64",
    "json_base64",
    "jsonBase64",
  ];
  for (const source of sources) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    for (const field of fields) {
      const value = source[field];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return "";
}

function normalizeSubtitleCueArrayPayload(payload) {
  if (!Array.isArray(payload)) return payload;
  return {
    schema: "iris_subtitle_engine_cues_v1",
    cues: payload.filter((item) => typeof item === "string" || (item && typeof item === "object" && !Array.isArray(item))),
  };
}

function responseDataObject(response) {
  if (response?.data && typeof response.data === "object" && !Array.isArray(response.data)) {
    return response.data;
  }
  if (Array.isArray(response?.data)) {
    return response.data.find((item) => item && typeof item === "object" && !Array.isArray(item)) ?? {};
  }
  return {};
}

function responseOutputObject(response) {
  for (const value of [
    response?.response,
    response?.output,
    response?.result,
    response?.data?.response,
    response?.data?.output,
    response?.data?.result,
  ]) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (Array.isArray(value)) {
      const firstObject = value.find((item) => item && typeof item === "object" && !Array.isArray(item));
      if (firstObject) return firstObject;
    }
  }
  return {};
}

function responsePayloadObject(response) {
  if (response && typeof response === "object" && !Array.isArray(response)) {
    const data = responseDataObject(response);
    return { ...data, ...response };
  }
  return responseDataObject(response);
}

function ttsAudioPayloadObject(source, kind = "audio") {
  if (!source || typeof source !== "object") return {};
  if (kind === "speech") {
    return responsePayloadObject(
      source.speech ?? source.speech_url ?? source.speechUrl ?? source.speechURL
    );
  }
  if (kind === "voice") {
    return responsePayloadObject(
      source.voice_audio ??
        source.voiceAudio ??
        source.voice_audio_url ??
        source.voiceAudioUrl ??
        source.voiceAudioURL
    );
  }
  return responsePayloadObject(
    source.audio ??
      source.audio_url ??
      source.audioUrl ??
      source.audioURL ??
      source.artifact ??
      source.artifact_url ??
      source.artifactUrl ??
      source.artifactURL ??
      source.file ??
      source.file_url ??
      source.fileUrl ??
      source.fileURL
  );
}

function hasInlineLive2dCueFields(response) {
  if (!response || typeof response !== "object" || Array.isArray(response)) return false;
  return [
    response.cue_json,
    response.cueJson,
    response.live2d_cue_json,
    response.live2dCueJson,
    response.live2d_engine_cue_json,
    response.live2dEngineCueJson,
    response.renderer_cue_json,
    response.rendererCueJson,
    response.motion_style,
    response.motionStyle,
    response.motion_key,
    response.motionKey,
    response.motion_id,
    response.motionId,
    response.motion_name,
    response.motionName,
    response.motion,
    response.motions,
    response.pose,
    response.state_key,
    response.stateKey,
    response.state,
    response.expression_profile_id,
    response.expressionProfileId,
    response.expression_id,
    response.expressionId,
    response.expression_key,
    response.expressionKey,
    response.expression_name,
    response.expressionName,
    response.emotion,
    response.expression,
    response.expressions,
    response.facial_expression,
    response.facialExpression,
    response.camera_proximity_profile,
    response.cameraProximityProfile,
    response.camera,
  ].some((value) => value != null && value !== "");
}

function normalizeLive2dEngineCue(cue) {
  const schema = safeText(cue.schema, 120);
  if (schema === "iris_live2d_renderer_cue_v1") return cue;
  if (
    schema &&
    schema !== "iris_live2d_fixture_cue_v1"
  ) {
    return cue;
  }
  const motion = isPlainObject(cue.motion) ? cue.motion : {};
  const expression = isPlainObject(cue.expression) ? cue.expression : {};
  const firstMotion = firstPlainObject(cue.motions);
  const firstExpression = firstPlainObject(cue.expressions);
  const camera = isPlainObject(cue.camera) ? cue.camera : {};
  const timing = isPlainObject(cue.timing) ? cue.timing : {};
  const motionText = typeof cue.motion === "string" ? cue.motion : "";
  const animation = isPlainObject(cue.animation) ? cue.animation : {};
  const animationMotionText = typeof animation.motion === "string" ? animation.motion : "";
  const animationMotionObject = isPlainObject(animation.motion) ? animation.motion : {};
  const animationPoseText = typeof animation.pose === "string" ? animation.pose : "";
  const animationStateText = typeof animation.state === "string" ? animation.state : "";
  const animationExpressionObject = isPlainObject(animation.expression) ? animation.expression : {};
  const animationExpressionText =
    typeof animation.expression === "string" ? animation.expression : "";
  const poseText = typeof cue.pose === "string" ? cue.pose : "";
  const stateText = typeof cue.state === "string" ? cue.state : "";
  const expressionText = typeof cue.expression === "string" ? cue.expression : "";
  const cameraText = typeof cue.camera === "string" ? cue.camera : "";
  return {
    schema: "iris_live2d_renderer_cue_v1",
    motion: {
      style: safeText(
        motion.style ||
          motion.name ||
          motion.id ||
          motion.motion_id ||
          motion.motionId ||
          motion.motion_key ||
          motion.motionKey ||
          motion.motion_name ||
          motion.motionName ||
          motion.state_key ||
          motion.stateKey ||
          firstMotion?.style ||
          firstMotion?.name ||
          firstMotion?.id ||
          firstMotion?.motion_id ||
          firstMotion?.motionId ||
          firstMotion?.motion_key ||
          firstMotion?.motionKey ||
          firstMotion?.motion_name ||
          firstMotion?.motionName ||
          firstMotion?.state_key ||
          firstMotion?.stateKey ||
          motionText ||
          animationMotionObject.style ||
          animationMotionObject.name ||
          animationMotionObject.id ||
          animationMotionObject.motion_id ||
          animationMotionObject.motionId ||
          animationMotionObject.motion_key ||
          animationMotionObject.motionKey ||
          animationMotionObject.motion_name ||
          animationMotionObject.motionName ||
          animationMotionObject.state_key ||
          animationMotionObject.stateKey ||
          animationMotionText ||
          animation.motion_id ||
          animation.motionId ||
          animation.motion_key ||
          animation.motionKey ||
          animation.motion_name ||
          animation.motionName ||
          animation.state_key ||
          animation.stateKey ||
          animationPoseText ||
          animationStateText ||
          poseText ||
          stateText ||
          cue.motion_style ||
          cue.motionStyle ||
          cue.motion_key ||
          cue.motionKey ||
          cue.motion_id ||
          cue.motionId ||
          cue.motion_name ||
          cue.motionName ||
          cue.state_key ||
          cue.stateKey ||
          "idle_breath",
        80
      ),
      intensity: safeOptionalNumber(
        motion.intensity ??
          firstMotion?.intensity ??
          firstMotion?.weight ??
          cue.motion_intensity ??
          cue.motionIntensity
      ) ?? 0,
      body_state_id: safeText(
        motion.body_state_id ||
          motion.bodyStateId ||
          firstMotion?.body_state_id ||
          firstMotion?.bodyStateId ||
          cue.body_state_id ||
          cue.bodyStateId,
        120
      ),
    },
    expression: {
      profile_id: safeText(
        expression.profile_id ||
          expression.profileId ||
          expression.id ||
          expression.expression_id ||
          expression.expressionId ||
          expression.expression_key ||
          expression.expressionKey ||
          expression.name ||
          expression.expression_name ||
          expression.expressionName ||
          expression.state_key ||
          expression.stateKey ||
          firstExpression?.profile_id ||
          firstExpression?.profileId ||
          firstExpression?.id ||
          firstExpression?.expression_id ||
          firstExpression?.expressionId ||
          firstExpression?.expression_key ||
          firstExpression?.expressionKey ||
          firstExpression?.name ||
          firstExpression?.expression_name ||
          firstExpression?.expressionName ||
          firstExpression?.state_key ||
          firstExpression?.stateKey ||
          expressionText ||
          animationExpressionObject.profile_id ||
          animationExpressionObject.profileId ||
          animationExpressionObject.id ||
          animationExpressionObject.expression_id ||
          animationExpressionObject.expressionId ||
          animationExpressionObject.expression_key ||
          animationExpressionObject.expressionKey ||
          animationExpressionObject.name ||
          animationExpressionObject.expression_name ||
          animationExpressionObject.expressionName ||
          animationExpressionObject.state_key ||
          animationExpressionObject.stateKey ||
          animationExpressionText ||
          animation.expression_profile_id ||
          animation.expressionProfileId ||
          animation.expression_id ||
          animation.expressionId ||
          animation.expression_key ||
          animation.expressionKey ||
          animation.expression_name ||
          animation.expressionName ||
          animation.state_expression_key ||
          animation.stateExpressionKey ||
          animation.emotion ||
          cue.expression_profile_id ||
          cue.expressionProfileId ||
          cue.expression_id ||
          cue.expressionId ||
          cue.expression_key ||
          cue.expressionKey ||
          cue.expression_name ||
          cue.expressionName ||
          cue.state_expression_key ||
          cue.stateExpressionKey ||
          cue.facial_expression ||
          cue.facialExpression ||
          cue.emotion ||
          "neutral",
        120
      ),
      autonomous_state_id: safeText(
        expression.autonomous_state_id ||
          expression.autonomousStateId ||
          cue.autonomous_state_id ||
          cue.autonomousStateId ||
          "none",
        120
      ),
    },
    camera: {
      proximity_profile: safeText(
        camera.proximity_profile ||
          camera.proximityProfile ||
          cameraText ||
          cue.camera_proximity_profile ||
          cue.cameraProximityProfile ||
          "medium",
        80
      ),
    },
    timing: {
      total_duration_ms:
        resolveEngineDurationMs(
          timing.total_duration_ms ??
            timing.totalDurationMs ??
            timing.duration_ms ??
          timing.durationMs ??
          cue.duration_ms ??
          cue.durationMs,
          timing.duration_seconds ??
            timing.durationSeconds ??
            timing.duration ??
            cue.duration_seconds ??
            cue.durationSeconds ??
            cue.duration
        ) ??
        1000,
      hold_ms: resolveEngineDurationMs(
        timing.hold_ms ?? timing.holdMs,
        timing.hold_seconds ?? timing.holdSeconds
      ),
      transition_ms: resolveEngineDurationMs(
        timing.transition_ms ?? timing.transitionMs,
        timing.transition_seconds ?? timing.transitionSeconds
      ),
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
    ...(schema === "iris_live2d_fixture_cue_v1"
      ? {
          applied_motion: safeText(
            cue.applied_motion ?? cue.appliedMotion ?? cue.motion_style ?? cue.motionStyle,
            80
          ),
          expression_profile_id: safeText(
            cue.expression_profile_id ?? cue.expressionProfileId,
            120
          ),
        }
      : {}),
  };
}

function validateLive2dEngineCue(cue, context) {
  const schema = safeText(cue?.schema, 120);
  if (!schema) {
    throw new ContractError(`${context}: cue schema is required`);
  }
  if (!LIVE2D_ENGINE_CUE_SCHEMAS.has(schema)) {
    throw new ContractError(`${context}: unsupported cue schema`);
  }
  if (schema === "iris_live2d_renderer_cue_v1") {
    if (!isPlainObject(cue.motion)) {
      throw new ContractError(`${context}: cue motion object is required`);
    }
    if (!isPlainObject(cue.timing)) {
      throw new ContractError(`${context}: cue timing object is required`);
    }
    assertLive2dCueBoundaryPolicySafe(cue.boundary_policy, `${context}: cue boundary policy`);
    if (cue.adapter_validation_required !== true) {
      throw new ContractError(`${context}: cue adapter validation flag is required`);
    }
  }
}

function assertLive2dCueBoundaryPolicySafe(policy, context) {
  if (!isPlainObject(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const requiredFields = [
    "renderer_cue_only",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ];
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary flag ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function parseAudioDataUrl(value, context) {
  const match = String(value ?? "").match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match || !match[1].startsWith("audio/")) {
    throw new ContractError(`${context}: audio data URL must be audio/* base64`);
  }
  return {
    mime: safeText(match[1], 80),
    base64: match[2],
  };
}

function parseSubtitleTextDataUrl(value, context) {
  const match = String(value ?? "").match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!match) {
    throw new ContractError(`${context}: subtitle data URL is required`);
  }
  const mime = safeText(match[1].toLowerCase(), 80);
  if (
    !mime.startsWith("text/") &&
    !["application/x-subrip", "application/srt", "application/webvtt"].includes(mime)
  ) {
    throw new ContractError(`${context}: subtitle data URL must be text/* or subtitle MIME`);
  }
  const payload = match[3];
  const text = match[2]
    ? Buffer.from(payload, "base64").toString("utf8")
    : decodeURIComponent(payload);
  return { mime, text };
}

function parseJsonDataUrl(value, context) {
  const match = String(value ?? "").match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!match) {
    throw new ContractError(`${context}: JSON data URL is required`);
  }
  const mime = safeText(match[1].toLowerCase(), 80);
  if (!["application/json", "text/json"].includes(mime) && !mime.endsWith("+json")) {
    throw new ContractError(`${context}: JSON data URL must be application/json`);
  }
  const payload = match[3];
  const text = match[2]
    ? Buffer.from(payload, "base64").toString("utf8")
    : decodeURIComponent(payload);
  try {
    return JSON.parse(text);
  } catch {
    throw new ContractError(`${context}: invalid JSON data URL payload`);
  }
}

function firstAudioDataUrl(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.startsWith("data:")) return value;
  }
  return "";
}

function audioExtensionFromMime(mime) {
  const text = safeText(mime, 120).toLowerCase();
  if (text.includes("wav") || text.includes("wave")) return "wav";
  if (text.includes("mpeg") || text.includes("mp3")) return "mp3";
  if (text.includes("mp4") || text.includes("m4a")) return "m4a";
  if (text.includes("aac")) return "aac";
  if (text.includes("flac")) return "flac";
  if (text.includes("opus")) return "opus";
  if (text.includes("ogg")) return "ogg";
  if (text.includes("webm")) return "webm";
  return "bin";
}

function safeVisemeList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 80)
    .map((item) => {
      const atMs = resolveVisemeAtMs(item);
      if (atMs === null) return null;
      const shapeSource =
        item?.shape ??
        item?.mouth_shape ??
        item?.mouthShape ??
        item?.viseme ??
        item?.viseme_id ??
        item?.visemeId ??
        item?.phoneme ??
        item?.value ??
        item?.kind;
      if (shapeSource === undefined || shapeSource === null || shapeSource === "") {
        return null;
      }
      return {
        at_ms: atMs,
        shape: safeEnginePublicText(shapeSource, {
          maxLength: 32,
          fallback: "neutral",
        }),
      };
    })
    .filter(Boolean);
}

function resolveVisemeAtMs(item) {
  const ms = safeOptionalNumber(
    item?.at_ms ??
      item?.atMs ??
      item?.time_ms ??
      item?.timeMs ??
      item?.start_ms ??
      item?.startMs ??
      item?.offset_ms ??
      item?.offsetMs
  );
  if (ms !== null) return ms;
  const seconds = safeOptionalNumber(
    item?.at_seconds ??
      item?.atSeconds ??
      item?.time_seconds ??
      item?.timeSeconds ??
      item?.start_seconds ??
      item?.startSeconds ??
      item?.time ??
      item?.start ??
      item?.offset
  );
  return seconds !== null ? Math.trunc(seconds * 1000) : null;
}

function sanitizeEngineObject(value, depth = 0) {
  assertNoForbiddenEnginePublicFields(value, "local engine artifact");
  if (depth > 5) return null;
  if (Array.isArray(value)) {
    return value.slice(0, 80).map((item) => sanitizeEngineObject(item, depth + 1));
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string") {
      return safeEnginePublicText(value, { maxLength: 400, fallback: "[redacted]" });
    }
    if (typeof value === "number") return safeOptionalNumber(value);
    if (typeof value === "boolean" || value === null) return value;
    return null;
  }
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 80)
      .map(([key, child]) => [
        safeEnginePublicText(key, { maxLength: 80, fallback: "redacted_field" }),
        sanitizeEngineObject(child, depth + 1),
      ])
  );
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function firstPlainObject(value) {
  if (isPlainObject(value)) return value;
  if (!Array.isArray(value)) return null;
  return value.find((item) => isPlainObject(item)) ?? null;
}

function summarizeReceipts(receipts) {
  return Object.fromEntries(
    ENGINE_KINDS.map((kind) => [
      kind,
      {
        attempted_count: receipts.filter(
          (receipt) => receipt.adapter_kind === kind && isEngineAttemptReceipt(receipt)
        ).length,
        processed_count: receipts.filter(
          (receipt) => receipt.adapter_kind === kind && receipt.engine_status === "rendered"
        ).length,
        failed_count: receipts.filter(
          (receipt) => receipt.adapter_kind === kind && receipt.engine_status === "attention"
        ).length,
        skipped_count: receipts.filter(
          (receipt) => receipt.adapter_kind === kind && isRetrySkippedReceipt(receipt)
        ).length,
        expired_count: receipts.filter(
          (receipt) => receipt.adapter_kind === kind && isExpiredJobReceipt(receipt)
        ).length,
      },
    ])
  );
}

function summarizeProcessReports(reports) {
  return Object.fromEntries(
    ENGINE_KINDS.map((kind) => [
      kind,
      {
        attempted_count: sumRequiredAdapterReportCounts(
          reports,
          kind,
          "attempted_count"
        ),
        processed_count: sumRequiredAdapterReportCounts(
          reports,
          kind,
          "processed_count"
        ),
        failed_count: sumRequiredAdapterReportCounts(reports, kind, "failed_count"),
        skipped_count: sumRequiredAdapterReportCounts(
          reports,
          kind,
          "skipped_count"
        ),
        expired_count: sumRequiredAdapterReportCounts(
          reports,
          kind,
          "expired_count"
        ),
      },
    ])
  );
}

function sumRequiredReportCounts(reports, field) {
  return reports.reduce(
    (sum, report) => sum + requiredGeneratedReportCount(report, field),
    0
  );
}

function sumRequiredAdapterReportCounts(reports, kind, field) {
  return reports.reduce(
    (sum, report) =>
      sum + requiredGeneratedReportCount(report.by_adapter?.[kind], field),
    0
  );
}

function requiredGeneratedReportCount(source, field) {
  const value = source?.[field];
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(`local bridge generated report ${field} is required`);
  }
  return value;
}

function isEngineAttemptReceipt(receipt) {
  return !isRetrySkippedReceipt(receipt) && !isExpiredJobReceipt(receipt);
}

function isRetrySkippedReceipt(receipt) {
  return receipt?.engine_status === "retry_waiting" || receipt?.engine_status === "retry_blocked";
}

function isExpiredJobReceipt(receipt) {
  return receipt?.engine_status === "expired";
}

function summarizeOutboxQueue({
  outboxDir,
  processed,
  failureLedger,
  expired,
  retryPolicy,
  jobFreshnessPolicy,
  nowMs,
}) {
  const adapters = Object.fromEntries(
    ENGINE_KINDS.map((kind) => {
      const jobFile = readJobFile(join(outboxDir, kind, "jobs.jsonl"));
      const jobs = jobFile.jobs;
      const jobCount = jobs.length;
      const pendingJobs = jobs.filter((job) => !processed.has(job.job_id));
      const freshnessStates = pendingJobs.map((job) =>
        classifyJobFreshness(job, { nowMs, jobFreshnessPolicy })
      );
      const activePendingJobs = pendingJobs.filter(
        (_job, index) => freshnessStates[index]?.job_freshness_status !== "expired"
      );
      const retryStates = activePendingJobs.map((job) =>
        classifyJobRetryState(job, failureLedger, { nowMs, retryPolicy })
      );
      const pendingCount = pendingJobs.length;
      const expiredCount = jobs.filter((job) => expired.has(job.job_id)).length;
      const expiredPendingCount = freshnessStates.filter(
        (state) => state.job_freshness_status === "expired"
      ).length;
      return [
        kind,
        {
          adapter_kind: kind,
          job_count: jobCount,
          processed_count: Math.max(0, jobCount - pendingCount - expiredCount),
          expired_count: expiredCount,
          pending_count: pendingCount,
          expired_pending_count: expiredPendingCount,
          retry_ready_count: retryStates.filter((state) => state.retry_status === "ready").length,
          retry_waiting_count: retryStates.filter((state) => state.retry_status === "waiting").length,
          retry_blocked_count: retryStates.filter((state) => state.retry_status === "blocked").length,
          invalid_json_line_count: jobFile.invalid_json_line_count,
        },
      ];
    })
  );
  return {
    schema: "iris_local_bridge_engine_outbox_queue_status_v1",
    total_job_count: Object.values(adapters).reduce((sum, item) => sum + item.job_count, 0),
    total_pending_count: Object.values(adapters).reduce(
      (sum, item) => sum + item.pending_count,
      0
    ),
    total_expired_count: Object.values(adapters).reduce(
      (sum, item) => sum + item.expired_count,
      0
    ),
    total_expired_pending_count: Object.values(adapters).reduce(
      (sum, item) => sum + item.expired_pending_count,
      0
    ),
    total_retry_ready_count: Object.values(adapters).reduce(
      (sum, item) => sum + item.retry_ready_count,
      0
    ),
    total_retry_waiting_count: Object.values(adapters).reduce(
      (sum, item) => sum + item.retry_waiting_count,
      0
    ),
    total_retry_blocked_count: Object.values(adapters).reduce(
      (sum, item) => sum + item.retry_blocked_count,
      0
    ),
    total_invalid_json_line_count: Object.values(adapters).reduce(
      (sum, item) => sum + item.invalid_json_line_count,
      0
    ),
    retry_policy: retryPolicy,
    job_freshness_policy: jobFreshnessPolicy,
    adapters,
    boundary_policy: {
      counts_only: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function persistReceipt(receipt, { artifactDir }) {
  if (receipt.engine_status === "rendered") {
    assertLocalRenderArtifactFileForPickup({
      adapterKind: receipt.adapter_kind,
      artifactKind: receipt.artifact_kind,
      artifactPath: join(artifactDir, receipt.artifact_path),
      contentType:
        receipt.adapter_kind === "tts" ? ttsContentTypeFromArtifactKind(receipt.artifact_kind) : "",
      context: "local bridge rendered receipt",
    });
  }
  const kindDir = join(artifactDir, receipt.adapter_kind);
  mkdirSync(kindDir, { recursive: true });
  appendFileSync(join(kindDir, "receipts.jsonl"), `${JSON.stringify(receipt)}\n`, "utf8");
  writeJsonAtomic(join(kindDir, "latest_receipt.json"), receipt);
}

function persistEventRenderManifestsForReceipts(receipts, { artifactDir, nowMs }) {
  const renderedEventIds = [
    ...new Set(
      receipts
        .filter((receipt) => receipt.engine_status === "rendered")
        .map((receipt) => safeText(receipt.event_id, 160))
        .filter(Boolean)
    ),
  ];
  if (renderedEventIds.length === 0) return [];
  mkdirSync(artifactDir, { recursive: true });
  const existing = readEventRenderManifestFile(artifactDir);
  const existingEventIds = new Set(existing.manifests.map((manifest) => manifest.event_id));
  const receiptsByEvent = readRenderedReceiptsByEvent(artifactDir);
  const manifests = [];
  for (const eventId of renderedEventIds) {
    if (existingEventIds.has(eventId)) continue;
    const byKind = receiptsByEvent.get(eventId);
    if (!byKind || !ENGINE_KINDS.every((kind) => byKind[kind])) continue;
    const manifest = createEventRenderManifest({
      eventId,
      byKind,
      createdAtMs: nowMs,
    });
    assertLocalBridgeEventRenderManifestSafe(manifest);
    appendFileSync(eventRenderManifestPath(artifactDir), `${JSON.stringify(manifest)}\n`, "utf8");
    writeJsonAtomic(join(artifactDir, "latest_event_render_manifest.json"), manifest);
    manifests.push(manifest);
  }
  return manifests;
}

function createEventRenderManifest({ eventId, byKind, createdAtMs }) {
  const manifestId = `render-${safeFileName(eventId)}-${createdAtMs}`;
  const firstReceipt = byKind[ENGINE_KINDS[0]];
  return {
    schema: "iris_local_bridge_event_render_manifest_v1",
    manifest_id: manifestId,
    manifest_id_present: safeText(manifestId, 220) !== "",
    event_id: eventId,
    event_id_present: safeText(eventId, 160) !== "",
    created_at_ms: createdAtMs,
    complete: true,
    required_adapter_kinds: ENGINE_KINDS,
    artifact_set: Object.fromEntries(
      ENGINE_KINDS.map((kind) => [
        kind,
        {
          adapter_kind: kind,
          job_id: safeText(byKind[kind].job_id, 220),
          artifact_kind: safeText(byKind[kind].artifact_kind, 80),
          artifact_path: safeText(byKind[kind].artifact_path, 260),
          engine_mode: safeText(byKind[kind].engine_mode, 80),
          rendered_at_ms: safeOptionalNumber(byKind[kind].rendered_at_ms),
        },
      ])
    ),
    sync_policy: {
      event_id_grouped: true,
      tts_live2d_subtitle_required: true,
      obs_can_poll_manifest_artifacts: true,
      adapter_receipts_remain_source_of_truth: true,
    },
    boundary_policy: {
      local_artifacts_only: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function readRenderedReceiptsByEvent(artifactDir) {
  const byEvent = new Map();
  for (const kind of ENGINE_KINDS) {
    for (const receipt of readReceiptFile(join(artifactDir, kind, "receipts.jsonl"))) {
      if (receipt.adapter_kind !== kind) continue;
      if (receipt.engine_status !== "rendered") continue;
      if (!receipt.event_id || !receipt.artifact_path) continue;
      if (!isExpectedEngineArtifactKind(kind, receipt.artifact_kind)) continue;
      try {
        assertLocalBridgeEngineReceiptSafe(receipt, "local bridge persisted receipt");
      } catch {
        continue;
      }
      if (!isReceiptArtifactPickupSafe(receipt, { artifactDir })) continue;
      const eventId = safeText(receipt.event_id, 160);
      if (!byEvent.has(eventId)) byEvent.set(eventId, {});
      byEvent.get(eventId)[kind] = receipt;
    }
  }
  return byEvent;
}

function isReceiptArtifactPickupSafe(receipt, { artifactDir }) {
  if (!artifactDir || !receipt?.artifact_path) return false;
  const artifactPath = join(artifactDir, receipt.artifact_path);
  if (!existsSync(artifactPath)) return false;
  const validation = validateLocalRenderArtifactForPickup({
    adapterKind: receipt.adapter_kind,
    artifact: {
      adapter_kind: receipt.adapter_kind,
      artifact_kind: receipt.artifact_kind,
    },
    contentType:
      receipt.adapter_kind === "tts" ? ttsContentTypeFromArtifactKind(receipt.artifact_kind) : "",
    bytes: readFileSync(artifactPath),
  });
  return validation.contract_valid === true;
}

function summarizeEventRenderManifestStore({ artifactDir }) {
  if (!artifactDir) return createEmptyEventRenderManifestStoreStatus();
  const manifestFile = readEventRenderManifestFile(artifactDir);
  const pickupSafeManifests = manifestFile.manifests.filter((manifest) =>
    isManifestPickupSafe(manifest, { artifactDir })
  );
  const latest = pickupSafeManifests.at(-1) ?? null;
  const status = {
    schema: "iris_local_bridge_event_render_manifest_store_status_v1",
    artifact_dir_configured: true,
    manifest_count: manifestFile.manifests.length,
    complete_manifest_count: pickupSafeManifests.filter((manifest) => manifest.complete === true)
      .length,
    invalid_json_line_count: manifestFile.invalid_json_line_count,
    latest_manifest_id_present: safeText(latest?.manifest_id, 220) !== "",
    required_adapter_kinds: ENGINE_KINDS,
    boundary_policy: {
      counts_only: true,
      no_artifact_paths: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertLocalBridgeEventRenderManifestStoreStatusSafe(status);
  return status;
}

function isManifestPickupSafe(manifest, { artifactDir }) {
  try {
    assertLocalBridgeEventRenderManifestSafe(manifest);
  } catch {
    return false;
  }
  return ENGINE_KINDS.every((kind) => {
    const item = manifest.artifact_set?.[kind];
    return isReceiptArtifactPickupSafe(
      {
        adapter_kind: kind,
        artifact_kind: item?.artifact_kind,
        artifact_path: item?.artifact_path,
      },
      { artifactDir }
    );
  });
}

function createEmptyEventRenderManifestStoreStatus() {
  const status = {
    schema: "iris_local_bridge_event_render_manifest_store_status_v1",
    artifact_dir_configured: false,
    manifest_count: 0,
    complete_manifest_count: 0,
    invalid_json_line_count: 0,
    latest_manifest_id_present: false,
    required_adapter_kinds: ENGINE_KINDS,
    boundary_policy: {
      counts_only: true,
      no_artifact_paths: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertLocalBridgeEventRenderManifestStoreStatusSafe(status);
  return status;
}

function readReceiptFile(filePath) {
  if (!existsSync(filePath)) return [];
  const receipts = [];
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      receipts.push(JSON.parse(line));
    } catch {
      // Malformed persisted receipts are ignored so a later valid receipt can still complete a manifest.
    }
  }
  return receipts;
}

function readEventRenderManifestFile(artifactDir) {
  const filePath = eventRenderManifestPath(artifactDir);
  if (!existsSync(filePath)) return { manifests: [], invalid_json_line_count: 0 };
  const manifests = [];
  let invalidJsonLineCount = 0;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const manifest = JSON.parse(line);
      assertLocalBridgeEventRenderManifestSafe(manifest, "local bridge persisted render manifest");
      manifests.push(manifest);
    } catch {
      invalidJsonLineCount += 1;
    }
  }
  return {
    manifests,
    invalid_json_line_count: invalidJsonLineCount,
  };
}

function eventRenderManifestPath(artifactDir) {
  return join(artifactDir, "event_render_manifests.jsonl");
}

function createJobFreshnessPolicy(maxJobAgeMs) {
  const configuredMaxJobAgeMs = normalizeOptionalPositiveInteger(
    maxJobAgeMs,
    24 * 3_600_000
  );
  return {
    expiry_enabled: configuredMaxJobAgeMs !== null,
    max_job_age_ms: configuredMaxJobAgeMs,
    expired_jobs_rejected_before_engine: true,
    summary_only: true,
  };
}

export function classifyBridgePacketTimestampReadiness(
  packet,
  { nowMs = Date.now(), maxPacketAgeMs = 24 * 3_600_000 } = {}
) {
  const jobFreshnessPolicy = createJobFreshnessPolicy(maxPacketAgeMs);
  const freshness = classifyJobFreshness(
    {
      created_at_ms:
        packet?.created_at_ms ?? packet?.createdAtMs ?? packet?.created_ms ?? packet?.createdMs,
    },
    { nowMs, jobFreshnessPolicy }
  );
  const stale = freshness.job_freshness_status === "expired";
  const summary = {
    schema: "iris_bridge_packet_timestamp_readiness_v1",
    packet_timestamp_status: stale ? "stale" : freshness.job_freshness_status,
    readiness_state: stale ? "runtime_waiting" : "ready",
    ready: stale !== true,
    age_bucket: stale ? "stale" : freshness.job_freshness_status === "fresh" ? "fresh" : "unknown",
    max_age_configured: jobFreshnessPolicy.expiry_enabled === true,
    boundary_policy: {
      stale_packet_not_ready: true,
      no_raw_packet: true,
      summary_only: true,
    },
    adapter_validation_required: true,
  };
  assertBridgePacketTimestampReadinessSafe(summary);
  return summary;
}

export function assertBridgePacketTimestampReadinessSafe(
  summary,
  context = "bridge packet timestamp readiness"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoForbiddenEnginePublicFields(summary, context);
  if (summary.schema !== "iris_bridge_packet_timestamp_readiness_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["fresh", "stale", "not_checked"].includes(summary.packet_timestamp_status)) {
    throw new ContractError(`${context}: invalid packet timestamp status`);
  }
  if (!["ready", "runtime_waiting"].includes(summary.readiness_state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
  if (summary.packet_timestamp_status === "stale") {
    if (summary.ready !== false || summary.readiness_state !== "runtime_waiting") {
      throw new ContractError(`${context}: stale packet must not be ready`);
    }
  }
  for (const field of ["stale_packet_not_ready", "no_raw_packet", "summary_only"]) {
    if (summary.boundary_policy?.[field] !== true) {
      throw new ContractError(`${context}: missing boundary`, { field });
    }
  }
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function classifyJobFreshness(job, { nowMs, jobFreshnessPolicy }) {
  if (jobFreshnessPolicy?.expiry_enabled !== true) {
    return {
      job_freshness_status: "not_checked",
      job_age_ms: null,
      max_job_age_ms: null,
    };
  }
  const maxJobAgeMs = safeOptionalNumber(jobFreshnessPolicy.max_job_age_ms);
  const createdAtMs = safeOptionalNumber(job?.created_at_ms);
  if (maxJobAgeMs === null || maxJobAgeMs <= 0) {
    return {
      job_freshness_status: "not_checked",
      job_age_ms: null,
      max_job_age_ms: null,
    };
  }
  if (createdAtMs === null) {
    return {
      job_freshness_status: "expired",
      job_age_ms: null,
      max_job_age_ms: maxJobAgeMs,
    };
  }
  const jobAgeMs = Math.max(0, Number(nowMs) - createdAtMs);
  return {
    job_freshness_status: jobAgeMs > maxJobAgeMs ? "expired" : "fresh",
    job_age_ms: safeOptionalNumber(jobAgeMs),
    max_job_age_ms: maxJobAgeMs,
  };
}

function classifyJobRetryState(job, failureLedger, { nowMs, retryPolicy }) {
  const entry = failureLedger?.entries?.[job.job_id] ?? null;
  if (!entry) {
    return {
      retry_status: "ready",
      retry_attempt_count: 0,
      next_retry_at_ms: null,
      retryable: true,
    };
  }
  const attemptCount = clampInteger(entry.retry_attempt_count, 0, retryPolicy.max_attempts, 0);
  if (attemptCount >= retryPolicy.max_attempts) {
    return {
      retry_status: "blocked",
      retry_attempt_count: attemptCount,
      next_retry_at_ms: null,
      retryable: false,
    };
  }
  const nextRetryAtMs = safeOptionalNumber(entry.next_retry_at_ms);
  if (nextRetryAtMs !== null && Number(nowMs) < nextRetryAtMs) {
    return {
      retry_status: "waiting",
      retry_attempt_count: attemptCount,
      next_retry_at_ms: nextRetryAtMs,
      retryable: true,
    };
  }
  return {
    retry_status: "ready",
    retry_attempt_count: attemptCount,
    next_retry_at_ms: nextRetryAtMs,
    retryable: true,
  };
}

function recordFailure(failureLedger, job, { attemptedAtMs, retryPolicy, error }) {
  const previous = failureLedger.entries?.[job.job_id] ?? null;
  const previousAttempts = clampInteger(
    previous?.retry_attempt_count ?? 0,
    0,
    retryPolicy.max_attempts,
    0
  );
  const retryAttemptCount = Math.min(retryPolicy.max_attempts, previousAttempts + 1);
  const retryable = retryAttemptCount < retryPolicy.max_attempts;
  const backoffMs = retryable
    ? Math.min(
        retryPolicy.max_backoff_ms,
        retryPolicy.base_backoff_ms * Math.max(1, 2 ** Math.max(0, retryAttemptCount - 1))
      )
    : null;
  const entry = {
    schema: "iris_local_bridge_engine_failure_entry_v1",
    adapter_kind: job.adapter_kind,
    job_id: job.job_id,
    event_id: job.event_id,
    retry_attempt_count: retryAttemptCount,
    retry_status: retryable ? "waiting" : "blocked",
    retryable,
    last_failed_at_ms: attemptedAtMs,
    next_retry_at_ms: retryable ? attemptedAtMs + backoffMs : null,
    failure_kind: classifyEngineFailure(error),
    boundary_policy: {
      summary_only: true,
      no_raw_job_payload: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
      no_endpoint_values: true,
    },
    adapter_validation_required: true,
  };
  failureLedger.entries[job.job_id] = entry;
  failureLedger.updated_at_ms = attemptedAtMs;
  assertNoForbiddenEnginePublicFields(entry, "local bridge engine failure entry");
  return entry;
}

function clearFailure(failureLedger, job) {
  if (!failureLedger.entries?.[job.job_id]) return false;
  delete failureLedger.entries[job.job_id];
  return true;
}

function persistFailureLedger(failureLedger, { artifactDir }) {
  mkdirSync(artifactDir, { recursive: true });
  assertNoForbiddenEnginePublicFields(failureLedger, "local bridge engine failure ledger");
  writeJsonAtomic(failureLedgerPath(artifactDir), failureLedger);
}

function readJobs(filePath) {
  return readJobFile(filePath).jobs;
}

function readJobFile(filePath) {
  if (!existsSync(filePath)) {
    return { jobs: [], invalid_json_line_count: 0 };
  }
  const jobs = [];
  let invalidJsonLineCount = 0;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      jobs.push(JSON.parse(trimmed));
    } catch {
      invalidJsonLineCount += 1;
    }
  }
  return {
    jobs,
    invalid_json_line_count: invalidJsonLineCount,
  };
}

function readExistingFailureLedger(artifactDir) {
  const fallback = {
    schema: "iris_local_bridge_engine_failure_ledger_v1",
    updated_at_ms: null,
    entries: {},
    boundary_policy: {
      summary_only: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
      no_endpoint_values: true,
    },
    adapter_validation_required: true,
  };
  const path = failureLedgerPath(artifactDir);
  if (!existsSync(path)) return fallback;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    const ledger = {
      ...fallback,
      updated_at_ms: safeOptionalNumber(parsed.updated_at_ms),
      entries: sanitizeFailureEntries(parsed.entries),
    };
    assertNoForbiddenEnginePublicFields(ledger, "local bridge engine failure ledger");
    return ledger;
  } catch {
    return fallback;
  }
}

function sanitizeFailureEntries(entries) {
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) return {};
  return Object.fromEntries(
    Object.entries(entries)
      .slice(0, 10_000)
      .flatMap(([jobId, entry]) => {
        const retryAttemptCount = safeRequiredFailureRetryAttemptCount(
          entry?.retry_attempt_count
        );
        if (retryAttemptCount === null) return [];
        const retryStatus = safeRequiredFailureRetryStatus(entry?.retry_status);
        const retryable = safeRequiredFailureRetryable(entry?.retryable);
        const adapterKind = safeRequiredFailureAdapterKind(entry?.adapter_kind);
        const failureKind = safeRequiredFailureKind(entry?.failure_kind);
        if (
          retryStatus === null ||
          retryable === null ||
          adapterKind === null ||
          failureKind === null
        ) {
          return [];
        }
        return [
          [
            safeText(jobId, 220),
            {
              schema: "iris_local_bridge_engine_failure_entry_v1",
              adapter_kind: adapterKind,
              job_id: safeText(entry?.job_id ?? jobId, 220),
              event_id: safeText(entry?.event_id, 220),
              retry_attempt_count: retryAttemptCount,
              retry_status: retryStatus,
              retryable,
              last_failed_at_ms: safeOptionalNumber(entry?.last_failed_at_ms),
              next_retry_at_ms: safeOptionalNumber(entry?.next_retry_at_ms),
              failure_kind: failureKind,
              boundary_policy: {
                summary_only: true,
                no_raw_job_payload: true,
                no_text_payloads: true,
                no_candidates: true,
                no_commands: true,
                no_secret_values: true,
                no_endpoint_values: true,
              },
              adapter_validation_required: true,
            },
          ],
        ];
      })
  );
}

function safeRequiredFailureRetryAttemptCount(value) {
  const number = safeOptionalNumber(value);
  if (number === null || !Number.isInteger(number) || number < 0) return null;
  return number;
}

function safeRequiredFailureRetryStatus(value) {
  return ["waiting", "blocked"].includes(value) ? value : null;
}

function safeRequiredFailureRetryable(value) {
  return typeof value === "boolean" ? value : null;
}

function safeRequiredFailureAdapterKind(value) {
  return ENGINE_KINDS.includes(value) ? value : null;
}

function safeRequiredFailureKind(value) {
  const failureKind = safeText(value, 80);
  return failureKind ? failureKind : null;
}

function failureLedgerPath(artifactDir) {
  return join(artifactDir, "engine_failures.json");
}

function readExistingProcessedIds(artifactDir) {
  const ids = new Set();
  for (const kind of ENGINE_KINDS) {
    const receiptPath = join(artifactDir, kind, "receipts.jsonl");
    if (!existsSync(receiptPath)) continue;
    for (const line of readFileSync(receiptPath, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const receipt = JSON.parse(line);
        if (receipt.job_id) ids.add(receipt.job_id);
      } catch {
        // Ignore malformed local dev receipts; the next valid job remains processable.
      }
    }
  }
  return ids;
}

function readExistingExpiredIds(artifactDir) {
  const ids = new Set();
  for (const kind of ENGINE_KINDS) {
    const receiptPath = join(artifactDir, kind, "receipts.jsonl");
    if (!existsSync(receiptPath)) continue;
    for (const line of readFileSync(receiptPath, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const receipt = JSON.parse(line);
        if (receipt.engine_status === "expired" && receipt.job_id) ids.add(receipt.job_id);
      } catch {
        // Ignore malformed local dev receipts; expired tracking is best-effort.
      }
    }
  }
  return ids;
}

function createPreviewSpeechWav({ durationMs, sampleRate, mouthTiming = [] }) {
  const sampleCount = Math.max(1, Math.trunc((sampleRate * durationMs) / 1000));
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);
  const visemeWindows = Array.isArray(mouthTiming)
    ? mouthTiming
        .map((item) => ({
          start: Math.max(0, Number(item?.start_ms ?? item?.startMs ?? 0)),
          end: Math.max(0, Number(item?.end_ms ?? item?.endMs ?? 0)),
        }))
        .filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start)
    : [];
  for (let index = 0; index < sampleCount; index += 1) {
    const elapsedMs = (index / sampleRate) * 1000;
    const activeWindow =
      visemeWindows.length === 0 ||
      visemeWindows.some((item) => elapsedMs >= item.start && elapsedMs <= item.end);
    if (!activeWindow) continue;
    const envelope = Math.min(1, elapsedMs / 40, (durationMs - elapsedMs) / 80);
    const carrier = Math.sin((2 * Math.PI * 220 * index) / sampleRate);
    const formant = Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.35;
    const sample = Math.trunc((carrier + formant) * Math.max(0, envelope) * 2200);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), 44 + index * 2);
  }
  return buffer;
}

function wrapPcm16AsWav(bytes, { sampleRateHz, channelCount }) {
  const blockAlign = channelCount * 2;
  const validDataSize = bytes.length - (bytes.length % blockAlign);
  const pcmBytes = bytes.subarray(0, validDataSize);
  const dataSize = pcmBytes.length;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRateHz, 24);
  buffer.writeUInt32LE(sampleRateHz * blockAlign, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);
  pcmBytes.copy(buffer, 44);
  return buffer;
}

function convertRawPcmToPcm16(bytes, sampleFormat) {
  if (sampleFormat === "f32le") return convertFloat32LeToPcm16(bytes);
  if (sampleFormat === "s16be") return convertInt16BeToPcm16(bytes);
  if (sampleFormat === "s24le") return convertInt24LeToPcm16(bytes);
  if (sampleFormat === "s24be") return convertInt24BeToPcm16(bytes);
  if (sampleFormat === "s32le") return convertInt32LeToPcm16(bytes);
  if (sampleFormat === "s32be") return convertInt32BeToPcm16(bytes);
  return bytes;
}

function convertFloat32LeToPcm16(bytes) {
  const sampleCount = Math.floor(bytes.length / 4);
  const buffer = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index += 1) {
    const value = Math.max(-1, Math.min(1, bytes.readFloatLE(index * 4)));
    buffer.writeInt16LE(Math.trunc(value * 32767), index * 2);
  }
  return buffer;
}

function convertInt16BeToPcm16(bytes) {
  const sampleCount = Math.floor(bytes.length / 2);
  const buffer = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index += 1) {
    buffer.writeInt16LE(bytes.readInt16BE(index * 2), index * 2);
  }
  return buffer;
}

function convertInt24LeToPcm16(bytes) {
  const sampleCount = Math.floor(bytes.length / 3);
  const buffer = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index += 1) {
    const offset = index * 3;
    let value = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
    if (value & 0x800000) value |= 0xff000000;
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, value >> 8)), index * 2);
  }
  return buffer;
}

function convertInt24BeToPcm16(bytes) {
  const sampleCount = Math.floor(bytes.length / 3);
  const buffer = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index += 1) {
    const offset = index * 3;
    let value = (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
    if (value & 0x800000) value |= 0xff000000;
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, value >> 8)), index * 2);
  }
  return buffer;
}

function convertInt32LeToPcm16(bytes) {
  const sampleCount = Math.floor(bytes.length / 4);
  const buffer = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index += 1) {
    buffer.writeInt16LE(bytes.readInt32LE(index * 4) >> 16, index * 2);
  }
  return buffer;
}

function convertInt32BeToPcm16(bytes) {
  const sampleCount = Math.floor(bytes.length / 4);
  const buffer = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index += 1) {
    buffer.writeInt16LE(bytes.readInt32BE(index * 4) >> 16, index * 2);
  }
  return buffer;
}

function renderVtt(job, timing = requiredSubtitleTiming(job)) {
  const start = formatVttTime(timing.display_start_ms);
  const end = formatVttTime(timing.display_end_ms);
  const lineBreakPlan =
    job.line_break_plan ??
    job.lineBreakPlan ??
    job.caption_lines ??
    job.captionLines ??
    job.subtitle_lines ??
    job.subtitleLines ??
    job.display_lines ??
    job.displayLines;
  const lines = Array.isArray(lineBreakPlan) && lineBreakPlan.length > 0
    ? lineBreakPlan
    : [
        job.subtitle_text ??
          job.subtitleText ??
          job.caption_text ??
          job.captionText ??
          job.caption ??
          job.display_text ??
          job.displayText ??
          job.text ??
          "",
      ];
  const cueLines = lines.map((line) => safeVttCueLine(line)).filter(Boolean);
  return `WEBVTT\n\n${start} --> ${end}\n${cueLines.join("\n")}\n`;
}

function safeVttCueLine(value) {
  return safeText(value, 220)
    .replace(/<[^>]+>/g, "")
    .replace(/-->/g, "->")
    .replace(/\bWEBVTT\b/giu, "")
    .trim();
}

function formatVttTime(ms) {
  const totalMs = Math.max(0, Math.trunc(Number(ms) || 0));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${String(millis).padStart(3, "0")}`;
}

function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(tempPath, filePath);
}

function assertNoForbiddenEnginePublicFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenEnginePublicFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_ENGINE_PUBLIC_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe engine public field`, { field, path });
    }
    assertNoForbiddenEnginePublicFields(child, context, `${path}.${field}`);
  }
}

function safeOptionalNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function normalizeOptionalPositiveInteger(value, max) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.min(max, Math.trunc(number));
}

function classifyEngineFailure(error) {
  if (error?.name === "AbortError") return "timeout";
  if (error instanceof ContractError) {
    if (typeof error.details?.status === "number") return "http_status";
    if (String(error.message ?? "").includes("local endpoint policy")) {
      return "local_endpoint_policy_blocked";
    }
    if (String(error.message ?? "").includes("requires JSON")) return "invalid_json";
    if (String(error.message ?? "").includes("must be a JSON object")) return "invalid_json";
    if (String(error.message ?? "").includes("unsafe engine public field")) {
      return "unsafe_engine_response";
    }
    if (String(error.message ?? "").includes("audio")) return "invalid_audio_response";
    if (String(error.message ?? "").includes("cue")) return "invalid_live2d_response";
    return "contract_error";
  }
  return "engine_request_error";
}

function safeFileName(value) {
  return safeText(value || "artifact", 120).replace(/[^a-zA-Z0-9_.-]/g, "-") || "artifact";
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeEnginePublicText(value, { maxLength = 160, fallback = "" } = {}) {
  const text = safeText(value, maxLength);
  if (!text) return fallback;
  if (UNSAFE_ENGINE_PUBLIC_TEXT_PATTERN.test(text)) return fallback;
  return text;
}

function requiredEnginePublicText(value, context, { maxLength = 160 } = {}) {
  const text = safeText(value, maxLength);
  if (!text) {
    throw new ContractError(`${context}: artifact text is required`);
  }
  if (UNSAFE_ENGINE_PUBLIC_TEXT_PATTERN.test(text)) {
    throw new ContractError(`${context}: unsafe artifact text`);
  }
  return text;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}
