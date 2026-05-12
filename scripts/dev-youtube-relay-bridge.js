import "../src/config/loadIrisEnv.js";
import {
  createYouTubeRelayBridgeServer,
  createYouTubeRelayBridgeStartupReport,
  createYouTubeRelayBridgeItems,
  summarizeRelayItems,
} from "../src/server/youtubeRelayBridge.js";
import { listen } from "../src/server/httpServer.js";

const host = optionalEnvValue(process.env.IRIS_YOUTUBE_RELAY_BRIDGE_HOST) ?? "127.0.0.1";
const port = Number(optionalEnvValue(process.env.IRIS_YOUTUBE_RELAY_BRIDGE_PORT) ?? 9111);
const upstreamEndpoint =
  optionalEnvValue(process.env.IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT) ??
  optionalEnvValue(process.env.YOUTUBE_RELAY_UPSTREAM_ENDPOINT) ??
  optionalEnvValue(process.env.YOUTUBE_LIVE_CHAT_ENDPOINT) ??
  optionalEnvValue(process.env.YOUTUBE_RELAY_ENDPOINT) ??
  "";
const useFixtures =
  process.env.IRIS_YOUTUBE_RELAY_USE_FIXTURES === "true";
if (!useFixtures && !upstreamEndpoint) {
  throw new Error(
    "YouTube relay bridge requires IRIS_YOUTUBE_RELAY_UPSTREAM_ENDPOINT or IRIS_YOUTUBE_RELAY_USE_FIXTURES=true"
  );
}
const upstreamStrict =
  process.env.IRIS_YOUTUBE_RELAY_UPSTREAM_STRICT === "true" ||
  (!useFixtures && Boolean(upstreamEndpoint)) ||
  (process.env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true" && !useFixtures) ||
  (process.env.IRIS_YOUTUBE_RELAY_USE_FIXTURES === "false" && Boolean(upstreamEndpoint));
const items = useFixtures
  ? createRuntimeUniqueRelayItems(createYouTubeRelayBridgeItems())
  : [];
const upstreamApiKey =
  optionalEnvValue(process.env.IRIS_YOUTUBE_RELAY_UPSTREAM_API_KEY) ??
  optionalEnvValue(process.env.YOUTUBE_RELAY_UPSTREAM_API_KEY) ??
  optionalEnvValue(process.env.YOUTUBE_API_KEY) ??
  optionalEnvValue(process.env.GOOGLE_API_KEY) ??
  "";
const upstreamAuthMode =
  optionalEnvValue(process.env.IRIS_YOUTUBE_RELAY_UPSTREAM_AUTH_MODE) ??
  (upstreamEndpoint.includes("googleapis.com") ? "query_key" : "bearer");
const server = createYouTubeRelayBridgeServer({
  items,
  upstreamEndpoint,
  upstreamApiKey,
  upstreamAuthMode,
  upstreamTimeoutMs: Number(
    optionalEnvValue(process.env.IRIS_YOUTUBE_RELAY_UPSTREAM_TIMEOUT_MS) ??
      optionalEnvValue(process.env.YOUTUBE_RELAY_UPSTREAM_TIMEOUT_MS) ??
      optionalEnvValue(process.env.YOUTUBE_LIVE_CHAT_TIMEOUT_MS) ??
      5000
  ),
  upstreamContinueOnError: !upstreamStrict,
  upstreamRequired: upstreamStrict,
  drainOnRead: process.env.IRIS_YOUTUBE_RELAY_DRAIN_ON_READ === "true",
});

await listen(server, { host, port });

console.log(
  JSON.stringify(
    createYouTubeRelayBridgeStartupReport({
      sourceSummary: summarizeRelayItems(items),
    }),
    null,
    2
  )
);

function createRuntimeUniqueRelayItems(items) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return items.map((item) => ({
    ...structuredClone(item),
    id: `${item.id}-${suffix}`,
  }));
}

function optionalEnvValue(value) {
  const text = String(value ?? "").trim();
  return text ? value : undefined;
}
