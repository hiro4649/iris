import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { listen } from "../src/server/httpServer.js";

if (isDirectExecution()) {
  const config = createLocalGameBridgeConfig(process.env);
  const server = createLocalGameBridgeServer(config);
  await listen(server, { host: config.host, port: config.port });
  console.log(JSON.stringify(createLocalGameBridgeStartupReport(config)));
}

export function createLocalGameBridgeConfig(env = process.env) {
  return {
    host: env.IRIS_LOCAL_GAME_BRIDGE_HOST ?? "127.0.0.1",
    port: Number(env.IRIS_LOCAL_GAME_BRIDGE_PORT ?? 9112),
    simulatedControl: env.IRIS_LOCAL_GAME_BRIDGE_SIMULATED === "true",
    simulatedObservation:
      env.IRIS_LOCAL_GAME_OBSERVATION_SIMULATED === "true" ||
      (env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS !== "true" &&
        env.IRIS_LOCAL_GAME_OBSERVATION_SIMULATED !== "false"),
    observationTargetEndpoint: env.IRIS_LOCAL_GAME_OBSERVATION_TARGET_ENDPOINT ?? "",
    observationTargetApiKey: env.IRIS_LOCAL_GAME_OBSERVATION_TARGET_API_KEY ?? "",
    observationTargetTimeoutMs: Number(env.IRIS_LOCAL_GAME_OBSERVATION_TARGET_TIMEOUT_MS ?? 3000),
    controlTargetEndpoint: env.IRIS_LOCAL_GAME_CONTROL_TARGET_ENDPOINT ?? "",
    controlTargetApiKey: env.IRIS_LOCAL_GAME_CONTROL_TARGET_API_KEY ?? "",
    controlTargetTimeoutMs: Number(env.IRIS_LOCAL_GAME_CONTROL_TARGET_TIMEOUT_MS ?? 3000),
    apiKey: env.IRIS_LOCAL_GAME_BRIDGE_API_KEY ?? env.IRIS_LOCAL_BRIDGE_API_KEY ?? "",
    fetchImpl: globalThis.fetch,
  };
}

export function createLocalGameBridgeServer(configInput = {}) {
  const config = {
    ...createLocalGameBridgeConfig({}),
    ...configInput,
  };
  let observationCount = 0;
  let controlRequestCount = 0;

  return createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${config.host}:${config.port}`);
  if (request.method === "GET" && url.pathname === "/health") {
    return sendJson(response, 200, {
      ok: true,
      schema: "iris_local_game_bridge_health_v1",
      bridge_status: "ready",
      observation_count: observationCount,
      control_request_count: controlRequestCount,
    });
  }
  if (
    (request.method === "GET" || request.method === "POST") &&
    url.pathname === "/game-observation"
  ) {
    if (!isAuthorizedRequest(request, config.apiKey)) {
      return sendJson(response, 401, { ok: false, error: "auth_required" });
    }
    const body = request.method === "POST" ? await readBody(request) : "";
    observationCount += 1;
    if (config.observationTargetEndpoint) {
      const forwarded = await forwardGameObservation({
        body,
        method: request.method,
        search: url.search,
        config,
      });
      return sendJson(response, forwarded.statusCode, forwarded.body);
    }
    if (!config.simulatedObservation) {
      return sendJson(response, 409, {
        observations: [],
        bridge_status: "target_not_configured",
        reason: "local_game_observation_target_required",
      });
    }
    return sendJson(response, 200, {
      observations: [createObservation(observationCount)],
      bridge_status: "simulated",
    });
  }
  if (request.method === "POST" && url.pathname === "/game-control") {
    if (!isAuthorizedRequest(request, config.apiKey)) {
      return sendJson(response, 401, { ok: false, error: "auth_required" });
    }
    const body = await readBody(request);
    controlRequestCount += 1;
    if (config.controlTargetEndpoint && !config.simulatedControl) {
      const forwarded = await forwardGameControl(body, config);
      return sendJson(response, forwarded.statusCode, {
        ...forwarded.body,
        request_id: `local-game-control-${controlRequestCount}`,
      });
    }
    if (!config.simulatedControl) {
      return sendJson(response, 409, {
        executed: false,
        simulated: false,
        bridge_status: "target_not_configured",
        reason: "local_game_control_target_required",
        request_id: `local-game-control-${controlRequestCount}`,
      });
    }
    return sendJson(response, 200, {
      executed: false,
      simulated: true,
      bridge_status: "accepted",
      reason: "local_game_bridge_simulated",
      request_id: `local-game-control-${controlRequestCount}`,
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
  });
}

export function createLocalGameBridgeStartupReport(config) {
  return {
    ok: true,
    schema: "iris_local_game_bridge_startup_v1",
    service: "local_game_bridge",
    control_forwarding_configured: config.controlTargetEndpoint !== "",
    observation_forwarding_configured: config.observationTargetEndpoint !== "",
    simulated_observation_enabled: config.simulatedObservation === true,
    listening: {
      status: "listening",
      host_env_name: "IRIS_LOCAL_GAME_BRIDGE_HOST",
      port_env_name: "IRIS_LOCAL_GAME_BRIDGE_PORT",
      health_path: "/health",
      observation_path: "/game-observation",
      control_path: "/game-control",
    },
  };
}

function createObservation(observationCount) {
  const now = Date.now();
  return {
    trace_id: `local-game-${now}`,
    event_id: `local-game-observation-${observationCount}-${now}`,
    timestamp_ms: now,
    game_title: "IRIS Local Gameplay",
    scene_summary: "A safe local gameplay scene is ready for IRIS to observe.",
    detected_events: ["player_idle", "safe_action_available"],
    player_state: "ready",
    screen_confidence: 0.92,
    vision_source_kind: "local_game_bridge",
    frame_id: `local-frame-${observationCount}`,
    frame_age_ms: 25,
    ocr_text_summary: "HUD visible, no unsafe text.",
    ui_focus_areas: ["center_play_area", "status_hud"],
    raw_frame_available: false,
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function isAuthorizedRequest(request, requiredApiKey) {
  if (!requiredApiKey) return true;
  const authorization = String(request.headers.authorization ?? "");
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/iu)?.[1] ?? "";
  const explicitApiKey = String(request.headers["x-api-key"] ?? "");
  return bearerToken === requiredApiKey || explicitApiKey === requiredApiKey;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => resolve(raw));
    request.on("error", reject);
  });
}

async function forwardGameControl(body, config) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), clampTimeout(config.controlTargetTimeoutMs));
  try {
    const targetResponse = await config.fetchImpl(config.controlTargetEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.controlTargetApiKey ? { authorization: `Bearer ${config.controlTargetApiKey}` } : {}),
      },
      body,
      signal: controller.signal,
    });
    const parsed = await readJsonResponse(targetResponse);
    const targetAccepted =
      targetResponse.ok &&
      parsed?.ok !== false &&
      parsed?.accepted !== false &&
      parsed?.executed !== false;
    return {
      statusCode: targetAccepted ? 200 : 502,
      body: {
        executed: targetAccepted && parsed?.executed === true,
        simulated: parsed?.simulated === true,
        bridge_status: targetAccepted ? "forwarded" : "target_failed",
        reason: targetAccepted ? "local_game_bridge_forwarded" : "local_game_bridge_target_failed",
      },
    };
  } catch {
    return {
      statusCode: 502,
      body: {
        executed: false,
        simulated: false,
        bridge_status: "target_unreachable",
        reason: "local_game_bridge_target_unreachable",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function forwardGameObservation({ body, method, search, config }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), clampTimeout(config.observationTargetTimeoutMs));
  try {
    const endpoint = new URL(config.observationTargetEndpoint);
    if (search) {
      const sourceParams = new URLSearchParams(search);
      for (const [key, value] of sourceParams) endpoint.searchParams.set(key, value);
    }
    const targetResponse = await config.fetchImpl(endpoint.toString(), {
      method,
      headers: {
        accept: "application/json",
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
        ...(config.observationTargetApiKey
          ? { authorization: `Bearer ${config.observationTargetApiKey}` }
          : {}),
      },
      ...(method === "POST" ? { body } : {}),
      signal: controller.signal,
    });
    const parsed = await readJsonResponse(targetResponse);
    const targetAccepted =
      targetResponse.ok &&
      parsed &&
      parsed.ok !== false &&
      parsed.accepted !== false &&
      !["failed", "rejected", "error", "target_failed", "target_unreachable"].includes(
        String(parsed.bridge_status ?? parsed.bridgeStatus ?? parsed.status ?? parsed.state ?? "")
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/gu, "_")
      );
    if (!targetAccepted) {
      return {
        statusCode: 502,
        body: {
          observations: [],
          bridge_status: "target_failed",
          reason: "local_game_observation_target_failed",
        },
      };
    }
    return {
      statusCode: 200,
      body: {
        observations: normalizeObservationResponse(parsed),
        bridge_status: "forwarded",
      },
    };
  } catch {
    return {
      statusCode: 502,
      body: {
        observations: [],
        bridge_status: "target_unreachable",
        reason: "local_game_observation_target_unreachable",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeObservationResponse(parsed) {
  if (Array.isArray(parsed?.observations)) return parsed.observations;
  if (Array.isArray(parsed)) return parsed;
  if (parsed?.observation && typeof parsed.observation === "object") return [parsed.observation];
  return [parsed];
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function clampTimeout(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 3000;
  return Math.max(100, Math.min(30_000, Math.trunc(number)));
}

function isDirectExecution() {
  return import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
}
