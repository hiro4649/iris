import "../src/config/loadIrisEnv.js";
import { createServer } from "node:http";
import { listen } from "../src/server/httpServer.js";

const host = process.env.IRIS_LOCAL_RESPONSE_PROVIDER_HOST || "127.0.0.1";
const port = Number(process.env.IRIS_LOCAL_RESPONSE_PROVIDER_PORT || 9120);

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    return sendJson(response, 200, {
      ok: true,
      schema: "iris_local_response_provider_health_v1",
      status: "ready",
    });
  }
  if (request.method === "POST" && request.url === "/respond") {
    const body = await readJson(request);
    const input = body?.input ?? {};
    const commentText = safeText(input.commentText, 160);
    const displayName = safeText(input.displayName, 80);
    const payloadKind = safeText(input.payloadKind, 80);
    const gameStateSummary = safeText(input.gameStateSummary, 180);
    const externalTopicSummary = safeText(input.externalTopicSummary, 180);
    const language = safeText(
      input.responseLanguageHint || input.requestedLanguage || input.detectedLanguage,
      16
    );
    return sendJson(response, 200, {
      ok: true,
      text: createResponseText({
        commentText,
        displayName,
        payloadKind,
        gameStateSummary,
        externalTopicSummary,
        language,
      }),
      provider: "local_response_provider",
      model: body?.model || "iris-local-response",
    });
  }
  return sendJson(response, 404, { ok: false, error: "not_found" });
});

await listen(server, { host, port });

console.log(
  JSON.stringify({
    ok: true,
    schema: "iris_local_response_provider_startup_v1",
    service: "local_response_provider",
    listening: {
      status: "listening",
      host_env_name: "IRIS_LOCAL_RESPONSE_PROVIDER_HOST",
      port_env_name: "IRIS_LOCAL_RESPONSE_PROVIDER_PORT",
      health_path: "/health",
      respond_path: "/respond",
    },
    boundary_policy: {
      no_endpoint_values: true,
      no_secret_values: true,
      no_prompt_payloads: true,
      no_commands: true,
    },
  })
);

function createResponseText({
  commentText,
  displayName,
  payloadKind,
  gameStateSummary,
  externalTopicSummary,
  language,
}) {
  const viewer = displayName || "viewer";
  const useEnglish = normalizeLanguage(language) === "en";
  if (payloadKind === "donation_event") {
    if (useEnglish) return `${viewer}, thank you for the support. I really appreciate it.`;
    return `${viewer}さん、応援ありがとう。大切に受け取ったよ。`;
  }
  if (payloadKind === "game_observation" && gameStateSummary) {
    if (useEnglish) return `I noticed the screen changed. ${gameStateSummary}. I'll stay alert.`;
    return `画面の変化を確認したよ。${gameStateSummary}、次の動きに注意するね。`;
  }
  if (payloadKind === "external_topic_observation" && externalTopicSummary) {
    if (useEnglish) return `I picked up the topic. ${externalTopicSummary}. I'll fit it into the stream.`;
    return `いまの話題を拾ったよ。${externalTopicSummary}、配信の流れに合わせて話すね。`;
  }
  if (commentText) {
    if (useEnglish) return `${viewer}, thanks for the comment. I heard you: ${commentText}.`;
    return `${viewer}さん、コメントありがとう。${commentText}、ちゃんと届いているよ。`;
  }
  if (useEnglish) return "Thanks for the comment. IRIS will keep the stream going.";
  return "コメントありがとう。IRISは配信を続けます。";
}

function normalizeLanguage(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text.startsWith("en")) return "en";
  return "ja";
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

function safeText(value, maxLength) {
  return String(value ?? "").trim().replace(/\s+/gu, " ").slice(0, maxLength);
}
