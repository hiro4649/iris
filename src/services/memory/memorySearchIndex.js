import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";
import { sanitizeApprovedMemoryRecordForPublicState } from "../persistence/jsonMemoryStore.js";
import { redactSensitiveText } from "../safety/privacyGuards.js";

const FORBIDDEN_MEMORY_SEARCH_FIELDS = new Set([
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
  "action_type",
  "intent",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
]);

const SEARCH_STOPWORDS = new Set([
  "iris",
  "remember",
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

const UNSAFE_PROVIDER_LABEL_PATTERN =
  /(https?:\/\/|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|input_action|input_action_candidate|approved_game_input_action|commit|memory_write|relationship_update_candidate|canonical_envelope)/i;
const MEMORY_SEARCH_BOUNDARY_POLICY = {
  approved_records_only: true,
  private_records_filtered: true,
  read_only_reference: true,
  no_commit_authority: true,
};

export function searchApprovedMemoryRecords(
  records,
  {
    query = "",
    limit = 5,
    nowMs = Date.now(),
    providerHits = null,
    searchProvider = "local_lexical_v1",
    vectorProvider = "not_configured",
  } = {}
) {
  const safeQuery = redactSensitiveText(query, { maxLength: 160 });
  const queryTokens = tokenize(safeQuery);
  const safeLimit = normalizeLimit(limit);
  const searchableRecords = Array.isArray(records)
    ? records
        .map((record) => sanitizeApprovedMemoryRecordForPublicState(record))
        .filter(Boolean)
    : [];
  const normalizedProviderHits = Array.isArray(providerHits)
    ? normalizeProviderHits(providerHits)
    : null;

  const results = normalizedProviderHits
    ? buildProviderRankedResults({
        searchableRecords,
        providerHits: normalizedProviderHits,
        queryTokens,
        nowMs,
        safeLimit,
      })
    : searchableRecords
        .map((record) => buildSearchHit({ record, queryTokens, nowMs }))
        .filter((hit) => hit.relevance_score > 0 || queryTokens.size === 0)
        .sort(
          (a, b) => b.relevance_score - a.relevance_score || b.committed_at_ms - a.committed_at_ms
        )
        .slice(0, safeLimit)
        .map(({ committed_at_ms, ...publicHit }) => publicHit);

  const safeSearchProvider = sanitizeMemorySearchProviderLabel(
    searchProvider,
    "local_lexical_v1"
  );
  const safeVectorProvider = sanitizeMemorySearchProviderLabel(vectorProvider, "not_configured");
  const searchResult = {
    schema: "iris_memory_search_result_v1",
    query: safeQuery,
    search_provider: safeSearchProvider,
    vector_provider: safeVectorProvider,
    result_count: results.length,
    results,
    boundary_policy: { ...MEMORY_SEARCH_BOUNDARY_POLICY },
    adapter_validation_required: true,
  };
  assertMemorySearchResultSafe(searchResult);
  return searchResult;
}

export function sanitizeMemorySearchProviderLabel(value, fallback = "not_configured") {
  const label = String(value ?? "")
    .replace(/\s+/g, "_")
    .trim()
    .toLowerCase()
    .slice(0, 80);
  if (!label) return fallback;
  if (UNSAFE_PROVIDER_LABEL_PATTERN.test(label)) return fallback;
  if (!/^[a-z][a-z0-9_.-]{0,79}$/.test(label)) return fallback;
  return label;
}

export function assertMemorySearchResultSafe(searchResult, context = "memory search result") {
  if (!searchResult || typeof searchResult !== "object") {
    throw new ContractError(`${context}: missing result`);
  }
  assertNoWorldCommand(searchResult, context);
  assertNoForbiddenMemorySearchFields(searchResult, context);
  if (searchResult.schema !== "iris_memory_search_result_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: searchResult.schema });
  }
  if (searchResult.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  assertExactBoundaryPolicy(searchResult.boundary_policy, MEMORY_SEARCH_BOUNDARY_POLICY, context);
  if (searchResult.boundary_policy.read_only_reference !== true) {
    throw new ContractError(`${context}: search hits must be read-only references`);
  }
  assertProviderLabelSafe(searchResult.search_provider, context, "search_provider");
  assertProviderLabelSafe(searchResult.vector_provider, context, "vector_provider");
  if (!Array.isArray(searchResult.results)) {
    throw new ContractError(`${context}: results must be an array`);
  }
}

function assertProviderLabelSafe(value, context, field) {
  const label = String(value ?? "");
  if (!label || sanitizeMemorySearchProviderLabel(label, "unsafe_provider_label") !== label) {
    throw new ContractError(`${context}: unsafe provider label`, { field });
  }
}

function buildSearchHit({ record, queryTokens, nowMs }) {
  const text = [
    record.summary,
    record.memory_type,
    record.owner_scope,
    record.display_name,
    record.source_phase,
  ]
    .filter(Boolean)
    .join(" ");
  const recordTokens = tokenize(text);
  const overlap = [...queryTokens].filter((token) => recordTokens.has(token)).length;
  const relevance =
    queryTokens.size === 0
      ? freshnessScore(record.committed_at_ms, nowMs)
      : overlap / Math.max(2, Math.min(queryTokens.size, recordTokens.size));
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
    event_id: record.event_id,
    memory_type: record.memory_type,
    owner_scope: record.owner_scope,
    display_name: record.display_name,
    source_phase: record.source_phase,
    relevance_score: clamp01(relevance + typeBoost),
    freshness: freshnessLabel(record.committed_at_ms, nowMs),
    summary_hint: redactSensitiveText(record.summary ?? "", { maxLength: 180 }),
    committed_at_ms: Number(record.committed_at_ms ?? 0),
  };
}

function buildProviderRankedResults({
  searchableRecords,
  providerHits,
  queryTokens,
  nowMs,
  safeLimit,
}) {
  const recordsById = new Map(
    searchableRecords.map((record) => [String(record.memory_id ?? record.event_id), record])
  );
  return providerHits
    .map((providerHit, index) => {
      const record = recordsById.get(providerHit.memory_id);
      if (!record) return null;
      const localHit = buildSearchHit({ record, queryTokens, nowMs });
      return {
        ...localHit,
        relevance_score: clamp01(providerHit.relevance_score),
        provider_rank: index,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.relevance_score - a.relevance_score || a.provider_rank - b.provider_rank)
    .slice(0, safeLimit)
    .map(({ committed_at_ms, provider_rank, ...publicHit }) => publicHit);
}

function normalizeProviderHits(providerHits) {
  return providerHits
    .map((hit) => {
      if (!hit || typeof hit !== "object") return null;
      const memory_id = String(hit.memory_id ?? hit.id ?? "").trim();
      if (!memory_id) return null;
      const score = Number(hit.relevance_score ?? hit.score ?? 0);
      return {
        memory_id,
        relevance_score: clamp01(Number.isFinite(score) ? score : 0),
      };
    })
    .filter(Boolean);
}

function tokenize(text) {
  return new Set(
    String(text ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !SEARCH_STOPWORDS.has(token))
  );
}

function normalizeLimit(limit) {
  const number = Number(limit);
  if (!Number.isFinite(number) || number <= 0) return 5;
  return Math.min(20, Math.floor(number));
}

function freshnessScore(committedAtMs, nowMs) {
  const committed = Number(committedAtMs ?? 0);
  if (!committed) return 0.1;
  const ageMs = Math.max(0, nowMs - committed);
  if (ageMs < 24 * 60 * 60 * 1000) return 0.32;
  if (ageMs < 30 * 24 * 60 * 60 * 1000) return 0.2;
  return 0.08;
}

function freshnessLabel(committedAtMs, nowMs) {
  const committed = Number(committedAtMs ?? 0);
  if (!committed) return "unknown";
  const ageMs = Math.max(0, nowMs - committed);
  if (ageMs < 24 * 60 * 60 * 1000) return "recent";
  if (ageMs < 30 * 24 * 60 * 60 * 1000) return "known";
  return "old";
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
}

function assertNoForbiddenMemorySearchFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenMemorySearchFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_MEMORY_SEARCH_FIELDS.has(field)) {
      throw new ContractError(`${context}: search result must not expose side-effect fields`, {
        field,
        path,
      });
    }
    assertNoForbiddenMemorySearchFields(child, context, `${path}.${field}`);
  }
}

function assertExactBoundaryPolicy(policy, expected, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy is missing`);
  }
  for (const field of Object.keys(policy)) {
    if (!Object.hasOwn(expected, field)) {
      throw new ContractError(`${context}: unexpected boundary policy ${field}`);
    }
  }
}
