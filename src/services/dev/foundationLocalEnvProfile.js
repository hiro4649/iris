import { ContractError } from "../../core/contracts.js";
import { ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES } from "./adminCharacterVoiceSettings.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const ENV_NAME_PATTERN = /^IRIS_[A-Z0-9_]+$/;

const FORBIDDEN_FOUNDATION_LOCAL_ENV_PROFILE_FIELDS = new Set([
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
const FOUNDATION_LOCAL_ENV_PROFILE_FIELDS = new Set([
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
  "local_route_summary",
  "startup_scripts",
  "verification_scripts",
  "template_render_script",
  "operator_notes",
  "boundary_policy",
  "adapter_validation_required",
]);

const PROFILE_STATUSES = new Set(["ready_to_render_local_env_template"]);
const GROUP_IDS = new Set([
  "runtime_http_adapters",
  "local_bridge_storage",
  "real_tts_engine",
  "real_live2d_engine",
  "iris_dev_server",
  "obs_overlay",
]);
const ROUTE_IDS = new Set([
  "runtime_tts",
  "runtime_live2d",
  "runtime_subtitle",
  "local_bridge_health",
  "local_tts_engine",
  "local_tts_engine_health",
  "local_live2d_engine",
  "local_live2d_engine_health",
  "overlay",
  "obs_browser_source_config",
]);
const STARTUP_SCRIPTS = Object.freeze([
  "npm run dev:voicevox:bridge",
  "npm run dev:live2d:bridge",
  "npm run dev:bridge",
  "npm run dev:bridge:worker -- --watch",
  "npm run dev:server",
  "npm run dev:obs:browser-source",
]);
const VERIFICATION_SCRIPTS = Object.freeze([
  "npm run dev:foundation:local-env-profile",
  "npm run dev:foundation:env-setup-plan",
  "npm run dev:foundation:preflight",
  "npm run dev:foundation:runtime-status",
  "npm run dev:foundation:live-readiness",
  "npm run dev:engine:probe",
  "npm run dev:obs:runtime-render-roundtrip",
  "npm run dev:production:next-task",
]);

const TEMPLATE_GROUPS = Object.freeze([
  {
    group_id: "runtime_http_adapters",
    required_env_names: [
      "IRIS_TTS_ADAPTER",
      "IRIS_TTS_ENDPOINT",
      "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT",
      "IRIS_LIVE2D_ADAPTER",
      "IRIS_LIVE2D_ENDPOINT",
      "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT",
      "IRIS_SUBTITLE_ADAPTER",
      "IRIS_SUBTITLE_ENDPOINT",
      "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT",
    ],
    optional_env_names: [
      "IRIS_TTS_TIMEOUT_MS",
      "IRIS_LIVE2D_TIMEOUT_MS",
      "IRIS_SUBTITLE_TIMEOUT_MS",
    ],
  },
  {
    group_id: "local_bridge_storage",
    required_env_names: [
      "IRIS_LOCAL_BRIDGE_HOST",
      "IRIS_LOCAL_BRIDGE_PORT",
      "IRIS_LOCAL_BRIDGE_OUTBOX_DIR",
      "IRIS_LOCAL_BRIDGE_ARTIFACT_DIR",
      "IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS",
      "IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS",
    ],
    optional_env_names: [
      "IRIS_LOCAL_BRIDGE_WORKER_WATCH",
      "IRIS_LOCAL_BRIDGE_WORKER_INTERVAL_MS",
      "IRIS_LOCAL_BRIDGE_WORKER_LIMIT_PER_KIND",
      "IRIS_LOCAL_BRIDGE_WORKER_CONTINUE_ON_ERROR",
    ],
  },
  {
    group_id: "real_tts_engine",
    required_env_names: [
      "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
      "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
      "IRIS_LOCAL_TTS_ENGINE_LOCALE",
      "IRIS_VOICEVOX_BRIDGE_HOST",
      "IRIS_VOICEVOX_BRIDGE_PORT",
      "IRIS_VOICEVOX_ENDPOINT",
      "IRIS_VOICEVOX_SPEAKER_ID",
      "IRIS_VOICEVOX_TIMEOUT_MS",
    ],
    optional_env_names: [
      "IRIS_LOCAL_TTS_ENGINE_VOICE_ID",
      "IRIS_LOCAL_TTS_ENGINE_MODEL",
      "IRIS_CHARACTER_VOICE_PROFILE_ID",
      "IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID",
      "IRIS_LICENSED_VOICE_SOURCE_STATUS",
      ...ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES,
    ],
  },
  {
    group_id: "real_live2d_engine",
    required_env_names: [
      "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
      "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
      "IRIS_LIVE2D_CUE_BRIDGE_HOST",
      "IRIS_LIVE2D_CUE_BRIDGE_PORT",
    ],
    optional_env_names: [
      "IRIS_LOCAL_LIVE2D_MODEL_ID",
      "IRIS_LOCAL_LIVE2D_SCENE_ID",
      "IRIS_LIVE2D_RENDERER_ENDPOINT",
      "IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT",
      "IRIS_LIVE2D_CUE_BRIDGE_TIMEOUT_MS",
    ],
  },
  {
    group_id: "iris_dev_server",
    required_env_names: [
      "IRIS_HTTP_HOST",
      "IRIS_HTTP_PORT",
      "IRIS_HTTP_ORIGIN",
      "IRIS_ENABLE_IDLE_SCHEDULER",
      "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
    ],
    optional_env_names: [],
  },
  {
    group_id: "obs_overlay",
    required_env_names: [
      "IRIS_OBS_SOURCE_NAME",
      "IRIS_OBS_SOURCE_WIDTH",
      "IRIS_OBS_SOURCE_HEIGHT",
      "IRIS_OBS_SOURCE_FPS",
    ],
    optional_env_names: [
      "IRIS_OBS_SCENE_NAME",
      "IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE",
      "IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE",
    ],
  },
]);

const LOCAL_ROUTE_SUMMARY = Object.freeze([
  { route_id: "runtime_tts", route_path: "/tts" },
  { route_id: "runtime_live2d", route_path: "/live2d" },
  { route_id: "runtime_subtitle", route_path: "/subtitle" },
  { route_id: "local_bridge_health", route_path: "/health" },
  { route_id: "local_tts_engine", route_path: "/tts-engine" },
  { route_id: "local_tts_engine_health", route_path: "/health" },
  { route_id: "local_live2d_engine", route_path: "/live2d-engine" },
  { route_id: "local_live2d_engine_health", route_path: "/health" },
  { route_id: "overlay", route_path: "/overlay" },
  { route_id: "obs_browser_source_config", route_path: "/obs/browser-source" },
]);

const TEMPLATE_LINES = Object.freeze([
  ["IRIS_TTS_ADAPTER", "http"],
  ["IRIS_TTS_ENDPOINT", "http://127.0.0.1:8790/tts"],
  ["IRIS_LOCAL_TTS_BRIDGE_ENDPOINT", "http://127.0.0.1:8790/tts"],
  ["IRIS_TTS_TIMEOUT_MS", "4500"],
  ["IRIS_LIVE2D_ADAPTER", "http"],
  ["IRIS_LIVE2D_ENDPOINT", "http://127.0.0.1:8790/live2d"],
  ["IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT", "http://127.0.0.1:8790/live2d"],
  ["IRIS_LIVE2D_TIMEOUT_MS", "4500"],
  ["IRIS_SUBTITLE_ADAPTER", "http"],
  ["IRIS_SUBTITLE_ENDPOINT", "http://127.0.0.1:8790/subtitle"],
  ["IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT", "http://127.0.0.1:8790/subtitle"],
  ["IRIS_SUBTITLE_TIMEOUT_MS", "4500"],
  ["IRIS_LOCAL_BRIDGE_HOST", "127.0.0.1"],
  ["IRIS_LOCAL_BRIDGE_PORT", "8790"],
  ["IRIS_LOCAL_BRIDGE_OUTBOX_DIR", "data/local_bridge_outbox"],
  ["IRIS_LOCAL_BRIDGE_ARTIFACT_DIR", "data/local_bridge_artifacts"],
  ["IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS", "60000"],
  ["IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS", "1500"],
  ["IRIS_LOCAL_BRIDGE_WORKER_WATCH", "true"],
  ["IRIS_LOCAL_BRIDGE_WORKER_INTERVAL_MS", "500"],
  ["IRIS_LOCAL_BRIDGE_WORKER_LIMIT_PER_KIND", "3"],
  ["IRIS_LOCAL_BRIDGE_WORKER_CONTINUE_ON_ERROR", "true"],
  ["IRIS_LOCAL_TTS_ENGINE_ENDPOINT", "http://127.0.0.1:9110/tts-engine"],
  ["IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT", "http://127.0.0.1:9110/health"],
  ["IRIS_LOCAL_TTS_ENGINE_LOCALE", "ja-JP"],
  ["IRIS_LOCAL_TTS_ENGINE_VOICE_ID", ""],
  ["IRIS_LOCAL_TTS_ENGINE_MODEL", ""],
  ["IRIS_CHARACTER_VOICE_PROFILE_ID", ""],
  ["IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID", ""],
  ["IRIS_LICENSED_VOICE_SOURCE_STATUS", ""],
  ...ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES.map((envName) => [
    envName,
    "",
  ]),
  ["IRIS_VOICEVOX_BRIDGE_HOST", "127.0.0.1"],
  ["IRIS_VOICEVOX_BRIDGE_PORT", "9110"],
  ["IRIS_VOICEVOX_ENDPOINT", "http://127.0.0.1:50021"],
  ["IRIS_VOICEVOX_SPEAKER_ID", "3"],
  ["IRIS_VOICEVOX_TIMEOUT_MS", "10000"],
  ["IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT", "http://127.0.0.1:9112/live2d-engine"],
  ["IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT", "http://127.0.0.1:9112/health"],
  ["IRIS_LIVE2D_CUE_BRIDGE_HOST", "127.0.0.1"],
  ["IRIS_LIVE2D_CUE_BRIDGE_PORT", "9112"],
  ["IRIS_LOCAL_LIVE2D_MODEL_ID", ""],
  ["IRIS_LOCAL_LIVE2D_SCENE_ID", ""],
  ["IRIS_LIVE2D_RENDERER_ENDPOINT", ""],
  ["IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT", ""],
  ["IRIS_LIVE2D_CUE_BRIDGE_TIMEOUT_MS", "10000"],
  ["IRIS_HTTP_HOST", "127.0.0.1"],
  ["IRIS_HTTP_PORT", "8787"],
  ["IRIS_HTTP_ORIGIN", "http://127.0.0.1:8787"],
  ["IRIS_OBS_SOURCE_NAME", "IRIS Overlay"],
  ["IRIS_OBS_SOURCE_WIDTH", "1280"],
  ["IRIS_OBS_SOURCE_HEIGHT", "720"],
  ["IRIS_OBS_SOURCE_FPS", "30"],
  ["IRIS_OBS_SCENE_NAME", ""],
  ["IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE", ""],
  ["IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE", ""],
  ["IRIS_ENABLE_IDLE_SCHEDULER", "true"],
  ["IRIS_ENABLE_HTTP_INGEST_SCHEDULER", "false"],
]);

export function createFoundationLocalEnvProfile({ generatedAtMs = Date.now() } = {}) {
  const templateEnvNames = collectTemplateEnvNames();
  const profile = {
    schema: "iris_foundation_local_env_profile_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "tts_live2d_obs_foundation",
    target_stage_priority: 1,
    profile_status: "ready_to_render_local_env_template",
    env_file_name: ".env.local",
    env_group_count: TEMPLATE_GROUPS.length,
    template_env_name_count: templateEnvNames.length,
    template_env_names: templateEnvNames,
    env_groups: TEMPLATE_GROUPS.map((group, index) => ({
      schema: "iris_foundation_local_env_group_v1",
      sequence_order: index + 1,
      group_id: group.group_id,
      required_env_names: [...group.required_env_names],
      optional_env_names: [...group.optional_env_names],
      required_env_count: group.required_env_names.length,
      optional_env_count: group.optional_env_names.length,
      boundary_policy: {
        env_names_only: true,
        no_env_values: true,
        no_endpoint_values: true,
        no_secret_values: true,
      },
    })),
    local_route_summary: LOCAL_ROUTE_SUMMARY.map((route) => ({ ...route })),
    startup_scripts: [...STARTUP_SCRIPTS],
    verification_scripts: [...VERIFICATION_SCRIPTS],
    template_render_script:
      "npm run dev:foundation:local-env-profile -- --print-env",
    operator_notes: [
      "render_template_to_local_env_file",
      "start_voicevox_before_voicevox_bridge",
      "start_live2d_renderer_before_live2d_bridge_when_renderer_is_used",
      "start_local_bridge_before_runtime_server",
      "start_worker_watch_before_obs_runtime_check",
      "obs_browser_source_can_be_manual",
    ],
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      route_paths_only: true,
      operator_labels_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_profile: true,
      print_env_requires_explicit_cli_flag: true,
    },
    adapter_validation_required: true,
  };
  assertFoundationLocalEnvProfileSafe(profile);
  return profile;
}

export function renderFoundationLocalEnvTemplate({ includeComments = true } = {}) {
  const lines = [];
  if (includeComments) {
    lines.push("# IRIS local foundation profile");
    lines.push("# Generated for local TTS, Live2D cue, local bridge, dev server, and OBS Browser Source wiring.");
    lines.push("# Review paths and ports for your machine before running live.");
    lines.push("");
  }
  for (const [name, value] of TEMPLATE_LINES) {
    assertEnvName(name, "foundation local env template");
    lines.push(`${name}=${value}`);
  }
  return `${lines.join("\n")}\n`;
}

export function assertFoundationLocalEnvProfileSafe(
  profile,
  context = "foundation local env profile"
) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new ContractError(`${context}: profile is required`);
  }
  assertNoForbiddenFields(profile, context);
  assertNoUrlStrings(profile, context);
  if (profile.schema !== "iris_foundation_local_env_profile_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(profile)) {
    if (!FOUNDATION_LOCAL_ENV_PROFILE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected profile field`, { field });
    }
  }
  if (!Number.isInteger(profile.generated_at_ms) || profile.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (profile.target_stage_id !== "tts_live2d_obs_foundation") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (profile.target_stage_priority !== 1) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!PROFILE_STATUSES.has(profile.profile_status)) {
    throw new ContractError(`${context}: invalid profile status`);
  }
  if (profile.env_file_name !== ".env.local") {
    throw new ContractError(`${context}: invalid env file name`);
  }
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
  if (profile.env_group_count !== TEMPLATE_GROUPS.length) {
    throw new ContractError(`${context}: invalid env group count`);
  }
  if (profile.template_env_name_count !== expectedEnvNames.length) {
    throw new ContractError(`${context}: invalid template env name count`);
  }
  assertGroupListSafe(profile.env_groups, context);
  assertRouteSummarySafe(profile.local_route_summary, context);
  assertScriptListSafe(profile.startup_scripts, `${context}: startup scripts`);
  assertScriptListSafe(profile.verification_scripts, `${context}: verification scripts`);
  assertSafeScriptName(profile.template_render_script, `${context}: render script`);
  assertOperatorNotesSafe(profile.operator_notes, context);
  assertBoundaryPolicy(
    profile.boundary_policy,
    [
      "env_names_only",
      "script_names_only",
      "route_paths_only",
      "operator_labels_only",
      "no_secret_values",
      "no_endpoint_values",
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
  return [
    ...new Set(
      TEMPLATE_GROUPS.flatMap((group) => [
        ...group.required_env_names,
        ...group.optional_env_names,
      ])
    ),
  ];
}

function assertGroupListSafe(groups, context) {
  if (!Array.isArray(groups) || groups.length !== TEMPLATE_GROUPS.length) {
    throw new ContractError(`${context}: invalid env groups`);
  }
  groups.forEach((group, index) => {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      throw new ContractError(`${context}: invalid env group`);
    }
    if (group.schema !== "iris_foundation_local_env_group_v1") {
      throw new ContractError(`${context}: invalid env group schema`);
    }
    if (group.sequence_order !== index + 1) {
      throw new ContractError(`${context}: invalid env group order`);
    }
    if (!GROUP_IDS.has(group.group_id)) {
      throw new ContractError(`${context}: invalid group id`);
    }
    const definition = TEMPLATE_GROUPS[index];
    if (group.group_id !== definition.group_id) {
      throw new ContractError(`${context}: unexpected group id`);
    }
    assertEnvNameList(group.required_env_names, `${context}: group required env`);
    assertEnvNameList(group.optional_env_names, `${context}: group optional env`);
    if (
      JSON.stringify(group.required_env_names) !==
        JSON.stringify(definition.required_env_names) ||
      JSON.stringify(group.optional_env_names) !==
        JSON.stringify(definition.optional_env_names)
    ) {
      throw new ContractError(`${context}: invalid group env list`);
    }
    if (group.required_env_count !== definition.required_env_names.length) {
      throw new ContractError(`${context}: invalid group required env count`);
    }
    if (group.optional_env_count !== definition.optional_env_names.length) {
      throw new ContractError(`${context}: invalid group optional env count`);
    }
    assertBoundaryPolicy(
      group.boundary_policy,
      [
        "env_names_only",
        "no_env_values",
        "no_endpoint_values",
        "no_secret_values",
      ],
      `${context}: group boundary policy`
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

function assertRouteSummarySafe(routes, context) {
  if (!Array.isArray(routes) || routes.length !== LOCAL_ROUTE_SUMMARY.length) {
    throw new ContractError(`${context}: invalid route summary`);
  }
  routes.forEach((route, index) => {
    if (!route || typeof route !== "object" || Array.isArray(route)) {
      throw new ContractError(`${context}: invalid route`);
    }
    if (!ROUTE_IDS.has(route.route_id) || route.route_id !== LOCAL_ROUTE_SUMMARY[index].route_id) {
      throw new ContractError(`${context}: invalid route id`);
    }
    if (
      typeof route.route_path !== "string" ||
      route.route_path !== LOCAL_ROUTE_SUMMARY[index].route_path ||
      !/^\/[a-z0-9_/-]+$/.test(route.route_path)
    ) {
      throw new ContractError(`${context}: invalid route path`);
    }
  });
}

function assertOperatorNotesSafe(notes, context) {
  if (!Array.isArray(notes) || notes.length === 0) {
    throw new ContractError(`${context}: operator notes are required`);
  }
  for (const note of notes) {
    if (typeof note !== "string" || !/^[a-z0-9_]+$/.test(note)) {
      throw new ContractError(`${context}: invalid operator note`);
    }
  }
}

function assertScriptListSafe(scripts, context) {
  if (!Array.isArray(scripts) || scripts.length === 0) {
    throw new ContractError(`${context}: script list is required`);
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

function assertEnvNameList(value, context) {
  if (!Array.isArray(value)) {
    throw new ContractError(`${context}: env list must be an array`);
  }
  for (const item of value) assertEnvName(item, context);
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
    value.forEach((item, index) => assertNoForbiddenFields(item, context, `${fieldPath}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FOUNDATION_LOCAL_ENV_PROFILE_FIELDS.has(field)) {
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
