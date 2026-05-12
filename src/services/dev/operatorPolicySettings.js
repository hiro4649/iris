import { ContractError } from "../../core/contracts.js";

const SCHEMA = "iris_operator_policy_settings_v1";

const FORBIDDEN_FIELDS = new Set([
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
  "approved_memory_record",
  "approved_relationship_record",
  "canonical",
  "canonical_envelope",
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
  "authorization",
  "value",
  "payload",
  "raw_frame",
  "frame",
  "image",
  "ocr_text",
  "candidate",
  "command",
]);

const UNSAFE_TEXT_PATTERN =
  /\b(world_command|input_action|approved_game_input_action|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|raw[_-]?frame|ocr[_-]?text|candidate)\b|https?:\/\//i;

const ENV_NAME_PATTERN = /^IRIS_[A-Z0-9_]+$/;

const POLICY_ITEMS = Object.freeze([
  {
    setting_id: "donation_tier_delta_table",
    setting_group: "relationship_delta",
    admin_control: "tier_table_editor",
    env_names: ["IRIS_RELATIONSHIP_DONATION_TIER_POLICY"],
    default_policy_label: "conservative_bounded_tiers",
    operator_decision_status: "decided_admin_configurable",
  },
  {
    setting_id: "donation_amount_proportional_formula",
    setting_group: "relationship_delta",
    admin_control: "bounded_formula_editor",
    env_names: ["IRIS_RELATIONSHIP_SUPPORT_AMOUNT_FORMULA_POLICY"],
    default_policy_label: "bounded_amount_proportional_growth",
    operator_decision_status: "decided_admin_configurable",
  },
  {
    setting_id: "positive_behavior_delta_table",
    setting_group: "relationship_delta",
    admin_control: "positive_source_table_editor",
    env_names: ["IRIS_RELATIONSHIP_POSITIVE_SOURCE_POLICY"],
    default_policy_label: "healthy_engagement_growth",
    operator_decision_status: "decided_admin_configurable",
  },
  {
    setting_id: "support_event_delta_cap",
    setting_group: "relationship_delta",
    admin_control: "numeric_cap_editor",
    env_names: ["IRIS_RELATIONSHIP_SUPPORT_EVENT_MAX_DELTA"],
    default_policy_label: "bounded_single_event_cap",
    operator_decision_status: "decided_admin_configurable",
  },
  {
    setting_id: "support_stream_window_delta_cap",
    setting_group: "relationship_delta",
    admin_control: "window_cap_editor",
    env_names: [
      "IRIS_RELATIONSHIP_SUPPORT_STREAM_MAX_DELTA",
      "IRIS_RELATIONSHIP_SUPPORT_DAY_MAX_DELTA",
      "IRIS_RELATIONSHIP_SUPPORT_WINDOW_MAX_DELTA",
    ],
    default_policy_label: "bounded_stream_day_window_caps",
    operator_decision_status: "decided_admin_configurable",
  },
  {
    setting_id: "negative_behavior_delta_table",
    setting_group: "relationship_delta",
    admin_control: "negative_source_table_editor",
    env_names: ["IRIS_RELATIONSHIP_NEGATIVE_SOURCE_POLICY"],
    default_policy_label: "safety_distance_first",
    operator_decision_status: "decided_admin_configurable",
  },
  {
    setting_id: "memory_retention_classes",
    setting_group: "memory_retention",
    admin_control: "retention_class_editor",
    env_names: ["IRIS_MEMORY_RETENTION_POLICY"],
    default_policy_label: "important_memories_indefinite",
    operator_decision_status: "decided_admin_configurable",
  },
  {
    setting_id: "memory_archive_and_summarize_windows",
    setting_group: "memory_retention",
    admin_control: "archive_summarize_window_editor",
    env_names: [
      "IRIS_MEMORY_ARCHIVE_AFTER_POLICY",
      "IRIS_MEMORY_SUMMARIZE_AFTER_POLICY",
    ],
    default_policy_label: "archive_instead_of_delete",
    operator_decision_status: "operator_tuning_pending",
  },
  {
    setting_id: "initial_skilled_game_targets",
    setting_group: "gameplay_skill",
    admin_control: "game_skill_profile_selector",
    env_names: ["IRIS_SKILLED_GAME_TARGETS"],
    default_policy_label: "minecraft_vrchat",
    operator_decision_status: "decided_minecraft_vrchat",
  },
  {
    setting_id: "game_control_mode",
    setting_group: "gameplay_control",
    admin_control: "mode_selector_with_confirmation",
    env_names: ["IRIS_GAME_CONTROL_MODE"],
    default_policy_label: "manual_approval",
    operator_decision_status: "decided_manual_approval_default",
  },
  {
    setting_id: "approved_safe_adapter_confirmation_gate",
    setting_group: "gameplay_control",
    admin_control: "owner_confirmation_gate",
    env_names: ["IRIS_GAME_CONTROL_APPROVED_SAFE_ADAPTER_CONFIRMATION"],
    default_policy_label: "confirmation_required",
    operator_decision_status: "decided_required",
  },
]);

export function createOperatorPolicySettingsReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const settings = POLICY_ITEMS.map((item, index) => {
    const configuredEnv = item.env_names.filter((name) => hasConfiguredEnv(env, name));
    return {
      schema: "iris_operator_policy_setting_v1",
      sequence_order: index + 1,
      setting_id: item.setting_id,
      setting_group: item.setting_group,
      admin_control: item.admin_control,
      env_names: [...item.env_names],
      env_name_count: item.env_names.length,
      configured_env_names: configuredEnv,
      configured_env_count: configuredEnv.length,
      missing_env_names: item.env_names.filter((name) => !configuredEnv.includes(name)),
      default_policy_label: item.default_policy_label,
      operator_decision_status: item.operator_decision_status,
      exposes_policy_values_in_public_report: false,
      requires_validator_boundary: requiresValidatorBoundary(item.setting_group),
      requires_owner_confirmation:
        item.setting_id === "game_control_mode" ||
        item.setting_id === "approved_safe_adapter_confirmation_gate",
    };
  });
  const configuredSettingCount = settings.filter(
    (setting) => setting.configured_env_count > 0
  ).length;
  const missingSettingCount = settings.length - configuredSettingCount;
  const report = {
    schema: SCHEMA,
    generated_at_ms: generatedAtMs,
    report_status:
      missingSettingCount === 0
        ? "ready_for_admin_policy_review"
        : "configuration_attention",
    setting_count: settings.length,
    configured_setting_count: configuredSettingCount,
    missing_setting_count: missingSettingCount,
    admin_policy_groups: [
      "relationship_delta",
      "memory_retention",
      "gameplay_skill",
      "gameplay_control",
    ],
    resolved_operator_decisions: {
      schema: "iris_operator_policy_resolved_decisions_v1",
      donation_tier_deltas_admin_configurable: true,
      support_event_cap_admin_configurable: true,
      support_window_caps_admin_configurable: true,
      important_memories_retained_indefinitely_by_default: true,
      first_skilled_game_targets: ["minecraft", "vrchat"],
      default_game_control_mode: "manual_approval",
      available_game_control_modes: [
        "commentary_only",
        "manual_approval",
        "approved_safe_adapter",
      ],
      game_control_mode_admin_configurable: true,
      approved_safe_adapter_requires_owner_confirmation: true,
    },
    settings,
    boundary_policy: {
      read_only_report: true,
      env_names_only: true,
      fixed_policy_labels_only: true,
      no_policy_numeric_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_raw_viewer_messages: true,
      no_support_message_text: true,
      no_hidden_relationship_scores: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_real_device_operation: true,
      no_game_or_os_input: true,
    },
  };
  assertOperatorPolicySettingsReportSafe(report);
  return report;
}

export function assertOperatorPolicySettingsReportSafe(
  report,
  context = "operator policy settings report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report must be an object`);
  }
  if (report.schema !== SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (
    report.report_status !== "configuration_attention" &&
    report.report_status !== "ready_for_admin_policy_review"
  ) {
    throw new ContractError(`${context}: invalid report status`);
  }
  assertSafeObject(report, context);
  assertNoUnsafeText(report, context);
  assertBoundaryPolicy(report.boundary_policy, [
    "read_only_report",
    "env_names_only",
    "fixed_policy_labels_only",
    "no_policy_numeric_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_raw_viewer_messages",
    "no_support_message_text",
    "no_hidden_relationship_scores",
    "no_candidates",
    "no_commands",
    "no_raw_frames",
    "no_real_device_operation",
    "no_game_or_os_input",
  ], context);
  if (!Array.isArray(report.settings) || report.settings.length !== report.setting_count) {
    throw new ContractError(`${context}: invalid setting count`);
  }
  for (const setting of report.settings) {
    assertSettingSafe(setting, context);
  }
  if (
    report.resolved_operator_decisions?.default_game_control_mode !==
    "manual_approval"
  ) {
    throw new ContractError(`${context}: manual approval must remain default`);
  }
  if (
    !sameStringSet(report.resolved_operator_decisions?.first_skilled_game_targets, [
      "minecraft",
      "vrchat",
    ])
  ) {
    throw new ContractError(`${context}: invalid skilled game targets`);
  }
  if (
    !sameStringSet(report.resolved_operator_decisions?.available_game_control_modes, [
      "commentary_only",
      "manual_approval",
      "approved_safe_adapter",
    ])
  ) {
    throw new ContractError(`${context}: invalid game control modes`);
  }
}

function assertSettingSafe(setting, context) {
  if (setting.schema !== "iris_operator_policy_setting_v1") {
    throw new ContractError(`${context}: invalid setting schema`);
  }
  for (const listName of ["env_names", "configured_env_names", "missing_env_names"]) {
    if (!Array.isArray(setting[listName])) {
      throw new ContractError(`${context}: ${setting.setting_id} invalid ${listName}`);
    }
    for (const name of setting[listName]) {
      if (!ENV_NAME_PATTERN.test(name)) {
        throw new ContractError(`${context}: unsafe env name`);
      }
    }
  }
  if (setting.exposes_policy_values_in_public_report !== false) {
    throw new ContractError(`${context}: policy values must not be public`);
  }
}

function hasConfiguredEnv(env, name) {
  return String(env?.[name] ?? "").trim().length > 0;
}

function requiresValidatorBoundary(group) {
  return group === "relationship_delta" || group === "gameplay_control";
}

function sameStringSet(value, expected) {
  if (!Array.isArray(value) || value.length !== expected.length) return false;
  return expected.every((item) => value.includes(item));
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy ${field} must be true`);
    }
  }
}

function assertSafeObject(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertSafeObject(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(key)) {
      throw new ContractError(`${context}: forbidden field ${path}.${key}`);
    }
    assertSafeObject(child, context, `${path}.${key}`);
  }
}

function assertNoUnsafeText(value, context, path = "root") {
  if (typeof value === "string") {
    if (UNSAFE_TEXT_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe text at ${path}`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeText(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertNoUnsafeText(child, context, `${path}.${key}`);
  }
}
