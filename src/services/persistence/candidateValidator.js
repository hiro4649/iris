import {
  ContractError,
  assertCandidateNotExecutable,
  assertNoWorldCommand,
} from "../../core/contracts.js";
import { createHash } from "node:crypto";
import { assertDonationReactionSafe } from "../interaction/donationReaction.js";
import { assertMediaWatchReactionSafe } from "../interaction/mediaWatchReaction.js";
import { assertRelationshipDeepeningSafe } from "../relationship/relationshipDeepening.js";
import { assertStreamLifecycleSafe } from "../stream/streamLifecycle.js";
import { inferSensitivityLevel, redactSensitiveText } from "../safety/privacyGuards.js";
import {
  commitApprovedMemoryRecord,
} from "./jsonMemoryStore.js";
import {
  commitApprovedRelationshipRecord,
} from "./jsonRelationshipStore.js";

const VALIDATION_STATUSES = new Set(["disabled", "validated", "blocked"]);
const REJECT_REASONS = new Set([
  "validator_disabled",
  "no_candidate",
  "unsafe_candidate",
  "privacy_filtered",
  "community_validation_missing",
  "rights_guard_cautious",
  "unsupported_candidate_kind",
  "relationship_memory_disabled",
  "relationship_base_record_already_committed",
]);

const FORBIDDEN_VALIDATION_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "memory_candidate",
  "relationship_candidate",
  "relationship_update_candidate",
  "gratitude_memory_candidate",
  "media_memory_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "approved_game_input_action",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
  "endpoint",
  "url",
  "filePath",
  "file_path",
  "memory_store_path",
  "relationship_store_path",
  "store_path",
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
]);
const CANDIDATE_VALIDATION_FIELDS = new Set([
  "schema",
  "trace_id",
  "event_id",
  "validated_at_ms",
  "internal_profile",
  "validation_status",
  "approved_memory_records",
  "approved_relationship_records",
  "rejected_candidates",
  "boundary_policy",
  "adapter_validation_required",
]);
const CANDIDATE_REJECT_FIELDS = new Set([
  "schema",
  "trace_id",
  "event_id",
  "source_phase",
  "source_candidate_kind",
  "reason",
  "rejected_at_ms",
]);
const CANDIDATE_PERSISTENCE_RESULT_FIELDS = new Set([
  "schema",
  "trace_id",
  "event_id",
  "memory_committed_count",
  "relationship_committed_count",
  "memory_failed_count",
  "relationship_failed_count",
  "persistence_error_count",
  "persistence_error_kinds",
  "memory_results",
  "relationship_results",
  "boundary_policy",
]);
const COMMIT_RESULT_FIELDS = new Set([
  "committed",
  "reason",
  "error_kind",
  "retryable",
  "record",
]);
const PUBLIC_RECORD_HINT_FIELDS = new Set([
  "schema",
  "event_id",
  "source_phase",
  "source_candidate_kind",
]);
const CANDIDATE_VALIDATION_BOUNDARY_POLICY = {
  raw_candidate_exposed: false,
  validator_required_before_side_effect: true,
  approved_schema_only: true,
  adapter_handoff_allowed: false,
  approved_records_only: true,
  raw_candidates_not_persisted: true,
  no_direct_commit: true,
  no_unvalidated_relationship_update: true,
};
const CANDIDATE_PERSISTENCE_RESULT_BOUNDARY_POLICY = {
  approved_schema_only: true,
  raw_candidates_not_committed: true,
  commit_failures_summary_only: true,
  no_store_paths: true,
  no_error_messages: true,
};

export function validateRuntimeCandidatesForPersistence({
  event,
  coreResult,
  relationshipDeepening,
  donationReaction,
  mediaWatchReaction,
  streamLifecycle,
  enableCandidatePersistence = false,
  enableRelationshipMemory = false,
  nowMs = Date.now(),
} = {}) {
  assertNoWorldCommand(event, "Candidate validator event input");
  assertNoWorldCommand(coreResult, "Candidate validator core input");
  assertRelationshipDeepeningSafe(relationshipDeepening, "Candidate validator relationship input");
  assertDonationReactionSafe(donationReaction, "Candidate validator donation input");
  assertMediaWatchReactionSafe(mediaWatchReaction, "Candidate validator media input");
  assertStreamLifecycleSafe(streamLifecycle, "Candidate validator lifecycle input");

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const base = {
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    validated_at_ms: nowMs,
  };
  const approved_memory_records = [];
  const approved_relationship_records = [];
  const rejected_candidates = [];

  if (enableCandidatePersistence !== true || phase15.final_normalized_status !== "safe") {
    const validation = {
      schema: "iris_candidate_validation_result_v1",
      ...base,
      internal_profile: true,
      validation_status: "disabled",
      approved_memory_records,
      approved_relationship_records,
      rejected_candidates: [
        createReject({
          ...base,
          source_candidate_kind: "all_runtime_candidates",
          reason:
            enableCandidatePersistence === true ? "unsafe_candidate" : "validator_disabled",
        }),
      ],
      boundary_policy: buildBoundaryPolicy(),
      adapter_validation_required: true,
    };
    assertCandidateValidationSafe(validation);
    return validation;
  }

  collectMemoryApproval({
    candidate: coreResult?.phase05?.memory_candidate,
    sourcePhase: "phase05",
    base,
    ownerScope: "shared_stream",
    memoryType: "stream_experience",
    approved_memory_records,
    rejected_candidates,
  });
  collectMemoryApproval({
    candidate: donationReaction.gratitude_memory_candidate,
    sourcePhase: "addendum_donation",
    base,
    ownerScope: "user",
    linkedIdentityId: donationReaction.gratitude_memory_candidate?.user_id ?? null,
    displayName: donationReaction.gratitude_memory_candidate?.display_name ?? null,
    memoryType: "stream_experience",
    approved_memory_records,
    rejected_candidates,
  });
  collectMemoryApproval({
    candidate: mediaWatchReaction.media_memory_candidate,
    sourcePhase: "addendum_media_watch",
    base,
    ownerScope: "shared_stream",
    memoryType: "media_watch_experience",
    guard: mediaWatchReaction.rights_guard_result?.status === "cautious"
      ? "rights_guard_cautious"
      : null,
    approved_memory_records,
    rejected_candidates,
  });
  for (const candidate of streamLifecycle.memory_carryover_candidates) {
    collectMemoryApproval({
      candidate,
      sourcePhase: "phase26",
      base,
      ownerScope: "shared_stream",
      memoryType: inferLifecycleMemoryType(candidate),
      approved_memory_records,
      rejected_candidates,
    });
  }
  for (const candidate of streamLifecycle.community_memory_candidates) {
    collectMemoryApproval({
      candidate,
      sourcePhase: "phase26",
      base,
      ownerScope: "community",
      memoryType: "community",
      approved_memory_records,
      rejected_candidates,
    });
  }

  collectRelationshipApproval({
    relationshipDeepening,
    base,
    enableRelationshipMemory,
    coreRelationshipCommitted: coreResult?.relationship?.committed === true,
    approved_relationship_records,
    rejected_candidates,
  });

  const validation = {
    schema: "iris_candidate_validation_result_v1",
    ...base,
    internal_profile: true,
    validation_status:
      approved_memory_records.length > 0 || approved_relationship_records.length > 0
        ? "validated"
        : "blocked",
    approved_memory_records,
    approved_relationship_records,
    rejected_candidates,
    boundary_policy: buildBoundaryPolicy(),
    adapter_validation_required: true,
  };
  assertCandidateValidationSafe(validation);
  return validation;
}

export function commitValidatedCandidateRecords({
  candidateValidation,
  memoryStore = null,
  relationshipStore = null,
} = {}) {
  assertCandidateValidationSafe(candidateValidation, "Candidate validation commit input");
  const memory_results = [];
  const relationship_results = [];
  for (const record of candidateValidation.approved_memory_records) {
    memory_results.push(
      memoryStore
        ? commitApprovedMemoryRecordSafely(memoryStore, record)
        : createCommitSkippedResult("memory_store_missing", record)
    );
  }
  for (const record of candidateValidation.approved_relationship_records) {
    relationship_results.push(
      relationshipStore
        ? commitApprovedRelationshipRecordSafely(relationshipStore, record)
        : createCommitSkippedResult("relationship_store_missing", record)
    );
  }
  const memory_failed_count = memory_results.filter((item) => item.committed !== true).length;
  const relationship_failed_count = relationship_results.filter(
    (item) => item.committed !== true
  ).length;
  const persistence_error_count = [...memory_results, ...relationship_results].filter(
    (item) => item.error_kind
  ).length;
  const persistence_error_kinds = [
    ...new Set(
      [...memory_results, ...relationship_results]
        .map((item) => item.error_kind)
        .filter(Boolean)
    ),
  ].sort();
  const result = {
    schema: "iris_candidate_persistence_result_v1",
    trace_id: candidateValidation.trace_id,
    event_id: candidateValidation.event_id,
    memory_committed_count: memory_results.filter((item) => item.committed).length,
    relationship_committed_count: relationship_results.filter((item) => item.committed).length,
    memory_failed_count,
    relationship_failed_count,
    persistence_error_count,
    persistence_error_kinds,
    memory_results: memory_results.map(sanitizeCommitResult),
    relationship_results: relationship_results.map(sanitizeCommitResult),
    boundary_policy: { ...CANDIDATE_PERSISTENCE_RESULT_BOUNDARY_POLICY },
  };
  assertCandidatePersistenceResultSafe(result);
  return result;
}

export async function commitValidatedCandidateRecordsAsync({
  candidateValidation,
  memoryStore = null,
  relationshipStore = null,
} = {}) {
  assertCandidateValidationSafe(candidateValidation, "Async candidate validation commit input");
  const memory_results = [];
  const relationship_results = [];
  for (const record of candidateValidation.approved_memory_records) {
    memory_results.push(
      memoryStore
        ? await commitApprovedMemoryRecordSafelyAsync(memoryStore, record)
        : createCommitSkippedResult("memory_store_missing", record)
    );
  }
  for (const record of candidateValidation.approved_relationship_records) {
    relationship_results.push(
      relationshipStore
        ? await commitApprovedRelationshipRecordSafelyAsync(relationshipStore, record)
        : createCommitSkippedResult("relationship_store_missing", record)
    );
  }
  const memory_failed_count = memory_results.filter((item) => item.committed !== true).length;
  const relationship_failed_count = relationship_results.filter(
    (item) => item.committed !== true
  ).length;
  const persistence_error_count = [...memory_results, ...relationship_results].filter(
    (item) => item.error_kind
  ).length;
  const persistence_error_kinds = [
    ...new Set(
      [...memory_results, ...relationship_results]
        .map((item) => item.error_kind)
        .filter(Boolean)
    ),
  ].sort();
  const result = {
    schema: "iris_candidate_persistence_result_v1",
    trace_id: candidateValidation.trace_id,
    event_id: candidateValidation.event_id,
    memory_committed_count: memory_results.filter((item) => item.committed).length,
    relationship_committed_count: relationship_results.filter((item) => item.committed).length,
    memory_failed_count,
    relationship_failed_count,
    persistence_error_count,
    persistence_error_kinds,
    memory_results: memory_results.map(sanitizeCommitResult),
    relationship_results: relationship_results.map(sanitizeCommitResult),
    boundary_policy: { ...CANDIDATE_PERSISTENCE_RESULT_BOUNDARY_POLICY },
  };
  assertCandidatePersistenceResultSafe(result);
  return result;
}

export function assertCandidateValidationSafe(
  candidateValidation,
  context = "candidate validation"
) {
  if (!candidateValidation || typeof candidateValidation !== "object") {
    throw new ContractError(`${context}: missing validation result`);
  }
  assertNoWorldCommand(candidateValidation, context);
  assertNoForbiddenFieldsRecursive(candidateValidation, context);
  if (candidateValidation.schema !== "iris_candidate_validation_result_v1") {
    throw new ContractError(`${context}: invalid schema`, {
      schema: candidateValidation.schema,
    });
  }
  for (const field of Object.keys(candidateValidation)) {
    if (!CANDIDATE_VALIDATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected validation field`, { field });
    }
  }
  if (candidateValidation.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (candidateValidation.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!VALIDATION_STATUSES.has(candidateValidation.validation_status)) {
    throw new ContractError(`${context}: invalid validation status`, {
      validation_status: candidateValidation.validation_status,
    });
  }
  if (!Array.isArray(candidateValidation.approved_memory_records)) {
    throw new ContractError(`${context}: approved memory records are required`);
  }
  if (!Array.isArray(candidateValidation.approved_relationship_records)) {
    throw new ContractError(`${context}: approved relationship records are required`);
  }
  if (!Array.isArray(candidateValidation.rejected_candidates)) {
    throw new ContractError(`${context}: rejected candidates are required`);
  }
  for (const record of candidateValidation.approved_memory_records) {
    assertApprovedMemoryRecord(record, context);
  }
  for (const record of candidateValidation.approved_relationship_records) {
    assertApprovedRelationshipRecord(record, context);
  }
  for (const rejected of candidateValidation.rejected_candidates) {
    assertCandidateRejectSafe(rejected, context);
    if (!REJECT_REASONS.has(rejected.reason)) {
      throw new ContractError(`${context}: invalid reject reason`, { reason: rejected.reason });
    }
  }
  assertExactBoundaryPolicy(
    candidateValidation.boundary_policy,
    CANDIDATE_VALIDATION_BOUNDARY_POLICY,
    context
  );
}

export function assertCandidatePersistenceResultSafe(
  result,
  context = "candidate persistence result"
) {
  if (!result || typeof result !== "object") {
    throw new ContractError(`${context}: missing result`);
  }
  assertNoWorldCommand(result, context);
  assertNoForbiddenFieldsRecursive(result, context);
  if (result.schema !== "iris_candidate_persistence_result_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: result.schema });
  }
  for (const field of Object.keys(result)) {
    if (!CANDIDATE_PERSISTENCE_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected persistence result field`, {
        field,
      });
    }
  }
  assertExactBoundaryPolicy(
    result.boundary_policy,
    CANDIDATE_PERSISTENCE_RESULT_BOUNDARY_POLICY,
    context
  );
  if (result.boundary_policy.approved_schema_only !== true) {
    throw new ContractError(`${context}: approved schema boundary policy is missing`);
  }
  if (result.boundary_policy.raw_candidates_not_committed !== true) {
    throw new ContractError(`${context}: raw candidate boundary policy is missing`);
  }
  if (result.boundary_policy.commit_failures_summary_only !== true) {
    throw new ContractError(`${context}: commit failure boundary policy is missing`);
  }
  if (result.boundary_policy.no_store_paths !== true) {
    throw new ContractError(`${context}: store path boundary policy is missing`);
  }
  if (result.boundary_policy.no_error_messages !== true) {
    throw new ContractError(`${context}: error message boundary policy is missing`);
  }
  for (const field of [
    "memory_committed_count",
    "relationship_committed_count",
    "memory_failed_count",
    "relationship_failed_count",
    "persistence_error_count",
  ]) {
    if (!Number.isInteger(result[field]) || result[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    !Array.isArray(result.persistence_error_kinds) ||
    result.persistence_error_kinds.some(
      (kind) => typeof kind !== "string" || kind.length === 0 || kind.length > 80
    )
  ) {
    throw new ContractError(`${context}: invalid persistence error kinds`);
  }
  assertCommitResultsSafe(result.memory_results, "memory", context);
  assertCommitResultsSafe(result.relationship_results, "relationship", context);
}

function assertCandidateRejectSafe(rejected, context) {
  if (!rejected || typeof rejected !== "object" || Array.isArray(rejected)) {
    throw new ContractError(`${context}: invalid rejected candidate summary`);
  }
  if (rejected.schema !== "iris_candidate_validation_reject_v1") {
    throw new ContractError(`${context}: invalid rejected candidate schema`);
  }
  for (const field of Object.keys(rejected)) {
    if (!CANDIDATE_REJECT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected rejected candidate field`, {
        field,
      });
    }
  }
}

export function sanitizeCandidateValidationForPublicState(candidateValidation) {
  if (!candidateValidation) return null;
  assertCandidateValidationSafe(candidateValidation, "Candidate validation public summary");
  return {
    schema: candidateValidation.schema,
    trace_id_present: String(candidateValidation.trace_id ?? "").trim() !== "",
    event_id_present: String(candidateValidation.event_id ?? "").trim() !== "",
    internal_profile: true,
    validation_status: candidateValidation.validation_status,
    approved_memory_record_count: candidateValidation.approved_memory_records.length,
    approved_relationship_record_count:
      candidateValidation.approved_relationship_records.length,
    rejected_candidate_count: candidateValidation.rejected_candidates.length,
    rejected_reasons: [
      ...new Set(candidateValidation.rejected_candidates.map((item) => item.reason)),
    ],
    boundary_policy: {
      ...CANDIDATE_VALIDATION_BOUNDARY_POLICY,
      no_platform_ids: true,
    },
    adapter_validation_required: true,
  };
}

export function sanitizeCandidatePersistenceForPublicState(candidatePersistence) {
  if (!candidatePersistence) return null;
  assertCandidatePersistenceResultSafe(
    candidatePersistence,
    "Candidate persistence public summary"
  );
  return {
    schema: candidatePersistence.schema,
    trace_id_present: String(candidatePersistence.trace_id ?? "").trim() !== "",
    event_id_present: String(candidatePersistence.event_id ?? "").trim() !== "",
    memory_committed_count: candidatePersistence.memory_committed_count,
    relationship_committed_count: candidatePersistence.relationship_committed_count,
    memory_failed_count: candidatePersistence.memory_failed_count,
    relationship_failed_count: candidatePersistence.relationship_failed_count,
    persistence_error_count: candidatePersistence.persistence_error_count,
    persistence_error_kinds: candidatePersistence.persistence_error_kinds,
    boundary_policy: {
      ...CANDIDATE_PERSISTENCE_RESULT_BOUNDARY_POLICY,
      no_platform_ids: true,
    },
  };
}

function collectMemoryApproval({
  candidate,
  sourcePhase,
  base,
  ownerScope,
  linkedIdentityId = null,
  displayName = null,
  memoryType,
  guard = null,
  approved_memory_records,
  rejected_candidates,
}) {
  if (!candidate) {
    rejected_candidates.push(
      createReject({ ...base, source_phase: sourcePhase, source_candidate_kind: "none", reason: "no_candidate" })
    );
    return;
  }
  try {
    assertCandidateNotExecutable(candidate, `${sourcePhase} memory candidate validation`);
  } catch {
    rejected_candidates.push(
      createReject({
        ...base,
        source_phase: sourcePhase,
        source_candidate_kind: candidate.candidate_kind ?? "unknown",
        reason: "unsafe_candidate",
      })
    );
    return;
  }
  if (guard) {
    rejected_candidates.push(
      createReject({
        ...base,
        source_phase: sourcePhase,
        source_candidate_kind: candidate.candidate_kind,
        reason: guard,
      })
    );
    return;
  }
  if (!isSupportedMemoryCandidate(candidate.candidate_kind)) {
    rejected_candidates.push(
      createReject({
        ...base,
        source_phase: sourcePhase,
        source_candidate_kind: candidate.candidate_kind ?? "unknown",
        reason: "unsupported_candidate_kind",
      })
    );
    return;
  }
  if (
    candidate.candidate_kind === "community_memory_candidate" &&
    !hasCommunityMemoryValidationPolicy(candidate)
  ) {
    rejected_candidates.push(
      createReject({
        ...base,
        source_phase: sourcePhase,
        source_candidate_kind: candidate.candidate_kind,
        reason: "community_validation_missing",
      })
    );
    return;
  }
  const rawSummary = rawCandidateSummary(candidate);
  const sensitivity = inferSensitivityLevel(rawSummary);
  if (sensitivity === "private" || sensitivity === "sensitive") {
    rejected_candidates.push(
      createReject({
        ...base,
        source_phase: sourcePhase,
        source_candidate_kind: candidate.candidate_kind,
        reason: "privacy_filtered",
      })
    );
    return;
  }
  const summary = redactSensitiveText(rawSummary, { maxLength: 240 });
  const record = {
    schema: "approved_memory_record",
    approved: true,
    trace_id: candidate.trace_id ?? base.trace_id,
    event_id: candidate.event_id ?? base.event_id,
    store: "experience_log",
    summary,
    memory_id: buildMemoryId(candidate, sourcePhase),
    memory_type: memoryType,
    owner_scope: ownerScope,
    linked_identity_id: linkedIdentityId,
    display_name: displayName,
    source_phase: sourcePhase,
    source_candidate_kind: candidate.candidate_kind,
    sensitivity_level: sensitivity,
    audit_status: "approved",
    commit_snapshot_id: buildCommitSnapshotId(candidate, sourcePhase),
    rollback_pointer_id: buildRollbackPointerId(candidate, sourcePhase),
    moderation_precheck_status: "allowed",
    validation_route: "candidate_validator_v1",
    committed_at_ms: base.validated_at_ms,
  };
  assertApprovedMemoryRecord(record, "Candidate validator memory approval");
  approved_memory_records.push(record);
}

function collectRelationshipApproval({
  relationshipDeepening,
  base,
  enableRelationshipMemory,
  coreRelationshipCommitted,
  approved_relationship_records,
  rejected_candidates,
}) {
  const candidate = relationshipDeepening.relationship_update_candidate;
  if (!candidate) {
    rejected_candidates.push(
      createReject({
        ...base,
        source_phase: "phase20",
        source_candidate_kind: "none",
        reason: "no_candidate",
      })
    );
    return;
  }
  if (enableRelationshipMemory !== true) {
    rejected_candidates.push(
      createReject({
        ...base,
        source_phase: "phase20",
        source_candidate_kind: candidate.candidate_kind,
        reason: "relationship_memory_disabled",
      })
    );
    return;
  }
  if (coreRelationshipCommitted === true) {
    rejected_candidates.push(
      createReject({
        ...base,
        source_phase: "phase20",
        source_candidate_kind: candidate.candidate_kind,
        reason: "relationship_base_record_already_committed",
      })
    );
    return;
  }
  try {
    assertCandidateNotExecutable(candidate, "Phase20 relationship candidate validation");
  } catch {
    rejected_candidates.push(
      createReject({
        ...base,
        source_phase: "phase20",
        source_candidate_kind: candidate.candidate_kind ?? "unknown",
        reason: "unsafe_candidate",
      })
    );
    return;
  }
  const summaryLabel =
    Number(candidate.proposed_affinity_delta ?? 0) < 0
      ? "validated relationship boundary"
      : "validated relationship warmth";
  const summary = redactSensitiveText(
    `${summaryLabel} from ${candidate.evidence_tags?.join(", ") || "interaction"}`,
    { maxLength: 160 }
  );
  const record = {
    schema: "approved_relationship_record",
    approved: true,
    trace_id: candidate.trace_id ?? base.trace_id,
    event_id: candidate.event_id ?? base.event_id,
    linked_identity_id: candidate.user_id,
    display_name: candidate.display_name,
    store: "relationship_memory",
    affinity_delta: clampDelta(candidate.proposed_affinity_delta),
    familiarity_delta: clampDelta(candidate.proposed_familiarity_delta),
    topic_key: "phase20_relationship_deepening",
    summary,
    source_phase: "phase20",
    source_candidate_kind: candidate.candidate_kind,
    audit_status: "approved",
    commit_snapshot_id: buildCommitSnapshotId(candidate, "phase20"),
    rollback_pointer_id: buildRollbackPointerId(candidate, "phase20"),
    moderation_precheck_status: "allowed",
    validation_route: "candidate_validator_v1",
    committed_at_ms: base.validated_at_ms,
  };
  assertApprovedRelationshipRecord(record, "Candidate validator relationship approval");
  approved_relationship_records.push(record);
}

function createReject({
  trace_id,
  event_id,
  validated_at_ms,
  source_phase = "runtime",
  source_candidate_kind,
  reason,
}) {
  return {
    schema: "iris_candidate_validation_reject_v1",
    trace_id,
    event_id,
    source_phase,
    source_candidate_kind,
    reason,
    rejected_at_ms: validated_at_ms,
  };
}

function buildBoundaryPolicy() {
  return { ...CANDIDATE_VALIDATION_BOUNDARY_POLICY };
}

function rawCandidateSummary(candidate) {
  return String(candidate.summary_hint ?? candidate.summary ?? "candidate approved").trim();
}

function inferLifecycleMemoryType(candidate) {
  const text = String(candidate.summary_hint ?? "").toLowerCase();
  if (/game|minecraft|apex|valorant/.test(text)) return "game_experience";
  return "stream_experience";
}

function buildMemoryId(candidate, sourcePhase) {
  const summaryKey = stableMemorySummaryKey(rawCandidateSummary(candidate));
  return [
    "memory",
    sourcePhase,
    candidate.event_id ?? "unknown_event",
    candidate.candidate_kind ?? "candidate",
    summaryKey,
  ]
    .map((part) =>
      String(part)
        .replace(/[^a-zA-Z0-9:_-]/g, "_")
        .slice(0, 80)
    )
    .join(":");
}

function stableMemorySummaryKey(summary) {
  return createHash("sha256").update(String(summary ?? "")).digest("hex").slice(0, 12);
}

function buildCommitSnapshotId(candidate, sourcePhase) {
  return `snapshot:${sourcePhase}:${candidate.event_id ?? "unknown_event"}:${stableMemorySummaryKey(rawCandidateSummary(candidate))}`;
}

function buildRollbackPointerId(candidate, sourcePhase) {
  return `rollback:${sourcePhase}:${candidate.event_id ?? "unknown_event"}:${stableMemorySummaryKey(rawCandidateSummary(candidate))}`;
}

function isSupportedMemoryCandidate(kind) {
  return [
    "donation_appreciation_memory_candidate",
    "media_watch_memory_candidate",
    "experience_log",
    "memory_carryover_candidate",
    "community_memory_candidate",
  ].includes(kind);
}

function hasCommunityMemoryValidationPolicy(candidate) {
  return (
    candidate.privacy_policy === "no_person_specific_detail" &&
    candidate.safety_policy === "safe_public_context_only" &&
    candidate.canon_policy === "non_canon_community_lore_candidate" &&
    candidate.community_policy === "keep_open_for_new_viewers"
  );
}

function assertApprovedMemoryRecord(record, context) {
  if (record.schema !== "approved_memory_record" || record.approved !== true) {
    throw new ContractError(`${context}: invalid approved memory record`);
  }
  if (!record.summary || inferSensitivityLevel(record.summary) === "sensitive") {
    throw new ContractError(`${context}: unsafe memory summary`);
  }
  assertRollbackGuardFields(record, context);
  if (
    ![
      "stream_experience",
      "game_experience",
      "media_watch_experience",
      "community",
    ].includes(record.memory_type)
  ) {
    throw new ContractError(`${context}: unsupported memory type`, {
      memory_type: record.memory_type,
    });
  }
}

function assertApprovedRelationshipRecord(record, context) {
  if (record.schema !== "approved_relationship_record" || record.approved !== true) {
    throw new ContractError(`${context}: invalid approved relationship record`);
  }
  if (!record.linked_identity_id) {
    throw new ContractError(`${context}: relationship record missing identity`);
  }
  assertRollbackGuardFields(record, context);
  if (record.affinity_delta < -0.1 || record.affinity_delta > 0.1) {
    throw new ContractError(`${context}: affinity delta out of range`);
  }
  if (record.familiarity_delta < -0.1 || record.familiarity_delta > 0.1) {
    throw new ContractError(`${context}: familiarity delta out of range`);
  }
}

function assertRollbackGuardFields(record, context) {
  for (const field of [
    "audit_status",
    "commit_snapshot_id",
    "rollback_pointer_id",
    "moderation_precheck_status",
  ]) {
    if (typeof record[field] !== "string" || record[field].trim() === "") {
      throw new ContractError(`${context}: ${field} is required`);
    }
  }
  if (record.audit_status !== "approved") {
    throw new ContractError(`${context}: approved audit status required`);
  }
  if (record.moderation_precheck_status !== "allowed") {
    throw new ContractError(`${context}: allowed moderation precheck required`);
  }
}

function sanitizeCommitResult(result) {
  return {
    committed: result.committed === true,
    reason: result.reason ?? null,
    error_kind: result.error_kind ?? null,
    retryable: result.retryable === true,
    record: result.record ? publicRecordHint(result.record) : null,
  };
}

function assertCommitResultsSafe(results, kind, context) {
  if (!Array.isArray(results)) {
    throw new ContractError(`${context}: ${kind} commit results must be an array`);
  }
  for (const item of results) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ContractError(`${context}: invalid ${kind} commit result`);
    }
    for (const field of Object.keys(item)) {
      if (!COMMIT_RESULT_FIELDS.has(field)) {
        throw new ContractError(`${context}: unsafe ${kind} commit result field`, { field });
      }
    }
    if (typeof item.committed !== "boolean") {
      throw new ContractError(`${context}: invalid ${kind} commit result status`);
    }
    if (item.reason !== null && item.reason !== undefined && typeof item.reason !== "string") {
      throw new ContractError(`${context}: invalid ${kind} commit result reason`);
    }
    if (
      item.error_kind !== null &&
      item.error_kind !== undefined &&
      typeof item.error_kind !== "string"
    ) {
      throw new ContractError(`${context}: invalid ${kind} commit error kind`);
    }
    if (typeof item.retryable !== "boolean") {
      throw new ContractError(`${context}: invalid ${kind} commit retryable flag`);
    }
    assertPublicRecordHintSafe(item.record, kind, context);
  }
}

function assertPublicRecordHintSafe(record, kind, context) {
  if (record === null || record === undefined) return;
  if (typeof record !== "object" || Array.isArray(record)) {
    throw new ContractError(`${context}: invalid ${kind} commit record hint`);
  }
  for (const field of Object.keys(record)) {
    if (!PUBLIC_RECORD_HINT_FIELDS.has(field)) {
      throw new ContractError(`${context}: raw ${kind} record data must not be exposed`, {
        field,
      });
    }
  }
  if (
    kind === "memory" &&
    record.schema !== null &&
    record.schema !== "approved_memory_record"
  ) {
    throw new ContractError(`${context}: invalid memory record hint schema`);
  }
  if (
    kind === "relationship" &&
    record.schema !== null &&
    record.schema !== "approved_relationship_record"
  ) {
    throw new ContractError(`${context}: invalid relationship record hint schema`);
  }
}

function publicRecordHint(record) {
  return {
    schema: record.schema,
    event_id: record.event_id,
    source_phase: record.source_phase ?? null,
    source_candidate_kind: record.source_candidate_kind ?? null,
  };
}

function commitApprovedMemoryRecordSafely(memoryStore, record) {
  try {
    return commitApprovedMemoryRecord(memoryStore, record);
  } catch (error) {
    return createCommitFailureResult("memory_store_commit_failed", record, error);
  }
}

function commitApprovedRelationshipRecordSafely(relationshipStore, record) {
  try {
    return commitApprovedRelationshipRecord(relationshipStore, record);
  } catch (error) {
    return createCommitFailureResult("relationship_store_commit_failed", record, error);
  }
}

async function commitApprovedMemoryRecordSafelyAsync(memoryStore, record) {
  try {
    assertApprovedMemoryRecord(record, "Async candidate memory persistence");
    const appended = await memoryStore.append(record);
    return {
      committed: true,
      record: appended,
    };
  } catch (error) {
    return createCommitFailureResult("memory_store_commit_failed", record, error);
  }
}

async function commitApprovedRelationshipRecordSafelyAsync(relationshipStore, record) {
  try {
    assertApprovedRelationshipRecord(record, "Async candidate relationship persistence");
    const profile = await relationshipStore.upsertApproved(record);
    return {
      committed: profile?.duplicate_record_ignored !== true,
      reason: profile?.duplicate_record_ignored ? "duplicate_relationship_record" : undefined,
      record,
    };
  } catch (error) {
    return createCommitFailureResult("relationship_store_commit_failed", record, error);
  }
}

function createCommitSkippedResult(reason, record) {
  return {
    committed: false,
    reason,
    retryable: false,
    record: publicRecordHint(record),
  };
}

function createCommitFailureResult(reason, record, error) {
  return {
    committed: false,
    reason,
    error_kind: classifyPersistenceCommitError(error),
    retryable: true,
    record: publicRecordHint(record),
  };
}

function classifyPersistenceCommitError(error) {
  if (error instanceof SyntaxError) return "store_parse_failed";
  if (error instanceof ContractError) return "store_contract_failed";
  const code = typeof error?.code === "string" ? error.code : "";
  if (["EACCES", "EPERM", "EROFS"].includes(code)) return "store_permission_failed";
  if (["ENOSPC", "EDQUOT"].includes(code)) return "store_capacity_failed";
  if (["ENOENT", "ENOTDIR"].includes(code)) return "store_location_unavailable";
  return "store_unavailable";
}

function assertNoForbiddenFieldsRecursive(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFieldsRecursive(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_VALIDATION_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: candidate validation must not expose raw candidates, commands, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
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

function clampDelta(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number < -0.1) return -0.1;
  if (number > 0.1) return 0.1;
  return Number(number.toFixed(4));
}
