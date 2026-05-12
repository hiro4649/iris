import { normalizeIdlePresenceEvent } from "../adapters/presence/idleEventAdapter.js";

export function createIdleScheduler({
  runtime,
  streamState,
  intervalMs = 8000,
  idleReason = "scheduled_idle",
  onStateUpdate = null,
  logger = console,
} = {}) {
  if (!runtime) throw new Error("createIdleScheduler requires runtime");
  if (!streamState) throw new Error("createIdleScheduler requires streamState");

  const safeIntervalMs = clampInteger(intervalMs, 1000, 3_600_000, 8000);
  let timer = null;
  let running = false;
  let last_tick_at_ms = null;
  let tick_count = 0;
  let last_error = null;

  async function tickNow(reason = idleReason) {
    try {
      const event = normalizeIdlePresenceEvent({ idle_reason: reason });
      const result = await runtime.processEvent(event);
      const state = streamState.updateFromRuntimeResult(result);
      onStateUpdate?.(state, { reason, result });
      last_tick_at_ms = Date.now();
      tick_count += 1;
      last_error = null;
      return { ok: true, result, state };
    } catch (error) {
      last_error = error?.message ?? "idle_tick_failed";
      logger.error?.(error);
      return { ok: false, error: last_error };
    }
  }

  function scheduleNext() {
    if (!running) return;
    timer = setTimeout(async () => {
      await tickNow(idleReason);
      scheduleNext();
    }, safeIntervalMs);
    timer.unref?.();
  }

  return {
    start() {
      if (running) return this.status();
      running = true;
      scheduleNext();
      return this.status();
    },
    stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
      return this.status();
    },
    async tickNow(reason = "manual_idle_tick") {
      return tickNow(reason);
    },
    status() {
      return {
        running,
        interval_ms: safeIntervalMs,
        idle_reason: idleReason,
        last_tick_at_ms,
        tick_count,
        last_error,
      };
    },
  };
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}
