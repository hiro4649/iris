import { ContractError } from "../../core/contracts.js";
import {
  assertProductionConfigDoctorSafe,
  createProductionConfigDoctor,
} from "./productionConfigDoctor.js";
import {
  assertProductionReadinessRunbookSafe,
  createProductionReadinessRunbook,
} from "./productionReadinessRunbook.js";

const FORBIDDEN_YOUTUBE_PREFLIGHT_FIELDS = new Set([
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
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "value",
  "payload",
]);

const SOURCE_MODES = new Set(["youtube_api", "http_relay", "not_configured"]);
const PREFLIGHT_STATUSES = new Set([
  "ready_to_poll_youtube_ingest",
  "blocked_by_configuration",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const AUTH_MODES = new Set([
  "data_api_key",
  "static_oauth",
  "oauth_refresh",
  "oauth_refresh_incomplete",
  "missing",
  "not_applicable",
]);
const ATTENTION_REASONS = new Set([
  "source_not_configured",
  "missing_required_env",
  "auth_not_ready",
  "scheduler_disabled",
  "cursor_store_missing",
  "local_target_policy_attention",
]);
const LOCAL_TARGET_STATUSES = new Set(["allowed", "attention", "not_applicable"]);
const YOUTUBE_INGEST_PREFLIGHT_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "preflight_status",
  "source_mode",
  "ingest_scheduler_enabled",
  "scheduler_required_for_live_polling",
  "auth_mode",
  "auth_ready",
  "oauth_refresh_client_configured",
  "cursor_store_configured",
  "cursor_store_required_for_restart_resume",
  "local_target_policy_status",
  "configured_env",
  "missing_required_env",
  "attention_reasons",
  "attention_reason_count",
  "next_attention_reason",
  "next_readiness_state",
  "readiness_state_counts",
  "ingest_stage_summary",
  "integration_readiness",
  "verification_plan_summary",
  "support_event_policy",
  "boundary_policy",
  "adapter_validation_required",
]);
const INGEST_STAGE_INTEGRATIONS = new Set([
  "youtube_live_chat_api",
  "media_and_external_topic_ingestion",
]);

export function createYouTubeIngestPreflightReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const doctor = createProductionConfigDoctor({ env, generatedAtMs });
  const runbook = createProductionReadinessRunbook({ env, generatedAtMs });
  assertProductionConfigDoctorSafe(doctor, "youtube ingest preflight doctor");
  assertProductionReadinessRunbookSafe(runbook, "youtube ingest preflight runbook");
  const youtubeCheck = doctor.checks.find(
    (check) => check.integration === "youtube_live_chat_api"
  );
  const youtubeStage = runbook.stages.find(
    (stage) => stage.stage_id === "youtube_comments_and_support"
  );
  if (!youtubeCheck || !youtubeStage) {
    throw new ContractError("youtube ingest preflight: missing youtube check");
  }
  const attentionReasons = buildAttentionReasons(youtubeCheck);
  const readinessStates =
    attentionReasons.length > 0
      ? attentionReasons.map(readinessStateForAttentionReason)
      : ["ready"];
  const ingestIntegrationReadiness = youtubeStage.integrations.map((integration) => ({
    schema: "iris_youtube_ingest_preflight_integration_readiness_v1",
    integration: integration.integration,
    status: integration.status,
    mode: integration.mode,
    readiness_state: readinessStateForIntegration(integration),
  }));
  const report = {
    schema: "iris_youtube_ingest_preflight_report_v1",
    generated_at_ms: generatedAtMs,
    preflight_status:
      youtubeCheck.status === "ready" && attentionReasons.length === 0
        ? "ready_to_poll_youtube_ingest"
        : "blocked_by_configuration",
    source_mode: youtubeCheck.mode,
    ingest_scheduler_enabled: youtubeCheck.http_ingest_scheduler_enabled === true,
    scheduler_required_for_live_polling:
      youtubeCheck.http_ingest_scheduler_required_for_live_polling === true,
    auth_mode:
      youtubeCheck.mode === "http_relay"
        ? "not_applicable"
        : youtubeCheck.auth_mode ?? "missing",
    auth_ready:
      youtubeCheck.mode === "http_relay" ? null : youtubeCheck.auth_ready === true,
    oauth_refresh_client_configured:
      youtubeCheck.mode === "http_relay"
        ? null
        : youtubeCheck.oauth_refresh_client_configured === true,
    cursor_store_configured:
      youtubeCheck.mode !== "http_relay"
        ? youtubeCheck.cursor_store_configured === true
        : null,
    cursor_store_required_for_restart_resume:
      youtubeCheck.mode !== "http_relay"
        ? youtubeCheck.cursor_store_required_for_restart_resume === true
        : null,
    local_target_policy_status: summarizeLocalTargetPolicyStatus(youtubeCheck),
    configured_env: youtubeCheck.configured_env,
    missing_required_env: youtubeCheck.missing_env,
    attention_reasons: attentionReasons,
    attention_reason_count: attentionReasons.length,
    next_attention_reason: attentionReasons[0] ?? null,
    next_readiness_state: readinessStates[0],
    readiness_state_counts: countReadinessStates(readinessStates),
    ingest_stage_summary: {
      schema: "iris_youtube_ingest_preflight_stage_summary_v1",
      stage_id: youtubeStage.stage_id,
      stage_status: youtubeStage.status,
      readiness_state: readinessStateForIngestStage(
        youtubeStage,
        readinessStates,
        ingestIntegrationReadiness
      ),
      integration_count: youtubeStage.integrations.length,
      ready_integration_count: youtubeStage.integrations.filter(
        (integration) => integration.status === "ready"
      ).length,
      attention_integration_count: youtubeStage.integrations.filter(
        (integration) => integration.status === "attention"
      ).length,
      missing_required_env_count: youtubeStage.missing_required_env.length,
      first_verification_script: youtubeStage.verification_scripts[0] ?? null,
      verification_script_count: youtubeStage.verification_scripts.length,
    },
    integration_readiness: ingestIntegrationReadiness,
    verification_plan_summary: {
      schema: "iris_youtube_ingest_preflight_verification_summary_v1",
      stage_id: youtubeStage.stage_id,
      stage_status: youtubeStage.status,
      first_verification_script: youtubeStage.verification_scripts[0] ?? null,
      verification_script_count: youtubeStage.verification_scripts.length,
      configured_ingest_script: youtubeCheck.configured_command,
      local_fixture_script: youtubeCheck.local_fixture_command,
    },
    support_event_policy: {
      comment_events_remain_comment_events: true,
      normalized_as_donation_event: true,
      support_events_not_normalized_as_comments: true,
      relationship_and_memory_candidates_validation_gated: true,
      support_messages_not_exposed_in_status: true,
    },
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      no_secret_values: true,
      no_platform_cursor_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_candidates: true,
      no_commands: true,
      read_only_preflight: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeIngestPreflightReportSafe(report);
  return report;
}

export function assertYouTubeIngestPreflightReportSafe(
  report,
  context = "youtube ingest preflight report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenYouTubePreflightFields(report, context);
  if (report.schema !== "iris_youtube_ingest_preflight_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!YOUTUBE_INGEST_PREFLIGHT_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!PREFLIGHT_STATUSES.has(report.preflight_status)) {
    throw new ContractError(`${context}: invalid preflight status`);
  }
  if (!SOURCE_MODES.has(report.source_mode)) {
    throw new ContractError(`${context}: invalid source mode`);
  }
  for (const field of [
    "ingest_scheduler_enabled",
    "scheduler_required_for_live_polling",
  ]) {
    if (typeof report[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!AUTH_MODES.has(report.auth_mode)) {
    throw new ContractError(`${context}: invalid auth mode`);
  }
  for (const field of [
    "auth_ready",
    "oauth_refresh_client_configured",
    "cursor_store_configured",
    "cursor_store_required_for_restart_resume",
  ]) {
    if (report[field] !== null && typeof report[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!LOCAL_TARGET_STATUSES.has(report.local_target_policy_status)) {
    throw new ContractError(`${context}: invalid local target policy status`);
  }
  assertEnvNameListSafe(report.configured_env, `${context}: configured env`);
  assertEnvNameListSafe(report.missing_required_env, `${context}: missing env`);
  if (!Array.isArray(report.attention_reasons)) {
    throw new ContractError(`${context}: attention reasons must be an array`);
  }
  for (const reason of report.attention_reasons) {
    if (!ATTENTION_REASONS.has(reason)) {
      throw new ContractError(`${context}: invalid attention reason`);
    }
  }
  if (
    !Number.isInteger(report.attention_reason_count) ||
    report.attention_reason_count !== report.attention_reasons.length
  ) {
    throw new ContractError(`${context}: invalid attention reason count`);
  }
  if (report.attention_reason_count === 0) {
    if (
      report.preflight_status !== "ready_to_poll_youtube_ingest" ||
      report.next_attention_reason !== null
    ) {
      throw new ContractError(`${context}: invalid ready preflight summary`);
    }
  } else if (
    report.preflight_status !== "blocked_by_configuration" ||
    report.next_attention_reason !== report.attention_reasons[0]
  ) {
    throw new ContractError(`${context}: invalid attention preflight summary`);
  }
  assertSafeReadinessState(report.next_readiness_state, context);
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  const expectedReadinessStates =
    report.attention_reasons.length > 0
      ? report.attention_reasons.map(readinessStateForAttentionReason)
      : ["ready"];
  if (
    report.next_readiness_state !== expectedReadinessStates[0] ||
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      countReadinessStates(expectedReadinessStates)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state summary`);
  }
  assertIngestStageSummarySafe(report.ingest_stage_summary, context);
  assertIngestIntegrationReadinessListSafe(report.integration_readiness, context);
  assertVerificationSummarySafe(report.verification_plan_summary, context);
  assertSupportEventPolicySafe(report.support_event_policy, context);
  assertBoundaryPolicy(report.boundary_policy, [
    "env_names_only",
    "script_names_only",
    "no_secret_values",
    "no_platform_cursor_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_support_message_text",
    "no_candidates",
    "no_commands",
    "read_only_preflight",
  ], `${context}: boundary policy`);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
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

function buildAttentionReasons(check) {
  return [
    check.mode === "not_configured" ? "source_not_configured" : null,
    check.missing_env.length > 0 ? "missing_required_env" : null,
    check.mode !== "http_relay" && check.auth_ready !== true ? "auth_not_ready" : null,
    check.http_ingest_scheduler_enabled !== true ? "scheduler_disabled" : null,
    check.mode !== "http_relay" && check.cursor_store_configured !== true
      ? "cursor_store_missing"
      : null,
    summarizeLocalTargetPolicyStatus(check) === "attention"
      ? "local_target_policy_attention"
      : null,
  ].filter(Boolean);
}

function summarizeLocalTargetPolicyStatus(check) {
  if (check.mode !== "http_relay") return "not_applicable";
  return check.youtube_relay_endpoint_locality_ok === true ? "allowed" : "attention";
}

function assertIngestStageSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: ingest stage summary is required`);
  }
  if (summary.schema !== "iris_youtube_ingest_preflight_stage_summary_v1") {
    throw new ContractError(`${context}: invalid ingest stage summary schema`);
  }
  if (summary.stage_id !== "youtube_comments_and_support") {
    throw new ContractError(`${context}: invalid ingest stage summary id`);
  }
  if (!["ready", "attention"].includes(summary.stage_status)) {
    throw new ContractError(`${context}: invalid ingest stage status`);
  }
  assertSafeReadinessState(summary.readiness_state, context);
  if (summary.stage_status === "ready" && summary.readiness_state !== "ready") {
    throw new ContractError(`${context}: invalid ready ingest readiness state`);
  }
  if (summary.stage_status === "attention" && summary.readiness_state === "ready") {
    throw new ContractError(`${context}: invalid attention ingest readiness state`);
  }
  for (const field of [
    "integration_count",
    "ready_integration_count",
    "attention_integration_count",
    "missing_required_env_count",
    "verification_script_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    summary.ready_integration_count + summary.attention_integration_count !==
    summary.integration_count
  ) {
    throw new ContractError(`${context}: invalid ingest integration count`);
  }
  if (summary.stage_status === "ready" && summary.attention_integration_count !== 0) {
    throw new ContractError(`${context}: ready ingest summary has attention checks`);
  }
  if (summary.stage_status === "attention" && summary.attention_integration_count === 0) {
    throw new ContractError(`${context}: attention ingest summary has no attention checks`);
  }
  if (summary.first_verification_script !== null) {
    assertSafeScriptName(summary.first_verification_script, context);
  }
}

function assertIngestIntegrationReadinessListSafe(readiness, context) {
  if (!Array.isArray(readiness) || readiness.length === 0) {
    throw new ContractError(`${context}: ingest integration readiness is required`);
  }
  const seen = new Set();
  for (const item of readiness) {
    assertIngestIntegrationReadinessSafe(item, context);
    if (seen.has(item.integration)) {
      throw new ContractError(`${context}: duplicate ingest integration`);
    }
    seen.add(item.integration);
  }
  for (const integration of INGEST_STAGE_INTEGRATIONS) {
    if (!seen.has(integration)) {
      throw new ContractError(`${context}: missing ingest integration`);
    }
  }
}

function assertIngestIntegrationReadinessSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: invalid ingest integration readiness`);
  }
  if (item.schema !== "iris_youtube_ingest_preflight_integration_readiness_v1") {
    throw new ContractError(`${context}: invalid ingest integration readiness schema`);
  }
  if (!INGEST_STAGE_INTEGRATIONS.has(item.integration)) {
    throw new ContractError(`${context}: invalid ingest integration`);
  }
  if (!["ready", "attention"].includes(item.status)) {
    throw new ContractError(`${context}: invalid ingest integration status`);
  }
  assertSafeReadinessState(item.readiness_state, context);
  if (item.readiness_state !== readinessStateForIntegration(item)) {
    throw new ContractError(`${context}: invalid ingest integration readiness state`);
  }
  if (typeof item.mode !== "string" || !/^[a-z0-9_]+$/.test(item.mode)) {
    throw new ContractError(`${context}: invalid ingest integration mode`);
  }
}

function readinessStateForAttentionReason(reason) {
  switch (reason) {
    case "source_not_configured":
    case "missing_required_env":
    case "cursor_store_missing":
    case "auth_not_ready":
    case "scheduler_disabled":
      return "configuration_waiting";
    case "local_target_policy_attention":
      return "operator_review_required";
    default:
      return "operator_review_required";
  }
}

function readinessStateForIntegration(integration) {
  if (integration.status === "ready") return "ready";
  if (integration.integration === "youtube_live_chat_api") {
    return "configuration_waiting";
  }
  return "operator_review_required";
}

function readinessStateForIngestStage(stage, readinessStates, integrationReadiness) {
  if (stage.status === "ready") return "ready";
  const attentionState = readinessStates.find((state) => state !== "ready");
  if (attentionState) return attentionState;
  return (
    integrationReadiness.find((integration) => integration.readiness_state !== "ready")
      ?.readiness_state ?? "operator_review_required"
  );
}

function countReadinessStates(states) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const state of states) {
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
    throw new ContractError(`${context}: readiness state counts are required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness state count`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every(
    (state) => Number(left?.[state] ?? -1) === Number(right?.[state] ?? -2)
  );
}

function assertVerificationSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: verification summary is required`);
  }
  if (summary.schema !== "iris_youtube_ingest_preflight_verification_summary_v1") {
    throw new ContractError(`${context}: invalid verification summary schema`);
  }
  if (summary.stage_id !== "youtube_comments_and_support") {
    throw new ContractError(`${context}: invalid stage id`);
  }
  if (!["ready", "attention"].includes(summary.stage_status)) {
    throw new ContractError(`${context}: invalid stage status`);
  }
  if (summary.first_verification_script !== null) {
    assertSafeScriptName(summary.first_verification_script, context);
  }
  if (
    !Number.isInteger(summary.verification_script_count) ||
    summary.verification_script_count < 0
  ) {
    throw new ContractError(`${context}: invalid verification script count`);
  }
  assertSafeScriptName(summary.configured_ingest_script, context);
  assertSafeScriptName(summary.local_fixture_script, context);
}

function assertSupportEventPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: support event policy is required`);
  }
  for (const field of [
    "comment_events_remain_comment_events",
    "normalized_as_donation_event",
    "support_events_not_normalized_as_comments",
    "relationship_and_memory_candidates_validation_gated",
    "support_messages_not_exposed_in_status",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid support event policy`);
    }
  }
}

function assertSafeScriptName(script, context) {
  if (
    typeof script !== "string" ||
    !(
      /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
        script
      ) || script === "npm test"
    )
  ) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function assertEnvNameListSafe(names, context) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of names) {
    if (typeof name !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
}

function assertNoForbiddenYouTubePreflightFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenYouTubePreflightFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_YOUTUBE_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe preflight field`, { field, path });
    }
    assertNoForbiddenYouTubePreflightFields(child, context, `${path}.${field}`);
  }
}
