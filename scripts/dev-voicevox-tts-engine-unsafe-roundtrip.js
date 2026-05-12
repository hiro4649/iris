import assert from "node:assert/strict";
import { createVoicevoxTtsEngineBridgeServer } from "../src/server/voicevoxTtsEngineBridge.js";
import { listen } from "../src/server/httpServer.js";

const VOICEVOX_TTS_ENGINE_UNSAFE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "response_status",
  "safe_error_kind",
  "fixture_engine_fetch_count",
  "boundary_policy",
]);

let fetchCount = 0;
const bridgeServer = createVoicevoxTtsEngineBridgeServer({
  voicevoxEndpoint: "http://127.0.0.1:50021",
  fetchImpl: async () => {
    fetchCount += 1;
    throw new Error("unsafe VOICEVOX bridge request should be rejected before fetch");
  },
  logger: { error() {} },
});

const address = await listen(bridgeServer, { host: "127.0.0.1", port: 0 });
const bridgeBase = `http://${address.address}:${address.port}`;

try {
  const response = await fetch(`${bridgeBase}/tts-engine`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      schema: "iris_local_tts_engine_request_v1",
      job_id: "unsafe-voicevox-job",
      event_id: "unsafe-voicevox-event",
      text: "unsafe bridge request text",
      language: "ja",
      input_action_candidate: { kind: "press_key", key: "space" },
    }),
  });
  const body = await response.json();
  const report = {
    ok: response.status === 400 && body.error_kind === "unsafe_payload" && fetchCount === 0,
    schema: "iris_voicevox_tts_engine_unsafe_roundtrip_report_v1",
    response_status: response.status,
    safe_error_kind: body.error_kind,
    fixture_engine_fetch_count: fetchCount,
    boundary_policy: {
      unsafe_request_rejected_before_engine_fetch: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_text: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assert.equal(report.ok, true);
  assertVoicevoxTtsEngineUnsafeRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report, { bridgeBase });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await closeServer(bridgeServer);
}

function assertVoicevoxTtsEngineUnsafeRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("VOICEVOX unsafe roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!VOICEVOX_TTS_ENGINE_UNSAFE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`VOICEVOX unsafe unexpected report field ${field}`);
    }
  }
  if (
    report.ok !== true ||
    report.schema !== "iris_voicevox_tts_engine_unsafe_roundtrip_report_v1" ||
    report.fixture_engine_fetch_count !== 0
  ) {
    throw new Error("VOICEVOX unsafe roundtrip status mismatch");
  }
  for (const field of [
    "unsafe_request_rejected_before_engine_fetch",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_text",
    "no_candidates",
    "no_commands",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`VOICEVOX unsafe boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(report, { bridgeBase }) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    bridgeBase,
    "unsafe-voicevox-job",
    "unsafe-voicevox-event",
    "unsafe bridge request text",
    "input_action_candidate",
    "press_key",
    "space",
    "http://127.0.0.1:50021",
    "token-value",
    "secret-value",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`VOICEVOX unsafe roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
