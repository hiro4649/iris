import { createServer } from "node:http";
import { ContractError } from "../core/contracts.js";
import { redactSensitiveText } from "../services/safety/privacyGuards.js";

const MAX_BODY_BYTES = 512_000;
const URL_PATTERN = /https?:\/\//i;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_.:-]{1,160}$/;
const FORBIDDEN_VECTOR_BRIDGE_FIELDS = new Set([
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
  "approved_memory_record",
  "approved_relationship_record",
  "canonical",
  "canonical_envelope",
  "action_type",
  "intent",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "password",
  "authorization",
  "value",
  "payload",
  "summary",
  "raw_summary",
  "text",
]);

const STOPWORDS = new Set([
  "iris",
  "memory",
  "about",
  "again",
  "this",
  "that",
  "with",
  "from",
  "the",
  "and",
  "you",
  "your",
]);

export function createMemoryVectorSearchBridgeServer({
  nowMs = Date.now,
  logger = console,
} = {}) {
  return createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        return sendJson(response, 200, {
          ok: true,
          schema: "iris_memory_vector_search_bridge_health_v1",
          service: "memory_vector_search_bridge",
          bridge_status: "ready",
          search_path: "/memory-search",
          response_shape: "ids_and_scores_only",
          boundary_policy: {
            no_endpoint_values: true,
            no_secret_values: true,
            no_memory_records: true,
            no_memory_summaries: true,
            no_candidates: true,
            no_commands: true,
          },
          adapter_validation_required: true,
        });
      }
      if (
        request.method === "POST" &&
        (request.url === "/memory-search" || request.url === "/search")
      ) {
        const body = await readJson(request);
        const bridgeResponse = createMemoryVectorSearchBridgeResponse(body, {
          nowMs: nowMs(),
        });
        return sendJson(response, 200, bridgeResponse);
      }
      return sendJson(response, 404, createSafeErrorResponse("not_found"));
    } catch (error) {
      logger.warn?.(createSafeBridgeErrorLog(error));
      return sendJson(response, getStatusCode(error), createSafeErrorResponse(classifyError(error)));
    }
  });
}

export function createMemoryVectorSearchBridgeResponse(
  request,
  { nowMs = Date.now() } = {}
) {
  assertVectorBridgeRequestSafe(request);
  const queryTokens = tokenize(redactSensitiveText(request?.query ?? "", { maxLength: 160 }));
  const limit = normalizeLimit(request?.limit);
  const hits = normalizeBridgeRecords(request?.records)
    .map((record) => scoreRecord(record, queryTokens, nowMs))
    .filter((hit) => hit.relevance_score > 0 || queryTokens.size === 0)
    .sort((a, b) => b.relevance_score - a.relevance_score || b.committed_at_ms - a.committed_at_ms)
    .slice(0, limit)
    .map(({ committed_at_ms, ...hit }) => hit);
  const response = {
    schema: "iris_vector_memory_search_response_v1",
    vector_provider: "local_memory_vector_bridge",
    result_count: hits.length,
    hits,
    boundary_policy: {
      ids_and_scores_only: true,
      approved_public_records_only: true,
      no_memory_records: true,
      no_memory_summaries: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertMemoryVectorSearchBridgeResponseSafe(response);
  return response;
}

export function assertMemoryVectorSearchBridgeResponseSafe(
  response,
  context = "memory vector search bridge response"
) {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new ContractError(`${context}: response is required`);
  }
  assertNoForbiddenVectorBridgeFields(response, context);
  if (URL_PATTERN.test(JSON.stringify(response))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (response.schema !== "iris_vector_memory_search_response_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (response.vector_provider !== "local_memory_vector_bridge") {
    throw new ContractError(`${context}: invalid provider`);
  }
  if (!Array.isArray(response.hits)) {
    throw new ContractError(`${context}: hits must be an array`);
  }
  if (!Number.isInteger(response.result_count) || response.result_count !== response.hits.length) {
    throw new ContractError(`${context}: invalid hit count`);
  }
  for (const hit of response.hits) {
    assertBridgeHitSafe(hit, context);
  }
  assertBoundaryPolicy(response.boundary_policy, [
    "ids_and_scores_only",
    "approved_public_records_only",
    "no_memory_records",
    "no_memory_summaries",
    "no_secret_values",
    "no_endpoint_values",
    "no_candidates",
    "no_commands",
  ], context);
  if (response.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertVectorBridgeRequestSafe(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new ContractError("memory vector bridge request is required");
  }
  assertNoForbiddenVectorBridgeFields(request, "memory vector bridge request");
  if (request.schema !== "iris_vector_memory_search_request_v1") {
    throw new ContractError("memory vector bridge request: invalid schema");
  }
  if (!Array.isArray(request.records)) {
    throw new ContractError("memory vector bridge request: records are required");
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary flag ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary flag required ${field}`);
    }
  }
}

function normalizeBridgeRecords(records) {
  return records
    .map((record) => {
      if (!record || typeof record !== "object" || Array.isArray(record)) return null;
      const memoryId = safeId(record.memory_id ?? record.event_id);
      if (!memoryId) return null;
      return {
        memory_id: memoryId,
        memory_type: safeLabel(record.memory_type, "semantic"),
        owner_scope: safeLabel(record.owner_scope, "shared_stream"),
        source_phase: safeLabel(record.source_phase, "phase05"),
        display_name: safeShortText(record.display_name, 80),
        summary_hint: redactSensitiveText(record.summary_hint ?? "", { maxLength: 220 }),
        committed_at_ms: safeTimestamp(record.committed_at_ms),
      };
    })
    .filter(Boolean);
}

function scoreRecord(record, queryTokens, nowMs) {
  const recordTokens = tokenize([
    record.summary_hint,
    record.memory_type,
    record.owner_scope,
    record.source_phase,
    record.display_name,
  ].join(" "));
  const overlap = [...queryTokens].filter((token) => recordTokens.has(token)).length;
  const base =
    queryTokens.size === 0
      ? freshnessScore(record.committed_at_ms, nowMs)
      : overlap / Math.max(2, Math.min(queryTokens.size, recordTokens.size || 2));
  const typeBoost =
    queryTokens.has("game") && record.memory_type === "game_experience"
      ? 0.12
      : queryTokens.has("stream") && record.memory_type === "stream_experience"
        ? 0.12
        : queryTokens.has("media") && record.memory_type === "media_watch_experience"
          ? 0.12
          : 0;
  return {
    memory_id: record.memory_id,
    relevance_score: clamp01(base + typeBoost),
    committed_at_ms: record.committed_at_ms,
  };
}

function assertBridgeHitSafe(hit, context) {
  if (!hit || typeof hit !== "object" || Array.isArray(hit)) {
    throw new ContractError(`${context}: invalid hit`);
  }
  if (!safeId(hit.memory_id)) {
    throw new ContractError(`${context}: invalid memory id`);
  }
  if (
    typeof hit.relevance_score !== "number" ||
    hit.relevance_score < 0 ||
    hit.relevance_score > 1
  ) {
    throw new ContractError(`${context}: invalid relevance score`);
  }
  for (const field of Object.keys(hit)) {
    if (!["memory_id", "relevance_score"].includes(field)) {
      throw new ContractError(`${context}: hit exposes unsupported field`);
    }
  }
}

function createSafeBridgeErrorLog(error) {
  return {
    schema: "iris_memory_vector_search_bridge_error_log_v1",
    error_kind: classifyError(error),
    boundary_policy: {
      no_raw_error_messages: true,
      no_request_bodies: true,
      no_memory_records: true,
      no_memory_summaries: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function createSafeErrorResponse(errorKind) {
  return {
    ok: false,
    error: errorKind,
    error_kind: errorKind,
    boundary_policy: {
      no_raw_error_messages: true,
      no_request_bodies: true,
      no_memory_records: true,
      no_memory_summaries: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
}

function classifyError(error) {
  if (String(error?.message ?? "") === "invalid_json") return "invalid_json";
  if (String(error?.message ?? "") === "request_body_too_large") return "request_body_too_large";
  if (error instanceof ContractError) return "unsafe_or_invalid_request";
  return "internal_error";
}

function getStatusCode(error) {
  const kind = classifyError(error);
  if (kind === "internal_error") return 500;
  if (kind === "not_found") return 404;
  return 400;
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
        reject(new Error("request_body_too_large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    request.on("error", reject);
  });
}

function tokenize(value) {
  return new Set(
    String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !STOPWORDS.has(token))
  );
}

function safeId(value) {
  const text = String(value ?? "").trim().slice(0, 160);
  if (!SAFE_ID_PATTERN.test(text) || URL_PATTERN.test(text)) return "";
  if (/(authorization|bearer|api[_-]?key|oauth|token|secret|password)/i.test(text)) return "";
  return text;
}

function safeLabel(value, fallback) {
  const text = String(value ?? "")
    .replace(/\s+/g, "_")
    .trim()
    .toLowerCase()
    .slice(0, 80);
  if (/^[a-z0-9_:-]+$/.test(text)) return text;
  return fallback;
}

function safeShortText(value, maxLength) {
  return redactSensitiveText(String(value ?? "").replace(/\s+/g, " ").trim(), {
    maxLength,
  });
}

function safeTimestamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function normalizeLimit(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 5;
  return Math.min(20, Math.trunc(number));
}

function freshnessScore(committedAtMs, nowMs) {
  const ageMs = Math.max(0, Number(nowMs) - Number(committedAtMs));
  if (!committedAtMs) return 0.1;
  if (ageMs < 24 * 60 * 60 * 1000) return 0.32;
  if (ageMs < 30 * 24 * 60 * 60 * 1000) return 0.2;
  return 0.08;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
}

function assertNoForbiddenVectorBridgeFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenVectorBridgeFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_VECTOR_BRIDGE_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { field, path });
    }
    assertNoForbiddenVectorBridgeFields(child, context, `${path}.${field}`);
  }
}
