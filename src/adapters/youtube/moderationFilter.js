const MODERATION_REASON_KEYS = ["blocked_author", "blocked_text"];

export function createYouTubeModerationFilter({
  blockedAuthorIds = [],
  blockedTextTerms = [],
} = {}) {
  const authorIds = new Set(normalizeList(blockedAuthorIds, 160));
  const textTerms = normalizeList(blockedTextTerms, 80).map((term) => term.toLowerCase());
  return {
    configured: authorIds.size > 0 || textTerms.length > 0,
    reason_keys: MODERATION_REASON_KEYS,
    evaluate(event) {
      if (!event || typeof event !== "object") return null;
      const payload = event.payload && typeof event.payload === "object" ? event.payload : {};
      const authorId = safeText(payload.author_channel_id, 160);
      if (authorId && authorIds.has(authorId)) return "blocked_author";
      const text = safeText(
        payload.message_text ?? payload.text ?? payload.display_text ?? "",
        500
      ).toLowerCase();
      if (text && textTerms.some((term) => term && text.includes(term))) {
        return "blocked_text";
      }
      return null;
    },
  };
}

export function applyYouTubeModeration(events, filter) {
  const reasonCounts = emptyModerationReasonCounts();
  if (!filter?.configured) {
    return {
      events,
      filtered_count: 0,
      reason_counts: reasonCounts,
    };
  }
  const accepted = [];
  for (const event of events) {
    const reason = filter.evaluate(event);
    if (Object.hasOwn(reasonCounts, reason)) {
      reasonCounts[reason] += 1;
      continue;
    }
    accepted.push(event);
  }
  return {
    events: accepted,
    filtered_count: events.length - accepted.length,
    reason_counts: reasonCounts,
  };
}

export function emptyModerationReasonCounts() {
  return Object.fromEntries(MODERATION_REASON_KEYS.map((reason) => [reason, 0]));
}

export function mergeModerationReasonCounts(totalCounts, nextCounts) {
  for (const reason of MODERATION_REASON_KEYS) {
    totalCounts[reason] = Number(totalCounts[reason] ?? 0) + Number(nextCounts?.[reason] ?? 0);
  }
}

function normalizeList(value, maxLength) {
  const source = Array.isArray(value)
    ? value
    : String(value ?? "")
        .split(/[\n,;]+/g)
        .map((item) => item.trim());
  return source
    .map((item) => safeText(item, maxLength))
    .filter(Boolean)
    .slice(0, 100);
}

function safeText(value, maxLength) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
