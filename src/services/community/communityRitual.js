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
const COMMUNITY_RITUAL_MEMORY_E2E_FIELDS = new Set([
  "schema",
  "ritual_kind",
  "candidate_status",
  "approval_status",
  "privacy_validation_status",
  "safety_validation_status",
  "canon_validation_status",
  "newcomer_friendliness_status",
  "memory_promotion_allowed",
  "direct_write_allowed",
  "boundary_policy",
  "adapter_validation_required",
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

export function createCommunityRitualMemoryE2ESummary({
  ritualKind = "safe_meme",
  summary = "shared safe meme",
  traceId = null,
  eventId = null,
} = {}) {
  const candidate = createCommunityRitualCandidate({ ritualKind, summary, traceId, eventId });
  const e2eSummary = {
    schema: "iris_community_ritual_memory_e2e_summary_v1",
    ritual_kind: candidate.ritual_kind,
    candidate_status: candidate.requires_validation === true ? "validation_required" : "invalid",
    approval_status: candidate.approval_status,
    privacy_validation_status: "required_before_promotion",
    safety_validation_status: "required_before_promotion",
    canon_validation_status: "required_before_promotion",
    newcomer_friendliness_status: "required_before_promotion",
    memory_promotion_allowed: false,
    direct_write_allowed: false,
    boundary_policy: {
      ritual_remains_candidate_before_approval: true,
      approval_required_before_promotion: true,
      privacy_validation_required: true,
      safety_validation_required: true,
      canon_validation_required: true,
      newcomer_friendliness_required: true,
      direct_write_forbidden: true,
      safe_summary_only: true,
    },
    adapter_validation_required: true,
  };
  assertCommunityRitualMemoryE2ESummarySafe(e2eSummary);
  return e2eSummary;
}

export function assertCommunityRitualMemoryE2ESummarySafe(
  summary,
  context = "community ritual memory E2E summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoWorldCommand(summary, context);
  assertNoForbiddenFields(summary, context);
  for (const field of Object.keys(summary)) {
    if (!COMMUNITY_RITUAL_MEMORY_E2E_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (summary.schema !== "iris_community_ritual_memory_e2e_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!RITUAL_KINDS.has(summary.ritual_kind)) {
    throw new ContractError(`${context}: invalid ritual kind`);
  }
  if (
    summary.candidate_status !== "validation_required" ||
    summary.approval_status !== "pending_review" ||
    summary.memory_promotion_allowed !== false ||
    summary.direct_write_allowed !== false
  ) {
    throw new ContractError(`${context}: ritual must not be promoted before approval`);
  }
  for (const field of [
    "privacy_validation_status",
    "safety_validation_status",
    "canon_validation_status",
    "newcomer_friendliness_status",
  ]) {
    if (summary[field] !== "required_before_promotion") {
      throw new ContractError(`${context}: validation status required`, { field });
    }
  }
  assertBoundaryPolicySafe(summary.boundary_policy, context);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function safeSummary(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function assertBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const value of Object.values(policy)) {
    if (value !== true) {
      throw new ContractError(`${context}: boundary policy flags must be true`);
    }
  }
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
