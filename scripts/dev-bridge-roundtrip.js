import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { normalizeYouTubeComment } from "../src/adapters/youtube/commentAdapter.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createLocalBridgeServer } from "../src/server/localBridgeServer.js";
import { listen } from "../src/server/httpServer.js";

const outboxDir = process.env.IRIS_LOCAL_BRIDGE_OUTBOX_DIR ?? "data/local_bridge_outbox";
const bridgeServer = createLocalBridgeServer({ outboxDir, logger: { error() {} } });
const address = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });
const baseUrl = `http://${address.address}:${address.port}`;

try {
  const env = {
    ...process.env,
    IRIS_TTS_ADAPTER: "http",
    IRIS_TTS_ENDPOINT: `${baseUrl}/tts`,
    IRIS_LIVE2D_ADAPTER: "http",
    IRIS_LIVE2D_ENDPOINT: `${baseUrl}/live2d`,
    IRIS_SUBTITLE_ADAPTER: "http",
    IRIS_SUBTITLE_ENDPOINT: `${baseUrl}/subtitle`,
  };
  const adapters = createRuntimeAdaptersFromEnv(env);
  const runtime = createIrisRuntime({
    runtimeConfig: createRuntimeConfig(env),
    ...adapters,
    logger: { log() {} },
  });
  const result = await runtime.processEvent(
    normalizeYouTubeComment({
      text: process.argv.slice(2).join(" ") || "IRIS, local bridge roundtrip test",
      display_name: "local_bridge_tester",
      author_channel_id: "local-bridge-tester",
    })
  );
  const statusResponse = await fetch(`${baseUrl}/status`);
  const statusBody = await statusResponse.json();

  console.log(
    JSON.stringify(
      {
        ok: true,
        local_bridge_configured: true,
        final_decision: result.core.phase15.final_decision,
        adapter_results: {
          tts: summarizeAdapterResult(result.adapters.tts.response_summary),
          live2d: summarizeAdapterResult(result.adapters.live2d.response_summary),
          subtitle: summarizeAdapterResult(result.adapters.subtitle.response_summary),
        },
        local_bridge_status: summarizeLocalBridgeStatus(statusBody.local_bridge_status, result.adapters),
        boundary_policy: {
          no_endpoint_values: true,
          no_path_values: true,
          no_raw_packets: true,
          no_text_payloads: true,
          no_candidates: true,
          no_commands: true,
          no_secret_values: true,
          ids_hidden: true,
        },
      },
      null,
      2
    )
  );
} finally {
  await new Promise((resolve, reject) => {
    bridgeServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function summarizeAdapterResult(summary) {
  if (!summary) return null;
  return {
    status: summary.status,
    ok: summary.ok === true,
    response_kind: summary.response_kind,
    response_omitted: summary.response_omitted === true,
    error_kind: summary.error_kind ?? null,
    request_id_present: String(summary.request_id ?? "").trim() !== "",
    event_id_present: String(summary.event_id ?? "").trim() !== "",
    bridge_status: summary.bridge_status,
    artifact_available:
      String(summary.artifact_url ?? "").trim() !== "" ||
      String(summary.manifest_id ?? "").trim() !== "",
    artifact_url_present: String(summary.artifact_url ?? "").trim() !== "",
    manifest_id_present: String(summary.manifest_id ?? "").trim() !== "",
    artifact_kind: summary.artifact_kind ?? "",
    duration_ms: summary.duration_ms,
    sample_rate_hz: summary.sample_rate_hz ?? null,
    viseme_count: summary.viseme_count ?? 0,
  };
}

function summarizeLocalBridgeStatus(status, adapterResults) {
  if (!status) return null;
  return {
    schema: status.schema,
    bridge_status: status.bridge_status,
    accepted_adapter_kind_count: status.accepted_adapter_kinds?.length ?? 0,
    total_received: status.total_received ?? 0,
    adapters: Object.fromEntries(
      Object.entries(status.adapters ?? {}).map(([kind, adapter]) => [
        kind,
        {
          received_count: adapter.received_count ?? 0,
          last_event_id_present:
            String(adapterResults?.[kind]?.response_summary?.event_id ?? "").trim() !== "",
          last_bridge_status: adapter.last_bridge_status ?? null,
          last_artifact_kind: adapter.last_artifact_kind ?? null,
          last_duration_ms: adapter.last_duration_ms ?? null,
        },
      ])
    ),
    outbox_enabled: status.outbox?.enabled === true,
    outbox_adapter_count: Object.keys(status.outbox?.adapters ?? {}).length,
    recent_count: status.recent?.length ?? 0,
    boundary_policy: status.boundary_policy,
    adapter_validation_required: status.adapter_validation_required === true,
  };
}
