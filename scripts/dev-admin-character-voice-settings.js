import {
  ANIME_PERFORMANCE_EXPRESSION_MOTION_SETTING_IDS,
  ANIME_PERFORMANCE_IDENTITY_SURFACE_COUNT,
  ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES,
  ANIME_PERFORMANCE_IP_GOVERNANCE_SETTING_IDS,
  ANIME_PERFORMANCE_REFERENCE_SETTING_IDS,
  ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_SETTING_IDS,
  ANIME_PERFORMANCE_VOICE_SPEECH_SETTING_IDS,
  assertAdminCharacterVoiceSettingsReportSafe,
  createAdminCharacterVoiceSettingsReport,
} from "../src/services/dev/adminCharacterVoiceSettings.js";
import { fileURLToPath } from "node:url";

const CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "admin_character_voice_settings",
  "anime_performance_matching_summary",
  "boundary_policy",
]);
const ANIME_PERFORMANCE_SUMMARY_FIELDS = new Set([
  "schema",
  "setting_count",
  "configured_setting_count",
  "missing_setting_count",
  "reference_setting_count",
  "reference_configured_setting_count",
  "reference_missing_setting_count",
  "expression_motion_setting_count",
  "expression_motion_configured_setting_count",
  "expression_motion_missing_setting_count",
  "voice_speech_setting_count",
  "voice_speech_configured_setting_count",
  "voice_speech_missing_setting_count",
  "ip_governance_setting_count",
  "ip_governance_configured_setting_count",
  "ip_governance_missing_setting_count",
  "voice_license_use_category_setting_count",
  "voice_license_use_category_configured_setting_count",
  "voice_license_use_category_missing_setting_count",
  "anime_identity_surface_count",
  "anime_identity_configured_surface_count",
  "anime_identity_missing_surface_count",
  "next_safe_script",
  "boundary_policy",
]);
function sumAnimePerformanceCategoryCounts(summary, suffix) {
  return ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES.reduce(
    (total, prefix) => total + summary[`${prefix}_${suffix}`],
    0
  );
}

export function createAdminCharacterVoiceSettingsCliReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const report = createAdminCharacterVoiceSettingsReport({ env, generatedAtMs });
  assertAdminCharacterVoiceSettingsReportSafe(
    report,
    "admin character voice settings CLI"
  );
  const cliReport = {
    ok: true,
    schema: "iris_admin_character_voice_settings_cli_v1",
    admin_character_voice_settings: report,
    anime_performance_matching_summary:
      createAnimePerformanceMatchingCliSummary(report),
    boundary_policy: {
      read_only_cli: true,
      env_names_only: true,
      no_setting_values: true,
      internal_guidance_only: true,
      no_phase00_canonical_enum_changes: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_voice_samples: true,
      no_dataset_paths: true,
      no_internal_model_paths: true,
      no_raw_animation_cuts: true,
      no_raw_production_materials: true,
      no_raw_script_excerpts: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertAdminCharacterVoiceSettingsCliReportSafe(cliReport);
  return cliReport;
}

export function createAdminCharacterVoiceSettingsCliSummaryReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  return createAdminCharacterVoiceSettingsCliReport({
    env,
    generatedAtMs,
  }).anime_performance_matching_summary;
}

export function createAnimePerformanceMatchingCliSummary(report) {
  const animePerformanceSettings = report.settings.filter(
    (setting) =>
      setting.setting_group === "performance" ||
      setting.setting_group === "ip_governance" ||
      ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_SETTING_IDS.has(
        setting.setting_id
      )
  );
  const referenceCounts = countSettingsByIds(
    animePerformanceSettings,
    ANIME_PERFORMANCE_REFERENCE_SETTING_IDS
  );
  const expressionMotionCounts = countSettingsByIds(
    animePerformanceSettings,
    ANIME_PERFORMANCE_EXPRESSION_MOTION_SETTING_IDS
  );
  const voiceSpeechCounts = countSettingsByIds(
    animePerformanceSettings,
    ANIME_PERFORMANCE_VOICE_SPEECH_SETTING_IDS
  );
  const ipGovernanceCounts = countSettingsByIds(
    animePerformanceSettings,
    ANIME_PERFORMANCE_IP_GOVERNANCE_SETTING_IDS
  );
  const voiceLicenseUseCategoryCounts = countSettingsByIds(
    animePerformanceSettings,
    ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_SETTING_IDS
  );
  const identitySurfaceCounts = [
    referenceCounts,
    expressionMotionCounts,
    voiceSpeechCounts,
    ipGovernanceCounts,
    voiceLicenseUseCategoryCounts,
  ];
  const identityConfiguredSurfaceCount = countConfiguredIdentitySurfaces(
    identitySurfaceCounts
  );
  const summary = {
    schema: "iris_admin_character_voice_settings_cli_anime_performance_summary_v1",
    setting_count: animePerformanceSettings.length,
    configured_setting_count: animePerformanceSettings.filter(
      (setting) => setting.setting_status === "configured"
    ).length,
    missing_setting_count: animePerformanceSettings.filter(
      (setting) => setting.setting_status !== "configured"
    ).length,
    reference_setting_count: referenceCounts.setting_count,
    reference_configured_setting_count: referenceCounts.configured_setting_count,
    reference_missing_setting_count: referenceCounts.missing_setting_count,
    expression_motion_setting_count: expressionMotionCounts.setting_count,
    expression_motion_configured_setting_count:
      expressionMotionCounts.configured_setting_count,
    expression_motion_missing_setting_count:
      expressionMotionCounts.missing_setting_count,
    voice_speech_setting_count: voiceSpeechCounts.setting_count,
    voice_speech_configured_setting_count:
      voiceSpeechCounts.configured_setting_count,
    voice_speech_missing_setting_count: voiceSpeechCounts.missing_setting_count,
    ip_governance_setting_count: ipGovernanceCounts.setting_count,
    ip_governance_configured_setting_count:
      ipGovernanceCounts.configured_setting_count,
    ip_governance_missing_setting_count: ipGovernanceCounts.missing_setting_count,
    voice_license_use_category_setting_count:
      voiceLicenseUseCategoryCounts.setting_count,
    voice_license_use_category_configured_setting_count:
      voiceLicenseUseCategoryCounts.configured_setting_count,
    voice_license_use_category_missing_setting_count:
      voiceLicenseUseCategoryCounts.missing_setting_count,
    anime_identity_surface_count: ANIME_PERFORMANCE_IDENTITY_SURFACE_COUNT,
    anime_identity_configured_surface_count: identityConfiguredSurfaceCount,
    anime_identity_missing_surface_count:
      ANIME_PERFORMANCE_IDENTITY_SURFACE_COUNT - identityConfiguredSurfaceCount,
    next_safe_script: "npm run dev:admin:character-voice-settings:summary",
    boundary_policy: {
      counts_statuses_and_script_names_only: true,
      no_setting_values: true,
      no_raw_voice_samples: true,
      no_raw_animation_cuts: true,
      no_raw_production_materials: true,
      no_raw_script_excerpts: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertAnimePerformanceMatchingCliSummarySafe(summary);
  return summary;
}

export function assertAdminCharacterVoiceSettingsCliReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("Admin character voice settings CLI report must be an object");
  }
  if (report.ok !== true) {
    throw new Error("Admin character voice settings CLI report must be ok");
  }
  if (report.schema !== "iris_admin_character_voice_settings_cli_v1") {
    throw new Error("Admin character voice settings CLI schema mismatch");
  }
  assertOnlyFields(report, CLI_REPORT_FIELDS, "CLI report");
  assertAdminCharacterVoiceSettingsReportSafe(
    report.admin_character_voice_settings,
    "admin character voice settings CLI nested report"
  );
  assertAnimePerformanceMatchingCliSummarySafe(
    report.anime_performance_matching_summary
  );
  assertBoundaryPolicy(report.boundary_policy, [
    "read_only_cli",
    "env_names_only",
    "no_setting_values",
    "internal_guidance_only",
    "no_phase00_canonical_enum_changes",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_voice_samples",
    "no_dataset_paths",
    "no_internal_model_paths",
    "no_raw_animation_cuts",
    "no_raw_production_materials",
    "no_raw_script_excerpts",
    "no_candidates",
    "no_commands",
  ]);
  assertNoUnsafeReportLeak(report);
}

export function assertAnimePerformanceMatchingCliSummarySafe(summary) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new Error("Anime performance matching CLI summary must be an object");
  }
  if (
    summary.schema !==
    "iris_admin_character_voice_settings_cli_anime_performance_summary_v1"
  ) {
    throw new Error("Anime performance matching CLI summary schema mismatch");
  }
  assertOnlyFields(
    summary,
    ANIME_PERFORMANCE_SUMMARY_FIELDS,
    "anime performance summary"
  );
  for (const field of [
    "setting_count",
    "configured_setting_count",
    "missing_setting_count",
    "reference_setting_count",
    "reference_configured_setting_count",
    "reference_missing_setting_count",
    "expression_motion_setting_count",
    "expression_motion_configured_setting_count",
    "expression_motion_missing_setting_count",
    "voice_speech_setting_count",
    "voice_speech_configured_setting_count",
    "voice_speech_missing_setting_count",
    "ip_governance_setting_count",
    "ip_governance_configured_setting_count",
    "ip_governance_missing_setting_count",
    "voice_license_use_category_setting_count",
    "voice_license_use_category_configured_setting_count",
    "voice_license_use_category_missing_setting_count",
    "anime_identity_surface_count",
    "anime_identity_configured_surface_count",
    "anime_identity_missing_surface_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new Error(`Anime performance matching CLI summary invalid ${field}`);
    }
  }
  if (
    summary.configured_setting_count + summary.missing_setting_count !==
    summary.setting_count
  ) {
    throw new Error("Anime performance matching CLI summary counts mismatch");
  }
  assertCategoryCountsMatch(summary, "reference");
  assertCategoryCountsMatch(summary, "expression_motion");
  assertCategoryCountsMatch(summary, "voice_speech");
  assertCategoryCountsMatch(summary, "ip_governance");
  assertCategoryCountsMatch(summary, "voice_license_use_category");
  if (
    summary.anime_identity_surface_count !==
      ANIME_PERFORMANCE_IDENTITY_SURFACE_COUNT ||
    summary.anime_identity_configured_surface_count +
      summary.anime_identity_missing_surface_count !==
      summary.anime_identity_surface_count
  ) {
    throw new Error("Anime performance matching CLI identity surface counts mismatch");
  }
  if (
    sumAnimePerformanceCategoryCounts(summary, "setting_count") !==
    summary.setting_count
  ) {
    throw new Error("Anime performance matching CLI category counts mismatch");
  }
  if (
    sumAnimePerformanceCategoryCounts(summary, "configured_setting_count") !==
    summary.configured_setting_count
  ) {
    throw new Error(
      "Anime performance matching CLI category configured counts mismatch"
    );
  }
  if (
    sumAnimePerformanceCategoryCounts(summary, "missing_setting_count") !==
    summary.missing_setting_count
  ) {
    throw new Error(
      "Anime performance matching CLI category missing counts mismatch"
    );
  }
  if (
    summary.next_safe_script !== "npm run dev:admin:character-voice-settings:summary"
  ) {
    throw new Error("Anime performance matching CLI summary script mismatch");
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_script_names_only",
    "no_setting_values",
    "no_raw_voice_samples",
    "no_raw_animation_cuts",
    "no_raw_production_materials",
    "no_raw_script_excerpts",
    "no_candidates",
    "no_commands",
  ]);
  assertNoUnsafeReportLeak(summary);
}

function assertNoUnsafeReportLeak(reportValue) {
  const serialized = JSON.stringify(reportValue);
  const forbiddenFragments = [
    process.env.DATABASE_URL,
    process.env.IRIS_POSTGRES_URL,
    process.env.IRIS_OBS_BRIDGE_ENDPOINT,
    process.env.IRIS_OBS_BRIDGE_API_KEY,
    process.env.IRIS_YOUTUBE_DATA_API_KEY,
    process.env.IRIS_YOUTUBE_OAUTH_TOKEN,
    process.env.IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN,
    process.env.IRIS_TTS_API_KEY,
    process.env.IRIS_LIVE2D_API_KEY,
    '"event_id"',
    '"trace_id"',
    '"subtitle_text"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
  ].filter(Boolean);
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`Admin character voice settings CLI leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

function assertOnlyFields(value, expectedFields, label) {
  for (const field of Object.keys(value)) {
    if (!expectedFields.has(field)) {
      throw new Error(`Unexpected ${label} field: ${field}`);
    }
  }
}

function assertBoundaryPolicy(policy, requiredFields) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error("Boundary policy must be an object");
  }
  const expected = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!expected.has(field)) {
      throw new Error(`Unexpected boundary policy field: ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new Error(`Boundary policy missing: ${field}`);
    }
  }
}

function countSettingsByIds(settings, settingIds) {
  const selected = settings.filter((setting) => settingIds.has(setting.setting_id));
  const configured = selected.filter(
    (setting) => setting.setting_status === "configured"
  ).length;
  return {
    setting_count: selected.length,
    configured_setting_count: configured,
    missing_setting_count: selected.length - configured,
  };
}

function countConfiguredIdentitySurfaces(identitySurfaceCounts) {
  return identitySurfaceCounts.filter(
    (counts) =>
      counts.setting_count > 0 &&
      counts.missing_setting_count === 0
  ).length;
}

function assertCategoryCountsMatch(summary, prefix) {
  if (
    summary[`${prefix}_configured_setting_count`] +
      summary[`${prefix}_missing_setting_count`] !==
    summary[`${prefix}_setting_count`]
  ) {
    throw new Error(`Anime performance matching CLI ${prefix} counts mismatch`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = process.argv.includes("--anime-performance-summary-only")
    ? createAdminCharacterVoiceSettingsCliSummaryReport()
    : createAdminCharacterVoiceSettingsCliReport();
  console.log(JSON.stringify(report, null, 2));
}
