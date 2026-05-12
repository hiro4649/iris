import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationRuntimeStatusReportSafe,
  createFoundationRuntimeStatusReport,
} from "./foundationRuntimeStatus.js";
import {
  assertGameplayRuntimeStatusReportSafe,
  createGameplayRuntimeStatusReport,
} from "./gameplayRuntimeStatus.js";
import {
  assertPersistenceRuntimeStatusReportSafe,
  createPersistenceRuntimeStatusReport,
} from "./persistenceRuntimeStatus.js";
import {
  assertYouTubeIngestRuntimeStatusReportSafe,
  createYouTubeIngestRuntimeStatusReport,
} from "./youtubeIngestRuntimeStatus.js";

const FORBIDDEN_RUNTIME_HANDOFF_FIELDS = new Set([
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
  "final_text",
  "last_text",
  "text",
  "subtitle_text",
  "endpoint",
  "url",
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
  "raw_frame",
  "image",
  "frame",
  "ocr_text",
]);

const COMPONENT_IDS = new Set([
  "foundation_runtime",
  "youtube_ingest_runtime",
  "persistence_runtime",
  "gameplay_runtime",
]);
const COMPONENT_ID_ORDER = Object.freeze([
  "foundation_runtime",
  "youtube_ingest_runtime",
  "persistence_runtime",
  "gameplay_runtime",
]);
const HANDOFF_STATUSES = new Set([
  "runtime_handoff_attention",
  "runtime_handoff_ready",
]);
const COMPONENT_STATUSES = new Set(["ready", "attention"]);
const COMPONENT_SUMMARY_FIELDS = new Set([
  "schema",
  "component_id",
  "component_status",
  "readiness_state",
  "runtime_status",
  "flow_status",
  "next_check_script",
  "report_only",
  "no_real_processes_started",
  "no_runtime_side_effects_started",
  "candidates_remain_gated",
  "endpoint_values_not_exposed",
  "secret_values_not_exposed",
]);
const OBS_PICKUP_RUNTIME_STATES = new Set([
  "obs_pickup_runtime_ready",
  "obs_pickup_runtime_waiting",
]);
const FOUNDATION_OBS_PICKUP_RUNTIME_SUMMARY_FIELDS = new Set([
  "schema",
  "runtime_handoff_report_only",
  "real_obs_operation_not_started_by_report",
  "runtime_adapter_packets_not_exposed",
  "artifact_paths_not_exposed",
  "local_bridge_worker_ready",
  "real_engine_handoff_ready",
  "obs_browser_source_ready",
  "obs_handoff_ready",
  "render_manifest_available",
  "obs_pickup_ready",
  "artifact_pickup_ready_adapter_count",
  "pending_worker_job_count",
  "retry_blocked_worker_job_count",
  "local_bridge_worker_attention_reason",
  "local_bridge_worker_next_operator_action_id",
  "real_engine_worker_flow_status",
  "next_runtime_attention",
  "next_runtime_check_script",
  "obs_pickup_runtime_state",
  "boundary_policy",
  "adapter_validation_required",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const PRODUCTION_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "runtime_handoff_report_only",
  "real_processes_not_started_by_report",
  "live_polling_not_started_by_report",
  "real_capture_not_started_by_report",
  "real_game_or_os_input_not_started_by_report",
  "runtime_side_effects_not_started_by_report",
  "memory_and_relationship_candidates_remain_gated",
  "input_action_candidates_never_forwarded_directly",
  "endpoint_values_not_exposed",
  "secret_values_not_exposed",
  "raw_frames_not_exposed",
  "raw_ocr_text_not_exposed",
  "component_count",
  "ready_component_count",
  "attention_component_count",
  "readiness_state_counts",
  "next_component_id",
  "next_readiness_state",
  "next_check_script",
  "postgres_admin_save_preflight_script",
  "operator_policy_async_save_gate_roundtrip_script",
  "foundation_obs_pickup_runtime_summary",
]);
const PRODUCTION_RUNTIME_HANDOFF_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "handoff_status",
  "component_count",
  "ready_component_count",
  "attention_component_count",
  "readiness_state_counts",
  "next_component_id",
  "next_readiness_state",
  "next_check_script",
  "foundation_obs_pickup_runtime_summary",
  "components",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);
const PRODUCTION_RUNTIME_HANDOFF_BOUNDARY_POLICY_FIELDS = new Set([
  "env_names_only",
  "counts_statuses_and_booleans_only",
  "no_child_reports",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_raw_frames",
  "no_ocr_text",
  "no_candidates",
  "no_commands",
  "no_raw_runtime_state",
  "read_only_runtime_handoff_status",
  "script_names_only",
]);
const FOUNDATION_OBS_PICKUP_RUNTIME_BOUNDARY_POLICY_FIELDS = new Set([
  "booleans_counts_statuses_and_script_names_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
  "no_artifact_paths",
  "no_raw_runtime_state",
]);
const URL_PATTERN = /https?:\/\//i;
const UNSAFE_LABEL_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|raw_frame|ocr_text)\b|https?:\/\//i;

export function createProductionRuntimeHandoffStatusReport({
  env = process.env,
  generatedAtMs = Date.now(),
  foundationRuntimeStatus = null,
  youtubeIngestRuntimeStatus = null,
  persistenceRuntimeStatus = null,
  gameplayRuntimeStatus = null,
} = {}) {
  const foundation =
    foundationRuntimeStatus ??
    createFoundationRuntimeStatusReport({ env, generatedAtMs });
  const youtube =
    youtubeIngestRuntimeStatus ??
    createYouTubeIngestRuntimeStatusReport({ env, generatedAtMs });
  const persistence =
    persistenceRuntimeStatus ??
    createPersistenceRuntimeStatusReport({ env, generatedAtMs });
  const gameplay =
    gameplayRuntimeStatus ??
    createGameplayRuntimeStatusReport({ env, generatedAtMs });

  assertFoundationRuntimeStatusReportSafe(foundation, "production runtime foundation");
  assertYouTubeIngestRuntimeStatusReportSafe(youtube, "production runtime youtube");
  assertPersistenceRuntimeStatusReportSafe(persistence, "production runtime persistence");
  assertGameplayRuntimeStatusReportSafe(gameplay, "production runtime gameplay");

  const components = [
    summarizeComponent({
      componentId: "foundation_runtime",
      runtimeStatus: foundation.runtime_status,
      ready:
        foundation.runtime_status === "ready_for_obs_runtime_handoff" &&
        foundation.runtime_handoff_flow?.blocking_stage === "none" &&
        foundation.production_handoff_summary?.local_bridge_worker_ready === true,
      nextCheckScript: foundation.next_runtime_check_script,
      handoffSummary: foundation.production_handoff_summary,
      flowStatus: foundation.runtime_handoff_flow?.flow_status ?? null,
    }),
    summarizeComponent({
      componentId: "youtube_ingest_runtime",
      runtimeStatus: youtube.runtime_status,
      ready:
        youtube.runtime_status === "polling_active" &&
        youtube.live_chat_ingest_flow?.blocking_stage === "none",
      nextCheckScript: youtube.next_runtime_check_script,
      handoffSummary: youtube.production_handoff_summary,
      flowStatus: youtube.live_chat_ingest_flow?.flow_status ?? null,
    }),
    summarizeComponent({
      componentId: "persistence_runtime",
      runtimeStatus: persistence.runtime_status,
      ready:
        persistence.runtime_status === "active_with_memory_and_relationships" &&
        persistence.memory_relationship_lifecycle_flow?.blocking_stage === "none",
      nextCheckScript: persistence.next_runtime_check_script,
      handoffSummary: persistence.production_handoff_summary,
      flowStatus:
        persistence.memory_relationship_lifecycle_flow?.flow_status ?? null,
    }),
    summarizeComponent({
      componentId: "gameplay_runtime",
      runtimeStatus: gameplay.runtime_status,
      ready:
        gameplay.runtime_status === "safe_control_active" &&
        gameplay.safe_action_lifecycle_flow?.blocking_stage === "none",
      nextCheckScript: gameplay.next_runtime_check_script,
      handoffSummary: gameplay.production_handoff_summary,
      flowStatus: gameplay.safe_action_lifecycle_flow?.flow_status ?? null,
    }),
  ];
  const attentionComponents = components.filter(
    (component) => component.component_status === "attention"
  );
  const readinessStateCounts = summarizeReadinessStateCounts(components);
  const foundationObsPickupRuntimeSummary =
    summarizeFoundationObsPickupRuntime(foundation.production_handoff_summary);
  const report = {
    schema: "iris_production_runtime_handoff_status_report_v1",
    generated_at_ms: generatedAtMs,
    handoff_status:
      attentionComponents.length === 0
        ? "runtime_handoff_ready"
        : "runtime_handoff_attention",
    component_count: components.length,
    ready_component_count: components.length - attentionComponents.length,
    attention_component_count: attentionComponents.length,
    readiness_state_counts: readinessStateCounts,
    next_component_id: attentionComponents[0]?.component_id ?? null,
    next_readiness_state: attentionComponents[0]?.readiness_state ?? null,
    next_check_script: attentionComponents[0]?.next_check_script ?? null,
    foundation_obs_pickup_runtime_summary: foundationObsPickupRuntimeSummary,
    components,
    production_handoff_summary: {
      schema: "iris_production_runtime_handoff_status_handoff_summary_v1",
      runtime_handoff_report_only: true,
      real_processes_not_started_by_report: true,
      live_polling_not_started_by_report: true,
      real_capture_not_started_by_report: true,
      real_game_or_os_input_not_started_by_report: true,
      runtime_side_effects_not_started_by_report: true,
      memory_and_relationship_candidates_remain_gated: true,
      input_action_candidates_never_forwarded_directly: true,
      endpoint_values_not_exposed: true,
      secret_values_not_exposed: true,
      raw_frames_not_exposed: true,
      raw_ocr_text_not_exposed: true,
      component_count: components.length,
      ready_component_count: components.length - attentionComponents.length,
      attention_component_count: attentionComponents.length,
      readiness_state_counts: readinessStateCounts,
      next_component_id: attentionComponents[0]?.component_id ?? null,
      next_readiness_state: attentionComponents[0]?.readiness_state ?? null,
      next_check_script: attentionComponents[0]?.next_check_script ?? null,
      postgres_admin_save_preflight_script:
        "npm run dev:persistence:postgres-admin-save-preflight",
      operator_policy_async_save_gate_roundtrip_script:
        "npm run dev:operator-policy:async-save-gate-roundtrip",
      foundation_obs_pickup_runtime_summary: foundationObsPickupRuntimeSummary,
    },
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
      read_only_runtime_handoff_status: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertProductionRuntimeHandoffStatusReportSafe(report);
  return report;
}

export function assertProductionRuntimeHandoffStatusReportSafe(
  report,
  context = "production runtime handoff status report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenRuntimeHandoffFields(report, context);
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_production_runtime_handoff_status_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!PRODUCTION_RUNTIME_HANDOFF_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected runtime handoff field ${field}`);
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (!HANDOFF_STATUSES.has(report.handoff_status)) {
    throw new ContractError(`${context}: invalid handoff status`);
  }
  for (const field of [
    "component_count",
    "ready_component_count",
    "attention_component_count",
  ]) {
    assertNonNegativeInteger(report[field], `${context}: invalid ${field}`);
  }
  if (report.component_count !== 4) {
    throw new ContractError(`${context}: invalid component count`);
  }
  if (
    report.ready_component_count + report.attention_component_count !==
    report.component_count
  ) {
    throw new ContractError(`${context}: component count mismatch`);
  }
  const expectedHandoffStatus =
    report.attention_component_count === 0
      ? "runtime_handoff_ready"
      : "runtime_handoff_attention";
  if (report.handoff_status !== expectedHandoffStatus) {
    throw new ContractError(`${context}: handoff status count mismatch`);
  }
  assertReadinessStateCountsSafe(report.readiness_state_counts, report, context);
  assertSafeOptionalComponentId(report.next_component_id, context);
  assertSafeOptionalReadinessState(report.next_readiness_state, context);
  assertSafeOptionalScriptName(report.next_check_script, context);
  if (!Array.isArray(report.components) || report.components.length !== 4) {
    throw new ContractError(`${context}: components required`);
  }
  report.components.forEach((component, index) => {
    assertComponentSafe(component, context);
    if (component.component_id !== COMPONENT_ID_ORDER[index]) {
      throw new ContractError(`${context}: invalid component order`);
    }
  });
  if (new Set(report.components.map((component) => component.component_id)).size !== 4) {
    throw new ContractError(`${context}: duplicate component id`);
  }
  const attentionComponents = report.components.filter(
    (component) => component.component_status === "attention"
  );
  if (
    report.attention_component_count !== attentionComponents.length ||
    report.ready_component_count !== report.component_count - attentionComponents.length
  ) {
    throw new ContractError(`${context}: component status count mismatch`);
  }
  if (
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      summarizeReadinessStateCounts(report.components)
    )
  ) {
    throw new ContractError(`${context}: readiness state counts must match components`);
  }
  if (report.next_component_id !== (attentionComponents[0]?.component_id ?? null)) {
    throw new ContractError(`${context}: next component mismatch`);
  }
  if (
    report.next_readiness_state !==
    (attentionComponents[0]?.readiness_state ?? null)
  ) {
    throw new ContractError(`${context}: next readiness state mismatch`);
  }
  if (report.next_check_script !== (attentionComponents[0]?.next_check_script ?? null)) {
    throw new ContractError(`${context}: next script mismatch`);
  }
  assertFoundationObsPickupRuntimeSummarySafe(
    report.foundation_obs_pickup_runtime_summary,
    `${context}: foundation OBS pickup runtime summary`
  );
  assertProductionHandoffSummarySafe(report.production_handoff_summary, report, context);
  assertBoundaryPolicy(report.boundary_policy, [
    "env_names_only",
    "counts_statuses_and_booleans_only",
    "no_child_reports",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_raw_frames",
    "no_ocr_text",
    "no_candidates",
    "no_commands",
    "no_raw_runtime_state",
    "read_only_runtime_handoff_status",
    "script_names_only",
  ], context);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields =
    requiredFields.length === PRODUCTION_RUNTIME_HANDOFF_BOUNDARY_POLICY_FIELDS.size
      ? PRODUCTION_RUNTIME_HANDOFF_BOUNDARY_POLICY_FIELDS
      : new Set(requiredFields);
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

function summarizeComponent({
  componentId,
  runtimeStatus,
  ready,
  nextCheckScript,
  handoffSummary,
  flowStatus,
}) {
  const safeNextCheckScript =
    ready === true ? null : nextCheckScript ?? defaultRuntimeCheckScript(componentId);
  return {
    schema: "iris_production_runtime_handoff_component_summary_v1",
    component_id: componentId,
    component_status: ready ? "ready" : "attention",
    readiness_state: summarizeReadinessState({
      ready,
      runtimeStatus,
      flowStatus,
      handoffSummary,
    }),
    runtime_status: safeLabel(runtimeStatus),
    flow_status: safeNullableLabel(flowStatus),
    next_check_script: safeNextCheckScript,
    report_only: handoffSummary?.runtime_status_report_only === true,
    no_real_processes_started:
      handoffSummary?.real_processes_not_started_by_report === true ||
      handoffSummary?.live_polling_not_started_by_report === true ||
      handoffSummary?.no_commit_side_effects_by_report === true ||
      handoffSummary?.no_real_capture_started_by_report === true,
    no_runtime_side_effects_started:
      handoffSummary?.runtime_status_report_only === true &&
      (handoffSummary?.real_processes_not_started_by_report === true ||
        handoffSummary?.live_polling_not_started_by_report === true ||
        handoffSummary?.direct_youtube_api_not_called_by_report === true ||
        handoffSummary?.oauth_flow_not_started_by_report === true ||
        handoffSummary?.no_commit_side_effects_by_report === true ||
        handoffSummary?.no_polling_side_effects_by_report === true ||
        handoffSummary?.no_control_side_effects_by_report === true ||
        handoffSummary?.no_real_capture_started_by_report === true),
    candidates_remain_gated:
      handoffSummary?.memory_and_relationship_candidates_remain_gated === true ||
      handoffSummary?.memory_candidates_not_committed_directly === true ||
      handoffSummary?.input_action_candidates_never_forwarded_directly === true,
    endpoint_values_not_exposed:
      handoffSummary?.endpoint_values_not_exposed === true,
    secret_values_not_exposed: handoffSummary?.secret_values_not_exposed === true,
  };
}

function defaultRuntimeCheckScript(componentId) {
  switch (componentId) {
    case "foundation_runtime":
      return "npm run dev:foundation:runtime-status";
    case "youtube_ingest_runtime":
      return "npm run dev:youtube:runtime-status";
    case "persistence_runtime":
      return "npm run dev:persistence:runtime-status";
    case "gameplay_runtime":
      return "npm run dev:gameplay:runtime-status";
    default:
      return null;
  }
}

function summarizeReadinessState({
  ready,
  runtimeStatus,
  flowStatus,
  handoffSummary,
}) {
  if (ready === true) return "ready";
  if (
    READINESS_STATES.has(handoffSummary?.next_readiness_state) &&
    handoffSummary.next_readiness_state !== "ready"
  ) {
    return handoffSummary.next_readiness_state;
  }
  const statusText = `${runtimeStatus ?? ""} ${flowStatus ?? ""}`.toLowerCase();
  if (
    statusText.includes("configuration") ||
    statusText.includes("attention_required")
  ) {
    return "configuration_waiting";
  }
  if (statusText.includes("waiting_for") || statusText.includes("runtime")) {
    return "runtime_waiting";
  }
  return "operator_review_required";
}

function assertComponentSafe(component, context) {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    throw new ContractError(`${context}: component summary required`);
  }
  if (component.schema !== "iris_production_runtime_handoff_component_summary_v1") {
    throw new ContractError(`${context}: invalid component schema`);
  }
  for (const field of Object.keys(component)) {
    if (!COMPONENT_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected component field`);
    }
  }
  if (!COMPONENT_IDS.has(component.component_id)) {
    throw new ContractError(`${context}: invalid component id`);
  }
  if (!COMPONENT_STATUSES.has(component.component_status)) {
    throw new ContractError(`${context}: invalid component status`);
  }
  if (
    !READINESS_STATES.has(component.readiness_state)
  ) {
    throw new ContractError(`${context}: invalid component readiness state`);
  }
  for (const field of ["runtime_status", "flow_status"]) {
    assertSafeNullableLabel(component[field], `${context}: invalid component ${field}`);
  }
  assertSafeOptionalScriptName(
    component.next_check_script,
    `${context}: component next check script`
  );
  if (
    component.component_status === "ready" &&
    (component.readiness_state !== "ready" || component.next_check_script !== null)
  ) {
    throw new ContractError(`${context}: ready component summary mismatch`);
  }
  if (
    component.component_status === "attention" &&
    (component.readiness_state === "ready" || component.next_check_script === null)
  ) {
    throw new ContractError(`${context}: attention component summary mismatch`);
  }
  for (const field of [
    "report_only",
    "no_real_processes_started",
    "no_runtime_side_effects_started",
    "candidates_remain_gated",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
  ]) {
    if (typeof component[field] !== "boolean") {
      throw new ContractError(`${context}: invalid component ${field}`);
    }
  }
  if (component.component_id === "gameplay_runtime") {
    for (const field of [
      "candidates_remain_gated",
      "no_runtime_side_effects_started",
      "no_real_processes_started",
      "endpoint_values_not_exposed",
      "secret_values_not_exposed",
    ]) {
      if (component[field] !== true) {
        throw new ContractError(`${context}: gameplay runtime ${field} boundary required`);
      }
    }
  }
}

function assertProductionHandoffSummarySafe(summary, report, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary required`);
  }
  if (summary.schema !== "iris_production_runtime_handoff_status_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff summary schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!PRODUCTION_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: unexpected production handoff field ${field}`
      );
    }
  }
  for (const field of [
    "runtime_handoff_report_only",
    "real_processes_not_started_by_report",
    "live_polling_not_started_by_report",
    "real_capture_not_started_by_report",
    "real_game_or_os_input_not_started_by_report",
    "runtime_side_effects_not_started_by_report",
    "memory_and_relationship_candidates_remain_gated",
    "input_action_candidates_never_forwarded_directly",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
    "raw_frames_not_exposed",
    "raw_ocr_text_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff ${field}`);
    }
  }
  for (const field of [
    "component_count",
    "ready_component_count",
    "attention_component_count",
  ]) {
    if (summary[field] !== report[field]) {
      throw new ContractError(`${context}: production handoff ${field} mismatch`);
    }
  }
  if (summary.next_component_id !== report.next_component_id) {
    throw new ContractError(`${context}: production handoff next component mismatch`);
  }
  if (summary.next_readiness_state !== report.next_readiness_state) {
    throw new ContractError(`${context}: production handoff next readiness mismatch`);
  }
  assertReadinessStateCountsSafe(summary.readiness_state_counts, report, context);
  if (
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: production handoff readiness counts mismatch`);
  }
  if (summary.next_check_script !== report.next_check_script) {
    throw new ContractError(`${context}: production handoff next script mismatch`);
  }
  assertSafeOptionalScriptName(
    summary.postgres_admin_save_preflight_script,
    `${context}: production handoff PostgreSQL preflight script`
  );
  if (
    summary.postgres_admin_save_preflight_script !==
    "npm run dev:persistence:postgres-admin-save-preflight"
  ) {
    throw new ContractError(`${context}: invalid PostgreSQL preflight script`);
  }
  assertSafeOptionalScriptName(
    summary.operator_policy_async_save_gate_roundtrip_script,
    `${context}: production handoff operator policy async save gate roundtrip script`
  );
  if (
    summary.operator_policy_async_save_gate_roundtrip_script !==
    "npm run dev:operator-policy:async-save-gate-roundtrip"
  ) {
    throw new ContractError(
      `${context}: invalid operator policy async save gate roundtrip script`
    );
  }
  assertFoundationObsPickupRuntimeSummarySafe(
    summary.foundation_obs_pickup_runtime_summary,
    `${context}: production handoff foundation OBS pickup runtime summary`
  );
  if (
    JSON.stringify(summary.foundation_obs_pickup_runtime_summary) !==
    JSON.stringify(report.foundation_obs_pickup_runtime_summary)
  ) {
    throw new ContractError(
      `${context}: production handoff foundation OBS pickup summary mismatch`
    );
  }
}

function summarizeFoundationObsPickupRuntime(handoffSummary) {
  const obsPickupReady = handoffSummary?.obs_pickup_ready === true;
  const obsHandoffReady = handoffSummary?.obs_handoff_ready === true;
  const pendingWorkerJobCount = safeNonNegativeInteger(
    handoffSummary?.pending_worker_job_count
  );
  const retryBlockedWorkerJobCount = safeNonNegativeInteger(
    handoffSummary?.retry_blocked_worker_job_count
  );
  const localBridgeWorkerReady =
    handoffSummary?.local_bridge_worker_ready === true;
  return {
    schema: "iris_production_runtime_handoff_foundation_obs_pickup_summary_v1",
    runtime_handoff_report_only: true,
    real_obs_operation_not_started_by_report: true,
    runtime_adapter_packets_not_exposed: true,
    artifact_paths_not_exposed: true,
    local_bridge_worker_ready: localBridgeWorkerReady,
    real_engine_handoff_ready:
      handoffSummary?.real_engine_handoff_ready === true,
    obs_browser_source_ready:
      handoffSummary?.obs_browser_source_ready === true,
    obs_handoff_ready: obsHandoffReady,
    render_manifest_available:
      handoffSummary?.render_manifest_available === true,
    obs_pickup_ready: obsPickupReady,
    artifact_pickup_ready_adapter_count:
      safeNonNegativeInteger(handoffSummary?.artifact_pickup_ready_adapter_count),
    pending_worker_job_count: pendingWorkerJobCount,
    retry_blocked_worker_job_count: retryBlockedWorkerJobCount,
    local_bridge_worker_attention_reason: safeNullableLabel(
      handoffSummary?.local_bridge_worker_attention_reason
    ),
    local_bridge_worker_next_operator_action_id: safeNullableLabel(
      handoffSummary?.local_bridge_worker_next_operator_action_id
    ),
    real_engine_worker_flow_status: safeLabel(
      handoffSummary?.real_engine_worker_flow_status
    ),
    next_runtime_attention: safeNullableLabel(
      handoffSummary?.next_runtime_attention
    ),
    next_runtime_check_script: isSafeScriptName(
      handoffSummary?.next_runtime_check_script
    )
      ? handoffSummary.next_runtime_check_script
      : null,
    obs_pickup_runtime_state:
      localBridgeWorkerReady && obsPickupReady && obsHandoffReady
        ? "obs_pickup_runtime_ready"
        : "obs_pickup_runtime_waiting",
    boundary_policy: {
      booleans_counts_statuses_and_script_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_artifact_paths: true,
      no_raw_runtime_state: true,
    },
    adapter_validation_required: true,
  };
}

function assertFoundationObsPickupRuntimeSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: foundation OBS pickup runtime summary required`);
  }
  if (
    summary.schema !==
    "iris_production_runtime_handoff_foundation_obs_pickup_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid foundation OBS pickup runtime schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!FOUNDATION_OBS_PICKUP_RUNTIME_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected foundation OBS pickup field`);
    }
  }
  for (const field of [
    "runtime_handoff_report_only",
    "real_obs_operation_not_started_by_report",
    "runtime_adapter_packets_not_exposed",
    "artifact_paths_not_exposed",
    "local_bridge_worker_ready",
    "real_engine_handoff_ready",
    "obs_browser_source_ready",
    "obs_handoff_ready",
    "render_manifest_available",
    "obs_pickup_ready",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid foundation OBS pickup flag`);
    }
  }
  for (const field of [
    "runtime_handoff_report_only",
    "real_obs_operation_not_started_by_report",
    "runtime_adapter_packets_not_exposed",
    "artifact_paths_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: foundation OBS pickup safety flag required`);
    }
  }
  for (const field of [
    "artifact_pickup_ready_adapter_count",
    "pending_worker_job_count",
    "retry_blocked_worker_job_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  assertSafeNullableLabel(
    summary.local_bridge_worker_attention_reason,
    `${context}: local bridge worker attention reason`
  );
  assertSafeNullableLabel(
    summary.local_bridge_worker_next_operator_action_id,
    `${context}: local bridge worker next operator action`
  );
  assertSafeNullableLabel(
    summary.real_engine_worker_flow_status,
    `${context}: worker flow status`
  );
  assertSafeNullableLabel(
    summary.next_runtime_attention,
    `${context}: next runtime attention`
  );
  assertSafeOptionalScriptName(
    summary.next_runtime_check_script,
    `${context}: next runtime check script`
  );
  if (!OBS_PICKUP_RUNTIME_STATES.has(summary.obs_pickup_runtime_state)) {
    throw new ContractError(`${context}: invalid OBS pickup runtime state`);
  }
  if (
    summary.obs_pickup_ready === true &&
    summary.obs_handoff_ready === true &&
    summary.obs_pickup_runtime_state !== "obs_pickup_runtime_ready"
  ) {
    throw new ContractError(`${context}: ready OBS pickup runtime state mismatch`);
  }
  if (
    (summary.obs_pickup_ready !== true || summary.obs_handoff_ready !== true) &&
    summary.obs_pickup_runtime_state !== "obs_pickup_runtime_waiting"
  ) {
    throw new ContractError(`${context}: waiting OBS pickup runtime state mismatch`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [...FOUNDATION_OBS_PICKUP_RUNTIME_BOUNDARY_POLICY_FIELDS],
    `${context}: OBS pickup runtime boundary policy`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: OBS pickup runtime validation required`);
  }
}

function summarizeReadinessStateCounts(components) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const component of components) {
    counts[component.readiness_state] += 1;
  }
  return counts;
}

function assertReadinessStateCountsSafe(counts, report, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: readiness state counts required`);
  }
  let total = 0;
  for (const field of READINESS_STATES) {
    if (!Number.isInteger(counts[field]) || counts[field] < 0) {
      throw new ContractError(`${context}: invalid readiness state count`);
    }
    total += counts[field];
  }
  for (const field of Object.keys(counts)) {
    if (!READINESS_STATES.has(field)) {
      throw new ContractError(`${context}: unknown readiness state count`);
    }
  }
  if (total !== report.component_count) {
    throw new ContractError(`${context}: readiness state count mismatch`);
  }
}

function sameReadinessStateCounts(left, right) {
  for (const state of READINESS_STATES) {
    if (left?.[state] !== right?.[state]) return false;
  }
  return true;
}

function safeLabel(value) {
  return safeNullableLabel(value) ?? "unknown";
}

function safeNullableLabel(value) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).replace(/\s+/g, "_").trim().slice(0, 120);
  if (!text || UNSAFE_LABEL_PATTERN.test(text)) return "unsafe_status_omitted";
  return text;
}

function assertSafeNullableLabel(value, context) {
  if (value === null) return;
  if (typeof value !== "string" || value.length === 0 || value.length > 120) {
    throw new ContractError(context);
  }
  if (UNSAFE_LABEL_PATTERN.test(value) || URL_PATTERN.test(value)) {
    throw new ContractError(context);
  }
}

function assertSafeOptionalComponentId(componentId, context) {
  if (componentId === null) return;
  if (!COMPONENT_IDS.has(componentId)) {
    throw new ContractError(`${context}: invalid next component id`);
  }
}

function assertSafeOptionalReadinessState(readinessState, context) {
  if (readinessState === null) return;
  if (!READINESS_STATES.has(readinessState)) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
}

function assertSafeOptionalScriptName(script, context) {
  if (script === null) return;
  if (
    typeof script !== "string" ||
    !/^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      script
    )
  ) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function isSafeScriptName(script) {
  return (
    typeof script === "string" &&
    /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      script
    )
  );
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function safeNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function assertNoForbiddenRuntimeHandoffFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenRuntimeHandoffFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_RUNTIME_HANDOFF_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: report must not expose candidates, commands, raw frames, secrets, endpoints, or payloads`,
        { field, path }
      );
    }
    assertNoForbiddenRuntimeHandoffFields(child, context, `${path}.${field}`);
  }
}
