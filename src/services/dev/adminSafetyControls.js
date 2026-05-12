import { ContractError } from "../../core/contracts.js";

const ACTIONS = new Set([
  "emergency_stop",
  "resume_safe_local_operation",
  "pause_tts",
  "resume_tts",
  "pause_live2d",
  "resume_live2d",
  "pause_subtitle",
  "resume_subtitle",
  "pause_obs_handoff",
  "resume_obs_handoff",
  "pause_youtube_ingest",
  "resume_youtube_ingest",
  "pause_support_ingest",
  "resume_support_ingest",
  "pause_memory_commits",
  "resume_memory_commits",
  "pause_relationship_commits",
  "resume_relationship_commits",
  "pause_game_observation",
  "resume_game_observation",
  "pause_game_action_approval",
  "resume_game_action_approval",
  "pause_external_topic_ingest",
  "resume_external_topic_ingest",
  "pause_media_watch_ingest",
  "resume_media_watch_ingest",
]);
const PAUSE_FIELDS = {
  pause_tts: "tts_paused",
  resume_tts: "tts_paused",
  pause_live2d: "live2d_paused",
  resume_live2d: "live2d_paused",
  pause_subtitle: "subtitle_paused",
  resume_subtitle: "subtitle_paused",
  pause_obs_handoff: "obs_handoff_paused",
  resume_obs_handoff: "obs_handoff_paused",
  pause_youtube_ingest: "youtube_ingest_paused",
  resume_youtube_ingest: "youtube_ingest_paused",
  pause_support_ingest: "support_ingest_paused",
  resume_support_ingest: "support_ingest_paused",
  pause_memory_commits: "memory_commits_paused",
  resume_memory_commits: "memory_commits_paused",
  pause_relationship_commits: "relationship_commits_paused",
  resume_relationship_commits: "relationship_commits_paused",
  pause_game_observation: "game_observation_paused",
  resume_game_observation: "game_observation_paused",
  pause_game_action_approval: "game_action_approval_paused",
  resume_game_action_approval: "game_action_approval_paused",
  pause_external_topic_ingest: "external_topic_ingest_paused",
  resume_external_topic_ingest: "external_topic_ingest_paused",
  pause_media_watch_ingest: "media_watch_ingest_paused",
  resume_media_watch_ingest: "media_watch_ingest_paused",
};
const FORBIDDEN_PATTERN =
  /(?:^|[^a-z0-9_])(?:device|obs)[_-]?command(?:$|[^a-z0-9_])|(?:^|[^a-z0-9_])(?:raw[_-]?)?bridge[_-]?payload(?:$|[^a-z0-9_])|\b(world_command|input_action|input_action_candidate|approved_game_input_action|event_id|trace_id|subtitle_text|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|raw[_-]?frame|ocr[_-]?text|candidate|command)\b|https?:\/\//i;
const ADMIN_SAFETY_CONTROLS_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "control_status",
  "emergency_stop_available",
  "confirmation_required_for_emergency_stop",
  "real_device_operation_performed",
  "game_or_os_input_performed",
  "state",
  "active_pause_count",
  "audit_summary",
  "supported_actions",
  "boundary_policy",
]);
const ADMIN_SAFETY_CONTROL_ACTION_RESULT_FIELDS = new Set([
  "schema",
  "action_status",
  "applied",
  "audit_entry",
  "boundary_policy",
]);
const EMERGENCY_STOP_REHEARSAL_SUMMARY_FIELDS = new Set([
  "schema",
  "rehearsal_status",
  "action_status",
  "action_label",
  "control_status",
  "active_pause_count",
  "real_device_operation_performed",
  "game_or_os_input_performed",
  "boundary_policy",
]);
const ADMIN_STREAM_MODE_GATE_FIELDS = new Set([
  "schema",
  "requested_mode",
  "mode_change_status",
  "activation_allowed",
  "readiness_display_required",
  "readiness_display_present",
  "explicit_confirmation_required",
  "explicit_confirmation_present",
  "real_surface_count",
  "real_surface_labels",
  "safe_block_reason",
  "boundary_policy",
]);
const ADMIN_SAFETY_CONTROL_STATE_FIELDS = new Set([
  "schema",
  "emergency_stop_active",
  "tts_paused",
  "live2d_paused",
  "subtitle_paused",
  "obs_handoff_paused",
  "youtube_ingest_paused",
  "support_ingest_paused",
  "memory_commits_paused",
  "relationship_commits_paused",
  "game_observation_paused",
  "game_action_approval_paused",
  "external_topic_ingest_paused",
  "media_watch_ingest_paused",
  "updated_at_ms",
  "boundary_policy",
]);
const ADMIN_SAFETY_AUDIT_SUMMARY_FIELDS = new Set([
  "schema",
  "entry_count",
  "applied_count",
  "blocked_count",
  "last_action_type",
  "last_result_status",
  "last_actor_role",
]);
const ADMIN_SAFETY_AUDIT_ENTRY_FIELDS = new Set([
  "schema",
  "actor_role",
  "action_type",
  "safe_target_label",
  "confirmation_required",
  "confirmed",
  "result_status",
  "event_at_ms",
  "safe_error_code",
  "payload_stored_in_audit",
]);
const ADMIN_SAFETY_CONTROLS_REPORT_BOUNDARY_FIELDS = [
  "safe_control_state_only",
  "read_only_report",
  "explicit_confirmation_required",
  "audit_summaries_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_live_payloads",
  "no_viewer_messages",
  "no_support_message_text",
  "no_memory_records",
  "no_relationship_records",
  "no_hidden_relationship_scores",
  "no_candidates",
  "no_commands",
  "no_raw_frames",
  "no_raw_voice_samples",
  "no_dataset_paths",
  "no_internal_model_paths",
  "no_raw_jobs",
  "no_device_operations",
  "no_obs_operations",
  "no_bridge_values",
  "no_real_device_operation",
  "no_game_or_os_input",
];
const ADMIN_SAFETY_CONTROL_ACTION_BOUNDARY_FIELDS = [
  "safe_action_summary_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_payloads",
  "no_candidates",
  "no_commands",
  "no_device_operations",
  "no_obs_operations",
  "no_bridge_values",
  "no_real_device_operation",
  "no_game_or_os_input",
];
const EMERGENCY_STOP_REHEARSAL_BOUNDARY_FIELDS = [
  "safe_status_and_action_label_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_real_device_operation",
  "no_game_or_os_input",
  "no_real_device_control_values",
  "no_obs_operation_values",
  "no_raw_bridge_values",
];
const ADMIN_STREAM_MODE_GATE_BOUNDARY_FIELDS = [
  "safe_mode_labels_only",
  "readiness_display_before_activation",
  "explicit_confirmation_before_activation",
  "no_real_device_operation",
  "no_obs_operations",
  "no_game_or_os_input",
  "no_endpoint_values",
  "no_secret_values",
  "no_payloads",
  "no_commands",
];
const ADMIN_SAFETY_CONTROL_STATE_BOUNDARY_FIELDS = [
  "booleans_only",
  "no_payloads",
  "no_candidates",
  "no_commands",
  "no_device_operations",
  "no_obs_operations",
  "no_bridge_values",
];

export function createInMemoryAdminSafetyControlStore({
  generatedAtMs = Date.now(),
} = {}) {
  const state = {
    schema: "iris_admin_safety_control_state_v1",
    emergency_stop_active: false,
    tts_paused: false,
    live2d_paused: false,
    subtitle_paused: false,
    obs_handoff_paused: false,
    youtube_ingest_paused: false,
    support_ingest_paused: false,
    memory_commits_paused: false,
    relationship_commits_paused: false,
    game_observation_paused: false,
    game_action_approval_paused: false,
    external_topic_ingest_paused: false,
    media_watch_ingest_paused: false,
    updated_at_ms: generatedAtMs,
  };
  const auditEntries = [];
  return {
    getState() {
      return structuredClone(state);
    },
    listAuditEntries() {
      return structuredClone(auditEntries);
    },
    applyAction({ action, actorRole = "operator", confirmed = false, nowMs = Date.now() } = {}) {
      const normalizedAction = sanitizeAction(action);
      const normalizedRole = sanitizeRole(actorRole);
      const confirmationRequired = requiresConfirmation(normalizedAction);
      if (confirmationRequired && confirmed !== true) {
        const entry = createAuditEntry({
          action: normalizedAction,
          actorRole: normalizedRole,
          confirmed: false,
          resultStatus: "blocked",
          eventAtMs: nowMs,
        });
        auditEntries.push(entry);
        return { applied: false, entry };
      }
      applyActionToState(state, normalizedAction);
      state.updated_at_ms = safeTimestamp(nowMs);
      const entry = createAuditEntry({
        action: normalizedAction,
        actorRole: normalizedRole,
        confirmed: confirmed === true,
        resultStatus: "applied",
        eventAtMs: nowMs,
      });
      auditEntries.push(entry);
      return { applied: true, entry };
    },
  };
}

export function createAdminSafetyControlsReport({
  store,
  generatedAtMs = Date.now(),
} = {}) {
  const controlStore = store ?? createInMemoryAdminSafetyControlStore({ generatedAtMs });
  const state = controlStore.getState();
  const auditEntries = controlStore.listAuditEntries();
  const activePauseCount = countActivePauses(state);
  const report = {
    schema: "iris_admin_safety_controls_v1",
    generated_at_ms: generatedAtMs,
    control_status: state.emergency_stop_active
      ? "emergency_stop_active"
      : activePauseCount > 0
        ? "paused_safe"
        : "ready",
    emergency_stop_available: true,
    confirmation_required_for_emergency_stop: true,
    real_device_operation_performed: false,
    game_or_os_input_performed: false,
    state: sanitizeSafetyState(state),
    active_pause_count: activePauseCount,
    audit_summary: {
      schema: "iris_admin_safety_controls_audit_summary_v1",
      entry_count: auditEntries.length,
      applied_count: auditEntries.filter((entry) => entry.result_status === "applied")
        .length,
      blocked_count: auditEntries.filter((entry) => entry.result_status === "blocked")
        .length,
      last_action_type: auditEntries.at(-1)?.action_type ?? null,
      last_result_status: auditEntries.at(-1)?.result_status ?? null,
      last_actor_role: auditEntries.at(-1)?.actor_role ?? null,
    },
    supported_actions: [...ACTIONS],
    boundary_policy: {
      safe_control_state_only: true,
      read_only_report: true,
      explicit_confirmation_required: true,
      audit_summaries_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_live_payloads: true,
      no_viewer_messages: true,
      no_support_message_text: true,
      no_memory_records: true,
      no_relationship_records: true,
      no_hidden_relationship_scores: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_raw_voice_samples: true,
      no_dataset_paths: true,
      no_internal_model_paths: true,
      no_raw_jobs: true,
      no_device_operations: true,
      no_obs_operations: true,
      no_bridge_values: true,
      no_real_device_operation: true,
      no_game_or_os_input: true,
    },
  };
  assertAdminSafetyControlsReportSafe(report);
  return report;
}

export function applyAdminSafetyControlAction({
  store,
  action,
  actorRole = "operator",
  confirmed = false,
  nowMs = Date.now(),
} = {}) {
  if (!store) throw new ContractError("admin safety controls: store required");
  const result = store.applyAction({ action, actorRole, confirmed, nowMs });
  const response = {
    schema: "iris_admin_safety_control_action_result_v1",
    action_status: result.applied ? "applied" : "blocked_confirmation_required",
    applied: result.applied,
    audit_entry: result.entry,
    boundary_policy: {
      safe_action_summary_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_device_operations: true,
      no_obs_operations: true,
      no_bridge_values: true,
      no_real_device_operation: true,
      no_game_or_os_input: true,
    },
  };
  assertAdminSafetyControlActionResultSafe(response);
  return response;
}

export function createEmergencyStopRehearsalSummary({
  actionResult,
  report,
} = {}) {
  assertAdminSafetyControlActionResultSafe(
    actionResult,
    "emergency stop rehearsal action result"
  );
  assertAdminSafetyControlsReportSafe(report, "emergency stop rehearsal report");
  const summary = {
    schema: "iris_emergency_stop_rehearsal_summary_v1",
    rehearsal_status:
      actionResult.applied === true && report.control_status === "emergency_stop_active"
        ? "pass"
        : "blocked",
    action_status: actionResult.action_status,
    action_label: actionResult.audit_entry.safe_target_label,
    control_status: report.control_status,
    active_pause_count: report.active_pause_count,
    real_device_operation_performed: false,
    game_or_os_input_performed: false,
    boundary_policy: {
      safe_status_and_action_label_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_real_device_operation: true,
      no_game_or_os_input: true,
      no_real_device_control_values: true,
      no_obs_operation_values: true,
      no_raw_bridge_values: true,
    },
  };
  assertEmergencyStopRehearsalSummarySafe(summary);
  return summary;
}

export function assertEmergencyStopRehearsalSummarySafe(
  summary,
  context = "emergency stop rehearsal summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeText(summary, context);
  if (summary.schema !== "iris_emergency_stop_rehearsal_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!EMERGENCY_STOP_REHEARSAL_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field ${field}`);
    }
  }
  if (!["pass", "blocked"].includes(summary.rehearsal_status)) {
    throw new ContractError(`${context}: invalid rehearsal status`);
  }
  if (!["applied", "blocked_confirmation_required"].includes(summary.action_status)) {
    throw new ContractError(`${context}: invalid action status`);
  }
  if (summary.action_label !== "global_safe_stop") {
    throw new ContractError(`${context}: invalid action label`);
  }
  if (!["ready", "paused_safe", "emergency_stop_active"].includes(summary.control_status)) {
    throw new ContractError(`${context}: invalid control status`);
  }
  if (!Number.isInteger(summary.active_pause_count) || summary.active_pause_count < 0) {
    throw new ContractError(`${context}: invalid pause count`);
  }
  if (
    summary.real_device_operation_performed !== false ||
    summary.game_or_os_input_performed !== false
  ) {
    throw new ContractError(`${context}: real operations must not be performed`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    EMERGENCY_STOP_REHEARSAL_BOUNDARY_FIELDS,
    `${context} boundary policy`
  );
}

export function createAdminStreamModeConfirmationGate({
  requestedMode = "safe_local",
  readinessDisplayed = false,
  explicitConfirmation = false,
  realSurfaces = [],
} = {}) {
  const surfaceLabels = sanitizeRealSurfaceLabels(realSurfaces);
  const realSurfaceCount = surfaceLabels.length;
  const requiresGate = realSurfaceCount > 0;
  const readinessPresent = readinessDisplayed === true;
  const confirmationPresent = explicitConfirmation === true;
  const activationAllowed =
    requiresGate === false || (readinessPresent === true && confirmationPresent === true);
  const gate = {
    schema: "iris_admin_stream_mode_confirmation_gate_v1",
    requested_mode: sanitizeModeLabel(requestedMode),
    mode_change_status: activationAllowed ? "allowed_after_gate" : "blocked_gate_required",
    activation_allowed: activationAllowed,
    readiness_display_required: requiresGate,
    readiness_display_present: readinessPresent,
    explicit_confirmation_required: requiresGate,
    explicit_confirmation_present: confirmationPresent,
    real_surface_count: realSurfaceCount,
    real_surface_labels: surfaceLabels,
    safe_block_reason: activationAllowed
      ? null
      : readinessPresent
        ? "explicit_confirmation_required"
        : "readiness_display_required",
    boundary_policy: {
      safe_mode_labels_only: true,
      readiness_display_before_activation: true,
      explicit_confirmation_before_activation: true,
      no_real_device_operation: true,
      no_obs_operations: true,
      no_game_or_os_input: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_payloads: true,
      no_commands: true,
    },
  };
  assertAdminStreamModeConfirmationGateSafe(gate);
  return gate;
}

export function assertAdminStreamModeConfirmationGateSafe(
  gate,
  context = "admin stream mode confirmation gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoUnsafeText(gate, context);
  if (gate.schema !== "iris_admin_stream_mode_confirmation_gate_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(gate)) {
    if (!ADMIN_STREAM_MODE_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["allowed_after_gate", "blocked_gate_required"].includes(gate.mode_change_status)) {
    throw new ContractError(`${context}: invalid status`);
  }
  for (const field of [
    "activation_allowed",
    "readiness_display_required",
    "readiness_display_present",
    "explicit_confirmation_required",
    "explicit_confirmation_present",
  ]) {
    if (typeof gate[field] !== "boolean") {
      throw new ContractError(`${context}: invalid boolean ${field}`);
    }
  }
  if (!Number.isInteger(gate.real_surface_count) || gate.real_surface_count < 0) {
    throw new ContractError(`${context}: invalid real surface count`);
  }
  if (
    !Array.isArray(gate.real_surface_labels) ||
    gate.real_surface_labels.length !== gate.real_surface_count
  ) {
    throw new ContractError(`${context}: invalid real surface labels`);
  }
  if (gate.real_surface_count > 0) {
    if (
      gate.readiness_display_required !== true ||
      gate.explicit_confirmation_required !== true
    ) {
      throw new ContractError(`${context}: real mode change requires gate`);
    }
    if (
      gate.activation_allowed !==
      (gate.readiness_display_present === true &&
        gate.explicit_confirmation_present === true)
    ) {
      throw new ContractError(`${context}: activation gate mismatch`);
    }
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    ADMIN_STREAM_MODE_GATE_BOUNDARY_FIELDS,
    `${context} boundary policy`
  );
}

export function assertAdminSafetyControlsReportSafe(
  report,
  context = "admin safety controls report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  assertNoUnsafeText(report, context);
  if (report.schema !== "iris_admin_safety_controls_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!ADMIN_SAFETY_CONTROLS_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field ${field}`);
    }
  }
  if (!["ready", "paused_safe", "emergency_stop_active"].includes(report.control_status)) {
    throw new ContractError(`${context}: invalid control status`);
  }
  if (report.emergency_stop_available !== true) {
    throw new ContractError(`${context}: emergency stop must be available`);
  }
  if (report.confirmation_required_for_emergency_stop !== true) {
    throw new ContractError(`${context}: emergency stop confirmation required`);
  }
  if (report.real_device_operation_performed !== false || report.game_or_os_input_performed !== false) {
    throw new ContractError(`${context}: real operation must not be performed`);
  }
  assertSafetyStateSafe(report.state, context);
  if (report.active_pause_count !== countActivePauses(report.state)) {
    throw new ContractError(`${context}: active pause count mismatch`);
  }
  assertAuditSummarySafe(report.audit_summary, context);
  if (
    !Array.isArray(report.supported_actions) ||
    report.supported_actions.length !== ACTIONS.size ||
    report.supported_actions.some((action) => !ACTIONS.has(action)) ||
    new Set(report.supported_actions).size !== report.supported_actions.length
  ) {
    throw new ContractError(`${context}: invalid supported actions`);
  }
  assertBoundaryPolicy(
    report.boundary_policy,
    ADMIN_SAFETY_CONTROLS_REPORT_BOUNDARY_FIELDS,
    `${context} boundary policy`
  );
}

export function assertAdminSafetyControlActionResultSafe(
  result,
  context = "admin safety control action result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result required`);
  }
  assertNoUnsafeText(result, context);
  if (result.schema !== "iris_admin_safety_control_action_result_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(result)) {
    if (!ADMIN_SAFETY_CONTROL_ACTION_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected action result field ${field}`);
    }
  }
  if (!["applied", "blocked_confirmation_required"].includes(result.action_status)) {
    throw new ContractError(`${context}: invalid action status`);
  }
  if (typeof result.applied !== "boolean") {
    throw new ContractError(`${context}: invalid applied flag`);
  }
  if (
    (result.action_status === "applied") !== result.applied ||
    result.audit_entry?.result_status !== (result.applied ? "applied" : "blocked")
  ) {
    throw new ContractError(`${context}: action result status mismatch`);
  }
  assertAuditEntrySafe(result.audit_entry, context);
  assertBoundaryPolicy(
    result.boundary_policy,
    ADMIN_SAFETY_CONTROL_ACTION_BOUNDARY_FIELDS,
    `${context} boundary policy`
  );
}

function applyActionToState(state, action) {
  if (action === "emergency_stop") {
    state.emergency_stop_active = true;
    for (const field of Object.values(PAUSE_FIELDS)) state[field] = true;
    return;
  }
  if (action === "resume_safe_local_operation") {
    state.emergency_stop_active = false;
    for (const field of Object.values(PAUSE_FIELDS)) state[field] = false;
    return;
  }
  const field = PAUSE_FIELDS[action];
  if (!field) return;
  state[field] = action.startsWith("pause_");
}

function createAuditEntry({
  action,
  actorRole,
  confirmed,
  resultStatus,
  eventAtMs,
}) {
  const entry = {
    schema: "iris_admin_safety_control_audit_entry_v1",
    actor_role: actorRole,
    action_type: action,
    safe_target_label: targetLabelForAction(action),
    confirmation_required: requiresConfirmation(action),
    confirmed: confirmed === true,
    result_status: resultStatus,
    event_at_ms: safeTimestamp(eventAtMs),
    safe_error_code:
      resultStatus === "blocked" ? "confirmation_required" : null,
    payload_stored_in_audit: false,
  };
  assertAuditEntrySafe(entry);
  return entry;
}

function sanitizeSafetyState(state) {
  return {
    schema: "iris_admin_safety_control_state_public_v1",
    emergency_stop_active: state.emergency_stop_active === true,
    tts_paused: state.tts_paused === true,
    live2d_paused: state.live2d_paused === true,
    subtitle_paused: state.subtitle_paused === true,
    obs_handoff_paused: state.obs_handoff_paused === true,
    youtube_ingest_paused: state.youtube_ingest_paused === true,
    support_ingest_paused: state.support_ingest_paused === true,
    memory_commits_paused: state.memory_commits_paused === true,
    relationship_commits_paused: state.relationship_commits_paused === true,
    game_observation_paused: state.game_observation_paused === true,
    game_action_approval_paused: state.game_action_approval_paused === true,
    external_topic_ingest_paused: state.external_topic_ingest_paused === true,
    media_watch_ingest_paused: state.media_watch_ingest_paused === true,
    updated_at_ms: safeTimestamp(state.updated_at_ms),
    boundary_policy: {
      booleans_only: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_device_operations: true,
      no_obs_operations: true,
      no_bridge_values: true,
    },
  };
}

function assertSafetyStateSafe(state, context) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new ContractError(`${context}: state required`);
  }
  if (state.schema !== "iris_admin_safety_control_state_public_v1") {
    throw new ContractError(`${context}: invalid state schema`);
  }
  for (const field of Object.keys(state)) {
    if (!ADMIN_SAFETY_CONTROL_STATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected state field ${field}`);
    }
  }
  for (const [key, value] of Object.entries(state)) {
    if (key === "schema" || key === "boundary_policy" || key === "updated_at_ms") continue;
    if (typeof value !== "boolean") {
      throw new ContractError(`${context}: invalid state boolean`);
    }
  }
  if (!Number.isInteger(state.updated_at_ms) || state.updated_at_ms < 0) {
    throw new ContractError(`${context}: invalid state timestamp`);
  }
  assertBoundaryPolicy(
    state.boundary_policy,
    ADMIN_SAFETY_CONTROL_STATE_BOUNDARY_FIELDS,
    `${context} state boundary policy`
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

function assertAuditSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: audit summary required`);
  }
  if (summary.schema !== "iris_admin_safety_controls_audit_summary_v1") {
    throw new ContractError(`${context}: invalid audit summary schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ADMIN_SAFETY_AUDIT_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected audit summary field ${field}`);
    }
  }
  for (const field of ["entry_count", "applied_count", "blocked_count"]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid audit count`);
    }
  }
  if (summary.applied_count + summary.blocked_count !== summary.entry_count) {
    throw new ContractError(`${context}: audit count mismatch`);
  }
  if (summary.last_action_type !== null && !ACTIONS.has(summary.last_action_type)) {
    throw new ContractError(`${context}: invalid last action`);
  }
  if (
    summary.last_result_status !== null &&
    !["applied", "blocked"].includes(summary.last_result_status)
  ) {
    throw new ContractError(`${context}: invalid last result status`);
  }
  if (
    summary.last_actor_role !== null &&
    !["owner", "operator", "moderator", "developer", "read_only"].includes(
      summary.last_actor_role
    )
  ) {
    throw new ContractError(`${context}: invalid last actor role`);
  }
}

function assertAuditEntrySafe(entry, context = "admin safety audit entry") {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: audit entry required`);
  }
  if (entry.schema !== "iris_admin_safety_control_audit_entry_v1") {
    throw new ContractError(`${context}: invalid audit entry schema`);
  }
  for (const field of Object.keys(entry)) {
    if (!ADMIN_SAFETY_AUDIT_ENTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected audit entry field ${field}`);
    }
  }
  if (!ACTIONS.has(entry.action_type)) {
    throw new ContractError(`${context}: invalid action`);
  }
  if (!["owner", "operator", "moderator", "developer", "read_only"].includes(entry.actor_role)) {
    throw new ContractError(`${context}: invalid actor role`);
  }
  if (!["applied", "blocked"].includes(entry.result_status)) {
    throw new ContractError(`${context}: invalid result status`);
  }
  if (entry.payload_stored_in_audit !== false) {
    throw new ContractError(`${context}: payload must not be stored`);
  }
}

function countActivePauses(state) {
  return Object.values(PAUSE_FIELDS).filter((field, index, fields) => {
    return fields.indexOf(field) === index && state[field] === true;
  }).length;
}

function requiresConfirmation(action) {
  return action === "emergency_stop" || action === "resume_safe_local_operation";
}

function targetLabelForAction(action) {
  if (action === "emergency_stop") return "global_safe_stop";
  if (action === "resume_safe_local_operation") return "global_safe_resume";
  return action.replace(/^pause_/, "").replace(/^resume_/, "");
}

function sanitizeAction(action) {
  const normalized = String(action ?? "").trim();
  if (!ACTIONS.has(normalized)) {
    throw new ContractError("admin safety controls: unsupported action");
  }
  return normalized;
}

function sanitizeRole(role) {
  const normalized = String(role ?? "operator").trim();
  if (["owner", "operator", "moderator", "developer", "read_only"].includes(normalized)) {
    return normalized;
  }
  return "operator";
}

function sanitizeModeLabel(value) {
  const normalized = String(value ?? "safe_local")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 80);
  return normalized || "safe_local";
}

function sanitizeRealSurfaceLabels(values) {
  const allowed = new Set([
    "real_tts",
    "real_live2d",
    "real_obs",
    "real_youtube",
    "real_game_input",
  ]);
  const labels = Array.isArray(values) ? values : [];
  return [...new Set(labels.map((value) => sanitizeModeLabel(value)).filter((value) => allowed.has(value)))];
}

function safeTimestamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return Date.now();
  return Math.trunc(number);
}

function assertNoUnsafeText(value, context) {
  const serialized = JSON.stringify(value);
  if (FORBIDDEN_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: unsafe text leaked`);
  }
}
