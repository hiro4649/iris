import { ContractError } from "../../core/contracts.js";
import { sanitizeApprovedMemoryRecordsForPublicState } from "../persistence/jsonMemoryStore.js";

const FORBIDDEN_MEMORY_PROMPT_FIELDS = new Set([
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
  "selected_memory_ids",
  "memory_id",
  "event_id",
  "trace_id",
  "relation_score",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
]);

export function createApprovedMemoryPromptSummary({
  memoryStore,
  phase01,
  maxSourceRecords = 20,
  maxPromptSummaries = 2,
} = {}) {
  const records = sanitizeApprovedMemoryRecordsForPublicState(readMemoryStoreRecords(memoryStore), {
    limit: maxSourceRecords,
  });
  const safeLimit =
    Number.isFinite(maxPromptSummaries) && maxPromptSummaries > 0
      ? Math.floor(maxPromptSummaries)
      : 2;
  const relevant = records
    .map((record) => ({
      summary: record.summary,
      memory_type: record.memory_type,
      owner_scope: record.owner_scope,
      score: scoreMemoryForPrompt(record, phase01),
    }))
    .filter((item) => item.score >= 0.34)
    .sort((a, b) => b.score - a.score);
  const selected = relevant.slice(0, safeLimit);
  const promptSummary = selected.map((item) => item.summary).filter(Boolean).join(" / ");
  const result = {
    schema: "iris_approved_memory_prompt_summary_v1",
    summary_mode: "approved_sanitized_prompt_summary",
    prompt_summary: promptSummary,
    selected_summary_count: selected.length,
    source_record_count: records.length,
    selected_memory_types: [...new Set(selected.map((item) => item.memory_type).filter(Boolean))],
    selected_owner_scopes: [...new Set(selected.map((item) => item.owner_scope).filter(Boolean))],
    relevance_policy: {
      approved_records_only: true,
      sanitized_public_shape_only: true,
      no_memory_ids: true,
      no_candidates: true,
      no_direct_commits: true,
      max_prompt_summaries: safeLimit,
      min_relevance_score: 0.34,
    },
  };
  assertApprovedMemoryPromptSummarySafe(result);
  return result;
}

function readMemoryStoreRecords(memoryStore) {
  if (!memoryStore || typeof memoryStore.list !== "function") return [];
  const records = memoryStore.list();
  if (!Array.isArray(records)) {
    throw new ContractError("approved memory prompt summary: memory store list is required");
  }
  return records;
}

export function assertApprovedMemoryPromptSummarySafe(
  summary,
  context = "approved memory prompt summary"
) {
  if (!summary || typeof summary !== "object") {
    throw new ContractError(`${context}: missing summary`);
  }
  if (summary.schema !== "iris_approved_memory_prompt_summary_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: summary.schema });
  }
  if (typeof summary.prompt_summary !== "string") {
    throw new ContractError(`${context}: prompt_summary must be string`);
  }
  if (summary.relevance_policy?.approved_records_only !== true) {
    throw new ContractError(`${context}: approved-only policy is required`);
  }
  if (summary.relevance_policy?.no_memory_ids !== true) {
    throw new ContractError(`${context}: memory IDs must not be exported`);
  }
  assertNoForbiddenMemoryPromptFields(summary, context);
}

function scoreMemoryForPrompt(record, phase01 = {}) {
  const summary = String(record.summary ?? "").toLowerCase();
  const text = String(phase01.normalized_text ?? "").toLowerCase();
  const gameTitle = String(phase01.game_context?.game_title ?? "").toLowerCase();
  const payloadKind = phase01.payload_kind ?? "comment";
  let score = 0;
  if (payloadKind === "game_observation" && record.memory_type === "game_experience") score += 0.3;
  if (payloadKind === "media_watch_observation" && record.memory_type === "media_watch_experience") {
    score += 0.26;
  }
  if (payloadKind === "donation_event" && record.memory_type === "stream_experience") score += 0.18;
  if (gameTitle && summary.includes(gameTitle)) score += 0.34;
  if (/remember|again|previous|last time|\u524d\u56de|\u899a\u3048\u3066|\u307e\u305f/i.test(text)) {
    score += 0.28;
  }
  for (const token of tokenizeMemoryPrompt(`${text} ${phase01.game_context?.scene_summary ?? ""}`)) {
    if (summary.includes(token)) score += 0.08;
  }
  return Math.min(1, Number(score.toFixed(4)));
}

function tokenizeMemoryPrompt(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .slice(0, 10);
}

function assertNoForbiddenMemoryPromptFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenMemoryPromptFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_MEMORY_PROMPT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe field in prompt summary`, {
        field,
        path,
      });
    }
    assertNoForbiddenMemoryPromptFields(child, context, `${path}.${field}`);
  }
}
