import { ContractError } from "../../core/contracts.js";
import {
  sanitizeMemorySearchProviderLabel,
  searchApprovedMemoryRecords,
} from "../../services/memory/memorySearchIndex.js";
import { summarizeLocalEndpointScope } from "../../core/localEndpointPolicy.js";
import { sanitizeApprovedMemoryRecordForPublicState } from "../../services/persistence/jsonMemoryStore.js";
import { redactSensitiveText } from "../../services/safety/privacyGuards.js";

const FORBIDDEN_VECTOR_SEARCH_FIELDS = new Set([
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
  "memory_candidate",
  "approved_memory_record",
  "approved_relationship_record",
  "selected_memory_ids",
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
  "summary",
  "raw_summary",
  "text",
]);

export function createHttpVectorMemorySearchAdapter({
  endpoint,
  apiKey = "",
  timeoutMs = 5000,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!endpoint) {
    throw new ContractError("HTTP vector memory search endpoint is required");
  }
  if (typeof fetchImpl !== "function") {
    throw new ContractError("HTTP vector memory search adapter requires fetch");
  }
  const safeTimeoutMs = clampInteger(timeoutMs, 100, 60_000, 5000);
  let requestCount = 0;
  let lastError = null;
  let lastErrorAtMs = null;

  async function searchWithHttpVectorMemory(records, { query = "", limit = 5, nowMs = Date.now() } = {}) {
    const endpointScopeSummary = summarizeLocalEndpointScope(endpoint);
    if (!endpointScopeSummary.local_endpoint_allowed) {
      lastError = "local_endpoint_policy_blocked";
      lastErrorAtMs = nowMs;
      throw new ContractError("HTTP vector memory search endpoint must be local", {
        error_kind: "local_endpoint_policy_blocked",
        endpoint_scope: endpointScopeSummary.endpoint_scope,
        retryable: false,
        operator_action_required: true,
      });
    }
    const publicRecords = Array.isArray(records)
      ? records.map((record) => sanitizeApprovedMemoryRecordForPublicState(record)).filter(Boolean)
      : [];
    const safeQuery = redactSensitiveText(query, { maxLength: 160 });
    const request = {
      schema: "iris_vector_memory_search_request_v1",
      query: safeQuery,
      limit: normalizeLimit(limit),
      records: publicRecords.map((record) => ({
        memory_id: record.memory_id,
        event_id: record.event_id,
        memory_type: record.memory_type,
        owner_scope: record.owner_scope,
        display_name: record.display_name,
        source_phase: record.source_phase,
        summary_hint: record.summary,
        committed_at_ms: record.committed_at_ms,
      })),
      boundary_policy: {
        approved_public_records_only: true,
        endpoint_must_return_ids_only: true,
        read_only_reference: true,
      },
      adapter_validation_required: true,
    };
    assertVectorMemorySearchRequestSafe(request);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), safeTimeoutMs);
    try {
      requestCount += 1;
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ContractError("HTTP vector memory search request failed", {
          status: response.status,
          response_kind: "omitted",
          error_kind: "http_status",
        });
      }
      const responseText = await response.text();
      const parsed = parseJsonResponse(responseText);
      assertVectorSearchResponseSafe(parsed, "HTTP vector memory search response");
      const providerHits = extractProviderHits(parsed);
      lastError = null;
      lastErrorAtMs = null;
      return searchApprovedMemoryRecords(records, {
        query: safeQuery,
        limit,
        nowMs,
        providerHits,
        searchProvider: "http_vector_memory_v1",
        vectorProvider: sanitizeMemorySearchProviderLabel(
          parsed?.vector_provider ?? parsed?.provider ?? "http_bridge",
          "http_bridge"
        ),
      });
    } catch (error) {
      if (!(error instanceof ContractError && error.details?.error_kind === "local_endpoint_policy_blocked")) {
        lastError = classifyVectorMemorySearchError(error);
        lastErrorAtMs = nowMs;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  searchWithHttpVectorMemory.adapterKind = "http_vector_memory_search";
  searchWithHttpVectorMemory.status = () => {
    const endpointScopeSummary = summarizeLocalEndpointScope(endpoint);
    return {
      schema: "iris_http_vector_memory_search_status_v1",
      adapter_kind: "http_vector_memory_search",
      request_count: requestCount,
      last_error: lastError,
      last_error_at_ms: lastErrorAtMs,
      local_endpoint_policy: "loopback_or_private_network_only",
      local_endpoint_policy_status: endpointScopeSummary.local_endpoint_allowed
        ? "all_allowed"
        : endpointScopeSummary.endpoint_scope === "not_configured"
          ? "not_configured"
          : "blocked",
      bridge_endpoint_scope: endpointScopeSummary.endpoint_scope,
      bridge_endpoint_locality_ok: endpointScopeSummary.local_endpoint_allowed,
      boundary_policy: {
        no_endpoint_values: true,
        no_secret_values: true,
        no_raw_memory_records: true,
        no_candidates: true,
        no_commands: true,
      },
      adapter_validation_required: true,
    };
  };
  return searchWithHttpVectorMemory;
}

function extractProviderHits(parsed) {
  const hits = Array.isArray(parsed?.hits)
    ? parsed.hits
    : Array.isArray(parsed?.results)
      ? parsed.results
      : [];
  return hits
    .map((hit) => ({
      memory_id: safeText(hit?.memory_id ?? hit?.id ?? "", 160),
      relevance_score: Number(hit?.relevance_score ?? hit?.score ?? 0),
    }))
    .filter((hit) => hit.memory_id);
}

function parseJsonResponse(text) {
  const raw = String(text ?? "");
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new ContractError("HTTP vector memory search requires JSON response");
  }
}

function classifyVectorMemorySearchError(error) {
  if (error?.name === "AbortError") return "http_vector_memory_timeout";
  if (error instanceof ContractError) {
    if (error.details?.error_kind === "local_endpoint_policy_blocked") {
      return "local_endpoint_policy_blocked";
    }
    if (typeof error.details?.status === "number") return "http_status";
    return "contract_error";
  }
  return "request_error";
}

function normalizeLimit(limit) {
  return clampInteger(limit, 1, 20, 5);
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

function assertVectorMemorySearchRequestSafe(request) {
  assertNoForbiddenVectorSearchFields(request, "HTTP vector memory search request");
  if (request.schema !== "iris_vector_memory_search_request_v1") {
    throw new ContractError("HTTP vector memory search request: invalid schema", {
      schema: request.schema,
    });
  }
  if (request.adapter_validation_required !== true) {
    throw new ContractError(
      "HTTP vector memory search request: adapter_validation_required must be true"
    );
  }
}

function assertVectorSearchResponseSafe(value, context) {
  assertNoForbiddenVectorSearchFields(value, context);
}

function assertNoForbiddenVectorSearchFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenVectorSearchFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_VECTOR_SEARCH_FIELDS.has(field)) {
      throw new ContractError(`${context}: must not expose raw memory or side-effect fields`, {
        field,
        path,
      });
    }
    assertNoForbiddenVectorSearchFields(child, context, `${path}.${field}`);
  }
}
