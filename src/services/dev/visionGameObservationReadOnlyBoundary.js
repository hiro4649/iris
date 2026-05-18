import { ContractError } from "../../core/contracts.js";
import {
  assertGamePerceptionSafe,
  createGamePerception,
  sanitizeGamePerceptionForPublicState,
} from "../game/gamePerception.js";

const REPORT_FIELDS = new Set([
  "schema",
  "ok",
  "status",
  "external_real_evidence_status",
  "next_readiness_state",
  "production_ready_allowed",
  "go_no_go",
  "observation_input_summary",
  "perception_guard_summary",
  "production_handoff_summary",
  "boundary_policy",
]);

const BOUNDARY_FIELDS = new Set([
  "external_observation_reference_only",
  "game_state_not_source_of_truth",
  "screen_capture_not_source_of_truth",
  "no_memory_commit_from_observation",
  "no_game_input_from_observation",
  "no_world_command_from_observation",
  "control_hint_is_not_command",
  "low_confidence_blocks_assertion",
  "parser_failure_safe_stop",
  "public_summary_only",
  "no_frame_values",
  "no_capture_paths",
  "no_image_bodies",
  "no_private_screen_text",
  "no_endpoint_values",
  "fixture_observation_not_real_ready",
  "production_ready_not_allowed",
]);

const SAFE_READINESS_STATES = new Set([
  "configuration_waiting",
  "operator_review_required",
]);

export function createVisionGameObservationReadOnlyBoundaryReport({
  generatedAtMs = Date.now(),
} = {}) {
  const lowConfidence = createGamePerceptionForFixture({
    caseId: "low_confidence",
    screenConfidence: 0.12,
  });
  const parserFailure = createGamePerceptionForFixture({
    caseId: "parser_failure",
    screenConfidence: 0.82,
    parserStatus: "failed",
  });
  const perceptions = [lowConfidence, parserFailure];
  const publicSummaries = perceptions.map((perception) =>
    sanitizeGamePerceptionForPublicState(perception)
  );
  const publicRawLeakDetected = hasUnsafeValueLeak(publicSummaries);
  const lowConfidenceGuarded =
    lowConfidence.perception_reject_reason === "low_confidence" &&
    lowConfidence.danger_level === "unknown" &&
    lowConfidence.opportunity_score === 0 &&
    lowConfidence.funny_event_score === 0 &&
    lowConfidence.control_hint === "observe_only" &&
    lowConfidence.game_situation_summary.detected_events.length === 0 &&
    lowConfidence.phase22_low_confidence_non_assertion
      ?.low_confidence_blocks_assertive_commentary === true &&
    lowConfidence.phase22_low_confidence_non_assertion
      ?.low_confidence_blocks_memory_or_action_confirmation === true;
  const parserFailureGuarded =
    parserFailure.perception_reject_reason === "parser_failure" &&
    parserFailure.danger_level === "unknown" &&
    parserFailure.opportunity_score === 0 &&
    parserFailure.funny_event_score === 0 &&
    parserFailure.control_hint === "observe_only" &&
    parserFailure.game_situation_summary.player_status === "parser_failure" &&
    parserFailure.game_situation_summary.detected_events.length === 0;
  const report = {
    schema: "iris_vision_game_observation_readonly_boundary_v1",
    ok: false,
    status: "blocked",
    external_real_evidence_status: "external_real_evidence_blocked",
    next_readiness_state: "operator_review_required",
    production_ready_allowed: false,
    go_no_go: "no_go",
    observation_input_summary: {
      schema: "iris_vision_game_observation_readonly_input_summary_v1",
      generated_at_ms: generatedAtMs,
      fixture_observation_count: perceptions.length,
      observation_kind: "external_observation",
      source_trust: "unverified_external_observation",
      screen_capture_status: "fixture_only",
      game_state_status: "reference_only",
      real_capture_evidence_status: "external_real_evidence_blocked",
      parser_failure_case_count: parserFailureGuarded ? 1 : 0,
      low_confidence_case_count: lowConfidenceGuarded ? 1 : 0,
    },
    perception_guard_summary: {
      schema: "iris_vision_game_observation_readonly_guard_summary_v1",
      checked_perception_count: perceptions.length,
      external_observation_reference_only_count: perceptions.filter(
        hasObservationReferenceOnlyBoundary
      ).length,
      low_confidence_non_assertion_count: lowConfidenceGuarded ? 1 : 0,
      parser_failure_safe_stop_count: parserFailureGuarded ? 1 : 0,
      memory_commit_count: 0,
      game_input_count: 0,
      world_command_count: 0,
      control_hint_command_count: 0,
      public_raw_leak_detected: publicRawLeakDetected,
    },
    production_handoff_summary: {
      schema: "iris_vision_game_observation_readonly_handoff_summary_v1",
      fixture_observation_only: true,
      real_capture_not_started: true,
      real_ocr_not_started: true,
      real_vision_model_not_started: true,
      real_game_or_os_input_not_started: true,
      external_observation_not_truth: true,
      memory_commit_not_performed: true,
      game_input_not_performed: true,
      world_command_not_generated: true,
      parser_failure_degrades_safely: parserFailureGuarded,
      low_confidence_blocks_assertion: lowConfidenceGuarded,
      safe_summary_only: true,
      production_ready_allowed: false,
      go_no_go: "no_go",
      next_validation_script:
        "node scripts/dev-vision-game-observation-readonly-boundary.js",
      next_unsafe_fixture_script: "npm run dev:vision:unsafe-roundtrip",
    },
    boundary_policy: {
      external_observation_reference_only: true,
      game_state_not_source_of_truth: true,
      screen_capture_not_source_of_truth: true,
      no_memory_commit_from_observation: true,
      no_game_input_from_observation: true,
      no_world_command_from_observation: true,
      control_hint_is_not_command: true,
      low_confidence_blocks_assertion: true,
      parser_failure_safe_stop: true,
      public_summary_only: true,
      no_frame_values: true,
      no_capture_paths: true,
      no_image_bodies: true,
      no_private_screen_text: true,
      no_endpoint_values: true,
      fixture_observation_not_real_ready: true,
      production_ready_not_allowed: true,
    },
  };
  report.ok =
    report.production_ready_allowed === false &&
    report.go_no_go === "no_go" &&
    publicRawLeakDetected === false &&
    report.perception_guard_summary.external_observation_reference_only_count ===
      perceptions.length &&
    report.perception_guard_summary.low_confidence_non_assertion_count === 1 &&
    report.perception_guard_summary.parser_failure_safe_stop_count === 1 &&
    report.perception_guard_summary.memory_commit_count === 0 &&
    report.perception_guard_summary.game_input_count === 0 &&
    report.perception_guard_summary.world_command_count === 0 &&
    report.perception_guard_summary.control_hint_command_count === 0;
  assertVisionGameObservationReadOnlyBoundaryReportSafe(report);
  return report;
}

export function assertVisionGameObservationReadOnlyBoundaryReportSafe(
  report,
  context = "vision game observation read-only boundary"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  if (report.schema !== "iris_vision_game_observation_readonly_boundary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (
    report.ok !== true ||
    report.status !== "blocked" ||
    report.external_real_evidence_status !== "external_real_evidence_blocked" ||
    report.production_ready_allowed !== false ||
    report.go_no_go !== "no_go"
  ) {
    throw new ContractError(`${context}: no-go invariant mismatch`);
  }
  if (!SAFE_READINESS_STATES.has(report.next_readiness_state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
  assertObservationInputSummarySafe(report.observation_input_summary, context);
  assertPerceptionGuardSummarySafe(report.perception_guard_summary, context);
  assertProductionHandoffSummarySafe(report.production_handoff_summary, context);
  assertBoundaryPolicySafe(report.boundary_policy, context);
  assertNoUnsafeReportLeak(report, context);
}

function createGamePerceptionForFixture({
  caseId,
  screenConfidence,
  parserStatus = "ok",
}) {
  const traceId = `vision_readonly_${caseId}`;
  const eventId = `vision_readonly_event_${caseId}`;
  const event = {
    trace_id: traceId,
    event_id: eventId,
    source: "game_observation",
    payload: { payload_kind: "game_observation" },
  };
  const coreResult = {
    phase01: {
      trace_id: traceId,
      event_id: eventId,
      payload_kind: "game_observation",
      normalized_text: "",
      game_context: {
        game_title: "fixture_game",
        scene_summary: "uncertain game observation summary",
        player_state: "uncertain",
        detected_events: ["unconfirmed_visual_event"],
        screen_confidence: screenConfidence,
        parser_status: parserStatus,
        vision_metadata: {
          source_kind: "fixture_screen_capture",
          frame_age_ms: 42,
          raw_frame_policy: "raw_frame_not_passed_to_core",
        },
      },
    },
    phase15: {
      trace_id: traceId,
      event_id: eventId,
      final_decision: "allow",
    },
  };
  const memoryRecall = {
    schema: "iris_memory_recall_v1",
    trace_id: traceId,
    event_id: eventId,
    internal_profile: true,
    recall_decision: "skip",
    selected_memory_ids: [],
    recall_reference_policy: "read_only_reference",
    recall_phrase_hint: null,
    privacy_filter_result: {
      status: "safe",
      allowed_count: 0,
      blocked_count: 0,
      blocked_memory_ids: [],
      policy: "no_sensitive_or_private_surface_without_guard",
    },
    community_memory_mix: {
      mode: "none",
      community_reference_allowed: false,
      new_viewer_openness_guard_required: true,
      insider_exclusion_allowed: false,
      openness_guard: "keep_context_understandable_for_new_viewers",
      newcomer_explanation_candidate: null,
    },
    recall_reject_reason: "no_memory",
    adapter_validation_required: true,
  };
  const perception = createGamePerception({ event, coreResult, memoryRecall });
  assertGamePerceptionSafe(perception, `vision read-only ${caseId}`);
  return perception;
}

function hasObservationReferenceOnlyBoundary(perception) {
  return (
    perception.phase22_observation_truth_boundary
      ?.external_observation_reference_only === true &&
    perception.phase22_observation_truth_boundary?.not_source_of_truth === true &&
    perception.phase22_observation_truth_boundary
      ?.no_memory_commit_from_observation === true &&
    perception.phase22_observation_truth_boundary
      ?.no_action_decision_from_observation === true &&
    perception.phase22_observation_truth_boundary?.game_state_reference_policy ===
      "reference_only"
  );
}

function assertObservationInputSummarySafe(summary, context) {
  if (
    !summary ||
    summary.schema !== "iris_vision_game_observation_readonly_input_summary_v1"
  ) {
    throw new ContractError(`${context}: input summary required`);
  }
  for (const field of [
    "fixture_observation_count",
    "parser_failure_case_count",
    "low_confidence_case_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid input summary count`, { field });
    }
  }
  const expected = {
    observation_kind: "external_observation",
    source_trust: "unverified_external_observation",
    screen_capture_status: "fixture_only",
    game_state_status: "reference_only",
    real_capture_evidence_status: "external_real_evidence_blocked",
  };
  for (const [field, value] of Object.entries(expected)) {
    if (summary[field] !== value) {
      throw new ContractError(`${context}: input summary mismatch`, { field });
    }
  }
}

function assertPerceptionGuardSummarySafe(summary, context) {
  if (
    !summary ||
    summary.schema !== "iris_vision_game_observation_readonly_guard_summary_v1"
  ) {
    throw new ContractError(`${context}: perception guard summary required`);
  }
  for (const field of [
    "checked_perception_count",
    "external_observation_reference_only_count",
    "low_confidence_non_assertion_count",
    "parser_failure_safe_stop_count",
    "memory_commit_count",
    "game_input_count",
    "world_command_count",
    "control_hint_command_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid guard count`, { field });
    }
  }
  if (
    summary.checked_perception_count !== 2 ||
    summary.external_observation_reference_only_count !== 2 ||
    summary.low_confidence_non_assertion_count !== 1 ||
    summary.parser_failure_safe_stop_count !== 1 ||
    summary.memory_commit_count !== 0 ||
    summary.game_input_count !== 0 ||
    summary.world_command_count !== 0 ||
    summary.control_hint_command_count !== 0 ||
    summary.public_raw_leak_detected !== false
  ) {
    throw new ContractError(`${context}: guard invariant mismatch`);
  }
}

function assertProductionHandoffSummarySafe(summary, context) {
  if (
    !summary ||
    summary.schema !== "iris_vision_game_observation_readonly_handoff_summary_v1"
  ) {
    throw new ContractError(`${context}: production handoff summary required`);
  }
  for (const field of [
    "fixture_observation_only",
    "real_capture_not_started",
    "real_ocr_not_started",
    "real_vision_model_not_started",
    "real_game_or_os_input_not_started",
    "external_observation_not_truth",
    "memory_commit_not_performed",
    "game_input_not_performed",
    "world_command_not_generated",
    "parser_failure_degrades_safely",
    "low_confidence_blocks_assertion",
    "safe_summary_only",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: handoff flag failed`, { field });
    }
  }
  if (
    summary.production_ready_allowed !== false ||
    summary.go_no_go !== "no_go" ||
    summary.next_validation_script !==
      "node scripts/dev-vision-game-observation-readonly-boundary.js" ||
    summary.next_unsafe_fixture_script !== "npm run dev:vision:unsafe-roundtrip"
  ) {
    throw new ContractError(`${context}: handoff no-go mismatch`);
  }
}

function assertBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`, { field });
    }
  }
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary flag failed`, { field });
    }
  }
}

function hasUnsafeValueLeak(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return unsafeStringValue(value);
  if (Array.isArray(value)) return value.some((item) => hasUnsafeValueLeak(item));
  if (typeof value === "object") {
    return Object.values(value).some((item) => hasUnsafeValueLeak(item));
  }
  return false;
}

function assertNoUnsafeReportLeak(report, context) {
  if (hasUnsafeValueLeak(report)) {
    throw new ContractError(`${context}: unsafe value leak detected`);
  }
}

function unsafeStringValue(value) {
  return (
    /https?:\/\//i.test(value) ||
    /\b(token|secret|authorization|api[_-]?key|password)\b/i.test(value) ||
    /\b(raw frame body|raw image body|capture path|private screen text)\b/i.test(
      value
    ) ||
    /\b(world_command|os_command|game_input|commit_memory|direct_memory_write)\b/i.test(
      value
    )
  );
}
