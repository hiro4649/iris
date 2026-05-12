import { createIntegrationFixtures } from "../src/services/dev/integrationFixtures.js";
import { createLocalBridgeServer } from "../src/server/localBridgeServer.js";
import { listen } from "../src/server/httpServer.js";

const bridgeServer = createLocalBridgeServer({ logger: { error() {} } });
const bridgeAddress = await listen(bridgeServer, { port: 0, host: "127.0.0.1" });
const bridgeUrl = `http://${bridgeAddress.address}:${bridgeAddress.port}`;

try {
  const fixtures = createIntegrationFixtures({ generatedAtMs: Date.now() });
  const unsafePacketResponse = await fetch(`${bridgeUrl}/tts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...fixtures.adapter_packets.tts,
      input_action_candidate: { execute: "press_w" },
      token: "unsafe-local-bridge-token",
      endpoint: "http://unsafe.example.local/tts",
    }),
  });
  const unsafePacketBody = await unsafePacketResponse.json();

  const invalidJsonResponse = await fetch(`${bridgeUrl}/live2d`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{ invalid_json_with_unsafe_local_bridge_token",
  });
  const invalidJsonBody = await invalidJsonResponse.json();

  const publicReport = {
    ok:
      unsafePacketResponse.status === 400 &&
      unsafePacketBody.error_kind === "unsafe_payload" &&
      hasBoundaryPolicy(unsafePacketBody.boundary_policy, ["no_raw_error_messages"]) &&
      invalidJsonResponse.status === 400 &&
      invalidJsonBody.error_kind === "invalid_json" &&
      hasBoundaryPolicy(invalidJsonBody.boundary_policy, ["no_raw_error_messages"]),
    fixture_counts: {
      rejected_request_count: 2,
    },
    rejected_requests: [
      {
        request_kind: "unsafe_tts_packet",
        http_status: unsafePacketResponse.status,
        error_kind: unsafePacketBody.error_kind ?? null,
        no_raw_error_messages: hasBoundaryPolicy(unsafePacketBody.boundary_policy, [
          "no_raw_error_messages",
        ]),
      },
      {
        request_kind: "invalid_live2d_json",
        http_status: invalidJsonResponse.status,
        error_kind: invalidJsonBody.error_kind ?? null,
        no_raw_error_messages: hasBoundaryPolicy(invalidJsonBody.boundary_policy, [
          "no_raw_error_messages",
        ]),
      },
    ],
    boundary_policy: {
      fixed_error_kinds_only: true,
      no_raw_error_messages: true,
      no_raw_packets: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
  };
  const serialized = JSON.stringify(publicReport);
  if (
    serialized.includes(bridgeUrl) ||
    serialized.includes("IRIS bridge fixture voice check") ||
    serialized.includes("input_action_candidate") ||
    serialized.includes("press_w") ||
    serialized.includes("unsafe-local-bridge-token") ||
    serialized.includes("unsafe_local_bridge_token") ||
    serialized.includes("unsafe.example.local") ||
    serialized.includes("Unexpected token")
  ) {
    publicReport.ok = false;
  }
  console.log(JSON.stringify(publicReport, null, 2));
  if (!publicReport.ok) process.exitCode = 1;
} finally {
  await closeServer(bridgeServer);
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function hasBoundaryPolicy(policy, fields) {
  return Boolean(policy) && fields.every((field) => policy[field] === true);
}
