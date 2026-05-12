import { ContractError } from "../../core/contracts.js";
import { ANIME_PERFORMANCE_IDENTITY_SURFACE_ENV_GROUPS } from "./adminCharacterVoiceSettings.js";
import { createIntegrationStatus } from "./integrationStatus.js";

const URL_PATTERN = /https?:\/\/|postgres:\/\/|postgresql:\/\//i;
const UNSAFE_ADMIN_INTEGRATION_CHECKLIST_REPORT_FRAGMENTS = [
  '"event_id"',
  '"trace_id"',
  '"subtitle_text"',
  '"input_action_candidate"',
  '"approved_game_input_action"',
];
const SAFE_SCRIPT_PATTERN =
  /^(npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?|npm test|npm run smoke)$/i;
const CHECK_STATUSES = new Set([
  "ready",
  "not_configured",
  "operator_attention_required",
  "real_credential_waiting",
  "real_device_waiting",
  "disabled_by_safety_policy",
  "blocked",
]);
const INTEGRATION_IDS = new Set([
  "response_provider",
  "tts_bridge",
  "live2d_bridge",
  "subtitle_bridge",
  "obs_bridge",
  "local_bridge_engine_worker",
  "game_control_bridge",
  "youtube_live_chat_source",
  "game_observation_bridge",
  "media_watch_bridge",
  "external_topic_bridge",
  "memory_search",
  "relationship_memory",
  "candidate_persistence",
  "replay_log",
  "anime_performance_reference",
  "anime_expression_motion_match",
  "anime_voice_speech_match",
  "anime_canon_bible_policy",
  "anime_spoiler_release_policy",
  "anime_non_canon_label_policy",
  "anime_ip_owner_approval_policy",
  "anime_canon_layer_policy",
  "anime_stream_mode_policy",
  "anime_release_mode_schedule",
  "anime_character_communication_mode_policy",
  "anime_voice_license_use_categories",
  "growth_fan_community_policy",
  "growth_trust_content_policy",
  "growth_monetization_cost_policy",
  "growth_operator_analytics_policy",
]);
const ADMIN_INTEGRATION_CHECKLIST_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "checklist_status",
  "check_count",
  "ready_check_count",
  "attention_check_count",
  "blocked_check_count",
  "not_configured_check_count",
  "disabled_check_count",
  "next_check_id",
  "next_operator_action_id",
  "next_safe_script",
  "checks",
  "status_summary",
  "boundary_policy",
]);
const ADMIN_INTEGRATION_CHECKLIST_ITEM_FIELDS = new Set([
  "schema",
  "integration_id",
  "title",
  "group",
  "check_status",
  "source_status",
  "mode_label",
  "configured_env_count",
  "missing_env_count",
  "auth_configured",
  "local_endpoint_policy_status",
  "local_endpoint_scope_summary",
  "next_operator_action_id",
  "next_safe_script",
  "safe_script_catalog",
  "safe_script_catalog_count",
  "boundary_policy",
]);
const ADMIN_INTEGRATION_STATUS_SUMMARY_FIELDS = new Set([
  "schema",
  "integration_total",
  "configured_count",
  "local_count",
  "disabled_count",
  "missing_configuration_count",
  "local_endpoint_policy_applicable_count",
  "local_endpoint_policy_all_allowed_count",
  "local_endpoint_policy_not_configured_count",
  "local_endpoint_policy_blocked_count",
  "anime_identity_surface_count",
  "anime_identity_ready_surface_count",
  "anime_identity_missing_surface_count",
]);
const ANIME_IDENTITY_SURFACE_CHECK_GROUPS = Object.freeze([
  Object.freeze(["anime_performance_reference"]),
  Object.freeze(["anime_expression_motion_match"]),
  Object.freeze(["anime_voice_speech_match"]),
  Object.freeze([
    "anime_canon_bible_policy",
    "anime_spoiler_release_policy",
    "anime_non_canon_label_policy",
    "anime_ip_owner_approval_policy",
    "anime_canon_layer_policy",
    "anime_stream_mode_policy",
    "anime_release_mode_schedule",
    "anime_character_communication_mode_policy",
  ]),
  Object.freeze(["anime_voice_license_use_categories"]),
]);
const ANIME_REFERENCE_PROFILE_ENV_NAMES = envNamesForAnimeSurface(
  "anime_reference_profile"
);
const ANIME_EXPRESSION_MOTION_ENV_NAMES = envNamesForAnimeSurface(
  "expression_motion_match"
);
const ANIME_VOICE_SPEECH_ENV_NAMES = envNamesForAnimeSurface(
  "voice_speech_match"
);
const ANIME_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES = envNamesForAnimeSurface(
  "voice_license_use_categories"
);
const ADMIN_INTEGRATION_CHECKLIST_BOUNDARY_FIELDS = [
  "read_only_admin_checklist",
  "env_names_and_counts_only",
  "script_names_only",
  "fixed_status_labels_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_connection_values",
  "no_live_payloads",
  "no_viewer_messages",
  "no_support_message_text",
  "no_memory_records",
  "no_relationship_records",
  "no_hidden_relationship_scores",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
  "no_raw_voice_samples",
  "no_dataset_paths",
  "no_internal_model_paths",
  "no_raw_jobs",
  "no_real_process_started",
  "no_database_connection_attempted",
  "no_game_or_os_input",
];
const ADMIN_INTEGRATION_CHECKLIST_ITEM_BOUNDARY_FIELDS = [
  "counts_and_fixed_statuses_only",
  "env_names_only",
  "no_env_values",
  "no_endpoint_values",
  "no_secret_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
];
const CHECK_METADATA = {
  response_provider: {
    title: "Response Provider",
    group: "core_runtime",
    script: "npm run dev:config:doctor",
  },
  tts_bridge: {
    title: "TTS Adapter",
    group: "voice_and_motion",
    script: "npm run dev:engine:probe",
  },
  live2d_bridge: {
    title: "Live2D Adapter",
    group: "voice_and_motion",
    script: "npm run dev:live2d:roundtrip",
  },
  subtitle_bridge: {
    title: "Subtitle Adapter",
    group: "voice_and_motion",
    script: "npm run dev:bridge:roundtrip",
  },
  obs_bridge: {
    title: "OBS Setup Bridge",
    group: "obs_overlay",
    script: "npm run dev:obs:probe",
  },
  local_bridge_engine_worker: {
    title: "Local Bridge Worker",
    group: "obs_overlay",
    script: "npm run dev:bridge:status-roundtrip",
  },
  game_control_bridge: {
    title: "Game Control Adapter",
    group: "gameplay",
    script: "npm run dev:game-control:roundtrip",
  },
  youtube_live_chat_source: {
    title: "YouTube Live Chat",
    group: "youtube_and_support",
    script: "npm run dev:youtube:source-status",
    scripts: [
      "npm run dev:youtube:source-status",
      "npm run dev:youtube:direct-live-chat-roundtrip",
      "npm run dev:youtube:http-ingest-roundtrip",
      "npm run dev:youtube:runtime-ingest-roundtrip",
      "npm run dev:youtube:cursor-roundtrip",
      "npm run dev:youtube:cursor-backup-roundtrip",
    ],
  },
  game_observation_bridge: {
    title: "Game Observation",
    group: "gameplay",
    script: "npm run dev:gameplay:runtime-status",
  },
  media_watch_bridge: {
    title: "Media Watch",
    group: "youtube_and_support",
    script: "npm run dev:ingest:http",
  },
  external_topic_bridge: {
    title: "External Topic",
    group: "youtube_and_support",
    script: "npm run dev:ingest:http",
  },
  memory_search: {
    title: "Memory Search",
    group: "memory_and_relationship",
    script: "npm run dev:memory-vector:roundtrip",
    scripts: [
      "npm run dev:memory-vector:bridge",
      "npm run dev:memory-vector:roundtrip",
      "npm run dev:persistence:live-readiness",
    ],
  },
  relationship_memory: {
    title: "Relationship Memory",
    group: "memory_and_relationship",
    script: "npm run dev:persistence:status-roundtrip",
  },
  candidate_persistence: {
    title: "Candidate Persistence",
    group: "memory_and_relationship",
    script: "npm run dev:persistence:candidate-gate-roundtrip",
  },
  replay_log: {
    title: "Replay Log",
    group: "diagnostics",
    script: "npm run smoke",
  },
};

export function createAdminIntegrationChecklist({
  env = process.env,
  idleScheduler = null,
  httpIngestScheduler = null,
  overlayEventBus = null,
  generatedAtMs = Date.now(),
} = {}) {
  const integrationStatus = createIntegrationStatus({
    env,
    idleScheduler,
    httpIngestScheduler,
    overlayEventBus,
    generatedAtMs,
  });
  const checks = [
    ...integrationStatus.integrations.map((item) => createChecklistItem(item)),
    ...createAnimePerformanceChecklistItems(env),
    ...createAnimeIpGovernanceChecklistItems(env),
    ...createGrowthBusinessChecklistItems(env),
  ];
  const firstAttention =
    checks.find((check) => check.check_status !== "ready") ?? null;
  const syntheticConfiguredCount = checks.filter(
    (check) =>
      (check.integration_id.startsWith("anime_") ||
        check.integration_id.startsWith("growth_")) &&
      check.source_status === "configured"
  ).length;
  const syntheticMissingCount = checks.filter(
    (check) =>
      (check.integration_id.startsWith("anime_") ||
        check.integration_id.startsWith("growth_")) &&
      check.source_status === "missing_configuration"
  ).length;
  const animeIdentitySurfaceSummary = summarizeAnimeIdentitySurfaces(checks);
  const report = {
    schema: "iris_admin_integration_checklist_v1",
    generated_at_ms: generatedAtMs,
    checklist_status: firstAttention ? "attention_required" : "ready",
    check_count: checks.length,
    ready_check_count: checks.filter((check) => check.check_status === "ready").length,
    attention_check_count: checks.filter((check) => check.check_status !== "ready").length,
    blocked_check_count: checks.filter((check) => check.check_status === "blocked").length,
    not_configured_check_count: checks.filter(
      (check) => check.check_status === "not_configured"
    ).length,
    disabled_check_count: checks.filter(
      (check) => check.check_status === "disabled_by_safety_policy"
    ).length,
    next_check_id: firstAttention?.integration_id ?? null,
    next_operator_action_id: firstAttention?.next_operator_action_id ?? null,
    next_safe_script: firstAttention?.next_safe_script ?? null,
    checks,
    status_summary: {
      schema: "iris_admin_integration_checklist_status_summary_v1",
      integration_total: integrationStatus.summary.total + 16,
      configured_count: integrationStatus.summary.configured + syntheticConfiguredCount,
      local_count: integrationStatus.summary.local,
      disabled_count: integrationStatus.summary.disabled,
      missing_configuration_count:
        integrationStatus.summary.missing_configuration + syntheticMissingCount,
      local_endpoint_policy_applicable_count:
        integrationStatus.summary.local_endpoint_policy_applicable_count,
      local_endpoint_policy_all_allowed_count:
        integrationStatus.summary.local_endpoint_policy_all_allowed_count,
      local_endpoint_policy_not_configured_count:
        integrationStatus.summary.local_endpoint_policy_not_configured_count,
      local_endpoint_policy_blocked_count:
        integrationStatus.summary.local_endpoint_policy_blocked_count,
      anime_identity_surface_count:
        animeIdentitySurfaceSummary.surface_count,
      anime_identity_ready_surface_count:
        animeIdentitySurfaceSummary.ready_surface_count,
      anime_identity_missing_surface_count:
        animeIdentitySurfaceSummary.missing_surface_count,
    },
    boundary_policy: {
      read_only_admin_checklist: true,
      env_names_and_counts_only: true,
      script_names_only: true,
      fixed_status_labels_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_connection_values: true,
      no_live_payloads: true,
      no_viewer_messages: true,
      no_support_message_text: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_hidden_relationship_scores: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_raw_voice_samples: true,
      no_dataset_paths: true,
      no_internal_model_paths: true,
      no_raw_jobs: true,
      no_real_process_started: true,
      no_database_connection_attempted: true,
      no_game_or_os_input: true,
    },
  };
  assertAdminIntegrationChecklistSafe(report);
  return report;
}

export function assertAdminIntegrationChecklistSafe(
  report,
  context = "admin integration checklist"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  assertNoUnsafeReportLeak(report, context);
  if (report.schema !== "iris_admin_integration_checklist_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!ADMIN_INTEGRATION_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field ${field}`);
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (!["ready", "attention_required"].includes(report.checklist_status)) {
    throw new ContractError(`${context}: invalid checklist status`);
  }
  if (!Array.isArray(report.checks) || report.checks.length !== 31) {
    throw new ContractError(`${context}: checks required`);
  }
  report.checks.forEach((check) => assertChecklistItemSafe(check, context));
  if (new Set(report.checks.map((check) => check.integration_id)).size !== 31) {
    throw new ContractError(`${context}: duplicate integration id`);
  }
  const readyCount = report.checks.filter(
    (check) => check.check_status === "ready"
  ).length;
  const attentionCount = report.checks.length - readyCount;
  if (
    report.check_count !== report.checks.length ||
    report.ready_check_count !== readyCount ||
    report.attention_check_count !== attentionCount ||
    report.blocked_check_count !==
      report.checks.filter((check) => check.check_status === "blocked").length ||
    report.not_configured_check_count !==
      report.checks.filter((check) => check.check_status === "not_configured").length ||
    report.disabled_check_count !==
      report.checks.filter(
        (check) => check.check_status === "disabled_by_safety_policy"
      ).length
  ) {
    throw new ContractError(`${context}: checklist counts mismatch`);
  }
  const firstAttention =
    report.checks.find((check) => check.check_status !== "ready") ?? null;
  if (
    report.next_check_id !== (firstAttention?.integration_id ?? null) ||
    report.next_operator_action_id !==
      (firstAttention?.next_operator_action_id ?? null) ||
    report.next_safe_script !== (firstAttention?.next_safe_script ?? null)
  ) {
    throw new ContractError(`${context}: next check mismatch`);
  }
  assertStatusSummarySafe(report.status_summary, context);
  assertBoundaryPolicy(
    report.boundary_policy,
    ADMIN_INTEGRATION_CHECKLIST_BOUNDARY_FIELDS,
    `${context} boundary policy`
  );
}

function assertNoUnsafeReportLeak(report, context) {
  const serialized = JSON.stringify(report);
  const leaked = UNSAFE_ADMIN_INTEGRATION_CHECKLIST_REPORT_FRAGMENTS.filter((fragment) =>
    serialized.includes(fragment)
  );
  if (leaked.length > 0) {
    throw new ContractError(`${context}: unsafe fragment(s) exposed: ${leaked.join(", ")}`);
  }
}

function createChecklistItem(item) {
  const metadata = CHECK_METADATA[item.integration] ?? {
    title: item.integration,
    group: "other",
    script: "npm run dev:probe",
  };
  const checkStatus = mapIntegrationStatus(item);
  const safeScriptCatalog = buildSafeScriptCatalog(metadata);
  const authConfigured = item.configured_env.some((name) =>
    /(?:AUTH|OAUTH|API_KEY|TOKEN|SECRET)/.test(name)
  );
  return {
    schema: "iris_admin_integration_checklist_item_v1",
    integration_id: item.integration,
    title: metadata.title,
    group: metadata.group,
    check_status: checkStatus,
    source_status: item.status,
    mode_label: safeModeLabel(item.mode),
    configured_env_count: item.configured_env.length,
    missing_env_count: item.missing_env.length,
    auth_configured: authConfigured,
    local_endpoint_policy_status: item.local_endpoint_policy_status ?? "not_applicable",
    local_endpoint_scope_summary: item.local_endpoint_scope_summary
      ? {
          total_count: Number(item.local_endpoint_scope_summary.total_count),
          allowed_count:
            Number(item.local_endpoint_scope_summary.loopback_count) +
            Number(item.local_endpoint_scope_summary.private_network_count),
          blocked_count:
            Number(item.local_endpoint_scope_summary.external_count) +
            Number(item.local_endpoint_scope_summary.invalid_count),
          not_configured_count: Number(
            item.local_endpoint_scope_summary.not_configured_count
          ),
        }
      : null,
    next_operator_action_id: nextActionForStatus(checkStatus, item),
    next_safe_script: metadata.script,
    safe_script_catalog: safeScriptCatalog,
    safe_script_catalog_count: safeScriptCatalog.length,
    boundary_policy: {
      counts_and_fixed_statuses_only: true,
      env_names_only: true,
      no_env_values: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function createAnimePerformanceChecklistItems(env) {
  return [
    createSyntheticChecklistItem({
      integrationId: "anime_performance_reference",
      title: "Anime Performance Reference",
      group: "anime_performance_matching",
      envNames: ANIME_REFERENCE_PROFILE_ENV_NAMES,
      env,
    }),
    createSyntheticChecklistItem({
      integrationId: "anime_expression_motion_match",
      title: "Anime Expression And Motion Match",
      group: "anime_performance_matching",
      envNames: ANIME_EXPRESSION_MOTION_ENV_NAMES,
      env,
    }),
    createSyntheticChecklistItem({
      integrationId: "anime_voice_speech_match",
      title: "Anime Voice And Speech Match",
      group: "anime_performance_matching",
      envNames: ANIME_VOICE_SPEECH_ENV_NAMES,
      env,
    }),
  ];
}

function createAnimeIpGovernanceChecklistItems(env) {
  return [
    createSyntheticChecklistItem({
      integrationId: "anime_canon_bible_policy",
      title: "Anime Canon Bible Policy",
      group: "anime_ip_governance",
      envNames: ["IRIS_ANIME_CANON_BIBLE_PROFILE_ID"],
      env,
      nextOperatorActionId: "configure_anime_performance_matching",
    }),
    createSyntheticChecklistItem({
      integrationId: "anime_spoiler_release_policy",
      title: "Anime Spoiler Release Policy",
      group: "anime_ip_governance",
      envNames: ["IRIS_ANIME_SPOILER_RELEASE_POLICY_ID"],
      env,
      nextOperatorActionId: "configure_anime_performance_matching",
    }),
    createSyntheticChecklistItem({
      integrationId: "anime_non_canon_label_policy",
      title: "Anime Non Canon Label Policy",
      group: "anime_ip_governance",
      envNames: ["IRIS_ANIME_NON_CANON_LABEL_POLICY_ID"],
      env,
      nextOperatorActionId: "configure_anime_performance_matching",
    }),
    createSyntheticChecklistItem({
      integrationId: "anime_ip_owner_approval_policy",
      title: "Anime IP Owner Approval Policy",
      group: "anime_ip_governance",
      envNames: ["IRIS_ANIME_IP_OWNER_APPROVAL_STATUS"],
      env,
      nextOperatorActionId: "configure_anime_performance_matching",
    }),
    createSyntheticChecklistItem({
      integrationId: "anime_canon_layer_policy",
      title: "Anime Canon Layer Policy",
      group: "anime_ip_governance",
      envNames: ["IRIS_ANIME_CANON_LAYER_POLICY_ID"],
      env,
      nextOperatorActionId: "configure_anime_performance_matching",
    }),
    createSyntheticChecklistItem({
      integrationId: "anime_stream_mode_policy",
      title: "Anime Stream Mode Policy",
      group: "anime_ip_governance",
      envNames: ["IRIS_ANIME_STREAM_MODE_POLICY_ID"],
      env,
      nextOperatorActionId: "configure_anime_performance_matching",
    }),
    createSyntheticChecklistItem({
      integrationId: "anime_release_mode_schedule",
      title: "Anime Release Mode Schedule",
      group: "anime_ip_governance",
      envNames: ["IRIS_ANIME_RELEASE_MODE_SCHEDULE_ID"],
      env,
      nextOperatorActionId: "configure_anime_performance_matching",
    }),
    createSyntheticChecklistItem({
      integrationId: "anime_character_communication_mode_policy",
      title: "Anime Character Communication Mode Policy",
      group: "anime_ip_governance",
      envNames: ["IRIS_ANIME_CHARACTER_COMMUNICATION_MODE_POLICY_ID"],
      env,
      nextOperatorActionId: "configure_anime_performance_matching",
    }),
    createSyntheticChecklistItem({
      integrationId: "anime_voice_license_use_categories",
      title: "Anime Voice License Use Categories",
      group: "anime_ip_governance",
      envNames: ANIME_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES,
      env,
      nextOperatorActionId: "configure_anime_performance_matching",
    }),
  ];
}

function createGrowthBusinessChecklistItems(env) {
  return [
    createSyntheticChecklistItem({
      integrationId: "growth_fan_community_policy",
      title: "Growth Fan And Community Policy",
      group: "growth_business_operations",
      envNames: [
        "IRIS_FAN_GROWTH_LIFECYCLE_POLICY_ID",
        "IRIS_COMMUNITY_RITUAL_REVIEW_POLICY_ID",
      ],
      env,
      nextOperatorActionId: "configure_growth_business_operations",
    }),
    createSyntheticChecklistItem({
      integrationId: "growth_trust_content_policy",
      title: "Growth Trust And Content Policy",
      group: "growth_business_operations",
      envNames: [
        "IRIS_AI_TRANSPARENCY_DISCLOSURE_POLICY_ID",
        "IRIS_CONTENT_STRATEGY_APPROVAL_POLICY_ID",
      ],
      env,
      nextOperatorActionId: "configure_growth_business_operations",
    }),
    createSyntheticChecklistItem({
      integrationId: "growth_monetization_cost_policy",
      title: "Growth Monetization And Cost Policy",
      group: "growth_business_operations",
      envNames: [
        "IRIS_MONETIZATION_SAFETY_POLICY_ID",
        "IRIS_COST_GOVERNANCE_BUDGET_POLICY_ID",
      ],
      env,
      nextOperatorActionId: "configure_growth_business_operations",
    }),
    createSyntheticChecklistItem({
      integrationId: "growth_operator_analytics_policy",
      title: "Growth Operator And Analytics Policy",
      group: "growth_business_operations",
      envNames: [
        "IRIS_OPERATOR_COMFORT_CHECKLIST_ID",
        "IRIS_PUBLIC_ANALYTICS_EXPORT_POLICY_ID",
      ],
      env,
      nextOperatorActionId: "configure_growth_business_operations",
    }),
  ];
}

function envNamesForAnimeSurface(surfaceId) {
  const surface = ANIME_PERFORMANCE_IDENTITY_SURFACE_ENV_GROUPS.find(
    ([candidateSurfaceId]) => candidateSurfaceId === surfaceId
  );
  if (!surface) {
    throw new ContractError(`admin integration checklist: missing anime surface ${surfaceId}`);
  }
  return surface[1];
}

function createSyntheticChecklistItem({
  integrationId,
  title,
  group,
  envNames,
  env,
  nextOperatorActionId = "configure_anime_performance_matching",
}) {
  const configuredEnvCount = envNames.filter((name) => hasConfiguredEnv(env, name))
    .length;
  const missingEnvCount = envNames.length - configuredEnvCount;
  const checkStatus = missingEnvCount === 0 ? "ready" : "not_configured";
  return {
    schema: "iris_admin_integration_checklist_item_v1",
    integration_id: integrationId,
    title,
    group,
    check_status: checkStatus,
    source_status: checkStatus === "ready" ? "configured" : "missing_configuration",
    mode_label: "env_name_readiness",
    configured_env_count: configuredEnvCount,
    missing_env_count: missingEnvCount,
    auth_configured: false,
    local_endpoint_policy_status: "not_applicable",
    local_endpoint_scope_summary: null,
    next_operator_action_id:
      checkStatus === "ready" ? null : nextOperatorActionId,
    next_safe_script: "npm run dev:admin:character-voice-settings:summary",
    safe_script_catalog: [
      "npm run dev:admin:dashboard",
      "npm run dev:admin:character-voice-settings:summary",
      "npm run dev:admin:character-voice-settings",
    ],
    safe_script_catalog_count: 3,
    boundary_policy: {
      counts_and_fixed_statuses_only: true,
      env_names_only: true,
      no_env_values: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function buildSafeScriptCatalog(metadata) {
  const scripts = Array.isArray(metadata.scripts)
    ? metadata.scripts
    : [metadata.script];
  const selected = [];
  for (const script of scripts) {
    if (
      typeof script === "string" &&
      SAFE_SCRIPT_PATTERN.test(script) &&
      !selected.includes(script)
    ) {
      selected.push(script);
    }
  }
  return selected;
}

function hasConfiguredEnv(env, name) {
  return String(env?.[name] ?? "").trim().length > 0;
}

function mapIntegrationStatus(item) {
  if (item.local_endpoint_policy_status === "blocked") return "blocked";
  if (item.status === "disabled") return "disabled_by_safety_policy";
  if (item.status === "missing_configuration") return "not_configured";
  if (item.local_endpoint_policy_status === "not_configured") {
    return item.status === "configured" ? "operator_attention_required" : "not_configured";
  }
  if (item.status === "configured" || item.status === "local") return "ready";
  return "operator_attention_required";
}

function nextActionForStatus(status, item) {
  if (status === "ready") return null;
  if (status === "blocked") return "replace_blocked_local_endpoint_target";
  if (status === "disabled_by_safety_policy") return "enable_only_after_operator_review";
  if (status === "not_configured" && item.missing_env.length > 0) {
    return "configure_missing_env_names";
  }
  if (item.auth_configured !== true && item.status === "configured") {
    return "review_optional_credential_status";
  }
  return "run_next_safe_verification";
}

function assertChecklistItemSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: checklist item required`);
  }
  if (item.schema !== "iris_admin_integration_checklist_item_v1") {
    throw new ContractError(`${context}: invalid checklist item schema`);
  }
  for (const field of Object.keys(item)) {
    if (!ADMIN_INTEGRATION_CHECKLIST_ITEM_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist item field ${field}`);
    }
  }
  if (!INTEGRATION_IDS.has(item.integration_id)) {
    throw new ContractError(`${context}: invalid integration id`);
  }
  if (!CHECK_STATUSES.has(item.check_status)) {
    throw new ContractError(`${context}: invalid check status`);
  }
  if (!["local", "configured", "missing_configuration", "disabled"].includes(item.source_status)) {
    throw new ContractError(`${context}: invalid source status`);
  }
  if (
    !["all_allowed", "blocked", "not_configured", "not_applicable"].includes(
      item.local_endpoint_policy_status
    )
  ) {
    throw new ContractError(`${context}: invalid local endpoint policy status`);
  }
  if (!SAFE_SCRIPT_PATTERN.test(item.next_safe_script)) {
    throw new ContractError(`${context}: invalid next script`);
  }
  if (
    !Array.isArray(item.safe_script_catalog) ||
    item.safe_script_catalog.length !== item.safe_script_catalog_count ||
    item.safe_script_catalog.length < 1 ||
    item.safe_script_catalog.length > 6 ||
    item.safe_script_catalog.some(
      (script) => typeof script !== "string" || !SAFE_SCRIPT_PATTERN.test(script)
    ) ||
    !item.safe_script_catalog.includes(item.next_safe_script)
  ) {
    throw new ContractError(`${context}: invalid safe script catalog`);
  }
  if (new Set(item.safe_script_catalog).size !== item.safe_script_catalog.length) {
    throw new ContractError(`${context}: duplicate safe script catalog item`);
  }
  for (const field of ["configured_env_count", "missing_env_count"]) {
    if (!Number.isInteger(item[field]) || item[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (typeof item.auth_configured !== "boolean") {
    throw new ContractError(`${context}: invalid auth flag`);
  }
  if (
    item.next_operator_action_id !== null &&
    (typeof item.next_operator_action_id !== "string" ||
      !/^[a-z0-9_]+$/.test(item.next_operator_action_id))
  ) {
    throw new ContractError(`${context}: invalid next action`);
  }
  if (item.local_endpoint_scope_summary !== null) {
    for (const field of [
      "total_count",
      "allowed_count",
      "blocked_count",
      "not_configured_count",
    ]) {
      if (!Number.isInteger(item.local_endpoint_scope_summary[field]) || item.local_endpoint_scope_summary[field] < 0) {
        throw new ContractError(`${context}: invalid local endpoint scope summary`);
      }
    }
  }
  assertBoundaryPolicy(
    item.boundary_policy,
    ADMIN_INTEGRATION_CHECKLIST_ITEM_BOUNDARY_FIELDS,
    `${context} item boundary policy`
  );
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertStatusSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: status summary required`);
  }
  if (summary.schema !== "iris_admin_integration_checklist_status_summary_v1") {
    throw new ContractError(`${context}: invalid status summary schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ADMIN_INTEGRATION_STATUS_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status summary field ${field}`);
    }
  }
  for (const [field, value] of Object.entries(summary)) {
    if (field === "schema") continue;
    if (!Number.isInteger(value) || value < 0) {
      throw new ContractError(`${context}: invalid status summary count`);
    }
  }
  if (
    summary.configured_count +
      summary.local_count +
      summary.disabled_count +
      summary.missing_configuration_count !==
    summary.integration_total
  ) {
    throw new ContractError(`${context}: status summary total mismatch`);
  }
  if (
    summary.local_endpoint_policy_all_allowed_count +
      summary.local_endpoint_policy_not_configured_count +
      summary.local_endpoint_policy_blocked_count >
    summary.local_endpoint_policy_applicable_count
  ) {
    throw new ContractError(`${context}: local endpoint policy count mismatch`);
  }
  if (
    summary.anime_identity_surface_count !==
      ANIME_IDENTITY_SURFACE_CHECK_GROUPS.length ||
    summary.anime_identity_ready_surface_count +
      summary.anime_identity_missing_surface_count !==
      summary.anime_identity_surface_count
  ) {
    throw new ContractError(`${context}: anime identity surface count mismatch`);
  }
}

function summarizeAnimeIdentitySurfaces(checks) {
  const checkById = new Map(checks.map((check) => [check.integration_id, check]));
  const surfaces = ANIME_IDENTITY_SURFACE_CHECK_GROUPS.map((integrationIds) =>
    integrationIds.map((integrationId) => checkById.get(integrationId))
  );
  const readySurfaceCount = surfaces.filter(
    (surface) =>
      surface.every((check) => check && check.check_status === "ready")
  ).length;
  return {
    surface_count: surfaces.length,
    ready_surface_count: readySurfaceCount,
    missing_surface_count: surfaces.length - readySurfaceCount,
  };
}

function safeModeLabel(value) {
  const normalized = String(value ?? "unknown").trim().toLowerCase();
  if (/^[a-z0-9_-]{1,48}$/.test(normalized)) return normalized;
  return "custom";
}
