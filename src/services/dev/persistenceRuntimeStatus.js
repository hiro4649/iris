import { ContractError } from "../../core/contracts.js";
import {
  assertPersistencePreflightReportSafe,
  createPersistencePreflightReport,
} from "./persistencePreflight.js";
import {
  assertPersistenceStatusSafe,
  createPersistenceStatus,
} from "./persistenceStatus.js";

const FORBIDDEN_PERSISTENCE_RUNTIME_STATUS_FIELDS = new Set([
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
  "memory_carryover_candidates",
  "community_memory_candidates",
  "viewer_id",
  "viewerId",
  "author_id",
  "authorId",
  "channel_id",
  "channelId",
  "author_channel_id",
  "authorChannelId",
  "identity_id",
  "identityId",
  "linked_identity_id",
  "linkedIdentityId",
  "display_name",
  "displayName",
  "approved_memory_record",
  "approved_relationship_record",
  "memory_records",
  "relationship_profiles",
  "records",
  "profiles",
  "summary",
  "recent_summaries",
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
  "value",
  "payload",
]);

const RUNTIME_STATUSES = new Set([
  "attention_required",
  "runtime_unavailable",
  "configured_waiting_for_records",
  "active_with_memory",
  "active_with_memory_and_relationships",
  "partial_relationship_memory",
  "runtime_attention",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "operator_review_required",
]);
const PREFLIGHT_STATUSES = new Set([
  "ready_to_persist_memory_and_relationships",
  "blocked_by_configuration",
]);
const PERSISTENCE_RUNTIME_STATUS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "runtime_status",
  "next_readiness_state",
  "readiness_state_counts",
  "preflight_status",
  "preflight_attention_reason_count",
  "preflight_next_attention_reason",
  "json_store_status",
  "vector_memory_status",
  "persistence_mode",
  "vector_memory_mode",
  "memory_store_path_configured",
  "relationship_store_path_configured",
  "candidate_persistence_ready",
  "relationship_memory_ready",
  "vector_memory_adapter_ready",
  "vector_memory_target_policy_status",
  "persistence_status_available",
  "persistence_readiness_status",
  "persistence_runtime_state",
  "next_runtime_check_script",
  "runtime_counts",
  "store_health",
  "approved_record_flow",
  "identity_scope_flow",
  "candidate_commit_flow",
  "relationship_value_flow",
  "long_term_recall_flow",
  "memory_relationship_lifecycle_flow",
  "production_handoff_summary",
  "capability_flags",
  "persistence_policy",
  "boundary_policy",
  "adapter_validation_required",
]);
const READINESS_STATUSES = new Set([
  "disabled",
  "configured_waiting_for_records",
  "active_with_memory",
  "active_with_memory_and_relationships",
  "partial_relationship_memory",
  "attention",
]);
const APPROVED_RECORD_FLOW_STATUSES = new Set([
  "unavailable",
  "disabled",
  "waiting_for_records",
  "active_with_memory_only",
  "active_with_relationships_only",
  "active_with_memory_and_relationships",
  "attention",
]);
const CANDIDATE_COMMIT_FLOW_STATUSES = new Set([
  "unavailable",
  "validator_disabled",
  "waiting_for_runtime_event",
  "waiting_for_candidate_validation",
  "validation_blocked",
  "waiting_for_candidate_persistence",
  "persistence_attention",
  "commit_observed_waiting_for_status",
  "memory_commit_active",
  "relationship_commit_active",
  "memory_relationship_commit_active",
  "validation_gated_review_only",
]);
const CANDIDATE_COMMIT_BLOCKING_STAGES = new Set([
  "runtime_state",
  "validator",
  "persistence",
  "store_status",
  "none",
]);
const IDENTITY_SCOPE_FLOW_STATUSES = new Set([
  "unavailable",
  "disabled",
  "waiting_for_identity_scoped_records",
  "active_with_memory_only",
  "active_with_relationships_only",
  "active_with_memory_and_relationships",
  "attention",
]);
const RELATIONSHIP_VALUE_FLOW_STATUSES = new Set([
  "configuration_attention",
  "runtime_unavailable",
  "disabled",
  "waiting_for_relationship_profiles",
  "memory_available_waiting_for_relationships",
  "relationship_values_active",
  "relationship_values_attention",
]);
const RELATIONSHIP_VALUE_BLOCKING_STAGES = new Set([
  "configuration",
  "runtime",
  "candidate_gate",
  "store",
  "relationship_profiles",
  "none",
]);
const MEMORY_RELATIONSHIP_LIFECYCLE_FLOW_STATUSES = new Set([
  "configuration_attention",
  "runtime_unavailable",
  "waiting_for_approved_records",
  "memory_only_active",
  "relationship_only_active",
  "memory_and_relationship_active",
  "identity_scope_attention",
  "candidate_gate_attention",
  "store_attention",
]);
const MEMORY_RELATIONSHIP_LIFECYCLE_BLOCKING_STAGES = new Set([
  "configuration",
  "runtime",
  "candidate_gate",
  "store",
  "identity_scope",
  "none",
]);
const LONG_TERM_RECALL_FLOW_STATUSES = new Set([
  "configuration_attention",
  "runtime_unavailable",
  "disabled",
  "waiting_for_memory_records",
  "memory_recall_ready",
  "relationship_recall_ready",
  "memory_relationship_recall_ready",
  "recall_attention",
]);
const LONG_TERM_RECALL_BLOCKING_STAGES = new Set([
  "configuration",
  "runtime",
  "store",
  "records",
  "none",
]);
const RUNTIME_CHECK_SCRIPTS = {
  configuration: "npm run dev:persistence:preflight",
  runtime: "npm run dev:persistence:runtime-status",
  runtime_state: "npm run dev:persistence:candidate-gate-roundtrip",
  validator: "npm run dev:persistence:candidate-gate-roundtrip",
  persistence: "npm run dev:persistence:candidate-gate-roundtrip",
  store_status: "npm run dev:persistence:status-roundtrip",
  candidate_gate: "npm run dev:persistence:candidate-gate-roundtrip",
  store: "npm run dev:persistence:status-roundtrip",
  identity_scope: "npm run dev:persistence:roundtrip",
  records: "npm run dev:persistence:restart-roundtrip",
  relationship_profiles: "npm run dev:persistence:roundtrip",
  none: null,
};
const MEMORY_TYPE_KEYS = [
  "stream_experience",
  "game_experience",
  "media_watch_experience",
  "community",
  "relationship",
  "episodic",
  "semantic",
  "short_term",
];
const MEMORY_OWNER_SCOPE_KEYS = ["user", "community", "shared_stream"];
const RELATIONSHIP_LEVELS = [
  "new",
  "recognized",
  "familiar",
  "trusted",
  "long_term_friend",
  "bounded",
];
const URL_PATTERN = /https?:\/\//i;
const UNSAFE_STATUS_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload)\b|https?:\/\//i;

export function createPersistenceRuntimeStatusReport({
  env = process.env,
  runtime = null,
  streamState = null,
  generatedAtMs = Date.now(),
} = {}) {
  const preflight = createPersistencePreflightReport({ env, generatedAtMs });
  assertPersistencePreflightReportSafe(preflight, "persistence runtime preflight");
  const persistenceStatus = runtime
    ? createRuntimePersistenceStatus({ runtime, generatedAtMs })
    : null;
  if (persistenceStatus) {
    assertPersistenceStatusSafe(persistenceStatus, "persistence runtime status");
  }

  const runtimeStatus = summarizeRuntimeStatus({ preflight, persistenceStatus });
  const storeHealth = createStoreHealth(persistenceStatus);
  const approvedRecordFlow = createApprovedRecordFlowSummary(persistenceStatus);
  const identityScopeFlow = createIdentityScopeFlowSummary({
    persistenceStatus,
    storeHealth,
  });
  const candidateCommitFlow = createCandidateCommitFlowSummary({
    persistenceStatus,
    streamState,
    generatedAtMs,
    storeHealth,
  });
  const relationshipValueFlow = createRelationshipValueFlowSummary({
    preflight,
    persistenceStatus,
    identityScopeFlow,
    candidateCommitFlow,
    storeHealth,
  });
  const longTermRecallFlow = createLongTermRecallFlowSummary({
    preflight,
    persistenceStatus,
    approvedRecordFlow,
    identityScopeFlow,
    storeHealth,
  });
  const memoryRelationshipLifecycleFlow =
    createMemoryRelationshipLifecycleFlowSummary({
      preflight,
      persistenceStatus,
      approvedRecordFlow,
      identityScopeFlow,
      candidateCommitFlow,
      storeHealth,
    });
  const persistenceStatusAvailable =
    approvedRecordFlow.runtime_status_available === true ||
    identityScopeFlow.runtime_status_available === true ||
    candidateCommitFlow.runtime_status_available === true ||
    relationshipValueFlow.runtime_status_available === true ||
    longTermRecallFlow.runtime_status_available === true ||
    memoryRelationshipLifecycleFlow.runtime_status_available === true;
  const report = {
    schema: "iris_persistence_runtime_status_report_v1",
    generated_at_ms: generatedAtMs,
    runtime_status: runtimeStatus,
    next_readiness_state: firstReadinessState([
      memoryRelationshipLifecycleFlow,
      candidateCommitFlow,
      relationshipValueFlow,
      longTermRecallFlow,
      approvedRecordFlow,
      identityScopeFlow,
    ]),
    readiness_state_counts: countReadinessStates([
      approvedRecordFlow,
      identityScopeFlow,
      candidateCommitFlow,
      relationshipValueFlow,
      longTermRecallFlow,
      memoryRelationshipLifecycleFlow,
    ]),
    preflight_status: preflight.preflight_status,
    preflight_attention_reason_count: preflight.attention_reason_count,
    preflight_next_attention_reason: preflight.next_attention_reason,
    json_store_status: preflight.json_store_status,
    vector_memory_status: preflight.vector_memory_status,
    persistence_mode: preflight.persistence_mode,
    vector_memory_mode: preflight.vector_memory_mode,
    memory_store_path_configured: preflight.memory_store_path_configured,
    relationship_store_path_configured: preflight.relationship_store_path_configured,
    candidate_persistence_ready: preflight.candidate_persistence_ready,
    relationship_memory_ready: preflight.relationship_memory_ready,
    vector_memory_adapter_ready: preflight.vector_memory_adapter_ready,
    vector_memory_target_policy_status:
      preflight.vector_memory_target_policy_status,
    persistence_status_available: persistenceStatusAvailable,
    persistence_readiness_status:
      persistenceStatus?.persistence_readiness_status ?? null,
    persistence_runtime_state: persistenceStatus?.status ?? null,
    next_runtime_check_script: firstRuntimeCheckScript([
      memoryRelationshipLifecycleFlow,
      candidateCommitFlow,
      relationshipValueFlow,
      longTermRecallFlow,
    ]),
    runtime_counts: persistenceStatus?.public_counts ?? emptyPublicCounts(),
    store_health: storeHealth,
    approved_record_flow: approvedRecordFlow,
    identity_scope_flow: identityScopeFlow,
    candidate_commit_flow: candidateCommitFlow,
    relationship_value_flow: relationshipValueFlow,
    long_term_recall_flow: longTermRecallFlow,
    memory_relationship_lifecycle_flow: memoryRelationshipLifecycleFlow,
    production_handoff_summary: createPersistenceRuntimeProductionHandoffSummary({
      runtimeStatus,
      preflight,
      persistenceStatus,
      storeHealth,
      approvedRecordFlow,
      candidateCommitFlow,
      relationshipValueFlow,
      longTermRecallFlow,
      memoryRelationshipLifecycleFlow,
      identityScopeFlow,
      nextRuntimeCheckScript: firstRuntimeCheckScript([
        memoryRelationshipLifecycleFlow,
        candidateCommitFlow,
        relationshipValueFlow,
        longTermRecallFlow,
      ]),
    }),
    capability_flags: persistenceStatus?.enabled ?? emptyCapabilityFlags(),
    persistence_policy: preflight.persistence_policy,
    boundary_policy: {
      env_names_only: true,
      counts_only: true,
      no_secret_values: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
      no_raw_runtime_state: true,
      read_only_runtime_status: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertPersistenceRuntimeStatusReportSafe(report);
  return report;
}

export function assertPersistenceRuntimeStatusReportSafe(
  report,
  context = "persistence runtime status report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  assertNoForbiddenPersistenceRuntimeStatusFields(report, context);
  if (/https?:\/\//i.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (report.schema !== "iris_persistence_runtime_status_report_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!PERSISTENCE_RUNTIME_STATUS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (!RUNTIME_STATUSES.has(report.runtime_status)) {
    throw new ContractError(`${context}: invalid runtime status`);
  }
  if (!READINESS_STATES.has(report.next_readiness_state)) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  assertReadinessStateCountsSafe(
    report.readiness_state_counts,
    `${context}: readiness state counts`
  );
  const readinessFlows = [
    report.approved_record_flow,
    report.identity_scope_flow,
    report.candidate_commit_flow,
    report.relationship_value_flow,
    report.long_term_recall_flow,
    report.memory_relationship_lifecycle_flow,
  ];
  if (
    report.next_readiness_state !==
    firstReadinessState([
      report.memory_relationship_lifecycle_flow,
      report.candidate_commit_flow,
      report.relationship_value_flow,
      report.long_term_recall_flow,
      report.approved_record_flow,
      report.identity_scope_flow,
    ]) ||
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      countReadinessStates(readinessFlows)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state summary`);
  }
  if (!PREFLIGHT_STATUSES.has(report.preflight_status)) {
    throw new ContractError(`${context}: invalid preflight status`);
  }
  for (const field of [
    "preflight_attention_reason_count",
    "memory_store_path_configured",
    "relationship_store_path_configured",
    "candidate_persistence_ready",
    "relationship_memory_ready",
    "vector_memory_adapter_ready",
    "persistence_status_available",
  ]) {
    if (
      field === "preflight_attention_reason_count"
        ? !Number.isInteger(report[field]) || report[field] < 0
        : typeof report[field] !== "boolean"
    ) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    report.preflight_next_attention_reason !== null &&
    typeof report.preflight_next_attention_reason !== "string"
  ) {
    throw new ContractError(`${context}: invalid next attention reason`);
  }
  if (
    report.persistence_readiness_status !== null &&
    !READINESS_STATUSES.has(report.persistence_readiness_status)
  ) {
    throw new ContractError(`${context}: invalid persistence readiness`);
  }
  if (
    report.persistence_runtime_state !== null &&
    ![
      "disabled",
      "enabled_no_public_records_yet",
      "active_with_memory",
      "active_with_memory_and_relationships",
    ].includes(report.persistence_runtime_state)
  ) {
    throw new ContractError(`${context}: invalid persistence runtime state`);
  }
  assertSafeOptionalScriptName(
    report.next_runtime_check_script,
    `${context}: next runtime check script`
  );
  assertPublicCountsSafe(report.runtime_counts, context);
  assertStoreHealthSafe(report.store_health, context);
  assertApprovedRecordFlowSummarySafe(report.approved_record_flow, context);
  assertIdentityScopeFlowSummarySafe(report.identity_scope_flow, context);
  assertCandidateCommitFlowSummarySafe(report.candidate_commit_flow, context);
  assertRelationshipValueFlowSummarySafe(report.relationship_value_flow, context);
  assertLongTermRecallFlowSummarySafe(report.long_term_recall_flow, context);
  assertMemoryRelationshipLifecycleFlowSummarySafe(
    report.memory_relationship_lifecycle_flow,
    context
  );
  assertPersistenceRuntimeProductionHandoffSummarySafe(
    report.production_handoff_summary,
    report,
    context
  );
  if (
    report.next_runtime_check_script !==
    firstRuntimeCheckScript([
      report.memory_relationship_lifecycle_flow,
      report.candidate_commit_flow,
      report.relationship_value_flow,
      report.long_term_recall_flow,
    ])
  ) {
    throw new ContractError(`${context}: invalid next runtime check script`);
  }
  assertCapabilityFlagsSafe(report.capability_flags, context);
  assertPersistencePolicySafe(report.persistence_policy, context);
  assertBoundaryPolicy(report.boundary_policy, [
    "env_names_only",
    "counts_only",
    "no_secret_values",
    "no_store_paths",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
    "no_candidates",
    "no_commands",
    "no_raw_runtime_state",
    "read_only_runtime_status",
    "script_names_only",
  ], context);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertPersistenceRuntimeProductionHandoffSummarySafe(
  summary,
  report,
  context
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (
    summary.schema !==
    "iris_persistence_runtime_status_handoff_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of [
    "runtime_status_report_only",
    "no_commit_side_effects_by_report",
    "memory_candidates_not_committed_directly",
    "relationship_candidates_not_committed_directly",
    "approved_records_only",
    "validator_required_before_persistence",
    "internal_profiles_not_canonical_enums",
    "record_payloads_not_exposed",
    "candidate_payloads_not_exposed",
    "store_paths_not_exposed",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (summary.runtime_status !== report.runtime_status) {
    throw new ContractError(`${context}: handoff runtime status mismatch`);
  }
  if (!PREFLIGHT_STATUSES.has(summary.preflight_status)) {
    throw new ContractError(`${context}: invalid handoff preflight`);
  }
  if (
    summary.persistence_readiness_status !== null &&
    !READINESS_STATUSES.has(summary.persistence_readiness_status)
  ) {
    throw new ContractError(`${context}: invalid handoff readiness`);
  }
  for (const field of [
    "memory_record_count",
    "relationship_profile_count",
    "candidate_review_item_count",
    "memory_validated_count",
    "relationship_validated_count",
    "memory_committed_count",
    "relationship_committed_count",
    "persistence_error_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid handoff count`);
  }
  assertSafeStoreStatus(summary.memory_store_health, context);
  assertSafeStoreStatus(summary.relationship_store_health, context);
  if (!APPROVED_RECORD_FLOW_STATUSES.has(summary.approved_record_flow_status)) {
    throw new ContractError(`${context}: invalid handoff approved flow`);
  }
  if (!CANDIDATE_COMMIT_FLOW_STATUSES.has(summary.candidate_commit_flow_status)) {
    throw new ContractError(`${context}: invalid handoff candidate flow`);
  }
  if (!RELATIONSHIP_VALUE_FLOW_STATUSES.has(summary.relationship_value_flow_status)) {
    throw new ContractError(`${context}: invalid handoff relationship flow`);
  }
  if (!LONG_TERM_RECALL_FLOW_STATUSES.has(summary.long_term_recall_flow_status)) {
    throw new ContractError(`${context}: invalid handoff recall flow`);
  }
  if (
    !MEMORY_RELATIONSHIP_LIFECYCLE_FLOW_STATUSES.has(
      summary.lifecycle_flow_status
    )
  ) {
    throw new ContractError(`${context}: invalid handoff lifecycle flow`);
  }
  assertSafeOptionalScriptName(
    summary.next_runtime_check_script,
    `${context}: handoff next runtime check script`
  );
  if (!READINESS_STATES.has(summary.next_readiness_state)) {
    throw new ContractError(`${context}: invalid handoff next readiness state`);
  }
  assertReadinessStateCountsSafe(
    summary.readiness_state_counts,
    `${context}: handoff readiness state counts`
  );
  if (
    summary.memory_record_count !== report.runtime_counts.memory_record_count ||
    summary.relationship_profile_count !==
      report.runtime_counts.relationship_profile_count ||
    summary.candidate_review_item_count !==
      report.runtime_counts.candidate_review_item_count ||
    summary.memory_store_health !== report.store_health.memory.health ||
    summary.relationship_store_health !== report.store_health.relationship.health ||
    summary.approved_record_flow_status !==
      report.approved_record_flow.flow_status ||
    summary.candidate_commit_flow_status !==
      report.candidate_commit_flow.flow_status ||
    summary.relationship_value_flow_status !==
      report.relationship_value_flow.flow_status ||
    summary.long_term_recall_flow_status !==
      report.long_term_recall_flow.flow_status ||
    summary.lifecycle_flow_status !==
      report.memory_relationship_lifecycle_flow.flow_status ||
    summary.memory_validated_count !==
      report.candidate_commit_flow.memory_validated_count ||
    summary.relationship_validated_count !==
      report.candidate_commit_flow.relationship_validated_count ||
    summary.memory_committed_count !==
      report.candidate_commit_flow.memory_committed_count ||
    summary.relationship_committed_count !==
      report.candidate_commit_flow.relationship_committed_count ||
    summary.persistence_error_count !==
      report.candidate_commit_flow.persistence_error_count ||
    summary.next_readiness_state !== report.next_readiness_state ||
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.readiness_state_counts
    ) ||
    summary.next_runtime_check_script !== report.next_runtime_check_script
  ) {
    throw new ContractError(`${context}: production handoff summary mismatch`);
  }
}

function createRuntimePersistenceStatus({ runtime, generatedAtMs }) {
  return createPersistenceStatus({
    capabilities: runtime.capabilities?.() ?? {},
    memoryRecordCount: runtimeCollectionCount(
      runtime,
      "memoryRecords",
      [10_000],
      "memory records"
    ),
    relationshipProfileCount: runtimeCollectionCount(
      runtime,
      "relationshipProfiles",
      [],
      "relationship profiles"
    ),
    replayEntryCount: runtimeCollectionCount(
      runtime,
      "replayEntries",
      [10_000],
      "replay entries"
    ),
    candidateReviewStats: runtimeCandidateReviewStats(runtime),
    memoryStoreStatus: runtime.memoryStoreStatus?.() ?? null,
    relationshipStoreStatus: runtime.relationshipStoreStatus?.() ?? null,
    generatedAtMs,
  });
}

function runtimeCandidateReviewStats(runtime) {
  if (!runtime || typeof runtime.candidateReviewStats !== "function") return null;
  const stats = runtime.candidateReviewStats();
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    throw new ContractError(
      "persistence runtime status: candidate review stats must be an object"
    );
  }
  return stats;
}

function runtimeCollectionCount(runtime, methodName, args, label) {
  if (!runtime || typeof runtime[methodName] !== "function") return 0;
  const records = runtime[methodName](...args);
  if (!Array.isArray(records)) {
    throw new ContractError(
      `persistence runtime status: ${label} collection must be an array`
    );
  }
  return records.length;
}

function summarizeRuntimeStatus({ preflight, persistenceStatus }) {
  if (preflight.preflight_status !== "ready_to_persist_memory_and_relationships") {
    return "attention_required";
  }
  if (!persistenceStatus) return "runtime_unavailable";
  if (persistenceStatus.persistence_readiness_status === "attention") {
    return "runtime_attention";
  }
  if (persistenceStatus.persistence_readiness_status === "disabled") {
    return "attention_required";
  }
  return persistenceStatus.persistence_readiness_status;
}

function createPersistenceRuntimeProductionHandoffSummary({
  runtimeStatus,
  preflight,
  persistenceStatus,
  storeHealth,
  approvedRecordFlow,
  candidateCommitFlow,
  relationshipValueFlow,
  longTermRecallFlow,
  memoryRelationshipLifecycleFlow,
  identityScopeFlow,
  nextRuntimeCheckScript,
}) {
  const counts = persistenceStatus?.public_counts ?? emptyPublicCounts();
  const flows = [
    approvedRecordFlow,
    identityScopeFlow,
    candidateCommitFlow,
    relationshipValueFlow,
    longTermRecallFlow,
    memoryRelationshipLifecycleFlow,
  ];
  return {
    schema: "iris_persistence_runtime_status_handoff_summary_v1",
    runtime_status_report_only: true,
    no_commit_side_effects_by_report: true,
    memory_candidates_not_committed_directly: true,
    relationship_candidates_not_committed_directly: true,
    approved_records_only: true,
    validator_required_before_persistence: true,
    internal_profiles_not_canonical_enums: true,
    record_payloads_not_exposed: true,
    candidate_payloads_not_exposed: true,
    store_paths_not_exposed: true,
    endpoint_values_not_exposed: true,
    secret_values_not_exposed: true,
    runtime_status: runtimeStatus,
    preflight_status: preflight.preflight_status,
    persistence_readiness_status:
      persistenceStatus?.persistence_readiness_status ?? null,
    memory_record_count: safeCount(counts.memory_record_count),
    relationship_profile_count: safeCount(counts.relationship_profile_count),
    candidate_review_item_count: safeCount(counts.candidate_review_item_count),
    memory_store_health: storeHealth.memory.health,
    relationship_store_health: storeHealth.relationship.health,
    approved_record_flow_status: approvedRecordFlow.flow_status,
    candidate_commit_flow_status: candidateCommitFlow.flow_status,
    relationship_value_flow_status: relationshipValueFlow.flow_status,
    long_term_recall_flow_status: longTermRecallFlow.flow_status,
    lifecycle_flow_status: memoryRelationshipLifecycleFlow.flow_status,
    next_readiness_state: firstReadinessState([
      memoryRelationshipLifecycleFlow,
      candidateCommitFlow,
      relationshipValueFlow,
      longTermRecallFlow,
      approvedRecordFlow,
      identityScopeFlow,
    ]),
    readiness_state_counts: countReadinessStates(flows),
    memory_validated_count: candidateCommitFlow.memory_validated_count,
    relationship_validated_count:
      candidateCommitFlow.relationship_validated_count,
    memory_committed_count: candidateCommitFlow.memory_committed_count,
    relationship_committed_count:
      candidateCommitFlow.relationship_committed_count,
    persistence_error_count: candidateCommitFlow.persistence_error_count,
    next_runtime_check_script: nextRuntimeCheckScript,
  };
}

function createStoreHealth(persistenceStatus) {
  const memory = persistenceStatus?.store_limits?.memory;
  const relationship = persistenceStatus?.store_limits?.relationship;
  return {
    schema: "iris_persistence_runtime_store_health_v1",
    memory: summarizeStore(memory),
    relationship: summarizeStore(relationship),
  };
}

function createApprovedRecordFlowSummary(persistenceStatus) {
  const counts = persistenceStatus?.public_counts ?? emptyPublicCounts();
  const capabilities = persistenceStatus?.enabled ?? emptyCapabilityFlags();
  const storeHealth = createStoreHealth(persistenceStatus);
  const memory = storeHealth.memory;
  const relationship = storeHealth.relationship;
  const runtimeStatusAvailable =
    persistenceStatus?.persistence_readiness_status != null ||
    capabilities.persistence === true ||
    capabilities.candidate_persistence === true ||
    capabilities.relationship_memory === true ||
    safeCount(counts.memory_record_count) > 0 ||
    safeCount(counts.relationship_profile_count) > 0 ||
    safeCount(counts.replay_entry_count) > 0 ||
    safeCount(counts.candidate_review_item_count) > 0 ||
    memory.activity_available === true ||
    relationship.activity_available === true;
  const summary = {
    schema: "iris_persistence_approved_record_flow_summary_v1",
    runtime_status_available: runtimeStatusAvailable,
    persistence_enabled: capabilities.persistence === true,
    candidate_persistence_enabled: capabilities.candidate_persistence === true,
    relationship_memory_enabled: capabilities.relationship_memory === true,
    memory_records_available: safeCount(counts.memory_record_count) > 0,
    relationship_profiles_available:
      safeCount(counts.relationship_profile_count) > 0,
    replay_entries_available: safeCount(counts.replay_entry_count) > 0,
    candidate_review_items_available:
      safeCount(counts.candidate_review_item_count) > 0,
    memory_activity_available: memory.latest_activity_age_ms !== null,
    relationship_activity_available: relationship.latest_activity_age_ms !== null,
    memory_latest_activity_age_ms: memory.latest_activity_age_ms,
    relationship_latest_activity_age_ms: relationship.latest_activity_age_ms,
    memory_operation_health: memory.operation_health,
    relationship_operation_health: relationship.operation_health,
    memory_operation_success_count: memory.operation_success_count,
    relationship_operation_success_count: relationship.operation_success_count,
    memory_operation_error_count: memory.operation_error_count,
    relationship_operation_error_count: relationship.operation_error_count,
    memory_backup_write_health: memory.backup_write_health,
    relationship_backup_write_health: relationship.backup_write_health,
    memory_backup_write_success_count: memory.backup_write_success_count,
    relationship_backup_write_success_count:
      relationship.backup_write_success_count,
    memory_backup_write_error_count: memory.backup_write_error_count,
    relationship_backup_write_error_count:
      relationship.backup_write_error_count,
    relationship_memory_complete:
      safeCount(counts.memory_record_count) > 0 &&
      safeCount(counts.relationship_profile_count) > 0,
    flow_status: summarizeApprovedRecordFlowStatus({
      persistenceStatus,
      capabilities,
      counts,
      memory,
      relationship,
    }),
    readiness_state: readinessStateForApprovedRecordFlow({
      persistenceStatus,
      capabilities,
      counts,
      memory,
      relationship,
    }),
    boundary_policy: {
      booleans_counts_statuses_and_ages_only: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertApprovedRecordFlowSummarySafe(summary, "persistence approved record flow");
  return summary;
}

function createCandidateCommitFlowSummary({
  persistenceStatus,
  streamState,
  generatedAtMs,
  storeHealth = null,
}) {
  const state = readStreamState(streamState);
  const counts = persistenceStatus?.public_counts ?? emptyPublicCounts();
  const capabilities = persistenceStatus?.enabled ?? emptyCapabilityFlags();
  const safeStoreHealth = storeHealth ?? createStoreHealth(persistenceStatus);
  const memoryStore = safeStoreHealth.memory;
  const relationshipStore = safeStoreHealth.relationship;
  const latestValidation = state?.last_candidate_validation ?? null;
  const latestPersistence = state?.last_candidate_persistence ?? null;
  const latestBoundaryAudit = state?.last_boundary_audit ?? null;
  const history = Array.isArray(state?.history) ? state.history : [];
  const historyValidationSeenCount = history.filter((item) =>
    safeOptionalStatus(item?.candidate_validation_status)
  ).length;
  const historyValidationReadyCount = history.filter(
    (item) =>
      item?.candidate_validation_status === "validated" &&
      (safeCount(item?.candidate_memory_approved_count) > 0 ||
        safeCount(item?.candidate_memory_validated_count) > 0 ||
        safeCount(item?.candidate_relationship_validated_count) > 0)
  ).length;
  const historyPersistenceSeenCount = history.filter(
    (item) =>
      safeCount(item?.candidate_memory_committed_count) > 0 ||
      safeCount(item?.candidate_relationship_committed_count) > 0 ||
      safeCount(item?.candidate_persistence_error_count) > 0
  ).length;
  const historyPersistenceSuccessCount = history.filter(
    (item) =>
      safeCount(item?.candidate_memory_committed_count) > 0 ||
      safeCount(item?.candidate_relationship_committed_count) > 0
  ).length;
  const historyMemoryPersistenceSuccessCount = history.filter(
    (item) => safeCount(item?.candidate_memory_committed_count) > 0
  ).length;
  const historyRelationshipPersistenceSuccessCount = history.filter(
    (item) => safeCount(item?.candidate_relationship_committed_count) > 0
  ).length;
  const historyPersistenceAttentionCount = history.filter(
    (item) => safeCount(item?.candidate_persistence_error_count) > 0
  ).length;
  const validationStatus = safeOptionalStatus(latestValidation?.validation_status);
  const memoryValidatedCount = safeCount(
    latestValidation?.approved_memory_record_count
  );
  const relationshipValidatedCount = safeCount(
    latestValidation?.approved_relationship_record_count
  );
  const rejectedCount = safeCount(latestValidation?.rejected_candidate_count);
  const memoryCommittedCount = safeCount(latestPersistence?.memory_committed_count);
  const relationshipCommittedCount = safeCount(
    latestPersistence?.relationship_committed_count
  );
  const memoryFailedCount = safeCount(latestPersistence?.memory_failed_count);
  const relationshipFailedCount = safeCount(
    latestPersistence?.relationship_failed_count
  );
  const persistenceErrorCount = safeCount(
    latestPersistence?.persistence_error_count
  );
  const validationSeen =
    Boolean(latestValidation) || historyValidationSeenCount > 0;
  const validationPassed =
    historyValidationReadyCount > 0 ||
    (validationStatus === "validated" &&
      (memoryValidatedCount > 0 || relationshipValidatedCount > 0));
  const persistenceSeen =
    Boolean(latestPersistence) || historyPersistenceSeenCount > 0;
  const persistenceCommitted =
    historyPersistenceSuccessCount > 0 ||
    memoryCommittedCount > 0 ||
    relationshipCommittedCount > 0;
  const memoryCandidateCommitted =
    historyMemoryPersistenceSuccessCount > 0 || memoryCommittedCount > 0;
  const relationshipCandidateCommitted =
    historyRelationshipPersistenceSuccessCount > 0 ||
    relationshipCommittedCount > 0;
  const persistenceHealthy =
    historyPersistenceAttentionCount === 0 &&
    persistenceErrorCount === 0 &&
    memoryFailedCount === 0 &&
    relationshipFailedCount === 0;
  const streamStateAvailable =
    safeOptionalStatus(state?.status) !== null ||
    safeOptionalStatus(state?.last_payload_kind) !== null ||
    history.length > 0 ||
    validationSeen ||
    persistenceSeen ||
    latestBoundaryAudit !== null;
  const memoryStoreHealthy =
    capabilities.persistence !== true || isRuntimeStoreHealthy(memoryStore);
  const relationshipStoreHealthy =
    capabilities.relationship_memory !== true || isRuntimeStoreHealthy(relationshipStore);
  const storeStatusHealthy =
    Boolean(persistenceStatus) && memoryStoreHealthy && relationshipStoreHealthy;
  const context = {
    streamStateAvailable,
    candidatePersistenceEnabled: capabilities.candidate_persistence === true,
    validationSeen,
    validationStatus,
    validationPassed,
    persistenceSeen,
    persistenceCommitted,
    memoryCandidateCommitted,
    relationshipCandidateCommitted,
    persistenceHealthy,
    storeStatusHealthy,
    memoryRecordsAvailable: safeCount(counts.memory_record_count) > 0,
    relationshipProfilesAvailable: safeCount(counts.relationship_profile_count) > 0,
  };
  const summary = {
    schema: "iris_persistence_candidate_commit_flow_summary_v1",
    stream_state_available: streamStateAvailable,
    state_status: safeOptionalStatus(state?.status),
    state_age_ms: state
      ? safeStateAge(state.updated_at_ms, generatedAtMs)
      : null,
    latest_payload_kind: safeOptionalStatus(state?.last_payload_kind),
    history_event_count: history.length,
    history_validation_seen_count: historyValidationSeenCount,
    history_validation_ready_count: historyValidationReadyCount,
    history_persistence_seen_count: historyPersistenceSeenCount,
    history_persistence_success_count: historyPersistenceSuccessCount,
    history_memory_persistence_success_count:
      historyMemoryPersistenceSuccessCount,
    history_relationship_persistence_success_count:
      historyRelationshipPersistenceSuccessCount,
    history_persistence_attention_count: historyPersistenceAttentionCount,
    flow_status: summarizeCandidateCommitFlowStatus(context),
    blocking_stage: summarizeCandidateCommitBlockingStage(context),
    readiness_state: readinessStateForBlockingStage(
      summarizeCandidateCommitBlockingStage(context)
    ),
    next_check_script: checkScriptForBlockingStage(
      summarizeCandidateCommitBlockingStage(context)
    ),
    candidate_persistence_enabled: context.candidatePersistenceEnabled,
    relationship_memory_enabled: capabilities.relationship_memory === true,
    validation_seen: validationSeen,
    validation_status: validationStatus,
    validation_passed: validationPassed,
    memory_validated_count: memoryValidatedCount,
    relationship_validated_count: relationshipValidatedCount,
    rejected_candidate_count: rejectedCount,
    persistence_seen: persistenceSeen,
    memory_committed_count: memoryCommittedCount,
    relationship_committed_count: relationshipCommittedCount,
    memory_failed_count: memoryFailedCount,
    relationship_failed_count: relationshipFailedCount,
    persistence_error_count: persistenceErrorCount,
    persistence_committed: persistenceCommitted,
    persistence_healthy: persistenceHealthy,
    store_status_healthy: storeStatusHealthy,
    memory_store_health: memoryStore.health,
    relationship_store_health: relationshipStore.health,
    memory_operation_health: memoryStore.operation_health,
    relationship_operation_health: relationshipStore.operation_health,
    memory_backup_write_health: memoryStore.backup_write_health,
    relationship_backup_write_health: relationshipStore.backup_write_health,
    memory_records_available: context.memoryRecordsAvailable,
    relationship_profiles_available: context.relationshipProfilesAvailable,
    boundary_audit_status: safeOptionalStatus(latestBoundaryAudit?.audit_status),
    boundary_policy: {
      counts_statuses_booleans_and_ages_only: true,
      no_raw_stream_state: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_secret_values: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertCandidateCommitFlowSummarySafe(summary, "persistence candidate commit flow");
  return summary;
}

function createIdentityScopeFlowSummary({ persistenceStatus, storeHealth }) {
  const counts = persistenceStatus?.public_counts ?? emptyPublicCounts();
  const capabilities = persistenceStatus?.enabled ?? emptyCapabilityFlags();
  const safeStoreHealth = storeHealth ?? createStoreHealth(persistenceStatus);
  const memoryStore = safeStoreHealth.memory;
  const relationshipStore = safeStoreHealth.relationship;
  const hasMemory = safeCount(counts.memory_record_count) > 0;
  const hasRelationship = safeCount(counts.relationship_profile_count) > 0;
  const runtimeStatusAvailable =
    persistenceStatus?.persistence_readiness_status != null ||
    capabilities.persistence === true ||
    capabilities.candidate_persistence === true ||
    capabilities.relationship_memory === true ||
    hasMemory ||
    hasRelationship ||
    memoryStore.activity_available === true ||
    relationshipStore.activity_available === true;
  const summary = {
    schema: "iris_persistence_identity_scope_flow_summary_v1",
    runtime_status_available: runtimeStatusAvailable,
    persistence_enabled: capabilities.persistence === true,
    candidate_persistence_enabled: capabilities.candidate_persistence === true,
    relationship_memory_enabled: capabilities.relationship_memory === true,
    memory_records_available: hasMemory,
    relationship_profiles_available: hasRelationship,
    relationship_memory_complete: hasMemory && hasRelationship,
    memory_store_health: memoryStore.health,
    relationship_store_health: relationshipStore.health,
    memory_activity_available: memoryStore.latest_activity_age_ms !== null,
    relationship_activity_available:
      relationshipStore.activity_available === true,
    flow_status: summarizeIdentityScopeFlowStatus({
      persistenceStatus,
      capabilities,
      hasMemory,
      hasRelationship,
      memoryStore,
      relationshipStore,
    }),
    readiness_state: readinessStateForIdentityScopeFlow({
      persistenceStatus,
      capabilities,
      hasMemory,
      hasRelationship,
      memoryStore,
      relationshipStore,
    }),
    identity_policy: {
      per_user_identity_scope_required: true,
      memory_records_require_identity_scope: true,
      relationship_updates_require_identity_scope: true,
      relationship_value_changes_require_validated_candidate: true,
      approved_records_only: true,
      candidates_are_review_only: true,
      direct_candidate_persistence_blocked: true,
    },
    boundary_policy: {
      booleans_statuses_and_policy_only: true,
      no_viewer_ids: true,
      no_display_names: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertIdentityScopeFlowSummarySafe(summary, "persistence identity scope flow");
  return summary;
}

function createRelationshipValueFlowSummary({
  preflight,
  persistenceStatus,
  identityScopeFlow,
  candidateCommitFlow,
  storeHealth,
}) {
  const counts = persistenceStatus?.public_counts ?? emptyPublicCounts();
  const capabilities = persistenceStatus?.enabled ?? emptyCapabilityFlags();
  const relationshipStore = storeHealth.relationship;
  const relationshipLevelCounts = safeRelationshipLevelCounts(
    persistenceStatus?.store_limits?.relationship?.relationship_level_counts
  );
  const relationshipLevelKnownCount = Object.values(relationshipLevelCounts).reduce(
    (total, count) => total + count,
    0
  );
  const context = {
    preflightReady:
      preflight.preflight_status === "ready_to_persist_memory_and_relationships",
    runtimeStatusAvailable: Boolean(persistenceStatus),
    candidatePersistenceEnabled: capabilities.candidate_persistence === true,
    relationshipMemoryEnabled: capabilities.relationship_memory === true,
    memoryRecordsAvailable: safeCount(counts.memory_record_count) > 0,
    relationshipProfilesAvailable:
      safeCount(counts.relationship_profile_count) > 0,
    storeAttention:
      relationshipStore.health === "attention" ||
      relationshipStore.operation_health === "attention" ||
      relationshipStore.backup_write_health === "attention" ||
      relationshipStore.read_error === true,
    candidateGateAttention: [
      "validator_disabled",
      "validation_blocked",
      "persistence_attention",
    ].includes(candidateCommitFlow.flow_status),
  };
  const summary = {
    schema: "iris_persistence_relationship_value_flow_summary_v1",
    flow_status: summarizeRelationshipValueFlowStatus(context),
    blocking_stage: summarizeRelationshipValueBlockingStage(context),
    readiness_state: readinessStateForBlockingStage(
      summarizeRelationshipValueBlockingStage(context)
    ),
    next_check_script: checkScriptForBlockingStage(
      summarizeRelationshipValueBlockingStage(context)
    ),
    preflight_ready: context.preflightReady,
    runtime_status_available: context.runtimeStatusAvailable,
    candidate_persistence_enabled: context.candidatePersistenceEnabled,
    relationship_memory_enabled: context.relationshipMemoryEnabled,
    memory_records_available: context.memoryRecordsAvailable,
    relationship_profiles_available: context.relationshipProfilesAvailable,
    relationship_memory_complete:
      context.memoryRecordsAvailable && context.relationshipProfilesAvailable,
    relationship_activity_available:
      relationshipStore.activity_available === true,
    relationship_latest_activity_age_ms:
      relationshipStore.latest_activity_age_ms,
    relationship_store_health: relationshipStore.health,
    relationship_operation_health: relationshipStore.operation_health,
    relationship_operation_success_count:
      relationshipStore.operation_success_count,
    relationship_operation_error_count:
      relationshipStore.operation_error_count,
    relationship_backup_write_health: relationshipStore.backup_write_health,
    relationship_backup_write_success_count:
      relationshipStore.backup_write_success_count,
    relationship_backup_write_error_count:
      relationshipStore.backup_write_error_count,
    relationship_profile_count: safeCount(counts.relationship_profile_count),
    memory_record_count: safeCount(counts.memory_record_count),
    relationship_level_known_count: relationshipLevelKnownCount,
    relationship_level_counts: relationshipLevelCounts,
    identity_scope_enforced:
      identityScopeFlow.identity_policy?.per_user_identity_scope_required === true &&
      identityScopeFlow.identity_policy?.relationship_updates_require_identity_scope === true,
    approved_records_only:
      identityScopeFlow.identity_policy?.approved_records_only === true,
    direct_candidate_persistence_blocked:
      identityScopeFlow.identity_policy?.direct_candidate_persistence_blocked === true,
    candidate_gate_seen: candidateCommitFlow.validation_seen === true,
    candidate_validation_passed: candidateCommitFlow.validation_passed === true,
    candidate_persistence_committed:
      candidateCommitFlow.persistence_committed === true,
    candidate_commit_flow_status: candidateCommitFlow.flow_status,
    identity_scope_flow_status: identityScopeFlow.flow_status,
    relationship_value_policy: {
      per_user_relationship_profiles_required: true,
      relationship_level_counts_only: true,
      relationship_score_values_hidden: true,
      relationship_updates_validation_gated: true,
      relationship_updates_require_approved_schema: true,
      direct_relationship_commit_blocked: true,
    },
    boundary_policy: {
      counts_statuses_booleans_and_policy_only: true,
      no_viewer_ids: true,
      no_display_names: true,
      no_relationship_scores: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_secret_values: true,
      read_only_runtime_status: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertRelationshipValueFlowSummarySafe(
    summary,
    "persistence relationship value flow"
  );
  return summary;
}

function createLongTermRecallFlowSummary({
  preflight,
  persistenceStatus,
  approvedRecordFlow,
  identityScopeFlow,
  storeHealth,
}) {
  const counts = persistenceStatus?.public_counts ?? emptyPublicCounts();
  const capabilities = persistenceStatus?.enabled ?? emptyCapabilityFlags();
  const memoryStore = storeHealth.memory;
  const relationshipStore = storeHealth.relationship;
  const memoryLimits = persistenceStatus?.store_limits?.memory ?? {};
  const relationshipLimits = persistenceStatus?.store_limits?.relationship ?? {};
  const memoryRecordsAvailable = safeCount(counts.memory_record_count) > 0;
  const relationshipProfilesAvailable =
    safeCount(counts.relationship_profile_count) > 0;
  const storeAttention =
    approvedRecordFlow.flow_status === "attention" ||
    memoryStore.health === "attention" ||
    relationshipStore.health === "attention" ||
    memoryStore.operation_health === "attention" ||
    relationshipStore.operation_health === "attention" ||
    memoryStore.backup_write_health === "attention" ||
    relationshipStore.backup_write_health === "attention" ||
    memoryStore.read_error === true ||
    relationshipStore.read_error === true;
  const identityScopeEnforced =
    identityScopeFlow.identity_policy?.per_user_identity_scope_required === true &&
    identityScopeFlow.identity_policy?.memory_records_require_identity_scope === true &&
    identityScopeFlow.identity_policy?.relationship_updates_require_identity_scope === true;
  const publicMemoryRecallAvailable =
    memoryRecordsAvailable && memoryStore.health === "ready";
  const perUserRelationshipRecallAvailable =
    relationshipProfilesAvailable &&
    relationshipStore.health === "ready" &&
    identityScopeEnforced;
  const vectorMemorySearchReady =
    preflight.vector_memory_status === "ready" &&
    preflight.vector_memory_mode === "http_vector";
  const durableRestartReady =
    memoryStore.health === "ready" &&
    memoryStore.backup_write_health !== "attention" &&
    (capabilities.relationship_memory !== true ||
      (relationshipStore.health === "ready" &&
        relationshipStore.backup_write_health !== "attention"));
  const context = {
    preflightReady:
      preflight.preflight_status === "ready_to_persist_memory_and_relationships",
    runtimeStatusAvailable: Boolean(persistenceStatus),
    candidatePersistenceEnabled: capabilities.candidate_persistence === true,
    publicMemoryRecallAvailable,
    perUserRelationshipRecallAvailable,
    storeAttention,
  };
  const summary = {
    schema: "iris_persistence_long_term_recall_flow_summary_v1",
    flow_status: summarizeLongTermRecallFlowStatus(context),
    blocking_stage: summarizeLongTermRecallBlockingStage(context),
    readiness_state: readinessStateForBlockingStage(
      summarizeLongTermRecallBlockingStage(context)
    ),
    next_check_script: checkScriptForBlockingStage(
      summarizeLongTermRecallBlockingStage(context)
    ),
    preflight_ready: context.preflightReady,
    runtime_status_available: context.runtimeStatusAvailable,
    persistence_enabled: capabilities.persistence === true,
    candidate_persistence_enabled: context.candidatePersistenceEnabled,
    relationship_memory_enabled: capabilities.relationship_memory === true,
    vector_memory_adapter_ready: vectorMemorySearchReady,
    memory_store_ready: memoryStore.health === "ready",
    relationship_store_ready: relationshipStore.health === "ready",
    store_status_healthy: !storeAttention,
    memory_records_available: memoryRecordsAvailable,
    relationship_profiles_available: relationshipProfilesAvailable,
    replay_entries_available: safeCount(counts.replay_entry_count) > 0,
    candidate_review_items_available:
      safeCount(counts.candidate_review_item_count) > 0,
    memory_activity_available: memoryStore.latest_activity_age_ms !== null,
    relationship_activity_available:
      relationshipStore.latest_activity_age_ms !== null,
    public_memory_recall_available: publicMemoryRecallAvailable,
    per_user_relationship_recall_available:
      perUserRelationshipRecallAvailable,
    durable_restart_recall_ready: durableRestartReady,
    identity_scope_enforced: identityScopeEnforced,
    approved_records_only:
      identityScopeFlow.identity_policy?.approved_records_only === true,
    direct_candidate_persistence_blocked:
      identityScopeFlow.identity_policy?.direct_candidate_persistence_blocked === true,
    vector_memory_search_ready: vectorMemorySearchReady,
    memory_record_count: safeCount(counts.memory_record_count),
    relationship_profile_count: safeCount(counts.relationship_profile_count),
    replay_entry_count: safeCount(counts.replay_entry_count),
    candidate_review_item_count: safeCount(counts.candidate_review_item_count),
    memory_latest_activity_age_ms: memoryStore.latest_activity_age_ms,
    relationship_latest_activity_age_ms:
      relationshipStore.latest_activity_age_ms,
    memory_store_health: memoryStore.health,
    relationship_store_health: relationshipStore.health,
    memory_operation_health: memoryStore.operation_health,
    relationship_operation_health: relationshipStore.operation_health,
    memory_operation_success_count: memoryStore.operation_success_count,
    relationship_operation_success_count:
      relationshipStore.operation_success_count,
    memory_operation_error_count: memoryStore.operation_error_count,
    relationship_operation_error_count: relationshipStore.operation_error_count,
    memory_backup_write_health: memoryStore.backup_write_health,
    relationship_backup_write_health: relationshipStore.backup_write_health,
    memory_backup_write_success_count: memoryStore.backup_write_success_count,
    relationship_backup_write_success_count:
      relationshipStore.backup_write_success_count,
    memory_type_counts: safeCountMap(memoryLimits.memory_type_counts, MEMORY_TYPE_KEYS),
    memory_owner_scope_counts: safeCountMap(
      memoryLimits.owner_scope_counts,
      MEMORY_OWNER_SCOPE_KEYS
    ),
    relationship_level_counts: safeRelationshipLevelCounts(
      relationshipLimits.relationship_level_counts
    ),
    long_term_recall_policy: {
      long_term_memory_read_back_from_approved_records: true,
      per_user_relationship_recall_requires_identity_scope: true,
      game_and_stream_memory_types_counted_only: true,
      vector_recall_uses_public_records_only: true,
      candidate_objects_never_recalled: true,
      restart_resume_uses_store_status_only: true,
    },
    boundary_policy: {
      counts_statuses_booleans_and_policy_only: true,
      no_viewer_ids: true,
      no_display_names: true,
      no_memory_summaries: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_relationship_scores: true,
      no_candidates: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_secret_values: true,
      read_only_runtime_status: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertLongTermRecallFlowSummarySafe(summary, "persistence long term recall flow");
  return summary;
}

function createMemoryRelationshipLifecycleFlowSummary({
  preflight,
  persistenceStatus,
  approvedRecordFlow,
  identityScopeFlow,
  candidateCommitFlow,
  storeHealth,
}) {
  const counts = persistenceStatus?.public_counts ?? emptyPublicCounts();
  const capabilities = persistenceStatus?.enabled ?? emptyCapabilityFlags();
  const memoryStore = storeHealth.memory;
  const relationshipStore = storeHealth.relationship;
  const context = {
    preflightReady:
      preflight.preflight_status === "ready_to_persist_memory_and_relationships",
    runtimeStatusAvailable: Boolean(persistenceStatus),
    memoryRecordsAvailable: safeCount(counts.memory_record_count) > 0,
    relationshipProfilesAvailable:
      safeCount(counts.relationship_profile_count) > 0,
    identityScopeAttention: identityScopeFlow.flow_status === "attention",
    candidateGateAttention: [
      "validator_disabled",
      "validation_blocked",
      "persistence_attention",
    ].includes(candidateCommitFlow.flow_status),
    storeAttention:
      approvedRecordFlow.flow_status === "attention" ||
      memoryStore.health === "attention" ||
      relationshipStore.health === "attention" ||
      memoryStore.operation_health === "attention" ||
      relationshipStore.operation_health === "attention" ||
      memoryStore.backup_write_health === "attention" ||
      relationshipStore.backup_write_health === "attention",
  };
  const summary = {
    schema: "iris_persistence_memory_relationship_lifecycle_flow_summary_v1",
    flow_status: summarizeMemoryRelationshipLifecycleFlowStatus(context),
    blocking_stage: summarizeMemoryRelationshipLifecycleBlockingStage(context),
    readiness_state: readinessStateForBlockingStage(
      summarizeMemoryRelationshipLifecycleBlockingStage(context)
    ),
    next_check_script: checkScriptForBlockingStage(
      summarizeMemoryRelationshipLifecycleBlockingStage(context)
    ),
    preflight_ready: context.preflightReady,
    runtime_status_available: context.runtimeStatusAvailable,
    persistence_enabled: capabilities.persistence === true,
    candidate_persistence_enabled: capabilities.candidate_persistence === true,
    relationship_memory_enabled: capabilities.relationship_memory === true,
    vector_memory_adapter_ready:
      preflight.vector_memory_status === "ready" &&
      preflight.vector_memory_mode === "http_vector",
    memory_store_ready: memoryStore.health === "ready",
    relationship_store_ready: relationshipStore.health === "ready",
    store_status_healthy:
      memoryStore.health !== "attention" &&
      relationshipStore.health !== "attention" &&
      memoryStore.operation_health !== "attention" &&
      relationshipStore.operation_health !== "attention" &&
      memoryStore.backup_write_health !== "attention" &&
      relationshipStore.backup_write_health !== "attention",
    memory_records_available: context.memoryRecordsAvailable,
    relationship_profiles_available: context.relationshipProfilesAvailable,
    relationship_memory_complete:
      context.memoryRecordsAvailable && context.relationshipProfilesAvailable,
    memory_activity_available: memoryStore.latest_activity_age_ms !== null,
    relationship_activity_available:
      relationshipStore.latest_activity_age_ms !== null,
    identity_scope_enforced:
      identityScopeFlow.identity_policy?.per_user_identity_scope_required === true &&
      identityScopeFlow.identity_policy?.memory_records_require_identity_scope === true &&
      identityScopeFlow.identity_policy?.relationship_updates_require_identity_scope === true,
    approved_records_only:
      identityScopeFlow.identity_policy?.approved_records_only === true,
    direct_candidate_persistence_blocked:
      identityScopeFlow.identity_policy?.direct_candidate_persistence_blocked === true,
    candidate_gate_seen: candidateCommitFlow.validation_seen === true,
    candidate_validation_passed: candidateCommitFlow.validation_passed === true,
    candidate_persistence_committed:
      candidateCommitFlow.persistence_committed === true,
    memory_record_count: safeCount(counts.memory_record_count),
    relationship_profile_count: safeCount(counts.relationship_profile_count),
    candidate_review_item_count: safeCount(counts.candidate_review_item_count),
    memory_operation_success_count: memoryStore.operation_success_count,
    relationship_operation_success_count: relationshipStore.operation_success_count,
    memory_operation_error_count: memoryStore.operation_error_count,
    relationship_operation_error_count: relationshipStore.operation_error_count,
    memory_backup_write_health: memoryStore.backup_write_health,
    relationship_backup_write_health: relationshipStore.backup_write_health,
    identity_scope_flow_status: identityScopeFlow.flow_status,
    candidate_commit_flow_status: candidateCommitFlow.flow_status,
    approved_record_flow_status: approvedRecordFlow.flow_status,
    boundary_policy: {
      counts_statuses_booleans_and_policy_only: true,
      no_viewer_ids: true,
      no_display_names: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_secret_values: true,
      read_only_runtime_status: true,
      script_names_only: true,
    },
    adapter_validation_required: true,
  };
  assertMemoryRelationshipLifecycleFlowSummarySafe(
    summary,
    "persistence memory relationship lifecycle flow"
  );
  return summary;
}

function summarizeCandidateCommitFlowStatus(context) {
  if (!context.streamStateAvailable && !context.persistenceCommitted) {
    return "unavailable";
  }
  if (!context.candidatePersistenceEnabled) return "validator_disabled";
  if (!context.streamStateAvailable) return "waiting_for_runtime_event";
  if (!context.validationSeen) return "waiting_for_candidate_validation";
  if (context.validationStatus === "disabled") return "validator_disabled";
  if (!context.validationPassed) return "validation_blocked";
  if (!context.persistenceSeen) return "waiting_for_candidate_persistence";
  if (!context.persistenceHealthy) return "persistence_attention";
  if (!context.storeStatusHealthy) return "persistence_attention";
  if (
    context.memoryCandidateCommitted &&
    context.relationshipCandidateCommitted &&
    context.memoryRecordsAvailable &&
    context.relationshipProfilesAvailable
  ) {
    return "memory_relationship_commit_active";
  }
  if (context.memoryCandidateCommitted && context.memoryRecordsAvailable) {
    return "memory_commit_active";
  }
  if (
    context.relationshipCandidateCommitted &&
    context.relationshipProfilesAvailable
  ) {
    return "relationship_commit_active";
  }
  if (context.persistenceCommitted) return "commit_observed_waiting_for_status";
  return "validation_gated_review_only";
}

function summarizeCandidateCommitBlockingStage(context) {
  if (!context.streamStateAvailable) return "runtime_state";
  if (
    !context.candidatePersistenceEnabled ||
    !context.validationSeen ||
    !context.validationPassed
  ) {
    return "validator";
  }
  if (!context.persistenceSeen || !context.persistenceHealthy) return "persistence";
  if (!context.storeStatusHealthy) return "store_status";
  if (
    context.persistenceCommitted &&
    !context.memoryRecordsAvailable &&
    !context.relationshipProfilesAvailable
  ) {
    return "store_status";
  }
  return "none";
}

function summarizeApprovedRecordFlowStatus({
  persistenceStatus,
  capabilities,
  counts,
  memory,
  relationship,
}) {
  if (!persistenceStatus) return "unavailable";
  if (capabilities.candidate_persistence !== true) return "disabled";
  if (
    memory.operation_health === "attention" ||
    relationship.operation_health === "attention" ||
    memory.backup_write_health === "attention" ||
    relationship.backup_write_health === "attention" ||
    memory.read_error === true ||
    relationship.read_error === true
  ) {
    return "attention";
  }
  const hasMemory = safeCount(counts.memory_record_count) > 0;
  const hasRelationship = safeCount(counts.relationship_profile_count) > 0;
  if (hasMemory && hasRelationship) return "active_with_memory_and_relationships";
  if (hasMemory) return "active_with_memory_only";
  if (hasRelationship) return "active_with_relationships_only";
  return "waiting_for_records";
}

function readinessStateForApprovedRecordFlow({
  persistenceStatus,
  capabilities,
  counts,
  memory,
  relationship,
}) {
  const status = summarizeApprovedRecordFlowStatus({
    persistenceStatus,
    capabilities,
    counts,
    memory,
    relationship,
  });
  if (
    [
      "active_with_memory_only",
      "active_with_relationships_only",
      "active_with_memory_and_relationships",
    ].includes(status)
  ) {
    return "ready";
  }
  if (status === "disabled" || status === "attention") {
    return "operator_review_required";
  }
  return "runtime_waiting";
}

function summarizeIdentityScopeFlowStatus({
  persistenceStatus,
  capabilities,
  hasMemory,
  hasRelationship,
  memoryStore,
  relationshipStore,
}) {
  if (!persistenceStatus) return "unavailable";
  if (capabilities.candidate_persistence !== true) return "disabled";
  if (
    memoryStore.operation_health === "attention" ||
    relationshipStore.operation_health === "attention" ||
    memoryStore.backup_write_health === "attention" ||
    relationshipStore.backup_write_health === "attention" ||
    memoryStore.read_error === true ||
    relationshipStore.read_error === true
  ) {
    return "attention";
  }
  if (hasMemory && hasRelationship) return "active_with_memory_and_relationships";
  if (hasMemory) return "active_with_memory_only";
  if (hasRelationship) return "active_with_relationships_only";
  return "waiting_for_identity_scoped_records";
}

function readinessStateForIdentityScopeFlow({
  persistenceStatus,
  capabilities,
  hasMemory,
  hasRelationship,
  memoryStore,
  relationshipStore,
}) {
  const status = summarizeIdentityScopeFlowStatus({
    persistenceStatus,
    capabilities,
    hasMemory,
    hasRelationship,
    memoryStore,
    relationshipStore,
  });
  if (
    [
      "active_with_memory_only",
      "active_with_relationships_only",
      "active_with_memory_and_relationships",
    ].includes(status)
  ) {
    return "ready";
  }
  if (status === "disabled" || status === "attention") {
    return "operator_review_required";
  }
  return "runtime_waiting";
}

function readinessStateForRecordFlowStatus(status) {
  if (
    [
      "active_with_memory_only",
      "active_with_relationships_only",
      "active_with_memory_and_relationships",
    ].includes(status)
  ) {
    return "ready";
  }
  if (status === "disabled" || status === "attention") {
    return "operator_review_required";
  }
  return "runtime_waiting";
}

function readinessStateForBlockingStage(blockingStage) {
  switch (blockingStage) {
    case "none":
      return "ready";
    case "configuration":
      return "configuration_waiting";
    case "validator":
    case "candidate_gate":
    case "identity_scope":
      return "operator_review_required";
    case "runtime":
    case "runtime_state":
    case "persistence":
    case "store_status":
    case "store":
    case "records":
    case "relationship_profiles":
      return "runtime_waiting";
    default:
      return "runtime_waiting";
  }
}

function countReadinessStates(items) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const item of items) {
    const state = item.readiness_state;
    if (READINESS_STATES.has(state)) counts[state] += 1;
  }
  return counts;
}

function firstReadinessState(items) {
  for (const item of items) {
    const state = item.readiness_state;
    if (READINESS_STATES.has(state) && state !== "ready") return state;
  }
  return "ready";
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: counts required`);
  }
  for (const state of READINESS_STATES) {
    assertNonNegativeInteger(counts[state], `${context}: invalid ${state}`);
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: unexpected state ${key}`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  if (!left || !right) return false;
  for (const state of READINESS_STATES) {
    if (left[state] !== right[state]) return false;
  }
  return true;
}

function summarizeMemoryRelationshipLifecycleFlowStatus(context) {
  if (!context.preflightReady) return "configuration_attention";
  if (!context.runtimeStatusAvailable) return "runtime_unavailable";
  if (context.storeAttention) return "store_attention";
  if (context.identityScopeAttention) return "identity_scope_attention";
  if (context.memoryRecordsAvailable && context.relationshipProfilesAvailable) {
    return "memory_and_relationship_active";
  }
  if (context.memoryRecordsAvailable) return "memory_only_active";
  if (context.relationshipProfilesAvailable) return "relationship_only_active";
  if (context.candidateGateAttention) return "candidate_gate_attention";
  return "waiting_for_approved_records";
}

function summarizeMemoryRelationshipLifecycleBlockingStage(context) {
  if (!context.preflightReady) return "configuration";
  if (!context.runtimeStatusAvailable) return "runtime";
  if (context.storeAttention) return "store";
  if (context.identityScopeAttention) return "identity_scope";
  if (
    !context.memoryRecordsAvailable &&
    !context.relationshipProfilesAvailable &&
    context.candidateGateAttention
  ) {
    return "candidate_gate";
  }
  return "none";
}

function summarizeRelationshipValueFlowStatus(context) {
  if (!context.preflightReady) return "configuration_attention";
  if (!context.runtimeStatusAvailable) return "runtime_unavailable";
  if (
    !context.candidatePersistenceEnabled ||
    !context.relationshipMemoryEnabled
  ) {
    return "disabled";
  }
  if (context.storeAttention || context.candidateGateAttention) {
    return "relationship_values_attention";
  }
  if (context.relationshipProfilesAvailable) return "relationship_values_active";
  if (context.memoryRecordsAvailable) {
    return "memory_available_waiting_for_relationships";
  }
  return "waiting_for_relationship_profiles";
}

function summarizeRelationshipValueBlockingStage(context) {
  if (!context.preflightReady) return "configuration";
  if (!context.runtimeStatusAvailable) return "runtime";
  if (
    !context.candidatePersistenceEnabled ||
    !context.relationshipMemoryEnabled
  ) {
    return "none";
  }
  if (context.storeAttention) return "store";
  if (context.candidateGateAttention) return "candidate_gate";
  if (!context.relationshipProfilesAvailable) return "relationship_profiles";
  return "none";
}

function summarizeLongTermRecallFlowStatus(context) {
  if (!context.preflightReady) return "configuration_attention";
  if (!context.runtimeStatusAvailable) return "runtime_unavailable";
  if (!context.candidatePersistenceEnabled) return "disabled";
  if (context.storeAttention) return "recall_attention";
  if (
    context.publicMemoryRecallAvailable &&
    context.perUserRelationshipRecallAvailable
  ) {
    return "memory_relationship_recall_ready";
  }
  if (context.publicMemoryRecallAvailable) return "memory_recall_ready";
  if (context.perUserRelationshipRecallAvailable) return "relationship_recall_ready";
  return "waiting_for_memory_records";
}

function summarizeLongTermRecallBlockingStage(context) {
  if (!context.preflightReady) return "configuration";
  if (!context.runtimeStatusAvailable) return "runtime";
  if (!context.candidatePersistenceEnabled) return "none";
  if (context.storeAttention) return "store";
  if (
    !context.publicMemoryRecallAvailable &&
    !context.perUserRelationshipRecallAvailable
  ) {
    return "records";
  }
  return "none";
}

function summarizeStore(store) {
  const operation = store?.persistence_operation_status ?? {};
  const durability = store?.durability ?? {};
  const retainedItemCount = safeCount(store?.retained_item_count);
  const activityAvailable =
    store?.activity?.activity_available === true && retainedItemCount > 0;
  return {
    configured: store?.configured === true,
    health: safeStatus(store?.health, ["not_configured", "ready", "attention"]),
    retained_item_count: retainedItemCount,
    activity_available: activityAvailable,
    latest_activity_age_ms: activityAvailable
      ? safeNullableCount(store?.activity?.latest_activity_age_ms)
      : null,
    operation_health: safeStatus(operation.operation_health, [
      "idle",
      "ready",
      "attention",
    ]),
    operation_attempt_count: safeCount(operation.attempt_count),
    operation_success_count: safeCount(operation.success_count),
    operation_error_count: safeCount(operation.error_count),
    backup_write_health: safeStatus(durability.backup_write_health, [
      "idle",
      "ready",
      "attention",
    ]),
    backup_write_attempt_count: safeCount(durability.backup_write_attempt_count),
    backup_write_success_count: safeCount(durability.backup_write_success_count),
    backup_write_error_count: safeCount(durability.backup_write_error_count),
    read_error: store?.read_error === true,
    error_kind: typeof store?.error_kind === "string" ? store.error_kind : null,
  };
}

function isRuntimeStoreHealthy(store) {
  return (
    store?.configured === true &&
    store.health === "ready" &&
    store.operation_health !== "attention" &&
    store.backup_write_health !== "attention" &&
    store.read_error !== true
  );
}

function emptyPublicCounts() {
  return {
    memory_record_count: 0,
    relationship_profile_count: 0,
    replay_entry_count: 0,
    candidate_review_item_count: 0,
  };
}

function emptyCapabilityFlags() {
  return {
    persistence: false,
    candidate_persistence: false,
    relationship_memory: false,
    replay_log: false,
  };
}

function safeRelationshipLevelCounts(value) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  return Object.fromEntries(
    RELATIONSHIP_LEVELS.map((level) => [level, safeCount(source[level])])
  );
}

function safeCountMap(value, keys) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  return Object.fromEntries(keys.map((key) => [key, safeCount(source[key])]));
}

function assertPublicCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: runtime counts required`);
  }
  for (const field of [
    "memory_record_count",
    "relationship_profile_count",
    "replay_entry_count",
    "candidate_review_item_count",
  ]) {
    assertNonNegativeInteger(counts[field], `${context}: invalid ${field}`);
  }
}

function assertStoreHealthSafe(health, context) {
  if (!health || typeof health !== "object" || Array.isArray(health)) {
    throw new ContractError(`${context}: store health required`);
  }
  if (health.schema !== "iris_persistence_runtime_store_health_v1") {
    throw new ContractError(`${context}: invalid store health schema`);
  }
  assertStoreSafe(health.memory, `${context}: memory store`);
  assertStoreSafe(health.relationship, `${context}: relationship store`);
}

function assertApprovedRecordFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: approved record flow summary required`);
  }
  if (summary.schema !== "iris_persistence_approved_record_flow_summary_v1") {
    throw new ContractError(`${context}: invalid approved record flow schema`);
  }
  for (const field of [
    "runtime_status_available",
    "persistence_enabled",
    "candidate_persistence_enabled",
    "relationship_memory_enabled",
    "memory_records_available",
    "relationship_profiles_available",
    "replay_entries_available",
    "candidate_review_items_available",
    "memory_activity_available",
    "relationship_activity_available",
    "relationship_memory_complete",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "memory_latest_activity_age_ms",
    "relationship_latest_activity_age_ms",
  ]) {
    if (summary[field] !== null) {
      assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "memory_operation_success_count",
    "relationship_operation_success_count",
    "memory_operation_error_count",
    "relationship_operation_error_count",
    "memory_backup_write_success_count",
    "relationship_backup_write_success_count",
    "memory_backup_write_error_count",
    "relationship_backup_write_error_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "memory_operation_health",
    "relationship_operation_health",
    "memory_backup_write_health",
    "relationship_backup_write_health",
  ]) {
    if (!["idle", "ready", "attention"].includes(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!APPROVED_RECORD_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid flow status`);
  }
  if (
    !READINESS_STATES.has(summary.readiness_state) ||
    summary.readiness_state !== readinessStateForRecordFlowStatus(summary.flow_status)
  ) {
    throw new ContractError(`${context}: invalid approved record readiness`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "booleans_counts_statuses_and_ages_only",
      "no_memory_records",
      "no_relationship_records",
      "no_candidates",
      "no_store_paths",
      "no_endpoint_values",
      "no_secret_values",
    ],
    `${context}: approved record flow boundary`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertCandidateCommitFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: candidate commit flow summary required`);
  }
  if (summary.schema !== "iris_persistence_candidate_commit_flow_summary_v1") {
    throw new ContractError(`${context}: invalid candidate commit flow schema`);
  }
  if (!CANDIDATE_COMMIT_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid candidate commit flow status`);
  }
  if (!CANDIDATE_COMMIT_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid candidate commit blocking stage`);
  }
  if (
    !READINESS_STATES.has(summary.readiness_state) ||
    summary.readiness_state !== readinessStateForBlockingStage(summary.blocking_stage)
  ) {
    throw new ContractError(`${context}: invalid candidate commit readiness`);
  }
  assertNextCheckScriptMatchesBlockingStage(summary, context, "candidate commit flow");
  for (const field of [
    "stream_state_available",
    "candidate_persistence_enabled",
    "relationship_memory_enabled",
    "validation_seen",
    "validation_passed",
    "persistence_seen",
    "persistence_committed",
    "persistence_healthy",
    "store_status_healthy",
    "memory_records_available",
    "relationship_profiles_available",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "state_status",
    "latest_payload_kind",
    "validation_status",
    "boundary_audit_status",
  ]) {
    assertSafeOptionalStatus(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "memory_store_health",
    "relationship_store_health",
  ]) {
    if (!["not_configured", "ready", "attention"].includes(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "memory_operation_health",
    "relationship_operation_health",
    "memory_backup_write_health",
    "relationship_backup_write_health",
  ]) {
    if (!["idle", "ready", "attention"].includes(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "state_age_ms",
    "history_event_count",
    "history_validation_seen_count",
    "history_validation_ready_count",
    "history_persistence_seen_count",
    "history_persistence_success_count",
    "history_memory_persistence_success_count",
    "history_relationship_persistence_success_count",
    "history_persistence_attention_count",
    "memory_validated_count",
    "relationship_validated_count",
    "rejected_candidate_count",
    "memory_committed_count",
    "relationship_committed_count",
    "memory_failed_count",
    "relationship_failed_count",
    "persistence_error_count",
  ]) {
    if (summary[field] !== null) {
      assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "counts_statuses_booleans_and_ages_only",
      "no_raw_stream_state",
      "no_memory_records",
      "no_relationship_records",
      "no_candidates",
      "no_commands",
      "no_store_paths",
      "no_endpoint_values",
      "no_secret_values",
      "script_names_only",
    ],
    `${context}: candidate commit flow boundary`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertIdentityScopeFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: identity scope flow summary required`);
  }
  if (summary.schema !== "iris_persistence_identity_scope_flow_summary_v1") {
    throw new ContractError(`${context}: invalid identity scope flow schema`);
  }
  if (!IDENTITY_SCOPE_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid identity scope flow status`);
  }
  if (
    !READINESS_STATES.has(summary.readiness_state) ||
    summary.readiness_state !== readinessStateForRecordFlowStatus(summary.flow_status)
  ) {
    throw new ContractError(`${context}: invalid identity scope readiness`);
  }
  for (const field of [
    "runtime_status_available",
    "persistence_enabled",
    "candidate_persistence_enabled",
    "relationship_memory_enabled",
    "memory_records_available",
    "relationship_profiles_available",
    "relationship_memory_complete",
    "memory_activity_available",
    "relationship_activity_available",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of ["memory_store_health", "relationship_store_health"]) {
    if (!["not_configured", "ready", "attention"].includes(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "per_user_identity_scope_required",
    "memory_records_require_identity_scope",
    "relationship_updates_require_identity_scope",
    "relationship_value_changes_require_validated_candidate",
    "approved_records_only",
    "candidates_are_review_only",
    "direct_candidate_persistence_blocked",
  ]) {
    if (summary.identity_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid identity policy`);
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "booleans_statuses_and_policy_only",
      "no_viewer_ids",
      "no_display_names",
      "no_memory_records",
      "no_relationship_records",
      "no_candidates",
      "no_store_paths",
      "no_endpoint_values",
      "no_secret_values",
    ],
    `${context}: identity scope boundary`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertRelationshipValueFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: relationship value flow summary required`);
  }
  if (summary.schema !== "iris_persistence_relationship_value_flow_summary_v1") {
    throw new ContractError(`${context}: invalid relationship value flow schema`);
  }
  if (!RELATIONSHIP_VALUE_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid relationship value flow status`);
  }
  if (!RELATIONSHIP_VALUE_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid relationship value blocking stage`);
  }
  if (
    !READINESS_STATES.has(summary.readiness_state) ||
    summary.readiness_state !== readinessStateForBlockingStage(summary.blocking_stage)
  ) {
    throw new ContractError(`${context}: invalid relationship value readiness`);
  }
  assertNextCheckScriptMatchesBlockingStage(summary, context, "relationship value flow");
  for (const field of [
    "preflight_ready",
    "runtime_status_available",
    "candidate_persistence_enabled",
    "relationship_memory_enabled",
    "memory_records_available",
    "relationship_profiles_available",
    "relationship_memory_complete",
    "relationship_activity_available",
    "identity_scope_enforced",
    "approved_records_only",
    "direct_candidate_persistence_blocked",
    "candidate_gate_seen",
    "candidate_validation_passed",
    "candidate_persistence_committed",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "relationship_store_health",
  ]) {
    if (!["not_configured", "ready", "attention"].includes(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "relationship_operation_health",
    "relationship_backup_write_health",
  ]) {
    if (!["idle", "ready", "attention"].includes(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "relationship_latest_activity_age_ms",
  ]) {
    if (summary[field] !== null) {
      assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "relationship_operation_success_count",
    "relationship_operation_error_count",
    "relationship_backup_write_success_count",
    "relationship_backup_write_error_count",
    "relationship_profile_count",
    "memory_record_count",
    "relationship_level_known_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  assertRelationshipLevelCountsSafe(
    summary.relationship_level_counts,
    `${context}: relationship level counts`
  );
  if (!CANDIDATE_COMMIT_FLOW_STATUSES.has(summary.candidate_commit_flow_status)) {
    throw new ContractError(`${context}: invalid relationship candidate flow status`);
  }
  if (!IDENTITY_SCOPE_FLOW_STATUSES.has(summary.identity_scope_flow_status)) {
    throw new ContractError(`${context}: invalid relationship identity flow status`);
  }
  for (const field of [
    "per_user_relationship_profiles_required",
    "relationship_level_counts_only",
    "relationship_score_values_hidden",
    "relationship_updates_validation_gated",
    "relationship_updates_require_approved_schema",
    "direct_relationship_commit_blocked",
  ]) {
    if (summary.relationship_value_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid relationship value policy`);
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "counts_statuses_booleans_and_policy_only",
      "no_viewer_ids",
      "no_display_names",
      "no_relationship_scores",
      "no_memory_records",
      "no_relationship_records",
      "no_candidates",
      "no_store_paths",
      "no_endpoint_values",
      "no_secret_values",
      "read_only_runtime_status",
      "script_names_only",
    ],
    `${context}: relationship value boundary`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertLongTermRecallFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: long term recall flow required`);
  }
  if (summary.schema !== "iris_persistence_long_term_recall_flow_summary_v1") {
    throw new ContractError(`${context}: invalid long term recall schema`);
  }
  if (!LONG_TERM_RECALL_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid long term recall status`);
  }
  if (!LONG_TERM_RECALL_BLOCKING_STAGES.has(summary.blocking_stage)) {
    throw new ContractError(`${context}: invalid long term recall blocking stage`);
  }
  if (
    !READINESS_STATES.has(summary.readiness_state) ||
    summary.readiness_state !== readinessStateForBlockingStage(summary.blocking_stage)
  ) {
    throw new ContractError(`${context}: invalid long term recall readiness`);
  }
  assertNextCheckScriptMatchesBlockingStage(summary, context, "long term recall flow");
  for (const field of [
    "preflight_ready",
    "runtime_status_available",
    "persistence_enabled",
    "candidate_persistence_enabled",
    "relationship_memory_enabled",
    "vector_memory_adapter_ready",
    "memory_store_ready",
    "relationship_store_ready",
    "store_status_healthy",
    "memory_records_available",
    "relationship_profiles_available",
    "replay_entries_available",
    "candidate_review_items_available",
    "memory_activity_available",
    "relationship_activity_available",
    "public_memory_recall_available",
    "per_user_relationship_recall_available",
    "durable_restart_recall_ready",
    "identity_scope_enforced",
    "approved_records_only",
    "direct_candidate_persistence_blocked",
    "vector_memory_search_ready",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "memory_record_count",
    "relationship_profile_count",
    "replay_entry_count",
    "candidate_review_item_count",
    "memory_operation_success_count",
    "relationship_operation_success_count",
    "memory_operation_error_count",
    "relationship_operation_error_count",
    "memory_backup_write_success_count",
    "relationship_backup_write_success_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "memory_latest_activity_age_ms",
    "relationship_latest_activity_age_ms",
  ]) {
    if (summary[field] !== null) {
      assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
    }
  }
  for (const field of ["memory_store_health", "relationship_store_health"]) {
    if (!["not_configured", "ready", "attention"].includes(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "memory_operation_health",
    "relationship_operation_health",
    "memory_backup_write_health",
    "relationship_backup_write_health",
  ]) {
    if (!["idle", "ready", "attention"].includes(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertCountMapSafe(
    summary.memory_type_counts,
    MEMORY_TYPE_KEYS,
    `${context}: memory type counts`
  );
  assertCountMapSafe(
    summary.memory_owner_scope_counts,
    MEMORY_OWNER_SCOPE_KEYS,
    `${context}: memory owner scope counts`
  );
  assertRelationshipLevelCountsSafe(
    summary.relationship_level_counts,
    `${context}: relationship level counts`
  );
  for (const field of [
    "long_term_memory_read_back_from_approved_records",
    "per_user_relationship_recall_requires_identity_scope",
    "game_and_stream_memory_types_counted_only",
    "vector_recall_uses_public_records_only",
    "candidate_objects_never_recalled",
    "restart_resume_uses_store_status_only",
  ]) {
    if (summary.long_term_recall_policy?.[field] !== true) {
      throw new ContractError(`${context}: invalid long term recall policy`);
    }
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "counts_statuses_booleans_and_policy_only",
      "no_viewer_ids",
      "no_display_names",
      "no_memory_summaries",
      "no_memory_records",
      "no_relationship_records",
      "no_relationship_scores",
      "no_candidates",
      "no_store_paths",
      "no_endpoint_values",
      "no_secret_values",
      "read_only_runtime_status",
      "script_names_only",
    ],
    `${context}: long term recall boundary`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertMemoryRelationshipLifecycleFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: memory relationship lifecycle flow required`);
  }
  if (
    summary.schema !==
    "iris_persistence_memory_relationship_lifecycle_flow_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid memory relationship lifecycle schema`);
  }
  if (!MEMORY_RELATIONSHIP_LIFECYCLE_FLOW_STATUSES.has(summary.flow_status)) {
    throw new ContractError(`${context}: invalid memory relationship lifecycle status`);
  }
  if (
    !MEMORY_RELATIONSHIP_LIFECYCLE_BLOCKING_STAGES.has(summary.blocking_stage)
  ) {
    throw new ContractError(`${context}: invalid memory relationship blocking stage`);
  }
  if (
    !READINESS_STATES.has(summary.readiness_state) ||
    summary.readiness_state !== readinessStateForBlockingStage(summary.blocking_stage)
  ) {
    throw new ContractError(`${context}: invalid memory relationship readiness`);
  }
  assertNextCheckScriptMatchesBlockingStage(
    summary,
    context,
    "memory relationship lifecycle flow"
  );
  for (const field of [
    "preflight_ready",
    "runtime_status_available",
    "persistence_enabled",
    "candidate_persistence_enabled",
    "relationship_memory_enabled",
    "vector_memory_adapter_ready",
    "memory_store_ready",
    "relationship_store_ready",
    "store_status_healthy",
    "memory_records_available",
    "relationship_profiles_available",
    "relationship_memory_complete",
    "memory_activity_available",
    "relationship_activity_available",
    "identity_scope_enforced",
    "approved_records_only",
    "direct_candidate_persistence_blocked",
    "candidate_gate_seen",
    "candidate_validation_passed",
    "candidate_persistence_committed",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "memory_record_count",
    "relationship_profile_count",
    "candidate_review_item_count",
    "memory_operation_success_count",
    "relationship_operation_success_count",
    "memory_operation_error_count",
    "relationship_operation_error_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "memory_backup_write_health",
    "relationship_backup_write_health",
  ]) {
    if (!["idle", "ready", "attention"].includes(summary[field])) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (!IDENTITY_SCOPE_FLOW_STATUSES.has(summary.identity_scope_flow_status)) {
    throw new ContractError(`${context}: invalid identity scope lifecycle status`);
  }
  if (!CANDIDATE_COMMIT_FLOW_STATUSES.has(summary.candidate_commit_flow_status)) {
    throw new ContractError(`${context}: invalid candidate commit lifecycle status`);
  }
  if (!APPROVED_RECORD_FLOW_STATUSES.has(summary.approved_record_flow_status)) {
    throw new ContractError(`${context}: invalid approved record lifecycle status`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    [
      "counts_statuses_booleans_and_policy_only",
      "no_viewer_ids",
      "no_display_names",
      "no_memory_records",
      "no_relationship_records",
      "no_candidates",
      "no_store_paths",
      "no_endpoint_values",
      "no_secret_values",
      "read_only_runtime_status",
      "script_names_only",
    ],
    `${context}: memory relationship lifecycle boundary`
  );
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertStoreSafe(store, context) {
  if (!store || typeof store !== "object" || Array.isArray(store)) {
    throw new ContractError(`${context}: store is required`);
  }
  for (const field of ["configured", "activity_available", "read_error"]) {
    if (typeof store[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "retained_item_count",
    "operation_attempt_count",
    "operation_success_count",
    "operation_error_count",
    "backup_write_attempt_count",
    "backup_write_success_count",
    "backup_write_error_count",
  ]) {
    assertNonNegativeInteger(store[field], `${context}: invalid ${field}`);
  }
  if (store.latest_activity_age_ms !== null) {
    assertNonNegativeInteger(
      store.latest_activity_age_ms,
      `${context}: invalid latest activity age`
    );
  }
  for (const field of ["health", "operation_health", "backup_write_health"]) {
    if (typeof store[field] !== "string") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (store.error_kind !== null && typeof store.error_kind !== "string") {
    throw new ContractError(`${context}: invalid error kind`);
  }
}

function assertSafeStoreStatus(status, context) {
  if (
    typeof status !== "string" ||
    !["ready", "attention", "disabled", "not_configured", "unknown"].includes(status)
  ) {
    throw new ContractError(`${context}: invalid store status`);
  }
}

function assertCapabilityFlagsSafe(flags, context) {
  if (!flags || typeof flags !== "object" || Array.isArray(flags)) {
    throw new ContractError(`${context}: capability flags required`);
  }
  for (const field of [
    "persistence",
    "candidate_persistence",
    "relationship_memory",
    "replay_log",
  ]) {
    if (typeof flags[field] !== "boolean") {
      throw new ContractError(`${context}: invalid capability ${field}`);
    }
  }
}

function assertPersistencePolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: persistence policy required`);
  }
  for (const field of [
    "memory_records_require_approval",
    "relationship_records_require_approval",
    "candidate_records_require_validation",
    "direct_candidate_commit_blocked",
    "relationship_values_require_validated_candidate",
    "long_term_recall_uses_approved_records_only",
    "public_status_counts_only",
    "private_summaries_filtered",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid persistence policy`);
    }
  }
}

function assertRelationshipLevelCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: counts required`);
  }
  for (const level of RELATIONSHIP_LEVELS) {
    assertNonNegativeInteger(counts[level], `${context}: invalid ${level}`);
  }
  for (const level of Object.keys(counts)) {
    if (!RELATIONSHIP_LEVELS.includes(level)) {
      throw new ContractError(`${context}: unexpected level`);
    }
  }
}

function assertCountMapSafe(counts, keys, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: counts required`);
  }
  for (const key of keys) {
    assertNonNegativeInteger(counts[key], `${context}: invalid ${key}`);
  }
  for (const key of Object.keys(counts)) {
    if (!keys.includes(key)) {
      throw new ContractError(`${context}: unexpected count key`);
    }
  }
}

function firstRuntimeCheckScript(flows) {
  for (const flow of flows) {
    if (flow?.next_check_script) return flow.next_check_script;
  }
  return null;
}

function checkScriptForBlockingStage(blockingStage) {
  return RUNTIME_CHECK_SCRIPTS[blockingStage] ?? null;
}

function assertNextCheckScriptMatchesBlockingStage(summary, context, label) {
  const expected = checkScriptForBlockingStage(summary.blocking_stage);
  if (summary.next_check_script !== expected) {
    throw new ContractError(`${context}: invalid ${label} next check script`);
  }
  assertSafeOptionalScriptName(
    summary.next_check_script,
    `${context}: ${label} next check script`
  );
}

function assertSafeOptionalScriptName(script, context) {
  if (script === null) return;
  assertSafeScriptName(script, context);
}

function assertSafeScriptName(script, context) {
  if (
    typeof script !== "string" ||
    !/^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      script
    )
  ) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function safeStatus(value, allowed) {
  const text = String(value ?? "").trim();
  return allowed.includes(text) ? text : allowed[0];
}

function safeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function safeNullableCount(value) {
  if (value === null || value === undefined) return null;
  return safeCount(value);
}

function readStreamState(streamState) {
  if (!streamState || typeof streamState.get !== "function") return null;
  try {
    const state = streamState.get();
    return state && typeof state === "object" && !Array.isArray(state) ? state : null;
  } catch {
    return null;
  }
}

function safeStateAge(updatedAtMs, generatedAtMs) {
  const updated = Number(updatedAtMs);
  const generated = Number(generatedAtMs);
  if (!Number.isFinite(updated) || !Number.isFinite(generated)) return null;
  return Math.max(0, Math.trunc(generated - updated));
}

function safeOptionalStatus(value) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).replace(/\s+/g, "_").trim().slice(0, 80);
  if (
    !/^[a-zA-Z0-9_:-]+$/.test(text) ||
    URL_PATTERN.test(text) ||
    UNSAFE_STATUS_PATTERN.test(text)
  ) {
    return "attention";
  }
  return text;
}

function assertSafeOptionalStatus(value, context) {
  if (value === null) return;
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 80 ||
    !/^[a-zA-Z0-9_:-]+$/.test(value) ||
    UNSAFE_STATUS_PATTERN.test(value)
  ) {
    throw new ContractError(context);
  }
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function assertNoForbiddenPersistenceRuntimeStatusFields(
  value,
  context,
  path = "root"
) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenPersistenceRuntimeStatusFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_PERSISTENCE_RUNTIME_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe runtime status field`, { field, path });
    }
    assertNoForbiddenPersistenceRuntimeStatusFields(child, context, `${path}.${field}`);
  }
}
