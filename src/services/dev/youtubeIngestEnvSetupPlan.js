import { ContractError } from "../../core/contracts.js";
import {
  assertYouTubeIngestLaunchPlanSafe,
  createYouTubeIngestLaunchPlan,
} from "./youtubeIngestLaunchPlan.js";
import {
  assertYouTubeIngestPreflightReportSafe,
  createYouTubeIngestPreflightReport,
} from "./youtubeIngestPreflight.js";

const FORBIDDEN_YOUTUBE_ENV_SETUP_FIELDS = new Set([
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
  "approved_memory_record",
  "approved_relationship_record",
  "internal_profile",
  "canonical_profile",
  "profile_enum",
  "final_text",
  "last_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
  "endpoint",
  "url",
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
  "path",
  "cursor_path",
]);

const PLAN_STATUSES = new Set([
  "ready_for_youtube_ingest_env_setup",
  "configure_youtube_ingest_env_first",
]);
const GROUP_STATUSES = new Set(["ready", "attention"]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const ATTENTION_REASONS = new Set([
  "ready",
  "missing_required_env",
  "configuration_attention",
  "local_target_policy_attention",
]);
const SOURCE_MODES = new Set(["youtube_api", "http_relay", "not_configured"]);
const ENV_GROUP_IDS = new Set([
  "youtube_source_selection",
  "youtube_live_chat_target",
  "youtube_credentials",
  "youtube_cursor_resume",
  "youtube_http_ingest_scheduler",
]);
const ENV_GROUP_KINDS = new Set([
  "source_selection_config",
  "target_config",
  "credential_config",
  "cursor_resume_config",
  "scheduler_config",
]);
const PROCESS_IDS = new Set([
  "youtube_ingest_source_path",
  "youtube_upstream_target",
  "youtube_auth",
  "youtube_cursor_resume",
  "http_ingest_scheduler",
]);
const PROCESS_TO_GROUP = {
  youtube_ingest_source_path: {
    envGroupId: "youtube_source_selection",
    envGroupKind: "source_selection_config",
    guidanceLabels: ["choose_direct_api_or_relay"],
  },
  youtube_upstream_target: {
    envGroupId: "youtube_live_chat_target",
    envGroupKind: "target_config",
    guidanceLabels: ["chat_target_required", "relay_local_only"],
  },
  youtube_auth: {
    envGroupId: "youtube_credentials",
    envGroupKind: "credential_config",
    guidanceLabels: ["credential_option_required"],
  },
  youtube_cursor_resume: {
    envGroupId: "youtube_cursor_resume",
    envGroupKind: "cursor_resume_config",
    guidanceLabels: ["cursor_store_required"],
  },
  http_ingest_scheduler: {
    envGroupId: "youtube_http_ingest_scheduler",
    envGroupKind: "scheduler_config",
    guidanceLabels: ["scheduler_required", "support_events_to_donation_pipeline"],
  },
};
const GUIDANCE_LABELS = new Set([
  "choose_direct_api_or_relay",
  "chat_target_required",
  "relay_local_only",
  "credential_option_required",
  "cursor_store_required",
  "scheduler_required",
  "support_events_to_donation_pipeline",
]);
const ANY_OF_GROUP_IDS = new Set([
  "youtube_source_path",
  "youtube_live_chat_target",
  "youtube_api_auth",
]);
const SUPPORT_EVENT_POLICY_FIELDS = [
  "comment_events_remain_comment_events",
  "normalized_as_donation_event",
  "support_events_not_normalized_as_comments",
  "relationship_and_memory_candidates_validation_gated",
  "support_messages_not_exposed_in_status",
];
const URL_PATTERN = /\bhttps?:\/\//i;
const UNSAFE_LABEL_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory|relationship|candidate|canonical|secret|token|password|authorization|endpoint|url|payload|text)\b|https?:\/\//i;
const YOUTUBE_INGEST_ENV_SETUP_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "plan_status",
  "preflight_status",
  "youtube_launch_plan_status",
  "source_mode",
  "auth_mode",
  "env_group_count",
  "ready_env_group_count",
  "attention_env_group_count",
  "next_env_group_id",
  "next_env_group_kind",
  "next_attention_reason",
  "next_readiness_state",
  "readiness_state_counts",
  "next_configure_env",
  "next_launch_script",
  "next_readiness_script",
  "missing_required_env_count",
  "env_groups",
  "verification_scripts",
  "support_event_policy",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);

export function createYouTubeIngestEnvSetupPlan({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const preflight = createYouTubeIngestPreflightReport({ env, generatedAtMs });
  const launchPlan = createYouTubeIngestLaunchPlan({ env, generatedAtMs });
  assertYouTubeIngestPreflightReportSafe(preflight, "youtube env setup preflight");
  assertYouTubeIngestLaunchPlanSafe(launchPlan, "youtube env setup launch plan");

  const envGroups = buildEnvGroups(launchPlan.launch_sequence);
  const nextGroup = envGroups.find((group) => group.setup_status !== "ready") ?? null;
  const readyEnvGroupCount = envGroups.filter(
    (group) => group.setup_status === "ready"
  ).length;
  const plan = {
    schema: "iris_youtube_ingest_env_setup_plan_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "youtube_comments_and_support",
    target_stage_priority: 2,
    plan_status:
      nextGroup === null && launchPlan.plan_status === "ready_to_launch_youtube_ingest"
        ? "ready_for_youtube_ingest_env_setup"
        : "configure_youtube_ingest_env_first",
    preflight_status: preflight.preflight_status,
    youtube_launch_plan_status: launchPlan.plan_status,
    source_mode: launchPlan.source_mode,
    auth_mode: preflight.auth_mode,
    env_group_count: envGroups.length,
    ready_env_group_count: readyEnvGroupCount,
    attention_env_group_count: envGroups.length - readyEnvGroupCount,
    next_env_group_id: nextGroup?.env_group_id ?? null,
    next_env_group_kind: nextGroup?.env_group_kind ?? null,
    next_attention_reason: nextGroup?.attention_reason ?? null,
    next_readiness_state: nextGroup?.readiness_state ?? "ready",
    readiness_state_counts: countReadinessStates(envGroups),
    next_configure_env: nextGroup?.next_configure_env ?? [],
    next_launch_script: nextGroup?.launch_script ?? null,
    next_readiness_script: nextGroup?.readiness_script ?? null,
    missing_required_env_count: launchPlan.missing_required_env_count,
    env_groups: envGroups,
    verification_scripts: {
      schema: "iris_youtube_ingest_env_setup_plan_scripts_v1",
      local_env_profile_script: "npm run dev:youtube:local-env-profile",
      local_env_apply_plan_script: "npm run dev:youtube:local-env-apply",
      env_setup_plan_script: "npm run dev:youtube:env-setup-plan",
      preflight_script: "npm run dev:youtube:preflight",
      launch_plan_script: "npm run dev:youtube:launch-plan",
      relay_bridge_script: "npm run dev:youtube:relay-bridge",
      relay_readiness_rehearsal_script:
        "npm run dev:youtube:relay-readiness-rehearsal",
      relay_startup_checklist_script:
        "npm run dev:youtube:relay-startup-checklist",
      source_status_script: "npm run dev:youtube:source-status",
      runtime_status_script: "npm run dev:youtube:runtime-status",
      live_readiness_script: "npm run dev:youtube:live-readiness",
      configured_ingest_script:
        launchPlan.runtime_poll_verification_summary.configured_ingest_script,
      http_ingest_roundtrip_script:
        launchPlan.runtime_poll_verification_summary.http_ingest_roundtrip_script,
      runtime_ingest_roundtrip_script:
        launchPlan.runtime_poll_verification_summary.runtime_ingest_roundtrip_script,
      support_gate_roundtrip_script:
        launchPlan.runtime_poll_verification_summary.support_gate_roundtrip_script,
      policy_gate_roundtrip_script:
        launchPlan.runtime_poll_verification_summary.policy_gate_roundtrip_script,
    },
    support_event_policy: preflight.support_event_policy,
    production_handoff_summary: {
      schema: "iris_youtube_ingest_env_setup_production_handoff_summary_v1",
      env_setup_plan_only: true,
      live_youtube_polling_not_started: true,
      oauth_flow_not_started: true,
      real_api_key_not_required_for_plan: true,
      real_chat_or_support_payloads_not_required_for_plan: true,
      support_events_remain_candidate_gated: true,
      next_production_decision_ids: [
        "choose_direct_api_or_local_relay",
        "configure_live_chat_target",
        "choose_api_key_or_oauth",
        "enable_scheduler_after_source_review",
      ],
      next_production_decision_count: 4,
      next_status_script: "npm run dev:youtube:source-status",
      next_readiness_state: nextGroup?.readiness_state ?? "ready",
      readiness_state_counts: countReadinessStates(envGroups),
    },
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      schema_names_only: true,
      fixed_ids_statuses_and_counts_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_platform_cursor_values: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_env_setup_plan: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeIngestEnvSetupPlanSafe(plan);
  return plan;
}

export function assertYouTubeIngestEnvSetupPlanSafe(
  plan,
  context = "youtube ingest env setup plan"
) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: plan is required`);
  }
  assertNoForbiddenYouTubeEnvSetupFields(plan, context);
  assertNoUrlStrings(plan, context);
  if (plan.schema !== "iris_youtube_ingest_env_setup_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!YOUTUBE_INGEST_ENV_SETUP_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected plan field`, { field });
    }
  }
  if (!Number.isInteger(plan.generated_at_ms) || plan.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (plan.target_stage_id !== "youtube_comments_and_support") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (plan.target_stage_priority !== 2) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!PLAN_STATUSES.has(plan.plan_status)) {
    throw new ContractError(`${context}: invalid plan status`);
  }
  if (
    !["ready_to_poll_youtube_ingest", "blocked_by_configuration"].includes(
      plan.preflight_status
    )
  ) {
    throw new ContractError(`${context}: invalid preflight status`);
  }
  if (
    ![
      "ready_to_launch_youtube_ingest",
      "configure_youtube_ingest_env_first",
    ].includes(plan.youtube_launch_plan_status)
  ) {
    throw new ContractError(`${context}: invalid launch plan status`);
  }
  if (!SOURCE_MODES.has(plan.source_mode)) {
    throw new ContractError(`${context}: invalid source mode`);
  }
  assertStringStatus(plan.auth_mode, `${context}: invalid auth mode`);
  if (!Array.isArray(plan.env_groups) || plan.env_groups.length === 0) {
    throw new ContractError(`${context}: env groups are required`);
  }
  plan.env_groups.forEach((group, index) =>
    assertEnvSetupGroupSafe(group, context, index + 1)
  );
  for (const field of [
    "env_group_count",
    "ready_env_group_count",
    "attention_env_group_count",
    "missing_required_env_count",
  ]) {
    assertNonNegativeInteger(plan[field], `${context}: invalid ${field}`);
  }
  if (plan.env_group_count !== plan.env_groups.length) {
    throw new ContractError(`${context}: invalid env group count`);
  }
  if (
    plan.ready_env_group_count !==
    plan.env_groups.filter((group) => group.setup_status === "ready").length
  ) {
    throw new ContractError(`${context}: invalid ready group count`);
  }
  if (
    plan.attention_env_group_count !==
    plan.env_groups.filter((group) => group.setup_status !== "ready").length
  ) {
    throw new ContractError(`${context}: invalid attention group count`);
  }
  const firstAttentionGroup =
    plan.env_groups.find((group) => group.setup_status !== "ready") ?? null;
  if (firstAttentionGroup === null) {
    if (
      plan.plan_status !== "ready_for_youtube_ingest_env_setup" ||
      plan.next_env_group_id !== null ||
      plan.next_env_group_kind !== null ||
      plan.next_attention_reason !== null ||
      plan.next_readiness_state !== "ready" ||
      plan.next_launch_script !== null ||
      plan.next_readiness_script !== null ||
      !Array.isArray(plan.next_configure_env) ||
      plan.next_configure_env.length !== 0
    ) {
      throw new ContractError(`${context}: unexpected next env group`);
    }
  } else if (
    plan.plan_status !== "configure_youtube_ingest_env_first" ||
    plan.next_env_group_id !== firstAttentionGroup.env_group_id ||
    plan.next_env_group_kind !== firstAttentionGroup.env_group_kind ||
    plan.next_attention_reason !== firstAttentionGroup.attention_reason ||
    plan.next_readiness_state !== firstAttentionGroup.readiness_state ||
    plan.next_launch_script !== firstAttentionGroup.launch_script ||
    plan.next_readiness_script !== firstAttentionGroup.readiness_script ||
    JSON.stringify(plan.next_configure_env) !==
      JSON.stringify(firstAttentionGroup.next_configure_env)
  ) {
    throw new ContractError(`${context}: invalid next env group`);
  }
  assertSafeReadinessState(plan.next_readiness_state, context);
  assertReadinessStateCountsSafe(plan.readiness_state_counts, context);
  if (
    !sameReadinessStateCounts(
      plan.readiness_state_counts,
      countReadinessStates(plan.env_groups)
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  assertEnvNameListSafe(plan.next_configure_env, `${context}: next configure env`);
  assertVerificationScriptsSafe(plan.verification_scripts, context);
  assertSupportEventPolicySafe(plan.support_event_policy, context);
  assertProductionHandoffSummarySafe(plan.production_handoff_summary, plan, context);
  assertBoundaryPolicy(
    plan.boundary_policy,
    [
      "env_names_only",
      "script_names_only",
      "schema_names_only",
      "fixed_ids_statuses_and_counts_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_platform_cursor_values",
      "no_live_payloads",
      "no_support_message_text",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "read_only_env_setup_plan",
    ],
    `${context}: boundary policy`
  );
  if (plan.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertProductionHandoffSummarySafe(summary, plan, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (
    summary.schema !==
    "iris_youtube_ingest_env_setup_production_handoff_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of [
    "env_setup_plan_only",
    "live_youtube_polling_not_started",
    "oauth_flow_not_started",
    "real_api_key_not_required_for_plan",
    "real_chat_or_support_payloads_not_required_for_plan",
    "support_events_remain_candidate_gated",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (
    !Array.isArray(summary.next_production_decision_ids) ||
    summary.next_production_decision_ids.length !==
      summary.next_production_decision_count
  ) {
    throw new ContractError(`${context}: invalid production decision count`);
  }
  for (const decisionId of summary.next_production_decision_ids) {
    if (typeof decisionId !== "string" || !/^[a-z0-9_:-]+$/i.test(decisionId)) {
      throw new ContractError(`${context}: invalid production decision id`);
    }
  }
  assertSafeScriptName(summary.next_status_script, context);
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  if (
    summary.next_readiness_state !== plan.next_readiness_state ||
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      plan.readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: production handoff readiness mismatch`);
  }
}

function buildEnvGroups(launchSequence) {
  return launchSequence.map((step, index) =>
    buildEnvGroupFromLaunchStep(step, index + 1)
  );
}

function buildEnvGroupFromLaunchStep(step, sequenceOrder) {
  const mapping = PROCESS_TO_GROUP[step.process_id];
  const setupStatus = setupStatusForStep(step);
  return {
    schema: "iris_youtube_ingest_env_setup_group_v1",
    sequence_order: sequenceOrder,
    env_group_id: mapping.envGroupId,
    env_group_kind: mapping.envGroupKind,
    source_mode_scope: step.source_mode,
    applies_to_current_source_mode: step.launch_readiness_status !== "not_applicable",
    setup_status: setupStatus,
    attention_reason: attentionReasonForStep(step),
    readiness_state: readinessStateForAttentionReason(attentionReasonForStep(step)),
    process_ref: step.process_id,
    required_env: uniqueEnvNames(step.required_env),
    required_env_any_of: sanitizeAnyOfGroups(step.required_env_any_of),
    optional_env: uniqueEnvNames(step.optional_env),
    configured_required_env: uniqueEnvNames(step.configured_required_env),
    missing_required_env: uniqueEnvNames(step.missing_required_env),
    next_configure_env: setupStatus === "ready"
      ? []
      : nextConfigureEnvForStep(step),
    launch_script: step.launch_script,
    readiness_script: step.readiness_script,
    guidance_labels: mapping.guidanceLabels,
    blocks_live_comment_ingest: step.launch_readiness_status !== "not_applicable",
    blocks_support_event_ingest: step.launch_readiness_status !== "not_applicable",
    blocks_runtime_polling: step.process_id === "http_ingest_scheduler",
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      process_ids_only: true,
      guidance_labels_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_platform_cursor_values: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_env_group: true,
    },
    adapter_validation_required: true,
  };
}

function nextConfigureEnvForStep(step) {
  const missingGroupEnv = step.missing_required_env_groups.flatMap((group) =>
    group.env_options.flatMap((option) => option)
  );
  const candidates = [
    ...step.missing_required_env,
    ...missingGroupEnv,
    ...step.configure_next_env,
  ];
  if (candidates.length > 0) return uniqueEnvNames(candidates);
  if (step.launch_readiness_status === "configuration_attention") {
    return uniqueEnvNames(step.required_env);
  }
  return [];
}

function setupStatusForStep(step) {
  return ["ready", "not_applicable"].includes(step.launch_readiness_status)
    ? "ready"
    : "attention";
}

function attentionReasonForStep(step) {
  if (setupStatusForStep(step) === "ready") return "ready";
  if (step.launch_readiness_status === "configuration_attention") {
    return step.local_target_policy_status === "attention"
      ? "local_target_policy_attention"
      : "configuration_attention";
  }
  return "missing_required_env";
}

function readinessStateForAttentionReason(reason) {
  if (reason === "ready") return "ready";
  if (reason === "local_target_policy_attention") return "operator_review_required";
  return "configuration_waiting";
}

function countReadinessStates(items) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const item of items) {
    const state = item.readiness_state;
    if (READINESS_STATES.has(state)) counts[state] += 1;
  }
  return counts;
}

function assertSafeReadinessState(state, context) {
  if (!READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: readiness state counts are required`);
  }
  for (const state of READINESS_STATES) {
    assertNonNegativeInteger(counts[state], `${context}: invalid ${state} count`);
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: unexpected readiness state count`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every(
    (state) => Number(left?.[state] ?? -1) === Number(right?.[state] ?? -2)
  );
}

function sanitizeAnyOfGroups(groups) {
  return groups.map((group) => ({
    schema: "iris_youtube_ingest_env_setup_any_of_v1",
    group_id: group.group_id,
    env_options: group.env_options.map((option) => uniqueEnvNames(option)),
    satisfied_option_index:
      Number.isInteger(group.satisfied_option_index) &&
      group.satisfied_option_index >= 0
        ? group.satisfied_option_index
        : null,
    option_count: group.env_options.length,
  }));
}

function assertEnvSetupGroupSafe(group, context, expectedOrder) {
  if (!group || typeof group !== "object" || Array.isArray(group)) {
    throw new ContractError(`${context}: invalid env group`);
  }
  if (group.schema !== "iris_youtube_ingest_env_setup_group_v1") {
    throw new ContractError(`${context}: invalid env group schema`);
  }
  if (group.sequence_order !== expectedOrder) {
    throw new ContractError(`${context}: invalid env group order`);
  }
  if (!ENV_GROUP_IDS.has(group.env_group_id)) {
    throw new ContractError(`${context}: invalid env group id`);
  }
  if (!ENV_GROUP_KINDS.has(group.env_group_kind)) {
    throw new ContractError(`${context}: invalid env group kind`);
  }
  if (!SOURCE_MODES.has(group.source_mode_scope)) {
    throw new ContractError(`${context}: invalid source mode scope`);
  }
  if (typeof group.applies_to_current_source_mode !== "boolean") {
    throw new ContractError(`${context}: invalid source-mode applicability`);
  }
  if (!GROUP_STATUSES.has(group.setup_status)) {
    throw new ContractError(`${context}: invalid setup status`);
  }
  if (!ATTENTION_REASONS.has(group.attention_reason)) {
    throw new ContractError(`${context}: invalid attention reason`);
  }
  assertSafeReadinessState(group.readiness_state, context);
  if (group.readiness_state !== readinessStateForAttentionReason(group.attention_reason)) {
    throw new ContractError(`${context}: invalid env group readiness state`);
  }
  if ((group.setup_status === "ready") !== (group.attention_reason === "ready")) {
    throw new ContractError(`${context}: invalid attention status pairing`);
  }
  if (!PROCESS_IDS.has(group.process_ref)) {
    throw new ContractError(`${context}: invalid process ref`);
  }
  const expectedMapping = PROCESS_TO_GROUP[group.process_ref];
  if (
    group.env_group_id !== expectedMapping.envGroupId ||
    group.env_group_kind !== expectedMapping.envGroupKind ||
    JSON.stringify(group.guidance_labels) !==
      JSON.stringify(expectedMapping.guidanceLabels)
  ) {
    throw new ContractError(`${context}: invalid process group mapping`);
  }
  for (const field of [
    "required_env",
    "optional_env",
    "configured_required_env",
    "missing_required_env",
    "next_configure_env",
  ]) {
    assertEnvNameListSafe(group[field], `${context}: ${field}`);
  }
  if (!Array.isArray(group.required_env_any_of)) {
    throw new ContractError(`${context}: required any-of groups must be an array`);
  }
  group.required_env_any_of.forEach((anyOfGroup) =>
    assertAnyOfGroupSafe(anyOfGroup, context)
  );
  if (
    group.setup_status === "ready" &&
    (group.missing_required_env.length !== 0 || group.next_configure_env.length !== 0)
  ) {
    throw new ContractError(`${context}: ready group has attention details`);
  }
  assertSafeScriptName(group.launch_script, `${context}: launch script`);
  assertSafeScriptName(group.readiness_script, `${context}: readiness script`);
  assertGuidanceLabelListSafe(group.guidance_labels, `${context}: guidance labels`);
  for (const field of [
    "blocks_live_comment_ingest",
    "blocks_support_event_ingest",
    "blocks_runtime_polling",
  ]) {
    if (typeof group[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertBoundaryPolicy(
    group.boundary_policy,
    [
      "env_names_only",
      "script_names_only",
      "process_ids_only",
      "guidance_labels_only",
      "no_secret_values",
      "no_endpoint_values",
      "no_platform_cursor_values",
      "no_live_payloads",
      "no_support_message_text",
      "no_payloads",
      "no_candidates",
      "no_commands",
      "read_only_env_group",
    ],
    `${context}: env group boundary policy`
  );
  if (group.adapter_validation_required !== true) {
    throw new ContractError(`${context}: env group validation required`);
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

function assertAnyOfGroupSafe(group, context) {
  if (!group || typeof group !== "object" || Array.isArray(group)) {
    throw new ContractError(`${context}: invalid any-of group`);
  }
  if (group.schema !== "iris_youtube_ingest_env_setup_any_of_v1") {
    throw new ContractError(`${context}: invalid any-of schema`);
  }
  if (!ANY_OF_GROUP_IDS.has(group.group_id)) {
    throw new ContractError(`${context}: invalid any-of group id`);
  }
  if (!Array.isArray(group.env_options) || group.env_options.length === 0) {
    throw new ContractError(`${context}: env options are required`);
  }
  for (const option of group.env_options) {
    assertEnvNameListSafe(option, `${context}: env option`);
    if (option.length === 0) {
      throw new ContractError(`${context}: empty env option`);
    }
  }
  if (group.option_count !== group.env_options.length) {
    throw new ContractError(`${context}: invalid any-of option count`);
  }
  if (
    group.satisfied_option_index !== null &&
    (!Number.isInteger(group.satisfied_option_index) ||
      group.satisfied_option_index < 0 ||
      group.satisfied_option_index >= group.env_options.length)
  ) {
    throw new ContractError(`${context}: invalid satisfied option`);
  }
}

function assertVerificationScriptsSafe(scripts, context) {
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    throw new ContractError(`${context}: verification scripts are required`);
  }
  if (scripts.schema !== "iris_youtube_ingest_env_setup_plan_scripts_v1") {
    throw new ContractError(`${context}: invalid verification scripts schema`);
  }
  for (const [field, value] of Object.entries(scripts)) {
    if (field === "schema") continue;
    assertSafeScriptName(value, `${context}: ${field}`);
  }
}

function assertSupportEventPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: support event policy is required`);
  }
  for (const field of SUPPORT_EVENT_POLICY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid support event policy`);
    }
  }
}

function uniqueEnvNames(names) {
  return [...new Set(names.filter(Boolean))];
}

function assertEnvNameListSafe(value, context) {
  if (!Array.isArray(value)) {
    throw new ContractError(`${context}: env list must be an array`);
  }
  for (const item of value) {
    if (typeof item !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(item)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
}

function assertGuidanceLabelListSafe(value, context) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ContractError(`${context}: guidance labels are required`);
  }
  for (const label of value) {
    assertSafePublicLabel(label, context);
    if (!GUIDANCE_LABELS.has(label)) {
      throw new ContractError(`${context}: unknown guidance label`);
    }
  }
}

function assertSafeScriptName(value, context) {
  if (
    typeof value !== "string" ||
    !/^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      value
    )
  ) {
    throw new ContractError(`${context}: invalid script name`);
  }
  if (/[;&|<>]/.test(value)) {
    throw new ContractError(`${context}: unsafe script name`);
  }
}

function assertSafePublicLabel(value, context) {
  if (typeof value !== "string" || value.length === 0 || value.length > 120) {
    throw new ContractError(`${context}: invalid public label`);
  }
  if (UNSAFE_LABEL_PATTERN.test(value)) {
    throw new ContractError(`${context}: unsafe public label`);
  }
  if (!/^[a-z0-9_.:-]+$/.test(value)) {
    throw new ContractError(`${context}: invalid public label shape`);
  }
}

function assertStringStatus(value, context) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 80 ||
    !/^[a-zA-Z0-9_:-]+$/.test(value)
  ) {
    throw new ContractError(context);
  }
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}

function assertNoForbiddenYouTubeEnvSetupFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenYouTubeEnvSetupFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_YOUTUBE_ENV_SETUP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe field`, { field, path });
    }
    assertNoForbiddenYouTubeEnvSetupFields(child, context, `${path}.${field}`);
  }
}

function assertNoUrlStrings(value, context, path = "root") {
  if (typeof value === "string") {
    if (URL_PATTERN.test(value)) {
      throw new ContractError(`${context}: endpoint values must not be exposed`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUrlStrings(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUrlStrings(child, context, `${path}.${field}`);
  }
}
