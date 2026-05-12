import "../config/loadIrisEnv.js";
import { ContractError } from "../core/contracts.js";
import { createHttpGameObservationSource } from "./game/httpGameObservationSource.js";
import { createHttpGameControlAdapter } from "./game/httpGameControlAdapter.js";
import { createHttpVectorMemorySearchAdapter } from "./memory/httpVectorMemorySearchAdapter.js";
import { createHttpMediaWatchSource } from "./media/httpMediaWatchSource.js";
import { createHttpExternalTopicSource } from "./topics/httpExternalTopicSource.js";
import { sendApprovedGameActionToMockAdapter } from "./game/mockGameControlAdapter.js";
import { sendExpressionToConsole } from "./live2d/consoleLive2dAdapter.js";
import { showSubtitleInConsole } from "./subtitle/consoleSubtitleAdapter.js";
import { speakToConsole } from "./tts/consoleTtsAdapter.js";
import { createHttpLiveChatSource } from "./youtube/httpLiveChatSource.js";
import { createJsonYouTubeLiveChatCursorStore } from "./youtube/youtubeLiveChatCursorStore.js";
import { createYouTubeLiveChatApiSource } from "./youtube/youtubeLiveChatApiSource.js";
import { createYouTubeOAuthTokenProvider } from "./youtube/youtubeOAuthTokenProvider.js";
import { createHttpPostAdapter } from "./httpPostAdapter.js";

export function createRuntimeAdaptersFromEnv(env = process.env) {
  return {
    ttsAdapter: createTtsAdapterFromEnv(env),
    live2dAdapter: createLive2dAdapterFromEnv(env),
    subtitleAdapter: createSubtitleAdapterFromEnv(env),
    gameControlAdapter: createGameControlAdapterFromEnv(env),
    gameObservationSource: createGameObservationSourceFromEnv(env),
    mediaWatchSource: createMediaWatchSourceFromEnv(env),
    externalTopicSource: createExternalTopicSourceFromEnv(env),
    liveChatSource: createLiveChatSourceFromEnv(env),
    memorySearchAdapter: createMemorySearchAdapterFromEnv(env),
  };
}

function createTtsAdapterFromEnv(env) {
  const endpoint =
    optionalEnvValue(env.IRIS_TTS_ENDPOINT) ??
    optionalEnvValue(env.IRIS_LOCAL_TTS_ENDPOINT) ??
    optionalEnvValue(env.LOCAL_TTS_ENDPOINT) ??
    optionalEnvValue(env.IRIS_TTS_BRIDGE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_LOCAL_TTS_BRIDGE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_TTS_ENGINE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_VOICEVOX_ENGINE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_VOICEVOX_ENDPOINT) ??
    optionalEnvValue(env.VOICEVOX_ENDPOINT) ??
    optionalEnvValue(env.TTS_ENDPOINT) ??
    localBridgeAdapterEndpoint(env, "tts");
  const adapter = normalizeRuntimeAdapterAlias(
    optionalEnvValue(env.IRIS_TTS_ADAPTER) ?? (endpoint ? "http" : "console")
  );
  if (adapter === "console") {
    assertMockOrConsoleAllowed(env, "TTS", adapter);
    return speakToConsole;
  }
  if (adapter === "http") {
    requireRuntimeEndpoint(endpoint, "TTS");
    const localBridgeEndpoint = isLocalBridgeRuntimeEndpoint(env, endpoint, "tts");
    return createHttpPostAdapter({
      adapterKind: "tts",
      endpoint,
      apiKey: firstOptionalEnvValue(
        env.IRIS_TTS_API_KEY,
        ...(localBridgeEndpoint
          ? [
              env.IRIS_LOCAL_BRIDGE_API_KEY,
              env.IRIS_LOCAL_TTS_ENGINE_API_KEY,
              env.IRIS_TTS_ENGINE_API_KEY,
              env.IRIS_VOICEVOX_ENGINE_API_KEY,
              env.IRIS_LOCAL_ENGINE_API_KEY,
            ]
          : [
              env.IRIS_LOCAL_TTS_ENGINE_API_KEY,
              env.IRIS_TTS_ENGINE_API_KEY,
              env.IRIS_VOICEVOX_ENGINE_API_KEY,
              env.IRIS_LOCAL_ENGINE_API_KEY,
              env.IRIS_LOCAL_BRIDGE_API_KEY,
            ]),
        env.IRIS_VOICEVOX_API_KEY,
        env.VOICEVOX_API_KEY,
        env.TTS_API_KEY
      ),
      timeoutMs: Number(
        optionalEnvValue(env.IRIS_TTS_TIMEOUT_MS) ??
          optionalEnvValue(env.IRIS_VOICEVOX_ENGINE_TIMEOUT_MS) ??
          optionalEnvValue(env.IRIS_VOICEVOX_TIMEOUT_MS) ??
          optionalEnvValue(env.VOICEVOX_TIMEOUT_MS) ??
          optionalEnvValue(env.TTS_TIMEOUT_MS) ??
          5000
      ),
    });
  }
  throw new ContractError("unsupported TTS adapter", { adapter });
}

function createLive2dAdapterFromEnv(env) {
  const endpoint =
    optionalEnvValue(env.IRIS_LIVE2D_ENDPOINT) ??
    optionalEnvValue(env.IRIS_LOCAL_LIVE2D_ENDPOINT) ??
    optionalEnvValue(env.LOCAL_LIVE2D_ENDPOINT) ??
    optionalEnvValue(env.IRIS_LIVE2D_BRIDGE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_LIVE2D_ENGINE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_LIVE2D_CUE_ENGINE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_LIVE2D_CUE_ENDPOINT) ??
    optionalEnvValue(env.LIVE2D_ENDPOINT) ??
    optionalEnvValue(env.LIVE2D_CUE_ENDPOINT) ??
    localBridgeAdapterEndpoint(env, "live2d");
  const adapter = normalizeRuntimeAdapterAlias(
    optionalEnvValue(env.IRIS_LIVE2D_ADAPTER) ?? (endpoint ? "http" : "console")
  );
  if (adapter === "console") {
    assertMockOrConsoleAllowed(env, "Live2D", adapter);
    return sendExpressionToConsole;
  }
  if (adapter === "http") {
    requireRuntimeEndpoint(endpoint, "Live2D");
    const localBridgeEndpoint = isLocalBridgeRuntimeEndpoint(env, endpoint, "live2d");
    return createHttpPostAdapter({
      adapterKind: "live2d",
      endpoint,
      apiKey: firstOptionalEnvValue(
        env.IRIS_LIVE2D_API_KEY,
        env.IRIS_LIVE2D_CUE_API_KEY,
        ...(localBridgeEndpoint
          ? [
              env.IRIS_LOCAL_BRIDGE_API_KEY,
              env.IRIS_LOCAL_LIVE2D_ENGINE_API_KEY,
              env.IRIS_LIVE2D_ENGINE_API_KEY,
              env.IRIS_LIVE2D_CUE_ENGINE_API_KEY,
              env.IRIS_LOCAL_ENGINE_API_KEY,
            ]
          : [
              env.IRIS_LOCAL_LIVE2D_ENGINE_API_KEY,
              env.IRIS_LIVE2D_ENGINE_API_KEY,
              env.IRIS_LIVE2D_CUE_ENGINE_API_KEY,
              env.IRIS_LOCAL_ENGINE_API_KEY,
              env.IRIS_LOCAL_BRIDGE_API_KEY,
            ]),
        env.LIVE2D_API_KEY,
        env.LIVE2D_CUE_API_KEY
      ),
      timeoutMs: Number(
        optionalEnvValue(env.IRIS_LIVE2D_TIMEOUT_MS) ??
          optionalEnvValue(env.IRIS_LIVE2D_CUE_ENGINE_TIMEOUT_MS) ??
          optionalEnvValue(env.IRIS_LIVE2D_CUE_TIMEOUT_MS) ??
          optionalEnvValue(env.LIVE2D_TIMEOUT_MS) ??
          optionalEnvValue(env.LIVE2D_CUE_TIMEOUT_MS) ??
          5000
      ),
    });
  }
  throw new ContractError("unsupported Live2D adapter", { adapter });
}

function createSubtitleAdapterFromEnv(env) {
  const endpoint =
    optionalEnvValue(env.IRIS_SUBTITLE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_LOCAL_SUBTITLE_ENDPOINT) ??
    optionalEnvValue(env.LOCAL_SUBTITLE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_SUBTITLE_BRIDGE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_LOCAL_SUBTITLE_ENGINE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_SUBTITLE_ENGINE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_SUBTITLE_RENDERER_ENDPOINT) ??
    optionalEnvValue(env.IRIS_CAPTION_ENGINE_ENDPOINT) ??
    optionalEnvValue(env.IRIS_CAPTION_ENDPOINT) ??
    optionalEnvValue(env.SUBTITLE_ENDPOINT) ??
    optionalEnvValue(env.CAPTION_ENDPOINT) ??
    localBridgeAdapterEndpoint(env, "subtitle");
  const adapter = normalizeRuntimeAdapterAlias(
    optionalEnvValue(env.IRIS_SUBTITLE_ADAPTER) ?? (endpoint ? "http" : "console")
  );
  if (adapter === "console") {
    assertMockOrConsoleAllowed(env, "subtitle", adapter);
    return showSubtitleInConsole;
  }
  if (adapter === "http") {
    requireRuntimeEndpoint(endpoint, "subtitle");
    const localBridgeEndpoint = isLocalBridgeRuntimeEndpoint(env, endpoint, "subtitle");
    return createHttpPostAdapter({
      adapterKind: "subtitle",
      endpoint,
      apiKey: firstOptionalEnvValue(
        env.IRIS_SUBTITLE_API_KEY,
        env.IRIS_SUBTITLE_RENDERER_API_KEY,
        env.IRIS_CAPTION_API_KEY,
        ...(localBridgeEndpoint
          ? [
              env.IRIS_LOCAL_BRIDGE_API_KEY,
              env.IRIS_LOCAL_SUBTITLE_ENGINE_API_KEY,
              env.IRIS_SUBTITLE_ENGINE_API_KEY,
              env.IRIS_CAPTION_ENGINE_API_KEY,
              env.IRIS_LOCAL_ENGINE_API_KEY,
            ]
          : [
              env.IRIS_LOCAL_SUBTITLE_ENGINE_API_KEY,
              env.IRIS_SUBTITLE_ENGINE_API_KEY,
              env.IRIS_CAPTION_ENGINE_API_KEY,
              env.IRIS_LOCAL_ENGINE_API_KEY,
              env.IRIS_LOCAL_BRIDGE_API_KEY,
            ]),
        env.SUBTITLE_API_KEY,
        env.CAPTION_API_KEY
      ),
      timeoutMs: Number(
        optionalEnvValue(env.IRIS_SUBTITLE_TIMEOUT_MS) ??
          optionalEnvValue(env.IRIS_CAPTION_ENGINE_TIMEOUT_MS) ??
          optionalEnvValue(env.IRIS_CAPTION_TIMEOUT_MS) ??
          optionalEnvValue(env.SUBTITLE_TIMEOUT_MS) ??
          optionalEnvValue(env.CAPTION_TIMEOUT_MS) ??
          5000
      ),
    });
  }
  throw new ContractError("unsupported subtitle adapter", { adapter });
}

function createGameControlAdapterFromEnv(env) {
  const endpoint =
    optionalEnvValue(env.IRIS_GAME_CONTROL_ENDPOINT) ??
    localGameBridgeAdapterEndpoint(env, "game-control");
  const adapter = normalizeRuntimeAdapterAlias(
    optionalEnvValue(env.IRIS_GAME_CONTROL_ADAPTER) ?? (endpoint ? "http" : "mock")
  );
  if (adapter === "mock") {
    assertMockOrConsoleAllowed(env, "game control", adapter);
    return sendApprovedGameActionToMockAdapter;
  }
  if (adapter === "http") {
    requireRuntimeEndpoint(endpoint, "game control");
    return createHttpGameControlAdapter({
      endpoint,
      apiKey:
        optionalEnvValue(env.IRIS_GAME_CONTROL_API_KEY) ??
        optionalEnvValue(env.IRIS_LOCAL_GAME_BRIDGE_API_KEY) ??
        optionalEnvValue(env.IRIS_LOCAL_BRIDGE_API_KEY) ??
        "",
      timeoutMs: Number(env.IRIS_GAME_CONTROL_TIMEOUT_MS ?? 5000),
    });
  }
  throw new ContractError("unsupported game control adapter", { adapter });
}

function assertMockOrConsoleAllowed(env, adapterKind, adapter) {
  if (env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true") {
    throw new ContractError(`${adapterKind} adapter must be real for live runtime`, {
      adapter,
    });
  }
}

function requireRuntimeEndpoint(endpoint, adapterKind) {
  if (!endpoint) {
    throw new ContractError(`${adapterKind} adapter endpoint is required for live runtime`, {
      adapter: "http",
    });
  }
}

function normalizeRuntimeAdapterAlias(adapter) {
  const normalized = String(adapter ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, "_");
  if (
    normalized === "voicevox" ||
    normalized === "live2d_cue" ||
    normalized === "local_bridge" ||
    normalized === "local-bridge" ||
    normalized === "bridge"
  ) {
    return "http";
  }
  return normalized;
}

function createGameObservationSourceFromEnv(env) {
  const endpoint = optionalEnvValue(env.IRIS_GAME_OBSERVATION_ENDPOINT);
  if (!endpoint) return null;
  return createHttpGameObservationSource({
    endpoint,
    apiKey:
      optionalEnvValue(env.IRIS_GAME_OBSERVATION_API_KEY) ??
      optionalEnvValue(env.IRIS_LOCAL_GAME_BRIDGE_API_KEY) ??
      optionalEnvValue(env.IRIS_LOCAL_BRIDGE_API_KEY) ??
      "",
    timeoutMs: Number(optionalEnvValue(env.IRIS_GAME_OBSERVATION_TIMEOUT_MS) ?? 5000),
    method: optionalEnvValue(env.IRIS_GAME_OBSERVATION_METHOD) ?? "GET",
    captureRequest: parseGameObservationCaptureRequest(env),
    errorBackoffMs: Number(env.IRIS_GAME_OBSERVATION_ERROR_BACKOFF_MS ?? 5000),
    maxErrorBackoffMs: Number(env.IRIS_GAME_OBSERVATION_MAX_ERROR_BACKOFF_MS ?? 60000),
  });
}

export function createLiveChatSourceFromEnv(env) {
  const source = normalizeYouTubeLiveChatSource(
    env.IRIS_YOUTUBE_LIVE_CHAT_SOURCE ?? env.YOUTUBE_LIVE_CHAT_SOURCE
  );
  const videoId = resolveYouTubeVideoIdFromEnv(env);
  const hasExplicitRelayEndpoint = resolveYouTubeRelayEndpointFromEnv(env) !== "";
  const hasExplicitRelayBridge =
    localLoopbackEndpoint({
      host: env.IRIS_YOUTUBE_RELAY_HOST ?? env.IRIS_YOUTUBE_RELAY_BRIDGE_HOST,
      port: env.IRIS_YOUTUBE_RELAY_PORT ?? env.IRIS_YOUTUBE_RELAY_BRIDGE_PORT,
    }) !== "";
  const hasRelaySourceSelected = source === "http";
  const hasRelayUpstream = (
    optionalEnvValue(env.IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT) ||
      optionalEnvValue(env.YOUTUBE_RELAY_UPSTREAM_ENDPOINT) ||
      optionalEnvValue(env.YOUTUBE_RELAY_ENDPOINT) ||
      optionalEnvValue(env.YOUTUBE_LIVE_CHAT_ENDPOINT) ||
      ""
  ) !== "";
  if (source === "youtube_api" || shouldUseYouTubeApiSource(env)) {
    requireYouTubeApiRuntimeConfig(env);
    const oauthTokenProvider = createYouTubeOAuthTokenProviderFromEnv(env);
    return createYouTubeLiveChatApiSource({
      liveChatId: resolveYouTubeLiveChatIdFromEnv(env),
      videoId,
      apiKey:
        optionalEnvValue(env.IRIS_YOUTUBE_DATA_API_KEY) ??
        optionalEnvValue(env.IRIS_YOUTUBE_API_KEY) ??
        optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_API_KEY) ??
        optionalEnvValue(env.IRIS_GOOGLE_API_KEY) ??
        optionalEnvValue(env.YOUTUBE_DATA_API_KEY) ??
        optionalEnvValue(env.YOUTUBE_API_KEY) ??
        optionalEnvValue(env.GOOGLE_API_KEY) ??
        "",
      oauthToken:
        optionalEnvValue(env.IRIS_YOUTUBE_OAUTH_TOKEN) ??
        optionalEnvValue(env.IRIS_YOUTUBE_ACCESS_TOKEN) ??
        optionalEnvValue(env.YOUTUBE_OAUTH_TOKEN) ??
        optionalEnvValue(env.YOUTUBE_ACCESS_TOKEN) ??
        "",
      oauthTokenProvider,
      endpoint:
        optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT) ??
        optionalEnvValue(env.YOUTUBE_LIVE_CHAT_API_ENDPOINT),
      videosEndpoint:
        optionalEnvValue(env.IRIS_YOUTUBE_VIDEOS_API_ENDPOINT) ??
        optionalEnvValue(env.YOUTUBE_VIDEOS_API_ENDPOINT),
      timeoutMs: Number(
        optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS) ??
          optionalEnvValue(env.YOUTUBE_LIVE_CHAT_TIMEOUT_MS) ??
          5000
      ),
      maxResults: Number(
        optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS) ??
          optionalEnvValue(env.YOUTUBE_LIVE_CHAT_MAX_RESULTS) ??
          200
      ),
      dedupeWindow: Number(
        optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW) ??
          optionalEnvValue(env.YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW) ??
          5000
      ),
      initialPageToken:
        optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_PAGE_TOKEN) ??
        optionalEnvValue(env.YOUTUBE_LIVE_CHAT_PAGE_TOKEN) ??
        "",
      cursorStore: createYouTubeLiveChatCursorStoreFromEnv(env),
      errorBackoffMs: Number(
        optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_ERROR_BACKOFF_MS) ?? 5000
      ),
      maxErrorBackoffMs: Number(
        optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_MAX_ERROR_BACKOFF_MS) ?? 60_000
      ),
      blockedAuthorIds:
        optionalEnvValue(env.IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS) ??
        optionalEnvValue(env.YOUTUBE_BLOCKED_AUTHOR_IDS) ??
        "",
      blockedTextTerms:
        optionalEnvValue(env.IRIS_YOUTUBE_BLOCKED_TEXT_TERMS) ??
        optionalEnvValue(env.YOUTUBE_BLOCKED_TEXT_TERMS) ??
        "",
    });
  }
  if (
    env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true" &&
    !hasExplicitRelayEndpoint &&
    !hasExplicitRelayBridge &&
    !hasRelaySourceSelected &&
    !hasRelayUpstream
  ) {
    throw new ContractError("YouTube live chat source must be real for live runtime", {
      source: source || "not_configured",
    });
  }
  const endpoint = withOptionalBooleanQueryParam(
    resolveYouTubeRelayEndpointFromEnv(env) ?? localYouTubeRelayEndpoint(env),
    "drain",
    env.IRIS_YOUTUBE_LIVE_CHAT_DRAIN_ON_READ === "true"
  );
  if (!endpoint) return null;
  return createHttpLiveChatSource({
    endpoint,
    apiKey:
      optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_API_KEY) ??
      optionalEnvValue(env.IRIS_YOUTUBE_RELAY_UPSTREAM_API_KEY) ??
      optionalEnvValue(env.IRIS_YOUTUBE_DATA_API_KEY) ??
      optionalEnvValue(env.IRIS_YOUTUBE_API_KEY) ??
      optionalEnvValue(env.IRIS_GOOGLE_API_KEY) ??
      optionalEnvValue(env.YOUTUBE_DATA_API_KEY) ??
      optionalEnvValue(env.YOUTUBE_API_KEY) ??
      optionalEnvValue(env.GOOGLE_API_KEY) ??
      "",
    authMode:
      optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_AUTH_MODE) ??
      optionalEnvValue(env.IRIS_YOUTUBE_RELAY_UPSTREAM_AUTH_MODE) ??
      inferHttpLiveChatAuthMode(endpoint),
    timeoutMs: Number(
      optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS) ??
        optionalEnvValue(env.YOUTUBE_LIVE_CHAT_TIMEOUT_MS) ??
        5000
    ),
    dedupeWindow: Number(
      optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW) ??
        optionalEnvValue(env.YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW) ??
        5000
    ),
    blockedAuthorIds:
      optionalEnvValue(env.IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS) ??
      optionalEnvValue(env.YOUTUBE_BLOCKED_AUTHOR_IDS) ??
      "",
    blockedTextTerms:
      optionalEnvValue(env.IRIS_YOUTUBE_BLOCKED_TEXT_TERMS) ??
      optionalEnvValue(env.YOUTUBE_BLOCKED_TEXT_TERMS) ??
      "",
  });
}

function normalizeYouTubeLiveChatSource(source) {
  const normalized = String(source ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/gu, "_");
  if (
    normalized === "api" ||
    normalized === "youtube" ||
    normalized === "youtube_api" ||
    normalized === "youtube_live_chat_api"
  ) {
    return "youtube_api";
  }
  if (normalized === "relay" || normalized === "http_relay") return "http";
  return normalized;
}

function shouldUseYouTubeApiSource(env) {
  return hasYouTubeApiTarget(env) && hasYouTubeApiCredential(env);
}

function requireYouTubeApiRuntimeConfig(env) {
  if (!hasYouTubeApiTarget(env)) {
    throw new ContractError("YouTube API live chat source requires a video or liveChatId", {
      source: "youtube_api",
    });
  }
  if (!hasYouTubeApiCredential(env)) {
    throw new ContractError("YouTube API live chat source requires an API key or OAuth token", {
      source: "youtube_api",
    });
  }
}

function hasYouTubeApiTarget(env) {
  return resolveYouTubeLiveChatIdFromEnv(env) !== "" || resolveYouTubeVideoIdFromEnv(env) !== "";
}

function hasYouTubeApiCredential(env) {
  return (
    optionalEnvValue(env.IRIS_YOUTUBE_DATA_API_KEY) ||
      optionalEnvValue(env.IRIS_YOUTUBE_API_KEY) ||
      optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_API_KEY) ||
      optionalEnvValue(env.IRIS_GOOGLE_API_KEY) ||
      optionalEnvValue(env.YOUTUBE_DATA_API_KEY) ||
      optionalEnvValue(env.YOUTUBE_API_KEY) ||
      optionalEnvValue(env.GOOGLE_API_KEY) ||
      optionalEnvValue(env.IRIS_YOUTUBE_OAUTH_TOKEN) ||
      optionalEnvValue(env.IRIS_YOUTUBE_ACCESS_TOKEN) ||
      optionalEnvValue(env.YOUTUBE_OAUTH_TOKEN) ||
      optionalEnvValue(env.YOUTUBE_ACCESS_TOKEN) ||
      optionalEnvValue(env.IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN) ||
      optionalEnvValue(env.IRIS_YOUTUBE_REFRESH_TOKEN) ||
      optionalEnvValue(env.YOUTUBE_OAUTH_REFRESH_TOKEN) ||
      optionalEnvValue(env.YOUTUBE_REFRESH_TOKEN) ||
      ""
  ) !== "";
}

function resolveYouTubeVideoIdFromEnv(env) {
  return (
    parseYouTubeVideoId(env.IRIS_YOUTUBE_VIDEO_ID) ||
    parseYouTubeVideoId(env.YOUTUBE_VIDEO_ID) ||
    parseYouTubeVideoId(env.IRIS_YOUTUBE_VIDEO_URL) ||
    parseYouTubeVideoId(env.YOUTUBE_VIDEO_URL) ||
    parseYouTubeVideoId(env.IRIS_YOUTUBE_WATCH_URL) ||
    parseYouTubeVideoId(env.YOUTUBE_WATCH_URL) ||
    parseYouTubeVideoId(env.IRIS_YOUTUBE_LIVE_URL) ||
    parseYouTubeVideoId(env.YOUTUBE_LIVE_URL) ||
    parseYouTubeVideoId(env.IRIS_YOUTUBE_STREAM_URL) ||
    parseYouTubeVideoId(env.YOUTUBE_STREAM_URL) ||
    parseYouTubeVideoId(env.IRIS_YOUTUBE_URL) ||
    parseYouTubeVideoId(env.YOUTUBE_URL) ||
    ""
  );
}

function parseYouTubeVideoId(value) {
  const raw = optionalEnvValue(value);
  if (!raw) return "";
  const text = String(raw).trim();
  if (/^[a-zA-Z0-9_-]{6,}$/.test(text) && !text.includes("/")) return text;
  try {
    const url = new URL(text);
    const nestedUrl =
      optionalEnvValue(url.searchParams.get("url")) ||
      optionalEnvValue(url.searchParams.get("u")) ||
      optionalEnvValue(url.searchParams.get("redirect")) ||
      optionalEnvValue(url.searchParams.get("q")) ||
      optionalEnvValue(url.searchParams.get("target")) ||
      optionalEnvValue(url.searchParams.get("next")) ||
      optionalEnvValue(url.searchParams.get("continue"));
    if (nestedUrl) return parseYouTubeVideoId(nestedUrl);
    const host = url.hostname.replace(/^www\./u, "");
    if (host === "youtu.be") return safeYouTubeVideoId(url.pathname.split("/").filter(Boolean)[0]);
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      return (
        safeYouTubeVideoId(url.searchParams.get("v")) ||
        safeYouTubeVideoId(url.searchParams.get("video_id")) ||
        safeYouTubeVideoId(url.searchParams.get("videoId")) ||
        safeYouTubeVideoId(url.searchParams.get("videoID")) ||
        safeYouTubeVideoId(url.searchParams.get("video")) ||
        safeYouTubeVideoId(url.searchParams.get("vi")) ||
        safeYouTubeVideoId(url.pathname.match(/\/(?:live|shorts|embed|v|e|watch|video)\/([^/?#]+)/u)?.[1])
      );
    }
  } catch {
    return "";
  }
  return "";
}

function safeYouTubeVideoId(value) {
  const text = String(value ?? "").trim();
  return /^[a-zA-Z0-9_-]{6,}$/.test(text) ? text : "";
}

function createYouTubeLiveChatCursorStoreFromEnv(env) {
  const cursorStorePath =
    optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH) ||
    optionalEnvValue(env.YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH) ||
    (shouldUseYouTubeApiSource(env) ? defaultYouTubeLiveChatCursorStorePath(env) : "");
  if (!cursorStorePath) return null;
  return createJsonYouTubeLiveChatCursorStore(
    cursorStorePath
  );
}

function defaultYouTubeLiveChatCursorStorePath(env) {
  const scope = safeCursorStoreScope(
    resolveYouTubeLiveChatIdFromEnv(env) ||
      resolveYouTubeVideoIdFromEnv(env) ||
      "default"
  );
  return `data/youtube_live_chat_cursor_${scope}.json`;
}

function resolveYouTubeLiveChatIdFromEnv(env) {
  return (
    parseYouTubeLiveChatId(env.IRIS_YOUTUBE_LIVE_CHAT_ID) ||
    parseYouTubeLiveChatId(env.IRIS_YOUTUBE_CHAT_ID) ||
    parseYouTubeLiveChatId(env.IRIS_YOUTUBE_ACTIVE_LIVE_CHAT_ID) ||
    parseYouTubeLiveChatId(env.IRIS_YOUTUBE_LIVE_CHAT_URL) ||
    parseYouTubeLiveChatId(env.IRIS_YOUTUBE_CHAT_URL) ||
    parseYouTubeLiveChatId(env.YOUTUBE_LIVE_CHAT_ID) ||
    parseYouTubeLiveChatId(env.YOUTUBE_CHAT_ID) ||
    parseYouTubeLiveChatId(env.YOUTUBE_ACTIVE_LIVE_CHAT_ID) ||
    parseYouTubeLiveChatId(env.YOUTUBE_LIVE_CHAT_URL) ||
    parseYouTubeLiveChatId(env.YOUTUBE_CHAT_URL) ||
    ""
  );
}

function parseYouTubeLiveChatId(value) {
  const raw = optionalEnvValue(value);
  if (!raw) return "";
  const text = String(raw).trim();
  if (!text.includes("/") && !text.includes("?")) return text;
  try {
    const url = new URL(text);
    const nestedUrl =
      optionalEnvValue(url.searchParams.get("url")) ||
      optionalEnvValue(url.searchParams.get("u")) ||
      optionalEnvValue(url.searchParams.get("redirect")) ||
      optionalEnvValue(url.searchParams.get("q")) ||
      optionalEnvValue(url.searchParams.get("target")) ||
      optionalEnvValue(url.searchParams.get("next")) ||
      optionalEnvValue(url.searchParams.get("continue"));
    if (nestedUrl) return parseYouTubeLiveChatId(nestedUrl);
    return (
      optionalEnvValue(url.searchParams.get("live_chat_id")) ||
      optionalEnvValue(url.searchParams.get("liveChatId")) ||
      optionalEnvValue(url.searchParams.get("active_live_chat_id")) ||
      optionalEnvValue(url.searchParams.get("activeLiveChatId")) ||
      optionalEnvValue(url.searchParams.get("chat_id")) ||
      optionalEnvValue(url.searchParams.get("chatId")) ||
      optionalEnvValue(url.searchParams.get("live_chat")) ||
      optionalEnvValue(url.searchParams.get("liveChat")) ||
      optionalEnvValue(url.searchParams.get("id")) ||
      ""
    );
  } catch {
    return text;
  }
}

function safeCursorStoreScope(value) {
  const text = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/gu, "_")
    .replace(/_+/gu, "_")
    .slice(0, 80);
  return text || "default";
}

function createYouTubeOAuthTokenProviderFromEnv(env) {
  const refreshToken =
    optionalEnvValue(env.IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN) ??
    optionalEnvValue(env.IRIS_YOUTUBE_REFRESH_TOKEN) ??
    optionalEnvValue(env.YOUTUBE_OAUTH_REFRESH_TOKEN) ??
    optionalEnvValue(env.YOUTUBE_REFRESH_TOKEN);
  if (!refreshToken) return null;
  return createYouTubeOAuthTokenProvider({
    refreshEndpoint:
      optionalEnvValue(env.IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT) ??
      optionalEnvValue(env.YOUTUBE_OAUTH_REFRESH_ENDPOINT),
    clientId:
      optionalEnvValue(env.IRIS_YOUTUBE_OAUTH_CLIENT_ID) ??
      optionalEnvValue(env.IRIS_GOOGLE_OAUTH_CLIENT_ID) ??
      optionalEnvValue(env.YOUTUBE_OAUTH_CLIENT_ID) ??
      optionalEnvValue(env.GOOGLE_OAUTH_CLIENT_ID) ??
      optionalEnvValue(env.GOOGLE_CLIENT_ID) ??
      "",
    clientSecret:
      optionalEnvValue(env.IRIS_YOUTUBE_OAUTH_CLIENT_SECRET) ??
      optionalEnvValue(env.IRIS_GOOGLE_OAUTH_CLIENT_SECRET) ??
      optionalEnvValue(env.YOUTUBE_OAUTH_CLIENT_SECRET) ??
      optionalEnvValue(env.GOOGLE_OAUTH_CLIENT_SECRET) ??
      optionalEnvValue(env.GOOGLE_CLIENT_SECRET) ??
      "",
    refreshToken,
    timeoutMs: Number(
      optionalEnvValue(env.IRIS_YOUTUBE_OAUTH_REFRESH_TIMEOUT_MS) ??
        optionalEnvValue(env.YOUTUBE_OAUTH_REFRESH_TIMEOUT_MS) ??
        5000
    ),
  });
}

function createMediaWatchSourceFromEnv(env) {
  const endpoint = optionalEnvValue(env.IRIS_MEDIA_WATCH_ENDPOINT);
  if (!endpoint) return null;
  return createHttpMediaWatchSource({
    endpoint,
    apiKey: optionalEnvValue(env.IRIS_MEDIA_WATCH_API_KEY) ?? "",
    timeoutMs: Number(optionalEnvValue(env.IRIS_MEDIA_WATCH_TIMEOUT_MS) ?? 5000),
  });
}

function createExternalTopicSourceFromEnv(env) {
  const endpoint = optionalEnvValue(env.IRIS_EXTERNAL_TOPIC_ENDPOINT);
  if (!endpoint) return null;
  return createHttpExternalTopicSource({
    endpoint,
    apiKey: optionalEnvValue(env.IRIS_EXTERNAL_TOPIC_API_KEY) ?? "",
    timeoutMs: Number(optionalEnvValue(env.IRIS_EXTERNAL_TOPIC_TIMEOUT_MS) ?? 5000),
  });
}

export function createMemorySearchAdapterFromEnv(env) {
  const adapter = optionalEnvValue(env.IRIS_MEMORY_SEARCH_ADAPTER) ?? "local";
  if (adapter === "local") return undefined;
  if (adapter === "http_vector") {
    const endpoint = optionalEnvValue(env.IRIS_MEMORY_SEARCH_ENDPOINT);
    if (!endpoint) return undefined;
    return createHttpVectorMemorySearchAdapter({
      endpoint,
      apiKey: optionalEnvValue(env.IRIS_MEMORY_SEARCH_API_KEY) ?? "",
      timeoutMs: Number(optionalEnvValue(env.IRIS_MEMORY_SEARCH_TIMEOUT_MS) ?? 5000),
    });
  }
  throw new ContractError("unsupported memory search adapter", { adapter });
}

function parseGameObservationCaptureRequest(env) {
  return {
    capture_region: parseGameCaptureRegion(env),
    include_ocr_summary: env.IRIS_GAME_OBSERVATION_INCLUDE_OCR_SUMMARY !== "false",
    include_ui_focus_areas: env.IRIS_GAME_OBSERVATION_INCLUDE_UI_FOCUS_AREAS !== "false",
    max_detected_events: Number(env.IRIS_GAME_OBSERVATION_MAX_EVENTS ?? 8),
  };
}

function parseGameCaptureRegion(env) {
  const jsonRegion = parseJsonObject(env.IRIS_GAME_CAPTURE_REGION);
  const scalarRegion = {
    x: env.IRIS_GAME_CAPTURE_X,
    y: env.IRIS_GAME_CAPTURE_Y,
    width: env.IRIS_GAME_CAPTURE_WIDTH,
    height: env.IRIS_GAME_CAPTURE_HEIGHT,
  };
  const scalarConfigured = Object.values(scalarRegion).some(
    (value) => value !== undefined && value !== null && value !== ""
  );
  if (!scalarConfigured) return jsonRegion;
  return {
    ...(jsonRegion ?? {}),
    ...Object.fromEntries(
      Object.entries(scalarRegion).filter(
        ([, value]) => value !== undefined && value !== null && value !== ""
      )
    ),
  };
}

function parseJsonObject(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function optionalEnvValue(value) {
  if (value === undefined || value === null) return undefined;
  if (String(value).trim() === "") return undefined;
  return value;
}

function firstOptionalEnvValue(...values) {
  return values.map(optionalEnvValue).find((value) => value !== undefined) ?? "";
}

function isLocalBridgeRuntimeEndpoint(env, endpoint, adapterKind) {
  const selectedEndpoint = optionalEnvValue(endpoint);
  if (!selectedEndpoint) return false;
  const localBridgeEndpoint =
    adapterKind === "tts"
      ? optionalEnvValue(env.IRIS_LOCAL_TTS_BRIDGE_ENDPOINT)
      : adapterKind === "live2d"
        ? optionalEnvValue(env.IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT)
        : adapterKind === "subtitle"
          ? optionalEnvValue(env.IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT)
          : undefined;
  return (
    selectedEndpoint === localBridgeEndpoint ||
    selectedEndpoint === localBridgeAdapterEndpoint(env, adapterKind)
  );
}

function localBridgeAdapterEndpoint(env, adapterKind) {
  const base =
    optionalEnvValue(env.IRIS_LOCAL_BRIDGE_ENDPOINT) ??
    localLoopbackEndpoint({
      host: env.IRIS_LOCAL_BRIDGE_HOST,
      port: env.IRIS_LOCAL_BRIDGE_PORT,
    }) ??
    requiredLocalRuntimeEndpoint(env, { port: 8790 }) ??
    "http://127.0.0.1:8790";
  if (!base) return undefined;
  return `${base.replace(/\/+$/u, "")}/${adapterKind}`;
}

function localGameBridgeAdapterEndpoint(env, adapterPath) {
  const base =
    optionalEnvValue(env.IRIS_LOCAL_GAME_BRIDGE_ENDPOINT) ??
    localLoopbackEndpoint({
      host: env.IRIS_LOCAL_GAME_BRIDGE_HOST,
      port: env.IRIS_LOCAL_GAME_BRIDGE_PORT,
    }) ??
    requiredLocalRuntimeEndpoint(env, { port: 9112 }) ??
    "http://127.0.0.1:9112";
  if (!base) return undefined;
  return `${base.replace(/\/+$/u, "")}/${adapterPath}`;
}

function localLoopbackEndpoint({ host, port }) {
  const safeHost = optionalEnvValue(host);
  const safePort = optionalEnvValue(port);
  if (!safeHost || !safePort) return undefined;
  return `http://${safeHost}:${safePort}`;
}

function requiredLocalRuntimeEndpoint(env, { port }) {
  if (env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS !== "true") return undefined;
  return `http://127.0.0.1:${port}`;
}

function localYouTubeRelayEndpoint(env) {
  const relaySourceSelected =
    normalizeYouTubeLiveChatSource(
      env.IRIS_YOUTUBE_LIVE_CHAT_SOURCE ?? env.YOUTUBE_LIVE_CHAT_SOURCE
    ) === "http";
  const relayUpstreamConfigured = (
    optionalEnvValue(env.IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT) ||
      optionalEnvValue(env.YOUTUBE_RELAY_UPSTREAM_ENDPOINT) ||
      optionalEnvValue(env.YOUTUBE_RELAY_ENDPOINT) ||
      optionalEnvValue(env.YOUTUBE_LIVE_CHAT_ENDPOINT) ||
      ""
  ) !== "";
  const base =
    localLoopbackEndpoint({
      host: env.IRIS_YOUTUBE_RELAY_HOST ?? env.IRIS_YOUTUBE_RELAY_BRIDGE_HOST,
      port: env.IRIS_YOUTUBE_RELAY_PORT ?? env.IRIS_YOUTUBE_RELAY_BRIDGE_PORT,
    }) ??
    (relaySourceSelected || relayUpstreamConfigured ? "http://127.0.0.1:9111" : undefined) ??
    requiredLocalRuntimeEndpoint(env, { port: 9111 });
  if (!base) return undefined;
  return `${base.replace(/\/+$/u, "")}/youtube/live-chat`;
}

function resolveYouTubeRelayEndpointFromEnv(env) {
  return (
    optionalEnvValue(env.IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT) ??
    optionalEnvValue(env.IRIS_YOUTUBE_RELAY_ENDPOINT) ??
    optionalEnvValue(env.IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT) ??
    optionalEnvValue(env.YOUTUBE_LIVE_CHAT_ENDPOINT) ??
    optionalEnvValue(env.YOUTUBE_RELAY_ENDPOINT) ??
    optionalEnvValue(env.YOUTUBE_RELAY_UPSTREAM_ENDPOINT)
  );
}

function inferHttpLiveChatAuthMode(endpoint) {
  try {
    const url = new URL(endpoint);
    if (url.hostname.endsWith("googleapis.com")) return "query_key";
  } catch {
    // Fall through to the local relay/API compatible default.
  }
  return "bearer";
}

function withOptionalBooleanQueryParam(endpoint, key, enabled) {
  if (!endpoint || !enabled) return endpoint;
  try {
    const url = new URL(endpoint);
    url.searchParams.set(key, "true");
    return url.toString();
  } catch {
    return endpoint;
  }
}
