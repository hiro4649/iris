import { ContractError } from "../../core/contracts.js";
import {
  assertProductionConfigDoctorSafe,
  createProductionConfigDoctor,
} from "./productionConfigDoctor.js";
import {
  assertProductionReadinessRunbookSafe,
  createProductionReadinessRunbook,
} from "./productionReadinessRunbook.js";

const FORBIDDEN_GAMEPLAY_PREFLIGHT_FIELDS = new Set([
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
  "raw_frame",
  "image",
  "frame",
  "ocr_text",
]);

const PREFLIGHT_STATUSES = new Set([
  "ready_to_poll_game_and_approve_control",
  "blocked_by_configuration",
]);
const CHECK_STATUSES = new Set(["ready", "attention"]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const VISION_MODES = new Set(["http_game_observation", "not_configured"]);
const GAME_CONTROL_MODES = new Set(["http", "mock", "unsupported_adapter"]);
const TARGET_POLICY_STATUSES = new Set(["allowed", "attention", "not_applicable"]);
const GAMEPLAY_PREFLIGHT_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "preflight_status",
  "vision_status",
  "game_control_status",
  "vision_mode",
  "game_control_mode",
  "vision_target_configured",
  "vision_request_method_configured",
  "vision_request_method_supported",
  "ingest_scheduler_enabled",
  "scheduler_required_for_screen_polling",
  "vision_target_policy_status",
  "game_control_enabled",
  "game_control_http_adapter_ready",
  "game_control_target_configured",
  "game_control_target_policy_status",
  "available_actions_configured",
  "approved_action_kind_count",
  "unsupported_action_name_count",
  "fallback_to_wait_when_unconfigured",
  "rate_limit_env_configured",
  "stale_observation_guard_env_configured",
  "configured_env",
  "missing_required_env",
  "attention_reasons",
  "attention_reason_count",
  "next_attention_reason",
  "next_readiness_state",
  "readiness_state_counts",
  "gameplay_stage_summary",
  "integration_readiness",
  "verification_plan_summary",
  "approval_policy",
  "boundary_policy",
  "adapter_validation_required",
]);
const GAMEPLAY_STAGE_INTEGRATIONS = new Set([
  "real_screen_capture_or_vision_ingestion",
  "approved_game_control_adapter",
]);
const ATTENTION_REASONS = new Set([
  "missing_required_env",
  "vision_source_not_configured",
  "vision_method_not_supported",
  "ingest_scheduler_disabled",
  "vision_target_policy_attention",
  "game_control_disabled",
  "game_control_adapter_not_http",
  "game_control_target_missing",
  "game_control_target_policy_attention",
  "available_actions_missing_or_unsupported",
]);

export function createGameplayPreflightReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const doctor = createProductionConfigDoctor({ env, generatedAtMs });
  const runbook = createProductionReadinessRunbook({ env, generatedAtMs });
  assertProductionConfigDoctorSafe(doctor, "gameplay preflight doctor");
  assertProductionReadinessRunbookSafe(runbook, "gameplay preflight runbook");

  const visionCheck = doctor.checks.find(
    (check) => check.integration === "real_screen_capture_or_vision_ingestion"
  );
  const gameControlCheck = doctor.checks.find(
    (check) => check.integration === "approved_game_control_adapter"
  );
  const gameplayStage = runbook.stages.find(
    (stage) => stage.stage_id === "vision_and_safe_game_control"
  );
  if (!visionCheck || !gameControlCheck || !gameplayStage) {
    throw new ContractError("gameplay preflight: missing gameplay checks");
  }

  const attentionReasons = buildAttentionReasons({
    visionCheck,
    gameControlCheck,
  });
  const readinessStates =
    attentionReasons.length > 0
      ? attentionReasons.map(readinessStateForAttentionReason)
      : ["ready"];
  const integrationReadiness = gameplayStage.integrations.map((integration) => ({
    schema: "iris_gameplay_preflight_integration_readiness_v1",
    integration: integration.integration,
    status: integration.status,
    mode: integration.mode,
    readiness_state: readinessStateForIntegration(integration),
  }));
  const report = {
    schema: "iris_gameplay_preflight_report_v1",
    generated_at_ms: generatedAtMs,
    preflight_status:
      visionCheck.status === "ready" &&
      gameControlCheck.status === "ready" &&
      attentionReasons.length === 0
        ? "ready_to_poll_game_and_approve_control"
        : "blocked_by_configuration",
    vision_status: visionCheck.status,
    game_control_status: gameControlCheck.status,
    vision_mode: visionCheck.mode,
    game_control_mode: gameControlCheck.mode,
    vision_target_configured: visionCheck.mode === "http_game_observation",
    vision_request_method_configured:
      visionCheck.request_method_configured === true,
    vision_request_method_supported: visionCheck.request_method_supported === true,
    ingest_scheduler_enabled: visionCheck.http_ingest_scheduler_enabled === true,
    scheduler_required_for_screen_polling:
      visionCheck.http_ingest_scheduler_required_for_screen_polling === true,
    vision_target_policy_status: summarizeTargetPolicyStatus(
      visionCheck.vision_endpoint_scope,
      visionCheck.vision_endpoint_locality_ok
    ),
    game_control_enabled: gameControlCheck.game_control_enabled_configured === true,
    game_control_http_adapter_ready:
      gameControlCheck.game_control_http_adapter_configured === true,
    game_control_target_configured:
      gameControlCheck.game_control_endpoint_configured === true,
    game_control_target_policy_status: summarizeTargetPolicyStatus(
      gameControlCheck.game_control_endpoint_scope,
      gameControlCheck.game_control_endpoint_locality_ok
    ),
    available_actions_configured:
      gameControlCheck.available_actions_configured === true,
    approved_action_kind_count: safeCount(gameControlCheck.available_action_count),
    unsupported_action_name_count: safeCount(
      gameControlCheck.unsupported_action_name_count
    ),
    fallback_to_wait_when_unconfigured:
      gameControlCheck.fallback_to_wait_when_unconfigured === true,
    rate_limit_env_configured: gameControlCheck.configured_env.includes(
      "IRIS_GAME_CONTROL_MIN_INTERVAL_MS"
    ),
    stale_observation_guard_env_configured: gameControlCheck.configured_env.includes(
      "IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS"
    ),
    configured_env: uniqueEnvNames([
      ...visionCheck.configured_env,
      ...gameControlCheck.configured_env,
    ]),
    missing_required_env: uniqueEnvNames([
      ...visionCheck.missing_env,
      ...gameControlCheck.missing_env,
    ]),
    attention_reasons: attentionReasons,
    attention_reason_count: attentionReasons.length,
    next_attention_reason: attentionReasons[0] ?? null,
    next_readiness_state: readinessStates[0],
    readiness_state_counts: countReadinessStates(readinessStates),
    gameplay_stage_summary: {
      schema: "iris_gameplay_preflight_stage_summary_v1",
      stage_id: gameplayStage.stage_id,
      stage_status: gameplayStage.status,
      readiness_state: readinessStateForStage(
        gameplayStage,
        readinessStates,
        integrationReadiness
      ),
      integration_count: gameplayStage.integrations.length,
      ready_integration_count: gameplayStage.integrations.filter(
        (integration) => integration.status === "ready"
      ).length,
      attention_integration_count: gameplayStage.integrations.filter(
        (integration) => integration.status === "attention"
      ).length,
      missing_required_env_count: gameplayStage.missing_required_env.length,
      first_verification_script: gameplayStage.verification_scripts[0] ?? null,
      verification_script_count: gameplayStage.verification_scripts.length,
    },
    integration_readiness: integrationReadiness,
    verification_plan_summary: {
      schema: "iris_gameplay_preflight_verification_summary_v1",
      stage_id: gameplayStage.stage_id,
      stage_status: gameplayStage.status,
      first_verification_script: gameplayStage.verification_scripts[0] ?? null,
      verification_script_count: gameplayStage.verification_scripts.length,
      vision_fixture_script: visionCheck.local_fixture_command,
      vision_failure_script: visionCheck.failure_command,
      game_control_fixture_script: gameControlCheck.local_fixture_command,
      game_control_failure_script:
        gameControlCheck.failure_command ??
        gameplayStage.verification_scripts.find(
          (script) => script === "npm run dev:game-control:failure-roundtrip"
        ) ??
        null,
    },
    approval_policy: {
      input_action_candidates_never_sent_to_adapter: true,
      approved_actions_only_for_game_control_adapter: true,
      viewer_text_cannot_directly_control_game: true,
      fresh_observation_required_before_adapter: true,
      stale_observation_rejected_before_adapter: true,
      observation_summary_only_before_player_and_validator: true,
      approved_schema_only_no_os_direct_input: true,
      non_game_adapters_do_not_receive_actions: true,
      approved_action_expiry_enforced_by_adapter: true,
      bridge_ack_shape_only: true,
    },
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
      read_only_preflight: true,
    },
    adapter_validation_required: true,
  };
  assertGameplayPreflightReportSafe(report);
  return report;
}

export function createGameAdapterProductionPreflightFixture({
  realInputConfirmed = false,
  gameControlMode = "manual_approval",
} = {}) {
  const realConfirmed = realInputConfirmed === true;
  const fixture = {
    schema: "iris_game_adapter_production_preflight_fixture_v1",
    preflight_status: realConfirmed ? "attention_required" : "blocked",
    default_control_mode: "manual_approval",
    requested_control_mode: safeGameControlPreflightMode(gameControlMode),
    safe_mode: "manual_approval",
    real_input_confirmed: realConfirmed,
    real_control_allowed: false,
    next_readiness_state: realConfirmed ? "operator_review_required" : "real_device_waiting",
    boundary_policy: {
      manual_approval_default: true,
      safe_mode_without_real_input_confirmation: true,
      real_input_confirmation_required: true,
      no_action_candidates: true,
      no_approved_actions: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertGameAdapterProductionPreflightFixtureSafe(fixture);
  return fixture;
}

export function assertGameAdapterProductionPreflightFixtureSafe(
  fixture,
  context = "game adapter production preflight fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  const allowedFields = new Set([
    "schema",
    "preflight_status",
    "default_control_mode",
    "requested_control_mode",
    "safe_mode",
    "real_input_confirmed",
    "real_control_allowed",
    "next_readiness_state",
    "boundary_policy",
    "adapter_validation_required",
  ]);
  for (const field of Object.keys(fixture)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`, { field });
    }
  }
  if (
    fixture.schema !== "iris_game_adapter_production_preflight_fixture_v1" ||
    fixture.default_control_mode !== "manual_approval" ||
    fixture.safe_mode !== "manual_approval" ||
    typeof fixture.real_input_confirmed !== "boolean" ||
    fixture.real_control_allowed !== false ||
    fixture.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid safe control fixture`);
  }
  if (fixture.real_input_confirmed !== true && fixture.preflight_status !== "blocked") {
    throw new ContractError(`${context}: unconfirmed real input must stay blocked`);
  }
  if (!["manual_approval", "approved_safe_adapter"].includes(fixture.requested_control_mode)) {
    throw new ContractError(`${context}: invalid requested control mode`);
  }
  if (!READINESS_STATES.has(fixture.next_readiness_state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
  assertGameAdapterProductionPreflightBoundaryPolicySafe(fixture.boundary_policy, context);
  assertNoForbiddenGameplayPreflightFields(fixture, context);
}

export function assertGameplayPreflightReportSafe(
  report,
  context = "gameplay preflight report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenGameplayPreflightFields(report, context);
  if (report.schema !== "iris_gameplay_preflight_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!GAMEPLAY_PREFLIGHT_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (!PREFLIGHT_STATUSES.has(report.preflight_status)) {
    throw new ContractError(`${context}: invalid preflight status`);
  }
  for (const field of ["vision_status", "game_control_status"]) {
    if (!CHECK_STATUSES.has(report[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!VISION_MODES.has(report.vision_mode)) {
    throw new ContractError(`${context}: invalid vision mode`);
  }
  if (!GAME_CONTROL_MODES.has(report.game_control_mode)) {
    throw new ContractError(`${context}: invalid game control mode`);
  }
  for (const field of [
    "vision_target_configured",
    "vision_request_method_configured",
    "vision_request_method_supported",
    "ingest_scheduler_enabled",
    "scheduler_required_for_screen_polling",
    "game_control_enabled",
    "game_control_http_adapter_ready",
    "game_control_target_configured",
    "available_actions_configured",
    "fallback_to_wait_when_unconfigured",
    "rate_limit_env_configured",
    "stale_observation_guard_env_configured",
  ]) {
    if (typeof report[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of ["vision_target_policy_status", "game_control_target_policy_status"]) {
    if (!TARGET_POLICY_STATUSES.has(report[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of ["approved_action_kind_count", "unsupported_action_name_count"]) {
    if (!Number.isInteger(report[field]) || report[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
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
  assertAttentionReasonConsistency(report, context);
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
  assertGameplayStageSummarySafe(report.gameplay_stage_summary, context);
  assertGameplayIntegrationReadinessListSafe(report.integration_readiness, context);
  assertVerificationSummarySafe(report.verification_plan_summary, context);
  assertApprovalPolicySafe(report.approval_policy, context);
  assertBoundaryPolicySafe(report.boundary_policy, context);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

function buildAttentionReasons({ visionCheck, gameControlCheck }) {
  const missingEnv = uniqueEnvNames([
    ...visionCheck.missing_env,
    ...gameControlCheck.missing_env,
  ]);
  return [
    missingEnv.length > 0 ? "missing_required_env" : null,
    visionCheck.mode !== "http_game_observation" ? "vision_source_not_configured" : null,
    visionCheck.request_method_configured === true &&
    visionCheck.request_method_supported !== true
      ? "vision_method_not_supported"
      : null,
    visionCheck.http_ingest_scheduler_enabled !== true
      ? "ingest_scheduler_disabled"
      : null,
    summarizeTargetPolicyStatus(
      visionCheck.vision_endpoint_scope,
      visionCheck.vision_endpoint_locality_ok
    ) === "attention"
      ? "vision_target_policy_attention"
      : null,
    gameControlCheck.game_control_enabled_configured !== true
      ? "game_control_disabled"
      : null,
    gameControlCheck.game_control_http_adapter_configured !== true
      ? "game_control_adapter_not_http"
      : null,
    gameControlCheck.game_control_endpoint_configured !== true
      ? "game_control_target_missing"
      : null,
    summarizeTargetPolicyStatus(
      gameControlCheck.game_control_endpoint_scope,
      gameControlCheck.game_control_endpoint_locality_ok
    ) === "attention"
      ? "game_control_target_policy_attention"
      : null,
    gameControlCheck.available_actions_configured !== true ||
    safeCount(gameControlCheck.available_action_count) === 0 ||
    gameControlCheck.fallback_to_wait_when_unconfigured === true
      ? "available_actions_missing_or_unsupported"
      : null,
  ].filter(Boolean);
}

function summarizeTargetPolicyStatus(scope, localityOk) {
  if (scope === "not_configured") return "not_applicable";
  return localityOk === true ? "allowed" : "attention";
}

function assertAttentionReasonConsistency(report, context) {
  assertReasonPresence(
    report,
    "missing_required_env",
    report.missing_required_env.length > 0,
    context
  );
  assertReasonPresence(
    report,
    "vision_source_not_configured",
    report.vision_mode !== "http_game_observation",
    context
  );
  assertReasonPresence(
    report,
    "vision_method_not_supported",
    report.vision_request_method_configured === true &&
      report.vision_request_method_supported !== true,
    context
  );
  assertReasonPresence(
    report,
    "ingest_scheduler_disabled",
    report.ingest_scheduler_enabled !== true,
    context
  );
  assertReasonPresence(
    report,
    "vision_target_policy_attention",
    report.vision_target_policy_status === "attention",
    context
  );
  assertReasonPresence(
    report,
    "game_control_disabled",
    report.game_control_enabled !== true,
    context
  );
  assertReasonPresence(
    report,
    "game_control_adapter_not_http",
    report.game_control_http_adapter_ready !== true,
    context
  );
  assertReasonPresence(
    report,
    "game_control_target_missing",
    report.game_control_target_configured !== true,
    context
  );
  assertReasonPresence(
    report,
    "game_control_target_policy_attention",
    report.game_control_target_policy_status === "attention",
    context
  );
  assertReasonPresence(
    report,
    "available_actions_missing_or_unsupported",
    report.available_actions_configured !== true ||
      report.approved_action_kind_count === 0 ||
      report.fallback_to_wait_when_unconfigured === true,
    context
  );
  if (report.attention_reason_count === 0) {
    if (
      report.preflight_status !== "ready_to_poll_game_and_approve_control" ||
      report.next_attention_reason !== null ||
      report.vision_status !== "ready" ||
      report.game_control_status !== "ready"
    ) {
      throw new ContractError(`${context}: invalid ready preflight summary`);
    }
    return;
  }
  if (
    report.preflight_status !== "blocked_by_configuration" ||
    report.next_attention_reason !== report.attention_reasons[0]
  ) {
    throw new ContractError(`${context}: invalid attention preflight summary`);
  }
}

function assertReasonPresence(report, reason, expected, context) {
  const present = report.attention_reasons.includes(reason);
  if (present !== expected) {
    throw new ContractError(`${context}: inconsistent attention reason`, { reason });
  }
}

function readinessStateForAttentionReason(reason) {
  switch (reason) {
    case "vision_target_policy_attention":
    case "game_control_target_policy_attention":
    case "available_actions_missing_or_unsupported":
      return "operator_review_required";
    case "vision_method_not_supported":
      return "operator_review_required";
    default:
      return reason ? "configuration_waiting" : "ready";
  }
}

function readinessStateForIntegration(integration) {
  return integration.status === "ready" ? "ready" : "configuration_waiting";
}

function readinessStateForStage(stage, readinessStates, integrationReadiness) {
  if (stage.status === "ready") return "ready";
  const attentionState = readinessStates.find((state) => state !== "ready");
  if (attentionState) return attentionState;
  return (
    integrationReadiness.find((integration) => integration.readiness_state !== "ready")
      ?.readiness_state ?? "configuration_waiting"
  );
}

function countReadinessStates(statesOrItems) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const item of statesOrItems) {
    const state = typeof item === "string" ? item : item?.readiness_state;
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
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: unexpected readiness state count`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every(
    (state) => Number(left?.[state] ?? -1) === Number(right?.[state] ?? -2)
  );
}

function assertGameplayStageSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: gameplay stage summary is required`);
  }
  if (summary.schema !== "iris_gameplay_preflight_stage_summary_v1") {
    throw new ContractError(`${context}: invalid gameplay stage summary schema`);
  }
  if (summary.stage_id !== "vision_and_safe_game_control") {
    throw new ContractError(`${context}: invalid gameplay stage summary id`);
  }
  if (!["ready", "attention"].includes(summary.stage_status)) {
    throw new ContractError(`${context}: invalid gameplay stage status`);
  }
  assertSafeReadinessState(summary.readiness_state, context);
  if (summary.stage_status === "ready" && summary.readiness_state !== "ready") {
    throw new ContractError(`${context}: invalid ready stage readiness state`);
  }
  if (summary.stage_status === "attention" && summary.readiness_state === "ready") {
    throw new ContractError(`${context}: invalid attention stage readiness state`);
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
    throw new ContractError(`${context}: invalid gameplay integration count`);
  }
  if (summary.stage_status === "ready" && summary.attention_integration_count !== 0) {
    throw new ContractError(`${context}: ready gameplay summary has attention checks`);
  }
  if (summary.stage_status === "attention" && summary.attention_integration_count === 0) {
    throw new ContractError(`${context}: attention gameplay summary has no attention checks`);
  }
  if (summary.first_verification_script !== null) {
    assertSafeScriptName(summary.first_verification_script, context);
  }
}

function assertGameplayIntegrationReadinessListSafe(readiness, context) {
  if (!Array.isArray(readiness) || readiness.length === 0) {
    throw new ContractError(`${context}: gameplay integration readiness is required`);
  }
  const seen = new Set();
  for (const item of readiness) {
    assertGameplayIntegrationReadinessSafe(item, context);
    if (seen.has(item.integration)) {
      throw new ContractError(`${context}: duplicate gameplay integration`);
    }
    seen.add(item.integration);
  }
  for (const integration of GAMEPLAY_STAGE_INTEGRATIONS) {
    if (!seen.has(integration)) {
      throw new ContractError(`${context}: missing gameplay integration`);
    }
  }
}

function assertGameplayIntegrationReadinessSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: invalid gameplay integration readiness`);
  }
  if (item.schema !== "iris_gameplay_preflight_integration_readiness_v1") {
    throw new ContractError(`${context}: invalid gameplay integration readiness schema`);
  }
  if (!GAMEPLAY_STAGE_INTEGRATIONS.has(item.integration)) {
    throw new ContractError(`${context}: invalid gameplay integration`);
  }
  if (!CHECK_STATUSES.has(item.status)) {
    throw new ContractError(`${context}: invalid gameplay integration status`);
  }
  assertSafeReadinessState(item.readiness_state, context);
  if (item.readiness_state !== readinessStateForIntegration(item)) {
    throw new ContractError(`${context}: invalid gameplay integration readiness state`);
  }
  if (typeof item.mode !== "string" || !/^[a-z0-9_]+$/.test(item.mode)) {
    throw new ContractError(`${context}: invalid gameplay integration mode`);
  }
}

function assertVerificationSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: verification summary is required`);
  }
  if (summary.schema !== "iris_gameplay_preflight_verification_summary_v1") {
    throw new ContractError(`${context}: invalid verification summary schema`);
  }
  if (summary.stage_id !== "vision_and_safe_game_control") {
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
  assertSafeScriptName(summary.vision_fixture_script, context);
  assertSafeScriptName(summary.vision_failure_script, context);
  assertSafeScriptName(summary.game_control_fixture_script, context);
  if (summary.game_control_failure_script !== null) {
    assertSafeScriptName(summary.game_control_failure_script, context);
  }
}

function assertApprovalPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: approval policy is required`);
  }
  for (const field of [
    "input_action_candidates_never_sent_to_adapter",
    "approved_actions_only_for_game_control_adapter",
    "viewer_text_cannot_directly_control_game",
    "fresh_observation_required_before_adapter",
    "stale_observation_rejected_before_adapter",
    "observation_summary_only_before_player_and_validator",
    "approved_schema_only_no_os_direct_input",
    "non_game_adapters_do_not_receive_actions",
    "approved_action_expiry_enforced_by_adapter",
    "bridge_ack_shape_only",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid approval policy`);
    }
  }
}

function assertBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const requiredFields = [
    "env_names_only",
    "script_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_raw_frames",
    "no_raw_ocr_text",
    "no_vision_payloads",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
    "read_only_preflight",
  ];
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

function assertGameAdapterProductionPreflightBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const requiredFields = [
    "manual_approval_default",
    "safe_mode_without_real_input_confirmation",
    "real_input_confirmation_required",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
  ];
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid production preflight boundary`);
    }
  }
}

function safeGameControlPreflightMode(value) {
  return value === "approved_safe_adapter" ? "approved_safe_adapter" : "manual_approval";
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

function uniqueEnvNames(names) {
  return [...new Set(names)].filter((name) => /^IRIS_[A-Z0-9_]+$/.test(name));
}

function safeCount(value) {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function assertNoForbiddenGameplayPreflightFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenGameplayPreflightFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_GAMEPLAY_PREFLIGHT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe preflight field`, { field, path });
    }
    assertNoForbiddenGameplayPreflightFields(child, context, `${path}.${field}`);
  }
}
