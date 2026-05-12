import "../src/config/loadIrisEnv.js";
import { createLocalBridgeServer } from "../src/server/localBridgeServer.js";
import { listen } from "../src/server/httpServer.js";

const port = Number(process.env.IRIS_LOCAL_BRIDGE_PORT ?? 8790);
const host = process.env.IRIS_LOCAL_BRIDGE_HOST ?? "127.0.0.1";
const outboxDir = process.env.IRIS_LOCAL_BRIDGE_OUTBOX_DIR ?? "data/local_bridge_outbox";
const artifactDir =
  process.env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR ?? "data/local_bridge_artifacts";
const maxRenderManifestAgeMs = parseOptionalInteger(
  process.env.IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS
);
const maxArtifactRenderSkewMs = parseOptionalInteger(
  process.env.IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS
);
const gameControlSideEffectsEnabled =
  process.env.IRIS_LOCAL_BRIDGE_GAME_CONTROL_SIDE_EFFECTS_ENABLED === "true" ||
  (process.env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true" &&
    process.env.IRIS_LOCAL_BRIDGE_GAME_CONTROL_SIDE_EFFECTS_ENABLED !== "false");
const server = createLocalBridgeServer({
  outboxDir,
  artifactDir,
  apiKey: process.env.IRIS_LOCAL_BRIDGE_API_KEY ?? "",
  maxRenderManifestAgeMs,
  maxArtifactRenderSkewMs,
  gameControlSideEffectsEnabled,
});
await listen(server, { port, host });

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_local_bridge_startup_v1",
      service: "local_adapter_bridge",
      listening: {
        status: "listening",
        host_env_name: "IRIS_LOCAL_BRIDGE_HOST",
        port_env_name: "IRIS_LOCAL_BRIDGE_PORT",
      },
      route_paths: {
        health_path: "/health",
        status_path: "/status",
        event_render_manifest_status_path: "/event-render-manifests/status",
        latest_render_manifest_report_path: "/event-render-manifests/latest",
        latest_tts_artifact_path: "/event-render-manifests/latest/artifact/tts",
        latest_live2d_artifact_path: "/event-render-manifests/latest/artifact/live2d",
        latest_subtitle_artifact_path: "/event-render-manifests/latest/artifact/subtitle",
        tts_path: "/tts",
        live2d_path: "/live2d",
        subtitle_path: "/subtitle",
        game_control_path: "/game-control",
      },
      configure_iris_env_names: [
        "IRIS_TTS_ADAPTER",
        "IRIS_TTS_ENDPOINT",
        "IRIS_LIVE2D_ADAPTER",
        "IRIS_LIVE2D_ENDPOINT",
        "IRIS_SUBTITLE_ADAPTER",
        "IRIS_SUBTITLE_ENDPOINT",
        "IRIS_GAME_CONTROL_ADAPTER",
        "IRIS_GAME_CONTROL_ENDPOINT",
      ],
      configured_env: [
        "IRIS_LOCAL_BRIDGE_HOST",
        "IRIS_LOCAL_BRIDGE_PORT",
        "IRIS_LOCAL_BRIDGE_OUTBOX_DIR",
        "IRIS_LOCAL_BRIDGE_ARTIFACT_DIR",
        "IRIS_LOCAL_BRIDGE_RENDER_MANIFEST_MAX_AGE_MS",
        "IRIS_LOCAL_BRIDGE_RENDER_ARTIFACT_MAX_SKEW_MS",
      ],
      storage: {
        outbox_configured: outboxDir !== "",
        artifact_store_configured: artifactDir !== "",
        render_manifest_stale_guard_configured: maxRenderManifestAgeMs !== null,
        artifact_render_sync_guard_configured: maxArtifactRenderSkewMs !== null,
      },
      boundary_policy: {
        no_endpoint_values: true,
        no_listening_target_values: true,
        no_local_paths: true,
        no_secret_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
      },
    },
    null,
    2
  )
);

function parseOptionalInteger(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.trunc(number);
}
