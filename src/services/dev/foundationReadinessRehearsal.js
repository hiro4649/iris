import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationEnvSetupPlanSafe,
  createFoundationEnvSetupPlan,
} from "./foundationEnvSetupPlan.js";
import {
  assertFoundationLaunchPlanSafe,
  createFoundationLaunchPlan,
} from "./foundationLaunchPlan.js";
import {
  assertFoundationLiveReadinessReportSafe,
  createFoundationLiveReadinessReport,
} from "./foundationLiveReadiness.js";
import {
  assertFoundationRuntimeStatusReportSafe,
  createFoundationRuntimeStatusReport,
} from "./foundationRuntimeStatus.js";
import {
  assertFoundationStatusReportSafe,
  createFoundationStatusReport,
} from "./foundationStatus.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const SAFE_ENV_NAME_PATTERN = /^IRIS_[A-Z0-9_]+$/;
const SAFE_STATUS_PATTERN = /^[a-z0-9_]+$/;
const SAFE_SCRIPT_PATTERN =
  /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i;

const FORBIDDEN_FOUNDATION_REHEARSAL_FIELDS = new Set([
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
  "canonical",
  "canonical_envelope",
  "internal_profile",
  "canonical_profile",
  "profile_enum",
  "final_text",
  "last_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
  "endpoint",
  "url",
  "audio_url",
  "artifact_url",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "password",
  "authorization",
  "value",
  "payload",
  "path",
  "artifact_path",
]);

const REHEARSAL_STATUSES = new Set([
  "ready_for_live_obs_operation",
  "ready_for_configured_foundation_rehearsal",
  "configuration_rehearsal_attention",
  "runtime_rehearsal_attention",
  "real_engine_rehearsal_attention",
  "obs_rehearsal_attention",
  "probe_rehearsal_attention",
]);
const FOUNDATION_READINESS_STATUSES = new Set([
  "ready_for_runtime_handoff",
  "attention_required",
]);
const LAUNCH_PLAN_STATUSES = new Set([
  "ready_to_launch_foundation",
  "configure_foundation_env_first",
]);
const ENV_SETUP_STATUSES = new Set([
  "ready_for_foundation_env_setup",
  "configure_foundation_env_first",
]);
const RUNTIME_STATUSES = new Set([
  "attention_required",
  "waiting_for_local_bridge_worker",
  "waiting_for_real_engine_handoff",
  "waiting_for_obs_browser_source",
  "waiting_for_overlay_runtime",
  "waiting_for_runtime_event",
  "waiting_for_overlay_event_stream",
  "waiting_for_obs_render_handoff",
  "ready_for_obs_runtime_handoff",
]);
const LIVE_READINESS_STATUSES = new Set([
  "configuration_attention",
  "runtime_handoff_attention",
  "configured_probe_attention",
  "ready_for_live_obs_operation",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const NEXT_STEP_IDS = new Set([
  "review_foundation_status",
  "review_foundation_runtime_status",
  "run_real_engine_probe",
  "run_obs_runtime_render_roundtrip",
  "run_production_probe",
  "monitor_foundation_live_readiness",
]);

const FOUNDATION_REHEARSAL_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "rehearsal_status",
  "foundation_readiness_status",
  "foundation_attention_reason_count",
  "foundation_next_attention_reason",
  "launch_plan_status",
  "env_setup_plan_status",
  "runtime_status",
  "live_readiness_status",
  "configured_foundation_ready",
  "runtime_rehearsal_ready",
  "real_engine_rehearsal_ready",
  "obs_rehearsal_ready",
  "production_probe_rehearsal_ready",
  "live_obs_ready",
  "runtime_bridge_start_attempt_performed",
  "worker_start_attempt_performed",
  "dev_server_start_attempt_performed",
  "engine_health_probe_attempt_performed",
  "engine_request_attempt_performed",
  "obs_setup_attempt_performed",
  "obs_browser_source_update_attempt_performed",
  "fixture_post_attempt_performed",
  "file_materialization_attempt_performed",
  "render_manifest_update_attempt_performed",
  "next_step_id",
  "next_step_script",
  "next_check_script",
  "next_readiness_state",
  "readiness_state_counts",
  "next_configure_env",
  "runtime_flow_summary",
  "gate_summary",
  "verification_scripts",
  "foundation_side_effect_policy",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);

const FOUNDATION_REHEARSAL_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "rehearsal_report_only",
  "real_processes_not_started_by_rehearsal",
  "real_tts_live2d_engines_not_called_by_rehearsal",
  "obs_not_operated_by_rehearsal",
  "runtime_adapters_not_posted_by_rehearsal",
  "local_env_files_not_materialized_by_rehearsal",
  "production_probe_dry_run_only",
  "runtime_packets_remain_adapter_gated",
  "no_game_or_os_input_started_by_rehearsal",
  "rehearsal_status",
  "ready_gate_count",
  "attention_gate_count",
  "runtime_flow_status",
  "real_engine_gate_ready",
  "obs_gate_ready",
  "production_probe_gate_ready",
  "next_step_id",
  "next_step_script",
  "next_check_script",
  "next_readiness_state",
  "readiness_state_counts",
  "boundary_policy",
]);

export async function createFoundationReadinessRehearsal({
  env = process.env,
  streamState = null,
  overlayEventBus = null,
  fetchImpl = globalThis.fetch,
  generatedAtMs = Date.now(),
} = {}) {
  const foundationStatus = createFoundationStatusReport({ env, generatedAtMs });
  const launchPlan = createFoundationLaunchPlan({ env, generatedAtMs });
  const envSetupPlan = createFoundationEnvSetupPlan({ env, generatedAtMs });
  const runtimeStatus = createFoundationRuntimeStatusReport({
    env,
    streamState,
    overlayEventBus,
    generatedAtMs,
  });
  const liveReadiness = await createFoundationLiveReadinessReport({
    env,
    streamState,
    overlayEventBus,
    generatedAtMs,
    probeMode: "dry_run",
    fetchImpl,
  });

  assertFoundationStatusReportSafe(
    foundationStatus,
    "foundation rehearsal status"
  );
  assertFoundationLaunchPlanSafe(
    launchPlan,
    "foundation rehearsal launch plan"
  );
  assertFoundationEnvSetupPlanSafe(
    envSetupPlan,
    "foundation rehearsal env setup plan"
  );
  assertFoundationRuntimeStatusReportSafe(
    runtimeStatus,
    "foundation rehearsal runtime status"
  );
  assertFoundationLiveReadinessReportSafe(
    liveReadiness,
    "foundation rehearsal live readiness"
  );

  const configurationReady =
    foundationStatus.foundation_readiness_status === "ready_for_runtime_handoff" &&
    launchPlan.plan_status === "ready_to_launch_foundation" &&
    envSetupPlan.plan_status === "ready_for_foundation_env_setup";
  const runtimeReady =
    runtimeStatus.runtime_status === "ready_for_obs_runtime_handoff" &&
    liveReadiness.runtime_gate.readiness_state === "ready";
  const realEngineReady =
    liveReadiness.real_engine_gate.readiness_state === "ready";
  const obsReady = liveReadiness.obs_gate.readiness_state === "ready";
  const probeReady =
    liveReadiness.production_probe_gate.readiness_state === "ready";
  const liveReady =
    liveReadiness.live_readiness_status === "ready_for_live_obs_operation";
  const rehearsalStatus = summarizeRehearsalStatus({
    configurationReady,
    runtimeReady,
    realEngineReady,
    obsReady,
    probeReady,
    liveReady,
  });
  const nextReadinessState = readinessStateForRehearsalStatus(rehearsalStatus);
  const nextStep = summarizeNextStep({
    rehearsalStatus,
    foundationStatus,
    launchPlan,
    envSetupPlan,
    runtimeStatus,
    liveReadiness,
  });
  const readinessStateInputs = [
    { readiness_state: nextReadinessState },
    { readiness_state: runtimeStatus.next_readiness_state },
    liveReadiness.runtime_gate,
    liveReadiness.real_engine_gate,
    liveReadiness.obs_gate,
    liveReadiness.production_probe_gate,
  ];
  const readinessStateCounts = countReadinessStates(readinessStateInputs);

  const rehearsal = {
    schema: "iris_foundation_readiness_rehearsal_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "tts_live2d_obs_foundation",
    target_stage_priority: 1,
    rehearsal_status: rehearsalStatus,
    foundation_readiness_status: foundationStatus.foundation_readiness_status,
    foundation_attention_reason_count:
      foundationStatus.foundation_summary.attention_reason_count,
    foundation_next_attention_reason:
      foundationStatus.foundation_summary.next_attention_reason,
    launch_plan_status: launchPlan.plan_status,
    env_setup_plan_status: envSetupPlan.plan_status,
    runtime_status: runtimeStatus.runtime_status,
    live_readiness_status: liveReadiness.live_readiness_status,
    configured_foundation_ready: configurationReady,
    runtime_rehearsal_ready: runtimeReady,
    real_engine_rehearsal_ready: realEngineReady,
    obs_rehearsal_ready: obsReady,
    production_probe_rehearsal_ready: probeReady,
    live_obs_ready: liveReady,
    runtime_bridge_start_attempt_performed: false,
    worker_start_attempt_performed: false,
    dev_server_start_attempt_performed: false,
    engine_health_probe_attempt_performed: false,
    engine_request_attempt_performed: false,
    obs_setup_attempt_performed: false,
    obs_browser_source_update_attempt_performed: false,
    fixture_post_attempt_performed: false,
    file_materialization_attempt_performed: false,
    render_manifest_update_attempt_performed: false,
    next_step_id: nextStep.next_step_id,
    next_step_script: nextStep.next_step_script,
    next_check_script: nextStep.next_check_script,
    next_readiness_state: nextReadinessState,
    readiness_state_counts: readinessStateCounts,
    next_configure_env: nextStep.next_configure_env,
    runtime_flow_summary: createRuntimeFlowSummary(runtimeStatus, liveReadiness),
    gate_summary: createGateSummary(liveReadiness),
    verification_scripts: {
      schema: "iris_foundation_rehearsal_scripts_v1",
      rehearsal_script: "npm run dev:foundation:readiness-rehearsal",
      status_script: "npm run dev:foundation:status",
      launch_plan_script: "npm run dev:foundation:launch-plan",
      env_setup_plan_script: "npm run dev:foundation:env-setup-plan",
      connector_handoff_script: "npm run dev:foundation:connector-handoff",
      startup_checklist_script: "npm run dev:foundation:startup-checklist",
      runtime_status_script: "npm run dev:foundation:runtime-status",
      live_readiness_script: "npm run dev:foundation:live-readiness",
      engine_probe_script: "npm run dev:engine:probe",
      bridge_engine_roundtrip_script: "npm run dev:bridge:engine-roundtrip",
      bridge_artifact_roundtrip_script:
        "npm run dev:bridge:artifact-roundtrip",
      obs_render_handoff_roundtrip_script:
        "npm run dev:obs:render-handoff-roundtrip",
      obs_runtime_render_roundtrip_script:
        "npm run dev:obs:runtime-render-roundtrip",
      production_probe_script: "npm run dev:production:probe",
      fixture_post_probe_script: "npm run dev:production:probe -- --fixture-post",
      boundary_policy: {
        script_names_only: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_payloads: true,
        no_text_payloads: true,
        no_artifact_paths: true,
        no_candidates: true,
        no_commands: true,
      },
    },
    foundation_side_effect_policy: {
      rehearsal_never_starts_bridge_processes: true,
      rehearsal_never_calls_tts_or_live2d_engines: true,
      rehearsal_never_posts_to_runtime_adapters: true,
      rehearsal_never_updates_obs: true,
      rehearsal_never_materializes_local_env_files: true,
      rehearsal_uses_dry_run_probe_only: true,
      obs_pickup_requires_render_manifest_and_artifacts: true,
      local_bridge_worker_required_before_obs_pickup: true,
      validated_adapter_packets_required: true,
    },
    production_handoff_summary: {
      schema: "iris_foundation_rehearsal_handoff_summary_v1",
      rehearsal_report_only: true,
      real_processes_not_started_by_rehearsal: true,
      real_tts_live2d_engines_not_called_by_rehearsal: true,
      obs_not_operated_by_rehearsal: true,
      runtime_adapters_not_posted_by_rehearsal: true,
      local_env_files_not_materialized_by_rehearsal: true,
      production_probe_dry_run_only: true,
      runtime_packets_remain_adapter_gated: true,
      no_game_or_os_input_started_by_rehearsal: true,
      rehearsal_status: rehearsalStatus,
      ready_gate_count: createGateSummary(liveReadiness).ready_gate_count,
      attention_gate_count: createGateSummary(liveReadiness).attention_gate_count,
      runtime_flow_status: runtimeStatus.runtime_handoff_flow.flow_status,
      real_engine_gate_ready: realEngineReady,
      obs_gate_ready: obsReady,
      production_probe_gate_ready: probeReady,
      next_step_id: nextStep.next_step_id,
      next_step_script: nextStep.next_step_script,
      next_check_script: nextStep.next_check_script,
      next_readiness_state: nextReadinessState,
      readiness_state_counts: readinessStateCounts,
      boundary_policy: {
        booleans_counts_and_fixed_statuses_only: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_payloads: true,
        no_text_payloads: true,
        no_artifact_paths: true,
        no_raw_jobs: true,
        no_candidates: true,
        no_commands: true,
        script_names_only: true,
      },
    },
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
      read_only_rehearsal: true,
    },
    adapter_validation_required: true,
  };
  assertFoundationReadinessRehearsalSafe(rehearsal);
  return rehearsal;
}

export function assertFoundationReadinessRehearsalSafe(
  rehearsal,
  context = "foundation readiness rehearsal"
) {
  if (!rehearsal || typeof rehearsal !== "object" || Array.isArray(rehearsal)) {
    throw new ContractError(`${context}: rehearsal is required`);
  }
  assertNoForbiddenFields(rehearsal, context);
  assertNoUrlStrings(rehearsal, context);
  if (rehearsal.schema !== "iris_foundation_readiness_rehearsal_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(rehearsal)) {
    if (!FOUNDATION_REHEARSAL_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected rehearsal field`, { field });
    }
  }
  assertNonNegativeInteger(
    rehearsal.generated_at_ms,
    `${context}: invalid generated timestamp`
  );
  if (rehearsal.target_stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (rehearsal.target_stage_priority !== 1) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!REHEARSAL_STATUSES.has(rehearsal.rehearsal_status)) {
    throw new ContractError(`${context}: invalid rehearsal status`);
  }
  if (!FOUNDATION_READINESS_STATUSES.has(rehearsal.foundation_readiness_status)) {
    throw new ContractError(`${context}: invalid foundation readiness status`);
  }
  if (!LAUNCH_PLAN_STATUSES.has(rehearsal.launch_plan_status)) {
    throw new ContractError(`${context}: invalid launch status`);
  }
  if (!ENV_SETUP_STATUSES.has(rehearsal.env_setup_plan_status)) {
    throw new ContractError(`${context}: invalid env setup status`);
  }
  if (!RUNTIME_STATUSES.has(rehearsal.runtime_status)) {
    throw new ContractError(`${context}: invalid runtime status`);
  }
  if (!LIVE_READINESS_STATUSES.has(rehearsal.live_readiness_status)) {
    throw new ContractError(`${context}: invalid live readiness status`);
  }
  assertNonNegativeInteger(
    rehearsal.foundation_attention_reason_count,
    `${context}: invalid foundation attention reason count`
  );
  assertOptionalStatus(
    rehearsal.foundation_next_attention_reason,
    `${context}: invalid foundation attention reason`
  );
  for (const field of [
    "configured_foundation_ready",
    "runtime_rehearsal_ready",
    "real_engine_rehearsal_ready",
    "obs_rehearsal_ready",
    "production_probe_rehearsal_ready",
    "live_obs_ready",
    "runtime_bridge_start_attempt_performed",
    "worker_start_attempt_performed",
    "dev_server_start_attempt_performed",
    "engine_health_probe_attempt_performed",
    "engine_request_attempt_performed",
    "obs_setup_attempt_performed",
    "obs_browser_source_update_attempt_performed",
    "fixture_post_attempt_performed",
    "file_materialization_attempt_performed",
    "render_manifest_update_attempt_performed",
  ]) {
    assertBoolean(rehearsal[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "runtime_bridge_start_attempt_performed",
    "worker_start_attempt_performed",
    "dev_server_start_attempt_performed",
    "engine_health_probe_attempt_performed",
    "engine_request_attempt_performed",
    "obs_setup_attempt_performed",
    "obs_browser_source_update_attempt_performed",
    "fixture_post_attempt_performed",
    "file_materialization_attempt_performed",
    "render_manifest_update_attempt_performed",
  ]) {
    if (rehearsal[field] !== false) {
      throw new ContractError(`${context}: rehearsal side effect boundary failed`);
    }
  }
  if (!NEXT_STEP_IDS.has(rehearsal.next_step_id)) {
    throw new ContractError(`${context}: invalid next step`);
  }
  assertSafeScriptName(rehearsal.next_step_script, `${context}: next step`);
  assertSafeScriptName(rehearsal.next_check_script, `${context}: next check`);
  assertSafeReadinessState(rehearsal.next_readiness_state, context);
  if (
    rehearsal.next_readiness_state !==
    readinessStateForRehearsalStatus(rehearsal.rehearsal_status)
  ) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  assertReadinessStateCountsSafe(rehearsal.readiness_state_counts, context);
  assertEnvNameList(rehearsal.next_configure_env, `${context}: next env`);
  assertRuntimeFlowSummarySafe(rehearsal.runtime_flow_summary, context);
  assertGateSummarySafe(rehearsal.gate_summary, context);
  assertVerificationScriptsSafe(rehearsal.verification_scripts, context);
  assertFoundationSideEffectPolicySafe(
    rehearsal.foundation_side_effect_policy,
    context
  );
  assertProductionHandoffSummarySafe(
    rehearsal.production_handoff_summary,
    rehearsal,
    context
  );
  assertBoundaryPolicy(rehearsal.boundary_policy, [
    "env_names_only",
    "script_names_only",
    "booleans_counts_and_fixed_statuses_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_text_payloads",
    "no_artifact_paths",
    "no_raw_jobs",
    "no_raw_packets",
    "no_candidates",
    "no_commands",
    "no_engine_calls",
    "no_obs_setup_side_effects",
    "no_file_updates",
    "dry_run_probe_only",
    "read_only_rehearsal",
  ], context);
  if (rehearsal.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
  if (
    rehearsal.rehearsal_status === "ready_for_live_obs_operation" &&
    rehearsal.live_obs_ready !== true
  ) {
    throw new ContractError(`${context}: live-ready rehearsal mismatch`);
  }
}

function assertProductionHandoffSummarySafe(summary, rehearsal, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_foundation_rehearsal_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!FOUNDATION_REHEARSAL_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected production handoff field`, {
        field,
      });
    }
  }
  for (const field of [
    "rehearsal_report_only",
    "real_processes_not_started_by_rehearsal",
    "real_tts_live2d_engines_not_called_by_rehearsal",
    "obs_not_operated_by_rehearsal",
    "runtime_adapters_not_posted_by_rehearsal",
    "local_env_files_not_materialized_by_rehearsal",
    "production_probe_dry_run_only",
    "runtime_packets_remain_adapter_gated",
    "no_game_or_os_input_started_by_rehearsal",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (
    summary.rehearsal_status !== rehearsal.rehearsal_status ||
    summary.ready_gate_count !== rehearsal.gate_summary.ready_gate_count ||
    summary.attention_gate_count !== rehearsal.gate_summary.attention_gate_count ||
    summary.runtime_flow_status !==
      rehearsal.runtime_flow_summary.runtime_flow_status ||
    summary.real_engine_gate_ready !== rehearsal.real_engine_rehearsal_ready ||
    summary.obs_gate_ready !== rehearsal.obs_rehearsal_ready ||
    summary.production_probe_gate_ready !==
      rehearsal.production_probe_rehearsal_ready ||
    summary.next_step_id !== rehearsal.next_step_id ||
    summary.next_step_script !== rehearsal.next_step_script ||
    summary.next_check_script !== rehearsal.next_check_script ||
    summary.next_readiness_state !== rehearsal.next_readiness_state
  ) {
    throw new ContractError(`${context}: invalid production handoff totals`);
  }
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  if (
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      rehearsal.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: production handoff readiness mismatch`);
  }
  assertNonNegativeInteger(summary.ready_gate_count, `${context}: invalid ready gate count`);
  assertNonNegativeInteger(
    summary.attention_gate_count,
    `${context}: invalid attention gate count`
  );
  assertStatus(summary.runtime_flow_status, `${context}: invalid runtime flow status`);
  for (const field of [
    "real_engine_gate_ready",
    "obs_gate_ready",
    "production_probe_gate_ready",
  ]) {
    assertBoolean(summary[field], `${context}: invalid ${field}`);
  }
  if (!NEXT_STEP_IDS.has(summary.next_step_id)) {
    throw new ContractError(`${context}: invalid production handoff next step`);
  }
  assertSafeScriptName(summary.next_step_script, `${context}: handoff next step script`);
  assertSafeScriptName(summary.next_check_script, `${context}: handoff next check script`);
  assertBoundaryPolicy(summary.boundary_policy, [
    "booleans_counts_and_fixed_statuses_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_payloads",
    "no_text_payloads",
    "no_artifact_paths",
    "no_raw_jobs",
    "no_candidates",
    "no_commands",
    "script_names_only",
  ], `${context}: production handoff`);
}

function readinessStateForRehearsalStatus(status) {
  if (status === "ready_for_live_obs_operation") return "ready";
  if (status === "configuration_rehearsal_attention") {
    return "configuration_waiting";
  }
  if (status === "ready_for_configured_foundation_rehearsal") {
    return "runtime_waiting";
  }
  if (status === "real_engine_rehearsal_attention") {
    return "real_device_waiting";
  }
  return "operator_review_required";
}

function summarizeRehearsalStatus({
  configurationReady,
  runtimeReady,
  realEngineReady,
  obsReady,
  probeReady,
  liveReady,
}) {
  if (!configurationReady) return "configuration_rehearsal_attention";
  if (liveReady) return "ready_for_live_obs_operation";
  if (!runtimeReady) return "ready_for_configured_foundation_rehearsal";
  if (!realEngineReady) return "real_engine_rehearsal_attention";
  if (!obsReady) return "obs_rehearsal_attention";
  if (!probeReady) return "probe_rehearsal_attention";
  return "runtime_rehearsal_attention";
}

function summarizeNextStep({
  rehearsalStatus,
  foundationStatus,
  launchPlan,
  envSetupPlan,
  runtimeStatus,
  liveReadiness,
}) {
  if (rehearsalStatus === "configuration_rehearsal_attention") {
    return {
      next_step_id: "review_foundation_status",
      next_step_script:
        launchPlan.next_launch_script ?? "npm run dev:foundation:status",
      next_check_script: "npm run dev:foundation:readiness-rehearsal",
      next_configure_env:
        envSetupPlan.next_configure_env.length > 0
          ? [...envSetupPlan.next_configure_env]
          : foundationStatus.foundation_summary.missing_required_env_count > 0
            ? [...launchPlan.next_configure_env]
            : [],
    };
  }
  if (
    rehearsalStatus === "ready_for_configured_foundation_rehearsal" ||
    rehearsalStatus === "runtime_rehearsal_attention"
  ) {
    return {
      next_step_id: "review_foundation_runtime_status",
      next_step_script:
        runtimeStatus.runtime_summary.next_runtime_check_script ??
        "npm run dev:foundation:runtime-status",
      next_check_script: "npm run dev:foundation:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  if (rehearsalStatus === "real_engine_rehearsal_attention") {
    return {
      next_step_id: "run_real_engine_probe",
      next_step_script:
        liveReadiness.real_engine_gate.next_check_script ??
        "npm run dev:engine:probe",
      next_check_script: "npm run dev:foundation:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  if (rehearsalStatus === "obs_rehearsal_attention") {
    return {
      next_step_id: "run_obs_runtime_render_roundtrip",
      next_step_script:
        liveReadiness.obs_gate.next_check_script ??
        "npm run dev:obs:runtime-render-roundtrip",
      next_check_script: "npm run dev:foundation:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  if (rehearsalStatus === "probe_rehearsal_attention") {
    return {
      next_step_id: "run_production_probe",
      next_step_script:
        liveReadiness.production_probe_gate.next_check_script ??
        "npm run dev:production:probe",
      next_check_script: "npm run dev:foundation:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  return {
    next_step_id: "monitor_foundation_live_readiness",
    next_step_script: "npm run dev:foundation:live-readiness",
    next_check_script: "npm run dev:foundation:readiness-rehearsal",
    next_configure_env: [],
  };
}

function createRuntimeFlowSummary(runtimeStatus, liveReadiness) {
  return {
    schema: "iris_foundation_rehearsal_runtime_flow_summary_v1",
    next_runtime_check_script:
      runtimeStatus.runtime_summary.next_runtime_check_script,
    runtime_flow_status: runtimeStatus.runtime_handoff_flow.flow_status,
    runtime_flow_blocking_stage:
      runtimeStatus.runtime_handoff_flow.blocking_stage,
    obs_artifact_flow_status: runtimeStatus.obs_render_artifact_flow.flow_status,
    obs_artifact_blocking_stage:
      runtimeStatus.obs_render_artifact_flow.blocking_stage,
    local_bridge_worker_readiness_status:
      runtimeStatus.local_bridge_worker_runtime.worker_readiness_status,
    local_bridge_worker_ready:
      runtimeStatus.local_bridge_worker_runtime.worker_ready_for_handoff,
    local_bridge_worker_queue_clear:
      runtimeStatus.local_bridge_worker_runtime.queue_clear,
    worker_pending_job_count:
      runtimeStatus.local_bridge_worker_runtime.queue_pending_job_count,
    worker_retry_blocked_count:
      runtimeStatus.local_bridge_worker_runtime.queue_retry_blocked_count,
    worker_invalid_json_line_count:
      runtimeStatus.local_bridge_worker_runtime.queue_invalid_json_line_count,
    real_engine_handoff_status: runtimeStatus.real_engine_handoff.handoff_status,
    tts_engine_http_ready: runtimeStatus.real_engine_handoff.tts_engine_http_ready,
    live2d_engine_http_ready:
      runtimeStatus.real_engine_handoff.live2d_engine_http_ready,
    subtitle_renderer_ready:
      runtimeStatus.real_engine_handoff.subtitle_renderer_ready,
    configured_real_engine_count:
      runtimeStatus.real_engine_handoff.configured_real_engine_count,
    required_real_engine_count:
      runtimeStatus.real_engine_handoff.required_real_engine_count,
    obs_browser_source_ready:
      runtimeStatus.obs_browser_source_runtime.obs_browser_source_ready,
    overlay_runtime_available:
      runtimeStatus.runtime_handoff_flow.overlay_runtime_available,
    runtime_event_available:
      runtimeStatus.runtime_handoff_flow.runtime_event_available,
    overlay_event_stream_available:
      runtimeStatus.runtime_handoff_flow.overlay_event_stream_available,
    render_manifest_available:
      runtimeStatus.runtime_handoff_flow.render_manifest_available,
    obs_pickup_ready: runtimeStatus.runtime_handoff_flow.obs_pickup_ready,
    artifact_pickup_ready_adapter_count:
      runtimeStatus.runtime_handoff_flow.artifact_pickup_ready_adapter_count,
    required_artifact_pickup_ready_adapter_count:
      liveReadiness.obs_gate.required_adapter_kind_count,
    production_probe_verification_status:
      liveReadiness.production_probe_gate.production_probe_verification_status,
    production_probe_readiness_status:
      liveReadiness.production_probe_gate.production_probe_readiness_status,
    boundary_policy: {
      booleans_counts_and_fixed_statuses_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_text_payloads: true,
      no_artifact_paths: true,
      no_raw_jobs: true,
      no_candidates: true,
      no_commands: true,
      script_names_only: true,
    },
  };
}

function createGateSummary(liveReadiness) {
  const gates = [
    liveReadiness.runtime_gate,
    liveReadiness.real_engine_gate,
    liveReadiness.obs_gate,
    liveReadiness.production_probe_gate,
  ];
  const readyGateCount = gates.filter(
    (gate) => gate.readiness_state === "ready"
  ).length;
  return {
    schema: "iris_foundation_rehearsal_gate_summary_v1",
    gate_count: gates.length,
    ready_gate_count: readyGateCount,
    attention_gate_count: gates.length - readyGateCount,
    runtime_gate_ready:
      liveReadiness.runtime_gate.runtime_status ===
        "ready_for_obs_runtime_handoff" &&
      liveReadiness.runtime_gate.runtime_flow_blocking_stage === "none" &&
      liveReadiness.runtime_gate.readiness_state === "ready",
    real_engine_gate_ready:
      liveReadiness.real_engine_gate.gate_status === "ready" &&
      liveReadiness.real_engine_gate.configured_real_engine_count ===
        liveReadiness.real_engine_gate.required_real_engine_count &&
      liveReadiness.real_engine_gate.queue_retry_blocked_count === 0,
    obs_gate_ready:
      liveReadiness.obs_gate.gate_status === "ready" &&
      liveReadiness.obs_gate.artifact_pickup_ready_adapter_count ===
        liveReadiness.obs_gate.required_artifact_pickup_ready_adapter_count &&
      liveReadiness.obs_gate.readiness_state === "ready",
    production_probe_gate_ready:
      liveReadiness.production_probe_gate.readiness_state === "ready",
    runtime_gate_status: liveReadiness.runtime_gate.runtime_status,
    real_engine_gate_status: liveReadiness.real_engine_gate.gate_status,
    obs_gate_status: liveReadiness.obs_gate.gate_status,
    production_probe_gate_status:
      liveReadiness.production_probe_gate.production_probe_verification_status,
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_text_payloads: true,
      no_artifact_paths: true,
      no_raw_jobs: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function assertRuntimeFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: runtime flow summary is required`);
  }
  if (summary.schema !== "iris_foundation_rehearsal_runtime_flow_summary_v1") {
    throw new ContractError(`${context}: invalid runtime flow summary schema`);
  }
  assertSafeOptionalScriptName(
    summary.next_runtime_check_script,
    `${context}: runtime check script`
  );
  for (const field of [
    "runtime_flow_status",
    "runtime_flow_blocking_stage",
    "obs_artifact_flow_status",
    "obs_artifact_blocking_stage",
    "local_bridge_worker_readiness_status",
    "real_engine_handoff_status",
    "production_probe_verification_status",
    "production_probe_readiness_status",
  ]) {
    assertStatus(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "local_bridge_worker_ready",
    "local_bridge_worker_queue_clear",
    "tts_engine_http_ready",
    "live2d_engine_http_ready",
    "subtitle_renderer_ready",
    "obs_browser_source_ready",
    "overlay_runtime_available",
    "runtime_event_available",
    "overlay_event_stream_available",
    "render_manifest_available",
    "obs_pickup_ready",
  ]) {
    assertBoolean(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "worker_pending_job_count",
    "worker_retry_blocked_count",
    "worker_invalid_json_line_count",
    "configured_real_engine_count",
    "required_real_engine_count",
    "artifact_pickup_ready_adapter_count",
    "required_artifact_pickup_ready_adapter_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "booleans_counts_and_fixed_statuses_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_payloads",
    "no_text_payloads",
    "no_artifact_paths",
    "no_raw_jobs",
    "no_candidates",
    "no_commands",
    "script_names_only",
  ], context);
}

function assertGateSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: gate summary is required`);
  }
  if (summary.schema !== "iris_foundation_rehearsal_gate_summary_v1") {
    throw new ContractError(`${context}: invalid gate summary schema`);
  }
  for (const field of ["gate_count", "ready_gate_count", "attention_gate_count"]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (summary.gate_count !== 4) {
    throw new ContractError(`${context}: invalid gate count`);
  }
  if (summary.ready_gate_count + summary.attention_gate_count !== summary.gate_count) {
    throw new ContractError(`${context}: invalid gate count summary`);
  }
  for (const field of [
    "runtime_gate_ready",
    "real_engine_gate_ready",
    "obs_gate_ready",
    "production_probe_gate_ready",
  ]) {
    assertBoolean(summary[field], `${context}: invalid ${field}`);
  }
  const expectedReadyGateCount = [
    summary.runtime_gate_ready,
    summary.real_engine_gate_ready,
    summary.obs_gate_ready,
    summary.production_probe_gate_ready,
  ].filter(Boolean).length;
  if (
    summary.ready_gate_count !== expectedReadyGateCount ||
    summary.attention_gate_count !== summary.gate_count - expectedReadyGateCount
  ) {
    throw new ContractError(`${context}: gate counts must match gate readiness flags`);
  }
  for (const field of [
    "runtime_gate_status",
    "real_engine_gate_status",
    "obs_gate_status",
    "production_probe_gate_status",
  ]) {
    assertStatus(summary[field], `${context}: invalid ${field}`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_booleans_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_payloads",
    "no_text_payloads",
    "no_artifact_paths",
    "no_raw_jobs",
    "no_candidates",
    "no_commands",
  ], context);
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_foundation_rehearsal_scripts_v1") {
    throw new ContractError(`${context}: invalid scripts schema`);
  }
  for (const field of [
    "rehearsal_script",
    "status_script",
    "launch_plan_script",
    "env_setup_plan_script",
    "connector_handoff_script",
    "startup_checklist_script",
    "runtime_status_script",
    "live_readiness_script",
    "engine_probe_script",
    "bridge_engine_roundtrip_script",
    "bridge_artifact_roundtrip_script",
    "obs_render_handoff_roundtrip_script",
    "obs_runtime_render_roundtrip_script",
    "production_probe_script",
    "fixture_post_probe_script",
  ]) {
    assertSafeScriptName(scripts[field], `${context}: invalid ${field}`);
  }
  assertBoundaryPolicy(scripts.boundary_policy, [
    "script_names_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_payloads",
    "no_text_payloads",
    "no_artifact_paths",
    "no_candidates",
    "no_commands",
  ], context);
}

function assertFoundationSideEffectPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: side effect policy is required`);
  }
  for (const field of [
    "rehearsal_never_starts_bridge_processes",
    "rehearsal_never_calls_tts_or_live2d_engines",
    "rehearsal_never_posts_to_runtime_adapters",
    "rehearsal_never_updates_obs",
    "rehearsal_never_materializes_local_env_files",
    "rehearsal_uses_dry_run_probe_only",
    "obs_pickup_requires_render_manifest_and_artifacts",
    "local_bridge_worker_required_before_obs_pickup",
    "validated_adapter_packets_required",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid side effect policy`);
    }
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNoForbiddenFields(value, context, path = []) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFields(item, context, [...path, String(index)])
    );
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_FOUNDATION_REHEARSAL_FIELDS.has(key)) {
      throw new ContractError(`${context}: forbidden field`, {
        field: [...path, key].join("."),
      });
    }
    assertNoForbiddenFields(nested, context, [...path, key]);
  }
}

function assertNoUrlStrings(value, context) {
  if (URL_PATTERN.test(JSON.stringify(value))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
}

function assertEnvNameList(names, context) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of names) {
    if (typeof name !== "string" || !SAFE_ENV_NAME_PATTERN.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
  if (new Set(names).size !== names.length) {
    throw new ContractError(`${context}: duplicate env name`);
  }
}

function assertSafeScriptName(script, context) {
  if (typeof script !== "string" || !SAFE_SCRIPT_PATTERN.test(script)) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function assertSafeOptionalScriptName(script, context) {
  if (script === null) return;
  assertSafeScriptName(script, context);
}

function countReadinessStates(items) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const item of items) {
    const state = item.readiness_state;
    if (READINESS_STATES.has(state)) counts[state] += 1;
  }
  return counts;
}

function assertSafeReadinessState(state, context) {
  if (!READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: readiness counts are required`);
  }
  for (const state of READINESS_STATES) {
    assertNonNegativeInteger(
      counts[state],
      `${context}: invalid readiness count for ${state}`
    );
  }
  for (const state of Object.keys(counts)) {
    if (!READINESS_STATES.has(state)) {
      throw new ContractError(`${context}: unknown readiness count state`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  for (const state of READINESS_STATES) {
    if (left?.[state] !== right?.[state]) return false;
  }
  return true;
}

function assertStatus(value, context) {
  if (typeof value !== "string" || !SAFE_STATUS_PATTERN.test(value)) {
    throw new ContractError(context);
  }
}

function assertOptionalStatus(value, context) {
  if (value === null) return;
  assertStatus(value, context);
}

function assertBoolean(value, context) {
  if (typeof value !== "boolean") {
    throw new ContractError(context);
  }
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}
