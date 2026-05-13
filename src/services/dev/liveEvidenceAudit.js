import { ContractError } from "../../core/contracts.js";
import {
  assertFreshEvidenceEnvelopeSafe,
  createFreshEvidenceEnvelope,
} from "./freshEvidenceEnvelope.js";

const AUDIT_FIELDS = new Set([
  "schema",
  "audit_id",
  "audit_timestamp_ms",
  "audit_status",
  "fresh_evidence",
  "owner_confirmation",
  "handoff_plan",
  "go_no_go_result",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_FIELDS = new Set([
  "schema",
  "confirmation_scope",
  "owner_status",
  "owner_role",
  "confirmation_status",
  "confirmation_timestamp_ms",
]);
const OWNER_CONFIRMATION_STATUSES = new Set([
  "required",
  "pending",
  "confirmed",
  "expired",
]);
const OWNER_CONFIRMATION_SCOPES = new Set([
  "tts",
  "live2d",
  "obs",
  "db",
  "game",
  "youtube",
  "live_handoff",
]);

const HANDOFF_PLAN_FIELDS = new Set([
  "schema",
  "plan_status",
  "handoff_owner_role",
  "required_evidence_count",
  "ready_evidence_count",
]);

const LIVE_HANDOFF_PLAN_FIELDS = new Set([
  "schema",
  "component",
  "order",
  "required_evidence",
  "owner_confirmation",
  "blocker",
  "status",
  "real_operation_performed",
  "boundary_policy",
]);

const LIVE_HANDOFF_PLAN_BOUNDARY_FIELDS = new Set([
  "safe_handoff_plan_only",
  "component_order_evidence_owner_blocker_status_only",
  "dry_plan_no_real_operation",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
  "no_obs_commands",
  "no_os_commands",
]);

const LIVE_HANDOFF_SEQUENCE_MANIFEST_FIELDS = new Set([
  "schema",
  "manifest_status",
  "step_count",
  "steps",
  "boundary_policy",
]);

const LIVE_HANDOFF_SEQUENCE_STEP_FIELDS = new Set([
  "schema",
  "component",
  "order",
  "status",
]);

const LIVE_HANDOFF_SEQUENCE_BOUNDARY_FIELDS = new Set([
  "safe_sequence_manifest_only",
  "bridge_engine_overlay_probe_go_no_go_order_required",
  "out_of_order_rejected",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
]);

const LIVE_HANDOFF_SEQUENCE = [
  "bridge",
  "engine",
  "overlay",
  "probe",
  "go_no_go",
];

const LIVE_HANDOFF_SAFE_NEXT_ACTION_FIELDS = new Set([
  "schema",
  "safe_script_name",
  "operator_label",
  "boundary_policy",
]);

const LIVE_HANDOFF_EMERGENCY_STOP_GATE_FIELDS = new Set([
  "schema",
  "gate_status",
  "emergency_stop_freshness",
  "progress_allowed",
  "blocker",
  "boundary_policy",
]);

const LIVE_HANDOFF_AUDIT_READINESS_GATE_FIELDS = new Set([
  "schema",
  "gate_status",
  "audit_status",
  "progress_allowed",
  "blocker",
  "boundary_policy",
]);

const LIVE_HANDOFF_DRY_RUN_RESULT_FIELDS = new Set([
  "schema",
  "dry_run_status",
  "safe_status",
  "real_connection_succeeded",
  "execution_performed",
  "boundary_policy",
]);

const LIVE_HANDOFF_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "owner_missing_fixture",
  "emergency_missing_fixture",
  "audit_missing_fixture",
  "out_of_order_fixture",
  "unsafe_handoff_fixture",
  "boundary_policy",
]);

const LIVE_HANDOFF_FIXTURE_RESULT_FIELDS = new Set([
  "schema",
  "fixture_label",
  "fixture_status",
]);

const LIVE_HANDOFF_SAFE_NEXT_ACTION_BOUNDARY_FIELDS = new Set([
  "safe_script_name_only",
  "operator_label_only",
  "no_shell_body",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
]);

const LIVE_HANDOFF_EMERGENCY_STOP_GATE_BOUNDARY_FIELDS = new Set([
  "safe_emergency_stop_gate_only",
  "fresh_emergency_stop_required_for_progress",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
]);

const LIVE_HANDOFF_AUDIT_READINESS_GATE_BOUNDARY_FIELDS = new Set([
  "safe_audit_readiness_gate_only",
  "audit_ready_required_for_handoff",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
]);

const LIVE_HANDOFF_DRY_RUN_RESULT_BOUNDARY_FIELDS = new Set([
  "safe_dry_run_status_only",
  "real_connection_not_reported",
  "execution_not_performed",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
  "no_obs_commands",
  "no_os_commands",
]);

const LIVE_HANDOFF_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "safe_fixture_status_only",
  "owner_emergency_audit_order_raw_command_covered",
  "no_real_operation",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_commands",
  "no_obs_commands",
  "no_os_commands",
]);

const GO_NO_GO_FIELDS = new Set([
  "schema",
  "decision",
  "result_status",
  "blocker_count",
]);

const OWNER_CONFIRMATION_GO_GATE_FIELDS = new Set([
  "schema",
  "gate_status",
  "confirmation_status",
  "owner_role",
  "production_go",
  "blocker_label",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_AUDIT_EVENT_FIELDS = new Set([
  "schema",
  "actor_role",
  "action",
  "safe_target",
  "result",
  "audit_timestamp_ms",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_NO_AUTO_APPROVE_FIELDS = new Set([
  "schema",
  "gate_status",
  "readiness_pass",
  "fixture_pass",
  "confirmation_status",
  "auto_confirmed",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_PUBLIC_SUMMARY_FIELDS = new Set([
  "schema",
  "confirmation_status",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_EXPIRATION_POLICY_FIELDS = new Set([
  "schema",
  "policy_status",
  "validity_window_ms",
  "expired_returns_to",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "missing_fixture",
  "wrong_role_fixture",
  "expired_fixture",
  "auto_approve_attempt_fixture",
  "note_leak_fixture",
  "boundary_policy",
]);

const OWNER_CONFIRMATION_FIXTURE_RESULT_FIELDS = new Set([
  "schema",
  "fixture_label",
  "fixture_status",
]);

const BOUNDARY_POLICY_FIELDS = new Set([
  "safe_audit_schema_only",
  "no_raw_payloads",
  "no_secret_values",
  "no_token_values",
  "no_endpoint_values",
  "no_raw_commands",
]);

const OWNER_CONFIRMATION_GO_GATE_BOUNDARY_FIELDS = new Set([
  "safe_gate_status_only",
  "pending_confirmation_blocks_production_go",
  "expired_confirmation_blocks_production_go",
  "owner_role_required_for_production_go",
  "no_raw_operator_note",
  "no_private_token",
]);

const OWNER_CONFIRMATION_AUDIT_EVENT_BOUNDARY_FIELDS = new Set([
  "safe_confirmation_audit_event_only",
  "actor_role_action_target_result_timestamp_only",
  "no_raw_operator_note",
  "no_private_token",
  "no_raw_payloads",
]);

const OWNER_CONFIRMATION_NO_AUTO_APPROVE_BOUNDARY_FIELDS = new Set([
  "readiness_pass_does_not_confirm_owner",
  "fixture_pass_does_not_confirm_owner",
  "owner_confirmation_remains_explicit",
  "safe_status_only",
]);

const OWNER_CONFIRMATION_PUBLIC_SUMMARY_BOUNDARY_FIELDS = new Set([
  "confirmation_status_only",
  "no_raw_operator_note",
  "no_private_operator_detail",
  "no_private_token",
]);

const OWNER_CONFIRMATION_EXPIRATION_POLICY_BOUNDARY_FIELDS = new Set([
  "safe_expiration_policy_only",
  "expired_confirmation_returns_to_pending",
  "no_raw_operator_note",
  "no_private_token",
]);

const OWNER_CONFIRMATION_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "safe_fixture_status_only",
  "missing_wrong_role_expired_covered",
  "auto_approve_attempt_rejected",
  "note_leak_rejected",
  "no_raw_operator_note",
  "no_private_token",
]);

const SAFE_LABEL_PATTERN = /^[a-z0-9_.:-]{1,80}$/u;
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw|payload|endpoint|url|token|secret|authorization|credential|password|command)(?:$|_)/iu;
const UNSAFE_VALUE_PATTERN =
  /\b(?:https?:\/\/|endpoint|oauth|token|authorization|bearer|api[_ -]?key|secret|raw[_ -]?payload|payload|raw[_ -]?command|world[_ -]?command|obs[_ -]?command|os[_ -]?command)\b/iu;

export function createLiveEvidenceAuditEntry({
  auditId = "live_evidence_audit",
  auditTimestampMs = Date.now(),
  freshEvidence,
  ownerRole = "owner",
  ownerConfirmed = false,
  handoffOwnerRole = "operator",
  requiredEvidenceCount = 1,
  readyEvidenceCount = 0,
  goDecision = "no_go",
} = {}) {
  const entry = {
    schema: "iris_live_evidence_audit_entry_v1",
    audit_id: safeLabel(auditId),
    audit_timestamp_ms: normalizeTimestampMs(auditTimestampMs),
    audit_status: "recorded",
    fresh_evidence: freshEvidence,
    owner_confirmation: createOwnerConfirmationEnvelope({
      ownerRole,
      confirmationStatus: ownerConfirmed === true ? "confirmed" : "pending",
    }),
    handoff_plan: {
      schema: "iris_live_evidence_handoff_plan_v1",
      plan_status: "recorded",
      handoff_owner_role: safeActorRole(handoffOwnerRole),
      required_evidence_count: normalizeCount(requiredEvidenceCount),
      ready_evidence_count: normalizeCount(readyEvidenceCount),
    },
    go_no_go_result: {
      schema: "iris_live_evidence_go_no_go_result_v1",
      decision: goDecision === "go" ? "go" : "no_go",
      result_status: goDecision === "go" ? "go_recorded" : "blocked",
      blocker_count: goDecision === "go" ? 0 : 1,
    },
    boundary_policy: Object.fromEntries(
      [...BOUNDARY_POLICY_FIELDS].map((field) => [field, true])
    ),
  };
  assertLiveEvidenceAuditEntrySafe(entry);
  return entry;
}

export function createOwnerConfirmationEnvelope({
  confirmationScope = "live_handoff",
  ownerRole = "owner",
  confirmationStatus = "required",
  confirmationTimestampMs = 0,
} = {}) {
  const status = OWNER_CONFIRMATION_STATUSES.has(confirmationStatus)
    ? confirmationStatus
    : "required";
  const envelope = {
    schema: "iris_live_evidence_owner_confirmation_v1",
    confirmation_scope: safeOwnerConfirmationScope(confirmationScope),
    owner_status: status,
    owner_role: safeActorRole(ownerRole),
    confirmation_status: status,
    confirmation_timestamp_ms: normalizeTimestampMs(confirmationTimestampMs),
  };
  assertOwnerConfirmationSafe(envelope);
  return envelope;
}

export function createLiveHandoffPlan({
  component = "bridge",
  order = 1,
  requiredEvidence = "fresh_evidence_required",
  ownerConfirmation,
  blocker = "none",
  status = "BLOCKED",
} = {}) {
  const confirmation =
    ownerConfirmation ??
    createOwnerConfirmationEnvelope({ confirmationStatus: "required" });
  assertOwnerConfirmationSafe(confirmation, "live handoff plan owner confirmation");
  const plan = {
    schema: "iris_live_handoff_plan_v1",
    component: safeLabel(component),
    order: normalizePositiveInteger(order, 1),
    required_evidence: safeLabel(requiredEvidence),
    owner_confirmation: confirmation.confirmation_status,
    blocker: safeLabel(blocker),
    status: safeLiveHandoffStatus(status, confirmation.confirmation_status, blocker),
    real_operation_performed: false,
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_PLAN_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertLiveHandoffPlanSafe(plan);
  return plan;
}

export function createLiveHandoffSequenceManifest({ plans = [] } = {}) {
  const steps = (Array.isArray(plans) ? plans : []).map((plan) => {
    assertLiveHandoffPlanSafe(plan, "live handoff sequence source plan");
    return {
      schema: "iris_live_handoff_sequence_step_v1",
      component: plan.component,
      order: plan.order,
      status: plan.status,
    };
  });
  const manifest = {
    schema: "iris_live_handoff_sequence_manifest_v1",
    manifest_status: isLiveHandoffSequenceValid(steps) ? "valid" : "rejected",
    step_count: steps.length,
    steps,
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_SEQUENCE_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertLiveHandoffSequenceManifestSafe(manifest);
  return manifest;
}

export function createLiveHandoffSafeNextAction({
  safeScriptName = "dev_live_handoff_check",
  operatorLabel = "operator_review_required",
} = {}) {
  const action = {
    schema: "iris_live_handoff_safe_next_action_v1",
    safe_script_name: safeLabel(safeScriptName),
    operator_label: safeLabel(operatorLabel),
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_SAFE_NEXT_ACTION_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertLiveHandoffSafeNextActionSafe(action);
  return action;
}

export function createLiveHandoffEmergencyStopGate({
  emergencyStopEvidence,
} = {}) {
  assertFreshEvidenceEnvelopeSafe(
    emergencyStopEvidence,
    "live handoff emergency stop evidence"
  );
  const fresh = emergencyStopEvidence.freshness === "fresh";
  const gate = {
    schema: "iris_live_handoff_emergency_stop_gate_v1",
    gate_status: fresh ? "ready" : "BLOCKED",
    emergency_stop_freshness: emergencyStopEvidence.freshness,
    progress_allowed: fresh,
    blocker: fresh ? "none" : "emergency_stop_fresh_evidence_required",
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_EMERGENCY_STOP_GATE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertLiveHandoffEmergencyStopGateSafe(gate);
  return gate;
}

export function createLiveHandoffAuditReadinessGate({
  auditStatus = "missing",
} = {}) {
  const safeStatus = safeAuditReadinessStatus(auditStatus);
  const ready = safeStatus === "ready";
  const gate = {
    schema: "iris_live_handoff_audit_readiness_gate_v1",
    gate_status: ready ? "ready" : "BLOCKED",
    audit_status: safeStatus,
    progress_allowed: ready,
    blocker: ready ? "none" : "audit_trail_ready_required",
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_AUDIT_READINESS_GATE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertLiveHandoffAuditReadinessGateSafe(gate);
  return gate;
}

export function createLiveHandoffDryRunResult({
  safeStatus = "blocked",
} = {}) {
  const result = {
    schema: "iris_live_handoff_dry_run_result_v1",
    dry_run_status: "simulated",
    safe_status: safeDryRunStatus(safeStatus),
    real_connection_succeeded: false,
    execution_performed: false,
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_DRY_RUN_RESULT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertLiveHandoffDryRunResultSafe(result);
  return result;
}

export function createLiveHandoffFixturePack({ nowMs = 10_000 } = {}) {
  const ownerMissing = createLiveHandoffPlan({
    component: "bridge",
    order: 1,
    ownerConfirmation: createOwnerConfirmationEnvelope({
      confirmationStatus: "pending",
      confirmationTimestampMs: nowMs,
    }),
    status: "ready",
  });
  const emergencyMissing = createLiveHandoffEmergencyStopGate({
    emergencyStopEvidence: createFreshEvidenceEnvelope({
      component: "emergency_stop",
      status: "BLOCKED",
      evidenceTimestampMs: nowMs - 60_000,
      evidenceSource: "real_probe",
      freshness: "stale",
      nowMs,
    }),
  });
  const auditMissing = createLiveHandoffAuditReadinessGate({
    auditStatus: "missing",
  });
  const orderedPlans = LIVE_HANDOFF_SEQUENCE.map((component, index) =>
    createLiveHandoffPlan({
      component,
      order: index + 1,
      ownerConfirmation: createOwnerConfirmationEnvelope({
        confirmationStatus: "confirmed",
        confirmationTimestampMs: nowMs,
      }),
      status: "ready",
    })
  );
  const outOfOrder = createLiveHandoffSequenceManifest({
    plans: [orderedPlans[1], orderedPlans[0], ...orderedPlans.slice(2)],
  });
  const unsafeHandoffStatus = capturesContractError(() =>
    assertLiveHandoffPlanSafe({
      ...orderedPlans[0],
      raw_command: "start",
    })
  );
  const pack = {
    schema: "iris_live_handoff_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: 5,
    owner_missing_fixture: createLiveHandoffFixtureResult(
      "owner_missing",
      ownerMissing.status
    ),
    emergency_missing_fixture: createLiveHandoffFixtureResult(
      "emergency_missing",
      emergencyMissing.gate_status
    ),
    audit_missing_fixture: createLiveHandoffFixtureResult(
      "audit_missing",
      auditMissing.gate_status
    ),
    out_of_order_fixture: createLiveHandoffFixtureResult(
      "out_of_order",
      outOfOrder.manifest_status
    ),
    unsafe_handoff_fixture: createLiveHandoffFixtureResult(
      "unsafe_handoff",
      unsafeHandoffStatus
    ),
    boundary_policy: Object.fromEntries(
      [...LIVE_HANDOFF_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertLiveHandoffFixturePackSafe(pack);
  return pack;
}

export function createOwnerConfirmationFreshnessGuard({
  ownerConfirmation,
  nowMs = Date.now(),
  freshWindowMs = 300_000,
} = {}) {
  assertOwnerConfirmationSafe(ownerConfirmation, "owner confirmation freshness guard");
  const currentMs = normalizeTimestampMs(nowMs);
  const maxAgeMs = normalizePositiveMs(freshWindowMs, 300_000);
  const ageMs =
    currentMs > 0 && ownerConfirmation.confirmation_timestamp_ms > 0
      ? currentMs - ownerConfirmation.confirmation_timestamp_ms
      : Number.POSITIVE_INFINITY;
  const fresh =
    ownerConfirmation.confirmation_status === "confirmed" &&
    ageMs >= 0 &&
    ageMs <= maxAgeMs;
  return createOwnerConfirmationEnvelope({
    confirmationScope: ownerConfirmation.confirmation_scope,
    ownerRole: ownerConfirmation.owner_role,
    confirmationStatus: fresh ? "confirmed" : "required",
    confirmationTimestampMs: ownerConfirmation.confirmation_timestamp_ms,
  });
}

export function createOwnerConfirmationProductionGoGate({
  ownerConfirmation,
} = {}) {
  assertOwnerConfirmationSafe(ownerConfirmation, "owner confirmation production go gate");
  const blocked =
    ownerConfirmation.owner_role !== "owner" ||
    ["required", "pending", "expired"].includes(
      ownerConfirmation.confirmation_status
    );
  const gate = {
    schema: "iris_owner_confirmation_production_go_gate_v1",
    gate_status: blocked ? "BLOCKED" : "ready",
    confirmation_status: ownerConfirmation.confirmation_status,
    owner_role: ownerConfirmation.owner_role,
    production_go: !blocked,
    blocker_label:
      ownerConfirmation.owner_role !== "owner"
        ? "owner_role_required"
        : blocked
          ? "owner_confirmation_required"
          : "none",
    boundary_policy: Object.fromEntries(
      [...OWNER_CONFIRMATION_GO_GATE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertOwnerConfirmationProductionGoGateSafe(gate);
  return gate;
}

export function createOwnerConfirmationAuditEvent({
  actorRole = "operator",
  action = "owner_confirmation_recorded",
  safeTarget = "live_handoff",
  result = "pending",
  auditTimestampMs = Date.now(),
} = {}) {
  const event = {
    schema: "iris_owner_confirmation_audit_event_v1",
    actor_role: safeActorRole(actorRole),
    action: safeOwnerConfirmationAction(action),
    safe_target: safeLabel(safeTarget),
    result: safeOwnerConfirmationAuditResult(result),
    audit_timestamp_ms: normalizeTimestampMs(auditTimestampMs),
    boundary_policy: Object.fromEntries(
      [...OWNER_CONFIRMATION_AUDIT_EVENT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertOwnerConfirmationAuditEventSafe(event);
  return event;
}

export function createOwnerConfirmationNoAutoApproveGate({
  readinessPass = false,
  fixturePass = false,
  ownerConfirmation,
} = {}) {
  assertOwnerConfirmationSafe(ownerConfirmation, "owner confirmation no auto-approve");
  const gate = {
    schema: "iris_owner_confirmation_no_auto_approve_gate_v1",
    gate_status:
      ownerConfirmation.confirmation_status === "confirmed" ? "confirmed" : "blocked",
    readiness_pass: readinessPass === true,
    fixture_pass: fixturePass === true,
    confirmation_status: ownerConfirmation.confirmation_status,
    auto_confirmed: false,
    boundary_policy: Object.fromEntries(
      [...OWNER_CONFIRMATION_NO_AUTO_APPROVE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertOwnerConfirmationNoAutoApproveGateSafe(gate);
  return gate;
}

export function createOwnerConfirmationPublicSummary({
  ownerConfirmation,
} = {}) {
  assertOwnerConfirmationSafe(ownerConfirmation, "owner confirmation public summary");
  const summary = {
    schema: "iris_owner_confirmation_public_summary_v1",
    confirmation_status: ownerConfirmation.confirmation_status,
    boundary_policy: Object.fromEntries(
      [...OWNER_CONFIRMATION_PUBLIC_SUMMARY_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertOwnerConfirmationPublicSummarySafe(summary);
  return summary;
}

export function createOwnerConfirmationExpirationPolicy({
  validityWindowMs = 300_000,
} = {}) {
  const policy = {
    schema: "iris_owner_confirmation_expiration_policy_v1",
    policy_status: "active",
    validity_window_ms: normalizePositiveMs(validityWindowMs, 300_000),
    expired_returns_to: "pending",
    boundary_policy: Object.fromEntries(
      [...OWNER_CONFIRMATION_EXPIRATION_POLICY_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertOwnerConfirmationExpirationPolicySafe(policy);
  return policy;
}

export function applyOwnerConfirmationExpirationPolicy({
  ownerConfirmation,
  policy = createOwnerConfirmationExpirationPolicy(),
  nowMs = Date.now(),
} = {}) {
  assertOwnerConfirmationSafe(ownerConfirmation, "owner confirmation expiration");
  assertOwnerConfirmationExpirationPolicySafe(policy);
  const currentMs = normalizeTimestampMs(nowMs);
  const expired =
    ownerConfirmation.confirmation_status === "confirmed" &&
    (ownerConfirmation.confirmation_timestamp_ms === 0 ||
      currentMs === 0 ||
      ownerConfirmation.confirmation_timestamp_ms > currentMs ||
      currentMs - ownerConfirmation.confirmation_timestamp_ms >
        policy.validity_window_ms);
  return createOwnerConfirmationEnvelope({
    confirmationScope: ownerConfirmation.confirmation_scope,
    ownerRole: ownerConfirmation.owner_role,
    confirmationStatus: expired
      ? policy.expired_returns_to
      : ownerConfirmation.confirmation_status,
    confirmationTimestampMs: ownerConfirmation.confirmation_timestamp_ms,
  });
}

export function createOwnerConfirmationFixturePack({ nowMs = 10_000 } = {}) {
  const policy = createOwnerConfirmationExpirationPolicy({ validityWindowMs: 500 });
  const missing = createOwnerConfirmationProductionGoGate({
    ownerConfirmation: createOwnerConfirmationEnvelope({
      confirmationStatus: "pending",
      confirmationTimestampMs: nowMs,
    }),
  });
  const wrongRole = createOwnerConfirmationProductionGoGate({
    ownerConfirmation: createOwnerConfirmationEnvelope({
      ownerRole: "operator",
      confirmationStatus: "confirmed",
      confirmationTimestampMs: nowMs,
    }),
  });
  const expired = applyOwnerConfirmationExpirationPolicy({
    ownerConfirmation: createOwnerConfirmationEnvelope({
      ownerRole: "owner",
      confirmationStatus: "confirmed",
      confirmationTimestampMs: nowMs - 1000,
    }),
    policy,
    nowMs,
  });
  const autoApproveAttempt = createOwnerConfirmationNoAutoApproveGate({
    readinessPass: true,
    fixturePass: true,
    ownerConfirmation: createOwnerConfirmationEnvelope({
      confirmationStatus: "pending",
      confirmationTimestampMs: nowMs,
    }),
  });
  const noteLeakStatus = capturesContractError(() =>
    assertOwnerConfirmationPublicSummarySafe({
      ...createOwnerConfirmationPublicSummary({
        ownerConfirmation: createOwnerConfirmationEnvelope({
          confirmationStatus: "confirmed",
          confirmationTimestampMs: nowMs,
        }),
      }),
      raw_operator_note: "note",
    })
  );
  const pack = {
    schema: "iris_owner_confirmation_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: 5,
    missing_fixture: createFixtureResult("missing", missing.gate_status),
    wrong_role_fixture: createFixtureResult("wrong_role", wrongRole.gate_status),
    expired_fixture: createFixtureResult("expired", expired.confirmation_status),
    auto_approve_attempt_fixture: createFixtureResult(
      "auto_approve_attempt",
      autoApproveAttempt.auto_confirmed ? "auto_confirmed" : "blocked"
    ),
    note_leak_fixture: createFixtureResult("note_leak", noteLeakStatus),
    boundary_policy: Object.fromEntries(
      [...OWNER_CONFIRMATION_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertOwnerConfirmationFixturePackSafe(pack);
  return pack;
}

export function assertLiveEvidenceAuditEntrySafe(
  entry,
  context = "live evidence audit entry"
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractError(`${context}: entry required`);
  }
  assertNoUnsafeAuditMaterial(entry, context);
  for (const field of Object.keys(entry)) {
    if (!AUDIT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected audit field`, { field });
    }
  }
  if (
    entry.schema !== "iris_live_evidence_audit_entry_v1" ||
    !SAFE_LABEL_PATTERN.test(entry.audit_id) ||
    !Number.isInteger(entry.audit_timestamp_ms) ||
    entry.audit_timestamp_ms < 0 ||
    entry.audit_status !== "recorded"
  ) {
    throw new ContractError(`${context}: invalid audit entry`);
  }
  assertFreshEvidenceEnvelopeSafe(entry.fresh_evidence, `${context}: fresh evidence`);
  assertOwnerConfirmationSafe(entry.owner_confirmation, context);
  assertHandoffPlanSafe(entry.handoff_plan, context);
  assertGoNoGoResultSafe(entry.go_no_go_result, context);
  assertBoundaryPolicy(entry.boundary_policy, BOUNDARY_POLICY_FIELDS, context);
}

export function assertLiveHandoffPlanSafe(
  plan,
  context = "live handoff plan"
) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: plan required`);
  }
  assertNoUnsafeAuditMaterial(plan, context);
  for (const field of Object.keys(plan)) {
    if (!LIVE_HANDOFF_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected plan field`, { field });
    }
  }
  if (
    plan.schema !== "iris_live_handoff_plan_v1" ||
    !SAFE_LABEL_PATTERN.test(plan.component) ||
    !Number.isInteger(plan.order) ||
    plan.order <= 0 ||
    !SAFE_LABEL_PATTERN.test(plan.required_evidence) ||
    !OWNER_CONFIRMATION_STATUSES.has(plan.owner_confirmation) ||
    !SAFE_LABEL_PATTERN.test(plan.blocker) ||
    !["BLOCKED", "pending", "ready"].includes(plan.status) ||
    plan.real_operation_performed !== false
  ) {
    throw new ContractError(`${context}: invalid plan`);
  }
  if (
    plan.owner_confirmation !== "confirmed" &&
    plan.status !== "BLOCKED"
  ) {
    throw new ContractError(`${context}: owner confirmation blocks handoff`);
  }
  assertBoundaryPolicy(plan.boundary_policy, LIVE_HANDOFF_PLAN_BOUNDARY_FIELDS, context);
}

export function assertLiveHandoffSequenceManifestSafe(
  manifest,
  context = "live handoff sequence manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest required`);
  }
  assertNoUnsafeAuditMaterial(manifest, context);
  for (const field of Object.keys(manifest)) {
    if (!LIVE_HANDOFF_SEQUENCE_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`, { field });
    }
  }
  if (
    manifest.schema !== "iris_live_handoff_sequence_manifest_v1" ||
    !["valid", "rejected"].includes(manifest.manifest_status) ||
    !Array.isArray(manifest.steps) ||
    manifest.step_count !== manifest.steps.length
  ) {
    throw new ContractError(`${context}: invalid manifest`);
  }
  for (const step of manifest.steps) {
    assertLiveHandoffSequenceStepSafe(step, context);
  }
  const valid = isLiveHandoffSequenceValid(manifest.steps);
  if (manifest.manifest_status !== (valid ? "valid" : "rejected")) {
    throw new ContractError(`${context}: sequence status mismatch`);
  }
  assertBoundaryPolicy(
    manifest.boundary_policy,
    LIVE_HANDOFF_SEQUENCE_BOUNDARY_FIELDS,
    context
  );
}

export function assertLiveHandoffSafeNextActionSafe(
  action,
  context = "live handoff safe next action"
) {
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    throw new ContractError(`${context}: action required`);
  }
  assertNoUnsafeAuditMaterial(action, context);
  for (const field of Object.keys(action)) {
    if (!LIVE_HANDOFF_SAFE_NEXT_ACTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected action field`, { field });
    }
  }
  if (
    action.schema !== "iris_live_handoff_safe_next_action_v1" ||
    !SAFE_LABEL_PATTERN.test(action.safe_script_name) ||
    !SAFE_LABEL_PATTERN.test(action.operator_label)
  ) {
    throw new ContractError(`${context}: invalid action`);
  }
  assertBoundaryPolicy(
    action.boundary_policy,
    LIVE_HANDOFF_SAFE_NEXT_ACTION_BOUNDARY_FIELDS,
    context
  );
}

export function assertLiveHandoffEmergencyStopGateSafe(
  gate,
  context = "live handoff emergency stop gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
  for (const field of Object.keys(gate)) {
    if (!LIVE_HANDOFF_EMERGENCY_STOP_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`, { field });
    }
  }
  if (
    gate.schema !== "iris_live_handoff_emergency_stop_gate_v1" ||
    !["ready", "BLOCKED"].includes(gate.gate_status) ||
    !["fresh", "stale", "runtime_waiting", "attention"].includes(
      gate.emergency_stop_freshness
    ) ||
    typeof gate.progress_allowed !== "boolean" ||
    !["none", "emergency_stop_fresh_evidence_required"].includes(gate.blocker)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const fresh = gate.emergency_stop_freshness === "fresh";
  if (
    gate.progress_allowed !== fresh ||
    gate.gate_status !== (fresh ? "ready" : "BLOCKED") ||
    gate.blocker !== (fresh ? "none" : "emergency_stop_fresh_evidence_required")
  ) {
    throw new ContractError(`${context}: emergency stop gate mismatch`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    LIVE_HANDOFF_EMERGENCY_STOP_GATE_BOUNDARY_FIELDS,
    context
  );
}

export function assertLiveHandoffAuditReadinessGateSafe(
  gate,
  context = "live handoff audit readiness gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
  for (const field of Object.keys(gate)) {
    if (!LIVE_HANDOFF_AUDIT_READINESS_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`, { field });
    }
  }
  if (
    gate.schema !== "iris_live_handoff_audit_readiness_gate_v1" ||
    !["ready", "BLOCKED"].includes(gate.gate_status) ||
    !["ready", "missing", "attention"].includes(gate.audit_status) ||
    typeof gate.progress_allowed !== "boolean" ||
    !["none", "audit_trail_ready_required"].includes(gate.blocker)
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const ready = gate.audit_status === "ready";
  if (
    gate.progress_allowed !== ready ||
    gate.gate_status !== (ready ? "ready" : "BLOCKED") ||
    gate.blocker !== (ready ? "none" : "audit_trail_ready_required")
  ) {
    throw new ContractError(`${context}: audit readiness gate mismatch`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    LIVE_HANDOFF_AUDIT_READINESS_GATE_BOUNDARY_FIELDS,
    context
  );
}

export function assertLiveHandoffDryRunResultSafe(
  result,
  context = "live handoff dry-run result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result required`);
  }
  assertNoUnsafeAuditMaterial(result, context);
  for (const field of Object.keys(result)) {
    if (!LIVE_HANDOFF_DRY_RUN_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected result field`, { field });
    }
  }
  if (
    result.schema !== "iris_live_handoff_dry_run_result_v1" ||
    result.dry_run_status !== "simulated" ||
    !["blocked", "attention", "ready"].includes(result.safe_status) ||
    result.real_connection_succeeded !== false ||
    result.execution_performed !== false
  ) {
    throw new ContractError(`${context}: invalid result`);
  }
  assertBoundaryPolicy(
    result.boundary_policy,
    LIVE_HANDOFF_DRY_RUN_RESULT_BOUNDARY_FIELDS,
    context
  );
}

export function assertLiveHandoffFixturePackSafe(
  pack,
  context = "live handoff fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoUnsafeAuditMaterial(pack, context);
  for (const field of Object.keys(pack)) {
    if (!LIVE_HANDOFF_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`, { field });
    }
  }
  if (
    pack.schema !== "iris_live_handoff_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 5
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const expected = {
    owner_missing_fixture: ["owner_missing", "blocked"],
    emergency_missing_fixture: ["emergency_missing", "blocked"],
    audit_missing_fixture: ["audit_missing", "blocked"],
    out_of_order_fixture: ["out_of_order", "rejected"],
    unsafe_handoff_fixture: ["unsafe_handoff", "contracterror"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    assertLiveHandoffFixtureResultSafe(pack[field], context);
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    LIVE_HANDOFF_FIXTURE_PACK_BOUNDARY_FIELDS,
    context
  );
}

export function assertOwnerConfirmationProductionGoGateSafe(
  gate,
  context = "owner confirmation production go gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
  for (const field of Object.keys(gate)) {
    if (!OWNER_CONFIRMATION_GO_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`, { field });
    }
  }
  if (
    gate.schema !== "iris_owner_confirmation_production_go_gate_v1" ||
    !["BLOCKED", "ready"].includes(gate.gate_status) ||
    !OWNER_CONFIRMATION_STATUSES.has(gate.confirmation_status) ||
    !["owner", "admin", "operator"].includes(gate.owner_role) ||
    typeof gate.production_go !== "boolean" ||
    !["owner_confirmation_required", "owner_role_required", "none"].includes(
      gate.blocker_label
    )
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  const blocked =
    gate.owner_role !== "owner" ||
    ["required", "pending", "expired"].includes(gate.confirmation_status);
  const expectedBlocker =
    gate.owner_role !== "owner"
      ? "owner_role_required"
      : blocked
        ? "owner_confirmation_required"
        : "none";
  if (
    gate.production_go !== !blocked ||
    gate.gate_status !== (blocked ? "BLOCKED" : "ready") ||
    gate.blocker_label !== expectedBlocker
  ) {
    throw new ContractError(`${context}: confirmation gate mismatch`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    OWNER_CONFIRMATION_GO_GATE_BOUNDARY_FIELDS,
    context
  );
}

export function assertOwnerConfirmationAuditEventSafe(
  event,
  context = "owner confirmation audit event"
) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new ContractError(`${context}: event required`);
  }
  assertNoUnsafeAuditMaterial(event, context);
  for (const field of Object.keys(event)) {
    if (!OWNER_CONFIRMATION_AUDIT_EVENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected event field`, { field });
    }
  }
  if (
    event.schema !== "iris_owner_confirmation_audit_event_v1" ||
    !["owner", "admin", "operator"].includes(event.actor_role) ||
    !["owner_confirmation_recorded", "owner_confirmation_rejected"].includes(
      event.action
    ) ||
    !SAFE_LABEL_PATTERN.test(event.safe_target) ||
    !["confirmed", "pending", "expired", "rejected"].includes(event.result) ||
    !Number.isInteger(event.audit_timestamp_ms) ||
    event.audit_timestamp_ms < 0
  ) {
    throw new ContractError(`${context}: invalid event`);
  }
  assertBoundaryPolicy(
    event.boundary_policy,
    OWNER_CONFIRMATION_AUDIT_EVENT_BOUNDARY_FIELDS,
    context
  );
}

export function assertOwnerConfirmationNoAutoApproveGateSafe(
  gate,
  context = "owner confirmation no auto-approve gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  assertNoUnsafeAuditMaterial(gate, context);
  for (const field of Object.keys(gate)) {
    if (!OWNER_CONFIRMATION_NO_AUTO_APPROVE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected gate field`, { field });
    }
  }
  if (
    gate.schema !== "iris_owner_confirmation_no_auto_approve_gate_v1" ||
    !["blocked", "confirmed"].includes(gate.gate_status) ||
    typeof gate.readiness_pass !== "boolean" ||
    typeof gate.fixture_pass !== "boolean" ||
    !OWNER_CONFIRMATION_STATUSES.has(gate.confirmation_status) ||
    gate.auto_confirmed !== false
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  if (
    gate.gate_status !==
    (gate.confirmation_status === "confirmed" ? "confirmed" : "blocked")
  ) {
    throw new ContractError(`${context}: auto approve mismatch`);
  }
  assertBoundaryPolicy(
    gate.boundary_policy,
    OWNER_CONFIRMATION_NO_AUTO_APPROVE_BOUNDARY_FIELDS,
    context
  );
}

export function assertOwnerConfirmationPublicSummarySafe(
  summary,
  context = "owner confirmation public summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeAuditMaterial(summary, context);
  for (const field of Object.keys(summary)) {
    if (!OWNER_CONFIRMATION_PUBLIC_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (
    summary.schema !== "iris_owner_confirmation_public_summary_v1" ||
    !OWNER_CONFIRMATION_STATUSES.has(summary.confirmation_status)
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    OWNER_CONFIRMATION_PUBLIC_SUMMARY_BOUNDARY_FIELDS,
    context
  );
}

export function assertOwnerConfirmationExpirationPolicySafe(
  policy,
  context = "owner confirmation expiration policy"
) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: policy required`);
  }
  assertNoUnsafeAuditMaterial(policy, context);
  for (const field of Object.keys(policy)) {
    if (!OWNER_CONFIRMATION_EXPIRATION_POLICY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected policy field`, { field });
    }
  }
  if (
    policy.schema !== "iris_owner_confirmation_expiration_policy_v1" ||
    policy.policy_status !== "active" ||
    !Number.isInteger(policy.validity_window_ms) ||
    policy.validity_window_ms <= 0 ||
    policy.expired_returns_to !== "pending"
  ) {
    throw new ContractError(`${context}: invalid policy`);
  }
  assertBoundaryPolicy(
    policy.boundary_policy,
    OWNER_CONFIRMATION_EXPIRATION_POLICY_BOUNDARY_FIELDS,
    context
  );
}

export function assertOwnerConfirmationFixturePackSafe(
  pack,
  context = "owner confirmation fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoUnsafeAuditMaterial(pack, context);
  for (const field of Object.keys(pack)) {
    if (!OWNER_CONFIRMATION_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`, { field });
    }
  }
  if (
    pack.schema !== "iris_owner_confirmation_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 5
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const expected = {
    missing_fixture: ["missing", "blocked"],
    wrong_role_fixture: ["wrong_role", "blocked"],
    expired_fixture: ["expired", "pending"],
    auto_approve_attempt_fixture: ["auto_approve_attempt", "blocked"],
    note_leak_fixture: ["note_leak", "contracterror"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    assertOwnerConfirmationFixtureResultSafe(pack[field], context);
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
  assertBoundaryPolicy(
    pack.boundary_policy,
    OWNER_CONFIRMATION_FIXTURE_PACK_BOUNDARY_FIELDS,
    context
  );
}

function assertOwnerConfirmationSafe(ownerConfirmation, context) {
  if (
    !ownerConfirmation ||
    typeof ownerConfirmation !== "object" ||
    Array.isArray(ownerConfirmation)
  ) {
    throw new ContractError(`${context}: owner confirmation required`);
  }
  for (const field of Object.keys(ownerConfirmation)) {
    if (!OWNER_CONFIRMATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected owner confirmation field`, { field });
    }
  }
  if (
    ownerConfirmation.schema !== "iris_live_evidence_owner_confirmation_v1" ||
    !OWNER_CONFIRMATION_SCOPES.has(ownerConfirmation.confirmation_scope) ||
    !OWNER_CONFIRMATION_STATUSES.has(ownerConfirmation.owner_status) ||
    !["owner", "admin", "operator"].includes(ownerConfirmation.owner_role) ||
    !OWNER_CONFIRMATION_STATUSES.has(ownerConfirmation.confirmation_status) ||
    ownerConfirmation.owner_status !== ownerConfirmation.confirmation_status ||
    !Number.isInteger(ownerConfirmation.confirmation_timestamp_ms) ||
    ownerConfirmation.confirmation_timestamp_ms < 0
  ) {
    throw new ContractError(`${context}: invalid owner confirmation`);
  }
}

function assertHandoffPlanSafe(handoffPlan, context) {
  if (!handoffPlan || typeof handoffPlan !== "object" || Array.isArray(handoffPlan)) {
    throw new ContractError(`${context}: handoff plan required`);
  }
  for (const field of Object.keys(handoffPlan)) {
    if (!HANDOFF_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected handoff plan field`, { field });
    }
  }
  if (
    handoffPlan.schema !== "iris_live_evidence_handoff_plan_v1" ||
    handoffPlan.plan_status !== "recorded" ||
    !["owner", "admin", "operator"].includes(handoffPlan.handoff_owner_role) ||
    !Number.isInteger(handoffPlan.required_evidence_count) ||
    !Number.isInteger(handoffPlan.ready_evidence_count) ||
    handoffPlan.required_evidence_count < 0 ||
    handoffPlan.ready_evidence_count < 0 ||
    handoffPlan.ready_evidence_count > handoffPlan.required_evidence_count
  ) {
    throw new ContractError(`${context}: invalid handoff plan`);
  }
}

function assertGoNoGoResultSafe(goNoGoResult, context) {
  if (!goNoGoResult || typeof goNoGoResult !== "object" || Array.isArray(goNoGoResult)) {
    throw new ContractError(`${context}: go/no-go result required`);
  }
  for (const field of Object.keys(goNoGoResult)) {
    if (!GO_NO_GO_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected go/no-go field`, { field });
    }
  }
  if (
    goNoGoResult.schema !== "iris_live_evidence_go_no_go_result_v1" ||
    !["go", "no_go"].includes(goNoGoResult.decision) ||
    !["go_recorded", "blocked"].includes(goNoGoResult.result_status) ||
    !Number.isInteger(goNoGoResult.blocker_count) ||
    goNoGoResult.blocker_count < 0
  ) {
    throw new ContractError(`${context}: invalid go/no-go result`);
  }
  if (
    (goNoGoResult.decision === "go" && goNoGoResult.result_status !== "go_recorded") ||
    (goNoGoResult.decision === "no_go" && goNoGoResult.result_status !== "blocked")
  ) {
    throw new ContractError(`${context}: go/no-go mismatch`);
  }
}

function assertOwnerConfirmationFixtureResultSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: fixture result required`);
  }
  for (const field of Object.keys(item)) {
    if (!OWNER_CONFIRMATION_FIXTURE_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture result field`, {
        field,
      });
    }
  }
  if (
    item.schema !== "iris_owner_confirmation_fixture_result_v1" ||
    !SAFE_LABEL_PATTERN.test(item.fixture_label) ||
    !SAFE_LABEL_PATTERN.test(item.fixture_status)
  ) {
    throw new ContractError(`${context}: invalid fixture result`);
  }
}

function assertLiveHandoffSequenceStepSafe(step, context) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: sequence step required`);
  }
  for (const field of Object.keys(step)) {
    if (!LIVE_HANDOFF_SEQUENCE_STEP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected sequence step field`, {
        field,
      });
    }
  }
  if (
    step.schema !== "iris_live_handoff_sequence_step_v1" ||
    !LIVE_HANDOFF_SEQUENCE.includes(step.component) ||
    !Number.isInteger(step.order) ||
    step.order <= 0 ||
    !["BLOCKED", "pending", "ready"].includes(step.status)
  ) {
    throw new ContractError(`${context}: invalid sequence step`);
  }
}

function isLiveHandoffSequenceValid(steps) {
  if (steps.length !== LIVE_HANDOFF_SEQUENCE.length) return false;
  return steps.every(
    (step, index) =>
      step.component === LIVE_HANDOFF_SEQUENCE[index] && step.order === index + 1
  );
}

function createFixtureResult(fixtureLabel, fixtureStatus) {
  return {
    schema: "iris_owner_confirmation_fixture_result_v1",
    fixture_label: safeLabel(fixtureLabel),
    fixture_status: safeLabel(fixtureStatus),
  };
}

function createLiveHandoffFixtureResult(fixtureLabel, fixtureStatus) {
  return {
    schema: "iris_live_handoff_fixture_result_v1",
    fixture_label: safeLabel(fixtureLabel),
    fixture_status: safeLabel(fixtureStatus),
  };
}

function assertLiveHandoffFixtureResultSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: fixture result required`);
  }
  for (const field of Object.keys(item)) {
    if (!LIVE_HANDOFF_FIXTURE_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture result field`, {
        field,
      });
    }
  }
  if (
    item.schema !== "iris_live_handoff_fixture_result_v1" ||
    !SAFE_LABEL_PATTERN.test(item.fixture_label) ||
    !SAFE_LABEL_PATTERN.test(item.fixture_status)
  ) {
    throw new ContractError(`${context}: invalid fixture result`);
  }
}

function capturesContractError(fn) {
  try {
    fn();
    return "not_rejected";
  } catch (error) {
    if (error instanceof ContractError) return "ContractError";
    throw error;
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!requiredFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`, { field });
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function assertNoUnsafeAuditMaterial(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeAuditMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (path !== "root.boundary_policy" && UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unsafe audit field`, { field, path });
    }
    if (typeof child === "string" && UNSAFE_VALUE_PATTERN.test(child)) {
      throw new ContractError(`${context}: unsafe audit value`, { field, path });
    }
    assertNoUnsafeAuditMaterial(child, context, `${path}.${field}`);
  }
}

function safeActorRole(value) {
  const role = safeLabel(value);
  return ["owner", "admin", "operator"].includes(role) ? role : "operator";
}

function safeOwnerConfirmationScope(value) {
  const scope = safeLabel(value);
  return OWNER_CONFIRMATION_SCOPES.has(scope) ? scope : "live_handoff";
}

function safeOwnerConfirmationAction(value) {
  const action = safeLabel(value);
  return ["owner_confirmation_recorded", "owner_confirmation_rejected"].includes(
    action
  )
    ? action
    : "owner_confirmation_recorded";
}

function safeOwnerConfirmationAuditResult(value) {
  const result = safeLabel(value);
  return ["confirmed", "pending", "expired", "rejected"].includes(result)
    ? result
    : "pending";
}

function safeAuditReadinessStatus(value) {
  const status = safeLabel(value);
  return ["ready", "missing", "attention"].includes(status) ? status : "missing";
}

function safeDryRunStatus(value) {
  const status = safeLabel(value);
  return ["blocked", "attention", "ready"].includes(status) ? status : "blocked";
}

function safeLabel(value) {
  return (
    String(value ?? "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9_.:-]+/gu, "_")
      .replace(/^_+|_+$/gu, "")
      .slice(0, 80) || "unknown"
  );
}

function normalizeTimestampMs(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function normalizeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.trunc(number);
}

function normalizePositiveMs(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.trunc(number);
}

function safeLiveHandoffStatus(status, confirmationStatus, blocker) {
  if (confirmationStatus !== "confirmed" || safeLabel(blocker) !== "none") {
    return "BLOCKED";
  }
  const safeStatus = safeLabel(status);
  return ["pending", "ready"].includes(safeStatus) ? safeStatus : "pending";
}
