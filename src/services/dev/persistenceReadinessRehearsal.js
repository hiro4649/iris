import { ContractError } from "../../core/contracts.js";
import {
  assertPersistenceEnvSetupPlanSafe,
  createPersistenceEnvSetupPlan,
} from "./persistenceEnvSetupPlan.js";
import {
  assertPersistenceLaunchPlanSafe,
  createPersistenceLaunchPlan,
} from "./persistenceLaunchPlan.js";
import {
  assertPersistenceLiveReadinessReportSafe,
  createPersistenceLiveReadinessReport,
} from "./persistenceLiveReadiness.js";
import {
  assertPersistencePreflightReportSafe,
  createPersistencePreflightReport,
} from "./persistencePreflight.js";
import {
  assertPersistenceRuntimeStatusReportSafe,
  createPersistenceRuntimeStatusReport,
} from "./persistenceRuntimeStatus.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const SAFE_ENV_NAME_PATTERN = /^IRIS_[A-Z0-9_]+$/;
const SAFE_STATUS_PATTERN = /^[a-z0-9_]+$/;
const SAFE_SCRIPT_PATTERN =
  /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i;

const FORBIDDEN_PERSISTENCE_REHEARSAL_FIELDS = new Set([
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
  "memory_candidate",
  "memory_candidates",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "relationship_update_candidate",
  "raw_memory",
  "rawMemory",
  "hidden_score",
  "hiddenScore",
  "hidden_relationship_score",
  "hiddenRelationshipScore",
  "approved_memory_record",
  "approved_relationship_record",
  "memory_records",
  "relationship_profiles",
  "records",
  "profiles",
  "summary",
  "recent_summaries",
  "viewer_id",
  "viewerId",
  "author_id",
  "authorId",
  "channel_id",
  "channelId",
  "identity_id",
  "identityId",
  "display_name",
  "displayName",
  "internal_profile",
  "canonical_profile",
  "profile_enum",
  "canonical",
  "canonical_envelope",
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

const PERSISTENCE_READINESS_REHEARSAL_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "rehearsal_status",
  "preflight_status",
  "preflight_attention_reason_count",
  "preflight_next_attention_reason",
  "launch_plan_status",
  "env_setup_plan_status",
  "runtime_status",
  "live_readiness_status",
  "configured_persistence_path_ready",
  "runtime_status_available",
  "store_rehearsal_ready",
  "validation_gated_persistence_ready",
  "approved_record_flow_ready",
  "live_persistence_ready",
  "candidate_commit_attempt_performed",
  "approved_record_commit_attempt_performed",
  "direct_candidate_commit_allowed",
  "memory_candidate_direct_commit_allowed",
  "relationship_candidate_direct_commit_allowed",
  "rehearsal_requires_candidate_gate_roundtrip",
  "next_step_id",
  "next_step_script",
  "next_check_script",
  "next_configure_env",
  "runtime_flow_summary",
  "gate_summary",
  "verification_scripts",
  "persistence_safety_policy",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);

const REHEARSAL_STATUSES = new Set([
  "ready_for_persistence_operation",
  "ready_for_validation_gated_persistence_rehearsal",
  "configuration_rehearsal_attention",
  "runtime_rehearsal_attention",
  "store_rehearsal_attention",
  "approved_record_rehearsal_attention",
  "candidate_gate_rehearsal_attention",
]);
const PREFLIGHT_STATUSES = new Set([
  "ready_to_persist_memory_and_relationships",
  "blocked_by_configuration",
]);
const LAUNCH_PLAN_STATUSES = new Set([
  "ready_to_launch_persistence",
  "configure_persistence_env_first",
]);
const ENV_SETUP_PLAN_STATUSES = new Set([
  "ready_for_persistence_env_setup",
  "configure_persistence_env_first",
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
const LIVE_READINESS_STATUSES = new Set([
  "configuration_attention",
  "runtime_attention",
  "store_attention",
  "waiting_for_records",
  "candidate_gate_attention",
  "relationship_attention",
  "recall_attention",
  "ready_for_persistence_operation",
]);
const NEXT_STEP_IDS = new Set([
  "review_persistence_preflight",
  "review_persistence_runtime_status",
  "run_persistence_status_roundtrip",
  "run_persistence_candidate_gate_roundtrip",
  "run_persistence_roundtrip",
  "monitor_persistence_live_readiness",
]);

export function createPersistenceReadinessRehearsal({
  env = process.env,
  runtime = null,
  streamState = null,
  generatedAtMs = Date.now(),
} = {}) {
  const preflight = createPersistencePreflightReport({ env, generatedAtMs });
  const launchPlan = createPersistenceLaunchPlan({ env, generatedAtMs });
  const envSetupPlan = createPersistenceEnvSetupPlan({ env, generatedAtMs });
  const runtimeStatus = createPersistenceRuntimeStatusReport({
    env,
    runtime,
    streamState,
    generatedAtMs,
  });
  const liveReadiness = createPersistenceLiveReadinessReport({
    env,
    runtime,
    streamState,
    generatedAtMs,
  });

  assertPersistencePreflightReportSafe(
    preflight,
    "persistence rehearsal preflight"
  );
  assertPersistenceLaunchPlanSafe(
    launchPlan,
    "persistence rehearsal launch plan"
  );
  assertPersistenceEnvSetupPlanSafe(
    envSetupPlan,
    "persistence rehearsal env setup plan"
  );
  assertPersistenceRuntimeStatusReportSafe(
    runtimeStatus,
    "persistence rehearsal runtime status"
  );
  assertPersistenceLiveReadinessReportSafe(
    liveReadiness,
    "persistence rehearsal live readiness"
  );

  const configurationReady =
    preflight.preflight_status === "ready_to_persist_memory_and_relationships" &&
    launchPlan.plan_status === "ready_to_launch_persistence" &&
    envSetupPlan.plan_status === "ready_for_persistence_env_setup";
  const runtimeAvailable = runtimeStatus.persistence_status_available === true;
  const storeReady = liveReadiness.store_gate.ready === true;
  const livePersistenceReady =
    liveReadiness.live_readiness_status === "ready_for_persistence_operation";
  const validationGateConfigured =
    livePersistenceReady ||
    configurationReady &&
    runtimeAvailable &&
    runtimeStatus.capability_flags.persistence === true &&
    runtimeStatus.capability_flags.candidate_persistence === true &&
    runtimeStatus.capability_flags.relationship_memory === true &&
    storeReady;
  const approvedRecordFlowReady =
    liveReadiness.approved_record_gate.ready === true;
  const rehearsalStatus = summarizeRehearsalStatus({
    configurationReady,
    runtimeAvailable,
    storeReady,
    validationGateConfigured,
    approvedRecordFlowReady,
    livePersistenceReady,
  });
  const nextStep = summarizeNextStep({
    rehearsalStatus,
    preflight,
    envSetupPlan,
    runtimeStatus,
    liveReadiness,
  });

  const rehearsal = {
    schema: "iris_persistence_readiness_rehearsal_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "memory_and_relationship_persistence",
    target_stage_priority: 3,
    rehearsal_status: rehearsalStatus,
    preflight_status: preflight.preflight_status,
    preflight_attention_reason_count: preflight.attention_reason_count,
    preflight_next_attention_reason: preflight.next_attention_reason,
    launch_plan_status: launchPlan.plan_status,
    env_setup_plan_status: envSetupPlan.plan_status,
    runtime_status: runtimeStatus.runtime_status,
    live_readiness_status: liveReadiness.live_readiness_status,
    configured_persistence_path_ready: configurationReady,
    runtime_status_available: runtimeAvailable,
    store_rehearsal_ready: storeReady,
    validation_gated_persistence_ready: validationGateConfigured,
    approved_record_flow_ready: approvedRecordFlowReady,
    live_persistence_ready: livePersistenceReady,
    candidate_commit_attempt_performed: false,
    approved_record_commit_attempt_performed: false,
    direct_candidate_commit_allowed: false,
    memory_candidate_direct_commit_allowed: false,
    relationship_candidate_direct_commit_allowed: false,
    rehearsal_requires_candidate_gate_roundtrip:
      validationGateConfigured && !livePersistenceReady,
    next_step_id: nextStep.next_step_id,
    next_step_script: nextStep.next_step_script,
    next_check_script: nextStep.next_check_script,
    next_configure_env: nextStep.next_configure_env,
    runtime_flow_summary: {
      schema: "iris_persistence_rehearsal_runtime_flow_summary_v1",
      persistence_readiness_status:
        runtimeStatus.persistence_readiness_status ?? "disabled",
      persistence_runtime_state:
        runtimeStatus.persistence_runtime_state ?? "disabled",
      next_runtime_check_script: runtimeStatus.next_runtime_check_script,
      memory_record_count: runtimeStatus.runtime_counts.memory_record_count,
      relationship_profile_count:
        runtimeStatus.runtime_counts.relationship_profile_count,
      replay_entry_count: runtimeStatus.runtime_counts.replay_entry_count,
      candidate_review_item_count:
        runtimeStatus.runtime_counts.candidate_review_item_count,
      approved_record_flow_status:
        runtimeStatus.approved_record_flow.flow_status,
      identity_scope_flow_status:
        runtimeStatus.identity_scope_flow.flow_status,
      candidate_commit_flow_status:
        runtimeStatus.candidate_commit_flow.flow_status,
      candidate_commit_blocking_stage:
        runtimeStatus.candidate_commit_flow.blocking_stage,
      candidate_validation_seen:
        runtimeStatus.candidate_commit_flow.validation_seen,
      candidate_validation_passed:
        runtimeStatus.candidate_commit_flow.validation_passed,
      candidate_persistence_seen:
        runtimeStatus.candidate_commit_flow.persistence_seen,
      candidate_persistence_committed:
        runtimeStatus.candidate_commit_flow.persistence_committed,
      memory_committed_count:
        runtimeStatus.candidate_commit_flow.memory_committed_count,
      relationship_committed_count:
        runtimeStatus.candidate_commit_flow.relationship_committed_count,
      persistence_error_count:
        runtimeStatus.candidate_commit_flow.persistence_error_count,
      relationship_value_flow_status:
        runtimeStatus.relationship_value_flow.flow_status,
      relationship_value_blocking_stage:
        runtimeStatus.relationship_value_flow.blocking_stage,
      long_term_recall_flow_status:
        runtimeStatus.long_term_recall_flow.flow_status,
      long_term_recall_blocking_stage:
        runtimeStatus.long_term_recall_flow.blocking_stage,
      lifecycle_flow_status:
        runtimeStatus.memory_relationship_lifecycle_flow.flow_status,
      lifecycle_blocking_stage:
        runtimeStatus.memory_relationship_lifecycle_flow.blocking_stage,
      relationship_memory_complete:
        runtimeStatus.memory_relationship_lifecycle_flow
          .relationship_memory_complete,
      boundary_policy: {
        counts_statuses_booleans_and_policy_only: true,
        no_raw_runtime_state: true,
        no_viewer_ids: true,
        no_display_names: true,
        no_memory_records: true,
        no_relationship_records: true,
        no_memory_summaries: true,
        no_relationship_scores: true,
        no_candidates: true,
        no_commands: true,
        script_names_only: true,
      },
    },
    gate_summary: createGateSummary(liveReadiness),
    verification_scripts: {
      schema: "iris_persistence_rehearsal_scripts_v1",
      rehearsal_script: "npm run dev:persistence:readiness-rehearsal",
      preflight_script: "npm run dev:persistence:preflight",
      env_setup_plan_script: "npm run dev:persistence:env-setup-plan",
      launch_plan_script: "npm run dev:persistence:launch-plan",
      runtime_status_script: "npm run dev:persistence:runtime-status",
      live_readiness_script: "npm run dev:persistence:live-readiness",
      status_roundtrip_script: "npm run dev:persistence:status-roundtrip",
      candidate_gate_roundtrip_script:
        "npm run dev:persistence:candidate-gate-roundtrip",
      persistence_roundtrip_script: "npm run dev:persistence:roundtrip",
      restart_roundtrip_script: "npm run dev:persistence:restart-roundtrip",
      boundary_policy: {
        script_names_only: true,
        no_store_paths: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_memory_records: true,
        no_relationship_records: true,
        no_candidates: true,
        no_commands: true,
      },
    },
    persistence_safety_policy: {
      candidate_objects_are_review_only: true,
      memory_candidates_require_validation: true,
      relationship_candidates_require_validation: true,
      memory_store_validated_schema_only: true,
      relationship_store_validated_schema_only: true,
      direct_candidate_commit_blocked: true,
      rehearsal_never_commits_candidates: true,
      relationship_values_identity_scoped: true,
      internal_profiles_not_canonical_enums: true,
    },
    production_handoff_summary: {
      schema: "iris_persistence_rehearsal_handoff_summary_v1",
      rehearsal_report_only: true,
      no_commit_side_effects_by_rehearsal: true,
      candidate_commit_attempt_not_performed: true,
      approved_record_commit_attempt_not_performed: true,
      memory_candidates_not_committed_directly: true,
      relationship_candidates_not_committed_directly: true,
      internal_profiles_not_canonical_enums: true,
      viewer_identity_values_not_exposed: true,
      rehearsal_status: rehearsalStatus,
      ready_gate_count: createGateSummary(liveReadiness).ready_gate_count,
      attention_gate_count: createGateSummary(liveReadiness).attention_gate_count,
      memory_committed_count:
        runtimeStatus.candidate_commit_flow.memory_committed_count,
      relationship_committed_count:
        runtimeStatus.candidate_commit_flow.relationship_committed_count,
      persistence_error_count:
        runtimeStatus.candidate_commit_flow.persistence_error_count,
      next_step_id: nextStep.next_step_id,
      next_step_script: nextStep.next_step_script,
      next_check_script: nextStep.next_check_script,
    },
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      booleans_counts_and_fixed_statuses_only: true,
      no_secret_values: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_memory_summaries: true,
      no_relationship_scores: true,
      no_viewer_ids: true,
      no_display_names: true,
      no_candidates: true,
      no_commands: true,
      no_raw_runtime_state: true,
      no_commit_side_effects: true,
      read_only_rehearsal: true,
    },
    adapter_validation_required: true,
  };
  assertPersistenceReadinessRehearsalSafe(rehearsal);
  return rehearsal;
}

export function createRelationshipMemoryDbPreflightFixture() {
  const fixture = {
    schema: "iris_relationship_memory_db_preflight_fixture_v1",
    preflight_status: "candidate_direct_commit_rejected",
    safe_status: "validation_gate_required",
    checked_flow_count: 2,
    rejected_direct_commit_count: 2,
    memory_direct_commit_rejected: true,
    relationship_direct_commit_rejected: true,
    safe_output_only: true,
    boundary_policy: {
      candidates_require_approved_schema: true,
      memory_direct_commit_blocked: true,
      relationship_direct_commit_blocked: true,
      status_counts_only: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertRelationshipMemoryDbPreflightFixtureSafe(fixture);
  return fixture;
}

export function createMemoryRelationshipPreflightAdminPageSummary({
  memoryStatus = "validation_required",
  relationshipStatus = "validation_required",
  approvedMemoryCount = 0,
  candidateMemoryCount = 0,
  approvedRelationshipCount = 0,
  candidateRelationshipCount = 0,
} = {}) {
  const summary = {
    schema: "iris_memory_relationship_preflight_admin_page_summary_v1",
    page_status:
      memoryStatus === "ready" && relationshipStatus === "ready"
        ? "ready"
        : "attention",
    memory_status: memoryStatus,
    relationship_status: relationshipStatus,
    approved_memory_count: approvedMemoryCount,
    candidate_memory_count: candidateMemoryCount,
    approved_relationship_count: approvedRelationshipCount,
    candidate_relationship_count: candidateRelationshipCount,
    total_approved_count: approvedMemoryCount + approvedRelationshipCount,
    total_candidate_count: candidateMemoryCount + candidateRelationshipCount,
    boundary_policy: {
      approved_candidate_counts_and_status_only: true,
      no_raw_memory: true,
      no_hidden_scores: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_candidate_payloads: true,
      no_viewer_ids: true,
      no_secret_values: true,
    },
  };
  assertMemoryRelationshipPreflightAdminPageSummarySafe(summary);
  return summary;
}

export function assertMemoryRelationshipPreflightAdminPageSummarySafe(
  summary,
  context = "memory relationship preflight admin page summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  const allowedFields = new Set([
    "schema",
    "page_status",
    "memory_status",
    "relationship_status",
    "approved_memory_count",
    "candidate_memory_count",
    "approved_relationship_count",
    "candidate_relationship_count",
    "total_approved_count",
    "total_candidate_count",
    "boundary_policy",
  ]);
  for (const field of Object.keys(summary)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (
    summary.schema !==
    "iris_memory_relationship_preflight_admin_page_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!new Set(["ready", "attention"]).has(summary.page_status)) {
    throw new ContractError(`${context}: invalid page status`);
  }
  assertStatus(summary.memory_status, `${context}: invalid memory status`);
  assertStatus(
    summary.relationship_status,
    `${context}: invalid relationship status`
  );
  for (const field of [
    "approved_memory_count",
    "candidate_memory_count",
    "approved_relationship_count",
    "candidate_relationship_count",
    "total_approved_count",
    "total_candidate_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (
    summary.total_approved_count !==
      summary.approved_memory_count + summary.approved_relationship_count ||
    summary.total_candidate_count !==
      summary.candidate_memory_count + summary.candidate_relationship_count
  ) {
    throw new ContractError(`${context}: invalid aggregate counts`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "approved_candidate_counts_and_status_only",
    "no_raw_memory",
    "no_hidden_scores",
    "no_memory_records",
    "no_relationship_records",
    "no_candidate_payloads",
    "no_viewer_ids",
    "no_secret_values",
  ], `${context}: boundary policy`);
  assertNoForbiddenFields(summary, context);
  assertNoUrlStrings(summary, context);
}

export function assertRelationshipMemoryDbPreflightFixtureSafe(
  fixture,
  context = "relationship memory DB preflight fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  const allowedFields = new Set([
    "schema",
    "preflight_status",
    "safe_status",
    "checked_flow_count",
    "rejected_direct_commit_count",
    "memory_direct_commit_rejected",
    "relationship_direct_commit_rejected",
    "safe_output_only",
    "boundary_policy",
    "adapter_validation_required",
  ]);
  for (const field of Object.keys(fixture)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`, { field });
    }
  }
  if (
    fixture.schema !== "iris_relationship_memory_db_preflight_fixture_v1" ||
    fixture.preflight_status !== "candidate_direct_commit_rejected" ||
    fixture.safe_status !== "validation_gate_required" ||
    fixture.checked_flow_count !== 2 ||
    fixture.rejected_direct_commit_count !== 2 ||
    fixture.memory_direct_commit_rejected !== true ||
    fixture.relationship_direct_commit_rejected !== true ||
    fixture.safe_output_only !== true ||
    fixture.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid safe preflight fixture`);
  }
  assertBoundaryPolicy(fixture.boundary_policy, [
    "candidates_require_approved_schema",
    "memory_direct_commit_blocked",
    "relationship_direct_commit_blocked",
    "status_counts_only",
    "no_memory_records",
    "no_relationship_records",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ], `${context}: boundary policy`);
  assertNoForbiddenFields(fixture, context);
}

export function assertPersistenceReadinessRehearsalSafe(
  rehearsal,
  context = "persistence readiness rehearsal"
) {
  if (!rehearsal || typeof rehearsal !== "object" || Array.isArray(rehearsal)) {
    throw new ContractError(`${context}: rehearsal is required`);
  }
  assertNoForbiddenFields(rehearsal, context);
  assertNoUrlStrings(rehearsal, context);
  if (rehearsal.schema !== "iris_persistence_readiness_rehearsal_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(rehearsal)) {
    if (!PERSISTENCE_READINESS_REHEARSAL_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected rehearsal field`, { field });
    }
  }
  assertNonNegativeInteger(
    rehearsal.generated_at_ms,
    `${context}: invalid generated timestamp`
  );
  if (rehearsal.target_stage_id !== "memory_and_relationship_persistence") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (rehearsal.target_stage_priority !== 3) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!REHEARSAL_STATUSES.has(rehearsal.rehearsal_status)) {
    throw new ContractError(`${context}: invalid rehearsal status`);
  }
  if (!PREFLIGHT_STATUSES.has(rehearsal.preflight_status)) {
    throw new ContractError(`${context}: invalid preflight status`);
  }
  assertNonNegativeInteger(
    rehearsal.preflight_attention_reason_count,
    `${context}: invalid attention reason count`
  );
  assertOptionalStatus(
    rehearsal.preflight_next_attention_reason,
    `${context}: invalid next attention reason`
  );
  if (!LAUNCH_PLAN_STATUSES.has(rehearsal.launch_plan_status)) {
    throw new ContractError(`${context}: invalid launch plan status`);
  }
  if (!ENV_SETUP_PLAN_STATUSES.has(rehearsal.env_setup_plan_status)) {
    throw new ContractError(`${context}: invalid env setup plan status`);
  }
  if (!RUNTIME_STATUSES.has(rehearsal.runtime_status)) {
    throw new ContractError(`${context}: invalid runtime status`);
  }
  if (!LIVE_READINESS_STATUSES.has(rehearsal.live_readiness_status)) {
    throw new ContractError(`${context}: invalid live readiness status`);
  }
  for (const field of [
    "configured_persistence_path_ready",
    "runtime_status_available",
    "store_rehearsal_ready",
    "validation_gated_persistence_ready",
    "approved_record_flow_ready",
    "live_persistence_ready",
    "candidate_commit_attempt_performed",
    "approved_record_commit_attempt_performed",
    "direct_candidate_commit_allowed",
    "memory_candidate_direct_commit_allowed",
    "relationship_candidate_direct_commit_allowed",
    "rehearsal_requires_candidate_gate_roundtrip",
  ]) {
    assertBoolean(rehearsal[field], `${context}: invalid ${field}`);
  }
  if (rehearsal.candidate_commit_attempt_performed !== false) {
    throw new ContractError(`${context}: rehearsal must not commit candidates`);
  }
  if (rehearsal.approved_record_commit_attempt_performed !== false) {
    throw new ContractError(`${context}: rehearsal must not commit records`);
  }
  for (const field of [
    "direct_candidate_commit_allowed",
    "memory_candidate_direct_commit_allowed",
    "relationship_candidate_direct_commit_allowed",
  ]) {
    if (rehearsal[field] !== false) {
      throw new ContractError(`${context}: direct commit boundary required`);
    }
  }
  if (!NEXT_STEP_IDS.has(rehearsal.next_step_id)) {
    throw new ContractError(`${context}: invalid next step id`);
  }
  assertSafeScriptName(rehearsal.next_step_script, `${context}: next step script`);
  assertSafeScriptName(rehearsal.next_check_script, `${context}: next check script`);
  assertEnvNameList(rehearsal.next_configure_env, `${context}: next configure env`);
  assertRuntimeFlowSummarySafe(rehearsal.runtime_flow_summary, context);
  assertGateSummarySafe(rehearsal.gate_summary, context);
  assertVerificationScriptsSafe(rehearsal.verification_scripts, context);
  assertPersistenceSafetyPolicySafe(rehearsal.persistence_safety_policy, context);
  assertProductionHandoffSummarySafe(rehearsal.production_handoff_summary, rehearsal, context);
  assertBoundaryPolicy(rehearsal.boundary_policy, [
    "env_names_only",
    "script_names_only",
    "booleans_counts_and_fixed_statuses_only",
    "no_secret_values",
    "no_store_paths",
    "no_endpoint_values",
    "no_memory_records",
    "no_relationship_records",
    "no_memory_summaries",
    "no_relationship_scores",
    "no_viewer_ids",
    "no_display_names",
    "no_candidates",
    "no_commands",
    "no_raw_runtime_state",
    "no_commit_side_effects",
    "read_only_rehearsal",
  ], context);
  if (rehearsal.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
  if (
    rehearsal.rehearsal_status === "ready_for_persistence_operation" &&
    rehearsal.live_persistence_ready !== true
  ) {
    throw new ContractError(`${context}: live-ready rehearsal mismatch`);
  }
  if (
    rehearsal.rehearsal_status ===
      "ready_for_validation_gated_persistence_rehearsal" &&
    rehearsal.validation_gated_persistence_ready !== true
  ) {
    throw new ContractError(`${context}: validation-gated rehearsal mismatch`);
  }
  if (
    rehearsal.configured_persistence_path_ready === false &&
    rehearsal.preflight_status === "ready_to_persist_memory_and_relationships" &&
    rehearsal.launch_plan_status === "ready_to_launch_persistence" &&
    rehearsal.env_setup_plan_status === "ready_for_persistence_env_setup"
  ) {
    throw new ContractError(`${context}: configured path flag mismatch`);
  }
}

function assertProductionHandoffSummarySafe(summary, rehearsal, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (summary.schema !== "iris_persistence_rehearsal_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of [
    "rehearsal_report_only",
    "no_commit_side_effects_by_rehearsal",
    "candidate_commit_attempt_not_performed",
    "approved_record_commit_attempt_not_performed",
    "memory_candidates_not_committed_directly",
    "relationship_candidates_not_committed_directly",
    "internal_profiles_not_canonical_enums",
    "viewer_identity_values_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (
    summary.rehearsal_status !== rehearsal.rehearsal_status ||
    summary.ready_gate_count !== rehearsal.gate_summary.ready_gate_count ||
    summary.attention_gate_count !== rehearsal.gate_summary.attention_gate_count ||
    summary.memory_committed_count !==
      rehearsal.runtime_flow_summary.memory_committed_count ||
    summary.relationship_committed_count !==
      rehearsal.runtime_flow_summary.relationship_committed_count ||
    summary.persistence_error_count !==
      rehearsal.runtime_flow_summary.persistence_error_count ||
    summary.next_step_id !== rehearsal.next_step_id ||
    summary.next_step_script !== rehearsal.next_step_script ||
    summary.next_check_script !== rehearsal.next_check_script
  ) {
    throw new ContractError(`${context}: invalid production handoff totals`);
  }
  for (const field of [
    "ready_gate_count",
    "attention_gate_count",
    "memory_committed_count",
    "relationship_committed_count",
    "persistence_error_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (!NEXT_STEP_IDS.has(summary.next_step_id)) {
    throw new ContractError(`${context}: invalid production handoff next step`);
  }
  assertSafeScriptName(summary.next_step_script, `${context}: handoff next step script`);
  assertSafeScriptName(summary.next_check_script, `${context}: handoff next check script`);
}

function summarizeRehearsalStatus({
  configurationReady,
  runtimeAvailable,
  storeReady,
  validationGateConfigured,
  approvedRecordFlowReady,
  livePersistenceReady,
}) {
  if (!configurationReady) return "configuration_rehearsal_attention";
  if (!runtimeAvailable) return "runtime_rehearsal_attention";
  if (!storeReady) return "store_rehearsal_attention";
  if (livePersistenceReady) return "ready_for_persistence_operation";
  if (validationGateConfigured) {
    return "ready_for_validation_gated_persistence_rehearsal";
  }
  if (!approvedRecordFlowReady) return "approved_record_rehearsal_attention";
  return "candidate_gate_rehearsal_attention";
}

function summarizeNextStep({
  rehearsalStatus,
  preflight,
  envSetupPlan,
  runtimeStatus,
  liveReadiness,
}) {
  if (rehearsalStatus === "configuration_rehearsal_attention") {
    return {
      next_step_id: "review_persistence_preflight",
      next_step_script: "npm run dev:persistence:preflight",
      next_check_script: "npm run dev:persistence:readiness-rehearsal",
      next_configure_env:
        envSetupPlan.next_configure_env.length > 0
          ? [...envSetupPlan.next_configure_env]
          : [...preflight.missing_required_env],
    };
  }
  if (rehearsalStatus === "runtime_rehearsal_attention") {
    return {
      next_step_id: "review_persistence_runtime_status",
      next_step_script:
        runtimeStatus.next_runtime_check_script ??
        "npm run dev:persistence:runtime-status",
      next_check_script: "npm run dev:persistence:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  if (rehearsalStatus === "store_rehearsal_attention") {
    return {
      next_step_id: "run_persistence_status_roundtrip",
      next_step_script:
        liveReadiness.store_gate.next_check_script ??
        "npm run dev:persistence:status-roundtrip",
      next_check_script: "npm run dev:persistence:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  if (rehearsalStatus === "ready_for_persistence_operation") {
    return {
      next_step_id: "monitor_persistence_live_readiness",
      next_step_script: "npm run dev:persistence:live-readiness",
      next_check_script: "npm run dev:persistence:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  if (
    rehearsalStatus === "ready_for_validation_gated_persistence_rehearsal" ||
    rehearsalStatus === "candidate_gate_rehearsal_attention"
  ) {
    return {
      next_step_id: "run_persistence_candidate_gate_roundtrip",
      next_step_script: "npm run dev:persistence:candidate-gate-roundtrip",
      next_check_script: "npm run dev:persistence:readiness-rehearsal",
      next_configure_env: [],
    };
  }
  return {
    next_step_id: "run_persistence_roundtrip",
    next_step_script: "npm run dev:persistence:roundtrip",
    next_check_script: "npm run dev:persistence:readiness-rehearsal",
    next_configure_env: [],
  };
}

function createGateSummary(liveReadiness) {
  const configurationGateReady =
    liveReadiness.configuration_gate.gate_status === "ready" &&
    liveReadiness.configuration_gate.readiness_state === "ready";
  const runtimeGateReady =
    liveReadiness.runtime_gate.gate_status === "ready" &&
    liveReadiness.runtime_gate.persistence_status_available === true &&
    liveReadiness.runtime_gate.persistence_enabled === true;
  const storeGateReady =
    liveReadiness.store_gate.gate_status === "ready" &&
    liveReadiness.store_gate.memory_store_health === "ready" &&
    liveReadiness.store_gate.relationship_store_health === "ready";
  const approvedRecordGateReady =
    liveReadiness.approved_record_gate.ready === true;
  const candidateGateReady =
    liveReadiness.candidate_gate.gate_status === "ready" &&
    liveReadiness.candidate_gate.blocking_stage === "none" &&
    liveReadiness.candidate_gate.persistence_error_count === 0;
  const relationshipGateReady =
    liveReadiness.relationship_gate.gate_status === "ready" &&
    liveReadiness.relationship_gate.blocking_stage === "none" &&
    liveReadiness.relationship_gate.relationship_profiles_available === true;
  const recallGateReady =
    liveReadiness.recall_gate.gate_status === "ready" &&
    liveReadiness.recall_gate.blocking_stage === "none" &&
    liveReadiness.recall_gate.durable_restart_recall_ready === true;
  const lifecycleGateReady =
    liveReadiness.lifecycle_gate.gate_status === "ready" &&
    liveReadiness.lifecycle_gate.blocking_stage === "none" &&
    liveReadiness.lifecycle_gate.relationship_memory_complete === true;
  const gateReadyFlags = [
    configurationGateReady,
    runtimeGateReady,
    storeGateReady,
    approvedRecordGateReady,
    candidateGateReady,
    relationshipGateReady,
    recallGateReady,
    lifecycleGateReady,
  ];
  const readyGateCount = gateReadyFlags.filter(Boolean).length;
  return {
    schema: "iris_persistence_rehearsal_gate_summary_v1",
    gate_count: gateReadyFlags.length,
    ready_gate_count: readyGateCount,
    attention_gate_count: gateReadyFlags.length - readyGateCount,
    configuration_gate_ready: configurationGateReady,
    runtime_gate_ready: runtimeGateReady,
    store_gate_ready: storeGateReady,
    approved_record_gate_ready: approvedRecordGateReady,
    candidate_gate_ready: candidateGateReady,
    relationship_gate_ready: relationshipGateReady,
    recall_gate_ready: recallGateReady,
    lifecycle_gate_ready: lifecycleGateReady,
    configuration_gate_status: liveReadiness.configuration_gate.gate_status,
    runtime_gate_status: liveReadiness.runtime_gate.gate_status,
    store_gate_status: liveReadiness.store_gate.gate_status,
    approved_record_gate_status:
      liveReadiness.approved_record_gate.gate_status,
    candidate_gate_status: liveReadiness.candidate_gate.gate_status,
    relationship_gate_status: liveReadiness.relationship_gate.gate_status,
    recall_gate_status: liveReadiness.recall_gate.gate_status,
    lifecycle_gate_status: liveReadiness.lifecycle_gate.gate_status,
    boundary_policy: {
      counts_statuses_and_booleans_only: true,
      no_store_paths: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_memory_summaries: true,
      no_relationship_scores: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function assertRuntimeFlowSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: runtime flow summary is required`);
  }
  if (summary.schema !== "iris_persistence_rehearsal_runtime_flow_summary_v1") {
    throw new ContractError(`${context}: invalid runtime flow summary schema`);
  }
  for (const field of [
    "persistence_readiness_status",
    "persistence_runtime_state",
    "approved_record_flow_status",
    "identity_scope_flow_status",
    "candidate_commit_flow_status",
    "candidate_commit_blocking_stage",
    "relationship_value_flow_status",
    "relationship_value_blocking_stage",
    "long_term_recall_flow_status",
    "long_term_recall_blocking_stage",
    "lifecycle_flow_status",
    "lifecycle_blocking_stage",
  ]) {
    assertStatus(summary[field], `${context}: invalid ${field}`);
  }
  assertSafeOptionalScriptName(
    summary.next_runtime_check_script,
    `${context}: invalid next runtime check script`
  );
  for (const field of [
    "memory_record_count",
    "relationship_profile_count",
    "replay_entry_count",
    "candidate_review_item_count",
    "memory_committed_count",
    "relationship_committed_count",
    "persistence_error_count",
  ]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  for (const field of [
    "candidate_validation_seen",
    "candidate_validation_passed",
    "candidate_persistence_seen",
    "candidate_persistence_committed",
    "relationship_memory_complete",
  ]) {
    assertBoolean(summary[field], `${context}: invalid ${field}`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_booleans_and_policy_only",
    "no_raw_runtime_state",
    "no_viewer_ids",
    "no_display_names",
    "no_memory_records",
    "no_relationship_records",
    "no_memory_summaries",
    "no_relationship_scores",
    "no_candidates",
    "no_commands",
    "script_names_only",
  ], context);
}

function assertGateSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: gate summary is required`);
  }
  if (summary.schema !== "iris_persistence_rehearsal_gate_summary_v1") {
    throw new ContractError(`${context}: invalid gate summary schema`);
  }
  for (const field of ["gate_count", "ready_gate_count", "attention_gate_count"]) {
    assertNonNegativeInteger(summary[field], `${context}: invalid ${field}`);
  }
  if (summary.gate_count !== 8) {
    throw new ContractError(`${context}: invalid gate count`);
  }
  if (summary.ready_gate_count + summary.attention_gate_count !== summary.gate_count) {
    throw new ContractError(`${context}: invalid gate count summary`);
  }
  for (const field of [
    "configuration_gate_ready",
    "runtime_gate_ready",
    "store_gate_ready",
    "approved_record_gate_ready",
    "candidate_gate_ready",
    "relationship_gate_ready",
    "recall_gate_ready",
    "lifecycle_gate_ready",
  ]) {
    assertBoolean(summary[field], `${context}: invalid ${field}`);
  }
  const expectedReadyGateCount = [
    summary.configuration_gate_ready,
    summary.runtime_gate_ready,
    summary.store_gate_ready,
    summary.approved_record_gate_ready,
    summary.candidate_gate_ready,
    summary.relationship_gate_ready,
    summary.recall_gate_ready,
    summary.lifecycle_gate_ready,
  ].filter(Boolean).length;
  if (
    summary.ready_gate_count !== expectedReadyGateCount ||
    summary.attention_gate_count !== summary.gate_count - expectedReadyGateCount
  ) {
    throw new ContractError(`${context}: invalid derived gate summary`);
  }
  for (const field of [
    "configuration_gate_status",
    "runtime_gate_status",
    "store_gate_status",
    "approved_record_gate_status",
    "candidate_gate_status",
    "relationship_gate_status",
    "recall_gate_status",
    "lifecycle_gate_status",
  ]) {
    assertStatus(summary[field], `${context}: invalid ${field}`);
  }
  assertBoundaryPolicy(summary.boundary_policy, [
    "counts_statuses_and_booleans_only",
    "no_store_paths",
    "no_endpoint_values",
    "no_secret_values",
    "no_memory_records",
    "no_relationship_records",
    "no_memory_summaries",
    "no_relationship_scores",
    "no_candidates",
    "no_commands",
  ], context);
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_persistence_rehearsal_scripts_v1") {
    throw new ContractError(`${context}: invalid scripts schema`);
  }
  for (const field of [
    "rehearsal_script",
    "preflight_script",
    "env_setup_plan_script",
    "launch_plan_script",
    "runtime_status_script",
    "live_readiness_script",
    "status_roundtrip_script",
    "candidate_gate_roundtrip_script",
    "persistence_roundtrip_script",
    "restart_roundtrip_script",
  ]) {
    assertSafeScriptName(scripts[field], `${context}: invalid ${field}`);
  }
  assertBoundaryPolicy(scripts.boundary_policy, [
    "script_names_only",
    "no_store_paths",
    "no_endpoint_values",
    "no_secret_values",
    "no_memory_records",
    "no_relationship_records",
    "no_candidates",
    "no_commands",
  ], context);
}

function assertPersistenceSafetyPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: persistence safety policy is required`);
  }
  for (const field of [
    "candidate_objects_are_review_only",
    "memory_candidates_require_validation",
    "relationship_candidates_require_validation",
    "memory_store_validated_schema_only",
    "relationship_store_validated_schema_only",
    "direct_candidate_commit_blocked",
    "rehearsal_never_commits_candidates",
    "relationship_values_identity_scoped",
    "internal_profiles_not_canonical_enums",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid persistence safety policy`);
    }
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNoForbiddenFields(value, context, path = []) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFields(item, context, [...path, String(index)])
    );
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_PERSISTENCE_REHEARSAL_FIELDS.has(key)) {
      throw new ContractError(`${context}: forbidden field`, {
        field: [...path, key].join("."),
      });
    }
    assertNoForbiddenFields(nested, context, [...path, key]);
  }
}

function assertNoUrlStrings(value, context) {
  if (URL_PATTERN.test(JSON.stringify(value))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
}

function assertEnvNameList(names, context) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of names) {
    if (typeof name !== "string" || !SAFE_ENV_NAME_PATTERN.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
  if (new Set(names).size !== names.length) {
    throw new ContractError(`${context}: duplicate env name`);
  }
}

function assertSafeScriptName(script, context) {
  if (typeof script !== "string" || !SAFE_SCRIPT_PATTERN.test(script)) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function assertSafeOptionalScriptName(script, context) {
  if (script === null) return;
  assertSafeScriptName(script, context);
}

function assertStatus(value, context) {
  if (typeof value !== "string" || !SAFE_STATUS_PATTERN.test(value)) {
    throw new ContractError(context);
  }
}

function assertOptionalStatus(value, context) {
  if (value === null) return;
  assertStatus(value, context);
}

function assertBoolean(value, context) {
  if (typeof value !== "boolean") {
    throw new ContractError(context);
  }
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}
