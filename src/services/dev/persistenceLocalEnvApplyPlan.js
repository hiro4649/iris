import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parseIrisEnvFile } from "../../config/loadIrisEnv.js";
import { ContractError } from "../../core/contracts.js";
import {
  assertPersistenceLocalEnvProfileSafe,
  createPersistenceLocalEnvProfile,
  renderPersistenceLocalEnvTemplate,
} from "./persistenceLocalEnvProfile.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const APPLY_MODES = new Set(["dry_run", "materialize"]);
const APPLY_STATUSES = new Set([
  "ready_to_create_persistence_local_env_file",
  "ready_to_append_persistence_local_env_names",
  "persistence_local_env_file_created",
  "persistence_local_env_names_appended",
  "no_missing_persistence_local_env_names",
]);
const OPERATOR_FILL_ENV_NAMES = Object.freeze([
  "IRIS_MEMORY_STORE_PATH",
  "IRIS_RELATIONSHIP_STORE_PATH",
  "IRIS_ENABLE_CANDIDATE_PERSISTENCE",
  "IRIS_ENABLE_RELATIONSHIP_MEMORY",
  "IRIS_MEMORY_SEARCH_ADAPTER",
  "IRIS_MEMORY_SEARCH_ENDPOINT",
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
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "memory_records",
  "relationship_profiles",
  "records",
  "profiles",
  "recent_summaries",
  "summary",
  "endpoint",
  "url",
  "filePath",
  "file_path",
  "memory_store_path",
  "relationship_store_path",
  "store_path",
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
]);
const PERSISTENCE_LOCAL_ENV_APPLY_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "apply_mode",
  "apply_status",
  "env_file_name",
  "env_file_exists_before",
  "env_file_exists_after",
  "explicit_materialize_flag_required",
  "file_update_performed",
  "append_missing_only",
  "template_profile_status",
  "template_env_name_count",
  "parsed_template_env_name_count",
  "existing_env_name_count",
  "existing_env_names",
  "missing_template_env_name_count",
  "missing_template_env_names",
  "existing_default_review_env_name_count",
  "existing_default_review_env_names",
  "materialized_env_name_count",
  "operator_fill_env_names",
  "operator_fill_env_name_count",
  "verification_scripts",
  "boundary_policy",
  "adapter_validation_required",
]);

export function createPersistenceLocalEnvApplyPlan({
  cwd = process.cwd(),
  generatedAtMs = Date.now(),
  applyMode = "dry_run",
} = {}) {
  if (!APPLY_MODES.has(applyMode)) {
    throw new ContractError("persistence local env apply plan: invalid apply mode");
  }

  const profile = createPersistenceLocalEnvProfile({ generatedAtMs });
  assertPersistenceLocalEnvProfileSafe(profile, "persistence local env apply profile");
  const template = renderPersistenceLocalEnvTemplate({ includeComments: false });
  const templateEnv = parseIrisEnvFile(template);
  const parsedTemplateEnvNames = Object.keys(templateEnv).sort();
  const envFileName = profile.env_file_name;
  const envFile = resolve(cwd, envFileName);
  const envFileExistsBefore = existsSync(envFile);
  const existingText = envFileExistsBefore ? readFileSync(envFile, "utf8") : "";
  const existingEnv = envFileExistsBefore ? parseIrisEnvFile(existingText) : {};
  const existingEnvNames = Object.keys(existingEnv).sort();
  const existingEnvNameSet = new Set(existingEnvNames);
  const missingTemplateEnvNames = profile.template_env_names.filter(
    (name) => !existingEnvNameSet.has(name)
  );
  const existingDefaultReviewEnvNames = profile.template_env_names.filter(
    (name) =>
      existingEnvNameSet.has(name) &&
      templateEnv[name] !== "" &&
      existingEnv[name] !== templateEnv[name]
  );
  const materializationAllowed =
    applyMode === "materialize" && missingTemplateEnvNames.length > 0;

  if (materializationAllowed) {
    writeFileSync(
      envFile,
      envFileExistsBefore
        ? appendMissingTemplate(
            existingText,
            existingEnv,
            profile.template_env_names,
            templateEnv
          )
        : renderPersistenceLocalEnvTemplate(),
      "utf8"
    );
  }

  const report = {
    schema: "iris_persistence_local_env_apply_plan_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "memory_and_relationship_persistence",
    target_stage_priority: 3,
    apply_mode: applyMode,
    apply_status: resolveApplyStatus({
      applyMode,
      envFileExistsBefore,
      missingTemplateEnvNames,
    }),
    env_file_name: basename(envFileName),
    env_file_exists_before: envFileExistsBefore,
    env_file_exists_after: existsSync(envFile),
    explicit_materialize_flag_required: true,
    file_update_performed: materializationAllowed,
    append_missing_only: true,
    template_profile_status: profile.profile_status,
    template_env_name_count: profile.template_env_name_count,
    parsed_template_env_name_count: parsedTemplateEnvNames.length,
    existing_env_name_count: existingEnvNames.length,
    existing_env_names: existingEnvNames,
    missing_template_env_name_count: missingTemplateEnvNames.length,
    missing_template_env_names: missingTemplateEnvNames,
    existing_default_review_env_name_count: existingDefaultReviewEnvNames.length,
    existing_default_review_env_names: existingDefaultReviewEnvNames,
    materialized_env_name_count: materializationAllowed
      ? missingTemplateEnvNames.length
      : 0,
    operator_fill_env_names: [...OPERATOR_FILL_ENV_NAMES],
    operator_fill_env_name_count: OPERATOR_FILL_ENV_NAMES.length,
    verification_scripts: {
      schema: "iris_persistence_local_env_apply_plan_scripts_v1",
      local_env_profile_script: "npm run dev:persistence:local-env-profile",
      local_env_apply_plan_script: "npm run dev:persistence:local-env-apply",
      env_setup_plan_script: "npm run dev:persistence:env-setup-plan",
      preflight_script: "npm run dev:persistence:preflight",
      runtime_status_script: "npm run dev:persistence:runtime-status",
      vector_memory_bridge_script: "npm run dev:memory-vector:bridge",
      vector_memory_roundtrip_script: "npm run dev:memory-vector:roundtrip",
    },
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
      append_requires_explicit_cli_flag: true,
      read_only_when_dry_run: applyMode === "dry_run",
    },
    adapter_validation_required: true,
  };
  assertPersistenceLocalEnvApplyPlanSafe(report);
  return report;
}

export function assertPersistenceLocalEnvApplyPlanSafe(
  report,
  context = "persistence local env apply plan"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenFields(report, context);
  assertNoUrlStrings(report, context);
  if (report.schema !== "iris_persistence_local_env_apply_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!PERSISTENCE_LOCAL_ENV_APPLY_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (report.target_stage_id !== "memory_and_relationship_persistence") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (report.target_stage_priority !== 3) {
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
    "explicit_materialize_flag_required",
    "file_update_performed",
    "append_missing_only",
  ]) {
    if (typeof report[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (report.apply_mode === "dry_run" && report.file_update_performed !== false) {
    throw new ContractError(`${context}: dry run cannot update file`);
  }
  if (report.template_profile_status !== "ready_to_render_persistence_local_env_template") {
    throw new ContractError(`${context}: invalid profile status`);
  }
  for (const field of [
    "template_env_name_count",
    "parsed_template_env_name_count",
    "existing_env_name_count",
    "missing_template_env_name_count",
    "existing_default_review_env_name_count",
    "materialized_env_name_count",
    "operator_fill_env_name_count",
  ]) {
    assertNonNegativeInteger(report[field], `${context}: invalid ${field}`);
  }
  if (report.parsed_template_env_name_count !== report.template_env_name_count) {
    throw new ContractError(`${context}: template parse count mismatch`);
  }
  assertEnvNameList(report.existing_env_names, `${context}: existing env names`);
  assertEnvNameList(
    report.missing_template_env_names,
    `${context}: missing env names`
  );
  assertEnvNameList(
    report.existing_default_review_env_names,
    `${context}: review env names`
  );
  assertEnvNameList(report.operator_fill_env_names, `${context}: operator env names`);
  if (report.existing_env_name_count !== report.existing_env_names.length) {
    throw new ContractError(`${context}: invalid existing env count`);
  }
  if (
    report.missing_template_env_name_count !==
    report.missing_template_env_names.length
  ) {
    throw new ContractError(`${context}: invalid missing env count`);
  }
  if (
    report.existing_default_review_env_name_count !==
    report.existing_default_review_env_names.length
  ) {
    throw new ContractError(`${context}: invalid review env count`);
  }
  if (report.operator_fill_env_name_count !== report.operator_fill_env_names.length) {
    throw new ContractError(`${context}: invalid operator env count`);
  }
  assertVerificationScriptsSafe(report.verification_scripts, context);
  assertBoundaryPolicy(report.boundary_policy, [
    "env_names_only",
    "env_counts_only",
    "file_names_only",
    "script_names_only",
    "no_env_values",
    "no_secret_values",
    "no_store_paths",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
    "no_memory_summaries",
    "no_relationship_scores",
    "no_candidates",
    "no_commands",
    "no_template_text",
    "append_requires_explicit_cli_flag",
  ], context);
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

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set([...requiredFields, "read_only_when_dry_run"]);
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

function resolveApplyStatus({ applyMode, envFileExistsBefore, missingTemplateEnvNames }) {
  if (missingTemplateEnvNames.length === 0) return "no_missing_persistence_local_env_names";
  if (applyMode === "materialize") {
    return envFileExistsBefore
      ? "persistence_local_env_names_appended"
      : "persistence_local_env_file_created";
  }
  return envFileExistsBefore
    ? "ready_to_append_persistence_local_env_names"
    : "ready_to_create_persistence_local_env_file";
}

function appendMissingTemplate(
  existingText,
  existingEnv,
  orderedTemplateEnvNames,
  templateEnv
) {
  const missingLines = orderedTemplateEnvNames
    .filter((name) => !Object.prototype.hasOwnProperty.call(existingEnv, name))
    .map((name) => `${name}=${templateEnv[name] ?? ""}`);
  const header = [
    "",
    "# IRIS persistence local profile",
    "# Fill local store and vector-search bridge values before live operation.",
    ...missingLines,
  ];
  return `${String(existingText).replace(/\s+$/u, "")}${header.join("\n")}\n`;
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts required`);
  }
  if (scripts.schema !== "iris_persistence_local_env_apply_plan_scripts_v1") {
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
