export function createEventQueue({ maxSize = 100, dedupeWindowSize = 200 } = {}) {
  const queue = [];
  const queuedEventIds = new Set();
  const recentEventIds = [];
  const recentEventIdSet = new Set();
  let sequence = 0;

  return {
    push(event) {
      const eventId = event?.event_id ?? null;
      if (eventId && (queuedEventIds.has(eventId) || recentEventIdSet.has(eventId))) {
        return {
          accepted: false,
          reason: "duplicate_event",
          event_id: eventId,
          size: queue.length,
        };
      }
      if (queue.length >= maxSize) {
        return {
          accepted: false,
          reason: "queue_full",
          dropped_event_id: event?.event_id ?? null,
        };
      }
      queue.push({
        event,
        priority: scoreEventPriority(event),
        sequence: sequence++,
      });
      queue.sort(compareQueueEntries);
      if (eventId) queuedEventIds.add(eventId);
      return { accepted: true, size: queue.length };
    },
    shift() {
      const event = queue.shift()?.event ?? null;
      rememberShiftedEvent(event);
      return event;
    },
    size() {
      return queue.length;
    },
    drain(limit = Infinity) {
      const drained = [];
      while (queue.length > 0 && drained.length < limit) {
        const event = queue.shift().event;
        rememberShiftedEvent(event);
        drained.push(event);
      }
      return drained;
    },
  };

  function rememberShiftedEvent(event) {
    const eventId = event?.event_id ?? null;
    if (!eventId) return;
    queuedEventIds.delete(eventId);
    if (recentEventIdSet.has(eventId)) return;
    recentEventIds.push(eventId);
    recentEventIdSet.add(eventId);
    while (recentEventIds.length > dedupeWindowSize) {
      const removed = recentEventIds.shift();
      recentEventIdSet.delete(removed);
    }
  }
}

export function scoreEventPriority(event) {
  const payloadKind = event?.payload?.payload_kind ?? inferPayloadKind(event);
  const text = String(event?.payload?.text ?? event?.payload?.message_text ?? "").toLowerCase();
  const gameContext = event?.payload?.game_context ?? event?.payload ?? {};
  if (payloadKind === "game_observation" && isUrgentGameObservation(gameContext)) return 95;
  if (payloadKind === "donation_event") return 85;
  if (payloadKind === "game_observation") return 75;
  if (payloadKind === "media_watch_observation") return 58;
  if (payloadKind === "external_topic_observation") return 42;
  if (/iris|\u30a4\u30ea\u30b9|\u3044\u308a\u3059/.test(text)) return 65;
  if (/help|danger|urgent|\u52a9\u3051\u3066|\u5371\u306a\u3044/.test(text)) return 62;
  if (payloadKind === "presence_idle") return 5;
  return 30;
}

function compareQueueEntries(a, b) {
  if (b.priority !== a.priority) return b.priority - a.priority;
  return a.sequence - b.sequence;
}

function inferPayloadKind(event) {
  if (event?.source === "youtube_donation") return "donation_event";
  if (event?.source === "game_observation") return "game_observation";
  if (event?.source === "media_watch") return "media_watch_observation";
  if (event?.source === "external_topic") return "external_topic_observation";
  if (event?.source === "presence_idle") return "presence_idle";
  return "comment";
}

function isUrgentGameObservation(gameContext) {
  const text = [
    gameContext?.scene_summary,
    gameContext?.player_state,
    ...(Array.isArray(gameContext?.detected_events) ? gameContext.detected_events : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /low health|lava|enemy|danger|panic|void|fall|boss|\u5373\u6b7b|\u5371\u967a|\u843d\u4e0b|\u6575/.test(
    text
  );
}
