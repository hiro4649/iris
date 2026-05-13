import { ContractError } from "../core/contracts.js";
import { createOverlayStatus } from "./overlayStatus.js";

const FORBIDDEN_OVERLAY_EVENT_FIELDS = new Set([
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
  "raw_memory",
  "raw_memories",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "selected_memory_ids",
  "latest_event_id",
  "event_id",
  "trace_id",
  "final_text",
  "last_text",
  "text",
  "action_type",
  "intent",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "internal_relationship_stage",
  "relation_score",
  "relationship_score",
  "hidden_rank",
  "hidden_relationship_rank",
  "endpoint",
  "endpoint_url",
  "api_key",
  "token",
  "raw_overlay_event",
  "raw_overlay_events",
  "raw_payload",
  "raw_payloads",
  "raw_bridge_payload",
  "raw_bridge_payloads",
  "bridge_mutation",
  "bridge_mutations",
  "bridge_payload",
  "bridge_payloads",
  "payload",
  "command",
  "command_payload",
  "obs_command",
  "obs_command_payload",
]);
const OVERLAY_PICKUP_PACKET_ALLOWED_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "packet_status",
  "payload_kind",
  "health",
  "display",
  "timing",
  "class_hints",
  "bridge",
  "camera",
  "boundary_policy",
  "adapter_validation_required",
]);
const OVERLAY_EVENT_STREAM_STATUS_ALLOWED_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "stream_ready",
  "event_bus_status",
  "client_count",
  "published_count",
  "latest_event_age_ms",
  "boundary_policy",
  "adapter_validation_required",
]);

export function createOverlayDisplayEvent(state, { nowMs = Date.now() } = {}) {
  const status = createOverlayStatus(state, { nowMs });
  const subtitleCue = state?.last_subtitle_cue ?? null;
  const subtitleText = cleanDisplayText(subtitleCue?.subtitle_text, 700);
  const event = {
    schema: "iris_overlay_display_event_v1",
    generated_at_ms: nowMs,
    payload_kind: status.last_payload_kind,
    health: status.health,
    display: {
      visible: subtitleText !== "",
      subtitle_text: subtitleText,
      subtitle_language: subtitleCue?.subtitle_language ?? null,
      script_direction: subtitleCue?.script_direction ?? "ltr",
      display_start_ms: Number(subtitleCue?.display_start_ms ?? 0),
      display_end_ms: Number(subtitleCue?.display_end_ms ?? 0),
      line_break_plan: sanitizeLineBreakPlan(subtitleCue?.line_break_plan),
      safe_area_policy: subtitleCue?.safe_area_policy ?? null,
    },
    timing: {
      planned_visible_ms: status.planned_visible_ms,
      speech_rate_label: status.speech_rate_label,
      speech_rate_repair_status: status.speech_rate_repair_status,
      subtitle_sync_status: status.subtitle_sync_status,
      tongue_twister_enabled: status.tongue_twister_enabled,
    },
    class_hints: status.class_hints,
    bridge: {
      tts_bridge_status: status.tts_bridge_status,
      tts_artifact_available: status.tts_artifact_available,
      tts_artifact_kind: status.tts_artifact_kind,
      tts_duration_ms: status.tts_duration_ms,
      live2d_bridge_status: status.live2d_bridge_status,
      live2d_artifact_available: status.live2d_artifact_available,
      live2d_artifact_kind: status.live2d_artifact_kind,
      live2d_duration_ms: status.live2d_duration_ms,
      subtitle_bridge_status: status.subtitle_bridge_status,
      subtitle_artifact_available: status.subtitle_artifact_available,
      subtitle_artifact_kind: status.subtitle_artifact_kind,
      subtitle_duration_ms: status.subtitle_duration_ms,
    },
    camera: {
      proximity_level: state?.last_camera_proximity?.proximity_level ?? "neutral",
      camera_proximity_profile:
        state?.last_camera_proximity?.camera_proximity_profile ?? "camera_neutral",
    },
    boundary_policy: {
      subtitle_text_from_validated_cue: true,
      no_raw_final_text: true,
      no_candidates: true,
      no_commands: true,
      read_only_display_event: true,
    },
    adapter_validation_required: true,
  };
  assertOverlayDisplayEventSafe(event);
  return event;
}

export function assertOverlayDisplayEventSafe(event, context = "overlay display event") {
  if (!event || typeof event !== "object") {
    throw new ContractError(`${context}: missing event`);
  }
  assertNoForbiddenOverlayEventFields(event, context);
  if (event.schema !== "iris_overlay_display_event_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: event.schema });
  }
  if (typeof event.display?.visible !== "boolean") {
    throw new ContractError(`${context}: display.visible must be boolean`);
  }
  if (typeof event.display?.subtitle_text !== "string") {
    throw new ContractError(`${context}: subtitle_text must be string`);
  }
  if (!Array.isArray(event.display?.line_break_plan)) {
    throw new ContractError(`${context}: line break plan is required`);
  }
  if (!["ltr", "rtl"].includes(event.display?.script_direction)) {
    throw new ContractError(`${context}: invalid script direction`, {
      script_direction: event.display?.script_direction,
    });
  }
  assertBoundaryPolicy(event.boundary_policy, [
    "subtitle_text_from_validated_cue",
    "no_raw_final_text",
    "no_candidates",
    "no_commands",
    "read_only_display_event",
  ], context);
  if (event.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

export function createOverlayPickupPacket(source = {}, { nowMs = Date.now() } = {}) {
  const event = source?.schema === "iris_overlay_display_event_v1"
    ? source
    : createOverlayDisplayEvent(source, { nowMs });
  if (!event || typeof event !== "object" || Array.isArray(event) || event.schema !== "iris_overlay_display_event_v1") {
    throw new ContractError("overlay pickup packet source must be an overlay display event");
  }
  const packet = {
    schema: "iris_overlay_pickup_packet_v1",
    generated_at_ms: Number(event.generated_at_ms ?? nowMs),
    packet_status: event.health === "fresh" ? "ready" : "runtime_waiting",
    payload_kind: event.payload_kind ?? null,
    health: event.health,
    display: structuredClone(event.display),
    timing: structuredClone(event.timing),
    class_hints: Array.isArray(event.class_hints) ? event.class_hints.slice(0, 16) : [],
    bridge: structuredClone(event.bridge),
    camera: structuredClone(event.camera),
    boundary_policy: {
      sanitized_overlay_pickup_only: true,
      no_endpoint_values: true,
      no_tokens: true,
      no_raw_overlay_events: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertOverlayPickupPacketSafe(packet);
  return packet;
}

export function assertOverlayPickupPacketSafe(packet, context = "overlay pickup packet") {
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
    throw new ContractError(`${context}: packet object required`);
  }
  assertNoForbiddenOverlayEventFields(packet, context);
  for (const field of Object.keys(packet)) {
    if (!OVERLAY_PICKUP_PACKET_ALLOWED_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsupported packet field`, { field });
    }
  }
  if (packet.schema !== "iris_overlay_pickup_packet_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["ready", "runtime_waiting"].includes(packet.packet_status)) {
    throw new ContractError(`${context}: invalid packet status`);
  }
  if (packet.health === "stale" && packet.packet_status === "ready") {
    throw new ContractError(`${context}: stale pickup must not be ready`);
  }
  assertBoundaryPolicy(packet.boundary_policy, [
    "sanitized_overlay_pickup_only",
    "no_endpoint_values",
    "no_tokens",
    "no_raw_overlay_events",
    "no_candidates",
    "no_commands",
  ], context);
  if (packet.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

export function createOverlayEventBus() {
  const clients = new Set();
  let latestEvent = null;
  let publishedCount = 0;
  let lastPublishedAtMs = null;
  return {
    publish(event) {
      assertOverlayDisplayEventSafe(event, "overlay event bus publish");
      latestEvent = structuredClone(event);
      publishedCount += 1;
      lastPublishedAtMs = Date.now();
      for (const client of [...clients]) {
        try {
          writeSseEvent(client.response, latestEvent);
        } catch {
          clearInterval(client.heartbeatTimer);
          clients.delete(client);
        }
      }
      return latestEvent;
    },
    latest() {
      return latestEvent ? structuredClone(latestEvent) : null;
    },
    subscribe(response, { sendInitial = true, heartbeatMs = 15_000 } = {}) {
      const normalizedHeartbeatMs = clampNumber(heartbeatMs, 1_000, 60_000);
      const client = {
        response,
        connected_at_ms: Date.now(),
        heartbeatTimer: null,
      };
      clients.add(client);
      response.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      });
      response.write(": iris overlay event stream\n\n");
      client.heartbeatTimer = setInterval(() => {
        try {
          response.write(`: heartbeat ${Date.now()}\n\n`);
        } catch {
          clearInterval(client.heartbeatTimer);
          clients.delete(client);
        }
      }, normalizedHeartbeatMs);
      client.heartbeatTimer.unref?.();
      if (sendInitial && latestEvent) {
        writeSseEvent(response, latestEvent);
      }
      return () => {
        clearInterval(client.heartbeatTimer);
        clients.delete(client);
      };
    },
    status({ nowMs = Date.now() } = {}) {
      const latestEventAgeMs = lastPublishedAtMs
        ? Math.max(0, nowMs - lastPublishedAtMs)
        : null;
      const status = {
        schema: "iris_overlay_event_stream_status_v1",
        generated_at_ms: nowMs,
        stream_ready: true,
        event_bus_status:
          latestEventAgeMs !== null && latestEventAgeMs > 60_000 ? "stale" : "connected",
        client_count: clients.size,
        published_count: publishedCount,
        latest_event_age_ms: latestEventAgeMs,
        boundary_policy: {
          no_raw_overlay_events: true,
          no_raw_payloads: true,
          no_raw_text: true,
          no_candidates: true,
          no_commands: true,
          read_only_stream_status: true,
        },
        adapter_validation_required: true,
      };
      assertOverlayEventStreamStatusSafe(status);
      return status;
    },
    clientCount() {
      return clients.size;
    },
  };
}

export function assertOverlayEventStreamStatusSafe(
  status,
  context = "overlay event stream status"
) {
  if (!status || typeof status !== "object") {
    throw new ContractError(`${context}: missing status`);
  }
  assertNoForbiddenOverlayEventFields(status, context);
  if (status.schema !== "iris_overlay_event_stream_status_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: status.schema });
  }
  if (status.stream_ready !== true) {
    throw new ContractError(`${context}: stream_ready must be true`);
  }
  for (const field of Object.keys(status)) {
    if (!OVERLAY_EVENT_STREAM_STATUS_ALLOWED_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsupported status field`, { field });
    }
  }
  if (!["connected", "stale"].includes(status.event_bus_status)) {
    throw new ContractError(`${context}: invalid event bus status`, {
      event_bus_status: status.event_bus_status,
    });
  }
  if (!Number.isInteger(status.client_count) || status.client_count < 0) {
    throw new ContractError(`${context}: invalid client count`, {
      client_count: status.client_count,
    });
  }
  if (!Number.isInteger(status.published_count) || status.published_count < 0) {
    throw new ContractError(`${context}: invalid published count`, {
      published_count: status.published_count,
    });
  }
  assertBoundaryPolicy(status.boundary_policy, [
    "no_raw_overlay_events",
    "no_raw_payloads",
    "no_raw_text",
    "no_candidates",
    "no_commands",
    "read_only_stream_status",
  ], context);
  if (status.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
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

function sanitizeLineBreakPlan(lineBreakPlan) {
  if (!Array.isArray(lineBreakPlan)) return [];
  return lineBreakPlan.slice(0, 8).map((segment, index) => ({
    segment_index: Number.isInteger(segment?.segment_index) ? segment.segment_index : index,
    segment_text: cleanDisplayText(segment?.segment_text, 220),
    display_start_ms: Number(segment?.display_start_ms ?? 0),
    display_end_ms: Number(segment?.display_end_ms ?? 0),
    direction: ["ltr", "rtl"].includes(segment?.direction) ? segment.direction : "ltr",
    line_count: Number(segment?.line_count ?? 1),
  }));
}

function writeSseEvent(response, event) {
  response.write("event: iris_overlay_display_event_v1\n");
  response.write(`id: ${event.event_id ?? event.generated_at_ms}\n`);
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function cleanDisplayText(value, maxLength = 240) {
  return redactSensitiveDisplayText(String(value ?? ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function redactSensitiveDisplayText(text) {
  return String(text ?? "")
    .replace(/\bhttps?:\/\/[^\s<>"']+/giu, "[redacted-url]")
    .replace(
      /\b(?:api[_-]?key|oauth[_-]?token|token|authorization|password|secret)\s*[:=]\s*[^\s,;]+/giu,
      "[redacted-secret]"
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/giu, "Bearer [redacted-secret]")
    .replace(
      /\b(?:raw[_-]?memor(?:y|ies)|selected[_-]?memory[_-]?ids|memory[_-]?candidate|relationship[_-]?(?:score|update[_-]?candidate)|input[_-]?action[_-]?candidate|approved[_-]?game[_-]?input[_-]?action|world[_-]?command|command[_-]?payload|command|candidate)\b/giu,
      "[redacted-boundary]"
    );
}

function assertNoForbiddenOverlayEventFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenOverlayEventFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_OVERLAY_EVENT_FIELDS.has(normalizeOverlayEventField(field))) {
      throw new ContractError(`${context}: display event must not expose raw state`, {
        field,
        path,
      });
    }
    assertNoForbiddenOverlayEventFields(child, context, `${path}.${field}`);
  }
}

function normalizeOverlayEventField(field) {
  return String(field ?? "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .toLowerCase();
}
