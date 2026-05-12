import { ContractError } from "../../core/contracts.js";
import {
  assertOperatorPolicyAsyncSaveGateRoundtripCliReportSafe,
  createOperatorPolicyAsyncSaveGateRoundtripCliReport,
} from "./operatorPolicyAsyncSaveGateRoundtrip.js";
import {
  assertPostgresAdminSavePreflightReportSafe,
  createPostgresAdminSavePreflightReport,
} from "./postgresAdminSavePreflight.js";
import {
  assertAdminReviewQueueReportSafe,
  createAdminReviewQueueReport,
} from "./adminReviewQueue.js";
import {
  assertProductionConfigDoctorSafe,
  createProductionConfigDoctor,
} from "./productionConfigDoctor.js";
import {
  assertProductionLiveReadinessReportSafe,
  createProductionLiveReadinessReport,
} from "./productionLiveReadiness.js";
import {
  assertProductionReadinessRunbookSafe,
  createProductionReadinessRunbook,
} from "./productionReadinessRunbook.js";
import {
  assertProductionRuntimeHandoffStatusReportSafe,
  createProductionRuntimeHandoffStatusReport,
} from "./productionRuntimeHandoffStatus.js";
import { createPublicReportBoundaryAuditReport } from "./publicReportBoundaryAudit.js";
import { ANIME_PERFORMANCE_IDENTITY_SURFACE_ENV_GROUPS } from "./adminCharacterVoiceSettings.js";

const URL_PATTERN = /https?:\/\/|postgres:\/\/|postgresql:\/\//i;
const UNSAFE_ADMIN_OPERATIONS_SUMMARY_REPORT_FRAGMENTS = [
  '"event_id"',
  '"trace_id"',
  '"subtitle_text"',
  '"input_action_candidate"',
  '"approved_game_input_action"',
];
const SUMMARY_STATUSES = new Set([
  "configuration_waiting",
  "mock_verification_ready",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
  "ready",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const MODULE_IDS = new Set([
  "tts_live2d_obs_foundation",
  "youtube_comments_and_support",
  "memory_and_relationship_persistence",
  "vision_and_safe_game_control",
  "admin_operator_policy",
  "admin_review_queue",
  "anime_performance_matching",
  "growth_business_operations",
]);
const ADMIN_OPERATIONS_SUMMARY_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "summary_status",
  "next_module_id",
  "next_admin_status",
  "next_operator_action_id",
  "next_attention_area_id",
  "next_attention_area_missing_setting_count",
  "next_safe_script",
  "module_count",
  "ready_module_count",
  "attention_module_count",
  "admin_status_counts",
  "modules",
  "verification_surfaces",
  "low_output_restart_summary",
  "boundary_policy",
  "adapter_validation_required",
]);
const ADMIN_OPERATIONS_SUMMARY_BOUNDARY_FIELDS = [
  "read_only_admin_summary",
  "report_summaries_only",
  "script_names_and_route_paths_only",
  "env_names_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_connection_values",
  "no_policy_payloads",
  "no_policy_numeric_values",
  "no_live_payloads",
  "no_viewer_messages",
  "no_support_message_text",
  "no_memory_records",
  "no_relationship_records",
  "no_hidden_relationship_scores",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
  "no_real_process_started",
  "no_database_connection_attempted",
  "no_game_or_os_input",
];
const ADMIN_OPERATIONS_MODULE_BOUNDARY_FIELDS = [
  "counts_statuses_and_script_names_only",
  "env_names_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
];
const SAFE_SCRIPT_PATTERN =
  /^(npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?|npm test)$/i;
const SAFE_RESTART_SCRIPT_PATTERN =
  /^(npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?|npm run preflight)$/i;
const LOW_OUTPUT_RESTART_SUMMARY_FIELDS = new Set([
  "entry_check_script",
  "first_check_script",
  "focus_check_script",
  "secondary_check_script",
  "full_preflight_script",
  "public_boundary_check_script",
  "required_lightweight_script_count",
  "missing_required_lightweight_script_count",
]);
export async function createAdminOperationsSummary({
  env = process.env,
  runtime = null,
  streamState = null,
  httpIngestScheduler = null,
  overlayEventBus = null,
  generatedAtMs = Date.now(),
} = {}) {
  const configDoctor = createProductionConfigDoctor({ env, generatedAtMs });
  const runbook = createProductionReadinessRunbook({ env, generatedAtMs });
  const runtimeHandoff = createProductionRuntimeHandoffStatusReport({
    env,
    runtime,
    streamState,
    generatedAtMs,
  });
  const liveReadiness = await createProductionLiveReadinessReport({
    env,
    runtime,
    streamState,
    httpIngestScheduler,
    overlayEventBus,
    generatedAtMs,
  });
  const postgresAdminSavePreflight = createPostgresAdminSavePreflightReport({
    env,
    generatedAtMs,
  });
  const operatorPolicyAsyncRoundtrip =
    await createOperatorPolicyAsyncSaveGateRoundtripCliReport({ generatedAtMs });
  const reviewQueue = createAdminReviewQueueReport({
    reviewItems: runtime?.candidateReviewItems?.(50) ?? [],
    generatedAtMs,
  });

  assertProductionConfigDoctorSafe(configDoctor, "admin operations config doctor");
  assertProductionReadinessRunbookSafe(runbook, "admin operations runbook");
  assertProductionRuntimeHandoffStatusReportSafe(
    runtimeHandoff,
    "admin operations runtime handoff"
  );
  assertProductionLiveReadinessReportSafe(
    liveReadiness,
    "admin operations live readiness"
  );
  assertPostgresAdminSavePreflightReportSafe(
    postgresAdminSavePreflight,
    "admin operations postgres preflight"
  );
  assertOperatorPolicyAsyncSaveGateRoundtripCliReportSafe(
    operatorPolicyAsyncRoundtrip
  );
  assertAdminReviewQueueReportSafe(reviewQueue, "admin operations review queue");

  const stageSummaries = runbook.stages.map((stage) =>
    summarizeStage(stage, liveReadiness)
  );
  const adminPolicySummary = summarizeAdminPolicy({
    postgresAdminSavePreflight,
    operatorPolicyAsyncRoundtrip,
  });
  const reviewQueueSummary = summarizeAdminReviewQueue({ reviewQueue });
  const animePerformanceSummary = summarizeAnimePerformanceMatching({ env });
  const growthBusinessSummary = summarizeGrowthBusinessOperations({ env });
  const allSummaries = [
    ...stageSummaries,
    adminPolicySummary,
    reviewQueueSummary,
    animePerformanceSummary,
    growthBusinessSummary,
  ];
  const statusCounts = countStatuses(allSummaries.map((item) => item.admin_status));
  const nextItem =
    allSummaries.find((item) => item.admin_status !== "ready") ?? null;
  const report = {
    schema: "iris_admin_operations_summary_v1",
    generated_at_ms: generatedAtMs,
    summary_status: nextItem ? "attention_required" : "ready",
    next_module_id: nextItem?.module_id ?? null,
    next_admin_status: nextItem?.admin_status ?? null,
    next_operator_action_id: nextItem?.next_operator_action_id ?? null,
    next_attention_area_id: nextItem?.next_attention_area_id ?? null,
    next_attention_area_missing_setting_count:
      nextItem?.next_attention_area_missing_setting_count ?? 0,
    next_safe_script: nextItem?.next_safe_script ?? null,
    module_count: allSummaries.length,
    ready_module_count: allSummaries.filter((item) => item.admin_status === "ready")
      .length,
    attention_module_count: allSummaries.filter(
      (item) => item.admin_status !== "ready"
    ).length,
    admin_status_counts: statusCounts,
    modules: allSummaries,
    verification_surfaces: {
      schema: "iris_admin_operations_verification_surfaces_v1",
      admin_operations_summary_script: "npm run dev:admin:operations-summary",
      public_report_boundary_audit_script:
        "npm run dev:public-report-boundary-audit",
      config_doctor_script: "npm run dev:config:doctor",
      readiness_runbook_script: "npm run dev:production:runbook",
      live_readiness_script: "npm run dev:production:live-readiness",
      production_attention_digest_script:
        "npm run dev:production:attention-digest",
      runtime_handoff_status_script:
        "npm run dev:production:runtime-handoff-status",
      production_loop_verification_script:
        "npm run dev:production-loop:roundtrip",
      foundation_runtime_summary_script: "npm run dev:foundation:runtime-summary",
      foundation_blocked_worker_roundtrip_script:
        "npm run dev:foundation:blocked-worker-roundtrip",
      postgres_admin_save_preflight_script:
        "npm run dev:persistence:postgres-admin-save-preflight",
      postgres_operator_policy_write_plan_script:
        "npm run dev:persistence:postgres-operator-policy-write-plan",
      operator_policy_async_save_gate_roundtrip_script:
        "npm run dev:operator-policy:async-save-gate-roundtrip",
      operator_policy_admin_apply_plan_script:
        "npm run dev:operator-policy:admin-apply-plan",
      operator_policy_audit_roundtrip_script:
        "npm run dev:operator-policy:audit-roundtrip",
      operator_policy_save_gate_roundtrip_script:
        "npm run dev:operator-policy:save-gate-roundtrip",
      operator_policy_store_roundtrip_script:
        "npm run dev:operator-policy:store-roundtrip",
      admin_dashboard_script: "npm run dev:admin:dashboard",
      admin_integration_checklist_script: "npm run dev:admin:integration-checklist",
      admin_character_voice_settings_script:
        "npm run dev:admin:character-voice-settings",
      admin_character_voice_settings_summary_script:
        "npm run dev:admin:character-voice-settings:summary",
      admin_safety_controls_script: "npm run dev:admin:safety-controls",
      admin_review_queue_script: "npm run dev:admin:review-queue",
      admin_review_decision_gate_script: "npm run dev:admin:review-decision-gate",
      admin_review_auth_gate_script: "npm run dev:admin:review-auth-gate",
      admin_review_validator_run_plan_script:
        "npm run dev:admin:review-validator-run-plan",
      debug_routes: [
        "/admin/operations-summary",
        "/admin/public-report-boundary-audit",
        "/admin/character-voice-settings/summary",
        "/admin/review-queue",
        "/admin/review-queue/auth-gate",
        "/admin/review-queue/validator-run-plan",
        "/production/config-doctor",
        "/production/readiness-runbook",
        "/production/live-readiness",
        "/production/runtime-handoff-status",
        "/production/foundation-runtime-summary",
        "/production/postgres-admin-save-preflight",
        "/production/operator-policy-async-save-gate-roundtrip",
      ],
    },
    low_output_restart_summary: createLowOutputRestartSummary({
      runtimeHandoff,
      liveReadiness,
    }),
    boundary_policy: {
      read_only_admin_summary: true,
      report_summaries_only: true,
      script_names_and_route_paths_only: true,
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_connection_values: true,
      no_policy_payloads: true,
      no_policy_numeric_values: true,
      no_live_payloads: true,
      no_viewer_messages: true,
      no_support_message_text: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_hidden_relationship_scores: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_real_process_started: true,
      no_database_connection_attempted: true,
      no_game_or_os_input: true,
    },
    adapter_validation_required: true,
  };
  assertAdminOperationsSummarySafe(report);
  return report;
}

export function assertAdminOperationsSummarySafe(
  report,
  context = "admin operations summary"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  if (URL_PATTERN.test(JSON.stringify(report))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  assertNoUnsafeReportLeak(report, context);
  if (report.schema !== "iris_admin_operations_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!ADMIN_OPERATIONS_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field ${field}`);
    }
  }
  if (!Number.isInteger(report.generated_at_ms) || report.generated_at_ms < 0) {
    throw new ContractError(`${context}: invalid generated timestamp`);
  }
  if (!["attention_required", "ready"].includes(report.summary_status)) {
    throw new ContractError(`${context}: invalid summary status`);
  }
  for (const field of [
    "module_count",
    "ready_module_count",
    "attention_module_count",
    "next_attention_area_missing_setting_count",
  ]) {
    assertNonNegativeInteger(report[field], `${context}: invalid ${field}`);
  }
  if (!Array.isArray(report.modules) || report.modules.length !== MODULE_IDS.size) {
    throw new ContractError(`${context}: modules required`);
  }
  report.modules.forEach((module) => assertModuleSummarySafe(module, context));
  if (new Set(report.modules.map((module) => module.module_id)).size !== MODULE_IDS.size) {
    throw new ContractError(`${context}: duplicate module id`);
  }
  const statusCounts = countStatuses(report.modules.map((item) => item.admin_status));
  if (JSON.stringify(statusCounts) !== JSON.stringify(report.admin_status_counts)) {
    throw new ContractError(`${context}: status counts mismatch`);
  }
  const firstAttention =
    report.modules.find((module) => module.admin_status !== "ready") ?? null;
  if (
    report.next_module_id !== (firstAttention?.module_id ?? null) ||
    report.next_admin_status !== (firstAttention?.admin_status ?? null) ||
    report.next_operator_action_id !==
      (firstAttention?.next_operator_action_id ?? null) ||
    report.next_attention_area_id !==
      (firstAttention?.next_attention_area_id ?? null) ||
    report.next_attention_area_missing_setting_count !==
      (firstAttention?.next_attention_area_missing_setting_count ?? 0) ||
    report.next_safe_script !== (firstAttention?.next_safe_script ?? null)
  ) {
    throw new ContractError(`${context}: next item mismatch`);
  }
  if (
    report.next_attention_area_id !== null &&
    (typeof report.next_attention_area_id !== "string" ||
      !/^[a-z0-9_]+$/.test(report.next_attention_area_id))
  ) {
    throw new ContractError(`${context}: invalid next attention area`);
  }
  if (
    report.ready_module_count !==
      report.modules.filter((module) => module.admin_status === "ready").length ||
    report.attention_module_count !==
      report.modules.filter((module) => module.admin_status !== "ready").length ||
    report.module_count !== report.modules.length
  ) {
    throw new ContractError(`${context}: module counts mismatch`);
  }
  assertVerificationSurfacesSafe(report.verification_surfaces, context);
  assertLowOutputRestartSummarySafe(report.low_output_restart_summary, context);
  assertBoundaryPolicy(
    report.boundary_policy,
    ADMIN_OPERATIONS_SUMMARY_BOUNDARY_FIELDS,
    `${context} boundary policy`
  );
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function assertNoUnsafeReportLeak(report, context) {
  const serialized = JSON.stringify(report);
  const leaked = UNSAFE_ADMIN_OPERATIONS_SUMMARY_REPORT_FRAGMENTS.filter((fragment) =>
    serialized.includes(fragment)
  );
  if (leaked.length > 0) {
    throw new ContractError(`${context}: unsafe fragment(s) exposed: ${leaked.join(", ")}`);
  }
}

function createLowOutputRestartSummary({ runtimeHandoff, liveReadiness }) {
  const publicBoundaryAudit = createPublicReportBoundaryAuditReport();
  const focusCheckScript =
    runtimeHandoff.handoff_status !== "ready_for_runtime_handoff"
      ? runtimeHandoff.next_component_id === "foundation_runtime"
        ? "npm run dev:foundation:runtime-summary"
        : runtimeHandoff.next_check_script
      : liveReadiness.next_check_script;
  return {
    entry_check_script: "npm run dev:admin:operations-summary",
    first_check_script: "npm run dev:production:attention-digest",
    focus_check_script: focusCheckScript,
    secondary_check_script: liveReadiness.next_check_script,
    full_preflight_script: "npm run preflight",
    public_boundary_check_script: "npm run dev:public-report-boundary-audit",
    required_lightweight_script_count:
      publicBoundaryAudit.required_lightweight_script_count,
    missing_required_lightweight_script_count:
      publicBoundaryAudit.missing_required_lightweight_script_count,
  };
}

function summarizeStage(stage, liveReadiness) {
  const liveStage = liveReadiness.priority_stages.find(
    (item) => item.stage_id === stage.stage_id
  );
  const adminStatus = mapReadinessToAdminStatus(stage.readiness_state);
  const safeScriptCatalog = buildSafeScriptCatalog({
    scripts: stage.verification_scripts,
    preferredScripts: [
      liveStage?.first_attention_check_script,
      liveStage?.runtime_status_script,
      liveStage?.live_readiness_script,
      liveStage?.startup_checklist_script,
      ...preferredScriptsForStage(stage.stage_id),
    ],
  });
  return {
    schema: "iris_admin_operations_module_summary_v1",
    module_id: stage.stage_id,
    admin_status: adminStatus,
    readiness_state: stage.readiness_state,
    configured_check_count: stage.integrations.length,
    ready_check_count: stage.integrations.filter((item) => item.status === "ready")
      .length,
    attention_check_count: stage.integrations.filter(
      (item) => item.status !== "ready"
    ).length,
    missing_required_env_count: stage.missing_required_env.length,
    verification_script_count: stage.verification_scripts.length,
    safe_script_catalog: safeScriptCatalog,
    safe_script_catalog_count: safeScriptCatalog.length,
    first_safe_script:
      stage.verification_scripts.find((script) => SAFE_SCRIPT_PATTERN.test(script)) ??
      null,
    next_safe_script:
      liveStage?.first_attention_check_script ??
      stage.verification_scripts[0] ??
      null,
    next_operator_action_id:
      adminStatus === "ready"
        ? null
        : stage.missing_required_env.length > 0
          ? "configure_missing_env_names"
          : "run_next_safe_verification",
    operator_note_id: operatorNoteForStage(stage.stage_id, adminStatus),
    boundary_policy: {
      counts_statuses_and_script_names_only: true,
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function summarizeAdminPolicy({
  postgresAdminSavePreflight,
  operatorPolicyAsyncRoundtrip,
}) {
  const preflight = postgresAdminSavePreflight.admin_async_save_gate_preflight;
  const readyForRoundtrip =
    preflight.admin_save_preflight_status === "ready_for_mock_postgres_save_gate";
  const roundtripReady =
    operatorPolicyAsyncRoundtrip.roundtrip_positioning
      .preflight_guidance_compatible === true &&
    operatorPolicyAsyncRoundtrip.roundtrip_positioning
      .real_database_connection_attempted === false;
  const adminStatus =
    readyForRoundtrip && roundtripReady
      ? "mock_verification_ready"
      : "configuration_waiting";
  return {
    schema: "iris_admin_operations_module_summary_v1",
    module_id: "admin_operator_policy",
    admin_status: adminStatus,
    readiness_state:
      adminStatus === "mock_verification_ready" ? "ready" : "configuration_waiting",
    configured_check_count: 2,
    ready_check_count: [readyForRoundtrip, roundtripReady].filter(Boolean).length,
    attention_check_count: [readyForRoundtrip, roundtripReady].filter(
      (item) => item !== true
    ).length,
    missing_required_env_count: preflight.missing_required_env_names.length,
    verification_script_count: 9,
    safe_script_catalog: [
      "npm run dev:persistence:postgres-admin-save-preflight",
      "npm run dev:persistence:postgres-operator-policy-write-plan",
      "npm run dev:operator-policy:async-save-gate-roundtrip",
      "npm run dev:operator-policy:admin-apply-plan",
      "npm run dev:operator-policy:audit-roundtrip",
      "npm run dev:operator-policy:save-gate-roundtrip",
      "npm run dev:operator-policy:store-roundtrip",
      "npm run dev:config:doctor",
      "npm run dev:production:runtime-handoff-status",
    ],
    safe_script_catalog_count: 9,
    first_safe_script: "npm run dev:persistence:postgres-admin-save-preflight",
    next_safe_script:
      preflight.operator_guidance_summary.next_safe_verification_script ??
      "npm run dev:persistence:postgres-admin-save-preflight",
    next_operator_action_id:
      adminStatus === "mock_verification_ready"
        ? "review_before_real_postgres_enablement"
        : "configure_postgres_admin_save_preflight",
    operator_note_id: "admin_policy_mock_roundtrip_ready_before_real_db",
    boundary_policy: {
      counts_statuses_and_script_names_only: true,
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function summarizeAdminReviewQueue({ reviewQueue }) {
  const hasActionableItems = reviewQueue.actionable_item_count > 0;
  return {
    schema: "iris_admin_operations_module_summary_v1",
    module_id: "admin_review_queue",
    admin_status: hasActionableItems ? "operator_review_required" : "ready",
    readiness_state: hasActionableItems ? "operator_review_required" : "ready",
    configured_check_count: 2,
    ready_check_count: hasActionableItems ? 1 : 2,
    attention_check_count: hasActionableItems ? 1 : 0,
    missing_required_env_count: 0,
    verification_script_count: 8,
    safe_script_catalog: [
      "npm run dev:admin:dashboard",
      "npm run dev:admin:integration-checklist",
      "npm run dev:admin:character-voice-settings",
      "npm run dev:admin:safety-controls",
      "npm run dev:admin:review-queue",
      "npm run dev:admin:review-decision-gate",
      "npm run dev:admin:review-auth-gate",
      "npm run dev:admin:review-validator-run-plan",
    ],
    safe_script_catalog_count: 8,
    first_safe_script: "npm run dev:admin:review-queue",
    next_safe_script: hasActionableItems
      ? "npm run dev:admin:review-decision-gate"
      : "npm run dev:admin:review-queue",
    next_operator_action_id: hasActionableItems
      ? "review_memory_relationship_queue"
      : null,
    operator_note_id: hasActionableItems
      ? "review_queue_has_operator_items"
      : "review_queue_clear",
    boundary_policy: {
      counts_statuses_and_script_names_only: true,
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function summarizeAnimePerformanceMatching({ env }) {
  const readinessChecks = ANIME_PERFORMANCE_IDENTITY_SURFACE_ENV_GROUPS.map(
    ([areaId, envNames]) => [
      areaId,
      envNames.every((name) => hasConfiguredEnv(env, name)),
    ]
  );
  const readyByAreaId = Object.fromEntries(readinessChecks);
  const referenceReady = readyByAreaId.anime_reference_profile;
  const expressionMotionReady = readyByAreaId.expression_motion_match;
  const voiceSpeechReady = readyByAreaId.voice_speech_match;
  const ipGovernanceReady = readyByAreaId.ip_governance;
  const voiceLicenseUseCategoryReady =
    readyByAreaId.voice_license_use_categories;
  const readyChecks = readinessChecks.filter(([, ready]) => ready).length;
  const animeIdentitySurfaceCount = readinessChecks.length;
  const adminStatus =
    readyChecks === animeIdentitySurfaceCount ? "ready" : "configuration_waiting";
  const nextAttentionAreaId =
    readinessChecks.find(([, ready]) => !ready)?.[0] ?? null;
  const nextAttentionAreaMissingSettingCount = missingCountForAreaId(
    env,
    ANIME_PERFORMANCE_IDENTITY_SURFACE_ENV_GROUPS,
    nextAttentionAreaId
  );
  return {
    schema: "iris_admin_operations_module_summary_v1",
    module_id: "anime_performance_matching",
    admin_status: adminStatus,
    readiness_state: adminStatus === "ready" ? "ready" : "configuration_waiting",
    configured_check_count: readinessChecks.length,
    ready_check_count: readyChecks,
    attention_check_count: readinessChecks.length - readyChecks,
    missing_required_env_count: readinessChecks.length - readyChecks,
    anime_identity_surface_count: animeIdentitySurfaceCount,
    anime_identity_ready_surface_count: readyChecks,
    anime_identity_missing_surface_count: animeIdentitySurfaceCount - readyChecks,
    reference_ready_count: referenceReady ? 1 : 0,
    reference_attention_count: referenceReady ? 0 : 1,
    expression_motion_ready_count: expressionMotionReady ? 1 : 0,
    expression_motion_attention_count: expressionMotionReady ? 0 : 1,
    voice_speech_ready_count: voiceSpeechReady ? 1 : 0,
    voice_speech_attention_count: voiceSpeechReady ? 0 : 1,
    ip_governance_ready_count: ipGovernanceReady ? 1 : 0,
    ip_governance_attention_count: ipGovernanceReady ? 0 : 1,
    voice_license_use_category_ready_count: voiceLicenseUseCategoryReady ? 1 : 0,
    voice_license_use_category_attention_count:
      voiceLicenseUseCategoryReady ? 0 : 1,
    verification_script_count: 3,
    safe_script_catalog: [
      "npm run dev:admin:dashboard",
      "npm run dev:admin:character-voice-settings:summary",
      "npm run dev:admin:character-voice-settings",
    ],
    safe_script_catalog_count: 3,
    first_safe_script: "npm run dev:admin:character-voice-settings:summary",
    next_safe_script: "npm run dev:admin:character-voice-settings:summary",
    next_operator_action_id:
      adminStatus === "ready" ? null : "configure_anime_performance_matching",
    next_attention_area_id: nextAttentionAreaId,
    next_attention_area_missing_setting_count:
      nextAttentionAreaMissingSettingCount,
    operator_note_id:
      adminStatus === "ready"
        ? "anime_performance_matching_ready"
        : "anime_performance_matching_requires_reference_profiles",
    boundary_policy: {
      counts_statuses_and_script_names_only: true,
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function summarizeGrowthBusinessOperations({ env }) {
  const fanCommunityReady = [
    "IRIS_FAN_GROWTH_LIFECYCLE_POLICY_ID",
    "IRIS_COMMUNITY_RITUAL_REVIEW_POLICY_ID",
  ].every((name) => hasConfiguredEnv(env, name));
  const trustContentReady = [
    "IRIS_AI_TRANSPARENCY_DISCLOSURE_POLICY_ID",
    "IRIS_CONTENT_STRATEGY_APPROVAL_POLICY_ID",
  ].every((name) => hasConfiguredEnv(env, name));
  const monetizationCostReady = [
    "IRIS_MONETIZATION_SAFETY_POLICY_ID",
    "IRIS_COST_GOVERNANCE_BUDGET_POLICY_ID",
  ].every((name) => hasConfiguredEnv(env, name));
  const operatorAnalyticsReady = [
    "IRIS_OPERATOR_COMFORT_CHECKLIST_ID",
    "IRIS_PUBLIC_ANALYTICS_EXPORT_POLICY_ID",
  ].every((name) => hasConfiguredEnv(env, name));
  const readinessEnvGroups = [
    ["fan_community", [
      "IRIS_FAN_GROWTH_LIFECYCLE_POLICY_ID",
      "IRIS_COMMUNITY_RITUAL_REVIEW_POLICY_ID",
    ]],
    ["trust_content", [
      "IRIS_AI_TRANSPARENCY_DISCLOSURE_POLICY_ID",
      "IRIS_CONTENT_STRATEGY_APPROVAL_POLICY_ID",
    ]],
    ["monetization_cost", [
      "IRIS_MONETIZATION_SAFETY_POLICY_ID",
      "IRIS_COST_GOVERNANCE_BUDGET_POLICY_ID",
    ]],
    ["operator_analytics", [
      "IRIS_OPERATOR_COMFORT_CHECKLIST_ID",
      "IRIS_PUBLIC_ANALYTICS_EXPORT_POLICY_ID",
    ]],
  ];
  const readinessChecks = [
    ["fan_community", fanCommunityReady],
    ["trust_content", trustContentReady],
    ["monetization_cost", monetizationCostReady],
    ["operator_analytics", operatorAnalyticsReady],
  ];
  const readyChecks = readinessChecks.filter(([, ready]) => ready).length;
  const adminStatus =
    readyChecks === readinessChecks.length ? "ready" : "configuration_waiting";
  const nextAttentionAreaId =
    readinessChecks.find(([, ready]) => !ready)?.[0] ?? null;
  const nextAttentionAreaMissingSettingCount = missingCountForAreaId(
    env,
    readinessEnvGroups,
    nextAttentionAreaId
  );
  return {
    schema: "iris_admin_operations_module_summary_v1",
    module_id: "growth_business_operations",
    admin_status: adminStatus,
    readiness_state: adminStatus === "ready" ? "ready" : "configuration_waiting",
    configured_check_count: readinessChecks.length,
    ready_check_count: readyChecks,
    attention_check_count: readinessChecks.length - readyChecks,
    missing_required_env_count: readinessChecks.length - readyChecks,
    fan_community_ready_count: fanCommunityReady ? 1 : 0,
    fan_community_attention_count: fanCommunityReady ? 0 : 1,
    trust_content_ready_count: trustContentReady ? 1 : 0,
    trust_content_attention_count: trustContentReady ? 0 : 1,
    monetization_cost_ready_count: monetizationCostReady ? 1 : 0,
    monetization_cost_attention_count: monetizationCostReady ? 0 : 1,
    operator_analytics_ready_count: operatorAnalyticsReady ? 1 : 0,
    operator_analytics_attention_count: operatorAnalyticsReady ? 0 : 1,
    verification_script_count: 3,
    safe_script_catalog: [
      "npm run dev:admin:dashboard",
      "npm run dev:admin:character-voice-settings:summary",
      "npm run dev:admin:character-voice-settings",
    ],
    safe_script_catalog_count: 3,
    first_safe_script: "npm run dev:admin:character-voice-settings:summary",
    next_safe_script: "npm run dev:admin:character-voice-settings:summary",
    next_operator_action_id:
      adminStatus === "ready" ? null : "configure_growth_business_operations",
    next_attention_area_id: nextAttentionAreaId,
    next_attention_area_missing_setting_count:
      nextAttentionAreaMissingSettingCount,
    operator_note_id:
      adminStatus === "ready"
        ? "growth_business_operations_ready"
        : "growth_business_operations_requires_policy_settings",
    boundary_policy: {
      counts_statuses_and_script_names_only: true,
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function buildSafeScriptCatalog({ scripts, preferredScripts = [] }) {
  const selected = [];
  for (const script of [...preferredScripts, ...scripts]) {
    if (
      typeof script !== "string" ||
      !SAFE_SCRIPT_PATTERN.test(script) ||
      selected.includes(script)
    ) {
      continue;
    }
    selected.push(script);
    if (selected.length >= 12) break;
  }
  return selected;
}

function hasConfiguredEnv(env, name) {
  return String(env?.[name] ?? "").trim().length > 0;
}

function preferredScriptsForStage(stageId) {
  if (stageId === "memory_and_relationship_persistence") {
    return [
      "npm run dev:memory-vector:bridge",
      "npm run dev:memory-vector:roundtrip",
    ];
  }
  if (stageId === "youtube_comments_and_support") {
    return [
      "npm run dev:youtube:direct-live-chat-roundtrip",
      "npm run dev:youtube:http-ingest-roundtrip",
      "npm run dev:youtube:cursor-roundtrip",
      "npm run dev:youtube:cursor-backup-roundtrip",
    ];
  }
  return [];
}

function missingCountForAreaId(env, groupedEnvNames, areaId) {
  if (areaId === null) return 0;
  const envNames = groupedEnvNames.find(([id]) => id === areaId)?.[1] ?? [];
  return envNames.filter((name) => !hasConfiguredEnv(env, name)).length;
}

function assertModuleSummarySafe(module, context) {
  if (!module || typeof module !== "object" || Array.isArray(module)) {
    throw new ContractError(`${context}: module summary required`);
  }
  if (module.schema !== "iris_admin_operations_module_summary_v1") {
    throw new ContractError(`${context}: invalid module schema`);
  }
  if (!MODULE_IDS.has(module.module_id)) {
    throw new ContractError(`${context}: invalid module id`);
  }
  if (!SUMMARY_STATUSES.has(module.admin_status)) {
    throw new ContractError(`${context}: invalid admin status`);
  }
  if (!READINESS_STATES.has(module.readiness_state)) {
    throw new ContractError(`${context}: invalid module readiness state`);
  }
  for (const field of [
    "configured_check_count",
    "ready_check_count",
    "attention_check_count",
    "missing_required_env_count",
    "next_attention_area_missing_setting_count",
    "anime_identity_surface_count",
    "anime_identity_ready_surface_count",
    "anime_identity_missing_surface_count",
    "reference_ready_count",
    "reference_attention_count",
    "expression_motion_ready_count",
    "expression_motion_attention_count",
    "voice_speech_ready_count",
    "voice_speech_attention_count",
    "ip_governance_ready_count",
    "ip_governance_attention_count",
    "voice_license_use_category_ready_count",
    "voice_license_use_category_attention_count",
    "fan_community_ready_count",
    "fan_community_attention_count",
    "trust_content_ready_count",
    "trust_content_attention_count",
    "monetization_cost_ready_count",
    "monetization_cost_attention_count",
    "operator_analytics_ready_count",
    "operator_analytics_attention_count",
    "verification_script_count",
    "safe_script_catalog_count",
  ]) {
    if (module[field] === undefined) continue;
    assertNonNegativeInteger(module[field], `${context}: invalid module ${field}`);
  }
  if (module.ready_check_count + module.attention_check_count !== module.configured_check_count) {
    throw new ContractError(`${context}: module check counts mismatch`);
  }
  if (
    module.module_id === "anime_performance_matching" &&
    (module.anime_identity_surface_count !== module.configured_check_count ||
      module.anime_identity_ready_surface_count !== module.ready_check_count ||
      module.anime_identity_missing_surface_count !== module.attention_check_count ||
      module.anime_identity_ready_surface_count +
        module.anime_identity_missing_surface_count !==
        module.anime_identity_surface_count)
  ) {
    throw new ContractError(`${context}: anime identity surface counts mismatch`);
  }
  for (const field of ["first_safe_script", "next_safe_script"]) {
    if (module[field] !== null && !SAFE_SCRIPT_PATTERN.test(module[field])) {
      throw new ContractError(`${context}: invalid module script`);
    }
  }
  if (
    !Array.isArray(module.safe_script_catalog) ||
    module.safe_script_catalog.length !== module.safe_script_catalog_count ||
    module.safe_script_catalog.length > 12 ||
    module.safe_script_catalog.some(
      (script) => typeof script !== "string" || !SAFE_SCRIPT_PATTERN.test(script)
    )
  ) {
    throw new ContractError(`${context}: invalid safe script catalog`);
  }
  if (new Set(module.safe_script_catalog).size !== module.safe_script_catalog.length) {
    throw new ContractError(`${context}: duplicate safe script catalog item`);
  }
  if (
    module.next_safe_script !== null &&
    !module.safe_script_catalog.includes(module.next_safe_script)
  ) {
    throw new ContractError(`${context}: next script missing from catalog`);
  }
  if (
    typeof module.next_operator_action_id !== "string" &&
    module.next_operator_action_id !== null
  ) {
    throw new ContractError(`${context}: invalid operator action`);
  }
  if (
    module.next_attention_area_id !== undefined &&
    module.next_attention_area_id !== null &&
    (typeof module.next_attention_area_id !== "string" ||
      !/^[a-z0-9_]+$/.test(module.next_attention_area_id))
  ) {
    throw new ContractError(`${context}: invalid next attention area`);
  }
  if (
    module.next_attention_area_id === null &&
    module.next_attention_area_missing_setting_count !== undefined &&
    module.next_attention_area_missing_setting_count !== 0
  ) {
    throw new ContractError(`${context}: invalid next attention area count`);
  }
  if (typeof module.operator_note_id !== "string") {
    throw new ContractError(`${context}: invalid operator note`);
  }
  assertBoundaryPolicy(
    module.boundary_policy,
    ADMIN_OPERATIONS_MODULE_BOUNDARY_FIELDS,
    `${context} module boundary policy`
  );
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertVerificationSurfacesSafe(surfaces, context) {
  if (!surfaces || typeof surfaces !== "object" || Array.isArray(surfaces)) {
    throw new ContractError(`${context}: verification surfaces required`);
  }
  if (surfaces.schema !== "iris_admin_operations_verification_surfaces_v1") {
    throw new ContractError(`${context}: invalid verification surfaces schema`);
  }
  for (const [key, value] of Object.entries(surfaces)) {
    if (key === "schema") continue;
    if (key === "debug_routes") {
      if (
        !Array.isArray(value) ||
        value.some(
          (route) =>
            typeof route !== "string" || !/^\/[a-z0-9/_-]+$/i.test(route)
        )
      ) {
        throw new ContractError(`${context}: invalid debug route`);
      }
      continue;
    }
    if (!SAFE_SCRIPT_PATTERN.test(value)) {
      throw new ContractError(`${context}: invalid verification script`);
    }
  }
}

function assertLowOutputRestartSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: low output restart summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (!LOW_OUTPUT_RESTART_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected low output restart field ${field}`);
    }
  }
  for (const field of [
    "entry_check_script",
    "first_check_script",
    "focus_check_script",
    "secondary_check_script",
    "full_preflight_script",
    "public_boundary_check_script",
  ]) {
    if (!SAFE_RESTART_SCRIPT_PATTERN.test(summary[field])) {
      throw new ContractError(`${context}: invalid low output restart script`);
    }
  }
  if (summary.first_check_script !== "npm run dev:production:attention-digest") {
    throw new ContractError(`${context}: invalid low output first script`);
  }
  if (summary.full_preflight_script !== "npm run preflight") {
    throw new ContractError(`${context}: invalid low output preflight script`);
  }
  if (
    summary.public_boundary_check_script !==
    "npm run dev:public-report-boundary-audit"
  ) {
    throw new ContractError(`${context}: invalid low output boundary script`);
  }
  for (const field of [
    "required_lightweight_script_count",
    "missing_required_lightweight_script_count",
  ]) {
    assertNonNegativeInteger(
      summary[field],
      `${context}: invalid low output lightweight script count`
    );
  }
  if (summary.required_lightweight_script_count <= 0) {
    throw new ContractError(`${context}: low output required count must be positive`);
  }
  if (
    summary.missing_required_lightweight_script_count >
    summary.required_lightweight_script_count
  ) {
    throw new ContractError(`${context}: low output missing count mismatch`);
  }
}

function mapReadinessToAdminStatus(readinessState) {
  switch (readinessState) {
    case "ready":
      return "ready";
    case "configuration_waiting":
      return "configuration_waiting";
    case "runtime_waiting":
      return "runtime_waiting";
    case "real_device_waiting":
      return "real_device_waiting";
    default:
      return "operator_review_required";
  }
}

function operatorNoteForStage(stageId, adminStatus) {
  if (adminStatus === "ready") return "module_ready";
  switch (stageId) {
    case "tts_live2d_obs_foundation":
      return "start_or_verify_local_tts_live2d_obs_handoff";
    case "youtube_comments_and_support":
      return "configure_youtube_and_support_ingest";
    case "memory_and_relationship_persistence":
      return "configure_persistence_and_memory_search";
    case "vision_and_safe_game_control":
      return "configure_vision_and_manual_safe_control";
    default:
      return "review_module_status";
  }
}

function countStatuses(statuses) {
  return {
    ready: statuses.filter((status) => status === "ready").length,
    configuration_waiting: statuses.filter(
      (status) => status === "configuration_waiting"
    ).length,
    mock_verification_ready: statuses.filter(
      (status) => status === "mock_verification_ready"
    ).length,
    runtime_waiting: statuses.filter((status) => status === "runtime_waiting")
      .length,
    real_device_waiting: statuses.filter(
      (status) => status === "real_device_waiting"
    ).length,
    operator_review_required: statuses.filter(
      (status) => status === "operator_review_required"
    ).length,
  };
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}
