import { ContractError } from "../../core/contracts.js";
import { listSafeGamePressKeyHints } from "../game/gameActionValidator.js";
import { ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES } from "./adminCharacterVoiceSettings.js";

const FORBIDDEN_CONTRACT_FIELDS = new Set([
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "token",
  "secret",
  "password",
  "credential",
  "credentials",
  "endpoint",
  "url",
  "world_command",
  "input_action_candidate",
  "approved_game_input_action",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "commit",
  "write",
  "execute",
]);
const INTEGRATION_CONTRACTS_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "adapter_packets",
  "obs_overlay",
  "obs_bridge",
  "bridge_sources",
  "memory_search_bridge",
  "game_control",
  "local_engine_worker",
  "boundary_policy",
  "adapter_validation_required",
]);
const ITEM_BOUNDARY_POLICY_FIELDS = [
  "no_secret_values",
  "no_live_payloads",
  "no_candidates",
  "no_commands",
  "read_only",
];
const ROOT_BOUNDARY_POLICY_FIELDS = [
  "no_secret_values",
  "env_names_only",
  "no_live_payloads",
  "no_candidates",
  "no_commands",
  "read_only_contract_manifest",
];

export function createIntegrationContracts({ generatedAtMs = Date.now() } = {}) {
  const contracts = {
    schema: "iris_integration_contracts_v1",
    generated_at_ms: generatedAtMs,
    adapter_packets: [
      adapterPacketContract({
        adapterKind: "tts",
        envNames: [
          "IRIS_TTS_ADAPTER",
          "IRIS_TTS_ENDPOINT",
          "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT",
          "IRIS_TTS_API_KEY",
          "IRIS_TTS_TIMEOUT_MS",
        ],
        requiredRequestFields: [
          "schema",
          "adapter_kind",
          "trace_id",
          "event_id",
          "text",
          "speech_cue",
          "performance_plan",
          "speech_rate_profile",
          "language_profile",
          "subtitle_cue",
          "adapter_validation_required",
        ],
        acceptedAckFields: [
          "request_id",
          "bridge_status",
          "audio_url",
          "duration_ms",
          "sample_rate_hz",
          "visemes",
        ],
      }),
      adapterPacketContract({
        adapterKind: "live2d",
        envNames: [
          "IRIS_LIVE2D_ADAPTER",
          "IRIS_LIVE2D_ENDPOINT",
          "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT",
          "IRIS_LIVE2D_API_KEY",
          "IRIS_LIVE2D_TIMEOUT_MS",
        ],
        requiredRequestFields: [
          "schema",
          "adapter_kind",
          "trace_id",
          "event_id",
          "action_type",
          "motion_cue",
          "body_continuity",
          "camera_proximity",
          "performance_plan",
          "expression_profile",
          "adapter_validation_required",
        ],
        acceptedAckFields: ["request_id", "bridge_status", "duration_ms"],
      }),
      adapterPacketContract({
        adapterKind: "subtitle",
        envNames: [
          "IRIS_SUBTITLE_ADAPTER",
          "IRIS_SUBTITLE_ENDPOINT",
          "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT",
          "IRIS_SUBTITLE_API_KEY",
          "IRIS_SUBTITLE_TIMEOUT_MS",
        ],
        requiredRequestFields: [
          "schema",
          "adapter_kind",
          "trace_id",
          "event_id",
          "subtitle_text",
          "subtitle_language",
          "script_direction",
          "line_break_plan",
          "safe_area_policy",
          "reading_speed_guard",
          "adapter_validation_required",
        ],
        acceptedAckFields: ["request_id", "bridge_status", "duration_ms"],
      }),
    ],
    obs_overlay: {
      schema: "iris_obs_overlay_contract_v1",
      browser_source_path: "/overlay",
      display_event_path: "/overlay/event",
      event_stream_path: "/overlay/events",
      stream_status_path: "/overlay/events/status",
      status_path: "/overlay/status",
      local_bridge_event_render_manifest_status_path: "/event-render-manifests/status",
      local_bridge_event_render_manifest_latest_path: "/event-render-manifests/latest",
      display_event_schema: "iris_overlay_display_event_v1",
      event_stream_name: "iris_overlay_display_event_v1",
      heartbeat_comment: true,
      local_bridge_handoff: {
        health_path: "/health",
        health_schema: "iris_local_bridge_health_v1",
        health_policy: "readiness_booleans_and_route_paths_only",
        health_fields: [
          "bridge_status",
          "accepted_adapter_kinds",
          "outbox_configured",
          "artifact_storage_configured",
          "render_manifest_routes_available",
          "latest_artifact_delivery_routes_available",
          "render_manifest_stale_guard_configured",
          "render_artifact_sync_guard_configured",
          "local_route_paths",
        ],
        required_adapter_kinds: ["tts", "live2d", "subtitle"],
        render_manifest_status_schema:
          "iris_local_bridge_event_render_manifest_store_status_v1",
        latest_render_manifest_report_schema:
          "iris_local_bridge_render_manifest_operator_report_v1",
        status_policy: "counts_readiness_content_metadata_no_artifact_paths",
        latest_render_manifest_report_fields: [
          "obs_pickup_status",
          "obs_handoff_readiness_status",
          "latest_manifest_summary.obs_pickup_ready",
          "latest_manifest_summary.obs_handoff_readiness_status",
          "latest_manifest_summary.manifest_freshness_status",
          "latest_manifest_summary.max_manifest_age_ms",
          "latest_manifest_summary.stale_manifest_rejected_for_obs_pickup",
          "latest_manifest_summary.artifact_freshness_status_by_adapter",
          "latest_manifest_summary.stale_artifact_rejected_for_obs_pickup_by_adapter",
          "latest_manifest_summary.all_artifacts_fresh_for_pickup",
          "latest_manifest_summary.artifact_render_sync_status",
          "latest_manifest_summary.artifact_render_sync_ready",
          "latest_manifest_summary.artifact_render_sync_rejected_for_obs_pickup",
          "latest_manifest_summary.artifact_render_skew_ms",
          "latest_manifest_summary.max_artifact_render_skew_ms",
          "latest_manifest_summary.artifact_contract_status_by_adapter",
          "latest_manifest_summary.all_artifacts_contract_valid_for_pickup",
          "latest_manifest_summary.artifact_reference_safe_by_adapter",
          "latest_manifest_summary.artifact_file_available_by_adapter",
          "latest_manifest_summary.rendered_at_ms_by_adapter",
          "latest_manifest_summary.artifact_render_timestamp_present_by_adapter",
          "latest_manifest_summary.all_artifact_render_timestamps_present",
          "latest_manifest_summary.missing_artifact_render_timestamp_rejected_for_obs_pickup",
          "latest_manifest_summary.artifact_content_type_by_adapter",
          "latest_manifest_summary.artifact_size_bytes_by_adapter",
          "latest_manifest_summary.artifact_pickup_status_by_adapter",
        ],
        artifact_delivery_paths: {
          tts: "/event-render-manifests/latest/artifact/tts",
          live2d: "/event-render-manifests/latest/artifact/live2d",
          subtitle: "/event-render-manifests/latest/artifact/subtitle",
        },
        artifact_delivery_policy: {
          local_read_only_latest_manifest_only: true,
          arbitrary_paths_rejected: true,
          status_reports_hide_artifact_paths: true,
          unsafe_manifest_references_mark_attention: true,
          manifest_id_mismatch_rejected_before_delivery: true,
          stale_manifest_rejected_when_guard_configured: true,
          stale_artifact_rejected_when_guard_configured: true,
          artifact_render_timestamp_required_before_delivery: true,
          artifact_render_sync_skew_rejected_when_guard_configured: true,
          invalid_artifact_rejected_before_delivery: true,
          external_file_existence_probe_blocked: true,
        },
      },
      class_hints: [
        "big_laugh",
        "focused_talk",
        "soft_motion",
        "camera_micro",
        "camera_close",
        "camera_face_near",
        "camera_extreme_closeup",
        "autonomous_surprise_scream",
        "autonomous_happy_dance",
        "autonomous_happy_humming",
        "autonomous_happy_loud_sing",
        "tongue_twister",
      ],
      display_fields: [
        "display.subtitle_text",
        "display.subtitle_language",
        "display.script_direction",
        "display.line_break_plan",
        "timing.planned_visible_ms",
        "timing.subtitle_sync_status",
        "bridge.tts_bridge_status",
        "bridge.live2d_bridge_status",
        "bridge.subtitle_bridge_status",
        "camera.proximity_level",
      ],
      forbidden_payloads: sharedForbiddenPayloads(),
      boundary_policy: itemBoundaryPolicy(),
      adapter_validation_required: true,
    },
    obs_bridge: {
      schema: "iris_obs_bridge_contract_v1",
      http_method: "POST",
      request_schema: "iris_obs_bridge_setup_request_v1",
      response_schema: "iris_obs_bridge_setup_report_v1",
      env_names: [
        "IRIS_OBS_BRIDGE_ENDPOINT",
        "IRIS_OBS_BRIDGE_HEALTH_ENDPOINT",
        "IRIS_OBS_BRIDGE_API_KEY",
        "IRIS_OBS_BRIDGE_TIMEOUT_MS",
        "IRIS_OBS_SOURCE_NAME",
        "IRIS_OBS_SCENE_NAME",
        "IRIS_OBS_SOURCE_WIDTH",
        "IRIS_OBS_SOURCE_HEIGHT",
        "IRIS_OBS_SOURCE_FPS",
        "IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE",
        "IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE",
      ],
      setup_kind: "browser_source_overlay",
      request_policy: {
        operator_setup_only: true,
        not_runtime_expression_command: true,
        overlay_url_from_local_server_only: true,
      },
      accepted_ack_fields: ["request_id", "bridge_status", "configured"],
      health_contract: {
        schema: "iris_obs_bridge_health_contract_v1",
        required_setup_request_schema: "iris_obs_bridge_setup_request_v1",
        accepted_health_declarations: [
          "ok",
          "ready",
          "bridge_status",
          "status",
          "supported_setup_schemas",
          "supported_request_schemas",
          "schemas",
          "supported_response_fields",
          "response_fields",
          "supported_ack_fields",
          "ack_fields",
          "response_schemas",
        ],
        required_ack_shape: {
          any_of_field_sets: [
            ["bridge_status", "configured"],
            ["request_id", "bridge_status"],
          ],
        },
        public_probe_fields: [
          "status",
          "bridge_status",
          "bridge_readiness_status",
          "bridge_reports_ready",
          "compatibility_status",
          "supports_setup_request_schema",
          "response_compatibility_status",
          "supports_setup_ack_shape",
          "error_kind",
        ],
      },
      forbidden_payloads: sharedForbiddenPayloads(),
      boundary_policy: itemBoundaryPolicy(),
      adapter_validation_required: true,
    },
    bridge_sources: [
      sourceContract({
        sourceKind: "youtube_live_chat",
        envNames: [
          "IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT",
          "IRIS_YOUTUBE_LIVE_CHAT_SOURCE",
          "IRIS_YOUTUBE_LIVE_CHAT_ID",
          "IRIS_YOUTUBE_VIDEO_ID",
          "IRIS_YOUTUBE_DATA_API_KEY",
          "IRIS_YOUTUBE_LIVE_CHAT_API_KEY",
          "IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT",
          "IRIS_YOUTUBE_VIDEOS_API_ENDPOINT",
          "IRIS_YOUTUBE_OAUTH_TOKEN",
          "IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN",
          "IRIS_YOUTUBE_OAUTH_CLIENT_ID",
          "IRIS_YOUTUBE_OAUTH_CLIENT_SECRET",
          "IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT",
          "IRIS_YOUTUBE_OAUTH_REFRESH_TIMEOUT_MS",
          "IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS",
          "IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS",
          "IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW",
          "IRIS_YOUTUBE_LIVE_CHAT_PAGE_TOKEN",
          "IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH",
          "IRIS_YOUTUBE_LIVE_CHAT_ERROR_BACKOFF_MS",
          "IRIS_YOUTUBE_LIVE_CHAT_MAX_ERROR_BACKOFF_MS",
          "IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS",
          "IRIS_YOUTUBE_BLOCKED_TEXT_TERMS",
        ],
        normalizedPayloadKind: "comment_or_donation_event",
        publicStatusFields: [
          "ingest_readiness_status",
          "local_endpoint_policy",
          "local_endpoint_policy_status",
          "bridge_endpoint_scope",
          "bridge_endpoint_locality_ok",
          "request_count",
          "video_discovery_request_count",
          "live_chat_request_count",
          "last_item_count",
          "last_ignored_count",
          "last_ignored_event_type_counts",
          "last_moderation_filtered_count",
          "last_moderation_reason_counts",
          "last_comment_count",
          "last_support_event_count",
          "last_support_event_type_counts",
          "last_support_amount_source_counts",
          "comment_event_count",
          "support_event_count",
          "ignored_event_count",
          "ignored_event_type_counts",
          "moderation_configured",
          "moderation_filtered_count",
          "moderation_reason_counts",
          "support_event_type_counts",
          "support_amount_source_counts",
          "polling_interval_ms",
          "polling_interval_policy",
          "last_polling_interval_clamped",
          "live_chat_id_resolved",
          "auth_mode",
          "last_error",
          "cursor_store_configured",
          "cursor_store_status",
          "cursor_store_write_attention",
          "last_cursor_write_result",
        ],
      }),
      sourceContract({
        sourceKind: "game_observation",
        envNames: [
          "IRIS_GAME_OBSERVATION_ENDPOINT",
          "IRIS_GAME_OBSERVATION_API_KEY",
          "IRIS_GAME_OBSERVATION_TIMEOUT_MS",
          "IRIS_GAME_OBSERVATION_METHOD",
          "IRIS_GAME_CAPTURE_REGION",
          "IRIS_GAME_CAPTURE_X",
          "IRIS_GAME_CAPTURE_Y",
          "IRIS_GAME_CAPTURE_WIDTH",
          "IRIS_GAME_CAPTURE_HEIGHT",
          "IRIS_GAME_OBSERVATION_INCLUDE_OCR_SUMMARY",
          "IRIS_GAME_OBSERVATION_INCLUDE_UI_FOCUS_AREAS",
          "IRIS_GAME_OBSERVATION_MAX_EVENTS",
          "IRIS_GAME_OBSERVATION_ERROR_BACKOFF_MS",
          "IRIS_GAME_OBSERVATION_MAX_ERROR_BACKOFF_MS",
        ],
        normalizedPayloadKind: "game_observation",
        publicStatusFields: [
          "ingest_readiness_status",
          "local_endpoint_policy",
          "local_endpoint_policy_status",
          "vision_endpoint_scope",
          "vision_endpoint_locality_ok",
          "request_count",
          "last_observation_count",
          "last_observation_telemetry",
          "capture_request_summary",
          "consecutive_error_count",
          "has_retry_backoff",
          "last_error",
        ],
      }),
      sourceContract({
        sourceKind: "media_watch",
        envNames: ["IRIS_MEDIA_WATCH_ENDPOINT"],
        normalizedPayloadKind: "media_watch_observation",
        publicStatusFields: [
          "local_endpoint_policy",
          "local_endpoint_policy_status",
          "bridge_endpoint_scope",
          "bridge_endpoint_locality_ok",
          "request_count",
          "last_item_count",
          "last_error",
        ],
      }),
      sourceContract({
        sourceKind: "external_topic",
        envNames: ["IRIS_EXTERNAL_TOPIC_ENDPOINT"],
        normalizedPayloadKind: "external_topic_observation",
        publicStatusFields: [
          "local_endpoint_policy",
          "local_endpoint_policy_status",
          "bridge_endpoint_scope",
          "bridge_endpoint_locality_ok",
          "request_count",
          "last_item_count",
          "last_error",
        ],
      }),
    ],
    memory_search_bridge: {
      schema: "iris_memory_search_bridge_contract_v1",
      http_method: "POST",
      request_schema: "iris_vector_memory_search_request_v1",
      response_schema: "iris_memory_search_result_v1",
      env_names: [
        "IRIS_MEMORY_SEARCH_ADAPTER",
        "IRIS_MEMORY_SEARCH_ENDPOINT",
        "IRIS_MEMORY_SEARCH_API_KEY",
        "IRIS_MEMORY_SEARCH_TIMEOUT_MS",
      ],
      local_endpoint_policy: "loopback_or_private_network_only",
      public_status_fields: [
        "local_endpoint_policy",
        "local_endpoint_policy_status",
        "bridge_endpoint_scope",
        "bridge_endpoint_locality_ok",
        "request_count",
        "last_error",
      ],
      required_request_fields: [
        "schema",
        "query",
        "limit",
        "records",
        "boundary_policy",
        "adapter_validation_required",
      ],
      accepted_response_fields: ["vector_provider", "hits", "memory_id", "score"],
      rejected_response_fields: [
        ...sharedForbiddenPayloads(),
        "summary",
        "raw_summary",
        "text",
        "selected_memory_ids",
      ],
      request_policy: {
        approved_public_records_only: true,
        endpoint_returns_ids_only: true,
        read_only_reference: true,
        local_bridge_only: true,
      },
      boundary_policy: itemBoundaryPolicy(),
      adapter_validation_required: true,
    },
    game_control: {
      schema: "iris_game_control_contract_v1",
      http_method: "POST",
      local_bridge_path_hint: "/game-control",
      request_schema: "approved_game_input_action",
      response_schema: "iris_game_control_result_v1",
      env_names: [
        "IRIS_GAME_CONTROL_ADAPTER",
        "IRIS_GAME_CONTROL_ENDPOINT",
        "IRIS_GAME_CONTROL_API_KEY",
        "IRIS_GAME_CONTROL_TIMEOUT_MS",
        "IRIS_GAME_CONTROL_MIN_INTERVAL_MS",
        "IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS",
        "IRIS_ENABLE_GAME_CONTROL",
        "IRIS_AVAILABLE_GAME_ACTIONS",
      ],
      required_request_fields: [
        "schema",
        "approved",
        "trace_id",
        "event_id",
        "game_title",
        "action_kind",
        "parameters",
        "validation_route",
        "safety_policy",
        "source_policy",
        "observation_context",
        "expires_at_ms",
        "action_expiry_policy",
        "adapter_validation_required",
      ],
      accepted_response_fields: [
        "request_id",
        "bridge_status",
        "executed",
        "simulated",
        "reason",
      ],
      public_status_fields: [
        "game_control_readiness_status",
        "local_endpoint_policy",
        "local_endpoint_policy_status",
        "game_control_endpoint_scope",
        "game_control_endpoint_locality_ok",
        "request_count",
        "accepted_count",
        "failed_count",
        "unsafe_response_count",
        "expired_action_count",
        "last_error_kind",
        "last_action_kind",
      ],
      rejected_request_fields: [
        "world_command",
        "input_action",
        "input_action_candidate",
        "execute",
        "commit",
        "write",
        "memory_write",
        "relationship_update_candidate",
        "memory_carryover_candidates",
        "community_memory_candidates",
      ],
      supported_action_kinds: [
        "wait",
        "move_axis",
        "press_key",
        "click",
        "open_menu",
        "select_item",
      ],
      safe_press_key_hints: listSafeGamePressKeyHints(),
      request_parameter_policy: {
        press_key_uses_safe_hint_allowlist: true,
        unsupported_key_hints_rejected_before_adapter: true,
        adapter_must_not_map_unknown_keys: true,
      },
      safety_policy: {
        adapter_accepts_approved_schema_only: true,
        validator_required_before_adapter: true,
        optional_action_rate_limit_before_adapter: true,
        approved_action_expiry_required: true,
        http_adapter_rejects_expired_actions_before_fetch: true,
        local_bridge_rejects_expired_actions_before_ack: true,
        fresh_observation_required: true,
        observation_context_summary_only: true,
        raw_frames_forbidden_in_approved_action: true,
        viewer_direct_source_rejected: true,
        local_bridge_simulated_by_default: true,
      },
      boundary_policy: itemBoundaryPolicy(),
      adapter_validation_required: true,
    },
    local_engine_worker: {
      schema: "iris_local_engine_worker_contract_v1",
      script: "npm run dev:bridge:worker",
      consumes_outbox_kinds: ["tts", "live2d", "subtitle"],
      env_names: [
        "IRIS_LOCAL_BRIDGE_OUTBOX_DIR",
        "IRIS_LOCAL_BRIDGE_ARTIFACT_DIR",
        "IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS",
        "IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS",
        "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
        "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
        "IRIS_LOCAL_TTS_ENGINE_API_KEY",
        "IRIS_LOCAL_TTS_ENGINE_VOICE_ID",
        "IRIS_LOCAL_TTS_ENGINE_MODEL",
        "IRIS_LOCAL_TTS_ENGINE_LOCALE",
        "IRIS_CHARACTER_VOICE_PROFILE_ID",
        "IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID",
        "IRIS_LICENSED_VOICE_SOURCE_STATUS",
        ...ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES,
        "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
        "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
        "IRIS_LOCAL_LIVE2D_ENGINE_API_KEY",
        "IRIS_LOCAL_LIVE2D_MODEL_ID",
        "IRIS_LOCAL_LIVE2D_SCENE_ID",
        "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
        "IRIS_LOCAL_BRIDGE_WORKER_RETRY_BACKOFF_MS",
        "IRIS_LOCAL_BRIDGE_WORKER_RETRY_MAX_BACKOFF_MS",
        "IRIS_LOCAL_BRIDGE_WORKER_MAX_RETRY_ATTEMPTS",
        "IRIS_LOCAL_BRIDGE_WORKER_MAX_JOB_AGE_MS",
      ],
      engine_request_schemas: [
        "iris_local_tts_engine_request_v1",
        "iris_local_live2d_engine_request_v1",
      ],
      local_bridge_health_contract: {
        schema: "iris_local_bridge_health_contract_v1",
        health_path: "/health",
        health_schema: "iris_local_bridge_health_v1",
        public_health_fields: [
          "bridge_status",
          "accepted_adapter_kinds",
          "outbox_configured",
          "artifact_storage_configured",
          "render_manifest_routes_available",
          "latest_artifact_delivery_routes_available",
          "render_manifest_stale_guard_configured",
          "render_artifact_sync_guard_configured",
          "local_route_paths",
        ],
        public_health_policy: {
          route_paths_only: true,
          endpoint_values_hidden: true,
          local_artifact_paths_hidden: true,
          raw_jobs_hidden: true,
          text_payloads_hidden: true,
          candidates_hidden: true,
          commands_hidden: true,
          secrets_hidden: true,
        },
      },
      engine_request_contracts: {
        tts: {
          schema: "iris_local_engine_request_contract_v1",
          request_schema: "iris_local_tts_engine_request_v1",
          http_method: "POST",
          required_request_fields: [
            "schema",
            "job_id",
            "event_id",
            "text",
            "language",
            "script_direction",
            "prosody_style",
            "speech_rate",
            "estimated_duration_ms",
            "mouth_timing",
            "voice_expression",
            "boundary_policy",
            "adapter_validation_required",
          ],
          optional_request_fields: ["engine_preferences"],
          engine_preference_fields: [
            "voice_id",
            "model",
            "locale",
            "character_voice_profile_id",
            "character_voice_style_profile_id",
            "licensed_voice_source_status",
            "voice_license_use_category_count",
            "voice_license_use_category_configured_count",
            "voice_license_use_category_missing_count",
          ],
          engine_preference_policy: {
            outbound_request_only: true,
            omit_when_unconfigured: true,
            public_reports_hide_preference_values: true,
          },
          boundary_policy: itemBoundaryPolicy(),
          adapter_validation_required: true,
        },
        live2d: {
          schema: "iris_local_engine_request_contract_v1",
          request_schema: "iris_local_live2d_engine_request_v1",
          http_method: "POST",
          required_request_fields: [
            "schema",
            "job_id",
            "event_id",
            "motion_style",
            "motion_intensity",
            "body_state_id",
            "camera_proximity_profile",
            "expression_profile_id",
            "autonomous_state_id",
            "timing",
            "tracks",
            "boundary_policy",
            "adapter_validation_required",
          ],
          optional_request_fields: ["engine_preferences"],
          engine_preference_fields: ["model_id", "scene_id"],
          engine_preference_policy: {
            outbound_request_only: true,
            omit_when_unconfigured: true,
            public_reports_hide_preference_values: true,
          },
          boundary_policy: itemBoundaryPolicy(),
          adapter_validation_required: true,
        },
      },
      engine_response_fields: {
        tts: [
          "audio_base64",
          "audio_mime",
          "duration_ms",
          "sample_rate_hz",
          "visemes",
          "bridge_status",
        ],
        live2d: ["cue", "duration_ms", "bridge_status"],
      },
      engine_health_contracts: {
        tts: {
          schema: "iris_local_engine_health_contract_v1",
          required_request_schema: "iris_local_tts_engine_request_v1",
          accepted_health_declarations: [
            "ok",
            "ready",
            "bridge_status",
            "status",
            "engine_status",
            "supported_request_schemas",
            "request_schemas",
            "schemas",
            "supported_response_fields",
            "response_fields",
            "supported_response_formats",
            "response_schemas",
            "supported_audio_mimes",
            "audio_mimes",
            "supported_output_mimes",
            "supported_mime_types",
            "supported_audio_formats",
          ],
          required_response_shape: {
            any_of_field_sets: [
              ["audio_base64", "audio_mime"],
              ["audio_data_url"],
            ],
          },
          required_output_formats: {
            kind: "audio_mime",
            any_of: ["audio/wav", "audio/mpeg", "audio/ogg"],
          },
          public_probe_fields: [
            "status",
            "engine_status",
            "engine_readiness_status",
            "engine_reports_ready",
            "compatibility_status",
            "supports_required_request_schema",
            "response_compatibility_status",
            "supports_required_response_shape",
            "output_format_compatibility_status",
            "supports_required_output_format",
            "declared_output_format_count",
            "compatible_output_format_count",
            "error_kind",
          ],
        },
        live2d: {
          schema: "iris_local_engine_health_contract_v1",
          required_request_schema: "iris_local_live2d_engine_request_v1",
          accepted_health_declarations: [
            "ok",
            "ready",
            "bridge_status",
            "status",
            "engine_status",
            "supported_request_schemas",
            "request_schemas",
            "schemas",
            "supported_response_fields",
            "response_fields",
            "supported_response_formats",
            "response_schemas",
            "supported_cue_schemas",
            "cue_schemas",
            "supported_live2d_cue_schemas",
            "live2d_cue_schemas",
          ],
          required_response_shape: {
            any_of_field_sets: [["cue"]],
          },
          required_cue_schemas: {
            any_of: ["iris_live2d_renderer_cue_v1"],
          },
          public_probe_fields: [
            "status",
            "engine_status",
            "engine_readiness_status",
            "engine_reports_ready",
            "compatibility_status",
            "supports_required_request_schema",
            "response_compatibility_status",
            "supports_required_response_shape",
            "cue_schema_compatibility_status",
            "supports_required_cue_schema",
            "declared_cue_schema_count",
            "compatible_cue_schema_count",
            "output_format_compatibility_status",
            "error_kind",
          ],
        },
      },
      bundled_helper_bridges: {
        voicevox_tts: {
          schema: "iris_bundled_helper_bridge_contract_v1",
          script: "npm run dev:voicevox:bridge",
          service: "voicevox_tts_engine_bridge",
          public_health_schema: "iris_voicevox_tts_engine_bridge_health_v1",
          engine_request_path: "/tts-engine",
          health_path: "/health",
          target_env_names: [
            "IRIS_VOICEVOX_ENDPOINT",
            "IRIS_VOICEVOX_SPEAKER_ID",
            "IRIS_VOICEVOX_TIMEOUT_MS",
            "IRIS_VOICEVOX_API_KEY",
          ],
          local_endpoint_policy: "loopback_or_private_network_only",
          public_policy_fields: [
            "local_endpoint_policy_status",
            "engine_endpoint_scope",
            "engine_endpoint_locality_ok",
          ],
          upstream_request_policy: {
            blocked_before_version_fetch: true,
            blocked_before_audio_query_fetch: true,
            blocked_before_synthesis_fetch: true,
            summary_only_error_kind: "local_endpoint_policy_blocked",
          },
          boundary_policy: itemBoundaryPolicy(),
          adapter_validation_required: true,
        },
        live2d_cue: {
          schema: "iris_bundled_helper_bridge_contract_v1",
          script: "npm run dev:live2d:bridge",
          service: "live2d_cue_engine_bridge",
          public_health_schema: "iris_live2d_cue_engine_bridge_health_v1",
          engine_request_path: "/live2d-engine",
          health_path: "/health",
          target_env_names: [
            "IRIS_LIVE2D_RENDERER_ENDPOINT",
            "IRIS_LIVE2D_RENDERER_HEALTH_ENDPOINT",
            "IRIS_LIVE2D_RENDERER_API_KEY",
            "IRIS_LIVE2D_CUE_BRIDGE_TIMEOUT_MS",
            "IRIS_LOCAL_LIVE2D_MODEL_ID",
            "IRIS_LOCAL_LIVE2D_SCENE_ID",
          ],
          local_endpoint_policy: "loopback_or_private_network_only",
          public_policy_fields: [
            "local_endpoint_policy_status",
            "renderer_endpoint_scope",
            "renderer_endpoint_locality_ok",
            "renderer_health_endpoint_scope",
            "renderer_health_endpoint_locality_ok",
          ],
          upstream_request_policy: {
            cue_only_mode_without_renderer_supported: true,
            blocked_before_renderer_health_fetch: true,
            blocked_before_renderer_cue_fetch: true,
            summary_only_error_kind: "local_endpoint_policy_blocked",
          },
          boundary_policy: itemBoundaryPolicy(),
          adapter_validation_required: true,
        },
      },
      artifact_kinds: [
        "audio_wav",
        "audio_blob",
        "live2d_cue_json",
        "live2d_engine_cue_json",
        "subtitle_vtt",
      ],
      event_render_manifest_contract: {
        schema: "iris_local_bridge_event_render_manifest_contract_v1",
        manifest_schema: "iris_local_bridge_event_render_manifest_v1",
        created_when_adapter_kinds_complete: ["tts", "live2d", "subtitle"],
        latest_artifact_delivery_paths: {
          tts: "/event-render-manifests/latest/artifact/tts",
          live2d: "/event-render-manifests/latest/artifact/live2d",
          subtitle: "/event-render-manifests/latest/artifact/subtitle",
        },
        local_files: [
          "event_render_manifests.jsonl",
          "latest_event_render_manifest.json",
        ],
        local_manifest_fields: [
          "manifest_id",
          "event_id",
          "created_at_ms",
          "complete",
          "required_adapter_kinds",
          "artifact_set.<kind>.job_id",
          "artifact_set.<kind>.artifact_kind",
          "artifact_set.<kind>.artifact_path",
          "artifact_set.<kind>.engine_mode",
          "artifact_set.<kind>.rendered_at_ms",
        ],
        public_report_fields: [
          "worker_readiness_status",
          "adapter_readiness_status.tts",
          "adapter_readiness_status.live2d",
          "adapter_readiness_status.subtitle",
          "event_render_manifest_count",
          "event_render_manifests[].manifest_id",
          "event_render_manifests[].event_id",
          "event_render_manifests[].adapter_kinds",
          "event_render_manifests[].artifact_kind_by_adapter",
          "event_render_manifests[].engine_mode_by_adapter",
          "obs_pickup_status",
          "obs_handoff_readiness_status",
          "latest_manifest_summary.obs_pickup_ready",
          "latest_manifest_summary.obs_pickup_status",
          "latest_manifest_summary.obs_pickup_blocking_adapter_kinds",
          "latest_manifest_summary.obs_pickup_blocking_adapter_count",
          "latest_manifest_summary.obs_pickup_blocking_status_by_adapter",
          "latest_manifest_summary.obs_handoff_readiness_status",
          "latest_manifest_summary.manifest_freshness_status",
          "latest_manifest_summary.max_manifest_age_ms",
          "latest_manifest_summary.stale_manifest_rejected_for_obs_pickup",
          "latest_manifest_summary.artifact_freshness_status_by_adapter",
          "latest_manifest_summary.stale_artifact_rejected_for_obs_pickup_by_adapter",
          "latest_manifest_summary.all_artifacts_fresh_for_pickup",
          "latest_manifest_summary.artifact_render_sync_status",
          "latest_manifest_summary.artifact_render_sync_ready",
          "latest_manifest_summary.artifact_render_sync_rejected_for_obs_pickup",
          "latest_manifest_summary.artifact_render_skew_ms",
          "latest_manifest_summary.max_artifact_render_skew_ms",
          "latest_manifest_summary.artifact_contract_status_by_adapter",
          "latest_manifest_summary.all_artifacts_contract_valid_for_pickup",
          "latest_manifest_summary.artifact_reference_safe_by_adapter",
          "latest_manifest_summary.artifact_file_available_by_adapter",
          "latest_manifest_summary.rendered_at_ms_by_adapter",
          "latest_manifest_summary.artifact_render_timestamp_present_by_adapter",
          "latest_manifest_summary.all_artifact_render_timestamps_present",
          "latest_manifest_summary.missing_artifact_render_timestamp_rejected_for_obs_pickup",
          "latest_manifest_summary.artifact_content_type_by_adapter",
          "latest_manifest_summary.artifact_size_bytes_by_adapter",
          "latest_manifest_summary.artifact_pickup_status_by_adapter",
          "latest_manifest_summary.all_artifact_files_available",
        ],
        public_report_policy: {
          summary_only: true,
          artifact_paths_hidden: true,
          content_metadata_only: true,
          unsafe_manifest_references_mark_attention: true,
          stale_manifest_guard_supported: true,
          stale_artifact_guard_supported: true,
          artifact_render_sync_guard_supported: true,
          invalid_artifact_guard_supported: true,
          external_file_existence_probe_blocked: true,
          raw_jobs_hidden: true,
          text_payloads_hidden: true,
          candidates_hidden: true,
          commands_hidden: true,
          adapter_readiness_fixed_enum: true,
        },
        artifact_delivery_policy: {
          latest_manifest_only: true,
          adapter_kind_allowlist: ["tts", "live2d", "subtitle"],
          arbitrary_paths_rejected: true,
          manifest_id_mismatch_rejected_before_delivery: true,
          stale_manifest_rejected_when_guard_configured: true,
          stale_artifact_rejected_when_guard_configured: true,
          artifact_render_timestamp_required_before_delivery: true,
          artifact_render_sync_skew_rejected_when_guard_configured: true,
          invalid_artifact_rejected_before_delivery: true,
          errors_hide_paths_and_payloads: true,
          errors_include_readiness_status: true,
        },
      },
      engine_response_policy: {
        tts_accepts_audio_base64_or_audio_data_url: true,
        tts_audio_content_must_match_declared_mime: true,
        tts_invalid_audio_rejected_before_artifact_write: true,
        live2d_accepts_cue_object: true,
        live2d_cue_schema_required_before_artifact_write: true,
        accepted_live2d_cue_schemas: [
          "iris_live2d_renderer_cue_v1",
          "iris_live2d_fixture_cue_v1",
        ],
        response_must_not_echo_runtime_text: true,
        response_must_not_echo_candidates_or_commands: true,
        failed_response_bodies_are_not_public: true,
      },
      public_report_policy: {
        ids_counts_and_artifact_availability_only: true,
        raw_jobs_hidden: true,
        text_payloads_hidden: true,
        candidates_hidden: true,
      },
      boundary_policy: itemBoundaryPolicy(),
      adapter_validation_required: true,
    },
    boundary_policy: {
      no_secret_values: true,
      env_names_only: true,
      no_live_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_contract_manifest: true,
    },
    adapter_validation_required: true,
  };
  assertIntegrationContractsSafe(contracts);
  return contracts;
}

export function assertIntegrationContractsSafe(contracts, context = "integration contracts") {
  if (!contracts || typeof contracts !== "object") {
    throw new ContractError(`${context}: missing contracts`);
  }
  assertNoForbiddenContractFields(contracts, context);
  for (const field of Object.keys(contracts)) {
    if (!INTEGRATION_CONTRACTS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected contracts field`);
    }
  }
  if (contracts.schema !== "iris_integration_contracts_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: contracts.schema });
  }
  if (!Array.isArray(contracts.adapter_packets) || contracts.adapter_packets.length !== 3) {
    throw new ContractError(`${context}: adapter packet contracts are required`);
  }
  assertAdapterPacketContractsSafe(contracts.adapter_packets, context);
  assertOverlayContractSafe(contracts.obs_overlay, context);
  assertObsBridgeContractSafe(contracts.obs_bridge, context);
  assertSourceContractsSafe(contracts.bridge_sources, context);
  assertReadOnlyContractItemSafe(
    contracts.memory_search_bridge,
    "iris_memory_search_bridge_contract_v1",
    `${context}: memory search bridge`
  );
  assertReadOnlyContractItemSafe(
    contracts.game_control,
    "iris_game_control_contract_v1",
    `${context}: game control`
  );
  assertReadOnlyContractItemSafe(
    contracts.local_engine_worker,
    "iris_local_engine_worker_contract_v1",
    `${context}: local engine worker`
  );
  if (
    contracts.local_engine_worker.event_render_manifest_contract?.artifact_delivery_policy
      ?.artifact_render_timestamp_required_before_delivery !== true
  ) {
    throw new ContractError(
      `${context}: invalid local engine worker artifact delivery policy`
    );
  }
  assertBoundaryPolicySafe(
    contracts.boundary_policy,
    ROOT_BOUNDARY_POLICY_FIELDS,
    `${context}: boundary policy`
  );
  if (contracts.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

function assertAdapterPacketContractsSafe(adapterPackets, context) {
  const expectedKinds = ["tts", "live2d", "subtitle"];
  const kinds = adapterPackets.map((contract) => contract.adapter_kind);
  if (JSON.stringify(kinds) !== JSON.stringify(expectedKinds)) {
    throw new ContractError(`${context}: adapter packet kind order mismatch`);
  }
  for (const contract of adapterPackets) {
    assertReadOnlyContractItemSafe(
      contract,
      "iris_adapter_packet_contract_v1",
      `${context}: adapter packet ${contract?.adapter_kind ?? "unknown"}`
    );
    if (
      contract.http_method !== "POST" ||
      contract.request_schema !== "iris_adapter_packet_v1" ||
      !Array.isArray(contract.env_names) ||
      !Array.isArray(contract.required_request_fields) ||
      !contract.required_request_fields.includes("adapter_validation_required") ||
      !Array.isArray(contract.accepted_ack_fields) ||
      !Array.isArray(contract.rejected_ack_fields)
    ) {
      throw new ContractError(`${context}: invalid adapter packet contract`);
    }
    assertUniqueStringArray(contract.env_names, `${context}: adapter packet env names`);
    assertUniqueStringArray(
      contract.required_request_fields,
      `${context}: adapter packet required request fields`
    );
    assertUniqueStringArray(
      contract.accepted_ack_fields,
      `${context}: adapter packet accepted ack fields`
    );
    assertUniqueStringArray(
      contract.rejected_ack_fields,
      `${context}: adapter packet rejected ack fields`
    );
    if (
      contract.response_policy?.ack_only !== true ||
      contract.response_policy?.bridge_must_not_echo_runtime_packet !== true ||
      contract.response_policy?.bridge_must_not_return_candidates !== true ||
      contract.response_policy?.bridge_must_not_return_canonical_fields !== true
    ) {
      throw new ContractError(`${context}: invalid adapter packet response policy`);
    }
  }
}

function assertOverlayContractSafe(contract, context) {
  assertReadOnlyContractItemSafe(
    contract,
    "iris_obs_overlay_contract_v1",
    `${context}: OBS overlay`
  );
  if (
    contract.browser_source_path !== "/overlay" ||
    contract.event_stream_path !== "/overlay/events" ||
    contract.local_bridge_handoff?.health_path !== "/health" ||
    !Array.isArray(contract.local_bridge_handoff?.required_adapter_kinds) ||
    JSON.stringify(contract.local_bridge_handoff.required_adapter_kinds) !==
      JSON.stringify(["tts", "live2d", "subtitle"]) ||
    contract.local_bridge_handoff.artifact_delivery_policy
      ?.arbitrary_paths_rejected !== true ||
    contract.local_bridge_handoff.artifact_delivery_policy
      ?.status_reports_hide_artifact_paths !== true ||
    contract.local_bridge_handoff.artifact_delivery_policy
      ?.artifact_render_timestamp_required_before_delivery !== true
  ) {
    throw new ContractError(`${context}: invalid OBS overlay contract`);
  }
}

function assertObsBridgeContractSafe(contract, context) {
  assertReadOnlyContractItemSafe(
    contract,
    "iris_obs_bridge_contract_v1",
    `${context}: OBS bridge`
  );
  if (
    contract.http_method !== "POST" ||
    contract.request_schema !== "iris_obs_bridge_setup_request_v1" ||
    contract.response_schema !== "iris_obs_bridge_setup_report_v1" ||
    contract.request_policy?.operator_setup_only !== true ||
    contract.request_policy?.not_runtime_expression_command !== true ||
    contract.request_policy?.overlay_url_from_local_server_only !== true
  ) {
    throw new ContractError(`${context}: invalid OBS bridge contract`);
  }
}

function assertSourceContractsSafe(sourceContracts, context) {
  if (!Array.isArray(sourceContracts) || sourceContracts.length !== 4) {
    throw new ContractError(`${context}: source bridge contracts are required`);
  }
  const expectedKinds = [
    "youtube_live_chat",
    "game_observation",
    "media_watch",
    "external_topic",
  ];
  const kinds = sourceContracts.map((contract) => contract.source_kind);
  if (JSON.stringify(kinds) !== JSON.stringify(expectedKinds)) {
    throw new ContractError(`${context}: source bridge kind order mismatch`);
  }
  for (const contract of sourceContracts) {
    assertReadOnlyContractItemSafe(
      contract,
      "iris_source_bridge_contract_v1",
      `${context}: source bridge ${contract?.source_kind ?? "unknown"}`
    );
    if (
      !Array.isArray(contract.env_names) ||
      !Array.isArray(contract.public_status_fields) ||
      contract.accepted_shape !== "summary_only_normalized_event" ||
      contract.public_status_policy?.counts_and_fixed_status_only !== true ||
      contract.public_status_policy?.no_raw_text_or_media !== true ||
      contract.public_status_policy?.no_platform_cursor_or_endpoint_values !== true ||
      !Array.isArray(contract.forbidden_payloads)
    ) {
      throw new ContractError(`${context}: invalid source bridge contract`);
    }
    assertUniqueStringArray(contract.env_names, `${context}: source bridge env names`);
    assertUniqueStringArray(
      contract.public_status_fields,
      `${context}: source bridge public status fields`
    );
    assertUniqueStringArray(
      contract.forbidden_payloads,
      `${context}: source bridge forbidden payloads`
    );
  }
}

function assertReadOnlyContractItemSafe(item, expectedSchema, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: contract item is required`);
  }
  if (item.schema !== expectedSchema) {
    throw new ContractError(`${context}: invalid contract schema`);
  }
  assertBoundaryPolicySafe(
    item.boundary_policy,
    ITEM_BOUNDARY_POLICY_FIELDS,
    `${context}: boundary policy`
  );
  if (item.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertUniqueStringArray(values, context) {
  if (
    !Array.isArray(values) ||
    values.some((value) => typeof value !== "string" || value.length === 0)
  ) {
    throw new ContractError(`${context}: values must be non-empty strings`);
  }
  if (new Set(values).size !== values.length) {
    throw new ContractError(`${context}: duplicate values are not allowed`);
  }
}

function adapterPacketContract({
  adapterKind,
  envNames,
  requiredRequestFields,
  acceptedAckFields,
}) {
  return {
    schema: "iris_adapter_packet_contract_v1",
    adapter_kind: adapterKind,
    http_method: "POST",
    request_schema: "iris_adapter_packet_v1",
    env_names: envNames,
    required_request_fields: requiredRequestFields,
    accepted_ack_fields: acceptedAckFields,
    rejected_ack_fields: sharedForbiddenPayloads(),
    response_policy: {
      ack_only: true,
      bridge_must_not_echo_runtime_packet: true,
      bridge_must_not_return_candidates: true,
      bridge_must_not_return_canonical_fields: true,
    },
    boundary_policy: itemBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function sourceContract({
  sourceKind,
  envNames,
  normalizedPayloadKind,
  publicStatusFields = [],
}) {
  return {
    schema: "iris_source_bridge_contract_v1",
    source_kind: sourceKind,
    env_names: envNames,
    normalized_payload_kind: normalizedPayloadKind,
    accepted_shape: "summary_only_normalized_event",
    public_status_fields: publicStatusFields,
    public_status_policy: {
      counts_and_fixed_status_only: true,
      no_raw_text_or_media: true,
      no_platform_cursor_or_endpoint_values: true,
    },
    forbidden_payloads: [
      ...sharedForbiddenPayloads(),
      "raw_audio",
      "raw_video",
      "raw_frame",
      "raw_pixels",
      "raw_html",
      "raw_transcript",
      "direct_ocr_text",
      "lyrics",
    ],
    boundary_policy: itemBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function sharedForbiddenPayloads() {
  return [
    "world_command",
    "input_action_candidate",
    "approved_game_input_action",
    "memory_write",
    "relationship_update_candidate",
    "memory_carryover_candidates",
    "community_memory_candidates",
    "canonical_envelope",
    "action_type_override",
  ];
}

function itemBoundaryPolicy() {
  return {
    no_secret_values: true,
    no_live_payloads: true,
    no_candidates: true,
    no_commands: true,
    read_only: true,
  };
}

function assertBoundaryPolicySafe(policy, requiredFields, context) {
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

function assertNoForbiddenContractFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenContractFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_CONTRACT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe contract field`, { field, path });
    }
    assertNoForbiddenContractFields(child, context, `${path}.${field}`);
  }
}
