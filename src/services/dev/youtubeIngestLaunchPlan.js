import { ContractError } from "../../core/contracts.js";
import {
  assertProductionReadinessRunbookSafe,
  createProductionReadinessRunbook,
} from "./productionReadinessRunbook.js";
import {
  assertYouTubeIngestPreflightReportSafe,
  createYouTubeIngestPreflightReport,
} from "./youtubeIngestPreflight.js";

const FORBIDDEN_YOUTUBE_LAUNCH_PLAN_FIELDS = new Set([
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
  "approved_memory_record",
  "approved_relationship_record",
  "final_text",
  "text",
  "subtitle_text",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "value",
  "payload",
]);

const PLAN_STATUSES = new Set([
  "ready_to_launch_youtube_ingest",
  "configure_youtube_ingest_env_first",
]);
const SOURCE_MODES = new Set(["youtube_api", "http_relay", "not_configured"]);
const STEP_STATUSES = new Set([
  "ready",
  "missing_required_env",
  "configuration_attention",
  "not_applicable",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const TARGET_POLICY_STATUSES = new Set(["allowed", "attention", "not_applicable"]);
const YOUTUBE_INGEST_LAUNCH_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "plan_status",
  "target_stage_id",
  "target_stage_priority",
  "source_mode",
  "launch_sequence",
  "ready_step_count",
  "attention_step_count",
  "not_applicable_step_count",
  "next_step_id",
  "next_step_order",
  "next_launch_script",
  "next_readiness_script",
  "next_readiness_state",
  "readiness_state_counts",
  "next_configure_env",
  "missing_required_env_count",
  "ingest_stage_summary",
  "integration_readiness",
  "verification_plan_summary",
  "runtime_poll_verification_summary",
  "support_event_policy",
  "boundary_policy",
  "adapter_validation_required",
]);
const PROCESS_IDS = new Set([
  "youtube_ingest_source_path",
  "youtube_upstream_target",
  "youtube_auth",
  "youtube_cursor_resume",
  "http_ingest_scheduler",
]);
const PURPOSES = new Set([
  "select_youtube_ingest_source",
  "configure_live_chat_target",
  "configure_youtube_credentials",
  "configure_restart_cursor",
  "start_http_ingest_scheduler",
]);
const ANY_OF_GROUP_IDS = new Set([
  "youtube_source_path",
  "youtube_live_chat_target",
  "youtube_api_auth",
]);
const INGEST_INTEGRATIONS = new Set([
  "youtube_live_chat_api",
  "media_and_external_topic_ingestion",
]);
const RUNTIME_POLL_VERIFICATION_SCRIPT_FIELDS = [
  "source_status_script",
  "configured_ingest_script",
  "source_specific_roundtrip_script",
  "runtime_status_script",
  "live_readiness_script",
  "runtime_ingest_roundtrip_script",
  "support_gate_roundtrip_script",
  "policy_gate_roundtrip_script",
  "http_ingest_roundtrip_script",
  "cursor_roundtrip_script",
  "cursor_backup_roundtrip_script",
];
const POLL_FLOW_ACTIVE_STATUSES = [
  "polling_active_waiting_for_items",
  "polling_active_with_comments",
  "polling_active_with_support",
  "polling_active_with_comments_and_support",
];

export function createYouTubeIngestLaunchPlan({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const preflight = createYouTubeIngestPreflightReport({ env, generatedAtMs });
  const runbook = createProductionReadinessRunbook({ env, generatedAtMs });
  assertYouTubeIngestPreflightReportSafe(preflight, "youtube launch plan preflight");
  assertProductionReadinessRunbookSafe(runbook, "youtube launch plan runbook");

  const stage = runbook.stages.find(
    (item) => item.stage_id === "youtube_comments_and_support"
  );
  if (!stage) {
    throw new ContractError("youtube launch plan: missing youtube stage");
  }

  const launchSequence = buildYouTubeLaunchSequence({ env, preflight });
  const readyStepCount = launchSequence.filter(
    (step) => step.launch_readiness_status === "ready"
  ).length;
  const attentionStepCount = launchSequence.filter(
    (step) =>
      step.launch_readiness_status === "missing_required_env" ||
      step.launch_readiness_status === "configuration_attention"
  ).length;
  const notApplicableStepCount = launchSequence.filter(
    (step) => step.launch_readiness_status === "not_applicable"
  ).length;
  const nextStep = launchSequence.find(
    (step) =>
      step.launch_readiness_status === "missing_required_env" ||
      step.launch_readiness_status === "configuration_attention"
  );
  const missingRequiredEnvCount = uniqueEnvCount(
    launchSequence.flatMap((step) => [
      ...step.missing_required_env,
      ...step.missing_required_env_groups.flatMap((group) =>
        group.env_options.flatMap((option) => option)
      ),
    ])
  );
  const launchReadinessItems = launchSequence.filter(
    (step) => step.launch_readiness_status !== "not_applicable"
  );

  const plan = {
    schema: "iris_youtube_ingest_launch_plan_v1",
    generated_at_ms: generatedAtMs,
    plan_status:
      preflight.preflight_status === "ready_to_poll_youtube_ingest" &&
      attentionStepCount === 0
        ? "ready_to_launch_youtube_ingest"
        : "configure_youtube_ingest_env_first",
    target_stage_id: "youtube_comments_and_support",
    target_stage_priority: 2,
    source_mode: preflight.source_mode,
    launch_sequence: launchSequence,
    ready_step_count: readyStepCount,
    attention_step_count: attentionStepCount,
    not_applicable_step_count: notApplicableStepCount,
    next_step_id: nextStep?.process_id ?? null,
    next_step_order: nextStep?.sequence_order ?? null,
    next_launch_script: nextStep?.launch_script ?? null,
    next_readiness_script: nextStep?.readiness_script ?? null,
    next_readiness_state: nextStep?.readiness_state ?? "ready",
    readiness_state_counts: countReadinessStates(launchReadinessItems),
    next_configure_env: nextStep ? nextConfigureEnv(nextStep) : [],
    missing_required_env_count: missingRequiredEnvCount,
    ingest_stage_summary: {
      schema: "iris_youtube_launch_stage_summary_v1",
      stage_id: stage.stage_id,
      stage_status: stage.status,
      readiness_state: readinessStateForStage(stage),
      integration_count: stage.integrations.length,
      ready_integration_count: stage.integrations.filter(
        (integration) => integration.status === "ready"
      ).length,
      attention_integration_count: stage.integrations.filter(
        (integration) => integration.status === "attention"
      ).length,
      missing_required_env_count: stage.missing_required_env.length,
      first_verification_script: stage.verification_scripts[0] ?? null,
      verification_script_count: stage.verification_scripts.length,
    },
    integration_readiness: stage.integrations.map((integration) => ({
      schema: "iris_youtube_launch_integration_readiness_v1",
      integration: integration.integration,
      status: integration.status,
      mode: integration.mode,
      readiness_state: readinessStateForIntegration(integration),
    })),
    verification_plan_summary: {
      schema: "iris_youtube_launch_verification_summary_v1",
      stage_id: stage.stage_id,
      stage_status: stage.status,
      first_verification_script: stage.verification_scripts[0] ?? null,
      verification_script_count: stage.verification_scripts.length,
      source_status_script: "npm run dev:youtube:source-status",
      configured_ingest_script: preflight.verification_plan_summary.configured_ingest_script,
      local_fixture_script: preflight.verification_plan_summary.local_fixture_script,
      runtime_status_script: "npm run dev:youtube:runtime-status",
      live_readiness_script: "npm run dev:youtube:live-readiness",
      runtime_ingest_roundtrip_script: "npm run dev:youtube:runtime-ingest-roundtrip",
      policy_gate_roundtrip_script: "npm run dev:youtube:policy-gate-roundtrip",
      cursor_roundtrip_script: "npm run dev:youtube:cursor-roundtrip",
      cursor_backup_roundtrip_script: "npm run dev:youtube:cursor-backup-roundtrip",
    },
    runtime_poll_verification_summary: {
      schema: "iris_youtube_launch_runtime_poll_verification_v1",
      stage_id: stage.stage_id,
      source_mode: preflight.source_mode,
      source_status_script: "npm run dev:youtube:source-status",
      configured_ingest_script: preflight.verification_plan_summary.configured_ingest_script,
      source_specific_roundtrip_script: sourceSpecificRoundtripScript(preflight.source_mode),
      runtime_status_script: "npm run dev:youtube:runtime-status",
      live_readiness_script: "npm run dev:youtube:live-readiness",
      runtime_ingest_roundtrip_script: "npm run dev:youtube:runtime-ingest-roundtrip",
      support_gate_roundtrip_script: "npm run dev:youtube:support-gate-roundtrip",
      policy_gate_roundtrip_script: "npm run dev:youtube:policy-gate-roundtrip",
      http_ingest_roundtrip_script: "npm run dev:youtube:http-ingest-roundtrip",
      cursor_roundtrip_script: "npm run dev:youtube:cursor-roundtrip",
      cursor_backup_roundtrip_script: "npm run dev:youtube:cursor-backup-roundtrip",
      script_count: RUNTIME_POLL_VERIFICATION_SCRIPT_FIELDS.length,
      runtime_configured_status_expected: "configured_waiting_for_scheduler_start",
      runtime_polling_status_expected: "polling_active",
      live_readiness_status_expected: "ready_for_youtube_live_ingest",
      poll_flow_active_statuses: POLL_FLOW_ACTIVE_STATUSES,
      comments_enter_runtime_pipeline_required: true,
      support_events_ready_for_donation_pipeline_required: true,
      relationship_and_memory_candidates_validation_gated: true,
      scheduler_runtime_counts_only_required: true,
      cursor_resume_required_for_direct_api: true,
      boundary_policy: {
        safe_local_scripts_only: true,
        env_names_only: true,
        script_names_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_platform_cursor_values: true,
        no_live_payloads: true,
        no_support_message_text: true,
        no_candidates: true,
        no_commands: true,
        read_only_plan: true,
      },
    },
    support_event_policy: preflight.support_event_policy,
    boundary_policy: {
      safe_local_scripts_only: true,
      env_names_only: true,
      script_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_candidates: true,
      no_commands: true,
      read_only_plan: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeIngestLaunchPlanSafe(plan);
  return plan;
}

export function assertYouTubeIngestLaunchPlanSafe(
  plan,
  context = "youtube ingest launch plan"
) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: plan is required`);
  }
  assertNoForbiddenYouTubeLaunchPlanFields(plan, context);
  if (plan.schema !== "iris_youtube_ingest_launch_plan_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!YOUTUBE_INGEST_LAUNCH_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected plan field`, { field });
    }
  }
  if (!PLAN_STATUSES.has(plan.plan_status)) {
    throw new ContractError(`${context}: invalid plan status`);
  }
  if (plan.target_stage_id !== "youtube_comments_and_support") {
    throw new ContractError(`${context}: invalid target stage`);
  }
  if (plan.target_stage_priority !== 2) {
    throw new ContractError(`${context}: invalid target priority`);
  }
  if (!SOURCE_MODES.has(plan.source_mode)) {
    throw new ContractError(`${context}: invalid source mode`);
  }
  if (!Array.isArray(plan.launch_sequence) || plan.launch_sequence.length === 0) {
    throw new ContractError(`${context}: launch sequence is required`);
  }
  plan.launch_sequence.forEach((step, index) =>
    assertYouTubeLaunchStepSafe(step, context, index + 1)
  );
  for (const field of [
    "ready_step_count",
    "attention_step_count",
    "not_applicable_step_count",
    "missing_required_env_count",
  ]) {
    if (!Number.isInteger(plan[field]) || plan[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    plan.ready_step_count +
      plan.attention_step_count +
      plan.not_applicable_step_count !==
    plan.launch_sequence.length
  ) {
    throw new ContractError(`${context}: invalid launch step count summary`);
  }
  const firstAttentionStep = plan.launch_sequence.find(
    (step) =>
      step.launch_readiness_status === "missing_required_env" ||
      step.launch_readiness_status === "configuration_attention"
  );
  if (plan.attention_step_count === 0) {
    if (
      plan.next_step_id !== null ||
      plan.next_step_order !== null ||
      plan.next_launch_script !== null ||
      plan.next_readiness_script !== null ||
      !Array.isArray(plan.next_configure_env) ||
      plan.next_configure_env.length !== 0
    ) {
      throw new ContractError(`${context}: unexpected next step`);
    }
  } else if (
    plan.next_step_id !== firstAttentionStep?.process_id ||
    plan.next_step_order !== firstAttentionStep?.sequence_order ||
    plan.next_launch_script !== firstAttentionStep?.launch_script ||
    plan.next_readiness_script !== firstAttentionStep?.readiness_script
  ) {
    throw new ContractError(`${context}: invalid next step`);
  }
  if (plan.next_launch_script !== null) {
    assertSafeDevScript(plan.next_launch_script, `${context}: next launch script`);
  }
  if (plan.next_readiness_script !== null) {
    assertSafeDevScript(
      plan.next_readiness_script,
      `${context}: next readiness script`
    );
  }
  assertSafeReadinessState(plan.next_readiness_state, context);
  assertReadinessStateCountsSafe(plan.readiness_state_counts, context);
  if (plan.next_readiness_state !== (firstAttentionStep?.readiness_state ?? "ready")) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  if (
    !sameReadinessStateCounts(
      plan.readiness_state_counts,
      countReadinessStates(
        plan.launch_sequence.filter(
          (step) => step.launch_readiness_status !== "not_applicable"
        )
      )
    )
  ) {
    throw new ContractError(`${context}: invalid readiness state counts`);
  }
  assertEnvNameListSafe(plan.next_configure_env, `${context}: next configure env`);
  if (
    firstAttentionStep &&
    JSON.stringify(plan.next_configure_env) !==
      JSON.stringify(nextConfigureEnv(firstAttentionStep))
  ) {
    throw new ContractError(`${context}: invalid next configure env`);
  }
  if (
    plan.plan_status === "ready_to_launch_youtube_ingest" &&
    plan.attention_step_count !== 0
  ) {
    throw new ContractError(`${context}: ready launch plan has attention steps`);
  }
  if (
    plan.plan_status === "configure_youtube_ingest_env_first" &&
    plan.attention_step_count === 0
  ) {
    throw new ContractError(`${context}: configure plan has no attention steps`);
  }
  assertYouTubeStageSummarySafe(plan.ingest_stage_summary, context);
  assertYouTubeIntegrationReadinessListSafe(plan.integration_readiness, context);
  assertVerificationSummarySafe(plan.verification_plan_summary, context);
  assertRuntimePollVerificationSummarySafe(
    plan.runtime_poll_verification_summary,
    context
  );
  assertSupportEventPolicySafe(plan.support_event_policy, context);
  assertBoundaryPolicy(plan.boundary_policy, [
    "safe_local_scripts_only",
    "env_names_only",
    "script_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_support_message_text",
    "no_candidates",
    "no_commands",
    "read_only_plan",
  ], `${context}: boundary policy`);
  if (plan.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function buildYouTubeLaunchSequence({ env, preflight }) {
  const sourceMode = preflight.source_mode;
  return [
    buildSourcePathStep(env, sourceMode),
    buildUpstreamTargetStep(env, sourceMode, preflight),
    buildAuthStep(env, sourceMode),
    buildCursorStep(env, sourceMode),
    buildSchedulerStep(env, sourceMode),
  ].map((step, index) => ({ ...step, sequence_order: index + 1 }));
}

function buildSourcePathStep(env, sourceMode) {
  return buildStep({
    env,
    process_id: "youtube_ingest_source_path",
    purpose: "select_youtube_ingest_source",
    sourceMode,
    launchScript: "npm run dev:youtube:source-status",
    readinessScript: "npm run dev:youtube:source-status",
    requiredEnvAnyOf: [
      {
        group_id: "youtube_source_path",
        env_options: [["IRIS_YOUTUBE_LIVE_CHAT_SOURCE"], ["IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT"]],
      },
    ],
    optionalEnv: [
      "IRIS_YOUTUBE_LIVE_CHAT_SOURCE",
      "IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT",
      "IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT",
      "IRIS_YOUTUBE_VIDEOS_API_ENDPOINT",
    ],
    configureNextEnv: [
      "IRIS_YOUTUBE_LIVE_CHAT_ID",
      "IRIS_YOUTUBE_VIDEO_ID",
      "IRIS_YOUTUBE_VIDEO_URL",
      "IRIS_YOUTUBE_WATCH_URL",
      "IRIS_YOUTUBE_DATA_API_KEY",
      "IRIS_YOUTUBE_OAUTH_TOKEN",
      "IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN",
    ],
  });
}

function buildUpstreamTargetStep(env, sourceMode, preflight) {
  if (sourceMode === "http_relay") {
    const targetPolicyStatus =
      preflight.local_target_policy_status ?? "not_applicable";
    return buildStep({
      env,
      process_id: "youtube_upstream_target",
      purpose: "configure_live_chat_target",
      sourceMode,
      launchScript: "npm run dev:youtube:relay-status-roundtrip",
      readinessScript: "npm run dev:youtube:relay-roundtrip",
      requiredEnv: ["IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT"],
      optionalEnv: [
        "IRIS_YOUTUBE_LIVE_CHAT_API_KEY",
        "IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS",
        "IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW",
      ],
      statusOverride:
        targetPolicyStatus === "attention" ? "configuration_attention" : null,
      extra: {
        local_target_policy_status: targetPolicyStatus,
      },
    });
  }
  if (sourceMode !== "youtube_api") {
    return buildNotApplicableStep({
        process_id: "youtube_upstream_target",
        purpose: "configure_live_chat_target",
        sourceMode,
        launchScript: "npm run dev:youtube:source-status",
        readinessScript: "npm run dev:youtube:source-status",
    });
  }
  return buildStep({
    env,
    process_id: "youtube_upstream_target",
    purpose: "configure_live_chat_target",
    sourceMode,
    launchScript: "npm run dev:youtube:source-status",
    readinessScript: "npm run dev:youtube:direct-live-chat-roundtrip",
    requiredEnvAnyOf: [
      {
        group_id: "youtube_live_chat_target",
        env_options: [
          ["IRIS_YOUTUBE_LIVE_CHAT_ID"],
          ["IRIS_YOUTUBE_VIDEO_ID"],
          ["IRIS_YOUTUBE_VIDEO_URL"],
          ["IRIS_YOUTUBE_WATCH_URL"],
        ],
      },
    ],
    optionalEnv: [
      "IRIS_YOUTUBE_LIVE_CHAT_API_ENDPOINT",
      "IRIS_YOUTUBE_VIDEOS_API_ENDPOINT",
      "IRIS_YOUTUBE_LIVE_CHAT_MAX_RESULTS",
      "IRIS_YOUTUBE_LIVE_CHAT_TIMEOUT_MS",
      "IRIS_YOUTUBE_LIVE_CHAT_DEDUPE_WINDOW",
    ],
  });
}

function buildAuthStep(env, sourceMode) {
  if (sourceMode === "http_relay") {
    return buildNotApplicableStep({
      process_id: "youtube_auth",
      purpose: "configure_youtube_credentials",
      sourceMode,
      launchScript: "npm run dev:youtube:relay-status-roundtrip",
      readinessScript: "npm run dev:youtube:relay-status-roundtrip",
    });
  }
  if (sourceMode !== "youtube_api") {
    return buildNotApplicableStep({
      process_id: "youtube_auth",
      purpose: "configure_youtube_credentials",
      sourceMode,
      launchScript: "npm run dev:youtube:source-status",
      readinessScript: "npm run dev:youtube:source-status",
    });
  }
  return buildStep({
    env,
    process_id: "youtube_auth",
    purpose: "configure_youtube_credentials",
    sourceMode,
    launchScript: "npm run dev:youtube:source-status",
    readinessScript: "npm run dev:youtube:roundtrip",
    requiredEnvAnyOf: [
      {
        group_id: "youtube_api_auth",
        env_options: [
          ["IRIS_YOUTUBE_DATA_API_KEY"],
          ["IRIS_YOUTUBE_OAUTH_TOKEN"],
          [
            "IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN",
            "IRIS_YOUTUBE_OAUTH_CLIENT_ID",
            "IRIS_YOUTUBE_OAUTH_CLIENT_SECRET",
          ],
        ],
      },
    ],
    optionalEnv: [
      "IRIS_YOUTUBE_OAUTH_REFRESH_ENDPOINT",
      "IRIS_YOUTUBE_OAUTH_REFRESH_TIMEOUT_MS",
    ],
  });
}

function buildCursorStep(env, sourceMode) {
  if (sourceMode !== "youtube_api") {
    return buildNotApplicableStep({
      process_id: "youtube_cursor_resume",
      purpose: "configure_restart_cursor",
      sourceMode,
      launchScript: "npm run dev:youtube:source-status",
      readinessScript: "npm run dev:youtube:source-status",
    });
  }
  return buildStep({
    env,
    process_id: "youtube_cursor_resume",
    purpose: "configure_restart_cursor",
    sourceMode,
    launchScript: "npm run dev:youtube:source-status",
    readinessScript: "npm run dev:youtube:cursor-roundtrip",
    requiredEnv: ["IRIS_YOUTUBE_LIVE_CHAT_CURSOR_STORE_PATH"],
    optionalEnv: [
      "IRIS_YOUTUBE_LIVE_CHAT_PAGE_TOKEN",
      "IRIS_YOUTUBE_LIVE_CHAT_ERROR_BACKOFF_MS",
      "IRIS_YOUTUBE_LIVE_CHAT_MAX_ERROR_BACKOFF_MS",
    ],
  });
}

function buildSchedulerStep(env, sourceMode) {
  return buildStep({
    env,
    process_id: "http_ingest_scheduler",
    purpose: "start_http_ingest_scheduler",
    sourceMode,
    launchScript: "npm run dev:server",
    readinessScript: "npm run dev:youtube:http-ingest-roundtrip",
    requiredEnv: ["IRIS_ENABLE_HTTP_INGEST_SCHEDULER"],
    optionalEnv: [
      "IRIS_HTTP_INGEST_INTERVAL_MS",
      "IRIS_HTTP_INGEST_LIMIT",
      "IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR",
      "IRIS_YOUTUBE_BLOCKED_AUTHOR_IDS",
      "IRIS_YOUTUBE_BLOCKED_TEXT_TERMS",
    ],
    configuredRequiredEnv:
      env.IRIS_ENABLE_HTTP_INGEST_SCHEDULER === "true"
        ? ["IRIS_ENABLE_HTTP_INGEST_SCHEDULER"]
        : [],
    missingRequiredEnv:
      env.IRIS_ENABLE_HTTP_INGEST_SCHEDULER === "true"
        ? []
        : ["IRIS_ENABLE_HTTP_INGEST_SCHEDULER"],
    extra: {
      scheduler_expected_enabled: true,
    },
  });
}

function buildNotApplicableStep({
  process_id,
  purpose,
  sourceMode,
  launchScript,
  readinessScript,
}) {
  return {
    schema: "iris_youtube_launch_step_v1",
    sequence_order: 0,
    process_id,
    purpose,
    source_mode: sourceMode,
    launch_readiness_status: "not_applicable",
    readiness_state: "ready",
    launch_script: launchScript,
    readiness_script: readinessScript,
    required_env: [],
    required_env_any_of: [],
    optional_env: [],
    configure_next_env: [],
    configured_required_env: [],
    missing_required_env: [],
    missing_required_env_groups: [],
  };
}

function buildStep({
  env,
  process_id,
  purpose,
  sourceMode,
  launchScript,
  readinessScript,
  requiredEnv = [],
  requiredEnvAnyOf = [],
  optionalEnv = [],
  configureNextEnv = [],
  configuredRequiredEnv = null,
  missingRequiredEnv = null,
  statusOverride = null,
  extra = {},
}) {
  const configuredRequired =
    configuredRequiredEnv ??
    requiredEnv.filter((name) => Boolean(readEnv(name, env)));
  const missingRequired =
    missingRequiredEnv ??
    requiredEnv.filter((name) => !Boolean(readEnv(name, env)));
  const evaluatedGroups = requiredEnvAnyOf.map((group) =>
    evaluateAnyOfEnvGroup(group, env)
  );
  const missingGroups = evaluatedGroups.filter(
    (group) => group.satisfied_option_index === null
  );
  return {
    schema: "iris_youtube_launch_step_v1",
    sequence_order: 0,
    process_id,
    purpose,
    source_mode: sourceMode,
    launch_readiness_status:
      statusOverride ??
      (missingRequired.length === 0 && missingGroups.length === 0
        ? "ready"
        : "missing_required_env"),
    readiness_state: readinessStateForLaunchStatus(
      statusOverride ??
        (missingRequired.length === 0 && missingGroups.length === 0
          ? "ready"
          : "missing_required_env")
    ),
    launch_script: launchScript,
    readiness_script: readinessScript,
    required_env: requiredEnv,
    required_env_any_of: evaluatedGroups,
    optional_env: optionalEnv,
    configure_next_env: configureNextEnv,
    configured_required_env: configuredRequired,
    missing_required_env: missingRequired,
    missing_required_env_groups: missingGroups,
    ...extra,
  };
}

function evaluateAnyOfEnvGroup(group, env) {
  const options = group.env_options.map((option) => [...option]);
  const satisfiedIndex = options.findIndex((option) =>
    option.every((name) => Boolean(readEnv(name, env)))
  );
  return {
    schema: "iris_youtube_launch_env_any_of_v1",
    group_id: group.group_id,
    env_options: options,
    satisfied_option_index: satisfiedIndex >= 0 ? satisfiedIndex : null,
    option_count: options.length,
  };
}

function readEnv(name, env) {
  return (env ?? process.env)[name];
}

function uniqueEnvCount(names) {
  return new Set(names.filter((name) => typeof name === "string")).size;
}

function nextConfigureEnv(step) {
  if (!step) return [];
  const missingGroupEnv = step.missing_required_env_groups.flatMap((group) =>
    group.env_options.flatMap((option) => option)
  );
  const candidates = [...step.missing_required_env, ...missingGroupEnv];
  const fallback =
    candidates.length > 0
      ? candidates
      : step.configure_next_env.length > 0
        ? step.configure_next_env
        : step.required_env;
  return uniqueEnvNames(fallback);
}

function uniqueEnvNames(names) {
  return [...new Set(names)].filter((name) => /^IRIS_[A-Z0-9_]+$/.test(name));
}

function sourceSpecificRoundtripScript(sourceMode) {
  if (sourceMode === "http_relay") return "npm run dev:youtube:relay-roundtrip";
  if (sourceMode === "youtube_api") {
    return "npm run dev:youtube:direct-live-chat-roundtrip";
  }
  return "npm run dev:youtube:source-status";
}

function assertYouTubeLaunchStepSafe(step, context, expectedOrder) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: invalid launch step`);
  }
  if (step.schema !== "iris_youtube_launch_step_v1") {
    throw new ContractError(`${context}: invalid launch step schema`);
  }
  if (step.sequence_order !== expectedOrder) {
    throw new ContractError(`${context}: invalid launch step order`);
  }
  if (!PROCESS_IDS.has(step.process_id)) {
    throw new ContractError(`${context}: invalid launch process`);
  }
  if (!PURPOSES.has(step.purpose)) {
    throw new ContractError(`${context}: invalid launch purpose`);
  }
  if (!SOURCE_MODES.has(step.source_mode)) {
    throw new ContractError(`${context}: invalid step source mode`);
  }
  if (!STEP_STATUSES.has(step.launch_readiness_status)) {
    throw new ContractError(`${context}: invalid launch readiness status`);
  }
  assertSafeReadinessState(step.readiness_state, context);
  if (
    step.readiness_state !==
    readinessStateForLaunchStatus(step.launch_readiness_status)
  ) {
    throw new ContractError(`${context}: invalid launch readiness state`);
  }
  assertSafeDevScript(step.launch_script, context);
  assertSafeDevScript(step.readiness_script, context);
  for (const field of [
    "required_env",
    "optional_env",
    "configure_next_env",
    "configured_required_env",
    "missing_required_env",
  ]) {
    assertEnvNameListSafe(step[field], `${context}: ${field}`);
  }
  if (!Array.isArray(step.required_env_any_of)) {
    throw new ContractError(`${context}: required env groups must be an array`);
  }
  for (const group of step.required_env_any_of) assertAnyOfEnvGroupSafe(group, context);
  if (!Array.isArray(step.missing_required_env_groups)) {
    throw new ContractError(`${context}: missing env groups must be an array`);
  }
  for (const group of step.missing_required_env_groups) {
    assertAnyOfEnvGroupSafe(group, context);
    if (group.satisfied_option_index !== null) {
      throw new ContractError(`${context}: satisfied group listed as missing`);
    }
  }
  const hasMissing =
    step.missing_required_env.length > 0 || step.missing_required_env_groups.length > 0;
  if (step.launch_readiness_status === "ready" && hasMissing) {
    throw new ContractError(`${context}: ready step has missing env`);
  }
  if (step.launch_readiness_status === "missing_required_env" && !hasMissing) {
    throw new ContractError(`${context}: missing-env step has no missing env`);
  }
  if (
    step.launch_readiness_status === "configuration_attention" &&
    step.local_target_policy_status !== "attention"
  ) {
    throw new ContractError(`${context}: configuration step needs policy attention`);
  }
  if (
    step.launch_readiness_status === "not_applicable" &&
    (step.required_env.length > 0 ||
      step.required_env_any_of.length > 0 ||
      step.missing_required_env.length > 0 ||
      step.missing_required_env_groups.length > 0)
  ) {
    throw new ContractError(`${context}: not-applicable step has env requirements`);
  }
  if (
    step.scheduler_expected_enabled !== undefined &&
    step.scheduler_expected_enabled !== true
  ) {
    throw new ContractError(`${context}: invalid scheduler policy`);
  }
  if (
    step.local_target_policy_status !== undefined &&
    !TARGET_POLICY_STATUSES.has(step.local_target_policy_status)
  ) {
    throw new ContractError(`${context}: invalid target policy status`);
  }
}

function assertAnyOfEnvGroupSafe(group, context) {
  if (!group || typeof group !== "object" || Array.isArray(group)) {
    throw new ContractError(`${context}: invalid env any-of group`);
  }
  if (group.schema !== "iris_youtube_launch_env_any_of_v1") {
    throw new ContractError(`${context}: invalid env any-of group schema`);
  }
  if (!ANY_OF_GROUP_IDS.has(group.group_id)) {
    throw new ContractError(`${context}: invalid env any-of group id`);
  }
  if (!Array.isArray(group.env_options) || group.env_options.length === 0) {
    throw new ContractError(`${context}: env any-of options are required`);
  }
  for (const option of group.env_options) assertEnvNameListSafe(option, context);
  if (group.satisfied_option_index !== null) {
    if (
      !Number.isInteger(group.satisfied_option_index) ||
      group.satisfied_option_index < 0 ||
      group.satisfied_option_index >= group.env_options.length
    ) {
      throw new ContractError(`${context}: invalid satisfied option index`);
    }
  }
  if (group.option_count !== group.env_options.length) {
    throw new ContractError(`${context}: invalid env option count`);
  }
}

function assertYouTubeStageSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: stage summary is required`);
  }
  if (summary.schema !== "iris_youtube_launch_stage_summary_v1") {
    throw new ContractError(`${context}: invalid stage summary schema`);
  }
  if (summary.stage_id !== "youtube_comments_and_support") {
    throw new ContractError(`${context}: invalid stage summary id`);
  }
  if (!["ready", "attention"].includes(summary.stage_status)) {
    throw new ContractError(`${context}: invalid stage status`);
  }
  assertSafeReadinessState(summary.readiness_state, context);
  if (summary.readiness_state !== readinessStateForStage(summary)) {
    throw new ContractError(`${context}: invalid stage readiness state`);
  }
  for (const field of [
    "integration_count",
    "ready_integration_count",
    "attention_integration_count",
    "missing_required_env_count",
    "verification_script_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    summary.ready_integration_count + summary.attention_integration_count !==
    summary.integration_count
  ) {
    throw new ContractError(`${context}: invalid stage integration count`);
  }
  if (summary.stage_status === "ready" && summary.attention_integration_count !== 0) {
    throw new ContractError(`${context}: ready stage summary has attention checks`);
  }
  if (summary.stage_status === "attention" && summary.attention_integration_count === 0) {
    throw new ContractError(`${context}: attention stage summary has no attention checks`);
  }
  if (summary.first_verification_script !== null) {
    assertSafeDevScript(summary.first_verification_script, context);
  }
}

function assertYouTubeIntegrationReadinessListSafe(readiness, context) {
  if (!Array.isArray(readiness) || readiness.length === 0) {
    throw new ContractError(`${context}: integration readiness is required`);
  }
  const seen = new Set();
  for (const item of readiness) {
    assertYouTubeIntegrationReadinessSafe(item, context);
    seen.add(item.integration);
  }
  for (const integration of INGEST_INTEGRATIONS) {
    if (!seen.has(integration)) {
      throw new ContractError(`${context}: missing ingest integration`);
    }
  }
}

function assertYouTubeIntegrationReadinessSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: invalid integration readiness`);
  }
  if (item.schema !== "iris_youtube_launch_integration_readiness_v1") {
    throw new ContractError(`${context}: invalid integration readiness schema`);
  }
  if (!INGEST_INTEGRATIONS.has(item.integration)) {
    throw new ContractError(`${context}: invalid integration`);
  }
  if (!["ready", "attention"].includes(item.status)) {
    throw new ContractError(`${context}: invalid integration status`);
  }
  assertSafeReadinessState(item.readiness_state, context);
  if (item.readiness_state !== readinessStateForIntegration(item)) {
    throw new ContractError(`${context}: invalid integration readiness state`);
  }
  if (typeof item.mode !== "string" || !/^[a-z0-9_]+$/.test(item.mode)) {
    throw new ContractError(`${context}: invalid integration mode`);
  }
}

function assertVerificationSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: verification summary is required`);
  }
  if (summary.schema !== "iris_youtube_launch_verification_summary_v1") {
    throw new ContractError(`${context}: invalid verification summary schema`);
  }
  if (summary.stage_id !== "youtube_comments_and_support") {
    throw new ContractError(`${context}: invalid verification stage`);
  }
  if (!["ready", "attention"].includes(summary.stage_status)) {
    throw new ContractError(`${context}: invalid verification stage status`);
  }
  if (summary.first_verification_script !== null) {
    assertSafeDevScript(summary.first_verification_script, context);
  }
  if (
    !Number.isInteger(summary.verification_script_count) ||
    summary.verification_script_count < 0
  ) {
    throw new ContractError(`${context}: invalid verification script count`);
  }
  assertSafeDevScript(summary.configured_ingest_script, context);
  assertSafeDevScript(summary.local_fixture_script, context);
  assertSafeDevScript(summary.source_status_script, context);
  assertSafeDevScript(summary.runtime_status_script, context);
  assertSafeDevScript(summary.live_readiness_script, context);
  assertSafeDevScript(summary.runtime_ingest_roundtrip_script, context);
  assertSafeDevScript(summary.policy_gate_roundtrip_script, context);
  assertSafeDevScript(summary.cursor_roundtrip_script, context);
  assertSafeDevScript(summary.cursor_backup_roundtrip_script, context);
}

function assertRuntimePollVerificationSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: runtime poll verification summary is required`);
  }
  if (summary.schema !== "iris_youtube_launch_runtime_poll_verification_v1") {
    throw new ContractError(`${context}: invalid runtime poll verification schema`);
  }
  if (summary.stage_id !== "youtube_comments_and_support") {
    throw new ContractError(`${context}: invalid runtime poll verification stage`);
  }
  if (!SOURCE_MODES.has(summary.source_mode)) {
    throw new ContractError(`${context}: invalid runtime poll source mode`);
  }
  for (const field of RUNTIME_POLL_VERIFICATION_SCRIPT_FIELDS) {
    assertSafeDevScript(summary[field], context);
  }
  if (summary.script_count !== RUNTIME_POLL_VERIFICATION_SCRIPT_FIELDS.length) {
    throw new ContractError(`${context}: invalid runtime poll script count`);
  }
  if (
    summary.source_specific_roundtrip_script !==
    sourceSpecificRoundtripScript(summary.source_mode)
  ) {
    throw new ContractError(`${context}: invalid source-specific roundtrip script`);
  }
  if (summary.runtime_configured_status_expected !== "configured_waiting_for_scheduler_start") {
    throw new ContractError(`${context}: invalid configured runtime expectation`);
  }
  if (summary.runtime_polling_status_expected !== "polling_active") {
    throw new ContractError(`${context}: invalid polling runtime expectation`);
  }
  if (summary.live_readiness_status_expected !== "ready_for_youtube_live_ingest") {
    throw new ContractError(`${context}: invalid live readiness expectation`);
  }
  if (
    !Array.isArray(summary.poll_flow_active_statuses) ||
    summary.poll_flow_active_statuses.length !== POLL_FLOW_ACTIVE_STATUSES.length
  ) {
    throw new ContractError(`${context}: invalid poll flow active status list`);
  }
  summary.poll_flow_active_statuses.forEach((status, index) => {
    if (status !== POLL_FLOW_ACTIVE_STATUSES[index]) {
      throw new ContractError(`${context}: unexpected poll flow active status`);
    }
  });
  for (const field of [
    "comments_enter_runtime_pipeline_required",
    "support_events_ready_for_donation_pipeline_required",
    "relationship_and_memory_candidates_validation_gated",
    "scheduler_runtime_counts_only_required",
    "cursor_resume_required_for_direct_api",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  assertRuntimePollBoundaryPolicySafe(summary.boundary_policy, context);
}

function assertRuntimePollBoundaryPolicySafe(policy, context) {
  assertBoundaryPolicy(policy, [
    "safe_local_scripts_only",
    "env_names_only",
    "script_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_platform_cursor_values",
    "no_live_payloads",
    "no_support_message_text",
    "no_candidates",
    "no_commands",
    "read_only_plan",
  ], `${context}: runtime poll boundary policy`);
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

function readinessStateForLaunchStatus(status) {
  if (status === "ready" || status === "not_applicable") return "ready";
  if (status === "missing_required_env") return "configuration_waiting";
  if (status === "configuration_attention") return "operator_review_required";
  return "operator_review_required";
}

function readinessStateForStage(stage) {
  return (stage.stage_status ?? stage.status) === "ready"
    ? "ready"
    : "operator_review_required";
}

function readinessStateForIntegration(integration) {
  return integration.status === "ready" ? "ready" : "operator_review_required";
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
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness state count`);
    }
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

function assertSupportEventPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: support event policy is required`);
  }
  for (const field of [
    "comment_events_remain_comment_events",
    "normalized_as_donation_event",
    "support_events_not_normalized_as_comments",
    "relationship_and_memory_candidates_validation_gated",
    "support_messages_not_exposed_in_status",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: invalid support event policy`);
    }
  }
}

function assertSafeDevScript(script, context) {
  if (
    typeof script !== "string" ||
    !(
      /^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
        script
      ) || script === "npm test"
    )
  ) {
    throw new ContractError(`${context}: unsafe dev script`);
  }
}

function assertEnvNameListSafe(names, context) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of names) {
    if (typeof name !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
}

function assertNoForbiddenYouTubeLaunchPlanFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenYouTubeLaunchPlanFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_YOUTUBE_LAUNCH_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe launch plan field`, { field, path });
    }
    assertNoForbiddenYouTubeLaunchPlanFields(child, context, `${path}.${field}`);
  }
}
