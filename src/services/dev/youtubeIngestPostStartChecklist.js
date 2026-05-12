import { ContractError } from "../../core/contracts.js";
import {
  assertYouTubeIngestLiveReadinessReportSafe,
  createYouTubeIngestLiveReadinessReport,
} from "./youtubeIngestLiveReadiness.js";

const SCHEMA = "iris_youtube_ingest_post_start_checklist_v1";

const FORBIDDEN_FIELDS = new Set([
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
  "memory_carryover_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "canonical",
  "canonical_envelope",
  "final_text",
  "last_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
  "payload",
  "value",
  "values",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "password",
  "authorization",
  "cursor",
  "page_token",
  "next_page_token",
  "platform_id",
  "platform_user_id",
  "live_chat_id",
  "video_id",
  "amount",
  "currency",
  "command",
]);

const UNSAFE_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|raw_packet|job_payload|cursor|page[_-]?token|live[_-]?chat[_-]?id|video[_-]?id|platform[_-]?id)\b|https?:\/\//i;

const CHECKLIST_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "checklist_status",
  "youtube_live_readiness_status",
  "next_gate_id",
  "next_readiness_state",
  "source_mode",
  "real_poll_executed_by_checklist",
  "network_request_attempted_by_checklist",
  "youtube_api_request_attempted_by_checklist",
  "support_payload_read_by_checklist",
  "candidate_commit_attempted_by_checklist",
  "check_count",
  "ready_check_count",
  "blocked_check_count",
  "checks",
  "verification_scripts",
  "support_event_policy",
  "boundary_policy",
]);

const POST_START_CHECKS = [
  {
    check_id: "source_status_after_start",
    gate_id: "source_gate",
    verification_script: "npm run dev:youtube:source-status",
  },
  {
    check_id: "scheduler_runtime_after_start",
    gate_id: "scheduler_gate",
    verification_script: "npm run dev:youtube:runtime-status",
  },
  {
    check_id: "runtime_ingest_roundtrip_after_start",
    gate_id: "runtime_ingest_gate",
    verification_script: "npm run dev:youtube:runtime-ingest-roundtrip",
  },
  {
    check_id: "support_pipeline_after_start",
    gate_id: "support_pipeline_gate",
    verification_script: "npm run dev:youtube:support-gate-roundtrip",
  },
  {
    check_id: "policy_boundary_after_start",
    gate_id: "policy_boundary",
    verification_script: "npm run dev:youtube:policy-gate-roundtrip",
  },
  {
    check_id: "live_readiness_after_start",
    gate_id: "live_readiness",
    verification_script: "npm run dev:youtube:live-readiness",
  },
];

export function createYouTubeIngestPostStartChecklist({
  env = process.env,
  httpIngestScheduler = null,
  streamState = null,
  generatedAtMs = Date.now(),
} = {}) {
  const liveReadiness = createYouTubeIngestLiveReadinessReport({
    env,
    httpIngestScheduler,
    streamState,
    generatedAtMs,
  });
  assertYouTubeIngestLiveReadinessReportSafe(
    liveReadiness,
    "youtube post-start checklist live readiness"
  );
  const readyForLiveIngest =
    liveReadiness.live_readiness_status === "ready_for_youtube_live_ingest";
  const checks = POST_START_CHECKS.map((check, index) => ({
    schema: "iris_youtube_ingest_post_start_check_v1",
    sequence_order: index + 1,
    check_id: check.check_id,
    gate_id: check.gate_id,
    verification_script: check.verification_script,
    readiness_state: readyForLiveIngest
      ? "operator_run_required"
      : "blocked_before_youtube_ingest_start",
    real_poll_executed_by_checklist: false,
    network_request_attempted_by_checklist: false,
    youtube_api_request_attempted_by_checklist: false,
    support_payload_read_by_checklist: false,
    candidate_commit_attempted_by_checklist: false,
  }));
  const checklist = {
    schema: SCHEMA,
    generated_at_ms: generatedAtMs,
    checklist_status: readyForLiveIngest
      ? "ready_for_operator_post_start_youtube_checks"
      : "blocked_before_youtube_ingest_start",
    youtube_live_readiness_status: liveReadiness.live_readiness_status,
    next_gate_id: liveReadiness.next_gate_id,
    next_readiness_state: liveReadiness.next_readiness_state,
    source_mode: liveReadiness.source_mode,
    real_poll_executed_by_checklist: false,
    network_request_attempted_by_checklist: false,
    youtube_api_request_attempted_by_checklist: false,
    support_payload_read_by_checklist: false,
    candidate_commit_attempted_by_checklist: false,
    check_count: checks.length,
    ready_check_count: checks.filter(
      (check) => check.readiness_state === "operator_run_required"
    ).length,
    blocked_check_count: checks.filter(
      (check) => check.readiness_state !== "operator_run_required"
    ).length,
    checks,
    verification_scripts: {
      schema: "iris_youtube_ingest_post_start_scripts_v1",
      post_start_checklist_script:
        "npm run dev:youtube:post-start-checklist",
      source_status_script: "npm run dev:youtube:source-status",
      runtime_status_script: "npm run dev:youtube:runtime-status",
      runtime_ingest_roundtrip_script:
        "npm run dev:youtube:runtime-ingest-roundtrip",
      support_gate_roundtrip_script:
        "npm run dev:youtube:support-gate-roundtrip",
      policy_gate_roundtrip_script: "npm run dev:youtube:policy-gate-roundtrip",
      live_readiness_script: "npm run dev:youtube:live-readiness",
    },
    support_event_policy: {
      support_messages_not_exposed: true,
      support_amount_values_not_exposed: true,
      donation_reactions_validation_gated: true,
      memory_and_relationship_candidates_not_committed_by_checklist: true,
      status_counts_only: true,
    },
    boundary_policy: createBoundaryPolicy(),
  };
  assertYouTubeIngestPostStartChecklistSafe(checklist);
  return checklist;
}

export function assertYouTubeIngestPostStartChecklistSafe(
  checklist,
  context = "youtube ingest post-start checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist must be an object`);
  }
  if (checklist.schema !== SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(checklist)) {
    if (!CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`, { field });
    }
  }
  if (
    checklist.checklist_status !==
      "ready_for_operator_post_start_youtube_checks" &&
    checklist.checklist_status !== "blocked_before_youtube_ingest_start"
  ) {
    throw new ContractError(`${context}: invalid checklist status`);
  }
  assertSafeObject(checklist, context);
  assertNoUnsafeText(checklist, context);
  assertBoundaryPolicy(checklist.boundary_policy, context);
  for (const flag of [
    "real_poll_executed_by_checklist",
    "network_request_attempted_by_checklist",
    "youtube_api_request_attempted_by_checklist",
    "support_payload_read_by_checklist",
    "candidate_commit_attempted_by_checklist",
  ]) {
    if (checklist[flag] !== false) {
      throw new ContractError(`${context}: ${flag} must be false`);
    }
  }
  assertPostStartChecksSafe(checklist, context);
}

function assertPostStartChecksSafe(checklist, context) {
  if (!Array.isArray(checklist.checks) || checklist.checks.length !== POST_START_CHECKS.length) {
    throw new ContractError(`${context}: invalid checks`);
  }
  checklist.checks.forEach((check, index) => {
    const expected = POST_START_CHECKS[index];
    if (
      !check ||
      typeof check !== "object" ||
      check.schema !== "iris_youtube_ingest_post_start_check_v1" ||
      check.sequence_order !== index + 1 ||
      check.check_id !== expected.check_id ||
      check.gate_id !== expected.gate_id ||
      check.verification_script !== expected.verification_script ||
      !["operator_run_required", "blocked_before_youtube_ingest_start"].includes(
        check.readiness_state
      )
    ) {
      throw new ContractError(`${context}: invalid check`);
    }
  });
  const readyCount = checklist.checks.filter(
    (check) => check.readiness_state === "operator_run_required"
  ).length;
  if (
    checklist.check_count !== checklist.checks.length ||
    checklist.ready_check_count !== readyCount ||
    checklist.blocked_check_count !== checklist.checks.length - readyCount
  ) {
    throw new ContractError(`${context}: invalid check counts`);
  }
}

function createBoundaryPolicy() {
  return {
    read_only_checklist: true,
    script_names_only: true,
    ids_counts_and_fixed_statuses_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_support_message_text: true,
    no_support_amount_values: true,
    no_platform_cursor_values: true,
    no_platform_ids: true,
    no_candidates: true,
    no_commands: true,
    no_real_poll_executed: true,
    no_network_request_attempted: true,
    no_youtube_api_request_attempted: true,
    no_candidate_commit_attempted: true,
  };
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const required = Object.keys(createBoundaryPolicy());
  const allowed = new Set(required);
  for (const key of Object.keys(policy)) {
    if (!allowed.has(key)) {
      throw new ContractError(`${context}: unexpected boundary policy ${key}`);
    }
  }
  for (const key of required) {
    if (policy[key] !== true) {
      throw new ContractError(`${context}: boundary policy ${key} must be true`);
    }
  }
}

function assertSafeObject(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertSafeObject(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe public field ${field}`, { path });
    }
    assertSafeObject(child, context, `${path}.${field}`);
  }
}

function assertNoUnsafeText(value, context) {
  const serialized = JSON.stringify(value);
  if (UNSAFE_TEXT_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: unsafe public text detected`);
  }
}
