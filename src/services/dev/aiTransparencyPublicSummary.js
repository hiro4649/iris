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
  "public_disclosure_summary",
  "operator_memory_sponsor_summary",
  "raw_leak_guard_summary",
  "production_handoff_summary",
  "boundary_policy",
]);

const PUBLIC_DISCLOSURE_FIELDS = new Set([
  "schema",
  "line_count",
  "summary_lines",
  "identity_label",
  "human_claim_status",
  "operator_management_label",
  "viewer_trust_label",
]);

const OPERATOR_MEMORY_SPONSOR_FIELDS = new Set([
  "schema",
  "operator_review_status",
  "operator_override_status",
  "emergency_stop_status",
  "memory_disclosure_status",
  "relationship_memory_disclosure_status",
  "sponsor_disclosure_status",
  "monetization_disclosure_status",
  "owner_confirmation_status",
]);

const RAW_LEAK_GUARD_FIELDS = new Set([
  "schema",
  "safe_summary_only",
  "raw_prompt_count",
  "raw_response_count",
  "raw_viewer_text_count",
  "private_memory_count",
  "support_message_count",
  "candidate_payload_count",
  "command_payload_count",
  "endpoint_value_count",
  "credential_value_count",
  "unsafe_value_leak_detected",
]);

const HANDOFF_FIELDS = new Set([
  "schema",
  "public_publish_not_performed",
  "operator_review_required",
  "safe_public_summary_only",
  "production_ready_allowed",
  "go_no_go",
  "next_validation_script",
]);

const BOUNDARY_FIELDS = new Set([
  "ai_identity_disclosed",
  "human_person_claim_forbidden",
  "operator_management_disclosed",
  "memory_use_disclosed",
  "sponsor_disclosure_required",
  "operator_review_before_publication",
  "emergency_stop_available",
  "no_raw_prompts",
  "no_raw_responses",
  "no_raw_viewer_text",
  "no_private_memory",
  "no_support_messages",
  "no_candidate_payloads",
  "no_command_payloads",
  "no_endpoint_values",
  "no_credential_values",
  "production_ready_not_allowed",
]);

const SAFE_PUBLIC_LINES = [
  "IRIS is an AI VTuber, not a human person.",
  "IRIS is operator-managed, with review and emergency stop available.",
  "Memory, sponsorship, and monetization notices use short public summaries.",
];

export function createAiTransparencyPublicSummaryReport() {
  const report = {
    schema: "iris_ai_transparency_public_summary_boundary_v1",
    ok: false,
    status: "blocked",
    external_real_evidence_status: "external_real_evidence_blocked",
    next_readiness_state: "owner_confirmation_required",
    production_ready_allowed: false,
    go_no_go: "no_go",
    public_disclosure_summary: {
      schema: "iris_ai_transparency_public_disclosure_summary_v1",
      line_count: SAFE_PUBLIC_LINES.length,
      summary_lines: SAFE_PUBLIC_LINES,
      identity_label: "ai_vtuber",
      human_claim_status: "human_person_claim_forbidden",
      operator_management_label: "operator_managed",
      viewer_trust_label: "transparent_operation",
    },
    operator_memory_sponsor_summary: {
      schema: "iris_ai_transparency_operator_memory_sponsor_summary_v1",
      operator_review_status: "operator_review_required",
      operator_override_status: "operator_override_available",
      emergency_stop_status: "emergency_stop_available",
      memory_disclosure_status: "memory_enabled_safe_summary",
      relationship_memory_disclosure_status: "relationship_memory_safe_summary",
      sponsor_disclosure_status: "sponsor_disclosure_required",
      monetization_disclosure_status: "monetization_disclosure_required",
      owner_confirmation_status: "owner_confirmation_required",
    },
    raw_leak_guard_summary: {
      schema: "iris_ai_transparency_raw_leak_guard_summary_v1",
      safe_summary_only: true,
      raw_prompt_count: 0,
      raw_response_count: 0,
      raw_viewer_text_count: 0,
      private_memory_count: 0,
      support_message_count: 0,
      candidate_payload_count: 0,
      command_payload_count: 0,
      endpoint_value_count: 0,
      credential_value_count: 0,
      unsafe_value_leak_detected: false,
    },
    production_handoff_summary: {
      schema: "iris_ai_transparency_production_handoff_summary_v1",
      public_publish_not_performed: true,
      operator_review_required: true,
      safe_public_summary_only: true,
      production_ready_allowed: false,
      go_no_go: "no_go",
      next_validation_script: "node scripts/dev-ai-transparency-public-summary.js",
    },
    boundary_policy: {
      ai_identity_disclosed: true,
      human_person_claim_forbidden: true,
      operator_management_disclosed: true,
      memory_use_disclosed: true,
      sponsor_disclosure_required: true,
      operator_review_before_publication: true,
      emergency_stop_available: true,
      no_raw_prompts: true,
      no_raw_responses: true,
      no_raw_viewer_text: true,
      no_private_memory: true,
      no_support_messages: true,
      no_candidate_payloads: true,
      no_command_payloads: true,
      no_endpoint_values: true,
      no_credential_values: true,
      production_ready_not_allowed: true,
    },
  };

  report.raw_leak_guard_summary.unsafe_value_leak_detected =
    hasUnsafeValueLeak(report);
  report.ok =
    report.production_ready_allowed === false &&
    report.go_no_go === "no_go" &&
    report.public_disclosure_summary.human_claim_status ===
      "human_person_claim_forbidden" &&
    report.raw_leak_guard_summary.raw_prompt_count === 0 &&
    report.raw_leak_guard_summary.raw_response_count === 0 &&
    report.raw_leak_guard_summary.raw_viewer_text_count === 0 &&
    report.raw_leak_guard_summary.private_memory_count === 0 &&
    report.raw_leak_guard_summary.support_message_count === 0 &&
    report.raw_leak_guard_summary.candidate_payload_count === 0 &&
    report.raw_leak_guard_summary.command_payload_count === 0 &&
    report.raw_leak_guard_summary.endpoint_value_count === 0 &&
    report.raw_leak_guard_summary.credential_value_count === 0 &&
    report.raw_leak_guard_summary.unsafe_value_leak_detected === false;

  assertAiTransparencyPublicSummaryReportSafe(report);
  return report;
}

export function assertAiTransparencyPublicSummaryReportSafe(
  report,
  context = "ai transparency public summary boundary"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  assertFields(report, REPORT_FIELDS, context, "report");
  if (
    report.schema !== "iris_ai_transparency_public_summary_boundary_v1" ||
    report.ok !== true ||
    report.status !== "blocked" ||
    report.external_real_evidence_status !== "external_real_evidence_blocked" ||
    report.next_readiness_state !== "owner_confirmation_required" ||
    report.production_ready_allowed !== false ||
    report.go_no_go !== "no_go"
  ) {
    throw new ContractError(`${context}: no-go invariant mismatch`);
  }

  assertPublicDisclosureSummarySafe(report.public_disclosure_summary, context);
  assertOperatorMemorySponsorSummarySafe(
    report.operator_memory_sponsor_summary,
    context
  );
  assertRawLeakGuardSummarySafe(report.raw_leak_guard_summary, context);
  assertProductionHandoffSummarySafe(report.production_handoff_summary, context);
  assertBoundaryPolicySafe(report.boundary_policy, context);
  assertNoWorldCommand(report, context);
  assertNoDirectMemoryWrite(report, context);
  assertNoDirectCandidateCommit(report, context);
  assertNoUnsafeReportLeak(report, context);
}

function assertPublicDisclosureSummarySafe(summary, context) {
  assertFields(summary, PUBLIC_DISCLOSURE_FIELDS, context, "public disclosure");
  if (
    summary.schema !== "iris_ai_transparency_public_disclosure_summary_v1" ||
    summary.line_count !== SAFE_PUBLIC_LINES.length ||
    !Array.isArray(summary.summary_lines) ||
    summary.summary_lines.length !== summary.line_count ||
    summary.identity_label !== "ai_vtuber" ||
    summary.human_claim_status !== "human_person_claim_forbidden" ||
    summary.operator_management_label !== "operator_managed" ||
    summary.viewer_trust_label !== "transparent_operation"
  ) {
    throw new ContractError(`${context}: public disclosure mismatch`);
  }
  for (const line of summary.summary_lines) {
    if (!SAFE_PUBLIC_LINES.includes(line) || unsafeStringValue(line)) {
      throw new ContractError(`${context}: unsafe public disclosure line`);
    }
  }
}

function assertOperatorMemorySponsorSummarySafe(summary, context) {
  assertFields(
    summary,
    OPERATOR_MEMORY_SPONSOR_FIELDS,
    context,
    "operator memory sponsor"
  );
  for (const value of Object.values(summary)) {
    if (typeof value !== "string" || unsafeStringValue(value)) {
      throw new ContractError(`${context}: unsafe operator disclosure label`);
    }
  }
  if (
    summary.schema !==
      "iris_ai_transparency_operator_memory_sponsor_summary_v1" ||
    summary.operator_review_status !== "operator_review_required" ||
    summary.emergency_stop_status !== "emergency_stop_available" ||
    summary.owner_confirmation_status !== "owner_confirmation_required"
  ) {
    throw new ContractError(`${context}: operator disclosure mismatch`);
  }
}

function assertRawLeakGuardSummarySafe(summary, context) {
  assertFields(summary, RAW_LEAK_GUARD_FIELDS, context, "raw leak guard");
  if (
    summary.schema !== "iris_ai_transparency_raw_leak_guard_summary_v1" ||
    summary.safe_summary_only !== true ||
    summary.unsafe_value_leak_detected !== false
  ) {
    throw new ContractError(`${context}: raw leak guard mismatch`);
  }
  for (const field of [
    "raw_prompt_count",
    "raw_response_count",
    "raw_viewer_text_count",
    "private_memory_count",
    "support_message_count",
    "candidate_payload_count",
    "command_payload_count",
    "endpoint_value_count",
    "credential_value_count",
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
    summary.schema !== "iris_ai_transparency_production_handoff_summary_v1" ||
    summary.public_publish_not_performed !== true ||
    summary.operator_review_required !== true ||
    summary.safe_public_summary_only !== true ||
    summary.production_ready_allowed !== false ||
    summary.go_no_go !== "no_go" ||
    summary.next_validation_script !==
      "node scripts/dev-ai-transparency-public-summary.js"
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
  return /(?:https?:\/\/|Bearer\s+|sk-[A-Za-z0-9]|BEGIN [A-Z ]*PRIVATE KEY|postgres(?:ql)?:\/\/|mysql:\/\/|mongodb:\/\/|sqlite:\/\/|[A-Za-z]:\\|\/home\/|\/Users\/|raw_prompt|raw_response|raw_viewer_text|private_memory|support_message|candidate_payload|command_payload)/i.test(
    value
  );
}

function assertNoUnsafeReportLeak(report, context) {
  if (hasUnsafeValueLeak(report)) {
    throw new ContractError(`${context}: unsafe value leak detected`);
  }
}
