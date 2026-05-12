import { ContractError } from "../../core/contracts.js";

const FORBIDDEN_OAUTH_REFRESH_RESPONSE_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "canonical",
  "canonical_envelope",
  "intent",
  "conversation_state",
  "action_type",
  "tone",
  "emotion",
  "character_tag",
  "task_type",
  "relation_score",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "refresh_token",
  "refreshToken",
  "client_secret",
  "clientSecret",
  "id_token",
  "idToken",
  "authorization",
  "secret",
  "password",
]);

export function createYouTubeOAuthTokenProvider({
  refreshEndpoint = "https://oauth2.googleapis.com/token",
  clientId = "",
  clientSecret = "",
  refreshToken = "",
  timeoutMs = 5000,
  nowMs = () => Date.now(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!refreshEndpoint) {
    throw new ContractError("YouTube OAuth token provider requires refresh endpoint");
  }
  if (!refreshToken) {
    throw new ContractError("YouTube OAuth token provider requires refresh token");
  }
  if (typeof fetchImpl !== "function") {
    throw new ContractError("YouTube OAuth token provider requires fetch");
  }
  const safeTimeoutMs = clampInteger(timeoutMs, 100, 60_000, 5000);

  let accessToken = "";
  let expiresAtMs = 0;
  let inFlightRefresh = null;
  const refreshLeewayMs = 60_000;
  const status = {
    schema: "iris_youtube_oauth_token_provider_status_v1",
    auth_mode: "oauth_refresh",
    configured: true,
    refresh_count: 0,
    cache_hit_count: 0,
    in_flight_join_count: 0,
    cached_token_available: false,
    refresh_in_flight: false,
    last_refresh_at_ms: null,
    expires_at_ms: null,
    token_refresh_leeway_ms: refreshLeewayMs,
    last_error: null,
    last_error_at_ms: null,
    boundary_policy: {
      no_secret_values: true,
      no_access_token: true,
      no_refresh_token: true,
      no_endpoint_values: true,
      env_names_only: true,
    },
    adapter_validation_required: true,
  };

  return {
    async getAccessToken() {
      const requestedAtMs = nowMs();
      if (accessToken && requestedAtMs < expiresAtMs - refreshLeewayMs) {
        status.cache_hit_count += 1;
        status.cached_token_available = true;
        return accessToken;
      }
      status.cached_token_available = false;
      if (inFlightRefresh) {
        status.in_flight_join_count += 1;
        status.refresh_in_flight = true;
        return await inFlightRefresh;
      }
      status.refresh_in_flight = true;
      inFlightRefresh = (async () => {
        try {
          const refreshed = await refreshAccessToken({
            refreshEndpoint,
            clientId,
            clientSecret,
            refreshToken,
            timeoutMs: safeTimeoutMs,
            fetchImpl,
          });
          accessToken = refreshed.accessToken;
          expiresAtMs = nowMs() + refreshed.expiresInSeconds * 1000;
          status.refresh_count += 1;
          status.last_refresh_at_ms = nowMs();
          status.expires_at_ms = expiresAtMs;
          status.cached_token_available = true;
          status.last_error = null;
          status.last_error_at_ms = null;
          return accessToken;
        } catch (error) {
          status.last_error = classifyOAuthRefreshError(error);
          status.last_error_at_ms = nowMs();
          throw error;
        } finally {
          inFlightRefresh = null;
          status.refresh_in_flight = false;
        }
      })();
      return await inFlightRefresh;
    },
    status() {
      const snapshot = structuredClone(status);
      snapshot.cached_token_available =
        accessToken !== "" && nowMs() < expiresAtMs - refreshLeewayMs;
      snapshot.refresh_in_flight = inFlightRefresh !== null;
      return snapshot;
    },
  };
}

async function refreshAccessToken({
  refreshEndpoint,
  clientId,
  clientSecret,
  refreshToken,
  timeoutMs,
  fetchImpl,
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const form = new URLSearchParams();
    form.set("grant_type", "refresh_token");
    form.set("refresh_token", refreshToken);
    if (clientId) form.set("client_id", clientId);
    if (clientSecret) form.set("client_secret", clientSecret);
    const response = await fetchImpl(refreshEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: form.toString(),
      signal: controller.signal,
    });
    const responseText = await response.text();
    if (!response.ok) {
      throw new ContractError("YouTube OAuth refresh request failed", {
        status: response.status,
        reason: safeText(response.statusText || responseText, 240),
      });
    }
    const parsed = parseJsonResponse(responseText);
    assertOAuthRefreshResponseSafe(parsed, "YouTube OAuth refresh response");
    const accessToken = String(parsed.access_token ?? "");
    if (!accessToken) {
      throw new ContractError("YouTube OAuth refresh response missing access token");
    }
    const expiresInSeconds = clampInteger(parsed.expires_in ?? 3600, 60, 86_400, 3600);
    return { accessToken, expiresInSeconds };
  } finally {
    clearTimeout(timer);
  }
}

function classifyOAuthRefreshError(error) {
  if (error?.name === "AbortError") return "youtube_oauth_refresh_timeout";
  if (error instanceof ContractError) {
    if (typeof error.details?.status === "number") return "youtube_oauth_refresh_http_status";
    if (String(error.message ?? "").includes("must be JSON")) {
      return "youtube_oauth_refresh_invalid_json";
    }
    if (String(error.message ?? "").includes("unsafe OAuth refresh response field")) {
      return "youtube_oauth_refresh_unsafe_response";
    }
    if (String(error.message ?? "").includes("missing access token")) {
      return "youtube_oauth_refresh_missing_access_token";
    }
    return "youtube_oauth_refresh_contract_error";
  }
  return "youtube_oauth_refresh_request_error";
}

function assertOAuthRefreshResponseSafe(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertOAuthRefreshResponseSafe(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_OAUTH_REFRESH_RESPONSE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe OAuth refresh response field`, { field, path });
    }
    assertOAuthRefreshResponseSafe(child, context, `${path}.${field}`);
  }
}

function parseJsonResponse(text) {
  try {
    return JSON.parse(String(text ?? "{}"));
  } catch {
    throw new ContractError("YouTube OAuth refresh response must be JSON");
  }
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}
