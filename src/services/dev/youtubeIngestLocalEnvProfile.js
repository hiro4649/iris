import { ContractError } from "../../core/contracts.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const ENV_NAME_PATTERN = /^IRIS_[A-Z0-9_]+$/;

const FORBIDDEN_YOUTUBE_LOCAL_ENV_PROFILE_FIELDS = new Set([
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
const YOUTUBE_INGEST_LOCAL_ENV_PROFILE_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "profile_status",
  "env_file_name",
  "source_modes",
  "env_group_count",
  "template_env_name_count",
  "template_env_names",
  "env_groups",
  "startup_scripts",
  "verification_scripts",
  "template_render_script",
  "operator_notes",
  "boundary_policy",
  "adapter_validation_required",
]);

const PROFILE_STATUSES = new Set([
  "ready_to_render_youtube_ingest_local_env_template",
]);
const GROUP_IDS = new Set([
  "youtube_source_selection",
  "youtube_direct_api_target",
  "youtube_direct_api_credentials",
  "youtube_direct_api_cursor_resume",
  "youtube_http_relay_target",
  "youtube_http_ingest_scheduler",
  "youtube_ingest_hygiene",
]);
const SOURCE_MODES = new Set(["youtube_api", "http_relay"]);
const OPERATOR_NOTES = new Set([
  "choose_one_source_mode",
  "direct_api_requires_chat_or_video_target",
  "direct_api_requires_one_credential_option",
  "direct_api_requires_cursor_resume_store",
  "relay_requires_local_or_private_target",
  "local_relay_bridge_available",
  "scheduler_required_for_live_polling",
  "support_events_enter_donation_pipeline",
]);

const YOUTUBE_TEMPLATE_GROUPS = Object.freeze([
  {
    group_id: "youtube_source_selection",
    applies_to_source_modes: ["youtube_api", "http_relay"],
    required_env_any_of: [
      ["IRIS_YOUTUBE_LIVE_CHAT_SOURCE"],
      ["IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT"],
    ],
    required_env_names: [],
    optional_env_names: [],
  },
  {
    group_id: "youtube_direct_api_target",
    applies_to_source_modes: ["youtube_api"],
    required_env_any_of: [
      ["IRIS_YOUTUBE_LIVE_CHAT_ID"],
      ["IRIS_YOUTUBE_VIDEO_ID"],
      ["IRIS_YOUTUBE_VIDEO_URL"],
      ["IRIS_YOUTUBE_WATCH_URL"],
    ],
    required_env_names: [],
    optional_env_names: [
      "IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT",
      "IRIS_YOUTUBE_VIDEOS_API_ENDPOINT",
      "IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS",
      "IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS",
      "IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW",
    ],
  },
  {
    group_id: "youtube_direct_api_credentials",
    applies_to_source_modes: ["youtube_api"],
    required_env_any_of: [
      ["IRIS_YOUTUBE_DATA_API_KEY"],
      ["IRIS_YOUTUBE_OAUTH_TOKEN"],
      [
        "IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN",
        "IRIS_YOUTUBE_OAUTH_CLIENT_ID",
        "IRIS_YOUTUBE_OAUTH_CLIENT_SECRET",
      ],
    ],
    required_env_names: [],
    optional_env_names: [
      "IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT",
      "IRIS_YOUTUBE_OAUTH_REFRESH_TIMEOUT_MS",
    ],
  },
  {
    group_id: "youtube_direct_api_cursor_resume",
    applies_to_source_modes: ["youtube_api"],
    required_env_any_of: [],
    required_env_names: ["IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH"],
    optional_env_names: [
      "IRIS_YOUTUBE_LIVE_CHAT_PAGE_TOKEN",
      "IRIS_YOUTUBE_LIVE_CHAT_ERROR_BACKOFF_MS",
      "IRIS_YOUTUBE_LIVE_CHAT_MAX_ERROR_BACKOFF_MS",
    ],
  },
  {
    group_id: "youtube_http_relay_target",
    applies_to_source_modes: ["http_relay"],
    required_env_any_of: [],
    required_env_names: ["IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT"],
    optional_env_names: [
      "IRIS_YOUTUBE_RELAY_BRIDGE_HOST",
      "IRIS_YOUTUBE_RELAY_BRIDGE_PORT",
      "IRIS_YOUTUBE_LIVE_CHAT_API_KEY",
      "IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS",
      "IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW",
    ],
  },
  {
    group_id: "youtube_http_ingest_scheduler",
    applies_to_source_modes: ["youtube_api", "http_relay"],
    required_env_any_of: [],
    required_env_names: ["IRIS_ENABLE_HTTP_INGEST_SCHEDULER"],
    optional_env_names: [
      "IRIS_HTTP_INGEST_INTERVAL_MS",
      "IRIS_HTTP_INGEST_LIMIT",
      "IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR",
    ],
  },
  {
    group_id: "youtube_ingest_hygiene",
    applies_to_source_modes: ["youtube_api", "http_relay"],
    required_env_any_of: [],
    required_env_names: [],
    optional_env_names: [
      "IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS",
      "IRIS_YOUTUBE_BLOCKED_TEXT_TERMS",
    ],
  },
]);

const TEMPLATE_LINES = Object.freeze([
  ["IRIS_YOUTUBE_RELAY_BRIDGE_HOST", "127.0.0.1"],
  ["IRIS_YOUTUBE_RELAY_BRIDGE_PORT", "9111"],
  ["IRIS_YOUTUBE_LIVE_CHAT_SOURCE", ""],
  ["IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT", ""],
  ["IRIS_YOUTUBE_LIVE_CHAT_ID", ""],
  ["IRIS_YOUTUBE_VIDEO_ID", ""],
  ["IRIS_YOUTUBE_VIDEO_URL", ""],
  ["IRIS_YOUTUBE_WATCH_URL", ""],
  ["IRIS_YOUTUBE_DATA_API_KEY", ""],
  ["IRIS_YOUTUBE_OAUTH_TOKEN", ""],
  ["IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN", ""],
  ["IRIS_YOUTUBE_OAUTH_CLIENT_ID", ""],
  ["IRIS_YOUTUBE_OAUTH_CLIENT_SECRET", ""],
  ["IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT", ""],
  ["IRIS_YOUTUBE_OAUTH_REFRESH_TIMEOUT_MS", "5000"],
  ["IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT", ""],
  ["IRIS_YOUTUBE_VIDEOS_API_ENDPOINT", ""],
  ["IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS", "200"],
  ["IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS", "5000"],
  ["IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW", "5000"],
  ["IRIS_YOUTUBE_LIVE_CHAT_API_KEY", ""],
  ["IRIS_YOUTUBE_LIVE_CHAT_PAGE_TOKEN", ""],
  ["IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH", "data/youtube_live_chat_cursor.json"],
  ["IRIS_YOUTUBE_LIVE_CHAT_ERROR_BACKOFF_MS", "5000"],
  ["IRIS_YOUTUBE_LIVE_CHAT_MAX_ERROR_BACKOFF_MS", "60000"],
  ["IRIS_ENABLE_HTTP_INGEST_SCHEDULER", "true"],
  ["IRIS_HTTP_INGEST_INTERVAL_MS", "3000"],
  ["IRIS_HTTP_INGEST_LIMIT", "10"],
  ["IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR", "true"],
  ["IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS", ""],
  ["IRIS_YOUTUBE_BLOCKED_TEXT_TERMS", ""],
]);

const VERIFICATION_SCRIPTS = Object.freeze([
  "npm run dev:youtube:local-env-profile",
  "npm run dev:youtube:local-env-apply",
  "npm run dev:youtube:env-setup-plan",
  "npm run dev:youtube:preflight",
  "npm run dev:youtube:relay-bridge",
  "npm run dev:youtube:relay-readiness-rehearsal",
  "npm run dev:youtube:relay-startup-checklist",
  "npm run dev:youtube:source-status",
  "npm run dev:youtube:runtime-status",
  "npm run dev:youtube:live-readiness",
  "npm run dev:youtube:readiness-rehearsal",
  "npm run dev:youtube:ingest-once",
]);

export function createYouTubeIngestLocalEnvProfile({
  generatedAtMs = Date.now(),
} = {}) {
  const templateEnvNames = collectTemplateEnvNames();
  const profile = {
    schema: "iris_youtube_ingest_local_env_profile_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "youtube_comments_and_support",
    target_stage_priority: 2,
    profile_status: "ready_to_render_youtube_ingest_local_env_template",
    env_file_name: ".env.local",
    source_modes: ["youtube_api", "http_relay"],
    env_group_count: YOUTUBE_TEMPLATE_GROUPS.length,
    template_env_name_count: templateEnvNames.length,
    template_env_names: templateEnvNames,
    env_groups: YOUTUBE_TEMPLATE_GROUPS.map((group, index) => ({
      schema: "iris_youtube_ingest_local_env_group_v1",
      sequence_order: index + 1,
      group_id: group.group_id,
      applies_to_source_modes: [...group.applies_to_source_modes],
      required_env_names: [...group.required_env_names],
      required_env_any_of: group.required_env_any_of.map((option) => [...option]),
      optional_env_names: [...group.optional_env_names],
      required_env_count: group.required_env_names.length,
      required_any_of_option_count: group.required_env_any_of.length,
      optional_env_count: group.optional_env_names.length,
      boundary_policy: {
        env_names_only: true,
        source_modes_only: true,
        no_env_values: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_platform_cursor_values: true,
      },
    })),
    startup_scripts: ["npm run dev:youtube:relay-bridge", "npm run dev:server"],
    verification_scripts: [...VERIFICATION_SCRIPTS],
    template_render_script:
      "npm run dev:youtube:local-env-profile -- --print-env",
    operator_notes: [
      "choose_one_source_mode",
      "direct_api_requires_chat_or_video_target",
      "direct_api_requires_one_credential_option",
      "direct_api_requires_cursor_resume_store",
      "relay_requires_local_or_private_target",
      "local_relay_bridge_available",
      "scheduler_required_for_live_polling",
      "support_events_enter_donation_pipeline",
    ],
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      source_modes_only: true,
      operator_labels_only: true,
      no_env_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_platform_cursor_values: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_profile: true,
      print_env_requires_explicit_cli_flag: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeIngestLocalEnvProfileSafe(profile);
  return profile;
}

export function renderYouTubeIngestLocalEnvTemplate({
  includeComments = true,
} = {}) {
  const lines = [];
  if (includeComments) {
    lines.push("# IRIS YouTube ingest local profile");
    lines.push("# Choose direct API or a trusted local/private relay before live polling.");
    lines.push("# Leave secrets blank until you are ready to run against a real channel.");
    lines.push("");
  }
  for (const [name, value] of TEMPLATE_LINES) {
    assertEnvName(name, "YouTube ingest local env template");
    lines.push(`${name}=${value}`);
  }
  return `${lines.join("\n")}\n`;
}

export function assertYouTubeIngestLocalEnvProfileSafe(
  profile,
  context = "YouTube ingest local env profile"
) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new ContractError(`${context}: profile is required`);
  }
  assertNoForbiddenFields(profile, context);
  assertNoUrlStrings(profile, context);
  if (profile.schema !== "iris_youtube_ingest_local_env_profile_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(profile)) {
    if (!YOUTUBE_INGEST_LOCAL_ENV_PROFILE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected profile field`, { field });
    }
  }
  if (!Number.isInteger(profile.generated_at_ms) || profile.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (profile.target_stage_id !== "youtube_comments_and_support") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (profile.target_stage_priority !== 2) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!PROFILE_STATUSES.has(profile.profile_status)) {
    throw new ContractError(`${context}: invalid profile status`);
  }
  if (profile.env_file_name !== ".env.local") {
    throw new ContractError(`${context}: invalid env file name`);
  }
  assertSourceModes(profile.source_modes, `${context}: source modes`);
  assertEnvNameList(profile.template_env_names, `${context}: template env names`);
  const expectedEnvNames = collectTemplateEnvNames();
  if (JSON.stringify(profile.template_env_names) !== JSON.stringify(expectedEnvNames)) {
    throw new ContractError(`${context}: invalid template env names`);
  }
  assertNonNegativeInteger(profile.env_group_count, `${context}: invalid env group count`);
  assertNonNegativeInteger(
    profile.template_env_name_count,
    `${context}: invalid template env count`
  );
  if (profile.env_group_count !== YOUTUBE_TEMPLATE_GROUPS.length) {
    throw new ContractError(`${context}: invalid env group count`);
  }
  if (profile.template_env_name_count !== expectedEnvNames.length) {
    throw new ContractError(`${context}: invalid template env count`);
  }
  assertEnvGroupsSafe(profile.env_groups, context);
  assertScriptList(profile.startup_scripts, `${context}: startup scripts`);
  assertScriptList(profile.verification_scripts, `${context}: verification scripts`);
  assertSafeScriptName(profile.template_render_script, `${context}: template script`);
  assertOperatorNotes(profile.operator_notes, context);
  assertBoundaryPolicy(
    profile.boundary_policy,
    [
      "env_names_only",
      "script_names_only",
      "source_modes_only",
      "operator_labels_only",
      "no_env_values",
      "no_secret_values",
      "no_endpoint_values",
      "no_platform_cursor_values",
      "no_live_payloads",
      "no_support_message_text",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "read_only_profile",
      "print_env_requires_explicit_cli_flag",
    ],
    `${context}: boundary policy`
  );
  if (profile.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function collectTemplateEnvNames() {
  return [...new Set(YOUTUBE_TEMPLATE_GROUPS.flatMap((group) => [
    ...group.required_env_names,
    ...group.required_env_any_of.flat(),
    ...group.optional_env_names,
  ]))];
}

function assertEnvGroupsSafe(groups, context) {
  if (!Array.isArray(groups) || groups.length !== YOUTUBE_TEMPLATE_GROUPS.length) {
    throw new ContractError(`${context}: invalid env groups`);
  }
  groups.forEach((group, index) => {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      throw new ContractError(`${context}: invalid env group`);
    }
    if (group.schema !== "iris_youtube_ingest_local_env_group_v1") {
      throw new ContractError(`${context}: invalid env group schema`);
    }
    if (group.sequence_order !== index + 1) {
      throw new ContractError(`${context}: invalid env group order`);
    }
    if (!GROUP_IDS.has(group.group_id)) {
      throw new ContractError(`${context}: invalid env group id`);
    }
    const definition = YOUTUBE_TEMPLATE_GROUPS[index];
    if (group.group_id !== definition.group_id) {
      throw new ContractError(`${context}: unexpected env group id`);
    }
    assertSourceModes(group.applies_to_source_modes, `${context}: group source modes`);
    assertEnvNameList(group.required_env_names, `${context}: group required env`);
    assertEnvAnyOfList(group.required_env_any_of, `${context}: group any-of env`);
    assertEnvNameList(group.optional_env_names, `${context}: group optional env`);
    if (
      JSON.stringify(group.applies_to_source_modes) !==
        JSON.stringify(definition.applies_to_source_modes) ||
      JSON.stringify(group.required_env_names) !==
        JSON.stringify(definition.required_env_names) ||
      JSON.stringify(group.required_env_any_of) !==
        JSON.stringify(definition.required_env_any_of) ||
      JSON.stringify(group.optional_env_names) !==
        JSON.stringify(definition.optional_env_names)
    ) {
      throw new ContractError(`${context}: invalid env group definition`);
    }
    if (group.required_env_count !== definition.required_env_names.length) {
      throw new ContractError(`${context}: invalid required env count`);
    }
    if (group.required_any_of_option_count !== definition.required_env_any_of.length) {
      throw new ContractError(`${context}: invalid any-of option count`);
    }
    if (group.optional_env_count !== definition.optional_env_names.length) {
      throw new ContractError(`${context}: invalid optional env count`);
    }
    assertBoundaryPolicy(
      group.boundary_policy,
      [
        "env_names_only",
        "source_modes_only",
        "no_env_values",
        "no_endpoint_values",
        "no_secret_values",
        "no_platform_cursor_values",
      ],
      `${context}: env group boundary`
    );
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

function assertSourceModes(modes, context) {
  if (!Array.isArray(modes) || modes.length === 0) {
    throw new ContractError(`${context}: source modes required`);
  }
  for (const mode of modes) {
    if (!SOURCE_MODES.has(mode)) {
      throw new ContractError(`${context}: invalid source mode`);
    }
  }
}

function assertEnvAnyOfList(groups, context) {
  if (!Array.isArray(groups)) {
    throw new ContractError(`${context}: any-of groups must be an array`);
  }
  for (const option of groups) {
    assertEnvNameList(option, `${context}: any-of option`);
    if (option.length === 0) {
      throw new ContractError(`${context}: empty any-of option`);
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
    if (FORBIDDEN_YOUTUBE_LOCAL_ENV_PROFILE_FIELDS.has(field)) {
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
