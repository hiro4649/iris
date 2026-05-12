import { randomUUID } from "node:crypto";
import { ContractError } from "../../core/contracts.js";

const FORBIDDEN_TOPIC_FIELDS = new Set([
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
  "article_text",
  "full_article_text",
  "raw_article",
  "raw_html",
  "raw_body",
  "body_text",
  "verbatim_text",
]);

export function normalizeExternalTopicObservation(raw = {}) {
  assertExternalTopicInputSafe(raw);
  const topicTitle = cleanText(raw.topic_title ?? raw.topicTitle ?? raw.title ?? "unknown topic");
  const topicSummary = cleanText(raw.topic_summary ?? raw.topicSummary ?? raw.summary ?? raw.text ?? "");
  const riskCategory = cleanText(raw.risk_category ?? raw.riskCategory ?? "general");
  const sourceUrl = cleanText(raw.source_url ?? raw.sourceUrl ?? "");
  const retrievedAtMs = normalizeTimestampMs(raw.retrieved_at_ms ?? raw.retrievedAtMs ?? raw.observedAt ?? raw.createdAt);
  const eventId =
    raw.event_id ?? raw.eventId ?? raw.platform_event_id ?? raw.platformEventId ?? raw.id ?? randomUUID();
  return {
    trace_id: raw.trace_id ?? raw.traceId ?? randomUUID(),
    event_id: eventId,
    source: "external_topic",
    timestamp_ms: normalizeTimestampMs(
      raw.timestamp_ms ?? raw.timestampMs ?? raw.observed_at_ms ?? raw.observedAtMs ?? raw.observedAt ?? raw.createdAt
    ),
    target_presence_id: "presence:topic-observation",
    payload: {
      payload_kind: "external_topic_observation",
      text: buildTopicText({ topicTitle, topicSummary, riskCategory }),
      topic_title: topicTitle,
      topic_summary: topicSummary,
      source_url: sourceUrl,
      retrieved_at_ms: retrievedAtMs,
      freshness_score: clamp01(Number(raw.freshness_score ?? raw.freshnessScore ?? 0.5)),
      source_trust_score: clamp01(Number(raw.source_trust_score ?? raw.sourceTrustScore ?? 0.5)),
      risk_category: riskCategory,
    },
  };
}

function assertExternalTopicInputSafe(raw) {
  assertNoForbiddenFieldsRecursive(raw, "external topic observation");
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
    if (FORBIDDEN_TOPIC_FIELDS.has(field)) {
      throw new ContractError(`${context} must be read-only and summary-only`, { field, path });
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}

function buildTopicText({ topicTitle, topicSummary, riskCategory }) {
  const summary = topicSummary ? ` ${topicSummary}` : "";
  return `External topic observation: ${topicTitle}.${summary} Risk category: ${riskCategory}.`;
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 800);
}

function normalizeTimestampMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
}
