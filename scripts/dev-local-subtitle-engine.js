import "../src/config/loadIrisEnv.js";
import { createServer } from "node:http";
import { listen } from "../src/server/httpServer.js";

const host = optionalEnvValue(process.env.IRIS_LOCAL_SUBTITLE_ENGINE_HOST) ?? "127.0.0.1";
const port = Number(optionalEnvValue(process.env.IRIS_LOCAL_SUBTITLE_ENGINE_PORT) ?? 9121);
const apiKey =
  optionalEnvValue(process.env.IRIS_LOCAL_SUBTITLE_ENGINE_API_KEY) ??
  optionalEnvValue(process.env.IRIS_SUBTITLE_ENGINE_API_KEY) ??
  optionalEnvValue(process.env.IRIS_LOCAL_ENGINE_API_KEY) ??
  "";

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    return sendJson(response, 200, {
      ok: true,
      schema: "iris_local_subtitle_engine_health_v1",
      status: "ready",
      supported_request_schemas: ["iris_local_subtitle_engine_request_v1"],
      supported_response_fields: ["vtt", "duration_ms", "bridge_status"],
      supported_subtitle_formats: ["text/vtt"],
    });
  }
  if (request.method === "POST" && request.url === "/subtitle-engine") {
    if (!isAuthorizedRequest(request, apiKey)) {
      return sendJson(response, 401, {
        ok: false,
        error: "auth_required",
      });
    }
    const body = await readJson(request);
    if (body?.schema !== "iris_local_subtitle_engine_request_v1") {
      return sendJson(response, 400, {
        ok: false,
        error: "invalid_schema",
      });
    }
    const durationMs = safeDurationMs(body.duration_ms);
    return sendJson(response, 200, {
      ok: true,
      schema: "iris_local_subtitle_engine_response_v1",
      bridge_status: "rendered",
      duration_ms: durationMs,
      vtt: renderVtt({
        text: safeText(body.subtitle_text, 800),
        durationMs,
      }),
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

await listen(server, { host, port });

console.log(
  JSON.stringify({
    ok: true,
    schema: "iris_local_subtitle_engine_startup_v1",
    service: "local_subtitle_engine",
    listening: {
      status: "listening",
      host_env_name: "IRIS_LOCAL_SUBTITLE_ENGINE_HOST",
      port_env_name: "IRIS_LOCAL_SUBTITLE_ENGINE_PORT",
      health_path: "/health",
      subtitle_path: "/subtitle-engine",
    },
    auth_configured: apiKey !== "",
    boundary_policy: {
      no_endpoint_values: true,
      no_secret_values: true,
      no_prompt_payloads: true,
      no_commands: true,
    },
  })
);

function isAuthorizedRequest(request, requiredApiKey) {
  if (!requiredApiKey) return true;
  const authorization = String(request.headers.authorization ?? "");
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/iu)?.[1] ?? "";
  const explicitApiKey = String(request.headers["x-api-key"] ?? "");
  return bearerToken === requiredApiKey || explicitApiKey === requiredApiKey;
}

async function readJson(request) {
  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) raw += chunk;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function renderVtt({ text, durationMs }) {
  if (!text) return "WEBVTT\n";
  return [
    "WEBVTT",
    "",
    `${formatVttTimestamp(0)} --> ${formatVttTimestamp(durationMs)}`,
    text,
    "",
  ].join("\n");
}

function formatVttTimestamp(ms) {
  const totalMs = Math.max(0, Math.round(Number(ms) || 0));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${pad3(millis)}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function pad3(value) {
  return String(value).padStart(3, "0");
}

function safeDurationMs(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1200;
  return Math.max(1, Math.round(numeric));
}

function safeText(value, maxLength) {
  return String(value ?? "").trim().replace(/\s+/gu, " ").slice(0, maxLength);
}

function optionalEnvValue(value) {
  const text = String(value ?? "").trim();
  return text ? value : undefined;
}
