import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseIrisEnvFile } from "../../config/loadIrisEnv.js";
import { ContractError } from "../../core/contracts.js";
import {
  assertFoundationConnectorHandoffSafe,
  createFoundationConnectorHandoff,
} from "./foundationConnectorHandoff.js";
import {
  assertFoundationEnvSetupPlanSafe,
  createFoundationEnvSetupPlan,
} from "./foundationEnvSetupPlan.js";
import {
  assertFoundationLaunchPlanSafe,
  createFoundationLaunchPlan,
} from "./foundationLaunchPlan.js";
import {
  assertFoundationLocalEnvApplyPlanSafe,
  createFoundationLocalEnvApplyPlan,
} from "./foundationLocalEnvApplyPlan.js";
import {
  assertFoundationLocalEnvProfileSafe,
  createFoundationLocalEnvProfile,
  renderFoundationLocalEnvTemplate,
} from "./foundationLocalEnvProfile.js";
import {
  assertFoundationLocalEnvRoundtripReportSafe,
  createFoundationLocalEnvRoundtripReport,
} from "./foundationLocalEnvRoundtrip.js";
import {
  assertFoundationStartupChecklistSafe,
  createFoundationStartupChecklist,
} from "./foundationStartupChecklist.js";
import {
  assertFoundationStatusReportSafe,
  createFoundationStatusReport,
} from "./foundationStatus.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const FORBIDDEN_REHEARSAL_FIELDS = new Set([
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
  "memory_candidate",
  "memory_candidates",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "relationship_update_candidate",
  "approved_memory_record",
  "approved_relationship_record",
  "internal_profile",
  "canonical_profile",
  "profile_enum",
  "canonical",
  "canonical_envelope",
  "final_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
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
  "ready_to_materialize_and_start",
  "ready_with_existing_local_env_file",
  "local_env_file_attention",
  "configuration_rehearsal_attention",
]);
const REHEARSAL_ENV_SOURCES = new Set([
  "rendered_template",
  "existing_local_env_file",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const NEXT_STEP_IDS = new Set([
  "materialize_local_env_file",
  "review_existing_local_env_file",
  "start_foundation_processes",
  "review_template_roundtrip",
  "review_connector_handoff",
  "review_env_setup_plan",
  "review_launch_plan",
  "review_startup_checklist",
  "review_foundation_status",
]);
const FOUNDATION_LOCAL_ENV_REHEARSAL_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "rehearsal_status",
  "configuration_rehearsal_ready",
  "rehearsal_env_source",
  "existing_file_configuration_checked",
  "env_file_name",
  "env_file_exists_before",
  "template_materialization_status",
  "existing_file_blocks_materialization",
  "missing_template_env_name_count",
  "existing_env_name_count",
  "template_profile_status",
  "template_env_name_count",
  "template_roundtrip_status",
  "connector_handoff_status",
  "env_setup_plan_status",
  "launch_plan_status",
  "startup_checklist_status",
  "foundation_readiness_status",
  "next_step_id",
  "next_step_script",
  "next_check_script",
  "next_readiness_state",
  "readiness_state_counts",
  "next_configure_env",
  "gate_summary",
  "runtime_expectation",
  "verification_scripts",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);
const FOUNDATION_LOCAL_ENV_REHEARSAL_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "rehearsal_report_only",
  "local_env_file_not_materialized_by_rehearsal",
  "real_processes_not_started_by_rehearsal",
  "real_tts_live2d_engines_not_called_by_rehearsal",
  "obs_not_operated_by_rehearsal",
  "env_values_not_exposed",
  "endpoint_values_not_exposed",
  "secret_values_not_exposed",
  "rehearsal_status",
  "next_step_id",
  "next_step_script",
  "next_check_script",
  "next_readiness_state",
  "readiness_state_counts",
]);

export function createFoundationLocalEnvReadinessRehearsal({
  cwd = process.cwd(),
  generatedAtMs = Date.now(),
} = {}) {
  const profile = createFoundationLocalEnvProfile({ generatedAtMs });
  const roundtrip = createFoundationLocalEnvRoundtripReport({ generatedAtMs });
  const materializationPlan = createFoundationLocalEnvApplyPlan({
    cwd,
    generatedAtMs,
    applyMode: "dry_run",
  });
  assertFoundationLocalEnvProfileSafe(
    profile,
    "foundation local env readiness rehearsal profile"
  );
  assertFoundationLocalEnvRoundtripReportSafe(
    roundtrip,
    "foundation local env readiness rehearsal roundtrip"
  );
  assertFoundationLocalEnvApplyPlanSafe(
    materializationPlan,
    "foundation local env readiness rehearsal materialization plan"
  );

  const templateEnv = parseIrisEnvFile(
    renderFoundationLocalEnvTemplate({ includeComments: false })
  );
  const existingEnv =
    materializationPlan.env_file_exists_before === true
      ? readExistingLocalEnvFile(cwd, profile.env_file_name)
      : null;
  const envSource =
    existingEnv === null ? "rendered_template" : "existing_local_env_file";
  const env = existingEnv ?? templateEnv;
  const connectorHandoff = createFoundationConnectorHandoff({ env, generatedAtMs });
  const envSetupPlan = createFoundationEnvSetupPlan({ env, generatedAtMs });
  const launchPlan = createFoundationLaunchPlan({ env, generatedAtMs });
  const startupChecklist = createFoundationStartupChecklist({ env, generatedAtMs });
  const foundationStatus = createFoundationStatusReport({ env, generatedAtMs });

  assertFoundationConnectorHandoffSafe(
    connectorHandoff,
    "foundation local env readiness rehearsal connector handoff"
  );
  assertFoundationEnvSetupPlanSafe(
    envSetupPlan,
    "foundation local env readiness rehearsal env setup plan"
  );
  assertFoundationLaunchPlanSafe(
    launchPlan,
    "foundation local env readiness rehearsal launch plan"
  );
  assertFoundationStartupChecklistSafe(
    startupChecklist,
    "foundation local env readiness rehearsal startup checklist"
  );
  assertFoundationStatusReportSafe(
    foundationStatus,
    "foundation local env readiness rehearsal foundation status"
  );

  const configurationReady =
    roundtrip.roundtrip_status === "ready_for_foundation_local_env_file" &&
    connectorHandoff.handoff_status === "ready_for_foundation_connector_handoff" &&
    envSetupPlan.plan_status === "ready_for_foundation_env_setup" &&
    launchPlan.plan_status === "ready_to_launch_foundation" &&
    startupChecklist.checklist_status === "ready_to_follow_startup_checklist" &&
    foundationStatus.foundation_readiness_status === "ready_for_runtime_handoff";
  const rehearsalStatus = summarizeRehearsalStatus({
    configurationReady,
    materializationPlan,
  });
  const nextReadinessState = readinessStateForRehearsalStatus(rehearsalStatus);
  const nextStep = summarizeNextStep({
    configurationReady,
    materializationPlan,
    roundtrip,
    connectorHandoff,
    envSetupPlan,
    launchPlan,
    startupChecklist,
    foundationStatus,
    profile,
  });

  const rehearsal = {
    schema: "iris_foundation_local_env_readiness_rehearsal_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "tts_live2d_obs_foundation",
    target_stage_priority: 1,
    rehearsal_status: rehearsalStatus,
    configuration_rehearsal_ready: configurationReady,
    rehearsal_env_source: envSource,
    existing_file_configuration_checked: existingEnv !== null,
    env_file_name: profile.env_file_name,
    env_file_exists_before: materializationPlan.env_file_exists_before,
    template_materialization_status: materializationPlan.apply_status,
    existing_file_blocks_materialization:
      materializationPlan.existing_file_blocks_materialization,
    missing_template_env_name_count:
      materializationPlan.missing_template_env_name_count,
    existing_env_name_count: materializationPlan.existing_env_name_count,
    template_profile_status: profile.profile_status,
    template_env_name_count: profile.template_env_name_count,
    template_roundtrip_status: roundtrip.roundtrip_status,
    connector_handoff_status: connectorHandoff.handoff_status,
    env_setup_plan_status: envSetupPlan.plan_status,
    launch_plan_status: launchPlan.plan_status,
    startup_checklist_status: startupChecklist.checklist_status,
    foundation_readiness_status: foundationStatus.foundation_readiness_status,
    next_step_id: nextStep.next_step_id,
    next_step_script: nextStep.next_step_script,
    next_check_script: nextStep.next_check_script,
    next_readiness_state: nextReadinessState,
    readiness_state_counts: countReadinessStates([
      { readiness_state: nextReadinessState },
    ]),
    next_configure_env: nextStep.next_configure_env,
    gate_summary: {
      schema: "iris_foundation_local_env_rehearsal_gate_summary_v1",
      foundation_check_count: roundtrip.foundation_check_count,
      foundation_ready_check_count: roundtrip.foundation_ready_check_count,
      foundation_attention_check_count: roundtrip.foundation_attention_check_count,
      connector_count: connectorHandoff.connector_count,
      ready_connector_count: connectorHandoff.ready_connector_count,
      attention_connector_count: connectorHandoff.attention_connector_count,
      env_group_count: envSetupPlan.env_group_count,
      ready_env_group_count: envSetupPlan.ready_env_group_count,
      attention_env_group_count: envSetupPlan.attention_env_group_count,
      launch_step_count: launchPlan.launch_sequence.length,
      ready_launch_step_count: launchPlan.ready_step_count,
      attention_launch_step_count: launchPlan.attention_step_count,
      startup_step_count: startupChecklist.startup_step_count,
      ready_startup_step_count: startupChecklist.ready_to_start_count,
      attention_startup_step_count: startupChecklist.attention_startup_count,
      dedicated_terminal_count: startupChecklist.dedicated_terminal_count,
      foundation_status_attention_reason_count:
        foundationStatus.foundation_summary.attention_reason_count,
      boundary_policy: {
        booleans_counts_and_fixed_statuses_only: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
      },
    },
    runtime_expectation: {
      schema: "iris_foundation_local_env_runtime_expectation_v1",
      ready_for_runtime_handoff_before_process_start:
        foundationStatus.foundation_readiness_status === "ready_for_runtime_handoff",
      long_running_services_still_need_start: true,
      worker_watch_still_needs_start: true,
      real_engine_health_probe_still_required: true,
      obs_runtime_render_roundtrip_still_required: true,
      live_operation_still_requires_runtime_event: true,
      first_startup_script: profile.startup_scripts[0],
      first_verification_script: "npm run dev:foundation:status",
      boundary_policy: {
        script_names_only: true,
        booleans_only: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
      },
    },
    verification_scripts: {
      schema: "iris_foundation_local_env_rehearsal_scripts_v1",
      rehearsal_script: "npm run dev:foundation:local-env-rehearsal",
      local_env_roundtrip_script: "npm run dev:foundation:local-env-roundtrip",
      local_env_materialize_script:
        "npm run dev:foundation:local-env-apply -- --materialize",
      startup_checklist_script: "npm run dev:foundation:startup-checklist",
      foundation_status_script: "npm run dev:foundation:status",
      foundation_runtime_status_script: "npm run dev:foundation:runtime-status",
      foundation_live_readiness_script: "npm run dev:foundation:live-readiness",
    },
    production_handoff_summary: {
      schema: "iris_foundation_local_env_rehearsal_handoff_summary_v1",
      rehearsal_report_only: true,
      local_env_file_not_materialized_by_rehearsal: true,
      real_processes_not_started_by_rehearsal: true,
      real_tts_live2d_engines_not_called_by_rehearsal: true,
      obs_not_operated_by_rehearsal: true,
      env_values_not_exposed: true,
      endpoint_values_not_exposed: true,
      secret_values_not_exposed: true,
      rehearsal_status: rehearsalStatus,
      next_step_id: nextStep.next_step_id,
      next_step_script: nextStep.next_step_script,
      next_check_script: nextStep.next_check_script,
      next_readiness_state: nextReadinessState,
      readiness_state_counts: countReadinessStates([
        { readiness_state: nextReadinessState },
      ]),
    },
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
      read_only_rehearsal: true,
    },
    adapter_validation_required: true,
  };
  assertFoundationLocalEnvReadinessRehearsalSafe(rehearsal);
  return rehearsal;
}

export function assertFoundationLocalEnvReadinessRehearsalSafe(
  rehearsal,
  context = "foundation local env readiness rehearsal"
) {
  if (!rehearsal || typeof rehearsal !== "object" || Array.isArray(rehearsal)) {
    throw new ContractError(`${context}: rehearsal is required`);
  }
  assertNoForbiddenFields(rehearsal, context);
  assertNoUrlStrings(rehearsal, context);
  if (rehearsal.schema !== "iris_foundation_local_env_readiness_rehearsal_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(rehearsal)) {
    if (!FOUNDATION_LOCAL_ENV_REHEARSAL_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected rehearsal field`, { field });
    }
  }
  if (!Number.isInteger(rehearsal.generated_at_ms) || rehearsal.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (rehearsal.target_stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (rehearsal.target_stage_priority !== 1) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!REHEARSAL_STATUSES.has(rehearsal.rehearsal_status)) {
    throw new ContractError(`${context}: invalid rehearsal status`);
  }
  if (typeof rehearsal.configuration_rehearsal_ready !== "boolean") {
    throw new ContractError(`${context}: invalid ready flag`);
  }
  if (!REHEARSAL_ENV_SOURCES.has(rehearsal.rehearsal_env_source)) {
    throw new ContractError(`${context}: invalid env source`);
  }
  if (typeof rehearsal.existing_file_configuration_checked !== "boolean") {
    throw new ContractError(`${context}: invalid existing file check flag`);
  }
  if (
    rehearsal.existing_file_configuration_checked !==
    (rehearsal.rehearsal_env_source === "existing_local_env_file")
  ) {
    throw new ContractError(`${context}: inconsistent existing file check flag`);
  }
  if (rehearsal.env_file_name !== ".env.local") {
    throw new ContractError(`${context}: invalid env file name`);
  }
  for (const field of [
    "env_file_exists_before",
    "existing_file_blocks_materialization",
  ]) {
    if (typeof rehearsal[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "missing_template_env_name_count",
    "existing_env_name_count",
    "template_env_name_count",
  ]) {
    assertNonNegativeInteger(rehearsal[field], `${context}: invalid ${field}`);
  }
  if (
    ![
      "ready_to_materialize_local_env_file",
      "local_env_file_materialized",
      "blocked_existing_local_env_file",
    ].includes(rehearsal.template_materialization_status)
  ) {
    throw new ContractError(`${context}: invalid materialization status`);
  }
  if (rehearsal.template_profile_status !== "ready_to_render_local_env_template") {
    throw new ContractError(`${context}: invalid profile status`);
  }
  if (
    rehearsal.template_roundtrip_status !== "ready_for_foundation_local_env_file"
  ) {
    throw new ContractError(`${context}: invalid roundtrip status`);
  }
  if (
    ![
      "ready_for_foundation_connector_handoff",
      "configure_foundation_connectors_first",
    ].includes(rehearsal.connector_handoff_status)
  ) {
    throw new ContractError(`${context}: invalid connector handoff status`);
  }
  if (
    ![
      "ready_for_foundation_env_setup",
      "configure_foundation_env_first",
    ].includes(rehearsal.env_setup_plan_status)
  ) {
    throw new ContractError(`${context}: invalid env setup status`);
  }
  if (
    ![
      "ready_to_launch_foundation",
      "configure_foundation_env_first",
    ].includes(rehearsal.launch_plan_status)
  ) {
    throw new ContractError(`${context}: invalid launch status`);
  }
  if (
    ![
      "ready_to_follow_startup_checklist",
      "configure_foundation_startup_env_first",
    ].includes(rehearsal.startup_checklist_status)
  ) {
    throw new ContractError(`${context}: invalid startup checklist status`);
  }
  if (
    !["ready_for_runtime_handoff", "attention_required"].includes(
      rehearsal.foundation_readiness_status
    )
  ) {
    throw new ContractError(`${context}: invalid foundation status`);
  }
  if (!NEXT_STEP_IDS.has(rehearsal.next_step_id)) {
    throw new ContractError(`${context}: invalid next step`);
  }
  assertSafeScriptName(rehearsal.next_step_script, `${context}: next step script`);
  assertSafeScriptName(rehearsal.next_check_script, `${context}: next check script`);
  assertSafeReadinessState(rehearsal.next_readiness_state, context);
  if (
    rehearsal.next_readiness_state !==
    readinessStateForRehearsalStatus(rehearsal.rehearsal_status)
  ) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  assertReadinessStateCountsSafe(rehearsal.readiness_state_counts, context);
  assertEnvNameList(rehearsal.next_configure_env, `${context}: next configure env`);
  assertGateSummarySafe(rehearsal.gate_summary, context);
  assertRuntimeExpectationSafe(rehearsal.runtime_expectation, context);
  assertVerificationScriptsSafe(rehearsal.verification_scripts, context);
  assertProductionHandoffSummarySafe(
    rehearsal.production_handoff_summary,
    rehearsal,
    context
  );
  assertBoundaryPolicy(
    rehearsal.boundary_policy,
    [
      "env_names_only",
      "env_counts_only",
      "file_names_only",
      "script_names_only",
      "booleans_counts_and_fixed_statuses_only",
      "no_env_values",
      "no_secret_values",
      "no_endpoint_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "no_template_text",
      "no_file_updates",
      "read_only_rehearsal",
    ],
    `${context}: boundary policy`
  );
  if (rehearsal.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
  if (
    rehearsal.rehearsal_status === "ready_to_materialize_and_start" &&
    rehearsal.env_file_exists_before !== false
  ) {
    throw new ContractError(`${context}: materialize status needs absent env file`);
  }
  if (
    rehearsal.rehearsal_status === "ready_with_existing_local_env_file" &&
    (rehearsal.env_file_exists_before !== true ||
      rehearsal.missing_template_env_name_count !== 0)
  ) {
    throw new ContractError(`${context}: existing env status is inconsistent`);
  }
  if (
    (rehearsal.rehearsal_status === "ready_to_materialize_and_start" ||
      rehearsal.rehearsal_status === "ready_with_existing_local_env_file") &&
    (rehearsal.connector_handoff_status !==
      "ready_for_foundation_connector_handoff" ||
      rehearsal.env_setup_plan_status !== "ready_for_foundation_env_setup" ||
      rehearsal.launch_plan_status !== "ready_to_launch_foundation" ||
      rehearsal.startup_checklist_status !==
        "ready_to_follow_startup_checklist" ||
      rehearsal.foundation_readiness_status !== "ready_for_runtime_handoff")
  ) {
    throw new ContractError(`${context}: ready flag contradicts gate statuses`);
  }
}

function summarizeRehearsalStatus({ configurationReady, materializationPlan }) {
  if (
    materializationPlan.env_file_exists_before === true &&
    materializationPlan.missing_template_env_name_count > 0
  ) {
    return "local_env_file_attention";
  }
  if (!configurationReady) return "configuration_rehearsal_attention";
  if (materializationPlan.env_file_exists_before !== true) {
    return "ready_to_materialize_and_start";
  }
  if (materializationPlan.missing_template_env_name_count === 0) {
    return "ready_with_existing_local_env_file";
  }
  return "local_env_file_attention";
}

function readinessStateForRehearsalStatus(status) {
  if (status === "ready_to_materialize_and_start") {
    return "configuration_waiting";
  }
  if (status === "ready_with_existing_local_env_file") {
    return "real_device_waiting";
  }
  if (status === "configuration_rehearsal_attention") {
    return "configuration_waiting";
  }
  return "operator_review_required";
}

function summarizeNextStep({
  configurationReady,
  materializationPlan,
  roundtrip,
  connectorHandoff,
  envSetupPlan,
  launchPlan,
  startupChecklist,
  foundationStatus,
  profile,
}) {
  if (
    materializationPlan.env_file_exists_before === true &&
    materializationPlan.missing_template_env_name_count > 0
  ) {
    return {
      next_step_id: "review_existing_local_env_file",
      next_step_script:
        "npm run dev:foundation:local-env-apply -- --materialize --replace-existing",
      next_check_script: "npm run dev:foundation:local-env-rehearsal",
      next_configure_env: materializationPlan.missing_template_env_names,
    };
  }
  if (roundtrip.roundtrip_status !== "ready_for_foundation_local_env_file") {
    return {
      next_step_id: "review_template_roundtrip",
      next_step_script: "npm run dev:foundation:local-env-roundtrip",
      next_check_script: "npm run dev:foundation:local-env-rehearsal",
      next_configure_env: roundtrip.next_configure_env,
    };
  }
  if (
    connectorHandoff.handoff_status !== "ready_for_foundation_connector_handoff"
  ) {
    return {
      next_step_id: "review_connector_handoff",
      next_step_script: "npm run dev:foundation:connector-handoff",
      next_check_script: "npm run dev:foundation:local-env-rehearsal",
      next_configure_env: connectorHandoff.next_configure_env,
    };
  }
  if (envSetupPlan.plan_status !== "ready_for_foundation_env_setup") {
    return {
      next_step_id: "review_env_setup_plan",
      next_step_script: "npm run dev:foundation:env-setup-plan",
      next_check_script: "npm run dev:foundation:local-env-rehearsal",
      next_configure_env: envSetupPlan.next_configure_env,
    };
  }
  if (launchPlan.plan_status !== "ready_to_launch_foundation") {
    return {
      next_step_id: "review_launch_plan",
      next_step_script: "npm run dev:foundation:launch-plan",
      next_check_script: "npm run dev:foundation:local-env-rehearsal",
      next_configure_env: launchPlan.next_configure_env,
    };
  }
  if (
    startupChecklist.checklist_status !== "ready_to_follow_startup_checklist"
  ) {
    return {
      next_step_id: "review_startup_checklist",
      next_step_script: "npm run dev:foundation:startup-checklist",
      next_check_script: "npm run dev:foundation:local-env-rehearsal",
      next_configure_env: startupChecklist.next_configure_env,
    };
  }
  if (
    foundationStatus.foundation_readiness_status !== "ready_for_runtime_handoff"
  ) {
    return {
      next_step_id: "review_foundation_status",
      next_step_script: "npm run dev:foundation:status",
      next_check_script: "npm run dev:foundation:local-env-rehearsal",
      next_configure_env: [],
    };
  }
  if (!configurationReady) {
    return {
      next_step_id: "review_foundation_status",
      next_step_script: "npm run dev:foundation:status",
      next_check_script: "npm run dev:foundation:local-env-rehearsal",
      next_configure_env: [],
    };
  }
  if (materializationPlan.env_file_exists_before !== true) {
    return {
      next_step_id: "materialize_local_env_file",
      next_step_script: "npm run dev:foundation:local-env-apply -- --materialize",
      next_check_script: "npm run dev:foundation:local-env-rehearsal",
      next_configure_env: materializationPlan.missing_template_env_names,
    };
  }
  if (materializationPlan.missing_template_env_name_count > 0) {
    return {
      next_step_id: "review_existing_local_env_file",
      next_step_script:
        "npm run dev:foundation:local-env-apply -- --materialize --replace-existing",
      next_check_script: "npm run dev:foundation:local-env-rehearsal",
      next_configure_env: materializationPlan.missing_template_env_names,
    };
  }
  return {
    next_step_id: "start_foundation_processes",
    next_step_script: profile.startup_scripts[0],
    next_check_script: "npm run dev:foundation:startup-checklist",
    next_configure_env: [],
  };
}

function assertGateSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: gate summary required`);
  }
  if (summary.schema !== "iris_foundation_local_env_rehearsal_gate_summary_v1") {
    throw new ContractError(`${context}: invalid gate summary schema`);
  }
  for (const field of [
    "foundation_check_count",
    "foundation_ready_check_count",
    "foundation_attention_check_count",
    "connector_count",
    "ready_connector_count",
    "attention_connector_count",
    "env_group_count",
    "ready_env_group_count",
    "attention_env_group_count",
    "launch_step_count",
    "ready_launch_step_count",
    "attention_launch_step_count",
    "startup_step_count",
    "ready_startup_step_count",
    "attention_startup_step_count",
    "dedicated_terminal_count",
    "foundation_status_attention_reason_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (
    summary.foundation_ready_check_count + summary.foundation_attention_check_count !==
    summary.foundation_check_count
  ) {
    throw new ContractError(`${context}: invalid foundation check counts`);
  }
  if (
    summary.ready_connector_count + summary.attention_connector_count !==
    summary.connector_count
  ) {
    throw new ContractError(`${context}: invalid connector counts`);
  }
  if (
    summary.ready_env_group_count + summary.attention_env_group_count !==
    summary.env_group_count
  ) {
    throw new ContractError(`${context}: invalid env group counts`);
  }
  if (
    summary.ready_launch_step_count + summary.attention_launch_step_count !==
    summary.launch_step_count
  ) {
    throw new ContractError(`${context}: invalid launch step counts`);
  }
  if (
    summary.ready_startup_step_count + summary.attention_startup_step_count !==
    summary.startup_step_count
  ) {
    throw new ContractError(`${context}: invalid startup step counts`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "booleans_counts_and_fixed_statuses_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: gate summary policy`
  );
}

function assertRuntimeExpectationSafe(expectation, context) {
  if (!expectation || typeof expectation !== "object" || Array.isArray(expectation)) {
    throw new ContractError(`${context}: runtime expectation required`);
  }
  if (expectation.schema !== "iris_foundation_local_env_runtime_expectation_v1") {
    throw new ContractError(`${context}: invalid runtime expectation schema`);
  }
  for (const field of [
    "long_running_services_still_need_start",
    "worker_watch_still_needs_start",
    "real_engine_health_probe_still_required",
    "obs_runtime_render_roundtrip_still_required",
    "live_operation_still_requires_runtime_event",
  ]) {
    if (expectation[field] !== true) {
      throw new ContractError(`${context}: invalid runtime expectation ${field}`);
    }
  }
  if (
    typeof expectation.ready_for_runtime_handoff_before_process_start !==
    "boolean"
  ) {
    throw new ContractError(
      `${context}: invalid runtime expectation ready flag`
    );
  }
  assertSafeScriptName(expectation.first_startup_script, context);
  assertSafeScriptName(expectation.first_verification_script, context);
  assertBoundaryPolicy(
    expectation.boundary_policy,
    [
      "script_names_only",
      "booleans_only",
      "no_endpoint_values",
      "no_secret_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
    ],
    `${context}: runtime expectation policy`
  );
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

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts required`);
  }
  if (scripts.schema !== "iris_foundation_local_env_rehearsal_scripts_v1") {
    throw new ContractError(`${context}: invalid script schema`);
  }
  for (const [field, script] of Object.entries(scripts)) {
    if (field === "schema") continue;
    assertSafeScriptName(script, `${context}: ${field}`);
  }
}

function assertProductionHandoffSummarySafe(summary, rehearsal, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary required`);
  }
  if (summary.schema !== "iris_foundation_local_env_rehearsal_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!FOUNDATION_LOCAL_ENV_REHEARSAL_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected production handoff field`, {
        field,
      });
    }
  }
  for (const field of [
    "rehearsal_report_only",
    "local_env_file_not_materialized_by_rehearsal",
    "real_processes_not_started_by_rehearsal",
    "real_tts_live2d_engines_not_called_by_rehearsal",
    "obs_not_operated_by_rehearsal",
    "env_values_not_exposed",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (
    summary.rehearsal_status !== rehearsal.rehearsal_status ||
    summary.next_step_id !== rehearsal.next_step_id ||
    summary.next_step_script !== rehearsal.next_step_script ||
    summary.next_check_script !== rehearsal.next_check_script ||
    summary.next_readiness_state !== rehearsal.next_readiness_state
  ) {
    throw new ContractError(`${context}: invalid production handoff summary`);
  }
  assertSafeScriptName(
    summary.next_step_script,
    `${context}: handoff next step script`
  );
  assertSafeScriptName(
    summary.next_check_script,
    `${context}: handoff next check script`
  );
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
}

function readExistingLocalEnvFile(cwd, envFileName) {
  try {
    return parseIrisEnvFile(readFileSync(resolve(cwd, envFileName), "utf8"));
  } catch (error) {
    if (error instanceof ContractError) throw error;
    throw new ContractError(
      "foundation local env readiness rehearsal: existing local env file unreadable"
    );
  }
}

function assertSafeScriptName(value, context) {
  if (
    typeof value !== "string" ||
    !/^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      value
    )
  ) {
    throw new ContractError(`${context}: invalid script name`);
  }
  if (/[;&|<>]/.test(value)) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function assertEnvNameList(names, context) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of names) {
    if (typeof name !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
  if (new Set(names).size !== names.length) {
    throw new ContractError(`${context}: duplicate env name`);
  }
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
    throw new ContractError(`${context}: readiness counts required`);
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

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function assertNoForbiddenFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_REHEARSAL_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe field`, { field, path });
    }
    assertNoForbiddenFields(child, context, `${path}.${field}`);
  }
}

function assertNoUrlStrings(value, context, path = "root") {
  if (typeof value === "string") {
    if (URL_PATTERN.test(value)) {
      throw new ContractError(`${context}: endpoint values must not be exposed`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUrlStrings(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUrlStrings(child, context, `${path}.${field}`);
  }
}
