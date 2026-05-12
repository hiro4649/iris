import {
  ContractError,
  assertCandidateNotExecutable,
  assertNoWorldCommand,
} from "../../core/contracts.js";

const RITUAL_KINDS = new Set(["greeting_ritual", "recurring_joke", "safe_meme"]);
const FORBIDDEN_FIELDS = new Set([
  "world_command",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "community_memory",
  "approved_memory_record",
  "approved_community_memory_record",
]);

export function createCommunityRitualCandidate({
  ritualKind = "safe_meme",
  summary = "",
  traceId = null,
  eventId = null,
} = {}) {
  const candidate = {
    schema: "iris_community_ritual_candidate_v1",
    candidate_kind: "community_ritual_candidate",
    ritual_kind: RITUAL_KINDS.has(ritualKind) ? ritualKind : "safe_meme",
    requires_validation: true,
    approval_status: "pending_review",
    trace_id: traceId,
    event_id: eventId,
    safe_summary: safeSummary(summary),
    community_memory_write_allowed: false,
    review_route: "community_ritual_review",
  };
  assertCommunityRitualCandidateSafe(candidate);
  return candidate;
}

export function assertCommunityRitualCandidateSafe(
  candidate,
  context = "community ritual candidate"
) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new ContractError(`${context}: candidate required`);
  }
  assertNoWorldCommand(candidate, context);
  assertNoForbiddenFields(candidate, context);
  assertCandidateNotExecutable(candidate, context);
  if (candidate.schema !== "iris_community_ritual_candidate_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (candidate.candidate_kind !== "community_ritual_candidate") {
    throw new ContractError(`${context}: invalid candidate kind`);
  }
  if (!RITUAL_KINDS.has(candidate.ritual_kind)) {
    throw new ContractError(`${context}: invalid ritual kind`);
  }
  if (candidate.approval_status !== "pending_review") {
    throw new ContractError(`${context}: approval must remain pending`);
  }
  if (candidate.community_memory_write_allowed !== false) {
    throw new ContractError(`${context}: community memory write must wait for approval`);
  }
  if (candidate.review_route !== "community_ritual_review") {
    throw new ContractError(`${context}: invalid review route`);
  }
}

export function assertCommunityRitualApprovalBoundary(
  value,
  context = "community ritual approval boundary"
) {
  assertNoWorldCommand(value, context);
  assertNoForbiddenFields(value, context);
  if (value?.candidate_kind === "community_ritual_candidate") {
    assertCommunityRitualCandidateSafe(value, context);
  }
}

function safeSummary(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function assertNoForbiddenFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenFields(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: ritual candidate must not commit community memory`, {
        field,
        path,
      });
    }
    assertNoForbiddenFields(child, context, `${path}.${field}`);
  }
}
