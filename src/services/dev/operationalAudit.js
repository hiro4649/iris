import { ContractError } from "../../core/contracts.js";

const OPERATIONAL_AUDIT_EVENT_SCHEMA = "iris_operational_audit_event_v1";
const OPERATIONAL_AUDIT_EVENT_FIELDS = new Set([
  "schema",
  "event_id",
  "trace_id",
  "component",
  "actor_role",
  "operation_type",
  "operation_effect",
  "confirmation_required",
  "status",
  "safe_target",
  "safe_summary",
  "occurred_at_ms",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATIONAL_AUDIT_SAFE_DIFF_SUMMARY_FIELDS = new Set([
  "schema",
  "file_count",
  "files",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATIONAL_AUDIT_REVIEW_PACK_FIELDS = new Set([
  "schema",
  "event_count",
  "component_counts",
  "status_counts",
  "operation_type_counts",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATIONAL_AUDIT_E2E_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "missing_actor_fixture",
  "no_confirmation_fixture",
  "secret_leak_fixture",
  "raw_command_fixture",
  "diff_body_fixture",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATIONAL_AUDIT_REJECTED_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_label",
  "rejected",
  "safe_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const OPERATIONAL_AUDIT_SAFE_DIFF_FILE_FIELDS = new Set([
  "file_label",
  "status",
]);
const OPERATIONAL_AUDIT_COMPONENTS = new Set([
  "production",
  "preflight",
  "adapter",
  "db",
  "obs",
  "game",
  "youtube",
]);
const OPERATIONAL_AUDIT_ACTOR_ROLES = new Set([
  "owner",
  "operator",
  "developer",
  "moderator",
  "read_only",
]);
const OPERATIONAL_AUDIT_OPERATION_TYPES = new Set([
  "preflight_check",
  "readiness_update",
  "adapter_handshake",
  "db_preflight",
  "obs_pickup_check",
  "game_control_preflight",
  "youtube_ingest_preflight",
  "live_side_effect",
  "destructive_operation",
  "real_adapter_operation",
]);
const OPERATIONAL_AUDIT_OPERATION_EFFECTS = new Set([
  "read_only",
  "live_side_effect",
  "destructive",
  "real_adapter",
]);
const CONFIRMATION_REQUIRED_EFFECTS = new Set([
  "live_side_effect",
  "destructive",
  "real_adapter",
]);
const OPERATIONAL_AUDIT_STATUSES = new Set([
  "recorded",
  "ready",
  "attention",
  "BLOCKED",
  "rejected",
]);
const OPERATIONAL_AUDIT_DIFF_STATUSES = new Set([
  "added",
  "modified",
  "deleted",
  "renamed",
  "unchanged",
]);
const OPERATIONAL_AUDIT_BOUNDARY_FIELDS = new Set([
  "safe_schema_unified",
  "raw_payload_redacted",
  "secret_redacted",
  "command_redacted",
  "candidate_redacted",
  "safe_summary_only",
]);
const OPERATIONAL_AUDIT_SAFE_DIFF_BOUNDARY_FIELDS = new Set([
  "safe_file_status_count_only",
  "raw_diff_body_redacted",
  "secret_redacted",
  "command_redacted",
]);
const OPERATIONAL_AUDIT_REVIEW_PACK_BOUNDARY_FIELDS = new Set([
  "safe_labels_counts_only",
  "raw_logs_redacted",
  "raw_payload_redacted",
  "secret_redacted",
  "command_redacted",
]);
const OPERATIONAL_AUDIT_E2E_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "missing_actor_rejected",
  "no_confirmation_rejected",
  "secret_leak_rejected",
  "raw_command_rejected",
  "diff_body_rejected",
  "safe_status_only",
]);
const OPERATIONAL_AUDIT_REJECTED_FIXTURE_BOUNDARY_FIELDS = new Set([
  "unsafe_input_rejected",
  "raw_material_redacted",
  "safe_status_only",
]);
const OPERATIONAL_AUDIT_WRITE_FORBIDDEN_FIELDS = new Set([
  "secret",
  "token",
  "api_key",
  "apiKey",
  "credential",
  "password",
  "raw_command",
  "rawCommand",
  "command",
  "raw_candidate",
  "rawCandidate",
  "candidate",
  "raw_viewer_text",
  "rawViewerText",
  "viewer_text",
  "viewerText",
]);
const UNSAFE_OPERATIONAL_AUDIT_TEXT =
  /\b(raw[_-]?payload|raw[_-]?diff|diff[_-]?body|secret|token|credential|password|command|raw[_-]?command|candidate|raw[_-]?candidate|raw[_-]?viewer[_-]?text|endpoint)\s*[:=]|https?:\/\/|postgres:\/\//i;

export function createOperationalAuditEvent({
  eventId,
  traceId,
  component,
  actorRole,
  operationType,
  operationEffect,
  confirmationRequired,
  status = "recorded",
  safeTarget = "operation",
  safeSummary = "safe_summary",
  occurredAtMs = 0,
} = {}) {
  const event = {
    schema: OPERATIONAL_AUDIT_EVENT_SCHEMA,
    event_id: safeAuditId(eventId, "audit_event"),
    trace_id: safeAuditId(traceId, "trace"),
    component: safeAuditComponent(component),
    actor_role: safeAuditActorRole(actorRole),
    operation_type: safeAuditOperationType(operationType),
    operation_effect: safeAuditOperationEffect(operationEffect, operationType),
    confirmation_required: safeAuditConfirmationRequired(
      confirmationRequired,
      operationEffect,
      operationType
    ),
    status: safeAuditStatus(status),
    safe_target: safeAuditLabel(safeTarget, "operation"),
    safe_summary: safeAuditLabel(safeSummary, "safe_summary"),
    occurred_at_ms: safeAuditTimestamp(occurredAtMs),
    boundary_policy: Object.fromEntries(
      [...OPERATIONAL_AUDIT_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
    adapter_validation_required: true,
  };
  assertOperationalAuditEventSafe(event);
  return event;
}

export function assertOperationalAuditEventSafe(
  event,
  context = "operational audit event"
) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new ContractError(`${context}: audit event required`);
  }
  if (event.schema !== OPERATIONAL_AUDIT_EVENT_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(event)) {
    if (!OPERATIONAL_AUDIT_EVENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected audit field`);
    }
  }
  if (
    !event.event_id ||
    !event.trace_id ||
    !OPERATIONAL_AUDIT_COMPONENTS.has(event.component) ||
    !OPERATIONAL_AUDIT_ACTOR_ROLES.has(event.actor_role) ||
    !OPERATIONAL_AUDIT_OPERATION_TYPES.has(event.operation_type) ||
    !OPERATIONAL_AUDIT_OPERATION_EFFECTS.has(event.operation_effect) ||
    typeof event.confirmation_required !== "boolean" ||
    !OPERATIONAL_AUDIT_STATUSES.has(event.status) ||
    !isSafeAuditLabel(event.safe_target) ||
    !isSafeAuditLabel(event.safe_summary) ||
    !Number.isInteger(event.occurred_at_ms) ||
    event.occurred_at_ms < 0 ||
    event.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid audit event`);
  }
  if (
    CONFIRMATION_REQUIRED_EFFECTS.has(event.operation_effect) &&
    event.confirmation_required !== true
  ) {
    throw new ContractError(`${context}: confirmation required`);
  }
  assertOperationalAuditBoundaryPolicy(event.boundary_policy, context);
  assertNoUnsafeOperationalAuditText(event, context);
}

export function assertOperationalAuditWritePayloadSafe(
  payload,
  context = "operational audit write payload"
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ContractError(`${context}: write payload required`);
  }
  assertNoForbiddenAuditWriteField(payload, context, new WeakSet());
  assertNoUnsafeOperationalAuditText(payload, context);
}

export function createOperationalAuditSafeDiffSummary({ files = [] } = {}) {
  const safeFiles = (Array.isArray(files) ? files : []).map((file) => ({
    file_label: safeAuditFileLabel(file?.fileLabel ?? file?.path ?? file?.file),
    status: safeAuditDiffStatus(file?.status),
  }));
  const summary = {
    schema: "iris_operational_audit_safe_diff_summary_v1",
    file_count: safeFiles.length,
    files: safeFiles,
    boundary_policy: Object.fromEntries(
      [...OPERATIONAL_AUDIT_SAFE_DIFF_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertOperationalAuditSafeDiffSummarySafe(summary);
  return summary;
}

export function assertOperationalAuditSafeDiffSummarySafe(
  summary,
  context = "operational audit safe diff summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: diff summary required`);
  }
  if (summary.schema !== "iris_operational_audit_safe_diff_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!OPERATIONAL_AUDIT_SAFE_DIFF_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected diff summary field`);
    }
  }
  if (!Array.isArray(summary.files) || summary.file_count !== summary.files.length) {
    throw new ContractError(`${context}: invalid file count`);
  }
  for (const file of summary.files) {
    if (!file || typeof file !== "object" || Array.isArray(file)) {
      throw new ContractError(`${context}: file summary required`);
    }
    for (const field of Object.keys(file)) {
      if (!OPERATIONAL_AUDIT_SAFE_DIFF_FILE_FIELDS.has(field)) {
        throw new ContractError(`${context}: unexpected file summary field`);
      }
    }
    if (!isSafeAuditFileLabel(file.file_label) || !OPERATIONAL_AUDIT_DIFF_STATUSES.has(file.status)) {
      throw new ContractError(`${context}: invalid file summary`);
    }
  }
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
  assertOperationalAuditSafeDiffBoundaryPolicy(summary.boundary_policy, context);
  assertNoUnsafeOperationalAuditText(summary, context);
}

export function createOperationalAuditReviewPack({ events = [] } = {}) {
  const safeEvents = Array.isArray(events) ? events : [];
  for (const event of safeEvents) {
    assertOperationalAuditEventSafe(event, "operational audit review pack event");
  }
  const pack = {
    schema: "iris_operational_audit_review_pack_v1",
    event_count: safeEvents.length,
    component_counts: countAuditLabels(safeEvents, "component"),
    status_counts: countAuditLabels(safeEvents, "status"),
    operation_type_counts: countAuditLabels(safeEvents, "operation_type"),
    boundary_policy: Object.fromEntries(
      [...OPERATIONAL_AUDIT_REVIEW_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertOperationalAuditReviewPackSafe(pack);
  return pack;
}

export function assertOperationalAuditReviewPackSafe(
  pack,
  context = "operational audit review pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: review pack required`);
  }
  if (pack.schema !== "iris_operational_audit_review_pack_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(pack)) {
    if (!OPERATIONAL_AUDIT_REVIEW_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected review pack field`);
    }
  }
  if (!Number.isInteger(pack.event_count) || pack.event_count < 0) {
    throw new ContractError(`${context}: invalid event count`);
  }
  assertSafeAuditCountMap(pack.component_counts, OPERATIONAL_AUDIT_COMPONENTS, context);
  assertSafeAuditCountMap(pack.status_counts, OPERATIONAL_AUDIT_STATUSES, context);
  assertSafeAuditCountMap(
    pack.operation_type_counts,
    OPERATIONAL_AUDIT_OPERATION_TYPES,
    context
  );
  const counted =
    Object.values(pack.component_counts).reduce((sum, count) => sum + count, 0);
  if (counted !== pack.event_count || pack.adapter_validation_required !== true) {
    throw new ContractError(`${context}: invalid review count`);
  }
  assertOperationalAuditReviewPackBoundaryPolicy(pack.boundary_policy, context);
  assertNoUnsafeOperationalAuditText(pack, context);
}

export function createOperationalAuditE2EFixturePack() {
  const pack = {
    schema: "iris_operational_audit_e2e_fixture_pack_v1",
    missing_actor_fixture: createOperationalAuditRejectedFixture("missing_actor"),
    no_confirmation_fixture: createOperationalAuditRejectedFixture(
      "no_confirmation"
    ),
    secret_leak_fixture: createOperationalAuditRejectedFixture("secret_leak"),
    raw_command_fixture: createOperationalAuditRejectedFixture("raw_command"),
    diff_body_fixture: createOperationalAuditRejectedFixture("diff_body"),
    boundary_policy: Object.fromEntries(
      [...OPERATIONAL_AUDIT_E2E_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertOperationalAuditE2EFixturePackSafe(pack);
  return pack;
}

export function assertOperationalAuditE2EFixturePackSafe(
  pack,
  context = "operational audit E2E fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: fixture pack required`);
  }
  if (pack.schema !== "iris_operational_audit_e2e_fixture_pack_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(pack)) {
    if (!OPERATIONAL_AUDIT_E2E_FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture pack field`);
    }
  }
  for (const [field, label] of [
    ["missing_actor_fixture", "missing_actor"],
    ["no_confirmation_fixture", "no_confirmation"],
    ["secret_leak_fixture", "secret_leak"],
    ["raw_command_fixture", "raw_command"],
    ["diff_body_fixture", "diff_body"],
  ]) {
    assertOperationalAuditRejectedFixtureSafe(pack[field], `${context}: ${field}`);
    if (pack[field].fixture_label !== label || pack[field].rejected !== true) {
      throw new ContractError(`${context}: fixture mismatch`);
    }
  }
  if (pack.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
  assertOperationalAuditE2EFixturePackBoundaryPolicy(
    pack.boundary_policy,
    context
  );
  assertNoUnsafeOperationalAuditText(pack, context);
}

function assertOperationalAuditBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!OPERATIONAL_AUDIT_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of OPERATIONAL_AUDIT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertOperationalAuditSafeDiffBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!OPERATIONAL_AUDIT_SAFE_DIFF_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of OPERATIONAL_AUDIT_SAFE_DIFF_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertOperationalAuditReviewPackBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!OPERATIONAL_AUDIT_REVIEW_PACK_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of OPERATIONAL_AUDIT_REVIEW_PACK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertOperationalAuditE2EFixturePackBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!OPERATIONAL_AUDIT_E2E_FIXTURE_PACK_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of OPERATIONAL_AUDIT_E2E_FIXTURE_PACK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertOperationalAuditRejectedFixtureBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!OPERATIONAL_AUDIT_REJECTED_FIXTURE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of OPERATIONAL_AUDIT_REJECTED_FIXTURE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function safeAuditComponent(component) {
  const value = String(component ?? "").trim().toLowerCase();
  return OPERATIONAL_AUDIT_COMPONENTS.has(value) ? value : "production";
}

function safeAuditActorRole(role) {
  const value = String(role ?? "").trim().toLowerCase();
  return OPERATIONAL_AUDIT_ACTOR_ROLES.has(value) ? value : "";
}

function safeAuditOperationType(operationType) {
  const value = String(operationType ?? "").trim().toLowerCase();
  return OPERATIONAL_AUDIT_OPERATION_TYPES.has(value)
    ? value
    : "preflight_check";
}

function safeAuditOperationEffect(operationEffect, operationType) {
  const value = String(operationEffect ?? "").trim().toLowerCase();
  if (OPERATIONAL_AUDIT_OPERATION_EFFECTS.has(value)) return value;
  const type = String(operationType ?? "").trim().toLowerCase();
  if (type === "live_side_effect") return "live_side_effect";
  if (type === "destructive_operation") return "destructive";
  if (type === "real_adapter_operation") return "real_adapter";
  return "read_only";
}

function safeAuditConfirmationRequired(
  confirmationRequired,
  operationEffect,
  operationType
) {
  if (typeof confirmationRequired === "boolean") return confirmationRequired;
  return CONFIRMATION_REQUIRED_EFFECTS.has(
    safeAuditOperationEffect(operationEffect, operationType)
  );
}

function safeAuditStatus(status) {
  const value = String(status ?? "").trim();
  return OPERATIONAL_AUDIT_STATUSES.has(value) ? value : "recorded";
}

function safeAuditDiffStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return OPERATIONAL_AUDIT_DIFF_STATUSES.has(value) ? value : "modified";
}

function safeAuditId(value, fallback) {
  const label = String(value ?? "").trim();
  return isSafeAuditLabel(label) ? label : fallback;
}

function safeAuditLabel(value, fallback) {
  const label = String(value ?? "").trim();
  return isSafeAuditLabel(label) ? label : fallback;
}

function safeAuditTimestamp(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function safeAuditFileLabel(value) {
  const label = String(value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .slice(-3)
    .join("/");
  return isSafeAuditFileLabel(label) ? label : "file";
}

function countAuditLabels(events, field) {
  return events.reduce((counts, event) => {
    counts[event[field]] = (counts[event[field]] ?? 0) + 1;
    return counts;
  }, {});
}

function assertSafeAuditCountMap(counts, allowedLabels, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: count map required`);
  }
  for (const [label, count] of Object.entries(counts)) {
    if (
      !allowedLabels.has(label) ||
      !Number.isInteger(count) ||
      count < 0 ||
      !isSafeAuditLabel(label)
    ) {
      throw new ContractError(`${context}: invalid count map`);
    }
  }
}

function createOperationalAuditRejectedFixture(fixtureLabel) {
  const fixture = {
    schema: "iris_operational_audit_rejected_fixture_v1",
    fixture_label: safeAuditLabel(fixtureLabel, "unsafe_input"),
    rejected: true,
    safe_status: "rejected",
    boundary_policy: Object.fromEntries(
      [...OPERATIONAL_AUDIT_REJECTED_FIXTURE_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertOperationalAuditRejectedFixtureSafe(fixture);
  return fixture;
}

function assertOperationalAuditRejectedFixtureSafe(
  fixture,
  context = "operational audit rejected fixture"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  if (fixture.schema !== "iris_operational_audit_rejected_fixture_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(fixture)) {
    if (!OPERATIONAL_AUDIT_REJECTED_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    !isSafeAuditLabel(fixture.fixture_label) ||
    fixture.rejected !== true ||
    fixture.safe_status !== "rejected" ||
    fixture.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  assertOperationalAuditRejectedFixtureBoundaryPolicy(
    fixture.boundary_policy,
    context
  );
  assertNoUnsafeOperationalAuditText(fixture, context);
}

function isSafeAuditLabel(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 80 &&
    /^[A-Za-z0-9_.-]+$/.test(value) &&
    !UNSAFE_OPERATIONAL_AUDIT_TEXT.test(value)
  );
}

function isSafeAuditFileLabel(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 120 &&
    /^[A-Za-z0-9_.\/-]+$/.test(value) &&
    !UNSAFE_OPERATIONAL_AUDIT_TEXT.test(value)
  );
}

function assertNoUnsafeOperationalAuditText(value, context) {
  if (UNSAFE_OPERATIONAL_AUDIT_TEXT.test(JSON.stringify(value))) {
    throw new ContractError(`${context}: unsafe audit material`);
  }
}

function assertNoForbiddenAuditWriteField(value, context, seen) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (OPERATIONAL_AUDIT_WRITE_FORBIDDEN_FIELDS.has(key)) {
      throw new ContractError(`${context}: forbidden audit write field`);
    }
    assertNoForbiddenAuditWriteField(child, context, seen);
  }
}
