import "../config/loadIrisEnv.js";
import { ContractError } from "../core/contracts.js";

const FORBIDDEN_OBS_CONFIG_FIELDS = new Set([
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
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
]);

export function createObsOverlayConfig({
  origin = "http://127.0.0.1:8787",
  sourceName = "IRIS Overlay",
  sceneName = "",
  width = 1280,
  height = 720,
  fps = 30,
  shutdownSourceWhenNotVisible = false,
  refreshBrowserWhenSceneBecomesActive = false,
  generatedAtMs = Date.now(),
} = {}) {
  const safeOrigin = normalizeOrigin(origin);
  const safeWidth = clampInteger(width, 320, 7680, 1280);
  const safeHeight = clampInteger(height, 180, 4320, 720);
  const urls = createOverlayUrls(safeOrigin);
  const config = {
    schema: "iris_obs_browser_source_config_v1",
    generated_at_ms: generatedAtMs,
    obs_browser_source: {
      source_name: safeText(sourceName, 80) || "IRIS Overlay",
      scene_name: safeText(sceneName, 80),
      browser_source_url: urls.overlay,
      width: safeWidth,
      height: safeHeight,
      fps: clampInteger(fps, 1, 120, 30),
      shutdown_source_when_not_visible: shutdownSourceWhenNotVisible === true,
      refresh_browser_when_scene_becomes_active:
        refreshBrowserWhenSceneBecomesActive === true,
      css_hint: "Use default page CSS first; add OBS-side CSS only for scene-specific cropping.",
    },
    endpoints: {
      overlay_path: "/overlay",
      overlay_url: urls.overlay,
      display_event_path: "/overlay/event",
      display_event_url: urls.displayEvent,
      event_stream_path: "/overlay/events",
      event_stream_url: urls.eventStream,
      event_stream_status_path: "/overlay/events/status",
      event_stream_status_url: urls.eventStreamStatus,
      overlay_status_path: "/overlay/status",
      overlay_status_url: urls.overlayStatus,
      local_bridge_event_render_manifest_status_path: "/event-render-manifests/status",
      local_bridge_event_render_manifest_status_url: urls.renderManifestStatus,
      local_bridge_event_render_manifest_latest_path: "/event-render-manifests/latest",
      local_bridge_event_render_manifest_latest_url: urls.renderManifestLatest,
    },
    local_bridge_handoff: {
      render_manifest_status_path: "/event-render-manifests/status",
      render_manifest_status_url: urls.renderManifestStatus,
      latest_render_manifest_report_path: "/event-render-manifests/latest",
      latest_render_manifest_report_url: urls.renderManifestLatest,
      latest_artifact_paths: {
        tts: "/event-render-manifests/latest/artifact/tts",
        live2d: "/event-render-manifests/latest/artifact/live2d?allow_partial_visual=true",
        subtitle: "/event-render-manifests/latest/artifact/subtitle?allow_partial_visual=true",
      },
      latest_artifact_urls: {
        tts: urls.latestTtsArtifact,
        live2d: urls.latestLive2dArtifact,
        subtitle: urls.latestSubtitleArtifact,
      },
      required_adapter_kinds: ["tts", "live2d", "subtitle"],
      status_policy: "counts_and_availability_no_artifact_paths",
      artifact_delivery_policy:
        "local_read_only_latest_manifest_only_with_manifest_and_render_timestamp_match",
      obs_usage:
        "monitor_tts_live2d_subtitle_sync_and_file_availability_before_local_artifact_pickup",
    },
    safe_area: {
      base_width: safeWidth,
      base_height: safeHeight,
      subtitle_bottom_percent: 8,
      subtitle_max_width_percent: 76,
      face_closeup_comfort_margin_percent: 6,
    },
    class_hints: [
      "big-laugh",
      "focused-talk",
      "soft-motion",
      "camera-close",
      "camera-extreme",
      "autonomous-scream",
      "tongue-twister",
    ],
    boundary_policy: {
      configuration_only: true,
      no_live_payloads: true,
      no_raw_text: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertObsOverlayConfigSafe(config);
  return config;
}

function createOverlayUrls(origin) {
  const overlay = new URL("/overlay", origin);
  overlay.searchParams.set("event_stream", "/overlay/events");
  overlay.searchParams.set("event_bootstrap", "/overlay/event");
  overlay.searchParams.set("state", "/state");
  overlay.searchParams.set("manifest", "/event-render-manifests/latest");
  overlay.searchParams.set("artifact_tts", "/event-render-manifests/latest/artifact/tts");
  overlay.searchParams.set(
    "artifact_live2d",
    "/event-render-manifests/latest/artifact/live2d?allow_partial_visual=true"
  );
  overlay.searchParams.set(
    "artifact_subtitle",
    "/event-render-manifests/latest/artifact/subtitle?allow_partial_visual=true"
  );
  return {
    overlay: overlay.toString(),
    displayEvent: new URL("/overlay/event", origin).toString(),
    eventStream: new URL("/overlay/events", origin).toString(),
    eventStreamStatus: new URL("/overlay/events/status", origin).toString(),
    overlayStatus: new URL("/overlay/status", origin).toString(),
    renderManifestStatus: new URL("/event-render-manifests/status", origin).toString(),
    renderManifestLatest: new URL("/event-render-manifests/latest", origin).toString(),
    latestTtsArtifact: new URL("/event-render-manifests/latest/artifact/tts", origin).toString(),
    latestLive2dArtifact: withQueryParam(
      new URL("/event-render-manifests/latest/artifact/live2d", origin),
      "allow_partial_visual",
      "true"
    ).toString(),
    latestSubtitleArtifact: withQueryParam(
      new URL("/event-render-manifests/latest/artifact/subtitle", origin),
      "allow_partial_visual",
      "true"
    ).toString(),
  };
}

function withQueryParam(url, key, value) {
  url.searchParams.set(key, value);
  return url;
}

export function createObsOverlayConfigFromEnv(env = process.env, { fallbackOrigin = "" } = {}) {
  return createObsOverlayConfig({
    origin:
      optionalEnvValue(env.IRIS_HTTP_ORIGIN) ||
      optionalEnvValue(fallbackOrigin) ||
      "http://127.0.0.1:8787",
    sourceName: optionalEnvValue(env.IRIS_OBS_SOURCE_NAME) ?? "IRIS Overlay",
    sceneName: optionalEnvValue(env.IRIS_OBS_SCENE_NAME) ?? "",
    width: optionalEnvValue(env.IRIS_OBS_SOURCE_WIDTH) ?? 1280,
    height: optionalEnvValue(env.IRIS_OBS_SOURCE_HEIGHT) ?? 720,
    fps: optionalEnvValue(env.IRIS_OBS_SOURCE_FPS) ?? 30,
    shutdownSourceWhenNotVisible: env.IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE === "true",
    refreshBrowserWhenSceneBecomesActive:
      env.IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE === "true",
  });
}

export function assertObsOverlayConfigSafe(config, context = "OBS overlay config") {
  if (!config || typeof config !== "object") {
    throw new ContractError(`${context}: missing config`);
  }
  assertNoForbiddenObsConfigFields(config, context);
  if (config.schema !== "iris_obs_browser_source_config_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: config.schema });
  }
  assertBoundaryPolicy(config.boundary_policy, context);
  const source = config.obs_browser_source ?? {};
  if (source.scene_name !== undefined && typeof source.scene_name !== "string") {
    throw new ContractError(`${context}: scene_name must be a string`);
  }
  if (
    !Number.isInteger(source.width) ||
    !Number.isInteger(source.height) ||
    !Number.isInteger(source.fps)
  ) {
    throw new ContractError(`${context}: OBS dimensions must be integer values`);
  }
  if (config.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

function normalizeOrigin(origin) {
  try {
    const url = new URL(String(origin || "http://127.0.0.1:8787"));
    if (!["http:", "https:"].includes(url.protocol)) return "http://127.0.0.1:8787";
    if (["0.0.0.0", "::", "[::]"].includes(url.hostname)) {
      url.hostname = "127.0.0.1";
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return "http://127.0.0.1:8787";
  }
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function optionalEnvValue(value) {
  const text = String(value ?? "").trim();
  return text ? value : undefined;
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function assertNoForbiddenObsConfigFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenObsConfigFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_OBS_CONFIG_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe OBS config field`, { field, path });
    }
    assertNoForbiddenObsConfigFields(child, context, `${path}.${field}`);
  }
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const requiredFields = [
    "configuration_only",
    "no_live_payloads",
    "no_raw_text",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ];
  const allowed = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary flag ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}
