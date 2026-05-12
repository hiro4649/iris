import { appendFileSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertAdapterPacketSafe } from "../adapters/adapterPackets.js";
import { ContractError } from "../core/contracts.js";

const OUTBOX_KINDS = new Set(["tts", "live2d", "subtitle"]);
const FORBIDDEN_OUTBOX_JOB_FIELDS = new Set([
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
  "canonical_envelope",
  "intent",
  "conversation_state",
  "task_type",
  "relation_score",
]);

export function createLocalBridgeOutbox({
  outboxDir = "data/local_bridge_outbox",
  nowMs = () => Date.now(),
} = {}) {
  if (!outboxDir) {
    throw new ContractError("local bridge outbox requires outboxDir");
  }
  const counts = { tts: 0, live2d: 0, subtitle: 0 };
  const last = { tts: null, live2d: null, subtitle: null };

  return {
    writeJob(packet, ack) {
      assertAdapterPacketSafe(packet, "Local bridge outbox packet");
      const job = createOutboxJob(packet, ack, { nowMs: nowMs() });
      assertLocalBridgeOutboxJobSafe(job);
      const kindDir = join(outboxDir, packet.adapter_kind);
      mkdirSync(kindDir, { recursive: true });
      appendFileSync(join(kindDir, "jobs.jsonl"), `${JSON.stringify(job)}\n`, "utf8");
      writeJsonAtomic(join(kindDir, "latest.json"), job);
      counts[packet.adapter_kind] += 1;
      last[packet.adapter_kind] = summarizeOutboxJob(job);
      return last[packet.adapter_kind];
    },
    status() {
      return {
        schema: "iris_local_bridge_outbox_status_v1",
        enabled: true,
        adapters: {
          tts: kindStatus("tts", counts, last),
          live2d: kindStatus("live2d", counts, last),
          subtitle: kindStatus("subtitle", counts, last),
        },
        boundary_policy: {
          counts_and_ids_only: true,
          no_job_payloads: true,
          no_text_payloads: true,
          no_candidates: true,
          no_commands: true,
        },
        adapter_validation_required: true,
      };
    },
  };
}

export function createDisabledLocalBridgeOutboxStatus() {
  return {
    schema: "iris_local_bridge_outbox_status_v1",
    enabled: false,
    adapters: {
      tts: kindStatus("tts"),
      live2d: kindStatus("live2d"),
      subtitle: kindStatus("subtitle"),
    },
    boundary_policy: {
      counts_and_ids_only: true,
      no_job_payloads: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
}

export function assertLocalBridgeOutboxJobSafe(job, context = "local bridge outbox job") {
  if (!job || typeof job !== "object") {
    throw new ContractError(`${context}: missing job`);
  }
  assertNoForbiddenOutboxFields(job, context);
  if (!OUTBOX_KINDS.has(job.adapter_kind)) {
    throw new ContractError(`${context}: unsupported adapter kind`, {
      adapter_kind: job.adapter_kind,
    });
  }
  if (job.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (job.adapter_kind === "tts" && !Array.isArray(job.mouth_timing)) {
    throw new ContractError(`${context}: TTS mouth timing is required`);
  }
  if (job.adapter_kind === "subtitle" && !Array.isArray(job.line_break_plan)) {
    throw new ContractError(`${context}: subtitle line break plan is required`);
  }
  assertBoundaryPolicy(job.boundary_policy, [
    "validated_adapter_packet",
    "no_candidates",
    "no_commands",
    "engine_consumable_payload",
    "local_bridge_internal_payload",
  ], context);
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

function createOutboxJob(packet, ack, { nowMs }) {
  const jobId = `job-${packet.adapter_kind}-${safeId(packet.event_id)}-${nowMs}`;
  const base = {
    schema: `iris_${packet.adapter_kind}_bridge_job_v1`,
    job_id: jobId,
    job_id_present: safeText(jobId, 220) !== "",
    adapter_kind: packet.adapter_kind,
    trace_id: safeText(packet.trace_id, 160),
    event_id: safeText(packet.event_id, 160),
    event_id_present: safeText(packet.event_id, 160) !== "",
    created_at_ms: nowMs,
    expected_ack_request_id: safeText(ack?.request_id, 180),
    boundary_policy: {
      validated_adapter_packet: true,
      no_candidates: true,
      no_commands: true,
      engine_consumable_payload: true,
      local_bridge_internal_payload: true,
    },
    adapter_validation_required: true,
  };
  if (packet.adapter_kind === "tts") {
    return {
      ...base,
      text: safeText(packet.text ?? packet.final_text, 2_000),
      language: safeText(packet.language_profile?.response_language, 32),
      script_direction: safeText(packet.subtitle_cue?.script_direction, 16),
      prosody_style: safeText(packet.speech_cue?.prosody_style, 80),
      speech_rate: safeText(packet.speech_rate_profile?.base_rate, 80),
      estimated_duration_ms: safeOptionalNumber(packet.speech_cue?.estimated_duration_ms),
      mouth_timing: summarizeMouthTiming(packet.performance_plan?.tracks?.mouth),
      voice_expression: {
        profile_id: safeText(packet.expression_profile?.expression_profile_id, 120),
        laughter_state: safeText(packet.affective_continuity?.laughter_state, 80),
        autonomous_state_id: safeText(packet.autonomous_expression?.autonomous_state_id, 120),
      },
    };
  }
  if (packet.adapter_kind === "live2d") {
    return {
      ...base,
      motion_style: safeText(packet.motion_cue?.motion_style, 80),
      motion_intensity: safeText(packet.motion_cue?.motion_intensity, 80),
      body_state_id: safeText(packet.body_continuity?.body_state_id, 120),
      camera_proximity_profile: safeText(
        packet.camera_proximity?.camera_proximity_profile,
        120
      ),
      expression_profile_id: safeText(packet.expression_profile?.expression_profile_id, 120),
      autonomous_state_id: safeText(packet.autonomous_expression?.autonomous_state_id, 120),
      timing: {
        total_duration_ms: safeOptionalNumber(packet.performance_plan?.total_duration_ms),
        sync_mode: safeText(packet.performance_plan?.sync_mode, 80),
      },
      tracks: {
        expression: summarizeTrack(packet.performance_plan?.tracks?.expression),
        motion: summarizeTrack(packet.performance_plan?.tracks?.motion),
        breath: summarizeTrack(packet.performance_plan?.tracks?.breath),
      },
    };
  }
  return {
    ...base,
    subtitle_text: safeText(packet.subtitle_text, 2_000),
    subtitle_language: safeText(packet.subtitle_language, 32),
    script_direction: safeText(packet.script_direction, 16),
    display_start_ms: safeOptionalNumber(packet.display_start_ms),
    display_end_ms: safeOptionalNumber(packet.display_end_ms),
    line_break_plan: Array.isArray(packet.line_break_plan)
      ? packet.line_break_plan.slice(0, 4).map((line) => safeSubtitleLineText(line))
      : [],
    safe_area_policy: {
      anchor: safeText(packet.safe_area_policy?.anchor, 80),
      max_width_percent: safeOptionalNumber(packet.safe_area_policy?.max_width_percent),
      bottom_percent: safeOptionalNumber(packet.safe_area_policy?.bottom_percent),
    },
    reading_speed_guard: {
      guard_status: safeText(packet.reading_speed_guard?.guard_status, 80),
      chars_per_second: safeOptionalNumber(packet.reading_speed_guard?.chars_per_second),
    },
  };
}

function summarizeOutboxJob(job) {
  const payloadAvailable =
    (job.adapter_kind === "tts" && safeText(job.text, 2_000) !== "") ||
    (job.adapter_kind === "live2d" &&
      (safeText(job.motion_style, 80) !== "" ||
        safeText(job.expression_profile_id, 120) !== "" ||
        safeText(job.body_state_id, 120) !== "")) ||
    (job.adapter_kind === "subtitle" && safeText(job.subtitle_text, 2_000) !== "");
  return {
    schema: "iris_local_bridge_outbox_job_summary_v1",
    adapter_kind: job.adapter_kind,
    job_id: safeText(job.job_id, 220),
    job_id_present: safeText(job.job_id, 220) !== "",
    event_id: safeText(job.event_id, 160),
    event_id_present: safeText(job.event_id, 160) !== "",
    created_at_ms: job.created_at_ms,
    payload_available: payloadAvailable,
    adapter_validation_required: true,
  };
}

function kindStatus(kind, counts = {}, last = {}) {
  const jobCount = Number(counts[kind] ?? 0);
  const lastJobIdPresent = safeText(last[kind]?.job_id, 220) !== "";
  return {
    adapter_kind: kind,
    job_count: jobCount,
    last_job_id_present: lastJobIdPresent,
    last_event_id: safeText(last[kind]?.event_id, 160),
    last_event_id_present: safeText(last[kind]?.event_id, 160) !== "",
    payload_available: jobCount > 0 && lastJobIdPresent,
  };
}

function summarizeMouthTiming(track) {
  if (!Array.isArray(track)) return [];
  return track.slice(0, 48).map((item, index) => ({
    at_ms: safeOptionalNumber(item.start_ms ?? index * 80),
    shape: safeText(item.mouth_shape ?? item.kind ?? "neutral", 32),
  }));
}

function summarizeTrack(track) {
  if (!Array.isArray(track)) return [];
  return track.slice(0, 24).map((item) => ({
    start_ms: safeOptionalNumber(item.start_ms),
    end_ms: safeOptionalNumber(item.end_ms),
    kind: safeText(item.kind ?? item.motion_style ?? item.expression ?? "cue", 80),
  }));
}

function safeSubtitleLineText(line) {
  if (line && typeof line === "object") {
    return safeText(line.segment_text ?? line.text ?? line.subtitle_text, 120);
  }
  return safeText(line, 120);
}

function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(tempPath, filePath);
}

function assertNoForbiddenOutboxFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenOutboxFields(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_OUTBOX_JOB_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe outbox field`, { field, path });
    }
    assertNoForbiddenOutboxFields(child, context, `${path}.${field}`);
  }
}

function safeOptionalNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}

function safeId(value) {
  const text = safeText(value || "event", 80).replace(/[^a-zA-Z0-9_-]/g, "-");
  return text || "event";
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
