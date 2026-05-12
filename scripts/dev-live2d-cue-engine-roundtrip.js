import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createLive2dCueEngineBridgeServer } from "../src/server/live2dCueEngineBridge.js";
import { listen } from "../src/server/httpServer.js";

const fixtureModelId = "fixture-live2d-model";
const fixtureSceneId = "fixture-stream-scene";
const fixtureEventId = "fixture-live2d-event";
const LIVE2D_CUE_ENGINE_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "fixture_renderer_requests",
  "health_summary",
  "live2d_engine_response_summary",
  "boundary_policy"
]);
const requestCounts = {
  health: 0,
  cue_delivery: 0,
};
const rendererFacts = {
  cue_schema_received: false,
  motion_style_forwarded: false,
  camera_cue_forwarded: false,
  autonomous_scream_forwarded: false,
  expression_mapping_forwarded: false,
  no_text_payload_received: true,
};

const rendererFixtureServer = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, "http://127.0.0.1");
  if (request.method === "GET" && requestUrl.pathname === "/health") {
    requestCounts.health += 1;
    return sendJson(response, 200, {
      ok: true,
      schema: "fixture_live2d_renderer_health_v1",
    });
  }
  if (request.method === "POST" && requestUrl.pathname === "/cue") {
    requestCounts.cue_delivery += 1;
    const body = await readRequestJson(request);
    rendererFacts.cue_schema_received = body.cue?.schema === "iris_live2d_renderer_cue_v1";
    rendererFacts.motion_style_forwarded = body.cue?.motion?.style === "surprise_scream";
    rendererFacts.camera_cue_forwarded =
      body.cue?.camera?.comfort_guard === "bounded_viewer_closeup" &&
      body.cue?.camera?.face_priority === true;
    rendererFacts.autonomous_scream_forwarded =
      body.cue?.autonomous?.state === "surprise_scream" &&
      body.cue?.autonomous?.scream_reaction_enabled === true;
    rendererFacts.expression_mapping_forwarded =
      body.cue?.expression?.expression_key === "wide_eyes_short_scream";
    rendererFacts.no_text_payload_received =
      JSON.stringify(body).includes('"text"') === false &&
      JSON.stringify(body).includes('"final_text"') === false;
    return sendJson(response, 200, {
      ok: true,
      accepted: true,
      schema: "fixture_live2d_renderer_ack_v1",
    });
  }
  sendJson(response, 404, { ok: false, error: "not_found" });
});

let bridgeServer = null;
const rendererAddress = await listen(rendererFixtureServer, {
  host: "127.0.0.1",
  port: 0,
});
const rendererBase = `http://${rendererAddress.address}:${rendererAddress.port}`;

try {
  bridgeServer = createLive2dCueEngineBridgeServer({
    rendererEndpoint: `${rendererBase}/cue`,
    rendererHealthEndpoint: `${rendererBase}/health`,
    timeoutMs: 5000,
    defaultModelId: fixtureModelId,
    defaultSceneId: fixtureSceneId,
    logger: { error() {} },
  });
  const bridgeAddress = await listen(bridgeServer, { host: "127.0.0.1", port: 0 });
  const bridgeBase = `http://${bridgeAddress.address}:${bridgeAddress.port}`;

  const health = await fetchJson(`${bridgeBase}/health`);
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.schema, "iris_live2d_cue_engine_bridge_health_v1");
  assert.equal(health.body.mode, "renderer_http");
  assert.equal(health.body.local_endpoint_policy, "loopback_or_private_network_only");
  assert.equal(health.body.local_endpoint_policy_status, "all_allowed");
  assert.equal(health.body.renderer_endpoint_scope, "loopback");
  assert.equal(health.body.renderer_endpoint_locality_ok, true);
  assert.equal(health.body.renderer_health_endpoint_scope, "loopback");
  assert.equal(health.body.renderer_health_endpoint_locality_ok, true);
  assert.equal(
    health.body.supported_request_schemas.includes("iris_local_live2d_engine_request_v1"),
    true
  );
  assert.equal(health.body.supported_response_fields.includes("cue"), true);
  assert.equal(health.body.cue_capabilities.autonomous_scream_motion, true);
  assert.equal(health.body.cue_capabilities.happy_hum_dance_motion, true);
  assert.equal(health.body.boundary_policy.no_endpoint_values, true);

  const live2dResponse = await postJson(`${bridgeBase}/live2d-engine`, {
    schema: "iris_local_live2d_engine_request_v1",
    job_id: "fixture-live2d-job",
    event_id: fixtureEventId,
    motion_style: "talk",
    motion_intensity: "burst",
    body_state_id: "fixture_body_scream",
    camera_proximity_profile: "camera_face_extreme_closeup",
    expression_profile_id: "fixture_expression_scream",
    autonomous_state_id: "surprise_scream",
    timing: {
      total_duration_ms: 1500,
      start_delay_ms: 0,
      sync_policy: "speech_motion_timeline",
    },
    tracks: [
      {
        kind: "body_motion",
        start_ms: 0,
        end_ms: 1500,
        motion_style: "surprise_scream",
        head_motion: "short_jump_then_breath_recover",
        gesture_hint: "hands_near_chest_startle",
      },
      {
        kind: "expression",
        start_ms: 0,
        end_ms: 1500,
        expression_hint: "wide_eyes_short_scream",
        gaze_hint: "audience_soft",
        blink_rate: 0.2,
      },
    ],
    engine_preferences: {
      model_id: fixtureModelId,
      scene_id: fixtureSceneId,
    },
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
  assert.equal(live2dResponse.status, 200);
  assert.equal(live2dResponse.body.bridge_status, "rendered_with_renderer_ack");
  assert.equal(live2dResponse.body.duration_ms, 1500);
  assert.equal(live2dResponse.body.cue.schema, "iris_live2d_renderer_cue_v1");
  assert.equal(live2dResponse.body.cue.motion.style, "surprise_scream");
  assert.equal(live2dResponse.body.cue.expression.expression_key, "wide_eyes_short_scream");
  assert.equal(live2dResponse.body.cue.autonomous.scream_reaction_enabled, true);
  assert.equal(live2dResponse.body.cue.renderer.accepted, true);
  assert.equal(requestCounts.health, 1);
  assert.equal(requestCounts.cue_delivery, 1);
  assert.equal(rendererFacts.cue_schema_received, true);
  assert.equal(rendererFacts.motion_style_forwarded, true);
  assert.equal(rendererFacts.camera_cue_forwarded, true);
  assert.equal(rendererFacts.autonomous_scream_forwarded, true);
  assert.equal(rendererFacts.expression_mapping_forwarded, true);
  assert.equal(rendererFacts.no_text_payload_received, true);

  const report = {
    ok: true,
    schema: "iris_live2d_cue_engine_roundtrip_report_v1",
    fixture_renderer_requests: {
      health_count: requestCounts.health,
      cue_delivery_count: requestCounts.cue_delivery,
      cue_schema_received: rendererFacts.cue_schema_received,
      motion_style_forwarded: rendererFacts.motion_style_forwarded,
      camera_cue_forwarded: rendererFacts.camera_cue_forwarded,
      autonomous_scream_forwarded: rendererFacts.autonomous_scream_forwarded,
      expression_mapping_forwarded: rendererFacts.expression_mapping_forwarded,
      no_text_payload_received: rendererFacts.no_text_payload_received,
    },
    health_summary: {
      ok: health.body.ok,
      bridge_status: health.body.bridge_status,
      mode: health.body.mode,
      local_endpoint_policy_status: health.body.local_endpoint_policy_status,
      renderer_endpoint_scope: health.body.renderer_endpoint_scope,
      renderer_endpoint_locality_ok: health.body.renderer_endpoint_locality_ok,
      renderer_health_endpoint_scope: health.body.renderer_health_endpoint_scope,
      renderer_health_endpoint_locality_ok: health.body.renderer_health_endpoint_locality_ok,
      request_schema_supported: true,
      cue_response_supported: true,
      autonomous_scream_motion_supported: health.body.cue_capabilities.autonomous_scream_motion,
      happy_hum_dance_motion_supported: health.body.cue_capabilities.happy_hum_dance_motion,
    },
    live2d_engine_response_summary: {
      cue_schema: live2dResponse.body.cue.schema,
      bridge_status: live2dResponse.body.bridge_status,
      duration_ms: live2dResponse.body.duration_ms,
      renderer_attempted: live2dResponse.body.cue.renderer.attempted,
      renderer_accepted: live2dResponse.body.cue.renderer.accepted,
    },
    boundary_policy: {
      fixture_renderer_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_cue_body_in_report: true,
      no_raw_renderer_requests: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertNoUnsafeReportLeak(report, { bridgeBase, rendererBase });
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (bridgeServer) await closeServer(bridgeServer);
  await closeServer(rendererFixtureServer);
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

function assertNoUnsafeReportLeak(report, { bridgeBase, rendererBase }) {
  for (const field of Object.keys(report)) {
    if (!LIVE2D_CUE_ENGINE_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`Unexpected Live2D cue engine roundtrip report field: ${field}`);
    }
  }

  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    bridgeBase,
    rendererBase,
    fixtureModelId,
    fixtureSceneId,
    fixtureEventId,
    "fixture-live2d-job",
    "fixture_body_scream",
    "fixture_expression_scream",
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
    throw new Error(`Live2D cue engine roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
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
