import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";

const FORBIDDEN_READINESS_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "approved_game_input_action",
  "approved_memory_record",
  "approved_relationship_record",
  "action_type",
  "intent",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
]);

const READINESS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "readiness_status",
  "core_status",
  "capability_gates",
  "safety_gates",
  "spec_gates",
  "next_readiness_state",
  "readiness_state_counts",
  "integration_probe_readiness_summary",
  "integration_gaps",
  "integration_gap_statuses",
  "next_recommended_steps",
]);

const READINESS_GATE_FIELDS = new Set([
  "gate",
  "status",
  "detail",
  "readiness_state",
]);

const INTEGRATION_GAP_STATUS_FIELDS = new Set([
  "gap",
  "status",
  "readiness_state",
  "detail",
  "required_boundary_capabilities",
  "missing_boundary_capabilities",
  "operator_configuration_required",
]);

const INTEGRATION_PROBE_SUMMARY_FIELDS = new Set([
  "schema",
  "next_readiness_state",
  "readiness_state_counts",
  "probe_count",
  "engine_worker_readiness_state",
  "boundary_policy",
]);

const INTEGRATION_PROBE_BOUNDARY_POLICY_FIELDS = new Set([
  "counts_and_labels_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_payloads",
  "no_commands",
]);

const REQUIRED_CAPABILITIES = [
  "adapter_packets",
  "persistence_status",
  "subtitle_adapter_packets",
  "integration_status",
  "integration_contracts",
  "integration_fixtures",
  "integration_probe",
  "local_bridge_engine_worker",
  "local_engine_health_probe",
  "voicevox_tts_engine_bridge",
  "live2d_cue_engine_bridge",
  "obs_bridge_setup",
  "obs_overlay_handoff",
  "http_youtube_live_chat_source",
  "youtube_live_chat_api_source",
  "youtube_oauth_refresh",
  "http_ingest_scheduler",
  "event_queue_priority",
  "overlay_status",
  "overlay_display_event",
  "overlay_event_stream",
  "speech_cue",
  "speech_rate_profile",
  "language_profile",
  "subtitle_cue",
  "tongue_twister_mode",
  "motion_cue",
  "performance_plan",
  "expression_profile",
  "autonomous_expression",
  "body_continuity",
  "camera_proximity",
  "turn_rhythm",
  "affective_continuity",
  "personality_habit",
  "relationship_deepening",
  "relationship_public_filters",
  "donation_reaction",
  "media_watch_reaction",
  "http_media_watch_source",
  "external_topic_reaction",
  "http_external_topic_source",
  "memory_recall",
  "approved_memory_prompt_summary",
  "memory_public_filters",
  "memory_search_index",
  "http_vector_memory_search_foundation",
  "game_perception",
  "http_game_observation_source",
  "game_commentary",
  "game_relationship_coordination",
  "game_player",
  "game_action_validator",
  "game_control_adapter_available",
  "http_game_control_adapter_status_contract",
  "game_embodiment",
  "stream_lifecycle",
  "human_likeness_evaluation",
  "candidate_review_queue",
  "candidate_validator",
  "boundary_audit",
  "persona_profile",
  "persona_profile_presets",
  "http_adapter_response_guard",
  "game_observation",
  "idle_presence",
];

const INTEGRATION_GAPS = [
  "real_screen_capture_or_vision_ingestion",
  "production_media_and_external_topic_ingestion",
  "production_llm_provider",
  "real_tts_engine",
  "real_live2d_bridge",
  "production_obs_overlay",
  "production_vector_memory",
  "approved_game_control_adapter",
];

const INTEGRATION_GAP_BOUNDARIES = {
  real_screen_capture_or_vision_ingestion: ["http_game_observation_source"],
  production_media_and_external_topic_ingestion: [
    "http_media_watch_source",
    "http_external_topic_source",
  ],
  production_llm_provider: ["http_adapter_response_guard"],
  real_tts_engine: [
    "adapter_packets",
    "http_adapter_response_guard",
    "local_bridge_engine_worker",
    "local_engine_health_probe",
    "voicevox_tts_engine_bridge",
  ],
  real_live2d_bridge: [
    "adapter_packets",
    "http_adapter_response_guard",
    "local_bridge_engine_worker",
    "local_engine_health_probe",
    "live2d_cue_engine_bridge",
  ],
  production_obs_overlay: [
    "overlay_status",
    "overlay_display_event",
    "overlay_event_stream",
    "obs_bridge_setup",
    "obs_overlay_handoff",
  ],
  production_vector_memory: ["memory_search_index", "http_vector_memory_search_foundation"],
  approved_game_control_adapter: [
    "game_action_validator",
    "http_game_control_adapter_status_contract",
  ],
};
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);

export function createReadinessReport({
  capabilities = {},
  state = null,
  candidateReviewStats = null,
  integrationProbeReport = null,
  specFileCount = null,
  expectedSpecFileCount = 28,
  generatedAtMs = Date.now(),
} = {}) {
  const integrationProbeReadiness =
    summarizeIntegrationProbeReadiness(integrationProbeReport);
  const capability_gates = buildCapabilityGates(capabilities, {
    integrationProbeReadiness,
  });
  const safety_gates = buildSafetyGates({ state, candidateReviewStats });
  const spec_gates = buildSpecGates({ specFileCount, expectedSpecFileCount });
  const blocking = [...capability_gates, ...safety_gates, ...spec_gates].filter(
    (gate) => gate.status !== "pass"
  );
  const allGates = [...capability_gates, ...safety_gates, ...spec_gates];
  const report = {
    schema: "iris_readiness_report_v1",
    generated_at_ms: generatedAtMs,
    readiness_status: blocking.length === 0 ? "ready_for_local_dev" : "attention_required",
    core_status: {
      core_phases: capabilities.core_phases ?? "unknown",
      phase16_27_mvp:
        capabilities.phase16_body_continuity_mvp === true &&
        capabilities.phase27_human_likeness_evaluation_mvp === true,
    },
    capability_gates,
    safety_gates,
    spec_gates,
    next_readiness_state: firstReadinessState(allGates),
    readiness_state_counts: countReadinessStates(allGates),
    integration_probe_readiness_summary: integrationProbeReadiness,
    integration_gaps: INTEGRATION_GAPS,
    integration_gap_statuses: buildIntegrationGapStatuses(capabilities),
    next_recommended_steps: buildNextSteps({ blocking }),
  };
  assertReadinessReportSafe(report);
  return report;
}

export function assertReadinessReportSafe(report, context = "readiness report") {
  if (!report || typeof report !== "object") {
    throw new ContractError(`${context}: missing report`);
  }
  assertNoWorldCommand(report, context);
  assertNoForbiddenFieldsRecursive(report, context);
  if (report.schema !== "iris_readiness_report_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: report.schema });
  }
  for (const field of Object.keys(report)) {
    if (!READINESS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`, { field });
    }
  }
  if (!["ready_for_local_dev", "attention_required"].includes(report.readiness_status)) {
    throw new ContractError(`${context}: invalid readiness status`, {
      readiness_status: report.readiness_status,
    });
  }
  for (const group of [report.capability_gates, report.safety_gates, report.spec_gates]) {
    if (!Array.isArray(group)) {
      throw new ContractError(`${context}: gates must be arrays`);
    }
    for (const gate of group) assertGate(gate, context);
  }
  if (!Array.isArray(report.integration_gaps)) {
    throw new ContractError(`${context}: integration gaps must be an array`);
  }
  for (const gap of report.integration_gaps) {
    if (!INTEGRATION_GAPS.includes(gap)) {
      throw new ContractError(`${context}: unknown integration gap`, { gap });
    }
    if (!Array.isArray(INTEGRATION_GAP_BOUNDARIES[gap])) {
      throw new ContractError(`${context}: integration gap boundary definition is required`, {
        gap,
      });
    }
  }
  if (!Array.isArray(report.integration_gap_statuses)) {
    throw new ContractError(`${context}: integration gap statuses must be an array`);
  }
  for (const gapStatus of report.integration_gap_statuses) {
    assertIntegrationGapStatus(gapStatus, context);
  }
  assertSafeOptionalIntegrationProbeReadinessSummary(
    report.integration_probe_readiness_summary,
    context
  );
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  const allGates = [
    ...report.capability_gates,
    ...report.safety_gates,
    ...report.spec_gates,
  ];
  if (report.next_readiness_state !== firstReadinessState(allGates)) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  if (
    !sameReadinessStateCounts(report.readiness_state_counts, countReadinessStates(allGates))
  ) {
    throw new ContractError(`${context}: invalid readiness counts`);
  }
}

function buildCapabilityGates(capabilities, { integrationProbeReadiness = null } = {}) {
  return REQUIRED_CAPABILITIES.map((name) => ({
    gate: name,
    status: capabilities?.[name] === true ? "pass" : "attention",
    detail: capabilities?.[name] === true ? "available" : "missing",
    readiness_state:
      name === "integration_probe" && integrationProbeReadiness
        ? integrationProbeReadiness.next_readiness_state
        : capabilities?.[name] === true
          ? "ready"
          : "configuration_waiting",
  }));
}

function buildSafetyGates({ state, candidateReviewStats }) {
  const humanScore = state?.last_human_likeness_evaluation?.total_human_likeness_score;
  const reviewRequired = state?.last_human_likeness_evaluation?.review_required;
  const boundaryAuditStatus = state?.last_boundary_audit?.audit_status;
  const stats = candidateReviewStats ?? {
    total_items: 0,
    by_kind: {},
    by_status: {},
  };
  return [
    {
      gate: "human_likeness_score",
      status: typeof humanScore === "number" && humanScore < 0.75 ? "attention" : "pass",
      readiness_state:
        typeof humanScore === "number" && humanScore < 0.75
          ? "operator_review_required"
          : "ready",
      detail:
        typeof humanScore === "number"
          ? `score=${humanScore.toFixed(4)}`
          : "no live state yet",
    },
    {
      gate: "human_review_required",
      status: reviewRequired === true ? "attention" : "pass",
      readiness_state:
        reviewRequired === true ? "operator_review_required" : "ready",
      detail: reviewRequired === true ? "review required" : "clear",
    },
    {
      gate: "boundary_audit",
      status: boundaryAuditStatus === "fail" ? "attention" : "pass",
      readiness_state:
        boundaryAuditStatus === "fail" ? "operator_review_required" : "ready",
      detail: boundaryAuditStatus ?? "no live state yet",
    },
    {
      gate: "candidate_review_summaries",
      status: Number(stats.total_items ?? 0) >= 0 ? "pass" : "attention",
      readiness_state:
        Number(stats.total_items ?? 0) >= 0 ? "ready" : "operator_review_required",
      detail: `items=${Number(stats.total_items ?? 0)}`,
    },
  ];
}

function buildSpecGates({ specFileCount, expectedSpecFileCount }) {
  if (specFileCount === null || specFileCount === undefined) {
    return [
      {
        gate: "spec_manifest",
        status: "pass",
        readiness_state: "ready",
        detail: "not checked in runtime endpoint",
      },
    ];
  }
  return [
    {
      gate: "spec_manifest",
      status: specFileCount === expectedSpecFileCount ? "pass" : "attention",
      readiness_state:
        specFileCount === expectedSpecFileCount ? "ready" : "configuration_waiting",
      detail: `files=${specFileCount}/${expectedSpecFileCount}`,
    },
  ];
}

function buildIntegrationGapStatuses(capabilities) {
  return INTEGRATION_GAPS.map((gap) => {
    const requiredBoundaryCapabilities = INTEGRATION_GAP_BOUNDARIES[gap];
    const missingBoundaryCapabilities = requiredBoundaryCapabilities.filter(
      (name) => capabilities?.[name] !== true
    );
    return {
      gap,
      status: missingBoundaryCapabilities.length === 0 ? "boundary_available" : "boundary_missing",
      readiness_state:
        missingBoundaryCapabilities.length === 0
          ? "operator_review_required"
          : "configuration_waiting",
      detail:
        missingBoundaryCapabilities.length === 0
          ? "boundary available; production environment still requires operator configuration"
          : `missing_boundary=${missingBoundaryCapabilities[0]}`,
      required_boundary_capabilities: requiredBoundaryCapabilities,
      missing_boundary_capabilities: missingBoundaryCapabilities,
      operator_configuration_required: true,
    };
  });
}

function buildNextSteps({ blocking }) {
  if (blocking.length === 0) {
    return [
      "Connect a real TTS engine behind adapter packets.",
      "Connect a real Live2D bridge behind adapter packets.",
      "Connect production vision/media/topic ingestion behind read-only adapters.",
    ];
  }
  return blocking.slice(0, 5).map((gate) => `Resolve readiness gate: ${gate.gate}`);
}

function assertGate(gate, context) {
  if (!gate || typeof gate !== "object") {
    throw new ContractError(`${context}: invalid gate`);
  }
  for (const field of Object.keys(gate)) {
    if (!READINESS_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`, { field });
    }
  }
  if (!["pass", "attention"].includes(gate.status)) {
    throw new ContractError(`${context}: invalid gate status`, { gate });
  }
  assertSafeReadinessState(gate.readiness_state, context);
  if (gate.status === "attention" && gate.readiness_state === "ready") {
    throw new ContractError(`${context}: attention gate cannot be ready`);
  }
}

function assertIntegrationGapStatus(gapStatus, context) {
  if (!gapStatus || typeof gapStatus !== "object" || Array.isArray(gapStatus)) {
    throw new ContractError(`${context}: invalid integration gap status`);
  }
  for (const field of Object.keys(gapStatus)) {
    if (!INTEGRATION_GAP_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected integration gap field`, {
        field,
      });
    }
  }
  if (!INTEGRATION_GAPS.includes(gapStatus.gap)) {
    throw new ContractError(`${context}: unknown integration gap status`, { gap: gapStatus.gap });
  }
  if (!["boundary_available", "boundary_missing"].includes(gapStatus.status)) {
    throw new ContractError(`${context}: invalid integration gap status`, {
      status: gapStatus.status,
    });
  }
  assertSafeReadinessState(gapStatus.readiness_state, context);
  if (typeof gapStatus.detail !== "string" || gapStatus.detail.length > 120) {
    throw new ContractError(`${context}: invalid integration gap detail`);
  }
  if (!Array.isArray(gapStatus.required_boundary_capabilities)) {
    throw new ContractError(`${context}: required boundary capabilities must be an array`);
  }
  if (!Array.isArray(gapStatus.missing_boundary_capabilities)) {
    throw new ContractError(`${context}: missing boundary capabilities must be an array`);
  }
  const requiredBoundaryCapabilities = INTEGRATION_GAP_BOUNDARIES[gapStatus.gap];
  if (!Array.isArray(requiredBoundaryCapabilities)) {
    throw new ContractError(`${context}: integration gap boundary definition is required`, {
      gap: gapStatus.gap,
    });
  }
  for (const name of gapStatus.required_boundary_capabilities) {
    if (!requiredBoundaryCapabilities.includes(name)) {
      throw new ContractError(`${context}: unexpected boundary capability`, { name });
    }
  }
  for (const name of gapStatus.missing_boundary_capabilities) {
    if (!requiredBoundaryCapabilities.includes(name)) {
      throw new ContractError(`${context}: unexpected missing boundary capability`, { name });
    }
  }
  if (gapStatus.operator_configuration_required !== true) {
    throw new ContractError(`${context}: operator configuration flag is required`);
  }
}

function summarizeIntegrationProbeReadiness(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) return null;
  const nextReadinessState = READINESS_STATES.has(report.next_readiness_state)
    ? report.next_readiness_state
    : "operator_review_required";
  const counts = {};
  for (const state of READINESS_STATES) {
    const count = report.readiness_state_counts?.[state];
    counts[state] = Number.isInteger(count) && count >= 0 ? count : 0;
  }
  const probeCount = Array.isArray(report.probes) ? report.probes.length : 0;
  const engineWorkerReadinessState = READINESS_STATES.has(
    report.engine_worker?.readiness_state
  )
    ? report.engine_worker.readiness_state
    : null;
  return {
    schema: "iris_readiness_report_integration_probe_summary_v1",
    next_readiness_state: nextReadinessState,
    readiness_state_counts: counts,
    probe_count: probeCount,
    engine_worker_readiness_state: engineWorkerReadinessState,
    boundary_policy: {
      counts_and_labels_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_commands: true,
    },
  };
}

function assertSafeOptionalIntegrationProbeReadinessSummary(summary, context) {
  if (summary === null) return;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: invalid integration probe readiness summary`);
  }
  if (summary.schema !== "iris_readiness_report_integration_probe_summary_v1") {
    throw new ContractError(`${context}: invalid integration probe readiness schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!INTEGRATION_PROBE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected integration probe summary field`, {
        field,
      });
    }
  }
  assertSafeReadinessState(summary.next_readiness_state, context);
  if (summary.engine_worker_readiness_state !== null) {
    assertSafeReadinessState(summary.engine_worker_readiness_state, context);
  }
  assertReadinessStateCountsSafe(summary.readiness_state_counts, context);
  if (!Number.isInteger(summary.probe_count) || summary.probe_count < 0) {
    throw new ContractError(`${context}: invalid integration probe count`);
  }
  if (
    !summary.boundary_policy ||
    typeof summary.boundary_policy !== "object" ||
    Array.isArray(summary.boundary_policy)
  ) {
    throw new ContractError(`${context}: integration probe summary boundary required`);
  }
  for (const field of Object.keys(summary.boundary_policy)) {
    if (!INTEGRATION_PROBE_BOUNDARY_POLICY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected integration probe boundary field`, {
        field,
      });
    }
  }
  for (const field of INTEGRATION_PROBE_BOUNDARY_POLICY_FIELDS) {
    if (summary.boundary_policy[field] !== true) {
      throw new ContractError(`${context}: integration probe summary boundary required`);
    }
  }
}

function countReadinessStates(items) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const item of items) {
    counts[item.readiness_state] += 1;
  }
  return counts;
}

function firstReadinessState(items) {
  const firstAttentionGate = items.find((item) => item.status !== "pass");
  if (firstAttentionGate) return firstAttentionGate.readiness_state;
  const firstNonReady = items.find((item) => item.readiness_state !== "ready");
  return firstNonReady?.readiness_state ?? "ready";
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: readiness counts required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness ${state} count`);
    }
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: invalid readiness count key`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every((state) => left?.[state] === right?.[state]);
}

function assertSafeReadinessState(state, context) {
  if (!READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
}

function assertNoForbiddenFieldsRecursive(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFieldsRecursive(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_READINESS_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: readiness report must not expose raw candidate, command, commit, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}
