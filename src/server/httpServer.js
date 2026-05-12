import { createServer } from "node:http";
import { normalizeGameObservation } from "../adapters/game/gameObservationAdapter.js";
import { normalizeMediaWatchObservation } from "../adapters/media/mediaWatchAdapter.js";
import { normalizeIdlePresenceEvent } from "../adapters/presence/idleEventAdapter.js";
import { normalizeExternalTopicObservation } from "../adapters/topics/externalTopicAdapter.js";
import { normalizeYouTubeComment } from "../adapters/youtube/commentAdapter.js";
import { normalizeYouTubeDonation } from "../adapters/youtube/donationAdapter.js";
import { ContractError } from "../core/contracts.js";
import { assertScenarioSafe, runScenario } from "../runtime/scenarioRunner.js";
import {
  createAdminCharacterVoiceSettingsApplyPlan,
  createAdminCharacterVoiceSettingsAnimePerformanceSummary,
  createAdminCharacterVoiceSettingsReport,
} from "../services/dev/adminCharacterVoiceSettings.js";
import { createAdminDashboard } from "../services/dev/adminDashboard.js";
import { createAdminIntegrationChecklist } from "../services/dev/adminIntegrationChecklist.js";
import { createAdminOperationsSummary } from "../services/dev/adminOperationsSummary.js";
import { createPublicReportBoundaryAuditReport } from "../services/dev/publicReportBoundaryAudit.js";
import {
  applyAdminSafetyControlAction,
  createAdminSafetyControlsReport,
  createInMemoryAdminSafetyControlStore,
} from "../services/dev/adminSafetyControls.js";
import {
  applyAdminReviewQueueDecision,
  createAdminReviewQueueActionPlan,
  createInMemoryAdminReviewDecisionStore,
  createAdminReviewQueueReport,
} from "../services/dev/adminReviewQueue.js";
import { createJsonAdminReviewDecisionLog } from "../services/dev/adminReviewDecisionLog.js";
import { createAdminReviewAuthGateReport } from "../services/dev/adminReviewAuthGate.js";
import { createAdminReviewValidatorHandoffReport } from "../services/dev/adminReviewValidatorHandoff.js";
import { createAdminReviewValidatorPreflight } from "../services/dev/adminReviewValidatorPreflight.js";
import { createAdminReviewValidatorRunPlan } from "../services/dev/adminReviewValidatorRunPlan.js";
import { createReadinessReport } from "../services/dev/readinessReport.js";
import { createIntegrationStatus } from "../services/dev/integrationStatus.js";
import { createIntegrationContracts } from "../services/dev/integrationContracts.js";
import { createIntegrationFixtures } from "../services/dev/integrationFixtures.js";
import { createIntegrationProbeReport } from "../services/dev/integrationProbe.js";
import { createMemoryVectorRoundtripReport } from "../services/dev/memoryVectorRoundtrip.js";
import { createPersistenceStatus } from "../services/dev/persistenceStatus.js";
import { createFoundationLaunchPlan } from "../services/dev/foundationLaunchPlan.js";
import { createFoundationLiveReadinessReport } from "../services/dev/foundationLiveReadiness.js";
import { createFoundationPreflightReport } from "../services/dev/foundationPreflight.js";
import { createFoundationReadinessRehearsal } from "../services/dev/foundationReadinessRehearsal.js";
import { createFoundationRuntimeStatusReport } from "../services/dev/foundationRuntimeStatus.js";
import { createFoundationStatusReport } from "../services/dev/foundationStatus.js";
import { createFoundationStartupChecklist } from "../services/dev/foundationStartupChecklist.js";
import { createFoundationPostStartHealthChecklist } from "../services/dev/foundationPostStartHealthChecklist.js";
import { createFoundationConnectorHandoff } from "../services/dev/foundationConnectorHandoff.js";
import { createFoundationEnvSetupPlan } from "../services/dev/foundationEnvSetupPlan.js";
import { createFoundationLocalEnvApplyPlan } from "../services/dev/foundationLocalEnvApplyPlan.js";
import { createFoundationLocalEnvProfile } from "../services/dev/foundationLocalEnvProfile.js";
import { createFoundationLocalEnvReadinessRehearsal } from "../services/dev/foundationLocalEnvReadinessRehearsal.js";
import { createFoundationLocalEnvRoundtripReport } from "../services/dev/foundationLocalEnvRoundtrip.js";
import { createGameplayEnvSetupPlan } from "../services/dev/gameplayEnvSetupPlan.js";
import { createGameplayLaunchPlan } from "../services/dev/gameplayLaunchPlan.js";
import { createGameplayLiveReadinessReport } from "../services/dev/gameplayLiveReadiness.js";
import { createGameplayLocalEnvApplyPlan } from "../services/dev/gameplayLocalEnvApplyPlan.js";
import { createGameplayLocalEnvProfile } from "../services/dev/gameplayLocalEnvProfile.js";
import { createGameplayPostStartChecklist } from "../services/dev/gameplayPostStartChecklist.js";
import { createGameplayPreflightReport } from "../services/dev/gameplayPreflight.js";
import { createGameplayReadinessRehearsal } from "../services/dev/gameplayReadinessRehearsal.js";
import { createGameplayRuntimeStatusReport } from "../services/dev/gameplayRuntimeStatus.js";
import { createGameplayStartupChecklist } from "../services/dev/gameplayStartupChecklist.js";
import { createGameplayValidationGateRoundtripReport } from "../services/dev/gameplayValidationGateRoundtrip.js";
import { createPersistenceEnvSetupPlan } from "../services/dev/persistenceEnvSetupPlan.js";
import { createPersistenceLaunchPlan } from "../services/dev/persistenceLaunchPlan.js";
import { createPersistenceLiveReadinessReport } from "../services/dev/persistenceLiveReadiness.js";
import { createPersistenceLocalEnvApplyPlan } from "../services/dev/persistenceLocalEnvApplyPlan.js";
import { createPersistenceLocalEnvProfile } from "../services/dev/persistenceLocalEnvProfile.js";
import { createPersistencePreflightReport } from "../services/dev/persistencePreflight.js";
import { createPersistenceReadinessRehearsal } from "../services/dev/persistenceReadinessRehearsal.js";
import { createPersistenceRuntimeStatusReport } from "../services/dev/persistenceRuntimeStatus.js";
import { createPersistenceStartupChecklist } from "../services/dev/persistenceStartupChecklist.js";
import { createPersistencePostStartChecklist } from "../services/dev/persistencePostStartChecklist.js";
import { createOperatorPolicyAdminApplyPlan } from "../services/dev/operatorPolicyAdminApplyPlan.js";
import { createOperatorPolicyAsyncSaveGateRoundtripCliReport } from "../services/dev/operatorPolicyAsyncSaveGateRoundtrip.js";
import { createOperatorPolicySettingsReport } from "../services/dev/operatorPolicySettings.js";
import { createPostgresAdminSavePreflightReport } from "../services/dev/postgresAdminSavePreflight.js";
import { createProductionConfigDoctor } from "../services/dev/productionConfigDoctor.js";
import { createProductionLiveReadinessReport } from "../services/dev/productionLiveReadiness.js";
import { createProductionNextTaskReport } from "../services/dev/productionNextTask.js";
import { createProductionProbeReport } from "../services/dev/productionProbe.js";
import { createProductionReadinessRunbook } from "../services/dev/productionReadinessRunbook.js";
import { createProductionRuntimeHandoffStatusReport } from "../services/dev/productionRuntimeHandoffStatus.js";
import { createProductionSchedulerEnablementPlan } from "../services/dev/productionSchedulerEnablementPlan.js";
import { createYouTubeIngestEnvSetupPlan } from "../services/dev/youtubeIngestEnvSetupPlan.js";
import { createYouTubeIngestLocalEnvApplyPlan } from "../services/dev/youtubeIngestLocalEnvApplyPlan.js";
import { createYouTubeIngestLocalEnvProfile } from "../services/dev/youtubeIngestLocalEnvProfile.js";
import { createYouTubeIngestPreflightReport } from "../services/dev/youtubeIngestPreflight.js";
import { createYouTubeIngestLaunchPlan } from "../services/dev/youtubeIngestLaunchPlan.js";
import { createYouTubeIngestLiveReadinessReport } from "../services/dev/youtubeIngestLiveReadiness.js";
import { createYouTubeIngestPostStartChecklist } from "../services/dev/youtubeIngestPostStartChecklist.js";
import { createYouTubeIngestReadinessRehearsal } from "../services/dev/youtubeIngestReadinessRehearsal.js";
import { createYouTubeIngestRuntimeStatusReport } from "../services/dev/youtubeIngestRuntimeStatus.js";
import { createYouTubeIngestSourceStatusReport } from "../services/dev/youtubeIngestSourceStatus.js";
import { createYouTubeRelayReadinessRehearsal } from "../services/dev/youtubeRelayReadinessRehearsal.js";
import { createYouTubeRelayStartupChecklist } from "../services/dev/youtubeRelayStartupChecklist.js";
import { listPersonaProfilePresets } from "../services/personality/irisPersonaProfile.js";
import { getSupportedTongueTwisterSummaries } from "../services/voice/tongueTwisterCatalog.js";
import { getSupportedLanguageSummaries } from "../services/voice/languageProfile.js";
import { renderDebugPage } from "./debugPage.js";
import { renderAdminDashboardPage } from "./adminDashboardPage.js";
import { createObsOverlayConfigFromEnv } from "./obsOverlayConfig.js";
import { renderOverlayPage } from "./overlayPage.js";
import {
  createOverlayDisplayEvent,
  createOverlayEventBus,
} from "./overlayDisplayEvent.js";
import { createOverlayStatus } from "./overlayStatus.js";
import { createLocalBridgeEventRenderManifestStoreStatus } from "./localBridgeEngineWorker.js";
import { createLocalBridgeRenderManifestOperatorReport } from "./localBridgeRenderManifestReport.js";
import {
  createLocalArtifactErrorResponse,
  getLocalArtifactErrorStatusCode,
  LATEST_ARTIFACT_PATHS,
  readLatestRenderArtifact,
} from "./localBridgeServer.js";

const SAFE_HTTP_ERROR_KINDS = new Set([
  "invalid_json",
  "request_body_too_large",
  "unsafe_payload",
  "contract_error",
  "internal_error",
]);

export function createIrisHttpServer({
  runtime,
  streamState,
  idleScheduler = null,
  httpIngestScheduler = null,
  operatorPolicyAsyncSaveGate = null,
  adminSafetyControlStore = createInMemoryAdminSafetyControlStore(),
  adminReviewDecisionStore = null,
  overlayEventBus = createOverlayEventBus(),
  env = process.env,
  logger = console,
} = {}) {
  if (!runtime) throw new Error("createIrisHttpServer requires runtime");
  if (!streamState) throw new Error("createIrisHttpServer requires streamState");
  const reviewDecisionStore =
    adminReviewDecisionStore ?? createAdminReviewDecisionStoreFromEnv(env);

  function updateStateFromResult(result) {
    const state = streamState.updateFromRuntimeResult(result);
    overlayEventBus?.publish?.(createOverlayDisplayEvent(state));
    return state;
  }

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      if (request.method === "GET" && url.pathname === "/health") {
        return sendJson(response, 200, { ok: true, service: "iris" });
      }
      if (request.method === "GET" && url.pathname === "/state") {
        return sendJson(response, 200, sanitizePublicRuntimeState(streamState.get()));
      }
      if (request.method === "GET" && url.pathname === "/capabilities") {
        return sendJson(response, 200, {
          ok: true,
          capabilities: runtime.capabilities?.() ?? null,
        });
      }
      if (request.method === "GET" && url.pathname === "/languages") {
        const languages = getSupportedLanguageSummaries();
        const tongueTwisters = getSupportedTongueTwisterSummaries();
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_supported_languages_v1",
          count: languages.length,
          languages,
          tongue_twister_count: tongueTwisters.length,
          tongue_twisters: tongueTwisters,
          boundary_policy: {
            public_static_metadata_only: true,
            no_raw_text: true,
            no_candidates: true,
            no_commands: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/persona-profiles") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_persona_profile_presets_public_v1",
          profiles: listPersonaProfilePresets(),
          boundary_policy: {
            public_static_metadata_only: true,
            no_canonical_enums: true,
            no_commands: true,
            no_candidates: true,
            no_scores: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/readiness") {
        return sendJson(response, 200, {
          ok: true,
          report: createReadinessReport({
            capabilities: runtime.capabilities?.() ?? {},
            state: streamState.get(),
            candidateReviewStats: runtime.candidateReviewStats?.() ?? null,
            integrationProbeReport: await createIntegrationProbeReport({
              env,
              mode: "dry_run",
              fetchImpl: null,
            }),
          }),
        });
      }
      if (request.method === "GET" && url.pathname === "/production/config-doctor") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_production_config_doctor_http_v1",
          production_config_doctor: createProductionConfigDoctor({ env }),
          boundary_policy: productionConfigDoctorHttpBoundaryPolicy(),
        });
      }
      if (request.method === "GET" && url.pathname === "/production/readiness-runbook") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_production_readiness_runbook_http_v1",
          production_readiness_runbook: createProductionReadinessRunbook({ env }),
          boundary_policy: productionReadinessRunbookHttpBoundaryPolicy(),
        });
      }
      if (request.method === "GET" && url.pathname === "/production/next-task") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_production_next_task_http_v1",
          production_next_task: createProductionNextTaskReport({ env }),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_text_payloads: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_candidates: true,
            no_commands: true,
            no_raw_frames: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/runtime-handoff-status"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_production_runtime_handoff_status_http_v1",
          production_runtime_handoff_status:
            createProductionRuntimeHandoffStatusReport({
              env,
              foundationRuntimeStatus: createFoundationRuntimeStatusReport({
                env,
                streamState,
                overlayEventBus,
              }),
              youtubeIngestRuntimeStatus: createYouTubeIngestRuntimeStatusReport({
                env,
                httpIngestScheduler,
                streamState,
              }),
              persistenceRuntimeStatus: createPersistenceRuntimeStatusReport({
                env,
                streamState,
                runtime,
              }),
              gameplayRuntimeStatus: createGameplayRuntimeStatusReport({
                env,
                httpIngestScheduler,
                streamState,
                runtime,
              }),
            }),
          boundary_policy: {
            env_names_only: true,
            counts_statuses_and_booleans_only: true,
            no_child_reports: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_raw_frames: true,
            no_ocr_text: true,
            no_candidates: true,
            no_commands: true,
            no_raw_runtime_state: true,
            read_only_http: true,
            script_names_only: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/scheduler-enablement"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_production_scheduler_enablement_http_v1",
          production_scheduler_enablement:
            createProductionSchedulerEnablementPlan({
              env,
              httpIngestScheduler,
              streamState,
              runtime,
            }),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            booleans_counts_and_fixed_statuses_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_text_payloads: true,
            no_support_message_text: true,
            no_platform_ids: true,
            no_platform_cursor_values: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_candidates: true,
            no_commands: true,
            no_raw_frames: true,
            no_raw_scheduler_results: true,
            no_raw_stream_state: true,
            no_polling_side_effects: true,
            no_control_side_effects: true,
            read_only_http: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/production/foundation-preflight") {
        return sendJson(response, 200, {
          ok: true,
          foundation_preflight: createFoundationPreflightReport({ env }),
        });
      }
      if (request.method === "GET" && url.pathname === "/production/foundation-launch-plan") {
        const runbook = createProductionReadinessRunbook({ env });
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_launch_plan_http_v1",
          readiness_status: runbook.readiness_status,
          next_stage: runbook.next_stage,
          foundation_launch_plan: createFoundationLaunchPlan({ env }),
          operator_launch_plan: runbook.operator_launch_plan,
          verification_plan: {
            plan_status: runbook.verification_plan.plan_status,
            next_stage_id: runbook.verification_plan.next_stage_id,
            next_stage_priority: runbook.verification_plan.next_stage_priority,
            next_stage_verification_scripts:
              runbook.verification_plan.next_stage_verification_scripts,
            total_verification_script_count:
              runbook.verification_plan.total_verification_script_count,
            boundary_policy: {
              script_names_only: true,
              env_names_only: true,
              no_secret_values: true,
              no_endpoint_values: true,
              read_only_plan: true,
            },
          },
          boundary_policy: {
            safe_local_commands_only: true,
            env_names_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_payloads: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/foundation-startup-checklist"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_startup_checklist_http_v1",
          foundation_startup_checklist: createFoundationStartupChecklist({ env }),
          boundary_policy: {
            safe_local_scripts_only: true,
            env_names_only: true,
            script_names_only: true,
            terminal_labels_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_payloads: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/foundation-post-start-health-checklist"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_post_start_health_checklist_http_v1",
          foundation_post_start_health_checklist:
            createFoundationPostStartHealthChecklist({ env }),
          boundary_policy: {
            read_only_http: true,
            script_names_only: true,
            ids_and_counts_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_payloads: true,
            no_candidates: true,
            no_commands: true,
            no_real_probe_executed: true,
            no_network_request_attempted: true,
            no_obs_operation: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/foundation-connector-handoff"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_connector_handoff_http_v1",
          foundation_connector_handoff: createFoundationConnectorHandoff({ env }),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            schema_names_only: true,
            route_paths_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_payloads: true,
            no_candidates: true,
            no_commands: true,
            no_raw_packets: true,
            no_job_payloads: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/foundation-env-setup-plan"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_env_setup_plan_http_v1",
          foundation_env_setup_plan: createFoundationEnvSetupPlan({ env }),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            schema_names_only: true,
            fixed_ids_statuses_and_counts_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_payloads: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/foundation-local-env-profile"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_local_env_profile_http_v1",
          foundation_local_env_profile: createFoundationLocalEnvProfile(),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            route_paths_only: true,
            operator_labels_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_payloads: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
            print_env_requires_explicit_cli_flag: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/foundation-local-env-roundtrip"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_local_env_roundtrip_http_v1",
          foundation_local_env_roundtrip: createFoundationLocalEnvRoundtripReport(),
          boundary_policy: {
            env_names_only: true,
            env_counts_only: true,
            script_names_only: true,
            no_env_values: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_payloads: true,
            no_candidates: true,
            no_commands: true,
            no_template_text: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/foundation-local-env-apply-plan"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_local_env_apply_plan_http_v1",
          foundation_local_env_apply_plan: createFoundationLocalEnvApplyPlan({
            applyMode: "dry_run",
          }),
          boundary_policy: {
            env_names_only: true,
            env_counts_only: true,
            file_names_only: true,
            script_names_only: true,
            no_env_values: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_payloads: true,
            no_candidates: true,
            no_commands: true,
            no_template_text: true,
            materialization_requires_explicit_cli_flag: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/foundation-local-env-rehearsal"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_local_env_rehearsal_http_v1",
          foundation_local_env_rehearsal:
            createFoundationLocalEnvReadinessRehearsal(),
          boundary_policy: {
            env_names_only: true,
            env_counts_only: true,
            file_names_only: true,
            script_names_only: true,
            booleans_counts_and_fixed_statuses_only: true,
            no_env_values: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_payloads: true,
            no_candidates: true,
            no_commands: true,
            no_template_text: true,
            no_file_updates: true,
            read_only_http: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/production/foundation-status") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_status_http_v1",
          foundation_status: createFoundationStatusReport({ env }),
          boundary_policy: {
            no_secret_values: true,
            no_endpoint_values: true,
            no_raw_packets: true,
            no_job_payloads: true,
            no_text_payloads: true,
            no_artifact_paths: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
            no_engine_calls: true,
            no_obs_setup_side_effects: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/foundation-runtime-status"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_runtime_status_http_v1",
          foundation_runtime_status: createFoundationRuntimeStatusReport({
            env,
            streamState,
            overlayEventBus,
          }),
          boundary_policy: {
            env_names_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_text_payloads: true,
            no_artifact_paths: true,
            no_candidates: true,
            no_commands: true,
            no_raw_stream_state: true,
            no_raw_overlay_events: true,
            read_only_http: true,
            no_engine_calls: true,
            no_obs_setup_side_effects: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/foundation-runtime-summary"
      ) {
        const foundationRuntimeStatus = createFoundationRuntimeStatusReport({
          env,
          streamState,
          overlayEventBus,
        });
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_runtime_summary_http_v1",
          foundation_runtime_summary:
            foundationRuntimeStatus.production_handoff_summary,
          boundary_policy: {
            counts_statuses_booleans_and_script_names_only: true,
            no_child_reports: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_text_payloads: true,
            no_artifact_paths: true,
            no_candidates: true,
            no_commands: true,
            no_raw_stream_state: true,
            no_raw_overlay_events: true,
            read_only_http: true,
            no_engine_calls: true,
            no_obs_setup_side_effects: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/foundation-live-readiness"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_live_readiness_http_v1",
          foundation_live_readiness: await createFoundationLiveReadinessReport({
            env,
            streamState,
            overlayEventBus,
            probeMode: "dry_run",
          }),
          boundary_policy: {
            env_names_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_text_payloads: true,
            no_artifact_paths: true,
            no_candidates: true,
            no_commands: true,
            no_raw_stream_state: true,
            no_raw_overlay_events: true,
            read_only_http: true,
            health_probe_gets_only: true,
            no_obs_setup_side_effects: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/foundation-readiness-rehearsal"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_foundation_readiness_rehearsal_http_v1",
          foundation_readiness_rehearsal:
            await createFoundationReadinessRehearsal({
              env,
              streamState,
              overlayEventBus,
            }),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            booleans_counts_and_fixed_statuses_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_text_payloads: true,
            no_artifact_paths: true,
            no_raw_jobs: true,
            no_raw_packets: true,
            no_candidates: true,
            no_commands: true,
            no_engine_calls: true,
            no_obs_setup_side_effects: true,
            no_file_updates: true,
            dry_run_probe_only: true,
            read_only_http: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/production/youtube-preflight") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_youtube_ingest_preflight_http_v1",
          youtube_ingest_preflight: createYouTubeIngestPreflightReport({ env }),
          boundary_policy: youtubeIngestPreflightHttpBoundaryPolicy(),
        });
      }
      if (request.method === "GET" && url.pathname === "/production/youtube-launch-plan") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_youtube_ingest_launch_plan_http_v1",
          youtube_ingest_launch_plan: createYouTubeIngestLaunchPlan({ env }),
          boundary_policy: {
            safe_local_scripts_only: true,
            env_names_only: true,
            script_names_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_support_message_text: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/youtube-local-env-profile"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_youtube_ingest_local_env_profile_http_v1",
          youtube_ingest_local_env_profile: createYouTubeIngestLocalEnvProfile(),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            source_modes_only: true,
            operator_labels_only: true,
            no_env_values: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_platform_cursor_values: true,
            no_live_payloads: true,
            no_support_message_text: true,
            no_payloads: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
            print_env_requires_explicit_cli_flag: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/youtube-local-env-apply-plan"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_youtube_ingest_local_env_apply_plan_http_v1",
          youtube_ingest_local_env_apply_plan:
            createYouTubeIngestLocalEnvApplyPlan({
              applyMode: "dry_run",
            }),
          boundary_policy: {
            env_names_only: true,
            env_counts_only: true,
            file_names_only: true,
            script_names_only: true,
            no_env_values: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_platform_cursor_values: true,
            no_live_payloads: true,
            no_support_message_text: true,
            no_payloads: true,
            no_candidates: true,
            no_commands: true,
            no_template_text: true,
            materialization_requires_explicit_cli_flag: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/youtube-env-setup-plan"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_youtube_ingest_env_setup_plan_http_v1",
          youtube_ingest_env_setup_plan: createYouTubeIngestEnvSetupPlan({ env }),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            schema_names_only: true,
            fixed_ids_statuses_and_counts_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_platform_cursor_values: true,
            no_live_payloads: true,
            no_support_message_text: true,
            no_payloads: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/production/youtube-source-status") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_youtube_ingest_source_status_http_v1",
          youtube_ingest_source_status: createYouTubeIngestSourceStatusReport({ env }),
          boundary_policy: {
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_support_message_text: true,
            no_platform_cursor_values: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
            no_polling_side_effects: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/production/youtube-runtime-status") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_youtube_ingest_runtime_status_http_v1",
          youtube_ingest_runtime_status: createYouTubeIngestRuntimeStatusReport({
            env,
            httpIngestScheduler,
            streamState,
          }),
          boundary_policy: {
            env_names_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_support_message_text: true,
            no_platform_cursor_values: true,
            no_candidates: true,
            no_commands: true,
            no_raw_scheduler_results: true,
            read_only_http: true,
            no_polling_side_effects: true,
            script_names_only: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/youtube-live-readiness"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_youtube_ingest_live_readiness_http_v1",
          youtube_ingest_live_readiness: createYouTubeIngestLiveReadinessReport({
            env,
            httpIngestScheduler,
            streamState,
          }),
          boundary_policy: {
            env_names_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_text_payloads: true,
            no_support_message_text: true,
            no_platform_cursor_values: true,
            no_candidates: true,
            no_commands: true,
            no_raw_scheduler_results: true,
            no_raw_stream_state: true,
            read_only_http: true,
            no_polling_side_effects: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/youtube-readiness-rehearsal"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_youtube_ingest_readiness_rehearsal_http_v1",
          youtube_ingest_readiness_rehearsal:
            createYouTubeIngestReadinessRehearsal({
              env,
              httpIngestScheduler,
              streamState,
            }),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            booleans_counts_and_fixed_statuses_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_text_payloads: true,
            no_support_message_text: true,
            no_platform_ids: true,
            no_platform_cursor_values: true,
            no_candidates: true,
            no_commands: true,
            no_raw_scheduler_results: true,
            no_raw_stream_state: true,
            no_polling_side_effects: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/youtube-post-start-checklist"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_youtube_ingest_post_start_checklist_http_v1",
          youtube_ingest_post_start_checklist:
            createYouTubeIngestPostStartChecklist({
              env,
              httpIngestScheduler,
              streamState,
            }),
          boundary_policy: {
            read_only_http: true,
            script_names_only: true,
            ids_counts_and_fixed_statuses_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_support_message_text: true,
            no_support_amount_values: true,
            no_platform_cursor_values: true,
            no_platform_ids: true,
            no_candidates: true,
            no_commands: true,
            no_real_poll_executed: true,
            no_network_request_attempted: true,
            no_youtube_api_request_attempted: true,
            no_candidate_commit_attempted: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/youtube-relay-startup-checklist"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_youtube_relay_startup_checklist_http_v1",
          youtube_relay_startup_checklist: createYouTubeRelayStartupChecklist(),
          boundary_policy: {
            local_relay_only: true,
            env_names_only: true,
            script_names_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_support_message_text: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
            no_polling_side_effects: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/youtube-relay-readiness-rehearsal"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_youtube_relay_readiness_rehearsal_http_v1",
          youtube_relay_readiness_rehearsal:
            await createYouTubeRelayReadinessRehearsal({ env }),
          boundary_policy: {
            local_fixture_source_only: true,
            script_names_only: true,
            counts_statuses_and_booleans_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_youtube_text: true,
            no_support_messages: true,
            no_candidates: true,
            no_commands: true,
            synthetic_fixture_poll_only: true,
            read_only_http: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/production/persistence-preflight") {
        return sendJson(response, 200, {
          ok: true,
          persistence_preflight: createPersistencePreflightReport({ env }),
        });
      }
      if (request.method === "GET" && url.pathname === "/production/persistence-launch-plan") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_persistence_launch_plan_http_v1",
          persistence_launch_plan: createPersistenceLaunchPlan({ env }),
          boundary_policy: {
            safe_local_scripts_only: true,
            env_names_only: true,
            script_names_only: true,
            no_secret_values: true,
            no_store_paths: true,
            no_endpoint_values: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/persistence-local-env-profile"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_persistence_local_env_profile_http_v1",
          persistence_local_env_profile: createPersistenceLocalEnvProfile(),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            operator_labels_only: true,
            no_env_values: true,
            no_secret_values: true,
            no_store_paths: true,
            no_endpoint_values: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_memory_summaries: true,
            no_relationship_scores: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
            print_env_requires_explicit_cli_flag: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/persistence-local-env-apply-plan"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_persistence_local_env_apply_plan_http_v1",
          persistence_local_env_apply_plan: createPersistenceLocalEnvApplyPlan({
            applyMode: "dry_run",
          }),
          boundary_policy: {
            env_names_only: true,
            env_counts_only: true,
            file_names_only: true,
            script_names_only: true,
            no_env_values: true,
            no_secret_values: true,
            no_store_paths: true,
            no_endpoint_values: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_memory_summaries: true,
            no_relationship_scores: true,
            no_candidates: true,
            no_commands: true,
            no_template_text: true,
            materialization_requires_explicit_cli_flag: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/persistence-env-setup-plan"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_persistence_env_setup_plan_http_v1",
          persistence_env_setup_plan: createPersistenceEnvSetupPlan({ env }),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            schema_names_only: true,
            fixed_ids_statuses_and_counts_only: true,
            no_secret_values: true,
            no_store_paths: true,
            no_endpoint_values: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_memory_summaries: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/persistence-startup-checklist"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_persistence_startup_checklist_http_v1",
          persistence_startup_checklist: createPersistenceStartupChecklist(),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            no_secret_values: true,
            no_store_path_values: true,
            no_endpoint_values: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_memory_summaries: true,
            no_candidates: true,
            no_commands: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/memory-vector-roundtrip"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_memory_vector_roundtrip_http_v1",
          memory_vector_roundtrip: await createMemoryVectorRoundtripReport(),
          boundary_policy: {
            script_names_only: true,
            counts_statuses_and_booleans_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_memory_records: true,
            no_memory_summaries: true,
            no_relationship_records: true,
            no_candidates: true,
            no_commands: true,
            synthetic_fixture_search_only: true,
            read_only_http: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/production/persistence-runtime-status") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_persistence_runtime_status_http_v1",
          persistence_runtime_status: createPersistenceRuntimeStatusReport({
            env,
            runtime,
            streamState,
          }),
          boundary_policy: {
            env_names_only: true,
            counts_only: true,
            no_secret_values: true,
            no_store_paths: true,
            no_endpoint_values: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_candidates: true,
            no_commands: true,
            no_raw_runtime_state: true,
            read_only_http: true,
            script_names_only: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/postgres-admin-save-preflight"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_postgres_admin_save_preflight_http_v1",
          postgres_admin_save_preflight:
            createPostgresAdminSavePreflightReport({ env }),
          boundary_policy: {
            read_only_http: true,
            preflight_only: true,
            env_names_and_booleans_only: true,
            no_secret_values: true,
            no_connection_values: true,
            no_endpoint_values: true,
            no_store_path_values: true,
            no_sql_statements: true,
            no_policy_payloads: true,
            no_policy_numeric_values: true,
            no_candidates: true,
            no_commands: true,
            no_db_connection_attempted: true,
            no_pool_created: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/persistence-live-readiness"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_persistence_live_readiness_http_v1",
          persistence_live_readiness: createPersistenceLiveReadinessReport({
            env,
            runtime,
            streamState,
          }),
          boundary_policy: {
            env_names_only: true,
            counts_statuses_booleans_and_policy_only: true,
            no_secret_values: true,
            no_store_paths: true,
            no_endpoint_values: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_memory_summaries: true,
            no_relationship_scores: true,
            no_viewer_ids: true,
            no_display_names: true,
            no_candidates: true,
            no_commands: true,
            no_raw_runtime_state: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/persistence-post-start-checklist"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_persistence_post_start_checklist_http_v1",
          persistence_post_start_checklist: createPersistencePostStartChecklist({
            env,
            runtime,
            streamState,
          }),
          boundary_policy: {
            read_only_http: true,
            script_names_only: true,
            ids_counts_and_fixed_statuses_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_store_paths: true,
            no_connection_values: true,
            no_sql_values: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_memory_summaries: true,
            no_relationship_scores: true,
            no_viewer_ids: true,
            no_display_names: true,
            no_candidates: true,
            no_commands: true,
            no_real_db_connection_attempted: true,
            no_store_write_attempted: true,
            no_candidate_commit_attempted: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/persistence-readiness-rehearsal"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_persistence_readiness_rehearsal_http_v1",
          persistence_readiness_rehearsal: createPersistenceReadinessRehearsal({
            env,
            runtime,
            streamState,
          }),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            booleans_counts_and_fixed_statuses_only: true,
            no_secret_values: true,
            no_store_paths: true,
            no_endpoint_values: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_memory_summaries: true,
            no_relationship_scores: true,
            no_viewer_ids: true,
            no_display_names: true,
            no_candidates: true,
            no_commands: true,
            no_raw_runtime_state: true,
            no_commit_side_effects: true,
            read_only_http: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/production/gameplay-preflight") {
        return sendJson(response, 200, {
          ok: true,
          gameplay_preflight: createGameplayPreflightReport({ env }),
        });
      }
      if (request.method === "GET" && url.pathname === "/production/gameplay-launch-plan") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_gameplay_launch_plan_http_v1",
          gameplay_launch_plan: createGameplayLaunchPlan({ env }),
          boundary_policy: {
            safe_local_scripts_only: true,
            env_names_only: true,
            script_names_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_raw_frames: true,
            no_raw_ocr_text: true,
            no_vision_payloads: true,
            no_action_candidates: true,
            no_approved_actions: true,
            no_commands: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/gameplay-local-env-profile"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_gameplay_local_env_profile_http_v1",
          gameplay_local_env_profile: createGameplayLocalEnvProfile(),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            operator_labels_only: true,
            no_env_values: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_raw_frames: true,
            no_raw_ocr_text: true,
            no_vision_payloads: true,
            no_action_candidates: true,
            no_approved_actions: true,
            no_commands: true,
            read_only_http: true,
            print_env_requires_explicit_cli_flag: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/gameplay-local-env-apply-plan"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_gameplay_local_env_apply_plan_http_v1",
          gameplay_local_env_apply_plan: createGameplayLocalEnvApplyPlan({
            applyMode: "dry_run",
          }),
          boundary_policy: {
            env_names_only: true,
            env_counts_only: true,
            file_names_only: true,
            script_names_only: true,
            no_env_values: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_raw_frames: true,
            no_raw_ocr_text: true,
            no_vision_payloads: true,
            no_action_candidates: true,
            no_approved_actions: true,
            no_commands: true,
            no_template_text: true,
            materialization_requires_explicit_cli_flag: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/gameplay-env-setup-plan"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_gameplay_env_setup_plan_http_v1",
          gameplay_env_setup_plan: createGameplayEnvSetupPlan({ env }),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            schema_names_only: true,
            fixed_ids_statuses_and_counts_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_raw_frames: true,
            no_raw_ocr_text: true,
            no_vision_payloads: true,
            no_action_candidates: true,
            no_approved_actions: true,
            no_commands: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/gameplay-startup-checklist"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_gameplay_startup_checklist_http_v1",
          gameplay_startup_checklist: createGameplayStartupChecklist(),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_raw_frames: true,
            no_raw_ocr_text: true,
            no_vision_payloads: true,
            no_action_candidates: true,
            no_approved_actions: true,
            no_commands: true,
            no_control_side_effects: true,
            read_only_http: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/production/gameplay-runtime-status") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_gameplay_runtime_status_http_v1",
          gameplay_runtime_status: createGameplayRuntimeStatusReport({
            env,
            httpIngestScheduler,
            streamState,
            runtime,
          }),
          boundary_policy: {
            env_names_only: true,
            counts_statuses_and_booleans_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_raw_frames: true,
            no_ocr_text: true,
            no_vision_payloads: true,
            no_action_candidates: true,
            no_approved_actions: true,
            no_commands: true,
            no_raw_stream_state: true,
            no_raw_scheduler_results: true,
            read_only_http: true,
            no_polling_side_effects: true,
            script_names_only: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/production/gameplay-live-readiness") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_gameplay_live_readiness_http_v1",
          gameplay_live_readiness: createGameplayLiveReadinessReport({
            env,
            httpIngestScheduler,
            streamState,
            runtime,
          }),
          boundary_policy: {
            env_names_only: true,
            counts_statuses_booleans_and_policy_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_raw_frames: true,
            no_raw_ocr_text: true,
            no_vision_payloads: true,
            no_action_candidates: true,
            no_approved_actions: true,
            no_commands: true,
            no_raw_stream_state: true,
            no_raw_scheduler_results: true,
            read_only_http: true,
            no_polling_side_effects: true,
            no_control_side_effects: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/gameplay-post-start-checklist"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_gameplay_post_start_checklist_http_v1",
          gameplay_post_start_checklist: createGameplayPostStartChecklist({
            env,
            httpIngestScheduler,
            streamState,
            runtime,
          }),
          boundary_policy: {
            script_names_only: true,
            ids_counts_and_fixed_statuses_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_raw_frames: true,
            no_raw_ocr_text: true,
            no_vision_payloads: true,
            no_action_candidates: true,
            no_approved_actions: true,
            no_commands: true,
            no_raw_stream_state: true,
            no_raw_scheduler_results: true,
            no_real_capture_request_attempted: true,
            no_real_game_or_os_input_attempted: true,
            no_action_candidate_forwarded: true,
            no_approved_action_executed: true,
            no_control_side_effects: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/gameplay-readiness-rehearsal"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_gameplay_readiness_rehearsal_http_v1",
          gameplay_readiness_rehearsal: createGameplayReadinessRehearsal({
            env,
            httpIngestScheduler,
            streamState,
            runtime,
          }),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            booleans_counts_and_fixed_statuses_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_raw_frames: true,
            no_raw_ocr_text: true,
            no_vision_payloads: true,
            no_action_candidates: true,
            no_approved_actions: true,
            no_commands: true,
            no_raw_stream_state: true,
            no_raw_scheduler_results: true,
            no_polling_side_effects: true,
            no_control_side_effects: true,
            read_only_http: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/operator-policy-settings"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_operator_policy_settings_http_v1",
          operator_policy_settings: createOperatorPolicySettingsReport({ env }),
          boundary_policy: {
            read_only_http: true,
            env_names_only: true,
            fixed_policy_labels_only: true,
            no_policy_numeric_values: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_raw_viewer_messages: true,
            no_support_message_text: true,
            no_hidden_relationship_scores: true,
            no_candidates: true,
            no_commands: true,
            no_raw_frames: true,
            no_real_device_operation: true,
            no_game_or_os_input: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/admin/operations-summary") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_operations_summary_http_v1",
          admin_operations_summary: await createAdminOperationsSummary({
            env,
            runtime,
            streamState,
            httpIngestScheduler,
            overlayEventBus,
          }),
          boundary_policy: {
            read_only_http: true,
            report_summaries_only: true,
            script_names_and_route_paths_only: true,
            env_names_only: true,
            no_endpoint_values: true,
            no_secret_values: true,
            no_connection_values: true,
            no_policy_payloads: true,
            no_policy_numeric_values: true,
            no_live_payloads: true,
            no_viewer_messages: true,
            no_support_message_text: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_hidden_relationship_scores: true,
            no_candidates: true,
            no_commands: true,
            no_raw_frames: true,
            no_real_process_started: true,
            no_database_connection_attempted: true,
            no_game_or_os_input: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/admin/dashboard") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_dashboard_http_v1",
          admin_dashboard: await createAdminDashboard({
            env,
            runtime,
            streamState,
            httpIngestScheduler,
            overlayEventBus,
          }),
          boundary_policy: {
            read_only_http: true,
            counts_statuses_and_route_paths_only: true,
            operator_language_safe_labels_only: true,
            env_names_only: true,
            no_endpoint_values: true,
            no_secret_values: true,
            no_connection_values: true,
            no_live_payloads: true,
            no_viewer_messages: true,
            no_support_message_text: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_hidden_relationship_scores: true,
            no_candidates: true,
            no_commands: true,
            no_raw_frames: true,
            no_raw_voice_samples: true,
            no_dataset_paths: true,
            no_internal_model_paths: true,
            no_raw_jobs: true,
            no_real_process_started: true,
            no_database_connection_attempted: true,
            no_game_or_os_input: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/admin/public-report-boundary-audit"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_public_report_boundary_audit_http_v1",
          public_report_boundary_audit: createPublicReportBoundaryAuditReport(),
          boundary_policy: publicReportBoundaryAuditHttpBoundaryPolicy(),
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/admin/character-voice-settings/summary"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_character_voice_settings_summary_http_v1",
          anime_performance_matching_summary:
            createAdminCharacterVoiceSettingsAnimePerformanceSummary({ env }),
          boundary_policy: {
            ...adminCharacterVoiceSettingsHttpBoundaryPolicy(),
            compact_summary_only: true,
            counts_statuses_and_script_names_only: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/admin/character-voice-settings"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_character_voice_settings_http_v1",
          admin_character_voice_settings:
            createAdminCharacterVoiceSettingsReport({ env }),
          boundary_policy: adminCharacterVoiceSettingsHttpBoundaryPolicy(),
        });
      }
      if (
        request.method === "POST" &&
        url.pathname === "/admin/character-voice-settings/apply-plan"
      ) {
        const body = await readJson(request);
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_character_voice_settings_apply_plan_http_v1",
          admin_character_voice_settings_apply_plan:
            createAdminCharacterVoiceSettingsApplyPlan({ body }),
          boundary_policy: {
            ...adminCharacterVoiceSettingsHttpBoundaryPolicy(),
            dry_run_only: true,
            no_store_write: true,
            no_runtime_change: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/admin/integration-checklist"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_integration_checklist_http_v1",
          admin_integration_checklist: createAdminIntegrationChecklist({
            env,
            idleScheduler,
            httpIngestScheduler,
            overlayEventBus,
          }),
          boundary_policy: {
            read_only_http: true,
            env_names_and_counts_only: true,
            script_names_only: true,
            fixed_status_labels_only: true,
            no_endpoint_values: true,
            no_secret_values: true,
            no_connection_values: true,
            no_live_payloads: true,
            no_viewer_messages: true,
            no_support_message_text: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_hidden_relationship_scores: true,
            no_candidates: true,
            no_commands: true,
            no_raw_frames: true,
            no_raw_voice_samples: true,
            no_dataset_paths: true,
            no_internal_model_paths: true,
            no_raw_jobs: true,
            no_real_process_started: true,
            no_database_connection_attempted: true,
            no_game_or_os_input: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/admin/safety-controls") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_safety_controls_http_v1",
          admin_safety_controls: createAdminSafetyControlsReport({
            store: adminSafetyControlStore,
          }),
          boundary_policy: adminSafetyControlsHttpBoundaryPolicy(),
        });
      }
      if (request.method === "GET" && url.pathname === "/admin/review-queue") {
        const limit = Number(url.searchParams.get("limit") ?? 50);
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_review_queue_http_v1",
          admin_review_queue: createAdminReviewQueueReport({
            reviewItems: runtime.candidateReviewItems(Number.isFinite(limit) ? limit : 50),
            limit: Number.isFinite(limit) ? limit : 50,
          }),
          boundary_policy: adminReviewQueueHttpBoundaryPolicy(),
        });
      }
      if (request.method === "POST" && url.pathname === "/admin/review-queue/action-plan") {
        const body = await readJson(request);
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_review_queue_action_plan_http_v1",
          admin_review_queue_action_plan: createAdminReviewQueueActionPlan({
            body,
            reviewItems: runtime.candidateReviewItems(200),
          }),
          boundary_policy: {
            ...adminReviewQueueHttpBoundaryPolicy(),
            dry_run_only: true,
            no_store_write: true,
            no_validator_commit: true,
          },
        });
      }
      if (request.method === "POST" && url.pathname === "/admin/review-queue/decision") {
        const body = await readJson(request);
        const result = applyAdminReviewQueueDecision({
          store: reviewDecisionStore,
          body,
          reviewItems: runtime.candidateReviewItems(200),
          actorRole: body?.actor_role ?? "operator",
          confirmed: body?.confirmed === true,
        });
        return sendJson(response, result.recorded ? 200 : 409, {
          ok: result.recorded,
          schema: "iris_admin_review_queue_decision_http_v1",
          admin_review_queue_decision: result,
          admin_review_decision_log_status:
            typeof reviewDecisionStore.status === "function"
              ? reviewDecisionStore.status()
              : null,
          admin_review_queue: createAdminReviewQueueReport({
            reviewItems: runtime.candidateReviewItems(50),
          }),
          boundary_policy: {
            ...adminReviewQueueHttpBoundaryPolicy(),
            explicit_confirmation_required: true,
            decision_summary_only: true,
            no_memory_or_relationship_store_write: true,
            no_validator_commit: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/admin/review-queue/decision-log-status"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_review_decision_log_status_http_v1",
          admin_review_decision_log_status:
            typeof reviewDecisionStore.status === "function"
              ? reviewDecisionStore.status()
              : {
                  schema: "iris_admin_review_decision_log_status_v1",
                  health: "ready",
                  store_available: true,
                  read_error: false,
                  error_kind: null,
                  entry_count: reviewDecisionStore.summary().decision_count,
                  latest_decision_at_ms: null,
                  action_counts: {
                    approve_memory_candidate:
                      reviewDecisionStore.summary().approve_memory_count,
                    reject_memory_candidate:
                      reviewDecisionStore.summary().reject_memory_count,
                    approve_relationship_candidate:
                      reviewDecisionStore.summary().approve_relationship_count,
                    reject_relationship_candidate:
                      reviewDecisionStore.summary().reject_relationship_count,
                  },
                  max_entries: 200,
                  retention_enabled: true,
                  recovery: "in_memory",
                  boundary_policy: adminReviewDecisionLogHttpBoundaryPolicy(),
                },
          boundary_policy: adminReviewDecisionLogHttpBoundaryPolicy(),
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/admin/review-queue/auth-gate"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_review_auth_gate_http_v1",
          admin_review_auth_gate: createAdminReviewAuthGateReport({
            env,
            actorRole: url.searchParams.get("actor_role") ?? "operator",
          }),
          boundary_policy: adminReviewAuthGateHttpBoundaryPolicy(),
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/admin/review-queue/validator-handoff"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_review_validator_handoff_http_v1",
          admin_review_validator_handoff:
            createAdminReviewValidatorHandoffReport({
              decisionLog: reviewDecisionStore,
              reviewItems: runtime.candidateReviewItems(200),
            }),
          boundary_policy: adminReviewValidatorHandoffHttpBoundaryPolicy(),
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/admin/review-queue/validator-preflight"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_review_validator_preflight_http_v1",
          admin_review_validator_preflight:
            createAdminReviewValidatorPreflight({
              decisionLog: reviewDecisionStore,
              reviewItems: runtime.candidateReviewItems(200),
            }),
          boundary_policy: adminReviewValidatorPreflightHttpBoundaryPolicy(),
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/admin/review-queue/validator-run-plan"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_admin_review_validator_run_plan_http_v1",
          admin_review_validator_run_plan:
            createAdminReviewValidatorRunPlan({
              decisionLog: reviewDecisionStore,
              reviewItems: runtime.candidateReviewItems(200),
              env,
              actorRole: url.searchParams.get("actor_role") ?? "operator",
            }),
          boundary_policy: adminReviewValidatorRunPlanHttpBoundaryPolicy(),
        });
      }
      if (request.method === "POST" && url.pathname === "/admin/safety-controls/action") {
        const body = await readJson(request);
        const result = applyAdminSafetyControlAction({
          store: adminSafetyControlStore,
          action: body?.action,
          actorRole: body?.actor_role ?? "operator",
          confirmed: body?.confirmed === true,
        });
        if (result.applied) {
          if (body?.action === "emergency_stop") {
            idleScheduler?.stop?.();
            httpIngestScheduler?.stop?.();
            httpIngestScheduler?.setSupportEventsPaused?.(true);
            httpIngestScheduler?.setSourcePaused?.("game_observation", true);
            httpIngestScheduler?.setSourcePaused?.("media_watch", true);
            httpIngestScheduler?.setSourcePaused?.("external_topic", true);
            runtime.setGameActionApprovalPaused?.(true);
            runtime.setAdapterHandoffPaused?.("tts", true);
            runtime.setAdapterHandoffPaused?.("live2d", true);
            runtime.setAdapterHandoffPaused?.("subtitle", true);
            runtime.setCandidateMemoryCommitPaused?.(true);
            runtime.setCandidateRelationshipCommitPaused?.(true);
          }
          if (body?.action === "resume_safe_local_operation") {
            idleScheduler?.start?.();
            httpIngestScheduler?.setSupportEventsPaused?.(false);
            httpIngestScheduler?.setSourcePaused?.("game_observation", false);
            httpIngestScheduler?.setSourcePaused?.("media_watch", false);
            httpIngestScheduler?.setSourcePaused?.("external_topic", false);
            httpIngestScheduler?.start?.();
            runtime.setGameActionApprovalPaused?.(false);
            runtime.setAdapterHandoffPaused?.("tts", false);
            runtime.setAdapterHandoffPaused?.("live2d", false);
            runtime.setAdapterHandoffPaused?.("subtitle", false);
            runtime.setCandidateMemoryCommitPaused?.(false);
            runtime.setCandidateRelationshipCommitPaused?.(false);
          }
          if (body?.action === "pause_youtube_ingest") {
            httpIngestScheduler?.setSourcePaused?.("live_chat", true);
          }
          if (body?.action === "resume_youtube_ingest" && !isEmergencyStopActive()) {
            httpIngestScheduler?.setSourcePaused?.("live_chat", false);
            httpIngestScheduler?.start?.();
          }
          if (body?.action === "pause_support_ingest") {
            httpIngestScheduler?.setSupportEventsPaused?.(true);
          }
          if (body?.action === "resume_support_ingest" && !isEmergencyStopActive()) {
            httpIngestScheduler?.setSupportEventsPaused?.(false);
          }
          if (body?.action === "pause_game_action_approval") {
            runtime.setGameActionApprovalPaused?.(true);
          }
          if (body?.action === "resume_game_action_approval" && !isEmergencyStopActive()) {
            runtime.setGameActionApprovalPaused?.(false);
          }
          if (body?.action === "pause_tts") {
            runtime.setAdapterHandoffPaused?.("tts", true);
          }
          if (body?.action === "resume_tts" && !isEmergencyStopActive()) {
            runtime.setAdapterHandoffPaused?.("tts", false);
          }
          if (body?.action === "pause_live2d") {
            runtime.setAdapterHandoffPaused?.("live2d", true);
          }
          if (body?.action === "resume_live2d" && !isEmergencyStopActive()) {
            runtime.setAdapterHandoffPaused?.("live2d", false);
          }
          if (body?.action === "pause_subtitle") {
            runtime.setAdapterHandoffPaused?.("subtitle", true);
          }
          if (body?.action === "resume_subtitle" && !isEmergencyStopActive()) {
            runtime.setAdapterHandoffPaused?.("subtitle", false);
          }
          if (body?.action === "pause_memory_commits") {
            runtime.setCandidateMemoryCommitPaused?.(true);
          }
          if (body?.action === "resume_memory_commits" && !isEmergencyStopActive()) {
            runtime.setCandidateMemoryCommitPaused?.(false);
          }
          if (body?.action === "pause_relationship_commits") {
            runtime.setCandidateRelationshipCommitPaused?.(true);
          }
          if (body?.action === "resume_relationship_commits" && !isEmergencyStopActive()) {
            runtime.setCandidateRelationshipCommitPaused?.(false);
          }
          if (body?.action === "pause_game_observation") {
            httpIngestScheduler?.setSourcePaused?.("game_observation", true);
          }
          if (body?.action === "resume_game_observation" && !isEmergencyStopActive()) {
            httpIngestScheduler?.setSourcePaused?.("game_observation", false);
          }
          if (body?.action === "pause_external_topic_ingest") {
            httpIngestScheduler?.setSourcePaused?.("external_topic", true);
          }
          if (body?.action === "resume_external_topic_ingest" && !isEmergencyStopActive()) {
            httpIngestScheduler?.setSourcePaused?.("external_topic", false);
          }
          if (body?.action === "pause_media_watch_ingest") {
            httpIngestScheduler?.setSourcePaused?.("media_watch", true);
          }
          if (body?.action === "resume_media_watch_ingest" && !isEmergencyStopActive()) {
            httpIngestScheduler?.setSourcePaused?.("media_watch", false);
          }
        }
        return sendJson(response, result.applied ? 200 : 409, {
          ok: result.applied,
          schema: "iris_admin_safety_control_action_http_v1",
          admin_safety_control_action: result,
          admin_safety_controls: createAdminSafetyControlsReport({
            store: adminSafetyControlStore,
          }),
          boundary_policy: adminSafetyControlsHttpBoundaryPolicy(),
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/admin/operator-policy/apply-plan"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_operator_policy_admin_apply_plan_http_v1",
          operator_policy_admin_apply_plan: createOperatorPolicyAdminApplyPlan({
            body: {
              dry_run: true,
              setting_id: "donation_amount_proportional_formula",
              setting_group: "relationship_delta",
              policy_version: "v1",
              policy_config: {
                formula_id: "bounded_amount_proportional_growth",
                amount_basis: "support_amount_tier",
                cap_policy: "per_event_stream_day_window",
              },
              summary_label: "operator policy dry run validated",
            },
          }),
          boundary_policy: {
            dry_run_only: true,
            read_only_http: true,
            no_store_write: true,
            no_postgres_write: true,
            no_policy_payloads: true,
            no_policy_numeric_values: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_viewer_messages: true,
            no_support_message_text: true,
            no_hidden_relationship_scores: true,
            no_candidates: true,
            no_commands: true,
            no_raw_frames: true,
            no_game_or_os_input: true,
          },
        });
      }
      if (
        request.method === "POST" &&
        url.pathname === "/admin/operator-policy/apply-plan"
      ) {
        const body = await readJson(request);
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_operator_policy_admin_apply_plan_http_v1",
          operator_policy_admin_apply_plan: createOperatorPolicyAdminApplyPlan({
            body,
          }),
          boundary_policy: {
            dry_run_only: true,
            read_only_http: true,
            no_store_write: true,
            no_postgres_write: true,
            no_policy_payloads: true,
            no_policy_numeric_values: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_viewer_messages: true,
            no_support_message_text: true,
            no_hidden_relationship_scores: true,
            no_candidates: true,
            no_commands: true,
            no_raw_frames: true,
            no_game_or_os_input: true,
          },
        });
      }
      if (
        request.method === "POST" &&
        url.pathname === "/admin/operator-policy/async-save-gate"
      ) {
        const body = await readJson(request);
        if (typeof operatorPolicyAsyncSaveGate !== "function") {
          return sendJson(response, 503, {
            ok: false,
            schema: "iris_operator_policy_admin_async_save_gate_http_v1",
            save_status: "blocked",
            blocked_reasons: ["private_async_save_gate_not_injected"],
            boundary_policy: createOperatorPolicyAsyncSaveHttpBoundary(),
          });
        }
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_operator_policy_admin_async_save_gate_http_v1",
          operator_policy_admin_async_save_gate:
            await operatorPolicyAsyncSaveGate({ body }),
          boundary_policy: createOperatorPolicyAsyncSaveHttpBoundary(),
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/operator-policy-async-save-gate-roundtrip"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_operator_policy_async_save_gate_roundtrip_http_v1",
          operator_policy_async_save_gate_roundtrip:
            await createOperatorPolicyAsyncSaveGateRoundtripCliReport(),
          boundary_policy: {
            read_only_http: true,
            local_temp_store_only: true,
            mock_postgres_only: true,
            script_names_only: true,
            public_summaries_only: true,
            no_real_database_connection: true,
            no_db_connection_attempted: true,
            no_pool_created: true,
            no_policy_payloads: true,
            no_policy_numeric_values: true,
            no_secret_values: true,
            no_connection_values: true,
            no_endpoint_values: true,
            no_candidates: true,
            no_commands: true,
            no_raw_frames: true,
            no_game_or_os_input: true,
          },
        });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/production/gameplay-validation-gate-roundtrip"
      ) {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_gameplay_validation_gate_roundtrip_http_v1",
          gameplay_validation_gate_roundtrip:
            await createGameplayValidationGateRoundtripReport({ baseEnv: env }),
          boundary_policy: {
            local_fixture_only: true,
            low_confidence_blocks_before_adapter: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_raw_frames: true,
            no_raw_ocr_text: true,
            no_vision_payloads: true,
            no_action_candidates: true,
            no_approved_actions: true,
            no_commands: true,
            no_raw_stream_state: true,
            no_raw_scheduler_results: true,
            no_real_game_input: true,
            read_only_http: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/production/live-readiness") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_production_live_readiness_http_v1",
          production_live_readiness: await createProductionLiveReadinessReport({
            env,
            runtime,
            streamState,
            httpIngestScheduler,
            overlayEventBus,
            probeMode: "dry_run",
          }),
          boundary_policy: {
            env_names_only: true,
            script_names_only: true,
            counts_statuses_booleans_and_policy_only: true,
            no_secret_values: true,
            no_endpoint_values: true,
            no_live_payloads: true,
            no_text_payloads: true,
            no_memory_records: true,
            no_relationship_records: true,
            no_candidates: true,
            no_commands: true,
            no_raw_frames: true,
            no_raw_scheduler_results: true,
            no_raw_stream_state: true,
            read_only_http: true,
            health_probe_gets_only: true,
            no_polling_side_effects: true,
            no_control_side_effects: true,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/production/probe") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_production_probe_http_v1",
          production_probe: await createProductionProbeReport({ env }),
          boundary_policy: productionProbeHttpBoundaryPolicy(),
        });
      }
      if (request.method === "POST" && url.pathname === "/production/probe") {
        const body = await readJson(request);
        const mode = body?.mode === "fixture_post" ? "fixture_post" : "dry_run";
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_production_probe_http_v1",
          production_probe: await createProductionProbeReport({
            env,
            mode,
            fetchImpl: globalThis.fetch,
          }),
          boundary_policy: productionProbeHttpBoundaryPolicy(),
        });
      }
      if (request.method === "GET" && url.pathname === "/persistence/status") {
        return sendJson(response, 200, {
          ok: true,
          persistence_status: createPersistenceStatus({
            capabilities: runtime.capabilities?.() ?? {},
            memoryRecordCount: runtime.memoryRecords?.(10_000)?.length ?? 0,
            relationshipProfileCount: runtime.relationshipProfiles?.()?.length ?? 0,
            replayEntryCount: runtime.replayEntries?.(10_000)?.length ?? 0,
            candidateReviewStats: runtime.candidateReviewStats?.() ?? null,
            memoryStoreStatus: runtime.memoryStoreStatus?.() ?? null,
            relationshipStoreStatus: runtime.relationshipStoreStatus?.() ?? null,
          }),
        });
      }
      if (request.method === "GET" && url.pathname === "/integrations/status") {
        return sendJson(response, 200, {
          ok: true,
          integration_status: createIntegrationStatus({
            env,
            idleScheduler,
            httpIngestScheduler,
            overlayEventBus,
          }),
        });
      }
      if (request.method === "GET" && url.pathname === "/integrations/contracts") {
        return sendJson(response, 200, {
          ok: true,
          integration_contracts: createIntegrationContracts(),
        });
      }
      if (request.method === "GET" && url.pathname === "/integrations/fixtures") {
        return sendJson(response, 200, {
          ok: true,
          integration_fixtures: createIntegrationFixtures(),
        });
      }
      if (request.method === "POST" && url.pathname === "/integrations/probe") {
        const body = await readJson(request);
        const mode = body?.mode === "fixture_post" ? "fixture_post" : "dry_run";
        return sendJson(response, 200, {
          ok: true,
          integration_probe: await createIntegrationProbeReport({
            env,
            mode,
            fetchImpl: globalThis.fetch,
          }),
        });
      }
      if (request.method === "GET" && url.pathname === "/relationships") {
        const level = url.searchParams.get("level") ?? "";
        const query = url.searchParams.get("query") ?? url.searchParams.get("q") ?? "";
        return sendJson(response, 200, {
          ok: true,
          profiles: filterPublicRelationshipProfiles(runtime.relationshipProfiles(), {
            level,
            query,
          }),
          filters: {
            level: level || null,
            query: query || null,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/memories") {
        const limit = Number(url.searchParams.get("limit") ?? 50);
        const type = url.searchParams.get("type") ?? "";
        const ownerScope = url.searchParams.get("owner_scope") ?? "";
        const query = url.searchParams.get("query") ?? url.searchParams.get("q") ?? "";
        const records = runtime.memoryRecords(Number.isFinite(limit) ? limit : 50);
        return sendJson(response, 200, {
          ok: true,
          records: filterPublicMemoryRecords(records, { type, ownerScope, query }),
          filters: {
            type: type || null,
            owner_scope: ownerScope || null,
            query: query || null,
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/memory-search") {
        const query = url.searchParams.get("query") ?? url.searchParams.get("q") ?? "";
        const limit = Number(url.searchParams.get("limit") ?? 5);
        return sendJson(response, 200, {
          ok: true,
          result:
            (await runtime.memorySearch?.(query, Number.isFinite(limit) ? limit : 5)) ?? null,
        });
      }
      if (request.method === "GET" && url.pathname === "/candidate-reviews") {
        const limit = Number(url.searchParams.get("limit") ?? 50);
        return sendJson(response, 200, {
          ok: true,
          stats: runtime.candidateReviewStats(),
          items: runtime.candidateReviewItems(Number.isFinite(limit) ? limit : 50),
        });
      }
      if (request.method === "POST" && url.pathname === "/candidate-reviews/clear") {
        return sendJson(response, 200, {
          ok: true,
          stats: runtime.clearCandidateReviews(),
        });
      }
      if (request.method === "GET" && url.pathname === "/replay") {
        const limit = Number(url.searchParams.get("limit") ?? 50);
        return sendJson(response, 200, {
          ok: true,
          entries: runtime.replayEntries(Number.isFinite(limit) ? limit : 50),
        });
      }
      if (request.method === "GET" && url.pathname === "/idle/status") {
        return sendJson(response, 200, {
          ok: true,
          idle_scheduler: idleScheduler?.status?.() ?? null,
        });
      }
      if (request.method === "GET" && url.pathname === "/ingest/status") {
        return sendJson(response, 200, {
          ok: true,
          http_ingest_scheduler: httpIngestScheduler?.status?.() ?? null,
        });
      }
      if (request.method === "GET" && url.pathname === "/overlay") {
        return sendHtml(response, 200, renderOverlayPage());
      }
      if (request.method === "GET" && url.pathname === "/overlay/status") {
        return sendJson(response, 200, {
          ok: true,
          overlay_status: createOverlayStatus(streamState.get()),
        });
      }
      if (request.method === "GET" && url.pathname === "/event-render-manifests/status") {
        const storeStatus = createLocalBridgeEventRenderManifestStoreStatus({
          artifactDir:
            env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR || "data/local_bridge_artifacts",
        });
        return sendJson(response, 200, {
          ok: true,
          event_render_manifest_store: createPublicLocalBridgeRenderManifestStoreStatus(
            storeStatus
          ),
        });
      }
      if (request.method === "GET" && url.pathname === "/event-render-manifests/latest") {
        if (isObsHandoffPaused()) {
          return sendJson(response, 409, createObsHandoffPausedResponse());
        }
        const report = createLocalBridgeRenderManifestOperatorReport({
          artifactDir:
            env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR || "data/local_bridge_artifacts",
          showLocalPaths: false,
          maxManifestAgeMs: env.IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS ?? null,
          maxArtifactRenderSkewMs:
            env.IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS ?? null,
        });
        const publicReport = createPublicLocalBridgeRenderManifestReport(report);
        return sendJson(response, 200, {
          ok: report.ok,
          event_render_manifest_report: publicReport,
        });
      }
      const latestArtifactKind = LATEST_ARTIFACT_PATHS.get(url.pathname);
      if (
        request.method === "GET" &&
        url.pathname.startsWith("/event-render-manifests/latest/artifact/")
      ) {
        if (!latestArtifactKind) {
          return sendJson(
            response,
            getLocalArtifactErrorStatusCode("missing_artifact"),
            createLocalArtifactErrorResponse("missing_artifact")
          );
        }
      }
      if (request.method === "GET" && latestArtifactKind) {
        if (isObsHandoffPaused()) {
          return sendJson(response, 409, createObsHandoffPausedResponse());
        }
        if (latestArtifactKind === "tts" && isTtsHandoffPaused()) {
          return sendJson(response, 409, createAdapterHandoffPausedResponse("tts"));
        }
        if (latestArtifactKind === "live2d" && isLive2dHandoffPaused()) {
          return sendJson(response, 409, createAdapterHandoffPausedResponse("live2d"));
        }
        if (latestArtifactKind === "subtitle" && isSubtitleHandoffPaused()) {
          return sendJson(response, 409, createAdapterHandoffPausedResponse("subtitle"));
        }
        const artifact = readLatestRenderArtifact({
          artifactDir:
            env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR || "data/local_bridge_artifacts",
          adapterKind: latestArtifactKind,
          maxRenderManifestAgeMs: env.IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS ?? null,
          maxArtifactRenderSkewMs:
            env.IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS ?? null,
          expectedManifestId: url.searchParams.get("manifest_id") ?? "",
          allowPartialVisualArtifacts: url.searchParams.get("allow_partial_visual") === "true",
        });
        if (!artifact.ok) {
          return sendJson(
            response,
            getLocalArtifactErrorStatusCode(artifact.error_kind),
            createLocalArtifactErrorResponse(artifact.error_kind)
          );
        }
        return sendBytes(response, 200, artifact.bytes, {
          "content-type": artifact.content_type,
          "content-length": artifact.bytes.length,
          "x-iris-adapter-kind": artifact.adapter_kind,
          "x-iris-artifact-kind": artifact.artifact_kind,
          "x-iris-artifact-byte-hash": artifact.byte_hash,
          "x-iris-manifest-id": artifact.manifest_id,
          "x-iris-manifest-id-present":
            String(artifact.manifest_id ?? "").trim() !== "" ? "true" : "false",
          "x-iris-event-id": artifact.event_id,
          "x-iris-event-id-present":
            String(artifact.event_id ?? "").trim() !== "" ? "true" : "false",
          "x-iris-rendered-at-ms": artifact.rendered_at_ms,
          "cache-control": "no-store",
        });
      }
      if (request.method === "GET" && url.pathname === "/obs/browser-source") {
        return sendJson(response, 200, {
          ok: true,
          obs_overlay_config: createObsOverlayConfigFromEnv(env, {
            fallbackOrigin: `http://${request.headers.host ?? "127.0.0.1:8787"}`,
          }),
        });
      }
      if (request.method === "GET" && url.pathname === "/overlay/event") {
        if (isObsHandoffPaused()) {
          return sendJson(response, 409, createObsHandoffPausedResponse());
        }
        const event = getCurrentOverlayDisplayEvent();
        return sendJson(response, 200, {
          ok: true,
          overlay_event: event,
        });
      }
      if (request.method === "GET" && url.pathname === "/overlay/events/status") {
        return sendJson(response, 200, {
          ok: true,
          overlay_event_stream: overlayEventBus?.status?.() ?? null,
        });
      }
      if (request.method === "GET" && url.pathname === "/overlay/events") {
        if (isObsHandoffPaused()) {
          return sendJson(response, 409, createObsHandoffPausedResponse());
        }
        if (!overlayEventBus?.latest?.()) {
          overlayEventBus?.publish?.(createOverlayDisplayEvent(streamState.get()));
        }
        const heartbeatMs = Number(url.searchParams.get("heartbeat_ms") ?? 15_000);
        const unsubscribe = overlayEventBus?.subscribe?.(response, {
          sendInitial: true,
          heartbeatMs,
        });
        request.on("close", () => unsubscribe?.());
        return;
      }
      if (request.method === "GET" && url.pathname === "/admin") {
        return sendHtml(response, 200, renderAdminDashboardPage());
      }
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/debug")) {
        return sendHtml(response, 200, renderDebugPage());
      }
      if (request.method === "POST" && url.pathname === "/comment") {
        if (isYouTubeIngestPaused()) {
          return sendJson(response, 409, createYouTubeIngestPausedResponse());
        }
        const body = await readJson(request);
        const event = normalizeYouTubeComment({
          ...body,
          display_name: body.display_name ?? "http_viewer",
          author_channel_id: body.author_channel_id ?? "http",
          text: body.text ?? "",
        });
        const result = await runtime.processEvent(event);
        const state = updateStateFromResult(result);
        return sendJson(response, 200, {
          ok: true,
          final_text: result.core.phase15.final_text,
          final_decision: result.core.phase15.final_decision,
          state,
        });
      }
      if (request.method === "POST" && url.pathname === "/game-observation") {
        if (isGameObservationPaused()) {
          return sendJson(response, 409, createGameObservationPausedResponse());
        }
        const body = await readJson(request);
        const event = normalizeGameObservation(body);
        const result = await runtime.processEvent(event);
        const state = updateStateFromResult(result);
        return sendJson(response, 200, {
          ok: true,
          final_text: result.core.phase15.final_text,
          final_decision: result.core.phase15.final_decision,
          state,
        });
      }
      if (request.method === "POST" && url.pathname === "/donation") {
        if (isYouTubeIngestPaused()) {
          return sendJson(response, 409, createYouTubeIngestPausedResponse());
        }
        if (isSupportIngestPaused()) {
          return sendJson(response, 409, createSupportIngestPausedResponse());
        }
        const body = await readJson(request);
        const event = normalizeYouTubeDonation(body);
        const result = await runtime.processEvent(event);
        const state = updateStateFromResult(result);
        return sendJson(response, 200, {
          ok: true,
          final_text: result.core.phase15.final_text,
          final_decision: result.core.phase15.final_decision,
          state,
        });
      }
      if (request.method === "POST" && url.pathname === "/media-watch") {
        if (isMediaWatchIngestPaused()) {
          return sendJson(response, 409, createMediaWatchIngestPausedResponse());
        }
        const body = await readJson(request);
        const event = normalizeMediaWatchObservation(body);
        const result = await runtime.processEvent(event);
        const state = updateStateFromResult(result);
        return sendJson(response, 200, {
          ok: true,
          final_text: result.core.phase15.final_text,
          final_decision: result.core.phase15.final_decision,
          state,
        });
      }
      if (request.method === "POST" && url.pathname === "/external-topic") {
        if (isExternalTopicIngestPaused()) {
          return sendJson(response, 409, createExternalTopicIngestPausedResponse());
        }
        const body = await readJson(request);
        const event = normalizeExternalTopicObservation(body);
        const result = await runtime.processEvent(event);
        const state = updateStateFromResult(result);
        return sendJson(response, 200, {
          ok: true,
          final_text: result.core.phase15.final_text,
          final_decision: result.core.phase15.final_decision,
          state,
        });
      }
      if (request.method === "POST" && url.pathname === "/idle-tick") {
        if (isEmergencyStopActive()) {
          return sendJson(response, 409, createEmergencyStopActiveResponse());
        }
        const body = await readJson(request);
        const scheduled = idleScheduler
          ? await idleScheduler.tickNow?.(body.idle_reason ?? "manual_http_idle_tick")
          : null;
        if (scheduled && scheduled.ok === false) {
          return sendJson(response, 500, scheduled);
        }
        const result = scheduled?.result ?? (await runtime.processEvent(normalizeIdlePresenceEvent(body)));
        const state = scheduled?.state ?? updateStateFromResult(result);
        overlayEventBus?.publish?.(createOverlayDisplayEvent(state));
        return sendJson(response, 200, {
          ok: true,
          final_text: result.core.phase15.final_text,
          final_decision: result.core.phase15.final_decision,
          state,
        });
      }
      if (request.method === "POST" && url.pathname === "/idle/start") {
        if (isEmergencyStopActive()) {
          return sendJson(response, 409, createEmergencyStopActiveResponse());
        }
        return sendJson(response, 200, {
          ok: true,
          idle_scheduler: idleScheduler?.start?.() ?? null,
        });
      }
      if (request.method === "POST" && url.pathname === "/idle/stop") {
        return sendJson(response, 200, {
          ok: true,
          idle_scheduler: idleScheduler?.stop?.() ?? null,
        });
      }
      if (request.method === "POST" && url.pathname === "/ingest/tick") {
        if (isEmergencyStopActive()) {
          return sendJson(response, 409, createEmergencyStopActiveResponse());
        }
        const body = await readJson(request);
        const tick = await httpIngestScheduler?.tickNow?.(
          body.reason ?? "manual_http_ingest_tick"
        );
        if (!tick) {
          return sendJson(response, 400, {
            ok: false,
            error: "http_ingest_scheduler_not_configured",
          });
        }
        return sendJson(response, tick.ok ? 200 : 500, tick);
      }
      if (request.method === "POST" && url.pathname === "/ingest/start") {
        if (isEmergencyStopActive()) {
          return sendJson(response, 409, createEmergencyStopActiveResponse());
        }
        return sendJson(response, 200, {
          ok: true,
          http_ingest_scheduler: httpIngestScheduler?.start?.() ?? null,
        });
      }
      if (request.method === "POST" && url.pathname === "/ingest/stop") {
        return sendJson(response, 200, {
          ok: true,
          http_ingest_scheduler: httpIngestScheduler?.stop?.() ?? null,
        });
      }
      if (request.method === "POST" && url.pathname === "/scenario/run") {
        if (isEmergencyStopActive()) {
          return sendJson(response, 409, createEmergencyStopActiveResponse());
        }
        const body = await readJson(request);
        const scenario = normalizeScenarioRequest(body);
        let latestState = streamState.get();
        const scenarioResult = await runScenario(runtime, scenario, {
          includeRawResult: false,
          onStepResult({ result }) {
            latestState = updateStateFromResult(result);
          },
        });
        const last = scenarioResult.results.at(-1) ?? null;
        return sendJson(response, 200, {
          ok: true,
          ...scenarioResult,
          final_text: last?.final_text ?? "",
          final_decision: last?.final_decision ?? null,
          state: latestState,
        });
      }
      return sendJson(response, 404, { ok: false, error: "not_found" });
    } catch (error) {
      const errorKind = classifyHttpServerError(error);
      const statusCode = getHttpServerErrorStatusCode(error, errorKind);
      if (statusCode >= 500) logger.error?.(error);
      return sendJson(response, statusCode, createSafeHttpErrorResponse(errorKind));
    }
  });

  function getCurrentOverlayDisplayEvent() {
    const latestEvent = overlayEventBus?.latest?.();
    if (latestEvent) return latestEvent;
    const event = createOverlayDisplayEvent(streamState.get());
    overlayEventBus?.publish?.(event);
    return event;
  }

  function isObsHandoffPaused() {
    const state = adminSafetyControlStore?.getState?.();
    return state?.emergency_stop_active === true || state?.obs_handoff_paused === true;
  }

  function isEmergencyStopActive() {
    return adminSafetyControlStore?.getState?.().emergency_stop_active === true;
  }

  function createEmergencyStopActiveResponse() {
    return {
      ok: false,
      error: "emergency_stop_active",
      boundary_policy: {
        safe_control_state_only: true,
        no_live_payloads: true,
        no_raw_stream_state: true,
        no_commands: true,
      },
    };
  }

  function createObsHandoffPausedResponse() {
    return {
      ok: false,
      error: "obs_handoff_paused",
      boundary_policy: {
        safe_control_state_only: true,
        no_raw_stream_state: true,
        no_raw_overlay_events: true,
        no_artifact_bodies: true,
      },
    };
  }

  function isYouTubeIngestPaused() {
    const state = adminSafetyControlStore?.getState?.();
    return state?.emergency_stop_active === true || state?.youtube_ingest_paused === true;
  }

  function createYouTubeIngestPausedResponse() {
    return {
      ok: false,
      error: "youtube_ingest_paused",
      boundary_policy: {
        safe_control_state_only: true,
        no_live_payloads: true,
        no_platform_cursor_values: true,
        no_support_message_text: true,
      },
    };
  }

  function isSupportIngestPaused() {
    const state = adminSafetyControlStore?.getState?.();
    return state?.emergency_stop_active === true || state?.support_ingest_paused === true;
  }

  function createSupportIngestPausedResponse() {
    return {
      ok: false,
      error: "support_ingest_paused",
      boundary_policy: {
        safe_control_state_only: true,
        no_live_payloads: true,
        no_support_message_text: true,
        no_support_amount_values: true,
      },
    };
  }

  function isGameObservationPaused() {
    const state = adminSafetyControlStore?.getState?.();
    return state?.emergency_stop_active === true || state?.game_observation_paused === true;
  }

  function createGameObservationPausedResponse() {
    return {
      ok: false,
      error: "game_observation_paused",
      boundary_policy: {
        safe_control_state_only: true,
        no_raw_frames: true,
        no_game_or_os_input: true,
        no_live_payloads: true,
      },
    };
  }

  function isExternalTopicIngestPaused() {
    const state = adminSafetyControlStore?.getState?.();
    return state?.emergency_stop_active === true || state?.external_topic_ingest_paused === true;
  }

  function isMediaWatchIngestPaused() {
    const state = adminSafetyControlStore?.getState?.();
    return state?.emergency_stop_active === true || state?.media_watch_ingest_paused === true;
  }

  function createExternalTopicIngestPausedResponse() {
    return {
      ok: false,
      error: "external_topic_ingest_paused",
      boundary_policy: {
        safe_control_state_only: true,
        no_live_payloads: true,
        no_endpoint_values: true,
        no_raw_topic_payloads: true,
      },
    };
  }

  function createMediaWatchIngestPausedResponse() {
    return {
      ok: false,
      error: "media_watch_ingest_paused",
      boundary_policy: {
        safe_control_state_only: true,
        no_live_payloads: true,
        no_media_payloads: true,
        no_endpoint_values: true,
      },
    };
  }

  function isTtsHandoffPaused() {
    const state = adminSafetyControlStore?.getState?.();
    return state?.emergency_stop_active === true || state?.tts_paused === true;
  }

  function isLive2dHandoffPaused() {
    const state = adminSafetyControlStore?.getState?.();
    return state?.emergency_stop_active === true || state?.live2d_paused === true;
  }

  function isSubtitleHandoffPaused() {
    const state = adminSafetyControlStore?.getState?.();
    return state?.emergency_stop_active === true || state?.subtitle_paused === true;
  }

  function createAdapterHandoffPausedResponse(adapterKind) {
    return {
      ok: false,
      error: `${adapterKind}_handoff_paused`,
      boundary_policy: {
        safe_control_state_only: true,
        no_artifact_bodies: true,
        no_raw_jobs: true,
        no_live_payloads: true,
      },
    };
  }

  return server;
}

export function listen(server, { port = 8787, host = "127.0.0.1" } = {}) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve(server.address());
    });
  });
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function sendHtml(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(body);
}

function sendBytes(response, statusCode, bytes, headers) {
  response.writeHead(statusCode, headers);
  response.end(bytes);
}

function createPublicLocalBridgeRenderManifestReport(report) {
  const storeStatus =
    report.store_status && typeof report.store_status === "object"
      ? createPublicLocalBridgeRenderManifestStoreStatus(report.store_status)
      : report.store_status;
  const latestManifestSummary =
    report.latest_manifest_summary && typeof report.latest_manifest_summary === "object"
      ? { ...report.latest_manifest_summary }
      : report.latest_manifest_summary;
  if (latestManifestSummary && typeof latestManifestSummary === "object") {
    delete latestManifestSummary.manifest_id;
    delete latestManifestSummary.artifact_byte_hash_by_adapter;
  }
  return {
    ...report,
    store_status: storeStatus,
    latest_manifest_summary: latestManifestSummary,
  };
}

function createPublicLocalBridgeRenderManifestStoreStatus(status) {
  if (!status || typeof status !== "object" || Array.isArray(status)) return status;
  const publicStatus = { ...status };
  delete publicStatus.latest_manifest_id;
  return publicStatus;
}

function createSafeHttpErrorResponse(errorKind) {
  const safeErrorKind = SAFE_HTTP_ERROR_KINDS.has(errorKind) ? errorKind : "internal_error";
  return {
    ok: false,
    error: safeErrorKind,
    error_kind: safeErrorKind,
    boundary_policy: {
      no_raw_error_messages: true,
      no_request_payloads: true,
      no_text_payloads: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
}

function classifyHttpServerError(error) {
  const message = String(error?.message ?? "");
  if (message === "invalid_json") return "invalid_json";
  if (message === "request_body_too_large") return "request_body_too_large";
  if (error instanceof ContractError) {
    const lowered = message.toLowerCase();
    if (
      lowered.includes("command") ||
      lowered.includes("candidate") ||
      lowered.includes("world_command") ||
      lowered.includes("direct memory")
    ) {
      return "unsafe_payload";
    }
    return "contract_error";
  }
  return "internal_error";
}

function productionProbeHttpBoundaryPolicy() {
  return {
    env_names_only: true,
    script_names_only: true,
    counts_statuses_booleans_and_policy_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_raw_payloads: true,
    no_memory_records: true,
    no_relationship_records: true,
    no_candidates: true,
    no_commands: true,
    no_raw_frames: true,
    read_only_http: true,
    dry_run_probe_by_default: true,
    fixture_post_uses_synthetic_payloads_only: true,
    no_real_process_side_effects: true,
    no_polling_side_effects: true,
    no_control_side_effects: true,
  };
}

function productionConfigDoctorHttpBoundaryPolicy() {
  return {
    env_names_only: true,
    counts_statuses_booleans_and_policy_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_memory_records: true,
    no_relationship_records: true,
    no_candidates: true,
    no_commands: true,
    no_raw_frames: true,
    read_only_http: true,
    report_only: true,
    no_real_process_side_effects: true,
    no_polling_side_effects: true,
    no_control_side_effects: true,
  };
}

function productionReadinessRunbookHttpBoundaryPolicy() {
  return {
    env_names_only: true,
    script_names_only: true,
    counts_statuses_booleans_and_policy_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_memory_records: true,
    no_relationship_records: true,
    no_candidates: true,
    no_commands: true,
    no_raw_frames: true,
    read_only_http: true,
    runbook_only: true,
    launch_steps_are_operator_guidance_only: true,
    no_real_process_side_effects: true,
    no_polling_side_effects: true,
    no_control_side_effects: true,
  };
}

function youtubeIngestPreflightHttpBoundaryPolicy() {
  return {
    env_names_only: true,
    script_names_only: true,
    counts_statuses_booleans_and_policy_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_platform_cursor_values: true,
    no_live_payloads: true,
    no_support_message_text: true,
    no_memory_records: true,
    no_relationship_records: true,
    no_candidates: true,
    no_commands: true,
    read_only_http: true,
    preflight_only: true,
    no_polling_side_effects: true,
    no_real_process_side_effects: true,
    no_control_side_effects: true,
  };
}

function getHttpServerErrorStatusCode(error, errorKind) {
  if (
    errorKind === "invalid_json" ||
    errorKind === "request_body_too_large" ||
    errorKind === "unsafe_payload" ||
    errorKind === "contract_error"
  ) {
    return 400;
  }
  const explicit = Number(error?.statusCode);
  if (Number.isFinite(explicit) && explicit >= 400 && explicit < 600) {
    return Math.trunc(explicit);
  }
  return 500;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 64_000) {
        reject(new Error("request_body_too_large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    request.on("error", reject);
  });
}

function normalizeScenarioRequest(body) {
  const scenario = {
    name: body?.name ?? "http_scenario",
    steps: body?.steps,
  };
  try {
    assertScenarioSafe(scenario, { context: "HTTP scenario", maxSteps: 20 });
  } catch (error) {
    error.statusCode = 400;
    throw error;
  }
  return scenario;
}

function filterPublicMemoryRecords(records, { type = "", ownerScope = "", query = "" } = {}) {
  const normalizedType = String(type ?? "").trim();
  const normalizedOwner = String(ownerScope ?? "").trim();
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  return records.filter((record) => {
    if (normalizedType && record.memory_type !== normalizedType) return false;
    if (normalizedOwner && record.owner_scope !== normalizedOwner) return false;
    if (
      normalizedQuery &&
      !String(record.summary ?? "").toLowerCase().includes(normalizedQuery) &&
      !String(record.display_name ?? "").toLowerCase().includes(normalizedQuery)
    ) {
      return false;
    }
    return true;
  });
}

function filterPublicRelationshipProfiles(profiles, { level = "", query = "" } = {}) {
  const normalizedLevel = String(level ?? "").trim();
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  return profiles.filter((profile) => {
    if (normalizedLevel && profile.relationship_level !== normalizedLevel) return false;
    if (
      normalizedQuery &&
      !String(profile.display_name ?? "").toLowerCase().includes(normalizedQuery) &&
      !String(profile.linked_identity_id ?? "").toLowerCase().includes(normalizedQuery) &&
      !String(profile.recent_summaries?.join(" ") ?? "").toLowerCase().includes(normalizedQuery)
    ) {
      return false;
    }
    return true;
  });
}

function createOperatorPolicyAsyncSaveHttpBoundary() {
  return {
    private_async_gate_required: true,
    admin_authentication_required: true,
    owner_confirmation_required_for_gameplay_control: true,
    explicit_postgres_enablement_required: true,
    no_policy_payloads: true,
    no_policy_numeric_values: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_viewer_messages: true,
    no_support_message_text: true,
    no_hidden_relationship_scores: true,
    no_candidates: true,
    no_commands: true,
    no_raw_frames: true,
    no_game_or_os_input: true,
  };
}

function adminSafetyControlsHttpBoundaryPolicy() {
  return {
    read_only_status_available: true,
    explicit_confirmation_required: true,
    safe_control_state_only: true,
    audit_summaries_only: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_connection_values: true,
    no_live_payloads: true,
    no_viewer_messages: true,
    no_support_message_text: true,
    no_memory_records: true,
    no_relationship_records: true,
    no_hidden_relationship_scores: true,
    no_candidates: true,
    no_commands: true,
    no_raw_frames: true,
    no_raw_voice_samples: true,
    no_dataset_paths: true,
    no_internal_model_paths: true,
    no_raw_jobs: true,
    no_real_device_operation: true,
    no_game_or_os_input: true,
  };
}

function adminCharacterVoiceSettingsHttpBoundaryPolicy() {
  return {
    read_only_http: true,
    env_names_only: true,
    fixed_setting_labels_only: true,
    no_setting_values: true,
    internal_guidance_only: true,
    no_phase00_canonical_enum_changes: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_raw_voice_samples: true,
    no_dataset_paths: true,
    no_internal_model_paths: true,
    no_candidates: true,
    no_commands: true,
  };
}

function publicReportBoundaryAuditHttpBoundaryPolicy() {
  return {
    read_only_http: true,
    script_names_only: true,
    public_relative_file_names_only: true,
    counts_statuses_and_policy_only: true,
    no_file_contents: true,
    no_env_values: true,
    no_commands: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_payloads: true,
    no_candidates: true,
  };
}

function adminReviewQueueHttpBoundaryPolicy() {
  return {
    read_only_http: true,
    summaries_only: true,
    no_raw_candidates: true,
    no_approved_records: true,
    no_direct_commit: true,
    validator_required_before_commit: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_live_payloads: true,
    no_viewer_messages: true,
    no_support_message_text: true,
    no_hidden_relationship_scores: true,
    no_commands: true,
    no_game_or_os_input: true,
  };
}

function adminReviewDecisionLogHttpBoundaryPolicy() {
  return {
    counts_only: true,
    decision_summaries_only: true,
    no_raw_candidates: true,
    no_approved_records: true,
    no_memory_or_relationship_store_write: true,
    no_validator_commit: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_payloads: true,
    no_commands: true,
    no_raw_frames: true,
    no_store_paths: true,
  };
}

function adminReviewAuthGateHttpBoundaryPolicy() {
  return {
    read_only_http: true,
    auth_status_only: true,
    env_names_only: true,
    no_raw_candidates: true,
    no_approved_records: true,
    no_memory_or_relationship_store_write: true,
    no_private_runner_call: true,
    no_validator_execution: true,
    no_validator_commit: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_commands: true,
    no_game_or_os_input: true,
  };
}

function adminReviewValidatorHandoffHttpBoundaryPolicy() {
  return {
    read_only_http: true,
    decision_ids_and_counts_only: true,
    validator_handoff_only: true,
    no_raw_candidates: true,
    no_approved_records: true,
    no_memory_or_relationship_store_write: true,
    no_validator_commit: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_payloads: true,
    no_commands: true,
    no_game_or_os_input: true,
  };
}

function adminReviewValidatorPreflightHttpBoundaryPolicy() {
  return {
    read_only_http: true,
    preflight_only: true,
    decision_ids_and_counts_only: true,
    validator_input_not_materialized: true,
    no_raw_candidates: true,
    no_approved_records: true,
    no_memory_or_relationship_store_write: true,
    no_validator_execution: true,
    no_validator_commit: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_payloads: true,
    no_commands: true,
    no_game_or_os_input: true,
  };
}

function adminReviewValidatorRunPlanHttpBoundaryPolicy() {
  return {
    read_only_http: true,
    dry_run_plan_only: true,
    admin_authentication_required: true,
    owner_confirmation_required: true,
    decision_counts_only: true,
    private_runner_input_not_materialized: true,
    no_raw_candidates: true,
    no_approved_records: true,
    no_memory_or_relationship_store_write: true,
    no_private_validator_call: true,
    no_validator_execution: true,
    no_validator_commit: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_payloads: true,
    no_commands: true,
    no_game_or_os_input: true,
  };
}

function createAdminReviewDecisionStoreFromEnv(env) {
  const logPath = String(env?.IRIS_ADMIN_REVIEW_DECISION_LOG_PATH ?? "").trim();
  if (!logPath) return createInMemoryAdminReviewDecisionStore();
  return createJsonAdminReviewDecisionLog(logPath);
}

function sanitizePublicRuntimeState(value) {
  const privateIdFields = new Set([
    "event_id",
    "last_event_id",
    "latest_event_id",
    "trace_id",
    "last_trace_id",
    "request_id",
    "manifest_id",
    "latest_manifest_id",
  ]);
  const visit = (current) => {
    if (Array.isArray(current)) return current.map((item) => visit(item));
    if (!current || typeof current !== "object") return current;
    return Object.fromEntries(
      Object.entries(current).flatMap(([key, entry]) =>
        privateIdFields.has(key)
          ? [[`${key}_present`, typeof entry === "string" ? entry.trim() !== "" : entry != null]]
          : [[key, visit(entry)]]
      )
    );
  };
  return visit(value);
}
