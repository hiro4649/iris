import { ContractError } from "../../core/contracts.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const ENV_NAME_PATTERN = /^IRIS_[A-Z0-9_]+$/;

const FORBIDDEN_PERSISTENCE_LOCAL_ENV_PROFILE_FIELDS = new Set([
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
const PERSISTENCE_LOCAL_ENV_PROFILE_FIELDS = new Set([
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

const PROFILE_STATUSES = new Set([
  "ready_to_render_persistence_local_env_template",
]);
const GROUP_IDS = new Set([
  "persistence_json_store_files",
  "persistence_candidate_relationship_flags",
  "persistence_vector_memory_search",
]);
const OPERATOR_NOTES = new Set([
  "json_stores_required_for_restart_survival",
  "candidate_and_relationship_flags_required",
  "vector_memory_search_requires_local_or_private_bridge",
  "approved_records_only_enter_long_term_recall",
]);

const TEMPLATE_GROUPS = Object.freeze([
  {
    group_id: "persistence_json_store_files",
    required_env_names: [
      "IRIS_MEMORY_STORE_PATH",
      "IRIS_RELATIONSHIP_STORE_PATH",
    ],
    optional_env_names: [
      "IRIS_ENABLE_PERSISTENCE",
      "IRIS_MEMORY_STORE_MAX_RECORDS",
      "IRIS_MEMORY_STORE_DEDUPE",
      "IRIS_RELATIONSHIP_STORE_MAX_PROFILES",
      "IRIS_RELATIONSHIP_RECENT_SUMMARY_LIMIT",
    ],
  },
  {
    group_id: "persistence_candidate_relationship_flags",
    required_env_names: [
      "IRIS_ENABLE_CANDIDATE_PERSISTENCE",
      "IRIS_ENABLE_RELATIONSHIP_MEMORY",
    ],
    optional_env_names: [],
  },
  {
    group_id: "persistence_vector_memory_search",
    required_env_names: [
      "IRIS_MEMORY_SEARCH_ADAPTER",
      "IRIS_MEMORY_SEARCH_ENDPOINT",
    ],
    optional_env_names: [
      "IRIS_MEMORY_SEARCH_API_KEY",
      "IRIS_MEMORY_SEARCH_TIMEOUT_MS",
    ],
  },
]);

const TEMPLATE_LINES = Object.freeze([
  ["IRIS_MEMORY_STORE_PATH", "data/memory_store.json"],
  ["IRIS_RELATIONSHIP_STORE_PATH", "data/relationship_store.json"],
  ["IRIS_ENABLE_PERSISTENCE", "true"],
  ["IRIS_ENABLE_CANDIDATE_PERSISTENCE", "true"],
  ["IRIS_ENABLE_RELATIONSHIP_MEMORY", "true"],
  ["IRIS_MEMORY_STORE_MAX_RECORDS", "5000"],
  ["IRIS_MEMORY_STORE_DEDUPE", "true"],
  ["IRIS_RELATIONSHIP_STORE_MAX_PROFILES", "5000"],
  ["IRIS_RELATIONSHIP_RECENT_SUMMARY_LIMIT", "5"],
  ["IRIS_MEMORY_SEARCH_ADAPTER", "http_vector"],
  ["IRIS_MEMORY_SEARCH_ENDPOINT", ""],
  ["IRIS_MEMORY_SEARCH_API_KEY", ""],
  ["IRIS_MEMORY_SEARCH_TIMEOUT_MS", "5000"],
]);

const VERIFICATION_SCRIPTS = Object.freeze([
  "npm run dev:persistence:local-env-profile",
  "npm run dev:persistence:local-env-apply",
  "npm run dev:persistence:env-setup-plan",
  "npm run dev:persistence:startup-checklist",
  "npm run dev:persistence:preflight",
  "npm run dev:persistence:runtime-status",
  "npm run dev:persistence:live-readiness",
  "npm run dev:persistence:readiness-rehearsal",
  "npm run dev:persistence:roundtrip",
  "npm run dev:persistence:backup-roundtrip",
  "npm run dev:memory-vector:bridge",
  "npm run dev:memory-vector:roundtrip",
]);

export function createPersistenceLocalEnvProfile({
  generatedAtMs = Date.now(),
} = {}) {
  const templateEnvNames = collectTemplateEnvNames();
  const profile = {
    schema: "iris_persistence_local_env_profile_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "memory_and_relationship_persistence",
    target_stage_priority: 3,
    profile_status: "ready_to_render_persistence_local_env_template",
    env_file_name: ".env.local",
    env_group_count: TEMPLATE_GROUPS.length,
    template_env_name_count: templateEnvNames.length,
    template_env_names: templateEnvNames,
    env_groups: TEMPLATE_GROUPS.map((group, index) => ({
      schema: "iris_persistence_local_env_group_v1",
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
        no_store_paths: true,
        no_endpoint_values: true,
      },
    })),
    verification_scripts: [...VERIFICATION_SCRIPTS],
    template_render_script:
      "npm run dev:persistence:local-env-profile -- --print-env",
    operator_notes: [
      "json_stores_required_for_restart_survival",
      "candidate_and_relationship_flags_required",
      "vector_memory_search_requires_local_or_private_bridge",
      "approved_records_only_enter_long_term_recall",
    ],
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      operator_labels_only: true,
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
      read_only_profile: true,
      print_env_requires_explicit_cli_flag: true,
    },
    adapter_validation_required: true,
  };
  assertPersistenceLocalEnvProfileSafe(profile);
  return profile;
}

export function renderPersistenceLocalEnvTemplate({
  includeComments = true,
} = {}) {
  const lines = [];
  if (includeComments) {
    lines.push("# IRIS persistence local profile");
    lines.push("# Configure JSON stores and a local/private vector-memory bridge before live operation.");
    lines.push("# Do not paste memory records, relationship details, or secrets into this template.");
    lines.push("");
  }
  for (const [name, value] of TEMPLATE_LINES) {
    assertEnvName(name, "persistence local env template");
    lines.push(`${name}=${value}`);
  }
  return `${lines.join("\n")}\n`;
}

export function assertPersistenceLocalEnvProfileSafe(
  profile,
  context = "persistence local env profile"
) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new ContractError(`${context}: profile is required`);
  }
  assertNoForbiddenFields(profile, context);
  assertNoUrlStrings(profile, context);
  if (profile.schema !== "iris_persistence_local_env_profile_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(profile)) {
    if (!PERSISTENCE_LOCAL_ENV_PROFILE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected profile field`, { field });
    }
  }
  if (!Number.isInteger(profile.generated_at_ms) || profile.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (profile.target_stage_id !== "memory_and_relationship_persistence") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (profile.target_stage_priority !== 3) {
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
  assertNonNegativeInteger(profile.env_group_count, `${context}: invalid group count`);
  assertNonNegativeInteger(
    profile.template_env_name_count,
    `${context}: invalid env count`
  );
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
    "no_store_paths",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
    "no_memory_summaries",
    "no_relationship_scores",
    "no_candidates",
    "no_commands",
    "read_only_profile",
    "print_env_requires_explicit_cli_flag",
  ], context);
  if (profile.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function collectTemplateEnvNames() {
  return [...new Set(TEMPLATE_GROUPS.flatMap((group) => [
    ...group.required_env_names,
    ...group.optional_env_names,
  ]))];
}

function assertEnvGroupsSafe(groups, context) {
  if (!Array.isArray(groups) || groups.length !== TEMPLATE_GROUPS.length) {
    throw new ContractError(`${context}: invalid groups`);
  }
  groups.forEach((group, index) => {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      throw new ContractError(`${context}: invalid group`);
    }
    if (group.schema !== "iris_persistence_local_env_group_v1") {
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
      "no_store_paths",
      "no_endpoint_values",
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
    if (FORBIDDEN_PERSISTENCE_LOCAL_ENV_PROFILE_FIELDS.has(field)) {
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
