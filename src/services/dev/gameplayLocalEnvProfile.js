import { ContractError } from "../../core/contracts.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const ENV_NAME_PATTERN = /^IRIS_[A-Z0-9_]+$/;

const FORBIDDEN_GAMEPLAY_LOCAL_ENV_PROFILE_FIELDS = new Set([
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
const GAMEPLAY_LOCAL_ENV_PROFILE_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "profile_status",
  "env_file_name",
  "env_group_count",
  "template_env_name_count",
  "template_env_names",
  "env_groups",
  "verification_scripts",
  "template_render_script",
  "operator_notes",
  "boundary_policy",
  "adapter_validation_required",
]);

const PROFILE_STATUSES = new Set(["ready_to_render_gameplay_local_env_template"]);
const GROUP_IDS = new Set([
  "gameplay_vision_source",
  "gameplay_capture_options",
  "gameplay_control_adapter",
  "gameplay_control_safety",
]);
const OPERATOR_NOTES = new Set([
  "vision_source_must_be_local_or_private",
  "scheduler_required_for_screen_polling",
  "control_bridge_disabled_until_operator_enables",
  "approved_actions_only_after_validator",
  "stale_and_rate_guards_required",
]);

const TEMPLATE_GROUPS = Object.freeze([
  {
    group_id: "gameplay_vision_source",
    required_env_names: [
      "IRIS_GAME_OBSERVATION_ENDPOINT",
      "IRIS_GAME_OBSERVATION_METHOD",
      "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
    ],
    optional_env_names: [
      "IRIS_GAME_OBSERVATION_API_KEY",
      "IRIS_GAME_OBSERVATION_TIMEOUT_MS",
      "IRIS_GAME_OBSERVATION_ERROR_BACKOFF_MS",
      "IRIS_GAME_OBSERVATION_MAX_ERROR_BACKOFF_MS",
      "IRIS_HTTP_INGEST_INTERVAL_MS",
      "IRIS_HTTP_INGEST_LIMIT",
      "IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR",
    ],
  },
  {
    group_id: "gameplay_capture_options",
    required_env_names: [],
    optional_env_names: [
      "IRIS_GAME_CAPTURE_REGION",
      "IRIS_GAME_CAPTURE_X",
      "IRIS_GAME_CAPTURE_Y",
      "IRIS_GAME_CAPTURE_WIDTH",
      "IRIS_GAME_CAPTURE_HEIGHT",
      "IRIS_GAME_OBSERVATION_INCLUDE_OCR_SUMMARY",
      "IRIS_GAME_OBSERVATION_INCLUDE_UI_FOCUS_AREAS",
      "IRIS_GAME_OBSERVATION_MAX_EVENTS",
    ],
  },
  {
    group_id: "gameplay_control_adapter",
    required_env_names: [
      "IRIS_ENABLE_GAME_CONTROL",
      "IRIS_GAME_CONTROL_ADAPTER",
      "IRIS_GAME_CONTROL_ENDPOINT",
      "IRIS_AVAILABLE_GAME_ACTIONS",
    ],
    optional_env_names: ["IRIS_GAME_CONTROL_API_KEY", "IRIS_GAME_CONTROL_TIMEOUT_MS"],
  },
  {
    group_id: "gameplay_control_safety",
    required_env_names: [
      "IRIS_GAME_CONTROL_MIN_INTERVAL_MS",
      "IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS",
    ],
    optional_env_names: [],
  },
]);

const TEMPLATE_LINES = Object.freeze([
  ["IRIS_GAME_OBSERVATION_ENDPOINT", ""],
  ["IRIS_GAME_OBSERVATION_METHOD", "POST"],
  ["IRIS_ENABLE_HTTP_INGEST_SCHEDULER", "true"],
  ["IRIS_GAME_OBSERVATION_API_KEY", ""],
  ["IRIS_GAME_OBSERVATION_TIMEOUT_MS", "5000"],
  ["IRIS_GAME_OBSERVATION_ERROR_BACKOFF_MS", "3000"],
  ["IRIS_GAME_OBSERVATION_MAX_ERROR_BACKOFF_MS", "30000"],
  ["IRIS_HTTP_INGEST_INTERVAL_MS", "3000"],
  ["IRIS_HTTP_INGEST_LIMIT", "10"],
  ["IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR", "true"],
  ["IRIS_GAME_CAPTURE_REGION", ""],
  ["IRIS_GAME_CAPTURE_X", ""],
  ["IRIS_GAME_CAPTURE_Y", ""],
  ["IRIS_GAME_CAPTURE_WIDTH", ""],
  ["IRIS_GAME_CAPTURE_HEIGHT", ""],
  ["IRIS_GAME_OBSERVATION_INCLUDE_OCR_SUMMARY", "true"],
  ["IRIS_GAME_OBSERVATION_INCLUDE_UI_FOCUS_AREAS", "true"],
  ["IRIS_GAME_OBSERVATION_MAX_EVENTS", "5"],
  ["IRIS_ENABLE_GAME_CONTROL", "false"],
  ["IRIS_GAME_CONTROL_ADAPTER", "http"],
  ["IRIS_GAME_CONTROL_ENDPOINT", ""],
  ["IRIS_AVAILABLE_GAME_ACTIONS", ""],
  ["IRIS_GAME_CONTROL_API_KEY", ""],
  ["IRIS_GAME_CONTROL_TIMEOUT_MS", "5000"],
  ["IRIS_GAME_CONTROL_MIN_INTERVAL_MS", "250"],
  ["IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS", "2000"],
]);

const VERIFICATION_SCRIPTS = Object.freeze([
  "npm run dev:gameplay:local-env-profile",
  "npm run dev:gameplay:local-env-apply",
  "npm run dev:gameplay:env-setup-plan",
  "npm run dev:gameplay:startup-checklist",
  "npm run dev:gameplay:preflight",
  "npm run dev:gameplay:runtime-status",
  "npm run dev:gameplay:live-readiness",
  "npm run dev:gameplay:readiness-rehearsal",
  "npm run dev:vision:game-roundtrip",
  "npm run dev:game-control:roundtrip",
]);

export function createGameplayLocalEnvProfile({
  generatedAtMs = Date.now(),
} = {}) {
  const templateEnvNames = collectTemplateEnvNames();
  const profile = {
    schema: "iris_gameplay_local_env_profile_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "vision_and_safe_game_control",
    target_stage_priority: 4,
    profile_status: "ready_to_render_gameplay_local_env_template",
    env_file_name: ".env.local",
    env_group_count: TEMPLATE_GROUPS.length,
    template_env_name_count: templateEnvNames.length,
    template_env_names: templateEnvNames,
    env_groups: TEMPLATE_GROUPS.map((group, index) => ({
      schema: "iris_gameplay_local_env_group_v1",
      sequence_order: index + 1,
      group_id: group.group_id,
      required_env_names: [...group.required_env_names],
      optional_env_names: [...group.optional_env_names],
      required_env_count: group.required_env_names.length,
      optional_env_count: group.optional_env_names.length,
      boundary_policy: {
        env_names_only: true,
        no_env_values: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_raw_frames: true,
        no_action_candidates: true,
      },
    })),
    verification_scripts: [...VERIFICATION_SCRIPTS],
    template_render_script:
      "npm run dev:gameplay:local-env-profile -- --print-env",
    operator_notes: [
      "vision_source_must_be_local_or_private",
      "scheduler_required_for_screen_polling",
      "control_bridge_disabled_until_operator_enables",
      "approved_actions_only_after_validator",
      "stale_and_rate_guards_required",
    ],
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
      read_only_profile: true,
      print_env_requires_explicit_cli_flag: true,
      game_control_default_disabled: true,
    },
    adapter_validation_required: true,
  };
  assertGameplayLocalEnvProfileSafe(profile);
  return profile;
}

export function renderGameplayLocalEnvTemplate({ includeComments = true } = {}) {
  const lines = [];
  if (includeComments) {
    lines.push("# IRIS gameplay local profile");
    lines.push("# Fill local/private vision and approved-control bridge values before live operation.");
    lines.push("# Do not paste frames, OCR text, input candidates, approved actions, or secrets here.");
    lines.push("# Game control stays disabled until the operator explicitly enables it.");
    lines.push("");
  }
  for (const [name, value] of TEMPLATE_LINES) {
    assertEnvName(name, "gameplay local env template");
    lines.push(`${name}=${value}`);
  }
  return `${lines.join("\n")}\n`;
}

export function assertGameplayLocalEnvProfileSafe(
  profile,
  context = "gameplay local env profile"
) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new ContractError(`${context}: profile is required`);
  }
  assertNoForbiddenFields(profile, context);
  assertNoUrlStrings(profile, context);
  if (profile.schema !== "iris_gameplay_local_env_profile_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(profile)) {
    if (!GAMEPLAY_LOCAL_ENV_PROFILE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected profile field`, { field });
    }
  }
  if (!Number.isInteger(profile.generated_at_ms) || profile.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (profile.target_stage_id !== "vision_and_safe_game_control") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (profile.target_stage_priority !== 4) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!PROFILE_STATUSES.has(profile.profile_status)) {
    throw new ContractError(`${context}: invalid profile status`);
  }
  if (profile.env_file_name !== ".env.local") {
    throw new ContractError(`${context}: invalid env file name`);
  }
  const expectedEnvNames = collectTemplateEnvNames();
  assertEnvNameList(profile.template_env_names, `${context}: template env names`);
  if (JSON.stringify(profile.template_env_names) !== JSON.stringify(expectedEnvNames)) {
    throw new ContractError(`${context}: invalid template env names`);
  }
  if (profile.env_group_count !== TEMPLATE_GROUPS.length) {
    throw new ContractError(`${context}: invalid group count`);
  }
  if (profile.template_env_name_count !== expectedEnvNames.length) {
    throw new ContractError(`${context}: invalid env count`);
  }
  assertEnvGroupsSafe(profile.env_groups, context);
  assertScriptList(profile.verification_scripts, `${context}: verification scripts`);
  assertSafeScriptName(profile.template_render_script, `${context}: template script`);
  assertOperatorNotes(profile.operator_notes, context);
  assertBoundaryPolicy(profile.boundary_policy, [
    "env_names_only",
    "script_names_only",
    "operator_labels_only",
    "no_env_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_raw_frames",
    "no_raw_ocr_text",
    "no_vision_payloads",
    "no_action_candidates",
    "no_approved_actions",
    "no_commands",
    "read_only_profile",
    "print_env_requires_explicit_cli_flag",
    "game_control_default_disabled",
  ], context);
  if (profile.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function collectTemplateEnvNames() {
  return [
    ...new Set(
      TEMPLATE_GROUPS.flatMap((group) => [
        ...group.required_env_names,
        ...group.optional_env_names,
      ])
    ),
  ];
}

function assertEnvGroupsSafe(groups, context) {
  if (!Array.isArray(groups) || groups.length !== TEMPLATE_GROUPS.length) {
    throw new ContractError(`${context}: invalid groups`);
  }
  groups.forEach((group, index) => {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      throw new ContractError(`${context}: invalid group`);
    }
    if (group.schema !== "iris_gameplay_local_env_group_v1") {
      throw new ContractError(`${context}: invalid group schema`);
    }
    if (group.sequence_order !== index + 1) {
      throw new ContractError(`${context}: invalid group order`);
    }
    if (!GROUP_IDS.has(group.group_id)) {
      throw new ContractError(`${context}: invalid group id`);
    }
    const definition = TEMPLATE_GROUPS[index];
    if (
      group.group_id !== definition.group_id ||
      JSON.stringify(group.required_env_names) !==
        JSON.stringify(definition.required_env_names) ||
      JSON.stringify(group.optional_env_names) !==
        JSON.stringify(definition.optional_env_names)
    ) {
      throw new ContractError(`${context}: invalid group definition`);
    }
    assertEnvNameList(group.required_env_names, `${context}: required env`);
    assertEnvNameList(group.optional_env_names, `${context}: optional env`);
    if (group.required_env_count !== definition.required_env_names.length) {
      throw new ContractError(`${context}: invalid required count`);
    }
    if (group.optional_env_count !== definition.optional_env_names.length) {
      throw new ContractError(`${context}: invalid optional count`);
    }
    assertBoundaryPolicy(group.boundary_policy, [
      "env_names_only",
      "no_env_values",
      "no_secret_values",
      "no_endpoint_values",
      "no_raw_frames",
      "no_action_candidates",
    ], `${context}: group`);
  });
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

function assertOperatorNotes(notes, context) {
  if (!Array.isArray(notes) || notes.length !== OPERATOR_NOTES.size) {
    throw new ContractError(`${context}: invalid operator notes`);
  }
  for (const note of notes) {
    if (!OPERATOR_NOTES.has(note)) {
      throw new ContractError(`${context}: invalid operator note`);
    }
  }
}

function assertScriptList(scripts, context) {
  if (!Array.isArray(scripts) || scripts.length === 0) {
    throw new ContractError(`${context}: script list required`);
  }
  for (const script of scripts) assertSafeScriptName(script, context);
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
  for (const name of names) assertEnvName(name, context);
}

function assertEnvName(name, context) {
  if (typeof name !== "string" || !ENV_NAME_PATTERN.test(name)) {
    throw new ContractError(`${context}: invalid env name`);
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
    if (FORBIDDEN_GAMEPLAY_LOCAL_ENV_PROFILE_FIELDS.has(field)) {
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
