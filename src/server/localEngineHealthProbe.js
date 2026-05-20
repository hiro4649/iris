import "../config/loadIrisEnv.js";
import { ContractError } from "../core/contracts.js";
import {
  summarizeLocalEndpointPolicyStatus,
  summarizeLocalEndpointScope,
} from "../core/localEndpointPolicy.js";
import { ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES } from "../services/dev/adminCharacterVoiceSettings.js";

const ENGINE_HEALTH_CONFIGS = [
  {
    engine_kind: "tts",
    engine_endpoint_env: "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
    engine_endpoint_env_aliases: [
      "IRIS_TTS_ENGINE_ENDPOINT",
      "IRIS_VOICEVOX_ENDPOINT",
      "VOICEVOX_ENDPOINT",
      "TTS_ENDPOINT",
    ],
    health_endpoint_env: "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
    health_endpoint_env_aliases: [
      "IRIS_TTS_ENGINE_HEALTH_ENDPOINT",
      "IRIS_VOICEVOX_HEALTH_ENDPOINT",
      "VOICEVOX_HEALTH_ENDPOINT",
      "TTS_HEALTH_ENDPOINT",
    ],
    api_key_env: "IRIS_LOCAL_TTS_ENGINE_API_KEY",
    api_key_env_aliases: ["IRIS_VOICEVOX_API_KEY", "VOICEVOX_API_KEY", "TTS_API_KEY"],
    timeout_env: "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
    preference_envs: [
      "IRIS_LOCAL_TTS_ENGINE_VOICE_ID",
      "IRIS_LOCAL_TTS_ENGINE_MODEL",
      "IRIS_LOCAL_TTS_ENGINE_LOCALE",
      "IRIS_VOICEVOX_SPEAKER_ID",
      "IRIS_VOICEVOX_VOICE_ID",
      "IRIS_VOICEVOX_MODEL",
      "VOICEVOX_SPEAKER_ID",
      "VOICEVOX_VOICE_ID",
      "VOICEVOX_MODEL",
      "TTS_VOICE_ID",
      "TTS_MODEL",
      "IRIS_CHARACTER_VOICE_PROFILE_ID",
      "IRIS_CHARACTER_VOICE_STYLE_PROFILE_ID",
      "IRIS_LICENSED_VOICE_SOURCE_STATUS",
      ...ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES,
    ],
    required_request_schema: "iris_local_tts_engine_request_v1",
    required_response_shape: {
      any_of: [
        ["audio_base64", "audio_mime"],
        ["audio_data_url"],
        ["audio_url", "audio_mime"],
      ],
    },
    required_output_format: {
      kind: "audio_mime",
      any_of: [
        "audio/wav",
        "audio/mpeg",
        "audio/mp4",
        "audio/aac",
        "audio/ogg",
        "audio/webm",
      ],
    },
    required_cue_schema: null,
  },
  {
    engine_kind: "live2d",
    engine_endpoint_env: "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
    engine_endpoint_env_aliases: [
      "IRIS_LIVE2D_ENGINE_ENDPOINT",
      "IRIS_LIVE2D_CUE_ENDPOINT",
      "LIVE2D_ENDPOINT",
      "LIVE2D_CUE_ENDPOINT",
    ],
    health_endpoint_env: "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
    health_endpoint_env_aliases: [
      "IRIS_LIVE2D_ENGINE_HEALTH_ENDPOINT",
      "IRIS_LIVE2D_CUE_HEALTH_ENDPOINT",
      "LIVE2D_HEALTH_ENDPOINT",
      "LIVE2D_CUE_HEALTH_ENDPOINT",
    ],
    api_key_env: "IRIS_LOCAL_LIVE2D_ENGINE_API_KEY",
    api_key_env_aliases: [
      "IRIS_LIVE2D_CUE_API_KEY",
      "IRIS_LIVE2D_API_KEY",
      "LIVE2D_CUE_API_KEY",
      "LIVE2D_API_KEY",
    ],
    timeout_env: "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
    preference_envs: [
      "IRIS_LOCAL_LIVE2D_MODEL_ID",
      "IRIS_LOCAL_LIVE2D_SCENE_ID",
      "IRIS_LIVE2D_CUE_MODEL_ID",
      "IRIS_LIVE2D_MODEL_ID",
      "IRIS_LIVE2D_MODEL",
      "IRIS_LIVE2D_CUE_SCENE_ID",
      "IRIS_LIVE2D_SCENE_ID",
      "IRIS_LIVE2D_SCENE",
      "LIVE2D_CUE_MODEL_ID",
      "LIVE2D_MODEL_ID",
      "LIVE2D_MODEL",
      "LIVE2D_CUE_SCENE_ID",
      "LIVE2D_SCENE_ID",
      "LIVE2D_SCENE",
    ],
    required_request_schema: "iris_local_live2d_engine_request_v1",
    required_response_shape: {
      any_of: [
        ["cue"],
        ["cue_url"],
        ["live2d_cue_url"],
        ["renderer_cue_url"],
      ],
    },
    required_output_format: null,
    required_cue_schema: {
      any_of: ["iris_live2d_renderer_cue_v1"],
    },
  },
  {
    engine_kind: "subtitle",
    engine_endpoint_env: "IRIS_LOCAL_SUBTITLE_ENGINE_ENDPOINT",
    engine_endpoint_env_aliases: [
      "IRIS_SUBTITLE_ENGINE_ENDPOINT",
      "IRIS_SUBTITLE_RENDERER_ENDPOINT",
      "IRIS_CAPTION_ENDPOINT",
      "SUBTITLE_ENDPOINT",
      "CAPTION_ENDPOINT",
    ],
    health_endpoint_env: "IRIS_LOCAL_SUBTITLE_ENGINE_HEALTH_ENDPOINT",
    health_endpoint_env_aliases: [
      "IRIS_SUBTITLE_ENGINE_HEALTH_ENDPOINT",
      "IRIS_SUBTITLE_RENDERER_HEALTH_ENDPOINT",
      "IRIS_CAPTION_HEALTH_ENDPOINT",
      "SUBTITLE_HEALTH_ENDPOINT",
      "CAPTION_HEALTH_ENDPOINT",
    ],
    api_key_env: "IRIS_LOCAL_SUBTITLE_ENGINE_API_KEY",
    api_key_env_aliases: [
      "IRIS_SUBTITLE_RENDERER_API_KEY",
      "IRIS_CAPTION_API_KEY",
      "SUBTITLE_API_KEY",
      "CAPTION_API_KEY",
    ],
    timeout_env: "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
    preference_envs: [],
    required_request_schema: "iris_local_subtitle_engine_request_v1",
    required_response_shape: {
      any_of: [
        ["vtt"],
        ["subtitle_vtt"],
        ["srt"],
        ["subtitle_url"],
        ["vtt_url"],
        ["srt_url"],
        ["cues"],
        ["lines"],
      ],
    },
    required_output_format: null,
    required_cue_schema: null,
  },
];

const FORBIDDEN_HEALTH_FIELDS = new Set([
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
  "final_text",
  "text",
  "subtitle_text",
  "raw_payload",
  "raw_response",
  "job_payload",
  "command_payload",
  "endpoint",
  "url",
  "audio_url",
  "audio_data",
  "audioData",
  "artifact_url",
  "audio_base64",
  "audio_data_url",
  "raw_audio",
  "rawAudio",
  "raw_audio_body",
  "rawAudioBody",
  "voice_sample",
  "voiceSample",
  "raw_voice_sample",
  "rawVoiceSample",
  "dataset_path",
  "datasetPath",
  "internal_model_path",
  "internalModelPath",
  "model_path",
  "modelPath",
  "candidate",
  "candidatePayload",
  "authorization",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "password",
  "value",
]);
const UNSAFE_HEALTH_PUBLIC_TEXT_PATTERN =
  /(https?:\/\/|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|input_action|input_action_candidate|approved_game_input_action|commit|memory_write|relationship_update_candidate|canonical_envelope|(?:^|[\\/:])(?:dataset|datasets|model|models)(?:[\\/]|$)|\.(?:wav|mp3|flac|ogg|opus|m4a)\b)/i;

export async function createLocalEngineHealthProbeReport({
  env = process.env,
  fetchImpl = globalThis.fetch,
  generatedAtMs = Date.now(),
} = {}) {
  const probes = [];
  for (const config of ENGINE_HEALTH_CONFIGS) {
    probes.push(await probeEngineHealth({ config, env, fetchImpl }));
  }
  const report = {
    schema: "iris_local_engine_health_probe_report_v1",
    generated_at_ms: generatedAtMs,
    probes,
    summary: summarizeHealthProbes(probes),
    boundary_policy: {
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_payloads: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_health_probe: true,
    },
    adapter_validation_required: true,
  };
  assertLocalEngineHealthProbeReportSafe(report);
  return report;
}

export function assertLocalEngineHealthProbeReportSafe(
  report,
  context = "local engine health probe report"
) {
  if (!report || typeof report !== "object") {
    throw new ContractError(`${context}: missing report`);
  }
  assertNoForbiddenHealthFields(report, context);
  if (report.schema !== "iris_local_engine_health_probe_report_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: report.schema });
  }
  if (!Array.isArray(report.probes) || report.probes.length !== ENGINE_HEALTH_CONFIGS.length) {
    throw new ContractError(`${context}: probes are required`);
  }
  for (const probe of report.probes) assertHealthProbeItemSafe(probe, context);
  assertHealthProbeSummarySafe(report.summary, report.probes, context);
  assertHealthBoundaryPolicySafe(report.boundary_policy, context, [
    "env_names_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_payloads",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "read_only_health_probe",
  ]);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

async function probeEngineHealth({ config, env, fetchImpl }) {
  const engineEndpointEnv = firstConfiguredEnvName(env, [
    config.engine_endpoint_env,
    ...(config.engine_endpoint_env_aliases ?? []),
  ]);
  const healthEndpointEnv = firstConfiguredEnvName(env, [
    config.health_endpoint_env,
    ...(config.health_endpoint_env_aliases ?? []),
  ]);
  const apiKeyEnv = firstConfiguredEnvName(env, [
    config.api_key_env,
    ...(config.api_key_env_aliases ?? []),
  ]);
  const engineEndpoint = engineEndpointEnv ? env[engineEndpointEnv] : "";
  const healthEndpoint = healthEndpointEnv ? env[healthEndpointEnv] : "";
  const apiKey = apiKeyEnv ? env[apiKeyEnv] : "";
  const engineConfigured = engineEndpoint !== "";
  const healthConfigured = healthEndpoint !== "";
  const engineEndpointScope = summarizeLocalEndpointScope(engineEndpoint);
  const healthEndpointScope = summarizeLocalEndpointScope(healthEndpoint);
  const localEndpointPolicyStatus = summarizeEngineLocalEndpointPolicyStatus({
    engineConfigured,
    healthConfigured,
    engineEndpointScope,
    healthEndpointScope,
  });
  const configuredEnv = [
    ...(engineEndpointEnv ? [engineEndpointEnv] : []),
    ...(healthEndpointEnv ? [healthEndpointEnv] : []),
    ...(apiKeyEnv ? [apiKeyEnv] : []),
    ...(env[config.timeout_env] ? [config.timeout_env] : []),
    ...config.preference_envs.filter((name) => (env[name] ?? "") !== ""),
  ];
  const base = {
    schema: "iris_local_engine_health_probe_item_v1",
    engine_kind: config.engine_kind,
    status: "not_configured",
    configured_env: configuredEnv,
    missing_env: engineConfigured
      ? healthConfigured
        ? []
        : [config.health_endpoint_env]
      : [config.engine_endpoint_env],
    auth_configured: apiKey !== "",
    local_endpoint_policy: "loopback_or_private_network_only",
    local_endpoint_policy_status: localEndpointPolicyStatus,
    engine_endpoint_scope: engineEndpointScope.endpoint_scope,
    engine_endpoint_locality_ok: engineEndpointScope.local_endpoint_allowed,
    health_endpoint_scope: healthEndpointScope.endpoint_scope,
    health_endpoint_locality_ok: healthEndpointScope.local_endpoint_allowed,
    http_status: null,
    response_kind: "not_requested",
    engine_status: "",
    engine_readiness_status: "not_checked",
    engine_reports_ready: null,
    compatibility_status: "not_checked",
    supports_required_request_schema: null,
    response_compatibility_status: "not_checked",
    supports_required_response_shape: null,
    output_format_compatibility_status: config.required_output_format
      ? "not_checked"
      : "not_applicable",
    supports_required_output_format: null,
    declared_output_format_count: 0,
    compatible_output_format_count: 0,
    cue_schema_compatibility_status: config.required_cue_schema
      ? "not_checked"
      : "not_applicable",
    supports_required_cue_schema: null,
    declared_cue_schema_count: 0,
    compatible_cue_schema_count: 0,
    ...summarizeOriginalVoiceHealthPreferences(config, env),
    error_kind: "",
    boundary_policy: itemBoundaryPolicy(),
    adapter_validation_required: true,
  };

  if (!engineConfigured) return base;
  if (localEndpointPolicyStatus === "blocked") {
    return {
      ...base,
      status: "attention",
      response_kind: "blocked",
      compatibility_status: "not_checked",
      error_kind: "local_endpoint_policy_blocked",
    };
  }
  if (!healthConfigured) {
    return {
      ...base,
      status: "health_endpoint_not_configured",
      response_kind: "not_requested",
      compatibility_status: "health_endpoint_missing",
    };
  }
  if (typeof fetchImpl !== "function") {
    return {
      ...base,
      status: "attention",
      response_kind: "unavailable",
      compatibility_status: "not_checked",
      error_kind: "fetch_unavailable",
    };
  }

  const timeoutMs = clampInteger(env[config.timeout_env] ?? 5000, 100, 60_000, 5000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(healthEndpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      signal: controller.signal,
    });
    const responseOk = response.ok === true;
    if (!responseOk) {
      const item = {
        ...base,
        status: "attention",
        missing_env: [],
        http_status: safeOptionalNumber(response.status),
        response_kind: "omitted",
        engine_readiness_status: "http_error",
        engine_reports_ready: null,
        compatibility_status: "http_error",
        supports_required_request_schema: null,
        response_compatibility_status: "http_error",
        supports_required_response_shape: null,
        output_format_compatibility_status: config.required_output_format
          ? "http_error"
          : "not_applicable",
        supports_required_output_format: null,
        cue_schema_compatibility_status: config.required_cue_schema
          ? "http_error"
          : "not_applicable",
        supports_required_cue_schema: null,
        error_kind: "http_status",
      };
      assertHealthProbeItemSafe(item, `${config.engine_kind} engine health probe`);
      return item;
    }
    const responseText = await response.text();
    const parsed = parseHealthJson(responseText);
    assertNoForbiddenHealthFields(parsed, `${config.engine_kind} engine health response`);
    const readinessSupport = summarizeEngineReadiness(parsed);
    const schemaSupport = summarizeSchemaSupport(parsed, config.required_request_schema);
    const responseSupport = summarizeResponseSupport(parsed, config.required_response_shape);
    const outputFormatSupport = summarizeOutputFormatSupport(
      parsed,
      config.required_output_format
    );
    const cueSchemaSupport = summarizeCueSchemaSupport(parsed, config.required_cue_schema);
    const status =
      readinessSupport.engine_reports_ready !== false &&
      schemaSupport.supports_required_request_schema !== false &&
      responseSupport.supports_required_response_shape !== false &&
      outputFormatSupport.supports_required_output_format !== false &&
      cueSchemaSupport.supports_required_cue_schema !== false
        ? "pass"
        : "attention";
    const item = {
      ...base,
      status,
      missing_env: [],
      http_status: safeOptionalNumber(response.status),
      response_kind: responseText.trim() ? "json" : "empty",
      engine_status: safeHealthPublicText(
        parsed.engine_status ?? parsed.status ?? (responseOk ? "ready" : "attention"),
        {
          maxLength: 80,
          fallback: "engine_status_omitted",
        }
      ),
      engine_readiness_status: readinessSupport.engine_readiness_status,
      engine_reports_ready: readinessSupport.engine_reports_ready,
      compatibility_status: schemaSupport.compatibility_status,
      supports_required_request_schema: schemaSupport.supports_required_request_schema,
      response_compatibility_status: responseSupport.response_compatibility_status,
      supports_required_response_shape: responseSupport.supports_required_response_shape,
      output_format_compatibility_status:
        outputFormatSupport.output_format_compatibility_status,
      supports_required_output_format: outputFormatSupport.supports_required_output_format,
      declared_output_format_count: outputFormatSupport.declared_output_format_count,
      compatible_output_format_count: outputFormatSupport.compatible_output_format_count,
      cue_schema_compatibility_status: cueSchemaSupport.cue_schema_compatibility_status,
      supports_required_cue_schema: cueSchemaSupport.supports_required_cue_schema,
      declared_cue_schema_count: cueSchemaSupport.declared_cue_schema_count,
      compatible_cue_schema_count: cueSchemaSupport.compatible_cue_schema_count,
      error_kind: "",
    };
    assertHealthProbeItemSafe(item, `${config.engine_kind} engine health probe`);
    return item;
  } catch (error) {
    const item = {
      ...base,
      status: "attention",
      missing_env: [],
      response_kind: "error",
      engine_readiness_status: "not_checked",
      engine_reports_ready: null,
      compatibility_status: "not_checked",
      response_compatibility_status: "not_checked",
      output_format_compatibility_status: config.required_output_format
        ? "not_checked"
        : "not_applicable",
      supports_required_output_format: null,
      cue_schema_compatibility_status: config.required_cue_schema
        ? "not_checked"
        : "not_applicable",
      supports_required_cue_schema: null,
      error_kind: classifyHealthProbeError(error),
    };
    assertHealthProbeItemSafe(item, `${config.engine_kind} engine health probe failure`);
    return item;
  } finally {
    clearTimeout(timer);
  }
}

function parseHealthJson(text) {
  const raw = String(text ?? "");
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new ContractError("local engine health response must be a JSON object");
    }
    return parsed;
  } catch (error) {
    if (error instanceof ContractError) throw error;
    throw new ContractError("local engine health response requires JSON");
  }
}

function summarizeEngineReadiness(payload) {
  if (typeof payload.ok === "boolean") {
    return {
      engine_readiness_status: payload.ok ? "ready" : "attention",
      engine_reports_ready: payload.ok,
    };
  }
  if (typeof payload.ready === "boolean") {
    return {
      engine_readiness_status: payload.ready ? "ready" : "attention",
      engine_reports_ready: payload.ready,
    };
  }
  const statusText = safeText(
    payload.bridge_status ?? payload.engine_status ?? payload.status,
    80
  ).toLowerCase();
  if (!statusText) {
    return {
      engine_readiness_status: "not_declared",
      engine_reports_ready: null,
    };
  }
  if (["ready", "healthy", "ok", "pass", "available", "running"].includes(statusText)) {
    return {
      engine_readiness_status: "ready",
      engine_reports_ready: true,
    };
  }
  if (
    [
      "attention",
      "not_ready",
      "unhealthy",
      "error",
      "failed",
      "offline",
      "starting",
      "degraded",
      "unavailable",
    ].includes(statusText)
  ) {
    return {
      engine_readiness_status: "attention",
      engine_reports_ready: false,
    };
  }
  return {
    engine_readiness_status: "not_declared",
    engine_reports_ready: null,
  };
}

function summarizeSchemaSupport(payload, requiredSchema) {
  const schemas = [
    ...(Array.isArray(payload.supported_request_schemas) ? payload.supported_request_schemas : []),
    ...(Array.isArray(payload.request_schemas) ? payload.request_schemas : []),
    ...(Array.isArray(payload.schemas) ? payload.schemas : []),
  ].map((item) => safeText(item, 120));
  if (schemas.length === 0) {
    return {
      compatibility_status: "not_declared",
      supports_required_request_schema: null,
    };
  }
  const supportsRequired = schemas.includes(requiredSchema);
  return {
    compatibility_status: supportsRequired ? "compatible" : "schema_mismatch",
    supports_required_request_schema: supportsRequired,
  };
}

function summarizeResponseSupport(payload, requiredResponseShape) {
  const fields = [
    ...(Array.isArray(payload.supported_response_fields) ? payload.supported_response_fields : []),
    ...(Array.isArray(payload.response_fields) ? payload.response_fields : []),
    ...(Array.isArray(payload.supported_response_formats)
      ? payload.supported_response_formats
      : []),
    ...(Array.isArray(payload.response_schemas) ? payload.response_schemas : []),
  ].map((item) => safeText(item, 120));
  if (fields.length === 0) {
    return {
      response_compatibility_status: "not_declared",
      supports_required_response_shape: null,
    };
  }
  const fieldSet = new Set(fields);
  const supportsRequired = requiredResponseShape.any_of.some((requiredFields) =>
    requiredFields.every((field) => fieldSet.has(field))
  );
  return {
    response_compatibility_status: supportsRequired ? "compatible" : "response_shape_mismatch",
    supports_required_response_shape: supportsRequired,
  };
}

function summarizeOutputFormatSupport(payload, requiredOutputFormat) {
  if (!requiredOutputFormat) {
    return {
      output_format_compatibility_status: "not_applicable",
      supports_required_output_format: null,
      declared_output_format_count: 0,
      compatible_output_format_count: 0,
    };
  }
  const formats = extractDeclaredOutputFormats(payload, requiredOutputFormat.kind);
  if (formats.length === 0) {
    return {
      output_format_compatibility_status: "not_declared",
      supports_required_output_format: null,
      declared_output_format_count: 0,
      compatible_output_format_count: 0,
    };
  }
  const compatible = formats.filter((format) =>
    requiredOutputFormat.any_of.includes(normalizeAudioMime(format))
  );
  return {
    output_format_compatibility_status:
      compatible.length > 0 ? "compatible" : "output_format_mismatch",
    supports_required_output_format: compatible.length > 0,
    declared_output_format_count: formats.length,
    compatible_output_format_count: compatible.length,
  };
}

function summarizeCueSchemaSupport(payload, requiredCueSchema) {
  if (!requiredCueSchema) {
    return {
      cue_schema_compatibility_status: "not_applicable",
      supports_required_cue_schema: null,
      declared_cue_schema_count: 0,
      compatible_cue_schema_count: 0,
    };
  }
  const schemas = extractDeclaredCueSchemas(payload);
  if (schemas.length === 0) {
    return {
      cue_schema_compatibility_status: "not_declared",
      supports_required_cue_schema: null,
      declared_cue_schema_count: 0,
      compatible_cue_schema_count: 0,
    };
  }
  const accepted = new Set(requiredCueSchema.any_of);
  const compatible = schemas.filter((schema) => accepted.has(schema));
  return {
    cue_schema_compatibility_status:
      compatible.length > 0 ? "compatible" : "cue_schema_mismatch",
    supports_required_cue_schema: compatible.length > 0,
    declared_cue_schema_count: schemas.length,
    compatible_cue_schema_count: compatible.length,
  };
}

function summarizeOriginalVoiceHealthPreferences(config, env) {
  if (config.engine_kind !== "tts") return {};
  const useCategoryEnvNames = ANIME_PERFORMANCE_VOICE_LICENSE_USE_CATEGORY_ENV_NAMES;
  const configuredUseCategoryCount = useCategoryEnvNames.filter(
    (name) => (env[name] ?? "") !== ""
  ).length;
  return {
    licensed_voice_source_status_configured:
      (env.IRIS_LICENSED_VOICE_SOURCE_STATUS ?? "") !== "",
    voice_license_use_category_count: useCategoryEnvNames.length,
    voice_license_use_category_configured_count: configuredUseCategoryCount,
    voice_license_use_category_missing_count:
      useCategoryEnvNames.length - configuredUseCategoryCount,
    original_voice_boundary_policy: {
      env_names_only: true,
      no_voice_license_values: true,
      no_contract_text: true,
      no_raw_voice_samples: true,
      no_dataset_paths: true,
      no_model_paths: true,
    },
  };
}

function extractDeclaredCueSchemas(payload) {
  return [
    ...(Array.isArray(payload.supported_cue_schemas) ? payload.supported_cue_schemas : []),
    ...(Array.isArray(payload.cue_schemas) ? payload.cue_schemas : []),
    ...(Array.isArray(payload.supported_live2d_cue_schemas)
      ? payload.supported_live2d_cue_schemas
      : []),
    ...(Array.isArray(payload.live2d_cue_schemas) ? payload.live2d_cue_schemas : []),
  ]
    .map((item) => safeText(item, 120))
    .filter(Boolean)
    .slice(0, 80);
}

function extractDeclaredOutputFormats(payload, kind) {
  if (kind !== "audio_mime") return [];
  return [
    ...(Array.isArray(payload.supported_audio_mimes) ? payload.supported_audio_mimes : []),
    ...(Array.isArray(payload.audio_mimes) ? payload.audio_mimes : []),
    ...(Array.isArray(payload.supported_output_mimes) ? payload.supported_output_mimes : []),
    ...(Array.isArray(payload.supported_mime_types) ? payload.supported_mime_types : []),
    ...(Array.isArray(payload.supported_audio_formats) ? payload.supported_audio_formats : []),
  ]
    .map((item) => safeText(item, 120))
    .filter(Boolean)
    .slice(0, 80);
}

function normalizeAudioMime(format) {
  const normalized = safeText(format, 120).toLowerCase();
  if (normalized === "wav" || normalized === "wave" || normalized === "audio/wave") {
    return "audio/wav";
  }
  if (normalized === "mp3" || normalized === "mpeg" || normalized === "audio/mp3") {
    return "audio/mpeg";
  }
  if (normalized === "m4a" || normalized === "mp4" || normalized === "audio/m4a") {
    return "audio/mp4";
  }
  if (normalized === "aac" || normalized === "audio/x-aac") {
    return "audio/aac";
  }
  if (normalized === "flac" || normalized === "audio/x-flac") {
    return "audio/flac";
  }
  if (normalized === "ogg" || normalized === "opus" || normalized === "audio/opus") {
    return "audio/ogg";
  }
  if (normalized === "webm" || normalized === "audio/webm" || normalized === "video/webm") {
    return "audio/webm";
  }
  return normalized;
}

function classifyHealthProbeError(error) {
  if (error?.name === "AbortError") return "timeout";
  if (error instanceof ContractError) {
    if (String(error.message ?? "").includes("requires JSON")) return "invalid_json";
    if (String(error.message ?? "").includes("must be a JSON object")) return "invalid_json";
    return "unsafe_response";
  }
  return "request_error";
}

function summarizeEngineLocalEndpointPolicyStatus({
  engineConfigured,
  healthConfigured,
  engineEndpointScope,
  healthEndpointScope,
}) {
  if (!engineConfigured || !healthConfigured) return "not_configured";
  if (
    summarizeLocalEndpointPolicyStatus(engineEndpointScope) === "blocked" ||
    summarizeLocalEndpointPolicyStatus(healthEndpointScope) === "blocked"
  ) {
    return "blocked";
  }
  return "all_allowed";
}

function summarizeHealthProbes(probes) {
  return {
    total: probes.length,
    pass: probes.filter((probe) => probe.status === "pass").length,
    attention: probes.filter((probe) => probe.status === "attention").length,
    health_endpoint_not_configured: probes.filter(
      (probe) => probe.status === "health_endpoint_not_configured"
    ).length,
    not_configured: probes.filter((probe) => probe.status === "not_configured").length,
    request_schema_compatible: probes.filter(
      (probe) => probe.supports_required_request_schema === true
    ).length,
    request_schema_mismatch: probes.filter(
      (probe) => probe.supports_required_request_schema === false
    ).length,
    request_schema_not_declared: probes.filter(
      (probe) => probe.compatibility_status === "not_declared"
    ).length,
    engine_ready: probes.filter((probe) => probe.engine_readiness_status === "ready").length,
    engine_attention: probes.filter((probe) => probe.engine_reports_ready === false).length,
    engine_readiness_not_declared: probes.filter(
      (probe) => probe.engine_readiness_status === "not_declared"
    ).length,
    response_shape_compatible: probes.filter(
      (probe) => probe.supports_required_response_shape === true
    ).length,
    response_shape_mismatch: probes.filter(
      (probe) => probe.supports_required_response_shape === false
    ).length,
    response_shape_not_declared: probes.filter(
      (probe) => probe.response_compatibility_status === "not_declared"
    ).length,
    output_format_compatible: probes.filter(
      (probe) => probe.supports_required_output_format === true
    ).length,
    output_format_mismatch: probes.filter(
      (probe) => probe.supports_required_output_format === false
    ).length,
    output_format_not_declared: probes.filter(
      (probe) => probe.output_format_compatibility_status === "not_declared"
    ).length,
    cue_schema_compatible: probes.filter(
      (probe) => probe.supports_required_cue_schema === true
    ).length,
    cue_schema_mismatch: probes.filter(
      (probe) => probe.supports_required_cue_schema === false
    ).length,
    cue_schema_not_declared: probes.filter(
      (probe) => probe.cue_schema_compatibility_status === "not_declared"
    ).length,
    local_endpoint_policy_all_allowed: probes.filter(
      (probe) => probe.local_endpoint_policy_status === "all_allowed"
    ).length,
    local_endpoint_policy_not_configured: probes.filter(
      (probe) => probe.local_endpoint_policy_status === "not_configured"
    ).length,
    local_endpoint_policy_blocked: probes.filter(
      (probe) => probe.local_endpoint_policy_status === "blocked"
    ).length,
  };
}

function assertHealthProbeSummarySafe(summary, probes, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  const expected = summarizeHealthProbes(probes);
  const expectedKeys = new Set(Object.keys(expected));
  for (const [field, value] of Object.entries(expected)) {
    if (summary[field] !== value) {
      throw new ContractError(`${context}: summary count mismatch`, { field });
    }
  }
  for (const field of Object.keys(summary)) {
    if (!expectedKeys.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
}

function assertHealthProbeItemSafe(item, context) {
  if (!item || typeof item !== "object") {
    throw new ContractError(`${context}: invalid health probe item`);
  }
  assertNoForbiddenHealthFields(item, context);
  if (item.schema !== "iris_local_engine_health_probe_item_v1") {
    throw new ContractError(`${context}: invalid item schema`, { schema: item.schema });
  }
  if (!["tts", "live2d", "subtitle"].includes(item.engine_kind)) {
    throw new ContractError(`${context}: invalid engine kind`, { engine_kind: item.engine_kind });
  }
  if (
    ![
      "not_configured",
      "health_endpoint_not_configured",
      "pass",
      "attention",
    ].includes(item.status)
  ) {
    throw new ContractError(`${context}: invalid status`, { status: item.status });
  }
  assertHealthBoundaryPolicySafe(item.boundary_policy, context, [
    "env_names_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_payloads",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "read_only",
  ]);
  assertLocalEndpointProbeFieldsSafe(item, context);
  if (
    ![
      "not_checked",
      "not_declared",
      "ready",
      "attention",
      "http_error",
    ].includes(item.engine_readiness_status)
  ) {
    throw new ContractError(`${context}: invalid engine readiness status`, {
      engine_readiness_status: item.engine_readiness_status,
    });
  }
  if (
    item.engine_reports_ready !== null &&
    typeof item.engine_reports_ready !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid engine readiness flag`, {
      engine_reports_ready: item.engine_reports_ready,
    });
  }
  if (
    item.engine_status &&
    safeHealthPublicText(item.engine_status, {
      maxLength: 80,
      fallback: "engine_status_omitted",
    }) !== item.engine_status
  ) {
    throw new ContractError(`${context}: unsafe engine status value`);
  }
  if (
    ![
      "not_checked",
      "not_declared",
      "compatible",
      "response_shape_mismatch",
      "http_error",
    ].includes(item.response_compatibility_status)
  ) {
    throw new ContractError(`${context}: invalid response compatibility status`, {
      response_compatibility_status: item.response_compatibility_status,
    });
  }
  if (
    ![
      "not_applicable",
      "not_checked",
      "not_declared",
      "compatible",
      "output_format_mismatch",
      "http_error",
    ].includes(item.output_format_compatibility_status)
  ) {
    throw new ContractError(`${context}: invalid output format compatibility status`, {
      output_format_compatibility_status: item.output_format_compatibility_status,
    });
  }
  if (!Number.isInteger(item.declared_output_format_count) || item.declared_output_format_count < 0) {
    throw new ContractError(`${context}: invalid declared output format count`, {
      declared_output_format_count: item.declared_output_format_count,
    });
  }
  if (
    !Number.isInteger(item.compatible_output_format_count) ||
    item.compatible_output_format_count < 0
  ) {
    throw new ContractError(`${context}: invalid compatible output format count`, {
      compatible_output_format_count: item.compatible_output_format_count,
    });
  }
  if (
    ![
      "not_applicable",
      "not_checked",
      "not_declared",
      "compatible",
      "cue_schema_mismatch",
      "http_error",
    ].includes(item.cue_schema_compatibility_status)
  ) {
    throw new ContractError(`${context}: invalid cue schema compatibility status`, {
      cue_schema_compatibility_status: item.cue_schema_compatibility_status,
    });
  }
  if (!Number.isInteger(item.declared_cue_schema_count) || item.declared_cue_schema_count < 0) {
    throw new ContractError(`${context}: invalid declared cue schema count`, {
      declared_cue_schema_count: item.declared_cue_schema_count,
    });
  }
  if (
    !Number.isInteger(item.compatible_cue_schema_count) ||
    item.compatible_cue_schema_count < 0
  ) {
    throw new ContractError(`${context}: invalid compatible cue schema count`, {
      compatible_cue_schema_count: item.compatible_cue_schema_count,
    });
  }
  if (item.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
  assertOriginalVoiceHealthProbeFieldsSafe(item, context);
}

function assertOriginalVoiceHealthProbeFieldsSafe(item, context) {
  if (item.engine_kind !== "tts") {
    for (const field of [
      "licensed_voice_source_status_configured",
      "voice_license_use_category_count",
      "voice_license_use_category_configured_count",
      "voice_license_use_category_missing_count",
      "original_voice_boundary_policy",
    ]) {
      if (field in item) {
        throw new ContractError(`${context}: unexpected original voice field`, {
          field,
        });
      }
    }
    return;
  }
  if (typeof item.licensed_voice_source_status_configured !== "boolean") {
    throw new ContractError(`${context}: invalid licensed voice source flag`);
  }
  for (const field of [
    "voice_license_use_category_count",
    "voice_license_use_category_configured_count",
    "voice_license_use_category_missing_count",
  ]) {
    if (!Number.isInteger(item[field]) || item[field] < 0) {
      throw new ContractError(`${context}: invalid voice license count`, {
        field,
      });
    }
  }
  if (
    item.voice_license_use_category_configured_count +
      item.voice_license_use_category_missing_count !==
    item.voice_license_use_category_count
  ) {
    throw new ContractError(`${context}: voice license count mismatch`);
  }
  assertHealthBoundaryPolicySafe(item.original_voice_boundary_policy, context, [
    "env_names_only",
    "no_voice_license_values",
    "no_contract_text",
    "no_raw_voice_samples",
    "no_dataset_paths",
    "no_model_paths",
  ]);
}

function assertHealthBoundaryPolicySafe(policy, context, requiredFields) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary flag ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary flag required ${field}`);
    }
  }
}

function assertLocalEndpointProbeFieldsSafe(item, context) {
  if (
    !["all_allowed", "blocked", "not_configured"].includes(
      item.local_endpoint_policy_status
    )
  ) {
    throw new ContractError(`${context}: invalid local endpoint policy status`, {
      local_endpoint_policy_status: item.local_endpoint_policy_status,
    });
  }
  for (const field of ["engine_endpoint_scope", "health_endpoint_scope"]) {
    if (
      !["not_configured", "invalid", "loopback", "private_network", "external"].includes(
        item[field]
      )
    ) {
      throw new ContractError(`${context}: invalid local endpoint scope`, {
        field,
        value: item[field],
      });
    }
  }
  for (const field of ["engine_endpoint_locality_ok", "health_endpoint_locality_ok"]) {
    if (typeof item[field] !== "boolean") {
      throw new ContractError(`${context}: invalid local endpoint locality flag`, {
        field,
      });
    }
  }
}

function itemBoundaryPolicy() {
  return {
    env_names_only: true,
    no_endpoint_values: true,
    no_secret_values: true,
    no_raw_payloads: true,
    no_text_payloads: true,
    no_candidates: true,
    no_commands: true,
    read_only: true,
  };
}

function assertNoForbiddenHealthFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenHealthFields(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (isForbiddenHealthField(field)) {
      throw new ContractError(`${context}: unsafe health probe field`, { field, path });
    }
    assertNoForbiddenHealthFields(child, context, `${path}.${field}`);
  }
}

function isForbiddenHealthField(field) {
  const normalized = String(field ?? "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .toLowerCase();
  return FORBIDDEN_HEALTH_FIELDS.has(normalized);
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeHealthPublicText(value, { maxLength = 160, fallback = "" } = {}) {
  const text = safeText(value, maxLength);
  if (!text) return fallback;
  if (UNSAFE_HEALTH_PUBLIC_TEXT_PATTERN.test(text)) return fallback;
  return text;
}

function safeOptionalNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}

function optionalEnvValue(value) {
  if (value === undefined || value === null) return undefined;
  if (String(value).trim() === "") return undefined;
  return value;
}

function firstConfiguredEnvName(env, names) {
  return names.find((name) => optionalEnvValue(env[name])) ?? "";
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}
