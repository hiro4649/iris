import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parseIrisEnvFile } from "../../config/loadIrisEnv.js";
import { ContractError } from "../../core/contracts.js";
import {
  createFoundationLocalEnvProfile,
  renderFoundationLocalEnvTemplate,
  assertFoundationLocalEnvProfileSafe,
} from "./foundationLocalEnvProfile.js";
import {
  createFoundationLocalEnvRoundtripReport,
  assertFoundationLocalEnvRoundtripReportSafe,
} from "./foundationLocalEnvRoundtrip.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const APPLY_MODES = new Set(["dry_run", "materialize"]);
const APPLY_STATUSES = new Set([
  "ready_to_materialize_local_env_file",
  "local_env_file_materialized",
  "blocked_existing_local_env_file",
]);
const FORBIDDEN_APPLY_FIELDS = new Set([
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
  "path",
  "artifact_path",
]);
const FOUNDATION_LOCAL_ENV_APPLY_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "apply_mode",
  "apply_status",
  "env_file_name",
  "env_file_exists_before",
  "env_file_exists_after",
  "replace_existing_allowed",
  "existing_file_blocks_materialization",
  "explicit_materialize_flag_required",
  "file_update_performed",
  "template_roundtrip_status",
  "template_env_name_count",
  "parsed_template_env_name_count",
  "existing_env_name_count",
  "existing_env_names",
  "missing_template_env_name_count",
  "missing_template_env_names",
  "materialized_env_name_count",
  "verification_scripts",
  "boundary_policy",
  "adapter_validation_required",
]);

export function createFoundationLocalEnvApplyPlan({
  cwd = process.cwd(),
  generatedAtMs = Date.now(),
  applyMode = "dry_run",
  allowReplace = false,
} = {}) {
  if (!APPLY_MODES.has(applyMode)) {
    throw new ContractError("foundation local env apply plan: invalid apply mode");
  }

  const profile = createFoundationLocalEnvProfile({ generatedAtMs });
  const roundtrip = createFoundationLocalEnvRoundtripReport({ generatedAtMs });
  assertFoundationLocalEnvProfileSafe(profile, "foundation local env apply profile");
  assertFoundationLocalEnvRoundtripReportSafe(
    roundtrip,
    "foundation local env apply roundtrip"
  );

  const envFileName = profile.env_file_name;
  const envFile = resolve(cwd, envFileName);
  const envFileExistsBefore = existsSync(envFile);
  const existingEnvNames = envFileExistsBefore
    ? Object.keys(parseIrisEnvFile(readFileSync(envFile, "utf8"))).sort()
    : [];
  const existingEnvNameSet = new Set(existingEnvNames);
  const missingTemplateEnvNames = profile.template_env_names.filter(
    (name) => !existingEnvNameSet.has(name)
  );
  const template = renderFoundationLocalEnvTemplate();
  const parsedTemplateEnvNames = Object.keys(parseIrisEnvFile(template)).sort();
  const materializationAllowed =
    applyMode === "materialize" && (!envFileExistsBefore || allowReplace);
  const blockedByExistingFile =
    applyMode === "materialize" && envFileExistsBefore && !allowReplace;

  if (materializationAllowed) {
    writeFileSync(envFile, template, "utf8");
  }

  const envFileExistsAfter = existsSync(envFile);
  const applyStatus =
    applyMode === "dry_run"
      ? "ready_to_materialize_local_env_file"
      : blockedByExistingFile
        ? "blocked_existing_local_env_file"
        : "local_env_file_materialized";
  const report = {
    schema: "iris_foundation_local_env_apply_plan_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "tts_live2d_obs_foundation",
    target_stage_priority: 1,
    apply_mode: applyMode,
    apply_status: applyStatus,
    env_file_name: basename(envFileName),
    env_file_exists_before: envFileExistsBefore,
    env_file_exists_after: envFileExistsAfter,
    replace_existing_allowed: Boolean(allowReplace),
    existing_file_blocks_materialization: blockedByExistingFile,
    explicit_materialize_flag_required: true,
    file_update_performed: materializationAllowed,
    template_roundtrip_status: roundtrip.roundtrip_status,
    template_env_name_count: profile.template_env_name_count,
    parsed_template_env_name_count: parsedTemplateEnvNames.length,
    existing_env_name_count: existingEnvNames.length,
    existing_env_names: existingEnvNames,
    missing_template_env_name_count: missingTemplateEnvNames.length,
    missing_template_env_names: missingTemplateEnvNames,
    materialized_env_name_count: materializationAllowed
      ? parsedTemplateEnvNames.length
      : 0,
    verification_scripts: {
      schema: "iris_foundation_local_env_apply_plan_scripts_v1",
      local_env_profile_script: "npm run dev:foundation:local-env-profile",
      local_env_roundtrip_script: "npm run dev:foundation:local-env-roundtrip",
      local_env_apply_plan_script: "npm run dev:foundation:local-env-apply",
      foundation_env_setup_plan_script: "npm run dev:foundation:env-setup-plan",
      foundation_preflight_script: "npm run dev:foundation:preflight",
      foundation_startup_checklist_script:
        "npm run dev:foundation:startup-checklist",
      foundation_runtime_status_script: "npm run dev:foundation:runtime-status",
      foundation_live_readiness_script: "npm run dev:foundation:live-readiness",
      bridge_status_roundtrip_script: "npm run dev:bridge:status-roundtrip",
      bridge_engine_roundtrip_script: "npm run dev:bridge:engine-roundtrip",
      obs_runtime_render_roundtrip_script:
        "npm run dev:obs:runtime-render-roundtrip",
    },
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
      read_only_when_dry_run: applyMode === "dry_run",
    },
    adapter_validation_required: true,
  };
  assertFoundationLocalEnvApplyPlanSafe(report);
  return report;
}

export function assertFoundationLocalEnvApplyPlanSafe(
  report,
  context = "foundation local env apply plan"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenFields(report, context);
  assertNoUrlStrings(report, context);
  if (report.schema !== "iris_foundation_local_env_apply_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!FOUNDATION_LOCAL_ENV_APPLY_PLAN_FIELDS.has(field)) {
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
  if (!APPLY_MODES.has(report.apply_mode)) {
    throw new ContractError(`${context}: invalid apply mode`);
  }
  if (!APPLY_STATUSES.has(report.apply_status)) {
    throw new ContractError(`${context}: invalid apply status`);
  }
  if (report.env_file_name !== ".env.local") {
    throw new ContractError(`${context}: invalid env file name`);
  }
  for (const field of [
    "env_file_exists_before",
    "env_file_exists_after",
    "replace_existing_allowed",
    "existing_file_blocks_materialization",
    "explicit_materialize_flag_required",
    "file_update_performed",
  ]) {
    if (typeof report[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (report.apply_mode === "dry_run" && report.file_update_performed !== false) {
    throw new ContractError(`${context}: dry run cannot update file`);
  }
  if (
    report.apply_status === "blocked_existing_local_env_file" &&
    report.existing_file_blocks_materialization !== true
  ) {
    throw new ContractError(`${context}: blocked status requires existing file block`);
  }
  if (
    report.apply_status === "local_env_file_materialized" &&
    report.file_update_performed !== true
  ) {
    throw new ContractError(`${context}: materialized status requires file update`);
  }
  if (report.template_roundtrip_status !== "ready_for_foundation_local_env_file") {
    throw new ContractError(`${context}: invalid template roundtrip status`);
  }
  for (const field of [
    "template_env_name_count",
    "parsed_template_env_name_count",
    "existing_env_name_count",
    "missing_template_env_name_count",
    "materialized_env_name_count",
  ]) {
    assertNonNegativeInteger(report[field], `${context}: invalid ${field}`);
  }
  assertEnvNameList(report.existing_env_names, `${context}: existing env names`);
  assertEnvNameList(
    report.missing_template_env_names,
    `${context}: missing template env names`
  );
  if (report.existing_env_name_count !== report.existing_env_names.length) {
    throw new ContractError(`${context}: invalid existing env count`);
  }
  if (
    report.missing_template_env_name_count !==
    report.missing_template_env_names.length
  ) {
    throw new ContractError(`${context}: invalid missing env count`);
  }
  if (report.parsed_template_env_name_count !== report.template_env_name_count) {
    throw new ContractError(`${context}: template parse count mismatch`);
  }
  assertVerificationScriptsSafe(report.verification_scripts, context);
  assertBoundaryPolicy(
    report.boundary_policy,
    [
      "env_names_only",
      "env_counts_only",
      "file_names_only",
      "script_names_only",
      "no_env_values",
      "no_secret_values",
      "no_endpoint_values",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "no_template_text",
      "materialization_requires_explicit_cli_flag",
    ],
    `${context}: boundary policy`,
    ["read_only_when_dry_run"]
  );
  if (report.apply_mode === "dry_run") {
    if (report.boundary_policy.read_only_when_dry_run !== true) {
      throw new ContractError(`${context}: read_only_when_dry_run boundary required`);
    }
  } else if (typeof report.boundary_policy.read_only_when_dry_run !== "boolean") {
    throw new ContractError(`${context}: read_only_when_dry_run boundary flag required`);
  }
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertBoundaryPolicy(policy, requiredFields, context, optionalFields = []) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set([...requiredFields, ...optionalFields]);
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
  if (scripts.schema !== "iris_foundation_local_env_apply_plan_scripts_v1") {
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
    value.forEach((item, index) =>
      assertNoForbiddenFields(item, context, `${fieldPath}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_APPLY_FIELDS.has(field)) {
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
    value.forEach((item, index) =>
      assertNoUrlStrings(item, context, `${fieldPath}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUrlStrings(child, context, `${fieldPath}.${field}`);
  }
}
