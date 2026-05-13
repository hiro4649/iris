import { ContractError, assertNoWorldCommand, normalizeFinalDecision } from "../../core/contracts.js";
import { assertRelationshipDeepeningSafe } from "../relationship/relationshipDeepening.js";
import { inferSensitivityLevel } from "../safety/privacyGuards.js";

const RECALL_DECISIONS = new Set(["recall", "skip"]);
const MEMORY_TYPES = new Set([
  "short_term",
  "episodic",
  "semantic",
  "relationship",
  "community",
  "game_experience",
  "stream_experience",
  "media_watch_experience",
]);
const SENSITIVITY_LEVELS = new Set(["public", "low", "private", "sensitive"]);
const RECALL_STOPWORDS = new Set([
  "iris",
  "remember",
  "again",
  "about",
  "this",
  "that",
  "with",
  "from",
  "the",
  "and",
  "you",
  "your",
  "shared",
]);
const MODERATION_RECALL_OVERRIDE_STATUSES = new Set([
  "muted",
  "blocked",
  "limited",
  "bounded",
]);
const MODERATION_RECALL_PRECHECK_STATUSES = new Set([
  "allowed",
  "watch",
  "limited",
  "muted",
  "blocked",
  "bounded",
]);

const FORBIDDEN_RECALL_FIELDS = new Set([
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
  "approved_memory_record",
  "memory_candidate",
  "relation_score",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
]);

const FORBIDDEN_RECALL_RECORD_FIELDS = new Set([
  "raw_memory",
  "raw_memory_body",
  "memory_body",
  "raw_youtube_text",
  "raw_youtube_comment",
  "raw_support_message",
  "support_message",
  "raw_frame",
  "raw_screen",
  "raw_audio",
  "raw_audio_body",
  "memory_candidate",
  "relationship_update_candidate",
  "community_memory_candidate",
  "input_action_candidate",
  "approved_game_input_action",
  "world_command",
  "execute",
  "commit",
  "write",
  "apply",
]);

export function createMemoryRecall({
  event,
  coreResult,
  relationshipDeepening,
  memoryRecords = [],
  recentRecallHistory = [],
} = {}) {
  assertNoWorldCommand(event, "Memory recall event input");
  assertNoWorldCommand(coreResult, "Memory recall core input");
  assertRelationshipDeepeningSafe(relationshipDeepening, "Memory recall relationship input");

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const safetyStatus = normalizeSafetyStatus(phase15.final_decision);
  const moderationStatus = moderationRecallStatus({ event, phase01, phase15 });
  const text = String(phase01.normalized_text ?? "").trim();
  const currentUserId = recallUserId({ event, phase01, relationshipDeepening });
  const candidates = buildRecallCandidates({
    memoryRecords,
    text,
    currentEventId: phase01.event_id,
    relationshipDeepening,
    phase01,
    currentUserId,
  });
  const recentIds = new Set(
    (Array.isArray(recentRecallHistory) ? recentRecallHistory : [])
      .slice(-6)
      .flatMap((entry) => entry.selected_memory_ids ?? [])
  );
  const eligible = candidates.filter(
    (candidate) =>
      candidate.recall_allowed &&
      candidate.relevance_score >= 0.28 &&
      !recentIds.has(candidate.memory_id)
  );
  const moderationOverride = MODERATION_RECALL_OVERRIDE_STATUSES.has(moderationStatus);
  const selected = safetyStatus === "safe" && text && !moderationOverride ? eligible.slice(0, 2) : [];
  const blocked = candidates.filter((candidate) => !candidate.recall_allowed);
  const recall_decision = selected.length > 0 ? "recall" : "skip";
  const selected_memory_ids = selected.map((candidate) => candidate.memory_id);
  const recall = {
    schema: "iris_memory_recall_v1",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    recall_decision,
    selected_memory_ids,
    recall_reference_policy: "read_only_reference",
    recall_phrase_hint: recall_decision === "recall" ? buildPhraseHint(selected) : null,
    privacy_filter_result: {
      status: blocked.length > 0 && selected.length === 0 ? "filtered" : "safe",
      allowed_count: candidates.length - blocked.length,
      blocked_count: blocked.length,
      blocked_memory_ids: blocked.map((candidate) => candidate.memory_id),
      policy: "no_sensitive_or_private_surface_without_guard",
    },
    community_memory_mix: buildCommunityMemoryMix(selected),
    recall_reject_reason:
      recall_decision === "skip"
        ? rejectReason({ safetyStatus, text, candidates, eligible, recentIds, moderationOverride })
        : null,
    adapter_validation_required: true,
  };

  assertMemoryRecallSafe(recall, "Memory recall output");
  return recall;
}

export function assertMemoryRecallSafe(memoryRecall, context = "memory recall") {
  if (!memoryRecall || typeof memoryRecall !== "object") {
    throw new ContractError(`${context}: missing memory recall export`);
  }
  assertNoWorldCommand(memoryRecall, context);
  assertNoForbiddenFieldsRecursive(memoryRecall, context);
  if (memoryRecall.schema !== "iris_memory_recall_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: memoryRecall.schema });
  }
  if (memoryRecall.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (memoryRecall.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!RECALL_DECISIONS.has(memoryRecall.recall_decision)) {
    throw new ContractError(`${context}: unsupported recall_decision`, {
      recall_decision: memoryRecall.recall_decision,
    });
  }
  if (!Array.isArray(memoryRecall.selected_memory_ids)) {
    throw new ContractError(`${context}: selected_memory_ids must be an array`);
  }
  if (memoryRecall.selected_memory_ids.some((id) => typeof id !== "string" || !id.trim())) {
    throw new ContractError(`${context}: selected_memory_ids must be non-empty strings`);
  }
  if (memoryRecall.recall_reference_policy !== "read_only_reference") {
    throw new ContractError(`${context}: recall references must be read-only`);
  }
  assertCommunityMemoryMixSafe(memoryRecall.community_memory_mix, context);
}

export function sanitizeMemoryRecallForPublicState(memoryRecall) {
  if (!memoryRecall) return null;
  assertMemoryRecallSafe(memoryRecall, "Memory recall public summary");
  return {
    schema: memoryRecall.schema,
    trace_id: memoryRecall.trace_id,
    event_id: memoryRecall.event_id,
    internal_profile: true,
    recall_decision: memoryRecall.recall_decision,
    selected_memory_count: memoryRecall.selected_memory_ids.length,
    recall_phrase_hint: memoryRecall.recall_phrase_hint,
    privacy_filter_result: {
      status: memoryRecall.privacy_filter_result.status,
      allowed_count: memoryRecall.privacy_filter_result.allowed_count,
      blocked_count: memoryRecall.privacy_filter_result.blocked_count,
      policy: memoryRecall.privacy_filter_result.policy,
    },
    community_memory_mix: memoryRecall.community_memory_mix,
    recall_reject_reason: memoryRecall.recall_reject_reason,
    adapter_validation_required: true,
  };
}

export function createMemoryRecallHistory({ maxEntries = 12 } = {}) {
  const history = [];
  return {
    list() {
      return structuredClone(history);
    },
    record(memoryRecall) {
      assertMemoryRecallSafe(memoryRecall, "Memory recall history record");
      if (memoryRecall.selected_memory_ids.length === 0) return this.list();
      history.push({
        selected_memory_ids: memoryRecall.selected_memory_ids,
        recorded_at_ms: Date.now(),
      });
      while (history.length > maxEntries) history.shift();
      return this.list();
    },
  };
}

function buildRecallCandidates({
  memoryRecords,
  text,
  currentEventId,
  relationshipDeepening,
  phase01,
  currentUserId,
}) {
  if (!Array.isArray(memoryRecords)) {
    throw new ContractError("memory recall: memory records array is required");
  }
  return memoryRecords
    .filter(isApprovedRecallMemoryRecord)
    .filter((record) => record?.event_id !== currentEventId)
    .map((record, index) => {
      const summary = String(record.summary ?? "");
      const sensitivity_level = inferSensitivity(record, summary);
      const memory_type = inferMemoryType(record, summary);
      const owner_scope = inferOwnerScope(record, summary);
      const relevance_score = scoreRelevance({
        text,
        summary,
        relationshipDeepening,
        memory_type,
      });
      const user_context_match = memoryRecordUserMatches(record, currentUserId);
      const private_surface_guard_verified = isPrivateSurfaceGuardVerified(record, phase01);
      const media_watch_safe_summary = isMediaWatchSafeSummary(record, summary);
      return {
        memory_id: String(record.memory_id ?? record.event_id ?? `memory:${index}`),
        memory_type,
        owner_scope,
        relevance_score,
        sensitivity_level,
        freshness: freshnessFromRecord(record),
        recall_allowed: recallAllowedForCandidate({
          memory_type,
          sensitivity_level,
          relevance_score,
          user_context_match,
          private_surface_guard_verified,
          media_watch_safe_summary,
        }),
      };
    })
    .filter((candidate) => MEMORY_TYPES.has(candidate.memory_type));
}

function isApprovedRecallMemoryRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return false;
  if (record.schema !== "approved_memory_record" || record.approved !== true) return false;
  return !hasForbiddenRecallRecordField(record);
}

function hasForbiddenRecallRecordField(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasForbiddenRecallRecordField(item));
  return Object.entries(value).some(
    ([field, child]) =>
      FORBIDDEN_RECALL_RECORD_FIELDS.has(field) || hasForbiddenRecallRecordField(child)
  );
}

function recallAllowedForCandidate({
  memory_type,
  sensitivity_level,
  relevance_score,
  user_context_match,
  private_surface_guard_verified,
  media_watch_safe_summary,
}) {
  if (memory_type === "media_watch_experience" && !media_watch_safe_summary) return false;
  if (sensitivity_level === "public" || sensitivity_level === "low") return relevance_score >= 0.18;
  if (sensitivity_level === "private") {
    return relevance_score >= 0.18 && user_context_match && private_surface_guard_verified;
  }
  return false;
}

function isMediaWatchSafeSummary(record, summary) {
  if (record?.memory_type !== "media_watch_experience" && !/media|youtube|clip|anime|video|watch/i.test(summary)) {
    return true;
  }
  const rightsRisk = String(record?.rights_risk_note ?? record?.rights_risk ?? "").trim().toLowerCase();
  if (["high", "blocked", "unsafe"].includes(rightsRisk)) return false;
  if (
    record?.raw_dialogue ||
    record?.raw_subtitle ||
    record?.raw_subtitles ||
    record?.subtitle_text ||
    record?.lyrics ||
    record?.raw_lyrics ||
    record?.melody ||
    record?.transcript
  ) {
    return false;
  }
  return summary.length <= 240 && !/(long dialogue|full subtitle|lyrics|melody|transcript|script excerpt)/i.test(summary);
}

function scoreRelevance({ text, summary, relationshipDeepening, memory_type }) {
  const textTokens = tokenize(text);
  const summaryTokens = tokenize(summary);
  if (textTokens.size === 0 || summaryTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of textTokens) {
    if (summaryTokens.has(token)) overlap += 1;
  }
  if (overlap === 0) return 0;
  const base = overlap / Math.max(3, Math.min(textTokens.size, summaryTokens.size));
  const recallCue = /remember|again|前|覚え|また|前回/i.test(text) ? 0.24 : 0;
  const familiarityBoost = ["recognized", "familiar", "trusted", "long_term_friend"].includes(
    relationshipDeepening.familiarity_level
  )
    ? 0.08
    : 0;
  const communityBoost = memory_type === "community" ? 0.05 : 0;
  return clamp01(base + recallCue + familiarityBoost + communityBoost);
}

function buildPhraseHint(selected) {
  if (selected.some((candidate) => candidate.memory_type === "game_experience")) {
    return "briefly acknowledge the related game moment without claiming control";
  }
  if (selected.some((candidate) => candidate.memory_type === "media_watch_experience")) {
    return "briefly recall the shared media reaction without reproducing dialogue, subtitles, or lyrics";
  }
  if (selected.some((candidate) => candidate.memory_type === "stream_experience")) {
    return "briefly recall the shared stream moment, keeping it open for new viewers";
  }
  if (selected.some((candidate) => candidate.memory_type === "community")) {
    return "brief community recall, open enough for new viewers";
  }
  return "short related recall, no internal IDs or hidden scores";
}

function buildCommunityMemoryMix(selected) {
  const hasCommunity = selected.some((candidate) => candidate.owner_scope === "community");
  return {
    mode: hasCommunity ? "light_context" : "none",
    community_reference_allowed: hasCommunity,
    new_viewer_openness_guard_required: true,
    insider_exclusion_allowed: false,
    openness_guard: "keep_context_understandable_for_new_viewers",
    newcomer_explanation_candidate: hasCommunity
      ? "briefly explain this as a shared stream context for anyone new"
      : null,
  };
}

function assertCommunityMemoryMixSafe(mix, context) {
  if (!mix || typeof mix !== "object" || Array.isArray(mix)) {
    throw new ContractError(`${context}: community memory mix is required`);
  }
  if (!["light_context", "none"].includes(mix.mode)) {
    throw new ContractError(`${context}: invalid community memory mix mode`);
  }
  if (typeof mix.community_reference_allowed !== "boolean") {
    throw new ContractError(`${context}: invalid community memory reference flag`);
  }
  if (
    mix.new_viewer_openness_guard_required !== true ||
    mix.insider_exclusion_allowed !== false ||
    mix.openness_guard !== "keep_context_understandable_for_new_viewers" ||
    (mix.community_reference_allowed === true &&
      typeof mix.newcomer_explanation_candidate !== "string")
  ) {
    throw new ContractError(`${context}: community memory openness guard required`);
  }
}

function rejectReason({ safetyStatus, text, candidates, eligible, recentIds, moderationOverride = false }) {
  if (moderationOverride) return "moderation_recall_override";
  if (safetyStatus !== "safe") return "unsafe_status";
  if (!text) return "silent_turn";
  if (candidates.length === 0) return "no_memory";
  if (eligible.length === 0 && candidates.some((candidate) => recentIds.has(candidate.memory_id))) {
    return "recent_recall";
  }
  if (
    eligible.length === 0 &&
    candidates.some(
      (candidate) =>
        (candidate.sensitivity_level === "public" || candidate.sensitivity_level === "low") &&
        candidate.relevance_score < 0.28
    )
  ) {
    return "low_relevance";
  }
  if (candidates.every((candidate) => !candidate.recall_allowed)) return "privacy_filtered";
  return "low_relevance";
}

function moderationRecallStatus({ event, phase01, phase15 }) {
  const value =
    event?.moderation_recall_status ??
    event?.moderation_status ??
    event?.payload?.moderation_recall_status ??
    event?.payload?.moderation_status ??
    phase01?.moderation_recall_status ??
    phase01?.moderation_status ??
    phase15?.moderation_recall_status ??
    phase15?.moderation_status ??
    null;
  return normalizeModerationRecallStatus(value);
}

function normalizeModerationRecallStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (!status) return "allowed";
  if (MODERATION_RECALL_PRECHECK_STATUSES.has(status)) return status;
  return "limited";
}

function inferMemoryType(record, summary) {
  if (MEMORY_TYPES.has(record.memory_type)) return record.memory_type;
  const text = summary.toLowerCase();
  if (/media|youtube|clip|anime|video|watch/.test(text)) return "media_watch_experience";
  if (/stream|live|shared moment/.test(text)) return "stream_experience";
  if (/game|minecraft|apex|valorant|ゲーム|マイクラ/.test(text)) return "game_experience";
  if (/meme|inside joke|community|配信|ミーム/.test(text)) return "community";
  if (record.store === "relationship_memory") return "relationship";
  return "episodic";
}

function inferOwnerScope(record, summary) {
  if (record.owner_scope) return record.owner_scope;
  if (/meme|community|配信|ミーム/i.test(summary)) return "community";
  if (record.linked_identity_id) return "user";
  return "shared_stream";
}

function inferSensitivity(record, summary) {
  if (SENSITIVITY_LEVELS.has(record?.sensitivity_level)) return record.sensitivity_level;
  return inferSensitivityLevel(summary);
}

function recallUserId({ event, phase01, relationshipDeepening }) {
  return firstNonEmptyString(
    phase01?.linked_identity_id,
    phase01?.user_id,
    relationshipDeepening?.user_id,
    event?.linked_identity_id,
    event?.user_id,
    event?.payload?.linked_identity_id,
    event?.payload?.user_id
  );
}

function memoryRecordUserMatches(record, currentUserId) {
  const recordUserId = firstNonEmptyString(
    record?.linked_identity_id,
    record?.user_id,
    record?.owner_user_id,
    record?.viewer_id
  );
  return Boolean(currentUserId && recordUserId && currentUserId === recordUserId);
}

function isPrivateSurfaceGuardVerified(record, phase01) {
  return (
    record?.private_surface_guard === true ||
    record?.privacy_guard?.private_surface_allowed === true ||
    record?.privacy_guard?.surface_text_allowed === true ||
    phase01?.memory_privacy_guard?.private_surface_allowed === true ||
    phase01?.memory_privacy_guard?.surface_text_allowed === true
  );
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return null;
}

function freshnessFromRecord(record) {
  const committedAt = Number(record.committed_at_ms ?? 0);
  if (!committedAt) return "unknown";
  const ageMs = Date.now() - committedAt;
  if (ageMs < 24 * 60 * 60 * 1000) return "recent";
  if (ageMs < 30 * 24 * 60 * 60 * 1000) return "known";
  return "old";
}

function normalizeSafetyStatus(finalDecision) {
  try {
    return normalizeFinalDecision(finalDecision ?? "allow");
  } catch {
    return "reject";
  }
}

function tokenize(text) {
  return new Set(
    String(text ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !RECALL_STOPWORDS.has(token))
  );
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
}

function assertNoForbiddenFieldsRecursive(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFieldsRecursive(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_RECALL_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: memory recall must not define command, commit, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}
