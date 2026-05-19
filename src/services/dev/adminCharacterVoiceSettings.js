import { ContractError, canonical } from "../../core/contracts.js";

const URL_PATTERN = /https?:\/\/|postgres:\/\/|postgresql:\/\//i;
const ENV_NAME_PATTERN = /^IRIS_[A-Z0-9_]+$/;
const SETTING_IDS = new Set([
  "character_display_name",
  "active_character_preset",
  "personality_guidance",
  "speaking_style_guidance",
  "humor_strength",
  "teasing_strength",
  "shyness_strength",
  "excitement_strength",
  "panic_scream_strength",
  "laughter_strength",
  "idle_behavior_strength",
  "humming_enablement",
  "short_vocalise_enablement",
  "dance_gesture_enablement",
  "camera_proximity_strength",
  "game_commentator_style",
  "multilingual_language_preference",
  "subtitle_display_preference",
  "character_voice_profile",
  "character_voice_style_profile",
  "licensed_voice_source_status",
  "voice_license_stream_use_status",
  "voice_license_prerecorded_line_use_status",
  "voice_license_voice_product_use_status",
  "voice_license_sponsor_campaign_use_status",
  "speech_rate_baseline",
  "speech_rate_variation_range",
  "fallback_voice_policy",
  "runtime_tts_bridge_connection",
  "runtime_live2d_bridge_connection",
  "runtime_subtitle_bridge_connection",
  "runtime_tts_engine_connection",
  "runtime_live2d_engine_connection",
  "runtime_subtitle_engine_connection",
  "anime_performance_reference_profile",
  "anime_expression_match_profile",
  "anime_gaze_blink_match_profile",
  "anime_mouth_lipsync_match_profile",
  "anime_posture_gesture_match_profile",
  "anime_idle_breathing_motion_profile",
  "anime_voice_quality_match_profile",
  "anime_intonation_accent_match_profile",
  "anime_catchphrase_policy",
  "anime_speech_timing_profile",
  "anime_subtitle_pacing_profile",
  "anime_performance_approval_status",
  "anime_canon_bible_profile",
  "anime_spoiler_release_policy",
  "anime_non_canon_label_policy",
  "anime_ip_owner_approval_status",
  "anime_canon_layer_policy",
  "anime_stream_mode_policy",
  "anime_release_mode_schedule",
  "anime_character_communication_mode_policy",
  "fan_growth_lifecycle_policy",
  "community_ritual_review_policy",
  "ai_transparency_disclosure_policy",
  "content_strategy_approval_policy",
  "monetization_safety_policy",
  "operator_comfort_checklist",
  "cost_governance_budget_policy",
  "public_analytics_export_policy",
]);
const FORBIDDEN_PATTERN =
  /https?:\/\/|\b(world_command|event_id|trace_id|subtitle_text|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|raw[_-]?audio|raw[_-]?voice|raw[_-]?footage|raw[_-]?script|raw[_-]?production|dataset|model[_-]?path|candidate|command|canonical)\b|\braw[_-]?animation(?:[_-]?cut)?(?:\b|[_-])/i;
const ADMIN_CHARACTER_VOICE_SETTINGS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "report_status",
  "setting_count",
  "configured_setting_count",
  "missing_setting_count",
  "settings",
  "voice_source_summary",
  "boundary_policy",
]);
const ADMIN_CHARACTER_VOICE_SETTINGS_ANIME_PERFORMANCE_SUMMARY_FIELDS = new Set([
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
const ADMIN_CHARACTER_VOICE_SETTINGS_APPLY_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "apply_status",
  "dry_run_only",
  "store_write_performed",
  "runtime_change_performed",
  "requested_setting_count",
  "accepted_setting_count",
  "rejected_setting_count",
  "unsafe_value_count",
  "accepted_setting_ids",
  "internal_guidance_only",
  "changes_phase00_canonical_enums",
  "values_hidden",
  "owner_confirmation_required_before_save",
  "boundary_policy",
]);
const ADMIN_CHARACTER_VOICE_SETTING_FIELDS = new Set([
  "schema",
  "sequence_order",
  "setting_id",
  "setting_group",
  "admin_control",
  "env_names",
  "env_name_count",
  "configured_env_names",
  "configured_env_count",
  "missing_env_names",
  "setting_status",
  "internal_guidance_only",
  "changes_phase00_canonical_enums",
  "exposes_setting_values",
  "boundary_policy",
]);
const ADMIN_VOICE_SOURCE_SUMMARY_FIELDS = new Set([
  "schema",
  "env_names",
  "env_name_count",
  "configured_env_names",
  "configured_env_count",
  "missing_env_names",
  "missing_env_count",
  "safe_source_status_label",
  "fallback_voice_handoff_status",
  "fallback_voice_policy_label",
  "voice_license_use_category_count",
  "voice_license_use_category_configured_count",
  "voice_license_use_category_missing_count",
  "character_voice_profile_configured",
  "character_voice_style_profile_configured",
]);
const ANIME_CANON_LAYER_DOMAIN_LABELS = new Set([
  "anime_canon",
  "stream_persona",
  "fan_memory",
  "community_lore",
  "non_canon_play",
]);
const ANIME_CANON_LAYER_SAFE_LABEL_FIELDS = new Set([
  "schema",
  "domain_label",
  "label_status",
  "internal_guidance_only",
  "changes_phase00_canonical_enums",
  "canon_layer_separated",
  "canon_mutation_allowed",
  "auto_promotes_to_anime_canon",
  "official_adoption_review_status",
  "community_lore_approval_status",
  "official_material_status",
  "boundary_policy",
]);
const SPOILER_MODE_SAFE_STATUSES = new Set([
  "public_release_allowed",
  "spoiler_limited",
  "embargoed",
  "operator_review_required",
]);
const ANIME_RELEASE_MODES = new Set([
  "pre_release_teaser",
  "pre_premiere_countdown",
  "premiere_watch_support",
  "post_release_spoiler_free",
  "post_release_spoiler_allowed",
  "after_story_or_side_story",
  "non_canon_play",
]);
const ANIME_EXPERIENCE_MODES = new Set([
  "in_character",
  "spoiler_safe_in_character",
  "non_canon_in_character",
  "operational_disclosure",
  "fallback_out_of_character",
]);
const SPOILER_MODE_SAFE_STATUS_FIELDS = new Set([
  "schema",
  "spoiler_mode_status",
  "release_window_label",
  "safe_status_only",
  "raw_material_exposed",
  "boundary_policy",
]);
const ANIME_RELEASE_MODE_TRANSITION_PREVIEW_FIELDS = new Set([
  "schema",
  "transition_status",
  "current_release_mode",
  "requested_release_mode",
  "preview_only",
  "operator_approval_required",
  "public_mode_changed",
  "boundary_policy",
]);
const ANIME_EXPERIENCE_MODE_STATUS_FIELDS = new Set([
  "schema",
  "experience_mode",
  "mode_status",
  "experience_mode_only",
  "changes_phase00_canonical_enums",
  "boundary_policy",
]);
const ANIME_SPOILER_CALENDAR_SAFE_STATUS_FIELDS = new Set([
  "schema",
  "calendar_status",
  "unlock_condition_known",
  "unlock_condition_met",
  "owner_approved",
  "spoiler_safe",
  "safe_status_only",
  "raw_material_exposed",
  "boundary_policy",
]);
const SPOILER_INCIDENT_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "incident_status",
  "incident_count",
  "topic_class",
  "safe_summary_only",
  "raw_material_exposed",
  "boundary_policy",
]);
const ANIME_IN_CHARACTER_FALLBACK_RISK_SUMMARY_FIELDS = new Set([
  "schema",
  "fallback_out_of_character",
  "fallback_occurrence_count",
  "fallback_frequency_status",
  "quality_risk_status",
  "operator_attention_required",
  "safe_summary_only",
  "raw_material_exposed",
  "boundary_policy",
]);
const CHARACTER_IMAGE_RISK_SUMMARY_FIELDS = new Set([
  "schema",
  "image_drift_risk_label",
  "risk_item_count",
  "operator_attention_required",
  "safe_summary_only",
  "raw_material_exposed",
  "boundary_policy",
]);
const CHARACTER_BIBLE_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "summary_status",
  "reference_status_label",
  "safe_summary_label",
  "raw_material_exposed",
  "boundary_policy",
]);
const ANIME_PERFORMANCE_READINESS_SUMMARY_FIELDS = new Set([
  "schema",
  "readiness_status",
  "expression_motion_status",
  "voice_speech_status",
  "reference_status",
  "required_setting_count",
  "configured_setting_count",
  "missing_setting_count",
  "expression_motion_setting_count",
  "expression_motion_configured_setting_count",
  "expression_motion_missing_setting_count",
  "voice_speech_setting_count",
  "voice_speech_configured_setting_count",
  "voice_speech_missing_setting_count",
  "reference_setting_count",
  "reference_configured_setting_count",
  "reference_missing_setting_count",
  "raw_material_exposed",
  "boundary_policy",
]);
const VOICE_SUBTITLE_PREFLIGHT_ADMIN_PAGE_SUMMARY_FIELDS = new Set([
  "schema",
  "page_status",
  "voice_configured",
  "subtitle_configured",
  "voice_status",
  "subtitle_status",
  "repair_status",
  "configured_count",
  "attention_count",
  "boundary_policy",
]);
const GAZE_BLINK_MOUTH_SYNC_STATUS_FIELDS = new Set([
  "schema",
  "gaze_blink_status",
  "mouth_sync_status",
  "required_setting_count",
  "configured_setting_count",
  "missing_setting_count",
  "raw_material_exposed",
  "boundary_policy",
]);
const MOTION_RECOVERY_MATCH_STATUS_FIELDS = new Set([
  "schema",
  "motion_match_status",
  "recovery_match_status",
  "required_setting_count",
  "configured_setting_count",
  "missing_setting_count",
  "raw_material_exposed",
  "boundary_policy",
]);
const VOICE_QUALITY_MATCH_STATUS_FIELDS = new Set([
  "schema",
  "voice_quality_status",
  "intonation_status",
  "voice_readiness_label",
  "required_setting_count",
  "configured_setting_count",
  "missing_setting_count",
  "raw_material_exposed",
  "boundary_policy",
]);
const CATCHPHRASE_SCENE_FIT_STATUS_FIELDS = new Set([
  "schema",
  "catchphrase_fit_status",
  "usage_count",
  "overuse_risk_status",
  "raw_material_exposed",
  "boundary_policy",
]);
const PERFORMANCE_DRIFT_REVIEW_QUEUE_FIELDS = new Set([
  "schema",
  "queue_status",
  "review_item_count",
  "drift_domain_counts",
  "safe_summary_only",
  "raw_material_exposed",
  "boundary_policy",
]);
const VOICE_LICENSE_CATEGORY_READINESS_FIELDS = new Set([
  "schema",
  "category_statuses",
  "category_count",
  "ready_category_count",
  "attention_category_count",
  "safe_status_only",
  "raw_material_exposed",
  "boundary_policy",
]);
const VOICE_LICENSE_CATEGORY_STATUS_FIELDS = new Set([
  "category",
  "status",
]);
const UNRELEASED_FOOTAGE_LEAK_GUARD_FIELDS = new Set([
  "schema",
  "surface",
  "guard_status",
  "safe_summary_only",
  "raw_material_exposed",
  "boundary_policy",
]);
const VOICE_LICENSE_USE_CATEGORY_MAP = Object.freeze([
  Object.freeze([
    "stream_use",
    "IRIS_VOICE_LICENSE_STREAM_USE_STATUS",
  ]),
  Object.freeze([
    "prerecorded_line_use",
    "IRIS_VOICE_LICENSE_PRERECORDED_LINE_USE_STATUS",
  ]),
  Object.freeze([
    "voice_product_use",
    "IRIS_VOICE_LICENSE_VOICE_PRODUCT_USE_STATUS",
  ]),
  Object.freeze([
    "sponsor_campaign_use",
    "IRIS_VOICE_LICENSE_SPONSOR_CAMPAIGN_USE_STATUS",
  ]),
]);
const VOICE_LICENSE_USE_CATEGORIES = new Set(
  VOICE_LICENSE_USE_CATEGORY_MAP.map(([category]) => category)
);
const VOICE_LICENSE_CATEGORY_STATUSES = new Set([
  "licensed",
  "placeholder",
  "operator_attention_required",
  "missing",
]);
const UNRELEASED_FOOTAGE_SAFE_SURFACES = new Set([
  "runtime",
  "public",
  "admin_ordinary",
]);
const SPOILER_INCIDENT_STATUSES = new Set([
  "none",
  "contained",
  "operator_attention_required",
]);
const SPOILER_INCIDENT_TOPIC_CLASSES = new Set([
  "story",
  "visual",
  "relationship",
  "dialogue",
  "release_window",
  "unknown",
]);

const SETTINGS = Object.freeze([
  item("character_display_name", "character", ["IRIS_CHARACTER_DISPLAY_NAME"], "display_name_editor"),
  item("active_character_preset", "character", ["IRIS_CHARACTER_PROFILE_ID"], "preset_selector"),
  item("personality_guidance", "character", ["IRIS_PERSONALITY_NOTES"], "safe_notes_editor"),
  item("speaking_style_guidance", "character", ["IRIS_SPEAKING_STYLE_NOTES"], "safe_notes_editor"),
  item("humor_strength", "character", ["IRIS_HUMOR_STRENGTH"], "bounded_strength_slider"),
  item("teasing_strength", "character", ["IRIS_TEASING_STRENGTH"], "bounded_strength_slider"),
  item("shyness_strength", "character", ["IRIS_SHYNESS_STRENGTH"], "bounded_strength_slider"),
  item("excitement_strength", "character", ["IRIS_EXCITEMENT_STRENGTH"], "bounded_strength_slider"),
  item("panic_scream_strength", "character", ["IRIS_PANIC_SCREAM_STRENGTH"], "bounded_strength_slider"),
  item("laughter_strength", "character", ["IRIS_LAUGHTER_STRENGTH"], "bounded_strength_slider"),
  item("idle_behavior_strength", "motion", ["IRIS_IDLE_BEHAVIOR_STRENGTH"], "bounded_strength_slider"),
  item("humming_enablement", "voice", ["IRIS_HUMMING_ENABLED"], "toggle"),
  item("short_vocalise_enablement", "voice", ["IRIS_SHORT_VOCALISE_ENABLED"], "toggle"),
  item("dance_gesture_enablement", "motion", ["IRIS_DANCE_GESTURE_ENABLED"], "toggle"),
  item("camera_proximity_strength", "motion", ["IRIS_CAMERA_PROXIMITY_STRENGTH"], "bounded_strength_slider"),
  item("game_commentator_style", "character", ["IRIS_GAME_COMMENTATOR_STYLE"], "style_selector"),
  item("multilingual_language_preference", "voice", ["IRIS_LANGUAGE_PREFERENCE"], "language_selector"),
  item("subtitle_display_preference", "voice", ["IRIS_SUBTITLE_DISPLAY_PREFERENCE"], "subtitle_selector"),
  item("character_voice_profile", "voice", ["IRIS_CHARACTER_VOICE_PROFILE_ID"], "voice_profile_selector"),
  item("character_voice_style_profile", "voice", ["IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID"], "voice_style_selector"),
  item("licensed_voice_source_status", "voice", ["IRIS_LICENSED_VOICE_SOURCE_STATUS"], "rights_status_selector"),
  item("voice_license_stream_use_status", "voice", ["IRIS_VOICE_LICENSE_STREAM_USE_STATUS"], "rights_status_selector"),
  item("voice_license_prerecorded_line_use_status", "voice", ["IRIS_VOICE_LICENSE_PRERECORDED_LINE_USE_STATUS"], "rights_status_selector"),
  item("voice_license_voice_product_use_status", "voice", ["IRIS_VOICE_LICENSE_VOICE_PRODUCT_USE_STATUS"], "rights_status_selector"),
  item("voice_license_sponsor_campaign_use_status", "voice", ["IRIS_VOICE_LICENSE_SPONSOR_CAMPAIGN_USE_STATUS"], "rights_status_selector"),
  item("speech_rate_baseline", "voice", ["IRIS_SPEECH_RATE_BASELINE"], "bounded_rate_selector"),
  item("speech_rate_variation_range", "voice", ["IRIS_SPEECH_RATE_VARIATION_RANGE"], "bounded_rate_selector"),
  item("fallback_voice_policy", "voice", ["IRIS_FALLBACK_VOICE_POLICY"], "policy_selector"),
  item("runtime_tts_bridge_connection", "voice", ["IRIS_LOCAL_TTS_BRIDGE_ENDPOINT"], "runtime_connection_status"),
  item("runtime_live2d_bridge_connection", "motion", ["IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT"], "runtime_connection_status"),
  item("runtime_subtitle_bridge_connection", "voice", ["IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT"], "runtime_connection_status"),
  item("runtime_tts_engine_connection", "voice", ["IRIS_LOCAL_TTS_ENGINE_ENDPOINT"], "runtime_connection_status"),
  item("runtime_live2d_engine_connection", "motion", ["IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT"], "runtime_connection_status"),
  item("runtime_subtitle_engine_connection", "voice", ["IRIS_LOCAL_SUBTITLE_ENGINE_ENDPOINT"], "runtime_connection_status"),
  item("anime_performance_reference_profile", "performance", ["IRIS_ANIME_PERFORMANCE_REFERENCE_PROFILE_ID"], "reference_profile_selector"),
  item("anime_expression_match_profile", "performance", ["IRIS_ANIME_EXPRESSION_MATCH_PROFILE_ID"], "match_profile_selector"),
  item("anime_gaze_blink_match_profile", "performance", ["IRIS_ANIME_GAZE_BLINK_MATCH_PROFILE_ID"], "match_profile_selector"),
  item("anime_mouth_lipsync_match_profile", "performance", ["IRIS_ANIME_MOUTH_LIPSYNC_MATCH_PROFILE_ID"], "match_profile_selector"),
  item("anime_posture_gesture_match_profile", "performance", ["IRIS_ANIME_POSTURE_GESTURE_MATCH_PROFILE_ID"], "match_profile_selector"),
  item("anime_idle_breathing_motion_profile", "performance", ["IRIS_ANIME_IDLE_BREATHING_MOTION_PROFILE_ID"], "match_profile_selector"),
  item("anime_voice_quality_match_profile", "performance", ["IRIS_ANIME_VOICE_QUALITY_MATCH_PROFILE_ID"], "voice_match_profile_selector"),
  item("anime_intonation_accent_match_profile", "performance", ["IRIS_ANIME_INTONATION_ACCENT_MATCH_PROFILE_ID"], "voice_match_profile_selector"),
  item("anime_catchphrase_policy", "performance", ["IRIS_ANIME_CATCHPHRASE_POLICY_ID"], "policy_selector"),
  item("anime_speech_timing_profile", "performance", ["IRIS_ANIME_SPEECH_TIMING_PROFILE_ID"], "timing_profile_selector"),
  item("anime_subtitle_pacing_profile", "performance", ["IRIS_ANIME_SUBTITLE_PACING_PROFILE_ID"], "timing_profile_selector"),
  item("anime_performance_approval_status", "performance", ["IRIS_ANIME_PERFORMANCE_APPROVAL_STATUS"], "approval_status_selector"),
  item("anime_canon_bible_profile", "ip_governance", ["IRIS_ANIME_CANON_BIBLE_PROFILE_ID"], "reference_profile_selector"),
  item("anime_spoiler_release_policy", "ip_governance", ["IRIS_ANIME_SPOILER_RELEASE_POLICY_ID"], "policy_selector"),
  item("anime_non_canon_label_policy", "ip_governance", ["IRIS_ANIME_NON_CANON_LABEL_POLICY_ID"], "policy_selector"),
  item("anime_ip_owner_approval_status", "ip_governance", ["IRIS_ANIME_IP_OWNER_APPROVAL_STATUS"], "approval_status_selector"),
  item("anime_canon_layer_policy", "ip_governance", ["IRIS_ANIME_CANON_LAYER_POLICY_ID"], "policy_selector"),
  item("anime_stream_mode_policy", "ip_governance", ["IRIS_ANIME_STREAM_MODE_POLICY_ID"], "policy_selector"),
  item("anime_release_mode_schedule", "ip_governance", ["IRIS_ANIME_RELEASE_MODE_SCHEDULE_ID"], "schedule_selector"),
  item("anime_character_communication_mode_policy", "ip_governance", ["IRIS_ANIME_CHARACTER_COMMUNICATION_MODE_POLICY_ID"], "policy_selector"),
  item("fan_growth_lifecycle_policy", "growth_business", ["IRIS_FAN_GROWTH_LIFECYCLE_POLICY_ID"], "policy_selector"),
  item("community_ritual_review_policy", "growth_business", ["IRIS_COMMUNITY_RITUAL_REVIEW_POLICY_ID"], "policy_selector"),
  item("ai_transparency_disclosure_policy", "growth_business", ["IRIS_AI_TRANSPARENCY_DISCLOSURE_POLICY_ID"], "policy_selector"),
  item("content_strategy_approval_policy", "growth_business", ["IRIS_CONTENT_STRATEGY_APPROVAL_POLICY_ID"], "policy_selector"),
  item("monetization_safety_policy", "growth_business", ["IRIS_MONETIZATION_SAFETY_POLICY_ID"], "policy_selector"),
  item("operator_comfort_checklist", "growth_business", ["IRIS_OPERATOR_COMFORT_CHECKLIST_ID"], "checklist_selector"),
  item("cost_governance_budget_policy", "growth_business", ["IRIS_COST_GOVERNANCE_BUDGET_POLICY_ID"], "policy_selector"),
  item("public_analytics_export_policy", "growth_business", ["IRIS_PUBLIC_ANALYTICS_EXPORT_POLICY_ID"], "policy_selector"),
]);
export const ANIME_PERFORMANCE_REFERENCE_SETTING_IDS = new Set([
  "anime_performance_reference_profile",
]);
export const ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES = Object.freeze([
  "IRIS_VOICE_LICENSE_STREAM_USE_STATUS",
  "IRIS_VOICE_LICENSE_PRERECORDED_LINE_USE_STATUS",
  "IRIS_VOICE_LICENSE_VOICE_PRODUCT_USE_STATUS",
  "IRIS_VOICE_LICENSE_SPONSOR_CAMPAIGN_USE_STATUS",
]);
const VOICE_LICENSE_USE_CATEGORY_ENV_NAMES =
  ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES;
export const ANIME_PERFORMANCE_EXPRESSION_MOTION_SETTING_IDS = new Set([
  "anime_expression_match_profile",
  "anime_gaze_blink_match_profile",
  "anime_mouth_lipsync_match_profile",
  "anime_posture_gesture_match_profile",
  "anime_idle_breathing_motion_profile",
]);
export const ANIME_PERFORMANCE_VOICE_SPEECH_SETTING_IDS = new Set([
  "anime_voice_quality_match_profile",
  "anime_intonation_accent_match_profile",
  "anime_catchphrase_policy",
  "anime_speech_timing_profile",
  "anime_subtitle_pacing_profile",
  "anime_performance_approval_status",
]);
export const ANIME_PERFORMANCE_IP_GOVERNANCE_SETTING_IDS = new Set([
  "anime_canon_bible_profile",
  "anime_spoiler_release_policy",
  "anime_non_canon_label_policy",
  "anime_ip_owner_approval_status",
  "anime_canon_layer_policy",
  "anime_stream_mode_policy",
  "anime_release_mode_schedule",
  "anime_character_communication_mode_policy",
]);
export const ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_SETTING_IDS = new Set([
  "voice_license_stream_use_status",
  "voice_license_prerecorded_line_use_status",
  "voice_license_voice_product_use_status",
  "voice_license_sponsor_campaign_use_status",
]);
export const ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES = Object.freeze([
  "reference",
  "expression_motion",
  "voice_speech",
  "ip_governance",
  "voice_license_use_category",
]);
export const ANIME_PERFORMANCE_IDENTITY_SURFACE_COUNT =
  ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES.length;
export const ANIME_PERFORMANCE_IDENTITY_SURFACE_ENV_GROUPS = Object.freeze([
  Object.freeze([
    "anime_reference_profile",
    Object.freeze(["IRIS_ANIME_PERFORMANCE_REFERENCE_PROFILE_ID"]),
  ]),
  Object.freeze([
    "expression_motion_match",
    Object.freeze([
      "IRIS_ANIME_EXPRESSION_MATCH_PROFILE_ID",
      "IRIS_ANIME_GAZE_BLINK_MATCH_PROFILE_ID",
      "IRIS_ANIME_MOUTH_LIPSYNC_MATCH_PROFILE_ID",
      "IRIS_ANIME_POSTURE_GESTURE_MATCH_PROFILE_ID",
      "IRIS_ANIME_IDLE_BREATHING_MOTION_PROFILE_ID",
    ]),
  ]),
  Object.freeze([
    "voice_speech_match",
    Object.freeze([
      "IRIS_ANIME_VOICE_QUALITY_MATCH_PROFILE_ID",
      "IRIS_ANIME_INTONATION_ACCENT_MATCH_PROFILE_ID",
      "IRIS_ANIME_CATCHPHRASE_POLICY_ID",
      "IRIS_ANIME_SPEECH_TIMING_PROFILE_ID",
      "IRIS_ANIME_SUBTITLE_PACING_PROFILE_ID",
      "IRIS_ANIME_PERFORMANCE_APPROVAL_STATUS",
    ]),
  ]),
  Object.freeze([
    "ip_governance",
    Object.freeze([
      "IRIS_ANIME_CANON_BIBLE_PROFILE_ID",
      "IRIS_ANIME_SPOILER_RELEASE_POLICY_ID",
      "IRIS_ANIME_NON_CANON_LABEL_POLICY_ID",
      "IRIS_ANIME_IP_OWNER_APPROVAL_STATUS",
      "IRIS_ANIME_CANON_LAYER_POLICY_ID",
      "IRIS_ANIME_STREAM_MODE_POLICY_ID",
      "IRIS_ANIME_RELEASE_MODE_SCHEDULE_ID",
      "IRIS_ANIME_CHARACTER_COMMUNICATION_MODE_POLICY_ID",
    ]),
  ]),
  Object.freeze([
    "voice_license_use_categories",
    Object.freeze([
      "IRIS_VOICE_LICENSE_STREAM_USE_STATUS",
      "IRIS_VOICE_LICENSE_PRERECORDED_LINE_USE_STATUS",
      "IRIS_VOICE_LICENSE_VOICE_PRODUCT_USE_STATUS",
      "IRIS_VOICE_LICENSE_SPONSOR_CAMPAIGN_USE_STATUS",
    ]),
  ]),
]);

function sumAnimePerformanceCategoryCounts(summary, suffix) {
  return ANIME_PERFORMANCE_IDENTITY_SURFACE_PREFIXES.reduce(
    (total, prefix) => total + summary[`${prefix}_${suffix}`],
    0
  );
}

export function createAdminCharacterVoiceSettingsReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const settings = SETTINGS.map((setting, index) => {
    const configuredEnvNames = setting.env_names.filter((name) =>
      hasConfiguredEnv(env, name)
    );
    return {
      schema: "iris_admin_character_voice_setting_v1",
      sequence_order: index + 1,
      setting_id: setting.setting_id,
      setting_group: setting.setting_group,
      admin_control: setting.admin_control,
      env_names: setting.env_names,
      env_name_count: setting.env_names.length,
      configured_env_names: configuredEnvNames,
      configured_env_count: configuredEnvNames.length,
      missing_env_names: setting.env_names.filter(
        (name) => !configuredEnvNames.includes(name)
      ),
      setting_status:
        configuredEnvNames.length > 0 ? "configured" : "not_configured",
      internal_guidance_only: true,
      changes_phase00_canonical_enums: false,
      exposes_setting_values: false,
      boundary_policy: itemBoundaryPolicy(),
    };
  });
  const configuredSettingCount = settings.filter(
    (setting) => setting.setting_status === "configured"
  ).length;
  const voiceEnvNames = uniqueEnvNamesForSettings(settings, (setting) => setting.setting_group === "voice");
  const configuredVoiceEnvNames = voiceEnvNames.filter((name) => hasConfiguredEnv(env, name));
  const missingVoiceEnvNames = voiceEnvNames.filter(
    (name) => !configuredVoiceEnvNames.includes(name)
  );
  const configuredVoiceLicenseUseCategoryCount =
    VOICE_LICENSE_USE_CATEGORY_ENV_NAMES.filter((name) => hasConfiguredEnv(env, name)).length;
  const report = {
    schema: "iris_admin_character_voice_settings_v1",
    generated_at_ms: generatedAtMs,
    report_status:
      configuredSettingCount === settings.length
        ? "ready_for_operator_review"
        : "configuration_attention",
    setting_count: settings.length,
    configured_setting_count: configuredSettingCount,
    missing_setting_count: settings.length - configuredSettingCount,
    settings,
    voice_source_summary: {
      schema: "iris_admin_voice_source_summary_v1",
      env_names: voiceEnvNames,
      env_name_count: voiceEnvNames.length,
      configured_env_names: configuredVoiceEnvNames,
      configured_env_count: configuredVoiceEnvNames.length,
      missing_env_names: missingVoiceEnvNames,
      missing_env_count: missingVoiceEnvNames.length,
      safe_source_status_label: safeVoiceSourceStatusLabel(
        env.IRIS_LICENSED_VOICE_SOURCE_STATUS
      ),
      fallback_voice_handoff_status: fallbackVoiceHandoffStatus(
        env.IRIS_LICENSED_VOICE_SOURCE_STATUS
      ),
      fallback_voice_policy_label: safeFallbackVoicePolicyLabel(
        env.IRIS_FALLBACK_VOICE_POLICY,
        env.IRIS_LICENSED_VOICE_SOURCE_STATUS
      ),
      voice_license_use_category_count: VOICE_LICENSE_USE_CATEGORY_ENV_NAMES.length,
      voice_license_use_category_configured_count:
        configuredVoiceLicenseUseCategoryCount,
      voice_license_use_category_missing_count:
        VOICE_LICENSE_USE_CATEGORY_ENV_NAMES.length -
        configuredVoiceLicenseUseCategoryCount,
      character_voice_profile_configured: hasConfiguredEnv(
        env,
        "IRIS_CHARACTER_VOICE_PROFILE_ID"
      ),
      character_voice_style_profile_configured: hasConfiguredEnv(
        env,
        "IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID"
      ),
    },
    boundary_policy: reportBoundaryPolicy(),
  };
  assertAdminCharacterVoiceSettingsReportSafe(report);
  return report;
}

export function createAdminCharacterVoiceSettingsAnimePerformanceSummary({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const report = createAdminCharacterVoiceSettingsReport({ env, generatedAtMs });
  const performanceSettings = report.settings.filter(
    (setting) =>
      setting.setting_group === "performance" ||
      setting.setting_group === "ip_governance" ||
      ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_SETTING_IDS.has(
        setting.setting_id
      )
  );
  const referenceCounts = countSettingsByIds(
    performanceSettings,
    ANIME_PERFORMANCE_REFERENCE_SETTING_IDS
  );
  const expressionMotionCounts = countSettingsByIds(
    performanceSettings,
    ANIME_PERFORMANCE_EXPRESSION_MOTION_SETTING_IDS
  );
  const voiceSpeechCounts = countSettingsByIds(
    performanceSettings,
    ANIME_PERFORMANCE_VOICE_SPEECH_SETTING_IDS
  );
  const ipGovernanceCounts = countSettingsByIds(
    SETTINGS,
    ANIME_PERFORMANCE_IP_GOVERNANCE_SETTING_IDS
  );
  const voiceLicenseUseCategoryCounts = countSettingsByIds(
    performanceSettings,
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
    schema: "iris_admin_character_voice_settings_anime_performance_summary_v1",
    setting_count: performanceSettings.length,
    configured_setting_count: performanceSettings.filter(
      (setting) => setting.setting_status === "configured"
    ).length,
    missing_setting_count: performanceSettings.filter(
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
  assertAdminCharacterVoiceSettingsAnimePerformanceSummarySafe(summary);
  return summary;
}

export function createAdminCharacterVoiceSettingsApplyPlan({
  body = {},
  generatedAtMs = Date.now(),
} = {}) {
  const requestedSettings = Array.isArray(body?.settings) ? body.settings : [];
  const safeSettingIds = requestedSettings
    .map((setting) => String(setting?.setting_id ?? "").trim())
    .filter((settingId) => SETTING_IDS.has(settingId));
  const rejectedSettingCount = requestedSettings.length - safeSettingIds.length;
  const unsafeValueCount = requestedSettings.filter((setting) =>
    hasUnsafeSettingValue(setting?.setting_value)
  ).length;
  const plan = {
    schema: "iris_admin_character_voice_settings_apply_plan_v1",
    generated_at_ms: generatedAtMs,
    apply_status:
      rejectedSettingCount === 0 && unsafeValueCount === 0
        ? "validated_for_operator_review"
        : "blocked",
    dry_run_only: true,
    store_write_performed: false,
    runtime_change_performed: false,
    requested_setting_count: requestedSettings.length,
    accepted_setting_count: safeSettingIds.length,
    rejected_setting_count: rejectedSettingCount,
    unsafe_value_count: unsafeValueCount,
    accepted_setting_ids: [...new Set(safeSettingIds)],
    internal_guidance_only: true,
    changes_phase00_canonical_enums: false,
    values_hidden: true,
    owner_confirmation_required_before_save: true,
    boundary_policy: {
      dry_run_only: true,
      setting_ids_only: true,
      no_setting_values: true,
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
      no_store_write: true,
      no_runtime_change: true,
    },
  };
  assertAdminCharacterVoiceSettingsApplyPlanSafe(plan);
  return plan;
}

export function createAnimeCanonLayerSafeLabel({ value } = {}) {
  const normalized = String(value ?? "").trim();
  const domainLabel = ANIME_CANON_LAYER_DOMAIN_LABELS.has(normalized)
    ? normalized
    : "unrecognized_domain_label";
  const label = {
    schema: "iris_anime_canon_layer_safe_label_v1",
    domain_label: domainLabel,
    label_status: ANIME_CANON_LAYER_DOMAIN_LABELS.has(domainLabel)
      ? "recognized"
      : "unrecognized",
    internal_guidance_only: true,
    changes_phase00_canonical_enums: false,
    canon_layer_separated: true,
    canon_mutation_allowed: false,
    auto_promotes_to_anime_canon: false,
    official_adoption_review_status: "requires_admin_review",
    community_lore_approval_status: "candidate_pending_review",
    official_material_status: "not_official",
    boundary_policy: {
      domain_label_only: true,
      canon_layer_separation_required: true,
      no_fan_memory_canon_write: true,
      no_relationship_memory_canon_write: true,
      no_relationship_memory_character_bible_write: true,
      no_character_bible_mutation: true,
      no_silent_anime_canon_mutation: true,
      review_queue_required_for_official_adoption: true,
      community_lore_requires_approval: true,
      unapproved_lore_not_official: true,
      no_phase00_canonical_enum_changes: true,
      no_canonical_intent_or_action_type: true,
      no_setting_values: true,
      no_commands: true,
    },
  };
  assertAnimeCanonLayerSafeLabel(label);
  return label;
}

export function createSpoilerModeSafeStatus({
  mode,
  releaseWindow = "operator_review_required",
} = {}) {
  const status = safeSpoilerModeStatus(mode);
  const releaseLabel = safeSpoilerModeStatus(releaseWindow);
  const summary = {
    schema: "iris_spoiler_mode_safe_status_v1",
    spoiler_mode_status: status,
    release_window_label: releaseLabel,
    safe_status_only: true,
    raw_material_exposed: false,
    boundary_policy: {
      status_labels_only: true,
      no_raw_story_bible: true,
      no_unreleased_plot: true,
      no_private_production_notes: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertSpoilerModeSafeStatus(summary);
  return summary;
}

export function createAnimeSpoilerCalendarSafeStatus({
  unlockConditionKnown = false,
  unlockConditionMet = false,
  ownerApproved = false,
} = {}) {
  const unlockAllowed =
    unlockConditionKnown === true &&
    unlockConditionMet === true &&
    ownerApproved === true;
  const summary = {
    schema: "iris_anime_spoiler_calendar_safe_status_v1",
    calendar_status: unlockAllowed ? "public_release_allowed" : "spoiler_limited",
    unlock_condition_known: unlockConditionKnown === true,
    unlock_condition_met: unlockConditionMet === true,
    owner_approved: ownerApproved === true,
    spoiler_safe: unlockAllowed !== true,
    safe_status_only: true,
    raw_material_exposed: false,
    boundary_policy: {
      fail_closed_when_unknown: true,
      safe_status_labels_only: true,
      no_story_source_material: true,
      no_future_release_detail: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertAnimeSpoilerCalendarSafeStatus(summary);
  return summary;
}

export function createSpoilerIncidentSafeSummary({
  incidentCount = 0,
  incidentStatus,
  topicClass,
} = {}) {
  const count = Math.max(0, Math.floor(Number(incidentCount) || 0));
  const status = safeSpoilerIncidentStatus(incidentStatus, count);
  const summary = {
    schema: "iris_spoiler_incident_safe_summary_v1",
    incident_status: status,
    incident_count: count,
    topic_class: safeSpoilerIncidentTopicClass(topicClass),
    safe_summary_only: true,
    raw_material_exposed: false,
    boundary_policy: {
      safe_label_count_topic_class_only: true,
      no_unreleased_details: true,
      no_raw_story_bible: true,
      no_raw_scene_details: true,
      no_private_production_notes: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertSpoilerIncidentSafeSummary(summary);
  return summary;
}

export function createAnimeReleaseModeTransitionPreview({
  currentMode,
  requestedMode,
  operatorApproved = false,
} = {}) {
  const currentReleaseMode = safeAnimeReleaseMode(currentMode);
  const requestedReleaseMode = safeAnimeReleaseMode(requestedMode);
  const approved = operatorApproved === true;
  const preview = {
    schema: "iris_anime_release_mode_transition_preview_v1",
    transition_status: approved ? "approved_preview" : "operator_approval_required",
    current_release_mode: currentReleaseMode,
    requested_release_mode: requestedReleaseMode,
    preview_only: true,
    operator_approval_required: approved !== true,
    public_mode_changed: false,
    boundary_policy: {
      preview_status_only: true,
      no_public_mode_switch_without_operator_approval: true,
      no_runtime_change: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertAnimeReleaseModeTransitionPreview(preview);
  return preview;
}

export function createAnimeExperienceModeStatus({ mode } = {}) {
  const experienceMode = safeAnimeExperienceMode(mode);
  const status = {
    schema: "iris_anime_experience_mode_status_v1",
    experience_mode: experienceMode,
    mode_status: "experience_mode",
    experience_mode_only: true,
    changes_phase00_canonical_enums: false,
    boundary_policy: {
      experience_mode_only: true,
      no_phase00_canonical_enum_changes: true,
      no_canonical_conversation_state_export: true,
      no_canonical_intent_or_action_type: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertAnimeExperienceModeStatus(status);
  return status;
}

export function createAnimeInCharacterFallbackRiskSummary({
  fallbackOutOfCharacter = false,
  fallbackOccurrenceCount,
  operatorAttentionRequired,
} = {}) {
  const fallbackTriggered = fallbackOutOfCharacter === true;
  const occurrenceCount =
    fallbackOccurrenceCount === undefined
      ? fallbackTriggered
        ? 1
        : 0
      : Math.max(0, Math.floor(Number(fallbackOccurrenceCount) || 0));
  const repeatedFallback = occurrenceCount > 1;
  const summary = {
    schema: "iris_anime_in_character_fallback_risk_summary_v1",
    fallback_out_of_character: fallbackTriggered,
    fallback_occurrence_count: occurrenceCount,
    fallback_frequency_status: repeatedFallback
      ? "repeated_quality_risk"
      : fallbackTriggered
        ? "single_fallback"
        : "no_fallback",
    quality_risk_status: fallbackTriggered || repeatedFallback
      ? "in_character_quality_attention"
      : "in_character_quality_nominal",
    operator_attention_required:
      operatorAttentionRequired === undefined
        ? fallbackTriggered || repeatedFallback
        : operatorAttentionRequired === true,
    safe_summary_only: true,
    raw_material_exposed: false,
    boundary_policy: {
      safe_quality_risk_summary_only: true,
      repeated_fallback_as_quality_risk: true,
      no_story_source_material: true,
      no_private_reference_notes: true,
      no_raw_reason: true,
      no_voice_materials: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertAnimeInCharacterFallbackRiskSummary(summary);
  return summary;
}

export function createCharacterImageRiskSummary({
  imageDriftDetected = false,
  riskItemCount = 0,
  operatorAttentionRequired,
} = {}) {
  const count = Number.isInteger(riskItemCount) && riskItemCount > 0 ? riskItemCount : 0;
  const hasRisk = imageDriftDetected === true || count > 0;
  const summary = {
    schema: "iris_character_image_risk_summary_v1",
    image_drift_risk_label: hasRisk ? "image_drift_attention" : "image_drift_nominal",
    risk_item_count: count,
    operator_attention_required:
      operatorAttentionRequired === undefined ? hasRisk : operatorAttentionRequired === true,
    safe_summary_only: true,
    raw_material_exposed: false,
    boundary_policy: {
      safe_label_and_count_only: true,
      no_raw_production_materials: true,
      no_raw_story_bible: true,
      no_raw_animation_cuts: true,
      no_model_sheets: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertCharacterImageRiskSummary(summary);
  return summary;
}

export function createCharacterBibleSafeSummary({ sourceStatus } = {}) {
  const status = safeCharacterBibleStatus(sourceStatus);
  const summary = {
    schema: "iris_character_bible_safe_summary_v1",
    summary_status: status,
    reference_status_label: status,
    safe_summary_label:
      status === "available_for_operator_review"
        ? "character_reference_available"
        : "character_reference_attention",
    raw_material_exposed: false,
    boundary_policy: {
      safe_summary_only: true,
      no_raw_story_bible: true,
      no_script_excerpts: true,
      no_private_production_notes: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertCharacterBibleSafeSummary(summary);
  return summary;
}

export function createAnimePerformanceReadinessSummary({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const summary = createAdminCharacterVoiceSettingsAnimePerformanceSummary({
    env,
    generatedAtMs,
  });
  const readiness = {
    schema: "iris_anime_performance_readiness_summary_v1",
    readiness_status:
      summary.missing_setting_count === 0
        ? "ready"
        : "operator_attention_required",
    expression_motion_status:
      summary.expression_motion_missing_setting_count === 0
        ? "ready"
        : "operator_attention_required",
    voice_speech_status:
      summary.voice_speech_missing_setting_count === 0
        ? "ready"
        : "operator_attention_required",
    reference_status:
      summary.reference_missing_setting_count === 0
        ? "ready"
        : "operator_attention_required",
    required_setting_count: summary.setting_count,
    configured_setting_count: summary.configured_setting_count,
    missing_setting_count: summary.missing_setting_count,
    expression_motion_setting_count: summary.expression_motion_setting_count,
    expression_motion_configured_setting_count:
      summary.expression_motion_configured_setting_count,
    expression_motion_missing_setting_count:
      summary.expression_motion_missing_setting_count,
    voice_speech_setting_count: summary.voice_speech_setting_count,
    voice_speech_configured_setting_count:
      summary.voice_speech_configured_setting_count,
    voice_speech_missing_setting_count: summary.voice_speech_missing_setting_count,
    reference_setting_count: summary.reference_setting_count,
    reference_configured_setting_count: summary.reference_configured_setting_count,
    reference_missing_setting_count: summary.reference_missing_setting_count,
    raw_material_exposed: false,
    boundary_policy: {
      counts_and_status_only: true,
      no_raw_reference_clips: true,
      no_raw_voice_samples: true,
      no_model_sheets: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertAnimePerformanceReadinessSummarySafe(readiness);
  return readiness;
}

export function createVoiceSubtitlePreflightAdminPageSummary({
  voiceConfigured = false,
  subtitleConfigured = false,
  voiceStatus = "attention",
  subtitleStatus = "attention",
  repairStatus = "operator_attention_required",
} = {}) {
  const configuredCount =
    (voiceConfigured === true ? 1 : 0) + (subtitleConfigured === true ? 1 : 0);
  const attentionCount =
    (voiceStatus === "ready" ? 0 : 1) + (subtitleStatus === "ready" ? 0 : 1);
  const summary = {
    schema: "iris_voice_subtitle_preflight_admin_page_summary_v1",
    page_status: attentionCount === 0 ? "ready" : "attention",
    voice_configured: voiceConfigured === true,
    subtitle_configured: subtitleConfigured === true,
    voice_status: safePreflightStatus(voiceStatus),
    subtitle_status: safePreflightStatus(subtitleStatus),
    repair_status: safeRepairStatus(repairStatus),
    configured_count: configuredCount,
    attention_count: attentionCount,
    boundary_policy: {
      configured_status_repair_counts_only: true,
      no_raw_audio: true,
      no_subtitle_cues: true,
      no_vendor_diagnostics: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_candidates: true,
      no_commands: true,
      read_only_preflight: true,
    },
  };
  assertVoiceSubtitlePreflightAdminPageSummarySafe(summary);
  return summary;
}

export function createGazeBlinkMouthSyncStatus({ env = process.env } = {}) {
  const gazeBlinkConfigured =
    hasConfiguredEnv(env, "IRIS_ANIME_GAZE_BLINK_MATCH_PROFILE_ID") === true;
  const mouthSyncConfigured =
    hasConfiguredEnv(env, "IRIS_ANIME_MOUTH_LIPSYNC_MATCH_PROFILE_ID") === true;
  const configuredCount =
    (gazeBlinkConfigured ? 1 : 0) + (mouthSyncConfigured ? 1 : 0);
  const status = {
    schema: "iris_gaze_blink_mouth_sync_status_v1",
    gaze_blink_status: gazeBlinkConfigured ? "configured" : "missing",
    mouth_sync_status: mouthSyncConfigured ? "configured" : "missing",
    required_setting_count: 2,
    configured_setting_count: configuredCount,
    missing_setting_count: 2 - configuredCount,
    raw_material_exposed: false,
    boundary_policy: {
      counts_and_status_only: true,
      no_raw_animation_cuts: true,
      no_internal_paths: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertGazeBlinkMouthSyncStatusSafe(status);
  return status;
}

export function createMotionRecoveryMatchStatus({ env = process.env } = {}) {
  const motionConfigured =
    hasConfiguredEnv(env, "IRIS_ANIME_POSTURE_GESTURE_MATCH_PROFILE_ID") === true;
  const recoveryConfigured =
    hasConfiguredEnv(env, "IRIS_ANIME_IDLE_BREATHING_MOTION_PROFILE_ID") === true;
  const configuredCount =
    (motionConfigured ? 1 : 0) + (recoveryConfigured ? 1 : 0);
  const status = {
    schema: "iris_motion_recovery_match_status_v1",
    motion_match_status: motionConfigured ? "configured" : "missing",
    recovery_match_status: recoveryConfigured ? "configured" : "missing",
    required_setting_count: 2,
    configured_setting_count: configuredCount,
    missing_setting_count: 2 - configuredCount,
    raw_material_exposed: false,
    boundary_policy: {
      safe_status_only: true,
      counts_and_status_only: true,
      no_raw_motion_command: true,
      no_raw_frames: true,
      no_raw_renderer_jobs: true,
      no_model_paths: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertMotionRecoveryMatchStatusSafe(status);
  return status;
}

export function createVoiceQualityMatchStatus({ env = process.env } = {}) {
  const voiceQualityConfigured =
    hasConfiguredEnv(env, "IRIS_ANIME_VOICE_QUALITY_MATCH_PROFILE_ID") === true;
  const intonationConfigured =
    hasConfiguredEnv(env, "IRIS_ANIME_INTONATION_ACCENT_MATCH_PROFILE_ID") === true;
  const configuredCount =
    (voiceQualityConfigured ? 1 : 0) + (intonationConfigured ? 1 : 0);
  const status = {
    schema: "iris_voice_quality_match_status_v1",
    voice_quality_status: voiceQualityConfigured ? "configured" : "missing",
    intonation_status: intonationConfigured ? "configured" : "missing",
    voice_readiness_label:
      configuredCount === 2
        ? "voice_match_ready"
        : "voice_match_operator_attention",
    required_setting_count: 2,
    configured_setting_count: configuredCount,
    missing_setting_count: 2 - configuredCount,
    raw_material_exposed: false,
    boundary_policy: {
      safe_readiness_label_only: true,
      counts_and_status_only: true,
      no_raw_voice_samples: true,
      no_voice_datasets: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertVoiceQualityMatchStatusSafe(status);
  return status;
}

export function createCatchphraseSceneFitStatus({
  usageCount = 0,
  sceneFitStatus = "operator_review_required",
} = {}) {
  const safeUsageCount = Math.max(0, Math.floor(Number(usageCount) || 0));
  const normalizedStatus = safeCatchphraseFitStatus(sceneFitStatus);
  const status = {
    schema: "iris_catchphrase_scene_fit_status_v1",
    catchphrase_fit_status: normalizedStatus,
    usage_count: safeUsageCount,
    overuse_risk_status:
      safeUsageCount > 3 ? "overuse_attention" : "usage_within_limit",
    raw_material_exposed: false,
    boundary_policy: {
      usage_count_and_status_only: true,
      no_private_script_excerpt: true,
      no_raw_dialogue_notes: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertCatchphraseSceneFitStatusSafe(status);
  return status;
}

export function createPerformanceDriftReviewQueue({
  reviewItemCount = 0,
  driftDomainCounts = {},
} = {}) {
  const safeDomainCounts = safePerformanceDriftDomainCounts(driftDomainCounts);
  const explicitCount = Math.max(0, Math.floor(Number(reviewItemCount) || 0));
  const domainTotal = Object.values(safeDomainCounts).reduce(
    (total, count) => total + count,
    0
  );
  const itemCount = Math.max(explicitCount, domainTotal);
  const queue = {
    schema: "iris_performance_drift_review_queue_v1",
    queue_status: itemCount > 0 ? "operator_review_required" : "empty",
    review_item_count: itemCount,
    drift_domain_counts: safeDomainCounts,
    safe_summary_only: true,
    raw_material_exposed: false,
    boundary_policy: {
      safe_summary_only: true,
      counts_and_status_only: true,
      no_raw_production_materials: true,
      no_voice_materials: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertPerformanceDriftReviewQueueSafe(queue);
  return queue;
}

export function createVoiceLicenseCategoryReadiness({
  env = process.env,
} = {}) {
  const categoryStatuses = VOICE_LICENSE_USE_CATEGORY_MAP.map(
    ([category, envName]) => ({
      category,
      status: safeVoiceLicenseCategoryStatus(env?.[envName]),
    })
  );
  const readyCategoryCount = categoryStatuses.filter(
    ({ status }) => status === "licensed" || status === "placeholder"
  ).length;
  const readiness = {
    schema: "iris_voice_license_category_readiness_v1",
    category_statuses: categoryStatuses,
    category_count: categoryStatuses.length,
    ready_category_count: readyCategoryCount,
    attention_category_count: categoryStatuses.length - readyCategoryCount,
    safe_status_only: true,
    raw_material_exposed: false,
    boundary_policy: {
      category_status_only: true,
      no_contract_text: true,
      no_fee_tables: true,
      no_private_actor_data: true,
      no_raw_voice_samples: true,
      no_voice_datasets: true,
      no_model_paths: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertVoiceLicenseCategoryReadinessSafe(readiness);
  return readiness;
}

export function createUnreleasedFootageLeakGuard({ surface = "runtime" } = {}) {
  const guard = {
    schema: "iris_production_material_leak_guard_v1",
    surface: safeUnreleasedFootageSurface(surface),
    guard_status: "protected",
    safe_summary_only: true,
    raw_material_exposed: false,
    boundary_policy: {
      no_unreleased_footage: true,
      no_raw_story_bible: true,
      no_raw_script_excerpts: true,
      no_raw_voice_samples: true,
      no_raw_animation_cuts: true,
      no_raw_model_sheets: true,
      no_runtime_raw_material: true,
      no_public_raw_material: true,
      no_admin_ordinary_raw_material: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertUnreleasedFootageLeakGuardSafe(guard);
  return guard;
}

export function assertAdminCharacterVoiceSettingsReportSafe(
  report,
  context = "admin character voice settings"
) {
  assertSafeObject(report, context);
  if (report.schema !== "iris_admin_character_voice_settings_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!ADMIN_CHARACTER_VOICE_SETTINGS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field ${field}`);
    }
  }
  if (!["ready_for_operator_review", "configuration_attention"].includes(report.report_status)) {
    throw new ContractError(`${context}: invalid report status`);
  }
  if (!Array.isArray(report.settings) || report.settings.length !== SETTINGS.length) {
    throw new ContractError(`${context}: settings required`);
  }
  report.settings.forEach((setting) => assertSettingSafe(setting, context));
  if (
    new Set(report.settings.map((setting) => setting.setting_id)).size !==
    SETTINGS.length
  ) {
    throw new ContractError(`${context}: duplicate setting id`);
  }
  if (
    report.settings.some(
      (setting, index) => setting.sequence_order !== index + 1
    )
  ) {
    throw new ContractError(`${context}: setting sequence mismatch`);
  }
  if (report.setting_count !== report.settings.length) {
    throw new ContractError(`${context}: setting count mismatch`);
  }
  const configured = report.settings.filter(
    (setting) => setting.setting_status === "configured"
  ).length;
  if (
    report.configured_setting_count !== configured ||
    report.missing_setting_count !== report.settings.length - configured
  ) {
    throw new ContractError(`${context}: configured counts mismatch`);
  }
  assertVoiceSourceSummarySafe(report.voice_source_summary, context);
  assertBoundaryPolicy(report.boundary_policy, reportBoundaryPolicy(), context);
}

export function assertAdminCharacterVoiceSettingsAnimePerformanceSummarySafe(
  summary,
  context = "admin character voice settings anime performance summary"
) {
  assertSafeObject(summary, context);
  if (
    summary.schema !==
    "iris_admin_character_voice_settings_anime_performance_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !ADMIN_CHARACTER_VOICE_SETTINGS_ANIME_PERFORMANCE_SUMMARY_FIELDS.has(field)
    ) {
      throw new ContractError(`${context}: unexpected summary field ${field}`);
    }
  }
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
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    summary.configured_setting_count + summary.missing_setting_count !==
    summary.setting_count
  ) {
    throw new ContractError(`${context}: summary counts mismatch`);
  }
  assertCategoryCountsMatch(summary, "reference", context);
  assertCategoryCountsMatch(summary, "expression_motion", context);
  assertCategoryCountsMatch(summary, "voice_speech", context);
  assertCategoryCountsMatch(summary, "ip_governance", context);
  assertCategoryCountsMatch(summary, "voice_license_use_category", context);
  if (
    summary.anime_identity_surface_count !==
      ANIME_PERFORMANCE_IDENTITY_SURFACE_COUNT ||
    summary.anime_identity_configured_surface_count +
      summary.anime_identity_missing_surface_count !==
      summary.anime_identity_surface_count
  ) {
    throw new ContractError(`${context}: anime identity surface counts mismatch`);
  }
  if (
    sumAnimePerformanceCategoryCounts(summary, "setting_count") !==
    summary.setting_count
  ) {
    throw new ContractError(`${context}: category setting counts mismatch`);
  }
  if (
    sumAnimePerformanceCategoryCounts(summary, "configured_setting_count") !==
    summary.configured_setting_count
  ) {
    throw new ContractError(`${context}: category configured counts mismatch`);
  }
  if (
    sumAnimePerformanceCategoryCounts(summary, "missing_setting_count") !==
    summary.missing_setting_count
  ) {
    throw new ContractError(`${context}: category missing counts mismatch`);
  }
  if (
    summary.next_safe_script !== "npm run dev:admin:character-voice-settings:summary"
  ) {
    throw new ContractError(`${context}: invalid next safe script`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    {
      counts_statuses_and_script_names_only: true,
      no_setting_values: true,
      no_raw_voice_samples: true,
      no_raw_animation_cuts: true,
      no_raw_production_materials: true,
      no_raw_script_excerpts: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
}

export function assertAdminCharacterVoiceSettingsApplyPlanSafe(
  plan,
  context = "admin character voice settings apply plan"
) {
  assertSafeObject(plan, context);
  if (plan.schema !== "iris_admin_character_voice_settings_apply_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!ADMIN_CHARACTER_VOICE_SETTINGS_APPLY_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected apply plan field ${field}`);
    }
  }
  if (!["validated_for_operator_review", "blocked"].includes(plan.apply_status)) {
    throw new ContractError(`${context}: invalid apply status`);
  }
  for (const field of [
    "dry_run_only",
    "store_write_performed",
    "runtime_change_performed",
    "internal_guidance_only",
    "changes_phase00_canonical_enums",
    "values_hidden",
    "owner_confirmation_required_before_save",
  ]) {
    if (typeof plan[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (plan.dry_run_only !== true || plan.store_write_performed !== false) {
    throw new ContractError(`${context}: dry-run no-write boundary required`);
  }
  if (plan.changes_phase00_canonical_enums !== false) {
    throw new ContractError(`${context}: canonical enums must not change`);
  }
  for (const field of [
    "requested_setting_count",
    "accepted_setting_count",
    "rejected_setting_count",
    "unsafe_value_count",
  ]) {
    if (!Number.isInteger(plan[field]) || plan[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    !Array.isArray(plan.accepted_setting_ids) ||
    plan.accepted_setting_ids.some((settingId) => !SETTING_IDS.has(settingId))
  ) {
    throw new ContractError(`${context}: invalid accepted setting ids`);
  }
  if (new Set(plan.accepted_setting_ids).size !== plan.accepted_setting_ids.length) {
    throw new ContractError(`${context}: duplicate accepted setting ids`);
  }
  if (
    plan.accepted_setting_count + plan.rejected_setting_count !==
      plan.requested_setting_count ||
    plan.accepted_setting_ids.length !== plan.accepted_setting_count ||
    plan.unsafe_value_count > plan.requested_setting_count
  ) {
    throw new ContractError(`${context}: setting count mismatch`);
  }
  assertBoundaryPolicy(
    plan.boundary_policy,
    {
      dry_run_only: true,
      setting_ids_only: true,
      no_setting_values: true,
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
      no_store_write: true,
      no_runtime_change: true,
    },
    context
  );
}

export function assertAnimeCanonLayerSafeLabel(
  label,
  context = "anime canon layer safe label"
) {
  assertSafeObject(label, context);
  if (label.schema !== "iris_anime_canon_layer_safe_label_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(label)) {
    if (!ANIME_CANON_LAYER_SAFE_LABEL_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    label.label_status === "recognized" &&
    !ANIME_CANON_LAYER_DOMAIN_LABELS.has(label.domain_label)
  ) {
    throw new ContractError(`${context}: invalid recognized domain label`);
  }
  if (
    label.label_status === "unrecognized" &&
    label.domain_label !== "unrecognized_domain_label"
  ) {
    throw new ContractError(`${context}: unsafe unrecognized domain label`);
  }
  if (!["recognized", "unrecognized"].includes(label.label_status)) {
    throw new ContractError(`${context}: invalid label status`);
  }
  if (
    label.internal_guidance_only !== true ||
    label.changes_phase00_canonical_enums !== false ||
    label.canon_layer_separated !== true ||
    label.canon_mutation_allowed !== false ||
    label.auto_promotes_to_anime_canon !== false ||
    label.official_adoption_review_status !== "requires_admin_review" ||
    label.community_lore_approval_status !== "candidate_pending_review" ||
    label.official_material_status !== "not_official"
  ) {
    throw new ContractError(`${context}: domain label boundary invalid`);
  }
  assertNotCanonicalEnumValue(label.domain_label, context);
  assertBoundaryPolicy(
    label.boundary_policy,
    {
      domain_label_only: true,
      canon_layer_separation_required: true,
      no_fan_memory_canon_write: true,
      no_relationship_memory_canon_write: true,
      no_relationship_memory_character_bible_write: true,
      no_character_bible_mutation: true,
      no_silent_anime_canon_mutation: true,
      review_queue_required_for_official_adoption: true,
      community_lore_requires_approval: true,
      unapproved_lore_not_official: true,
      no_phase00_canonical_enum_changes: true,
      no_canonical_intent_or_action_type: true,
      no_setting_values: true,
      no_commands: true,
    },
    context
  );
}

export function assertSpoilerModeSafeStatus(
  summary,
  context = "spoiler mode safe status"
) {
  assertSafeObject(summary, context);
  if (summary.schema !== "iris_spoiler_mode_safe_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SPOILER_MODE_SAFE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    !SPOILER_MODE_SAFE_STATUSES.has(summary.spoiler_mode_status) ||
    !SPOILER_MODE_SAFE_STATUSES.has(summary.release_window_label)
  ) {
    throw new ContractError(`${context}: invalid safe status`);
  }
  if (summary.safe_status_only !== true || summary.raw_material_exposed !== false) {
    throw new ContractError(`${context}: raw material boundary invalid`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    {
      status_labels_only: true,
      no_raw_story_bible: true,
      no_unreleased_plot: true,
      no_private_production_notes: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoSpoilerRawMaterial(summary, context);
}

export function assertAnimeSpoilerCalendarSafeStatus(
  summary,
  context = "anime spoiler calendar safe status"
) {
  assertSafeObject(summary, context);
  if (summary.schema !== "iris_anime_spoiler_calendar_safe_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ANIME_SPOILER_CALENDAR_SAFE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!SPOILER_MODE_SAFE_STATUSES.has(summary.calendar_status)) {
    throw new ContractError(`${context}: invalid safe status`);
  }
  const unlockAllowed =
    summary.unlock_condition_known === true &&
    summary.unlock_condition_met === true &&
    summary.owner_approved === true;
  if (
    summary.safe_status_only !== true ||
    summary.raw_material_exposed !== false ||
    summary.spoiler_safe !== (unlockAllowed !== true)
  ) {
    throw new ContractError(`${context}: spoiler boundary invalid`);
  }
  if (!unlockAllowed && summary.calendar_status === "public_release_allowed") {
    throw new ContractError(`${context}: unknown or unmet unlock must fail closed`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    {
      fail_closed_when_unknown: true,
      safe_status_labels_only: true,
      no_story_source_material: true,
      no_future_release_detail: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoSpoilerRawMaterial(summary, context);
}

export function assertSpoilerIncidentSafeSummary(
  summary,
  context = "spoiler incident safe summary"
) {
  assertSafeObject(summary, context);
  if (summary.schema !== "iris_spoiler_incident_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SPOILER_INCIDENT_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    !SPOILER_INCIDENT_STATUSES.has(summary.incident_status) ||
    !SPOILER_INCIDENT_TOPIC_CLASSES.has(summary.topic_class)
  ) {
    throw new ContractError(`${context}: invalid safe label`);
  }
  if (!Number.isInteger(summary.incident_count) || summary.incident_count < 0) {
    throw new ContractError(`${context}: invalid incident count`);
  }
  if (
    summary.incident_count === 0 &&
    summary.incident_status !== "none"
  ) {
    throw new ContractError(`${context}: incident status/count mismatch`);
  }
  if (
    summary.incident_count > 0 &&
    summary.incident_status === "none"
  ) {
    throw new ContractError(`${context}: incident status/count mismatch`);
  }
  if (
    summary.safe_summary_only !== true ||
    summary.raw_material_exposed !== false
  ) {
    throw new ContractError(`${context}: safe summary boundary invalid`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    {
      safe_label_count_topic_class_only: true,
      no_unreleased_details: true,
      no_raw_story_bible: true,
      no_raw_scene_details: true,
      no_private_production_notes: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoSpoilerIncidentRawMaterial(summary, context);
}

export function assertAnimeReleaseModeTransitionPreview(
  preview,
  context = "anime release mode transition preview"
) {
  assertSafeObject(preview, context);
  if (preview.schema !== "iris_anime_release_mode_transition_preview_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(preview)) {
    if (!ANIME_RELEASE_MODE_TRANSITION_PREVIEW_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["operator_approval_required", "approved_preview"].includes(preview.transition_status)) {
    throw new ContractError(`${context}: invalid transition status`);
  }
  if (
    !ANIME_RELEASE_MODES.has(preview.current_release_mode) ||
    !ANIME_RELEASE_MODES.has(preview.requested_release_mode)
  ) {
    throw new ContractError(`${context}: invalid release mode`);
  }
  if (
    preview.preview_only !== true ||
    preview.public_mode_changed !== false ||
    (preview.transition_status === "operator_approval_required" &&
      preview.operator_approval_required !== true)
  ) {
    throw new ContractError(`${context}: transition preview boundary invalid`);
  }
  assertBoundaryPolicy(
    preview.boundary_policy,
    {
      preview_status_only: true,
      no_public_mode_switch_without_operator_approval: true,
      no_runtime_change: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
}

export function assertAnimeExperienceModeStatus(
  status,
  context = "anime experience mode status"
) {
  assertSafeObject(status, context);
  if (status.schema !== "iris_anime_experience_mode_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!ANIME_EXPERIENCE_MODE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!ANIME_EXPERIENCE_MODES.has(status.experience_mode)) {
    throw new ContractError(`${context}: invalid experience mode`);
  }
  assertNotCanonicalEnumValue(status.experience_mode, context);
  if (
    status.mode_status !== "experience_mode" ||
    status.experience_mode_only !== true ||
    status.changes_phase00_canonical_enums !== false
  ) {
    throw new ContractError(`${context}: canonical boundary invalid`);
  }
  assertBoundaryPolicy(
    status.boundary_policy,
    {
      experience_mode_only: true,
      no_phase00_canonical_enum_changes: true,
      no_canonical_conversation_state_export: true,
      no_canonical_intent_or_action_type: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
}

export function assertAnimeInCharacterFallbackRiskSummary(
  summary,
  context = "anime in-character fallback risk summary"
) {
  assertSafeObject(summary, context);
  if (summary.schema !== "iris_anime_in_character_fallback_risk_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ANIME_IN_CHARACTER_FALLBACK_RISK_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    typeof summary.fallback_out_of_character !== "boolean" ||
    !Number.isInteger(summary.fallback_occurrence_count) ||
    summary.fallback_occurrence_count < 0 ||
    typeof summary.operator_attention_required !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid fallback frequency summary`);
  }
  if (
    !["no_fallback", "single_fallback", "repeated_quality_risk"].includes(
      summary.fallback_frequency_status
    )
  ) {
    throw new ContractError(`${context}: invalid fallback frequency status`);
  }
  if (
    ![
      "in_character_quality_attention",
      "in_character_quality_nominal",
    ].includes(summary.quality_risk_status)
  ) {
    throw new ContractError(`${context}: invalid quality risk status`);
  }
  if (
    summary.fallback_out_of_character === true &&
    summary.quality_risk_status !== "in_character_quality_attention"
  ) {
    throw new ContractError(`${context}: fallback must be summarized as quality risk`);
  }
  if (
    summary.fallback_occurrence_count > 1 &&
    (summary.fallback_frequency_status !== "repeated_quality_risk" ||
      summary.quality_risk_status !== "in_character_quality_attention")
  ) {
    throw new ContractError(`${context}: repeated fallback frequency not summarized as risk`);
  }
  if (summary.safe_summary_only !== true || summary.raw_material_exposed !== false) {
    throw new ContractError(`${context}: raw material boundary invalid`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    {
      safe_quality_risk_summary_only: true,
      repeated_fallback_as_quality_risk: true,
      no_story_source_material: true,
      no_private_reference_notes: true,
      no_raw_reason: true,
      no_voice_materials: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoInCharacterFallbackRawMaterial(summary, context);
}

export function assertCharacterImageRiskSummary(
  summary,
  context = "character image risk summary"
) {
  assertSafeObject(summary, context);
  if (summary.schema !== "iris_character_image_risk_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!CHARACTER_IMAGE_RISK_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    !["image_drift_attention", "image_drift_nominal"].includes(
      summary.image_drift_risk_label
    )
  ) {
    throw new ContractError(`${context}: invalid risk label`);
  }
  if (!Number.isInteger(summary.risk_item_count) || summary.risk_item_count < 0) {
    throw new ContractError(`${context}: invalid risk count`);
  }
  if (
    typeof summary.operator_attention_required !== "boolean" ||
    summary.safe_summary_only !== true ||
    summary.raw_material_exposed !== false
  ) {
    throw new ContractError(`${context}: safe summary boundary invalid`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    {
      safe_label_and_count_only: true,
      no_raw_production_materials: true,
      no_raw_story_bible: true,
      no_raw_animation_cuts: true,
      no_model_sheets: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoCharacterImageRawMaterial(summary, context);
}

export function assertCharacterBibleSafeSummary(
  summary,
  context = "character bible safe summary"
) {
  assertSafeObject(summary, context);
  if (summary.schema !== "iris_character_bible_safe_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!CHARACTER_BIBLE_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    ![
      "available_for_operator_review",
      "missing_reference",
      "operator_review_required",
    ].includes(summary.summary_status) ||
    summary.reference_status_label !== summary.summary_status
  ) {
    throw new ContractError(`${context}: invalid summary status`);
  }
  if (
    ![
      "character_reference_available",
      "character_reference_attention",
    ].includes(summary.safe_summary_label)
  ) {
    throw new ContractError(`${context}: invalid safe summary label`);
  }
  if (summary.raw_material_exposed !== false) {
    throw new ContractError(`${context}: raw material exposed`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    {
      safe_summary_only: true,
      no_raw_story_bible: true,
      no_script_excerpts: true,
      no_private_production_notes: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoCharacterBibleRawMaterial(summary, context);
}

export function assertAnimePerformanceReadinessSummarySafe(
  summary,
  context = "anime performance readiness summary"
) {
  assertSafeObject(summary, context);
  if (summary.schema !== "iris_anime_performance_readiness_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ANIME_PERFORMANCE_READINESS_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  for (const field of [
    "readiness_status",
    "expression_motion_status",
    "voice_speech_status",
    "reference_status",
  ]) {
    if (!["ready", "operator_attention_required"].includes(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "required_setting_count",
    "configured_setting_count",
    "missing_setting_count",
    "expression_motion_setting_count",
    "expression_motion_configured_setting_count",
    "expression_motion_missing_setting_count",
    "voice_speech_setting_count",
    "voice_speech_configured_setting_count",
    "voice_speech_missing_setting_count",
    "reference_setting_count",
    "reference_configured_setting_count",
    "reference_missing_setting_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid count ${field}`);
    }
  }
  if (
    summary.configured_setting_count + summary.missing_setting_count !==
      summary.required_setting_count ||
    summary.expression_motion_configured_setting_count +
      summary.expression_motion_missing_setting_count !==
      summary.expression_motion_setting_count ||
    summary.voice_speech_configured_setting_count +
      summary.voice_speech_missing_setting_count !==
      summary.voice_speech_setting_count ||
    summary.reference_configured_setting_count +
      summary.reference_missing_setting_count !==
      summary.reference_setting_count
  ) {
    throw new ContractError(`${context}: count mismatch`);
  }
  if (summary.raw_material_exposed !== false) {
    throw new ContractError(`${context}: raw material exposed`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    {
      counts_and_status_only: true,
      no_raw_reference_clips: true,
      no_raw_voice_samples: true,
      no_model_sheets: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoAnimePerformanceRawMaterial(summary, context);
}

export function assertVoiceSubtitlePreflightAdminPageSummarySafe(
  summary,
  context = "voice subtitle preflight admin page summary"
) {
  assertSafeObject(summary, context);
  if (summary.schema !== "iris_voice_subtitle_preflight_admin_page_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!VOICE_SUBTITLE_PREFLIGHT_ADMIN_PAGE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["ready", "attention"].includes(summary.page_status)) {
    throw new ContractError(`${context}: invalid page status`);
  }
  for (const field of ["voice_configured", "subtitle_configured"]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of ["voice_status", "subtitle_status"]) {
    if (!["ready", "attention"].includes(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    ![
      "not_required",
      "operator_attention_required",
      "repair_available",
    ].includes(summary.repair_status)
  ) {
    throw new ContractError(`${context}: invalid repair status`);
  }
  for (const field of ["configured_count", "attention_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    summary.configured_count !==
      (summary.voice_configured ? 1 : 0) + (summary.subtitle_configured ? 1 : 0) ||
    summary.attention_count !==
      (summary.voice_status === "ready" ? 0 : 1) +
        (summary.subtitle_status === "ready" ? 0 : 1) ||
    summary.page_status !== (summary.attention_count === 0 ? "ready" : "attention")
  ) {
    throw new ContractError(`${context}: count/status mismatch`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    {
      configured_status_repair_counts_only: true,
      no_raw_audio: true,
      no_subtitle_cues: true,
      no_vendor_diagnostics: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_candidates: true,
      no_commands: true,
      read_only_preflight: true,
    },
    context
  );
  assertNoVoiceSubtitlePreflightRawMaterial(summary, context);
}

export function assertGazeBlinkMouthSyncStatusSafe(
  status,
  context = "gaze blink mouth sync status"
) {
  assertSafeObject(status, context);
  if (status.schema !== "iris_gaze_blink_mouth_sync_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!GAZE_BLINK_MOUTH_SYNC_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  for (const field of ["gaze_blink_status", "mouth_sync_status"]) {
    if (!["configured", "missing"].includes(status[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "required_setting_count",
    "configured_setting_count",
    "missing_setting_count",
  ]) {
    if (!Number.isInteger(status[field]) || status[field] < 0) {
      throw new ContractError(`${context}: invalid count ${field}`);
    }
  }
  if (
    status.required_setting_count !== 2 ||
    status.configured_setting_count + status.missing_setting_count !==
      status.required_setting_count ||
    status.raw_material_exposed !== false
  ) {
    throw new ContractError(`${context}: count or raw material boundary invalid`);
  }
  assertBoundaryPolicy(
    status.boundary_policy,
    {
      counts_and_status_only: true,
      no_raw_animation_cuts: true,
      no_internal_paths: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoAnimePerformanceRawMaterial(status, context);
}

export function assertMotionRecoveryMatchStatusSafe(
  status,
  context = "motion recovery match status"
) {
  assertSafeObject(status, context);
  if (status.schema !== "iris_motion_recovery_match_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!MOTION_RECOVERY_MATCH_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  for (const field of ["motion_match_status", "recovery_match_status"]) {
    if (!["configured", "missing"].includes(status[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "required_setting_count",
    "configured_setting_count",
    "missing_setting_count",
  ]) {
    if (!Number.isInteger(status[field]) || status[field] < 0) {
      throw new ContractError(`${context}: invalid count ${field}`);
    }
  }
  if (
    status.required_setting_count !== 2 ||
    status.configured_setting_count + status.missing_setting_count !==
      status.required_setting_count ||
    status.raw_material_exposed !== false
  ) {
    throw new ContractError(`${context}: count or raw material boundary invalid`);
  }
  assertBoundaryPolicy(
    status.boundary_policy,
    {
      safe_status_only: true,
      counts_and_status_only: true,
      no_raw_motion_command: true,
      no_raw_frames: true,
      no_raw_renderer_jobs: true,
      no_model_paths: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoMotionRecoveryRawMaterial(status, context);
}

export function assertVoiceQualityMatchStatusSafe(
  status,
  context = "voice quality match status"
) {
  assertSafeObject(status, context);
  if (status.schema !== "iris_voice_quality_match_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!VOICE_QUALITY_MATCH_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  for (const field of ["voice_quality_status", "intonation_status"]) {
    if (!["configured", "missing"].includes(status[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    !["voice_match_ready", "voice_match_operator_attention"].includes(
      status.voice_readiness_label
    )
  ) {
    throw new ContractError(`${context}: invalid readiness label`);
  }
  for (const field of [
    "required_setting_count",
    "configured_setting_count",
    "missing_setting_count",
  ]) {
    if (!Number.isInteger(status[field]) || status[field] < 0) {
      throw new ContractError(`${context}: invalid count ${field}`);
    }
  }
  if (
    status.required_setting_count !== 2 ||
    status.configured_setting_count + status.missing_setting_count !==
      status.required_setting_count ||
    status.raw_material_exposed !== false
  ) {
    throw new ContractError(`${context}: count or raw material boundary invalid`);
  }
  assertBoundaryPolicy(
    status.boundary_policy,
    {
      safe_readiness_label_only: true,
      counts_and_status_only: true,
      no_raw_voice_samples: true,
      no_voice_datasets: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoVoiceQualityRawMaterial(status, context);
}

export function assertCatchphraseSceneFitStatusSafe(
  status,
  context = "catchphrase scene-fit status"
) {
  assertSafeObject(status, context);
  if (status.schema !== "iris_catchphrase_scene_fit_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!CATCHPHRASE_SCENE_FIT_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (
    ![
      "scene_fit_ready",
      "scene_fit_limited",
      "operator_review_required",
    ].includes(status.catchphrase_fit_status)
  ) {
    throw new ContractError(`${context}: invalid fit status`);
  }
  if (!Number.isInteger(status.usage_count) || status.usage_count < 0) {
    throw new ContractError(`${context}: invalid usage count`);
  }
  if (
    !["usage_within_limit", "overuse_attention"].includes(
      status.overuse_risk_status
    ) ||
    (status.usage_count > 3 &&
      status.overuse_risk_status !== "overuse_attention") ||
    status.raw_material_exposed !== false
  ) {
    throw new ContractError(`${context}: usage status boundary invalid`);
  }
  assertBoundaryPolicy(
    status.boundary_policy,
    {
      usage_count_and_status_only: true,
      no_private_script_excerpt: true,
      no_raw_dialogue_notes: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoCatchphraseRawMaterial(status, context);
}

export function assertPerformanceDriftReviewQueueSafe(
  queue,
  context = "performance drift review queue"
) {
  assertSafeObject(queue, context);
  if (queue.schema !== "iris_performance_drift_review_queue_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(queue)) {
    if (!PERFORMANCE_DRIFT_REVIEW_QUEUE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["empty", "operator_review_required"].includes(queue.queue_status)) {
    throw new ContractError(`${context}: invalid queue status`);
  }
  if (!Number.isInteger(queue.review_item_count) || queue.review_item_count < 0) {
    throw new ContractError(`${context}: invalid review count`);
  }
  assertSafeObject(queue.drift_domain_counts, `${context}: domain counts`);
  const domainTotal = Object.values(queue.drift_domain_counts).reduce(
    (total, count) => {
      if (!Number.isInteger(count) || count < 0) {
        throw new ContractError(`${context}: invalid domain count`);
      }
      return total + count;
    },
    0
  );
  if (
    queue.review_item_count < domainTotal ||
    (queue.review_item_count > 0 &&
      queue.queue_status !== "operator_review_required") ||
    queue.safe_summary_only !== true ||
    queue.raw_material_exposed !== false
  ) {
    throw new ContractError(`${context}: safe summary boundary invalid`);
  }
  assertBoundaryPolicy(
    queue.boundary_policy,
    {
      safe_summary_only: true,
      counts_and_status_only: true,
      no_raw_production_materials: true,
      no_voice_materials: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoPerformanceDriftRawMaterial(queue, context);
}

export function assertVoiceLicenseCategoryReadinessSafe(
  readiness,
  context = "voice license category readiness"
) {
  assertSafeObject(readiness, context);
  if (readiness.schema !== "iris_voice_license_category_readiness_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(readiness)) {
    if (!VOICE_LICENSE_CATEGORY_READINESS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!Array.isArray(readiness.category_statuses)) {
    throw new ContractError(`${context}: invalid category statuses`);
  }
  const seenCategories = new Set();
  let readyCount = 0;
  for (const item of readiness.category_statuses) {
    assertSafeObject(item, `${context}: category status`);
    for (const field of Object.keys(item)) {
      if (!VOICE_LICENSE_CATEGORY_STATUS_FIELDS.has(field)) {
        throw new ContractError(`${context}: unexpected category field ${field}`);
      }
    }
    if (
      !VOICE_LICENSE_USE_CATEGORIES.has(item.category) ||
      seenCategories.has(item.category)
    ) {
      throw new ContractError(`${context}: invalid category`);
    }
    if (!VOICE_LICENSE_CATEGORY_STATUSES.has(item.status)) {
      throw new ContractError(`${context}: invalid category status`);
    }
    seenCategories.add(item.category);
    if (item.status === "licensed" || item.status === "placeholder") {
      readyCount += 1;
    }
  }
  for (const field of [
    "category_count",
    "ready_category_count",
    "attention_category_count",
  ]) {
    if (!Number.isInteger(readiness[field]) || readiness[field] < 0) {
      throw new ContractError(`${context}: invalid count ${field}`);
    }
  }
  if (
    readiness.category_count !== VOICE_LICENSE_USE_CATEGORY_MAP.length ||
    readiness.category_statuses.length !== readiness.category_count ||
    readiness.ready_category_count !== readyCount ||
    readiness.attention_category_count !==
      readiness.category_count - readiness.ready_category_count ||
    readiness.safe_status_only !== true ||
    readiness.raw_material_exposed !== false
  ) {
    throw new ContractError(`${context}: category status boundary invalid`);
  }
  assertBoundaryPolicy(
    readiness.boundary_policy,
    {
      category_status_only: true,
      no_contract_text: true,
      no_fee_tables: true,
      no_private_actor_data: true,
      no_raw_voice_samples: true,
      no_voice_datasets: true,
      no_model_paths: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoVoiceLicenseCategoryRawMaterial(readiness, context);
}

export function assertUnreleasedFootageLeakGuardSafe(
  guard,
  context = "unreleased footage leak guard"
) {
  assertSafeObject(guard, context);
  if (guard.schema !== "iris_production_material_leak_guard_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(guard)) {
    if (!UNRELEASED_FOOTAGE_LEAK_GUARD_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!UNRELEASED_FOOTAGE_SAFE_SURFACES.has(guard.surface)) {
    throw new ContractError(`${context}: invalid surface`);
  }
  if (
    guard.guard_status !== "protected" ||
    guard.safe_summary_only !== true ||
    guard.raw_material_exposed !== false
  ) {
    throw new ContractError(`${context}: raw material boundary invalid`);
  }
  assertBoundaryPolicy(
    guard.boundary_policy,
    {
      no_unreleased_footage: true,
      no_raw_story_bible: true,
      no_raw_script_excerpts: true,
      no_raw_voice_samples: true,
      no_raw_animation_cuts: true,
      no_raw_model_sheets: true,
      no_runtime_raw_material: true,
      no_public_raw_material: true,
      no_admin_ordinary_raw_material: true,
      no_setting_values: true,
      no_candidates: true,
      no_commands: true,
    },
    context
  );
  assertNoUnreleasedFootageRawMaterial(guard, context);
}

function item(settingId, settingGroup, envNames, adminControl) {
  return {
    setting_id: settingId,
    setting_group: settingGroup,
    env_names: envNames,
    admin_control: adminControl,
  };
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

function assertCategoryCountsMatch(summary, prefix, context) {
  if (
    summary[`${prefix}_configured_setting_count`] +
      summary[`${prefix}_missing_setting_count`] !==
    summary[`${prefix}_setting_count`]
  ) {
    throw new ContractError(`${context}: ${prefix} counts mismatch`);
  }
}

function assertSettingSafe(setting, context) {
  assertSafeObject(setting, context);
  if (setting.schema !== "iris_admin_character_voice_setting_v1") {
    throw new ContractError(`${context}: invalid setting schema`);
  }
  for (const field of Object.keys(setting)) {
    if (!ADMIN_CHARACTER_VOICE_SETTING_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected setting field ${field}`);
    }
  }
  if (!SETTING_IDS.has(setting.setting_id)) {
    throw new ContractError(`${context}: invalid setting id`);
  }
  if (
    ![
      "character",
      "voice",
      "motion",
      "performance",
      "ip_governance",
      "growth_business",
    ].includes(setting.setting_group)
  ) {
    throw new ContractError(`${context}: invalid setting group`);
  }
  if (!Number.isInteger(setting.sequence_order) || setting.sequence_order < 1) {
    throw new ContractError(`${context}: invalid setting sequence`);
  }
  for (const name of [
    ...setting.env_names,
    ...setting.configured_env_names,
    ...setting.missing_env_names,
  ]) {
    if (!ENV_NAME_PATTERN.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
  if (!["configured", "not_configured"].includes(setting.setting_status)) {
    throw new ContractError(`${context}: invalid setting status`);
  }
  if (
    !Array.isArray(setting.env_names) ||
    !Array.isArray(setting.configured_env_names) ||
    !Array.isArray(setting.missing_env_names) ||
    setting.env_name_count !== setting.env_names.length ||
    setting.configured_env_count !== setting.configured_env_names.length ||
    setting.configured_env_names.length + setting.missing_env_names.length !==
      setting.env_names.length
  ) {
    throw new ContractError(`${context}: setting env counts mismatch`);
  }
  if (
    setting.configured_env_names.some((name) => !setting.env_names.includes(name)) ||
    setting.missing_env_names.some((name) => !setting.env_names.includes(name))
  ) {
    throw new ContractError(`${context}: setting env names mismatch`);
  }
  if (
    setting.internal_guidance_only !== true ||
    setting.changes_phase00_canonical_enums !== false ||
    setting.exposes_setting_values !== false
  ) {
    throw new ContractError(`${context}: setting boundary flags invalid`);
  }
  assertBoundaryPolicy(setting.boundary_policy, itemBoundaryPolicy(), context);
}

function assertVoiceSourceSummarySafe(summary, context) {
  assertSafeObject(summary, context);
  if (summary.schema !== "iris_admin_voice_source_summary_v1") {
    throw new ContractError(`${context}: invalid voice source summary schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ADMIN_VOICE_SOURCE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: unexpected voice source summary field ${field}`
      );
    }
  }
  if (!["licensed", "placeholder", "not_configured", "operator_attention_required"].includes(summary.safe_source_status_label)) {
    throw new ContractError(`${context}: invalid voice source status`);
  }
  if (
    !["licensed_handoff", "safe_placeholder_handoff", "disabled_handoff"].includes(
      summary.fallback_voice_handoff_status
    )
  ) {
    throw new ContractError(`${context}: invalid fallback voice handoff status`);
  }
  if (
    !["licensed", "safe_placeholder", "disabled", "operator_review_required"].includes(
      summary.fallback_voice_policy_label
    )
  ) {
    throw new ContractError(`${context}: invalid fallback voice policy label`);
  }
  if (
    !Array.isArray(summary.env_names) ||
    !Array.isArray(summary.configured_env_names) ||
    !Array.isArray(summary.missing_env_names) ||
    summary.env_name_count !== summary.env_names.length ||
    summary.configured_env_count !== summary.configured_env_names.length ||
    summary.missing_env_count !== summary.missing_env_names.length ||
    summary.env_name_count !== summary.configured_env_count + summary.missing_env_count
  ) {
    throw new ContractError(`${context}: voice env counts mismatch`);
  }
  if (
    summary.voice_license_use_category_count !==
      VOICE_LICENSE_USE_CATEGORY_ENV_NAMES.length ||
    summary.voice_license_use_category_configured_count +
      summary.voice_license_use_category_missing_count !==
      summary.voice_license_use_category_count
  ) {
    throw new ContractError(`${context}: voice license use category counts mismatch`);
  }
  for (const name of [
    ...summary.env_names,
    ...summary.configured_env_names,
    ...summary.missing_env_names,
  ]) {
    if (!ENV_NAME_PATTERN.test(name)) {
      throw new ContractError(`${context}: invalid voice env name`);
    }
  }
}

function reportBoundaryPolicy() {
  return {
    read_only_report: true,
    env_names_only: true,
    fixed_setting_labels_only: true,
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
  };
}

function itemBoundaryPolicy() {
  return {
    env_names_only: true,
    no_setting_values: true,
    internal_guidance_only: true,
    no_canonical_enum_changes: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_raw_animation_cuts: true,
    no_raw_production_materials: true,
    no_raw_script_excerpts: true,
  };
}

function assertBoundaryPolicy(actual, expected, context) {
  assertSafeObject(actual, `${context}: boundary policy`);
  const allowedFields = new Set(Object.keys(expected));
  for (const field of Object.keys(actual)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const [field, value] of Object.entries(expected)) {
    if (actual?.[field] !== value) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertSafeObject(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: object required`);
  }
  const serialized = JSON.stringify(value);
  if (URL_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: unsafe value leaked`);
  }
}

function assertNotCanonicalEnumValue(value, context) {
  for (const [kind, allowed] of Object.entries(canonical)) {
    if (allowed.has(value)) {
      throw new ContractError(`${context}: domain label must not be canonical enum`, {
        kind,
        value,
      });
    }
  }
}

function uniqueEnvNamesForSettings(settings, predicate) {
  return [
    ...new Set(
      settings
        .filter(predicate)
        .flatMap((setting) => setting.env_names)
        .filter((name) => ENV_NAME_PATTERN.test(name))
    ),
  ];
}

function hasConfiguredEnv(env, name) {
  return String(env?.[name] ?? "").trim().length > 0;
}

function countConfiguredEnvNames(env, names) {
  return names.filter((name) => hasConfiguredEnv(env, name)).length;
}

function safeVoiceSourceStatusLabel(value) {
  const normalized = String(value ?? "").trim();
  if (["licensed", "placeholder", "operator_attention_required"].includes(normalized)) {
    return normalized;
  }
  return normalized === "" ? "not_configured" : "operator_attention_required";
}

function fallbackVoiceHandoffStatus(value) {
  const status = safeVoiceSourceStatusLabel(value);
  if (status === "licensed") return "licensed_handoff";
  if (status === "placeholder") return "safe_placeholder_handoff";
  return "disabled_handoff";
}

function safeFallbackVoicePolicyLabel(value, sourceStatus) {
  const status = safeVoiceSourceStatusLabel(sourceStatus);
  if (status === "licensed") return "licensed";
  const normalized = String(value ?? "").trim();
  if (normalized === "safe_placeholder") return "safe_placeholder";
  if (normalized === "disabled") return "disabled";
  return status === "placeholder" ? "safe_placeholder" : "operator_review_required";
}

function safePreflightStatus(value) {
  return value === "ready" ? "ready" : "attention";
}

function safeRepairStatus(value) {
  if (["not_required", "repair_available"].includes(value)) return value;
  return "operator_attention_required";
}

function safeSpoilerModeStatus(value) {
  const normalized = String(value ?? "").trim();
  return SPOILER_MODE_SAFE_STATUSES.has(normalized)
    ? normalized
    : "operator_review_required";
}

function safeSpoilerIncidentStatus(value, count) {
  const normalized = String(value ?? "").trim();
  if (count <= 0) return "none";
  return SPOILER_INCIDENT_STATUSES.has(normalized) && normalized !== "none"
    ? normalized
    : "operator_attention_required";
}

function safeSpoilerIncidentTopicClass(value) {
  const normalized = String(value ?? "").trim();
  return SPOILER_INCIDENT_TOPIC_CLASSES.has(normalized)
    ? normalized
    : "unknown";
}

function safeCatchphraseFitStatus(value) {
  const normalized = String(value ?? "").trim();
  return [
    "scene_fit_ready",
    "scene_fit_limited",
    "operator_review_required",
  ].includes(normalized)
    ? normalized
    : "operator_review_required";
}

function safePerformanceDriftDomainCounts(counts) {
  const safeCounts = {};
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    return safeCounts;
  }
  for (const [domain, count] of Object.entries(counts)) {
    if (
      ![
        "expression",
        "motion",
        "voice",
        "speech_style",
        "timing",
      ].includes(domain)
    ) {
      continue;
    }
    safeCounts[domain] = Math.max(0, Math.floor(Number(count) || 0));
  }
  return safeCounts;
}

function safeVoiceLicenseCategoryStatus(value) {
  const normalized = String(value ?? "").trim();
  if (normalized === "") return "missing";
  if (normalized === "licensed" || normalized === "placeholder") {
    return normalized;
  }
  return "operator_attention_required";
}

function safeUnreleasedFootageSurface(value) {
  const normalized = String(value ?? "").trim();
  return UNRELEASED_FOOTAGE_SAFE_SURFACES.has(normalized)
    ? normalized
    : "runtime";
}

function safeAnimeReleaseMode(value) {
  const normalized = String(value ?? "").trim();
  return ANIME_RELEASE_MODES.has(normalized) ? normalized : "pre_release_teaser";
}

function safeAnimeExperienceMode(value) {
  const normalized = String(value ?? "").trim();
  if (normalized === "spoiler_safe") return "spoiler_safe_in_character";
  if (normalized === "non_canon") return "non_canon_in_character";
  return ANIME_EXPERIENCE_MODES.has(normalized)
    ? normalized
    : "operational_disclosure";
}

function safeCharacterBibleStatus(value) {
  const normalized = String(value ?? "").trim();
  if (
    [
      "available_for_operator_review",
      "missing_reference",
      "operator_review_required",
    ].includes(normalized)
  ) {
    return normalized;
  }
  return normalized === "" ? "missing_reference" : "operator_review_required";
}

function hasUnsafeSettingValue(value) {
  if (value === undefined || value === null) return false;
  return FORBIDDEN_PATTERN.test(JSON.stringify(value));
}

function assertNoSpoilerRawMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /story[_ -]?bible|unreleased[_ -]?plot|private[_ -]?production[_ -]?note|raw[_ -]?script|raw[_ -]?production/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: raw spoiler material leaked`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSpoilerRawMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoSpoilerRawMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoSpoilerIncidentRawMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /unreleased[_ -]?(?:detail|plot|scene|ending|relationship)|hidden[_ -]?scene|story[_ -]?bible|raw[_ -]?story|raw[_ -]?scene|private[_ -]?production[_ -]?note|raw[_ -]?script|script[_ -]?excerpt/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: raw spoiler incident material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSpoilerIncidentRawMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoSpoilerIncidentRawMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoCharacterBibleRawMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /story[_ -]?bible|script[_ -]?excerpt|private[_ -]?production[_ -]?note|raw[_ -]?script|raw[_ -]?production/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: raw character bible material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoCharacterBibleRawMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoCharacterBibleRawMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoCharacterImageRawMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?production|production[_ -]?material|raw[_ -]?animation|animation[_ -]?cut|model[_ -]?sheet|story[_ -]?bible|private[_ -]?production[_ -]?note/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: raw character image material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoCharacterImageRawMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoCharacterImageRawMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoAnimePerformanceRawMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?reference[_ -]?clip|reference[_ -]?clip|voice[_ -]?sample|model[_ -]?sheet|raw[_ -]?voice/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: raw performance material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoAnimePerformanceRawMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoAnimePerformanceRawMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoMotionRecoveryRawMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?motion[_ -]?command|raw[_ -]?frame|raw[_ -]?renderer[_ -]?job|renderer[_ -]?job|model[_ -]?path/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: raw motion material leaked`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoMotionRecoveryRawMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoMotionRecoveryRawMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoVoiceQualityRawMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (/raw[_ -]?voice|voice[_ -]?sample|voice[_ -]?dataset|dataset/i.test(value)) {
      throw new ContractError(`${context}: raw voice material leaked`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoVoiceQualityRawMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoVoiceQualityRawMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoVoiceSubtitlePreflightRawMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?audio|raw[_ -]?voice|subtitle[_ -]?cue|speech[_ -]?cue|vendor[_ -]?diagnostic|vendor[_ -]?error|voice[_ -]?sample/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: raw voice subtitle material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoVoiceSubtitlePreflightRawMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (path.endsWith(".boundary_policy")) {
      continue;
    }
    if (
      /raw[_-]?audio|raw[_-]?voice|subtitle[_-]?cue|speech[_-]?cue|vendor[_-]?diagnostic/i.test(
        field
      )
    ) {
      throw new ContractError(`${context}: raw voice subtitle field leaked`, {
        path: `${path}.${field}`,
      });
    }
    assertNoVoiceSubtitlePreflightRawMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoCatchphraseRawMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (/private[_ -]?script|script[_ -]?excerpt|raw[_ -]?dialogue/i.test(value)) {
      throw new ContractError(`${context}: raw catchphrase material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoCatchphraseRawMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoCatchphraseRawMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoPerformanceDriftRawMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?production|production[_ -]?material|raw[_ -]?voice|voice[_ -]?sample|voice[_ -]?material/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: raw performance drift material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoPerformanceDriftRawMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoPerformanceDriftRawMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoVoiceLicenseCategoryRawMaterial(
  value,
  context,
  path = "root"
) {
  if (typeof value === "string") {
    if (
      /contract[_ -]?text|fee[_ -]?table|private[_ -]?actor|voice[_ -]?actor|private[_ -]?negotiation|raw[_ -]?voice|voice[_ -]?sample|voice[_ -]?dataset|training[_ -]?dataset|dataset|model[_ -]?path/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: raw voice license material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoVoiceLicenseCategoryRawMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoVoiceLicenseCategoryRawMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoUnreleasedFootageRawMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /unreleased[_ -]?footage|story[_ -]?bible|raw[_ -]?story|raw[_ -]?script|script[_ -]?excerpt|private[_ -]?production[_ -]?note|production[_ -]?note|raw[_ -]?voice|voice[_ -]?sample|raw[_ -]?animation(?:[_ -]?cut)?|animation[_ -]?cut|raw[_ -]?model[_ -]?sheet|model[_ -]?sheet|expression[_ -]?sheet|motion[_ -]?sheet|pose[_ -]?guide/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unreleased footage material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnreleasedFootageRawMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUnreleasedFootageRawMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoInCharacterFallbackRawMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /story[_ -]?bible|private[_ -]?note|private[_ -]?production[_ -]?note|raw[_ -]?reason|raw[_ -]?production|raw[_ -]?voice|voice[_ -]?sample|voice[_ -]?material/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: raw fallback material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoInCharacterFallbackRawMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoInCharacterFallbackRawMaterial(child, context, `${path}.${field}`);
  }
}
