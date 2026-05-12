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
const OBS_OVERLAY_URL_REDACTION_STATUS_FIELDS = new Set([
  "schema",
  "overlay_url_status",
  "public_view_safe",
  "admin_ordinary_view_safe",
  "logs_safe",
  "boundary_policy",
]);
const OBS_BROWSER_SOURCE_SETUP_STATUS_FIELDS = new Set([
  "schema",
  "browser_source_setup_status",
  "configured",
  "missing_count",
  "boundary_policy",
]);
const OBS_OVERLAY_FIXTURE_PREVIEW_STATUS_FIELDS = new Set([
  "schema",
  "preview_status",
  "fixture_source",
  "synthetic_fixture_only",
  "real_input_used",
  "boundary_policy",
]);
const OBS_ARTIFACT_SYNC_GUARD_STATUS_FIELDS = new Set([
  "schema",
  "artifact_sync_guard_status",
  "check_count",
  "boundary_policy",
]);
const OBS_COMMAND_PUBLIC_LEAK_GUARD_STATUS_FIELDS = new Set([
  "schema",
  "command_public_leak_guard_status",
  "public_json_safe",
  "replay_safe",
  "ordinary_diagnostics_safe",
  "redacted_command_count",
  "boundary_policy",
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

export function createObsOverlayUrlRedactionStatus({ configured = false } = {}) {
  const status = {
    schema: "iris_obs_overlay_url_redaction_status_v1",
    overlay_url_status: configured === true ? "configured" : "missing",
    public_view_safe: true,
    admin_ordinary_view_safe: true,
    logs_safe: true,
    boundary_policy: {
      status_only: true,
      no_overlay_url_values: true,
      no_endpoint_values: true,
      no_obs_credentials: true,
      no_secret_values: true,
      no_raw_payloads: true,
      no_commands: true,
    },
  };
  assertObsOverlayUrlRedactionStatusSafe(status);
  return status;
}

export function createObsBrowserSourceSetupStatus({
  configured = false,
  missingCount = 0,
} = {}) {
  const isConfigured = configured === true;
  const status = {
    schema: "iris_obs_browser_source_setup_status_v1",
    browser_source_setup_status: isConfigured ? "configured" : "missing",
    configured: isConfigured,
    missing_count: isConfigured ? 0 : clampInteger(missingCount, 0, 32, 0),
    boundary_policy: {
      configured_missing_status_only: true,
      no_url_values: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_obs_credentials: true,
      no_raw_payloads: true,
      no_commands: true,
    },
  };
  assertObsBrowserSourceSetupStatusSafe(status);
  return status;
}

export function createObsOverlayFixturePreviewStatus({ previewReady = true } = {}) {
  const status = {
    schema: "iris_obs_overlay_fixture_preview_status_v1",
    preview_status: previewReady === true ? "configured" : "missing",
    fixture_source: "synthetic_fixture",
    synthetic_fixture_only: true,
    real_input_used: false,
    boundary_policy: {
      synthetic_fixture_only: true,
      no_real_raw_comments: true,
      no_real_raw_frames: true,
      no_raw_payloads: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_commands: true,
    },
  };
  assertObsOverlayFixturePreviewStatusSafe(status);
  return status;
}

export function createObsArtifactSyncGuardStatus({
  status = "missing",
  checkCount = 0,
} = {}) {
  const safeStatus = ["configured", "missing", "ready", "attention"].includes(status)
    ? status
    : "attention";
  const guardStatus = {
    schema: "iris_obs_artifact_sync_guard_status_v1",
    artifact_sync_guard_status: safeStatus,
    check_count: clampInteger(checkCount, 0, 64, 0),
    boundary_policy: {
      status_and_count_only: true,
      no_raw_artifact_bodies: true,
      no_artifact_paths: true,
      no_internal_payloads: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_commands: true,
    },
  };
  assertObsArtifactSyncGuardStatusSafe(guardStatus);
  return guardStatus;
}

export function createObsCommandPublicLeakGuardStatus({
  status = "configured",
  redactedCommandCount = 0,
} = {}) {
  const safeStatus = ["configured", "missing", "attention"].includes(status)
    ? status
    : "attention";
  const guardStatus = {
    schema: "iris_obs_command_public_leak_guard_status_v1",
    command_public_leak_guard_status: safeStatus,
    public_json_safe: true,
    replay_safe: true,
    ordinary_diagnostics_safe: true,
    redacted_command_count: clampInteger(redactedCommandCount, 0, 1_000_000, 0),
    boundary_policy: {
      safe_surface_status_only: true,
      no_obs_commands: true,
      no_bridge_commands: true,
      no_raw_commands: true,
      no_raw_payloads: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
  };
  assertObsCommandPublicLeakGuardStatusSafe(guardStatus);
  return guardStatus;
}

export function assertObsOverlayUrlRedactionStatusSafe(
  status,
  context = "OBS overlay URL redaction status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status required`);
  }
  for (const field of Object.keys(status)) {
    if (!OBS_OVERLAY_URL_REDACTION_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`, { field });
    }
  }
  if (status.schema !== "iris_obs_overlay_url_redaction_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["configured", "missing"].includes(status.overlay_url_status)) {
    throw new ContractError(`${context}: invalid overlay URL status`);
  }
  for (const field of ["public_view_safe", "admin_ordinary_view_safe", "logs_safe"]) {
    if (status[field] !== true) {
      throw new ContractError(`${context}: unsafe surface`, { field });
    }
  }
  assertSafeSummaryBoundaryPolicy(
    status.boundary_policy,
    [
      "status_only",
      "no_overlay_url_values",
      "no_endpoint_values",
      "no_obs_credentials",
      "no_secret_values",
      "no_raw_payloads",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoObsOverlayUrlRedactionLeak(status, context);
}

export function assertObsBrowserSourceSetupStatusSafe(
  status,
  context = "OBS browser source setup status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status required`);
  }
  for (const field of Object.keys(status)) {
    if (!OBS_BROWSER_SOURCE_SETUP_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`, { field });
    }
  }
  if (status.schema !== "iris_obs_browser_source_setup_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["configured", "missing"].includes(status.browser_source_setup_status)) {
    throw new ContractError(`${context}: invalid browser source setup status`);
  }
  if (typeof status.configured !== "boolean") {
    throw new ContractError(`${context}: configured flag must be boolean`);
  }
  if (
    (status.browser_source_setup_status === "configured") !== status.configured
  ) {
    throw new ContractError(`${context}: configured flag mismatch`);
  }
  if (!Number.isInteger(status.missing_count) || status.missing_count < 0) {
    throw new ContractError(`${context}: invalid missing count`);
  }
  if (status.configured && status.missing_count !== 0) {
    throw new ContractError(`${context}: configured status must not report missing setup`);
  }
  assertSafeSummaryBoundaryPolicy(
    status.boundary_policy,
    [
      "configured_missing_status_only",
      "no_url_values",
      "no_endpoint_values",
      "no_secret_values",
      "no_obs_credentials",
      "no_raw_payloads",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoObsBrowserSourceSetupStatusLeak(status, context);
}

export function assertObsOverlayFixturePreviewStatusSafe(
  status,
  context = "OBS overlay fixture preview status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status required`);
  }
  for (const field of Object.keys(status)) {
    if (!OBS_OVERLAY_FIXTURE_PREVIEW_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`, { field });
    }
  }
  if (status.schema !== "iris_obs_overlay_fixture_preview_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["configured", "missing"].includes(status.preview_status)) {
    throw new ContractError(`${context}: invalid preview status`);
  }
  if (
    status.fixture_source !== "synthetic_fixture" ||
    status.synthetic_fixture_only !== true ||
    status.real_input_used !== false
  ) {
    throw new ContractError(`${context}: preview must use synthetic fixture only`);
  }
  assertSafeSummaryBoundaryPolicy(
    status.boundary_policy,
    [
      "synthetic_fixture_only",
      "no_real_raw_comments",
      "no_real_raw_frames",
      "no_raw_payloads",
      "no_endpoint_values",
      "no_secret_values",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoObsOverlayFixturePreviewLeak(status, context);
}

export function assertObsArtifactSyncGuardStatusSafe(
  status,
  context = "OBS artifact sync guard status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status required`);
  }
  for (const field of Object.keys(status)) {
    if (!OBS_ARTIFACT_SYNC_GUARD_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`, { field });
    }
  }
  if (status.schema !== "iris_obs_artifact_sync_guard_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["configured", "missing", "ready", "attention"].includes(status.artifact_sync_guard_status)) {
    throw new ContractError(`${context}: invalid guard status`);
  }
  if (!Number.isInteger(status.check_count) || status.check_count < 0) {
    throw new ContractError(`${context}: invalid check count`);
  }
  assertSafeSummaryBoundaryPolicy(
    status.boundary_policy,
    [
      "status_and_count_only",
      "no_raw_artifact_bodies",
      "no_artifact_paths",
      "no_internal_payloads",
      "no_endpoint_values",
      "no_secret_values",
      "no_commands",
    ],
    `${context}: boundary policy`
  );
  assertNoObsArtifactSyncGuardLeak(status, context);
}

export function assertObsCommandPublicLeakGuardStatusSafe(
  status,
  context = "OBS command public leak guard status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status required`);
  }
  for (const field of Object.keys(status)) {
    if (!OBS_COMMAND_PUBLIC_LEAK_GUARD_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`, { field });
    }
  }
  if (status.schema !== "iris_obs_command_public_leak_guard_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["configured", "missing", "attention"].includes(status.command_public_leak_guard_status)) {
    throw new ContractError(`${context}: invalid guard status`);
  }
  for (const field of ["public_json_safe", "replay_safe", "ordinary_diagnostics_safe"]) {
    if (status[field] !== true) {
      throw new ContractError(`${context}: unsafe surface`, { field });
    }
  }
  if (!Number.isInteger(status.redacted_command_count) || status.redacted_command_count < 0) {
    throw new ContractError(`${context}: invalid redacted command count`);
  }
  assertSafeSummaryBoundaryPolicy(
    status.boundary_policy,
    [
      "safe_surface_status_only",
      "no_obs_commands",
      "no_bridge_commands",
      "no_raw_commands",
      "no_raw_payloads",
      "no_endpoint_values",
      "no_secret_values",
    ],
    `${context}: boundary policy`
  );
  assertNoObsCommandPublicLeak(status, context);
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

function assertNoObsOverlayUrlRedactionLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /https?:\/\/|\/overlay(?:[/?#]|$)|endpoint|obs[_ -]?credential|credential|authorization|bearer\s+|api[_ -]?key|token|secret|password|raw[_ -]?payload|payload|world[_ -]?command|obs[_ -]?command|bridge[_ -]?command/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe OBS overlay URL material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoObsOverlayUrlRedactionLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoObsOverlayUrlRedactionLeak(child, context, `${path}.${field}`);
  }
}

function assertNoObsBrowserSourceSetupStatusLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /https?:\/\/|\/overlay(?:[/?#]|$)|browser[_ -]?source[_ -]?url|overlay[_ -]?url|url[_ -]?value|endpoint|obs[_ -]?credential|credential|authorization|bearer\s+|api[_ -]?key|token|secret|password|raw[_ -]?payload|payload|world[_ -]?command|obs[_ -]?command|bridge[_ -]?command/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe OBS browser source setup material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoObsBrowserSourceSetupStatusLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoObsBrowserSourceSetupStatusLeak(child, context, `${path}.${field}`);
  }
}

function assertNoObsOverlayFixturePreviewLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /real[_ -]?raw[_ -]?comment|raw[_ -]?comment|real[_ -]?raw[_ -]?frame|raw[_ -]?frame|https?:\/\/|endpoint|authorization|bearer\s+|api[_ -]?key|token|secret|password|raw[_ -]?payload|payload|world[_ -]?command|obs[_ -]?command|bridge[_ -]?command/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe OBS overlay preview material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoObsOverlayFixturePreviewLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoObsOverlayFixturePreviewLeak(child, context, `${path}.${field}`);
  }
}

function assertNoObsArtifactSyncGuardLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /raw[_ -]?artifact|artifact[_ -]?body|artifact[_ -]?path|internal[_ -]?payload|raw[_ -]?payload|payload|[A-Za-z]:\\|\/(?:tmp|var|home|users)\b|https?:\/\/|endpoint|authorization|bearer\s+|api[_ -]?key|token|secret|password|world[_ -]?command|obs[_ -]?command|bridge[_ -]?command/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe artifact sync guard material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoObsArtifactSyncGuardLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoObsArtifactSyncGuardLeak(child, context, `${path}.${field}`);
  }
}

function assertNoObsCommandPublicLeak(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /obs[_ -]?command|bridge[_ -]?command|raw[_ -]?command|world[_ -]?command|command[_ -]?payload|raw[_ -]?payload|payload|https?:\/\/|endpoint|authorization|bearer\s+|api[_ -]?key|token|secret|password/i.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe OBS command material leaked`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoObsCommandPublicLeak(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (path === "root" && field === "schema") continue;
    assertNoObsCommandPublicLeak(child, context, `${path}.${field}`);
  }
}

function assertSafeSummaryBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
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
