import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";

const AUDIT_STATUSES = new Set(["pass", "fail"]);
const CHECK_STATUSES = new Set(["pass", "fail"]);

const RAW_CANDIDATE_OR_APPROVAL_FIELDS = new Set([
  "input_action_candidate",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "memory_candidate",
  "relationship_candidate",
  "gratitude_memory_candidate",
  "media_memory_candidate",
  "phase12_improvement_candidate",
  "approved_game_input_action",
]);

const SIDE_EFFECT_FIELDS = new Set([
  "world_command",
  "input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
]);

const CANONICAL_FIELDS = new Set([
  "action_type",
  "intent",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
]);

const FORBIDDEN_AUDIT_FIELDS = new Set([
  ...RAW_CANDIDATE_OR_APPROVAL_FIELDS,
  ...SIDE_EFFECT_FIELDS,
  ...CANONICAL_FIELDS,
  "approved_memory_record",
  "approved_relationship_record",
]);

export function createBoundaryAudit({
  event,
  coreResult,
  adapterPackets = {},
  relationshipDeepening,
  memoryRecall,
  gamePerception,
  gameCommentary,
  gamePlayer,
  gameActionValidation,
  gameControlResult,
  gameEmbodiment,
  streamLifecycle,
  speechRateProfile,
  languageProfile,
  subtitleCue,
  tongueTwisterMode,
  candidateValidation,
  candidatePersistence,
  candidateReviewItems = [],
} = {}) {
  assertNoWorldCommand(event, "Boundary audit event input");
  assertNoWorldCommand(coreResult, "Boundary audit core input");
  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const checks = [
    checkNoRawCandidateLeak({
      check: "adapter_packets_no_raw_candidates_or_approved_actions",
      value: adapterPackets,
      forbidden: new Set([...RAW_CANDIDATE_OR_APPROVAL_FIELDS, ...SIDE_EFFECT_FIELDS]),
    }),
    checkNoRawCandidateLeak({
      check: "candidate_review_items_safe_summaries",
      value: candidateReviewItems,
      forbidden: new Set([...RAW_CANDIDATE_OR_APPROVAL_FIELDS, ...SIDE_EFFECT_FIELDS]),
    }),
    checkGameControlBoundary({ gameActionValidation, gameControlResult }),
    checkCandidateGated({
      check: "relationship_candidate_validation_gated",
      candidate: relationshipDeepening?.relationship_update_candidate,
    }),
    checkCandidateGated({
      check: "phase24_input_candidate_validation_gated",
      candidate: gamePlayer?.input_action_candidate,
    }),
    checkLifecycleCandidates(streamLifecycle),
    checkMemoryRecallReadOnly(memoryRecall),
    checkCandidatePersistenceBoundary({ candidateValidation, candidatePersistence }),
    checkCandidateDirectSideEffectBoundary({
      gameControlResult,
      candidatePersistence,
    }),
    checkInternalProfilesNoCanonical({
      relationshipDeepening,
      memoryRecall,
      gamePerception,
      gameCommentary,
      gamePlayer,
      gameActionValidation,
      gameEmbodiment,
      streamLifecycle,
      speechRateProfile,
      languageProfile,
      subtitleCue,
      tongueTwisterMode,
    }),
  ];
  const critical_violations = checks
    .filter((check) => check.status === "fail")
    .map((check) => check.check);
  const audit = {
    schema: "iris_boundary_audit_v1",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    audit_status: critical_violations.length === 0 ? "pass" : "fail",
    checks,
    critical_violations,
    ci_fail_reasons: critical_violations,
    boundary_policy: {
      raw_candidates_not_exposed: true,
      approved_game_actions_not_public: true,
      validators_required_before_side_effect: true,
      internal_profiles_do_not_define_canonical_fields: true,
    },
    adapter_validation_required: true,
  };
  assertBoundaryAuditSafe(audit);
  return audit;
}

export function assertBoundaryAuditSafe(audit, context = "boundary audit") {
  if (!audit || typeof audit !== "object") {
    throw new ContractError(`${context}: missing audit`);
  }
  assertNoWorldCommand(audit, context);
  assertNoForbiddenAuditFields(audit, context);
  if (audit.schema !== "iris_boundary_audit_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: audit.schema });
  }
  if (audit.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (audit.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!AUDIT_STATUSES.has(audit.audit_status)) {
    throw new ContractError(`${context}: invalid audit status`, { audit_status: audit.audit_status });
  }
  if (!Array.isArray(audit.checks)) {
    throw new ContractError(`${context}: checks are required`);
  }
  for (const check of audit.checks) {
    if (!CHECK_STATUSES.has(check.status)) {
      throw new ContractError(`${context}: invalid check status`, { check });
    }
  }
}

export function sanitizeBoundaryAuditForPublicState(audit) {
  if (!audit) return null;
  assertBoundaryAuditSafe(audit, "Boundary audit public summary");
  return structuredClone(audit);
}

function checkNoRawCandidateLeak({ check, value, forbidden }) {
  const found = findFirstForbiddenField(value, forbidden);
  return {
    check,
    status: found ? "fail" : "pass",
    detail: found ? `forbidden field at ${found.path}` : "clear",
  };
}

function checkGameControlBoundary({ gameActionValidation, gameControlResult }) {
  const accepted = gameControlResult?.control_status === "accepted";
  const approved = gameActionValidation?.validation_status === "approved";
  const hasApprovedAction = Boolean(gameActionValidation?.approved_game_input_action);
  const pass = !accepted || (approved && hasApprovedAction);
  return {
    check: "game_control_requires_approved_schema",
    status: pass ? "pass" : "fail",
    detail: pass ? "clear" : "game control accepted without approved game action",
  };
}

function checkCandidateGated({ check, candidate }) {
  if (!candidate) {
    return { check, status: "pass", detail: "not_created" };
  }
  return {
    check,
    status: candidate.requires_validation === true ? "pass" : "fail",
    detail:
      candidate.requires_validation === true
        ? "requires_validation=true"
        : "candidate missing requires_validation=true",
  };
}

function checkLifecycleCandidates(streamLifecycle) {
  if (!streamLifecycle || typeof streamLifecycle !== "object" || Array.isArray(streamLifecycle)) {
    throw new ContractError("boundary audit: stream lifecycle is required");
  }
  if (!Array.isArray(streamLifecycle.memory_carryover_candidates)) {
    throw new ContractError("boundary audit: memory carryover candidates are required");
  }
  if (!Array.isArray(streamLifecycle.community_memory_candidates)) {
    throw new ContractError("boundary audit: community memory candidates are required");
  }
  const candidates = [
    ...streamLifecycle.memory_carryover_candidates,
    ...streamLifecycle.community_memory_candidates,
  ];
  const unsafe = candidates.find((candidate) => candidate?.requires_validation !== true);
  return {
    check: "phase26_lifecycle_candidates_validation_gated",
    status: unsafe ? "fail" : "pass",
    detail: unsafe ? "lifecycle candidate missing requires_validation=true" : `count=${candidates.length}`,
  };
}

function checkMemoryRecallReadOnly(memoryRecall) {
  const pass =
    !memoryRecall ||
    (memoryRecall.recall_reference_policy === "read_only_reference" &&
      !findFirstForbiddenField(memoryRecall, SIDE_EFFECT_FIELDS));
  return {
    check: "memory_recall_read_only",
    status: pass ? "pass" : "fail",
    detail: pass ? "clear" : "memory recall exposed side-effect authority",
  };
}

function checkCandidatePersistenceBoundary({ candidateValidation, candidatePersistence }) {
  const committed =
    Number(candidatePersistence?.memory_committed_count ?? 0) +
    Number(candidatePersistence?.relationship_committed_count ?? 0);
  const approved =
    Number(candidateValidation?.approved_memory_records?.length ?? 0) +
    Number(candidateValidation?.approved_relationship_records?.length ?? 0);
  const pass = committed === 0 || (candidateValidation?.validation_status === "validated" && approved >= committed);
  return {
    check: "candidate_persistence_requires_approved_records",
    status: pass ? "pass" : "fail",
    detail: pass ? `committed=${committed}` : "persistence committed without approved records",
  };
}

function checkCandidateDirectSideEffectBoundary({ gameControlResult, candidatePersistence }) {
  const executionCandidate = findFirstForbiddenField(
    gameControlResult,
    RAW_CANDIDATE_OR_APPROVAL_FIELDS
  );
  const persistenceCandidate = findFirstForbiddenField(
    candidatePersistence,
    RAW_CANDIDATE_OR_APPROVAL_FIELDS
  );
  const found = executionCandidate ?? persistenceCandidate;
  return {
    check: "candidate_must_not_reach_execution_or_persistence_writer",
    status: found ? "fail" : "pass",
    detail: found ? "forbidden candidate field detected before side effect boundary" : "clear",
  };
}

function checkInternalProfilesNoCanonical(profiles) {
  const found = findFirstForbiddenField(profiles, new Set([...SIDE_EFFECT_FIELDS, ...CANONICAL_FIELDS]));
  return {
    check: "internal_profiles_no_canonical_or_side_effect_fields",
    status: found ? "fail" : "pass",
    detail: found ? `forbidden field at ${found.path}` : "clear",
  };
}

function findFirstForbiddenField(value, forbidden, path = "root") {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = findFirstForbiddenField(item, forbidden, `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  for (const [field, child] of Object.entries(value)) {
    if (forbidden.has(field)) return { field, path: `${path}.${field}` };
    const found = findFirstForbiddenField(child, forbidden, `${path}.${field}`);
    if (found) return found;
  }
  return null;
}

function assertNoForbiddenAuditFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenAuditFields(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_AUDIT_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: audit must not expose raw candidates, commands, commits, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenAuditFields(child, context, `${path}.${field}`);
  }
}
