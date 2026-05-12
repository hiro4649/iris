import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parseIrisEnvFile } from "../../config/loadIrisEnv.js";
import { ContractError } from "../../core/contracts.js";
import {
  assertYouTubeIngestLocalEnvProfileSafe,
  createYouTubeIngestLocalEnvProfile,
  renderYouTubeIngestLocalEnvTemplate,
} from "./youtubeIngestLocalEnvProfile.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const APPLY_MODES = new Set(["dry_run", "materialize"]);
const APPLY_STATUSES = new Set([
  "ready_to_create_youtube_local_env_file",
  "ready_to_append_youtube_local_env_names",
  "youtube_local_env_file_created",
  "youtube_local_env_names_appended",
  "no_missing_youtube_local_env_names",
]);
const OPERATOR_FILL_ENV_NAMES = Object.freeze([
  "IRIS_YOUTUBE_LIVE_CHAT_SOURCE",
  "IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT",
  "IRIS_YOUTUBE_LIVE_CHAT_ID",
  "IRIS_YOUTUBE_VIDEO_ID",
  "IRIS_YOUTUBE_VIDEO_URL",
  "IRIS_YOUTUBE_WATCH_URL",
  "IRIS_YOUTUBE_DATA_API_KEY",
  "IRIS_YOUTUBE_OAUTH_TOKEN",
  "IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN",
  "IRIS_YOUTUBE_OAUTH_CLIENT_ID",
  "IRIS_YOUTUBE_OAUTH_CLIENT_SECRET",
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
  "canonical",
  "canonical_envelope",
  "final_text",
  "last_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
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
  "path",
  "cursor_path",
]);
const YOUTUBE_INGEST_LOCAL_ENV_APPLY_PLAN_FIELDS = new Set([
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

export function createYouTubeIngestLocalEnvApplyPlan({
  cwd = process.cwd(),
  generatedAtMs = Date.now(),
  applyMode = "dry_run",
} = {}) {
  if (!APPLY_MODES.has(applyMode)) {
    throw new ContractError("YouTube ingest local env apply plan: invalid apply mode");
  }

  const profile = createYouTubeIngestLocalEnvProfile({ generatedAtMs });
  assertYouTubeIngestLocalEnvProfileSafe(
    profile,
    "YouTube ingest local env apply profile"
  );
  const template = renderYouTubeIngestLocalEnvTemplate({ includeComments: false });
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
        : renderYouTubeIngestLocalEnvTemplate(),
      "utf8"
    );
  }

  const envFileExistsAfter = existsSync(envFile);
  const applyStatus = resolveApplyStatus({
    applyMode,
    envFileExistsBefore,
    missingTemplateEnvNames,
  });
  const report = {
    schema: "iris_youtube_ingest_local_env_apply_plan_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "youtube_comments_and_support",
    target_stage_priority: 2,
    apply_mode: applyMode,
    apply_status: applyStatus,
    env_file_name: basename(envFileName),
    env_file_exists_before: envFileExistsBefore,
    env_file_exists_after: envFileExistsAfter,
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
      schema: "iris_youtube_ingest_local_env_apply_plan_scripts_v1",
      local_env_profile_script: "npm run dev:youtube:local-env-profile",
      local_env_apply_plan_script: "npm run dev:youtube:local-env-apply",
      env_setup_plan_script: "npm run dev:youtube:env-setup-plan",
      preflight_script: "npm run dev:youtube:preflight",
      relay_bridge_script: "npm run dev:youtube:relay-bridge",
      relay_readiness_rehearsal_script:
        "npm run dev:youtube:relay-readiness-rehearsal",
      source_status_script: "npm run dev:youtube:source-status",
      runtime_status_script: "npm run dev:youtube:runtime-status",
      live_readiness_script: "npm run dev:youtube:live-readiness",
      runtime_ingest_roundtrip_script:
        "npm run dev:youtube:runtime-ingest-roundtrip",
      support_gate_roundtrip_script: "npm run dev:youtube:support-gate-roundtrip",
    },
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
      append_requires_explicit_cli_flag: true,
      read_only_when_dry_run: applyMode === "dry_run",
    },
    adapter_validation_required: true,
  };
  assertYouTubeIngestLocalEnvApplyPlanSafe(report);
  return report;
}

export function assertYouTubeIngestLocalEnvApplyPlanSafe(
  report,
  context = "YouTube ingest local env apply plan"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenFields(report, context);
  assertNoUrlStrings(report, context);
  if (report.schema !== "iris_youtube_ingest_local_env_apply_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!YOUTUBE_INGEST_LOCAL_ENV_APPLY_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (report.target_stage_id !== "youtube_comments_and_support") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (report.target_stage_priority !== 2) {
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
  if (
    report.apply_status === "no_missing_youtube_local_env_names" &&
    report.missing_template_env_name_count !== 0
  ) {
    throw new ContractError(`${context}: no-missing status has missing env`);
  }
  if (
    report.apply_status === "youtube_local_env_file_created" &&
    (report.env_file_exists_before !== false || report.file_update_performed !== true)
  ) {
    throw new ContractError(`${context}: invalid created status`);
  }
  if (
    report.apply_status === "youtube_local_env_names_appended" &&
    (report.env_file_exists_before !== true || report.file_update_performed !== true)
  ) {
    throw new ContractError(`${context}: invalid appended status`);
  }
  if (report.template_profile_status !== "ready_to_render_youtube_ingest_local_env_template") {
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
    `${context}: missing template env names`
  );
  assertEnvNameList(
    report.existing_default_review_env_names,
    `${context}: existing review env names`
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
      "no_platform_cursor_values",
      "no_live_payloads",
      "no_support_message_text",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "no_template_text",
      "append_requires_explicit_cli_flag",
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

function resolveApplyStatus({ applyMode, envFileExistsBefore, missingTemplateEnvNames }) {
  if (missingTemplateEnvNames.length === 0) return "no_missing_youtube_local_env_names";
  if (applyMode === "materialize") {
    return envFileExistsBefore
      ? "youtube_local_env_names_appended"
      : "youtube_local_env_file_created";
  }
  return envFileExistsBefore
    ? "ready_to_append_youtube_local_env_names"
    : "ready_to_create_youtube_local_env_file";
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
    "# IRIS YouTube ingest local profile",
    "# Fill one source mode and credentials before polling a real live chat.",
    ...missingLines,
  ];
  return `${String(existingText).replace(/\s+$/u, "")}${header.join("\n")}\n`;
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts required`);
  }
  if (scripts.schema !== "iris_youtube_ingest_local_env_apply_plan_scripts_v1") {
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
