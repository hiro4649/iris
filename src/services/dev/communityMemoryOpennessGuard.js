import {
  ContractError,
  assertNoDirectCandidateCommit,
  assertNoDirectMemoryWrite,
  assertNoWorldCommand,
} from "../../core/contracts.js";

const REPORT_FIELDS = new Set([
  "schema",
  "ok",
  "status",
  "external_real_evidence_status",
  "next_readiness_state",
  "production_ready_allowed",
  "go_no_go",
  "candidate_gate_summary",
  "openness_guard_summary",
  "canon_boundary_summary",
  "raw_leak_guard_summary",
  "production_handoff_summary",
  "boundary_policy",
]);

const CANDIDATE_GATE_FIELDS = new Set([
  "schema",
  "community_memory_candidate_count",
  "greeting_ritual_candidate_count",
  "recurring_joke_candidate_count",
  "safe_meme_candidate_count",
  "approved_community_memory_count",
  "approval_required",
  "validator_required",
  "persistence_writer_handoff_count",
]);

const OPENNESS_GUARD_FIELDS = new Set([
  "schema",
  "newcomer_explanation_candidate_count",
  "newcomer_friendliness_status",
  "over_insider_risk_status",
  "exclusive_callout_risk_status",
  "specific_viewer_overexposure_status",
  "community_openness_safe_flag",
]);

const CANON_BOUNDARY_FIELDS = new Set([
  "schema",
  "community_lore_to_anime_canon_count",
  "fan_memory_to_anime_canon_count",
  "non_canon_play_to_anime_canon_count",
  "anime_canon_mutation_allowed",
  "canon_review_status",
]);

const RAW_LEAK_GUARD_FIELDS = new Set([
  "schema",
  "safe_summary_only",
  "raw_viewer_text_count",
  "private_memory_count",
  "raw_origin_text_count",
  "candidate_payload_count",
  "private_viewer_id_count",
  "unsafe_value_leak_detected",
]);

const HANDOFF_FIELDS = new Set([
  "schema",
  "fixture_rehearsal_only",
  "approved_community_memory_not_written",
  "persistence_writer_not_called",
  "safe_summary_only",
  "production_ready_allowed",
  "go_no_go",
  "next_validation_script",
]);

const BOUNDARY_FIELDS = new Set([
  "greeting_ritual_candidate_only",
  "recurring_joke_candidate_only",
  "safe_meme_candidate_only",
  "approval_before_community_memory",
  "newcomer_explanation_candidate_required",
  "over_insider_risk_flagged",
  "specific_viewer_overexposure_guarded",
  "community_lore_not_anime_canon",
  "fan_memory_not_anime_canon",
  "non_canon_play_not_anime_canon",
  "no_raw_viewer_text",
  "no_private_memory",
  "no_raw_origin_text",
  "no_candidate_payload",
  "no_private_viewer_id",
  "no_direct_persistence_writer",
  "production_ready_not_allowed",
]);

export function createCommunityMemoryOpennessGuardReport() {
  const report = {
    schema: "iris_community_memory_openness_guard_v1",
    ok: false,
    status: "blocked",
    external_real_evidence_status: "external_real_evidence_blocked",
    next_readiness_state: "operator_review_required",
    production_ready_allowed: false,
    go_no_go: "no_go",
    candidate_gate_summary: {
      schema: "iris_community_memory_candidate_gate_summary_v1",
      community_memory_candidate_count: 3,
      greeting_ritual_candidate_count: 1,
      recurring_joke_candidate_count: 1,
      safe_meme_candidate_count: 1,
      approved_community_memory_count: 0,
      approval_required: true,
      validator_required: true,
      persistence_writer_handoff_count: 0,
    },
    openness_guard_summary: {
      schema: "iris_community_memory_openness_safe_summary_v1",
      newcomer_explanation_candidate_count: 1,
      newcomer_friendliness_status: "explanation_candidate_required",
      over_insider_risk_status: "operator_review_required",
      exclusive_callout_risk_status: "blocked",
      specific_viewer_overexposure_status: "guarded",
      community_openness_safe_flag: true,
    },
    canon_boundary_summary: {
      schema: "iris_community_memory_canon_boundary_summary_v1",
      community_lore_to_anime_canon_count: 0,
      fan_memory_to_anime_canon_count: 0,
      non_canon_play_to_anime_canon_count: 0,
      anime_canon_mutation_allowed: false,
      canon_review_status: "operator_review_required",
    },
    raw_leak_guard_summary: {
      schema: "iris_community_memory_raw_leak_guard_summary_v1",
      safe_summary_only: true,
      raw_viewer_text_count: 0,
      private_memory_count: 0,
      raw_origin_text_count: 0,
      candidate_payload_count: 0,
      private_viewer_id_count: 0,
      unsafe_value_leak_detected: false,
    },
    production_handoff_summary: {
      schema: "iris_community_memory_production_handoff_summary_v1",
      fixture_rehearsal_only: true,
      approved_community_memory_not_written: true,
      persistence_writer_not_called: true,
      safe_summary_only: true,
      production_ready_allowed: false,
      go_no_go: "no_go",
      next_validation_script: "node scripts/dev-community-memory-openness-guard.js",
    },
    boundary_policy: {
      greeting_ritual_candidate_only: true,
      recurring_joke_candidate_only: true,
      safe_meme_candidate_only: true,
      approval_before_community_memory: true,
      newcomer_explanation_candidate_required: true,
      over_insider_risk_flagged: true,
      specific_viewer_overexposure_guarded: true,
      community_lore_not_anime_canon: true,
      fan_memory_not_anime_canon: true,
      non_canon_play_not_anime_canon: true,
      no_raw_viewer_text: true,
      no_private_memory: true,
      no_raw_origin_text: true,
      no_candidate_payload: true,
      no_private_viewer_id: true,
      no_direct_persistence_writer: true,
      production_ready_not_allowed: true,
    },
  };

  report.raw_leak_guard_summary.unsafe_value_leak_detected =
    hasUnsafeValueLeak(report);
  report.ok =
    report.production_ready_allowed === false &&
    report.go_no_go === "no_go" &&
    report.candidate_gate_summary.approved_community_memory_count === 0 &&
    report.candidate_gate_summary.persistence_writer_handoff_count === 0 &&
    report.openness_guard_summary.community_openness_safe_flag === true &&
    report.canon_boundary_summary.community_lore_to_anime_canon_count === 0 &&
    report.canon_boundary_summary.fan_memory_to_anime_canon_count === 0 &&
    report.canon_boundary_summary.non_canon_play_to_anime_canon_count === 0 &&
    report.canon_boundary_summary.anime_canon_mutation_allowed === false &&
    report.raw_leak_guard_summary.raw_viewer_text_count === 0 &&
    report.raw_leak_guard_summary.private_memory_count === 0 &&
    report.raw_leak_guard_summary.raw_origin_text_count === 0 &&
    report.raw_leak_guard_summary.candidate_payload_count === 0 &&
    report.raw_leak_guard_summary.private_viewer_id_count === 0 &&
    report.raw_leak_guard_summary.unsafe_value_leak_detected === false;

  assertCommunityMemoryOpennessGuardReportSafe(report);
  return report;
}

export function assertCommunityMemoryOpennessGuardReportSafe(
  report,
  context = "community memory openness guard"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  assertFields(report, REPORT_FIELDS, context, "report");
  if (
    report.schema !== "iris_community_memory_openness_guard_v1" ||
    report.ok !== true ||
    report.status !== "blocked" ||
    report.external_real_evidence_status !== "external_real_evidence_blocked" ||
    report.next_readiness_state !== "operator_review_required" ||
    report.production_ready_allowed !== false ||
    report.go_no_go !== "no_go"
  ) {
    throw new ContractError(`${context}: no-go invariant mismatch`);
  }

  assertCandidateGateSummarySafe(report.candidate_gate_summary, context);
  assertOpennessGuardSummarySafe(report.openness_guard_summary, context);
  assertCanonBoundarySummarySafe(report.canon_boundary_summary, context);
  assertRawLeakGuardSummarySafe(report.raw_leak_guard_summary, context);
  assertProductionHandoffSummarySafe(report.production_handoff_summary, context);
  assertBoundaryPolicySafe(report.boundary_policy, context);
  assertNoWorldCommand(report, context);
  assertNoDirectMemoryWrite(report, context);
  assertNoDirectCandidateCommit(report, context);
  assertNoUnsafeReportLeak(report, context);
}

function assertCandidateGateSummarySafe(summary, context) {
  assertFields(summary, CANDIDATE_GATE_FIELDS, context, "candidate gate");
  if (
    summary.schema !== "iris_community_memory_candidate_gate_summary_v1" ||
    summary.community_memory_candidate_count !== 3 ||
    summary.greeting_ritual_candidate_count !== 1 ||
    summary.recurring_joke_candidate_count !== 1 ||
    summary.safe_meme_candidate_count !== 1 ||
    summary.approved_community_memory_count !== 0 ||
    summary.approval_required !== true ||
    summary.validator_required !== true ||
    summary.persistence_writer_handoff_count !== 0
  ) {
    throw new ContractError(`${context}: candidate gate mismatch`);
  }
}

function assertOpennessGuardSummarySafe(summary, context) {
  assertFields(summary, OPENNESS_GUARD_FIELDS, context, "openness guard");
  if (
    summary.schema !== "iris_community_memory_openness_safe_summary_v1" ||
    summary.newcomer_explanation_candidate_count !== 1 ||
    summary.newcomer_friendliness_status !== "explanation_candidate_required" ||
    summary.over_insider_risk_status !== "operator_review_required" ||
    summary.exclusive_callout_risk_status !== "blocked" ||
    summary.specific_viewer_overexposure_status !== "guarded" ||
    summary.community_openness_safe_flag !== true
  ) {
    throw new ContractError(`${context}: openness guard mismatch`);
  }
}

function assertCanonBoundarySummarySafe(summary, context) {
  assertFields(summary, CANON_BOUNDARY_FIELDS, context, "canon boundary");
  if (
    summary.schema !== "iris_community_memory_canon_boundary_summary_v1" ||
    summary.community_lore_to_anime_canon_count !== 0 ||
    summary.fan_memory_to_anime_canon_count !== 0 ||
    summary.non_canon_play_to_anime_canon_count !== 0 ||
    summary.anime_canon_mutation_allowed !== false ||
    summary.canon_review_status !== "operator_review_required"
  ) {
    throw new ContractError(`${context}: canon boundary mismatch`);
  }
}

function assertRawLeakGuardSummarySafe(summary, context) {
  assertFields(summary, RAW_LEAK_GUARD_FIELDS, context, "raw leak guard");
  if (
    summary.schema !== "iris_community_memory_raw_leak_guard_summary_v1" ||
    summary.safe_summary_only !== true ||
    summary.unsafe_value_leak_detected !== false
  ) {
    throw new ContractError(`${context}: raw leak guard mismatch`);
  }
  for (const field of [
    "raw_viewer_text_count",
    "private_memory_count",
    "raw_origin_text_count",
    "candidate_payload_count",
    "private_viewer_id_count",
  ]) {
    if (summary[field] !== 0) {
      throw new ContractError(`${context}: raw leak count must remain zero`, {
        field,
      });
    }
  }
}

function assertProductionHandoffSummarySafe(summary, context) {
  assertFields(summary, HANDOFF_FIELDS, context, "production handoff");
  if (
    summary.schema !== "iris_community_memory_production_handoff_summary_v1" ||
    summary.fixture_rehearsal_only !== true ||
    summary.approved_community_memory_not_written !== true ||
    summary.persistence_writer_not_called !== true ||
    summary.safe_summary_only !== true ||
    summary.production_ready_allowed !== false ||
    summary.go_no_go !== "no_go" ||
    summary.next_validation_script !==
      "node scripts/dev-community-memory-openness-guard.js"
  ) {
    throw new ContractError(`${context}: production handoff mismatch`);
  }
}

function assertBoundaryPolicySafe(policy, context) {
  assertFields(policy, BOUNDARY_FIELDS, context, "boundary policy");
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy failed`, { field });
    }
  }
}

function assertFields(value, expectedFields, context, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: ${label} required`);
  }
  for (const field of Object.keys(value)) {
    if (!expectedFields.has(field)) {
      throw new ContractError(`${context}: unexpected ${label} field`, { field });
    }
  }
  for (const field of expectedFields) {
    if (!(field in value)) {
      throw new ContractError(`${context}: missing ${label} field`, { field });
    }
  }
}

function hasUnsafeValueLeak(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return unsafeStringValue(value);
  if (Array.isArray(value)) return value.some(hasUnsafeValueLeak);
  if (typeof value !== "object") return false;
  return Object.values(value).some(hasUnsafeValueLeak);
}

function unsafeStringValue(value) {
  return /(?:https?:\/\/|Bearer\s+|sk-[A-Za-z0-9]|BEGIN [A-Z ]*PRIVATE KEY|postgres(?:ql)?:\/\/|mysql:\/\/|mongodb:\/\/|sqlite:\/\/|[A-Za-z]:\\|\/home\/|\/Users\/|raw_viewer_text|private_memory|raw_origin_text|candidate_payload|private_viewer_id)/i.test(
    value
  );
}

function assertNoUnsafeReportLeak(report, context) {
  if (hasUnsafeValueLeak(report)) {
    throw new ContractError(`${context}: unsafe value leak detected`);
  }
}
