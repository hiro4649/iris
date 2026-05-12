import { parseIrisEnvFile } from "../../config/loadIrisEnv.js";
import { ContractError } from "../../core/contracts.js";
import {
  createFoundationEnvSetupPlan,
  assertFoundationEnvSetupPlanSafe,
} from "./foundationEnvSetupPlan.js";
import {
  createFoundationLocalEnvProfile,
  renderFoundationLocalEnvTemplate,
  assertFoundationLocalEnvProfileSafe,
} from "./foundationLocalEnvProfile.js";
import {
  createProductionConfigDoctor,
  assertProductionConfigDoctorSafe,
} from "./productionConfigDoctor.js";

const FOUNDATION_INTEGRATION_KEYS = new Set([
  "validated_runtime_bridge_handoff",
  "real_tts_engine",
  "real_live2d_bridge",
  "production_obs_overlay",
]);
const ROUNDTRIP_STATUSES = new Set([
  "ready_for_foundation_local_env_file",
  "foundation_local_env_attention",
]);
const URL_PATTERN = /\bhttps?:\/\//i;
const FORBIDDEN_ROUNDTRIP_FIELDS = new Set([
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
  "artifact_path",
]);
const FOUNDATION_LOCAL_ENV_ROUNDTRIP_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "roundtrip_status",
  "template_profile_status",
  "env_file_name",
  "template_env_name_count",
  "parsed_env_name_count",
  "parsed_env_names",
  "foundation_check_count",
  "foundation_ready_check_count",
  "foundation_attention_check_count",
  "foundation_checks",
  "env_setup_plan_status",
  "env_setup_ready_group_count",
  "env_setup_attention_group_count",
  "next_env_group_id",
  "next_configure_env",
  "verification_scripts",
  "boundary_policy",
  "adapter_validation_required",
]);

export function createFoundationLocalEnvRoundtripReport({
  generatedAtMs = Date.now(),
} = {}) {
  const profile = createFoundationLocalEnvProfile({ generatedAtMs });
  assertFoundationLocalEnvProfileSafe(profile, "foundation local env roundtrip profile");
  const template = renderFoundationLocalEnvTemplate({ includeComments: false });
  const env = parseIrisEnvFile(template);
  const parsedEnvNames = Object.keys(env).sort();
  const doctor = createProductionConfigDoctor({ env, generatedAtMs });
  const envSetupPlan = createFoundationEnvSetupPlan({ env, generatedAtMs });
  assertProductionConfigDoctorSafe(doctor, "foundation local env roundtrip doctor");
  assertFoundationEnvSetupPlanSafe(envSetupPlan, "foundation local env roundtrip setup plan");

  const foundationChecks = doctor.checks.filter((check) =>
    FOUNDATION_INTEGRATION_KEYS.has(check.integration)
  );
  const readyFoundationChecks = foundationChecks.filter(
    (check) => check.status === "ready"
  );
  const attentionFoundationChecks = foundationChecks.filter(
    (check) => check.status !== "ready"
  );
  const roundtripReady =
    parsedEnvNames.length === profile.template_env_name_count &&
    attentionFoundationChecks.length === 0 &&
    envSetupPlan.plan_status === "ready_for_foundation_env_setup";

  const report = {
    schema: "iris_foundation_local_env_roundtrip_report_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "tts_live2d_obs_foundation",
    target_stage_priority: 1,
    roundtrip_status: roundtripReady
      ? "ready_for_foundation_local_env_file"
      : "foundation_local_env_attention",
    template_profile_status: profile.profile_status,
    env_file_name: profile.env_file_name,
    template_env_name_count: profile.template_env_name_count,
    parsed_env_name_count: parsedEnvNames.length,
    parsed_env_names: parsedEnvNames,
    foundation_check_count: foundationChecks.length,
    foundation_ready_check_count: readyFoundationChecks.length,
    foundation_attention_check_count: attentionFoundationChecks.length,
    foundation_checks: foundationChecks.map((check) => ({
      schema: "iris_foundation_local_env_roundtrip_check_v1",
      integration: check.integration,
      status: check.status,
      mode: check.mode,
      configured_env_count: check.configured_env.length,
      missing_env_count: check.missing_env.length,
    })),
    env_setup_plan_status: envSetupPlan.plan_status,
    env_setup_ready_group_count: envSetupPlan.ready_env_group_count,
    env_setup_attention_group_count: envSetupPlan.attention_env_group_count,
    next_env_group_id: envSetupPlan.next_env_group_id,
    next_configure_env: envSetupPlan.next_configure_env,
    verification_scripts: {
      schema: "iris_foundation_local_env_roundtrip_scripts_v1",
      local_env_profile_script: "npm run dev:foundation:local-env-profile",
      print_env_template_script:
        "npm run dev:foundation:local-env-profile -- --print-env",
      local_env_roundtrip_script: "npm run dev:foundation:local-env-roundtrip",
      config_doctor_script: "npm run dev:config:doctor",
      env_setup_plan_script: "npm run dev:foundation:env-setup-plan",
      preflight_script: "npm run dev:foundation:preflight",
    },
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
      read_only_roundtrip: true,
    },
    adapter_validation_required: true,
  };
  assertFoundationLocalEnvRoundtripReportSafe(report);
  return report;
}

export function assertFoundationLocalEnvRoundtripReportSafe(
  report,
  context = "foundation local env roundtrip"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenFields(report, context);
  assertNoUrlStrings(report, context);
  if (report.schema !== "iris_foundation_local_env_roundtrip_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!FOUNDATION_LOCAL_ENV_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (report.target_stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (report.target_stage_priority !== 1) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!ROUNDTRIP_STATUSES.has(report.roundtrip_status)) {
    throw new ContractError(`${context}: invalid roundtrip status`);
  }
  if (report.template_profile_status !== "ready_to_render_local_env_template") {
    throw new ContractError(`${context}: invalid profile status`);
  }
  if (report.env_file_name !== ".env.local") {
    throw new ContractError(`${context}: invalid env file name`);
  }
  for (const field of [
    "template_env_name_count",
    "parsed_env_name_count",
    "foundation_check_count",
    "foundation_ready_check_count",
    "foundation_attention_check_count",
    "env_setup_ready_group_count",
    "env_setup_attention_group_count",
  ]) {
    assertNonNegativeInteger(report[field], `${context}: invalid ${field}`);
  }
  assertEnvNameList(report.parsed_env_names, `${context}: parsed env names`);
  if (report.parsed_env_name_count !== report.parsed_env_names.length) {
    throw new ContractError(`${context}: invalid parsed env count`);
  }
  if (!Array.isArray(report.foundation_checks) || report.foundation_checks.length !== 4) {
    throw new ContractError(`${context}: invalid foundation checks`);
  }
  if (report.foundation_check_count !== report.foundation_checks.length) {
    throw new ContractError(`${context}: invalid foundation check count`);
  }
  if (
    report.foundation_ready_check_count !==
    report.foundation_checks.filter((check) => check.status === "ready").length
  ) {
    throw new ContractError(`${context}: invalid ready check count`);
  }
  if (
    report.foundation_attention_check_count !==
    report.foundation_checks.filter((check) => check.status !== "ready").length
  ) {
    throw new ContractError(`${context}: invalid attention check count`);
  }
  report.foundation_checks.forEach((check) => assertRoundtripCheckSafe(check, context));
  if (
    !["ready_for_foundation_env_setup", "configure_foundation_env_first"].includes(
      report.env_setup_plan_status
    )
  ) {
    throw new ContractError(`${context}: invalid env setup status`);
  }
  if (report.next_env_group_id !== null && typeof report.next_env_group_id !== "string") {
    throw new ContractError(`${context}: invalid next env group`);
  }
  assertEnvNameList(report.next_configure_env, `${context}: next configure env`);
  assertVerificationScriptsSafe(report.verification_scripts, context);
  assertBoundaryPolicy(
    report.boundary_policy,
    [
      "env_names_only",
      "env_counts_only",
      "script_names_only",
      "no_env_values",
      "no_secret_values",
      "no_endpoint_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "no_template_text",
      "read_only_roundtrip",
    ],
    `${context}: boundary policy`
  );
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
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

function assertRoundtripCheckSafe(check, context) {
  if (!check || typeof check !== "object" || Array.isArray(check)) {
    throw new ContractError(`${context}: invalid check`);
  }
  if (check.schema !== "iris_foundation_local_env_roundtrip_check_v1") {
    throw new ContractError(`${context}: invalid check schema`);
  }
  if (!FOUNDATION_INTEGRATION_KEYS.has(check.integration)) {
    throw new ContractError(`${context}: invalid foundation integration`);
  }
  if (!["ready", "attention"].includes(check.status)) {
    throw new ContractError(`${context}: invalid check status`);
  }
  if (typeof check.mode !== "string" || !/^[a-z0-9_]+$/.test(check.mode)) {
    throw new ContractError(`${context}: invalid check mode`);
  }
  assertNonNegativeInteger(
    check.configured_env_count,
    `${context}: invalid configured count`
  );
  assertNonNegativeInteger(
    check.missing_env_count,
    `${context}: invalid missing count`
  );
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts required`);
  }
  if (scripts.schema !== "iris_foundation_local_env_roundtrip_scripts_v1") {
    throw new ContractError(`${context}: invalid script schema`);
  }
  for (const [field, script] of Object.entries(scripts)) {
    if (field === "schema") continue;
    assertSafeScriptName(script, `${context}: ${field}`);
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

function assertEnvNameList(value, context) {
  if (!Array.isArray(value)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of value) {
    if (typeof name !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function assertNoForbiddenFields(value, context, fieldPath = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenFields(item, context, `${fieldPath}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_ROUNDTRIP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe field`, { field, fieldPath });
    }
    assertNoForbiddenFields(child, context, `${fieldPath}.${field}`);
  }
}

function assertNoUrlStrings(value, context, fieldPath = "root") {
  if (typeof value === "string") {
    if (URL_PATTERN.test(value)) {
      throw new ContractError(`${context}: endpoint values must not be exposed`, {
        fieldPath,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUrlStrings(item, context, `${fieldPath}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUrlStrings(child, context, `${fieldPath}.${field}`);
  }
}
