import {
  ContractError,
  assertCandidateNotExecutable,
  assertNoWorldCommand,
} from "../../core/contracts.js";
import { assertGamePerceptionSafe } from "./gamePerception.js";
import { assertGamePlayerSafe } from "./gamePlayer.js";

const VALIDATION_STATUSES = new Set(["disabled", "not_created", "approved", "rejected"]);
const ACTION_KINDS = new Set(["wait", "move_axis", "press_key", "click", "open_menu", "select_item"]);
const GAME_CONTROL_MODES = new Set(["manual_approval", "approved_safe_adapter"]);
const APPROVED_ACTION_MAX_AGE_MS = 1000;
const OBSERVATION_FRESHNESS_STATUSES = new Set([
  "fresh",
  "not_reported",
  "freshness_not_enforced",
]);
const OBSERVATION_VALIDATION_FRESHNESS_STATUSES = new Set([
  ...OBSERVATION_FRESHNESS_STATUSES,
  "stale",
  "future_clock_skew",
]);
const SAFE_KEY_HINTS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrow_up",
  "arrow_down",
  "arrow_left",
  "arrow_right",
  "space",
  "space_bar",
  "jump",
  "interact",
  "use",
  "confirm",
  "cancel",
  "attack",
  "block",
  "sprint",
  "crouch",
  "inventory",
  "map",
  "hotbar_1",
  "hotbar_2",
  "hotbar_3",
  "hotbar_4",
  "hotbar_5",
  "hotbar_6",
  "hotbar_7",
  "hotbar_8",
  "hotbar_9",
  "ability_1",
  "ability_2",
  "ability_3",
  "ability_4",
]);
const REJECT_REASONS = new Set([
  "validator_disabled",
  "no_candidate",
  "unsafe_candidate",
  "safety_stop",
  "low_confidence",
  "unsupported_action",
  "action_unavailable",
  "viewer_direct_source",
  "high_risk",
  "stale_observation",
  "future_observation",
  "invalid_schema",
  "action_rate_limited",
]);
const GAME_ACTION_VALIDATION_BOUNDARY_POLICY = {
  raw_candidate_exposed: false,
  validator_required_before_game_adapter: true,
  candidate_approved_schema_separated: true,
  approved_schema_only: true,
  game_adapter_accepts_approved_only: true,
  direct_os_input_allowed: false,
  non_game_adapters_receive_game_action: false,
  rate_limit_before_game_adapter: true,
  fresh_observation_required: true,
  observation_summary_only: true,
};
const GAME_OBSERVATION_VALIDATION_BOUNDARY_POLICY = {
  timestamps_and_counts_only: true,
  no_raw_frames: true,
  no_ocr_text: true,
  no_candidate_payloads: true,
  no_approved_action_payload: true,
};
const GAME_ACTION_VALIDATION_FIXTURE_SUMMARY_FIELDS = new Set([
  "schema",
  "fixture_status",
  "validation_status",
  "approved_count",
  "rejected_count",
  "boundary_policy",
]);

const FORBIDDEN_VALIDATION_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "relationship_update_candidate",
  "memory_candidate",
  "relationship_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "os_command",
  "key_press",
  "click_payload",
  "raw_command",
  "command_payload",
  "approved_game_input_action",
  "approved_memory_record",
  "approved_relationship_record",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
]);

const FORBIDDEN_APPROVED_ACTION_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "relationship_update_candidate",
  "memory_candidate",
  "relationship_candidate",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "os_command",
  "key_press",
  "click_payload",
  "raw_command",
  "command_payload",
  "approved_memory_record",
  "approved_relationship_record",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
]);
const UNSAFE_ACTION_HINT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|token|secret|password|authorization)\b|alt\s*\+\s*f4|ctrl\s*\+\s*alt\s*\+\s*del|cmd\s*\+\s*q|command\s*\+\s*q|win\s*\+\s*[a-z]|shutdown|powershell|terminal/i;

export function listSafeGamePressKeyHints() {
  return [...SAFE_KEY_HINTS];
}

export function validateGameActionCandidate({
  event,
  coreResult,
  gamePlayer,
  gamePerception,
  enableGameControl = false,
  gameControlMode = "manual_approval",
  manualApprovalConfirmed = false,
  manualApprovalAuditOk = false,
  approvedSafeAdapterConfirmation = false,
  approvedSafeAdapterReady = false,
  approvedSafeAdapterAuditOk = false,
  approvedSafeAdapterCooldownOk = false,
  availableGameActions = [],
  lastApprovedActionAtMs = null,
  minActionIntervalMs = 0,
  maxObservationAgeMs = 5000,
  nowMs = Date.now(),
} = {}) {
  assertNoWorldCommand(event, "Game action validator event input");
  assertNoWorldCommand(coreResult, "Game action validator core input");
  assertGamePlayerSafe(gamePlayer, "Game action validator player input");
  assertGamePerceptionSafe(gamePerception, "Game action validator perception input");

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const traceId = phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? gamePlayer.trace_id ?? null;
  const eventId = phase15.event_id ?? phase01.event_id ?? event?.event_id ?? gamePlayer.event_id ?? null;
  const base = {
    trace_id: traceId,
    trace_id_present: safeText(traceId, 160) !== "",
    event_id: eventId,
    event_id_present: safeText(eventId, 160) !== "",
    validated_at_ms: nowMs,
  };
  const observation_validation_summary = buildObservationValidationSummary({
    gamePerception,
    maxObservationAgeMs,
  });
  const game_control_mode_policy = buildGameControlModePolicy({
    gameControlMode,
    manualApprovalConfirmed,
    manualApprovalAuditOk,
    approvedSafeAdapterConfirmation,
    approvedSafeAdapterReady,
    approvedSafeAdapterAuditOk,
    approvedSafeAdapterCooldownOk,
  });

  if (enableGameControl !== true || game_control_mode_policy.mode_switch_allowed !== true) {
    return buildValidationResult({
      ...base,
      validation_status: "disabled",
      observation_validation_summary,
      game_control_mode_policy,
      rejected_candidates: [
        createReject({
          ...base,
          source_candidate_kind: "input_action_candidate",
          reason: "validator_disabled",
        }),
      ],
      approved_game_input_action: null,
    });
  }

  const candidate = gamePlayer.input_action_candidate;
  if (!candidate) {
    return buildValidationResult({
      ...base,
      validation_status: "not_created",
      observation_validation_summary,
      game_control_mode_policy,
      rejected_candidates: [
        createReject({
          ...base,
          source_candidate_kind: "none",
          reason: "no_candidate",
        }),
      ],
      approved_game_input_action: null,
    });
  }

  const rejection = rejectReasonForCandidate({
    candidate,
    gamePlayer,
    gamePerception,
    availableGameActions,
    maxObservationAgeMs,
  });
  if (rejection) {
    return buildValidationResult({
      ...base,
      validation_status: "rejected",
      observation_validation_summary,
      game_control_mode_policy,
      rejected_candidates: [
        createReject({
          ...base,
          source_candidate_kind: candidate.candidate_kind ?? "unknown",
          reason: rejection,
        }),
      ],
      approved_game_input_action: null,
    });
  }
  const rateLimitRejection = rejectReasonForActionRateLimit({
    lastApprovedActionAtMs,
    minActionIntervalMs,
    nowMs,
  });
  if (rateLimitRejection) {
    return buildValidationResult({
      ...base,
      validation_status: "rejected",
      observation_validation_summary,
      game_control_mode_policy,
      rejected_candidates: [
        createReject({
          ...base,
          source_candidate_kind: candidate.candidate_kind ?? "unknown",
          reason: rateLimitRejection,
        }),
      ],
      approved_game_input_action: null,
    });
  }

  const approved_game_input_action = {
    schema: "approved_game_input_action",
    approved: true,
    trace_id: candidate.trace_id ?? base.trace_id,
    trace_id_present: safeText(candidate.trace_id ?? base.trace_id, 160) !== "",
    event_id: candidate.event_id ?? base.event_id,
    event_id_present: safeText(candidate.event_id ?? base.event_id, 160) !== "",
    game_title: candidate.game_title ?? "unknown_game",
    action_kind: candidate.action_kind,
    parameters: sanitizeActionParameters(candidate.action_kind, candidate.parameters),
    adapter_target_hint: gamePlayer.adapter_target_hint,
    validation_route: "game_action_validator_v1",
    safety_policy: "approved_schema_only_no_os_direct_input",
    source_policy: "model_decision_not_viewer_direct",
    observation_context: buildApprovedObservationContext({
      gamePerception,
      maxObservationAgeMs,
    }),
    approved_at_ms: nowMs,
    expires_at_ms:
      nowMs +
      approvedActionTtlMs({
        gamePerception,
        maxObservationAgeMs,
      }),
    action_expiry_policy: {
      max_age_ms: APPROVED_ACTION_MAX_AGE_MS,
      adapter_must_reject_after_expiry: true,
    },
    adapter_validation_required: true,
  };
  assertApprovedGameInputActionSafe(
    approved_game_input_action,
    "Game action validator approved action"
  );

  return buildValidationResult({
    ...base,
    validation_status: "approved",
    observation_validation_summary,
    game_control_mode_policy,
    rejected_candidates: [],
    approved_game_input_action,
  });
}

export function assertGameActionValidationSafe(
  validation,
  context = "game action validation"
) {
  if (!validation || typeof validation !== "object") {
    throw new ContractError(`${context}: missing validation result`);
  }
  assertNoWorldCommand(validation, context);
  assertNoForbiddenValidationFields(validation, context);
  if (validation.schema !== "iris_game_action_validation_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: validation.schema });
  }
  if (validation.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (validation.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!VALIDATION_STATUSES.has(validation.validation_status)) {
    throw new ContractError(`${context}: invalid validation status`, {
      validation_status: validation.validation_status,
    });
  }
  if (validation.approved_game_action_present === true) {
    if (validation.validation_status !== "approved") {
      throw new ContractError(`${context}: approved action requires approved status`);
    }
    assertApprovedGameInputActionSafe(
      validation.approved_game_input_action,
      `${context} approved action`
    );
  }
  assertObservationValidationSummarySafe(
    validation.observation_validation_summary,
    `${context} observation validation summary`
  );
  assertGameControlModePolicySafe(validation.game_control_mode_policy, context);
  if (!Array.isArray(validation.rejected_candidates)) {
    throw new ContractError(`${context}: rejected candidates are required`);
  }
  for (const rejected of validation.rejected_candidates) {
    if (!REJECT_REASONS.has(rejected.reason)) {
      throw new ContractError(`${context}: invalid reject reason`, { reason: rejected.reason });
    }
  }
  assertExactBoundaryPolicy(
    validation.boundary_policy,
    GAME_ACTION_VALIDATION_BOUNDARY_POLICY,
    context
  );
  if (validation.boundary_policy.raw_candidate_exposed !== false) {
    throw new ContractError(`${context}: raw candidate exposure must be false`);
  }
  if (validation.boundary_policy.validator_required_before_game_adapter !== true) {
    throw new ContractError(`${context}: validator boundary policy is missing`);
  }
  if (validation.boundary_policy.approved_schema_only !== true) {
    throw new ContractError(`${context}: approved schema boundary policy is missing`);
  }
  if (validation.boundary_policy.candidate_approved_schema_separated !== true) {
    throw new ContractError(`${context}: candidate and approved schemas must remain separated`);
  }
  if (validation.boundary_policy.game_adapter_accepts_approved_only !== true) {
    throw new ContractError(`${context}: game adapter must accept approved action only`);
  }
  if (validation.boundary_policy.direct_os_input_allowed !== false) {
    throw new ContractError(`${context}: direct OS input boundary must be false`);
  }
  if (validation.boundary_policy.non_game_adapters_receive_game_action !== false) {
    throw new ContractError(`${context}: non-game adapter boundary must be false`);
  }
  if (validation.boundary_policy.rate_limit_before_game_adapter !== true) {
    throw new ContractError(`${context}: rate-limit boundary policy is missing`);
  }
  if (validation.boundary_policy.fresh_observation_required !== true) {
    throw new ContractError(`${context}: fresh observation boundary policy is missing`);
  }
  if (validation.boundary_policy.observation_summary_only !== true) {
    throw new ContractError(`${context}: observation summary boundary policy is missing`);
  }
}

export function assertApprovedGameInputActionSafe(
  approvedAction,
  context = "approved game input action"
) {
  if (!approvedAction || typeof approvedAction !== "object") {
    throw new ContractError(`${context}: missing approved action`);
  }
  assertNoWorldCommand(approvedAction, context);
  assertNoForbiddenApprovedActionFields(approvedAction, context);
  if (approvedAction.schema !== "approved_game_input_action" || approvedAction.approved !== true) {
    throw new ContractError(`${context}: invalid approved action schema`, {
      schema: approvedAction.schema,
      approved: approvedAction.approved,
    });
  }
  if (approvedAction.schema === "iris_input_action_candidate_v1") {
    throw new ContractError(`${context}: approved action must not reuse candidate schema`);
  }
  if (!ACTION_KINDS.has(approvedAction.action_kind)) {
    throw new ContractError(`${context}: unsupported action kind`, {
      action_kind: approvedAction.action_kind,
    });
  }
  if (approvedAction.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  assertApprovedActionExpirySafe(approvedAction, context);
  if (approvedAction.validation_route !== "game_action_validator_v1") {
    throw new ContractError(`${context}: invalid validation route`, {
      validation_route: approvedAction.validation_route,
    });
  }
  if (approvedAction.safety_policy !== "approved_schema_only_no_os_direct_input") {
    throw new ContractError(`${context}: invalid safety policy`, {
      safety_policy: approvedAction.safety_policy,
    });
  }
  if (approvedAction.source_policy !== "model_decision_not_viewer_direct") {
    throw new ContractError(`${context}: invalid source policy`, {
      source_policy: approvedAction.source_policy,
    });
  }
  assertApprovedObservationContextSafe(approvedAction.observation_context, context);
  if (Object.prototype.hasOwnProperty.call(approvedAction, "requires_validation")) {
    throw new ContractError(`${context}: approved action must not keep candidate flags`);
  }
  if (Object.prototype.hasOwnProperty.call(approvedAction, "candidate_kind")) {
    throw new ContractError(`${context}: approved action must not keep candidate kind`);
  }
  if (Object.prototype.hasOwnProperty.call(approvedAction, "source_candidate_payload")) {
    throw new ContractError(`${context}: approved action must not carry source candidate payload`);
  }
  sanitizeActionParameters(approvedAction.action_kind, approvedAction.parameters);
}

export function isApprovedGameInputActionExpired(approvedAction, { nowMs = () => Date.now() } = {}) {
  assertApprovedGameInputActionSafe(approvedAction, "Approved game action expiry check");
  const expiresAtMs = Number(approvedAction.expires_at_ms);
  if (!Number.isFinite(expiresAtMs)) return false;
  return nowMs() > expiresAtMs;
}

export function sanitizeGameActionValidationForPublicState(validation) {
  if (!validation) return null;
  assertGameActionValidationSafe(validation, "Game action validation public summary");
  return {
    schema: validation.schema,
    trace_id_present: safeText(validation.trace_id, 160) !== "",
    event_id_present: safeText(validation.event_id, 160) !== "",
    internal_profile: true,
    validation_status: validation.validation_status,
    approved_game_action_kind: validation.approved_game_input_action?.action_kind ?? null,
    approved_game_action_available:
      validation.validation_status === "approved" &&
      validation.approved_game_input_action?.approved === true,
    approved_observation_context_summary: sanitizeApprovedObservationContextForPublicState(
      validation.approved_game_input_action?.observation_context ?? null
    ),
    observation_validation_summary: validation.observation_validation_summary,
    game_control_mode: validation.game_control_mode_policy.mode,
    game_control_mode_policy: validation.game_control_mode_policy,
    rejected_candidate_count: validation.rejected_candidates.length,
    rejected_reasons: [...new Set(validation.rejected_candidates.map((item) => item.reason))],
    boundary_policy: {
      ...GAME_ACTION_VALIDATION_BOUNDARY_POLICY,
      no_platform_ids: true,
      no_observation_ids: true,
      no_approved_action_payload: true,
    },
    adapter_validation_required: true,
  };
}

export function createGameActionValidationFixtureSummary(validation) {
  assertGameActionValidationSafe(validation, "Game action validation fixture summary source");
  const summary = {
    schema: "iris_game_action_validation_fixture_summary_v1",
    fixture_status: validation.validation_status === "approved" ? "approved" : "rejected",
    validation_status: validation.validation_status,
    approved_count: validation.approved_game_action_present === true ? 1 : 0,
    rejected_count: validation.rejected_candidates.length,
    boundary_policy: {
      status_counts_only: true,
      source_proposal_payload_excluded: true,
      no_approved_action_payload: true,
      public_proposal_payload_excluded: true,
    },
  };
  assertGameActionValidationFixtureSummarySafe(summary);
  return summary;
}

export function assertGameActionValidationFixtureSummarySafe(
  summary,
  context = "game action validation fixture summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary must be an object`);
  }
  for (const field of Object.keys(summary)) {
    if (!GAME_ACTION_VALIDATION_FIXTURE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (summary.schema !== "iris_game_action_validation_fixture_summary_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: summary.schema });
  }
  if (!["approved", "rejected"].includes(summary.fixture_status)) {
    throw new ContractError(`${context}: invalid fixture status`, {
      fixture_status: summary.fixture_status,
    });
  }
  if (!VALIDATION_STATUSES.has(summary.validation_status)) {
    throw new ContractError(`${context}: invalid validation status`, {
      validation_status: summary.validation_status,
    });
  }
  for (const field of ["approved_count", "rejected_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid count`, { field });
    }
  }
  for (const field of [
    "status_counts_only",
    "source_proposal_payload_excluded",
    "no_approved_action_payload",
    "public_proposal_payload_excluded",
  ]) {
    if (summary.boundary_policy?.[field] !== true) {
      throw new ContractError(`${context}: missing boundary`, { field });
    }
  }
  assertNoUnsafeFixtureSummaryMaterial(summary, context);
}

function sanitizeApprovedObservationContextForPublicState(context) {
  if (!context) return null;
  assertApprovedObservationContextSafe(context, "Approved game observation public summary");
  return {
    schema: context.schema,
    game_observation_id_present: safeText(context.game_observation_id, 160) !== "",
    perception_confidence: context.perception_confidence,
    frame_age_ms: context.frame_age_ms,
    max_observation_age_ms: context.max_observation_age_ms,
    freshness_status: context.freshness_status,
    stale_observation_rejected_before_adapter:
      context.stale_observation_rejected_before_adapter,
    raw_frame_available: false,
    boundary_policy: {
      timestamps_and_counts_only: true,
      no_observation_ids: true,
      no_raw_frames: true,
      no_ocr_text: true,
      no_candidate_payloads: true,
      no_approved_action_payload: true,
    },
  };
}

function rejectReasonForCandidate({
  candidate,
  gamePlayer,
  gamePerception,
  availableGameActions,
  maxObservationAgeMs,
}) {
  try {
    assertCandidateNotExecutable(candidate, "Game action validator candidate");
  } catch {
    return "unsafe_candidate";
  }
  if (candidate.schema !== "iris_input_action_candidate_v1") return "invalid_schema";
  if (candidate.candidate_kind !== "input_action_candidate") return "invalid_schema";
  if (candidate.adapter_validation_required !== true) return "invalid_schema";
  if (gamePlayer.safety_stop_result?.status !== "allow_candidate") return "safety_stop";
  if (gamePerception.perception_confidence < 0.25) return "low_confidence";
  if (hasFutureObservationClockSkew(gamePerception)) return "future_observation";
  if (isObservationStale(gamePerception, maxObservationAgeMs)) return "stale_observation";
  if (candidate.source_policy !== "model_decision_not_viewer_direct") {
    return "viewer_direct_source";
  }
  if (candidate.risk_level === "high") return "high_risk";
  if (!ACTION_KINDS.has(candidate.action_kind)) return "unsupported_action";
  const allowedActions = normalizeAllowedActions(availableGameActions);
  if (!allowedActions.has(candidate.action_kind)) return "action_unavailable";
  try {
    sanitizeActionParameters(candidate.action_kind, candidate.parameters);
  } catch {
    return "unsafe_candidate";
  }
  return null;
}

function isObservationStale(gamePerception, maxObservationAgeMs) {
  const maxAge = clampInteger(maxObservationAgeMs, 0, 24 * 3_600_000, 5000);
  if (maxAge <= 0) return false;
  const frameAge = rawObservationFrameAge(gamePerception);
  return Number.isFinite(frameAge) && frameAge > maxAge;
}

function hasFutureObservationClockSkew(gamePerception) {
  const frameAge = rawObservationFrameAge(gamePerception);
  return Number.isFinite(frameAge) && frameAge < 0;
}

function buildApprovedObservationContext({ gamePerception, maxObservationAgeMs }) {
  const maxAge = clampInteger(maxObservationAgeMs, 0, 24 * 3_600_000, 5000);
  const frameAge = safeNonNegativeNumber(
    gamePerception?.game_situation_summary?.vision_context?.frame_age_ms
  );
  return {
    schema: "iris_approved_game_observation_context_v1",
    game_observation_id: safeText(gamePerception?.game_observation_id, 160),
    game_observation_id_present: safeText(gamePerception?.game_observation_id, 160) !== "",
    perception_confidence: clamp01(Number(gamePerception?.perception_confidence ?? 0)),
    frame_age_ms: frameAge,
    max_observation_age_ms: maxAge,
    freshness_status:
      maxAge <= 0 ? "freshness_not_enforced" : frameAge === null ? "not_reported" : "fresh",
    stale_observation_rejected_before_adapter: true,
    raw_frame_available: false,
  };
}

function approvedActionTtlMs({ gamePerception, maxObservationAgeMs }) {
  const maxAge = clampInteger(maxObservationAgeMs, 0, 24 * 3_600_000, 5000);
  const frameAge = safeNonNegativeNumber(
    gamePerception?.game_situation_summary?.vision_context?.frame_age_ms
  );
  if (maxAge <= 0 || frameAge === null) return APPROVED_ACTION_MAX_AGE_MS;
  const remainingFreshnessMs = Math.max(0, maxAge - frameAge);
  return Math.min(APPROVED_ACTION_MAX_AGE_MS, remainingFreshnessMs);
}

function assertApprovedActionExpirySafe(approvedAction, context) {
  if (approvedAction.expires_at_ms === undefined || approvedAction.expires_at_ms === null) {
    return;
  }
  const approvedAtMs = Number(approvedAction.approved_at_ms);
  const expiresAtMs = Number(approvedAction.expires_at_ms);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < 0) {
    throw new ContractError(`${context}: approved action expiry is invalid`, {
      expires_at_ms: approvedAction.expires_at_ms,
    });
  }
  if (Number.isFinite(approvedAtMs) && expiresAtMs < approvedAtMs) {
    throw new ContractError(`${context}: approved action expiry precedes approval`);
  }
  if (
    approvedAction.action_expiry_policy &&
    approvedAction.action_expiry_policy.adapter_must_reject_after_expiry !== true
  ) {
    throw new ContractError(`${context}: approved action expiry policy is unsafe`);
  }
}

function buildObservationValidationSummary({ gamePerception, maxObservationAgeMs }) {
  const maxAge = clampInteger(maxObservationAgeMs, 0, 24 * 3_600_000, 5000);
  const signedFrameAge = rawObservationFrameAge(gamePerception);
  const frameAge =
    Number.isFinite(signedFrameAge) && signedFrameAge >= 0
      ? Number(signedFrameAge.toFixed(4))
      : null;
  const confidence = clamp01(Number(gamePerception?.perception_confidence ?? 0));
  const freshness_status =
    Number.isFinite(signedFrameAge) && signedFrameAge < 0
      ? "future_clock_skew"
      : maxAge <= 0
      ? "freshness_not_enforced"
      : frameAge === null
        ? "not_reported"
        : frameAge > maxAge
          ? "stale"
          : "fresh";
  return {
    schema: "iris_game_observation_validation_summary_v1",
    perception_confidence: confidence,
    frame_age_ms: frameAge,
    max_observation_age_ms: maxAge,
    freshness_status,
    stale_observation_rejected_before_adapter: freshness_status === "stale",
    future_observation_rejected_before_adapter:
      freshness_status === "future_clock_skew",
    low_confidence_rejected_before_adapter: confidence < 0.25,
    raw_frame_available: false,
    boundary_policy: { ...GAME_OBSERVATION_VALIDATION_BOUNDARY_POLICY },
  };
}

function assertApprovedObservationContextSafe(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: approved action missing observation context`);
  }
  assertNoForbiddenApprovedActionFields(value, `${context} observation context`);
  if (value.schema !== "iris_approved_game_observation_context_v1") {
    throw new ContractError(`${context}: invalid observation context schema`, {
      schema: value.schema,
    });
  }
  if (!OBSERVATION_FRESHNESS_STATUSES.has(value.freshness_status)) {
    throw new ContractError(`${context}: invalid observation freshness status`, {
      freshness_status: value.freshness_status,
    });
  }
  if (
    typeof value.perception_confidence !== "number" ||
    Number.isNaN(value.perception_confidence) ||
    value.perception_confidence < 0 ||
    value.perception_confidence > 1
  ) {
    throw new ContractError(`${context}: observation confidence out of range`, {
      perception_confidence: value.perception_confidence,
    });
  }
  if (
    value.frame_age_ms !== null &&
    (typeof value.frame_age_ms !== "number" ||
      Number.isNaN(value.frame_age_ms) ||
      value.frame_age_ms < 0)
  ) {
    throw new ContractError(`${context}: observation frame age out of range`, {
      frame_age_ms: value.frame_age_ms,
    });
  }
  const maxAge = Number(value.max_observation_age_ms);
  if (!Number.isFinite(maxAge) || maxAge < 0) {
    throw new ContractError(`${context}: observation max age out of range`, {
      max_observation_age_ms: value.max_observation_age_ms,
    });
  }
  if (value.freshness_status === "fresh" && value.frame_age_ms === null) {
    throw new ContractError(`${context}: fresh observation requires frame age`);
  }
  if (
    value.freshness_status === "fresh" &&
    maxAge > 0 &&
    Number(value.frame_age_ms) > maxAge
  ) {
    throw new ContractError(`${context}: fresh observation context is stale`);
  }
  if (value.freshness_status === "not_reported" && value.frame_age_ms !== null) {
    throw new ContractError(`${context}: not_reported observation must not include frame age`);
  }
  if (value.freshness_status === "freshness_not_enforced" && maxAge > 0) {
    throw new ContractError(`${context}: unenforced freshness requires zero max age`);
  }
  if (value.stale_observation_rejected_before_adapter !== true) {
    throw new ContractError(`${context}: stale observation rejection policy required`);
  }
  if (value.raw_frame_available !== false) {
    throw new ContractError(`${context}: approved action must not expose raw frames`);
  }
}

function assertObservationValidationSummarySafe(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: missing observation validation summary`);
  }
  assertNoForbiddenValidationFields(value, context);
  if (value.schema !== "iris_game_observation_validation_summary_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: value.schema });
  }
  if (!OBSERVATION_VALIDATION_FRESHNESS_STATUSES.has(value.freshness_status)) {
    throw new ContractError(`${context}: invalid freshness status`, {
      freshness_status: value.freshness_status,
    });
  }
  if (
    typeof value.perception_confidence !== "number" ||
    Number.isNaN(value.perception_confidence) ||
    value.perception_confidence < 0 ||
    value.perception_confidence > 1
  ) {
    throw new ContractError(`${context}: confidence out of range`, {
      perception_confidence: value.perception_confidence,
    });
  }
  if (
    value.frame_age_ms !== null &&
    (typeof value.frame_age_ms !== "number" ||
      Number.isNaN(value.frame_age_ms) ||
      value.frame_age_ms < 0)
  ) {
    throw new ContractError(`${context}: frame age out of range`, {
      frame_age_ms: value.frame_age_ms,
    });
  }
  if (value.raw_frame_available !== false) {
    throw new ContractError(`${context}: summary must not expose raw frame availability`);
  }
  if (typeof value.future_observation_rejected_before_adapter !== "boolean") {
    throw new ContractError(`${context}: future observation rejection flag required`);
  }
  if (
    value.freshness_status === "future_clock_skew" &&
    value.future_observation_rejected_before_adapter !== true
  ) {
    throw new ContractError(`${context}: future observation must be rejected`);
  }
  assertExactBoundaryPolicy(
    value.boundary_policy,
    GAME_OBSERVATION_VALIDATION_BOUNDARY_POLICY,
    context
  );
  if (value.boundary_policy.no_candidate_payloads !== true) {
    throw new ContractError(`${context}: candidate payload boundary missing`);
  }
}

function buildValidationResult({
  trace_id,
  trace_id_present,
  event_id,
  event_id_present,
  validated_at_ms,
  validation_status,
  observation_validation_summary,
  game_control_mode_policy,
  rejected_candidates,
  approved_game_input_action,
}) {
  const approvedGameActionPresent =
    validation_status === "approved" && approved_game_input_action?.approved === true;
  const validation = {
    schema: "iris_game_action_validation_v1",
    trace_id,
    trace_id_present:
      safeText(approved_game_input_action?.trace_id ?? trace_id, 160) !== "",
    event_id,
    event_id_present:
      safeText(approved_game_input_action?.event_id ?? event_id, 160) !== "",
    internal_profile: true,
    validation_status,
    observation_validation_summary,
    game_control_mode_policy,
    approved_game_input_action,
    approved_game_action_present: approvedGameActionPresent,
    rejected_candidates,
    validated_at_ms,
    boundary_policy: { ...GAME_ACTION_VALIDATION_BOUNDARY_POLICY },
    adapter_validation_required: true,
  };
  assertGameActionValidationSafe(validation);
  return validation;
}

function buildGameControlModePolicy({
  gameControlMode,
  manualApprovalConfirmed,
  manualApprovalAuditOk,
  approvedSafeAdapterConfirmation,
  approvedSafeAdapterReady,
  approvedSafeAdapterAuditOk,
  approvedSafeAdapterCooldownOk,
}) {
  const mode = GAME_CONTROL_MODES.has(gameControlMode) ? gameControlMode : "manual_approval";
  const manual_approval_required = mode === "manual_approval";
  const manual_audit_required = mode === "manual_approval";
  const manual_confirmed = manualApprovalConfirmed === true;
  const manual_audit_ok = manualApprovalAuditOk === true;
  const confirmation_required = mode === "approved_safe_adapter";
  const ready_required = mode === "approved_safe_adapter";
  const audit_required = mode === "approved_safe_adapter";
  const cooldown_required = mode === "approved_safe_adapter";
  const confirmed = approvedSafeAdapterConfirmation === true;
  const ready = approvedSafeAdapterReady === true;
  const audit_ok = approvedSafeAdapterAuditOk === true;
  const cooldown_ok = approvedSafeAdapterCooldownOk === true;
  return {
    mode,
    default_mode: "manual_approval",
    manual_approval_operator_approval_required: manual_approval_required,
    manual_approval_audit_required: manual_audit_required,
    manual_approval_confirmed: manual_confirmed,
    manual_approval_audit_ok: manual_audit_ok,
    approved_safe_adapter_confirmation_required: confirmation_required,
    approved_safe_adapter_ready_required: ready_required,
    approved_safe_adapter_audit_required: audit_required,
    approved_safe_adapter_cooldown_required: cooldown_required,
    approved_safe_adapter_confirmed: confirmed,
    approved_safe_adapter_ready: ready,
    approved_safe_adapter_audit_ok: audit_ok,
    approved_safe_adapter_cooldown_ok: cooldown_ok,
    mode_switch_allowed:
      mode === "manual_approval"
        ? manual_confirmed && manual_audit_ok
        : confirmed && ready && audit_ok && cooldown_ok,
  };
}

function assertGameControlModePolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: game control mode policy required`);
  }
  if (!GAME_CONTROL_MODES.has(policy.mode)) {
    throw new ContractError(`${context}: unsupported game control mode`, { mode: policy.mode });
  }
  if (policy.default_mode !== "manual_approval") {
    throw new ContractError(`${context}: game control default mode must be manual_approval`);
  }
  if (policy.mode === "manual_approval") {
    if (
      policy.manual_approval_operator_approval_required !== true ||
      policy.manual_approval_audit_required !== true
    ) {
      throw new ContractError(`${context}: manual approval operator approval and audit cue required`);
    }
    if (
      policy.mode_switch_allowed !==
      (policy.manual_approval_confirmed === true && policy.manual_approval_audit_ok === true)
    ) {
      throw new ContractError(`${context}: manual approval gate mismatch`);
    }
  }
  if (policy.mode === "approved_safe_adapter") {
    if (
      policy.approved_safe_adapter_confirmation_required !== true ||
      policy.approved_safe_adapter_ready_required !== true ||
      policy.approved_safe_adapter_audit_required !== true ||
      policy.approved_safe_adapter_cooldown_required !== true
    ) {
      throw new ContractError(`${context}: approved safe adapter switch gates required`);
    }
    if (
      policy.mode_switch_allowed !==
      (policy.approved_safe_adapter_confirmed === true &&
        policy.approved_safe_adapter_ready === true &&
        policy.approved_safe_adapter_audit_ok === true &&
        policy.approved_safe_adapter_cooldown_ok === true)
    ) {
      throw new ContractError(`${context}: approved safe adapter switch gate mismatch`);
    }
  }
}

function createReject({
  trace_id,
  event_id,
  validated_at_ms,
  source_candidate_kind,
  reason,
}) {
  return {
    schema: "iris_game_action_validation_reject_v1",
    trace_id,
    event_id,
    source_phase: "phase24",
    source_candidate_kind,
    reason,
    rejected_at_ms: validated_at_ms,
  };
}

function normalizeAllowedActions(availableGameActions) {
  const configured = Array.isArray(availableGameActions)
    ? availableGameActions
        .map((item) => String(item).trim().toLowerCase())
        .filter(Boolean)
    : [];
  const safeConfigured = configured.filter((item) => ACTION_KINDS.has(item));
  return new Set(safeConfigured.length > 0 ? safeConfigured : ["wait"]);
}

function rejectReasonForActionRateLimit({
  lastApprovedActionAtMs,
  minActionIntervalMs,
  nowMs,
}) {
  const interval = clampInteger(minActionIntervalMs, 0, 3_600_000, 0);
  if (interval <= 0) return null;
  const lastApproved = Number(lastApprovedActionAtMs);
  const current = Number(nowMs);
  if (!Number.isFinite(lastApproved) || !Number.isFinite(current)) return null;
  if (current - lastApproved < interval) return "action_rate_limited";
  return null;
}

function safeNonNegativeNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Number(number.toFixed(4));
}

function rawObservationFrameAge(gamePerception) {
  const raw = gamePerception?.game_situation_summary?.vision_context?.frame_age_ms;
  if (raw === undefined || raw === null || raw === "") return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function sanitizeActionParameters(actionKind, parameters = {}) {
  assertNoForbiddenApprovedActionFields(parameters, `approved game parameters ${actionKind}`);
  switch (actionKind) {
    case "wait": {
      const duration = Number(parameters.duration_ms ?? 250);
      if (!Number.isFinite(duration) || duration < 50 || duration > 3000) {
        throw new ContractError("approved wait duration out of range", { duration });
      }
      return { duration_ms: Math.round(duration) };
    }
    case "move_axis": {
      const axis = String(parameters.axis ?? "movement");
      const direction_hint = String(parameters.direction_hint ?? "neutral").slice(0, 80);
      const intensity = Number(parameters.intensity ?? 0);
      if (axis !== "movement") {
        throw new ContractError("approved move axis unsupported", { axis });
      }
      if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
        throw new ContractError("approved move intensity out of range", { intensity });
      }
      return { axis, direction_hint, intensity: Number(intensity.toFixed(4)) };
    }
    case "press_key":
      return {
        key_hint: safeKeyHint(parameters.key_hint ?? parameters.key ?? "unspecified_key"),
      };
    case "click":
      return { target_hint: safeHint(parameters.target_hint ?? "screen_target", "target_hint") };
    case "open_menu":
      return { menu_hint: safeHint(parameters.menu_hint ?? "generic_menu", "menu_hint") };
    case "select_item":
      return { item_hint: safeHint(parameters.item_hint ?? "generic_item", "item_hint") };
    default:
      throw new ContractError("unsupported approved game action", { actionKind });
  }
}

function safeKeyHint(value) {
  const normalized = safeHint(value, "key_hint").toLowerCase().replace(/[\s-]+/g, "_");
  if (!SAFE_KEY_HINTS.has(normalized)) {
    throw new ContractError("unsupported approved game key hint", { hint_kind: "key_hint" });
  }
  return normalized;
}

function safeHint(value, hintKind) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!text || UNSAFE_ACTION_HINT_PATTERN.test(text)) {
    throw new ContractError("unsafe approved game action hint", { hint_kind: hintKind });
  }
  return text;
}

function assertExactBoundaryPolicy(policy, expected, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy is missing`);
  }
  for (const field of Object.keys(policy)) {
    if (!Object.hasOwn(expected, field)) {
      throw new ContractError(`${context}: unexpected boundary policy ${field}`);
    }
  }
}

function assertNoForbiddenValidationFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenValidationFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (field === "approved_game_input_action" && path === "root") {
      if (child) assertApprovedGameInputActionSafe(child, `${context} approved action`);
      continue;
    }
    if (FORBIDDEN_VALIDATION_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: game action validation must not expose raw candidates, commands, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenValidationFields(child, context, `${path}.${field}`);
  }
}

function assertNoForbiddenApprovedActionFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenApprovedActionFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_APPROVED_ACTION_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: approved game action must not expose raw candidates, commands, commits, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenApprovedActionFields(child, context, `${path}.${field}`);
  }
}

function assertNoUnsafeFixtureSummaryMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /\b(input_action_candidate|approved_game_input_action|world_command|execute|commit|raw[_-]?candidate|payload|endpoint|token|secret|authorization)\b|https?:\/\//iu.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe summary material`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeFixtureSummaryMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (path === "root" && field === "schema") continue;
    assertNoUnsafeFixtureSummaryMaterial(child, context, `${path}.${field}`);
  }
}
