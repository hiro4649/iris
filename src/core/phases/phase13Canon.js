import { ContractError, assertCoreBoundary, assertScore, requireFields } from "../contracts.js";

const PHASE13_EVIDENCE_DELETION_FIELDS = new Set([
  "delete_raw_log",
  "delete_source_event",
  "delete_evidence_store",
  "raw_log_deleted",
  "source_event_deleted",
  "evidence_store_deleted",
  "purge_raw_log",
  "purge_source_event",
  "purge_evidence_store",
]);

export function phase13Canon({ phase06, phase07, phase08, phase09, phase10, phase11, phase12 }) {
  requireFields(phase06, ["trace_id", "event_id", "phase06_character_sync_score"], "Phase13 phase06 input");
  requireFields(phase07, ["phase07_character_alignment_score"], "Phase13 phase07 input");
  requireFields(phase08, ["phase08_primary_goal"], "Phase13 phase08 input");
  requireFields(phase09, ["phase09_constraint_status"], "Phase13 phase09 input");
  requireFields(phase10, ["strategy_mode"], "Phase13 phase10 input");
  requireFields(phase11, ["phase11_isolation_status"], "Phase13 phase11 input");
  requireFields(phase12, ["phase12_safety_status"], "Phase13 phase12 input");

  for (const [name, payload] of Object.entries({ phase06, phase07, phase08, phase09, phase10, phase11, phase12 })) {
    assertCoreBoundary(payload, `Phase13 ${name} input`);
  }

  const phase13_continuity_score = Math.min(
    1,
    (phase06.phase06_character_sync_score + phase07.phase07_character_alignment_score) / 2
  );
  const phase13_drift_score = Math.max(0, 1 - phase13_continuity_score);
  const phase13_canon_status =
    phase12.phase12_safety_status === "reject" || phase09.phase09_constraint_status === "reject"
      ? "archive_candidate"
      : "stable";

  assertScore("phase13_continuity_score", phase13_continuity_score);
  assertScore("phase13_drift_score", phase13_drift_score);

  const phase13_eviction = evaluatePhase13CanonEviction({
    canon_count: 1,
    canon_limit: 64,
    candidates: [{
      canon_id: `canon-candidate:${phase06.event_id}`,
      effective_weight: phase13_continuity_score,
    }],
  });

  const output = {
    trace_id: phase06.trace_id,
    event_id: phase06.event_id,
    canon_count: phase13_eviction.canon_count,
    canon_limit: phase13_eviction.canon_limit,
    effective_weight: phase13_eviction.lowest_effective_weight,
    eviction_required: phase13_eviction.eviction_required,
    eviction_executed: phase13_eviction.eviction_executed,
    evicted_ids: phase13_eviction.evicted_ids,
    phase13_continuity_score,
    phase13_drift_score,
    phase13_canon_status,
    phase13_canon_candidate_id: `canon-candidate:${phase06.event_id}`,
    phase13_eviction_candidate_id: null,
    phase13_archive_candidate_id: phase13_canon_status === "archive_candidate" ? `archive:${phase06.event_id}` : null,
    phase13_conflict_detected: false,
    phase13_resolved_canon_id: null,
    phase13_conflict_resolution_order: ["stability", "identity_match", "newer"],
    phase13_eviction_scope: "active_canon_candidate_only",
    phase13_evidence_preservation: {
      raw_log_preserved: true,
      source_event_preserved: true,
      evidence_store_preserved: true,
      deletion_allowed: false,
    },
    continuity_score: phase13_continuity_score,
    drift_score: phase13_drift_score,
  };
  assertPhase13CanonSafe(output);
  return output;
}

export function assertPhase13CanonSafe(output, context = "Phase13 canon") {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new ContractError(`${context}: output required`);
  }
  assertCoreBoundary(output, context);
  assertNoPhase13EvidenceDeletion(output, context);
  assertPhase13ConflictResolutionSafe(output, context);
  assertPhase13CanonEvictionSafe(output, context);
  if (
    output.phase13_eviction_scope !== "active_canon_candidate_only" ||
    output.phase13_evidence_preservation?.raw_log_preserved !== true ||
    output.phase13_evidence_preservation?.source_event_preserved !== true ||
    output.phase13_evidence_preservation?.evidence_store_preserved !== true ||
    output.phase13_evidence_preservation?.deletion_allowed !== false
  ) {
    throw new ContractError(`${context}: evidence preservation boundary required`);
  }
}

export function evaluatePhase13CanonEviction({
  canon_count = 0,
  canon_limit = 64,
  candidates = [],
} = {}) {
  const safeCanonCount = normalizeCount(canon_count, "canon_count");
  const safeCanonLimit = normalizeCount(canon_limit, "canon_limit");
  const normalizedCandidates = Array.isArray(candidates)
    ? candidates.map((candidate, index) => normalizeEvictionCandidate(candidate, index))
    : [];
  const lowWeightCandidates = normalizedCandidates.filter((candidate) => candidate.effective_weight < 0.2);
  const overflowCount = Math.max(0, safeCanonCount - safeCanonLimit);
  const overflowCandidates = overflowCount > 0
    ? [...normalizedCandidates]
      .sort((left, right) => left.effective_weight - right.effective_weight || left.input_index - right.input_index)
      .slice(0, overflowCount)
    : [];
  const evictedIds = [...new Set([...lowWeightCandidates, ...overflowCandidates].map((candidate) => candidate.canon_id))];
  const evictionRequired = safeCanonCount > safeCanonLimit || lowWeightCandidates.length > 0;
  const output = {
    canon_count: safeCanonCount,
    canon_limit: safeCanonLimit,
    lowest_effective_weight: normalizedCandidates.length > 0
      ? Math.min(...normalizedCandidates.map((candidate) => candidate.effective_weight))
      : 1,
    effective_weight: normalizedCandidates.length > 0
      ? Math.min(...normalizedCandidates.map((candidate) => candidate.effective_weight))
      : 1,
    eviction_required: evictionRequired,
    eviction_executed: evictionRequired,
    evicted_ids: evictionRequired ? evictedIds : [],
    phase13_eviction_scope: "active_canon_candidate_only",
    phase13_evidence_preservation: {
      raw_log_preserved: true,
      source_event_preserved: true,
      evidence_store_preserved: true,
      deletion_allowed: false,
    },
  };
  assertPhase13CanonEvictionSafe(output, "Phase13 canon eviction");
  return output;
}

function assertPhase13CanonEvictionSafe(output, context) {
  if (output.canon_count > output.canon_limit && output.eviction_required !== true) {
    throw new ContractError(`${context}: canon limit overflow requires eviction`);
  }
  if (output.effective_weight < 0.2 && output.eviction_required !== true) {
    throw new ContractError(`${context}: low effective weight requires eviction`);
  }
  if (output.eviction_required === true) {
    if (output.eviction_executed !== true || !Array.isArray(output.evicted_ids) || output.evicted_ids.length === 0) {
      throw new ContractError(`${context}: required eviction must execute safely`);
    }
    if (output.phase13_eviction_scope !== "active_canon_candidate_only") {
      throw new ContractError(`${context}: eviction scope must remain active canon candidate only`);
    }
  }
}

export function resolvePhase13CanonConflict(candidates, context = "Phase13 canon conflict") {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new ContractError(`${context}: candidates required`);
  }
  const normalized = candidates.map((candidate, index) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new ContractError(`${context}: candidate object required`);
    }
    assertScore("stability", Number(candidate.stability ?? 0));
    assertScore("identity_match", Number(candidate.identity_match ?? 0));
    return {
      canon_id: candidate.canon_id ?? candidate.canon_item_id ?? candidate.id,
      stability: Number(candidate.stability ?? 0),
      identity_match: Number(candidate.identity_match ?? 0),
      created_at_ms: Number(candidate.created_at_ms ?? candidate.updated_at_ms ?? 0),
      input_index: index,
    };
  });
  const resolved = normalized.toSorted((left, right) =>
    right.stability - left.stability ||
    right.identity_match - left.identity_match ||
    right.created_at_ms - left.created_at_ms ||
    left.input_index - right.input_index
  )[0];
  if (!resolved.canon_id) {
    throw new ContractError(`${context}: resolved canon id required`);
  }
  const output = {
    conflict_detected: candidates.length > 1,
    resolved_canon_id: resolved.canon_id,
    resolution_order: ["stability", "identity_match", "newer"],
    deterministic: true,
  };
  assertPhase13ConflictResolutionSafe(output, context);
  return output;
}

function normalizeEvictionCandidate(candidate, index) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new ContractError("Phase13 canon eviction: candidate object required");
  }
  const canonId = candidate.canon_id ?? candidate.canon_item_id ?? candidate.id;
  if (!canonId) {
    throw new ContractError("Phase13 canon eviction: candidate id required");
  }
  const effectiveWeight = Number(candidate.effective_weight ?? 1);
  assertScore("effective_weight", effectiveWeight);
  return {
    canon_id: canonId,
    effective_weight: effectiveWeight,
    input_index: index,
  };
}

function normalizeCount(value, field) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) {
    throw new ContractError(`Phase13 canon eviction: invalid ${field}`);
  }
  return count;
}

function assertPhase13ConflictResolutionSafe(output, context) {
  const conflictDetected = output.phase13_conflict_detected ?? output.conflict_detected;
  const resolvedCanonId = output.phase13_resolved_canon_id ?? output.resolved_canon_id;
  const order = output.phase13_conflict_resolution_order ?? output.resolution_order;
  if (conflictDetected === true && !resolvedCanonId) {
    throw new ContractError(`${context}: conflict must resolve canon id`);
  }
  if (
    !Array.isArray(order) ||
    order[0] !== "stability" ||
    order[1] !== "identity_match" ||
    order[2] !== "newer"
  ) {
    throw new ContractError(`${context}: deterministic conflict resolution order required`);
  }
  if (output.deterministic === false) {
    throw new ContractError(`${context}: conflict resolution must be deterministic`);
  }
}

function assertNoPhase13EvidenceDeletion(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPhase13EvidenceDeletion(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (PHASE13_EVIDENCE_DELETION_FIELDS.has(field)) {
      throw new ContractError(`${context}: canon eviction must preserve evidence`, {
        field,
        path,
      });
    }
    assertNoPhase13EvidenceDeletion(child, context, `${path}.${field}`);
  }
}
