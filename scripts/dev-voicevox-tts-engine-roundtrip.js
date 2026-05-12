import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createVoicevoxTtsEngineBridgeServer } from "../src/server/voicevoxTtsEngineBridge.js";
import { listen } from "../src/server/httpServer.js";

const VOICEVOX_TTS_ENGINE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "fixture_engine_requests",
  "health_summary",
  "tts_engine_response_summary",
  "boundary_policy",
]);

const fixtureSpeech = "IRIS voicevox bridge fixture speech";
const fixtureSpeaker = "7";
const requestCounts = {
  audio_query: 0,
  synthesis: 0,
};
const requestFacts = {
  speech_payload_forwarded: false,
  speaker_parameter_present: false,
  synthesis_body_received: false,
  speed_scale_forwarded: false,
  intonation_scale_forwarded: false,
  pitch_scale_forwarded: false,
  volume_scale_forwarded: false,
  phoneme_lengths_adjusted: false,
};

const voicevoxFixtureServer = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, "http://127.0.0.1");
  if (request.method === "GET" && requestUrl.pathname === "/version") {
    return sendJson(response, 200, { version: "fixture" });
  }
  if (request.method === "POST" && requestUrl.pathname === "/audio_query") {
    requestCounts.audio_query += 1;
    requestFacts.speech_payload_forwarded = requestUrl.searchParams.get("text") === fixtureSpeech;
    requestFacts.speaker_parameter_present = requestUrl.searchParams.get("speaker") === fixtureSpeaker;
    return sendJson(response, 200, {
      speedScale: 1,
      intonationScale: 1,
      volumeScale: 1,
      prePhonemeLength: 0.1,
      postPhonemeLength: 0.1,
      outputSamplingRate: 48000,
      outputStereo: false,
      accentPhrases: [],
    });
  }
  if (request.method === "POST" && requestUrl.pathname === "/synthesis") {
    requestCounts.synthesis += 1;
    const body = await readRequestJson(request);
    requestFacts.synthesis_body_received =
      body !== null && typeof body === "object" && !Array.isArray(body);
    requestFacts.speed_scale_forwarded = Number(body.speedScale) > 1;
    requestFacts.intonation_scale_forwarded = Number(body.intonationScale) > 1;
    requestFacts.pitch_scale_forwarded = Number(body.pitchScale) > 0;
    requestFacts.volume_scale_forwarded = Number(body.volumeScale) > 1;
    requestFacts.phoneme_lengths_adjusted =
      Number(body.prePhonemeLength) < 0.1 && Number(body.postPhonemeLength) < 0.1;
    response.writeHead(200, {
      "content-type": "audio/wav",
      "cache-control": "no-store",
    });
    response.end(Buffer.from("RIFF1234WAVEdata", "ascii"));
    return;
  }
  sendJson(response, 404, { ok: false, error: "not_found" });
});

let bridgeServer = null;
const voicevoxAddress = await listen(voicevoxFixtureServer, {
  host: "127.0.0.1",
  port: 0,
});
const voicevoxBase = `http://${voicevoxAddress.address}:${voicevoxAddress.port}`;

try {
  bridgeServer = createVoicevoxTtsEngineBridgeServer({
    voicevoxEndpoint: voicevoxBase,
    speakerId: fixtureSpeaker,
    timeoutMs: 5000,
    logger: { error() {} },
  });
  const bridgeAddress = await listen(bridgeServer, { host: "127.0.0.1", port: 0 });
  const bridgeBase = `http://${bridgeAddress.address}:${bridgeAddress.port}`;

  const health = await fetchJson(`${bridgeBase}/health`);
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.schema, "iris_voicevox_tts_engine_bridge_health_v1");
  assert.equal(health.body.local_endpoint_policy, "loopback_or_private_network_only");
  assert.equal(health.body.local_endpoint_policy_status, "all_allowed");
  assert.equal(health.body.engine_endpoint_scope, "loopback");
  assert.equal(health.body.engine_endpoint_locality_ok, true);
  assert.equal(
    health.body.supported_request_schemas.includes("iris_local_tts_engine_request_v1"),
    true
  );
  assert.equal(health.body.supported_audio_mimes.includes("audio/wav"), true);
  assert.equal(health.body.voice_control.speech_rate_label_supported, true);
  assert.equal(health.body.voice_control.prosody_style_mapping, true);
  assert.equal(health.body.voice_control.pitch_volume_forwarded, true);
  assert.equal(health.body.boundary_policy.no_endpoint_values, true);

  const ttsResponse = await postJson(`${bridgeBase}/tts-engine`, {
    schema: "iris_local_tts_engine_request_v1",
    job_id: "fixture-voicevox-job",
    event_id: "fixture-voicevox-event",
    text: fixtureSpeech,
    language: "ja",
    script_direction: "ltr",
    prosody_style: "laughing_speech",
    speech_rate: "tongue_twister_fast",
    estimated_duration_ms: 1234,
    mouth_timing: [],
    voice_expression: { arousal: 0.9 },
    engine_preferences: { voice_id: fixtureSpeaker, model: "fixture-voicevox" },
    boundary_policy: {
      validated_local_bridge_job: true,
      engine_internal_payload: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  });
  assert.equal(ttsResponse.status, 200);
  assert.equal(ttsResponse.body.audio_mime, "audio/wav");
  assert.equal(ttsResponse.body.bridge_status, "rendered");
  assert.equal(ttsResponse.body.sample_rate_hz, 48000);
  assert.equal(Buffer.from(ttsResponse.body.audio_base64, "base64").length > 0, true);
  assert.equal(requestCounts.audio_query, 1);
  assert.equal(requestCounts.synthesis, 1);
  assert.equal(requestFacts.speech_payload_forwarded, true);
  assert.equal(requestFacts.speaker_parameter_present, true);
  assert.equal(requestFacts.synthesis_body_received, true);
  assert.equal(requestFacts.speed_scale_forwarded, true);
  assert.equal(requestFacts.intonation_scale_forwarded, true);
  assert.equal(requestFacts.pitch_scale_forwarded, true);
  assert.equal(requestFacts.volume_scale_forwarded, true);
  assert.equal(requestFacts.phoneme_lengths_adjusted, true);

  const report = {
    ok: true,
    schema: "iris_voicevox_tts_engine_roundtrip_report_v1",
    fixture_engine_requests: {
      audio_query_count: requestCounts.audio_query,
      synthesis_count: requestCounts.synthesis,
      speech_payload_forwarded: requestFacts.speech_payload_forwarded,
      speaker_parameter_present: requestFacts.speaker_parameter_present,
      synthesis_body_received: requestFacts.synthesis_body_received,
      speed_scale_forwarded: requestFacts.speed_scale_forwarded,
      intonation_scale_forwarded: requestFacts.intonation_scale_forwarded,
      pitch_scale_forwarded: requestFacts.pitch_scale_forwarded,
      volume_scale_forwarded: requestFacts.volume_scale_forwarded,
      phoneme_lengths_adjusted: requestFacts.phoneme_lengths_adjusted,
    },
    health_summary: {
      ok: health.body.ok,
      bridge_status: health.body.bridge_status,
      local_endpoint_policy_status: health.body.local_endpoint_policy_status,
      engine_endpoint_scope: health.body.engine_endpoint_scope,
      engine_endpoint_locality_ok: health.body.engine_endpoint_locality_ok,
      request_schema_supported: true,
      wav_output_supported: true,
      speech_rate_label_supported: health.body.voice_control.speech_rate_label_supported,
      prosody_style_mapping: health.body.voice_control.prosody_style_mapping,
      pitch_volume_forwarded: health.body.voice_control.pitch_volume_forwarded,
    },
    tts_engine_response_summary: {
      audio_mime: ttsResponse.body.audio_mime,
      audio_bytes_available:
        Buffer.from(String(ttsResponse.body.audio_base64 ?? ""), "base64").length > 0,
      sample_rate_hz: ttsResponse.body.sample_rate_hz,
      duration_ms: ttsResponse.body.duration_ms,
      bridge_status: ttsResponse.body.bridge_status,
    },
    boundary_policy: {
      fixture_engine_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_text: true,
      no_audio_body_in_report: true,
      no_raw_engine_requests: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertVoicevoxTtsEngineRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report, { bridgeBase, voicevoxBase });
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (bridgeServer) await closeServer(bridgeServer);
  await closeServer(voicevoxFixtureServer);
}

async function postJson(target, payload) {
  const response = await fetch(target, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function fetchJson(target) {
  const response = await fetch(target);
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function readRequestJson(request) {
  const raw = await readRequestText(request);
  return raw ? JSON.parse(raw) : {};
}

async function readRequestText(request) {
  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) raw += chunk;
  return raw;
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function assertVoicevoxTtsEngineRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("VOICEVOX TTS bridge roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!VOICEVOX_TTS_ENGINE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`VOICEVOX TTS bridge unexpected report field ${field}`);
    }
  }
  if (report.ok !== true || report.schema !== "iris_voicevox_tts_engine_roundtrip_report_v1") {
    throw new Error("VOICEVOX TTS bridge roundtrip status mismatch");
  }
  for (const field of [
    "fixture_engine_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_text",
    "no_audio_body_in_report",
    "no_raw_engine_requests",
    "no_candidates",
    "no_commands",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`VOICEVOX TTS bridge boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(report, { bridgeBase, voicevoxBase }) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    bridgeBase,
    voicevoxBase,
    fixtureSpeech,
    fixtureSpeaker,
    "fixture-voicevox-job",
    "fixture-voicevox-event",
    "fixture-voicevox",
    "RIFF1234WAVEdata",
    '"text"',
    '"final_text"',
    '"subtitle_text"',
    '"raw_packet"',
    '"job_payload"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"approved_memory_record"',
    '"approved_relationship_record"',
    "token-value",
    "secret-value",
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`VOICEVOX TTS bridge roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
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
