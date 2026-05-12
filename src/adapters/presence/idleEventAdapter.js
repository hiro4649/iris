import { randomUUID } from "node:crypto";
import { ContractError } from "../../core/contracts.js";

const FORBIDDEN_IDLE_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
]);

export function normalizeIdlePresenceEvent(raw = {}) {
  for (const field of Object.keys(raw)) {
    if (FORBIDDEN_IDLE_FIELDS.has(field)) {
      throw new ContractError("idle presence event must not contain command fields", { field });
    }
  }
  return {
    trace_id: raw.trace_id ?? randomUUID(),
    event_id: raw.event_id ?? randomUUID(),
    source: "presence_idle",
    timestamp_ms: raw.timestamp_ms ?? Date.now(),
    target_presence_id: raw.target_presence_id ?? "presence:youtube-main",
    payload: {
      payload_kind: "presence_idle",
      text: "",
      idle_reason: raw.idle_reason ?? "no_recent_comment",
    },
  };
}
